// src/core/isa/exec/wordmark.ts — word-mark and clear-storage executors.
//
// WAVE 1 builds all six `,` / `⌑` forms; WAVE 3 adds `clear` / `clearBranch`, op `/` (Clear
// Storage / Clear Storage and Branch). They are not word marks, but `/` clears data AND word
// marks, which is why they sit here.
//
// `,` and `⌑` each get THREE named exports because opcodes.md §2 prints three distinct
// register results per form (two-address, one-address, chained) and the chained form's
// `Ap-1` / `Bp-1` is a different operation from `A-1` / `B-1`.
//
// Every mark goes through `storage.setWm`, which flips the C bit: the word mark participates
// in the odd-parity total, so setting or clearing one inverts the check bit and leaves the
// data bits alone (research/architecture.md §2, A22-0526-3 p.5). "Data characters
// undisturbed" (opcodes.md §2 p.22) is about the BA8421 bits, not the byte.

import type { ExecContext, OpForm } from '../../types.js';

/**
 * Two addresses, length 11 — `, aaaaa bbbbb`: mark BOTH the A and the B location
 * (opcodes.md §2 p.22, registers `NSI / A-1 / B-1`).
 */
function markTwo(ctx: ExecContext, on: boolean): void {
  ctx.storage.setWm(ctx.sym.A, on);
  ctx.storage.setWm(ctx.sym.B, on);
}

// `,` Set Word Mark — opcodes.md §2 p.22
export const setWm2: OpForm['exec'] = (ctx) => markTwo(ctx, true);

/**
 * One address, length 6 — `, aaaaa`: mark A only. `,` is an address-double op code
 * (opcodes.md §1.4), so read-out has already loaded the single address into AAR, BAR, CAR and
 * DAR alike, "so that if a WM is read out at I ring 6 time, the single address is used as both
 * the A and B field addresses" (223-2589 p.52) — B and A are the same position and marking it
 * once is the whole instruction. Registers `NSI / A-1 / A-1`.
 */
export const setWm1: OpForm['exec'] = (ctx) => {
  ctx.storage.setWm(ctx.sym.A, true);
};

/**
 * Chained, length 1 — `,` alone: mark the addresses the PREVIOUS operation left in AAR and BAR
 * (opcodes.md §2 p.22, registers `NSI / Ap-1 / Bp-1`). A 1-character instruction assigns no
 * fields, so `Ap`/`Bp` and `A`/`B` are the same two values here; the executor uses the symbols
 * the manual's register column names.
 */
export const setWmChained: OpForm['exec'] = (ctx) => {
  ctx.storage.setWm(ctx.sym.Ap, true);
  ctx.storage.setWm(ctx.sym.Bp, true);
};

// `⌑` Clear Word Mark — opcodes.md §2 p.22. "Same three forms and same register results as Set
// Word Mark; clears the word mark if present, data undisturbed."
export const clearWm2: OpForm['exec'] = (ctx) => markTwo(ctx, false);

export const clearWm1: OpForm['exec'] = (ctx) => {
  ctx.storage.setWm(ctx.sym.A, false);
};

export const clearWmChained: OpForm['exec'] = (ctx) => {
  ctx.storage.setWm(ctx.sym.Ap, false);
  ctx.storage.setWm(ctx.sym.Bp, false);
};

// ═══ `/` Clear Storage — opcodes.md §2 p.23 (A22-0526-3) ══════════════════

/**
 * The clearing action both `/` rows share. `storage.clearToHundreds` owns the loop and the
 * boundary rule — "clears data AND word marks right-to-left from the B address down to and
 * including the nearest hundreds position", so `/ 12590` clears 12590-12500 — and returns
 * `bbb00-1`, the value §2 prints for BAR. Clearing the 00000-00099 block is NOT an address
 * check: the clear terminates ON the boundary, and with `bbb = 000` the returned BAR is the
 * five-digit register wrap `CLEAR_STORAGE_BAR_AT_00000` = 99999, which `storage.ts` documents
 * and CC01A's `/ 00000` at 03436 requires.
 *
 * Returns `bbb00-1`, and leaves `ctx.sym.LB` holding the number of positions cleared — which is
 * the `B` term of this op's Figure 7 timing formula `4.5(L+1+B)` (cycles.ts `tClearStorage`).
 * The count is taken from the B-address itself rather than from the returned BAR, because at
 * `bbb = 000` that BAR has wrapped and `from - boundary` would be nonsense.
 */
function clearToBoundary(ctx: ExecContext): number {
  const from = ctx.sym.B;
  ctx.sym.LB = (from % 100) + 1;                        // B down to bbb00, inclusive
  return ctx.storage.clearToHundreds(from);             // = bbb00 - 1
}

/**
 * `/ bbbbb` (L=6) and chained `/` (L=1) — opcodes.md §2 p.23, registers `NSI / B / bbb00-1`.
 *
 * The table row prints BAR as `'special'`, so THIS EXECUTOR sets `ctx.regs.bar` and `cpu.ts`
 * leaves it alone: `bbb00-1` is not expressible in the Figure 8 symbol set the `regs` column is
 * written in, and inventing a `RegExpr` member for one op would make the column stop matching
 * the printed page (plan §4.2). AAR is the table's `'B'` — the B-address itself, which at L=1 is
 * whatever BAR held ("chained form uses current BAR; AAR is not loaded and is undisturbed"),
 * captured into `ctx.sym.B` before this runs.
 */
export const clear: OpForm['exec'] = (ctx) => {
  ctx.regs.bar = clearToBoundary(ctx);
};

/**
 * `/ iiiii bbbbb` (L=11) Clear Storage and Branch — opcodes.md §2 p.23: "Same clearing action,
 * then unconditional branch to the I-address." Registers `NSIB / BI / NSIB`, so BAR here holds
 * the return address, NOT `bbb00-1` — the branch result overwrites the clear's.
 *
 * §2 prints no not-taken result and the row carries no `regsNotTaken`: the branch always
 * happens. The taken-branch model is the file-header one shared with `branch.ts` and
 * `haltBranch` (architecture.md §9 row C5, plan §4.1) — IAR = BI, AAR = BI, BAR = NSIB.
 */
export const clearBranch: OpForm['exec'] = (ctx) => {
  clearToBoundary(ctx);
  ctx.sym.BI = ctx.regs.aar;      // the I-address, decoded and indexed into AAR at read-out
  ctx.sym.NSIB = ctx.sym.NSI;
  ctx.branchTaken = true;
};
