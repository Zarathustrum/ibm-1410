// Tier 1 — `G ccccc d` Store Address Register, the Wave-3 flow-chart step 6 executor.
// opcodes.md §2 p.22 (A22-0526-3); research/architecture.md §5 (not indexable), §6 (the
// register set, and "retranslated to BCD when stored out by G"); plan §4.2 the `G` row.
//
// Every assertion here is one clause of that one printed row:
//   "Stores the named register's 5 characters into the C field; the C-address is the RIGHTMOST
//    position of the destination. Uses the C-address register, so AAR IS NOT DISTURBED. Cannot
//    be indexed. Word marks in the C field have no effect; zones in the C field are not
//    disturbed. E and F hold tape addresses in overlap mode. `G ccccc B` after a taken branch
//    is the 1410's subroutine-return mechanism."

import { describe, it, expect } from 'vitest';

import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { T_STORE_ADDRESS_REGISTER_US } from '../src/core/cycles.js';
import { ADDRESS_CHARACTERS } from '../src/core/isa/exec/control.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { BCD6, WM, ZA, ZB, type Addr } from '../src/core/types.js';

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

/** The five glyphs the C field holds, high-order first — what `G` is judged on. */
function fieldAt(m: Machine, c: Addr): string {
  let out = '';
  for (let i = ADDRESS_CHARACTERS - 1; i >= 0; i--) out += glyphOf(m.storage.read(c - i) & BCD6);
  return out;
}

describe('`G ccccc d` Store Address Register — opcodes.md §2 p.22', () => {
  // The four base-machine d-characters of the §2 row: `A` AAR, `B` BAR, `E` E-register,
  // `F` F-register. Each is stored as five plain decimal characters (research/architecture.md
  // §6: address characters are "retranslated to BCD when stored out by G").
  const CASES: readonly [string, 'aar' | 'bar' | 'ear' | 'far', number, string][] = [
    ['A', 'aar', 1234, '01234'],
    ['B', 'bar', 107, '00107'],
    ['E', 'ear', 9, '00009'],
    ['F', 'far', 78_090, '78090'],
  ];

  for (const [d, register, value, expected] of CASES) {
    it(`d = \`${d}\` stores the ${register.toUpperCase()} as ${expected}`, () => {
      const m = machineWith(100, `G00500${d}`);
      m.regs[register] = value;
      expect(m.step()).toBeUndefined();
      expect(fieldAt(m, 500)).toBe(expected);
    });
  }

  it('stores five characters ENDING at the C-address — C-4..C, and C+1 is untouched', () => {
    const m = machineWith(100, 'G00500A');
    m.regs.aar = 12_345;
    // A sentinel either side: the row's "rightmost position of the destination" means the
    // units digit lands ON the C-address, so 00495 and 00501 must both survive.
    m.storage.setChar(495, bcdOfGlyph('*') ?? 0, false);
    m.storage.setChar(501, bcdOfGlyph('*') ?? 0, false);
    m.step();
    expect(fieldAt(m, 500)).toBe('12345');
    expect(glyphOf(m.storage.read(495) & BCD6), '00495, one left of the field').toBe('*');
    expect(glyphOf(m.storage.read(501) & BCD6), '00501, one right of the C-address').toBe('*');
  });

  it('AAR and BAR are NOT disturbed — the §2 row is `NSI / Ap / Bp`', () => {
    const m = machineWith(100, 'G00500A');
    m.regs.aar = 4321;
    m.regs.bar = 8765;
    m.step();
    expect(m.regs.aar, 'AAR: the C-address went to CAR, never through AAR').toBe(4321);
    expect(m.regs.bar, 'BAR').toBe(8765);
    expect(m.regs.car, 'CAR holds the C-address — decode.ts `isG`').toBe(500);
    expect(m.regs.iar, 'IAR = NSI').toBe(107);
  });

  it('does not disturb the ZONES already in the C field ("zones … are not disturbed")', () => {
    const m = machineWith(100, 'G00500B');
    m.regs.bar = 996;
    // 00996 tagged with index register 1: the A bit over the tens position, i.e. what a
    // programmer already wrote into the I-address of a tagged `J iiiii ␣`
    // (research/architecture.md §5). `G` replaces the 8421 portion and leaves the tag standing.
    m.storage.setChar(499, ZA | 0o02, false);           // tens position, A-over-tens = IR1
    m.step();
    expect(fieldAt(m, 500), 'digits, with the tens character now reading `Z` = A + 9').toBe('009Z6');
    expect(m.storage.read(499) & (ZB | ZA), 'the index tag survives').toBe(ZA);
  });

  it('word marks in the C field have no effect and are not disturbed', () => {
    const m = machineWith(100, 'G00500A');
    m.regs.aar = 11_111;
    m.storage.setWm(498, true);                          // in the middle of the destination
    m.step();
    expect(fieldAt(m, 500), 'the store ran straight through the word mark').toBe('11111');
    expect(m.storage.wm(498), 'and left it set').toBe(true);
    // Parity is odd over BA8421 + WM, so the check bit had to be recomputed around it
    // (research/architecture.md §2, A22-0526-3 p.5).
    const cell = m.storage.read(498);
    let bits = 0;
    for (let b = cell; b !== 0; b >>= 1) bits += b & 1;
    expect(bits & 1, 'odd parity across the word-marked character').toBe(1);
  });

  it('cannot be indexed: `G 009Z6 B` stores into 00996 and costs no index cycle', () => {
    // "x-control fields (I/O) and G (Store Address Register) instructions cannot be indexed"
    // (research/architecture.md §5, A22-0526-3 pp.11, 22). `Z` over the tens position would be
    // an IR1 tag on any other op; here the tag is forced to 0 and only the digit 9 is read.
    const m = machineWith(100, 'G009Z6B');
    m.regs.bar = 2222;
    m.storage.setChar(25, bcdOfGlyph('9') ?? 0, false);  // IR1 = 99999, ignored
    m.step();
    expect(m.regs.car, 'C-address = 00996, untagged').toBe(996);
    expect(fieldAt(m, 996)).toBe('02222');
    expect(m.cpu.microsecondsSimulated, 'no 34.5 µs index cycle').toBe(T_STORE_ADDRESS_REGISTER_US);
  });

  it('costs a flat 69.75 µs — a constant, not a Figure 7 formula', () => {
    const m = machineWith(100, 'G00500A');
    m.step();
    expect(m.cpu.microsecondsSimulated).toBe(69.75);
  });

  it('`G ccccc B` after a taken branch captures the return address', () => {
    // The subroutine-return mechanism of opcodes.md §2.1 and p.12: a taken branch leaves NSIB
    // in BAR, and `G ccccc B` at the head of the subroutine stores it into the I-address of a
    // trailing `J iiiii ␣`. Here `J 00300 ` at 00100 branches, and the `G 00206 B` at 00300
    // writes 00107 over the five characters at 00202-00206.
    const m = machineWith(100, 'J00300 ');
    program(m.storage, 300, 'G00206B');
    program(m.storage, 200, 'J00000 ');
    m.step();                                   // the branch
    expect(m.regs.bar, 'BAR = NSIB').toBe(107);
    m.step();                                   // the G
    expect(fieldAt(m, 206), 'the trailing J now returns to 00107').toBe('00107');
  });

  it('an undefined d-character is an Instruction Check — UNDEFINED_G_D_CHAR_IS_INSTRUCTION_CHECK', () => {
    // OPEN (control.ts): §2 p.22 names `A B E F` (+ the feature-only `T`) and is silent on the
    // rest, so `G` follows the `J` precedent — an undecodable op modifier stops the machine.
    const m = machineWith(100, 'G00500X');
    m.regs.aar = 1;
    expect(m.step()).toBe('instructionCheck');
    expect(m.cpu.lastCheck?.message).toContain('undefined G d-character');
    expect(fieldAt(m, 500), 'nothing was stored').toBe('     ');
  });

  it('`G ccccc T` is the Program Addressable Clock feature, not the base machine', () => {
    // opcodes.md §9.4 / G22-6654: d = `T` stores the real-time clock. "Not base 1410."
    const m = machineWith(100, 'G00500T');
    expect(m.step()).toBe('unimplementedOp');
    expect(m.cpu.lastCheck?.message).toContain('Program Addressable Clock');
  });

  it('the E and F registers read 00000 on a machine with no processing overlap', () => {
    // research/architecture.md §6: EAR/FAR are the channel 1 / channel 2 I/O address registers
    // and hold tape addresses in OVERLAP mode. This configuration has no overlap (io.md §1), so
    // they are real registers that nothing loads — `G ccccc E` stores five zeros, honestly.
    const m = machineWith(100, 'G00500E', 'G00507F');
    m.step();
    m.step();
    expect(fieldAt(m, 500)).toBe('00000');
    expect(fieldAt(m, 507)).toBe('00000');
  });

  it('the word mark on the op code is what ends read-out — the store never sets one', () => {
    const m = machineWith(100, 'G00500A');
    m.regs.aar = 55_555;
    m.step();
    for (let a = 496; a <= 500; a++) {
      expect(m.storage.wm(a), `no word mark at ${a}`).toBe(false);
      expect(m.storage.read(a) & WM, `WM bit at ${a}`).toBe(0);
    }
  });
});
