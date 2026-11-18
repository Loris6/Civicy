/* Civicy – rechtliche Seiten: Angaben aus config.js einsetzen, Theme übernehmen */
(function () {
  var L = (window.CIVICY_CONFIG && window.CIVICY_CONFIG.legal) || {};
  var S = (window.CIVICY_CONFIG && window.CIVICY_CONFIG.server) || {};
  document.querySelectorAll('[data-legal]').forEach(function (el) {
    var k = el.getAttribute('data-legal');
    var v = k === 'ip' ? S.ip : L[k];
    if (!v) return;
    if (k === 'email') { el.textContent = v; if (el.tagName === 'A') el.href = 'mailto:' + v; }
    else el.textContent = v;
  });
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
