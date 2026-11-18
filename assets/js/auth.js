/*
 * Civicy – Anmeldung (Minecraft-Konto)
 *
 * 1. Microsoft (wenn microsoft.clientId und api in config.js gesetzt sind):
 *    Eigene Oberfläche → E-Mail → Weiterleitung zu Microsoft (OAuth 2.0 mit PKCE, E-Mail als login_hint)
 *    → zurück mit Code → Backend: Microsoft → Xbox Live → Minecraft-Profil → Sitzung mit echtem Namen, UUID und Rang.
 * 2. Code aus dem Spiel (wenn api gesetzt ist und das Plugin auf dem Server läuft):
 *    Im Spiel /weblogin eingeben → 6-stelliger Code → hier eingeben → Backend kennt Name und UUID vom Server.
 * 3. Demo (ohne api): Minecraft-Name eingeben, wird über playerdb.co nachgeschlagen (echter Name und Skin, aber nicht bestätigt).
 *
 * Das Passwort sieht weder die Webseite noch das Backend.
 */
(function () {
  'use strict';
  var CFG = window.CIVICY_CONFIG || {};
  var DATA = window.CIVICY_DATA || {};
  var MS = CFG.microsoft || {};
  var API = String(CFG.api || '').replace(/\/+$/, '');
  var KEY = 'civicy-session';
  var FLOW = 'civicy-oauth';
  var listeners = [];
  var session = load();

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.user ? s : null; } catch (e) { return null; }
  }
  function save(s) {
    session = s;
    try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch (e) {}
    listeners.forEach(function (fn) { try { fn(session); } catch (e) {} });
  }

  function hasBackend() { return !!API; }
  function msAvailable() { return !!(MS.clientId && API); }
  function redirectUri() { return MS.redirectUri || (location.origin + location.pathname); }

  // ── Ränge ──
  function defaultRank() {
    var list = DATA.ranks || [];
    for (var i = 0; i < list.length; i++) if (list[i].default) return list[i];
    return list[list.length - 1] || { id: 'spieler', name: 'Spieler', tag: '', color: '#AAB4C3' };
  }
  function rankById(id) {
    var list = DATA.ranks || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return defaultRank();
  }
  function teamMember(name) {
    return (DATA.team || []).filter(function (m) { return m.name.toLowerCase() === String(name || '').toLowerCase(); })[0] || null;
  }
  // Ohne Backend: Rang aus der Team-Liste in data.js, sonst Standardrang
  function localRank(name) { var t = teamMember(name); return t ? t.rank : defaultRank().id; }

  // ── Kopf, Körper und Skin ──
  var id = function (user) { return encodeURIComponent(String((user && (user.uuid || user.name)) || 'MHF_Steve').replace(/-/g, '')); };
  function head(user, size) { return 'https://mc-heads.net/avatar/' + id(user) + '/' + (size || 64); }
  function body(user, size) { return 'https://mc-heads.net/body/' + id(user) + '/' + (size || 240); }
  // Skin-Datei (64×64 PNG) für das 3D-Modell – in dieser Reihenfolge versuchen
  function skins(user) {
    var list = [];
    if (API && user && user.uuid) list.push(API + '/api/skin/' + String(user.uuid).replace(/-/g, ''));
    if (user && user.uuid) list.push('https://crafatar.com/skins/' + String(user.uuid).replace(/-/g, ''));
    list.push('https://mc-heads.net/skin/' + id(user));
    return list;
  }
  // Ersatzbild, falls kein Bild-Dienst erreichbar ist: ein Kopf aus 8×8 Pixeln
  var FALLBACK = (function () {
    var px = ['11111111', '12222221', '23333332', '34433443', '35533553', '33366333', '33677633', '33333333'];
    var col = { 1: '#0B1D3A', 2: '#123059', 3: '#1E4E86', 4: '#E6FBFF', 5: '#5CE1FF', 6: '#163C69', 7: '#0B1D3A' };
    var r = '';
    px.forEach(function (row, y) { row.split('').forEach(function (c, x) { r += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + col[c] + '"/>'; }); });
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">' + r + '</svg>');
  })();

  // ── Minecraft-Namen nachschlagen (echte Schreibweise und UUID) ──
  var lookupCache = {};
  function lookup(name) {
    name = String(name || '').trim();
    var k = name.toLowerCase();
    if (lookupCache[k]) return lookupCache[k];
    var viaBackend = API ? fetch(API + '/api/lookup/' + encodeURIComponent(name)).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('lookup');
      return r.json().then(function (j) { return j && j.uuid ? { uuid: j.uuid, name: j.name } : null; });
    }) : Promise.reject(new Error('no backend'));
    var p = viaBackend.catch(function () {
      return fetch('https://playerdb.co/api/player/minecraft/' + encodeURIComponent(name)).then(function (r) { return r.json(); }).then(function (j) {
        return j && j.success && j.data && j.data.player ? { uuid: j.data.player.id, name: j.data.player.username } : null;
      });
    });
    lookupCache[k] = p;
    p.catch(function () { delete lookupCache[k]; });
    return p;
  }

  // ── PKCE ──
  function b64url(bytes) {
    var s = ''; bytes = new Uint8Array(bytes);
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function randomString(n) { var a = new Uint8Array(n || 32); crypto.getRandomValues(a); return b64url(a); }

  // Microsoft: weiterleiten
  function startMicrosoft(email) {
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error('Die Anmeldung funktioniert nur über eine sichere Verbindung (https).'));
    var verifier = randomString(48), state = randomString(16);
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(b64url).then(function (ch) {
      try { sessionStorage.setItem(FLOW, JSON.stringify({ state: state, verifier: verifier, email: email || '', back: location.hash || '#/' })); } catch (e) {}
      var p = new URLSearchParams({
        client_id: MS.clientId, response_type: 'code', redirect_uri: redirectUri(), response_mode: 'query',
        scope: 'XboxLive.signin offline_access openid email', code_challenge: ch, code_challenge_method: 'S256', state: state,
      });
      if (email) { p.set('login_hint', email); p.set('domain_hint', 'consumers'); } else p.set('prompt', 'select_account');
      location.assign('https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?' + p.toString());
    });
  }

  // Rückkehr von Microsoft erkennen (?code=… oder ?error=…)
  function readCallback() {
    var q = new URLSearchParams(location.search);
    if (!q.has('code') && !q.has('error')) return null;
    var flow = null;
    try { flow = JSON.parse(sessionStorage.getItem(FLOW) || 'null'); sessionStorage.removeItem(FLOW); } catch (e) {}
    var res = { back: (flow && flow.back) || '#/', email: flow && flow.email };
    if (q.has('error')) {
      res.error = q.get('error') === 'access_denied' ? 'Die Anmeldung wurde bei Microsoft abgebrochen.' : (q.get('error_description') || 'Microsoft hat die Anmeldung abgelehnt.');
    } else if (!flow || flow.state !== q.get('state')) {
      res.error = 'Die Anmeldung ist abgelaufen. Bitte versuche es noch einmal.';
    } else {
      res.code = q.get('code'); res.verifier = flow.verifier;
    }
    history.replaceState(null, '', location.pathname + res.back);
    return res;
  }

  function sessionFrom(r, via) {
    return r.json().catch(function () { return {}; }).then(function (j) {
      if (!r.ok || !j.token) { var err = new Error(j.message || 'Die Anmeldung ist fehlgeschlagen.'); err.step = j.step || 'microsoft'; throw err; }
      var s = { token: j.token, live: true, via: via, user: j.user, at: Date.now() };
      save(s);
      return s;
    });
  }
  // Microsoft: Code beim Backend einlösen
  function finish(cb) {
    return fetch(API + '/auth/microsoft', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: cb.code, verifier: cb.verifier, redirectUri: redirectUri() }),
    }).then(function (r) { return sessionFrom(r, 'microsoft'); }, function () { var err = new Error('Das Backend ist gerade nicht erreichbar.'); err.step = 'microsoft'; throw err; });
  }
  // Code aus dem Spiel (/weblogin)
  function codeLogin(code) {
    return fetch(API + '/auth/code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: String(code).replace(/\D/g, '') }) })
      .then(function (r) { return sessionFrom(r, 'code'); }, function () { throw new Error('Das Backend ist gerade nicht erreichbar.'); });
  }

  // Sitzung beim Start auffrischen (Rang und Name können sich geändert haben)
  function refresh() {
    if (!session) return Promise.resolve(null);
    if (!session.live) {
      // Demo: Rang aus data.js neu lesen
      var r = localRank(session.user.name);
      if (r !== session.user.rank) save(Object.assign({}, session, { user: Object.assign({}, session.user, { rank: r }) }));
      return Promise.resolve(session);
    }
    if (!API) return Promise.resolve(session);
    return fetch(API + '/api/me', { headers: { Authorization: 'Bearer ' + session.token } }).then(function (r) {
      if (r.status === 401) { save(null); return null; }
      return r.ok ? r.json().then(function (j) { if (j.user) save(Object.assign({}, session, { user: j.user })); return session; }) : session;
    }, function () { return session; });
  }

  // Demo-Anmeldung über den Minecraft-Namen
  function demoLogin(email, name) {
    name = String(name || '').trim();
    return lookup(name).then(function (p) {
      if (!p) { var err = new Error('Diesen Minecraft-Namen gibt es nicht. Prüf die Schreibweise.'); err.notFound = true; throw err; }
      return p;
    }, function () { return { uuid: '', name: name, unchecked: true }; }).then(function (p) {
      var user = { uuid: p.uuid || '', name: p.name, email: email || '', rank: localRank(p.name), since: new Date().toISOString(), unchecked: !!p.unchecked };
      var s = { token: '', live: false, demo: true, via: 'demo', user: user, at: Date.now() };
      save(s);
      return s;
    });
  }

  function logout() {
    var s = session;
    save(null);
    if (s && s.live && API) fetch(API + '/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + s.token } }).catch(function () {});
  }

  window.CivicyAuth = {
    get session() { return session; },
    get user() { return session && session.user; },
    get token() { return session && session.live ? session.token : ''; },
    hasBackend: hasBackend,
    msAvailable: msAvailable,
    isLive: msAvailable,
    api: API,
    startMicrosoft: startMicrosoft,
    readCallback: readCallback,
    finish: finish,
    codeLogin: codeLogin,
    refresh: refresh,
    demoLogin: demoLogin,
    lookup: lookup,
    logout: logout,
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; },
    rank: function (user) { return rankById(user && user.rank); },
    rankById: rankById,
    localRank: localRank,
    teamMember: teamMember,
    isStaff: function (user) { return !!(user && rankById(user.rank).staff); },
    head: head,
    body: body,
    skins: skins,
    fallback: FALLBACK,
  };
})();
