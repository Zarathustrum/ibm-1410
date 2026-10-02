// Tier 3 — THE INTEGRATION ON THE REAL MACHINE (docs/plans/phase-6-reentry.md §11 wave 3,
// §12.1 T3). `demos/reentry.asm` through `assemble()` -> `loaderDeck()` -> the real 1402 -> the
// real condensed loader -> the real 1411 -> the 1403, driven through `machine.start()`, and the
// trajectory it computes read back against `test/fixtures/reentry-reference.ts`.
//
// THE FIXTURE IS THE AUTHORITY AND THE DECK IS THE SUBJECT. Wave 1 wrote and published the
// reference layers and §4.5's tolerances before this deck existed. Nothing in this file may be
// widened and no row may be dropped to make a case pass: under §4.5's rule, verbatim, "a tolerance
// published in docs/BUILD-LOG-6.md before the golden may not be widened, and the reference may not
// be edited to match the program, without Tom's authorisation." A disagreement is a defect in
// `demos/reentry.asm` and a finding for `docs/BUILD-LOG-6.md`, and §11.2 states which of the two
// moves when they disagree: layer 3 is a REGRESSION PIN, never the gate.
//
// THE SIX ORACLES §11's wave-3 row names, one `describe` each so a red case says which broke:
//   (a) the emulated (V, h) at every one of the 92 steps equals layer 3 EXACTLY;
//   (b) max |V - V A-E| over the 92 rows <= the published 0.50 ft/s;
//   (c) the four NACA checkpoints against the EMULATED run at §4.5's tolerances;
//   (d) the `y1 > 0` guard and the `h <= 0` guard, each asserted in BOTH directions;
//   (e) `assemble()` clean and `demos/reentry.cards` the closed loop of Phase 3;
//   (f) the deck's OWN rescale offsets, parsed out of `demos/reentry.asm`, against §5.3's table —
//       the step that makes wave 1's scaling assertion mean something about the PROGRAM rather
//       than about the fixture, which checks the fixture against the rule and nothing else.
// Plus the two figures wave 3 republishes: criterion 6's high-water, and the derived constants
// the init block forms.
//
// HOW THE STATE IS READ. The four-column dump prints ALTITUDE at S = 0 and VELOCITY at S = 0, so
// the page cannot carry the hundredths oracle (a) compares. The run is therefore driven one
// instruction per `machine.start()` — the same call the internals panel makes once an animation
// frame — and the deck's own `V`, `H`, `VAE`, `T` and `K1V` fields are read out of core at the
// instant each line reaches the paper, which is before the step that follows updates them. The
// page is then checked against those same fields, so the printed columns are tied to the state
// rather than compared with themselves.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { digitOf } from '../src/core/alu.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import type { StopReason } from '../src/core/types.js';
import { formatDeck, parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';
import {
  ANTA_DIGITS, DEFAULT_CASE, DERIVED, G0, PRODUCTS, TOLERANCES,
  closedFormCheckpointsApply, derive, eq13Velocity, eq15PeakDecelAltitude,
  eq16PeakDecelVelocity, eq17PeakDecelG, fixedConstants, halfAdjust, simulateFixed,
} from './fixtures/reentry-reference.js';

const SOURCE = readFileSync('demos/reentry.asm', 'utf8');
/** The one case card, without its terminating newline — the tests splice fields into it. */
const CASE_CARD = readFileSync('demos/reentry.case.cards', 'utf8').replace(/\n$/, '');
const CARDS = readFileSync('demos/reentry.cards', 'utf8');

const result = assemble(SOURCE);

/**
 * §6.12's card, by the sub-entry column each field ENDS in: `CREC` 1, `CVE` 9, `CGAM` 15,
 * `CSIN` 23, `CCOT` 31, `CLV` 39, `CWCD` 47, `CRN` 53, `CLRN` 61, `CHE` 68, `CTOP` 75, `CDT` 79.
 * Each edit below is a 0-based start and the characters that replace it, so a spliced card is the
 * shipped card with one field changed and every other column — the two consistency checks
 * included — exactly as punched.
 */
function splice(...edits: readonly (readonly [number, string])[]): string {
  let card = CASE_CARD;
  for (const [from, text] of edits) card = card.slice(0, from) + text + card.slice(from + text.length);
  return card;
}
/** `CWCD`, the eight digits ending in column 47 — W/(C_D A) at S = 2. */
const withWOverCdA = (lbPerFt2: number): string =>
  splice([39, Math.round(lbPerFt2 * 100).toString().padStart(8, '0')]);

/** §1's step count, committed before this wave ran; §7.2's print positions are in `DETAIL`. */
const ROWS = 92;

/**
 * TIME 14-19, ALTITUDE 23-29, VELOCITY 33-38, V A-E 42-47 — §7.2's committed map, so these
 * positions do NOT move when wave 4 adds columns 5-12 to their right and a heading block above
 * them (§11.1 rule 1). Everything to the right of position 47 is ignored on purpose.
 *
 * THE CELLS ARE DIGITS, COMMAS AND BLANKS, never `.` the metacharacter: a heading line with the
 * same thirteen-blank margin and the same three-position gutters would otherwise match, and the
 * "exactly 92 detail rows" precondition — the thing that stops an empty parse passing vacuously —
 * would count it. TIME's own `\d\.\d{2}` is most of that guard on its own; the bounded lookaheads
 * on the other three make each of them carry at least one digit.
 */
const DETAIL = /^ {13}([ \d]{3}\.\d{2}) {3}(?=[ \d,]{0,6}\d)([ \d,]{7}) {3}(?=[ \d,]{0,5}\d)([ \d,]{6}) {3}(?=[ \d,]{0,5}\d)([ \d,]{6})/;
/** A printed cell as a number — the edit word's commas and blanks are punctuation, not digits. */
const cellValue = (cell: string): number => Number(cell.replace(/[ ,]/g, ''));

/** One printed row, read out of core at the instant the line reached the paper. */
interface Row {
  /** `T`, 5 digits at S = 2. */
  readonly t: number;
  /** `H`, 8 digits at S = 1. */
  readonly h: number;
  /** `V`, 8 digits at S = 2. */
  readonly v: number;
  /** `VAE`, 8 digits at S = 2 — column 4, eq.13 at this row's altitude. */
  readonly vae: number;
  /**
   * `K1V`, the stage-1 |dV/dt| at S = 2. It is written once per step, at the row's OWN state, and
   * is not touched again until the next row's stage 1 — so the value standing when row N prints is
   * row N-1's deceleration. That is what locates the peak-deceleration row without a DECEL column,
   * which this wave does not print (§7.2 column 7 is wave 4's).
   */
  readonly k1v: number;
}

interface Run {
  readonly machine: Machine;
  readonly stop: StopReason | undefined;
  readonly rows: readonly Row[];
  /** Read one of the deck's own fields out of core: units address, positions, implied point. */
  readonly field: (name: string, positions: number, s: number) => number;
}

/**
 * The whole operator sequence, in the order a person performs it, through `machine.start()` and
 * NOT `machine.run()`: the stop print-out lives inside `start()` (wave 0, §9.8), and this run has
 * to end on the programmed halt that types its `S` line.
 */
function operate(caseCard: string): Run {
  const machine = createMachine({ size: 20_000 });
  const { deck, errors } = parseDeck(`${caseCard}\n`);
  expect(errors, 'the case card parses with zero errors').toEqual([]);
  // `tools/run-deck.ts`'s sequence: the object deck through `loaderDeck()`, then the case card.
  machine.loadDeck([...loaderDeck(result.deck), ...deck]);
  // READER START then END OF FILE — IBM's own procedure: with fewer than four cards behind the
  // last one the machine would stop Not Ready instead (research/software.md §10.7).
  machine.readerStart();
  machine.readerEndOfFile();
  // MODE = DISPLAY at 00000, MODE = ALTER, the twelve PRE-SPLIT bootstrap keystrokes.
  machine.display(BOOTSTRAP_ORIGIN);
  machine.setMode('alter');
  expect(machine.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks)).toBe(12);
  machine.computerReset();
  machine.setMode('run');

  const field = (name: string, positions: number, s: number): number => {
    const entry = result.symbols.get(name);
    if (entry === undefined) throw new Error(`no symbol ${name} in demos/reentry.asm`);
    let digits = 0;
    // An ordinary label on a `DCW` resolves LOW-order (software.md §5), so `value` is the units
    // position and the field runs left from it. The deck computes on magnitudes (§5.1 rule 4, the
    // comment block), so the zone bits carry no information the value needs.
    for (let i = positions - 1; i >= 0; i--) digits = digits * 10 + digitOf(machine.storage.read(entry.value - i));
    return digits / 10 ** s;
  };

  const rows: Row[] = [];
  let stop: StopReason | undefined;
  let instructions = 0;
  let onPaper = 0;
  // One instruction per START. `printer.paper` is the device's own array, so the test sees a line
  // the moment the 1403 accepts it and reads core before the step that follows overwrites V and H.
  //
  // A ROW IS CAPTURED ON `DETAIL`, NEVER ON THE PAPER LENGTH. §11.1 rule 1 promises this file's
  // numeric cases do not move when wave 4 lands a heading block above the table and an overflow
  // heading between the forms; keying the capture on the paper growing made that promise false,
  // because every heading line would push a spurious `Row` of whatever state stood at the time and
  // shift every index in this file by the number of heading lines printed before it. Keying it on
  // §7.2's own detail regex — the same predicate the print-position cases below parse with — makes
  // it true: heading lines carry no TIME cell at positions 14-19 and are skipped.
  while (stop === undefined && instructions < 4_000_000) {
    stop = machine.start(1);
    instructions++;
    if (machine.printer.paper.length > onPaper) {
      const printed = machine.printer.paper[machine.printer.paper.length - 1];
      onPaper = machine.printer.paper.length;
      if (printed !== undefined && DETAIL.test(printed.text)) {
        rows.push({
          t: field('T', 5, 2), h: field('H', 8, 1), v: field('V', 8, 2),
          vae: field('VAE', 8, 2), k1v: field('K1V', 8, 2),
        });
      }
    }
  }
  machine.endOfJob();
  return { machine, stop, rows, field };
}

const run = operate(CASE_CARD);
const state = run.machine.snapshot();
const page = state.printer.paper;

/** Layer 3, the regression pin (§4.4), and the closed forms it is pinned beside. */
const layer3 = simulateFixed();

/** The row carrying the largest stage-1 deceleration, and the state at it. `K1V` lags by one. */
function peakDecelerationRow(rows: readonly Row[]): { row: Row; index: number; g: number } {
  let best = 0;
  let where = 0;
  for (let i = 1; i < rows.length; i++) {
    const k1v = rows[i]?.k1v ?? 0;
    if (k1v > best) { best = k1v; where = i - 1; }
  }
  const row = rows[where];
  if (row === undefined) throw new Error('no peak-deceleration row: the run printed nothing');
  return { row, index: where + 1, g: best / G0 };
}

const peak = peakDecelerationRow(run.rows);

/** Fixed digits, so a difference reads as ulp at the field's own S rather than as binary float. */
const digitsAt = (s: number) => (x: number): number => Math.round(x * 10 ** s);

// ─── (e) the deck assembles clean, and Phase 3's loop closes ────────────────────────────────

describe('Tier 3 — ORACLE (e): the deck assembles clean and the card file is the closed loop', () => {
  it('ok, ZERO flagged lines and ZERO warnings — all three (criterion 5)', () => {
    expect(result.ok).toBe(true);
    expect(result.flagged).toEqual([]);
    // Not decorative, and this is why criterion 5 names all three. A loader record's terminating
    // group-mark-with-word-mark lands at `loadAddress + count`, and the warning fires when that
    // position is inside a reserved area (Phase 3 plan §8.3, Phase 5 §6.3, §8.1). `ok` alone is
    // green on such a deck. An empty array is the statement that §6.11's `ORG *+1` slack cards
    // put every terminator where nothing lives.
    expect(result.warnings).toEqual([]);
  });

  it('demos/reentry.cards IS assemble(demos/reentry.asm) through loaderDeck(), plus the case card', () => {
    // Phase 3's closed loop, criterion 5. A hand edit to the committed card file is a RED GATE
    // here rather than a review finding — which is what makes "the deck in the repository is the
    // deck the assembler produces" a mechanical statement.
    const built = [...loaderDeck(result.deck), ...parseDeck(`${CASE_CARD}\n`).deck];
    const committed = parseDeck(CARDS);
    expect(committed.errors, 'demos/reentry.cards parses with zero errors').toEqual([]);
    expect(committed.deck.length, `demos/reentry.cards holds ${committed.deck.length} cards and the `
      + `assembler produces ${built.length}`).toBe(built.length);
    expect(committed.deck).toEqual(built);
    // And byte for byte, so a difference in a column that decodes to the same punches still fails.
    expect(`${formatDeck(loaderDeck(result.deck))}${CASE_CARD}\n`).toBe(CARDS);
  });
});

// ─── criterion 6 — the program fits ─────────────────────────────────────────────────────────

describe('Tier 3 — CRITERION 6: the program fits in the machine it declares', () => {
  /**
   * THE CEILING WAS RE-CUT, AND WHAT IT IS NOW IS A MACHINE FACT RATHER THAN A JUDGEMENT.
   *
   * §5.11's `<= 09,000` was the plan's own REASONED ceiling on a 10,000-position machine — a margin
   * it chose to leave itself, not anything the hardware or the assembler enforces. The phase has
   * since moved to a **1411 Model 2**, a real machine at 20,000 positions (A22-0526-3 p.5), which is
   * also what IBM's Autocoder assumed in the absence of a `CTL` card (research/software.md:150); the
   * deck carries `CTL 2` and `src/ui/main.ts`, `tools/run-deck.ts` and `tools/rpg.ts` all build the
   * machine at 20,000. So the assertion is restated as what criterion 6 actually claims — THE
   * PROGRAM FITS IN THE MACHINE IT DECLARES — with the high-water asserted by all three routes it
   * already used and no symbol above the machine. `PLGM` is still decisive; it has moved with the
   * page from §5.11's estimated 08,732 to 11,132, because wave 4's heading block, twelve columns,
   * overflow heading and summary literals grew the deck past that estimate.
   *
   * `PLINE` sits at `ORG 11000`, moved up from 10,100 BEFORE the deck grew into it. At 10,100 there
   * were 28 positions of headroom above `ANTA` (09,378-10,368), and overrunning a `DS` produces an
   * assembler WARNING rather than an error — so a wave-5 deck could have shipped with the loader
   * writing over `PLINE` while `assemble().ok` stayed `true`. Criterion 5 asserts zero warnings for
   * exactly that reason; the `ORG` is what makes zero warnings cheap to keep.
   */
  const MACHINE_POSITIONS = 20_000;
  const HIGH_WATER = 11_132;

  it(`the high-water is ${HIGH_WATER} by all three routes, and PLGM is the decisive symbol`, () => {
    // `SymbolEntry` carries `value: Addr` and NO length (src/asm/types.ts:107-118), so a bare
    // maximum of the symbol values is NOT the high-water: it is the maximum symbol value plus the
    // EXTENT of the area it names. Here `PLGM` — the one-position group mark above `PLINE` — is
    // decisive, and the three routes criterion 6 names all have to give the same number.
    const lengthOfArea = new Map<string, number>();
    for (const line of result.listing) {
      if (line.label !== '' && line.ct !== undefined) lengthOfArea.set(line.label, line.ct);
    }
    let bySymbol = 0;
    let decisive = '';
    for (const [name, entry] of result.symbols) {
      // A low-order-resolved label IS the last position of its area; a high-order one is the first.
      const last = entry.resolvedTo === 'lowOrder'
        ? entry.value
        : entry.value + (lengthOfArea.get(name) ?? 1) - 1;
      if (last > bySymbol) { bySymbol = last; decisive = name; }
    }
    const byItems = Math.max(...result.items.map((item) => item.at + item.cells.length - 1));
    const byListing = Math.max(...result.listing
      .filter((line) => line.addrs !== undefined && line.ct !== undefined)
      .map((line) => (line.addrs ?? 0) + (line.ct ?? 0) - 1));

    expect(decisive, 'PLGM is what sets the high-water').toBe('PLGM');
    expect(bySymbol, 'symbols + extent').toBe(HIGH_WATER);
    expect(byItems, 'items[].at + cells.length - 1').toBe(HIGH_WATER);
    expect(byListing, "the listing's ADDRS + CT column").toBe(HIGH_WATER);
    expect(bySymbol, `the high-water is ${bySymbol}, past the last position of the `
      + `${MACHINE_POSITIONS}-position machine the deck's CTL 2 declares`)
      .toBeLessThan(MACHINE_POSITIONS);
    // And PLINE, the only other thing up there, ends one position below it.
    expect((result.symbols.get('PLINE')?.value ?? 0) + 132 - 1).toBe(HIGH_WATER - 1);
  });

  it('no symbol at all sits outside the machine', () => {
    for (const [name, entry] of result.symbols) {
      expect(entry.value, `${name} resolves to ${entry.value}, outside the `
        + `${MACHINE_POSITIONS}-position machine`).toBeLessThan(MACHINE_POSITIONS);
    }
  });
});

// ─── the run itself, and the parse precondition ─────────────────────────────────────────────

describe('Tier 3 — the run reaches the programmed halt', () => {
  it('the machine halts, the hopper empties, and nothing error-stopped', () => {
    expect(run.stop).toBe('halt');
    expect(state.reader.hopper).toBe(0);
    expect(state.console.filter((line) => line.id === 'E')).toEqual([]);
  });

  it('THE PRECONDITION: 92 printed detail lines and 92 rows of state, before any comparison', () => {
    // Asserted BEFORE the value cases below, so a comparison over an empty parse fails HERE rather
    // than passing vacuously (§12.1's parse preconditions, the same discipline wave 4 owes column
    // by column). 92 is §1's own step count and it is the `h <= 0` guard that fixes it.
    //
    // It counts DETAIL lines, not lines of paper. Wave 3's dump printed nothing but detail, so the
    // two counts were the same number; wave 4's page carries a heading block, an overflow heading
    // and a summary block as well, and pinning the whole paper's length here would pin wave 4's
    // page shape inside wave 3's file. What this precondition is FOR is unchanged: 92 rows reached
    // the paper and 92 rows of state were captured beside them.
    expect(page.filter((line) => DETAIL.test(line.text))).toHaveLength(ROWS);
    expect(run.rows).toHaveLength(ROWS);
    for (const [i, row] of run.rows.entries()) {
      for (const [name, value] of Object.entries(row)) {
        expect(Number.isFinite(value), `row ${i + 1}'s ${name} did not read back as a number`).toBe(true);
      }
    }
  });
});

// ─── (a) exact per-step equality ────────────────────────────────────────────────────────────

describe('Tier 3 — ORACLE (a): every one of the 92 steps equals layer 3 EXACTLY', () => {
  // THE REGRESSION PIN, NEVER THE GATE (§4.4, §11.2). Layer 3 and the deck are written from one
  // scaling table, so agreement proves a shared implementation and not correctness — and §11.2's
  // tie-break says which one moves: criterion 13 red means the DECK is wrong whatever this case
  // says; this case red with criterion 13 green means the SIMULATOR is wrong. Neither may be
  // edited to chase the other in the direction that goes through layer 4.
  const s1 = digitsAt(1);
  const s2 = digitsAt(2);

  it('layer 3 also stops at 92 rows — the two runs are the same length', () => {
    expect(layer3.rows).toHaveLength(ROWS);
  });

  it('T, H, V and V A-E agree digit for digit on all 92 rows', () => {
    for (const [i, row] of run.rows.entries()) {
      const want = layer3.rows[i];
      if (want === undefined) throw new Error(`layer 3 has no row ${i + 1}`);
      expect(s2(row.t), `row ${i + 1}: the deck's T is ${row.t.toFixed(2)} and layer 3 gives `
        + `${want.t.toFixed(2)}, a difference of ${(row.t - want.t).toFixed(2)} s`).toBe(s2(want.t));
      expect(s1(row.h), `row ${i + 1} (t = ${row.t.toFixed(2)} s): the deck's H is `
        + `${row.h.toFixed(1)} ft and layer 3 gives ${want.h.toFixed(1)}, a difference of `
        + `${(row.h - want.h).toFixed(1)} ft`).toBe(s1(want.h));
      expect(s2(row.v), `row ${i + 1} (t = ${row.t.toFixed(2)} s): the deck's V is `
        + `${row.v.toFixed(2)} ft/s and layer 3 gives ${want.v.toFixed(2)}, a difference of `
        + `${(row.v - want.v).toFixed(2)} ft/s`).toBe(s2(want.v));
      expect(s2(row.vae), `row ${i + 1} (t = ${row.t.toFixed(2)} s): the deck's V A-E is `
        + `${row.vae.toFixed(2)} ft/s and layer 3 gives ${want.vAE.toFixed(2)}, a difference of `
        + `${(row.vae - want.vAE).toFixed(2)} ft/s`).toBe(s2(want.vAE));
    }
  });

  it('THE BAND-TOP STATE: row 1 starts at 22,939.51 ft/s and NOT at the card\'s V-E of 23,000', () => {
    // The single highest-cost one-line error available in this deck (§4.1, §6.3, and the fixture's
    // own note at `Derived.v0`). The run starts on eq.13's curve continued down from h_E, not at
    // the entry velocity the same card carries: loading `V` from `CVE` instead puts the whole
    // trajectory 60.46 ft/s off eq.13 on EVERY row — 121x the published 0.50 ft/s DIFF bound.
    const first = run.rows[0];
    if (first === undefined) throw new Error('the run printed no rows');
    expect(first.h).toBe(DEFAULT_CASE.bandTop);
    expect(s2(first.v), `row 1's V is ${first.v.toFixed(2)} ft/s; layer 3's band-top state is `
      + `${(layer3.rows[0]?.v ?? 0).toFixed(2)}`).toBe(s2(layer3.rows[0]?.v ?? 0));
    expect(first.v).toBe(22_939.51);
    expect(first.v, "row 1 loaded the card's V-E instead of the band-top state (§4.1)")
      .not.toBe(DEFAULT_CASE.vE);
    // And the gap is the one §4.1 prices, to the ft/s: layer 2's band top against the card.
    expect(DEFAULT_CASE.vE - DERIVED.v0).toBeCloseTo(60.46, 2);
  });
});

// ─── (b) the DIFF bound ─────────────────────────────────────────────────────────────────────

describe('Tier 3 — ORACLE (b): max |V - V A-E| over the 92 rows', () => {
  it(`is inside the published ${TOLERANCES.maxAbsDiffFtPerS} ft/s — on every row and in the worst`, () => {
    // The bound was written down from S = 2 and the step count BEFORE the simulator was ever run
    // against it (§4.5's derivation, published by wave 1 in docs/BUILD-LOG-6.md). It is the
    // PUBLISHED bound that is asserted; the measurement goes in the message.
    let worst = 0;
    let where = 0;
    for (const [i, row] of run.rows.entries()) {
      const diff = Math.abs(row.v - row.vae);
      if (diff > worst) { worst = diff; where = i + 1; }
      expect(diff, `row ${i + 1} (t = ${row.t.toFixed(2)} s): the deck's V is ${row.v.toFixed(2)} `
        + `and its V A-E is ${row.vae.toFixed(2)}, |DIFF| ${diff.toFixed(4)} ft/s`)
        .toBeLessThanOrEqual(TOLERANCES.maxAbsDiffFtPerS);
    }
    expect(worst, `the worst |V - V A-E| is ${worst.toFixed(4)} ft/s at row ${where} against the `
      + `published ${TOLERANCES.maxAbsDiffFtPerS}`).toBeLessThanOrEqual(TOLERANCES.maxAbsDiffFtPerS);
  });
});

// ─── (c) the four NACA checkpoints, against the EMULATED run ────────────────────────────────

describe('Tier 3 — ORACLE (c): the four NACA 1381 checkpoints against the EMULATED run', () => {
  it('CHECKPOINT 1 — eq.13 per row: column 4 against the closed form at every one of the 92 rows', () => {
    // Column 4 is eq.13 through the deck's own two antilog chains, so what bounds it is the
    // ANTILOG's published tolerance — §4.5's eq.7 atmosphere row, 1.0e-5 RELATIVE, five times the
    // §5.6 truncation bound — and not the 1.0e-2 ft/s of layer 1 against layer 2, which is a
    // statement about RK4's method error and has no fixed point in it.
    let worst = 0;
    let where = 0;
    for (const [i, row] of run.rows.entries()) {
      const closed = eq13Velocity(row.h);
      const relative = Math.abs(row.vae - closed) / closed;
      if (relative > worst) { worst = relative; where = i + 1; }
      expect(relative, `row ${i + 1} (t = ${row.t.toFixed(2)} s, h = ${row.h.toFixed(1)} ft): the `
        + `deck's V A-E is ${row.vae.toFixed(2)} ft/s and eq.13 gives ${closed.toFixed(2)}, a `
        + `difference of ${(row.vae - closed).toFixed(4)} ft/s (${relative.toExponential(3)} relative)`)
        .toBeLessThanOrEqual(TOLERANCES.atmosphereRelative);
    }
    expect(worst, `worst ${worst.toExponential(3)} relative at row ${where}`)
      .toBeLessThanOrEqual(TOLERANCES.atmosphereRelative);
  });

  it(`CHECKPOINT 2 — eq.15 y1: the peak-deceleration altitude within ${TOLERANCES.eq15AltitudeFeet} ft`, () => {
    // ONE INTEGRATION STEP, V sin(gamma) dt at that row. A grid property and not an error bound:
    // the run prints at 0.25 s, so the printed peak row is displaced from the true peak by up to
    // half a step in each direction. This is the number that has to change if dt changes.
    const closed = eq15PeakDecelAltitude();
    const delta = Math.abs(peak.row.h - closed);
    expect(delta, `the emulated peak-deceleration row is row ${peak.index} at h = `
      + `${peak.row.h.toFixed(1)} ft; eq.15 gives y1 = ${closed.toFixed(1)} ft; the difference is `
      + `${delta.toFixed(1)} ft against one integration step of ${TOLERANCES.eq15AltitudeFeet} ft`)
      .toBeLessThanOrEqual(TOLERANCES.eq15AltitudeFeet);
  });

  it(`CHECKPOINT 3 — eq.16 V1: the peak row's velocity within ${TOLERANCES.eq16VelocityFtPerS} ft/s`, () => {
    const closed = eq16PeakDecelVelocity();
    const delta = Math.abs(peak.row.v - closed);
    expect(delta, `the emulated peak-deceleration row is row ${peak.index} at V = `
      + `${peak.row.v.toFixed(2)} ft/s; eq.16 gives V1 = ${closed.toFixed(2)} ft/s; the difference `
      + `is ${delta.toFixed(2)} ft/s against one integration step of `
      + `${TOLERANCES.eq16VelocityFtPerS} ft/s`).toBeLessThanOrEqual(TOLERANCES.eq16VelocityFtPerS);
  });

  it('CHECKPOINT 4 — eq.17 peak g: within 0.5 % of 68.7343', () => {
    // The deck does not print DECEL this wave (§7.2 column 7 is wave 4's), so the figure comes off
    // `K1V` — the deck's own stage-1 |dV/dt| at the row's own state — over g0.
    const closed = eq17PeakDecelG();
    expect(closed).toBeCloseTo(68.7343, 4);
    const relative = Math.abs(peak.g - closed) / closed;
    expect(relative, `the emulated peak deceleration is ${peak.g.toFixed(4)} g at row `
      + `${peak.index}; eq.17 gives ${closed.toFixed(4)} g; the difference is `
      + `${(peak.g - closed).toFixed(4)} g, ${(relative * 100).toFixed(4)} %, against the published `
      + `${TOLERANCES.peakDecelGRelative * 100} %`).toBeLessThanOrEqual(TOLERANCES.peakDecelGRelative);
  });

  it('THE eq.17 INVARIANCE REGRESSION: doubling W/(C_D A) leaves the peak g where it is', () => {
    // eq.17 is independent of mass, size and C_D, so re-running with W/(C_D A) doubled to 2,000
    // must leave the peak-g figure standing. It is free, and it catches a scaling error in the
    // drag chain that nothing else on this wave's page can see (§4.6, criterion 11).
    const doubled = operate(withWOverCdA(2_000));
    expect(doubled.stop).toBe('halt');
    const other = peakDecelerationRow(doubled.rows);
    expect(doubled.rows.length, 'the doubled case is a shorter table — 66 rows, §4.6').toBe(66);
    const closed = eq17PeakDecelG({ ...DEFAULT_CASE, wOverCdA: 2_000 });
    expect(closed).toBeCloseTo(eq17PeakDecelG(), 6);
    const relative = Math.abs(other.g - peak.g) / peak.g;
    expect(relative, `at W/(C_D A) = 1,000 the deck peaks at ${peak.g.toFixed(4)} g (row `
      + `${peak.index}, h = ${peak.row.h.toFixed(1)} ft) and at 2,000 it peaks at `
      + `${other.g.toFixed(4)} g (row ${other.index}, h = ${other.row.h.toFixed(1)} ft) — a `
      + `difference of ${(relative * 100).toFixed(4)} % where eq.17 says there is none`)
      .toBeLessThanOrEqual(TOLERANCES.peakDecelGRelative);
    expect(Math.abs(other.g - closed) / closed).toBeLessThanOrEqual(TOLERANCES.peakDecelGRelative);
  });
});

// ─── (d) the two guards, each in both directions ────────────────────────────────────────────

describe('Tier 3 — ORACLE (d): the two guards', () => {
  it('GUARD A fires at W/(C_D A) = 5,000 — K = 0.4813, y1 = -838 ft, and the deck sets NOEQF', () => {
    // §4.6 and §6.9: y1 = (1/beta) ln(2K) is not positive exactly when 2K is not above 1, so the
    // deck's guard is `C ONE,KTWO` / `BL NOEQ` on the constant init has just formed — general in
    // gamma_E and beta_B, not a threshold on one input. This wave prints a four-column dump with
    // no summary block, so what the guard leaves behind is `NOEQF`, the one-position flag §7.7's
    // line reads in wave 4.
    const guarded = operate(withWOverCdA(5_000));
    expect(guarded.stop).toBe('halt');
    const guardedCase = { ...DEFAULT_CASE, wOverCdA: 5_000 };
    // The reference agrees that the checkpoints do not apply, and on the two numbers §4.6 names.
    expect(closedFormCheckpointsApply(guardedCase)).toBe(false);
    expect(derive(guardedCase).k).toBeCloseTo(0.4813, 4);
    expect(Math.round(eq15PeakDecelAltitude(guardedCase))).toBe(-838);
    // 2K low. The deck's own compare operand, read out of core at its own S = 7.
    const ktwo = guarded.field('KTWO', 8, 7);
    expect(ktwo, `the deck formed 2K = ${ktwo.toFixed(7)}; the guard fires only when it is not `
      + 'above 1.0000000').toBeLessThan(1);
    // WITHIN ONE ULP AT S = 7, NOT EQUAL, and the difference is the deck's own divide. `MLC
    // DIVF-9,KK` takes eight quotient digits with no `A +5` — the one truncating move in the deck
    // that carries no half-adjust (§6.3's block comment; it is the single exemption the pairing
    // case below names). `fixedConstants()` half-adjusts instead. On the card as punched the two
    // land on the same eight digits and the case below asserts exact equality; here, at
    // W/(C_D A) = 5,000, they differ by one unit in the last place — 0.9626460 against 0.9626461 —
    // which is a defect in neither and is recorded in docs/BUILD-LOG-6.md, because it says that
    // layer 3 and the deck agree on THIS card rather than on every card (Tom's decision 5).
    expect(Math.abs(digitsAt(7)(ktwo) - digitsAt(7)(halfAdjust(2 * derive(guardedCase).k, 7))),
      `the deck formed 2K = ${ktwo.toFixed(7)} and the reference gives `
      + `${halfAdjust(2 * derive(guardedCase).k, 7).toFixed(7)}`).toBeLessThanOrEqual(1);
    expect(guarded.field('NOEQF', 1, 0), 'the deck did NOT refuse eqs.16-17 at W/(C_D A) = 5,000: '
      + `NOEQF is ${guarded.field('NOEQF', 1, 0)} and 2K is ${ktwo.toFixed(7)}`).toBe(1);
    // And it prints the trajectory as usual — the guard refuses the checkpoints, not the run.
    expect(guarded.rows.length).toBeGreaterThan(0);
  });

  it('GUARD A does NOT fire on the card as punched — the negative case, so it cannot rot', () => {
    // Without this the assertion above is satisfied by a deck that sets the flag unconditionally.
    const ktwo = run.field('KTWO', 8, 7);
    expect(closedFormCheckpointsApply()).toBe(true);
    expect(ktwo, `the shipped card forms 2K = ${ktwo.toFixed(7)}, which must be above 1`)
      .toBeGreaterThan(1);
    expect(ktwo).toBe(halfAdjust(2 * DERIVED.k, 7));
    expect(run.field('NOEQF', 1, 0), 'the deck refused eqs.16-17 on the card as punched, where '
      + `y1 = ${eq15PeakDecelAltitude().toFixed(1)} ft is positive`).toBe(0);
    // §4.6's own threshold, measured: 2K = 1 exactly at beta_B = 149.6 slug/ft^2, i.e. at
    // W/(C_D A) = 149.6 x g0 = 4,813.23 lb/ft^2 — so the first WHOLE lb/ft^2 that trips the guard
    // is 4,814 and not the 4,813 §4.6 rounds it to. Neither 1,000 nor 5,000 is near the boundary,
    // which is what makes the pair of cases above a real test of the compare and not of a tie.
    expect(derive({ ...DEFAULT_CASE, wOverCdA: 4_814 }).k * 2).toBeLessThan(1);
    expect(derive({ ...DEFAULT_CASE, wOverCdA: 4_813 }).k * 2).toBeGreaterThan(1);
    expect(derive({ ...DEFAULT_CASE, wOverCdA: 149.6 * G0 }).k * 2).toBeCloseTo(1, 12);
  });

  it('GUARD B refuses the 93rd step at h = -62.3 ft — 92 rows, the last at t = 22.75 s', () => {
    // §6.9's `BZN DONEH,H,B` tests the CANDIDATE h before committing the step and before printing,
    // so the last printed row is the last row above ground. `ALTITUDE` is an unsigned six-digit
    // field with a comma edit word: without the guard the last row would print a negative altitude
    // through an unsigned edit. This is loop control — the run ends because the vehicle arrived.
    const last = run.rows[ROWS - 1];
    if (last === undefined) throw new Error('the run printed no last row');
    expect(last.t).toBe(22.75);
    expect(last.h).toBe(198.7);
    // The candidate the deck refused is exactly what it had computed: H less the combination it
    // declined to commit, both at S = 1.
    const refused = digitsAt(1)(run.field('H', 8, 1) - run.field('DHT', 8, 1));
    expect(refused, `the deck refused a candidate of ${(refused / 10).toFixed(1)} ft; layer 3 `
      + `refused ${layer3.refusedAltitude.toFixed(1)} ft`).toBe(digitsAt(1)(layer3.refusedAltitude));
    expect(refused).toBe(-623);
    expect(run.rows).toHaveLength(ROWS);
  });
});

// ─── the two case-card consistency checks (criterion 11) ────────────────────────────────────

describe('Tier 3 — the case card is checked before anything is integrated (criterion 11)', () => {
  // §13 criterion 11: "the two case-card consistency checks (SIN^2 (1 + COT^2) = 1, and each
  // punched logarithm antilogged back against its own field) halt with a PRINTED DIAGNOSTIC on a
  // corrupted card rather than integrating." That is §6.1's `BADP` path — ~55 instructions and
  // three 40-character literals — and the assertion that gives it teeth is ZERO DETAIL ROWS: a
  // deck that printed its diagnostic and then integrated anyway would satisfy everything else.
  //
  // The `1` in `SW PLGM` / `CS PLINE+131` / `CS PLINE+99` / `MLCA KBn,PLINE+52` / `W1 PLINE` is
  // one line on one form, so the count is the whole shape of the failure path.
  const diagnostic = (name: string, card: string, message: string): void => {
    it(`${name} — halts with a printed diagnostic and integrates nothing`, () => {
      const bad = operate(card);
      expect(bad.stop, 'the bad card must reach the programmed halt, not run away').toBe('halt');
      const paper = bad.machine.snapshot().printer.paper;
      expect(paper.map((line) => line.text.trimEnd()))
        .toEqual([`${' '.repeat(13)}${message}`]);
      expect(paper.filter((line) => DETAIL.test(line.text)),
        'the deck integrated the corrupted card instead of refusing it').toEqual([]);
    });
  };

  // Card column 1 is not `C`. `BCE GOODCD,CREC,C` is the first thing after the read.
  diagnostic('COLUMN 1 IS NOT C', splice([0, 'X']),
    'CASE CARD - COLUMN 1 IS NOT THE LETTER C');
  // CHECK 1 — sin^2 (1 + cot^2) = 1. The cotangent is punched 5.08e-6 low against sqrt(3), five
  // hundred times the one unit at S = 7 the check allows.
  diagnostic('SIN AND COT ARE INCONSISTENT', splice([23, '17320000']),
    'CASE CARD - SIN AND COT ARE INCONSISTENT');
  // CHECK 2 — each punched logarithm antilogged back. log10(V_E) punched 2.78e-5 low rebuilds
  // V_E as 22,998.53 against the 23,000.00 in the card's own `CVE` field.
  diagnostic('A PUNCHED LOGARITHM IS WRONG', splice([31, '43617000']),
    'CASE CARD - A PUNCHED LOGARITHM IS WRONG');

  it('a ONE-ULP cotangent is ACCEPTED, in both directions — §6.3\'s tolerance is not tightened', () => {
    // §6.1's own comment card, and it is an instruction rather than an observation: "THE TOLERANCE
    // IS ONE UNIT IN THE LAST DIGIT AND IT IS SPENT BY A CORRECTLY PUNCHED COTANGENT. ROOT 3 IS
    // 1.73205081, THE CARD HOLDS 8 DIGITS AT S 7, AND EXACTLY 1.0000000 IS NOT A REACHABLE
    // RESULT. DO NOT TIGHTEN IT." A check that rejected the card the deck ships with would be
    // worse than no check, so both neighbours of the punched cotangent are asserted to run.
    for (const [name, digits] of [['one ulp low', '17320507'], ['one ulp high', '17320509']] as const) {
      const ok = operate(splice([23, digits]));
      expect(ok.stop).toBe('halt');
      expect(ok.rows, `a cotangent ${name} of 1.7320508 was refused, which tightens the tolerance `
        + '§6.3 says is spent by a correct punching').toHaveLength(ROWS);
    }
  });
});

// ─── (f) the deck's own rescale offsets, against §5.3's table ────────────────────────────────

/** One source statement, as the assembler's own column rules cut it (src/asm/types.ts). */
interface Statement {
  /** Source columns 1-5, as punched — the card sequence number a reader will look for. */
  readonly seq: string;
  readonly op: string;
  /** The first whitespace-delimited token from column 21. Every operand parsed here is one token. */
  readonly operand: string;
}

const STATEMENTS: readonly Statement[] = SOURCE.split('\n')
  .filter((card) => card.length > 20 && card[5] !== '*')
  .map((card) => ({
    seq: card.slice(0, 5),
    op: card.slice(15, 20).trim(),
    operand: card.slice(20).trimStart().split(/\s/)[0] ?? '',
  }))
  .filter((line) => line.op !== '');

/** `A +5,BASE-n` and `A +5,BASE-n+X1` — §5.1 rule 3's half-adjust, and nothing else. */
const HALF_ADJUST = /^\+5,([A-Z0-9]+)(?:-(\d+))?(\+X1)?$/;
/** `MLC BASE-n,DEST` / `ZA BASE-n,DEST`, indexed or not — the one-move rescale of §5.1 rule 2. */
const RESCALE = /^([A-Z0-9]+)(?:-(\d+))?(\+X1)?,([A-Z0-9]+)$/;

/** How far a rescale may sit from its half-adjust. Six is the widest in the deck — DERIV's
 *  renormalise arm puts a `BCE`, a second half-adjust, an `MLC`, an `A` and a `B` between the two
 *  halves of the RHOOK path. Eight leaves room and still binds. */
const PAIR_WINDOW = 8;

interface HalfAdjustSite {
  readonly seq: string;
  readonly index: number;
  readonly base: string;
  readonly offset: number;
  readonly indexed: string;
}

const HALF_ADJUST_SITES: readonly HalfAdjustSite[] = STATEMENTS.flatMap((line, index) => {
  if (line.op !== 'A') return [];
  const hit = HALF_ADJUST.exec(line.operand);
  if (hit === null) return [];
  return [{
    seq: line.seq, index, base: hit[1] ?? '', offset: Number(hit[2] ?? 0), indexed: hit[3] ?? '',
  }];
});

/** Every rescale move out of a product or accumulator field, with where it sits in the statement
 *  stream, so the two directions of the pairing rule can both be checked. */
interface RescaleSite {
  readonly seq: string;
  readonly index: number;
  readonly base: string;
  readonly offset: number;
  readonly indexed: string;
  readonly dest: string;
}

const RESCALE_SITES: readonly RescaleSite[] = STATEMENTS.flatMap((line, index) => {
  if (line.op !== 'MLC' && line.op !== 'ZA') return [];
  const hit = RESCALE.exec(line.operand);
  if (hit === null) return [];
  return [{
    seq: line.seq, index, base: hit[1] ?? '', offset: Number(hit[2] ?? 0),
    indexed: hit[3] ?? '', dest: hit[4] ?? '',
  }];
});

/** The fields a rescale actually rescales OUT of: the multiply B-field, the two accumulators the
 *  init block and `DERIV` scale down in place, and the divide's quotient area. A move out of an
 *  ordinary work field is a move, not a rescale, and carries no half-adjust obligation. */
const PRODUCT_FIELDS = ['PROD', 'CQ8', 'AD', 'DIVF'];

/** The half-adjusts and the product rescales, interleaved IN SOURCE ORDER — which is what lets a
 *  rescale consume the half-adjust that was written for it instead of matching any that happens to
 *  carry the right number. */
type PairingEvent =
  | { readonly kind: 'halfAdjust'; readonly site: HalfAdjustSite }
  | { readonly kind: 'rescale'; readonly move: RescaleSite };

const PAIRING_STREAM: readonly PairingEvent[] = [
  ...HALF_ADJUST_SITES.map((site) => ({ kind: 'halfAdjust' as const, site, index: site.index })),
  ...RESCALE_SITES.filter((move) => PRODUCT_FIELDS.includes(move.base))
    .map((move) => ({ kind: 'rescale' as const, move, index: move.index })),
].sort((a, b) => a.index - b.index);

/**
 * The §5.3 rows this wave's deck implements, keyed by the multiply itself — `ZA a,PROD-x` /
 * `M b,PROD` / `A +5,PROD-(n-1)` / `MLC PROD-n,dest` — so the key is what the statement group
 * DOES and not where it sits on a card. Rows 12-17 (the heating chain, DECEL, DYN PRESS, the
 * trapezoid and RANGE) belong to wave 4's derived-quantity block and are deliberately not required
 * here; nothing below forbids them, so wave 4 adds them without editing this file (§11.1).
 *
 * `indexed` sites carry the DECADE in X1, biased by the deck's own `KBIAS` of +10 (§5.2), so the
 * literal offset on the card is the table's offset plus the bias and the effective offset is
 * `literal - X1` — which is exactly §5.3's "6 - RHOD, indexed" and "7, then the decade".
 */
const DECADE_BIAS = 10;
interface ProductSite {
  readonly n: number;
  readonly a: string;
  readonly b: string;
  readonly dest: string;
  readonly indexed?: true;
}
const PRODUCT_SITES: readonly ProductSite[] = [
  { n: 1, a: 'KC2', b: 'H', dest: 'W1' },
  { n: 1, a: 'KC2', b: 'HS', dest: 'W1' },
  { n: 2, a: 'KLN2', b: 'R', dest: 'W3' },
  { n: 3, a: 'W3', b: 'R', dest: 'W3' },
  { n: 4, a: 'MANT', b: 'W3', dest: 'MANT' },
  { n: 5, a: 'RR0', b: 'MANT', dest: 'RHOM' },
  { n: 6, a: 'VS', b: 'VS', dest: 'W1' },
  { n: 7, a: 'W1', b: 'CDP', dest: 'W2' },
  { n: 8, a: 'W2', b: 'RHOM', dest: 'AD', indexed: true },
  { n: 9, a: 'VS', b: 'SING', dest: 'DHM' },
  { n: 10, a: 'KKL', b: 'MANT', dest: 'W1', indexed: true },
  { n: 11, a: 'VE', b: 'MANT', dest: 'VAE', indexed: true },
  { n: 18, a: 'K1V', b: 'DT2', dest: 'W1' },
  { n: 18, a: 'K1H', b: 'DT2', dest: 'W1' },
  { n: 18, a: 'K2V', b: 'DT2', dest: 'W1' },
  { n: 18, a: 'K2H', b: 'DT2', dest: 'W1' },
  { n: 18, a: 'K3V', b: 'DT', dest: 'W1' },
  { n: 18, a: 'K3H', b: 'DT', dest: 'W1' },
  { n: 19, a: 'SUMH', b: 'DT6', dest: 'DHT' },
  { n: 19, a: 'SUMV', b: 'DT6', dest: 'DVT' },
];

/** Every `M b,PROD` in the deck, with the multiplier image behind it and the rescales in front. */
interface MultiplySite {
  readonly seq: string;
  readonly a: string;
  readonly b: string;
  readonly field: string;
  readonly rescales: readonly RescaleSite[];
}

const MULTIPLIES: readonly MultiplySite[] = STATEMENTS.flatMap((line, index) => {
  if (line.op !== 'M') return [];
  const [b, field] = line.operand.split(',');
  if (b === undefined || field === undefined) return [];
  let a = '';
  for (let j = index - 1; j >= 0 && j > index - 4; j--) {
    const back = STATEMENTS[j];
    if (back?.op === 'ZA' && (back.operand.split(',')[1] ?? '').startsWith(field)) {
      a = back.operand.split(',')[0] ?? '';
      break;
    }
  }
  return [{
    seq: line.seq, a, b, field,
    rescales: RESCALE_SITES.filter((site) => site.base === field
      && site.index > index && site.index <= index + PAIR_WINDOW && site.dest !== field),
  }];
});

describe('Tier 3 — ORACLE (f): the DECK\'S OWN rescale offsets against §5.3\'s table', () => {
  // This is the case that makes wave 1's scaling test mean something about the PROGRAM. That test
  // asserts the fixture's transcription of §5.2 and §5.3 against the RULE — offset = S_a + S_b -
  // S_target — and a consistent-but-wrong pair passes it. Nothing ties `demos/reentry.asm`'s
  // literal offsets to the table until they are read off the cards, here.

  it('THE PRECONDITION: the parse finds the half-adjusts, the rescales and the multiplies', () => {
    // A parse that returned nothing would make every assertion below vacuous, so it fails here.
    expect(HALF_ADJUST_SITES.length).toBeGreaterThanOrEqual(40);
    expect(RESCALE_SITES.length).toBeGreaterThanOrEqual(40);
    expect(MULTIPLIES.length).toBeGreaterThanOrEqual(39);
    expect(STATEMENTS.length).toBeGreaterThan(300);
  });

  it('THE INVARIANT: every truncating rescale CONSUMES its own `A +5`, one position right', () => {
    // §5.1 rule 3 and the plan's own correction to §5.4: the textual shape is `A +5,PROD-6`
    // immediately above `MLC PROD-7,DEST` for offset 7. A deck that half-adjusts AT the target
    // units adds a whole unit instead of half of one — the mutation wave 2 ran, and the reason
    // wave 2's handoff says "do not fix it to PROD-7".
    //
    // MATCHING ON BASE AND OFFSET ALONE IS NOT ENOUGH, and that is a measured finding rather than
    // a preference: `PROD` is the B-field of all 39 multiplies, so an UNPAIRED rescale can almost
    // always find some other chain's `A +5` at the offset it wants and borrow it. Card `03700`
    // did exactly that in the first cut of the deck — it read `PROD-1` and borrowed `DT6`'s
    // `A +5,PROD` four statements above, which had already been spent by `MLC PROD-1,DT6` — and a
    // window-and-offset rule passed it. So each half-adjust is CONSUMED by the first rescale that
    // takes it: `pending` is a per-base stack, a rescale pops the top and must find its own
    // offset less one there, and a borrowed pairing therefore fails.
    //
    // Innermost first, which is why the stack is LIFO rather than a queue: `DERIV`'s two arms
    // (§5.3 row 5) put two half-adjusts in flight at once — `A +5,PROD-6` for the in-range path
    // and `A +5,PROD-7` for the renormalised one — and the renormalise arm, which is nearer, is
    // the one that rescales first.
    const pending = new Map<string, HalfAdjustSite[]>();
    for (const line of PAIRING_STREAM) {
      if (line.kind === 'halfAdjust') {
        const stack = pending.get(line.site.base) ?? [];
        stack.push(line.site);
        pending.set(line.site.base, stack);
        continue;
      }
      const move = line.move;
      // AN EXACT RESCALE NEEDS NO HALF-ADJUST, and asserting one would be wrong rather than
      // merely strict: `MLC PROD,W1` at offset 0 reads the product's own units position and DROPS
      // NOTHING, so there is nothing to round. Card `03700` is the deck's one such site — the
      // nose-radius log at S = 8 into an S = 8 accumulator — and it consumes nothing, so a real
      // half-adjust waiting behind it stays waiting for the rescale it belongs to.
      if (move.offset === 0) continue;
      // The one other exemption, named rather than inferred: `MLC DIVF-9,KK` takes the eight
      // quotient digits of the ONE divide in the program, which is not a product rescale and
      // carries no `A +5` of its own (§6.3's block comment).
      if (move.seq === '03130') continue;
      const stack = pending.get(move.base) ?? [];
      const site = stack.pop();
      expect(site, `card ${move.seq} rescales ${move.dest} from ${move.base}-${move.offset}`
        + `${move.indexed} with no unspent \`A +5,${move.base}\` half-adjust anywhere above it`)
        .toBeDefined();
      if (site === undefined) continue;
      expect([site.offset, site.indexed], `card ${move.seq} rescales ${move.dest} from `
        + `${move.base}-${move.offset}${move.indexed}, so the half-adjust it spends must be `
        + `\`A +5,${move.base}-${move.offset - 1}${move.indexed}\` — the nearest unspent one is `
        + `card ${site.seq}'s \`A +5,${site.base}`
        + `${site.offset === 0 ? '' : `-${site.offset}`}${site.indexed}\``)
        .toEqual([move.offset - 1, move.indexed]);
    }
  });

  it('and no `A +5` is left unspent — a half-adjust with no rescale is a half-adjust in the wrong place', () => {
    // The other direction, out of the same walk: a half-adjust that nothing consumes is either a
    // rescale someone deleted or a half-adjust written at the wrong offset, and both are defects.
    const pending = new Map<string, HalfAdjustSite[]>();
    for (const line of PAIRING_STREAM) {
      if (line.kind === 'halfAdjust') {
        const stack = pending.get(line.site.base) ?? [];
        stack.push(line.site);
        pending.set(line.site.base, stack);
      } else if (line.move.offset !== 0 && line.move.seq !== '03130') {
        pending.get(line.move.base)?.pop();
      }
    }
    const unspent = [...pending.values()].flat();
    expect(unspent.map((site) => `card ${site.seq}: A +5,${site.base}`
      + `${site.offset === 0 ? '' : `-${site.offset}`}${site.indexed}`)).toEqual([]);
  });

  it('every §5.3 row this wave implements carries the table\'s own offset', () => {
    for (const want of PRODUCT_SITES) {
      const table = PRODUCTS.find((product) => product.n === want.n);
      if (table === undefined) throw new Error(`§5.3 has no row ${want.n}`);
      const sites = MULTIPLIES.filter((m) => m.a === want.a && m.b === want.b
        && m.rescales.some((move) => move.dest === want.dest));
      expect(sites.length, `§5.3 row ${want.n} (${table.product}) has no \`ZA ${want.a},…\` / `
        + `\`M ${want.b},…\` / rescale into ${want.dest} anywhere in demos/reentry.asm`)
        .toBeGreaterThan(0);
      for (const site of sites) {
        const offsets = site.rescales.filter((move) => move.dest === want.dest)
          .map((move) => (want.indexed === true ? move.offset - DECADE_BIAS : move.offset));
        const indexed = site.rescales.filter((move) => move.dest === want.dest)
          .every((move) => (move.indexed === '+X1') === (want.indexed === true));
        expect(indexed, `§5.3 row ${want.n} at card ${site.seq}: the table `
          + `${want.indexed === true ? 'requires' : 'forbids'} an indexed rescale `
          + `(${table.offsetNote ?? String(table.offset)})`).toBe(true);
        expect(offsets, `§5.3 row ${want.n} (${table.product}) at card ${site.seq}: the deck's `
          + `rescale into ${want.dest} reads from ${site.field}-${offsets.join('/')} and the table `
          + `gives offset ${table.offset}${table.offsetNote === undefined ? '' : ` (${table.offsetNote})`}`)
          .toContain(table.offset);
      }
    }
  });

  it('§5.3 row 5\'s second arm is the DECADE NORMALISE, at offset 8 and not a copy of ANTLOG\'s clamp', () => {
    // `RR0 x XM -> RHOM` peaks at 14.304 (§5.3 row 5), so the arm fires for real on many of the 92
    // rows: it rescales at offset EIGHT — a divide by ten — and bumps the decade. `ANTLOG`'s arm
    // of the same shape is a provably dead clamp that WRITES 1.0000000, and wave 2's build-log
    // entry says in terms that a wave-3 worker copying it here would destroy the mantissa's
    // significance while the exact-equality oracle above reported an "integration" mismatch.
    const arms = RESCALE_SITES.filter((move) => move.dest === 'RHOM' && move.base === 'PROD');
    expect(arms.map((move) => move.offset).sort((x, y) => x - y), 'RHOM must be rescaled at BOTH '
      + 'offset 7 (in range) and offset 8 (renormalised)').toEqual([7, 8]);
  });
});

// ─── the constants the init block forms ─────────────────────────────────────────────────────

describe('Tier 3 — the derived constants the init block forms equal fixedConstants()', () => {
  // A real oracle on the init block: the one divide, the eleven multiplies that come off it, and
  // the fields lifted straight from the card. It is what the two-part `1/6076.1` of §5.3 row 17
  // exists to keep true — one eight-digit reciprocal gives 28505962 against the 28505963 the
  // reference holds, so `CRNG` is formed from a high and a low term and both are checked here.
  const K = fixedConstants();
  /** Each `FixedConstants` field beside the deck's own symbol, its positions and its implied point. */
  const FIELDS: readonly (readonly [keyof typeof K, string, number, number])[] = [
    ['kc2', 'KC2', 8, 12], ['khc2', 'KHC2', 8, 13], ['rr0', 'RR0', 8, 7], ['cdp', 'CDP', 8, 6],
    ['bb', 'BB', 8, 6], ['cg', 'KCG', 8, 9], ['ve', 'VE', 8, 2], ['kkl', 'KKL', 8, 7],
    ['k315', 'K315', 8, 7], ['cq', 'CQ', 8, 7], ['c1', 'KC1', 8, 8], ['crng', 'CRNG', 8, 11],
    ['sing', 'SING', 1, 1], ['dt', 'DT', 4, 4], ['dt2', 'DT2', 4, 4], ['dt6', 'DT6', 8, 9],
    ['h0', 'H0', 8, 1], ['ktwo', 'KTWO', 8, 7],
  ];

  it('all eighteen agree digit for digit', () => {
    for (const [key, symbol, positions, s] of FIELDS) {
      const want = K[key];
      // §5.1 rule 4 and the deck's own comment block: the arithmetic runs on MAGNITUDES and the
      // sign is stamped with `MLZS`, so `SING` holds |sin gamma_E| where the fixture carries the
      // signed value. That is the only field where the two conventions differ.
      const expected = symbol === 'SING' ? Math.abs(want) : want;
      const got = run.field(symbol, positions, s);
      expect(got, `${symbol} (${key}) holds ${got} and the reference gives ${expected}`)
        .toBe(expected);
    }
  });

  it('and K itself — the ONE divide in the program — carries eight correct quotient digits', () => {
    // `fixedConstants()` has no `k` field, so nothing else in the phase pins the divide. Every
    // constant above that comes off it would move together if the quotient were one digit short.
    const kk = run.field('KK', 8, 7);
    expect(kk, `the deck's K is ${kk.toFixed(7)}; the reference gives `
      + `${halfAdjust(DERIVED.k, 7).toFixed(7)}`).toBe(halfAdjust(DERIVED.k, 7));
  });

  it('CQ TRACKS R-NOSE: at R-NOSE = 4.0000 the deck forms 3.8544933, half a decade down', () => {
    // THE ONLY TEST IN THE PHASE THAT VARIES R-NOSE, and it exists because the shipped card hides
    // an entire scaling error: CQ = log10(17600) - 1/2 log10(R_N) + 1/2 C1 + 3.15 log10(V_E/26000),
    // and log10(1.00) is ZERO, so the nose-radius term contributes nothing at all on the card as
    // punched. `MLC PROD,W1` at card 03700 is the rescale that carries it — offset 0, because
    // `CLRN8` is S = 7 and `KFIVE` is S = 1, so the product is S = 8 and `CQ8` is an S = 8
    // accumulator. At offset 1 the term arrived a decade low and CQ came out 4.1254203 here, a
    // tenth of the term short. §5.3 HAS NO ROW FOR THIS PRODUCT, so oracle (f) structurally cannot
    // see it; the only thing that can is a card with a different nose radius.
    //
    // CQ drives HEAT RATE and HEAT LOAD (§5.7), neither of which this wave prints — so without
    // this case the error ships into wave 4 and surfaces as two wrong columns on the page.
    const varied = operate(splice([47, '040000'], [53, '06020600']));
    expect(varied.stop).toBe('halt');
    const cq = varied.field('CQ', 8, 7);
    // The closed form, at the deck's own S: 4.1555233 - 1/2 log10(4) = 4.1555233 - 0.3010300.
    const closed = halfAdjust(K.cq - halfAdjust(Math.log10(4) / 2, 7), 7);
    expect(closed).toBe(3.8544933);
    expect(cq, `at R-NOSE = 4.0000 the deck forms CQ = ${cq.toFixed(7)} and the closed form gives `
      + `${closed.toFixed(7)}, a difference of ${(cq - closed).toFixed(7)}`).toBe(closed);
    // And the trajectory is untouched: R-NOSE enters nothing but the heating chain.
    expect(varied.rows).toHaveLength(ROWS);
  });
});

// ─── ANTA, as the deck punches it ───────────────────────────────────────────────────────────

describe('Tier 3 — ANTA is the table wave 2 proved, copied forward unaltered', () => {
  it('100 ten-digit cards, byte-equal to the fixture\'s ANTA_DIGITS', () => {
    // Wave 2's tenth mutation was a corrupted `ANTA` entry that NO ARGUMENT FETCHES, and the only
    // thing that caught it was the source-against-`ANTA_DIGITS` byte comparison — every numeric
    // oracle stayed green. This wave copies the whole table forward, so the same guard has to come
    // with it: a corrupted entry outside this trajectory's own decades is invisible to all 92
    // rows and would wait for a case card that reaches it.
    const punched = [...SOURCE.matchAll(/^\d{5}(?:ANTA)? +DCW +@(\d{10})@/gm)].map((hit) => hit[1]);
    expect(punched).toHaveLength(100);
    expect(punched).toEqual([...ANTA_DIGITS]);
  });
});

// ─── the four printed columns, tied back to the state ───────────────────────────────────────

describe('Tier 3 — the four printed columns at §7.2\'s own print positions', () => {
  const detail = page.filter((line) => DETAIL.test(line.text));

  it('THE PRECONDITION: exactly 92 lines parse at those positions, and every cell is a number', () => {
    expect(detail).toHaveLength(ROWS);
    for (const [i, line] of detail.entries()) {
      const hit = DETAIL.exec(line.text);
      if (hit === null) throw new Error(`row ${i + 1} stopped matching`);
      for (const cell of hit.slice(1)) {
        expect(cell.trim(), `row ${i + 1} printed an empty cell`).not.toBe('');
        expect(Number.isFinite(cellValue(cell)), `row ${i + 1} printed "${cell}", not a number`).toBe(true);
      }
    }
  });

  it('every printed cell is its own field TRUNCATED to the column\'s last digit', () => {
    // §5.1 rule 3 and §7.2 mechanism 1: the `FIELD-n` sub-field an `MCE` is handed drops the
    // low-order digits, it does not round them, and half-adjusting `V` or `H` before the print
    // would move the trajectory rather than the printout. So the printed cell is at or below the
    // field, never above it — which is why this compares against a truncation and not a rounding.
    for (const [i, line] of detail.entries()) {
      const hit = DETAIL.exec(line.text);
      const row = run.rows[i];
      if (hit === null || row === undefined) throw new Error(`no row ${i + 1}`);
      const cells = hit.slice(1, 5).map((cell) => cellValue(cell ?? ''));
      const want = [row.t, Math.trunc(row.h), Math.trunc(row.v), Math.trunc(row.vae)];
      const names = ['TIME', 'ALTITUDE', 'VELOCITY', 'V A-E'];
      for (const [c, cell] of cells.entries()) {
        expect(cell, `row ${i + 1}, column ${c + 1} ${names[c]}: the page prints `
          + `"${(hit[c + 1] ?? '').trim()}" and the deck's field holds ${want[c]}`).toBe(want[c]);
      }
    }
  });
});
