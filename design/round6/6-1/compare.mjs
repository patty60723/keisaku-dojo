// Round 6-1: compares the audit measurements (before, main @ ebcae50) with design/round6/6-1/after/data.json
//   node design/round6/6-1/compare.mjs            summary per profile
//   node design/round6/6-1/compare.mjs --detail   every remaining item (for the exception list)
import fs from 'node:fs';
const B = JSON.parse(fs.readFileSync(new URL('../audit/data.json', import.meta.url))), A = JSON.parse(fs.readFileSync(new URL('./after/data.json', import.meta.url)));
const detail = process.argv.includes('--detail');
const sum = (P, f) => { const set = new Map(); for (const s of P.shots) for (const x of f(s.m)) set.set(typeof x === 'string' ? x.replace(/ [\d.]+:1.*| [\d.]+px$/, '') : x.el, typeof x === 'string' ? x : `${x.w}x${x.h}`); return set; };
const rows = [];
for (const k of Object.keys(B.profiles)) {
  const b = B.profiles[k], a = A.profiles[k]; if (!a) continue;
  const r = { profile: k };
  for (const [name, f] of [['taps', m => m.smallTaps || []], ['text', m => m.smallText || []], ['contrast', m => m.lowContrast || []]]) {
    const bs = sum(b, f), as = sum(a, f); r[name] = [bs.size, as.size];
    if (detail && as.size) r[name + 'Left'] = [...as].map(([e, v]) => e + ' ' + v);
  }
  r.hscroll = [b.shots.filter(s => s.m.hscroll).length, a.shots.filter(s => s.m.hscroll).length];
  r.errors = [b.errors.length, a.errors.length];
  rows.push(r);
}
if (detail) console.log(JSON.stringify(rows, null, 1));
else for (const r of rows) console.log(r.profile.padEnd(24), 'small taps', r.taps.join(' → ').padEnd(10), 'text <12px', r.text.join(' → ').padEnd(10), 'low contrast', r.contrast.join(' → ').padEnd(8), 'h-scroll', r.hscroll.join(' → '), 'errors', r.errors.join(' → '));
