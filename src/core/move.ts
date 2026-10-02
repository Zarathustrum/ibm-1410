// src/core/move.ts — op `D` Move / Scan: all 64 d-characters, ONE function, two tables.
// Source: docs/plans/architecture.md §4.8; docs/plans/phase-1-cpu-core.md §4.2, §5 Wave 5.
// Machine facts: research/opcodes.md §3.1-§3.3 (A22-0526-3 pp.25-27, Figures 19, 20, 21, 22).
//
// There is no 64-way dispatch here and no switch on the d glyph, because the d-character is
// not an enumeration — it is two bit fields (opcodes.md §3.1, and SimH's own `op_mod & 070`):
//
//   d & 0x07   bits 4 / 2 / 1 — the PORTION of each A character that replaces the
//              corresponding portion of the B character. None of 4/2/1 set = SCAN: the
//              address registers are stepped and NO data is transferred.
//   d & 0x38   bits B / A / 8 — DIRECTION and TERMINATOR. Bit 8 set = left-to-right and the
//              two addresses are the LEFTMOST positions of their fields; bit 8 clear =
//              right-to-left and they are the RIGHTMOST.
//
// The eight rows of Figure 19 (direction + terminator) and the eight rows of Figure 20
// (registers after operation) are `MOVE_DIRECTION` and `MOVE_REG_EFFECTS` in `isa/dmods.ts`,
// keyed identically on `d & 0x38`. This file reads them; it does not restate them.
//
// `MOVE_PORTION`'s eight rows are deliberately NOT read here. The portion is three INDEPENDENT
// bits, so the code tests the bits; that table's columns are the Figure 21 mnemonic letters and
// the prose names — naming, not behaviour. They are still tied to this executor, through
// `test/move.test.ts`, which drives all 64 cases off the same prose in `oracle/dchar-matrix.json`
// (and `test/dmods.test.ts` ties that fixture to `MOVE_PORTION` row for row).
//
// THE SUBSTITUTE-BLANK TRAP applies to whoever ASSEMBLES the d-character, not to the decode
// here: octal 20 (the A bit alone) is the substitute blank `ƀ` and selects SCNLA — right to
// left, scan, stop at the A-field word mark — while a true blank, octal 00, is SCNLS, which
// scans exactly one position and stops. Two different instructions one keystroke apart
// (opcodes.md §3.2 note, research/charset.md §2, `isa/dmods.ts` SUBSTITUTE_BLANK_OCTAL).

import { checkAddress } from './address.js';
import {
  MOVE_DIRECTION,
  MOVE_DIRECTION_MASK,
  MOVE_PORTION_MASK,
  MOVE_REG_EFFECTS,
} from './isa/dmods.js';
import { evalReg } from './isa/regs.js';
import {
  BCD6, WM, ZA, ZB,
  type Addr, type AddressUse, type Cell, type ExecContext,
} from './types.js';

// ─── The portion field, `d & 0x07` (opcodes.md §3.1, Figure 19 p.25) ───────────────────────
const PORTION_NUMERIC = 0x01;
const PORTION_ZONE = 0x02;
const PORTION_WORD_MARK = 0x04;

/** The zone half and the numeric half of a stored character (research/charset.md §1). */
const ZONE_BITS = ZB | ZA;      // 0x30 — the B and A bits
const NUMERIC_BITS = 0x0f;      // the 8421 bits

// ─── The direction / terminator field, `d & 0x38` (same figure) ────────────────────────────
/** Bit 8. Set = left-to-right; clear = right-to-left. */
const DIRECTION_LEFT_TO_RIGHT = 0x08;
/** Bit A of the d-character: R→L "stop at the A-field word mark"; L→R "stop at an A-field record mark". */
const TERMINATE_ON_A = ZA;      // 0x10
/** Bit B of the d-character: R→L "stop at the B-field word mark"; L→R "stop at an A-field GM-WM". */
const TERMINATE_ON_B = ZB;      // 0x20

/**
 * The two characters the left-to-right terminators name. Both are ordinary 1410 codes
 * (research/charset.md §2 ranks 45 and 05), which is exactly why the GM-WM test is a test of
 * TWO things: a group mark alone does not stop a `MRnG`, only a group mark carrying a word
 * mark does (opcodes.md §3.1 "A-field group-mark-with-word-mark"). `insttest.cor` 02932 is the
 * case — its A field is `(v)AB(v)C(v)(gm)` and the group mark at 10557 carries a word mark.
 */
export const RECORD_MARK_BCD = 0o32;
export const GROUP_MARK_BCD = 0o77;

/**
 * OPEN: plan §10, "Per-d-character register effects for the 64 Move variants (Figure 20 cited,
 * only two rows captured in the original pass)" — `open-questions.md`, opcodes row. The chosen
 * fallback is the eight-row terminator/direction table of `opcodes.md` §3.3, held as
 * `MOVE_REG_EFFECTS`, VERIFIED against the Move matrix at `insttest.cor` 02800-02979
 * (`test/tier3-move.test.ts`). This constant is the switch the plan asked for: flipping it off
 * would leave the operation with no register result at all, which is why it is a `true` that
 * documents rather than a branch.
 */
export const MOVE_REGISTERS_FROM_FIGURE_20 = true;   // OPEN: open-questions.md opcodes row

/**
 * OPEN: THE WORD-MARK PORTION IS A COPY, NOT A SET — the clear half is undemonstrated.
 *
 * §3.1's verified sentence is only "only the selected portion of each A character replaces the
 * corresponding portion of the B character; the rest of the B character is unchanged"
 * (A22-0526-3 pp.25-26). Read as a copy, bit 4 makes the A character's word mark replace the B
 * character's, so it CLEARS a B word mark wherever the A position has none. SETTING is
 * demonstrated — `insttest.cor` 02836 is an `MLCWB` that carries an A word mark into an unmarked
 * B position — but no case in any oracle demonstrates the CLEAR, and "replaces" is equally
 * satisfiable by an OR that only ever sets. Flipping this to `false` would mean bit 4 ORs the A
 * word mark into B and never clears one. `open-questions.md`, opcodes row.
 */
export const MOVE_WORD_MARK_PORTION_IS_A_COPY = true;   // OPEN: open-questions.md opcodes row

/**
 * OPEN: Figure 20 prints `LA`, `LB` and `LW` in different rows, but the Figure 8 symbol set
 * (`opcodes.md` §1.3) defines them over FIELDS, and a Move has no field boundary except the one
 * its own terminator finds. We set all three to the number of storage positions the operation
 * stepped through, which is what each of the three means for the row that names it: the
 * terminator that stopped the operation IS the end of the field whose length that row prints.
 * All fifteen matrix cases at 02800-02979 agree, in both directions and for all four
 * right-to-left terminators (`test/tier3-move.test.ts`). It is also what Figure 7's timing
 * terms `A` and `B` count — one A cycle and one B cycle per position — so `tMoveScan` reads the
 * same two symbols.
 */
export const MOVE_LENGTHS_ARE_POSITIONS_STEPPED = true;   // OPEN: plan §10, Move row

/**
 * Does this position end the operation? Decided on the characters AS READ OUT, before anything
 * is stored — which matters, because a d whose portion includes the word mark (`MLCWB`, d = `P`,
 * `insttest.cor` 02836) OVERWRITES the very B word mark the terminator is looking for. Sensing
 * after the store would run such a move to an address check.
 *
 * Straight off Figure 19 p.25, as bits, in the figure's own two halves.
 */
function terminates(control: number, aCell: Cell, bCell: Cell): boolean {
  const onA = (control & TERMINATE_ON_A) !== 0;
  const onB = (control & TERMINATE_ON_B) !== 0;

  if ((control & DIRECTION_LEFT_TO_RIGHT) === 0) {
    // Right to left: "— = after one storage position · A = A-field word mark ·
    // B = B-field word mark · B A = first word mark sensed in either field".
    if (!onA && !onB) return true;
    return (onA && (aCell & WM) !== 0) || (onB && (bCell & WM) !== 0);
  }
  // Left to right: "8 = first word mark sensed in either field · A 8 = A-field record mark ·
  // B 8 = A-field group-mark-with-word-mark · B A 8 = A-field record mark OR GM-WM".
  if (!onA && !onB) return ((aCell | bCell) & WM) !== 0;
  const aBcd = aCell & BCD6;
  return (onA && aBcd === RECORD_MARK_BCD)
    || (onB && aBcd === GROUP_MARK_BCD && (aCell & WM) !== 0);
}

/** Figure 20 carries no `'special'` row; this narrows `evalReg` without inventing a case. */
function addrOf(value: Addr | 'special'): Addr {
  if (value === 'special') throw new Error('op D: Figure 20 row evaluated to `special`');
  return value;
}

/**
 * Op `D`, all 64 d-characters — `opcodes.md` §2 pp.25-27 / §3, A22-0526-3 Figures 19-22.
 *
 * "Only the selected portion of each A character replaces the corresponding portion of the B
 * character; the rest of the B character is unchanged. The position holding the terminating
 * character is moved/replaced like every other position" (§3.1, A22-0526-3 pp.25-26). Both
 * halves of that sentence are load-bearing and both are asserted:
 *
 *  · THE PARTIAL WRITE. Every store goes through `storage.setChar`, which recomputes the C bit
 *    from the data bits and the word mark it is given — parity is odd over BA8421 + WM + C
 *    (research/architecture.md §2, A22-0526-3 p.5). So a zone-only move (`MLZB`, 02812) that
 *    turns `0` into `?` and a word-mark-portion move that turns a marked position into an
 *    unmarked one both leave a valid character behind, with no separate parity step.
 *  · THE WORD-MARK PORTION IS A COPY, NOT A SET — the SET half verified, the CLEAR half the
 *    chosen fallback. Bit 4 makes the A character's word mark replace the B character's, so it
 *    clears a B word mark wherever the A position has none. See
 *    `MOVE_WORD_MARK_PORTION_IS_A_COPY` above for what the manual does and does not demonstrate.
 *  · A SCAN WRITES NOTHING AT ALL. With no 4/2/1 bit "the address registers are stepped, no
 *    data is transferred" (§3.1), so the B position is not even rewritten with its own bits —
 *    which would silently repair a parity-invalid cell and make `checkParity` a liar.
 *
 * The loop's only bound is storage: an operation whose terminator is never sensed walks to the
 * end of installed core (or, decrementing, into 00000) and stops with an ADDRESS CHECK, exactly
 * as the machine does — `checkAddress` is on both cursors, both directions
 * (research/architecture.md §4, A22-0526-3 p.8).
 *
 * AAR and BAR are set HERE, not by `isa/regs.ts`: the `D` row's `regs` column reads
 * `special / special` because §2 prints only "NSI / see §3.2" — the effect is per-d and one
 * `RegTriple` cannot say eight different things (plan §4.2). The eight Figure 20 expressions
 * are still evaluated by the same `evalReg` every other row uses, so the notation on the page
 * and the notation in the code stay the same notation.
 */
export function moveOrScan(ctx: ExecContext): void {
  const d = ctx.regs.opMod & BCD6;
  const portion = d & MOVE_PORTION_MASK;
  const control = d & MOVE_DIRECTION_MASK;

  const dir = MOVE_DIRECTION.find((r) => r.key === control);
  const effect = MOVE_REG_EFFECTS.find((r) => r.key === control);
  if (dir === undefined || effect === undefined) {
    throw new Error(`op D: no Figure 19/20 row for d & 0x38 = ${control}`);
  }

  const s = ctx.storage;
  const step = dir.direction === 'L→R' ? 1 : -1;
  const use: AddressUse = step === 1 ? 'increment' : 'decrement';
  let a = ctx.sym.A;
  let b = ctx.sym.B;
  let stepped = 0;

  for (;;) {
    const aCell = s.read(a);
    const bCell = s.read(b);
    const last = terminates(control, aCell, bCell);

    if (portion !== 0) {
      const zoneFrom = (portion & PORTION_ZONE) !== 0 ? aCell : bCell;
      const numericFrom = (portion & PORTION_NUMERIC) !== 0 ? aCell : bCell;
      const wmFrom = (portion & PORTION_WORD_MARK) !== 0 ? aCell : bCell;
      s.setChar(b, (zoneFrom & ZONE_BITS) | (numericFrom & NUMERIC_BITS), (wmFrom & WM) !== 0);
    }
    stepped++;
    if (last) break;

    a = checkAddress(s, a + step, use);
    b = checkAddress(s, b + step, use);
  }

  // See MOVE_LENGTHS_ARE_POSITIONS_STEPPED above: the three Figure 8 length symbols coincide
  // for `D`, and Figure 7's `A` and `B` timing terms are the same count.
  ctx.sym.LA = stepped;
  ctx.sym.LB = stepped;
  ctx.sym.LW = stepped;

  ctx.regs.aar = addrOf(evalReg(effect.aar, ctx.sym));
  ctx.regs.bar = addrOf(evalReg(effect.bar, ctx.sym));
}
