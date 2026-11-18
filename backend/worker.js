/*
 * Civicy – Backend auf Cloudflare Workers (Anleitung: backend/README.md)
 *
 * Anmeldung
 *   POST /auth/microsoft          Code von Microsoft einlösen → Xbox Live → Minecraft-Profil → Sitzung
 *   POST /auth/code               Code aus dem Spiel (/weblogin) einlösen → Sitzung
 *   POST /auth/logout             Abmelden (Sitzung ungültig machen)
 *   GET  /api/me                  Angemeldeten Spieler mit aktuellem Rang abrufen
 * Spieler
 *   GET  /api/lookup/<name>       Minecraft-Name → echte Schreibweise und UUID (über Mojang)
 *   GET  /api/skin/<uuid>         Skin-Datei (PNG) mit CORS – für das 3D-Modell auf der Webseite
 *   GET  /api/players/<name>      Öffentliches Profil: Rang, seit wann dabei, Themen im Forum
 * Forum
 *   GET  /api/forum                         Kategorien mit Zahlen und letztem Thema
 *   GET  /api/forum/recent?n=5              Neueste Themen
 *   GET  /api/forum/c/<kategorie>?page=1    Themen einer Kategorie
 *   GET  /api/forum/t/<id>                  Thema mit allen Beiträgen
 *   POST /api/forum/threads                 Neues Thema {cat, title, body}
 *   POST /api/forum/t/<id>/posts            Antworten {body}
 *   PUT  /api/forum/t/<id>                  Team: anheften, schließen, verschieben {pinned, locked, cat}
 *   PUT  /api/forum/p/<id>                  Beitrag bearbeiten (eigener oder Team)
 *   DELETE /api/forum/p/<id>                Beitrag löschen (eigener oder Team; erster Beitrag = ganzes Thema)
 * Neuigkeiten (vom Team auf der Webseite geschrieben)
 *   GET /api/news · POST /api/news · PUT /api/news/<id> · DELETE /api/news/<id>
 * Bewerbungen
 *   POST /api/applications        Bewerbung annehmen und an Discord schicken
 * Für den Minecraft-Server (Plugin im Ordner plugin/, Schlüssel SERVER_KEY oder ADMIN_KEY)
 *   POST /api/link                {uuid, name} → 6-stelliger Code für /weblogin
 *   GET  /api/ranks · PUT /api/ranks/<uuid> {rank, name} · DELETE /api/ranks/<uuid>
 *
 * Gespeichert wird in einem Durable Object mit SQLite (im kostenlosen Tarif enthalten).
 */
import { DurableObject } from 'cloudflare:workers';

const MS_TOKEN = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const XBL_AUTH = 'https://user.auth.xboxlive.com/user/authenticate';
const XSTS_AUTH = 'https://xsts.auth.xboxlive.com/xsts/authorize';
const MC_LOGIN = 'https://api.minecraftservices.com/authentication/login_with_xbox';
const MC_PROFILE = 'https://api.minecraftservices.com/minecraft/profile';
const MOJANG_NAME = 'https://api.mojang.com/users/profiles/minecraft/';
const MOJANG_SESSION = 'https://sessionserver.mojang.com/session/minecraft/profile/';
const SESSION_DAYS = 30;
const CODE_MINUTES = 5;
const RANK_ID = /^[a-z0-9_-]{1,32}$/;
const UUID = /^[0-9a-f]{32}$/;
const NAME = /^[A-Za-z0-9_]{3,16}$/;
const DEFAULT_CATS = 'ankuendigungen:staff,allgemein,modi,hilfe,vorschlaege,bugs,offtopic';
const DEFAULT_STAFF = 'inhaber,admin,developer,moderator,supporter,builder';

const dashed = (u) => String(u || '').replace(/-/g, '').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
const undash = (u) => String(u || '').replace(/-/g, '').toLowerCase();
const now = () => new Date().toISOString();

class Fail extends Error {
  constructor(status, message, step) { super(message); this.status = status; this.step = step; }
}

// ─────────────────────────── Speicher ───────────────────────────
export class CivicyStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.sql = ctx.storage.sql;
    const q = (s) => this.sql.exec(s);
    q(`CREATE TABLE IF NOT EXISTS users (uuid TEXT PRIMARY KEY, name TEXT, email TEXT, since TEXT, seen TEXT)`);
    q(`CREATE TABLE IF NOT EXISTS ranks (uuid TEXT PRIMARY KEY, rank TEXT, name TEXT, updated TEXT)`);
    q(`CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, uuid TEXT, revoked INTEGER DEFAULT 0, created TEXT)`);
    q(`CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT, job TEXT, data TEXT, created TEXT)`);
    q(`CREATE TABLE IF NOT EXISTS threads (id INTEGER PRIMARY KEY AUTOINCREMENT, cat TEXT, title TEXT, author_uuid TEXT, author_name TEXT, created TEXT, updated TEXT, pinned INTEGER DEFAULT 0, locked INTEGER DEFAULT 0, views INTEGER DEFAULT 0)`);
    q(`CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, thread INTEGER, author_uuid TEXT, author_name TEXT, body TEXT, created TEXT, edited TEXT)`);
    q(`CREATE INDEX IF NOT EXISTS posts_thread ON posts (thread)`);
    q(`CREATE TABLE IF NOT EXISTS news (id TEXT PRIMARY KEY, data TEXT, date TEXT)`);
    q(`CREATE TABLE IF NOT EXISTS codes (code TEXT PRIMARY KEY, uuid TEXT, name TEXT, expires INTEGER)`);
    q(`CREATE TABLE IF NOT EXISTS attempts (key TEXT, at INTEGER)`);
  }
  one(sql, ...args) { return this.sql.exec(sql, ...args).toArray()[0] || null; }
  all(sql, ...args) { return this.sql.exec(sql, ...args).toArray(); }

  // ── Ränge ──
  rankOf(uuid, name) {
    const saved = this.one('SELECT rank FROM ranks WHERE uuid = ?', undash(uuid));
    if (saved) return saved.rank;
    try {
      const staff = JSON.parse(this.env.STAFF || '{}');
      for (const [k, v] of Object.entries(staff)) if (undash(k) === undash(uuid) || k.toLowerCase() === String(name || '').toLowerCase()) return v;
    } catch (e) {}
    return this.env.DEFAULT_RANK || 'spieler';
  }
  isStaff(uuid, name) { return (this.env.STAFF_RANKS || DEFAULT_STAFF).split(',').map((s) => s.trim()).includes(this.rankOf(uuid, name)); }
  setRank(uuid, rank, name) { this.sql.exec('INSERT OR REPLACE INTO ranks (uuid, rank, name, updated) VALUES (?, ?, ?, ?)', undash(uuid), rank, name || '', now()); }
  deleteRank(uuid) { this.sql.exec('DELETE FROM ranks WHERE uuid = ?', undash(uuid)); }
  listRanks() { return this.all('SELECT uuid, rank, name, updated FROM ranks ORDER BY updated DESC'); }

  // ── Spieler & Sitzungen ──
  upsertUser(u) {
    const uuid = undash(u.uuid);
    const row = this.one('SELECT since, email FROM users WHERE uuid = ?', uuid);
    const since = row ? row.since : now();
    this.sql.exec('INSERT OR REPLACE INTO users (uuid, name, email, since, seen) VALUES (?, ?, ?, ?, ?)', uuid, u.name, u.email || (row && row.email) || '', since, now());
    return this.user(uuid);
  }
  user(uuid) {
    const u = this.one('SELECT uuid, name, email, since FROM users WHERE uuid = ?', undash(uuid));
    return u ? { uuid: dashed(u.uuid), name: u.name, email: u.email || '', since: u.since, rank: this.rankOf(u.uuid, u.name) } : null;
  }
  addSession(sid, uuid) { this.sql.exec('INSERT INTO sessions (sid, uuid, created) VALUES (?, ?, ?)', sid, undash(uuid), now()); }
  sessionValid(sid) { const r = this.one('SELECT revoked FROM sessions WHERE sid = ?', sid); return !!r && !r.revoked; }
  revokeSession(sid) { this.sql.exec('UPDATE sessions SET revoked = 1 WHERE sid = ?', sid); }

  // Zu viele Versuche? (z. B. Codes raten)
  limited(key, max, minutes) {
    const since = Date.now() - minutes * 60000;
    this.sql.exec('DELETE FROM attempts WHERE at < ?', since);
    const n = this.one('SELECT COUNT(*) AS n FROM attempts WHERE key = ?', key).n;
    if (n >= max) return true;
    this.sql.exec('INSERT INTO attempts (key, at) VALUES (?, ?)', key, Date.now());
    return false;
  }

  // ── Code aus dem Spiel ──
  createCode(uuid, name) {
    this.sql.exec('DELETE FROM codes WHERE expires < ? OR uuid = ?', Date.now(), undash(uuid));
    let code;
    do { code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0'); } while (this.one('SELECT code FROM codes WHERE code = ?', code));
    const expires = Date.now() + CODE_MINUTES * 60000;
    this.sql.exec('INSERT INTO codes (code, uuid, name, expires) VALUES (?, ?, ?, ?)', code, undash(uuid), name, expires);
    return { code, expires };
  }
  useCode(code) {
    const row = this.one('SELECT uuid, name, expires FROM codes WHERE code = ?', code);
    if (!row) return null;
    this.sql.exec('DELETE FROM codes WHERE code = ?', code);
    return row.expires >= Date.now() ? row : null;
  }

  // ── Bewerbungen: höchstens eine pro Stelle und Spieler in 24 Stunden ──
  addApplication(uuid, job, data) {
    const since = new Date(Date.now() - 864e5).toISOString();
    if (this.one('SELECT COUNT(*) AS n FROM applications WHERE uuid = ? AND job = ? AND created > ?', undash(uuid), job, since).n > 0) return false;
    this.sql.exec('INSERT INTO applications (uuid, job, data, created) VALUES (?, ?, ?, ?)', undash(uuid), job, JSON.stringify(data), now());
    return true;
  }

  // ── Forum ──
  cats() {
    return (this.env.FORUM_CATEGORIES || DEFAULT_CATS).split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const [id, flag] = s.split(':'); return { id, staffOnly: flag === 'staff' }; });
  }
  author(uuid, name) { return { uuid: dashed(uuid), name, rank: this.rankOf(uuid, name) }; }
  threadOut(t) {
    const n = this.one('SELECT COUNT(*) AS n FROM posts WHERE thread = ?', t.id).n;
    const last = this.one('SELECT author_name, created FROM posts WHERE thread = ? ORDER BY id DESC LIMIT 1', t.id);
    return {
      id: t.id, cat: t.cat, title: t.title, author: this.author(t.author_uuid, t.author_name), created: t.created, updated: t.updated,
      pinned: !!t.pinned, locked: !!t.locked, views: t.views, replies: Math.max(0, n - 1), last: last ? { name: last.author_name, at: last.created } : null,
    };
  }
  forumCategories() {
    return this.cats().map((c) => {
      const threads = this.one('SELECT COUNT(*) AS n FROM threads WHERE cat = ?', c.id).n;
      const posts = this.one('SELECT COUNT(*) AS n FROM posts p JOIN threads t ON t.id = p.thread WHERE t.cat = ?', c.id).n;
      const t = this.one('SELECT * FROM threads WHERE cat = ? ORDER BY updated DESC LIMIT 1', c.id);
      const last = t ? this.threadOut(t) : null;
      return { id: c.id, threads, posts, last: last ? { id: last.id, title: last.title, name: last.last && last.last.name, at: last.updated } : null };
    });
  }
  forumList(cat, page) {
    const total = this.one('SELECT COUNT(*) AS n FROM threads WHERE cat = ?', cat).n;
    const rows = this.all('SELECT * FROM threads WHERE cat = ? ORDER BY pinned DESC, updated DESC LIMIT 20 OFFSET ?', cat, (page - 1) * 20);
    return { threads: rows.map((t) => this.threadOut(t)), total };
  }
  forumRecent(n) { return this.all('SELECT * FROM threads ORDER BY updated DESC LIMIT ?', n).map((t) => this.threadOut(t)); }
  forumThread(id) {
    const t = this.one('SELECT * FROM threads WHERE id = ?', id);
    if (!t) return null;
    this.sql.exec('UPDATE threads SET views = views + 1 WHERE id = ?', id);
    t.views++;
    const posts = this.all('SELECT * FROM posts WHERE thread = ? ORDER BY id', id).map((p) => ({ id: p.id, thread: p.thread, author: this.author(p.author_uuid, p.author_name), body: p.body, created: p.created, edited: p.edited }));
    return { thread: this.threadOut(t), posts };
  }
  cooldown(uuid) {
    const last = this.one('SELECT created FROM posts WHERE author_uuid = ? ORDER BY id DESC LIMIT 1', undash(uuid));
    if (last && Date.now() - new Date(last.created) < 15000) throw new Fail(429, 'Langsam – warte ein paar Sekunden bis zum nächsten Beitrag.');
  }
  forumCreate(u, cat, title, body) {
    const c = this.cats().find((x) => x.id === cat);
    if (!c) throw new Fail(400, 'Diese Kategorie gibt es nicht.');
    if (c.staffOnly && !this.isStaff(u.sub, u.name)) throw new Fail(403, 'Hier kann nur das Team neue Themen erstellen.');
    this.cooldown(u.sub);
    const t = now();
    const id = this.one('INSERT INTO threads (cat, title, author_uuid, author_name, created, updated) VALUES (?, ?, ?, ?, ?, ?) RETURNING id', cat, title, undash(u.sub), u.name, t, t).id;
    this.sql.exec('INSERT INTO posts (thread, author_uuid, author_name, body, created) VALUES (?, ?, ?, ?, ?)', id, undash(u.sub), u.name, body, t);
    return { id };
  }
  forumReply(u, id, body) {
    const t = this.one('SELECT * FROM threads WHERE id = ?', id);
    if (!t) throw new Fail(404, 'Dieses Thema gibt es nicht mehr.');
    if (t.locked && !this.isStaff(u.sub, u.name)) throw new Fail(403, 'Dieses Thema ist geschlossen.');
    this.cooldown(u.sub);
    const at = now();
    const pid = this.one('INSERT INTO posts (thread, author_uuid, author_name, body, created) VALUES (?, ?, ?, ?, ?) RETURNING id', id, undash(u.sub), u.name, body, at).id;
    this.sql.exec('UPDATE threads SET updated = ? WHERE id = ?', at, id);
    return { id: pid };
  }
  forumEdit(u, pid, body) {
    const p = this.one('SELECT * FROM posts WHERE id = ?', pid);
    if (!p) throw new Fail(404, 'Beitrag nicht gefunden.');
    if (p.author_uuid !== undash(u.sub) && !this.isStaff(u.sub, u.name)) throw new Fail(403, 'Du kannst nur eigene Beiträge bearbeiten.');
    this.sql.exec('UPDATE posts SET body = ?, edited = ? WHERE id = ?', body, now(), pid);
    return { ok: true };
  }
  forumDelete(u, pid) {
    const p = this.one('SELECT * FROM posts WHERE id = ?', pid);
    if (!p) throw new Fail(404, 'Beitrag nicht gefunden.');
    if (p.author_uuid !== undash(u.sub) && !this.isStaff(u.sub, u.name)) throw new Fail(403, 'Du kannst nur eigene Beiträge löschen.');
    const first = this.one('SELECT id FROM posts WHERE thread = ? ORDER BY id LIMIT 1', p.thread);
    if (first && first.id === p.id) {
      this.sql.exec('DELETE FROM posts WHERE thread = ?', p.thread);
      this.sql.exec('DELETE FROM threads WHERE id = ?', p.thread);
      return { thread: null, deletedThread: true };
    }
    this.sql.exec('DELETE FROM posts WHERE id = ?', pid);
    return { thread: p.thread };
  }
  forumModerate(u, id, change) {
    if (!this.isStaff(u.sub, u.name)) throw new Fail(403, 'Nur für das Team.');
    const t = this.one('SELECT * FROM threads WHERE id = ?', id);
    if (!t) throw new Fail(404, 'Thema nicht gefunden.');
    if ('pinned' in change) this.sql.exec('UPDATE threads SET pinned = ? WHERE id = ?', change.pinned ? 1 : 0, id);
    if ('locked' in change) this.sql.exec('UPDATE threads SET locked = ? WHERE id = ?', change.locked ? 1 : 0, id);
    if (change.cat && this.cats().some((c) => c.id === change.cat)) this.sql.exec('UPDATE threads SET cat = ? WHERE id = ?', change.cat, id);
    return { ok: true };
  }

  // ── Spielerprofil ──
  player(name) {
    const u = this.one('SELECT uuid, name, since FROM users WHERE lower(name) = lower(?) ORDER BY seen DESC LIMIT 1', name);
    if (!u) return null;
    const threads = this.all('SELECT * FROM threads WHERE author_uuid = ? ORDER BY updated DESC LIMIT 10', u.uuid).map((t) => this.threadOut(t));
    const posts = this.one('SELECT COUNT(*) AS n FROM posts WHERE author_uuid = ?', u.uuid).n;
    return { uuid: dashed(u.uuid), name: u.name, since: u.since, rank: this.rankOf(u.uuid, u.name), known: true, posts, threads };
  }

  // ── Neuigkeiten ──
  newsList() { return this.all('SELECT data FROM news ORDER BY date DESC').map((r) => JSON.parse(r.data)); }
  newsSave(u, item, id) {
    if (!this.isStaff(u.sub, u.name)) throw new Fail(403, 'Nur das Team kann Neuigkeiten schreiben.');
    if (id) {
      const row = this.one('SELECT data FROM news WHERE id = ?', id);
      if (!row) throw new Fail(404, 'Neuigkeit nicht gefunden.');
      const old = JSON.parse(row.data);
      const n = { ...old, ...item, id, date: old.date, author: old.author, edited: now() };
      this.sql.exec('UPDATE news SET data = ? WHERE id = ?', JSON.stringify(n), id);
      return n;
    }
    const n = { ...item, id: 'n' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), date: now(), author: u.name };
    this.sql.exec('INSERT INTO news (id, data, date) VALUES (?, ?, ?)', n.id, JSON.stringify(n), n.date);
    return n;
  }
  newsDelete(u, id) {
    if (!this.isStaff(u.sub, u.name)) throw new Fail(403, 'Nur für das Team.');
    this.sql.exec('DELETE FROM news WHERE id = ?', id);
    return { ok: true };
  }
}
const store = (env) => env.CIVICY_STORE.get(env.CIVICY_STORE.idFromName('main'));
// Fehler aus dem Durable Object kommen als normale Error an – Status steckt in der Meldung
async function db(env, fn) {
  try { return await fn(store(env)); } catch (e) {
    if (e instanceof Fail) throw e;
    const m = String(e && e.message || '');
    const status = /gibt es nicht|nicht gefunden/i.test(m) ? 404 : /Nur für das Team|Nur das Team|nur das Team|nur eigene|geschlossen/i.test(m) ? 403 : /Langsam/.test(m) ? 429 : 0;
    if (status) throw new Fail(status, m);
    throw e;
  }
}

// ─────────────────────────── Helfer ───────────────────────────
const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

function cors(req, env, open) {
  const origin = req.headers.get('Origin') || '';
  const allowed = [env.APP_URL || '', ...(env.ALLOWED_ORIGINS || '').split(',')].map((s) => s.trim()).filter(Boolean).map((u) => { try { return new URL(u).origin; } catch (e) { return ''; } });
  return {
    'Access-Control-Allow-Origin': open ? '*' : (allowed.includes(origin) ? origin : (allowed[0] || '')),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
const json = (data, status, headers) => new Response(JSON.stringify(data), { status: status || 200, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function signSession(env, payload) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return body + '.' + (await hmac(env.SESSION_SECRET, body));
}
async function readSession(req, env) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const [body, sig] = token.split('.');
  if (!body || !sig || !env.SESSION_SECRET) throw new Fail(401, 'Bitte melde dich an.');
  if (!safeEqual(sig, await hmac(env.SESSION_SECRET, body))) throw new Fail(401, 'Sitzung ungültig.');
  let p;
  try { p = JSON.parse(new TextDecoder().decode(fromB64url(body))); } catch (e) { throw new Fail(401, 'Sitzung ungültig.'); }
  if (!p.exp || p.exp < Date.now()) throw new Fail(401, 'Sitzung abgelaufen. Bitte melde dich neu an.');
  if (!(await store(env).sessionValid(p.sid))) throw new Fail(401, 'Sitzung beendet.');
  return p;
}
// Schlüssel für Admin-Werkzeuge und das Server-Plugin
function requireKey(req, env) {
  const auth = req.headers.get('Authorization') || '';
  const ok = [env.ADMIN_KEY, env.SERVER_KEY].filter(Boolean).some((k) => safeEqual(auth, 'Bearer ' + k));
  if (!ok) throw new Fail(401, 'Kein Zugriff.');
}
async function newSession(env, uuid, name, email) {
  if (!env.SESSION_SECRET) throw new Fail(500, 'Das Backend ist noch nicht fertig eingerichtet (SESSION_SECRET fehlt).');
  const s = store(env);
  const user = await s.upsertUser({ uuid, name, email });
  const sid = crypto.randomUUID();
  await s.addSession(sid, uuid);
  const token = await signSession(env, { sub: undash(uuid), name, sid, exp: Date.now() + SESSION_DAYS * 864e5 });
  return { token, user };
}
async function post(url, body, form) {
  return fetch(url, {
    method: 'POST',
    headers: form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: form ? new URLSearchParams(body) : JSON.stringify(body),
  });
}
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
const readJson = (req) => req.json().catch(() => ({}));

// ─────────────────────────── Anmeldung über Microsoft ───────────────────────────
async function loginMicrosoft(req, env) {
  const { code, verifier, redirectUri } = await readJson(req);
  if (!code || !verifier || !redirectUri) throw new Fail(400, 'Angaben fehlen.', 'microsoft');
  const allowedRedirects = [env.APP_URL, ...(env.ALLOWED_ORIGINS || '').split(',')].map((s) => (s || '').trim()).filter(Boolean);
  if (!allowedRedirects.some((u) => redirectUri === u || redirectUri === u.replace(/\/?$/, '/'))) throw new Fail(400, 'Diese Adresse ist für die Anmeldung nicht freigegeben.', 'microsoft');
  if (!env.MS_CLIENT_ID || !env.MS_CLIENT_SECRET || !env.SESSION_SECRET) throw new Fail(500, 'Das Backend ist noch nicht fertig eingerichtet (MS_CLIENT_ID, MS_CLIENT_SECRET oder SESSION_SECRET fehlt).', 'microsoft');

  // 1. Microsoft: Code gegen Token tauschen
  const ms = await post(MS_TOKEN, {
    client_id: env.MS_CLIENT_ID, client_secret: env.MS_CLIENT_SECRET, grant_type: 'authorization_code',
    code, redirect_uri: redirectUri, code_verifier: verifier, scope: 'XboxLive.signin offline_access openid email',
  }, true);
  const msj = await ms.json().catch(() => ({}));
  if (!ms.ok || !msj.access_token) throw new Fail(400, 'Microsoft hat die Anmeldung nicht bestätigt' + (msj.error_description ? ': ' + msj.error_description.split('\r\n')[0] : '.'), 'microsoft');
  let email = '';
  try { email = JSON.parse(new TextDecoder().decode(fromB64url(msj.id_token.split('.')[1]))).email || ''; } catch (e) {}

  // 2. Xbox Live
  const xbl = await post(XBL_AUTH, { Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: 'd=' + msj.access_token }, RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT' });
  const xblj = await xbl.json().catch(() => ({}));
  if (!xbl.ok || !xblj.Token) throw new Fail(400, 'Die Anmeldung bei Xbox Live ist fehlgeschlagen.', 'xbox');
  const uhs = xblj.DisplayClaims && xblj.DisplayClaims.xui && xblj.DisplayClaims.xui[0].uhs;
  const xsts = await post(XSTS_AUTH, { Properties: { SandboxId: 'RETAIL', UserTokens: [xblj.Token] }, RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT' });
  const xstsj = await xsts.json().catch(() => ({}));
  if (!xsts.ok || !xstsj.Token) {
    const msg = {
      2148916233: 'Zu diesem Microsoft-Konto gibt es noch kein Xbox-Profil. Melde dich einmal auf xbox.com an und versuche es dann erneut.',
      2148916235: 'Xbox Live ist in deinem Land nicht verfügbar.',
      2148916236: 'Dein Konto braucht eine Altersbestätigung bei Xbox.',
      2148916237: 'Dein Konto braucht eine Altersbestätigung bei Xbox.',
      2148916238: 'Dein Konto ist ein Kinderkonto. Ein Erwachsener muss es erst zu einer Microsoft-Familie hinzufügen.',
    }[xstsj.XErr];
    throw new Fail(400, msg || 'Die Anmeldung bei Xbox Live ist fehlgeschlagen.', 'xbox');
  }

  // 3. Minecraft: echter Name und UUID
  const mc = await post(MC_LOGIN, { identityToken: `XBL3.0 x=${uhs};${xstsj.Token}` });
  const mcj = await mc.json().catch(() => ({}));
  if (!mc.ok || !mcj.access_token) {
    const notApproved = mc.status === 403 || /Invalid app registration/i.test(JSON.stringify(mcj));
    throw new Fail(400, notApproved ? 'Die Civicy-App ist bei Minecraft noch nicht freigeschaltet (Mojang muss den Zugang erst bestätigen). Melde dich so lange mit einem Code aus dem Spiel an.' : 'Die Anmeldung bei Minecraft ist fehlgeschlagen.', 'minecraft');
  }
  const prof = await fetch(MC_PROFILE, { headers: { Authorization: 'Bearer ' + mcj.access_token } });
  const profj = await prof.json().catch(() => ({}));
  if (prof.status === 404 || !profj.id) throw new Fail(400, 'Zu diesem Microsoft-Konto gehört kein Minecraft: Java Edition.', 'minecraft');

  // 4. Civicy: Spieler speichern, Rang holen, Sitzung ausstellen
  return newSession(env, profj.id, profj.name, email);
}

// ─────────────────────────── Anmeldung mit Code aus dem Spiel ───────────────────────────
async function loginCode(req, env) {
  const { code } = await readJson(req);
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  if (await store(env).limited('code:' + ip, 10, 10)) throw new Fail(429, 'Zu viele Versuche. Warte ein paar Minuten.');
  if (!/^\d{6}$/.test(String(code || ''))) throw new Fail(400, 'Der Code hat 6 Ziffern.');
  const row = await store(env).useCode(String(code));
  if (!row) throw new Fail(400, 'Der Code stimmt nicht oder ist abgelaufen. Gib im Spiel erneut /weblogin ein.');
  return newSession(env, row.uuid, row.name, '');
}

// ─────────────────────────── Mojang: Name und Skin ───────────────────────────
async function cached(key, ttl, make) {
  const cache = caches.default;
  const req = new Request('https://civicy.cache/' + key);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await make();
  if (res.status === 200 || res.status === 404) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set('Cache-Control', `public, max-age=${res.status === 200 ? ttl : 300}`);
    await cache.put(req, copy);
  }
  return res;
}
async function lookup(name) {
  if (!NAME.test(name)) return null;
  const res = await cached('name/' + name.toLowerCase(), 3600, async () => {
    const r = await fetch(MOJANG_NAME + encodeURIComponent(name)).catch(() => null);
    if (!r) return json({ message: 'Mojang ist gerade nicht erreichbar.' }, 502);
    if (r.status === 204 || r.status === 404) return json({ none: true }, 404);
    if (!r.ok) return json({ message: 'Mojang ist gerade nicht erreichbar.' }, 502);
    const j = await r.json();
    return json({ uuid: dashed(j.id), name: j.name });
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Fail(502, 'Mojang ist gerade nicht erreichbar.');
  return res.json();
}
async function skin(uuid) {
  return cached('skin/' + uuid, 6 * 3600, async () => {
    const r = await fetch(MOJANG_SESSION + uuid).catch(() => null);
    if (!r) return new Response('Mojang nicht erreichbar', { status: 502 });
    if (r.status === 204 || r.status === 404) return new Response('Kein Spieler', { status: 404 });
    if (!r.ok) return new Response('Mojang nicht erreichbar', { status: 502 });
    const j = await r.json();
    const prop = (j.properties || []).find((p) => p.name === 'textures');
    let url = '';
    try { url = JSON.parse(atob(prop.value)).textures.SKIN.url; } catch (e) {}
    if (!url) return new Response('Kein eigener Skin', { status: 404 });
    const img = await fetch(url.replace(/^http:/, 'https:')).catch(() => null);
    if (!img || !img.ok) return new Response('Skin nicht erreichbar', { status: 502 });
    return new Response(img.body, { status: 200, headers: { 'Content-Type': 'image/png' } });
  });
}

// ─────────────────────────── Bewerbungen ───────────────────────────
async function application(req, env) {
  const s = await readSession(req, env);
  const body = await readJson(req);
  if (typeof body.job !== 'string' || typeof body.answers !== 'object' || !body.answers) throw new Fail(400, 'Bewerbung unvollständig.');
  const a = {};
  for (const [k, v] of Object.entries(body.answers).slice(0, 20)) a[clip(k, 40)] = clip(v, 1500);
  const job = clip(body.job, 40);
  if (!(await store(env).addApplication(s.sub, job, a))) throw new Fail(429, 'Du hast dich auf diese Stelle heute schon beworben.');
  if (env.DISCORD_WEBHOOK_URL) {
    const labels = Object.fromEntries((Array.isArray(body.questions) ? body.questions : []).map((q) => [clip(q.id, 40), clip(q.label, 200)]));
    const fields = [
      { name: 'Minecraft', value: `${s.name} (\`${dashed(s.sub)}\`)`, inline: true },
      { name: 'Discord', value: a.discord || '–', inline: true },
      { name: 'Alter', value: a.age || '–', inline: true },
      { name: 'Spielzeit', value: a.playtime || '–', inline: true },
      ...(a.online ? [{ name: 'Online', value: a.online, inline: true }] : []),
      ...Object.keys(labels).map((k) => ({ name: labels[k].slice(0, 256), value: (a[k] || '–').slice(0, 1024) })),
    ];
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Civicy Bewerbungen', allowed_mentions: { parse: [] }, embeds: [{ title: `Neue Bewerbung: ${clip(body.jobTitle || job, 100)}`, color: 0x5ce1ff, thumbnail: { url: `https://mc-heads.net/avatar/${s.sub}/64` }, fields, timestamp: now() }] }),
    }).catch(() => {});
  }
  return { ok: true };
}

// ─────────────────────────── Prüfen von Eingaben ───────────────────────────
function checkText(title, body) {
  if (title != null) { title = String(title).trim(); if (title.length < 4 || title.length > 120) throw new Fail(400, 'Der Titel braucht 4 bis 120 Zeichen.'); }
  body = String(body == null ? '' : body).trim();
  if (body.length < 2 || body.length > 5000) throw new Fail(400, 'Der Text braucht 2 bis 5000 Zeichen.');
  return { title, body };
}
function checkNews(b) {
  const lines = (Array.isArray(b.body) ? b.body : String(b.body || '').split('\n')).map((l) => clip(String(l).trim(), 2000)).filter(Boolean).slice(0, 80);
  const title = clip(String(b.title || '').trim(), 120);
  if (title.length < 4) throw new Fail(400, 'Der Titel braucht mindestens 4 Zeichen.');
  if (!lines.length) throw new Fail(400, 'Bitte schreib einen Text.');
  const image = String(b.image || '').trim();
  if (image && !/^https:\/\/[^\s"'<>]+$/i.test(image)) throw new Fail(400, 'Das Bild muss ein https-Link sein.');
  const buttons = (Array.isArray(b.buttons) ? b.buttons : []).slice(0, 2).map((x) => ({ label: clip(String(x.label || '').trim(), 40) || 'Mehr erfahren', url: clip(String(x.url || '').trim(), 500) })).filter((x) => x.url);
  if (buttons.some((x) => !/^(https:\/\/|http:\/\/|#\/)[^\s"'<>]*$/i.test(x.url))) throw new Fail(400, 'Links müssen mit https:// oder #/ beginnen.');
  return { title, cat: clip(b.cat || 'update', 32), teaser: clip(String(b.teaser || '').trim(), 300) || lines[0], body: lines, image, buttons };
}

// ─────────────────────────── Router ───────────────────────────
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, '');
    const open = p.startsWith('/api/skin/') || p.startsWith('/api/lookup/');
    const h = cors(req, env, open);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const M = req.method;
    const ok = (data) => json(data, 200, h);
    let m;
    try {
      if (p === '' || p === '/') return ok({ name: 'Civicy Backend', ok: true });

      // Anmeldung
      if (p === '/auth/microsoft' && M === 'POST') return ok(await loginMicrosoft(req, env));
      if (p === '/auth/code' && M === 'POST') return ok(await loginCode(req, env));
      if (p === '/auth/logout' && M === 'POST') { try { const s = await readSession(req, env); await store(env).revokeSession(s.sid); } catch (e) {} return ok({ ok: true }); }
      if (p === '/api/me' && M === 'GET') {
        const s = await readSession(req, env);
        const u = (await store(env).user(s.sub)) || { uuid: dashed(s.sub), name: s.name, rank: env.DEFAULT_RANK || 'spieler' };
        return ok({ user: u });
      }

      // Spieler
      if ((m = p.match(/^\/api\/lookup\/([^/]+)$/)) && M === 'GET') {
        const r = await lookup(decodeURIComponent(m[1]));
        if (!r) throw new Fail(404, 'Diesen Minecraft-Namen gibt es nicht.');
        return ok(r);
      }
      if ((m = p.match(/^\/api\/skin\/([0-9a-fA-F-]{32,36})$/)) && M === 'GET') {
        const uuid = undash(m[1]);
        if (!UUID.test(uuid)) throw new Fail(400, 'UUID ungültig.');
        const res = await skin(uuid);
        const out = new Response(res.body, res);
        Object.entries(h).forEach(([k, v]) => out.headers.set(k, v));
        return out;
      }
      if ((m = p.match(/^\/api\/players\/([^/]+)$/)) && M === 'GET') {
        const name = decodeURIComponent(m[1]);
        if (!NAME.test(name)) throw new Fail(404, 'Diesen Spieler gibt es nicht.');
        const known = await store(env).player(name);
        if (known) return ok(known);
        const r = await lookup(name);
        if (!r) throw new Fail(404, 'Diesen Spieler gibt es nicht.');
        return ok({ uuid: r.uuid, name: r.name, since: null, rank: await store(env).rankOf(r.uuid, r.name), known: false, posts: 0, threads: [] });
      }

      // Forum
      if (p === '/api/forum' && M === 'GET') return ok({ categories: await store(env).forumCategories() });
      if (p === '/api/forum/recent' && M === 'GET') return ok({ threads: await store(env).forumRecent(Math.min(20, Math.max(1, +url.searchParams.get('n') || 5))) });
      if ((m = p.match(/^\/api\/forum\/c\/([a-z0-9_-]+)$/)) && M === 'GET') return ok(await store(env).forumList(m[1], Math.max(1, +url.searchParams.get('page') || 1)));
      if ((m = p.match(/^\/api\/forum\/t\/(\d+)$/))) {
        if (M === 'GET') { const t = await store(env).forumThread(+m[1]); if (!t) throw new Fail(404, 'Thema nicht gefunden.'); return ok(t); }
        if (M === 'PUT') { const s = await readSession(req, env); const b = await readJson(req); return ok(await db(env, (x) => x.forumModerate(s, +m[1], { ...('pinned' in b ? { pinned: !!b.pinned } : {}), ...('locked' in b ? { locked: !!b.locked } : {}), ...(b.cat ? { cat: clip(b.cat, 32) } : {}) }))); }
      }
      if ((m = p.match(/^\/api\/forum\/t\/(\d+)\/posts$/)) && M === 'POST') {
        const s = await readSession(req, env); const { body } = checkText(null, (await readJson(req)).body);
        return ok(await db(env, (x) => x.forumReply(s, +m[1], body)));
      }
      if (p === '/api/forum/threads' && M === 'POST') {
        const s = await readSession(req, env); const b = await readJson(req); const t = checkText(b.title, b.body);
        return ok(await db(env, (x) => x.forumCreate(s, clip(b.cat, 32), t.title, t.body)));
      }
      if ((m = p.match(/^\/api\/forum\/p\/(\d+)$/))) {
        const s = await readSession(req, env);
        if (M === 'PUT') { const { body } = checkText(null, (await readJson(req)).body); return ok(await db(env, (x) => x.forumEdit(s, +m[1], body))); }
        if (M === 'DELETE') return ok(await db(env, (x) => x.forumDelete(s, +m[1])));
      }

      // Neuigkeiten
      if (p === '/api/news' && M === 'GET') return ok({ news: await store(env).newsList() });
      if (p === '/api/news' && M === 'POST') { const s = await readSession(req, env); const n = checkNews(await readJson(req)); return ok(await db(env, (x) => x.newsSave(s, n, null))); }
      if ((m = p.match(/^\/api\/news\/([a-z0-9]+)$/))) {
        const s = await readSession(req, env);
        if (M === 'PUT') { const n = checkNews(await readJson(req)); return ok(await db(env, (x) => x.newsSave(s, n, m[1]))); }
        if (M === 'DELETE') return ok(await db(env, (x) => x.newsDelete(s, m[1])));
      }

      // Bewerbungen
      if (p === '/api/applications' && M === 'POST') return ok(await application(req, env));

      // Minecraft-Server (Plugin) und Admin
      if (p === '/api/link' && M === 'POST') {
        requireKey(req, env);
        const b = await readJson(req);
        const uuid = undash(b.uuid);
        if (!UUID.test(uuid) || !NAME.test(String(b.name || ''))) throw new Fail(400, 'UUID oder Name ungültig.');
        return ok(await store(env).createCode(uuid, b.name));
      }
      if (p === '/api/ranks' && M === 'GET') { requireKey(req, env); return ok({ ranks: await store(env).listRanks() }); }
      if ((m = p.match(/^\/api\/ranks\/([0-9a-fA-F-]{32,36})$/))) {
        requireKey(req, env);
        const uuid = undash(m[1]);
        if (!UUID.test(uuid)) throw new Fail(400, 'UUID ungültig.');
        if (M === 'PUT') {
          const b = await readJson(req);
          if (!RANK_ID.test(b.rank || '')) throw new Fail(400, 'Rang ungültig.');
          await store(env).setRank(uuid, b.rank, clip(b.name, 16));
          return ok({ ok: true });
        }
        if (M === 'DELETE') { await store(env).deleteRank(uuid); return ok({ ok: true }); }
      }
      return json({ message: 'Nicht gefunden.' }, 404, h);
    } catch (e) {
      if (e instanceof Fail) return json({ message: e.message, step: e.step }, e.status, h);
      console.error(e);
      return json({ message: 'Interner Fehler.', step: 'microsoft' }, 500, h);
    }
  },
};
