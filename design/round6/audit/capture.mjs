// Round 6 audit tool (not part of the app): drives the real index.html with Playwright, saves a screenshot of every
// screen and state, and measures what can be measured (tap targets, small text, contrast, sideways scroll).
//   node design/round6/audit/capture.mjs            all profiles
//   node design/round6/audit/capture.mjs 390 dark   only profiles whose name contains one of the words
// Output: design/round6/audit/shots/<profile>/<nn>_<name>.jpg and design/round6/audit/data.json
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, openApp, pick, waitForLine, forward, tapRing, entry, SEEN, ROOT } from '../../../tests/helpers.mjs';

const OUT = path.join(ROOT, 'design', 'round6', 'audit');
const want = process.argv.slice(2);
const sleep = (p, ms) => p.waitForTimeout(ms);
const away = (p, ms) => p.evaluate(ms => { __hide(true); window.__skew += ms; __hide(false); }, ms);

// a believable history: about ten weeks, different tasks, some struck rounds, a break run long, an unfinished one
function history() {
  const L = []; const tasks = ['讀書', '工作', '寫作', '讀書', '讀書', '工作'];
  for (let d = 70; d >= 1; d--) {
    if (d % 7 === 3 || (d > 40 && d % 5 === 0)) continue;                       // days off
    const n = d < 9 ? 1 + (d % 3) : 1 + (d % 4 === 0 ? 2 : d % 2);
    for (let i = 0; i < n; i++) L.push(entry(d, { task: tasks[(d + i) % tasks.length], min: [25, 25, 40, 15, 50][(d + i) % 5], hits: (d * 7 + i) % 5 === 0 ? 1 + (d % 3) : 0, ...(i === 1 && d % 6 === 0 ? { late: 3 } : {}), ...(d % 9 === 0 && i === 0 ? { leave: 1 } : {}) }));
    if (d % 11 === 0) L.push(entry(d, { task: '工作', min: 8, hits: 1, full: false }));
  }
  return L.sort((a, b) => a.t - b.t);
}

// what can be measured on the page as it is now
const measure = p => p.evaluate(() => {
  const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const top = (() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); return d || document.body; })();
  const label = el => (el.id ? '#' + el.id : el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()) + ' "' + (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 14) + '"';
  const taps = [...top.querySelectorAll('button, a[href], input, select, summary, [role=tab], label.seg, .seg label')].filter(vis).filter(el => !el.disabled && !(el.tagName === 'INPUT' && ['radio', 'checkbox'].includes(el.type) && el.closest('label')))
    .map(el => { const r = el.getBoundingClientRect(); return { el: label(el), w: Math.round(r.width), h: Math.round(r.height) }; });
  const rgb = c => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] === undefined ? 1 : m[3] }; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const bgOf = el => { const st = []; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e).backgroundColor; if (s && s !== 'rgba(0, 0, 0, 0)' && s.startsWith('rgb')) { const c = rgb(s); st.push(c); if (c.a >= .99) break; } }
    let out = { r: 255, g: 255, b: 255 }; const page = rgb(getComputedStyle(document.body).backgroundColor); if (!st.length || st[st.length - 1].a < .99) out = page;
    for (const c of st.reverse()) out = { r: c.r * c.a + out.r * (1 - c.a), g: c.g * c.a + out.g * (1 - c.a), b: c.b * c.a + out.b * (1 - c.a) }; return out; };
  const texts = []; const seen = new Set();
  const walk = document.createTreeWalker(top, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n.textContent.trim(); const el = n.parentElement; if (!t || !el || el.closest('svg') || el.closest('.sr-only') || !vis(el)) continue;
    const s = getComputedStyle(el), size = parseFloat(s.fontSize), fg = rgb(s.color); if (fg.a < .05) continue;
    const bg = bgOf(el), f = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
    const L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05), big = size >= 24 || (size >= 18.66 && +s.fontWeight >= 700);
    const key = label(el) + size; if (seen.has(key)) continue; seen.add(key);
    texts.push({ el: label(el), text: t.slice(0, 16), size: +size.toFixed(1), ratio: +ratio.toFixed(2), need: big ? 3 : 4.5 });
  }
  const cl = document.getElementById('clock').getBoundingClientRect(), st = document.getElementById('stageWrap').getBoundingClientRect();
  return { vw: innerWidth, vh: innerHeight, pageH: document.documentElement.scrollHeight, hscroll: document.documentElement.scrollWidth > innerWidth,
    smallTaps: taps.filter(t => t.w < 44 || t.h < 44), taps: taps.length,
    smallText: texts.filter(t => t.size < 12).map(t => `${t.el} ${t.size}px`), lowContrast: texts.filter(t => t.ratio < t.need).map(t => `${t.el} ${t.ratio}:1 @${t.size}px`),
    clockPx: Math.round(parseFloat(getComputedStyle(document.getElementById('clock')).fontSize)), clockVisible: cl.top >= 0 && cl.bottom <= innerHeight, stageH: Math.round(st.height), stageTop: Math.round(st.top + scrollY),
    phase: window.__keisaku ? __keisaku.round().phase : null };
});

const data = { taken: new Date().toISOString(), profiles: {} };
let server, browser;

async function profile(name, { w, h, dark = false, locale = 'zh-TW', big = false, theme = null, set = 'core', reducedMotion = 'no-preference' }) {
  if (want.length && !want.some(x => name.includes(x))) return;
  const dir = path.join(OUT, 'shots', name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const P = data.profiles[name] = { w, h, dark, locale, big, theme, shots: [], notCaptured: [], errors: [] };
  let n = 0;
  const open = async (o = {}) => { const r = await openApp(browser, server.url, { width: w, height: h, dark, locale, reducedMotion, ...o });
    r.p.on('pageerror', e => P.errors.push(e.message));
    if (big) await r.p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = 'html { font-size: 130% !important; }'; document.head.appendChild(s); }));
    if (big || theme) { await r.p.reload(); }
    if (theme) await r.p.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
    return r; };
  const shot = async (p, id, note = '', { settle = 350, top = true } = {}) => {
    await sleep(p, settle); if (top) await p.evaluate(() => scrollTo(0, 0)).catch(() => {});
    const file = `${String(++n).padStart(2, '0')}_${id}.jpg`;
    await p.screenshot({ path: path.join(dir, file), type: 'jpeg', quality: 82 });
    P.shots.push({ file, id, note, m: await measure(p).catch(e => ({ error: e.message })) });
  };
  const step = async (id, fn) => { try { await fn(); } catch (e) { P.notCaptured.push({ id, why: e.message.split('\n')[0].slice(0, 160) }); } };
  const full = set === 'full';
  const zh = locale === 'zh-TW';
  // start a sitting whatever the language: the first choice each time until the round is running
  const sitAny = async (p, rounds2 = false) => {
    for (let i = 0; i < 80; i++) {
      if (await p.evaluate(() => __keisaku.round().phase === 'focus')) return;
      const c = p.locator('.choice');
      if (!(await c.count()) || await p.evaluate(() => document.getElementById('dialog').hidden)) { await sleep(p, 300); continue; }
      const labels = await c.allTextContents();
      const pri = p.locator('.choice.primary');
      // rounds question: the second choice is two rounds
      if (rounds2 && labels.length >= 4 && /^1\b/.test(labels[0].trim()) && /^2\b/.test(labels[1].trim())) await c.nth(1).click().catch(() => {});
      else if (await pri.count()) await pri.first().click().catch(() => {}); else await c.first().click().catch(() => {});
      await sleep(p, 500);
    }
    await p.waitForFunction(() => __keisaku.round().phase === 'focus', null, { timeout: 15000 });
  };

  /* ---- 1. the first visit: introduction, tour, plan ---- */
  if (full || !zh) await step('first-visit', async () => {
    const { p, ctx } = await open({ seen: [] });
    await p.waitForFunction(() => !document.getElementById('dialog').hidden && document.querySelectorAll('.choice').length > 0, null, { timeout: 15000 });
    await shot(p, 'intro-1-welcome', '首次進入：住持自我介紹');
    if (zh && full) {
      await pick(p, '你好'); await sleep(p, 900); await shot(p, 'intro-2-what');
      await pick(p, '然後呢?'); await waitForLine(p, '這支香板'); await sleep(p, 700); await shot(p, 'intro-3-keisaku', '講到香板');
      await pick(p, '我會專心的'); await sleep(p, 700); await shot(p, 'intro-4-tour-next');
      await pick(p, '好'); await p.waitForFunction(() => !document.getElementById('tourCard').hidden);
      const names = ['help', 'journal', 'collect', 'settings'];
      for (const [i, sheet] of names.entries()) {
        await shot(p, `tour-${i + 1}-${sheet}-spot`, '導覽：亮框與說明', { settle: 500 });
        await tapRing(p); await p.waitForFunction(id => document.getElementById(id).open, sheet);
        await shot(p, `tour-${i + 1}-${sheet}-open`, '導覽中打開的面板', { settle: 1300, top: false });
        await p.locator(`#${sheet}Close`).click(); await sleep(p, 1900);
      }
      await waitForLine(p, '今天想做什麼'); await shot(p, 'plan-1-task', '報到：今天想做什麼');
      await pick(p, '自訂'); await sleep(p, 600); await shot(p, 'plan-1b-custom-input', '自訂事項的輸入框');
      await p.keyboard.press('Escape').catch(() => {});
    }
    await ctx.close();
  });

  /* ---- 2. the plan dialogue, the sitting, a reminder, 暫離, the break, the result ---- */
  await step('sitting-flow', async () => {
    const { p, ctx } = await open();
    await p.waitForFunction(() => document.querySelectorAll('.choice').length > 0, null, { timeout: 15000 });
    await shot(p, 'checkin', '報到（看過導覽、還沒坐過）');
    if (zh && full) {
      await pick(p, '讀書'); await waitForLine(p, '每炷香要坐多久'); await shot(p, 'plan-2-focus');
      await pick(p, '25 分'); await waitForLine(p, '要坐幾炷'); await shot(p, 'plan-3-rounds');
      await pick(p, '2 炷'); await sleep(p, 900); await shot(p, 'plan-4-break');
      await pick(p, '5 分'); await sleep(p, 1600); await shot(p, 'plan-5-recap', '住持複述');
      await pick(p, '我要改'); await sleep(p, 900); await shot(p, 'plan-5b-edit', '只改一項');
      await pick(p, '改好了'); await sleep(p, 1200); await pick(p, '沒錯'); await waitForLine(p, '準備好了嗎'); await sleep(p, 1500); await shot(p, 'plan-6-ready', '準備好了嗎');
      await pick(p, '再等一下'); await sleep(p, 3200); await shot(p, 'plan-6b-wait-tea', '再等一下：住持去喝茶');
      await pick(p, '我好了'); await waitForLine(p, '準備好了嗎'); await sleep(p, 800);
      await pick(p, '準備好了'); await sleep(p, 500); await shot(p, 'settle', '落座', { settle: 100 });
      await p.waitForFunction(() => __keisaku.round().phase === 'focus', null, { timeout: 15000 });
    } else await sitAny(p, true);
    await shot(p, 'focus-start', '止靜：剛開始', { settle: 600 });
    await sleep(p, 4200); await shot(p, 'focus-quiet', '專注中（提示消失後）');
    if (full) {
      await p.locator('#sense summary').click().catch(() => {}); await shot(p, 'focus-sense-why', '偵測警告展開');
      await p.locator('#sense summary').click().catch(() => {});
      await p.evaluate(() => __keisaku.speed(6));
      await p.waitForFunction(() => { const m = __keisaku.monk(); return ['LF', 'RF'].includes(m.patrol.at) && m.patrol.mode === 'stand' && !m.busy; }, null, { timeout: 120000, polling: 50 });
      await p.evaluate(() => __keisaku.speed(0)); await shot(p, 'focus-monk-front', '住持走到前景');
      await p.waitForFunction(() => true); await p.evaluate(() => __keisaku.speed(6));
      await p.waitForFunction(() => { const m = __keisaku.monk(); return m.patrol.at === 'BC' && m.patrol.mode === 'stand'; }, null, { timeout: 120000, polling: 50 }).catch(() => {});
      await p.evaluate(() => __keisaku.speed(0)); await shot(p, 'focus-monk-behind', '住持在麻糬後方');
      await p.locator('#mainBtn').click(); await shot(p, 'focus-quit-confirm', '出堂要按兩次', { settle: 200 }); await sleep(p, 3300);
    }
    // a reminder
    await p.evaluate(() => __keisaku.speed(1)); await away(p, 4000);
    await shot(p, 'remind-1-caught', '被抓到：住持停下', { settle: 500 });
    // (with reduced motion there is no wind-up: the reminder is held key poses)
    if (reducedMotion !== 'reduce') { await p.waitForFunction(() => __keisaku.monk().monk.seg === 'hold' || __keisaku.monk().monk.seg === 'windup', null, { timeout: 30000, polling: 'raf' });
      await shot(p, 'remind-2-windup', '舉板', { settle: 0 }); }
    await p.waitForFunction(() => __keisaku.monk().monk.seg === 'stop', null, { timeout: 30000, polling: 'raf' });
    await shot(p, 'remind-3-hit', '命中', { settle: 0 });
    await sleep(p, 900); await shot(p, 'remind-4-after', '命中之後');
    await p.waitForFunction(() => !__keisaku.monk().busy, null, { timeout: 20000 });
    if (full) {
      await away(p, 3000); await p.waitForFunction(() => __keisaku.monk().busy && __keisaku.monk().patrol.mode === 'walk'); await away(p, 95000);
      await p.waitForFunction(() => /又分心了/.test(document.getElementById('bubbleText').textContent) && !document.getElementById('bubble').hidden, null, { timeout: 30000 });
      await shot(p, 'remind-5-merged', '合併：又分心了 N 次', { settle: 0 });
      await p.waitForFunction(() => !__keisaku.monk().busy, null, { timeout: 20000 });
      await p.locator('#askBtn').click(); await p.waitForFunction(() => __keisaku.monk().monk.seg === 'stop', null, { timeout: 30000, polling: 'raf' });
      await shot(p, 'ask-hit', '合掌請打', { settle: 0 }); await p.waitForFunction(() => !__keisaku.monk().busy, null, { timeout: 20000 });
    }
    // 暫離
    await p.locator('#leaveBtn').click(); await shot(p, 'leave', '暫離', { settle: 3200 });
    await p.locator('#backBtn').click(); await shot(p, 'leave-back-settle', '回座', { settle: 400 });
    await p.waitForFunction(() => __keisaku.round().phase === 'focus', null, { timeout: 15000 });
    // the break
    await forward(p, 26 * 60000); await p.waitForFunction(() => __keisaku.round().phase === 'break', null, { timeout: 10000 });
    await shot(p, 'break-start', '開靜：進入休息', { settle: 700 });
    await shot(p, 'break', '休息（住持喝茶）', { settle: 4200 });
    if (full) {
      await forward(p, 9 * 60000); await p.waitForFunction(() => __keisaku.round().phase === 'ready', null, { timeout: 10000 });
      await shot(p, 'break-over-late', '休息超時回來', { settle: 1800 });
    } else await p.locator('#mainBtn').click();
    await p.locator('.choice').first().waitFor({ timeout: 10000 }); await sleep(p, 900);
    if (!full) await shot(p, 'ready-round2', '第 2 炷：準備好了嗎');
    await p.locator('.choice.primary').first().click(); await p.waitForFunction(() => __keisaku.round().phase === 'focus', null, { timeout: 15000 });
    await shot(p, 'focus-round2', '第 2 炷', { settle: 4300 });
    await forward(p, 26 * 60000); await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 15000 });
    await shot(p, 'result', '結算卡（坐滿 2 炷）', { settle: 1000 });
    if (full) {
      await p.locator('#closeResult').click(); await sleep(p, 1800); await shot(p, 'result-new-item-offer', '住持問要不要掛上新掛軸');
      await p.locator('.choice').first().click().catch(() => {}); await sleep(p, 1500); await p.locator('.choice').first().click().catch(() => {}); await sleep(p, 1800);
      await shot(p, 'again', '坐完一輪：還要再坐嗎');
    }
    await ctx.close();
  });

  /* ---- 3. leaving early ---- */
  if (full) await step('quit-early', async () => {
    const { p, ctx } = await open();
    await sitAny(p); await forward(p, 9 * 60000); await sleep(p, 600);
    await p.locator('#mainBtn').click(); await p.locator('#mainBtn').click();
    await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 10000 });
    await shot(p, 'result-early', '提前出堂的結算卡', { settle: 900 });
    await ctx.close();
  });

  /* ---- 4. coming back with a history: greeting, journal, stats, collection, settings, help ---- */
  await step('returning', async () => {
    const collect = { scroll: '心', wear: { head: 'leaf', body: null, extra: null }, seen: [], faces: ['calm', 'happy', 'peek', 'ouch'], face: 'peek' };
    const { p, ctx } = await open({ storage: { 'keisaku-log-v2': history(), 'keisaku-collect-v1': collect, 'keisaku-opts-v1': { motion: true, sound: true, notify: false, goal: 4, theme: theme || 'system', ambient: 'none', ambVol: .5, music: false } } });
    await p.waitForFunction(() => document.querySelectorAll('.choice').length > 0, null, { timeout: 15000 });
    await shot(p, 'returning-greeting', '回訪：跟上次一樣／常用／新的安排');
    // the journal
    await p.locator('#journalBtn').click(); await p.waitForFunction(() => document.getElementById('journal').open);
    await shot(p, 'journal-calendar', '坐禪帳：月曆', { settle: 1400, top: false });
    if (full) {
      await p.locator('#cal .cell:not(.future):not(.blank)').nth(8).click().catch(() => {}); await shot(p, 'journal-day', '點某一天的明細', { top: false });
      await p.locator('#journal .scroll-paper').evaluate(e => e.scrollTo(0, 9999)); await shot(p, 'journal-calendar-bottom', '月曆捲到底', { top: false });
      await p.locator('#prevMonth').click(); await p.locator('#journal .scroll-paper').evaluate(e => e.scrollTo(0, 0)); await shot(p, 'journal-prev-month', '上個月', { top: false });
    }
    await p.locator('#tabStats').click(); await shot(p, 'journal-stats', '坐禪帳：統計（七日）', { settle: 900, top: false });
    if (full) {
      await p.locator('#journal .scroll-paper').evaluate(e => e.scrollTo(0, 9999)); await shot(p, 'journal-stats-bottom', '統計捲到底', { top: false });
      await p.locator('#journal .scroll-paper').evaluate(e => e.scrollTo(0, 0));
      await p.locator('#statView button', { hasText: '三十日' }).first().click().catch(() => {}); await shot(p, 'journal-stats-30', '三十日', { settle: 900, top: false });
      await p.locator('#dailyBars > *').nth(20).click().catch(() => {}); await shot(p, 'journal-stats-slip', '點一根香：籤紙', { top: false });
      await p.locator('#statView button', { hasText: '全部' }).first().click().catch(() => {}); await shot(p, 'journal-stats-all', '全部', { settle: 900, top: false });
    }
    await p.locator('#journalClose').click(); await sleep(p, 2000);
    // the collection
    await p.locator('#collectBtn').click(); await p.waitForFunction(() => document.getElementById('collect').open);
    await shot(p, 'collect-scrolls', '收藏冊：掛軸', { settle: 1400, top: false });
    if (full) { await p.locator('#collect .scroll-paper').evaluate(e => e.scrollTo(0, 9999)); await shot(p, 'collect-scrolls-bottom', '掛軸捲到底', { top: false }); await p.locator('#collect .scroll-paper').evaluate(e => e.scrollTo(0, 0)); }
    for (const [tab, id] of [['tabSeasons', 'seasons'], ['tabAccs', 'accs'], ['tabFaces', 'faces']]) {
      if (!full && id === 'seasons') continue;
      await p.locator('#' + tab).click(); await shot(p, 'collect-' + id, '收藏冊：' + id, { settle: 600, top: false });
      if (full && id === 'accs') { await p.locator('#collect .scroll-paper').evaluate(e => e.scrollTo(0, 9999)); await shot(p, 'collect-accs-bottom', '配件捲到底', { top: false }); await p.locator('#collect .scroll-paper').evaluate(e => e.scrollTo(0, 0)); }
    }
    await p.locator('#collectClose').click(); await sleep(p, 2000);
    // settings
    await p.locator('#settingsBtn').click(); await p.waitForFunction(() => document.getElementById('settings').open);
    await shot(p, 'settings-1', '設定（頂端）', { settle: 1400, top: false });
    const sh = await p.locator('#settings .scroll-paper').evaluate(e => [e.scrollHeight, e.clientHeight]);
    const pages = Math.min(5, Math.ceil(sh[0] / sh[1]));
    for (let i = 1; i < (full ? pages : Math.min(2, pages)); i++) { await p.locator('#settings .scroll-paper').evaluate((e, y) => e.scrollTo(0, y), i * sh[1] * .9); await shot(p, 'settings-' + (i + 1), `設定（第 ${i + 1} 段，共 ${pages} 段）`, { top: false }); }
    if (full) {
      await p.locator('#settings .scroll-paper').evaluate(e => e.scrollTo(0, 9999));
      await p.locator('#pasteBtn').click().catch(() => {}); await shot(p, 'settings-paste-backup', '貼上備份文字', { top: false });
    }
    await p.locator('#settingsClose').click(); await sleep(p, 2000);
    // the rules
    await p.locator('#helpBtn').click(); await p.waitForFunction(() => document.getElementById('help').open);
    await shot(p, 'help', '堂規', { settle: 1400, top: false });
    if (full) { await p.locator('#help .scroll-paper').evaluate(e => e.scrollTo(0, 9999)); await shot(p, 'help-bottom', '堂規捲到底', { top: false }); }
    await p.locator('#helpClose').click(); await sleep(p, 2000);
    if (full) {
      await p.locator('#roundWinBtn').click(); await shot(p, 'window-tale', '點圓窗：住持說窗的由來', { settle: 900 });
      // the collection while sitting: look only
      await pick(p, '跟上次一樣').catch(() => {}); await sitAny(p);
      await p.locator('#collectBtn').click(); await p.waitForFunction(() => document.getElementById('collect').open); await shot(p, 'collect-while-sitting', '坐禪中的收藏冊（只能看）', { settle: 1400, top: false });
      await p.locator('#collectClose').click(); await sleep(p, 2000);
      await p.locator('#journalBtn').click(); await p.waitForFunction(() => document.getElementById('journal').open); await shot(p, 'journal-while-sitting', '坐禪中打開坐禪帳（計時照常）', { settle: 1400, top: false });
    }
    await ctx.close();
  });

  /* ---- 5. empty states ---- */
  if (full) await step('empty', async () => {
    const { p, ctx } = await open();
    await p.waitForFunction(() => document.querySelectorAll('.choice').length > 0);
    await p.locator('#journalBtn').click(); await p.waitForFunction(() => document.getElementById('journal').open); await shot(p, 'empty-journal', '空的坐禪帳', { settle: 1400, top: false });
    await p.locator('#tabStats').click(); await shot(p, 'empty-stats', '空的統計', { settle: 800, top: false });
    await p.locator('#journalClose').click(); await sleep(p, 2000);
    await p.locator('#collectBtn').click(); await p.waitForFunction(() => document.getElementById('collect').open); await shot(p, 'empty-collect', '剛開始的收藏冊', { settle: 1400, top: false });
    await p.locator('#tabFaces').click(); await shot(p, 'empty-faces', '剛開始的表情', { settle: 600, top: false });
    await ctx.close();
  });

  /* ---- 6. the tip shown after the first strike ---- */
  if (full) await step('leave-tip', async () => {
    const { p, ctx } = await open({ seen: SEEN.filter(k => k !== 'keisaku-tip-leave-v1') });
    await sitAny(p); await p.evaluate(() => __keisaku.speed(4)); await away(p, 3000);
    await p.waitForFunction(() => !document.getElementById('tourCard').hidden, null, { timeout: 40000 });
    await shot(p, 'tip-leave', '第一次被打後：暫離的提示', { settle: 600 });
    await ctx.close();
  });
}

server = await startServer(); browser = await launch();
const t0 = Date.now();
await profile('390x844', { w: 390, h: 844, set: 'full' });
await profile('320x640', { w: 320, h: 640 });
await profile('360x780', { w: 360, h: 780 });
await profile('412x915', { w: 412, h: 915 });
await profile('844x390', { w: 844, h: 390 });
await profile('390x844-text130', { w: 390, h: 844, big: true });
await profile('390x844-dark', { w: 390, h: 844, dark: true });
await profile('390x844-dusk', { w: 390, h: 844, theme: 'dusk' });
await profile('390x844-ja', { w: 390, h: 844, locale: 'ja-JP' });
await profile('390x844-en', { w: 390, h: 844, locale: 'en-US' });
await profile('390x844-reduced-motion', { w: 390, h: 844, reducedMotion: 'reduce' });
await browser.close(); server.stop();
const file = path.join(OUT, 'data.json');
const prev = want.length && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { profiles: {} };
fs.writeFileSync(file, JSON.stringify({ taken: data.taken, profiles: { ...prev.profiles, ...data.profiles } }, null, 1));
for (const [k, v] of Object.entries(data.profiles)) console.log(k.padEnd(26), 'shots', String(v.shots.length).padStart(3), 'missing', v.notCaptured.length, 'errors', v.errors.length, v.notCaptured.map(x => x.id + ': ' + x.why).join(' | '));
console.log(Math.round((Date.now() - t0) / 1000) + ' s');
