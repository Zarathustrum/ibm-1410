// oracle/mce-figure34.ts — the MCE (op `E`) step-by-step editing trace, as data.
//
// ============================================================================
// PROVENANCE
// ============================================================================
//
// A22-0526-3 **Figure 34** (pp.34-35), "Step-By-Step Editing Process", reprinted verbatim as
// **S223-2698 Figures 23A/23B** (pp.52-53). The read landed via S223-2698: A22-0526-3's own
// bitsavers scan has **no text layer**, S223-2698's does. Fetched from bitsavers, extracted with
// `pdftotext -layout`, and every cell cross-checked against the `[verified]` hand transcription of
// 14 key steps in `docs/research/opcodes.md` §7.3 — which was made from the A22-0526-3 page image
// by eye, so the two sources are independent renderings of the same figure.
//
// This closes the confirmation read that `PHASE-1-NOTES.md` §4 carried out of Phase 1 and that
// `docs/plans/phase-1b.md` §4 Wave D names as the fixture's precondition: **all 46 steps landed**,
// so this is oracle preference (1), not the 14-step fallback.
//
// EPISTEMICS, per cell, honestly:
//   [verified] — the cell is one of the 14 steps opcodes.md §7.3 prints, and the OCR agrees with
//                it character for character (steps 12, 13, 14, 16, 20, 25, 35, 36, 37, 38, 40,
//                42, 43, 46). Two independent readings of the same printed figure.
//   [ocr]      — read from the S223-2698 text layer alone. Clean cells are recorded as read;
//                every cell where the OCR was damaged carries an inline comment naming what the
//                OCR showed and what resolved it. Nothing here is a guess: each such cell is
//                pinned by the scan mechanism of §7.6 (BAR -1 per B-cycle on scans 1 and 3, +1 on
//                scan 2, terminating cycle included; AAR -1 on A-cycles only, stopping at 12155),
//                by the known control-word and A-field contents, and by arithmetic continuity
//                with its neighbours. A cell that could not be pinned that way would be a
//                STOP-and-report, and there are none.
//
// ============================================================================
// THE YIELD CONVENTION — why this file is not indexed by the manual's step number
// ============================================================================
//
// `docs/plans/phase-1b.md` §4 Wave D: `Cpu.stepCycle()` runs the **whole I phase in one call**,
// and `alu.ts`'s established convention is one yield per B position with the A cycle folded in.
// Figure 34 prints A cycles as steps of their own. So:
//
//   * Steps **1-12** are the I phase. They are NOT entries — they collapse into a single
//     `stepCycle()`. They are recorded in the table below for the record and nowhere else.
//   * Steps **13, 21, 23, 26, 28, 30, 33, 35** are A-only cycles. They are NOT entries either;
//     each folds into the FOLLOWING B entry, named in that entry's `folds` field. The folded
//     entry's `aar` is the value the A cycle left behind — which is also the value the figure
//     prints on the B row itself, so no information is lost.
//   * Every other step 14-46 is one entry, in figure order. **Array order = yield order.**
//
// 26 entries, 8 folds, one skid. 34 steps (13-46) minus 8 A-only rows = 26.
//
// ============================================================================
// THE I PHASE — Figure 34 steps 1-12, for the record only (no entries)
// ============================================================================
//
//  Step  Cycle  IAR    AAR    BAR    Data B  Put back  B field  Remark
//   1    I-op   00002  ?????  ?????  E       E         initial  Read Instruction Op Code
//   2    I-1    00003  1????  ?????  1       1         Same     Load A-address register
//   3    I-2    00004  12???  ?????  2       2         Same     Load A-address register
//   4    I-3    00005  121??  ?????  1       1         Same     Load A-address register
//   5    I-4    00006  1216?  ?????  6       6         Same     Load A-address register
//   6    I-5    00007  12163  ?????  3       3         Same     Load A-address register
//   7    I-6    00008  12163  0????  0       0         Same     Load B-address register
//   8    I-7    00009  12163  04???  4       4         Same     Load B-address register
//   9    I-8    00010  12163  046??  6       6         Same     Load B-address register
//  10    I-9    00011  12163  0468?  8       8         Same     Load B-address register
//  11    I-10   00012  12163  04685  5       5         Same     Load B-address register
//  12    I-11   00012  12163  04685  op      op        Same     Op Code & next instruction   [verified §7.3]
//
// The figure prints partially-loaded address registers with `?` for the digits not yet shifted
// in (`1????`, `04???`). The same `?` convention is what step 38's data column means — see there.
// OCR notes on this block: step 9's cycle type came out `IB` (= `I8`); step 6's remark wrapped to
// its own line; step 4's put-back column came out `'1`. None of it is load-bearing — this block is
// a comment.
//
// ============================================================================
// THE A-ONLY CYCLES — folded, for the record
// ============================================================================
//
//  Step  IAR    AAR    BAR    Data B  Put back  Reads   Folds into  Remark
//   13   00012  12162  04685  6       6         12163   step 14     Execute EDIT instruction  [verified §7.3]
//   21   00012  12161  04678  2       2         12162   step 22
//   23   00012  12160  04677  4       4         12161   step 24
//   26   00012  12159  04675  7       7         12160   step 27
//   28   00012  12158  04674  5       5         12159   step 29
//   30   00012  12157  04673  2       2         12158   step 31
//   33   00012  12156  04671  0       0         12157   step 34
//   35   00012  12155  04670  0 (WM)  0 (WM)    12156   step 36     A-field word mark sensed  [verified §7.3]
//
// The A-cycle rows print the SAME BAR as the B row before them (BAR is not modified on an A
// cycle) and an AAR one lower than the row before (AAR is modified by -1 on every A cycle).
// AAR runs 12163 -> 12155: eight A cycles for an eight-character A field, stopping at 12155 =
// `A - LA` = 12163 - 8 (opcodes.md §7.3). Step 35 reads the word-marked high-order `0` at 12156
// and puts it back **with** its word mark — the A field is never written (§7.2).
//
// The figure also prints an **A-data-register** column, which is not transcribed into the entries
// below (nothing in `edit.ts` is asserted against it). It is worth one line anyway: it holds the
// word-marked `0` read at step 35 from there all the way through step 46, long after step 36
// stored that `0` at 04670 and through every remaining B cycle. That is the direct evidence for
// the register-slot model `edit.ts` implements — the A-data register is a SLOT refilled by an
// A cycle, not emptied by the store, so it keeps its last character while the CPU executes
// however many B cycles follow (p.50: "an A-field character stored in the A-data register on an
// A-cycle might remain in the register until the CPU executes several B-cycles").
//
// ============================================================================
// READING THE ADDRESS COLUMNS
// ============================================================================
//
// The figure prints each address register AFTER that cycle's modification. So on a scan-1 or
// scan-3 B cycle the character read out came from `bar + 1`; on a scan-2 B cycle and on the
// scan-1 -> scan-2 skid (whose modifier is already +1) it came from `bar - 1`. opcodes.md §7.5
// states this explicitly for the skid: it reads **04668** while the BAR column prints 04669.
// Every `data` glyph below satisfies that rule against the running B-field state.
//
// ============================================================================
// WHY THIS EXAMPLE IS A TWO-SCAN EDIT DESPITE THE `$`
// ============================================================================
//
// The `$` at 04669 does NOT set the floating-dollar latch. The body ends when the A-field word
// mark is sensed (step 35) — the body latch resets and the extension latch sets — so by step 37
// the `$` is read in the **extension**, not the body, and only a body `$` left of the suppression
// code floats (opcodes.md §7.1, §7.2). Two scans; final BAR = suppression code + 1 = 04677.
//
// ============================================================================
// 1401-vs-1410 TRAP
// ============================================================================
//
// The 1401 Reference Manual A24-1403-5 Figure 58 traces the **identical** example (same control
// word, same A field) in **41** steps with 3-digit addresses and **no skid row**. Nothing in this
// file may be checked against it. opcodes.md §7.6 `[verified]`.

/** One B-cycle (or skid B-cycle) of Figure 34, as the figure prints it. */
export interface MceTraceEntry {
  step: number;            // the manual's step number for this B/skid cycle (14..46)
  folds?: number;          // the A-cycle step folded into this entry (13, 21, 23, 26, 28, 30, 33, 35)
  kind: 'B' | 'skid';
  iar: number; aar: number; bar: number;   // as the figure prints them at this step
  data: string;            // B data-register glyph (' ' for blank)
  dataWm?: boolean;        // the figure marks the data char with a word mark
  putBack: string;
  putBackWm?: boolean;
  bField?: string;         // the 17 chars at 04669-04685 at end of cycle, ONLY where the figure prints a change ('Same' rows omit)
  remark?: string;         // the figure's remark, cleaned
}

/**
 * The setup the figure runs on. Blanks are real spaces here; the figure writes them `b`.
 *
 * Cross-checked against opcodes.md §7.3's setup paragraph, which is `[verified]` off the
 * A22-0526-3 page image, and against the S223-2698 header block above Figure 23A. That header
 * block's own OCR is damaged in two places and neither is used: the control word lost its
 * leading `$` (`bbb,bbO.bb&CR&**`), and the "Result of Edit Op" A-field came out `0257426`,
 * seven digits — the A field is `00257426` before AND after, opcodes.md §7.2 `[verified]`,
 * A22-0526-3 Figure 27. The figure's own column header row prints the control word intact.
 */
export const MCE_FIGURE34_SETUP = {
  /** `E 12163 04685`, an 11-character instruction at 00001-00011. */
  instruction: 'E1216304685',
  instructionAddr: 1,
  /** Next sequential instruction. IAR holds 00012 for the whole of the E execution. */
  nsi: 12,
  /** A-address as punched — the units position of the data field. */
  aAddr: 12163,
  /** B-address as punched — the units position of the control word. */
  bAddr: 4685,

  /** Data field at 12156-12163, high-order first. Never written by the edit (§7.2). */
  aField: '00257426',
  aFieldHighOrder: 12156,
  aFieldUnits: 12163,
  /** The A-field word mark, over the high-order `0`. Sensed at step 35. */
  aFieldWm: 12156,

  /** Control word `$bbb,bb0.bb&CR&**` at 04669-04685, 17 characters, high-order first. */
  controlWord: '$   ,  0.  &CR&**',
  controlWordHighOrder: 4669,
  controlWordUnits: 4685,
  /** The B-field word mark, over the `$`. Read out and put back WITHOUT it at step 37 (§7.4). */
  controlWordWm: 4669,

  /**
   * The zero-suppression code — the rightmost `0` in the control word, at 04676. Step 25 replaces
   * it with its A digit `4` and auto-sets a word mark there; step 46 reads that `4` back out and
   * erases the word mark, ending the operation. Final BAR = 04676 + 1 (§7.3).
   */
  suppressionCode: 4676,

  /**
   * Where the control characters sit, since several cells below only make sense against it:
   *   04669 `$`  04670 b   04671 b   04672 b   04673 `,`  04674 b   04675 b   04676 `0`
   *   04677 `.`  04678 b   04679 b   04680 `&` 04681 `C`  04682 `R` 04683 `&` 04684 `*` 04685 `*`
   * Status portion 04680-04685 (right of the first blank at 04679), body 04669-04679.
   */
  bodyStart: 4679,
} as const;

/**
 * Figure 34 steps 14-46, one entry per B or skid B cycle, A cycles folded in. Array order is
 * yield order: `edit.ts` yields once per entry.
 *
 * The `bField` strings are the 17 characters at 04669-04685 with real spaces for the figure's
 * `b`. Every one of them was replayed against the previous state plus this cycle's `putBack` at
 * this cycle's read address; all 17 printed strings are self-consistent, and the figure's own
 * arithmetic disagrees with itself nowhere.
 */
export const MCE_FIGURE34_TRACE: readonly MceTraceEntry[] = [
  // ---- SCAN 1, status portion (04680-04685): `*` undisturbed, `&` blanked, `CR` blanked
  //      because the A-field sign is plus (units digit `6`, no zone). §7.1.
  {
    step: 14, folds: 13, kind: 'B',
    iar: 12, aar: 12162, bar: 4684,
    // [verified §7.3] data `*`, put back `*`, B field same. OCR printed both glyphs as `•`
    // (bullet); reads 04685, which the control word puts at `*`.
    data: '*', putBack: '*',
    // The figure's register columns are post-modification: step 13 leaves the address at 04685,
    // and this step-14 B cycle reads 04685 and decrements to 04684 — matching opcodes.md §7.3's
    // row for this step. A review had flagged a §7.3 disagreement here; that turned out to be a
    // tool artifact (rtk output compression during the review pass), not a real discrepancy —
    // both sources agree on 04684.
    // Step 13's remark, "Execute EDIT instruction", belongs to the folded A cycle, not to this
    // B cycle. It is recorded in the A-only table above rather than fabricated onto this entry.
  },
  {
    step: 15, kind: 'B',
    iar: 12, aar: 12162, bar: 4683,
    // [ocr] same `•`-for-`*` OCR damage as step 14; reads 04684 = `*`. Status, undisturbed.
    data: '*', putBack: '*',
  },
  {
    step: 16, kind: 'B',
    iar: 12, aar: 12162, bar: 4682,
    // [verified §7.3] `&` -> blank. OCR of the B field was `!bbb,bbO.bb&CRb**`: `!` for `$` and
    // `O` for `0`, both recurring OCR substitutions in this figure. Reads 04683 = `&`.
    data: '&', putBack: ' ', bField: '$   ,  0.  &CR **',
  },
  {
    step: 17, kind: 'B',
    iar: 12, aar: 12162, bar: 4681,
    // [ocr] The row is split across two OCR lines and the data cell came out `,R` — the leading
    // comma is a stray mark; the glyph is `R`. Pinned three ways: BAR continuity puts the read at
    // 04682, the control word has `R` there, and the printed B field `$bbb,bbO.bb&Cbb**` shows
    // exactly position 04682 newly blanked. `CR` status blanked because the A sign is plus (§7.1).
    data: 'R', putBack: ' ', bField: '$   ,  0.  &C  **',
  },
  {
    step: 18, kind: 'B',
    iar: 12, aar: 12162, bar: 4680,
    // [ocr] data cell OCR'd lowercase `c`; the control word has `C` at 04681. Second half of `CR`.
    data: 'C', putBack: ' ', bField: '$   ,  0.  &   **',
  },
  {
    step: 19, kind: 'B',
    iar: 12, aar: 12162, bar: 4679,
    // [ocr] cycle-type cell OCR'd `8` for `B`; the step number `19` and the -1 BAR delta settle it.
    // Reads 04680 = `&` -> blank. This is the last status position.
    data: '&', putBack: ' ', bField: '$   ,  0.      **',
  },

  // ---- SCAN 1, body (04669-04679). The first blank ends the status portion, resets the units
  //      latch, sets the body latch, and stores the A digit sitting in the A-data register.
  {
    step: 20, kind: 'B',
    iar: 12, aar: 12162, bar: 4678,
    // [verified §7.3] first blank: body starts, A digit `6` stored at 04679.
    // OCR printed the BAR as `04618` — a `7`->`1` substitution. Resolved by the -1 chain
    // (04679 - 1) and by the B field, which changes at 04679 and nowhere else.
    data: ' ', putBack: '6', bField: '$   ,  0. 6    **',
  },
  {
    step: 22, folds: 21, kind: 'B',
    iar: 12, aar: 12161, bar: 4677,
    // [ocr] clean row. Reads 04678 = blank, stores the A digit `2` read by the folded step 21.
    data: ' ', putBack: '2', bField: '$   ,  0.26    **',
  },
  {
    step: 24, folds: 23, kind: 'B',
    iar: 12, aar: 12160, bar: 4676,
    // [ocr] The row is split across three OCR lines (`24  B` alone, a stray `, ,`, then the data),
    // and the put-back cell came out `•`. It is `.`, not `*`: the read address is 04677, which the
    // control word puts at `.`, and the B field prints "Same" — a `.` right of the suppression
    // code remains where written (§7.1), and decimal control is not in effect here because that
    // needs the point LEFT of the code (§7.2).
    data: '.', putBack: '.',
  },
  {
    step: 25, kind: 'B',
    iar: 12, aar: 12160, bar: 4675,
    // [verified §7.3] THE ZERO-SUPPRESSION CYCLE. Reads the `0` at 04676, stores the A digit `4`
    // there, and auto-sets a word mark over it (§7.4 `[verified]`; the figure's put-back cell
    // OCR'd `4,` — the trailing comma is the word-mark tick). The marker row above the B field
    // was lost to OCR on this row, but the next printed B field (step 27) carries word-mark ticks
    // over both `$` and this `4`, which is only possible if this cycle set the second one.
    // Cycle-type cell OCR'd `e·`; step number and B field settle it as `B`.
    data: '0', putBack: '4', putBackWm: true, bField: '$   ,  4.26    **',
    remark: 'Zero Suppress',
  },
  {
    step: 27, folds: 26, kind: 'B',
    iar: 12, aar: 12159, bar: 4674,
    // [ocr] cycle-type cell OCR'd `,9`; B field OCR'd `$bbb,b74.26bbbb. *`, i.e. the trailing
    // `**` came out `. *`. Resolved by continuity: the two `*` at 04684-04685 are status and are
    // never touched by any cycle in this trace.
    data: ' ', putBack: '7', bField: '$   , 74.26    **',
  },
  {
    step: 29, folds: 28, kind: 'B',
    iar: 12, aar: 12158, bar: 4673,
    // [ocr] the worst-damaged B field in the figure: `$i>bb,51I26bbbb • •`. Reconstructed, not
    // read: previous state `$   , 74.26    **` with this cycle's put-back `5` at the read address
    // 04674 gives `$   ,574.26    **`. The OCR's `$i>bb,` is `$bbb,` and `51I26` is `574.26` with
    // characters dropped. Cycle-type cell OCR'd `B,`.
    data: ' ', putBack: '5', bField: '$   ,574.26    **',
  },
  {
    step: 31, folds: 30, kind: 'B',
    iar: 12, aar: 12157, bar: 4672,
    // [ocr] data and put-back cells OCR'd `'` (apostrophe) for `,`; row split across two lines;
    // B field cell OCR'd `Some` for `Same`. Reads 04673 = `,`, returned unchanged — scan 1 returns
    // a body character that is not 0, blank, `*`, `$` or `&` (S223-2698 p.50 rule 1).
    data: ',', putBack: ',',
  },
  {
    step: 32, kind: 'B',
    iar: 12, aar: 12157, bar: 4671,
    // [ocr] STEP NUMBER CORRECTED: the OCR prints `31` twice, on this row and the one before it.
    // This is step 32 — the figure's rows are consecutive, step 33 follows, and 46 steps require
    // it. No A cycle runs between steps 31 and 32 (AAR holds at 12157) because a B character
    // returned unchanged is followed immediately by another B cycle, with no A cycle in between
    // (S223-2698 p.50: "If the B-channel character is returned to the B-field on a B-cycle, the
    // CPU executes another B-cycle to read out the next B-field character immediately").
    // B field's trailing `**` OCR'd `. *` again.
    data: ' ', putBack: '2', bField: '$  2,574.26    **',
  },
  {
    step: 34, folds: 33, kind: 'B',
    iar: 12, aar: 12156, bar: 4670,
    // [ocr] cycle-type cell OCR'd `8` for `B`; step 33's BAR OCR'd `04~71` for 04671.
    // B field trailing `**` OCR'd `* *`.
    data: ' ', putBack: '0', bField: '$ 02,574.26    **',
  },
  {
    step: 36, folds: 35, kind: 'B',
    iar: 12, aar: 12155, bar: 4669,
    // [verified §7.3] The A-field word mark was sensed on step 35, so the body latch is reset and
    // the extension latch set — yet the A character ALREADY IN the A-data register is still stored
    // here (§7.2 `[verified]`, S223-2698 p.50). Only further A CYCLES stop; AAR is done at 12155.
    // The figure marks TWO word marks in the B field at this point, over `$` (04669) and over the
    // `4` at 04676; the OCR's tick row sits at columns 90 and 98 against a B-field column starting
    // at 90, which is `$` and (allowing the figure's tick to print a half-cell right, as it does
    // on every unspaced row) the `4`. Cycle-type cell OCR'd `8`; the B field OCR'd with a spurious
    // space, `$002,57 4.26bbbb **`, on this and the next two rows.
    data: ' ', putBack: '0', bField: '$002,574.26    **',
  },
  {
    step: 37, kind: 'B',
    iar: 12, aar: 12155, bar: 4668,
    // [verified §7.3] END OF SCAN 1. Reads the word-marked `$` at 04669 — the B-field high-order
    // word mark — and puts it back WITHOUT the word mark (§7.4: "a word mark is gated to the
    // B-field only when the low-order 0 in the control word is sensed"). The tick row above this
    // row carries marks over the data register and over the B field's `4` only; the mark over the
    // B field's `$` is gone, exactly as §7.3 prints it.
    // The `$` does not float: it is read in the extension, not the body (see header).
    // Remark OCR'd "Sense Ward Mark...., Rev, Scan"; the `....` is the figure's arrow.
    data: '$', dataWm: true, putBack: '$', bField: '$002,574.26    **',
    remark: 'Sense Word Mark -> Rev. Scan',
  },

  // ---- SKID 1->2. Reads and rewrites 04668, one position OUTSIDE the control word, preserving
  //      any word mark there (§7.5 `[verified]`). BAR is printed after the +1 modification.
  {
    step: 38, kind: 'skid',
    iar: 12, aar: 12155, bar: 4669,
    // [verified §7.3] IMPORTANT — `?` IS THE FIGURE'S OWN GLYPH, NOT OCR NOISE. The example never
    // says what lives at 04668 (it is the units position of whatever field sits to the left), so
    // the figure prints `?`, the same convention it uses for the not-yet-loaded address-register
    // digits in steps 1-11 (`1????`, `04???`). opcodes.md §7.3 renders both cells as `—` for the
    // same reason. A consumer must therefore NOT assert `data`/`putBack` on this entry against
    // emulated storage; assert the address touched (04668), that the byte is unchanged, and that
    // its word mark survives.
    // Remark OCR'd "Units P~sition of next Field".
    data: '?', putBack: '?', bField: '$002,574.26    **',
    remark: 'Units Position of next Field',
  },

  // ---- SCAN 2 (reverse), BAR +1 per cycle. Insignificant zeros and commas left of the first
  //      significant digit are blanked; the first significant digit resets the suppress latch.
  {
    step: 39, kind: 'B',
    iar: 12, aar: 12155, bar: 4670,
    // [ocr] clean row. Reads 04669 = `$`, returned unchanged — not a zero or a comma.
    data: '$', putBack: '$',
  },
  {
    step: 40, kind: 'B',
    iar: 12, aar: 12155, bar: 4671,
    // [verified §7.3] first blanking cycle. Data cell OCR'd `Q` for `0`.
    data: '0', putBack: ' ', bField: '$ 02,574.26    **',
  },
  {
    step: 41, kind: 'B',
    iar: 12, aar: 12155, bar: 4672,
    // [ocr] clean row.
    data: '0', putBack: ' ', bField: '$  2,574.26    **',
  },
  {
    step: 42, kind: 'B',
    iar: 12, aar: 12155, bar: 4673,
    // [verified §7.3] first significant digit (1-9): zero-suppress latch resets. From here the
    // figure prints "Same" until the terminating cycle. B field cell OCR'd `Some`.
    data: '2', putBack: '2',
  },
  {
    step: 43, kind: 'B',
    iar: 12, aar: 12155, bar: 4674,
    // [verified §7.3] comma returned unchanged — the suppress latch was already reset at step 42.
    // Row split across three OCR lines with both `,` glyphs rendered `'`; B field cell OCR'd
    // `~ame`. The read address 04673 is the control word's comma, which settles the glyph.
    data: ',', putBack: ',',
  },
  {
    step: 44, kind: 'B',
    iar: 12, aar: 12155, bar: 4675,
    // [ocr] clean row.
    data: '5', putBack: '5',
  },
  {
    step: 45, kind: 'B',
    iar: 12, aar: 12155, bar: 4676,
    // [ocr] clean row; B field cell OCR'd `Same,`.
    data: '7', putBack: '7',
  },
  {
    step: 46, kind: 'B',
    iar: 12, aar: 12155, bar: 4677,
    // [verified §7.3] LAST STEP. Reads the `4` at 04676 carrying the word mark step 25 auto-set,
    // and puts it back plain — the auto word mark is erased and the operation ends (§7.4). The
    // tick row above this row marks the data register only, and no B-field tick is printed on any
    // later row, which is the erasure. (That row also carries a stray `0` eight columns right of
    // the put-back column; it is not a word-mark tick — §7.3 prints "4 (no WM)" and §7.4 requires
    // the erasure.) B field's trailing `**` OCR'd `* *`.
    // Final: IAR 00012, AAR 12155, BAR 04677 = suppression code 04676 + 1.
    data: '4', dataWm: true, putBack: '4', bField: '$  2,574.26    **',
  },
];

/**
 * Register and B-field state when the E instruction retires.
 *
 * `AAR = 12163 - 8` confirms `A - LA`; `BAR = 04676 + 1` confirms `suppression code + 1`, the
 * plain-zero-suppression row of opcodes.md §7.3's eight-case BAR table. `[verified]`
 */
export const MCE_FIGURE34_END = {
  iar: 12,
  aar: 12155,
  bar: 4677,
  bField: '$  2,574.26    **',
} as const;
