// Round 4.2A: 合掌請打 moved off the stage, and the candidate new views of the monk (design/round4/).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import path from 'node:path';
import { startServer, launch, ROOT } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

// ---- the accepted Round 3 / 3.5 drawing and animation are unchanged ----
// a fingerprint of every accepted static pose (both facings) and of every 1/60 s frame of the 3.5 reminder, taken
// from the files as they were before Round 4.2A (commit 2852feb); MONK4.parts was only added, nothing drawn changed
test('the accepted monk drawing and the Round 3.5 animation are exactly as before', () => {
  const c = { Math, console }; c.window = c; vm.createContext(c);
  const D = path.join(ROOT, 'src', 'monk');   // the accepted Round 3.5 files (moved from design/round3 in Round 5, unchanged)
  vm.runInContext(fs.readFileSync(path.join(D, 'monk4.js'), 'utf8'), c); c.MONK4 = c.window.MONK4; vm.runInContext(fs.readFileSync(path.join(D, 'anim.js'), 'utf8'), c);
  const M = c.window.MONK4, A = c.window.KEISAKU_ANIM, h = crypto.createHash('sha256');
  for (const pose of ['stand', 'tuck', 'idle', 'ready', 'tuck2', 'ready2', 'ready3', 'windup', 'strike', 'follow']) for (const facing of ['right', 'left']) h.update(M.art({ id: 'x', pose, facing }));
  for (let t = 0; t <= A.total(); t += 1000 / 60) { const r = A.poseAt(t, {}); h.update(M.art({ id: 'y', poseObj: r.p, face: r.j.face, tilt: r.j.tilt, split: true, stickBack: !A.stickFrontAt(t) }).back); h.update(JSON.stringify(A.mochiAt(t))); }
  assert.equal(h.digest('hex'), 'fc0abd5fb76187ab95dd125160e92eee7e918bf1fc34e307ed5dadb491f51d82');
  assert.ok(Object.isFrozen(M.parts));
});

async function open(page, { width = 390, height = 844, query = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${server.url}design/round4/${page}${query}`);
  return { p, ctx, errors };
}
const SIZES = [[360, 780], [390, 844], [412, 915], [360, 640], [740, 360]];

for (const [w, h] of SIZES) {
  test(`${w}×${h}: 合掌請打 is off the stage, clear of the monk at right-front, the clock and the other buttons`, async () => {
    const { p, ctx, errors } = await open('', { width: w, height: h, query: '?s=focus&seated&mute' });
    await p.waitForFunction(() => window.__R4 && __R4.state().phase === 'focus');
    await p.evaluate(() => __R4.placeMonk('RF', -1)); await p.waitForTimeout(150);
    const r = await p.evaluate(() => {
      const box = e => { const b = e.getBoundingClientRect(); return { l: b.left + scrollX, t: b.top + scrollY, r: b.right + scrollX, b: b.bottom + scrollY, w: b.width, h: b.height }; };
      const ask = document.querySelector('#askBtn'), hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
      const A = box(ask), others = ['#stage', '#clock', '#fState', '#leaveBtn', '#quitBtn', '.incense', '.fmeta'].map(s => [s, box(document.querySelector(s))]);
      return { inStage: document.querySelector('#stage').contains(ask), shown: getComputedStyle(ask).display !== 'none', A, overlaps: others.filter(([, b]) => hit(A, b)).map(([s]) => s),
        monkUnder: hit(A, box(__R4.K().back)), sw: document.documentElement.scrollWidth, vw: innerWidth, pad: parseFloat(getComputedStyle(document.querySelector('.compare')).paddingBottom) };
    });
    assert.equal(r.inStage, false, 'not on the stage');
    assert.equal(r.shown, true, 'shown while sitting');
    assert.deepEqual(r.overlaps, [], 'covers nothing');
    assert.equal(r.monkUnder, false, 'the monk at right-front is not under it');
    assert.ok(r.A.h >= 44 && r.A.w >= 88, `a comfortable target (${r.A.w}×${r.A.h})`);
    assert.ok(r.A.l >= 0 && r.A.r <= r.vw, 'fully on screen horizontally');
    assert.equal(r.sw, w, 'no horizontal overflow');
    assert.ok(r.pad >= 48, 'room below for the system bar (safe area)');
    assert.deepEqual(errors, []); await ctx.close();
  });
}

test('合掌請打 keeps the Round 4 rules: only while sitting; ignored while a reminder plays; counts as asked', async () => {
  const { p, ctx, errors } = await open('', { query: '?s=focus&seated&mute' });
  await p.waitForFunction(() => window.__R4 && __R4.state().phase === 'focus');
  const shown = () => p.evaluate(() => document.querySelector('#askBtn').checkVisibility());
  assert.equal(await shown(), true);
  await p.evaluate(() => { __R4.G.speed = 3; }); await p.locator('#askBtn').click();
  await p.waitForFunction(() => __R4.state().performed === 1);
  await p.locator('#askBtn').click();                                     // while he is busy: ignored (production rule)
  assert.equal((await p.evaluate(() => __R4.state())).ignored, 1);
  await p.waitForFunction(() => !__R4.state().playing, null, { timeout: 20000 });
  assert.equal((await p.evaluate(() => __R4.state())).asks, 1);
  await p.evaluate(() => __R4.startLeave()); assert.equal(await shown(), false, 'hidden while away');
  await p.evaluate(() => { __R4.endLeave(); }); assert.equal(await shown(), false, 'hidden while settling back');
  await p.waitForFunction(() => __R4.state().phase === 'focus', null, { timeout: 8000 }); assert.equal(await shown(), true);
  await p.evaluate(() => __R4.quitEarly()); assert.equal(await shown(), false, 'hidden after 出堂');
  await p.waitForFunction(() => __R4.state().app === 'result'); assert.equal(await shown(), false, 'not on the result screen');
  assert.deepEqual(errors, []); await ctx.close();
});

for (const w of [360, 390, 412]) {
  test(`${w}px pose review: every pose is drawn whole inside its tile, on the same proportions, no overflow`, async () => {
    const { p, ctx, errors } = await open('pose-review.html', { width: w });
    await p.waitForFunction(() => window.__poses);
    const r = await p.evaluate(() => {
      const out = [];
      for (const fig of document.querySelectorAll('#row figure, #p3 figure, #p4 figure, #big')) {
        const sv = fig.querySelector('svg'), vb = sv.viewBox.baseVal, g = sv.querySelector('.m4');
        // the filled shapes are the silhouette (clipped helpers like the cheek shade would inflate a plain getBBox)
        const bs = [...g.querySelectorAll('defs .m4p')].map(e => e.getBBox()), b = { x: Math.min(...bs.map(q => q.x)), y: Math.min(...bs.map(q => q.y)) };
        b.width = Math.max(...bs.map(q => q.x + q.width)) - b.x; b.height = Math.max(...bs.map(q => q.y + q.height)) - b.y; out.push({ cap: fig.textContent.trim(), inside: b.x >= vb.x && b.y >= vb.y && b.x + b.width <= vb.x + vb.width && b.y + b.height <= vb.y + vb.height, top: b.y, bottom: b.y + b.height });
      }
      return { out, sw: document.documentElement.scrollWidth };
    });
    assert.equal(r.sw, w, 'no horizontal overflow');
    for (const t of r.out) assert.ok(t.inside, `${t.cap}: not cropped`);
    const tops = r.out.map(t => t.top), bottoms = r.out.map(t => t.bottom);
    assert.ok(Math.max(...tops) - Math.min(...tops) < 1.5, `same head height (${tops.map(v => v.toFixed(1))})`);
    assert.ok(Math.max(...bottoms) - Math.min(...bottoms) < 1.5, 'same feet line');
    assert.deepEqual(errors, []); await ctx.close();
  });
}

test('the turn keyframes start from the accepted drawing itself, and each view keeps the keisaku in his right hand', async () => {
  const { p, ctx, errors } = await open('pose-review.html');
  await p.waitForFunction(() => window.__poses);
  const r = await p.evaluate(() => {
    const V = MONK_VIEWS, acc = MONK4.art({ id: 'k', pose: 'idle' });
    return { p3: V.view('p3_0', { id: 'k' }) === acc, p4: V.view('p4_0', { id: 'k' }) === acc,
      // his right hand: on our left facing us, on our right from behind
      front: V.VIEW.front.stick.x < 0, back: V.VIEW.back.stick.x > 0, frontFist: V.VIEW.front.fist.layer, backFist: V.VIEW.back.fist.layer,
      // the views have the same number of points per part (so a turn can blend them part by part)
      same: ['front', 'back', 'profile', 'q34'].every(k => ['head', 'robe'].every(part => V.VIEW[k][part].length === V.VIEW.front[part].length) && V.VIEW[k].near.pts.length === V.VIEW.front.near.pts.length) };
  });
  assert.ok(r.p3 && r.p4, 'the first keyframe is MONK4.art idle');
  assert.ok(r.front && r.back);
  assert.equal(r.frontFist, 'front'); assert.equal(r.backFist, 'hidden');
  assert.ok(r.same);
  assert.deepEqual(errors, []); await ctx.close();
});

test('the patrol review shows a view for every Round 4.1 leg', async () => {
  const { p, ctx, errors } = await open('patrol-review.html');
  await p.waitForFunction(() => window.__PATROL_REPORT && document.querySelectorAll('#orient tr').length);
  assert.equal(await p.evaluate(() => document.querySelectorAll('#orient tr').length), 9);
  assert.deepEqual(errors, []); await ctx.close();
});
