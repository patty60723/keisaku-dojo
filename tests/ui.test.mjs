// Things that make it feel like an app: no tap flash, no text selection, the header, both themes.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, waitForLine, entry, shot } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

test('no tap highlight and no text selection, except where you type', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  const s = await p.evaluate(() => ({
    clockSelect: getComputedStyle(document.getElementById('clock')).userSelect,
    clockTap: getComputedStyle(document.getElementById('clock')).webkitTapHighlightColor,
    stageSelect: getComputedStyle(document.getElementById('stageWrap')).userSelect,
    textarea: getComputedStyle(document.getElementById('pasteText')).userSelect }));
  assert.deepEqual(s, { clockSelect: 'none', clockTap: 'rgba(0, 0, 0, 0)', stageSelect: 'none', textarea: 'text' });
  await ctx.close();
});

test('the header keeps only the settings gear; the streak badge stays inside the zendo', async () => {
  const log = [1, 2, 3].map(o => entry(o));
  const { p, ctx } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': log } });
  assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('.top-btns button')].map(b => b.id)), ['settingsBtn']);
  assert.equal(await p.locator('#streakBadge').textContent(), '3');
  const [badge, stage] = await p.evaluate(() => ['#streakBadge', '#stageWrap'].map(s => document.querySelector(s).getBoundingClientRect()).map(r => ({ l: r.left, r: r.right, t: r.top })));
  assert.ok(badge.l >= stage.l && badge.r <= stage.r, 'badge not cut off by the zendo edge');
  await ctx.close();
});

for (const [dark, width] of [[false, 360], [true, 390]]) {
  test(`${dark ? 'dark' : 'light'} theme at ${width}px: no errors, nothing wider than the screen`, async () => {
    const { p, ctx, errors } = await openApp(browser, server.url, { dark, width });
    await waitForLine(p, '今日想做的事');
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await shot(p, `home-${dark ? 'dark' : 'light'}-${width}`);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}
