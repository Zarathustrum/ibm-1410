// src/core/isa/exec/arith.ts — arithmetic, table lookup and compare executors.
//
// Wave 3 built `A` and `S`, Wave 6 `?` and `!`, Phase 1b Wave B `@` and `%` and Wave C `T`.
// Every row this file names is now built. Waves replace the bodies here and never touch
// table.ts, so there is one named export per opcodes.md §2 ROW whose behaviour differs: `add2`
// is the two-field `A` at L=1 or 11, `add1` is the address-double one-field `A` at L=6.
//
// `T` (Table Lookup) and `C` (Compare) live here rather than in a file of their own: both
// are collate-and-branch-on-the-compare-latches operations sharing the four compare
// latches with `B`, and Figure 7 groups `T` with `A S ? !` for the E term (E=1 at L=1).

import { addToStorage } from '../../alu.js';
import { compareFields } from '../../compare.js';
import { divideFields, multiplyFields } from '../../muldiv.js';
import { tableLookupFields } from '../../tablelookup.js';
import type { ExecContext, LatchTraceRecord, OpForm } from '../../types.js';

/**
 * Waves 3 and 6. All eight rows are the same documented pass — units / body / extension scan
 * phases over storage, right to left from the units position (research/architecture.md §10;
 * opcodes.md §4.3) — differing only in whether the A digits are ADDED to B or STORED into it
 * (`mode`), whether the A sign is inverted first (`S`, `!`) and whether the field operates on
 * itself (the address-double 6-character form, opcodes.md §1.4).
 *
 * The pass is returned as a GENERATOR rather than run here: one yield is one storage cycle, so
 * `stepCycle()` can half-cycle it (plan §6.2, §8 demo 2). `ctx.traceLatch` is present only when a
 * level-3 tracer is attached, and without it the pass yields `undefined` and builds no record.
 */
function pass(
  ctx: ExecContext, mode: 'add' | 'zero', subtract: boolean, oneField: boolean,
): Iterator<LatchTraceRecord | undefined> {
  return addToStorage(ctx, { mode, subtract, oneField, emit: ctx.traceLatch });
}

// `A` — opcodes.md §2 p.17 (two fields, L=1/11) and pp.17-18 (one field, L=6)
export const add2: OpForm['exec'] = (ctx) => pass(ctx, 'add', false, false);
export const add1: OpForm['exec'] = (ctx) => pass(ctx, 'add', false, true);

// `S` — opcodes.md §2 p.17 / p.18. "A-field sign is inverted first, then the add-cycle table
// (§4.3) applies", which is the whole of the difference from `A`.
export const subtract2: OpForm['exec'] = (ctx) => pass(ctx, 'add', true, false);
export const subtract1: OpForm['exec'] = (ctx) => pass(ctx, 'add', true, true);

// `?` Zero and Add — opcodes.md §2 p.18 (two fields, L=1/11; one field, L=6). "Numeric data of A
// stored into B with A's sign; zone bits stripped from all B positions except the sign; a plus
// sign not already B+A is rewritten as B+A." The one-field form is the same pass with the field
// as its own B, which is why §2 can describe it as leaving "numeric data unchanged" while still
// re-coding blanks and 8-bit specials: every position goes through the same digit coding (§4.2).
export const zeroAdd2: OpForm['exec'] = (ctx) => pass(ctx, 'zero', false, false);
export const zeroAdd1: OpForm['exec'] = (ctx) => pass(ctx, 'zero', false, true);

// `!` Zero and Subtract — opcodes.md §2 p.18 / p.19. Identical to `?` but for the sign, which
// comes from the Figure 13 map (§4.4 pp.18-19) — `alu.ts` `zeroSubtractSign`.
export const zeroSubtract2: OpForm['exec'] = (ctx) => pass(ctx, 'zero', true, false);
export const zeroSubtract1: OpForm['exec'] = (ctx) => pass(ctx, 'zero', true, true);

/**
 * `@` Multiply and `%` Divide — Phase 1b Wave B, opcodes.md §2 pp.19-21, §4.5, §4.6. The whole
 * of both operations lives in `../../muldiv.ts`, which walks the windows the digit-group and
 * divide-step algorithms ask for and does every add and subtract through `alu.ts`'s `addPass`;
 * this file is the one-line seam between the table rows and it, as it is for `C` below.
 *
 * `@` returns a GENERATOR — one yield per storage cycle, so MODE = I/E CYCLE can half-cycle a
 * multiply (phase-1b.md §7) — while `%` develops its whole quotient in a single E cycle.
 */
export const multiply: OpForm['exec'] = multiplyFields;
export const divide: OpForm['exec'] = divideFields;

/**
 * `T` Table Lookup — Phase 1b Wave C, opcodes.md §2 pp.29-30, §5.1. The whole search — the
 * C-address reload at the start of every search cycle, the per-field compare over `bcd.ts`'s
 * `collateRank`, the three-bit d mask and the end-of-table HIGH — lives in `../../tablelookup.ts`,
 * which deliberately does NOT reuse `compare.ts` (phase-1b.md §3.4). This file is the one-line
 * seam between the table row and it, as it is for `@`, `%` and `C`.
 */
export const tableLookup: OpForm['exec'] = tableLookupFields;

/**
 * `C` Compare — opcodes.md §2 p.28, §5.2 (Wave 5). The whole pass, the collating order it walks
 * and the short-A rule live in `compare.ts`; this row's register column (`NSI / A-LW / B-LW`)
 * and its timing term `4.5(L+1+A+B)` are the table's, and both read the LA/LB/LW the pass fills.
 * All three `C` lengths — 11, the 6-character form that chains the B-address, and the chained
 * 1-character form — are the same operation on whatever AAR and BAR hold.
 */
export const compare: OpForm['exec'] = compareFields;
