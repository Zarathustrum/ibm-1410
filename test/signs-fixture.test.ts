// Tier 0 — `oracle/signs.json` against the tables in `src/core/alu.ts`.
//
// The fixture is transcribed from the research (opcodes.md §4.1-§4.4, charset.md §6,
// research/architecture.md §10 — A22-0526-3 p.16 Figures 11-12 and pp.18-19 Figure 13); the
// tables in alu.ts are written for the adder. This file is the join: a change to either side
// that is not made deliberately on both fails here, which is the whole point of keeping the
// sign machinery as data (plan §7, the same pattern as timing.json and indicators.json).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ADD_CYCLE_TABLE, DIGIT_OF_NUMERIC_BITS, MINUS_ZONE, PLUS_ZONE,
  ZERO_AND_SUBTRACT_SIGN_MAP, digitOf, selectAddCycle, signOf, type Sign,
} from '../src/core/alu.js';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { ZA, ZB } from '../src/core/types.js';

interface SignsFixture {
  source: string;
  signZones: {
    rows: readonly { zoneBits: string; cardZone: string; sign: Sign }[];
    written: { plus: string; minus: string };
  };
  digitCoding: {
    byNumericBits: readonly number[];
    zeroIsWrittenAs: string;
    specials: readonly { glyph: string; name: string; octal: string; digit: number }[];
  };
  addCycle: {
    rows: readonly { op: 'A' | 'S'; aSign: Sign; bSign: Sign; cycle: string; resultSign: string }[];
  };
  zeroAndSubtractSignMap: { rows: readonly { aSignBits: string; aSign: Sign; bSign: Sign }[] };
}

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SIGNS = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/signs.json'), 'utf8'),
) as SignsFixture;

/** A cell carrying just the zone bits the fixture names. */
function zoneCell(zoneBits: string): number {
  return (zoneBits.includes('B') ? ZB : 0) | (zoneBits.includes('A') ? ZA : 0);
}

describe('oracle/signs.json — the sign zones (A22-0526-3 p.16 Figure 11)', () => {
  it('names all four zone combinations, and only B alone is minus', () => {
    expect(SIGNS.signZones.rows).toHaveLength(4);
    for (const row of SIGNS.signZones.rows) {
      expect(signOf(zoneCell(row.zoneBits)), `zone ${row.zoneBits} (${row.cardZone})`)
        .toBe(row.sign);
    }
    expect(SIGNS.signZones.rows.filter((r) => r.sign === '-')).toHaveLength(1);
  });

  it('the machine WRITES B+A for plus and B for minus', () => {
    expect(SIGNS.signZones.written.plus).toBe('BA');
    expect(SIGNS.signZones.written.minus).toBe('B');
    expect(PLUS_ZONE).toBe(ZB | ZA);
    expect(MINUS_ZONE).toBe(ZB);
  });
});

describe('oracle/signs.json — digit coding (A22-0526-3 p.16 "Digit Coding")', () => {
  it('alu.ts\'s numeric-bit table is the fixture\'s, all sixteen rows', () => {
    expect([...DIGIT_OF_NUMERIC_BITS]).toEqual([...SIGNS.digitCoding.byNumericBits]);
  });

  it('every special the research names codes as the fixture says', () => {
    for (const s of SIGNS.digitCoding.specials) {
      const bcd = bcdOfGlyph(s.glyph);
      expect(bcd, `${s.name} has a BCD code`).toBeDefined();
      expect(bcd, `${s.name} is octal ${s.octal}`).toBe(Number.parseInt(s.octal, 8));
      expect(digitOf(bcd ?? 0), `${s.name} (${s.glyph}) codes as ${s.digit}`).toBe(s.digit);
    }
  });

  it('zero is written 8-2, which is why 8-2 reads back as face value 0', () => {
    expect(SIGNS.digitCoding.zeroIsWrittenAs).toBe('8-2');
    expect(digitOf(0o12)).toBe(0);
  });
});

describe('oracle/signs.json — add-cycle selection (A22-0526-3 p.16 Figure 12)', () => {
  it('alu.ts\'s transcribed table is the fixture\'s eight rows', () => {
    expect(ADD_CYCLE_TABLE.map((r) => ({ ...r }))).toEqual(SIGNS.addCycle.rows.map((r) => ({
      op: r.op, aSign: r.aSign, bSign: r.bSign, cycle: r.cycle, resultSign: r.resultSign,
    })));
  });

  it('`selectAddCycle` agrees with every printed row — including the S sign inversion', () => {
    for (const row of SIGNS.addCycle.rows) {
      const { cycle, aSign } = selectAddCycle(row.op === 'S', row.aSign, row.bSign);
      expect(cycle, `${row.op} A${row.aSign} B${row.bSign}`).toBe(row.cycle);
      // Subtract inverts the A sign first; a true add then means the two agree, and the
      // printed result sign is that common sign (opcodes.md §4.3).
      if (row.cycle === 'true') expect(row.resultSign).toBe(aSign);
      else expect(row.resultSign).toBe('greater');
    }
  });
});

describe('oracle/signs.json — Zero and Subtract sign map (pp.18-19 Figure 13)', () => {
  // Data only in Wave 3: `!` Zero and Subtract is Wave 6 (plan §5). The fixture and the table
  // are pinned to each other now so the executor has one place to read them from later.
  it('alu.ts carries the four rows in the figure\'s order', () => {
    expect(ZERO_AND_SUBTRACT_SIGN_MAP.map((r) => ({ ...r })))
      .toEqual(SIGNS.zeroAndSubtractSignMap.rows.map((r) => ({ aSign: r.aSign, bSign: r.bSign })));
  });

  it('every A sign but minus ends the B field MINUS — the op reverses the sign', () => {
    for (const row of SIGNS.zeroAndSubtractSignMap.rows) {
      expect(signOf(zoneCell(row.aSignBits === 'none' ? '' : row.aSignBits))).toBe(row.aSign);
      expect(row.bSign).toBe(row.aSign === '-' ? '+' : '-');
    }
  });
});
