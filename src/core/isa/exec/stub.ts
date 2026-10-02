// src/core/isa/exec/stub.ts — the loud placeholder every not-yet-built Wave-0 executor
// points at.
//
// These never fire for an op whose table row says `implemented: false`: cpu.ts raises
// `UnimplementedOp` carrying the row's citation *before* it calls `exec`
// (docs/plans/phase-1-cpu-core.md §4.1). So a stub reaching a throw means a row claims
// Phase 1 implements the op while the wave that owed the executor has not landed — a
// build-order bug, not machine behaviour. A plain Error naming the op character is the
// right shape for that, and it keeps this file decoupled from checks.ts.

import type { ExecContext } from '../../types.js';

/** Executor placeholder. Wave N replaces the body in the grouped exec file, never in table.ts. */
export function notBuilt(op: string): (ctx: ExecContext) => never {
  return (): never => {
    throw new Error(`executor not built yet: ${op}`);
  };
}
