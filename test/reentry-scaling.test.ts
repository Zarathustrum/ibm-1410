// Tier 0 — §5.2's scaling table and §5.3's nineteen products, asserted AS DATA against their own
// rules. Plan docs/plans/phase-6-reentry.md §5.1 (the five rules), §5.2 (the table), §5.3 (the
// products and their rescale offsets), §5.4 (`PROD` is 17), §11 wave 1 oracle (d), §12.1 T0.
//
// STATED PLAINLY, BECAUSE THE ORACLE'S REACH IS NARROWER THAN ITS NAME: the S values and the
// offsets were transcribed into `test/fixtures/reentry-reference.ts` from §5.2 and §5.3 BY HAND, so
// this file checks the fixture against THE RULE — not the fixture against the deck. A
// consistent-but-wrong pair passes here: a row whose S is wrong in both the plan and the fixture
// satisfies `offset = S_a + S_b - S_target` perfectly. Nothing mechanically ties
// `demos/reentry.asm`'s literal `WORK-n` offsets to this table until WAVE 3, whose oracle (f)
// parses the deck's own `MLC SRC-n,DEST` and `A +5,WORK-n+1` sites out of the source and asserts
// them against this same table (§11). A green run of this file is a statement about the fixture's
// internal consistency and about nothing else; do not read it as a statement about the program.
//
// SOURCES: IBM A22-0526-3, IBM 1410 Principles of Operation (NOT the 1401), pp.18-19 — the product
// develops in the B-field, which must hold multiplicand digits + multiplier digits + 1, so 8 x 8
// needs 17 positions. There is no IBM 1410 numeric-conventions manual and A22-0526-3 deliberately
// has no fixed decimal point, the machine being variable-field-length with the programmer owning
// the point (avco-and-reentry.md:213, [verified by absence]) — so the table under test is this
// project's own design, which is exactly why it is checked against a stated rule.

import { describe, expect, it } from 'vitest';

import {
  PRODUCT_FIELD_POSITIONS, PRODUCTS, SCALING_TABLE, type ProductRow, type ScalingRow,
} from './fixtures/reentry-reference.js';

/** §5.2's rows that state no range at all — the plan writes "per use" or the multiply B-fields. */
const RANGELESS = ['W1', 'W2', 'W3', 'PROD', 'PROD2', 'PROD3'];
/** §5.3's rows whose peak the plan writes in words ("as V, H") rather than as a magnitude. */
const PEAKLESS = [18, 19];
/** A22-0526-3 pp.18-19: multiplicand 8 + multiplier 8 + 1. */
const MULTIPLICAND_DIGITS = 8;
const MULTIPLIER_DIGITS = 8;

/**
 * The digit count a magnitude needs: `floor(log10(magnitude)) + 1`, the rule §5.2 and §5.3 are
 * checked against. `ARGF1` is the one field the plan writes a dash in the S column for while still
 * claiming a range (it is an index-register image, not a scaled number), so a missing S counts as
 * zero implied fractional digits — which is what a dash means here.
 */
function digitsFor(magnitude: number, s: number | null): number {
  return Math.floor(Math.log10(magnitude * 10 ** (s ?? 0))) + 1;
}

function symbolsOf(rows: readonly ScalingRow[]): readonly string[] {
  return rows.map((row) => row.symbol);
}

function numbersOf(rows: readonly ProductRow[]): readonly number[] {
  return rows.map((row) => row.n);
}

describe('Wave 1 — §5.2\'s scaling table asserted as data (oracle (d))', () => {
  it('is transcribed whole, one row per field, with no symbol appearing twice', () => {
    expect(SCALING_TABLE.length, `${SCALING_TABLE.length} scaling rows transcribed`).toBe(40);
    expect(new Set(symbolsOf(SCALING_TABLE)).size, 'every scaling row names a distinct field')
      .toBe(SCALING_TABLE.length);
  });

  it('states a range for every field except the six the plan writes in words', () => {
    const rangeless = symbolsOf(SCALING_TABLE.filter((row) => row.rangeMax === null));
    expect(rangeless, `rows carrying no range: ${rangeless.join(', ')}`).toEqual(RANGELESS);
  });

  it('gives every field at least the digits its claimed range needs', () => {
    const ranged = SCALING_TABLE.filter((row) => row.rangeMax !== null);
    // The precondition: a filter that selected nothing would pass the loop below vacuously.
    expect(ranged.length, `${ranged.length} of ${SCALING_TABLE.length} rows claim a range`)
      .toBe(SCALING_TABLE.length - RANGELESS.length);
    for (const row of ranged) {
      const rangeMax = row.rangeMax ?? 0;
      const needed = digitsFor(rangeMax, row.s);
      expect(row.digits, `${row.symbol} carries ${row.digits} positions at S = ${row.s ?? '-'}; its range "${row.range}" (max ${rangeMax}) needs ${needed}`)
        .toBeGreaterThanOrEqual(needed);
    }
  });
});

describe('Wave 1 — §5.3\'s nineteen products asserted as data (oracle (d))', () => {
  it('is transcribed whole, numbered 1 through 19', () => {
    expect(PRODUCTS.length, `${PRODUCTS.length} products transcribed against §5.3's nineteen`).toBe(19);
    expect(numbersOf(PRODUCTS), 'the products carry §5.3\'s own numbering, in order')
      .toEqual(Array.from({ length: 19 }, (_unused, i) => i + 1));
  });

  it('rescales every product by §5.1 rule 2 — offset = S_a + S_b - S_target', () => {
    for (const row of PRODUCTS) {
      const rule = row.sA + row.sB - row.sTarget;
      expect(row.offset, `product ${row.n} (${row.product}) publishes offset ${row.offset}; S_a ${row.sA} + S_b ${row.sB} - S_target ${row.sTarget} = ${rule}`)
        .toBe(rule);
    }
  });

  it('states a peak magnitude for every product except the two the plan writes in words', () => {
    const peakless = numbersOf(PRODUCTS.filter((row) => row.peak === null));
    expect(peakless, `products carrying no peak magnitude: ${peakless.join(', ')}`).toEqual(PEAKLESS);
    expect(numbersOf(PRODUCTS.filter((row) => row.digitsInProd === null)), 'a product without a peak is exactly a product without a digit count')
      .toEqual(PEAKLESS);
  });

  it('counts the digits each product develops by floor(log10(peak * 10^(S_a+S_b))) + 1', () => {
    const measured = PRODUCTS.filter((row) => row.peak !== null && row.digitsInProd !== null);
    expect(measured.length, `${measured.length} of ${PRODUCTS.length} products carry a peak magnitude`)
      .toBe(PRODUCTS.length - PEAKLESS.length);
    for (const row of measured) {
      const rule = digitsFor(row.peak ?? 0, row.sA + row.sB);
      expect(row.digitsInProd, `product ${row.n} (${row.product}) publishes ${row.digitsInProd} digits; peak ${row.peak} at S = ${row.sA} + ${row.sB} needs ${rule}`)
        .toBe(rule);
    }
  });

  it('fits every product inside the 17-position B-field', () => {
    for (const row of PRODUCTS) {
      if (row.digitsInProd === null) continue;
      expect(row.digitsInProd, `product ${row.n} (${row.product}) develops ${row.digitsInProd} digits in a ${PRODUCT_FIELD_POSITIONS}-position field`)
        .toBeLessThanOrEqual(PRODUCT_FIELD_POSITIONS);
    }
  });
});

describe('Wave 1 — PROD is 17 (A22-0526-3 pp.18-19)', () => {
  it('holds multiplicand digits + multiplier digits + 1', () => {
    expect(PRODUCT_FIELD_POSITIONS, `PROD is ${PRODUCT_FIELD_POSITIONS} positions against ${MULTIPLICAND_DIGITS} + ${MULTIPLIER_DIGITS} + 1`)
      .toBe(MULTIPLICAND_DIGITS + MULTIPLIER_DIGITS + 1);
    expect(PRODUCT_FIELD_POSITIONS, 'A22-0526-3 pp.18-19: an 8 x 8 multiply needs 17 positions').toBe(17);
  });

  it('gives all three multiply B-fields those 17 positions', () => {
    const fields = SCALING_TABLE.filter((row) => row.symbol.startsWith('PROD'));
    expect(symbolsOf(fields), 'the multiply B-fields of §5.2').toEqual(['PROD', 'PROD2', 'PROD3']);
    for (const row of fields) {
      expect(row.digits, `${row.symbol} carries ${row.digits} positions against PROD's ${PRODUCT_FIELD_POSITIONS}`)
        .toBe(PRODUCT_FIELD_POSITIONS);
    }
  });
});
