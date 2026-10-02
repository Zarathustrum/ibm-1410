// Tier 4 (smoke) — §1's STORYBOARD end to end in node, and it GATES. Plan §1 (the fourteen steps),
// §11 wave 6 (this file's row), §12.1 T4, §13 criterion 16. It joins `npm run smoke` on its
// `tier4-` prefix: 6 files / 49 becomes 7 files / 50.
//
// ONE `it`, deliberately. The storyboard is ONE session at ONE desk: the paper the 1403 ends with
// is the paper the console dialogue started, so splitting it into cases would either rebuild the
// machine per case or share mutable state between them. The case's title names the four
// criterion-16 artifacts it exists to pin.
//
// WHICH MACHINE: the whole desk, an IBM 1410 — the 1402 Card Read-Punch (READER START and END OF
// FILE, and no LOAD key: software.md §10.1, §10.10), the 1411 Processing Unit, the 1415 Console
// (its six-detent MODE rotary, A22-0526-3 Fig.47 p.49; its modified-Selectric keyboard with a real
// WORD MARK key, Fig.43 p.47; the display/alter dialogue of pp.50-51) and the 1403 Model 2 on its
// 66-line form (io.md §7; A22-0526-3 pp.67-68). NOT a 1401: the address is TYPED at the keyboard
// because the 1410 has no address-dial rotary switches (console-and-physical.md §1).
//
// THE GOLDEN IS READ AND NEVER WRITTEN. `test/golden/sales-summary.page.txt` (3688 bytes) is
// Phase 5's, on §3.7's do-not-touch list. The paper below is obtained by RE-RUNNING the deck
// through the real loader, the real 1402 and the real 1411 — never parsed out of the file.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · It CONSTRUCTS NO VIEW and mounts nothing. `environment: 'node'` (vite.config.ts:8-11), so
//    `document` does not exist; `specs/resultView.ts` is imported for its pure `memoryMapText`
//    alone, which builds a string at call time and creates no node.
//  · It CHANGES NO `src/` FILE — wave 6 writes one test and documentation (§11 wave 6, and §11's
//    does-not-touch row for this wave names every `src/` file).
//  · It RECOMPUTES NOTHING. The memory map is Phase 5's `layoutOf` numbers restyled (§1 step 3);
//    the twelve keystrokes are `BOOTSTRAP_KEYSTROKES` (loader.ts:53-58) and never a second `^`
//    parser; the carriage tape is the device's own object.
//  · It DOES NOT PRESS `keyBootstrap`. That is the deck box's BUTTON (§6.4). §1 step 10's operator
//    keys the twelve characters BY HAND, so every one goes through `keyboard.press()` below with
//    `pressWordMark()` before the `L` at 00001 and the `R` at 00011.
//
// TWO PLAN CORRECTIONS THIS CASE CARRIES, asserted rather than described:
//  1. §11 wave 6 says `paginate` gives "2 forms" and that `straddled` "reports none". Neither is
//     true of the machine. `paginate` emits THREE `FormPage`s — rule 3 emits the carriage's own
//     form and the closing `EOJ CC1 1` parks it on a fresh form 4 — of which TWO are inked; and
//     the eject from form 3 line 11 crosses the channel-9 punch at 57 and the channel-12 punch at
//     60 without sensing either (`CARRIAGE_SENSES_AT_DESTINATION_ONLY`, printer1403.ts:329-354),
//     so the ruled derivation returns `[{57,9},{60,12}]`. Wave 2 found both on this same deck
//     (BUILD-LOG-4 wave 2; test/period-printer.test.ts, §11 wave 2 (a) and (d)).
//  2. §1 step 14 and §13 criterion 16 expect an `I` line "from a released inquiry". The `I` line
//     types when the PROGRAM's `RCP` executes (console1415.ts:311-313), and the generated
//     sales-summary program issues NO console read — asserted below on the generated source. So
//     the released inquiry at this desk types nothing, which is pinned as an ABSENCE with its
//     reason, and the `I` line is pinned as a POSITIVE on a second machine inside this same case:
//     a hand-planted `M %T0 00500 R`, driven the way test/console-inquiry.test.ts drives one.
//  A THIRD, smaller: wave 6's request predicted `STATUS · B<A` lit at the halt. `B<A` alone is a
//  FRESH machine's reset asymmetry (opcodes.md §8; BUILD-LOG-4 wave 4 (e)) — after this deck runs
//  to its halt the lit pair is `STATUS · B=A` and `SYSTEMS CONTROLS · STOP`.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { bcdOfGlyph } from '../src/core/bcd.js';
import { renderGreenBar } from '../src/core/devices/printer1403.js';
import {
  CONSOLE_LINE_LENGTH, START_BUDGET, createMachine, type Machine,
} from '../src/core/machine.js';
import type { StopReason } from '../src/core/types.js';
import { BOOTSTRAP_KEYSTROKES } from '../src/formats/loader.js';
import { createAutocoderSession } from '../src/ui/period/autocoder/session.js';
import { lampsOf } from '../src/ui/period/console/lamps.js';
import {
  MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT, renderSelectric,
} from '../src/ui/period/console/selectric.js';
import { createConsoleSession, type ConsoleSession } from '../src/ui/period/console/session.js';
import { lastInkedForm, lastPrintedOn, straddled } from '../src/ui/period/paper/carriage.js';
import { paginate, trimRule3 } from '../src/ui/period/paper/page.js';
import { createRpgSession } from '../src/ui/period/rpg/session.js';
import { memoryMapText } from '../src/ui/period/specs/resultView.js';
import { createSession as createUnitRecordSession } from '../src/ui/period/unitrecord/session.js';

const CHAIN = 'A' as const;
const FORM_LINES = 66;
const HEADER = `1403 Model 2 · chain ${CHAIN} · ${FORM_LINES}-line form\n\n`;
/** FRAMES, not instructions: each turn of the loop is one `machine.start(START_BUDGET)` (§10.2). */
const FRAME_BUDGET = 1000;

/** §1 step 3 — Phase 5's `layoutOf` numbers, restyled by `memoryMapText` and never recomputed.
 *  IND and CDIN moved from 02533/02540 when START's entry clear put IND on a hundreds boundary. */
const MEMORY_MAP = 'CONSTANTS 00500 · CODE 00808 · IND 02600 · CDIN 02607 · PLINE 02700'
  + ' · PLGM 02832 · HIGH 02833 · CTL 1';

/** U+030C combining caron — the inverted circumflex a word mark overstrikes (charset.md §7). */
const WM = '̌';
/** U+00D8 — the console's slashed zero. The letter `O` is not slashed (C28-0351-5 p.2). */
const O0 = 'Ø';
/** Matrix 35 sits five columns right of matrix 30, which is the indent's origin (§4.5, §6.1). */
const AT_35 = ' '.repeat(35 - MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT);

/** §1 step 10's twelve characters as the Selectric holds them, marks and slashed zeros included. */
const A_LINE = `A AL${WM}%1${O0.repeat(4)}12$R${WM}`;
/** §6.3 step 5: `machine.display()` pushes BOTH lines — the address at 35, the data at 30. */
const D_ADDRESS = `${AT_35}D ${O0.repeat(5)}`;
const D_DATA = `D ${' '.repeat(CONSOLE_LINE_LENGTH)}`;

interface Desk {
  readonly machine: Machine;
  readonly session: ConsoleSession;
  /**
   * `main.ts`'s own hooks (§4.8, §10.2) as counters, plus the module-local `running` latch the
   * frame gate reads — `controls.ts:35-40`'s pair, so the period START key and the internals RUN
   * button drive one thing.
   */
  readonly frame: { run: number; halt: number; focus: number; running: boolean };
}

function desk(): Desk {
  const machine = createMachine({ size: 10_000 });
  const frame = { run: 0, halt: 0, focus: 0, running: false };
  const session = createConsoleSession(machine, {
    run: () => { frame.run += 1; frame.running = true; },
    halt: () => { frame.halt += 1; frame.running = false; },
    focus: () => { frame.focus += 1; },
  });
  return { machine, session, frame };
}

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

describe('Tier 4 GATE — §1 headless, at the whole desk (plan §11 wave 6, §13 criterion 16)', () => {
  it('runs the storyboard: four S lines, the D address/data pair, the A line with its two word '
    + 'marks, and the paper identity against the 3688-byte golden', () => {
    expect(typeof globalThis.document, 'vitest environment: node — no view is mounted')
      .toBe('undefined');

    // ═══ §1 steps 2-3 — SPEC SHEET, then GENERATE ══════════════════════════════════════════════
    const rpg = createRpgSession();
    rpg.setSpecText(readFileSync('demos/sales-summary.rpg', 'utf8'));
    rpg.setDataText(readFileSync('demos/sales-summary.data.cards', 'utf8'));
    const generated = rpg.generate();
    expect(generated.ok).toBe(true);
    expect(generated.diagnostics, 'the sixty cards Phase 5 froze generate clean').toEqual([]);
    expect(memoryMapText(generated), 'Phase 5’s numbers, restyled and not recomputed')
      .toBe(MEMORY_MAP);

    // ═══ §1 steps 4-6 — SEND TO AUTOCODER, ASSEMBLE, and the one-character edit ════════════════
    const handed = rpg.handOff();
    const asm = createAutocoderSession();
    asm.setSource(handed.source);
    asm.setDataText(handed.dataCards);
    const assembled = asm.assemble();
    expect(assembled.ok).toBe(true);
    expect(assembled.flagged, 'zero flagged lines').toEqual([]);
    expect(assembled.warnings, 'zero warnings').toEqual([]);
    expect(asm.stale, 'the artifacts on screen describe the text in the boxes').toBe(false);

    asm.setSource(`${handed.source} `);            // §1 step 6: edit ONE character
    expect(asm.stale, '§9.4 constraint 11, in node and not in a DOM closure').toBe(true);
    expect(asm.hopperText(), 'PUNCH retires with the listing and the deck').toBe('');
    asm.setSource(handed.source);
    expect(asm.assemble().ok).toBe(true);
    expect(asm.stale).toBe(false);

    // ═══ §1 step 8 — PUT DECK IN HOPPER, then the 1402's own keys ══════════════════════════════
    const { machine, session, frame } = desk();
    const cards = createUnitRecordSession(machine);
    expect(cards.setDeckText(asm.hopperText()), 'the punched deck parses clean').toEqual([]);
    expect(cards.putDeckInHopper()).toBe(true);
    machine.readerStart();
    machine.readerEndOfFile();                     // both keys: software.md §10.7
    const fed = machine.snapshot().reader;
    expect(fed.hopper, 'READER START fed the front card up').toBe(cards.deck.length - 1);
    expect(fed.buffered, 'and it is in the 1414’s 80-position buffer').toBe(true);
    expect(fed.eofKey).toBe(true);
    expect(cards.bufferedCard(fed), 'deck order: the first card punched').toBe(cards.deck[0]);
    expect(cards.hopperCards(fed)).toHaveLength(cards.deck.length - 1);

    // ═══ §1 steps 9-10 — the 1415 dialogue, in the manual's order (§6.3) ═══════════════════════
    session.stopKey();                                             // 1: the first S
    session.turn('display');                                       // 2: the second S
    session.startKey();                                            // 3: unlocks, and focuses
    expect(session.keyboard.state).toBe('address');
    expect(frame.focus).toBe(1);
    for (const digit of '00000') expect(session.keyboard.press(digit)).toBe(true);   // 4-5
    expect(session.keyboard.state, 'the auto-lock fired on the fifth digit').toBe('locked');
    expect(machine.snapshot().console.map((l) => l.id)).toEqual(['S', 'S', 'D', 'D']);

    session.turn('alter');                                         // 6: the third S
    session.startKey();                                            // 7
    expect(session.keyboard.state).toBe('data');
    expect(frame.focus).toBe(2);
    // 8: BY HAND, one character at a time, through the same keyboard a person uses — never
    // `keyBootstrap`, which is the deck box's button (§6.4).
    const { text, wordMarks } = BOOTSTRAP_KEYSTROKES;
    [...text].forEach((glyph, i) => {
      if (wordMarks[i] === true) session.keyboard.pressWordMark();
      expect(session.keyboard.press(glyph), glyph).toBe(true);
    });
    expect(session.keyboard.typed).toBe('AL%1000012$R');
    expect([...session.keyboard.wordMarks], 'the L at 00001 and the R at 00011')
      .toEqual([...wordMarks]);

    session.computerReset();                                       // 9: the commit
    expect(machine.snapshot().console.at(-1)?.id).toBe('A');
    expect(machine.storage.wm(1), 'the WORD MARK key re-entered it').toBe(true);
    expect(machine.storage.wm(11)).toBe(true);
    session.turn('run');                                           // 10: the fourth S
    expect(machine.mode).toBe('run');
    session.startKey();
    expect(frame.run, 'START in the RUN detent is main.ts’s `() => { running = true; }`').toBe(1);
    expect(frame.halt, 'STOP plus three real turns — the hook, not the loop’s own latch').toBe(4);

    // ═══ §1 steps 11-12 — the frame, and the real loader and the real 1411 ═════════════════════
    // §10.2's four-term execute gate VERBATIM, so a change to `src/ui/main.ts:92-93` shows up
    // here. In THIS loop only `frame.running` varies — `held` is false, `detent` is 'run' and
    // `machine.mode` is 'run' throughout; the other three terms are carried for fidelity to the
    // frame, and test/period-console.test.ts is where each is exercised on its own.
    let stop: StopReason | undefined;
    let frames = 0;
    while (frame.running && !session.held && session.detent === 'run' && machine.mode === 'run'
      && frames < FRAME_BUDGET) {
      stop = machine.start(START_BUDGET);
      if (stop !== undefined) frame.running = false;
      frames += 1;
    }
    expect(frames, 'the deck halts well inside the budget').toBeLessThan(FRAME_BUDGET);
    expect(stop).toBe('halt');
    machine.endOfJob();                            // §1 step 14's tear-off: the armed space (§7.2)

    const state = machine.snapshot();
    const lit = lampsOf(state).filter((l) => l.lit).map((l) => `${l.lamp.box} · ${l.lamp.label}`);
    expect(lampsOf(state).filter((l) => l.driven), '§8.1’s sixteen').toHaveLength(16);
    expect(lit, 'the deck’s last compare, and the halt').toEqual(['status · B=A',
      'systemControls · STOP']);

    // ═══ §1 step 12 — the paper: three forms, two inked, and the identity ══════════════════════
    const { paper, carriage } = state.printer;
    const pages = paginate(paper, carriage, FORM_LINES);
    expect(pages.map((p) => p.form), 'the report is on 2 and 3; the eject parks on 4')
      .toEqual([2, 3, 4]);
    expect(pages.filter((p) => p.printedThrough > 0).map((p) => p.form)).toEqual([2, 3]);
    expect(pages.map((p) => p.complete)).toEqual([true, true, false]);

    const golden = readFileSync('test/golden/sales-summary.page.txt', 'utf8');
    const identity = HEADER
      + pages.filter((p) => p.printedThrough > 0).map(trimRule3).join('\f\n');
    expect(renderGreenBar(paper, { chain: CHAIN, formLines: FORM_LINES }), '§5.1’s identity')
      .toBe(identity);
    expect(identity, 'READ, never written — Phase 5’s 3688-byte golden').toBe(golden);

    // The eject that really does straddle — §11 wave 6's "reports none" was wrong on the facts.
    const to = { form: carriage.page, line: carriage.line };
    expect(to).toEqual({ form: 4, line: 1 });
    expect(lastInkedForm(paper)).toBe(3);
    expect(lastPrintedOn(paper, 3)).toEqual({ form: 3, line: 9 });
    expect(straddled(lastPrintedOn(paper, lastInkedForm(paper) ?? to.form) ?? to, to,
      machine.printer.tape), 'crossed at 57 and 60, sensed at neither')
      .toEqual([{ line: 57, channel: 9 }, { line: 60, channel: 12 }]);
    expect(carriage.channel9).toBe(false);
    expect(carriage.channel12).toBe(false);

    // ═══ §13 criterion 16 — the Selectric log as the drawn form renders it ═════════════════════
    const typed = renderSelectric(state.console,
      { matrix: 'indent', marks: 'render', spacing: 'render' });
    const rows = typed.split('\n');
    expect(state.console.map((l) => l.id)).toEqual(['S', 'S', 'D', 'D', 'S', 'A', 'S', 'S']);
    expect(rows.filter((r) => r.startsWith(`${AT_35}S `)),
      'STOP, the DISPLAY, ALTER and RUN turns — any change of the setting types one — and the '
      + 'programmed halt, which types the same Normal Stop line (S223-2648 p.6)').
      toHaveLength(5);
    expect(rows.indexOf(D_DATA), 'the data line follows its address line')
      .toBe(rows.indexOf(D_ADDRESS) + 1);
    expect(rows).toContain(A_LINE);

    // ═══ §1 step 14 — INQUIRY REQUEST, the hold, RELEASE, and the I line that does not come ════
    expect(session.held).toBe(false);
    session.request();
    expect(session.held, '§6.6’s latch is the SESSION’s, never the device’s').toBe(true);
    expect(machine.console.pendingRequest, 'io.md §8 step 1 sets the 1411 latch too').toBe(true);
    expect(session.pending?.id).toBe('I');
    expect(session.pending?.column).toBe(30);
    expect(frame.focus).toBe(3);
    session.keyboard.pressWordMark();
    for (const glyph of 'HI') expect(session.keyboard.press(glyph)).toBe(true);
    session.release();
    expect(session.held).toBe(false);
    expect(machine.console.entry)
      .toEqual({ text: 'HI', wordMarks: [true, false], ending: 'release' });
    // THE CORRECTION. §1 step 14 assumed a program that reads the console; this one does not.
    expect(generated.source, 'the RPG generator emits no RCP for this specification')
      .not.toContain('RCP');
    expect(machine.snapshot().console.filter((l) => l.id === 'I'),
      'no I line: it types inside read() (console1415.ts:311-313) and no RCP ever executes')
      .toEqual([]);
    expect(machine.snapshot().console, 'RELEASE puts nothing on the paper')
      .toHaveLength(state.console.length);

    // THE POSITIVE, on a second machine in this same case: one hand-planted `M %T0 00500 R` — RCP,
    // io.md §8 Figure 44 — with the GM-WM step 5 requires just past the operator's field.
    const inquiry = desk();
    const RCP = 'M%T000500R';
    [...RCP].forEach((glyph, i) => inquiry.machine.storage.setChar(300 + i, code(glyph), i === 0));
    inquiry.machine.storage.setWm(300 + RCP.length, true);
    inquiry.machine.storage.setChar(502, code('⧧'), true);
    inquiry.machine.addressSet(300);
    inquiry.session.request();
    inquiry.session.keyboard.pressWordMark();
    for (const glyph of 'HI') expect(inquiry.session.keyboard.press(glyph)).toBe(true);
    inquiry.session.release();
    expect(inquiry.machine.step(), 'the read services the request').toBeUndefined();
    const line = inquiry.machine.snapshot().console.filter((l) => l.id === 'I');
    expect(line, 'ONE I line, typed by the program’s RCP and not by RELEASE').toHaveLength(1);
    expect(line[0]?.text).toBe('HI');
    expect(line[0]?.wordMarks).toEqual([true, false]);
    expect(line[0]?.matrixPos, '§2’s table: Console Inquiry prints at 30').toBe(30);
    expect(renderSelectric(inquiry.machine.snapshot().console,
      { matrix: 'indent', marks: 'render', spacing: 'render' })).toContain(`I H${WM}I`);
    expect(inquiry.session.pending, 'the pending row clears once the machine has typed')
      .toBeUndefined();
  });
});
