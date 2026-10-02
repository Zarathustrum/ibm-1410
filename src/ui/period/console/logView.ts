// src/ui/period/console/logView.ts — the 1415 console typewriter's PAPER: the pin-feed form on the
// platen, the log printed on it, and the line the operator has typed that the machine has not.
// Source: Phase-4 plan §6.1 (the option triple, and the 932 cpm reveal's point of use), §6.3 ("The
// 80-position rule" — "Phase 4 makes the fallback VISIBLE for the first time"), §3.3's logView row,
// §10.2 (`panel.ts:143-147`'s log length key, carried), §10.3 (inline style attributes —
// src/ui/styles/period.css is wave 5's), §11 wave 4, §15.
//
// WHICH MACHINE: the IBM 1415 Console's modified Selectric I/O printer on a 1410. Sphere type
// element, 64 characters, a word-mark symbol and an underscore for invalid parity; forms are
// pin-feed, feed holes at both margins ([verified] — console-and-physical.md §2, A22-0526-3 p.45,
// p.48, p.49; S223-2648 p.78 "Form Size", p.6). Never a 1401: this machine shows no register
// contents in lights, so every stop, display, alter and inquiry is on THIS paper (§ implementer
// summary item 2, [verified]).
//
// THE FORM'S PROPORTION, drawn and never labelled. S223-2648 p.78 gives form width 9 7/8 in with
// the two pin-hole columns 9 3/8 in apart and 1/2 in between holes down the margin, and A22-0526-3
// p.48 gives the index selector's single space = 6 lines/inch. So each hole column sits a quarter
// inch in from its edge — 2.5% of the width — and one hole spans three single-spaced line
// positions. Those two RATIOS are drawn below. **No dimension in inches is printed anywhere on
// this page** (plan §2.2): the paper is recognised by its proportion and its holes, not by a
// caption reciting a spec.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It computes no number that matters.** The 80 positions the form is ruled at are
//    `CONSOLE_LINE_LENGTH` (`src/core/machine.ts:105`), IMPORTED and never redeclared; the
//    indents, the ID characters, the word marks and the parity underscores are all
//    `renderSelectric`'s (wave 1's `console/selectric.ts`, plan §4.5). The only numbers declared
//    here are drawing ratios for the paper's own outline, and they are literals with their
//    citation, not arithmetic (plan §0 bullet 1).
//  · **It binds no `keydown` and no `keypress`, and adds no listener to `document` or `window`.**
//    The one file in the phase that listens for a keystroke is `console/keyboardView.ts`, on its
//    own `tabindex="0"` element (plan §6.5 rulings 1-2, `KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_
//    NEVER_ON_DOCUMENT`). This view draws the paper and reads the session; it takes no input.
//  · **It does not reveal the log at 932 cpm** — see `SELECTRIC_REVEAL_IS_DISPLAY_ONLY` below.
//  · It prints no dimension in inches and no time unit of any kind (plan §2.2, §13 criterion 18a).
//  · It carries no CSS class of its own; `period.css` is wave 5's (plan §10.3).

import { CONSOLE_LINE_LENGTH } from '../../../core/machine.js';
import type { ConsoleLine, MachineState } from '../../../core/types.js';
import { make, type View } from '../dom.js';
import { renderSelectric, type SelectricOpts } from './selectric.js';
import type { ConsoleSession, PendingEntry } from './session.js';

/**
 * THE OPTION TRIPLE THE BROWSER PRINTS AT, and the whole reason `SelectricOpts` is a parameter.
 *
 * `matrix: 'indent'` renders `matrixPos - 30` leading spaces, so the S / C / E / B / `#` / D-address
 * group sits five columns right of the D-data / A / I / R group — the visual signature of a 1410
 * job log (console-and-physical.md §2 [verified]; S223-2648 Fig.5 p.9; A22-0526-3 Fig.42 p.46).
 * `marks: 'render'` draws the inverted circumflex over a word-marked character and the underscore
 * under one with bad parity — both are what the real carrier does (A22-0526-3 p.49; S223-2648 p.6).
 * `spacing: 'render'` leaves the blank line before a double-spaced S / C / E line.
 *
 * The PRIMARY-SOURCE comparison runs at `{ matrix: 'flush', marks: 'strip', spacing: 'ignore' }`
 * and the internals panel at `{ matrix: 'flush', … }` — three different readers of one renderer,
 * which is why the switches exist at all (plan §6.1).
 */
const FORM_OPTIONS: SelectricOpts = { matrix: 'indent', marks: 'render', spacing: 'render' };

// OPEN: `SELECTRIC_RIBBON_IS_BLACK_SINGLE_COLOUR` — `[unverified]`, NEW IN PHASE 4.
// console-and-physical.md §2 describes the type element, the 64-character set and the
// error-underscore feature (A22-0526-3 p.45, p.49; S223-2648 p.6) and says NOTHING about ribbon
// colour; §11 is about cabinets, and every period photograph of this desk is black and white.
// FALLBACK TAKEN: black ink on off-white stock, ONE colour, and **no red shift on error** — §2's
// error convention is the UNDERSCORE `renderSelectric` already draws, so a red-on-error ribbon
// would invent a second signal on top of a documented one, and plan §2.2 fact 1 refuses the 1401
// red convention by name. The PENDING row below is therefore separated by weight and a dashed
// rule, never by a second ribbon colour. WHAT WOULD SETTLE IT: a colour photograph of a 1415 with
// a ribbon in it, or an IBM ribbon part number for the console printer. Wave 5 hoists `RIBBON`
// into the `--ribbon` custom property (plan §10.3); nothing computes from it and no test reads it.
// Plan §6.1, §10.3, §15; open-questions.md, Phase 4 / Wave 4.
export const SELECTRIC_RIBBON_IS_BLACK_SINGLE_COLOUR = true;

// OPEN: `SELECTRIC_REVEAL_IS_DISPLAY_ONLY` — a ruling of ours, display-only and OPTIONAL, and
// **THIS FILE IS ITS NAMED POINT OF USE** (plan §6.1's last paragraph, §15).
// THE REVEAL IS NOT BUILT. The drawn log MAY reveal at the Selectric's [verified] 932 characters
// per minute (console-and-physical.md §2; A22-0526-3 p.45) behind an instant toggle, but that
// would be a RENDERING rate over a log that is already final — never a simulation rate and never a
// CPU-timing claim (architecture.md §12; DECISIONS.md 2026-08-30). Wave 4 declined to build it:
// the form sets `textContent` from ONE `renderSelectric` call and the whole log is on the paper
// the frame it is produced. There is no timer, no `Element.animate`, no per-character reveal and
// no toggle anywhere in this file.
// AND NOTHING ELSE IN THE PHASE CHANGES, which is the row's own stated escape — it is off the
// critical path in the literal sense. If it is ever built, `reveal(log, Infinity) ===
// renderSelectric(log, FORM_OPTIONS)` is asserted as a fixed point, so no test ever reads through
// the reveal and the animation cannot lose a character a golden holds.
// Plan §6.1, §15 (line 3149); open-questions.md, Phase 4 / Wave 4.
export const SELECTRIC_REVEAL_IS_DISPLAY_ONLY = true;

// The ribbon and the stock. Wave 5 takes both as custom properties (plan §10.3). Nothing is red.
const RIBBON = '#1a1a1a';
const FORM_STOCK = '#f4f1e8';
/** The pending row's ink: the SAME ribbon, lighter, because nothing has struck the paper yet. */
const NOT_YET_STRUCK = '#8a8479';
const HOLE = '#d8d3c4';

// The two drawn ratios, as literals with their citation and no arithmetic (see the header).
/** Each pin-hole column a quarter inch in from its edge of a 9 7/8 in form ≈ 2.5% of the width. */
const HOLE_INSET = '2.5%';
/** One 1/2 in hole pitch spans three single-spaced line positions at 6 lpi — three × 1.3em. */
const HOLE_PITCH = '3.9em';
const LINE_HEIGHT = '1.3em';

/**
 * The 80-position ruling, drawn from `CONSOLE_LINE_LENGTH` and from nothing else.
 *
 * OPEN: `CONSOLE_LINE_LENGTH` (`src/core/machine.ts:105`) — an EXISTING open of the core's, cited
 * here and never redeclared, with its own §15 row: console-and-physical.md §2 gives the form and
 * the 64-character element and §4 the display/alter termination rule, and NEITHER gives a
 * characters-per-line figure — 80 is the chosen fallback, and `machine.ts:100` records the
 * consequence, that on a freshly cleared machine "an ALTER of 00000-00011 runs to the end of the
 * printer line". A DISPLAY of `00000` therefore prints 80 positions, not twelve. **Phase 4 makes
 * that fallback visible for the first time by ruling the paper at it** (plan §6.3), the same
 * treatment `DEFAULT_CARRIAGE_TAPE` got in Phase 2.
 */
const RULE = Array.from({ length: CONSOLE_LINE_LENGTH },
  (_unused, i) => ((i + 1) % 10 === 0 ? '|' : '·')).join('');

/**
 * The pending entry as the Selectric would hold it, so the ONE renderer draws it: the same ID
 * convention, the same matrix indent and the same word-mark caron the printed lines get. Nothing
 * is underlined — parity belongs to a character the machine has read, and this one it has not.
 */
const asLine = (p: PendingEntry): ConsoleLine => ({
  id: p.id,
  text: p.text,
  wordMarks: p.wordMarks,
  underline: [],
  spacingBefore: 'single',
  matrixPos: p.column,
});

const line = (t: string): HTMLElement => {
  const e = make('div');
  e.textContent = t;
  return e;
};

/** One pin-hole column: a run of holes down a margin, at the form's own 1/2 in pitch. */
function holes(edge: 'left' | 'right'): HTMLElement {
  const e = make('div');
  e.style.position = 'absolute';
  e.style.top = '0';
  e.style.bottom = '0';
  e.style.width = '7px';
  // Anchored on its OWN edge and pulled back half its width, so the hole centres — not the strips'
  // inner edges — sit at the inset the form's proportion gives.
  e.style[edge] = HOLE_INSET;
  e.style[edge === 'left' ? 'marginLeft' : 'marginRight'] = '-3.5px';
  e.style.backgroundImage = `radial-gradient(circle at 50% 50%, ${HOLE} 0 2.5px, transparent 2.5px)`;
  e.style.backgroundSize = `7px ${HOLE_PITCH}`;
  e.style.backgroundRepeat = 'repeat-y';
  return e;
}

export function createLogView(session: ConsoleSession): View {
  const heading = make('div');
  heading.textContent = 'Console typewriter — the form at the platen';

  // The ruling sits above the paper's text and is drawn in the same monospace cell, so a tick lands
  // over the position it counts. It is captioned as the fallback it is.
  const ruler = make('pre');
  ruler.textContent = RULE;
  ruler.style.margin = '0';
  ruler.style.color = NOT_YET_STRUCK;
  ruler.style.lineHeight = LINE_HEIGHT;

  const paper = make('pre');
  paper.style.margin = '0';
  paper.style.color = RIBBON;
  paper.style.lineHeight = LINE_HEIGHT;
  paper.style.minHeight = '11.7em';
  paper.style.maxHeight = '26em';
  paper.style.overflow = 'auto';

  // The PENDING row: an entry the OPERATOR has typed and the machine has NOT (plan §4.8). It is
  // drawn UNDER the log, in the lighter ink and behind a dashed rule, because nothing is on the
  // paper yet — the carrier has not struck it and `s.console` does not contain it.
  const pending = make('pre');
  pending.style.margin = '0';
  pending.style.color = NOT_YET_STRUCK;
  pending.style.lineHeight = LINE_HEIGHT;
  pending.style.borderTop = `1px dashed ${NOT_YET_STRUCK}`;
  pending.style.display = 'none';

  const form = make('div');
  form.style.position = 'relative';
  form.style.background = FORM_STOCK;
  form.style.padding = '.6em 5%';
  form.style.border = `1px solid ${HOLE}`;
  form.style.overflow = 'hidden';
  form.append(holes('left'), holes('right'), ruler, paper, pending);

  const el = make('div');
  el.append(
    heading, form,
    line(`The form is ruled at ${String(CONSOLE_LINE_LENGTH)} print positions. No source gives a `
      + 'characters-per-line figure for this form, so this emulator chose one, and it is ruled here '
      + 'rather than assumed: a display of cleared storage runs to the end of the line.'),
    line('Word marks print as an inverted circumflex over the character; a character with bad '
      + 'parity is underscored; the graphic zero is slashed and the letter O is not.'),
    line('The lighter row under the dashed rule is what the operator has typed. It is not on the '
      + 'paper: the carrier prints it when the entry is committed.'),
  );

  // `panel.ts:143-147`'s rule, carried: the log is rebuilt ONLY when it grew, and the scroll goes
  // to the latest line with it. The pending row has its own key, so echoing a keystroke never
  // scrolls the paper — the carrier has not moved (plan §10.2's per-view diff key table).
  let logged = -1;
  let echoed = '-';   // a sentinel no key can equal: a key is empty or begins with D, A or I
  return {
    el,
    render(s: MachineState): void {
      if (s.console.length !== logged) {
        logged = s.console.length;
        paper.textContent = renderSelectric(s.console, FORM_OPTIONS);
        paper.scrollTop = paper.scrollHeight;
      }
      const p = session.pending;
      const key = p === undefined ? '' : `${p.id}${String(p.column)}${p.text}|${p.wordMarks.join()}`;
      if (key === echoed) return;
      echoed = key;
      pending.style.display = p === undefined ? 'none' : 'block';
      pending.textContent = p === undefined ? '' : renderSelectric([asLine(p)], FORM_OPTIONS);
    },
  };
}
