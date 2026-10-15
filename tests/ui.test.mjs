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

test('dark theme: the monk keeps dark eyes and feet, and the stats smoke rises straight from the lit stick', async () => {
  const log = [entry(0, { min: 15, hits: 7 }), entry(1, { min: 20 })];
  const { p, ctx } = await openApp(browser, server.url, { dark: true, storage: { 'keisaku-log-v2': log } });
  const ink = 'rgb(42, 38, 34)';
  const fills = await p.evaluate(() => [...document.querySelectorAll('#monk > ellipse.f-sink, .monk-face .f-sink')].map(e => getComputedStyle(e).fill));
  assert.ok(fills.length >= 4 && fills.every(f => f === ink), `dark ink in dark mode, got ${fills.join(', ')}`);
  await p.locator('#journalBtn').click(); await p.waitForFunction(() => document.getElementById('journal').open);
  await p.locator('#tabStats').click();
  await p.waitForTimeout(400);
  const [wisp, stick] = await p.evaluate(() => [document.querySelector('.bars .wisp'), document.querySelector('.bars .stick.lit')]
    .map(e => { const r = e.getBoundingClientRect(); return r.left + r.width / 2; }));
  assert.ok(Math.abs(wisp - stick) < 2.5, `smoke centred on the stick (${wisp} vs ${stick})`);
  await shot(p, 'stats-dark');
  await ctx.close();
});

test('link preview tags point at a 1200×630 image that exists', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const meta = name => (html.match(new RegExp(`<meta property="${name}" content="([^"]+)"`)) || [])[1];
  assert.equal(meta('og:title'), '警策道場|番茄鐘・不准滑手機');
  const img = meta('og:image');
  assert.match(img, /^https:\/\/patty60723\.github\.io\/keisaku-dojo\/icons\/og-v\d+\.png$/);
  const file = new URL('../' + img.split('/keisaku-dojo/')[1], import.meta.url);
  assert.ok(existsSync(file), 'the preview image is in the repo');
  const png = readFileSync(file);
  assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
});

test('settings show the version from sw.js, a privacy note, and a report link that carries version and device', async () => {
  const { readFileSync } = await import('node:fs');
  const version = readFileSync(new URL('../sw.js', import.meta.url), 'utf8').match(/const VERSION = '([^']+)'/)[1];
  const { p, ctx } = await openApp(browser, server.url);
  await p.locator('#settingsBtn').click(); await p.waitForFunction(() => document.getElementById('settings').open);
  assert.equal(await p.locator('#appVersion').textContent(), version);
  assert.match(await p.locator('.about').textContent(), /不會上傳/);
  await p.evaluate(() => document.addEventListener('click', e => e.preventDefault()));   // read the link instead of opening GitHub
  await p.locator('#feedbackLink').click();
  const body = decodeURIComponent((await p.locator('#feedbackLink').getAttribute('href')).split('body=')[1]);
  assert.match(body, new RegExp(`版本:${version}`));
  assert.match(body, /裝置:Mozilla/);
  assert.match(body, /開啟方式:瀏覽器/);
  await ctx.close();
});
