import { describe, it, expect } from 'vitest';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { INDEX_US } from '../src/core/cycles.js';
import { applyFields, classifyForm, fetch, pickForm } from '../src/core/decode.js';
import { opByChar, selectForm } from '../src/core/isa/table.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { disassemble, formatL1, formatL2, formatL3Latch } from '../src/core/trace.js';
import { CoreStorage } from '../src/core/storage.js';
import { BCD6, type Addr } from '../src/core/types.js';

// Lay instructions into real core: a word mark over each op code and nowhere else, which is the
// only thing the 1411 uses to find a length (research/architecture.md §7, A22-0526-3 p.11). The
// trailing halt supplies the word mark that terminates the last instruction — the same rule the
// manual states for the last instruction in a program (opcodes.md §2 `.` row).
function program(s: CoreStorage, at: Addr, ...instructions: readonly string[]): void {
  let p = at;
  for (const text of [...instructions, '.']) {
    [...text].forEach((glyph, i) => {
      const code = bcdOfGlyph(glyph);
      if (code === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
      s.setChar(p + i, code, i === 0);
    });
    p += text.length;
  }
}

// 80K, because the sample addresses below (11111, 22222, 33333) are real addresses that have to
// be inside installed storage: `resolveIndex` address-checks an untagged field naming a position
// the machine does not have (research/architecture.md §4, A22-0526-3 p.8). Tests that need a
// small machine build their own.
function machineWith(at: Addr, ...instructions: readonly string[]): Machine {
  const m = createMachine({ size: 80_000 });
  program(m.storage, at, ...instructions);
  m.addressSet(at);
  return m;
}

/** Decode one instruction and nothing else — `note1410.txt`'s mode, emulators.md §5.2. */
const decodeOne = (m: Machine) => m.step({ execute: false });

describe('read-out — scan to the next word mark (research/architecture.md §7, A22-0526-3 p.11)', () => {
  it('instruction-checks when the op code carries no word mark', () => {
    const m = createMachine({ size: 10_000 });
    m.storage.setChar(100, bcdOfGlyph('A') ?? 0, false);
    m.addressSet(100);
    expect(decodeOne(m)).toBe('instructionCheck');
    expect(m.cpu.lastCheck?.message).toBe('no word mark on op code');
  });

  it('instruction-checks an undefined op code — BCD of `3`, and of `1`', () => {
    for (const glyph of ['3', '1']) {
      const m = machineWith(100, glyph);
      expect(decodeOne(m), glyph).toBe('instructionCheck');
      expect(m.cpu.lastCheck?.message).toBe('undefined op code');
    }
  });

  it('scans a 14-character `N` — the scan has NO length cap (plan §9 risk row; §2 N row "any")', () => {
    const m = machineWith(100, 'N1234567890123');
    expect(fetch(m.storage, 100).chars.length).toBe(14);
    expect(decodeOne(m)).toBeUndefined();
    expect(m.regs.iar).toBe(114);
  });

  it('address-checks when the scan runs off the end of installed storage (§9 row C1)', () => {
    const m = createMachine({ size: 10_000 });
    m.storage.setChar(9_990, bcdOfGlyph('A') ?? 0, true);   // no further word mark anywhere
    m.addressSet(9_990);
    expect(decodeOne(m)).toBe('addressCheck');
  });

  it('leaves IAR at NSI, the address of the next word mark', () => {
    const m = machineWith(100, 'A1111122222');
    expect(decodeOne(m)).toBeUndefined();
    expect(m.regs.iar).toBe(111);
  });
});

describe('the two op-modifier traps (A22-0526-3 p.12, via opcodes.md §1.2)', () => {
  it('an 11-character two-address instruction BLANKS the register, so a chained `D aaaaa` sees a blank d', () => {
    const m = machineWith(100, 'A1111122222', 'D33333');
    m.regs.opMod = bcdOfGlyph('W') ?? 0;             // something the trap has to clear
    expect(decodeOne(m)).toBeUndefined();
    expect(m.regs.opMod & BCD6).toBe(0);             // blanked by the 11-character `A`
    expect(decodeOne(m)).toBeUndefined();
    expect(m.regs.opMod & BCD6).toBe(0);             // and the 6-character `D` reuses that blank
  });

  it('a 12-character `D aaaaa bbbbb d` leaves its d, and a chained `D aaaaa` REUSES it', () => {
    const m = machineWith(100, 'D1111122222W', 'D33333');
    expect(decodeOne(m)).toBeUndefined();
    expect(m.regs.opMod & BCD6).toBe(bcdOfGlyph('W'));
    expect(decodeOne(m)).toBeUndefined();
    expect(m.regs.opMod & BCD6).toBe(bcdOfGlyph('W'));   // the 6-character form supplies none
  });
});

describe('the address-double rule (opcodes.md §1.4 / 223-2589 p.52)', () => {
  it('`A aaaaa` at L=6 sets AAR = BAR = CAR = DAR — the field operates on itself', () => {
    const m = machineWith(100, 'A33333');
    expect(decodeOne(m)).toBeUndefined();
    expect([m.regs.aar, m.regs.bar, m.regs.car, m.regs.dar]).toEqual([33_333, 33_333, 33_333, 33_333]);
  });

  it('`C aaaaa` at L=6 is NOT address-double: AAR = CAR = A, BAR chained, DAR ← BAR', () => {
    const m = machineWith(100, 'C1111122222', 'C33333');
    expect(decodeOne(m)).toBeUndefined();
    expect(decodeOne(m)).toBeUndefined();
    expect(m.regs.aar).toBe(33_333);
    expect(m.regs.car).toBe(33_333);
    expect(m.regs.bar).toBe(22_222);                 // left by the previous E phase
    expect(m.regs.dar).toBe(22_222);                 // the D cycle restores DAR == BAR
  });

  it('`J iiiii b` at L=7 is address-double too: AAR = BAR = CAR = DAR = the I-address', () => {
    // opcodes.md §1.4 puts `J R X` in the address-double set, and 223-2589 p.52 says the address
    // "is read into AAR, BAR, CAR and DAR simultaneously" — which is what makes §2's not-taken
    // register row for all three read `NSI / BI / BI` rather than `NSI / BI / Bp`.
    const m = machineWith(100, 'J11111 ');
    expect(decodeOne(m)).toBeUndefined();
    expect([m.regs.aar, m.regs.bar, m.regs.car, m.regs.dar])
      .toEqual([11_111, 11_111, 11_111, 11_111]);
  });

  it('`G ccccc d` reaches CAR alone — AAR is not disturbed (opcodes.md §2 G row, p.22)', () => {
    // `G` is percent-type (§1.2) and its §2 register column is `NSI / Ap / Bp`: "Uses the
    // C-address register, so AAR is not disturbed".
    const m = machineWith(100, 'G22222A');
    m.regs.aar = 33_333;
    m.regs.bar = 44_444;
    expect(decodeOne(m)).toBeUndefined();
    expect(m.regs.car).toBe(22_222);
    expect(m.regs.aar).toBe(33_333);
    expect(m.regs.bar).toBe(44_444);
  });

  it('a chained `S` after `A 05985 06985` still addresses TWO fields (A22-0526-3 p.12)', () => {
    const m = machineWith(100, 'A0598506985', 'S');
    expect(decodeOne(m)).toBeUndefined();
    expect(decodeOne(m)).toBeUndefined();
    // Decode level only: the arithmetic values 05980 / 06979 are the E phase's, Wave 3's.
    expect(m.regs.aar).toBe(5_985);
    expect(m.regs.bar).toBe(6_985);
    expect(m.regs.aar).not.toBe(m.regs.bar);
  });
});

describe('the length table is a CHECK (opcodes.md §1.1, 223-2589 p.53)', () => {
  it('`R` and `X` accept 7 only — never a chained 1 or a 6', () => {
    for (const [op, seven] of [['R', 'R33333D'], ['X', 'X22222B']] as const) {
      expect(decodeOne(machineWith(100, op)), `${op} at 1`).toBe('instructionCheck');
      expect(decodeOne(machineWith(100, `${op}33333`)), `${op} at 6`).toBe('instructionCheck');
      expect(decodeOne(machineWith(100, seven)), `${op} at 7`).toBeUndefined();
    }
  });

  it('`D` and `T` reject 2, 7 and 11 — the documented SimH latitude (opcodes.md §1.1 length table and the note closing §3.3)', () => {
    for (const op of ['D', 'T']) {
      expect(decodeOne(machineWith(100, `${op}A`)), `${op} at 2`).toBe('instructionCheck');
      expect(decodeOne(machineWith(100, `${op}11111A`)), `${op} at 7`).toBe('instructionCheck');
      expect(decodeOne(machineWith(100, `${op}1111122222`)), `${op} at 11`).toBe('instructionCheck');
      expect(decodeOne(machineWith(100, `${op}1111122222A`)), `${op} at 12`).toBeUndefined();
    }
    expect(decodeOne(machineWith(100, 'A1111122222'))).toBeUndefined();   // 11 IS legal for `A`
  });

  it('a 1-character chained `J` is a LEGAL form (plan §7 tier 0, the named positive test)', () => {
    const m = machineWith(100, 'J');
    expect(decodeOne(m)).toBeUndefined();
    expect(m.cpu.lastStop).toBeUndefined();
    expect(classifyForm(opByChar('J')!, selectForm(opByChar('J')!, 1)!, 1)).toBe('O');
  });

  it('`J` picks its form by the d-character, because both §2 rows print lengths [1, 7]', () => {
    const j = opByChar('J')!;
    expect(pickForm(j, 7, bcdOfGlyph(' ') ?? 0)?.semantics).toContain('Unconditionally');
    expect(pickForm(j, 7, bcdOfGlyph('Z') ?? 0)?.semantics).toContain('Conditionally');
    expect(decodeOne(machineWith(100, 'J11111 '))).toBeUndefined();
    expect(decodeOne(machineWith(100, 'J11111Z'))).toBeUndefined();
  });
});

describe('indexing happens at read-out (research/architecture.md §5, A22-0526-3 pp.14-15)', () => {
  it('counts one index cycle per indexed address; `009Z6` tagged IR1 = `0001J` gives 00985', () => {
    const s = new CoreStorage(10_000);
    program(s, 100, 'A009Z6009Z6');
    [...'0001J'].forEach((g, i) => s.setChar(25 + i, bcdOfGlyph(g) ?? 0, false));   // IR1
    const entry = opByChar('A')!;
    const fetched = fetch(s, 100);
    const regs = createMachine({ size: 10_000 }).regs;
    const shape = classifyForm(entry, selectForm(entry, fetched.chars.length)!, fetched.chars.length);
    const effects = applyFields(entry, shape, fetched, regs, s);
    expect(effects.indexed).toBe(2);
    expect(effects.indexed * INDEX_US).toBe(69);
    expect([regs.aar, regs.bar]).toEqual([985, 985]);
  });

  it('`G` is the exception: `G 009Z6 B` loads 00996, not 00985, and charges no index cycle', () => {
    // "x-control fields (I/O) and G (Store Address Register) instructions cannot be indexed"
    // (research/architecture.md §5, A22-0526-3 pp.11, 22; opcodes.md §2 G row, "Cannot be
    // indexed"). Same characters and the same IR1 as the p.15 worked example above, so the only
    // thing separating 00996 from 00985 here is the op code: the `Z` over the tens position is
    // read as the digit 9, not as a tag.
    const s = new CoreStorage(10_000);
    program(s, 100, 'G009Z6B');
    [...'0001J'].forEach((g, i) => s.setChar(25 + i, bcdOfGlyph(g) ?? 0, false));   // IR1 = -00011
    const entry = opByChar('G')!;
    const fetched = fetch(s, 100);
    const regs = createMachine({ size: 10_000 }).regs;
    regs.aar = 3_333;
    const shape = classifyForm(entry, selectForm(entry, fetched.chars.length)!, fetched.chars.length);
    const effects = applyFields(entry, shape, fetched, regs, s);
    expect(effects.indexed).toBe(0);
    expect(effects.indexed * INDEX_US).toBe(0);      // no 34.5 µs index cycle
    expect(regs.car).toBe(996);
    expect(regs.aar).toBe(3_333);
  });
});

describe('unimplemented ops decode but do not dispatch (plan §5, the Wave-0 PLAN-DEVIATION)', () => {
  // Phase 1b Wave D built `E`, the last of the five. NO op is now owed by BUILD ORDER, so the
  // `laterWaves` list this loop used to carry is gone rather than left empty; every op below
  // decodes-but-does-not-dispatch because it is not in THIS CONFIGURATION (a feature or another
  // machine), which is a different reason and is what remains true (phase-1b.md §4).
  const notThisConfiguration = [
    ['Y', 'Y11111A'], ['U', 'U%B0U'], ['2', '2D'], ['4', '4C'], ['P', 'PA'],
    ['Q', 'QA'], ['$', '$11111D'], ['=', '#'], ['X', 'X22222B'],
  ] as const;
  // `=` is the 7010's name for octal 13 (opcodes.md §9.3); on a 1410 A2 chain that code prints
  // as `#` (research/charset.md §2 rank 20), so `#` is what goes into core.

  for (const [op, text] of notThisConfiguration) {
    it(`\`${op}\` decodes with execute:false and stops with unimplementedOp on execute`, () => {
      expect(decodeOne(machineWith(100, text)), op).toBeUndefined();
      const m = machineWith(100, text);
      expect(m.step(), op).toBe('unimplementedOp');
      const entry = opByChar(op)!;
      expect(m.cpu.lastCheck?.message).toContain(`op '${op}'`);
      expect(m.cpu.lastCheck?.message).toContain(selectForm(entry, text.length)!.cite);
    });
  }
});

describe('trace line shapes (plan §6.2 — tools/trace-diff.ts matches on them)', () => {
  it('formatL1 reproduces the plan\'s step line character for character', () => {
    expect(formatL1({
      iar: 2_194, aar: 1_250, bar: 0, opChar: 'M', dGlyph: 'W',
      length: 10, cycles: 49.5, text: 'M %T0 01250 W',
    })).toBe('I 02194  A 01250  B 00000  OP M  D W  LEN 10  CY 49.5   # M %T0 01250 W');
  });

  it('disassemble splits `O xxx bbbbb d` at its four field boundaries', () => {
    const cells = Uint8Array.from([...'M%T001250W'].map((g) => bcdOfGlyph(g) ?? 0));
    expect(disassemble('Oxxxbd', cells)).toBe('M %T0 01250 W');
  });

  it('formatL2 reproduces the plan\'s three decode lines', () => {
    expect(formatL2({
      addr: 100, form: 'Oab', length: 11, opChar: 'A', aar: 11_111, bar: 22_222,
      touched: true, addressDouble: true, dCycle: false, status: 'OK',
    })).toBe('D 00100  FORM Oab   LEN 11  OP A  AAR 11111 BAR 22222 DBL=1  OK');
    expect(formatL2({
      addr: 111, form: 'Oa', length: 6, opChar: 'A', aar: 33_333, bar: 33_333,
      touched: true, addressDouble: true, dCycle: false, status: 'OK',
    })).toBe('D 00111  FORM Oa    LEN  6  OP A  AAR 33333 BAR 33333 DBL=1  OK');
    expect(formatL2({
      addr: 117, form: 'O', length: 1, opChar: 'A', aar: 0, bar: 0,
      touched: false, addressDouble: true, dCycle: true, status: 'OK',
    })).toBe('D 00117  FORM O     LEN  1  OP A  AAR=prev BAR=prev  Dcycle  OK');
  });

  it('formatL3Latch reproduces the plan\'s three latch lines (Wave 3 fills the records)', () => {
    expect(formatL3Latch({
      kind: 'scan', addr: 2_300, opChar: 'A', scan: 'scan1', unit: 'units',
      Ac: 0, Bc: 0, cin: 0, cout: 0, zb: 1, ovf: 0, a: '5', b: '3', r: '8',
    })).toBe('02300 A  scan1 units  Ac=0 Bc=0 cin=0 cout=0 zb=1 ovf=0  a=5 b=3 → 8');
    expect(formatL3Latch({
      kind: 'scan', addr: 2_300, opChar: 'A', scan: 'scan1', unit: 'body',
      Ac: 0, Bc: 0, cin: 0, cout: 1, zb: 0, ovf: 0, a: '7', b: '4', r: '1',
    })).toBe('02300 A  scan1 body   Ac=0 Bc=0 cin=0 cout=1 zb=0 ovf=0  a=7 b=4 → 1');
    expect(formatL3Latch({
      kind: 'end', addr: 2_300, opChar: 'A', zb: 0, ovf: 0, result: 'B=00812+',
    })).toBe('02300 A  end          zb=0 ovf=0  B=00812+');
  });
});
