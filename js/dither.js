/* =========================================================
   Dither: line-screen WebGL renderer for animated scenes.

   Each <canvas data-dither="sceneName"> is split into a grid of cells.
   A scene draws a tiny greyscale picture (one pixel per cell) on a 2D
   canvas every frame; the shader turns each cell into a vertical ink bar
   whose width follows how dark that pixel is. Transparent pixels draw
   nothing, so the section background shows through.

   Ink colour = the canvas element's CSS `color`.
   Optional attributes: data-cell="6" (cell size in CSS px), data-lens
   (magnify under the cursor), data-avoid="selector" (never draw behind
   those elements; text is avoided line by line).
========================================================= */
(function () {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;

  const VERT = `
    attribute vec2 a_pos;
    void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;
  const FRAG = `
    precision mediump float;
    uniform sampler2D u_src;
    uniform vec2 u_res;
    uniform vec2 u_grid;
    uniform vec3 u_ink;
    uniform vec3 u_lens;   // pointer x, y (device px, top-left origin), radius
    uniform vec4 u_wave;   // click origin x, y, ring radius, strength
    void main(){
      vec2 frag = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
      vec2 cellPx = u_res / u_grid;

      // where to sample the picture: magnified under the lens, rippled by a click
      vec2 look = frag;
      vec2 d = frag - u_lens.xy;
      float dist = length(d);
      if (u_lens.z > 0.0) {
        if (abs(dist - u_lens.z) < 1.2 * cellPx.x / 6.0 + 0.6) { gl_FragColor = vec4(u_ink, 1.0); return; }
        if (dist < u_lens.z) {
          float k = dist / u_lens.z;
          look = u_lens.xy + d * (0.45 + 0.55 * k * k);
        }
      }
      if (u_wave.w > 0.0) {
        vec2 dw = frag - u_wave.xy;
        float dd = length(dw);
        float band = 1.0 - smoothstep(0.0, 44.0 * cellPx.x / 6.0, abs(dd - u_wave.z));
        look += normalize(dw + 0.0001) * sin((dd - u_wave.z) * 0.18) * 34.0 * cellPx.x / 6.0 * band * u_wave.w;
      }

      vec2 cell = floor(look / cellPx);
      vec4 s = texture2D(u_src, (cell + 0.5) / u_grid);
      if (s.a < 0.02) discard;
      float lum = dot(s.rgb, vec3(0.299, 0.587, 0.114));
      float dark = clamp((1.0 - lum) * 1.08 - 0.04, 0.0, 1.0) * s.a;
      float x = abs(fract(frag.x / cellPx.x) - 0.5);
      if (x > dark * 0.5) discard;
      gl_FragColor = vec4(u_ink, 1.0);
    }
  `;

  /* ---------- small helpers ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function parseColor(str) {
    const m = str.match(/\d+(\.\d+)?/g) || [0, 0, 0];
    return [m[0] / 255, m[1] / 255, m[2] / 255];
  }

  /* ---------- drawing kit (grey = density, transparent = nothing) ---------- */
  const starCache = new Map();
  function stars(ctx, w, h, t, count, seed, area) {
    const key = seed + ':' + count;
    if (!starCache.has(key)) {
      const r = rng(seed);
      starCache.set(key, Array.from({ length: count }, () => ({
        x: r(), y: r(), sp: .6 + r() * 1.8, ph: r() * TAU, big: r() > .85
      })));
    }
    const a = area || [0, 0, 1, 1];
    for (const s of starCache.get(key)) {
      const tw = .35 + .65 * Math.max(0, Math.sin(t * s.sp + s.ph));
      ctx.fillStyle = `rgba(0,0,0,${tw})`;
      const x = Math.floor((a[0] + s.x * a[2]) * w), y = Math.floor((a[1] + s.y * a[3]) * h);
      ctx.fillRect(x, y, 1, s.big ? 2 : 1);
    }
  }

  function sphere(ctx, x, y, r, o = {}) {
    const lx = o.lx ?? -.4, ly = o.ly ?? -.45;
    const g = ctx.createRadialGradient(x + lx * r, y + ly * r, r * .05, x, y, r * 1.02);
    g.addColorStop(0, o.hi ?? '#c4c4c4');
    g.addColorStop(.55, o.mid ?? '#6e6e6e');
    g.addColorStop(1, o.lo ?? '#141414');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  // Rotating surface features (bands for gas giants, spots for rocky bodies)
  function surface(ctx, x, y, r, t, o = {}) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    if (o.bands) {
      const n = o.bands;
      for (let i = 0; i < n; i++) {
        if (i % 2) continue;
        const y0 = y - r + i * (2 * r / n);
        ctx.fillStyle = `rgba(0,0,0,${o.bandAlpha ?? .28})`;
        ctx.beginPath();
        ctx.moveTo(x - r, y0);
        for (let k = 0; k <= 30; k++) {
          const px = x - r + k * (2 * r / 30);
          ctx.lineTo(px, y0 + Math.sin(k * .5 + t * .6 + i * 1.3) * r * .03);
        }
        ctx.lineTo(x + r, y0 + 2 * r / n);
        ctx.lineTo(x - r, y0 + 2 * r / n);
        ctx.fill();
      }
    }
    if (o.spots) {
      for (const s of o.spots) {
        const lon = s.lon + t * (o.spin ?? .15);
        const c = Math.cos(lon);
        if (c <= 0) continue;
        const px = x + r * Math.sin(lon) * Math.cos(s.lat);
        const py = y + r * Math.sin(s.lat);
        ctx.fillStyle = `rgba(${o.spotRGB ?? '0,0,0'},${(o.spotAlpha ?? .4) * c})`;
        ctx.beginPath();
        ctx.ellipse(px, py, s.size * r * c, s.size * r, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function makeSpots(seed, n) {
    const r = rng(seed);
    return Array.from({ length: n }, () => ({ lon: r() * TAU, lat: (r() - .5) * 2.4, size: .06 + r() * .16 }));
  }

  function ring(ctx, x, y, r, tilt, front, o = {}) {
    ctx.save();
    ctx.strokeStyle = o.color ?? 'rgba(40,40,40,.85)';
    ctx.lineWidth = Math.max(1, r * (o.width ?? .1));
    ctx.beginPath();
    ctx.ellipse(x, y, r * (o.rx ?? 2), r * (o.ry ?? .42), tilt, front ? 0 : Math.PI, front ? Math.PI : TAU);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, r * .03);
    ctx.strokeStyle = 'rgba(80,80,80,.6)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * (o.rx ?? 2) * 1.14, r * (o.ry ?? .42) * 1.14, tilt, front ? 0 : Math.PI, front ? Math.PI : TAU);
    ctx.stroke();
    ctx.restore();
  }

  const cloudCache = new Map();
  function clouds(ctx, w, h, t, seed, o = {}) {
    const key = seed + ':' + (o.count || 6);
    if (!cloudCache.has(key)) {
      const r = rng(seed);
      cloudCache.set(key, Array.from({ length: o.count || 6 }, () => ({
        x: r(), y: r(), s: .6 + r() * .8, sp: (.004 + r() * .01) * (r() > .5 ? 1 : -1), puffs: 3 + Math.floor(r() * 4), seed: r() * 100
      })));
    }
    const [ax, ay, aw, ah] = o.area || [0, 0, 1, 1];
    const size = (o.size || .12) * Math.min(w * 1.4, h * 2.2);
    for (const c of cloudCache.get(key)) {
      const cx = (((c.x + t * c.sp) % 1.3 + 1.3) % 1.3 - .15) * aw * w + ax * w;
      const cy = (ay + c.y * ah) * h + Math.sin(t * .3 + c.seed) * h * .01;
      for (let i = 0; i < c.puffs; i++) {
        const px = cx + (i - c.puffs / 2) * size * c.s * .55;
        const py = cy - Math.sin((i + .5) / c.puffs * Math.PI) * size * c.s * .35;
        const pr = size * c.s * (.45 + .25 * Math.sin(i * 2.1 + c.seed));
        const g = ctx.createRadialGradient(px, py - pr * .3, 0, px, py, pr);
        const tone = o.tone ?? 150, a = o.alpha ?? .95;
        g.addColorStop(0, `rgba(${tone + 25},${tone + 25},${tone + 25},${a})`);
        g.addColorStop(.6, `rgba(${tone},${tone},${tone},${a})`);
        g.addColorStop(1, `rgba(${tone},${tone},${tone},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
      }
    }
  }

  const birdCache = new Map();
  function birds(ctx, w, h, t, seed, n, area) {
    const key = seed + ':' + n;
    if (!birdCache.has(key)) {
      const r = rng(seed);
      birdCache.set(key, Array.from({ length: n }, () => ({ x: r(), y: r(), sp: .02 + r() * .03, ph: r() * TAU, s: .7 + r() * .6 })));
    }
    const [ax, ay, aw, ah] = area || [0, 0, 1, 1];
    ctx.strokeStyle = 'rgba(0,0,0,.9)';
    ctx.lineWidth = 1;
    for (const b of birdCache.get(key)) {
      const x = ((b.x + t * b.sp) % 1.2 - .1) * aw * w + ax * w;
      const y = (ay + b.y * ah) * h + Math.sin(t * .8 + b.ph) * 2;
      const flap = Math.sin(t * 6 + b.ph) * 1.6 * b.s;
      const s = 2.6 * b.s;
      ctx.beginPath();
      ctx.moveTo(x - s, y - flap); ctx.lineTo(x, y); ctx.lineTo(x + s, y - flap);
      ctx.stroke();
    }
  }

  /* ---------- scenes ---------- */
  const moonSpots = makeSpots(7, 14);
  const marsSpots = makeSpots(21, 9);

  const scenes = {
    hero(ctx, w, h, t, st) {
      const portrait = h > w * 1.1;
      const out = clamp((st.p - .5) * 2, 0, 1);
      stars(ctx, w, h, t, portrait ? 24 : 60, 11, portrait ? [0, .44, 1, .3] : [0, .05, 1, .55]);
      const r = portrait ? w * .24 : h * .16;
      const cx = w * (portrait ? .6 : .62) + st.mx * 3;
      const cy = h * (portrait ? .58 : .43) + st.my * 2 - out * h * .35 + Math.sin(t * .5) * 1.2;
      const tilt = -.32 + Math.sin(t * .2) * .03;
      clouds(ctx, w, h, t, 4, { count: portrait ? 2 : 4, area: [0, portrait ? .5 : .36, 1, .16], size: .07, alpha: .6, tone: 165 });
      // orbiting moon: behind the planet on the far half of its orbit
      const a = t * .35;
      const mx = cx + Math.cos(a) * r * 2.9, my = cy + Math.sin(a) * r * .7 - r * .25;
      const moonFront = Math.sin(a) > 0;
      if (!moonFront) sphere(ctx, mx, my, r * .13);
      ring(ctx, cx, cy, r, tilt, false);
      sphere(ctx, cx, cy, r);
      surface(ctx, cx, cy, r, t, { bands: 9, bandAlpha: .22 });
      ring(ctx, cx, cy, r, tilt, true);
      if (moonFront) sphere(ctx, mx, my, r * .16);
      birds(ctx, w, h, t, 9, portrait ? 3 : 6, portrait ? [0, .46, 1, .06] : [0, .3, 1, .15]);
    },

    prologue(ctx, w, h, t, st) {
      const drift = (st.p - .5) * .08;
      if (h > w * .9) {
        // phones: cloud banks along the top and bottom edges mark out the section,
        // with smaller clouds peeking in from the sides
        clouds(ctx, w, h, t * .6, 71, { count: 4, area: [0, .12, 1, .04], size: .11, alpha: .9 });
        clouds(ctx, w, h, t * .6, 83, { count: 4, area: [0, .84, 1, .04], size: .11, alpha: .9 });
        clouds(ctx, w, h, t * .6, 31, { count: 2, area: [-.2 - drift, .3, .3, .4], size: .1, alpha: .85 });
        clouds(ctx, w, h, t * .6, 57, { count: 2, area: [.9 + drift, .35, .3, .4], size: .1, alpha: .85 });
        birds(ctx, w, h, t, 3, 3, [0, .1, 1, .08]);
        return;
      }
      clouds(ctx, w, h, t * .6, 31, { count: 3, area: [-.12 - drift, .15, .3, .7], size: .16, alpha: .9 });
      clouds(ctx, w, h, t * .6, 57, { count: 3, area: [.82 + drift, .2, .3, .7], size: .16, alpha: .9 });
      birds(ctx, w, h, t, 3, 4, [0, .08, 1, .12]);
    },

    moonrise(ctx, w, h, t, st) {
      const rise = ease(clamp(st.p * 1.6 - .15, 0, 1));
      stars(ctx, w, h, t, 70, 41);
      const r = Math.min(h * .52, w * .3);
      const cx = w * .5 + st.mx * 2;
      const cy = h * (1.45 - rise * .95);
      sphere(ctx, cx, cy, r, { hi: '#000000', mid: '#3a3a3a', lo: '#9a9a9a' });
      surface(ctx, cx, cy, r, t, { spots: moonSpots, spin: .08, spotAlpha: .45, spotRGB: '255,255,255' });
      clouds(ctx, w, h, t, 77, { count: 4, area: [0, .66, 1, .28], size: .1, alpha: .9, tone: 90 });
    },

    sunset(ctx, w, h, t, st) {
      const sink = ease(clamp(st.p * 1.4 - .1, 0, 1));
      const r = Math.min(h * .55, w * .3);
      const cx = w * .5;
      const cy = h * (.35 + sink * .55);
      sphere(ctx, cx, cy, r, { hi: '#000000', mid: '#2e2e2e', lo: '#8a8a8a', lx: 0, ly: -.6 });
      // retro sun cut-outs, thicker towards the horizon
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const off = (t * 3) % 8;
      for (let y = cy - r * .1 + off; y < cy + r; y += 8) {
        const k = (y - (cy - r * .1)) / (r * 1.1);
        ctx.fillRect(cx - r, y, r * 2, Math.max(1, k * 5));
      }
      ctx.restore();
      clouds(ctx, w, h, t, 91, { count: 4, area: [0, .6, 1, .25], size: .09, alpha: .85, tone: 95 });
      birds(ctx, w, h, t, 13, 5, [0, .1, 1, .3]);
    },

    // ----- project panels -----
    radar(ctx, w, h, t) {
      const cx = w * .5, cy = h * .5, R = h * .46;
      ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1;
      for (const k of [.33, .66, 1]) { ctx.beginPath(); ctx.arc(cx, cy, R * k, 0, TAU); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
      const a = (t * 1.3) % TAU;
      if (ctx.createConicGradient) {
        const g = ctx.createConicGradient(a - TAU * .25, cx, cy);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.25, 'rgba(0,0,0,.95)'); g.addColorStop(.2501, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
      const blips = [[.3, .55], [1.9, .8], [3.4, .4], [4.6, .7], [5.5, .3]];
      for (const [ang, d] of blips) {
        const diff = ((a - ang) % TAU + TAU) % TAU;
        const alpha = Math.max(0, 1 - diff / 2.4);
        if (!alpha) continue;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(Math.round(cx + Math.cos(ang) * R * d) - 1, Math.round(cy + Math.sin(ang) * R * d) - 1, 3, 3);
      }
      // side readouts
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      for (let i = 0; i < 6; i++) {
        const len = (Math.sin(t * 2 + i) * .5 + .5) * w * .12 + 2;
        ctx.fillRect(w * .06, h * .2 + i * h * .11, len, 1);
        ctx.fillRect(w * .94 - len, h * .2 + i * h * .11, len, 1);
      }
    },

    // Top-view humanoid soccer: two teams of robots chasing the ball
    pitch(ctx, w, h, t) {
      const fh = h * .84, fw = Math.min(w * .82, fh * 1.6);
      const x0 = (w - fw) / 2, y0 = (h - fh) / 2, cx = w / 2, cy = h / 2;
      ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 1;
      ctx.strokeRect(x0, y0, fw, fh);
      ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y0 + fh); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, fh * .17, 0, TAU); ctx.stroke();
      const bh = fh * .5, bw = fw * .08, gh = fh * .28;
      ctx.strokeRect(x0, cy - bh / 2, bw, bh); ctx.strokeRect(x0 + fw - bw, cy - bh / 2, bw, bh);
      ctx.fillStyle = 'rgba(0,0,0,.7)';
      ctx.fillRect(x0 - 3, cy - gh / 2, 3, gh); ctx.fillRect(x0 + fw, cy - gh / 2, 3, gh);

      const ball = tt => ({
        x: cx + Math.sin(tt * .45) * fw * .36 + Math.sin(tt * 1.3) * fw * .05,
        y: cy + Math.sin(tt * .75 + 1) * fh * .32 + Math.cos(tt * 1.7) * fh * .04
      });
      const robots = [
        // home position (field fraction), lag behind the ball (s), how hard it presses, team
        [-.38, 0, .9, .15, 0], [-.18, -.22, .5, .55, 0], [-.12, .24, .7, .5, 0],
        [.38, 0, .9, .15, 1], [.2, .2, .45, .6, 1], [.1, -.25, .8, .5, 1]
      ];
      const at = (rb, tt) => {
        const bl = ball(tt - rb[2]);
        const hx = cx + rb[0] * fw, hy = cy + rb[1] * fh;
        return { x: hx + (bl.x - hx) * rb[3], y: hy + (bl.y - hy) * rb[3] };
      };
      const b = ball(t);
      for (const rb of robots) {
        const p = at(rb, t), q = at(rb, t - .15);
        let hx = p.x - q.x, hy = p.y - q.y;
        if (Math.hypot(hx, hy) < .05) { hx = b.x - p.x; hy = b.y - p.y; }
        const n = Math.hypot(hx, hy) || 1, r = Math.max(2, fh * .06);
        ctx.fillStyle = rb[4] ? 'rgba(0,0,0,.55)' : '#000';
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + hx / n * r * 2.2, p.y + hy / n * r * 2.2); ctx.stroke();
      }
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(1.2, fh * .03), 0, TAU); ctx.fill();
    },

    planet(ctx, w, h, t) {
      stars(ctx, w, h, t, 50, 5);
      const cx = w * .5, cy = h * .52, r = h * .34;
      const a = t * .5;
      const ox = cx + Math.cos(a) * r * 2.4, oy = cy + Math.sin(a) * r * .45;
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, r * 2.4, r * .45, 0, 0, TAU); ctx.stroke();
      if (Math.sin(a) < 0) sphere(ctx, ox, oy, r * .18);
      sphere(ctx, cx, cy, r);
      surface(ctx, cx, cy, r, t, { spots: marsSpots, spin: .25, spotAlpha: .45 });
      if (Math.sin(a) >= 0) sphere(ctx, ox, oy, r * .2);
    },

    glyph(ctx, w, h, t) {
      const k = (Math.sin(t * .9) + 1) / 2;
      const p = k * k * (3 - 2 * k);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(0,0,0,${1 - p})`;
      ctx.font = `${Math.round(h * .62)}px "Instrument Serif", serif`;
      ctx.fillText('RUMI', w * .5 - p * w * .08, h * .56);
      ctx.fillStyle = `rgba(0,0,0,${p})`;
      ctx.font = `${Math.round(h * .6)}px "Noto Naskh Arabic", "Traditional Arabic", "Times New Roman", serif`;
      ctx.fillText('رومي', w * .5 + (1 - p) * w * .08, h * .52);
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(w * .5 - w * .3, h * .9, w * .6 * p, 1);
    },

    ecg(ctx, w, h, t) {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      for (let x = 4; x < w; x += 8) for (let y = 3; y < h; y += 8) ctx.fillRect(x, y, 1, 1);
      const beat = x => {
        const u = ((x % 40) + 40) % 40;
        if (u < 14) return 0;
        if (u < 16) return -.12 * Math.sin((u - 14) / 2 * Math.PI);
        if (u < 18) return .15;
        if (u < 19.5) return -.95;
        if (u < 21) return .35;
        if (u < 26) return 0;
        if (u < 31) return -.22 * Math.sin((u - 26) / 5 * Math.PI);
        return 0;
      };
      const head = (t * 26) % w;
      ctx.lineWidth = 2;
      for (let x = 0; x < w - 1; x++) {
        const age = ((head - x) % w + w) % w;
        const a = age < 1 ? 0 : Math.max(0, 1 - age / (w * .85));
        if (a <= 0) continue;
        ctx.strokeStyle = `rgba(0,0,0,${a})`;
        ctx.beginPath();
        ctx.moveTo(x, h * .55 + beat(x - t * 0) * h * .42);
        ctx.lineTo(x + 1, h * .55 + beat(x + 1) * h * .42);
        ctx.stroke();
      }
      ctx.fillStyle = '#000';
      ctx.fillRect(Math.floor(head) - 1, Math.floor(h * .55 + beat(head) * h * .42) - 1, 3, 3);
    },

    crescent(ctx, w, h, t) {
      stars(ctx, w, h, t, 60, 17);
      const cx = w * .5, cy = h * .5, r = h * .38;
      sphere(ctx, cx, cy, r, { hi: '#bdbdbd', mid: '#555', lo: '#1a1a1a', lx: -.5, ly: -.2 });
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const k = (Math.sin(t * .35) + 1) / 2;
      ctx.beginPath(); ctx.arc(cx + r * (.35 + k * .5), cy - r * .12, r * .92, 0, TAU); ctx.fill();
      ctx.restore();
    }
  };

  /* ---------- pointer, lens, click waves, trail ---------- */
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const LENS_RADIUS = 38;      // CSS px
  const WAVE_SPEED = 900;      // CSS px per second
  const WAVE_LIFE = 1.1;       // seconds
  const TRAIL_LIFE = .3;       // seconds

  const pointer = { x: 0, y: 0, sx: 0, sy: 0, cx: -9999, cy: -9999, inside: false };
  const waves = [];
  const trail = [];
  window.addEventListener('pointermove', e => {
    pointer.x = e.clientX / innerWidth * 2 - 1;
    pointer.y = e.clientY / innerHeight * 2 - 1;
    pointer.cx = e.clientX; pointer.cy = e.clientY;
    pointer.inside = true;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.inside = false; });
  window.addEventListener('blur', () => { pointer.inside = false; });
  window.addEventListener('pointerdown', e => {
    if (!finePointer) return;
    waves.push({ x: e.clientX, y: e.clientY, t0: performance.now() / 1000 });
    if (waves.length > 3) waves.shift();
  }, { passive: true });

  // Ink trail: a ribbon that thins and fades behind the cursor
  scenes.trail = function (ctx, w, h, t, st) {
    if (trail.length < 2) return 'idle';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i];
      const life = 1 - (st.now - b.t) / TRAIL_LIFE;
      if (life <= 0) continue;
      const speed = Math.min(1, Math.hypot(b.x - a.x, b.y - a.y) / 40);
      ctx.strokeStyle = `rgba(0,0,0,${life * .75})`;
      // 3px when slow, up to 10px when flicked (CSS px), thinning as it fades
      ctx.lineWidth = Math.max(.6, (3 + speed * 7) * life / st.cell);
      ctx.beginPath();
      ctx.moveTo((a.x - st.left) / st.cell, (a.y - st.top) / st.cell);
      ctx.lineTo((b.x - st.left) / st.cell, (b.y - st.top) / st.cell);
      ctx.stroke();
    }
  };

  /* ---------- renderer ---------- */
  const instances = [];

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  class Dither {
    constructor(canvas) {
      this.canvas = canvas;
      this.cell = parseFloat(canvas.dataset.cell || '6');
      this.scene = canvas.dataset.dither;
      this.lens = finePointer && 'lens' in canvas.dataset;
      this.avoid = canvas.dataset.avoid ? [...document.querySelectorAll(canvas.dataset.avoid)] : [];
      this.lensR = 0;
      this.idle = false;
      this.visible = false;
      const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false });
      if (!gl) throw new Error('no webgl');
      this.gl = gl;
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.u = {};
      ['u_res', 'u_grid', 'u_ink', 'u_lens', 'u_wave'].forEach(n => { this.u[n] = gl.getUniformLocation(prog, n); });
      this.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

      this.src = document.createElement('canvas');
      this.ctx = this.src.getContext('2d', { willReadFrequently: false });

      this.resize();
      new ResizeObserver(() => { this.resize(); if (reduceMotion) this.render(6, 0); }).observe(canvas);
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { rootMargin: '10% 0px' }).observe(canvas);
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(r.width * this.dpr);
      this.canvas.height = Math.round(r.height * this.dpr);
      this.cols = Math.max(1, Math.ceil(r.width / this.cell));
      this.rows = Math.max(1, Math.ceil(r.height / this.cell));
      this.src.width = this.cols;
      this.src.height = this.rows;
      this.ink = parseColor(getComputedStyle(this.canvas).color);
    }

    // Erase the picture behind the avoided elements (per text line, softly padded)
    cutOut(r) {
      const { ctx, cell } = this;
      const pad = 1.5;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      for (const el of this.avoid) {
        let boxes;
        if (el.matches('a, button')) boxes = [el.getBoundingClientRect()];
        else {
          const range = document.createRange();
          range.selectNodeContents(el);
          boxes = range.getClientRects();
        }
        for (const b of boxes) {
          if (!b.width || !b.height) continue;
          ctx.fillRect((b.left - r.left) / cell - pad, (b.top - r.top) / cell - pad,
                       b.width / cell + pad * 2, b.height / cell + pad * 2);
        }
      }
      ctx.restore();
    }

    setScene(name) { this.scene = name; this.resize(); if (reduceMotion) this.render(6, 0); }

    hovered(r) {
      return pointer.inside && pointer.cx >= r.left && pointer.cx <= r.right && pointer.cy >= r.top && pointer.cy <= r.bottom;
    }

    render(t, now) {
      const draw = scenes[this.scene];
      if (!draw || !this.cols) return;
      const r = this.canvas.getBoundingClientRect();
      const vh = window.innerHeight;
      const st = {
        p: clamp(1 - r.bottom / (vh + r.height), 0, 1),
        mx: pointer.sx, my: pointer.sy,
        now, left: r.left, top: r.top, cell: this.cell
      };
      const { ctx, gl } = this;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.cols, this.rows);
      const result = draw(ctx, this.cols, this.rows, t, st);
      if (this.avoid.length) this.cutOut(r);
      // nothing new to show: skip the GPU work after clearing once
      if (result === 'idle' && this.idle) return;
      this.idle = result === 'idle';

      // lens eases in while the pointer is over this canvas
      const over = this.lens && !api.suppressLens && !document.documentElement.classList.contains('menu-open') && this.hovered(r);
      this.lensR += ((over ? LENS_RADIUS : 0) - this.lensR) * .18;
      if (this.lensR < .5) this.lensR = 0;
      this.hover = over;

      // newest click wave that is still alive
      let wave = [0, 0, 0, 0];
      for (let i = waves.length - 1; i >= 0; i--) {
        const age = now - waves[i].t0;
        if (age > WAVE_LIFE) continue;
        wave = [(waves[i].x - r.left) * this.dpr, (waves[i].y - r.top) * this.dpr, age * WAVE_SPEED * this.dpr, 1 - age / WAVE_LIFE];
        break;
      }

      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.src);
      gl.uniform2f(this.u.u_res, this.canvas.width, this.canvas.height);
      gl.uniform2f(this.u.u_grid, this.cols, this.rows);
      gl.uniform3f(this.u.u_ink, this.ink[0], this.ink[1], this.ink[2]);
      gl.uniform3f(this.u.u_lens, (pointer.cx - r.left) * this.dpr, (pointer.cy - r.top) * this.dpr, this.lensR * this.dpr);
      gl.uniform4f(this.u.u_wave, wave[0], wave[1], wave[2], wave[3]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  // suppressLens: set by the cursor while it's over a link or button
  const api = { init, scenes, lensHover: false, suppressLens: false };

  function init() {
    document.querySelectorAll('canvas[data-dither]').forEach(c => {
      if (c.dataset.dither === 'trail' && (!finePointer || reduceMotion)) { c.remove(); return; }
      try { instances.push(c.__dither = new Dither(c)); }
      catch (err) { c.style.display = 'none'; }
    });
    if (reduceMotion) { instances.forEach(i => i.render(6, 0)); return; }
    const start = performance.now();
    let lastX = null, lastY = null;
    (function loop(ms) {
      const now = ms / 1000;
      pointer.sx += (pointer.x - pointer.sx) * .05;
      pointer.sy += (pointer.y - pointer.sy) * .05;
      if (pointer.inside && (pointer.cx !== lastX || pointer.cy !== lastY)) {
        trail.push({ x: pointer.cx, y: pointer.cy, t: now });
        lastX = pointer.cx; lastY = pointer.cy;
      }
      while (trail.length && now - trail[0].t > TRAIL_LIFE) trail.shift();
      const t = (ms - start) / 1000;
      let lensHover = false;
      for (const i of instances) {
        if (!i.visible) continue;
        i.render(t, now);
        if (i.hover) lensHover = true;
      }
      api.lensHover = lensHover;
      requestAnimationFrame(loop);
    })(start);
  }

  window.Dither = api;
})();
