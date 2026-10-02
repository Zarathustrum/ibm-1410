// Tier 0 — the VERBATIM freeze on the three internals files no Phase-4 wave may touch.
// Phase-4 plan §3.1 (wave 0's file table), §3.6 (the reuse-verbatim rows), §13 criterion 3;
// docs/plans/architecture.md §6: "Phase 4 reuses these controls verbatim".
//
// ORCHESTRATOR RULING, WAVE 0 — case 2 is NOT the check the plan asked for, and this is why.
// §3.1 asked case 2 to assert `git diff --numstat` against `main` is empty for `controls.ts`,
// `coreView.ts` and `registerView.ts`. A test cannot shell out to git here: `tools/node-shims.d.ts`
// declares no `node:child_process`, and `tools/**` is do-not-touch for this phase (§3.7), so
// spawning git would cost a forbidden edit. Case 2 therefore pins the SHA-256 of `coreView.ts` and
// `registerView.ts` as literals computed on this tree — the same guarantee, for files no wave may
// touch — and `git diff --numstat <base>..HEAD -- src/ui/internals/{controls,panel,coreView,
// registerView}.ts` stays the ORCHESTRATOR's per-commit gate command (§13 criterion 3, §11 wave 0
// check (b)), where a shell is available and free.
//
// `panel.ts` is deliberately absent from this file: wave 1 folds sixteen lines out of it (§3.2),
// so a hash here would be red from the day wave 1 lands.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Hashed as BYTES, not as a decoded string, so a re-encoding is a failure and not a silent pass. */
const sha256 = (path: string): string =>
  createHash('sha256').update(readFileSync(join(REPO_ROOT, path))).digest('hex');

describe('Phase 4 §13 criterion 3 — the internals files the phase reuses verbatim', () => {
  it('src/ui/internals/controls.ts is byte-frozen at the plan’s SHA-256', () => {
    expect(sha256('src/ui/internals/controls.ts'))
      .toBe('a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f');
  });

  it('src/ui/internals/coreView.ts and registerView.ts are byte-frozen too', () => {
    expect(sha256('src/ui/internals/coreView.ts'))
      .toBe('7adff72167a43e59112d5a288cef31e0c74b742abdcd23034a991d98c7bdc309');
    expect(sha256('src/ui/internals/registerView.ts'))
      .toBe('3c20cfe7742f614bfc248a2df26ccf7612080cecb3161cc1584603c9100c16f5');
  });
});
