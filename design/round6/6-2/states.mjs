// Round 6-2 state tool (not part of the app): walks the sitting screen through its states on each profile, saves a
// screenshot of each, and records where the zendo and the card's buttons are, frame by frame, across the moments that
// could make the page jump (check-in → settle → sitting, the sensor note folding away, 出堂 confirm and back,
// 暫離 → 回座, the break). It also checks the first visit: no timer card during the welcome and the tour, one nameplate.
//   node design/round6/6-2/states.mjs [words…]     only profiles whose name contains one of the words
//   STATES_OUT=<folder under design/round6/6-2>     default: after
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, openApp, forward, entry, ROOT } from '../../../tests/helpers.mjs';

const OUT = path.join(ROOT, 'design', 'round6', '6-2', process.env.STATES_OUT || 'after');
const want = process.argv.slice(2);
const PROFILES = [
  { name: '320x640', width: 320, height: 640 },
  { name: '360x780', width: 360, height: 780 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
  { name: '390x844-text130', width: 390, height: 844, big: true },
  { name: '320x640-text130', width: 320, height: 640, big: true },
  { name: '390x844-dark', width: 390, height: 844, dark: true },
  { name: '390x844-dusk', width: 390, height: 844, theme: 'dusk' },
  { name: '390x844-en', width: 390, height: 844, lang: 'en' },
  { name: '320x640-en', width: 320, height: 640, lang: 'en' },
  { name: '390x844-ja', width: 390, height: 844, lang: 'ja' },
  { name: '390x844-reduced-motion', width: 390, height: 844, reducedMotion: 'reduce' },
].filter(p => !want.length || want.some(w => process.env.STATES_EXACT ? p.name === w : p.name.includes(w)));

const LONG_TASK = '期末報告與作業整理第三章';   // 12 characters, the longest task name the app accepts
// where things are: the zendo, the card and its buttons, page scroll — and a few checks that are true or false
const where = p => p.evaluate(() => {
  const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return cs.display === 'none' || b.width === 0 ? null : { top: +(b.top + scrollY).toFixed(1), left: +b.left.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const lines = s => { const e = document.querySelector(s); if (!e) return 0; const b = e.getBoundingClientRect(); return Math.round(b.height / parseFloat(getComputedStyle(e).lineHeight || 20)); };
  const foot = document.querySelector('.foot-btns'), btns = foot ? [...foot.children].filter(b => !b.hidden) : [];
  const rows = new Set(btns.map(b => Math.round(b.getBoundingClientRect().top))).size;
  const vertical = btns.some(b => { const t = b.querySelector('.ml') || b; return t.getBoundingClientRect().height > parseFloat(getComputedStyle(b).fontSize) * 2.2; });
  const red = [...document.querySelectorAll('.panel *')].filter(e => { const s = getComputedStyle(e); return e.getClientRects().length && s.visibility !== 'hidden' && +s.opacity > .1 && /rgb\(179, 50, 29\)|rgb\(195, 59, 36\)/.test(s.color) && e.textContent.trim(); }).map(e => e.id || e.className);
  return { phase: __keisaku.round().phase, scrollY, pageH: document.documentElement.scrollHeight, vh: innerHeight, hscroll: document.documentElement.scrollWidth > innerWidth,
    header: r('.top'), stage: r('#stageWrap'), panel: r('#panel'), dialog: r('#dialog'), leave: r('#leaveBtn'), back: r('#backBtn'), main: r('#mainBtn'), sense: r('#sense'), clock: r('#clock'),
    btnRows: rows, verticalText: vertical, statusLines: lines('.status-line'), redInCard: red,
    status: document.getElementById('status').textContent, label: document.getElementById('roundLabel').textContent,
    tourCard: !document.getElementById('tourCard').hidden, dialogShown: !document.getElementById('dialog').hidden && getComputedStyle(document.getElementById('dialog')).visibility !== 'hidden',
    nameplates: [...document.querySelectorAll('.dlg-name')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]')).length };
});

async function press(p) {                          // answer the monk with the suggested choice until the session starts
  for (let i = 0; i < 60; i++) {
    if (await p.evaluate(() => __keisaku.round().phase !== 'idle' && __keisaku.round().phase !== 'ready')) return;
    await p.locator('#dlgChoices .choice.primary').first().click({ timeout: 1500 }).catch(() => {});
    await p.waitForTimeout(250);
  }
  throw new Error('the session did not start');
}
// a recording of positions every ~80 ms while something happens
async function film(p, ms, fn) {
  const frames = [];
  const t0 = Date.now(); const job = fn ? fn() : null;
  while (Date.now() - t0 < ms) { frames.push({ t: Date.now() - t0, ...(await where(p)) }); await p.waitForTimeout(80); }
  if (job) await job;
  return frames;
}
// how far the zendo and the buttons moved within a recording (only while each is on screen)
function jumps(frames) {
  const out = {};
  for (const k of ['header', 'stage', 'leave', 'back', 'main', 'clock']) {
    const v = frames.map(f => f[k]).filter(Boolean); if (v.length < 2) continue;
    out[k] = +Math.max(...v.map(b => Math.max(Math.abs(b.top - v[0].top), k === 'clock' ? 0 : Math.max(Math.abs(b.left - v[0].left), Math.abs(b.w - v[0].w))))).toFixed(1);   // the clock's digits change width; only its place counts
  }
  return out;
}

// a run limited to some profiles keeps the others' results
const prevFile = path.join(OUT, 'states.json');
const data = want.length && fs.existsSync(prevFile) ? JSON.parse(fs.readFileSync(prevFile, 'utf8')) : { profiles: {} };
data.taken = new Date().toISOString();
const server = await startServer(), browser = await launch();
try {
  for (const prof of PROFILES) {
    const dir = path.join(OUT, prof.name); fs.mkdirSync(dir, { recursive: true });
    const D = data.profiles[prof.name] = { states: {}, films: {}, checks: [] };
    let n = 0;
    const shot = async (p, name) => { n++; await p.waitForTimeout(150); await p.screenshot({ path: path.join(dir, `${String(n).padStart(2, '0')}_${name}.jpg`), type: 'jpeg', quality: 80 }); D.states[name] = await where(p); };
    const opts = { ...(prof.lang ? { lang: prof.lang } : {}), ...(prof.theme ? { theme: prof.theme } : {}), sound: false };
    const base = { width: prof.width, height: prof.height, dark: prof.dark, reducedMotion: prof.reducedMotion || 'no-preference' };
    const big = async p => { if (prof.big) await p.addStyleTag({ content: 'html { font-size: 130% !important; }' }); };

    /* 1. first visit: the welcome and the tour, then check-in */
    {
      const { p, ctx, errors } = await openApp(browser, server.url, { ...base, seen: [], storage: { 'keisaku-opts-v1': opts } });
      await big(p);
      await p.waitForSelector('#dlgChoices .choice'); await shot(p, 'first-welcome');
      for (let i = 0; i < 4; i++) { await p.locator('#dlgChoices .choice').first().click(); if (i < 3) await p.waitForTimeout(300), await p.waitForSelector('#dlgChoices .choice'); }
      await p.waitForFunction(() => !document.getElementById('tourCard').hidden); await p.waitForTimeout(500); await shot(p, 'first-tour');
      await p.locator('#tourSkip').click();
      await p.waitForSelector('#dlgChoices .choice'); await shot(p, 'first-checkin');
      // a reload in the middle of the welcome starts it again, still without the card
      await p.evaluate(() => localStorage.removeItem('keisaku-tour-v1')); await p.reload(); await big(p);
      await p.waitForSelector('#dlgChoices .choice'); D.states['reload-welcome'] = await where(p);
      D.errors = errors; await ctx.close();
    }

    /* 2. a returning sitter: check-in, sitting, strikes, 出堂 confirm, 暫離, 回座, break, round 2 */
    {
      const log = [entry(0, { task: LONG_TASK, min: 600, hits: 12340 })];
      const { p, ctx, errors } = await openApp(browser, server.url, { ...base, storage: { 'keisaku-opts-v1': opts, 'keisaku-log-v2': log,
        'keisaku-last-v1': { task: LONG_TASK, focusMin: 25, rounds: 4, breakMin: 5 } } });
      await big(p);
      await p.waitForSelector('#dlgChoices .choice.primary'); await shot(p, 'checkin');
      // check-in → settle → sitting: the header steps back, the dialogue goes, the zendo must not move
      const toSit = film(p, 6500, () => press(p));
      D.films.checkinToSitting = await toSit;
      await p.waitForFunction(() => __keisaku.round().phase === 'focus', null, { timeout: 15000 });
      await shot(p, 'focus-note');
      D.films.noteFolds = await film(p, 7000);
      await shot(p, 'focus-quiet');
      await p.locator('#sense summary').click(); await shot(p, 'focus-sense-open'); await p.locator('#sense summary').click();
      // a strike and another one: the count grows, the card holds
      await p.evaluate(() => { __keisaku.speed(4); __hide(true); window.__skew += 3000; __hide(false); });
      await p.waitForFunction(() => !__keisaku.monk().busy && __keisaku.round().hits === 1, null, { timeout: 30000 }).catch(() => {});
      await p.evaluate(() => { __hide(true); window.__skew += 3000; __hide(false); });
      await p.waitForFunction(() => !__keisaku.monk().busy && __keisaku.round().hits === 2, null, { timeout: 30000 }).catch(() => {});
      await p.waitForTimeout(500); await shot(p, 'focus-after-strikes');
      // 出堂 asks twice; after 3 s it goes back by itself
      D.films.quitConfirm = await film(p, 3800, async () => { await p.locator('#mainBtn').click(); await p.waitForTimeout(250); await shot(p, 'focus-quit-confirm'); });
      await shot(p, 'focus-quit-restored');
      // 暫離 → 回座
      D.films.leave = await film(p, 1600, () => p.locator('#leaveBtn').click());
      await p.waitForTimeout(1500); await shot(p, 'leave');
      D.films.back = await film(p, 6000, () => p.locator('#backBtn').click());
      await p.waitForFunction(() => __keisaku.round().phase === 'focus', null, { timeout: 15000 }); await shot(p, 'back-note');
      // the round ends: the break
      await p.waitForFunction(() => !__keisaku.monk().busy, null, { timeout: 30000 }).catch(() => {});
      await forward(p, 26 * 60000); await p.waitForFunction(() => __keisaku.round().phase === 'break', null, { timeout: 15000 });
      await p.waitForTimeout(1200); await shot(p, 'break');
      await forward(p, 6 * 60000); await p.waitForFunction(() => __keisaku.round().phase === 'ready', null, { timeout: 15000 });
      await p.waitForSelector('#dlgChoices .choice.primary'); await shot(p, 'ready-round2');
      D.films.readyToSitting = await film(p, 6500, () => press(p));
      await p.waitForFunction(() => __keisaku.round().phase === 'focus', null, { timeout: 15000 }); await shot(p, 'focus-round2');
      D.errors = [...(D.errors || []), ...errors]; await ctx.close();
    }
    for (const [k, f] of Object.entries(D.films)) D.films[k] = { jumps: jumps(f), frames: f.length, phases: [...new Set(f.map(x => x.phase))] };
    console.log(prof.name, JSON.stringify(Object.fromEntries(Object.entries(D.films).map(([k, v]) => [k, v.jumps]))), D.errors.length ? D.errors : '');
  }
} finally {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify(data, null, 1));
  await browser.close(); server.stop();
}
