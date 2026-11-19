// Round 6-2 film (not part of the app): one sitting from check-in to 回座, recorded as a video, so the transitions can
// be watched: the header stepping back, the dialogue going, the sensor note folding away, 出堂 asking twice and
// going back, 暫離 and 回座. Frames come from the browser's screencast and are put together with the system's ffmpeg
// (Playwright's own recorder needs a separate ffmpeg download). Writes <out>/<size>.mp4, a strip of frames
// <out>/<size>-strip.jpg (one frame per step) and marks.json with the time of each step.
//   node design/round6/6-2/film.mjs <out folder> [width height]…
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { startServer, entry } from '../../../tests/helpers.mjs';

const out = path.resolve(process.argv[2] || 'film'); fs.mkdirSync(out, { recursive: true });
const sizes = []; for (let i = 3; i < process.argv.length; i += 2) sizes.push([+process.argv[i], +process.argv[i + 1]]);
if (!sizes.length) sizes.push([390, 844], [320, 640]);
const server = await startServer(), browser = await chromium.launch();
const marks = {};
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ locale: 'zh-TW', viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const name = `${w}x${h}`, fdir = path.join(out, name + '-frames'); fs.rmSync(fdir, { recursive: true, force: true }); fs.mkdirSync(fdir);
  const cdp = await ctx.newCDPSession(p), frames = [];
  cdp.on('Page.screencastFrame', f => { frames.push({ t: f.metadata.timestamp, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await p.addInitScript(log => {
    const real = Date.now.bind(Date); window.__skew = 0; Date.now = () => real() + window.__skew;
    let hidden = false; Object.defineProperty(document, 'hidden', { get: () => hidden });
    window.__hide = v => { hidden = v; document.dispatchEvent(new Event('visibilitychange')); };
    if (sessionStorage.seeded) return; sessionStorage.seeded = 1;
    for (const k of ['keisaku-tour-v1', 'keisaku-rules-asked-v1', 'keisaku-leave-told-v1', 'keisaku-tip-leave-v1', 'keisaku-tip-journal-v1', 'keisaku-tip-collect-v1']) localStorage.setItem(k, 'true');
    localStorage.setItem('keisaku-log-v2', JSON.stringify(log));
    localStorage.setItem('keisaku-last-v1', JSON.stringify({ task: '讀書', focusMin: 25, rounds: 4, breakMin: 5 }));
    localStorage.setItem('keisaku-opts-v1', JSON.stringify({ sound: false }));
  }, [entry(0, { task: '讀書', min: 50, hits: 3 })]);
  const t0 = Date.now(), M = []; const mark = s => M.push([+((Date.now() - t0) / 1000).toFixed(1), s]);
  await p.goto(server.url + 'index.html');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
  await p.waitForSelector('#dlgChoices .choice.primary'); mark('報到'); await p.waitForTimeout(1200);
  for (let i = 0; i < 60 && await p.evaluate(() => __keisaku.round().phase === 'idle'); i++) { await p.locator('#dlgChoices .choice.primary').first().click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(250); }
  mark('落座'); await p.waitForFunction(() => __keisaku.round().phase === 'focus', null, { timeout: 15000 }); mark('坐禪：偵測說明出現');
  await p.waitForTimeout(7000); mark('說明收進「偵測方式」');
  await p.locator('#mainBtn').click(); mark('出堂：確認狀態'); await p.waitForTimeout(3600); mark('確認期限到，恢復');
  await p.locator('#leaveBtn').click(); mark('暫離'); await p.waitForTimeout(2500);
  await p.locator('#backBtn').click(); mark('回座'); await p.waitForFunction(() => __keisaku.round().phase === 'focus', null, { timeout: 15000 }); mark('坐禪：說明再出現一次');
  await p.waitForTimeout(7000); mark('結束');
  await cdp.send('Page.stopScreencast'); await ctx.close();
  // frames come only when the page changes: write each one, held until the next, as a 10 fps sequence
  const T0 = frames[0].t, end = frames[frames.length - 1].t + 1; let k = 0;
  for (let i = 0; i < frames.length; i++) {
    const until = i + 1 < frames.length ? frames[i + 1].t : end;
    while (T0 + k / 10 < until) { fs.writeFileSync(path.join(fdir, String(k).padStart(5, '0') + '.jpg'), Buffer.from(frames[i].data, 'base64')); k++; }
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '10', '-i', path.join(fdir, '%05d.jpg'), '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', path.join(out, name + '.mp4')]);
  // one frame per step, 0.8 s after it (or just before the next step if that comes sooner), side by side
  const pickAt = M.map(([s], i) => Math.max(0, Math.round((t0 / 1000 + Math.min(s + .8, i + 1 < M.length ? M[i + 1][0] - .1 : s) - T0) * 10)));
  const picks = pickAt.map(f => path.join(fdir, String(Math.min(f, k - 1)).padStart(5, '0') + '.jpg'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...picks.flatMap(f => ['-i', f]), '-filter_complex', `${picks.map((_, i) => `[${i}:v]`).join('')}hstack=inputs=${picks.length}`, '-q:v', '4', path.join(out, name + '-strip.jpg')]);
  fs.rmSync(fdir, { recursive: true, force: true });
  marks[name] = M;
  console.log(name, M.map(m => m.join(' ')).join(' | '));
}
fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify(marks, null, 1));
await browser.close(); server.stop();
