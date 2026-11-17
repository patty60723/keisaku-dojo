// Round 5 layout (the candidate chosen as "D", see design/round5/stage-d): the zendo at its own height in every
// phase, 合掌請打 and the timer card right under it, the result card whole. No URL switch: this is the app's layout.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, sit, forward } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

const box = p => p.evaluate(() => { const y = scrollY, r = e => document.querySelector(e).getBoundingClientRect(), wr = r('#stageWrap'), s = r('#stage'), as = r('#askBtn'), pn = r('.panel');
  return { top: wr.top + y, h: wr.height, svgW: s.width, svgH: s.height, innerW: document.getElementById('stageWrap').clientWidth, inside: s.bottom <= wr.bottom + .5,
    askGap: as.top - wr.bottom, askH: as.height, panelGap: pn.top - as.bottom, panelTop: pn.top + y, hscroll: document.documentElement.scrollWidth > innerWidth }; });

for (const [w, h, big] of [[320, 640], [360, 780], [390, 844], [412, 915], [844, 390], [390, 844, true]]) {
  test(`${w}×${h}${big ? ', text 130%' : ''}: the zendo keeps its height from check-in to sitting, the controls follow it, nothing is cut`, async () => {
    const { p, ctx, errors } = await openApp(browser, server.url, { width: w, height: h });
    if (big) await p.addStyleTag({ content: 'html { font-size: 130% !important; }' });
    assert.equal(await p.evaluate(() => document.documentElement.dataset.stage), undefined, 'no candidate switch left');
    await p.waitForTimeout(800); const ci = await box(p);
    await sit(p); await p.waitForTimeout(800); const f = await box(p);
    assert.ok(Math.abs(f.svgW - f.innerW) < 1 && Math.abs(f.svgH / f.svgW - .7) < .002, 'the scene fills the width at 400 : 280, not scaled or cropped');
    assert.ok(f.inside); assert.equal(f.hscroll, false, 'no sideways scroll');
    assert.ok(Math.abs(f.h - ci.h) < 1 && Math.abs(f.top - ci.top) < 1, `no jump when sitting starts (${ci.h} → ${f.h})`);
    assert.ok(Math.abs(f.h / f.svgH - (h > w ? 1.25 : 1)) < .03, `the zendo's own height (${(f.h / f.svgH).toFixed(2)})`);
    assert.ok(f.askGap >= 10 && f.askGap <= 20 && f.panelGap >= 10 && f.panelGap <= 20, `合掌請打 and the card follow at the page's gap (${f.askGap}, ${f.panelGap})`);
    assert.ok(f.askH >= 44, 'a finger-sized 合掌請打');
    // the browser's toolbar showing and hiding changes the window's height: nothing moves
    await p.setViewportSize({ width: w, height: h - 56 }); await p.waitForTimeout(300); const t = await box(p); await p.setViewportSize({ width: w, height: h });
    assert.ok(Math.abs(t.h - f.h) < 1 && Math.abs(t.panelTop - f.panelTop) < 1, 'nothing moves when the window gets shorter');
    // the bottom safe area is still the page's own padding
    assert.ok(parseFloat(await p.evaluate(() => getComputedStyle(document.body).paddingBottom)) >= 28, 'the page keeps its bottom padding (28px + the safe area)');
    // 暫離 keeps the height; a reminder plays; the result card is whole
    await p.locator('#leaveBtn').click(); await p.waitForTimeout(900); const lv = await box(p);
    assert.ok(Math.abs(lv.h - f.h) < 1, 'the same height while away');
    await p.locator('#backBtn').click(); await p.waitForFunction(() => __keisaku.round().phase === 'focus', null, { timeout: 15000 });
    await p.evaluate(() => { __keisaku.speed(3); __hide(true); window.__skew += 3000; __hide(false); });
    await p.waitForFunction(() => !__keisaku.monk().busy && __keisaku.round().hits === 1, null, { timeout: 30000 });
    await forward(p, 26 * 60000);
    await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 15000 }); await p.waitForTimeout(700);
    const cut = await p.evaluate(() => { const c = document.querySelector('.result-card').getBoundingClientRect(), wr = document.getElementById('stageWrap').getBoundingClientRect(); return c.top < wr.top - .5 || c.bottom > wr.bottom + .5; });
    assert.equal(cut, false, 'the result card fits');
    assert.deepEqual(errors, []); await ctx.close();
  });
}
