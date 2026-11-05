/* =====================================================================
   Round 4.2A-1 — refined candidate views of the monk (A: conservative, B: more character).

   What went wrong in 4.2A (monk-views.js), and what this file does instead:
   • 4.2A drew every view's ears BEHIND the head (the accepted 3/4 draws its ear ON the head's edge), so in the
     halfway frames only half an ear stuck out, with its whole outline: it looked pasted on.
   • Ears, eyes, brows, mouth and the head outline were each blended separately between two drawings, so they
     stood for different turn angles; and the back view had his right ear on OUR left (from behind it is on our
     right), so the back-3/4 turned the head one way and the body the other.
   Here the face, the ears, the collar, the chest panel and the robe's seams all come from ONE turn angle θ
   (0 = facing us, 90 = facing right, 180 = back to us, negative = facing left): each is a point at a fixed place
   around the head or the neck, projected and shown only while it faces us. It is calibrated on the accepted 3/4:
   at θ = 35° the eyes land within a unit of the accepted ones and the ears sit 103° round from the face.
   The bodies (robe, sleeves, hands, keisaku) are drawn per view, by design, in two candidates.
   He always holds the keisaku in his RIGHT hand. The accepted drawing is untouched; the left-facing pose that
   keeps the keisaku in his right hand reuses the accepted head, robe and collar exactly (acc34 below).
   ===================================================================== */
(function () {
  'use strict';
  const MK = MONK4, PT = MK.parts, { spline, curve } = MK, ART = PT.ART, ink = 'var(--line)', ribbon = PT.ribbon;
  const RAD = Math.PI / 180, sn = a => Math.sin(a * RAD), cs = a => Math.cos(a * RAD), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const L = (d, w = 1.1, op = 1) => `<path d="${d}" style="fill:none;stroke:${ink};stroke-width:${w};stroke-linecap:round;stroke-linejoin:round;opacity:${op}"/>`;
  const fill = (d, c, s) => `<path class="m4p" d="${d}" style="--c:${c}" ${s ? 'data-s="1"' : ''}/>`;
  const det = s => `<g class="m4det">${s}</g>`;
  const P = (pts, closed = true) => spline(pts, closed);
  const f2 = v => (+v).toFixed(2);
  const fistD = pts => det(`<path d="${P(pts)}" style="fill:${ART.skin};stroke:${ink};stroke-width:1.2;stroke-linejoin:round"/>`);
  const fingers = pts => L(P(pts, false), .7, .42);
  const stickD = s => det(MK.stick(s, { ...ART, band: ART.bandC }, ink));
  const mx = pts => pts.map(([x, y]) => [-x, y]);
  const tr = (pts, dx, dy = 0, sx = 1) => pts.map(([x, y]) => [x * sx + dx, y + dy]);
  const rs = (pts, n, closed = true) => curve(pts, n, closed);
  function mxr(pts) { const m = mx(pts).reverse(); let k = 0; m.forEach((q, i) => { if (q[0] + q[1] < m[k][0] + m[k][1]) k = i; }); return m.slice(k).concat(m.slice(0, k)); }
  const lerpP = (A, B, t) => A.map((q, i) => [q[0] + (B[i][0] - q[0]) * t, q[1] + (B[i][1] - q[1]) * t]);
  function cubicPts(d) {
    const n = d.match(/-?\d*\.?\d+/g).map(Number), out = []; let x = n[0], y = n[1];
    for (let i = 2; i + 5 < n.length; i += 6) { const [a, b, c, e, f, g] = n.slice(i, i + 6);
      for (let k = 1; k <= 20; k++) { const t = k / 20, m = 1 - t; out.push([m * m * m * x + 3 * m * m * t * a + 3 * m * t * t * c + t * t * t * f, m * m * m * y + 3 * m * m * t * b + 3 * m * t * t * e + t * t * t * g]); } x = f; y = g; }
    return out;
  }
  const IDLE = MK.POSE.idle, STAND = MK.POSE.stand, NS = 40;
  const ROBE_SYM = PT.ROBE.map((p, i) => { const q = PT.ROBE[(20 - i) % 20]; return [(p[0] - q[0]) / 2, (p[1] + q[1]) / 2]; });
  const sl = (pts, layer, reversed = false) => { let q = rs(pts, NS); if (reversed) q = [q[0], ...q.slice(1).reverse()]; return { pts: q, layer, inner: reversed ? [NS - 37, NS - 15] : [15, 37] }; };
  const slBlend = (a, b, t, layer) => ({ pts: lerpP(a.pts, b.pts, t), layer, inner: t < .5 ? a.inner : b.inner });

  /* ---------- the head's outline at an angle (outlines only; nothing on the head is blended) ---------- */
  const H = {
    front: rs([[0, -94], [-10.5, -91.8], [-17.2, -85], [-19.4, -75], [-18, -65.8], [-13.4, -59], [-6.4, -55], [0, -54.2], [6.4, -55], [13.4, -59], [18, -65.8], [19.4, -75], [17.2, -85], [10.5, -91.8]], 48),
    acc: rs(cubicPts(PT.HEAD), 48),
    back: rs([[0, -94], [-10.5, -91.8], [-17.2, -85], [-19.4, -75], [-18.4, -66.4], [-14.6, -60.6], [-8, -57.8], [0, -57.2], [8, -57.8], [14.6, -60.6], [18.4, -66.4], [19.4, -75], [17.2, -85], [10.5, -91.8]], 48),
  };
  function headAt(th) {
    const a = Math.abs(th), k = a <= 35 ? lerpP(H.front, H.acc, a / 35) : a <= 90 ? H.acc : lerpP(H.acc, H.back, (a - 90) / 90);
    return th < 0 ? k.map(([x, y]) => [-x, y]).reverse() : k;
  }
  const FRONT_HALF = y => { let best = 0; for (const [x, yy] of H.front) if (x > 0 && Math.abs(yy - y) < 2.2) best = Math.max(best, x); return best || 19.4; };
  // where a closed outline crosses the horizontal line at y: [leftmost, rightmost] (exact edge intersections)
  const span = (pts, y) => { const xs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length];
    if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])); } return xs.length ? [Math.min(...xs), Math.max(...xs)] : [-19, 19]; };

  /* ---------- the face and the ears at an angle ---------- */
  const EAR = cubicPts(PT.EAR), EARC = EAR.reduce((a, q) => [a[0] + q[0] / EAR.length, a[1] + q[1] / EAR.length], [0, 0]);
  const EAR_AZ = 103.4, EYE_AZ = 15.5, EAR_FULL = 9.36;
  function headParts(th, face = 'kind') {
    const out = { th, outline: headAt(th) }, sp = span(out.outline, -75), c = (sp[0] + sp[1]) / 2;
    const X = (az, y, k = 1) => c + FRONT_HALF(y) * k * sn(az + th), Z = az => cs(az + th);
    const inside = (x, y, m) => { const s = span(out.outline, y); return clamp(x, s[0] + m, s[1] - m); };
    // eyes (his right eye at −EYE_AZ), narrower as they turn away, hidden when they face away
    // (a chibi face keeps its eyes inside the head even near profile: they narrow less than a sphere would, and stay a little in from the edge)
    out.eyes = [-EYE_AZ, EYE_AZ].map(az => { const z = Z(az), rx = 1.99 * (.55 + .45 * z); return { az, z, show: z > .12, x: inside(X(az, -72.6), -72.6, rx + 2.4 + 2.2 * (1 - z)), y: -72.6, rx, ry: 2 + .32 * z }; });
    out.brows = out.eyes.map((e, i) => ({ show: e.show, x: e.x + (i === 0 ? -.45 : .45), sx: (.55 + .45 * e.z) / (.55 + .45 * .93), mirror: i === 1 }));
    const zm = cs(th); out.mouth = { show: zm > -.15, x: inside(c + FRONT_HALF(-64) * 1.2 * sn(th), -64, 3.4 + 1.6 * (1 - Math.max(0, zm))), sx: (.45 + .55 * Math.max(0, zm)) / (.45 + .55 * cs(35)) };
    const aR = -34 + (th >= 0 ? 10 : 9) * th / 35, aL = 34 + (th >= 0 ? 9 : 10) * th / 35;
    out.blush = [aR, aL].map(az => { const z = Z(az); return { show: z > .05, x: X(az, -66.3), y: -66.3, rx: 3.64 * (.4 + .6 * z), ry: 2 * (.75 + .25 * z) }; });
    // ears: 103° round from the face; on the head (like the accepted 3/4) unless clearly behind it
    // its size follows the way the ear's surface faces (a little forward of straight out), calibrated to the
    // accepted ear at 35°: narrow from the front and from behind, fullest from the side
    out.ears = [-EAR_AZ, EAR_AZ].map(az => { const z = Z(az), nz = cs(az + Math.sign(-az) * 40 + th), x = X(az, EARC[1]), w = 6.8 * (.5 + .5 * Math.abs(nz)), right = x > c;
      const pts = EAR.map(([px, py]) => [(px - EARC[0]) * (w / 6.4) * (right ? -1 : 1) + x, py]);
      return { az, z, x, w, right, onTop: z > -.45, line: z > -.45 && cs(th) > -.3, pts }; });
    out.shade = Math.abs(th) > 10 && Math.abs(th) < 120 ? (th > 0 ? 'side' : 'sideR') : Math.abs(th) >= 110 ? 'nape' : '';
    out.tilt = clamp(2 * sn(th) / sn(35), -2, 2) * (Math.abs(th) > 120 ? .5 : 1);
    out.face = face; out.c = c;
    return out;
  }
  function drawHead(h, id) {
    const B = PT.BROW[h.face], blushO = PT.BLUSH[h.face] ?? .6, lower = h.outline.slice(12, 37);
    const earD = e => fill(P(e.pts), ART.skin, 1);
    const earLine = e => { if (!e.line) return ''; const s = e.right ? -1 : 1, k = e.w / 6.4, x0 = e.x + .6 * k * s; return L(`M${f2(x0)} -74 q${f2(-2 * k * s)} 1.8 ${f2(-.4 * k * s)} 4.4`, .9, .55); };
    const shade = h.shade === 'side' ? `<path d="M-6 -95 C-15 -88 -17 -74 -13 -64 C-10 -58.6 -6 -56 -1 -54.6 L-30 -50 L-30 -100 Z" style="fill:var(--skin-lo);opacity:.5"/>`
      : h.shade === 'sideR' ? `<path transform="scale(-1 1)" d="M-6 -95 C-15 -88 -17 -74 -13 -64 C-10 -58.6 -6 -56 -1 -54.6 L-30 -50 L-30 -100 Z" style="fill:var(--skin-lo);opacity:.5"/>`
      : h.shade === 'nape' ? `<path d="M-21 -70 C-15 -61.5 15 -61.5 21 -70 L21 -50 L-21 -50 Z" style="fill:var(--skin-lo);opacity:.32"/>` : '';
    const eye = e => e.show ? `<ellipse cx="${f2(e.x)}" cy="${f2(e.y)}" rx="${f2(e.rx)}" ry="${f2(e.ry)}" style="fill:${ink}"/>` : '';
    const brow = (b, i) => b.show ? `<path d="${B[0]}" transform="translate(${f2(b.x)} 0) scale(${f2((b.mirror ? -1 : 1) * b.sx)} 1) translate(-7.9 0)" style="fill:#f6f1e6;stroke:${ink};stroke-width:1;stroke-linejoin:round"/>` : '';
    const blush = b => b.show ? `<ellipse cx="${f2(b.x)}" cy="${f2(b.y)}" rx="${f2(b.rx)}" ry="${f2(b.ry)}" style="fill:var(--blush);opacity:${blushO}"/>` : '';
    const m = h.mouth, mouth = m.show ? `<g transform="translate(${f2(m.x)} 0) scale(${f2(m.sx)} 1) translate(-13.9 0)">${L('M11.4 -64 q2.6 2 5 -.2', 1.4)}</g>` : '';
    return `<g transform="rotate(${f2(h.tilt)} 3 -56)">` + h.ears.filter(e => !e.onTop).map(earD).join('') + fill(P(h.outline), ART.skin)
      + det(`<g clip-path="url(#${id}-head)">${shade}</g>` + L(P(lower, false), 1.25))
      + h.ears.filter(e => e.onTop).map(earD).join('')
      + det(h.ears.map(earLine).join('') + '<path d="M-7.4 -88.6 q5 -4.2 11 -4.6" style="fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;opacity:.5"/>'
        + `<g clip-path="url(#${id}-head)">` + h.blush.map(blush).join('') + h.eyes.map(eye).join('') + mouth + h.brows.map(brow).join('') + '</g>') + '</g>';
  }

  /* ---------- the collar, the chest panel and the robe's lines at an angle ---------- */
  // each side of the collar runs from the crossing (the V, a little to his right of centre) over the shoulder to the
  // middle of the nape; the side from his left shoulder is the one on top (as in the accepted drawing)
  const LAPEL = {
    near: [[0, -10.6, -45, 15, 3.4], [.55, -100, -59.6, 15, 8.5], [1, -180, -57.8, 9.5, 4.6]],
    far: [[0, -12.2, -44, 15, 3.4], [.55, 100, -58.4, 15, 8.5], [1, 180, -57.8, 9.5, 4.6]],
  };
  function lapel(side, th) {
    const K = LAPEL[side], pts = [];
    for (let i = 0; i <= 44; i++) { const s = i / 44; let j = 1; while (j < K.length - 1 && K[j][0] < s) j++;
      const a = K[j - 1], b = K[j], u = (s - a[0]) / (b[0] - a[0]), az = a[1] + (b[1] - a[1]) * u, y = a[2] + (b[2] - a[2]) * u, R = a[3] + (b[3] - a[3]) * u, w = a[4] + (b[4] - a[4]) * u;
      const z = cs(az + th); pts.push({ x: R * sn(az + th), y, z, w: w * (.6 + .4 * Math.max(0, z)), s }); }
    const runs = []; let cur = null; for (const q of pts) { if (q.z > -.02) { if (!cur) runs.push(cur = []); cur.push(q); } else cur = null; }
    return { pts, runs };
  }
  function ribbonW(run) {   // a band along points with their own widths
    const A = [], B = []; for (let i = 0; i < run.length; i++) { const a = run[Math.max(0, i - 1)], b = run[Math.min(run.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, h = run[i].w / 2;
      A.push([run[i].x - dy / l * h, run[i].y + dx / l * h]); B.push([run[i].x + dy / l * h, run[i].y - dx / l * h]); }
    return P(A, false) + ' L' + P(B.reverse(), false).slice(1) + ' Z';
  }
  function collarD(th, id) {
    const n = lapel('near', th), f = lapel('far', th), front = cs(th) > -.25;
    // the neck shows between the two sides (front only); the white under-collar and the inner edge lines are clipped to it
    let neck = '', clip = '';
    if (front) { const a = n.pts.filter(q => q.s <= .5 && q.z > 0), b = f.pts.filter(q => q.s <= .5 && q.z > 0);
      if (a.length > 2 && b.length > 2) { const poly = [...a.map(q => [q.x, q.y]), [Math.max(a[a.length - 1].x, b[b.length - 1].x) * .5 + Math.min(a[a.length - 1].x, b[b.length - 1].x) * .5, -62], ...b.reverse().map(q => [q.x, q.y])];
        neck = `<path d="M${poly.map(q => f2(q[0]) + ' ' + f2(q[1])).join(' L')} Z" style="fill:${ART.neck}"/>`;
        clip = `<clipPath id="${id}-neck"><path d="M${poly.map(q => f2(q[0]) + ' ' + f2(q[1])).join(' L')} Z"/></clipPath>`; } }
    const band = run => `<path d="${ribbonW(run)}" style="fill:${ART.band}"/>`;
    const white = run => `<path d="${ribbonW(run.map(q => ({ ...q, w: q.w + 1.5 })))}" style="fill:${ART.white}"/>`;
    const edgeLine = run => { if (run.length < 3) return ''; const off = sgn => run.map((q, i) => { const a = run[Math.max(0, i - 1)], b = run[Math.min(run.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return [q.x + sgn * dy / l * q.w / 2, q.y - sgn * dx / l * q.w / 2]; });
      return L(P(off(1), false), .85, .7) + L(P(off(-1), false), .85, .7); };
    const inNeck = s => clip ? `<g clip-path="url(#${id}-neck)">${s}</g>` : '';
    return { defs: clip, body: `<g clip-path="url(#${id}-robe)">${neck}${inNeck(n.runs.map(white).join('') + f.runs.map(white).join(''))}${n.runs.map(band).join('')}${f.runs.map(band).join('')}${inNeck(n.runs.map(edgeLine).join('') + f.runs.map(edgeLine).join(''))}</g>` };
  }
  const RAKU = [[-0.6, -44.6], [6.6, -45.4], [14, -44.4], [14.4, -39.4], [13.6, -35.4], [6.4, -34.8], [-0.4, -35.6], [-1.2, -40]], RAKU_IN = [[1.4, -42.8], [6.6, -43.4], [12, -42.6], [12.2, -39.6], [11.6, -37.2], [6.4, -36.8], [1.6, -37.4], [1, -40]];
  function rakusuD(th, id) {
    if (cs(th) < -.05) return '';
    const cx = 11.5 * sn(th), k = (.45 + .55 * cs(th)) / (.45 + .55 * cs(35)), T = pts => pts.map(([x, y]) => [(x - 6.6) * k + cx, y]);
    return `<g clip-path="url(#${id}-robe)"><path d="${P(T(RAKU))}" style="fill:${ART.kesa};stroke:${ink};stroke-width:1.1"/><path d="${P(T(RAKU_IN))}" style="fill:none;stroke:${ART.bandC};stroke-width:.7;opacity:.55"/></g>`;
  }
  // a line drawn on the robe's surface between two azimuths (the front overlap, the back seam)
  function robeLine(robe, th, az0, y0, az1, y1, w, op) {
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, az = az0 + (az1 - az0) * u, y = y0 + (y1 - y0) * u, sp = span(robe, y), R = (sp[1] - sp[0]) / 2 * .96, c = (sp[0] + sp[1]) / 2;
      if (cs(az + th) > .05) pts.push([c + R * sn(az + th), y]); }
    return pts.length > 3 ? L(P(pts, false), w, op) : '';
  }

  /* ---------- the bodies: per view, per candidate ---------- */
  const shapeB = pts => pts.map(([x, y]) => { const hem = clamp((y + 14) / 14, 0, 1), belly = y > -40 && y < -12 ? Math.sin(Math.PI * (y + 40) / 28) : 0;
    const k = 1 + .07 * hem * hem * (3 - 2 * hem) + .035 * belly; return [x * k, y < -52 ? y + .5 * Math.min(1, Math.abs(x) / 12) : y]; });
  const ROBE_B = shapeB(ROBE_SYM);
  const PROFILE_A = tr(ROBE_SYM, 0, 0, .92);
  // side view: a straighter back, a rounder front (the belly the 3/4 has), the hem settling a little wider at the front
  const PROFILE_B = ROBE_B.map(([x, y]) => [x < 0 ? x * .9 : x * .98 + (y > -42 && y < -12 ? 2.8 * Math.sin(Math.PI * (y + 42) / 30) : 0) + (y > -8 ? 1.2 : 0), y]);
  const FEET = {
    front: [[[-12.6, -1.2], [-10, -4], [-4.6, -3.8], [-1.6, -1], [-3.6, 1.4], [-9.8, 1.6]], [[1.6, -1], [4.6, -3.8], [10, -4], [12.6, -1.2], [9.8, 1.6], [3.6, 1.4]]],
    back: [[[2.6, -1.4], [4.6, -3.4], [8.4, -3.4], [10.6, -1.6], [9, 0.8], [4.2, 0.8]], [[-10.6, -1.6], [-8.4, -3.4], [-4.6, -3.4], [-2.6, -1.4], [-4.2, 0.8], [-9, 0.8]]],
    profile: [[[-8, -1], [-4, -4], [3, -3.8], [8.2, -1.4], [5, 1.6], [-4, 1.6]], [[2, -1.6], [6, -3.8], [10.6, -3.4], [12.4, -1], [9.6, 1], [4, 1.2]]],
    acc: [PT.FEET.near, PT.FEET.far],
  };
  const feetMix = (a, b, t) => [0, 1].map(i => lerpP(rs(a[i], 16), rs(b[i], 16), t));
  const STICK = { front: { x: -12.63, y: -28.3, rot: 186, stretch: .88 }, acc: { x: -7.6, y: -28.4, rot: 204, stretch: 1 }, back: { x: 12.63, y: -28.3, rot: 174, stretch: .88 } };
  const stickMix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, rot: a.rot + (b.rot - a.rot) * t, stretch: a.stretch + (b.stretch - a.stretch) * t });
  // his right arm (holds the keisaku) and his left arm, as sleeves in each view
  const ARM = {
    right34: sl(IDLE.near, 'front'), left34: sl(PT.FAR_STAND, 'back'),
    rightFront: sl(IDLE.near, 'front'), leftFrontA: sl(mx(IDLE.near), 'front'), leftFrontB: sl(mx(STAND.near), 'front'),
    rightProfileA: sl(tr(IDLE.near, 11), 'front'), rightProfileB: sl(tr(IDLE.near, 10.5), 'front'), leftProfile: sl(tr(PT.FAR_STAND, -12), 'back'),
    rightBack: sl(mx(IDLE.near), 'front', true), leftBackA: sl(IDLE.near, 'front', true), leftBackB: sl(STAND.near, 'front', true),
  };
  function body(view, cand) {
    const B = cand === 'B';
    if (view === 'front') return { th: 0, robe: B ? ROBE_B : ROBE_SYM, feet: FEET.front,
      right: ARM.rightFront, left: B ? ARM.leftFrontB : ARM.leftFrontA,
      cuff: { cx: -13, cy: -24.4, rx: 4.3, ry: 3.8, r: 0 }, fist: { pts: tr(IDLE.hand, -4, .2), line: tr(IDLE.handLine, -4, .2), layer: 'front' },
      leftHand: { pts: mxr(STAND.hand), line: mx(STAND.handLine), layer: 'under', lineOp: .42 }, stick: { ...STICK.front, layer: 'front' } };
    if (view === 'p3mid') { const lf = B ? ARM.leftFrontB : ARM.leftFrontA;
      return { th: 17.5, robe: lerpP(PT.ROBE, B ? ROBE_B : ROBE_SYM, .5), feet: feetMix(FEET.acc, FEET.front, .5),
        right: ARM.rightFront, left: slBlend(ARM.left34, lf, .5, 'front'),
        cuff: { cx: -12.3, cy: -24.6, rx: 3.1, ry: 3.85, r: -4 }, fist: { pts: tr(IDLE.hand, -2, .1), line: tr(IDLE.handLine, -2, .1), layer: 'front' },
        leftHand: { pts: lerpP(PT.FAR_HAND, mxr(STAND.hand), .5), line: lerpP([[20.4, -16.4], [21.4, -14], [20.4, -11.8]], mx(STAND.handLine), .5), layer: 'under', lineOp: B ? .3 : 0 },
        stick: { ...stickMix(STICK.acc, STICK.front, .5), layer: 'front' } }; }
    if (view === 'profile') { const dx = B ? 10.5 : 11;
      return { th: 90, robe: B ? PROFILE_B : PROFILE_A, feet: FEET.profile, right: B ? ARM.rightProfileB : ARM.rightProfileA, left: ARM.leftProfile,
        cuff: { cx: -11.6 + dx, cy: -24.8, rx: 1.9, ry: 3.9, r: -8 }, fist: { pts: tr(IDLE.hand, dx), line: tr(IDLE.handLine, dx), layer: 'front' },
        leftHand: null, stick: { x: -7.6 + dx, y: -28.4, rot: 204, stretch: 1, layer: 'front' } }; }
    if (view === 'back34') { const rp = B ? ARM.rightProfileB : ARM.rightProfileA, lb = B ? ARM.leftBackB : ARM.leftBackA;
      return { th: 135, robe: lerpP(B ? PROFILE_B : PROFILE_A, B ? ROBE_B : ROBE_SYM, .5), feet: feetMix(FEET.profile, FEET.back, .5),
        right: slBlend(rp, ARM.rightBack, .5, 'front'), left: slBlend(ARM.leftProfile, lb, .5, 'back'),
        cuff: null, fist: null, leftHand: null, stick: { ...stickMix({ x: -7.6 + (B ? 10.5 : 11), y: -28.4, rot: 204, stretch: 1 }, STICK.back, .5), layer: 'under' } }; }
    if (view === 'back') return { th: 180, robe: B ? ROBE_B : ROBE_SYM, feet: FEET.back, right: ARM.rightBack, left: B ? ARM.leftBackB : ARM.leftBackA,
      cuff: null, fist: null, leftHand: null, stick: { ...STICK.back, layer: 'under' } };
    throw new Error('no view ' + view);
  }
  function sleeveD(s) { return fill(P(s.pts), ART.robe) + (s.layer === 'front' ? det(L(P(s.pts.slice(s.inner[0], s.inner[1]), false), 1.15)) : ''); }
  function wrap(id, out, robe, head, defs = '', facingLeft = false) {
    return `<g class="m4" id="${id}"><defs><clipPath id="${id}-robe"><path d="${P(robe)}"/></clipPath><clipPath id="${id}-head"><path d="${P(head)}"/></clipPath>${defs}<g id="${id}-art">${out.join('')}</g></defs>`
      + `<ellipse cx="1" cy="1.4" rx="27" ry="4.2" class="m4shadow"/><g${facingLeft ? ' transform="scale(-1 1)"' : ''}><use href="#${id}-art" class="m4-sil"/><use href="#${id}-art"/></g></g>`;
  }
  function viewTT(view, cand, o = {}) {
    const id = o.id || 'tt', b = body(view, cand), th = b.th, h = headParts(th, o.face || 'kind'), col = collarD(th, id), out = [];
    const hand = (hd) => fill(P(hd.pts), ART.skin, 1) + (hd.lineOp ? det(L(P(hd.line, false), .7, hd.lineOp)) : '');
    // behind the robe
    if (b.left.layer === 'back') out.push(sleeveD(b.left));
    if (b.right.layer === 'back') out.push(sleeveD(b.right));
    out.push(fill(P(b.feet[0]), ART.foot) + fill(P(b.feet[1]), ART.foot));
    out.push(fill(P(b.robe), ART.robe));
    out.push(det(robeLine(b.robe, th, -14, -36, -37, -3, 1, .45) + robeLine(b.robe, th, 180, -56, 180, -3, 1, .3)));
    out.push(det(col.body)); out.push(det(rakusuD(th, id)));
    // the keisaku behind his sleeve (from behind), then the sleeves in front of the robe
    if (b.stick.layer === 'under') out.push(stickD(b.stick));
    if (b.leftHand && b.leftHand.layer === 'under') out.push(hand(b.leftHand));
    if (b.left.layer === 'front') out.push(sleeveD(b.left));
    if (b.right.layer === 'front') out.push(sleeveD(b.right));
    if (b.cuff) out.push(det(`<ellipse cx="${f2(b.cuff.cx)}" cy="${f2(b.cuff.cy)}" rx="${f2(b.cuff.rx)}" ry="${f2(b.cuff.ry)}" transform="rotate(${b.cuff.r} ${f2(b.cuff.cx)} ${f2(b.cuff.cy)})" style="fill:#26345a;stroke:${ink};stroke-width:.85"/>`));
    if (b.stick.layer === 'front') out.push(stickD(b.stick));
    if (b.fist) out.push(fistD(b.fist.pts) + det(fingers(b.fist.line)));
    out.push(drawHead(h, id));
    return wrap(id, out, b.robe, h.outline, col.defs);
  }

  /* ---------- the accepted 3/4, rebuilt from its own parts (so a new arm arrangement keeps its head, robe, collar) ----------
     arms: 'idle' = his right hand holds the keisaku in front (the accepted pose);
           'keep' = drawn as the mirror image for facing left, but the keisaku stays in his RIGHT hand, which is
                    now the far one: the near arm hangs empty, the far hand holds the board at his side */
  function acc34(o = {}) {
    const id = o.id || 'ac', left = !!o.left, out = [], face = 'kind';
    const near = [[-13.6, -59.6], [-9, -56.8], [-3.6, -53.8], [2.4, -48.8], [6.2, -45]], far = [[12.8, -58.4], [10.6, -54.2], [7.8, -48.6], [5.8, -44]];
    const nearB = `<path d="${ribbon(near, 7.6, 3.2)}" style="fill:${ART.band}"/>`, farB = `<path d="${ribbon(far, 3, 2.8)}" style="fill:${ART.band}"/>`;
    const edge = (pts, sideSign, w) => pts.map((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [q[0] + sideSign * dy / l * w, q[1] - sideSign * dx / l * w]; });
    const keep = o.arms === 'keep', K = o.keep || {};
    // far arm, behind the robe
    out.push(fill(P(PT.FAR_STAND), ART.robe) + (keep ? '' : fill(P(PT.FAR_HAND), ART.skin, 1)));
    if (keep) out.push(stickD(K.stick) + fistD(K.fist) + det(fingers(K.fistLine)));
    out.push(fill(P(PT.FEET.far), ART.foot) + fill(P(PT.FEET.near), ART.foot) + det(L('M1.6 -0.8 C1.6 1 -1 1.6 -4 1.7', .9, .5)));
    out.push(fill(P(PT.ROBE), ART.robe));
    out.push(det(L(P(left ? [[11.2, -36], [12.4, -22], [12.8, -3.4]] : [[0.6, -36], [-0.4, -22], [-0.8, -3]], false), 1, .45)));
    out.push(det(`<g clip-path="url(#${id}-robe)">
      <path d="${P([[-4, -56], [1.4, -51], [5.8, -46.4], [9.8, -52.6], [12, -57], [4, -58.6]])}" style="fill:${ART.neck}"/>
      <path d="${ribbon([[-3, -55.6], [1.6, -51], [5.6, -46.2]], 1.8, 1.2)}" style="fill:${ART.white}"/>
      <path d="${ribbon([[11.4, -56.6], [9.4, -52], [6.6, -46.4]], 1.6, 1.1)}" style="fill:${ART.white}"/>
      ${left ? farB + nearB : nearB + farB}
      ${left ? L(P(edge(far.slice(1), -1, 1.4), false), .8, .6) + L(P(edge(near.slice(2), 1, 1.6), false), .9, .75)
             : L(P(edge(near.slice(2), 1, 1.6), false), .8, .6) + L(P(edge(far.slice(1), -1, 1.4), false), .9, .75)}
    </g>`));
    out.push(det(`<path d="${P(RAKU)}" style="fill:${ART.kesa};stroke:${ink};stroke-width:1.1"/><path d="${P(RAKU_IN)}" style="fill:none;stroke:${ART.bandC};stroke-width:.7;opacity:.55"/>`));
    if (!keep) { const c = IDLE.cuffO;
      out.push(fill(P(curve(IDLE.near, MK.DENSE.near, true)), ART.robe) + det(L(P(curve(IDLE.nearLine, MK.DENSE.line, false), false), 1.15)
        + `<ellipse cx="${c.cx}" cy="${c.cy}" rx="${c.rx}" ry="${c.ry}" transform="rotate(${c.r} ${c.cx} ${c.cy})" style="fill:#26345a;stroke:${ink};stroke-width:.85"/>`)
        + stickD(IDLE.stick) + fistD(IDLE.hand) + det(fingers(IDLE.handLine)));
    } else out.push(fill(P(STAND.hand), ART.skin, 1) + det(L(P(STAND.handLine, false), .8, .55)) + fill(P(STAND.near), ART.robe) + det(L(P(STAND.nearLine, false), 1.15)));
    out.push(`<g transform="rotate(2 3 -56)">` + fill(PT.HEAD, ART.skin) + det(`<g clip-path="url(#${id}-head)"><path d="M-6 -95 C-15 -88 -17 -74 -13 -64 C-10 -58.6 -6 -56 -1 -54.6 L-30 -50 L-30 -100 Z" style="fill:var(--skin-lo);opacity:.5"/></g>` + L(PT.HEAD_LOWER, 1.25))
      + fill(PT.EAR, ART.skin, 1) + det(L('M-15 -74 q-2 1.8 -.4 4.4', .9, .55) + '<path d="M-7.4 -88.6 q5 -4.2 11 -4.6" style="fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;opacity:.5"/>'
      + `<ellipse cx="5.6" cy="-66.4" rx="3.6" ry="2" style="fill:var(--blush);opacity:${PT.BLUSH[face]}"/><ellipse cx="19.6" cy="-66.2" rx="1.8" ry="1.6" style="fill:var(--blush);opacity:${PT.BLUSH[face]}"/>`
      + `<ellipse cx="8.4" cy="-72.6" rx="1.9" ry="2.3" style="fill:${ink}"/><ellipse cx="16.6" cy="-72.6" rx="1.6" ry="2.2" style="fill:${ink}"/>` + L('M11.4 -64 q2.6 2 5 -.2', 1.4)
      + PT.BROW[face].map(d => `<path d="${d}" style="fill:#f6f1e6;stroke:${ink};stroke-width:1;stroke-linejoin:round"/>`).join('')) + '</g>');
    return `<g class="m4" id="${id}">
      <defs><clipPath id="${id}-robe"><path d="${P(PT.ROBE)}"/></clipPath><clipPath id="${id}-head"><path d="${PT.HEAD}"/></clipPath><g id="${id}-art">${out.join('')}</g></defs>
      <ellipse cx="1" cy="1.4" rx="27" ry="4.2" class="m4shadow"/>
      <g${left ? ' transform="scale(-1 1)"' : ''}><g transform="rotate(0) scale(1 1)"><use href="#${id}-art" class="m4-sil"/><use href="#${id}-art"/></g></g>
    </g>`;
  }
  // facing left with the keisaku still in his right hand (drawn facing right with it in the far hand, then mirrored).
  // A: the far fist just shows past the robe's edge, the board hangs along his side.
  // B: the far hand is held a little further forward and the board angled forward, so it reads clearly in his hand.
  function keepGrip(cand) {
    const fc = cand === 'B' ? [21.4, -26] : [19.8, -25.2], rot = cand === 'B' ? 160 : 168, stretch = cand === 'B' ? 1 : .95;
    const FIST = MK.FIST, FL = MK.FIST_LINE, fist = FIST.map(([x, y]) => [x + fc[0], y + fc[1]]), line = FL.map(([x, y]) => [x + fc[0], y + fc[1]]);
    const r = rot * RAD, origin = [fc[0] - 3.5 * Math.sin(r), fc[1] + 3.5 * Math.cos(r)];
    return { stick: { x: origin[0], y: origin[1], rot, stretch }, fist, fistLine: line };
  }

  /* ---------- public ---------- */
  const VIEWS = { front: 'P1 正面', back: 'P2 背面', p3mid: 'P3 中間（側面 → 正面）', profile: 'P4 側面', back34: 'P4 背面 3/4', q34L: '面向左・香板仍在右手' };
  function view(name, cand, o = {}) {
    if (name === 'accepted') return MK.art({ id: o.id || 'acc', pose: 'idle', facing: o.facing });
    if (name === 'q34L') return acc34({ id: o.id, left: true, arms: 'keep', keep: keepGrip(cand) });
    if (name === 'q34Lmirror') return MK.art({ id: o.id || 'acm', pose: 'idle', facing: 'left' });   // the accepted mirror (the keisaku changes hands)
    return viewTT(name, cand, o);
  }
  window.MONK_VIEWS2 = { VIEWS, view, headParts, body, acc34, keepGrip, lapel };
})();
