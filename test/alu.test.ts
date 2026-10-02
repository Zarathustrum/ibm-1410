// Tier 1 — `src/core/alu.ts`, the add-to-storage pass behind `A` and `S`.
// Machine facts: research/architecture.md §10; research/opcodes.md §4.1-§4.3, §8;
// research/charset.md §6.2 — A22-0526-3 pp.16-18, Figures 11-12. Plan §5 Wave 3, §6.2.
//
// Everything here goes through a real instruction, because the pass is only correct in the
// context read-out puts it in: the address-double 6-character form makes the field operate on
// itself, and the 11-character form's two fields have their own word marks. Results are read
// back as PRINT GLYPHS wherever a zone bit is the point — `??!` is the manual's own answer for
// the one-field subtract, and only the glyph shows that the zeros carry their zones.

import { describe, it, expect } from 'vitest';
import { L3_LATCHES_SAMPLED_AFTER_CYCLE, digitOf, signOf, type Sign } from '../src/core/alu.js';
import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { ZA, ZB, type Addr, type LatchTraceRecord } from '../src/core/types.js';

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

/** Instructions laid end to end from `at`, each word-marked on its op code. */
function program(s: CoreStorage, at: Addr, ...instructions: readonly string[]): void {
  let p = at;
  for (const text of instructions) {
    [...text].forEach((glyph, i) => s.setChar(p + i, code(glyph), i === 0));
    p += text.length;
  }
  s.setWm(p, true);
}

/** The four sign zones of A22-0526-3 p.16 Figure 11 — minus is B alone. */
type Zone = 'none' | 'BA' | 'B' | 'A';
const ZONE_BITS: Readonly<Record<Zone, number>> = { none: 0, BA: ZB | ZA, B: ZB, A: ZA };
const NUMERIC = 0x0f;

/**
 * A numeric field ending at its UNITS position, word-marked on the high-order position, with
 * `zone` written over the units digit as the sign. Fields are addressed at their units end
 * (research/architecture.md §10).
 */
function field(s: CoreStorage, units: Addr, digits: string, zone: Zone = 'none'): void {
  const n = digits.length;
  [...digits].forEach((glyph, i) => {
    const bits = code(glyph);
    s.setChar(units - n + 1 + i, i === n - 1 ? ZONE_BITS[zone] | (bits & NUMERIC) : bits, i === 0);
  });
}

/** A field written as literal characters — for the zone cases the manual states as glyphs. */
function chars(s: CoreStorage, units: Addr, text: string): void {
  const n = text.length;
  [...text].forEach((glyph, i) => s.setChar(units - n + 1 + i, code(glyph), i === 0));
}

/** `n` positions ending at `units`, as print glyphs. */
function glyphs(s: CoreStorage, units: Addr, n: number): string {
  let out = '';
  for (let i = n - 1; i >= 0; i--) out += glyphOf(s.bcd(units - i));
  return out;
}

/** The field as the adder sees it: digits, then the sign of its units position. */
function readField(s: CoreStorage, units: Addr, n: number): string {
  let out = '';
  for (let i = n - 1; i >= 0; i--) out += String(digitOf(s.read(units - i)));
  return out + signOf(s.read(units));
}

const A_UNITS = 302;
const B_UNITS = 402;

/**
 * `A 00xxx 00yyy` or `S 00xxx` over fields the caller has already written.
 *
 * The level-3 tracer is not decoration: `CycleStep.record` is the L3 latch trace's and is built
 * only when a tracer is attached (`alu.ts`, `types.ts` `CycleStep`) — an untraced pass takes the
 * same storage cycles and yields `undefined` on each. `recordsOf` below reads the records, so
 * every machine here asks for them. The sink drops the formatted line; this file asserts on the
 * RECORDS, and the two tests at the bottom assert on the lines.
 */
function machineWith(instruction: string): Machine {
  const m = createMachine({ size: 10_000, tracer: { level: 3, sink: () => {} } });
  program(m.storage, 100, instruction);
  m.addressSet(100);
  return m;
}

/** Drive one instruction a storage cycle at a time, keeping every latch record it yields. */
function recordsOf(m: Machine): LatchTraceRecord[] {
  const out: LatchTraceRecord[] = [];
  for (;;) {
    const cycle = m.stepCycle();
    if (cycle.record !== undefined) out.push(cycle.record);
    if (cycle.complete) return out;
  }
}

// ═══ Digit coding — A22-0526-3 p.16, charset.md §6.2 ═══════════════════════

describe('digit coding — opcodes.md §4.2 / charset.md §6.2 (A22-0526-3 p.16)', () => {
  it('every special the research names codes as it says', () => {
    const cases: readonly [string, number, string][] = [
      [' ', 0, 'blank becomes zero'],
      ['&', 0, 'zone bits only'],
      ['-', 0, 'zone bits only'],
      ['ƀ', 0, 'substitute blank — zone bits only'],
      ['⧧', 7, 'group mark: 8 bit dropped, "7 (421) if zones are stripped"'],
      ['#', 3, '# (821) becomes 3'],
      ['@', 4, '8-4 drops the 8'],
      [':', 5, '8-4-1 drops the 8'],
      ['>', 6, '8-4-2 drops the 8'],
      ['√', 7, '8-4-2-1 drops the 8'],
      ['.', 3, '8-2-1 drops the 8'],
      ['⌑', 4, '8-4 drops the 8'],
      ['0', 0, '8-2 IS the digit zero'],
      ['?', 0, 'plus zero'],
      ['!', 0, 'minus zero'],
      ['‡', 0, 'record mark — numeric bits are a digit'],
      ['/', 1, 'used directly'],
      ['A', 1, 'letters are used at face value'],
      ['I', 9, 'letters are used at face value'],
      ['J', 1, 'letters are used at face value'],
      ['Q', 8, 'letters are used at face value'],
      ['9', 9, 'numerals'],
    ];
    for (const [glyph, digit, why] of cases) {
      expect(digitOf(code(glyph)), `${glyph}: ${why}`).toBe(digit);
    }
  });

  it('zones play no part — `D` (12-4) and `M` (11-4) and `4` all code as 4', () => {
    for (const glyph of ['D', 'M', 'U', '4']) expect(digitOf(code(glyph))).toBe(4);
  });

  it('the sign is the units zone, and only B alone is minus (p.16 Figure 11)', () => {
    const signs: readonly [Zone, Sign][] = [['none', '+'], ['BA', '+'], ['B', '-'], ['A', '+']];
    for (const [zone, sign] of signs) {
      expect(signOf(ZONE_BITS[zone] | 5), `zone ${zone}`).toBe(sign);
    }
  });
});

// ═══ True add — A22-0526-3 p.17 ════════════════════════════════════════════

describe('`A aaaaa bbbbb` true add — like signs, opcodes.md §4.3 Figure 12', () => {
  it('adds A into B right to left, sum in B, no carry', () => {
    const m = machineWith('A0030200402');
    field(m.storage, A_UNITS, '123');
    field(m.storage, B_UNITS, '456');
    expect(m.step()).toBeUndefined();
    expect(readField(m.storage, B_UNITS, 3)).toBe('579+');
    expect(readField(m.storage, A_UNITS, 3), 'the A field is not modified').toBe('123+');
  });

  it('carries between positions', () => {
    const m = machineWith('A0030200402');
    field(m.storage, A_UNITS, '155');
    field(m.storage, B_UNITS, '456');
    m.step();
    expect(readField(m.storage, B_UNITS, 3)).toBe('611+');
  });

  it('two minus fields stay minus (Figure 12 row 4)', () => {
    const m = machineWith('A0030200402');
    field(m.storage, A_UNITS, '123', 'B');
    field(m.storage, B_UNITS, '456', 'B');
    m.step();
    expect(readField(m.storage, B_UNITS, 3)).toBe('579-');
  });
});

// ═══ Complement add and recomplement — p.16 Figure 12, §4.3 ════════════════

describe('complement add — unlike signs, opcodes.md §4.3', () => {
  it('a carry out means B was the greater value: 12 + (−8) = 4, sign of B', () => {
    const m = machineWith('A0030200402');
    field(m.storage, A_UNITS, '08', 'B');
    field(m.storage, B_UNITS, '12');
    m.step();
    expect(readField(m.storage, B_UNITS, 2)).toBe('04+');
    // The carry out of a COMPLEMENT add is the "B was greater" signal, never an overflow
    // (research/architecture.md §10; A22-0526-3 p.53 — overflow is add/subtract only, and only
    // when the result exceeds the limit set by the B word mark).
    expect(m.indicators.arithOverflow).toBe(false);
  });

  it('no carry out takes the RECOMPLEMENT pass: 5 + (−8) = −3, sign of A', () => {
    const m = machineWith('A0030200402');
    field(m.storage, A_UNITS, '08', 'B');
    field(m.storage, B_UNITS, '05');
    m.step();
    expect(readField(m.storage, B_UNITS, 2)).toBe('03-');
    expect(glyphs(m.storage, B_UNITS, 2), 'minus written as B alone over the units').toBe('0L');
    expect(m.indicators.arithOverflow).toBe(false);
  });

  it('the recomplement is a SECOND scan over B — scan3, with the B Complement latch on', () => {
    const m = machineWith('A0030200402');
    field(m.storage, A_UNITS, '08', 'B');
    field(m.storage, B_UNITS, '05');
    const records = recordsOf(m);
    const scans = records.filter((r) => r.kind === 'scan');
    expect(scans.map((r) => (r.kind === 'scan' ? r.scan : '')))
      .toEqual(['scan1', 'scan1', 'scan3', 'scan3']);
    for (const r of scans) {
      if (r.kind !== 'scan') continue;
      expect(r.scan === 'scan1' ? r.Ac : r.Bc, 'A complement on scan 1, B complement on scan 3')
        .toBe(1);
    }
  });

  it('and it costs the R term: 4.5(L+1+E+A+1.5B+1.5RB) — opcodes.md §1.5', () => {
    const withR = machineWith('A0030200402');
    field(withR.storage, A_UNITS, '08', 'B');
    field(withR.storage, B_UNITS, '05');
    withR.step();

    const withoutR = machineWith('A0030200402');
    field(withoutR.storage, A_UNITS, '08', 'B');
    field(withoutR.storage, B_UNITS, '12');
    withoutR.step();

    expect(withR.cpu.microsecondsSimulated).toBe(4.5 * (11 + 1 + 0 + 2 + 1.5 * 2 + 1.5 * 2));
    expect(withoutR.cpu.microsecondsSimulated).toBe(4.5 * (11 + 1 + 0 + 2 + 1.5 * 2));
  });
});

// ═══ Field lengths — A22-0526-3 pp.17-18 ═══════════════════════════════════

describe('field length is governed by the B word mark — research/architecture.md §10', () => {
  it('A shorter than B: the EXTENSION phase carries zeros into the high-order positions', () => {
    const m = machineWith('A0030200403');
    field(m.storage, A_UNITS, '12');          // 301-302, word mark at 301
    field(m.storage, 403, '4567');            // 400-403, word mark at 400
    m.step();
    expect(readField(m.storage, 403, 4)).toBe('4579+');
    const records = recordsOf(machineOf('A0030200403', '12', '4567'));
    expect(records.filter((r) => r.kind === 'scan').map((r) => (r.kind === 'scan' ? r.unit : '')))
      .toEqual(['units', 'body', 'extension', 'extension']);
  });

  it('A shorter than B: LW is the SHORTER length, so AAR = A − LA (opcodes.md §1.3)', () => {
    const m = machineWith('A0030200403');
    field(m.storage, A_UNITS, '12');
    field(m.storage, 403, '4567');
    m.step();
    expect(m.regs.aar, 'A − LW, LW = LA = 2').toBe(300);
    expect(m.regs.bar, 'B − LB, LB = 4').toBe(399);
  });

  it('A longer than B: the excess high-order A positions are never read, and it is NOT an error', () => {
    const m = machineWith('A0030300401');
    field(m.storage, 303, '1234');            // 300-303, word mark at 300
    field(m.storage, 401, '56');              // 400-401, word mark at 400
    expect(m.step()).toBeUndefined();
    expect(readField(m.storage, 401, 2), '56 + 34, the 12 is not processed').toBe('90+');
    // "If A is longer than B, the excess high-order A positions are simply not processed — not
    // an error" (research/architecture.md §10), and overflow needs a carry out of the HIGH-ORDER
    // B position, which this has not got (opcodes.md §8).
    expect(m.indicators.arithOverflow).toBe(false);
    expect(m.regs.aar, 'the machine never learns LA, so LW = LB = 2').toBe(301);
  });
});

// ═══ Indicators — opcodes.md §8, A22-0526-3 p.53 ═══════════════════════════

describe('indicators — opcodes.md §8 (A22-0526-3 pp.17, 53)', () => {
  it('arithmetic overflow: a carry out of the high-order B position in a TRUE add', () => {
    const m = machineWith('A0030000400');
    field(m.storage, 300, '5');
    field(m.storage, 400, '6');
    m.step();
    expect(readField(m.storage, 400, 1), 'the carry is lost').toBe('1+');
    expect(m.indicators.arithOverflow).toBe(true);
  });

  it('zero balance is ON for a zero result and OFF for the next non-zero one', () => {
    const m = machineWith('A0030200402');
    field(m.storage, A_UNITS, '123');
    field(m.storage, B_UNITS, '123', 'B');    // unlike signs → complement add, exact cancel
    m.step();
    expect(readField(m.storage, B_UNITS, 3)).toBe('000-');
    expect(m.indicators.zeroBalance).toBe(true);
    expect(m.indicators.arithOverflow, 'the cancelling carry is not an overflow').toBe(false);

    const next = machineWith('A0030200402');
    next.indicators.setZeroBalance(true);
    field(next.storage, A_UNITS, '001');
    field(next.storage, B_UNITS, '000');
    next.step();
    expect(next.indicators.zeroBalance, 'the next arithmetic op with a non-zero result').toBe(false);
  });
});

// ═══ Zones — A22-0526-3 pp.16-17 ═══════════════════════════════════════════

describe('zones — B body preserved, A ignored, the sign developed over the units', () => {
  it('B zone bits are unchanged except in the sign position: `ABC` + 111 → `BCD`', () => {
    const m = machineWith('A0030200402');
    field(m.storage, A_UNITS, '111');
    chars(m.storage, B_UNITS, 'ABC');         // digits 1 2 3, every position 12-zoned
    m.step();
    expect(glyphs(m.storage, B_UNITS, 3)).toBe('BCD');
  });

  it('A zone bits are ignored except the units: `ABC` as the A field adds 123', () => {
    const m = machineWith('A0030200402');
    chars(m.storage, A_UNITS, 'ABC');         // units zone BA = plus
    field(m.storage, B_UNITS, '456');
    m.step();
    expect(readField(m.storage, B_UNITS, 3)).toBe('579+');
  });

  it('a result that KEEPS the B sign leaves the units zone exactly as it found it', () => {
    // "When the machine develops or CHANGES a sign, plus is always written as B+A and minus as a
    // B bit alone" (opcodes.md §4.1 p.16) — the condition is load-bearing. A true add takes the
    // sign both fields already carry (Figure 12), so nothing is developed and the unzoned units
    // of `456` stays unzoned: `579`, not `57I`. This is `note1410.txt` 02300 — "B field 10006 is
    // 100 / Result is 199" — and eight more cases with it.
    const plus = machineWith('A0030200402');
    field(plus.storage, A_UNITS, '123');      // no zone at all — plus, as is `456`
    field(plus.storage, B_UNITS, '456');
    plus.step();
    expect(glyphs(plus.storage, B_UNITS, 3)).toBe('579');
    expect(signOf(plus.storage.read(B_UNITS)), 'and it is still a plus field').toBe('+');

    // An A-only zone (the 0 zone) is plus too, and equally untouched.
    const azone = machineWith('A0030200402');
    field(azone.storage, A_UNITS, '123');
    field(azone.storage, B_UNITS, '456', 'A');
    azone.step();
    expect(glyphs(azone.storage, B_UNITS, 3)).toBe('57Z');   // 9 with an 0 zone

    const minus = machineWith('A0030200402');
    field(minus.storage, A_UNITS, '123', 'B');
    field(minus.storage, B_UNITS, '456', 'B');
    minus.step();
    expect(glyphs(minus.storage, B_UNITS, 3)).toBe('57R');   // 9 with an 11 zone
  });

  it('a result that CHANGES the sign writes it: B+A for plus, B alone for minus', () => {
    // The recomplement is the only path on which the result takes the A field's sign (Figure 12's
    // "sign of the greater value" against a B field of the other sign), and it is therefore the
    // only path that writes a sign at all.
    const toMinus = machineWith('A0030200402');
    field(toMinus.storage, A_UNITS, '08', 'B');   // −8 onto +5 → −3
    field(toMinus.storage, B_UNITS, '05');
    toMinus.step();
    expect(glyphs(toMinus.storage, B_UNITS, 2), 'minus is a B bit alone').toBe('0L');

    const toPlus = machineWith('A0030200402');
    field(toPlus.storage, A_UNITS, '12');         // +12 onto −5 → +7
    field(toPlus.storage, B_UNITS, '05', 'B');
    toPlus.step();
    expect(glyphs(toPlus.storage, B_UNITS, 2), 'plus is written B+A, never as no zone').toBe('0G');
  });
});

// ═══ One field, and Subtract — pp.17-19 ════════════════════════════════════

describe('the one-field forms — address-double, opcodes.md §1.4 / §2 pp.17-19', () => {
  it('`A aaaaa` image-adds the field to itself (doubling)', () => {
    const m = machineWith('A00302');
    field(m.storage, A_UNITS, '123');
    m.step();
    // `note1410.txt` 02344 is this instruction: one field at 10023, 015 doubled to 030 — the
    // one-field row's "zones and sign configuration unchanged" is exact, so `246`, not `24F`.
    expect(glyphs(m.storage, A_UNITS, 3), '246, the units zone left as it was').toBe('246');
    expect(m.regs.aar, 'NSI / A−LA / A−LA').toBe(299);
    expect(m.regs.bar).toBe(299);
  });

  it('`S aaaaa` subtracts the field from itself: the manual\'s `ABQ` becomes `??!`', () => {
    // A22-0526-3 p.18, transcribed at opcodes.md §2 `S` L=6: "Zone bits and sign configuration
    // unchanged (example: A-field ABQ becomes ??!)". `A` and `B` are 12-zoned 1 and 2, `Q` is
    // 11-zoned 8 — a minus field of 128. The body zones survive the zeros (`?` is 12-zoned
    // zero) and the units keeps its minus B bit (`!` is 11-zoned zero).
    const m = machineWith('S00302');
    chars(m.storage, A_UNITS, 'ABQ');
    expect(m.step()).toBeUndefined();
    expect(glyphs(m.storage, A_UNITS, 3)).toBe('??!');
    expect(m.indicators.zeroBalance).toBe(true);
    // The `S` L=6 row lists ZERO BALANCE ONLY — no arithmetic overflow. A field subtracted from
    // itself is a complement add of equal magnitudes, whose carry out is the "B was the greater
    // or equal" signal, so there is nothing an overflow could be raised by (opcodes.md §2, §8).
    expect(m.indicators.arithOverflow).toBe(false);
  });

  it('Subtract is Add with the A sign inverted first (opcodes.md §4.3)', () => {
    const sub = machineWith('S0030200402');
    field(sub.storage, A_UNITS, '08');         // plus
    field(sub.storage, B_UNITS, '12');
    sub.step();

    const add = machineWith('A0030200402');
    field(add.storage, A_UNITS, '08', 'B');    // the same magnitude, minus
    field(add.storage, B_UNITS, '12');
    add.step();

    expect(readField(sub.storage, B_UNITS, 2)).toBe('04+');
    expect(readField(sub.storage, B_UNITS, 2)).toBe(readField(add.storage, B_UNITS, 2));
  });
});

// ═══ The generator — plan §6.2, §8 demo 2 ══════════════════════════════════

describe('the pass is one record per B position, plus `end` — plan §6.2', () => {
  it('a three-digit add yields exactly the three scan lines and the end line', () => {
    const m = machineWith('A0030200402');
    field(m.storage, A_UNITS, '123');
    field(m.storage, B_UNITS, '456');
    expect(recordsOf(m)).toEqual([
      {
        kind: 'scan', addr: 100, opChar: 'A', scan: 'scan1', unit: 'units',
        Ac: 0, Bc: 0, cin: 0, cout: 0, zb: 0, ovf: 0, a: '3', b: '6', r: '9',
      },
      {
        kind: 'scan', addr: 100, opChar: 'A', scan: 'scan1', unit: 'body',
        Ac: 0, Bc: 0, cin: 0, cout: 0, zb: 0, ovf: 0, a: '2', b: '5', r: '7',
      },
      {
        kind: 'scan', addr: 100, opChar: 'A', scan: 'scan1', unit: 'body',
        Ac: 0, Bc: 0, cin: 0, cout: 0, zb: 0, ovf: 0, a: '1', b: '4', r: '5',
      },
      { kind: 'end', addr: 100, opChar: 'A', zb: 0, ovf: 0, result: 'B=579+' },
    ]);
  });

  // `L3_LATCHES_SAMPLED_AFTER_CYCLE` — the sampling instant, pinned in both directions.
  it('the arithmetic latches are the END-of-cycle values, and `unit` is the A-cycle value', () => {
    expect(L3_LATCHES_SAMPLED_AFTER_CYCLE).toBe(true);

    // END OF CYCLE: `cout` on the units record is the carry that cycle PRODUCED (7+3 = 10), not
    // one it took in — a pre-cycle sampling would print cout=0 there and cout=1 one line late.
    const carried = recordsOf(machineOf('A0030200402', '123', '456'));
    expect(carried.filter((r) => r.kind === 'scan').map((r) => (r.kind === 'scan' ? r.cout : -1)))
      .toEqual([0, 0, 0]);
    const withCarry = recordsOf(machineOf('A0030200402', '155', '456'));
    expect(withCarry.filter((r) => r.kind === 'scan').map((r) => (r.kind === 'scan' ? r.cout : -1)))
      .toEqual([1, 1, 0]);

    // THE EXCEPTION: Units / Body / Extension is decided at position ENTRY, before the A cycle
    // reads, so the position that reads the WORD-MARKED A character is still `body` and only the
    // next one is `extension`. That is the A-cycle value, and it is what `note1410.txt` prints on
    // its `A:` line — 02311 c1 has `A: … Body` against `B: … Extension` for the same position
    // (oracle/note1410/arith.ts rule 4).
    const short = recordsOf(machineOf('A0030200403', '12', '4567'));
    expect(short.filter((r) => r.kind === 'scan').map((r) => (r.kind === 'scan' ? r.unit : '')))
      .toEqual(['units', 'body', 'extension', 'extension']);
  });

  it('one record per B position, whatever the A field\'s length', () => {
    const records = recordsOf(machineOf('A0030200403', '12', '4567'));
    expect(records.filter((r) => r.kind === 'scan')).toHaveLength(4);
    expect(records.at(-1)?.kind).toBe('end');
  });

  it('the latches carry the carry: 155 + 456 shows cout on the two low-order positions', () => {
    const records = recordsOf(machineOf('A0030200402', '155', '456'));
    const scans = records.filter((r) => r.kind === 'scan');
    expect(scans.map((r) => (r.kind === 'scan' ? [r.cin, r.cout] : [])))
      .toEqual([[0, 1], [1, 1], [1, 0]]);
  });

  it('the overflow latch is up on the record that developed the high-order digit', () => {
    const records = recordsOf(machineOf('A0030000400', '5', '6'));
    expect(records).toEqual([
      {
        kind: 'scan', addr: 100, opChar: 'A', scan: 'scan1', unit: 'units',
        Ac: 0, Bc: 0, cin: 0, cout: 1, zb: 0, ovf: 1, a: '5', b: '6', r: '1',
      },
      { kind: 'end', addr: 100, opChar: 'A', zb: 0, ovf: 1, result: 'B=1+' },
    ]);
  });
});

// ═══ The L3 tracer — plan §6.2 ═════════════════════════════════════════════

describe('the latch records reach the tracer at level 3, and only there', () => {
  it('a level-3 tracer prints one `formatL3Latch` line per storage cycle', () => {
    const lines: string[] = [];
    const m = createMachine({ size: 10_000, tracer: { level: 3, sink: (l) => lines.push(l) } });
    program(m.storage, 100, 'A0030200402');
    field(m.storage, A_UNITS, '123');
    field(m.storage, B_UNITS, '456');
    m.addressSet(100);
    m.step();
    expect(lines.filter((l) => l.includes('scan1'))).toEqual([
      '00100 A  scan1 units  Ac=0 Bc=0 cin=0 cout=0 zb=0 ovf=0  a=3 b=6 → 9',
      '00100 A  scan1 body   Ac=0 Bc=0 cin=0 cout=0 zb=0 ovf=0  a=2 b=5 → 7',
      '00100 A  scan1 body   Ac=0 Bc=0 cin=0 cout=0 zb=0 ovf=0  a=1 b=4 → 5',
    ]);
    expect(lines.filter((l) => l.includes('end'))).toEqual([
      '00100 A  end          zb=0 ovf=0  B=579+',
    ]);
  });

  it('a level-1 tracer gets its step line and no latch line', () => {
    const lines: string[] = [];
    const m = createMachine({ size: 10_000, tracer: { level: 1, sink: (l) => lines.push(l) } });
    program(m.storage, 100, 'A0030200402');
    field(m.storage, A_UNITS, '123');
    field(m.storage, B_UNITS, '456');
    m.addressSet(100);
    m.step();
    expect(lines.some((l) => l.includes('scan1')), 'nothing is formatted below level 3')
      .toBe(false);
    expect(lines).toHaveLength(1);
  });
});

/** `machineWith` plus the two unsigned fields, addressed by the instruction's own digits. */
function machineOf(instruction: string, a: string, b: string): Machine {
  const m = machineWith(instruction);
  const aUnits = Number(instruction.slice(1, 6));
  const bUnits = Number(instruction.slice(6, 11));
  field(m.storage, aUnits, a);
  field(m.storage, bUnits, b);
  return m;
}
