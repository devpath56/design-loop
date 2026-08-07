// test-inspo — durability control for checks/inspo.mjs.
//
// SCOPE, STATED HONESTLY. This gates the PURE logic only: URL parsing, the video/photo split, the
// login-overlay predicate, and output paths. It does NOT hit the network, so the browser path stays
// tier D (exercised by hand). That split is deliberate rather than lazy: a control that scraped a
// live post would fail on someone else's rate limit or markup change and get switched off, and a
// gate that gets switched off is worse than no gate (quality-ladder axis 2).
//
// What the pure tests DO buy: the overlay matcher is the one piece that can fail silently and
// destructively. A matcher that is too broad removes the post itself and the run reports a clean
// empty result; too narrow and the modal survives and every text extraction returns its copy. Both
// directions are pinned below, so gutting the predicate reddens this suite.
//
// Run:  node checks/test-inspo.mjs
import { shortcode, isVideoPost, isLoginOverlay, slidePath, pickUnseen } from './inspo.mjs';

let fails = 0;
const check = (label, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}`); if (!cond) fails++; };

console.log('== inspo: url parsing, the video split, and the overlay matcher discriminate ==\n');

// shortcode across every real URL shape seen in practice
check('parses /p/<code>/', shortcode('https://www.instagram.com/p/DblU1r_HA5p/') === 'DblU1r_HA5p');
check('parses a query suffix (?img_index=8)', shortcode('https://www.instagram.com/p/DblU1r_HA5p/?img_index=8') === 'DblU1r_HA5p');
check('parses /reel/<code>/', shortcode('https://www.instagram.com/reel/DbqD5lMzFeF/') === 'DbqD5lMzFeF');
check('parses the plural /reels/<code>/', shortcode('https://www.instagram.com/reels/Dbe87omwebx/') === 'Dbe87omwebx');
check('returns null on a non-post url', shortcode('https://www.instagram.com/someuser/') === null);
check('returns null on junk', shortcode('') === null);

// the video split decides whether "no slides" is a boundary or a failure
check('a reel is a video post', isVideoPost('https://www.instagram.com/reel/X1/'));
check('the plural reels form is a video post', isVideoPost('https://www.instagram.com/reels/X1/'));
check('a /p/ carousel is NOT a video post', !isVideoPost('https://www.instagram.com/p/X1/'));

// the overlay matcher, both directions — this is the check that matters
check('matches the signup interstitial', isLoginOverlay('Never miss a post from chase.h.ai\nSign up for Instagram to stay in the loop.'));
check('matches the like/comment gate', isLoginOverlay('Log in to like or comment.'));
check('does NOT match the post caption (too-broad matcher would delete the post)',
  !isLoginOverlay('Comment "agent" to get my Claude code workflows, skills, and guides'));
check('does NOT match slide body copy', !isLoginOverlay('The 4-Part Prompt That Works. No 10,000-line design.md. Four inputs.'));
check('does NOT match empty text', !isLoginOverlay(''));
check('does NOT match whitespace', !isLoginOverlay('   \n  '));

// output paths are zero-padded so slide-10 sorts after slide-09 rather than after slide-01
check('slide paths are zero-padded', slidePath('.inspo', 'ABC', 7).endsWith('ABC/slide-07.png'));
check('  ...and two digits stay two digits', slidePath('.inspo', 'ABC', 10).endsWith('ABC/slide-10.png'));

// pickUnseen — the fix for the duplicate-slide defect. Both directions pinned: reverting it to
// "largest image" would return an already-captured src and this reddens.
check('picks the first unseen src', pickUnseen(['a','b'], new Set(['a'])) === 'b');
check('picks the largest-first src when nothing is seen', pickUnseen(['a','b'], new Set()) === 'a');
check('returns null when every candidate is already captured (advance-and-retry, not done)',
  pickUnseen(['a','b'], new Set(['a','b'])) === null);
check('tolerates an array instead of a Set', pickUnseen(['a','b'], ['a']) === 'b');
check('tolerates empty/undefined inputs', pickUnseen([], new Set()) === null && pickUnseen(undefined, undefined) === null);

process.on('exit', () => {
  console.log(`\nRESULT: ${fails ? `${fails} FAIL` : 'PASS'}`);
  if (fails) process.exitCode = 1;
});
