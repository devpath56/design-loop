// runs — the single loader + join for every view (ledger, dashboard, replay, workbench).
//
// This exists because the joins were copy-pasted per view and drifted: the dashboard once
// reported "no lesson" for a run the markdown ledger showed a lesson for, because only one
// copy had the legacy fallback. Two views of one dataset must never disagree.
import fs from 'node:fs';
import path from 'node:path';

export const readJsonl = (f) =>
  fs.existsSync(f)
    ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).flatMap((l) => {
        try { return [JSON.parse(l)]; } catch { return []; }
      })
    : [];

export function load() {
  const runs = readJsonl('design-runs.jsonl');
  const audits = readJsonl('design-audits.jsonl');
  const lessons = readJsonl('design-lessons.jsonl').filter((l) => l.target !== 'seed');
  const teaching = readJsonl('design-teaching.jsonl');

  const auditFor = (r) => (r.id ? audits.find((a) => a.runId === r.id) : undefined);

  // Join on run id, falling back to the change text for rows written before ids existed.
  const lessonFor = (r) => {
    if (r.id) { const byId = lessons.find((l) => l.runId === r.id); if (byId) return byId; }
    return r.note ? lessons.find((l) => l.target === r.target && l.change === r.note) : undefined;
  };

  // The verdict is BOTH checkers. axe green + a critical slop gate = BLOCKED, not PASS.
  const verdictOf = (r) => {
    const crit = (auditFor(r)?.findings ?? []).filter((x) => x.severity === 'critical' && !x.disputed).length;
    return r.gate !== 'PASS' ? 'FAIL' : crit ? 'BLOCKED' : 'PASS';
  };

  // Diagnosis / terms / scored feedback — model-authored, kept out of the machine-measured
  // run row so the deterministic log never looks more objective than it is.
  const teachFor = (r) => (r.id ? teaching.find((t) => t.runId === r.id) : undefined);

  return { runs, audits, lessons, teaching, auditFor, lessonFor, verdictOf, teachFor };
}

// Embed small images, link large ones. A continuous-tone screenshot is ~45x bigger than a
// flat-UI one; a hard cap that returns null turns a size limit into a silently missing
// feature. Degrade, and say so.
export const EMBED_CAP = 900_000;
export function makeShotSrc() {
  const state = { linked: 0 };
  const src = (p) => {
    try {
      if (!p || !fs.existsSync(p)) return null;
      const b = fs.readFileSync(p);
      if (b.length <= EMBED_CAP) return `data:image/png;base64,${b.toString('base64')}`;
      state.linked++;
      return p.split(path.sep).join('/');
    } catch { return null; }
  };
  return { src, state };
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Pair each run with the previous run of the SAME target — the meaningful baseline.
export function pairSteps(runs, verdictOf, auditFor, lessonFor, teachFor) {
  return runs.map((r, i) => ({
    run: r,
    prev: [...runs.slice(0, i)].reverse().find((p) => p.target === r.target),
    idx: i + 1,
    verdict: verdictOf(r),
    audit: auditFor(r),
    lesson: lessonFor(r),
    teach: teachFor ? teachFor(r) : undefined,
  }));
}

// The six dimensions of complete, seasoned design feedback. `evidence` and `acceptance`
// were added after both turned out to be the habitual misses — evidence is the stated goal,
// and acceptance (a testable done-condition) was absent from every single piece of feedback.
export const AXES = ['mechanism', 'evidence', 'constraint', 'open_space', 'acceptance', 'actionable'];
// A score invites optimising the number; a next-action invites practising the skill.
// Every dimension therefore maps to an imperative you can actually rehearse on the next
// piece of feedback, and the surface leads with that instead of a tally.
export const AXIS_PRACTICE = {
  mechanism:  'name the property, not the reaction',
  evidence:   'measure or cite one thing before asserting',
  constraint: 'add one bound the solution must respect',
  open_space: 'state the problem, let them pick the fix',
  acceptance: 'say how you would know it worked',
  actionable: 'make it actionable without a follow-up question',
};

// Weakest dimension = what to practise next. Prefer the judge's own `gap` call; fall back
// to the first unmet dimension in rubric order.
export function practiceNext(fb) {
  if (!fb?.rubric) return null;
  const named = AXES.find((a) => fb.gap && fb.gap.toLowerCase().startsWith(a.replace('_', ' ')));
  const axis = named || AXES.find((a) => fb.rubric[a] === 'no') || AXES.find((a) => fb.rubric[a] === 'partial');
  return axis ? { axis, imperative: AXIS_PRACTICE[axis] } : null;
}

export const AXIS_HELP = {
  mechanism:  'names what is structurally wrong',
  evidence:   'a measurement, standard, or observation. Not assertion',
  constraint: 'bounds the solution',
  open_space: 'leaves the HOW open',
  acceptance: 'a testable done-condition',
  actionable: 'no clarifying question needed',
};
