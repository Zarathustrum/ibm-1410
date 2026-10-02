// Tier 0 — table fidelity. The 80-column card face as arithmetic (plan §4.4, §5.4, §12.1 T0,
// §13 criterion 13).
//
// NO VIEW IS INSTANTIATED. The run is `environment: 'node'` (vite.config.ts:8-11) and the plan
// §2.2 refuses jsdom, so a test that built reader/cardFaceView.ts would throw on `document`. It
// costs nothing: the three scales wave 3 draws are a viewBox width set by CSS and the path
// strings are scale-invariant, so there is ONE golden and the view is an adapter.
//
// WHICH MACHINE: the IBM 1402 Card Read-Punch's card as read by a 1410 — the general-purpose
// 5081-style layout, whose interpretation band is printed by a printing punch. Not the 1403's
// page and not the 1415's form.
//
// The geometry is `[likely]`, from secondary sources (console-and-physical.md §10 and §13 rows
// 4-6 — Jones / Wikipedia; ANSI X3.21-1967 was not read; 22-5526-4 p.8 and Figs.3-5 pp.9, 12 for
// the band and the printed face). What is asserted here is INTERNAL CONSISTENCY plus agreement
// with `punchMask`, never that IBM's card measured this — see the golden's own header.
//
// The punch check is structural rather than a second float derivation: an ALL-BLANK card punches
// nothing, so `holePath(blank, false)` is every one of the 960 positions in column-major order,
// and position (column c, row r) is entry c*12 + r. Every other card's two paths are then exactly
// that list partitioned by `punchMask` — which is what makes the path string and the punch table
// agree for two unrelated reasons (plan §5.4).

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CARD_COLUMNS, type Card } from '../src/core/types.js';
import { makeCard, parseDeck, punchMask } from '../src/formats/card.js';
import {
  bandGlyphs,
  CARD_GEOMETRY as G,
  CARD_GEOMETRY_IS_SECONDARY,
  CARD_SIZE_7_3_8_BY_3_1_4,
  CORNER_CUT_IS_UPPER_LEFT,
  holePath,
  INTERPRETATION_BAND_PRINTS_THE_64_GLYPH_SET,
  outlinePath,
} from '../src/ui/period/paper/cardGeometry.js';

const GOLDEN = 'test/golden/card-face-a.svg.txt';
const HELLO_DAD = parseDeck(readFileSync('demos/hello-dad.cards', 'utf8'));
const CARD_1 = HELLO_DAD.deck[0] ?? makeCard();
const BLANK = makeCard();
const ALL_POSITIONS = rects(holePath(BLANK, false));

/** The header is part of the golden, so the test regenerates the WHOLE file, not just its body. */
const HEADER: readonly string[] = [
  '# test/golden/card-face-a.svg.txt — CONSTRUCTED, not IBM’s.',
  '# Card 1 of demos/hello-dad.cards through src/ui/period/paper/cardGeometry.ts: `outlinePath`,',
  '# `holePath` (the unpunched grid, then the punches) and `bandGlyphs`’s four text runs.',
  '# test/period-cardgeometry.test.ts regenerates this whole file and compares it byte for byte.',
  '# No view is instantiated and no SVG node is built (plan §12.3, §13 criterion 13).',
  '# PROVENANCE, on RPG_GOLDENS_ARE_CONSTRUCTED’s precedent (test/rpg-generate.test.ts:20;',
  '# open-questions.md:851): this is a REGRESSION PIN ON ONE `[likely]` GEOMETRY MODULE, NOT',
  '# EVIDENCE ABOUT IBM’S CARD. The dimensions are secondary (console-and-physical.md §10 and',
  '# §13 rows 4-6 — Jones / Wikipedia; ANSI X3.21-1967 unread) and the interpretation band’s',
  '# 64-glyph set is `[unverified]`. A correction to CARD_GEOMETRY_IS_SECONDARY,',
  '# CARD_SIZE_7_3_8_BY_3_1_4, CORNER_CUT_IS_UPPER_LEFT or',
  '# INTERPRETATION_BAND_PRINTS_THE_64_GLYPH_SET re-cuts this file and nothing else.',
];

describe('paper/cardGeometry.ts — the card face as arithmetic (plan §4.4, §5.4)', () => {
  it('reads demos/hello-dad.cards cleanly, so the golden is cut from a real card', () => {
    expect(HELLO_DAD.errors).toEqual([]);
    expect(HELLO_DAD.deck.length).toBeGreaterThan(0);
    expect(CARD_1.length).toBe(CARD_COLUMNS);
  });

  it('centres 80 columns at 0.087 in inside a 7.375 in card with equal margins', () => {
    expect(CARD_GEOMETRY_IS_SECONDARY).toBe(true);
    expect([G.columns, G.colPitch, G.cardW]).toEqual([80, 8.7, 737.5]);
    expect(G.side * 2 + G.columns * G.colPitch).toBeCloseTo(G.cardW, 9);
    expect(G.side).toBeCloseTo(20.75, 9);

    const x = distinct(ALL_POSITIONS.map((r) => r.x));
    expect(x.length).toBe(G.columns);
    expect(pitches(x)).toEqual([G.colPitch]);
    // The first hole's left edge and the last hole's right edge sit the same distance in.
    expect((x[0] ?? 0) - G.holeW / 2).toBeCloseTo(G.cardW - (x[79] ?? 0) - G.holeW * 1.5, 9);
  });

  it('stacks 12 rows at 0.250 in below a 3/16 in band, inside a 3.25 in card', () => {
    expect(CARD_SIZE_7_3_8_BY_3_1_4).toBe(true);
    expect([G.rows, G.rowPitch, G.bandH, G.cardH]).toEqual([12, 25, 18.75, 325]);
    expect(G.bandH + G.rows * G.rowPitch).toBeLessThanOrEqual(G.cardH);

    const y = distinct(ALL_POSITIONS.map((r) => r.y));
    expect(y.length).toBe(G.rows);
    expect(pitches(y)).toEqual([G.rowPitch]);
    expect(y[0]).toBeGreaterThanOrEqual(G.bandH);
    expect((y[11] ?? 0) + G.holeH).toBeLessThanOrEqual(G.cardH);
    expect(ALL_POSITIONS.length).toBe(G.columns * G.rows);
  });

  it('keeps every hole clear of the band and of both column-number rows', () => {
    const runs = bandGlyphs(CARD_1);
    const holeRows = distinct(ALL_POSITIONS.map((r) => r.y))
      .map((top) => ({ top, bottom: top + G.holeH }));

    // Lining figures, so a run occupies [y - 0.72*size, y] — cardGeometry.ts's own CAP_H rule.
    for (const run of [runs[1], runs[2]]) {
      const bottom = run?.y ?? 0;
      const top = bottom - 0.72 * (run?.size ?? 0);
      expect(top).toBeGreaterThan(G.bandH);
      for (const hole of holeRows) expect(hole.top >= bottom || hole.bottom <= top).toBe(true);
    }
    for (const hole of holeRows) expect(hole.top).toBeGreaterThanOrEqual(G.bandH);
  });

  it('cuts the UPPER LEFT corner, as a path segment and not a border', () => {
    expect(CORNER_CUT_IS_UPPER_LEFT).toBe(true);
    expect(outlinePath()).toBe('M25 0H737.5V325H0V25Z');
    // Starts on the top edge cornerCut in from the left and ends cornerCut down the left edge:
    // the missing corner is (0, 0). CORNER_CUT_IS_UPPER_LEFT, `[likely]`.
    expect(outlinePath().startsWith(`M${G.cornerCut} 0H`)).toBe(true);
    expect(outlinePath().endsWith(`H0V${G.cornerCut}Z`)).toBe(true);
    expect(outlinePath()).not.toContain('M0 0');
    expect(outlinePath({ ...G, cornerCut: 40 })).toBe('M40 0H737.5V325H0V40Z');
  });

  it('punches exactly what punchMask says, for every punchable BCD code', () => {
    for (let code = 0o00; code <= 0o77; code++) {
      const card = makeCard(new Uint8Array(CARD_COLUMNS).fill(code));
      const mask = punchMask(code);
      const punched: string[] = [];
      const grid: string[] = [];
      for (let c = 0; c < CARD_COLUMNS; c++) {
        for (let r = 0; r < G.rows; r++) {
          const box = ALL_POSITIONS[c * G.rows + r]?.d ?? '';
          (((mask >> (G.rows - 1 - r)) & 1) === 1 ? punched : grid).push(box);
        }
      }
      expect([code, holePath(card, true)]).toEqual([code, punched.join('')]);
      expect([code, holePath(card, false)]).toEqual([code, grid.join('')]);
    }
  });

  it('lays out four text runs: the band, both column-number rows, and the IBM legend', () => {
    expect(INTERPRETATION_BAND_PRINTS_THE_64_GLYPH_SET).toBe(true);
    const runs = bandGlyphs(CARD_1);
    expect(runs.length).toBe(4);
    expect(runs[0]?.chars.length).toBe(CARD_COLUMNS);
    expect(runs[0]?.x.length).toBe(CARD_COLUMNS);
    expect(runs[0]?.y).toBeLessThan(G.bandH);
    for (const run of [runs[1], runs[2]]) {
      expect(run?.chars).toBe(columnNumbers());
      expect(run?.x.length).toBe(run?.chars.length);
    }
    expect(runs[3]).toEqual({ chars: 'IBM', x: [G.side / 2 + 3], y: G.cardH / 2, size: 9, rotate: -90 });
  });

  it('matches test/golden/card-face-a.svg.txt byte for byte', () => {
    expect(readFileSync(GOLDEN, 'utf8')).toBe(goldenText(CARD_1));
  });
});

/** The whole golden, regenerated — header included, so nothing in the file is unchecked. */
function goldenText(card: Card): string {
  return [
    ...HEADER,
    `outline  ${outlinePath()}`,
    `grid  ${holePath(card, false)}`,
    `punches  ${holePath(card, true)}`,
    ...bandGlyphs(card).map((run, i) => `text[${i}]  ${JSON.stringify(run)}`),
  ].join('\n') + '\n';
}

interface Rect { readonly d: string; readonly x: number; readonly y: number }

/** Every `M x yh…v…h…z` in a path, in the order the path draws them. */
function rects(d: string): readonly Rect[] {
  return [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)h-?[\d.]+v-?[\d.]+h-?[\d.]+z/g)]
    .map((m) => ({ d: m[0], x: Number(m[1]), y: Number(m[2]) }));
}

const distinct = (values: readonly number[]): readonly number[] =>
  [...new Set(values)].sort((a, b) => a - b);

/** The gaps between consecutive values, rounded to a hundredth of a unit and de-duplicated. */
const pitches = (values: readonly number[]): readonly number[] =>
  distinct(values.slice(1).map((v, i) => Number((v - (values[i] ?? 0)).toFixed(2))));

const columnNumbers = (): string =>
  Array.from({ length: CARD_COLUMNS }, (_v, c) => String(c + 1).padStart(2, '0')).join('');
