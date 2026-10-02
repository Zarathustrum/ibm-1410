// Tier 2 — THE PAGE PARSED BACK INTO NUMBERS. Plan §11 wave 4 oracles (b), (c), (e) and (f);
// §12.1 T2 ("the phase's sharpest test"); §13 criteria 9, 10, 13, 14 and 15.
//
// `test/tier4-reentry-target.test.ts` is the photograph — the whole page, byte for byte, through
// the whole machine. It is in `npm run smoke` and it says only "nothing moved". THIS file is the
// GATE: it reads `test/golden/reentry.page.txt` as TEXT, cuts §7.2's committed print positions out
// of it, turns the cells back into numbers, and compares them to LAYER 2 — the double-precision
// RK4 in `test/fixtures/reentry-reference.ts`, written by wave 1 before a line of Autocoder
// existed, so the deck cannot have been fitted to it (§4.4, §11.5 rule 3).
//
// THE TWO PARSE PRECONDITIONS COME FIRST, AND THEY ARE WHAT GIVE THE FILE TEETH (§11.3, §12.1).
// The panel's finding against all three proposals was that "a column test that parses the wrong
// print positions and compares empty strings passes forever". So before any comparison runs: the
// parse yields EXACTLY 92 detail rows, and every one of the TEN computed fields on every one of
// them is non-empty and parses as a number. GAMMA is a literal and DIFF has its own criterion
// (§4.5), which is why the count is ten and not twelve. A COMPARISON OF EMPTY STRINGS MUST FAIL AT
// THE PRECONDITION, NOT PASS AT THE COMPARISON.
//
// THE PAGE TRUNCATES; IT DOES NOT ROUND (§5.1 rule 3, §7.2). Seven columns are fed a `FIELD-n`
// sub-field that DROPS its low-order digits, and column 9's `PL10` copy is cut out of `L10R` by an
// `MLC`, which half-adjusts nothing. So layer 2 is TRUNCATED to the column's own last printed digit
// before the one-unit rule is applied to it; comparing against a rounding would put every column
// half a unit out on principle.
//
// LAYER 2 AND THE PUBLISHED BOUNDS ARE THE AUTHORITY. §4.5's rule, verbatim and not negotiable
// inside the build: "a tolerance published in docs/BUILD-LOG-6.md before the golden may not be
// widened, and the reference may not be edited to match the program, without Tom's authorisation."
// A disagreement here is a defect in the PAGE — reported with the row, the column and both values,
// and the deck is what moves (§11.2).

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { chainGlyph } from '../src/core/devices/printer1403.js';
import {
  ANTA_DIGITS, BETA, DEFAULT_CASE, DERIVED, G0, PUBLISHED_CONSTANTS, RHO0, TOLERANCES,
  constantDisagreements, integrate,
} from './fixtures/reentry-reference.js';

const GOLDEN = readFileSync('test/golden/reentry.page.txt', 'utf8');
const SOURCE = readFileSync('demos/reentry.asm', 'utf8');
/** §6.12's one card, without its terminating newline — the heading is decoded against THIS. */
const CASE_CARD = readFileSync('demos/reentry.case.cards', 'utf8').replace(/\n$/, '');

const LINES = GOLDEN.split('\n');
const ROWS = 92;

/** Layer 2 — the gate's counterpart, at the default case (§4.4). */
const LAYER2 = integrate();

// ─── §7.2's column map, as data ──────────────────────────────────────────────────────────────

interface Column {
  readonly name: string;
  /** 1-based print positions, §7.2's own start-end. */
  readonly from: number;
  readonly to: number;
  /** Printed decimal places — the "last printed digit" §4.5's one-unit rule is stated in. */
  readonly decimals: number;
  /** Layer 2's value for this column, or `null` for the two columns layer 2 cannot supply. */
  readonly reference: ((row: (typeof LAYER2.rows)[number]) => number) | null;
}

const COLUMNS: readonly Column[] = [
  { name: 'TIME', from: 14, to: 19, decimals: 2, reference: (r) => r.t },
  { name: 'ALTITUDE', from: 23, to: 29, decimals: 0, reference: (r) => r.h },
  { name: 'VELOCITY', from: 33, to: 38, decimals: 0, reference: (r) => r.v },
  { name: 'V A-E', from: 42, to: 47, decimals: 0, reference: (r) => r.vAE },
  // DIFF IS THE MACHINE'S OWN ERROR and layer 2 has no fixed-point error to supply, so it is exempt
  // from the one-unit rule and carries criterion 10's on-page identity instead (§4.5).
  { name: 'DIFF', from: 51, to: 57, decimals: 2, reference: null },
  // GAMMA is an `MLCA` of a six-character literal off the case card — not a number on this page.
  { name: 'GAMMA', from: 61, to: 66, decimals: 2, reference: null },
  { name: 'DECEL', from: 70, to: 74, decimals: 1, reference: (r) => r.decelG },
  { name: 'DYN PRESS', from: 78, to: 83, decimals: 0, reference: (r) => r.dynPressure },
  { name: 'LOG10 RHO-R', from: 87, to: 92, decimals: 3, reference: (r) => r.log10RhoRatio },
  { name: 'HEAT RATE', from: 96, to: 102, decimals: 1, reference: (r) => r.heatRate },
  { name: 'HEAT LOAD', from: 106, to: 111, decimals: 0, reference: (r) => r.heatLoad },
  { name: 'RANGE', from: 115, to: 119, decimals: 1, reference: (r) => r.range },
];

/** The ten §12.1 counts: everything but GAMMA, a literal, and DIFF, which has its own criterion. */
const COMPUTED = COLUMNS.filter((c) => c.reference !== null);

/**
 * A detail row, by §7.2's TIME cell and nothing else. The heading block, the three column-heading
 * lines and the summary block all print text over positions 14-19 and none of them prints `d.dd`
 * six positions after a thirteen-position margin — so an empty parse cannot reach 92 by counting
 * headings, which is the failure mode the precondition exists to catch.
 */
const DETAIL = /^ {13}[ \d]{3}\.\d{2} /;
const DETAIL_LINES = LINES.filter((line) => DETAIL.test(line));

/**
 * A printed cell as a number. The edit word's commas and blanks are punctuation; a trailing `-` is
 * the 1403's own sign position (`@ 0 .  -@`, column 5). An ALL-BLANK cell returns NaN rather than
 * zero, which is the whole point of the precondition: `Number('')` is 0 and would compare equal to
 * a reference that happened to be zero.
 */
function cellValue(cell: string): number {
  const t = cell.replace(/[ ,]/g, '');
  if (t === '') return Number.NaN;
  return t.endsWith('-') ? -Number(t.slice(0, -1)) : Number(t);
}

/** §7.2's positions, optionally displaced — the handle M5 turns (§4.7, §11.3). */
type Shift = Readonly<Record<string, number>>;
const cellOf = (line: string, column: Column, shift: Shift = {}): string => {
  const d = shift[column.name] ?? 0;
  return line.slice(column.from - 1 + d, column.to + d);
};

/** The printed value, truncated to `decimals`, as an integer count of last-digit units. */
const printedUnits = (value: number, decimals: number): number =>
  Math.round(value * 10 ** decimals);
/** Layer 2, TRUNCATED toward zero to the same printed digit (§5.1 rule 3, §7.2). */
const referenceUnits = (value: number, decimals: number): number =>
  Math.trunc(value * 10 ** decimals);

// ─── the guards, each a function returning its findings ──────────────────────────────────────
//
// Every check below is a function that returns a list of findings rather than an `expect` in
// place. That is what lets the mutation pass RUN THE SAME CODE PATH and require it to go red,
// instead of asserting against a second, parallel implementation that could agree with itself.

/** §12.1's two parse preconditions, in order. */
function preconditionFindings(shift: Shift = {}): string[] {
  const out: string[] = [];
  if (DETAIL_LINES.length !== ROWS) {
    out.push(`the parse found ${DETAIL_LINES.length} detail rows and §7.1 fixes ${ROWS}`);
  }
  DETAIL_LINES.forEach((line, i) => {
    for (const column of COMPUTED) {
      const cell = cellOf(line, column, shift);
      if (cell.trim() === '') {
        out.push(`row ${i + 1}, ${column.name}: the cell at positions `
          + `${column.from + (shift[column.name] ?? 0)}-${column.to + (shift[column.name] ?? 0)} is blank`);
        continue;
      }
      if (!Number.isFinite(cellValue(cell))) {
        out.push(`row ${i + 1}, ${column.name}: printed "${cell}", which is not a number`);
      }
    }
  });
  return out;
}

/** CRITERION 13 — every computed column, every row, within one unit in its last printed digit. */
function columnFindings(shift: Shift = {}): string[] {
  const out: string[] = [];
  DETAIL_LINES.forEach((line, i) => {
    const reference = LAYER2.rows[i];
    if (reference === undefined) { out.push(`layer 2 has no row ${i + 1}`); return; }
    for (const column of COMPUTED) {
      const cell = cellOf(line, column, shift);
      const printed = cellValue(cell);
      const wanted = column.reference?.(reference) ?? Number.NaN;
      const ulps = Math.abs(printedUnits(printed, column.decimals)
        - referenceUnits(wanted, column.decimals));
      if (!(ulps <= 1)) {
        out.push(`row ${i + 1} (t = ${reference.t.toFixed(2)} s), ${column.name}: the page prints `
          + `"${cell.trim()}" = ${printed}, layer 2 gives ${wanted} which truncates to `
          + `${referenceUnits(wanted, column.decimals) / 10 ** column.decimals} at `
          + `${column.decimals} decimal(s), a difference of ${ulps} units in the last printed digit`);
      }
    }
  });
  return out;
}

/** The worst per-column deviation, in printed units — the table §4.5 asks wave 4 to re-take. */
function worstByColumn(): ReadonlyMap<string, number> {
  const worst = new Map<string, number>(COMPUTED.map((c) => [c.name, 0]));
  DETAIL_LINES.forEach((line, i) => {
    const reference = LAYER2.rows[i];
    if (reference === undefined) return;
    for (const column of COMPUTED) {
      const ulps = Math.abs(printedUnits(cellValue(cellOf(line, column)), column.decimals)
        - referenceUnits(column.reference?.(reference) ?? Number.NaN, column.decimals));
      worst.set(column.name, Math.max(worst.get(column.name) ?? 0, ulps));
    }
  });
  return worst;
}

/**
 * CRITERION 10 — the printed DIFF equals the printed VELOCITY minus the printed V A-E, to the
 * rounding of the printed fields. VELOCITY and V A-E are TRUNCATED integers, so the difference of
 * the two truncations differs from the difference of the two fields by strictly less than one
 * ft/s — that bound is the criterion, and it is an ON-PAGE identity that needs no reference.
 */
function diffIdentityFindings(): string[] {
  const out: string[] = [];
  const [diff, velocity, vae] = [
    COLUMNS.find((c) => c.name === 'DIFF'), COLUMNS.find((c) => c.name === 'VELOCITY'),
    COLUMNS.find((c) => c.name === 'V A-E'),
  ];
  if (diff === undefined || velocity === undefined || vae === undefined) {
    return ['the column map has lost DIFF, VELOCITY or V A-E'];
  }
  DETAIL_LINES.forEach((line, i) => {
    const d = cellValue(cellOf(line, diff));
    const v = cellValue(cellOf(line, velocity));
    const a = cellValue(cellOf(line, vae));
    if (!(Math.abs(d - (v - a)) < 1)) {
      out.push(`row ${i + 1}: DIFF prints ${d}, VELOCITY ${v} minus V A-E ${a} is ${v - a}, `
        + `a difference of ${Math.abs(d - (v - a))} ft/s — the two truncations cannot part by one`);
    }
  });
  return out;
}

/** CRITERION 9 — max |DIFF| over the 92 printed rows, and the summary's own printed figure. */
function maxAbsPrintedDiff(): { worst: number; row: number } {
  const diff = COLUMNS.find((c) => c.name === 'DIFF');
  let worst = 0;
  let row = 0;
  DETAIL_LINES.forEach((line, i) => {
    const d = Math.abs(cellValue(cellOf(line, diff ?? COLUMNS[0] as Column)));
    if (d > worst) { worst = d; row = i + 1; }
  });
  return { worst, row };
}

/**
 * THE AUTHORITY'S OWN GUARD. Criterion 13 is only as good as the reference it compares against, and
 * §4.5 freezes that reference: "the reference may not be edited to match the program". So the three
 * published literals §4.7's mutation pass perturbs are pinned here, in the file that gates the page,
 * and the reference's own arithmetic is required to reproduce §4.2's whole table. M1, M2 and M3 are
 * what this case is for.
 */
const FROZEN_CONSTANTS: Readonly<Record<string, number>> = {
  c1: 0.15546801,
  c2: 1.97406583e-5,
  cq: 4.15552331,
};

function frozenConstantFindings(): string[] {
  const out: string[] = [];
  for (const [name, published] of Object.entries(FROZEN_CONSTANTS)) {
    const held = PUBLISHED_CONSTANTS[name];
    if (held !== published) {
      out.push(`${name}: the reference now publishes ${String(held)} where §4.2 published `
        + `${published} — a published constant moved after the golden was cut (§4.5, §11.4)`);
    }
  }
  return [...out, ...constantDisagreements()];
}

/**
 * `ANTA` is eq.7's whole atmosphere on this machine, and every value in columns 3, 4, 8, 10 and 11
 * comes through it. The table is 100 entries of 10^(i/100) at ten punched digits (§5.6); this is
 * that construction, asserted entry by entry, plus §4.5's published 1.0e-5 relative bound on the
 * eight digits the fetch actually takes. M4 is what this case is for.
 */
function antaFindings(): string[] {
  const out: string[] = [];
  ANTA_DIGITS.forEach((digits, i) => {
    const want = Math.round(10 ** (i / 100) * 1e9).toString().padStart(10, '0');
    if (digits !== want) out.push(`ANTA[${i}] holds ${digits} and 10^(${i}/100) rounds to ${want}`);
    const fetched = Number(digits.slice(0, 8)) / 1e7;
    const relative = Math.abs(fetched - 10 ** (i / 100)) / 10 ** (i / 100);
    if (relative > TOLERANCES.atmosphereRelative) {
      out.push(`ANTA[${i}]: the fetched ${fetched} is ${relative} relative from 10^(${i}/100), `
        + `past the published ${TOLERANCES.atmosphereRelative}`);
    }
  });
  return out;
}

// ─── the criteria ────────────────────────────────────────────────────────────────────────────

describe('Wave 4 — THE PARSE PRECONDITIONS (plan §11.3, §12.1)', () => {
  it('the parse yields EXACTLY 92 detail rows', () => {
    expect(DETAIL_LINES, `the golden page parses to ${DETAIL_LINES.length} detail rows`)
      .toHaveLength(ROWS);
  });

  it('every one of the TEN computed fields on every row is non-empty and a number', () => {
    expect(COMPUTED.map((c) => c.name), 'GAMMA is a literal and DIFF has its own criterion')
      .toHaveLength(10);
    expect(preconditionFindings()).toEqual([]);
  });
});

describe('Wave 4 — CRITERION 13: the page against LAYER 2, one unit in the last printed digit', () => {
  it('every computed column, every row', () => {
    // §4.5's rule, and the deviations wave 3 re-took under truncation: TIME 0, LOG10 RHO-R 0, and
    // the other eight at exactly 1. The rule asserted is the PUBLISHED one unit; the measurement
    // goes in the message, and a column that measured 0 and now measures 1 is a re-measurement
    // rather than a deviation (§4.5's own paragraph on the truncation re-cut).
    expect(columnFindings()).toEqual([]);
  });

  it('and no column is worse than one unit, column by column', () => {
    for (const [name, ulps] of worstByColumn()) {
      expect(ulps, `${name} deviates ${ulps} units in its last printed digit`).toBeLessThanOrEqual(1);
    }
  });

  it('THE AUTHORITY: §4.2\'s published constants have not moved, and the reference reproduces them', () => {
    expect(frozenConstantFindings()).toEqual([]);
  });

  it('THE AUTHORITY: ANTA is 10^(i/100) at ten punched digits, all 100 entries', () => {
    expect(antaFindings()).toEqual([]);
  });
});

describe('Wave 4 — CRITERION 13: the heading block decoded against the CASE CARD', () => {
  // The hole the panel found in all three proposals: nothing tied the heading's printed values to
  // the constants the run used, so a deck printing one ballistic coefficient while integrating
  // another passed every criterion. §7.3's heading block is FOUR echo lines — ENTRY, VEHICLE,
  // ATMOSPHERE, INTEGRATION — and seven of their numbers are `MCE`s of case-card fields, decoded
  // back out of the golden here. THE ATMOSPHERE LINE IS THE EXCEPTION AND IS NOT DECODED: §7.3 says
  // in as many words that its constants are the PROGRAM'S and not the card's, so it carries no
  // edited field at all and has its own case below.
  const ENTRY = LINES.find((l) => l.startsWith(`${' '.repeat(13)}ENTRY `)) ?? '';
  const VEHICLE = LINES.find((l) => l.startsWith(`${' '.repeat(13)}VEHICLE `)) ?? '';
  const ATMOSPHERE = LINES.find((l) => l.startsWith(`${' '.repeat(13)}ATMOSPHERE `)) ?? '';
  const INTEGRATION = LINES.find((l) => l.startsWith(`${' '.repeat(13)}INTEGRATION `)) ?? '';
  /** A card field by §6.12's sub-entry columns, at its own implied point. */
  const card = (fromCol: number, toCol: number, s: number): number =>
    Number(CASE_CARD.slice(fromCol - 1, toCol)) / 10 ** s;
  /** A printed heading field: the edit word's punctuation is punctuation, the digits are the value. */
  const printed = (line: string, from: number, to: number): number =>
    Number(line.slice(from - 1, to).replace(/[ ,]/g, ''));
  const truncatedTo = (x: number, d: number): number => Math.trunc(x * 10 ** d) / 10 ** d;

  it('all four echo lines are on the page', () => {
    for (const [name, line] of [['ENTRY', ENTRY], ['VEHICLE', VEHICLE],
      ['ATMOSPHERE', ATMOSPHERE], ['INTEGRATION', INTEGRATION]] as const) {
      expect(line, `no ${name} echo line in the golden`).not.toBe('');
    }
  });

  // Each row: the label, the echo line it prints on, the printed field's positions, the decimals
  // its edit word prints, and the case-card field it is an `MCE` of — §6.12's own sub-entry columns.
  const decoded: readonly (readonly [string, string, number, number, number, number])[] = [
    ['ENTRY VELOCITY', ENTRY, 37, 43, 0, card(2, 9, 2)],
    ['ENTRY ALTITUDE', ENTRY, 88, 95, 0, card(62, 68, 0)],
    ['W/CD A', VEHICLE, 35, 41, 1, card(40, 47, 2)],
    ['NOSE RADIUS', VEHICLE, 101, 104, 2, card(48, 53, 4)],
    ['DT', INTEGRATION, 58, 60, 2, card(76, 79, 4)],
    ['TABULATED FROM (the band top)', INTEGRATION, 87, 94, 0, card(69, 75, 0)],
  ];

  for (const [label, line, from, to, decimals, wanted] of decoded) {
    it(`${label} on the page equals the case card's own field`, () => {
      expect(printed(line, from, to),
        `the heading prints ${printed(line, from, to)} and the case card holds ${wanted}`)
        .toBe(truncatedTo(wanted, decimals));
    });
  }

  it('BETA SUB B is formed from the card, not punched on it', () => {
    // The one echoed number the card does not carry: the deck forms it from W/(C_D A) over g0 and
    // prints `BB-3`, which TRUNCATES (§5.1 rule 3) — 31.080997 prints `31.080`, not the `31.081`
    // §7.3's pre-build mock shows. Decoded against the CARD's W/(C_D A) and against the reference's
    // own `betaB`, which are the two independent routes to it.
    expect(printed(VEHICLE, 67, 72)).toBe(truncatedTo(card(40, 47, 2) / G0, 3));
    expect(printed(VEHICLE, 67, 72)).toBe(truncatedTo(DERIVED.betaB, 3));
  });

  it('the ATMOSPHERE line is the PROGRAM\'S constants and carries no case-card field', () => {
    // §7.3: "Lines 4, 6, 7 and 8 are pure literals: the atmosphere constants are the program's, not
    // the card's." So this line is exempt from the decode above — and it is checked against eq.7's
    // own two constants instead, so that "exempt" does not quietly mean "unchecked".
    expect(ATMOSPHERE).toContain(`RHO ZERO  ${RHO0.toFixed(7).replace(/^0/, '')} SLUG/FT3`);
    expect(ATMOSPHERE).toContain(`SCALE HEIGHT  ${(1 / BETA).toLocaleString('en-US')}. FT`);
    expect(ATMOSPHERE, 'the atmosphere line names the report it comes from')
      .toContain('NACA REPORT 1381 EQ 7');
  });

  it('the page says what the V A-E column IS', () => {
    // Wave 4's review found the page carried a column headed `V A-E`, a `DIFF` column defined
    // against it and a summary line about it, and never once said what it was. The restored line
    // names eq.13, and the column heading it explains is on the same form.
    const form1 = GOLDEN.split('\f')[0] ?? '';
    expect(form1, 'form 1 does not name NACA 1381 EQ 13 anywhere').toContain('NACA 1381 EQ 13');
    expect(form1, 'and the column it explains is not on the same form').toContain('V A-E');
  });

  it('GAMMA is the card\'s six characters, on the heading AND on every one of the 92 rows', () => {
    const gamma = CASE_CARD.slice(9, 15);
    expect(ENTRY.slice(62, 68), 'the heading\'s ANGLE field').toBe(gamma);
    for (const [i, line] of DETAIL_LINES.entries()) {
      expect(line.slice(60, 66), `row ${i + 1}'s GAMMA cell`).toBe(gamma);
    }
  });

  it('ENTRY VELOCITY decodes against the CARD\'S V-E and NOT against the reference\'s V(0)', () => {
    // §7.3 and criterion 13, in the one place the distinction bites. The page prints `23,000.`,
    // which is `V-E` at ALTITUDE 400,000 ft; the table starts at TABULATED FROM 150,000 ft, where
    // eq.13 puts the vehicle 60.46 ft/s slower. They are two different numbers BY DESIGN, and a
    // criterion comparing the heading to the reference's initial V would fail on a correct page —
    // as would one comparing the first VELOCITY cell to the card's V-E. Both are decoded, each
    // against its own source.
    const headingVe = printed(ENTRY, 37, 43);
    expect(headingVe).toBe(DEFAULT_CASE.vE);
    expect(headingVe, 'the heading is showing the band-top state instead of the card\'s V-E')
      .not.toBe(referenceUnits(DERIVED.v0, 0));
    const firstRow = DETAIL_LINES[0] ?? '';
    const firstVelocity = cellValue(firstRow.slice(32, 38));
    expect(firstVelocity, 'the first VELOCITY cell is the band-top state, not the card\'s V-E')
      .not.toBe(DEFAULT_CASE.vE);
    expect(DEFAULT_CASE.vE - DERIVED.v0, 'the 60 ft/s the page puts three altitudes on to explain')
      .toBeCloseTo(60.46, 2);
  });
});

describe('Wave 4 — CRITERION 10: the DIFF column is internally honest', () => {
  it('the printed DIFF is the printed VELOCITY minus the printed V A-E, on every row', () => {
    expect(diffIdentityFindings()).toEqual([]);
  });

  it('CRITERION 9: max |DIFF| is inside the published bound, and the summary prints the same figure', () => {
    // The bound was written down from S = 2 and the step count before the simulator was ever run
    // against it (§4.5), published by wave 1 before any golden existed, and it may not be widened.
    const { worst, row } = maxAbsPrintedDiff();
    expect(worst, `the worst printed |DIFF| is ${worst} ft/s at row ${row}`)
      .toBeLessThanOrEqual(TOLERANCES.maxAbsDiffFtPerS);
    const summary = LINES.find((l) => l.includes('MAXIMUM DIFFERENCE VELOCITY MINUS V A-E')) ?? '';
    expect(summary, 'the summary block prints no MAXIMUM DIFFERENCE line').not.toBe('');
    const figure = Number((/([\d.]+) FT\/SEC/.exec(summary) ?? [])[1]);
    expect(figure, `the summary prints ${figure} ft/s and the column's own worst is ${worst}`)
      .toBe(worst);
  });
});

describe('Wave 4 — CRITERION 15: every printed literal is on the chain-A arrangement', () => {
  // §7.8's rule: no character outside the chain-A arrangement may appear in any printed literal of
  // `demos/reentry.asm`. `=`, `(`, `)` and `+` are not merely wrong on chain A — `bcdOfGlyph`
  // returns undefined for all four, so a source deck cannot even spell them.
  const literals = [...SOURCE.matchAll(/\s(?:DCW|DC)\s+@([^@]*)@/g)]
    .map((m) => m[1] ?? '');
  /** The one exemption: the group mark, octal 77, a control character that is never printed. */
  const GROUP_MARK = '⧧';

  it('THE PRECONDITION: the sweep reaches every `@…@` literal in the file', () => {
    // Two literals per `@`-pair. If a literal ever appears on an op this regex does not name, the
    // counts part company and the sweep is reported as incomplete rather than passing over it.
    const delimiters = (SOURCE.match(/@/g) ?? []).length;
    expect(literals.length, `the sweep found ${literals.length} literals and the file carries `
      + `${delimiters} @ delimiters`).toBe(delimiters / 2);
    expect(literals.length).toBeGreaterThan(200);
  });

  it('the four characters the panel worried about have no BCD in this emulator at all', () => {
    for (const ch of ['=', '(', ')', '+']) {
      expect(bcdOfGlyph(ch), `${ch} has a BCD after all — §7.8's premise has moved`).toBeUndefined();
    }
  });

  it('one predicate over every literal, with exactly one exemption', () => {
    const exempt: string[] = [];
    for (const literal of literals) {
      for (const ch of literal) {
        if (ch === GROUP_MARK) { exempt.push(literal); continue; }
        const bcd = bcdOfGlyph(ch);
        expect(bcd, `"${ch}" in the literal @${literal}@ has no BCD`).toBeDefined();
        expect(chainGlyph(bcd ?? 0, 'A'), `"${ch}" in the literal @${literal}@ is not on the A `
          + 'arrangement').toBe(ch);
      }
    }
    // And the exemption is where §7.8 says it is — the group mark on `PAGM`/`PLGM`, never anywhere
    // a hammer could strike. `PAGM` is wave 5's punch area and is not in the deck yet.
    for (const literal of exempt) {
      const card = SOURCE.split('\n').find((l) => l.includes(`@${literal}@`)) ?? '';
      expect(card, `a group mark on a card that is not PAGM or PLGM: ${card}`)
        .toMatch(/(?:PAGM|PLGM)\s/);
    }
    expect(exempt.length, 'the group-mark exemption is used more than once per area').toBeLessThan(3);
  });
});

// ─── §16 item 3 — a structural finding about the deck, not a value ────────────────────────────

describe('Wave 4 — the deck CANNOT spell an `OPEN:` name in its documented form', () => {
  // Wave 4's author went to add the two `*  OPEN- …` comment cards §16 item 3 requires and found
  // that `_` IS NOT ONE OF THE 64 MACHINE GLYPHS. `src/asm/source.ts:139` flags it by column — on a
  // COMMENT CARD, because the assembler reads all 80 columns of every card as punches — so the
  // names are hyphenated in the deck. §16 item 3 names `demos/reentry.asm` as one of wave 7's four
  // grep domains, so WAVE 7'S SWEEP MUST NORMALISE `-` TO `_` OVER THIS DOMAIN, or the deck must
  // come out of the domains. This case exists so wave 7 inherits a fact rather than a surprise.
  const HYPHENATED = [
    'COLUMN-LAYOUT-IS-PERIOD-PLAUSIBLE-NOT-DOCUMENTED',
    'MCE-LEADING-SIGN-COLUMN-TAKES-AN-EXACT-LENGTH-A-FIELD',
  ] as const;

  it('the underscore has no BCD at all in this emulator', () => {
    expect(bcdOfGlyph('_'), '`_` acquired a BCD — §16 item 3 can be spelled after all').toBeUndefined();
    expect(SOURCE.includes('_'), 'demos/reentry.asm now carries an underscore').toBe(false);
  });

  it('both `OPEN-` cards are present, hyphenated, and normalise to their documented names', () => {
    for (const name of HYPHENATED) {
      expect(SOURCE, `the deck carries no OPEN- card for ${name}`).toContain(`*  OPEN- ${name}`);
    }
    // The normalisation wave 7 owes, written down where it can be read: hyphen for underscore, and
    // the result is §15's own constant name.
    expect(HYPHENATED.map((n) => n.replace(/-/g, '_'))).toEqual([
      'COLUMN_LAYOUT_IS_PERIOD_PLAUSIBLE_NOT_DOCUMENTED',
      'MCE_LEADING_SIGN_COLUMN_TAKES_AN_EXACT_LENGTH_A_FIELD',
    ]);
  });

  it('and it is the ASSEMBLER that refuses it, measured rather than asserted', () => {
    // Spelling one of them the documented way and running the real assembler over the deck: the
    // card is flagged by column, which is why the hyphens are not a style choice.
    const underscored = SOURCE.replace(`OPEN- ${HYPHENATED[0]}`,
      `OPEN_ ${HYPHENATED[0].replace(/-/g, '_')}`);
    expect(underscored, 'the substitution did not take').not.toBe(SOURCE);
    const spoiled = assemble(underscored);
    expect(spoiled.ok, 'the assembler accepted an underscore on a comment card').toBe(false);
    expect(spoiled.flagged.map((line) => line.why ?? '').join(' | '),
      'flagged, but not for the glyph').toContain('"_" is not one of the 64 machine glyphs');
    expect(spoiled.flagged[0]?.flag, "the assembler's F flag — a line that would not parse").toBe('F');
    // And the shipped deck is clean, which is the other half of the same statement.
    expect(assemble(SOURCE).flagged, 'the shipped deck is flagged').toEqual([]);
  });
});

// ─── §4.7 and §11.3 — the mutation pass ──────────────────────────────────────────────────────
//
// The panel's finding was that nothing proved the oracle had teeth. Each case below APPLIES its
// mutation, ASSERTS THE FAILURE and RESTORES — never a committed-red test — and each names the
// guard it reddens.
//
// M1-M4 PERTURB A REFERENCE CONSTANT BY ITS LAST PUBLISHED DIGIT, and they redden the AUTHORITY
// guards rather than the column comparison, because a last-digit change to a double-precision
// constant cannot move a printed digit and the arithmetic says so in advance: C2's last digit is
// 5e-9 relative, and one printed unit of ALTITUDE at the band top is 6.7e-6; CQ's is 2.2e-8
// against HEAT RATE's 4.5e-5 at the peak; ANTA's fetched eighth digit is ~1e-8 against §4.5's
// published 1.0e-5. So the honest statement of M1-M4 is that they prove the reference is FROZEN —
// §4.5's own rule that "the reference may not be edited to match the program" — and M5 is the one
// that reaches criterion 13's own comparison, which is exactly what §11.3 says it is for.

describe('Wave 4 — §4.7 THE MUTATION PASS: the oracle has teeth', () => {
  /** Apply, assert, restore. A `finally` so a failing assertion cannot leak the mutation. */
  function mutating<T>(apply: () => void, undo: () => void, body: () => T): T {
    apply();
    try { return body(); } finally { undo(); }
  }
  const constants = PUBLISHED_CONSTANTS as Record<string, number>;
  const antaDigits = ANTA_DIGITS as string[];

  it('M1 — C2\'s last published digit reddens the frozen-constant guard', () => {
    const findings = mutating(
      () => { constants['c2'] = 1.97406584e-5; },
      () => { constants['c2'] = 1.97406583e-5; },
      frozenConstantFindings,
    );
    expect(findings.length, 'C2 moved and nothing noticed').toBeGreaterThan(0);
    expect(frozenConstantFindings(), 'M1 did not restore').toEqual([]);
  });

  it('M2 — C1\'s last published digit reddens the frozen-constant guard', () => {
    const findings = mutating(
      () => { constants['c1'] = 0.15546800; },
      () => { constants['c1'] = 0.15546801; },
      frozenConstantFindings,
    );
    expect(findings.length, 'C1 moved and nothing noticed').toBeGreaterThan(0);
    expect(frozenConstantFindings(), 'M2 did not restore').toEqual([]);
  });

  it('M3 — CQ\'s last published digit reddens the frozen-constant guard', () => {
    // CQ drives HEAT RATE and HEAT LOAD, columns 10 and 11, through log10(A_q) — the constant wave
    // 3 found the deck forming one decade low on any card with R-NOSE other than 1.00 ft.
    const findings = mutating(
      () => { constants['cq'] = 4.15552340; },
      () => { constants['cq'] = 4.15552331; },
      frozenConstantFindings,
    );
    expect(findings.length, 'CQ moved and nothing noticed').toBeGreaterThan(0);
    expect(frozenConstantFindings(), 'M3 did not restore').toEqual([]);
  });

  it('M4 — ANTA[50]\'s last digit reddens the eq.7 atmosphere guard', () => {
    const entry = antaDigits[50] ?? '';
    const findings = mutating(
      () => { antaDigits[50] = `${entry.slice(0, 9)}${(Number(entry.slice(9)) + 1) % 10}`; },
      () => { antaDigits[50] = entry; },
      antaFindings,
    );
    expect(findings.length, 'an ANTA entry moved and nothing noticed').toBeGreaterThan(0);
    expect(antaFindings(), 'M4 did not restore').toEqual([]);
  });

  it('M5 — THE PARSE ITSELF, shifted one position, reddens every computed column', () => {
    // The one the panel's finding actually asks for, and the one M1-M4 cannot supply: if the parser
    // returns empty strings, perturbing a reference constant only changes what the vacuous
    // comparison is against and the test stays green (§11.3). The shift is one position LEFT —
    // the direction that drops the column's last printed digit, which is the digit §4.5's rule is
    // written about — and each column is displaced on its own, so a column that survived would be
    // named rather than hidden by the other nine.
    const survivors: string[] = [];
    for (const column of COMPUTED) {
      const shift: Shift = { [column.name]: -1 };
      const red = preconditionFindings(shift).length + columnFindings(shift).length;
      if (red === 0) survivors.push(column.name);
    }
    expect(survivors, `${survivors.join(', ')} read the same numbers one position over — the parse `
      + 'is not reading printed digits there').toEqual([]);
    // And nothing was left displaced: the unshifted parse is still green.
    expect(preconditionFindings()).toEqual([]);
    expect(columnFindings()).toEqual([]);
  });
});
