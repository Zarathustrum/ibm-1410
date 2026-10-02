// src/core/cycles.ts — instruction timing for the BASE MACHINE.
//
// ── The Accelerator trap ───────────────────────────────────────────────────
// A22-0526-3 pp.96-98 is the alphabetic timing appendix for the 1410 ACCELERATOR, not
// for the base machine. The Accelerator drops the core cycle from 4.5 µs to 4.0 µs, so
// that appendix prints `T = 4(L+1+C)` for a conditional branch where the base machine's
// own instruction description gives `4.5(L+1+C)`; likewise `4(L+2.5+C)` vs `4.5(L+2.5+C)`
// and `44 + I/O` vs `49.5 + I/O`. Mixing the two sets is silent. Everything in this file
// is the base machine: CYCLE_US = 4.5, formulas transcribed from the per-op T column of
// opcodes.md §2, E from Figure 7 (opcodes.md §1.5). See opcodes.md §1.5 and
// docs/plans/phase-1-cpu-core.md §4.3.
//
// Terms are Figure 7's own letters (opcodes.md §1.5):
//   A / B  A-field / B-field length      C  1 if the branch is taken, else 0
//   D      chars from start of zero suppression to the `$` insert point (MCE)
//   E      see eTerm() below            I/O  device + 1414 synchronizer time
//   L      instruction length            M  multiplier length
//   N      fields actually compared on a table search      Q  quotient length
//   R      1 if a recomplement is taken on an add/subtract, else 0
//   Z      chars from start of zero suppression to the left end of the B field
//
// Wave 0 has no executor producing R, M, N, Q, Z or D. Table rows pass 0 for those and
// say so at the call site; the formula itself is complete here so the later wave only
// has to supply the term.

import type { ExecContext } from './types.js';

/** Basic core-storage cycle, base machine. A22-0526-3 p.12 / opcodes.md §1.5. */
export const CYCLE_US = 4.5;

/**
 * Added once PER ADDRESS INDEXED, base machine (the Accelerator figure is 30.67, which
 * we do not model). A22-0526-3 p.15 / research/architecture.md §5.
 */
export const INDEX_US = 34.5;

/**
 * The `I/O` term of `49.5 + I/O` and `13.5 + I/O`. ZERO in Phase 1. This is NOT a claim
 * that a 1415 write is free: the console prints at 932 char/min and that device time is
 * simply not modelled (opcodes.md §1.5, plan §4.3). Phase 2 gives each device its own
 * term; until then every I/O instruction costs its CPU cycles only.
 */
export const IO_TERM_US = 0;

// ── Constant-timing ops: table values, not formulas (opcodes.md §2) ────────
/** `G ccccc d` Store Address Register — `T = 69.75`. A22-0526-3 p.22. */
export const T_STORE_ADDRESS_REGISTER_US = 69.75;
/** `.` Halt at L=1 — `T = 4.5`. A22-0526-3 p.23. */
export const T_HALT_US = 4.5;
/** `. iiiii` Halt and Branch at L=6 — `T = 36`. A22-0526-3 p.23. */
export const T_HALT_AND_BRANCH_US = 36;
/** `F` / `2` Carriage Control — `13.5`. A22-0526-3 pp.80-81. */
export const T_CARRIAGE_US = 13.5;
/** `K` / `4` Select Stacker and Feed — `13.5 + I/O`. A22-0526-3 pp.62-63. */
export const T_SELECT_STACKER_US = 13.5 + IO_TERM_US;

// OPEN: opcodes.md §2 `Y` row — "not stated in A22-0530-1" [unverified]. No timing for
// Priority Test and Branch exists in any source we have read. Fallback 0; the op is
// implemented: false / feature: 'priority', so this value is never added to a run.
// open-questions.md, opcodes row.
export const Y_TIMING_US = 0;

// OPEN: opcodes.md §2 `P` / `Q` rows print "—" for timing; the MICR feature ops are known
// only from the C28-0309-1 Autocoder mnemonic table [likely]. Fallback 0; both rows are
// implemented: false / feature: 'micr'.
export const MICR_TIMING_US = 0;

// OPEN: opcodes.md §2 `$` and `=` rows print "—". Neither is a 1410 instruction (§9.3);
// they exist in the table only so decode can reject them. Fallback 0.
export const SEVEN_OH_TEN_TIMING_US = 0;

/** L, the instruction length in characters — what every formula below takes first. */
export function instrLength(ctx: ExecContext): number {
  return ctx.fetched.chars.length;
}

/**
 * Figure 7's `E` term, keyed on (op, length) — opcodes.md §1.5, cross-checked against the
 * per-length table in §1.4:
 *   2 — single-character multiply or divide (`@` `%` at L=1: a D cycle AND THEN a C cycle)
 *   1 — single-character add, subtract, zero-and-add, zero-and-subtract or table lookup,
 *       or a 6-character multiply or divide
 *   0 — otherwise
 * A blanket "E=1 for any chained arithmetic op" leaves chained `@`/`%` one cycle short
 * (plan §4.3, §10).
 */
export function eTerm(opChar: string, length: number): 0 | 1 | 2 {
  if (length === 1 && (opChar === '@' || opChar === '%')) return 2;
  if (length === 6 && (opChar === '@' || opChar === '%')) return 1;
  if (
    length === 1 &&
    (opChar === 'A' || opChar === 'S' || opChar === '?' || opChar === '!' || opChar === 'T')
  ) {
    return 1;
  }
  return 0;
}

// ── The per-row T formulas of opcodes.md §2, one function per printed formula ──

/** `A` `S` at L=1 or 11 — `4.5(L+1+E+A+1.5B+1.5RB)`. A22-0526-3 p.17. */
export function tTwoFieldArith(L: number, E: number, A: number, B: number, R: number): number {
  return CYCLE_US * (L + 1 + E + A + 1.5 * B + 1.5 * R * B);
}

/** `?` `!` at L=1 or 11 — `4.5(L+1+E+A+1.5B)`. A22-0526-3 p.18. */
export function tZeroArith(L: number, E: number, A: number, B: number): number {
  return CYCLE_US * (L + 1 + E + A + 1.5 * B);
}

/**
 * `A` `S` `?` `!` at L=6 (one field, address-double) — `4.5(L+1+A+1.5A)`.
 * A22-0526-3 pp.17-19. The printed One-Field line carries `L = 1 or 6` and no E term;
 * the `or 1` is editorial carryover and a chained arithmetic op uses the TWO-field
 * formula with L=1 and E from Figure 7 instead (opcodes.md §1.4 caveat, plan §10).
 */
export function tOneFieldArith(L: number, A: number): number {
  return CYCLE_US * (L + 1 + A + 1.5 * A);
}

/** `@` Multiply — `≈4.5[L+1+E+2.5M+(2.5M+1.5)(2.5A+3)]`. A22-0526-3 pp.19-20. */
export function tMultiply(L: number, E: number, A: number, M: number): number {
  return CYCLE_US * (L + 1 + E + 2.5 * M + (2.5 * M + 1.5) * (2.5 * A + 3));
}

/** `%` Divide — `≈4.5{L+1+E+6.5Q[A+1.5(A+2)]}`. A22-0526-3 pp.20-21. */
export function tDivide(L: number, E: number, A: number, Q: number): number {
  return CYCLE_US * (L + 1 + E + 6.5 * Q * (A + 1.5 * (A + 2)));
}

/** `/` Clear Storage at L=1 or 6 — `4.5(L+1+B)`. A22-0526-3 p.23. */
export function tClearStorage(L: number, B: number): number {
  return CYCLE_US * (L + 1 + B);
}

/** `/` Clear Storage and Branch at L=11 — `4.5(L+2+B)`. A22-0526-3 p.23. */
export function tClearStorageAndBranch(L: number, B: number): number {
  return CYCLE_US * (L + 2 + B);
}

/** `T` Table Lookup — `4.5(L+1+B+NA)`. A22-0526-3 pp.29-30. */
export function tTableLookup(L: number, A: number, B: number, N: number): number {
  return CYCLE_US * (L + 1 + B + N * A);
}

/** `C` Compare — `4.5(L+1+A+B)`. A22-0526-3 p.28. */
export function tCompare(L: number, A: number, B: number): number {
  return CYCLE_US * (L + 1 + A + B);
}

/** `D` Move / Scan — `4.5(L+1+A+1.5B)`. A22-0526-3 pp.25-27. */
export function tMoveScan(L: number, A: number, B: number): number {
  return CYCLE_US * (L + 1 + A + 1.5 * B);
}

/** `Z` Move Characters and Suppress Zeros — `4.5(L+1+4A)`. A22-0526-3 pp.27-28. */
export function tMoveSuppressZeros(L: number, A: number): number {
  return CYCLE_US * (L + 1 + 4 * A);
}

/** `E` Move Characters and Edit — `4.5(L+1+A+1.5B+1.5Z+1.5D)`. A22-0526-3 pp.31-33. */
export function tEdit(L: number, A: number, B: number, Z: number, D: number): number {
  return CYCLE_US * (L + 1 + A + 1.5 * B + 1.5 * Z + 1.5 * D);
}

/** `,` Set Word Mark and `⌑` Clear Word Mark — `4.5(L+4)`. A22-0526-3 p.22. */
export function tWordMark(L: number): number {
  return CYCLE_US * (L + 4);
}

/** `N` No Operation — `4.5(L+1)`. A22-0526-3 p.24. */
export function tNoOp(L: number): number {
  return CYCLE_US * (L + 1);
}

/** `J` Branch Unconditionally — `4.5(L+2)`. A22-0526-3 p.36. */
export function tBranchUnconditional(L: number): number {
  return CYCLE_US * (L + 2);
}

/**
 * `J` conditional, `R`, `X` — `4.5(L+1+C)`. A22-0526-3 pp.36-37.
 * NOT `4(L+1+C)`: that is the Accelerator appendix. See the header.
 */
export function tBranchTaken(L: number, C: number): number {
  return CYCLE_US * (L + 1 + C);
}

/** `B` `W` `V` (one-character tests) — `4.5(L+2.5+C)`. A22-0526-3 pp.37-39. */
export function tBranchOneChar(L: number, C: number): number {
  return CYCLE_US * (L + 2.5 + C);
}

/** `M` / `L` against card, print or console — `49.5 + I/O`. A22-0526-3 pp.40-41. */
export function tIoRecord(): number {
  return 49.5 + IO_TERM_US;
}

/**
 * `M` / `L` against tape, and `U` Unit Control — `.0045(L+1) + Tm` MILLISECONDS
 * (A22-0526-3 pp.85-86, Figure 97). `.0045 ms` is `4.5 µs`, so the CPU part is exactly
 * `CYCLE_US(L+1)`; `Tm` is tape motion time, passed here in ms and 0 in Phase 1 because
 * tape is out of scope. Returns µs like everything else in this file.
 */
export function tTapeRecord(L: number, tapeMotionMs: number): number {
  return CYCLE_US * (L + 1) + tapeMotionMs * 1000;
}
