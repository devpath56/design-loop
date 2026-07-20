// test-show — the durability control for show.mjs (CF-074: a guard is only real if an executed check
// reverts RED). Proves show DISCRIMINATES: a live page is SHOWN, a dead/blank page is NOT SHOWN.
// Wired into npm test, so deleting or gutting show.mjs reddens the suite.
//
// Run:  node checks/test-show.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SHOW = path.join(HERE, 'show.mjs');
const ROOT = path.join(HERE, '..');
let fails = 0;
const check = (label, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}`); if (!cond) fails++; };

// a guaranteed-dead page (empty body) for the negative control
fs.writeFileSync(path.join(ROOT, 'fixtures', 'dead.html'),
  '<!doctype html><html><head><title>dead</title></head><body></body></html>');

const run = (file) => spawnSync('node', [SHOW, file], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });

console.log('== show: a prototype is "shown" only if it renders live ==\n');

const dead = run('fixtures/dead.html');
check('a blank/dead page is NOT SHOWN (exit 1)', dead.status === 1);
check('  and says so explicitly', /NOT SHOWN/.test(dead.stdout));

const live = run('fixtures/clean.html'); // static content, renders
check('a page with real content IS SHOWN (exit 0)', live.status === 0);
check('  and writes a screenshot artifact', fs.existsSync(path.join(ROOT, '.shots', 'shown-clean.png')));

// file:// is refused (a dead snapshot, the original blunder)
const fileproto = spawnSync('node', [SHOW, 'file:///tmp/x.html'], { cwd: ROOT, encoding: 'utf8' });
check('a file:// path is refused (exit 2)', fileproto.status === 2);

console.log(`\nRESULT: ${fails ? `${fails} FAIL` : 'PASS'}`);
process.exit(fails ? 1 : 0);
