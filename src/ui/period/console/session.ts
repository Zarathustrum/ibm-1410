// ═══ src/ui/period/console/session.ts · WAVE 4 ═══ the operator's side of the 1415 desk, DOM-free.
// Plan: docs/plans/phase-4-period-ui.md §4.6 (PeriodMode / ROTARY_ANGLE / RotaryTurn / turnTo),
// §4.7 (ConsoleKeyboard), §4.8 (PendingEntry / ConsoleSession), §6.2 (turnTo in full and the trap
// at machine.ts:325), §6.3 (the display/alter dialogue in the manual's order), §6.4 (the commit
// rule and keyBootstrap), §6.5 (focus ownership), §6.6 (the inquiry hold).
//
// WHICH MACHINE: the IBM 1415 console of an IBM 1410. SIX MODE detents — RUN top, ADDRESS SET
// upper-left, DISPLAY upper-right, I/E CYCLE lower-left, ALTER lower-right, C.E. bottom
// (research/console-and-physical.md §3 [verified] — A22-0526-3 Fig.47 p.49; S223-2648 Fig.2 p.7);
// the display and alter procedures of §4 [verified] — A22-0526-3 pp.50-51; the Fig.43 p.47
// keyboard, whose "word-mark and space keys are non-repeating" (S223-2648 p.78).
// NOT A 1401: the 1410 has NO address-dial rotary switches (console-and-physical.md §1; A22-0526-3
// pp.50-51), so every address on this desk is TYPED — which is why §6.3's keyed dialogue is the
// design. THE ONE PLACE `machine.setMode` IS REACHABLE FROM THE PERIOD SURFACE (§3.6, §4.6): six
// detents against a four-member `ConsoleMode` (machine.ts:38), and src/core does not move a line.
//
// TWO ENTRIES END ON A CONTROL ACTION, and both rules live in `commit()` below. The control actions
// are START, a rotary turn, COMPUTER RESET and PROGRAM RESET — plus INQUIRY REQUEST, which begins
// an entry of its own. An ALTER entry COMMITS (§6.4). An open INQUIRY entry is CANCELLED, exactly
// as INQ CAN would cancel it, because only INQUIRY RELEASE supplies a line: the operator who walks
// away discards it, `held` drops with it, and the frame cannot stall behind a hold nobody is going
// to release (orchestrator ruling, wave 4 review).
//
// What this file deliberately does NOT do:
//   - no DOM of any kind — it is on test/period-is-dom-free.test.ts's required-path list. Moving
//     the browser's focus is a `hooks.focus()` call, so §6.5 ruling 5 lives here without this file
//     ever naming an element;
//   - no backspace, and no `backspace()` on ConsoleKeyboard: the 1415's physical Backspace key IS
//     INQUIRY RELEASE, and "carrier return, backspace and index cannot be commanded from the
//     keyboard" (console-and-physical.md §2 [verified] — S223-2648 p.78; A22-0526-3 p.45). The
//     operator's only correction is INQ CAN, which discards the whole entry (io.md §8 step 6) —
//     and DISCARDS IS ALL IT DOES to a keyed address or alter line: the entry is dropped, the same
//     field opens again at the same limit, and nothing reaches the device. Only an INQUIRY entry
//     is ever handed to `machine.console.supply` (`supply()` below, and its dispatch);
//   - NO SILENT REFUSAL. Every guard on this session that can stop an operator's action reports
//     it — `keyBootstrap` by its return, and the two the caption cannot otherwise explain (a
//     refused address, START in ALTER with nothing displayed) through `notice`, which
//     `console/keyboardView.ts` draws under the lock legend. A `void` method with an early-return
//     guard under a caption that draws success anyway is this file's one recurring defect;
//   - no `^` parser of its own: `keyed()` in the byte-frozen internals/controls.ts:123 is the
//     project's ONE word-mark parser and is IMPORTED here — the phase's one sanctioned
//     cross-surface import, which moves to this file as wave 4 deletes unitrecord/inquiryView.ts;
//   - no START arm for the ADDRESS SET, I/E CYCLE or C.E. detents. §4.8 gives startKey() three —
//     RUN, DISPLAY, ALTER; the other three turn, type their `S` and are inert on this desk, and
//     the internals tab still reaches `machine.start()` in ADDRESS SET and I/E CYCLE;
//   - no core change. Both refusals are costed where they bite: `ConsoleMode` learning the two
//     UI-only detents is 10-15 lines plus a fifth MODES row in the frozen controls.ts:23-25, and a
//     blocking Console1415.read() is an async seam in step().

import { bcdOfGlyph } from '../../../core/bcd.js';
import type { InquiryEntry } from '../../../core/devices/console1415.js';
import { CONSOLE_LINE_LENGTH, type ConsoleMode, type Machine } from '../../../core/machine.js';
import { keyed } from '../../internals/controls.js';

/**
 * The WORD MARK key's stand-in inside the string `keyed()` parses. `controls.ts` is byte-frozen and
 * does not export its `WORD_MARK_KEY`, so the glyph is repeated here for the accumulator and
 * nowhere else — `keyed()` stays its ONLY parser. `^` is deliberately not one of the 64 machine
 * characters (src/core/bcd.ts), so `press()` can never enter one as data.
 */
const WORD_MARK = '^';

export type PeriodMode = ConsoleMode | 'display' | 'ce';

/**
 * OPEN: ROTARY_DETENTS_ARE_60_DEGREES_APART — `[likely]` derived from `[verified]`, sharpened by
 * wave 0's primary read. console-and-physical.md §3 `[verified]` names six CLOCK positions — RUN
 * top, ADDRESS SET upper-left, DISPLAY upper-right, I/E CYCLE lower-left, ALTER lower-right, C.E.
 * bottom (A22-0526-3 Fig.47 p.49; S223-2648 Fig.2 p.7) — 12/2/4/6/8/10 o'clock, and NO PAGE PRINTS
 * THE DEGREES: Fig.47 draws the knob with no ticks and no graduations. Wave 0 measured the six
 * silkscreened index dots in the S223-2648 Fig.2 p.7 photograph at 0.0 / 58.3 / 119.6 / 180.0 /
 * 238.6 / 301.3° clockwise from twelve o'clock — 1.7° off an even 60° spacing, inside the
 * photograph's own perspective error (open-questions.md, Phase 4 wave 0 target (b)).
 * Fallback: even 60° spacing, snapping only, no intermediate position — THIS TABLE, and no
 * behaviour. A published table of detent angles would settle it; the measurement only narrows it.
 */
export const ROTARY_DETENTS_ARE_60_DEGREES_APART = true;

export const ROTARY_ANGLE: Readonly<Record<PeriodMode, number>> =
  { run: 0, display: 60, alter: 120, ce: 180, ieCycle: 240, addressSet: 300 };

/** AT MOST ONE FIELD ACTIVE on a real turn; both inert on a turn to the current detent. */
export interface RotaryTurn {
  readonly setMode: ConsoleMode | null;   // machine.setMode — types `S` at machine.ts:327
  readonly stop: boolean;                 // machine.stop()  — IS `{ fieldLine('S'); }` at :380
}

/**
 * OPEN: UI_ONLY_DETENTS_TYPE_S_THROUGH_STOP — a ruling of ours over a `[verified]` rule. DISPLAY
 * and C.E. are rotary positions the façade cannot name, and they type their `S` through
 * `machine.stop()`, which IS `{ fieldLine('S'); }` (machine.ts:380) where `setMode` ends on the
 * same `fieldLine('S')` (:327) — the paper cannot tell the two paths apart, and
 * console-and-physical.md §2's print-out table has ONE row for "Normal stop (STOP key / mode
 * change)" `[verified]` (A22-0526-3 Fig.42 p.46, p.50, p.52; §4 "Mode-switch side effect").
 * Fallback: route the two UI-only detents through `stop()`. THE CORE CHANGE, COSTED AND REFUSED:
 * `'display' | 'ce'` on `ConsoleMode` (machine.ts:38) plus two `case` arms in `start()` is 10-15
 * lines and forces a fifth MODES row into the byte-frozen controls.ts:23-25. THE TRAP IT NAMES:
 * `setMode` returns early when the target equals `machine.mode` (:325), so a UI-only detent
 * followed by a return to RUN loses TWO lines, not one, unless the rotary's own position is
 * tracked apart from the façade's — which is `from` here and `ConsoleSession.detent` below.
 *
 * RESOLVED: PROGRAM_STOP_TYPES_S (`src/core/machine.ts`, `[verified]` S223-2648 p.6 — CITED,
 * never redeclared), recorded here because the rotary is where the question became visible. Phase
 * 4 read p.6's "a program stop, an error stop, the stop key, or any cycle step, will initiate a
 * stop print-out", took no action on a src/core constant, and costed the flip at "eleven `S` lines
 * into the cc01 transcript"; wave 0 made it (DEFERRED-01, docs/BUILD-LOG-6.md) and the cost
 * measured ZERO — `node build/tools/run-cor.js oracles/cc01.cor --iar 02000 --trace 1` emits 1241
 * level-1 instruction lines and NOT ONE op `.` (J 325, D 153, `,` 138, W 133, S 131, ⌑ 115, V 75,
 * C 47, B 36, G 33, ? 24, / 10, A 7, N 5, R 4, ! 3, M 2 — 1241); the eleven counted `.` STATICALLY
 * in the image, CC01A's error halts, reachable only on a failed check. The trap: PRINT OUT CONTROL
 * and START PRINT OUT look like they answer it — why the C.E. door is drawn closed on this desk.
 */
export const UI_ONLY_DETENTS_TYPE_S_THROUGH_STOP = true;

const isConsoleMode = (m: PeriodMode): m is ConsoleMode => m !== 'display' && m !== 'ce';

export function turnTo(from: PeriodMode, to: PeriodMode, facadeMode: ConsoleMode): RotaryTurn {
  if (to === from) return { setMode: null, stop: false };        // not a change; types nothing
  return isConsoleMode(to) && to !== facadeMode
    ? { setMode: to,   stop: false }                             // machine.ts:327 types the S
    : { setMode: null, stop: true  };                            // machine.ts:380 IS fieldLine('S')
}

/**
 * io.md §8 step 3's keyboard lock as UI state. `press` refuses when locked, at the limit, or on any
 * glyph outside the 1415's 64 — which is why Console1415's Figure 45 Data Check row ("input
 * character validity error") stays unreachable, as read()'s own header argues. It returns false and
 * never throws: a key press is not an exception (bcdOfGlyph returns undefined, bcd.ts:148).
 */
export interface ConsoleKeyboard {
  readonly state: 'locked' | 'address' | 'data';
  readonly typed: string;
  readonly wordMarks: readonly boolean[];
  press(glyph: string): boolean;
  /** SEPARATE and non-repeating: the 1415 has a real WORD MARK key at the far left of the QWERTY
   *  row, and "word-mark and space keys are non-repeating" (S223-2648 p.78; A22-0526-3 Fig.43 p.47,
   *  both [verified]). A `^` inside press() would model a text box, not a keyboard. */
  pressWordMark(): void;
  /** `limit` is 5 in 'address' and the DISPLAYED SPAN in 'data'; `onLimit` is the auto-lock,
   *  "keyboard auto-locks, carrier returns, line spaces" (A22-0526-3 p.51). STAYS DOM-FREE: moving
   *  the browser's focus is the SESSION's job, beside this call (§6.5 ruling 5). */
  unlock(as: 'address' | 'data', limit: number, onLimit: () => void): void;
  lock(): void;
  /** EXACTLY the InquiryEntry the shipped supply() takes (console1415.ts:84-88, :166), so the
   *  delivery path does not move a line. It IS controls.ts:123's frozen `keyed()` over what the
   *  operator typed — imported, never reimplemented (§3.8). */
  take(ending: 'release' | 'cancel'): InquiryEntry;
}

function createKeyboard(): ConsoleKeyboard {
  // ONE piece of state: the line in `keyed()`'s own `^` form, so `typed`, `wordMarks` and `take()`
  // are the same frozen parse and cannot drift apart.
  let line = '';
  let state: ConsoleKeyboard['state'] = 'locked';
  let limit = 0;
  let onFull: () => void = () => undefined;

  return {
    get state(): ConsoleKeyboard['state'] { return state; },
    get typed(): string { return keyed(line).text; },
    get wordMarks(): readonly boolean[] { return keyed(line).wordMarks; },

    press(glyph: string): boolean {
      if (state === 'locked') return false;
      if (bcdOfGlyph(glyph) === undefined) return false;     // outside the 64 — refused, not thrown
      const filled = keyed(line).text.length;
      if (filled >= limit) return false;                     // the sixth digit of a five-digit field
      line += glyph;
      // "keyboard auto-locks, carrier returns, line spaces" (A22-0526-3 p.51). The lock comes
      // FIRST: `onFull` is the display or the commit, and both read `typed`, which lock() keeps.
      if (filled + 1 >= limit) { state = 'locked'; onFull(); }
      return true;
    },

    pressWordMark(): void {
      if (state === 'locked') return;
      if (line.endsWith(WORD_MARK)) return;                  // non-repeating (S223-2648 p.78)
      line += WORD_MARK;
    },

    unlock(as: 'address' | 'data', max: number, onLimit: () => void): void {
      state = as; line = ''; limit = max; onFull = onLimit;
    },

    lock(): void { state = 'locked'; },

    take(ending: 'release' | 'cancel'): InquiryEntry { return { ...keyed(line), ending }; },
  };
}

/** A line the OPERATOR has typed and the machine has NOT — drawn on the Selectric form in a style
 *  visually distinct from a printed ConsoleLine, because nothing is on the paper yet. */
export interface PendingEntry {
  readonly id: 'D' | 'A' | 'I'; readonly column: 30 | 35;
  readonly text: string; readonly wordMarks: readonly boolean[];
}

/**
 * START in the ALTER detent with nothing displayed. §4's "an alter must follow a display" as the
 * OPERATOR meets it: the keyboard does not open, `keysView.ts` captions START as the key that
 * unlocks it, and until this string existed the refusal was a `void` return off the end of
 * `startKey()`. Three routes reach it — a fresh page, an address the machine refused, and any
 * SUCCESSFUL alter, because `commit()` clears the span the next alter would need.
 */
export const ALTER_MUST_FOLLOW_A_DISPLAY =
  'START in ALTER did nothing: an alter must follow a display. Turn the MODE switch to DISPLAY, '
  + 'press START and key the five-digit address; then turn to ALTER and press START. The display '
  + 'is used up by the alter that follows it, so the alter after an alter needs a fresh one.';

/**
 * START in the RUN detent while the FAÇADE is not in RUN — the mirror of M2 (PHASE-4-NOTES.md §4),
 * and the only way to reach it is the byte-frozen `<select>` on the internals tab, which moves
 * `machine.mode` without touching this dial. The page's execute gate reads both terms
 * (`src/ui/main.ts`), so latching `running` here would stop dead in a gate the operator cannot
 * see. The remedy the sentence names is a real one and goes through the period surface's ONE
 * writer of `machine.setMode` — the rotary: a turn off RUN types its `S` through `machine.stop()`,
 * and the turn back calls `setMode('run')` (machine.ts:327), which types the second.
 */
export const PROCESSOR_IS_NOT_AT_RUN =
  'START did not start the machine: this dial is at RUN but the processor is not — the MODE switch '
  + 'on the INTERNALS tab has moved it. Turn this dial off RUN and back to RUN, which puts the '
  + 'processor where the dial says, then press START again.';

/** INQ CAN against a keyed address or alter line. The whole entry goes and the SAME field opens
 *  again — which is what "the only correction this keyboard has" means at a keyboard with no
 *  backspace (io.md §8 step 6; console-and-physical.md §2 [verified] — S223-2648 p.78). */
export const ENTRY_DISCARDED =
  'INQ CAN discarded the entry. The keyboard is open again at the same field — key it again.';

/** A refused address, carrying the two things the form cannot show: WHAT was refused, and that the
 *  field is open again. `machine.keyAddress` takes five digits inside installed storage
 *  (machine.ts:392-399) and `press()` accepts all 64 glyphs, so `ABCDE` and `20000` both land here. */
const addressRefused = (typed: string, size: number): string =>
  `The address ${typed} was refused: it must be five DIGITS naming a position inside this `
  + `machine's ${String(size)} positions of storage. Nothing was displayed and nothing reached the `
  + 'machine. The keyboard is open again at the same five positions — key the address again.';

export interface ConsoleSession {
  /** WHERE THE ROTARY POINTS — tracked separately from machine.mode, which is what makes §6.2's
   *  RUN→DISPLAY→RUN trap safe and what startKey() dispatches on. */
  readonly detent: PeriodMode;
  readonly keyboard: ConsoleKeyboard;
  /** THE UI'S OWN inquiry latch. Never Console1415.pendingRequest, which the device clears inside
   *  precheck() (:199) and read() (:290, :316) — a loop gated on it deadlocks (§6.6). */
  readonly held: boolean;
  readonly pending: PendingEntry | undefined;
  /** WHAT THE DESK HAS TO SAY ABOUT THE LAST OPERATOR ACTION, or `undefined` when it has nothing —
   *  a refusal the drawn caption would otherwise leave silent. Every control action below clears it
   *  before it acts, so it describes the last action and never an older one; `keyboardView.ts`
   *  draws it under the KEYBOARD LOCKED / UNLOCKED legend. It is the `keyBootstrap` return in the
   *  shape the other refusals need, because those have no caller to hand a boolean to. */
  readonly notice: string | undefined;
  turn(to: PeriodMode): void;
  startKey(): void;
  stopKey(): void;
  programReset(): void;
  computerReset(): void;
  request(): void;
  release(): void;
  cancel(): void;
  /** deckBox's "key the bootstrap", typed. Feeds BOOTSTRAP_KEYSTROKES (loader.ts:53-58) through
   *  press() / pressWordMark() ONE AT A TIME and requires keyboard.state === 'data'.
   *  RETURNS FALSE, HAVING TYPED NOTHING, when the keyboard is locked — the caller draws the
   *  refusal, because a button that reports success on a silent no-op costs a debugging session. */
  keyBootstrap(text: string, marks: readonly boolean[]): boolean;
}

/**
 * OPEN: ALTER_ENTRY_COMMITS_ON_THE_NEXT_CONTROL_ACTION — `[unverified]`. An ALTER entry reaches
 * storage — `machine.alter(text, marks)` runs and pushes the `A` line (machine.ts:424-442) — when
 * the displayed span FILLS, or on the next control action: START, a rotary turn, COMPUTER RESET,
 * PROGRAM RESET. A22-0526-3 p.51 says the entry ends "at a word mark or end of line" and says
 * NOTHING about the operator leaving mid-line, so the second clause is ours.
 * Fallback: commit on the auto-lock alone, and a short entry is lost when the operator turns away —
 * defensible on the manual's silence, but it makes keying `AL%1000012$R` into an 80-position
 * display unforgiving. Reversing it is one branch in `commit()`; no `machine.alter` call moves
 * either way. A procedure page describing an abandoned alter would settle it.
 *
 * OPEN: INTERACTIVE_INQUIRY_HOLDS_THE_UI_RUN_LOOP — a ruling of ours narrowing a Phase-2 constant.
 * INQUIRY REQUEST sets `held` as well as the device latch, and src/ui/main.ts's frame stops calling
 * `machine.start()` while it is on, so the operator types into a stopped machine (io.md §8 steps
 * 3-5, A22-0526-3 pp.46-48; PHASE-2-NOTES.md §4). Two divergences, stated rather than hidden: the
 * keyboard unlock moves from the program's RCP to the operator's key press, and the wait moves from
 * the CPU to the frame loop. Neither is observable to a program — core, the six channel indicators
 * and the console log all end in the same state, and only wall-clock ordering differs.
 * THE HOLD IS ENDED BY ANY CONTROL ACTION, not only by the two lever keys: START, a rotary turn,
 * COMPUTER RESET, PROGRAM RESET or a second INQUIRY REQUEST cancels an open entry through the same
 * `supply(take('cancel'))` INQ CAN uses, drops `held` and locks the keyboard, and then the action
 * proceeds — the mirror of the ALTER rule above, and what keeps the frame from stalling behind a
 * hold the operator has walked away from.
 * NARROWED, and this clause is the narrowing (main-session ruling, wave 4 review): a RELEASED entry
 * is NOT cancelled by a later control action. INQUIRY RELEASE hands the line to the device
 * (`console1415.ts:166`), and what the operator does afterwards is a NEW INTENTION, not a
 * retraction of the one they just completed. Cancelling there would overwrite a correctly supplied
 * line and hand the program Figure 45's Condition on its next read — the operator did everything
 * right and would lose the message anyway. So `commit()` returns early while `handedOver` is set,
 * which is also what leaves the `I` row on the drawn form until the program's read types the real
 * `I` line (§6.6); `held` is already false by then, so nothing can stall behind it.
 * WHAT WOULD FALSIFY IT: a primary source showing that on iron a mode change or START after INQUIRY
 * RELEASE discards the queued entry — io.md §8's sequence ends at step 6 and says nothing about a
 * control action between the release and the program's read — or `Console1415.read()` changing so
 * that a released entry no longer survives a reset, at which point the row would be claiming a line
 * the device no longer holds. Either one deletes the early return, two lines.
 * Fallback: drop the hold, and the behaviour is Phase 2's as shipped — the program's console read
 * returns Figure 45's No Transfer whenever nothing has been supplied. THREE LINES below. The
 * REFUSED alternative is a blocking Console1415.read(): an async seam in step(), which
 * architecture.md §2 fixes as synchronous and promise-free and which every tier-1 through tier-4
 * test drives synchronously.
 */
export const ALTER_ENTRY_COMMITS_ON_THE_NEXT_CONTROL_ACTION = true;
export const INTERACTIVE_INQUIRY_HOLDS_THE_UI_RUN_LOOP = true;

/** `hooks.run` / `hooks.halt` are main.ts's `() => { running = true; }` / `() => { running =
 *  false; }` — the SAME PAIR controls.ts:35-40 already defines, so the period START key and the
 *  internals RUN button drive one latch. `hooks.focus` is console/mount.ts's `.focus()` on the
 *  keyboard wrapper, called on EVERY unlock (§6.5 ruling 5). */
export function createConsoleSession(machine: Machine,
  hooks: { run(): void; halt(): void; focus(): void }): ConsoleSession {
  const keyboard = createKeyboard();
  let detent: PeriodMode = 'run';
  let held = false;
  let pendingId: PendingEntry['id'] | undefined;
  // What the last DISPLAY put on the paper, and so what an ALTER may touch: this session's mirror
  // of the façade's own `displayed` span, which machine.ts:427 consumes on the one alter it allows.
  // `undefined` is why "ALTER before a display" never reaches machine.ts:425's throw.
  let span: number | undefined;
  // Whether the typed inquiry line has been handed to the device. Until the program's read types
  // the `I` line (console1415.ts:311-313) nothing is on the paper, so the pending row stays (§6.6).
  let handedOver = false;
  let notice: string | undefined;

  const unlock = (as: 'address' | 'data', max: number, onLimit: () => void): void => {
    keyboard.unlock(as, max, onLimit);
    hooks.focus();
  };

  // THE DISPATCH, and it is the whole of the two lever defects. This used to hand `keyboard.take()`
  // to the device WHATEVER was open: INQ CAN mid-DISPLAY queued a `{ending:'cancel'}` entry a later
  // program read consumed as Figure 45's Condition, left the row drawn and the keyboard locked; and
  // a stray lever press on an idle desk queued an EMPTY entry with nothing changed on screen, so
  // the next console read returned a blank line instead of No Transfer. ONLY AN INQUIRY ENTRY STILL
  // BEING TYPED IS SUPPLIED — a released one already belongs to the device (§6.6), and an address
  // or an alter line is not the device's business at all (`retype()` below).
  const supply = (ending: 'release' | 'cancel'): void => {
    if (pendingId !== 'I' || handedOver) return;
    machine.console.supply(keyboard.take(ending));
    held = false;
    handedOver = true;
    keyboard.lock();
  };

  // §6.4's commit rule, and the inquiry half of it. An ALTER entry begun by START is already
  // `A`-and-a-space on the paper of a real machine, so an empty one commits too:
  // `machine.alter('', [])` writes no position and types the line the operator's START asked for.
  // An open INQUIRY entry is CANCELLED rather than committed — only INQUIRY RELEASE supplies a line
  // (io.md §8 steps 5-6) — and `held` drops with it, so no control action can leave the frame
  // stalled behind a hold or overwrite the operator's entry with a half-typed one.
  const commit = (): void => {
    if (pendingId === 'A') {
      machine.alter(keyboard.typed, keyboard.wordMarks);
      span = undefined;
    }
    // A RELEASED entry already belongs to the device, and its row stays on the form until the
    // program's read types the real `I` line (§6.6) — only an entry still being TYPED is discarded.
    if (pendingId === 'I' && handedOver) return;
    if (pendingId === 'I') supply('cancel');
    pendingId = undefined;
    keyboard.lock();
  };

  // The DISPLAY auto-lock: five digits, then `machine.keyAddress` and `machine.display()`, which
  // pushes BOTH `D` lines (machine.ts:392-411). keyAddress THROWS on anything but five digits
  // inside installed storage (:392-399) and press() accepts any of the 64 glyphs, so a typed
  // `ABCDE`, a `0000 ` and every address from the top of storage up (20000 on the desk) are reachable.
  //
  // A REFUSED ADDRESS IS A RE-KEY, NOT A COMMIT. This cleared `pendingId` BEFORE the guard, so the
  // pending row came off the form — which is exactly what a SUCCESSFUL display does, two `D` lines
  // replacing the row. A mistyped address was therefore indistinguishable from a displayed one, on
  // a locked keyboard, with the paper untouched. Now the row stays, the field opens again at the
  // same five positions and the same callback, and the reason is drawn at the 1415.
  const onFive = (): void => {
    const digits = keyboard.typed;
    if (!/^\d{5}$/.test(digits) || Number.parseInt(digits, 10) >= machine.storage.size) {
      unlock('address', 5, onFive);
      notice = addressRefused(digits, machine.storage.size);
      return;
    }
    pendingId = undefined;
    notice = undefined;
    machine.keyAddress(digits);
    machine.display();
    span = machine.console.lines.at(-1)?.text.length ?? 0;
  };

  // INQ CAN against a keyed address or alter line. `unlock()` empties the keyboard's line, so
  // reopening the SAME field at the SAME limit and callback IS the discard — the entry never
  // existed as far as the machine is concerned, and the operator retypes it. `pendingId === 'A'`
  // implies a displayed span: `startKey()` opens the alter field only when there is one, and
  // `commit()` clears the two together.
  const retype = (): void => {
    if (pendingId === 'D') unlock('address', 5, onFive);
    else if (span !== undefined) unlock('data', span, commit);
  };

  return {
    get detent(): PeriodMode { return detent; },
    keyboard,
    get held(): boolean { return held; },
    get notice(): string | undefined { return notice; },
    get pending(): PendingEntry | undefined {
      if (pendingId === undefined) return undefined;
      // The `I` row leaves the form when the program's read consumes the entry and types the real
      // `I` line — not when RELEASE is pressed (§6.6).
      if (pendingId === 'I' && handedOver && machine.console.entry === undefined) return undefined;
      return {
        id: pendingId,
        column: pendingId === 'D' ? 35 : 30,
        text: keyboard.typed,
        wordMarks: keyboard.wordMarks,
      };
    },

    // The ONLY caller of turnTo, and a turn to the current detent is not a change: both fields
    // inert IS that signal. Every real turn commits first, so the `A` line reaches the paper before
    // the `S`, and then HALTS — "ANY change of the mode-switch setting … causes a stop print-out"
    // (A22-0526-3 p.50) is about a STOP, and a turn to DISPLAY or C.E. leaves machine.mode alone.
    turn(to: PeriodMode): void {
      notice = undefined;
      const action = turnTo(detent, to, machine.mode);
      if (action.setMode === null && !action.stop) return;
      commit();
      if (action.setMode !== null) machine.setMode(action.setMode);
      else machine.stop();
      detent = to;
      hooks.halt();
    },

    // Dispatches on `detent`, NEVER on machine.mode: at DISPLAY or C.E. the façade's mode is still
    // whatever it was, and a START dispatched on it would run the CPU from a DISPLAY detent (§6.2).
    // ALTER "must follow a display" (§4) — with no span there is no unlock, and nothing reaches the
    // façade at all. THAT REFUSAL IS NOW REPORTED: `keysView.ts` captions START as the key that
    // unlocks the keyboard in DISPLAY or ALTER, and this fell off the end returning `void` on all
    // three routes in — a fresh page, an address the machine refused, and every alter after the
    // first, because `commit()` clears the span. The other three detents are inert BY THE CAPTION
    // (§4.8, and the header above), so they say nothing.
    startKey(): void {
      notice = undefined;
      commit();
      if (detent === 'run') {
        // The gate `src/ui/main.ts` runs is four terms, and this key owns only one of them. If the
        // façade has been moved out from under the dial, say so and latch NOTHING: a `running` set
        // into a gate that cannot open is M2's silent stall, from the desk's side.
        if (machine.mode !== 'run') { notice = PROCESSOR_IS_NOT_AT_RUN; return; }
        hooks.run();
        return;
      }
      if (detent === 'display') { pendingId = 'D'; unlock('address', 5, onFive); return; }
      if (detent !== 'alter') return;
      if (span === undefined) { notice = ALTER_MUST_FOLLOW_A_DISPLAY; return; }
      pendingId = 'A';
      unlock('data', span, commit);
    },

    stopKey(): void { notice = undefined; machine.stop(); hooks.halt(); },
    programReset(): void { notice = undefined; commit(); machine.programReset(); },
    computerReset(): void { notice = undefined; commit(); machine.computerReset(); },

    // INQUIRY REQUEST does two things: the device latch `J iiiii Q` tests (io.md §8 step 1,
    // console1415.ts:156) and this session's own hold. It is a control action like the other four,
    // so it commits first — an operator who reaches for the lever mid-ALTER keeps the typed line.
    // The keyboard unlocks at matrix 30 and the line ends at the auto-lock or, normally, at
    // INQUIRY RELEASE. OPEN: CONSOLE_LINE_LENGTH (`src/core/machine.ts:105`, `[unverified]`,
    // existing — CITED, never redeclared): console-and-physical.md §2 gives the form and §4 the
    // termination rule, and neither gives a characters-per-line figure, so 80 is core's fallback —
    // unchanged by this phase and made VISIBLE by it, the same 80 positions logView.ts rules the
    // drawn form at.
    request(): void {
      notice = undefined;
      commit();
      machine.console.requestInquiry();
      held = true;
      handedOver = false;
      pendingId = 'I';
      unlock('data', CONSOLE_LINE_LENGTH, () => undefined);
    },

    // THE TWO LEVERS, AND THEY ARE NOT THE SAME KEY. INQUIRY RELEASE completes an inquiry record
    // and nothing else (io.md §8 step 5), so `supply()`'s dispatch is the whole of it. INQ CAN is
    // the keyboard's ONE correction (step 6): an open inquiry entry it ends as the manual says, and
    // an address or an alter line it DISCARDS — dropping the line and reopening the same field,
    // never handing a `D` or an `A` to a device that would queue it for the program's next read.
    // `inquiryView.ts` draws both disabled while there is nothing for them to act on.
    release(): void { notice = undefined; supply('release'); },
    cancel(): void {
      notice = undefined;
      if (pendingId === undefined) return;
      if (pendingId === 'I') { supply('cancel'); return; }
      retype();
      notice = ENTRY_DISCARDED;
    },

    // The deck box's "key the bootstrap", typed. It saves typing, not steps: the operator has
    // already turned the rotary to ALTER and pressed START, and every character goes in through the
    // same keyboard a person uses, with the WORD MARK key before the marked ones (io.md §8 step 4).
    //
    // THE LOCK REFUSAL IS REPORTED, NOT SWALLOWED. §6.5 ruling 3 forbids a keystroke reaching
    // press() from outside the console region, so the guard stays exactly as it was — but it
    // returns the refusal to the caller instead of returning void, because the deck box's button
    // used to print "keyed at the 1415" over a keyboard that had refused every character.
    keyBootstrap(text: string, marks: readonly boolean[]): boolean {
      if (keyboard.state !== 'data') return false;
      [...text].forEach((glyph, i) => {
        if (marks[i] === true) keyboard.pressWordMark();
        keyboard.press(glyph);
      });
      return true;
    },
  };
}
