// Making the plan: typed numbers, changing one setting at a time, and when the plan can still change.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, pick, waitForLine, skipVisible, clock, forward, choices } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

const typeNumber = async (p, n) => { await p.locator('#dlgInput').fill(String(n)); await p.locator('.dlg-input button').click(); };

test('a typed length out of range is explained by the monk, then accepted when it fits', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url);
  await pick(p, '讀書'); await pick(p, '自訂');
  await waitForLine(p, '每炷要坐幾分鐘');
  await typeNumber(p, 200);
  await waitForLine(p, '要 5 到 120 分之間喔');
  await typeNumber(p, 40);
  await waitForLine(p, '要坐幾炷');
  await pick(p, '1 炷');
  await waitForLine(p, '每炷 40 分');
  assert.equal(await skipVisible(p), false);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the plan can be changed one setting at a time, from the recap and from the first ready check only', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url);
  await pick(p, '讀書'); await pick(p, '25 分'); await pick(p, '1 炷');
  await pick(p, '我要改');
  await waitForLine(p, '要改哪裡');
  assert.deepEqual(await choices(p), ['要做的事讀書', '每炷多久25 分', '坐幾炷1 炷', '改好了']);
  await pick(p, '坐幾炷'); await pick(p, '2 炷');
  await waitForLine(p, '休息多久');                           // two rounds need a break length
  await pick(p, '10 分');
  await waitForLine(p, '要改哪裡');
  await pick(p, '改好了');
  await waitForLine(p, '中間休息 10 分');
  await pick(p, '沒錯');
  await waitForLine(p, '準備好了嗎');
  assert.ok((await choices(p)).some(c => c.startsWith('改設定')), 'the first ready check offers 改設定');
  await pick(p, '改設定'); await pick(p, '每炷多久'); await pick(p, '40 分'); await pick(p, '改好了');
  await waitForLine(p, '好,改成「讀書」,40 分 × 2 炷。');
  assert.equal(await clock(p), '40:00');
  await pick(p, '準備好了');
  await p.waitForFunction(() => document.getElementById('status').textContent === '坐禪中', null, { timeout: 15000 });
  await forward(p, 40 * 60000 + 1000);
  await p.waitForFunction(() => document.getElementById('status').textContent === '休息');
  await forward(p, 10 * 60000 + 1000);
  await waitForLine(p, '第 2 炷,準備好了嗎');
  assert.ok(!(await choices(p)).some(c => c.startsWith('改設定')), 'no changing the plan halfway through');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('略過開場 with a plan from last time says which plan is used', async () => {
  const { p, ctx } = await openApp(browser, server.url, { seen: [], storage: {
    'keisaku-tour-v1': 'true', 'keisaku-rules-asked-v1': 'true', 'keisaku-leave-told-v1': 'true',
    'keisaku-last-v1': { task: '寫作', focusMin: 40, rounds: 2, breakMin: 10 } } });
  await waitForLine(p, '今日想做的事');
  assert.equal(await skipVisible(p), false, 'the menu is not part of the opening');
  assert.ok((await choices(p)).some(c => c.startsWith('跟上次一樣')));
  await pick(p, '跟上次一樣');
  await waitForLine(p, '一樣是「寫作」,40 分 × 2 炷');
  await ctx.close();
});
