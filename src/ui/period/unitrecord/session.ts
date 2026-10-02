// src/ui/unitrecord/session.ts — what the browser is holding: the deck a person pasted, the
// errors that parse produced, the Machine those cards are put into, and the mapping from the
// snapshot's reader COUNTS back to the cards themselves.
// Source: plan §10 "session.ts" — "holds the pasted Deck, the Machine, and the mapping from
// snapshot counts back to cards"; §11 wave 2 (the count→card mapping and PUT DECK IN HOPPER);
// §5, which is why `MachineState.reader` carries counts and not cards: the animation frame never
// copies 80-byte arrays and `MachineState` stays structured-cloneable (architecture.md §2 B11).
//
// DOM-FREE BY CONSTRUCTION: no `document`, no `window`, nothing from src/ui/internals. That is
// what lets the node test drive the session directly (plan §12, the "always green" row).

import type { Machine } from '../../../core/machine.js';
import type { Card, Deck, MachineState } from '../../../core/types.js';
import { parseDeck, type DeckError } from '../../../formats/card.js';

/** The snapshot block the two derivations read. Counts only — plan §5. */
type ReaderState = MachineState['reader'];

export interface Session {
  /** The deck as last parsed. A bad column parses blank (plan §9), so this always renders. */
  readonly deck: Deck;
  /** Re-parses the pasted text. Errors come back as DATA — the box has to show WHERE (§9). */
  setDeckText(text: string): readonly DeckError[];
  /**
   * PUT DECK IN HOPPER (plan §13 "press it and the deck is in the machine"). Fills the reader
   * hopper; it does not start the reader — READER START and END OF FILE are keys on the 1402 and
   * the operator presses them (console-and-physical.md §7). Returns false and leaves the machine
   * untouched when the last parse produced errors or no cards.
   */
  putDeckInHopper(): boolean;
  /** The cards still in the hopper, front of the hopper first. */
  hopperCards(reader: ReaderState): Deck;
  /** The card in the 1414's 80-position read buffer, or undefined when it is empty. */
  bufferedCard(reader: ReaderState): Card | undefined;
}

export function createSession(machine: Machine): Session {
  let deck: Deck = [];
  let errors: readonly DeckError[] = [];
  // The deck as it was PUT IN THE HOPPER, which is what the counts map back to — editing the
  // textarea afterwards changes `deck` and must not change what the reader is holding.
  let loaded: Deck = [];

  // THE ASSUMPTION, stated once: ONE reader, and cards are consumed in DECK ORDER — `loadDeck`
  // fills the hopper front to back and the 1402 takes the front card first. So the `reader.hopper`
  // cards still waiting are the LAST `reader.hopper` of the deck that was loaded, and the card in
  // the read buffer is the one immediately ahead of them. Nothing else in wave 2 is derivable:
  // the reader stacks into 0 (NR), 1 and 8/2 in whatever order the program's x3 selected, so from
  // counts alone WHICH card is in WHICH pocket is not recoverable — and nothing needs it.
  return {
    get deck(): Deck {
      return deck;
    },
    setDeckText(text: string): readonly DeckError[] {
      const parsed = parseDeck(text);
      deck = parsed.deck;
      errors = parsed.errors;
      return errors;
    },
    putDeckInHopper(): boolean {
      // No re-parse: `setDeckText` runs on every keystroke, so `deck` and `errors` already are
      // the current text. Re-parsing here would be a second answer to the same question.
      if (errors.length > 0 || deck.length === 0) return false;
      machine.loadDeck(deck);
      loaded = deck;
      return true;
    },
    hopperCards(reader: ReaderState): Deck {
      return loaded.slice(loaded.length - Math.min(reader.hopper, loaded.length));
    },
    bufferedCard(reader: ReaderState): Card | undefined {
      if (!reader.buffered) return undefined;
      // A negative index simply reads undefined, which is the honest answer if the counts and the
      // held deck ever disagree (a deck loaded, then re-typed, then loaded again).
      return loaded[loaded.length - reader.hopper - 1];
    },
  };
}
