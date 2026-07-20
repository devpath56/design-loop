// show — the sanctioned way to put a prototype in front of Devansh, encoded so it cannot be faked.
//
// CF-074 / CF-070: describing a prototype, or verifying it headlessly, or opening it over file://
// (a dead snapshot — no JS) is not showing it. This makes "shown" a checkable act: it serves the
// repo over http, renders the page in a real browser, asserts it actually painted (JS ran, the body
// has content, the console is clean), and writes a screenshot artifact. If any of that fails, it
// EXITS NONZERO — you cannot claim a prototype is shown when it did not render live.
//
// Honest limit (stated, not hidden — the CF-074 rule): this gates that WHAT I show renders live and
// produces an artifact. It cannot gate that I chose to run it, or that the human looked. Those stay
// behavioural. So: run this for every showing, present the screenshot it writes, and never call the
// memory alone "hardened."
//
// Run:  node checks/show.mjs <file.html>
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2];
if (!target || target.startsWith('file://')) {
  console.error('usage: node checks/show.mjs <file.html>   (a repo-relative path; file:// is a dead snapshot and is refused)');
  process.exit(2);
}
if (!fs.existsSync(target)) { console.error(`no such file: ${target}`); process.exit(2); }

const freePort = () => new Promise((res) => {
  const s = net.createServer();
  s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); });
});

const port = await freePort();
// Serve the repo root so relative effect scripts (./effects/...) resolve exactly as in production.
const server = spawn('python3', ['-m', 'http.server', String(port)], { cwd: process.cwd(), stdio: 'ignore' });
const cleanup = () => { try { server.kill(); } catch {} };
process.on('exit', cleanup);

const url = `http://localhost:${port}/${target}`;
let code = 0;
try {
  await new Promise((r) => setTimeout(r, 600)); // let the server bind
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1400); // let an entrance settle

  const http_ok = resp && resp.status() < 400;
  const painted = await page.evaluate(() => (document.body?.innerText || '').trim().length > 0
    && document.body.getBoundingClientRect().height > 0);

  const shotDir = '.shots';
  fs.mkdirSync(shotDir, { recursive: true });
  const shot = path.join(shotDir, `shown-${path.basename(target, '.html')}.png`);
  await page.screenshot({ path: shot });
  await browser.close();

  console.log(`  served : ${url}`);
  console.log(`  http   : ${http_ok ? 'ok (' + resp.status() + ')' : 'FAIL (' + (resp ? resp.status() : 'no response') + ')'}`);
  console.log(`  painted: ${painted ? 'ok (body has visible content)' : 'FAIL (blank / zero-height body — JS ran?)'}`);
  console.log(`  console: ${errors.length ? 'FAIL (' + errors.length + ' error(s): ' + errors[0].slice(0, 80) + ')' : 'clean'}`);
  console.log(`  shot   : ${shot}`);

  const ok = http_ok && painted && errors.length === 0;
  console.log(`\nRESULT: ${ok ? 'SHOWN (renders live; open ' + url + ' and view the shot)' : 'NOT SHOWN — it did not render live, do not claim it works'}`);
  code = ok ? 0 : 1;
} catch (e) {
  console.error('  show failed: ' + e.message);
  code = 1;
} finally {
  cleanup();
}
process.exit(code);
