// src/core/edit.ts — `E` Move Characters and Edit: the three-scan ring, the two skid B-cycles,
// the four control latches and the eight-case BAR table.
// Source: docs/plans/phase-1b.md §3.6 (the design and the latch table), §4 Wave D (the yield
// convention), §7 (the per-storage-cycle iterator MODE = I/E CYCLE half-cycles), §9 (the
// `[unverified]` items this file touches — `MCE_WRAP_TRAPS` and `MCE_EARLY_A_WM_ENDS_AT_SCAN_1`
// below, each with its `open-questions.md` row).
// Machine facts: research/opcodes.md §2 p.31-33 (the `E` row), §7.1 (Figure 28's control
// characters and the body/status split), §7.2 (the five scan variants, the extension latch, the
// truncation rule, "the A field is never written"), §7.3 (the eight-case register table and the
// Figure 34 worked example), §7.4 (both word-mark answers), §7.5 (the skid cycles), §7.6 (the
// implementation recipe, the scan-2 termination quote, the SimH deviations and the two 1401
// traps), §1.3 (Figure 8's register symbols), §1.5 (Figure 7's `Z` and `D` timing terms),
// §4.1 (the sign convention); research/charset.md §1-§2 (the code points named by glyph below).
//
// THE OPERATION IS A GENERATOR, ONE YIELD PER B-CYCLE, SKIDS INCLUDED, A-CYCLES FOLDED IN
// (phase-1b.md §4 Wave D, §7). `Cpu.stepCycle()` half-cycles the E phase one storage cycle at a
// time, which is how the internals page shows the B field becoming `$  2,574.26    **` position
// by position. The yielded value is always `undefined`: `LatchTraceRecord.scan` is the closed
// union `'scan1' | 'scan3'` and `unit` is `'units' | 'body' | 'extension'` (`types.ts`), with no
// room for scan 2 or for a skid, and widening it would cost a `types.ts` and a `trace.ts` hunk
// this plan does not budget. The cycle boundary is what `stepCycle()` consumes; the record is
// the level-3 latch trace's alone, and MCE contributes none.
//
// WHAT FIGURE 34 PINS, AND WHAT IT DOES NOT. A22-0526-3 Figure 34 / S223-2698 Figures 23A-23B is
// a 46-step trace of ONE two-scan edit; `opcodes.md` §7.3 transcribes 14 of those steps. Every
// register value below is either read off those steps or derived from S223-2698 pp.50-51's
// stated mechanism (−1 per B-cycle on scans 1 and 3, +1 on scan 2, the terminating cycle
// included), independently confirmed by cube1us `scan_mod[] = { 0, -1, +1, -1 }`.
//
// THREE TRAPS, ALL FROM §7.6, NONE OF THEM COPIED HERE:
//  1. SimH `i7010_cpu.c` `case OP_E` decides the single-scan case by READING A BYTE at the
//     already-decremented BAR — outside the control word — and testing it for `0`. The single
//     scan is decided by the ZERO-SUPPRESS LATCH and nothing else here: "If the zero suppress
//     latch is not set when the B-field word mark is sensed, the first scan and the edit
//     operation end" (S223-2698 p.50). cube1us agrees with the manual.
//  2. SimH's scan-2→3 skid is a bare `DownReg(BAR)` with no storage reference; both skids below
//     are real read/rewrite B-cycles, because §7.5 says they are.
//  3. The 1401's A24-1403-5 Figure 58 traces the IDENTICAL example in 41 steps with 3-digit
//     addresses and NO skid row. Nothing in this file is checked against it.
// And the one 1401 habit that changes an ANSWER: 223-2588-2 p.53 — a single-character A field
// word-marked in its units position is NOT transferred by the 1401 and IS transferred and
// edited by the 1410. This file has no special case for it, which is the point: the scan below
// treats a one-character A field exactly like any other. How much of the "edit" half of that
// sentence survives when the A word mark arrives that early is `MCE_EARLY_A_WM_ENDS_AT_SCAN_1`.

import { checkAddress } from './address.js';
import { BLANK } from './bcd.js';
import { UnsupportedFeature } from './checks.js';
import {
  BCD6, WM, ZA, ZB,
  type Addr, type Cell, type ExecContext, type LatchTraceRecord, type Storage,
} from './types.js';

/** The two zone bits — the sign half of a stored character (opcodes.md §4.1, charset.md §1). */
const ZONES = ZB | ZA;

// The code points this operation names by glyph rather than by class (research/charset.md §2;
// `bcd.ts` BCD_TABLE, the same transcription). `BLANK` — rank 00, no bits at all, and NOT the
// substitute blank — comes from `bcd.ts` so there is one transcription of it and one BLANK_TRAP
// note. Everything else is a Figure 28 control character (§7.1) or half of a `CR`.
const ZERO = 0o12;        // rank 54, the digit zero: 8-2, not no-bits
const COMMA = 0o33;       // rank 14
const PERIOD = 0o73;      // rank 01
const MINUS = 0o40;       // rank 12
const AMPERSAND = 0o60;   // rank 06
const DOLLAR = 0o53;      // rank 07
const ASTERISK = 0o54;    // rank 08
const LETTER_C = 0o63;    // rank 28 — the left half of `CR`
const LETTER_R = 0o51;    // rank 44 — the right half of `CR`, and the half read first

/**
 * OPEN: MCE'S `−1` BAR MODIFICATION AND THE TWO SKID CYCLES ARE NOT WRAP-MODELLED.
 *
 * Scan 1 and scan 3 decrement BAR on every B-cycle including the terminating one, and both
 * skids touch a byte OUTSIDE the declared B field — `B_high − 1` and `suppression code + 1`
 * (§7.5). No edition of the Principles of Operation, A22-1407-2 or the CE Handbook says what
 * happens when one of those addresses falls outside installed storage; cube1us/1410's
 * ALD-derived reading wraps to 0 at core size and to 99999 below 0, raising a storage-wrap
 * latch. This emulator models no wrap: every one of those addresses goes through the same
 * `checkAddress` every other operation uses, so an MCE that walks off the end of core stops
 * with an ADDRESS CHECK rather than silently wrapping (research/architecture.md §4,
 * A22-0526-3 p.8). Flipping it would mean implementing the wrap and the latch.
 *
 * The `open-questions.md` row for this ALREADY EXISTS — the opcodes.md-section cpu row "Address
 * wrap during MCE's −1 BAR modification, and the interaction with the two skid cycles that
 * read/rewrite bytes OUTSIDE the declared B field" — and it names this exact fallback ("Or trap
 * the case if the emulator does not model wrap"), so NO NEW ROW IS ADDED for it
 * (phase-1b.md §9, §2's four-touch rule for that file).
 */
export const MCE_WRAP_TRAPS = true;

/**
 * OPEN: AN A-FIELD WORD MARK SENSED BEFORE THE SUPPRESSION CODE ENDS THE EDIT AT SCAN 1.
 *
 * §7.2 and S223-2698 p.50 say the body latch is RESET and the extension latch SET when the
 * A-field word mark is sensed, and nothing in either says the body latch can come back. Encoded
 * literally — the `case BLANK` and `case ZERO` arms below set `body` only `if (!extension)` — that
 * has a consequence no page states: a `0` reached after the A field has run out never becomes a
 * suppression code (the `zeroSuppress` arm is gated on `body`), so the zero-suppress latch is
 * still off at the B-field word mark and the whole edit is a SINGLE SCAN with
 * `BAR = addr(B high-order WM) − 1` (§7.3 row 1). It bites hardest on the shortest A field there
 * is: a one-character A field word-marked in its own units position senses the word mark on the
 * FIRST A-cycle, so every control-word position left of the B address is already in the extension.
 *
 * The defence for it is p.50's own extension paragraph — "The CPU executes successive B-cycles to
 * read out the remaining characters in the control word. EITHER THE SAME CHARACTERS READ OR BLANKS
 * ARE RETURNED to the B-field" — which describes the extension as a copy-or-blank walk with no
 * suppression in it. What it collides with is 223-2588-2 p.53's single-character rule, quoted at
 * §7.6: the 1401 "will NOT transfer this single-character field", the 1410 "WILL transfer AND
 * EDIT" it — and under this reading a one-character field is transferred but the only editing left
 * is `&` blanking and status handling, never zero suppression. The page does not settle which the
 * 1410 does; p.53 says "edit" without saying how much of the edit survives.
 *
 * The vector that separates the two readings is `test/tier1-mce.test.ts`'s SINGLE CHARACTER EDIT,
 * and it separates them on BAR, not on the B field: both readings print `bbb7`, this one ends at
 * `BAR = 00499` (single scan, `B_high − 1`) and the other at `BAR = 00504` (two scans, code + 1).
 * See `docs/research/open-questions.md`, Phase 1b section.
 */
export const MCE_EARLY_A_WM_ENDS_AT_SCAN_1 = true;

/**
 * Which of §7.3's eight rows ended this edit. The eight are the whole of the BAR answer — the
 * Principles of Operation print "Varies with result of edit" in every edition — and four of
 * them share one formula, so they are kept apart by name rather than collapsed: the row is what
 * a reader diffs against the page.
 */
export type MceTermination =
  | 'noSuppressionCode'
  | 'plainZeroSuppression'
  | 'asteriskProtection'
  | 'signControlLeft'
  | 'decimalControlSignificant'
  | 'decimalControlNoSignificantDigit'
  | 'floatingDollar'
  | 'floatingDollarAndDecimalControl';

/**
 * A SIGNIFICANT digit — one of `1`-`9` with no zone bits. Zero is not significant (it is what
 * the reverse scan blanks) and a zoned digit is not one either: `J` is the alphabetic J to the
 * print chain and to the collating sequence alike. research/charset.md §2: the digits `1`-`9`
 * are octal 01-11 and `0` is octal 12.
 */
function isSignificantDigit(bcd6: number): boolean {
  return (bcd6 & ZONES) === 0 && bcd6 >= 0o01 && bcd6 <= 0o11;
}

/**
 * Whether this character RE-ARMS zero suppression when scan 2 meets it with the latch already
 * reset — S223-2698 p.51's list, transcribed as its complement: "a character that is not a
 * significant digit (1-9), blank, comma, 0, minus sign or decimal". The six exemptions are the
 * characters an edited amount is made of; everything else — a letter of `CARS`, an `*`, a `$` —
 * is text, and the amount that follows text has leading zeros of its own to suppress. (An `&` is
 * already a blank by the time scan 2 sees it, scan 1 having written one there, so it is exempt
 * through `BLANK` rather than on its own account.)
 */
function reArmsZeroSuppression(bcd6: number): boolean {
  return !(isSignificantDigit(bcd6)
    || bcd6 === BLANK || bcd6 === COMMA || bcd6 === ZERO || bcd6 === MINUS || bcd6 === PERIOD);
}

/**
 * `E aaaaa bbbbb`, all three lengths (opcodes.md §2 pp.31-33, §7).
 *
 * The A address is the UNITS (rightmost) position of the data field and the B address the
 * rightmost position of the edit control word — Figure 34's `E 12163 04685` over an A field at
 * 12156-12163 and a control word at 04669-04685. The result is left in B; **the A field is
 * never written** (§7.2, Figure 27 prints `00257426` before and after), so every A access below
 * is a `read`.
 *
 * THE SCAN RING (§7.6's table, transcribed):
 *
 *   Scan 1   right → left, −1 per B-cycle, from the B address to the B-field word mark,
 *            written back WITHOUT that word mark. A-cycles run only here.
 *   Skid 1→2 one cycle at `B_high − 1`, +1, read and rewritten PRESERVING any word mark —
 *            the units position of the neighbouring field (§7.5).
 *   Scan 2   left → right, +1 per B-cycle, from `B_high` to the auto-set word mark at the
 *            suppression code, which is erased there.
 *   Skid 2→3 one cycle at `suppression code + 1`, −1, rewritten unchanged.
 *   Scan 3   right → left, −1, from the suppression code until a `$` is stored into the first
 *            blank or a decimal point is read.
 *
 * BAR is modified on EVERY B-cycle including the terminating one (S223-2698 pp.50-51; cube1us
 * `scan_mod[]`), which is why the register the eight-case table prints falls out of the walk
 * rather than being assigned at the end — and why the switch at the bottom of this function is
 * a CHECK of the walk against §7.3 rather than the place BAR is decided.
 *
 * **Registers:** `NSI / A − LA / special`. IAR and AAR are evaluable, so `isa/regs.ts` applies
 * them; BAR is this executor's, set per B-cycle so a half-cycled edit shows it moving.
 * **Indicators:** none — §2's row prints none and nothing here touches a latch.
 */
export function* moveEditFields(
  ctx: ExecContext,
): Generator<LatchTraceRecord | undefined, void, void> {
  const s: Storage = ctx.storage;

  // ── The A-data register and the A cursor ────────────────────────────────────────────────
  // "An A-field character stored in the A-data register on an A-cycle might remain in the
  // register until the CPU executes several B-cycles" (S223-2698 p.50, quoted at §7.2). So the
  // register is a slot, not a per-cycle fetch: it refills at the START of the B-cycle that finds
  // it empty and is emptied by the B-cycle that stores it. That is exactly Figure 34's cadence —
  // step 13 (A) before step 14 (B), step 21 (A) between the stores at 20 and 22, step 23 (A)
  // before the `.` at 24 whose character is not stored until 25 — and it is what makes the
  // printed AAR right at every one of the 14 transcribed steps.
  let aCursor: Addr = ctx.sym.A;
  let aChar: number | null = null;
  let aExhausted = false;          // the A-field word mark has been sensed
  let la = 0;                      // A-cycles taken — Figure 8's `LA`, and `AAR = A − LA`
  let aSignMinus = false;

  // ── The four latches of phase-1b.md §3.6's table, plus body / extension ──────────────────
  // Each is set during scan 1 and read by §7.6's termination test; nothing here is derivable
  // from the control word at write time, which is why the scan sets them.
  let body = false;                // §7.1: begins at the rightmost blank or zero…
  let extension = false;           // §7.2: …and ends when the A-field word mark is sensed
  let zeroSuppress = false;        // §7.1 `0` row + §7.6's single-scan rule
  let asterisk = false;            // §7.2 "an `*` in the body left of the suppression code"
  let floatingDollar = false;      // §7.1's `$` row read as the parallel of `*` — see below
  let decimalControl = false;      // §7.2 "a point in the body left of the suppression code"
  let signControlLeft = false;     // §7.2's named variant, for §7.3's row 4
  let crPending = false;           // the `C` half of a `CR` whose `R` was just blanked

  let codeAddr: Addr | null = null;   // the RIGHTMOST `0` — §7.1, "the rightmost limit"
  let bar: Addr = ctx.sym.B;
  let bHigh: Addr = bar;              // filled in when the B-field word mark is sensed
  let lb = 0;                         // scan-1 B-cycles — Figure 8's `LB`

  // ═══ Scan 1 — right to left, from the B address to the B-field word mark ══════════════════
  for (;;) {
    const cell: Cell = s.read(bar);
    const c = cell & BCD6;
    const bWordMark = (cell & WM) !== 0;

    // The folded-in A-cycle. `AAR = A − LA` counts these and nothing else, so an A field longer
    // than the control word's blanks and zeros leaves AAR wherever the B-field word mark stopped
    // it — §7.3, "Other A-field characters are not processed after the B-channel word mark is
    // detected", which is why `A − LA` holds only for legal usage.
    if (aChar === null && !aExhausted) {
      const aCell: Cell = s.read(aCursor);
      let bcd = aCell & BCD6;
      if (la === 0) {
        // §2's row: "Any sign in the units position of the data is removed from the character
        // moved into B." The sign is the zone bits of the units position and MINUS IS ALWAYS A
        // B BIT ALONE (§4.1, Figure 11 p.16); everything else — no zones, B+A, A alone — is
        // plus. Only the units character is stripped, because that is the position the sentence
        // is written over.
        aSignMinus = (bcd & ZONES) === ZB;
        bcd &= ~ZONES;
      }
      aChar = bcd;
      la++;
      if ((aCell & WM) !== 0) {
        // §7.2: "When the A-field word mark is sensed the body latch is reset and the extension
        // latch is set." The character already in the register is STILL STORED on the following
        // B-cycle — only further A-cycles stop. That nuance is Figure 34 step 36, where the `0`
        // fetched at step 35 lands at 04670 after the body has already ended.
        aExhausted = true;
        body = false;
        extension = true;
      }
      aCursor = checkAddress(s, aCursor - 1, 'decrement');
      ctx.regs.aar = aCursor;
    }

    let put = c;
    let putWm = false;      // §7.6: scan 1 "writes the char back without the word mark"
    let consume = false;

    if (!body && !aSignMinus && (c === MINUS || c === LETTER_R || (crPending && c === LETTER_C))) {
      // §7.1's `CR` and `-` rows: "Body: undisturbed. Status: blanked (BOTH POSITIONS) if the
      // A-field sign is plus; undisturbed if minus", and §7.2's "Sign control left" for the same
      // pair in the high-order status position. Figure 34 steps 17-18 blank the `R` at 04682 and
      // the `C` at 04681 against a plus A sign.
      //
      // JUDGEMENT CALL — nothing states HOW the two-position `CR` is recognised. Scan 1 runs
      // right to left, so the `R` is read first: it blanks itself and arms `crPending`, and the
      // very next status character is blanked too if it is a `C`. That reproduces "both
      // positions" with no lookahead and without blanking a stray `C` in status text. The
      // alternative — blanking every status `C` and `R` independently — gives the same answer
      // for `CR` and mangles more status text, which is why it is not the one taken.
      put = BLANK;
      crPending = c === LETTER_R;
      if (extension) signControlLeft = true;      // §7.2's variant name: the HIGH-ORDER status
    } else {
      crPending = false;

      switch (c) {
        case BLANK:
          // §7.1: "Replaced by the character from the corresponding A-field position", and the
          // rightmost blank or zero is where the body begins. `!extension` is
          // MCE_EARLY_A_WM_ENDS_AT_SCAN_1: once the A-field word mark has set the extension
          // latch the body latch does not come back.
          if (!extension) body = true;
          consume = true;
          break;

        case ZERO:
          // §7.1: "Zero-suppression code. Replaced by the corresponding A character. The
          // RIGHTMOST `0` in the control field marks the rightmost limit of suppression."
          // Scan 1 runs right to left, so the first `0` sensed in the body IS that rightmost
          // one; any further `0` to its left is an ordinary blank-like data position.
          // `!extension` again is MCE_EARLY_A_WM_ENDS_AT_SCAN_1, and this is the arm where it
          // decides the whole shape of the operation: no body latch, no suppression code, one scan.
          if (!extension) body = true;
          if (body && !zeroSuppress) {
            zeroSuppress = true;
            codeAddr = bar;
            // §7.2: "the `0` itself takes its A digit and A WORD MARK IS AUTOMATICALLY SET
            // THERE". It is the terminator scan 2 runs to, and §7.4's second unconditional
            // answer is that it is always erased before the end.
            putWm = true;
          }
          consume = true;
          break;

        case PERIOD:
          // §7.1: "Remains where written, unless decimal control is in effect and the data field
          // had no significant digit." §7.2's decimal-control enable, verbatim: "A point in the
          // body left of the suppression code makes the point print only when the field has
          // significant digits." Left of the code, on a right-to-left scan, means the code has
          // already been sensed. The point takes no A character — Figure 34 step 24 reads `.` at
          // 04677 and the digit fetched at step 23 is not stored until step 25.
          if (body && zeroSuppress) decimalControl = true;
          break;

        case COMMA:
          // §7.1: "Undisturbed where written, unless zero suppression reaches it with no
          // significant numeric character to its left" — that half is scan 2's. §7.2's extension
          // latch is this half: "When the A-field word mark is sensed, the remaining commas in
          // the B-field are set to blanks" (A22-0526-3 p.31).
          if (extension) put = BLANK;
          break;

        case AMPERSAND:
          // §7.1: "Produces a blank in the output field. May be used in multiples." Figure 34
          // steps 16 and 19 blank the `&`s at 04683 and 04680. No body/status distinction is
          // stated and none is made.
          put = BLANK;
          break;

        case ASTERISK:
          // §7.1: "Status: undisturbed. Body: asterisk protection; an `*` in the body to the
          // RIGHT of the suppression code is treated as a blank." §7.2 supplies the other
          // direction verbatim: "An `*` in the body LEFT of the suppression code enables it",
          // and the fill it enables happens inside scan 2, so asterisk protection is a two-scan
          // operation (§7.6).
          //
          // THE ENABLING `*` CONSUMES AN A CHARACTER TOO. S223-2698 p.50 states the body rules
          // as a numbered list, and rule 4 covers BOTH characters in one sentence: "Sets the `*`
          // fill or floating dollar latch if the B-channel character is an `*` or `$` and the
          // zero suppress latch is set. THE A-CHANNEL CHARACTER IS STORED IN THE B-FIELD." So
          // `*` and `$` behave identically here — the latch AND the store — and the earlier
          // reading (that only `$` takes a digit, argued from §7.1 naming `b` and `0` alone and
          // §7.2 stating the A-digit replacement for `$`) was an argument from silence against a
          // page that states it outright. The vector that separates the two readings is
          // `test/tier1-mce.test.ts`'s "the enabling `*` consumes an A character": `00345` under
          // `bb*b0` edits to `**345` here and to `*3*45` if the `*` stores nothing.
          if (body) {
            if (zeroSuppress) asterisk = true;
            consume = true;
          }
          break;

        case DOLLAR:
          // §7.1: "Status: undisturbed. Body: floating dollar sign; a `$` in the body to the
          // RIGHT of the suppression code is treated as a blank."
          //
          // [inferred] — THE ENABLE CONDITION IS NOWHERE STATED IN §7 (phase-1b.md §3.6's latch
          // table carries it as an inference, not a quotation). §7.1 gives only the mirror above;
          // that a `$` in the body LEFT of the code enables the floating dollar is the PARALLEL
          // of §7.1's `*` row, whose left/right pair §7.2 does state — and S223-2698 p.50's body
          // rule 4 names `*` and `$` in ONE sentence with ONE condition ("the zero suppress latch
          // is set"), which is the parallel written down. Rule 4's second half, "The A-channel
          // character is stored in the B-field", is why the enabling `$` takes an A digit; §7.2
          // says the same in other words ("Forward scan replaces the `$` with the corresponding A
          // digit and continues to the B word mark") and adds the restriction that it cannot be
          // used right of the decimal point.
          //
          // Figure 34 is the guard on this inference: its `$` at 04669 is left of the code at
          // 04676 and is left UNDISTURBED, with a two-scan `BAR = 04677`. It survives because by
          // step 37 the body latch is already off (the A-field word mark came at step 35), so
          // 04669 is STATUS. Read without the body latch, this rule would turn Figure 34 into a
          // three-scan edit and print the wrong BAR.
          if (body) {
            if (zeroSuppress) floatingDollar = true;
            consume = true;               // p.50 rule 4, the same half that governs `*` above
          }
          break;

        default:
          // Status text and every other character: undisturbed, read out and put back.
          break;
      }
    }

    // §7.2, verbatim: "Asterisk protection and floating dollar sign cannot be used in the same
    // control field." An ASSERTION, not a comment (phase-1b.md §3.6): the manual states no
    // machine behaviour for the combination, so a control word carrying both is a programming
    // error and this is where it surfaces — at the cycle that raises the second latch, with the
    // address of the character that raised it.
    //
    // THIS IS AN EMULATOR REFUSAL, NOT A DOCUMENTED CHECK. The real 1410 raises no check here:
    // no manual names one, and what the hardware does with both latches up is unknown. It is
    // raised as `UnsupportedFeature` — "a feature of the real machine deliberately outside this
    // emulator" (checks.ts) — so it becomes a STOP REASON the operator sees rather than a bare
    // `Error` escaping `step()` mid-instruction, which `cpu.ts stopOn` rethrows as an emulator
    // bug. `unsupportedFeature` is the honest mapping of the three existing stops: it says the
    // emulator will not guess, where `instructionCheck` would claim a machine check that no
    // source documents. Nothing is added to `StopReason` for it.
    if (asterisk && floatingDollar) {
      throw new UnsupportedFeature(
        'op E: asterisk protection and floating dollar in one control field '
        + '(opcodes.md §7.2, A22-0526-3 p.33) — the manual forbids it and states no behaviour, '
        + 'so this emulator refuses rather than inventing one',
        bar,
      );
    }

    if (consume && aChar !== null) {
      put = aChar;
      aChar = null;
    }

    // §7.4's FIRST unconditional answer: "The high-order B-field word mark is ALWAYS removed,
    // during scan 1, in every variant including the single-scan no-suppression case that no
    // manual traces" — S223-2698 p.50, "a word mark is gated to the B-field only when the
    // low-order 0 in the control word is sensed", and Figure 34 step 37, where the word-marked
    // `$` at 04669 is put back plain. The `&& !bWordMark` is that rule beating the auto word
    // mark in the one degenerate layout where the two positions coincide.
    s.setChar(bar, put, putWm && !bWordMark);
    lb++;

    if (bWordMark) bHigh = bar;
    bar = checkAddress(s, bar - 1, 'decrement');   // −1 on EVERY B-cycle, terminating included
    ctx.regs.bar = bar;
    yield undefined;
    if (bWordMark) break;
  }

  // §7.6, quoting S223-2698 p.50: "If the zero suppress latch is not set when the B-field word
  // mark is sensed, the first scan and the edit operation end." THE LATCH, and nothing else —
  // no storage read at the decremented BAR, which is SimH deviation 1. BAR already holds
  // `B_high − 1`, §7.3's row-1 answer, because the terminating cycle decremented it.
  if (!zeroSuppress || codeAddr === null) {
    finish(ctx, 'noSuppressionCode', { bHigh, codeAddr: null, dollarAddr: null,
      la, lb, barWalked: bar });
    return;
  }
  const code: Addr = codeAddr;

  // ═══ Skid 1 → 2 — one B-cycle at `B_high − 1`, +1 ════════════════════════════════════════
  // §7.5: a real storage reference one position OUTSIDE the control word — "Units Position of
  // next Field", Figure 34 step 38 — and the one MCE store that PRESERVES the word mark it
  // finds: cube1us writes it with `AsmChannelWMB` where every other MCE store uses
  // `AsmChannelWMNone`. An emulator that routes this through the normal MCE write path silently
  // erases a word mark belonging to the neighbouring field. The extension latch is also set here.
  {
    const cell: Cell = s.read(bar);
    s.setChar(bar, cell & BCD6, (cell & WM) !== 0);
    extension = true;
    bar = checkAddress(s, bar + 1, 'increment');
    ctx.regs.bar = bar;
    yield undefined;
  }

  // ═══ Scan 2 — left to right, from `B_high` to the auto word mark at the code ══════════════
  // §7.2: "all zeros and punctuation left of the first significant character, up to and
  // including the suppression-code position, become blanks"; §7.2's asterisk variant is "as
  // above except the reverse scan writes asterisks instead of blanks", which is why the fill is
  // one character chosen once.
  // Scan 2's own three latches, and none of them is scan 1's. S223-2698 pp.50-51 gives the
  // reverse scan a decimal-control latch of its OWN, set while the scan runs, and the zero
  // suppress latch it reads is the one the scan itself turns off and can turn back ON:
  //
  //   "The first significant digit (1-9) encountered in the second scan resets the zero suppress
  //    latch. If the zero suppress latch is not reset when a decimal is sensed, the decimal
  //    control latch is set, canceling the blanking effect of the zero suppress latch."
  //   "If a character that is not a significant digit (1-9), blank, comma, 0, minus sign or
  //    decimal is encountered after the zero suppress latch is reset and before the decimal
  //    control latch is set, the zero suppress latch is SET AGAIN. Zeros and commas sensed
  //    before the next significant digit are replaced with `*` or blanks."
  //
  // `scan2Decimal` is that latch, and the re-arm is gated on IT rather than on scan 1's
  // `decimalControl` flag: gating on scan 1's would kill re-arming in every control word that
  // contains a point left of the code, which is most of them. The manual's own worked example is
  // the vector — `000100bCARSbb00200,000.75` after scan 1 becomes `100 CARS 200,000.75`, and the
  // `00200`'s two leading zeros only blank because the `C` of `CARS` re-armed suppression after
  // the `1` had turned it off (`test/tier1-mce.test.ts`, "the CARS example").
  const fill = asterisk ? ASTERISK : BLANK;
  let suppressing = true;
  let significant = false;
  let scan2Decimal = false;
  for (;;) {
    const cell: Cell = s.read(bar);
    const c = cell & BCD6;
    let put = c;

    if (isSignificantDigit(c)) {
      suppressing = false;
      significant = true;
    } else if (c === PERIOD) {
      // The point prints, and this is where scan 2's decimal-control latch is set — "if the zero
      // suppress latch is NOT RESET when a decimal is sensed", i.e. only while blanking is still
      // running. §7.2's decimal control says the point prints "only when the field has
      // significant digits", and scan 2 running left to right cannot yet know whether one lies
      // ahead — which is exactly why the no-significant-digit case needs a third scan to go back
      // and blank "the zeros right of the point and the point itself". Blanking ends here so
      // those zeros SURVIVE scan 2, which is what gives scan 3 something to blank.
      if (suppressing) {
        scan2Decimal = true;
        suppressing = false;
      }
    } else if (suppressing) {
      // ONLY ZEROS AND COMMAS ARE REPLACED (pp.50-51, both sentences: "all insignificant zeros
      // and commas … are set to blanks or, if the asterisk fill latch is set, replaced with
      // asterisks", and the re-arm sentence's "Zeros and commas sensed before the next
      // significant digit"). A BLANK IS LEFT AS IT STANDS — invisible under blank fill, and
      // observable under asterisk fill, where a position the A field was too short to reach
      // stays blank instead of coming out `*`. The manual's guidance is that the case should not
      // arise: "the A-field should not contain more characters than the number of blanks and
      // zeros in the body of the control word" (p.50) sizes the field from the other side, and a
      // control word whose leading positions are `0` rather than `b` fills them like any other
      // zero. Pinned by `test/tier1-mce.test.ts`, "asterisk fill does not cover a position the A
      // field never reached".
      if (c === ZERO || c === COMMA) put = fill;
    } else if (!scan2Decimal && reArmsZeroSuppression(c)) {
      // p.51's re-arm, quoted above. The character itself is neither blanked nor filled — it is
      // not a zero or a comma. What the re-arm catches is what scan 2 reaches AFTER it: this scan
      // runs left to right, so "before the next significant digit" is the run of zeros and commas
      // to its right, the leading zeros of whatever field the text introduced.
      suppressing = true;
    }

    // §7.6: scan 2 "writes the char back without the word mark", which at the code position is
    // §7.4's SECOND unconditional answer — the automatically set word mark is always erased
    // before the operation ends (Figure 34 step 46, the last step, puts back a plain `4`).
    s.setChar(bar, put, false);

    const atCode = bar === code;
    bar = checkAddress(s, bar + 1, 'increment');
    ctx.regs.bar = bar;
    yield undefined;
    if (atCode) break;
  }

  // §7.6, quoting S223-2698 p.51: "The edit operation is terminated at the end of the second
  // scan if the floating dollar latch is off and either: 1. The decimal control or zero suppress
  // latches are off when the B-field word mark is sensed, or 2. The character read out of
  // storage with the word mark is a significant digit. If the floating dollar latch was set
  // during first scan, a third scan is required regardless."
  //
  // THE SIGNIFICANCE LATCH IS THE LITERAL CLAUSES, NOT A DEVIATION FROM THEM. An earlier reading
  // of this file claimed clause 2 contradicted §7.3's fifth row ("Decimal control, field HAS a
  // significant digit → 2 scans, BAR = code + 1") because a field like ` 1.20` has a `0` at the
  // code and would therefore fail clause 2 and take a third scan. THAT PREMISE IS FALSE, and what
  // makes it false is the scan-2 decimal-control latch above (S223-2698 p.50): in ` 1.20` the `1`
  // resets the zero suppress latch BEFORE the point is reached, so the point never sets the
  // decimal-control latch, so CLAUSE 1 — "the decimal control or zero suppress latches are off
  // when the B-field word mark is sensed" — ends the operation at scan 2 on its own, and clause 2
  // is never consulted. Clause 2 earns its place on the other shape: a field like `000.05`, where
  // both latches ARE on at the word mark and the significant digit IS the word-marked character.
  //
  // So `!significant` and the two literal clauses give the same answer wherever the scan-2 latch
  // is modelled — checked over `002.00`, `000.50`, `000.05`, `000.00` and `00X.00`, which cover
  // both clauses and both outcomes. The one shape where they could part is scan 2's re-arm: a
  // significant digit, then a re-arming character, then a point (`01X.00` — the `X` re-arms the
  // zero suppress latch, the point then finds it set and raises the decimal-control latch, and
  // the literal clauses take a third scan where `significant` does not). No source traces that
  // layout, no vector produces it, and the latch shipped is the flag below. Reported, not edited
  // into §7.
  const thirdScan = floatingDollar || (decimalControl && zeroSuppress && !significant);
  if (!thirdScan) {
    finish(ctx, decimalControl ? 'decimalControlSignificant'
      : asterisk ? 'asteriskProtection'
        : signControlLeft ? 'signControlLeft'
          : 'plainZeroSuppression',
    { bHigh, codeAddr: code, dollarAddr: null, la, lb, barWalked: bar });
    return;
  }

  // ═══ Skid 2 → 3 — one B-cycle at `suppression code + 1`, −1 ══════════════════════════════
  // §7.5's second row. Read and rewritten unchanged; unlike the first skid, no source says it
  // preserves a word mark, and after scan 2 there is none left in the field to preserve.
  // S223-2698 p.51 says of THIS skid what it said of the first one — "The extension latch is set
  // during the skid cycle" — so it is set here too. It is already on (the scan-1 → scan-2 skid
  // set it and nothing resets it) and scan 3 reads no latch, so the line is the manual's
  // mechanism written down rather than an observable change.
  {
    const cell: Cell = s.read(bar);
    s.setChar(bar, cell & BCD6, (cell & WM) !== 0);
    extension = true;
    bar = checkAddress(s, bar - 1, 'decrement');
    ctx.regs.bar = bar;
    yield undefined;
  }

  // ═══ Scan 3 — right to left from the suppression code ════════════════════════════════════
  // §7.6: it ends when a `$` is stored into the first blank, or when a decimal point is read
  // out; `BAR = terminating address − 1`. Which of the two it is, is which latch forced it here.
  let dollarAddr: Addr | null = null;
  for (;;) {
    const cell: Cell = s.read(bar);
    const c = cell & BCD6;
    let put = c;
    let done = false;

    if (floatingDollar && c === BLANK) {
      // §7.2's floating dollar: "Second forward scan erases that word mark, runs to the first
      // blank position, writes `$` there and stops."
      put = DOLLAR;
      dollarAddr = bar;
      done = true;
    } else if (c === PERIOD) {
      // Both remaining rows end here. With the floating dollar on, the point is UNDISTURBED and
      // the `$` is simply never placed — §7.2's own worked warning, "control field `bb$.bO` edits
      // `00025` to `.25`, NOT `$.25`", because scan 3 meets the point before it meets a blank.
      // Without it, this is decimal control with no significant digit: §7.2's "a second forward
      // scan blanks the zeros right of the point AND THE POINT ITSELF, stopping at the decimal
      // column — the field edits to all blanks".
      if (!floatingDollar) put = BLANK;
      done = true;
    } else if (!floatingDollar && c === ZERO) {
      put = BLANK;                       // "blanks the zeros right of the point"
    }

    s.setChar(bar, put, (cell & WM) !== 0);
    bar = checkAddress(s, bar - 1, 'decrement');
    ctx.regs.bar = bar;
    yield undefined;
    if (done) break;
  }

  finish(ctx,
    floatingDollar
      ? (decimalControl ? 'floatingDollarAndDecimalControl' : 'floatingDollar')
      : 'decimalControlNoSignificantDigit',
    { bHigh, codeAddr: code, dollarAddr, la, lb, barWalked: bar });
}

/** What the eight named rows and the two timing terms need out of the walk. */
interface MceOutcome {
  bHigh: Addr;
  codeAddr: Addr | null;
  /** Where a floating `$` was actually stored, for Figure 7's `D`. */
  dollarAddr: Addr | null;
  la: number;
  lb: number;
  /** BAR as the ±1-per-B-cycle walk left it. */
  barWalked: Addr;
}

/**
 * The eight-case BAR table (§7.3) and Figure 7's `Z` and `D` (§1.5), applied once.
 *
 * BAR IS NOT DECIDED HERE, and it is not checked here either. S223-2698 pp.50-51's ±1-per-B-cycle
 * rule already left the right value in the register, cycle by cycle, which is what makes a
 * half-cycled edit show BAR moving. An earlier version recomputed each row's answer and threw on a
 * mismatch, describing that as two independent sources cross-checking; it was not. Every row's
 * "expected" was computed from the SAME walk that produced `barWalked` — `bHigh − 1` is where the
 * terminating scan-1 cycle's own −1 left it, `code + 1` is where scan 2's last +1 left it, and
 * scan 3's stop position minus one is where scan 3's last −1 left it — so all eight comparisons
 * were tautologies and the throw was unreachable. What survives is what was worth having: the
 * eight rows, named, each carrying §7.3's row text, and a `never` default that makes adding a
 * termination case without a §7.3 row a compile error.
 */
function finish(
  ctx: ExecContext, termination: MceTermination, o: MceOutcome,
): void {
  switch (termination) {
    case 'noSuppressionCode':
      // "No `0` (suppression code) anywhere in the control word | 1 scan | BAR =
      // addr(B-field high-order word mark) − 1"
      break;
    case 'plainZeroSuppression':
      // "Plain zero suppression | 2 | BAR = addr(suppression code in B) + 1"
      break;
    case 'asteriskProtection':
      // "Asterisk protection | 2 | BAR = addr(suppression code in B) + 1"
      break;
    case 'signControlLeft':
      // "Sign control left | 2 | BAR = addr(suppression code in B) + 1"
      break;
    case 'decimalControlSignificant':
      // "Decimal control, field HAS a significant digit | 2 | BAR = addr(suppression code) + 1"
      break;
    case 'decimalControlNoSignificantDigit':
      // "Decimal control, NO significant digit (all-blank result) | 3 | BAR =
      // addr(decimal point in B) − 1" — scan 3 stops on the point, so that is where it stopped.
      break;
    case 'floatingDollar':
      // "Floating dollar sign | 3 | BAR = addr($ store position) − 1 (where the `$` was written)"
      break;
    case 'floatingDollarAndDecimalControl':
      // "Floating dollar AND decimal control both on | 3 | BAR = addr(first blank-or-decimal
      // read in scan 3) − 1" — the `$` position if a blank came first, the point if it did not.
      break;
    default: {
      const unhandled: never = termination;
      throw new Error(`op E: no §7.3 row for ${String(unhandled)}`);
    }
  }
  ctx.regs.bar = o.barWalked;

  // Figure 8's length symbols (§1.3). `LA` is the number of A-cycles taken, which is what
  // `AAR = A − LA` counts and what Figure 7's `A` term charges for; `LB` is the scan-1 B-cycle
  // count, i.e. the control word from the B address to its high-order word mark. `LW`
  // ("whichever is shorter") is unused by the `E` row and set for consistency.
  ctx.sym.LA = o.la;
  ctx.sym.LB = o.lb;
  ctx.sym.LW = Math.min(o.la, o.lb);

  // Figure 7's two MCE-only terms (§1.5, A22-0526-3 p.12), each implemented as its own
  // definition reads and each equal to the cycles the phase it names actually takes:
  //   Z  "chars in the B field from the start of zero suppression to the left end of the B
  //      field" — the suppression code to `B_high` inclusive, which is scan 2's B-cycle count
  //      (Figure 34: 04676 − 04669 + 1 = 8, and scan 2 runs 8 cycles). 0 with no suppression.
  //   D  "chars in the B field from the start of zero suppression to the `$` insert point;
  //      0 if none" — the code to the position the `$` was written, inclusive, which is scan 3's
  //      B-cycle count in the floating-dollar case. 0 whenever no `$` was stored, which
  //      includes the three-scan decimal-control case: the term names the `$` insert point and
  //      there is none, so it reports 0 for a scan it does not describe. The formula is the
  //      manual's; the loss is the manual's too.
  // The two skid cycles are counted in neither: whether they belong inside `B`/`Z`/`D` is
  // `[unverified]` and phase-1b.md §9's chosen answer is "ignore" — not cycle-accurate, and
  // register and memory state are unaffected either way.
  ctx.terms.Z = o.codeAddr === null ? 0 : o.codeAddr - o.bHigh + 1;
  ctx.terms.D = o.dollarAddr === null || o.codeAddr === null ? 0 : o.codeAddr - o.dollarAddr + 1;
}

