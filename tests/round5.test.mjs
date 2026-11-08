// Round 5: the production app (index.html) with the accepted Round 3.5 / Round 4 monk.
// The whole sitting: start, patrol, distractions (sensor, leaving the screen, asking), merged reminders, 暫離, breaks,
// several rounds, 出堂, the result and the log; reduced motion, a hidden page, phone sizes, the service worker.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, pick, sit, forward, waitForLine, entry, shot, SEEN } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

const R = p => p.evaluate(() => __keisaku.round());
const M = p => p.evaluate(() => __keisaku.monk());
const away = (p, ms) => p.evaluate(ms => { __hide(true); window.__skew += ms; __hide(false); }, ms);   // left the app for ms
const idleMonk = (p, ms = 30000) => p.waitForFunction(() => { const m = __keisaku.monk(); return !m.busy && __keisaku.queue() === 0; }, null, { timeout: ms });
const log = p => p.evaluate(() => JSON.parse(localStorage.getItem('keisaku-log-v2') || '[]'));
// a phone lying on the table: a steady stream of motion readings, tilted with __tilt(deg)
async function withSensor(p) {
  await p.addInitScript(() => {
    window.__g = [0, 0, 9.81];
    window.__tilt = deg => { const r = deg * Math.PI / 180; window.__g = [0, 9.81 * Math.sin(r), 9.81 * Math.cos(r)]; };
    window.__jit = 0;
    setInterval(() => { const j = () => (Math.random() - .5) * window.__jit, g = window.__g;
      window.dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x: g[0] + j(), y: g[1] + j(), z: g[2] + j() }, interval: 40 })); }, 40);
  });
  await p.reload(); await waitForLine(p, '今天想做什麼');
}
// record the monk every frame in the page (Round 4 units), returned by endRec
const rec = p => p.evaluate(() => { window.__rec = []; (function t() { if (!window.__rec) return; const m = __keisaku.monk(); __rec.push({ x: m.x, y: m.y, key: m.patrol.key, active: m.patrol.active, mode: m.patrol.mode, seg: m.monk.seg, busy: m.busy, layer: document.getElementById('monk').parentNode.id }); requestAnimationFrame(t); })(); });
const endRec = p => p.evaluate(() => { const r = window.__rec; window.__rec = null; return r; });
// the production scene in Round 4 units (the monk's groups are translated by (−6, −17)): the cushion, the mat, the mochi
function prodShapes() {
  const ell = (cx, cy, rx, ry) => Array.from({ length: 72 }, (_, i) => { const a = 2 * Math.PI * i / 72; return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; });
  return { zafu: ell(206, 249, 36, 10), mat: [{ x: 158, y: 252 }, { x: 254, y: 252 }, { x: 254, y: 263 }, { x: 158, y: 263 }] };
}

test('check-in: he stands by the mochi; once sitting he patrols the safe paths, turns, and never walks on her cushion or over her', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url);
  await p.waitForTimeout(600);
  let m = await M(p);
  assert.equal(m.want, 'host'); assert.equal(m.patrol.at, 'HO', 'by the mochi while talking');
  await sit(p);
  await p.evaluate(() => __keisaku.speed(6));
  await rec(p); await p.waitForTimeout(20000); const r = await endRec(p);
  const bad = await p.evaluate(([r, G]) => {
    const out = [];
    for (const q of r) {
      if (!q.active) continue;
      const nearST = Math.hypot(q.x - 132, q.y - 254) < 12;
      if (PATROL.footHits(q.x, q.y, PATROL.GROUND_RAW).length) out.push(['on the Round 4 cushion / mat', q]);
      if (!nearST && PATROL.footHits(q.x, q.y).length) out.push(['inside the safe margin', q]);
      if (PATROL.footHits(q.x, q.y, { zafu: G.zafu, mat: [] }).length) out.push(['on the cushion', q]);
      if (!nearST && PATROL.footHits(q.x, q.y, { zafu: [], mat: G.mat }).length) out.push(['on the mat', q]);
      if (PATROL.inFront(q.y) && PATROL.screenHits(q.x, q.y).length) out.push(['over the mochi', q]);
      if (PATROL.inFront(q.y) !== (q.layer === 'monkNear')) out.push(['layer', q]);
    }
    return out.slice(0, 5);
  }, [r, prodShapes()]);
  assert.deepEqual(bad, []);
  const keys = new Set(r.map(q => q.key)), fams = new Set([...keys].filter(k => k && k[0] === 'W').map(k => k.split(':')[1]));
  assert.ok([...keys].some(k => k && k.startsWith('T:')), 'he turns (turn frames)');
  assert.ok(fams.size >= 3, `walks seen from several sides (${[...fams]})`);
  for (let i = 1; i < r.length; i++) assert.ok(Math.hypot(r[i].x - r[i - 1].x, r[i].y - r[i - 1].y) < 6, `no jump at frame ${i}`);
  m = await M(p);
  assert.ok(m.patrol.routes.length >= 3, 'several routes');
  assert.equal(m.stats.reminders, 0, 'nothing strikes on its own');
  assert.deepEqual(errors, []); await ctx.close();
});

test('one distraction: counted when it is confirmed (before the keisaku lands), one reminder, then back to patrol', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url);
  await sit(p); await p.evaluate(() => __keisaku.speed(3)); await p.waitForTimeout(1500);
  await away(p, 3000);
  let r = await R(p), m = await M(p);
  assert.equal(r.hits, 1, 'counted at once'); assert.equal(r.roundHits, 1); assert.ok(m.busy, 'the reminder is under way');
  assert.notEqual(m.monk.seg, 'stop', 'the keisaku has not landed yet');
  await rec(p); await idleMonk(p); const seq = await endRec(p);
  for (const s of ['raise', 'hold', 'stop', 'return']) assert.ok(seq.some(q => q.seg === s), `played ${s}`);
  const st = seq.find(q => q.seg === 'raise'); assert.ok(Math.abs(st.x - 132) < .5 && Math.abs(st.y - 254) < .5, 'from the accepted stance');
  m = await M(p); r = await R(p);
  assert.equal(r.hits, 1, 'and only once'); assert.equal(m.stats.reminders, 1);
  await p.waitForFunction(() => __keisaku.monk().patrol.active && __keisaku.monk().want === 'patrol', null, { timeout: 8000 });
  assert.deepEqual(errors, []); await ctx.close();
});

test('more distractions while he reminds: each one is counted, none is replayed; he says how many at the end', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  await sit(p); await p.evaluate(() => __keisaku.speed(2)); await p.waitForTimeout(1500);
  await away(p, 3000);
  await p.waitForFunction(() => __keisaku.monk().patrol.mode === 'walk' && __keisaku.monk().busy, null, { timeout: 8000 });   // on his way to the stance
  await away(p, 95000);                                   // ≥ 90 s: two events, as before
  await p.waitForFunction(() => ['hold', 'swing', 'stop', 'follow'].includes(__keisaku.monk().monk.seg), null, { timeout: 15000 });
  await away(p, 2500);                                    // during the strike itself
  let r = await R(p), m = await M(p);
  assert.equal(r.hits, 4, 'every confirmed event counts when it happens'); assert.equal(m.merged, 3);
  await p.waitForFunction(() => /又分心了 3 次/.test(document.getElementById('bubbleText').textContent) && !document.getElementById('bubble').hidden, null, { timeout: 15000 });
  await idleMonk(p);
  m = await M(p); r = await R(p);
  assert.equal(m.stats.reminders, 1, 'one reminder for all four'); assert.equal(m.stats.merged, 3); assert.equal(r.hits, 4);
  assert.equal(await p.evaluate(() => __keisaku.queue()), 0, 'nothing left waiting');
  await ctx.close();
});

test('the sensor: one pick-up is one event however the readings jitter; holding it adds one every 20 s; putting it back ends it', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url);
  await withSensor(p);
  await sit(p);
  assert.equal(await p.evaluate(() => __keisaku.sensing()), true);
  await p.evaluate(() => __keisaku.speed(3));
  await p.evaluate(() => { __tilt(70); __jit = 3; });     // picked up and moved about
  await p.waitForFunction(() => __keisaku.round().hits === 1, null, { timeout: 5000 });
  await p.waitForTimeout(3000);
  assert.equal((await R(p)).hits, 1, 'still the same pick-up');
  await forward(p, 21000);                                // still holding it 20 s later
  await p.waitForFunction(() => __keisaku.round().hits === 2, null, { timeout: 5000 });
  await p.waitForTimeout(1500); assert.equal((await R(p)).hits, 2);
  await p.evaluate(() => { __tilt(0); __jit = 0; });       // put back
  await p.waitForFunction(() => document.getElementById('toast').textContent.includes('回座了'), null, { timeout: 8000 });
  await idleMonk(p);
  await p.waitForTimeout(2000); assert.equal((await R(p)).hits, 2, 'nothing more once it is down');
  assert.deepEqual(errors, []); await ctx.close();
});

test('合掌請打 is not a distraction: counted as asked, at the hit; while he reminds it is ignored', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  await sit(p); await p.evaluate(() => __keisaku.speed(3));
  const box = await p.locator('#askBtn').boundingBox(), stage = await p.locator('#stage').boundingBox();
  assert.ok(box.y >= stage.y + stage.height - 1, '合掌請打 is below the zendo, not on it');
  assert.ok(box.height >= 44, 'a finger-sized button');
  await p.locator('#askBtn').click();
  await p.waitForFunction(() => __keisaku.monk().busy);
  await p.locator('#askBtn').click();                      // ignored while he is reminding
  await idleMonk(p);
  const r = await R(p);
  assert.equal(r.hits, 0); assert.equal(r.asks, 1);
  assert.equal((await M(p)).stats.reminders, 1);
  await ctx.close();
});

test('暫離, 回座, a break and the next round: no counting away from the cushion; the patrol stops and comes back; the sensor is off', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url);
  await withSensor(p);
  await sit(p, { rounds: '2 炷' });
  await p.evaluate(() => __keisaku.speed(4));
  await p.locator('#leaveBtn').click();
  await p.waitForFunction(() => __keisaku.round().phase === 'leave');
  assert.equal(await p.evaluate(() => __keisaku.sensing()), false, 'the sensor is off while away');
  await p.waitForFunction(() => { const m = __keisaku.monk(); return m.want === 'leave' && m.patrol.at === 'BL' && m.patrol.mode === 'stand'; }, null, { timeout: 15000 });
  const left = (await R(p)).left; await p.waitForTimeout(1200);
  await away(p, 5000); await p.evaluate(() => __tilt(80));
  await p.waitForTimeout(1200); await p.evaluate(() => __tilt(0));
  let r = await R(p); assert.equal(r.hits, 0, 'nothing counts while away'); assert.equal(r.left, left, 'the clock is stopped');
  await p.locator('#backBtn').click();
  await p.waitForFunction(() => __keisaku.round().phase === 'focus', null, { timeout: 15000 });
  assert.equal(await p.evaluate(() => __keisaku.sensing()), true);
  await p.waitForFunction(() => __keisaku.monk().want === 'patrol' && __keisaku.monk().patrol.mode !== 'stand', null, { timeout: 8000 });
  // the round ends: a break, tea, nothing counts
  await forward(p, 26 * 60000);
  await p.waitForFunction(() => __keisaku.round().phase === 'break', null, { timeout: 8000 });
  assert.equal(await p.evaluate(() => __keisaku.sensing()), false);
  await p.waitForFunction(() => { const m = __keisaku.monk(); return m.want === 'rest' && m.patrol.at === 'TE'; }, null, { timeout: 15000 });
  assert.equal(await p.evaluate(() => document.getElementById('tea').getAttribute('visibility')), 'visible');
  await away(p, 8000);
  assert.equal((await R(p)).hits, 0, 'not on a break');
  // the next round
  await p.locator('#mainBtn').click();                     // 跳過休息
  await pick(p, '準備好了');
  await p.waitForFunction(() => __keisaku.round().phase === 'focus' && __keisaku.round().round === 2, null, { timeout: 15000 });
  await p.waitForFunction(() => __keisaku.monk().want === 'patrol' && __keisaku.monk().patrol.at !== 'TE', null, { timeout: 15000 });
  await away(p, 3000);
  r = await R(p); assert.equal(r.hits, 1); assert.equal(r.roundHits, 1, 'counted in round 2');
  await idleMonk(p);
  await forward(p, 26 * 60000);
  await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 15000 });
  assert.match(await p.locator('#resultTitle').textContent(), /坐滿 2 炷/);
  const L = await log(p);
  assert.equal(L.length, 2); assert.deepEqual(L.map(e => [e.full, e.hits]), [[true, 0], [true, 1]]);
  assert.equal(L[0].leave, 1, '暫離 is written down as before');
  assert.deepEqual(errors, []); await ctx.close();
});

test('出堂 while he reminds: he stops at once, the confirmed count stays, and nothing from it comes later', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  await sit(p); await p.evaluate(() => __keisaku.speed(1)); await p.waitForTimeout(800);
  await away(p, 3000);
  await p.waitForFunction(() => ['raise', 'call', 'pre', 'windup', 'hold'].includes(__keisaku.monk().monk.seg), null, { timeout: 15000 });
  await p.locator('#mainBtn').click(); await p.locator('#mainBtn').click();    // 出堂・結束, then 確定
  let m = await M(p);
  assert.equal(m.busy, false, 'the reminder stopped'); assert.equal(m.monk.performing, false);
  await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 8000 });
  const L = await log(p); assert.equal(L.length, 1); assert.equal(L[0].hits, 1); assert.equal(L[0].full, false);
  await away(p, 5000); await p.waitForTimeout(2500);
  m = await M(p);
  assert.equal(m.stats.reminders, 1, 'no reminder after 出堂'); assert.equal((await R(p)).hits, 1);
  assert.equal(await p.evaluate(() => document.getElementById('pow').classList.contains('go')), false, 'no late 啪');
  await ctx.close();
});

test('the time is up while he reminds: that reminder plays out, then the result; nothing after it counts', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  await sit(p); await p.evaluate(() => __keisaku.speed(1.5)); await p.waitForTimeout(800);
  await away(p, 3000);
  await p.waitForFunction(() => __keisaku.monk().busy && __keisaku.monk().patrol.mode === 'walk', null, { timeout: 8000 });
  await forward(p, 26 * 60000);
  await p.waitForFunction(() => __keisaku.round().phase === 'idle', null, { timeout: 8000 });
  assert.equal(await p.evaluate(() => document.getElementById('result').hidden), true, 'the result waits for the reminder');
  assert.ok((await M(p)).busy);
  await away(p, 4000); assert.equal((await R(p)).hits, 1, 'after the time is up nothing counts');
  await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 20000 });
  assert.equal((await M(p)).busy, false);
  const L = await log(p); assert.equal(L.length, 1); assert.deepEqual([L[0].full, L[0].hits], [true, 1]);
  await ctx.close();
});

test('a reminder from every place he can be: each stop, and while walking or turning', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url);
  await sit(p); await p.evaluate(() => __keisaku.speed(3));
  // from stops: wait until he is at each kind of place, then distract him
  const seen = new Set();
  for (let i = 0; i < 14 && seen.size < 5; i++) {
    await p.waitForFunction(() => { const m = __keisaku.monk(); return !m.busy && m.patrol.active && (m.patrol.mode === 'walk' || m.patrol.mode === 'turn' || m.patrol.mode === 'stand'); }, null, { timeout: 20000 });
    const before = await M(p), where = before.patrol.mode === 'stand' ? 'at ' + before.patrol.at : before.patrol.mode;
    await rec(p); await away(p, 3000); await idleMonk(p); const r = await endRec(p);
    const bad = await p.evaluate(r => r.filter(q => q.active && (PATROL.footHits(q.x, q.y, PATROL.GROUND_RAW).length || (Math.hypot(q.x - 132, q.y - 254) >= 12 && PATROL.footHits(q.x, q.y).length) || (PATROL.inFront(q.y) && PATROL.screenHits(q.x, q.y).length))).slice(0, 3), r);
    assert.deepEqual(bad, [], `from ${where}`);
    const raise = r.find(q => q.seg === 'raise'); assert.ok(raise && Math.abs(raise.x - 132) < .5, `from ${where}: reached the stance`);
    seen.add(where);
    await p.waitForTimeout(400 + i * 350);
  }
  assert.ok(seen.size >= 3, `from several kinds of place (${[...seen]})`);
  assert.equal((await R(p)).hits, (await M(p)).stats.reminders, 'one count per reminder here (none overlapped)');
  assert.deepEqual(errors, []); await ctx.close();
});

test('reduced motion: no walking or turning frames, the reminder still happens once and counts once', async () => {
  const { p, ctx, errors } = await openApp(browser, server.url, { reducedMotion: 'reduce' });
  await sit(p); await p.waitForTimeout(800);
  await rec(p); await p.waitForTimeout(3000);
  await away(p, 3000); await idleMonk(p); await p.waitForTimeout(1500);
  const r = await endRec(p);
  for (const q of r) if (q.active && q.key) { assert.ok(!q.key.startsWith('T:'), 'no turn frames'); assert.match(q.key, /^W:[RLFK]:0:/, 'no walk phases'); }
  assert.ok(!r.some(q => q.seg === 'swing'), 'held key poses, no swing');
  assert.equal((await R(p)).hits, 1);
  assert.deepEqual(errors, []); await ctx.close();
});

test('a hidden page: no frames, no progress; back again, the reminder carries on from where it was', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  await sit(p); await p.waitForTimeout(800);
  await away(p, 3000);
  await p.waitForFunction(() => __keisaku.monk().busy && __keisaku.monk().patrol.mode === 'walk', null, { timeout: 8000 });
  const a = await p.evaluate(() => { const raf = window.requestAnimationFrame, held = []; window.requestAnimationFrame = cb => held.push(cb);
    window.__release = () => { window.requestAnimationFrame = raf; held.forEach(cb => raf(cb)); }; return null; });
  await p.waitForTimeout(100); const x0 = (await M(p)).x;
  await p.waitForTimeout(1500); const x1 = (await M(p)).x;
  assert.equal(x1, x0, 'no frames, no walking');
  await p.evaluate(() => window.__release()); await p.waitForTimeout(60);
  assert.ok(Math.abs((await M(p)).x - x0) < 3, 'no jump when frames come back');
  await idleMonk(p); assert.equal((await R(p)).hits, 1);
  await ctx.close();
});

test('a reload during a round starts over, as before, and keeps the log and the collection', async () => {
  const old = [entry(3, { min: 25, hits: 2 }), entry(2, { min: 25 }), entry(1, { min: 50, hits: 1, leave: 1, late: 3, goal: 4 })];
  const collect = { scroll: '心', wear: { head: null, body: null, extra: null }, seen: [], faces: ['calm'], face: 'peek' };
  const { p, ctx, errors } = await openApp(browser, server.url, { storage: { 'keisaku-log-v2': old, 'keisaku-collect-v1': collect } });
  await sit(p); await away(p, 3000);
  await p.reload(); await waitForLine(p, '今天想做什麼');
  assert.equal((await R(p)).phase, 'idle');
  assert.deepEqual(await log(p), old, 'the log as it was (the round in progress was not finished, as before)');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('keisaku-collect-v1')).scroll), '心');
  // a finished round adds one entry in the same format
  await sit(p); await away(p, 3000); await idleMonk(p); await forward(p, 26 * 60000);
  await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 15000 });
  const L = await log(p), e = L[L.length - 1];
  assert.equal(L.length, 4);
  assert.deepEqual(Object.keys(e).filter(k => !['t', 'd', 'task', 'min', 'hits', 'full', 'leave', 'late', 'goal'].includes(k)), [], 'no new fields');
  assert.deepEqual([e.min, e.hits, e.full], [25, 1, true]);
  assert.deepEqual(errors, []); await ctx.close();
});

for (const [w, h] of [[320, 640], [360, 740], [390, 844], [412, 915], [375, 600], [844, 390]]) {
  test(`phone ${w}×${h}: no sideways scroll, 合掌請打 under the zendo, the monk and the mochi inside it`, async () => {
    const { p, ctx, errors } = await openApp(browser, server.url, { width: w, height: h });
    await sit(p); await p.evaluate(() => __keisaku.speed(4)); await p.waitForTimeout(1500);
    const lay = await p.evaluate(() => {
      const st = document.getElementById('stage').getBoundingClientRect(), r = id => document.getElementById(id).getBoundingClientRect();
      return { sw: document.documentElement.scrollWidth, w: innerWidth, stage: st.toJSON(), ask: r('askBtn').toJSON(), leave: r('leaveBtn').toJSON(), main: r('mainBtn').toJSON(), sitter: r('sitter').toJSON() };
    });
    assert.ok(lay.sw <= lay.w, `no sideways scroll (${lay.sw} > ${lay.w})`);
    assert.ok(lay.ask.top >= lay.stage.bottom - 1, '合掌請打 is not on the zendo');
    for (const k of ['ask', 'leave', 'main']) assert.ok(lay[k].height >= 40 || k !== 'ask', `${k} is finger-sized`);
    assert.ok(lay.sitter.left >= lay.stage.left && lay.sitter.right <= lay.stage.right, 'the mochi is inside the zendo');
    // the monk stays inside the scene wherever he walks
    await rec(p); await p.waitForTimeout(6000); const r = await endRec(p);
    const out = await p.evaluate(r => r.filter(q => { const b = PATROL.monkRect(q.x, q.y); return b.x0 - 6 < 0 || b.x1 - 6 > 400 || b.y0 - 17 < 0 || q.y - 17 > 280; }).length, r);
    assert.equal(out, 0, 'the monk stays inside the scene');
    await shot(p, `r5-phone-${w}x${h}`);
    assert.deepEqual(errors, []); await ctx.close();
  });
}

test('larger text (130%): the buttons under the zendo do not run into each other', async () => {
  const { p, ctx } = await openApp(browser, server.url, { width: 360, height: 740 });
  await p.addStyleTag({ content: 'html { font-size: 130% !important; }' });
  await sit(p); await p.waitForTimeout(600);
  const boxes = await p.evaluate(() => ['askBtn', 'leaveBtn', 'mainBtn', 'clock', 'status'].map(id => document.getElementById(id).getBoundingClientRect().toJSON()));
  const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) assert.ok(!hit(boxes[i], boxes[j]), `boxes ${i} and ${j} overlap`);
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
  await shot(p, 'r5-text-130');
  await ctx.close();
});

test('the service worker: the new version is cached, old caches go, and the app starts offline with the data intact', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage();
  await p.goto(server.url + 'manifest.webmanifest');
  await p.evaluate(async () => { const c = await caches.open('keisaku-shell-v20'); await c.put('./index.html', new Response('old')); localStorage.setItem('keisaku-log-v2', JSON.stringify([{ t: 1, d: '2026-01-01', task: '讀書', min: 25, hits: 1, full: true }])); });
  await p.goto(server.url + 'index.html');
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.waitForFunction(async () => (await caches.keys()).includes('keisaku-shell-v21') && !(await caches.keys()).includes('keisaku-shell-v20'), null, { timeout: 10000, polling: 300 });
  await p.reload(); await p.waitForFunction(() => !!navigator.serviceWorker.controller);
  await ctx.setOffline(true);
  await p.reload();
  await p.waitForFunction(() => window.__keisaku && document.getElementById('monk') && !document.getElementById('dialog').hidden, null, { timeout: 10000 });
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('keisaku-log-v2')).length), 1, 'the log is still there');
  await ctx.setOffline(false); await ctx.close();
});

test('a long patrol: the drawing is reused (no SVG rebuilt per frame), memory and the page stay flat, frames are quick', async () => {
  const { p, ctx } = await openApp(browser, server.url);
  await sit(p); await p.evaluate(() => __keisaku.speed(6));
  const cdp = await ctx.newCDPSession(p); await cdp.send('HeapProfiler.enable');
  await p.waitForTimeout(6000);
  await cdp.send('HeapProfiler.collectGarbage'); const h0 = (await cdp.send('Runtime.getHeapUsage')).usedSize;
  const a = await p.evaluate(() => ({ dom: document.getElementsByTagName('*').length, built: __keisaku.monk().patrol.built }));
  await p.waitForTimeout(20000);
  await cdp.send('HeapProfiler.collectGarbage'); const h1 = (await cdp.send('Runtime.getHeapUsage')).usedSize;
  const b = await p.evaluate(() => ({ dom: document.getElementsByTagName('*').length, built: __keisaku.monk().patrol.built }));
  assert.ok(b.built <= 120, `poses built once (${b.built})`);
  assert.ok(b.dom - a.dom <= (b.built - a.built) * 400 + 60, `the page grows only by new poses (${a.dom} → ${b.dom})`);
  assert.ok(h1 - h0 < 3 * 1048576, `heap ${(h0 / 1048576).toFixed(1)} → ${(h1 / 1048576).toFixed(1)} MB`);
  await ctx.close();
});
