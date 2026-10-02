// Tier 3 — THE ANTILOG PROBE ON THE REAL MACHINE (docs/plans/phase-6-reentry.md §11 wave 2,
// §12.1 T3). `demos/probe-antilog.asm` through `assemble()` -> `loaderDeck()` -> the real 1402
// -> the real condensed loader -> the real 1411 -> the 1403, and the printed page read back
// digit for digit against layer 3's `antilogFixed` at all 100 arguments.
//
// THE FIXTURE IS THE AUTHORITY AND THE DECK IS THE SUBJECT. `test/fixtures/reentry-reference.ts`
// is wave 1's, committed and reviewed before this deck existed; nothing in this file may be
// widened, and no argument may be moved, to make a case pass. A disagreement is a defect in
// `demos/probe-antilog.asm` and a finding for `docs/BUILD-LOG-6.md` (§11 wave 2).
//
// NO GOLDEN, deliberately. §11 wave 2: "the probe is scaffolding whose numbers are checked
// against a function, and a golden would freeze a page nothing later reads." Everything below
// compares numbers parsed off the page against `antilogFixed`, never bytes against a file.
//
// FOUR MECHANISMS ARE NAMED among the hundred, each in its own `describe`, so a red case says
// WHICH ONE broke rather than "expected false to be true" (§5.6, §6.4):
//   · the NEGATIVE-ARGUMENT BIAS — `ARGB = ARG + 10`, which is what makes the decade a field
//     slice instead of a signed test;
//   · the TWO-DIGIT FIELD SLICE — F1 = 00 and F1 = 99 at both ends of the field;
//   · the TEN-POSITION INDEXED FETCH — `MLC ANTA-2+X1,MANT` takes the TOP EIGHT of a ten-digit
//     entry, and the low two are guard digits the move discards;
//   · the HORNER RESIDUAL — R at 0 and at 0.0099999, the most the five-position field holds.
//
// The F1 named against each card below is the DATA DECK'S OWN COMMENT on that card, read off
// `demos/probe-antilog.data.cards` by hand. It is not computed from the argument here, because a
// slice recomputed in this file would be the same arithmetic the fixture already does and the
// case would stop being a check on anything.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { createMachine, START_BUDGET, type Machine } from '../src/core/machine.js';
import type { StopReason } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';
import {
  ANTA_DIGITS, ANTA_FETCHED, ANTILOG_C1, ANTILOG_C2, antilogFixed, halfAdjust,
} from './fixtures/reentry-reference.js';

const SOURCE = readFileSync('demos/probe-antilog.asm', 'utf8');
const DATA = readFileSync('demos/probe-antilog.data.cards', 'utf8');

const result = assemble(SOURCE);

/** §5.6: 100 entries at a ten-position stride, `ORG 07480` .. 08479, one position of slack above. */
const ANTA_FROM = 7480;
const ANTA_TO = 8479;
const ANTA_RECORDS = 19;
const ANTA_POSITIONS = 1000;

/** The probe's print block (`demos/probe-antilog.asm` §3): sign 006, ARG 008-016, MANT 022-030,
 *  DEC 039-040 — the `MCE` field ends the deck's own comments name, minus the edit word's width. */
const DETAIL = /^ {5}([- ]) (\d\.\d{7}) {5}(\d\.\d{7}) {8}(\d{2}) *$/;

const ARGUMENTS = 100;

interface Row {
  /** The signed argument the card punched, as the page prints it back. */
  readonly arg: number;
  /** MANT, eight digits at S = 7. */
  readonly mantissa: number;
  /** DEC as printed — the BIASED decade, so `antilogFixed().decade + 10`. */
  readonly dec: number;
  readonly text: string;
}

/** Digits at S = 7, so a difference can be stated in ulp rather than in binary floating point. */
const s7 = (x: number): number => Math.round(x * 1e7);
const arg8 = (x: number): string => `${x < 0 ? '-' : ' '}${Math.abs(x).toFixed(7)}`;

/**
 * The whole operator sequence, in the order a person performs it, through `machine.start()` and
 * NOT `machine.run()`: the stop print-out lives inside `start()` (wave 0, §9.8), and this run has
 * to end on a programmed halt that types its `S` line.
 */
function operate(): { m: Machine; stop: StopReason | undefined } {
  const m = createMachine({ size: 10_000 });
  const { deck, errors } = parseDeck(DATA);
  expect(errors, 'the argument deck parses with zero errors').toEqual([]);
  // `tools/run-deck.ts`'s sequence: the object deck through `loaderDeck()`, then the data cards.
  m.loadDeck([...loaderDeck(result.deck), ...deck]);
  // READER START then END OF FILE — IBM's own procedure: with fewer than four cards behind the
  // last one the machine would stop Not Ready instead (research/software.md §10.7).
  m.readerStart();
  m.readerEndOfFile();
  // MODE = DISPLAY at 00000, MODE = ALTER, the twelve PRE-SPLIT bootstrap keystrokes.
  m.display(BOOTSTRAP_ORIGIN);
  m.setMode('alter');
  expect(m.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks)).toBe(12);
  m.computerReset();
  m.setMode('run');
  let stop: StopReason | undefined;
  for (let frame = 0; frame < 5_000 && stop === undefined; frame++) stop = m.start(START_BUDGET);
  m.endOfJob();
  return { m, stop };
}

const { m: machine, stop } = operate();
const state = machine.snapshot();

const rows: Row[] = state.printer.paper.flatMap((line) => {
  const hit = DETAIL.exec(line.text);
  if (hit === null) return [];
  return [{
    arg: (hit[1] === '-' ? -1 : 1) * Number(hit[2]),
    mantissa: Number(hit[3]),
    dec: Number(hit[4]),
    text: line.text.trimEnd(),
  }];
});

/** The row for one argument, by its S = 7 digits — a missing one is a failure, not `undefined`. */
function rowAt(arg: number): Row {
  const found = rows.find((r) => s7(r.arg) === s7(arg));
  if (found === undefined) throw new Error(`no printed row for ARG ${arg8(arg)}`);
  return found;
}

/**
 * The one comparison every case makes. The message carries the argument, the deck's value, the
 * reference's and the difference in ulp at S = 7, because that is what a reader needs to act on.
 */
function agrees(row: Row, why: string): void {
  const want = antilogFixed(row.arg);
  const ulp = s7(row.mantissa) - s7(want.mantissa);
  expect(ulp, `${why}: at ARG ${arg8(row.arg)} the deck printed ${row.mantissa.toFixed(7)} and the `
    + `reference gives ${want.mantissa.toFixed(7)}, ${ulp} ulp at S = 7`).toBe(0);
  expect(row.dec, `${why}: at ARG ${arg8(row.arg)} the deck printed DEC ${row.dec} and the `
    + `reference gives ${want.decade + 10} (unbiased ${want.decade})`).toBe(want.decade + 10);
}

describe('Tier 3 — the probe assembles clean (plan §11 wave 2)', () => {
  it('ok, ZERO flagged lines and ZERO warnings', () => {
    expect(result.ok).toBe(true);
    expect(result.flagged).toEqual([]);
    // Not decorative. A loader record's terminating group-mark-with-word-mark lands at
    // `loadAddress + count`, and the warning fires when that position is inside a reserved area
    // (§8.3 of the Phase 3 plan). An empty array is the statement that the probe's `ORG *+1`
    // slack cards put every terminator where nothing lives.
    expect(result.warnings).toEqual([]);
  });
});

describe('Tier 3 — the run reaches the programmed halt', () => {
  it('the machine halts, the hopper empties, and nothing error-stopped', () => {
    expect(stop).toBe('halt');
    expect(state.reader.hopper).toBe(0);
    expect(state.console.filter((line) => line.id === 'E')).toEqual([]);
  });

  it('THE PRECONDITION: the page carries exactly 100 detail rows, and they are the 100 cards', () => {
    // Asserted BEFORE any value comparison: a comparison over an empty parse has to fail here
    // rather than pass vacuously (§12.1's parse preconditions, the same discipline one tier up).
    expect(rows).toHaveLength(ARGUMENTS);
    // The arguments as PUNCHED — column 1 `A`, column 2 the sign, columns 3-10 the magnitude —
    // read straight off the data deck and compared with what the 1403 printed back, in order.
    const punched = DATA.split('\n')
      .filter((card) => card.startsWith('A'))
      .map((card) => (card[1] === '-' ? -1 : 1) * Number(card.slice(2, 10)) / 1e7);
    expect(punched).toHaveLength(ARGUMENTS);
    expect(rows.map((r) => s7(r.arg))).toEqual(punched.map(s7));
  });
});

describe('Tier 3 — 100 arguments, digit for digit against layer 3 (plan §11 wave 2\'s oracle)', () => {
  it('every one of the 100 printed MANT and DEC pairs equals antilogFixed()', () => {
    for (const row of rows) agrees(row, 'the hundred');
  });

  it('the arguments span -10 .. +6 and cover all sixteen biased decades', () => {
    expect(Math.min(...rows.map((r) => r.arg))).toBe(-9.9999999);
    expect(Math.max(...rows.map((r) => r.arg))).toBe(5.9999999);
    expect([...new Set(rows.map((r) => r.dec))].sort((a, b) => a - b))
      .toEqual(Array.from({ length: 16 }, (_unused, i) => i));
  });
});

describe('Tier 3 — MECHANISM 1: the negative-argument bias (§6.4)', () => {
  // `ZA ARG,ARGB` then `A KBIAS,ARGB` puts the whole run above zero in a NINE-position field, so
  // `MLN ARGB-7,DEC` is a field slice. Without the +10 the decade would have to be a signed test.
  const negative = rows.filter((r) => r.arg < 0);

  it('seventy-one of the hundred arguments are below zero, and all of them agree', () => {
    // The count is the `A-` cards in `demos/probe-antilog.data.cards`, so the mechanism has a
    // real sample rather than an accidental one.
    expect(negative).toHaveLength(71);
    for (const row of negative) agrees(row, 'the negative-argument bias');
  });

  it('a negative argument prints a BIASED decade in 00..09 — the bias, visible on the page', () => {
    for (const row of negative) {
      expect(row.dec, `ARG ${arg8(row.arg)} printed DEC ${row.dec}, which is not a biased decade `
        + 'below the bias — the +10 did not happen').toBeLessThan(10);
      expect(row.dec).toBeGreaterThanOrEqual(0);
    }
    // The two ends of the negative half, named: the lowest representable argument biases to
    // 0.0000001 (DEC 00) and the one just below zero biases to 9.9999999 (DEC 09).
    expect(rowAt(-9.9999999).dec).toBe(0);
    expect(rowAt(-0.0000001).dec).toBe(9);
    // And the bias itself is on the page: ARG 0 prints DEC 10.
    expect(rowAt(0).dec).toBe(10);
  });
});

describe('Tier 3 — MECHANISM 2: the two-digit field slice (§5.6, §6.4)', () => {
  // `MLC F-5,ARGF1-1` takes digits 1-2 of the seven-digit fraction. The four corners are F1 = 00
  // and F1 = 99 at each end of the field; the F1 on each is the data deck's own comment.
  const CORNERS: readonly (readonly [number, number])[] = [
    [-9.9999999, 0],   // ARGB 0.0000001  — DEC 00, F1 00
    [-9.01, 99],       // ARGB 0.9900000  — F1 99, R zero
    [5, 0],            // ARGB 15.0000000 — DEC 15, F1 00
    [5.9999999, 99],   // ARGB 15.9999999 — DEC 15, F1 99
  ];

  it('F1 = 00 and F1 = 99 at both ends of the field', () => {
    for (const [arg, f1] of CORNERS) {
      const row = rowAt(arg);
      agrees(row, `the F1 = ${String(f1).padStart(2, '0')} corner`);
      // The fetched entry has to be the one the slice names: at R = 0 the mantissa IS the entry,
      // and at R != 0 it is that entry times a CORR of at most 1.0232907, so the entry bounds it.
      expect(row.mantissa, `ARG ${arg8(arg)} says F1 = ${f1}, whose ANTA entry is `
        + `${(ANTA_FETCHED[f1] ?? 0).toFixed(7)}, but the deck printed ${row.mantissa.toFixed(7)}`)
        .toBeGreaterThanOrEqual(ANTA_FETCHED[f1] ?? 0);
    }
  });

  it('THE THREE FLOAT-SLICE HAZARDS: F = 0.29, 0.57 and 0.58, at both signs', () => {
    // The fixture's own note: over all 10^7 values of F, `Math.floor(f * 100)` disagrees with a
    // slice on exactly these three, and a model that divided instead of slicing would come out
    // one entry low with r = 0.01 — which the five-position R field cannot even hold.
    for (const arg of [-2.71, -2.43, -2.42, 3.29, 3.57, 3.58]) {
      agrees(rowAt(arg), 'a float-slice hazard');
    }
  });
});

describe('Tier 3 — MECHANISM 3: the ten-position indexed fetch (§6.2)', () => {
  // `MLCWA ARGF1,XR1` makes X1 = 10*F1 and `MLC ANTA-2+X1,MANT` fetches the TOP EIGHT of the ten
  // punched digits. At R = 0 the Horner correction is exactly 1, so the fetched entry reaches the
  // page unmodified and the page is a direct read-out of the table.
  it('the twenty table-sweep cards fetch entries 00, 05, 10 ... 95 exactly', () => {
    // `demos/probe-antilog.data.cards` §3: ARG = -2 + 0.05k puts F1 at 5k with R = 0, so no tenth
    // of the hundred-entry table goes unfetched.
    for (let k = 0; k < 20; k++) {
      const arg = Math.round((-2 + 0.05 * k) * 1e7) / 1e7;
      const f1 = 5 * k;
      const row = rowAt(arg);
      agrees(row, `the table sweep at F1 = ${String(f1).padStart(2, '0')}`);
      expect(s7(row.mantissa), `ARG ${arg8(arg)} has R = 0, so MANT must be ANTA[${f1}] fetched — `
        + `top eight of ${ANTA_DIGITS[f1]} = ${(ANTA_FETCHED[f1] ?? 0).toFixed(7)}, `
        + `but the deck printed ${row.mantissa.toFixed(7)}`).toBe(s7(ANTA_FETCHED[f1] ?? 0));
    }
  });

  it('TOP EIGHT, not the ten digits rounded — entry 01 prints 1.0232929 and not 1.0232930', () => {
    // The discriminator, and the reason the low two are called guard digits rather than filler:
    // entry 01 is 1023292992, whose top eight are 10232929 while its ROUNDING is 10232930. ARG
    // -9.99 biases to 0.0100000, so F1 = 01 with R = 0 and the entry reaches the page raw.
    const row = rowAt(-9.99);
    expect(ANTA_DIGITS[1]).toBe('1023292992');
    expect(s7(row.mantissa), 'the MLC half-adjusts nothing — a rounded fetch would print 1.0232930')
      .toBe(10232929);
    expect(s7(row.mantissa)).not.toBe(10232930);
    agrees(row, 'the top-eight fetch');
  });
});

describe('Tier 3 — MECHANISM 4: the Horner residual (§5.6)', () => {
  // r = F - F1/100 is the low five digits of F — a slice, not a subtract — and 0.0099999 is the
  // most the five-position field at S = 7 can hold. The residual cards put R at both extremes at
  // three values of F1 and at both signs of ARG.
  /** The four R = 0 residual cards, each with the F1 its own card comment names. */
  const R_ZERO: readonly (readonly [number, number])[] = [[-2.5, 50], [1.5, 50], [-2.01, 99], [1.99, 99]];
  const R_MAX = [-2.4900001, 1.5099999, -2.9900001, 1.0099999, -2.0000001, 1.9999999];
  const R_ONE = [-2.9999999, 1.0000001];

  it('R = 0: CORR is exactly 1 and the fetched entry reaches the page unchanged', () => {
    for (const [arg, f1] of R_ZERO) {
      const row = rowAt(arg);
      agrees(row, 'the residual at R = 0');
      expect(s7(row.mantissa), `ARG ${arg8(arg)} has R = 0, so the three multiplies must leave `
        + `CORR at 1.0000000 and MANT at ANTA[${f1}] = ${(ANTA_FETCHED[f1] ?? 0).toFixed(7)}, but `
        + `the deck printed ${row.mantissa.toFixed(7)}`).toBe(s7(ANTA_FETCHED[f1] ?? 0));
    }
  });

  it('R = 0.0099999, the most the five-position field holds, at F1 00, 50 and 99', () => {
    for (const arg of R_MAX) agrees(rowAt(arg), 'the residual at its maximum');
    // At F1 = 00 the entry is exactly 1.0000000, so the page prints CORR ITSELF — the cap the
    // renormalise argument below leans on, computed here from the fixture's own c1 and c2 rather
    // than quoted: 1 + halfAdjust((c1 + halfAdjust(c2 r, 7)) r, 7).
    const r = 0.0099999;
    const corr = 1 + halfAdjust((ANTILOG_C1 + halfAdjust(ANTILOG_C2 * r, 7)) * r, 7);
    expect(corr).toBe(1.0232907);
    expect(s7(rowAt(-2.9900001).mantissa), 'ARG -2.9900001 is F1 00 with R at its maximum, so '
      + `MANT is 1.0000000 x CORR = ${corr.toFixed(7)}`).toBe(s7(corr));
  });

  it('R = 1 in the last position, the smallest residual that is not zero', () => {
    for (const arg of R_ONE) agrees(rowAt(arg), 'the residual at one ulp');
    // 1.0000002 rather than 1.0000000: the residual term is alive at r = 1e-7.
    expect(s7(rowAt(-2.9999999).mantissa)).toBe(10000002);
  });
});

describe('Tier 3 — ANTA itself, as the deck punches it (§6.2)', () => {
  /** The 100 ten-digit `DCW` cards after `ORG 07480`, read out of the source. */
  const punched = [...SOURCE.matchAll(/^\d{5}(?:ANTA)? +DCW +@(\d{10})@/gm)].map((hit) => hit[1]);

  it('100 cards, byte-equal to the fixture\'s ANTA_DIGITS', () => {
    expect(punched).toHaveLength(100);
    expect(punched).toEqual([...ANTA_DIGITS]);
  });

  it('ENTRY 99 IS 9772372210 and its top eight are 97723722 — NOT 99770006', () => {
    // The card a builder copies to write the tail of the table. 99770006 is 10^0.999, a
    // 1,000-entry table this design does not have, and its top eight would make ANTA[99] 2.1 %
    // high in the one routine every printed column depends on (§6.2).
    expect(punched[99]).toBe('9772372210');
    expect(punched[99]?.slice(0, 8)).toBe('97723722');
    expect(punched[99]?.slice(0, 8)).not.toBe('99770006');
    expect(ANTA_FETCHED[99]).toBe(9.7723722);
    // And it is on the page: ARG -9.01 biases to 0.9900000, F1 = 99 with R = 0.
    expect(s7(rowAt(-9.01).mantissa)).toBe(97723722);
  });

  it('the table emits 19 object records for 1,000 payload positions — contiguous, no ORG', () => {
    // §6.2's one measured departure from the panel's sheet. The strided form — eight-position
    // `DCW` plus `ORG *+2` — emits 800 positions in 100 records, because an `ORG` breaks the
    // record: 81 more cards in the hopper for a smaller table.
    const table = result.deck.records.filter((r) => r.loadAddress >= ANTA_FROM && r.loadAddress <= ANTA_TO);
    expect(table).toHaveLength(ANTA_RECORDS);
    expect(table.reduce((sum, r) => sum + r.payload.length, 0)).toBe(ANTA_POSITIONS);
    expect(table[0]?.loadAddress).toBe(ANTA_FROM);
    const last = table[ANTA_RECORDS - 1];
    expect((last?.loadAddress ?? 0) + (last?.payload.length ?? 0) - 1).toBe(ANTA_TO);
  });
});

describe('Tier 3 — the renormalise arm is DEAD on this deck, and the property that kills it', () => {
  // `ANTLOG` carries `BCE ANTX,PROD-15,0` and a renormalise arm behind it. It is defence, and
  // wave 3 copies it forward, so the assertion is the PROPERTY that makes it unreachable rather
  // than the arm's absence: every fetched mantissa is in [1,10) and CORR cannot lift one to 10.
  it('every ANTA entry the fetch can return is in [1,10)', () => {
    for (const [i, entry] of ANTA_FETCHED.entries()) {
      expect(entry, `ANTA[${i}] = ${entry} is outside [1,10)`).toBeGreaterThanOrEqual(1);
      expect(entry).toBeLessThan(10);
    }
  });

  it('ANTA[99] x the CORR cap cannot reach 10, so the overflow path is unexercised', () => {
    const corrCap = 1 + halfAdjust((ANTILOG_C1 + halfAdjust(ANTILOG_C2 * 0.0099999, 7)) * 0.0099999, 7);
    expect(Math.max(...ANTA_FETCHED)).toBe(9.7723722);
    expect(corrCap).toBe(1.0232907);
    expect(halfAdjust(9.7723722 * corrCap, 7)).toBeLessThan(10);
    // And the run agrees with the analysis: the largest MANT on the page is 9.9999776, and no
    // row's decade is one above its own biased slice — which is what "the arm never fired" means.
    expect(Math.max(...rows.map((r) => r.mantissa))).toBe(9.9999776);
    for (const row of rows) {
      expect(row.dec, `ARG ${arg8(row.arg)} printed DEC ${row.dec}, one above the slice of `
        + `ARGB ${(row.arg + 10).toFixed(7)} — the renormalise arm fired`)
        .toBe(Math.floor(s7(row.arg + 10) / 1e7));
    }
  });
});
