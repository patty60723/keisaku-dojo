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
   ===================================================================== */
(function () {
  'use strict';
  const M = MONK4, P = M.POSE, SK = M.SKELETON;
  const SH = [-15, -48], TORSO = [[-13.2, -57.4], [-12.4, -46]];
  const MONK_AT = [132, 254], MOCHI_AT = [206, 257];
  const R = Math.PI / 180;
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / R;
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dir = a => [Math.cos(a * R), Math.sin(a * R)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpP = (A, B, t) => A.map((q, i) => [lerp(q[0], B[i][0], t), lerp(q[1], B[i][1], t)]);
  const unwrap = (prev, a) => { while (a - prev > 180) a -= 360; while (a - prev < -180) a += 360; return a; };
  function resample(pts, n, closed) {
    const Q = closed ? [...pts, pts[0]] : pts, L = [0];
    for (let i = 1; i < Q.length; i++) L.push(L[i - 1] + dist(Q[i - 1], Q[i]));
    const T = L[L.length - 1], out = [];
    for (let k = 0; k < n; k++) {
      const d = closed ? T * k / n : T * k / (n - 1); let i = 1; while (i < L.length - 1 && L[i] < d) i++;
      const u = (d - L[i - 1]) / ((L[i] - L[i - 1]) || 1); out.push([lerp(Q[i - 1][0], Q[i][0], u), lerp(Q[i - 1][1], Q[i][1], u)]);
    }
    return out;
  }
  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  const frame = (p0, p1) => { const L = dist(p0, p1) || 1, e = [(p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L]; return { p0, L, e, n: [-e[1], e[0]] }; };
  const toLocal = (P, f) => { const d = [P[0] - f.p0[0], P[1] - f.p0[1]]; return [(d[0] * f.e[0] + d[1] * f.e[1]) / f.L, d[0] * f.n[0] + d[1] * f.n[1]]; };
  const fromLocal = ([u, v], f) => [f.p0[0] + f.e[0] * u * f.L + f.n[0] * v, f.p0[1] + f.e[1] * u * f.L + f.n[1] * v];

  /* ---------- key poses, as data ---------- */
  const KEYS = { ready3: { face: 'stern', tilt: 4 }, windup: { face: 'stern', tilt: 2 }, strike: { face: 'stern', tilt: 6 }, follow: { face: 'calm', tilt: 3 } };
  let prev = null;
  for (const k of ['ready3', 'windup', 'strike', 'follow']) {
    const q = SK[k], pz = P[k], el = q.elN, wr = q.wrN;
    const hc = pz.hand.reduce((a, v) => [a[0] + v[0] / pz.hand.length, a[1] + v[1] / pz.hand.length], [0, 0]);
    const fist = pz.fist || hc;
    let a1 = ang(SH, el), a2 = ang(el, wr), sr = (pz.stick.rot - 90) - a2;
    if (prev) { a1 = unwrap(prev.a1, a1); a2 = unwrap(prev.a2, a2); sr = unwrap(prev.sr, sr); }
    const u = dir(a2), c = pz.cuffO;
    const key = Object.assign(KEYS[k], {
      name: k, a1, a2, sr, L1: dist(SH, el), L2: dist(el, wr), fd: dist(wr, fist), fa: ang(wr, fist) - a2,
      cf: ((c.cx - el[0]) * u[0] + (c.cy - el[1]) * u[1]) / dist(el, wr),
      stretch: pz.stick.stretch || 1, lean: pz.lean || 0, sx: pz.sx || 1, sy: pz.sy || 1,
      hand: pz.hand.map(v => [v[0] - fist[0], v[1] - fist[1]]), handLine: pz.handLine.map(v => [v[0] - fist[0], v[1] - fist[1]]),
    });
    // bind the sleeve outline and its lines to this key's own skeleton
    const fu = frame(SH, el), ff = frame(el, wr);
    const bind = pts => pts.map(Pt => {
      const dT = segDist(Pt, TORSO[0], TORSO[1]), dU = segDist(Pt, SH, el), dF = segDist(Pt, el, wr);
      const w = [1 / (dT * dT + 1), 1 / (dU * dU + 1), 1 / (dF * dF + 1)], s = w[0] + w[1] + w[2];
      return { P: Pt, w: w.map(x => x / s), lu: toLocal(Pt, fu), lf: toLocal(Pt, ff), bag: Math.min(dU, dF) > 6.5 };
    });
    key.near = bind(resample(pz.near, 48, true));
    key.line0 = bind(resample(pz.nearLines[0], 16, false));
    key.extras = pz.nearLines.slice(1).concat(pz.folds || []).map(l => bind(l));
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
  const T = { pre: 200, windup: 340, hold: 160, swing: 90, stop: 135, follow: 260, post: 460 };
  let SEG = [];
  function build() {
    const plan = [['pre', '舉起', 'ready3', 'ready3', 'lin'], ['windup', '預備', 'ready3', 'windup', 'inOut'], ['hold', '停頓', 'windup', 'windupPlus', 'sine'],
      ['swing', '揮下', 'windupPlus', 'strike', 'in'], ['stop', '命中停格', 'strike', 'strike', 'lin'], ['follow', '收勢', 'strike', 'follow', 'out'], ['post', '收勢（停）', 'follow', 'follow', 'lin']];
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
    return { t, s, A, B, e, el, wr, fist, a2, rot, d, stretch, origin: [fist[0] - 3.5 * d[0], fist[1] - 3.5 * d[1]],
      tipLen: M.STICK.grip + M.STICK.blade * stretch, lean: lerp(A.lean, B.lean, e), sx: lerp(A.sx, B.sx, e), sy: lerp(A.sy, B.sy, e),
      face: e < .5 ? A.face : B.face, tilt: lerp(A.tilt, B.tilt, e) };
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
    const blend = (key) => lerpP(skin(A[key], j, lag), skin(B[key], j, lag), e);
    const c = [lerp(j.el[0], j.wr[0], lerp(A.cf, B.cf, e)), lerp(j.el[1], j.wr[1], lerp(A.cf, B.cf, e))], n = dir(j.a2 + 90);
    const hand = lerpP(A.hand, B.hand, e).map(v => [v[0] + j.fist[0], v[1] + j.fist[1]]);
    const handLine = lerpP(A.handLine, B.handLine, e).map(v => [v[0] + j.fist[0], v[1] + j.fist[1]]);
    const extraLines = A.extras.map(l => ({ pts: skin(l, j, lag), op: 1 - e })).concat(B.extras.map(l => ({ pts: skin(l, j, lag), op: e })));
    const p = {
      v2: true, far: P.stand.far, farBehind: true, farHand: P.stand.farHand,
      near: blend('near'), nearLines: [blend('line0')], extraLines,
      cuffO: { cx: c[0], cy: c[1], rx: 1.4, ry: 3.3, r: j.a2 },
      skin: [[c[0] + 2 * n[0], c[1] + 2 * n[1]], [c[0] - 2 * n[0], c[1] - 2 * n[1]], [j.wr[0] - 2 * n[0], j.wr[1] - 2 * n[1]], [j.wr[0] + 2 * n[0], j.wr[1] + 2 * n[1]]],
      hand, handLine, stick: { x: j.origin[0], y: j.origin[1], rot: j.rot, stretch: j.stretch },
      lean: j.lean, sx: j.sx, sy: j.sy, impact: j.s.id === 'stop',
    };
    // motion trail: the tip's last 70 ms, only while it is fast
    let trail = '';
    if (j.s.id === 'swing' || j.s.id === 'stop') {
      const pts = []; for (let k = 0; k <= 10; k++) pts.push(tipLocal(joints(Math.max(SEG[3].t0, j.t - 70 + 7 * k))));
      const mid = pts.map(q => q.map(v => v.toFixed(1)).join(' ')).join(' L');
      trail = `<path d="M${mid}" style="fill:none;stroke:#fffaf0;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;opacity:.5"/>`;
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

  /* ---------- views ---------- */
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
    const stickFront = ['stop', 'follow', 'post'].includes(j.s.id) || (j.s.id === 'swing' && u > .8);
    const r = M.art({ id, poseObj: p, face: j.face, tilt: j.tilt, split: true, stickBack: !stickFront, frontUnder: trail, frontTop: top });
    view.monk.innerHTML = `<g transform="translate(${MONK_AT[0]} ${MONK_AT[1]})">${r.back}</g>`;
    view.front.innerHTML = `<g transform="translate(${MONK_AT[0]} ${MONK_AT[1]})">${r.front}</g>`;
    view.mochi.innerHTML = `<g transform="translate(${MOCHI_AT[0]} ${MOCHI_AT[1]}) scale(${m.sx.toFixed(3)} ${m.sy.toFixed(3)})">${mochiStatic(m.face, true)}</g>`;
    view.ov.innerHTML = opts.trace ? opts.traceSvg : '';
    return j;
  }

  window.KEISAKU_ANIM = { stickFrontAt: t => { const j = joints(t), u = (j.t - j.s.t0) / ((j.s.t1 - j.s.t0) || 1); return ['stop', 'follow', 'post'].includes(j.s.id) || (j.s.id === 'swing' && u > .8); }, T, build, total, SEG: () => SEG, joints, poseAt, mochiAt, analyse, makeView, draw, toWorld, tipLocal, MONK_AT, MOCHI_AT };
})();
