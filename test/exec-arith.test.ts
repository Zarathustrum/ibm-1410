// Tier 1 — the Wave-3 arithmetic executors: `A` Add and `S` Subtract, both forms.
// opcodes.md §2 pp.17-18 (A22-0526-3), §1.2 chaining, §1.3 register symbols, §1.4 the
// address-double one-field form, §1.5 the E and R timing terms, §8 the indicators.
// Plan §4.1 (the chaining worked example), §4.3, §5 Wave 3.

import { describe, it, expect } from 'vitest';
import { digitOf, signOf } from '../src/core/alu.js';
import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { CYCLE_US } from '../src/core/cycles.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { ZA, ZB, type Addr } from '../src/core/types.js';

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

type Zone = 'none' | 'BA' | 'B' | 'A';
const ZONE_BITS: Readonly<Record<Zone, number>> = { none: 0, BA: ZB | ZA, B: ZB, A: ZA };

/** A numeric field ending at its units position, word-marked on the high-order position. */
function field(s: CoreStorage, units: Addr, digits: string, zone: Zone = 'none'): void {
  const n = digits.length;
  [...digits].forEach((glyph, i) => {
    const bits = code(glyph);
    s.setChar(units - n + 1 + i, i === n - 1 ? ZONE_BITS[zone] | (bits & 0x0f) : bits, i === 0);
  });
}

function readField(s: CoreStorage, units: Addr, n: number): string {
  let out = '';
  for (let i = n - 1; i >= 0; i--) out += String(digitOf(s.read(units - i)));
  return out + signOf(s.read(units));
}

function machine(...instructions: readonly string[]): Machine {
  const m = createMachine({ size: 10_000 });
  program(m.storage, 100, ...instructions);
  m.addressSet(100);
  return m;
}

// ═══ The manual's own chaining example — A22-0526-3 p.12, opcodes.md §1.2 ══

describe('`A 05985 06985` then a chained `S` — opcodes.md §1.2 (A22-0526-3 p.12)', () => {
  // "A 05985 06985 with a 5-character A field and a 6-character B field leaves AAR = 05980 and
  // BAR = 06979, and the following 1-character S causes the data at location 05980 to be
  // subtracted from the data at 06979" — TWO DISTINCT FIELDS. A 1-character arithmetic op is
  // the two-field form with the previous registers, never the address-double one-field form,
  // which is the 6-character `A aaaaa` (opcodes.md §1.4).
  function chained(): Machine {
    const m = machine('A0598506985', 'S');
    field(m.storage, 5_985, '00123');          // 05981-05985, word mark at 05981
    field(m.storage, 6_985, '000456');         // 06980-06985, word mark at 06980
    field(m.storage, 5_980, '0008');           // 05977-05980, the NEXT field down
    field(m.storage, 6_979, '0012');           // 06976-06979
    return m;
  }

  it('leaves AAR = 05980 and BAR = 06979 — A−LW and B−LB (opcodes.md §1.3)', () => {
    const m = chained();
    expect(m.step()).toBeUndefined();
    expect(readField(m.storage, 6_985, 6)).toBe('000579+');
    expect(m.regs.aar, 'A − LW, LW = LA = 5 because A is the shorter field').toBe(5_980);
    expect(m.regs.bar, 'B − LB, LB = 6').toBe(6_979);
  });

  it('and the 1-character `S` subtracts 05980 from 06979 — two fields, not one', () => {
    const m = chained();
    m.step();
    expect(m.step()).toBeUndefined();
    expect(readField(m.storage, 6_979, 4), '12 − 8').toBe('0004+');
    expect(readField(m.storage, 5_980, 4), 'the A field is never written').toBe('0008+');
    expect(m.regs.aar).toBe(5_976);
    expect(m.regs.bar).toBe(6_975);
  });

  it('the chained form is NOT the one-field form: the A field is not subtracted from itself', () => {
    const m = chained();
    m.step();
    m.step();
    // The address-double one-field `S aaaaa` would have zeroed 05980's field. It did not.
    expect(readField(m.storage, 5_980, 4)).not.toBe('0000+');
  });
});

// ═══ Timing — opcodes.md §1.5 Figure 7, §1.4's caveat ══════════════════════

describe('timing — `4.5(L+1+E+A+1.5B+1.5RB)`, opcodes.md §2 p.17', () => {
  it('a chained 1-character `A` costs E=1 (opcodes.md §1.4, §1.5, plan §10)', () => {
    const m = machine('A0030200402', 'A');
    field(m.storage, 302, '123');              // 300-302
    field(m.storage, 402, '456');              // 400-402
    field(m.storage, 299, '12');               // 298-299 — where the first A leaves AAR
    field(m.storage, 399, '34');               // 398-399 — and BAR
    m.step();
    const afterFirst = m.cpu.microsecondsSimulated;
    expect(afterFirst, 'the 11-character form has E=0').toBe(CYCLE_US * (11 + 1 + 0 + 3 + 4.5));

    m.step();
    const chained = m.cpu.microsecondsSimulated - afterFirst;
    // L=1, E=1, A=2, B=2, R=0. Figure 7 gives E=1 for a single-character add; the One-Field
    // line's `L = 1 or 6` with no E term is editorial carryover and is one cycle short here.
    expect(chained).toBe(CYCLE_US * (1 + 1 + 1 + 2 + 3));
    expect(chained, 'and not the E=0 value').not.toBe(CYCLE_US * (1 + 1 + 0 + 2 + 3));
    expect(readField(m.storage, 399, 2), 'it really did the add').toBe('46+');
  });

  it('the one-field form costs `4.5(L+1+A+1.5A)` — A22-0526-3 pp.17-18', () => {
    const m = machine('A00302');
    field(m.storage, 302, '123');
    m.step();
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (6 + 1 + 3 + 4.5));
  });
});

// ═══ Indicators — opcodes.md §8 ════════════════════════════════════════════

describe('indicators after add and subtract — opcodes.md §8 (A22-0526-3 p.53)', () => {
  it('`A` sets arithmetic overflow on a carry out of the high-order B position', () => {
    const m = machine('A0030200402');
    field(m.storage, 302, '900');
    field(m.storage, 402, '200');
    m.step();
    expect(readField(m.storage, 402, 3), 'the carry is lost').toBe('100+');
    expect(m.indicators.arithOverflow).toBe(true);
    expect(m.indicators.zeroBalance).toBe(false);
  });

  it('`S` sets zero balance when the fields cancel, and the next non-zero result clears it', () => {
    const m = machine('S0030200402', 'S0030200402');
    field(m.storage, 302, '123');
    field(m.storage, 402, '123');
    m.step();
    expect(readField(m.storage, 402, 3)).toBe('000+');
    expect(m.indicators.zeroBalance).toBe(true);

    field(m.storage, 302, '001');
    m.step();                                  // 000 − 001 = −001
    expect(readField(m.storage, 402, 3)).toBe('001-');
    expect(m.indicators.zeroBalance).toBe(false);
  });

  it('`S aaaaa` zeroes its field, sets zero balance, and sets NO overflow', () => {
    const m = machine('S00302');
    field(m.storage, 302, '123');
    expect(m.step()).toBeUndefined();
    expect(readField(m.storage, 302, 3)).toBe('000+');
    expect(m.indicators.zeroBalance).toBe(true);
    // opcodes.md §2's `S` L=6 row lists ZERO BALANCE ONLY, while the `A` L=6 row lists both.
    // That asymmetry is real, not a transcription slip: subtracting a field from itself is a
    // complement add of two equal magnitudes, and a complement add's carry out of the
    // high-order position is the "B was the greater or equal value" signal — the thing that
    // says NO recomplement is needed — not a result exceeding the B word mark. There is
    // nothing for an overflow to be raised by (opcodes.md §4.3, §8; A22-0526-3 p.53).
    expect(m.indicators.arithOverflow).toBe(false);
  });
});

// ═══ The registers-after column — opcodes.md §2 pp.17-18 ═══════════════════

describe('registers after — the table\'s own `regs` column (plan §4.2)', () => {
  it('`A` two fields: NSI / A−LW / B−LB', () => {
    const m = machine('A0030200402');
    field(m.storage, 302, '123');
    field(m.storage, 402, '4567');             // 399-402, B longer: LW = LA = 3
    m.step();
    expect(m.regs.iar).toBe(111);
    expect(m.regs.aar).toBe(299);
    expect(m.regs.bar, 'B − LB, LB = 4').toBe(398);
  });

  it('`A aaaaa` one field: NSI / A−LA / A−LA, and the field doubles in place', () => {
    const m = machine('A00302');
    field(m.storage, 302, '123');
    m.step();
    expect(m.regs.iar).toBe(106);
    expect(m.regs.aar).toBe(299);
    expect(m.regs.bar).toBe(299);
    // Nothing develops a sign here: a true add takes the sign the field already carries
    // (opcodes.md §4.1 p.16, §4.3 Figure 12), so the unzoned units stays unzoned — `6`, not the
    // 12-zoned `F`. `note1410.txt` 02344 is the same instruction over `015` and leaves `030`.
    expect(glyphOf(m.storage.bcd(302)), 'the units zone is left as it was').toBe('6');
    expect(readField(m.storage, 302, 3)).toBe('246+');
  });
});
