// Round 5 stage candidates (?stage=b, ?stage=c): the zendo's container grows less (B) or not at all (C) while sitting.
// The scene itself, the characters' coordinates and everything drawn must be exactly as in the accepted layout.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, sit, forward } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

const meas = p => p.evaluate(() => { const w = document.getElementById('stageWrap').getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect();
  return { w: s.width, h: s.height, ratio: w.height / s.height, inside: s.bottom <= w.bottom + .5, hscroll: document.documentElement.scrollWidth > innerWidth }; });

for (const [w, h] of [[320, 640], [390, 844], [412, 915]]) for (const v of ['b', 'c']) {
  test(`candidate ${v.toUpperCase()} at ${w}×${h}: the same scene, a shorter floor while sitting, the result card whole`, async () => {
    const ref = await openApp(browser, server.url, { width: w, height: h });
    await sit(ref.p); const a = await meas(ref.p); await ref.ctx.close();
    const { p, ctx, errors } = await openApp(browser, server.url, { width: w, height: h, path: `index.html?stage=${v}` });
    await sit(p); await p.waitForTimeout(700);
    const m = await meas(p);
    assert.equal(m.w, a.w); assert.equal(m.h, a.h, 'the scene is not scaled');
    assert.ok(m.inside, 'the scene is not cropped'); assert.equal(m.hscroll, false);
    if (v === 'b') assert.ok(m.ratio <= 1.36 && m.ratio <= a.ratio + .01, `B: the floor is at most 35% of the scene (${m.ratio.toFixed(2)})`);
    else assert.ok(Math.abs(m.ratio - 1.2) < .02, `C: the same height as at check-in (${m.ratio.toFixed(2)})`);
    // the monk stays inside the scene; the reminder plays as before
    await p.evaluate(() => { __keisaku.speed(3); __hide(true); window.__skew += 3000; __hide(false); });
    await p.waitForFunction(() => !__keisaku.monk().busy && __keisaku.round().hits === 1, null, { timeout: 30000 });
    // the result card is not cut off
    await forward(p, 26 * 60000);
    await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 15000 }); await p.waitForTimeout(700);
    const cut = await p.evaluate(() => { const c = document.querySelector('.result-card').getBoundingClientRect(), w = document.getElementById('stageWrap').getBoundingClientRect(); return c.top < w.top - .5 || c.bottom > w.bottom + .5; });
    assert.equal(cut, false, 'the result card fits');
    assert.deepEqual(errors, []); await ctx.close();
  });
}
