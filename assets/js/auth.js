/*
 * Civicy – Anmeldung mit dem Microsoft-Konto (Minecraft)
 *
 * Ablauf (echte Anmeldung, wenn microsoft.clientId und api in config.js gesetzt sind):
 *   1. Eigene Oberfläche: Der Spieler gibt seine E-Mail ein.
 *   2. Weiterleitung zu Microsoft (OAuth 2.0 mit PKCE). Die E-Mail wird als login_hint mitgegeben,
 *      Microsoft fragt also direkt nach dem Passwort bzw. der Bestätigung in der Authenticator-App.
 *   3. Zurück auf der Seite schickt sie den Code an das Backend. Das Backend tauscht ihn bei Microsoft ein,
 *      meldet sich damit bei Xbox Live an (XBL → XSTS) und holt bei Minecraft das Profil (UUID, Name, Skin).
 *   4. Das Backend gibt ein eigenes, signiertes Sitzungs-Token zurück – mit Name, UUID und Rang.
 * Das Passwort sieht weder die Webseite noch das Backend.
 *
 * Demo-Modus (ohne clientId oder api): Gleiche Oberfläche, statt Microsoft wird der Minecraft-Name abgefragt
 * und über eine öffentliche Schnittstelle (playerdb.co) nachgeschlagen. Nicht bestätigt – nur zum Ausprobieren.
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

  function isLive() { return !!(MS.clientId && API); }
  function redirectUri() { return MS.redirectUri || (location.origin + location.pathname); }

  // ── Ränge ──
  function rankById(id) {
    var list = DATA.ranks || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return defaultRank();
  }
  function defaultRank() {
    var list = DATA.ranks || [];
    for (var i = 0; i < list.length; i++) if (list[i].default) return list[i];
    return list[list.length - 1] || { id: 'spieler', name: 'Spieler', color: '#8392AA' };
  }
  // Demo: Rang aus der Team-Liste in data.js, sonst Standardrang
  function localRank(name) {
    var t = (DATA.team || []).filter(function (m) { return m.name.toLowerCase() === String(name).toLowerCase(); })[0];
    return t ? t.rank : defaultRank().id;
  }

  // ── Bilder von Kopf und Skin (mc-heads.net) ──
  function head(user, size) { return 'https://mc-heads.net/avatar/' + encodeURIComponent(user.uuid || user.name || 'MHF_Steve') + '/' + (size || 64); }
  function body(user, size) { return 'https://mc-heads.net/body/' + encodeURIComponent(user.uuid || user.name || 'MHF_Steve') + '/' + (size || 240); }
  // Ersatzbild, falls mc-heads.net nicht erreichbar ist: ein Kopf aus 8×8 Pixeln
  var FALLBACK = (function () {
    var px = ['11111111', '12222221', '23333332', '34433443', '35533553', '33366333', '33677633', '33333333'];
    var col = { 1: '#0B1D3A', 2: '#123059', 3: '#1E4E86', 4: '#E6FBFF', 5: '#5CE1FF', 6: '#163C69', 7: '#0B1D3A' };
    var r = '';
    px.forEach(function (row, y) { row.split('').forEach(function (c, x) { r += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + col[c] + '"/>'; }); });
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">' + r + '</svg>');
  })();

  // ── PKCE ──
  function b64url(bytes) {
    var s = ''; bytes = new Uint8Array(bytes);
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function randomString(n) { var a = new Uint8Array(n || 32); crypto.getRandomValues(a); return b64url(a); }
  function challenge(verifier) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(b64url);
  }

  // Schritt 2: zu Microsoft weiterleiten
  function startMicrosoft(email) {
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error('Die Anmeldung funktioniert nur über eine sichere Verbindung (https).'));
    var verifier = randomString(48), state = randomString(16);
    return challenge(verifier).then(function (ch) {
      try { sessionStorage.setItem(FLOW, JSON.stringify({ state: state, verifier: verifier, email: email || '', back: location.hash || '#/' })); } catch (e) {}
      var p = new URLSearchParams({
        client_id: MS.clientId,
        response_type: 'code',
        redirect_uri: redirectUri(),
        response_mode: 'query',
        scope: 'XboxLive.signin offline_access openid email',
        code_challenge: ch,
        code_challenge_method: 'S256',
        state: state,
      });
      if (email) { p.set('login_hint', email); p.set('domain_hint', 'consumers'); }
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
    // Code aus der Adresse entfernen
    history.replaceState(null, '', location.pathname + res.back);
    return res;
  }

  // Schritt 3: Code beim Backend einlösen
  function finish(cb) {
    return fetch(API + '/auth/microsoft', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: cb.code, verifier: cb.verifier, redirectUri: redirectUri() }),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.token) { var err = new Error(j.message || 'Die Anmeldung ist fehlgeschlagen.'); err.step = j.step || 'microsoft'; throw err; }
        var s = { token: j.token, live: true, user: j.user, at: Date.now() };
        save(s);
        return s;
      });
    }, function () { var err = new Error('Das Backend ist gerade nicht erreichbar.'); err.step = 'microsoft'; throw err; });
  }

  // Sitzung beim Start auffrischen (Rang kann sich geändert haben)
  function refresh() {
    if (!session || !session.live || !API) return Promise.resolve(session);
    return fetch(API + '/api/me', { headers: { Authorization: 'Bearer ' + session.token } }).then(function (r) {
      if (r.status === 401) { save(null); return null; }
      return r.ok ? r.json().then(function (j) { if (j.user) save(Object.assign({}, session, { user: j.user })); return session; }) : session;
    }, function () { return session; });
  }

  // Demo-Anmeldung über den Minecraft-Namen
  function demoLogin(email, name) {
    name = String(name || '').trim();
    function done(uuid, realName) {
      var user = { uuid: uuid || '', name: realName || name, email: email || '', rank: localRank(realName || name), since: new Date().toISOString() };
      var s = { token: '', live: false, demo: true, user: user, at: Date.now() };
      save(s);
      return s;
    }
    return fetch('https://playerdb.co/api/player/minecraft/' + encodeURIComponent(name)).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.success && j.data && j.data.player) return done(j.data.player.id, j.data.player.username);
      var err = new Error('Diesen Minecraft-Namen gibt es nicht.'); err.notFound = true; throw err;
    }, function () { return done('', name); });
  }

  function logout() {
    var s = session;
    save(null);
    if (s && s.live && API) fetch(API + '/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + s.token } }).catch(function () {});
  }

  window.CivicyAuth = {
    get session() { return session; },
    get user() { return session && session.user; },
    isLive: isLive,
    api: API,
    startMicrosoft: startMicrosoft,
    readCallback: readCallback,
    finish: finish,
    refresh: refresh,
    demoLogin: demoLogin,
    logout: logout,
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; },
    rank: function (user) { return rankById(user && user.rank); },
    rankById: rankById,
    head: head,
    body: body,
    fallback: FALLBACK,
  };
})();
