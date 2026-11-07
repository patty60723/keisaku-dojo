// Round 4.1: the monk's patrol paths around the mochi (design/round4/patrol-paths.js, patrol-review.html).
// Geometry is checked at every 1/60 s of every leg (curve middles too, not just waypoints), and the monk drawn by
// the review page is sampled frame by frame while he walks, at three phone widths.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

async function open(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${server.url}design/round4/patrol-review.html`);
  await p.waitForFunction(() => window.__PATROL_REPORT);
  return { p, ctx, errors };
}
const FAILS = ['ground', 'screen', 'crossFront', 'bounds', 'jumps', 'corners', 'layerSwitch'];

for (const width of [360, 390, 412]) {
  test(`${width}px: every leg stays clear of the mochi, in bounds, smooth, with no jumps`, async () => {
    const { p, ctx, errors } = await open(width);
    const R = await p.evaluate(() => __PATROL_REPORT);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), width, 'no horizontal overflow');
    for (const l of R.legs) {
      assert.ok(!l.unreachable, l.label);
      for (const k of FAILS) assert.equal(l[k].length, 0, `${l.label}: ${k} ${JSON.stringify(l[k][0] || '')}`);
      assert.ok(l.frames > 30, 'checked frame by frame');
      // the only allowed margin contact is the last steps into the accepted Round 3.5 stance
      for (const m of l.stanceMargin) assert.ok(Math.hypot(m.x - 132, m.y - 254) < 12, `${l.label}: margin contact away from the stance`);
    }
    assert.ok(R.joins.every(j => j.gap < 1e-9), 'legs join without a gap');
    // known conflict, reported not hidden: the 合掌請打 pill covers the right side
    const rs = R.stops.find(s => s.k === 'RF'); assert.equal(rs.ask, true);
    assert.equal(R.stops.find(s => s.k === 'LF').ask, false);
    assert.deepEqual(errors, []); await ctx.close();
  });
}

test('the stance is reachable from every stop and the reminder still starts there facing the mochi', async () => {
  const { p, ctx, errors } = await open(390);
  const ends = await p.evaluate(() => Object.keys(PATROL.N).filter(n => n !== 'ST').map(n => { const l = PATROL.legToStance(n), q = l.at(l.total); return { n, x: q.x, y: q.y, via: l.names }; }));
  for (const e of ends) { assert.ok(Math.abs(e.x - 132) < 1e-9 && Math.abs(e.y - 254) < 1e-9, e.n); }
  // the route from the right never crosses in front of her: it goes round the back
  assert.deepEqual(ends.find(e => e.n === 'RF').via, ['RF', 'RS', 'BR', 'BC', 'BL', 'ST']);
  await p.evaluate(() => { __review.setSpeed(4); document.querySelector('#fromNode').value = 'BR'; __review.toStance(); });
  await p.waitForFunction(() => __K.state().performing, null, { timeout: 15000 });
  const at = await p.evaluate(() => ({ x: __K.s.x, y: __K.s.y, dir: __K.s.dir, depth: __K.s.depth }));
  assert.equal(at.x, 132); assert.equal(at.y, 254); assert.equal(at.dir, 1); assert.equal(at.depth, 1);
  await p.waitForFunction(() => !__K.state().performing, null, { timeout: 15000 });
  await p.waitForFunction(() => __K.s.y < 240, null, { timeout: 15000 });   // and he walks back to the patrol
  assert.deepEqual(errors, []); await ctx.close();
});

test('the monk on screen follows the checked paths: sampled every frame while walking the full circuit', async () => {
  const { p, ctx, errors } = await open(390);
  const S = await p.evaluate(() => new Promise(res => {
    __review.setSpeed(3); const out = []; let last = null;
    __review.playRoute('around').then(() => res(out));
    (function tick() { const s = __K.s; out.push({ x: s.x, y: s.y, dir: Math.sign(s.dir), depth: s.depth, front: s.y > 257,
      foot: PATROL.footHits(s.x, s.y).length, scr: s.y > 257 ? PATROL.screenHits(s.x, s.y).length : 0,
      layer: document.querySelector('#seatLip').nextElementSibling === __K.back }); if (out.length < 5000) requestAnimationFrame(tick); })();
  }));
  assert.ok(S.length > 100);
  S.forEach((q, i) => { assert.equal(q.foot, 0, `footprint at ${q.x},${q.y}`); assert.equal(q.scr, 0, `outline at ${q.x},${q.y}`); if (i > 1 && S[i - 1].front === q.front && S[i - 2].front === q.front) assert.equal(q.layer, q.front, `layer by depth at ${q.y}`); });   // (the page sets the layer in its own frame, this sample may run first)
  for (let i = 1; i < S.length; i++) assert.ok(Math.hypot(S[i].x - S[i - 1].x, S[i].y - S[i - 1].y) < 50 / 1000 * 30 * 3 * 1.6, 'no jump between frames');
  // left side to right side: he passes y < 230 (the back) on the way, never the front of the mochi
  const crossing = S.filter(q => q.x > 150 && q.x < 262); assert.ok(crossing.length && crossing.every(q => q.y < 236), 'crosses behind her');
  assert.ok(Math.max(...S.map(q => q.depth)) <= 1.1 && Math.min(...S.map(q => q.depth)) >= .9);
  assert.deepEqual(errors, []); await ctx.close();
});
