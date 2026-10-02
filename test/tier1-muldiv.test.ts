// Tier 1 — `@` Multiply and `%` Divide, the Phase 1b Wave B executors (`src/core/muldiv.ts`).
// docs/plans/phase-1b.md §3.2 (`@`), §3.3 (`%`), §4 Wave B (this vector list), §9 (the
// `ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE` row).
// Machine facts: research/opcodes.md §2 pp.19-21 (the two rows), §4.1 (the sign convention),
// §4.5 (multiply and Figure 14's digit groups), §4.6 (the divide field layout, Figures 15-17),
// §8 (the indicator rules), §1.5 (Figure 7's E, M and Q terms).
//
// WHERE THE NUMBERS COME FROM. `insttest.cor` runs both ops, but `note1410.txt` annotates the
// multiply and divide sub-blocks with field addresses and contents and NOTHING ELSE — no
// expected results and no latch lines (research/emulators.md §5.2). So every value below is
// HAND-DERIVED from the `[verified]` rules of §4.5 / §4.6 and carries its arithmetic in a
// comment beside it, except the first, which is the MANUAL'S OWN worked example: Figure 17's
// `12` into `14700`, the one divide answer in this file that is not ours.

import { describe, it, expect } from 'vitest';
import { PLUS_ZONE, digitOf, signOf } from '../src/core/alu.js';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { tDivide, tMultiply } from '../src/core/cycles.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE } from '../src/core/muldiv.js';
import { CoreStorage } from '../src/core/storage.js';
import { ZA, ZB, type Addr, type CycleStep } from '../src/core/types.js';

const ZONES = ZB | ZA;

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

function program(s: CoreStorage, at: Addr, ...instructions: readonly string[]): void {
  let p = at;
  for (const text of instructions) {
    [...text].forEach((glyph, i) => s.setChar(p + i, code(glyph), i === 0));
    p += text.length;
  }
  s.setWm(p, true);
}

/**
 * A field written as its literal core image, left to right, word-marked on its first position.
 * The sign lives in the units character's own zone bits, so a plus-signed `14700` is written
 * `1470?` (12-0) and a minus-signed `181` is `18J` (11-1) — opcodes.md §4.1, charset.md §2.
 */
function place(s: CoreStorage, at: Addr, image: string): void {
  [...image].forEach((glyph, i) => s.setChar(at + i, code(glyph), i === 0));
}

/** The digits of a closed address range, as the adder reads them (zones ignored). */
function digits(s: CoreStorage, from: Addr, to: Addr): string {
  let out = '';
  for (let a = from; a <= to; a++) out += String(digitOf(s.read(a)));
  return out;
}

function machine(...instructions: readonly string[]): Machine {
  const m = createMachine({ size: 10_000 });
  program(m.storage, 100, ...instructions);
  m.addressSet(100);
  return m;
}

/** Half-cycle one instruction to the end, keeping every cycle — test/step-cycle.test.ts's helper. */
function cycles(m: Machine): CycleStep[] {
  const out: CycleStep[] = [];
  for (let guard = 0; guard < 200; guard++) {
    const cycle = m.stepCycle();
    out.push(cycle);
    if (cycle.complete) return out;
  }
  throw new Error('stepCycle never completed');
}

// ═══ `%` — the manual's own worked example, A22-0526-3 Figures 15-17 ═══════
//
//        |<-- quotient area -->|<-- dividend -->|
// B field: [ 0 ][ 0 ][ 0 ]      [ 1  4  7  0  0 ]
//           ^                    ^
//           left end of the      B-ADDRESS: the LEFTMOST POSITION OF THE DIVIDEND
//           quotient/dividend
//
// Divisor `12` at 00300-00301 (A = 00301, its units). The 8-position field at 01000-01007 holds
// `00014700` with the plus sign in its units position (`?` = 12-0), and a word mark at 01000
// left by the recommended preceding ZA — "ignored but retained" (§2's `%` row). B = 01003.
//
// 14700 = 12 x 1225, remainder 0. §4.6 puts the quotient's units at
// (units of dividend) − len(divisor) − 1 = 01007 − 2 − 1 = 01004, so the quotient `1225` lands
// at 01001-01004 and the 3-position remainder `000` at 01005-01007: the field reads `01225000`.

describe('`%` Divide — the Figure 15-17 example (opcodes.md §2 pp.20-21, §4.6)', () => {
  function figure17(): Machine {
    const m = machine('%0030101003');
    place(m.storage, 300, '12');            // divisor, word mark at 00300
    place(m.storage, 1_000, '0001470?');    // 00014700 +, word mark at 01000
    return m;
  }

  it('divides 14700 by 12 and leaves `01225000` — quotient left, remainder right', () => {
    const m = figure17();
    expect(m.step()).toBeUndefined();
    expect(digits(m.storage, 1_000, 1_007), '14700 / 12 = 1225 r 0').toBe('01225000');
    // The quotient sign is DEVELOPED (algebraic: + / + = +), so §4.1's writing rule applies and
    // plus is written B+A. The remainder keeps the dividend's own sign, untouched.
    expect(signOf(m.storage.read(1_004)), 'quotient sign, at its units position').toBe('+');
    expect(m.storage.read(1_004) & ZONES, 'a developed plus is B+A').toBe(PLUS_ZONE);
    expect(signOf(m.storage.read(1_007)), 'the remainder takes the dividend’s sign').toBe('+');
    // "A B-field word mark left by a preceding ZA is ignored but retained" — §2's `%` row.
    expect(m.storage.wm(1_000)).toBe(true);
  });

  it('leaves NSI / A−LA / the tens position of the quotient field (opcodes.md §2, §1.3)', () => {
    const m = figure17();
    m.step();
    expect(m.regs.iar).toBe(111);
    expect(m.regs.aar, 'A − LA, LA = 2 divisor digits').toBe(299);
    // The row's BAR column is `special`: the executor sets it, and §2 says what to —
    // "tens position of the quotient field", one left of the quotient's units at 01004.
    expect(m.regs.bar).toBe(1_003);
  });

  it('sets neither divide overflow nor arithmetic overflow, and leaves zero balance alone', () => {
    const m = figure17();
    const zeroBalanceBefore = m.indicators.zeroBalance;
    m.step();
    expect(m.indicators.divideOverflow).toBe(false);
    // §8: "divide never sets arithmetic overflow or zero balance" — divide is absent from both
    // the set and the reset lists of the p.53 Zero Balance light text.
    expect(m.indicators.arithOverflow).toBe(false);
    expect(m.indicators.zeroBalance).toBe(zeroBalanceBefore);
  });

  it('reports Figure 7’s Q — four quotient digits — through the row’s timing (opcodes.md §1.5)', () => {
    const m = figure17();
    m.step();
    // `4.5{L+1+E+6.5Q[A+1.5(A+2)]}` with L=11, E=0, A=2 and Q=4: the four division steps that
    // develop 1, 2, 2, 5. Q reaches the formula only through `ctx.terms.Q`, so this is the
    // executor's own count.
    expect(m.cpu.microsecondsSimulated).toBe(tDivide(11, 0, 2, 4));
  });
});

// ═══ `%` — the two determinate divide-overflow rules (§4.6, §8) ════════════

describe('`%` divide overflow — opcodes.md §4.6, §8', () => {
  it('division by zero ALWAYS raises it, and nothing is developed', () => {
    const m = machine('%0030101003');
    place(m.storage, 300, '00');            // a zero divisor
    place(m.storage, 1_000, '0001470?');
    expect(m.step()).toBeUndefined();
    expect(m.indicators.divideOverflow, '"Division by zero always raises divide overflow"').toBe(true);
    expect(digits(m.storage, 1_000, 1_007), 'the field is left as it was').toBe('00014700');
    expect(m.indicators.arithOverflow).toBe(false);
  });

  // §4.6: "a quotient field ONE position too small does not raise overflow — it silently
  // corrupts the adjacent field." Nothing in `muldiv.ts` knows where the B field begins, so this
  // falls out of the walk rather than being coded: the first quotient digit is stored at
  // (first window units) − len(divisor) − 1, wherever that lands.
  //
  // Divisor `3` at 00300 (LA = 1). Dividend `96` plus at 01003-01004 (`F` = 12-6), so the field
  // needs len(divisor) + len(dividend) + 1 = 4 positions, 01001-01004. This program allocated
  // only 01002-01004 and left a neighbouring field `77` at 01000-01001.
  // 96 = 3 x 32 r 0: the quotient digits 3 and 2 go to 01001 and 01002, and 01001 is not ours.
  it('a quotient field one position short raises NOTHING and corrupts the neighbour', () => {
    const m = machine('%0030001003');
    place(m.storage, 300, '3');
    place(m.storage, 1_000, '77');          // the neighbouring field, word mark at 01000
    place(m.storage, 1_002, '09F');         // the one-position-short quotient/dividend field
    expect(m.step()).toBeUndefined();

    expect(digits(m.storage, 1_001, 1_004), '96 / 3 = 32 r 0').toBe('3200');
    expect(digitOf(m.storage.read(1_001)), 'the neighbour’s units position was a 7').toBe(3);
    expect(digitOf(m.storage.read(1_000)), 'and the rest of it survived').toBe(7);
    expect(m.storage.wm(1_000), 'as did its word mark').toBe(true);
    expect(m.indicators.divideOverflow, 'one position short is not checked').toBe(false);
  });
});

// ═══ `@` — Figure 14's two cycle groups ═══════════════════════════════════

describe('`@` Multiply — the digit groups of opcodes.md §4.5 (A22-0526-3 Figure 14)', () => {
  // Multiplicand `3` at 00300 (LA = 1); a 3-position B field at 01000-01002 whose high-order
  // position holds the one-digit multiplier image, word mark at 01000. So each partial add is
  // LA + 1 = 2 storage cycles, and the zeroing scan of the product area is another 2.
  // Half-cycling gives 1 (the I phase) + yields + 1 (the cycle that finds the executor done).
  // The per-yield granularity here — one yield per zeroing position, none for the store that
  // destroys the multiplier image — is THIS EMULATOR'S OWN CONVENTION, not a machine statement:
  // no source counts multiply's storage cycles at that grain, so this case exists to pin the
  // convention and make a change to it deliberate (plan §1 excludes cycle-accurate timing).
  function partialAdds(multiplier: string): { adds: number; product: string } {
    const m = machine('@0030001002');
    place(m.storage, 300, '3');
    place(m.storage, 1_000, `${multiplier}00`);
    const n = cycles(m).length;
    return { adds: (n - 2 - 2) / 2, product: digits(m.storage, 1_000, 1_002) };
  }

  it('a multiplier digit 1-4 costs that many true adds', () => {
    // "A multiplier digit 1-4 causes that many true-adds of the multiplicand."  3 x 2 = 6.
    expect(partialAdds('2')).toEqual({ adds: 2, product: '006' });
  });

  it('a multiplier digit 8 costs THREE cycles, not eight', () => {
    // "A digit 5-9 causes tens-complement complement-adds in the low-order positions followed by
    // a left shift and a true-add starting in the tens position — so multiplier digit 8 costs
    // three cycles, not eight" (§4.5, Figure 14): 10 − 8 = 2 complement adds, then 1 true add.
    // 3 x 8 = 24.
    expect(partialAdds('8')).toEqual({ adds: 3, product: '024' });
  });

  it('the partial-add window is the operand length + 1 — an implementation choice, not a fact', () => {
    // phase-1b.md §9 / open-questions.md, Phase 1b: no source states the adder window. Both
    // groups above are wrong at any narrower width, which is the whole of its check.
    expect(ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE).toBe(true);
  });
});

// ═══ `@` — §8's correction: multiply NEVER sets arithmetic overflow ═══════

describe('`@` and arithmetic overflow — opcodes.md §8 (A22-0526-3 p.53)', () => {
  // "Multiply never sets arithmetic overflow, EVEN WHEN HIGH-ORDER MULTIPLICAND DIGITS ARE CUT
  // OFF BY THE B-FIELD WORD MARK" (§4.5). Multiplicand `999` at 00299-00301 (LA = 3); a
  // 5-position B field at 01000-01004 with the multiplier image `9` under the word mark at
  // 01000. The 5-9 group's shifted true add runs the window [01000..01003], whose high-order
  // position IS the word-marked one, and carries out of it — 9900 + 0999 = 10899. That carry is
  // the digit the manual says is cut off, and §8 forbids the indicator either way.
  // 999 x 9 = 8991, so the field reads `08991`.
  it('raises none when the top partial add carries out of the word-marked B position', () => {
    const m = machine('@0030101004');
    place(m.storage, 299, '999');
    place(m.storage, 1_000, '90000');
    expect(m.step()).toBeUndefined();
    expect(digits(m.storage, 1_000, 1_004), '999 x 9 = 8991').toBe('08991');
    expect(m.indicators.arithOverflow, '§8: add and subtract only').toBe(false);
    expect(m.storage.wm(1_000), 'the B word mark is not disturbed').toBe(true);
    expect(m.storage.read(1_004) & ZONES, 'like signs → a developed plus, B+A').toBe(PLUS_ZONE);
  });
});

// ═══ `@` — a whole multiply: product, sign, the destroyed image, indicators ═══

describe('`@` Multiply — 181 x 82, unlike signs (opcodes.md §2 pp.19-20, §4.5)', () => {
  // The shape of `insttest.cor` 02600, hand-derived here. Multiplicand `18J` at 00300-00302 —
  // 181 with an 11-1 units character, so MINUS (§4.1: minus is always a B bit alone). The
  // 6-position B field at 01000-01005 = digits(multiplicand) + digits(multiplier) + 1, with the
  // multiplier image `8B` (82, plus — `B` is 12-2) pre-placed in its high-order positions under
  // the word mark, and 12-zoned junk `ABCD` in the product area to prove §4.5's "zones anywhere
  // in the assigned product area are eliminated before product development".
  //
  // 181 x 82 = 14842; unlike signs → minus. The field ends `01484K` (`K` = 11-2).
  function multiplyMachine(): Machine {
    const m = machine('@0030201005');
    place(m.storage, 300, '18J');
    place(m.storage, 1_000, '8BABCD');
    return m;
  }

  it('develops the product, and the multiplier image is destroyed as it is consumed', () => {
    const m = multiplyMachine();
    expect(m.step()).toBeUndefined();
    expect(digits(m.storage, 1_000, 1_005), '181 x 82 = 14842').toBe('014842');
    // The image's own two positions now hold product digits, and the 12-zone the `B` carried is
    // gone: "zones in the multiplier are eliminated during development" (§4.5).
    expect(m.storage.read(1_001) & ZONES, 'the multiplier’s zones went with it').toBe(0);
    // And the product area's zones were eliminated BEFORE development, by the first scan.
    expect([1_002, 1_003, 1_004].map((a) => m.storage.read(a) & ZONES)).toEqual([0, 0, 0]);
    // Zones in the multiplicand are undisturbed — no pass ever writes the A field.
    expect(digits(m.storage, 300, 302)).toBe('181');
    expect(signOf(m.storage.read(302))).toBe('-');
  });

  it('samples the two units signs first and writes UNLIKE → minus into B’s units at the end', () => {
    const m = multiplyMachine();
    m.step();
    expect(signOf(m.storage.read(1_005))).toBe('-');
    // §4.1: a developed minus is a B bit ALONE, never B+A.
    expect(m.storage.read(1_005) & ZONES).toBe(ZB);
  });

  it('sets zero balance from the final product only, and never arithmetic overflow (§8)', () => {
    const m = multiplyMachine();
    m.step();
    expect(m.indicators.zeroBalance, '14842 is not a zero balance').toBe(false);
    expect(m.indicators.arithOverflow).toBe(false);

    // The same operation with a zero product: multiplicand `0` (LA = 1) times the image `5`,
    // whose 5-9 group runs five complement adds and a shifted true add and still develops
    // nothing. §8 lists multiply among the ops that set zero balance.
    const z = machine('@0030001002');
    place(z.storage, 300, '0');
    place(z.storage, 1_000, '500');
    z.step();
    expect(digits(z.storage, 1_000, 1_002)).toBe('000');
    expect(z.indicators.zeroBalance).toBe(true);
  });

  it('leaves NSI / A−LA / B−LB and reports Figure 7’s M through the row’s timing', () => {
    const m = multiplyMachine();
    m.step();
    expect(m.regs.iar).toBe(111);
    expect(m.regs.aar, 'A − LA, LA = 3 multiplicand digits').toBe(299);
    // LB is the whole B field, len(multiplicand) + len(multiplier) + 1 = 6, so BAR lands one
    // position left of its high-order character exactly as an `A` or `S` leaves it (§2, §1.3).
    expect(m.regs.bar).toBe(999);
    // `4.5[L+1+E+2.5M+(2.5M+1.5)(2.5A+3)]` with L=11, E=0, A=3 and M=2 — the two multiplier
    // digits, which reach the formula only through `ctx.terms.M`.
    expect(m.cpu.microsecondsSimulated).toBe(tMultiply(11, 0, 3, 2));
  });
});

// ═══ Figure 7's E term — the trap plan §10 named ═══════════════════════════

describe('a chained `@` costs E=2, not the blanket 1 (opcodes.md §1.4, §1.5, plan §9)', () => {
  it('the 1-character form charges the D cycle AND the C cycle', () => {
    // `@ 00301 01005` then a bare `@`. The first multiplies `12` (00300-00301) by the image `3`
    // at 01002 into the 4-position field 01002-01005 and leaves AAR = 00299, BAR = 01001; the
    // chained one is the two-field form on those registers — `@` is NOT address-double (§1.4,
    // the 1401 trap) — multiplying `12` (00298-00299) by the image `2` at 00998 in 00998-01001.
    // So the second instruction has L=1, A=LA=2, M=1, and Figure 7 gives E=2 for a
    // single-character multiply: "a D cycle AND THEN a C cycle" (§1.4's per-length table).
    const m = machine('@0030101005', '@');
    place(m.storage, 298, '12');
    place(m.storage, 300, '12');
    place(m.storage, 998, '2000');
    place(m.storage, 1_002, '3000');
    m.step();
    const afterFirst = m.cpu.microsecondsSimulated;
    m.step();
    expect(m.cpu.microsecondsSimulated - afterFirst).toBe(tMultiply(1, 2, 2, 1));
  });
});
