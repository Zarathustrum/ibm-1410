// src/ui/period/coding/objectDeckView.ts — THE OBJECT DECK as cards, drawn by the same
// `renderCardFace` that draws every other card on this desk.
// Source: Phase-4 plan §9.3 ("the object deck"), §7.1 (`cardFaceView.ts` and its caption
// templates), §10.3 (inline styles — `src/ui/styles/period.css` is wave 5a's), §11 wave 5b.
// Carried across from `autocoder/objectDeckView.ts` by `git mv`; Phase-3 plan §1 step 3 ("three
// card faces — two condensed cards and the execute card … with the decoded load address and count
// under each") is still what the block is.
//
// WHICH MACHINE: an IBM 1410's 1402 card read punch, drawn at `cardFaceView.ts`'s `'object'`
// scale. The card is the 12-row, 80-column IBM card (`paper/cardGeometry.ts`); the condensed
// absolute deck's own format is `src/formats/objectdeck.ts`, Phase 2's.
//
// THE NUMBER UNDER EACH FACE IS DECODED, NOT REMEMBERED. It is what `decodeObjectRecord` reads
// back off the punched card — never what the packer intended — so a card whose columns came out
// wrong says so on the page instead of repeating the intention. Encode-then-decode is also exactly
// the round trip Phase-3 §13 criterion 5 asserts headlessly; here it is what a person looks at.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It decodes no execute card.** `EXECUTE_CARD_IS_E_IN_COLUMN_1` carries no load address and
//    no count, so it is CAPTIONED — `decodeObjectRecord` would rightly refuse it.
//  · **It draws no bootstrap or loader-body card.** Those are the loader's, and PUNCH INTO HOPPER
//    puts them in front of these; the heading says so rather than leaving the count unexplained.
//  · It names no CSS class at all: the frame below is inline, and the faces carry
//    `cardFaceView.ts`'s own `.card-face` (plan §10.3).

import type { AssemblyResult } from '../../../asm/types.js';
import { executeCard } from '../../../formats/loader.js';
import { decodeObjectRecord, encodeObjectRecord } from '../../../formats/objectdeck.js';
import { make } from '../dom.js';
import { CARD_CAPTIONS, renderCardFace } from '../reader/cardFaceView.js';

const five = (n: number): string => String(n).padStart(5, '0');

/**
 * The block's masthead — `specs/sheetView.ts`'s band geometry, pulled out over the padding of the
 * box it actually sits in. That box is the STATION (`period.css` §3's `.period-coding` shell,
 * `.7em .8em .9em`) and not the sheet (§7's `.5em .6em .6em`), so the bleed is `-.8em` and the
 * padding `.8em`: the same RULE — a band edge to edge with its container, its text on the
 * container's own content column — which is what makes the three bands on this station read as
 * one. The top margin is POSITIVE because this band follows the listing rather than opening a box.
 * Inline, because wave 5a owns the stylesheet: a colour need is REPORTED, not made.
 */
function headerBand(title: string): HTMLElement {
  const band = make('div');
  band.textContent = title;
  band.style.margin = '.6em -.8em .55em';
  band.style.padding = '.35em .8em .4em';
  band.style.background = 'var(--desk-pedestal)';
  band.style.color = 'var(--card-stock)';
  band.style.textTransform = 'uppercase';
  band.style.letterSpacing = '.08em';
  return band;
}

export function createObjectDeckView(): {
  readonly el: HTMLElement;
  render(result: AssemblyResult | undefined): void;
} {
  const el = make('div');
  const heading = make('div');
  const faces = make('div');
  el.append(headerBand('OBJECT DECK — CONDENSED ABSOLUTE'), heading, faces);

  return {
    el,
    render(result: AssemblyResult | undefined): void {
      if (result === undefined) {
        heading.textContent = '';
        faces.replaceChildren();
        return;
      }
      const { records, entry } = result.deck;
      heading.textContent =
        `Object deck — ${records.length} condensed card${records.length === 1 ? '' : 's'}`
        + `${entry === undefined ? ', no END operand and so no execute card' : `, entry ${five(entry)}`}`
        + '. The bootstrap and loader-body cards are the loader\'s and are not drawn here; PUNCH '
        + 'INTO HOPPER puts them in front.';

      const out: HTMLElement[] = records.map((record, index) => {
        const card = encodeObjectRecord(record);
        const back = decodeObjectRecord(card);
        const block = make('div');
        const detail = make('div');
        detail.textContent =
          `load address ${five(back.loadAddress)}, count ${String(back.payload.length).padStart(2, '0')}`
          + `, sequence ${back.sequence}${back.ident === undefined ? '' : ` ident ${back.ident}`}`;
        block.append(renderCardFace(card, CARD_CAPTIONS.objectDeck(index + 1), 'object'), detail);
        return block;
      });

      if (entry !== undefined) {
        // `EXECUTE_CARD_IS_E_IN_COLUMN_1` (`src/formats/loader.ts`): it carries no load address and
        // no count, so it is captioned rather than decoded — `decodeObjectRecord` would rightly
        // refuse it.
        const block = make('div');
        const detail = make('div');
        detail.textContent = `execute card — E in column 1, branch to ${five(entry)} (END's operand)`;
        block.append(renderCardFace(executeCard(entry), CARD_CAPTIONS.executeCard, 'object'), detail);
        out.push(block);
      }
      faces.replaceChildren(...out);
    },
  };
}
