/*
 * Civicy – Backend auf Cloudflare Workers (Anleitung: backend/README.md)
 *
 * POST /auth/microsoft      Code von Microsoft einlösen → Xbox Live → Minecraft-Profil → Sitzung
 * GET  /api/me              Angemeldeten Spieler mit aktuellem Rang abrufen
 * POST /auth/logout         Abmelden (Sitzung ungültig machen)
 * POST /api/applications    Bewerbung annehmen und an Discord schicken
 * GET  /api/ranks           Alle vergebenen Ränge (nur mit ADMIN_KEY)
 * PUT  /api/ranks/<uuid>    Rang setzen, z. B. vom Minecraft-Server-Plugin: {"rank":"moderator"} (nur mit ADMIN_KEY)
 * DELETE /api/ranks/<uuid>  Rang entfernen (nur mit ADMIN_KEY)
 *
 * Gespeichert wird in einem Durable Object mit SQLite (im kostenlosen Tarif enthalten).
 */
import { DurableObject } from 'cloudflare:workers';

const MS_TOKEN = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const XBL_AUTH = 'https://user.auth.xboxlive.com/user/authenticate';
const XSTS_AUTH = 'https://xsts.auth.xboxlive.com/xsts/authorize';
const MC_LOGIN = 'https://api.minecraftservices.com/authentication/login_with_xbox';
const MC_PROFILE = 'https://api.minecraftservices.com/minecraft/profile';
const SESSION_DAYS = 30;
const RANK_ID = /^[a-z0-9_-]{1,32}$/;
const UUID = /^[0-9a-f]{32}$/;

// ─────────────────────────── Speicher ───────────────────────────
export class CivicyStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS users (uuid TEXT PRIMARY KEY, name TEXT, email TEXT, since TEXT, seen TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS ranks (uuid TEXT PRIMARY KEY, rank TEXT, name TEXT, updated TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, uuid TEXT, revoked INTEGER DEFAULT 0, created TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT, job TEXT, data TEXT, created TEXT)`);
  }
  upsertUser(u) {
    const now = new Date().toISOString();
    const row = this.sql.exec('SELECT since FROM users WHERE uuid = ?', u.uuid).toArray()[0];
    const since = row ? row.since : now;
    this.sql.exec('INSERT OR REPLACE INTO users (uuid, name, email, since, seen) VALUES (?, ?, ?, ?, ?)', u.uuid, u.name, u.email || '', since, now);
    return { since };
  }
  getUser(uuid) { return this.sql.exec('SELECT uuid, name, email, since FROM users WHERE uuid = ?', uuid).toArray()[0] || null; }
  getRank(uuid) { const r = this.sql.exec('SELECT rank FROM ranks WHERE uuid = ?', uuid).toArray()[0]; return r ? r.rank : null; }
  setRank(uuid, rank, name) { this.sql.exec('INSERT OR REPLACE INTO ranks (uuid, rank, name, updated) VALUES (?, ?, ?, ?)', uuid, rank, name || '', new Date().toISOString()); }
  deleteRank(uuid) { this.sql.exec('DELETE FROM ranks WHERE uuid = ?', uuid); }
  listRanks() { return this.sql.exec('SELECT uuid, rank, name, updated FROM ranks ORDER BY updated DESC').toArray(); }
  addSession(sid, uuid) { this.sql.exec('INSERT INTO sessions (sid, uuid, created) VALUES (?, ?, ?)', sid, uuid, new Date().toISOString()); }
  sessionValid(sid) { const r = this.sql.exec('SELECT revoked FROM sessions WHERE sid = ?', sid).toArray()[0]; return !!r && !r.revoked; }
  revokeSession(sid) { this.sql.exec('UPDATE sessions SET revoked = 1 WHERE sid = ?', sid); }
  // höchstens eine Bewerbung pro Stelle und Spieler in 24 Stunden
  addApplication(uuid, job, data) {
    const since = new Date(Date.now() - 864e5).toISOString();
    const recent = this.sql.exec('SELECT COUNT(*) AS n FROM applications WHERE uuid = ? AND job = ? AND created > ?', uuid, job, since).toArray()[0].n;
    if (recent > 0) return false;
    this.sql.exec('INSERT INTO applications (uuid, job, data, created) VALUES (?, ?, ?, ?)', uuid, job, JSON.stringify(data), new Date().toISOString());
    return true;
  }
}
const store = (env) => env.CIVICY_STORE.get(env.CIVICY_STORE.idFromName('main'));

// ─────────────────────────── Helfer ───────────────────────────
const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

class Fail extends Error {
  constructor(status, message, step) { super(message); this.status = status; this.step = step; }
}

function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = [env.APP_URL || '', ...(env.ALLOWED_ORIGINS || '').split(',')].map((s) => s.trim()).filter(Boolean).map((u) => { try { return new URL(u).origin; } catch (e) { return ''; } });
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : (allowed[0] || ''),
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
  if (!body || !sig || !env.SESSION_SECRET) throw new Fail(401, 'Nicht angemeldet.');
  if (!safeEqual(sig, await hmac(env.SESSION_SECRET, body))) throw new Fail(401, 'Sitzung ungültig.');
  let p;
  try { p = JSON.parse(new TextDecoder().decode(fromB64url(body))); } catch (e) { throw new Fail(401, 'Sitzung ungültig.'); }
  if (!p.exp || p.exp < Date.now()) throw new Fail(401, 'Sitzung abgelaufen.');
  if (!(await store(env).sessionValid(p.sid))) throw new Fail(401, 'Sitzung beendet.');
  return p;
}
function requireAdmin(req, env) {
  const auth = req.headers.get('Authorization') || '';
  if (!env.ADMIN_KEY || !safeEqual(auth, 'Bearer ' + env.ADMIN_KEY)) throw new Fail(401, 'Kein Zugriff.');
}

// Feste Teamränge aus wrangler.toml (STAFF = {"Name oder UUID": "rang"}), sonst gespeicherter Rang, sonst Standard
async function rankFor(env, uuid, name) {
  const saved = await store(env).getRank(uuid);
  if (saved) return saved;
  try {
    const staff = JSON.parse(env.STAFF || '{}');
    for (const [k, v] of Object.entries(staff)) if (k.replace(/-/g, '').toLowerCase() === uuid || k.toLowerCase() === String(name).toLowerCase()) return v;
  } catch (e) {}
  return env.DEFAULT_RANK || 'neuling';
}
const dashed = (u) => u.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');

async function post(url, body, form) {
  return fetch(url, {
    method: 'POST',
    headers: form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: form ? new URLSearchParams(body) : JSON.stringify(body),
  });
}

// ─────────────────────────── Anmeldung ───────────────────────────
async function loginMicrosoft(req, env) {
  const { code, verifier, redirectUri } = await req.json().catch(() => ({}));
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

  // 3. Minecraft
  const mc = await post(MC_LOGIN, { identityToken: `XBL3.0 x=${uhs};${xstsj.Token}` });
  const mcj = await mc.json().catch(() => ({}));
  if (!mc.ok || !mcj.access_token) {
    const notApproved = mc.status === 403 || /Invalid app registration/i.test(JSON.stringify(mcj));
    throw new Fail(400, notApproved ? 'Die Civicy-App ist bei Minecraft noch nicht freigeschaltet (Mojang muss den Zugang erst bestätigen).' : 'Die Anmeldung bei Minecraft ist fehlgeschlagen.', 'minecraft');
  }
  const prof = await fetch(MC_PROFILE, { headers: { Authorization: 'Bearer ' + mcj.access_token } });
  const profj = await prof.json().catch(() => ({}));
  if (prof.status === 404 || !profj.id) throw new Fail(400, 'Zu diesem Microsoft-Konto gehört kein Minecraft: Java Edition.', 'minecraft');

  // 4. Civicy: Spieler speichern, Rang holen, Sitzung ausstellen
  const uuid = profj.id.toLowerCase();
  const { since } = await store(env).upsertUser({ uuid, name: profj.name, email });
  const rank = await rankFor(env, uuid, profj.name);
  const sid = crypto.randomUUID();
  await store(env).addSession(sid, uuid);
  const token = await signSession(env, { sub: uuid, name: profj.name, sid, exp: Date.now() + SESSION_DAYS * 864e5 });
  return { token, user: { uuid: dashed(uuid), name: profj.name, email, rank, since } };
}

async function me(req, env) {
  const s = await readSession(req, env);
  const u = (await store(env).getUser(s.sub)) || { uuid: s.sub, name: s.name };
  return { user: { uuid: dashed(u.uuid), name: u.name, email: u.email || '', since: u.since, rank: await rankFor(env, u.uuid, u.name) } };
}

// ─────────────────────────── Bewerbungen ───────────────────────────
async function application(req, env) {
  const s = await readSession(req, env);
  const body = await req.json().catch(() => null);
  if (!body || typeof body.job !== 'string' || typeof body.answers !== 'object') throw new Fail(400, 'Bewerbung unvollständig.');
  const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
  const a = {};
  for (const [k, v] of Object.entries(body.answers).slice(0, 20)) a[clip(k, 40)] = clip(v, 1500);
  const job = clip(body.job, 40);
  const ok = await store(env).addApplication(s.sub, job, a);
  if (!ok) throw new Fail(429, 'Du hast dich auf diese Stelle heute schon beworben.');
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
      body: JSON.stringify({
        username: 'Civicy Bewerbungen',
        allowed_mentions: { parse: [] },
        embeds: [{ title: `Neue Bewerbung: ${clip(body.jobTitle || job, 100)}`, color: 0x5ce1ff, thumbnail: { url: `https://mc-heads.net/avatar/${s.sub}/64` }, fields, timestamp: new Date().toISOString() }],
      }),
    }).catch(() => {});
  }
  return { ok: true };
}

// ─────────────────────────── Router ───────────────────────────
export default {
  async fetch(req, env) {
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, '');
    try {
      if (p === '' || p === '/') return json({ name: 'Civicy Backend', ok: true }, 200, h);
      if (p === '/auth/microsoft' && req.method === 'POST') return json(await loginMicrosoft(req, env), 200, h);
      if (p === '/auth/logout' && req.method === 'POST') {
        try { const s = await readSession(req, env); await store(env).revokeSession(s.sid); } catch (e) {}
        return json({ ok: true }, 200, h);
      }
      if (p === '/api/me' && req.method === 'GET') return json(await me(req, env), 200, h);
      if (p === '/api/applications' && req.method === 'POST') return json(await application(req, env), 200, h);
      if (p === '/api/ranks' && req.method === 'GET') { requireAdmin(req, env); return json({ ranks: await store(env).listRanks() }, 200, h); }
      const m = p.match(/^\/api\/ranks\/([0-9a-fA-F-]{32,36})$/);
      if (m) {
        requireAdmin(req, env);
        const uuid = m[1].replace(/-/g, '').toLowerCase();
        if (!UUID.test(uuid)) throw new Fail(400, 'UUID ungültig.');
        if (req.method === 'PUT') {
          const b = await req.json().catch(() => ({}));
          if (!RANK_ID.test(b.rank || '')) throw new Fail(400, 'Rang ungültig.');
          await store(env).setRank(uuid, b.rank, String(b.name || '').slice(0, 16));
          return json({ ok: true }, 200, h);
        }
        if (req.method === 'DELETE') { await store(env).deleteRank(uuid); return json({ ok: true }, 200, h); }
      }
      return json({ message: 'Nicht gefunden.' }, 404, h);
    } catch (e) {
      if (e instanceof Fail) return json({ message: e.message, step: e.step }, e.status, h);
      console.error(e);
      return json({ message: 'Interner Fehler.', step: 'microsoft' }, 500, h);
    }
  },
};
