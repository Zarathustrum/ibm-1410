// Tier 1 — the Wave-6 executors: `?` Zero and Add and `!` Zero and Subtract, both forms.
// opcodes.md §2 pp.18-19 (A22-0526-3), §4.1 the sign convention, §4.2 the digit coding,
// §4.4 the Figure 13 Zero-and-Subtract sign map, §1.4 the address-double one-field form,
// §1.5 the E term, §8 the indicators. research/architecture.md §10 carries the two worked
// one-field examples. Plan §5 Wave 6, §7 tier 1.
//
// The whole of the difference from `A`/`S` is that nothing is added: the A digits are STORED
// into B, the zones of every B position but the sign are stripped, and the sign comes from the
// A field. Everything else — the units / body / extension cursor, the B-word-mark termination,
// the zero fill when A is short, one trace record per B position — is the Wave-3 pass
// (`alu.ts` `AddOptions.mode`).

import { describe, it, expect } from 'vitest';
import {
  MINUS_ZONE, PLUS_ZONE, ZERO_AND_SUBTRACT_SIGN_MAP, digitOf, signOf,
} from '../src/core/alu.js';
import { BCD_TABLE, bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { CYCLE_US } from '../src/core/cycles.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { BCD6, ZA, ZB, type Addr, type CycleStep } from '../src/core/types.js';

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
const ZONES = ZB | ZA;
const ZONE_BITS: Readonly<Record<Zone, number>> = { none: 0, BA: ZB | ZA, B: ZB, A: ZA };

/**
 * A field of literal characters ending at its units position, word-marked on the high-order
 * position. `zone`, where given, replaces the zone bits of the units position — the field's sign
 * (opcodes.md §4.1).
 */
function field(s: CoreStorage, units: Addr, text: string, zone?: Zone): void {
  const n = text.length;
  [...text].forEach((glyph, i) => {
    const bits = code(glyph);
    const last = i === n - 1;
    s.setChar(units - n + 1 + i, last && zone !== undefined ? ZONE_BITS[zone] | (bits & 0x0f) : bits, i === 0);
  });
}

/** The field as its print glyphs, high-order first — zones and all, which is the whole point. */
function glyphs(s: CoreStorage, units: Addr, n: number): string {
  let out = '';
  for (let i = n - 1; i >= 0; i--) out += glyphOf(s.read(units - i) & BCD6);
  return out;
}

function machine(...instructions: readonly string[]): Machine {
  const m = createMachine({ size: 10_000 });
  program(m.storage, 100, ...instructions);
  m.addressSet(100);
  return m;
}

/** The same, with a level-3 tracer so `CycleStep.record` is populated (`types.ts`). */
function traced(...instructions: readonly string[]): Machine {
  const m = createMachine({ size: 10_000, tracer: { level: 3, sink: () => {} } });
  program(m.storage, 100, ...instructions);
  m.addressSet(100);
  return m;
}

// ═══ Tier 1 — the manual's own one-field examples ══════════════════════════
// A22-0526-3 p.18 "Zero and Add (One Field)", via research/architecture.md §10: "strips zones
// from all but the sign position, leaves numeric data and sign polarity intact, and rewrites a
// plus sign that is not B+A (i.e. no-zone or A-only) as B+A. Examples: `#b&-bn%` -> `300004D`;
// `ABCD5` -> `1234E`."

describe('`? aaaaa` — the one-field examples of A22-0526-3 p.18 (architecture.md §10)', () => {
  it('`ABCD5` becomes `1234E` — zones stripped, plus written B+A', () => {
    const m = machine('?00302');
    field(m.storage, 302, 'ABCD5');                 // 00298-00302, word mark at 00298
    expect(m.step()).toBeUndefined();
    expect(glyphs(m.storage, 302, 5)).toBe('1234E');
    // The units character `5` carried no zone at all, which is a plus (§4.1 Figure 11); the
    // machine rewrote it as B+A, and BA5 prints `E`.
    expect(m.storage.read(302) & ZONES, 'the sign is B+A').toBe(PLUS_ZONE);
    expect(m.regs.iar, 'NSI').toBe(106);
    expect(m.regs.aar, 'A − LA').toBe(297);
    expect(m.regs.bar, 'A − LA — the one-field row addresses one field').toBe(297);
  });

  // OPEN: two of the seven characters in `#b&-bn%` are not glyphs of the 1410 A2 chart
  // (research/charset.md §2). `b` is the transcriber's BLANK — the convention `note1410.txt`
  // uses as well (the 02533 A field at its line 384) — and could as easily be the SUBSTITUTE
  // blank, which the digit-coding table also codes to 0 (opcodes.md §4.2). `n` is no glyph at
  // all; the printed result fixes only that it codes to the digit 4. The example is therefore
  // asserted over EVERY reading of both rather than guessed at, and it holds for all of them —
  // which is the honest content of the example. A transcription gap, not a machine one, so it
  // is not an `open-questions.md` row.
  const B_READINGS: readonly string[] = [' ', 'ƀ'];
  const N_READINGS: readonly string[] = BCD_TABLE.filter((e) => digitOf(e.bcd) === 4).map((e) => e.glyph);
  const ZA_EXAMPLE_N_CODES_TO = 4;

  it('`#b&-bn%` becomes `300004D`, on every reading of the two transcribed glyphs', () => {
    expect(N_READINGS.length, 'the A2 chart has characters coding to 4').toBeGreaterThan(0);
    for (const b of B_READINGS) {
      for (const n of N_READINGS) {
        const text = `#${b}&-${b}${n}%`;
        expect(digitOf(code(n)), `${n} codes to a digit`).toBe(ZA_EXAMPLE_N_CODES_TO);
        const m = machine('?00302');
        field(m.storage, 302, text);                // 00296-00302
        expect(m.step(), text).toBeUndefined();
        // `#` (8-2-1) -> 3 with the 8 bit dropped; blank, `&` (BA), `-` (B) and the substitute
        // blank (A) are all zone-only and code to 0; `%` (A-8-4) -> 4, and its A-only zone is a
        // PLUS that is not B+A, so it is rewritten B+A: BA4 prints `D` (§4.2, §4.1, §2 p.18).
        expect(glyphs(m.storage, 302, 7), text).toBe('300004D');
      }
    }
  });

  it('`!` over the same field reverses the sign instead: `ABCD5` becomes `1234N`', () => {
    const m = machine('!00302');
    field(m.storage, 302, 'ABCD5');
    expect(m.step()).toBeUndefined();
    // Figure 13 row 1: an A field signed plus ends the B field MINUS, and minus is a B bit
    // alone — B5 prints `N` (§4.4 pp.18-19).
    expect(glyphs(m.storage, 302, 5)).toBe('1234N');
    expect(m.storage.read(302) & ZONES).toBe(MINUS_ZONE);
  });
});

// ═══ The two-field form — opcodes.md §2 p.18, research/architecture.md §10 ══

describe('`? aaaaa bbbbb` — field length is governed by the B word mark', () => {
  it('a short A field zero-fills the high-order B positions, up to and including its word mark', () => {
    const m = machine('?0030200402');
    field(m.storage, 302, '12');                    // 00301-00302
    field(m.storage, 402, '98765');                 // 00398-00402, word mark at 00398
    expect(m.step()).toBeUndefined();
    expect(glyphs(m.storage, 402, 5), 'three zeros carried into the extension').toBe('0001B');
    expect(m.storage.wm(398), 'the B word mark is untouched').toBe(true);
    expect(glyphs(m.storage, 302, 2), 'the A field is never written').toBe('12');
    expect(m.regs.aar, 'A − LW, LW = LA = 2 (the shorter field)').toBe(300);
    expect(m.regs.bar, 'B − LB, LB = 5').toBe(397);
  });

  it('an A field longer than B is simply not processed past the B word mark — no overflow', () => {
    const m = machine('?0030200402');
    field(m.storage, 302, '987654');                // 00297-00302
    field(m.storage, 402, '123');                   // 00400-00402
    expect(m.step()).toBeUndefined();
    expect(glyphs(m.storage, 402, 3), 'the low-order three digits of A').toBe('65D');
    expect(glyphs(m.storage, 302, 6), 'A untouched, high-order positions included').toBe('987654');
    // "If A is longer than B, the excess high-order A positions are simply not processed — not
    // an error" (research/architecture.md §10), and §2's `?` row lists zero balance ONLY.
    expect(m.indicators.arithOverflow, 'ZA never sets arithmetic overflow').toBe(false);
    expect(m.regs.aar, 'A − LW, LW = LB = 3: the machine never learns the true LA').toBe(299);
    expect(m.regs.bar).toBe(399);
  });

  it('strips the zone bits from every B position but the sign — note1410 02522 in miniature', () => {
    const m = machine('?0030200402');
    field(m.storage, 302, 'AKT4');                  // A = BA1 B2 A3 4
    field(m.storage, 402, 'JSLX');                  // B = B1 A2 B3 A7, all zoned
    expect(m.step()).toBeUndefined();
    expect(glyphs(m.storage, 402, 4), 'zones ignored except units').toBe('123D');
    for (let a = 399; a <= 401; a++) {
      expect(m.storage.read(a) & ZONES, `body position ${a} carries no zone`).toBe(0);
    }
    expect(m.storage.read(402) & ZONES, 'the units position keeps the sign').toBe(PLUS_ZONE);
    expect(m.storage.wm(399), 'the B word mark survives').toBe(true);
    for (let a = 400; a <= 402; a++) expect(m.storage.wm(a), `no word mark at ${a}`).toBe(false);
    expect(glyphs(m.storage, 302, 4), 'the A field keeps its own zones').toBe('AKT4');
  });
});

// ═══ Signs — opcodes.md §4.1, §4.4 (A22-0526-3 p.16 Fig 11, pp.18-19 Fig 13) ══

describe('the sign written over the units position of B', () => {
  // Figure 13's four rows in the order the figure prints them, which is the order
  // `ZERO_AND_SUBTRACT_SIGN_MAP` carries and `oracle/signs.json` pins.
  const FIGURE_13_ZONES: readonly Zone[] = ['none', 'B', 'BA', 'A'];

  it('`!` follows every row of Figure 13', () => {
    expect(ZERO_AND_SUBTRACT_SIGN_MAP).toHaveLength(FIGURE_13_ZONES.length);
    FIGURE_13_ZONES.forEach((zone, row) => {
      const want = ZERO_AND_SUBTRACT_SIGN_MAP[row];
      expect(want, `Figure 13 row ${row}`).toBeDefined();
      if (!want) return;
      const m = machine('!0030200402');
      field(m.storage, 302, '001', zone);
      field(m.storage, 402, '999');
      expect(m.step()).toBeUndefined();
      const units = m.storage.read(402);
      expect(signOf(m.storage.read(302)), `A zone ${zone} reads as`).toBe(want.aSign);
      expect(signOf(units), `A zone ${zone} → B sign`).toBe(want.bSign);
      expect(units & ZONES, 'plus is written B+A, minus a B bit alone (§4.1)')
        .toBe(want.bSign === '-' ? MINUS_ZONE : PLUS_ZONE);
      expect(glyphs(m.storage, 402, 3)).toBe(want.bSign === '-' ? '00J' : '00A');
    });
  });

  it('`?` keeps the A field\'s polarity and rewrites every plus as B+A', () => {
    for (const zone of ['none', 'B', 'BA', 'A'] as const) {
      const m = machine('?0030200402');
      field(m.storage, 302, '001', zone);
      field(m.storage, 402, '999');
      expect(m.step()).toBeUndefined();
      const minus = zone === 'B';
      expect(m.storage.read(402) & ZONES, `A zone ${zone}`).toBe(minus ? MINUS_ZONE : PLUS_ZONE);
      expect(glyphs(m.storage, 402, 3), `A zone ${zone}`).toBe(minus ? '00J' : '00A');
    }
  });
});

// ═══ Indicators — opcodes.md §8 (A22-0526-3 p.53) ══════════════════════════

describe('indicators — "zero balance only" (opcodes.md §2 pp.18-19, §8)', () => {
  it('`?` sets zero balance on a zero A field, and the next non-zero result clears it', () => {
    const m = machine('?0030200402', '?0030200402');
    field(m.storage, 302, '000');
    field(m.storage, 402, '123');
    expect(m.step()).toBeUndefined();
    // Plus zero: BA over an 8-2, which is the code point that prints `?` (charset.md §2 rank 25).
    expect(glyphs(m.storage, 402, 3)).toBe('00?');
    expect(m.indicators.zeroBalance).toBe(true);

    field(m.storage, 302, '001');
    expect(m.step()).toBeUndefined();
    expect(glyphs(m.storage, 402, 3)).toBe('00A');
    expect(m.indicators.zeroBalance, 'reset by the next such op with a non-zero result').toBe(false);
  });

  it('`!` sets zero balance the same way, and neither op touches arithmetic overflow', () => {
    // An `A` that carries out of the high-order B position first, so the latch is ON going in.
    const m = machine('A0030200402', '!0030200402');
    field(m.storage, 302, '900');
    field(m.storage, 402, '200');
    expect(m.step()).toBeUndefined();
    expect(m.indicators.arithOverflow, 'the add overflowed').toBe(true);

    field(m.storage, 302, '000');
    expect(m.step()).toBeUndefined();
    expect(glyphs(m.storage, 402, 3), 'minus zero prints `!` (charset.md §2 rank 35)').toBe('00!');
    expect(m.indicators.zeroBalance).toBe(true);
    // Arithmetic overflow is set by add and subtract only and reset by `J (I) Z`, computer reset
    // or power-on reset — never by ZA or ZS, in either direction (§8; architecture.md §10).
    expect(m.indicators.arithOverflow, 'ZS neither set nor reset it').toBe(true);
  });
});

// ═══ Chaining, registers and timing — §1.2, §1.4, §1.5, §2 p.18 ════════════

describe('the chained 1-character form — `NSI / A−LW / B−LB` on the inherited registers', () => {
  function chained(): Machine {
    const m = machine('?0030200402', '?');
    field(m.storage, 302, '12');                    // 00301-00302
    field(m.storage, 402, '45');                    // 00401-00402
    field(m.storage, 300, '78');                    // 00299-00300 — the next field down
    field(m.storage, 400, '99');                    // 00399-00400
    m.regs.opMod = code('W');                       // something the 11-character trap must clear
    return m;
  }

  it('the 11-character form leaves A−LW / B−LB and blanks the op modifier', () => {
    const m = chained();
    expect(m.step()).toBeUndefined();
    expect(glyphs(m.storage, 402, 2)).toBe('1B');
    expect(m.regs.aar).toBe(300);
    expect(m.regs.bar).toBe(400);
    // The op-modifier blanking trap: an 11-character two-address instruction blanks the register
    // (opcodes.md §1.2, A22-0526-3 p.12). `?` and `!` take no d-character at any length.
    expect(m.regs.opMod & BCD6, 'blank d').toBe(0);
  });

  it('and the chained `?` zero-adds 00300 into 00400 — two fields, not the one-field form', () => {
    const m = chained();
    m.step();
    expect(m.step()).toBeUndefined();
    expect(glyphs(m.storage, 400, 2), '78 stored over 99, plus written B+A').toBe('7H');
    expect(glyphs(m.storage, 300, 2), 'the A field is never written').toBe('78');
    expect(m.regs.aar).toBe(298);
    expect(m.regs.bar).toBe(398);
  });

  it('timing: `4.5(L+1+E+A+1.5B)` with E=1 at L=1 and E=0 at L=11 (§1.5 Figure 7, §2 p.18)', () => {
    const m = chained();
    m.step();
    const first = m.cpu.microsecondsSimulated;
    expect(first, 'L=11, E=0, A=2, B=2').toBe(CYCLE_US * (11 + 1 + 0 + 2 + 3));

    m.step();
    const second = m.cpu.microsecondsSimulated - first;
    // Figure 7 gives E=1 for a single-character zero-and-add; the One-Field line's `L = 1 or 6`
    // with no E term is editorial carryover and is one cycle short (opcodes.md §1.4, plan §10).
    expect(second, 'L=1, E=1, A=2, B=2').toBe(CYCLE_US * (1 + 1 + 1 + 2 + 3));
    expect(second, 'and not the E=0 value').not.toBe(CYCLE_US * (1 + 1 + 0 + 2 + 3));
  });

  it('the one-field form costs `4.5(L+1+A+1.5A)` — A22-0526-3 p.18', () => {
    const m = machine('?00302');
    field(m.storage, 302, 'ABCD5');
    m.step();
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (6 + 1 + 5 + 7.5));
  });
});

// ═══ The L3 trace and the storage-cycle boundary — plan §6.2, §8 demo 2 ════

describe('one trace record per B position, and one storage cycle per record', () => {
  it('a 3-position `?` emits units / body / extension and then `end`', () => {
    // note1410.txt 02500 in miniature: A = `01`, B = `123`, result `00A`.
    const lines: string[] = [];
    const m = createMachine({ size: 10_000, tracer: { level: 3, sink: (l) => lines.push(l) } });
    program(m.storage, 100, '?0030200402');
    field(m.storage, 302, '01');
    field(m.storage, 402, '123');
    m.addressSet(100);
    expect(m.step()).toBeUndefined();

    expect(lines.filter((l) => l.startsWith('00100 ?'))).toEqual([
      '00100 ?  scan1 units  Ac=0 Bc=0 cin=0 cout=0 zb=0 ovf=0  a=1 b=3 → A',
      '00100 ?  scan1 body   Ac=0 Bc=0 cin=0 cout=0 zb=0 ovf=0  a=0 b=2 → 0',
      '00100 ?  scan1 extension  Ac=0 Bc=0 cin=0 cout=0 zb=0 ovf=0  a=- b=1 → 0',
      '00100 ?  end          zb=0 ovf=0  B=001+',
    ]);
    expect(glyphs(m.storage, 402, 3)).toBe('00A');
  });

  it('`stepCycle()` fills the B field right to left, one position per E cycle', () => {
    // The latch records are the L3 trace's and are built only for a tracer (`alu.ts`,
    // `types.ts` `CycleStep.record`); the CYCLE boundary this test is really about happens
    // either way. `traced()` is `machine()` with a level-3 sink that drops the line.
    const m = traced('?0030200403');
    field(m.storage, 302, '123');                   // 00300-00302
    field(m.storage, 403, '4567');                  // 00400-00403
    const all: CycleStep[] = [];
    for (let guard = 0; guard < 50 && (all.length === 0 || !all[all.length - 1]?.complete); guard++) {
      all.push(m.stepCycle());
      if (all.length === 1) expect(glyphs(m.storage, 403, 4), 'the I phase writes nothing').toBe('4567');
      if (all.length === 2) expect(glyphs(m.storage, 403, 4), 'units: 3, signed B+A').toBe('456C');
      if (all.length === 3) expect(glyphs(m.storage, 403, 4), 'body: 2').toBe('452C');
      if (all.length === 4) expect(glyphs(m.storage, 403, 4), 'body: 1').toBe('412C');
      if (all.length === 5) expect(glyphs(m.storage, 403, 4), 'extension: the zero fill').toBe('012C');
    }
    expect(all.map((c) => c.phase)).toEqual(['I', 'E', 'E', 'E', 'E', 'E', 'E']);
    expect(all.map((c) => c.record?.kind)).toEqual([
      undefined, 'scan', 'scan', 'scan', 'scan', 'end', undefined,
    ]);
    expect(glyphs(m.storage, 403, 4), '0123 with the sign over the units').toBe('012C');
  });
});
