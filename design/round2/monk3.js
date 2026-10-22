/* =====================================================================
   住持 v3 — second structural pass. Head, face, proportions and colours are v2's;
   the shoulder, the collar and the sleeves are re-derived from the body underneath.

   Skeleton (three-quarter, facing right; feet at y=0):
     near shoulder joint (-14.5,-46.5)   far shoulder joint (13,-48.5), behind the chest
     carry : near elbow (-18.4,-30.5)  near wrist (-7.6,-21.2)  fist (-2.5,-20); far arm hangs, hidden by the belly
     tuck  : near elbow (-17.6,-29.5) → wrist (6.4,-25.5);  far elbow (20.6,-31.5) → wrist (4,-25.8)
             each hand goes into the other sleeve; the forearms cross in front of the belly at x≈2..7

   Garment logic
     • The robe body owns the shoulder line, from the nape to the shoulder point. The sleeve starts at the
       shoulder point and its front edge starts at the armpit, so the shoulder is not a separate oval.
     • A sleeve is a hanging piece of cloth: its top follows the arm (upper arm down, forearm forward),
       its end hangs straight down from the wrist, its bottom is level-ish with rounded corners, lowest at
       the elbow side. The opening is the upper part of the end, at the wrist.
     • Collar, inside → out: neck (skin), white under-collar, dark collar band; the wearer's LEFT panel is on top.
       The top panel is a real shape in the drawing order, so whatever runs under it is hidden by it,
       not by luck. Rakusu straps lie on the robe just outside the collar bands, flush with them.

   Lines are drawn explicitly and each has a meaning (kind):
     occ  something in front of something else      col  collar edge (band ↔ under-collar)
     top  edges of the upper panel's collar          und  under-collar ↔ neck
     str  rakusu strap edge                          cuf  sleeve-opening rim
   The outer contour is one silhouette copy of all parts, drawn behind.
   ===================================================================== */
(function () {
  /* ---------- tiny geometry helpers ---------- */
  const f = n => (+n).toFixed(2);
  const fp = p => `${f(p[0])} ${f(p[1])}`;
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); return [dx / L, dy / L]; };
  // side +1: right-hand normal (-dy, dx); side -1: left-hand normal (dy, -dx)  (screen coordinates, y down)
  function offset(pts, d, side) {
    const nrm = i => { const [ux, uy] = unit(pts[i], pts[i + 1]); return side > 0 ? [-uy, ux] : [uy, -ux]; };
    const D = i => Array.isArray(d) ? d[Math.min(i, d.length - 1)] : d;
    return pts.map((p, i) => {
      const d = D(i);
      if (i === 0) { const m = nrm(0); return [p[0] + m[0] * d, p[1] + m[1] * d]; }
      if (i === pts.length - 1) { const m = nrm(i - 1); return [p[0] + m[0] * d, p[1] + m[1] * d]; }
      const a = nrm(i - 1), b = nrm(i); let mx = a[0] + b[0], my = a[1] + b[1]; const L = Math.hypot(mx, my); mx /= L; my /= L;
      const c = mx * a[0] + my * a[1]; return [p[0] + mx * d / c, p[1] + my * d / c];
    });
  }
  const poly = pts => 'M' + pts.map(fp).join(' L');
  const band = (pts, d0, d1, side) => poly(offset(pts, d0, side).concat(offset(pts, d1, side).reverse())) + ' Z';
  function xAt(pts, y) { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); } return null; }

  /* ---------- shapes (facing right) ---------- */
  const HEAD = 'M2 -94 C-9 -94 -17.5 -86 -17.5 -75 C-17.5 -66 -13 -59 -6 -56.2 C-1 -54.4 6 -54.2 11 -55.4 C17 -57 21.5 -62 22.2 -68.5 C23 -76 21.5 -84 16 -89.5 C12 -92.8 7 -94 2 -94 Z';
  const HEAD_LOWER = 'M-17.5 -75 C-17.5 -66 -13 -59 -6 -56.2 C-1 -54.4 6 -54.2 11 -55.4 C17 -57 21.5 -62 22.2 -68.5';   // the edge that lies over the neck and shoulders
  const EAR = 'M-14.4 -76.6 C-17.6 -76.6 -18.8 -73.4 -18.4 -70.8 C-18 -68 -16 -66.4 -13.8 -66.8 C-12.6 -68.6 -12.4 -73.6 -14.4 -76.6 Z';
  // the robe owns the shoulder line: nape (-10.4,-56.6) → near shoulder point (-17.4,-48.6); far shoulder slopes out from under the chin
  const BODY = 'M6 -60 C0 -60.6 -7 -61.2 -10.6 -61 C-11.6 -60.9 -12.3 -60.8 -12.8 -60.6 C-13.8 -58.6 -14.6 -56.4 -15.6 -54.2 C-16.3 -52.2 -16.9 -50.4 -17.4 -48.6 L-18.6 -30 C-19.8 -20 -21.2 -10 -22.4 -2.4 Q-1 1.4 20.6 -2.6 C21.8 -10 22.8 -19 22 -28 C21.4 -36 20 -43.6 18.4 -49.4 C17.6 -52.6 16.6 -56.6 13 -57.8 C10.6 -58.6 8.4 -59.6 6 -60 Z';
  const HEM = 'M-22.4 -2.4 Q-1 1.4 20.6 -2.6';
  // the neck: its back edge shows between the head and the nape; the collar covers its base
  const NECK = 'M-3.2 -53.6 L-9.6 -56.6 L-11.2 -59.6 Q-1 -64.6 11.4 -61.6 L10.6 -55.8 L6.6 -45 Z';
  const FOOT_FAR = 'M5 -0.8 C5 -3.4 8.4 -4.4 12.2 -4.2 C15.8 -4 18.4 -2.6 18.4 -0.8 C18.4 0.8 15.4 1.4 11.8 1.4 C8.2 1.4 5 1.1 5 -0.8 Z';
  const FOOT_NEAR = 'M-13.2 -0.2 C-13.2 -3 -9.8 -4.2 -5.6 -4.2 C-1.6 -4.2 1.8 -2.8 1.8 -0.4 C1.8 1.4 -1.6 2.2 -5.6 2.2 C-9.8 2.2 -13.2 1.8 -13.2 -0.2 Z';
  const FIST = 'M-5.1 -21.6 C-4.9 -24.4 -2.3 -25.2 0.3 -24.2 C2.5 -23.4 3.3 -20.8 2.7 -18.6 C2.1 -16 -0.7 -14.8 -3.1 -15.6 C-4.9 -16.2 -5.3 -18.8 -5.1 -21.6 Z';
  // keisaku: through the fist centre (-2.5,-20) and resting on the shoulder ball (-19.8,-47.4)
  const STICK = { x: 5.17, y: -11.2, rot: -34.4 };

  /* sleeves. SP = shoulder point (-17.4,-48.6), AF = front of the armpit (-14.6,-37.6) */
  const SLEEVE = {
    carryNear: {
      fill: 'M-17.4 -48.6 C-20.2 -46.6 -22 -42.4 -22.6 -37 L-22.8 -30 L-22.6 -15 C-22.6 -11.4 -20.4 -9.6 -17 -9.6 C-13.4 -9.4 -10.6 -9.6 -9.4 -9.8 C-7.8 -10 -6.8 -11.4 -6.8 -13.6 L-7.4 -25.4 C-9.4 -27.2 -11.8 -29.4 -13.6 -31.2 C-14.2 -32.6 -14.6 -35.4 -14.8 -38.4 C-15.2 -41.8 -16.1 -45.4 -17.4 -48.6 Z',
      lines: [
        ['occ', 1.3, 'M-14.8 -38.4 C-14.6 -35.4 -14.2 -32.6 -13.6 -31.2 C-11.8 -29.4 -9.4 -27.2 -7.4 -25.4', '前臂上緣：上臂前側 → 手肘內側 → 手腕'],
        ['occ', 1.3, 'M-7.4 -25.4 L-6.8 -13.6 C-6.8 -11.4 -7.8 -10 -9.4 -9.8', '袖端：從手腕垂直落下'],
        ['occ', 1.3, 'M-9.4 -9.8 C-10.6 -9.6 -13.4 -9.4 -17 -9.6 C-20.4 -9.6 -22.6 -11.4 -22.6 -15', '袖袋底：最低點在手肘下方'],
      ],
      opening: { fill: 'M-7.4 -25.4 C-8.9 -23.6 -9.1 -19 -7 -16.4 L-7.2 -21 Z', rim: 'M-7.4 -25.4 C-8.9 -23.6 -9.1 -19 -7 -16.4' },
    },
    tuckNear: {
      fill: 'M-17.4 -48.6 C-20.2 -46.6 -22 -42.4 -22.6 -37 L-22.8 -29.5 L-22.6 -14.6 C-22.6 -11 -20.4 -9.4 -17 -9.4 L2.8 -11 C5 -11.2 6.4 -12.6 6.4 -14.8 L6.8 -29.2 C1 -29.6 -6 -30 -13.2 -30.6 C-14.2 -32.4 -14.6 -35.4 -14.8 -38.4 C-15.2 -41.8 -16.1 -45.4 -17.4 -48.6 Z',
      lines: [
        ['seam', .9, 'M-17.4 -48.6 C-16.2 -45.4 -15.2 -41.8 -14.8 -38.4', '袖付け：肩點 → 腋下，袖子從這裡接上衣身'],
        ['occ', 1.3, 'M-14.8 -38.4 C-14.6 -35.4 -14.2 -32.4 -13.2 -30.6 C-6 -30 1 -29.6 6.8 -29.2', '前臂上緣：上臂前側 → 手肘內側 → 往腹前'],
        ['occ', 1.3, 'M6.8 -29.2 L6.4 -14.8 C6.4 -12.6 5 -11.2 2.8 -11', '前側袖端：蓋在後側袖上'],
        ['occ', 1.3, 'M2.8 -11 L-17 -9.4 C-20.4 -9.4 -22.6 -11 -22.6 -14.6', '袖袋底：手肘側最低'],
      ],
      opening: { rim: 'M6.8 -29.2 C5.4 -27.6 5 -24.4 5.6 -21.6' },
    },
    tuckFar: {
      // only the part beyond the near sleeve's end is seen; the far upper arm goes back behind the chest at (21.4,-36)
      fill: 'M0 -28 L6.8 -28.4 C11 -28.8 15.6 -29.6 18.4 -30.8 C19.6 -31.6 20.6 -33.6 21.4 -36 C23.2 -33.6 24.6 -29 24.6 -24.6 L24.4 -14.6 C24.4 -11 22 -9.6 18.6 -9.6 C14 -9.8 9 -11 5 -12.8 L0 -14 Z',
      lines: [
        ['occ', 1.3, 'M6.8 -28.4 C11 -28.8 15.6 -29.6 18.4 -30.8 C19.6 -31.6 20.6 -33.6 21.4 -36', '後側前臂上緣 → 手肘 → 上臂回到胸後'],
        ['occ', 1.3, 'M24.4 -14.6 C24.4 -11 22 -9.6 18.6 -9.6 C14 -9.8 9 -11 5.6 -12.6', '後側袖袋底：手肘側最低，往手的方向上收'],
      ],
    },
  };

  /* ---------- collar geometry ---------- */
  const A = [-3.2, -53.6], X = [6.6, -45], B = [10.6, -55.8];
  // the near collar rises round the back of the neck to the head; the far one goes up under the chin
  const NEAR_TOP = [[-12.4, -64.4], [-11.2, -59.6], [-9.6, -56.6], A, X], FAR_TOP = [[12.4, -60.6], B, X];
  const NW = 3.4, FW = 2.4;   // band widths: the far band is foreshortened
  // at the back of the neck the collar fills right out to the contour, so no sliver of robe is left between them;
  // the near strap only appears where it comes over the shoulder
  const NW_V = [7, 7, 5.4, NW];
  // near strap: comes over the shoulder from behind (crossing the contour at a steep angle), passes over the
  // collar, then runs flush along the collar's outer edge down to the panel. Constant width.
  const nA = (() => { const a = unit([-9.6, -56.6], A), b = unit(A, X); let x = -a[1] - b[1], y = a[0] + b[0]; const L = Math.hypot(x, y); return [x / L, y / L]; })();
  const n1 = (() => { const b = unit(A, X); return [-b[1], b[0]]; })();
  const SW = 2.2, NEAR_STRAP = [[-19, -55.6], [A[0] + nA[0] * (NW + SW / 2), A[1] + nA[1] * (NW + SW / 2)],
    [A[0] + 1.12 * (X[0] - A[0]) + n1[0] * (NW + SW / 2), A[1] + 1.12 * (X[1] - A[1]) + n1[1] * (NW + SW / 2)]];
  const PANEL_TOP = -46.5, PANEL_BOT = -37;
  function collarGeo(topNear) {
    const g = {};
    if (!topNear) {   // facing right: the far panel (wearer's left) is on top; its collar runs on down to the hem
      g.near = NEAR_TOP.concat([[9.4, -42.4]]);                 // runs on under the top panel
      g.far = FAR_TOP.concat([[-4, -24], [-3.2, 4]]);           // the upper panel's collar runs on down to the hem
      g.topPanel = offset(g.far, 1, -1).concat([[40, 4], [40, -66]]);
    } else {          // facing left (before the mirror): the near panel is on top
      g.near = NEAR_TOP.concat([[10.6, -39.6], [12.8, -30], [13.6, 4]]);
      g.far = FAR_TOP.concat([[5.2, -41.2]]);
      g.topPanel = offset(g.near, 1, +1).concat([[-40, 4], [-40, -66]]);
    }
    g.nearS = NEAR_TOP.concat([[X[0] + 0.8, X[1] + 0.7]]);      // straps: cut under the rakusu panel
    g.farS = FAR_TOP.concat([[6.2, -44]]);
    g.xL = xAt(offset(NEAR_STRAP, SW / 2, +1), PANEL_TOP) - 0.4;
    g.xR = xAt(offset(g.farS, FW + 1.8, -1), PANEL_TOP) + 0.4;
    return g;
  }

  /* ---------- colours per mode ---------- */
  const ART = { robe: 'var(--robe)', band: 'var(--robe-lo)', white: '#f6f2e8', neck: 'var(--skin-lo)', skin: 'var(--skin)', kesa: 'var(--kesa)', strap: '#6b4626', inner: '#2a3859', foot: '#f2ede2', stick: '#c69b62' };
  const BLOCKS = { body: '#cfd8ee', near: '#9fb8e6', far: '#f2c9a0', band: '#5d6f9c', top: '#e0864a', white: '#ffffff', neck: '#e9b89a', skin: '#f3dcc6', kesa: '#b98a5a', strap: '#7a5230', inner: '#3a3f55', foot: '#ffffff', stick: '#e6d2a6' };
  const KCOL = { seam: '#13a3a3', occ: '#2f74d0', col: '#2f9e5b', top: '#e0681e', und: '#8a8f99', str: '#8a5a2b', cuf: '#8e44ad' };

  function build(o) {
    const { pose, facing, face, mode, hide = {} } = o, topNear = facing === 'left';
    const blocks = mode === 'blocks', flat = mode === 'flat' || blocks, linesMode = mode === 'lines', plain = mode === 'plain';
    const C = (artKey, blockKey) => blocks ? BLOCKS[blockKey || artKey] : linesMode ? '#fff' : ART[artKey];   // 'plain' = art colours, no shading
    const part = (d, c, extra = '') => `<path class="m3p" d="${d}" style="--c:${c}" ${extra}/>`;
    const L = (kind, w, d, op = 1) => flat ? '' : `<path class="m3L" d="${d}" style="--w:${w};stroke:${linesMode ? KCOL[kind] : 'var(--line)'};opacity:${op}"/>`;
    const D = s => `<g class="m3det">${s}</g>`;   // not part of the silhouette
    const g = collarGeo(topNear), id = o.id;
    const sl = pose === 'carry' ? SLEEVE.carryNear : SLEEVE.tuckNear;

    const layers = [];
    const add = (name, svg) => layers.push({ name, svg });

    add('雙腳', `${part(FOOT_FAR, C('foot'), 'data-s="1"')}${part(FOOT_NEAR, C('foot'), 'data-s="1"')}`);
    add('外袍', `${part(BODY, C('robe', 'body'))}${D(L('occ', 1.3, HEM))}`);

    // collar: neck → under-collar → under panel's band → top panel (hides what runs beneath it) → top band → straps
    const nearW = band(NEAR_TOP, 0, 1.5, -1), farW = band(FAR_TOP, 0, 1.5, +1);
    const underBand = topNear ? band(g.far, 0, FW, -1) : band(g.near, 0, NW_V, +1);
    const topBand = topNear ? band(g.near, 0, NW_V, +1) : band(g.far, 0, FW, -1);
    const underPts = topNear ? g.far : g.near, topPts = topNear ? g.near : g.far;
    const underW = topNear ? farW : nearW, topW = topNear ? nearW : farW;
    const underInner = poly(topNear ? FAR_TOP : NEAR_TOP), topInner = poly(topNear ? g.near : g.far);
    const underOuter = poly(topNear ? offset(g.far, FW, -1) : offset(g.near, NW_V, +1));
    const topOuter = poly(topNear ? offset(g.near, NW_V, +1) : offset(g.far, FW, -1));
    const wIn = (pts, side) => poly(offset(pts, 1.5, side));
    add('衣領', `${part(NECK, C('neck'), 'data-s="1"')}<g clip-path="url(#${id}-body)">
      ${D(`<path d="${underW}" style="fill:${C('white')}"/>${L('und', .7, topNear ? wIn(FAR_TOP, +1) : wIn(NEAR_TOP, -1), .8)}
        <path d="${topW}" style="fill:${C('white')}"/>${L('und', .7, topNear ? wIn(NEAR_TOP, -1) : wIn(FAR_TOP, +1), .8)}
        <path d="${underBand}" style="fill:${C('band')}"/>${L('col', 1, underInner)}${L('col', .8, underOuter)}
        <path d="${poly(g.topPanel)} Z" style="fill:${C('robe', 'body')}"/>
        <path d="${topBand}" style="fill:${blocks ? BLOCKS.top : C('band')}"/>${L('top', 1, topInner)}${L('top', .8, topOuter)}`)}
    </g>`);
    if (!hide.rakusu) add('絡子', D(`<g clip-path="url(#${id}-body)">
        <path d="${band(NEAR_STRAP, -SW / 2, SW / 2, +1)}" style="fill:${C('strap')}"/>${L('str', 1, poly(offset(NEAR_STRAP, SW / 2, +1)))}${L('str', 1, poly(offset(NEAR_STRAP, -SW / 2, +1)))}
        <path d="${band(g.farS, FW, FW + 1.8, -1)}" style="fill:${C('strap')}"/>${L('str', 1, poly(offset(g.farS, FW + 1.8, -1)))}
      </g>
      <rect x="${f(g.xL)}" y="${PANEL_TOP}" width="${f(g.xR - g.xL)}" height="${PANEL_BOT - PANEL_TOP}" rx="1.4" style="fill:${C('kesa')}"/>
      ${L('occ', 1.3, `M${f(g.xL + 1.4)} ${PANEL_TOP} H${f(g.xR - 1.4)} Q${f(g.xR)} ${PANEL_TOP} ${f(g.xR)} ${PANEL_TOP + 1.4} V${PANEL_BOT - 1.4} Q${f(g.xR)} ${PANEL_BOT} ${f(g.xR - 1.4)} ${PANEL_BOT} H${f(g.xL + 1.4)} Q${f(g.xL)} ${PANEL_BOT} ${f(g.xL)} ${PANEL_BOT - 1.4} V${PANEL_TOP + 1.4} Q${f(g.xL)} ${PANEL_TOP} ${f(g.xL + 1.4)} ${PANEL_TOP} Z`)}
      ${L('str', .7, `M${f(g.xL + 2)} ${PANEL_TOP + 2} H${f(g.xR - 2)} V${PANEL_BOT - 2} H${f(g.xL + 2)} Z`, .45)}`));

    if (pose === 'tuck') add('後側袖', `${part(SLEEVE.tuckFar.fill, C('robe', 'far'))}${D(SLEEVE.tuckFar.lines.map(([k, w, d]) => L(k, w, d)).join(''))}`);
    add('前側袖', `${part(sl.fill, C('robe', 'near'))}
      ${sl.opening.fill ? D(`<path d="${sl.opening.fill}" style="fill:${C('inner')}"/>`) : ''}
      ${D(sl.lines.map(([k, w, d]) => L(k, w, d)).join('') + L('cuf', 1, sl.opening.rim))}`);
    if (pose === 'carry') {
      add('香板', D(`<g transform="translate(${STICK.x} ${STICK.y}) rotate(${STICK.rot})">
        <rect x="-1.35" y="-62" width="2.7" height="62" rx="1.2" style="fill:${C('stick')};stroke:${linesMode ? KCOL.occ : 'var(--line)'};stroke-width:${flat ? 0 : 1.1}"/>
        <rect x="-2.8" y="-85" width="5.6" height="25" rx="2.2" style="fill:${C('stick')};stroke:${linesMode ? KCOL.occ : 'var(--line)'};stroke-width:${flat ? 0 : 1.1}"/></g>`));
      add('手', `${part(FIST, C('skin'), 'data-s="1"')}${D(L('occ', .9, 'M-0.7 -23.8 C0.7 -21.6 0.7 -18.8 -0.5 -16.4', .55))}`);
    }
    if (!hide.head) add('頭部', `${part(HEAD, C('skin'))}
      ${mode === 'art' ? D(`<g clip-path="url(#${id}-head)"><path d="M-6 -95 C-15 -88 -17 -74 -13 -64 C-10 -58.6 -6 -56 -1 -54.6 L-30 -50 L-30 -100 Z" style="fill:var(--skin-lo);opacity:.55"/></g>`) : ''}
      ${D(L('occ', 1.3, HEAD_LOWER))}
      ${part(EAR, C('skin'), 'data-s="1"')}
      ${D(`${L('occ', .9, 'M-15 -74 q-2 1.8 -.4 4.4', .55)}
        ${mode === 'art' ? '<path d="M-7.4 -88.6 q5 -4.2 11 -4.6" style="fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;opacity:.5"/>' : ''}
        ${flat ? '' : `<ellipse cx="5.6" cy="-66.4" rx="3.6" ry="2" style="fill:var(--blush);opacity:.6"/><ellipse cx="19.6" cy="-66.2" rx="1.8" ry="1.6" style="fill:var(--blush);opacity:.6"/>
        ${FACE[face](linesMode)}`}`)}`);
    return layers;
  }

  const FACE = {
    kind: lm => `<ellipse cx="8.4" cy="-72.6" rx="1.9" ry="2.3" style="fill:var(--line)"/><ellipse cx="16.6" cy="-72.6" rx="1.6" ry="2.2" style="fill:var(--line)"/>
      <path class="m3L" d="M11.4 -64 q2.6 2 5 -.2" style="--w:1.4;stroke:var(--line)"/>${brows('kind')}`,
    laugh: lm => `<path class="m3L" d="M6.2 -72 q2.2 -2.8 4.4 0 M14.6 -72 q2 -2.6 4 0" style="--w:1.5;stroke:var(--line)"/><path d="M10.6 -65.2 q3.2 5 6.6 -.4 z" style="fill:#b5534b"/>${brows('laugh')}`,
    stern: lm => `<ellipse cx="8.4" cy="-72.2" rx="1.9" ry="1.9" style="fill:var(--line)"/><ellipse cx="16.6" cy="-72.2" rx="1.6" ry="1.8" style="fill:var(--line)"/>
      <path class="m3L" d="M11.6 -63.6 h4.6" style="--w:1.5;stroke:var(--line)"/>${brows('stern')}`,
  };
  const BROWS = {
    kind:  ['M4.4 -77.4 C5.6 -80.4 9.6 -81 11.4 -78.6 C10 -77.6 6.6 -77 4.4 -77.4 Z', 'M14.4 -78.4 C15.6 -80.8 18.8 -80.8 20 -78.4 C18.8 -77.6 16 -77.4 14.4 -78.4 Z'],
    laugh: ['M4.6 -78 C5.8 -81 9.8 -81.4 11.4 -79 C10 -78 6.8 -77.6 4.6 -78 Z', 'M14.4 -79 C15.6 -81.4 18.8 -81.2 20 -78.8 C18.8 -78 16 -77.8 14.4 -79 Z'],
    stern: ['M5 -79.6 C7 -80.6 10.2 -79.4 11.8 -76.6 C9.6 -76.4 6.6 -77.4 5 -79.6 Z', 'M13.6 -76.8 C15 -79.4 18 -80.4 19.8 -79.4 C18.4 -77.4 15.8 -76.6 13.6 -76.8 Z'],
  };
  const brows = k => BROWS[k].map(d => `<path d="${d}" style="fill:#f6f1e6;stroke:var(--line);stroke-width:1;stroke-linejoin:round"/>`).join('');

  /* public: o = { id, facing, pose: 'carry'|'tuck', face, mode: 'art'|'flat'|'blocks'|'lines'|'nosil', hide: { rakusu, head }, upto, shadow } */
  window.monkV3 = function (o) {
    o = Object.assign({ facing: 'right', pose: 'carry', face: 'kind', mode: 'art', shadow: true }, o);
    const ls = build(o).slice(0, o.upto || 99);
    const art = ls.map(l => `<g data-layer="${l.name}">${l.svg}</g>`).join('');
    const flip = o.facing === 'left' ? ' transform="scale(-1 1)"' : '';
    const sl = o.pose === 'carry' ? SLEEVE.carryNear : SLEEVE.tuckNear;
    return `<g class="m3" id="${o.id}">
      <defs><clipPath id="${o.id}-body"><path d="${BODY}"/></clipPath><clipPath id="${o.id}-head"><path d="${HEAD}"/></clipPath><g id="${o.id}-art">${art}</g></defs>
      ${o.shadow ? '<ellipse cx="1" cy="1.4" rx="25" ry="4.2" class="m3shadow"/>' : ''}
      <g${flip}>${o.mode === 'nosil' ? '' : `<use href="#${o.id}-art" class="m3-sil"/>`}<use href="#${o.id}-art"/></g>
    </g>`;
  };
  window.monkV3Layers = o => build(Object.assign({ facing: 'right', pose: 'carry', face: 'kind', mode: 'art', id: 'x' }, o)).map(l => l.name);
  window.monkV3Lines = pose => (pose === 'carry' ? [SLEEVE.carryNear] : [SLEEVE.tuckNear, SLEEVE.tuckFar]).flatMap(s => s.lines.map(([k, w, d, t]) => ({ k, d, t })));
  window.MONK3_SKELETON = {
    carry: { head: [3, -74], neck: [4, -56], shN: [-14.5, -46.5], shF: [13, -48.5], elN: [-18.4, -30.5], wrN: [-7.6, -21.2], hdN: [-2.5, -20], elF: [15.6, -32], wrF: [16.6, -18], hidF: true },
    tuck: { head: [3, -74], neck: [4, -56], shN: [-14.5, -46.5], shF: [13, -48.5], elN: [-17.6, -29.5], wrN: [6.4, -25.5], hdN: [9.4, -25.2], elF: [20.6, -31.5], wrF: [4, -25.8], hdF: [1.2, -25.6] },
  };
  window.MONK3_KCOL = KCOL;
})();
