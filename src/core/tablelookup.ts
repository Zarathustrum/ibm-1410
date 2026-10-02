// src/core/tablelookup.ts — `T` Table Lookup: the right-to-left table search and its four latches.
// Source: docs/plans/phase-1b.md §3.4 (the design), §4 Wave C (the vector list), §9 (the two
// named readings). Machine facts: research/opcodes.md §2 pp.29-30 (the `T` row), §5.1 (the
// per-op notes and the C-address reload), §5.2 (the collating rule and the sticky-equal rule),
// §8 (the four compare latches), §1.3 (the Figure 8 register symbols), §1.5 (Figure 7's `N`);
// research/charset.md §2, §4 (the collating sequence `collateRank` holds).
//
// COMPARE.TS IS NOT TOUCHED, AND THAT IS A DECISION, NOT AN OVERSIGHT (phase-1b.md §2, §3.4).
// `compareFields` takes no window — it reads `ctx.sym.A`/`ctx.sym.B` directly — terminates on a
// word mark in EITHER field, applies the unconditional `SHORT_A_TURNS_HIGH_ON` rule, drives
// `beginCompare`/`compareDigit`/`endCompare` itself, returns nothing and overwrites LA/LB/LW.
// `T` needs every one of those differently, once per table field. Generalising it into a shared
// `compareWindow` would edit a file no wave of this phase owns to save a dozen lines, so this
// file walks its own window with `collateRank` from `bcd.ts` — already exported, and already the
// collating order `compare.ts` itself uses: all BA8421 bits, no C bit, no word mark (§5.2).
//
// THE FIELD LAYOUT, from the row verbatim (§2 pp.29-30):
//
//     search argument              the table, searched RIGHT TO LEFT
//     [ 2 0 0 ]                    ... [ WM C C | 3 0 0 ][ WM B B | 2 0 0 ] ...
//       ^   ^                              function argument
//       |   A = its RIGHTMOST position         ^ B = rightmost character of the WHOLE table
//       word mark at its leftmost position
//
// "Each table field is an implicit B field: argument rightmost, function leftmost", with a
// defining word mark at the field's leftmost position, and each table argument "must be exactly
// as long as the search argument for the search to continue" (§5.1).

import { checkAddress } from './address.js';
import { collateRank } from './bcd.js';
import { BCD6, WM, type Addr, type ExecContext } from './types.js';

import type { CompareResult } from './indicators.js';

/**
 * OPEN: WHICH SIDE IS "HIGH". §5.2's Compare rule is "compares B to A, never A to B", and the
 * `T` row shares that latch set (§8: high / equal / low / unequal are set by Compare, Table
 * Lookup and Branch if Character Equal alike), so *high* here means THE TABLE ARGUMENT COLLATES
 * ABOVE THE SEARCH ARGUMENT. Nothing prints it for `T`: A22-0526-3 Figure 26 is the page that
 * would, and its OCR is mangled — which is exactly the existing `open-questions.md` row in the
 * `avco-and-reentry.md` section: "Table Lookup op T bracketing … d is a 3-bit mask (1=low,
 * 2=equal, 4=high), so LEH (d=6) yields the upper bracket with ascending ordering". That row is
 * the corroboration and this constant is the reading; NO NEW ROW IS ADDED for it (phase-1b.md
 * §3.4, §9).
 *
 * A symmetric test table passes either way round, so the tier-1 vectors are deliberately
 * ASYMMETRIC (phase-1b.md §8 risk row; test/tier1-tablelookup.test.ts).
 */
export const TABLE_LOOKUP_COMPARES_TABLE_TO_ARGUMENT = true;

/**
 * OPEN: THE SCOPE OF THE STICKY-EQUAL RULE ACROSS ONE `T`. §5.2 prints "once the B=A indicator
 * is turned off during an operation it cannot be turned on again for the rest of that operation"
 * (223-2588-2 p.24) — written for `C`, which is one operation with ONE comparison. §2's `T` row
 * prints the opposite shape: the four latches come "from the LAST argument comparison" of an
 * operation with MANY. The two readings disagree for `d = 2 / 3 / 6` after any miss, and under
 * the per-operation reading a `d = 2` lookup could never hit at all once one field compared
 * unequal — which would make three of the eight documented d-characters dead letters.
 *
 * So the sticky rule is scoped to ONE TABLE-FIELD COMPARISON, and each field's verdict is
 * reported with `ctx.indicators.setCompare(result)` — `beginCompare` + `compareDigit` +
 * `endCompare` in one call, documented for exactly this: an operation that already knows its
 * verdict. The per-POSITION half of §5.2's rule still applies, in this file's own loop below.
 * `open-questions.md`, Phase 1b section; phase-1b.md §3.4, §9. The vector that separates the two
 * readings is in test/tier1-tablelookup.test.ts: a miss on the first table field compared,
 * followed by an EQUAL hit on the second.
 */
export const TABLE_LOOKUP_RESETS_COMPARE_PER_FIELD = true;

/**
 * The d-character's compare-condition mask, over the result of one argument comparison:
 * bit 1 = lower, bit 2 = equal, bit 4 = higher (`open-questions.md`, opcodes.md Table-Lookup
 * row). The row's printed map falls straight out of it because the eight documented
 * d-characters ARE those bits: `1` lower, `2` equal, `3` equal or lower, `4` higher, `5` lower
 * or higher (unequal), `6` equal or higher, `7` stop on any, blank = search to end of table
 * (§5.1, A22-0526-3 Figure 25 p.30).
 */
const BIT_OF_RESULT: Record<CompareResult, number> = { low: 1, equal: 2, high: 4 };

/**
 * `T aaaaa bbbbb d`, all three lengths (opcodes.md §2 pp.29-30, §5.1).
 *
 * **The search.** Right to left through the table, one *search cycle* per table field. Each
 * cycle compares that field's argument against the whole search argument, right to left, ending
 * on the A-FIELD WORD MARK; the leftmost unequal position decides, and all-equal is equal. If
 * the field's verdict satisfies `d` the search stops there — a HIT. Otherwise the cycle is a
 * miss and the next one starts one position left of THIS field's word mark.
 *
 * **The C-address reload, and the trap in it** (§5.1, A22-0526-3 p.30, verbatim): "At the start
 * of each search cycle, the C-address register automatically receives this address [the
 * A-address] and, if no hit is made, replaces it in the A-address register so the search can be
 * repeated at the next table argument to the left." The consequence §5.1 draws in its own words:
 * an emulator must "reload AAR from a saved copy at the start of every table-field comparison,
 * NOT MERELY DECREMENT IT". Both halves are modelled below, and honestly about which is which:
 * the SAVED COPY is `aUnits`, a const read once before the search and re-read from at the top of
 * every comparison, so no cursor ever decrements across fields; `ctx.regs.car` is the
 * architectural C-address register, written with that same address each cycle so the panel and
 * the trace show the reload §5.1 describes. The data path is the const; the register is what the
 * machine would show.
 *
 * **Where the next cycle starts, which is the other half of the same trap.** One position left
 * of the table field's WORD MARK — not one position left of wherever the comparison stopped.
 * Those two are the same address only when the field is exactly as long as the search argument,
 * i.e. when its function is empty. A table field LONGER than the search argument (the ordinary
 * case: it carries a function) has its comparison ended by the A word mark after `LW` positions,
 * with the rest of the field still to its left; §5.1's rule is stated over the FIELD's word
 * mark, so the miss walks on left to find it. An implementation that decremented instead would
 * take the tail of the function for the next table argument. `[verified]` — §5.1's C-address
 * paragraph and §2's `terminatesOn`; the vector is in test/tier1-tablelookup.test.ts.
 *
 * **End of table** (§5.1, `[verified]`): a table field SHORTER than the search argument — its
 * own word mark sensed before the A word mark arrives — ends the operation and turns on HIGH,
 * with BAR holding the address of the position immediately left of that short field. It is also
 * how a `d` = blank search ends, since a blank mask satisfies no verdict and no field can ever
 * hit: "blank = search to end of table" is the same stopping condition reached by exhaustion.
 *
 * **Registers.** The row prints `NSI / A−LW / (the function immediately left of the stopping
 * table argument)`; `isa/regs.ts` evaluates the AAR column from `ctx.sym.LW`, and BAR is
 * `'special'` on both exits — set here, as `move.ts` sets the Figure 20 results for `D`.
 *
 * Runs in a single E cycle: `T` returns nothing, so `Cpu.stepCycle()` completes it in one press.
 * Figure 7 groups it with `A S ? !` for the E term, and its own `4.5(L+1+B+NA)` has no E
 * (phase-1b.md §7; `cycles.ts` `eTerm`, `tTableLookup`).
 */
export function tableLookupFields(ctx: ExecContext): void {
  const s = ctx.storage;
  const aUnits = ctx.sym.A;

  // The search argument's own length, from its word mark. §5.1, verbatim: "Search argument (A
  // field) must have a word mark at its leftmost position", and "each table argument must be
  // exactly as long as the search argument for the search to continue" — so this one number is
  // both the length every comparison reads and the length a table field is measured against.
  // Read once, before the search, because it is a property of the A field alone: the end-of-table
  // exit aborts a comparison part way through and would otherwise have no full length to report.
  let argLen = 0;
  for (;;) {
    const cell = s.read(aUnits - argLen);
    argLen++;
    if ((cell & WM) !== 0) break;
  }

  // The three-bit compare-condition mask, read from the OP-MODIFIER REGISTER rather than from
  // the instruction image — the 6- and 1-character forms supply no d-character and reuse the one
  // the previous operation left there (A22-0526-3 p.12, decode.ts `applyFields`), exactly as
  // `move.ts` reads it for `D`. The mask IS the numeric 4-2-1 bits of the d-character, so `7`
  // ("stop on any") needs no special case: it has every result's bit set. Blank is zero and
  // satisfies nothing, which is what "search to end of table" means.
  const dMask = ctx.regs.opMod & 0o07;

  let table: Addr = ctx.sym.B;      // rightmost character of the WHOLE table
  let stepped = 0;                  // Figure 8's LB — table positions actually stepped
  let fields = 0;                   // Figure 7's N — table fields actually compared
  let lastCompared = 0;             // Figure 8's LW — positions the LAST comparison read

  for (;;) {
    // §5.1: "At the start of each search cycle, the C-address register automatically receives
    // this address." The reload is the point — the next comparison re-reads the search argument
    // from its units position however far left the table cursor has walked.
    ctx.regs.car = aUnits;
    fields++;

    let verdict: CompareResult = 'equal';
    let shortField = false;
    let pos = table;                // the table cursor for this comparison
    let compared = 0;               // positions read so far by THIS comparison

    for (;;) {
      const tCell = s.read(pos);
      const aCell = s.read(aUnits - compared);
      stepped++;
      compared++;

      // §5.2's collating rule, as `compare.ts` applies it: all BA8421 bits, no C bit, no word
      // mark. The scan runs RIGHT TO LEFT and every unequal position overwrites the verdict, so
      // the LAST one written — the leftmost, highest-order unequal position — is the one that
      // decides. That is the per-position half of the sticky-equal rule, applied here rather
      // than through `compareDigit` because the group reset is per FIELD
      // (TABLE_LOOKUP_RESETS_COMPARE_PER_FIELD above).
      const t = collateRank(tCell & BCD6);
      const a = collateRank(aCell & BCD6);
      if (t !== a) verdict = t > a ? 'high' : 'low';

      // The A-field word mark ends each individual argument comparison (§2 `terminatesOn`,
      // §5.1). It is tested FIRST: a field whose own word mark falls on the same position is
      // exactly as long as the search argument, which is the length §5.1 requires "for the
      // search to continue" — not a short field.
      if ((aCell & WM) !== 0) break;
      if ((tCell & WM) !== 0) { shortField = true; break; }

      pos = checkAddress(s, pos - 1, 'decrement');
    }

    // Figure 8's LW, carried out of the loop: the positions THIS comparison read. Whichever
    // comparison is the last one is the one the register result is computed from (see the note
    // at the foot of this function) — `argLen` on every hit and every full-length miss, and the
    // short field's own length on the end-of-table exit that aborts a comparison part way.
    lastCompared = compared;

    if (shortField) {
      // END OF TABLE (§5.1). HIGH on — its own `setCompare`, not the comparison's verdict,
      // which the manual discards here — and BAR immediately left of the short field, whose
      // leftmost position is the word-marked `pos` the scan just sensed.
      ctx.indicators.setCompare('high');
      ctx.regs.bar = pos - 1;
      break;
    }

    // One field, one verdict, one group of latches (TABLE_LOOKUP_RESETS_COMPARE_PER_FIELD).
    ctx.indicators.setCompare(verdict);

    if ((dMask & BIT_OF_RESULT[verdict]) !== 0) {
      // HIT. §2's BAR column verbatim: "address of the function immediately left of the stopping
      // table argument" — the function's own rightmost character, one position left of the
      // argument's leftmost, which is where this comparison stopped.
      ctx.regs.bar = pos - 1;
      break;
    }

    // MISS. Walk on left to the field's defining word mark — `pos` itself may carry it, when the
    // field is exactly as long as the search argument — and restart one position left of it.
    let mark: Addr = pos;
    while ((s.read(mark) & WM) === 0) {
      mark = checkAddress(s, mark - 1, 'decrement');
      stepped++;
    }
    table = checkAddress(s, mark - 1, 'decrement');
  }

  // Figure 8's length symbols (§1.3), and the row's `AAR = A − LW` is what LW feeds.
  //
  // LW IS THE LAST COMPARISON'S POSITIONS-READ COUNT. Two readings were on the table and the
  // `[verified]` one wins.
  //
  //   CHOSEN — §1.3, `[verified]`: LW is "the number of characters in the A- or B-field,
  //   WHICHEVER IS SHORTER". Each comparison is one A field against one table field, so LW comes
  //   out as `argLen` on every hit and on every full-length miss (the two are equal in length,
  //   which §5.1 requires "for the search to continue") and as the SHORT FIELD'S OWN LENGTH on
  //   the end-of-table exit, where the table side really is shorter and the comparison is
  //   aborted part way. §5.1's AAR mechanism agrees: the A-address register is reloaded at the
  //   start of each search cycle and stepped down per position read, so an operation that ends
  //   mid-cycle leaves `A − the positions THAT cycle read`, not `A − a full field`. On the
  //   end-of-table exit that is one position left of the argument's UNITS.
  //
  //   REJECTED — phase-1b.md §3.4's sentence that `ctx.sym.LW` is "the search-argument length,
  //   since that is the length every comparison reads". It is false of the very comparison this
  //   exit ends on: the aborted one reads fewer positions than the search argument, which is
  //   what makes it the end condition. §2's row prints one register triple for the op, but the
  //   triple is `A − LW` — a formula over a symbol §1.3 defines, not a second definition of the
  //   symbol. The deviation from the plan is logged in PHASE-1B-NOTES §2.
  //
  // LA is NOT the same number on that exit: it is the `A` of the row's `4.5(L + 1 + B + NA)` —
  // the per-field length each of the N comparisons is charged for — and §1.3 defines LA over
  // "the A-field", which here is the search argument. So LA stays `argLen` on every exit.
  //
  // LB is the table positions actually stepped — the `B` of the same formula — accumulated
  // ACROSS the whole search, comparisons and word-mark walks alike, as is `terms.N`. Neither may
  // be left holding one field's worth (phase-1b.md §3.4).
  ctx.sym.LW = lastCompared;
  ctx.sym.LA = argLen;
  ctx.sym.LB = stepped;
  // Figure 7's N counts "fields actually compared", and the aborted short-field cycle is counted
  // as one here — a CHOICE, not a manual reading: nothing says whether a cycle that ends on the
  // table field's own word mark counts. N feeds an approximate timing formula (§1.5), and the
  // positions that cycle really stepped are already in B, so the choice moves the estimate by
  // one A's worth and nothing else.
  ctx.terms.N = fields;
}
