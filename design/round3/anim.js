/* =====================================================================
   Round 3.3 — playable preview of the reminder beat: raised → wind-up → hold → strike → hit-stop → follow-through.

   How a frame is made
   • Joints: the shoulder stays put; the upper arm and the forearm are interpolated as angles and lengths
     between key poses (so the elbow and wrist travel on arcs, never straight through the body).
   • The fist sits on the forearm (distance + angle from the wrist); the keisaku is ALWAYS placed from the fist
     and its angle = forearm angle + wrist angle. Nothing about it is interpolated on its own.
   • Sleeves: each key pose's sleeve outline is resampled and "skinned" to its own skeleton (every point is tied
     to the torso, the upper arm and the forearm by distance). For a frame, both neighbouring keys' outlines are
     carried by the current skeleton and blended — so the cuff stays on the forearm even mid-swing. Points of the
     sleeve bag (far from the bones) are carried by the skeleton of 50 ms earlier: that is the lag.
   • Body lean / squash interpolate with the same curve. The scene is not rotated as a whole.
   • Layers: the robe, sleeves and head stay behind the mochi; only the keisaku and the fist holding it are on
     their own layer above it.
   • Round 3.5: after the follow-through the arm returns to the hanging pose (POSE.idle, as drawn) and the last frame
     is that pose exactly; endCheck() measures it.
   ===================================================================== */
(function () {
  'use strict';
  const M = MONK4, P = M.POSE, SK = M.SKELETON, { resample, onSpline, curve } = M;
  const SH = [-15, -48], TORSO = [[-13.2, -57.4], [-12.4, -46]];
  const MONK_AT = [132, 254], MOCHI_AT = [206, 257];
  const R = Math.PI / 180;
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / R;
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dir = a => [Math.cos(a * R), Math.sin(a * R)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpP = (A, B, t) => A.map((q, i) => [lerp(q[0], B[i][0], t), lerp(q[1], B[i][1], t)]);
  const unwrap = (prev, a) => { while (a - prev > 180) a -= 360; while (a - prev < -180) a += 360; return a; };
  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  const frame = (p0, p1) => { const L = dist(p0, p1) || 1, e = [(p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L]; return { p0, L, e, n: [-e[1], e[0]] }; };
  const toLocal = (P, f) => { const d = [P[0] - f.p0[0], P[1] - f.p0[1]]; return [(d[0] * f.e[0] + d[1] * f.e[1]) / f.L, d[0] * f.n[0] + d[1] * f.n[1]]; };
  const fromLocal = ([u, v], f) => [f.p0[0] + f.e[0] * u * f.L + f.n[0] * v, f.p0[1] + f.e[1] * u * f.L + f.n[1] * v];

  // The 3.3 keys drew a spline through their outline resampled to 48 (line: 16) points; those keys now carry points on
  // exactly that drawn curve (6 per span), so their frames do not move. idle carries points on its own drawn curve.
  const SUB = 6, NEAR_N = M.DENSE.near, LINE_N = M.DENSE.line;   // 288 = 48 × 6, 91 = 15 × 6 + 1

  /* ---------- key poses, as data ----------
     Round 3.5 adds 'idle' (the existing 香板垂放 pose, read as it is) and, per key, a few values that used to be
     constants: the cuff's size and its angle relative to the forearm, the bare wrist's width and where the keisaku's
     origin sits relative to the fist. The four keys from 3.3 get exactly the old constants, so their frames are
     unchanged; idle gets its own drawing's values. */
  const KEYS = { ready3: { face: 'stern', tilt: 4 }, windup: { face: 'stern', tilt: 2 }, strike: { face: 'stern', tilt: 6 }, follow: { face: 'calm', tilt: 3 }, idle: { face: 'kind', tilt: 2, own: true } };
  let prev = null;
  for (const k of ['ready3', 'windup', 'strike', 'follow', 'idle']) {
    const q = SK[k], pz = P[k], el = q.elN, wr = q.wrN, own = KEYS[k].own;
    const hc = pz.hand.reduce((a, v) => [a[0] + v[0] / pz.hand.length, a[1] + v[1] / pz.hand.length], [0, 0]);
    const fist = pz.fist || hc;
    let a1 = ang(SH, el), a2 = ang(el, wr), sr = (pz.stick.rot - 90) - a2;
    if (prev) { a1 = unwrap(prev.a1, a1); a2 = unwrap(prev.a2, a2); sr = unwrap(prev.sr, sr); }
    const u = dir(a2), c = pz.cuffO, nv = dir(a2 + 90);
    // the keisaku's origin in its own (rotated) frame, measured from the fist; 3.3 keys: 3.5 back along the board
    let stickOff = [0, 3.5];
    if (own) { const rr = pz.stick.rot * R, dx = pz.stick.x - fist[0], dy = pz.stick.y - fist[1]; stickOff = [dx * Math.cos(rr) + dy * Math.sin(rr), -dx * Math.sin(rr) + dy * Math.cos(rr)]; }
    let cuffRel = own ? c.r - a2 : 0; if (own) { while (cuffRel > 90) cuffRel -= 180; while (cuffRel < -90) cuffRel += 180; }
    const key = Object.assign(KEYS[k], {
      name: k, a1, a2, sr, L1: dist(SH, el), L2: dist(el, wr), fd: dist(wr, fist), fa: ang(wr, fist) - a2,
      cf: ((c.cx - el[0]) * u[0] + (c.cy - el[1]) * u[1]) / dist(el, wr),
      cv: own ? (c.cx - el[0]) * nv[0] + (c.cy - el[1]) * nv[1] : 0,
      cuffRx: own ? c.rx : 1.4, cuffRy: own ? c.ry : 3.3, cuffRel, skinW: own ? 0 : 2, stickOff,
      stretch: pz.stick.stretch || 1, lean: pz.lean || 0, sx: pz.sx || 1, sy: pz.sy || 1,
      hand: pz.hand.map(v => [v[0] - fist[0], v[1] - fist[1]]), handLine: pz.handLine.map(v => [v[0] - fist[0], v[1] - fist[1]]),
    });
    const lines0 = pz.nearLines || [pz.nearLine];
    // bind the sleeve outline and its lines to this key's own skeleton
    const fu = frame(SH, el), ff = frame(el, wr);
    const bind = pts => pts.map(Pt => {
      const dT = segDist(Pt, TORSO[0], TORSO[1]), dU = segDist(Pt, SH, el), dF = segDist(Pt, el, wr);
      const w = [1 / (dT * dT + 1), 1 / (dU * dU + 1), 1 / (dF * dF + 1)], s = w[0] + w[1] + w[2];
      return { P: Pt, w: w.map(x => x / s), lu: toLocal(Pt, fu), lf: toLocal(Pt, ff), bag: Math.min(dU, dF) > 6.5 };
    });
    // 3.3 keys: the 48 / 16 control points are skinned (as in 3.3) and the drawn spline is sampled afterwards;
    // idle: points on its own drawn curve are skinned directly. Both end up as NEAR_N / LINE_N points.
    key.near = bind(own ? curve(pz.near, NEAR_N, true) : resample(pz.near, 48, true)); key.near.ctrl = !own; key.near.closed = true;
    key.line0 = bind(own ? curve(lines0[0], LINE_N, false) : resample(lines0[0], 16, false)); key.line0.ctrl = !own; key.line0.closed = false;
    key.extras = lines0.slice(1).concat(pz.folds || []).map(l => bind(l));
    prev = key;
  }
  // the hold: the arm keeps drawing back a touch, the body settles a little further back (alive, not frozen)
  const KK = {}; for (const k in KEYS) KK[k] = KEYS[k];
  KK.windupPlus = Object.assign({}, KK.windup, { a1: KK.windup.a1 + 4, sr: KK.windup.sr - 4, lean: KK.windup.lean - 1, name: 'windupPlus' });

  /* ---------- timeline ---------- */
  const ease = {
    lin: t => t, inOut: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2,
    in: t => t * t * t, out: t => 1 - (1 - t) ** 3, sine: t => .5 - Math.cos(Math.PI * t) / 2,
  };
  // Round 3.5: the old 460 ms 'post' hold is replaced by settle (follow-through held) → return (back to the hanging
  // pose) → rest (held, so the lagging sleeve bag lands too). Everything up to the follow-through is unchanged.
  const T = { pre: 200, windup: 340, hold: 160, swing: 90, stop: 135, follow: 260, settle: 120, return: 520, rest: 120 };
  let SEG = [];
  function build() {
    const plan = [['pre', '舉起', 'ready3', 'ready3', 'lin'], ['windup', '預備', 'ready3', 'windup', 'inOut'], ['hold', '停頓', 'windup', 'windupPlus', 'sine'],
      ['swing', '揮下', 'windupPlus', 'strike', 'in'], ['stop', '命中停格', 'strike', 'strike', 'lin'], ['follow', '收勢', 'strike', 'follow', 'out'], ['settle', '收勢（停）', 'follow', 'follow', 'lin'],
      ['return', '收板歸位', 'follow', 'idle', 'inOut'], ['rest', '待機', 'idle', 'idle', 'lin']];
    let t0 = 0; SEG = plan.map(([id, zh, a, b, e]) => { const s = { id, zh, a, b, e, t0, t1: t0 + T[id] }; t0 = s.t1; return s; });
  }
  build();
  const total = () => SEG[SEG.length - 1].t1;
  const segAt = t => SEG.find(s => t < s.t1) || SEG[SEG.length - 1];

  function joints(t) {
    t = Math.max(0, Math.min(total(), t));
    const s = segAt(t), A = KK[s.a], B = KK[s.b], u = Math.min(1, (t - s.t0) / ((s.t1 - s.t0) || 1)), e = ease[s.e](u);
    const a1 = lerp(A.a1, B.a1, e), a2 = lerp(A.a2, B.a2, e), L1 = lerp(A.L1, B.L1, e), L2 = lerp(A.L2, B.L2, e);
    const el = [SH[0] + L1 * dir(a1)[0], SH[1] + L1 * dir(a1)[1]], wr = [el[0] + L2 * dir(a2)[0], el[1] + L2 * dir(a2)[1]];
    const fd = lerp(A.fd, B.fd, e), fa = lerp(A.fa, B.fa, e), fist = [wr[0] + fd * dir(a2 + fa)[0], wr[1] + fd * dir(a2 + fa)[1]];
    const sr = lerp(A.sr, B.sr, e), rot = a2 + sr + 90, d = [Math.sin(rot * R), -Math.cos(rot * R)];
    const stretch = lerp(A.stretch, B.stretch, e);
    const off = [lerp(A.stickOff[0], B.stickOff[0], e), lerp(A.stickOff[1], B.stickOff[1], e)], cr = Math.cos(rot * R), sn = Math.sin(rot * R);
    let face = e < .5 ? A.face : B.face, tilt = lerp(A.tilt, B.tilt, e);
    if (s.id === 'return') {   // calm → the eyes close into the kind smile → kind; one slow nod on the way down
      face = u < .25 ? 'calm' : u < .8 ? 'relief' : 'kind';
      tilt += 4 * Math.sin(Math.PI * u) ** 2;
    }
    return { t, s, A, B, e, u, el, wr, fist, a2, rot, d, stretch, origin: [fist[0] + off[0] * cr - off[1] * sn, fist[1] + off[0] * sn + off[1] * cr],
      tipLen: M.STICK.grip + M.STICK.blade * stretch, lean: lerp(A.lean, B.lean, e), sx: lerp(A.sx, B.sx, e), sy: lerp(A.sy, B.sy, e),
      face, tilt, a1, L1, L2, sr };
  }
  const tipLocal = j => [j.origin[0] + j.tipLen * j.d[0], j.origin[1] + j.tipLen * j.d[1]];
  function toWorld(p, j) {   // monk art coords → scene coords (lean + squash about the feet, then placement)
    const c = Math.cos(j.lean * R), s = Math.sin(j.lean * R), x = p[0] * j.sx, y = p[1] * j.sy;
    return [MONK_AT[0] + x * c - y * s, MONK_AT[1] + x * s + y * c];
  }
  function skin(bound, j, lag) {
    const fu = frame(SH, j.el), ff = frame(j.el, j.wr), gu = frame(SH, lag.el), gf = frame(lag.el, lag.wr);
    return bound.map(b => {
      const U = fromLocal(b.lu, b.bag ? gu : fu), F = fromLocal(b.lf, b.bag ? gf : ff);
      return [b.w[0] * b.P[0] + b.w[1] * U[0] + b.w[2] * F[0], b.w[0] * b.P[1] + b.w[1] * U[1] + b.w[2] * F[1]];
    });
  }
  const LAG = 50;
  function poseAt(t, opts = {}) {
    const j = joints(t), lag = joints(t - LAG), A = j.A, B = j.B, e = j.e;
    const carried = b => { const q = skin(b, j, lag); return b.ctrl ? onSpline(q, b.closed, SUB) : q; };
    const blend = (key) => lerpP(carried(A[key]), carried(B[key]), e);
    const cf = lerp(A.cf, B.cf, e), cv = lerp(A.cv, B.cv, e), n = dir(j.a2 + 90);
    const c = [lerp(j.el[0], j.wr[0], cf) + cv * n[0], lerp(j.el[1], j.wr[1], cf) + cv * n[1]], hw = lerp(A.skinW, B.skinW, e);
    const hand = lerpP(A.hand, B.hand, e).map(v => [v[0] + j.fist[0], v[1] + j.fist[1]]);
    const handLine = lerpP(A.handLine, B.handLine, e).map(v => [v[0] + j.fist[0], v[1] + j.fist[1]]);
    const extraLines = A.extras.map(l => ({ pts: skin(l, j, lag), op: 1 - e })).concat(B.extras.map(l => ({ pts: skin(l, j, lag), op: e })));
    const p = {
      v2: true, far: P.stand.far, farBehind: true, farHand: P.stand.farHand,
      near: blend('near'), nearLines: [blend('line0')], extraLines,
      cuffO: { cx: c[0], cy: c[1], rx: lerp(A.cuffRx, B.cuffRx, e), ry: lerp(A.cuffRy, B.cuffRy, e), r: j.a2 + lerp(A.cuffRel, B.cuffRel, e) },
      skin: [[c[0] + hw * n[0], c[1] + hw * n[1]], [c[0] - hw * n[0], c[1] - hw * n[1]], [j.wr[0] - hw * n[0], j.wr[1] - hw * n[1]], [j.wr[0] + hw * n[0], j.wr[1] + hw * n[1]]], skinW: hw / 2,
      hand, handLine, stick: { x: j.origin[0], y: j.origin[1], rot: j.rot, stretch: j.stretch },
      lean: j.lean, sx: j.sx, sy: j.sy, impact: j.s.id === 'stop',
    };
    // motion trail: the tip's last 70 ms, only while it is fast
    let trail = '';
    if (j.s.id === 'swing' || j.s.id === 'stop') {
      const pts = []; for (let k = 0; k <= 10; k++) pts.push(tipLocal(joints(Math.max(SEG[3].t0, j.t - 70 + 7 * k))));
      const mid = pts.map(q => q.map(v => v.toFixed(1)).join(' ')).join(' L');
      trail = `<path d="M${mid}" style="fill:none;stroke:#fffaf0;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;opacity:${opts.trailOp ?? .3}"/>`;
    }
    let top = '';
    if (opts.skeleton) {
      const pt = v => v.map(x => x.toFixed(1)).join(' ');
      top = `<g style="fill:none;stroke:var(--shu);stroke-width:.9;stroke-linecap:round;stroke-linejoin:round"><path d="M${pt(SH)} L${pt(j.el)} L${pt(j.wr)} L${pt(j.fist)}"/>`
        + [SH, j.el, j.wr, j.fist].map(v => `<circle cx="${v[0].toFixed(1)}" cy="${v[1].toFixed(1)}" r="1.2" style="fill:#fff;stroke:var(--shu);stroke-width:.7"/>`).join('') + '</g>';
    }
    return { p, j, trail, top };
  }

  /* ---------- the mochi's reaction: squash at the hit, held during the hit-stop, then a damped bounce ---------- */
  function mochiAt(t) {
    const hit = SEG[4].t0, after = SEG[4].t1;
    if (t < hit) return { sx: 1, sy: 1, face: 'calm' };
    if (t < after) return { sx: 1.07, sy: .88, face: 'ouch' };
    const tau = t - after, dy = -.12 * Math.exp(-tau / 150) * Math.cos(2 * Math.PI * tau / 300);
    return { sx: 1 - dy * .6, sy: 1 + dy, face: tau < 600 ? 'ouch' : 'teary' };
  }

  /* ---------- the hit check: is the board ever inside the mochi? where does it land? ---------- */
  let probe;
  function insideMochi(pw, m) {
    if (!probe) { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('width', 0); s.setAttribute('height', 0); s.style.position = 'absolute';
      s.innerHTML = `<path d="${MOCHI_BODY}"/>`; document.body.appendChild(s); probe = s.firstChild; }
    const lx = (pw[0] - MOCHI_AT[0]) / m.sx, ly = (pw[1] - MOCHI_AT[1]) / m.sy;
    const pt = probe.ownerSVGElement.createSVGPoint(); pt.x = lx; pt.y = ly; return probe.isPointInFill(pt);
  }
  function analyse() {
    const step = 1000 / 60, inside = [], path = [];
    for (let t = 0; t <= total() + .01; t += step) {
      const j = joints(t), m = mochiAt(t);
      const tip = toWorld(tipLocal(j), j); path.push(tip);
      // test the outer 40% of the board
      let hitIn = false;
      for (let f = .6; f <= 1.001; f += .1) { const q = [j.origin[0] + j.tipLen * f * j.d[0], j.origin[1] + j.tipLen * f * j.d[1]]; if (insideMochi(toWorld(q, j), m)) hitIn = true; }
      if (hitIn) inside.push({ t: Math.round(t), seg: j.s.zh });
    }
    const jh = joints(SEG[4].t0), tipH = toWorld(tipLocal(jh), jh), lx = tipH[0] - MOCHI_AT[0], ly = tipH[1] - MOCHI_AT[1];
    return { inside, path, hit: tipH, hitLocal: [lx, ly] };
  }

  /* ---------- Round 3.5: does the return land exactly on the hanging pose? (repeatable; numbers only) ---------- */
  function endCheck() {
    const segD = (p, a, b) => segDist(p, a, b);
    const polyDist = (p, Q, closed) => { let m = 1e9; for (let i = 0; i < Q.length - (closed ? 0 : 1); i++) m = Math.min(m, segD(p, Q[i], Q[(i + 1) % Q.length])); return m; };
    const haus = (A, B, closed) => Math.max(...A.map(p => polyDist(p, B, closed)), ...B.map(p => polyDist(p, A, closed)));
    const maxPt = (A, B) => Math.max(...A.map((q, i) => dist(q, B[i])));
    const tEnd = total(), FR = 1000 / 60, I = P.idle, Q = SK.idle, end = poseAt(tEnd), j = end.j, p = end.p;
    const fistIdle = I.hand.reduce((a, v) => [a[0] + v[0] / I.hand.length, a[1] + v[1] / I.hand.length], [0, 0]);
    const ref = { near: curve(I.near, 3000, true), line: curve(I.nearLine, 1500, false) };
    const lag = joints(tEnd - LAG);
    const joint = { elbow: dist(j.el, Q.elN), wrist: dist(j.wr, Q.wrN), fist: dist(j.fist, fistIdle), shoulder: 0 };
    const stickR = { origin: dist([p.stick.x, p.stick.y], [I.stick.x, I.stick.y]), rot: Math.abs(p.stick.rot - I.stick.rot), length: Math.abs(j.tipLen - (M.STICK.grip + M.STICK.blade)), stretch: Math.abs(j.stretch - 1) };
    const c = p.cuffO, ci = I.cuffO;
    const outline = { near: haus(p.near, ref.near, true), line: haus(p.nearLines[0], ref.line, false), hand: maxPt(p.hand, I.hand), handLine: maxPt(p.handLine, I.handLine),
      cuff: Math.max(Math.abs(c.cx - ci.cx), Math.abs(c.cy - ci.cy), Math.abs(c.rx - ci.rx), Math.abs(c.ry - ci.ry), Math.abs(c.r - ci.r)), wrist: p.skinW };
    const state = { lean: Math.abs(j.lean), sx: Math.abs(j.sx - 1), sy: Math.abs(j.sy - 1), tilt: Math.abs(j.tilt - 2), face: j.face, trail: end.trail === '' , impact: !!p.impact,
      extras: Math.max(0, ...p.extraLines.map(l => l.op)), armOverHead: j.s.id === 'swing', stickFront: stickFrontAt(j), lag: Math.max(dist(lag.el, j.el), dist(lag.wr, j.wr)), seg: j.s.id };
    // speeds across the boundary: units (and degrees) per 60 fps frame, for the last frames of the animation and the
    // first frame of the static idle that follows (which does not move: 0)
    const tip = t => { const q = joints(t); return tipLocal(q); };
    const speed = t => { const a = poseAt(t - FR), b = poseAt(t); return { t: Math.round(t), joints: Math.max(dist(a.j.el, b.j.el), dist(a.j.wr, b.j.wr), dist(a.j.fist, b.j.fist)),
      tip: dist(tip(t - FR), tip(t)), rot: Math.abs(b.j.rot - a.j.rot), sleeve: maxPt(a.p.near, b.p.near) }; };
    const S = SEG.find(x => x.id === 'return'), R2 = SEG.find(x => x.id === 'rest');
    const speeds = [S.t1 - 2 * FR, S.t1, R2.t0 + 3 * FR, tEnd].map(speed);
    const peak = (() => { let m = { joints: 0, tip: 0, rot: 0, sleeve: 0 }; for (let t = S.t0 + FR; t <= tEnd; t += FR) { const v = speed(t); for (const k in m) m[k] = Math.max(m[k], v[k]); } return m; })();
    return { tEnd, joint, stick: stickR, outline, state, speeds, peak };
  }

  /* ---------- views ---------- */
  // the keisaku's layer: over the mochi from the swing on; halfway through the return (when it is down by his side,
  // far from the mochi and the head) it goes back to the body layer, where the static hanging pose has it
  function stickFrontAt(j, legacy) {
    const u = (j.t - j.s.t0) / ((j.s.t1 - j.s.t0) || 1);
    if (legacy) return ['stop', 'follow', 'settle'].includes(j.s.id) || (j.s.id === 'swing' && u > .8) || (j.s.id === 'return' && u < .5);
    return ['swing', 'stop', 'follow', 'settle'].includes(j.s.id) || (j.s.id === 'return' && u < .5);
  }
  let views = 0;
  function makeView(el, vb) {
    el.innerHTML = `<svg viewBox="${vb}" style="display:block;width:100%;height:auto">${sceneMarkup()}<g class="ov"></g></svg>`;
    const s = el.querySelector('svg'); s.querySelector('#seatLip').setAttribute('opacity', 1); s.querySelector('#rack').setAttribute('opacity', 0);
    return { id: 'pv' + (++views), s, monk: s.querySelector('#monkSlot'), mochi: s.querySelector('#mochiSlot'), front: s.querySelector('#fxSlot'), ov: s.querySelector('.ov') };
  }
  function draw(view, t, opts) {
    const { p, j, trail, top } = poseAt(t, opts), m = mochiAt(t), id = view.id;
    // layering: the keisaku only comes up over the mochi for the end of the swing and after; while it passes over his
    // head it stays on the body layer, under the head, so it never covers his face
    const u = (j.t - j.s.t0) / ((j.s.t1 - j.s.t0) || 1);
    // opts.legacy = the 3.3 layering (board behind the head until the last 20% of the swing), kept for the comparison
    const swinging = !opts.legacy && j.s.id === 'swing';
    const stickFront = stickFrontAt(j, opts.legacy);
    const r = M.art({ id, poseObj: p, face: j.face, tilt: j.tilt, split: true, stickBack: !stickFront, armOverHead: swinging, frontUnder: trail, frontTop: top, fistLegacy: opts.fistLegacy });
    view.monk.innerHTML = `<g transform="translate(${MONK_AT[0]} ${MONK_AT[1]})">${r.back}</g>`;
    view.front.innerHTML = `<g transform="translate(${MONK_AT[0]} ${MONK_AT[1]})">${r.front}</g>`;
    view.mochi.innerHTML = `<g transform="translate(${MOCHI_AT[0]} ${MOCHI_AT[1]}) scale(${m.sx.toFixed(3)} ${m.sy.toFixed(3)})">${mochiStatic(m.face, true)}</g>`;
    view.ov.innerHTML = opts.trace ? opts.traceSvg : '';
    return j;
  }

  window.KEISAKU_ANIM = { stickFrontAt: t => stickFrontAt(joints(t)), T, build, total, SEG: () => SEG, joints, poseAt, mochiAt, analyse, makeView, draw, toWorld, tipLocal, MONK_AT, MOCHI_AT, KK, SH, LAG, curve, NEAR_N, LINE_N, endCheck };
})();
