// Round 4.2B: the natural patrol (design/round4/natural-patrol.js) in the Round 4 prototype and its preview page.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

async function open(query = '', speed = 1) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${server.url}design/round4/?s=focus&seated&mute${query}`);
  await p.waitForFunction(() => window.__R4 && __R4.state().phase === 'focus');
  await p.evaluate(s => { __R4.G.speed = s; }, speed);
  return { p, ctx, errors };
}
const S = p => p.evaluate(() => __R4.state());
// record his place every frame in the page (feet, outline, layer), returned on stop()
const record = p => p.evaluate(() => { window.__rec = []; (function tick() { if (!window.__rec) return; const n = __R4.NP(), k = __R4.K(), s = n.active ? n.s : k.s; const lipNext = document.querySelector('#seatLip').nextElementSibling === k.back;
  __rec.push({ x: s.x, y: s.y, active: n.active, mode: n.mode, key: n.key, fam: n.s.fam, foot: PATROL.footHits(s.x, s.y).length, raw: PATROL.footHits(s.x, s.y, PATROL.GROUND_RAW).length,
    scr: PATROL.inFront(s.y) ? PATROL.screenHits(s.x, s.y).length : 0, front: PATROL.inFront(s.y), layer: lipNext, nearST: Math.hypot(s.x - 132, s.y - 254) < 12 }); if (window.__rec) requestAnimationFrame(tick); })(); });
const endRec = p => p.evaluate(() => { const r = window.__rec; window.__rec = null; return r; });
function assertSafe(R, label) {
  for (const [i, q] of R.entries()) {
    assert.equal(q.scr, 0, `${label}: his outline touches the mochi at (${q.x.toFixed(1)}, ${q.y.toFixed(1)})`);
    assert.equal(q.raw, 0, `${label}: steps on the cushion or the mat at (${q.x.toFixed(1)}, ${q.y.toFixed(1)})`);
    if (!q.nearST) assert.equal(q.foot, 0, `${label}: inside the safe zone at (${q.x.toFixed(1)}, ${q.y.toFixed(1)})`);
    if (i > 1 && R[i - 1].front === q.front && R[i - 2].front === q.front && q.active) assert.equal(q.layer, q.front, `${label}: layer by depth at y ${q.y.toFixed(1)}`);
  }
}

test('a long patrol stays on the safe paths, changes sides only behind her, pauses, and varies its routes', async () => {
  const { p, ctx, errors } = await open('&seed=42', 8);
  await record(p); await p.waitForTimeout(22000); const R = await endRec(p);
  const s = await S(p);
  assertSafe(R, 'patrol');
  const routes = s.patrol.routes.map(r => r.id);
  assert.ok(routes.length >= 8, `several routes (${routes.length})`);
  for (let i = 1; i < routes.length; i++) assert.notEqual(routes[i], routes[i - 1], 'no route twice in a row');
  for (let i = 1; i < routes.length; i++) { const a = routes[i - 1].split('-')[1], b = routes[i].split('-')[1]; assert.ok(!(a === 'LF' && b === 'RF') && !(a === 'RF' && b === 'LF'), 'front to front only via the back'); }
  // in front of her only at her left and right, never across her front
  for (const q of R) if (q.front) assert.ok(q.x < 168 - 30 || q.x > 244 + 30, `in front of her at x ${q.x.toFixed(1)}`);
  const standing = R.filter(q => q.mode === 'stand').length / R.length;
  assert.ok(standing > .2, `he also stands still (${(standing * 100).toFixed(0)}% of frames)`);
  assert.deepEqual(errors, []); await ctx.close();
});

test('the same seed replays the same patrol', async () => {
  const runs = [];
  for (let k = 0; k < 2; k++) { const { p, ctx } = await open('&seed=1234', 8); await p.waitForTimeout(9000); runs.push((await S(p)).patrol.routes.map(r => r.id).slice(0, 5)); await ctx.close(); }
  assert.ok(runs[0].length >= 4); assert.deepEqual(runs[0], runs[1].slice(0, runs[0].length));
});

test('every way to the stance is safe: from each stop, and from points along every route he can walk', async () => {
  const { p, ctx } = await open('&seed=3');
  const bad = await p.evaluate(() => {
    const np = __R4.NP(), out = [], R = NATURAL_PATROL.ROUTES;
    const check = (leg, label, toStance = true) => { const c = PATROL.check(leg); for (const k of ['screen', 'crossFront', 'bounds', 'jumps', 'layerSwitch']) if (c[k].length) out.push(`${label}: ${k} ${JSON.stringify(c[k][0])}`);
      for (const g of c.ground) if (g.raw.length) out.push(`${label}: on the cushion / mat ${JSON.stringify(g)}`); else if (Math.hypot(g.x - 132, g.y - 254) > 14) out.push(`${label}: safe-zone margin away from the stance ${JSON.stringify(g)}`);
      const e = leg.at(leg.total); if (toStance && Math.hypot(e.x - 132, e.y - 254) > 1e-6) out.push(`${label}: does not end at the stance`); };
    let n = 0;
    for (const stop of ['BL', 'BC', 'BR', 'LF', 'RF', 'LS', 'RS']) { const l = np.stanceLeg(PATROL.N[stop], null, stop); check(l, 'from ' + stop); n++; }
    for (const [from, opts] of Object.entries(R)) for (const [id, names] of opts) { const leg = PATROL.makeLeg([from, ...names]); check(leg, 'route ' + id, false); n++;
      for (let i = 1; i < 10; i++) { const q = leg.at(leg.total * i / 10); const l = np.stanceLeg({ x: q.x, y: q.y }, leg, from); check(l, `${id} at ${i * 10}%`); n++; } }
    return { out, n };
  });
  assert.ok(bad.n >= 117, `${bad.n} ways checked`);
  assert.deepEqual(bad.out, []);
  await ctx.close();
});

for (const stop of ['BL', 'BC', 'BR', 'LF', 'RF', 'LS', 'RS']) {
  test(`a reminder from ${stop}: walks safely to the stance, the accepted reminder plays from the Round 3.5 pose, the patrol resumes`, async () => {
    const { p, ctx, errors } = await open('&seed=5', 3);
    await p.evaluate(n => __R4.placeMonk(n, 1), stop);
    await record(p);
    await p.evaluate(() => __R4.detect('sim'));
    await p.waitForFunction(() => __R4.state().monk.performing, null, { timeout: 20000 });
    const at = await p.evaluate(() => ({ x: __R4.K().s.x, y: __R4.K().s.y, dir: __R4.K().s.dir, depth: __R4.K().s.depth, np: __R4.NP().active }));
    assert.equal(at.x, 132); assert.equal(at.y, 254); assert.equal(at.dir, 1); assert.equal(at.depth, 1); assert.equal(at.np, false, 'the accepted actor draws the reminder');
    await p.waitForFunction(() => !__R4.state().playing, null, { timeout: 20000 });
    await p.waitForFunction(() => __R4.NP().active && __R4.NP().mode === 'walk', null, { timeout: 15000 });
    assertSafe(await endRec(p), 'to the stance from ' + stop);
    assert.equal((await S(p)).hits, 1);
    assert.deepEqual(errors, []); await ctx.close();
  });
}

for (const when of ['walk', 'turn']) {
  test(`a reminder while he ${when === 'walk' ? 'walks' : 'turns'}: he stops naturally and goes the safe way`, async () => {
    const { p, ctx, errors } = await open('&seed=9', 2);
    await p.waitForFunction(w => __R4.NP().active && __R4.NP().mode === w, when, { timeout: 30000 });
    await record(p);
    await p.evaluate(() => __R4.detect('sim'));
    await p.waitForFunction(() => __R4.state().monk.performing, null, { timeout: 20000 });
    const R = await endRec(p); assertSafe(R, 'interrupted while ' + when);
    for (let i = 1; i < R.length; i++) assert.ok(Math.hypot(R[i].x - R[i - 1].x, R[i].y - R[i - 1].y) < 8, 'no jump');
    await p.waitForFunction(() => !__R4.state().playing, null, { timeout: 20000 });
    assert.equal((await S(p)).hits, 1);
    assert.deepEqual(errors, []); await ctx.close();
  });
}

test('出堂 while he walks to the stance: stopped there, nothing counted, the result shows', async () => {
  const { p, ctx, errors } = await open('&seed=5', 1);
  await p.evaluate(() => __R4.placeMonk('RF', -1));
  await p.evaluate(() => __R4.detect('sim'));
  await p.waitForFunction(() => __R4.NP().mode === 'walk' && __R4.NP().s.face === 'stern', null, { timeout: 10000 });
  await p.evaluate(() => __R4.quitEarly());
  await p.waitForFunction(() => __R4.state().app === 'result', null, { timeout: 8000 });
  const s = await S(p); assert.equal(s.hits, 0); assert.equal(s.impacts, 0); assert.equal(s.playing, null);
  assert.deepEqual(errors, []); await ctx.close();
});

test('暫離 stops the patrol where he is; 回座 resumes it; a hidden page pauses it', async () => {
  const { p, ctx } = await open('&seed=11', 2);
  await p.waitForFunction(() => __R4.NP().mode === 'walk', null, { timeout: 20000 });
  await p.evaluate(() => __R4.startLeave()); await p.waitForTimeout(300);
  const a = (await S(p)).patrol; await p.waitForTimeout(1500); const b = (await S(p)).patrol;
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < .01, 'still while away');
  await p.evaluate(() => { __R4.endLeave(); });
  await p.waitForFunction(() => __R4.state().phase === 'focus', null, { timeout: 8000 });
  await p.waitForFunction(() => __R4.NP().mode === 'walk', null, { timeout: 20000 });
  await p.evaluate(() => { const raf = window.requestAnimationFrame, held = []; window.requestAnimationFrame = cb => held.push(cb); window.__release = () => { window.requestAnimationFrame = raf; held.forEach(cb => raf(cb)); }; });
  await p.waitForTimeout(100);                            // a frame already queued before the swap may still run once
  const x0 = await p.evaluate(() => __R4.NP().s.x);
  await p.waitForTimeout(1500); const x1 = await p.evaluate(() => __R4.NP().s.x);
  assert.equal(x1, x0, 'no frames, no walking');
  await p.evaluate(() => window.__release());
  await ctx.close();
});

test('reduced motion: no walk cycle and no turn frames; the reminder still plays once', async () => {
  const { p, ctx, errors } = await open('&rm&seed=2', 3);
  await record(p); await p.waitForTimeout(6000);
  await p.evaluate(() => __R4.detect('sim'));
  await p.waitForFunction(() => !__R4.state().playing && __R4.state().performed === 1, null, { timeout: 20000 });
  const R = await endRec(p);
  for (const q of R) if (q.active && q.key) { assert.ok(!q.key.startsWith('T:'), 'no turn frames'); assert.ok(/^W:[RLFK]:0:/.test(q.key), 'no walk phases'); }
  assert.equal((await S(p)).hits, 1);
  assert.deepEqual(errors, []); await ctx.close();
});

test('poses: every walk and turn frame has the ears on the head, no face from behind, the keisaku in his right hand, nothing cropped', async () => {
  const { p, ctx, errors } = await open();
  const r = await p.evaluate(() => {
    const N = NATURAL_PATROL, keys = N.allKeys(['kind', 'stern']), out = [];
    const box = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); box.setAttribute('viewBox', '-60 -120 120 140'); box.style.cssText = 'position:fixed;left:0;top:0;width:240px;height:280px'; document.body.appendChild(box);
    for (const k of keys) {
      box.innerHTML = N.buildPose(k, 'pz'); const g = box.firstChild, bs = [...g.querySelectorAll('defs .m4p')].map(e => e.getBBox());
      const y0 = Math.min(...bs.map(q => q.y)), y1 = Math.max(...bs.map(q => q.y + q.height)), x0 = Math.min(...bs.map(q => q.x)), x1 = Math.max(...bs.map(q => q.x + q.width));
      const eyes = (box.innerHTML.match(/<ellipse[^>]*fill:var\(--line\)/g) || []).length, fam = k.split(':')[1], view = k.startsWith('T:') ? k.split(':')[1] : fam;
      out.push({ k, view, y0, y1, x0, x1, eyes });
    }
    box.remove();
    const heads = ['p3mid', 'p3midL', 'profile', 'back34', 'profileL', 'back34L'].map(v => ({ v, h: MONK_VIEWS2.headParts(MONK_VIEWS2.body(v, 'B').th) }));
    const sticks = ['front', 'back', 'p3mid', 'p3midL', 'profile', 'back34', 'profileL', 'back34L'].map(v => ({ v, b: MONK_VIEWS2.body(v, 'B') }));
    return { out, heads: heads.map(({ v, h }) => ({ v, ears: h.ears.map(e => ({ onTop: e.onTop, x: e.x, c: h.c })) })), sticks: sticks.map(({ v, b }) => ({ v, th: b.th, x: b.stick.x, layer: b.stick.layer })) };
  });
  for (const f of r.out) {
    assert.ok(f.y0 > -97 && f.y0 < -92, `${f.k}: head top ${f.y0.toFixed(1)}`);
    assert.ok(f.y1 < 4.5, `${f.k}: feet ${f.y1.toFixed(1)}`);
    assert.ok(f.x0 > -45 && f.x1 < 45, `${f.k}: width`);
    if (f.view === 'K' || f.view === 'back34' || f.view === 'back34L') assert.equal(f.eyes, 0, `${f.k}: no eyes from behind`);
    if (f.view === 'F' || f.view === 'R' || f.view === 'L' || f.view === 'p3mid' || f.view === 'p3midL') assert.equal(f.eyes, 2, `${f.k}: two eyes`);
  }
  // the keisaku stays in his right hand: on our left facing us and facing left, on our right from behind
  for (const s of r.sticks) {
    if (s.v === 'front' || s.v === 'p3mid' || s.v === 'p3midL') assert.ok(s.x < 0, `${s.v}`);
    if (s.v === 'back' || s.v === 'back34') assert.ok(s.x > 0, `${s.v}`);
    if (s.th < 0) assert.notEqual(s.layer, 'front', `${s.v}: his right hand is the far one`);
  }
  assert.deepEqual(errors, []); await ctx.close();
});

test('long patrol: the drawing is reused (no SVG rebuilt per frame), memory and DOM stay flat, frames are quick', async () => {
  const { p, ctx } = await open('&seed=77', 6);
  const cdp = await ctx.newCDPSession(p); await cdp.send('HeapProfiler.enable');
  await p.waitForTimeout(6000);                                     // all poses get built in the first seconds
  await cdp.send('HeapProfiler.collectGarbage'); const h0 = (await cdp.send('Runtime.getHeapUsage')).usedSize;
  const a = await p.evaluate(() => ({ dom: document.getElementsByTagName('*').length, built: __R4.NP().poses.built, swaps: __R4.NP().stats.swaps }));
  await p.waitForTimeout(20000);
  await cdp.send('HeapProfiler.collectGarbage'); const h1 = (await cdp.send('Runtime.getHeapUsage')).usedSize;
  const b = await p.evaluate(() => ({ dom: document.getElementsByTagName('*').length, built: __R4.NP().poses.built, swaps: __R4.NP().stats.swaps }));
  assert.ok(b.built <= 120, `poses built once (${b.built})`);
  assert.ok(b.dom - a.dom <= (b.built - a.built) * 400 + 50, `DOM grows only by new poses (${a.dom} → ${b.dom})`);
  assert.ok(h1 - h0 < 3 * 1048576, `heap ${(h0 / 1048576).toFixed(1)} → ${(h1 / 1048576).toFixed(1)} MB`);
  // at normal speed: how long a frame's work takes while he walks
  await p.evaluate(() => { __R4.G.speed = 1; window.__w = []; const raf = window.requestAnimationFrame; (function tick() { const t0 = performance.now(); raf(() => { __w.push(performance.now() - t0); if (__w.length < 400) tick(); }); })(); });
  await p.waitForTimeout(7500);
  const work = await p.evaluate(() => { const n = __R4.NP(); const t0 = performance.now(); for (let i = 0; i < 200; i++) n.render(performance.now()); return (performance.now() - t0) / 200; });
  assert.ok(work < 1, `a patrol frame's drawing costs ${work.toFixed(3)} ms`);
  await ctx.close();
});
