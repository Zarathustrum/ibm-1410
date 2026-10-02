// Tier 3 — THE CLOSED LOOP: what the assembler MEANT equals what the machine HOLDS
// (docs/plans/phase-3-autocoder.md §11.1; wave 2 owns this file).
//
//   applyToStorage(items) into a fresh Storage                                    the INTENT
//   pack(items, reserved) -> loaderDeck() -> the 1402 hopper -> the keyed bootstrap
//     -> COMPUTER RESET -> RUN, on the real Machine                               the RESULT
//   compare over the union of emitted addresses -> IDENTICAL, word marks included
//   the RESULT's EXTRA bytes are EXACTLY the SURVIVING GM-WMs, computed from the record list
//
// THE TWO SIDES ARE DELIBERATELY NOT THE SAME MODEL. The direct path writes payload cells and
// nothing else, so the loader's terminating group-mark-with-word-mark shows up as a NAMED,
// ASSERTED DIFFERENCE instead of being mirrored on both sides. That is what makes this an oracle
// rather than a restatement — and it is why "one GM-WM per record" is the wrong rule: a mark a
// later record's payload covers is gone (§8.3, §11.1). Nothing below this line was written by
// Phase 3: `loaderDeck`, `encodeObjectRecord`, the 1402, the loader program and the machine are
// all Phase 2's, which is §14 R7 — the assembler is not allowed to over-fit its own loader.
//
// THE ANTI-TAUTOLOGY RULE, and it is binding (§11.1). Every fixture below is `{ at, cells }`
// literals chosen for the property under test, and its EXPECTED CORE IMAGE is written out BY
// HAND as an address -> (character, word mark) table computed from those literals — never
// captured from what `pack()` or the machine returned. The same goes for the record geometry and
// the surviving marks: both are written by hand and then cross-checked against the packer. If a
// hand table and the packer ever disagree, the packer is the spec and the disagreement is a
// finding for `BUILD-LOG-3.md`, not a number to copy.
//
// ─── HOW WAVES 4 AND 6 EXTEND THIS FILE ────────────────────────────────────────────────────
// This file spans waves (§11's ownership note). Wave 2 owns the three programs that need no
// front end; wave 4 APPENDS three source-driven programs (a 200-character DCW that splits across
// four cards, a literal pool, and the demo) and wave 6 APPENDS the six re-run through
// `assemble()`. They append `ClosedLoopProgram` fixtures and one `describe` each, at the END of
// the file, and never rewrite a case above. Everything they need is in the SHARED HELPERS block
// below: build the fixture, call `closedLoop(program)`, add whatever program-specific `it`s the
// property under test deserves.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { GROUP_MARK_BCD } from '../src/core/move.js';
import { CoreStorage } from '../src/core/storage.js';
import { BCD6, WM, type Addr } from '../src/core/types.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';
import type { ObjectDeck, ObjectRecord } from '../src/formats/objectdeck.js';
import { assemble } from '../src/asm/assemble.js';
import { applyToStorage, pass2 } from '../src/asm/emit.js';
import { parse } from '../src/asm/operand.js';
import { pack, type ReservedExtent } from '../src/asm/pack.js';
import { pass1 } from '../src/asm/symbols.js';
import type { EmittedItem } from '../src/asm/types.js';
import { generate } from '../src/rpg/generate.js';

// ═══════════════════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS — waves 4 and 6 read these and add fixtures at the end of the file.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const code = (glyph: string): number => {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`"${glyph}" is not one of the 64`);
  return c;
};

/** Cells from a glyph string; `^` before a glyph marks it. Notation for fixtures only. */
function cells(text: string): Uint8Array {
  const out: number[] = [];
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '^') { i += 1; out.push(WM | code(chars[i] ?? '')); } else { out.push(code(chars[i] ?? '')); }
  }
  return Uint8Array.from(out);
}

/** One row of a HAND TABLE: `00500 ^A`. The `^` is the word mark. */
const row = (at: Addr, glyph: string, wm: boolean): string =>
  `${String(at).padStart(5, '0')} ${wm ? '^' : ' '}${glyph}`;

/** The group-mark-with-word-mark the loader plants at `loadAddress + count`. */
const GMWM = (at: Addr): string => row(at, glyphOf(GROUP_MARK_BCD), true);

interface ClosedLoopProgram {
  readonly name: string;
  /** Pass 2's output, hand-built in wave 2 and produced from source in waves 4 and 6. */
  readonly items: readonly EmittedItem[];
  /** The DS / DA extents `pack()` cannot otherwise see — hand-built beside the items (§8.3). */
  readonly reserved: readonly ReservedExtent[];
  /** THE HAND TABLE: every emitted position, `address glyph wordmark`, written by hand. */
  readonly image: readonly string[];
  /** Hand-computed record geometry: `[loadAddress, count]` per card, in DECK order. */
  readonly records: readonly (readonly [Addr, number])[];
  /** Hand-computed surviving GM-WM addresses — NOT one per record (§11.1). */
  readonly surviving: readonly Addr[];
  /** The §8.3 warnings this geometry earns, verbatim. */
  readonly warnings: readonly string[];
}

/** The INTENT: payload cells and word marks, and nothing else (§11.1's left side). */
function intent(program: ClosedLoopProgram): CoreStorage {
  const storage = new CoreStorage(10_000);
  applyToStorage(program.items, storage);
  return storage;
}

/**
 * The RESULT: the whole Phase-2 operator sequence, headless, exactly as
 * `test/tier4-demo-deck.test.ts` and `test/loader.test.ts` perform it — the PRE-SPLIT keystrokes
 * through the core façade, never the UI's `^` string.
 *
 * The decks below carry NO execute card (`ObjectDeck.entry` is undefined), so the loader loads
 * every condensed card and then takes its OTHER exit: the 1402 reports Condition on the read
 * after the last card and the `R 00349 9` at 00292 branches to the loader's own halt. Nothing of
 * ours is executed, which is what makes an arbitrary payload safe to load.
 */
function result(records: readonly ObjectRecord[]): { m: Machine; stop: string | undefined } {
  const deck: ObjectDeck = { records };
  const m = createMachine({ size: 10_000 });
  m.loadDeck(loaderDeck(deck));
  m.readerStart();
  m.readerEndOfFile();
  m.display(BOOTSTRAP_ORIGIN);
  m.setMode('alter');
  expect(m.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks)).toBe(12);
  m.computerReset();
  m.setMode('run');

  let stop: string | undefined;
  for (let i = 0; i < 600; i++) {
    stop = m.step();
    if (stop !== undefined) break;
  }
  return { m, stop };
}

/** Every position in the window that holds a character or a word mark, as hand-table rows. */
function occupied(read: (a: Addr) => number, marked: (a: Addr) => boolean, from: Addr, to: Addr): string[] {
  const rows: string[] = [];
  for (let a = from; a <= to; a++) {
    const cell = read(a);
    if ((cell & BCD6) === 0 && !marked(a)) continue;
    rows.push(row(a, glyphOf(cell & BCD6), marked(a)));
  }
  return rows;
}

/**
 * §11.1's own computation, written HERE rather than imported from `pack.ts`, so the assertion is
 * an independent statement of the rule and not a restatement of the code under test: the mark at
 * `loadAddress + count` of every record NO LATER RECORD COVERS.
 */
function survivingMarks(records: readonly ObjectRecord[]): Addr[] {
  const marks: Addr[] = [];
  for (const [i, record] of records.entries()) {
    const at = record.loadAddress + record.payload.length;
    const covered = records.slice(i + 1).some(
      (later) => at >= later.loadAddress && at < later.loadAddress + later.payload.length,
    );
    if (!covered) marks.push(at);
  }
  return marks;
}

/** The window the comparison runs over: the emitted addresses, the surviving marks, and a
 *  margin on both sides so a stray byte outside them fails the test. */
function windowOf(program: ClosedLoopProgram): readonly [Addr, Addr] {
  const addresses = [
    ...program.items.flatMap((item) => [item.at, item.at + item.cells.length - 1]),
    ...program.surviving,
  ];
  return [Math.min(...addresses) - 3, Math.max(...addresses) + 3];
}

/**
 * The five assertions every closed-loop program makes. Waves 4 and 6 call this with their own
 * fixtures; a program-specific `it` goes beside the call, never inside this function.
 */
function closedLoop(program: ClosedLoopProgram): void {
  const packed = pack(program.items, program.reserved);
  const [from, to] = windowOf(program);

  it('pack() cuts it into the records the hand-written geometry says', () => {
    expect(packed.records.map((r) => [r.loadAddress, r.payload.length]))
      .toEqual(program.records.map(([at, count]) => [at, count]));
    expect(packed.records.map((r) => r.sequence))
      .toEqual(program.records.map((_, i) => String(i + 1).padStart(3, '0')));
  });

  it('the §8.3 GM-WM tail warnings are the ones this geometry earns', () => {
    expect(packed.warnings).toEqual(program.warnings);
  });

  it('the SURVIVING GM-WMs computed from the record list are the hand-computed ones', () => {
    // Not "one per record": a mark a later record's payload covers is gone (§11.1).
    expect(survivingMarks(packed.records)).toEqual([...program.surviving]);
  });

  it('THE INTENT: applyToStorage writes exactly the hand table, and nothing else', () => {
    const storage = intent(program);
    expect(occupied((a) => storage.read(a), (a) => storage.wm(a), from, to))
      .toEqual([...program.image]);
  });

  it('THE RESULT: core after the REAL load equals the hand table, plus exactly the surviving GM-WMs', () => {
    const { m, stop } = result(packed.records);
    expect(stop, 'the loader reaches its own halt on the read after the last card').toBe('halt');

    // The expected machine image: the hand table, with a surviving GM-WM replacing whatever the
    // hand table says at that address (a clobber) or added at an address it does not mention.
    const marks = new Set(program.surviving);
    const want = [
      ...program.image.filter((line) => !marks.has(Number(line.slice(0, 5)))),
      ...program.surviving.map(GMWM),
    ].sort();

    expect(occupied((a) => m.storage.read(a), (a) => m.storage.wm(a), from, to).sort())
      .toEqual(want);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// WAVE 2, PROGRAM 1 — A DS GAP: two runs with a hole between them
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// The hole is the DS: it emits nothing, so the addresses it reserves are simply not covered
// (types.ts's `EmittedItem` comment — there is no `present` bitmap, absence IS the gap). The
// packer reads the gap directly and opens a second record, and the first record's terminating
// GM-WM lands INSIDE the reserved area — the case no rule that asks only "does another record
// cover this?" can see, which is why `pack()` is handed the reserved list at all (§8.3).

const DS_GAP: ClosedLoopProgram = {
  name: 'a DS gap',
  items: [
    { at: 500, cells: cells('^ABC'), seqno: 1 },      // three characters, marked at 00500
    // `GAP DS 5` at 00503 emits NOTHING — no item, no cells, no word mark.
    { at: 508, cells: cells('^DE'), seqno: 3 },       // two characters, marked at 00508
  ],
  reserved: [{ from: 503, to: 507, label: 'GAP' }],
  // HAND TABLE, computed from the two `cells()` literals above: 'ABC' at 00500-00502 with the
  // mark on the first, then five positions nothing writes, then 'DE' at 00508-00509.
  image: [
    row(500, 'A', true), row(501, 'B', false), row(502, 'C', false),
    row(508, 'D', true), row(509, 'E', false),
  ],
  // HAND GEOMETRY: 00500 is not contiguous with 00508, so two records. Columns: 2 + 1 + 1 = 4
  // and 2 + 1 = 3, both far inside the 60-column field, so the budget never bites.
  records: [[500, 3], [508, 2]],
  // HAND-COMPUTED TAILS: 00500 + 3 = 00503 (record 2 covers 00508-00509, so it survives) and
  // 00508 + 2 = 00510 (no later record at all).
  surviving: [503, 510],
  warnings: [
    'record 001\'s GM-WM lands at 00503, inside GAP — a read with d = `R` will transfer nothing; '
    + 'use `$`',
  ],
};

describe('CLOSED LOOP, program 1 — a DS gap (plan §11.1)', () => {
  closedLoop(DS_GAP);

  it('the DS extent is untouched by the INTENT and carries the planted GM-WM in the RESULT', () => {
    // "No information is entered into the area, no word mark is assigned by the processor, and
    // the area is not cleared prior to reservation" (software.md §5 verbatim, C28-0326-2 p.30) —
    // and then the loader plants a group mark in the first position of it anyway. That is the
    // warm-start hazard the warning above exists to say out loud.
    const storage = intent(DS_GAP);
    for (let a = 503; a <= 507; a++) {
      expect(storage.read(a) & BCD6, `the DS extent at ${a} is untouched by the assembler`).toBe(0);
      expect(storage.wm(a)).toBe(false);
    }
    const { m } = result(pack(DS_GAP.items, DS_GAP.reserved).records);
    expect(m.storage.read(503) & BCD6).toBe(GROUP_MARK_BCD);
    expect(m.storage.wm(503)).toBe(true);
    for (let a = 504; a <= 507; a++) {
      expect(m.storage.read(a) & BCD6, `the rest of the DS extent at ${a}`).toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// WAVE 2, PROGRAM 2 — A BACKWARDS ORG whose surviving GM-WM lands inside an earlier record
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// EMISSION ORDER IS DECK ORDER, and this program is what settles it (see `pack.ts`'s header):
// card 1 loads 00520-00522, card 2 loads 00500-00519, and card 2's terminating GM-WM lands at
// 00520 — ONE CHARACTER INSIDE the record that loaded first, which it overwrites. A packer that
// sorted globally by address would emit the same two records in the other order, the clobber
// would not happen, and this test would pass while checking nothing.

const BACKWARDS_ORG: ClosedLoopProgram = {
  name: 'a backwards ORG',
  items: [
    { at: 520, cells: cells('^XYZ'), seqno: 1 },                    // emitted first, loads first
    // `ORG 00500` sends the counter backwards; everything after it is emitted below 00520.
    { at: 500, cells: cells('^ABCDEFGHIJKLMNOPQRST'), seqno: 2 },   // twenty characters
  ],
  reserved: [],
  // HAND TABLE: 'XYZ' at 00520-00522 marked at 00520, and the twenty letters A..T at
  // 00500-00519 marked at 00500. This is the INTENT — what the assembler meant — and it is what
  // the machine holds everywhere except the one position the tail clobbers.
  image: [
    row(500, 'A', true), row(501, 'B', false), row(502, 'C', false), row(503, 'D', false),
    row(504, 'E', false), row(505, 'F', false), row(506, 'G', false), row(507, 'H', false),
    row(508, 'I', false), row(509, 'J', false), row(510, 'K', false), row(511, 'L', false),
    row(512, 'M', false), row(513, 'N', false), row(514, 'O', false), row(515, 'P', false),
    row(516, 'Q', false), row(517, 'R', false), row(518, 'S', false), row(519, 'T', false),
    row(520, 'X', true), row(521, 'Y', false), row(522, 'Z', false),
  ],
  // HAND GEOMETRY, in DECK order: the three-character run is card 1 because it was emitted
  // first; the twenty-character run is card 2. Columns 4 and 21 — the budget never bites.
  records: [[520, 3], [500, 20]],
  // HAND-COMPUTED TAILS: 00520 + 3 = 00523, which no later record covers (card 2 covers
  // 00500-00519), and 00500 + 20 = 00520, which nothing later covers either — and which lands
  // inside card 1's own extent.
  surviving: [523, 520],
  warnings: [
    'the last record\'s GM-WM lands at 00520, inside the record loaded at 00520 — it overwrites '
    + 'one character of the program',
  ],
};

describe('CLOSED LOOP, program 2 — a backwards ORG (plan §11.1)', () => {
  closedLoop(BACKWARDS_ORG);

  it('THE ONE-BYTE CLOBBER: 00520 holds `X` in the INTENT and a GM-WM in the RESULT', () => {
    const storage = intent(BACKWARDS_ORG);
    expect(glyphOf(storage.read(520) & BCD6)).toBe('X');
    expect(storage.wm(520)).toBe(true);

    const { m } = result(pack(BACKWARDS_ORG.items, BACKWARDS_ORG.reserved).records);
    expect(m.storage.read(520) & BCD6, 'the `X` is gone').toBe(GROUP_MARK_BCD);
    expect(m.storage.wm(520)).toBe(true);
    // Exactly ONE character: its neighbours came through untouched.
    expect(glyphOf(m.storage.read(521) & BCD6)).toBe('Y');
    expect(glyphOf(m.storage.read(522) & BCD6)).toBe('Z');
    expect(glyphOf(m.storage.read(519) & BCD6)).toBe('T');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// WAVE 2, PROGRAM 3 — AN ALL-MARKED RUN that forces a 30-character card
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// Thirty-five word-marked characters in one emission run. Every cell costs TWO columns — a word
// separator and then the character — so thirty of them fill the sixty-column load field exactly
// and the run splits (CONSTANT_MAY_SPAN_CONDENSED_CARDS). The two records are CONTIGUOUS, which
// is the case "one GM-WM per record" gets wrong: card 1's mark at 00530 is the first character
// of card 2 and is overwritten, so ONE mark survives two records.

const ALL_MARKED_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345678';

const ALL_MARKED: ClosedLoopProgram = {
  name: 'an all-marked run',
  items: [{
    at: 500,
    cells: Uint8Array.from([...ALL_MARKED_LETTERS].map((glyph) => WM | code(glyph))),
    seqno: 1,
  }],
  reserved: [],
  // HAND TABLE: 00500 + i holds the i-th character of the string above, EVERY ONE marked.
  // Written as the rule rather than as thirty-five rows, because the rule is what is by hand:
  // one marked character per address, ascending, no gaps.
  image: [...ALL_MARKED_LETTERS].map((glyph, i) => row(500 + i, glyph, true)),
  // HAND GEOMETRY: 30 × 2 = 60 columns exactly, so the 31st character opens card 2 at 00530,
  // which carries the remaining five (5 × 2 = 10 columns).
  records: [[500, 30], [530, 5]],
  // HAND-COMPUTED TAILS: 00500 + 30 = 00530 — which card 2's payload COVERS, so it does not
  // survive — and 00530 + 5 = 00535, which does.
  surviving: [535],
  warnings: [],
};

describe('CLOSED LOOP, program 3 — an all-marked 30-character card (plan §11.1)', () => {
  closedLoop(ALL_MARKED);

  it('thirty characters per card, and ONE surviving mark across TWO records', () => {
    const packed = pack(ALL_MARKED.items, ALL_MARKED.reserved);
    expect(ALL_MARKED_LETTERS).toHaveLength(35);
    expect(packed.records).toHaveLength(2);
    expect(packed.records[0]?.payload).toHaveLength(30);
    expect(survivingMarks(packed.records)).toHaveLength(1);
  });

  it('every one of the thirty-five word marks arrived, which is what the separators are for', () => {
    const { m } = result(pack(ALL_MARKED.items, ALL_MARKED.reserved).records);
    const marked: Addr[] = [];
    for (let a = 500; a <= 534; a++) if (m.storage.wm(a)) marked.push(a);
    expect(marked).toHaveLength(35);
    expect(marked[0]).toBe(500);
    expect(marked.at(-1)).toBe(534);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// WAVE 4 — the three programs that are driven from SOURCE (§11.1)
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// Wave 2's three programs above are hand-built `EmittedItem[]`: they exist because the closed
// loop had to open before there was a front end. These three arrive the other way — from an
// Autocoder source deck through `parse -> pass1 -> pass2 -> pack`, composed HERE because
// `assemble()` is wave 6's and no wave reaches forward (§3.3, §11).
//
// THE ANTI-TAUTOLOGY RULE STILL BINDS, and it is harder to keep here than it was in wave 2,
// because the temptation is to print what the assembler produced and paste it in. It is not done:
// every `image`, every `records` row and every `surviving` address below is computed BY HAND from
// the source deck beside it — the lengths off §6.1's shape ladder, the column costs off §8.3's
// three rules (an ordinary cell 1, a marked cell 2), the tails off §11.1's own formula. The demo's
// image is written from §10's published `Assembled` column, which is a table this phase did not
// produce either. Where a hand number and the packer disagree, THE PACKER IS THE SPEC and the
// disagreement is a finding for `BUILD-LOG-3.md` — not a number to copy.

const OPERATION = 16, OPERAND = 21, LABEL = 6;

/** One field of a source card: the 1-based column it starts in, and what is punched there. */
type Field = readonly [number, string];

/** One 80-column card, each field at its 1-based column (`software.md` §1). */
function sourceCard(fields: readonly Field[]): string {
  let out = '';
  for (const [column, text] of fields) {
    if (out.length > column - 1) throw new Error(`"${text}" will not fit at column ${column}`);
    out = out.padEnd(column - 1) + text;
  }
  return out.trimEnd();
}

/** `parse -> pass1 -> pass2`: the items and the reserved extents a `ClosedLoopProgram` needs. */
function assembleSource(text: string): Pick<ClosedLoopProgram, 'items' | 'reserved'> {
  const p1 = pass1(parse(text));
  const p2 = pass2(p1.sized, p1.symbols, p1.coreSize);
  return { items: p2.items, reserved: p1.reserved };
}

/**
 * A hand-written field as rows: a glyph string with `^` before each marked character, starting at
 * `at`. An UNMARKED BLANK produces no row on purpose — `occupied()` cannot tell one from untouched
 * core, and a hand table that claimed otherwise would be describing the helper rather than the
 * program.
 */
function fieldRows(at: Addr, text: string): string[] {
  const rows: string[] = [];
  const chars = [...text];
  let a = at;
  for (let i = 0; i < chars.length; i++) {
    const wm = chars[i] === '^';
    if (wm) i += 1;
    const glyph = chars[i] ?? '';
    if (glyph !== ' ' || wm) rows.push(row(a, glyph, wm));
    a += 1;
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// WAVE 4, PROGRAM 4 — A 200-CHARACTER DCW that splits across FOUR cards
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// `CONSTANT_MAY_SPAN_CONDENSED_CARDS` (pack.ts) is the `[unverified]` ruling this program exists
// to prove: a constant longer than one card's payload SPLITS, and the loader puts it back
// together byte for byte. `open-questions.md`'s own software row proposes the opposite fallback —
// cap the constant and flag it — and this is the evidence for declining it.
//
// The 200 characters are the blank-constant form, `software.md` §5's `#n`: "permits the
// programmer to reserve a field of blanks with a word mark in the high-order position". A visible
// five-character DCW sits on each side of it, so the comparison has real glyphs on both sides of
// three card boundaries and not just at the ends of the deck.

const SPLIT_DCW_SOURCE: readonly (readonly Field[])[] = [
  [[LABEL, 'AUTOCODER'], [OPERATION, 'RUN']],
  [[OPERATION, 'ORG'], [OPERAND, '00500']],
  [[LABEL, 'HEAD'], [OPERATION, 'DCW'], [OPERAND, '@ABCDE@']],   // 00500-00504
  [[LABEL, 'BIG'], [OPERATION, 'DCW'], [OPERAND, '#200']],       // 00505-00704
  [[LABEL, 'TAIL'], [OPERATION, 'DCW'], [OPERAND, '@VWXYZ@']],   // 00705-00709
  [[OPERATION, 'END'], [OPERAND, '00500']],
];


const SPLIT_DCW: ClosedLoopProgram = {
  name: 'a 200-character DCW that splits across four cards',
  ...assembleSource(SPLIT_DCW_SOURCE.map(sourceCard).join('\n')),
  // HAND TABLE: five marked-at-the-front characters at 00500, two hundred BLANKS with one word
  // mark at 00505, five more at 00705. The blanks in between are unmarked and produce no row.
  image: [
    ...fieldRows(500, '^ABCDE'),
    row(505, ' ', true),
    ...fieldRows(705, '^VWXYZ'),
  ],
  // HAND GEOMETRY, from §8.3's three costs. Card 1: 2 (marked A) + 4 + 2 (marked blank) + 52 = 60
  // columns, so it holds 58 cells and stops at 00557. Cards 2 and 3 are sixty unmarked blanks
  // each, sixty columns each. Card 4 carries the last 27 blanks (27 columns) and then TAIL — a
  // marked V costs 2 and WXYZ cost 4, so 33 columns and 32 cells.
  records: [[500, 58], [558, 60], [618, 60], [678, 32]],
  // HAND-COMPUTED TAILS: 00558, 00618 and 00678 are each the first address of the NEXT record and
  // are overwritten; only 00678 + 32 = 00710 survives, and it lands past everything.
  surviving: [710],
  warnings: [],
};

describe('CLOSED LOOP, program 4 — a 200-character DCW across four cards (plan §11.1)', () => {
  closedLoop(SPLIT_DCW);

  it('ONE constant, FOUR cards, and every one of the two hundred positions arrives', () => {
    const packed = pack(SPLIT_DCW.items, SPLIT_DCW.reserved);
    // The constant is one `EmittedItem`; the packer is what cuts it, and it cuts it four ways.
    const big = SPLIT_DCW.items.find((item) => item.at === 505);
    expect(big?.cells).toHaveLength(200);
    expect(packed.records).toHaveLength(4);

    const { m } = result(packed.records);
    // Word marks: exactly three in 00500-00709 — the two visible constants and the blank one.
    const marked: Addr[] = [];
    for (let a = 500; a <= 709; a++) if (m.storage.wm(a)) marked.push(a);
    expect(marked).toEqual([500, 505, 705]);
    // And the two hundred positions themselves are blanks, across all four cards.
    for (let a = 505; a <= 704; a++) {
      expect(m.storage.read(a) & BCD6, `00${a} is not blank`).toBe(0);
    }
    expect(glyphOf(m.storage.read(704) & BCD6)).toBe(' ');
    expect(glyphOf(m.storage.read(705) & BCD6)).toBe('V');
  });

  it('the four payloads concatenate back to the emission, in order', () => {
    // The split is not lossy and not reordered: this is the property the `[unverified]` ruling
    // rests on, stated over the CARDS rather than over core.
    const packed = pack(SPLIT_DCW.items, SPLIT_DCW.reserved);
    const fromCards = packed.records.flatMap((record) => [...record.payload]);
    const fromItems = SPLIT_DCW.items.flatMap((item) => [...item.cells]);
    expect(fromCards).toEqual(fromItems);
    expect(fromCards).toHaveLength(210);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// WAVE 4, PROGRAM 5 — A LITERAL POOL
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// Three instructions write two literals — one of them twice — and an `LTORG *` assigns the pool.
// What the loop proves that a pass-1 test cannot: the processor-GENERATED DCWs are real emission
// that rides real cards into real core, with the word mark on each literal's high-order position
// and the numeric literal's sign as a ZONE OVER ITS UNITS POSITION (`software.md` §3) — so `+123`
// is stored `1`, `2`, `C`, the 12-3 punch, and not four characters.

const LITERAL_POOL_SOURCE: readonly (readonly Field[])[] = [
  [[LABEL, 'AUTOCODER'], [OPERATION, 'RUN']],
  [[OPERATION, 'ORG'], [OPERAND, '00500']],
  [[OPERATION, 'MLC'], [OPERAND, '@AB@,00600']],    // 00500-00511
  [[OPERATION, 'A'], [OPERAND, '&123']],            // 00512-00517
  [[OPERATION, 'MLC'], [OPERAND, '@AB@,00600']],    // 00518-00529, the SAME literal
  [[OPERATION, 'LTORG'], [OPERAND, '*']],           // the pool at 00530
  [[OPERATION, 'END'], [OPERAND, '00500']],
];


const LITERAL_POOL: ClosedLoopProgram = {
  name: 'a literal pool',
  ...assembleSource(LITERAL_POOL_SOURCE.map(sourceCard).join('\n')),
  // HAND TABLE. The pool lands at 00530: `@AB@` (2 positions, so its LOW-order is 00531) then
  // `+123` (3 positions, low-order 00534). Both references therefore assemble 00531 and 00534 —
  // ONE copy of `@AB@`, because 1-9 alphameric characters are pooled once per section.
  image: [
    ...fieldRows(500, '^D0053100600C'),
    ...fieldRows(512, '^A00534'),
    ...fieldRows(518, '^D0053100600C'),
    ...fieldRows(530, '^AB'),
    ...fieldRows(532, '^12C'),
  ],
  // HAND GEOMETRY: 12 + 1, 6 + 1, 12 + 1 columns for the three instructions = 33; then 2 + 1 for
  // the two-character literal and 3 + 1 for the three-character one = 40 columns, 35 cells, one
  // card. Contiguous throughout — the pool origin IS the counter, so nothing breaks the record.
  records: [[500, 35]],
  // HAND-COMPUTED TAIL: 00500 + 35 = 00535, no later record, nothing reserved there.
  surviving: [535],
  warnings: [],
};

describe('CLOSED LOOP, program 5 — a literal pool (plan §11.1)', () => {
  closedLoop(LITERAL_POOL);

  it('ONE copy of the repeated literal, and both references address it', () => {
    // The dedup is visible in core: 00530-00531 holds `AB` once, and there is no second copy
    // anywhere in the emission (`software.md` §3, 1-9 alphameric characters pooled once).
    const { m } = result(pack(LITERAL_POOL.items, LITERAL_POOL.reserved).records);
    expect(glyphOf(m.storage.read(530) & BCD6)).toBe('A');
    expect(glyphOf(m.storage.read(531) & BCD6)).toBe('B');
    expect(m.storage.wm(530)).toBe(true);
    expect(m.storage.wm(531)).toBe(false);
    expect(LITERAL_POOL.items.filter((item) => item.at >= 530)).toHaveLength(2);
  });

  it("the numeric literal's sign is a ZONE over the units position, and it survives the load", () => {
    const { m } = result(pack(LITERAL_POOL.items, LITERAL_POOL.reserved).records);
    expect(glyphOf(m.storage.read(532) & BCD6)).toBe('1');
    expect(glyphOf(m.storage.read(533) & BCD6)).toBe('2');
    // `+3` is the 12-3 punch, which the 64-glyph set names `C` — three positions, not four.
    expect(glyphOf(m.storage.read(534) & BCD6)).toBe('C');
    expect(m.storage.wm(532)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// WAVE 4, PROGRAM 6 — THE DEMO, from demos/hello-dad.asm
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// The program Phase 2 hand-punched, now written in Autocoder and assembled. The hand table below
// is §10's own `Assembled` column, transcribed field by field — `L %10 00564 $`, `R 00548 8`,
// `R 00524 ⧧` and the rest — and NOT read off a run. Its two records, 52 cells and 12, are §10's
// numbers as well, and the surviving GM-WM at 00564 is §10 trap 3: it lands on the first position
// of `LINE`, which is why the read carries `$` and not `R`.
//
// The deck loaded here has NO execute card, so nothing is run — this is the load-equals-memory
// oracle, not the printout. `renderGreenBar` against the 348-byte golden is wave 6's
// `test/tier4-autocoder-demo.test.ts`.

const DEMO_SOURCE = readFileSync('demos/hello-dad.asm', 'utf8');

const DEMO: ClosedLoopProgram = {
  name: 'the demo',
  ...assembleSource(DEMO_SOURCE),
  // HAND TABLE — §10's ladder, one field per row of that table. The blank d on `J 00500 ␣` at
  // 00547 is an unmarked blank and produces no row, exactly as the two hundred blanks in program
  // 4 do not.
  image: [
    ...fieldRows(500, '^L%1000564$'),     // LOOP R1W  0,LINE,$
    ...fieldRows(510, '^R005488'),        //      BEF1 EOJ
    ...fieldRows(517, '^R00524⧧'),        //      BA1  *+1
    ...fieldRows(524, '^M%2000564W'),     //      W1   LINE
    ...fieldRows(534, '^R00541⧧'),        //      BA1  *+1
    ...fieldRows(541, '^J00500 '),        //      B    LOOP
    ...fieldRows(548, '^F1'),             // EOJ  CC1  1
    ...fieldRows(550, '^R00557⧧'),        //      BA1  *+1
    ...fieldRows(557, '^.'),              //      H
    ...fieldRows(558, '^HELLO1'),         // ID   DCW  @HELLO1@
  ],
  // HAND GEOMETRY — §10: the running column count reaches exactly 60 at 00551, so record 1 is
  // 00500-00551, 52 cells / 60 columns, and record 2 is 00552-00563, 12 cells / 14 columns with
  // marks at 00557 and 00558.
  records: [[500, 52], [552, 12]],
  // HAND-COMPUTED TAILS: record 1's mark at 00500 + 52 = 00552 is the first character of record 2
  // and is overwritten; record 2's at 00552 + 12 = 00564 survives — the first position of LINE.
  surviving: [564],
  warnings: [
    'the last record\'s GM-WM lands at 00564, inside LINE — a read with d = `R` will transfer '
    + 'nothing; use `$`',
  ],
};

describe('CLOSED LOOP, program 6 — the demo, from demos/hello-dad.asm (plan §10, §11.1)', () => {
  closedLoop(DEMO);

  it('sixty-four cells, ten word-marked fields, two records and one warning', () => {
    expect(DEMO.items.reduce((n, item) => n + item.cells.length, 0)).toBe(64);
    const marks = DEMO.items.flatMap((item) => [...item.cells].filter((c) => (c & WM) !== 0));
    expect(marks).toHaveLength(10);
    expect(DEMO.reserved).toEqual([{ from: 564, to: 643, label: 'LINE' }]);
  });

  it('trap 3 — the planted GM-WM lands on 00564, the FIRST position of LINE', () => {
    // A `d = R` read stops at the first group-mark-word-mark in core and would transfer nothing;
    // `$` suppresses that test (`CARD_DOLLAR_SUPPRESSES_GM_WM_TEST`, src/core/channel.ts), and
    // the first read then overwrites it. The demo is correct BECAUSE a person wrote `$`.
    const { m } = result(pack(DEMO.items, DEMO.reserved).records);
    expect(m.storage.read(564) & BCD6).toBe(GROUP_MARK_BCD);
    expect(m.storage.wm(564)).toBe(true);
    // And the rest of the eighty-position buffer is exactly as untouched as `DS` promises.
    for (let a = 565; a <= 643; a++) {
      expect(m.storage.read(a) & BCD6, `LINE at ${a}`).toBe(0);
      expect(m.storage.wm(a), `LINE word mark at ${a}`).toBe(false);
    }
  });

  it("the read instruction's own B-address is LINE — 00564, the address the GM-WM lands on", () => {
    // The two facts in one place, because it is the pair that makes trap 3 a trap: the buffer the
    // read fills starts at the position the loader marked.
    const { m } = result(pack(DEMO.items, DEMO.reserved).records);
    let address = '';
    for (let a = 504; a <= 508; a++) address += glyphOf(m.storage.read(a) & BCD6);
    expect(address).toBe('00564');
    expect(glyphOf(m.storage.read(509) & BCD6)).toBe('$');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// WAVE 6 — ALL SIX PROGRAMS, RE-RUN THROUGH `assemble()` (§11.1, §11's wave-6 row)
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// The loop opened in wave 2 against hand-built `EmittedItem[]`, closed from source in wave 4
// against `parse -> pass1 -> pass2 -> pack` composed by hand, and closes here against the ONE
// entry point — `assemble(text)`, which is the call the browser view and the CLI both make. What
// this wave adds is not another oracle but a CHECK ON THE COMPOSITION: `assemble()` is the only
// place the five modules are wired together, and a mis-wiring there (pass 1's `reserved` not
// reaching `pack`, `withIdent` dropped, `entry` lost) is invisible to every test above.
//
// THE THREE WAVE-2 PROGRAMS HAVE NO SOURCE — they were `{ at, cells }` literals, because wave 2
// had no front end. So they get SOURCE EQUIVALENTS here: a DS between two constants, a constant
// then a backwards ORG then a longer constant, and thirty-five one-character DCWs. Each is written
// to produce the property its wave-2 twin was built for — the gap, the clobber, the 30-character
// card — and each hand table below is the wave-2 table it inherits, unchanged. If a source
// equivalent ever stops producing its twin's geometry, the two differ for a reason and that reason
// is the finding.
//
// THE RECORDS COME FROM `assembled.deck.records`, NOT from a second `pack()` call. That is the
// point of the wave: the deck under test is the deck `assemble()` hands its callers, ident and
// sequence included, and not one this file re-derived.


/** A wave-6 fixture: the source, and the same four hand-written expectations wave 2 carries. */
interface AssembledProgram {
  readonly name: string;
  readonly source: string;
  readonly image: readonly string[];
  readonly records: readonly (readonly [Addr, number])[];
  readonly surviving: readonly Addr[];
  readonly warnings: readonly string[];
}

/**
 * `closedLoop()`'s five assertions, driven from `assemble()` instead of from a hand-built fixture
 * plus a local `pack()` call. The two sides stay what §11.1 makes them: the INTENT is
 * `applyToStorage(result.items)` and the RESULT is the real loader, the real 1402 and the real
 * machine, with the surviving GM-WMs as the named difference.
 */
function closedLoopThroughAssemble(program: AssembledProgram): void {
  const assembled = assemble(program.source);
  const records = assembled.deck.records;
  // `windowOf` and `intent` read only `items` and `surviving`, so the fixture is completed with
  // what `assemble()` produced rather than duplicating either.
  const asProgram: ClosedLoopProgram = {
    name: program.name,
    items: assembled.items,
    reserved: [],
    image: program.image,
    records: program.records,
    surviving: program.surviving,
    warnings: program.warnings,
  };
  const [from, to] = windowOf(asProgram);

  it('assemble() flags nothing and returns ok', () => {
    expect(assembled.flagged).toEqual([]);
    expect(assembled.ok).toBe(true);
  });

  it('the deck assemble() hands out is the hand-written geometry', () => {
    expect(records.map((r) => [r.loadAddress, r.payload.length]))
      .toEqual(program.records.map(([at, count]) => [at, count]));
    expect(records.map((r) => r.sequence))
      .toEqual(program.records.map((_, i) => String(i + 1).padStart(3, '0')));
  });

  it('the §8.3 GM-WM tail warnings survive the composition', () => {
    // `pack()` raises these from the `reserved` list `pass1()` built, and `assemble()` is the only
    // place those two are joined — so this assertion is the one that fails if the join is dropped.
    expect(assembled.warnings).toEqual(program.warnings);
  });

  it('the SURVIVING GM-WMs computed from assemble()\'s own record list are the hand-computed ones', () => {
    expect(survivingMarks(records)).toEqual([...program.surviving]);
  });

  it('THE INTENT: applyToStorage(result.items) writes exactly the hand table', () => {
    const storage = intent(asProgram);
    expect(occupied((a) => storage.read(a), (a) => storage.wm(a), from, to))
      .toEqual([...program.image]);
  });

  it('THE RESULT: core after the REAL load equals the hand table, plus exactly the surviving GM-WMs', () => {
    const { m, stop } = result(records);
    expect(stop, 'the loader reaches its own halt on the read after the last card').toBe('halt');
    const marks = new Set(program.surviving);
    const want = [
      ...program.image.filter((line) => !marks.has(Number(line.slice(0, 5)))),
      ...program.surviving.map(GMWM),
    ].sort();
    expect(occupied((a) => m.storage.read(a), (a) => m.storage.wm(a), from, to).sort())
      .toEqual(want);
  });
}

// ─── The three source equivalents wave 2's hand-built programs never had ────────────────────

/** Program 1's gap, written as a person would write it: a DS between two constants. */
const DS_GAP_SOURCE: readonly (readonly Field[])[] = [
  [[LABEL, 'AUTOCODER'], [OPERATION, 'RUN']],
  [[OPERATION, 'ORG'], [OPERAND, '00500']],
  [[LABEL, 'HEAD'], [OPERATION, 'DCW'], [OPERAND, '@ABC@']],   // 00500-00502
  [[LABEL, 'GAP'], [OPERATION, 'DS'], [OPERAND, '5']],         // 00503-00507, emits NOTHING
  [[LABEL, 'TAIL'], [OPERATION, 'DCW'], [OPERAND, '@DE@']],    // 00508-00509
  [[OPERATION, 'END'], [OPERAND, '00500']],
];

/**
 * Program 2's clobber: a constant, then ORG backwards, then a LONGER constant, so the second
 * record's terminating GM-WM lands one character inside the record that loaded first.
 */
const BACKWARDS_ORG_SOURCE: readonly (readonly Field[])[] = [
  [[LABEL, 'AUTOCODER'], [OPERATION, 'RUN']],
  [[OPERATION, 'ORG'], [OPERAND, '00520']],
  [[LABEL, 'HIGH'], [OPERATION, 'DCW'], [OPERAND, '@XYZ@']],   // 00520-00522, emitted FIRST
  [[OPERATION, 'ORG'], [OPERAND, '00500']],                    // backwards
  [[LABEL, 'LOW'], [OPERATION, 'DCW'], [OPERAND, '@ABCDEFGHIJKLMNOPQRST@']],   // 00500-00519
  [[OPERATION, 'END'], [OPERAND, '00500']],
];

/**
 * Program 3's all-marked run, as THIRTY-FIVE one-character DCWs — each sets its own word mark, so
 * every cell costs two columns and thirty of them fill the load field exactly. Written as a loop
 * over the same letters wave 2 uses, which is the fixture; nothing here is captured from a run.
 */
const ALL_MARKED_SOURCE: readonly (readonly Field[])[] = [
  [[LABEL, 'AUTOCODER'], [OPERATION, 'RUN']],
  [[OPERATION, 'ORG'], [OPERAND, '00500']],
  ...[...ALL_MARKED_LETTERS].map((glyph): readonly Field[] => (
    [[OPERATION, 'DCW'], [OPERAND, `@${glyph}@`]]
  )),
  [[OPERATION, 'END'], [OPERAND, '00500']],
];

/** A fixture's cards as one source deck, the way wave 4 spells it. */
const sourceText = (cards: readonly (readonly Field[])[]): string => cards.map(sourceCard).join('\n');

// ─── The six, in §11.1's own order ──────────────────────────────────────────────────────────

describe('WAVE 6, program 1 — a DS gap, through assemble() (plan §11.1)', () => {
  closedLoopThroughAssemble({
    name: 'a DS gap',
    source: sourceText(DS_GAP_SOURCE),
    // The wave-2 hand table, inherited unchanged: 'ABC' at 00500-00502 marked on the first, five
    // positions nothing writes, 'DE' at 00508-00509 marked on the first.
    image: [...fieldRows(500, '^ABC'), ...fieldRows(508, '^DE')],
    records: [[500, 3], [508, 2]],
    surviving: [503, 510],
    warnings: [
      'record 001\'s GM-WM lands at 00503, inside GAP — a read with d = `R` will transfer nothing; '
      + 'use `$`',
    ],
  });
});

describe('WAVE 6, program 2 — a backwards ORG, through assemble() (plan §11.1)', () => {
  closedLoopThroughAssemble({
    name: 'a backwards ORG',
    source: sourceText(BACKWARDS_ORG_SOURCE),
    image: [...fieldRows(500, '^ABCDEFGHIJKLMNOPQRST'), ...fieldRows(520, '^XYZ')],
    // DECK ORDER, not address order: the three-character run is card 1 because it was emitted
    // first. A packer that sorted globally by address would put them the other way round and the
    // clobber below would never happen.
    records: [[520, 3], [500, 20]],
    surviving: [523, 520],
    warnings: [
      'the last record\'s GM-WM lands at 00520, inside the record loaded at 00520 — it overwrites '
      + 'one character of the program',
    ],
  });
});

describe('WAVE 6, program 3 — an all-marked 30-character card, through assemble() (plan §11.1)', () => {
  closedLoopThroughAssemble({
    name: 'an all-marked run',
    source: sourceText(ALL_MARKED_SOURCE),
    image: [...ALL_MARKED_LETTERS].map((glyph, i) => row(500 + i, glyph, true)),
    records: [[500, 30], [530, 5]],
    surviving: [535],
    warnings: [],
  });
});

describe('WAVE 6, program 4 — a 200-character DCW, through assemble() (plan §11.1)', () => {
  closedLoopThroughAssemble({
    name: SPLIT_DCW.name,
    source: sourceText(SPLIT_DCW_SOURCE),
    image: SPLIT_DCW.image,
    records: SPLIT_DCW.records,
    surviving: SPLIT_DCW.surviving,
    warnings: SPLIT_DCW.warnings,
  });
});

describe('WAVE 6, program 5 — a literal pool, through assemble() (plan §11.1)', () => {
  closedLoopThroughAssemble({
    name: LITERAL_POOL.name,
    source: sourceText(LITERAL_POOL_SOURCE),
    image: LITERAL_POOL.image,
    records: LITERAL_POOL.records,
    surviving: LITERAL_POOL.surviving,
    warnings: LITERAL_POOL.warnings,
  });
});

describe('WAVE 6, program 6 — the demo, through assemble() (plan §10, §11.1)', () => {
  closedLoopThroughAssemble({
    name: DEMO.name,
    source: DEMO_SOURCE,
    image: DEMO.image,
    records: DEMO.records,
    surviving: DEMO.surviving,
    warnings: DEMO.warnings,
  });

  it('and the composition carries END and the JOB ident through', () => {
    // The two things `assemble()` adds that no wave-4 test could see: `entry` off END's operand,
    // which `loaderDeck()` turns into the execute card, and the ident `withIdent` punches into
    // columns 76-80 of every condensed card (§4, §8.3).
    const assembled = assemble(DEMO_SOURCE);
    expect(assembled.deck.entry).toBe(500);
    expect(assembled.deck.records.map((r) => `${r.sequence}${r.ident ?? ''}`))
      .toEqual(['001HDAD1', '002HDAD1']);
    expect(assembled.wantsLoader, 'the LOAD card asked for a load program').toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// PHASE 5, WAVE 1 — sales-summary target, load-only closed loop (§11.3)
// ═══════════════════════════════════════════════════════════════════════════════════════════

const SALES_SUMMARY_SOURCE = readFileSync('demos/sales-summary.asm', 'utf8');

describe('PHASE 5, WAVE 1 — sales-summary.asm load-only closed loop (plan §11.3)', () => {
  const assembled = assemble(SALES_SUMMARY_SOURCE);
  const records = assembled.deck.records;
  const surviving = survivingMarks(records);
  const extents = assembled.items.flatMap((item) => [item.at, item.at + item.cells.length - 1]);
  const from = Math.min(...extents, ...surviving) - 3;
  const to = Math.max(...extents, ...surviving) + 3;

  it('assembles cleanly and has the expected load-only geometry', () => {
    expect(assembled.ok).toBe(true);
    expect(assembled.flagged).toEqual([]);
    expect(assembled.warnings).toEqual([]);
    expect(records).toHaveLength(39);
    expect(surviving).toEqual([2538, 2833]);
  });

  it('real loader storage equals applyToStorage plus exactly the surviving GM-WMs', () => {
    const { m, stop } = result(records);
    expect(stop, 'the loader reaches its own halt on the read after the last card').toBe('halt');

    const direct = new CoreStorage(10_000);
    applyToStorage(assembled.items, direct);

    const marks = new Set(surviving);
    const want = [
      ...occupied((a) => direct.read(a), (a) => direct.wm(a), from, to)
        .filter((line) => !marks.has(Number(line.slice(0, 5)))),
      ...surviving.map(GMWM),
    ].sort();

    expect(occupied((a) => m.storage.read(a), (a) => m.storage.wm(a), from, to).sort())
      .toEqual(want);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// PHASE 5, WAVE 5 APPEND — generated sales-summary load-only closed loop (§11.3)
// ═══════════════════════════════════════════════════════════════════════════════════════════

const SALES_SUMMARY_SPEC = readFileSync('demos/sales-summary.rpg', 'utf8');

describe('PHASE 5, WAVE 5 — generated sales-summary load-only closed loop (plan §11.3)', () => {
  const generated = generate(SALES_SUMMARY_SPEC);
  const assembled = assemble(generated.source);
  const records = assembled.deck.records;
  const surviving = survivingMarks(records);
  const extents = assembled.items.flatMap((item) => [item.at, item.at + item.cells.length - 1]);
  const from = Math.min(...extents, ...surviving) - 3;
  const to = Math.max(...extents, ...surviving) + 3;

  it('generates and assembles cleanly with the converged load-only geometry', () => {
    expect(generated.ok).toBe(true);
    expect(generated.diagnostics).toEqual([]);
    expect(assembled.ok).toBe(true);
    expect(assembled.flagged).toEqual([]);
    expect(assembled.warnings).toEqual([]);
    expect(records).toHaveLength(39);
    expect(surviving).toEqual([2538, 2833]);
  });

  it('real loader storage equals generated applyToStorage plus exactly the surviving GM-WMs', () => {
    const { m, stop } = result(records);
    expect(stop, 'the loader reaches its own halt on the read after the last card').toBe('halt');

    const direct = new CoreStorage(10_000);
    applyToStorage(assembled.items, direct);

    const marks = new Set(surviving);
    const want = [
      ...occupied((a) => direct.read(a), (a) => direct.wm(a), from, to)
        .filter((line) => !marks.has(Number(line.slice(0, 5)))),
      ...surviving.map(GMWM),
    ].sort();

    expect(occupied((a) => m.storage.read(a), (a) => m.storage.wm(a), from, to).sort())
      .toEqual(want);
  });
});
