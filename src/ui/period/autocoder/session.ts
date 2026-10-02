// src/ui/autocoder/session.ts — what the Autocoder block is holding: the source a person typed,
// the data cards that ride behind the object deck, and the last assembly.
// Source: docs/plans/phase-3-autocoder.md §3.1 "session.ts", §1 step 6 (the hopper hand-off),
// §13 criterion 11a.
//
// DOM-FREE BY CONSTRUCTION, exactly as `src/ui/unitrecord/session.ts` is: no `document`, no
// `window`, nothing from `src/ui/internals` (plan §3.5). That is what lets
// `test/tier4-autocoder-demo.test.ts` drive the whole of PUNCH INTO HOPPER in node and leave only
// the two lines of DOM plumbing to the browser check — §13 splits 11a from 11b on exactly this
// line.
//
// PHASE 4 ADDS ONE FIELD, `stale`, and nothing else in this file changes: Phase-4 plan §9.4 and
// §13 criterion 15 — the only edit the phase makes to a Phase-3 session body (§14 R8).

import { assemble } from '../../../asm/assemble.js';
import type { AssemblyResult } from '../../../asm/types.js';
import { formatDeck, parseDeck } from '../../../formats/card.js';
import { loaderDeck } from '../../../formats/loader.js';

export interface AutocoderSession {
  /** The source deck as last set — 80-column Autocoder cards, one per line. */
  readonly source: string;
  /** The report cards that follow the object deck into the hopper, in `.cards` text. */
  readonly dataText: string;
  /** The last assembly, or undefined before ASSEMBLE has been pressed once. */
  readonly result: AssemblyResult | undefined;
  /**
   * True when the source or the data cards have been edited since the last `assemble()`, so the
   * artifacts on screen describe text no longer in the boxes. `hopperText()` returns `''` while it
   * is set — which is what makes Phase-4 plan §9.4's constraint 11 a NODE assertion rather than a
   * DOM one: that invalidation used to live only in `mount.ts:60-65`'s `invalidateArtifacts`
   * closure, where no node test reaches it. The shape is `rpg/session.ts:31`'s `invalidate`.
   */
  readonly stale: boolean;
  setSource(text: string): void;
  setDataText(text: string): void;
  /** Assembles `source` and remembers the result. Never throws on source content (§4). */
  assemble(): AssemblyResult;
  /**
   * PUNCH INTO HOPPER's text, and the WHOLE of what that button computes: the bootstrap card, the
   * loader body card, the condensed cards, the execute card, then the data cards — `formatDeck`
   * (`src/formats/card.ts`) over `loaderDeck(deck)` plus the data deck (§1 step 6). Empty before
   * the first assembly, which is the state in which the button is disabled anyway.
   */
  hopperText(): string;
}

export function createAutocoderSession(): AutocoderSession {
  let source = '';
  let dataText = '';
  let result: AssemblyResult | undefined;
  let stale = false;

  // `result` is KEPT rather than cleared, unlike `rpg/session.ts:31`: the listing and the object
  // deck stay readable beside the edited source, and it is `stale` alone that stops the stale deck
  // reaching the hopper (plan §9.4).
  const invalidate = (): void => { stale = true; };

  return {
    get source(): string { return source; },
    get dataText(): string { return dataText; },
    get result(): AssemblyResult | undefined { return result; },
    get stale(): boolean { return stale; },
    setSource(text: string): void {
      source = text;
      invalidate();
    },
    setDataText(text: string): void {
      dataText = text;
      invalidate();
    },
    assemble(): AssemblyResult {
      result = assemble(source);
      stale = false;
      return result;
    },
    hopperText(): string {
      if (result === undefined || stale) return '';
      // The data cards are PARSED here rather than concatenated as text: they arrive in the same
      // `.cards` notation the deck box reads — `{0-5-8}` punch lists included — and `formatDeck`
      // has to be handed cards, not lines. A bad column parses blank (`parseDeck`'s own rule) and
      // the deck box reports it when the text lands there, so nothing is swallowed.
      return formatDeck([...loaderDeck(result.deck), ...parseDeck(dataText).deck]);
    },
  };
}
