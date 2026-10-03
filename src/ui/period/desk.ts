// src/ui/period/desk.ts — the machine room's five stations, placed on ONE grid in PAPER ORDER.
// Source: Phase-4 plan §3.4 (this wave's file table), §10.1 ("Mount ORDER and DISPLAY order are
// different on purpose, and the plan says so because a restyle silently breaks it"), §1 step 1
// (the order itself — SPEC SHEET and CODING SHEET at the left, the 1402 below them, the 1415 desk
// to their right, the 1403 filling the right-hand column), §2.2 (what this desk refuses to be),
// §10.3 (`src/ui/styles/period.css`, which DRAWS what this file only names);
// architecture.md §6 (the two surfaces "visually foreign to each other on purpose").
//
// WHICH MACHINE: an IBM 1410 installation's machine room. The desk holds THREE units — the 1402
// Card Read Punch, the 1415 Console-Inquiry Station and the 1403 Model 2 Printer — and two
// surfaces that are paper rather than machines: the RPG specification sheets and the Autocoder
// coding sheet, which a person filled in at a table before any of the three was touched
// (console-and-physical.md §1, §7, §8; A22-0526-3 Fig.57 p.59). This file makes no hardware claim
// of its own; every one lives in the station view it places.
//
// WHY IT EXISTS AT ALL. Mount order is a DATA-DEPENDENCY chain — the reader mount returns the deck
// box the coding station needs, which returns the source box the spec station needs, so the mounts
// run in the order the values flow. DISPLAY order is the desk's, and it is PAPER order. `place()`
// puts a station element into a NAMED grid area, so the two orders cannot disagree and nothing
// depends on `host.append` order for layout — which is what `reader/mount.ts:94`,
// `coding/mount.ts:115` and `specs/mount.ts:77` do today (§10.1).
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **No elevation, no floor plan, no cabinet, no scale and no dimension in inches** — the
//    stations are panels, not elevations (`NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED` below, §2.2).
//  · **No time unit, no clock, no speed.** `microsecondsSimulated` stays on the INTERNALS tab and
//    is never rendered as a clock (architecture.md §6, §12; §2.2; §13 criterion 18a).
//  · **No sound** (`SOUND_IS_OUT` below), and **no webfont** (`NO_WEBFONT` below).
//  · **It draws no text.** An area is an empty container until a station is placed in it, so this
//    file carries no drawn label at all; the station's own view carries every legend.
//  · **It computes nothing.** Column proportions, spacing, colour and the two paper textures are
//    `period.css`'s (§10.3); 132, 66, the three lines to a bar, the card geometry, the matrix
//    columns and the rotary angles live in DOM-free modules under `paper/` and `console/`, tested
//    in node (§0 bullet 1). No number is computed in a file that touches the DOM.

import { make } from './dom.js';

/**
 * OPEN: `DESK_IS_LIGHT_LAMINATE_ON_CHARCOAL_PEDESTALS` — `[verified from photos]` for the look;
 * `[likely]` for the Noyes palette we are NOT using.
 *
 * Cabinet and desk materials. console-and-physical.md §1 and §11: "Desk form: light-colored
 * laminate top, dark pedestals" and "Period photos: dark (charcoal) cabinets with light top
 * surfaces; light-gray Selectric; dark console front with white legend text and backlit
 * white/clear lens lights" [verified from photos] — A22-0526-3 Fig.57 p.59; S223-2648 Figs.1-3.
 * IBM's Noyes-era "Color for Computers" palette (Flame Red, Sun Yellow, Sky Blue, Deep Charcoal,
 * Light Gray) and the UW-Madison red / Wisconsin-DOA blue machines are `[likely — secondary]`.
 *
 * FALLBACK TAKEN: ONE look, read off the photographs, and **no colour chooser** — a light laminate
 * ground under the paper with charcoal station frames. It is TWO CSS custom properties,
 * `--desk-top` and `--desk-pedestal`, declared on `#machine-room` in `src/ui/styles/period.css`
 * (§10.3), because a red or blue site skin must stay a one-property change if Zarathustrum ever wants a
 * specific machine's colours.
 *
 * WHAT WOULD SETTLE IT: a colour photograph — the Postgirot Stockholm plate of 4 Jan 1965
 * (2226×1473, CC0, Wikimedia Commons) is the free candidate if the greyscale reading is
 * contradicted.
 */
export const DESK_IS_LIGHT_LAMINATE_ON_CHARCOAL_PEDESTALS = true;

/**
 * OPEN: `NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED` — `[unverified]` source, a REFUSAL in consequence.
 *
 * 1411 and 1415 cabinet dimensions. console-and-physical.md §6: "No IBM dimension figures located
 * for the 1411 or the 1415 cabinet" [unverified]; §13 row 2 says to treat the photo-derived
 * figures as approximate and "don't label with a spec number"; §9's dimension table
 * (GC22-6681-4 p.14) contains neither unit. A22-0526-3 Fig.57 p.59, the one floor photograph, has
 * 729 tape drives in it that architecture.md §12 forbids depicting.
 *
 * FALLBACK TAKEN: draw no scale elevation and no floor plan, and print NO DIMENSION IN INCHES
 * anywhere on the page — the stations are panels on a desk, not elevations, and this file gives
 * them grid areas rather than sizes. The three things a person can hold keep their inch figures
 * and nothing else does: the card and the two paper stocks (§2.2).
 *
 * WHAT WOULD SETTLE IT: nothing. **This is a refusal, not a placeholder** — if IBM's 1410
 * physical-planning figures surface, the page still does not change.
 */
export const NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED = true;

/**
 * OPEN: `SOUND_IS_OUT` — REFUSED, not open.
 *
 * No primary source publishes 1402 / 1403 / Selectric acoustics, and synthesised hammer noise
 * would be `[unverified]` art presented as fact. research/README.md's rule for `[unverified]` is
 * "Do not encode"; architecture.md §12.
 *
 * FALLBACK TAKEN: none. The desk is silent, no audio dependency is added, and no station is
 * handed a sound hook to leave unwired.
 *
 * WHAT WOULD SETTLE IT: nothing external. If Zarathustrum wants it later it is one toggle and one recorded
 * sample, **labelled a reconstruction on the page** the way the demo decks already are.
 */
export const SOUND_IS_OUT = true;

/**
 * OPEN: `NO_WEBFONT` — a ruling, ours.
 *
 * `ui-monospace, Menlo, Consolas, monospace` — the stack `index.html` already sets on `body` —
 * renders everything the Selectric and the 1403 print: `⌑` and `‡` already come out of it in
 * shipped output. The slashed zero belongs to the FORMATTER and not to a face (`printout.ts:29`,
 * `SLASHED_ZERO = 'Ø'`, C28-0351-5 p.2 — zeros slashed, the letter `O` not), and the word mark
 * and the parity underscore are combining marks. architecture.md §10; charset.md §5.
 *
 * FALLBACK TAKEN: no `@font-face`, no `@import` and no `url(http` in `period.css` — the lint of
 * §11 wave 5 oracle (e) — because a downloaded face would put a network request on a site whose
 * settled deliverable is a static local one (DECISIONS.md 2026-08-30, "Run local, Gitea"; §10.5).
 * If a platform lacks either exotic glyph, those TWO are drawn as SVG paths and still not fetched.
 *
 * WHAT WOULD SETTLE IT: nothing external; it is a deliverable constraint, not a machine fact.
 */
export const NO_WEBFONT = true;

/**
 * The five areas, in PAPER ORDER (§1 step 1). These names are the ones `period.css`'s
 * `grid-template-areas` uses, and `.period-<area>` is the class each area's element carries.
 */
export type DeskArea = 'specs' | 'coding' | 'reader' | 'console' | 'printer';

/** What `createDesk` hands back: the grid element, and one placement call per station. */
export interface Desk {
  readonly el: HTMLElement;
  place(area: DeskArea, station: HTMLElement): void;
}

/**
 * Paper order, and it is also the DOM order the areas are appended in — so the single-column
 * fallback `period.css` falls back to at a narrow window reads top to bottom in the same order the
 * grid reads left to right, and so does the keyboard.
 */
const ORDER: readonly DeskArea[] = ['specs', 'coding', 'reader', 'console', 'printer'];

/**
 * Build the machine room's grid inside `host` (`main.ts`'s `<div id="machine-room">`) and return
 * the one call that places a station in it. Every area exists from the first frame, empty or not:
 * a station that is not placed leaves a gap in the layout rather than resizing the desk under the
 * other four.
 */
export function createDesk(host: HTMLElement): Desk {
  const el = make('div', 'period-desk');
  const areas: Record<DeskArea, HTMLElement> = {
    specs: make('div', 'period-specs'),
    coding: make('div', 'period-coding'),
    reader: make('div', 'period-reader'),
    console: make('div', 'period-console'),
    printer: make('div', 'period-printer'),
  };
  for (const area of ORDER) el.append(areas[area]);
  host.append(el);

  return {
    el,
    place(area: DeskArea, station: HTMLElement): void {
      areas[area].append(station);
    },
  };
}
