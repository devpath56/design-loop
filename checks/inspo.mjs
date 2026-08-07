// inspo — capture a design reference from a social post (Instagram carousel / reel) as readable
// artifacts: per-slide screenshots plus the caption and alt text, written locally.
//
// WHY THIS IS A SCRIPT AND NOT A RUNBOOK. The workflow was performed by hand once and every step of
// it was a surprise. A prose note describing those surprises is tier D on the quality ladder: it
// reminds, and the next run rediscovers the same five gotchas. Encoding them is the only way the
// knowledge survives, so each one below is a line of code with the reason attached.
//
// THE FIVE THINGS THAT ARE NOT OBVIOUS, all learned the expensive way:
//
//   1. THE LOGIN MODAL MUST BE REMOVED FROM THE DOM, NOT CLICKED. Clicking its X appears to work and
//      does not: the dialog stays in the accessibility tree and in innerText, so the next text
//      extraction returns the modal's copy instead of the post's. Removing the node is the only
//      reliable dismissal, and it is also the privacy-preserving choice — it declines rather than
//      engaging with a signup prompt.
//
//   2. PAGE TEXT RETURNS THE CAPTION ONLY. A carousel's content lives inside the images. Extracting
//      text and stopping there produces the author's marketing copy and none of the substance, which
//      reads like a successful extraction. This is the failure mode with the highest cost because it
//      is silent.
//
//   3. THE SLIDE MUST BE ISOLATED TO BE LEGIBLE. At page scale a 1744x2180 slide renders ~500px wide
//      and its body text is unreadable. Replacing the document with the single image at 100vw is what
//      makes it readable. Viewport-region cropping is NOT available in this browser pane — it
//      silently returns the full screenshot instead — so isolation is the mechanism, not zoom.
//
//   4. VIDEO FRAMES ARE NOT EXTRACTABLE. For a reel, the caption and the platform's own alt text are
//      the whole ceiling. This is a boundary of the instrument, not a bug to fix, and the script says
//      so in its output rather than returning an empty result that looks like a clean run.
//
//   5. GATED CONTENT STAYS GATED. If a post's payload is behind a comment or a login, no amount of
//      scraping produces it, and the operator's own account action is the only path. The script
//      refuses rather than substituting a plausible neighbour.
//
// OUTPUT IS LOCAL REFERENCE ONLY. These are screenshots of someone else's work, kept for private
// study the same way the source books are: `.inspo/` is gitignored and must never be committed.
//
// Usage:
//   node checks/inspo.mjs <url> [--slides 10] [--out .inspo] [--json]
import { chromium } from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

// ── pure helpers (unit-tested by checks/test-inspo.mjs; no network, no browser) ─────────────────

/** Instagram shortcode from any of /p/X/, /reel/X/, /reels/X/, with or without query. */
export function shortcode(url) {
  const m = String(url || '').match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/** Is this a reel (video, so frames are unreadable) rather than a photo carousel? */
export function isVideoPost(url) {
  return /\/(reel|reels|tv)\//.test(String(url || ''));
}

/**
 * Does this element's text mark it as the login/signup interstitial?
 * Kept as a pure predicate so the control can prove it discriminates without a browser: a matcher
 * that accepted everything would remove the post itself and the run would look empty-but-clean.
 */
export function isLoginOverlay(text) {
  const t = String(text || '');
  if (!t.trim()) return false;
  return /Never miss a post|Sign up for Instagram|Log in to like|Log in to continue/i.test(t);
}

export function slidePath(outDir, code, i) {
  return path.join(outDir, code, `slide-${String(i).padStart(2, '0')}.png`);
}

/**
 * GOTCHA 6, and it is the one that silently produced duplicate slides.
 * The carousel holds only ~2 large images in the DOM at a time (lazy window), and BOTH are
 * full-size. "Pick the largest" therefore picks whichever is first in document order, which is not
 * the displayed slide — the same reason a manual read of `?img_index=8` returned slide 07. Choosing
 * the largest image NOT YET CAPTURED makes progress monotonic and duplicates impossible.
 * Returns null when every candidate has already been taken, which means "advance and retry", not "done".
 */
export function pickUnseen(srcs, seen) {
  const taken = seen instanceof Set ? seen : new Set(seen || []);
  for (const s of srcs || []) if (s && !taken.has(s)) return s;
  return null;
}

// ── the run ────────────────────────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const flag = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
  const url = argv.find((a) => /^https?:\/\//.test(a));
  const asJson = argv.includes('--json');
  const maxSlides = Number(flag('slides', 10));
  const outDir = flag('out', '.inspo');

  if (!url) { console.error('usage: node checks/inspo.mjs <url> [--slides N] [--out DIR] [--json]'); process.exit(2); }
  const code = shortcode(url) || 'post';
  const dir = path.join(outDir, code);
  fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1500 } });
  const notes = [];
  let caption = null, author = null, alts = [], captured = 0;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500); // the carousel image is lazy; without this the first shot is blank

    // GOTCHA 1 — remove, never click.
    await page.evaluate((src) => {
      const match = new Function('text', `return (${src})(text)`);
      document.querySelectorAll('div[role="dialog"], div[role="presentation"]').forEach((el) => {
        if (match(el.innerText || '')) el.remove();
      });
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    }, isLoginOverlay.toString());

    // metadata: caption + author + the platform's own alt text (the only readable layer on a reel)
    const meta = await page.evaluate(() => {
      const og = (p) => (document.querySelector(`meta[property="${p}"]`) || {}).content || null;
      return {
        ogDescription: og('og:description'),
        ogTitle: og('og:title'),
        alts: [...document.querySelectorAll('img')].filter((i) => i.naturalWidth > 300)
          .map((i) => i.alt).filter(Boolean).slice(0, 12),
      };
    });
    caption = meta.ogDescription; author = meta.ogTitle; alts = meta.alts;

    if (isVideoPost(url)) {
      // GOTCHA 4 — say so rather than returning an empty success.
      notes.push('VIDEO POST: frames are not extractable. Caption and alt text are the whole ceiling.');
    }

    const seen = new Set();      // src-keyed, stops re-picking the same DOM node
    const hashes = new Set();    // byte-keyed, stops the same slide under a rotated CDN url
    for (let i = 1; i <= maxSlides; i++) {
      // candidate srcs, largest first. Only ~2 are in the DOM at once (see pickUnseen).
      const srcs = await page.evaluate(() => [...document.querySelectorAll('img')]
        .filter((x) => x.naturalWidth > 1000)
        .sort((a, b) => b.naturalWidth - a.naturalWidth)
        .map((x) => x.currentSrc || x.src));

      const pick = pickUnseen(srcs, seen);
      if (!pick) { notes.push(`no NEW slide image at index ${i}; carousel exhausted after ${captured}`); break; }
      seen.add(pick);

      // GOTCHA 3 — isolate the slide, because region-crop is unavailable and page scale is illegible.
      await page.evaluate((src) => {
        document.body.innerHTML = '';
        document.body.style.cssText = 'margin:0;background:#fff';
        const c = document.createElement('img');
        c.src = src; c.style.cssText = 'width:100vw;height:auto;display:block';
        document.body.appendChild(c);
      }, pick);
      await page.waitForTimeout(500);

      // GOTCHA 7 — dedupe on BYTES, not on src. Instagram serves the same slide under different CDN
      // URLs (rotating tokens), so a URL-keyed `seen` set still admitted duplicates: the first fix
      // cut 2 dupes of 3 to 1 of 4, which is progress that is not a fix. The screenshot's own hash is
      // the only identity that survives a re-issued URL.
      const tmp = path.join(dir, `.tmp-${i}.png`);
      await page.screenshot({ path: tmp, fullPage: true });
      const hash = crypto.createHash('md5').update(fs.readFileSync(tmp)).digest('hex');
      if (hashes.has(hash)) {
        fs.unlinkSync(tmp);
        notes.push(`index ${i}: same image bytes under a new URL, skipped`);
      } else {
        hashes.add(hash);
        captured++;
        fs.renameSync(tmp, slidePath(outDir, code, captured));
      }

      // advance. Body was replaced, so reload and re-clean before the next slide.
      if (i < maxSlides) {
        await page.goto(`${url.split('?')[0]}?img_index=${i + 1}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(2200);
        await page.evaluate((src) => {
          const match = new Function('text', `return (${src})(text)`);
          document.querySelectorAll('div[role="dialog"], div[role="presentation"]')
            .forEach((el) => { if (match(el.innerText || '')) el.remove(); });
        }, isLoginOverlay.toString());
      }
    }
  } catch (e) {
    notes.push(`ERROR: ${e.message.split('\n')[0]}`);
  } finally {
    await browser.close();
  }

  const result = { url, code, video: isVideoPost(url), author, caption, alts, captured, dir, notes };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(result, null, 2));

  if (asJson) { console.log(JSON.stringify(result, null, 2)); }
  else {
    console.log(`\n== inspo: ${code} ==\n`);
    console.log(`  author   : ${author || 'UNKNOWN'}`);
    console.log(`  caption  : ${(caption || 'NONE').slice(0, 160)}`);
    console.log(`  slides   : ${captured} -> ${dir}/slide-NN.png`);
    if (alts.length) console.log(`  alt text : ${alts.length} image(s) carry alt text (the readable layer on video)`);
    for (const n of notes) console.log(`  note     : ${n}`);
    // GOTCHA 2 — never let a caption-only run read as a full extraction.
    if (captured === 0) console.log(`\n  CAPTION ONLY. No slide was captured, so the substance was NOT extracted.`);
    console.log(`\nRESULT: ${captured > 0 ? 'CAPTURED' : 'CAPTION-ONLY'}`);
  }
  process.exitCode = captured > 0 || isVideoPost(url) ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
