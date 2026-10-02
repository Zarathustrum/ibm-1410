// Tier 1 — `/` Clear Storage and `/ iiiii bbbbb` Clear Storage and Branch, the Wave-3
// flow-chart step 11 executors. opcodes.md §2 p.23 (A22-0526-3); plan §4.2's two `/` rows;
// docs/plans/architecture.md §8 tier 1, which names `/ 12590` as a manual worked example.
//
// The printed semantics: "Clears data AND word marks right-to-left from the B address down to
// and including the nearest hundreds position. `/ 12590` clears 12590-12500. Chained form uses
// current BAR; AAR is not loaded and is undisturbed." Registers `NSI / B / bbb00-1` at L=1/6,
// `NSIB / BI / NSIB` at L=11.

import { describe, it, expect } from 'vitest';

import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { CYCLE_US } from '../src/core/cycles.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { BLANK_CELL, CLEAR_STORAGE_BAR_AT_00000, CoreStorage } from '../src/core/storage.js';
import { BCD6, type Addr } from '../src/core/types.js';

const SIZE = 20_000;

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
  const m = createMachine({ size: SIZE });
  program(m.storage, at, ...instructions);
  m.addressSet(at);
  return m;
}

/** `9` with a word mark in every position of `from..to` — so both halves of "data AND word
 *  marks" have something to clear. */
function fill(m: Machine, from: Addr, to: Addr): void {
  const nine = bcdOfGlyph('9') ?? 0;
  for (let a = from; a <= to; a++) m.storage.setChar(a, nine, true);
}

/** 12590 down to and including 12500 — the hundreds boundary. 91 positions. */
const CLEARED_POSITIONS = 91;

describe('`/ bbbbb` Clear Storage — opcodes.md §2 p.23', () => {
  it('`/ 12590` clears 12590-12500 and leaves BAR 12499 (architecture.md §8 tier 1)', () => {
    const m = machineWith(100, '/12590');
    fill(m, 12_490, 12_600);
    expect(m.step()).toBeUndefined();

    for (let a = 12_500; a <= 12_590; a++) {
      expect(m.storage.read(a), `${a} cleared, data and word mark`).toBe(BLANK_CELL);
      expect(m.storage.wm(a), `${a} word mark`).toBe(false);
    }
    expect(glyphOf(m.storage.read(12_591) & BCD6), '12591, one above the B-address').toBe('9');
    expect(glyphOf(m.storage.read(12_499) & BCD6), '12499, one below the boundary').toBe('9');
    expect(m.storage.wm(12_499), '12499 keeps its word mark too').toBe(true);

    expect(m.regs.bar, 'BAR = bbb00-1 = 12499 — the executor sets it, the row says `special`')
      .toBe(12_499);
    expect(m.regs.aar, 'AAR = B, the row’s own symbol').toBe(12_590);
    expect(m.regs.iar, 'IAR = NSI').toBe(106);
  });

  it('costs 4.5(L+1+B), B being the number of positions cleared', () => {
    const m = machineWith(100, '/12590');
    m.step();
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (6 + 1 + CLEARED_POSITIONS));
  });

  it('a B-address already ON the boundary clears exactly one position', () => {
    const m = machineWith(100, '/12500');
    fill(m, 12_499, 12_501);
    m.step();
    expect(m.storage.read(12_500)).toBe(BLANK_CELL);
    expect(glyphOf(m.storage.read(12_501) & BCD6)).toBe('9');
    expect(glyphOf(m.storage.read(12_499) & BCD6)).toBe('9');
    expect(m.regs.bar).toBe(12_499);
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (6 + 1 + 1));
  });

  it('the chained L=1 form uses the current BAR and does not load AAR', () => {
    // "Chained form uses current BAR; AAR is not loaded and is undisturbed" (§2 p.23). The
    // register row is the same `NSI / B / bbb00-1`, and at length 1 `B` IS the current BAR.
    const m = machineWith(100, '/');
    m.regs.aar = 777;
    m.regs.bar = 12_345;
    fill(m, 12_299, 12_346);
    expect(m.step()).toBeUndefined();
    for (let a = 12_300; a <= 12_345; a++) expect(m.storage.read(a), `${a}`).toBe(BLANK_CELL);
    expect(glyphOf(m.storage.read(12_299) & BCD6), '12299 below the boundary').toBe('9');
    expect(m.regs.bar, 'BAR = 12300-1').toBe(12_299);
    expect(m.regs.aar, 'AAR = the B-address the chain supplied').toBe(12_345);
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (1 + 1 + 46));
  });

  it('`/ 00050` clears 00050-00000 and leaves BAR 99999 — not an address check', () => {
    // The `[unverified]` ruling on `CLEAR_STORAGE_BAR_AT_00000` (storage.ts): `/` "terminates on
    // the hundreds boundary" (opcodes.md §2 p.23), and with `bbb = 000` the boundary IS 00000, so
    // the operation never asks its address register for an address below it —
    // research/architecture.md §4's "addressing 00000 in a decrementing operation stops with an
    // address check" governs addresses the operation USES to reach storage. `bbb00−1` in a
    // five-position address register (architecture.md §6) is 99999.
    // The oracle is CC01A itself: `/ 00000` at 03436, then `G 09185 B` / `G 09181 A` and a
    // zero-balance test against `+0` and `+99999` that halts at 03474/03499 unless AAR reads back
    // 00000 and the low four digits of BAR read back 9999 (oracle/cc01a-halts.ts entry 03436).
    const m = machineWith(100, '/00050');
    fill(m, 0, 60);
    expect(m.step()).toBeUndefined();
    for (let a = 0; a <= 50; a++) {
      expect(m.storage.read(a), `${a} cleared`).toBe(BLANK_CELL);
    }
    expect(glyphOf(m.storage.read(51) & BCD6), '00051, one above the B-address').toBe('9');
    expect(m.regs.bar, 'BAR = the five-digit register wrap of 00000-1').toBe(CLEAR_STORAGE_BAR_AT_00000);
    expect(m.regs.aar, 'AAR = B').toBe(50);
    expect(m.cpu.microsecondsSimulated, '51 positions cleared').toBe(CYCLE_US * (6 + 1 + 51));
  });

  it('`/ 00000` clears exactly 00000, and a later USE of the wrapped BAR still checks', () => {
    // The half of the ruling that keeps §4 intact: 99999 is a register result, not an address `/`
    // touched. A chained `/` that tries to clear FROM it goes through `storage.guard` and stops.
    const m = machineWith(100, '/00000', '/');
    fill(m, 0, 2);
    expect(m.step()).toBeUndefined();
    expect(m.storage.read(0)).toBe(BLANK_CELL);
    expect(glyphOf(m.storage.read(1) & BCD6)).toBe('9');
    expect(m.regs.bar).toBe(CLEAR_STORAGE_BAR_AT_00000);
    expect(m.step(), 'the chained `/` uses that BAR as an address and address-checks').toBe('addressCheck');
  });
});

describe('`/ iiiii bbbbb` Clear Storage and Branch — opcodes.md §2 p.23', () => {
  it('clears the same block, then branches unconditionally to the I-address', () => {
    const m = machineWith(100, '/0030012590');
    fill(m, 12_490, 12_600);
    program(m.storage, 300, 'N1234567');
    expect(m.step()).toBeUndefined();

    for (let a = 12_500; a <= 12_590; a++) expect(m.storage.read(a), `${a}`).toBe(BLANK_CELL);
    expect(glyphOf(m.storage.read(12_591) & BCD6)).toBe('9');
    expect(glyphOf(m.storage.read(12_499) & BCD6)).toBe('9');

    // `NSIB / BI / NSIB`: the branch result REPLACES the clear's `bbb00-1` in BAR, which is
    // what makes `G ccccc B` work after a Clear-Storage-and-Branch like any other taken branch.
    expect(m.regs.iar, 'IAR = BI, the taken-branch model of architecture.md §9 row C5').toBe(300);
    expect(m.regs.aar, 'AAR = BI').toBe(300);
    expect(m.regs.bar, 'BAR = NSIB, not 12499').toBe(111);

    expect(m.step(), 'and the next read-out comes from the branch address').toBeUndefined();
    expect(m.regs.iar).toBe(308);
  });

  it('costs 4.5(L+2+B) — one cycle more than the non-branching form', () => {
    const m = machineWith(100, '/0030012590');
    program(m.storage, 300, 'N1234567');
    m.step();
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (11 + 2 + CLEARED_POSITIONS));
  });

  it('the branch is unconditional — §2 prints no not-taken result, and the row carries none', () => {
    const m = machineWith(100, '/0030012500');
    program(m.storage, 300, 'N1234567');
    m.step();
    expect(m.regs.iar).toBe(300);
  });
});
