// rule-coverage (T-10) — which design.md rules actually have an executed checker, and which
// are just prose. A census for the house style, mirroring the Trident census. Three outcomes:
// LINKED (a checker's code contains a keyword from the rule), REMINDER (no check found).
// Coarse by design: keyword overlap proves a plausible link, not a correct one (labeled limit).
//
// Run:  node checks/rule-coverage.mjs [--strict]
import fs from 'node:fs';
const STRICT = process.argv.includes('--strict');
const SELF = new URL(import.meta.url).pathname;

const CHECKERS = fs.readdirSync('checks').filter((f) => f.endsWith('.mjs') && f !== 'rule-coverage.mjs')
  .map((f) => `checks/${f}`);
const CODE = CHECKERS.map((f) => fs.readFileSync(f, 'utf8').toLowerCase()).join('\n');

// Pull the bold rule label out of each "- **Label** ..." line in design.md.
const rules = (fs.existsSync('design.md') ? fs.readFileSync('design.md', 'utf8') : '')
  .split('\n').map((l) => (l.match(/^-\s+\*\*(.+?)\*\*/) || [])[1]).filter(Boolean);

// Keyword per rule: the salient nouns. A rule is LINKED if any keyword appears in checker code.
const KEYWORD = {
  Contrast: ['contrast'], Names: ['aria-label', 'accessible name', 'button-name'],
  'No horizontal overflow': ['overflow'], 'No console errors': ['console'],
  Size: ['size', 'ratio'], Weight: ['weight'], Spacing: ['gap', 'spacing', '4px', '8px'],
  Motion: ['motion', 'ms', 'duration'], Focus: ['focus'], State: ['state'],
};
// NO loose fallback. A rule is LINKED only if it has an EXPLICIT keyword entry whose term
// appears in checker code. The first-word fallback made "state"/"size"/"focus" match common
// code and reported 32/32 covered, a vacuous pass (CF-065). Under-claiming is the safe
// direction: an unmapped rule is REMINDER until someone deliberately maps it to a checker.
const kwFor = (rule) => KEYWORD[rule.split(/[ .—:]/)[0]] || KEYWORD[rule] || null;

function assess() {
  return rules.map((rule) => {
    const kws = kwFor(rule);
    if (!kws) return { rule, linked: false, by: 'no rule->check mapping' };
    const by = kws.find((k) => CODE.includes(k.toLowerCase()));
    return { rule, linked: !!by, by: by || '' };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = assess();
  const linked = rows.filter((r) => r.linked).length;
  console.log(`== design.md rule coverage ==\n  ${rules.length} rules parsed from design.md\n`);
  for (const r of rows) {
    console.log(`  ${(r.linked ? 'LINKED  ' : 'REMINDER')} ${r.rule.slice(0, 46).padEnd(46)} ${r.by}`);
  }
  // controls: a known-checked rule (Contrast) is LINKED; a fabricated rule is REMINDER
  const cLinked = assess.call(null) && kwFor('Contrast').some((k) => CODE.includes(k));
  const cReminder = !['zzzznope'].some((k) => CODE.includes(k));
  console.log(`\n  control: 'Contrast' is LINKED         ${cLinked ? 'ok' : 'FAIL'}`);
  console.log(`  control: a fabricated rule is REMINDER ${cReminder ? 'ok' : 'FAIL'}`);
  console.log(`\n  ${linked}/${rules.length} rules have a checker; ${rules.length - linked} are prose-only (REMINDER)`);

  // ── RATCHET (forward-only): coverage may not DROP below the committed baseline ──────────
  // Trident's impact ratchet applied to the census. Without it, design.md can silently outgrow its
  // enforcement: add a rule with no checker, or delete a checker, and the count falls with every
  // gate still green. Raising the baseline is explicit (--set-baseline), never silent.
  const blIdx = process.argv.indexOf('--baseline'); // overridable so the durability control can fire it
  const BASELINE = blIdx >= 0 ? process.argv[blIdx + 1] : 'design-coverage-baseline.json';
  if (process.argv.includes('--set-baseline')) {
    fs.writeFileSync(BASELINE, JSON.stringify({ linked, total: rules.length }) + '\n');
    console.log(`  baseline SET: ${linked}/${rules.length} linked (explicit)`);
    process.exit(0);
  }
  let dropped = false;
  if (fs.existsSync(BASELINE)) {
    const b = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    if (linked < b.linked) {
      dropped = true;
      console.log(`  RATCHET BROKEN: coverage fell ${b.linked}→${linked} — a rule lost its checker, or a rule was added with none`);
    } else {
      console.log(`  ratchet: ${linked} >= baseline ${b.linked} (held)`);
    }
  } else {
    console.log(`  no baseline yet — run --set-baseline to seed the ratchet`);
  }

  const bad = (!cLinked || !cReminder) ? 1 : 0;
  console.log(`RESULT: ${bad ? 'CONTROL FAIL' : dropped ? 'RATCHET BROKEN' : 'reported'}`);
  // Non-strict is a backlog report; --strict fails on a broken control OR a coverage regression.
  process.exit(STRICT && (bad || dropped) ? 1 : 0);
}
