// Shared helpers for the end-to-end tests: a local server, a phone-sized page with a controllable
// clock and visibility, and small actions for the dialogue and the tour.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'tests', 'output');     // screenshots and saved files (git-ignored)
mkdirSync(OUT, { recursive: true });

// Service workers and notifications only work over http://, so serve the repo instead of opening files.
export async function startServer() {
  const port = 8700 + Math.floor(Math.random() * 200);
  const proc = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', ROOT], { stdio: 'ignore' });
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(url)).ok) return { url, stop: () => proc.kill() }; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  proc.kill(); throw new Error('test server did not start');
}

// The one-off explanations, so a test can start straight at the part it is about.
export const SEEN = ['keisaku-tour-v1', 'keisaku-rules-asked-v1', 'keisaku-leave-told-v1', 'keisaku-tip-leave-v1', 'keisaku-tip-journal-v1'];

const day = offset => { const d = new Date(); d.setDate(d.getDate() - offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
// a log entry `offset` days ago
export const entry = (offset, fields) => ({ t: Date.now() - offset * 864e5 + Math.random() * 1000, d: day(offset), task: '工作', min: 25, hits: 0, full: true, ...fields });

/**
 * Open the app at phone size.
 *   seen:    one-off explanation keys already marked as done (default: all of them)
 *   storage: extra localStorage entries, values JSON-encoded unless strings
 *   path:    page to open (default index.html)
 * In the page: window.__skew moves Date.now() forward, window.__hide(true/false) fakes leaving the app,
 * and window.__notes collects notifications instead of showing them.
 */
export async function openApp(browser, base, { seen = SEEN, storage = {}, path: page = 'index.html', dark = false, width = 390 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    colorScheme: dark ? 'dark' : 'light', acceptDownloads: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  const init = { seen, storage: Object.fromEntries(Object.entries(storage).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])) };
  await p.addInitScript(init => {
    const real = Date.now.bind(Date); window.__skew = 0; Date.now = () => real() + window.__skew;
    let hidden = false;
    Object.defineProperty(document, 'hidden', { get: () => hidden });
    Object.defineProperty(document, 'visibilityState', { get: () => hidden ? 'hidden' : 'visible' });
    window.__hide = h => { hidden = h; document.dispatchEvent(new Event('visibilitychange')); };
    window.__notes = [];
    ServiceWorkerRegistration.prototype.showNotification = function (title, o) { window.__notes.push(`${title} / ${o.body}`); return Promise.resolve(); };
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
    if (sessionStorage.seeded) return;                      // only on the first load, not after a reload
    sessionStorage.seeded = 1;
    for (const k of init.seen) localStorage.setItem(k, 'true');
    for (const [k, v] of Object.entries(init.storage)) localStorage.setItem(k, v);
  }, init);
  await p.goto(base + page);
  return { p, ctx, errors };
}

export const launch = () => chromium.launch();

// pick a dialogue choice once it appears (choices only appear after the line has finished typing)
export const pick = async (p, label) => { await p.locator('.choice', { hasText: label }).first().click(); };
// the choices on offer, once the current line has finished typing
export async function choices(p) {
  await p.waitForSelector('#dlgChoices .choice');
  return p.evaluate(() => [...document.querySelectorAll('#dlgChoices .choice')].map(c => c.textContent));
}
export const dialogText = p => p.evaluate(() => document.getElementById('dialog').hidden ? null : document.getElementById('dlgText').textContent);
export const waitForLine = (p, part) => p.waitForFunction(t => !document.getElementById('dialog').hidden && document.getElementById('dlgText').textContent.includes(t), part);
export const skipVisible = p => p.evaluate(() => !document.getElementById('dlgSkip').hidden);
export const clock = p => p.evaluate(() => document.getElementById('clock').textContent);
export const status = p => p.evaluate(() => document.getElementById('status').textContent);
export const forward = (p, ms) => p.evaluate(ms => { window.__skew += ms; }, ms);
export const tourText = p => p.evaluate(() => document.getElementById('tourCard').hidden ? null : document.getElementById('tourText').textContent);
// tap the middle of the lit spot in the tour
export async function tapRing(p) {
  const [x, y] = await p.evaluate(() => { const r = document.getElementById('tourRing').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await p.mouse.click(x, y);
}
export const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 78 });

// plan a sitting from the task question and start it
export async function sit(p, { task = '讀書', focus = '25 分', rounds = '1 炷', rest = '5 分' } = {}) {
  await pick(p, task); await pick(p, focus); await pick(p, rounds);
  if (rounds !== '1 炷') await pick(p, rest);
  await pick(p, '沒錯'); await pick(p, '準備好了');
  await p.waitForFunction(() => document.getElementById('status').textContent === '坐禪中', null, { timeout: 15000 });
}
