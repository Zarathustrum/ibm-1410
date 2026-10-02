// src/core/isa/exec/move.ts — Move/Scan, MCS and MCE executors.
//
// WAVE 5 builds `moveScan` (op `D`, all 64 d-characters). The whole operation lives in
// `../../move.ts`, which reads MOVE_PORTION_MASK / MOVE_DIRECTION / MOVE_REG_EFFECTS out of
// ../dmods.ts rather than switching on 64 d-characters; this file is the one-line seam between
// the table row and it, exactly as `wordmark.ts` is for `,` and `⌑`.
//
// Phase 1b Wave C builds `Z` (MCS) in `../../mcs.ts` and Wave D `E` (MCE) in `../../edit.ts`,
// which is the last row of the phase — no executor in this file is a stub any more.

import { moveEditFields } from '../../edit.js';
import { moveSuppressZerosFields } from '../../mcs.js';
import { moveOrScan } from '../../move.js';
import type { OpForm } from '../../types.js';

/**
 * `D` Move / Scan, all 64 d-characters — opcodes.md §2 pp.25-27, §3.
 *
 * The `D` row's `regs` column is `NSI / special / special`: `moveOrScan` sets AAR and BAR
 * itself from the eight Figure 20 rows (opcodes.md §3.3), because §2 prints only
 * "NSI / see §3.2" and one `RegTriple` cannot carry eight different results (plan §4.2). It
 * also leaves `sym.LA` / `LB` / `LW` holding the number of storage positions stepped, which is
 * what the row's `tMoveScan(L, LA, LB)` — `4.5(L+1+A+1.5B)` — counts.
 *
 * All three lengths land here: `D aaaaa bbbbb d` (12), `D aaaaa` (6, which chains the
 * B-address) and a bare `D` (1, which chains both). At 6 and 1 the decoder deliberately does
 * NOT write the op-modifier register, so the d-character is the one the previous operation left
 * there (decode.ts `applyFields`, A22-0526-3 p.12) — which is why this executor reads
 * `ctx.regs.opMod` and never the instruction image.
 */
export const moveScan: OpForm['exec'] = moveOrScan;

/**
 * `Z` Move Characters and Suppress Zeros — Phase 1b Wave C, opcodes.md §2 pp.27-28, §5.3. The
 * right-to-left copy and the left-to-right suppression pass live in `../../mcs.ts`, which shares
 * no code with `edit.ts` and is not meant to (phase-1b.md §3.5). Its row's registers are both
 * evaluable (`NSI / A−LA / B+1`), so unlike `moveScan` above this executor sets none itself.
 */
export const moveSuppressZeros: OpForm['exec'] = moveSuppressZerosFields;

/**
 * `E` Move Characters and Edit — Phase 1b Wave D, opcodes.md §2 pp.31-33, §7. The three-scan
 * ring, the two skid B-cycles and the four control latches live in `../../edit.ts`, which shares
 * no code with `mcs.ts` and is not meant to (phase-1b.md §3.5). It is a GENERATOR: one yield per
 * B-cycle, skids included, A-cycles folded in, so `Cpu.stepCycle()` can half-cycle the whole
 * edit (phase-1b.md §4 Wave D, §7). Its row's BAR is `'special'` — §7.3's eight cases — so that
 * one register is set inside the executor; IAR and AAR are evaluable and stay `isa/regs.ts`'s.
 */
export const moveEdit: OpForm['exec'] = moveEditFields;
