// src/ui/period/coding/listingView.ts — THE ASSEMBLY LISTING as the 1403 printed it, under the
// C28-0326-2 §12 page heading drawn around it, plus the one thing the 1403 could not print: a
// modern error block that says where to look.
// Source: Phase-4 plan §9.3 (the heading around the `<pre>`, the shared `restrike()`, and the
// header-line wart), §5.3 (the restrike and the golden it must not reach), §10.3, §11 wave 5b.
// Carried across from `autocoder/listingView.ts` by `git mv`; Phase-3 plan §1 steps 3-5, §9 and
// §14 R10 are still the source of the two renderings below.
//
// WHICH MACHINE: an IBM 1410's 1403 Model 2, printing a standalone 1410-AU-906 listing. The page
// heading is C28-0326-2 pp.10-11, 56-57 `[verified]` (console-and-physical.md §12) — date at the
// left, the HEADR text centred, `PAGE n`, then the five-character identification, at
// `LISTING_LINES_PER_PAGE` lines to a page (`/LIN/`).
//
// THE 1401 AUTOCODER LISTING HEADING IS REFUSED HERE BY NAME (plan §2.2 item 4, §16 item 2).
// console-and-physical.md §12 `[verified]`, from bitsavers 1401_autocoderListing.pdf p.1: the 1401
// prints `SEQ PG LIN LABEL OP OPERANDS SFX CT LOCN INSTRUCTION TYPE CARD` with a title line and
// `PAGE n` — and the file's own words are *"Do not mix it into a 1410 renderer."* The columns
// drawn here are `renderListing`'s, which are C28-0326-2 Fig.2's; not one of the 1401's twelve
// column names appears in this file or on this page.
//
// TWO RENDERINGS OF ONE LIST, and that is the point. The `<pre>` is the period artefact —
// `renderListing` over `result.listing`, the same bytes `test/golden/hello-dad.lst` holds, its
// FLAG column carrying one period letter and nothing else (`ONE_FLAG_PER_LISTING_LINE`). The block
// under it is ours: page, line, column and the message, which is what a person actually needs to
// find the card. Neither is derived from the other; both read one `ListingLine[]`.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It renders nothing INTO the listing text.** The §12 heading above the paper is DOM
//    furniture; the processor's own heading row is already inside the listing (`listing.ts:130`,
//    and `test/golden/hello-dad.lst` line 3). A heading rendered into `renderListing`'s output
//    would move both goldens — 2,251 and 6,982 bytes — on the first commit (plan §9.3 item 1).
//  · **It holds no second chain table and never re-assembles.** `renderListing` is called ONCE at
//    `PRINT_CHAIN_A_IS_DEFAULT` and the H view is `paintedListing`, a display transform over that
//    text through `paper/chain.ts`'s shared `restrike()` (plan §5.3, §13 criterion 12).
//  · It names two CSS classes, `.green-bar` and `.deck-errors`, both already ruled in
//    `src/ui/styles/period.css` (plan §10.3); the rest is inline, and it builds no node at import.

import { LISTING_LINES_PER_PAGE } from '../../../asm/listing.js';
import { renderListing } from '../../../asm/listing1403.js';
import { SOURCE_FIELDS, type AsmFlag, type AssemblyResult, type ListingLine } from '../../../asm/types.js';
import { PRINT_CHAIN_A_IS_DEFAULT, type PrintChain } from '../../../core/devices/printer1403.js';
import { make } from '../dom.js';
import { restrike } from '../paper/chain.js';

/**
 * WHICH COLUMN A FLAG POINTS AT, and it is the field the flag is ABOUT rather than a guess:
 * `O` is an unknown operation (the operation field), `M` a label defined twice (the label field),
 * `U` an undefined reference (the operand field). `F` is in the table only as the fallback for a
 * message that carries no column of its own — `source.ts`'s `messageOf` already puts the exact
 * offending column in an `F`'s text, and the reader below prefers it whenever it is there. The
 * columns themselves are `SOURCE_FIELDS`', never typed here, so this map cannot disagree with the
 * parser about where a field starts (`software.md` §1).
 */
const FLAG_FIELD: Readonly<Record<AsmFlag, number>> = {
  O: SOURCE_FIELDS.op[0],
  M: SOURCE_FIELDS.label[0],
  U: SOURCE_FIELDS.operand[0],
  F: SOURCE_FIELDS.operand[0],
};

/** `messageOf`'s own suffix (`src/asm/source.ts`), and the one place this view reads it. */
const COLUMN_SUFFIX = /\s*\(column (\d+)\)/;

/**
 * THE PAGE-HEADING STRIP — C28-0326-2 §12's own three positions, drawn as period furniture ABOVE
 * the paper and never into it (the note under the strip says which of them the processor fills).
 */
const HEADING_POSITIONS: readonly string[] = ['date', 'HEADR', 'PAGE n · identification'];

/**
 * One flagged line as a modern diagnostic: `page 01 line 090, column 21: EOG is not defined`
 * (§1 step 5, which is the shape §13 checks). PGLIN is source columns 1-5 AS PUNCHED, so the page
 * is its first two characters and the line its last three — printed as punched, never renumbered,
 * because what a person has to find is the card they typed.
 */
function diagnostic(line: ListingLine): string {
  const why = line.why ?? '';
  const carried = COLUMN_SUFFIX.exec(why);
  const column = carried === null ? FLAG_FIELD[line.flag ?? 'F'] : Number(carried[1]);
  const pglin = line.pglin.padEnd(5);
  return `page ${pglin.slice(0, 2)} line ${pglin.slice(2)}, column ${column}: `
    + why.replace(COLUMN_SUFFIX, '');
}

/**
 * THE A/H TOGGLE AS A PURE FUNCTION, so the node test can assert it against the renderer it must
 * agree with: `paintedListing(renderListing(l), chain)` is byte-identical to
 * `renderListing(l, { chain })` for BOTH chains over both shipped listings (plan §5.3, §9.3;
 * §13 criterion 12).
 *
 * THE WART IT CARRIES: `renderListing`'s FIRST line is `renderGreenBar`'s header and it PRINTS THE
 * CHAIN LETTER (`test/golden/hello-dad.lst` line 1; `printer1403.ts:734-737`) while containing none
 * of the five dualed glyphs, so a whole-string restrike would leave the page reading `chain A` over
 * H glyphs. The body is restruck from the first `\n` on and the header re-lettered by substitution
 * ON THE RENDERED HEADER — so the header's format lives once, in the device.
 */
export function paintedListing(rendered: string, chain: PrintChain): string {
  const cut = rendered.indexOf('\n');
  const end = cut < 0 ? rendered.length : cut;
  const header = rendered.slice(0, end).replace(`chain ${PRINT_CHAIN_A_IS_DEFAULT}`, `chain ${chain}`);
  const body = rendered.slice(end);
  return header + (chain === PRINT_CHAIN_A_IS_DEFAULT ? body : restrike(body, chain));
}

/**
 * The strip itself, on `specs/sheetView.ts`'s band geometry pulled out over the padding of the box
 * it sits in — the STATION (`period.css` §3's `.period-coding` shell, `.7em .8em .9em`), so the
 * bleed is `-.8em` and the padding `.8em`, the same rule the object deck's band below follows.
 *
 * THE THREE CELLS ARE EQUAL THIRDS AND NOT `space-between`, because §12's middle position is
 * CENTRED — console-and-physical.md §12, "HEADR text centered" — and `space-between` centres the
 * middle child on the leftover space, not on the form. Inline: wave 5a owns the stylesheet.
 */
function headingStrip(): HTMLElement {
  const strip = make('div');
  strip.style.display = 'flex';
  strip.style.margin = '.6em -.8em .4em';
  strip.style.padding = '.35em .8em .4em';
  strip.style.background = 'var(--desk-pedestal)';
  strip.style.color = 'var(--card-stock)';
  strip.style.letterSpacing = '.08em';
  for (const [i, position] of HEADING_POSITIONS.entries()) {
    const cell = make('span');
    cell.textContent = position;
    cell.style.flex = '1';
    cell.style.textAlign = i === 0 ? 'left' : (i === 1 ? 'center' : 'right');
    strip.append(cell);
  }
  return strip;
}

export function createListingView(): {
  readonly el: HTMLElement;
  render(result: AssemblyResult | undefined): void;
} {
  const el = make('div');
  const status = make('div');
  const errors = make('div', 'deck-errors');
  const paper = make('pre', 'green-bar');

  const headingNote = make('div');
  headingNote.style.margin = '0 0 .4em';
  headingNote.textContent =
    `The 1403's page heading, ${LISTING_LINES_PER_PAGE} lines to a page: the processor prints the `
    + 'HEADR text, the page number and the five-character identification onto the paper itself. '
    + 'This shop punches no date card, so the date position stays blank.';

  // The A/H toggle, built the way `printer/formView.ts` builds its plain-white toggle: it relabels
  // itself and repaints the LAST rendered listing, so switching chains is a click and not a
  // reassembly. §14 R10's other half — chain H prints the 12 punch as `+` and chain A as `&`.
  let chain: PrintChain = PRINT_CHAIN_A_IS_DEFAULT;
  const toggle = make('button');
  const relabel = (): void => {
    toggle.textContent = `chain ${chain} — switch to ${chain === 'A' ? 'H' : 'A'}`;
  };
  toggle.addEventListener('click', () => {
    chain = chain === 'A' ? 'H' : 'A';
    relabel();
    paint();
  });
  relabel();

  let last: AssemblyResult | undefined;
  /** `renderListing`'s bytes at the DEFAULT chain — the goldens' own — rendered once per assembly. */
  let rendered = '';

  function paint(): void {
    if (last === undefined) {
      status.textContent = 'Press ASSEMBLE.';
      errors.textContent = '';
      paper.textContent = '';
      return;
    }
    const flagged = last.flagged;
    status.textContent = `${flagged.length} flagged line${flagged.length === 1 ? '' : 's'}`;
    // The deck-level warnings are NOT flags — the F/U/M/O set is closed and published
    // (`software.md` §6) — so they print here under their own word and never in the FLAG column.
    errors.textContent = [
      ...flagged.map(diagnostic),
      ...last.warnings.map((warning) => `warning: ${warning}`),
    ].join('\n');
    paper.textContent = paintedListing(rendered, chain);
  }

  el.append(status, toggle, errors, headingStrip(), headingNote, paper);
  paint();

  return {
    el,
    render(result: AssemblyResult | undefined): void {
      last = result;
      rendered = result === undefined
        ? ''
        : renderListing(result.listing, { chain: PRINT_CHAIN_A_IS_DEFAULT });
      paint();
    },
  };
}
