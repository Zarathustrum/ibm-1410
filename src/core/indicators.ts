// src/core/indicators.ts — the SEVEN indicator latches, with the manual's own set/reset rules.
// Source: docs/plans/architecture.md §4.6; docs/plans/phase-1-cpu-core.md §1, §5 Wave 1.
//
// research/opcodes.md §8 enumerates seven latches — three arithmetic (arithmetic overflow,
// zero balance, divide overflow) and four compare (high, equal, low, unequal). "Six" in this
// project always means `ChannelStatus`, which is a different set and does not live here. The
// carriage channel-9 / channel-12 indicators arrive with the 1403 in Phase 2 and are not
// latches of this set (opcodes.md §8, io.md §5).
//
// The methods are named after the RULES rather than after the fields, because the reset rules
// are the part an emulator gets wrong. There is deliberately no `set(name, value)`: a generic
// setter would let a future Divide executor set arithmetic overflow, which the machine cannot
// do (A22-0526-3 p.53).
//
// The fixture `oracle/indicators.json` carries the same rules as data; test/indicators.test.ts
// drives this class from it.

import type { IndicatorName } from './types.js';

/** One position's verdict during a Compare / Table Lookup / Branch-if-Character-Equal. */
export type CompareResult = 'high' | 'equal' | 'low';

export class Indicators {
  // ── The three arithmetic latches ─────────────────────────────────────────
  /** Set by Add and Subtract ONLY. opcodes.md §8; A22-0526-3 p.53. */
  arithOverflow = false;
  /** Set by Add, Subtract, Multiply, ZA and ZS — never Divide. opcodes.md §8; A22-0526-3 p.53. */
  zeroBalance = false;
  /** Set by Divide only. opcodes.md §8; research/architecture.md §10. */
  divideOverflow = false;

  // ── The four compare latches, set and reset AS A GROUP ───────────────────
  // By Compare, Table Lookup and Branch if Character Equal (opcodes.md §8).
  compareHigh = false;
  compareEqual = false;
  compareLow = false;
  compareUnequal = false;

  /**
   * A power-on reset is program reset + start reset + computer reset
   * (research/console-and-physical.md §3, S223-2648 pp.76-77), so a machine that has just been
   * built is in the computer-reset state — which is NOT all-off: low and unequal are ON.
   */
  constructor() {
    this.computerReset();
  }

  /**
   * Arithmetic overflow. A22-0526-3 p.53, the 1415 "Overflow" light, in identical wording in
   * editions 2 and 3: "The overflow condition can be detected only during an add or subtract
   * operation, and not during a zero and add, zero and subtract, multiply or divide operation."
   * Indexing does not set it either, even when the index addition overflows (A22-0526-3 p.15).
   * Only Add and Subtract may call this (research/opcodes.md §8).
   */
  setArithOverflow(): void {
    this.arithOverflow = true;
  }

  /**
   * Divide overflow: division by zero (always), an improperly addressed dividend, or a quotient
   * field TWO OR MORE positions too small. One position short silently corrupts the adjacent
   * field and is not checked (research/opcodes.md §4.6, §8). Divide only.
   */
  setDivideOverflow(): void {
    this.divideOverflow = true;
  }

  /**
   * Zero balance, from Add, Subtract, Multiply, Zero and Add and Zero and Subtract — and NEVER
   * from Divide, which is absent from both the set and the reset lists of the p.53 "Zero
   * Balance" light text (research/opcodes.md §8; docs/plans/architecture.md §9 row C10).
   *
   * It takes the result rather than being a bare setter because the reset rule is "the next
   * such op that does NOT give a zero balance" — one call per qualifying operation, always.
   */
  setZeroBalance(zero: boolean): void {
    this.zeroBalance = zero;
  }

  /**
   * Start one Compare / Table Lookup / BCE. The four latches reset AS A GROUP here
   * (research/opcodes.md §8), and equal starts ON: the operation can only ever turn it off.
   */
  beginCompare(): void {
    this.compareHigh = false;
    this.compareEqual = true;
    this.compareLow = false;
    this.compareUnequal = false;
  }

  /**
   * One compared position. THE RULE: once equal is turned off during an operation it cannot be
   * turned back on (research/opcodes.md §5.2, 223-2588-2 p.24) — enforced structurally, because
   * nothing here ever assigns `compareEqual = true`.
   *
   * Compare scans right to left, so the LAST unequal position seen — the leftmost, highest-order
   * one — is the one that decides high vs low, which is why each unequal position overwrites.
   */
  compareDigit(result: CompareResult): void {
    if (result === 'equal') return;
    this.compareEqual = false;
    this.compareHigh = result === 'high';
    this.compareLow = result === 'low';
  }

  /** End of the operation: unequal accompanies high or low (research/opcodes.md §8). */
  endCompare(): void {
    this.compareUnequal = !this.compareEqual;
  }

  /**
   * The whole group in one call, for an operation that already knows its verdict — Branch if
   * Character Equal compares exactly one character (research/opcodes.md §2 `B` row). Routed
   * through the three methods above so there is one implementation of the group rules.
   */
  setCompare(result: CompareResult): void {
    this.beginCompare();
    this.compareDigit(result);
    this.endCompare();
  }

  /**
   * `J (I) Z` (BAV). The test that reads arithmetic overflow RESETS it
   * (research/opcodes.md §8, §2 `J` conditional row: "the overflow indicators are reset by the
   * test that reads them").
   */
  testAndResetArithOverflow(): boolean {
    const on = this.arithOverflow;
    this.arithOverflow = false;
    return on;
  }

  /** `J (I) W` (BDV). Same rule as BAV — the test resets the latch (research/opcodes.md §8). */
  testAndResetDivideOverflow(): boolean {
    const on = this.divideOverflow;
    this.divideOverflow = false;
    return on;
  }

  /**
   * COMPUTER RESET. It turns off the overflow indicators and the zero-result indicator, and
   * turns **ON** the low-compare and unequal-compare indicators (A22-0526-3 p.36, via
   * research/opcodes.md §8 and research/architecture.md §10). That asymmetry is real, and it is
   * why the four compare latches are four named members rather than one collapsed `'compare'`.
   *
   * PROGRAM RESET is not here on purpose: A22-0526-3 p.52 lists what that key resets — check
   * circuits, IAR, the A/B data registers, the Op and Op-modifier registers and the console
   * inquiry latch — and the machine indicators are not in it (research/architecture.md §10,
   * research/console-and-physical.md §3).
   */
  computerReset(): void {
    this.arithOverflow = false;
    this.zeroBalance = false;
    this.divideOverflow = false;
    this.compareHigh = false;
    this.compareEqual = false;
    this.compareLow = true;
    this.compareUnequal = true;
  }

  /** A structured-cloneable copy for `MachineState.indicators` (docs/plans/architecture.md §3). */
  snapshot(): Record<IndicatorName, boolean> {
    return {
      arithOverflow: this.arithOverflow,
      zeroBalance: this.zeroBalance,
      divideOverflow: this.divideOverflow,
      compareHigh: this.compareHigh,
      compareEqual: this.compareEqual,
      compareLow: this.compareLow,
      compareUnequal: this.compareUnequal,
    };
  }
}
