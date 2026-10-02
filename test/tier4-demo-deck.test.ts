// Tier 4 (smoke) — the demo deck, and UNLIKE cc01 THIS ONE GATES.
//
// docs/plans/phase-2-unit-record.md §12: "New sibling `test/tier4-demo-deck.test.ts`, and unlike
// cc01 this one GATES — we wrote the deck and we know what it prints." Every assertion below is
// one of §13's seven mechanical checks, check 4 bullet by bullet.
//
// It is headless and drives the same CORE façade calls the browser's controls make — the
// PRE-SPLIT keystrokes from `src/formats/loader.ts`, never the UI's `^` string (§8.1). No
// oracles are needed: the only input is `demos/hello-dad.cards`, which is checked in, so there
// is no `describe.skipIf(oracles)` here the way `test/tier4-cc01-*.test.ts` has one.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { glyphOf } from '../src/core/bcd.js';
import { chainGlyph, renderGreenBar } from '../src/core/devices/printer1403.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN } from '../src/formats/loader.js';
import { BCD6, type Addr, type Deck } from '../src/core/types.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DECK_FILE = join(REPO_ROOT, 'demos/hello-dad.cards');
const GOLDEN_FILE = join(REPO_ROOT, 'test/golden/hello-dad.page.txt');

/** The 1403 `machine.ts` builds: Model 2, chain A, the 66-line DEFAULT_CARRIAGE_TAPE. */
const CHAIN = 'A' as const;
const FORM_LINES = 66;

/** §13's card table: the data cards carry 78 columns of report text, then `⌒` and `⧧`. */
const REPORT_COLUMNS = 78;

/** Where the loop's read instruction lives, and the two addresses the EOF path runs through. */
const LOOP_READ = 18;
const EOF_BRANCH = 28;
const END_ROUTINE = 66;

function deck(): Deck {
  const { deck: cards, errors } = parseDeck(readFileSync(DECK_FILE, 'utf8'));
  expect(errors, 'check 2: the deck parses with zero errors').toEqual([]);
  expect(cards, 'check 2: six cards').toHaveLength(6);
  return cards;
}

const glyphAt = (m: Machine, a: Addr): string => glyphOf(m.storage.read(a) & BCD6);
const textAt = (m: Machine, from: Addr, to: Addr): string => {
  let s = '';
  for (let a = from; a <= to; a++) s += glyphAt(m, a);
  return s;
};

interface Trace {
  /** The op-code address of the instruction that was about to execute. */
  at: Addr;
  /** Channel 1's Condition indicator after it ran. */
  condition: boolean;
  /** The IAR after it ran. */
  next: Addr;
}

/**
 * The whole operator sequence, in the order a person performs it (§13 "What the owner and a
 * family member see"), stepping one instruction at a time so the EOF read can be caught where it happens.
 */
function runDemo(): { m: Machine; keyed: number; trace: Trace[] } {
  const m = createMachine({ size: 10_000 });
  m.loadDeck(deck());
  // READER START then END OF FILE — IBM's own procedure: with fewer than four cards behind the
  // last one the machine would otherwise stop Not Ready (software.md §10.7, io.md §6).
  m.readerStart();
  m.readerEndOfFile();

  // MODE = DISPLAY at 00000, then MODE = ALTER: on a cleared machine there is no word mark to
  // stop the display, so the whole line is captured and the twelve characters can be keyed over
  // it (software.md §10.8).
  m.display(BOOTSTRAP_ORIGIN);
  m.setMode('alter');
  const keyed = m.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks);

  m.computerReset();
  m.setMode('run');

  const trace: Trace[] = [];
  for (let i = 0; i < 1000; i++) {
    const at = m.regs.iar;
    const stop = m.step();
    trace.push({ at, condition: m.channel1.status.condition, next: m.regs.iar });
    if (stop !== undefined) break;
  }
  // END OF JOB — the operator tearing the form off. Nothing else performs a pending automatic
  // single space (plan §7.3); here there is none left, because the closing `F 1` consumed it.
  m.endOfJob();
  return { m, keyed, trace };
}

describe('Tier 4 GATE — the demo deck (plan §13, check 4)', () => {
  const { m, keyed, trace } = runDemo();
  const state = m.snapshot();

  it('the hand-keyed bootstrap: ALTER writes 12 positions', () => {
    expect(keyed).toBe(BOOTSTRAP_KEYSTROKES.text.length);
    expect(keyed).toBe(12);
  });

  it('word marks land at 00001 and 00011 and NOWHERE ELSE in 00000-00011', () => {
    const marked: number[] = [];
    for (let a = 0; a <= 11; a++) if (m.storage.wm(a)) marked.push(a);
    // The `L` at 00001 and the `R` at 00011 — software.md §10.2, C28-0351-5 p.8 Table II.
    expect(marked).toEqual([1, 11]);
    expect(textAt(m, 0, 11)).toBe('AL%1000012$R');
  });

  it('card 1 landed where §13 says: 00018 at 00012-00016, a group mark at 00017, a mark at 00018', () => {
    expect(textAt(m, 12, 16), 'the I-address of the keyed `R`').toBe('00018');
    expect(glyphAt(m, 17), 'its d-character: tests all six, clears the interlock').toBe('⧧');
    expect(m.storage.wm(17), 'a PLAIN group mark — the separator at column 7 marked 00018')
      .toBe(false);
    expect(m.storage.wm(18), 'LOOP: the word mark on the `L`').toBe(true);
    expect(textAt(m, 18, 27)).toBe('L%1000100$');
  });

  it('the paper carries five lines, all on page 1, lines 1 through 5', () => {
    expect(state.printer.paper.map((l) => [l.page, l.line])).toEqual([
      [1, 1], [1, 2], [1, 3], [1, 4], [1, 5],
    ]);
  });

  it('the first line is data card 2\'s 78 columns through the A chain', () => {
    const card2 = deck()[1];
    if (card2 === undefined) throw new Error('the deck has no second card');
    let want = '';
    for (let c = 0; c < REPORT_COLUMNS; c++) want += chainGlyph(card2[c] ?? 0, CHAIN);
    expect(state.printer.paper[0]?.text).toBe(want);
    expect(want).toHaveLength(REPORT_COLUMNS);
  });

  it('the carriage ends at page 2 line 1 with no pending automatic space', () => {
    // The closing `F 1` ejected the finished page AND consumed the space the last print armed
    // (AUTO_SPACE_IS_CANCELLED_BY_A_CARRIAGE_INSTRUCTION), so there is no trailing blank line to
    // argue about on the golden page.
    expect(state.printer.carriage).toMatchObject({
      page: 2, line: 1, autoSpacePending: false,
    });
  });

  it('the green-bar page equals test/golden/hello-dad.page.txt BYTE FOR BYTE', () => {
    // The same render `npm run demo -- --golden test/golden/hello-dad.page.txt` compares, so this
    // assertion and that command's exit-0 path are one thing (plan §13 check 3, §14 R8).
    const golden = readFileSync(GOLDEN_FILE, 'utf8');
    expect(renderGreenBar(state.printer.paper, { chain: CHAIN, formLines: FORM_LINES }))
      .toBe(golden);
  });

  it('the EOF Condition is asserted WHERE IT EXISTS — on the read that reports it', () => {
    // io.md §6: "on the read that reports it, the EOF latch is turned OFF as the Condition
    // indicator is turned ON", and step 6 of the nine then makes that read the documented NO OP.
    const i = trace.findIndex((t) => t.condition);
    expect(trace[i]?.at, 'the ONE read that reports it is LOOP\'s, at 00018').toBe(LOOP_READ);

    const branch = trace[i + 1];
    expect(branch?.at, 'the very next instruction is `R 00066 8`').toBe(EOF_BRANCH);
    expect(branch?.next, 'which branches to the end routine AND releases the interlock')
      .toBe(END_ROUTINE);

    // The indicator is still on AFTER the branch, and that is io.md §5 being right: "a status
    // TEST never resets them; the read-out of the next I/O instruction is the only thing that
    // does" (step 3 of the nine). So exactly two instructions run with Condition on — the read
    // that set it and the `R` that tested it — and the closing `F 1` is what clears it.
    expect(trace.filter((t) => t.condition).map((t) => t.at)).toEqual([LOOP_READ, EOF_BRANCH]);
    expect(trace[i + 2]?.at, 'the end routine\'s `F 1`').toBe(END_ROUTINE);
    expect(trace[i + 2]?.condition, 'cleared by step 3 of the next I/O').toBe(false);
  });

  it('at the halt, all six channel-1 indicators are clear and the interlock is off', () => {
    // The closing `F 1` reset the six at step 3 of the nine and set none; its `R 00075 ⧧`
    // released the interlock without needing a branch (io.md §5).
    expect(state.channel1).toEqual({
      notReady: false, busy: false, dataCheck: false,
      condition: false, wrongLengthRecord: false, noTransfer: false,
      interlock: false,
    });
  });

  it('the hopper is empty and all six cards are in pocket NR', () => {
    expect(state.reader.hopper).toBe(0);
    expect(state.reader.buffered).toBe(false);
    expect(state.reader.stackers).toEqual({ '0': 6, '1': 0, '8-2': 0 });
  });

  it('the console has no `E` line — nothing error-stopped', () => {
    expect(state.console.filter((l) => l.id === 'E')).toEqual([]);
  });

  it('the machine halted at 00075 with the IAR already at 00076', () => {
    expect(state.stop).toBe('halt');
    // `MachineState` carries no stop ADDRESS; after the one-character `.` at 00075 the IAR is
    // already at the next sequential instruction (§13 check 4).
    expect(state.iar).toBe(76);
  });
});
