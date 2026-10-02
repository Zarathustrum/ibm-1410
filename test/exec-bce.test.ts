// Tier 0/1 — `B` Branch if Character Equal, the Wave-4 flow-chart step 13 executor.
// research/opcodes.md §2 p.37 (A22-0526-3) and §8 (the compare latch group);
// research/charset.md §4 (the collating sequence the latches order by);
// research/architecture.md §9 (the `B-1` not-taken BAR); plan §4.2, the `B W V` row.
//
// The whole printed rule, verbatim: "The BA8421 bits of the character at the B-address are
// compared with d; exactly equal causes the branch. Also sets the high/low/equal compare latches
// (high if the B character collates above d). Word marks do not affect it — always a
// one-character test. Length 6 chains the B-address and reuses the previous modifier."
//
// So `B` is `W`'s twin in shape and its opposite in two ways: the branch is EXACT equality of all
// six bits rather than a mask intersection, and the §2 indicator column is FULL rather than empty
// — `B` is the third member of the compare group with `C` and `T`.

import { describe, it, expect } from 'vitest';

import { bcdOfGlyph, collateRank } from '../src/core/bcd.js';
import { CYCLE_US } from '../src/core/cycles.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { BCD6, C, type Addr } from '../src/core/types.js';

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

/** `B 00300 00500 d` at 00100, with `glyph` sitting at the B-address 00500. */
function charTest(d: string, glyph: string, wordMark = false): Machine {
  const m = machineWith(100, `B0030000500${d}`);
  m.storage.setChar(500, bcd(glyph), wordMark);
  return m;
}

/** The four compare latches as one word (the same shape test/compare.test.ts uses). */
function verdict(m: Machine): string {
  const i = m.indicators;
  return [
    i.compareHigh ? 'high' : '', i.compareEqual ? 'equal' : '', i.compareLow ? 'low' : '',
    i.compareUnequal ? 'unequal' : '',
  ].filter((s) => s !== '').join('+');
}

const TAKEN = 300, NOT_TAKEN = 112, B_UNITS = 500;

describe('`B iiiii bbbbb d` Branch if Character Equal — opcodes.md §2 p.37', () => {
  it('branches when all six bits of the B character equal d', () => {
    const m = charTest('A', 'A');
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'IAR = BI, the taken-branch model of architecture.md §9 row C5').toBe(TAKEN);
    expect(m.regs.aar, 'AAR = BI').toBe(TAKEN);
    expect(m.regs.bar, 'BAR = NSIB').toBe(NOT_TAKEN);
  });

  it('does not branch when they differ, and leaves BAR = B-1', () => {
    const m = charTest('A', 'B');
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'IAR = NSI').toBe(NOT_TAKEN);
    expect(m.regs.aar, 'AAR = BI even on the not-taken path').toBe(TAKEN);
    expect(m.regs.bar, 'BAR = B-1 — the chained-retest-one-lower design').toBe(B_UNITS - 1);
  });

  it('is EXACT equality, not a bit-mask intersection — that is `W` (opcodes.md §2 pp.37-38)', () => {
    // `A` is octal 61 and `1` is octal 01: they share the 1 bit, so `W iiiii bbbbb 1` branches on
    // an `A`. `B iiiii bbbbb 1` must not.
    expect(bcd('A') & bcd('1')).not.toBe(0);
    expect(charTest('1', 'A').step()).toBeUndefined();
    const m = charTest('1', 'A');
    m.step();
    expect(m.regs.iar).toBe(NOT_TAKEN);
  });

  it('word marks do not affect it — a word-marked B character still matches', () => {
    const m = charTest('A', 'A', true);
    expect(m.storage.wm(B_UNITS)).toBe(true);
    m.step();
    expect(m.regs.iar, 'always a one-character test; no word mark is needed or consulted').toBe(TAKEN);
  });

  it('the C bit is not compared — a blank d against a blank B character branches', () => {
    // A stored blank carries its check bit (odd parity over no data bits — storage.ts
    // BLANK_CELL), and `storage.bcd` is the BA8421 view that drops it.
    const m = charTest(' ', ' ');
    expect(m.storage.read(B_UNITS) & C, 'the blank really does carry a check bit').toBe(C);
    m.step();
    expect(m.regs.iar).toBe(TAKEN);
  });

  it('every one of the 64 codes is a legal d — the branch decision is `char === d`', () => {
    for (let d = 0; d < 64; d++) {
      for (let char = 0; char < 64; char++) {
        const m = machineWith(100, 'B0030000500 ');
        m.storage.setChar(111, d, false);          // the d position of the 12-character form
        m.storage.setChar(500, char, false);
        m.step();
        expect(m.regs.iar === TAKEN, `d=${d} char=${char}`).toBe(char === d);
      }
    }
  });
});

describe('`B` sets the compare latch group (opcodes.md §2 `B` row, §8)', () => {
  it('HIGH when the B character collates ABOVE d, LOW when below, EQUAL on a match', () => {
    // The row's own parenthesis: "high if the B character collates above d". The ordering is the
    // collating rank of charset.md §4, so a letter is below every digit whatever the bit values.
    expect(collateRank(bcd('A'))).toBeLessThan(collateRank(bcd('1')));
    expect(verdict(stepped(charTest('1', 'A'))), 'B `A` against d `1`').toBe('low+unequal');
    expect(verdict(stepped(charTest('A', '1'))), 'B `1` against d `A`').toBe('high+unequal');
    expect(verdict(stepped(charTest('A', 'A')))).toBe('equal');
  });

  it('sets them whether or not the branch is taken', () => {
    const taken = stepped(charTest('A', 'A'));
    expect(taken.regs.iar).toBe(TAKEN);
    expect(verdict(taken)).toBe('equal');

    const notTaken = stepped(charTest('A', 'B'));
    expect(notTaken.regs.iar).toBe(NOT_TAKEN);
    expect(verdict(notTaken)).toBe('high+unequal');
  });

  it('resets the previous group — a fresh machine starts low+unequal from computer reset', () => {
    const m = charTest('A', 'A');
    expect(verdict(m), 'the computer-reset state, opcodes.md §8').toBe('low+unequal');
    m.step();
    expect(verdict(m)).toBe('equal');
  });

  it('touches none of the three arithmetic latches', () => {
    const m = charTest('A', 'B');
    m.indicators.setArithOverflow();
    m.indicators.setDivideOverflow();
    m.indicators.setZeroBalance(true);
    m.step();
    expect(m.snapshot().indicators).toMatchObject({
      arithOverflow: true, divideOverflow: true, zeroBalance: true,
    });
  });
});

describe('the three `B` lengths (opcodes.md §2 p.37; research/architecture.md §8)', () => {
  it('costs 4.5(L+2.5+C) — C = 1 only when the branch is taken', () => {
    expect(stepped(charTest('A', 'A')).cpu.microsecondsSimulated).toBe(CYCLE_US * (12 + 2.5 + 1));
    expect(stepped(charTest('A', 'B')).cpu.microsecondsSimulated).toBe(CYCLE_US * (12 + 2.5 + 0));
  });

  it('the L=6 form chains the B-address and reuses the previous op modifier — the retest lands one lower', () => {
    // The not-taken `BAR = B-1` positions the chained retest one position lower, so a
    // 12-character `B` followed by chained 6-character `B`s walks a field backwards
    // (research/architecture.md §9).
    const m = machineWith(100, 'B0040000500 ', 'B00400');
    // The 12-character form carries its own d, a blank, which must NOT match: put a `7` at the
    // B-address so the first test fails, and the `9` the chained retest is looking for one lower.
    m.storage.setChar(500, bcd('7'), false);
    m.storage.setChar(499, bcd('9'), false);
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar).toBe(NOT_TAKEN);
    expect(m.regs.bar, 'BAR stepped one lower').toBe(499);
    expect(m.regs.opMod & BCD6, 'the 12-character form wrote its own blank d').toBe(0);

    // Re-arm the modifier — an `Oabd` read-out has just overwritten it. The chained form takes
    // its B-address from BAR = 00499 and its d from the op-modifier register.
    m.regs.opMod = bcd('9') | C;
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'the chained retest one position lower found the `9`').toBe(400);
    expect(m.regs.bar, 'BAR = NSIB').toBe(118);
    expect(verdict(m)).toBe('equal');
  });

  it('the L=1 form reuses AAR, BAR and the op modifier exactly as they were left', () => {
    const m = machineWith(100, 'B');
    m.regs.aar = 700;                                 // BI, from whatever branch ran before
    m.regs.bar = B_UNITS;
    m.regs.opMod = bcd('4') | C;
    m.storage.setChar(B_UNITS, bcd('4'), false);
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar).toBe(700);
    expect(m.regs.bar, 'BAR = NSIB').toBe(101);
    expect(verdict(m)).toBe('equal');
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (1 + 2.5 + 1));
  });
});

function stepped(m: Machine): Machine {
  expect(m.step()).toBeUndefined();
  return m;
}
