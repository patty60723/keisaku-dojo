// Round 6-2: the Round 6 audit measurements before (6-1, design/round6/6-1/after/data.json) and after this batch
// (design/round6/6-2/capture/data.json, taken with the same tool: AUDIT_OUT=6-2/capture).
//   node design/round6/6-2/compare.mjs            summary per profile
//   node design/round6/6-2/compare.mjs --detail   every remaining small tap / small text / low contrast item
import fs from 'node:fs';
const B = JSON.parse(fs.readFileSync(new URL('../6-1/after/data.json', import.meta.url))), A = JSON.parse(fs.readFileSync(new URL('./capture/data.json', import.meta.url)));
const detail = process.argv.includes('--detail');
const sum = (P, f) => { const set = new Map(); for (const s of P.shots) for (const x of f(s.m)) set.set(typeof x === 'string' ? x.replace(/ [\d.]+:1.*| [\d.]+px$/, '') : x.el, typeof x === 'string' ? x : `${x.w}x${x.h}`); return set; };
const shot = (P, id) => P.shots.find(s => s.id === id);
const rows = [];
for (const k of Object.keys(A.profiles)) {
  const b = B.profiles[k], a = A.profiles[k]; if (!b) continue;
  const r = { profile: k };
  for (const [name, f] of [['taps', m => m.smallTaps || []], ['text', m => m.smallText || []], ['contrast', m => m.lowContrast || []]]) {
    const bs = sum(b, f), as = sum(a, f); r[name] = [bs.size, as.size];
    if (detail && as.size) r[name + 'Left'] = [...as].map(([e, v]) => e + ' ' + v);
  }
  r.hscroll = [b.shots.filter(s => s.m.hscroll).length, a.shots.filter(s => s.m.hscroll).length];
  r.errors = [b.errors.length, a.errors.length];
  r.shots = [b.shots.length, a.shots.length];
  const q = 'focus-quiet', bq = shot(b, q) , aq = shot(a, q) ;
  if (bq && aq) { r.stageTop = [bq.m.stageTop, aq.m.stageTop]; r.pageH = [bq.m.pageH, aq.m.pageH]; r.clockOnScreen = [bq.m.clockVisible, aq.m.clockVisible]; }
  rows.push(r);
}
if (detail) console.log(JSON.stringify(rows, null, 1));
else for (const r of rows) console.log(r.profile.padEnd(24), 'shots', r.shots.join('/'), ' small taps', r.taps.join(' → ').padEnd(9), 'text <12px', r.text.join(' → ').padEnd(8), 'low contrast', r.contrast.join(' → ').padEnd(7),
  'h-scroll', r.hscroll.join(' → '), ' errors', r.errors.join(' → '), r.stageTop ? ` | sitting: zendo top ${r.stageTop.join(' → ')}, page ${r.pageH.join(' → ')}, clock on screen ${r.clockOnScreen.join(' → ')}` : '');
