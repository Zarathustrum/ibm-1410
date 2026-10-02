// src/ui/period/reader/hopperView.ts — the IBM 1402 Model 2's FILE FEED, its read station, and the
// punch feed the running program writes to.
// Source: Phase-4 plan §7.1 (the Model 2 numbers, the file feed as slivers, the LOADED-deck rule,
// the punch-feed ruling), §3.3's hopperView row, §10.3 (inline style attributes —
// src/ui/styles/period.css is wave 5's), §11 wave 3, §12.1 T0.
//
// WHICH MACHINE: the 1402 Card Read-Punch Model 2 attached to a 1410 — file feed 3,000 cards, five
// radial stackers of 1,000 each, read feed face down 9-edge first right to left, punch feed 12-edge
// first left to right ([verified] — console-and-physical.md §7, A22-0526-3 pp.59-60, Figs.58-59).
// The card at the read station is in the 1414's 80-position READ BUFFER, not in the 1402.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · It draws no cabinet and no elevation — see `THE_1402_ELEVATION_IS_NOT_DRAWN` below, the
//    file's own header ruling: this station is a PANEL and carries no dimension.
//  · It computes no number: the depth is `MachineState.reader.hopper`, the sliver budget is
//    `HOPPER_SLIVER_LIMIT` (paper/cardGeometry.ts, wave 3, with its test) and the faces are
//    cardFaceView's. It counts, indexes, formats and places (plan §0 bullet 1).
//  · It draws no key. The Fig.60 p.61 strip — and the two keys that are wired — is
//    `reader/keysView.ts`'s; the pockets are `reader/stackerView.ts`'s.
//  · **It claims no card ordinal for the file feed.** §7.1's table captions that face
//    `loaded deck, card N`, but `hopperCards` returns the cards still WAITING and the frozen
//    session publishes no absolute index, so after READER START an `N` here would be wrong by the
//    number of cards already fed. The face is captioned `CARD_CAPTIONS.loadedDeck` — no ordinal —
//    and this is a RECORDED DEVIATION from the plan, not a design (orchestrator ruling, wave 3
//    review; an accessor for the loaded deck's length would restore the template in one line).
//  · It prints no dimension in inches and no time unit (plan §2.2).
//  · It carries no CSS class of its own; `period.css` is wave 5's (plan §10.3).

import type { Card, MachineState } from '../../../core/types.js';
import { make, type View } from '../dom.js';
import { HOPPER_SLIVER_LIMIT } from '../paper/cardGeometry.js';
import type { Session } from '../unitrecord/session.js';
import { CARD_CAPTIONS, renderCardFace } from './cardFaceView.js';

// OPEN: `THE_1402_ELEVATION_IS_NOT_DRAWN` — a CONTRADICTORY source, retired by not drawing the
// thing it would govern; this file's header ruling, because it governs the whole station.
// console-and-physical.md §7 prints "57-1/2 × 29 × 35 in … 1,400 lb" `[verified as printed /
// suspect in fact]` (GC22-6681-4 p.14) and says the 35 in height "reads low against photos showing
// the hopper on top"; §13 row 3 says to treat it as approximate and never to label anything with a
// spec number. FALLBACK TAKEN: the station is drawn as a PANEL, not an elevation — nothing here is
// drawn to scale against the cabinet and NO dimension in inches is printed on it (plan §2.2).
// WHAT WOULD SETTLE IT: an IBM dimensioned drawing of the 1402. If an elevation is ever drawn, read
// 35 in as the deck height EXCLUDING the file-feed hopper the photographs show on top.
// Plan §2.2, §7.1, §15; open-questions.md, Phase 4 / Wave 3.
export const THE_1402_ELEVATION_IS_NOT_DRAWN = true;

// OPEN: `THE_HOPPER_DRAWS_THE_LOADED_DECK` — a RULING of ours over a `[verified]`-in-code
// invariant, NEW IN PHASE 4. unitrecord/session.ts:40-46 is explicit: "the cards still waiting are
// the LAST `reader.hopper` of the deck that was loaded — editing the textarea afterwards changes
// `deck` and must not change what the reader is holding." FALLBACK TAKEN: this view renders
// `session.hopperCards(reader)` (session.ts:68-70) and NEVER `session.deck`, and every face names
// the deck it belongs to. The visible bug that forbids: load a deck, edit the box, and the drawn
// hopper silently changes depth mid-run — live in all three panel designs. WHAT WOULD SETTLE IT:
// nothing external; reverting is one accessor, which is why it is a named row and not a comment,
// and test/period-reader.test.ts re-proves the freeze against this view's input through the
// UNCHANGED session. Plan §7.1, §11 wave 3 oracle (b2), §15; open-questions.md, Phase 4 / Wave 3.
export const THE_HOPPER_DRAWS_THE_LOADED_DECK = true;

/** The line the punch feed carries on the page; asserted by test/period-reader.test.ts. */
export const PUNCHES_UNDER_PROGRAM_CONTROL: string =
  'This 1402 punches: demos/reentry.asm builds an 80-column card in PAREA and writes it with '
  + 'P1 0,PAREA, one card for every printed row, and the punch feed stacks them in pocket 0 (NP). '
  + 'The feed has two keys and two stacker pockets of its own (A22-0526-3 pp.59-61); the hopper '
  + 'of blank cards it draws from is not modelled, so it is drawn as an outline.';

/** Presentation only — the card edges in the stack, and the punch hopper's outline. */
const SLIVER = '#cfc9b8';
const OUTLINE = '#999';

/** One card seen edge-on in the file feed. */
function sliver(): HTMLElement {
  const e = make('span');
  e.style.display = 'inline-block';
  e.style.width = '.35em';
  e.style.height = '3em';
  e.style.background = SLIVER;
  e.style.borderRight = `1px solid ${OUTLINE}`;
  return e;
}

/** A labelled, bordered block — a feed or a station, drawn as a panel and never as an elevation. */
function block(title: string): HTMLElement {
  const e = make('div');
  e.style.border = `1px solid ${OUTLINE}`;
  e.style.padding = '.4em .6em';
  e.style.margin = '.4em 0';
  const h = make('div');
  h.textContent = title;
  h.style.color = '#666';
  e.append(h);
  return e;
}

const line = (t: string): HTMLElement => {
  const e = make('div');
  e.textContent = t;
  return e;
};

export function createHopperView(session: Session): View {
  const heading = make('div');
  heading.textContent = '1402 card read punch — file feed, read station and punch feed';

  // The file feed: at most HOPPER_SLIVER_LIMIT slivers, allocated ONCE, shown and hidden as the
  // depth changes — a 3,000-node stack rebuilt on every running frame is what the budget refuses.
  const feed = block('file feed');
  // A22-0526-3 p.59 [verified] (console-and-physical.md §7): the two feeds run in opposite
  // directions. Stated as text, because nothing here draws a card in motion.
  feed.append(line('read feed: face down, 9-edge first, right to left.'));
  const stack = make('div');
  const slivers = Array.from({ length: HOPPER_SLIVER_LIMIT }, sliver);
  stack.append(...slivers);
  const depth = line('');
  const front = make('div');
  feed.append(stack, depth, front);

  // The read station: the card in the 1414's 80-position read buffer, or an empty station.
  const station = block('read station — the 1414 read buffer');
  const held = make('div');
  station.append(held);

  // The punch feed: named, and written to by the program under `P1`. Figs.58-59 are cited for what
  // it HAS — two keys and two stacker pockets — never as artwork this panel reproduces.
  const punch = block('punch feed');
  const punchHopper = make('div');
  punchHopper.style.border = `1px dashed ${OUTLINE}`;
  punchHopper.style.height = '3em';
  punchHopper.style.margin = '.4em 0';
  punch.append(
    punchHopper,
    line('punch feed: 12-edge first, left to right (A22-0526-3 p.59).'),
    line(PUNCHES_UNDER_PROGRAM_CONTROL),
  );

  const el = make('div');
  el.append(heading, feed, station, punch);

  // readerView.ts:72-84's rule, carried across: this view is rendered from an animation frame, so
  // it rebuilds only when something drawn actually changed (plan §14 R7). The counts are one joined
  // key; the two FACES are compared BY REFERENCE, because a deck re-loaded at the same depth leaves
  // every count identical while every card object is a new one from `parseDeck` — the stale face
  // that a count-only diff would leave on the page.
  let key = '';
  let frontCard: Card | undefined;
  let stationCard: Card | undefined;
  return {
    el,
    render(s: MachineState): void {
      const r = s.reader;
      // THE LOADED DECK, never `session.deck` — the ruling above.
      const cards = session.hopperCards(r);
      const first = cards[0];
      const buffered = session.bufferedCard(r);
      const next = `${String(r.hopper)}|${String(r.buffered)}`;
      if (next === key && first === frontCard && buffered === stationCard) return;
      key = next;
      frontCard = first;
      stationCard = buffered;
      // The stack SHRINKS as the reader takes cards — the one thing the plan promises a person
      // watching a run will see (plan §13). Hidden slivers leave the strip, they do not sit blank.
      slivers.forEach((e, i) => { e.style.display = i < cards.length ? 'inline-block' : 'none'; });
      depth.textContent =
        `${String(r.hopper)} card${r.hopper === 1 ? '' : 's'} of the 3,000 the file feed holds`
        + `${r.hopper > HOPPER_SLIVER_LIMIT ? `, drawn ${String(HOPPER_SLIVER_LIMIT)} edges deep` : ''}`;
      // NO ORDINAL on the file-feed face: `hopperCards` returns the cards still WAITING, so after
      // READER START its first element is card 2 or later of the loaded deck and the frozen session
      // publishes no absolute index. `CARD_CAPTIONS.loadedDeck` names the position instead — the
      // recorded departure from §7.1's `loaded deck, card N`, argued at the constant.
      front.replaceChildren(first === undefined
        ? line('the file feed is empty')
        : renderCardFace(first, CARD_CAPTIONS.loadedDeck, 'deck'));
      held.replaceChildren(buffered === undefined
        ? line('empty — no card has been fed to the read buffer')
        : renderCardFace(buffered, CARD_CAPTIONS.readStation(1), 'buffer'));
    },
  };
}
