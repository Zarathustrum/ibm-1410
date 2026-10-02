// src/ui/period/specs/resultView.ts — what the generator gave back, in a period frame: the exact
// diagnostics, the memory map, and the 80-column Autocoder source deck it emitted.
// Source: Phase-4 plan §1 step 3 (the memory map as it reads on the page), §9.2's station, §10.3
// (inline style attributes; `src/ui/styles/period.css` owns `.rpg-result` and `.deck-errors`),
// §11 wave 5b. `git mv` from Phase 5's `period/rpg/resultView.ts`, whose three panels are Phase-5
// plan §1 step 3.
//
// WHICH MACHINE: none. This block is HOST-SIDE — the modern inspection window on a generation that
// a real 1410 Card-RPG installation would have read off a 1403 listing. C28-1443 is not digitised
// (rpg-sources.md §2.2, §3 `[verified]`), so no IBM listing format is imitated here; the printed
// specification listing the CLI emits is the one that follows a published layout.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It computes no address.** Every number on the map is Phase 5's, read off `RpgResult.layout`
//    as `layoutOf` built it (`src/rpg/layout.ts`) — restyled, never recomputed (plan §0 bullet 1).
//  · **Nothing here goes red.** Diagnostics take `.deck-errors`, whose mark is a rule in the
//    panel's own silkscreen colour: the 1401 red-fault convention is `[unverified for 1410]`
//    (console-and-physical.md §11) and is refused across this surface (plan §2.2 fact 1).
//  · It draws no facsimile form and no 1403 page heading — the sheet station's refusal
//    (`specs/sheetView.ts`, `THE_RULER_IS_THE_FORM`) and the listing's C28-0326-2 heading
//    (`coding/listingView.ts`) both belong to other files.

import type { RpgDiagnostic, RpgResult } from '../../../rpg/types.js';
import { make } from '../dom.js';

function diagnosticText(diagnostic: RpgDiagnostic): string {
  const at = diagnostic.at;
  const number = diagnostic.message.messageNo === undefined ? '' : `${diagnostic.message.messageNo} `;
  return `${diagnostic.severity.toUpperCase()} page ${at.page} card ${at.cardNo}`
    + `${diagnostic.column === undefined ? '' : ` column ${diagnostic.column}`}: `
    + `${number}${diagnostic.message.text} [${diagnostic.message.provenance}]`
    + ` - ${diagnostic.message.cite}`;
}

/**
 * The map as it reads on the page — `CONSTANTS 00500 · CODE 00808 · IND 02533 · CDIN 02540 ·
 * PLINE 02700 · PLGM 02832 · HIGH 02833 · CTL 1` for `demos/sales-summary.rpg` (plan §1 step 3).
 * Exported because it is pure: a node test asserts the drawn map against `layoutOf` without a DOM,
 * which is what keeps the one number-bearing string on this station out of a second implementation.
 * The slack cell and the code length are not printed and are not lost: slack is `IND` less one and
 * the length is slack less `CONSTANTS`, both by `layout.ts:358-359`'s own arithmetic.
 */
export function memoryMapText(result: RpgResult): string {
  const layout = result.layout;
  if (layout === undefined) return 'No memory map: generation terminated before layout.';
  const five = (value: number): string => String(value).padStart(5, '0');
  return [
    `CONSTANTS ${five(layout.constants)}`,
    `CODE ${five(layout.code)}`,
    `IND ${five(layout.indicatorFile)}`,
    `CDIN ${five(layout.cardIn)}`,
    `PLINE ${five(layout.printLine)}`,
    `PLGM ${five(layout.printGroupMark)}`,
    `HIGH ${five(layout.highWater)}`,
    `CTL ${layout.coreSizeCode}`,
  ].join(' · ');
}

export interface RpgResultView {
  readonly el: HTMLElement;
  render(result: RpgResult | undefined): void;
}

/** A block's caption on the result sheet. `period.css` §4 sets the type; the margin is this
 *  view's, because the three blocks are one sheet and not three. */
function blockHeading(text: string): HTMLElement {
  const heading = make('h3');
  heading.textContent = text;
  return heading;
}

export function createRpgResultView(): RpgResultView {
  const el = make('div', 'rpg-result');
  const diagnostics = make('pre', 'deck-errors');
  const map = make('pre');
  map.style.whiteSpace = 'pre-wrap';
  const source = make('pre');
  source.style.whiteSpace = 'pre';
  source.style.overflowX = 'auto';
  el.append(
    blockHeading('diagnostics'), diagnostics,
    blockHeading('memory map'), map,
    blockHeading('generated Autocoder source'), source,
  );

  return {
    el,
    render(result: RpgResult | undefined): void {
      if (result === undefined) {
        diagnostics.textContent = 'Press GENERATE.';
        map.textContent = '';
        source.textContent = '';
        return;
      }
      diagnostics.textContent = result.diagnostics.length === 0
        ? 'No diagnostics.'
        : result.diagnostics.map(diagnosticText).join('\n');
      map.textContent = memoryMapText(result);
      source.textContent = result.source;
    },
  };
}
