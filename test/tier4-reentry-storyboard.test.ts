// Tier 4 (smoke) — §1's TWO-JOB STORYBOARD, walked headless at the period desk. Plan §1 (steps
// 2-12), §10.3 (this file's row), §11 wave 6, §12.1 T4, §13 criterion 18 — and §13 criterion 19's
// printed-never-asserted performance figures.
//
// `tier4-` IS THE ONE PREFIX `package.json` KEYS ON — `"test": "vitest run --exclude
// 'test/tier4-*.test.ts'"`, `"smoke": "vitest run test/tier4-"` — so this file joins `npm run
// smoke` and is excluded from `npm test`, on `test/tier4-period-storyboard.test.ts`'s model. Like
// that file IT GATES: we wrote both decks and we know what they print.
//
// WHICH MACHINE: the whole desk, an IBM 1411 Model 2 — 20,000 positions (A22-0526-3 p.5), which is
// what `src/ui/main.ts:22` builds and what `demos/reentry.asm`'s `CTL 2` declares. NOT the 10,000
// `test/tier4-period-storyboard.test.ts:110` builds: that file is Phase 5's job on a Phase 4 desk
// and wave 4 moved the machine under it (BUILD-LOG-6, wave 4, "The machine is now 20K").
//
// WHAT THIS FILE IS FOR. `test/tier4-reentry-target.test.ts` runs the deck through the CORE façade
// — `display()`, `alter()`, `setMode()` — and photographs the page. This file runs the same two
// jobs through THE STATIONS A PERSON TOUCHES: `createAutocoderSession` (the coding sheet's
// ASSEMBLE and PUNCH INTO HOPPER), `createUnitRecordSession` (the deck box), `createConsoleSession`
// (the 1415's rotary, its START/STOP keys and its keyboard) and `createRpgSession` (the
// specification sheet). It is the only place the whole storyboard is one walk.
//
// NO DOM. `environment: 'node'` (vite.config.ts:8-11): every session above is DOM-free by
// construction, no view is mounted, and the first assertion this file makes says so.
//
// THE THREE GOLDENS ARE READ AND NEVER WRITTEN. `test/golden/reentry.page.txt` (wave 4) and
// `test/golden/reentry-summary.page.txt` (wave 5) are re-reached by RE-RUNNING both decks through
// the real assembler, the real loader, the real 1402 and the real 1411 — never parsed out of a
// file. `test/golden/reentry-console.txt` is this wave's own and §10.4 fixes its terms.
//
// WHY THE CONSOLE GOLDEN IS TAKEN AT `matrix: 'flush'` AND NOT AT `'indent'`. §10.4, and it is a
// written promise rather than a preference: `console/selectric.ts:59-84` declares
// `MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT = 30` a `[likely]` ORIGIN — the positions 35 and 30 are
// `[verified]` (S223-2648 Fig.5 p.9, A22-0526-3 Fig.42 p.46) and no page gives a unit or a left
// margin — and its own header says the primary-source byte comparison runs at `'flush'` *"PRECISELY
// so it does not depend on this ruling … If the origin is ever settled, this one number changes and
// NO GOLDEN MOVES."* A console golden cut at `'indent'` would make that sentence false the day it
// landed. The GOLDEN pins the roll; the matrix-35 row count below pins the indent; neither pins the
// origin.
//
// THE TRAJECTORY ROLL IS THE ONLY ONE COMMITTED. The RPG job's roll is a second run of the same
// eight-step dialogue ending in the same `S`, and a second golden of the same shape would churn on
// every deck edit while proving nothing the first does not (§10.4, the argument that refuses a
// third listing golden).

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { glyphOf } from '../src/core/bcd.js';
import { renderGreenBar } from '../src/core/devices/printer1403.js';
import { START_BUDGET, createMachine, type Machine } from '../src/core/machine.js';
import { PRINTED_BLANK } from '../src/core/printout.js';
import type { Card, ConsoleLine, MachineState, StopReason } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES } from '../src/formats/loader.js';
import { createAutocoderSession } from '../src/ui/period/autocoder/session.js';
import {
  MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT, renderSelectric,
} from '../src/ui/period/console/selectric.js';
import { createConsoleSession, type ConsoleSession } from '../src/ui/period/console/session.js';
import { paginate, trimRule3 } from '../src/ui/period/paper/page.js';
import { createRpgSession } from '../src/ui/period/rpg/session.js';
import { createSession as createUnitRecordSession } from '../src/ui/period/unitrecord/session.js';

// THE FIRST ASSERTION, before either walk runs: no view is mounted and none can be.
expect(typeof globalThis.document, 'vitest environment: node — no view is mounted')
  .toBe('undefined');

/** §5.11's `CTL 2` — a 1411 Model 2, and what `src/ui/main.ts:22` builds. */
const MACHINE_POSITIONS = 20_000;
/** The 1403 the desk builds: Model 2, chain A, the 66-line `DEFAULT_CARRIAGE_TAPE`. */
const CHAIN = 'A' as const;
const FORM_LINES = 66;
const HEADER = `1403 Model 2 · chain ${CHAIN} · ${FORM_LINES}-line form\n\n`;
/** FRAMES, not instructions: each turn of the loop is one `machine.start(START_BUDGET)`. */
const FRAME_BUDGET = 1000;

/** `demos/reentry.asm` as wave 5 froze it (§11.5 rule 1), counted this session. */
const SOURCE_CARDS = 1195;
/** Wave 5's measured object-card count — `assemble(demos/reentry.asm).deck.records.length`. */
const OBJECT_CARDS = 185;
/** Bootstrap card, loader body card, execute card, case card (§1 step 5, §13 criterion 18). */
const CARDS_AROUND_THE_OBJECT_DECK = 4;
/** §1's step count: 92 printed detail rows and 92 punched cards. */
const ROWS = 92;
/** §7.1 as wave 4 republished it: 46 detail rows, 46, then the 9-line summary form. */
const FORMS = 3;
/** Wave 4's measured page: 10 + 46 heading and detail on form 1, 5 + 46 on form 2, 9 on form 3. */
const PRINTED_LINES = 116;
/** `POCKET_OF_X3`: x3 = `0` is pocket NP, the one `P1 0,PAREA` selects (`punch1402.ts:36`). */
const POCKET = '0';

const SOURCE = readFileSync('demos/reentry.asm', 'utf8');
const CASE_CARDS = readFileSync('demos/reentry.case.cards', 'utf8');
const SPECS = readFileSync('demos/reentry-summary.rpg', 'utf8');
const PUNCHED_DECK = readFileSync('demos/reentry-summary.data.cards', 'utf8');
const PAGE_GOLDEN = readFileSync('test/golden/reentry.page.txt', 'utf8');
const CONSOLE_GOLDEN = readFileSync('test/golden/reentry-console.txt', 'utf8');
const EXTRACT_GOLDEN = readFileSync('test/golden/reentry-summary.page.txt', 'utf8');

/** Matrix 35 sits five columns right of matrix 30, which is the indent's origin (§10.4). */
const AT_35 = ' '.repeat(35 - MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT);

/**
 * The Op group of an `S` / `C` / `E` line: `printout.ts:148-166`'s FOURTH space-separated field,
 * two cells — the op character and its modifier, each `PRINTED_BLANK` where the machine has none.
 * A mode change and the STOP key have no op; a programmed stop carries the one it stopped on.
 */
const opGroup = (line: ConsoleLine): string => line.text.split(' ')[3] ?? '';
/** The Op group of a line the machine typed with nothing in the instruction register. */
const NO_OP_GROUP = PRINTED_BLANK.repeat(2);

interface Desk {
  readonly machine: Machine;
  readonly session: ConsoleSession;
  /**
   * `main.ts:34-38`'s run/halt pair as counters (`focus` is NOT main.ts's — `main.ts:74` passes
// `{ run, halt, kick }`, and `session.ts:313-316` says `hooks.focus` is `console/mount.ts`'s
// `.focus()` on the keyboard wrapper), plus the module-local `running` latch its frame gate
   * reads — `controls.ts:35-40`'s pair, so the period START key and the internals RUN button drive
   * one thing.
   */
  readonly frame: { run: number; halt: number; focus: number; running: boolean };
}

function desk(): Desk {
  const machine = createMachine({ size: MACHINE_POSITIONS });
  const frame = { run: 0, halt: 0, focus: 0, running: false };
  const session = createConsoleSession(machine, {
    run: () => { frame.run += 1; frame.running = true; },
    halt: () => { frame.halt += 1; frame.running = false; },
    focus: () => { frame.focus += 1; },
  });
  return { machine, session, frame };
}

/**
 * §1 step 6, at the 1415, in the manual's order (C28-0351-5 p.8): STOP, MODE = DISPLAY, 00000,
 * START; MODE = ALTER, key the twelve characters BY HAND; COMPUTER RESET; MODE = RUN; START.
 * `keyBootstrap` is the deck box's BUTTON and is deliberately not pressed — every character goes
 * through `keyboard.press()` with `pressWordMark()` before the `L` at 00001 and the `R` at 00011.
 */
function keyTheBootstrap({ machine, session }: Desk): void {
  session.stopKey();                                             // the first S
  session.turn('display');                                       // the second S
  session.startKey();
  for (const digit of '00000') expect(session.keyboard.press(digit), digit).toBe(true);
  expect(session.keyboard.state, 'the auto-lock fired on the fifth digit').toBe('locked');

  session.turn('alter');                                         // the third S
  session.startKey();
  const { text, wordMarks } = BOOTSTRAP_KEYSTROKES;
  [...text].forEach((glyph, i) => {
    if (wordMarks[i] === true) session.keyboard.pressWordMark();
    expect(session.keyboard.press(glyph), glyph).toBe(true);
  });
  expect(session.keyboard.typed).toBe('AL%1000012$R');
  expect([...session.keyboard.wordMarks], 'the L at 00001 and the R at 00011')
    .toEqual([...wordMarks]);

  session.computerReset();                                       // the commit
  expect(machine.storage.wm(1), 'the WORD MARK key re-entered it').toBe(true);
  expect(machine.storage.wm(11)).toBe(true);
  session.turn('run');                                           // the fourth S
  session.startKey();
}

/**
 * The SAME dialogue on a desk that has already run a job, and the one place it differs. The first
 * keying left the `L` at 00001 word-marked, so DISPLAY 00000 types ONE character and the ALTER field
 * opens one position wide: the `A` fills it, auto-locks and commits, and the eleven keys after it are
 * refused. Nothing is lost — the bootstrap is still in core from the first job, and this says so
 * before START rather than trusting it.
 */
function rekeyTheBootstrap({ machine, session }: Desk): void {
  session.stopKey();
  session.turn('display');
  session.startKey();
  for (const digit of '00000') expect(session.keyboard.press(digit), digit).toBe(true);
  session.turn('alter');
  session.startKey();
  const { text, wordMarks } = BOOTSTRAP_KEYSTROKES;
  expect(session.keyboard.press(text[0] ?? ''), 'the one-position field takes the A').toBe(true);
  expect(session.keyboard.state, 'and auto-locks on it').toBe('locked');
  session.computerReset();
  expect([...text].map((_, i) => glyphOf(machine.storage.bcd(i))).join(''),
    'the bootstrap is still at 00000').toBe(text);
  expect([...text].map((_, i) => machine.storage.wm(i)), 'with its two marks')
    .toEqual([...wordMarks]);
  session.turn('run');
  session.startKey();
}

/**
 * §1 step 7 — `src/ui/main.ts:97-99`'s FOUR-TERM EXECUTE GATE, VERBATIM, so a change to the page's
 * one animation frame shows up here. In this loop only `frame.running` varies; `held` is false,
 * `detent` is 'run' and `machine.mode` is 'run' throughout, and the other three terms are carried
 * for fidelity to the frame (`test/period-console.test.ts` exercises each on its own).
 */
function runToStop(deskState: Desk): { stop: StopReason | undefined; frames: number } {
  const { machine, session, frame } = deskState;
  let stop: StopReason | undefined;
  let frames = 0;
  while (frame.running && !session.held && session.detent === 'run' && machine.mode === 'run'
    && frames < FRAME_BUDGET) {
    stop = machine.start(START_BUDGET);
    if (stop !== undefined) frame.running = false;
    frames += 1;
  }
  return { stop, frames };
}

interface Trajectory {
  readonly objectCards: number;
  readonly hopperCards: number;
  readonly fed: MachineState['reader'];
  readonly focusCount: number;
  readonly runHook: number;
  readonly haltHook: number;
  readonly stop: StopReason | undefined;
  readonly frames: number;
  readonly atHalt: readonly ConsoleLine[];
  readonly state: MachineState;
  readonly punched: readonly Card[];
  readonly instructions: number;
  readonly microseconds: number;
}

/** §1 steps 2-10: the coding sheet, the deck box, the 1415 and the 1403, in one session. */
function trajectory(state: Desk = desk()): Trajectory {
  // ═══ §1 step 2 — `sample reentry`: the two files the button hands over, READ FROM DISK ═══════
  const asm = createAutocoderSession();
  asm.setSource(SOURCE);
  asm.setDataText(CASE_CARDS);

  // ═══ §1 step 4 — ASSEMBLE ═══════════════════════════════════════════════════════════════════
  const assembled = asm.assemble();
  expect(assembled.ok, 'demos/reentry.asm assembles').toBe(true);
  expect(assembled.flagged, 'zero flagged lines').toEqual([]);
  expect(assembled.warnings, 'zero warnings — §6.11’s reserved-area layout working').toEqual([]);

  // ═══ §1 step 5 — PUNCH INTO HOPPER, then the 1402's own two keys ════════════════════════════
  const { machine, frame } = state;
  const cards = createUnitRecordSession(machine);
  expect(cards.setDeckText(asm.hopperText()), 'the punched deck parses clean').toEqual([]);
  expect(cards.putDeckInHopper()).toBe(true);
  machine.readerStart();
  machine.readerEndOfFile();                     // both keys: software.md §10.7
  const fed = machine.snapshot().reader;         // BEFORE the run: the hopper is still full

  // ═══ §1 step 6 — the 1415 dialogue ══════════════════════════════════════════════════════════
  keyTheBootstrap(state);

  // ═══ §1 step 7 — the frame ══════════════════════════════════════════════════════════════════
  const { stop, frames } = runToStop(state);
  const atHalt = machine.snapshot().console;
  machine.endOfJob();                            // the tear-off: the armed automatic single space

  const snapshot = machine.snapshot();
  return {
    objectCards: assembled.deck.records.length,
    hopperCards: cards.deck.length,
    fed,
    focusCount: frame.focus,
    runHook: frame.run,
    haltHook: frame.halt,
    stop,
    frames,
    atHalt,
    state: snapshot,
    // THE CARDS LIVE ON THE DEVICE, NOT IN THE SNAPSHOT: `MachineState.punch` carries counts only
    // (`machine.ts:547`), so a test written against the snapshot could only count (§8.1).
    punched: machine.punch.pockets[POCKET] ?? [],
    instructions: snapshot.instructions,
    microseconds: snapshot.microseconds,
  };
}

/**
 * §1 steps 11-12: the specification sheet, GENERATE, SEND TO AUTOCODER, ASSEMBLE, and the run.
 * The page is the paper THIS job fed, so the same function serves a desk that already ran a job.
 */
function extract(
  state: Desk = desk(),
  keyBootstrap: (desk: Desk) => void = keyTheBootstrap,
): { readonly stop: StopReason | undefined; readonly page: string } {
  const rpg = createRpgSession();
  rpg.setSpecText(SPECS);
  rpg.setDataText(PUNCHED_DECK);                 // the deck the 1402 just punched, byte for byte
  const generated = rpg.generate();
  expect(generated.ok, 'demos/reentry-summary.rpg generates').toBe(true);
  expect(generated.diagnostics, 'the 54 specification cards generate clean').toEqual([]);

  const handed = rpg.handOff();                  // SEND TO AUTOCODER
  const asm = createAutocoderSession();
  asm.setSource(handed.source);
  asm.setDataText(handed.dataCards);
  const assembled = asm.assemble();
  expect(assembled.ok, 'the generated program assembles').toBe(true);
  expect(assembled.flagged, 'zero flagged lines').toEqual([]);
  expect(assembled.warnings, 'zero warnings').toEqual([]);

  const fedBefore = state.machine.snapshot().printer.paper.length;
  const cards = createUnitRecordSession(state.machine);
  expect(cards.setDeckText(asm.hopperText()), 'the generated deck parses clean').toEqual([]);
  expect(cards.putDeckInHopper()).toBe(true);
  state.machine.readerStart();
  state.machine.readerEndOfFile();
  keyBootstrap(state);
  const { stop } = runToStop(state);
  state.machine.endOfJob();
  return {
    stop,
    page: renderGreenBar(state.machine.snapshot().printer.paper.slice(fedBefore),
      { chain: CHAIN, formLines: FORM_LINES }),
  };
}

const run = trajectory();
const rpgJob = extract();

// §2.9 AS THE DESK ACTUALLY RUNS IT: ONE MACHINE FOR THE WHOLE PAGE (`src/ui/main.ts:22`), the
// RPG job keyed in straight after the trajectory job with nothing cleared between them. `run` and
// `rpgJob` above each build a FRESH machine through `desk()`, so they could not see what the
// first job leaves in core — and it left a word mark at 01963, inside the generated program's
// card image, which shortened `ZA C006,TIME` to three digits and printed 52 wrong extract lines.
// Tom's ruling (2026-10-02): the generated program must not assume clean core.
const shared = desk();
trajectory(shared);
const sharedRpgJob = extract(shared, rekeyTheBootstrap);

describe('Tier 4 GATE — §1 walked headless at the desk (plan §11 wave 6, §13 criterion 18)', () => {
  it('mounts no view: `document` does not exist in this environment', () => {
    expect(typeof globalThis.document).toBe('undefined');
  });

  it('§1 step 2 — the coding sheet is filled from the two files on disk, never from a literal', () => {
    // What `sample reentry` hands over (§10.1): the source and the ONE case card. Asserted as
    // properties of the files rather than by comparing to text typed here, which would be a copy.
    // MEASURED, and it corrects the record: `docs/BUILD-LOG-6.md`'s wave-5 table says the deck
    // grew "1,128 -> 1,185 cards". Wave 4's 1,128 is right and 1,185 is not — `git show
    // 0b17a9d:demos/reentry.asm` is 1,195 lines, none of them blank, and `readSource` skips only
    // blank lines (`src/asm/source.ts:114`). The deck grew by 67 cards, not 57.
    expect(SOURCE.split('\n').filter((line) => line !== '').length,
      'demos/reentry.asm, in 80-column Autocoder cards').toBe(SOURCE_CARDS);
    expect(CASE_CARDS.split('\n').filter((line) => line !== ''), 'the case deck is ONE card')
      .toHaveLength(1);
    expect(SOURCE, 'the deck heads itself BALLISTIC REENTRY TRAJECTORY')
      .toContain('BALLISTIC REENTRY TRAJECTORY');
  });

  it('§1 step 4 — ASSEMBLE: ok, zero flagged, ZERO WARNINGS, and 185 object cards', () => {
    // All three, because `ok` alone is green on a deck whose loader-planted GM-WM sits inside a
    // reserved area (§13 criterion 5). The count is wave 5's MEASURED number and never §6.13's
    // ≈154 estimate — `trajectory()` asserted ok/flagged/warnings before it ran.
    expect(run.objectCards, 'assemble(demos/reentry.asm).deck.records.length').toBe(OBJECT_CARDS);
  });

  it('§1 step 5 — PUNCH INTO HOPPER puts 189 cards in the 1402, and the two keys feed one', () => {
    // 185 + 4: the bootstrap card, the loader body card, the execute card and the case card. The
    // estimate §6.13 carries is ≈158 and is not asserted anywhere — this is the measured number.
    expect(OBJECT_CARDS + CARDS_AROUND_THE_OBJECT_DECK).toBe(189);
    expect(run.hopperCards, 'the deck the coding sheet punched').toBe(189);
    expect(run.fed.hopper, 'READER START fed the front card up').toBe(188);
    expect(run.fed.buffered, 'and it is in the 1414’s 80-position buffer').toBe(true);
    expect(run.fed.eofKey, 'END OF FILE: fewer than four cards behind the last one').toBe(true);
  });

  it('§1 step 6 — the dialogue is BOOTSTRAP_KEYSTROKES, keyed one character at a time', () => {
    // `keyTheBootstrap` asserted the twelve presses, the two word marks and the auto-lock as it
    // typed them; what is left is the desk's own bookkeeping.
    expect(run.focusCount, 'START unlocked the keyboard twice — the address, then the data').toBe(2);
    expect(run.runHook, 'START in the RUN detent is main.ts’s `() => { running = true; }`').toBe(1);
    expect(run.haltHook, 'the STOP key plus three real turns of the rotary').toBe(4);
  });

  it('§1 step 7 — main.ts’s four-term gate runs the deck to a halt in 27 frames', () => {
    // 52,406 instructions at START_BUDGET = 2000. PRINTED, NEVER ASSERTED as a performance figure
    // (§13 criterion 19) — what is asserted is that the deck halts, and well inside the budget.
    expect(run.stop, `the run ended ${String(run.stop)} and not on the deck’s own H`).toBe('halt');
    expect(run.frames, 'the deck halts well inside the frame budget').toBeLessThan(FRAME_BUDGET);
    expect(run.frames, 'the desk’s unpaced frame shape (1411 SPEED off), replicated headlessly (BUILD-LOG-6 wave 5)')
      .toBe(27);
  });

  it('§1 step 8 — CRITERION 18: the last line of the roll is an S whose Op group is `.`', () => {
    // THE ASSERTION THE PHASE'S ENTRY CONDITION EXISTS FOR. Before wave 0 the programmed halt
    // typed nothing at all: `printStop` fires only in `machine.start()` (`machine.ts:290`) and
    // only under `PROGRAM_STOP_TYPES_S`, so this line reaches the paper through `start()` and
    // never through `run()` — which is also why `tools/run-deck.ts` and `tools/rpg.ts` moved onto
    // a `start()` loop this wave (§9.8).
    const last = run.atHalt.at(-1);
    expect(last?.id, 'the last thing the 1415 typed').toBe('S');
    expect(opGroup(last as ConsoleLine)[0],
      'the op the machine stopped ON — a `.`, the programmed stop').toBe('.');
    // And the discrimination that makes it evidence: the STOP key and the three rotary turns type
    // the SAME `S` line with an EMPTY op group. Only the halt carries an op.
    expect(run.atHalt.filter((l) => l.id === 'S').map(opGroup),
      'STOP, the DISPLAY turn, the ALTER turn, the RUN turn — then the halt')
      .toEqual([NO_OP_GROUP, NO_OP_GROUP, NO_OP_GROUP, NO_OP_GROUP, `.${PRINTED_BLANK}`]);
    expect(run.atHalt.map((l) => l.id), '§10.4’s eight lines, in order')
      .toEqual(['S', 'S', 'D', 'D', 'S', 'A', 'S', 'S']);
  });

  it('§10.4 — the whole 1415 roll equals test/golden/reentry-console.txt BYTE FOR BYTE', () => {
    // At `matrix: 'flush'`, which is the file header's argument and §10.4's ruling: the golden
    // pins the ROLL and takes no position on where matrix 30 sits on the form.
    const roll = renderSelectric(run.atHalt,
      { matrix: 'flush', marks: 'render', spacing: 'render' });
    expect(roll).toBe(CONSOLE_GOLDEN);
    expect(new TextEncoder().encode(roll).length, 'the roll’s measured size, §10.4').toBe(382);
  });

  it('and the INDENT is pinned separately — five S rows at matrix 35', () => {
    // `test/tier4-period-storyboard.test.ts:263-265`'s shape. The indent is what the browser
    // draws; asserting the ROW COUNT at 35 exercises it without freezing the origin into a golden.
    const rows = renderSelectric(run.atHalt,
      { matrix: 'indent', marks: 'render', spacing: 'render' }).split('\n');
    expect(rows.filter((r) => r.startsWith(`${AT_35}S `)),
      'the STOP key, the DISPLAY, ALTER and RUN turns, and the programmed halt').toHaveLength(5);
  });

  it('§1 step 9 — three forms, and the paper equals test/golden/reentry.page.txt', () => {
    const { paper, carriage } = run.state.printer;
    expect(paper, `the run printed ${paper.length} lines`).toHaveLength(PRINTED_LINES);
    const pages = paginate(paper, carriage, FORM_LINES);
    const inked = pages.filter((p) => p.printedThrough > 0);
    expect(inked, 'inked forms through paginate').toHaveLength(FORMS);
    const identity = HEADER + inked.map(trimRule3).join('\f\n');
    expect(renderGreenBar(paper, { chain: CHAIN, formLines: FORM_LINES }), '§5.1’s identity')
      .toBe(identity);
    expect(identity, 'READ, never written — wave 4’s 13,488-byte golden').toBe(PAGE_GOLDEN);
  });

  it('§1 step 10 — 92 cards in pocket 0, and the pocket IS demos/reentry-summary.data.cards', () => {
    // What makes "no trajectory number is ever hand-typed into a file" enforceable (§8.3): the
    // committed deck is a decode of this pocket, and this case fails the moment a digit is edited.
    expect(run.state.punch.stackers[POCKET], 'cards stacked in pocket 0').toBe(ROWS);
    expect(run.punched, 'the cards on the device').toHaveLength(ROWS);
    const committed = parseDeck(PUNCHED_DECK);
    expect(committed.errors, 'the committed deck parses with zero errors').toEqual([]);
    expect(run.punched).toEqual(committed.deck);
  });

  it('§1 steps 11-12 — the RPG job, and the extract page against wave 5’s golden', () => {
    // GENERATE -> SEND TO AUTOCODER -> ASSEMBLE -> PUNCH INTO HOPPER -> the same eight-step 1415
    // dialogue -> the same four-term frame gate. `extract()` asserted the generator and the
    // assembler as it walked; this is the artifact.
    expect(rpgJob.stop, `the extract run ended ${String(rpgJob.stop)}`).toBe('halt');
    expect(rpgJob.page, 'READ, never written — wave 5’s 9,648-byte golden').toBe(EXTRACT_GOLDEN);
    expect(rpgJob.page.split('\f'), 'the extract paginates to two forms').toHaveLength(2);
  });

  it('§2.9 — ONE machine, BOTH jobs: the extract does not depend on clean core', () => {
    // The fresh-machine case above passes on a program that assumes clean core; this one does not.
    // The golden is the same file, READ and never written: the second job's paper must not move.
    expect(sharedRpgJob.stop, `the extract run ended ${String(sharedRpgJob.stop)}`).toBe('halt');
    expect(sharedRpgJob.page, 'the trajectory job’s word marks change nothing').toBe(EXTRACT_GOLDEN);
  });

  // §13 CRITERION 19 — PRINTED, NEVER ASSERTED, the cc01 precedent. §5.10 estimated 41,543
  // instructions and 15,925,705 µs from a deck that had neither the page nor the punch in it; the
  // deck that shipped runs longer. No test compares them, because a build that made them a gate
  // would be gating on a timing table. It is a `console.log` inside a case rather than at module
  // scope so `npm run smoke` actually shows it.
  it('§13 criterion 19 — the performance figures, PRINTED and never asserted', () => {
    console.log(`\n§13 criterion 19 — the trajectory run, unaccelerated (Accelerator not assumed):`
      + `\n  ${run.instructions.toLocaleString('en-US')} instructions`
      + `\n  ${run.microseconds.toLocaleString('en-US')} µs emulated `
      + `(${(run.microseconds / 1e6).toFixed(2)} s of 1411 time)`
      + `\n  ${run.frames} frames at START_BUDGET = ${String(START_BUDGET)}`
      + `\n  §5.10 estimated 41,543 instructions and 15,925,705 µs — before the page and the punch.`
      + `\n  The 1403's own time at 600 lpm is 11.7 s (A22-0526-3 p.67).\n`);
    // The one thing a test may say about a timing figure: that the machine reported one at all.
    expect(Number.isFinite(run.microseconds)).toBe(true);
  });
});
