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
    for (const k in sides) if (!skip.includes(k)) { face(sides[k], sub(mid(sides[k]), c), [1, 1, 1, 1], tag); faces[faces.length - 1].side = k; }
  }
  const box = (x0, x1, y0, y1, z0, z1, skip, tag) => hull(rect(x0, x1, y0, y1, z0), rect(x0, x1, y0, y1, z1), skip, tag);

  // The shape, measured off a reference model (bezel = 2 units wide, front at z = 0):
  // a bevelled bezel, a tapered skirt behind it, then a long shell whose top slopes
  // down and bottom slopes up to a back about half the bezel's height. Underneath:
  // a grilled electronics box under the rear and a flat foot under the front.
  // bezel: bevelled rim, straight sides, then the skirt tapering in to the shell
  hull(rect(-.96, .96, -.843, .843, 0), rect(-1, 1, -.883, .883, -.04), ['front', 'back']);
  box(-1, 1, -.883, .883, -.04, -.24, ['front', 'back']);
  hull(rect(-1, 1, -.883, .883, -.24), rect(-.9, .9, -.76, .69, -.45), ['front', 'back']);
  // the shell, and the box with the grille under its back half
  const SHELL = { z0: -.45, z1: -1.83, top0: .69, top1: .45, x0: .9, x1: .66 };
  hull(rect(-SHELL.x0, SHELL.x0, -.76, SHELL.top0, SHELL.z0), rect(-SHELL.x1, SHELL.x1, -.435, SHELL.top1, SHELL.z1), ['front'], 'shell');
  box(-.5, .5, -.86, -.6, -.72, -1.5, ['top'], 'grille');
  // front frame: a 3x3 grid of quads minus the middle (the opening); only the outer
  // edges and the opening's edges are drawn
  const FX = [-.96, -.87, .87, .96], FY = [-.843, -.7, .69, .843];
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
  // a deep sloped frame from the opening down to the glass
  const OPEN = rect(FX[1], FX[2], FY[1], FY[2], 0);
  const GL = { x0: -.82, x1: .82, y0: -.64, y1: .62, z: -.09 };
  const GLASS = rect(GL.x0, GL.x1, GL.y0, GL.y1, GL.z);
  for (let k = 0; k < 4; k++) {
    const q = [OPEN[k], OPEN[(k + 1) % 4], GLASS[(k + 1) % 4], GLASS[k]];
    face(q, sub([0, 0, 1], mid(q)));
  }
  // the foot under the front, and the power button panel at the bottom right of the chin
  box(-.42, .42, -.94, -.8, -.25, -.95, ['top']);
  box(-.55, .55, -1, -.94, -.12, -1.09);
  box(.57, .71, -.82, -.73, .01, 0, ['back'], 'power');
  // the desk it stands on (wider than the canvas; its back edge reads as a horizon), and
  // a contact shadow under the monitor. These go down first, under everything else.
  const under = (p, hint, edges, order, shade) => { face(p, hint, edges, 'desk'); Object.assign(faces[faces.length - 1], { first: order, shade }); };
  under([[-4.5, -1, 1], [4.5, -1, 1], [4.5, -1, -2.8], [-4.5, -1, -2.8]], [0, 1, 0], [0, 1, 1, 1], 1);
  under([[-4.5, -1.12, 1], [4.5, -1.12, 1], [4.5, -1, 1], [-4.5, -1, 1]], [0, 0, 1], [1, 1, 1, 1], 1);
  under([[-1.2, -1, .3], [1.2, -1, .3], [1.05, -1, -2.05], [-1.05, -1, -2.05]], [0, 1, 0], [0, 0, 0, 0], 2, .12);
  under([[-.75, -1, .08], [.75, -1, .08], [.75, -1, -1.25], [-.75, -1, -1.25]], [0, 1, 0], [0, 0, 0, 0], 3, .26);

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
    list = list.filter(f => !(f.tag === 'desk' && f.shade == null));
    for (const f of list) for (const q of f.s) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    x0 = Math.max(0, Math.floor(x0) - 2); y0 = Math.max(0, Math.floor(y0) - 2);
    x1 = Math.min(gw, Math.ceil(x1) + 2); y1 = Math.min(gh, Math.ceil(y1) + 2);
    const bw = x1 - x0, bh = y1 - y0;
    if (bw <= 0 || bh <= 0) return;
    shadeG.clearRect(x0, y0, bw, bh);
    for (const f of list) {
      // the glass is in the list too, fully lit, so nothing behind it dots through
      const dark = f.glass ? 0 : f.shade != null ? f.shade : .36 * Math.pow(1 - Math.max(0, f.lum), 1.6);
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
  // a fill also wipes the crisp layer under it, so a window or menu painted later
  // covers the lines and text of whatever is behind it
  const grey = (x, y, w, h, v) => {
    gg.fillStyle = `rgb(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0})`; gg.fillRect(x, y, w, h);
    oo.clearRect(x, y, w, h);
  };
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
    else if (kind === 'floppy') { box(4, 3, 24, 26, .7); box(10, 3, 12, 9, 1); box(8, 17, 16, 12, 1); }
    else if (kind === 'drive') { box(2, 10, 28, 14, .8); L(5, 20, 9, 20); L(14, 16, 27, 16); }
    else if (kind === 'flag') { grey(x, y, 6 * s, 6 * s, 0); grey(x + 7 * s, y, 6 * s, 6 * s, .4); grey(x, y + 7 * s, 6 * s, 6 * s, .6); grey(x + 7 * s, y + 7 * s, 6 * s, 6 * s, .2); }
  }

  /* ---------- the apps' contents (edit the jokes here) ---------- */
  // Resume.pdf: a short version of the real CV; the full PDF is one click away inside it
  const RESUME = [
    ['name', 'Muhammad Tareq Adam bin Ellias'],
    ['sub', 'AI & Robotics Engineer · Full-Stack Developer · Postgraduate Student'],
    ['sub', 'Petaling Jaya · tareqadam2002@gmail.com'],
    ['h', 'Summary'],
    ['p', "Master's student at Universiti Malaya, working full-time as a full-stack developer at Intekma. Builds Django platforms and REST APIs, plus AI and robotics software: SLAM, YOLO, speech and pick and place on the Jupiter service robot. Competes at RoboCup with Team RobotEdge."],
    ['h', 'Education'],
    ['b', 'Master of Computer Science (by Research)'],
    ['p', 'Universiti Malaya · expected 2028'],
    ['b', 'Bachelor of Computer Science (Artificial Intelligence)'],
    ['p', "Universiti Malaya · Dec 2025 · GPA 3.72 · Dean's List three times · Honours"],
    ['h', 'Experience'],
    ['p', 'See Experience on the desktop. It has its own app. It earned it.'],
    ['h', 'Skills'],
    ['li', 'Python, JavaScript, TypeScript'],
    ['li', 'Django, Django REST Framework, REST APIs, Docker, Git'],
    ['li', 'LLMs, AI agents, RAG, MCP, speech recognition and synthesis'],
    ['li', 'ROS, SLAM, LiDAR, YOLO, OpenCV, inverse kinematics'],
    ['h', 'Awards'],
    ['li', 'RoboCup Malaysia 2025: 1st place (@Home)'],
    ['li', 'RoboCup Asia-Pacific 2025: 3rd place (Humanoid Soccer, Abu Dhabi)'],
    ['li', 'RoboCup Beijing Masters 2026: 3rd place'],
    ['h', 'Languages'],
    ['p', 'Malay (native) · English (fluent)'],
    ['pdf', 'Save the full resume (PDF)'],
  ];
  const ok = [{ label: 'OK' }];
  const DRIVES = [
    { kind: 'floppy', name: '3½ Floppy (A:)', note: 'Please insert disk', fill: 0,
      msg: { title: '3½ Floppy (A:)', icon: 'x', text: 'A:\\ is not accessible. The device is not ready. (Nobody has owned a floppy disk since 2003.)', buttons: ok } },
    { kind: 'drive', name: 'Side Projects (C:)', note: '99% full', fill: .99,
      msg: { title: 'Low Disk Space', icon: '!', text: 'You are running out of disk space on Side Projects (C:). 14 half-finished ideas are using 99% of it. Finish one before starting another?', buttons: [{ label: 'Later' }, { label: 'Later' }] } },
    { kind: 'drive', name: 'Robots (D:)', note: '3 trophies, 0 sleep', fill: .72,
      msg: { title: 'Robots (D:)', icon: 'i', text: 'D:\\ holds 3 RoboCup trophies, 1 service robot called Jupiter and a slightly burnt servo. Sleep.exe was not found.', buttons: ok } },
    { kind: 'drive', name: 'Kopi (E:)', note: 'Running low', fill: .06,
      msg: { title: 'Kopi (E:)', icon: 'x', text: 'Kopi not found. Abort, Retry, Ignore?', buttons: [
        { label: 'Abort', next: { title: 'Kopi (E:)', icon: 'x', text: 'Cannot abort. Kopi is required to continue.', buttons: ok } },
        { label: 'Retry', next: { title: 'Kopi (E:)', icon: 'x', text: 'Still no kopi. Please refill the mug and press any key.', buttons: ok } },
        { label: 'Ignore', next: { title: 'Kopi (E:)', icon: 'x', text: 'Ignoring kopi is not supported on this system.', buttons: ok } }] } },
  ];
  const BIN = [
    ['sleep_schedule.exe', 'C:\\Life', '2021'],
    ['free_time.zip', 'C:\\Life', 'Jun 2023'],
    ['fyp_final_FINAL_v7.docx', 'C:\\Uni\\FYP', '2025'],
    ['bug_or_feature.py', 'C:\\Intekma', 'Last Tuesday'],
    ['jquery.min.js', 'C:\\Website\\js', 'Overdue'],
    ['plan_b.txt', 'C:\\Life', 'Never opened'],
  ];
  const EMPTY_BIN = { title: 'Confirm Delete', icon: '!', text: `Are you sure you want to permanently delete these ${BIN.length} items?`, buttons: [
    { label: 'Yes', next: { title: 'Error Deleting File', icon: 'x', text: "Cannot delete sleep_schedule.exe: it is being used by another program (Master's degree). Close the program and try again in 2028.", buttons: ok } },
    { label: 'No' }] };
  const APPS = {
    cv: { title: 'Resume.pdf - Tingkap Reader', task: 'Resume.pdf', kind: 'doc', x: 128, y: 22, w: 448, h: 414 },
    pc: { title: 'My Computer', task: 'My Computer', kind: 'pc', x: 140, y: 46, w: 420, h: 300 },
    bin: { title: 'Recycle Bin', task: 'Recycle Bin', kind: 'bin', x: 132, y: 34, w: 452, h: 330 },
  };

  /* ---------- desktop state ---------- */
  const st = {
    win: 'open',          // the Experience window: 'open' | 'min' | 'closed'
    app: null,            // one other app open at a time: 'cv' | 'pc' | 'bin'
    top: 'exp',           // which window is in front: 'exp' | 'app'
    msg: null,            // a message box, if one is up (it's modal)
    scroll: 0, binSel: -1,
    mApp: 'exp', mDetail: false,   // the mobile edition: which app is up, and whether a job is open
    start: false, sel: 0, selAt: 0, hover: null, iconSel: null,
    power: true, bootAt: -1, offAt: -1, onAt: -1,
  };
  let hits = [], hitScale = 1;   // hitScale: the mobile edition is drawn at 2x                       // clickable areas in screen pixels, rebuilt each paint
  const hit = (x, y, w, h, id, arg) => hits.push({ x, y, w, h, id, arg });
  const BOOT = 2.4;
  const hv = (id, arg) => st.hover && st.hover.id === id && (arg === undefined || st.hover.arg === arg);
  const outline = (x, y, w, h) => { line(x, y, x + w, y); line(x, y + h - 1, x + w, y + h - 1); line(x, y, x, y + h); line(x + w - 1, y, x + w - 1, y + h); };
  function button(x, y, w, h, label, id, arg, o = {}) {
    grey(x, y, w, h, 1); bevel(x, y, w, h, !hv(id, arg));
    text(label, x + w / 2, y + h / 2 + .5, { size: 11, align: 'center', ...o });
    hit(x, y, w, h, id, arg);
  }

  // a window frame: title bar (ink when in front), its buttons, and a click-to-focus area
  function windowFrame(x, y, w, h, title, kind, prefix, active, minimise) {
    hit(x, y, w, h, 'focus', prefix);
    grey(x, y, w, h, 1);   // anything text sits on is solid paper: dots would break up the letters
    bevel(x, y, w, h); bevel(x + 1, y + 1, w - 2, h - 2);
    grey(x + 3, y + 3, w - 6, 20, active ? 0 : 1);
    if (!active) outline(x + 3, y + 3, w - 6, 20);
    icon(kind, x + 6, y + 5, .5);
    text(title, x + 26, y + 13.5, { bold: true, col: active ? paper : ink, max: w - 100 });
    const btns = minimise ? [['min', '_'], ['max', '□'], ['close', '×']] : [['close', '×']];
    btns.forEach(([b, g], k) => {
      const bx = x + w - 20 - (btns.length - 1 - k) * 18 - (b === 'close' ? 0 : 2), by = y + 6, id = `${prefix}-${b}`;
      grey(bx, by, 16, 14, 1); bevel(bx, by, 16, 14, !hv(id));
      text(g, bx + 8, by + 7, { size: g === '_' ? 11 : 12, bold: true, align: 'center' });
      hit(bx, by, 16, 14, id);
    });
  }
  function statusBar(x, y, w, parts) {
    let px = x + 4;
    parts.forEach(([label, pw], k) => {
      const ww = k === parts.length - 1 ? x + w - 4 - px : pw;
      grey(px, y, ww, 19, 1); bevel(px, y, ww, 19, false);
      text(label, px + 6, y + 10, { size: 11, max: ww - 10 });
      px += ww + 4;
    });
  }

  function paintExperience(now, active) {
    const wx = 100, wy = 12, ww = 528, wh = 432;
    windowFrame(wx, wy, ww, wh, 'Experience - Tareq Adam', 'folder', 'win', active, true);
    ['File', 'Edit', 'View', 'Help'].reduce((x, m) => x + text(m, x, wy + 34, { size: 12 }) + 14, wx + 10);
    const top = wy + 46, bot = wy + wh - 28;
    // the job list
    const lx = wx + 6, lw = 182;
    grey(lx, top, lw, bot - top, 1); bevel(lx, top, lw, bot - top, false);
    jobs.forEach((j, i) => {
      const iy = top + 6 + i * 56, on = i === st.sel;
      if (on) grey(lx + 3, iy, lw - 6, 50, 0);
      else if (hv('job', i)) outline(lx + 3, iy, lw - 6, 50);
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
    const chips = [];
    oo.font = `11px ${UI}`;
    for (const t of job.tags) {
      const w = oo.measureText(t).width + 16;
      if (tx + w > dx + dw - 14) { tx = dx + 14; ty -= 24; }
      chips.push([t, tx, ty, w]); tx += w + 6;
    }
    if (chips.length) type('Skills used:', dx + 14, Math.min(...chips.map(r => r[2])) - 12, { size: 11, bold: true });
    for (const [t, bx, by, w] of chips) {
      if (budget <= 0) break;
      grey(bx, by, w, 20, 1); bevel(bx, by, w, 20);
      type(t, bx + w / 2, by + 10, { size: 11, align: 'center' });
    }
    if (budget <= 0 && Math.sin(now * 10) > 0) grey(dx + 14, y - 8, 8, 14, 0);   // typing caret
    statusBar(wx, wy + wh - 24, ww, [[`${jobs.length} object(s)`, 200], [`Record ${st.sel + 1} of ${jobs.length}`]]);
  }

  // Resume.pdf: laid out once per width (and size), then drawn through a scrolling viewport
  let cvLayout = null;
  function layoutResume(w, k = 1) {
    if (cvLayout && cvLayout.w === w && cvLayout.k === k) return cvLayout;
    const ops = []; let y = 0;
    const add = (o, h) => { ops.push({ ...o, y }); y += h * k; };
    for (const [kind, t] of RESUME) {
      if (kind === 'name') { add({ k: kind, t }, 26); continue; }
      if (kind === 'sub') { add({ k: kind, t }, 16); continue; }
      if (kind === 'h') { y += 10 * k; add({ k: kind, t: t.toUpperCase() }, 24); continue; }
      if (kind === 'b') { add({ k: kind, t }, 17); continue; }
      if (kind === 'pdf') { y += 14 * k; add({ k: kind, t }, 34); continue; }
      oo.font = `${12 * k}px ${UI}`;
      const lines = wrapText(t, kind === 'li' ? w - 14 * k : w);
      lines.forEach((l, i) => add({ k: kind === 'li' && i ? 'li2' : kind, t: l }, 17));
      y += 3 * k;
    }
    return (cvLayout = { w, k, ops, h: y + 12 * k });
  }
  function drawResume(L, vx, vy, vw, vh, k = 1) {
    oo.save(); oo.beginPath(); oo.rect(vx, vy, vw, vh); oo.clip();
    const px = vx + 20 * k, f = n => n * k;
    for (const o of L.ops) {
      const y = vy + f(16) + o.y - st.scroll;
      if (y < vy - 30 || y > vy + vh + 30) continue;
      if (o.k === 'name') text(o.t.toUpperCase(), vx + vw / 2, y + f(8), { size: f(17), bold: true, align: 'center', max: vw - 10 });
      else if (o.k === 'sub') text(o.t, vx + vw / 2, y + f(6), { size: f(11), align: 'center', max: vw - 10 });
      else if (o.k === 'h') {
        const tw = text(o.t, vx + vw / 2, y + f(10), { size: f(12), align: 'center' });
        line(px, y + f(10), vx + vw / 2 - tw / 2 - 8, y + f(10)); line(vx + vw / 2 + tw / 2 + 8, y + f(10), vx + vw - 20 * k, y + f(10));
      }
      else if (o.k === 'b') text(o.t, px, y + f(7), { size: f(12), bold: true, max: vw - 40 * k });
      else if (o.k === 'li') { text('•', px + 2, y + f(7), { size: f(12) }); text(o.t, px + f(14), y + f(7), { size: f(12) }); }
      else if (o.k === 'li2') text(o.t, px + f(14), y + f(7), { size: f(12) });
      else if (o.k === 'p') text(o.t, px, y + f(7), { size: f(12) });
      else if (o.k === 'pdf' && y >= vy && y + f(26) <= vy + vh) button(vx + vw / 2 - f(110), y, f(220), f(26), o.t, 'cv-pdf', undefined, { bold: true, size: f(11) });
    }
    oo.restore();
  }
  function paintResume(a) {
    ['File', 'View', 'Help'].reduce((x, m) => x + text(m, x, a.y + 34, { size: 12 }) + 14, a.x + 10);
    const vx = a.x + 6, vy = a.y + 46, vw = a.w - 12 - 16, vh = a.h - 46 - 28;
    grey(vx, vy, vw + 16, vh, 1); bevel(vx - 1, vy - 1, vw + 18, vh + 2, false);
    const L = layoutResume(vw - 40);
    const maxScroll = Math.max(0, L.h - vh + 20);
    st.scroll = Math.max(0, Math.min(maxScroll, st.scroll));
    st.cvView = { x: vx, y: vy, w: vw, h: vh, max: maxScroll };
    drawResume(L, vx, vy, vw, vh);
    // the scrollbar
    const sx = vx + vw, tTop = vy + 16, tH = vh - 32;
    grey(sx, tTop, 16, tH, .72);
    const thumbH = maxScroll ? Math.max(24, tH * vh / (vh + maxScroll)) : tH;
    const thumbY = tTop + (maxScroll ? (tH - thumbH) * st.scroll / maxScroll : 0);
    if (maxScroll) { hit(sx, tTop, 16, thumbY - tTop, 'cv-pgup'); hit(sx, thumbY + thumbH, 16, tTop + tH - thumbY - thumbH, 'cv-pgdn'); }
    grey(sx, thumbY, 16, thumbH, 1); bevel(sx, thumbY, 16, thumbH);
    for (const [id, by, dir] of [['cv-up', vy, -1], ['cv-down', vy + vh - 16, 1]]) {
      grey(sx, by, 16, 16, 1); bevel(sx, by, 16, 16, !hv(id));
      oo.fillStyle = ink; oo.beginPath();
      oo.moveTo(sx + 4, by + 8 - dir * 2); oo.lineTo(sx + 12, by + 8 - dir * 2); oo.lineTo(sx + 8, by + 8 + dir * 2); oo.closePath(); oo.fill();
      hit(sx, by, 16, 16, id);
    }
    statusBar(a.x, a.y + a.h - 24, a.w, [['Page 1 of 1', 120], ['Scroll for more · the PDF button is at the bottom']]);
  }

  function paintComputer(a) {
    DRIVES.forEach((d, i) => {
      const tx = a.x + 14 + (i % 2) * 200, ty = a.y + 36 + Math.floor(i / 2) * 104, tw = 192, th = 96;
      if (hv('drive', i)) outline(tx, ty, tw, th);
      icon(d.kind, tx + 8, ty + 10, 1);
      text(d.name, tx + 48, ty + 18, { bold: true, max: tw - 54 });
      text(d.note, tx + 48, ty + 36, { size: 11, max: tw - 54 });
      grey(tx + 48, ty + 52, 130, 12, 1); bevel(tx + 48, ty + 52, 130, 12, false);
      if (d.fill) grey(tx + 50, ty + 54, 126 * d.fill, 8, 0);
      text(d.fill ? `${Math.round(d.fill * 100)}% used` : 'No disk', tx + 48, ty + 76, { size: 11 });
      hit(tx, ty, tw, th, 'drive', i);
    });
    statusBar(a.x, a.y + a.h - 24, a.w, [[`${DRIVES.length} object(s)`, 90], ['Tingkap 98 · Brain 1.0 @ 3 cups of kopi · 640K RAM']]);
  }

  function paintBin(a) {
    const lx = a.x + 6, ly = a.y + 28, lw = a.w - 12, rowH = 22;
    const cols = [['Name', 190], ['Original location', 130], ['Deleted', lw - 320]];
    grey(lx, ly, lw, 24 + BIN.length * rowH + 8, 1); bevel(lx, ly, lw, 24 + BIN.length * rowH + 8, false);
    let cx = lx + 2;
    for (const [h, w] of cols) { grey(cx, ly + 2, w, 20, 1); bevel(cx, ly + 2, w, 20); text(h, cx + 6, ly + 12, { size: 11 }); cx += w; }
    BIN.forEach((r, i) => {
      const ry = ly + 26 + i * rowH, on = i === st.binSel;
      if (on) grey(lx + 2, ry, lw - 4, rowH, 0);
      else if (hv('bin-row', i)) outline(lx + 2, ry, lw - 4, rowH);
      let x = lx + 2;
      r.forEach((c, k) => { text(c, x + 6, ry + 11, { size: 11, col: on ? paper : ink, max: cols[k][1] - 10 }); x += cols[k][1]; });
      hit(lx + 2, ry, lw - 4, rowH, 'bin-row', i);
    });
    button(lx, a.y + a.h - 58, 150, 24, 'Empty Recycle Bin', 'bin-empty');
    statusBar(a.x, a.y + a.h - 24, a.w, [[`${BIN.length} object(s)`, 90], ['0 bytes of regret, give or take']]);
  }

  function paintApp(active) {
    const a = APPS[st.app];
    windowFrame(a.x, a.y, a.w, a.h, a.title, a.kind, 'app', active, false);
    if (st.app === 'cv') paintResume(a);
    else if (st.app === 'pc') paintComputer(a);
    else paintBin(a);
  }

  // a message box; while it's up, nothing else can be clicked
  function paintMessage(AW = SW, AH = SH - 28, w = 330, fs = 12) {
    const m = st.msg;
    oo.font = `${fs}px ${UI}`;
    const lines = wrapText(m.text, w - 80);
    const lh = fs + 5, h = 74 + lines.length * lh + 30, x = (AW - w) / 2, y = (AH - h) / 2;
    hit(0, 0, AW, AH + 28, 'modal');
    windowFrame(x, y, w, h, m.title, 'pc', 'msg', true, false);
    // its icon: a ring with a mark in it
    const ix = x + 32, iy = y + 50;
    grey(ix - 15, iy - 15, 30, 30, 1);
    oo.fillStyle = ink; oo.beginPath(); oo.arc(ix, iy, 14, 0, TAU); oo.fill();
    text(m.icon === 'x' ? '×' : m.icon, ix, iy + 1, { size: m.icon === 'x' ? 24 : 18, bold: true, col: paper, align: 'center', font: 'Georgia, serif' });
    lines.forEach((l, i) => text(l, x + 60, y + 44 + i * lh, { size: fs }));
    const bw = 76, gap = 8, total = m.buttons.length * bw + (m.buttons.length - 1) * gap;
    m.buttons.forEach((b, i) => button(x + (w - total) / 2 + i * (bw + gap), y + h - 34, bw, 24, b.label, 'msg-btn', i));
  }

  /* ---------- the mobile edition ----------
     On a phone the full desktop shrinks to nothing, so the screen runs a big-type
     edition instead: a 320x240 layout (drawn at 2x into the same texture), one
     full-screen app at a time, like an old handheld. Not zoomed in it's a job picker
     (the spec plate under the monitor has the details); zoomed in, the apps open up. */
  const MW = 320, MH = 240, MT = MH - 22;   // MT: where the taskbar starts
  function paintMobile(now) {
    grey(0, 0, MW, MH, .55);
    const app = st.mApp;
    const titles = { exp: ['Experience', 'folder'], cv: ['Resume.pdf', 'doc'], pc: ['My Computer', 'pc'], bin: ['Recycle Bin', 'bin'] };
    const [title, kind] = titles[app];
    windowFrame(0, 0, MW, MT, title, kind, 'm', true, false);
    const top = 26, bot = MT - 4;

    if (app === 'exp' && !st.mDetail) {
      jobs.forEach((j, i) => {
        const y = top + 2 + i * 46, on = i === st.sel;
        if (on) grey(4, y, MW - 8, 42, 0);
        icon('folder', 10, y + 10, .7);
        text(j.role, 38, y + 15, { size: 13, bold: true, col: on ? paper : ink, max: MW - 50 });
        text(j.when, 38, y + 31, { size: 11, col: on ? paper : ink, max: MW - 50 });
        hit(4, y, MW - 8, 42, 'mjob', i);
      });
      line(8, top + 146, MW - 8, top + 146);
      text(zoomTo ? 'Tap a job to open it' : 'Tap the screen to zoom in · details below ↓', MW / 2, top + 162, { size: 11, align: 'center', max: MW - 16 });
      text(`Record ${st.sel + 1} of ${jobs.length}`, MW / 2, top + 180, { size: 10, align: 'center' });
    }
    else if (app === 'exp') {
      const j = jobs[st.sel];
      button(4, top + 2, 56, 20, '‹ Back', 'mback');
      text(`${st.sel + 1} / ${jobs.length}`, MW - 8, top + 12, { size: 10, align: 'right' });
      text(j.role, 8, top + 42, { size: 20, font: displayFont, max: MW - 16 });
      const [company] = (j.meta[0] || '').split(' · ');
      const [type] = (j.meta[1] || '').split(' · ');
      text([company, type].filter(Boolean).join(' · '), 8, top + 62, { size: 10, max: MW - 16 });
      text(j.when, 8, top + 76, { size: 10, bold: true });
      line(8, top + 86, MW - 8, top + 86);
      const budget = reduce ? Infinity : (now - st.selAt) * 700;
      oo.font = `11px ${UI}`;
      let y = top + 100, used = 0;
      for (const l of wrapText(j.desc, MW - 16)) {
        if (y > bot - 34) break;
        const shown = l.slice(0, Math.max(0, Math.floor(budget - used))); used += l.length;
        text(shown, 8, y, { size: 11 }); y += 14;
      }
      oo.font = `10px ${UI}`;
      const tags = wrapText('Skills: ' + j.tags.join(' / '), MW - 16);
      tags.slice(0, 2).forEach((l, i) => text(l, 8, bot - 22 + i * 12, { size: 10 }));
    }
    else if (app === 'cv') {
      const vx = 4, vy = top, vw = MW - 8 - 12, vh = bot - top;
      grey(vx, vy, vw + 12, vh, 1); bevel(vx - 1, vy - 1, vw + 14, vh + 2, false);
      const L = layoutResume(vw - 16, .85);
      const maxScroll = Math.max(0, L.h - vh + 12);
      st.scroll = Math.max(0, Math.min(maxScroll, st.scroll));
      st.cvView = { x: vx, y: vy, w: vw, h: vh, max: maxScroll };
      drawResume(L, vx, vy, vw, vh, .85);
      // a slim scrollbar with arrow buttons
      const sx = vx + vw;
      grey(sx, vy + 12, 12, vh - 24, .72);
      if (maxScroll) {
        const th = Math.max(16, (vh - 24) * vh / (vh + maxScroll)), ty = vy + 12 + (vh - 24 - th) * st.scroll / maxScroll;
        grey(sx, ty, 12, th, 1); bevel(sx, ty, 12, th);
      }
      for (const [id, by, dir] of [['cv-up', vy, -1], ['cv-down', vy + vh - 12, 1]]) {
        grey(sx, by, 12, 12, 1); bevel(sx, by, 12, 12);
        oo.fillStyle = ink; oo.beginPath();
        oo.moveTo(sx + 3, by + 6 - dir * 2); oo.lineTo(sx + 9, by + 6 - dir * 2); oo.lineTo(sx + 6, by + 6 + dir * 2); oo.closePath(); oo.fill();
        hit(sx, by, 12, 12, id);
      }
    }
    else if (app === 'pc') {
      DRIVES.forEach((d, i) => {
        const y = top + 2 + i * 46;
        icon(d.kind, 8, y + 6, .8);
        text(d.name, 42, y + 12, { size: 12, bold: true, max: MW - 54 });
        text(d.note, 42, y + 27, { size: 10, max: 120 });
        grey(170, y + 22, 100, 9, 1); bevel(170, y + 22, 100, 9, false);
        if (d.fill) grey(171, y + 23, 98 * d.fill, 7, 0);
        hit(4, y, MW - 8, 42, 'drive', i);
      });
    }
    else if (app === 'bin') {
      BIN.forEach((r, i) => {
        const y = top + 2 + i * 24, on = i === st.binSel;
        if (on) grey(4, y, MW - 8, 22, 0);
        icon('doc', 8, y + 3, .5);
        text(r[0], 28, y + 11, { size: 11, col: on ? paper : ink, max: 190 });
        text(r[2], MW - 10, y + 11, { size: 10, col: on ? paper : ink, align: 'right', max: 90 });
        hit(4, y, MW - 8, 22, 'bin-row', i);
      });
      button(4, bot - 24, 130, 22, 'Empty Recycle Bin', 'bin-empty');
    }

    // taskbar
    grey(0, MT, MW, MH - MT, 1); line(0, MT, MW, MT);
    grey(2, MT + 3, 52, 17, 1); bevel(2, MT + 3, 52, 17, !st.start);
    icon('flag', 6, MT + 6, .8);
    text('Start', 20, MT + 12, { size: 11, bold: true });
    hit(2, MT + 3, 52, 17, 'start');
    grey(58, MT + 3, 190, 17, 1); bevel(58, MT + 3, 190, 17, false);
    text(title, 64, MT + 12, { size: 11, bold: true, max: 178 });
    grey(MW - 66, MT + 3, 64, 17, 1); bevel(MW - 66, MT + 3, 64, 17, false);
    text(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), MW - 34, MT + 12, { size: 10, align: 'center' });

    if (st.start) {
      const items = [['open', 'folder', 'Experience'], ['cv', 'doc', 'Resume.pdf'], ['mypc', 'pc', 'My Computer'], ['mbin', 'bin', 'Recycle Bin'], null, ['off', 'pc', 'Shut Down...']];
      const mw = 160, mh = 5 * 26 + 8 + 8, mx = 2, my = MT - mh;
      grey(mx, my, mw, mh, 1); bevel(mx, my, mw, mh); bevel(mx + 1, my + 1, mw - 2, mh - 2);
      grey(mx + 3, my + 3, 18, mh - 6, 0);
      oo.save(); oo.translate(mx + 12, my + mh - 6); oo.rotate(-Math.PI / 2);
      text('Tingkap98', 0, 0, { size: 12, bold: true, col: paper }); oo.restore();
      let iy = my + 4;
      for (const it of items) {
        if (!it) { line(mx + 24, iy + 3, mx + mw - 4, iy + 3); iy += 8; continue; }
        const [id, k, label] = it;
        icon(k, mx + 26, iy + 5, .5);
        text(label, mx + 48, iy + 13, { size: 12 });
        hit(mx + 22, iy, mw - 26, 26, id);
        iy += 26;
      }
    }
    if (st.msg) paintMessage(MW, MH - 22, 290, 11);
  }

  function paintDesktop(now) {
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

    // the windows, back to front
    const expUp = st.win === 'open';
    const order = st.top === 'app' ? ['exp', 'app'] : ['app', 'exp'];
    for (const w of order) {
      if (w === 'exp' && expUp) paintExperience(now, st.top === 'exp' || !st.app);
      if (w === 'app' && st.app) paintApp(st.top === 'app' || !expUp);
    }

    // taskbar
    const ty = SH - 28;
    grey(0, ty, SW, 28, 1); line(0, ty, SW, ty);
    grey(3, ty + 4, 58, 21, 1); bevel(3, ty + 4, 58, 21, !st.start);
    icon('flag', 8, ty + 8, 1);
    text('Start', 25, ty + 15, { bold: true });
    hit(3, ty + 4, 58, 21, 'start');
    let bx = 66;
    const task = (label, kind, id, pressed) => {
      grey(bx, ty + 4, 150, 21, 1); bevel(bx, ty + 4, 150, 21, !pressed);
      icon(kind, bx + 4, ty + 8, .45);
      text(label, bx + 24, ty + 15, { bold: pressed, max: 120 });
      hit(bx, ty + 4, 150, 21, id);
      bx += 154;
    };
    if (st.win !== 'closed') task('Experience', 'folder', 'task', expUp && (st.top === 'exp' || !st.app));
    if (st.app) task(APPS[st.app].task, APPS[st.app].kind, 'task-app', st.top === 'app' || !expUp);
    grey(SW - 72, ty + 4, 69, 21, 1); bevel(SW - 72, ty + 4, 69, 21, false);
    text(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), SW - 37, ty + 15, { size: 11, align: 'center' });

    // start menu
    if (st.start) {
      const items = [['open', 'folder', 'Experience'], ['cv', 'doc', 'Resume.pdf'], ['mypc', 'pc', 'My Computer'], null, ['off', 'pc', 'Shut Down...']];
      const mw = 190, mh = 4 * 30 + 10 + 16, mx = 3, my = ty - mh;
      grey(mx, my, mw, mh, 1); bevel(mx, my, mw, mh); bevel(mx + 1, my + 1, mw - 2, mh - 2);
      grey(mx + 3, my + 3, 22, mh - 6, 0);
      oo.save(); oo.translate(mx + 14, my + mh - 8); oo.rotate(-Math.PI / 2);
      text('Tingkap98', 0, 0, { size: 15, bold: true, col: paper }); oo.restore();
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
    if (st.msg) paintMessage();
  }

  function paintBoot(t) {
    grey(0, 0, SW, SH, 0);
    text('Tingkap', SW / 2 - 8, SH / 2 - 30, { size: 64, font: displayFont, col: paper, align: 'right' });
    text('98', SW / 2 + 2, SH / 2 - 30, { size: 64, bold: true, col: paper });
    text('Starting Tingkap 98...', SW / 2, SH / 2 + 30, { size: 13, col: paper, align: 'center' });
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
    else if (small) { gg.setTransform(2, 0, 0, 2, 0, 0); oo.setTransform(2, 0, 0, 2, 0, 0); paintMobile(now); }
    else paintDesktop(now);
    hitScale = small && st.offAt < 0 ? 2 : 1;
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
  let W = 0, H = 0, dpr = 1, small = false;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, fine ? 1.5 : 1.25);
    W = r.width; H = r.height;
    const was = small; small = W < 640;
    if (was !== small) { st.start = false; lastPaint = 0; }
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }

  // the glass: a grid whose middle bulges a touch toward the viewer
  const NX = 8, NY = 6, BULGE = .028;
  const glassPts = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const u = i / NX, v = j / NY, a = 2 * u - 1, b = 2 * v - 1;
    glassPts.push({ m: [GL.x0 + (GL.x1 - GL.x0) * u, GL.y1 - (GL.y1 - GL.y0) * v, GL.z + BULGE * (1 - a * a) * (1 - b * b)], u: u * SW, v: v * SH });
  }

  let yaw = .2, pitch = .08, zoom = 0, zoomTo = 0;
  let projected = null, powerQuad = null;
  const pointer = { tx: 0, ty: 0, inside: false, x: -1, y: -1 };

  function project(t) {
    const narrow = W < 640;
    let scale = Math.min(W / (narrow ? 2.4 : W >= 1000 ? 4.2 : 3.3), H / 2.5);
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const D = 7, F = 6;
    const xf = p => {
      const x = p[0], y = p[1] + .06, z = p[2] + .9;     // turn about the middle of the monitor
      const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
      return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
    };
    const rot = n => { const x1 = n[0] * cyw - n[2] * syw, z1 = n[0] * syw + n[2] * cyw; return [x1, n[1] * cp - z1 * sp, n[1] * sp + z1 * cp]; };
    // zoomed in, the whole front of the monitor fills the canvas (bezel included, so
    // nothing is cut off at the top or bottom) and the desktop is big enough to read
    // on a phone the glass itself fills the width instead, letting the bezel crop
    const zp = small ? [0, (GL.y0 + GL.y1) / 2, GL.z] : [0, 0, 0];
    if (zoom > .001) {
      const zg = xf(zp)[2];
      const fit = (small ? Math.min(.97 * W / (GL.x1 - GL.x0), .92 * H / (GL.y1 - GL.y0)) : Math.min(.9 * H / (2 * .883), .94 * W / 2)) * (D - zg) / F;
      scale += (fit - scale) * zoom;
    }
    const raw = v => { const s = F / (D - v[2]) * scale; return [v[0] * s, -v[1] * s]; };
    // zooming in brings the middle of the screen to the middle of the canvas
    const c0 = raw(xf(zp));
    const cx = W / 2 - c0[0] * zoom, cy = H * .5 - c0[1] * zoom;
    const toScreen = v => { const r = raw(v); return [cx + r[0], cy + r[1]]; };

    const list = [];
    for (const f of faces) {
      const v = f.p.map(xf);
      const n = rot(f.n), m = mid(v);
      f.front = dot3(n, [m[0], m[1], m[2] - D]) < 0;
      if (!f.front) continue;
      f.s = v.map(toScreen); f.z = f.first ? f.first - 1e9 : m[2];
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      f.lum = (n[0] * LX + n[1] * LY + n[2] * LZ) / l;
      list.push(f);
    }
    const g = glassPts.map(p => ({ s: toScreen(xf(p.m)), u: p.u, v: p.v }));
    const glassFace = { glass: true, z: xf([0, (GL.y0 + GL.y1) / 2, GL.z])[2], s: [g[NY * (NX + 1)].s, g[NY * (NX + 1) + NX].s, g[NX].s, g[0].s] };
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

  // vent slots across the back of the shell's sloping top
  function vents(P) {
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 12; k++) {
      const z = -1.3 - k * .04, t = (z - SHELL.z0) / (SHELL.z1 - SHELL.z0), y = SHELL.top0 + (SHELL.top1 - SHELL.top0) * t;
      const half = SHELL.x0 + (SHELL.x1 - SHELL.x0) * t - .1;
      for (const [xa, xb] of [[-half, -.03], [.03, half]]) {
        const a = P.toScreen(P.xf([xa, y, z])), b = P.toScreen(P.xf([xb, y, z]));
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
    }
    ctx.stroke();
  }

  // a fine grille on whichever side of the box under the shell is in view
  function grille(P, f) {
    const x = f.side === 'left' ? -.5 : .5;
    ctx.strokeStyle = ink; ctx.lineWidth = .7;
    ctx.beginPath();
    for (let z = -.8; z > -1.43; z -= .035) {
      const a = P.toScreen(P.xf([x, -.66, z])), b = P.toScreen(P.xf([x, -.82, z]));
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    for (let y = -.66; y >= -.821; y -= .04) {
      const a = P.toScreen(P.xf([x, y, -.8])), b = P.toScreen(P.xf([x, y, -1.43]));
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
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
      // the shell's top gets its vents straight away, so nearer parts still cover them
      if (f.tag === 'shell' && f.side === 'top') { batch.push(f); paintFaces(batch); batch = []; vents(P); continue; }
      if (f.tag === 'grille' && (f.side === 'left' || f.side === 'right')) { batch.push(f); paintFaces(batch); batch = []; grille(P, f); continue; }
      batch.push(f);
      if (batch.length >= 6) { paintFaces(batch); batch = []; }
    }
    paintFaces(batch);
    shadeDots(P.list);
    // fade the desk out toward the canvas's sides
    ctx.save(); ctx.globalCompositeOperation = 'destination-out';
    const fw = W * .07;
    for (const [x0, x1] of [[0, fw], [W, W - fw]]) {
      const gr = ctx.createLinearGradient(x0, 0, x1, 0);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(Math.min(x0, x1), 0, fw, H);
    }
    ctx.restore();
    // glass edge, badge, vents, power light
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    const edge = [];
    for (let i = 0; i <= NX; i++) edge.push(P.g[i].s);
    for (let j = 1; j <= NY; j++) edge.push(P.g[j * (NX + 1) + NX].s);
    for (let i = NX - 1; i >= 0; i--) edge.push(P.g[NY * (NX + 1) + i].s);
    for (let j = NY - 1; j > 0; j--) edge.push(P.g[j * (NX + 1)].s);
    ctx.beginPath(); edge.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.stroke();
    decal(P, 'Tareq', -.88, -.83, -.68, -.72, `italic 48px ${displayFont}`);
    decal(P, 'TRON 98', -.69, -.815, -.56, -.74, `500 30px ${bodyFont}`);
    const led = P.toScreen(P.xf([.5, -.775, .001]));
    ctx.beginPath(); ctx.arc(led[0], led[1], 3, 0, TAU);
    if (st.power) { ctx.fillStyle = ink; ctx.fill(); } else ctx.stroke();
    const pf = P.list.find(f => f.tag === 'power' && f.side === 'front');
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
  const hitAt = q => { const p = [q[0] / hitScale, q[1] / hitScale]; for (let k = hits.length - 1; k >= 0; k--) { const h = hits[k]; if (p[0] >= h.x && p[0] < h.x + h.w && p[1] >= h.y && p[1] < h.y + h.h) return h; } return null; };
  function inQuad(q, x, y) {
    let inside = false;
    for (let i = 0, j = 3; i < 4; j = i++) {
      const [xi, yi] = q[i], [xj, yj] = q[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // the button is small on screen, so a click just next to it counts too
  function onPower(x, y) {
    if (!powerQuad) return false;
    if (inQuad(powerQuad, x, y)) return true;
    const c = powerQuad.reduce((m, q) => [m[0] + q[0] / 4, m[1] + q[1] / 4], [0, 0]);
    return Math.hypot(x - c[0], y - c[1]) < 16;
  }
  const desktopUp = () => st.power && st.offAt < 0 && st.bootAt >= 0 && (reduce || clock() - st.bootAt >= BOOT);
  const clock = () => performance.now() / 1000;

  function select(i) {
    i = (i + jobs.length) % jobs.length;
    if (i !== st.sel) { st.sel = i; st.selAt = clock(); syncPanels(); }
  }

  /* ---------- either side of the monitor: timeline and spec plate ---------- */
  const band = canvas.closest('.crt-band');
  const tl = band && band.querySelector('[data-crt-timeline] ol');
  const spec = band && band.querySelector('[data-crt-spec]');
  const count = band && band.querySelector('[data-crt-count]');
  if (count) count.textContent = `${jobs.length} records`;
  const tlItems = tl ? jobs.map((j, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'crt-tl-item';
    b.innerHTML = '<span class="p6"></span><span class="h6"></span>';
    b.firstChild.textContent = j.when; b.lastChild.textContent = j.role;
    b.addEventListener('click', () => {
      if (st.win !== 'open') st.win = 'open';
      st.start = false; st.top = 'exp';
      select(i); lastPaint = 0; kick();
    });
    li.appendChild(b); tl.appendChild(li);
    return b;
  }) : [];
  function syncPanels() {
    tlItems.forEach((b, i) => b.setAttribute('aria-current', String(i === st.sel)));
    if (!spec) return;
    const j = jobs[st.sel];
    const [company] = (j.meta[0] || '').split(' · ');
    const [type, ...where] = (j.meta[1] || '').split(' · ');
    spec.querySelector('[data-spec-kicker]').textContent = `Record ${String(st.sel + 1).padStart(2, '0')} / ${String(jobs.length).padStart(2, '0')}`;
    spec.querySelector('[data-spec-role]').textContent = j.role;
    const rows = spec.querySelector('[data-spec-rows]');
    rows.innerHTML = '';
    for (const [k, v] of [['Company', company], ['Type', type], ['Where', where.join(' · ')], ['When', j.when]]) {
      if (!v) continue;
      const d = document.createElement('div');
      d.innerHTML = '<dt></dt><dd></dd>';
      d.firstChild.textContent = k; d.lastChild.textContent = v;
      rows.appendChild(d);
    }
    spec.querySelector('[data-spec-desc]').textContent = j.desc;
    spec.querySelector('[data-spec-tags]').textContent = j.tags.join(' / ');
    spec.classList.remove('swap'); void spec.offsetWidth; spec.classList.add('swap');
  }
  syncPanels();
  function openApp(k) {
    st.app = k; st.top = 'app';
    if (k === 'cv') st.scroll = 0;
    if (k === 'bin') st.binSel = -1;
    st.mApp = k;
  }
  function act(h) {
    const id = h ? h.id : null;
    // a message box takes every click until it's answered
    if (st.msg) {
      if (id === 'msg-btn') st.msg = st.msg.buttons[h.arg].next || null;
      else if (id === 'msg-close') st.msg = null;
      return;
    }
    if (id !== 'start' && st.start) {
      st.start = false;
      if (!h || !['open', 'cv', 'mypc', 'mbin', 'off'].includes(id)) return;
    }
    if (!h) { st.iconSel = null; return; }
    if (!id.startsWith('icon-')) st.iconSel = null;
    switch (id) {
      case 'focus': st.top = h.arg === 'win' ? 'exp' : 'app'; break;
      case 'job': st.top = 'exp'; select(h.arg); break;
      case 'win-close': st.win = 'closed'; if (st.app) st.top = 'app'; break;
      case 'win-min': st.win = 'min'; if (st.app) st.top = 'app'; break;
      case 'task':
        if (st.win === 'open' && (st.top === 'exp' || !st.app)) { st.win = 'min'; if (st.app) st.top = 'app'; }
        else { st.win = 'open'; st.top = 'exp'; }
        break;
      case 'task-app': st.top = 'app'; break;
      case 'app-close': st.app = null; st.top = 'exp'; break;
      case 'start': st.start = !st.start; break;
      case 'open': case 'icon-exp':
        st.mApp = 'exp'; st.mDetail = false;
        if (st.win !== 'open') { st.win = 'open'; st.selAt = clock(); }
        st.top = 'exp';
        if (id === 'icon-exp') st.iconSel = id;
        break;
      case 'cv': case 'icon-cv': openApp('cv'); if (id === 'icon-cv') st.iconSel = id; break;
      case 'mypc': case 'icon-pc': openApp('pc'); if (id === 'icon-pc') st.iconSel = id; break;
      case 'icon-bin': openApp('bin'); st.iconSel = id; break;
      case 'mbin': openApp('bin'); break;
      case 'mjob': select(h.arg); if (zoomTo) { st.mDetail = true; st.selAt = clock(); } break;
      case 'mback': st.mDetail = false; break;
      case 'm-close': st.mApp = 'exp'; st.mDetail = false; break;
      case 'cv-up': st.scroll -= 40; break;
      case 'cv-down': st.scroll += 40; break;
      case 'cv-pgup': st.scroll -= st.cvView ? st.cvView.h - 30 : 200; break;
      case 'cv-pgdn': st.scroll += st.cvView ? st.cvView.h - 30 : 200; break;
      case 'cv-pdf': if (cvHref) window.open(cvHref, '_blank', 'noopener'); break;
      case 'drive': st.msg = DRIVES[h.arg].msg; break;
      case 'bin-row': st.binSel = h.arg; break;
      case 'bin-empty': st.msg = EMPTY_BIN; break;
      case 'off': setPower(false); break;
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
    const next = h && !['focus', 'modal'].includes(h.id) && !h.id.startsWith('icon-') ? h : null;
    if ((next && next.id + next.arg) !== (st.hover && st.hover.id + st.hover.arg)) lastPaint = 0;   // repaint for the new highlight
    st.hover = next;
  });
  canvas.addEventListener('pointerleave', () => { st.hover = null; lastPaint = 0; });
  canvas.addEventListener('click', e => {
    lastPaint = 0;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (onPower(x, y)) { setPower(!st.power); return; }
    const p = toUI(x, y);
    // the first click on the screen zooms in so it can be read; a click off it zooms out
    if (dragMoved) { dragMoved = false; return; }   // that was a drag through the resume, not a tap
    if (!p) { zoomTo = 0; return; }
    if (zoomTo < 1) {
      if (small && desktopUp()) { const h = hitAt(p); if (h && h.id === 'mjob') { act(h); return; } }
      zoomTo = 1; return;
    }
    if (p && desktopUp()) act(hitAt(p));
    else if (p && st.bootAt >= 0 && st.offAt < 0) st.bootAt = clock() - BOOT;   // a click skips the boot
  });
  // touch screens, zoomed out: drag sideways across the monitor to turn it; the side
  // under your finger follows it. It stops short of showing the open back of the case.
  let spinDrag = null, dragYaw = 0;
  canvas.addEventListener('pointerdown', e => {
    dragMoved = false;
    if (e.pointerType === 'mouse' || zoomTo) return;
    spinDrag = { x: e.clientX, yaw: dragYaw };
  });
  canvas.addEventListener('pointermove', e => {
    if (!spinDrag) return;
    const dx = e.clientX - spinDrag.x;
    if (Math.abs(dx) > 8) dragMoved = true;
    dragYaw = Math.max(-1.3, Math.min(1.1, spinDrag.yaw - dx / canvas.clientWidth * 3));
  });
  for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, () => { spinDrag = null; });

  // phones, zoomed in: drag a finger through the resume to scroll it
  let drag = null, dragMoved = false;
  canvas.addEventListener('pointerdown', e => {
    if (!small || !zoomTo || st.mApp !== 'cv' || st.msg || e.pointerType === 'mouse') return;
    const r = canvas.getBoundingClientRect(), p = toUI(e.clientX - r.left, e.clientY - r.top);
    if (p) drag = { y0: p[1], s0: st.scroll };
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect(), p = toUI(e.clientX - r.left, e.clientY - r.top);
    if (!p) return;
    const dy = (p[1] - drag.y0) / 2;
    if (Math.abs(dy) > 4) dragMoved = true;
    st.scroll = drag.s0 - dy; lastPaint = 0;
  });
  for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, () => { drag = null; });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (st.msg) { st.msg = null; lastPaint = 0; } else if (zoomTo) zoomTo = 0;
  });
  // The wheel scrolls the resume, but only while zoomed in: a wheel listener that can
  // cancel scrolling makes the browser wait for this script on every scroll step over the
  // canvas, which made the whole page stutter. So it's only attached while zoomed.
  const onWheel = e => {
    const v = st.cvView;
    if (!zoomTo || !desktopUp() || st.msg || st.app !== 'cv' || st.top !== 'app' || !v) return;
    const r = canvas.getBoundingClientRect(), p = toUI(e.clientX - r.left, e.clientY - r.top);
    const a = APPS.cv;
    if (!p || p[0] < a.x || p[0] > a.x + a.w || p[1] < a.y || p[1] > a.y + a.h) return;
    e.preventDefault();
    st.scroll += e.deltaY * (e.deltaMode === 1 ? 16 : 1) * .6;
    lastPaint = 0;
  };
  let zoomedIn = false;
  function zoomState() {
    const on = zoomTo > 0;
    if (on === zoomedIn) return;
    zoomedIn = on;
    if (band) band.classList.toggle('is-zoomed', on);
    canvas.toggleAttribute('data-lenis-prevent', on);
    canvas.style.touchAction = on ? 'none' : '';   // the page's smooth scroll leaves the monitor alone
    if (on) canvas.addEventListener('wheel', onWheel, { passive: false });
    else canvas.removeEventListener('wheel', onWheel, { passive: false });
  }
  canvas.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !zoomTo) { zoomTo = 1; return; }
    if (!desktopUp() || st.win !== 'open') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') select(st.sel + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') select(st.sel - 1);
    else return;
    e.preventDefault();
  });
  // the monitor turns to follow the cursor anywhere over the section
  if (fine) {
    const section = canvas.closest('section') || canvas;
    const rest = () => { pointer.tx = 0; pointer.ty = 0; };
    section.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      pointer.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      pointer.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    }, { passive: true });
    section.addEventListener('pointerleave', rest);
  }

  /* ---------- loop ---------- */
  let visible = false, raf = 0, colourTick = 0, lastPaint = 0, shownMinute = -1, dirty = true, lastDraw = 0, owed = false;
  function frame(ms) {
    raf = 0;
    const now = ms / 1000;
    if (colourTick-- <= 0) {
      const i2 = getComputedStyle(canvas).color, p2 = getComputedStyle(document.body).backgroundColor;
      if (i2 !== ink || p2 !== paper) { ink = i2; paper = p2; lastPaint = 0; dirty = true; }   // the theme flipped
      colourTick = 30;
    }
    const ty = Math.max(-1.1, Math.min(1.3, .2 + pointer.tx * .3 + dragYaw)), tp = .11 + pointer.ty * .08;
    const k = reduce ? 1 : .08;
    const was = yaw + pitch + zoom;
    const ease = (v, to, kk) => (Math.abs(to - v) < 6e-4 ? to : v + (to - v) * kk);
    yaw = ease(yaw, zoomTo ? 0 : ty, k);
    pitch = ease(pitch, zoomTo ? 0 : tp, k);
    const zoomWas = zoom;
    zoom = ease(zoom, zoomTo, reduce ? 1 : .1);
    const moving = yaw + pitch + zoom !== was;
    zoomState();
    // Nothing is redrawn unless something changed. The screen repaints at 30fps while
    // something on it moves (boot, power-off, typing), when asked to (a click or a new
    // hover), and when the clock's minute ticks over; the case when it turns or zooms,
    // or when the screen or the colours changed.
    const busy = (st.offAt >= 0 && now - st.offAt < .7) || (st.bootAt >= 0 && now - st.bootAt < BOOT + .1) || now - st.selAt < 1.5;
    const minute = new Date().getMinutes();
    if (lastPaint === 0 || minute !== shownMinute || (busy && now - lastPaint > 1 / 30)) {
      paintScreen(now); lastPaint = now; shownMinute = minute; dirty = true;
    }
    const zooming = zoom !== zoomWas;
    if (moving) owed = true;   // a turn skipped by the cap is still drawn on the next allowed frame
    if (dirty || zooming || (owed && now - lastDraw >= 1 / 30 - .002)) { draw(now); dirty = owed = false; lastDraw = now; }
    if (visible && !reduce) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  new ResizeObserver(() => { resize(); dirty = true; kick(); }).observe(canvas);
  resize();
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (!visible) zoomTo = 0;   // scrolled away: zoom back out
    if (visible && st.bootAt < 0 && en.intersectionRatio > .3) { st.bootAt = clock(); st.selAt = clock() + BOOT; }
    if (visible) kick();
  }, { threshold: [0, .35] }).observe(canvas);
  if (reduce) for (const ev of ['click', 'keydown', 'pointermove']) canvas.addEventListener(ev, () => { lastPaint = 0; kick(); });
  kick();
})();
