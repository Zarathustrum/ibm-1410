// src/ui/period/mount.ts — the MACHINE ROOM tab: every station constructed once, each placed on
// `period/desk.ts`'s grid, and the one `PeriodViewState` the page holds.
// Source: Phase-4 plan §3.4's `period/mount.ts` row, §4.10 (`PeriodViewState` and `reduce`),
// §9.4 (the two typed hand-offs across the desk), §10.1 (the shell, and mount ORDER vs DISPLAY
// order), §10.2 (the page's one animation frame lives in `src/ui/main.ts`), §10.7 row 5, §11 wave 5.
//
// WHICH MACHINE: an IBM 1410 system — the 1402 card read punch, the 1403 Model 2 printer and the
// 1415 console-inquiry station, with the two host-side authoring stations (the RPG spec sheet and
// the Autocoder coding sheet) at the left of the desk. This file makes no hardware claim of its
// own; every one lives in the view it constructs.
//
// MOUNT ORDER IS A DATA-DEPENDENCY CHAIN AND DISPLAY ORDER IS THE DESK'S, and the two are different
// on purpose (plan §10.1). The chain below runs 1415 → 1402 → coding → specs, because the console
// session owns `keyBootstrap`, which the deck box needs; the reader returns the `DeckBox`, which the
// coding station needs; the coding station returns the `SourceBox`, which the spec station needs.
// The desk then places all five in PAPER order — SPEC SHEET · CODING SHEET · 1402 · 1415 · 1403 —
// into named grid areas, so nothing here depends on append order for layout and the two orders
// cannot silently disagree.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It holds no animation frame, no `dirty` flag and no `kick` of its own.** All three live in
//    `src/ui/main.ts` (plan §10.2), and `hooks.kick` here IS that one flag's setter, handed down to
//    every view that acts on an operator's behalf. A `requestAnimationFrame` call appears in one
//    file under `src/ui/**`, and it is not this one.
//  · **It draws nothing and names no CSS class.** `period/desk.ts` owns the grid and its class
//    names; `src/ui/styles/period.css` owns what they look like (plan §10.3).
//  · **It reaches into no view.** Exactly two values cross between stations and both are TYPED
//    methods on exported types, never a DOM selector: `specs → coding` is
//    `sourceBox.setText(source, dataCards)` and `coding → reader` is `deckBox.setText(text)` —
//    the pair `docs/DECISIONS.md` 2026-08-31 refused a `querySelectorAll` walk for, and the pair
//    §9.4 says Phase 4 is where that refusal gets paid.
//  · **It computes nothing.** `reduce` is `period/session.ts`'s and it is pure.
//
// ONE ACTION IS WIRED THIS WAVE — `tab`, dispatched by `src/ui/main.ts` when the operator switches
// tabs. The other five (`bars`, `ruler`, `chain`, `form`, `card`) are exercised as pure transitions
// by `test/period-session.test.ts` and the views that own those choices KEEP THE LOCAL TOGGLES they
// shipped with. **All three of the following are recorded limitations of this wave and not a
// design**, and they are written down because a reader would otherwise take the held state for a
// working store:
//  · **`state` is WRITTEN AND NEVER READ.** `dispatch` is a sink this wave: nothing below reads the
//    field it just set, and no view is handed the state. What the state is FOR is arriving one
//    toggle at a time in a later wave; what it does today is prove the reducer is wired.
//  · **`BOUNDS` pins `form` to 1 and `card` to 0**, so those two actions would clamp to a no-op even
//    if something dispatched them — `{ forms: 1, cards: 0 }` is a single-form stack and an empty
//    hopper, and `reduce` returns the same object for both.
//  · The day the first toggle moves up into `dispatch`, `BOUNDS` stops being a constant and reads
//    the 1403's form count and the 1402's hopper depth off `machine.snapshot()`.

import type { Machine } from '../../core/machine.js';
import { mountAutocoder } from './coding/mount.js';
import { mountConsole } from './console/mount.js';
import type { ConsoleSession } from './console/session.js';
import { createDesk } from './desk.js';
import { make, type View } from './dom.js';
import { createCarriageView } from './printer/carriageView.js';
import { createFormView } from './printer/formView.js';
import { createPanelView } from './printer/panelView.js';
import { mountReader } from './reader/mount.js';
import {
  INITIAL_VIEW_STATE, reduce, type PeriodAction, type PeriodViewState,
} from './session.js';
import { mountRpg } from './specs/mount.js';

/**
 * The clamp bounds `reduce` is given. They are the initial state's own this wave because no `form`
 * or `card` action is dispatched yet (see the header) — the wave that wires those two reads the
 * 1403's form count and the 1402's hopper depth off `machine.snapshot()` instead.
 */
const BOUNDS = { forms: 1, cards: 0 } as const;

/**
 * `hooks.run` and `hooks.halt` are `src/ui/main.ts`'s `() => { running = true; }` /
 * `() => { running = false; }`, and the whole bundle goes down UNSPLIT to `console/mount.ts`, the
 * one caller of `createConsoleSession`, which adds its own `focus` (plan §4.8, §6.3 step 10,
 * §6.5 ruling 5). So the period START key, a rotary turn and the internals RUN button move ONE
 * latch.
 *
 * The `View[]` is the return, not a frame: `src/ui/main.ts` owns the page's one animation frame and
 * renders whichever tab is visible from one `snapshot()` (§10.2). The `ConsoleSession` rides beside
 * it because the frame's execute gate reads `held` and `detent` off it (§6.6, §10.2).
 */
export function mountPeriod(
  machine: Machine,
  host: HTMLElement,
  hooks: { run(): void; halt(): void; kick(): void },
): {
  readonly views: readonly View[];
  readonly session: ConsoleSession;
  dispatch(action: PeriodAction): void;
} {
  const desk = createDesk(host);

  // Each station is mounted into an element of its own, which is what `desk.place` takes: the
  // mounts below APPEND into the element they are handed (`console/mount.ts:89`,
  // `reader/mount.ts`, `coding/mount.ts`, `specs/mount.ts`), and the DOM order inside a
  // station stays that mount's business.
  const consoleHost = make('div');
  const readerHost = make('div');
  const printerHost = make('div');
  const codingHost = make('div');
  const specsHost = make('div');

  // THE 1415 STATION, handed the whole `hooks` bundle. CONSTRUCTED FIRST, because its session owns
  // `keyBootstrap` and the deck box in the 1402 station needs it (§6.4).
  const console1415 = mountConsole(machine, consoleHost, hooks);

  // THE 1402 STATION. `keyBootstrap` crosses in as a typed hook — the replacement for
  // `deckBox.ts:45-55`'s `findAlterBox()` DOM walk, which breaks at `npm run typecheck` rather than
  // at run time on a page nobody is watching (§9.4). The `DeckBox` crosses back out to the coding
  // station below. The hook's BOOLEAN crosses back the other way: false is the 1415 keyboard
  // refusing the characters because it is locked, and the deck box draws the refusal.
  const reader = mountReader(machine, readerHost, {
    kick: hooks.kick,
    keyBootstrap: (text, marks) => console1415.session.keyBootstrap(text, marks),
  });

  // THE 1403 STATION, wave 2's three views, unchanged in construction. The one thing the snapshot
  // cannot tell them is the carriage tape's punching (`MachineState.printer` carries
  // `CarriageState`, and the punch lines are not derivable from it), so the tape is handed over
  // once at construction — `machine.printer.tape`, the same object the device skips against, never
  // a copy. That is what closes §15's `DEFAULT_CARRIAGE_TAPE` row: its fallback is "render it in
  // the printer view so it is visible rather than assumed" (plan §7.3, §10).
  const printerHeading = make('h2');
  printerHeading.textContent = '1403 Printer';
  const form = createFormView(machine.printer.tape, () => { machine.endOfJob(); hooks.kick(); });
  const carriage = createCarriageView(machine.printer.tape);
  const panel = createPanelView();
  printerHost.append(make('hr'), printerHeading, form.el, carriage.el, panel.el);

  // THE TWO AUTHORING STATIONS, at their post-5b paths: wave 5b `git mv`'d `autocoder/` to
  // `coding/` and `rpg/` to `specs/` and repointed these two imports, and nothing else about these
  // two calls changed. Both hand-offs stay wired inside those mounts: SEND TO AUTOCODER calls
  // `sourceBox.setText(source, dataCards)` (`specs/mount.ts:66`) and PUNCH INTO HOPPER calls
  // `deckBox.setText(text)` (`coding/mount.ts:71`).
  const { sourceBox } = mountAutocoder(machine, reader.deckBox, codingHost, hooks.kick);
  mountRpg(sourceBox, specsHost);

  // DISPLAY ORDER, in the paper order §1's storyboard walks: the sheets are written first, the
  // cards are punched from them, the machine reads them and the printer answers (plan §10.1).
  desk.place('specs', specsHost);
  desk.place('coding', codingHost);
  desk.place('reader', readerHost);
  desk.place('console', consoleHost);
  desk.place('printer', printerHost);

  // THE PAGE'S ONE `PeriodViewState`. `reduce` is pure and returns the SAME object when nothing
  // changed, so a view's joined-key diff sees no change and touches no DOM (§4.10, §10.2).
  let state: PeriodViewState = INITIAL_VIEW_STATE;
  const dispatch = (action: PeriodAction): void => { state = reduce(state, action, BOUNDS); };

  // ONE mount call per view. The order here is the RENDER order; it is deliberately NOT the display
  // order, which is the desk's (see the header).
  const views: readonly View[] = [
    ...console1415.views, ...reader.views, form, carriage, panel,
  ];
  return { views, session: console1415.session, dispatch };
}
