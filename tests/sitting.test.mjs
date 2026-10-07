// During a round: strikes, the incense, 告假 and where things on the stage sit.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, sit, status, clock, forward, tourText, tapRing, SEEN, shot } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

const rect = (p, sel) => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; }, sel);

test('asking for a strike: the monk speaks from above his head and 啪 lands on the mochi', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url);
  await sit(p);
  for (let i = 0; ; i++) {                                  // ignored while the monk is still fetching the keisaku
    await p.locator('#askBtn').click();
    try { await p.waitForFunction(() => document.getElementById('pow').classList.contains('go'), null, { timeout: 3000 }); break; }
    catch (e) { if (i >= 4) throw e; }
  }
  await p.waitForTimeout(150);                              // 啪 pops from nothing; let it grow first
  const bubble = await rect(p, '#bubble'), monk = await rect(p, '#monk'), pow = await rect(p, '#pow'), mochi = await rect(p, '#sitter');
  assert.ok(bubble.bottom <= monk.top + 2, `bubble (${bubble.bottom}) above the monk's head (${monk.top})`);
  const cx = (pow.left + pow.right) / 2, cy = (pow.top + pow.bottom) / 2;
  assert.ok(cx > mochi.left && cx < mochi.right + 40, `啪 is over the mochi horizontally (${cx} vs ${mochi.left}–${mochi.right})`);
  assert.ok(cy > mochi.top - 50 && cy < mochi.bottom, `啪 is at the mochi's head height (${cy} vs ${mochi.top}–${mochi.bottom})`);
  await shot(p, 'strike');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the smoke follows the ember down as the incense burns', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  await sit(p);
  const at = () => p.evaluate(() => ({ smoke: document.getElementById('smoke').getBoundingClientRect().bottom, ember: document.getElementById('ember').getBoundingClientRect().top }));
  await p.waitForTimeout(600);                              // let the clock tick draw the lit incense first
  const a = await at();
  await forward(p, 12 * 60000); await p.waitForTimeout(600);
  const b = await at();
  assert.ok(b.ember - a.ember > 10, 'the ember moved down');
  assert.ok(Math.abs((b.smoke - a.smoke) - (b.ember - a.ember)) < 1.5, 'the smoke moved with it');
  await ctx.close();
});

test('round numbers use the status line\'s own font', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  await sit(p);
  const [num, line] = await p.evaluate(() => [getComputedStyle(document.querySelector('#roundLabel b')).fontFamily, getComputedStyle(document.getElementById('roundLabel')).fontFamily]);
  assert.equal(num, line);
  await ctx.close();
});

test('告假 freezes the clock, 回座 carries on from there, and it can be used once a round', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url);
  await sit(p);
  await forward(p, 5 * 60000); await p.waitForTimeout(400);
  await p.locator('#leaveBtn').click();
  assert.equal(await status(p), '告假中');
  const frozen = await clock(p);
  await forward(p, 3 * 60000); await p.waitForTimeout(400);
  assert.equal(await clock(p), frozen, 'the clock does not run during 告假');
  await p.locator('#backBtn').click();
  await p.waitForFunction(() => document.getElementById('status').textContent === '坐禪中', null, { timeout: 15000 });
  const [fm, fs] = frozen.split(':').map(Number), [m, s] = (await clock(p)).split(':').map(Number);
  assert.ok(fm * 60 + fs - (m * 60 + s) <= 6, 'continues from where it stopped');
  assert.equal(await p.locator('#leaveBtn').isHidden(), true, 'one 告假 per round');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('leaving the sitting during 告假 still saves the minutes already sat', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  await sit(p);
  await forward(p, 7 * 60000); await p.waitForTimeout(400);
  await p.locator('#leaveBtn').click();
  await p.locator('#mainBtn').click();
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('keisaku-log-v2') || '[]').length === 1);
  const [e] = await p.evaluate(() => JSON.parse(localStorage.getItem('keisaku-log-v2')));
  assert.equal(e.min, 7); assert.equal(e.full, false); assert.equal(e.leave, 1);
  await ctx.close();
});

test('the first time they are caught, 告假 is pointed out and tapping it takes the leave', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url, { seen: SEEN.filter(k => k !== 'keisaku-tip-leave-v1') });
  await sit(p);
  await p.evaluate(() => { window.__hide(true); window.__skew += 5000; window.__hide(false); });
  await p.waitForFunction(() => !document.getElementById('tourCard').hidden, null, { timeout: 15000 });
  assert.match(await tourText(p), /告假/);
  assert.equal(await p.evaluate(() => document.getElementById('tourCard').classList.contains('at-top')), true, 'the card moves up so it does not cover the button');
  await tapRing(p);
  await p.waitForFunction(() => document.getElementById('status').textContent === '告假中');
  assert.deepEqual(errors, []);
  await ctx.close();
});
