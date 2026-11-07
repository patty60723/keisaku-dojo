/* =====================================================================
   Round 4.1 — where the monk may walk in the zendo, and a check that he never walks through the mochi.

   Scene units are the 400 × 300 viewBox of the stage (the stage keeps 4:3, so nothing is cropped at any phone width).
   A position is the point between the monk's feet on the floor: x across, y = depth on screen (bigger = nearer).

   • Depth: a limited scale, s(y) = 1 + 0.003 (y − 254), clamped to 0.9 … 1.1. At y = 254 (where Round 3.5 was
     accepted, and where he strikes) s = 1, so the accepted reminder is drawn exactly as before.
   • Layers: by depth only — behind the mochi while his feet are behind hers (y ≤ 257), in front of her and her
     cushion when they are in front. Never "on top because he is in front": in front he must also be clear of her.
   • Safe zone, on the floor: the cushion (ellipse 38 × 9 at (206, 256)) and the mat (trapezoid y 262–274) grown by
     4 units. The monk's footprint is an ellipse of his full outline width (± 31 · s), 8 · s deep — not his centre.
   • On screen, while he is in front: his whole outline box (± 32.4 · s wide, 103 · s tall, measured from the drawing
     with the keisaku hanging, both facings, plus the outline stroke) must not touch the mochi (body + cushion, + 3).
   Paths are fixed waypoints joined by smooth (centripetal Catmull-Rom) legs between stops; the speed eases in and
   out at stops. Routes are played in a fixed order, so every review is the same.
   ===================================================================== */
(function (root) {
  'use strict';
  const MOCHI = { x: 206, y: 257 }, STANCE = { x: 132, y: 254 };
  const MONK_BOX = { x0: -32.4, x1: 32.4, y0: -103.3, y1: 7.8 };      // getBBox of the idle / stand art ± 2.2 stroke
  const FOOT = { rx: 31, ry: 8 };
  const FLOOR = { x0: 0, x1: 400, back: 196, front: 291 };            // the wall meets the floor at 189; front wood at 291
  const SPEED = 30;                                                   // units / s while patrolling (Round 1: 34)
  const depth = y => Math.max(.9, Math.min(1.1, 1 + .003 * (y - 254)));
  const inFront = y => y > MOCHI.y;

  /* ---------- waypoints (measured against the scene, see patrol-review.html) ---------- */
  const N = {
    BL: { x: 118, y: 224, zh: '後方左' }, BC: { x: 206, y: 220, zh: '後方中' }, BR: { x: 294, y: 224, zh: '後方右' },
    LS: { x: 116, y: 250, zh: '左側（繞行入口）' }, LF: { x: 104, y: 282, zh: '左前' },
    RS: { x: 306, y: 252, zh: '右側（繞行入口）' }, RF: { x: 314, y: 282, zh: '右前' },
    ST: { x: STANCE.x, y: STANCE.y, zh: '提醒站位（3.5）' },
  };
  const EDGES = [['BL', 'BC'], ['BC', 'BR'], ['BL', 'LS'], ['LS', 'LF'], ['LS', 'ST'], ['BL', 'ST'], ['BR', 'RS'], ['RS', 'RF']];
  // fixed review routes: legs between stops; a stop can face the mochi ('mochi') and dwell
  const R = (zh, stops) => ({ zh, stops });
  const ROUTES = {
    back: R('後方巡堂', [['BL'], ['BC', { dwell: 900 }], ['BR', { dwell: 900 }], ['BC', { dwell: 600 }], ['BL', { dwell: 600 }]]),
    left: R('左側繞行', [['BL'], ['LS', 'LF', { dwell: 1400, face: 'mochi' }], ['LS', 'BL', { dwell: 600 }]]),
    right: R('右側繞行', [['BR'], ['RS', 'RF', { dwell: 1400, face: 'mochi' }], ['RS', 'BR', { dwell: 600 }]]),
    around: R('左前 → 右前（繞回後方）', [['LF', { face: 'mochi' }], ['LS', 'BL', 'BC', 'BR', 'RS', 'RF', { dwell: 1200, face: 'mochi' }]]),
  };

  /* ---------- geometry ---------- */
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  function catmull(pts, perSeg = 40) {     // centripetal Catmull-Rom through pts, ends extended by reflection
    const P = [{ x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y }, ...pts, { x: 2 * pts[pts.length - 1].x - pts[pts.length - 2].x, y: 2 * pts[pts.length - 1].y - pts[pts.length - 2].y }];
    const out = [{ x: pts[0].x, y: pts[0].y }];
    for (let i = 1; i < P.length - 2; i++) {
      const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
      const t0 = 0, t1 = t0 + Math.sqrt(dist(p0, p1)) || 1e-6, t2 = t1 + Math.sqrt(dist(p1, p2)) || 1e-6, t3 = t2 + Math.sqrt(dist(p2, p3)) || 1e-6;
      for (let k = 1; k <= perSeg; k++) {
        const t = t1 + (t2 - t1) * k / perSeg, L = (a, b, ta, tb) => ({ x: (tb - t) / (tb - ta) * a.x + (t - ta) / (tb - ta) * b.x, y: (tb - t) / (tb - ta) * a.y + (t - ta) / (tb - ta) * b.y });
        const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3), B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
        out.push(L(B1, B2, t1, t2));
      }
    }
    out[out.length - 1] = { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
    return out;
  }
  function arcTable(pts) { const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + dist(pts[i - 1], pts[i])); return d; }
  const smooth = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  // one leg from a stop to the next: positions on the curve, and a time table with eased start and stop
  // (Round 4.2B: a waypoint may also be a point {x, y} — where he is when a reminder interrupts him — and a leg may
  // have its own speed: opts.speed, units / s)
  function makeLeg(names, opts = {}) {
    const way = names.map(n => typeof n === 'string' ? N[n] : n), V = opts.speed || SPEED;
    // opts.straight: along the waypoints in straight stretches (a purposeful walk, turning at each waypoint)
    const pts = way.length < 2 ? [way[0]] : opts.straight ? way.slice(1).reduce((acc, b, i) => { const a = way[i], n = Math.max(1, Math.ceil(dist(a, b) / .5)); for (let k = 1; k <= n; k++) acc.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }); return acc; }, [{ x: way[0].x, y: way[0].y }]) : catmull(way);
    const D = arcTable(pts), L = D[D.length - 1];
    const A = Math.min(opts.speed ? 18 : 12, L / 3), B = Math.min(18, L / 2.5), v = d => V * Math.max(.12, Math.min(1, smooth(d / A), smooth((L - d) / B)));
    const T = [0]; for (let i = 1; i < pts.length; i++) T.push(T[i - 1] + (D[i] - D[i - 1]) / v((D[i] + D[i - 1]) / 2) * 1000);
    const total = T[T.length - 1];
    function at(t) {     // → { x, y, tx, ty } (tangent) at leg time t (ms)
      t = Math.max(0, Math.min(total, t)); let i = 1; while (i < T.length - 1 && T[i] < t) i++;
      const u = (t - T[i - 1]) / ((T[i] - T[i - 1]) || 1), a = pts[i - 1], b = pts[i] || a;
      const l = dist(a, b) || 1; return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, tx: (b.x - a.x) / l, ty: (b.y - a.y) / l };
    }
    return { names, pts, D, L, T, total, at, dwell: opts.dwell || 0, face: opts.face || null };
  }
  // a route = legs between its stops (each stop entry: [...waypoints passed, stopName, {opts}])
  function makeRoute(key) {
    const r = ROUTES[key], legs = []; let from = r.stops[0][0];
    for (const s of r.stops.slice(1)) { const names = s.filter(x => typeof x === 'string'), o = s.find(x => typeof x === 'object') || {}; legs.push(makeLeg([from, ...names], o)); from = names[names.length - 1]; }
    return { key, zh: r.zh, start: r.stops[0][0], startFace: (r.stops[0].find(x => typeof x === 'object') || {}).face, legs };
  }
  // shortest way over the waypoint graph (to the reminder stance, or anywhere)
  function pathTo(from, to) {
    const dd = {}, prev = {}, todo = new Set(Object.keys(N)); for (const k of todo) dd[k] = Infinity; dd[from] = 0;
    while (todo.size) { let u = null; for (const k of todo) if (u === null || dd[k] < dd[u]) u = k; todo.delete(u); if (u === to) break;
      for (const [a, b] of EDGES) { const v = a === u ? b : b === u ? a : null; if (v && todo.has(v)) { const nd = dd[u] + dist(N[u], N[v]); if (nd < dd[v]) { dd[v] = nd; prev[v] = u; } } } }
    const out = [to]; while (out[0] !== from) { if (!prev[out[0]]) return null; out.unshift(prev[out[0]]); } return out;
  }
  const legToStance = from => { const p = pathTo(from, 'ST'); return p && p.length > 1 ? makeLeg(p, { face: 'right' }) : null; };

  /* ---------- the mochi as shapes ---------- */
  function cubicPts(d, ox, oy) {     // sample an M … C … Z path made only of cubic curves
    const n = d.match(/-?\d*\.?\d+/g).map(Number), out = []; let x = n[0], y = n[1];
    for (let i = 2; i + 5 < n.length; i += 6) { const [a, b, c, e, f, g] = n.slice(i, i + 6);
      for (let k = 1; k <= 24; k++) { const t = k / 24, m = 1 - t; out.push({ x: ox + m * m * m * x + 3 * m * m * t * a + 3 * m * t * t * c + t * t * t * f, y: oy + m * m * m * y + 3 * m * m * t * b + 3 * m * t * t * e + t * t * t * g }); } x = f; y = g; }
    return out;
  }
  const BODY_D = 'M-34 0 C-38 -10 -36 -30 -26 -48 C-18 -62 -8 -68 0 -68 C8 -68 18 -62 26 -48 C36 -30 38 -10 34 0 C22 4.5 -22 4.5 -34 0 Z';
  const ell = (cx, cy, rx, ry, n = 72, a0 = 0, a1 = 2 * Math.PI) => Array.from({ length: n }, (_, i) => { const a = a0 + (a1 - a0) * i / (n - 1); return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; });
  const grow = (poly, m) => { const c = poly.reduce((a, p) => ({ x: a.x + p.x / poly.length, y: a.y + p.y / poly.length }), { x: 0, y: 0 }); return poly.map(p => { const dx = p.x - c.x, dy = p.y - c.y, l = Math.hypot(dx, dy) || 1; return { x: p.x + dx / l * m, y: p.y + dy / l * m }; }); };
  // on screen: her body (stroke 2.4) and the cushion seen from the front (top ellipse + its side), + 3
  const SCREEN = { body: grow(cubicPts(BODY_D, MOCHI.x, MOCHI.y), 1.2 + 3), zafu: grow([...ell(206, 256, 38, 9, 40, Math.PI, 2 * Math.PI), ...ell(206, 262, 38, 9, 40, 0, Math.PI)], 3) };
  // on the floor: the cushion and the mat, + 4
  const GROUND = { zafu: ell(206, 256, 38 + 4, 9 + 4), mat: [{ x: 152 - 4.4, y: 258 }, { x: 260 + 4.4, y: 258 }, { x: 268 + 4.6, y: 278 }, { x: 144 - 4.6, y: 278 }] };
  // the same without the 4-unit margin: the cushion and the mat themselves
  const GROUND_RAW = { zafu: ell(206, 256, 38, 9), mat: [{ x: 152, y: 262 }, { x: 260, y: 262 }, { x: 268, y: 274 }, { x: 144, y: 274 }] };
  function inPoly(p, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }
  const monkRect = (x, y) => { const s = depth(y); return { x0: x + MONK_BOX.x0 * s, x1: x + MONK_BOX.x1 * s, y0: y + MONK_BOX.y0 * s, y1: y + MONK_BOX.y1 * s }; };
  const inRect = (p, r) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
  const rectPoly = r => [{ x: r.x0, y: r.y0 }, { x: r.x1, y: r.y0 }, { x: r.x1, y: r.y1 }, { x: r.x0, y: r.y1 }];
  const rectsHit = (r, poly) => poly.some(p => inRect(p, r)) || rectPoly(r).some(p => inPoly(p, poly));
  function footHits(x, y, G = GROUND) {
    const s = depth(y), F = ell(x, y, FOOT.rx * s, FOOT.ry * s, 64), inF = p => ((p.x - x) / (FOOT.rx * s)) ** 2 + ((p.y - y) / (FOOT.ry * s)) ** 2 <= 1;
    return ['zafu', 'mat'].filter(k => F.some(p => inPoly(p, G[k])) || G[k].some(inF));
  }
  const screenHits = (x, y) => { const r = monkRect(x, y); return ['body', 'zafu'].filter(k => rectsHit(r, SCREEN[k])); };
  // the front of the mochi: the band in front of her where crossing from one side to the other is not allowed
  const FRONT = { x0: 168, x1: 244, y: MOCHI.y };

  /* ---------- the check: every sample of every leg (60 fps), not only the waypoints ---------- */
  function check(leg, { ask = null, label = '' } = {}) {
    const out = { label, frames: 0, ground: [], stanceMargin: [], screen: [], crossFront: [], bounds: [], jumps: [], corners: [], ask: [], needsPose: [], layerSwitch: [], minClear: Infinity, maxStep: 0 };
    let prev = null, prevT = null, wasFront = null;
    for (let t = 0; t <= leg.total + 1e-6; t += 1000 / 60) {
      const q = leg.at(t), r = monkRect(q.x, q.y), front = inFront(q.y), tag = { t: Math.round(t), x: +q.x.toFixed(1), y: +q.y.toFixed(1) };
      out.frames++;
      // the accepted reminder stance itself is 4 units from the mat corner, inside the margin: the last steps into it are
      // recorded on their own (they must still be clear of the cushion and the mat themselves); anywhere else it fails
      const g = footHits(q.x, q.y);
      if (g.length) { const raw = footHits(q.x, q.y, GROUND_RAW); if (!raw.length && dist(q, STANCE) < 12) out.stanceMargin.push({ ...tag, what: g }); else out.ground.push({ ...tag, what: g, raw }); }
      if (front) { const sh = screenHits(q.x, q.y); if (sh.length) out.screen.push({ ...tag, what: sh }); }
      if (front && r.x1 > FRONT.x0 && r.x0 < FRONT.x1) out.crossFront.push(tag);
      if (r.x0 < FLOOR.x0 || r.x1 > FLOOR.x1 || r.y0 < 0 || q.y + 5.6 * depth(q.y) > FLOOR.front || q.y < FLOOR.back) out.bounds.push(tag);
      if (ask && r.x1 > ask.x0 && r.x0 < ask.x1 && r.y1 > ask.y0 && r.y0 < ask.y1) out.ask.push(tag);
      if (wasFront !== null && front !== wasFront && screenHits(q.x, q.y).length) out.layerSwitch.push(tag);
      wasFront = front;
      // clearance to her on screen (for the record): distance from the outline box to her body outline
      const cl = Math.min(...SCREEN.body.map(p => Math.max(r.x0 - p.x, p.x - r.x1, 0) + Math.max(r.y0 - p.y, p.y - r.y1, 0)));
      if (front) out.minClear = Math.min(out.minClear, cl);
      if (prev) { const st = dist(prev, q); out.maxStep = Math.max(out.maxStep, st); if (st > 1.2) out.jumps.push({ ...tag, step: +st.toFixed(2) }); }
      if (Math.abs(q.tx) < .35 && dist(leg.pts[0], q) > 1 && dist(leg.pts[leg.pts.length - 1], q) > 1) out.needsPose.push(tag);
      prev = q; prevT = t;
    }
    // corners: direction change between neighbouring curve samples
    for (let i = 2; i < leg.pts.length; i++) { const a = leg.pts[i - 2], b = leg.pts[i - 1], c = leg.pts[i];
      const a1 = Math.atan2(b.y - a.y, b.x - a.x), a2 = Math.atan2(c.y - b.y, c.x - b.x); let d = Math.abs(a2 - a1) * 180 / Math.PI; if (d > 180) d = 360 - d;
      if (dist(a, b) > .05 && dist(b, c) > .05 && d > 25) out.corners.push({ x: +b.x.toFixed(1), y: +b.y.toFixed(1), deg: +d.toFixed(0) }); }
    out.ok = !out.ground.length && !out.screen.length && !out.crossFront.length && !out.bounds.length && !out.jumps.length && !out.corners.length && !out.layerSwitch.length;
    return out;
  }
  function checkAll(ask) {
    const res = [];
    for (const k of Object.keys(ROUTES)) makeRoute(k).legs.forEach((l, i) => res.push(check(l, { ask, label: `${ROUTES[k].zh}・第 ${i + 1} 段（${l.names.map(n => N[n].zh).join(' → ')}）` })));
    for (const n of Object.keys(N)) if (n !== 'ST') { const l = legToStance(n); res.push(l ? check(l, { ask, label: `回到提醒站位：${N[n].zh} → ${l.names.slice(1).map(m => N[m].zh).join(' → ')}` }) : { label: `回到提醒站位：${N[n].zh}`, ok: false, unreachable: true }); }
    { const l = makeLeg(['ST', 'BL']); res.push(check(l, { ask, label: '提醒後恢復巡堂：提醒站位（3.5） → 後方左' })); }
    // joins between consecutive legs of a route: no jump at the stops
    const joins = []; for (const k of Object.keys(ROUTES)) { const legs = makeRoute(k).legs; for (let i = 1; i < legs.length; i++) { const a = legs[i - 1].at(legs[i - 1].total), b = legs[i].at(0); joins.push({ route: k, at: legs[i].names[0], gap: dist(a, b) }); } }
    // the stops themselves, standing still for a while
    const stops = Object.entries(N).map(([k, p]) => ({ k, zh: p.zh, x: p.x, y: p.y, s: +depth(p.y).toFixed(3), front: inFront(p.y), ground: footHits(p.x, p.y), groundRaw: footHits(p.x, p.y, GROUND_RAW), screen: inFront(p.y) ? screenHits(p.x, p.y) : [], ask: ask ? (() => { const r = monkRect(p.x, p.y); return r.x1 > ask.x0 && r.x0 < ask.x1 && r.y1 > ask.y0 && r.y0 < ask.y1; })() : null }));
    return { legs: res, joins, stops };
  }

  root.PATROL = { N, EDGES, ROUTES, STANCE, MOCHI, MONK_BOX, FOOT, FLOOR, SPEED, depth, inFront, makeRoute, makeLeg, pathTo, legToStance, monkRect, footHits, screenHits, SCREEN, GROUND, GROUND_RAW, FRONT, check, checkAll };
})(typeof window !== 'undefined' ? window : globalThis);
