/* Adam & Alvy: builds the page from us/data.js, then starts the portfolio's
   editorial behaviour (../js/style-editorial.js) and the pieces this page adds:
   the live counter, the reel (pinned scroll + crank + typewriter), sound,
   letters opening into a photo mosaic, lists and countdowns. */
(function () {
  const D = window.US;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = () => typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = n => String(n).padStart(2, '0');
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  // For the soft gate: run usHash('answer') in the console and paste the number into data.js
  window.usHash = s => {
    let h = 5381;
    for (const c of String(s).trim().toLowerCase()) h = (Math.imul(h, 33) ^ c.codePointAt(0)) >>> 0;
    return h;
  };

  /* =========================================================
     HERO ART: two moons orbiting each other, Alvy's heart beating between them
  ========================================================= */
  const TAU = Math.PI * 2;
  let heartImg = null;
  function heart() {
    if (!heartImg && window.DOODLES && DOODLES.heart) { heartImg = new Image(); heartImg.src = DOODLES.heart; }
    return heartImg && heartImg.complete && heartImg.naturalWidth ? heartImg : null;
  }
  const starField = (() => { const r = rng(27); return Array.from({ length: 70 }, () => [r(), r(), r() * TAU, .4 + r() * .6]); })();
  const binary = { t: 0, spin: 1 };

  function ball(ctx, x, y, r, b) {
    const g = ctx.createRadialGradient(x - r * .4, y - r * .45, r * .05, x, y, r * 1.02);
    g.addColorStop(0, `rgb(${b[0]},${b[0]},${b[0]})`);
    g.addColorStop(.55, `rgb(${b[1]},${b[1]},${b[1]})`);
    g.addColorStop(1, `rgb(${b[2]},${b[2]},${b[2]})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  function binaryScene(ctx, w, h, t, st) {
    const portrait = h > w * 1.1;
    // stars, kept clear of the big name along the bottom
    for (const [sx, sy, ph, s] of starField) {
      const y = sy * (portrait ? .5 : .62) * h;
      ctx.fillStyle = `rgba(0,0,0,${(.25 + .35 * (.5 + .5 * Math.sin(t * 1.3 + ph))) * s})`;
      ctx.fillRect(Math.floor(sx * w), Math.floor(y), 1, 1);
    }
    // moving the pointer quickly spins them faster
    binary.spin += (1 + Math.min(3, st.speed / 600) - binary.spin) * .05;
    binary.t += st.dt * binary.spin;
    const out = clamp((st.p - .5) * 2, 0, 1);
    const cx = w * (portrait ? .55 : .6) + st.mx * 3;
    const cy = h * (portrait ? .5 : .42) + st.my * 2 - out * h * .3;
    const R = portrait ? w * .17 : h * .13;           // the bigger moon
    const r = R * .72;                                 // the smaller one
    const orbit = R * (portrait ? 2.6 : 3.1), squash = .4, tilt = -.18;
    const a = binary.t * .45;
    const pos = k => {
      const ox = Math.cos(a) * orbit * k, oy = Math.sin(a) * orbit * k * squash;
      return [cx + ox * Math.cos(tilt) - oy * Math.sin(tilt), cy + ox * Math.sin(tilt) + oy * Math.cos(tilt)];
    };
    const A = pos(-.42), B = pos(.58);

    // the shared orbit, dotted
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(tilt);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    for (let i = 0; i < 90; i++) {
      const u = i / 90 * TAU;
      ctx.fillRect(Math.cos(u) * orbit * .58, Math.sin(u) * orbit * .58 * squash, 1, 1);
    }
    ctx.restore();

    // the heart sits where they balance, beating
    const im = heart();
    const beat = 1 + Math.pow(Math.max(0, Math.sin(t * 3.2)), 8) * .18;
    const drawHeart = () => {
      if (!im) return;
      const size = R * .62 * beat, k = size / Math.max(im.naturalWidth, im.naturalHeight);
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(-Math.PI / 2 + Math.sin(t * .7) * .12); ctx.scale(k, k);
      ctx.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2);
      ctx.restore();
    };
    // whichever moon is nearer the viewer is drawn last
    const front = Math.sin(a) > 0 ? 'B' : 'A';
    const drawA = () => {
      ball(ctx, A[0], A[1], R, [200, 112, 22]);
      // soft bands
      ctx.save(); ctx.beginPath(); ctx.arc(A[0], A[1], R, 0, TAU); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,.14)';
      for (let i = -2; i <= 2; i++) ctx.fillRect(A[0] - R, A[1] + i * R * .36 + Math.sin(t * .4 + i) * 1.2, R * 2, R * .12);
      ctx.restore();
    };
    const drawB = () => {
      ball(ctx, B[0], B[1], r, [235, 150, 40]);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      [[-.3, -.1, .22], [.25, .3, .16], [.1, -.4, .12]].forEach(([dx, dy, s]) => {
        ctx.beginPath(); ctx.arc(B[0] + dx * r, B[1] + dy * r, s * r, 0, TAU); ctx.fill();
      });
    };
    if (front === 'A') { drawB(); drawHeart(); drawA(); } else { drawA(); drawHeart(); drawB(); }
  }
  if (window.Dither) Dither.scenes.binary = binaryScene;

  /* =========================================================
     DATES + COUNTER
  ========================================================= */
  const since = new Date(D.since);
  const fmtLong = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  $('[data-since-label]').textContent = 'Since ' + fmtLong(since);
  $('[data-since-year]').textContent = since.getFullYear();
  $('[data-since-short]').textContent = `${pad(since.getDate())}.${pad(since.getMonth() + 1)}.${since.getFullYear()}`;

  const togetherEl = $('[data-together]'), clockEl = $('[data-clock]');
  function tick() {
    const ms = Math.max(0, Date.now() - since);
    const s = Math.floor(ms / 1000);
    togetherEl.textContent = Math.floor(s / 86400);
    clockEl.textContent = `${pad(Math.floor(s / 3600) % 24)}h ${pad(Math.floor(s / 60) % 60)}m ${pad(s % 60)}s`;
  }
  tick();
  setInterval(tick, 1000);

  /* =========================================================
     PROLOGUE + STORY
  ========================================================= */
  $('[data-prologue]').textContent = `“${D.prologue}”`;

  const storyBox = $('[data-story]');
  D.story.forEach((m, i) => {
    const row = el('article', 'row grid-12 moment');
    row.dataset.fade = '';
    const when = el('div', 'when');
    when.append(el('span', 'p6 muted num', pad(i + 1)), el('p', 'h6', m.when));
    const body = el('div', 'body');
    if (m.tag) body.append(el('span', 'tag p6', m.tag));
    body.append(el('h4', 'h5', m.title), el('p', 'p5 muted', m.text));
    const meta = el('div', 'meta');
    if (m.place) meta.append(el('span', 'p6 muted', m.place));
    if (m.link) {
      const a = el('a', 'p6', `${m.linkText || 'Open it'} ${m.link.startsWith('#') ? '↓' : '↗'}`);
      a.href = m.link;
      meta.append(a);
    }
    row.append(when, body, meta);
    storyBox.append(row);
  });

  /* =========================================================
     DATE MEMOS
  ========================================================= */
  const dayOf = s => new Date(s.length === 10 ? s + 'T00:00:00' : s);
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const daysUntil = d => Math.round((dayOf(d) - startOfToday()) / 864e5);
  const ordinal = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
  const memos = D.dates || [];

  function memoStatus(m) {
    const n = daysUntil(m.date);
    if (n > 1) return { up: true, text: `In ${n} days` };
    if (n === 1) return { up: true, text: 'Tomorrow' };
    if (n === 0) return { up: true, text: 'Today ♡' };
    return { up: false, text: 'Done ♡' };
  }

  const memoBox = $('[data-memos]');
  memos.forEach((m, i) => {
    const status = memoStatus(m);
    const card = el('article', 'memo' + (status.up ? ' upcoming' : ''));
    card.dataset.fade = '';
    if (m.theme && m.theme.color) card.style.setProperty('--swatch', m.theme.color);

    const top = el('div', 'memo-top');
    top.append(el('span', 'p6', `No. ${pad(i + 1)} · ${(m.title || ordinal[i + 1] + ' date')} memo`), el('span', 'tag p6', status.text));
    const head = el('div', 'memo-head');
    head.append(el('h4', 'h3', `${m.emoji ? m.emoji + ' ' : ''}${m.title || ''}`.trim()));
    head.append(el('p', 'hand memo-names', `${D.names[0]} & ${D.names[1]}`));

    const facts = el('dl', 'memo-facts');
    const fact = (k, v, swatch) => {
      if (!v) return;
      const row = el('div');
      const dd = el('dd', 'p5');
      if (swatch) dd.append(el('i', 'swatch'));
      dd.append(document.createTextNode(v));
      row.append(el('dt', 'p6 muted', k), dd);
      facts.append(row);
    };
    fact('Tarikh', dayOf(m.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    fact('Tempat', m.place);
    fact('Tema', m.theme && m.theme.name, true);
    fact('Jenis', m.type);
    card.append(top, head, facts);

    if (m.agenda && m.agenda.length) {
      const wrap = el('div', 'memo-block');
      wrap.append(el('p', 'p6 muted', m.agendaLabel || 'Agenda'));
      const ol = el('ol', 'memo-agenda');
      m.agenda.forEach(stop => {
        const li = el('li');
        li.append(el('span', 'h6', stop.text));
        if (stop.items && stop.items.length) {
          const ul = el('ul', 'p5 muted');
          stop.items.forEach(t => ul.append(el('li', '', t)));
          li.append(ul);
        }
        ol.append(li);
      });
      wrap.append(ol);
      card.append(wrap);
    }
    if (m.note) card.append(el('p', 'hand memo-note', m.note));
    if (m.checklist && m.checklist.length) {
      const wrap = el('div', 'memo-block');
      wrap.append(el('p', 'p6 muted', 'Checklist'));
      const ul = el('ul', 'checks small');
      m.checklist.forEach((c, j) => ul.append(checkItem(`us-date-${m.date}-${j}`, c)));
      wrap.append(ul);
      card.append(wrap);
    }
    memoBox.append(card);
  });

  // the next date also shows under the counter in the hero
  const nextMemo = memos.find(m => daysUntil(m.date) >= 0);
  if (nextMemo) {
    const box = $('[data-next-date]');
    box.hidden = false;
    const s = memoStatus(nextMemo).text;
    box.textContent = `${nextMemo.emoji ? nextMemo.emoji + ' ' : ''}${nextMemo.title}: ${s.charAt(0).toLowerCase() + s.slice(1)}`;
  }

  // a ticked line, remembered on this device (syncing comes with phase 2)
  function checkItem(key, item, onChange) {
    const saved = store.get(key);
    const li = el('li'), label = el('label');
    const input = el('input');
    input.type = 'checkbox';
    input.checked = saved === null ? !!item.done : saved === '1';
    input.addEventListener('change', () => { store.set(key, input.checked ? '1' : '0'); if (onChange) onChange(); });
    label.append(input, el('span', 'box'), el('span', 'text', item.text));
    li.append(label);
    return li;
  }

  /* =========================================================
     POLAROIDS (reel + mosaic)
  ========================================================= */
  function polaroid(photo, seed, opts = {}) {
    const r = rng(seed * 7919 + 13);
    const b = el('button', 'polaroid');
    b.type = 'button';
    b.style.setProperty('--rot', ((r() * 2 - 1) * (opts.tilt || 6)).toFixed(1) + 'deg');
    b.style.setProperty('--dy', ((r() * 2 - 1) * (opts.drop || 18)).toFixed(1) + 'px');
    const inner = el('span', 'pol-inner');
    const front = el('span', 'pol-front');
    const imgBox = el('span', 'pol-img');
    if (photo) {
      const img = new Image();
      img.alt = photo.caption || '';
      img.loading = opts.eager ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      img.onerror = () => { img.remove(); imgBox.classList.add('missing'); };
      img.src = photo.src;
      imgBox.append(img);
      front.append(imgBox, el('span', 'pol-cap', photo.caption || ''));
      const back = el('span', 'pol-back');
      back.append(el('span', '', photo.note || '♡'), el('small', '', 'tap to flip back'));
      inner.append(front, back);
      b.setAttribute('aria-label', `${photo.caption || 'Photo'}. Tap to read the back.`);
      b.addEventListener('click', () => b.classList.toggle('flipped'));
    } else {
      b.classList.add('future');
      imgBox.textContent = 'yet to be made with you 🤍';
      front.append(imgBox, el('span', 'pol-cap', ' '));
      inner.append(front);
      b.setAttribute('aria-label', 'A photo yet to be made');
      b.disabled = true;
    }
    b.append(inner);
    return b;
  }

  /* =========================================================
     THE REEL
  ========================================================= */
  const track = $('[data-reel-track]');
  const items = [];   // { el, chapter, photo }
  const allPhotos = [];
  D.chapters.forEach((ch, ci) => {
    const card = el('div', 'chapter-card');
    card.append(el('span', 'p6 muted', `Chapter ${pad(ci + 1)}`), el('h4', 'h4', ch.title), el('span', 'p6 muted', `${ch.photos.length} photos`));
    track.append(card);
    items.push({ el: card, chapter: ci });
    ch.photos.forEach(p => {
      const pol = polaroid(p, allPhotos.length, { eager: allPhotos.length < 4 });
      track.append(pol);
      items.push({ el: pol, chapter: ci, photo: true, n: allPhotos.length + 1 });
      allPhotos.push(p);
    });
  });
  for (let i = 0; i < (D.yetToBeMade || 0); i++) {
    const pol = polaroid(null, 1000 + i);
    track.append(pol);
    items.push({ el: pol, chapter: -1 });
  }
  const chapterNote = ci => ci < 0 ? 'and all the ones yet to be made with you 🤍' : D.chapters[ci].note;
  const chapterTitle = ci => ci < 0 ? 'Yet to be made' : D.chapters[ci].title;

  const reel = $('#reel'), reelWindow = $('.reel-window', reel), typeEl = $('[data-typewriter]');
  const chapterEl = $('[data-reel-chapter]'), countEl = $('[data-reel-count]'), progEl = $('[data-reel-progress]');
  const crank = $('#crank'), crankHandle = $('.crank-handle', crank);
  let reelX = 0, reelProgress = 0, reelVelocity = 0, lastReelX = null, centres = [];
  let pinST = null;

  function measure() {
    centres = items.map(it => it.el.offsetLeft + it.el.offsetWidth / 2);
  }

  function updateReel() {
    const mid = window.innerWidth / 2;
    let best = 0, bestD = Infinity;
    items.forEach((it, i) => {
      const d = Math.abs(centres[i] + reelX - mid);
      if (it.el.classList.contains('polaroid')) it.el.classList.toggle('near', d < it.el.offsetWidth * .9);
      if (d < bestD) { bestD = d; best = i; }
    });
    const ci = items[best].chapter;
    // the note types itself across its chapter
    const span = items.map((it, i) => it.chapter === ci ? i : -1).filter(i => i >= 0);
    const a = centres[span[0]], b = centres[span[span.length - 1]];
    const pos = mid - reelX;
    const k = b > a ? clamp((pos - a) / (b - a) * 1.25 + .1, 0, 1) : 1;
    const note = chapterNote(ci);
    const text = note.slice(0, Math.ceil(note.length * k));
    if (typeEl.textContent !== text) typeEl.textContent = text;
    chapterEl.textContent = chapterTitle(ci);
    const n = items[best].n;
    countEl.textContent = n ? `Photo ${n} / ${allPhotos.length}` : `${allPhotos.length} photos so far`;
    progEl.textContent = Math.round(reelProgress * 100);
    crankHandle.style.transform = `rotate(${reelProgress * 360 * Math.max(2, items.length / 5)}deg)`;
    crank.setAttribute('aria-valuenow', String(Math.round(reelProgress * 100)));
  }

  function setupReel() {
    measure();
    const pinned = hasGsap() && !reduceMotion;
    if (!pinned) {
      reel.classList.add('no-pin');
      measure();
      const onScroll = () => {
        reelX = -reelWindow.scrollLeft;
        const max = reelWindow.scrollWidth - reelWindow.clientWidth;
        reelProgress = max > 0 ? reelWindow.scrollLeft / max : 0;
        updateReel();
      };
      reelWindow.addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', () => { measure(); onScroll(); });
      onScroll();
      return;
    }
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: reel, pin: true, start: 'top top',
        end: () => '+=' + dist(),
        scrub: .6, invalidateOnRefresh: true,
        onRefresh: self => { pinST = self; measure(); },
        onUpdate: self => { pinST = self; },
      },
    });
    gsap.ticker.add(() => {
      reelX = gsap.getProperty(track, 'x') || 0;
      const d = dist();
      reelProgress = d ? clamp(-reelX / d, 0, 1) : 0;
      if (lastReelX !== null) reelVelocity = reelVelocity * .8 + Math.abs(reelX - lastReelX) * .2;
      lastReelX = reelX;
      updateReel();
      sound.drive(reelVelocity);
    });
    ScrollTrigger.refresh();

    /* ---- the crank turns the page scroll inside the pinned range ---- */
    let dragging = false, lastAngle = 0;
    const centre = () => { const r = crank.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const angle = e => { const [x, y] = centre(); return Math.atan2(e.clientY - y, e.clientX - x); };
    function scrollReelBy(dy) {
      if (!pinST) return;
      const lenis = window.__lenis;
      const from = lenis ? lenis.targetScroll : window.scrollY;
      const to = clamp(from + dy, pinST.start, pinST.end);
      if (lenis) lenis.scrollTo(to);
      else window.scrollTo(0, to);
    }
    crank.addEventListener('pointerdown', e => {
      dragging = true;
      crank.setPointerCapture(e.pointerId);
      lastAngle = angle(e);
      sound.unlock();
    });
    crank.addEventListener('pointermove', e => {
      if (!dragging) return;
      const a = angle(e);
      let d = a - lastAngle;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      lastAngle = a;
      scrollReelBy(d * 140);
    });
    const end = () => { dragging = false; };
    crank.addEventListener('pointerup', end);
    crank.addEventListener('pointercancel', end);
    crank.addEventListener('keydown', e => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      scrollReelBy(step * 220);
    });
  }

  /* =========================================================
     SOUND: the song (and the vinyl crackle) play while the reel moves,
     or steadily from the record at the bottom of the page
  ========================================================= */
  const sound = (() => {
    const btn = $('#soundBtn'), vinylBtn = $('#vinylBtn'), hint = $('[data-player-hint]');
    const song = new Audio(D.song.src), crackle = new Audio(D.song.crackle);
    song.loop = crackle.loop = true;
    song.preload = 'auto';
    let enabled = false, steady = false, vol = 0, unlocked = false;

    function unlock() {
      if (unlocked) return;
      unlocked = true;
      [song, crackle].forEach(a => a.play().then(() => { if (!steady && vol < .01) a.pause(); }).catch(() => {}));
    }
    function setVol(v) {
      vol = v;
      song.volume = clamp(v, 0, 1);
      crackle.volume = clamp(v * .3, 0, 1);
      const on = v > .01;
      [song, crackle].forEach(a => { if (on && a.paused) a.play().catch(() => {}); if (!on && !a.paused) a.pause(); });
      btn.classList.toggle('quiet', !on);
    }
    function setEnabled(on) {
      enabled = on;
      btn.setAttribute('aria-pressed', String(on));
      $$('[data-sound-label]', btn).forEach(s => s.textContent = on ? 'Sound on' : 'Sound off');
      if (on) unlock();
      if (!on) setSteady(false);
      if (!on) setVol(0);
    }
    function setSteady(on) {
      steady = on;
      vinylBtn.setAttribute('aria-pressed', String(on));
      vinylBtn.setAttribute('aria-label', on ? 'Pause our song' : 'Play our song');
      hint.textContent = on ? 'playing for us ♡' : 'tap the record';
      if (on) { if (!enabled) setEnabled(true); setVol(1); }
    }
    btn.addEventListener('click', () => setEnabled(!enabled));
    vinylBtn.addEventListener('click', () => setSteady(!steady));

    return {
      unlock,
      // called every frame with how fast the reel is moving
      drive(speed) {
        if (!enabled || steady) return;
        const target = clamp(speed / 6, 0, 1);
        const next = vol + (target - vol) * (target > vol ? .25 : .05);
        if (Math.abs(next - vol) > .002 || (next < .01 && vol >= .01)) setVol(next < .01 ? 0 : next);
      },
    };
  })();

  /* =========================================================
     LETTERS
  ========================================================= */
  const lettersBox = $('[data-letters]');
  const mosaic = $('#mosaic'), mosaicPhotos = $('[data-mosaic-photos]', mosaic), paper = $('.paper', mosaic);
  let lastOpener = null;

  D.letters.forEach((L, i) => {
    const li = el('li');
    li.dataset.fade = '';
    const sealed = !L.body || !L.body.length;
    const env = el(sealed ? 'div' : 'button', 'envelope' + (sealed ? ' sealed' : ''));
    if (!sealed) { env.type = 'button'; env.dataset.cursor = 'Open'; }
    env.append(el('span', 'p6 env-num', `No. ${pad(i + 1)}`), el('span', 'p6 env-to', `For ${L.to}`), el('span', 'seal', sealed ? '?' : '♥'));
    const meta = el('span', 'env-meta');
    meta.append(el('span', 'h6', L.title));
    meta.append(sealed ? el('span', 'hand', `${L.sealed || 'sealed'} · from ${L.from}`) : el('span', 'p6 muted', `From ${L.from}${L.date ? ' · ' + L.date : ''}`));
    env.append(meta);
    if (!sealed) env.addEventListener('click', () => openLetter(L, env));
    li.append(env);
    lettersBox.append(li);
  });

  function openLetter(L, opener) {
    lastOpener = opener;
    $('[data-paper-date]', paper).textContent = L.date || '';
    $('#paperTitle').textContent = `Dear ${L.to},`;
    const body = $('[data-paper-body]', paper);
    body.replaceChildren(...L.body.map(t => el('p', '', t)));
    const sign = $('[data-paper-sign]', paper);
    sign.replaceChildren(document.createTextNode(L.sign || 'love,'), el('b', '', L.from));
    const link = $('[data-paper-link]', paper);
    link.hidden = !L.link;
    if (L.link) { link.href = L.link; link.textContent = (L.linkText || 'open') + ' ↗'; }
    paper.scrollTop = 0;

    mosaic.hidden = false;
    document.documentElement.classList.add('mosaic-open');
    if (window.__lenis) window.__lenis.stop();
    scatter(L.photos || allPhotos);
    $('#paperClose').focus({ preventScroll: true });
    if (hasGsap() && !reduceMotion) gsap.fromTo(paper, { scale: .85, opacity: 0 }, { scale: 1, opacity: 1, duration: .9, ease: 'back.out(1.6)' });
  }

  function closeLetter() {
    if (mosaic.hidden) return;
    mosaic.hidden = true;
    mosaicPhotos.replaceChildren();
    document.documentElement.classList.remove('mosaic-open');
    if (window.__lenis) window.__lenis.start();
    if (lastOpener) lastOpener.focus({ preventScroll: true });
  }
  $('#paperClose').addEventListener('click', closeLetter);
  mosaic.addEventListener('click', e => { if (e.target === mosaic || e.target === mosaicPhotos) closeLetter(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLetter(); });
  addEventListener('resize', () => { if (!mosaic.hidden) scatter(currentScatter); });

  // Photos fill the space around the letter, a little messy, never on top of it
  // (the Valentine page's celebration layout)
  let currentScatter = [];
  function scatter(photos) {
    currentScatter = photos;
    mosaicPhotos.replaceChildren();
    if (!photos.length) return;
    const vw = innerWidth, vh = innerHeight;
    const size = vw < 640 ? 64 : vw < 1100 ? 88 : 104;
    mosaic.style.setProperty('--mw', size + 'px');
    const pw = size, ph = size * 1.25;
    const L = paper.getBoundingClientRect();
    const gap = 10, step = Math.max(pw, ph) * .78;
    const spots = [];
    for (let y = -ph * .2; y < vh - ph * .6; y += step) {
      for (let x = -pw * .2; x < vw - pw * .6; x += step) {
        const clear = x + pw < L.left - gap || x > L.right + gap || y + ph < L.top - gap || y > L.bottom + gap;
        if (clear) spots.push([x, y]);
      }
    }
    const r = rng(spots.length * 31 + photos.length);
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    // repeat the photos when there is more room than photos, so the frame looks full
    const count = Math.min(spots.length, Math.max(photos.length, 32));
    for (let i = 0; i < count; i++) {
      const [x, y] = spots[i];
      const pol = polaroid(photos[i % photos.length], i + 500, { tilt: 14, drop: 0, eager: true });
      pol.style.translate = `${x + (r() - .5) * step * .4}px ${y + (r() - .5) * step * .4}px`;
      pol.style.zIndex = i;
      mosaicPhotos.append(pol);
      if (hasGsap() && !reduceMotion) gsap.from(pol, { scale: .4, opacity: 0, duration: .5, delay: .15 + i * .035, ease: 'back.out(1.4)' });
    }
  }

  /* =========================================================
     LISTS (ticks are remembered on this device; syncing them comes with phase 2)
  ========================================================= */
  ['promises', 'bucket'].forEach(name => {
    const box = $(`[data-list="${name}"]`), countBox = $(`[data-count-of="${name}"]`);
    const list = D[name] || [];
    const word = name === 'promises' ? 'kept' : 'done';
    const recount = () => { countBox.textContent = `${$$('input:checked', box).length} / ${list.length} ${word}`; };
    list.forEach((item, i) => box.append(checkItem(`us-${name}-${i}`, item, recount)));
    recount();
  });

  /* =========================================================
     COUNTDOWNS: next monthiversary and anniversary, plus any from data.js
  ========================================================= */
  function addMonths(d, n) {
    const r = new Date(d);
    const day = r.getDate();
    r.setDate(1);
    r.setMonth(r.getMonth() + n);
    r.setDate(Math.min(day, new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
    return r;
  }
  function renderCountdowns() {
    const now = new Date();
    const list = [];
    let m = 1;
    while (addMonths(since, m) <= now) m++;
    const years = Math.ceil(m / 12);
    if (m % 12 !== 0) list.push({ label: `Next monthiversary · ${m} month${m > 1 ? 's' : ''}`, date: addMonths(since, m) });
    list.push({ label: `Anniversary · ${years} year${years > 1 ? 's' : ''}`, date: addMonths(since, years * 12) });
    memos.forEach(m => list.push({ label: `${m.title}${m.type ? ' · ' + m.type : ''}`, date: dayOf(m.date) }));
    (D.countdowns || []).forEach(c => list.push({ label: c.label, date: dayOf(c.date) }));
    const box = $('[data-countdowns]');
    const today = startOfToday();
    box.replaceChildren(...list.filter(c => c.date >= today).sort((a, b) => a.date - b.date).map(c => {
      const days = Math.round((new Date(c.date).setHours(0, 0, 0, 0) - today) / 864e5);
      const d = el('div', 'countdown');
      const big = el('div', 'h2', days === 0 ? 'Today' : String(days));
      if (days) big.append(el('small', '', days === 1 ? 'day' : 'days'));
      d.append(big, el('p', 'p6', c.label), el('p', 'p6 muted', fmtLong(c.date)));
      return d;
    }));
  }
  renderCountdowns();
  setInterval(renderCountdowns, 60 * 1000);

  /* =========================================================
     SONG TEXT
  ========================================================= */
  $('[data-song-title]').textContent = D.song.title;
  $('[data-song-artist]').textContent = D.song.artist;

  /* =========================================================
     START (behind the soft gate when one is set)
  ========================================================= */
  function start() {
    if (window.initStyle) window.initStyle();
    // the reel's pin is measured against the finished layout
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setupReel);
    else setupReel();
  }

  const G = D.gate;
  if (G && G.hash && store.get('us-in') !== String(G.hash)) {
    const gate = $('#gate'), form = $('#gateForm'), input = $('#gateInput');
    $('#gateQuestion').textContent = G.question;
    gate.hidden = false;
    const pre = $('.preloader');
    if (pre) pre.remove();
    input.focus();
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (usHash(input.value) === G.hash) {
        store.set('us-in', String(G.hash));
        gate.hidden = true;
        start();
      } else {
        $('#gateWrong').textContent = 'hmm, not quite. try again ♡';
        gate.classList.remove('shake'); void gate.offsetWidth; gate.classList.add('shake');
      }
    });
  } else {
    start();
  }
})();
