/* Round 3.5 — image check for the end of the return.
   Renders, in the same scene and at the same scale, (a) the animation's last frame and (b) the static 香板垂放 pose
   (MONK4.art({ pose: 'idle' })), screenshots both and compares them pixel by pixel. Also compares the last frame with
   the frame 1/60 s before it (it must not be moving any more). Writes anim-frames/r35/return-check.json (read by
   the review page) and a diff image.
   Run (with the repo served on :8765, e.g. `python3 -m http.server 8765` from the repo root):
     node design/round3/checks/return-check.mjs
   Set CHROMIUM=/path/to/chromium if Playwright's own browser is not installed. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), OUT = path.join(HERE, '..', 'anim-frames', 'r35');
const URL = process.env.URL || 'http://localhost:8765/design/round3/', THRESHOLD = 8;
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const cases = [];
for (const [scale, label] of [[1, '手機尺寸（368px 場景）'], [4, '放大 4 倍']]) {
  const page = await (await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: scale })).newPage();
  await page.goto(URL); await page.waitForFunction(() => window.KEISAKU_ANIM && document.querySelector('#rtCmp svg'));
  await page.evaluate(() => document.fonts.ready);
  // the scene's signs and scroll are text; their web font may or may not have loaded between shots, and they are not
  // what is being checked, so they are hidden
  await page.addStyleTag({ content: '#chk text { visibility: hidden }' });
  // one bare view of the whole phone scene; every case is drawn into the SAME element at the same place, one after
  // the other (rasterisation can differ by position, so side-by-side views would not be comparable)
  await page.evaluate(() => {
    const A = KEISAKU_ANIM, M = MONK4, host = document.createElement('div');
    host.id = 'chk'; host.style.cssText = 'position:fixed;left:0;top:0;z-index:99;background:#fff;width:368px';
    document.body.appendChild(host);
    const v = A.makeView(host, '0 0 400 300'), T = A.total();
    window.__chk = k => {
      if (k === 'end') A.draw(v, T, {});
      if (k === 'idle') { A.draw(v, T, {}); v.monk.innerHTML = `<g transform="translate(${A.MONK_AT[0]} ${A.MONK_AT[1]})">${M.art({ id: 'chkIdle', pose: 'idle' })}</g>`; v.front.innerHTML = ''; }
      if (k === 'prev') A.draw(v, T - 1000 / 60, {});
    };
  });
  const shots = [];
  for (const k of ['end', 'idle', 'prev']) { await page.evaluate(k => window.__chk(k), k); await page.waitForTimeout(50); shots.push((await page.locator('#chk').screenshot()).toString('base64')); }
  const res = await page.evaluate(async ([s, th]) => {
    const img = b64 => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + b64; });
    const px = async b64 => { const im = await img(b64), cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0); return { w: im.width, h: im.height, d: g.getImageData(0, 0, im.width, im.height).data }; };
    const [A, B, C] = await Promise.all(s.map(px));
    const cmp = (P, Q) => { let over = 0, max = 0; const cv = document.createElement('canvas'); cv.width = P.w; cv.height = P.h; const g = cv.getContext('2d'), out = g.createImageData(P.w, P.h);
      for (let i = 0; i < P.d.length; i += 4) { const m = Math.max(Math.abs(P.d[i] - Q.d[i]), Math.abs(P.d[i + 1] - Q.d[i + 1]), Math.abs(P.d[i + 2] - Q.d[i + 2]));
        max = Math.max(max, m); if (m > th) over++; const v = 255 - Math.min(255, m * 8); out.data[i] = 255; out.data[i + 1] = v; out.data[i + 2] = v; out.data[i + 3] = 255; }
      g.putImageData(out, 0, 0); return { w: P.w, h: P.h, over, max, diff: cv.toDataURL('image/png').split(',')[1] }; };
    return [cmp(A, B), cmp(A, C)];
  }, [shots, THRESHOLD]);
  const tag = scale === 1 ? 'phone' : 'x4';
  fs.writeFileSync(path.join(OUT, `check_${tag}_end.png`), Buffer.from(shots[0], 'base64'));
  fs.writeFileSync(path.join(OUT, `check_${tag}_idle.png`), Buffer.from(shots[1], 'base64'));
  fs.writeFileSync(path.join(OUT, `check_${tag}_diff.png`), Buffer.from(res[0].diff, 'base64'));
  cases.push({ name: `${label}：最後一格 vs 原本待機`, w: res[0].w, h: res[0].h, over: res[0].over, max: res[0].max });
  cases.push({ name: `${label}：最後一格 vs 前一格`, w: res[1].w, h: res[1].h, over: res[1].over, max: res[1].max });
  await page.close();
}
const json = { date: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', threshold: THRESHOLD, cases };
fs.writeFileSync(path.join(OUT, 'return-check.json'), JSON.stringify(json, null, 1) + '\n');
console.log(JSON.stringify(json, null, 1));
await browser.close();
process.exit(cases.every(c => c.over === 0) ? 0 : 1);
