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
  assert.match(await p.locator('#collectSum').textContent(), /已經收到 \d+ \/ 47 樣/);
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
  // late at night or early in the morning the first round also earns the lantern or the mokugyo
  assert.match(await p.locator('#resultNew').textContent(), /^收藏冊多了:掛軸「忍」、配件「葉子」(、配件「(小提燈|木魚)」)?$/);
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

test('the windows show this season, and each has a story', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  assert.equal(await p.evaluate(() => document.getElementById('stage').dataset.season), seasonNow());
  assert.ok(await p.evaluate(() => document.getElementById('winView').childElementCount > 0 && document.getElementById('sqView').childElementCount > 0));
  await p.locator('#windowBtn').click();
  await p.waitForFunction(() => !document.getElementById('bubble').hidden);
  assert.match(await p.locator('#bubbleText').textContent(), /迷之窗/);
  await p.locator('#roundWinBtn').click();
  await p.waitForFunction(() => /^圓的叫「悟之窗」/.test(document.getElementById('bubbleText').textContent));
  await ctx.close();
});

test('a backup carries what was on show into a plain zendo', async () => {
  const backup = { app: 'keisaku-dojo', version: 2, log: tenDays(), presets: [], collect: { scroll: '心', acc: 'leaf' } };     // a backup from before v18: one accessory
  const { p, ctx } = await openApp(browser, server.url);
  await p.locator('#settingsBtn').click(); await p.waitForFunction(() => document.getElementById('settings').open);
  await p.locator('#pasteBtn').click();
  await p.locator('#pasteText').fill(JSON.stringify(backup));
  await p.locator('#pasteGo').click();
  await p.locator('#importYes').click();
  assert.equal(await scrollText(p), '心');
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('keisaku-collect-v1')));
  assert.equal(stored.wear.head, 'leaf', 'the old single accessory lands in its slot');
  assert.ok(stored.seen.includes('s:心'), 'restored rounds are not news');
  await ctx.close();
});

test('one thing on the head, one on the body and one extra can be worn together; tapping again takes it off', async () => {
  const log = [...Array(40)].map((_, i) => entry(i, { min: 50, hits: 0, task: ['讀書', '工作', '寫作'][i % 3] }));
  const { p, ctx, errors } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': log } });
  await openBook(p);
  await p.locator('#tabAccs').click();
  assert.equal(await p.locator('.c-slot').count(), 3);
  for (const id of ['hat', 'mino', 'cat']) await card(p, id).click();     // head, body, extra (beside the cushion)
  const worn = () => p.evaluate(() => ({
    front: [...document.querySelectorAll('#mochiAcc .acc')].map(g => g.classList[1]),
    back: [...document.querySelectorAll('#mochiAccBack .acc')].map(g => g.classList[1]),
    side: [...document.querySelectorAll('#accSide .acc')].map(g => g.classList[1]) }));
  assert.deepEqual(await worn(), { front: ['acc-hat'], back: ['acc-mino'], side: ['acc-cat'] });
  await card(p, 'leaf').click();                                         // same slot as the hat: it replaces it
  assert.deepEqual((await worn()).front, ['acc-leaf']);
  await card(p, 'leaf').click();                                         // and comes off again
  assert.deepEqual((await worn()).front, []);
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('keisaku-collect-v1')));
  assert.deepEqual(stored.wear, { head: null, body: 'mino', extra: 'cat' });
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('when struck, a hat hides the bump and what is worn reacts', async () => {
  const log = [...Array(40)].map((_, i) => entry(i, { min: 50 }));
  const { p, ctx } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': log, 'keisaku-collect-v1': { scroll: '靜', wear: { head: 'hat', body: null, extra: null }, seen: [] } } });
  await sit(p);
  await p.waitForTimeout(800);
  assert.equal(await p.evaluate(() => document.querySelector('#mochiAcc .acc-hat').dataset.react), undefined, 'sitting down is not a strike');
  // the monk ignores a request while he is still fetching the keisaku, so ask until he comes
  for (let i = 0; i < 8; i++) {
    await p.locator('#askBtn').click();
    if (await p.waitForFunction(() => document.getElementById('sitter').dataset.face === 'ouch', null, { timeout: 2500 }).then(() => true, () => false)) break;
  }
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('#sitter .bump')).display), 'none');
  await p.waitForTimeout(150);
  assert.match(await p.evaluate(() => document.querySelector('#mochiAcc .acc-hat').getAttribute('transform') || ''), /rotate/, 'the hat is moving');
  await ctx.close();
});

test('faces: seen ones are collected, one can be chosen as the everyday face, and asking for a tap startles the mochi', async () => {
  const log = [...Array(3)].map((_, i) => entry(i, { min: 25, hits: 0 }));
  const { p, ctx, errors } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': log } });
  await openBook(p);
  await p.locator('#tabFaces').click();
  const locked = id => card(p, id).evaluate(b => b.classList.contains('locked'));
  assert.equal(await locked('happy'), false, 'the log already shows full rounds');
  assert.equal(await locked('proud'), false, 'three clean rounds in a row');
  assert.equal(await locked('surprised'), true, 'only seen when asking for a tap');
  await card(p, 'happy').click();
  assert.equal(await p.evaluate(() => document.getElementById('sitter').dataset.face), 'happy', 'standing at check-in, the everyday face shows at once');
  await p.locator('#collectClose').click();
  await p.reload(); await waitForLine(p, '今天想做什麼');
  assert.equal(await p.evaluate(() => document.getElementById('sitter').dataset.face), 'happy', 'and stays after a reload');
  await sit(p);
  await p.locator('#askBtn').click();
  await p.waitForFunction(() => ['surprised', 'ouch'].includes(document.getElementById('sitter').dataset.face));
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('keisaku-collect-v1')));
  assert.ok(stored.faces.includes('surprised'));
  assert.equal(stored.face, 'happy');
  assert.deepEqual(errors, []);
  await ctx.close();
});
