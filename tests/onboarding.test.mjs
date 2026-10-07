// First visit: the introduction, the tour, and where 略過開場 may appear.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, pick, waitForLine, dialogText, skipVisible, tourText, tapRing, entry, shot } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

const sheetOpen = (p, id) => p.evaluate(id => document.getElementById(id).open, id);

test('first visit: introduction, then a tour that has to be tapped and opens each thing, then the plan', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url, { seen: [] });
  await waitForLine(p, '歡迎來到警策道場。我是這裡的住持。');
  assert.equal(await skipVisible(p), true, '略過開場 is offered during the introduction');
  await pick(p, '你好'); await pick(p, '然後呢?');
  await waitForLine(p, '這支警策');
  await p.waitForFunction(() => getComputedStyle(document.getElementById('rackStick')).visibility === 'hidden');
  assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('stickLayer')).visibility), 'visible', 'the monk holds the keisaku while talking about it');
  await pick(p, '我會專心的');
  await p.waitForFunction(() => getComputedStyle(document.getElementById('rackStick')).visibility === 'visible', null, { timeout: 8000 });
  await pick(p, '好');

  await p.waitForFunction(() => !document.getElementById('tourCard').hidden);
  const first = await tourText(p);
  assert.match(first, /規約/);
  await p.mouse.click(200, 700);                                   // outside the lit spot: nothing happens
  assert.equal(await tourText(p), first);
  for (const [sheet, next] of [['help', '坐禪帳'], ['journal', '齒輪'], ['settings', null]]) {
    await tapRing(p);
    await p.waitForFunction(id => document.getElementById(id).open, sheet);
    assert.equal(await p.evaluate(() => document.getElementById('tourCard').hidden), true, 'the tour steps aside while a sheet is open');
    await p.locator(`#${sheet}Close`).click();
    if (next) await p.waitForFunction(t => !document.getElementById('tourCard').hidden && document.getElementById('tourText').textContent.includes(t), next);
  }
  await waitForLine(p, '那麼,施主今日想做的事是什麼?');
  assert.equal(await skipVisible(p), false, 'choosing the plan is not part of the opening');
  await pick(p, '讀書');
  await waitForLine(p, '每炷香要坐多久');
  assert.equal(await skipVisible(p), false);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('略過開場 skips the introduction but still runs the tour', async () => {
  const { p, ctx } = await openApp(browser, server.url, { seen: [] });
  await waitForLine(p, '歡迎來到警策道場');
  await p.locator('#dlgSkip').click();
  await p.waitForFunction(() => !document.getElementById('tourCard').hidden);
  assert.match(await tourText(p), /規約/);
  await p.locator('#tourSkip').click();
  await waitForLine(p, '那麼,施主今日想做的事是什麼?');
  await ctx.close();
});

test('the tour can be followed with the keyboard', async () => {
  const { p, ctx } = await openApp(browser, server.url, { seen: ['keisaku-rules-asked-v1'], storage: { 'keisaku-log-v2': [entry(1)] } });
  await p.waitForFunction(() => !document.getElementById('tourCard').hidden);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.getElementById('help').open);
  await ctx.close();
});

test('a returning visitor who has not seen the tour hears that the dojo was rearranged', async () => {
  const { p, ctx } = await openApp(browser, server.url, { seen: ['keisaku-rules-asked-v1'], storage: { 'keisaku-log-v2': [entry(1)] } });
  await p.waitForFunction(() => !document.getElementById('tourCard').hidden);
  assert.match(await tourText(p), /^道場重新布置過了/);
  await shot(p, 'tour-returning');
  await p.locator('#tourSkip').click();
  await waitForLine(p, '今日想做的事');
  assert.match(await dialogText(p), /^施主又來了/);
  await ctx.close();
});

test('the board and the ledger in the zendo open their sheets; settings offers a way back to both', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  await waitForLine(p, '今日想做的事');
  await p.locator('#helpBtn').click(); await p.waitForFunction(() => document.getElementById('help').open);
  assert.equal(await p.locator('#helpTitle').textContent(), '道場規約');
  await p.locator('#helpClose').click(); await p.waitForFunction(() => !document.getElementById('help').open);
  await p.locator('#journalBtn').click(); assert.equal(await sheetOpen(p, 'journal'), true);
  await p.locator('#journalClose').click(); await p.waitForFunction(() => !document.getElementById('journal').open);
  await p.locator('#settingsBtn').click(); await p.waitForFunction(() => document.getElementById('settings').open);
  await p.locator('#openRules').click(); await p.waitForFunction(() => document.getElementById('help').open);
  await ctx.close();
});
