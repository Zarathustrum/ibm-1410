// src/core/compare.ts — `C` Compare: collate two fields, set the four compare latches.
// Source: docs/plans/phase-1-cpu-core.md §5 Wave 5; docs/plans/architecture.md §4.6, §8 tier 1.
//
// The whole of the printed rule, from research/opcodes.md §5.2 and research/charset.md §4.1
// (both A22-0526-3 p.28, cross-checked against 223-2588-2 "Brief Op Code Descriptions"):
//
//   - "Compares B to A, never A to B." HIGH means the B field collates ABOVE the A field.
//     Nothing here is symmetric, and the direction is the single fact a Compare emulator is
//     most likely to get backwards, so it is stated once, here, and asserted by name in
//     test/compare.test.ts.
//   - "All BA8421 bits are compared, but not C bits or word marks" — verbatim, p.28. So the
//     ordering is the 64-entry COLLATING RANK of research/charset.md §4 (`bcd.ts collateRank`),
//     not the numeric value of the six-bit code and not a numeric-only comparison. Zones are
//     ordinary collating value: the PoO's own example 6 compares B-field `444444M` HIGH against
//     A-field `444444D` even though `M` carries a minus zone — `M` is rank 39, `D` is rank 29,
//     and the sign plays no part (A22-0526-3 p.29). There is no sign stripping anywhere in this
//     file, and neither field is written.
//   - "Terminated by an A-field or a B-field word mark" — EITHER, whichever is sensed first.
//     The marked position is the field's high-order character and is itself compared.
//   - The short-A rule below.
//
// Right to left from the units position, which is what both address columns name: the `C` row's
// registers-after are `NSI / A-LW / B-LW`, and a DECREASING pair of address registers is only
// consistent with a right-to-left scan (research/opcodes.md §2 p.28, §1.3 Figure 8).

import { collateRank } from './bcd.js';
import { BCD6, WM, type ExecContext } from './types.js';

/**
 * The short-A rule, encoded UNCONDITIONALLY: whenever the A-field word mark is sensed while the
 * B field is still running, the operation ends with HIGH on — whatever the positions actually
 * compared said. 223-2588-2 "Brief Op Code Descriptions", Comparing row, verbatim: "Operation is
 * terminated by either an A-fd or B-fd word mark. If A-fd is shorter than B-fd, A-fd must have
 * WM. In this case Hi-ind is on." A22-0526-3 p.28 states it the same way, with no condition on
 * the portion compared (research/charset.md §4.1). It is also the reading the plan's tier-1
 * example fixes: "short-A turns HIGH on EVEN WHEN the compared portion is equal"
 * (docs/plans/architecture.md §8).
 *
 * OPEN: neither source says what happens when the compared portion was LOW and the A field then
 * runs out first — "Hi-ind is on" is printed without a qualifier, so HIGH wins and LOW goes off,
 * which is what the four latches being one group means. The alternative reading (short A only
 * breaks a tie) would make the rule silent in exactly the case it is written for. Recorded as an
 * open item rather than a silent choice; open-questions.md, opcodes row.
 */
export const SHORT_A_TURNS_HIGH_ON = true;

/**
 * One `C aaaaa bbbbb`. Sets the four compare latches as a group and fills the Figure 8 length
 * symbols; touches no other latch and writes no storage.
 *
 * Length reporting follows `alu.ts`'s convention for the same reason: the machine stops at the
 * first word mark in EITHER field, so it never learns the length of the longer one, and the
 * number of positions it actually read is what `A-LW` / `B-LW` step back by and what the `C`
 * row's timing term `4.5(L+1+A+B)` charges for. LA, LB and LW are therefore all the count of
 * positions compared (research/opcodes.md §1.3, §2 p.28).
 *
 * A field with no word mark on either side has no stopping condition and walks down through
 * storage until the address register leaves installed storage, where `Storage.read` stops the
 * machine with an address check — the machine's own failure mode for the same program, and the
 * reason the manual makes the A-field word mark mandatory when A is the shorter field.
 */
export function compareFields(ctx: ExecContext): void {
  const s = ctx.storage;
  const aUnits = ctx.sym.A;
  const bUnits = ctx.sym.B;

  // The group resets here and equal starts ON; every unequal position turns it off for good
  // (research/opcodes.md §5.2, 223-2588-2 p.24). `indicators.ts` owns that rule.
  ctx.indicators.beginCompare();

  let compared = 0;
  let aRanOut = false;
  for (;;) {
    const aCell = s.read(aUnits - compared);
    const bCell = s.read(bUnits - compared);
    const a = collateRank(aCell & BCD6);
    const b = collateRank(bCell & BCD6);
    ctx.indicators.compareDigit(b === a ? 'equal' : b > a ? 'high' : 'low');
    compared++;

    const aWm = (aCell & WM) !== 0;
    const bWm = (bCell & WM) !== 0;
    if (aWm || bWm) {
      // A shorter than B: A's mark ended it while B still had high-order positions to give.
      aRanOut = aWm && !bWm;
      break;
    }
  }

  if (aRanOut && SHORT_A_TURNS_HIGH_ON) ctx.indicators.compareDigit('high');
  ctx.indicators.endCompare();

  ctx.sym.LA = compared;
  ctx.sym.LB = compared;
  ctx.sym.LW = compared;
}
