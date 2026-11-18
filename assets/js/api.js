/*
 * Civicy – Forum, Neuigkeiten des Teams und Spielerprofile
 * Mit Backend (config.js → api) wird alles dort gespeichert und ist für alle sichtbar.
 * Ohne Backend (Demo) liegt es nur im Speicher dieses Browsers – zum Ausprobieren.
 */
(function () {
  'use strict';
  const DATA = window.CIVICY_DATA || {};
  const AUTH = window.CivicyAuth;
  const API = AUTH.api;
  const LIVE = AUTH.hasBackend();
  const KEY = 'civicy-demo-db';

  const fail = (msg) => { throw new Error(msg); };
  async function call(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (AUTH.token) headers.Authorization = 'Bearer ' + AUTH.token;
    let r;
    try { r = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); } catch (e) { fail('Das Backend ist gerade nicht erreichbar.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) fail(j.message || 'Das hat nicht geklappt.');
    return j;
  }

  // ─────────────── Demo-Speicher ───────────────
  function author(name) {
    const t = AUTH.teamMember(name);
    return { uuid: '', name: t ? t.name : name, rank: t ? t.rank : AUTH.localRank(name) };
  }
  function me() {
    const u = AUTH.user;
    if (!u) fail('Bitte melde dich zuerst an.');
    return { uuid: u.uuid || '', name: u.name, rank: u.rank };
  }
  function db() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (d && d.v === 1) return d;
    d = { v: 1, seq: 1, threads: [], posts: [], news: [] };
    (DATA.forumSeed || []).forEach((t) => {
      const id = d.seq++;
      const posts = t.posts.map((p) => ({ id: d.seq++, thread: id, author: author(p.author), body: p.body, created: p.date }));
      d.posts.push(...posts);
      d.threads.push({ id, cat: t.cat, title: t.title, author: author(t.author), created: t.date, updated: posts[posts.length - 1].created, pinned: !!t.pinned, locked: !!t.locked, views: 10 + id * 7 });
    });
    save(d);
    return d;
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  const isStaff = () => AUTH.isStaff(AUTH.user);
  const cat = (id) => (DATA.forum || []).find((c) => c.id === id);
  function check(title, body) {
    if (title != null && (title.trim().length < 4 || title.length > 120)) fail('Der Titel braucht 4 bis 120 Zeichen.');
    if (body.trim().length < 2 || body.length > 5000) fail('Der Text braucht 2 bis 5000 Zeichen.');
  }
  function withMeta(d, t) {
    const posts = d.posts.filter((p) => p.thread === t.id);
    const last = posts[posts.length - 1];
    return { ...t, replies: Math.max(0, posts.length - 1), last: last ? { name: last.author.name, at: last.created } : null };
  }
  const sortThreads = (a, b) => (b.pinned - a.pinned) || (a.updated < b.updated ? 1 : -1);

  const demo = {
    async categories() {
      const d = db();
      return (DATA.forum || []).map((c) => {
        const ts = d.threads.filter((t) => t.cat === c.id).sort((a, b) => (a.updated < b.updated ? 1 : -1));
        const posts = d.posts.filter((p) => ts.some((t) => t.id === p.thread)).length;
        return { id: c.id, threads: ts.length, posts, last: ts[0] ? { id: ts[0].id, title: ts[0].title, ...withMeta(d, ts[0]).last } : null };
      });
    },
    async list(catId, page) {
      const d = db();
      const all = d.threads.filter((t) => t.cat === catId).sort(sortThreads).map((t) => withMeta(d, t));
      return { threads: all.slice((page - 1) * 20, page * 20), total: all.length };
    },
    async recent(n) {
      const d = db();
      return d.threads.slice().sort((a, b) => (a.updated < b.updated ? 1 : -1)).slice(0, n || 5).map((t) => withMeta(d, t));
    },
    async thread(id) {
      const d = db();
      const t = d.threads.find((x) => x.id === +id);
      if (!t) return null;
      t.views = (t.views || 0) + 1; save(d);
      return { thread: withMeta(d, t), posts: d.posts.filter((p) => p.thread === t.id) };
    },
    async createThread(catId, title, body) {
      const c = cat(catId); if (!c) fail('Diese Kategorie gibt es nicht.');
      const a = me();
      if (c.staffOnly && !isStaff()) fail('Hier kann nur das Team neue Themen erstellen.');
      check(title, body);
      const d = db(); const now = new Date().toISOString(); const id = d.seq++;
      d.threads.push({ id, cat: catId, title: title.trim(), author: a, created: now, updated: now, pinned: false, locked: false, views: 0 });
      d.posts.push({ id: d.seq++, thread: id, author: a, body: body.trim(), created: now });
      save(d); return { id };
    },
    async reply(threadId, body) {
      const a = me(); check(null, body);
      const d = db(); const t = d.threads.find((x) => x.id === +threadId);
      if (!t) fail('Dieses Thema gibt es nicht mehr.');
      if (t.locked && !isStaff()) fail('Dieses Thema ist geschlossen.');
      const now = new Date().toISOString();
      const p = { id: d.seq++, thread: t.id, author: a, body: body.trim(), created: now };
      d.posts.push(p); t.updated = now; save(d); return p;
    },
    async editPost(postId, body) {
      const a = me(); check(null, body);
      const d = db(); const p = d.posts.find((x) => x.id === +postId);
      if (!p) fail('Beitrag nicht gefunden.');
      if (p.author.name.toLowerCase() !== a.name.toLowerCase() && !isStaff()) fail('Du kannst nur eigene Beiträge bearbeiten.');
      p.body = body.trim(); p.edited = new Date().toISOString(); save(d); return p;
    },
    async deletePost(postId) {
      const a = me(); const d = db(); const p = d.posts.find((x) => x.id === +postId);
      if (!p) return { thread: null };
      if (p.author.name.toLowerCase() !== a.name.toLowerCase() && !isStaff()) fail('Du kannst nur eigene Beiträge löschen.');
      const first = d.posts.filter((x) => x.thread === p.thread)[0];
      if (first && first.id === p.id) { d.posts = d.posts.filter((x) => x.thread !== p.thread); d.threads = d.threads.filter((t) => t.id !== p.thread); save(d); return { thread: null, deletedThread: true }; }
      d.posts = d.posts.filter((x) => x.id !== p.id); save(d); return { thread: p.thread };
    },
    async moderate(threadId, change) {
      if (!isStaff()) fail('Nur für das Team.');
      const d = db(); const t = d.threads.find((x) => x.id === +threadId);
      if (!t) fail('Thema nicht gefunden.');
      ['pinned', 'locked'].forEach((k) => { if (k in change) t[k] = !!change[k]; });
      if (change.cat && cat(change.cat)) t.cat = change.cat;
      save(d); return t;
    },
    async news() { return db().news.slice().sort((a, b) => (a.date < b.date ? 1 : -1)); },
    async saveNews(n) {
      if (!isStaff()) fail('Nur das Team kann Neuigkeiten schreiben.');
      const d = db(); const a = me();
      if (n.id && d.news.some((x) => x.id === n.id)) {
        const i = d.news.findIndex((x) => x.id === n.id);
        d.news[i] = { ...d.news[i], ...n, edited: new Date().toISOString() };
        save(d); return d.news[i];
      }
      const item = { ...n, id: 'n' + Date.now().toString(36), date: new Date().toISOString(), author: a.name, custom: true };
      d.news.push(item); save(d); return item;
    },
    async deleteNews(id) {
      if (!isStaff()) fail('Nur für das Team.');
      const d = db(); d.news = d.news.filter((x) => x.id !== id); save(d); return { ok: true };
    },
    async player(name) {
      const d = db();
      const found = await AUTH.lookup(name).catch(() => undefined);
      if (found === null) return null;
      const p = found || { uuid: '', name };
      const mine = AUTH.user && AUTH.user.name.toLowerCase() === p.name.toLowerCase() ? AUTH.user : null;
      const threads = d.threads.filter((t) => t.author.name.toLowerCase() === p.name.toLowerCase()).sort((a, b) => (a.updated < b.updated ? 1 : -1)).map((t) => withMeta(d, t));
      return {
        uuid: p.uuid, name: p.name, rank: mine ? mine.rank : AUTH.localRank(p.name),
        since: mine ? mine.since : null, known: !!mine || threads.length > 0 || !!AUTH.teamMember(p.name),
        posts: d.posts.filter((x) => x.author.name.toLowerCase() === p.name.toLowerCase()).length,
        threads: threads.slice(0, 10),
      };
    },
  };

  // ─────────────── Backend ───────────────
  const live = {
    categories: () => call('GET', '/api/forum').then((j) => j.categories),
    list: (catId, page) => call('GET', `/api/forum/c/${encodeURIComponent(catId)}?page=${page || 1}`),
    recent: (n) => call('GET', `/api/forum/recent?n=${n || 5}`).then((j) => j.threads),
    thread: (id) => call('GET', `/api/forum/t/${encodeURIComponent(id)}`).catch((e) => { if (/nicht gefunden/i.test(e.message)) return null; throw e; }),
    createThread: (catId, title, body) => call('POST', '/api/forum/threads', { cat: catId, title, body }),
    reply: (id, body) => call('POST', `/api/forum/t/${encodeURIComponent(id)}/posts`, { body }),
    editPost: (postId, body) => call('PUT', `/api/forum/p/${encodeURIComponent(postId)}`, { body }),
    deletePost: (postId) => call('DELETE', `/api/forum/p/${encodeURIComponent(postId)}`),
    moderate: (id, change) => call('PUT', `/api/forum/t/${encodeURIComponent(id)}`, change),
    news: () => call('GET', '/api/news').then((j) => j.news),
    saveNews: (n) => (n.id ? call('PUT', `/api/news/${encodeURIComponent(n.id)}`, n) : call('POST', '/api/news', n)),
    deleteNews: (id) => call('DELETE', `/api/news/${encodeURIComponent(id)}`),
    player: (name) => call('GET', `/api/players/${encodeURIComponent(name)}`).catch((e) => { if (/nicht gefunden|gibt es nicht/i.test(e.message)) return null; throw e; }),
  };

  window.CivicyAPI = Object.assign({ live: LIVE }, LIVE ? live : demo);
})();
