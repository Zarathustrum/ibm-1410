// Tier 1 — the Wave-1 word-mark executors: `,` Set Word Mark and `⌑` Clear Word Mark, all
// three forms each. opcodes.md §2 p.22 (A22-0526-3); plan §5 Wave 1, flow-chart step 4.
//
// §2 prints three register results in one cell — 2 addr `NSI / A-1 / B-1`, 1 addr
// `NSI / A-1 / A-1`, chained `NSI / Ap-1 / Bp-1` — so the table carries three forms and this
// file tests three (plan §4.2). The C bit is asserted directly, because the word mark
// participates in the odd-parity total and changing it inverts C (A22-0526-3 p.5).

import { describe, it, expect } from 'vitest';
import { bcdOfGlyph, parity } from '../src/core/bcd.js';
import { CYCLE_US } from '../src/core/cycles.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { C, WM, type Addr } from '../src/core/types.js';

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

/** Data characters at 300 and 400 — `9` (octal 11, an odd number of bits) and `A` (octal 61). */
function machineWith(...instructions: readonly string[]): Machine {
  const m = createMachine({ size: 10_000 });
  program(m.storage, 100, ...instructions);
  m.storage.setChar(300, bcdOfGlyph('9') ?? 0, false);
  m.storage.setChar(400, bcdOfGlyph('A') ?? 0, false);
  m.addressSet(100);
  return m;
}

/** What the cell must read as afterwards: same data bits, word mark as given, C recomputed. */
function expectCell(m: Machine, at: Addr, glyph: string, wm: boolean): void {
  const bits = bcdOfGlyph(glyph) ?? 0;
  expect(m.storage.read(at)).toBe((wm ? WM : 0) | parity(bits, wm) | bits);
  expect(m.storage.wm(at)).toBe(wm);
  expect(m.storage.bcd(at), 'data characters undisturbed').toBe(bits);
}

describe('`, aaaaa bbbbb` Set Word Mark, two addresses (L=11) — opcodes.md §2 p.22', () => {
  it('marks BOTH locations and leaves AAR = A-1, BAR = B-1', () => {
    const m = machineWith(',0030000400');
    expect(m.step()).toBeUndefined();
    expectCell(m, 300, '9', true);
    expectCell(m, 400, 'A', true);
    expect(m.regs.iar).toBe(111);
    expect(m.regs.aar).toBe(299);
    expect(m.regs.bar).toBe(399);
  });

  it('flips the C bit, because the word mark is part of the odd-parity total (p.5)', () => {
    const m = machineWith(',0030000400');
    const before = m.storage.read(300);
    m.step();
    expect(m.storage.read(300)).toBe((before ^ WM) ^ C);
  });

  it('costs 4.5(L+4)', () => {
    const m = machineWith(',0030000400');
    m.step();
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (11 + 4));
  });
});

describe('`, aaaaa` Set Word Mark, one address (L=6) — address-double, opcodes.md §2 p.22', () => {
  // `,` is an address-double op code (§1.4): read-out loads the single address into AAR, BAR,
  // CAR and DAR alike, so the A and B field addresses are the same position (223-2589 p.52).
  it('marks A only and leaves AAR = BAR = A-1', () => {
    const m = machineWith(',00300');
    expect(m.step()).toBeUndefined();
    expectCell(m, 300, '9', true);
    expectCell(m, 400, 'A', false);
    expect(m.regs.iar).toBe(106);
    expect(m.regs.aar).toBe(299);
    expect(m.regs.bar).toBe(299);
  });
});

describe('`,` Set Word Mark, chained (L=1) — opcodes.md §2 p.22, `NSI / Ap-1 / Bp-1`', () => {
  it('marks the addresses the PREVIOUS operation left in AAR and BAR', () => {
    const m = machineWith(',');
    m.regs.aar = 300;
    m.regs.bar = 400;
    expect(m.step()).toBeUndefined();
    expectCell(m, 300, '9', true);
    expectCell(m, 400, 'A', true);
    expect(m.regs.iar).toBe(101);
    expect(m.regs.aar).toBe(299);
    expect(m.regs.bar).toBe(399);
  });

  // The chained form is how `cc01.cor` creates word marks at run time (emulators.md §4.5) and
  // how a two-address Set Word Mark is walked backwards a position at a time.
  it('a second chained `,` marks one position lower again', () => {
    const m = machineWith(',', ',');
    m.storage.setChar(299, bcdOfGlyph('9') ?? 0, false);
    m.storage.setChar(399, bcdOfGlyph('A') ?? 0, false);
    m.regs.aar = 300;
    m.regs.bar = 400;
    m.step();
    m.step();
    expect(m.storage.wm(299)).toBe(true);
    expect(m.storage.wm(399)).toBe(true);
    expect(m.regs.aar).toBe(298);
    expect(m.regs.bar).toBe(398);
  });
});

describe('`⌑` Clear Word Mark — opcodes.md §2 p.22, same three forms, same registers', () => {
  it('two addresses (L=11) clears BOTH and leaves AAR = A-1, BAR = B-1', () => {
    const m = machineWith('⌑0030000400');
    m.storage.setWm(300, true);
    m.storage.setWm(400, true);
    expect(m.step()).toBeUndefined();
    expectCell(m, 300, '9', false);
    expectCell(m, 400, 'A', false);
    expect(m.regs.aar).toBe(299);
    expect(m.regs.bar).toBe(399);
  });

  it('one address (L=6) clears A only, leaving AAR = BAR = A-1', () => {
    const m = machineWith('⌑00300');
    m.storage.setWm(300, true);
    m.storage.setWm(400, true);
    expect(m.step()).toBeUndefined();
    expectCell(m, 300, '9', false);
    expectCell(m, 400, 'A', true);
    expect(m.regs.aar).toBe(299);
    expect(m.regs.bar).toBe(299);
  });

  it('chained (L=1) clears at the previous AAR / BAR, leaving Ap-1 / Bp-1', () => {
    const m = machineWith('⌑');
    m.storage.setWm(300, true);
    m.storage.setWm(400, true);
    m.regs.aar = 300;
    m.regs.bar = 400;
    expect(m.step()).toBeUndefined();
    expectCell(m, 300, '9', false);
    expectCell(m, 400, 'A', false);
    expect(m.regs.aar).toBe(299);
    expect(m.regs.bar).toBe(399);
  });

  it('clearing a position that carries no word mark is a no-op, C included', () => {
    const m = machineWith('⌑00300');
    const before = m.storage.read(300);
    m.step();
    expect(m.storage.read(300)).toBe(before);
  });
});
