// Between rounds: the notification while away, and coming back late.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, sit, forward, waitForLine } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

test('a break that ends while away sends a notification, and coming back late is noted', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url);
  await sit(p, { focus: '15 分', rounds: '2 炷', rest: '5 分' });
  await forward(p, 15 * 60000 + 1000);
  await p.waitForFunction(() => document.getElementById('status').textContent === '休息');
  await p.evaluate(() => { const c = document.getElementById('optNotify'); c.checked = true; c.dispatchEvent(new Event('change')); });
  await p.waitForFunction(() => document.getElementById('optNotify').checked);
  await p.evaluate(() => window.__hide(true));
  await forward(p, 9 * 60000);
  await p.waitForFunction(() => window.__notes.length === 1, null, { timeout: 5000 });
  assert.equal(await p.evaluate(() => window.__notes[0]), '休息結束,該回座了 / 第 2 炷要開始了,回來坐禪吧。');
  assert.equal(await p.evaluate(() => document.getElementById('dialog').hidden), true, 'the monk waits until they are back');
  await p.evaluate(() => window.__hide(false));
  await waitForLine(p, '休息超過 4 分鐘了喔。第 2 炷,準備好了嗎');
  assert.deepEqual(errors, []);
  await ctx.close();
});
