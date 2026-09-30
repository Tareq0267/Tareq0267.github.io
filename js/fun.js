/* Playful extras for the editorial page: letters that ripple under the cursor,
   glyph-scramble labels, directional hover fills,
   a corner section indicator and stats that count again on hover.
   Called by js/site.js after js/style-editorial.js. */
window.initFun = function () {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  const hasSplit = typeof SplitText !== 'undefined';

  /* =========================================================
     GLYPH SCRAMBLE: text decodes itself into place
  ========================================================= */
  const GLYPHS = '!<>-_\\/[]{}=+*^?#@$%&01';
  function scramble(el) {
    const text = el.dataset.text || (el.dataset.text = el.textContent);
    if (reduceMotion) { el.textContent = text; return; }
    cancelAnimationFrame(el._scramble);
    const settle = Array.from(text, (_, i) => 4 + i * 1.4 + Math.random() * 8);
    const end = Math.max(...settle);
    let frame = 0;
    (function tick() {
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        out += frame >= settle[i] || ch === ' ' ? ch : GLYPHS[Math.random() * GLYPHS.length | 0];
      }
      el.textContent = out;
      if (frame++ < end) el._scramble = requestAnimationFrame(tick);
      else el.textContent = text;
    })();
  }

  // Labels decode once as they scroll in, and again whenever you hover them
  const scrambleTargets = document.querySelectorAll(
    '.section-head .label, .about-head .h6, .exp .when, .honour .meta .p6:first-child, .menu-links .h2, .hero-bottom > span'
  );
  const seen = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    seen.unobserve(en.target);
    scramble(en.target);
  }), { rootMargin: '0px 0px -15% 0px' });
  scrambleTargets.forEach(el => {
    if (!el.closest('.menu')) seen.observe(el);
    if (fine) el.addEventListener('mouseenter', () => scramble(el));
  });
  // menu links decode each time the menu opens
  document.getElementById('menuToggle').addEventListener('click', () => {
    if (document.documentElement.classList.contains('menu-open')) {
      document.querySelectorAll('.menu-links .h2').forEach((el, i) => setTimeout(() => scramble(el), 120 + i * 60));
    }
  });

  /* =========================================================
     LETTERS: the big names ripple as the cursor passes,
     click a letter and it jumps and flips
  ========================================================= */
  function playfulLetters(chars, area) {
    if (!fine || reduceMotion || !hasGsap || !chars.length) return;
    const items = chars.map(c => ({
      c,
      y: gsap.quickTo(c, 'y', { duration: .6, ease: 'power3' }),
      r: gsap.quickTo(c, 'rotation', { duration: .6, ease: 'power3' })
    }));
    let awake = false;
    addEventListener('pointermove', e => {
      const box = area.getBoundingClientRect();
      const near = e.clientY > box.top - 120 && e.clientY < box.bottom + 120;
      if (!near && !awake) return;
      awake = near;
      for (const it of items) {
        const r = it.c.getBoundingClientRect();
        const lift = gsap.getProperty(it.c, 'y');
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2 - lift);
        const f = near ? Math.exp(-(dx * dx) / (2 * 110 * 110)) * Math.exp(-(dy * dy) / (2 * 300 * 300)) : 0;
        it.y(-f * r.height * .16);
        it.r(-f * Math.sign(dx) * 7);
      }
    }, { passive: true });
    chars.forEach(c => {
      c.style.cursor = 'pointer';
      c.addEventListener('click', () => {
        if (c._jumping) return;
        c._jumping = true;
        gsap.timeline({ onComplete: () => { c._jumping = false; } })
          .to(c, { yPercent: -38, duration: .28, ease: 'power2.out' })
          .to(c, { scaleX: -1, duration: .22, ease: 'power1.inOut' }, 0)
          .to(c, { scaleX: 1, duration: .22, ease: 'power1.inOut' }, .22)
          .to(c, { yPercent: 0, duration: .7, ease: 'bounce.out' }, .28);
      });
    });
  }

  // Hero name: its letters are split by the intro animation
  document.addEventListener('hero:ready', e => {
    const split = e.detail;
    (split.masks || []).forEach(m => { m.style.overflow = 'visible'; });
    playfulLetters(split.chars, document.querySelector('.hero-name'));
  });

  // Footer name
  if (hasSplit && fine && !reduceMotion) {
    const footerName = document.querySelector('.contact-name .fit');
    if (footerName) {
      const split = SplitText.create(footerName, { type: 'chars' });
      window.dispatchEvent(new Event('resize')); // refit to the container width
      playfulLetters(split.chars, footerName.parentElement);
    }
  }

  /* =========================================================
     DIRECTIONAL HOVER FILLS: news rows and skill cells fill with ink
     from the edge the cursor comes in from, and drain out the way it leaves
  ========================================================= */
  if (fine) {
    function nearestEdge(el, e, sidesToo) {
      const r = el.getBoundingClientRect();
      const d = { top: e.clientY - r.top, bottom: r.bottom - e.clientY };
      if (sidesToo) { d.left = e.clientX - r.left; d.right = r.right - e.clientX; }
      return Object.keys(d).reduce((a, b) => (d[a] < d[b] ? a : b));
    }
    document.querySelectorAll('.honour, .skill').forEach(el => {
      const sidesToo = el.classList.contains('skill');
      el.classList.add('fillable');
      el.addEventListener('pointerenter', e => {
        el.dataset.from = nearestEdge(el, e, sidesToo);
        requestAnimationFrame(() => el.classList.add('is-hot'));
      });
      el.addEventListener('pointerleave', e => {
        el.dataset.from = nearestEdge(el, e, sidesToo);
        el.classList.remove('is-hot');
      });
    });
  }

  /* =========================================================
     SECTION INDICATOR: "04 / 08 · Experience", decoded on change
  ========================================================= */
  const indicator = document.querySelector('.indicator');
  if (indicator) {
    const sections = [...document.querySelectorAll('main > section[data-label]')];
    const num = indicator.querySelector('.ind-num');
    const name = indicator.querySelector('.ind-name');
    indicator.querySelector('.ind-total').textContent = String(sections.length).padStart(2, '0');
    const obs = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const i = sections.indexOf(en.target);
      num.textContent = String(i + 1).padStart(2, '0');
      name.dataset.text = en.target.dataset.label;
      scramble(name);
    }), { rootMargin: '-50% 0px -50% 0px' });
    sections.forEach(s => obs.observe(s));
  }

  /* =========================================================
     STATS: hover a number and it counts up again
  ========================================================= */
  if (fine && hasGsap && !reduceMotion) {
    document.querySelectorAll('.stats .stat').forEach(stat => {
      const el = stat.querySelector('[data-counter]');
      if (!el) return;
      stat.addEventListener('mouseenter', () => {
        const end = parseFloat(el.dataset.counter);
        const dec = parseInt(el.dataset.decimals || '0', 10);
        const obj = { v: end >= 1000 ? end - 25 : 0 };
        gsap.to(obj, { v: end, duration: .9, ease: 'power3.out', overwrite: true, onUpdate: () => { el.textContent = obj.v.toFixed(dec); } });
      });
    });
  }
};
