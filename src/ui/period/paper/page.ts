// src/ui/period/paper/page.ts — the IBM 1403 MODEL 2's paper as a stack of PHYSICAL FORMS: 66
// line positions at 6 lpi whether or not they printed, 132 print positions at 10 cpi whether or
// not a hammer struck. Plan §4.1 and §5.1 (docs/plans/phase-4-period-ui.md), wave 1.
//
// Sources, and every one of them is about the 1403 Model 2 on a 1410 — never a 1401:
// research/io.md §7 "Configuration" (A22-0526-3 p.67: Model 2 is 132 print positions, Model 1 is
// 100) and §7's Figures 88-92 (A22-0526-3 pp.80-82) for what a print and a carriage motion do;
// research/console-and-physical.md §8 (green-bar stock 14 7/8 x 11 in at 6 lpi, `[likely]`);
// docs/plans/phase-2-unit-record.md §5, whose five `renderGreenBar` rules the four rules below
// are numbered against.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO — three refusals, and the third is the phase's oracle:
//  · It touches no DOM node and imports nothing that does, so the 132 is asserted in node instead
//    of looked at in a browser (§7.2, and §3.8's required-path list).
//  · It never shortens, trims or drops a line position. A form is what the carriage moved over,
//    so the blank positions ARE the evidence of the motion; the trimming is `trimRule3`'s, done
//    at the caller's request and never on the way in.
//  · **It never calls `renderGreenBar` and imports NOTHING from the printer device file** — see
//    `PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR` below. `test/period-page.test.ts` asserts the absent
//    import against this file's TEXT, not its module, because §5.1's identity is an oracle only
//    while the two renderers are independent computations over one paper.

import type { CarriageState, PrintLine } from '../../../core/types.js';

/**
 * OPEN: `PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR` — a RULING, ours (§15), not a machine fact.
 *
 * It rests on `renderGreenBar`'s own published contract — five rules and no more
 * (docs/plans/phase-2-unit-record.md §5, implemented at `printer1403.ts:695-716`) — over the 1403
 * Model 2's 132 print positions (io.md §7, A22-0526-3 p.67). The two renderers answer different
 * questions about one paper: `renderGreenBar` is a DIFF ARTEFACT (trailing blanks gone, stop at
 * the last ink) and `paginate` is a SHEET OF PAPER (the blanks are where the carriage went). Two
 * independent computations agreeing byte for byte is evidence; one computed from the other is a
 * tautology that no test can catch.
 *
 * FALLBACK TAKEN: this module imports `PrintLine` and `CarriageState` from `src/core/types.ts`
 * and nothing at all from `src/core/devices/printer1403.ts`, so `renderGreenBar`, `chainGlyph`
 * and `DEFAULT_CARRIAGE_TAPE` are unreachable from here by construction, and the ban is checked
 * by reading this file rather than by trusting this comment.
 *
 * WHAT WOULD SETTLE IT: nothing external — it is a rule about this repository. Giving it up costs
 * a hand-authored expected page per demo, three new goldens of OURS where three shipped ones do
 * the work for free today (§5.1, §13 criterion 8).
 */
export const PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR = true;

/**
 * Model 2, 132 print positions at 10 cpi (console-and-physical.md §8 [verified], A22-0526-3 p.67)
 * — moved here from `printerView.ts:28` with its comment, so the one number the form is measured
 * in lives in a file that cannot touch a DOM node (§7.2). This is a SECOND declaration of a name
 * core already carries (`printer1403.ts:43`), and it is deliberate: `page.ts` may not import that
 * file at all, so `test/period-page.test.ts` imports CORE's and asserts the two agree — which is
 * what makes the 132 a check rather than a restatement of itself (§3.2, §4.1).
 */
export const PRINT_POSITIONS = 132;

/**
 * Green-bar stock 14 7/8 x 11 in, 1/2 in bars: at 6 lpi that is THREE lines per bar
 * (console-and-physical.md §8, `[likely]` — the one row of that table its sources do not verify).
 * Phase 2 §13's fallback is the plain-white toggle, so a wrong guess costs nothing but a shade.
 * Moved here from `printerView.ts:35` with its comment; the toggle itself belongs to the drawn
 * printer view and is not this file's business.
 */
export const LINES_PER_BAR = 3;

export interface FormPage {
  readonly form: number;              // 1-based; identical to PrintLine.page
  readonly lines: readonly string[];  // EXACTLY formLines entries, blanks included, in order, and
                                      // each EXACTLY PRINT_POSITIONS characters — padded, never
                                      // sliced: a PrintLine.text is already <= 132 by the device
                                      // (printer1403.ts:498 sets WLR above PRINT_POSITIONS)
  readonly complete: boolean;         // false ONLY for the form the carriage is on
  readonly printedThrough: number;    // highest position a PrintLine occupies here; 0 if none
}

/**
 * The paper as forms. Four rules, numbered against `renderGreenBar`'s five (§5.1):
 *
 *  1. Exactly `formLines` entries per form, blanks included, in position order, each exactly
 *     `PRINT_POSITIONS` characters — PADDED, NEVER SLICED. 66 positions at 6 lpi is 11 inches of
 *     stock and 132 at 10 cpi is 13.2 inches across, and a stack you scroll back through has to
 *     contain the positions the carriage skipped over.
 *  2. `complete` is false only for `form === carriage.page`. Every earlier form has been ejected
 *     onto the printed stack and cannot gain a line.
 *  3. The emitted set is the ascending union of the forms named in `paper` and `carriage.page` —
 *     `printerView.ts:117-121`'s rule, carried across with its comment: the carriage's own form is
 *     in the set, "which is how motion onto a form that has printed nothing yet (the closing `F1`'s
 *     eject) stays visible", and a form the paper never reached is not emitted at all.
 *  4. Two `PrintLine`s at one `page:line` THROW, in `renderGreenBar`'s own message shape
 *     (`printer1403.ts:726`). A page model that can lose a line is not a page model.
 *
 * `printedThrough` is a FIELD and not a scan of `lines`, because
 * `L_WRITE_WORD_MARKS_PRINTS_A_BLANK_LINE` (`printer1403.ts:309-326`) puts a `PrintLine` of 132
 * blanks on the paper: the device printed it, `renderGreenBar` counts it, and a blank scan would
 * not. Without the field §5.1's identity cannot be written down.
 */
export function paginate(
  paper: readonly PrintLine[],
  carriage: CarriageState,
  formLines: number,
): readonly FormPage[] {
  const at = new Map<string, string>();
  for (const line of paper) {
    const key = `${line.page}:${line.line}`;
    if (at.has(key)) {
      throw new Error(
        `paginate: two print lines at form ${line.page}, line ${line.line} — `
        + 'the page can render only one and the second would be lost (plan §5 rule 2, §14 R8)',
      );
    }
    at.set(key, line.text);
  }

  const forms = new Set<number>([carriage.page]);          // rule 3
  for (const line of paper) forms.add(line.page);

  return [...forms].sort((a, b) => a - b).map((form) => {
    const lines: string[] = [];
    let printedThrough = 0;
    for (let n = 1; n <= formLines; n += 1) {
      const text = at.get(`${form}:${n}`);
      if (text !== undefined) printedThrough = n;
      lines.push((text ?? '').padEnd(PRINT_POSITIONS, ' '));  // rule 1: padded, never sliced
    }
    return { form, lines, complete: form !== carriage.page, printedThrough };  // rule 2
  });
}

/**
 * One form's BODY as `renderGreenBar` renders it: rule 2's stop at `printedThrough`, rule 3's
 * per-line trailing-blank trim — which is what makes rule 1's padding invisible to §5.1's
 * identity — and rule 5's `\n` on every line, the last one included.
 */
export function trimRule3(page: FormPage): string {
  return page.lines
    .slice(0, page.printedThrough)
    .map((line) => `${line.replace(/ +$/, '')}\n`)
    .join('');
}
