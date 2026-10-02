// src/ui/period/paper/chain.ts — the 1403's A/H print-chain switch, as a PAGE transform. WAVE 1.
// Source: docs/plans/phase-4-period-ui.md §4.3 (the types) and §5.3 (the restrike, and the proof
// obligation test/period-chain.test.ts discharges).
//
// WHICH MACHINE: the IBM 1403 Model 2 PRINTER's interchangeable chains, as attached to a 1410 —
// arrangement A2/AN (commerce, report writing) and H2/HN (program languages: COBOL / FORTRAN).
// Not the 1415 console's typeball, whose 64 characters are `bcd.ts`'s `glyph` column, and not the
// 1402's card, whose interpretation band is printed by a printing punch (see cardGeometry.ts).
//
// Research: docs/research/charset.md §5 `[verified]` — A22-0526-3 pp.6-7 Figure 2 (the Commerce /
// Science columns) and GA24-3073 p.25, p.27: "The four graphics % ⌑ # @ of the AN arrangement are
// dualed with ( ) = ' of the HN arrangement". Each arrangement prints 48 graphics and EXACTLY FIVE
// code points differ; everything else is chain-independent. Two consequences carry across
// unchanged and need no entry below, because `-` and the record mark are on BOTH 48-graphic sets
// (charset.md §5, A22-0526-3 p.6 footnotes `[verified]`): `!` (minus zero) prints `-`, and `ƀ`
// (substitute blank) prints the record-mark slug `‡`. The all-64-codes bijection in
// test/period-chain.test.ts covers both without naming them.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//   · It never touches BCD. PRINTED GLYPHS IN, PRINTED GLYPHS OUT — it takes a string that already
//     came off a 1403 and returns the string the other arrangement would have printed. So it
//     composes with nothing in src/core, needs no code table, and cannot be plumbed into an
//     assembler by accident.
//   · It is never imported by anything under src/asm/**, and test/period-chain.test.ts greps to
//     say so. `renderListing`'s output is chain-A TEXT (listing1403.ts:205) pinned by
//     test/golden/hello-dad.lst; the station's A/H button is a display transform over that text
//     and never reaches the assembler.
//   · It is not a second chain table. The 48 slugs live once, in src/core/devices/printer1403.ts,
//     and test/period-chain.test.ts greps src/ui/** for a second one (plan §13 criterion 12).
//   · It never touches a card face: a card carrying `⌑` shows `⌑` in its band whichever chain the
//     1403 is running (plan §5.4).

import type { PrintChain } from '../../../core/devices/printer1403.js';

/** The FIVE dualed code points, and there are exactly five — charset.md §5 `[verified]`
 *  (A22-0526-3 pp.6-7 Fig.2; GA24-3073 p.27). `[A-glyph, H-glyph]`, in the research table's order;
 *  Hollerith/BCD/octal are 12/BA/60, 12-4-8/BA84/74, 0-4-8/A84/34, 3-8/821/13, 4-8/84/14. */
export const CHAIN_DUALS: readonly (readonly [a: string, h: string])[] =
  [['&', '+'], ['⌑', ')'], ['%', '('], ['#', '='], ['@', "'"]];

const TO_H = new Map(CHAIN_DUALS.map(([a, h]) => [a, h]));
const TO_A = new Map(CHAIN_DUALS.map(([a, h]) => [h, a]));

// OPEN: `H_CHAIN_IS_A_FIVE_GLYPH_RESTRIKE_OF_THE_A_PAGE` — a ruling of ours, mechanically proved
// over the shipped device, resting on one `[likely]` cell. charset.md §5 is `[verified]`
// (A22-0526-3 pp.6-7 Figure 2; GA24-3073 p.25, p.27) for the five duals; charset.md §5.1 is
// `[likely]` for the one cell no primary source publishes — no manual prints an explicit H-chain
// "prints as" column, so `?` (plus zero, 0o72) printing the 12-zone slug (`&` on A, `+` on H)
// rests on the dualing rule alone, and printer1403.ts:76 carries the same tag at its own point of
// use. FALLBACK TAKEN: the A/H switch is a display transform over already-printed text, exact
// because none of the five H glyphs is on the A set, the twelve codes on neither chain print blank
// one position wide on both, and `?` collides with BCD 0o60 identically on both.
// THE src/core CHANGE THIS REFUSES, COSTED: `Printer1403.chain` is `readonly`
// (printer1403.ts:366) and set in the constructor (:382), which is what makes a real second print
// a CORE change — `MachineOptions.printer?: { chain?: PrintChain; tape?: CarriageTape }` forwarded
// into `new Printer1403(…)`, about 4 lines in machine.ts with no default behaviour change, PLUS a
// machine rebuild every time the toggle moves.
// WHAT WOULD SETTLE IT: a primary source publishing the H arrangement's own "prints as" column.
// A flip costs those four lines and the rebuild; test/period-chain.test.ts proves the restrike
// over all 64 codes in both directions against `chainGlyph`, so if the ruling is ever wrong the
// test says so before the page does. Plan §4.3, §5.3, §15; open-questions.md, Phase 4 / Wave 1.
export const H_CHAIN_IS_A_FIVE_GLYPH_RESTRIKE_OF_THE_A_PAGE = true;

/**
 * Re-print a 1403 page under the other chain arrangement.
 *
 * `chain` NAMES THE ARRANGEMENT TO READ THE TEXT THROUGH — the destination, not the source. So
 * `restrike(aText, 'H')` maps the A glyphs `& ⌑ % # @` to `+ ) ( = '`, and `restrike(hText, 'A')`
 * is the inverse. Every other character, blanks included, passes through untouched.
 */
export function restrike(text: string, chain: PrintChain): string {
  const dual = chain === 'H' ? TO_H : TO_A;
  let out = '';
  for (const glyph of text) out += dual.get(glyph) ?? glyph;
  return out;
}
