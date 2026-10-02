// src/ui/period/printer/formView.ts — the IBM 1403 MODEL 2's paper as it stands in the room: the
// form at the platen, the printed stack behind it, and the one control that belongs to the paper
// rather than to a panel.
// Source: Phase-4 plan §7.2 ("The form", "The printed stack", "What does not appear on this
// paper: word marks"), §3.3's formView row, §10.3 (inline style attributes — src/ui/styles/
// period.css is wave 5's), §11 wave 2. The bar rule and the `max-content` fix are carried across
// from `unitrecord/printerView.ts:61-70`, `:72-78` and `:95`, which this wave deletes.
//
// WHICH MACHINE: the 1403 Model 2 on a 1410 — 132 print positions at 10 cpi
// (console-and-physical.md §8 [verified], A22-0526-3 p.67), on the form this shop's carriage tape
// is punched for (`machine.printer.tape.formLines`, handed over at construction, the same object
// the device skips against). Never a 1401.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · It computes no number. `paginate` (`paper/page.ts`, wave 1) has already emitted every line
//    position of every form, blanks included, each padded to `PRINT_POSITIONS`; this file sets
//    `textContent` from `FormPage.lines` and counts, indexes and formats — nothing else (plan §0
//    bullet 1). `PRINT_POSITIONS` and `LINES_PER_BAR` are IMPORTED from `paper/page.ts` and are
//    not redeclared here; the form length comes from the tape.
//  · It prints no dimension in inches, no lines-per-minute figure and no time unit (plan §2.2).
//    600 lpm (A22-0526-3 p.67) is a SPEED spec and nothing here animates at it.
//  · It draws no word mark and no overstrike — see `NO_WORD_MARKS_ON_THE_1403_PAGE` below.
//  · It draws no 1403 key. END OF JOB below is the EMULATOR's control and is captioned as one;
//    Fig.69's and Fig.70's legends are `printer/panelView.ts`'s and contain no END OF JOB (§7.2).
//  · It carries no CSS class of its own beyond `.green-bar`, which `index.html:34` already rules
//    (plan §10.3's class inventory); every other rule here is an inline style attribute, exactly
//    as `printerView.ts:95` and `sourceBox.ts:118-119` do today.

import type { CarriageTape } from '../../../core/devices/printer1403.js';
import type { MachineState } from '../../../core/types.js';
import { make, type View } from '../dom.js';
import { LINES_PER_BAR, PRINT_POSITIONS, paginate, type FormPage } from '../paper/page.js';

/**
 * OPEN: `LINES_PER_BAR_IS_THREE` — `[likely]`, modern vendor specs.
 *
 * Green-bar stock 14 7/8 x 11 in with 1/2 in bars is THREE line positions to a bar at 6 lpi
 * (console-and-physical.md §8's green-bar row and §13 row 7 — pdp8online greenbar; the one row of
 * §8's table its sources do not verify). Four at 8 lpi.
 *
 * FALLBACK TAKEN: shade every other run of `LINES_PER_BAR` line positions, and take the number
 * from `paper/page.ts`'s `LINES_PER_BAR = 3` — which carries the citation and is asserted in node
 * — rather than declaring a second 3 in a file that touches the DOM. **A wrong pitch costs a
 * shade and nothing else**, and the plain-white toggle below is its own fallback.
 *
 * WHAT WOULD SETTLE IT: an IBM forms specification for the stock a 1961-65 1410 site ran. Until
 * then the number lives once, in `paper/page.ts`, and this view imports it.
 */
export const LINES_PER_BAR_IS_THREE = true;

/**
 * OPEN: `GREEN_BAR_IS_THE_DEFAULT_WITH_A_WHITE_TOGGLE` — `[unverified]`.
 *
 * Whether 1961-65 1410 sites ran green-bar stock or plain white is published nowhere
 * (console-and-physical.md §13 row 8; architecture.md §6).
 *
 * FALLBACK TAKEN: green bar drawn by default, plain white one click away — carried across from
 * `printerView.ts:61-70` with its own reading of the case: **the toggle IS the fallback**, not a
 * setting buried in a menu, and bars off is the honest way to read a page.
 *
 * WHAT WOULD SETTLE IT: a period photograph of a 1410 installation's printer with paper in it, or
 * an IBM forms order. Phase 6's trajectory report needs the white side (plan §16 item 8c).
 */
export const GREEN_BAR_IS_THE_DEFAULT_WITH_A_WHITE_TOGGLE = true;

/**
 * OPEN: `FORM_FEED_IS_A_SLIDE_NOT_A_SIMULATION` — refused as simulation, not a machine claim.
 *
 * The 1403 Model 2 prints at 600 lpm (console-and-physical.md §8 [verified], A22-0526-3 p.67).
 * **That is a SPEED spec, not a motion spec**: animating paper at it would imply the
 * cycle-accurate timing DECISIONS.md 2026-08-30 refuses, for the same reason
 * `microsecondsSimulated` is never rendered as a clock (architecture.md §6, §12; plan §2.2).
 *
 * FALLBACK TAKEN: a form that has just been ejected slides onto the stack in ONE transform of
 * 200 ms and nothing else moves; lines appear as the device prints them. The transform is run
 * through `Element.animate` rather than a CSS transition because a transition needs either a class
 * (wave 5 owns `period.css`) or a second frame to flip the property (`requestAnimationFrame` is
 * `src/ui/main.ts`'s and the mount's alone, plan §10.2).
 *
 * WHAT WOULD SETTLE IT: nothing external. Change the duration or drop the transform entirely —
 * nothing computes from it and no test reads it.
 */
export const FORM_FEED_IS_A_SLIDE_NOT_A_SIMULATION = true;

/**
 * OPEN: `NO_WORD_MARKS_ON_THE_1403_PAGE` — a RECORD of a `[verified]` fact, no fallback wanted.
 *
 * Under the `L` (load) op code a word mark is translated to a WORD-SEPARATOR character on the way
 * to the print buffer, and there is no word-separator print slug — so a BLANK precedes each
 * word-marked character on the page (charset.md §7 [verified]; A22-0526-3 p.80 Figure 88).
 *
 * FALLBACK TAKEN: none wanted. The form draws no overstrike and no mark of any kind, and the one
 * line below it says what the blank is. It is recorded rather than left to inference so that
 * nobody carries the 1415 Selectric's inverted circumflex (plan §6.1) onto the green bar to make
 * the two surfaces agree — they are different machines printing different things.
 *
 * WHAT WOULD SETTLE IT: nothing. The sentence is `[verified]` and the drawing already obeys it.
 */
export const NO_WORD_MARKS_ON_THE_1403_PAGE = true;

/**
 * How often the ruler under the heading names a position: decimal labelling of the print
 * positions, and NOT the 10 cpi character pitch it happens to share a digit with (A22-0526-3
 * p.67). Nothing on the page is measured in it.
 */
const RULER_DECADE = 10;

/** The bar, in greyscale — `printerView.ts:38`'s colour, inline until `period.css` takes it. */
const BAR_SHADE = '#ececec';

/** The one 200 ms transform of `FORM_FEED_IS_A_SLIDE_NOT_A_SIMULATION`, and the whole of it. */
const FORM_SLIDE: Keyframe[] = [
  { transform: 'translateY(-1.5em)', opacity: 0.35 },
  { transform: 'none', opacity: 1 },
];

type PrinterState = MachineState['printer'];

/** `>` or a blank, the line position, and the left edge of the print area. */
const gutter = (here: boolean, line: number): string =>
  `${here ? '>' : ' '}${String(line).padStart(3, '0')}|`;

/** The same width, with no line position on it — what the ruler and the captions are indented by. */
const RULER_GUTTER = `${' '.repeat(gutter(false, 1).length - 1)}|`;

export function createFormView(tape: CarriageTape, onEndOfJob: () => void): View {
  // §13's fallback for the `[likely]` bar pitch, and the honest way to read a page: bars off.
  // Carried from `printerView.ts:61-70`, including the repaint-from-the-last-frame rule: a click
  // is not a frame, so the toggle repaints what was last rendered rather than waiting for one.
  let bars = true;
  const toggle = make('button');
  const relabel = (): void => { toggle.textContent = bars ? 'plain white' : 'green bar'; };
  toggle.addEventListener('click', () => {
    bars = !bars;
    relabel();
    if (last !== undefined) paint(last);
  });
  relabel();

  const heading = make('div');
  heading.textContent =
    `1403 Model 2 — the form at the platen and the printed stack, ${PRINT_POSITIONS} print `
    + `positions across a ${tape.formLines}-line form`;

  const status = make('div');

  // The lines live in a max-content wrapper, not directly in the <pre>: a block child of a
  // horizontally scrolled box paints its background only to the VISIBLE width, so a shaded bar
  // would stop at the scroll edge instead of running the length of the form.
  // (`printerView.ts:72-78`, carried verbatim.) The ruler is INSIDE the same wrapper, so it
  // scrolls with the form rather than sitting above a box that moves under it (§7.2).
  const lines = make('div');
  lines.style.width = 'max-content';
  const sheet = make('pre', 'green-bar');
  sheet.append(lines);

  // The word separator, said once, under the paper it is not printed on.
  const wordMarks = make('div');
  wordMarks.textContent =
    'Under the L op code a word mark becomes a word separator, which has no chain slug — so a '
    + 'BLANK precedes each word-marked character above. The form draws no overstrike '
    + '(charset.md §7 [verified], A22-0526-3 p.80 Figure 88).';

  // END OF JOB — AT THE PAPER STACK and captioned as the emulator's, because §8's Fig.69 / Fig.70
  // inventory contains no such key and putting one among those legends would invent a control the
  // machine did not have (§7.2).
  const endOfJob = make('button');
  endOfJob.textContent = 'END OF JOB';
  endOfJob.addEventListener('click', onEndOfJob);
  const endOfJobNote = make('div');
  endOfJobNote.textContent =
    'END OF JOB is this emulator\'s control and not a 1403 key — the front panel has none. It is '
    + 'the operator tearing the form off: it performs the automatic single space the last print '
    + 'armed and nothing else (machine.ts:139-148, :453).';

  const el = make('div');
  el.append(heading, status, toggle, sheet, wordMarks, endOfJob, endOfJobNote);

  let last: PrinterState | undefined;
  let key = '';
  let painted = false;
  const ejected = new Set<number>();

  /** One line position: the gutter, then the 132 positions exactly as `paginate` padded them. */
  function lineRow(line: number, text: string, here: boolean): HTMLElement {
    const e = make('div');
    e.textContent = gutter(here, line) + text;
    if (bars && Math.floor((line - 1) / LINES_PER_BAR) % 2 === 0) e.style.background = BAR_SHADE;
    return e;
  }

  /** The 132-position ruler: the tens above, the units below, both on the print area's left edge. */
  function ruler(): readonly HTMLElement[] {
    // Each decade's label right-aligned in its own ten positions, so it ENDS on the position it
    // names; the units row under it counts the positions themselves.
    let tens = '';
    for (let p = RULER_DECADE; p <= PRINT_POSITIONS; p += RULER_DECADE) {
      tens += String(p).padStart(RULER_DECADE, ' ');
    }
    const units = Array.from({ length: PRINT_POSITIONS }, (_, i) => String((i + 1) % 10)).join('');
    return [tens.padEnd(PRINT_POSITIONS, ' '), units].map((cells) => {
      const e = make('div');
      e.textContent = RULER_GUTTER + cells;
      e.style.color = '#666';
      return e;
    });
  }

  /** Which form this is and where it now sits — the page rule of `printerView.ts:99-106`. */
  function formRule(page: FormPage, line: number): HTMLElement {
    const e = make('div');
    e.textContent = page.complete
      ? `${RULER_GUTTER}form ${page.form} — torn off, on the printed stack`
      : `${RULER_GUTTER}form ${page.form} — at the platen, carriage on line ${line}`;
    e.style.color = '#666';
    if (page.form !== 1) { e.style.borderTop = '1px solid #999'; e.style.marginTop = '.4em'; }
    return e;
  }

  function paint(p: PrinterState): void {
    const c = p.carriage;
    // `autoSpacePending` is the automatic single space the last print ARMED and the device has
    // not performed — it is carriage motion, so `snapshot()` never performs it (io.md §7;
    // types.ts:385-390), and END OF JOB above is what discharges it (`machine.ts:453`).
    status.textContent =
      `carriage: form ${c.page}, line ${c.line}   `
      + `${p.paper.length} line${p.paper.length === 1 ? '' : 's'} printed`
      + (c.autoSpacePending ? '   · space armed — END OF JOB performs it' : '');

    // The stack and the form are ONE paper, in `paginate`'s own ascending order: every form the
    // paper reached, all of its line positions, blanks included (§7.2, `paper/page.ts` rule 1).
    const pages = paginate(p.paper, c, tape.formLines);
    const out: HTMLElement[] = [...ruler()];
    for (const page of pages) {
      const form = make('div');
      form.append(formRule(page, c.line));
      for (const [index, text] of page.lines.entries()) {
        const line = index + 1;
        form.append(lineRow(line, text, !page.complete && line === c.line));
      }
      // ONE 200 ms transform, on the frame a form is first seen ejected, and never on the first
      // paint — the whole of FORM_FEED_IS_A_SLIDE_NOT_A_SIMULATION.
      if (page.complete && painted && !ejected.has(page.form)) {
        form.animate(FORM_SLIDE, { duration: 200, easing: 'ease-out' });
      }
      if (page.complete) ejected.add(page.form);
      out.push(form);
    }
    lines.replaceChildren(...out);
    painted = true;
  }

  // Plan §14 R7 and §10.2's per-view diff key, carried from `printerView.ts:144-155`: the paper is
  // append-only — a `PrintLine` is never rewritten — so its length plus the five carriage fields is
  // the whole of what can change.
  return {
    el,
    render(s: MachineState): void {
      const p = s.printer;
      const c = p.carriage;
      const next = `${p.paper.length}|${c.page},${c.line},${c.channel9},${c.channel12},${c.autoSpacePending}`;
      if (next === key) return;
      key = next;
      last = p;
      paint(p);
    },
  };
}
