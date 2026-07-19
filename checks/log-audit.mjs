// log-audit — records the STRUCTURAL checker's findings (hallmark audit) against a run.
//
// Why this exists: design-gate logs the deterministic half automatically, but `hallmark audit`
// is an LLM skill whose output previously lived only in the chat transcript and was lost.
// Half the checker produced no record at all. This closes that.
//
// Usage:
//   node checks/log-audit.mjs <runId> --gate "<tell>" --severity critical --where "file:12-20" [--fix "..."]
//   node checks/log-audit.mjs <runId> --clean          # audit ran, found nothing
//   node checks/log-audit.mjs <runId> --json '[{...}]' # bulk, one call
//
// --clean is NOT the same as never running the audit. An unaudited run and a clean run must
// not look alike in the table, or a skipped checker reads as a passing one.
import fs from 'node:fs';

const argv = process.argv.slice(2);
const runId = argv[0];
const SEVERITIES = ['critical', 'major', 'minor'];

if (!runId || runId.startsWith('--')) {
  console.error('usage: node checks/log-audit.mjs <runId> --gate "<tell>" --severity <critical|major|minor> --where "<loc>" [--fix "..."]');
  console.error('       node checks/log-audit.mjs <runId> --clean');
  process.exit(2);
}

const runs = fs.existsSync('design-runs.jsonl')
  ? fs.readFileSync('design-runs.jsonl', 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  : [];
const run = runs.find((r) => r.id === runId);
if (!run) {
  console.error(`no run with id "${runId}" in design-runs.jsonl. Run the gate with --log first`);
  process.exit(2);
}

const f = { gate: '', severity: '', where: '', fix: '', clean: false, json: '' };
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--clean') f.clean = true;
  else if (a === '--gate') f.gate = argv[++i] ?? '';
  else if (a === '--severity') f.severity = argv[++i] ?? '';
  else if (a === '--where') f.where = argv[++i] ?? '';
  else if (a === '--fix') f.fix = argv[++i] ?? '';
  else if (a === '--json') f.json = argv[++i] ?? '';
  else { console.error(`unknown flag: ${a}`); process.exit(2); }
}

let findings;
if (f.clean) {
  findings = [];
} else if (f.json) {
  try { findings = JSON.parse(f.json); } catch (e) { console.error(`--json is not valid JSON: ${e.message}`); process.exit(2); }
  if (!Array.isArray(findings)) { console.error('--json must be an array of findings'); process.exit(2); }
} else {
  if (!f.gate || !f.severity) { console.error('need --gate and --severity (or --clean, or --json)'); process.exit(2); }
  findings = [{ gate: f.gate, severity: f.severity, where: f.where, fix: f.fix }];
}

// A finding a measurement disproved is not deleted — deletion loses the fact that the
// checkers disagreed, which is itself the most useful thing in the record. It is marked
// disputed, with the evidence that contradicts it, and stops counting toward the verdict.
for (const x of findings) {
  if (x.disputed) {
    if (!x.disputed_by?.trim() || !x.evidence?.trim()) {
      console.error(`disputed finding "${x.gate}" needs both disputed_by and evidence`);
      process.exit(2);
    }
    continue; // severity is not required on a disputed finding
  }
  if (!SEVERITIES.includes(x.severity)) {
    console.error(`bad severity "${x.severity}" on "${x.gate}". Must be one of: ${SEVERITIES.join(', ')}`);
    process.exit(2);
  }
}

const record = { runId, ts: new Date().toISOString(), findings };
fs.appendFileSync('design-audits.jsonl', JSON.stringify(record) + '\n');

const crit = findings.filter((x) => x.severity === 'critical').length;
console.log(`  audit logged → design-audits.jsonl  run ${runId}  ${findings.length} finding(s), ${crit} critical`);
if (crit) console.log('  ⚠  critical slop gate → the loop GATE must FAIL regardless of what design-gate said');
