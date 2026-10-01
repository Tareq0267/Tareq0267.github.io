/* Playful extras for the editorial page: the moon-pop theme flip, letters that ripple under the cursor,
   glyph-scramble labels, directional hover fills,
   a corner section indicator and stats that count again on hover.
   Called by js/site.js after js/style-editorial.js. */
window.initFun = function () {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  const hasSplit = typeof SplitText !== 'undefined';

  /* =========================================================
     HOVER TRACKER: what is under the cursor, re-checked on scroll.
     Browsers only fire hover events when the mouse itself moves, so a
     page scrolling under a still cursor would otherwise trigger nothing.
  ========================================================= */
  const hover = { x: -1, y: -1, inside: false };
  const kinds = [];      // { selector, enter, leave, cur }
  const movers = [];     // fn(x, y, inside), run on every pointer move and scroll
  // enter/leave are called with the element and a { clientX, clientY } point
  function track(selector, enter, leave) { kinds.push({ selector, enter, leave, cur: null }); }
  function updateHover() {
    const target = hover.inside ? document.elementFromPoint(hover.x, hover.y) : null;
    const point = { clientX: hover.x, clientY: hover.y };
    for (const k of kinds) {
      const el = target ? target.closest(k.selector) : null;
      if (el === k.cur) continue;
      if (k.cur && k.leave) k.leave(k.cur, point);
      k.cur = el;
      if (el && k.enter) k.enter(el, point);
    }
    for (const fn of movers) fn(hover.x, hover.y, hover.inside);
  }
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    hover.x = e.clientX; hover.y = e.clientY; hover.inside = true;
    updateHover();
  }, { passive: true });
  document.addEventListener('pointerleave', e => {
    if (e.pointerType === 'touch') return;
    hover.inside = false; updateHover();
  });
  // Touch: whatever is under the finger lights up, during taps and scrolls alike.
  // When the finger lifts the last thing touched stays lit until the next touch.
  function onTouch(e) {
    const t = e.touches[0];
    if (!t) return;
    hover.x = t.clientX; hover.y = t.clientY; hover.inside = true;
    updateHover();
  }
  addEventListener('touchstart', onTouch, { passive: true });
  addEventListener('touchmove', onTouch, { passive: true });
  addEventListener('touchend', e => { if (!e.touches.length) hover.inside = false; }, { passive: true });
  {
    let queued = false;
    addEventListener('scroll', () => {
      if (queued || !hover.inside) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; updateHover(); });
    }, { passive: true });
  }

  /* =========================================================
     EASTER EGG: popping the hero's moon (js/dither.js) flips the theme.
     A circle grows from the moon until it covers the screen, then the
     colours are switched for real and the choice is remembered.
  ========================================================= */
  const root = document.documentElement;
  function setInverted(on) {
    root.classList.toggle('inverted', on);
    try { localStorage.setItem('site-inverted', on ? '1' : '0'); } catch (e) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = on ? '#2c2824' : '#a89474';
    if (window.Dither && Dither.refresh) Dither.refresh();
  }
  if (root.classList.contains('inverted')) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = '#2c2824';
  }
  document.addEventListener('moon:pop', e => {
    if (root.classList.contains('theme-flipping')) return;
    const next = !root.classList.contains('inverted');
    if (reduceMotion) { setInverted(next); return; }
    const { x, y } = e.detail;
    const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 8;
    const wipe = document.createElement('div');
    wipe.className = 'theme-wipe';
    wipe.style.cssText = `left:${x}px;top:${y}px;width:${reach * 2}px;height:${reach * 2}px`;
    document.body.appendChild(wipe);
    root.classList.add('theme-flipping');
    const anim = wipe.animate(
      [{ transform: 'translate(-50%, -50%) scale(0)' }, { transform: 'translate(-50%, -50%) scale(1)' }],
      { duration: 1100, easing: 'cubic-bezier(.65,.05,.36,1)', fill: 'forwards' }
    );
    // ease the art's shading across while the circle grows
    (function mix() {
      if (!wipe.isConnected || !window.Dither) return;
      Dither.flipMix = Math.min(1, (anim.currentTime || 0) / 1100);
      requestAnimationFrame(mix);
    })();
    anim.onfinish = () => {
      // switch and redraw in the same frame the circle is removed, so nothing flashes
      if (window.Dither) Dither.flipMix = 0;
      setInverted(next);
      wipe.remove();
      root.classList.remove('theme-flipping');
    };
  });

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

  // Labels decode once as they scroll in, and again whenever the cursor lands on them
  const SCRAMBLE = '.section-head .label, .about-head .h6, .exp .when, .honour .meta .p6:first-child, .menu-links .h2, .hero-bottom > span';
  const seen = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    seen.unobserve(en.target);
    scramble(en.target);
  }), { rootMargin: '0px 0px -15% 0px' });
  document.querySelectorAll(SCRAMBLE).forEach(el => { if (!el.closest('.menu')) seen.observe(el); });
  track(SCRAMBLE, el => scramble(el));
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
    if (reduceMotion || !hasGsap || !chars.length) return;
    const items = chars.map(c => ({
      c,
      y: gsap.quickTo(c, 'y', { duration: .6, ease: 'power3' }),
      r: gsap.quickTo(c, 'rotation', { duration: .6, ease: 'power3' })
    }));
    let awake = false;
    movers.push((x, y, inside) => {
      const box = area.getBoundingClientRect();
      const near = inside && y > box.top - 120 && y < box.bottom + 120;
      if (!near && !awake) return;
      awake = near;
      for (const it of items) {
        const r = it.c.getBoundingClientRect();
        const lift = gsap.getProperty(it.c, 'y');
        const dx = x - (r.left + r.width / 2);
        const dy = y - (r.top + r.height / 2 - lift);
        const f = near ? Math.exp(-(dx * dx) / (2 * 110 * 110)) * Math.exp(-(dy * dy) / (2 * 300 * 300)) : 0;
        it.y(-f * r.height * .16);
        it.r(-f * Math.sign(dx) * 7);
      }
    });
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
  if (hasSplit && !reduceMotion) {
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
  function nearestEdge(el, e, sidesToo) {
    const r = el.getBoundingClientRect();
    const d = { top: e.clientY - r.top, bottom: r.bottom - e.clientY };
    if (sidesToo) { d.left = e.clientX - r.left; d.right = r.right - e.clientX; }
    return Object.keys(d).reduce((a, b) => (d[a] < d[b] ? a : b));
  }
  document.querySelectorAll('.honour, .skill').forEach(el => el.classList.add('fillable'));
  const touchUI = matchMedia('(hover: none)').matches;

  if (!touchUI) {
    track('.honour, .skill', (el, e) => {
      el.dataset.from = nearestEdge(el, e, el.classList.contains('skill'));
      requestAnimationFrame(() => { if (kinds.some(k => k.cur === el)) el.classList.add('is-hot'); });
    }, (el, e) => {
      el.dataset.from = nearestEdge(el, e, el.classList.contains('skill'));
      el.classList.remove('is-hot');
    });

    // Experience files turn ink while the cursor is on them
    track('#experience .exp', el => el.classList.add('is-hot'), el => el.classList.remove('is-hot'));
  } else {
    /* On phones there is no hover: a spotlight line 40% down the screen lights
       whichever news row, experience file or skill it crosses as you scroll.
       Scrolling down, ink rises from the bottom and the item you leave drains
       upwards; scrolling up, the reverse. */
    const SPOT = .4;
    const items = [...document.querySelectorAll('.honour, #experience .exp')];

    // Skills are short cells, so on/off fills hopped and snapped. Instead one ink block
    // glides along the list and settles on the skill under the spotlight line; it
    // blends by difference, so text it covers flips colour even mid-way across a cell.
    const grid = document.querySelector('.skills-grid');
    if (grid) {
      const skills = [...grid.querySelectorAll('.skill')];
      const block = document.createElement('div');
      block.className = 'skill-spot';
      block.setAttribute('aria-hidden', 'true');
      grid.appendChild(block);
      grid.classList.add('has-spot');
      let top = 0, height = 0, alpha = 0, near = false;
      new IntersectionObserver(([en]) => { near = en.isIntersecting; }, { rootMargin: '50% 0px' }).observe(grid);
      (function glide() {
        if (near) {
          const line = innerHeight * SPOT, g = grid.getBoundingClientRect();
          const cell = skills.find(s => { const r = s.getBoundingClientRect(); return r.top <= line && r.bottom > line; });
          if (cell) {
            const r = cell.getBoundingClientRect();
            const tTop = r.top - g.top, tH = r.height;
            if (alpha < .02) { top = tTop; height = tH; }   // appear in place, don't fly in from afar
            top += (tTop - top) * .16;
            height += (tH - height) * .16;
          }
          alpha += ((cell ? 1 : 0) - alpha) * .14;
          block.style.transform = `translateY(${top}px)`;
          block.style.height = height + 'px';
          block.style.opacity = alpha.toFixed(3);
        }
        requestAnimationFrame(glide);
      })();
    }
    const lit = new Set();
    let lastY = scrollY, down = true, queued = false;
    function spotlight() {
      queued = false;
      if (scrollY !== lastY) { down = scrollY > lastY; lastY = scrollY; }
      const line = innerHeight * SPOT;
      for (const el of items) {
        const r = el.getBoundingClientRect();
        const on = r.top <= line && r.bottom > line;
        if (on === lit.has(el)) continue;
        if (on) {
          lit.add(el);
          el.dataset.from = down ? 'bottom' : 'top';
          requestAnimationFrame(() => { if (lit.has(el)) el.classList.add('is-hot'); });
        } else {
          lit.delete(el);
          el.dataset.from = down ? 'top' : 'bottom';
          el.classList.remove('is-hot');
        }
      }
    }
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(spotlight); } }, { passive: true });
    addEventListener('resize', spotlight);
    spotlight();
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
     STATS: land on a number and it counts up again
  ========================================================= */
  if (hasGsap && !reduceMotion) {
    track('.stats .stat', stat => {
      const el = stat.querySelector('[data-counter]');
      if (!el) return;
      const end = parseFloat(el.dataset.counter);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const obj = { v: end >= 1000 ? end - 25 : 0 };
      gsap.to(obj, { v: end, duration: .9, ease: 'power3.out', overwrite: true, onUpdate: () => { el.textContent = obj.v.toFixed(dec); } });
    });
  }
};
