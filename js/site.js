/* Page behaviour outside the animations: remembering the style switch
   choice and the project tabs. Starts js/style-editorial.js at the end. */
(function () {
  document.querySelectorAll('.style-switch a').forEach(a => a.addEventListener('click', () => {
    try { localStorage.setItem('site-style', a.dataset.style); } catch (e) {}
  }));

  /* =========================================================
     PROJECT SCREENSHOTS: a tap shows the real screenshot (hover does it on desktop)
  ========================================================= */
  document.querySelectorAll('.panel-shot').forEach(fig => {
    fig.addEventListener('click', () => {
      if (matchMedia('(hover: hover)').matches) return;
      fig.classList.toggle('reveal');
    });
  });

  /* =========================================================
     ABOUT PORTRAIT: click or tap switches between dithered and the real photo
  ========================================================= */
  document.querySelectorAll('.about-photo .photo-view').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));
    });
    // the peek circle follows the cursor
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      btn.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* =========================================================
     RUMI TO JAWI "TRY IT HERE": the 1.6 MB dictionary (js/rumitojawi.js) only
     loads when someone opens the panel or types; until then letters are
     transliterated with a simple built-in letter map.
  ========================================================= */
  const tryBox = document.querySelector('.try-jawi');
  if (tryBox) {
    const input = tryBox.querySelector('.try-input');
    const output = tryBox.querySelector('.try-output');
    const letters = { a: 'ا', b: 'ب', c: 'چ', d: 'د', e: 'ي', f: 'ف', g: 'ڬ', h: 'ه', i: 'ي', j: 'ج', k: 'ك', l: 'ل', m: 'م', n: 'ن',
      o: 'و', p: 'ڤ', q: 'ق', r: 'ر', s: 'س', t: 'ت', u: 'و', v: 'ۏ', w: 'و', x: 'كس', y: 'ي', z: 'ز' };
    const rough = text => text.toLowerCase().replace(/ng/g, 'ڠ').replace(/ny/g, 'ڽ').replace(/sy/g, 'ش')
      .replace(/kh/g, 'خ').replace(/[a-z]/g, ch => letters[ch] || ch);
    let state = 'idle';   // idle -> loading -> ready
    function render() {
      const text = input.value;
      output.textContent = state === 'ready' && window.translateRumiToJawi ? window.translateRumiToJawi(text) : rough(text);
    }
    function loadDictionary() {
      if (state !== 'idle') return;
      state = 'loading';
      tryBox.classList.add('loading');
      const s = document.createElement('script');
      s.src = 'js/rumitojawi.js';
      s.onload = () => { state = 'ready'; tryBox.classList.remove('loading'); render(); };
      s.onerror = () => { state = 'idle'; tryBox.classList.remove('loading'); };
      document.body.appendChild(s);
    }
    input.addEventListener('input', () => { loadDictionary(); render(); });
    input.addEventListener('focus', loadDictionary);
    const tab = document.querySelector('[aria-controls="' + tryBox.closest('.panel').id + '"]');
    if (tab) tab.addEventListener('click', loadDictionary);
    render();
  }

  /* =========================================================
     PROJECT TABS
  ========================================================= */
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const projectArt = document.querySelector('.panel-art canvas');

  function selectTab(tab, focus) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (on) {
        panel.classList.remove('anim'); void panel.offsetWidth; panel.classList.add('anim');
        const slot = panel.querySelector('.panel-art');
        if (projectArt && slot) {
          slot.appendChild(projectArt);
          if (projectArt.__dither) projectArt.__dither.setScene(slot.dataset.scene);
        }
      }
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', e => {
      const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      selectTab(tabs[(i + dir + tabs.length) % tabs.length], true);
    });
  });

  if (typeof window.initStyle === 'function') window.initStyle();
  if (typeof window.initFun === 'function') window.initFun();
})();
