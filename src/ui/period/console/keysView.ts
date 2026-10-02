// src/ui/period/console/keysView.ts — the 1415 control console's KEYS: the power/control cluster
// and the three operating keys on the lower shelf, with the one light that is not on the indicator
// panel.
// Source: Phase-4 plan §3.3's keysView row, §6.2 and §6.3 (the dialogue START and COMPUTER RESET
// drive), §7.1's `POWER_AND_READY_ARE_DRAWN_LIT` row (cited, not redeclared), §10.3 (inline style
// attributes — src/ui/styles/period.css is wave 5's), §11 wave 4, §15.
//
// WHICH MACHINE: the IBM 1415 Console's control cabinet on a 1410 ([verified] —
// console-and-physical.md §3, A22-0526-3 Fig.47 p.49, Fig.48 p.52; S223-2648 Fig.2 p.7):
// "Power/control keys: EMERGENCY OFF (pull, latches, CE reset only), COMPUTER RESET, DC OFF, READY
// (light), POWER OFF, POWER ON (illuminated key). Control keys START, STOP, PROGRAM RESET on the
// lower shelf." Nine legends, published in that order and drawn in it. Never a 1401: there is no
// LOAD key anywhere on this system (software.md §10.1, §10.10) and the 1410 bootstrap is KEYED
// here at the 1415, which is what `ConsoleSession.keyBootstrap` exists for.
// The optional priority-feature panel §3 puts on the shelf above START and STOP is refused with
// the feature it belongs to and is not drawn (plan §2.2; architecture.md §12).
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It computes nothing and holds no machine state.** Every legend is §3's own text; every
//    action is one `ConsoleSession` call, and the session owns the dispatch (plan §0 bullet 1).
//  · **It wires no power key.** EMERGENCY OFF, POWER ON, POWER OFF and DC OFF are [verified]
//    controls with no counterpart on this emulator's façade — `Machine` has no power — so they are
//    drawn and SAID to be inert rather than drawn looking live and doing nothing, the same
//    treatment `reader/keysView.ts` gives PUNCH START, PUNCH STOP and READER STOP (plan §7.1).
//  · **No key travels.** `NO_KEY_TRAVEL_ANIMATION` is declared at its point of use in
//    `console/rotaryView.ts` and cited here, not redeclared: a pressed key gets an inset border and
//    a colour while it is held, and nothing else — no depth, no timer, no travel (plan §6.5, §15).
//  · **It binds no `keydown` and no `keypress`, and adds no listener to `document` or `window`**
//    (plan §6.5 rulings 1-2). Clicking START moves the browser's focus to the START button, which
//    is exactly why `ConsoleSession` fires its `focus` hook whenever the keyboard unlocks — this
//    view is the SIBLING that would otherwise hold the focus the next keystroke needs (ruling 5).
//  · It draws no rotary and no indicator lamp: `console/rotaryView.ts` has the MODE switch and the
//    CE door, and `console/lightsView.ts` has the §5 panel's boxes.
//  · It prints no dimension in inches and no time unit (plan §2.2).
//  · It carries no CSS class of its own; `period.css` is wave 5's (plan §10.3).
//  · **It creates no node at import time**: the three tables below are DATA, so a `node` run can
//    assert the drawn strings without a DOM (`reader/cardFaceView.ts`'s rule; vite.config.ts:8-11).

import { make, type View } from '../dom.js';
import type { ConsoleSession } from './session.js';

/** One control on the cabinet: what it is, its silkscreened legend, and which cluster it sits in. */
interface Control {
  readonly kind: 'key' | 'light';
  readonly label: string;
  readonly cluster: 'power' | 'shelf';
}

/**
 * §3's own order, read as the bullet publishes it: the power/control cluster first, then the three
 * operating keys on the lower shelf ([verified] — console-and-physical.md §3, A22-0526-3 Fig.47
 * p.49). Nine entries, and unlike Fig.60's 1402 strip every legend here occurs exactly once, which
 * is why the wiring table below may key by label.
 */
const CONTROLS: readonly Control[] = [
  { kind: 'key', label: 'EMERGENCY OFF', cluster: 'power' },
  { kind: 'key', label: 'COMPUTER RESET', cluster: 'power' },
  { kind: 'key', label: 'DC OFF', cluster: 'power' },
  { kind: 'light', label: 'READY', cluster: 'power' },
  { kind: 'key', label: 'POWER OFF', cluster: 'power' },
  { kind: 'key', label: 'POWER ON', cluster: 'power' },
  { kind: 'key', label: 'START', cluster: 'shelf' },
  { kind: 'key', label: 'STOP', cluster: 'shelf' },
  { kind: 'key', label: 'PROGRAM RESET', cluster: 'shelf' },
];

/** The eight drawn key legends and the one drawn light, DERIVED — never a second list. */
export const CONSOLE_KEYS: readonly string[] =
  CONTROLS.filter((c) => c.kind === 'key').map((c) => c.label);
export const CONSOLE_LIGHTS: readonly string[] =
  CONTROLS.filter((c) => c.kind === 'light').map((c) => c.label);

/**
 * The two legends drawn lit because the machine in the room is ON — the illuminated POWER ON key
 * and the separate READY light (console-and-physical.md §3 [verified]: "POWER ON illuminates;
 * separate READY light", A22-0526-3 Fig.47 p.49).
 *
 * This is `POWER_AND_READY_ARE_DRAWN_LIT`'s second half, and the row is DECLARED at its first point
 * of use in `reader/keysView.ts` (wave 3) and CITED here, never declared a second time: that file's
 * `// OPEN:` block already names all three constant-lit legends — the 1402 strip's POWER light and
 * this cabinet's two. Neither of these is in `PANEL_BOXES` (`console/lamps.ts`), so no `Lamp`
 * record and no `source` field is involved; they are lit because this list names them, and the view
 * captions them as constants on the page. Nothing is wired to either.
 * Plan §7.1, §15; open-questions.md, Phase 4 / Wave 3.
 */
export const LIT_CONSTANTS: readonly string[] = ['POWER ON', 'READY'];

/**
 * The four keys the façade can act on, and every one of them goes through `ConsoleSession` rather
 * than through `Machine`: START dispatches on the ROTARY's detent and never on `machine.mode`
 * (plan §6.2), STOP halts the run latch as well as printing its `S`, and both resets COMMIT a
 * pending entry before they fire (plan §6.4). Reaching past the session for `machine.stop()` here
 * would type the line and leave the frame running.
 */
const WIRED: Readonly<Record<string, (s: ConsoleSession) => void>> = {
  START: (s) => { s.startKey(); },
  STOP: (s) => { s.stopKey(); },
  'PROGRAM RESET': (s) => { s.programReset(); },
  'COMPUTER RESET': (s) => { s.computerReset(); },
};

/** The four [verified] power controls with no counterpart on this emulator, DERIVED from `WIRED`. */
export const INERT_KEYS: readonly string[] = CONTROLS
  .flatMap((c) => (c.kind === 'key' && WIRED[c.label] === undefined ? [c.label] : []));

// One lamp colour, warm white behind a clear lens; nothing is red (plan §2.2 fact 1). The three
// values are `reader/keysView.ts`'s, and wave 5 hoists them into `--lamp-dark` / `--lamp-lit` /
// `--lamp-lens` under `LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS` (plan §10.3).
const LAMP_DARK = '#3a3a3a';
const LAMP_LIT = '#f2ecd2';
const LEGEND = '#e8e8e8';

/** The pressed state, and the whole of it: an inset border and a colour while the key is held. */
const PRESSED = 'inset 0 1px 3px rgba(0,0,0,.55)';

function light(label: string): HTMLElement {
  const e = make('span');
  e.textContent = label;
  const lit = LIT_CONSTANTS.includes(label);
  e.style.display = 'inline-block';
  e.style.background = lit ? LAMP_LIT : LAMP_DARK;
  e.style.color = lit ? '#222' : LEGEND;
  e.style.border = `1px solid ${LAMP_DARK}`;
  e.style.padding = '.2em .5em';
  e.style.margin = '0 .4em .4em 0';
  return e;
}

function key(control: Control, session: ConsoleSession, kick: () => void): HTMLElement {
  const e = make('button');
  e.textContent = control.label;
  e.style.margin = '0 .4em .4em 0';
  if (LIT_CONSTANTS.includes(control.label)) {
    // The illuminated key: the legend itself is backlit, which is what §3's "(illuminated key)"
    // names. It is still inert — the light is a constant, not a state.
    e.style.background = LAMP_LIT;
    e.style.color = '#222';
  }
  const press = WIRED[control.label];
  if (press === undefined) {
    e.setAttribute('disabled', '');
    e.setAttribute('title', 'drawn and inert: this emulator has no power sequence');
    return e;
  }
  // An operator action, so it redraws the whole page the way every console control does
  // (`reader/keysView.ts`, carried across).
  e.addEventListener('click', () => { press(session); kick(); });
  // The pressed state and nothing more — no travel, no depth, no timer (`NO_KEY_TRAVEL_ANIMATION`,
  // declared in `console/rotaryView.ts`).
  e.addEventListener('pointerdown', () => { e.style.boxShadow = PRESSED; });
  e.addEventListener('pointerup', () => { e.style.boxShadow = ''; });
  e.addEventListener('pointerleave', () => { e.style.boxShadow = ''; });
  return e;
}

const line = (t: string): HTMLElement => {
  const e = make('div');
  e.textContent = t;
  return e;
};

function cluster(which: Control['cluster'], session: ConsoleSession, kick: () => void): HTMLElement {
  const e = make('div');
  e.style.margin = '.4em 0';
  e.append(...CONTROLS
    .filter((c) => c.cluster === which)
    .map((c) => (c.kind === 'key' ? key(c, session, kick) : light(c.label))));
  return e;
}

export function createKeysView(session: ConsoleSession, kick: () => void): View {
  const heading = make('div');
  heading.textContent = 'Control console — keys, Figure 47 in published order';

  const el = make('div');
  el.append(
    heading,
    line('Power and control cluster'),
    cluster('power', session, kick),
    line('Lower shelf'),
    cluster('shelf', session, kick),
    line('EMERGENCY OFF, POWER ON, POWER OFF and DC OFF are drawn and inert: this emulator has no '
      + 'power sequence for them to act on.'),
    line('POWER ON and READY are drawn lit as CONSTANTS, because the machine in the room is on. '
      + 'Nothing is wired to either.'),
    line('START acts on the position the MODE switch is in, not on the mode the processor is in: '
      + 'in RUN it starts the machine, in DISPLAY it unlocks the keyboard for a five-digit address, '
      + 'and in ALTER it unlocks it for the positions the last display printed. AN ALTER MUST '
      + 'FOLLOW A DISPLAY: with nothing displayed — on a fresh page, after an address the machine '
      + 'refused, or after an alter, which uses its display up — START in ALTER unlocks nothing and '
      + 'says so at the keyboard. In ADDRESS SET, I/E CYCLE and C.E. it does nothing on this desk.'),
    line('COMPUTER RESET is program reset plus start reset, and it clears the check circuits and '
      + 'the machine indicators; the instruction address register goes to 00001. It also commits '
      + 'an alter entry that is still being typed.'),
  );

  return {
    el,
    // Nothing on this cabinet reads the snapshot: the four wired keys act, the four power keys are
    // inert, and both lit legends are constants. The one live label on the page — the MODE the
    // processor is in — is the internals tab's (plan §10.4), and the dial's own position is
    // `console/rotaryView.ts`'s render.
    render(): void { /* no snapshot field reaches this view */ },
  };
}
