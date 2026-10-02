// Tier 1 — the manual's own worked indexing example, executed end to end (plan §5 Wave 4;
// docs/plans/architecture.md §4.2, §8 tier 1).
//
// research/architecture.md §5, from A22-0526-3 p.15, verbatim: "A-address `009Z6` = 00996 tagged
// IR1; IR1 contains `0001J` = −00011; effective address = 00985."
//
// Wave 1 built the decode half of that (test/address.test.ts). This file is the OTHER half: an
// instruction whose effect is visible in storage, so the effective address is proved by where the
// machine actually wrote — not by reading a register the same code just loaded. `, 009Z6` is the
// cheapest such instruction: Set Word Mark, one address, no operand fields to arrange
// (research/opcodes.md §2 p.22).

import { describe, it, expect } from 'vitest';

import { bcdOfGlyph } from '../src/core/bcd.js';
import { CYCLE_US, INDEX_US } from '../src/core/cycles.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import type { Addr } from '../src/core/types.js';

function bcd(glyph: string): number {
  const code = bcdOfGlyph(glyph);
  if (code === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return code;
}

const AT = 100;                       // where every instruction in this file is loaded
const IR_BASE = 20, IR_WIDTH = 5;     // IRn occupies 00020+5n … 00024+5n — A22-0526-3 p.14 Fig. 9

/**
 * A machine holding one instruction at 00100, word-marked on its op code and terminated by the
 * word mark that belongs to the next one.
 */
function machineWith(text: string): Machine {
  const m = createMachine({ size: 10_000 });
  [...text].forEach((glyph, i) => m.storage.setChar(AT + i, bcd(glyph), i === 0));
  m.storage.setWm(AT + text.length, true);
  m.addressSet(AT);
  return m;
}

/**
 * Load index register `n` from five glyphs. They are ordinary storage positions — "programs can
 * read/write them with any instruction" — and the factor's SIGN is the zone of its own units
 * position: B alone is minus, none or B+A is plus (research/architecture.md §5).
 */
function loadIndexRegister(m: Machine, n: number, text: string): void {
  const base = IR_BASE + IR_WIDTH * n;
  [...text].forEach((glyph, i) => m.storage.setChar(base + i, bcd(glyph), false));
}

/** Every position in core carrying a word mark, so "and nowhere else" is a real assertion. */
function wordMarks(m: Machine): Addr[] {
  const out: Addr[] = [];
  for (let a = 0; a < m.storage.size; a++) if (m.storage.wm(a)) out.push(a);
  return out;
}

// The instruction's own two marks: the one over its op code, and the one that terminated
// read-out (which belongs to whatever would follow it).
const OWN_MARKS = [AT, AT + 6];

describe('A22-0526-3 p.15: `009Z6` tagged IR1 = `0001J` → effective 00985', () => {
  it('`, 009Z6` sets the word mark at 00985 and nowhere else', () => {
    // `009Z6`: `Z` is octal 31 — the A zone over a 9 — so the tens position carries the A-over-tens
    // tag bit (weight 1 = IR1) and the address magnitude is 00996. `0001J`: `J` is octal 41 — the
    // B zone over a 1 — so the factor is 00011 and its sign is minus. 00996 − 00011 = 00985.
    const m = machineWith(',009Z6');
    loadIndexRegister(m, 1, '0001J');

    expect(m.step()).toBeUndefined();
    expect(wordMarks(m)).toEqual([...OWN_MARKS, 985].sort((x, y) => x - y));
    expect(m.storage.wm(996), 'the untagged magnitude is NOT where it landed').toBe(false);
  });

  it('leaves AAR and BAR at A−1 of the EFFECTIVE address (opcodes.md §2 p.22, `,` L=6)', () => {
    const m = machineWith(',009Z6');
    loadIndexRegister(m, 1, '0001J');
    m.step();
    expect(m.regs.iar, 'IAR = NSI').toBe(AT + 6);
    expect(m.regs.aar).toBe(984);
    expect(m.regs.bar, '`,` is address-double: the single address is both A and B').toBe(984);
  });

  it('never modifies the instruction image — the addition happens in the address register', () => {
    // research/architecture.md §5: "the 5-digit index factor is added algebraically AFTER the
    // address enters the address register; the instruction image in storage is never modified."
    const m = machineWith(',009Z6');
    loadIndexRegister(m, 1, '0001J');
    m.step();
    expect([...',009Z6'].map((_, i) => m.storage.bcd(AT + i)))
      .toEqual([...',009Z6'].map(bcd));
    expect([...'0001J'].map((_, i) => m.storage.bcd(25 + i))).toEqual([...'0001J'].map(bcd));
  });

  it('charges INDEX_US = 34.5 µs once, for the one address indexed (A22-0526-3 p.15)', () => {
    expect(INDEX_US).toBe(34.5);
    const indexed = machineWith(',009Z6');
    loadIndexRegister(indexed, 1, '0001J');
    indexed.step();
    // `,` at L=6 costs 4.5(L+4) — opcodes.md §2 p.22.
    expect(indexed.cpu.microsecondsSimulated).toBe(CYCLE_US * (6 + 4) + INDEX_US);

    // The same instruction with an UNTAGGED address costs the same minus the index cycle.
    const plain = machineWith(',00996');
    plain.step();
    expect(plain.cpu.microsecondsSimulated).toBe(CYCLE_US * (6 + 4));
    expect(plain.storage.wm(996)).toBe(true);
  });

  it('charges it once PER ADDRESS INDEXED — a two-address instruction with both tagged pays twice', () => {
    // `, 009Z6 009Z6` marks the same effective position twice; what this asserts is the CHARGE.
    const m = machineWith(',009Z6009Z6');
    loadIndexRegister(m, 1, '0001J');
    expect(m.step()).toBeUndefined();
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (11 + 4) + 2 * INDEX_US);
    expect(wordMarks(m)).toEqual([AT, AT + 11, 985].sort((x, y) => x - y));
  });
});

describe('the sign of the index factor is the zone of ITS OWN units position', () => {
  // research/architecture.md §5 (A22-0526-3 pp.14-15): "The factor's sign comes from the zone bits
  // of its own units position (B = minus; none or BA = plus). Zone bits in the index register are
  // left undisturbed and ignored except in the units (sign) position."
  const CASES: readonly (readonly [string, string, Addr])[] = [
    ['0001J', 'B zone alone over the units — MINUS 00011', 985],
    ['00011', 'no zone at all over the units — PLUS 00011', 1007],
    ['0001A', 'B+A over the units (`A` = octal 61) — also PLUS 00011', 1007],
  ];

  for (const [factor, why, effective] of CASES) {
    it(`IR1 = \`${factor}\`: ${why} → 00996 becomes ${String(effective).padStart(5, '0')}`, () => {
      const m = machineWith(',009Z6');
      loadIndexRegister(m, 1, factor);
      expect(m.step()).toBeUndefined();
      expect(wordMarks(m)).toEqual([...OWN_MARKS, effective].sort((x, y) => x - y));
    });
  }

  it('ignores word marks and interior zones inside the index register', () => {
    // "Word marks anywhere in 00025-00099 are ignored during indexing" — same source. `‡` is the
    // record mark, octal 32: the A zone over an 8-2, which the address-character table reads as
    // the digit 0 (research/architecture.md §4).
    const m = machineWith(',009Z6');
    loadIndexRegister(m, 1, '‡0‡1J');
    m.storage.setWm(25, true);
    m.storage.setWm(28, true);
    expect(m.step()).toBeUndefined();
    expect(m.storage.wm(985), 'still −00011, zones and marks and all').toBe(true);
  });
});

describe('indexing does not touch the arithmetic overflow latch (A22-0526-3 p.15)', () => {
  it('leaves it exactly as it found it — neither set nor reset by the index addition', () => {
    // research/opcodes.md §8: "Indexing does not set arithmetic overflow even if the index
    // addition overflows." Nor does it clear one already on — only `J (I) Z` and computer reset
    // do that — so the test drives both directions.
    const on = machineWith(',009Z6');
    loadIndexRegister(on, 1, '0001J');
    on.indicators.setArithOverflow();
    on.step();
    expect(on.snapshot().indicators.arithOverflow, 'an overflow already on survives').toBe(true);

    const off = machineWith(',009Z6');
    loadIndexRegister(off, 1, '99999');   // 00996 + 99999 = 100995, well past the top of core
    expect(off.step(), 'an indexed result outside installed storage is an address-check STOP')
      .toBe('addressCheck');
    expect(off.snapshot().indicators.arithOverflow, 'and still no arithmetic overflow').toBe(false);
    expect(off.cpu.lastCheck?.message).toContain('100995');
  });
});
