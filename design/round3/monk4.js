/* =====================================================================
   住持 Round 3 — "Cozy Storybook Monk".

   Shape language: like the mochi — every body shape is a smooth spline through a few points.
   The sleeves ARE the sides of the silhouette: they fall from soft shoulders and make the drop shape,
   so the outline is the same in every pose. A pose only changes what happens inside it: where the hands
   are, how the near sleeve folds, where the keisaku is.
   The outer contour is a single silhouette copy drawn behind. Inside, only a few thin lines, each with a
   job: which sleeve is in front, where a hand comes out, where the collar crosses.
   Feet at y = 0, facing right (three-quarter). Facing left mirrors everything except the collar, which is
   re-laid so the wearer's left panel stays on top.
   ===================================================================== */
(function () {
  const f = n => (+n).toFixed(2);
  function spline(pts, closed = true) {
    const n = pts.length, P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + (closed ? ' Z' : '');
  }
  function ribbon(pts, w0, w1) {   // a hand-drawn band that tapers from w0 to w1
    const n = pts.length, A = [], B = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const w = (w0 + (w1 - w0) * i / (n - 1)) / 2;
      A.push([pts[i][0] - dy / len * w, pts[i][1] + dx / len * w]); B.push([pts[i][0] + dy / len * w, pts[i][1] - dx / len * w]);
    }
    return spline(A, false) + ' L' + spline(B.reverse(), false).slice(1) + ' Z';
  }

  /* ---------- shared proportions (scheme B): every pose uses these ---------- */
  const HEAD = 'M2 -94 C-9 -94 -17.5 -86 -17.5 -75 C-17.5 -66 -13 -59 -6 -56.2 C-1 -54.4 6 -54.2 11 -55.4 C17 -57 21.5 -62 22.2 -68.5 C23 -76 21.5 -84 16 -89.5 C12 -92.8 7 -94 2 -94 Z';
  const HEAD_LOWER = 'M-17.5 -75 C-17.5 -66 -13 -59 -6 -56.2 C-1 -54.4 6 -54.2 11 -55.4 C17 -57 21.5 -62 22.2 -68.5';
  const EAR = 'M-14.4 -76.6 C-17.6 -76.6 -18.8 -73.4 -18.4 -70.8 C-18 -68 -16 -66.4 -13.8 -66.8 C-12.6 -68.6 -12.4 -73.6 -14.4 -76.6 Z';
  const FEET = { far: [[6, -1.6], [10.6, -4.2], [16.2, -3.6], [18.4, -1], [15.8, 1.2], [9.6, 1.4]], near: [[-12.4, -1], [-8.4, -4.2], [-2.2, -3.8], [1.6, -0.8], [-1.2, 1.6], [-8.2, 1.8]] };
  // robe: soft shoulders under the chin, the torso the sleeves wrap, a skirt that settles on the feet.
  // The sleeves end a little above the knees and stand out past the skirt: that small step is what makes
  // the arms read even in pure silhouette.
  const ROBE = [[3, -61], [-9, -60.2], [-13, -55.8], [-16, -48], [-17.6, -36], [-18.4, -24], [-19, -14], [-20.6, -6], [-21.4, -2.6], [-13, -0.4], [2, 1], [15, 0], [21, -3], [20.6, -8], [19.8, -16], [19.2, -26], [18.4, -38], [16.4, -48], [13, -55], [8.6, -60.4]];
  // the sleeves' outer edges are the same in every pose; only the inner side changes
  const NEAR_OUT = [[-12.6, -55.6], [-17.6, -50], [-22.6, -40], [-25.6, -28], [-26.4, -19.4], [-24.6, -15.2]];
  const FAR_OUT = [[12.4, -55.4], [17.6, -50.4], [22.8, -40], [26, -28], [26.6, -19.4], [24.8, -15.4]];
  const FAR_STAND = FAR_OUT.concat([[20, -14.6], [15.6, -15.4], [14.4, -20], [14.4, -32], [13.6, -46]]);
  const FAR_HAND = [[18.4, -17.2], [22.6, -17.2], [24.4, -13.6], [22.6, -10.4], [18.8, -10.6], [17.4, -13.8]];

  const POSE = {
    stand: {   // arms relaxed: each hand peeks out of the front of its sleeve
      near: NEAR_OUT.concat([[-19, -14.2], [-13.2, -14.8], [-10, -18], [-9, -27], [-10.8, -38], [-12, -48]]),
      nearLine: [[-12, -44], [-10.2, -35], [-9, -26], [-9.8, -19], [-12.8, -15], [-19.6, -14.2], [-24.6, -15.2]],
      hand: [[-15.6, -17.4], [-11.2, -17.8], [-9, -14.4], [-10.6, -11], [-14.8, -11], [-16.6, -14]],
      handLine: [[-12.6, -16.4], [-11.6, -14], [-12.6, -11.8]],
      far: FAR_STAND, farBehind: true, farHand: FAR_HAND,
    },
    tuck: {    // hands folded into the sleeves in front of the belly; the sleeves overlap softly and hang the same way
      near: NEAR_OUT.concat([[-19, -14.2], [-9, -14.6], [0, -15.6], [6.6, -17.4], [10.6, -21], [10.4, -26.2], [6.4, -29.6], [-2.4, -30], [-9.6, -31.6], [-11.6, -39], [-12, -48]]),
      nearLine: [[-12, -43], [-10.6, -34], [-6.4, -30.4], [1.6, -29.8], [7.4, -28.6], [10.6, -24.6], [9.6, -19.6], [5.2, -16.8], [-2, -15.4], [-12, -14.4], [-19.6, -14.2], [-24.6, -15.2]],
      far: FAR_STAND, farBehind: true,
      // the far forearm comes forward in front of the belly and goes into the near sleeve
      farFront: [[6.4, -29.6], [13.4, -31.4], [20.6, -32], [25, -29], [26.4, -22.4], [24.8, -16.4], [18.4, -15.4], [10.6, -16.4], [6, -19]],
      farLine: [[10.8, -30.8], [16.6, -31.8], [21.6, -31.2], [24.8, -28.8]],
      farLine2: [[24.6, -16.6], [19.4, -15.4], [12.4, -16]],
    },
    idle: {    // the keisaku hangs from the near hand at the waist, blade down and a little back
      near: NEAR_OUT.concat([[-19, -14.2], [-13.4, -14.8], [-11.4, -18.6], [-10.8, -24.6], [-10.6, -30], [-11.6, -40], [-12, -48]]),
      nearLine: [[-12, -43], [-10.8, -34], [-10.6, -27.4], [-11.2, -21], [-12.6, -16.4], [-15.4, -14.4], [-19.6, -14.2], [-24.6, -15.2]],
      cuffO: { cx: -11.6, cy: -24.8, rx: 1.9, ry: 3.9, r: -8 },
      hand: [[-11.6, -28.2], [-7.4, -28.6], [-5.2, -25.2], [-6.8, -21.8], [-10.8, -21.6], [-12.6, -24.6]],
      handLine: [[-8.8, -27.2], [-7.8, -24.8], [-8.8, -22.6]],
      far: FAR_STAND, farBehind: true, farHand: FAR_HAND,
      stick: { x: -7.6, y: -28.4, rot: 204 },
    },
    ready: {   // raised a little, beside the near shoulder: the moment before he means it
      near: NEAR_OUT.concat([[-19, -14.2], [-13.4, -14.8], [-11.6, -18], [-11.2, -27], [-11.6, -36], [-12.2, -42], [-12.6, -48]]),
      nearLine: [[-12.2, -41.6], [-11.4, -33], [-11.4, -24], [-12.4, -17.2], [-15, -14.8], [-19.6, -14.2], [-24.6, -15.2]],
      tube: [[-18.8, -41.2], [-21.4, -35], [-23.4, -28.4]],
      cuffO: { cx: -15.8, cy: -40.4, rx: 3.8, ry: 1.6, r: -4 },
      hand: [[-18.6, -48], [-14.4, -48.6], [-12.2, -45.2], [-13.8, -41.8], [-17.8, -41.6], [-19.6, -44.6]],
      handLine: [[-15.8, -47.2], [-14.8, -44.8], [-15.8, -42.6]],
      far: FAR_STAND, farBehind: true, farHand: FAR_HAND,
      stick: { x: -15.2, y: -41.4, rot: -14 },
    },

    /* ---- posture fix (Round 3.1): the arm is placed first, the sleeve follows it ----
       shoulder joints stay where the torso has them; elbows, forearms and wrists move with the pose,
       and the sleeves' outline is allowed to change with them. */
    tuck2: {   // both forearms folded across the belly, each hand inside the other sleeve; shoulders down, elbows relaxed
      v2: true,
      farBack: [[12.4, -55.4], [17.8, -50.6], [22.4, -42], [25.4, -34.4], [24.6, -29.6], [19.6, -30.4], [15, -34], [13.6, -46]],
      // the far forearm: from its elbow at the front of the belly toward the middle; its sleeve hangs below it, lowest under the elbow
      farFront: [[7.6, -29.4], [13, -31], [18.4, -33.2], [22.6, -35], [25.8, -31.8], [26.9, -25.4], [26.2, -19], [23.2, -14.6], [17.6, -13.2], [11.4, -14], [6.8, -16.2]],
      farLines: [[[8.6, -29.6], [13, -31], [18.4, -33.2], [22.4, -34.8]], [[26, -18.6], [22.8, -14.4], [17.4, -13.2], [11.4, -14]]],
      // the near arm: upper arm hangs by the side, the elbow bends forward, the forearm crosses in front and its cuff rests over the far forearm
      near: [[-12.6, -55.6], [-17.6, -50.2], [-22.4, -41], [-24.8, -33.4], [-25.6, -27], [-25, -20], [-22.6, -14.6], [-17.6, -12.4], [-9, -13.2], [-0.6, -15], [5.6, -17.6], [9.4, -21.4], [9.4, -26.2], [6.4, -29.6], [0, -30.2], [-7, -31], [-11.4, -32.8], [-12.6, -38], [-12.4, -48]],
      nearLines: [
        [[-12.2, -43], [-12, -36.4], [-10.8, -32.2], [-6.4, -30.8], [0, -30.2], [6.4, -29.6], [9.4, -26.2], [9.4, -21.4], [5.6, -17.6], [-0.6, -15], [-9, -13.2], [-17.6, -12.4], [-22.6, -14.6]],
      ],
      folds: [[[-12.4, -31.2], [-15.2, -26.6], [-15.8, -21.4]]],   // the one fold: where the sleeve turns at the elbow
      cuffO: { cx: 8.2, cy: -24.4, rx: 1.2, ry: 4.4, r: -8 },
    },
    ready2: {  // shoulder → elbow out and down → forearm up and a little forward → wrist cocked along the grip → keisaku
      v2: true,
      far: FAR_STAND, farBehind: true, farHand: FAR_HAND,
      // the sleeve follows the arm: the elbow pushes it out, the bag hangs straight down from the raised forearm and is shorter
      near: [[-12.6, -55.6], [-17.6, -50.6], [-23.6, -45], [-28.4, -38.6], [-30.6, -33], [-29.8, -26.6], [-27.4, -20.8], [-22.8, -18.6], [-18.6, -20.4], [-16.6, -25], [-17.4, -30.4], [-20.1, -35.9], [-25.9, -39.5], [-21.4, -43.6], [-16, -46.6], [-12.8, -50.4]],
      nearLines: [
        [[-20.1, -35.9], [-17.4, -30.4], [-16.6, -25], [-18.6, -20.4], [-22.8, -18.6], [-27.4, -20.8]],   // forearm underside → the bag hanging from it
      ],
      folds: [[[-25, -31.4], [-24.4, -26.6], [-23.2, -22.4]]],   // the bag hangs from the elbow
      cuffO: { cx: -23, cy: -37.7, rx: 3.6, ry: 1.5, r: 32 },
      skin: [[-21.2, -36.6], [-24.8, -38.8], [-22.4, -42.7], [-18.8, -40.5]],   // the wrist shows where the sleeve has slid back
      hand: [[-21.8, -46.8], [-17.6, -47.6], [-15.6, -44.6], [-16.6, -41], [-20.6, -40.6], [-22.6, -43.6]],
      handLine: [[-18.4, -46.8], [-17.4, -44.4], [-18.6, -41.8]],
      stick: { x: -17.1, y: -41.1, rot: -34 },
    },
  };

  /* the keisaku: a short round grip with a binding, then a long flat board that widens a little toward a
     squared, softly rounded end. We see its broad face; a thin darker strip along one edge gives it thickness. */
  const STICK = { grip: 7, blade: 23, w0: 4.6, w1: 7.6 };
  function stick(s, c, line, sil) {
    const g = STICK.grip, b = STICK.blade, e = g + b, h0 = STICK.w0 / 2, h1 = STICK.w1 / 2;
    const board = `M${-h0} ${-g} L${h0} ${-g} L${h1} ${-e + 1.8} Q${h1} ${-e} ${h1 - 1.8} ${-e} L${-h1 + 1.8} ${-e} Q${-h1} ${-e} ${-h1} ${-e + 1.8} Z`;
    return `<g transform="translate(${s.x} ${s.y}) rotate(${s.rot})">
      <rect x="-1.25" y="${-g - .4}" width="2.5" height="${g + 2.4}" rx="1.25" style="fill:${c.grip};stroke:${line};stroke-width:1"/>
      <path d="${board}" style="fill:${c.blade};stroke:${line};stroke-width:1.1;stroke-linejoin:round"/>
      ${sil ? '' : `<path d="M${h0 - 1} ${-g} L${h1 - 1.1} ${-e + 1.6}" style="stroke:${c.edge};stroke-width:1.6;stroke-linecap:round;opacity:.7"/>`}
      <rect x="-2.6" y="${-g - .6}" width="5.2" height="2" rx=".8" style="fill:${c.band};stroke:${line};stroke-width:.7"/>
    </g>`;
  }

  /* ---------- the three silhouette directions (same head, same feet) ---------- */
  const SCHEME = {
    A: { name: '圓潤鐘形', robe: [[3, -61], [-9, -60.2], [-12.6, -56], [-15, -48], [-16.4, -36], [-18.6, -22], [-23.6, -9], [-27.4, -2.6], [-16, 0.6], [2, 1.6], [18, 0.6], [28, -2.8], [24.4, -9], [20.4, -22], [18, -36], [15.6, -48], [12.8, -55], [8.6, -60.4]],
         sleeve: ([x, y]) => [x * 0.84, y], headDy: 0 },
    B: { name: '柔和水滴形', robe: null, sleeve: p => p, body: p => p, headDy: 0 },
    C: { name: '短胖梯形', robe: null, sleeve: ([x, y]) => [x * 1.1, y * 0.84], body: ([x, y]) => [x * 1.14, y * 0.84], headDy: 9.4 },
  };

  const ink = 'var(--line)';
  const L = (d, w = 1.1, op = 1) => `<path d="${d}" style="fill:none;stroke:${ink};stroke-width:${w};stroke-linecap:round;stroke-linejoin:round;opacity:${op}"/>`;

  function silhouette(o) {
    const S = SCHEME[o.scheme], p = POSE[o.pose], TS = pts => pts.map(S.sleeve), TB = pts => pts.map(S.body || S.sleeve);
    const robe = S.robe || TB(ROBE);
    let s = `<path d="${spline(robe)}"/><path d="${spline(TB(FEET.far))}"/><path d="${spline(TB(FEET.near))}"/>`;
    s += `<path d="${spline(TS(p.near))}"/>` + (p.far ? `<path d="${spline(TS(p.far))}"/>` : '') + (p.farBack ? `<path d="${spline(TS(p.farBack))}"/>` : '') + (p.skin ? `<path d="${spline(TS(p.skin))}"/>` : '');
    if (p.farFront) s += `<path d="${spline(TS(p.farFront))}"/>`;
    if (p.hand) s += `<path d="${spline(TS(p.hand))}"/>`;
    if (p.farHand) s += `<path d="${spline(TS(p.farHand))}"/>`;
    if (p.stick) { const [x, y] = S.sleeve([p.stick.x, p.stick.y]); s += stick({ ...p.stick, x, y }, { grip: '#2a2420', blade: '#2a2420', band: '#2a2420' }, '#2a2420', 1); }
    s += `<g transform="translate(0 ${S.headDy})"><path d="${HEAD}"/><path d="${EAR}"/></g>`;
    return `<g style="fill:#2a2420">${s}</g>`;
  }

  /* ---------- faces: v2's face kept; four moods for the "gentle → suddenly serious → gentle" beat ---------- */
  const eyeDot = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" style="fill:${ink}"/>`;
  const BROW = {
    kind:   ['M4.4 -77.4 C5.6 -80.4 9.6 -81 11.4 -78.6 C10 -77.6 6.6 -77 4.4 -77.4 Z', 'M14.4 -78.4 C15.6 -80.8 18.8 -80.8 20 -78.4 C18.8 -77.6 16 -77.4 14.4 -78.4 Z'],
    notice: ['M4.2 -79.6 C5.6 -82.8 9.8 -83.2 11.6 -80.8 C10 -79.8 6.6 -79.2 4.2 -79.6 Z', 'M14.4 -78.4 C15.6 -80.8 18.8 -80.8 20 -78.4 C18.8 -77.6 16 -77.4 14.4 -78.4 Z'],
    stern:  ['M4.8 -79.8 C7 -80.8 10.4 -79.6 12 -76.6 C9.6 -76.4 6.6 -77.4 4.8 -79.8 Z', 'M13.4 -76.8 C14.8 -79.4 18 -80.4 19.8 -79.6 C18.4 -77.4 15.8 -76.6 13.4 -76.8 Z'],
    relief: ['M4.6 -78 C5.8 -81 9.8 -81.4 11.4 -79 C10 -78 6.8 -77.6 4.6 -78 Z', 'M14.4 -79 C15.6 -81.4 18.8 -81.2 20 -78.8 C18.8 -78 16 -77.8 14.4 -79 Z'],
  };
  const FACE = {
    kind:   () => eyeDot(8.4, -72.6, 1.9, 2.3) + eyeDot(16.6, -72.6, 1.6, 2.2) + L('M11.4 -64 q2.6 2 5 -.2', 1.4),
    notice: () => eyeDot(9.4, -72.8, 2, 2.6) + eyeDot(17.4, -72.8, 1.7, 2.4) + `<circle cx="10" cy="-73.6" r=".6" style="fill:#fff"/><circle cx="17.9" cy="-73.6" r=".5" style="fill:#fff"/>` + L('M12.4 -63.8 q1.6 .6 3.2 0', 1.3),
    stern:  () => eyeDot(8.6, -72.2, 1.9, 1.8) + eyeDot(16.8, -72.2, 1.6, 1.7) + L('M11.6 -63.6 h4.8', 1.5),
    relief: () => L('M6.2 -72.2 q2.2 -2.8 4.4 0 M14.6 -72.2 q2 -2.6 4 0', 1.5) + L('M10.8 -64.6 q3.2 2.8 6.4 -.4', 1.4),
  };
  const BLUSH = { kind: .6, notice: .4, stern: .25, relief: .9 };
  const brow = d => `<path d="${d}" style="fill:#f6f1e6;stroke:${ink};stroke-width:1;stroke-linejoin:round"/>`;

  const ART = { robe: 'var(--robe)', robeLo: 'var(--robe-lo)', band: '#2b395e', white: '#f6f2e8', neck: 'var(--skin-lo)', skin: 'var(--skin)', kesa: 'var(--kesa)', foot: '#f2ede2', grip: '#8a6240', blade: '#d8b177', edge: '#a27a48', bandC: '#5e3d22' };

  /* full colour (scheme B): o = { id, pose, face, facing, lines (false = no inner lines), shadow } */
  function art(o) {
    const p = POSE[o.pose], face = o.face || 'kind', left = o.facing === 'left', id = o.id, lines = o.lines !== false;
    const fill = (d, c, s) => `<path class="m4p" d="${d}" style="--c:${c}" ${s ? 'data-s="1"' : ''}/>`;
    const det = s => `<g class="m4det">${s}</g>`;
    const Ln = (pts, w = 1.15, op = 1) => lines ? L(spline(pts, false), w, op) : '';
    const out = [];
    if (p.farBehind) out.push(fill(spline(p.far), ART.robe) + (p.farHand ? fill(spline(p.farHand), ART.skin, 1) : ''));
    if (p.farBack) out.push(fill(spline(p.farBack), ART.robe));
    out.push(fill(spline(FEET.far), ART.foot) + fill(spline(FEET.near), ART.foot) + det(lines ? L('M1.6 -0.8 C1.6 1 -1 1.6 -4 1.7', .9, .5) : ''));
    out.push(fill(spline(ROBE), ART.robe));
    // one soft shade low on the robe, the side away from the window
    // the upper panel's edge: one quiet line from under the rakusu to the hem
    out.push(det(Ln(left ? [[11.2, -36], [12.4, -22], [12.8, -3.4]] : [[0.6, -36], [-0.4, -22], [-0.8, -3]], 1, .45)));
    // collar: neck in the V, a thin white under-collar, the dark collar (the wearer's left on top), standing up at the nape
    const near = [[-13.6, -59.6], [-9, -56.8], [-3.6, -53.8], [2.4, -48.8], [6.2, -45]], far = [[12.8, -58.4], [10.6, -54.2], [7.8, -48.6], [5.8, -44]];
    const nearB = `<path d="${ribbon(near, 7.6, 3.2)}" style="fill:${ART.band}"/>`, farB = `<path d="${ribbon(far, 3, 2.8)}" style="fill:${ART.band}"/>`;
    const edge = (pts, sideSign, w) => pts.map((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [q[0] + sideSign * dy / l * w, q[1] - sideSign * dx / l * w]; });
    out.push(det(`<g clip-path="url(#${id}-robe)">
      <path d="${spline([[-4, -56], [1.4, -51], [5.8, -46.4], [9.8, -52.6], [12, -57], [4, -58.6]])}" style="fill:${ART.neck}"/>
      <path d="${ribbon([[-3, -55.6], [1.6, -51], [5.6, -46.2]], 1.8, 1.2)}" style="fill:${ART.white}"/>
      <path d="${ribbon([[11.4, -56.6], [9.4, -52], [6.6, -46.4]], 1.6, 1.1)}" style="fill:${ART.white}"/>
      ${left ? farB + nearB : nearB + farB}
      ${lines ? (left ? L(spline(edge(far.slice(1), -1, 1.4), false), .8, .6) + L(spline(edge(near.slice(2), 1, 1.6), false), .9, .75)
                      : L(spline(edge(near.slice(2), 1, 1.6), false), .8, .6) + L(spline(edge(far.slice(1), -1, 1.4), false), .9, .75)) : ''}
    </g>`));
    // rakusu: a small panel hanging from the crossing (its cords go up under the collar)
    out.push(det(`<path d="${spline([[-0.6, -44.6], [6.6, -45.4], [14, -44.4], [14.4, -39.4], [13.6, -35.4], [6.4, -34.8], [-0.4, -35.6], [-1.2, -40]])}" style="fill:${ART.kesa};stroke:${ink};stroke-width:1.1"/>
      ${lines ? `<path d="${spline([[1.4, -42.8], [6.6, -43.4], [12, -42.6], [12.2, -39.6], [11.6, -37.2], [6.4, -36.8], [1.6, -37.4], [1, -40]])}" style="fill:none;stroke:${ART.bandC};stroke-width:.7;opacity:.55"/>` : ''}`));
    if (p.farFront && !p.v2) out.push(fill(spline(p.farFront), ART.robe) + det(Ln(p.farLine) + Ln(p.farLine2)));
    if (p.v2) {
      if (p.farFront) out.push(fill(spline(p.farFront), ART.robe) + det(p.farLines.map(l => Ln(l)).join('')));
      out.push(fill(spline(p.near), ART.robe) + det(p.nearLines.map(l => Ln(l)).join('') + (p.folds || []).map(l => Ln(l, .85, .45)).join('')));
      if (p.cuffO) out.push(det(`<ellipse cx="${p.cuffO.cx}" cy="${p.cuffO.cy}" rx="${p.cuffO.rx}" ry="${p.cuffO.ry}" transform="rotate(${p.cuffO.r} ${p.cuffO.cx} ${p.cuffO.cy})" style="fill:#26345a;stroke:${ink};stroke-width:1"/>`));
      if (p.skin) out.push(fill(spline(p.skin), ART.skin, 1));
      if (p.stick) out.push(det(stick(p.stick, { ...ART, band: ART.bandC }, ink)));
      if (p.hand) out.push(fill(spline(p.hand), ART.skin, 1) + det(Ln(p.handLine, .8, .55)));
    }
    if (p.v2) {}
    else if (o.pose === 'idle' || o.pose === 'ready') out.push(fill(spline(p.near), ART.robe) + det(Ln(p.nearLine) + (p.tube ? Ln(p.tube, 1.1) : '') + (p.cuffO ? `<ellipse cx="${p.cuffO.cx}" cy="${p.cuffO.cy}" rx="${p.cuffO.rx}" ry="${p.cuffO.ry}" transform="rotate(${p.cuffO.r} ${p.cuffO.cx} ${p.cuffO.cy})" style="fill:#26345a;stroke:${ink};stroke-width:1"/>` : '')) + det(stick(p.stick, { ...ART, band: ART.bandC }, ink)) + fill(spline(p.hand), ART.skin, 1) + det(Ln(p.handLine, .8, .55)));
    else out.push((p.hand ? fill(spline(p.hand), ART.skin, 1) + det(Ln(p.handLine, .8, .55)) : '') + fill(spline(p.near), ART.robe) + det(Ln(p.nearLine)));
    // head (v2)
    out.push(`<g transform="rotate(${o.tilt ?? 2} 3 -56)">` + fill(HEAD, ART.skin) + det(`<g clip-path="url(#${id}-head)"><path d="M-6 -95 C-15 -88 -17 -74 -13 -64 C-10 -58.6 -6 -56 -1 -54.6 L-30 -50 L-30 -100 Z" style="fill:var(--skin-lo);opacity:.5"/></g>` + L(HEAD_LOWER, 1.25))
      + fill(EAR, ART.skin, 1) + det(L('M-15 -74 q-2 1.8 -.4 4.4', .9, .55) + '<path d="M-7.4 -88.6 q5 -4.2 11 -4.6" style="fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;opacity:.5"/>'
      + `<ellipse cx="5.6" cy="-66.4" rx="3.6" ry="2" style="fill:var(--blush);opacity:${BLUSH[face]}"/><ellipse cx="19.6" cy="-66.2" rx="1.8" ry="1.6" style="fill:var(--blush);opacity:${BLUSH[face]}"/>`
      + FACE[face]() + BROW[face].map(brow).join('')) + '</g>');
    const flip = left ? ' transform="scale(-1 1)"' : '';
    return `<g class="m4" id="${id}">
      <defs><clipPath id="${id}-robe"><path d="${spline(ROBE)}"/></clipPath><clipPath id="${id}-head"><path d="${HEAD}"/></clipPath><g id="${id}-art">${out.join('')}</g></defs>
      ${o.shadow !== false ? '<ellipse cx="1" cy="1.4" rx="27" ry="4.2" class="m4shadow"/>' : ''}
      <g${flip}><use href="#${id}-art" class="m4-sil"/><use href="#${id}-art"/></g>
    </g>`;
  }

  const SKELETON = {
    tuck2: { shN: [-15, -48], elN: [-19.6, -29.6], wrN: [4.4, -24.4], hdN: [8.4, -23.6], shF: [13.5, -49], elF: [22, -31.6], wrF: [1.6, -25.6], hdF: [-2.4, -25] },
    ready2: { shN: [-15, -48], elN: [-26, -33], wrN: [-20.6, -41.6], hdN: [-19.1, -44], shF: [13.5, -49], elF: [18, -31], wrF: [20.6, -16.8], hdF: [21, -13.8] },
  };
  window.MONK4 = { silhouette, art, SCHEME, POSE, spline, stick, STICK, SKELETON };
})();
