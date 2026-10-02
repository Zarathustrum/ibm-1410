// src/core/mcs.ts — `Z` Move Characters and Suppress Zeros: the copy pass and the suppression pass.
// Source: docs/plans/phase-1b.md §3.5 (the design), §4 Wave C (the vector list), §9 (the two
// named readings). Machine facts: research/opcodes.md §2 pp.27-28 and Figures 23-24 (the `Z`
// row), §5.3 (the per-op note and what no manual states), §1.3 (the Figure 8 register symbols);
// research/charset.md §1-§2 (the code points this file names by glyph).
//
// WHAT THIS SHARES WITH `E` MCE, AND WHAT IT DOES NOT (phase-1b.md §3.5). Shared: the IDEA of
// zero suppression and a blank fill. Not shared, so `mcs.ts` and `edit.ts` hold no common code:
// `Z` has no control word, no scan ring, no auto-set word mark, no skid cycles, no extension
// latch, no floating `$` and no decimal control, and its BAR is the evaluable `B + 1` where
// `E`'s is `'special'` over eight cases. Fusing the two would be the speculative abstraction the
// project rules forbid.
//
// The row, verbatim (§2 pp.27-28): "Moves A to B (A unchanged), then blanks high-order zeros and
// commas in B and strips the zone bits from the units (sign) position of B. Alphabetic and most
// special characters (e.g. @) count as non-significant, so suppression can restart to their
// right." Terminator, verbatim: "A-field word mark defines the length moved; B-field word marks
// inside the moved area, including its leftmost position, are removed."

import { BLANK } from './bcd.js';
import { BCD6, WM, ZA, ZB, type Addr, type Cell, type ExecContext, type Storage } from './types.js';

/** The two zone bits — the sign half of a stored character (research/charset.md §1). */
const ZONES = ZB | ZA;

// The code points this operation names by glyph rather than by class (research/charset.md §2;
// `bcd.ts` BCD_TABLE, which is the same transcription). `BLANK` — rank 00, no bits at all, and
// NOT the substitute blank — comes from `bcd.ts` itself rather than being re-declared here, so
// there is one transcription of it and the BLANK_TRAP note beside it stays the only one.
const ZERO = 0o12;      // rank 54, the digit zero: 8-2, not no-bits
const COMMA = 0o33;     // rank 14
const PERIOD = 0o73;    // rank 01
const MINUS = 0o40;     // rank 12

/**
 * OPEN: THE WALK ITSELF — `[likely]`, and the only reading consistent with the printed register
 * result. §5.3 states the problem in its own words: the manual "states the register results and
 * the suppression rules but never says in words that the A- and B-addresses are the units
 * positions and that the copy pass runs right-to-left". `AAR = A − LA` forces it — a DECREASING
 * address register is only consistent with a right-to-left pass, and a left-to-right move would
 * leave `A + LA` for every terminator in Figure 20. Behavioural corroboration is SimH
 * `i7010_cpu.c` `case OP_MSZ` alone, which `DownReg`s both registers on the copy pass and then
 * `UpReg`s BAR and scans forward; by METHOD.md that counts one tier below its stated label.
 *
 * So: a right-to-left copy from the units position, then a left-to-right suppression pass over
 * the B field, leaving `BAR = B + 1`. The `open-questions.md` row for this already exists — the
 * opcodes.md-section cpu row "MCS (op Z) scan direction and units addressing … `[likely]`" —
 * and carries this exact fallback, so NO NEW ROW IS ADDED for it (phase-1b.md §9).
 */
export const MCS_RIGHT_TO_LEFT_THEN_SUPPRESS = true;

/**
 * OPEN: `-` AND `.` PASS THROUGH THE SUPPRESSION PASS UNTOUCHED, and neither turns suppression
 * off. No edition of the Principles of Operation, the Nov-61 Reference Manual or the CE Handbook
 * says so: §2 names only zeros and commas as blanked and only "alphabetic and most special
 * characters" as non-significant, which leaves the minus sign and the decimal point unstated in
 * both directions. The single source is SimH `i7010_cpu.c` `case OP_MSZ`, which treats both as
 * pass-through, so this is `[unverified]` and the two glyphs are named here rather than folded
 * into a class. Flipping it would make `-` and `.` ordinary non-significant specials — left in
 * place either way, but restarting suppression to their right, which for a printed amount like
 * `123.45` would blank the cents. AND "PASS THROUGH" MEANS THROUGH THE SUPPRESSION PASS ONLY: the
 * unconditional zone strip below then rewrites whichever of the two ends up in the units position,
 * so a units `-` (octal 40, zone bits and nothing else) leaves as a BLANK and a units `.`
 * (octal 73) as octal 13, and that combined outcome is part of the reading recorded here — it is
 * pinned by a vector in `test/tier1-mcs.test.ts`, not by any manual.
 * `open-questions.md`, Phase 1b section; phase-1b.md §3.5, §9.
 */
export const MCS_PASSTHROUGH_CHARS = true;

/**
 * OPEN: A BLANK INSIDE THE MOVED AREA IS ONE OF THE SUPPRESSED CHARACTERS, NOT A NON-SIGNIFICANT
 * SPECIAL. §5.3's description of the only behavioural source there is — SimH `i7010_cpu.c`
 * `case OP_MSZ` — says it "scans forward suppressing zeros, BLANKS and commas, stopping
 * suppression at a significant digit": the blank sits in the same class as the zero and the
 * comma, so it is blanked while the latch is on (visually a no-op, a blank written over a blank)
 * and it does NOT turn suppression back on to its right. §2 pp.27-28 names only "zeros and
 * commas" as blanked and "alphabetic and most special characters" as non-significant, and says
 * nothing about the blank in either direction, so this is `[unverified]` — SimH and nothing else.
 *
 * What flipping it costs, in one vector: `1 05` stays `1 05` under this reading and becomes
 * `1  5` under the other, where the blank is an ordinary non-significant special that restarts
 * suppression and the `0` behind it is a high-order zero again.
 * `open-questions.md`, Phase 1b section; phase-1b.md §3.5, §9.
 */
export const MCS_BLANK_IS_SUPPRESSED = true;

/**
 * A SIGNIFICANT digit — one of `1`-`9` with no zone bits. Zero is not significant (it is what
 * the pass blanks), and a zoned digit is not one either: `J` is the alphabetic J to the print
 * chain and to the collating sequence alike, and §2 puts "alphabetic and most special
 * characters" on the non-significant side. That matters only at a units position carrying a
 * sign, which the zone strip below turns back into a bare digit after the rule has run.
 * research/charset.md §2: the digits `1`-`9` are octal 01-11 and `0` is octal 12.
 */
function isSignificantDigit(bcd6: number): boolean {
  return (bcd6 & ZONES) === 0 && bcd6 >= 0o01 && bcd6 <= 0o11;
}

/**
 * `Z aaaaa bbbbb`, all three lengths (opcodes.md §2 pp.27-28, §5.3).
 *
 * **Pass 1 — the copy, right to left from the units position** (MCS_RIGHT_TO_LEFT_THEN_SUPPRESS).
 * A is unchanged; the A-field word mark defines the length moved and its own position is moved
 * like every other. Every B position written is written UNMARKED: "B-field word marks inside the
 * moved area, INCLUDING ITS LEFTMOST POSITION, are removed" — the sentence is the whole of the
 * word-mark rule, and it is why nothing here ever passes `true` to `setChar`. The A word mark is
 * not carried across either; it is a terminator, not data.
 *
 * **Pass 2 — the suppression, left to right over B.** Blanks high-order zeros and commas; leaves
 * a significant digit and everything to its right alone; and — the sentence that makes this more
 * than a leading-zero loop — treats alphabetic and most special characters as NON-SIGNIFICANT,
 * "so suppression can restart to their right". Encoded as one latch: suppression starts on, a
 * significant digit `1`-`9` turns it off, and any non-significant character turns it back on, so
 * `10A05` leaves `10A 5` — the zero right of the `A` is a high-order zero again. `-` and `.`
 * pass through and change nothing (MCS_PASSTHROUGH_CHARS); a blank is suppressed rather than
 * non-significant, so it never turns the latch back on (MCS_BLANK_IS_SUPPRESSED).
 *
 * **The zone strip.** "Strips the zone bits from the units (sign) position of B." WHICH PASS it
 * belongs to is unstated — §2 groups it with the suppression rules rather than with the move, so
 * it is done here, and in the order §2 prints the two clauses: blank, THEN strip, over whatever
 * the suppression pass left in the units position. A signed `18J` therefore reads `181`. The one
 * case where the order shows is an all-zero signed field: `00?` is `  ?` after suppression (a
 * plus zero is not the digit zero, so it is a non-significant special, left alone) and `  0`
 * after the strip — a bare zero in the units rather than a wholly blank field. Stripping first
 * would blank it instead. JUDGEMENT CALL, from the printed clause order; nothing states it.
 *
 * **Indicators:** none — §2's row prints none, and nothing here touches a latch.
 * **Registers:** `NSI / A−LA / B+1`, BOTH EVALUABLE, so `isa/regs.ts` applies them from the
 * lengths below and this executor sets no register itself (phase-1b.md §3.5).
 *
 * Runs in a single E cycle: `Z` returns nothing, so `Cpu.stepCycle()` completes it in one press
 * (phase-1b.md §7 — the per-storage-cycle iterator is `@`'s and `E`'s requirement, not `Z`'s).
 */
export function moveSuppressZerosFields(ctx: ExecContext): void {
  const s: Storage = ctx.storage;
  const aUnits = ctx.sym.A;
  const bUnits = ctx.sym.B;

  // ── Pass 1: right to left from the units position, ending ON the A-field word mark ───────
  let length = 0;
  for (;;) {
    const cell: Cell = s.read(aUnits - length);
    s.setChar(bUnits - length, cell & BCD6, false);
    length++;
    if ((cell & WM) !== 0) break;      // the A-field word mark, at its leftmost position
  }

  // ── Pass 2: left to right over the moved area ────────────────────────────────────────────
  const bLeft: Addr = bUnits - length + 1;
  let suppressing = true;
  for (let p = bLeft; p <= bUnits; p++) {
    const c = s.read(p) & BCD6;

    if (c === PERIOD || c === MINUS) {
      // MCS_PASSTHROUGH_CHARS: undisturbed, and the latch is left exactly as it was.
    } else if (isSignificantDigit(c)) {
      suppressing = false;
    } else if (c === ZERO || c === COMMA || c === BLANK) {
      // The two characters §2 names by name, plus the blank §5.3's SimH description puts in the
      // same class (MCS_BLANK_IS_SUPPRESSED). None of the three is in §2's "alphabetic and most
      // special characters" class — that clause is the exception to this one, not a superset of
      // it — so one of them past a significant digit is left in place and does NOT restart
      // suppression. `1,000` reads `1,000` and `1 05` reads `1 05`; only `000,012` reads
      // `     12`. Blanking a blank is a no-op; it is written anyway so the class stays one rule.
      if (suppressing) s.setChar(p, BLANK, false);
    } else {
      // Everything else: alphabetic and most special characters count as non-significant, "so
      // suppression can restart to their right" (§2, the sentence that makes this more than a
      // leading-zero loop). The character itself is left alone.
      suppressing = true;
    }
  }

  // The units (sign) position, over whatever the pass above left there. The strip is
  // UNCONDITIONAL — §2's clause is written over the position, not over the class of character in
  // it — so a units `.`, `,` or `-` is transformed too, and a units `-` (B alone) comes out a
  // blank. Faithful to the letter of the clause; nothing states an exception for those glyphs.
  s.setChar(bUnits, s.read(bUnits) & BCD6 & ~ZONES, false);

  // Figure 8's three length symbols (§1.3). The A-field word mark defines the length moved, and
  // it is the same count for all three: LA is the A field, LB the B positions written, and LW
  // "whichever is shorter" — the operation reads and writes exactly `length` positions and never
  // learns of any B field beyond them. LA is also what the row's `4.5(L + 1 + 4A)` charges for.
  ctx.sym.LA = length;
  ctx.sym.LB = length;
  ctx.sym.LW = length;
}
