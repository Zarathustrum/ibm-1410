// src/ui/period/paper/cardGeometry.ts — one 80-column card face as ARITHMETIC. WAVE 1.
// Source: docs/plans/phase-4-period-ui.md §4.4 (the types) and §5.4 (the table, every row tagged);
// extracted from src/ui/period/unitrecord/cardView.ts:32-45 plus the two helpers at :47-53, with
// their comments. Research: console-and-physical.md §10 "80-column card" for every dimension and
// §13 rows 4-6 for the three fallbacks this file has to say out loud.
//
// WHICH MACHINE: the IBM 1402 Card Read-Punch's card — the general-purpose 5081 layout, as read by
// a 1410. The interpretation band is printed by a PRINTING PUNCH (IBM 22-5526-4 p.8 `[verified]`),
// which is neither the 1403's 48-graphic chain nor the 1415's typeball.
//
// EVERY GEOMETRY NUMBER HERE IS `[likely]`, not `[verified]`: §10's card table cites secondary
// sources (Jones / Wikipedia; ANSI X3.21-1967 was not read), and §13 of that file says to use them
// and say so — which is what the four `OPEN:` comments below do. `[verified]` in that table: 80
// columns, 12 rows, the band (22-5526-4 p.8), and the printed face's arrangement — column numbers
// under row 0 and again under row 9, the 12/11 zone rows unprinted, "IBM" vertical at the left
// edge (22-5526-4 Figs.3-5 pp.9, 12).
//
// The holes are DERIVED from the stored BCD by `punchMask`; there is no second punch table in this
// project (plan §5.4). One table, two namings: src/core/bcd.ts documents the same glyph column as
// "the 1410 A2 print glyph" (PRINT_CHAIN = 'A2'), because the chain changes which glyph a CODE
// prints, never the 64.
//
// WAVE 3 ADDS ONE CONSTANT AT THE FOOT OF THIS FILE, and it is not a card number:
// `HOPPER_SLIVER_LIMIT`, the 1402 file feed's RENDERING BUDGET (plan §7.1). It lives here for the
// same reason the geometry does — a number with a test, outside the files that touch the DOM — and
// it has no `OPEN:` block, because a rendering budget is not an uncertainty about the machine.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//   · It draws nothing — no DOM, no SVG node, no colour, no caption; strings and numbers only, so
//     the face is gateable in node without jsdom (plan §12.1 T0, §13 criterion 13) and wave 3's
//     reader/cardFaceView.ts computes NOTHING. Hundredths of an inch throughout, so the viewBox IS
//     the card and the face scales with its CSS width at all three of wave 3's scales.
//   · It withdraws a device attribution it inherits: cardView.ts:14 reads "the band prints
//     `glyphOf`, the 1415 typeball's 64 characters", and a printing punch is neither a 1403 chain
//     nor the 1415's element, so the SET carries across and the ATTRIBUTION is retracted — see
//     `INTERPRETATION_BAND_PRINTS_THE_64_GLYPH_SET` at `bandGlyphs` (plan §5.4, §15).
//   · It never restrikes: a card carrying `⌑` shows `⌑` in its band whichever chain the 1403 is
//     running, which is why paper/chain.ts is a PAGE transform and never touches a card face.

import { glyphOf } from '../../../core/bcd.js';
import { CARD_COLUMNS, type Card } from '../../../core/types.js';
import { punchMask } from '../../../formats/card.js';

export interface CardGeometry {
  readonly cardW: number; readonly cardH: number;        // 737.5 × 325 — 7 3/8 × 3 1/4 in
  readonly colPitch: number; readonly rowPitch: number;  // 8.7 · 25
  readonly holeW: number; readonly holeH: number;        // 5.5 × 12.5
  readonly bandH: number; readonly cornerCut: number;    // 18.75 top 3/16 in · 25, upper LEFT
  readonly side: number;                                 // (cardW − 80·colPitch)/2 = 20.75
  readonly columns: 80; readonly rows: 12;
}

// OPEN: `CARD_GEOMETRY_IS_SECONDARY` — `[likely]`, secondary only. console-and-physical.md §10 and
// §13 row 4 give 0.087 in column pitch, 0.250 in row pitch and 0.055 × 0.125 in rectangular holes
// from Jones / Wikipedia; ANSI X3.21-1967, the governing standard, was not read. FALLBACK TAKEN:
// use them and say so — they reproduce a correct 7 3/8 in card and already shipped in
// cardView.ts:32-45. WHAT WOULD SETTLE IT: a read of ANSI X3.21-1967. A flip moves this constant
// and test/golden/card-face-a.svg.txt and NOTHING ELSE — which is the whole reason wave 1 extracts
// the numbers into this module. Plan §5.4, §15; open-questions.md, Phase 4 / Wave 1.
export const CARD_GEOMETRY_IS_SECONDARY = true;

// OPEN: `CARD_SIZE_7_3_8_BY_3_1_4` — `[likely]`. console-and-physical.md §10 and §13 row 5 give
// 7 3/8 × 3 1/4 × 0.007 in, with Wikipedia's cited IBM source unconfirmed. FALLBACK TAKEN: use it
// as-is; the aspect ratio is uncontested across every source, the card is drawn at that ratio and
// scaled by CSS width, so the number appears ONCE — here. WHAT WOULD SETTLE IT: the same ANSI
// read, or IBM's own card-stock specification. A flip costs this constant and the golden.
// Plan §5.4, §15; open-questions.md, Phase 4 / Wave 1.
export const CARD_SIZE_7_3_8_BY_3_1_4 = true;

export const CARD_GEOMETRY: CardGeometry = {
  cardW: 737.5,          // 7 3/8 in
  cardH: 325,            // 3 1/4 in
  colPitch: 8.7,         // 0.087 in
  rowPitch: 25,          // 0.250 in
  holeW: 5.5,            // 0.055 in
  holeH: 12.5,           // 0.125 in
  bandH: 18.75,          // the interpretation band, top 3/16 in
  cornerCut: 25,         // upper left, diagonal
  side: (737.5 - CARD_COLUMNS * 8.7) / 2,   // 20.75 in each margin
  columns: 80,
  rows: 12,              // 12, 11, 0, 1..9 — punchMask bit 11 down to bit 0
};

const G = CARD_GEOMETRY;
const BAND_SIZE = 12;
const NUM_SIZE = 6;
const GAP_H = G.rowPitch - G.holeH;   // 12.5 — the clear band between one row of holes and the next
const CAP_H = NUM_SIZE * 0.72;        // digit cap height: lining figures, so no descender to allow for

/** The top edge of row `r`'s holes — the hole is centred in its 0.250 in row. */
const holeTop = (r: number): number => G.bandH + r * G.rowPitch + (G.rowPitch - G.holeH) / 2;

// A column-number row goes in the CLEAR gap under row `r`'s holes, centred in it: 12.5 units of
// gap against a 4.3-unit cap leaves ~4 units of daylight above and below, so no digit can
// intersect a hole. §10 prints them under row 0 and again under row 9.
const numberY = (r: number): number => holeTop(r) + G.holeH + (GAP_H + CAP_H) / 2;

/** The centre of column `c`'s holes, `c` counted from 0. */
const colCentre = (c: number): number => G.side + c * G.colPitch + G.colPitch / 2;

/**
 * `punched === true` gives the holes the card carries, `false` every unpunched position drawn
 * faint so the pattern reads. DERIVED FROM `punchMask` (src/formats/card.ts:48) — plan §5.4: the
 * twelve rows are walked most-significant bit first, bit 11 = row 12 down to bit 0 = row 9, which
 * is the reading order a mask is punched in.
 *
 * ONE path, not one <rect> per hole: 960 nodes per card, and the deck box re-renders every card on
 * every keystroke (cardView.ts:19-21). A path costs one node and draws the same rectangles.
 */
export function holePath(card: Card, punched: boolean): string {
  const boxes: string[] = [];
  for (let c = 0; c < CARD_COLUMNS; c++) {
    const mask = punchMask(card[c] ?? 0);
    const x = colCentre(c) - G.holeW / 2;
    for (let r = 0; r < G.rows; r++) {
      const bit = ((mask >> (G.rows - 1 - r)) & 1) === 1;
      if (bit === punched) boxes.push(rect(x, holeTop(r)));
    }
  }
  return boxes.join('');
}

// OPEN: `CORNER_CUT_IS_UPPER_LEFT` — `[likely]`. console-and-physical.md §10 and §13 row 6: "one
// upper corner, diagonal; left cut standard on 5081-style layout forms", secondary sources only.
// FALLBACK TAKEN: upper LEFT, per the 5081 layout form, and already drawn that way in
// cardView.ts:78. WHAT WOULD SETTLE IT: a period 5081 card scan, or ANSI X3.21-1967. A flip is one
// `M` command here plus a re-cut of test/golden/card-face-a.svg.txt.
// Plan §5.4, §15; open-questions.md, Phase 4 / Wave 1.
export const CORNER_CUT_IS_UPPER_LEFT = true;

/** The card outline WITH its corner cut — a path, not a CSS border, or the cut is lost. */
export function outlinePath(g: CardGeometry = CARD_GEOMETRY): string {
  return `M${g.cornerCut} 0H${g.cardW}V${g.cardH}H0V${g.cornerCut}Z`;
}

/** Every text run on the face: characters plus ONE x per character, because SVG anchors each chunk
 *  on its own coordinate. Four runs — the interpretation band (`glyphOf`'s 64), the column-number
 *  row under card row 0, the row under card row 9, the rotated "IBM" in the left margin. The one
 *  run that carries `rotate` is anchored as a WHOLE and so carries a single x: the rotation is
 *  about that point and the three letters flow from it, exactly as cardView.ts:88-89 draws them. */
export interface FaceText {
  readonly chars: string; readonly x: readonly number[];
  readonly y: number; readonly size: number; readonly rotate?: number;
}

// OPEN: `INTERPRETATION_BAND_PRINTS_THE_64_GLYPH_SET` — `[unverified]`. The band is printed by a
// printing punch (22-5526-4 p.8, `[verified]` — console-and-physical.md §10), and NO source in
// docs/research/ says which graphics that punch's print unit carried. FALLBACK TAKEN: `glyphOf`'s
// 64-character set (src/core/bcd.ts:141), because a printing punch types what the punch knows —
// carried forward from cardView.ts:13-17 with its "1415 typeball" attribution WITHDRAWN, a
// different device. WHAT WOULD SETTLE IT: a period card scan with visible interpretation. A flip
// is one line here — the 1403's 48 graphics instead (one call to `chainGlyph`), or leave the band
// unprinted — plus a re-cut of test/golden/card-face-a.svg.txt, which is a pin on this ruling and
// NOT evidence about IBM's card. Plan §5.4, §15; open-questions.md, Phase 4 / Wave 1.
export const INTERPRETATION_BAND_PRINTS_THE_64_GLYPH_SET = true;

export function bandGlyphs(card: Card): readonly FaceText[] {
  const glyphs: string[] = [];
  const bandX: number[] = [];
  for (let c = 0; c < CARD_COLUMNS; c++) {
    glyphs.push(glyphOf(card[c] ?? 0));
    bandX.push(colCentre(c));
  }
  return [
    { chars: glyphs.join(''), x: bandX, y: G.bandH - 5, size: BAND_SIZE },
    numbers(numberY(2)),     // rows index 2 is card row 0
    numbers(numberY(11)),    // rows index 11 is card row 9
    // "IBM" vertical at the left edge, reading bottom to top, in the margin left of column 1.
    { chars: 'IBM', x: [G.side / 2 + 3], y: G.cardH / 2, size: 9, rotate: -90 },
  ];
}

/** All 80 column numbers as ONE run: SVG anchors each character on its own x. Zero-padded to two
 *  glyphs so the two rows line up; a real card prints them unpadded. */
function numbers(y: number): FaceText {
  const x: number[] = [];
  let chars = '';
  for (let c = 0; c < CARD_COLUMNS; c++) {
    const centre = colCentre(c);
    x.push(centre - NUM_SIZE * 0.3, centre + NUM_SIZE * 0.3);
    chars += String(c + 1).padStart(2, '0');
  }
  return { chars, x, y, size: NUM_SIZE };
}

const rect = (x: number, y: number): string =>
  `M${n(x)} ${n(y)}h${n(G.holeW)}v${n(G.holeH)}h${n(-G.holeW)}z`;

const n = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(2));

// WAVE 3 ADDITION — a RENDERING BUDGET, not a machine fact and not a §15 ledger row (plan §7.1).
// The 1402 Model 2's file feed holds up to 3,000 cards ([verified] — console-and-physical.md §7,
// A22-0526-3 pp.59-60, Figs.58-59) and `reader/hopperView.ts` draws the depth as edge slivers plus
// the literal count: at most this many slivers, because a 3,000-node stack would be rebuilt on
// every frame the machine is running. The number lives here, with a test, rather than in a file
// that touches the DOM (plan §0 bullet 1, §7.1).
export const HOPPER_SLIVER_LIMIT = 40;
