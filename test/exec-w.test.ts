// Tier 1 — `W` Branch if Bit Equal, the Wave-3 flow-chart step 7 executor.
// opcodes.md §2 pp.37-38 (A22-0526-3); research/architecture.md §9 (the `B-1` not-taken BAR);
// plan §4.2, the `B W V` row.
//
// The whole printed rule, verbatim: "Branches if ANY bit of the B-address character matches ANY
// bit of d. Word-mark and C (parity) bits are not compared and word marks cannot be tested."
// There is no §6 sub-table for `W` — §6 gives one for `J`, one for `R`/`X` and one for `V`, and
// none for `W`, because every one of the 64 codes is a legal mask. The §2 indicator column is
// empty: unlike `B`, `W` touches none of the four compare latches.

import { describe, it, expect } from 'vitest';

import { bcdOfGlyph } from '../src/core/bcd.js';
import { CYCLE_US } from '../src/core/cycles.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { BCD6, C, type Addr, type IndicatorName } from '../src/core/types.js';

function program(s: CoreStorage, at: Addr, ...instructions: readonly string[]): void {
  let p = at;
  for (const text of instructions) {
    [...text].forEach((glyph, i) => {
      const code = bcdOfGlyph(glyph);
      if (code === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
      s.setChar(p + i, code, i === 0);
    });
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

/** `W 00300 00500 d` at 00100, with `glyph` sitting at the B-address 00500. */
function bitTest(d: string, glyph: string, wordMark = false): Machine {
  const m = machineWith(100, `W0030000500${d}`);
  m.storage.setChar(500, bcdOfGlyph(glyph) ?? 0, wordMark);
  return m;
}

const ALL_INDICATORS: readonly IndicatorName[] = [
  'arithOverflow', 'zeroBalance', 'divideOverflow',
  'compareHigh', 'compareEqual', 'compareLow', 'compareUnequal',
];

describe('`W iiiii bbbbb d` Branch if Bit Equal — opcodes.md §2 pp.37-38', () => {
  it('branches when ANY bit of the B character matches ANY bit of d', () => {
    // `A` is octal 61 = B + A + 1; d = `1` is octal 01. One bit in common — the 1 bit.
    const m = bitTest('1', 'A');
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'IAR = BI, the taken-branch model of architecture.md §9 row C5').toBe(300);
    expect(m.regs.aar, 'AAR = BI').toBe(300);
    expect(m.regs.bar, 'BAR = NSIB').toBe(112);
  });

  it('does not branch when no bit is in common, and leaves BAR = B-1', () => {
    // `A` = B + A + 1 against d = `2` (octal 02): the 2 bit is absent from `A`.
    const m = bitTest('2', 'A');
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'IAR = NSI').toBe(112);
    expect(m.regs.aar, 'AAR = BI even on the not-taken path').toBe(300);
    expect(m.regs.bar, 'BAR = B-1 — the chained-retest-one-lower design').toBe(499);
  });

  it('a plural mask branches on any one of its bits — `3` = the 1 and 2 bits', () => {
    expect(bitTest('3', 'A').step()).toBeUndefined();
    expect(bitTest('3', 'A').regs.iar).toBe(100);   // fresh machine, not yet stepped
    const taken = bitTest('3', 'A');
    taken.step();
    expect(taken.regs.iar).toBe(300);
  });

  it('the group mark, octal 77, tests all six bits — everything but the blank branches', () => {
    const anything = bitTest('⧧', 'S');             // `S` = octal 22
    anything.step();
    expect(anything.regs.iar).toBe(300);

    // The blank is octal 00: NO bits at all, so nothing intersects it. Its stored cell still
    // carries the C bit (odd parity over zero data bits — storage.ts BLANK_CELL), and the row
    // says the C bit is not compared, so this must NOT branch.
    const blank = bitTest('⧧', ' ');
    expect(blank.storage.read(500) & C, 'the blank really does carry a check bit').toBe(C);
    blank.step();
    expect(blank.regs.iar, 'no bits in common — the C bit is not compared').toBe(112);
  });

  it('a blank d-character has no bits, so it never branches', () => {
    const m = bitTest(' ', '⧧');                    // every data bit on at the B address
    m.step();
    expect(m.regs.iar, 'a legal, useless instruction — not an Instruction Check').toBe(112);
  });

  it('word marks cannot be tested: a word-marked blank does not branch', () => {
    // Contrast `V iiiii bbbbb 1`, which exists precisely to branch on that word mark
    // (opcodes.md §6.3). `W` sees BA8421 only.
    const m = bitTest('⧧', ' ', true);
    expect(m.storage.wm(500)).toBe(true);
    m.step();
    expect(m.regs.iar, 'the word-mark bit is not part of the mask').toBe(112);
  });

  it('touches none of the seven latches — the §2 indicator column is empty', () => {
    for (const d of ['1', '2']) {                   // one taken, one not taken
      const m = bitTest(d, 'A');
      const before = m.indicators.snapshot();
      m.step();
      const after = m.indicators.snapshot();
      for (const name of ALL_INDICATORS) {
        expect(after[name], `${name} after \`W … ${d}\``).toBe(before[name]);
      }
    }
  });

  it('costs 4.5(L+2.5+C) — C = 1 only when the branch is taken', () => {
    const taken = bitTest('1', 'A');
    taken.step();
    expect(taken.cpu.microsecondsSimulated).toBe(CYCLE_US * (12 + 2.5 + 1));

    const notTaken = bitTest('2', 'A');
    notTaken.step();
    expect(notTaken.cpu.microsecondsSimulated).toBe(CYCLE_US * (12 + 2.5 + 0));
  });

  it('the L=6 form chains the B-address and reuses the previous op modifier', () => {
    // research/architecture.md §8: "a 6-character form supplies only the A/I-address, chains the
    // B-address, and reuses the last previous operation modifier". Combined with the not-taken
    // `BAR = B-1`, a 12-character `W` followed by chained 6-character `W`s walks a field
    // backwards one position per test — which is what the `B-1` is for (§9).
    const m = machineWith(100, 'W0040000500 ', 'W00400');
    m.storage.setChar(500, bcdOfGlyph(' ') ?? 0, false);   // no bits — first test fails
    m.storage.setChar(499, bcdOfGlyph('9') ?? 0, false);   // octal 11 — the 1 bit is there
    m.regs.opMod = (bcdOfGlyph('1') ?? 0) | C;             // the modifier the chained form reuses

    // The 12-character form carries its OWN d, a blank, and does not branch.
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar).toBe(112);
    expect(m.regs.bar, 'BAR stepped one lower').toBe(499);
    expect(m.regs.opMod & BCD6, 'the 12-character form wrote its own blank d').toBe(0);

    // Re-arm the modifier: an `Oabd` read-out has just overwritten it. The chained form takes
    // its B-address from BAR = 00499 and its d from the op-modifier register.
    m.regs.opMod = (bcdOfGlyph('1') ?? 0) | C;
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'the chained retest one position lower found the 1 bit').toBe(400);
    expect(m.regs.bar, 'BAR = NSIB').toBe(118);
  });

  it('the L=1 form reuses AAR, BAR and the op modifier exactly as they were left', () => {
    const m = machineWith(100, 'W');
    m.regs.aar = 700;                                // BI, from whatever branch ran before
    m.regs.bar = 500;
    m.regs.opMod = (bcdOfGlyph('4') ?? 0) | C;       // octal 04
    m.storage.setChar(500, bcdOfGlyph('4') ?? 0, false);
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar).toBe(700);
    expect(m.regs.bar, 'BAR = NSIB').toBe(101);
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (1 + 2.5 + 1));
  });

  it('every one of the 64 codes is a legal mask — the branch decision is `(char & d) !== 0`', () => {
    // Written as an exhaustive sweep rather than a table, because there IS no table: §6 has a
    // sub-table for `J`, `R`/`X` and `V` and none for `W`.
    for (let d = 0; d < 64; d++) {
      for (let char = 0; char < 64; char++) {
        const m = machineWith(100, 'W0030000500 ');
        m.storage.setChar(111, d, false);            // the d position of the 12-character form
        m.storage.setChar(500, char, false);
        m.step();
        const branched = m.regs.iar === 300;
        expect(branched, `d=${d} char=${char}`).toBe((char & d & BCD6) !== 0);
      }
    }
  });
});
