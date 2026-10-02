// src/ui/period/reader/stackerView.ts — the IBM 1402 Model 2's FIVE radial stackers, in published
// left-to-right order, with the count under each.
// Source: Phase-4 plan §7.1 ("Five pockets, not six, and the sum is carried across verbatim"),
// §3.3's stackerView row, §10.3 (inline style attributes — src/ui/styles/period.css is wave 5's),
// §11 wave 3 oracle (b), §12.1 T0.
//
// WHICH MACHINE: the 1402 Card Read-Punch Model 2 on a 1410. Five radial stackers of 1,000 cards
// each, labelled left to right 0 (NP), 4, 8/2, 1, 0 (NR); the READ feed selects 0 (NR), 1 and 8/2
// and the PUNCH feed selects 0 (NP), 4 and 8/2; cards with validity or hole-count errors stack
// automatically in NP/NR ([verified] — console-and-physical.md §7, A22-0526-3 pp.60-61). Never a
// 1401.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · It computes no number beyond the ONE sum §7.1 requires here: `8/2` is one physical pocket seen
//    from two feeds, so `pocketCounts` — moved from `unitrecord/readerView.ts:29-34` with its
//    comment — adds the reader's and the punch's counts for that pocket and nothing else. This is
//    the only place in the project that knows those two counts are one pocket (types.ts §8's own
//    note on `MachineState.reader`).
//  · It draws no card face: a pocket holds cards this UI cannot name — from counts alone WHICH card
//    is in WHICH pocket is not recoverable and nothing needs it (unitrecord/session.ts:44-49).
//  · It draws no key and no light — `reader/keysView.ts` has the Fig.60 p.61 strip.
//  · It prints no dimension in inches and no time unit (plan §2.2).
//  · **It creates no node at import time**, so a `node` run can assert `POCKET_LABELS` and
//    `pocketCounts` without a DOM (cardFaceView.ts's rule; vite.config.ts:8-11).
//  · It carries no CSS class of its own; `period.css` is wave 5's (plan §10.3).

import type { MachineState } from '../../../core/types.js';
import { make, type View } from '../dom.js';

/**
 * Left to right as the operator faces the machine ([verified] — console-and-physical.md §7,
 * A22-0526-3 pp.60-61). There are FIVE pockets, not six: 8/2 is SHARED between the read feed and
 * the punch feed. The strip never changes shape.
 */
export const POCKET_LABELS: readonly string[] = ['0 (NP)', '4', '8/2', '1', '0 (NR)'];

/**
 * `unitrecord/readerView.ts:29-34`, moved here with its comment (plan §7.1):
 *
 * Both blocks are read. `0 (NP)` and `4` are the punch feed's own pockets; `8/2` is the ONE pocket
 * the two feeds share, so its cell is the sum of what each device stacked — the machine's one
 * pocket seen from two feeds, added here because this is the only place that knows they are the
 * same pocket (plan §5, §10). `1` and `0 (NR)` are the read feed's own.
 */
export function pocketCounts(s: MachineState): readonly number[] {
  const r = s.reader;
  const p = s.punch;
  return [
    p.stackers['0'], p.stackers['4'], r.stackers['8-2'] + p.stackers['8-2'],
    r.stackers['1'], r.stackers['0'],
  ];
}

/** Presentation only — the pocket walls, and the fan that reads as five RADIAL pockets. */
const WALL = '#999';
const FAN: readonly string[] = ['-6deg', '-3deg', '0deg', '3deg', '6deg'];

/** One pocket: its published label, its wall, and the count under it. */
function pocket(label: string, index: number): { readonly el: HTMLElement; readonly count: HTMLElement } {
  const el = make('div');
  el.style.border = `1px solid ${WALL}`;
  el.style.borderTop = 'none';
  el.style.padding = '2.4em .5em .3em';
  el.style.margin = '0 .3em';
  el.style.textAlign = 'center';
  el.style.transform = `rotate(${FAN[index] ?? '0deg'})`;
  const name = make('div');
  name.textContent = label;
  name.style.color = '#666';
  const count = make('div');
  count.textContent = '0';
  el.append(name, count);
  return { el, count };
}

const line = (t: string): HTMLElement => {
  const e = make('div');
  e.textContent = t;
  return e;
};

export function createStackerView(): View {
  const heading = make('div');
  heading.textContent = '1402 stackers — five radial pockets, 1,000 cards each';

  const pockets = POCKET_LABELS.map(pocket);
  const bank = make('div');
  bank.style.display = 'flex';
  bank.style.alignItems = 'flex-end';
  bank.style.margin = '.4em 0';
  bank.append(...pockets.map((p) => p.el));

  const el = make('div');
  el.append(
    heading, bank,
    line('8/2 is ONE pocket seen from two feeds: its count is what the read feed and the punch feed '
      + 'stacked there, added (A22-0526-3 pp.60-61).'),
    // The punch half of the strip, now that the feed is written to: `pocketCounts` above has
    // always read `p.stackers['0']` and `p.stackers['4']` from the machine, and under
    // `demos/reentry.asm` the first of them moves.
    line('0 (NP) and 4 belong to the punch feed: the trajectory job writes one card for every '
      + 'printed row and the machine stacks it in 0 (NP); it selects 4 for nothing, so 4 stays '
      + 'at zero on this job.'),
    line('The read feed selects 0 (NR), 1 and 8/2; a validity or hole-count error stacks in NP/NR.'),
  );

  // readerView.ts:72-84's rule, carried across: rendered from an animation frame, so it rebuilds
  // only when a count actually changed. One joined key reads as one line (plan §14 R7).
  let key = '';
  return {
    el,
    render(s: MachineState): void {
      const counts = pocketCounts(s);
      const next = counts.join(',');
      if (next === key) return;
      key = next;
      counts.forEach((n, i) => {
        const cell = pockets[i];
        if (cell) cell.count.textContent = String(n);
      });
    },
  };
}
