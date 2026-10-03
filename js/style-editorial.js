/* Editorial style behaviour: preloader, Lenis smooth scroll, menu overlay,
   GSAP reveals and the dithered scenes. Called by js/site.js. */
window.initStyle = function () {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const root = document.documentElement;

  /* =========================================================
     DITHERED SCENES
  ========================================================= */
  if (window.Dither) Dither.init();

  /* =========================================================
     CURSOR: dot + lagging ring with labels, lens over the art,
     magnetic buttons. Mouse and trackpad only.
  ========================================================= */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) (function () {
    const el = document.createElement('div');
    el.className = 'cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="cursor-ring-pos"><div class="cursor-ring"><span class="cursor-label p6"></span></div></div><div class="cursor-dot"></div>';
    document.body.appendChild(el);
    const ringPos = el.firstChild, dot = el.lastChild, label = el.querySelector('.cursor-label');
    root.classList.add('has-cursor', 'cursor-hidden');

    let x = -100, y = -100, rx = -100, ry = -100;
    let hot = null;        // interactive element under the pointer
    let magnet = null;     // element being pulled toward the pointer

    function labelFor(t) {
      const a = t.closest('a, button');
      if (!a) return null;
      if (a.dataset.cursor) return a.dataset.cursor;
      if (a.getAttribute('role') === 'tab') return 'View';
      if (a.hasAttribute('download')) return 'Save';
      if (a.target === '_blank' || a.protocol === 'mailto:') return 'Open';
      return '';
    }

    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      root.classList.remove('cursor-hidden');
    }, { passive: true });
    document.addEventListener('pointerleave', () => root.classList.add('cursor-hidden'));
    addEventListener('pointerdown', () => root.classList.add('cursor-down'));
    addEventListener('pointerup', () => root.classList.remove('cursor-down'));

    // what the cursor is over; also re-checked when the page scrolls under a still cursor
    function setTarget(t) {
      root.classList.toggle('cursor-on-dark', !!t.closest('.section.dark, .menu'));
      // buttons get pulled toward the pointer; other links get a labelled bubble
      const m = t.closest('.btn, .menu-toggle, .style-switch a, .brand');
      if (magnet && magnet !== m) magnet.style.translate = '';
      magnet = m;
      const text = m ? null : labelFor(t);
      hot = m || (text === null ? null : t.closest('a, button'));
      root.classList.toggle('cursor-magnet', !!m);
      root.classList.toggle('cursor-link', !m && hot !== null);
      label.textContent = text || '';
    }
    document.addEventListener('pointerover', e => setTarget(e.target));
    let scrollQueued = false;
    addEventListener('scroll', () => {
      if (scrollQueued || root.classList.contains('cursor-hidden')) return;
      scrollQueued = true;
      requestAnimationFrame(() => {
        scrollQueued = false;
        const t = document.elementFromPoint(x, y);
        if (t) setTarget(t);
      });
    }, { passive: true });

    (function loop() {
      rx += (x - rx) * .2;
      ry += (y - ry) * .2;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ringPos.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      if (window.Dither) Dither.suppressLens = !!hot;
      root.classList.toggle('cursor-lens', !hot && !!(window.Dither && Dither.lensHover));
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
        magnet.style.translate = `${dx * .22}px ${dy * .3}px`;
      }
      requestAnimationFrame(loop);
    })();
  })();

  /* =========================================================
     FIT TEXT: scale the big name to the full container width
  ========================================================= */
  function fitText() {
    document.querySelectorAll('.fit').forEach(el => {
      el.style.fontSize = '100px';
      const ratio = el.parentElement.clientWidth / el.scrollWidth;
      el.style.fontSize = (100 * ratio * 0.995) + 'px';
    });
  }
  fitText();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitText);
  let resizeRaf;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(fitText);
  });

  /* =========================================================
     SMOOTH SCROLL (Lenis)
  ========================================================= */
  let lenis = null;
  if (!reduceMotion && typeof Lenis !== 'undefined') {
    lenis = window.__lenis = new Lenis({ lerp: 0.09 });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* =========================================================
     MENU OVERLAY
  ========================================================= */
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('menu');
  const menuLabel = toggle.querySelectorAll('[data-menu-label] > span');

  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    menuLabel.forEach(s => s.textContent = open ? 'Close' : 'Menu');
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) menu.querySelector('a').focus({ preventScroll: true });
    if (open && hasGsap && !reduceMotion) {
      gsap.fromTo(menu.querySelectorAll('.menu-links .h2'),
        { yPercent: 110 },
        { yPercent: 0, duration: .9, ease: 'power3.out', stagger: .05, delay: .15 });
    }
  }
  toggle.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
  });
  menu.querySelectorAll('.menu-links li').forEach(li => li.style.overflow = 'hidden');

  // In-page anchors (menu + buttons)
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const wasOpen = root.classList.contains('menu-open');
      if (wasOpen) setMenu(false);
      setTimeout(() => scrollToTarget(target), wasOpen ? 350 : 0);
    });
  });

  /* =========================================================
     HEADER COLOUR OVER DARK SECTIONS
  ========================================================= */
  const header = document.getElementById('header');
  const darkSections = document.querySelectorAll('[data-theme="dark"]');
  const overDark = new Set();
  const headerObs = new IntersectionObserver(entries => {
    entries.forEach(en => en.isIntersecting ? overDark.add(en.target) : overDark.delete(en.target));
    header.classList.toggle('on-dark', overDark.size > 0);
    root.classList.toggle('sb-dark', overDark.size > 0);
  }, { rootMargin: '0px 0px -94% 0px' });
  darkSections.forEach(s => headerObs.observe(s));

  // Solid bar once scrolled; tuck away on scroll down, return on scroll up
  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 8);
    if (!root.classList.contains('menu-open') && Math.abs(y - lastY) > 4) {
      header.classList.toggle('tucked', y > lastY && y > window.innerHeight * .5);
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  // show the bar when the pointer reaches the top edge
  window.addEventListener('pointermove', e => { if (e.clientY < 60) header.classList.remove('tucked'); }, { passive: true });

  /* =========================================================
     STAT COUNTERS
  ========================================================= */
  function runCounters() {
    document.querySelectorAll('[data-counter]').forEach(el => {
      const end = parseFloat(el.dataset.counter);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      if (reduceMotion || !hasGsap) { el.textContent = end.toFixed(dec); return; }
      const from = end >= 1000 ? end - 25 : 0;
      const obj = { v: from };
      gsap.to(obj, {
        v: end, duration: 1.6, ease: 'power3.out',
        onUpdate: () => el.textContent = obj.v.toFixed(dec)
      });
    });
  }

  /* =========================================================
     REVEALS + PRELOADER (GSAP)
  ========================================================= */
  const preloader = document.querySelector('.preloader');

  if (!hasGsap || reduceMotion) {
    if (preloader) preloader.remove();
    const statsEl = document.querySelector('[data-stats]');
    if (statsEl) {
      const o = new IntersectionObserver(en => { if (en[0].isIntersecting) { runCounters(); o.disconnect(); } }, { threshold: .4 });
      o.observe(statsEl);
    }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  // phones resize the viewport as the address bar shows and hides; don't recalculate everything for that
  ScrollTrigger.config({ ignoreMobileResize: true });
  const hasSplit = typeof SplitText !== 'undefined';
  if (hasSplit) gsap.registerPlugin(SplitText);

  // Headline line reveals
  document.querySelectorAll('[data-split]').forEach(el => {
    if (!hasSplit) {
      gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
      return;
    }
    SplitText.create(el, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 105, duration: 1.1, ease: 'power4.out', stagger: .08,
          scrollTrigger: { trigger: el, start: 'top 88%' }
        });
      }
    });
  });

  // Fades
  document.querySelectorAll('main [data-fade]').forEach(el => {
    if (el.closest('.hero')) return;
    gsap.from(el, {
      y: 36, opacity: 0, duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' }
    });
  });

  // Hairlines draw in
  gsap.utils.toArray('.stats .stat').forEach((el, i) => {
    gsap.from(el, { opacity: 0, y: 24, duration: 1, delay: i * .08, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });
  ScrollTrigger.create({ trigger: '[data-stats]', start: 'top 85%', once: true, onEnter: runCounters });

  // Big footer name drifts up
  gsap.from('.contact-name .fit', {
    yPercent: 60, ease: 'none',
    scrollTrigger: { trigger: '.contact-name', start: 'top bottom', end: 'bottom bottom', scrub: true }
  });

  // Hero name subtle parallax
  gsap.to('[data-hero-name]', {
    yPercent: 18, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  // Hero intro (runs after preloader)
  function heroIntro() {
    const tl = gsap.timeline();
    const name = document.querySelector('[data-hero-name]');
    if (hasSplit) {
      const split = SplitText.create(name, { type: 'chars', mask: 'chars' });
      fitText();
      tl.from(split.chars, { yPercent: 110, duration: 1.3, ease: 'power4.out', stagger: .04 })
        .add(() => document.dispatchEvent(new CustomEvent('hero:ready', { detail: split })));
    } else {
      tl.from(name, { yPercent: 40, opacity: 0, duration: 1.2, ease: 'power4.out' });
    }
    tl.from('.hero [data-fade]', { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: .08 }, '-=.9')
      .from('.hero-bottom', { opacity: 0, duration: .8 }, '-=.7')
      .from('.header', { yPercent: -100, opacity: 0, duration: .9, ease: 'power3.out', clearProps: 'all' }, '-=1');
  }

  if (!preloader) { heroIntro(); return; }

  if (lenis) lenis.stop();
  const countEl = preloader.querySelector('[data-count]');
  const bar = preloader.querySelector('.preloader-bar i');
  const progress = { v: 0 };
  let loaded = document.readyState === 'complete';
  window.addEventListener('load', () => { loaded = true; });

  // A page can hold the preloader for something it needs by setting window.preloadGate
  // (a promise) and, optionally, window.preloadProgress (0..1) for the counter to follow.
  // us/ uses it to have its music box song fully downloaded before the page opens.
  const gate = window.preloadGate;
  const cap = () => (gate && typeof window.preloadProgress === 'number') ? 99 * window.preloadProgress : 100;
  const paint = v => { countEl.textContent = Math.round(v); bar.style.transform = `scaleX(${v / 100})`; };

  const fill = gsap.to(progress, {
    v: 90, duration: 1.4, ease: 'power2.out',
    onUpdate: () => paint(Math.min(progress.v, cap()))
  });

  let finished = false, waiting = null;
  function finish() {
    if (finished) return;
    finished = true;
    if (waiting) gsap.ticker.remove(waiting);
    progress.v = Math.min(progress.v, cap());
    gsap.timeline()
      .to(progress, {
        v: 100, duration: .4, ease: 'power1.out',
        onUpdate: () => paint(progress.v)
      })
      .to(preloader, { yPercent: -100, duration: 1.1, ease: 'power4.inOut' }, '+=.15')
      .add(() => {
        preloader.remove();
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      })
      .add(heroIntro, '-=.55');
  }

  fill.then(() => {
    const pageLoaded = loaded ? null : new Promise(r => window.addEventListener('load', r, { once: true }));
    if (gate) { waiting = () => paint(Math.min(99, cap())); gsap.ticker.add(waiting); }
    // never keep anyone waiting forever: the page opens anyway and loading carries on behind it
    setTimeout(finish, gate ? 20000 : 2500);
    Promise.all([pageLoaded, gate]).then(finish, finish);
  });
};
