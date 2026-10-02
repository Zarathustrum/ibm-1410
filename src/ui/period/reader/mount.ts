// src/ui/period/reader/mount.ts — the 1402 station, constructed on the page's own Machine and
// appended into the station element `period/mount.ts` hands it. It replaces
// `period/unitrecord/mount.ts`.
// Source: Phase-4 plan §3.4's `reader/mount.ts` row ("narrowed to the reader station only"),
// §10.1 (mount ORDER is a data-dependency chain, DISPLAY order is the desk's), §10.2 (the frame,
// and its wave-3 row — "ONE rAF file from here on"), §10.7 row 5, §11 wave 5.
//
// WHICH MACHINE: the IBM 1402 Card Read Punch on a 1410. This file makes no hardware claim of its
// own; every one lives in the view it constructs.
//
// THIS IS THE WAVE-5 FORM, and the narrowing is the whole of the edit: the 1403 views this file
// carried since wave 2 and the 1415 station it carried since wave 4 are now constructed by
// `period/mount.ts`, which places each station in its own grid area (§10.1, §10.7 row 5). What is
// left here is the 1402 alone — hopper, key strip, stackers and the deck box — and the two things
// that used to leave this file leave it still: the `DeckBox` in the return, and `keyBootstrap`,
// which now ARRIVES in `opts` from the console session `period/mount.ts` built (§6.4, §9.4).
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It holds no animation frame.** `unitrecord/mount.ts:89-98`'s second `requestAnimationFrame`
//    loop DIED WITH THAT FILE: a `requestAnimationFrame` call appears in exactly ONE file under
//    `src/ui/**`, `src/ui/main.ts` (plan §10.2; `test/period-no-second-frame-loop.test.ts` asserts
//    it and names it). This mount returns the `View[]` and the page's frame renders them.
//  · **It holds no `dirty` flag and defines no `kick`.** Both live in `src/ui/main.ts` with the
//    frame; `opts.kick` here IS that one flag's setter, handed to every view that needs it.
//  · **It decides no layout.** It appends into the element it is given and `period/desk.ts` puts
//    that element where the paper order says (§10.1), so nothing here depends on append order.
//  · It holds no CSS class of its own — `src/ui/styles/period.css` owns the `.period-*` family.
//  · It reaches into no view. One thing crosses out of it and one crosses in, both TYPED VALUES and
//    never a DOM selector (§9.4): the `DeckBox` out, `keyBootstrap` in.

import type { Machine } from '../../../core/machine.js';
import { make, type View } from '../dom.js';
import { createSession, type Session } from '../unitrecord/session.js';
import { createDeckBoxView, type DeckBox } from './deckBoxView.js';
import { createHopperView } from './hopperView.js';
import { createKeysView } from './keysView.js';
import { createStackerView } from './stackerView.js';

/**
 * `opts.keyBootstrap` is the console session's, handed down by `period/mount.ts` — the ONE caller
 * (§6.4). It stays OPTIONAL because `deckBoxView.ts:181-183` draws `key the bootstrap` DISABLED
 * when it is absent, which is the state wave 3 shipped and the state a reader mounted without a
 * console would be in.
 *
 * The `View[]` is the return, not a frame: `src/ui/main.ts` owns the page's one animation frame and
 * renders whichever tab is visible from one `snapshot()` (§10.2).
 */
export function mountReader(
  machine: Machine,
  host: HTMLElement,
  opts: { kick: () => void; keyBootstrap?: (text: string, marks: readonly boolean[]) => boolean },
): { readonly views: readonly View[]; readonly deckBox: DeckBox } {
  const session = createSession(machine);

  const heading = make('h2');
  heading.textContent = '1402 Card Read Punch';

  // THE 1402 STATION. The hopper draws the LOADED deck and never the parsed one — the freeze
  // `unitrecord/session.ts:40-46` states and §7.1 re-proves — so it is handed the SESSION, not the
  // deck box's text. The stacker strip needs nothing but the snapshot; the key strip needs the
  // machine, because READER START and END OF FILE are keys on the 1402 and pressing one is an
  // operator action, which is what `opts.kick` is for.
  const hopper = createHopperView(session);
  const stackers = createStackerView();
  const keys = createKeysView(machine, opts.kick);

  // deckBox is handed the SESSION, not a redraw callback, and PUT DECK IN HOPPER is the one
  // action through it that changes reader state — so that single method is wrapped here rather
  // than teaching deckBoxView.ts that the gate exists. `deck` stays a GETTER: spreading `session`
  // would freeze it at build time and the deck box re-reads it after every keystroke.
  // Carried across from `unitrecord/mount.ts:60-70` VERBATIM BUT FOR ONE LINE: that mount's
  // `if (loaded) dirty = true;` is `opts.kick()` here, because the `dirty` flag it set moved up
  // into `src/ui/main.ts` with the frame (§10.2's wave-3 row) and `opts.kick` is now its setter.
  const gated: Session = {
    get deck() { return session.deck; },
    setDeckText: (text) => session.setDeckText(text),
    putDeckInHopper(): boolean {
      const loaded = session.putDeckInHopper();
      if (loaded) opts.kick();
      return loaded;
    },
    hopperCards: (r) => session.hopperCards(r),
    bufferedCard: (r) => session.bufferedCard(r),
  };
  // `keyBootstrap` is FORWARDED and never defaulted: the twelve characters go through the SAME
  // keyboard a person uses, one at a time, with the WORD MARK key on the 2nd and the 12th (§6.4),
  // and wrapping an absent hook in an always-present arrow would light a dead button. Its BOOLEAN
  // is forwarded with it — false is the locked 1415 keyboard refusing the characters, and the deck
  // box needs it to write the refusal instead of a success note. The property
  // is rebuilt rather than passed through because `exactOptionalPropertyTypes` refuses a
  // `T | undefined` where the target declares `keyBootstrap?: T`.
  const deckBox = opts.keyBootstrap === undefined
    ? createDeckBoxView(gated, { kick: opts.kick })
    : createDeckBoxView(gated, { kick: opts.kick, keyBootstrap: opts.keyBootstrap });

  host.append(make('hr'), heading, deckBox.el, hopper.el, keys.el, stackers.el);

  // ONE mount call per view, added in the wave that builds it (plan §10.7, §11). The order here is
  // the RENDER order and it is the DOM order above.
  const views: readonly View[] = [hopper, keys, stackers];
  return { views, deckBox };
}
