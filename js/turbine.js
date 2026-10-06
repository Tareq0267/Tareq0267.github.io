/* Cutaway schematic of a turbofan, drawn live on a 2D canvas (no 3D library).
   Parts are built as faces in engine space (x along the engine axis, y/z radial,
   angle 0 = top), rotated and projected each frame, then painted back to front
   in the page colour so nearer parts hide the lines behind them: a line drawing
   with hidden lines removed. A section of the casings is cut away to show the
   fan, compressor, combustor, turbines and shaft. Labelled callouts and airflow
   arrows sit on top. The cursor tilts it on desktop, scrolling turns it on touch
   screens, and hovering or fast scrolling spools the fan up (RPM readout). */
(function () {
  const canvas = document.querySelector('canvas.turbine');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rpmEl = document.querySelector('[data-rpm]');
  const TAU = Math.PI * 2;
  // casings are cut open over a wedge facing the viewer (between the top and the near side)
  const CUT = 1.0, CUT_AT = .8;

  /* ---------- geometry ---------- */
  // face: { p: [[x,y,z] x4], spin, edges: [bool x4] always-stroked edges,
  //         left/right: neighbours for silhouette edges on surfaces of revolution }
  const faces = [];
  const at = (x, r, a) => [x, Math.cos(a) * r, Math.sin(a) * r];
  const inCut = a => { a -= CUT_AT; a = Math.atan2(Math.sin(a), Math.cos(a)); return Math.abs(a) < CUT; };

  // surface of revolution as a grid of quads; ring edges are stroked at the listed stations
  function revolve(profile, M, { cut = false, spin = false, rings = 'ends', shell = false, tone = .1 } = {}) {
    const n = profile.length;
    const ringSet = rings === 'all' ? null : new Set(rings === 'ends' ? [0, n - 1] : rings);
    const grid = [];
    for (let i = 0; i < n - 1; i++) {
      const row = [];
      for (let j = 0; j < M; j++) {
        const a0 = j / M * TAU, a1 = (j + 1) / M * TAU;
        if (cut && inCut((a0 + a1) / 2)) { row.push(null); continue; }
        const [x0, r0] = profile[i], [x1, r1] = profile[i + 1];
        const f = {
          p: [at(x0, r0, a0), at(x1, r1, a0), at(x1, r1, a1), at(x0, r0, a1)],
          spin, rev: true, shell, tone,
          edges: [false, !ringSet || ringSet.has(i + 1), false, !ringSet || ringSet.has(i)]
        };
        row.push(f); faces.push(f);
      }
      grid.push(row);
    }
    for (const row of grid) row.forEach((f, j) => {
      if (!f) return;
      f.left = row[(j - 1 + M) % M]; f.right = row[(j + 1) % M];
    });
  }

  // a disc of small blades between two radii (a compressor or turbine stage)
  function stage(x, rIn, rOut, count, chord, twist, spin = true, tone = .22) {
    for (let k = 0; k < count; k++) {
      const a = k / count * TAU;
      faces.push({ p: [at(x - chord / 2, rIn, a), at(x - chord / 2, rOut, a + twist * .4),
                       at(x + chord / 2, rOut, a + twist), at(x + chord / 2, rIn, a + twist * .6)],
                   spin, tone, edges: [true, true, true, true] });
    }
  }

  // nacelle: outer cowl and inner lip, cut open on top
  revolve([[-1.00, .80], [-.97, .86], [-.90, .88], [-.70, .89], [-.40, .885], [-.10, .87],
           [.20, .83], [.45, .76], [.65, .68], [.80, .62]], 32, { cut: true, rings: [0, 2, 9], shell: true, tone: 0 });
  revolve([[-1.00, .80], [-.96, .76], [-.88, .745], [-.60, .745], [-.46, .74]], 32, { cut: true, rings: [0, 4], tone: .18 });
  // outlet guide vanes, behind the fan (static)
  stage(-.50, .38, .74, 26, .05, .12, false);
  // core casing, cut open; LP compressor, HP compressor, combustor, HP and LP turbine
  revolve([[-.58, .36], [-.40, .37], [-.25, .36], [.25, .30], [.32, .32], [.48, .32],
           [.55, .30], [.70, .30], [1.05, .36], [1.20, .34]], 32, { cut: true, rings: [0, 2, 3, 5, 6, 7, 9], tone: .2 });
  // shaft
  revolve([[-.80, .05], [1.20, .05]], 12, { spin: true, tone: .35 });
  // low pressure compressor (3 stages)
  for (const [x, r] of [[-.52, .34], [-.45, .34], [-.38, .34]]) stage(x, .17, r, 22, .04, .25);
  // high pressure compressor (8 stages, narrowing)
  for (let s = 0; s < 6; s++) { const u = s / 5; stage(-.22 + u * .42, .14, .33 - u * .06, 24, .035, .3); }
  // combustion chamber: an annular can
  revolve([[.27, .19], [.30, .24], [.40, .26], [.47, .22], [.50, .19]], 20, { rings: 'all', tone: .25 });
  // high pressure turbine (2 stages) and low pressure turbine (4 stages, widening)
  for (const x of [.56, .62]) stage(x, .13, .27, 26, .035, -.35);
  for (let s = 0; s < 4; s++) stage(.74 + s * .08, .14, .28 + s * .02, 26, .045, -.35);
  // exhaust cone
  revolve([[.95, .24], [1.15, .20], [1.35, .10], [1.48, .0]], 20, { rings: [0] });
  // spinner and fan: these spin
  revolve([[-1.08, 0], [-1.02, .09], [-.94, .17], [-.84, .24], [-.74, .27]], 20, { spin: true, rings: [4] });
  const BLADES = 18;
  for (let i = 0; i < BLADES; i++) {
    const a = i / BLADES * TAU;
    // broad, twisted fan blade as a strip of quads from hub to tip
    const strip = [];
    for (let k = 0; k <= 4; k++) {
      const u = k / 4, r = .28 + u * .45;
      strip.push([at(-.86, r, a), at(-.68, r, a + .12 + u * .16)]);
    }
    for (let k = 0; k < 4; k++) {
      faces.push({ p: [strip[k][0], strip[k + 1][0], strip[k + 1][1], strip[k][1]], spin: true, tone: .08,
                   edges: [true, k === 3, true, k === 0] });
    }
  }

  // callouts: anchor in engine space, label text, side of the drawing for the label
  const CALLOUTS = [
    { at: [-.80, .60, 0], text: 'Fan', short: 'Fan', side: 'top' },
    { at: [-.45, .30, .12], text: 'Low pressure compressor', short: 'LP comp.', side: 'bottom', wide: true },
    { at: [-.05, .26, .10], text: 'High pressure compressor', short: 'Compressor', side: 'top' },
    { at: [.38, .26, .05], text: 'Combustion chamber', short: 'Combustor', side: 'bottom', wide: true },
    { at: [.59, .24, .10], text: 'High pressure turbine', short: 'Turbine', side: 'top' },
    { at: [.86, .29, .10], text: 'Low pressure turbine', short: 'LP turb.', side: 'bottom', wide: true },
    { at: [1.40, .06, 0], text: 'Exhaust', short: 'Exhaust', side: 'top' },
  ];

  /* ---------- view ---------- */
  let W = 0, H = 0, dpr = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, fine ? 2 : 1.5);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '10% 0px' }).observe(canvas);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, over: false };
  if (fine) {
    addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      pointer.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      pointer.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      pointer.over = e.clientY > r.top && e.clientY < r.bottom;
    }, { passive: true });
  }
  let lastScroll = scrollY, scrollKick = 0;
  addEventListener('scroll', () => { scrollKick = Math.min(1, scrollKick + Math.abs(scrollY - lastScroll) / 400); lastScroll = scrollY; }, { passive: true });

  let ink = '#2c2824', paper = '#a89474', colourTick = 0;
  // Shading is handed to the site's dither engine (js/dither.js), which turns it
  // into the same line-bar texture as the rest of the art, on the graphics card.
  // Each frame we store the projected faces and how much ink each should get; the
  // "turbineShade" scene paints them as greys onto its own small grid.
  const LIGHT = (() => { const l = [-.45, .75, .5], n = Math.hypot(...l); return l.map(c => c / n); })();
  const shadeState = { faces: [], ready: false, fresh: false };
  const GREYS = Array.from({ length: 13 }, (_, L) => { const g = 255 - Math.round(L / 12 * 255); return `rgb(${g},${g},${g})`; });
  if (window.Dither && Dither.scenes) {
    const scene = Dither.scenes.turbineShade = function (sctx, w, h) {
      if (!shadeState.ready) return 'idle';
      shadeState.fresh = false;
      const k = w / W;                                  // CSS pixels -> grid cells
      const faces = shadeState.faces;
      sctx.lineWidth = 1;
      // back to front in small batches; inside a batch, faces are grouped by shade level
      for (let i = 0; i < faces.length; i += 8) {
        const groups = new Map();
        for (let j = i; j < Math.min(i + 8, faces.length); j++) {
          const f = faces[j], s = f.s, L = Math.round(f.ink * 12);
          let path = groups.get(L);
          if (!path) groups.set(L, path = new Path2D());
          path.moveTo(s[0][0] * k, s[0][1] * k); path.lineTo(s[1][0] * k, s[1][1] * k);
          path.lineTo(s[2][0] * k, s[2][1] * k); path.lineTo(s[3][0] * k, s[3][1] * k); path.closePath();
        }
        for (const [L, path] of groups) { sctx.fillStyle = sctx.strokeStyle = GREYS[L]; sctx.fill(path); sctx.stroke(path); }
      }
    };
    // only repaint the shading after the line drawing has moved on
    scene.hold = () => shadeState.ready && !shadeState.fresh;
  }
  const bodyFont = getComputedStyle(document.body).fontFamily;

  function draw(t, spin, yaw, pitch) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (colourTick-- <= 0) {
      const cs = getComputedStyle(canvas);
      ink = cs.color; paper = getComputedStyle(document.body).backgroundColor; colourTick = 30;
    }
    const narrow = W < 640;
    const scale = Math.min(W / (narrow ? 3.0 : 3.25), H / 2.45);
    const cx = W / 2, cy = H * .5, D = 7, F = 6;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cs = Math.cos(spin), ss = Math.sin(spin);

    function xf(p, spinIt) {          // engine space -> view space [x, y, z] (z towards the viewer)
      let [x, y, z] = p;
      x -= .22;
      if (spinIt) { const y2 = y * cs - z * ss; z = y * ss + z * cs; y = y2; }
      const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
      return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
    }
    const toScreen = v => { const s = F / (D - v[2]) * scale; return [cx + v[0] * s, cy - v[1] * s]; };

    // transform every face, work out which way it faces, then sort far to near
    for (const f of faces) {
      const v = f.v = f.p.map(q => xf(q, f.spin));
      f.s = v.map(toScreen);
      f.z = (v[0][2] + v[1][2] + v[2][2] + v[3][2]) / 4;
      const ax = v[1][0] - v[0][0], ay = v[1][1] - v[0][1], az = v[1][2] - v[0][2];
      const bx = v[3][0] - v[0][0], by = v[3][1] - v[0][1], bz = v[3][2] - v[0][2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const mx = (v[0][0] + v[2][0]) / 2, my = (v[0][1] + v[2][1]) / 2, mz = (v[0][2] + v[2][2]) / 2 - D;
      f.front = nx * mx + ny * my + nz * mz < 0;
      const nl = Math.hypot(nx, ny, nz) || 1;
      // two-sided diffuse light, turned into how much ink the face gets (0..1)
      const lit = Math.abs(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / nl;
      // light hatching: lit faces stay almost bare, faces turned away and the parts
      // inside the engine get denser bars, but never solid
      f.ink = Math.min(.34, .04 + (1 - lit) * .2 + (f.tone || 0) * .45);
    }
    faces.sort((a, b) => a.z - b.z);

    // Paint back to front. Lines go in small batches: each batch erases the lines it
    // hides, then adds its own edges. Batching cuts the canvas calls about sixfold;
    // faces in one batch are almost always side by side, so the order inside it
    // doesn't show.
    ctx.lineJoin = 'round';
    const BATCH = 6;
    // hand the faces (already sorted far to near) to the dither engine for shading
    // the shading follows at half the line rate; at this size it's indistinguishable
    shadeState.faces = faces; shadeState.ready = true;
    if ((shadeState.n = (shadeState.n || 0) + 1) % 2) shadeState.fresh = true;
    // lines: each batch erases the lines it hides, then adds its own edges
    for (let i = 0; i < faces.length; i += BATCH) {
      const body = new Path2D(), lines = new Path2D();
      for (let j = i; j < Math.min(i + BATCH, faces.length); j++) {
        const f = faces[j], s = f.s;
        body.moveTo(s[0][0], s[0][1]); body.lineTo(s[1][0], s[1][1]); body.lineTo(s[2][0], s[2][1]); body.lineTo(s[3][0], s[3][1]); body.closePath();
        // ink edges: the face's own outline edges, plus silhouettes and cut edges of revolved surfaces
        let e0 = f.edges[0], e2 = f.edges[2];
        if (f.rev) { e0 = !f.left; e2 = !f.right || f.right.front !== f.front; }
        const ed = [e0, f.edges[1], e2, f.edges[3]];
        for (let k = 0; k < 4; k++) if (ed[k]) { const a = s[k], b = s[(k + 1) % 4]; lines.moveTo(a[0], a[1]); lines.lineTo(b[0], b[1]); }
      }
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill(body); ctx.lineWidth = 1; ctx.stroke(body);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = ink; ctx.lineWidth = .9; ctx.stroke(lines);
      ctx.strokeStyle = ink; ctx.lineWidth = .9; ctx.stroke(lines);
    }
    // The outer cowl's outline and cut edges go on last: painting back to front, the
    // cowl's own nearer faces would otherwise chip pieces out of its outline.
    const outline = new Path2D();
    for (const f of faces) {
      if (!f.shell) continue;
      const s = f.s;
      if (!f.left) { outline.moveTo(s[0][0], s[0][1]); outline.lineTo(s[1][0], s[1][1]); }
      if (!f.right || f.right.front !== f.front) { outline.moveTo(s[2][0], s[2][1]); outline.lineTo(s[3][0], s[3][1]); }
    }
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke(outline);



    // airflow arrows: into the intake and out of the exhaust, dashes moving with the flow
    ctx.save();
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1;
    ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 30;
    const arrows = [[[-1.85, .55, 2.6], [-1.2, .55, 2.6]], [[-1.85, .30, 3.4], [-1.2, .30, 3.4]], [[-1.85, .5, 4.2], [-1.2, .5, 4.2]],
                    [[1.35, .30, 2.2], [2.0, .40, 2.2]], [[1.50, .10, 3.6], [2.1, .10, 3.6]]];
    for (const [a, b] of arrows) {
      const pa = toScreen(xf(at(a[0], a[1], a[2]))), pb = toScreen(xf(at(b[0], b[1], b[2])));
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
      const ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
      ctx.save(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(pb[0], pb[1]);
      ctx.lineTo(pb[0] - 8 * Math.cos(ang - .4), pb[1] - 8 * Math.sin(ang - .4));
      ctx.lineTo(pb[0] - 8 * Math.cos(ang + .4), pb[1] - 8 * Math.sin(ang + .4));
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.restore();

    // callouts: dot on the part, leader line, boxed label along the top or bottom
    ctx.font = `500 ${narrow ? 9 : 10}px ${bodyFont}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.08em';
    const rows = { top: [], bottom: [] };
    for (const c of CALLOUTS) {
      if (narrow && c.wide) continue;
      const p = toScreen(xf(c.at));
      const text = (narrow ? c.short : c.text).toUpperCase();
      const w = ctx.measureText(text).width + 14;
      rows[c.side].push({ p, text, w, x: p[0] - w / 2 });
    }
    const pad = 8;
    for (const side of ['top', 'bottom']) {
      const row = rows[side].sort((a, b) => a.p[0] - b.p[0]);
      let edge = pad;
      for (const l of row) { l.x = Math.max(l.x, edge); edge = l.x + l.w + 10; }
      // if the row ran off the right, slide it back left
      let over = edge - 10 - (W - pad);
      for (let i = row.length - 1; i >= 0 && over > 0; i--) {
        const room = i ? row[i].x - (row[i - 1].x + row[i - 1].w + 10) : row[i].x - pad;
        const move = Math.min(over, Math.max(0, room)) ;
        for (let k = i; k < row.length; k++) row[k].x -= move;
        over -= move;
      }
      const y = side === 'top' ? 14 : H - 58;
      for (const l of row) {
        const lx = l.x + l.w / 2, ly = side === 'top' ? y + 18 : y;
        ctx.strokeStyle = ink; ctx.lineWidth = .8; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(l.p[0], l.p[1]); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(l.p[0], l.p[1], 2.2, 0, TAU); ctx.fill();
        ctx.fillStyle = paper; ctx.fillRect(l.x, y, l.w, 18);
        ctx.strokeRect(l.x + .5, y + .5, l.w - 1, 17);
        ctx.fillStyle = ink; ctx.textBaseline = 'middle'; ctx.fillText(l.text, l.x + 7, y + 9.5);
      }
    }
  }

  /* ---------- animate ---------- */
  let spin = 0, rate = 1.2, last = performance.now(), shownRpm = -1, acc = 0;
  // 30 redraws a second is plenty for a slowly turning drawing, and it leaves
  // most frames free so the rest of the page keeps scrolling smoothly
  const STEP = 1 / 31;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    acc += dt;
    if (visible && acc >= STEP) {
      const step = acc; acc = 0;
      pointer.x += (pointer.tx - pointer.x) * .06;
      pointer.y += (pointer.ty - pointer.y) * .06;
      scrollKick *= .94;
      const target = 1.2 + (pointer.over ? 3 : 0) + scrollKick * 9;
      rate += (target - rate) * .04;
      spin += rate * step;
      const r = canvas.getBoundingClientRect();
      const progress = (innerHeight - r.top) / (innerHeight + r.height);
      const yaw = -.62 + Math.sin(now / 1000 * .08) * .12 + (fine ? pointer.x * .45 : (progress - .5) * 1.2);
      const pitch = .36 + (fine ? pointer.y * .12 : 0);
      draw(now / 1000, spin, yaw, pitch);
      if (rpmEl) {
        const rpm = Math.round(rate * 2850 / 10) * 10;
        if (rpm !== shownRpm) { rpmEl.textContent = 'N1 ' + rpm.toLocaleString('en-US') + ' RPM'; shownRpm = rpm; }
      }
    }
    requestAnimationFrame(frame);
  }
  if (reduce) { resize(); draw(0, .3, -.62, .38); }
  else requestAnimationFrame(frame);
})();
