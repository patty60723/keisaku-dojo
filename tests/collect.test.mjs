// The 收藏冊: scrolls, the seasons outside the windows, things for the mochi to wear.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, pick, waitForLine, forward, tourText, tapRing, entry, SEEN, sit } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

const SEASON_SCROLL = { spring: '花開', summer: '清風', autumn: '明月', winter: '雪' };
const seasonNow = () => ['spring', 'summer', 'autumn', 'winter'][Math.floor(((new Date().getMonth() + 11) % 12) / 3)];
const tenDays = () => [...Array(10)].map((_, i) => entry(i));          // ten full rounds on ten days in a row, none struck
const openBook = async p => { await p.locator('#collectBtn').click(); await p.waitForFunction(() => document.getElementById('collect').open); };
const card = (p, id) => p.locator(`.c-item[data-id="${id}"]`);
const scrollText = p => p.evaluate(() => document.getElementById('scrollText').textContent);

test('the hanging scroll opens the 收藏冊, which works out from the log what has been earned', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': tenDays() } });
  await openBook(p);
  const locked = id => card(p, id).evaluate(b => b.classList.contains('locked'));
  for (const id of ['靜', '忍', '心', '莫妄想', '日日是好日', SEASON_SCROLL[seasonNow()]]) assert.equal(await locked(id), false, id);
  for (const id of ['無', '一期一會', '放下著']) assert.equal(await locked(id), true, id);
  assert.match(await card(p, '無').textContent(), /還差 40 炷/);
  assert.match(await p.locator('#collectSum').textContent(), /已經收到 \d+ \/ 23 樣/);
  await p.locator('#tabAccs').click();
  assert.equal(await locked('leaf'), false);
  assert.equal(await locked('hat'), true);
  await p.locator('#tabSeasons').click();
  assert.equal(await p.locator('.c-season.now').count(), 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('a chosen scroll and accessory show in the zendo and stay after a reload', async () => {
  const { p, ctx } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': tenDays() } });
  await openBook(p);
  await card(p, '日日是好日').click();
  assert.equal(await scrollText(p), '日日是好日');
  await p.locator('#tabAccs').click();
  await card(p, 'leaf').click();
  assert.equal(await card(p, 'leaf').getAttribute('aria-pressed'), 'true');
  assert.ok(await p.evaluate(() => document.getElementById('mochiAcc').childElementCount > 0));
  await card(p, '無').click().catch(() => {});                       // not in the scrolls tab; and locked ones never apply
  await p.reload();
  assert.equal(await scrollText(p), '日日是好日');
  assert.ok(await p.evaluate(() => document.getElementById('mochiAcc').childElementCount > 0));
  await ctx.close();
});

test('while sitting the 收藏冊 can be looked at but not changed', async () => {
  const { p, ctx } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': tenDays() } });
  await sit(p);
  await openBook(p);
  assert.equal(await p.locator('#collectNote').isVisible(), true);
  await card(p, '心').click({ force: true });                    // aria-disabled: Playwright would wait for it to be enabled
  assert.equal(await scrollText(p), '靜');
  await ctx.close();
});

test('the first full round earns a scroll and a leaf; the monk offers them after the result card', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  await pick(p, '寫作'); await pick(p, '15 分'); await pick(p, '1 炷'); await pick(p, '沒錯'); await pick(p, '準備好了');
  await p.waitForFunction(() => document.getElementById('status').textContent === '坐禪中', null, { timeout: 15000 });
  await forward(p, 15 * 60000 + 1000);
  await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 15000 });
  assert.equal(await p.locator('#resultNew').textContent(), '收藏冊多了:掛軸「忍」、配件「葉子」');
  await p.locator('#closeResult').click();
  await waitForLine(p, '這幅「忍」送你');
  await pick(p, '掛上去');
  await waitForLine(p, '這片葉子也送你');
  await pick(p, '戴上');
  await waitForLine(p, '今天想做什麼');
  assert.equal(await scrollText(p), '忍');
  assert.ok(await p.evaluate(() => document.getElementById('mochiAcc').childElementCount > 0));
  await ctx.close();
});

test('people who took the tour before are shown the 收藏冊 once, and old rounds are not news', async () => {
  const seen = SEEN.filter(k => k !== 'keisaku-tip-collect-v1');
  const { p, ctx } = await openApp(browser, server.url, { seen, storage: { 'keisaku-log-v2': tenDays() } });
  await p.waitForFunction(() => !document.getElementById('tourCard').hidden);
  assert.match(await tourText(p), /^禪堂多了一本收藏冊/);
  await tapRing(p);
  await p.waitForFunction(() => document.getElementById('collect').open);
  await p.locator('#collectClose').click();
  await waitForLine(p, '今天想做什麼');
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('keisaku-collect-v1')));
  assert.ok(stored.seen.includes('s:心'), 'what was earned before counts as already seen');
  await p.reload();
  await waitForLine(p, '今天想做什麼');
  assert.equal(await tourText(p), null, 'only once');
  await ctx.close();
});

test('the windows show this season, and the square one has a story', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  assert.equal(await p.evaluate(() => document.getElementById('stage').dataset.season), seasonNow());
  assert.ok(await p.evaluate(() => document.getElementById('winView').childElementCount > 0 && document.getElementById('sqView').childElementCount > 0));
  await p.locator('#windowBtn').click();
  await p.waitForFunction(() => !document.getElementById('bubble').hidden);
  assert.match(await p.locator('#bubbleText').textContent(), /迷之窗/);
  await ctx.close();
});

test('a backup carries what was on show into a plain zendo', async () => {
  const backup = { app: 'keisaku-dojo', version: 2, log: tenDays(), presets: [], collect: { scroll: '心', acc: 'leaf' } };
  const { p, ctx } = await openApp(browser, server.url);
  await p.locator('#settingsBtn').click(); await p.waitForFunction(() => document.getElementById('settings').open);
  await p.locator('#pasteBtn').click();
  await p.locator('#pasteText').fill(JSON.stringify(backup));
  await p.locator('#pasteGo').click();
  await p.locator('#importYes').click();
  assert.equal(await scrollText(p), '心');
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('keisaku-collect-v1')));
  assert.equal(stored.acc, 'leaf');
  assert.ok(stored.seen.includes('s:心'), 'restored rounds are not news');
  await ctx.close();
});
