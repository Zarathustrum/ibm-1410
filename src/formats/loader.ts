// src/formats/loader.ts — the loader path, smallest layer first.
// Source: research/software.md §10.2, §10.5, §10.8 (C28-0351-5 p.8 Table II);
// research/io.md §3; docs/plans/phase-2-unit-record.md §8.1.
//
// WAVE 3 lands the HAND-KEYED BOOTSTRAP CONSTANTS ONLY. Wave 5 extends this same file with the
// condensed-card loader of plan §8.3.
//
// It is `src/formats` and not `src/ui` on purpose: `tools/run-deck.ts` has to reach it, and
// `tsconfig.tools.json` compiles `src/core/**`, `src/formats/**`, `tools/**` and `oracle/**`
// only — reaching `keyed()` in `src/ui/internals/controls.ts` would drag a DOM module into the
// node tools build.

/**
 * The twelve characters IBM prescribes for keying a card boot by hand, from `software.md` §10.2
 * (C28-0351-5 p.8 Table II, "Not using 7010 Load Key", step 2): a status character at 00000, a
 * ten-character `L %10 00012 $` at 00001, and a one-character `R` at 00011 whose I-address
 * (00012-00016) and d-character (00017) arrive on the card it is about to read.
 *
 * IBM's own template prints `ALcde00012$r` with the device selector varying (`1` = card reader,
 * `B` = tape) and `$` as a FIXED LITERAL — which is the `[verified]` half of
 * `CARD_DOLLAR_SUPPRESSES_GM_WM_TEST` (channel.ts). The `$` is load-bearing: on a cleared
 * machine there is no group-mark-with-word-mark to stop an `R` read, so an `R` would run all 80
 * columns and then fail its correct-length check, and a load-mode read that CREATED a GM-WM
 * mid-record would truncate the boot record (io.md §3).
 */
export const BOOTSTRAP_CHANNEL_1 = 'AL%1000012$R';

/** The `L` at 00001 and the `R` at 00011 — and no other position (software.md §10.2). */
export const BOOTSTRAP_WORD_MARK_POSITIONS: readonly number[] = [1, 11];

/** The keying starts at 00000, which is where a DISPLAY of a cleared machine starts. */
export const BOOTSTRAP_ORIGIN = 0;

/**
 * THE PRE-SPLIT PAIR `machine.alter` ACTUALLY TAKES — and the reason this constant exists rather
 * than a `^`-marked string. There are two paths and they must not be confused (plan §8.1):
 *
 *   · `machine.alter(text, wordMarks)` is the CORE façade. It calls `bcdOfGlyph` on every
 *     character and throws `"^" is not one of the 64 console characters` on the first caret.
 *   · The `^` WORD MARK convention is UI-ONLY — `WORD_MARK_KEY` and `keyed()` in
 *     `src/ui/internals/controls.ts` split the typed line into glyphs plus a boolean-per-position
 *     array BEFORE calling `alter`.
 *
 * So the headless paths (`tools/run-deck.ts`, `test/tier4-demo-deck.test.ts`) pass this pair and
 * never see a `^`; the browser path types the `^`-form of this constant into the ALTER box and
 * `controls.ts` splits it. Spelling that caret string out here would be a second copy free to
 * drift; `deckBox.ts` renders it from this constant in three lines instead.
 * `alter()` refuses any glyph outside the 64 either way, which is what a 1415 does.
 *
 * Derived from the two constants above so there is ONE source of truth: `deckBox.ts`'s "key the
 * bootstrap" button renders the `^` form from this in three lines and carries no second copy.
 */
export const BOOTSTRAP_KEYSTROKES: { readonly text: string; readonly wordMarks: readonly boolean[] } = {
  text: BOOTSTRAP_CHANNEL_1,
  wordMarks: [...BOOTSTRAP_CHANNEL_1].map(
    (_, i) => BOOTSTRAP_WORD_MARK_POSITIONS.includes(BOOTSTRAP_ORIGIN + i),
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// WAVE 5 — THE CONDENSED-CARD LOADER.  docs/plans/phase-2-unit-record.md §8.3.
//
// Everything above this line is wave 3's hand-keyed bootstrap and is unchanged. Everything below
// is a 1410 PROGRAM, hand-assembled, with no assembler and no symbolic listing — so every
// instruction below carries four things: the address it occupies, the characters it is made of,
// its `opcodes.md` citation, and WHY. A reader with `opcodes.md` open must be able to re-verify
// this deck by hand, one row at a time.
//
// IT IS A RECONSTRUCTION, AND IT IS LABELLED ONE. `software.md` §9 is explicit that no loader's
// card images survive on bitsavers and that the implementer fallback is "write your own 5-card
// loader implementing C28-0309-1 Figure 2 exactly, put its re-entry point at 00281". What IS
// documented and is honoured here: the card format (Figure 2, `formats/objectdeck.ts`), the
// 00499 ceiling (C20-1602-8's Clear Storage card "clears all storage above location 00499"), the
// 00281 re-entry point (C28-0309-1 pp.19-20), and the fact that 00281 is a LIVE ONE-CHARACTER
// INSTRUCTION SLOT — PAT's two Substitution Cards each store one word-marked character there,
// toggling it between `N` (No Operation) and `,` (Set Word Mark) (J28-0249 p.27 `[verified]`).
// What is ours: the two-card deck, the instruction sequence, the work-area placement, and the
// execute card's shape. All four are stated as deviations below or as `OPEN:` constants with rows
// in `open-questions.md`, Phase 2 / Wave 5 — the label itself included:
//
// OPEN: `CONDENSED_LOADER_IS_A_RECONSTRUCTION`, declared at the head of the `OPEN:` block below,
// so the claim this paragraph makes in prose is also a symbol a reader and a test can name.
//
// ─── Autocoder source, so Phase 3 can regenerate this deck instead of transcribing it ───────
//
// AND IT IS A MODERN RECONSTRUCTION, NOT A PERIOD ARTEFACT — the same `CONDENSED_LOADER_IS_A_
// RECONSTRUCTION` the paragraph above names, said about this block specifically. No period
// programmer would have written a loader's own source: C28-0309-1 p.17's LOAD control card makes
// the PROCESSOR prepend a load program to the object deck, and p.19's EX / re-entry note names
// 00281 as the point that program re-enters at. The block below exists so Phase 3 can REGENERATE
// these cards rather than transcribe them, and it is written in the period language for that
// reason alone.
//
//          ORG   00281
//   REENT  NOP                        the PAT substitution slot — one character, word-marked
//   LOOP   R1W   0,WORK,$             one load-mode read per card into the fixed work area
//          BEX1  DONE                 d = 9 = bits 8+1: Condition (1402 EOF) OR Not Ready
//          BA1   *+1                  d = group mark: release the interlock without branching
//          BCE   WORK+1,WORK,E        execute card? -> run the branch the card carries
//          MLCWS GMWM,PAYLD+X15       plant the GM-WM at PAYLD + count
//          MRCWG PAYLD,ZERO+X14       move the payload to the card's load address
//          B     LOOP
//   DONE   H
//   GMWM   DCW   @<group mark>@
//
//   ZERO   EQU   00000                 the move's un-indexed base; the tag supplies the rest
//
//          ORG   00090
//   WORK   DS    5                    cols 2-6  -> the load address.   THIS IS INDEX REG 14
//          DS    5                    cols 8-12 -> `000nn`, the count. THIS IS INDEX REG 15
//   PAYLD  DS    0                    cols 13-72 -> the payload, marks already set
//
// The mnemonics are `opcodes.md` §2's Autocoder column; which of `R`'s eight mnemonics goes with
// which d-character is not pinned row-by-row in the research, so treat the two `R` lines as
// `R iiiii 9` and `R iiiii <group mark>` and the mnemonics as a label. Card 1 of the deck — the
// Bootstrap-1-shaped card that reads this body to 00281 — is the `LOADER_BOOTSTRAP_PROGRAM`
// listing below, and it exists because the hand-keyed read lands at 00012 while the re-entry
// point is 00281: one card cannot land in two places.
//
// ─── THE TWO DELIBERATE DEVIATIONS FROM §8.3, BOTH FORCED, BOTH THE SAME CAUSE ──────────────
//
// §8.3 prescribes "a 5-digit add of the 2-digit count to a constant base" and "patch the move
// instruction's B-address from WORK+0..4". Both are done here by the 1410's OWN INDEX ADDER
// instead, and the reason is arithmetic on the card, not taste:
//
//   · A load-mode card carries at most 80 columns and every word mark it sets costs one of them,
//     so a card delivers 80 characters minus one per word-marked field. COUNTED, from §8.3's own
//     sketch and `opcodes.md` §2's lengths (`N` 1, `L` 10, `R` 7 only, `B` BCE 12, `D` 12, `J` 7,
//     `.` 1, `?` ZA 11, `A` 11):
//
//         shared with the loader below   N 1 + L 10 + R 7 + R 7 + BCE 12 + J 7 + H 1 + GM-WM 1
//                                        =  46 characters in  8 fields
//         §8.3's own six instructions    ZA 11 + A 11 + D 12 + D 12 + D 12 + D 12
//                                        =  70 characters in  6 fields
//         the two constants they need    the base `00100` 5 + the 5-digit sum field 5
//                                        =  10 characters in  2 fields
//         ─────────────────────────────────────────────────────────────────────────────────
//         §8.3 as sketched               = 126 characters in 16 fields = 126 + 16 = 142 COLUMNS
//
//     which is not a card. The indexed sequence below replaces those six instructions and both
//     constants with two `D`s: 46 + 24 = 70 characters in ten fields = 80 columns, which is
//     exactly one card and not one column spare. (`open-questions.md`'s wave-5 row carries the
//     same two numbers; if either moves, both move.)
//   · Indexing is what the 1410 has instead of self-modifying address setup: "the 5-digit factor
//     is added AFTER the address enters the address register; the instruction image in storage is
//     never modified" (`architecture.md` §5, A22-0526-3 pp.14-15). Index register n is ordinary
//     storage at 00020+5n, so IR14 is 00090-00094 and IR15 is 00095-00099 — and putting the work
//     area AT 00090 makes the card's own header land in them: cols 2-6 (the load address) become
//     index register 14 and cols 8-12 (`000nn`, the count) become index register 15, with no
//     instruction executed at all. That is why `WORK` is 00090 and not a round number.
//
// So `D <gmwm> 00A?0 7` reads "plant at 00100 indexed by IR15" = PAYLD + count, and
// `D 00100 00?!0 Δ` reads "move from PAYLD to 00000 indexed by IR14" = the card's load address.
// Zone bits over the HUNDREDS and TENS positions ARE the index tag, weighted 8 / 4 for the
// hundreds B and A bits and 2 / 1 for the tens B and A bits (`address.ts`, `architecture.md` §5,
// A22-0526-3 p.14 Figure 10 — p.8 is the address-validity rule, not the tag weights). So tag 15 = 8+4+2+1 = both zone bits over both positions, which over the digits of
// 00100 gives `A` (digit 1 + BA, octal 61) and `?` (digit 0 + BA, octal 72); and tag 14 = 8+4+2 =
// both zone bits over the hundreds and the B bit alone over the tens, which over the digits of
// 00000 gives `?` and `!` (digit 0 + B, octal 52). `!` and `‡` differ by exactly which zone bit
// they carry — `‡` is octal 32, the A bit — and picking the wrong one selects index register 13.
// Nothing in this loader modifies itself.
//
// ─── THE ONE PROPERTY A READER MUST NOT MISTAKE FOR A BUG ────────────────────────────────────
//
// `D <payload> <target> Δ` terminates on the A-field group-mark-with-word-mark, and "the position
// holding the terminating character is moved/replaced like every other position" (`opcodes.md`
// §3.1, A22-0526-3 pp.25-26 `[verified]`). So the move carries the planted GM-WM across too, and
// each loaded record is followed in core by a group-mark-with-word-mark at loadAddress + count.
// For a program whose cards load contiguously — which is what an assembler emits — every one of
// those is overwritten by the next card, and the last one marks the end of the loaded program,
// which is exactly where a 1410 program wants one. `test/loader.test.ts` asserts it rather than
// tolerating it.

import { bcdOfGlyph } from '../core/bcd.js';
import { CARD_COLUMNS, type Addr, type Card, type Deck } from '../core/types.js';
import { makeCard } from './card.js';
import { WORD_SEPARATOR } from '../core/channel.js';
import { encodeObjectRecord, type ObjectDeck } from './objectdeck.js';

/**
 * One word-marked field of the loader, as it sits in core after the card that carried it was read
 * in load mode. `text` is the characters; the word mark is on the FIRST of them, because the card
 * punches a word separator in the column before it (software.md §8.1 NOTE).
 */
export interface LoaderField {
  /** Where the first character lands. */
  readonly at: Addr;
  /** The characters, in core order. `text.length` is the field's length. */
  readonly text: string;
  /** `opcodes.md` (or `io.md`) row this field is assembled from. */
  readonly cite: string;
  /** Why this instruction is here and why it is shaped this way. */
  readonly why: string;
}

/** C20-1602-8: the standalone deck's Clear Storage card "clears all storage above location 00499",
 *  so the load program — code, constants and work area alike — must live at or below this
 *  (research/software.md §9 `[verified]`). Everything below is asserted against it. */
export const LOADER_CEILING: Addr = 499;

/** C28-0309-1 pp.19-20: "The IBM standard re-entry point is 00281". */
export const LOADER_RE_ENTRY: Addr = 281;

/**
 * The work area. 00090 is not a round number and not a convenience: 00090-00094 IS index register
 * 14 and 00095-00099 IS index register 15 (00020 + 5n, `address.ts`, A22-0526-3 p.14 Figure 9), so
 * a load-mode read of a condensed card puts the load address into one and the count into the other
 * with no instruction executed. See the deviation note above.
 */
export const LOADER_WORK: Addr = 90;
/** WORK+10 — where the payload lands, because load mode eats the separators in columns 1 and 7. */
export const LOADER_PAYLOAD: Addr = LOADER_WORK + 10;
/** The card's load address, as an index register. `00000` tagged 14 resolves to it. */
export const LOADER_ADDRESS_INDEX = 14;
/** The card's count, as an index register. `00100` tagged 15 resolves to WORK+10+count. */
export const LOADER_COUNT_INDEX = 15;

/**
 * OPEN: `CONDENSED_LOADER_IS_A_RECONSTRUCTION` — `[unverified]`, and it is the label everything
 * in this file below the wave-3 bootstrap wears. `software.md` §9: no loader's card images
 * survive on bitsavers, and the implementer fallback is "write your own 5-card loader
 * implementing C28-0309-1 Figure 2 exactly, put its re-entry point at 00281". DOCUMENTED and
 * honoured here: the card format (Figure 2, `formats/objectdeck.ts`), the 00499 ceiling
 * (C20-1602-8's Clear Storage card, `LOADER_CEILING`), the 00281 re-entry point (C28-0309-1
 * pp.19-20, `LOADER_RE_ENTRY`) and its live one-character slot (J28-0249 p.27). OURS: the
 * two-card deck, the instruction sequence, the work-area placement at 00090, and the execute
 * card's shape. `open-questions.md`, Phase 2 / Wave 5.
 */
export const CONDENSED_LOADER_IS_A_RECONSTRUCTION = true;

/**
 * OPEN: `EXECUTE_CARD_IS_E_IN_COLUMN_1` — `[verified]` for the IBM diagnostic loader
 * (`emulators.md` §7, e.g. `E ~J02000b~`), adopted as the shape of ours, which is a
 * reconstruction. Column 1 = `E`, the instruction from column 2, and the loader detects the `E`
 * and transfers control to it. NOT `software.md` §8.2's Termination card: that is the OS
 * RELOCATABLE deck's format and this is the STANDALONE ABSOLUTE one
 * (`docs/plans/architecture.md` §5 step 2). `open-questions.md`, Phase 2 / Wave 5.
 */
export const EXECUTE_CARD_IS_E_IN_COLUMN_1 = true;

/**
 * OPEN: `LOADER_LOOPS_BACK_PAST_THE_RE_ENTRY_SLOT = true` — `[unverified]`, and it is the one
 * choice in this file with no source at all. J28-0249 p.27 shows PAT storing one word-marked
 * character into 00281 and toggling it between `N` and `,`; what that instruction DID inside
 * IBM's loader is inferable, not documented (`software.md` §9). We put the slot at the head of
 * the re-entry sequence, where user code branching to 00281 falls through it into the read — and
 * we branch the loader's OWN loop to the read at 00282 instead, so the slot executes once per
 * re-entry rather than once per card.
 *
 * The ground for that is the slot's SEMANTICS, not a demonstrated hazard. The character PAT
 * plants is a CHAINED `,` — length 1, "set word marks at the addresses currently in AAR/BAR"
 * (opcodes.md §2 `,` row) — so what it marks is whatever the previous instruction left in the
 * registers, and a slot whose meaning is the loop's register residue is not a slot anyone can
 * reason about. In THIS layout the residue is in fact inert: a loop closing with `J 00281`
 * would leave AAR = BI = 00281 and BAR = NSIB = 00349 (`branch.ts` `prepareBranch`), both
 * already word-marked, so nothing would change. The choice is to keep 00281's meaning
 * independent of how the loader got there; the `[unverified]` tag stands either way.
 * `open-questions.md`, Phase 2 / Wave 5.
 */
export const LOADER_LOOPS_BACK_PAST_THE_RE_ENTRY_SLOT = true;

// ─── Card 1 of the loader deck: the self-loading bootstrap, in the Bootstrap 1 shape ────────
//
// `software.md` §10.5 transcribes IBM's own Bootstrap 1 card: a card read by the keyed
// `L %10 00012 $` whose first six characters ARE the operands of the keyed one-character `R` at
// 00011, and whose program then reads the real program in and branches to it. IBM's reads from
// disk into 00138; ours reads the loader body card from the 1402 into 00281. Same shape, same
// card, different device — which is §8.2's point.

/** Cols 1-6 -> 00012-00017: the I-address and d-character of the KEYED `R` at 00011. They are not
 *  word-marked and are not instructions; they are the tail of an instruction keyed by hand. */
export const LOADER_BOOTSTRAP_HEADER = '00018⧧';

export const LOADER_BOOTSTRAP_PROGRAM: readonly LoaderField[] = [
  {
    at: 18,
    text: 'L%1000281$',
    cite: 'opcodes.md §2 `L` (043), length 10, A22-0526-3 pp.40-41; d = `$` io.md §3',
    why: 'Read the loader body card into 00281 in LOAD MODE, so its word separators become the '
      + 'word marks on the loader\'s own op codes. x1 `%` = channel 1 non-overlap, x2 `1` = the '
      + '1402 read feed, x3 `0` = read and feed to pocket NR. `$` suppresses the GM-WM test '
      + '(io.md §3 steps 2 and 5 are gated on d = `R`). The LEGALITY of `$` on a card read is '
      + '`[verified]` — C28-0351-5 p.8 Table II keys it as a fixed literal — but the EFFECT is '
      + '`[likely]`, derived from A22-0526-3 pp.9, 86, 92 because no manual states card `$` '
      + 'semantics (io.md §3). It matters because core is clear and an `R` would run all 80 '
      + 'columns and then fail its correct-length check.',
  },
  {
    at: 28,
    text: 'R00035⧧',
    cite: 'opcodes.md §2 `R` (051), length 7 ONLY, A22-0526-3 pp.36-37 Figure 36',
    why: 'Release the channel-1 interlock. d = group mark tests all six indicators AND clears the '
      + 'interlock without requiring a branch (io.md §5 "Interlock release"), and the branch '
      + 'target 00035 IS this instruction\'s own fall-through address — 00028 + 7 — so control '
      + 'reaches the next instruction whether or not any indicator was on. Without it the next '
      + 'I/O would hit step 2 of the nine and stop the system.',
  },
  {
    at: 35,
    text: 'J00281 ',
    cite: 'opcodes.md §2 `J` (041), lengths 1 and 7, blank d, A22-0526-3 p.36',
    why: 'Enter the loader at its re-entry point. The trailing blank is the d-character position, '
      + 'which `table.ts`\'s `J` row requires to be present.',
  },
  {
    at: 42,
    text: 'LOADER',
    cite: 'not an instruction — data',
    why: 'The deck identification, stored and harmless. It is REQUIRED: its word mark at 00042 is '
      + 'what ends the read-out of the `J` at 00035, exactly as the demo card\'s `HELLO1` ends '
      + 'its halt (plan §13). Columns past this one are blank and store as blanks up to 00087, '
      + `two positions below the work area at ${String(LOADER_WORK).padStart(5, '0')}.`,
  },
];

// ─── Card 2 of the loader deck: the loader itself, at 00281-00350 ───────────────────────────

export const CONDENSED_LOADER_PROGRAM: readonly LoaderField[] = [
  {
    at: 281,
    text: 'N',
    cite: 'opcodes.md §2 `N` (045), any length, A22-0526-3 p.24',
    why: 'THE RE-ENTRY POINT, C28-0309-1 pp.19-20. It is a live one-character instruction slot, '
      + 'not a byte to route around: PAT\'s two Substitution Cards are ordinary condensed cards '
      + 'that store ONE word-marked character here, toggling it between `N` (No Operation) and '
      + '`,` (Set Word Mark) (J28-0249 p.27 `[verified]`). User code that wants the load to '
      + 'continue branches to 00281 and falls through this slot into the read below. See '
      + 'LOADER_LOOPS_BACK_PAST_THE_RE_ENTRY_SLOT for what is ours and what is IBM\'s.',
  },
  {
    at: 282,
    text: 'L%1000090$',
    cite: 'opcodes.md §2 `L` (043), length 10, A22-0526-3 pp.40-41; d = `$` io.md §3',
    why: 'LOOP: ONE load-mode read per card, into the fixed work area at 00090 (§8.3). Load mode '
      + 'consumes the separators in columns 1 and 7, so the payload lands at a FIXED offset — '
      + 'cols 2-6 at WORK+0..4, cols 8-10 at WORK+5..7, the count at WORK+8..9, and the payload '
      + 'at WORK+10 with its word marks already set and its length exactly the count. `$` again '
      + 'suppresses the GM-WM test, which is what lets the GM-WM this loader plants at '
      + 'WORK+10+count survive into the next read without truncating it.',
  },
  {
    at: 292,
    text: 'R003499',
    cite: 'opcodes.md §2 `R` (051), length 7 ONLY; d = `9` = octal 11 = bits 8 + 1 = Condition '
      + 'OR Not Ready. The d-character is a BIT MASK — "one to six may be tested by a single '
      + 'instruction" — opcodes.md §6.2 / io.md §5 Figure 36 (A22-0526-3 p.37); the weights are '
      + '`dmods.ts` RX_STATUS_BITS, bit 1 notReady and bit 8 condition',
    why: 'BOTH ways the 1402 can end this loop, in one d-character and zero extra columns — it '
      + 'is column 21 of the card either way. END OF FILE: the 1402 sets Condition on the read '
      + 'that FOLLOWS the last card (io.md §6). NOT READY: the same section\'s '
      + 'three-cards-remaining rule, verbatim — "with 3 cards remaining, a read issued before '
      + 'the EOF key is pressed sets the Not Ready indicator" — which is the one operator error '
      + 'this phase documents (software.md §10.7 "Press READER START and END-OF-FILE"; '
      + '`test/tier4-demo-deck.test.ts`). On `8` alone that read transfers no data and falls '
      + 'through, and the loop re-plants and re-moves the PREVIOUS record for ever; on `9` it '
      + 'stops at the halt in 00349, which is a thing an operator can see. A taken `R` also '
      + 'releases the interlock, which is why the halt needs nothing after it.',
  },
  {
    at: 299,
    text: 'R00306⧧',
    cite: 'opcodes.md §2 `R` (051), length 7 ONLY; d = group mark, io.md §5 "Interlock release"',
    why: 'Release the interlock the read at 00282 set. d = group mark clears it WITHOUT requiring '
      + 'a branch, and the branch target 00306 is this instruction\'s own fall-through — 00299 + '
      + '7 — so the next instruction runs either way.',
  },
  {
    at: 306,
    text: 'B0009100090E',
    cite: 'opcodes.md §2 `B` (062) BCE, lengths 1, 6, 12, A22-0526-3 p.37',
    why: 'THE EXECUTE CARD, detected and obeyed in one instruction. Column 1 of an execute card '
      + 'is `E` and column 2 is a word separator, so a load-mode read leaves `E` unmarked at '
      + 'WORK+0 = 00090 and the card\'s own `J entry ` word-marked at WORK+1 = 00091. This BCE '
      + 'compares the BA8421 bits at 00090 against `E` and branches to 00091 on a match — where '
      + 'the branch the card carries then executes. A condensed card can never match: WORK+0 '
      + 'holds the first digit of its load address. EXECUTE_CARD_IS_E_IN_COLUMN_1.',
  },
  {
    at: 318,
    text: 'D0035000A?07',
    cite: 'opcodes.md §2 `D` (064) length 12; d = `7` = MLCWS, §3.2 (bits 4+2+1, one position)',
    why: 'PLANT the group-mark-with-word-mark that will stop the move, at WORK+10 + count. The A '
      + 'field is the one-character constant at 00350, which IS a group mark carrying a word '
      + 'mark; d = `7` moves zone, numeric AND word mark and terminates after one storage '
      + 'position, so the constant arrives complete. The B address `00A?0` is 00100 with the '
      + 'index tag 15 in its hundreds and tens zone bits (`A` = digit 1 + BA, `?` = digit 0 + '
      + 'BA), and index register 15 is 00095-00099, which the card\'s own `000nn` count field '
      + 'landed in. The hardware adds them: A22-0526-3 pp.14-15.',
  },
  {
    at: 330,
    text: 'D0010000?!0Δ',
    cite: 'opcodes.md §2 `D` (064) length 12; d = `Δ` = MRCWG, §3.2 row 47 (bits B 8 4 2 1 — '
      + '§3.2 prints decimal, no octal column); the glyph\'s octal 57 is charset.md §2 rank 11',
    why: 'THE LOAD, in one instruction, exactly as §8.3 prescribes. `Δ` is octal 57: d & 0x38 = '
      + '0x28 is left-to-right terminating on the A-field group-mark-with-word-mark and d & 0x07 '
      + '= 7 is zone + numeric + WORD MARK, so the payload\'s marks travel with it. A = 00100, '
      + 'the payload; B = `00?!0`, which is 00000 with index tag 14 (`?` = digit 0 + BA over the '
      + 'hundreds is 8+4, `!` = digit 0 + B over the tens is 2), and index register 14 is '
      + '00090-00094, where the card\'s load address landed. `cc01.cor` uses the same `D … Δ` '
      + 'idiom to relocate '
      + 'marked code (`docs/BUILD-LOG.md`, "cc01 halt archaeology") — `[observed]` corroboration '
      + 'that this is period-real. NOTE: the terminating GM-WM is moved too (opcodes.md §3.1).',
  },
  {
    at: 342,
    text: 'J00282 ',
    cite: 'opcodes.md §2 `J` (041), lengths 1 and 7, blank d, A22-0526-3 p.36',
    why: 'Next card. It branches to the READ at 00282, not to the re-entry slot at 00281 — see '
      + 'LOADER_LOOPS_BACK_PAST_THE_RE_ENTRY_SLOT for why that is a choice and not an accident.',
  },
  {
    at: 349,
    text: '.',
    cite: 'opcodes.md §2 `.` (073), length 1, Halt, A22-0526-3 p.23',
    why: 'End of file, a Not Ready hopper, or anything else the `R` at 00292 tests, lands here. '
      + 'Its length is one because '
      + 'the next position carries a word mark — which is the constant below, and which is also '
      + 'why the constant has to be last.',
  },
  {
    at: 350,
    text: '⧧',
    cite: 'research/charset.md §2 rank 5 — the group mark, 12-7-8; the word mark is the card\'s',
    why: 'THE CONSTANT the plant at 00318 copies: a group mark carrying a word mark, i.e. a live '
      + 'GM-WM sitting inside the loader. It is safe there for one reason and the reason is '
      + 'load-bearing: every read this loader issues carries `$`, and `$` suppresses the GM-WM '
      + 'termination test (io.md §3). It also ends the read-out of the halt above it.',
  },
];

// ─── Turning the listings into cards ────────────────────────────────────────────────────────

function codesOfGlyphs(text: string): number[] {
  return [...text].map((ch) => {
    const code = bcdOfGlyph(ch);
    if (code === undefined) throw new RangeError(`"${ch}" is not one of the 64 machine glyphs`);
    return code;
  });
}

/**
 * The card that carries a listing: an unmarked header, if any, then every field preceded by the
 * one word separator that puts the word mark on its first character. THE CARD IS DERIVED FROM THE
 * LISTING, never written twice — a slip in an address in the table above is a slip in the deck,
 * and `test/loader.test.ts` checks the listing against core after the real 1402 has read it.
 */
export function loaderCardOf(header: string, program: readonly LoaderField[]): Card {
  const codes = codesOfGlyphs(header);
  for (const field of program) {
    codes.push(WORD_SEPARATOR, ...codesOfGlyphs(field.text));
  }
  if (codes.length > CARD_COLUMNS) {
    throw new RangeError(`the listing needs ${codes.length} columns; a card has ${CARD_COLUMNS}`);
  }
  return makeCard(codes);
}

/** Card 1: the self-loading bootstrap the hand-keyed `L %10 00012 $` picks up. */
export const LOADER_BOOTSTRAP_CARD: Card =
  loaderCardOf(LOADER_BOOTSTRAP_HEADER, LOADER_BOOTSTRAP_PROGRAM);

/** Card 2: the loader itself. Exactly eighty columns — ten word marks and seventy characters. */
export const LOADER_BODY_CARD: Card = loaderCardOf('', CONDENSED_LOADER_PROGRAM);

/**
 * The execute card that ends an object deck: column 1 = `E`, column 2 a word separator, then the
 * seven-character unconditional branch to the program's entry point, then a separator and a group
 * mark so the branch's read-out ends (EXECUTE_CARD_IS_E_IN_COLUMN_1, emulators.md §7).
 *
 * Read in load mode into WORK it lands as `E` at WORK+0, a word-marked `J entry ` at WORK+1..7 and
 * a group-mark-with-word-mark at WORK+8 — which is precisely what the BCE at 00306 expects.
 */
export function executeCard(entry: Addr): Card {
  if (!Number.isInteger(entry) || entry < 0 || entry > 99_999) {
    throw new RangeError(`entry point ${entry} is not a five-digit address`);
  }
  const branch = `J${String(entry).padStart(5, '0')} `;
  return makeCard([
    ...codesOfGlyphs('E'),
    WORD_SEPARATOR, ...codesOfGlyphs(branch),
    WORD_SEPARATOR, ...codesOfGlyphs('⧧'),
  ]);
}

/**
 * The whole hopper, in the order the operator stacks it: the two loader cards, the object deck's
 * condensed cards, and the execute card. The keyed twelve characters
 * (`BOOTSTRAP_KEYSTROKES`) start it.
 */
export function loaderDeck(deck: ObjectDeck): Deck {
  const cards: Card[] = [LOADER_BOOTSTRAP_CARD, LOADER_BODY_CARD];
  for (const record of deck.records) cards.push(encodeObjectRecord(record));
  if (deck.entry !== undefined) cards.push(executeCard(deck.entry));
  return cards;
}
