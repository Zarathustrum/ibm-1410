// Tier 2 — the 1415 console station's DOM-FREE half: the six-detent rotary, the keyboard lock, the
// display/alter dialogue, the commit rule and the inquiry hold (plan §4.6-§4.8, §6.2-§6.6,
// §11 wave 4 (a)-(d) and (g), §12.1 T2, §13 criteria 10 and 11).
//
// WHICH MACHINE: the IBM 1415 Console on a 1410 — its MODE rotary (RUN · ADDRESS SET · DISPLAY ·
// I/E CYCLE · ALTER · C.E., six positions 60° apart, A22-0526-3 Fig.47 p.49; S223-2648 Fig.2 p.7),
// its modified-Selectric keyboard with a real WORD MARK key and NO backspace (Fig.43 p.47;
// S223-2648 p.78), and the operator dialogue of A22-0526-3 pp.50-51. Not a 1401: the 1410 has no
// address-dial rotary switches, which is why the address is TYPED here and nowhere selected.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · IT CONSTRUCTS NO VIEW and never calls `mountConsole`. `environment: 'node'` (vite.config.ts:
//    8-11) and §2.2's refusal of jsdom mean `document` does not exist. The three view modules it
//    touches are read for EXPORTED DATA (`keysView`'s and `keyboardView`'s drawn-label tables,
//    which those files build from plain values at import time and never as a node — §3.3) or as
//    SOURCE TEXT (`logView`'s option triple). Nothing below calls a view constructor.
//  · IT REIMPLEMENTS NOTHING. `keyed()` is imported from the byte-frozen `internals/controls.ts`
//    (§3.6) and the keystrokes from `formats/loader.ts` — one `^` parser in the project.
//  · IT CHANGES NO CORE LINE. Six detents against `machine.ts:38`'s four-member `ConsoleMode` cost
//    zero, because DISPLAY and C.E. route through `machine.stop()`, which IS `{ fieldLine('S') }`
//    at `machine.ts:380`. The gate is `git diff --stat -- src/core/machine.ts` empty (criterion 10).
//
// ONE AMBIGUITY RESOLVED: §11 wave 4 (d) says to read the device's inquiry latch off
// `machine.snapshot()`. It is NOT there — `MachineState.channel1` is `ChannelStatus & {interlock}`,
// and `ChannelStatus` is io.md §5's six indicators (types.ts:226-229). It is read below where a
// program reads it, `machine.channel1.inquiryRequest` (channel.ts:221), and at its source
// `machine.console.pendingRequest` (console1415.ts:148).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { CONSOLE_LINE_LENGTH, createMachine, type Machine } from '../src/core/machine.js';
import { formatPrintout } from '../src/core/printout.js';
import { BLANK_WITH_C } from '../src/core/registers.js';
import { BCD6, type Addr, type ConsoleLine } from '../src/core/types.js';
import { BOOTSTRAP_KEYSTROKES } from '../src/formats/loader.js';
import { keyed } from '../src/ui/internals/controls.js';
import { modeNote } from '../src/ui/internals/mount.js';
import {
  DUAL_LEGEND_CAPTION, KEY_ROWS, NO_BACKSPACE_NOTE, WORD_MARK_CHORD,
} from '../src/ui/period/console/keyboardView.js';
import {
  CONSOLE_KEYS, CONSOLE_LIGHTS, INERT_KEYS, LIT_CONSTANTS,
} from '../src/ui/period/console/keysView.js';
import { renderSelectric } from '../src/ui/period/console/selectric.js';
import {
  ALTER_ENTRY_COMMITS_ON_THE_NEXT_CONTROL_ACTION, ALTER_MUST_FOLLOW_A_DISPLAY, ENTRY_DISCARDED,
  INTERACTIVE_INQUIRY_HOLDS_THE_UI_RUN_LOOP, PROCESSOR_IS_NOT_AT_RUN,
  ROTARY_ANGLE, ROTARY_DETENTS_ARE_60_DEGREES_APART, UI_ONLY_DETENTS_TYPE_S_THROUGH_STOP,
  createConsoleSession, type ConsoleSession, type PeriodMode,
} from '../src/ui/period/console/session.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** The six detents, in the clock order §3 publishes: 12 / 2 / 4 / 6 / 8 / 10 o'clock. */
const DETENTS: readonly PeriodMode[] =
  ['run', 'display', 'alter', 'ce', 'ieCycle', 'addressSet'];

interface Rig {
  readonly machine: Machine;
  readonly session: ConsoleSession;
  /** The `run` / `halt` / `focus` hooks main.ts supplies, here as call counters. */
  readonly hooks: { run: number; halt: number; focus: number };
}

function rig(): Rig {
  const machine = createMachine({ size: 10_000 });
  const hooks = { run: 0, halt: 0, focus: 0 };
  const session = createConsoleSession(machine, {
    run: () => { hooks.run += 1; }, halt: () => { hooks.halt += 1; },
    focus: () => { hooks.focus += 1; },
  });
  return { machine, session, hooks };
}

const log = (m: Machine): readonly ConsoleLine[] => m.snapshot().console;
const ids = (m: Machine): readonly (string | null)[] => log(m).map((l) => l.id);

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

/** `text` at 00000, word-marked on its first character, with a stop mark just past its end — so a
 *  DISPLAY of 00000 prints exactly `text.length` positions (machine.ts:392-411). */
function plant(m: Machine, text: string): void {
  [...text].forEach((glyph, i) => m.storage.setChar(i, code(glyph), i === 0));
  m.storage.setWm(text.length, true);
}

const glyphs = (m: Machine, at: Addr, n: number): string =>
  [...Array(n).keys()].map((i) => glyphOf(m.storage.read(at + i) & BCD6)).join('');

/** §6.3 steps 2-5: turn to DISPLAY, START, key `00000` — leaving a displayed span behind. */
function displayed(r: Rig): Rig {
  r.session.turn('display');
  r.session.startKey();
  for (const digit of '00000') r.session.keyboard.press(digit);
  return r;
}

/** §6.3 steps 6-8 on a 3-position span: an ALTER of 00000 with `text` typed and NOT committed. */
function altering(text: string): Rig {
  const r = rig();
  plant(r.machine, 'ABC');
  displayed(r);
  r.session.turn('alter');
  r.session.startKey();
  for (const glyph of text) r.session.keyboard.press(glyph);
  return r;
}

/** A file with its comments removed, so a header may name what the code may not set. Line
 *  comments come out FIRST: a `src/ui` glob written in prose carries a doubled star that a
 *  block-comment regex would read as an opener (see test/period-keydown-ownership.test.ts). */
const codeOf = (path: string): string =>
  readFileSync(join(REPO_ROOT, path), 'utf8')
    .replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');

// ═══ (a) THE ROTARY ═══════════════════════════════════════════════════════════════════════════

describe('the six-detent rotary over all 30 ordered pairs (plan §6.2, §13 criterion 10)', () => {
  it('types ONE S per real turn and ZERO for a turn to its own detent, halts, and never '
    + 'setModes to DISPLAY or C.E.', () => {
    let real = 0;
    for (const from of DETENTS) {
      for (const to of DETENTS) {
        const { machine, session, hooks } = rig();
        if (from !== 'run') session.turn(from);
        const before = log(machine).length;
        const [halts, mode] = [hooks.halt, machine.mode];
        session.turn(to);
        const typed = log(machine).slice(before);
        if (to === from) {
          expect(typed, `${from} → ${to} is not a change`).toEqual([]);
          expect(hooks.halt, `${from} → ${to} does not stop the machine`).toBe(halts);
        } else {
          real += 1;
          expect(typed.map((l) => l.id), `${from} → ${to}`).toEqual(['S']);
          expect(hooks.halt - halts, `${from} → ${to} STOPS, not only prints (p.50)`).toBe(1);
        }
        // DISPLAY and C.E. are the two detents the four-member façade cannot name (machine.ts:38);
        // they route through machine.stop() and never through setMode, which is what makes six
        // detents cost zero core lines.
        if (to === 'display' || to === 'ce') {
          expect(machine.mode, `${from} → ${to} leaves machine.mode alone`).toBe(mode);
        }
        expect(session.detent, `${from} → ${to}`).toBe(to);
      }
    }
    expect(real, 'six detents, thirty ordered pairs').toBe(30);
  });

  it('types TWO S lines on RUN → DISPLAY → RUN — the case machine.ts:325 would swallow', () => {
    // `if (next === machine.mode) return;`. A turn to DISPLAY leaves machine.mode === 'run', so a
    // turn BACK dispatched on the façade's mode would print nothing and the log would lose a line.
    const { machine, session } = rig();
    session.turn('display');
    session.turn('run');
    expect(ids(machine)).toEqual(['S', 'S']);
    expect(machine.mode).toBe('run');
    expect(session.detent).toBe('run');
  });

  it('with the run latch ON, a turn to DISPLAY types one S AND halts (criterion 10)', () => {
    const { machine, session, hooks } = rig();
    session.startKey();
    expect(hooks.run, 'START in the RUN detent is the latch main.ts owns').toBe(1);
    expect(log(machine), 'and it types nothing').toEqual([]);
    session.turn('display');
    expect(ids(machine)).toEqual(['S']);
    expect(hooks.halt, 'A22-0526-3 p.50 is about a STOP, not only a print-out').toBe(1);
  });

  it('pins the wave’s session-side §15 constants and the six 60° detent angles', () => {
    expect(ROTARY_DETENTS_ARE_60_DEGREES_APART).toBe(true);
    expect(UI_ONLY_DETENTS_TYPE_S_THROUGH_STOP).toBe(true);
    expect(ALTER_ENTRY_COMMITS_ON_THE_NEXT_CONTROL_ACTION).toBe(true);
    expect(INTERACTIVE_INQUIRY_HOLDS_THE_UI_RUN_LOOP).toBe(true);
    expect(ROTARY_ANGLE).toEqual(
      { run: 0, display: 60, alter: 120, ce: 180, ieCycle: 240, addressSet: 300 });
    expect([...DETENTS].sort()).toEqual(Object.keys(ROTARY_ANGLE).sort());
    expect(DETENTS.map((d) => ROTARY_ANGLE[d]).sort((a, b) => a - b))
      .toEqual([0, 60, 120, 180, 240, 300]);
  });
});

// ═══ (b) THE DIALOGUE, IN THE MANUAL'S ORDER ══════════════════════════════════════════════════

describe('the display/alter dialogue in the manual’s order (A22-0526-3 p.51; plan §6.3)', () => {
  it('steps 1-3: STOP types S, the turn to DISPLAY a second, START unlocks and types NOTHING', () => {
    const { machine, session, hooks } = rig();
    session.stopKey();
    expect(ids(machine)).toEqual(['S']);
    session.turn('display');
    expect(ids(machine)).toEqual(['S', 'S']);
    const before = log(machine).length;
    session.startKey();
    expect(session.keyboard.state).toBe('address');
    expect(session.pending?.id).toBe('D');
    expect(session.pending?.column, '§2’s layout table: the address line prints at 35').toBe(35);
    expect(session.pending?.text).toBe('');
    expect(hooks.focus, 'unlocking MOVES FOCUS to the console region (§6.5 ruling 5)').toBe(1);
    expect(log(machine), 'for the first five steps the session touches no façade')
      .toHaveLength(before);
  });

  it('refuses a keystroke BEFORE START — the lock is the manual’s own order', () => {
    const { machine, session } = rig();
    session.turn('display');
    const before = log(machine).length;
    expect(session.keyboard.state).toBe('locked');
    expect(session.keyboard.press('0')).toBe(false);
    expect(session.keyboard.typed).toBe('');
    expect(log(machine)).toHaveLength(before);
  });

  it('steps 4-5: auto-locks on the fifth digit and types EXACTLY machine.display()’s two lines', () => {
    const { machine, session } = rig();
    session.turn('display');
    session.startKey();
    const before = log(machine).length;
    for (const digit of '00000') expect(session.keyboard.press(digit)).toBe(true);
    expect(session.keyboard.state, '"keyboard auto-locks, carrier returns, line spaces"')
      .toBe('locked');
    expect(session.pending, 'the pending row is replaced by what the machine typed').toBeUndefined();
    // A TWIN driven through the façade, so the comparison is against the shipped
    // machine.ts:392-411 and not a description of it. `toEqual` covers all six `ConsoleLine`
    // fields — id, text, wordMarks, underline, spacingBefore, matrixPos.
    const twin = createMachine({ size: 10_000 });
    twin.keyAddress('00000');
    twin.display();
    expect(log(machine).slice(before)).toEqual(twin.snapshot().console);
  });

  it('refuses a sixth digit, and runs a cleared display to the 80-position line', () => {
    const { machine, session } = rig();
    session.turn('display');
    session.startKey();
    for (const digit of '00000') session.keyboard.press(digit);
    expect(session.keyboard.press('0'), 'a press against a locked keyboard').toBe(false);
    // machine.ts:100 — "there are no word marks, so an ALTER of 00000-00011 runs to the end of the
    // printer line". Twelve is the length of the hand-keyed bootstrap, not of the display.
    expect(log(machine).at(-1)?.id).toBe('D');
    expect(log(machine).at(-1)?.text).toHaveLength(CONSOLE_LINE_LENGTH);
  });

  it('REFUSES a five-character non-numeric address: the row stays, the field reopens, it says why',
    () => {
      // `press()` accepts any of the 64, so `ABCDE` is reachable from the drawn keyboard, while
      // `machine.keyAddress` THROWS on anything but five digits inside installed storage
      // (machine.ts:392-399). `onFive` guards on the same rule — and USED TO CLEAR `pendingId`
      // BEFORE THE GUARD, so the pending row came off the form exactly as a SUCCESSFUL display
      // takes it off, on a locked keyboard with the paper untouched: a mistyped address was
      // indistinguishable from a displayed one. A refused address is a RE-KEY, not a commit.
      const { machine, session, hooks } = rig();
      session.turn('display');
      session.startKey();
      const before = log(machine).length;
      const focused = hooks.focus;
      for (const glyph of 'ABCDE') expect(session.keyboard.press(glyph)).toBe(true);
      expect(session.pending?.id, 'the row is STILL UP — nothing was displayed').toBe('D');
      expect(session.pending?.text, 'and it is empty, because the field opened again').toBe('');
      expect(session.keyboard.state, 'the same field, at the same limit').toBe('address');
      expect(hooks.focus - focused, 'and the keyboard has the focus back (§6.5 ruling 5)').toBe(1);
      expect(session.notice, 'the refusal is DRAWN, not swallowed').toContain('ABCDE');
      expect(session.notice).toContain('refused');
      expect(log(machine), 'the paper is untouched').toHaveLength(before);
      expect(machine.keyedAddress, 'and so is the machine').toBe(0);
      // The re-key goes through, which is what makes it a correction rather than a dead end.
      for (const digit of '00000') expect(session.keyboard.press(digit)).toBe(true);
      expect(log(machine).slice(before).map((l) => l.id)).toEqual(['D', 'D']);
      expect(session.notice, 'and the notice goes with the successful display').toBeUndefined();
      expect(session.pending, 'the row is replaced by what the machine typed').toBeUndefined();
    });

  it('REFUSES every address at or past installed storage the same way (10000 on a 10 000)', () => {
    // The second half of the same guard, and the reachable one: `main.ts` builds `{size: 10_000}`,
    // so 10000-99999 are five real digits the keyboard takes and the machine cannot.
    const { machine, session } = rig();
    session.turn('display');
    session.startKey();
    const before = log(machine).length;
    for (const digit of '10000') expect(session.keyboard.press(digit)).toBe(true);
    expect(session.pending?.id).toBe('D');
    expect(session.keyboard.state).toBe('address');
    expect(session.notice).toContain('10000');
    expect(log(machine)).toHaveLength(before);
    expect(machine.keyedAddress).toBe(0);
  });

  it('reports START in ALTER with nothing displayed, on all three routes in (§4)', () => {
    // `startKey` fell off the end returning `void` while `keysView.ts` captions START as the key
    // that unlocks the keyboard in DISPLAY or ALTER. Three routes reach it, and the third is the
    // one an operator hits by accident: after a SUCCESSFUL alter, because `commit()` clears the
    // span and `machine.alter` clears the façade's `displayed`.
    const fresh = rig();
    fresh.session.turn('alter');
    const before = log(fresh.machine).length;
    fresh.session.startKey();
    expect(fresh.session.keyboard.state, 'no span, so START does not unlock').toBe('locked');
    expect(fresh.session.notice, 'and it SAYS so').toBe(ALTER_MUST_FOLLOW_A_DISPLAY);
    expect(fresh.session.notice).toContain('must follow a display');
    expect(log(fresh.machine), 'nothing reaches the façade').toHaveLength(before);
    expect(fresh.hooks.focus, 'and nothing takes the focus').toBe(0);

    const refused = rig();                       // route 2: an address the machine refused
    refused.session.turn('display');
    refused.session.startKey();
    for (const glyph of 'ABCDE') refused.session.keyboard.press(glyph);
    refused.session.turn('alter');
    refused.session.startKey();
    expect(refused.session.keyboard.state).toBe('locked');
    expect(refused.session.notice).toBe(ALTER_MUST_FOLLOW_A_DISPLAY);

    const again = altering('XYZ');               // route 3: the span filled and committed
    expect(ids(again.machine).at(-1), 'the alter went through').toBe('A');
    again.session.startKey();
    expect(again.session.keyboard.state, 'a second alter needs a second display').toBe('locked');
    expect(again.session.notice).toBe(ALTER_MUST_FOLLOW_A_DISPLAY);
  });

  it('steps 6-8: the turn to ALTER types the third S, START unlocks at 30, the row echoes', () => {
    const r = rig();
    plant(r.machine, 'ABC');
    r.session.stopKey();
    displayed(r);
    r.session.turn('alter');
    expect(ids(r.machine).filter((id) => id === 'S'), 'STOP, the DISPLAY turn, the ALTER turn')
      .toHaveLength(3);
    const before = log(r.machine).length;
    r.session.startKey();
    expect(r.session.keyboard.state).toBe('data');
    expect(r.session.pending?.id).toBe('A');
    expect(r.session.pending?.column, '§2’s table: alter data prints at 30').toBe(30);
    expect(r.hooks.focus, 'START in DISPLAY and START in ALTER both unlock').toBe(2);
    r.session.keyboard.pressWordMark();
    r.session.keyboard.press('X');
    r.session.keyboard.press('Y');
    expect(r.session.pending?.text).toBe('XY');
    expect(r.session.pending?.wordMarks).toEqual([true, false]);
    expect(log(r.machine), 'nothing is on the paper until it commits').toHaveLength(before);
  });

  it('refuses an ALTER that follows no display, and types NOTHING (§4 "must follow a display")', () => {
    const { machine, session } = rig();
    session.turn('alter');
    const before = log(machine).length;
    session.startKey();
    expect(session.keyboard.state, 'no span, so START does not unlock').toBe('locked');
    expect(session.keyboard.press('X')).toBe(false);
    expect(session.pending).toBeUndefined();
    session.computerReset();
    // Asserted on the LOG'S LENGTH, not on a caught exception: `machine.alter` throws at
    // machine.ts:425 when `displayed` is undefined and the session never reaches it.
    expect(log(machine)).toHaveLength(before);
  });

  it('step 9: COMPUTER RESET commits — the A line carries its mark and STORAGE holds the line', () => {
    const r = altering('');
    r.session.keyboard.pressWordMark();
    r.session.keyboard.press('X');
    r.session.keyboard.press('Y');
    r.session.computerReset();
    const a = log(r.machine).at(-1);
    expect(a?.id).toBe('A');
    expect(a?.text).toBe('XY');
    expect(a?.wordMarks).toEqual([true, false]);
    expect(r.session.pending).toBeUndefined();
    expect(glyphs(r.machine, 0, 3), 'two positions written, the third left alone').toBe('XYC');
    expect(r.machine.storage.wm(0), 'the WORD MARK key re-entered it').toBe(true);
    expect(r.machine.storage.wm(1)).toBe(false);
  });

  it('loses a displayed word mark that is NOT re-entered — on STORAGE (criterion 11)', () => {
    // software.md §10.8: "any previously displayed word mark must be re-entered into storage".
    // machine.ts:424-442 calls setChar with the CALLER's flag and never with what core held.
    const r = altering('');
    const data = log(r.machine).filter((l) => l.id === 'D').at(-1);      // the D DATA line
    expect(data?.wordMarks?.[0], 'the display printed the mark').toBe(true);
    expect(r.machine.storage.wm(0)).toBe(true);
    for (const glyph of 'XY') r.session.keyboard.press(glyph);   // no WORD MARK key pressed
    r.session.computerReset();
    expect(glyphs(r.machine, 0, 2)).toBe('XY');
    expect(r.machine.storage.wm(0), 'not re-entered is GONE').toBe(false);
  });

  it('commits on the span filling, and on START, a rotary turn and PROGRAM RESET (§6.4)', () => {
    const filled = altering('XYZ');          // the auto-lock arm: three glyphs into a 3-wide span
    expect(filled.session.pending).toBeUndefined();
    expect(ids(filled.machine).at(-1)).toBe('A');
    expect(glyphs(filled.machine, 0, 3)).toBe('XYZ');

    const actions: readonly (readonly [string, (s: ConsoleSession) => void])[] = [
      ['START', (s) => { s.startKey(); }],
      ['a rotary turn', (s) => { s.turn('run'); }],
      ['PROGRAM RESET', (s) => { s.programReset(); }],
    ];
    for (const [name, act] of actions) {
      const r = altering('XY');
      expect(r.session.pending?.text, name).toBe('XY');
      act(r.session);
      expect(r.session.pending, name).toBeUndefined();
      expect(glyphs(r.machine, 0, 3), name).toBe('XYC');
    }
  });

  it('step 10: the turn to RUN types the fourth S, and START in RUN runs without typing', () => {
    const { machine, session, hooks } = rig();
    session.stopKey();                                             // 1
    session.turn('display');                                       // 2
    session.startKey();                                            // 3
    for (const digit of '00000') session.keyboard.press(digit);    // 4-5
    session.turn('alter');                                         // 6
    session.startKey();                                            // 7
    session.keyboard.pressWordMark();
    session.keyboard.press('X');                                   // 8
    session.computerReset();                                       // 9
    session.turn('run');                                           // 10
    expect(ids(machine).filter((id) => id === 'S')).toHaveLength(4);
    expect(machine.mode).toBe('run');
    const before = log(machine).length;
    session.startKey();
    expect(hooks.run, 'main.ts’s `() => { running = true; }` — the pair controls.ts:35-40 defines')
      .toBe(1);
    expect(log(machine)).toHaveLength(before);
  });
});

// ═══ (b′) INQ CAN, THE ONLY CORRECTION THIS KEYBOARD HAS ══════════════════════════════════════

describe('INQ CAN against a keyed address or alter line (io.md §8 step 6; §6.5)', () => {
  // `session.cancel()` ran `machine.console.supply(keyboard.take('cancel'))` WHATEVER was open, so
  // INQ CAN mid-dialogue queued a `{ending:'cancel'}` entry on `Console1415` that a later program
  // read consumed as Figure 45's Condition, left the pending row drawn with the typo in it, and
  // locked the keyboard — the next keystroke returning false in silence. There is no backspace on
  // this machine (S223-2648 p.78), so INQ CAN is the whole of the operator's correction and it has
  // to leave a field they can retype into.

  it('mid-DISPLAY: discards the typed address, reopens the SAME field, queues nothing', () => {
    const { machine, session, hooks } = rig();
    session.turn('display');
    session.startKey();
    for (const glyph of '0O0') expect(session.keyboard.press(glyph)).toBe(true);
    expect(session.pending?.text, 'the letter O for a zero — the typo a person makes').toBe('0O0');
    const focused = hooks.focus;
    const before = log(machine).length;

    session.cancel();

    expect(machine.console.entry, 'the device is not in this dialogue at all').toBeUndefined();
    expect(session.keyboard.state, 'unlocked, at the same limit and the same callback')
      .toBe('address');
    expect(session.keyboard.typed, 'and the line is gone — that IS the discard').toBe('');
    expect(session.pending?.id, 'the row stays up: the field is open, not finished').toBe('D');
    expect(session.pending?.text).toBe('');
    expect(hooks.focus - focused, 'the keyboard takes the focus back').toBe(1);
    expect(session.notice).toBe(ENTRY_DISCARDED);
    expect(log(machine), 'nothing was typed on the paper').toHaveLength(before);

    // The retype is a REAL retype: five digits still display, which is what the drawn sentence
    // "INQ CAN discards the whole entry — it is the only correction this keyboard has" promises.
    for (const digit of '00000') expect(session.keyboard.press(digit)).toBe(true);
    expect(log(machine).slice(before).map((l) => l.id)).toEqual(['D', 'D']);
    expect(machine.keyedAddress).toBe(0);
  });

  it('mid-ALTER: the typo never reaches storage OR the paper on the next control action', () => {
    // THE ONE THAT MATTERS. `commit()` reads `keyboard.typed`, so a cancelled `XY` was still the
    // keyboard's line when the next control action fired: `machine.alter('XY', …)` ran, `A XY`
    // went on the paper and X and Y went into core.
    const r = altering('XY');
    expect(r.session.pending?.text).toBe('XY');
    const coreBefore = r.machine.storage.dump();

    r.session.cancel();

    expect(r.machine.console.entry, 'nothing is queued for the program to read').toBeUndefined();
    expect(r.session.keyboard.state, 'the alter field is open again at the same span').toBe('data');
    expect(r.session.keyboard.typed).toBe('');
    expect(r.session.pending?.id).toBe('A');
    expect(r.session.pending?.text).toBe('');
    expect(r.session.notice).toBe(ENTRY_DISCARDED);

    r.session.computerReset();                   // the next control action, and the commit rule

    expect(glyphs(r.machine, 0, 3), 'ABC is what was planted, and ABC is what is there')
      .toBe('ABC');
    expect(r.machine.storage.dump(), 'core is byte-identical').toEqual(coreBefore);
    const a = log(r.machine).filter((l) => l.id === 'A');
    expect(a.map((l) => l.text), 'the only A line is the empty one START itself asked for')
      .toEqual(['']);
    expect(a.flatMap((l) => [...(l.wordMarks ?? [])]), 'and it carries no mark').toEqual([]);
  });

  it('mid-ALTER then retyped: the SECOND line is the one that commits', () => {
    const r = altering('XY');
    r.session.cancel();
    for (const glyph of 'PQ') expect(r.session.keyboard.press(glyph), glyph).toBe(true);
    r.session.computerReset();
    expect(glyphs(r.machine, 0, 3), 'the retype, not the discarded line').toBe('PQC');
    expect(log(r.machine).at(-1)?.text).toBe('PQ');
  });
});

// ═══ (c) THE KEYBOARD AGAINST THE FROZEN PARSER ═══════════════════════════════════════════════

describe('ConsoleKeyboard against controls.ts’s frozen keyed() (plan §4.7, §6.5)', () => {
  // `^^A` and `^A^^B` are the NON-REPEATING cases: "word-mark and space keys are non-repeating"
  // (S223-2648 p.78 [verified] — the one verified behaviour of this keyboard). A second
  // `pressWordMark()` on an already-marked position is a no-op, and `keyed()` folds a doubled `^`
  // the same way, so the two sides agree without either knowing about the other.
  const CORPUS: readonly string[] =
    ['A', '^A', '^^A', 'AB', '^AB', 'A^BC', '^A^^B', '^A^B^C', 'ABC$%', '^AL%1000012$R', ''];

  it('take("release") agrees with the IMPORTED keyed() on a corpus of word-marked lines', () => {
    // `keyed` is imported from src/ui/internals/controls.ts, whose bytes are frozen at a SHA-256
    // literal (test/ui-controls-verbatim.test.ts). Reimplementing it here would be the project's
    // second `^` parser, free to drift from the one the internals tab ships.
    for (const caret of CORPUS) {
      const { session } = rig();
      session.request();                       // the inquiry unlock: 'data', 80 positions
      for (const ch of caret) {
        if (ch === '^') session.keyboard.pressWordMark();
        else expect(session.keyboard.press(ch), caret).toBe(true);
      }
      const taken = session.keyboard.take('release');
      const expected = keyed(caret);
      expect(taken.text, caret).toBe(expected.text);
      expect([...taken.wordMarks], caret).toEqual(expected.wordMarks);
      expect(taken.ending).toBe('release');
      expect(session.keyboard.typed, caret).toBe(expected.text);
    }
  });

  it('takes ONE mark from a doubled WORD MARK press — the key is non-repeating (p.78)', () => {
    const { session } = rig();
    session.request();
    session.keyboard.pressWordMark();
    session.keyboard.pressWordMark();
    session.keyboard.pressWordMark();
    session.keyboard.press('A');
    session.keyboard.press('B');
    expect(session.keyboard.typed, 'the WORD MARK key types no character of its own').toBe('AB');
    expect([...session.keyboard.wordMarks]).toEqual([true, false]);
    expect(session.keyboard.take('release').wordMarks.filter(Boolean)).toHaveLength(1);
  });

  it('refuses a glyph outside the 1415’s 64 without throwing (bcd.ts:148)', () => {
    const { session } = rig();
    session.request();
    expect(session.keyboard.press('~')).toBe(false);
    expect(session.keyboard.typed).toBe('');
    expect(session.keyboard.press('^'), 'the ^ convention is a TEXT BOX’s, not a keyboard’s')
      .toBe(false);
    expect(session.keyboard.press('A')).toBe(true);
    expect(session.keyboard.typed).toBe('A');
  });

  it('keys all twelve bootstrap characters one at a time, marked at positions 1 and 11', () => {
    const { text, wordMarks } = BOOTSTRAP_KEYSTROKES;
    const r = rig();
    // THE RETURN, not the absence of output: the deck box has nothing else to branch on, and a
    // `void` signature here is what shipped a button that printed "keyed at the 1415" over a
    // keyboard that had refused all twelve characters.
    expect(r.session.keyBootstrap(text, wordMarks), 'REFUSED, and it says so').toBe(false);
    expect(r.session.keyboard.state, 'it requires the data state — ALTER, then START').toBe('locked');
    expect(r.session.keyboard.typed, 'refused outside it, and nothing changes').toBe('');

    displayed(r);                              // the cleared 80-position span holds all twelve
    r.session.turn('alter');
    r.session.startKey();
    expect(r.session.keyboard.state).toBe('data');
    expect(r.session.keyBootstrap(text, wordMarks), 'and TRUE once the keyboard is open').toBe(true);
    expect(r.session.keyboard.typed).toBe('AL%1000012$R');
    expect([...r.session.keyboard.wordMarks]).toEqual([...wordMarks]);
    expect(r.session.keyboard.wordMarks.filter(Boolean), 'the L at 00001 and the R at 00011')
      .toHaveLength(2);
    expect(r.session.keyboard.wordMarks[1]).toBe(true);
    expect(r.session.keyboard.wordMarks[11]).toBe(true);
  });

  it('refuses from a LOCKED keyboard and leaves the log and core byte-identical', () => {
    // The shipped defect, pinned: `keyBootstrap` returned `void`, so `deckBoxView.ts`'s click
    // handler wrote its success note unconditionally and the operator followed instructions for a
    // load that never happened. The guard itself is CORRECT and stays — §6.5 ruling 3 forbids a
    // keystroke reaching `press` from outside the console region, and the keyboard is open only
    // after START in the DISPLAY or the ALTER detent. What is asserted here is that the refusal is
    // VISIBLE to the caller and INVISIBLE on the machine.
    const { text, wordMarks } = BOOTSTRAP_KEYSTROKES;
    const r = rig();
    plant(r.machine, 'ABC');
    const logBefore = JSON.stringify(log(r.machine));
    const coreBefore = r.machine.storage.dump();
    expect(r.session.detent, 'RUN, nothing pressed — the state the desk opens in').toBe('run');
    expect(r.session.keyboard.state).toBe('locked');

    expect(r.session.keyBootstrap(text, wordMarks), 'false is the whole point').toBe(false);

    expect(r.session.keyboard.typed, 'not one of the twelve went in').toBe('');
    expect(r.session.keyboard.state, 'and the guard did not open it').toBe('locked');
    expect(JSON.stringify(log(r.machine)), 'the Selectric printed nothing').toBe(logBefore);
    expect(r.machine.storage.dump(), 'and no character reached core').toEqual(coreBefore);
  });
});

// ═══ (d) THE INQUIRY HOLD ═════════════════════════════════════════════════════════════════════

describe('the inquiry hold — the SESSION’s latch, never the device’s (plan §6.6)', () => {
  it('REQUEST holds, unlocks at column 30 with a pending I, focuses, and sets the 1411 latch', () => {
    const { machine, session, hooks } = rig();
    expect(session.held).toBe(false);
    expect(machine.channel1.inquiryRequest).toBe(false);
    session.request();
    expect(session.held).toBe(true);
    expect(session.keyboard.state).toBe('data');
    expect(session.pending?.id).toBe('I');
    expect(session.pending?.column).toBe(30);
    expect(hooks.focus).toBe(1);
    expect(machine.console.pendingRequest, 'io.md §8 step 1 — the latch `J iiiii Q` tests')
      .toBe(true);
    expect(machine.channel1.inquiryRequest).toBe(true);
  });

  it('RELEASE clears the hold at once and supplies the entry — the I line waits for the RCP', () => {
    const { machine, session } = rig();
    session.request();
    for (const glyph of 'HI') session.keyboard.press(glyph);
    const before = log(machine).length;
    session.release();
    expect(session.held).toBe(false);
    expect(machine.console.entry)
      .toEqual({ text: 'HI', wordMarks: [false, false], ending: 'release' });
    expect(log(machine), 'read() types the I line at console1415.ts:311-313, not RELEASE')
      .toHaveLength(before);
    expect(session.pending?.id, 'the typed row stays on the form until the machine has spoken')
      .toBe('I');
  });

  it('INQ CAN clears the hold too, and supplies the cancelled entry (io.md §8 step 6)', () => {
    const { machine, session } = rig();
    session.request();
    session.keyboard.press('A');
    session.cancel();
    expect(session.held).toBe(false);
    expect(machine.console.entry?.ending).toBe('cancel');
  });

  it('commits a pending ALTER before the inquiry row opens — REQUEST is a control action', () => {
    // §6.4's commit rule and §6.6's hold meet here: INQUIRY REQUEST is the fifth thing the operator
    // can do to a half-typed ALTER, and there is ONE keyboard, so the entry it is holding has to
    // reach storage before the inquiry takes the carrier.
    const r = altering('XY');
    expect(r.session.pending?.id).toBe('A');
    r.session.request();
    expect(log(r.machine).at(-1)?.id, 'the A line is on the paper before the I row opens').toBe('A');
    expect(log(r.machine).at(-1)?.text).toBe('XY');
    expect(glyphs(r.machine, 0, 3), 'and its characters are in storage').toBe('XYC');
    expect(r.session.held).toBe(true);
    expect(r.session.pending?.id).toBe('I');
    expect(r.session.pending?.text, 'the inquiry row starts empty').toBe('');
    expect(r.session.keyboard.state).toBe('data');
  });

  it('cancels an OPEN inquiry entry on any other control action, so the frame cannot stall', () => {
    // An operator who presses INQUIRY REQUEST and then reaches for START or the rotary has
    // abandoned the entry; ending it exactly as INQ CAN would (io.md §8 step 6) is the only reading
    // that leaves no way to strand `held` on with the keyboard unlocked and the frame stopped.
    // The last column is the DEVICE's latch, and it is the device's business either way: it
    // survives START and a rotary turn, because `Console1415` clears `pendingRequest` only inside
    // `precheck()` (:199) and `read()` (:290, :316); it is false after either reset, because core's
    // own `machine.programReset()` drops the console inquiry latch (A22-0526-3 p.52). The session
    // touches it in neither case — the frame cannot stall because main.ts's gate reads `held`.
    const actions: readonly (readonly [string, (s: ConsoleSession) => void,
      number, number, boolean])[] = [
      ['START', (s) => { s.startKey(); }, 1, 0, true],
      ['a rotary turn', (s) => { s.turn('display'); }, 0, 1, true],
      ['COMPUTER RESET', (s) => { s.computerReset(); }, 0, 0, false],
      ['PROGRAM RESET', (s) => { s.programReset(); }, 0, 0, false],
    ];
    for (const [name, act, runs, halts, latch] of actions) {
      const { machine, session, hooks } = rig();
      session.request();
      for (const glyph of 'HI') session.keyboard.press(glyph);
      expect(session.held, name).toBe(true);
      act(session);
      expect(session.held, `${name} clears the hold`).toBe(false);
      expect(session.keyboard.state, `${name} locks the keyboard`).toBe('locked');
      expect(session.pending, `${name} clears the pending row`).toBeUndefined();
      expect(machine.console.entry?.ending, `${name} ends it as INQ CAN would`).toBe('cancel');
      expect(machine.console.pendingRequest, `${name} — the device latch is the DEVICE's`)
        .toBe(latch);
      expect(hooks.run, name).toBe(runs);
      expect(hooks.halt, name).toBe(halts);
    }
  });

  it('supplies NOTHING when a lever is pressed with no entry open (the phantom entry)', () => {
    // `supply()` had no guard on `pendingId`: a stray lever press on an idle desk handed the
    // device `{text:'',wordMarks:[],ending:'release'}` with NOTHING changed on screen — the lens
    // dark, `held` off, no row — and the program's next console read consumed that empty line
    // instead of reporting Figure 45's No Transfer. Both levers, both orders.
    for (const [name, act] of [
      ['INQUIRY RELEASE', (s: ConsoleSession) => { s.release(); }],
      ['INQ CAN', (s: ConsoleSession) => { s.cancel(); }],
    ] as const) {
      const { machine, session } = rig();
      expect(session.held, name).toBe(false);
      expect(session.pending, name).toBeUndefined();
      act(session);
      expect(machine.console.entry, `${name} queues NOTHING on the device`).toBeUndefined();
      expect(session.held, name).toBe(false);
      expect(session.pending, name).toBeUndefined();
      expect(session.keyboard.state, name).toBe('locked');
      expect(log(machine), name).toHaveLength(0);
    }
  });

  it('does not rewrite a RELEASED entry when INQ CAN is pressed after it', () => {
    // The other half of the same missing guard, and the worse half: INQ CAN after a CORRECT
    // INQUIRY RELEASE rewrote the queued entry's `ending` to 'cancel' while `session.pending`
    // returned a byte-identical row, so the form showed an intact released message the program
    // would receive as Figure 45's Condition. A released entry belongs to the device (§6.6).
    const { machine, session } = rig();
    session.request();
    for (const glyph of 'HI') session.keyboard.press(glyph);
    session.release();
    const supplied = { ...machine.console.entry };
    session.cancel();
    expect(machine.console.entry, 'still the released entry, ending and all').toEqual(supplied);
    expect(machine.console.entry?.ending).toBe('release');
    expect(session.pending?.id, 'and the row still waits for the program’s read').toBe('I');
    session.release();
    expect(machine.console.entry?.ending, 'a second RELEASE is the same non-event').toBe('release');
  });

  it('clears the hold on RELEASE even though the program NEVER reads', () => {
    // THE DISCRIMINATOR. `Console1415.pendingRequest` is cleared by the device inside precheck()
    // (:199) and read() (:290, :316) — neither of which runs on a program that never reads — so a
    // run loop gated on that flag deadlocks here. The hold is the session's own field.
    const { machine, session } = rig();
    session.request();
    session.keyboard.press('A');
    session.release();
    expect(session.held, 'the frame may advance again').toBe(false);
    expect(machine.console.pendingRequest, 'while the DEVICE latch is still exactly where it was')
      .toBe(true);
    expect(machine.channel1.inquiryRequest).toBe(true);
    // And these are now TWO DIFFERENT FACTS ON THE PAGE: `inquiryView`'s REQUEST lens reads
    // `machine.console.pendingRequest` while its HELD legend reads `session.held`. No test can
    // construct that view (`environment: 'node'`), so the divergence it draws is asserted here on
    // the pair the view reads — the moment where a one-latch panel would show the wrong thing.
    expect([session.held, machine.console.pendingRequest]).toEqual([false, true]);
  });
});

// ═══ (e) M2 — THE SILENT FRAME STALL, FROM BOTH SIDES ═════════════════════════════════════════

/**
 * `src/ui/main.ts`'s four-term execute gate, in the shape that file writes it — and the test below
 * asserts those terms are still IN that file, so this copy cannot drift into fiction. Only two of
 * the four have an owner on each surface: the machine-room rotary moves `detent`, the byte-frozen
 * `<select>` moves `machine.mode`, and NEITHER SURFACE READS THE OTHER'S. That is M2.
 */
const gateOpen = (r: Rig, running: boolean): boolean =>
  running && !r.session.held && r.session.detent === 'run' && r.machine.mode === 'run';

describe('M2 — a START that cannot open the gate says so (PHASE-4-NOTES.md §4)', () => {
  it('the recorded repro: rotary to DISPLAY, then the internals START — shut, and the tab says why',
    () => {
      const r = rig();
      let running = false;                       // main.ts's module-local latch (`:34`)

      r.session.turn('display');
      expect(r.hooks.halt, 'the turn itself clears the latch — that half was never the defect')
        .toBe(1);
      running = false;
      expect(r.machine.mode, 'machine.stop() IS { fieldLine("S") }: the façade never moved')
        .toBe('run');

      // THE INTERNALS START, which is `controls.ts:96`'s `hooks.halt(); hooks.run();` — the frozen
      // file this test may not build, so its two hook calls stand in for the button.
      running = false;
      running = true;

      expect(gateOpen(r, running), 'nothing executes: the gate is shut on `detent`').toBe(false);

      // AND THE PANEL SAYS WHY. The live MODE label read a confident `MODE = RUN` — the façade's
      // own answer — with no reader of `detent` anywhere under src/ui/internals.
      const drawn = modeNote(r.machine.mode, r.session.detent);
      expect(drawn).toBe('MODE = RUN — the machine-room MODE switch is at DISPLAY, and nothing '
        + 'executes until both are at RUN.');
      expect(modeNote('run', 'run'), 'and it is silent when the two agree').toBe('MODE = RUN');
      expect(drawn, 'the shipped label was this and nothing else').not.toBe('MODE = RUN');

      // The gate opens the moment the dial comes back — the same helper, so the case above is not
      // passing on a predicate that is false for every input.
      r.session.turn('run');
      r.session.startKey();
      expect(r.hooks.run, 'START in the RUN detent latches again').toBe(1);
      expect(gateOpen(r, true), 'and now the machine executes').toBe(true);
      expect(modeNote(r.machine.mode, r.session.detent)).toBe('MODE = RUN');
    });

  it('the mirror: the frozen <select> moved the processor, so the period START refuses out loud',
    () => {
      // `controls.ts:78-84`'s `<select>` calls `hooks.halt(); m.setMode(next)` and never touches
      // the drawn dial. This test may not build that view either, so it makes the one call the
      // `<select>` makes.
      const { machine, session, hooks } = rig();
      machine.setMode('alter');
      expect(session.detent, 'the dial has not moved, and nothing on the desk says otherwise')
        .toBe('run');

      session.startKey();

      expect(hooks.run, 'START latches NOTHING into a gate that cannot open').toBe(0);
      expect(gateOpen({ machine, session, hooks }, true)).toBe(false);
      expect(session.notice, 'it refuses out loud instead').toBe(PROCESSOR_IS_NOT_AT_RUN);
      expect(session.notice).toContain('INTERNALS');

      // AND THE REMEDY THE SENTENCE NAMES WORKS, through the period surface's ONE writer of
      // `machine.setMode` — the rotary. Off RUN types its S through stop(), back to RUN types the
      // second through setMode (machine.ts:327).
      const before = log(machine).length;
      session.turn('display');
      session.turn('run');
      expect(machine.mode).toBe('run');
      expect(log(machine).slice(before).map((l) => l.id)).toEqual(['S', 'S']);
      session.startKey();
      expect(hooks.run, 'and now it starts').toBe(1);
      expect(session.notice, 'with nothing left to say').toBeUndefined();
      expect(gateOpen({ machine, session, hooks }, true)).toBe(true);
    });

  it('is the same four-term gate src/ui/main.ts runs, and the rotary reaches the other tab', () => {
    // The DOM-free stand-in for "the frame executes": `environment: 'node'` cannot run main.ts, so
    // the gate and the one wire M2 adds are read out of its SOURCE — `logView.ts`'s precedent at
    // the foot of this file.
    const src = codeOf('src/ui/main.ts');
    for (const term of ['running && !consoleSession.held', "consoleSession.detent === 'run'",
      "machine.mode === 'run'", 'rotary: () => period.session.detent']) {
      expect(src, term).toContain(term);
    }
    // and the internals tab still reads no detent of its own — the hook is the only way in.
    expect(codeOf('src/ui/internals/mount.ts')).toContain('hooks.rotary()');
  });
});

// ═══ (g) AND THE BROWSER'S OPTION TRIPLE, DOM-FREE ════════════════════════════════════════════

/** The fenced Exhibit II block under §2's heading, sliced at test time — the wave-1 mechanism,
 *  copied rather than imported, because a test may not import another test file. */
function exhibitTwo(): readonly string[] {
  const lines = readFileSync(join(REPO_ROOT, 'docs/research/console-and-physical.md'), 'utf8')
    .split('\n');
  const heading = lines.findIndex((l) => l.startsWith('### Real console log sample'));
  const open = lines.indexOf('```', heading);
  const close = lines.indexOf('```', open + 1);
  if (heading < 0 || open < 0 || close < 0) throw new Error('§2: Exhibit II block not found');
  return lines.slice(open + 1, close);
}

/** A literal ELISION — three dots standing for storage the manual's page never printed — so it is
 *  not a renderable `ConsoleLine` and no `formatPrintout` call produces it (§16 item 6). */
const ELIDED_ROW = 'D bbbb...';
const SAMPLE = exhibitTwo();
const EXPECTED = SAMPLE.filter((l) => l !== ELIDED_ROW);

// The thirteen `R` replies come OUT OF THE SLICE, un-slashed: `formatPrintout` does the slashing
// (C28-0351-5 p.2), so the authored form carries plain zeros.
const REPLIES = EXPECTED.filter((l) => l.startsWith('R ')).map((l) => l.slice(2).replaceAll('Ø', '0'));

const LOG: readonly ConsoleLine[] = [
  formatPrintout('#', { address: 0 }),
  formatPrintout('S', {
    iar: 14900, aar: '1', bar: 11622, op: BLANK_WITH_C, opMod: BLANK_WITH_C,
    aChannel: BLANK_WITH_C, bChannel: BLANK_WITH_C, assemblyChannel: BLANK_WITH_C,
    ch1Unit: null, ch2Unit: null,
  }),
  formatPrintout('D', { address: 0 }),
  formatPrintout('A', { text: 'AC%B000012$N' }),
  ...REPLIES.map((text) => formatPrintout('R', { text })),
  formatPrintout('#', { address: 0 }),
];

/** What the browser draws with, and the reason this file re-renders wave 1's slice at all. */
const BROWSER = { matrix: 'indent', marks: 'render', spacing: 'render' } as const;

describe('the console station’s drawn constants and the browser’s option triple', () => {
  it('lights POWER ON and READY on the 1415 key strip and nothing else (§11 wave 4 (g))', () => {
    expect(LIT_CONSTANTS).toEqual(['POWER ON', 'READY']);
  });

  it('draws Fig.47’s eight key legends, the one READY light, and four inert power keys', () => {
    // The drawn labels are DATA with no other consumer, so nothing else would notice a legend
    // changing. Order is the panel's own, top-left down (console-and-physical.md §3 [verified];
    // A22-0526-3 Fig.47 p.49).
    expect(CONSOLE_KEYS).toEqual(['EMERGENCY OFF', 'COMPUTER RESET', 'DC OFF', 'POWER OFF',
      'POWER ON', 'START', 'STOP', 'PROGRAM RESET']);
    expect(CONSOLE_LIGHTS, 'READY is a LIGHT, not a key').toEqual(['READY']);
    expect(INERT_KEYS, 'the four power controls this emulator has no counterpart for')
      .toEqual(['EMERGENCY OFF', 'DC OFF', 'POWER OFF', 'POWER ON']);
    for (const lit of LIT_CONSTANTS) {
      expect([...CONSOLE_KEYS, ...CONSOLE_LIGHTS], lit).toContain(lit);
    }
    expect(CONSOLE_KEYS, 'the LOAD key is a 1401’s, and is on neither 1410 panel')
      .not.toContain('LOAD');
  });

  it('draws Fig.43’s keyboard: WORD MARK at the far left of the QWERTY row, and no backspace', () => {
    const qwerty = KEY_ROWS[1];
    expect(qwerty?.[0]?.lower, 'the far left of the QWERTY row (S223-2648 p.78)').toBe('WORD MARK');
    expect(qwerty?.[0]?.wordMark).toBe(true);
    expect(qwerty?.[0]?.glyph, 'it types no character — it is pressWordMark()').toBeNull();
    expect(qwerty?.[1]?.lower, 'and Q is the key beside it').toBe('Q');
    const legends = KEY_ROWS.flatMap((row) => row.map((top) => top.lower));
    expect(legends, 'the physical Backspace key IS INQUIRY RELEASE').not.toContain('BACKSPACE');
    expect(NO_BACKSPACE_NOTE).toContain('INQUIRY RELEASE');
    expect(DUAL_LEGEND_CAPTION, '§2’s own sentence, on the page').toContain('type element');
    expect(WORD_MARK_CHORD).toBe('Alt (Option) + W');
    expect(WORD_MARK_CHORD, 'the ^ convention lives only in the frozen controls.ts')
      .not.toContain('^');
  });

  it('re-renders the Exhibit II slice at the triple: 35-lines five columns right of 30-lines', () => {
    expect(SAMPLE, 'nineteen content lines').toHaveLength(19);
    expect(SAMPLE).toContain(ELIDED_ROW);
    expect(REPLIES).toHaveLength(13);
    expect(LOG).toHaveLength(18);
    const indentOf = (l: ConsoleLine): number => {
      const one = renderSelectric([l], { ...BROWSER, spacing: 'ignore' });
      return one.length - one.trimStart().length;
    };
    expect([...new Set(LOG.filter((l) => l.matrixPos === 30).map(indentOf))]).toEqual([0]);
    expect([...new Set(LOG.filter((l) => l.matrixPos === 35).map(indentOf))]).toEqual([5]);
    // and the other two switches are live at the same triple: a blank line before the `S` row
    // and a combining low line under each of the four absent-parity register characters.
    const rendered = renderSelectric(LOG, BROWSER);
    expect(rendered.split('\n')[1], 'spacing:"render"').toBe('');
    expect([...rendered].filter((ch) => ch === '̲'), 'marks:"render"').toHaveLength(4);
  });

  it('is the exact option triple console/logView.ts renders the log with', () => {
    // The DOM-free stand-in for "the exact string logView sets as textContent": `environment:
    // 'node'` cannot construct the view, so the triple is read out of its SOURCE instead. It is
    // still the assertion that stops the view and the oracle diverging.
    const src = codeOf('src/ui/period/console/logView.ts');
    for (const pair of ["matrix: 'indent'", "marks: 'render'", "spacing: 'render'"]) {
      expect(src, pair).toContain(pair);
    }
  });
});
