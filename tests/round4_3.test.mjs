// Round 4.3: the front collar (design/round4/monk-views2.js, frontCollar), redrawn in the accepted 3/4's terms.
// Only the front and the frames turning to it change; every other pose and the accepted drawing stay as they were.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch } from './helpers.mjs';

let server, browser, p;
before(async () => { server = await startServer(); browser = await launch(); p = await browser.newPage();
  await p.goto(server.url + 'design/round4/collar-review.html'); await p.waitForSelector('body[data-ready]'); });
after(async () => { await browser.close(); server.stop(); });

// the front collar of a pose: its neck (the V between the lapels), its two bands in drawing order, and its markup
const collar = (key) => p.evaluate(key => {
  const svg = NATURAL_PATROL.buildPose(key, 'cx'), i = svg.indexOf('<g data-collar="front"');
  if (i < 0) return null;
  const g = svg.slice(i, svg.indexOf('</g>', i) + 4), ART = MONK4.parts.ART;
  const paths = [...g.matchAll(/<path d="([^"]+)" style="([^"]+)"/g)].map(m => ({ d: m[1], style: m[2], pts: [...m[1].matchAll(/(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)/g)].map(q => [+q[1], +q[2]]) }));
  const neck = paths.find(q => q.style.includes(ART.neck)).pts, bands = paths.filter(q => q.style.includes(ART.band));
  const low = neck.reduce((a, q) => q[1] > a[1] ? q : a);
  return { g: g.replaceAll('cx-', 'ID-'), low, bands: bands.map(b => ({ start: b.pts[0], n: b.pts.length })), lines: (g.match(/stroke-width/g) || []).length };
}, key);

test('the front collar is the same in every step of the walk and with either face', async () => {
  const ref = await collar('W:F:0:kind:0'); assert.ok(ref, 'the front is drawn with the new collar');
  for (const face of ['kind', 'stern']) for (let ph = 0; ph < 8; ph++) {
    const c = await collar(`W:F:${ph}:${face}:0`);
    assert.equal(c.g, ref.g, `W:F:${ph}:${face}: the collar does not jump or bend while he walks`);
  }
});

test('his left lapel lies over his right, the crossing sits just above the chest panel, a little off centre', async () => {
  const c = await collar('W:F:0:kind:0');
  assert.equal(c.bands.length, 2);
  assert.ok(c.bands[0].start[0] < 0 && c.bands[1].start[0] > 0, `the band from his left shoulder (our right) is drawn last, on top (${JSON.stringify(c.bands)})`);
  assert.ok(c.low[1] > -50 && c.low[1] < -45.4, `the neck's V ends a little above the rakusu (top −45.4), the bands overlapping below it: ${c.low[1]}`);
  assert.ok(Math.abs(c.low[0]) > .4 && Math.abs(c.low[0]) < 3, `not a centred, symmetric V: crossing at x ${c.low[0]}`);
  assert.equal(c.lines, 2, 'one ink line on the inner edge of each band, no outline or piping of its own');
});

test('turning to the front, the collar moves smoothly from the accepted 3/4 and on to facing left', async () => {
  const xs = []; for (const k of ['T:p3midL:kind', 'W:F:0:kind:0', 'T:p3mid:kind']) { const c = await collar(k); assert.ok(c, `${k} uses the front collar`); xs.push(c.low); }
  const acc = [5.8, -46.4];   // the accepted 3/4's crossing (its neck shape's lowest point)
  // (the crossing is off centre, so on the way to facing left it travels further: about as far as his face does)
  const seq = [[-acc[0], acc[1]], ...xs, acc];
  for (let i = 1; i < seq.length; i++) {
    assert.ok(seq[i][0] > seq[i - 1][0], `the crossing moves one way through the turn (${JSON.stringify(seq)})`);
    assert.ok(Math.hypot(seq[i][0] - seq[i - 1][0], seq[i][1] - seq[i - 1][1]) < 5, `no jump between neighbouring frames (${JSON.stringify(seq)})`);
  }
});

test('only the front-facing frames change: the 3/4 views, profile, back 3/4, back and the accepted drawing do not', async () => {
  const r = await p.evaluate(() => { const N = NATURAL_PATROL, out = {}; for (const k of N.allKeys(['kind', 'stern'])) out[k] = N.buildPose(k, 'x').includes('data-collar="front"');
    out.ACC = MONK4.art({ id: 'x', pose: 'idle' }).includes('data-collar'); return out; });
  for (const [k, has] of Object.entries(r)) {
    const front = /^W:F:/.test(k) || /^T:p3midL?:/.test(k);
    assert.equal(has, front, `${k} ${front ? 'uses' : 'keeps'} ${front ? 'the new front collar' : 'its own collar'}`);
  }
});
