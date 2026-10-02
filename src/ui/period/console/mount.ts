// src/ui/period/console/mount.ts — the IBM 1415 Console station: one desk, one session, seven views.
// Source: Phase-4 plan §3.3's `console/mount.ts` row ("It is the ONE caller of
// `createConsoleSession`"), §4.8 (the session and its three hooks), §6.5 ruling 5 (focus
// ownership), §1 step 14 (the light panel above the keyboard), §10.2 (the page's one animation
// frame lives in `src/ui/main.ts`), §10.7, §11 wave 4.
//
// WHICH MACHINE: the IBM 1415 Console on a 1410 — "an I/O printer (a modified IBM Selectric), a
// control section, an indicator-light panel, and desk space", with the light panel on a stand
// behind and above the typewriter and the control cabinet upright at the operator's right
// ([verified] — console-and-physical.md §1, A22-0526-3 p.45, Fig.57 p.59; S223-2648 Fig.1 p.5).
// This file makes no hardware claim of its own; every one lives in the view it constructs.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It holds no animation frame, no `dirty` flag and no `kick` of its own.** All three live in
//    `src/ui/main.ts` from wave 3 on, and `hooks.kick` here IS that one flag's setter, handed down
//    to every view that acts on an operator's behalf (plan §10.2). `requestAnimationFrame`
//    appears in exactly one file under `src/ui/**`, and it is not this one.
//  · **It binds no `keydown` and no `keypress`, and adds no listener to `document` or `window`.**
//    `console/keyboardView.ts` is the one file in the phase that listens for a keystroke, on its
//    own `tabindex="0"` wrapper (plan §6.5 rulings 1-2).
//  · **It reaches into no view.** The only thing that crosses between two of them is the keyboard
//    wrapper's `focus`, and it crosses as a typed function through the session's own hook.
//  · It computes nothing and draws nothing but the station's heading and the rule above it.
//  · It carries no CSS class of its own; `period.css` is wave 5's (plan §10.3).

import type { Machine } from '../../../core/machine.js';
import { make, type View } from '../dom.js';
import { createInquiryView } from './inquiryView.js';
import { createKeyboardView } from './keyboardView.js';
import { createKeysView } from './keysView.js';
import { createLightsView } from './lightsView.js';
import { createLogView } from './logView.js';
import { createRotaryView } from './rotaryView.js';
import { createConsoleSession, type ConsoleSession } from './session.js';

/**
 * `hooks.run` and `hooks.halt` are `src/ui/main.ts`'s `() => { running = true; }` /
 * `() => { running = false; }` — the SAME PAIR `internals/controls.ts:35-40` already drives, so the
 * period START key, a rotary turn and the internals RUN button move one latch (plan §4.8, §6.3
 * step 10). They arrive here down the mount chain's `hooks` argument and go straight into the one
 * `createConsoleSession` call this project makes.
 *
 * The `View[]` is the return, not a frame: `src/ui/main.ts` owns the page's one animation frame and
 * renders whichever tab is visible from one `snapshot()` (plan §10.2).
 */
export function mountConsole(
  machine: Machine,
  host: HTMLElement,
  hooks: { run(): void; halt(): void; kick(): void },
): { readonly el: HTMLElement; readonly views: readonly View[]; readonly session: ConsoleSession } {
  // THE FOCUS CONTRACT, and the knot it ties (plan §6.5 ruling 5). The session must fire a
  // `focus()` whenever the keyboard unlocks — START in DISPLAY, START in ALTER, INQUIRY REQUEST —
  // because START is a SIBLING view's button and would otherwise hold the focus the next keystroke
  // needs, and the keyboard view needs the session to exist before it can be built. So the hook is
  // a closure over a binding filled in one line later, and it is the only forward reference in this
  // file. `ConsoleKeyboard.unlock()` stays DOM-free: moving the browser's focus is the SESSION's
  // job, which is why the hook lives there and not on the keyboard (plan §4.7).
  let keyboard: { focus(): void } | undefined;
  const focus = (): void => { keyboard?.focus(); };

  // THE ONE CALLER of `createConsoleSession` in the project (plan §3.3, §4.8).
  const session = createConsoleSession(machine, { run: hooks.run, halt: hooks.halt, focus });

  const heading = make('h2');
  heading.textContent = '1415 Console';

  const log = createLogView(session);
  const rotary = createRotaryView(session, hooks.kick);
  const keys = createKeysView(session, hooks.kick);
  const lights = createLightsView();
  const keyed = createKeyboardView(session, hooks.kick);
  keyboard = keyed;
  // THE INQUIRY LENS READS THE DEVICE'S LATCH, not the session's hold, and the two are different
  // latches on purpose (plan §6.6). `Console1415.pendingRequest` is the 1411's own inquiry-request
  // flag — set by the key, cleared inside `precheck()` (`console1415.ts:199`) and `read()` (`:290`,
  // `:316`) — and it is CORRECT for the lamp: the lamp goes out when the program takes the entry.
  // `ConsoleSession.held` is the UI's own latch, which holds the animation frame from REQUEST to
  // RELEASE and would leave the lens lit after the device had already answered. This is the
  // identical expression the deleted `unitrecord/inquiryView.ts:68` read.
  const inquiry = createInquiryView(session, hooks.kick, () => machine.console.pendingRequest);

  // THE DESK, top to bottom: the paper at the platen; the control cabinet at the operator's right,
  // its MODE switch above its keys and the CE door closed beside them; then the indicator panel on
  // its stand ABOVE the keyboard (plan §1 step 14, console-and-physical.md §1); then the keyboard
  // itself; then the three repurposed levers at its right — INQUIRY REQUEST, INQUIRY RELEASE and
  // INQ CAN (console-and-physical.md §2 [verified]).
  const el = make('div');
  el.append(make('hr'), heading, log.el, rotary.el, keys.el, lights.el, keyed.el, inquiry.el);
  host.append(el);

  // ONE mount call per view. The order here is the RENDER order and it is the DOM order above.
  const views: readonly View[] = [log, rotary, keys, lights, keyed.view, inquiry];
  return { el, views, session };
}
