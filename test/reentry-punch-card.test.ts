// Tier 2 — THE PUNCH, AND §8.2'S CARD CONTRACT IN BOTH DIRECTIONS. Plan §8.1-§8.3, §11 wave 5
// oracle (a), §12.1 T2, §13 criterion 16.
//
// `demos/reentry.asm` end to end through `assemble()` -> `loaderDeck()` -> the real 1402 -> the
// real condensed loader -> the real 1411, driven through `machine.start()`, and the 92 cards it
// punches compared to `demos/reentry-summary.data.cards`.
//
// THE HEADLINE ASSERTION AND THE REASON THE PUNCH EXISTS. `expect(punched).toEqual(committed)` is
// what makes "no trajectory number is ever hand-typed into a file" ENFORCEABLE rather than
// aspirational (RULINGS §C 12, §8.3): the committed deck is a decode of the punch pocket, not a
// transcription of the printed page, and this case fails the moment anyone edits a digit of it.
//
// THE CARDS LIVE ON THE DEVICE, NOT IN THE SNAPSHOT. `MachineState.punch` carries COUNTS ONLY —
// `machine.ts:547` puts `punch: { stackers: punch.stackers }` in the snapshot — so the comparison
// reaches `machine.punch.pockets['0']` (`devices/punch1402.ts:104`, `Card[]`). A test written
// against the snapshot can only count, which is exactly the shape of the mistake §8.1 names.
//
// ONE DIVERGENCE FROM §8.2'S PROSE, MEASURED ON THE SHIPPED DECK AND WRITTEN DOWN RATHER THAN
// ASSERTED AWAY. §8.2's third rule reads "no signs except the zone bit `MLZS` stamps on `DIFF` and
// `LOG10 RHO-R`". The shipped punch block has no `MLZS` in it — it is `CS` + `MLCA` + eleven `MLC`
// + `P1` + `BA1`, exactly as §8.2's own listing prints it — and a 1410 `MLC` carries the source
// field's units-position sign zone with it. So EIGHT of the ten numeric fields arrive on the card
// with a 12-zone (plus) units digit: `T0000?…` is `+00000`, not a malformed `00000`. The rule the
// deck actually keeps is the rule the contract is FOR — nothing edited, no commas, no points, no
// separate sign character, and the sign, where a field has one, in the units position and nowhere
// else — and the two fields §8.2 calls "signed" are still the only two that ever carry an 11-zone
// (minus): DIFF on 40 of 92 rows, LOG10 RHO-R on 71. That is what is asserted below.
//
// THE CARD CARRIES PRECISION THE PAGE TRUNCATES AWAY, so the comparison against layer 3 is written
// to §4.5's published bounds and not to exact equality on two of the ten fields. Both splits are
// far below what the trajectory page prints (`QTOT-2` at 6 digits S = 0, `PL10` at 4 digits
// S = 3), which is why wave 4's page tests are untouched by either.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { glyphOf } from '../src/core/bcd.js';
import { createMachine } from '../src/core/machine.js';
import type { Card, ChannelStatus, StopReason } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';
import { simulateFixed, type TrajectoryRow } from './fixtures/reentry-reference.js';

const SOURCE = readFileSync('demos/reentry.asm', 'utf8');
/** The one case card, without its terminating newline — the deck reads it as data. */
const CASE_CARD = readFileSync('demos/reentry.case.cards', 'utf8').replace(/\n$/, '');
const COMMITTED_TEXT = readFileSync('demos/reentry-summary.data.cards', 'utf8');
const TRAJECTORY_PAGE = readFileSync('test/golden/reentry.page.txt', 'utf8');

/** §1's step count: one punched card per printed detail row. */
const ROWS = 92;
/** §5.11's `CTL 2` — a 1411 Model 2, 20,000 positions (A22-0526-3 p.5), which the deck declares. */
const MACHINE_POSITIONS = 20_000;
/** `POCKET_OF_X3`: x3 = `0` is pocket NP, the one `P1 0,PAREA` selects (`punch1402.ts:36`). */
const POCKET = '0';

/** Units digit with a 12-zone: +0 through +9 (charset.md §2.1). */
const PLUS_ZONE = '?ABCDEFGHI';
/** Units digit with an 11-zone: -0 through -9. */
const MINUS_ZONE = '!JKLMNOPQR';

interface FieldSpec {
  readonly name: string;
  /** 1-based card columns, inclusive. */
  readonly from: number;
  readonly to: number;
  /** Implied decimal places — the point is not punched (§8.2, §8.5). */
  readonly scale: number;
  /** True where the field can arrive with an 11-zone units digit. */
  readonly signed: boolean;
  /** The deck's own field name — the A field of this column's move into `PAREA`. */
  readonly source: string;
  /** The layer-3 quantity this column is a fixed-point view of. */
  readonly layer3: keyof TrajectoryRow;
  /** §4.5's published bound for this column, in units at `scale`. */
  readonly tolerance: number;
}

/**
 * §8.2's table, verbatim, and it is the authoritative copy for this file. Column 1 is the record
 * code and columns 79-80 the sequence; the ten rows below are the numeric fields between them.
 * `GAMMA` and `RANGE` are ABSENT ON PURPOSE — both are closed-form functions of the case card and
 * `h`, and a card that carries derivable fields is a card that can disagree with itself.
 */
const FIELDS: readonly FieldSpec[] = [
  { name: 'TIME', from: 2, to: 6, scale: 2, source: 'T',
    signed: false, layer3: 't', tolerance: 0 },
  { name: 'ALTITUDE', from: 7, to: 14, scale: 1, source: 'H',
    signed: false, layer3: 'h', tolerance: 0 },
  { name: 'VELOCITY', from: 15, to: 22, scale: 2, source: 'V',
    signed: false, layer3: 'v', tolerance: 0 },
  { name: 'V A-E', from: 23, to: 30, scale: 2, source: 'VAE',
    signed: false, layer3: 'vAE', tolerance: 0 },
  { name: 'DIFF', from: 31, to: 38, scale: 2, source: 'DIF',
    signed: true, layer3: 'diff', tolerance: 0 },
  { name: 'DECEL', from: 39, to: 46, scale: 1, source: 'DG',
    signed: false, layer3: 'decelG', tolerance: 0 },
  { name: 'DYN PRESS', from: 47, to: 54, scale: 1, source: 'QB',
    signed: false, layer3: 'dynPressure', tolerance: 0 },
  // The deck TRUNCATES this argument where layer 3 half-adjusts it, so on the 71 rows where the
  // value is negative — every row above the RHO0 crossing — the card is one unit at S = 6 SMALLER
  // IN MAGNITUDE than the reference. The page prints `PL10` at 4 digits S = 3, three decades
  // coarser, which is why wave 4's page tests cannot see this at all.
  { name: 'LOG10 RHO-R', from: 55, to: 62, scale: 6, source: 'L10R',
    signed: true, layer3: 'log10RhoRatio', tolerance: 1 },
  { name: 'HEAT RATE', from: 63, to: 70, scale: 2, source: 'QD',
    signed: false, layer3: 'heatRate', tolerance: 0 },
  // Accumulated over the 92-step trapezoid: 0.03 out of 19,489, 1.5e-6 relative. The page prints
  // `QTOT-2` at 6 digits S = 0, which drops both decimals this bound is measured in.
  { name: 'HEAT LOAD', from: 71, to: 78, scale: 2, source: 'QTOT',
    signed: false, layer3: 'heatLoad', tolerance: 3 },
];
interface Run {
  readonly stop: StopReason | undefined;
  readonly punched: readonly Card[];
  readonly stackers: Readonly<Record<string, number>>;
  readonly channel1: ChannelStatus & { readonly interlock: boolean };
}

/**
 * The whole operator sequence, in the order a person performs it, through `machine.start()` and
 * NOT `machine.run()` — `test/tier4-reentry-target.test.ts`'s own `operate()`, with the punch
 * pocket taken off the DEVICE at the halt instead of the paper off the snapshot.
 */
function operate(): Run {
  const result = assemble(SOURCE);
  expect(result.ok, 'demos/reentry.asm assembles').toBe(true);
  expect(result.warnings, 'demos/reentry.asm assembles with warnings').toEqual([]);
  const machine = createMachine({ size: MACHINE_POSITIONS });
  const { deck: card, errors } = parseDeck(`${CASE_CARD}\n`);
  expect(errors, 'the case card parses with zero errors').toEqual([]);
  machine.loadDeck([...loaderDeck(result.deck), ...card]);
  machine.readerStart();
  machine.readerEndOfFile();
  machine.display(BOOTSTRAP_ORIGIN);
  machine.setMode('alter');
  expect(machine.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks)).toBe(12);
  machine.computerReset();
  machine.setMode('run');

  let stop: StopReason | undefined;
  for (let i = 0; stop === undefined && i < 4_000_000; i += 1) stop = machine.start(1);
  machine.endOfJob();

  const state = machine.snapshot();
  return {
    stop,
    punched: machine.punch.pockets[POCKET],
    stackers: state.punch.stackers,
    channel1: state.channel1,
  };
}

const run = operate();
const committed = parseDeck(COMMITTED_TEXT);
const layer3 = simulateFixed().rows;

/** The 80 glyphs of a punched card, which is what a person reads off the face of it. */
const glyphsOf = (card: Card): string => [...card].map((code) => glyphOf(code)).join('');

const faces = committed.deck.map(glyphsOf);

/** A field's text, 1-based and inclusive, the way §8.2's table numbers the columns. */
const cut = (face: string, field: FieldSpec): string => face.slice(field.from - 1, field.to);

/**
 * An unedited numeric field: leading positions are bare digits and the units position is a digit,
 * a 12-zone digit or an 11-zone digit. Returns `undefined` for anything else — a comma, a point, a
 * blank or a stray sign character — so the caller reports the glyph rather than a NaN.
 */
function decode(text: string): { readonly units: number; readonly minus: boolean } | undefined {
  const lead = text.slice(0, -1);
  const last = text.slice(-1);
  if (!/^[0-9]*$/.test(lead)) return undefined;
  const plus = PLUS_ZONE.indexOf(last);
  const minus = MINUS_ZONE.indexOf(last);
  const digit = /^[0-9]$/.test(last) ? Number(last) : plus >= 0 ? plus : minus;
  if (digit < 0) return undefined;
  return { units: Number(`${lead}${digit}`), minus: minus >= 0 };
}

/** The signed integer a field carries, at its own scale — `-000006` at S = 2 is -0.06. */
const signedUnits = (d: { readonly units: number; readonly minus: boolean }): number =>
  (d.minus ? -d.units : d.units);

/** Layer 3's value for one row and one column, rounded to the same scale the card carries. */
const referenceUnits = (row: TrajectoryRow, field: FieldSpec): number =>
  Math.round((row[field.layer3] as number) * 10 ** field.scale);

describe('Wave 5 — the punch and §8.2s card contract (plan §13 criterion 16)', () => {
  it('the trajectory run halts with 92 cards in pocket 0 and channel 1 clear', () => {
    // §8.1's whole finding: a `P1` into an area with no group-mark-with-word-mark of its own runs
    // past the end of it, the channel returns `wrongLengthRecord` and NO CARD IS PUNCHED, with no
    // error the operator sees. So the count is asserted rather than the absence of an error — and
    // the channel is asserted too, because that is where the silent failure would show.
    expect(run.stop, `the run ended ${String(run.stop)} and not on the deck's own H`).toBe('halt');
    expect(run.stackers[POCKET], 'cards stacked in pocket 0').toBe(ROWS);
    expect(Object.values(run.channel1).some((flag) => flag),
      `channel 1 at the halt: ${JSON.stringify(run.channel1)}`).toBe(false);
  });

  it('THE HEADLINE — demos/reentry-summary.data.cards DEEP-EQUALS what the run punched', () => {
    // The comparison is over BCD code arrays on the DEVICE (`punch1402.ts:104`), never over the
    // snapshot, which carries counts only. This is the case that makes "no trajectory number is
    // ever hand-typed into a file" enforceable: the committed file is a decode of these cards.
    expect(committed.errors, 'the committed deck parses with zero errors').toEqual([]);
    expect(committed.deck, `the committed deck holds ${committed.deck.length} cards`)
      .toHaveLength(ROWS);
    expect(run.punched, `the punch stacked ${run.punched.length} cards`).toHaveLength(ROWS);
    expect(run.punched).toEqual(committed.deck);
  });

  it('§8.2s field table covers all 80 columns end to end, with no gap and no overlap', () => {
    // The table sums to 80 or the contract is not a contract. Column 1 is the record code and
    // 79-80 the sequence, so the ten numeric fields must tile 2..78 exactly.
    let next = 2;
    for (const field of FIELDS) {
      expect(field.from, `${field.name} starts at column ${field.from}, not ${next}`).toBe(next);
      next = field.to + 1;
    }
    expect(next, 'the numeric fields end at column 78 and the sequence takes 79-80').toBe(79);
    expect(FIELDS.map((f) => f.name)).not.toContain('GAMMA');
    expect(FIELDS.map((f) => f.name)).not.toContain('RANGE');
  });

  it('the punch block moves exactly twelve fields into PAREA, at the columns the table declares', () => {
    // §8.2's block read out of the deck itself, so both "GAMMA and RANGE are not punched" and
    // every field's own columns are properties of the PROGRAM and not of this file's table. The
    // destination is asserted with the source because of the trap §8.2 names: `PAREA` resolves
    // HIGH-order, so `PAREA+1` is card column 2, and `MLCA KREC,PAREA+1` puts the record code one
    // column right and the whole RPG job silently reads no records. Every other field addresses
    // `PAREA+(end-1)`, and `MLC SEQ,PAREA+79` is columns 79-80.
    const moves = [...SOURCE.matchAll(/^\d{5}\s+MLCA?\s+(\S+),(PAREA(?:\+\d+)?)\s/gm)]
      .map((m) => [m[1] ?? '', m[2] ?? ''] as const);
    expect(moves, `the deck moves ${moves.length} fields into PAREA`).toEqual([
      ['KREC', 'PAREA'],
      ...FIELDS.map((f) => [f.source, `PAREA+${f.to - 1}`] as const),
      ['SEQ', 'PAREA+79'],
    ]);
    const sources = moves.map(([a]) => a);
    // Both fields EXIST in the deck — wave 4 prints them — so their absence here is a choice.
    expect(SOURCE, 'the deck has no KGAM to leave out').toMatch(/^\d{5}KGAM\s+DCW\b/m);
    expect(SOURCE, 'the deck has no RNG to leave out').toMatch(/^\d{5}RNG\s+DCW\b/m);
    expect(sources).not.toContain('KGAM');
    expect(sources).not.toContain('RNG');
  });

  it('every card is 80 columns of record code, unedited digits and a sequence number', () => {
    faces.forEach((face, i) => {
      const card = i + 1;
      expect(face, `card ${card} is ${[...face].length} columns`).toHaveLength(80);
      expect(face[0], `card ${card} column 1 is "${face[0] ?? ''}" and §8.2 fixes T`).toBe('T');
      for (const field of FIELDS) {
        const text = cut(face, field);
        expect(decode(text), `card ${card} ${field.name} columns ${field.from}-${field.to} `
          + `reads "${text}" — not an unedited ${field.to - field.from + 1}-digit field`)
          .toBeDefined();
      }
      // No comma, no point, no blank, anywhere on the card: the point is implied and carried in
      // the RPG Data sheet's edit words (§8.5), which is how a period shop carried scale.
      expect(face, `card ${card} carries an edited character`).not.toMatch(/[,. ]/);
    });
  });

  it('the sign zone lives in the units position, and only DIFF and LOG10 RHO-R ever go minus', () => {
    // §8.2's "signed" reading, asserted as the deck keeps it (see the header): the two named
    // fields are the only two that ever carry an 11-zone, and the other eight never do. The 12
    // zone is on eight of the ten and is what an MLC of a 1410 signed field puts there.
    const minusRows: Record<string, number> = {};
    faces.forEach((face, i) => {
      for (const field of FIELDS) {
        const decoded = decode(cut(face, field));
        if (decoded?.minus !== true) continue;
        minusRows[field.name] = (minusRows[field.name] ?? 0) + 1;
        expect(field.signed, `card ${i + 1} ${field.name} columns ${field.from}-${field.to} reads `
          + `"${cut(face, field)}" — an 11-zone on a field §8.2 does not call signed`).toBe(true);
      }
    });
    expect(minusRows, 'DIFF and LOG10 RHO-R are the two signed columns and both must exercise it')
      .toEqual({ DIFF: 40, 'LOG10 RHO-R': 71 });
  });

  it('the sequence runs 01 to 92 in order and agrees with the pages 92 STEPS counter', () => {
    faces.forEach((face, i) => {
      const seq = face.slice(78, 80);
      expect(seq, `card ${i + 1} carries sequence "${seq}" in columns 79-80`)
        .toBe(String(i + 1).padStart(2, '0'));
    });
    // The page's own summary counter, off the wave-4 golden: the deck moves `NSTEP`'s low two
    // digits into `SEQ`, so the two artifacts count the same steps or one of them is lying.
    const steps = /END OF RUN\.\s+(\d+) STEPS\./.exec(TRAJECTORY_PAGE)?.[1];
    expect(steps, 'the trajectory page carries no END OF RUN step count').toBeDefined();
    expect(Number(steps), `the page counts ${String(steps)} steps and the punch stacked `
      + `${run.punched.length} cards`).toBe(ROWS);
  });

  it('§8.2 IN BOTH DIRECTIONS — 80 glyphs back through parseDeck deep-equal the card', () => {
    // The round trip is stated on the CARD, not on the text (`formats/card.ts`): decode a punched
    // `Card` to its 80 glyphs, hand the text back to `parseDeck`, and get the same card with zero
    // parse errors. That is what makes the committed file a faithful transcription rather than a
    // lossy rendering of one, and it is asserted on the CARDS THE RUN PUNCHED.
    run.punched.forEach((card, i) => {
      const face = glyphsOf(card);
      const { deck, errors } = parseDeck(`${face}\n`);
      expect(errors, `card ${i + 1} re-parses with ${errors.length} errors: ${face}`).toEqual([]);
      expect(deck, `card ${i + 1} re-parses to ${deck.length} cards`).toHaveLength(1);
      expect(deck[0], `card ${i + 1} does not survive the round trip: ${face}`).toEqual(card);
    });
  });

  it('EIGHT of the ten fields equal layer 3 EXACTLY on all 92 rows', () => {
    // The card is the deck's own arithmetic, unedited, so eight columns are digit for digit
    // against `simulateFixed()` — the same layer-3 fixed-point simulator wave 3's per-step
    // equality runs against. A tolerance of 0 is the assertion, not a formality.
    expect(layer3, `layer 3 has ${layer3.length} rows`).toHaveLength(ROWS);
    for (const field of FIELDS.filter((f) => f.tolerance === 0)) {
      faces.forEach((face, i) => {
        const decoded = decode(cut(face, field));
        const value = signedUnits(decoded ?? { units: NaN, minus: false });
        const reference = referenceUnits(layer3[i] as TrajectoryRow, field);
        expect(value, `row ${i + 1} ${field.name} columns ${field.from}-${field.to}: card `
          + `${value} vs layer 3 ${reference}, difference ${value - reference} units at `
          + `S = ${field.scale}`).toBe(reference);
      });
    }
  });

  it('LOG10 RHO-R is within ONE unit at S = 6, and the deck truncates where layer 3 half-adjusts', () => {
    const field = FIELDS.find((f) => f.name === 'LOG10 RHO-R') as FieldSpec;
    let differing = 0;
    faces.forEach((face, i) => {
      const value = signedUnits(decode(cut(face, field)) ?? { units: NaN, minus: false });
      const reference = referenceUnits(layer3[i] as TrajectoryRow, field);
      const delta = value - reference;
      if (delta !== 0) differing += 1;
      expect(Math.abs(delta), `row ${i + 1} ${field.name} columns ${field.from}-${field.to}: card `
        + `${value} vs layer 3 ${reference}, difference ${delta} units at S = ${field.scale}, `
        + `published bound ${field.tolerance}`).toBeLessThanOrEqual(field.tolerance);
      // One-sided, and only where the argument is negative: truncation toward zero is a SMALLER
      // magnitude, so the card sits one unit ABOVE a negative reference and never below it.
      if (delta !== 0) {
        expect(delta, `row ${i + 1} ${field.name} deviates by ${delta}, not by +1`).toBe(1);
        expect((layer3[i] as TrajectoryRow).log10RhoRatio,
          `row ${i + 1} ${field.name} deviates on a non-negative argument`).toBeLessThan(0);
      }
    });
    expect(differing, `${field.name} deviates on ${differing} rows`).toBe(71);
  });

  it('HEAT LOAD is within THREE units at S = 2 — 1.5e-6 relative over the 92-step trapezoid', () => {
    const field = FIELDS.find((f) => f.name === 'HEAT LOAD') as FieldSpec;
    let differing = 0;
    faces.forEach((face, i) => {
      const value = signedUnits(decode(cut(face, field)) ?? { units: NaN, minus: false });
      const reference = referenceUnits(layer3[i] as TrajectoryRow, field);
      const delta = value - reference;
      if (delta !== 0) differing += 1;
      expect(Math.abs(delta), `row ${i + 1} ${field.name} columns ${field.from}-${field.to}: card `
        + `${value} vs layer 3 ${reference}, difference ${delta} units at S = ${field.scale}, `
        + `published bound ${field.tolerance}`).toBeLessThanOrEqual(field.tolerance);
    });
    expect(differing, `${field.name} deviates on ${differing} rows`).toBe(73);
    // The bound in the units the artifact is read in: 0.03 BTU/ft2 out of 19,489.
    const last = faces[ROWS - 1] as string;
    const value = signedUnits(decode(cut(last, field)) ?? { units: NaN, minus: false });
    const reference = referenceUnits(layer3[ROWS - 1] as TrajectoryRow, field);
    expect(Math.abs(value - reference) / reference,
      `the last row's HEAT LOAD is ${value / 100} against layer 3's ${reference / 100}`)
      .toBeLessThan(2e-6);
  });
});
