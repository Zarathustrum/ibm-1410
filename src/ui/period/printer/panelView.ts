// src/ui/period/printer/panelView.ts — the IBM 1403 MODEL 2's front panel, drawn DARK, in the
// research's own wording and in its own order.
// Source: Phase-4 plan §7.2 ("The front panel, drawn dark, in §8's own wording"), §3.3's panelView
// row, §10.3 (inline style attributes — src/ui/styles/period.css is wave 5's), §11.3's first
// screenshot question (the Fig.69 rows in order), §12.1 T0, §11 wave 2.
//
// WHICH MACHINE: the 1403 Model 2 on a 1410. console-and-physical.md §8 [verified] —
// A22-0526-3 pp.68-69, Figs.69-71 — states it as ONE SENTENCE about two rows, and this file
// reproduces it as two rows and DOES NOT SPLIT IT INTO KEYS AND LIGHTS, because §8 does not:
//   Fig.69 top row     PRINT READY, END OF FORMS, FORMS CHECK
//   Fig.69 second row  CARRIAGE RESTORE, CARRIAGE SPACE, SINGLE CYCLE, PRINT CHECK, SYNC CHECK,
//                      with CHECK RESET and CARRIAGE STOP
//   Fig.70             PRINT START (dark key) / PRINT STOP (light key), repeated on the rear
//
// THE 1401 FACT THIS PANEL IS MOST LIKELY TO INHERIT, NAMED AND REFUSED (plan §2.2 fact 1, §16
// item 2): END OF FORMS and FORMS CHECK do NOT glow red on fault here. console-and-physical.md §11:
// "1415 lamp/lens color has no primary source … The claim that labels light up red on fault is from
// a **1401** page and does **not** transfer to the 1415" [unverified for 1410]. Every legend on
// this panel is drawn in ONE lamp colour behind a clear lens, dark, with its group marked by a
// silkscreened border and never by a lens colour — the two rulings
// `LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS` and `LAMP_GROUPS_ARE_SILKSCREEN_NOT_LENS_COLOUR`, whose
// §15 ledger rows and CSS custom properties are WAVE 4's and WAVE 5's, not this file's.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It draws no END OF JOB key.** §8's Fig.69 / Fig.70 inventory contains none, and
//    `machine.endOfJob()` is this emulator's own control — it lives at the paper stack in
//    `printer/formView.ts`, captioned as the emulator's (plan §7.2).
//  · It wires nothing. No legend here has a `MachineState` field behind it, PRINT READY and PRINT
//    CHECK included, so nothing lights and no key acts.
//  · **It creates no node at import time** — the label tables below are DATA so that a `node` run
//    can assert the drawn strings without a DOM (`reader/cardFaceView.ts`'s rule, plan §3.3,
//    §12.1 T0; `vite.config.ts:8-11` sets `environment: 'node'`).
//  · It carries no CSS class of its own: `src/ui/styles/period.css` is wave 5's (plan §10.3).

import { make, type View } from '../dom.js';

/**
 * Fig.69's two rows, in published order (console-and-physical.md §8 [verified], A22-0526-3
 * pp.68-69). Row 2 keeps CHECK RESET and CARRIAGE STOP at its end, where the sentence puts them.
 */
export const PANEL_ROWS: readonly (readonly string[])[] = [
  ['PRINT READY', 'END OF FORMS', 'FORMS CHECK'],
  [
    'CARRIAGE RESTORE', 'CARRIAGE SPACE', 'SINGLE CYCLE', 'PRINT CHECK', 'SYNC CHECK',
    'CHECK RESET', 'CARRIAGE STOP',
  ],
];

/** Fig.70's pair — on the front, repeated on the rear (same citation). */
export const FRONT_KEYS: readonly string[] = ['PRINT START', 'PRINT STOP'];

/** One lamp colour, warm white behind a clear lens; drawn dark, because nothing here is wired. */
const LAMP_DARK = '#3a3a3a';
const LEGEND = '#e8e8e8';

/** A legend, dark: the lens, the silkscreened label on it, and no colour of its own. */
function legend(label: string): HTMLElement {
  const e = make('span');
  e.textContent = label;
  e.style.display = 'inline-block';
  e.style.background = LAMP_DARK;
  e.style.color = LEGEND;
  e.style.border = '1px solid #999';
  e.style.padding = '.2em .5em';
  e.style.margin = '0 .4em .4em 0';
  return e;
}

/** A group of legends inside one silkscreened box — the border is the grouping, not a colour. */
function group(labels: readonly string[]): HTMLElement {
  const e = make('div');
  e.style.border = '1px solid #999';
  e.style.padding = '.4em .4em 0';
  e.style.marginBottom = '.4em';
  e.append(...labels.map(legend));
  return e;
}

export function createPanelView(): View {
  const heading = make('div');
  heading.textContent = '1403 front panel — Figures 69 and 70, drawn dark';

  const rows = PANEL_ROWS.map(group);
  const keys = group(FRONT_KEYS);

  const rearNote = make('div');
  rearNote.textContent =
    'PRINT START is the dark key and PRINT STOP the light one; the pair is on the front and '
    + 'repeated on the rear (Figure 70).';

  const note = make('div');
  note.textContent =
    'Nothing on this panel is wired: no legend here has machine state behind it, PRINT READY and '
    + 'PRINT CHECK included, so all of it is drawn dark '
    + '(console-and-physical.md §8 [verified], A22-0526-3 pp.68-69).';

  const el = make('div');
  el.append(heading, ...rows, keys, rearNote, note);

  // The panel never changes, because nothing on it is wired — the render is the empty statement
  // that says so, and the frame's diff costs nothing.
  return { el, render(): void { /* drawn dark, once */ } };
}
