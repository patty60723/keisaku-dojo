// Round 4.2A-1: refined candidate views (design/round4/monk-views2.js, pose-refinement-review.html).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.stop(); });

async function open({ width = 390, height = 844 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${server.url}design/round4/pose-refinement-review.html`);
  await p.waitForFunction(() => window.__REFINE);
  return { p, ctx, errors };
}

test('the left-facing pose reuses the accepted head, robe and collar: rebuilt with the accepted arms it is pixel-identical to MONK4.art', async () => {
  const { p, ctx, errors } = await open({ width: 600, height: 600 });
  for (const left of [false, true]) {
    await p.evaluate(left => {
      const box = document.createElement('div'); box.id = 'cmp'; box.style.cssText = 'position:fixed;left:0;top:0;z-index:99;width:300px;height:300px;background:#fff';
      document.querySelector('#cmp')?.remove(); document.body.appendChild(box);
      window.__set = k => { box.innerHTML = `<svg viewBox="-45 -106 90 112" width="300" height="373"><rect x="-60" y="-120" width="120" height="140" fill="#ece3cf"/>${k === 'acc' ? MONK4.art({ id: 'q', pose: 'idle', facing: left ? 'left' : 'right' }) : MONK_VIEWS2.acc34({ id: 'q', left, arms: 'idle' })}</svg>`; };
    }, left);
    const shots = [];
    for (const k of ['acc', 'rebuilt']) { await p.evaluate(k => __set(k), k); await p.waitForTimeout(50); shots.push((await p.locator('#cmp').screenshot()).toString('base64')); }
    const diff = await p.evaluate(async S => {
      const px = async b => { const im = new Image(); await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + b; }); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
      const [a, b] = await Promise.all(S.map(px)); let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 8) n++; return n;
    }, shots);
    assert.equal(diff, 0, `${left ? 'facing left' : 'facing right'}: ${diff} pixels differ`);
  }
  assert.deepEqual(errors, []); await ctx.close();
});

test('ears are attached to the head, and no eye or mouth shows once the face has turned away', async () => {
  const { p, ctx, errors } = await open();
  const R = await p.evaluate(() => __REFINE.checks);
  assert.equal(R.length, 10);
  for (const r of R) {
    for (const e of r.ears) assert.ok(e.attached, `${r.c} ${r.v}: an ear floats`);
    if (Math.cos(r.th * Math.PI / 180) < -.2) assert.equal(r.eyesShown, 0, `${r.c} ${r.v}: eyes show on the back of the head`);
  }
  assert.deepEqual(errors, []); await ctx.close();
});

test('ears, face and body agree on one turn: his right ear is on our left from the front and on our right from behind', async () => {
  const { p, ctx } = await open();
  const H = await p.evaluate(() => [0, 17.5, 90, 135, 180].map(th => { const h = MONK_VIEWS2.headParts(th); return { th, c: h.c, rightEar: h.ears[0], leftEar: h.ears[1], eyes: h.eyes.filter(e => e.show).length, mouth: h.mouth.show }; }));
  const at = th => H.find(h => h.th === th);
  assert.ok(at(0).rightEar.x < at(0).c && at(0).leftEar.x > at(0).c, 'front: right ear on our left');
  assert.ok(at(180).rightEar.x > at(180).c && at(180).leftEar.x < at(180).c, 'back: right ear on our right');
  assert.ok(at(135).rightEar.onTop && at(135).rightEar.x > at(135).c, 'back-3/4: the right ear is the visible one, on the right of the head');
  assert.equal(at(135).leftEar.onTop, false, 'back-3/4: the left ear is behind the head');
  assert.equal(at(17.5).leftEar.onTop, false, 'P3 middle: the far ear is still behind the head');
  assert.equal(at(0).eyes, 2); assert.equal(at(90).eyes, 1); assert.equal(at(135).eyes, 0); assert.equal(at(180).eyes, 0);
  assert.equal(at(135).mouth, false);
  await ctx.close();
});

test('the keisaku stays in his right hand in every view, including facing left', async () => {
  const { p, ctx } = await open();
  const r = await p.evaluate(() => {
    const V = MONK_VIEWS2, out = {};
    for (const c of ['A', 'B']) for (const v of ['front', 'p3mid', 'profile', 'back34', 'back']) out[c + v] = { x: V.body(v, c).stick.x, layer: V.body(v, c).stick.layer, th: V.body(v, c).th };
    for (const c of ['A', 'B']) { const k = V.keepGrip(c); out[c + 'q34L'] = { x: k.stick.x }; }
    out.q34Lmarkup = V.view('q34L', 'A', { id: 'kk' });
    return out;
  });
  for (const c of ['A', 'B']) {
    assert.ok(r[c + 'front'].x < 0, `${c} front: on our left (his right)`);
    assert.ok(r[c + 'back'].x > 0, `${c} back: on our right (his right)`);
    assert.equal(r[c + 'back'].layer, 'under'); assert.equal(r[c + 'back34'].layer, 'under');
    // facing left is drawn facing right and mirrored: his right hand is then the far one (x > 0 before the mirror)
    assert.ok(r[c + 'q34L'].x > 0, `${c} facing left: held in the far hand`);
  }
  assert.ok(/scale\(-1 1\)/.test(r.q34Lmarkup), 'facing left is the mirrored drawing');
  await ctx.close();
});

test('one outline per fist: the fist is never part of the silhouette and is drawn once', async () => {
  const { p, ctx } = await open();
  const counts = await p.evaluate(() => {
    const out = {};
    for (const c of ['A', 'B']) for (const v of ['front', 'p3mid', 'profile', 'back34', 'back', 'q34L']) {
      const m = MONK_VIEWS2.view(v, c, { id: 'z' }), fists = (m.match(/stroke-width:1\.2;stroke-linejoin:round/g) || []).length;
      out[c + v] = fists;
    }
    return out;
  });
  for (const [k, n] of Object.entries(counts)) assert.ok(n <= 1, `${k}: ${n} fist outlines`);
  assert.equal(counts.Aback, 0); assert.equal(counts.Afront, 1); assert.equal(counts.Aq34L, 1);
  await ctx.close();
});

for (const w of [360, 390, 412]) {
  test(`${w}px: every candidate is drawn whole, heads and feet on the same lines, no overflow`, async () => {
    const { p, ctx, errors } = await open({ width: w });
    const r = await p.evaluate(() => {
      const out = [];
      for (const fig of document.querySelectorAll('#p3 figure, #b34 figure, #fb figure, #pr figure, #kg figure')) {
        const sv = fig.querySelector('svg'), vb = sv.viewBox.baseVal, g = sv.querySelector('.m4');
        const bs = [...g.querySelectorAll('defs .m4p')].map(e => e.getBBox()), x0 = Math.min(...bs.map(q => q.x)), y0 = Math.min(...bs.map(q => q.y)), x1 = Math.max(...bs.map(q => q.x + q.width)), y1 = Math.max(...bs.map(q => q.y + q.height));
        const flip = /scale\(-1 1\)/.test(g.innerHTML.slice(-400)), X0 = flip ? -x1 : x0, X1 = flip ? -x0 : x1;
        out.push({ cap: fig.textContent.trim(), inside: X0 >= vb.x && y0 >= vb.y && X1 <= vb.x + vb.width && y1 <= vb.y + vb.height, top: y0, bottom: y1 });
      }
      return { out, sw: document.documentElement.scrollWidth };
    });
    assert.equal(r.sw, w, 'no horizontal overflow');
    for (const t of r.out) assert.ok(t.inside, `${t.cap}: cropped`);
    for (const t of r.out) { assert.ok(Math.abs(t.top + 94) < 1.6, `${t.cap}: head top ${t.top.toFixed(1)}`); assert.ok(Math.abs(t.bottom - 1.6) < 1.6, `${t.cap}: feet ${t.bottom.toFixed(1)}`); }
    assert.deepEqual(errors, []); await ctx.close();
  });
}
