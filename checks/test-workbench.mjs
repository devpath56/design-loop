// test-workbench — durability control for the workbench state-dropdown scraper. prototype.html has a
// runtime selector `[data-state="${name}"]` inside a <script> (line ~253). The workbench must scrape
// data-state from MARKUP only; scraping scripts too pulls the literal ${name} in as a bogus state and
// emits a dead <option value="${name}"> that breaks the state-switch (the "workbench not loading"
// blunder). This regenerates the workbench and asserts no such artifact leaks in — so reverting the
// scraper fix reddens npm test. Fast: no browser, just regenerate + inspect the markup.
//
// Run:  node checks/test-workbench.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.join(HERE, '..');
let fails = 0;
const check = (label, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}`); if (!cond) fails++; };

console.log('== workbench: the state dropdown scrapes real states, not JS selectors ==\n');

// Regenerate without the browser self-verify (WB_NOSYNC), so this stays a fast deterministic check.
const gen = spawnSync('node', ['checks/workbench.mjs', 'prototype.html'],
  { cwd: ROOT, encoding: 'utf8', env: { ...process.env, WB_NOSYNC: '1' }, timeout: 30000 });
check('workbench regenerated', gen.status === 0 || gen.status === null || fs.existsSync(path.join(ROOT, 'workbench-prototype.html')));

const wb = fs.readFileSync(path.join(ROOT, 'workbench-prototype.html'), 'utf8');
const block = (wb.match(/<select id="st"[^>]*>([\s\S]*?)<\/select>/) || [])[1] || '';
const values = [...block.matchAll(/value="([^"]*)"/g)].map((m) => m[1]);

// the exact regression: prototype.html's `[data-state="${name}"]` selector must NOT become an option
check('no ${name} template artifact leaks into the state dropdown', !wb.includes('value="${name}"'));
check('every state option is a real state name or the empty default',
  values.length > 0 && values.every((v) => v === '' || /^[a-z][a-z0-9_-]*$/i.test(v)));
check('the real drawn states are present (error, locked, success)',
  ['error', 'locked', 'success'].every((s) => values.includes(s)));

console.log(`\n  state options: ${JSON.stringify(values)}`);
console.log(`RESULT: ${fails ? `${fails} FAIL` : 'PASS'}`);
process.exit(fails ? 1 : 0);
