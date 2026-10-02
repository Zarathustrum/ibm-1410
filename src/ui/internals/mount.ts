// src/ui/internals/mount.ts — the INTERNALS tab, mounted into a host element the page owns.
// Source: Phase-4 plan §3.1 (wave 0's file table), §10.1 (the shell), §10.2 (the `mountInternals`
// paragraph and the one animation frame); docs/plans/architecture.md §6 "Internals surface", §12.
//
// This is `src/ui/internals/main.ts`'s body MINUS the four things that became the page's:
// `createMachine`, the `#app` lookup, the RUN loop, and the three sibling period mount calls.
// `src/ui/main.ts` owns all four now (plan §10.1). The mount APPENDS into `host` — `main.ts`'s
// `<div id="internals">` — so the returned `View` is the whole return.
//
// The page is a deliberate anachronism and says so at the top: the 1410 displayed none of this
// (research/console-and-physical.md §2 — no register contents in lights). DECISIONS.md 2026-08-30
// settles it as its own panel, separate from the period UI.
//
// WHAT THIS FILE DOES NOT DO: it never calls `createMachine`, never looks an element up by id,
// never calls `requestAnimationFrame`, and never edits `controls.ts`. The stale MODE `<select>`
// (`controls.ts:53-59`, set by the operator and never re-read from `machine.mode`) is a known
// display-only defect whose fix is the live label BELOW, not a two-line accessor inside the
// byte-frozen file (plan §10.4).
//
// AND THE LABEL NOW CARRIES THE OTHER SURFACE'S POSITION TOO (`modeNote` below) — PHASE-4-NOTES.md
// §4's M2, whose first candidate fix this is: "surface the disagreement on the internals note".
// The `<select>` is still the frozen control §14 R6 records; what changed is that a START pressed
// here while the machine-room rotary is elsewhere no longer looks like a machine that simply
// stopped working.

import type { Machine } from '../../core/machine.js';
import type { MachineState } from '../../core/types.js';
import { createControls } from './controls.js';
import { createPanel, make, type View } from './panel.js';

// Moved from internals/main.ts:16-18, and from wave 4 it feeds TWO readers of `machine.mode`: the
// panel's note string, and the live MODE label drawn above `controls.el` (plan §10.4).
// THE LAST TWO ARE NOT `machine.mode` VALUES: `ConsoleMode` has four members (machine.ts:38) and
// DISPLAY and C.E. are detents only the machine-room rotary reaches (plan §6.2). They are here
// because this table now labels the ROTARY's position as well, for the sentence below.
const MODE_LABEL: Readonly<Record<string, string>> = {
  run: 'RUN', addressSet: 'ADDRESS SET', alter: 'ALTER', ieCycle: 'I/E CYCLE',
  display: 'DISPLAY', ce: 'C.E.',
};

/**
 * THE HEADLINE THIS TAB DRAWS, and the whole of M2's fix (PHASE-4-NOTES.md §4).
 *
 * The page's execute gate is four terms — `running && !held && detent === 'run' && machine.mode
 * === 'run'` (`src/ui/main.ts`) — and TWO SURFACES each move only one of the middle pair: the
 * machine-room rotary owns `detent`, and the byte-frozen `<select>` beside this label owns
 * `machine.mode`. Turn the rotary to DISPLAY, come here, press START: `running` latches, the gate
 * is shut on `detent`, nothing executes, and this label used to read a confident `MODE = RUN`
 * because `machine.stop()` is `{ fieldLine('S'); }` and leaves the façade's mode alone. The
 * MIRROR is the same silence from the other side — the `<select>` moves the mode while the drawn
 * dial still reads RUN.
 *
 * So the label states BOTH positions whenever they differ, and names the condition the gate
 * actually applies. It is a pure function of two strings so a node test can assert the sentence
 * without a DOM; it is the only thing on this tab that knows the machine room exists, and it
 * learns it through a hook rather than an import, because `src/ui/internals` may not reach into
 * `src/ui/period` (test/period-is-dom-free.test.ts's last case: the ONE crossing is
 * `panel.ts -> console/selectric.js`).
 */
export function modeNote(mode: string, rotary: string | undefined): string {
  const label = MODE_LABEL[mode] ?? mode;
  if (rotary === undefined || rotary === mode) return `MODE = ${label}`;
  const there = MODE_LABEL[rotary] ?? rotary;
  return `MODE = ${label} — the machine-room MODE switch is at ${there}, and nothing executes `
    + 'until both are at RUN.';
}

/** The page's run latch and its repaint request. `main.ts` supplies all four (plan §10.2). */
export interface InternalsHooks {
  /** MODE = RUN: the page's frame drives `start()` until it stops. */
  run(): void;
  halt(): void;
  kick(): void;
  /** WHERE THE MACHINE-ROOM ROTARY POINTS — `ConsoleSession.detent` as a plain string, read fresh
   *  on every render. A STRING and not a `PeriodMode`, and a hook and not an import, because this
   *  surface may not reach into `src/ui/period`: `main.ts` owns both mounts and is the one place
   *  the two tabs meet. */
  rotary(): string;
}

export function mountInternals(
  machine: Machine, host: HTMLElement, hooks: InternalsHooks,
): { readonly view: View } {
  // THE ADAPTER, AND BOTH HALVES OF IT ARE LOAD-BEARING (plan §10.2). `panel.render` takes a
  // REQUIRED note string the page's frame does not carry, and the panel is built in here, so the
  // note is kept as this mount's own and folded in at render time. `controls.ts:39`'s
  // `redraw(message?: string)` arrives with `message === undefined` on RUN and on STOP — assigning
  // it raw would print the literal `undefined` on the panel — and internals/main.ts:26's
  // three-space separator is what keeps the message clear of the MODE label.
  let note = '';

  const panel = createPanel({
    base(addr: number): void { machine.windowBase = addr; hooks.kick(); },
  });

  const controls = createControls(machine, {
    run: hooks.run,
    halt: hooks.halt,
    redraw(message?: string): void {
      note = message === undefined ? '' : `   ${message}`;
      hooks.kick();
    },
  });

  const anachronism = make('div', 'anachronism');
  anachronism.textContent = 'Internals view — anachronistic; the 1410 never displayed this';
  // THE LIVE MODE LABEL (plan §10.4) — the fix for the stale `<select>` that is NOT an edit, because
  // `controls.ts` is byte-frozen (§13 criterion 3). It reads `machine.mode` on every redraw, so a
  // turn of the period rotary shows HERE while the frozen `<select>` beside it still reads what the
  // operator last picked: §14 R6's named residual, stated rather than hidden.
  const modeLabel = make('div');
  modeLabel.style.fontWeight = 'bold';
  // The hairline rule, the note, the live label, then `controls.el` and `panel.el` IN THAT ORDER —
  // internals/main.ts:49's order, kept so the tab looks like the shipped page.
  host.append(make('hr'), anachronism, modeLabel, controls.el, panel.el);

  return {
    view: {
      el: host,
      render(s: MachineState): void {
        // ONE composed sentence, drawn twice: as the live label and as the panel's note. The
        // rotary is read on every render, so the disagreement appears the moment either surface
        // moves and goes when they agree again.
        const headline = modeNote(machine.mode, hooks.rotary());
        modeLabel.textContent = headline;
        panel.render(s, `${headline}${note}`);
      },
    },
  };
}
