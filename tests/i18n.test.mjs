// 日本語 and English: every string is translated, and the app picks the phone's language or the one chosen in settings.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { startServer, launch, openApp, entry, ROOT, waitForLine } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

const I18N = vm.runInNewContext(readFileSync(path.join(ROOT, 'src', 'i18n.js'), 'utf8') + '; I18N');
const src = readFileSync(path.join(ROOT, 'src', 'app.js'), 'utf8');
const codeKeys = [...new Set([...src.matchAll(/(?<![\w.$])tr\('((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'")))];
const holes = s => (s.match(/\{\d\}/g) || []).sort().join();
const tags = s => (s.match(/<\/?[a-z]+/g) || []).sort().join();
const LANGS = ['ja', 'en'];

test('every string in the code has a Japanese and an English translation with the same placeholders and tags', () => {
  for (const lang of LANGS) {
    const missing = codeKeys.filter(k => I18N[lang][k] == null);
    assert.deepEqual(missing, [], `${lang}: missing`);
    for (const [k, v] of Object.entries(I18N[lang])) {
      assert.equal(holes(v), holes(k), `${lang}: placeholders in ${k}`);
      assert.equal(tags(v), tags(k), `${lang}: tags in ${k}`);
    }
  }
});

// open everything a person can open, and record any text that had no translation
async function misses(lang) {
  const log = [entry(0, { goal: 2 }), entry(1, { hits: 2, leave: 1, late: 3 }), entry(2, { min: 10, full: false })];
  const { p, ctx, errors } = await openApp(browser, server.url, { storage: { 'keisaku-opts-v1': { lang }, 'keisaku-log-v2': log } });
  await p.addInitScript(() => { window.__i18nMiss = new Set(); });
  await p.reload();
  await p.waitForSelector('#dlgChoices .choice');
  for (const [btn, extra] of [['#helpBtn'], ['#settingsBtn'], ['#journalBtn', ['#tabStats']], ['#collectBtn', ['#tabSeasons', '#tabAccs']]]) {
    await p.evaluate(sel => document.querySelector(sel).click(), btn);
    for (const sel of extra || []) await p.evaluate(sel => document.querySelector(sel).click(), sel);
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  }
  const left = await p.evaluate(() => [...window.__i18nMiss].filter(k => !['中文', '日本語'].includes(k)));
  await ctx.close();
  return { left, errors };
}
for (const lang of LANGS) {
  test(`${lang}: nothing on the screens is left in Chinese`, async () => {
    const { left, errors } = await misses(lang);
    assert.deepEqual(left, []);
    assert.deepEqual(errors, []);
  });
}

test('the phone language decides: Japanese is 警策道場, English is Keisaku Dojo', async () => {
  for (const [locale, title, lang] of [['ja-JP', '警策道場', 'ja'], ['en-US', 'Keisaku Dojo', 'en'], ['fr-FR', 'Keisaku Dojo', 'en'], ['zh-TW', '香板禪堂', 'zh-Hant']]) {
    const { p, ctx } = await openApp(browser, server.url, { locale });
    assert.equal(await p.title(), title, locale);
    assert.equal(await p.evaluate(() => document.documentElement.lang), lang, locale);
    assert.ok((await p.locator('h1').textContent()).startsWith(title), locale);
    await ctx.close();
  }
});

test('choosing a language in settings overrides the phone and applies at once', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  await p.locator('#settingsBtn').click();
  await p.locator('input[name="lang"][value="ja"]').check({ force: true });
  await p.waitForFunction(() => document.title === '警策道場');
  await waitForLine(p, '警策道場');                     // the monk's welcome, now in Japanese
  await ctx.close();
});
