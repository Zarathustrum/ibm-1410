// src/ui/period/reader/cardFaceView.ts — ONE 80-column card face, at three scales, over ONE
// geometry module.
// Source: Phase-4 plan §7.1 ("The card face, at three scales, from ONE geometry module"; the five
// caption templates), §3.3's cardFaceView row, §4.4 / §5.4 (the geometry this file consumes),
// §10.3 (inline style attributes — src/ui/styles/period.css is wave 5's), §13 criterion 13.
//
// WHICH MACHINE: the card the IBM 1402 Card Read-Punch feeds a 1410 — the general-purpose 5081
// layout. 80 columns, 12 rows, the interpretation band across the top and the printed face's
// arrangement are [verified] (IBM 22-5526-4 p.8, Figs.3-5 pp.9, 12; console-and-physical.md §10);
// every dimension is [likely] and lives once, in paper/cardGeometry.ts, with its own ledger rows.
// The band is printed by a PRINTING PUNCH — neither the 1403's chain nor the 1415's element.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · It computes NOTHING. `outlinePath`, `holePath` and `bandGlyphs` (paper/cardGeometry.ts,
//    wave 1) have already emitted every coordinate; this file appends nodes, formats numbers and
//    places them (plan §0 bullet 1). The three scales are three CSS widths — presentation, not
//    geometry: the viewBox IS the card, so the path strings are scale-invariant and ONE golden
//    (test/golden/card-face-a.svg.txt) covers all three through the geometry module alone.
//  · It prints no dimension in inches on the face. The card's geometry is DRAWN, never labelled
//    (plan §2.2: the only inch figures on this page are the ones a person can hold, and they are
//    not printed as numbers on the artefact itself).
//  · **It creates no node at import time.** `CARD_CAPTIONS` is plain data, which is what lets
//    test/period-reader.test.ts import it under `environment: 'node'` (vite.config.ts:8-11) and
//    assert the five templates without a DOM — §2.2 refuses jsdom, so no oracle may ever
//    instantiate this view (plan §13 criterion 13, §3.3).
//  · It carries no CSS class of its own beyond `.card-face`, whose name is KEPT from
//    unitrecord/cardView.ts:92 and which index.html:31 already rules (plan §10.3's inventory).
//  · It does NOT claim an ordinal it cannot know: `CARD_CAPTIONS.loadedDeck` departs from §7.1's
//    `loaded deck, card N` template and names the position instead — the one recorded deviation in
//    this file, argued at the constant itself (orchestrator ruling, wave 3 review).

import type { Card } from '../../../core/types.js';
import { make, svg, text } from '../dom.js';
import { CARD_GEOMETRY as G, bandGlyphs, holePath, outlinePath, type FaceText } from '../paper/cardGeometry.js';

/**
 * The three scales, and they are three CSS widths: the read-buffer card at the read station, a
 * card in a deck (the file feed's front card, the deck box's faces), a condensed object card.
 */
export type CardScale = 'buffer' | 'deck' | 'object';

/**
 * §7.1's five caption templates, as DATA — built at import time and never a node.
 *
 * Every face says which deck it belongs to, because two of the five can hold different bytes at
 * the same moment (the deck box is re-parsed on every keystroke while the file feed still holds
 * the deck that was LOADED — unitrecord/session.ts:40-46). That is why the caption is a required
 * parameter of `renderCardFace` and not a default. Where a template takes `N`, it is the card's
 * index within the source the caption names, counted from 1.
 *
 * **ONE RECORDED DEPARTURE from §7.1's table (orchestrator ruling, wave 3 review).** The table
 * gives the file feed `loaded deck, card N`, but `session.hopperCards(reader)` returns the LAST
 * `reader.hopper` cards of the loaded deck (session.ts:68-70) and the FROZEN session exposes no
 * absolute ordinal — after READER START the face drawn from it is card 2 of the deck, not card 1.
 * A wrong ordinal is exactly what the caption exists to prevent, so `loadedDeck` carries no
 * ordinal at all: it is a plain string naming the position, not a template. The other four are
 * unchanged. This is a recorded deviation, not a design — an accessor giving the loaded deck's
 * length would restore the template in one line.
 */
interface CardCaptions {
  readonly loadedDeck: string;
  readonly deckBox: (n: number) => string;
  readonly readStation: (n: number) => string;
  readonly objectDeck: (n: number) => string;
  readonly executeCard: string;
}

export const CARD_CAPTIONS: CardCaptions = {
  loadedDeck: 'loaded deck, next card',
  deckBox: (n: number): string => `deck box, card ${n}`,
  // Always 1: the 1414 read buffer holds exactly ONE card, so `N` is its index within that source
  // and there is never a second (types.ts §8's `reader.buffered` is a boolean).
  readStation: (n: number): string => `read station, card ${n}`,
  objectDeck: (n: number): string => `object deck, card ${n}`,
  executeCard: 'execute card — E in column 1',
};

// OPEN: `CARD_STOCK_IS_CREAM` — `[unverified]`, NEW IN PHASE 4. The colour of the card stock:
// NO CITATION EXISTS — no file in docs/research/ gives one, and console-and-physical.md §11
// ("Period colors and materials") does not reach the card. Recorded per research/README.md's
// `[unverified]` rule, as a NAMED FALLBACK rather than something passed off as period.
// FALLBACK TAKEN: `#f7f3e8` below, inline until wave 5 takes it as the `--card-stock` custom
// property (plan §10.3); the shipped face drew `#fff` (cardView.ts:78). WHAT WOULD SETTLE IT: a
// period card scan or an IBM card-stock specification. A flip is one line here and one shade.
// Plan §7.1, §10.3, §15; open-questions.md, Phase 4 / Wave 3.
export const CARD_STOCK_IS_CREAM = true;

/** Presentation only — the stock, the edge, the unpunched grid, the punches, the printing. */
const CARD_STOCK = '#f7f3e8';
const EDGE = '#444';
const UNPUNCHED = '#e6e6e6';
const PUNCHED = '#111';
const PRINTING = '#222';

/**
 * The three scales as CSS widths on the wrapper; index.html:31 sizes the SVG at `width: 100%` OF
 * that wrapper. The width is set EXPLICITLY and not only as a maximum, and the wrapper is a
 * definite flex item: inside a flex container (deckBoxView.ts's face row) a content-sized wrapper
 * would leave the SVG at the 300 x 150 replaced-element default (wave 3 review, M3).
 */
const SCALE_WIDTH: Readonly<Record<CardScale, string>> = {
  buffer: '44em', deck: '30em', object: '22em',
};

/** Formatting, not arithmetic — cardView.ts:127's own two-decimal form, carried across. */
const n = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(2));

const path = (d: string, fill: string, stroke?: string): SVGElement => {
  const e = svg('path');
  e.setAttribute('d', d);
  e.setAttribute('fill', fill);
  if (stroke !== undefined) {
    e.setAttribute('stroke', stroke);
    e.setAttribute('stroke-width', '1');
  }
  return e;
};

/**
 * One text run: `x` is a LIST, one coordinate per character, because SVG anchors each chunk on its
 * own coordinate. The run that carries `rotate` carries a SINGLE anchor and turns about it — the
 * "IBM" in the left margin, exactly as cardView.ts:88-89 drew it.
 */
function run(t: FaceText): SVGElement {
  const e = text(t.chars);
  e.setAttribute('x', t.x.map(n).join(' '));
  e.setAttribute('y', n(t.y));
  e.setAttribute('font-size', String(t.size));
  e.setAttribute('text-anchor', 'middle');
  e.setAttribute('fill', PRINTING);
  if (t.rotate !== undefined) {
    const about = `${n(t.x[0] ?? 0)} ${n(t.y)}`;
    e.setAttribute('transform', `rotate(${String(t.rotate)} ${about})`);
  }
  return e;
}

/**
 * One card face with its caption UNDER it. The outline is a PATH and not a CSS border, or the
 * upper-LEFT corner cut is lost (cardView.ts:78).
 */
export function renderCardFace(card: Card, caption: string, scale: CardScale): HTMLElement {
  const face = svg('svg');
  face.setAttribute('viewBox', `0 0 ${String(G.cardW)} ${String(G.cardH)}`);
  face.append(
    path(outlinePath(), CARD_STOCK, EDGE),
    path(holePath(card, false), UNPUNCHED),
    path(holePath(card, true), PUNCHED),
    ...bandGlyphs(card).map(run),
  );

  const el = make('div', 'card-face');
  el.style.width = SCALE_WIDTH[scale];
  el.style.maxWidth = '100%';
  el.style.flex = '0 0 auto';
  el.style.margin = '.4em 0';
  const label = make('div');
  label.textContent = caption;
  label.style.color = '#555';
  el.append(face, label);
  return el;
}
