// test-state-taxonomy — makes the sourced-taxonomy change durable.
//
// The change (state-matrix reads <meta name="ui-states">, and the default no longer contains
// the folklore "empty") was a plain edit until this file existed. A plain edit reverts
// silently: reintroduce "empty" into the default and every gate stays green. This test fails
// if that happens, which is what "durable" means here.
//
// It drives the REAL state-matrix in --required-only dry mode, so it tests the shipped
// resolver and cannot drift from it. Each assertion ships with a negative control.
//
// Run:  node checks/test-state-taxonomy.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SM = path.join(path.dirname(new URL(import.meta.url).pathname), 'state-matrix.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'states-'));
const write = (name, html) => { const p = path.join(tmp, name); fs.writeFileSync(p, html); return p; };

const resolve = (file) =>
  spawnSync(process.execPath, [SM, file, '--required-only'], { encoding: 'utf8' }).stdout.trim();

const withMeta = write('with.html',
  `<!doctype html><meta name="ui-states" content="loading,error,success,locked"><title>t</title><body>x</body>`);
const noMeta = write('bare.html', `<!doctype html><title>t</title><body>x</body>`);
const dataScreen = write('data.html',
  `<!doctype html><meta name="ui-states" content="loading,empty,error,success"><title>t</title><body>x</body>`);

let fails = 0;
const check = (label, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}`); if (!cond) fails++; };

console.log('== state taxonomy: sourced, per-artifact, no folklore default ==\n');

// The artifact's declaration wins.
check('a declared set is used verbatim', resolve(withMeta) === 'loading,error,success,locked');

// The credible finding: a form owes "locked", not "empty".
check('the auth artifact requires "locked"', resolve(withMeta).includes('locked'));
check('the auth artifact does NOT require "empty"  (NN/g: empty is for data screens)',
      !resolve(withMeta).split(',').includes('empty'));

// The default, when nothing is declared, must not smuggle the folklore "empty" back.
check('the default excludes "empty" (control: this is what reverting the change would break)',
      !resolve(noMeta).split(',').includes('empty'));

// Negative control: a data screen that DECLARES empty is still allowed to. The rule is
// "empty is not universal", not "empty is banned". If this fails, the change over-corrected.
check('a data screen may still declare "empty" (negative control)',
      resolve(dataScreen).split(',').includes('empty'));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nRESULT: ${fails ? `${fails} FAIL` : 'PASS'}`);
process.exit(fails ? 1 : 0);
