// Round 4 integration prototype (design/round4/): the Round 3.5 monk's reminder driven by the game's events.
// Animation state, events that arrive while he is busy, reset / pause / finish, and pages that are frozen in the background.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

async function open(query = '', speed = 3) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${server.url}design/round4/?s=focus&seated&mute${query}`);
  await p.waitForFunction(() => window.__R4 && __R4.state().phase === 'focus');
  await p.evaluate(s => { __R4.G.speed = s; }, speed);   // the monk's clock only: rules and the timer are untouched
  return { p, ctx, errors };
}
const S = p => p.evaluate(() => __R4.state());
const settled = p => p.waitForFunction(() => { const s = __R4.state(); return !s.playing && !s.monk.performing && s.queue === 0; }, null, { timeout: 20000 });
const segIs = (p, ids) => p.waitForFunction(ids => ids.includes(__R4.state().monk.seg), ids, { timeout: 20000 });

test('focus: the timer runs, the monk patrols, nothing strikes on its own', async () => {
  const { p, ctx, errors } = await open();
  const a = await S(p); await p.waitForTimeout(3000); const b = await S(p);
  assert.ok(a.left - b.left > 2500, 'the clock counts down');
  assert.equal(b.performed, 0); assert.equal(b.hits, 0); assert.equal(b.monk.performing, false);
  assert.equal(b.monk.pose, 'idle', 'he carries the keisaku hanging at his side');
  assert.deepEqual(errors, []); await ctx.close();
});

test('first distraction: one full reminder, counted once at the hit, back to the hanging pose', async () => {
  // (Round 4.2B) he first stops his patrol, notices and walks by the safe paths to the stance; the reminder then plays
  // from the stance (raise → … → return), counted at the hit
  const { p, ctx, errors } = await open();
  await p.evaluate(() => __R4.awayFor(3000, true));
  const seen = new Set(), modes = new Set();
  for (let i = 0; i < 1500; i++) { const s = await S(p); seen.add(s.monk.seg); modes.add(s.patrol.mode + (s.patrol.face === 'stern' ? ':stern' : ''));
    if (s.monk.seg === 'windup' || s.monk.seg === 'pre') assert.equal(s.hits, 0, 'not counted before the hit');
    if (!s.playing && s.performed === 1) break; await p.waitForTimeout(15); }
  for (const id of ['raise', 'return']) assert.ok(seen.has(id), `played ${id} (saw ${[...seen]})`);
  assert.ok([...modes].some(m => m.endsWith(':stern')), `noticed (stern) before walking over (${[...modes]})`);
  await settled(p);
  const s = await S(p);
  assert.equal(s.hits, 1); assert.equal(s.impacts, 1); assert.equal(s.performed, 1);
  assert.equal(s.monk.pose, 'idle'); assert.equal(s.monk.performing, false);
  assert.equal(s.mochi.sx, 1); assert.equal(s.mochi.sy, 1);
  assert.deepEqual(errors, []); await ctx.close();
});

test('away for less than 2 s is not a distraction; 90 s or more strikes twice', async () => {
  const { p, ctx } = await open();
  await p.evaluate(() => __R4.awayFor(1500, true));
  assert.equal((await S(p)).performed, 0);
  await p.evaluate(() => __R4.awayFor(95000, true));
  assert.equal((await S(p)).queue, 1, 'the second strike waits its turn');
  await settled(p);
  const s = await S(p); assert.equal(s.hits, 2); assert.equal(s.performed, 2);
  await ctx.close();
});

test('production rules: repeats queue and each is played and counted once', async () => {
  const { p, ctx } = await open();
  await p.evaluate(() => { __R4.detect('sim'); __R4.detect('sim'); __R4.detect('sim'); });
  let s = await S(p); assert.equal(s.queue, 2); assert.equal(s.hits, 0);
  await p.evaluate(() => __R4.detect('ask'));            // 合掌請打 while he is busy: ignored, as in the app
  s = await S(p); assert.equal(s.ignored, 1);
  await settled(p);
  s = await S(p); assert.equal(s.hits, 3); assert.equal(s.performed, 3); assert.equal(s.impacts, 3); assert.equal(s.asks, 0);
  await ctx.close();
});

test('Round 1 rules: repeats during a reminder merge (counted, not replayed)', async () => {
  const { p, ctx } = await open('&rule=r1');
  await p.evaluate(() => __R4.detect('sim'));
  await segIs(p, ['raise', 'approach', 'call', 'pre', 'windup']);
  await p.evaluate(() => { __R4.detect('sim'); __R4.detect('sim'); });
  let s = await S(p); assert.equal(s.merged, 2); assert.equal(s.queue, 0); assert.equal(s.hits, 2, 'merged ones count when they happen');
  await settled(p);
  s = await S(p); assert.equal(s.performed, 1); assert.equal(s.hits, 3); assert.equal(s.merged, 0);
  await ctx.close();
});

test('a distraction during the swing does not hit twice or count the first one twice', async () => {
  const { p, ctx } = await open('', 1);
  await p.evaluate(() => { __R4.detect('sim'); __R4.G.onSwing = () => __R4.detect('sim'); });
  await segIs(p, ['stop', 'follow']);
  let s = await S(p); assert.equal(s.hits, 1); assert.equal(s.queue, 1);
  await settled(p);
  s = await S(p); assert.equal(s.hits, 2); assert.equal(s.impacts, 2); assert.equal(s.performed, 2);
  await ctx.close();
});

test('暫離 mid-reminder: the clock stops, pending ones are dropped, nothing new is caught, 回座 resumes', async () => {
  const { p, ctx } = await open('', 1);
  await p.evaluate(() => { __R4.detect('sim'); __R4.detect('sim'); });
  await segIs(p, ['pre', 'windup', 'hold']);
  await p.evaluate(() => __R4.startLeave());
  let s = await S(p); assert.equal(s.phase, 'leave'); assert.equal(s.queue, 0); assert.equal(s.dropped, 1);
  const left = s.left;
  assert.equal(await p.evaluate(() => __R4.detect('sim')), null, 'no new event while paused');
  await settled(p);                                       // the one already playing finishes (it happened during focus)
  s = await S(p); assert.equal(s.hits, 1); assert.equal(s.performed, 1); assert.equal(s.left, left, 'paused');
  await p.waitForTimeout(800); assert.equal((await S(p)).left, left);
  await p.evaluate(() => __R4.endLeave());
  await p.waitForFunction(() => __R4.state().phase === 'focus', null, { timeout: 8000 });
  s = await S(p); assert.ok(left - s.left < 1500 && left - s.left >= 0, 'resumes from where it stopped');
  await ctx.close();
});

test('出堂 mid-swing: the monk is put straight back, nothing is counted, the result shows', async () => {
  const { p, ctx } = await open('', .5);
  await p.evaluate(() => __R4.detect('sim'));
  await segIs(p, ['windup', 'hold']);
  await p.evaluate(() => __R4.quitEarly());
  let s = await S(p); assert.equal(s.monk.performing, false); assert.equal(s.hits, 0); assert.equal(s.impacts, 0);
  assert.equal(s.mochi.sx, 1);
  await p.waitForFunction(() => __R4.state().app === 'result', null, { timeout: 5000 });
  assert.equal(await p.evaluate(() => __R4.detect('sim')), null);
  await ctx.close();
});

test('the round ends while he strikes: that reminder finishes, then the result; nothing after counts', async () => {
  const { p, ctx } = await open('', 1);
  await p.evaluate(() => { __R4.detect('sim'); __R4.detect('sim'); });
  await segIs(p, ['call', 'pre', 'windup']);
  await p.evaluate(() => __R4.complete());
  let s = await S(p); assert.equal(s.phase, 'done'); assert.equal(s.queue, 0);
  assert.equal(await p.evaluate(() => __R4.detect('sim')), null);
  await p.waitForFunction(() => __R4.state().app === 'result', null, { timeout: 15000 });
  s = await S(p); assert.equal(s.hits, 1); assert.equal(s.performed, 1);
  await ctx.close();
});

test('a backgrounded page resumes the reminder where it was, without jumping ahead', async () => {
  // a hidden page gets no animation frames; headless Chromium keeps drawing, so the frames are withheld here
  const { p, ctx } = await open('', 1);
  await p.evaluate(() => __R4.detect('sim'));
  await segIs(p, ['raise', 'approach', 'call']);
  const t0 = await p.evaluate(() => { const raf = window.requestAnimationFrame, held = []; window.requestAnimationFrame = cb => held.push(cb);
    window.__release = () => { window.requestAnimationFrame = raf; held.forEach(cb => raf(cb)); }; return __R4.state().monk.t; });
  await p.waitForTimeout(2000);
  const mid = (await S(p)).monk.t;
  await p.evaluate(() => window.__release()); await p.waitForTimeout(50);
  const t1 = (await S(p)).monk.t;
  assert.ok(mid - t0 < 40, 'no frames, no progress');
  assert.ok(t1 - t0 < 200, `the monk's clock moved ${t1 - t0} ms across a 2 s gap`);
  await settled(p);
  const s = await S(p); assert.equal(s.hits, 1); assert.equal(s.monk.pose, 'idle');
  await ctx.close();
});

test('reduced motion: the reminder still happens, as held key poses, and counts once', async () => {
  const { p, ctx, errors } = await open('&rm', 1);
  await p.evaluate(() => __R4.detect('sim'));
  const segs = new Set(); for (let i = 0; i < 200 && segs.size < 3; i++) { segs.add((await S(p)).monk.seg); await p.waitForTimeout(10); }
  assert.ok(!segs.has('swing') && !segs.has('approach'), 'no swing and no walk');
  await settled(p);
  const s = await S(p); assert.equal(s.hits, 1); assert.equal(s.monk.pose, 'idle');
  assert.deepEqual(errors, []); await ctx.close();
});

test('the real visibilitychange: back after 2 s or more is caught once; while paused it is not', async () => {
  const { p, ctx } = await open('', 3);
  await p.evaluate(() => { let hidden = false; Object.defineProperty(document, 'hidden', { get: () => hidden });
    window.__hide = h => { hidden = h; document.dispatchEvent(new Event('visibilitychange')); }; });
  await p.evaluate(() => __hide(true)); await p.waitForTimeout(2300); await p.evaluate(() => __hide(false));
  let s = await S(p); assert.equal(s.performed, 1);
  await settled(p); assert.equal((await S(p)).hits, 1);
  await p.evaluate(() => __R4.startLeave());
  await p.evaluate(() => __hide(true)); await p.waitForTimeout(2300); await p.evaluate(() => __hide(false));
  s = await S(p); assert.equal(s.performed, 1); assert.equal(s.hits, 1);
  await ctx.close();
});
