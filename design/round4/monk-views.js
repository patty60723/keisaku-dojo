/* =====================================================================
   Round 4.2A — candidate new views of the same monk: front, back, profile, and the turn keyframes between them.

   Built from the accepted Round 3 shapes (MONK4.parts: head, ear, robe, sleeve edges, feet, brows, colours), drawn
   with the same rules as MONK4.art (one silhouette copy behind for the outer contour, thin inner lines, the fist and
   bare wrist with their own single stroke, the keisaku drawn by MONK4.stick). The accepted 3/4 drawing itself is
   not touched: in the turn sequences its frame IS MONK4.art({ pose: 'idle' }).

   Every view is the same list of parts with the same number of points per part, so a turn keyframe is a blend of
   two views part by part (head outline, ears, face, collar, chest panel, robe, both sleeves, hands, keisaku, feet),
   plus explicit layer choices — never a rotation or a flip of the whole picture.
   Arms keep their identity through every view: "near" is always his right arm (the one with the keisaku).
   ===================================================================== */
(function () {
  'use strict';
  const MK = MONK4, PT = MK.parts, { spline, curve } = MK, ART = PT.ART, ink = 'var(--line)';
  const N = { head: 48, ear: 16, robe: 48, sleeve: 40, foot: 16 };
  const mx = pts => pts.map(([x, y]) => [-x, y]);
  const tr = (pts, dx, dy = 0, sx = 1) => pts.map(([x, y]) => [x * sx + dx, y + dy]);
  // points on a path made of M + cubic C segments (the accepted HEAD and EAR are written that way)
  function cubicPts(d) {
    const n = d.match(/-?\d*\.?\d+/g).map(Number), out = []; let x = n[0], y = n[1];
    for (let i = 2; i + 5 < n.length; i += 6) { const [a, b, c, e, f, g] = n.slice(i, i + 6);
      for (let k = 1; k <= 20; k++) { const t = k / 20, m = 1 - t; out.push([m * m * m * x + 3 * m * m * t * a + 3 * m * t * t * c + t * t * t * f, m * m * m * y + 3 * m * m * t * b + 3 * m * t * t * e + t * t * t * g]); } x = f; y = g; }
    return out;
  }
  const rs = (pts, n, closed = true) => curve(pts, n, closed);
  // mirror AND keep the drawing direction (a plain mirror reverses it, and blending a reversed outline with an
  // unreversed one turns it inside out); the new start is the top-left-most point
  function mxr(pts) { const m = mx(pts).reverse(); let k = 0; m.forEach((q, i) => { if (q[0] + q[1] < m[k][0] + m[k][1]) k = i; }); return m.slice(k).concat(m.slice(0, k)); }
  // a sleeve outline resampled to N.sleeve points + the index range of its inner edge (the line drawn when it is in
  // front of the robe). Accepted order: shoulder → outer edge down → bottom → inner edge up.
  function sl(pts, layer, reversed = false) {
    let q = rs(pts, N.sleeve); if (reversed) q = [q[0], ...q.slice(1).reverse()];
    return { pts: q, layer, inner: reversed ? [N.sleeve - 37, N.sleeve - 15] : [15, 37] };
  }
  // the accepted robe made exactly symmetric (point i pairs with 20 − i): used for the front and the back
  const ROBE_SYM = PT.ROBE.map((p, i) => { const q = PT.ROBE[(20 - i) % 20]; return [(p[0] - q[0]) / 2, (p[1] + q[1]) / 2]; });
  const IDLE = MK.POSE.idle, STAND = MK.POSE.stand;
  const EAR_PTS = cubicPts(PT.EAR);

  /* ---------- the views as data ---------- */
  // face: eyes [{x,y,rx,ry}], brows [{i: which accepted brow, dx, mirror}], mouth dx, blush [{x,y,rx,ry}], shade: 'side' | 'nape' | ''
  const VIEW = {};
  // the accepted 3/4 (turned to his left, toward the mochi), resampled — only used as an end of a blend
  VIEW.q34 = {
    zh: '既有 3/4（已驗收）',
    head: rs(cubicPts(PT.HEAD), N.head), tilt: 2,
    ears: [{ pts: rs(EAR_PTS, N.ear) }, { pts: rs(mxr(EAR_PTS), N.ear) }],
    face: { eyes: [{ x: 8.4, y: -72.6, rx: 1.9, ry: 2.3 }, { x: 16.6, y: -72.6, rx: 1.6, ry: 2.2 }], brows: [{ i: 0, dx: 0 }, { i: 1, dx: 0 }], mouth: 0,
      blush: [{ x: 5.6, y: -66.4, rx: 3.6, ry: 2 }, { x: 19.6, y: -66.2, rx: 1.8, ry: 1.6 }], shade: 'side' },
    robe: rs(PT.ROBE, N.robe), panel: [[0.6, -36], [-0.4, -22], [-0.8, -3]], panelOp: .45,
    collar: { near: [[-13.6, -59.6], [-9, -56.8], [-3.6, -53.8], [2.4, -48.8], [6.2, -45]], nw: [7.6, 3.2], far: [[12.8, -58.4], [10.6, -54.2], [7.8, -48.6], [5.8, -44]], fw: [3, 2.8],
      neck: [[-4, -56], [1.4, -51], [5.8, -46.4], [9.8, -52.6], [12, -57], [4, -58.6]], wn: [[-3, -55.6], [1.6, -51], [5.6, -46.2]], wf: [[11.4, -56.6], [9.4, -52], [6.6, -46.4]], ww: 1 },
    rakusu: [[-0.6, -44.6], [6.6, -45.4], [14, -44.4], [14.4, -39.4], [13.6, -35.4], [6.4, -34.8], [-0.4, -35.6], [-1.2, -40]],
    near: sl(IDLE.near, 'front'), far: sl(PT.FAR_STAND, 'back'),
    cuff: { cx: -11.6, cy: -24.8, rx: 1.9, ry: 3.9, r: -8 },
    fist: { pts: IDLE.hand, line: IDLE.handLine, layer: 'front' },
    farHand: { pts: PT.FAR_HAND, line: [[20.4, -16.4], [21.4, -14], [20.4, -11.8]], layer: 'back', lineOp: 0 },
    stick: { x: -7.6, y: -28.4, rot: 204, stretch: 1, layer: 'front' },
    feet: [rs(PT.FEET.near, N.foot), rs(PT.FEET.far, N.foot)], seam: 0,
  };
  // P1 front: facing us. Same head size, same robe (made symmetric), the same sleeve shape on both sides; his right
  // hand holds the keisaku in front of the open cuff (we look into the sleeve), the board hangs down and a little
  // outward, foreshortened (it points slightly away from us), well below the face.
  VIEW.front = {
    zh: '正面',
    head: rs([[0, -94], [-10.5, -91.8], [-17.2, -85], [-19.4, -75], [-18, -65.8], [-13.4, -59], [-6.4, -55], [0, -54.2], [6.4, -55], [13.4, -59], [18, -65.8], [19.4, -75], [17.2, -85], [10.5, -91.8]], N.head), tilt: 0,
    ears: [{ pts: rs(tr(EAR_PTS, -4.4), N.ear) }, { pts: rs(tr(mxr(EAR_PTS), 4.4), N.ear) }],
    face: { eyes: [{ x: -4.6, y: -72.6, rx: 1.85, ry: 2.3 }, { x: 4.6, y: -72.6, rx: 1.85, ry: 2.3 }], brows: [{ i: 0, dx: -13 }, { i: 0, dx: -13, mirror: true }], mouth: -13.9,
      blush: [{ x: -9.6, y: -66.4, rx: 3.2, ry: 1.9 }, { x: 9.6, y: -66.4, rx: 3.2, ry: 1.9 }], shade: '' },
    robe: rs(ROBE_SYM, N.robe), panel: [[1.4, -36], [1.6, -22], [1.8, -3]], panelOp: .45,
    collar: { near: [[-12.6, -59.8], [-8.6, -56.6], [-4.6, -52.4], [-1.4, -48.2], [1.2, -44.4]], nw: [6.2, 3], far: [[12.6, -59.8], [8.8, -55.6], [4.8, -49.6], [1.6, -44.2]], fw: [6.2, 3],
      neck: [[-6, -58], [-2.6, -52], [0.6, -46.6], [3.6, -52], [6.4, -58], [0, -60.4]], wn: [[-5, -57.4], [-2.4, -52], [0.4, -46.8]], wf: [[5.4, -57.6], [2.8, -52], [0.8, -46.8]], ww: 1 },
    rakusu: [[-7.8, -44.8], [0, -45.6], [7.8, -44.8], [8.2, -39.6], [7.6, -35.4], [0, -34.8], [-7.6, -35.4], [-8.2, -39.6]],
    near: sl(IDLE.near, 'front'), far: sl(mx(IDLE.near), 'front'),
    cuff: { cx: -13, cy: -24.4, rx: 4.3, ry: 3.8, r: 0 },
    fist: { pts: tr(IDLE.hand, -4, .2), line: tr(IDLE.handLine, -4, .2), layer: 'front' },
    farHand: { pts: mxr(STAND.hand), line: mx(STAND.handLine), layer: 'under', lineOp: .42 },
    stick: { x: -12.63, y: -28.3, rot: 186, stretch: .88, layer: 'front' },
    feet: [rs([[-12.6, -1.2], [-10, -4], [-4.6, -3.8], [-1.6, -1], [-3.6, 1.4], [-9.8, 1.6]], N.foot), rs([[1.6, -1], [4.6, -3.8], [10, -4], [12.6, -1.2], [9.8, 1.6], [3.6, 1.4]], N.foot)], seam: 0,
  };
  // P2 back: the round back of his head (ears seen from behind, a soft shade at the nape), the standing collar across
  // the nape, the robe's centre-back seam, both sleeves. His right hand is now on our right and in front of him: the
  // fist is hidden by the sleeve, only the board shows below it, hanging the same way (foreshortened toward us).
  const BACK_HEAD = [[0, -94], [-10.5, -91.8], [-17.2, -85], [-19.4, -75], [-18.4, -66.4], [-14.6, -60.6], [-8, -57.8], [0, -57.2], [8, -57.8], [14.6, -60.6], [18.4, -66.4], [19.4, -75], [17.2, -85], [10.5, -91.8]];
  VIEW.back = {
    zh: '背面',
    head: rs(BACK_HEAD, N.head), tilt: 0,
    ears: [{ pts: rs(tr(EAR_PTS, -4.4, .6), N.ear), back: true }, { pts: rs(tr(mxr(EAR_PTS), 4.4, .6), N.ear), back: true }],
    // the face has turned away: its features sit just past the right edge of the head (clipped away), so turning
    // toward the back slides them off the head instead of switching them off
    face: { eyes: [{ x: 24, y: -72.6, rx: 1.6, ry: 2.2 }, { x: 28, y: -72.6, rx: 1.6, ry: 2.2 }], brows: [{ i: 0, dx: 16 }, { i: 1, dx: 16 }], mouth: 10,
      blush: [{ x: 26, y: -66.4, rx: 2, ry: 1.6 }, { x: 30, y: -66.2, rx: 1.8, ry: 1.6 }], shade: 'nape' },
    robe: rs(ROBE_SYM, N.robe), panel: [[0, -57], [0, -30], [0, -3]], panelOp: .32,
    collar: { near: [[-13, -53.4], [-9.6, -54.8], [-5.6, -55.6], [-2, -55.8], [0.6, -55.8]], nw: [4.6, 4.4], far: [[13, -53.4], [8.8, -55], [4.4, -55.7], [0.4, -55.8]], fw: [4.6, 4.4],
      neck: [[-4, -58], [0, -58.6], [4, -58], [4, -56.6], [0, -56.2], [-4, -56.6]], wn: [[-5, -63], [0, -63.4], [5, -63]], wf: [[5, -63], [0, -63.4], [-5, -63]], ww: 0 },
    rakusu: [[21.6, -44.6], [23.8, -45], [25.8, -44.4], [26.2, -39.4], [25.8, -35.4], [23.6, -34.8], [21.6, -35.6], [21.2, -40]],   // on his front: past the robe's edge, clipped
    near: sl(mx(IDLE.near), 'front', true), far: sl(IDLE.near, 'front', true),
    cuff: { cx: 13, cy: -24.6, rx: 0, ry: 0, r: 0 },
    fist: { pts: tr(mxr(IDLE.hand), 4, .2), line: tr(mx(IDLE.handLine), 4, .2), layer: 'hidden' },
    farHand: { pts: STAND.hand, line: STAND.handLine, layer: 'hidden', lineOp: 0 },
    stick: { x: 12.63, y: -28.3, rot: 174, stretch: .88, layer: 'under' },
    feet: [rs([[2.6, -1.4], [4.6, -3.4], [8.4, -3.4], [10.6, -1.6], [9, 0.8], [4.2, 0.8]], N.foot), rs([[-10.6, -1.6], [-8.4, -3.4], [-4.6, -3.4], [-2.6, -1.4], [-4.2, 0.8], [-9, 0.8]], N.foot)], seam: 1,
  };
  // profile (facing right, the middle of the turn to the back): one eye at the front of the face, the ear in the
  // middle of the head, the collar running from the nape down to the chest, his right arm hanging in front of his
  // side exactly as in the 3/4 (same sleeve, same grip, same keisaku angle), his left arm hidden behind the body
  VIEW.profile = {
    zh: '側面（轉身中段）',
    head: rs(cubicPts(PT.HEAD), N.head), tilt: 2,
    ears: [{ pts: rs(tr(EAR_PTS, 10.6, .4), N.ear), onHead: true }, { pts: rs(mxr(EAR_PTS), N.ear) }],
    face: { eyes: [{ x: 15.4, y: -72.6, rx: 1.6, ry: 2.25 }, { x: 26, y: -72.6, rx: 1.2, ry: 2 }], brows: [{ i: 0, dx: 7.6 }, { i: 1, dx: 9 }], mouth: 2.6,
      blush: [{ x: 13.4, y: -66.2, rx: 3.4, ry: 2 }, { x: 26, y: -66.2, rx: 1.4, ry: 1.4 }], shade: 'side' },
    robe: rs(tr(ROBE_SYM, 0, 0, .92), N.robe), panel: [[12.4, -36], [13.6, -22], [14.6, -3]], panelOp: .45,
    collar: { near: [[-6.4, -61], [-1.2, -58.4], [4.2, -54.4], [9.2, -49.4], [12.6, -45.2]], nw: [6, 3], far: [[12.6, -45.4], [12.6, -45.2], [12.6, -45], [12.6, -44.8]], fw: [.1, .1],
      neck: [[2, -58.4], [6.4, -53.4], [10.6, -48], [12.8, -52], [12.6, -58], [6, -60.4]], wn: [[3, -57.2], [7.4, -52], [10.8, -47.6]], wf: [[12.6, -45.4], [12.6, -45.2], [12.6, -45]], ww: 1 },
    rakusu: [[10.6, -44.6], [12.8, -45], [14.8, -44.4], [15.2, -39.4], [14.8, -35.4], [12.6, -34.8], [10.6, -35.6], [10.2, -40]],
    near: sl(tr(IDLE.near, 11), 'front'), far: sl(tr(PT.FAR_STAND, -12), 'back'),
    cuff: { cx: -0.6, cy: -24.8, rx: 1.9, ry: 3.9, r: -8 },
    fist: { pts: tr(IDLE.hand, 11), line: tr(IDLE.handLine, 11), layer: 'front' },
    farHand: { pts: tr(PT.FAR_HAND, -12), line: [[8.4, -16.4], [9.4, -14], [8.4, -11.8]], layer: 'back', lineOp: 0 },
    stick: { x: 3.4, y: -28.4, rot: 204, stretch: 1, layer: 'front' },
    feet: [rs([[-8, -1], [-4, -4], [3, -3.8], [8.2, -1.4], [5, 1.6], [-4, 1.6]], N.foot), rs([[2, -1.6], [6, -3.8], [10.6, -3.4], [12.4, -1], [9.6, 1], [4, 1.2]], N.foot)], seam: 0,
  };

  /* ---------- blending two views (a turn keyframe) ---------- */
  const lp = (a, b, t) => a + (b - a) * t;
  function mix(a, b, t) {
    if (typeof a === 'number') return lp(a, b, t);
    if (Array.isArray(a)) return a.map((v, i) => mix(v, b[i], t));
    if (a && typeof a === 'object') { const o = {}; for (const k in a) o[k] = (k === 'layer' || k === 'zh' || k === 'shade' || k === 'mirror' || k === 'i' || a[k] === null || b[k] === null) ? (t < .5 ? a[k] : b[k]) : mix(a[k], b[k], t); return o; }
    return t < .5 ? a : b;
  }
  const blend = (a, b, t, over = {}) => Object.assign(mix(VIEW[a], VIEW[b], t), over);
  // keyframes: P3 side → front (the accepted 3/4 itself, halfway, front); P4 side → back (3/4, profile, back-3/4, back)
  const keyP3mid = () => { const k = blend('q34', 'front', .5); k.farHand = Object.assign({}, k.farHand, { lineOp: 0 });
    // the brows follow the eyes (near brow over the near eye, the far one still the shorter, turned-away shape)
    k.face = Object.assign({}, k.face, { brows: [{ i: 0, dx: k.face.eyes[0].x - 8.4 }, { i: 1, dx: k.face.eyes[1].x - 16.6 }] }); return k; };
  const KEYS = {
    p3_0: { zh: 'P3・起點（既有 3/4）', accepted: true },
    p3_1: Object.assign(keyP3mid(), { zh: 'P3・中間（3/4 → 正面 50%）' }),
    p3_2: Object.assign({}, VIEW.front, { zh: 'P3・終點（正面）' }),
    p4_0: { zh: 'P4・起點（既有 3/4）', accepted: true },
    p4_1: Object.assign({}, VIEW.profile, { zh: 'P4・側面' }),
    // back-3/4: his left arm is still behind the body (only its outer edge shows), his right fist is turned away from us
    p4_2: Object.assign(blend('profile', 'back', .5), { zh: 'P4・背面 3/4', ears: mix(VIEW.profile.ears, VIEW.back.ears, .5).map((e, i) => Object.assign(e, { onHead: i === 0, back: i === 1 })), cuff: { cx: 6, cy: -24.7, rx: 0, ry: 0, r: 0 },
      collar: Object.assign(mix(VIEW.profile.collar, VIEW.back.collar, .5), { ww: 0, neck: VIEW.back.collar.neck }), far: Object.assign(mix(VIEW.profile.far, VIEW.back.far, .5), { layer: 'back' }),
      fist: Object.assign(mix(VIEW.profile.fist, VIEW.back.fist, .5), { layer: 'hidden' }), stick: Object.assign(mix(VIEW.profile.stick, VIEW.back.stick, .5), { layer: 'under' }) }),
    p4_3: Object.assign({}, VIEW.back, { zh: 'P4・終點（背面）' }),
  };

  /* ---------- drawing (the same conventions as MONK4.art) ---------- */
  const L = (d, w = 1.1, op = 1) => `<path d="${d}" style="fill:none;stroke:${ink};stroke-width:${w};stroke-linecap:round;stroke-linejoin:round;opacity:${op}"/>`;
  const fill = (d, c, s) => `<path class="m4p" d="${d}" style="--c:${c}" ${s ? 'data-s="1"' : ''}/>`;
  const det = s => `<g class="m4det">${s}</g>`;
  const P = (pts, closed = true) => spline(pts, closed);
  function fistD(pts) { return det(`<path d="${P(pts)}" style="fill:${ART.skin};stroke:${ink};stroke-width:1.2;stroke-linejoin:round"/>`); }
  const eye = e => `<ellipse cx="${e.x.toFixed(2)}" cy="${e.y.toFixed(2)}" rx="${e.rx.toFixed(2)}" ry="${e.ry.toFixed(2)}" style="fill:${ink}"/>`;
  const browD = (b, face) => `<path d="${PT.BROW[face][b.i]}" transform="${b.mirror ? 'scale(-1 1) ' : ''}translate(${b.dx.toFixed(2)} 0)" style="fill:#f6f1e6;stroke:${ink};stroke-width:1;stroke-linejoin:round"/>`;
  function sleeve(sl) {   // the sleeve and, when it is in front of the robe, its inner line (the part away from the outer edge)
    const pts = sl.pts, line = pts.slice(sl.inner[0], sl.inner[1]);
    return fill(P(pts), ART.robe) + (sl.layer === 'front' ? det(L(P(line, false), 1.15)) : '');
  }
  function view(v, o = {}) {
    if (typeof v === 'string') v = KEYS[v] || VIEW[v];
    if (v.accepted) return MK.art({ id: o.id || 'mv', pose: 'idle', face: o.face || 'kind' });
    const id = o.id || 'mv', face = o.face || 'kind', out = [];
    const stick = () => det(MK.stick(v.stick, { ...ART, band: ART.bandC }, ink));
    const farHand = () => fill(P(v.farHand.pts), ART.skin, 1) + (v.farHand.lineOp ? det(L(P(v.farHand.line, false), .7, v.farHand.lineOp)) : '');
    // behind the robe: his far arm (and its hand) when it is behind him
    if (v.far.layer === 'back') out.push(sleeve(v.far) + (v.farHand.layer === 'back' ? farHand() : ''));
    out.push(fill(P(v.feet[0]), ART.foot) + fill(P(v.feet[1]), ART.foot));
    out.push(fill(P(v.robe), ART.robe));
    out.push(det(L(P(v.panel, false), 1, v.panelOp)));
    // collar (clipped to the robe): neck, white under-collars, the two dark panels (his left on top), their edges
    const c = v.collar, rib = MK.parts.ribbon;
    out.push(det(`<g clip-path="url(#${id}-robe)"><path d="${P(c.neck)}" style="fill:${ART.neck}"/>`
      + (c.ww > .05 ? `<path d="${rib(c.wn, 1.8 * c.ww, 1.2 * c.ww)}" style="fill:${ART.white}"/><path d="${rib(c.wf, 1.6 * c.ww, 1.1 * c.ww)}" style="fill:${ART.white}"/>` : '')
      + `<path d="${rib(c.near, c.nw[0], c.nw[1])}" style="fill:${ART.band}"/>` + (c.fw[0] > .2 ? `<path d="${rib(c.far, c.fw[0], c.fw[1])}" style="fill:${ART.band}"/>` : '') + '</g>'));
    out.push(det(`<g clip-path="url(#${id}-robe)"><path d="${P(v.rakusu)}" style="fill:${ART.kesa};stroke:${ink};stroke-width:1.1"/></g>`));
    if (v.seam) out.push(det(L('M0 -57 C0.4 -40 0.2 -20 0 -3', 1, .3 * v.seam)));
    // the keisaku when it hangs behind his sleeve (back views): it is drawn first, the sleeve covers the grip
    if (v.stick.layer === 'under') out.push(stick());
    if (v.farHand.layer === 'under') out.push(farHand());
    if (v.far.layer === 'front') out.push(sleeve(v.far));
    out.push(sleeve(v.near));
    if (v.cuff.rx > .2) out.push(det(`<ellipse cx="${v.cuff.cx.toFixed(2)}" cy="${v.cuff.cy.toFixed(2)}" rx="${v.cuff.rx.toFixed(2)}" ry="${v.cuff.ry.toFixed(2)}" transform="rotate(${v.cuff.r.toFixed(1)} ${v.cuff.cx.toFixed(2)} ${v.cuff.cy.toFixed(2)})" style="fill:#26345a;stroke:${ink};stroke-width:.85"/>`));
    if (v.stick.layer === 'front') out.push(stick());
    if (v.fist.layer === 'front') out.push(fistD(v.fist.pts) + det(L(P(v.fist.line, false), .7, .42)));
    // head: ears first (the head covers where they attach), head, then everything on it, clipped to it
    const f = v.face, lower = v.head.slice(Math.round(N.head * .25), Math.round(N.head * .75) + 1);
    const hx = v.head.map(q => q[0]), hmid = (Math.min(...hx) + Math.max(...hx)) / 2, hhalf = (Math.max(...hx) - Math.min(...hx)) / 2;
    const earInfo = e => { const c = e.pts.reduce((a, q) => [a[0] + q[0] / e.pts.length, a[1] + q[1] / e.pts.length], [0, 0]), side = Math.sign(c[0] - hmid) || -1; return { c, side, out: Math.abs(c[0] - hmid) > hhalf * .86 }; };
    const earLine = e => { const { c, side, out } = earInfo(e); if (e.back || !(out || e.onHead)) return ''; const sd = e.onHead ? -1 : side;
      const x0 = e.onHead ? c[0] + .6 : c[0] + .5 * side; return L(`M${x0.toFixed(2)} ${(c[1] - 2.4).toFixed(2)} q${2 * sd} 1.8 ${.4 * sd} 4.4`, .9, .55); };
    const earsD = v.ears.filter(e => !e.onHead).map(e => fill(P(e.pts), ART.skin, 1)).join('');
    const earsOn = v.ears.filter(e => e.onHead).map(e => fill(P(e.pts), ART.skin, 1)).join('');
    const earLines = v.ears.map(earLine).join('');
    const shade = f.shade === 'side' ? `<path d="M-6 -95 C-15 -88 -17 -74 -13 -64 C-10 -58.6 -6 -56 -1 -54.6 L-30 -50 L-30 -100 Z" style="fill:var(--skin-lo);opacity:.5"/>`
      : f.shade === 'nape' ? `<path d="M-21 -70 C-15 -61.5 15 -61.5 21 -70 L21 -50 L-21 -50 Z" style="fill:var(--skin-lo);opacity:.32"/>` : '';
    const blushO = PT.BLUSH[face] ?? .6;
    out.push(`<g transform="rotate(${(v.tilt ?? 0).toFixed(2)} 3 -56)">` + earsD + fill(P(v.head), ART.skin) + earsOn
      + det(`<g clip-path="url(#${id}-head)">${shade}`
        + f.blush.map(b => `<ellipse cx="${b.x.toFixed(2)}" cy="${b.y.toFixed(2)}" rx="${b.rx.toFixed(2)}" ry="${b.ry.toFixed(2)}" style="fill:var(--blush);opacity:${blushO}"/>`).join('')
        + f.eyes.map(eye).join('') + `<g transform="translate(${f.mouth.toFixed(2)} 0)">${L('M11.4 -64 q2.6 2 5 -.2', 1.4)}</g>` + f.brows.map(b => browD(b, face)).join('') + '</g>'
        + L(P(lower, false), 1.25) + earLines
        + '<path d="M-7.4 -88.6 q5 -4.2 11 -4.6" style="fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;opacity:.5"/>') + '</g>');
    const flip = o.facing === 'left' ? ' transform="scale(-1 1)"' : '';
    return `<g class="m4" id="${id}"><defs><clipPath id="${id}-robe"><path d="${P(v.robe)}"/></clipPath><clipPath id="${id}-head"><path d="${P(v.head)}"/></clipPath><g id="${id}-art">${out.join('')}</g></defs>
      ${o.shadow !== false ? '<ellipse cx="1" cy="1.4" rx="27" ry="4.2" class="m4shadow"/>' : ''}<g${flip}><use href="#${id}-art" class="m4-sil"/><use href="#${id}-art"/></g></g>`;
  }
  window.MONK_VIEWS = { VIEW, KEYS, view, blend, mix };
})();
