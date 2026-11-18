/*
 * Civicy – Web-App
 * Eine Seite, Navigation über die Adresse (#/news, #/team/<Name> …). Kein Build-Schritt.
 * Inhalte: data.js · Einstellungen: config.js · Anmeldung: auth.js · Symbole: icons.js
 */
(function () {
  'use strict';

  const CFG = window.CIVICY_CONFIG || {};
  const DATA = window.CIVICY_DATA || {};
  const AUTH = window.CivicyAuth;
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
  const playerRanks = ranks.filter((r) => r.level).sort((a, b) => a.level - b.level);
  const rankOf = (id) => AUTH.rankById(id);
  const cats = DATA.newsCats || [];
  const catOf = (p) => cats.find((c) => c.id === p.cat) || { name: 'News', color: '#5CE1FF' };
  const news = (DATA.news || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const team = (DATA.team || []).slice().sort((a, b) => ranks.findIndex((r) => r.id === a.rank) - ranks.findIndex((r) => r.id === b.rank));
  const findMember = (name) => team.find((m) => m.name.toLowerCase() === String(name).toLowerCase());
  const jobs = DATA.jobs || [];

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
  const faqItem = (f, open) => `<details class="faq-item"${open ? ' open' : ''}><summary>${esc(f.q)}<span class="pm" aria-hidden="true"></span></summary><div class="faq-item__a">${f.a.map((p) => `<p>${fill(esc(p))}</p>`).join('')}</div></details>`;
  const discordCard = () => LINKS.discord ? `<a class="faq__ask" data-link="discord" href="${esc(LINKS.discord)}" target="_blank" rel="noopener">${brand('discord')}<span><b>Nicht gefunden, was du suchst?</b><small>Frag die Community und das Team auf Discord.</small></span>${ic('arrow-up-right')}</a>` : '';

  // ─────────────────────────── Seiten ───────────────────────────
  const pages = {};

  // ── Start ──
  pages.home = () => {
    let stars = '';
    const r = rng('stars');
    for (let i = 0; i < 70; i++) stars += `<i style="left:${(r() * 100).toFixed(2)}%;top:${(r() * 62).toFixed(2)}%;--d:${(2 + r() * 4).toFixed(1)}s;--dl:${(-r() * 4).toFixed(1)}s;${r() > 0.85 ? 'width:4px;height:4px;' : ''}"></i>`;
    const q = DATA.quotes || [];
    const homeFaq = (DATA.faq || []).filter((f) => f.home);
    const latest = news.slice(0, 4);
    return `<div class="page">
      <section class="hero" data-tone="dark">
        <div class="hero__aurora" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="hero__stars" aria-hidden="true">${stars}</div>
        ${heroHills()}
        <div class="wrap hero__inner">
          <div class="hero__text">
            <p class="eyebrow hero__kicker">Minecraft-Server · Java &amp; Bedrock</p>
            <h1 class="hero__title">Bau deine Stadt.<span>Schreib Geschichte.</span></h1>
            <p class="hero__lead">Auf Civicy gründest du mit Freunden eine Stadt, gibst ihr eigene Gesetze, handelst mit anderen Städten und erkundest eine Welt, die ihr gemeinsam formt.</p>
            <div class="btn-row">
              ${ipButton('btn--brand')}
              ${LINKS.discord ? `<a class="btn btn--glass" href="${esc(LINKS.discord)}" target="_blank" rel="noopener">${brand('discord')}Discord beitreten</a>` : ''}
            </div>
            <div class="hero__status" aria-live="polite">
              <span class="status-dot" data-status-dot aria-hidden="true"></span>
              <span><b data-status-online>–</b><small data-status-label>Status wird geladen</small></span>
              <i class="hero__sep" aria-hidden="true"></i>
              <span><b>${esc(SERVER.version || '–')}</b><small>Version</small></span>
              ${SERVER.bedrockIp ? `<i class="hero__sep" aria-hidden="true"></i><span><b>${ic('game-controller')}</b><small>Bedrock dabei</small></span>` : ''}
            </div>
          </div>
          <div class="hero__visual">
            <figure class="hero__card"><img src="assets/img/mondturm.jpg" alt="Der Mondturm am Spawn von Civicy bei Nacht" width="576" height="1024"><figcaption><b>Der Mondturm</b><small>Am Spawn – dein erster Halt</small></figcaption></figure>
            <div class="hero__chip hero__chip--a" aria-hidden="true">${slot('buildings')}<span>Neue Stadt gegründet<small>Nordhafen · gerade eben</small></span></div>
            <div class="hero__chip hero__chip--b" aria-hidden="true">${slot('coins')}<span>Marktplatz geöffnet<small>Update 0.4</small></span></div>
          </div>
        </div>
        <button class="hero__scroll" type="button" data-scroll-to="#start" aria-label="Nach unten scrollen">${ic('arrow-down')}</button>
      </section>

      <section class="section" id="start" aria-labelledby="h-start">
        <div class="wrap">
          <div class="sec-head reveal"><div><p class="eyebrow">In drei Schritten</p><h2 id="h-start" class="display">So startest du.</h2></div></div>
          <div class="steps">
            <div class="step reveal">${slot('game-controller')}<h3>Minecraft öffnen</h3><p>Java Edition ab ${esc(SERVER.version || '1.21')}${SERVER.bedrockIp ? ' – oder Bedrock auf Handy, Konsole und Windows' : ''}.</p></div>
            <div class="step reveal">${slot('plus')}<h3>Server hinzufügen</h3><p>Unter „Mehrspieler“ einen Server mit der Adresse <code>${esc(SERVER.ip)}</code> anlegen${SERVER.bedrockIp ? ` (Bedrock: Port <code>${esc(SERVER.bedrockPort || 19132)}</code>)` : ''}.</p></div>
            <div class="step reveal">${slot('buildings')}<h3>Stadt finden</h3><p>Am Spawn eine Stadt suchen, die dich aufnimmt – oder mit Freunden eine eigene gründen.</p></div>
          </div>
        </div>
      </section>

      <section class="section section--tight" aria-labelledby="h-feat">
        <div class="wrap">
          <div class="sec-head reveal"><div><p class="eyebrow">Was dich erwartet</p><h2 id="h-feat" class="display">Eine Welt, die ihr<br><span>gemeinsam baut.</span></h2></div>
            <a class="more-link" href="#/raenge">Alle Ränge ansehen${ic('arrow-right')}</a></div>
          <div class="features" data-features>
            ${(DATA.features || []).map((f) => `<article class="feature reveal">${slot(f.icon)}<h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></article>`).join('')}
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

      ${latest.length ? `<section class="section" aria-labelledby="h-news">
        <div class="wrap">
          <div class="sec-head reveal"><h2 id="h-news" class="display">Neuigkeiten</h2><a class="more-link" href="#/news">Alle Beiträge${ic('arrow-right')}</a></div>
          <div class="nr-grid">
            <div class="nr-list reveal">${latest.slice(1).map((p) => newsItem(p)).join('')}</div>
            <div class="reveal">${bigNews(latest[0])}</div>
          </div>
        </div>
      </section>` : ''}

      <section class="section section--tight" aria-label="Civicy in Zahlen">
        <div class="wrap">
          <div class="numbers reveal">
            <div class="numbers__head"><p class="numbers__kicker">Live</p><h2>Civicy in Zahlen</h2></div>
            <div class="numbers__grid">
              <div class="num">${ic('users')}<b data-count="online">–</b><small>Gerade online</small></div>
              <div class="num">${brand('discord')}<b data-count="discord">–</b><small>Auf Discord</small></div>
              <div class="num">${ic('users-three')}<b data-count="team">${team.length}</b><small>Im Team</small></div>
              <div class="num">${ic('cube')}<b>${esc(SERVER.version || '–')}</b><small>Version</small></div>
            </div>
          </div>
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
              <p>Hilf neuen Spielern, sorg für faire Regeln, bau die schönsten Orte der Welt oder programmier die Systeme, die es nur auf Civicy gibt.</p>
              <div class="tag-row"><span>Support</span><span>Moderation</span><span>Bauen</span><span>Plugins</span></div>
            </div>
            <div class="join__actions">
              <a class="join__link" href="#/karriere"><span><b>Offene Stellen</b><small>Bewerbung in drei kurzen Schritten</small></span>${ic('arrow-right')}</a>
              <a class="join__link" href="#/team"><span><b>Das Team</b><small>Wer Civicy baut und betreibt</small></span>${ic('arrow-right')}</a>
              <a class="join__link" href="#/regeln"><span><b>Die Regeln</b><small>Damit alle Spaß haben</small></span>${ic('arrow-right')}</a>
            </div>
          </div>
        </div>
      </section>
    </div>`;
  };
  pages.home.mount = (root) => {
    loadStatus().then(() => { paintStatus(); countUp($('[data-count="online"]', root), status && status.online ? status.players : null); });
    loadDiscord().then((n) => countUp($('[data-count="discord"]', root), n));
    // Lichtschein folgt der Maus auf den Merkmal-Karten
    $$('.feature', root).forEach((el) => el.addEventListener('pointermove', (e) => { const b = el.getBoundingClientRect(); el.style.setProperty('--mx', ((e.clientX - b.left) / b.width * 100) + '%'); }));
    return quotes(root);
  };

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

  // ── Neuigkeiten ──
  const newsMeta = (p) => `<div class="meta"><span class="tag" style="--c:${esc(catOf(p).color)}">${esc(catOf(p).name)}</span><span>${fmtShort(p.date)}</span><span>${readTime(p)} Min. Lesezeit</span></div>`;
  const newsItem = (p) => `<a class="nr-item" href="#/news/${slug(p.id)}">${newsMeta(p)}<h3>${esc(p.title)}</h3><p>${esc(p.teaser)}</p></a>`;
  const bigNews = (p) => `<a class="nr-big" href="#/news/${slug(p.id)}"><div class="cover">${coverOf(p)}</div><div class="nr-big__shade"></div><div class="nr-big__text">${newsMeta(p)}<h3>${esc(p.title)}</h3><p>${esc(p.teaser)}</p></div></a>`;
  const newsCard = (p) => `<a class="news-card reveal" href="#/news/${slug(p.id)}"><div class="news-card__pic"><div class="cover">${coverOf(p)}</div></div><div class="news-card__body">${newsMeta(p)}<h3>${esc(p.title)}</h3><p>${esc(p.teaser)}</p></div></a>`;

  let newsFilter = 'all';
  pages.news = () => {
    const used = cats.filter((c) => news.some((p) => p.cat === c.id));
    return `<div class="page">${pageHead('Neuigkeiten', 'Was gibt\'s<br><span>Neues?</span>', 'Updates, Events und alles aus der Community – direkt vom Team.', 'news')}
      <div class="page-body"><div class="wrap">
        <div class="filter" role="group" aria-label="Nach Kategorie filtern">
          <button class="chip" type="button" data-news-filter="all" aria-pressed="${newsFilter === 'all'}">Alle</button>
          ${used.map((c) => `<button class="chip" type="button" data-news-filter="${esc(c.id)}" aria-pressed="${newsFilter === c.id}">${esc(c.name)}</button>`).join('')}
        </div>
        <div data-news-list></div>
      </div></div></div>`;
  };
  pages.news.mount = (root) => {
    const paint = () => {
      const list = news.filter((p) => newsFilter === 'all' || p.cat === newsFilter);
      $('[data-news-list]', root).innerHTML = list.length
        ? `<div class="news-feature">${bigNews(list[0])}</div><div class="news-grid">${list.slice(1).map(newsCard).join('')}</div>`
        : '<p class="empty">Noch keine Beiträge in dieser Kategorie.</p>';
      $$('[data-news-filter]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.newsFilter === newsFilter)));
      reveal(root);
    };
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-news-filter]'); if (b) { newsFilter = b.dataset.newsFilter; paint(); } });
    paint();
  };

  pages.article = (id) => {
    const p = news.find((x) => x.id === id);
    if (!p) return notFound('Diese Neuigkeit gibt es nicht (mehr).');
    const author = findMember(p.author);
    const url = location.href;
    const more = news.filter((x) => x.id !== p.id).slice(0, 3);
    return `<div class="page"><article class="article"><div class="wrap">
      <a class="back-link" href="#/news">${ic('arrow-left')}Alle Neuigkeiten</a>
      <header class="article__head">${newsMeta(p)}<h1>${esc(p.title)}</h1>
        <div class="article__by">${author ? headImg(author, 40) : '<img src="assets/img/logo-sm.webp" alt="" width="40" height="33" style="object-fit:contain">'}<span><b style="color:var(--ink)">${esc(p.author || 'Civicy')}</b><br><small class="muted">${fmtDate(p.date)}</small></span></div>
      </header>
      <div class="article__pic"><div class="cover">${coverOf(p)}</div></div>
      <div class="article__body">${textBody(p.body)}
        <div class="share"><b>Teilen</b>
          <a class="round-btn" href="https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(p.title)}" target="_blank" rel="noopener" aria-label="Auf X teilen">${brand('x')}</a>
          <a class="round-btn" href="https://wa.me/?text=${encodeURIComponent(p.title + ' ' + url)}" target="_blank" rel="noopener" aria-label="Über WhatsApp teilen">${brand('whatsapp')}</a>
          <a class="round-btn" href="https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(p.title)}" target="_blank" rel="noopener" aria-label="Auf Reddit teilen">${brand('reddit')}</a>
          <button class="round-btn" type="button" data-copy-link aria-label="Link kopieren">${ic('link')}</button>
          ${navigator.share ? `<button class="round-btn" type="button" data-share aria-label="Teilen">${ic('share-network')}</button>` : ''}
        </div>
      </div>
      ${more.length ? `<h2 class="h2-sm">Weitere Neuigkeiten</h2><div class="news-grid">${more.map(newsCard).join('')}</div>` : ''}
    </div></article><div style="height:100px"></div></div>`;
  };
  pages.article.mount = (root, id) => {
    const p = news.find((x) => x.id === id);
    if (!p) return;
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-copy-link]')) copy(location.href).then(() => toast('Link kopiert'));
      if (e.target.closest('[data-share]')) navigator.share({ title: p.title, text: p.teaser, url: location.href }).catch(() => {});
    });
  };
  pages.article.title = (id) => (news.find((x) => x.id === id) || {}).title;

  // ── Regeln ──
  pages.regeln = () => {
    let n = 0;
    return `<div class="page">${pageHead('Regeln', 'Fair spielen.<br><span>Gemeinsam bauen.</span>', 'Damit Civicy für alle ein guter Ort bleibt. Mit dem Betreten des Servers und des Discords akzeptierst du diese Regeln.', 'rules')}
      <div class="page-body"><div class="wrap wrap--narrow">
        <div class="notice reveal" style="margin-bottom:34px">${ic('info')}<p><b>Kurz gesagt:</b> Sei respektvoll, spiel ohne Cheats und lass fremde Bauten in Ruhe. Im Zweifel frag das Team – lieber einmal zu viel als einmal zu wenig.</p></div>
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
    const card = (r, lvl) => `<article class="rank-card reveal${r.id === mine ? ' is-mine' : ''}" style="--c:${esc(r.color)}">
        ${r.id === mine ? '<span class="rank-card__mine">Dein Rang</span>' : ''}
        <div class="rank-card__top">${rankBadge(r)}${lvl ? `<span class="rank-card__lvl">Stufe ${r.level}</span>` : ''}</div>
        <h3>${esc(r.name)}</h3><p>${esc(r.desc || '')}</p>
        ${r.perks ? `<ul>${r.perks.map((x) => `<li>${ic('check')}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}
      </article>`;
    return `<div class="page">${pageHead('Ränge', 'Vom Neuling<br><span>zur Legende.</span>', 'Dein Rang wächst mit deiner Zeit auf Civicy und mit dem, was du für deine Stadt tust. Angemeldet siehst du, wo du gerade stehst.', 'ranks')}
      <div class="page-body"><div class="wrap">
        <div class="ladder reveal" aria-label="Reihenfolge der Spielränge">${playerRanks.map((r) => `<span style="--c:${esc(r.color)}">${esc(r.name)}</span>`).join('')}</div>
        <div class="rank-grid">${playerRanks.map((r) => card(r, true)).join('')}</div>
        <h2 class="h2-sm reveal">Team &amp; Sonderränge</h2>
        <div class="rank-grid">${ranks.filter((r) => !r.level).map((r) => card(r, false)).join('')}</div>
        ${!me ? `<div class="notice reveal" style="margin-top:34px;align-items:center">${ic('user-circle')}<p style="flex:1">Melde dich mit deinem Minecraft-Konto an, um deinen Rang zu sehen.</p><button class="btn btn--brand btn--sm" type="button" data-login>Anmelden</button></div>` : ''}
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
    return `<div class="page">${pageHead('Das Team', 'Lerne das<br><span>Team kennen.</span>', 'Die Menschen hinter Civicy – von der Leitung über Entwicklung und Bau bis zum Support. Tippe auf eine Person für ihren Steckbrief.', 'team')}
      <div class="page-body"><div class="wrap">${lead || '<p class="empty">Das Team stellt sich bald vor.</p>'}
        <div class="notice reveal" style="margin-top:48px;align-items:center">${ic('rocket-launch')}<p style="flex:1"><b>Lust mitzumachen?</b> Wir suchen gerade Verstärkung.</p><a class="btn btn--brand btn--sm" href="#/karriere">Offene Stellen</a></div>
      </div></div></div>`;
  };
  const memberCard = (m) => {
    const r = rankOf(m.rank);
    return `<a class="member reveal" href="#/team/${slug(m.name)}" data-blocks-link style="--c:${esc(r.color)}">
      ${bodyImg(m, 150, 'member__body')}<b>${esc(m.name)}</b><small>${esc(m.role || r.name)}</small>${rankBadge(r)}</a>`;
  };
  pages.member = (name) => {
    const m = findMember(decodeURIComponent(name));
    if (!m) return notFound('Diese Person ist nicht (mehr) im Team.');
    const r = rankOf(m.rank);
    const others = team.filter((x) => x !== m).slice(0, 4);
    const days = m.since ? Math.max(0, Math.floor((Date.now() - new Date(m.since)) / 864e5)) : null;
    return `<div class="page"><div class="page-head" style="padding-bottom:0">${pixelsDeco('m' + m.name, 10)}<div class="wrap"><a class="back-link" href="#/team">${ic('arrow-left')}Zum Team</a></div></div>
      <div class="page-body" style="padding-top:10px"><div class="wrap">
        <div class="profile">
          <aside class="profile__card" style="--c:${esc(r.color)}">${bodyImg(m, 260, 'profile__body')}<h1>${esc(m.name)}</h1>${rankBadge(r, true)}<p class="muted">${esc(m.role || '')}</p></aside>
          <div>
            <div class="facts">
              <div class="fact"><small>Rang</small><b>${esc(r.name)}</b></div>
              <div class="fact"><small>Im Team seit</small><b>${m.since ? fmtDate(m.since) : '–'}</b>${days != null ? `<br><small>${fmtNum(days)} Tage</small>` : ''}</div>
              <div class="fact"><small>Aufgabe</small><b>${esc(m.role || r.name)}</b></div>
              <div class="fact"><small>Sprachen</small><b>${esc((m.langs || ['Deutsch']).join(', '))}</b></div>
            </div>
            <section class="block"><h2>Über ${esc(m.name)}</h2><p>${esc(m.about || r.desc || '')}</p></section>
            <section class="block"><h2>Als ${esc(r.name)}</h2><p>${esc(r.desc || '')}</p></section>
            ${others.length ? `<h2 class="h2-sm">Weitere aus dem Team</h2><div class="team-grid">${others.map(memberCard).join('')}</div>` : ''}
          </div>
        </div>
      </div></div></div>`;
  };
  pages.member.title = (name) => decodeURIComponent(name);

  // ── FAQ ──
  pages.faq = () => `<div class="page">${pageHead('Hilfe', 'Fragen,<br><span>beantwortet.</span>', 'Alles Wichtige zu Civicy, zum Beitreten, zu Rängen und zur Anmeldung.', 'faq')}
      <div class="page-body"><div class="wrap wrap--narrow">
        <div class="faq-list">${(DATA.faq || []).map((f, i) => faqItem(f, i === 0)).join('')}</div>${discordCard()}
      </div></div></div>`;

  // ── Karriere ──
  pages.karriere = () => {
    const depts = [];
    jobs.forEach((j) => { if (!depts.includes(j.dept)) depts.push(j.dept); });
    const openCount = jobs.filter((j) => j.open).length;
    return `<div class="page">${pageHead('Karriere', 'Bau Civicy<br><span>mit uns.</span>', `Wir suchen Menschen, die Lust haben, mit uns den besten Städte-Server zu bauen. Gerade ${openCount === 1 ? 'ist eine Stelle' : `sind ${openCount} Stellen`} offen.`, 'career')}
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
        list.unshift({ job: j.id, title: j.title, at: new Date().toISOString(), user: user.uuid || user.name, demo: !AUTH.session.live });
        store.set('civicy-apps', list.slice(0, 20));
      };
      if (AUTH.session.live && AUTH.api) {
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
      return `<div class="page">${pageHead('Mein Konto', 'Dein Konto.<br><span>Dein Rang.</span>', 'Melde dich mit dem Microsoft-Konto an, mit dem du Minecraft spielst. Dann siehst du hier deinen Skin, deinen Rang und deine Bewerbungen.', 'acc',
        `<div class="btn-row"><button class="btn btn--brand" type="button" data-login>${msLogo}Mit Microsoft anmelden</button><a class="btn btn--ghost" href="#/faq">Warum Microsoft?</a></div>`)}</div>`;
    }
    const r = AUTH.rank(u);
    const apps = store.get('civicy-apps', []).filter((a) => a.user === (u.uuid || u.name));
    const lvl = r.level ? playerRanks.indexOf(r) : -1;
    const next = lvl >= 0 ? playerRanks[lvl + 1] : null;
    const email = u.email ? u.email.replace(/^(.)(.*)(.@.*)$/, (m, a, b, c) => a + '•'.repeat(Math.min(6, b.length)) + c) : '';
    return `<div class="page"><div class="page-head" style="padding-bottom:30px">${pixelsDeco('acc' + u.name, 12)}<div class="wrap"><p class="eyebrow">Mein Konto</p><h1 class="display">Hallo, <span>${esc(u.name)}</span>!</h1></div></div>
      <div class="page-body" style="padding-top:0"><div class="wrap">
        <div class="account">
          <aside class="acc-hero" data-tone="dark" style="--c:${esc(r.color)}">
            ${bodyImg(u, 270, 'acc-hero__body')}<span class="acc-hero__floor" aria-hidden="true"></span>
            <h1>${esc(u.name)}</h1>${rankBadge(r, true)}
            <p style="margin-top:8px;font-size:14px">${AUTH.session.live ? `${msLogo.replace('ms-logo', 'ms-logo ms-logo--inline')}Angemeldet mit Microsoft` : 'Demo-Anmeldung (nicht bestätigt)'}</p>
          </aside>
          <div>
            <div class="facts">
              <div class="fact"><small>Rang</small><b>${esc(r.name)}</b>${next ? `<br><small>Nächster: ${esc(next.name)}</small>` : ''}</div>
              <div class="fact"><small>Angemeldet seit</small><b>${fmtDate(u.since || AUTH.session.at)}</b></div>
              <div class="fact"><small>Minecraft-UUID</small>${u.uuid ? `<button class="uuid" type="button" data-copy="${esc(u.uuid)}" title="Kopieren"><span>${esc(u.uuid)}</span>${ic('copy')}</button>` : '<b>–</b>'}</div>
              <div class="fact"><small>Microsoft-Konto</small><b>${esc(email || '–')}</b></div>
            </div>
            ${lvl >= 0 ? `<section class="block"><h2>Dein Weg</h2><div class="ladder" style="margin:6px 0 0">${playerRanks.map((x, i) => `<span style="--c:${i <= lvl ? esc(x.color) : 'var(--line-strong)'};${i <= lvl ? '' : 'color:var(--muted)'}">${esc(x.name)}</span>`).join('')}</div>${next ? `<p class="muted" style="margin-top:12px">Als ${esc(next.name)}: ${esc(next.desc)}</p>` : ''}</section>` : ''}
            <section class="block"><h2>Meine Bewerbungen</h2>${apps.length ? `<div class="app-list">${apps.map((a) => `<div class="app-row"><span><b>${esc(a.title)}</b><br><small class="muted">${fmtDate(a.at)}</small></span><span class="tag" style="--c:#FFB547">${a.demo ? 'Gespeichert (Demo)' : 'Eingegangen'}</span></div>`).join('')}</div>` : `<div class="empty">Noch keine Bewerbung. <a href="#/karriere">Offene Stellen ansehen</a></div>`}</section>
            <section class="block"><h2>Einstellungen</h2><div class="settings-list">
              <div class="setting"><span><b>Farbschema</b><small class="muted">So sieht Civicy bei dir aus.</small></span>${themeSwitch('segmented')}</div>
            </div></section>
            <div class="btn-row" style="margin-top:20px"><button class="btn btn--danger" type="button" data-logout>${ic('sign-out')}Abmelden</button></div>
          </div>
        </div>
      </div></div></div>`;
  };
  pages.konto.mount = () => { applyTheme(); return AUTH.onChange(() => { if (route().name === 'konto') render(); }); };

  function notFound(msg) {
    return `<div class="page">${pageHead('404', 'Hier ist<br><span>nichts.</span>', esc(msg || 'Diese Seite gibt es nicht.'), '404', `<div class="btn-row"><a class="btn btn--brand" href="#/">Zur Startseite</a></div>`)}</div>`;
  }

  // ─────────────────────────── Router ───────────────────────────
  const ROUTES = [
    [/^$/, 'home', 'Start'],
    [/^news$/, 'news', 'Neuigkeiten'],
    [/^news\/([^/]+)$/, 'article'],
    [/^regeln$/, 'regeln', 'Regeln'],
    [/^raenge$/, 'raenge', 'Ränge'],
    [/^team$/, 'team', 'Team'],
    [/^team\/([^/]+)$/, 'member'],
    [/^karriere$/, 'karriere', 'Karriere'],
    [/^karriere\/([^/]+)$/, 'job'],
    [/^karriere\/([^/]+)\/bewerben$/, 'apply'],
    [/^faq$/, 'faq', 'Häufige Fragen'],
    [/^konto$/, 'konto', 'Mein Konto'],
  ];
  function route() {
    const path = decodeURIComponent(location.hash.replace(/^#\/?/, '')).replace(/\/+$/, '');
    for (const [re, name, title] of ROUTES) {
      const m = path.match(re);
      if (m) return { name, arg: m[1], title, path };
    }
    return { name: 'notfound', path };
  }

  const main = $('[data-main]');
  let cleanup = null;
  let lastPath = null;
  function render() {
    const r = route();
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) {} }
    cleanup = null;
    const page = pages[r.name];
    main.innerHTML = page ? page(r.arg) : notFound();
    const t = page && (page.title ? page.title(r.arg) : r.title);
    document.title = r.name === 'home' ? 'Civicy – Minecraft Server' : `${t || 'Nicht gefunden'} – Civicy`;
    if (page && page.mount) cleanup = page.mount(main.firstElementChild || main, r.arg) || null;
    if (r.path !== lastPath) window.scrollTo(0, 0);
    lastPath = r.path;
    bindLinks(main);
    reveal(main);
    applyTheme();
    navActive(r);
    paintStatus();
  }

  // Blöcke bauen den Bildschirm zu, dann geht es weiter (Team-Steckbrief, nach der Anmeldung)
  let blocking = false;
  function blocks(then) {
    const el = $('[data-blocks]');
    if (prefersReduced || blocking) { then(); return; }
    blocking = true;
    const size = innerWidth < 700 ? 56 : 80;
    const cols = Math.ceil(innerWidth / size), rows = Math.ceil(innerHeight / size);
    el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    el.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    let cells = '';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells += `<i style="--dl:${((x + y) * 18 + Math.random() * 60).toFixed(0)}ms"></i>`;
    $$('i', el).forEach((i) => i.remove());
    el.insertAdjacentHTML('afterbegin', cells);
    el.hidden = false;
    const maxDelay = (cols + rows) * 18 + 60;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    setTimeout(() => {
      el.classList.add('is-logo');
      then();
      setTimeout(() => {
        el.classList.remove('is-logo', 'is-in');
        setTimeout(() => { el.hidden = true; blocking = false; }, maxDelay + 320);
      }, 420);
    }, maxDelay + 280);
  }

  // ─────────────────────────── Navigation ───────────────────────────
  const NAV = [
    ['', 'Start', 'house'],
    ['news', 'Neuigkeiten', 'newspaper'],
    ['regeln', 'Regeln', 'scroll'],
    ['raenge', 'Ränge', 'crown'],
    ['team', 'Team', 'users-three'],
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
        ${socials.map((k) => `<a class="menu__item" href="${esc(LINKS[k])}" target="_blank" rel="noopener">${brand(k)}<span>${k[0].toUpperCase() + k.slice(1)}</span>${ic('arrow-up-right')}</a>`).join('')}
        ${themeSwitch()}
      </nav>`;
    } else {
      const u = AUTH.user; const r = AUTH.rank(u);
      panel.innerHTML = `<div class="acc-card" style="--rank-color:${esc(r.color)}">${headImg(u, 54, 'acc-card__head', '')}<span><b>${esc(u.name)}</b>${rankBadge(r)}</span></div>
        <nav class="menu" aria-label="Konto">
          <a class="menu__item" href="#/konto" data-nav-key="konto">${ic('user-circle')}<span>Mein Konto</span></a>
          <a class="menu__item" href="#/raenge">${ic('crown')}<span>Mein Rang</span><small>${esc(r.name)}</small></a>
          <a class="menu__item" href="#/karriere">${ic('briefcase')}<span>Bewerben</span></a>
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
    if (!$('[data-auth]').hidden) closeAuth();
    else if (panelMode) { closePanel(); btnMenu.focus(); }
  });
  // Leiste beim Runterscrollen ausblenden, beim Hochscrollen zeigen
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (!panelMode) nav.classList.toggle('is-hidden', y > 240 && y > lastY + 4);
    if (y < lastY - 4 || y < 240) nav.classList.remove('is-hidden');
    lastY = y;
  }, { passive: true });

  // ─────────────────────────── Anmeldung: eigene Oberfläche ───────────────────────────
  const authEl = $('[data-auth]');
  let authState = { step: 'email', email: '' };
  let lastFocus = null;
  function openAuth(state) {
    closePanel();
    lastFocus = document.activeElement;
    authState = Object.assign({ step: 'email', email: store.get('civicy-last-email', '') }, state || {});
    authEl.hidden = false;
    document.body.style.overflow = 'hidden';
    paintAuth();
  }
  function closeAuth() {
    if (authState.step === 'finishing') return;
    authEl.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function paintAuth() {
    const s = authState;
    const live = AUTH.isLive();
    const who = `<div class="auth__who"><span class="auth__who-ava">${esc((s.email || '?')[0])}</span><span><small class="muted">Microsoft-Konto</small><b>${esc(s.email)}</b></span><button type="button" data-auth-step="email">Ändern</button></div>`;
    let body = '';
    if (s.step === 'email') {
      body = `<span class="auth__ms">${msLogo}Microsoft-Konto</span>
        <h2 class="auth__title" id="auth-title">Anmelden</h2>
        <p class="auth__sub">Mit dem Microsoft-Konto, mit dem du Minecraft spielst. So sehen wir sicher, wer du im Spiel bist.</p>
        <form class="form" data-auth-form="email" novalidate>
          <label class="field"><span>E-Mail-Adresse</span><div class="input-icon">${ic('at')}<input class="input" name="email" type="email" inputmode="email" autocomplete="email" placeholder="name@outlook.de" value="${esc(s.email)}" required></div></label>
          <p class="field__err" data-auth-err hidden></p>
          <button class="btn btn--brand btn--block" type="submit">Weiter${ic('arrow-right', 'ic--move')}</button>
        </form>
        <div class="auth__or">oder</div>
        <button class="btn btn--ms btn--block" type="button" data-auth-ms>${msLogo}Konto bei Microsoft auswählen</button>
        ${live ? '' : '<p class="auth__demo"><b>Demo-Modus:</b> Die Verbindung zu Microsoft ist noch nicht eingerichtet. Nach der E-Mail fragen wir nur deinen Minecraft-Namen ab.</p>'}`;
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
    } else if (s.step === 'demo') {
      body = `${who}
        <h2 class="auth__title" id="auth-title">Dein Minecraft-Name</h2>
        <p class="auth__sub">Mit welchem Namen spielst du? Wir holen dazu deinen Skin.</p>
        <form class="form" data-auth-form="demo" novalidate>
          <label class="field"><span>Minecraft-Name</span><div class="input-icon">${ic('game-controller')}<input class="input" name="name" autocomplete="nickname" autocapitalize="off" spellcheck="false" maxlength="16" placeholder="z. B. Steve" value="${esc(s.name || '')}" required></div></label>
          <p class="field__err" data-auth-err hidden></p>
          <button class="btn btn--brand btn--block" type="submit">Anmelden${ic('arrow-right', 'ic--move')}</button>
        </form>
        <p class="auth__demo"><b>Demo-Modus:</b> Der Name wird nicht bestätigt. Sobald Backend und Microsoft-App eingerichtet sind (config.js), läuft hier die echte Anmeldung.</p>`;
    } else if (s.step === 'finishing') {
      const rows = [['microsoft', 'Microsoft-Konto bestätigen'], ['xbox', 'Bei Xbox Live anmelden'], ['minecraft', 'Minecraft-Profil laden'], ['rank', 'Rang auf Civicy abrufen']];
      body = `<h2 class="auth__title" id="auth-title">Einen Moment …</h2>
        <p class="auth__sub">Wir verbinden dein Microsoft-Konto mit Civicy.</p>
        <div class="chain">${rows.map(([k, t]) => `<div class="chain__row" data-chain="${k}"><span class="chain__dot">${ic('check')}</span>${t}</div>`).join('')}</div>`;
    } else if (s.step === 'error') {
      body = `<div class="done" style="padding:20px 0"><div class="done__icon" style="color:var(--bad);background:rgba(255,93,108,.12);box-shadow:none">${ic('warning')}</div>
        <h2 class="auth__title" id="auth-title" style="margin-top:0">Das hat nicht geklappt</h2><p class="auth__sub">${esc(s.error || 'Unbekannter Fehler.')}</p>
        <button class="btn btn--brand" type="button" data-auth-step="email">Noch einmal versuchen</button></div>`;
    } else if (s.step === 'welcome') {
      const u = AUTH.user; const r = AUTH.rank(u);
      body = `<div class="welcome">${bodyImg(u, 220, 'welcome__body')}<p class="eyebrow" style="margin:10px 0 0">Angemeldet</p><h2 class="auth__title" id="auth-title" style="margin:0">Willkommen, ${esc(u.name)}!</h2>${rankBadge(r, true)}
        <div class="btn-row" style="justify-content:center;margin-top:20px"><button class="btn btn--brand" type="button" data-auth-done>Los geht's${ic('arrow-right', 'ic--move')}</button><a class="btn btn--ghost" href="#/konto" data-auth-done>Mein Konto</a></div></div>`;
    }
    authEl.innerHTML = `<div class="auth__backdrop" data-auth-close></div>
      <div class="auth__panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div class="auth__art" data-tone="dark"><div class="auth__art-bg" aria-hidden="true"></div>
          <img class="auth__art-logo" src="assets/img/logo-sm.webp" alt="Civicy">
          <div><h2>Deine Stadt wartet.</h2><p>Mit deinem Minecraft-Konto siehst du deinen Rang, bewirbst dich im Team und bleibst auf allen Geräten angemeldet.</p>
            <div class="auth__perks"><span>${ic('crown')}Dein Rang und Skin</span><span>${ic('briefcase')}Bewerbungen fürs Team</span><span>${ic('lock-simple')}Passwort nur bei Microsoft</span></div></div>
        </div>
        <div class="auth__main">
          ${s.step !== 'finishing' ? `<button class="round-btn auth__close" type="button" data-auth-close aria-label="Schließen">${ic('x')}</button>` : ''}
          <div class="auth__step">${body}
            ${['email', 'confirm', 'demo'].includes(s.step) ? '<p class="auth__legal">Mit der Anmeldung akzeptierst du die <a href="terms.html">Nutzungsbedingungen</a> und die <a href="privacy.html">Datenschutzerklärung</a>.</p>' : ''}
          </div>
        </div>
      </div>`;
    const f = $('input', authEl);
    if (f) setTimeout(() => f.focus(), 60);
  }
  const authFail = (err) => { authState.step = 'error'; authState.error = err.message; paintAuth(); };
  const authErr = (msg) => { const e = $('[data-auth-err]', authEl); if (e) { e.textContent = msg; e.hidden = !msg; } const i = $('.input', authEl); if (i) i.classList.toggle('is-bad', !!msg); };
  authEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-auth-close]')) return closeAuth();
    const st = e.target.closest('[data-auth-step]');
    if (st) { authState.step = st.dataset.authStep; return paintAuth(); }
    if (e.target.closest('[data-auth-ms]')) {
      if (AUTH.isLive()) { e.target.closest('button').innerHTML = '<span class="spinner"></span>Weiterleitung …'; AUTH.startMicrosoft('').catch(authFail); }
      else { authState.step = 'email'; paintAuth(); authErr('Im Demo-Modus gib bitte zuerst eine E-Mail-Adresse ein.'); }
      return;
    }
    if (e.target.closest('[data-auth-go]')) { const b = e.target.closest('button'); b.disabled = true; b.innerHTML = '<span class="spinner"></span>Weiterleitung zu Microsoft …'; AUTH.startMicrosoft(authState.email).catch(authFail); return; }
    if (e.target.closest('[data-auth-done]')) { closeAuth(); if (route().name === 'apply' || route().name === 'konto' || route().name === 'raenge') render(); }
  });
  authEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    if (form.dataset.authForm === 'email') {
      const email = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return authErr('Bitte gib eine gültige E-Mail-Adresse ein.');
      authState.email = email;
      store.set('civicy-last-email', email);
      authState.step = AUTH.isLive() ? 'confirm' : 'demo';
      paintAuth();
    } else if (form.dataset.authForm === 'demo') {
      const name = form.name.value.trim();
      if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return authErr('Minecraft-Namen haben 3 bis 16 Zeichen: Buchstaben, Ziffern und _.');
      authState.name = name;
      const btn = $('button[type=submit]', form);
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Skin wird geladen …';
      AUTH.demoLogin(authState.email, name)
        .then(() => welcome())
        .catch((err) => { btn.disabled = false; btn.innerHTML = 'Anmelden' + ic('arrow-right', 'ic--move'); authErr(err.message); });
    }
  });
  function welcome() {
    blocks(() => { authState.step = 'welcome'; paintAuth(); paintNav(); render(); });
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
      if (['konto', 'raenge', 'apply'].includes(route().name)) render();
      return;
    }
    const th = t.closest('[data-theme-set]');
    if (th) { setTheme(th.dataset.themeSet); return; }
    const sc = t.closest('[data-scroll-to]');
    if (sc) { const el = $(sc.dataset.scrollTo); if (el) el.scrollIntoView({ behavior: 'smooth' }); return; }
    const bl = t.closest('[data-blocks-link]');
    if (bl && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      const href = bl.getAttribute('href');
      blocks(() => { location.hash = href; });
    }
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
  addEventListener('hashchange', () => { closePanel(); render(); });
  const callback = AUTH.readCallback();
  paintNav();
  footer();
  render();
  handleCallback(callback);
  AUTH.refresh().then(paintNav);
  loadStatus().then(paintStatus);

  // Offline-Speicher für schnelleres Laden (nur über https bzw. localhost)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
