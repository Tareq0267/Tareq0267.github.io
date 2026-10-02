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
