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
  // drag: the moon being held; off: how far each moon is pulled from its orbit (cells)
  const binary = { t: 0, spin: 1, drag: null, geom: null, front: 'A', off: { A: { x: 0, y: 0, vx: 0, vy: 0 }, B: { x: 0, y: 0, vx: 0, vy: 0 } } };

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
    // moving the pointer quickly spins them faster; holding one slows the orbit right down
    binary.spin += ((binary.drag ? .15 : 1 + Math.min(3, st.speed / 600)) - binary.spin) * .05;
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
    const base = { A: pos(-.42), B: pos(.58) };
    binary.geom = { left: st.left, top: st.top, cell: st.cell, base, size: { A: R, B: r } };

    // The held moon follows the pointer and its partner leans after it. Let go and
    // both ease back to the orbit with one small overshoot.
    const G = binary, held = G.drag && G.drag.id;
    for (const id of ['A', 'B']) {
      const o = G.off[id];
      if (id === held) {
        const tx = (G.drag.x - st.left) / st.cell - G.drag.gx - base[id][0];
        const ty = (G.drag.y - st.top) / st.cell - G.drag.gy - base[id][1];
        // remember the hand's speed so a flick carries on after release
        o.vx = clamp(tx - o.x, -5, 5) * .5; o.vy = clamp(ty - o.y, -5, 5) * .5;
        o.x = tx; o.y = ty;
      } else {
        const lead = held ? G.off[held] : null;
        const tx = lead ? lead.x * .22 : 0, ty = lead ? lead.y * .22 : 0;
        // gentle spring: one small overshoot, then it settles
        o.vx = (o.vx + (tx - o.x) * .08) * .72;
        o.vy = (o.vy + (ty - o.y) * .08) * .72;
        o.x += o.vx; o.y += o.vy;
        if (Math.abs(o.x) + Math.abs(o.y) + Math.abs(o.vx) + Math.abs(o.vy) < .02) o.x = o.y = o.vx = o.vy = 0;
      }
    }
    const A = [base.A[0] + G.off.A.x, base.A[1] + G.off.A.y];
    const B = [base.B[0] + G.off.B.x, base.B[1] + G.off.B.y];
    // where they balance: the heart sits here
    const hx = A[0] + (B[0] - A[0]) * .42, hy = A[1] + (B[1] - A[1]) * .42;

    // the shared orbit, dotted
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(tilt);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    for (let i = 0; i < 90; i++) {
      const u = i / 90 * TAU;
      ctx.fillRect(Math.cos(u) * orbit * .58, Math.sin(u) * orbit * .58 * squash, 1, 1);
    }
    ctx.restore();

    // pulled apart, a dotted tether shows they still belong together
    const gap = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const rest = Math.hypot(base.B[0] - base.A[0], base.B[1] - base.A[1]);
    const stretch = clamp((gap - rest) / (R * 2), 0, 1);
    if (stretch > .02) {
      ctx.fillStyle = `rgba(0,0,0,${.25 + stretch * .5})`;
      const n = Math.floor(gap / 2.5);
      for (let i = 1; i < n; i++) ctx.fillRect(A[0] + (B[0] - A[0]) * i / n, A[1] + (B[1] - A[1]) * i / n, 1, 1);
    }

    // the heart sits where they balance, beating (faster while they are apart)
    const im = heart();
    const beat = 1 + Math.pow(Math.max(0, Math.sin(t * (3.2 + stretch * 4))), 8) * (.18 + stretch * .2);
    const drawHeart = () => {
      if (!im) return;
      const size = R * .62 * beat, k = size / Math.max(im.naturalWidth, im.naturalHeight);
      ctx.save();
      ctx.translate(hx, hy); ctx.rotate(-Math.PI / 2 + Math.sin(t * .7) * .12); ctx.scale(k, k);
      ctx.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2);
      ctx.restore();
    };
    // whichever moon is nearer the viewer is drawn last
    const front = held || (Math.sin(a) > 0 ? 'B' : 'A');
    G.front = front;
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

  // Grabbing a moon: hit-test against where they were last drawn, front one first
  (function dragMoons() {
    const hero = $('.hero'), root = document.documentElement;
    if (!hero || reduceMotion) return;
    function hit(x, y) {
      const g = binary.geom;
      if (!g) return null;
      const cx = (x - g.left) / g.cell, cy = (y - g.top) / g.cell;
      const order = binary.front === 'A' ? ['A', 'B'] : ['B', 'A'];
      for (const id of order) {
        const o = binary.off[id];
        const px = g.base[id][0] + o.x, py = g.base[id][1] + o.y;
        if (Math.hypot(cx - px, cy - py) < g.size[id] + 4) return { id, gx: cx - px, gy: cy - py };
      }
      return null;
    }
    // a finger on a moon drags it instead of scrolling the page
    hero.addEventListener('touchstart', e => {
      const t = e.touches[0];
      if (e.touches.length === 1 && hit(t.clientX, t.clientY)) e.preventDefault();
    }, { passive: false });
    hero.addEventListener('pointerdown', e => {
      if (e.button > 0 || e.target.closest('a, button')) return;
      const h = hit(e.clientX, e.clientY);
      if (!h) return;
      binary.drag = { ...h, x: e.clientX, y: e.clientY, pointer: e.pointerId };
      hero.setPointerCapture(e.pointerId);
      root.classList.add('moon-dragging');
    });
    let hinting = false;
    const label = () => $('.cursor-label');
    hero.addEventListener('pointermove', e => {
      const d = binary.drag;
      if (d && d.pointer === e.pointerId) { d.x = e.clientX; d.y = e.clientY; return; }
      // desktop: the cursor offers "Drag" over a moon
      if (e.pointerType !== 'mouse' || !label()) return;
      const over = !!hit(e.clientX, e.clientY);
      if (over === hinting) return;
      hinting = over;
      root.classList.toggle('cursor-link', over);
      label().textContent = over ? 'Drag' : '';
    });
    const release = e => {
      if (!binary.drag || binary.drag.pointer !== e.pointerId) return;
      binary.drag = null;
      root.classList.remove('moon-dragging');
    };
    hero.addEventListener('pointerup', release);
    hero.addEventListener('pointercancel', release);
  })();

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
    (m.links || (m.link ? [{ href: m.link, text: m.linkText }] : [])).forEach(l => {
      const a = el('a', 'p6', `${l.text || 'Open it'} ${l.href.startsWith('#') ? '↓' : '↗'}`);
      a.href = l.href;
      meta.append(a);
    });
    if (m.photo) meta.prepend(miniPhoto(m.photo, i));
    row.append(when, body, meta);
    storyBox.append(row);
  });

  // a little pinned photo: no flipping, just the picture in a white frame
  function miniPhoto(src, i) {
    const f = el('span', 'mini-pol');
    f.style.setProperty('--tilt', ((i % 2 ? 1 : -1) * (2 + (i * 7) % 4)) + 'deg');
    const img = new Image();
    img.src = src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    img.onerror = () => f.remove();
    f.append(img);
    return f;
  }

  /* =========================================================
     HER FILM
  ========================================================= */
  const film = D.film;
  if (film) {
    $$('[data-film-by]').forEach(e => e.textContent = film.by);
    $('[data-film-date]').textContent = film.date;
    $('[data-film-title]').textContent = film.title;
    $('[data-film-edition]').textContent = film.edition || '';
    $('[data-film-length]').textContent = film.length || '';
    $('[data-film-quote]').textContent = `“${film.quote}”`;
    $('[data-film-after]').textContent = film.after || '';
    $('[data-film-tribute]').replaceChildren(...(film.tribute || []).map(t => el('p', '', t)));
    $('[data-film-sign]').textContent = film.sign || '';
    const video = $('[data-film-video]'), play = $('[data-film-play]');
    video.src = film.src;
    video.poster = film.poster;
    play.addEventListener('click', () => {
      video.controls = true;
      play.hidden = true;
      video.play().catch(() => {});
    });
    // the site's music steps aside while her film plays
    video.addEventListener('play', () => sound.hush(true));
    video.addEventListener('pause', () => sound.hush(false));
    video.addEventListener('ended', () => sound.hush(false));
  } else {
    const sec = $('#film');
    sec.previousElementSibling.remove(); sec.nextElementSibling.remove(); sec.remove();
  }

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
    if (m.photos && m.photos.length) {
      const strip = el('div', 'memo-photos');
      m.photos.forEach((src, j) => strip.append(miniPhoto(src, i + j)));
      card.append(strip);
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
  // a little wooden clothespin, clipped on slightly crooked
  function clothespin(r) {
    const pin = el('span', 'pin');
    pin.setAttribute('aria-hidden', 'true');
    pin.style.setProperty('--pin-tilt', ((r() * 2 - 1) * 7).toFixed(1) + 'deg');
    return pin;
  }

  function polaroid(photo, seed, opts = {}) {
    const r = rng(seed * 7919 + 13);
    const b = el('button', 'polaroid' + (photo && photo.favourite ? ' favourite' : ''));
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
    if (opts.pin) b.append(clothespin(r));
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
    card.append(clothespin(rng(ci + 77)));
    card.append(el('span', 'p6 muted', `Chapter ${pad(ci + 1)}`), el('h4', 'h4', ch.title), el('span', 'p6 muted', `${ch.photos.length} photos`));
    track.append(card);
    items.push({ el: card, chapter: ci });
    ch.photos.forEach(p => {
      const pol = polaroid(p, allPhotos.length, { eager: allPhotos.length < 4, pin: true, tilt: 4, drop: 9 });
      track.append(pol);
      items.push({ el: pol, chapter: ci, photo: true, n: allPhotos.length + 1 });
      allPhotos.push(p);
    });
  });
  for (let i = 0; i < (D.yetToBeMade || 0); i++) {
    const pol = polaroid(null, 1000 + i, { pin: true, tilt: 4, drop: 9 });
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

  const SVG = 'http://www.w3.org/2000/svg';
  const line = document.createElementNS(SVG, 'svg'), linePath = document.createElementNS(SVG, 'path');
  line.setAttribute('class', 'reel-line');
  line.setAttribute('aria-hidden', 'true');
  line.append(linePath);
  track.prepend(line);

  // where each pin bites the string: the photo's top (shifted by its little drop),
  // a chapter card's top-left corner
  function drawLine() {
    const W = track.scrollWidth, H = track.offsetHeight;
    if (!W || !items.length) return;
    const top = parseFloat(getComputedStyle(track).paddingTop) || 0;
    const pts = items.map(it => {
      const card = it.el.classList.contains('chapter-card');
      const dy = parseFloat(it.el.style.getPropertyValue('--dy')) || 0;
      return [it.el.offsetLeft + (card ? 0 : it.el.offsetWidth / 2), top + dy - 6];
    });
    pts.unshift([0, pts[0][1] - 10]);
    pts.push([W, pts[pts.length - 1][1] - 10]);
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const sag = Math.min(46, Math.abs(bx - ax) * .09);   // slack: wider gaps droop more
      d += ` Q ${((ax + bx) / 2).toFixed(1)} ${(Math.max(ay, by) + sag).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
    }
    line.setAttribute('width', W);
    line.setAttribute('height', H);
    line.setAttribute('viewBox', `0 0 ${W} ${H}`);
    linePath.setAttribute('d', d);
  }

  function measure() {
    drawLine();
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
    // fingers jump straight there (the reel's own scrub smooths it); mouse and keys glide
    function scrollReelBy(dy, immediate) {
      if (!pinST) return;
      const lenis = window.__lenis;
      const from = lenis && !immediate ? lenis.targetScroll : window.scrollY;
      const to = clamp(from + dy, pinST.start, pinST.end);
      if (lenis) lenis.scrollTo(to, { immediate: !!immediate });
      else window.scrollTo(0, to);
    }
    // keep the crank's touches away from the smooth scroller: it reads a moving finger
    // as someone scrolling by hand and cancels the crank's scroll on every move
    ['touchstart', 'touchmove', 'touchend'].forEach(t => crank.addEventListener(t, e => e.stopPropagation(), { passive: true }));
    crank.addEventListener('pointerdown', e => {
      dragging = true;
      crank.setPointerCapture(e.pointerId);
      lastAngle = angle(e);
      sound.wake();
    });
    crank.addEventListener('pointermove', e => {
      if (!dragging) return;
      const a = angle(e);
      let d = a - lastAngle;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      lastAngle = a;
      scrollReelBy(d * 140, e.pointerType === 'touch');
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
     SOUND: two players under one vinyl crackle. The record plays the songs in
     "Songs that remind me of us"; the reel's music box plays the song marked
     `reel: true` while the crank (or the scroll) turns it, keeping its place.
  ========================================================= */
  const sound = (() => {
    const btn = $('#soundBtn'), vinylBtn = $('#vinylBtn'), hint = $('[data-player-hint]');
    const tracks = D.songs || [];
    const song = new Audio(), crackle = new Audio(D.crackle), box = new Audio();
    crackle.loop = box.loop = true;
    song.preload = 'auto';
    const boxTrack = tracks.find(t => t.reel && t.src) || tracks.find(t => t.src);
    if (boxTrack) box.src = boxTrack.src;
    let enabled = false, steady = false, vol = 0, bvol = 0, unlocked = false, cur = -1, hushed = false, boxOk = !!boxTrack;
    box.addEventListener('error', () => { boxOk = false; });
    // Download the music box song in full while the loading screen is up, so the crank
    // plays the moment it turns. Phones (iPhones especially) won't preload audio before a
    // tap, so it is fetched as a file and handed to the player. The loading screen waits
    // for it (see window.preloadGate in ../js/style-editorial.js) and its counter follows
    // the download. Opened straight from disk, fetch isn't allowed, so it just plays as is.
    window.preloadGate = (async () => {
      if (!boxTrack || location.protocol === 'file:') return;
      try {
        const res = await fetch(boxTrack.src);
        if (!res.ok || !res.body) throw new Error(res.status);
        const total = +res.headers.get('content-length') || 0;
        if (total) window.preloadProgress = 0;
        const reader = res.body.getReader(), parts = [];
        let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value);
          got += value.length;
          if (total) window.preloadProgress = Math.min(1, got / total);
        }
        box.src = URL.createObjectURL(new Blob(parts, { type: 'audio/mpeg' }));
      } catch (e) { /* the player keeps the normal file and streams it instead */ }
      window.preloadProgress = 1;
    })();
    const playable = i => !!(tracks[i] && tracks[i].src && !tracks[i].missing);

    /* ---- the tracklist ---- */
    const list = $('[data-tracks]');
    const rows = tracks.map((t, i) => {
      const li = el('li');
      li.dataset.fade = '';
      const row = el(t.src ? 'button' : 'a', 'track');
      if (t.src) row.type = 'button';
      else if (t.link) { row.href = t.link; row.target = '_blank'; row.rel = 'noreferrer'; }
      const name = el('span', 'track-name');
      name.append(el('span', 'h6', t.title), el('span', 'p6 muted', t.artist || ''));
      row.append(el('span', 'p6 muted track-num', pad(i + 1)), name, el('span', 'hand track-note', t.note || ''),
        el('span', 'p6 track-state', t.src ? 'Play' : t.link ? 'Listen ↗' : ''));
      if (t.src) row.addEventListener('click', () => {
        if (i === cur && steady) setSteady(false);
        else { setTrack(i); retry(); setSteady(true); }
      });
      li.append(row);
      list.append(li);
      return row;
    });

    function paint() {
      const t = tracks[cur] || tracks[0] || {};
      $('[data-now-label]').textContent = steady ? 'Now playing' : 'Up next';
      $('[data-now-title]').textContent = t.title || '';
      $('[data-now-artist]').textContent = t.artist || '';
      rows.forEach((r, i) => {
        const on = i === cur && steady;
        r.classList.toggle('current', i === cur);
        r.classList.toggle('playing', on);
        r.classList.toggle('missing', !!tracks[i].missing);
        if (tracks[i].src) r.querySelector('.track-state').textContent = tracks[i].missing ? 'No file' : on ? 'Pause' : 'Play';
        if (i === cur) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current');
      });
      vinylBtn.setAttribute('aria-pressed', String(steady));
      vinylBtn.setAttribute('aria-label', `${steady ? 'Pause' : 'Play'} ${t.title || ''}`.trim());
      // can't tell a missing file from a browser that can't play it (like VS Code's preview panel), so name both
      if (tracks[cur] && tracks[cur].missing) hint.textContent = `couldn't play ${tracks[cur].src}: check it's in the us folder, or open the page in Chrome or Edge`;
      else hint.textContent = steady ? 'playing for us ♡' : 'tap the record';
    }

    // a file that failed once (say, while it was being moved) gets another go on the next tap
    function retry() {
      const t = tracks[cur];
      if (!t || !t.missing) return;
      t.missing = false;
      song.src = t.src;
      song.load();
    }

    function setTrack(i) {
      if (i === cur || !tracks[i]) return;
      cur = i;
      if (tracks[i].src) { song.src = tracks[i].src; song.load(); }
      paint();
    }
    // say so plainly if a song file isn't there, instead of silently doing nothing
    song.addEventListener('error', () => {
      if (!tracks[cur] || !song.getAttribute('src')) return;
      tracks[cur].missing = true;
      if (steady) setSteady(false);
      paint();
    });
    // from the record the playlist plays on, round and round
    song.addEventListener('ended', () => {
      if (!steady) return;
      for (let k = 1; k <= tracks.length; k++) {
        const n = (cur + k) % tracks.length;
        if (playable(n)) { setTrack(n); song.play().catch(() => {}); return; }
      }
    });

    function unlock() {
      if (unlocked) return;
      unlocked = true;
      [song, box, crackle].forEach(a => a.play().then(() => {
        if ((a === song && vol < .01) || (a === box && bvol < .01) || (a === crackle && Math.max(vol, bvol) < .01)) a.pause();
      }).catch(() => {}));
    }
    const run = (a, on) => { if (on && a.paused) a.play().catch(() => {}); if (!on && !a.paused) a.pause(); };
    // the crackle follows whichever player is louder
    function crackleUp() {
      const v = Math.max(vol, bvol);
      crackle.volume = clamp(v * .3, 0, 1);
      run(crackle, v > .01);
      btn.classList.toggle('quiet', v <= .01);
    }
    function setVol(v) {
      vol = v;
      song.volume = clamp(v, 0, 1);
      run(song, v > .01);
      crackleUp();
    }
    function setBoxVol(v) {
      bvol = v;
      box.volume = clamp(v, 0, 1);
      run(box, v > .01);
      crackleUp();
    }
    function setEnabled(on) {
      enabled = on;
      btn.setAttribute('aria-pressed', String(on));
      $$('[data-sound-label]', btn).forEach(s => s.textContent = on ? 'Sound on' : 'Sound off');
      if (on) unlock();
      if (!on) { setSteady(false); setVol(0); setBoxVol(0); }
    }
    function setSteady(on) {
      if (on && !playable(cur)) { paint(); return; }
      steady = on;
      if (on) { if (!enabled) setEnabled(true); setBoxVol(0); setVol(1); }
      else if (vol > .01) setVol(0);
      paint();
    }
    btn.addEventListener('click', () => setEnabled(!enabled));
    vinylBtn.addEventListener('click', () => { if (!steady) retry(); setSteady(!steady); });
    setTrack(0);

    return {
      unlock,
      // grabbing the crank turns the sound on, like the Valentine page
      wake() { if (!enabled) setEnabled(true); },
      // quiet while her film plays
      hush(on) {
        hushed = on;
        if (on) { if (steady) setSteady(false); setVol(0); setBoxVol(0); }
      },
      // called every frame with how fast the reel is moving
      drive(speed) {
        if (!enabled || steady || hushed || !boxOk) return;
        const target = clamp(speed / 6, 0, 1);
        const next = bvol + (target - bvol) * (target > bvol ? .25 : .05);
        if (Math.abs(next - bvol) > .002 || (next < .01 && bvol >= .01)) setBoxVol(next < .01 ? 0 : next);
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
     OUR FUTURE HOME: her spec as a dollhouse with the front taken off.
     Rooms come from D.home; each has a little ink drawing (ROOM_ART), a lamp that
     switches on when tapped, and a card with her words and wishes to tick off.
  ========================================================= */
  const heartAt = (x, y, s, cls) =>
    `<path class="${cls}" transform="translate(${x - 50 * s} ${y - 45 * s}) scale(${s})" d="M50 86 C20 64 4 46 4 28 C4 13 16 3 29 3 C39 3 46 9 50 16 C54 9 61 3 71 3 C84 3 96 13 96 28 C96 46 80 64 50 86Z"/>`;

  const windowAt = (x, y, w, h) => {
    const cx = x + w * .22, cy = y + h * .58;
    return `<rect class="a-sky" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>
      <path class="a-paper" d="M${cx} ${cy} a5 5 0 0 1 9 -3 a4 4 0 0 1 8 3 z"/>
      <path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}"/>
      <path class="a-rose" d="M${x} ${y} h${w * .16} c-3 ${h * .35} -3 ${h * .65} 0 ${h} h-${w * .16} z"/>
      <rect class="a-wood" x="${x - 4}" y="${y + h}" width="${w + 8}" height="4" rx="1"/>`;
  };

  // books for her library: some standing up, some lying down (menegak dan mendatar)
  function shelfOfBooks() {
    const r = rng(41), tones = ['a-rose', 'a-sage', 'a-wood', 'a-sky', 'a-gold', 'a-paper'];
    let out = '';
    [[15, 39], [41, 65], [67, 91]].forEach(([top, bottom], row) => {
      let x = 20;
      const stackAt = row === 1 ? 20 : 84;          // where this shelf's lying-down pile goes
      while (x < 114) {
        if (x >= stackAt && x < stackAt + 4) {        // a pile of books lying flat
          for (let k = 0; k < 4; k++) out += `<rect class="${tones[(k + row) % 6]}" x="${x + (k % 2) * 2}" y="${bottom - 5 * (k + 1)}" width="26" height="5" rx="1"/>`;
          x += 31;
          continue;
        }
        const w = 6 + Math.floor(r() * 4), h = 16 + Math.floor(r() * 7);
        if (x + w > 114) break;
        out += `<rect class="${tones[Math.floor(r() * 6)]}" x="${x}" y="${bottom - h}" width="${w}" height="${h}" rx="1"/>`;
        x += w + 1;
      }
    });
    // bottom shelf: a long lying stack and a little plant
    for (let k = 0; k < 3; k++) out += `<rect class="${tones[k + 1]}" x="${22 + k * 2}" y="${111 - 5 * (k + 1)}" width="40" height="5" rx="1"/>`;
    out += `<path class="a-wood2" d="M88 111 l2 -10 h14 l2 10 z"/><path class="a-sage" d="M97 101 c-7 -8 -5 -16 0 -19 c5 3 7 11 0 19 z"/>`;
    return out;
  }

  const ROOM_ART = {
    crib: { w: 200, d: `
      ${windowAt(10, 10, 34, 36)}
      <g class="swing"><path d="M100 0 V20"/><path d="M80 20 H120"/><path d="M86 20 V30 M100 20 V36 M114 20 V28"/>
        <circle class="a-gold" cx="86" cy="33" r="3.2"/>${heartAt(100, 40, .09, 'a-rose')}<circle class="a-sky" cx="114" cy="31" r="3.2"/></g>
      <circle class="a-wood" cx="52" cy="50" r="3"/><circle class="a-wood" cx="148" cy="50" r="3"/>
      <rect class="a-rose" x="52" y="88" width="96" height="12"/>
      <path class="a-paper" d="M58 88 c4 -8 18 -8 22 0 z"/>
      <path d="M52 53 V117 M148 53 V117 M52 62 H148 M52 100 H148"/>
      <path d="M62 62 V88 M72 62 V88 M82 62 V88 M92 62 V88 M102 62 V88 M112 62 V88 M122 62 V88 M132 62 V88 M142 62 V88"/>` },

    adamStudy: { w: 300, d: `
      <rect class="a-sky" x="12" y="8" width="56" height="40" rx="2"/>
      <path class="a-paper" d="M24 30 a6 6 0 0 1 11 -3 a5 5 0 0 1 9 3 z"/>
      <path d="M40 8 V48 M12 28 H68"/><rect class="a-wood" x="8" y="48" width="64" height="4" rx="1"/>
      <path class="a-rose" d="M12 8 h8 c-3 14 -3 26 0 40 h-8 z"/>
      <rect class="a-ink" x="132" y="14" width="34" height="21" rx="2"/><path class="s-paper" d="M137 21 H154 M137 27 H160"/><path d="M149 35 V39"/>
      <path class="a-ink" d="M94 46 L122 42 L122 70 L94 72 Z"/><path class="s-paper" d="M99 52 L114 50 M99 58 L117 56 M101 64 L111 63"/>
      <rect class="a-ink" x="126" y="40" width="46" height="30" rx="2"/><path class="s-paper" d="M131 47 H150 M131 53 H163 M135 59 H155 M131 65 H146"/>
      <path class="a-ink" d="M176 42 L204 46 L204 72 L176 70 Z"/><path class="s-paper" d="M181 50 L197 52 M181 56 L199 58 M181 62 L192 63"/>
      <path d="M108 71 V76 M149 70 V76 M190 71 V76"/>
      <rect class="a-paper" x="122" y="72" width="44" height="4" rx="1"/>
      <path class="a-paper" d="M208 64 h9 v12 h-9 z"/><path d="M217 67 h3 v6 h-3"/>
      <rect class="a-rose" x="220" y="70" width="26" height="6" rx="1"/><rect class="a-sage" x="222" y="64" width="22" height="6" rx="1"/><rect class="a-gold" x="219" y="58" width="24" height="6" rx="1"/>
      <rect class="a-paper" x="228" y="40" width="14" height="15" rx="2"/><rect class="a-paper" x="226" y="28" width="18" height="12" rx="3"/>
      <circle class="a-ink" cx="232" cy="34" r="1.4"/><circle class="a-ink" cx="238" cy="34" r="1.4"/><path d="M235 28 V23"/><circle class="a-rose" cx="235" cy="21" r="2"/>
      <rect class="a-wood" x="86" y="76" width="166" height="6" rx="1"/><path d="M92 82 V117 M246 82 V117"/>
      <path d="M108 76 C104 92 118 96 112 104 C106 112 92 104 96 98 C100 92 116 102 124 112"/>
      <path d="M149 76 C152 90 140 94 146 102 C152 110 166 104 162 98 C158 92 150 104 156 112"/>
      <path d="M190 76 C186 92 200 98 192 106 C186 112 176 108 172 112"/>
      <rect class="a-ink" x="150" y="111" width="30" height="6" rx="1"/><path class="s-paper" d="M156 114 h3 M163 114 h3 M170 114 h3"/>
      <rect class="a-sage" x="14" y="111" width="40" height="6" rx="1"/><rect class="a-rose" x="17" y="105" width="34" height="6" rx="1"/><rect class="a-sky" x="13" y="99" width="38" height="6" rx="1"/>
      <rect class="a-gold" x="19" y="93" width="30" height="6" rx="1"/><rect class="a-paper" x="16" y="87" width="34" height="6" rx="1"/>
      <path class="a-rose" transform="rotate(-14 66 106)" d="M56 96 h8 v21 h-8 z"/><path class="a-sky" transform="rotate(-24 76 108)" d="M68 99 h7 v19 h-7 z"/>
      <path class="a-paper" d="M200 117 l12 -5 l12 5 z M212 112 V117"/>
      <circle class="a-paper" cx="236" cy="114" r="3.5"/><circle class="a-paper" cx="78" cy="114" r="3"/>
      <defs><radialGradient id="dh-sunburst" cx="50%" cy="58%" r="60%">
        <stop offset="0" stop-color="#f4bd45"/><stop offset=".5" stop-color="#cf6a22"/><stop offset=".8" stop-color="#6e2a12"/><stop offset="1" stop-color="#2a120c"/>
      </radialGradient></defs>
      <path d="M268 117 L276 100 L286 117 M277 44 v6 M273 44 h8"/>
      <path class="a-maple" d="M273 6 c0 -4 6 -5 9 -2 l1 7 c-1 2 -3 2 -4 4 l-1 13 h-4 z"/>
      <circle class="a-paper" cx="275" cy="9" r="1"/><circle class="a-paper" cx="275" cy="14" r="1"/><circle class="a-paper" cx="275" cy="19" r="1"/>
      <rect class="a-maple" x="275" y="28" width="5" height="54"/>
      <path d="M275 34 h5 M275 40 h5 M275 46 h5 M275 52 h5 M275 58 h5 M275 64 h5 M275 70 h5 M275 76 h5"/>
      <path class="a-sunburst" d="M269 112 C259 112 257 101 262 93 C265 88 263 83 264 78 C265 72 269 72 271 77 C272 80 274 82 277.5 82 C281 82 283 80 284 77 C286 70 292 73 292 79 C293 85 291 88 293 93 C298 101 295 112 286 112 Z"/>
      <path class="a-paper" d="M265 96 C264 90 268 86 274 86 L284 88 C287 93 285 100 280 104 C274 106 267 103 265 96 Z"/>
      <rect class="a-paper" x="274" y="87" width="7" height="2.5" rx="1"/><rect class="a-paper" x="274" y="92.5" width="7" height="2.5" rx="1"/><rect class="a-paper" x="273.5" y="98" width="7" height="2.5" rx="1" transform="rotate(-8 277 99)"/>
      <rect class="a-steel" x="273" y="103.5" width="9" height="3" rx="1"/>
      <circle class="a-paper" cx="286" cy="99" r="1.4"/><circle class="a-paper" cx="287.5" cy="103" r="1.4"/><circle class="a-paper" cx="285" cy="106.5" r="1.4"/>
      <path class="string" d="M277.5 10 V105"/>` },

    safaStudy: { w: 400, d: `
      ${windowAt(160, 8, 56, 40)}
      <rect class="a-wood" x="12" y="10" width="110" height="107" rx="2"/>
      <rect class="a-paper" x="17" y="15" width="100" height="96"/>
      <path d="M17 39 H117 M17 65 H117 M17 91 H117"/>
      ${shelfOfBooks()}
      <rect class="a-rose" x="142" y="64" width="92" height="27" rx="10"/>
      <rect class="a-rose" x="136" y="87" width="104" height="17" rx="5"/>
      <rect class="a-rose" x="128" y="75" width="17" height="31" rx="8"/><rect class="a-rose" x="232" y="75" width="17" height="31" rx="8"/>
      <path d="M188 89 V104 M142 104 V112 M234 104 V112"/>
      ${heartAt(188, 77, .13, 'a-paper')}
      <rect class="a-rose" x="284" y="58" width="32" height="26" rx="6"/><path d="M290 100 V117 M310 100 V117"/>
      <path d="M268 78 V58 L278 48"/><path class="a-gold" d="M274 43 L287 49 L280 56 Z"/>
      <path class="a-paper" d="M296 56 h34 v20 h-34 z"/><path class="s-ink" d="M301 62 h20 M301 67 h14"/><path class="a-paper" d="M290 76 h46 l-3 2 h-40 z"/>
      <rect class="a-sky" x="270" y="72" width="20" height="6" rx="1"/><rect class="a-gold" x="272" y="66" width="16" height="6" rx="1"/>
      <path class="steam" d="M360 40 c-4 -5 4 -9 0 -15"/><path class="steam late" d="M370 42 c-4 -5 4 -9 0 -15"/>
      <rect class="a-ink" x="348" y="44" width="34" height="34" rx="3"/>
      <rect class="a-paper" x="359" y="51" width="12" height="6" rx="1"/><circle class="a-gold" cx="354" cy="50" r="2"/>
      <path class="a-paper" d="M357 65 h16 v8 a5 5 0 0 1 -5 5 h-6 a5 5 0 0 1 -5 -5 z"/>
      <rect class="a-wood" x="262" y="78" width="128" height="6" rx="1"/><path d="M268 84 V117 M384 84 V117"/>
      <rect class="a-wood2" x="340" y="84" width="38" height="14"/><path d="M352 91 H366"/>` },

    bath: { w: 260, d: `
      <circle class="a-paper bubble" cx="34" cy="68" r="7"/><circle class="a-paper bubble late" cx="48" cy="64" r="9"/>
      <circle class="a-paper bubble" cx="64" cy="68" r="6"/><circle class="a-paper bubble late" cx="78" cy="66" r="5"/>
      <ellipse class="a-gold" cx="100" cy="70" rx="9" ry="5"/><circle class="a-gold" cx="107" cy="63" r="5"/><path class="a-rose" d="M112 62 l5 1.6 -5 1.6 z"/>
      <path class="a-paper" d="M12 74 H128 V88 C128 104 116 110 102 110 H38 C24 110 12 104 12 88 Z"/>
      <path d="M8 74 H132"/><path d="M34 109 l-5 8 M106 109 l5 8"/>
      <rect class="a-sky glass" x="150" y="10" width="100" height="107" rx="2"/>
      <path d="M200 0 V10"/><rect class="a-ink" x="178" y="10" width="44" height="6" rx="2"/>
      <rect class="a-ink" x="152" y="36" width="7" height="64" rx="2"/><rect class="a-ink" x="241" y="36" width="7" height="64" rx="2"/>
      <path class="s-paper" d="M155.5 44 v0 M155.5 58 v0 M155.5 72 v0 M155.5 86 v0 M244.5 44 v0 M244.5 58 v0 M244.5 72 v0 M244.5 86 v0" stroke-width="3"/>
      <rect class="a-ink" x="190" y="112" width="20" height="3" rx="1"/>
      <g class="water">
        <path d="M184 18 V112 M192 18 V112 M200 18 V112 M208 18 V112 M216 18 V112"/>
        <path d="M160 44 L196 52 M160 58 L198 62 M160 72 L196 74 M160 86 L194 84"/>
        <path d="M240 44 L204 52 M240 58 L202 62 M240 72 L204 74 M240 86 L206 84"/>
        <circle class="mist" cx="186" cy="30" r="10"/><circle class="mist late" cx="214" cy="40" r="12"/><circle class="mist" cx="200" cy="96" r="13"/>
      </g>` },

    bedroom: { w: 240, d: `
      <rect class="a-paper" x="88" y="12" width="32" height="24" rx="1"/>${heartAt(104, 25, .11, 'a-rose')}
      <rect class="a-wood" x="10" y="78" width="26" height="39" rx="1"/><path d="M14 92 h18"/>
      <path d="M23 78 V64"/><path class="a-gold" d="M15 64 h16 l-3 -12 h-10 z"/>
      <path class="a-wood" d="M44 117 V62 a12 12 0 0 1 12 -12 H152 a12 12 0 0 1 12 12 V117"/>
      ${heartAt(104, 63, .12, 'a-rose')}
      <rect class="a-paper" x="56" y="74" width="38" height="14" rx="6"/><rect class="a-paper" x="114" y="74" width="38" height="14" rx="6"/>
      <rect class="a-paper" x="38" y="84" width="132" height="14" rx="4"/>
      <rect class="a-rose" x="38" y="92" width="132" height="18" rx="4"/><path d="M38 100 H170"/>
      <path d="M44 110 V117 M164 110 V117"/>
      <rect class="a-sage" x="60" y="114" width="90" height="3" rx="1"/>
      <path class="a-wood" d="M194 117 V52 h40 V117"/><path d="M200 117 V58 h28 V117"/>
      <circle class="a-gold" cx="222" cy="88" r="2.4"/>
      <rect class="a-paper" x="204" y="64" width="20" height="13" rx="2"/><path d="M207 71 h14 v1 a4 4 0 0 1 -4 4 h-6 a4 4 0 0 1 -4 -4 z M209 71 V67 a2 2 0 0 1 4 0"/>` },

    gym: { w: 200, d: `
      <path d="M44 28 V117 M156 28 V117 M34 117 H54 M146 117 H166 M44 50 h6 M156 50 h-6"/>
      <path d="M26 52 H174"/>
      <rect class="a-ink" x="30" y="36" width="9" height="32" rx="2"/><rect class="a-rose" x="39" y="42" width="5" height="20" rx="1"/>
      <rect class="a-ink" x="161" y="36" width="9" height="32" rx="2"/><rect class="a-rose" x="156" y="42" width="5" height="20" rx="1"/>
      <path d="M86 98 a8 8 0 0 1 16 0"/><circle class="a-ink" cx="94" cy="107" r="10"/>
      <path d="M114 112 H134"/><rect class="a-ink" x="110" y="106" width="5" height="11" rx="1"/><rect class="a-ink" x="133" y="106" width="5" height="11" rx="1"/>
      <rect class="a-sage" x="58" y="114" width="80" height="3" rx="1"/>` },

    kitchen: { w: 260, d: `
      ${windowAt(110, 4, 50, 34)}
      <path d="M22 30 H96"/><rect class="a-sky" x="28" y="18" width="12" height="12" rx="2"/><rect class="a-rose" x="46" y="14" width="12" height="16" rx="2"/><rect class="a-gold" x="64" y="20" width="12" height="10" rx="2"/>
      <path d="M200 0 V12 M218 0 V16 M236 0 V10"/><circle class="a-ink" cx="200" cy="18" r="6"/><path class="a-wood" d="M214 16 h8 v14 a4 4 0 0 1 -8 0 z"/><path d="M236 10 v14"/><circle cx="236" cy="27" r="3"/>
      <rect class="a-paper" x="150" y="44" width="68" height="30" rx="3"/>
      <rect class="a-sky" x="156" y="50" width="40" height="18" rx="2"/>
      <circle class="a-ink" cx="206" cy="53" r="1.6"/><circle class="a-ink" cx="212" cy="53" r="1.6"/><circle class="a-ink" cx="206" cy="59" r="1.6"/><circle class="a-ink" cx="212" cy="59" r="1.6"/><rect class="a-rose" x="204" y="63" width="10" height="4" rx="1"/>
      <rect class="a-paper" x="10" y="78" width="240" height="39"/>
      <rect class="a-wood" x="6" y="74" width="248" height="5" rx="1"/>
      <rect class="a-ink" x="24" y="82" width="72" height="33" rx="2"/>
      <rect class="a-gold glow" x="32" y="93" width="56" height="16" rx="2"/>
      <path class="s-paper" d="M36 87 H84"/>
      <path d="M152 78 V117 M200 78 V117 M168 92 v8 M184 92 v8 M216 92 v8"/>` },

    door: { w: 150, d: `
      <path class="a-wood" d="M40 117 V44 a35 35 0 0 1 70 0 V117 Z"/>
      <path d="M50 117 V50 a25 25 0 0 1 50 0 V117"/>
      ${heartAt(75, 52, .16, 'a-gold glow')}
      <circle class="a-gold" cx="94" cy="86" r="3"/>
      <rect class="a-rose" x="34" y="114" width="82" height="4" rx="1"/>
      <path class="a-wood2" d="M118 117 l3 -15 h14 l3 15 z"/><path class="a-sage" d="M128 102 c-8 -9 -6 -18 0 -22 c6 4 8 13 0 22 z"/>` },
  };

  const home = D.home;
  const houseBox = $('[data-dollhouse]'), roomCard = $('[data-room-card]');
  if (home && houseBox) {
    const rooms = [];
    const roof = el('div', 'dh-roof');
    roof.setAttribute('aria-hidden', 'true');
    roof.append(el('span', 'dh-chimney'), el('span', 'dh-window'));
    const plate = el('div', 'dh-plate');
    plate.append(el('span', 'p6', home.name));
    const body = el('div', 'dh-body');
    home.floors.forEach((floor, f) => {
      const row = el('div', 'dh-floor');
      row.style.gridTemplateColumns = floor.map(r => `${r.wide || 1}fr`).join(' ');
      floor.forEach(room => {
        const b = el('button', 'room room-' + room.art);
        b.type = 'button';
        b.style.setProperty('--wall', `var(--wall-${rooms.length % 4})`);
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', room.name);
        b.dataset.cursor = room.art === 'bath' ? 'Shower' : 'Lights';
        const art = ROOM_ART[room.art];
        const pic = el('span', 'room-art');
        if (art) pic.innerHTML = `<svg viewBox="0 0 ${art.w} 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${art.d}</svg>`;
        b.append(el('span', 'room-lamp'), el('span', 'room-name p6', room.name), pic);
        b.addEventListener('click', () => select(room, b));
        row.append(b);
        rooms.push({ room, b });
      });
      body.append(row);
    });
    const base = el('div', 'dh-base');
    base.setAttribute('aria-hidden', 'true');
    houseBox.append(roof, plate, body, base);

    function select(room, b) {
      rooms.forEach(r => { const on = r.b === b; r.b.classList.toggle('on', on); r.b.setAttribute('aria-pressed', String(on)); });
      const head = el('div', 'room-card-head');
      head.append(el('p', 'p6 muted', `Room ${pad(rooms.findIndex(r => r.room === room) + 1)} of ${pad(rooms.length)}`), el('h4', 'h3', room.name));
      const words = el('div', 'room-card-words');
      if (room.her) words.append(el('p', 'p6 muted', 'In her words'), el('p', 'hand room-her', `“${room.her}”`));
      if (room.adam) words.append(el('p', 'p6 muted room-from', 'And from Adam'), el('p', 'hand room-her', `“${room.adam}”`));
      if (!room.her && !room.adam && room.note) words.append(el('p', 'hand room-her', room.note));
      const parts = [head, words];
      if (room.wishes && room.wishes.length) {
        const wrap = el('div', 'room-card-wishes');
        wrap.append(el('p', 'p6 muted', 'Wishes'));
        const ul = el('ul', 'checks small');
        room.wishes.forEach((w, j) => ul.append(checkItem(`us-home-${room.id}-${j}`, w)));
        wrap.append(ul);
        parts.push(wrap);
      }
      roomCard.replaceChildren(...parts);
    }
    // start with her study lit up
    const first = rooms.find(r => r.room.id === 'study-safa') || rooms[0];
    if (first) select(first.room, first.b);
  }

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
