/*
 * Civicy – Web-App
 * Eine Seite, Navigation über die Adresse (#/news, #/team/<Name> …). Kein Build-Schritt.
 * Inhalte: data.js · Einstellungen: config.js · Anmeldung: auth.js · Forum/News/Profile: api.js · Symbole: icons.js
 */
(function () {
  'use strict';

  const CFG = window.CIVICY_CONFIG || {};
  const DATA = window.CIVICY_DATA || {};
  const AUTH = window.CivicyAuth;
  const API = window.CivicyAPI;
  const ICONS = window.CIVICY_ICONS || {};
  const BRANDS = window.CIVICY_BRANDS || {};
  const SERVER = CFG.server || {};
  const LINKS = CFG.links || {};

  // ─────────────────────────── Helfer ───────────────────────────
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 256 256" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const brand = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${BRANDS[n] || ''}"/></svg>`;
  const msLogo = '<span class="ms-logo" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  const fmtDate = (d) => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const fmtShort = (d) => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const fmtNum = (n) => Number(n).toLocaleString('de-DE');
  const readTime = (post) => Math.max(1, Math.round([post.title, post.teaser].concat(post.body || []).join(' ').split(/\s+/).length / 200));
  const slug = (s) => encodeURIComponent(String(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const fill = (s) => String(s)
    .replace(/\{ip\}/g, `<b>${esc(SERVER.ip)}</b>`)
    .replace(/\{bedrock\}/g, `<b>${esc(SERVER.bedrockIp || SERVER.ip)}</b>`)
    .replace(/\{port\}/g, `<b>${esc(SERVER.bedrockPort || 19132)}</b>`)
    .replace(/\{version\}/g, `<b>${esc(SERVER.version || '')}</b>`);
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Zufall mit Startwert – damit jedes Bild immer gleich aussieht
  function rng(seed) {
    let h = 2166136261;
    for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  }

  // Kopf und Skin
  const headImg = (user, size, cls, alt) => `<img class="${cls || ''}" src="${AUTH.head(user, size)}" alt="${esc(alt == null ? '' : alt)}" width="${size}" height="${size}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${AUTH.fallback}'">`;
  const bodyImg = (user, size, cls) => `<img class="${cls || ''}" src="${AUTH.body(user, size)}" alt="Skin von ${esc(user.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${AUTH.fallback}';this.style.width='120px';this.style.height='120px'">`;
  const rankBadge = (r, lg) => `<span class="rank${lg ? ' rank--lg' : ''}" style="--c:${esc(r.color)}">${esc(r.name)}</span>`;
  const slot = (n) => `<span class="slot" aria-hidden="true">${ic(n)}</span>`;

  // ─────────────────────────── Theme ───────────────────────────
  const media = matchMedia('(prefers-color-scheme: light)');
  const getTheme = () => { try { return localStorage.getItem('civicy-theme') || 'dark'; } catch (e) { return 'dark'; } };
  function applyTheme() {
    let t = getTheme();
    if (t === 'system') t = media.matches ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    // Bildlaufleiste neu zeichnen lassen, damit sie sofort die Farbe des Themes übernimmt
    const html = document.documentElement;
    html.style.overflowY = 'hidden'; void html.offsetHeight; html.style.overflowY = '';
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = t === 'light' ? '#EEF5FC' : '#060B16';
    $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === getTheme())));
  }
  function setTheme(t) { try { localStorage.setItem('civicy-theme', t); } catch (e) {} applyTheme(); }
  media.addEventListener ? media.addEventListener('change', applyTheme) : media.addListener(applyTheme);
  const themeSwitch = (cls) => `<div class="${cls || 'theme-switch'}" role="group" aria-label="Farbschema">
      <button type="button" data-theme-set="dark" aria-pressed="false">${ic('moon-stars')}Dunkel</button>
      <button type="button" data-theme-set="light" aria-pressed="false">${ic('sun')}Hell</button>
      <button type="button" data-theme-set="system" aria-pressed="false">${ic('monitor')}Auto</button>
    </div>`;

  // ─────────────────────────── Meldungen & Kopieren ───────────────────────────
  let toastTimer;
  function toast(msg, icon) {
    const t = $('[data-toast]');
    t.innerHTML = ic(icon || 'check-circle-f') + `<span>${esc(msg)}</span>`;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((res) => {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); res();
    });
  }
  const ipButton = (cls) => `<button class="btn ${cls || 'btn--brand'} ip-btn" type="button" data-copy-ip aria-label="Server-Adresse ${esc(SERVER.ip)} kopieren"><span class="ip-btn__ip">${esc(SERVER.ip)}</span><span class="ip-btn__copy">${ic('copy')}</span></button>`;

  // ─────────────────────────── Live-Status des Servers ───────────────────────────
  let status = null;
  let statusPromise = null;
  function loadStatus() {
    if (!SERVER.liveStatus || !SERVER.ip) return Promise.resolve(null);
    if (statusPromise && status && Date.now() - status.at < 60000) return statusPromise;
    statusPromise = fetch('https://api.mcsrvstat.us/3/' + encodeURIComponent(SERVER.ip))
      .then((r) => r.json())
      .then((j) => (status = { at: Date.now(), online: !!j.online, players: (j.players && j.players.online) || 0, max: (j.players && j.players.max) || 0, version: j.protocol && j.protocol.name }))
      .catch(() => (status = { at: Date.now(), failed: true }));
    return statusPromise;
  }
  function paintStatus() {
    const s = status;
    $$('[data-status-dot]').forEach((d) => { d.classList.toggle('is-on', !!(s && s.online)); d.classList.toggle('is-off', !!(s && !s.online && !s.failed)); });
    $$('[data-status-online]').forEach((el) => { el.textContent = s && s.online ? fmtNum(s.players) : '–'; });
    $$('[data-status-label]').forEach((el) => { el.textContent = !s ? 'Status wird geladen' : s.failed ? 'Status unbekannt' : s.online ? 'Spieler online' : 'Server offline'; });
    $$('[data-status-max]').forEach((el) => { el.textContent = s && s.online && s.max ? fmtNum(s.max) : '–'; });
  }

  // Mitgliederzahl des Discord-Servers (über den Einladungscode)
  let discordCount = null;
  function loadDiscord() {
    if (!LINKS.discordInvite) return Promise.resolve(null);
    if (discordCount != null) return Promise.resolve(discordCount);
    return fetch('https://discord.com/api/v10/invites/' + encodeURIComponent(LINKS.discordInvite) + '?with_counts=true')
      .then((r) => r.json()).then((j) => (discordCount = j.approximate_member_count || null)).catch(() => null);
  }

  // ─────────────────────────── Bilder: Nachtlandschaft aus Blöcken ───────────────────────────
  function hills(W, H, B, layers, seed, opts) {
    const r = rng(seed);
    let out = '';
    layers.forEach((L, li) => {
      let h = L.base + r() * L.var;
      let d = `M0 ${H}`;
      const tops = [];
      for (let x = 0; x <= W; x += B) {
        h += (r() - 0.5) * L.rough;
        h = Math.max(L.base - L.var, Math.min(L.base + L.var, h));
        const y = Math.round((H - h) / B) * B;
        tops.push([x, y]);
        d += ` V${y} H${x + B}`;
      }
      d += ` V${H} Z`;
      out += `<path d="${d}" ${L.fill.startsWith('var') ? `style="fill:${L.fill}"` : `fill="${L.fill}"`}/>`;
      // Fichten und Häuser mit Licht auf den mittleren Ebenen
      if (L.trees) {
        tops.forEach(([x, y], i) => {
          const p = r();
          if (p < L.trees) {
            const t = B * (2 + Math.floor(r() * 2));
            out += `<rect x="${x + B * 0.375}" y="${y - B}" width="${B / 4}" height="${B}" fill="${L.trunk}"/>`;
            for (let k = 0; k < 3; k++) out += `<rect x="${x - B * 0.5 + k * B * 0.375}" y="${y - B - (k + 1) * t / 3}" width="${B * 2 - k * B * 0.75}" height="${t / 3 + 1}" fill="${L.leaf}"/>`;
          } else if (opts && opts.houses && p > 1 - opts.houses && i > 1) {
            const w = B * 2, hh = B * 1.5;
            out += `<rect x="${x}" y="${y - hh}" width="${w}" height="${hh}" fill="${L.house}"/><rect x="${x - B * 0.25}" y="${y - hh - B * 0.5}" width="${w + B * 0.5}" height="${B * 0.5}" fill="${L.roof}"/><rect x="${x + B * 0.5}" y="${y - hh + B * 0.4}" width="${B * 0.4}" height="${B * 0.4}" fill="#FFC861"/><rect x="${x + B * 1.1}" y="${y - hh + B * 0.4}" width="${B * 0.4}" height="${B * 0.4}" fill="#FFC861" opacity=".7"/>`;
          }
        });
      }
    });
    return out;
  }
  function heroHills() {
    return `<svg class="hero__hills" viewBox="0 0 1440 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${hills(1440, 240, 16, [
      { base: 170, var: 50, rough: 34, fill: '#0D2246' },
      { base: 120, var: 40, rough: 26, fill: '#0A1834', trees: 0.16, leaf: '#0F2B3E', trunk: '#0A1A2A', house: '#13294A', roof: '#0B1A33' },
      { base: 56, var: 26, rough: 18, fill: 'var(--bg)', trees: 0 },
    ], 'civicy-hero', { houses: 0.06 })}</svg>`;
  }
  // Titelbild einer Neuigkeit: Himmel in der Farbe der Kategorie, Sterne, Mond, Hügel
  function scene(seed, color) {
    const r = rng(seed);
    const W = 320, H = 180, id = 'g' + Math.floor(r() * 1e9);
    let stars = '';
    for (let i = 0; i < 34; i++) stars += `<rect x="${Math.floor(r() * 80) * 4}" y="${Math.floor(r() * 26) * 4}" width="2" height="2" fill="#E6FBFF" opacity="${(0.3 + r() * 0.7).toFixed(2)}"/>`;
    const mx = 40 + Math.floor(r() * 220), my = 18 + Math.floor(r() * 30);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#040812"/><stop offset="1" stop-color="#0B1D3A"/></linearGradient>
      <filter id="${id}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter></defs>
      <rect width="${W}" height="${H}" fill="url(#${id})"/>
      <ellipse cx="${80 + r() * 160}" cy="40" rx="140" ry="34" fill="${color}" opacity=".45" filter="url(#${id}b)"/>
      ${stars}
      <rect x="${mx - 6}" y="${my - 6}" width="32" height="32" fill="#E6FBFF" opacity=".12"/>
      <rect x="${mx}" y="${my}" width="20" height="20" fill="#E6FBFF"/><rect x="${mx + 4}" y="${my + 6}" width="4" height="4" fill="#C9E8F5"/><rect x="${mx + 12}" y="${my + 12}" width="4" height="4" fill="#C9E8F5"/>
      ${hills(W, H, 8, [
        { base: 92, var: 26, rough: 20, fill: '#0D2246' },
        { base: 62, var: 18, rough: 14, fill: '#0A1834', trees: 0.2, leaf: '#0F2B3E', trunk: '#0A1A2A', house: '#13294A', roof: '#0B1A33' },
        { base: 28, var: 10, rough: 10, fill: '#060B16' },
      ], seed + 'h', { houses: 0.12 })}
      <rect x="0" y="${H - 3}" width="${W}" height="3" fill="${color}" opacity=".9"/>
    </svg>`;
  }
  const coverOf = (post) => {
    if (post.image) return `<img src="${esc(post.image)}" alt="" loading="lazy">`;
    if (post.cover === 'mondturm') return '<img src="assets/img/mondturm.jpg" alt="" loading="lazy" style="object-position:center 30%">';
    return scene(post.id, catOf(post).color);
  };
  function pixelsDeco(seed, n) {
    const r = rng(seed);
    let s = '';
    for (let i = 0; i < (n || 14); i++) {
      const size = [6, 8, 10, 14][Math.floor(r() * 4)];
      s += `<i style="left:${(r() * 100).toFixed(1)}%;top:${(r() * 100).toFixed(1)}%;--s:${size}px;--o:${(0.1 + r() * 0.35).toFixed(2)};--d:${(3 + r() * 4).toFixed(1)}s;--dl:${(-r() * 5).toFixed(1)}s"></i>`;
    }
    return `<div class="page-head__pixels" aria-hidden="true">${s}</div>`;
  }
  const pageHead = (eyebrow, title, lead, seed, extra) => `<header class="page-head">${pixelsDeco(seed)}<div class="wrap">
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h1 class="mega">${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}${extra || ''}</div></header>`;

  // ─────────────────────────── Daten-Helfer ───────────────────────────
  const ranks = DATA.ranks || [];
  const staffRanks = ranks.filter((r) => r.staff);
  const shopRanks = ranks.filter((r) => r.buy);
  const rankOf = (id) => AUTH.rankById(id);
  const modes = DATA.modes || [];
  const cats = DATA.newsCats || [];
  const catOf = (p) => cats.find((c) => c.id === p.cat) || { name: 'News', color: '#5CE1FF' };
  const staticNews = (DATA.news || []).slice();
  let news = staticNews.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  let newsLoaded = null;
  // Neuigkeiten aus data.js plus die, die das Team auf der Seite schreibt
  function loadNews(force) {
    if (newsLoaded && !force) return newsLoaded;
    newsLoaded = API.news().then((custom) => {
      news = staticNews.concat((custom || []).map((n) => ({ ...n, custom: true }))).sort((a, b) => (a.date < b.date ? 1 : -1));
      return news;
    }).catch(() => news);
    return newsLoaded;
  }
  const team = (DATA.team || []).slice().sort((a, b) => ranks.findIndex((r) => r.id === a.rank) - ranks.findIndex((r) => r.id === b.rank));
  const findMember = (name) => team.find((m) => m.name.toLowerCase() === String(name).toLowerCase());
  const jobs = DATA.jobs || [];
  const forumCats = DATA.forum || [];
  const forumCat = (id) => forumCats.find((c) => c.id === id);
  const isStaff = () => AUTH.isStaff(AUTH.user);

  function textBody(lines) {
    let html = '', list = [];
    const flush = () => { if (list.length) { html += `<ul>${list.map((l) => `<li>${fill(esc(l))}</li>`).join('')}</ul>`; list = []; } };
    (lines || []).forEach((l) => {
      if (l.startsWith('- ')) { list.push(l.slice(2)); return; }
      flush();
      html += l.startsWith('## ') ? `<h2>${esc(l.slice(3))}</h2>` : `<p>${fill(esc(l))}</p>`;
    });
    flush();
    return html;
  }
  // Forentext: Absätze, Zeilenumbrüche und Links
  const richText = (s) => String(s || '').split(/\n{2,}/).map((para) => `<p>${fill(esc(para)).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener nofollow ugc">$1</a>')}</p>`).join('');
  const ago = (d) => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (isNaN(s)) return '';
    if (s < 60) return 'gerade eben';
    if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
    if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
    if (s < 86400 * 7) { const n = Math.floor(s / 86400); return `vor ${n} ${n === 1 ? 'Tag' : 'Tagen'}`; }
    return fmtShort(d);
  };
  const faqItem = (f, open) => `<details class="faq-item"${open ? ' open' : ''}><summary>${esc(f.q)}<span class="pm" aria-hidden="true"></span></summary><div class="faq-item__a">${f.a.map((p) => `<p>${fill(esc(p))}</p>`).join('')}</div></details>`;
  const discordCard = () => LINKS.discord ? `<a class="faq__ask" data-link="discord" href="${esc(LINKS.discord)}" target="_blank" rel="noopener">${brand('discord')}<span><b>Nicht gefunden, was du suchst?</b><small>Frag die Community und das Team auf Discord.</small></span>${ic('arrow-up-right')}</a>` : '';
  // Chat-Zeile wie im Spiel: [TAG] Name: Nachricht
  const chatLine = (r, name, msg) => `<div class="chat-line" aria-label="So sieht es im Chat aus">${r.tag ? `<span style="color:${esc(r.color)}">[${esc(r.tag)}]</span> ` : ''}<span style="color:${esc(r.tag ? r.color : '#AAB4C3')}">${esc(name)}</span><span class="chat-line__sep">:</span> ${esc(msg || 'Hallo zusammen!')}</div>`;
  const playerLink = (a, size) => `<a class="who" href="#/spieler/${slug(a.name)}">${headImg(a, size || 32, 'who__head', '')}<span>${esc(a.name)}</span></a>`;
  const loading = (text) => `<div class="loading"><span class="spinner"></span>${esc(text || 'Wird geladen …')}</div>`;

  // ── 3D-Skin (skinview3d, wird erst geladen, wenn er gebraucht wird) ──
  let skinLib = null;
  const viewers = new Set();
  function loadSkinLib() {
    if (window.skinview3d) return Promise.resolve(window.skinview3d);
    if (!skinLib) skinLib = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'assets/vendor/skinview3d.bundle.js'; s.onload = () => res(window.skinview3d); s.onerror = rej; document.head.appendChild(s); });
    return skinLib;
  }
  // Ersetzt das <div data-skin> durch einen drehbaren Spieler mit dem echten Skin; ohne WebGL bleibt das Bild stehen
  function mountSkins(root) {
    $$('[data-skin]', root).forEach((box) => {
      const user = { uuid: box.dataset.uuid || '', name: box.dataset.name || '' };
      const w = +box.dataset.w || 220, h = +box.dataset.h || 300;
      let probe;
      try { probe = document.createElement('canvas').getContext('webgl'); } catch (e) { probe = null; }
      if (!probe) return;
      loadSkinLib().then((sv) => {
        const urls = AUTH.skins(user);
        const tryUrl = (i, viewer) => {
          if (i >= urls.length) { viewer.dispose(); viewers.delete(viewer); return; }
          viewer.loadSkin(urls[i]).then(() => {
            if (!box.isConnected) { viewer.dispose(); viewers.delete(viewer); return; }
            box.classList.add('is-3d');
            box.appendChild(viewer.canvas);
          }).catch(() => tryUrl(i + 1, viewer));
        };
        const canvas = document.createElement('canvas');
        canvas.className = 'skin3d__canvas';
        canvas.setAttribute('aria-hidden', 'true');
        const viewer = new sv.SkinViewer({ canvas, width: w, height: h, pixelRatio: Math.min(2, devicePixelRatio || 1) });
        viewers.add(viewer);
        viewer.fov = 40;
        viewer.zoom = 0.86;
        viewer.autoRotate = !prefersReduced;
        viewer.autoRotateSpeed = 0.6;
        viewer.controls.enableZoom = false;
        if (!prefersReduced) { viewer.animation = new sv.WalkingAnimation(); viewer.animation.speed = 0.6; }
        viewer.background = null;
        tryUrl(0, viewer);
      }).catch(() => {});
    });
  }
  function disposeSkins() { viewers.forEach((v) => { try { v.dispose(); } catch (e) {} }); viewers.clear(); }
  const skin3d = (user, w, h, cls) => `<div class="skin3d ${cls || ''}" data-skin data-uuid="${esc(user.uuid || '')}" data-name="${esc(user.name)}" data-w="${w}" data-h="${h}" style="--w:${w}px;--h:${h}px">${bodyImg(user, Math.round(h * 0.86), 'skin3d__img')}</div>`;

  // ─────────────────────────── Seiten ───────────────────────────
  const pages = {};

  // ── Start ──
  pages.home = () => {
    let stars = '';
    const r = rng('stars');
    for (let i = 0; i < 70; i++) stars += `<i style="left:${(r() * 100).toFixed(2)}%;top:${(r() * 62).toFixed(2)}%;--d:${(2 + r() * 4).toFixed(1)}s;--dl:${(-r() * 4).toFixed(1)}s;${r() > 0.85 ? 'width:4px;height:4px;' : ''}"></i>`;
    const q = DATA.quotes || [];
    const homeFaq = (DATA.faq || []).filter((f) => f.home);
    return `<div class="page">
      <section class="hero" data-tone="dark">
        <div class="hero__aurora" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="hero__stars" aria-hidden="true">${stars}</div>
        ${heroHills()}
        <div class="wrap hero__inner">
          <div class="hero__text">
            <p class="eyebrow hero__kicker">Minecraft-Netzwerk · Java &amp; Bedrock</p>
            <h1 class="hero__title">Ein Server.<span>Unzählige Runden.</span></h1>
            <p class="hero__lead">${modes.slice(0, 6).map((m) => esc(m.name)).join(', ')} und mehr – auf Civicy wartet immer eine Runde auf dich. Mit Freunden, mit Coins und ganz ohne Pay-to-Win.</p>
            <div class="btn-row">
              ${ipButton('btn--brand')}
              ${LINKS.discord ? `<a class="btn btn--glass" href="${esc(LINKS.discord)}" target="_blank" rel="noopener">${brand('discord')}Discord beitreten</a>` : ''}
            </div>
            <div class="hero__status" aria-live="polite">
              <span class="status-dot" data-status-dot aria-hidden="true"></span>
              <span><b data-status-online>–</b><small data-status-label>Status wird geladen</small></span>
              <i class="hero__sep" aria-hidden="true"></i>
              <span><b>${modes.length}</b><small>Spielmodi</small></span>
              <i class="hero__sep" aria-hidden="true"></i>
              <span><b>${esc(SERVER.version || '–')}</b><small>Version</small></span>
            </div>
          </div>
          <div class="hero__visual">
            <figure class="hero__card"><img src="assets/img/mondturm.jpg" alt="Der Mondturm in der Lobby von Civicy bei Nacht" width="576" height="1024"><figcaption><b>Die Lobby</b><small>Mit dem Kompass zu jedem Modus</small></figcaption></figure>
            <div class="hero__chip hero__chip--a" aria-hidden="true">${slot('bed')}<span>BedWars 4×4<small>Runde startet in 10 s</small></span></div>
            <div class="hero__chip hero__chip--b" aria-hidden="true">${slot('crown')}<span>Neuer Rang<small>Diamant freigeschaltet</small></span></div>
          </div>
        </div>
        <button class="hero__scroll" type="button" data-scroll-to="#modi" aria-label="Nach unten scrollen">${ic('arrow-down')}</button>
      </section>

      <section class="section" id="modi" aria-labelledby="h-modes">
        <div class="wrap">
          <div class="sec-head reveal"><div><p class="eyebrow">Spielmodi</p><h2 id="h-modes" class="display">Wähl deinen<br><span>Lieblingsmodus.</span></h2></div>
            <a class="more-link" href="#/modi">Alle Spielmodi${ic('arrow-right')}</a></div>
          <div class="modes">${modes.map(modeCard).join('')}</div>
        </div>
      </section>

      <section class="section section--tight" aria-labelledby="h-start">
        <div class="wrap">
          <div class="sec-head reveal"><div><p class="eyebrow">In drei Schritten</p><h2 id="h-start" class="display">So startest du.</h2></div></div>
          <div class="steps">
            <div class="step reveal">${slot('game-controller')}<h3>Minecraft öffnen</h3><p>Java Edition ab ${esc(SERVER.version || '1.21')}${SERVER.bedrockIp ? ' – oder Bedrock auf Handy, Konsole und Windows' : ''}.</p></div>
            <div class="step reveal">${slot('plus')}<h3>Server hinzufügen</h3><p>Unter „Mehrspieler“ einen Server mit der Adresse <code>${esc(SERVER.ip)}</code> anlegen${SERVER.bedrockIp ? ` (Bedrock: Port <code>${esc(SERVER.bedrockPort || 19132)}</code>)` : ''}.</p></div>
            <div class="step reveal">${slot('compass')}<h3>Modus wählen</h3><p>In der Lobby mit dem Kompass einen Spielmodus aussuchen – oder mit /party Freunde mitnehmen.</p></div>
          </div>
        </div>
      </section>

      ${q.length ? `<section class="quotes" data-tone="dark" aria-label="Aus dem Team" data-quotes>
        <div class="wrap quotes__grid">
          <aside class="quotes__side">
            <p class="quotes__label">Aus dem Team</p>
            <div class="quotes__by" data-quote-by></div>
            <div class="quotes__ctl">
              <button class="ctl-btn" type="button" data-quote-prev aria-label="Vorheriger Satz">${ic('caret-left')}</button>
              <button class="qring" type="button" data-quote-play aria-label="Pause">
                <svg class="qring__svg" viewBox="0 0 56 56" aria-hidden="true"><circle class="qring__bg" cx="28" cy="28" r="25"/><circle class="qring__fg" cx="28" cy="28" r="25" pathLength="100"/></svg>
                <span data-quote-icon>${ic('pause-f')}</span>
              </button>
              <button class="ctl-btn" type="button" data-quote-next aria-label="Nächster Satz">${ic('caret-right')}</button>
              <span class="quotes__count" data-quote-count></span>
            </div>
          </aside>
          <div class="quotes__stage" data-quote-stage aria-live="polite"></div>
        </div>
      </section>` : ''}

      <section class="section" aria-labelledby="h-news">
        <div class="wrap">
          <div class="sec-head reveal"><h2 id="h-news" class="display">Neuigkeiten</h2><a class="more-link" href="#/news">Alle Beiträge${ic('arrow-right')}</a></div>
          <div class="nr-grid" data-home-news>${homeNews()}</div>
        </div>
      </section>

      <section class="section section--tight" aria-labelledby="h-shop">
        <div class="wrap">
          <div class="shop-teaser reveal" data-tone="dark">
            <div><p class="eyebrow">Ränge</p><h2 id="h-shop" class="display">Zeig im Chat,<br><span>wer du bist.</span></h2>
              <p>Ränge bringen dir einen eigenen Chat-Tag, einen farbigen Namen, Kosmetik und mehr Coins – aber keine Vorteile im Kampf.</p>
              <div class="btn-row"><a class="btn btn--brand" href="#/raenge">Alle Ränge${ic('arrow-right', 'ic--move')}</a>${LINKS.store ? `<a class="btn btn--glass" href="${esc(LINKS.store)}" target="_blank" rel="noopener">${ic('shopping-cart')}Zum Shop</a>` : ''}</div></div>
            <div class="chat-box" aria-label="Beispiel aus dem Chat">${shopRanks.slice().reverse().map((x, i) => chatLine(x, ['Steve', 'Alex', 'Notchy', 'Lena', 'Max'][i % 5], ['gg', 'wer spielt BedWars?', 'Party auf!', 'erstes Bett 🛏', 'nice run'][i % 5])).join('')}</div>
          </div>
        </div>
      </section>

      <section class="section" aria-label="Civicy in Zahlen">
        <div class="wrap">
          <div class="numbers reveal">
            <div class="numbers__head"><p class="numbers__kicker">Live</p><h2>Civicy in Zahlen</h2></div>
            <div class="numbers__grid">
              <div class="num">${ic('users')}<b data-count="online">–</b><small>Gerade online</small></div>
              <div class="num">${brand('discord')}<b data-count="discord">–</b><small>Auf Discord</small></div>
              <div class="num">${ic('game-controller')}<b>${modes.length}</b><small>Spielmodi</small></div>
              <div class="num">${ic('cube')}<b>${esc(SERVER.version || '–')}</b><small>Version</small></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section section--tight" aria-labelledby="h-forum">
        <div class="wrap">
          <div class="sec-head reveal"><div><p class="eyebrow">Community</p><h2 id="h-forum" class="display">Neu im Forum</h2></div><a class="more-link" href="#/forum">Zum Forum${ic('arrow-right')}</a></div>
          <div class="thread-list reveal" data-home-forum>${loading()}</div>
        </div>
      </section>

      ${homeFaq.length ? `<section class="section" aria-labelledby="h-faq">
        <div class="wrap faq__wrap">
          <h2 id="h-faq" class="display faq__title reveal">Häufige Fragen</h2>
          <div class="faq-list reveal">${homeFaq.map((f, i) => faqItem(f, i === 0)).join('')}</div>
          <div class="reveal">${discordCard()}</div>
          <p class="reveal" style="margin-top:18px;text-align:center"><a class="more-link" href="#/faq">Alle Fragen${ic('arrow-right')}</a></p>
        </div>
      </section>` : ''}

      <section class="section section--tight" aria-labelledby="h-join">
        <div class="wrap">
          <div class="join__panel reveal" data-tone="dark">
            <div class="join__text">
              <p class="eyebrow">Karriere</p>
              <h2 id="h-join" class="display">Werde Teil<br>des Teams.</h2>
              <p>Hilf Spielern, jag Hacker, bau neue Maps oder programmier den nächsten Spielmodus.</p>
              <div class="tag-row"><span>Support</span><span>Moderation</span><span>Maps</span><span>Minigames</span></div>
            </div>
            <div class="join__actions">
              <a class="join__link" href="#/karriere"><span><b>Offene Stellen</b><small>Bewerbung in drei kurzen Schritten</small></span>${ic('arrow-right')}</a>
              <a class="join__link" href="#/team"><span><b>Das Team</b><small>Wer Civicy baut und betreibt</small></span>${ic('arrow-right')}</a>
              <a class="join__link" href="#/regeln"><span><b>Die Regeln</b><small>Damit jede Runde fair bleibt</small></span>${ic('arrow-right')}</a>
            </div>
          </div>
        </div>
      </section>
    </div>`;
  };
  const homeNews = () => {
    const latest = news.slice(0, 4);
    return latest.length ? `<div class="nr-list reveal">${latest.slice(1).map((p) => newsItem(p)).join('')}</div><div class="reveal">${bigNews(latest[0])}</div>` : '';
  };
  pages.home.mount = (root) => {
    loadStatus().then(() => { paintStatus(); countUp($('[data-count="online"]', root), status && status.online ? status.players : null); });
    loadDiscord().then((n) => countUp($('[data-count="discord"]', root), n));
    loadNews().then(() => { const box = $('[data-home-news]', root); if (box) { box.innerHTML = homeNews(); reveal(box); } });
    API.recent(5).then((list) => { const box = $('[data-home-forum]', root); if (box) box.innerHTML = list.length ? list.map(threadRow).join('') : '<p class="empty">Noch keine Themen – schreib das erste!</p>'; })
      .catch(() => { const box = $('[data-home-forum]', root); if (box) box.innerHTML = '<p class="empty">Das Forum ist gerade nicht erreichbar.</p>'; });
    glow(root);
    return quotes(root);
  };
  // Lichtschein folgt der Maus auf Karten
  const glow = (root) => $$('.mode', root).forEach((el) => el.addEventListener('pointermove', (e) => { const b = el.getBoundingClientRect(); el.style.setProperty('--mx', ((e.clientX - b.left) / b.width * 100) + '%'); el.style.setProperty('--my', ((e.clientY - b.top) / b.height * 100) + '%'); }));

  // ── Spielmodi ──
  const modeCard = (m) => `<a class="mode reveal" href="#/modi" data-mode="${esc(m.id)}" style="--c:${esc(m.color)}">
      <span class="mode__icon">${ic(m.icon)}</span>
      <span class="mode__size">${esc(m.size || '')}</span>
      <h3>${esc(m.name)}</h3><p>${esc(m.text)}</p>
      <span class="mode__tags">${(m.tags || []).map((t) => `<i>${esc(t)}</i>`).join('')}</span></a>`;
  pages.modi = () => `<div class="page">${pageHead('Spielmodi', 'Für jede Laune<br><span>der richtige Modus.</span>', `${modes.length} Spielmodi auf einem Server – erreichbar über den Kompass in der Lobby. Weitere sind in Arbeit.`, 'modes')}
      <div class="page-body"><div class="wrap">
        <div class="mode-list">${modes.map((m, i) => `<article class="mode-row reveal" id="modus-${esc(m.id)}" style="--c:${esc(m.color)}">
          <div class="mode-row__art">${scene('mode-' + m.id, m.color)}<span class="mode__icon mode__icon--lg">${ic(m.icon)}</span></div>
          <div class="mode-row__text"><p class="eyebrow" style="--brand-text:${esc(m.color)}">Modus ${String(i + 1).padStart(2, '0')}</p><h2 class="display">${esc(m.name)}</h2><p class="lead">${esc(m.text)}</p>
            <div class="mode__tags" style="margin-top:18px"><i>${ic('users')} ${esc(m.size || '')}</i>${(m.tags || []).map((t) => `<i>${esc(t)}</i>`).join('')}</div></div>
        </article>`).join('')}</div>
        <div class="notice reveal" style="margin-top:40px;align-items:center">${ic('lightbulb')}<p style="flex:1"><b>Ein Modus fehlt dir?</b> Schlag ihn im Forum vor – die beliebtesten Ideen bauen wir.</p><a class="btn btn--brand btn--sm" href="#/forum/vorschlaege">Vorschlagen</a></div>
      </div></div></div>`;
  pages.modi.mount = (root) => {
    const target = sessionStorage.getItem('civicy-mode');
    if (target) { sessionStorage.removeItem('civicy-mode'); const el = $('#modus-' + target, root); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500); }
  };

  // ── Neuigkeiten ──
  const newsMeta = (p) => `<div class="meta"><span class="tag" style="--c:${esc(catOf(p).color)}">${esc(catOf(p).name)}</span><span>${fmtShort(p.date)}</span><span>${readTime(p)} Min. Lesezeit</span></div>`;
  const newsItem = (p) => `<a class="nr-item" href="#/news/${slug(p.id)}">${newsMeta(p)}<h3>${esc(p.title)}</h3><p>${esc(p.teaser)}</p></a>`;
  const bigNews = (p) => `<a class="nr-big" href="#/news/${slug(p.id)}"><div class="cover">${coverOf(p)}</div><div class="nr-big__shade"></div><div class="nr-big__text">${newsMeta(p)}<h3>${esc(p.title)}</h3><p>${esc(p.teaser)}</p></div></a>`;
  const newsCard = (p) => `<a class="news-card reveal" href="#/news/${slug(p.id)}"><div class="news-card__pic"><div class="cover">${coverOf(p)}</div></div><div class="news-card__body">${newsMeta(p)}<h3>${esc(p.title)}</h3><p>${esc(p.teaser)}</p></div></a>`;
  // Knöpfe unter einer Neuigkeit: Discord, YouTube, Shop, Seite der Webseite oder beliebiger Link
  const newsButton = (b, i) => {
    const url = String(b.url || '');
    const internal = url.startsWith('#/');
    if (!internal && !/^https?:\/\//i.test(url)) return '';
    const br = /discord\.(gg|com)/i.test(url) ? 'discord' : /youtu\.?be/i.test(url) ? 'youtube' : /tiktok\.com/i.test(url) ? 'tiktok' : /twitch\.tv/i.test(url) ? 'twitch' : '';
    return `<a class="btn ${i === 0 ? 'btn--brand' : 'btn--ghost'}" href="${esc(url)}"${internal ? '' : ' target="_blank" rel="noopener"'}>${br ? brand(br) : ''}${esc(b.label || 'Mehr erfahren')}${br ? '' : ic(internal ? 'arrow-right' : 'arrow-up-right', 'ic--move')}</a>`;
  };

  let newsFilter = 'all';
  pages.news = () => `<div class="page">${pageHead('Neuigkeiten', 'Was gibt\'s<br><span>Neues?</span>', 'Updates, neue Spielmodi, Events und alles aus der Community – direkt vom Team.', 'news',
      isStaff() ? `<div class="btn-row"><button class="btn btn--brand" type="button" data-news-new>${ic('plus')}Neuigkeit schreiben</button></div>` : '')}
      <div class="page-body"><div class="wrap">
        <div class="filter" role="group" aria-label="Nach Kategorie filtern" data-news-filters></div>
        <div data-news-list>${loading()}</div>
      </div></div></div>`;
  pages.news.mount = (root) => {
    const paint = () => {
      const used = cats.filter((c) => news.some((p) => p.cat === c.id));
      $('[data-news-filters]', root).innerHTML = `<button class="chip" type="button" data-news-filter="all" aria-pressed="${newsFilter === 'all'}">Alle</button>` +
        used.map((c) => `<button class="chip" type="button" data-news-filter="${esc(c.id)}" aria-pressed="${newsFilter === c.id}">${esc(c.name)}</button>`).join('');
      const list = news.filter((p) => newsFilter === 'all' || p.cat === newsFilter);
      $('[data-news-list]', root).innerHTML = list.length
        ? `<div class="news-feature">${bigNews(list[0])}</div><div class="news-grid">${list.slice(1).map(newsCard).join('')}</div>`
        : '<p class="empty">Noch keine Beiträge in dieser Kategorie.</p>';
      reveal(root);
    };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-news-filter]'); if (b) { newsFilter = b.dataset.newsFilter; paint(); }
      if (e.target.closest('[data-news-new]')) newsEditor(null);
    });
    loadNews().then(paint);
  };

  pages.article = (id) => `<div class="page"><article class="article"><div class="wrap" data-article>${loading()}</div></article><div style="height:100px"></div></div>`;
  pages.article.mount = (root, id) => {
    loadNews().then(() => {
      const box = $('[data-article]', root);
      const p = news.find((x) => x.id === id);
      if (!box) return;
      if (!p) { box.innerHTML = `<a class="back-link" href="#/news">${ic('arrow-left')}Alle Neuigkeiten</a><h1 class="display">Diese Neuigkeit gibt es nicht (mehr).</h1>`; return; }
      document.title = `${p.title} – Civicy`;
      const author = findMember(p.author) || { name: p.author || 'Civicy' };
      const url = location.href;
      const more = news.filter((x) => x.id !== p.id).slice(0, 3);
      const body = Array.isArray(p.body) ? p.body : String(p.body || '').split(/\n+/);
      const buttons = (p.buttons || []).slice(0, 2).map(newsButton).join('');
      box.innerHTML = `<a class="back-link" href="#/news">${ic('arrow-left')}Alle Neuigkeiten</a>
        <header class="article__head">${newsMeta(p)}<h1>${esc(p.title)}</h1>
          <div class="article__by">${headImg(author, 40)}<span><a href="#/spieler/${slug(author.name)}" style="color:var(--ink);font-weight:700;text-decoration:none">${esc(author.name)}</a><br><small class="muted">${fmtDate(p.date)}${p.edited ? ' · bearbeitet' : ''}</small></span></div>
          ${p.custom && isStaff() ? `<div class="btn-row" style="margin-top:18px"><button class="btn btn--soft btn--sm" type="button" data-news-edit>${ic('pencil-simple')}Bearbeiten</button><button class="btn btn--danger btn--sm" type="button" data-news-delete>${ic('trash')}Löschen</button></div>` : ''}
        </header>
        <div class="article__pic"><div class="cover">${coverOf(p)}</div></div>
        <div class="article__body">${textBody(body)}
          ${buttons ? `<div class="btn-row article__btns">${buttons}</div>` : ''}
          <div class="share"><b>Teilen</b>
            <a class="round-btn" href="https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(p.title)}" target="_blank" rel="noopener" aria-label="Auf X teilen">${brand('x')}</a>
            <a class="round-btn" href="https://wa.me/?text=${encodeURIComponent(p.title + ' ' + url)}" target="_blank" rel="noopener" aria-label="Über WhatsApp teilen">${brand('whatsapp')}</a>
            <a class="round-btn" href="https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(p.title)}" target="_blank" rel="noopener" aria-label="Auf Reddit teilen">${brand('reddit')}</a>
            <button class="round-btn" type="button" data-copy-link aria-label="Link kopieren">${ic('link')}</button>
            ${navigator.share ? `<button class="round-btn" type="button" data-share aria-label="Teilen">${ic('share-network')}</button>` : ''}
          </div>
        </div>
        ${more.length ? `<h2 class="h2-sm">Weitere Neuigkeiten</h2><div class="news-grid">${more.map(newsCard).join('')}</div>` : ''}`;
      reveal(box);
      box.onclick = (e) => {
        if (e.target.closest('[data-copy-link]')) copy(location.href).then(() => toast('Link kopiert'));
        if (e.target.closest('[data-share]')) navigator.share({ title: p.title, text: p.teaser, url: location.href }).catch(() => {});
        if (e.target.closest('[data-news-edit]')) newsEditor(p);
        if (e.target.closest('[data-news-delete]')) confirmBox('Neuigkeit löschen?', `„${p.title}“ wird für alle entfernt.`, 'Löschen').then((ok) => {
          if (ok) API.deleteNews(p.id).then(() => { toast('Neuigkeit gelöscht'); loadNews(true); location.hash = '#/news'; }).catch((err) => toast(err.message, 'warning'));
        });
      };
    });
  };
  pages.article.title = (id) => (news.find((x) => x.id === id) || {}).title || 'Neuigkeit';

  // Editor für Neuigkeiten (nur Team)
  function newsEditor(p) {
    const n = p || { cat: cats[0] && cats[0].id, buttons: [] };
    const btn = (i) => (n.buttons || [])[i] || {};
    const body = Array.isArray(n.body) ? n.body.join('\n') : (n.body || '');
    openModal(p ? 'Neuigkeit bearbeiten' : 'Neuigkeit schreiben', `<form class="form" data-news-form novalidate>
        <label class="field"><span>Titel</span><input class="input" name="title" maxlength="120" required value="${esc(n.title || '')}"></label>
        <div class="form-grid">
          <label class="field"><span>Kategorie</span><select class="select" name="cat">${cats.map((c) => `<option value="${esc(c.id)}"${c.id === n.cat ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
          <label class="field"><span>Bild <small>(Link, optional)</small></span><input class="input" name="image" type="url" placeholder="https://…" value="${esc(n.image || '')}"></label>
        </div>
        <label class="field"><span>Kurztext <small>(für die Übersicht)</small></span><textarea class="textarea" name="teaser" maxlength="300" style="min-height:80px">${esc(n.teaser || '')}</textarea></label>
        <label class="field"><span>Text</span><small class="field__hint">Eine Zeile pro Absatz. „## “ am Anfang = Zwischenüberschrift, „- “ = Liste.</small><textarea class="textarea" name="body" maxlength="8000" style="min-height:180px">${esc(body)}</textarea></label>
        <fieldset class="fieldset"><legend>Knöpfe unter der Neuigkeit <small>(optional, bis zu 2)</small></legend>
          ${[0, 1].map((i) => `<div class="form-grid"><label class="field"><span>Beschriftung ${i + 1}</span><input class="input" name="b${i}label" maxlength="40" placeholder="${i ? 'z. B. Video ansehen' : 'z. B. Discord beitreten'}" value="${esc(btn(i).label || '')}"></label>
            <label class="field"><span>Link ${i + 1}</span><input class="input" name="b${i}url" placeholder="https://… oder #/forum" value="${esc(btn(i).url || '')}"></label></div>`).join('')}
        </fieldset>
        <p class="field__err" data-err hidden></p>
        <div class="wizard__actions"><button class="btn btn--ghost" type="button" data-modal-close>Abbrechen</button><button class="btn btn--brand" type="submit">${ic('paper-plane-tilt')}${p ? 'Speichern' : 'Veröffentlichen'}</button></div>
      </form>`, (box) => {
      $('[data-news-form]', box).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const err = (m) => { const el = $('[data-err]', f); el.textContent = m; el.hidden = !m; };
        const buttons = [0, 1].map((i) => ({ label: f[`b${i}label`].value.trim(), url: f[`b${i}url`].value.trim() })).filter((b) => b.url);
        if (buttons.some((b) => !/^(https?:\/\/|#\/)/i.test(b.url))) return err('Links müssen mit https:// oder #/ beginnen.');
        if (f.image.value && !/^https:\/\//i.test(f.image.value.trim())) return err('Das Bild muss ein https-Link sein.');
        const item = { id: p && p.id, title: f.title.value.trim(), cat: f.cat.value, teaser: f.teaser.value.trim(), body: f.body.value.split('\n').map((l) => l.trim()).filter(Boolean), image: f.image.value.trim(), buttons };
        if (item.title.length < 4) return err('Der Titel braucht mindestens 4 Zeichen.');
        if (!item.body.length) return err('Bitte schreib einen Text.');
        if (!item.teaser) item.teaser = item.body.find((l) => !l.startsWith('#') && !l.startsWith('- ')) || '';
        const sb = $('button[type=submit]', f); sb.disabled = true;
        API.saveNews(item).then((saved) => {
          closeModal(); toast(p ? 'Gespeichert' : 'Neuigkeit veröffentlicht');
          loadNews(true).then(() => { const target = '#/news/' + slug(saved.id || item.id); if (location.hash === target) render(); else location.hash = target; });
        }).catch((x) => { sb.disabled = false; err(x.message); });
      });
    });
  }

  function countUp(el, n) {
    if (!el) return;
    if (n == null) { el.textContent = '–'; return; }
    if (prefersReduced) { el.textContent = fmtNum(n); return; }
    const t0 = performance.now(), dur = 1200;
    const step = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = fmtNum(Math.round(n * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // Sätze aus dem Team: Ring füllt sich, bis der nächste Satz kommt
  function quotes(root) {
    const box = $('[data-quotes]', root);
    const list = DATA.quotes || [];
    if (!box || !list.length) return null;
    let i = 0, p = 0, playing = !prefersReduced, last = performance.now(), raf;
    const DUR = 7000;
    const ring = $('.qring__fg', box);
    const show = () => {
      const qq = list[i];
      const member = findMember(qq.by);
      $('[data-quote-stage]', box).innerHTML = `<p class="quote">${esc(qq.text)}</p>`;
      $('[data-quote-by]', box).innerHTML = `${member ? headImg(member, 44, '', '') : '<img src="assets/img/logo-sm.webp" alt="" width="44" height="36" style="object-fit:contain;image-rendering:auto">'}<span><b>@${esc(qq.by)}</b><small>${esc(qq.role || '')}</small></span>`;
      $('[data-quote-count]', box).innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b> / ${String(list.length).padStart(2, '0')}`;
      p = 0;
    };
    const go = (d) => { i = (i + d + list.length) % list.length; show(); };
    const setPlay = (v) => {
      playing = v;
      $('[data-quote-icon]', box).innerHTML = ic(v ? 'pause-f' : 'play-f');
      $('[data-quote-play]', box).setAttribute('aria-label', v ? 'Pause' : 'Abspielen');
    };
    const loop = (t) => {
      const dt = t - last; last = t;
      if (playing && !document.hidden) { p += dt / DUR; if (p >= 1) go(1); }
      ring.style.strokeDashoffset = String(100 - p * 100);
      raf = requestAnimationFrame(loop);
    };
    $('[data-quote-prev]', box).onclick = () => go(-1);
    $('[data-quote-next]', box).onclick = () => go(1);
    $('[data-quote-play]', box).onclick = () => setPlay(!playing);
    show(); setPlay(playing);
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }


  // ── Regeln ──
  pages.regeln = () => {
    let n = 0;
    return `<div class="page">${pageHead('Regeln', 'Fair spielen.<br><span>Gemeinsam bauen.</span>', 'Damit Civicy für alle ein guter Ort bleibt. Mit dem Betreten des Servers und des Discords akzeptierst du diese Regeln.', 'rules')}
      <div class="page-body"><div class="wrap wrap--narrow">
        <div class="notice reveal" style="margin-bottom:34px">${ic('info')}<p><b>Kurz gesagt:</b> Sei respektvoll, spiel ohne Cheats und ohne Teaming. Im Zweifel frag das Team – lieber einmal zu viel als einmal zu wenig.</p></div>
        <div class="rules">
          ${(DATA.rules || []).map((g) => `<section class="rule-group reveal"><h2>${ic(g.icon || 'scroll')}${esc(g.title)}</h2><ol class="rule-list">
            ${g.items.map(([t, d]) => `<li class="rule"><span class="rule__n">§${++n}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></li>`).join('')}
          </ol></section>`).join('')}
        </div>
        <div class="notice notice--warn reveal" style="margin-top:34px">${ic('warning')}<p><b>Verstöße</b> werden je nach Schwere mit einer Verwarnung, einem Mute, einem zeitweisen oder dauerhaften Bann bestraft. Das Team entscheidet im Einzelfall – auch über Dinge, die hier nicht ausdrücklich stehen. Einspruch kannst du auf Discord einlegen.</p></div>
      </div></div></div>`;
  };


  // ── Ränge ──
  pages.raenge = () => {
    const me = AUTH.user;
    const mine = me ? me.rank : null;
    const name = me ? me.name : 'Steve';
    const store = LINKS.store;
    const shopCard = (r) => `<article class="rank-card reveal${r.id === mine ? ' is-mine' : ''}" style="--c:${esc(r.color)}">
        ${r.id === mine ? '<span class="rank-card__mine">Dein Rang</span>' : ''}
        <div class="rank-card__top">${rankBadge(r)}${r.price ? `<span class="rank-card__price">${esc(r.price)}</span>` : ''}</div>
        <h3>${esc(r.name)}</h3><p>${esc(r.desc || '')}</p>
        ${chatLine(r, name)}
        ${r.perks ? `<ul>${r.perks.map((x) => `<li>${ic('check')}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}
        ${r.buy ? (store ? `<a class="btn btn--brand btn--block rank-card__buy" href="${esc(store)}" target="_blank" rel="noopener">${ic('shopping-cart')}Im Shop kaufen</a>` : `<button class="btn btn--soft btn--block rank-card__buy" type="button" disabled>${ic('shopping-cart')}Shop öffnet bald</button>`) : ''}
      </article>`;
    const teamCard = (r) => `<article class="rank-card rank-card--small reveal${r.id === mine ? ' is-mine' : ''}" style="--c:${esc(r.color)}">
        ${r.id === mine ? '<span class="rank-card__mine">Dein Rang</span>' : ''}
        <div class="rank-card__top">${rankBadge(r)}</div><h3>${esc(r.name)}</h3><p>${esc(r.desc || '')}</p>${chatLine(r, name)}</article>`;
    const def = ranks.find((r) => r.default);
    return `<div class="page">${pageHead('Ränge', 'Dein Tag.<br><span>Dein Auftritt.</span>', 'Ränge geben dir einen eigenen Chat-Tag, einen farbigen Namen, Kosmetik und mehr Coins. Spielvorteile gibt es keine – in den Runden sind alle gleich.', 'ranks',
        store ? `<div class="btn-row"><a class="btn btn--brand" href="${esc(store)}" target="_blank" rel="noopener">${ic('shopping-cart')}Zum Shop</a></div>` : '')}
      <div class="page-body"><div class="wrap">
        <div class="chat-box chat-box--wide reveal" aria-label="So sehen die Ränge im Chat aus">${shopRanks.map((r) => chatLine(r, name, 'gg wp')).join('')}${def ? chatLine(def, 'Spieler123', 'gg') : ''}</div>
        <h2 class="h2-sm reveal">Ränge im Shop</h2>
        <div class="rank-grid">${shopRanks.map(shopCard).join('')}${def ? shopCard(def) : ''}</div>
        <h2 class="h2-sm reveal">Team &amp; Sonderränge</h2>
        <div class="rank-grid">${ranks.filter((r) => !r.buy && !r.default).map(teamCard).join('')}</div>
        <div class="notice reveal" style="margin-top:34px">${ic('info')}<p><b>Nach dem Kauf</b> hast du den Rang sofort im Spiel. Auf der Webseite erscheint er, sobald du dich mit deinem Minecraft-Konto anmeldest. Ränge sind an dein Konto gebunden und nicht übertragbar.</p></div>
        ${!me ? `<div class="notice reveal" style="margin-top:14px;align-items:center">${ic('user-circle')}<p style="flex:1">Melde dich an, um deinen Rang und deinen Namen in der Vorschau zu sehen.</p><button class="btn btn--brand btn--sm" type="button" data-login>Anmelden</button></div>` : ''}
      </div></div></div>`;
  };

  // ── Team ──
  pages.team = () => {
    const groups = [];
    staffRanks.forEach((r) => { const g = r.group || r.name; if (!groups.includes(g)) groups.push(g); });
    const lead = groups.map((g) => {
      const members = team.filter((m) => (rankOf(m.rank).group || rankOf(m.rank).name) === g);
      if (!members.length) return '';
      return `<section class="team-group"><h2 class="team-group__title reveal">${esc(g)}<small>${members.length} ${members.length === 1 ? 'Person' : 'Personen'}</small></h2>
        <div class="team-grid">${members.map(memberCard).join('')}</div></section>`;
    }).join('');
    return `<div class="page">${pageHead('Das Team', 'Lerne das<br><span>Team kennen.</span>', 'Die Menschen hinter Civicy – von der Leitung über Entwicklung und Bau bis zum Support. Tippe auf eine Person für ihr Profil.', 'team')}
      <div class="page-body"><div class="wrap">${lead || '<p class="empty">Das Team stellt sich bald vor.</p>'}
        <div class="notice reveal" style="margin-top:48px;align-items:center">${ic('rocket-launch')}<p style="flex:1"><b>Lust mitzumachen?</b> Wir suchen gerade Verstärkung.</p><a class="btn btn--brand btn--sm" href="#/karriere">Offene Stellen</a></div>
      </div></div></div>`;
  };
  const memberCard = (m) => {
    const r = rankOf(m.rank);
    return `<a class="member reveal" href="#/spieler/${slug(m.name)}" style="--c:${esc(r.color)}">
      ${bodyImg(m, 150, 'member__body')}<b>${esc(m.name)}</b><small>${esc(m.role || r.name)}</small>${rankBadge(r)}</a>`;
  };

  // ── Spielerprofil (#/spieler/<Name>) ──
  pages.spieler = (name) => `<div class="page"><div class="page-head page-head--slim">${pixelsDeco('p' + name, 10)}<div class="wrap"><a class="back-link" href="javascript:history.back()">${ic('arrow-left')}Zurück</a></div></div>
      <div class="page-body" style="padding-top:10px"><div class="wrap" data-profile>${loading('Profil wird geladen …')}</div></div></div>`;
  pages.spieler.title = (name) => name;
  pages.spieler.mount = (root, name) => {
    const box = $('[data-profile]', root);
    API.player(name).then((p) => {
      if (!box.isConnected) return;
      if (!p) { box.innerHTML = `<div class="empty">Einen Minecraft-Spieler namens <b>${esc(name)}</b> gibt es nicht.</div>`; return; }
      const m = findMember(p.name);
      const r = rankOf(p.rank || (m && m.rank));
      const me = AUTH.user && AUTH.user.name.toLowerCase() === p.name.toLowerCase();
      document.title = `${p.name} – Civicy`;
      box.innerHTML = `<div class="profile">
          <aside class="profile__card" style="--c:${esc(r.color)}">
            ${skin3d(p, 240, 320, 'profile__skin')}
            <h1>${esc(p.name)}</h1>${rankBadge(r, true)}${m && m.role ? `<p class="muted">${esc(m.role)}</p>` : ''}
            ${chatLine(r, p.name)}
            ${me ? `<a class="btn btn--soft btn--sm" href="#/konto">${ic('user-circle')}Mein Konto</a>` : ''}
          </aside>
          <div>
            <div class="facts">
              <div class="fact"><small>Rang</small><b>${esc(r.name)}</b></div>
              <div class="fact"><small>${m ? 'Im Team seit' : 'Auf der Webseite seit'}</small><b>${m && m.since ? fmtDate(m.since) : p.since ? fmtDate(p.since) : '–'}</b></div>
              <div class="fact"><small>Beiträge im Forum</small><b>${fmtNum(p.posts || 0)}</b></div>
              <div class="fact"><small>Minecraft-UUID</small>${p.uuid ? `<button class="uuid" type="button" data-copy="${esc(p.uuid)}" title="Kopieren"><span>${esc(p.uuid)}</span>${ic('copy')}</button>` : '<b>–</b>'}</div>
            </div>
            ${m && (m.about || m.langs) ? `<section class="block"><h2>Über ${esc(p.name)}</h2><p>${esc(m.about || r.desc || '')}</p>${m.langs ? `<p class="muted" style="margin-top:10px">${ic('translate')} ${esc(m.langs.join(', '))}</p>` : ''}</section>` : ''}
            <section class="block"><h2>Themen im Forum</h2>${(p.threads || []).length ? `<div class="thread-list thread-list--flat">${p.threads.map(threadRow).join('')}</div>` : `<p class="muted">${esc(p.name)} hat noch kein Thema erstellt.</p>`}</section>
            ${!p.known ? `<p class="muted" style="margin-top:14px;font-size:14px">${esc(p.name)} war noch nicht auf der Webseite angemeldet – Rang und Beiträge erscheinen nach der ersten Anmeldung.</p>` : ''}
          </div>
        </div>`;
      mountSkins(box);
      reveal(box);
    }).catch((e) => { box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; });
  };

  // ── Forum ──
  const authorRank = (a) => rankOf(a && a.rank);
  const threadRow = (t) => {
    const c = forumCat(t.cat) || { name: '', color: '#5CE1FF' };
    return `<a class="thread" href="#/forum/t/${slug(t.id)}">
      ${headImg(t.author, 40, 'thread__head', '')}
      <span class="thread__main">
        <b class="thread__title">${t.pinned ? `<span class="thread__flag" title="Angeheftet">${ic('push-pin-f')}</span>` : ''}${t.locked ? `<span class="thread__flag" title="Geschlossen">${ic('lock-key-f')}</span>` : ''}${esc(t.title)}</b>
        <small><span class="tag" style="--c:${esc(c.color)}">${esc(c.name)}</span> von <span style="color:${esc(authorRank(t.author).color)}">${esc(t.author.name)}</span> · ${ago(t.created)}</small>
      </span>
      <span class="thread__stats"><b>${fmtNum(t.replies || 0)}</b><small>Antworten</small></span>
      <span class="thread__last">${t.last ? `<small>${esc(t.last.name)}</small><small>${ago(t.last.at)}</small>` : ''}</span>
    </a>`;
  };
  const loginPrompt = (text) => `<div class="notice" style="align-items:center">${ic('user-circle')}<p style="flex:1">${esc(text)}</p><button class="btn btn--brand btn--sm" type="button" data-login>Anmelden</button></div>`;

  pages.forum = () => `<div class="page">${pageHead('Forum', 'Reden wir<br><span>drüber.</span>', 'Fragen, Taktiken, Vorschläge und Bug-Reports – hier trifft sich die Community. Zum Schreiben meldest du dich mit deinem Minecraft-Konto an.', 'forum')}
      <div class="page-body"><div class="wrap">
        ${API.live ? '' : `<div class="notice notice--warn" style="margin-bottom:24px">${ic('info')}<p><b>Demo-Modus:</b> Solange das Backend nicht eingerichtet ist, werden Themen nur in diesem Browser gespeichert.</p></div>`}
        <div class="forum-cats" data-forum-cats>${forumCats.map((c) => catCard(c, null)).join('')}</div>
        <h2 class="h2-sm">Neueste Themen</h2>
        <div class="thread-list" data-forum-recent>${loading()}</div>
      </div></div></div>`;
  const catCard = (c, s) => `<a class="forum-cat reveal" href="#/forum/${slug(c.id)}" style="--c:${esc(c.color)}">
      <span class="forum-cat__icon">${ic(c.icon || 'chats')}</span>
      <span class="forum-cat__main"><b>${esc(c.name)}${c.staffOnly ? ` <span class="forum-cat__lock" title="Nur das Team erstellt Themen">${ic('lock-key-f')}</span>` : ''}</b><small>${esc(c.desc || '')}</small></span>
      <span class="forum-cat__stats"><b>${s ? fmtNum(s.threads) : '–'}</b><small>Themen</small></span>
      <span class="forum-cat__stats"><b>${s ? fmtNum(s.posts) : '–'}</b><small>Beiträge</small></span>
      <span class="forum-cat__last">${s && s.last ? `<small class="forum-cat__last-title">${esc(s.last.title)}</small><small>${esc(s.last.name || '')} · ${ago(s.last.at)}</small>` : '<small>Noch keine Themen</small>'}</span>
    </a>`;
  pages.forum.mount = (root) => {
    API.categories().then((list) => {
      const box = $('[data-forum-cats]', root); if (!box) return;
      box.innerHTML = forumCats.map((c) => catCard(c, list.find((x) => x.id === c.id))).join('');
      reveal(box);
    }).catch(() => {});
    API.recent(8).then((list) => { const box = $('[data-forum-recent]', root); if (box) box.innerHTML = list.length ? list.map(threadRow).join('') : '<p class="empty">Noch keine Themen.</p>'; })
      .catch((e) => { const box = $('[data-forum-recent]', root); if (box) box.innerHTML = `<p class="empty">${esc(e.message)}</p>`; });
  };

  pages.forumCat = (id) => {
    const c = forumCat(id);
    if (!c) return notFound('Diese Kategorie gibt es nicht.');
    const canPost = AUTH.user && (!c.staffOnly || isStaff());
    return `<div class="page">${pageHead('Forum', esc(c.name) + '.', esc(c.desc || ''), 'fc' + id,
        `<div class="btn-row">${AUTH.user ? (canPost ? `<a class="btn btn--brand" href="#/forum/${slug(id)}/neu">${ic('plus')}Neues Thema</a>` : '') : `<button class="btn btn--brand" type="button" data-login>${ic('plus')}Anmelden, um zu schreiben</button>`}<a class="btn btn--ghost" href="#/forum">${ic('arrow-left')}Alle Kategorien</a></div>`)}
      <div class="page-body"><div class="wrap"><div class="thread-list" data-threads>${loading()}</div><div class="pager" data-pager></div></div></div></div>`;
  };
  pages.forumCat.title = (id) => (forumCat(id) || {}).name || 'Forum';
  pages.forumCat.mount = (root, id) => {
    if (!forumCat(id)) return;
    let page = 1;
    const load = () => API.list(id, page).then((r) => {
      const box = $('[data-threads]', root); if (!box) return;
      box.innerHTML = r.threads.length ? r.threads.map(threadRow).join('') : '<p class="empty">Hier gibt es noch keine Themen.</p>';
      const pages = Math.ceil(r.total / 20);
      $('[data-pager]', root).innerHTML = pages > 1 ? Array.from({ length: pages }, (_, i) => `<button class="chip" type="button" data-page-n="${i + 1}" aria-pressed="${i + 1 === page}">${i + 1}</button>`).join('') : '';
    }).catch((e) => { $('[data-threads]', root).innerHTML = `<p class="empty">${esc(e.message)}</p>`; });
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-page-n]'); if (b) { page = +b.dataset.pageN; load(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    load();
  };

  pages.forumNew = (id) => {
    const c = forumCat(id);
    if (!c) return notFound('Diese Kategorie gibt es nicht.');
    return `<div class="page">${pageHead(c.name, 'Neues Thema.', '', 'fn' + id)}
      <div class="page-body"><div class="wrap wrap--narrow"><a class="back-link" href="#/forum/${slug(id)}">${ic('arrow-left')}Zurück zu ${esc(c.name)}</a>
        <div class="block" style="padding:clamp(22px,4vw,36px)" data-new-thread></div></div></div></div>`;
  };
  pages.forumNew.title = () => 'Neues Thema';
  pages.forumNew.mount = (root, id) => {
    const c = forumCat(id); if (!c) return;
    const box = $('[data-new-thread]', root);
    const draftKey = 'civicy-draft-' + id;
    const paint = () => {
      const u = AUTH.user;
      if (!u) { box.innerHTML = loginPrompt('Zum Schreiben meldest du dich mit deinem Minecraft-Konto an.'); return; }
      if (c.staffOnly && !isStaff()) { box.innerHTML = `<p class="empty">In „${esc(c.name)}“ erstellt nur das Team neue Themen.</p>`; return; }
      const d = store.get(draftKey, {});
      box.innerHTML = `<div class="auth__who" style="margin-bottom:22px">${headImg(u, 40, '', '')}<span><small class="muted">Du schreibst als</small><b>${esc(u.name)}</b></span>${rankBadge(AUTH.rank(u))}</div>
        <form class="form" data-thread-form novalidate>
          <label class="field"><span>Titel</span><input class="input" name="title" maxlength="120" required placeholder="Worum geht es?" value="${esc(d.title || '')}"></label>
          <label class="field"><span>Text</span><textarea class="textarea" name="body" maxlength="5000" required style="min-height:220px" placeholder="Beschreib dein Anliegen. Bei Bugs: Was ist passiert, in welchem Modus, und wie kann man es nachstellen?">${esc(d.body || '')}</textarea></label>
          <p class="field__err" data-err hidden></p>
          <div class="wizard__actions"><a class="btn btn--ghost" href="#/forum/${slug(id)}">Abbrechen</a><button class="btn btn--brand" type="submit">${ic('paper-plane-tilt')}Thema erstellen</button></div>
        </form>`;
      const f = $('form', box);
      f.addEventListener('input', () => store.set(draftKey, { title: f.title.value, body: f.body.value }));
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const err = (m) => { const el = $('[data-err]', f); el.textContent = m; el.hidden = !m; };
        const b = $('button[type=submit]', f); b.disabled = true;
        API.createThread(id, f.title.value, f.body.value).then((t) => {
          try { localStorage.removeItem(draftKey); } catch (x) {}
          toast('Thema erstellt'); location.hash = '#/forum/t/' + slug(t.id);
        }).catch((x) => { b.disabled = false; err(x.message); });
      });
    };
    paint();
    return AUTH.onChange(paint);
  };

  pages.thread = (id) => `<div class="page"><div class="page-head page-head--slim">${pixelsDeco('t' + id, 10)}<div class="wrap" data-thread-head></div></div>
      <div class="page-body" style="padding-top:10px"><div class="wrap wrap--mid" data-thread>${loading()}</div></div></div>`;
  pages.thread.title = () => 'Forum';
  pages.thread.mount = (root, id) => {
    const box = $('[data-thread]', root);
    const head = $('[data-thread-head]', root);
    const post = (p, i, t) => {
      const r = authorRank(p.author);
      const u = AUTH.user;
      const own = u && u.name.toLowerCase() === p.author.name.toLowerCase();
      return `<article class="post${i === 0 ? ' post--first' : ''}" id="post-${esc(p.id)}" style="--c:${esc(r.color)}">
        <aside class="post__author"><a href="#/spieler/${slug(p.author.name)}">${headImg(p.author, 56, 'post__head', '')}</a>
          <a class="post__name" href="#/spieler/${slug(p.author.name)}" style="color:${esc(r.color)}">${esc(p.author.name)}</a>${rankBadge(r)}</aside>
        <div class="post__main">
          <div class="post__meta"><span>${ago(p.created)}${p.edited ? ' · bearbeitet' : ''}</span>${i === 0 ? '' : `<a href="#/forum/t/${slug(t.id)}" data-anchor="post-${esc(p.id)}">#${i + 1}</a>`}</div>
          <div class="post__body" data-body>${richText(p.body)}</div>
          ${(own || isStaff()) ? `<div class="post__actions"><button type="button" data-edit="${esc(p.id)}">${ic('pencil-simple')}Bearbeiten</button><button type="button" data-del="${esc(p.id)}">${ic('trash')}Löschen</button></div>` : ''}
        </div></article>`;
    };
    let current = null;
    const load = (scrollTo) => API.thread(id).then((r) => {
      if (!box.isConnected) return;
      if (!r) { head.innerHTML = ''; box.innerHTML = `<div class="empty">Dieses Thema gibt es nicht (mehr). <a href="#/forum">Zum Forum</a></div>`; return; }
      current = r;
      const t = r.thread;
      const c = forumCat(t.cat) || { id: t.cat, name: 'Forum', color: '#5CE1FF' };
      document.title = `${t.title} – Forum – Civicy`;
      head.innerHTML = `<a class="back-link" href="#/forum/${slug(c.id)}">${ic('arrow-left')}${esc(c.name)}</a>
        <h1 class="thread-title">${t.pinned ? ic('push-pin-f') : ''}${t.locked ? ic('lock-key-f') : ''}${esc(t.title)}</h1>
        <p class="meta"><span class="tag" style="--c:${esc(c.color)}">${esc(c.name)}</span><span>${fmtNum(t.replies || 0)} Antworten</span><span>${fmtNum(t.views || 0)} Aufrufe</span></p>
        ${isStaff() ? `<div class="btn-row" style="margin-top:16px"><button class="btn btn--soft btn--sm" type="button" data-mod="pinned">${ic('push-pin')}${t.pinned ? 'Lösen' : 'Anheften'}</button><button class="btn btn--soft btn--sm" type="button" data-mod="locked">${ic('lock-key')}${t.locked ? 'Öffnen' : 'Schließen'}</button></div>` : ''}`;
      const u = AUTH.user;
      box.innerHTML = `<div class="posts">${r.posts.map((p, i) => post(p, i, t)).join('')}</div>
        <div class="reply" data-reply>${t.locked && !isStaff() ? `<div class="notice">${ic('lock-key')}<p>Dieses Thema ist geschlossen.</p></div>`
          : u ? `<form class="form" data-reply-form novalidate><div class="reply__head">${headImg(u, 32, '', '')}<b>Antworten als ${esc(u.name)}</b></div>
              <textarea class="textarea" name="body" maxlength="5000" required placeholder="Deine Antwort …"></textarea><p class="field__err" data-err hidden></p>
              <div class="wizard__actions" style="margin-top:0;justify-content:flex-end"><button class="btn btn--brand" type="submit">${ic('paper-plane-tilt')}Antworten</button></div></form>`
          : loginPrompt('Melde dich an, um zu antworten.')}</div>`;
      if (scrollTo) { const el = document.getElementById(scrollTo); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }).catch((e) => { box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; });

    root.addEventListener('submit', (e) => {
      const f = e.target.closest('[data-reply-form]');
      if (!f) return;
      e.preventDefault();
      const err = (m) => { const el = $('[data-err]', f); el.textContent = m; el.hidden = !m; };
      const b = $('button[type=submit]', f); b.disabled = true;
      API.reply(id, f.body.value).then((p) => { toast('Antwort gesendet'); load('post-' + p.id); }).catch((x) => { b.disabled = false; err(x.message); });
    });
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-anchor]');
      if (a) { e.preventDefault(); const el = document.getElementById(a.dataset.anchor); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const m = e.target.closest('[data-mod]');
      if (m && current) { const k = m.dataset.mod; API.moderate(id, { [k]: !current.thread[k] }).then(() => load()).catch((x) => toast(x.message, 'warning')); return; }
      const ed = e.target.closest('[data-edit]');
      if (ed && current) {
        const p = current.posts.find((x) => String(x.id) === ed.dataset.edit);
        const art = ed.closest('.post');
        $('[data-body]', art).innerHTML = `<form class="form" data-edit-form><textarea class="textarea" name="body" maxlength="5000">${esc(p.body)}</textarea><p class="field__err" data-err hidden></p><div class="btn-row" style="margin-top:0"><button class="btn btn--brand btn--sm" type="submit">Speichern</button><button class="btn btn--ghost btn--sm" type="button" data-edit-cancel>Abbrechen</button></div></form>`;
        const f = $('[data-edit-form]', art);
        f.onsubmit = (ev) => { ev.preventDefault(); API.editPost(p.id, f.body.value).then(() => { toast('Gespeichert'); load(); }).catch((x) => { const el = $('[data-err]', f); el.textContent = x.message; el.hidden = false; }); };
        $('[data-edit-cancel]', f).onclick = () => load();
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del && current) {
        const first = String(current.posts[0].id) === del.dataset.del;
        confirmBox(first ? 'Thema löschen?' : 'Beitrag löschen?', first ? 'Der erste Beitrag gehört zum Thema – das ganze Thema mit allen Antworten wird gelöscht.' : 'Der Beitrag wird für alle entfernt.', 'Löschen').then((ok) => {
          if (!ok) return;
          API.deletePost(del.dataset.del).then((r) => {
            toast(first ? 'Thema gelöscht' : 'Beitrag gelöscht');
            if (first || (r && r.deletedThread)) location.hash = '#/forum/' + slug(current.thread.cat); else load();
          }).catch((x) => toast(x.message, 'warning'));
        });
      }
    });
    load();
    return AUTH.onChange(() => load());
  };

  // ── FAQ ──
  pages.faq = () => `<div class="page">${pageHead('Hilfe', 'Fragen,<br><span>beantwortet.</span>', 'Alles Wichtige zu Civicy, zum Beitreten, zu den Spielmodi, zu Rängen und zur Anmeldung.', 'faq')}
      <div class="page-body"><div class="wrap wrap--narrow">
        <div class="faq-list">${(DATA.faq || []).map((f, i) => faqItem(f, i === 0)).join('')}</div>${discordCard()}
      </div></div></div>`;

  // ── Karriere ──
  pages.karriere = () => {
    const depts = [];
    jobs.forEach((j) => { if (!depts.includes(j.dept)) depts.push(j.dept); });
    const openCount = jobs.filter((j) => j.open).length;
    return `<div class="page">${pageHead('Karriere', 'Bau Civicy<br><span>mit uns.</span>', `Wir suchen Menschen, die Lust haben, mit uns das beste deutsche Minigame-Netzwerk zu bauen. Gerade ${openCount === 1 ? 'ist eine Stelle' : `sind ${openCount} Stellen`} offen.`, 'career')}
      <div class="page-body"><div class="wrap">
        <div class="jobs">
          ${depts.map((d) => { const list = jobs.filter((j) => j.dept === d); const o = list.filter((j) => j.open).length; return `<section class="job-dept reveal"><h2>${esc(d)}<small>${o} ${o === 1 ? 'Stelle' : 'Stellen'} offen</small></h2><div>
            ${list.map((j) => `<a class="job" href="#/karriere/${slug(j.id)}"><div class="job__text"><b>${esc(j.title)}</b><p>${esc(j.teaser)}</p></div><span class="job__state${j.open ? '' : ' is-closed'}">${j.open ? 'Offen' : 'Geschlossen'}</span>${ic('caret-right')}</a>`).join('')}
          </div></section>`; }).join('')}
          <section class="flow reveal"><h2>So läuft es ab</h2>
            <p><b>1.</b> Du suchst dir eine Stelle aus und liest Aufgaben und Anforderungen in Ruhe durch.</p>
            <p><b>2.</b> Du meldest dich mit deinem Minecraft-Konto an und beantwortest ein paar kurze Fragen.</p>
            <p><b>3.</b> Das Team liest jede Bewerbung und meldet sich innerhalb von 7 Tagen auf Discord.</p>
          </section>
        </div>
      </div></div></div>`;
  };
  pages.job = (id) => {
    const j = jobs.find((x) => x.id === id);
    if (!j) return notFound('Diese Stelle gibt es nicht (mehr).');
    return `<div class="page">${pageHead(j.dept, esc(j.title) + '.', esc(j.teaser), 'job' + j.id, `<div style="margin-top:22px"><span class="job__state${j.open ? '' : ' is-closed'}">${j.open ? 'Bewerbung offen' : 'Bewerbung gerade geschlossen'}</span></div>`)}
      <div class="page-body"><div class="wrap">
        <a class="back-link" href="#/karriere">${ic('arrow-left')}Alle Stellen</a>
        <div class="job-page">
          <div>
            <h2 style="margin-top:0">Deine Aufgaben</h2><ul class="checklist">${j.tasks.map((t) => `<li>${ic('check-circle-f')}<span>${esc(t)}</span></li>`).join('')}</ul>
            <h2>Das bringst du mit</h2><ul class="checklist">${j.needs.map((t) => `<li>${ic('check')}<span>${esc(t)}</span></li>`).join('')}</ul>
            <h2>Das bekommst du</h2><ul class="checklist">
              <li>${ic('star-f')}<span>Einen eigenen Teamrang im Spiel und auf Discord</span></li>
              <li>${ic('users-three')}<span>Ein Team, das zusammenhält – und Einfluss darauf, wie Civicy wächst</span></li>
              <li>${ic('sparkle')}<span>Vorab-Zugang zu neuen Updates und Event-Welten</span></li></ul>
          </div>
          <aside class="side-card">
            <dl><div><dt>Bereich</dt><dd>${esc(j.dept)}</dd></div><div><dt>Zeitaufwand</dt><dd>${esc(j.time || '–')}</dd></div><div><dt>Alter</dt><dd>${esc(j.age || '–')}</dd></div></dl>
            ${j.open ? `<a class="btn btn--brand btn--block" href="#/karriere/${slug(j.id)}/bewerben">Jetzt bewerben${ic('arrow-right', 'ic--move')}</a><p class="muted" style="margin-top:12px;font-size:13px">Dauert etwa 5 Minuten. Du meldest dich dafür mit deinem Minecraft-Konto an.</p>`
              : '<button class="btn btn--soft btn--block" type="button" disabled>Gerade keine Bewerbung möglich</button>'}
          </aside>
        </div>
      </div></div></div>`;
  };
  pages.job.title = (id) => (jobs.find((x) => x.id === id) || {}).title;

  // Bewerbung in drei Schritten
  const drafts = {};
  pages.apply = (id) => {
    const j = jobs.find((x) => x.id === id);
    if (!j || !j.open) return notFound('Für diese Stelle kannst du dich gerade nicht bewerben.');
    return `<div class="page">${pageHead('Bewerbung', esc(j.title) + '.', '', 'apply' + j.id)}
      <div class="page-body"><div class="wrap wrap--narrow"><a class="back-link" href="#/karriere/${slug(j.id)}">${ic('arrow-left')}Zur Stelle</a><div class="block" style="padding:clamp(22px,4vw,40px)" data-wizard></div></div></div></div>`;
  };
  pages.apply.title = (id) => 'Bewerbung ' + ((jobs.find((x) => x.id === id) || {}).title || '');
  pages.apply.mount = (root, id) => {
    const j = jobs.find((x) => x.id === id);
    if (!j || !j.open) return;
    const box = $('[data-wizard]', root);
    const d = drafts[id] || (drafts[id] = { step: 0, f: {} });
    const Q = DATA.jobQuestions || [];
    const val = (k) => esc(d.f[k] || '');
    const paint = () => {
      const user = AUTH.user;
      if (!user) {
        box.innerHTML = `<div class="done"><div class="done__icon">${ic('lock-simple')}</div><h2 class="wizard__title">Erst anmelden, dann bewerben</h2><p class="muted" style="max-width:440px">Damit wir wissen, wer du im Spiel bist, meldest du dich mit deinem Minecraft-Konto an. Deine Antworten gehen dabei nicht verloren.</p><button class="btn btn--brand" type="button" data-login>${msLogo}Mit Microsoft anmelden</button></div>`;
        return;
      }
      if (d.sent) {
        box.innerHTML = `<div class="done"><div class="done__icon">${ic('paper-plane-tilt')}</div><h2 class="wizard__title">Bewerbung abgeschickt!</h2><p class="muted" style="max-width:440px">Danke, ${esc(user.name)}! Das Team liest deine Bewerbung als ${esc(j.title)} und meldet sich innerhalb von 7 Tagen auf Discord bei <b>${esc(d.f.discord)}</b>.</p>${d.demo ? '<p class="auth__demo"><b>Demo-Modus:</b> Ohne Backend wird die Bewerbung nur in diesem Browser gespeichert.</p>' : ''}<div class="btn-row" style="justify-content:center;margin-top:10px"><a class="btn btn--soft" href="#/konto">Zu meinem Konto</a><a class="btn btn--ghost" href="#/karriere">Weitere Stellen</a></div></div>`;
        return;
      }
      const steps = `<div class="progress-steps" aria-hidden="true">${[0, 1, 2].map((s) => `<i class="${s <= d.step ? 'is-done' : ''}"></i>`).join('')}</div>`;
      const who = `<div class="auth__who" style="margin-bottom:24px">${headImg(user, 40, '', '')}<span><small class="muted">Du bewirbst dich als</small><b>${esc(user.name)}</b></span></div>`;
      if (d.step === 0) {
        box.innerHTML = `${steps}<p class="eyebrow">Schritt 1 von 3</p><h2 class="wizard__title">Über dich</h2><p class="muted" style="margin-bottom:24px">Ein paar Angaben, damit wir dich erreichen können.</p>${who}
          <form class="form" data-step novalidate>
            <div class="form-grid">
              <label class="field"><span>Discord-Name</span><input class="input" name="discord" required maxlength="40" autocomplete="off" placeholder="z. B. steve_baut" value="${val('discord')}"></label>
              <label class="field"><span>Alter</span><input class="input" name="age" type="number" inputmode="numeric" required min="10" max="99" placeholder="16" value="${val('age')}"></label>
            </div>
            <label class="field"><span>Wie lange spielst du schon auf Civicy?</span><select class="select" name="playtime" required>
              ${['', 'Weniger als 10 Stunden', '10 bis 50 Stunden', '50 bis 200 Stunden', 'Mehr als 200 Stunden'].map((o) => `<option value="${esc(o)}"${d.f.playtime === o ? ' selected' : ''}${o ? '' : ' disabled'}>${o || 'Bitte wählen'}</option>`).join('')}</select></label>
            <label class="field"><span>Wann bist du meistens online? <small>(optional)</small></span><input class="input" name="online" maxlength="80" placeholder="z. B. abends unter der Woche, am Wochenende ganztags" value="${val('online')}"></label>
            <p class="field__err" data-err hidden></p>
            <div class="wizard__actions"><a class="btn btn--ghost" href="#/karriere/${slug(j.id)}">Abbrechen</a><button class="btn btn--brand" type="submit">Weiter${ic('arrow-right', 'ic--move')}</button></div>
          </form>`;
      } else if (d.step === 1) {
        box.innerHTML = `${steps}<p class="eyebrow">Schritt 2 von 3</p><h2 class="wizard__title">Deine Antworten</h2><p class="muted" style="margin-bottom:24px">Es gibt keine falschen Antworten – schreib so, wie du redest.</p>
          <form class="form" data-step novalidate>
            ${Q.map((q) => `<label class="field"><span>${esc(q.label)}</span>${q.hint ? `<small class="field__hint">${esc(q.hint)}</small>` : ''}<textarea class="textarea" name="${esc(q.id)}" data-min="${q.min || 0}" maxlength="1500">${val(q.id)}</textarea><small class="field__hint" data-counter="${esc(q.id)}"></small></label>`).join('')}
            <p class="field__err" data-err hidden></p>
            <div class="wizard__actions"><button class="btn btn--ghost" type="button" data-back>${ic('arrow-left')}Zurück</button><button class="btn btn--brand" type="submit">Weiter${ic('arrow-right', 'ic--move')}</button></div>
          </form>`;
        const count = () => $$('textarea', box).forEach((t) => { const c = $(`[data-counter="${t.name}"]`, box); const m = +t.dataset.min; const l = t.value.trim().length; c.textContent = l < m ? `Noch ${m - l} Zeichen` : `${l} Zeichen ✓`; });
        box.addEventListener('input', count); count();
      } else {
        box.innerHTML = `${steps}<p class="eyebrow">Schritt 3 von 3</p><h2 class="wizard__title">Prüfen &amp; absenden</h2><p class="muted" style="margin-bottom:24px">So kommt deine Bewerbung als ${esc(j.title)} beim Team an.</p>
          <div class="review">
            <div><small>Minecraft</small><p>${esc(user.name)}${user.uuid ? ` · ${esc(user.uuid)}` : ''}</p></div>
            <div><small>Discord · Alter</small><p>${val('discord')} · ${val('age')} Jahre</p></div>
            <div><small>Spielzeit</small><p>${val('playtime')}${d.f.online ? ` · online: ${val('online')}` : ''}</p></div>
            ${Q.map((q) => `<div><small>${esc(q.label)}</small><p>${val(q.id)}</p></div>`).join('')}
          </div>
          <form class="form" data-step novalidate style="margin-top:22px">
            <label class="check"><input type="checkbox" name="ok" required><span>Meine Angaben stimmen. Ich bin einverstanden, dass das Civicy-Team sie zur Bearbeitung meiner Bewerbung speichert (<a href="privacy.html" target="_blank">Datenschutz</a>).</span></label>
            <p class="field__err" data-err hidden></p>
            <div class="wizard__actions"><button class="btn btn--ghost" type="button" data-back>${ic('arrow-left')}Zurück</button><button class="btn btn--brand" type="submit" data-send>${ic('paper-plane-tilt')}Bewerbung absenden</button></div>
          </form>`;
      }
      const first = $('input, textarea, select', box);
      if (first && d.step > 0) first.focus({ preventScroll: true });
    };
    const err = (msg) => { const e = $('[data-err]', box); e.textContent = msg; e.hidden = !msg; };
    box.addEventListener('click', (e) => { if (e.target.closest('[data-back]')) { collect(); d.step--; paint(); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    const collect = () => $$('input, textarea, select', box).forEach((el) => { if (el.name && el.type !== 'checkbox') d.f[el.name] = el.value.trim(); });
    box.addEventListener('submit', (e) => {
      e.preventDefault();
      collect();
      $$('.is-bad', box).forEach((el) => el.classList.remove('is-bad'));
      if (d.step === 0) {
        const bad = [];
        if (!d.f.discord) bad.push('discord');
        if (!(+d.f.age >= 10 && +d.f.age <= 99)) bad.push('age');
        if (!d.f.playtime) bad.push('playtime');
        if (bad.length) { bad.forEach((n) => $(`[name="${n}"]`, box).classList.add('is-bad')); return err('Bitte fülle die markierten Felder aus.'); }
      }
      if (d.step === 1) {
        const short = Q.filter((q) => (d.f[q.id] || '').length < (q.min || 0));
        if (short.length) { short.forEach((q) => $(`[name="${q.id}"]`, box).classList.add('is-bad')); return err('Ein paar Antworten sind noch etwas kurz.'); }
      }
      if (d.step === 2) {
        if (!$('[name="ok"]', box).checked) return err('Bitte bestätige deine Angaben.');
        return send();
      }
      d.step++; paint(); box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const send = () => {
      const btn = $('[data-send]', box);
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Wird gesendet …';
      const user = AUTH.user;
      const payload = { job: j.id, jobTitle: j.title, answers: d.f, questions: Q.map((q) => ({ id: q.id, label: q.label })) };
      const record = () => {
        const list = store.get('civicy-apps', []);
        list.unshift({ job: j.id, title: j.title, at: new Date().toISOString(), user: user.uuid || user.name, demo: !AUTH.token });
        store.set('civicy-apps', list.slice(0, 20));
      };
      if (AUTH.token && AUTH.api) {
        fetch(AUTH.api + '/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + AUTH.session.token }, body: JSON.stringify(payload) })
          .then((r) => r.json().catch(() => ({})).then((x) => { if (!r.ok) throw new Error(x.message || 'Senden fehlgeschlagen.'); }))
          .then(() => { record(); d.sent = true; paint(); })
          .catch((e) => { btn.disabled = false; btn.innerHTML = ic('paper-plane-tilt') + 'Erneut senden'; err(e.message || 'Senden fehlgeschlagen. Bitte versuche es gleich noch einmal.'); });
      } else {
        setTimeout(() => { record(); d.sent = true; d.demo = true; paint(); }, 700);
      }
    };
    paint();
    return AUTH.onChange(() => { if (location.hash.includes('/bewerben')) paint(); });
  };


  // ── Konto ──
  pages.konto = () => {
    const u = AUTH.user;
    if (!u) {
      return `<div class="page">${pageHead('Mein Konto', 'Dein Skin.<br><span>Dein Rang.</span>', 'Melde dich mit dem Microsoft-Konto an, mit dem du Minecraft spielst. Dann siehst du hier deinen echten Skin, deinen Namen, deinen Rang und deine Beiträge.', 'acc',
        `<div class="btn-row"><button class="btn btn--brand" type="button" data-login>${msLogo}Anmelden</button><a class="btn btn--ghost" href="#/faq">Warum Microsoft?</a></div>`)}</div>`;
    }
    const r = AUTH.rank(u);
    const apps = store.get('civicy-apps', []).filter((a) => a.user === (u.uuid || u.name));
    const email = u.email ? u.email.replace(/^(.)(.*)(.@.*)$/, (m, a, b, c) => a + '•'.repeat(Math.min(6, b.length)) + c) : '';
    const via = { microsoft: `${msLogo.replace('ms-logo', 'ms-logo ms-logo--inline')}Angemeldet mit Microsoft`, code: `${ic('keyboard')} Angemeldet mit Code aus dem Spiel`, demo: 'Demo-Anmeldung (nicht bestätigt)' }[AUTH.session.via || (AUTH.session.live ? 'microsoft' : 'demo')];
    return `<div class="page"><div class="page-head page-head--slim" style="padding-bottom:30px">${pixelsDeco('acc' + u.name, 12)}<div class="wrap"><p class="eyebrow">Mein Konto</p><h1 class="display">Hallo, <span>${esc(u.name)}</span>!</h1></div></div>
      <div class="page-body" style="padding-top:0"><div class="wrap">
        <div class="account">
          <aside class="acc-hero" data-tone="dark" style="--c:${esc(r.color)}">
            ${skin3d(u, 260, 330, 'acc-hero__skin')}<span class="acc-hero__floor" aria-hidden="true"></span>
            <h1>${esc(u.name)}</h1>${rankBadge(r, true)}
            ${chatLine(r, u.name)}
            <p style="margin-top:4px;font-size:14px">${via}</p>
          </aside>
          <div>
            <div class="facts">
              <div class="fact"><small>Rang</small><b>${esc(r.name)}</b>${r.buy || r.staff ? '' : `<br><small><a href="#/raenge">Ränge ansehen</a></small>`}</div>
              <div class="fact"><small>Angemeldet seit</small><b>${fmtDate(u.since || AUTH.session.at)}</b></div>
              <div class="fact"><small>Minecraft-UUID</small>${u.uuid ? `<button class="uuid" type="button" data-copy="${esc(u.uuid)}" title="Kopieren"><span>${esc(u.uuid)}</span>${ic('copy')}</button>` : '<b>–</b>'}</div>
              <div class="fact"><small>Microsoft-Konto</small><b>${esc(email || '–')}</b></div>
            </div>
            <section class="block"><h2>Meine Themen im Forum</h2><div data-my-threads>${loading()}</div></section>
            <section class="block"><h2>Meine Bewerbungen</h2>${apps.length ? `<div class="app-list">${apps.map((a) => `<div class="app-row"><span><b>${esc(a.title)}</b><br><small class="muted">${fmtDate(a.at)}</small></span><span class="tag" style="--c:#FFB547">${a.demo ? 'Gespeichert (Demo)' : 'Eingegangen'}</span></div>`).join('')}</div>` : `<div class="empty">Noch keine Bewerbung. <a href="#/karriere">Offene Stellen ansehen</a></div>`}</section>
            <div class="btn-row" style="margin-top:20px"><a class="btn btn--soft" href="#/spieler/${slug(u.name)}">${ic('user')}Öffentliches Profil</a><button class="btn btn--danger" type="button" data-logout>${ic('sign-out')}Abmelden</button></div>
          </div>
        </div>
      </div></div></div>`;
  };
  pages.konto.mount = (root) => {
    mountSkins(root);
    const u = AUTH.user;
    if (u) API.player(u.name).then((p) => { const box = $('[data-my-threads]', root); if (box) box.innerHTML = p && p.threads && p.threads.length ? `<div class="thread-list thread-list--flat">${p.threads.map(threadRow).join('')}</div>` : `<div class="empty">Noch kein Thema. <a href="#/forum">Zum Forum</a></div>`; })
      .catch(() => { const box = $('[data-my-threads]', root); if (box) box.innerHTML = '<p class="muted">Gerade nicht erreichbar.</p>'; });
    return AUTH.onChange(() => { if (route().name === 'konto') render(); });
  };

  function notFound(msg) {
    return `<div class="page">${pageHead('404', 'Hier ist<br><span>nichts.</span>', esc(msg || 'Diese Seite gibt es nicht.'), '404', `<div class="btn-row"><a class="btn btn--brand" href="#/">Zur Startseite</a></div>`)}</div>`;
  }

  // ─────────────────────────── Router ───────────────────────────
  const ROUTES = [
    [/^$/, 'home', 'Startseite'],
    [/^modi$/, 'modi', 'Spielmodi'],
    [/^news$/, 'news', 'Neuigkeiten'],
    [/^news\/([^/]+)$/, 'article', 'Neuigkeiten'],
    [/^forum$/, 'forum', 'Forum'],
    [/^forum\/t\/([^/]+)$/, 'thread', 'Forum'],
    [/^forum\/([^/]+)\/neu$/, 'forumNew', 'Neues Thema'],
    [/^forum\/([^/]+)$/, 'forumCat', 'Forum'],
    [/^regeln$/, 'regeln', 'Regeln'],
    [/^raenge$/, 'raenge', 'Ränge'],
    [/^team$/, 'team', 'Team'],
    [/^team\/([^/]+)$/, 'teamMember'],
    [/^spieler\/([^/]+)$/, 'spieler'],
    [/^karriere$/, 'karriere', 'Karriere'],
    [/^karriere\/([^/]+)$/, 'job', 'Karriere'],
    [/^karriere\/([^/]+)\/bewerben$/, 'apply', 'Bewerbung'],
    [/^faq$/, 'faq', 'Häufige Fragen'],
    [/^konto$/, 'konto', 'Mein Konto'],
  ];
  function route() {
    let path = location.hash.replace(/^#\/?/, '').replace(/\/+$/, '');
    try { path = decodeURIComponent(path); } catch (e) {}
    for (const [re, name, title] of ROUTES) {
      const m = path.match(re);
      if (m) return { name, arg: m[1], title, path };
    }
    return { name: 'notfound', path, title: 'Nicht gefunden' };
  }
  // Was beim Seitenwechsel in der Mitte steht: Name der Seite – oder der Spieler mit seinem Kopf
  function routeLabel(r) {
    if (r.name === 'spieler' || r.name === 'teamMember') return { title: r.arg, player: { name: r.arg, uuid: (AUTH.user && AUTH.user.name.toLowerCase() === String(r.arg).toLowerCase() && AUTH.user.uuid) || '' } };
    if (r.name === 'konto' && AUTH.user) return { title: AUTH.user.name, sub: 'Mein Konto', player: AUTH.user };
    if (r.name === 'forumCat' || r.name === 'forumNew') { const c = forumCat(r.arg); return { title: c ? c.name : 'Forum', sub: r.name === 'forumNew' ? 'Neues Thema' : 'Forum' }; }
    if (r.name === 'job' || r.name === 'apply') { const j = jobs.find((x) => x.id === r.arg); return { title: j ? j.title : 'Karriere', sub: r.name === 'apply' ? 'Bewerbung' : 'Karriere' }; }
    if (r.name === 'article') { const n = news.find((x) => x.id === r.arg); return { title: n ? n.title : 'Neuigkeiten', sub: n ? 'Neuigkeiten' : '' }; }
    return { title: r.title || 'Civicy' };
  }

  const main = $('[data-main]');
  let cleanup = null;
  let lastPath = null;
  function render() {
    const r = route();
    if (r.name === 'teamMember') { location.replace('#/spieler/' + slug(r.arg)); return; }
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) {} }
    cleanup = null;
    disposeSkins();
    const page = pages[r.name];
    main.innerHTML = page ? page(r.arg) : notFound();
    const t = page && (page.title ? page.title(r.arg) : r.title);
    document.title = r.name === 'home' ? 'Civicy – Minecraft-Netzwerk' : `${t || 'Nicht gefunden'} – Civicy`;
    if (page && page.mount) cleanup = page.mount(main.firstElementChild || main, r.arg) || null;
    if (r.path !== lastPath) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    lastPath = r.path;
    bindLinks(main);
    reveal(main);
    navActive(r);
    paintStatus();
  }

  // ── Seitenwechsel: Blöcke bauen den Bildschirm zu, in der Mitte Name der Seite (bzw. Kopf und Name des Spielers) ──
  const blocksEl = $('[data-blocks]');
  let blocking = false, pendingThen = null;
  function blocks(label, then) {
    if (prefersReduced) { then(); return; }
    if (blocking) { pendingThen = then; return; }
    blocking = true;
    const el = blocksEl;
    const size = innerWidth < 700 ? 64 : 96;
    const cols = Math.ceil(innerWidth / size), rows = Math.ceil(innerHeight / size);
    el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    el.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    let cells = '';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells += `<i style="--dl:${((x + y) * 10 + Math.random() * 40).toFixed(0)}ms"></i>`;
    const L = label || { title: 'Civicy' };
    const top = L.player ? headImg(L.player, 96, 'blocks__head', '') : '<img class="blocks__logo" src="assets/img/logo-sm.webp" alt="">';
    el.innerHTML = cells + `<div class="blocks__label">${top}${L.sub ? `<small>${esc(L.sub)}</small>` : ''}<b>${esc(L.title)}</b></div>`;
    el.hidden = false;
    const inTime = (cols + rows) * 10 + 40 + 220;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    setTimeout(() => {
      el.classList.add('is-label');
      then();
      while (pendingThen) { const p = pendingThen; pendingThen = null; p(); }
      setTimeout(() => {
        el.classList.remove('is-label');
        el.classList.add('is-out');
        setTimeout(() => { el.classList.remove('is-in', 'is-out'); el.hidden = true; blocking = false; }, inTime);
      }, 440);
    }, inTime);
  }

  // ─────────────────────────── Navigation ───────────────────────────
  const NAV = [
    ['', 'Start', 'house'],
    ['modi', 'Spielmodi', 'game-controller'],
    ['news', 'Neuigkeiten', 'newspaper'],
    ['forum', 'Forum', 'chats'],
    ['raenge', 'Ränge', 'crown'],
    ['team', 'Team', 'users-three'],
    ['regeln', 'Regeln', 'scroll'],
    ['karriere', 'Karriere', 'rocket-launch'],
    ['faq', 'FAQ', 'question'],
  ];
  const nav = $('[data-nav]');
  const panel = $('[data-nav-panel]');
  const btnMenu = $('[data-nav-menu]');
  const btnAcc = $('[data-nav-account]');
  let panelMode = null;

  function navActive(r) {
    const top = r.path.split('/')[0];
    $$('[data-nav-key]').forEach((a) => {
      const on = a.dataset.navKey === top;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function paintNav() {
    $('[data-nav-links]').innerHTML = NAV.slice(1, 6).map(([k, n]) => `<a class="nav__link" href="#/${k}" data-nav-key="${k}">${n}</a>`).join('');
    $$('[data-copy-ip].nav__ip').forEach((b) => { b.innerHTML = `${ic('copy')}<span>${esc(SERVER.ip)}</span>`; });
    const u = AUTH.user;
    if (u) {
      const r = AUTH.rank(u);
      btnAcc.innerHTML = headImg(u, 34, 'nav__head', '');
      btnAcc.style.setProperty('--rank-color', r.color);
      btnAcc.setAttribute('aria-label', `Konto von ${u.name}`);
    } else {
      btnAcc.innerHTML = ic('user-circle');
      btnAcc.setAttribute('aria-label', 'Anmelden');
    }
    navActive(route());
  }
  function openPanel(mode) {
    if (panelMode === mode) return closePanel();
    panelMode = mode;
    btnMenu.setAttribute('aria-expanded', String(mode === 'menu'));
    btnAcc.setAttribute('aria-expanded', String(mode === 'account'));
    btnMenu.setAttribute('aria-label', mode === 'menu' ? 'Menü schließen' : 'Menü öffnen');
    if (mode === 'menu') {
      const socials = ['discord', 'youtube', 'tiktok', 'instagram', 'twitch'].filter((k) => LINKS[k]);
      panel.innerHTML = `<nav class="menu" aria-label="Menü">
        ${NAV.map(([k, n, i]) => `<a class="menu__item" href="#/${k}" data-nav-key="${k}">${ic(i)}<span>${n}</span></a>`).join('')}
        <div class="menu__sep"></div>
        <button class="menu__item" type="button" data-copy-ip>${ic('copy')}<span>IP kopieren</span><small>${esc(SERVER.ip)}</small></button>
        ${LINKS.store ? `<a class="menu__item" href="${esc(LINKS.store)}" target="_blank" rel="noopener">${ic('shopping-cart')}<span>Shop</span>${ic('arrow-up-right')}</a>` : ''}
        ${socials.map((k) => `<a class="menu__item" href="${esc(LINKS[k])}" target="_blank" rel="noopener">${brand(k)}<span>${k[0].toUpperCase() + k.slice(1)}</span>${ic('arrow-up-right')}</a>`).join('')}
        ${themeSwitch()}
      </nav>`;
    } else {
      const u = AUTH.user; const r = AUTH.rank(u);
      panel.innerHTML = `<div class="acc-card" style="--rank-color:${esc(r.color)}">${headImg(u, 54, 'acc-card__head', '')}<span><b>${esc(u.name)}</b>${rankBadge(r)}</span></div>
        <nav class="menu" aria-label="Konto">
          <a class="menu__item" href="#/konto" data-nav-key="konto">${ic('user-circle')}<span>Mein Konto</span></a>
          <a class="menu__item" href="#/spieler/${slug(u.name)}">${ic('user')}<span>Mein Profil</span></a>
          <a class="menu__item" href="#/raenge">${ic('crown')}<span>Mein Rang</span><small>${esc(r.name)}</small></a>
          <a class="menu__item" href="#/forum">${ic('chats')}<span>Forum</span></a>
          <div class="menu__sep"></div>
          <button class="menu__item menu__item--danger" type="button" data-logout>${ic('sign-out')}<span>Abmelden</span></button>
        </nav>`;
    }
    panel.hidden = false;
    applyTheme();
    navActive(route());
  }
  function closePanel() {
    panelMode = null;
    panel.hidden = true;
    btnMenu.setAttribute('aria-expanded', 'false');
    btnAcc.setAttribute('aria-expanded', 'false');
    btnMenu.setAttribute('aria-label', 'Menü öffnen');
  }
  btnMenu.addEventListener('click', () => openPanel('menu'));
  btnAcc.addEventListener('click', () => (AUTH.user ? openPanel('account') : openAuth()));
  document.addEventListener('click', (e) => {
    if (panelMode && (!nav.contains(e.target) || e.target.closest('.nav__panel a, .nav__panel [data-logout], .nav__panel [data-copy-ip]'))) closePanel();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modalEl.hidden) closeModal();
    else if (!authEl.hidden) closeAuth();
    else if (panelMode) { closePanel(); btnMenu.focus(); }
  });

  // ─────────────────────────── Fenster (Editor, Rückfragen) ───────────────────────────
  const modalEl = $('[data-modal]');
  let modalDone = null;
  function openModal(title, html, onMount) {
    modalEl.innerHTML = `<div class="auth__backdrop" data-modal-close></div><div class="modal__panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal__head"><h2 id="modal-title">${esc(title)}</h2><button class="round-btn" type="button" data-modal-close aria-label="Schließen">${ic('x')}</button></div>
      <div class="modal__body">${html}</div></div>`;
    modalEl.hidden = false;
    document.body.classList.add('is-locked');
    if (onMount) onMount(modalEl);
    const f = $('.modal__body input, .modal__body textarea, .modal__body button', modalEl); if (f) setTimeout(() => f.focus(), 50);
  }
  function closeModal(v) {
    modalEl.hidden = true; modalEl.innerHTML = '';
    if (authEl.hidden) document.body.classList.remove('is-locked');
    if (modalDone) { const d = modalDone; modalDone = null; d(!!v); }
  }
  modalEl.addEventListener('click', (e) => { if (e.target.closest('[data-modal-close]')) closeModal(false); if (e.target.closest('[data-modal-ok]')) closeModal(true); });
  function confirmBox(title, text, ok) {
    return new Promise((res) => {
      openModal(title, `<p>${esc(text)}</p><div class="wizard__actions"><button class="btn btn--ghost" type="button" data-modal-close>Abbrechen</button><button class="btn btn--danger" type="button" data-modal-ok>${esc(ok || 'OK')}</button></div>`);
      modalDone = res;
    });
  }

  // ─────────────────────────── Anmeldung: eigene Oberfläche ───────────────────────────
  const authEl = $('[data-auth]');
  let authState = { step: 'email', email: '' };
  let lastFocus = null;
  function openAuth(state) {
    closePanel();
    lastFocus = document.activeElement;
    authState = Object.assign({ step: 'email', email: store.get('civicy-last-email', '') }, state || {});
    authEl.hidden = false;
    document.body.classList.add('is-locked');
    paintAuth();
  }
  function closeAuth() {
    if (authState.step === 'finishing') return;
    authEl.hidden = true;
    disposeSkins();
    if (modalEl.hidden) document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if ($('[data-skin]', main)) mountSkins(main);
  }
  function paintAuth() {
    const s = authState;
    const ms = AUTH.msAvailable();
    const backend = AUTH.hasBackend();
    const who = `<div class="auth__who"><span class="auth__who-ava">${esc((s.email || '?')[0])}</span><span><small class="muted">Microsoft-Konto</small><b>${esc(s.email)}</b></span><button type="button" data-auth-step="email">Ändern</button></div>`;
    let body = '';
    if (s.step === 'email') {
      body = `<span class="auth__ms">${msLogo}Minecraft-Konto</span>
        <h2 class="auth__title" id="auth-title">Anmelden</h2>
        <p class="auth__sub">Mit dem Microsoft-Konto, mit dem du Minecraft spielst. Danach siehst du deinen echten Skin, deinen Namen und deinen Rang.</p>
        ${ms || !backend ? `<form class="form" data-auth-form="email" novalidate>
          <label class="field"><span>E-Mail-Adresse</span><div class="input-icon">${ic('at')}<input class="input" name="email" type="email" inputmode="email" autocomplete="email" placeholder="name@outlook.de" value="${esc(s.email)}" required></div></label>
          <p class="field__err" data-auth-err hidden></p>
          <button class="btn btn--brand btn--block" type="submit">Weiter${ic('arrow-right', 'ic--move')}</button>
        </form>` : ''}
        ${ms ? `<div class="auth__or">oder</div><button class="btn btn--ms btn--block" type="button" data-auth-ms>${msLogo}Konto bei Microsoft auswählen</button>` : ''}
        ${backend ? `${ms ? '' : '<p class="field__err" data-auth-err hidden></p>'}<div class="auth__or">${ms ? 'oder' : 'mit dem Server'}</div><button class="btn btn--soft btn--block" type="button" data-auth-step="code">${ic('keyboard')}Mit Code aus dem Spiel anmelden</button>` : ''}
        ${!backend ? '<p class="auth__demo"><b>Demo-Modus:</b> Die Verbindung zu Microsoft ist noch nicht eingerichtet. Nach der E-Mail fragen wir deinen Minecraft-Namen ab und laden deinen echten Skin.</p>' : ''}`;
    } else if (s.step === 'confirm') {
      body = `${who}
        <h2 class="auth__title" id="auth-title">Fast geschafft</h2>
        <p class="auth__sub">Für dein Passwort leiten wir dich kurz zu Microsoft weiter. Danach bist du sofort zurück.</p>
        <div class="auth__secure">
          <div>${ic('lock-simple')}<span><b>Dein Passwort bleibt bei Microsoft.</b> Civicy sieht es nie.</span></div>
          <div>${ic('identification-card')}<span><b>Wir erhalten nur</b> deinen Minecraft-Namen, deine UUID und deinen Skin.</span></div>
          <div>${ic('shield-check')}<span><b>Jederzeit trennbar</b> in deinem Microsoft-Konto unter „Datenschutz“.</span></div>
        </div>
        <button class="btn btn--brand btn--block" type="button" data-auth-go>${msLogo}Weiter zu Microsoft</button>`;
    } else if (s.step === 'code') {
      body = `<span class="auth__ms">${ic('keyboard')}Code aus dem Spiel</span>
        <h2 class="auth__title" id="auth-title">Code eingeben</h2>
        <p class="auth__sub">Verbinde dich mit <b>${esc(SERVER.ip)}</b> und gib im Chat <code class="inline-code">/weblogin</code> ein. Du bekommst einen 6-stelligen Code, der 5 Minuten gilt.</p>
        <form class="form" data-auth-form="code" novalidate>
          <label class="field"><span>Code</span><input class="input input--code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="123 456" required></label>
          <p class="field__err" data-auth-err hidden></p>
          <button class="btn btn--brand btn--block" type="submit">Anmelden${ic('arrow-right', 'ic--move')}</button>
        </form>
        <button class="btn btn--ghost btn--block" type="button" data-auth-step="email" style="margin-top:12px">${ic('arrow-left')}Zurück</button>`;
    } else if (s.step === 'demo') {
      body = `${who}
        <h2 class="auth__title" id="auth-title">Dein Minecraft-Name</h2>
        <p class="auth__sub">Mit welchem Namen spielst du? Wir holen dazu die richtige Schreibweise und deinen Skin.</p>
        <form class="form" data-auth-form="demo" novalidate>
          <label class="field"><span>Minecraft-Name</span><div class="input-icon">${ic('game-controller')}<input class="input" name="name" autocomplete="nickname" autocapitalize="off" spellcheck="false" maxlength="16" placeholder="z. B. Steve" value="${esc(s.name || '')}" required></div></label>
          <div class="name-preview" data-name-preview hidden></div>
          <p class="field__err" data-auth-err hidden></p>
          <button class="btn btn--brand btn--block" type="submit">Anmelden${ic('arrow-right', 'ic--move')}</button>
        </form>
        <p class="auth__demo"><b>Demo-Modus:</b> Der Name wird nicht bestätigt. Sobald das Backend eingerichtet ist, läuft hier die echte Anmeldung über Microsoft oder einen Code aus dem Spiel.</p>`;
    } else if (s.step === 'finishing') {
      const rows = [['microsoft', 'Microsoft-Konto bestätigen'], ['xbox', 'Bei Xbox Live anmelden'], ['minecraft', 'Minecraft-Profil und Skin laden'], ['rank', 'Rang auf Civicy abrufen']];
      body = `<h2 class="auth__title" id="auth-title">Einen Moment …</h2>
        <p class="auth__sub">Wir verbinden dein Microsoft-Konto mit Civicy.</p>
        <div class="chain">${rows.map(([k, t]) => `<div class="chain__row" data-chain="${k}"><span class="chain__dot">${ic('check')}</span>${t}</div>`).join('')}</div>`;
    } else if (s.step === 'error') {
      body = `<div class="done" style="padding:20px 0"><div class="done__icon" style="color:var(--bad);background:rgba(255,93,108,.12);box-shadow:none">${ic('warning')}</div>
        <h2 class="auth__title" id="auth-title" style="margin-top:0">Das hat nicht geklappt</h2><p class="auth__sub">${esc(s.error || 'Unbekannter Fehler.')}</p>
        <div class="btn-row" style="justify-content:center;margin-top:0"><button class="btn btn--brand" type="button" data-auth-step="email">Noch einmal versuchen</button>${AUTH.hasBackend() ? `<button class="btn btn--ghost" type="button" data-auth-step="code">${ic('keyboard')}Code aus dem Spiel</button>` : ''}</div></div>`;
    } else if (s.step === 'welcome') {
      const u = AUTH.user; const r = AUTH.rank(u);
      body = `<div class="welcome">${skin3d(u, 200, 250, 'welcome__skin')}<p class="eyebrow" style="margin:6px 0 0">Angemeldet</p><h2 class="auth__title" id="auth-title" style="margin:0">Willkommen, ${esc(u.name)}!</h2>${rankBadge(r, true)}${chatLine(r, u.name, 'Hallo Civicy!')}
        <div class="btn-row" style="justify-content:center;margin-top:16px"><button class="btn btn--brand" type="button" data-auth-done>Los geht's${ic('arrow-right', 'ic--move')}</button><a class="btn btn--ghost" href="#/konto" data-auth-done>Mein Konto</a></div></div>`;
    }
    authEl.innerHTML = `<div class="auth__backdrop" data-auth-close></div>
      <div class="auth__panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div class="auth__art" data-tone="dark"><div class="auth__art-bg" aria-hidden="true"></div>
          <img class="auth__art-logo" src="assets/img/logo-sm.webp" alt="Civicy">
          <div><h2>Deine Runde wartet.</h2><p>Mit deinem Minecraft-Konto siehst du deinen Skin und Rang, schreibst im Forum und bewirbst dich im Team.</p>
            <div class="auth__perks"><span>${ic('crown')}Dein echter Skin und Rang</span><span>${ic('chats')}Mitreden im Forum</span><span>${ic('lock-simple')}Passwort nur bei Microsoft</span></div></div>
        </div>
        <div class="auth__main">
          ${s.step !== 'finishing' ? `<button class="round-btn auth__close" type="button" data-auth-close aria-label="Schließen">${ic('x')}</button>` : ''}
          <div class="auth__step">${body}
            ${['email', 'confirm', 'demo', 'code'].includes(s.step) ? '<p class="auth__legal">Mit der Anmeldung akzeptierst du die <a href="terms.html">Nutzungsbedingungen</a> und die <a href="privacy.html">Datenschutzerklärung</a>.</p>' : ''}
          </div>
        </div>
      </div>`;
    disposeSkins();
    mountSkins(authEl);
    const f = $('input', authEl);
    if (f) setTimeout(() => f.focus(), 60);
    // Demo: Kopf und richtige Schreibweise schon beim Tippen zeigen
    const nameInput = $('[data-auth-form="demo"] input[name=name]', authEl);
    if (nameInput) {
      let tm;
      nameInput.addEventListener('input', () => {
        clearTimeout(tm);
        const v = nameInput.value.trim();
        const box = $('[data-name-preview]', authEl);
        if (!/^[A-Za-z0-9_]{3,16}$/.test(v)) { box.hidden = true; return; }
        tm = setTimeout(() => AUTH.lookup(v).then((p) => {
          if (nameInput.value.trim() !== v) return;
          box.hidden = false;
          box.innerHTML = p ? `${headImg(p, 32, '', '')}<span><b>${esc(p.name)}</b><small>Minecraft-Konto gefunden</small></span>${ic('check-circle-f')}` : `${ic('warning')}<span><b>${esc(v)}</b><small>Diesen Namen gibt es nicht</small></span>`;
          box.classList.toggle('is-bad', !p);
        }).catch(() => { box.hidden = true; }), 450);
      });
    }
  }
  const authFail = (err) => { authState.step = 'error'; authState.error = err.message; paintAuth(); };
  const authErr = (msg) => { const e = $('[data-auth-err]', authEl); if (e) { e.textContent = msg; e.hidden = !msg; } const i = $('.input', authEl); if (i) i.classList.toggle('is-bad', !!msg); };
  authEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-auth-close]')) return closeAuth();
    const st = e.target.closest('[data-auth-step]');
    if (st) { authState.step = st.dataset.authStep; return paintAuth(); }
    if (e.target.closest('[data-auth-ms]')) { e.target.closest('button').innerHTML = '<span class="spinner"></span>Weiterleitung …'; AUTH.startMicrosoft('').catch(authFail); return; }
    if (e.target.closest('[data-auth-go]')) { const b = e.target.closest('button'); b.disabled = true; b.innerHTML = '<span class="spinner"></span>Weiterleitung zu Microsoft …'; AUTH.startMicrosoft(authState.email).catch(authFail); return; }
    if (e.target.closest('[data-auth-done]')) { const go = e.target.closest('a'); closeAuth(); if (!go) render(); }
  });
  authEl.addEventListener('input', (e) => { if (e.target.matches('.input')) authErr(''); });
  authEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = $('button[type=submit]', form);
    const busy = (t) => { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>${t}`; };
    const idle = (t) => { btn.disabled = false; btn.innerHTML = t + ic('arrow-right', 'ic--move'); };
    if (form.dataset.authForm === 'email') {
      const email = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return authErr('Bitte gib eine gültige E-Mail-Adresse ein.');
      authState.email = email;
      store.set('civicy-last-email', email);
      authState.step = AUTH.msAvailable() ? 'confirm' : 'demo';
      paintAuth();
    } else if (form.dataset.authForm === 'demo') {
      const name = form.name.value.trim();
      if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return authErr('Minecraft-Namen haben 3 bis 16 Zeichen: Buchstaben, Ziffern und _.');
      authState.name = name;
      busy('Skin wird geladen …');
      AUTH.demoLogin(authState.email, name).then(() => welcome()).catch((err) => { idle('Anmelden'); authErr(err.message); });
    } else if (form.dataset.authForm === 'code') {
      const code = form.code.value.replace(/\D/g, '');
      if (code.length !== 6) return authErr('Der Code hat 6 Ziffern.');
      busy('Wird geprüft …');
      AUTH.codeLogin(code).then(() => welcome()).catch((err) => { idle('Anmelden'); authErr(err.message); });
    }
  });
  function welcome(label) {
    const u = AUTH.user;
    blocks({ title: u.name, sub: 'Willkommen', player: u }, () => { authState.step = 'welcome'; paintAuth(); paintNav(); render(); });
  }
  // Rückkehr von Microsoft
  function handleCallback(cb) {
    if (!cb) return;
    if (cb.error) { openAuth({ step: 'error', error: cb.error }); return; }
    openAuth({ step: 'finishing', email: cb.email });
    const order = ['microsoft', 'xbox', 'minecraft', 'rank'];
    let k = 0, done = false;
    const mark = (i, cls) => { const row = $(`[data-chain="${order[i]}"]`, authEl); if (row) { row.classList.remove('is-busy'); row.classList.add(cls); } };
    const tick = () => { if (done || k >= order.length - 1) return; mark(k, 'is-done'); k++; mark(k, 'is-busy'); setTimeout(tick, 650); };
    mark(0, 'is-busy'); setTimeout(tick, 650);
    AUTH.finish(cb).then(() => {
      done = true;
      for (let i = 0; i < order.length; i++) mark(i, 'is-done');
      setTimeout(welcome, 500);
    }).catch((err) => {
      done = true;
      const i = Math.max(0, order.indexOf(err.step));
      for (let j = 0; j < i; j++) mark(j, 'is-done');
      mark(i, 'is-fail');
      setTimeout(() => { authState.step = 'error'; authState.error = err.message; paintAuth(); }, 900);
    });
  }

  // ─────────────────────────── Allgemeine Klicks ───────────────────────────
  document.addEventListener('click', (e) => {
    const t = e.target;
    const ipb = t.closest('[data-copy-ip]');
    if (ipb) {
      copy(SERVER.ip).then(() => {
        toast(`${SERVER.ip} kopiert – bis gleich auf Civicy!`);
        ipb.classList.add('is-copied');
        const c = $('.ip-btn__copy', ipb);
        if (c) { c.innerHTML = ic('check'); setTimeout(() => { c.innerHTML = ic('copy'); ipb.classList.remove('is-copied'); }, 1600); }
      });
      return;
    }
    const cp = t.closest('[data-copy]');
    if (cp) { copy(cp.dataset.copy).then(() => toast('Kopiert')); return; }
    if (t.closest('[data-login]')) { openAuth(); return; }
    if (t.closest('[data-logout]')) {
      AUTH.logout(); closePanel(); paintNav(); toast('Du bist abgemeldet.', 'sign-out');
      if (['konto', 'raenge', 'apply', 'thread', 'forumNew', 'forumCat', 'news', 'spieler'].includes(route().name)) render();
      return;
    }
    const th = t.closest('[data-theme-set]');
    if (th) { setTheme(th.dataset.themeSet); return; }
    const sc = t.closest('[data-scroll-to]');
    if (sc) { const el = $(sc.dataset.scrollTo); if (el) el.scrollIntoView({ behavior: 'smooth' }); return; }
    const md = t.closest('[data-mode]');
    if (md) sessionStorage.setItem('civicy-mode', md.dataset.mode);
  });

  function bindLinks(root) {
    $$('[data-link]', root).forEach((a) => {
      const url = LINKS[a.dataset.link];
      if (url) a.href = url; else a.hidden = true;
    });
  }
  let io;
  function reveal(root) {
    const els = $$('.reveal:not(.is-in)', root);
    if (!('IntersectionObserver' in window) || prefersReduced) { els.forEach((el) => el.classList.add('is-in')); return; }
    if (!io) io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`; io.observe(el); });
  }

  // ─────────────────────────── Start ───────────────────────────
  function footer() {
    const socials = ['discord', 'youtube', 'tiktok', 'instagram', 'twitch'].filter((k) => LINKS[k]);
    $('[data-socials]').innerHTML = socials.map((k) => `<a href="${esc(LINKS[k])}" target="_blank" rel="noopener" aria-label="${k}" title="${k[0].toUpperCase() + k.slice(1)}">${brand(k)}</a>`).join('');
    $('[data-foot-ip]').innerHTML = ipButton('btn--glass btn--sm');
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    bindLinks(document.querySelector('.foot'));
  }

  AUTH.onChange(paintNav);
  // Jeder Seitenwechsel läuft über die Blöcke
  addEventListener('hashchange', () => {
    closePanel();
    const r = route();
    if (r.path === lastPath) return;
    blocks(routeLabel(r), render);
  });
  const callback = AUTH.readCallback();
  paintNav();
  footer();
  applyTheme();
  render();
  handleCallback(callback);
  AUTH.refresh().then(paintNav);
  loadStatus().then(paintStatus);

  // Offline-Speicher für schnelleres Laden (nur über https bzw. localhost)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
