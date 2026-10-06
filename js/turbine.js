/* The TA-1: a cutaway turbofan that stands in for Tareq's skills.
   Ideas come in as air at the intake, pass through components that each stand
   for a skill, and leave the exhaust as shipped projects. One highlighted air
   molecule carries a real project's story through the stages; the caption
   under the drawing follows it.

   Drawing: parts are faces in engine space (x along the engine axis, y/z radial,
   angle 0 = top), rotated and projected each frame and painted back to front in
   the page colour, so nearer parts hide the lines behind them (a line drawing
   with hidden lines removed). A wedge of the casings is cut away to show inside.

   Desktop: the engine follows the cursor, hovering a component (or a row of the
   data plate) highlights it and shows its spec card, and the molecule loops on
   its own. Touch screens: the section is pinned and scrolling moves the molecule
   stage by stage. Reduced motion: a still, labelled drawing. */
(function () {
  const canvas = document.querySelector('canvas.turbine');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pin = canvas.closest('.turbine-pin');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rpmEl = document.querySelector('[data-rpm]');
  const TAU = Math.PI * 2;
  // casings are cut open over a wedge facing the viewer (between the top and the near side)
  const CUT = 1.0, CUT_AT = .8;

  /* ---------- the components, in the order air meets them ---------- */
  const COMPONENTS = {
    fan:     { n: '01', part: 'Fan', skill: 'Programming', short: 'Code', tools: 'Python, JavaScript, TypeScript, Docker, Web Scraping', why: 'The first thing the air hits. Every idea starts as code before it becomes anything else.', anchor: [-.77, .55], side: 'top' },
    lpc:     { n: '02', part: 'Low pressure compressor', skill: 'Web Development', short: 'Web', tools: 'Django, REST APIs, Full Stack Web Apps', why: 'Squeezes loose code into real structure: apps, APIs and interfaces people can actually use.', anchor: [-.45, .27], side: 'bottom' },
    hpc:     { n: '03', part: 'High pressure compressor', skill: 'Computer Vision', short: 'Vision', tools: 'YOLO, OpenCV, Object Detection', why: 'Compresses raw input into understanding: seeing, detecting and making sense of the world.', anchor: [-.02, .24], side: 'top' },
    comb:    { n: '04', part: 'Combustion chamber', skill: 'AI & LLMs', short: 'AI', tools: 'LLMs, AI Agents, RAG, MCP, Speech Recognition & Synthesis', why: 'Where fuel meets air and the energy comes in. AI turns working software into something smart.', anchor: [.38, .25], side: 'bottom' },
    hpt:     { n: '05', part: 'High pressure turbine', skill: 'Robotics', short: 'Robotics', tools: 'SLAM, LiDAR, Obstacle Avoidance, Inverse Kinematics, Pick & Place, ROS, RoboCup Soccer & @Home', why: 'Turns that energy into physical motion. Where the software meets the real world.', anchor: [.59, .22], side: 'top' },
    lpt:     { n: '06', part: 'Low pressure turbine', skill: 'Frontend', short: 'Frontend', tools: 'Web Design, UI Design, HTML & CSS, JavaScript, TypeScript', why: 'Drives the shaft that spins the fan up front. The frontend is what people meet first, and I design it to pull them in.', anchor: [.86, .27], side: 'bottom' },
    exhaust: { n: '07', part: 'Exhaust', skill: 'Deployment', short: 'Deploy', tools: 'GitHub Pages, Vite, PythonAnywhere, Netlify, DigitalOcean', why: 'What comes out the back: thrust. Deployment is where an idea leaves the engine and goes live for real people.', anchor: [1.36, .07], side: 'top' },
  };

  /* ---------- one idea's trip per project ---------- */
  const STORIES = [
    { project: 'RoboCup 2D Sim', tab: 'tab-1', lines: {
      intake: 'How does a Booster T1 decide where to go?',
      fan: 'Modelled the pitch and robots in TypeScript',
      hpc: 'Gave the robots a sense of where the ball is',
      hpt: 'Simulated how the T1 moves and turns',
      lpt: 'Built the pitch view and parameter controls for the browser',
      exhaust: 'Shipped: RoboCup 2D Sim' } },
    { project: '30Juz', tab: 'tab-5', lines: {
      intake: 'Can finishing the Quran in Ramadan feel less overwhelming?',
      fan: 'Built a progress tracker',
      lpc: 'Turned it into a clean, focused web app',
      exhaust: 'Shipped: 30Juz' } },
    { project: 'Rumi to Jawi Translator', tab: 'tab-3', lines: {
      intake: 'Can Malay be written in Jawi automatically?',
      fan: 'Prototyped the converter in code',
      lpc: 'Built it into a web app',
      comb: 'Dictionary lookup with a phonetic fallback',
      exhaust: 'Shipped: Rumi to Jawi Translator' } },
    { project: 'Avicenna', tab: 'tab-4', lines: {
      intake: 'What if tracking food took one photo?',
      fan: 'Wrote the tracker',
      lpc: 'Django app with a dashboard',
      hpc: 'Recognised meals from photos',
      comb: 'Estimated calories with AI',
      exhaust: 'Shipped: Avicenna' } },
    { project: 'Project AWA', tab: 'tab-2', lines: {
      intake: 'Could the solar system be explored, not just read about?',
      fan: 'Coded the orbits',
      lpc: 'Built it as an interactive web page',
      exhaust: 'Shipped: Project AWA' } },
  ];

  /* ---------- geometry ---------- */
  // face: { p: [[x,y,z] x4], spin, comp, edges: [bool x4] always-stroked edges,
  //         left/right: neighbours for silhouette edges on surfaces of revolution }
  const faces = [];
  const at = (x, r, a) => [x, Math.cos(a) * r, Math.sin(a) * r];
  const inCut = (a, w = CUT) => { a -= CUT_AT; a = Math.atan2(Math.sin(a), Math.cos(a)); return Math.abs(a) < w; };

  // surface of revolution as a grid of quads; ring edges are stroked at the listed stations
  function revolve(profile, M, { cut = false, cutW = CUT, spin = false, rings = 'ends', shell = false, comp = null } = {}) {
    const n = profile.length;
    const ringSet = rings === 'all' ? null : new Set(rings === 'ends' ? [0, n - 1] : rings);
    const grid = [];
    for (let i = 0; i < n - 1; i++) {
      const row = [];
      for (let j = 0; j < M; j++) {
        const a0 = j / M * TAU, a1 = (j + 1) / M * TAU;
        if (cut && inCut((a0 + a1) / 2, cutW)) { row.push(null); continue; }
        const [x0, r0] = profile[i], [x1, r1] = profile[i + 1];
        const f = {
          p: [at(x0, r0, a0), at(x1, r1, a0), at(x1, r1, a1), at(x0, r0, a1)],
          spin, rev: true, shell, comp,
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
  function stage(x, rIn, rOut, count, chord, twist, comp, spin = true) {
    for (let k = 0; k < count; k++) {
      const a = k / count * TAU;
      faces.push({ p: [at(x - chord / 2, rIn, a), at(x - chord / 2, rOut, a + twist * .4),
                       at(x + chord / 2, rOut, a + twist), at(x + chord / 2, rIn, a + twist * .6)],
                   spin, comp, edges: [true, true, true, true] });
    }
  }

  // nacelle: outer cowl and inner lip, cut open on top
  revolve([[-1.00, .80], [-.97, .86], [-.90, .88], [-.70, .89], [-.40, .885], [-.10, .87],
           [.20, .83], [.45, .76], [.65, .68], [.80, .62]], 32, { cut: true, rings: [0, 2, 9], shell: true });
  revolve([[-1.00, .80], [-.96, .76], [-.88, .745], [-.60, .745], [-.46, .74]], 32, { cut: true, rings: [0, 4] });
  // outlet guide vanes in the bypass duct (static)
  stage(-.50, .38, .74, 26, .05, .12, null, false);
  // core casing, cut open
  revolve([[-.58, .36], [-.40, .37], [-.25, .36], [.25, .30], [.32, .32], [.48, .32],
           [.55, .30], [.70, .30], [1.05, .36]], 32, { cut: true, rings: [0, 2, 3, 5, 6, 7, 8] });
  // shaft: driven by the low pressure turbine, it turns the fan
  revolve([[-.80, .05], [1.20, .05]], 12, { spin: true, comp: 'lpt' });
  // low pressure compressor (3 stages)
  for (const [x, r] of [[-.52, .34], [-.45, .34], [-.38, .34]]) stage(x, .17, r, 22, .04, .25, 'lpc');
  // high pressure compressor (6 stages, narrowing)
  for (let s = 0; s < 6; s++) { const u = s / 5; stage(-.22 + u * .42, .14, .33 - u * .06, 24, .035, .3, 'hpc'); }
  // combustion chamber: an annular can
  revolve([[.27, .19], [.30, .24], [.40, .26], [.47, .22], [.50, .19]], 20, { rings: 'all', comp: 'comb' });
  // high pressure turbine (2 stages) and low pressure turbine (4 stages, widening)
  for (const x of [.56, .62]) stage(x, .13, .27, 26, .035, -.35, 'hpt');
  for (let s = 0; s < 4; s++) stage(.74 + s * .08, .14, .28 + s * .02, 26, .045, -.35, 'lpt');
  // exhaust: a converging nozzle, cut open wide so the long pointed plug shows inside
  revolve([[1.05, .36], [1.20, .345], [1.38, .30], [1.44, .295]], 32, { cut: true, cutW: 1.6, rings: [0, 2, 3], comp: 'exhaust' });
  revolve([[.95, .24], [1.15, .22], [1.35, .15], [1.52, .06], [1.60, 0]], 20, { rings: [0, 2], comp: 'exhaust' });
  revolve([[.95, 0], [.95, .24]], 20, { rings: [], comp: 'exhaust' });   // closes the plug's front so it reads as solid
  // spinner and fan: these spin
  revolve([[-1.08, 0], [-1.02, .09], [-.94, .17], [-.84, .24], [-.74, .27]], 20, { spin: true, rings: [4], comp: 'fan' });
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
      faces.push({ p: [strip[k][0], strip[k + 1][0], strip[k + 1][1], strip[k][1]], spin: true, comp: 'fan',
                   edges: [true, k === 3, true, k === 0] });
    }
  }

  /* ---------- air paths (x along the engine, radius), drawn in the cut-open wedge ---------- */
  function makePath(pts) {
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = len[len.length - 1];
    return u => {
      const d = Math.max(0, Math.min(1, u)) * total;
      let i = 1; while (i < len.length - 1 && len[i] < d) i++;
      const k = (d - len[i - 1]) / (len[i] - len[i - 1] || 1);
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    };
  }
  const corePath = makePath([[-1.75, .48], [-1.0, .48], [-.77, .46], [-.6, .30], [-.45, .26], [-.2, .24],
                             [.15, .21], [.38, .22], [.59, .20], [.86, .22], [1.2, .27], [1.6, .25], [2.15, .22]]);
  const bypassPath = makePath([[-1.75, .64], [-.8, .64], [-.45, .57], [.3, .54], [.78, .55], [1.6, .6], [2.0, .62]]);
  // which stage of the engine an x position sits in
  function stageAt(x) {
    if (x < -.9) return 'intake';
    if (x < -.6) return 'fan';
    if (x < -.32) return 'lpc';
    if (x < .25) return 'hpc';
    if (x < .52) return 'comb';
    if (x < .68) return 'hpt';
    if (x < 1.15) return 'lpt';
    return 'exhaust';
  }
  // the stages are very different lengths along the path, so moving at one speed would
  // flash through the turbines. Instead each stage gets an equal slice of the journey:
  // the molecule glides in, slows to a near stop in the middle, then glides on.
  const STAGES = ['intake', 'fan', 'lpc', 'hpc', 'comb', 'hpt', 'lpt', 'exhaust'];
  const stageU = [0];
  for (let i = 1, u = 0; i < STAGES.length; i++) {
    while (u < 1 && stageAt(corePath(u)[0]) !== STAGES[i]) u += .0005;
    stageU.push(u);
  }
  stageU.push(1);
  function paced(m) {
    const f = Math.max(0, Math.min(1, m)) * STAGES.length;
    const i = Math.min(STAGES.length - 1, Math.floor(f)), k = f - i;
    const e = k + Math.sin(k * TAU) / TAU * .85;     // slow in the middle of each stage
    return stageU[i] + (stageU[i + 1] - stageU[i]) * e;
  }
  // background air: faint particles, some through the core, most around it (like a real turbofan)
  const particles = Array.from({ length: 34 }, (_, i) => ({
    bypass: i % 3 !== 0, u: Math.random(), a: CUT_AT + (Math.random() - .5) * 1.4, sp: .022 + Math.random() * .016
  }));

  /* ---------- story caption + spec card (DOM) ---------- */
  const storyStage = document.querySelector('[data-story-stage]');
  const storyText = document.querySelector('[data-story-text]');
  const storyLink = document.querySelector('[data-story-link]');
  const storyNext = document.querySelector('[data-story-next]');

  let story = 0, mol = 0, shownLine = '', shownStage = '';
  function showStory(stageId) {
    const s = STORIES[story];
    const line = s.lines[stageId];
    // the label and the line change together, only at stages this project used;
    // through the others the molecule passes quietly under the last line
    if (line && stageId !== shownStage) {
      shownStage = stageId;
      const c = COMPONENTS[stageId];
      if (storyStage) storyStage.textContent = stageId === 'intake' ? 'Intake · An idea' : `${c.n} · ${c.part} · ${c.skill}`;
      if (storyText && line !== shownLine) { shownLine = line; storyText.textContent = line; }
    }
    if (storyLink) {
      const done = stageId === 'exhaust';
      storyLink.hidden = !done;
      if (done) { storyLink.textContent = `Open ${s.project} ↗`; storyLink.dataset.tab = s.tab; }
    }
  }
  function nextStory() { story = (story + 1) % STORIES.length; mol = 0; trail.length = 0; shownLine = ''; shownStage = ''; showStory('intake'); }
  if (storyNext) storyNext.addEventListener('click', () => { setPaused(false); nextStory(); });
  if (storyLink) storyLink.addEventListener('click', e => {
    e.preventDefault();
    const tab = document.getElementById(storyLink.dataset.tab);
    if (tab) tab.click();
    const target = document.getElementById('projects');
    if (window.__lenis) window.__lenis.scrollTo(target, { duration: 1.2 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });

  // tapping or clicking a part holds it: the air stops and that part stays open
  let paused = false, picked = null, nextBox = null;
  let closedId = null;        // phones: the card the reader tapped away from, folded back to its label
  const pauseBtn = document.querySelector('[data-story-pause]');
  function setPaused(on) {
    paused = on;
    if (!on) picked = null;
    if (pauseBtn) { pauseBtn.textContent = on ? 'Play ▶' : 'Pause ❚❚'; pauseBtn.setAttribute('aria-pressed', on); }
  }
  if (pauseBtn) pauseBtn.addEventListener('click', () => setPaused(!paused));
  function pickPart(id) {
    picked = id; closedId = null; setPaused(true);
    // park the molecule in the middle of that stage so the caption follows
    const i = STAGES.indexOf(id);
    if (i >= 0) { mol = (i + .5) / STAGES.length; trail.length = 0; }
  }
  const ORDER = ['fan', 'lpc', 'hpc', 'comb', 'hpt', 'lpt', 'exhaust'];
  const nextPart = () => pickPart(ORDER[(ORDER.indexOf(picked || active || 'fan') + 1) % ORDER.length]);
  let active = null;         // the component that's highlighted (hovered, or the molecule's stage)
  let open = null;           // the callout that's grown into a detail card (phones)
  // wide screens show the detail in a side panel instead of a card on the drawing
  const side = {
    box: document.querySelector('.turbine-side'),
    part: document.querySelector('[data-side-part]'),
    skill: document.querySelector('[data-side-skill]'),
    why: document.querySelector('[data-side-why]'),
    tools: document.querySelector('[data-side-tools]'),
  };
  let sideShown = '';
  const sideOn = () => side.box && side.box.offsetParent !== null;
  /* ---------- detail view: just the selected part, on a turntable ---------- */
  const partCanvas = document.querySelector('.side-part');
  const pctx = partCanvas && partCanvas.getContext('2d');
  const partFaces = {}, partFit = {};
  const isShaft = f => f.comp === 'lpt' && f.p.every(q => Math.hypot(q[1], q[2]) < .06);
  for (const f of faces) if (f.comp && !isShaft(f)) (partFaces[f.comp] = partFaces[f.comp] || []).push(f);
  for (const id in partFaces) {
    // centre along the axis and the radius of a sphere that holds the part
    let x0 = Infinity, x1 = -Infinity, r = 0;
    for (const f of partFaces[id]) for (const q of f.p) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); r = Math.max(r, Math.hypot(q[1], q[2])); }
    if (id === 'exhaust') x1 += .2;     // room for the thrust behind it
    const cx = (x0 + x1) / 2;
    partFit[id] = { cx, size: Math.hypot((x1 - x0) / 2, r) };
  }
  let turn = 0;
  function drawPart(id, dt, spinAngle) {
    if (!pctx || !partFaces[id]) return;
    const r = partCanvas.getBoundingClientRect();
    const pw = r.width, ph = r.height, pd = Math.min(devicePixelRatio || 1, 2);
    if (partCanvas.width !== Math.round(pw * pd)) { partCanvas.width = Math.round(pw * pd); partCanvas.height = Math.round(ph * pd); }
    pctx.setTransform(pd, 0, 0, pd, 0, 0);
    pctx.clearRect(0, 0, pw, ph);
    turn += dt * .35;
    const { cx: mx, size } = partFit[id];
    // the exhaust is seen more from the side, so the plug's point and the thrust read clearly
    const yaw = id === 'exhaust' ? -.3 + Math.sin(turn) * .3 : -.9 + Math.sin(turn) * .6, pitch = .45;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cs = Math.cos(spinAngle), ss = Math.sin(spinAngle);
    const D = 4.2, F = 3.6, scale = Math.min(pw, ph) * .5 / size * (id === 'exhaust' ? .98 : .82);
    const list = partFaces[id];
    for (const f of list) {
      const v = f.p.map(q => {
        let x = (q[0] - mx), y = q[1], z = q[2];
        if (f.spin) { const y2 = y * cs - z * ss; z = y * ss + z * cs; y = y2; }
        const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
        return [x1 / size, (y * cp - z1 * sp) / size, (y * sp + z1 * cp) / size];
      });
      f.ps = v.map(q => { const s = F / (D - q[2]) * scale; return [pw / 2 + q[0] * s * size, ph / 2 - q[1] * s * size]; });
      f.pz = (v[0][2] + v[1][2] + v[2][2] + v[3][2]) / 4;
      const ax = v[1][0] - v[0][0], ay = v[1][1] - v[0][1], az = v[1][2] - v[0][2];
      const bx = v[3][0] - v[0][0], by = v[3][1] - v[0][1], bz = v[3][2] - v[0][2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const m = [(v[0][0] + v[2][0]) / 2, (v[0][1] + v[2][1]) / 2, (v[0][2] + v[2][2]) / 2 - D];
      f.pfront = nx * m[0] + ny * m[1] + nz * m[2] < 0;
      f.lum = faceLum(nx, ny, nz, f.pfront);
    }
    const sorted = list.slice().sort((a, b) => a.pz - b.pz);
    paintBatches(pctx, sorted, f => f.ps, f => f.pfront, null);
    partDots(pctx, pw, ph, sorted, f => f.ps, ink);
    if (id === 'exhaust') {
      // thrust: dashed jets streaming out of the nozzle
      const proj = (x, r, a) => {
        let X = x - mx, y = Math.cos(a) * r, z = Math.sin(a) * r;
        const x1 = X * cyw - z * syw, z1 = X * syw + z * cyw;
        const v = [x1 / size, (y * cp - z1 * sp) / size, (y * sp + z1 * cp) / size];
        const s = F / (D - v[2]) * scale;
        return [pw / 2 + v[0] * s * size, ph / 2 - v[1] * s * size];
      };
      pctx.save();
      pctx.strokeStyle = ink; pctx.fillStyle = ink; pctx.lineWidth = 1;
      pctx.setLineDash([5, 4]); pctx.lineDashOffset = -turn * 90;
      for (const [x0, r0, x1, r1, a] of [[1.62, 0, 2.1, 0, 0], [1.46, .2, 1.98, .26, 2.65], [1.46, .2, 1.98, .26, 5.8]]) {
        const pa = proj(x0, r0, a), pb = proj(x1, r1, a);
        pctx.beginPath(); pctx.moveTo(pa[0], pa[1]); pctx.lineTo(pb[0], pb[1]); pctx.stroke();
        const ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
        pctx.setLineDash([]);
        pctx.beginPath(); pctx.moveTo(pb[0], pb[1]);
        pctx.lineTo(pb[0] - 7 * Math.cos(ang - .4), pb[1] - 7 * Math.sin(ang - .4));
        pctx.lineTo(pb[0] - 7 * Math.cos(ang + .4), pb[1] - 7 * Math.sin(ang + .4));
        pctx.closePath(); pctx.fill();
        pctx.setLineDash([5, 4]);
      }
      pctx.restore();
    }
  }

  function showSide(id) {
    if (!id || id === sideShown) return;
    sideShown = id;
    const c = COMPONENTS[id];
    side.part.textContent = `${c.n} · ${c.part}`;
    side.skill.textContent = c.skill;
    side.why.textContent = c.why;
    side.tools.textContent = c.tools;
    side.box.classList.remove('swap'); void side.box.offsetWidth; side.box.classList.add('swap');
    if (partCanvas) partCanvas.classList.toggle('empty', !partFaces[id]);
  }

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

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, over: false, cx: -1, cy: -1 };
  if (fine) {
    addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      pointer.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      pointer.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      pointer.over = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
      pointer.cx = e.clientX - r.left; pointer.cy = e.clientY - r.top;
    }, { passive: true });
  }
  let dragged = false;
  canvas.addEventListener('click', e => {
    if (dragged) return;                // the end of a turn, not a tap
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (nextBox && x >= nextBox[0] && x <= nextBox[0] + nextBox[2] && y >= nextBox[1] && y <= nextBox[1] + nextBox[3]) return nextPart();
    // a tap on the open card itself leaves it alone
    const b = open && cardBox;
    if (b && x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3]) return;
    const id = pick(x, y);
    if (id) pickPart(id);
    else if (open) closedId = open;   // tapped empty space: fold the card back to its label
  });
  // phones: a tap anywhere else on the page folds the card too (but not the caption's buttons)
  if (!fine) addEventListener('click', e => {
    if (open && e.target !== canvas && !e.target.closest('.turbine-story-actions')) closedId = open;
  });
  // touch screens: drag sideways on the drawing to turn the engine (up and down still scrolls)
  let dragYaw = 0, drag = null;
  canvas.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { drag = { x: e.clientX, yaw: dragYaw }; dragged = false; } });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    // the part under your finger follows it: drag left and the near side moves left
    dragYaw = drag.yaw - (e.clientX - drag.x) / canvas.clientWidth * 3;
    if (Math.abs(e.clientX - drag.x) > 8) dragged = true;
  });
  for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, () => { drag = null; });
  let lastScroll = scrollY, scrollKick = 0;
  addEventListener('scroll', () => { scrollKick = Math.min(1, scrollKick + Math.abs(scrollY - lastScroll) / 400); lastScroll = scrollY; }, { passive: true });

  let ink = '#2c2824', paper = '#a89474', colourTick = 0;
  let spin = 0, rate = 1.2;
  const bodyFont = getComputedStyle(document.body).fontFamily;
  const trail = [];
  let anchorsOnScreen = {}, labelBoxes = {}, cardBox = null, grow = 0, cardId = null;
  const displayFont = getComputedStyle(document.documentElement).getPropertyValue('--font-display') || 'serif';
  const ease = k => k * k * (3 - 2 * k);


  /* ---------- shading: fine ordered dots under the line drawing ---------- */
  const LX = -.45, LY = .65, LZ = .62;   // light from the upper left, towards the viewer
  function faceLum(nx, ny, nz, front) {
    const l = Math.hypot(nx, ny, nz) || 1;
    const d = (nx * LX + ny * LY + nz * LZ) / l;
    return front ? d : -d;               // seen from inside: the other side of the face
  }
  const quad = (P, s) => { P.moveTo(s[0][0], s[0][1]); P.lineTo(s[1][0], s[1][1]); P.lineTo(s[2][0], s[2][1]); P.lineTo(s[3][0], s[3][1]); P.closePath(); };
  // The faces are filled in grey by how lit they are, then each pixel becomes a dot or not
  // through an 8x8 Bayer matrix, so the pattern holds still while the engine turns.
  const BAYER = new Float32Array(64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    let v = 0;
    for (let i = 0; i < 3; i++) v = (v << 2) | ((((x ^ y) >> i) & 1) << 1) | ((y >> i) & 1);
    BAYER[y * 8 + x] = (v + .5) / 64;
  }
  const BAYER255 = Uint8Array.from(BAYER, v => v * 255);
  function makeDots() {
    const src = document.createElement('canvas'), sg = src.getContext('2d', { willReadFrequently: true });
    const out = document.createElement('canvas'), og = out.getContext('2d');
    return function (target, w, h, list, sOf, inkCol) {
      const gw = Math.ceil(w), gh = Math.ceil(h);
      if (src.width !== gw || src.height !== gh) { src.width = out.width = gw; src.height = out.height = gh; }
      // only the engine's own area is shaded, read back and dotted, not the whole canvas
      let x0 = gw, y0 = gh, x1 = 0, y1 = 0;
      for (const f of list) for (const q of sOf(f)) {
        if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1];
      }
      x0 = Math.max(0, Math.floor(x0) - 2); y0 = Math.max(0, Math.floor(y0) - 2);
      x1 = Math.min(gw, Math.ceil(x1) + 2); y1 = Math.min(gh, Math.ceil(y1) + 2);
      const bw = x1 - x0, bh = y1 - y0;
      if (bw <= 0 || bh <= 0) return;
      sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(x0, y0, bw, bh);
      let level = -1, P = null;
      const flush = () => { if (P) { sg.fillStyle = sg.strokeStyle = `rgb(${level},${level},${level})`; sg.lineWidth = 1; sg.fill(P); sg.stroke(P); } };
      for (const f of list) {
        const dark = .36 * Math.pow(1 - Math.max(0, f.lum), 1.6);   // shadows get sparse dots, lit faces none
        const v = Math.round((1 - dark) * 23) * 255 / 23 | 0;
        if (v !== level) { flush(); level = v; P = new Path2D(); }
        quad(P, sOf(f));
      }
      flush();
      const img = sg.getImageData(x0, y0, bw, bh), d = img.data, px = new Uint32Array(d.buffer);
      const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(inkCol) || [0, 40, 40, 40];
      const dot = (255 << 24 | +m[3] << 16 | +m[2] << 8 | +m[1]) >>> 0;   // RGBA as one little-endian word
      for (let y = 0, i = 0; y < bh; y++) {
        const row = ((y + y0) & 7) * 8;
        for (let x = 0; x < bw; x++, i++) {
          const k = i * 4;
          px[i] = d[k + 3] > 127 && 255 - d[k] > BAYER255[row + ((x + x0) & 7)] ? dot : 0;
        }
      }
      og.putImageData(img, x0, y0);
      target.save(); target.imageSmoothingEnabled = false; target.drawImage(out, x0, y0, bw, bh, x0, y0, bw, bh); target.restore();
    };
  }
  const mainDots = makeDots(), partDots = makeDots();
  // Paint back to front in small batches: fill neighbouring faces in the page colour (plus a
  // thin stroke of it to close seams) so they hide what's behind, then draw their ink edges.
  // The highlighted component gets a light ink wash and heavier edges.
  function paintBatches(g, list, sOf, frontOf, hot) {
    g.lineJoin = 'round';
    for (let i = 0; i < list.length; i += 6) {
      const body = new Path2D(), lines = new Path2D(), hotBody = new Path2D(), hotLines = new Path2D();
      let anyHot = false;
      for (let j = i; j < Math.min(i + 6, list.length); j++) {
        const f = list[j], s = sOf(f), isHot = hot && f.comp === hot;
        quad(body, s);
        if (isHot) { anyHot = true; quad(hotBody, s); }
        // edges: the face's own outline edges, plus silhouettes and cut edges of revolved surfaces
        let e0 = f.edges[0], e2 = f.edges[2];
        if (f.rev) { e0 = !f.left; e2 = !f.right || frontOf(f.right) !== frontOf(f); }
        const ed = [e0, f.edges[1], e2, f.edges[3]], L = isHot ? hotLines : lines;
        for (let k = 0; k < 4; k++) if (ed[k]) { const a = s[k], c = s[(k + 1) % 4]; L.moveTo(a[0], a[1]); L.lineTo(c[0], c[1]); }
      }
      g.fillStyle = paper; g.fill(body);
      g.strokeStyle = paper; g.lineWidth = 1; g.stroke(body);
      if (anyHot) { g.globalAlpha = .18; g.fillStyle = ink; g.fill(hotBody); g.globalAlpha = 1; }
      g.strokeStyle = ink;
      g.lineWidth = .9; g.stroke(lines);
      if (anyHot) { g.lineWidth = 1.8; g.stroke(hotLines); }
    }
  }

  function draw(t, yaw, pitch, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (colourTick-- <= 0) {
      ink = getComputedStyle(canvas).color; paper = getComputedStyle(document.body).backgroundColor; colourTick = 30;
    }
    const narrow = W < 640;
    const scale = Math.min(W / (narrow ? 2.75 : 3.6), H / 2.6);
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
    const screenAt = (x, r, a) => toScreen(xf(at(x, r, a)));

    // transform every face, work out which way it faces, then sort far to near
    for (const f of faces) {
      const v = f.p.map(q => xf(q, f.spin));
      f.s = v.map(toScreen);
      f.z = (v[0][2] + v[1][2] + v[2][2] + v[3][2]) / 4;
      const ax = v[1][0] - v[0][0], ay = v[1][1] - v[0][1], az = v[1][2] - v[0][2];
      const bx = v[3][0] - v[0][0], by = v[3][1] - v[0][1], bz = v[3][2] - v[0][2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const mx = (v[0][0] + v[2][0]) / 2, my = (v[0][1] + v[2][1]) / 2, mz = (v[0][2] + v[2][2]) / 2 - D;
      f.front = nx * mx + ny * my + nz * mz < 0;
      f.lum = faceLum(nx, ny, nz, f.front);
    }
    faces.sort((a, b) => a.z - b.z);

    paintBatches(ctx, faces, f => f.s, f => f.front, active);
    // the outer cowl's outline and cut edges go on last so nearer cowl faces don't chip them
    const outline = new Path2D();
    for (const f of faces) {
      if (!f.shell) continue;
      const s = f.s;
      if (!f.left) { outline.moveTo(s[0][0], s[0][1]); outline.lineTo(s[1][0], s[1][1]); }
      if (!f.right || f.right.front !== f.front) { outline.moveTo(s[2][0], s[2][1]); outline.lineTo(s[3][0], s[3][1]); }
    }
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke(outline);
    mainDots(ctx, W, H, faces, f => f.s, ink);

    // airflow arrows: into the intake and out of the exhaust, dashes moving with the flow
    ctx.save();
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1;
    ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 30;
    const arrows = [[[-1.85, .55, 2.6], [-1.2, .55, 2.6]], [[-1.85, .30, 3.4], [-1.2, .30, 3.4]], [[-1.85, .5, 4.2], [-1.2, .5, 4.2]],
                    [[1.48, .26, 2.2], [2.25, .32, 2.2]], [[1.66, .02, 3.6], [2.4, .02, 3.6]], [[1.48, .26, 4.4], [2.25, .32, 4.4]]];
    for (const [a, b] of arrows) {
      const pa = screenAt(a[0], a[1], a[2]), pb = screenAt(b[0], b[1], b[2]);
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
      const ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(pb[0], pb[1]);
      ctx.lineTo(pb[0] - 8 * Math.cos(ang - .4), pb[1] - 8 * Math.sin(ang - .4));
      ctx.lineTo(pb[0] - 8 * Math.cos(ang + .4), pb[1] - 8 * Math.sin(ang + .4));
      ctx.closePath(); ctx.fill();
      ctx.setLineDash([6, 5]);
    }
    ctx.restore();

    // background air
    ctx.fillStyle = ink;
    for (const p of particles) {
      p.u = (p.u + p.sp * dt * (.6 + rate * .25)) % 1;
      const [x, r] = (p.bypass ? bypassPath : corePath)(p.u);
      const q = screenAt(x, r, p.a);
      ctx.globalAlpha = .45 * Math.min(1, p.u * 6, (1 - p.u) * 6);
      ctx.fillRect(q[0] - 1, q[1] - 1, 2, 2);
    }
    ctx.globalAlpha = 1;

    // the story molecule, with a trail
    const [mx, mr] = corePath(paced(mol));
    const mq = screenAt(mx, mr, CUT_AT);
    trail.push(mq); if (trail.length > 18) trail.shift();
    ctx.strokeStyle = ink;
    for (let i = 1; i < trail.length; i++) {
      ctx.globalAlpha = i / trail.length * .8;
      ctx.lineWidth = 1 + i / trail.length * 2;
      ctx.beginPath(); ctx.moveTo(trail[i - 1][0], trail[i - 1][1]); ctx.lineTo(trail[i][0], trail[i][1]); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(mq[0], mq[1], 4, 0, TAU); ctx.fill();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mq[0], mq[1], 8 + Math.sin(t * 6) * 1.5, 0, TAU); ctx.stroke();
    const molStage = stageAt(mx);

    // callouts: dot on the component, leader line, boxed label along the top or bottom.
    // The open one grows into a card: part, skill, the analogy and the tools.
    // Phones use the short names so all of them fit.
    const small = `500 ${narrow ? 9 : 10}px ${bodyFont}`;
    ctx.font = small;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.08em';
    const rows = { top: [], bottom: [] };
    anchorsOnScreen = {}; labelBoxes = {};
    for (const id in COMPONENTS) {
      const c = COMPONENTS[id];
      const p = screenAt(c.anchor[0], c.anchor[1], CUT_AT * .85);
      anchorsOnScreen[id] = p;
      const text = (narrow ? c.short : c.skill).toUpperCase();
      const w = ctx.measureText(text).width + 14;
      rows[c.side].push({ id, p, text, w, x: p[0] - w / 2 });
    }
    const pad = 8;
    let card = null;
    nextBox = null;
    for (const side of ['top', 'bottom']) {
      const row = rows[side].sort((a, b) => a.p[0] - b.p[0]);
      let edge = pad;
      for (const l of row) { l.x = Math.max(l.x, edge); edge = l.x + l.w + 10; }
      let over = edge - 10 - (W - pad);
      for (let i = row.length - 1; i >= 0 && over > 0; i--) {
        const room = i ? row[i].x - (row[i - 1].x + row[i - 1].w + 10) : row[i].x - pad;
        const move = Math.min(over, Math.max(0, room));
        for (let k = i; k < row.length; k++) row[k].x -= move;
        over -= move;
      }
      const y = side === 'top' ? 10 : H - 30;
      for (const l of row) {
        labelBoxes[l.id] = [l.x, y, l.w, 18];
        // on touch screens the card always sits at the bottom, so Next stays under the thumb
        if (l.id === open) { card = fine ? { ...l, side, y } : { ...l, side: 'bottom', y: H - 30 }; continue; }
        const on = l.id === active;
        const lx = l.x + l.w / 2, ly = side === 'top' ? y + 18 : y;
        ctx.strokeStyle = ink; ctx.lineWidth = on ? 1.4 : .8;
        ctx.beginPath(); ctx.moveTo(l.p[0], l.p[1]); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(l.p[0], l.p[1], on ? 3.2 : 2.2, 0, TAU); ctx.fill();
        ctx.fillStyle = on ? ink : paper; ctx.fillRect(l.x, y, l.w, 18);
        ctx.strokeRect(l.x + .5, y + .5, l.w - 1, 17);
        ctx.fillStyle = on ? paper : ink; ctx.textBaseline = 'middle'; ctx.fillText(l.text, l.x + 7, y + 9.5);
      }
    }

    // the open callout, eased from its small label size up to a full card
    grow += ((card ? 1 : 0) - grow) * (dt ? Math.min(1, dt * 10) : 1);
    if (card) {
      if (card.id !== cardId) { cardId = card.id; grow = Math.min(grow, .15); }
      const c = COMPONENTS[card.id];
      const tapNext = !fine;
      // lay out the card's text for a given width, to know its height
      const layout = cw => {
        const inner = cw - 28;
        ctx.font = `400 13px ${bodyFont}`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        const whyLines = wrap(c.why, inner);
        ctx.font = `500 9.5px ${bodyFont}`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0.08em';
        const toolLines = wrap(c.tools.toUpperCase(), inner);
        const partLines = wrap(`${c.n} · ${c.part}`.toUpperCase(), inner);
        ctx.font = `400 26px ${displayFont}`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '-0.01em';
        const titleLines = wrap(c.skill.toUpperCase(), inner);   // narrow cards take the title over two lines
        return { cw, whyLines, toolLines, titleLines, partLines,
                 ch: 14 + 12 + (partLines.length - 1) * 14 + 8 + 28 * titleLines.length + 8 + whyLines.length * 18 + 10 + toolLines.length * 14 + 14 + (tapNext ? 36 : 0) };
      };
      let L, tx, ty;
      if (tapNext) {
        // touch screens: full width along the bottom, so Next stays under the thumb
        L = layout(W - pad * 2);
        tx = pad; ty = H - 12 - L.ch;
      } else {
        // anywhere else: the emptiest spot that fits, as close to the part as it can be
        const opts = [320, 250, 200, 170].map(cw => layout(Math.min(cw, W - pad * 2)));
        const best = placeCard(opts, card.p, card.id, pad);
        L = best.L; tx = best.x; ty = best.y;
      }
      const { cw, whyLines, toolLines, titleLines, partLines, ch } = L;
      // glide to the spot rather than jumping
      if (!cardAt || cardAt.id !== card.id) cardAt = { id: card.id, x: tx, y: ty };
      const follow = dt ? Math.min(1, dt * 8) : 1;
      cardAt.x += (tx - cardAt.x) * follow; cardAt.y += (ty - cardAt.y) * follow;
      // grow out of the little label into the card
      const k = ease(grow);
      const w = card.w + (cw - card.w) * k, h = 18 + (ch - 18) * k;
      const x = card.x + (cardAt.x - card.x) * k, y = card.y + (cardAt.y - card.y) * k;
      cardBox = [x, y, w, h];
      // leader from the part to the nearest point of the card
      const lx = Math.max(x, Math.min(x + w, card.p[0])), ly = Math.max(y, Math.min(y + h, card.p[1]));
      ctx.strokeStyle = ink; ctx.lineWidth = 1.4;
      if (lx !== card.p[0] || ly !== card.p[1]) { ctx.beginPath(); ctx.moveTo(card.p[0], card.p[1]); ctx.lineTo(lx, ly); ctx.stroke(); }
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(card.p[0], card.p[1], 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = paper; ctx.fillRect(x, y, w, h);
      ctx.lineWidth = 1.2; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
      if (k < .55) {
        // still mostly a label
        ctx.font = small; ctx.fillStyle = ink; ctx.textBaseline = 'middle';
        ctx.globalAlpha = 1 - k / .55;
        ctx.fillText(card.text, x + 7, y + 9.5);
      } else {
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.globalAlpha = (k - .55) / .45;
        ctx.textBaseline = 'top'; ctx.fillStyle = ink;
        let ty = y + 14;
        ctx.font = `500 9.5px ${bodyFont}`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0.08em';
        ctx.globalAlpha *= .7;
        for (const line of partLines) { ctx.fillText(line, x + 14, ty); ty += 14; }
        ctx.globalAlpha /= .7;
        ty += 6;
        ctx.font = `400 26px ${displayFont}`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '-0.01em';
        for (const line of titleLines) { ctx.fillText(line, x + 14, ty); ty += 28; }
        ty += 8;
        ctx.font = `400 13px ${bodyFont}`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        for (const line of whyLines) { ctx.fillText(line, x + 14, ty); ty += 18; }
        ty += 10;
        ctx.font = `500 9.5px ${bodyFont}`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0.08em';
        ctx.globalAlpha *= .7;
        for (const line of toolLines) { ctx.fillText(line, x + 14, ty); ty += 14; }
        ctx.globalAlpha /= .7;
        if (tapNext) {
          // a Next button, bottom right, that steps to the following part
          const label = 'NEXT PART →', bw = ctx.measureText(label).width + 24, bh = 26;
          const bx = x + w - 14 - bw, by = y + h - 14 - bh;
          ctx.fillStyle = ink; ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = paper; ctx.textBaseline = 'middle'; ctx.fillText(label, bx + 12, by + bh / 2 + .5);
          nextBox = [bx - 8, by - 8, bw + 16, bh + 16];
        }
        ctx.restore();
      }
    } else { cardId = null; cardBox = null; }
    return molStage;
  }


  /* ---------- where the open card goes: the emptiest place near its part ---------- */
  // The canvas is split into 16px cells; cells under the engine or a label count as taken.
  // Every spot the card could sit is scored by how much it covers plus how far it is from
  // its part, and the card keeps its current spot unless another is clearly better.
  const CELLPX = 16;
  let occ = new Uint8Array(0), sat = new Int32Array(0), cardAt = null, cardSpot = null;
  function placeCard(opts, anchor, id, pad) {
    const gx = Math.ceil(W / CELLPX), gy = Math.ceil(H / CELLPX);
    if (occ.length !== gx * gy) { occ = new Uint8Array(gx * gy); sat = new Int32Array((gx + 1) * (gy + 1)); }
    occ.fill(0);
    const mark = (x0, y0, x1, y1) => {
      const a = Math.max(0, Math.floor(x0 / CELLPX)), b = Math.min(gx - 1, Math.floor(x1 / CELLPX));
      const c = Math.max(0, Math.floor(y0 / CELLPX)), d = Math.min(gy - 1, Math.floor(y1 / CELLPX));
      for (let yy = c; yy <= d; yy++) for (let xx = a; xx <= b; xx++) occ[yy * gx + xx] = 1;
    };
    let ex0 = Infinity, ex1 = -Infinity;      // the engine's left and right edges on screen
    for (const f of faces) {
      const q = f.s;
      ex0 = Math.min(ex0, q[0][0], q[2][0]); ex1 = Math.max(ex1, q[0][0], q[2][0]);
      mark(Math.min(q[0][0], q[1][0], q[2][0], q[3][0]), Math.min(q[0][1], q[1][1], q[2][1], q[3][1]),
           Math.max(q[0][0], q[1][0], q[2][0], q[3][0]), Math.max(q[0][1], q[1][1], q[2][1], q[3][1]));
    }
    for (const lid in labelBoxes) if (lid !== id) { const [x, y, w, h] = labelBoxes[lid]; mark(x - 6, y - 6, x + w + 6, y + h + 6); }
    // summed-area table, so any rectangle's taken cells add up in four lookups
    for (let yy = 0; yy < gy; yy++) {
      let run = 0;
      for (let xx = 0; xx < gx; xx++) {
        run += occ[yy * gx + xx];
        sat[(yy + 1) * (gx + 1) + xx + 1] = sat[yy * (gx + 1) + xx + 1] + run;
      }
    }
    const taken = (x, y, w, h) => {
      const a = Math.max(0, Math.floor(x / CELLPX)), b = Math.min(gx, Math.ceil((x + w) / CELLPX));
      const c = Math.max(0, Math.floor(y / CELLPX)), d = Math.min(gy, Math.ceil((y + h) / CELLPX));
      return sat[d * (gx + 1) + b] - sat[c * (gx + 1) + b] - sat[d * (gx + 1) + a] + sat[c * (gx + 1) + a];
    };
    // a part left of the engine's middle opens to the left, one right of it to the right;
    // crossing over costs about as much as covering six cells of the drawing
    const mid = (ex0 + ex1) / 2, side = anchor[0] < mid ? -1 : 1;
    const score = (x, y, L) => taken(x, y, L.cw, L.ch) * 400
      + Math.hypot(x + L.cw / 2 - anchor[0], y + L.ch / 2 - anchor[1])
      + ((x + L.cw / 2 - mid) * side < 0 ? 2500 : 0)
      + opts.indexOf(L) * 40;
    let best = null;
    for (const L of opts) {
      const maxX = W - pad - L.cw, maxY = H - pad - L.ch;
      if (maxX < pad || maxY < pad) continue;
      for (let y = pad; y <= maxY + .1; y += CELLPX / 2) for (let x = pad; x <= maxX + .1; x += CELLPX / 2) {
        const v = score(x, y, L);
        if (!best || v < best.v) best = { v, x, y, L };
      }
      // the last edge positions, so the card can sit flush right or bottom
      for (const [x, y] of [[maxX, pad], [maxX, maxY], [pad, maxY]]) { const v = score(x, y, L); if (v < best.v) best = { v, x, y, L }; }
    }
    if (!best) { const L = opts[opts.length - 1]; return { x: pad, y: pad, L }; }
    // stay put unless the new spot is clearly better
    if (cardSpot && cardSpot.id === id) {
      const L = opts.find(o => o.cw === cardSpot.cw);
      if (L && cardSpot.x <= W - pad - L.cw && cardSpot.y <= H - pad - L.ch && score(cardSpot.x, cardSpot.y, L) <= best.v + 120)
        return { x: cardSpot.x, y: cardSpot.y, L };
    }
    cardSpot = { id, x: best.x, y: best.y, cw: best.L.cw };
    return best;
  }

  function wrap(text, max) {
    const words = text.split(' '), lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > max && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  // which component the cursor is nearest to (within reach)
  function pick(cx = pointer.cx, cy = pointer.cy) {
    if (cx < 0) return null;
    if (cardBox && open && cx >= cardBox[0] && cx <= cardBox[0] + cardBox[2] && cy >= cardBox[1] && cy <= cardBox[1] + cardBox[3]) return open;
    for (const id in labelBoxes) {
      const [x, y, w, h] = labelBoxes[id];
      if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) return id;
    }
    let best = null, bd = 70;
    for (const id in anchorsOnScreen) {
      const p = anchorsOnScreen[id], d = Math.hypot(p[0] - cx, p[1] - cy);
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  }

  /* ---------- animate ---------- */
  let lastHover = null, lastHoverAt = 0;
  let last = performance.now(), shownRpm = -1, acc = 0, lastProgress = 0;
  // 30 redraws a second is plenty for a slowly turning drawing, and it leaves most
  // frames free so the rest of the page keeps scrolling smoothly
  const STEP = 1 / 31;
  const LOOP = 8 * 5;     // seconds for one idea to cross the engine on desktop: 5 per stage
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    acc += dt;
    if (visible && acc >= STEP) {
      const step = Math.min(acc, .1); acc = 0;
      pointer.x += (pointer.tx - pointer.x) * .06;
      pointer.y += (pointer.ty - pointer.y) * .06;
      scrollKick *= .94;
      const target = 1.2 + (pointer.over ? 3 : 0) + scrollKick * 9;
      rate += (target - rate) * .04;
      spin += rate * step;
      let yaw;
      if (pin && !fine) {
        // pinned on touch screens: scroll position moves the molecule through the engine
        const r = pin.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight)));
        if (!paused) {
          if (progress < .02 && lastProgress > .5) nextStory();    // came back for another pass
          mol += (progress - mol) * .25;
        }
        lastProgress = progress;
        yaw = -.62 + (progress - .5) * .5 + dragYaw;
      } else {
        // hovering a part holds the air there until the mouse moves away
        const holding = fine && lastHover && now - lastHoverAt < 500;
        if (!paused && !holding) {
          mol += step / LOOP;
          if (mol >= 1.02) nextStory();
        }
        yaw = -.62 + Math.sin(now / 1000 * .08) * .12 + pointer.x * .45;
      }
      const pitch = .36 + (fine ? pointer.y * .12 : 0);
      const molStage = draw(now / 1000, yaw, pitch, step);
      showStory(molStage);
      // a short grace period, so the mouse can travel from a label to its card
      let hovered = fine && pointer.over ? pick() : null;
      if (hovered) { lastHover = hovered; lastHoverAt = now; }
      else if (fine && lastHover && now - lastHoverAt < 500) hovered = lastHover;
      if (fine) canvas.style.cursor = hovered ? 'pointer' : '';
      active = hovered || picked || (molStage === 'intake' ? null : molStage);
      // desktop: the hovered callout opens; phones: the molecule's stage is always open
      if (sideOn()) { open = null; showSide(active); if (sideShown) drawPart(sideShown, step, spin); }
      else if (fine) open = active;      // hovered, held, or wherever the air is
      else {
        // the current part stays open unless the reader folded it; a new part opens again
        const want = active || 'fan';
        if (want !== closedId) closedId = null;
        open = closedId ? null : want;
      }
      if (rpmEl) {
        const rpm = Math.round(rate * 2850 / 10) * 10;
        if (rpm !== shownRpm) { rpmEl.textContent = 'N1 ' + rpm.toLocaleString('en-US') + ' RPM'; shownRpm = rpm; }
      }
    }
    requestAnimationFrame(frame);
  }
  if (reduce) {
    // a still drawing with every label, and the whole first story written out
    mol = .55;
    draw(0, -.62, .36, 0);
    if (storyStage) storyStage.textContent = 'One idea through the engine';
    if (storyText) storyText.textContent = Object.values(STORIES[0].lines).join(' → ');
  } else {
    showStory('intake');
    requestAnimationFrame(frame);
  }
})();
