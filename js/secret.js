/* Secret: type "safa" or "alvy" anywhere on the page and it opens us/ (Adam & Alvy).
   Phones have no keyboard on the page, so typing the name on its own into the
   Rumi to Jawi box does it too. */
(function () {
  const NAMES = ['safa', 'alvy'];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let typed = '', going = false;
  // opened straight from disk there is no server to turn us/ into us/index.html
  const TARGET = location.protocol === 'file:' ? 'us/index.html' : 'us/';

  function go() {
    if (going) return;
    going = true;
    if (reduceMotion) { location.href = TARGET; return; }
    // a wine-coloured curtain with a beating heart, then off to us/
    const veil = document.createElement('div');
    veil.setAttribute('aria-hidden', 'true');
    veil.style.cssText = 'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;' +
      'background:#3b1e26;color:#c39a94;font:72px/1 serif;opacity:0;transition:opacity .5s ease;';
    veil.innerHTML = '<span style="display:inline-block;transform:scale(.3);transition:transform .7s cubic-bezier(.3,1.6,.5,1)">♥</span>';
    document.body.appendChild(veil);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      veil.style.opacity = '1';
      veil.firstChild.style.transform = 'scale(1)';
    }));
    setTimeout(() => { location.href = TARGET; }, 900);
  }

  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    // typing in a field is just typing (the Jawi box is handled below)
    if (t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (!/^[a-z]$/i.test(e.key)) { typed = ''; return; }
    typed = (typed + e.key.toLowerCase()).slice(-8);
    if (NAMES.some(n => typed.endsWith(n))) go();
  });

  document.addEventListener('input', e => {
    const t = e.target;
    if (!t.classList || !t.classList.contains('try-input')) return;
    if (NAMES.includes(t.value.trim().toLowerCase())) go();
  });

  // coming back with the browser's back button: don't leave the curtain up
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    going = false;
    typed = '';
    document.querySelectorAll('body > div[aria-hidden="true"][style*="z-index:9999"]').forEach(v => v.remove());
  });
})();
