import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BCD_TABLE, BLANK, SUBSTITUTE_BLANK, bcdOfGlyph, collateRank, glyphOf, parity,
} from '../src/core/bcd.js';

// oracle/collate.json is transcribed straight from research/charset.md §2 (A22-0526-3 Figure 2,
// p.6) by a throwaway script, never from bcd.ts. If the two disagree, the research wins.
interface CollateRow {
  rank: number; bcd: number; octal: string; c: number; bits: string;
  hollerith: string; glyph: string; name: string; source: string; note?: string;
}
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FIXTURE = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/collate.json'), 'utf8'),
) as CollateRow[];

describe('BCD_TABLE vs oracle/collate.json (research/charset.md §2, A22-0526-3 Fig. 2 p.6)', () => {
  it('has 64 entries in collating order, blank lowest, 9 highest', () => {
    expect(BCD_TABLE).toHaveLength(64);
    expect(FIXTURE).toHaveLength(64);
    expect(BCD_TABLE.map((e) => e.rank)).toEqual(FIXTURE.map((_, i) => i));
    expect(BCD_TABLE[0]?.name).toBe('blank');
    expect(BCD_TABLE[63]?.glyph).toBe('9');
  });

  it('matches the fixture code point for code point', () => {
    for (const row of FIXTURE) {
      const e = BCD_TABLE[row.rank];
      expect(e, `rank ${row.rank}`).toBeDefined();
      expect({ bcd: e?.bcd, octal: e?.octal, c: e?.c, hollerith: e?.hollerith, glyph: e?.glyph })
        .toEqual({ bcd: row.bcd, octal: row.octal, c: row.c, hollerith: row.hollerith, glyph: row.glyph });
    }
  });

  // The fixture carries the manual's own bit-name column ("BA 821"); it must agree with the octal.
  it('bit names agree with the octal code', () => {
    const WEIGHT: Record<string, number> = { B: 0o40, A: 0o20, '8': 0o10, '4': 4, '2': 2, '1': 1 };
    for (const row of FIXTURE) {
      const bits = row.bits === '000000' ? 0
        : [...row.bits.replace(/\s/g, '')].reduce((n, ch) => n + (WEIGHT[ch] ?? NaN), 0);
      expect(bits, `rank ${row.rank} bits "${row.bits}"`).toBe(row.bcd);
    }
  });
});

describe('parity — odd over BA8421 + WM + C (research/charset.md §1, A22-0526-3 p.5)', () => {
  it('is odd for all 128 (code, word mark) pairs', () => {
    for (let bcd6 = 0; bcd6 < 64; bcd6++) {
      for (const wm of [false, true]) {
        const cell = (wm ? 0x80 : 0) | parity(bcd6, wm) | bcd6;
        let bits = 0;
        for (let b = cell; b !== 0; b >>= 1) bits += b & 1;
        expect(bits & 1, `code 0o${bcd6.toString(8)} wm=${wm}`).toBe(1);
      }
    }
  });

  it('reproduces the fixture C column, and inverts it when a word mark is set', () => {
    for (const row of FIXTURE) {
      expect(parity(row.bcd, false), `rank ${row.rank} no WM`).toBe(row.c);
      expect(parity(row.bcd, true), `rank ${row.rank} with WM`).toBe(row.c === 0 ? 0x40 : 0);
    }
  });

  // The four worked examples printed on A22-0526-3 p.5 (research/charset.md §1).
  it('matches the p.5 worked examples', () => {
    const A = 0o61, C_CHAR = 0o63, X = 0o27;
    expect(parity(A, false)).toBe(0);         // BA1 — three bits, already odd
    expect(parity(A, true)).toBe(0x40);       // WM BA1 — four bits, C added
    expect(parity(C_CHAR, false)).toBe(0x40); // BA21 — four bits, C added
    expect(parity(X, true)).toBe(0);          // WM A421 — four bits... plus WM: five, odd
  });
});

describe('blank vs substitute blank (research/charset.md §2, §2.1)', () => {
  it('are two different characters, not one', () => {
    expect(BLANK).toBe(0o00);
    expect(SUBSTITUTE_BLANK).toBe(0o20);
    expect(glyphOf(BLANK)).toBe(' ');
    expect(glyphOf(SUBSTITUTE_BLANK)).toBe('ƀ');
    expect(collateRank(BLANK)).toBe(0);
    expect(collateRank(SUBSTITUTE_BLANK)).toBe(19);
    // §2.1: on the 1410 the substitute blank punches to and reads back from 8-2; blank has no punch.
    expect(BCD_TABLE[19]?.hollerith).toBe('2-8');
    expect(BCD_TABLE[0]?.hollerith).toBe('none');
  });
});

describe('glyphs and collating rank', () => {
  it('round-trips every one of the 64 glyphs', () => {
    for (let bcd6 = 0; bcd6 < 64; bcd6++) {
      expect(bcdOfGlyph(glyphOf(bcd6)), `code 0o${bcd6.toString(8)}`).toBe(bcd6);
    }
    expect(new Set(BCD_TABLE.map((e) => e.glyph)).size).toBe(64);
  });

  it('returns undefined for a glyph outside the set', () => {
    expect(bcdOfGlyph('~')).toBeUndefined();
  });

  // research/charset.md §4 "Notable placements".
  it('places ? before A, ! between I and J, and the record mark between R and S', () => {
    const rank = (g: string): number => collateRank(bcdOfGlyph(g) ?? -1);
    expect(rank('?') + 1).toBe(rank('A'));
    expect(rank('I') + 1).toBe(rank('!'));
    expect(rank('!') + 1).toBe(rank('J'));
    expect(rank('R') + 1).toBe(rank('‡'));
    expect(rank('‡') + 1).toBe(rank('S'));
    expect(rank(' ')).toBe(0);
    expect(rank('9')).toBe(63);
  });

  it('ignores the C and word-mark bits (A22-0526-3 p.28: BA8421 only)', () => {
    expect(collateRank(0xc0 | 0o61)).toBe(collateRank(0o61));
    expect(glyphOf(0x80 | 0o61)).toBe('A');
  });
});
