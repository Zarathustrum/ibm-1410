// Tier 0/1 — `C` Compare, the Wave-5 flow-chart step 15 executor.
// research/opcodes.md §2 p.28 and §5.2; research/charset.md §4 (the 64-entry collating sequence)
// and §4.1 (Compare semantics); A22-0526-3 pp.28-29; 223-2588-2 "Brief Op Code Descriptions"
// (the short-A rule) and p.24 (equal, once off, cannot come back on).
// Plan §4.2 the `C` row; docs/plans/architecture.md §4.6, §8 tier 1.
//
// The direction is the fact this file exists to pin down: Compare compares the B FIELD TO THE A
// FIELD, never A to B, so HIGH means the B field collates ABOVE the A field.

import { describe, it, expect } from 'vitest';

import { bcdOfGlyph, collateRank } from '../src/core/bcd.js';
import { SHORT_A_TURNS_HIGH_ON } from '../src/core/compare.js';
import { CYCLE_US } from '../src/core/cycles.js';
import { Indicators } from '../src/core/indicators.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { BCD6, type Addr } from '../src/core/types.js';

function bcd(glyph: string): number {
  const code = bcdOfGlyph(glyph);
  if (code === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return code;
}

function program(s: CoreStorage, at: Addr, ...instructions: readonly string[]): void {
  let p = at;
  for (const text of instructions) {
    [...text].forEach((glyph, i) => s.setChar(p + i, bcd(glyph), i === 0));
    p += text.length;
  }
  s.setWm(p, true);
}

function machineWith(at: Addr, ...instructions: readonly string[]): Machine {
  const m = createMachine({ size: 10_000 });
  program(m.storage, at, ...instructions);
  m.addressSet(at);
  return m;
}

/**
 * One field, written so its UNITS position lands on `units` and its high-order position carries
 * the defining word mark — which is how both of Compare's address columns are addressed
 * (opcodes.md §2 p.28, registers `NSI / A-LW / B-LW`).
 */
function field(m: Machine, units: Addr, text: string): void {
  const start = units - text.length + 1;
  [...text].forEach((glyph, i) => m.storage.setChar(start + i, bcd(glyph), i === 0));
}

/** `C 00300 00500` at 00100, A field ending at 00300, B field ending at 00500. */
function compared(a: string, b: string): Machine {
  const m = machineWith(100, 'C0030000500');
  field(m, 300, a);
  field(m, 500, b);
  expect(m.step(), `C "${a}" "${b}"`).toBeUndefined();
  return m;
}

/** The four latches as one word, so a test reads like the manual's indicator column. */
function verdict(m: Machine): string {
  const i = m.indicators;
  const parts = [
    i.compareHigh ? 'high' : '', i.compareEqual ? 'equal' : '', i.compareLow ? 'low' : '',
    i.compareUnequal ? 'unequal' : '',
  ].filter((s) => s !== '');
  return parts.join('+');
}

const A_UNITS = 300, B_UNITS = 500;

describe('`C aaaaa bbbbb` Compare — B to A, never A to B (A22-0526-3 p.28)', () => {
  it('HIGH means the B field collates ABOVE the A field, decided at the units position', () => {
    // "Compares B to A, never A to B … Sets High (B>A), Equal, Low (B<A)" — charset.md §4.1.
    expect(verdict(compared('12345', '12349'))).toBe('high+unequal');
  });

  it('LOW means the B field collates BELOW the A field', () => {
    expect(verdict(compared('12349', '12345'))).toBe('low+unequal');
  });

  it('EQUAL leaves unequal OFF — the group is the manual\'s four latches, not three', () => {
    expect(verdict(compared('12345', '12345'))).toBe('equal');
  });

  it('a difference in a higher-order position overrides the units position', () => {
    // Right to left, so the LAST unequal position compared — the leftmost — is the one standing
    // when the operation ends (opcodes.md §5.2; the `compareDigit` rule in indicators.ts).
    // Units say LOW (B `4` below A `9`), the thousands say HIGH (B `9` above A `2`): HIGH wins.
    expect(verdict(compared('12349', '19344'))).toBe('high+unequal');
    expect(verdict(compared('19344', '12349'))).toBe('low+unequal');
  });

  it('neither field is modified', () => {
    const m = compared('12345', '12349');
    const read = (units: Addr, n: number): number[] =>
      Array.from({ length: n }, (_, k) => m.storage.bcd(units - n + 1 + k));
    expect(read(A_UNITS, 5)).toEqual([...'12345'].map(bcd));
    expect(read(B_UNITS, 5)).toEqual([...'12349'].map(bcd));
    expect(m.storage.wm(A_UNITS - 4), 'the A word mark survives').toBe(true);
    expect(m.storage.wm(B_UNITS - 4), 'the B word mark survives').toBe(true);
  });
});

describe('termination — EITHER field\'s word mark (opcodes.md §5.2, A22-0526-3 p.28)', () => {
  it('a B field shorter than A stops at the B word mark, set for the portion compared', () => {
    // "If B is shorter than or equal in length to A the indicators are set correctly for the
    // portions actually compared" — charset.md §4.1. Three positions match, so EQUAL, and the
    // A field's high-order `12` is never read.
    const m = compared('12345', '345');
    expect(verdict(m)).toBe('equal');
    expect(m.regs.aar, 'AAR = A-LW, three positions back').toBe(A_UNITS - 3);
    expect(m.regs.bar, 'BAR = B-LW').toBe(B_UNITS - 3);
  });

  it('a B field shorter than A still decides high/low on what it did compare', () => {
    expect(verdict(compared('12345', '349'))).toBe('high+unequal');
    expect(verdict(compared('12349', '345'))).toBe('low+unequal');
  });

  it('a SHORT A turns HIGH on even when the portion compared is equal', () => {
    // 223-2588-2, Comparing row, verbatim: "Operation is terminated by either an A-fd or B-fd
    // word mark. If A-fd is shorter than B-fd, A-fd must have WM. In this case Hi-ind is on."
    // The tier-1 case named in docs/plans/architecture.md §8.
    expect(SHORT_A_TURNS_HIGH_ON).toBe(true);
    const m = compared('345', '12345');
    expect(verdict(m)).toBe('high+unequal');
    expect(m.regs.aar, 'AAR = A-LW, LW = the three positions compared').toBe(A_UNITS - 3);
    expect(m.regs.bar, 'BAR = B-LW — the SHORTER field\'s length, on both registers').toBe(B_UNITS - 3);
  });

  it('a SHORT A turns HIGH on even when the portion compared was LOW', () => {
    // The encoded reading of `SHORT_A_TURNS_HIGH_ON` — "Hi-ind is on" is printed with no
    // qualifier. See the OPEN note on that constant.
    expect(verdict(compared('349', '12345'))).toBe('high+unequal');
  });

  it('equal-length fields are decided entirely by the characters', () => {
    const m = compared('12345', '12345');
    expect(m.regs.aar).toBe(A_UNITS - 5);
    expect(m.regs.bar).toBe(B_UNITS - 5);
  });
});

describe('the collating sequence, not the six-bit value (charset.md §4, A22-0526-3 pp.5-6)', () => {
  // Figure 2 is printed in ascending collating order and that order IS the sequence. Each pair
  // is (lower, higher) by the documented rank; the test asserts both directions, so a table that
  // drifted would fail twice.
  const ADJACENT: readonly (readonly [string, string])[] = [
    [' ', '.'],     // blank, rank 00, is the lowest character there is
    ['?', 'A'],     // `?` (plus zero) sorts immediately BEFORE `A` — ranks 25, 26
    ['I', '!'],     // `!` (minus zero) sits between `I` and `J` — ranks 34, 35, 36
    ['!', 'J'],
    ['R', '‡'],     // the record mark sits between `R` and `S` — ranks 44, 45, 46
    ['‡', 'S'],
    ['Z', '0'],     // the ten digits are the HIGHEST block, above every letter — ranks 53, 54
    ['8', '9'],
  ];

  it('places blank lowest, `?` before `A`, `!` between `I` and `J`, RM between `R` and `S`, digits above letters', () => {
    for (const [lower, higher] of ADJACENT) {
      expect(collateRank(bcd(higher)) - collateRank(bcd(lower)), `${lower} then ${higher}`).toBe(1);
      expect(verdict(compared(lower, higher)), `A=${lower} B=${higher}`).toBe('high+unequal');
      expect(verdict(compared(higher, lower)), `A=${higher} B=${lower}`).toBe('low+unequal');
    }
  });

  it('is NOT the numeric order of the six-bit code — `?` is octal 72 yet collates below `A`, octal 61', () => {
    expect(bcd('?')).toBe(0o72);
    expect(bcd('A')).toBe(0o61);
    expect(verdict(compared('?', 'A'))).toBe('high+unequal');
  });

  it('A22-0526-3 p.29 example 6: A `444444D` against B `444444M` is HIGH — six 4s', () => {
    // The minus zone on `M` does not participate as a sign; `M` (rank 39) simply collates above
    // `D` (rank 29). No numeric-only compare, no sign stripping (charset.md §4.1).
    expect(collateRank(bcd('M'))).toBe(39);
    expect(collateRank(bcd('D'))).toBe(29);
    const m = compared('444444D', '444444M');
    expect(verdict(m)).toBe('high+unequal');
    expect(m.regs.aar, 'seven positions compared').toBe(A_UNITS - 7);
    expect(m.regs.bar).toBe(B_UNITS - 7);
  });

  it('the C bit and the word mark are not compared — p.28, verbatim', () => {
    // Two identical characters, one of them additionally word-marked mid-field: still EQUAL.
    const m = machineWith(100, 'C0030000500');
    field(m, 300, '12345');
    field(m, 500, '12345');
    m.storage.setWm(500 - 2, true);            // an interior B word mark, three positions in
    expect(m.step()).toBeUndefined();
    expect(verdict(m), 'the mark ends the operation but is not itself compared').toBe('equal');
    expect(m.regs.bar).toBe(B_UNITS - 3);
  });
});

describe('the compare latch group (opcodes.md §8, §5.2; 223-2588-2 p.24)', () => {
  it('sets the four latches AS A GROUP and clears the previous group', () => {
    // A freshly built machine is in the computer-reset state — low and unequal ON — so an EQUAL
    // compare has to turn two latches off as well as one on.
    const m = machineWith(100, 'C0030000500');
    expect(verdict(m)).toBe('low+unequal');
    field(m, 300, '12345');
    field(m, 500, '12345');
    m.step();
    expect(verdict(m)).toBe('equal');
  });

  it('touches none of the three arithmetic latches', () => {
    const m = machineWith(100, 'C0030000500');
    m.indicators.setArithOverflow();
    m.indicators.setDivideOverflow();
    m.indicators.setZeroBalance(true);
    field(m, 300, '12345');
    field(m, 500, '12349');
    m.step();
    expect(m.snapshot().indicators).toMatchObject({
      arithOverflow: true, divideOverflow: true, zeroBalance: true,
    });
  });

  it('once EQUAL is off during one operation it cannot be turned back on — through the executor', () => {
    // Units differ, every higher-order position matches. A machine that re-asserted equal on
    // each matching position would end EQUAL; the 1410 ends HIGH (223-2588-2 p.24).
    const m = compared('12345', '12349');
    expect(m.indicators.compareEqual).toBe(false);
    expect(verdict(m)).toBe('high+unequal');
  });

  it('once EQUAL is off it cannot be turned back on — driving the latch hook directly', () => {
    const ind = new Indicators();
    ind.beginCompare();
    expect(ind.compareEqual, 'the operation starts with equal ON').toBe(true);
    ind.compareDigit('low');
    ind.compareDigit('equal');
    ind.compareDigit('equal');
    ind.endCompare();
    expect(ind.compareEqual).toBe(false);
    expect(ind.compareLow).toBe(true);
    expect(ind.compareUnequal).toBe(true);
  });
});

describe('the `C` row\'s three lengths and its timing (opcodes.md §2 p.28)', () => {
  it('costs 4.5(L+1+A+B), with A and B the positions actually compared', () => {
    const m = compared('12345', '12345');
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (11 + 1 + 5 + 5));
  });

  it('a short field charges only what it read', () => {
    const m = compared('12345', '345');
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (11 + 1 + 3 + 3));
  });

  it('the L=6 form supplies the A-address and chains the B-address', () => {
    // `C` is not an address-double op code, so a 6-character form loads AAR (and CAR) from its
    // own address and uses "the contents remaining in the BAR at the completion of the previous
    // E phase" for the B field (223-2589 p.52; research/architecture.md §8).
    const m = machineWith(100, 'C00300');
    m.regs.bar = B_UNITS;
    field(m, 300, '12345');
    field(m, 500, '12349');
    expect(m.step()).toBeUndefined();
    expect(verdict(m)).toBe('high+unequal');
    expect(m.regs.aar).toBe(A_UNITS - 5);
    expect(m.regs.bar).toBe(B_UNITS - 5);
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (6 + 1 + 5 + 5));
  });

  it('the L=1 chained form compares whatever AAR and BAR already hold', () => {
    const m = machineWith(100, 'C');
    m.regs.aar = A_UNITS;
    m.regs.bar = B_UNITS;
    field(m, 300, '12345');
    field(m, 500, '12345');
    expect(m.step()).toBeUndefined();
    expect(verdict(m)).toBe('equal');
    expect(m.regs.aar).toBe(A_UNITS - 5);
    expect(m.regs.bar).toBe(B_UNITS - 5);
  });

  it('all six data bits take part — a zoned character is not equal to its numeric portion', () => {
    // `D` is octal 64 (BA + 4) and `4` is octal 04: identical NUMERIC bits, different characters.
    // A numeric-only compare would call them equal. By collating rank the letter `D` (29) sits
    // far below the digit `4` (58), because the ten digits are the highest block in the sequence
    // (charset.md §4) — so with A = `4` and B = `D` the verdict is LOW.
    expect(bcd('D') & 0o17).toBe(bcd('4') & 0o17);
    expect(bcd('D') & BCD6).not.toBe(bcd('4') & BCD6);
    expect(verdict(compared('4', 'D'))).toBe('low+unequal');
    expect(verdict(compared('D', '4'))).toBe('high+unequal');
  });
});
