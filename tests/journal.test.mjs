// The result card, the daily goal, sharing, the 坐禪帳 calendar and the 統計 tab.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { startServer, launch, openApp, pick, waitForLine, forward, tourText, tapRing, entry, SEEN, OUT, shot } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

const openStats = async (p, range) => {
  await p.locator('#journalBtn').click(); await p.waitForFunction(() => document.getElementById('journal').open);
  await p.locator('#tabStats').click();
  if (range) await p.locator(`[data-range="${range}"]`).click();
};
// the monk's verdict types out; wait for the whole line
const verdict = async p => {
  await p.waitForFunction(() => { const el = document.getElementById('statNote'); return el.textContent && el.textContent === el.getAttribute('aria-label'); });
  return p.evaluate(() => document.getElementById('statNote').textContent);
};

test('meeting the daily goal shows on the result card, and the card can be saved as a picture', async () => {
  const today = [entry(0), entry(0), entry(0)];
  const { p, ctx, errors } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': today, 'keisaku-opts-v1': { goal: 4 } } });
  await waitForLine(p, '今日目標 4 炷,還差 1 炷');
  await pick(p, '讀書'); await pick(p, '15 分'); await pick(p, '1 炷'); await pick(p, '沒錯'); await pick(p, '準備好了');
  await p.waitForFunction(() => document.getElementById('status').textContent === '坐禪中', null, { timeout: 15000 });
  await forward(p, 15 * 60000 + 1000);
  await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 15000 });
  assert.equal(await p.locator('#resultGoal').textContent(), '今日目標 4 炷,達成。');
  assert.match(await p.locator('#today').textContent(), /4\/4 炷/);
  const [download] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.locator('#shareResult').click()]);
  const file = path.join(OUT, 'share.png'); await download.saveAs(file);
  const png = readFileSync(file);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1080); assert.equal(png.readUInt32BE(20), 1350);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('after the first stamped round the ledger is pointed out, and the tap opens it', async () => {
  const { p, ctx } = await openApp(browser, server.url, { seen: SEEN.filter(k => k !== 'keisaku-tip-journal-v1') });
  await pick(p, '寫作'); await pick(p, '15 分'); await pick(p, '1 炷'); await pick(p, '沒錯'); await pick(p, '準備好了');
  await p.waitForFunction(() => document.getElementById('status').textContent === '坐禪中', null, { timeout: 15000 });
  await forward(p, 15 * 60000 + 1000);
  await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 15000 });
  await p.locator('#closeResult').click();
  await p.waitForFunction(() => !document.getElementById('tourCard').hidden);
  assert.match(await tourText(p), /蓋好章了/);
  await tapRing(p);
  await p.waitForFunction(() => document.getElementById('journal').open);
  await ctx.close();
});

test('the legend lines up in columns and the day detail says what its stamp means', async () => {
  const log = [entry(0, { goal: 2 }), entry(1, { min: 50, hits: 2 }), entry(2, { min: 80, hits: 1 }), entry(3, { min: 10, full: false })];
  const { p, ctx } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': log } });
  await p.locator('#journalBtn').click(); await p.waitForFunction(() => document.getElementById('journal').open);
  const xs = await p.evaluate(() => [...document.querySelectorAll('.cal-legend .key')].map(k => Math.round(k.getBoundingClientRect().left)));
  assert.equal(xs.length, 6);
  assert.deepEqual(xs.slice(3), xs.slice(0, 3), 'second row starts where the first does');
  assert.equal(await p.locator('.day-detail .kind').textContent(), '「不動」章:坐滿一炷以上,一下都沒被打。');
  await ctx.close();
});

test('統計: incense per day, a slip that stays inside the chart, and totals', async () => {
  const log = [];
  for (let i = 0; i < 42; i++) if (i % 4 !== 3) log.push(entry(i, { task: ['讀書', '工作', '寫作'][i % 3], min: 25 * (1 + i % 3), hits: i % 5 === 0 ? 2 : 0 }));
  const { p, ctx, errors } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': log } });
  await openStats(p);
  assert.equal(await p.locator('.bars .col').count(), 7);
  assert.equal(await p.locator('.ledger div').count(), 3);
  assert.match(await verdict(p), /^施主這七日/);
  for (const range of ['7', '30']) {
    await p.locator(`[data-range="${range}"]`).click();
    for (const which of ['first', 'last']) {
      await p.locator('.bars .col')[which]().click();
      const [slip, box] = await p.evaluate(() => [document.querySelector('.slip').getBoundingClientRect(), document.getElementById('dailyBars').getBoundingClientRect()].map(r => ({ l: r.left, r: r.right })));
      assert.ok(slip.l >= box.l - 0.5 && slip.r <= box.r + 0.5, `slip inside the chart (${range} days, ${which} stick)`);
    }
  }
  assert.equal(await p.locator('.bars .col').count(), 30);
  await shot(p, 'stats-30');
  await p.locator('[data-range="all"]').click();
  assert.match(await verdict(p), /^施主從/);
  assert.ok(await p.locator('.hrow').count() >= 3);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('統計 counts strikes even when no round was sat in full', async () => {
  const log = [entry(0, { task: '寫作', min: 4, hits: 2, full: false }), entry(0, { min: 6, hits: 4, full: false })];
  const { p, ctx } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': log } });
  await openStats(p);
  const hits = await p.locator('.ledger div').nth(2).textContent();
  assert.equal(hits, '被打6下', 'a count, and no per-round average without a full round');
  assert.equal(await verdict(p), '施主才剛開始,已經坐了 10 分鐘。下次試著撐到放禪鐘響吧。');
  await ctx.close();
});

// what the monk says for different histories (七日 view)
const VERDICTS = [
  ['an empty journal', [], '坐禪帳還是空的。施主坐完第一炷,我就幫你記上。'],
  ['a first week', [0, 1, 2, 3].map(o => entry(o)), '施主這七日坐了 1 小時半。好的開始。一下都沒被打,如山不動。'],
  ['more than the week before, struck less',
    [...[8, 9, 10].map(o => entry(o, { hits: 2 })), ...[0, 1, 2, 3, 4, 5].map(o => entry(o)), entry(1, { hits: 1 })],
    '施主這七日比前七日多坐了 1 小時半,了不起。被打的也少了,有進步。'],
  ['less than the week before (no nagging after comfort)', [...[8, 9, 10, 11, 12].map(o => entry(o, { min: 50 })), entry(2, { hits: 2 })],
    '這七日坐得少一些。不要緊,今天來坐一炷就好。'],
  ['about the same, struck often', [...[8, 9].map(o => entry(o, { hits: 1 })), ...[1, 2].map(o => entry(o, { hits: 3 }))],
    '這七日跟前七日差不多,穩穩的,很好。最近常被打喔,手機放遠一點吧。'],
  ['away this week', [9, 10].map(o => entry(o)), '這幾天沒見到施主。不要緊,想到了就回來坐一炷吧。'],
];
for (const [name, log, line] of VERDICTS) {
  test(`住持評語: ${name}`, async () => {
    const { p, ctx } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': log } });
    await openStats(p);
    assert.equal(await verdict(p), line);
    await ctx.close();
  });
}
