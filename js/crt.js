/* The experience section as an old PC.
   Body: drawn like the TA-1 turbine (js/turbine.js): the monitor is a set of flat
   faces in 3D, turned toward the cursor, projected and painted back to front in
   the page colour so nearer faces hide the lines behind them, with fine Bayer
   dots for shade.
   Screen: a Windows 98 style desktop with the jobs in an Explorer-like window.
   It is painted in greys, dithered to ink and paper dots (text and lines go on
   crisp afterwards), then texture-mapped onto a gently bulging glass mesh.
   The jobs come from the visually hidden list in #experience ([data-jobs]). */
(function () {
  const canvas = document.querySelector('canvas.crt3d');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const TAU = Math.PI * 2;

  /* ---------- the jobs, read from the page ---------- */
  const textOf = (el, sel) => { const n = el.querySelector(sel); return n ? n.textContent.trim().replace(/\s+/g, ' ') : ''; };
  const jobs = [...document.querySelectorAll('[data-jobs] .exp')].map(a => {
    const metaEl = a.querySelector('.role p');
    const meta = metaEl ? metaEl.innerHTML.split(/<br\s*\/?>/i).map(html => {
      const d = document.createElement('div'); d.innerHTML = html; return d.textContent.trim();
    }).filter(Boolean) : [];
    return {
      when: textOf(a, '.when'), role: textOf(a, '.role h4'), meta,
      desc: textOf(a, '.detail .p5'),
      tags: textOf(a, '.tags').split('/').map(s => s.trim()).filter(Boolean),
    };
  });
  if (!jobs.length) return;
  const cvHref = (document.querySelector('a[download][href$=".pdf"]') || {}).href;

  /* =========================================================
     THE MONITOR: faces in model space (x right, y up, z toward the viewer)
  ========================================================= */
  const faces = [];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const mid = ps => { const m = [0, 0, 0]; for (const p of ps) { m[0] += p[0] / ps.length; m[1] += p[1] / ps.length; m[2] += p[2] / ps.length; } return m; };
  // a quad; its normal is turned to agree with `hint` (which way is "out")
  function face(p, hint, edges = [1, 1, 1, 1], tag = null) {
    let n = cross(sub(p[1], p[0]), sub(p[3], p[0]));
    if (dot3(n, hint) < 0) n = n.map(v => -v);
    faces.push({ p, n, edges, tag });
  }
  const rect = (x0, x1, y0, y1, z) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
  // a closed solid between a front and a back rectangle (corners: bl, br, tr, tl)
  function hull(front, back, skip = [], tag = null) {
    const c = mid([...front, ...back]);
    const sides = {
      front, back: [back[1], back[0], back[3], back[2]],
      left: [back[0], front[0], front[3], back[3]], right: [front[1], back[1], back[2], front[2]],
      top: [front[3], front[2], back[2], back[3]], bottom: [back[0], back[1], front[1], front[0]],
    };
    for (const k in sides) if (!skip.includes(k)) face(sides[k], sub(mid(sides[k]), c), [1, 1, 1, 1], tag);
  }
  const box = (x0, x1, y0, y1, z0, z1, skip, tag) => hull(rect(x0, x1, y0, y1, z0), rect(x0, x1, y0, y1, z1), skip, tag);

  // housing: the shell around the front frame, then the tube tapering away behind it
  const HX = 1, HB = -.78, HT = .86, HD = -.38;
  box(-HX, HX, HB, HT, 0, HD, ['front']);
  hull(rect(-.9, .9, -.7, .78, HD), rect(-.5, .5, -.4, .5, -1.45), ['front']);
  // front frame: a 3x3 grid of quads minus the middle (the opening); only the outer
  // edges and the opening's edges are drawn
  const FX = [-HX, -.84, .84, HX], FY = [HB, -.54, .75, HT];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (i === 1 && j === 1) continue;
    const q = [[FX[i], FY[j], 0], [FX[i + 1], FY[j], 0], [FX[i + 1], FY[j + 1], 0], [FX[i], FY[j + 1], 0]];
    face(q, [0, 0, 1], [
      j === 0 || (j === 2 && i === 1),        // bottom edge: outer, or the opening's top
      i === 2 || (i === 0 && j === 1),        // right edge: outer, or the opening's left
      j === 2 || (j === 0 && i === 1),        // top edge: outer, or the opening's bottom
      i === 0 || (i === 2 && j === 1),        // left edge: outer, or the opening's right
    ]);
  }
  // bevel from the opening down to the glass, which sits a little way back
  const OPEN = rect(-.84, .84, -.54, .75, 0);
  const GL = { x0: -.78, x1: .78, y0: -.495, y1: .695, z: -.07 };
  const GLASS = rect(GL.x0, GL.x1, GL.y0, GL.y1, GL.z);
  for (let k = 0; k < 4; k++) {
    const q = [OPEN[k], OPEN[(k + 1) % 4], GLASS[(k + 1) % 4], GLASS[k]];
    face(q, sub([0, .1, 1], mid(q)));
  }
  // neck, foot, and the power button on the chin
  box(-.26, .26, -.9, HB, -.12, -.8, ['top']);
  box(-.74, .74, -.97, -.9, .04, -1.02);
  box(.72, .84, -.69, -.62, .03, 0, ['back'], 'power');

  /* ---------- shading: fine ordered dots under the line drawing (as the turbine) ---------- */
  const LX = -.45, LY = .65, LZ = .62;
  const BAYER = new Uint8Array(64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    let v = 0;
    for (let i = 0; i < 3; i++) v = (v << 2) | ((((x ^ y) >> i) & 1) << 1) | ((y >> i) & 1);
    BAYER[y * 8 + x] = (v + .5) / 64 * 255;
  }
  const quadPath = (P, s) => { P.moveTo(s[0][0], s[0][1]); P.lineTo(s[1][0], s[1][1]); P.lineTo(s[2][0], s[2][1]); P.lineTo(s[3][0], s[3][1]); P.closePath(); };
  const rgbWord = c => { const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(c) || [0, 40, 40, 40]; return (255 << 24 | +m[3] << 16 | +m[2] << 8 | +m[1]) >>> 0; };
  const shadeSrc = document.createElement('canvas'), shadeG = shadeSrc.getContext('2d', { willReadFrequently: true });
  const shadeOut = document.createElement('canvas'), shadeO = shadeOut.getContext('2d');
  function shadeDots(list) {
    const gw = Math.ceil(W), gh = Math.ceil(H);
    if (shadeSrc.width !== gw || shadeSrc.height !== gh) { shadeSrc.width = shadeOut.width = gw; shadeSrc.height = shadeOut.height = gh; }
    let x0 = gw, y0 = gh, x1 = 0, y1 = 0;
    for (const f of list) for (const q of f.s) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    x0 = Math.max(0, Math.floor(x0) - 2); y0 = Math.max(0, Math.floor(y0) - 2);
    x1 = Math.min(gw, Math.ceil(x1) + 2); y1 = Math.min(gh, Math.ceil(y1) + 2);
    const bw = x1 - x0, bh = y1 - y0;
    if (bw <= 0 || bh <= 0) return;
    shadeG.clearRect(x0, y0, bw, bh);
    for (const f of list) {
      // the glass is in the list too, fully lit, so nothing behind it dots through
      const dark = f.glass ? 0 : .36 * Math.pow(1 - Math.max(0, f.lum), 1.6);
      const v = Math.round((1 - dark) * 23) * 255 / 23 | 0;
      const P = new Path2D(); quadPath(P, f.s);
      shadeG.fillStyle = shadeG.strokeStyle = `rgb(${v},${v},${v})`;
      shadeG.fill(P); shadeG.stroke(P);
    }
    const img = shadeG.getImageData(x0, y0, bw, bh), d = img.data, px = new Uint32Array(d.buffer);
    const dotWord = rgbWord(ink);
    for (let y = 0, i = 0; y < bh; y++) {
      const row = ((y + y0) & 7) * 8;
      for (let x = 0; x < bw; x++, i++) {
        const k = i * 4;
        px[i] = d[k + 3] > 127 && 255 - d[k] > BAYER[row + ((x + x0) & 7)] ? dotWord : 0;
      }
    }
    shadeO.putImageData(img, x0, y0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(shadeOut, x0, y0, bw, bh, x0 * dpr, y0 * dpr, bw * dpr, bh * dpr);
    ctx.restore();
  }

  /* =========================================================
     THE SCREEN: a 640x480 Windows 98 style desktop
  ========================================================= */
  const SW = 640, SH = 480;
  const mk = () => { const c = document.createElement('canvas'); c.width = SW; c.height = SH; return c; };
  const greyC = mk(), overC = mk(), screenC = mk();
  const gg = greyC.getContext('2d', { willReadFrequently: true }), oo = overC.getContext('2d'), ss = screenC.getContext('2d');
  const UI = 'Tahoma, Verdana, "Segoe UI", sans-serif';
  const displayFont = (getComputedStyle(document.documentElement).getPropertyValue('--font-display') || 'serif').trim();
  const bodyFont = getComputedStyle(document.body).fontFamily;

  let ink = '#2c2824', paper = '#a89474';
  // greys get dithered into ink dots; crisp lines and text go on top in ink or paper
  const grey = (x, y, w, h, v) => { gg.fillStyle = `rgb(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0})`; gg.fillRect(x, y, w, h); };
  const line = (x0, y0, x1, y1, col = ink) => { oo.fillStyle = col; oo.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) || 1, Math.abs(y1 - y0) || 1); };
  function bevel(x, y, w, h, raised = true) {
    const lt = raised ? paper : ink, dk = raised ? ink : paper;
    line(x, y, x + w, y, lt); line(x, y, x, y + h, lt);
    line(x, y + h - 1, x + w, y + h - 1, dk); line(x + w - 1, y, x + w - 1, y + h, dk);
  }
  function text(str, x, y, { size = 12, bold = false, col = ink, align = 'left', font = UI, max = 0 } = {}) {
    oo.font = `${bold ? 'bold ' : ''}${size}px ${font}`;
    oo.fillStyle = col; oo.textAlign = align; oo.textBaseline = 'middle';
    if (max) str = clip(str, max);
    oo.fillText(str, x, y);
    return oo.measureText(str).width;
  }
  function clip(str, max) {
    if (oo.measureText(str).width <= max) return str;
    while (str.length > 1 && oo.measureText(str + '…').width > max) str = str.slice(0, -1);
    return str + '…';
  }
  function wrapText(str, max) {
    const out = []; let l = '';
    for (const w of str.split(' ')) {
      const t = l ? l + ' ' + w : w;
      if (oo.measureText(t).width > max && l) { out.push(l); l = w; } else l = t;
    }
    if (l) out.push(l);
    return out;
  }

  // little icons, drawn in ink lines over a grey fill
  function icon(kind, x, y, s = 1) {
    const L = (a, b, c, d) => line(x + a * s, y + b * s, x + c * s, y + d * s);
    const box = (a, b, w, h, v) => { grey(x + a * s, y + b * s, w * s, h * s, v); L(a, b, a + w, b); L(a, b + h - 1, a + w, b + h - 1); L(a, b, a, b + h); L(a + w - 1, b, a + w - 1, b + h); };
    if (kind === 'pc') { box(4, 2, 24, 18, .55); box(8, 6, 16, 10, .9); box(10, 22, 12, 3, .7); box(4, 26, 24, 4, .7); }
    else if (kind === 'folder') { box(2, 6, 12, 4, .7); box(2, 9, 28, 19, .72); L(2, 13, 30, 13); }
    else if (kind === 'doc') { box(6, 2, 20, 28, 1); for (let k = 0; k < 5; k++) L(10, 9 + k * 4, 22 - (k % 2) * 4, 9 + k * 4); }
    else if (kind === 'bin') { box(7, 8, 18, 22, .8); box(5, 5, 22, 4, .6); L(12, 12, 12, 27); L(16, 12, 16, 27); L(20, 12, 20, 27); }
    else if (kind === 'flag') { grey(x, y, 6 * s, 6 * s, 0); grey(x + 7 * s, y, 6 * s, 6 * s, .4); grey(x, y + 7 * s, 6 * s, 6 * s, .6); grey(x + 7 * s, y + 7 * s, 6 * s, 6 * s, .2); }
  }

  /* ---------- desktop state ---------- */
  const st = {
    win: 'open',          // 'open' | 'min' | 'closed'
    start: false, sel: 0, selAt: 0, hover: null, iconSel: null,
    power: true, bootAt: -1, offAt: -1, onAt: -1,
  };
  let hits = [];                       // clickable areas in screen pixels, rebuilt each paint
  const hit = (x, y, w, h, id, arg) => hits.push({ x, y, w, h, id, arg });
  const BOOT = 2.4;

  function paintDesktop(now) {
    const hv = id => st.hover && st.hover.id === id;
    // desktop
    grey(0, 0, SW, SH, .55);
    const icons = [['pc', 'My Computer', 'icon-pc'], ['folder', 'Experience', 'icon-exp'], ['doc', 'Resume.pdf', 'icon-cv'], ['bin', 'Recycle Bin', 'icon-bin']];
    icons.forEach(([kind, label, id], i) => {
      const x = 14, y = 12 + i * 74;
      icon(kind, x + 16, y, 1);
      oo.font = `11px ${UI}`;
      const w = Math.min(84, oo.measureText(label).width + 6), lx = x + 32 - w / 2;
      const on = st.iconSel === id;
      grey(lx, y + 36, w, 15, on ? 0 : 1);
      text(label, x + 32, y + 44, { size: 11, col: on ? paper : ink, align: 'center', max: 82 });
      hit(x - 4, y - 2, 72, 56, id);
    });

    // the window
    if (st.win === 'open') {
      const wx = 100, wy = 12, ww = 528, wh = 432;
      grey(wx, wy, ww, wh, .9);
      bevel(wx, wy, ww, wh); bevel(wx + 1, wy + 1, ww - 2, wh - 2);
      grey(wx + 3, wy + 3, ww - 6, 20, 0);
      icon('folder', wx + 6, wy + 5, .5);
      text('Experience - Tareq Adam', wx + 26, wy + 13.5, { bold: true, col: paper });
      [['win-min', '_'], ['win-max', '□'], ['win-close', '×']].forEach(([id, g], k) => {
        const bx = wx + ww - 22 - (2 - k) * 18 - (k === 2 ? -2 : 0), by = wy + 6;
        grey(bx, by, 16, 14, hv(id) ? .8 : .9); bevel(bx, by, 16, 14);
        text(g, bx + 8, by + 7, { size: g === '_' ? 11 : 12, bold: true, align: 'center' });
        hit(bx, by, 16, 14, id);
      });
      ['File', 'Edit', 'View', 'Help'].reduce((x, m) => x + text(m, x, wy + 34, { size: 12 }) + 14, wx + 10);

      const top = wy + 46, bot = wy + wh - 28;
      // the job list
      const lx = wx + 6, lw = 182;
      grey(lx, top, lw, bot - top, 1); bevel(lx, top, lw, bot - top, false);
      jobs.forEach((j, i) => {
        const iy = top + 6 + i * 56, on = i === st.sel, over = hv('job') && st.hover.arg === i;
        if (on) grey(lx + 3, iy, lw - 6, 50, 0);
        else if (over) grey(lx + 3, iy, lw - 6, 50, .82);
        icon('folder', lx + 8, iy + 9, .7);
        text(j.role, lx + 36, iy + 16, { bold: true, col: on ? paper : ink, max: lw - 44 });
        text(j.when, lx + 36, iy + 34, { size: 11, col: on ? paper : ink, max: lw - 44 });
        hit(lx + 3, iy, lw - 6, 50, 'job', i);
      });

      // the details, typed out after you pick a job
      const dx = lx + lw + 6, dw = wx + ww - 6 - dx;
      grey(dx, top, dw, bot - top, 1); bevel(dx, top, dw, bot - top, false);
      const job = jobs[st.sel];
      let budget = reduce ? Infinity : (now - st.selAt) * 700, y = top + 26;
      const type = (str, x, yy, o) => {
        if (budget <= 0) return;
        const shown = str.slice(0, Math.max(0, Math.floor(budget)));
        budget -= str.length;
        text(shown, x, yy, o);
      };
      oo.font = `26px ${displayFont}`;
      for (const l of wrapText(job.role, dw - 28)) { type(l, dx + 14, y, { size: 26, font: displayFont }); y += 26; }
      y += 4;
      for (const m of job.meta) { type(m, dx + 14, y, { size: 11, max: dw - 28 }); y += 16; }
      type(job.when, dx + 14, y, { size: 11, bold: true }); y += 14;
      line(dx + 14, y, dx + dw - 14, y);
      y += 18;
      oo.font = `13px ${UI}`;
      for (const l of wrapText(job.desc, dw - 28)) { type(l, dx + 14, y, { size: 13 }); y += 19; }
      // skills as little buttons along the bottom
      let tx = dx + 14, ty = bot - 30;
      const rowsOf = [];
      oo.font = `11px ${UI}`;
      for (const t of job.tags) {
        const w = oo.measureText(t).width + 16;
        if (tx + w > dx + dw - 14) { tx = dx + 14; ty -= 24; }
        rowsOf.push([t, tx, ty, w]); tx += w + 6;
      }
      if (rowsOf.length) type('Skills used:', dx + 14, Math.min(...rowsOf.map(r => r[2])) - 12, { size: 11, bold: true });
      for (const [t, bx, by, w] of rowsOf) {
        if (budget <= 0) break;
        grey(bx, by, w, 20, .9); bevel(bx, by, w, 20);
        type(t, bx + w / 2, by + 10, { size: 11, align: 'center' });
      }
      if (budget <= 0 && Math.sin(now * 10) > 0) grey(dx + 14, y - 8, 8, 14, 0);   // typing caret

      // status bar
      const sy = wy + wh - 24;
      grey(wx + 4, sy, 200, 19, .9); bevel(wx + 4, sy, 200, 19, false);
      grey(wx + 208, sy, ww - 212, 19, .9); bevel(wx + 208, sy, ww - 212, 19, false);
      text(`${jobs.length} object(s)`, wx + 10, sy + 10, { size: 11 });
      text(`Record ${st.sel + 1} of ${jobs.length}`, wx + 214, sy + 10, { size: 11 });
    }

    // taskbar
    const ty = SH - 28;
    grey(0, ty, SW, 28, .9); line(0, ty + 1, SW, ty + 1, paper);
    grey(3, ty + 4, 58, 21, st.start ? .8 : .9); bevel(3, ty + 4, 58, 21, !st.start);
    icon('flag', 8, ty + 8, 1);
    text('Start', 25, ty + 15, { bold: true });
    hit(3, ty + 4, 58, 21, 'start');
    if (st.win !== 'closed') {
      const on = st.win === 'open';
      grey(66, ty + 4, 150, 21, on ? .82 : .9); bevel(66, ty + 4, 150, 21, !on);
      icon('folder', 70, ty + 8, .45);
      text('Experience', 90, ty + 15, { bold: on });
      hit(66, ty + 4, 150, 21, 'task');
    }
    grey(SW - 72, ty + 4, 69, 21, .9); bevel(SW - 72, ty + 4, 69, 21, false);
    text(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), SW - 37, ty + 15, { size: 11, align: 'center' });

    // start menu
    if (st.start) {
      const mw = 190, mh = 4 * 30 + 16, mx = 3, my = ty - mh;
      grey(mx, my, mw, mh, .9); bevel(mx, my, mw, mh); bevel(mx + 1, my + 1, mw - 2, mh - 2);
      grey(mx + 3, my + 3, 22, mh - 6, 0);
      oo.save(); oo.translate(mx + 14, my + mh - 8); oo.rotate(-Math.PI / 2);
      text('Tareq98', 0, 0, { size: 15, bold: true, col: paper }); oo.restore();
      const items = [['open', 'folder', 'Experience'], ['cv', 'doc', 'Resume.pdf'], null, ['off', 'pc', 'Shut Down...']];
      let iy = my + 6;
      for (const it of items) {
        if (!it) { line(mx + 30, iy + 4, mx + mw - 6, iy + 4); iy += 10; continue; }
        const [id, kind, label] = it, on = hv(id);
        if (on) grey(mx + 28, iy, mw - 32, 30, 0);
        icon(kind, mx + 32, iy + 7, .55);
        text(label, mx + 56, iy + 15, { col: on ? paper : ink });
        hit(mx + 28, iy, mw - 32, 30, id);
        iy += 30;
      }
    }
  }

  function paintBoot(t) {
    grey(0, 0, SW, SH, 0);
    text('Tareq', SW / 2 - 8, SH / 2 - 30, { size: 64, font: displayFont, col: paper, align: 'right' });
    text('98', SW / 2 + 2, SH / 2 - 30, { size: 64, bold: true, col: paper });
    text('Starting Tareq 98...', SW / 2, SH / 2 + 30, { size: 13, col: paper, align: 'center' });
    const bw = 220, bx = SW / 2 - bw / 2, by = SH / 2 + 56;
    line(bx, by, bx + bw, by, paper); line(bx, by + 15, bx + bw, by + 15, paper);
    line(bx, by, bx, by + 16, paper); line(bx + bw - 1, by, bx + bw - 1, by + 16, paper);
    const n = Math.floor(Math.min(1, t / (BOOT - .3)) * 18);
    for (let k = 0; k < n; k++) grey(bx + 3 + k * 12, by + 3, 10, 10, 1);
  }

  // turning off: the picture collapses to a line, then a dot, then goes dark
  function paintOff(k) {
    grey(0, 0, SW, SH, 0);
    if (k >= 1) return;
    const h = Math.max(2, SH * Math.max(0, 1 - k / .4)), w = k < .4 ? SW : Math.max(3, SW * (1 - (k - .4) / .4));
    const a = k < .8 ? 1 : 1 - (k - .8) / .2;
    grey(SW / 2 - w / 2, SH / 2 - h / 2, w, h, a);
  }

  // repaint the screen texture: greys -> ordered dots, then the crisp layer on top
  function paintScreen(now) {
    hits = [];
    gg.setTransform(1, 0, 0, 1, 0, 0); oo.setTransform(1, 0, 0, 1, 0, 0);
    oo.clearRect(0, 0, SW, SH);
    if (st.offAt >= 0) paintOff(reduce ? 1 : (now - st.offAt) / .6);
    else if (st.bootAt < 0) grey(0, 0, SW, SH, 0);
    else if (now - st.bootAt < BOOT && !reduce) paintBoot(now - st.bootAt);
    else paintDesktop(now);
    const img = gg.getImageData(0, 0, SW, SH), d = img.data, px = new Uint32Array(d.buffer);
    const inkW = rgbWord(ink), paperW = rgbWord(paper);
    for (let y = 0, i = 0; y < SH; y++) {
      const row = ((y >> 1) & 7) * 8;              // 2x2 screen pixels per dot: chunky, like the old days
      for (let x = 0; x < SW; x++, i++) px[i] = d[i * 4] > BAYER[row + ((x >> 1) & 7)] ? paperW : inkW;
    }
    ss.putImageData(img, 0, 0);
    ss.drawImage(overC, 0, 0);
  }

  /* =========================================================
     PROJECTION + DRAWING
  ========================================================= */
  let W = 0, H = 0, dpr = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, fine ? 2 : 1.5);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }

  // the glass: a grid whose middle bulges a touch toward the viewer
  const NX = 14, NY = 10, BULGE = .028;
  const glassPts = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const u = i / NX, v = j / NY, a = 2 * u - 1, b = 2 * v - 1;
    glassPts.push({ m: [GL.x0 + (GL.x1 - GL.x0) * u, GL.y1 - (GL.y1 - GL.y0) * v, GL.z + BULGE * (1 - a * a) * (1 - b * b)], u: u * SW, v: v * SH });
  }

  let yaw = .3, pitch = .1, zoom = 0, zoomTo = 0;
  let projected = null, powerQuad = null;
  const pointer = { tx: 0, ty: 0, inside: false, x: -1, y: -1 };

  function project(t) {
    const narrow = W < 640;
    let scale = Math.min(W / (narrow ? 2.5 : 3.4), H / 2.55);
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const D = 7, F = 6;
    const xf = p => {
      const x = p[0], y = p[1] - .05, z = p[2] + .55;     // turn about the middle of the monitor
      const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
      return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
    };
    const rot = n => { const x1 = n[0] * cyw - n[2] * syw, z1 = n[0] * syw + n[2] * cyw; return [x1, n[1] * cp - z1 * sp, n[1] * sp + z1 * cp]; };
    scale *= 1 + zoom * (narrow ? .9 : .45);
    const raw = v => { const s = F / (D - v[2]) * scale; return [v[0] * s, -v[1] * s]; };
    // zooming in brings the middle of the screen to the middle of the canvas
    const c0 = raw(xf([0, .1, GL.z]));
    const cx = W / 2 - c0[0] * zoom, cy = H * .5 - c0[1] * zoom;
    const toScreen = v => { const r = raw(v); return [cx + r[0], cy + r[1]]; };

    const list = [];
    for (const f of faces) {
      const v = f.p.map(xf);
      const n = rot(f.n), m = mid(v);
      f.front = dot3(n, [m[0], m[1], m[2] - D]) < 0;
      if (!f.front) continue;
      f.s = v.map(toScreen); f.z = m[2];
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      f.lum = (n[0] * LX + n[1] * LY + n[2] * LZ) / l;
      list.push(f);
    }
    const g = glassPts.map(p => ({ s: toScreen(xf(p.m)), u: p.u, v: p.v }));
    const glassFace = { glass: true, z: xf([0, .1, GL.z])[2], s: [g[NY * (NX + 1)].s, g[NY * (NX + 1) + NX].s, g[NX].s, g[0].s] };
    list.push(glassFace);
    list.sort((a, b) => a.z - b.z);
    return { list, g, toScreen, xf };
  }

  function drawGlass(g) {
    ctx.imageSmoothingEnabled = true;
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const a = g[j * (NX + 1) + i], b = g[j * (NX + 1) + i + 1], c = g[(j + 1) * (NX + 1) + i + 1], d = g[(j + 1) * (NX + 1) + i];
      tri(a, b, c); tri(a, c, d);
    }
  }
  // draw one triangle of the screen texture with the affine map that fits its corners
  function tri(p0, p1, p2) {
    const [x0, y0] = p0.s, [x1, y1] = p1.s, [x2, y2] = p2.s;
    const u0 = p0.u, v0 = p0.v, u1 = p1.u, v1 = p1.v, u2 = p2.u, v2 = p2.v;
    const den = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
    if (!den) return;
    const a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / den;
    const b = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / den;
    const c = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / den;
    const d = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / den;
    const e = x0 - a * u0 - c * v0, f = y0 - b * u0 - d * v0;
    // grow the clip a hair so neighbouring triangles leave no seams
    const mx = (x0 + x1 + x2) / 3, my = (y0 + y1 + y2) / 3, k = .9;
    const grow = (x, y) => { const dx = x - mx, dy = y - my, l = Math.hypot(dx, dy) || 1; return [x + dx / l * k, y + dy / l * k]; };
    ctx.save();
    ctx.beginPath();
    let q = grow(x0, y0); ctx.moveTo(q[0], q[1]);
    q = grow(x1, y1); ctx.lineTo(q[0], q[1]);
    q = grow(x2, y2); ctx.lineTo(q[0], q[1]);
    ctx.closePath(); ctx.clip();
    ctx.transform(a, b, c, d, e, f);
    const umin = Math.max(0, Math.min(u0, u1, u2) - 2), vmin = Math.max(0, Math.min(v0, v1, v2) - 2);
    const umax = Math.min(SW, Math.max(u0, u1, u2) + 2), vmax = Math.min(SH, Math.max(v0, v1, v2) + 2);
    ctx.drawImage(screenC, umin, vmin, umax - umin, vmax - vmin, umin, vmin, umax - umin, vmax - vmin);
    ctx.restore();
  }

  function paintFaces(fs) {
    ctx.lineJoin = 'round';
    const body = new Path2D(), lines = new Path2D();
    for (const f of fs) {
      const s = f.s;
      quadPath(body, s);
      for (let k = 0; k < 4; k++) if (f.edges[k]) { const a = s[k], c = s[(k + 1) % 4]; lines.moveTo(a[0], a[1]); lines.lineTo(c[0], c[1]); }
    }
    ctx.fillStyle = paper; ctx.fill(body);
    ctx.strokeStyle = paper; ctx.lineWidth = 1; ctx.stroke(body);
    ctx.strokeStyle = ink; ctx.lineWidth = .9; ctx.stroke(lines);
  }

  // text laid flat on the front of the case
  function decal(P, str, x0, y0, x1, y1, font) {
    const p = P.toScreen(P.xf([x0, y1, 0])), px = P.toScreen(P.xf([x1, y1, 0])), py = P.toScreen(P.xf([x0, y0, 0]));
    const bw = 400, bh = 60;
    ctx.save();
    ctx.transform((px[0] - p[0]) / bw, (px[1] - p[1]) / bw, (py[0] - p[0]) / bh, (py[1] - p[1]) / bh, p[0], p[1]);
    ctx.font = font; ctx.fillStyle = ink; ctx.textBaseline = 'middle';
    ctx.fillText(str, 0, bh / 2);
    ctx.restore();
  }

  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const P = projected = project(now);
    // back to front; the glass goes in at its own depth
    let batch = [];
    for (const f of P.list) {
      if (f.glass) { paintFaces(batch); batch = []; drawGlass(P.g); continue; }
      batch.push(f);
      if (batch.length >= 6) { paintFaces(batch); batch = []; }
    }
    paintFaces(batch);
    shadeDots(P.list);
    // glass edge, badge, vents, power light
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    const edge = [];
    for (let i = 0; i <= NX; i++) edge.push(P.g[i].s);
    for (let j = 1; j <= NY; j++) edge.push(P.g[j * (NX + 1) + NX].s);
    for (let i = NX - 1; i >= 0; i--) edge.push(P.g[NY * (NX + 1) + i].s);
    for (let j = NY - 1; j > 0; j--) edge.push(P.g[j * (NX + 1)].s);
    ctx.beginPath(); edge.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.stroke();
    decal(P, 'Tareq', -.8, -.72, -.5, -.6, `italic 48px ${displayFont}`);
    decal(P, 'TRON 98', -.52, -.7, -.3, -.62, `500 30px ${bodyFont}`);
    for (let k = 0; k < 6; k++) {
      const a = P.toScreen(P.xf([.3 + k * .05, -.6, 0])), b = P.toScreen(P.xf([.3 + k * .05, -.71, 0]));
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    const led = P.toScreen(P.xf([.66, -.655, .001]));
    ctx.beginPath(); ctx.arc(led[0], led[1], 3, 0, TAU);
    if (st.power) { ctx.fillStyle = ink; ctx.fill(); } else ctx.stroke();
    const pf = P.list.find(f => f.tag === 'power' && f.s && Math.abs(f.n[2]) > .5);
    powerQuad = pf ? pf.s : null;
  }

  /* ---------- picking ---------- */
  // canvas point -> screen pixel, through whichever glass triangle it lands in
  function toUI(x, y) {
    if (!projected) return null;
    const g = projected.g;
    const inTri = (a, b, c) => {
      const [x0, y0] = a.s, [x1, y1] = b.s, [x2, y2] = c.s;
      const den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
      if (!den) return null;
      const l0 = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / den;
      const l1 = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / den;
      const l2 = 1 - l0 - l1;
      if (l0 < -1e-4 || l1 < -1e-4 || l2 < -1e-4) return null;
      return [l0 * a.u + l1 * b.u + l2 * c.u, l0 * a.v + l1 * b.v + l2 * c.v];
    };
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const a = g[j * (NX + 1) + i], b = g[j * (NX + 1) + i + 1], c = g[(j + 1) * (NX + 1) + i + 1], d = g[(j + 1) * (NX + 1) + i];
      const r = inTri(a, b, c) || inTri(a, c, d);
      if (r) return r;
    }
    return null;
  }
  const hitAt = p => { for (let k = hits.length - 1; k >= 0; k--) { const h = hits[k]; if (p[0] >= h.x && p[0] < h.x + h.w && p[1] >= h.y && p[1] < h.y + h.h) return h; } return null; };
  function inQuad(q, x, y) {
    let inside = false;
    for (let i = 0, j = 3; i < 4; j = i++) {
      const [xi, yi] = q[i], [xj, yj] = q[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const desktopUp = () => st.power && st.offAt < 0 && st.bootAt >= 0 && (reduce || clock() - st.bootAt >= BOOT);
  const clock = () => performance.now() / 1000;

  function select(i) {
    i = (i + jobs.length) % jobs.length;
    if (i !== st.sel) { st.sel = i; st.selAt = clock(); }
  }
  function act(h) {
    const id = h ? h.id : null;
    if (id !== 'start' && st.start) {
      st.start = false;
      if (!h || !['open', 'cv', 'off'].includes(id)) return;
    }
    if (!h) { st.iconSel = null; return; }
    switch (id) {
      case 'job': select(h.arg); break;
      case 'win-close': st.win = 'closed'; break;
      case 'win-min': st.win = 'min'; break;
      case 'task': st.win = st.win === 'open' ? 'min' : 'open'; break;
      case 'start': st.start = !st.start; break;
      case 'open': case 'icon-exp':
        if (st.win !== 'open') { st.win = 'open'; st.selAt = clock(); }
        st.iconSel = id === 'icon-exp' ? id : null; break;
      case 'cv': case 'icon-cv': st.iconSel = id === 'icon-cv' ? id : null; if (cvHref) window.open(cvHref, '_blank', 'noopener'); break;
      case 'off': setPower(false); break;
      default: st.iconSel = id;
    }
  }
  function setPower(on) {
    const now = clock();
    st.power = on; st.start = false;
    if (on) { st.offAt = -1; st.bootAt = now; }
    else st.offAt = now;
  }

  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const p = desktopUp() ? toUI(x, y) : null;
    const h = p ? hitAt(p) : null;
    const next = h && (h.id === 'job' || h.id.startsWith('win-') || ['open', 'cv', 'off'].includes(h.id)) ? h : null;
    if ((next && next.id + next.arg) !== (st.hover && st.hover.id + st.hover.arg)) lastPaint = 0;   // repaint for the new highlight
    st.hover = next;
  });
  canvas.addEventListener('pointerleave', () => { st.hover = null; lastPaint = 0; });
  canvas.addEventListener('click', e => {
    lastPaint = 0;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (powerQuad && inQuad(powerQuad, x, y)) { setPower(!st.power); return; }
    const p = toUI(x, y);
    // phones: the first tap on the screen zooms in so it can be read; a tap off it zooms out
    if (!fine) {
      if (!p) { zoomTo = 0; return; }
      if (zoomTo < 1) { zoomTo = 1; return; }
    }
    if (p && desktopUp()) act(hitAt(p));
    else if (p && st.bootAt >= 0 && st.offAt < 0) st.bootAt = clock() - BOOT;   // a click skips the boot
  });
  canvas.addEventListener('keydown', e => {
    if (!desktopUp() || st.win !== 'open') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') select(st.sel + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') select(st.sel - 1);
    else return;
    e.preventDefault();
  });
  // the monitor turns to follow the cursor anywhere over the section
  if (fine) {
    addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      pointer.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      pointer.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    }, { passive: true });
  }

  /* ---------- loop ---------- */
  let visible = false, raf = 0, colourTick = 0, lastPaint = 0;
  function frame(ms) {
    raf = 0;
    const now = ms / 1000;
    if (colourTick-- <= 0) {
      ink = getComputedStyle(canvas).color; paper = getComputedStyle(document.body).backgroundColor; colourTick = 30;
    }
    const ty = .3 + pointer.tx * .38, tp = .1 + pointer.ty * .16;
    const k = reduce ? 1 : .06;
    yaw += ((zoomTo ? .0 : ty) - yaw) * k;
    pitch += ((zoomTo ? .02 : tp) - pitch) * k;
    zoom += (zoomTo - zoom) * (reduce ? 1 : .1);
    // the case redraws every frame; the screen fast while something on it moves
    // (boot, power-off, typing), otherwise twice a second for the clock
    const busy = (st.offAt >= 0 && now - st.offAt < .7) || (st.bootAt >= 0 && now - st.bootAt < BOOT + .1) || now - st.selAt < 1.5;
    if (now - lastPaint > (busy ? 1 / 30 : .5)) { paintScreen(now); lastPaint = now; }
    draw(now);
    if (visible && !reduce) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  new ResizeObserver(() => { resize(); kick(); }).observe(canvas);
  resize();
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && st.bootAt < 0 && en.intersectionRatio > .3) { st.bootAt = clock(); st.selAt = clock() + BOOT; }
    if (visible) kick();
  }, { threshold: [0, .35] }).observe(canvas);
  if (reduce) for (const ev of ['click', 'keydown', 'pointermove']) canvas.addEventListener(ev, () => { lastPaint = 0; kick(); });
  kick();
})();
