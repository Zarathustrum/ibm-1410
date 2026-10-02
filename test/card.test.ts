import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BCD_TABLE, BLANK, SUBSTITUTE_BLANK } from '../src/core/bcd.js';
import { CARD_COLUMNS } from '../src/core/types.js';
import { bcdOfPunches, makeCard, punchMask } from '../src/formats/card.js';

// The bijection is proved TWICE, and neither proof imports card.ts's own derivation:
//  (a) against research/charset.md §3's structural rule, RECOMPUTED HERE from the rules;
//  (b) against oracle/collate.json's `hollerith` column, transcribed from charset.md §2
//      (A22-0526-3 Figure 2, p.6) by a throwaway script and never from bcd.ts.
// A transcription slip in bcd.ts fails (b); a slip in the derivation fails (a).

// The mask convention is card.ts's own type contract (plan §5), not a hardware fact: bit 11 is
// row 12, bit 10 row 11, bit 9 row 0, then rows 1..9 in bits 8..0.
const ROWS: readonly string[] = ['12', '11', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
function maskOfRows(rows: readonly string[]): number {
  let m = 0;
  for (const r of rows) {
    const i = ROWS.indexOf(r);
    expect(i, `row "${r}"`).toBeGreaterThanOrEqual(0);
    m |= 1 << (11 - i);
  }
  return m;
}

// research/charset.md §3 [verified], as RULES: zone punch 12 -> BA, 11 -> B, 0 -> A; digits 1-9
// punch directly; numeric 8+x punches as x-8; a lone `0` punch is numeric 8-2 with NO zone;
// `2-8` alone is the A bit only; 12-0 -> BA+8+2 and 11-0 -> B+8+2; no punch at all is 0o00.
function structuralRows(code: number): readonly string[] {
  const zone = code & 0o60;
  const num = code & 0o17;
  // The `0` punch is overloaded three ways, and these two lines are the whole disambiguation:
  // the A zone IS the 0 punch, so the A zone alone has to borrow 2-8 (charset.md §2.1), and the
  // A zone over 8-2 spells its numeric part out as 2-8 instead.
  if (zone === 0o20 && num === 0) return ['2', '8'];
  if (zone === 0o20 && num === 0o12) return ['0', '2', '8'];
  const zoneRow = zone === 0o60 ? ['12'] : zone === 0o40 ? ['11'] : zone === 0o20 ? ['0'] : [];
  if (num === 0) return zoneRow;                          // blank, `&`, `-`, `ƀ`
  if (num <= 9) return [...zoneRow, String(num)];         // digits and letters
  if (num === 0o12) return [...zoneRow, '0'];             // 8-2: `0`, 12-0, 11-0
  return [...zoneRow, String(num - 8), '8'];              // 3-8, 4-8, 5-8, 6-8, 7-8
}

interface CollateRow { rank: number; bcd: number; hollerith: string; glyph: string }
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FIXTURE = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/collate.json'), 'utf8'),
) as CollateRow[];

describe('punchMask — the Hollerith bijection (research/charset.md §2, §3)', () => {
  it('matches charset.md §3\'s structural rule for all 64 codes', () => {
    for (let code = 0; code < 64; code++) {
      const rows = structuralRows(code);
      expect(punchMask(code), `code 0o${code.toString(8)} = ${rows.join('-') || 'none'}`)
        .toBe(maskOfRows(rows));
    }
  });

  it('matches oracle/collate.json\'s hollerith column for all 64 codes', () => {
    expect(FIXTURE).toHaveLength(64);
    for (const row of FIXTURE) {
      const expected = row.hollerith === 'none' ? 0 : maskOfRows(row.hollerith.split('-'));
      expect(punchMask(row.bcd), `rank ${row.rank} "${row.hollerith}"`).toBe(expected);
    }
  });

  it('gives all 64 codes distinct masks', () => {
    const masks = new Set<number>();
    for (let code = 0; code < 64; code++) masks.add(punchMask(code));
    expect(masks.size).toBe(64);
  });

  it('round-trips bcdOfPunches(punchMask(c)) === c for all 64 codes', () => {
    for (let code = 0; code < 64; code++) {
      expect(bcdOfPunches(punchMask(code)), `code 0o${code.toString(8)}`).toBe(code);
    }
  });

  it('ignores the word-mark and check bits, as glyphOf does', () => {
    expect(punchMask(0x80 | 0o61)).toBe(punchMask(0o61));
    expect(punchMask(0xc0 | 0o35)).toBe(punchMask(0o35));
  });
});

// research/charset.md §2.1 [verified], A22-0526-3 p.100: "The 1410 system punches an A bit in
// core storage (substitute blank, formerly cent) as an 8-2 combination in a card column and
// reads an 8-2 combination in a card column as an A bit." The 1401 rule — punches as 0, invalid
// on read — is NOT imported, and this test is what keeps it out.
describe('2-8 ↔ A-bit, the 1410 rule, both directions (research/charset.md §2.1)', () => {
  it('punches the A bit as 8-2', () => {
    expect(punchMask(SUBSTITUTE_BLANK)).toBe(maskOfRows(['2', '8']));
  });

  it('reads 8-2 back as the A bit, not as a zero and not as invalid', () => {
    expect(bcdOfPunches(maskOfRows(['2', '8']))).toBe(SUBSTITUTE_BLANK);
    expect(bcdOfPunches(maskOfRows(['0']))).toBe(0o12);   // the `0` glyph, numeric 8-2, no zone
  });
});

describe('the blank trap (research/charset.md §2, §2.1; bcd.ts BLANK_TRAP)', () => {
  it('gives blank and substitute blank two different codes and two different masks', () => {
    expect(BLANK).toBe(0o00);
    expect(SUBSTITUTE_BLANK).toBe(0o20);
    expect(punchMask(BLANK)).toBe(0);
    expect(punchMask(SUBSTITUTE_BLANK)).not.toBe(0);
    expect(bcdOfPunches(0)).toBe(BLANK);                  // an unpunched column is a blank
  });
});

describe('bcdOfPunches rejects hole patterns the 1410 does not read', () => {
  it('returns null for two zone punches, two digit punches, and three digit punches', () => {
    expect(bcdOfPunches(maskOfRows(['12', '11']))).toBeNull();
    expect(bcdOfPunches(maskOfRows(['1', '2']))).toBeNull();
    expect(bcdOfPunches(maskOfRows(['3', '4', '5']))).toBeNull();
  });

  it('accepts every mask the table does produce, and nothing else', () => {
    const legal = new Set(BCD_TABLE.map((e) => punchMask(e.bcd)));
    let accepted = 0;
    for (let mask = 0; mask < 1 << 12; mask++) if (bcdOfPunches(mask) !== null) accepted++;
    expect(accepted).toBe(legal.size);
  });
});

describe('makeCard — the only Card constructor', () => {
  it('blank-pads to 80 columns with 0o00', () => {
    const card = makeCard([0o61, 0o62]);
    expect(card).toHaveLength(CARD_COLUMNS);
    expect(card[0]).toBe(0o61);
    expect(card[1]).toBe(0o62);
    expect([...card.slice(2)].every((c) => c === BLANK)).toBe(true);
  });

  it('makes an all-blank card with no argument', () => {
    expect([...makeCard()].every((c) => c === BLANK)).toBe(true);
  });

  it('takes exactly 80 codes but not 81', () => {
    expect(makeCard(new Array<number>(CARD_COLUMNS).fill(0o77))).toHaveLength(CARD_COLUMNS);
    expect(() => makeCard(new Array<number>(CARD_COLUMNS + 1).fill(0o77))).toThrow(RangeError);
  });

  it('rejects a code outside 0..63', () => {
    expect(() => makeCard([64])).toThrow(RangeError);
    expect(() => makeCard([-1])).toThrow(RangeError);
    expect(() => makeCard([1.5])).toThrow(RangeError);
  });
});
