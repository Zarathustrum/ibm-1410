// src/ui/period/session.ts — the PERIOD PAGE's own view state: six fields and their pure
// transitions. SIX, because that is enough for §13's criteria to assert the page headlessly and
// small enough that it never becomes a store.
// Source: Phase-4 plan §4.10 (this file, given verbatim there), §5.3 (`reading` is a VIEW field),
// §10.2 (the per-view joined diff key the same-object return is FOR), §11 ownership note 1 (the
// wave-5 append to `test/period-is-dom-free.test.ts`), §15 rows
// `GREEN_BAR_IS_THE_DEFAULT_WITH_A_WHITE_TOGGLE` and `THE_RULER_IS_THE_FORM`.
//
// WHICH MACHINE: NONE. This module carries no hardware claim, because nothing in it is machine
// state — every machine read on the period surface is `machine.snapshot()`. `reading` is the one
// field that could be mistaken for a machine field and is not: it is the chain the PAGE and the
// LISTING are READ through, never the chain the 1403 printed with (plan §5.3). Changing it changes
// what is drawn and never what was printed.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It touches no DOM.** It imports one type and nothing else, and
//    `test/period-is-dom-free.test.ts` carries the required-path case that holds it to that — the
//    one case wave 5 appends to that file's list (plan §11 ownership note 1).
//  · **It holds nothing.** `reduce` is pure; the ONE live `PeriodViewState` lives in
//    `period/mount.ts`, which is the only place a `dispatch` exists.
//  · **It counts nothing.** `form` and `card` clamp against BOUNDS THE CALLER PASSES: the form
//    stack is the 1403's to count and the card faces are the 1402's, and neither belongs here.
//  · It knows no CSS class and no colour. `src/ui/styles/period.css` decides what `bars === true`
//    looks like; this field only says which of the two the operator asked for.

import type { PrintChain } from '../../core/devices/printer1403.js';

export interface PeriodViewState {
  readonly tab: 'machine' | 'internals';
  readonly bars: boolean;          // green bar vs plain white — GREEN_BAR_IS_THE_DEFAULT… (§15)
  readonly reading: PrintChain;    // which chain the PAGE and the LISTING are read through
  readonly ruler: boolean;         // the 132-position ruler over the form
  readonly form: number;           // which form of the printed stack is scrolled to
  readonly card: number;           // 0-based index of the card face on show
}

export type PeriodAction =
  | { readonly kind: 'tab'; readonly tab: PeriodViewState['tab'] }
  | { readonly kind: 'bars' } | { readonly kind: 'ruler' } | { readonly kind: 'chain' }
  | { readonly kind: 'form'; readonly form: number }
  | { readonly kind: 'card'; readonly card: number };

/**
 * MACHINE ROOM is the default tab — §1's storyboard opens at the desk and not at the panel — and
 * the first form of the stack is form 1, not form 0: `paginate` numbers forms from one, the way an
 * operator counts the sheets coming off the 1403 (plan §4.10).
 */
export const INITIAL_VIEW_STATE: PeriodViewState =
  { tab: 'machine', bars: true, reading: 'A', ruler: true, form: 1, card: 0 };

/** Into `[lo, hi]`, inclusive. The caller's bounds are the only counts this module ever sees. */
const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi);

/**
 * PURE. `form` and `card` clamp against bounds the caller passes; everything else is a toggle or a
 * set. `reduce` returns the SAME OBJECT when nothing changed, so a view's joined-key diff (§10.2)
 * sees no change and touches no DOM — which is why the three toggles build a new object
 * unconditionally (a toggle always changes its field) while `tab`, `form` and `card` compare first.
 *
 * `bounds.forms` is a COUNT and `form` is 1-based, so the top of the range is `forms` itself;
 * `bounds.cards` is a COUNT and `card` is a 0-BASED INDEX, so the top is `cards - 1`. An empty
 * hopper (`cards === 0`) has no face to show and pins `card` at 0 rather than at -1.
 */
export function reduce(
  s: PeriodViewState,
  a: PeriodAction,
  bounds: { readonly forms: number; readonly cards: number },
): PeriodViewState {
  switch (a.kind) {
    case 'tab':
      return a.tab === s.tab ? s : { ...s, tab: a.tab };
    case 'bars':
      return { ...s, bars: !s.bars };
    case 'ruler':
      return { ...s, ruler: !s.ruler };
    case 'chain':
      return { ...s, reading: s.reading === 'A' ? 'H' : 'A' };
    case 'form': {
      const form = clamp(a.form, 1, Math.max(1, bounds.forms));
      return form === s.form ? s : { ...s, form };
    }
    case 'card': {
      const card = clamp(a.card, 0, Math.max(0, bounds.cards - 1));
      return card === s.card ? s : { ...s, card };
    }
  }
}
