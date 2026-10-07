// The shipped files must be exactly what the build makes from src/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.mjs';

for (const [script, out] of [['build.py', 'index.html'], ['build_lab.py', 'soundlab.html']]) {
  test(`${script} rebuilds ${out} unchanged`, () => {
    const file = path.join(ROOT, out), before = readFileSync(file, 'utf8');
    execFileSync('python3', [path.join(ROOT, script)]);
    const after = readFileSync(file, 'utf8');
    if (after !== before) writeFileSync(file, before);       // leave the working tree as it was
    assert.ok(after === before, `${out} is out of date: run python3 ${script} and commit the result`);
  });
}
