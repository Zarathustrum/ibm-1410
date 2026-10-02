// src/ui/period/coding/mount.ts — THE CODING STATION: the sheet, the listing, the object deck and
// the one button that turns the last of them into cards in the deck box.
// Source: Phase-4 plan §9.4 (the `stale` read and the two typed hand-offs), §3.4's coding row,
// §10.7 row 5 (`period/mount.ts` constructs this station), §11 wave 5b. Carried across from
// `autocoder/mount.ts` by `git mv`; Phase-3 plan §1 (the storyboard this block is), §3.2 (the
// deck-box hand-off) are still the source of the wiring below.
//
// WHICH MACHINE: nothing here is a hardware claim. This file constructs three views and wires two
// callbacks; every 1410 and 1403 claim on this station lives in the view that draws it —
// `sheetView.ts` (the C28-0309-1 sheet), `listingView.ts` (the C28-0326-2 listing and the 1401
// heading it refuses by name) and `objectDeckView.ts` (the punched card).
//
// PUNCH INTO HOPPER LIVES HERE, and that is deliberate: the `DeckBox` is the one thing this view
// is handed from outside, and the hand-off is two statements — `session.hopperText()`, which is
// DOM-free and tested in node (Phase-3 §13 criterion 11a), then `deckBox.setText()`. Splitting
// those two across another file would put the only DOM plumbing anywhere but next to what it
// plumbs. It is one of the two typed hand-offs `docs/DECISIONS.md` 2026-08-31 refused a
// `querySelectorAll` walk for, and Phase 4 is where that refusal gets paid (plan §9.4).
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It does not re-implement the invalidation.** `AutocoderSession.stale` is the session's own
//    since plan §9.4 (+16 lines, the phase's one edit to a Phase-3 session body) and `hopperText()`
//    returns `''` while it is set, so constraint 11 is a NODE assertion. `invalidateArtifacts` and
//    the `punch.disabled` rule below are unchanged, and the mount READS `session.stale` rather
//    than being the only place that knows.
//  · **It draws no card and names no CSS class.** The faces are `reader/cardFaceView.ts`'s
//    `renderCardFace`; the classes are the three views' and are ruled in
//    `src/ui/styles/period.css` (plan §10.3).

import type { Machine } from '../../../core/machine.js';
// `session.ts` never moved with this station: it stays under `period/autocoder/` for the whole
// phase, which is what holds `test/tier4-autocoder-demo.test.ts`'s import line at ZERO edits
// across wave 5b (plan §3.3, §3.4's `autocoder/session.ts` row).
import { createAutocoderSession } from '../autocoder/session.js';
import { make } from '../dom.js';
// `CONSOLE_PROCEDURE` is a VALUE from the same module the `DeckBox` type comes from, and the
// import is one line rather than a fourth copy of §6.3's dialogue: PUNCH INTO HOPPER's note hands
// the operator to the 1402 and then to the 1415, and the deck box owns that sentence.
import { CONSOLE_PROCEDURE, type DeckBox } from '../reader/deckBoxView.js';
import { createListingView } from './listingView.js';
import { createObjectDeckView } from './objectDeckView.js';
import { createSourceBox, type SourceBox } from './sheetView.js';

/**
 * `machine` and `redraw` are taken and NOT read, and it is written down rather than trimmed away.
 * Phase-3 §3.1 fixed this signature and `period/mount.ts` calls it — so the parameters stay.
 * Nothing in this block touches machine state: PUNCH INTO HOPPER fills the deck box's TEXTAREA,
 * and it is the operator pressing PUT DECK IN HOPPER, at the 1402 station, that reaches the
 * reader. That separation is the storyboard's own (§1 steps 6-8) and is why the coding station
 * needs neither the Machine nor a redraw.
 */
export function mountAutocoder(
  machine: Machine, deckBox: DeckBox, host: HTMLElement, redraw: () => void,
): { readonly sourceBox: SourceBox } {
  void machine;
  void redraw;

  const session = createAutocoderSession();

  const heading = make('h2');
  heading.textContent = 'Autocoder — 1410-AU-906 (host-side)';

  const listing = createListingView();
  const objectDeck = createObjectDeckView();

  // PUNCH INTO HOPPER — §1 step 6. Built directly rather than through `make()` because `.disabled`
  // is on HTMLButtonElement, the same reason `deckBoxView.ts` builds PUT DECK IN HOPPER that way.
  const punch = document.createElement('button');
  punch.textContent = 'PUNCH INTO HOPPER';
  punch.disabled = true;
  const punchNote = make('div');
  // AND IT CAN BE REFUSED, WHICH THE NOTE SAYS — the shape `deckBoxView.ts`'s two buttons already
  // have. `hopperText()` returns `''` when there is no assembly or the sheet has been edited since
  // one (`autocoder/session.ts:78`), and the unbranched version handed that `''` to
  // `deckBox.setText`, WIPING a deck the operator may have typed by hand, and then printed
  // "0 cards punched" over a full set of next steps. `punch.disabled` is the only thing that keeps
  // it off the screen today, and it is set from `onEdit` alone: one future caller of
  // `createSourceBox` that forgets to fire `onChange` re-opens exactly that.
  punch.addEventListener('click', () => {
    const text = session.hopperText();
    const cards = text.split('\n').filter((line) => line !== '').length;
    if (cards === 0) {
      // The deck box is NOT touched on this path. That is the whole point: it holds the operator's
      // own text until there is a deck to replace it with.
      punchNote.textContent =
        'Nothing was punched, and the deck box above is untouched: there is no assembly to punch '
        + '— either none has been made, or the sheet has been edited since the last one and the '
        + 'object deck was retired with it. Press ASSEMBLE, then press this again.';
      return;
    }
    deckBox.setText(text);
    punchNote.textContent =
      `${cards} cards punched into the deck box above — the bootstrap card, the loader body, the `
      + 'condensed cards, the execute card, then the data cards. Now: PUT DECK IN HOPPER, READER '
      + 'START, END OF FILE — then at the 1415, key the bootstrap and run it: '
      + `${CONSOLE_PROCEDURE}.`;
  });

  const invalidateArtifacts = (): void => {
    listing.render(undefined);
    objectDeck.render(undefined);
    punch.disabled = true;
    punchNote.textContent = '';
  };

  // THE STALE NOTE — the mount's read of `session.stale` (plan §9.4). The retirement above is
  // unchanged; this says on the page WHY the button went dead, and it is the same bit
  // `hopperText()` reads before it returns `''`, so the DOM and the node oracle cannot disagree.
  // IT NEEDS A PRIOR ASSEMBLY TO BE ABOUT: `stale` is set by the FIRST `setSource` too — the
  // storyboard's own SEND TO AUTOCODER hand-off is one (§1 step 5) — and a note reading "edited
  // since the last ASSEMBLE" before any assembly has happened describes nothing. `session.result`
  // is what says one has.
  const staleNote = make('div');
  const onEdit = (): void => {
    invalidateArtifacts();
    staleNote.textContent = session.stale && session.result !== undefined
      ? 'The sheet has been edited since the last ASSEMBLE, so the listing and the object deck are '
        + 'retired and PUNCH INTO HOPPER is dead. Press ASSEMBLE again.'
      : '';
  };

  const sourceBox = createSourceBox(session, () => {
    const result = session.assemble();
    staleNote.textContent = '';
    listing.render(result);
    objectDeck.render(result);
    // A flagged assembly still HAS a deck; it is just wrong, so the deck is drawn and the button
    // is dead rather than missing — `deckBox.putDeckInHopper`'s own precedent from Phase 2 (§4).
    punch.disabled = !result.ok;
    punchNote.textContent = result.ok
      ? ''
      : 'PUNCH INTO HOPPER is disabled: the assembly carries flagged lines. Fix them and press '
        + 'ASSEMBLE again.';
  }, onEdit);

  host.append(
    make('hr'), heading, sourceBox.el, staleNote, listing.el, objectDeck.el, punch, punchNote,
  );

  return { sourceBox };
}
