// src/core/devices/printer1403.ts — the IBM 1403 Printer, Model 2 (132 print positions), as a
// channel-1 device at x2 = `2`, together with its carriage and carriage tape.
// Source: research/io.md §7 (A22-0526-3 pp.67-68, 71-72, 80-82, Figures 88, 89, 90, 91, 92),
// §5 (Figure 35, Figure 40), §3; research/charset.md §5, §5.1, §5.3, §7;
// research/console-and-physical.md §8; docs/plans/phase-2-unit-record.md §5, §7.3, §13, §15.
//
// The device holds PAPER and produces VALUES: a `PrintEvent` stream (what the program asked the
// carriage and the hammers to do) and a `PrintLine` array (what a person reads off the page).
// It never touches core, and the move/load translation is the CHANNEL's — by the time `write()`
// is called `translateForOutput` has already turned each core word mark into a word separator
// one position ahead of its character (channel.ts). See `write()` for why that means load-mode
// `%20` needs no printer code at all.

import { parity } from '../bcd.js';
import { InstructionCheck } from '../checks.js';
import { CARRIAGE_D_TABLE } from '../isa/dmods.js';
import {
  WM,
  type CarriageState, type Cell, type ChannelStatus, type Device, type IoMode, type PrintEvent,
  type PrintLine,
} from '../types.js';

/** research/io.md §2 Figure 107: x2 = `2` is the 1403. */
export const PRINTER_X2 = '2';

/** `F d` Carriage Control, channel 1 — io.md §7 Figure 90 (A22-0526-3 p.81). */
export const CARRIAGE_OP = 'F';

/** Write a Line, x3 = `0` — `M %20 bbbbb W`, io.md §7 Figure 88 (A22-0526-3 p.80). */
const WRITE_A_LINE_X3 = '0';

/** Write Word Marks as 1s, x3 = `1` — `M %21 bbbbb W` (Autocoder WM), io.md §7 (p.80). */
const WRITE_WORD_MARKS_X3 = '1';

/**
 * The two codes `%21` prints, charset.md §2 (A22-0526-3 Figure 2): the digit `1` is octal 01 and
 * the blank is octal 00 — a different code from the substitute blank, octal 20.
 */
const ONE_BCD = 0o01;
const BLANK_BCD = 0o00;

/** Model 2: 132 print positions (Model 1 = 100). io.md §7 "Configuration". */
export const PRINT_POSITIONS = 132;

// ═══ The 48-graphic chain — research/charset.md §5 ═══════════════════════════

export type PrintChain = 'A' | 'H';

/**
 * OPEN: `PRINT_CHAIN_A_IS_DEFAULT` — the 1410 PoO names the two arrangements A2 (commerce) and
 * H2 (COBOL/FORTRAN) and its Figure 2 footnote, which is the source for `?` printing `&`, is
 * explicitly written for the "typical" — i.e. A2 — chain (charset.md §5 `[verified]`). So A is
 * the default here and `'H'` is a constructor option. The one `[likely]` cell is `?` on an H
 * chain: no primary source publishes an explicit H-arrangement "prints as" column, and `+` is
 * derived from GA24-3073 p.27's dualing of `&` with `+` (charset.md §5.1). A wrong guess there
 * costs one glyph on a chain nothing in this project selects.
 * docs/plans/phase-2-unit-record.md §15; open-questions.md, Phase 2 section.
 */
export const PRINT_CHAIN_A_IS_DEFAULT: PrintChain = 'A';

/**
 * THE 48 SLUGS OF THE CHAIN, AND WHY THEY ARE HERE AND NOT IN `bcd.ts`.
 *
 * `bcd.ts`'s `glyph` column is the 1415 TYPEBALL's 64 characters — one glyph per code, a
 * bijection, because the console can type every code. This is the 1403 CHAIN's 48: twelve codes
 * have no slug at all and print BLANK, and three codes print a slug that belongs to a different
 * code. That is a property of the PRINTER, not of the code point, which is exactly why the two
 * tables are separate and why the printer's is a constructor option.
 *
 * charset.md §5 `[verified]` (A22-0526-3 pp.6-7 Figure 2; GA24-3073 pp.25, 27):
 *   · Set A = `A-Z`, `0-9`, `& . ⌑ - $ * / , % # @ ‡`
 *   · Set H = `A-Z`, `0-9`, `+ . ) - $ * / , ( = ' ‡`
 *   · Five code points are DUALED: 12 (`&`/`+`), 12-4-8 (`⌑`/`)`), 0-4-8 (`%`/`(`),
 *     3-8 (`#`/`=`), 4-8 (`@`/`'`). Everything else is chain-independent.
 *   · On NEITHER arrangement, printing blank: `[ < ⧧ ] ; Δ ⌒ \ ⧻ : > √` — twelve codes.
 *   · `ƀ` (substitute blank) prints the RECORD-MARK slug; `?` (plus zero) prints `&` on A and
 *     `+` on H (`[likely]`, §5.1); `!` (minus zero) prints `-`. The last two are chain-
 *     independent because `-` and the record mark exist on both 48-character sets.
 *
 * **charset.md §5.3's caution, verbatim, because copying the wrong table is the standard
 * mistake:** "SimH's `mem_to_ascii[64]` in `i7010_sys.c` renders 12 (`BA`) as `+`, 12-4-8 as
 * `)`, 0-4-8 as `(`, 4-8 as `'` and 3-8 as `=` — i.e. **the H-chain glyphs**. An emulator that
 * copies SimH's table inherits the H arrangement, not the A2 arrangement the 1410 PoO assumes.
 * Choose deliberately and make the chain a configuration switch."
 *
 * The rows below are keyed on the manual's own two-digit OCTAL, in `bcd.ts`'s collating order so
 * the two tables can be read side by side. `''` is "no slug on this arrangement — prints blank".
 * All 64 codes are asserted against `oracle/chain48.json`, which transcribes §5 independently.
 */
interface ChainSlug {
  readonly octal: string;
  readonly name: string;
  readonly a: string;
  readonly h: string;
}

const CHAIN_SLUGS: readonly ChainSlug[] = [
  { octal: '00', name: 'blank',            a: ' ', h: ' ' },
  { octal: '73', name: 'period',           a: '.', h: '.' },
  { octal: '74', name: 'lozenge',          a: '⌑', h: ')' },   // dualed
  { octal: '75', name: 'left bracket',     a: '',  h: ''  },   // on neither chain
  { octal: '76', name: 'less than',        a: '',  h: ''  },   // on neither chain
  { octal: '77', name: 'group mark',       a: '',  h: ''  },   // on neither chain
  { octal: '60', name: 'ampersand',        a: '&', h: '+' },   // dualed
  { octal: '53', name: 'dollar',           a: '$', h: '$' },
  { octal: '54', name: 'asterisk',         a: '*', h: '*' },
  { octal: '55', name: 'right bracket',    a: '',  h: ''  },   // on neither chain
  { octal: '56', name: 'semicolon',        a: '',  h: ''  },   // on neither chain
  { octal: '57', name: 'delta',            a: '',  h: ''  },   // on neither chain
  { octal: '40', name: 'minus',            a: '-', h: '-' },
  { octal: '21', name: 'slash',            a: '/', h: '/' },
  { octal: '33', name: 'comma',            a: ',', h: ',' },
  { octal: '34', name: 'percent',          a: '%', h: '(' },   // dualed
  { octal: '35', name: 'word separator',   a: '',  h: ''  },   // on neither chain — see write()
  { octal: '36', name: 'backslash',        a: '',  h: ''  },   // on neither chain
  { octal: '37', name: 'segment mark',     a: '',  h: ''  },   // on neither chain
  { octal: '20', name: 'substitute blank', a: '‡', h: '‡' },   // prints the record-mark slug
  { octal: '13', name: 'number sign',      a: '#', h: '=' },   // dualed
  { octal: '14', name: 'at sign',          a: '@', h: "'" },   // dualed
  { octal: '15', name: 'colon',            a: '',  h: ''  },   // on neither chain
  { octal: '16', name: 'greater than',     a: '',  h: ''  },   // on neither chain
  { octal: '17', name: 'tape mark',        a: '',  h: ''  },   // on neither chain
  { octal: '72', name: 'plus zero',        a: '&', h: '+' },   // `?` prints the 12-zone slug
  { octal: '61', name: 'A',                a: 'A', h: 'A' },
  { octal: '62', name: 'B',                a: 'B', h: 'B' },
  { octal: '63', name: 'C',                a: 'C', h: 'C' },
  { octal: '64', name: 'D',                a: 'D', h: 'D' },
  { octal: '65', name: 'E',                a: 'E', h: 'E' },
  { octal: '66', name: 'F',                a: 'F', h: 'F' },
  { octal: '67', name: 'G',                a: 'G', h: 'G' },
  { octal: '70', name: 'H',                a: 'H', h: 'H' },
  { octal: '71', name: 'I',                a: 'I', h: 'I' },
  { octal: '52', name: 'minus zero',       a: '-', h: '-' },   // `!` prints the 11-zone slug
  { octal: '41', name: 'J',                a: 'J', h: 'J' },
  { octal: '42', name: 'K',                a: 'K', h: 'K' },
  { octal: '43', name: 'L',                a: 'L', h: 'L' },
  { octal: '44', name: 'M',                a: 'M', h: 'M' },
  { octal: '45', name: 'N',                a: 'N', h: 'N' },
  { octal: '46', name: 'O',                a: 'O', h: 'O' },
  { octal: '47', name: 'P',                a: 'P', h: 'P' },
  { octal: '50', name: 'Q',                a: 'Q', h: 'Q' },
  { octal: '51', name: 'R',                a: 'R', h: 'R' },
  { octal: '32', name: 'record mark',      a: '‡', h: '‡' },
  { octal: '22', name: 'S',                a: 'S', h: 'S' },
  { octal: '23', name: 'T',                a: 'T', h: 'T' },
  { octal: '24', name: 'U',                a: 'U', h: 'U' },
  { octal: '25', name: 'V',                a: 'V', h: 'V' },
  { octal: '26', name: 'W',                a: 'W', h: 'W' },
  { octal: '27', name: 'X',                a: 'X', h: 'X' },
  { octal: '30', name: 'Y',                a: 'Y', h: 'Y' },
  { octal: '31', name: 'Z',                a: 'Z', h: 'Z' },
  { octal: '12', name: 'zero',             a: '0', h: '0' },
  { octal: '01', name: 'one',              a: '1', h: '1' },
  { octal: '02', name: 'two',              a: '2', h: '2' },
  { octal: '03', name: 'three',            a: '3', h: '3' },
  { octal: '04', name: 'four',             a: '4', h: '4' },
  { octal: '05', name: 'five',             a: '5', h: '5' },
  { octal: '06', name: 'six',              a: '6', h: '6' },
  { octal: '07', name: 'seven',            a: '7', h: '7' },
  { octal: '10', name: 'eight',            a: '8', h: '8' },
  { octal: '11', name: 'nine',             a: '9', h: '9' },
];

/**
 * The chain as the printer actually uses it: ONE 64-CHARACTER STRING PER ARRANGEMENT, code order,
 * built once. A code with no slug on that arrangement is a blank in the string — one position
 * wide, because the hammer simply does not fire and the paper moves on (charset.md §5) — so the
 * "prints blank" rule is spelled once here and the lookup below is total, with no unreachable
 * "no such code" branch to leave untested.
 */
const CHAIN_STRINGS: Readonly<Record<PrintChain, string>> = (() => {
  const a = new Array<string>(64).fill(' ');
  const h = new Array<string>(64).fill(' ');
  for (const row of CHAIN_SLUGS) {
    const code = Number.parseInt(row.octal, 8);
    a[code] = row.a === '' ? ' ' : row.a;
    h[code] = row.h === '' ? ' ' : row.h;
  }
  return { A: a.join(''), H: h.join('') };
})();

/**
 * One six-bit code as one printed character. The caller passes the BCD alone: a word-mark bit
 * never reaches a seven-bit device (io.md §1) and the check bit is not printable. `charAt` on a
 * masked 0-63 index is total — every code has a position on the chain, twelve of them blank.
 */
export function chainGlyph(bcd6: number, chain: PrintChain = PRINT_CHAIN_A_IS_DEFAULT): string {
  return CHAIN_STRINGS[chain].charAt(bcd6 & 0o77);
}

// ═══ The carriage tape — io.md §7 "Carriage tape" ════════════════════════════

export interface CarriageTape {
  /** At most 132 lines — "tape holds a maximum of 132 lines (22 inches)" (io.md §7). */
  readonly formLines: number;
  readonly punches: readonly { readonly line: number; readonly channel: number }[];
}

/**
 * OPEN: `DEFAULT_CARRIAGE_TAPE` — `[unverified]`. Twelve channels and the skip/space rules are
 * `[verified]` (io.md §7, A22-0526-3 pp.68, 71-72, 81), but NO MANUAL PUBLISHES ANY SITE'S TAPE
 * PUNCHING: a carriage tape is punched for the forms a shop actually runs. 66 lines is 11 inches
 * at 6 lpi, the green-bar stock of console-and-physical.md §8 (itself `[likely]`); channel 1 at
 * line 1 is the documented home position; channel 9 at 57 and channel 12 at 60 are the
 * conventional "near the bottom" / "overflow" pair and are ours.
 *
 * Fallback: use it, expose it as a constructor option, and RENDER IT in the printer view so it
 * is visible rather than assumed. A wrong guess costs a page break in the wrong place and
 * nothing else — skip and space behaviour is verified, only the punch positions are ours.
 * docs/plans/phase-2-unit-record.md §7.3, §15; open-questions.md, Phase 2 section.
 */
export const DEFAULT_CARRIAGE_TAPE: CarriageTape = {
  formLines: 66,
  punches: [
    { line: 1, channel: 1 },     // home — io.md §7 "Carriage Restore ... channel 1 (home)"
    { line: 57, channel: 9 },    // channel 9: the CPU-testable near-bottom signal (Figure 35)
    { line: 60, channel: 12 },   // channel 12: carriage overflow (Figure 35)
  ],
};

/**
 * OPEN: `CARRIAGE_POWER_ON_AT_CHANNEL_1_HOME` — the state is `[verified]` and the consequence is
 * `[likely]`. The Carriage Restore key "positions the carriage at channel 1 (home)" (io.md §7,
 * A22-0526-3 pp.68, 71-72), so page 1 line 1 is where a powered-on carriage sits. What no source
 * says is whether the brushes then count as POSITIONED ON that punch for the next-punch rule.
 *
 * Fallback: they do. So the first `F 1` from home finds no further channel-1 punch on this form
 * and ejects to line 1 of the NEXT form — exactly as it would after a Carriage Restore, and
 * exactly why the demo's skip is the LAST instruction of the program rather than the first
 * (plan §13). The alternative, "home but unsensed", would make the first skip-to-1 a no-op and
 * hide the rule; it is rejected because it invents a state the manual does not describe.
 * Wave 3 pins the choice in both directions. docs/plans/phase-2-unit-record.md §15.
 */
export const CARRIAGE_POWER_ON_AT_CHANNEL_1_HOME = true;

/**
 * OPEN: `UNDEFINED_CARRIAGE_D_CHAR_IS_INSTRUCTION_CHECK` — `[unverified]`. Figure 90 lists
 * thirty d-characters and states no validity check for the other thirty-four. We treat an
 * op-modifier the machine cannot decode as the I ring treats one everywhere else: an Instruction
 * Check with nothing executed (research/architecture.md §7), matching
 * `UNDEFINED_J_D_CHAR_IS_INSTRUCTION_CHECK` (isa/exec/branch.ts) and
 * `UNDEFINED_IO_D_CHAR_IS_INSTRUCTION_CHECK` (channel.ts). The alternative — silently no motion
 * — hides the fault. docs/plans/phase-2-unit-record.md §15; open-questions.md, Phase 2 section.
 */
export const UNDEFINED_CARRIAGE_D_CHAR_IS_INSTRUCTION_CHECK = true;

/**
 * OPEN: `OVERLONG_RECORD_SETS_WLR` — `[likely]`. Figure 89 lists WLR for a Write a Line with
 * "wrong length record; line not printed", but never states what CAUSES it on output. A record
 * longer than the print buffer is the only cause this configuration can produce, so: > 132
 * characters sets WLR and NOTHING IS PRINTED. The alternative — truncate at 132 and print — is
 * unattested and would let a program silently lose data.
 * docs/plans/phase-2-unit-record.md §15; open-questions.md, Phase 2 section.
 */
export const OVERLONG_RECORD_SETS_WLR = true;

/**
 * OPEN: `BUFFER_CLEARED_BEFORE_TRANSFER` — `[unverified]`. No source says what the 1414 print
 * buffer holds in the positions a short record does not reach. We take BLANKS: a 78-character
 * record prints 78 characters and positions 79-132 are blank, never the tail of the previous
 * line. The alternative — stale buffer contents printing — is unattested, makes output
 * nondeterministic, and no program could rely on it. `PrintLine.text` therefore carries only the
 * record's own positions (its own trailing blanks included, which are device truth); everything
 * past them is blank by construction.
 * docs/plans/phase-2-unit-record.md §15; open-questions.md, Phase 2 section.
 */
export const BUFFER_CLEARED_BEFORE_TRANSFER = true;

/**
 * OPEN: `AUTO_SPACE_IS_DEFERRED` / `AUTO_SPACE_IS_CANCELLED_BY_A_CARRIAGE_INSTRUCTION` —
 * `[likely]`. io.md §7 says the automatic single space happens "at the end of the
 * buffer-to-printer transfer" AND "if no carriage-control instruction follows". A device cannot
 * see the future, so the space is DEFERRED: a print arms `autoSpacePending`, and exactly three
 * things perform or consume it — the next `write()` (which performs it before printing), the
 * next `F` (which CONSUMES it and substitutes its own motion), and an explicit `flush()` at end
 * of job. NOTHING THAT MERELY OBSERVES STATE PERFORMS IT; see `flush()` for why.
 *
 * Flipping the second constant would make the space unconditional and additive: the demo's
 * golden page would gain one blank line and nothing else would change.
 * docs/plans/phase-2-unit-record.md §7.3, §15; open-questions.md, Phase 2 section.
 */
export const AUTO_SPACE_IS_DEFERRED = true;
export const AUTO_SPACE_IS_CANCELLED_BY_A_CARRIAGE_INSTRUCTION = true;

/**
 * OPEN: `UNKNOWN_X3_IS_NOT_READY` — the same reading `reader1402.ts` takes, for the same reason.
 * io.md §2 and §5 state no validity check for the x3 sub-operation character and Figure 107's x3
 * column is keyed on x2, so a glyph the 1403 has no sub-operation for is a readiness question,
 * not a decode question: Not Ready, following io.md §9 Figure 99's "no such unit".
 * docs/plans/phase-2-unit-record.md §15; open-questions.md, Phase 2 section.
 */
export const UNKNOWN_X3_IS_NOT_READY = true;

/**
 * OPEN: `SKIP_TO_UNPUNCHED_CHANNEL_ADVANCES_ONE_FORM` — `[unverified]`. Figure 90 gives all twelve
 * channels a d-character (io.md §7, A22-0526-3 p.81) but a tape need not be punched on all twelve,
 * and NO MANUAL STATES WHAT A SKIP TO AN UNPUNCHED CHANNEL DOES: Figure 91's status column has no
 * row for it, and a real carriage would run the forms until the forms-check stopped it.
 *
 * It is reachable from any hand-typed deck — `F 5` on `DEFAULT_CARRIAGE_TAPE`, which is punched on
 * channels 1, 9 and 12 only — and it is observable: the search is bounded at ONE FULL FORM, so the
 * carriage ends one form on, at the line it started from. The alternative, an unbounded search for
 * a punch that does not exist, is not a behaviour but a hang. `test/printer1403.test.ts` pins the
 * bound. docs/plans/phase-2-unit-record.md §15; open-questions.md, Phase 2 section.
 */
export const SKIP_TO_UNPUNCHED_CHANNEL_ADVANCES_ONE_FORM = true;

/**
 * OPEN: `L_WRITE_WORD_MARKS_PRINTS_A_BLANK_LINE` — the SENTENCE is `[verified]`, the CONSEQUENCE
 * is ours. A22-0526-3 p.80, verbatim (charset.md §7, io.md §7): "(Thus, if the L Op code is used,
 * no printing results.)" The manual gives its own mechanism in the same breath — load mode turns
 * the word marks into word separators before the buffer, and every non-word-mark position is
 * blank — so what is `[verified]` is NO INK: every position of the line is blank and the hammers
 * strike nothing.
 *
 * **What no source states is whether the print CYCLE still happens**, and that is the part this
 * constant rules on. We take it that it does: the transfer completed, so the buffer prints — all
 * 132 positions blank — and the automatic single space still arms, so the paper gains a BLANK
 * LINE. "No printing results" is what that looks like to the operator, not a suppressed cycle;
 * no source describes a suppressed cycle, and no program could tell the two apart except by
 * counting lines. Cited at `outputCells`'s load-mode row below, which is where the blanks are
 * substituted. `test/printer1403.test.ts` pins the blank `PrintLine` and the still-armed space
 * beside the move-mode `%21` row. docs/plans/phase-2-unit-record.md §6.3, §15;
 * open-questions.md, Phase 2 section.
 */
export const L_WRITE_WORD_MARKS_PRINTS_A_BLANK_LINE = true;

/**
 * OPEN: `CARRIAGE_SENSES_AT_DESTINATION_ONLY` — a KNOWN DIVERGENCE from a `[verified]` sentence,
 * recorded rather than fixed. io.md §5 Figure 35 line 268, verbatim (A22-0526-3 p.36): "Carriage
 * 9 and 12 indicators turn on when their hole IS SENSED and off when any other carriage-tape
 * channel is sensed." The brushes ride the tape, so on iron every line the form passes under them
 * during a space or a skip is sensed — the indicators are a running state, not a destination
 * state.
 *
 * This carriage senses ONCE, at the destination: `space()` and `skipToChannel()` move the form
 * and then call `senseChannels()` on the line they landed on, and the lines crossed on the way
 * are not looked at.
 *
 * **The observable difference.** `F L` (immediate space 3) from line 55 on `DEFAULT_CARRIAGE_TAPE`
 * lands on 58, crossing the channel-9 punch at 57. Hardware senses that hole in passing and
 * leaves the channel-9 indicator ON (58 carries no punch, so nothing clears it); this model
 * senses only line 58, finds no punch, and leaves channel 9 OFF — so `J (I) 9` (BC9) answers
 * false where the machine would answer true. Nothing in Phase 2 reaches it: the demo spaces one
 * line at a time and its only skip is `F 1`, and a single-line space cannot skip over a punch.
 *
 * **The fix path**, when a program needs it: sense per line inside `advanceOneLine()` instead of
 * once after the motion — `senseChannels()` already has the right rule for one line (a punched
 * line sets the matching indicator and clears the other; an unpunched line changes nothing), so
 * the change is to call it from the loop body and delete the two calls after the loops. The
 * `[verified]` sentence is the specification either way; only the sampling rate differs.
 * open-questions.md, Phase 2 section; PHASE-2-NOTES.md §1.
 */
export const CARRIAGE_SENSES_AT_DESTINATION_ONLY = true;

/** A carriage motion an after-print `F` parked for the next print to perform. */
type PendingMotion =
  | { readonly kind: 'skip'; readonly channel: number }
  | { readonly kind: 'space'; readonly lines: number };

export class Printer1403 implements Device {
  readonly x2 = PRINTER_X2;
  /** io.md §1: everything but the 1415 and the disks is seven-bit — no word-mark bit on the line. */
  readonly bits = 7 as const;

  readonly chain: PrintChain;
  readonly tape: CarriageTape;

  /** What the PROGRAM asked for — the raw stream, frozen in Phase 1 (types.ts §7). */
  private readonly printEvents: PrintEvent[] = [];
  /** What a person reads — one entry per line that actually printed. */
  private readonly printed: PrintLine[] = [];

  private pageNo = 1;
  private lineNo = 1;
  private ch9 = false;
  private ch12 = false;
  private autoSpace = false;
  private pending: PendingMotion | null = null;

  constructor(opts?: { chain?: PrintChain; tape?: CarriageTape }) {
    this.chain = opts?.chain ?? PRINT_CHAIN_A_IS_DEFAULT;
    this.tape = opts?.tape ?? DEFAULT_CARRIAGE_TAPE;
    // Power-on = home = page 1, line 1, POSITIONED ON the channel-1 punch. The channel-9 and
    // channel-12 indicators follow Figure 35 for that line like any other
    // (`CARRIAGE_POWER_ON_AT_CHANNEL_1_HOME` above).
    this.senseChannels();
  }

  get events(): readonly PrintEvent[] { return this.printEvents; }
  get paper(): readonly PrintLine[] { return this.printed; }

  get carriage(): CarriageState {
    return {
      page: this.pageNo, line: this.lineNo,
      channel9: this.ch9, channel12: this.ch12,
      autoSpacePending: this.autoSpace,
    };
  }

  // ── Step 4 of the nine: can the device execute? ──────────────────────────

  /**
   * io.md §7 Figure 89 as a table — and in THIS configuration every row of it is unreachable
   * before the transfer, so `precheck` sets nothing except for an x3 the printer has no
   * sub-operation for:
   *
   *   · Not Ready — "printer not ready, not on line, power off, out of forms". There is no
   *     PRINT STOP key, no forms supply and no power switch in this emulator, so the only way to
   *     reach it is the x3 rows below.
   *   · Busy — "previous line still being printed". `cycles.ts`'s I/O term is 0, so no program
   *     here can observe a line still printing (`CARRIAGE_NEVER_BUSY`, plan §15 — the channel
   *     getter it names is wave 4's).
   *   · Data Check ("print buffer parity error") and Condition ("buffer timing error or
   *     hammer-fire check") are 1414/1403 hardware faults with no emulated cause: nothing this
   *     emulator accepts can produce a buffer parity error or a hammer-fire check, and
   *     `precheck` could not express "set Data Check and still print" anyway, because step 6 of
   *     the nine skips the transfer whenever any indicator is on. STATED, NOT FAKED — the rows
   *     are asserted from `oracle/io-status.json` and the gap is recorded in `PHASE-2-NOTES.md`.
   *   · WLR is a POST-transfer test and lives in `write()`, not here.
   *   · No Transfer — "never" (Figure 89).
   *
   * The x3 rows (io.md §2 Figure 107):
   *   · `0` Write a Line                                    -> {}
   *   · `1` Write Word Marks as 1s (`%21`)                  -> {}
   *   · anything else                                       -> Not Ready (`UNKNOWN_X3_IS_NOT_READY`)
   *
   * x3 = `1` was Not Ready through wave 3 and is a real sub-operation now (A22-0526-3 p.80):
   * wave 4 added `Device.outputCells`, the one hook that lets a device see core word marks before
   * `translateForOutput` masks bit 7, so `%21` has behaviour to answer with. From here on it IS
   * `%20` — `outputCells` below substitutes the cells and `write()` prints them — which is why
   * the two share this branch instead of getting one each.
   */
  precheck(x3: string, _d: string): Partial<ChannelStatus> {
    if (x3 === WRITE_A_LINE_X3 || x3 === WRITE_WORD_MARKS_X3) return {};
    return { notReady: true };   // UNKNOWN_X3_IS_NOT_READY — see above
  }

  /**
   * **Write Word Marks as 1s**, `M %21 bbbbb W` (Autocoder WM) — io.md §7 (A22-0526-3 p.80) and
   * charset.md §7, both `[verified]`. The channel calls this BEFORE `translateForOutput`, which
   * is the only moment the cells still carry their WM bits: `dropWordMark` masks bit 7 for every
   * seven-bit device, and in load mode the separators those marks become do not exist yet. So the
   * load-mode answer below is NOT derived from separators — it is read off the marks themselves
   * (types.ts §5 `Device.outputCells`; channel.ts `write`).
   *
   * Two manual rows, encoded as two rows:
   *   · MOVE mode — "word-marked positions print `1`, all others print blank" (io.md §7).
   *   · LOAD mode — A22-0526-3 p.80 / charset.md §7, verbatim: "(Thus, if the L Op code is used,
   *     no printing results.)" The reason the manual gives is mechanical: load mode converts the
   *     word marks to word separators before the buffer, and every non-word-mark position is
   *     blank — so every position is blank and the hammers strike nothing. **The line is still
   *     printed**, which is `L_WRITE_WORD_MARKS_PRINTS_A_BLANK_LINE` above: the NO INK is
   *     `[verified]`, the blank-line-versus-suppressed-cycle reading is ours.
   *     `test/printer1403.test.ts` pins it beside the move-mode row.
   *
   * The substituted cells are built with correct odd parity — they have no core cell behind them,
   * exactly like the separators `translateForOutput` synthesises (channel.ts).
   */
  outputCells(x3: string, cells: readonly Cell[], mode: IoMode): readonly Cell[] {
    if (x3 !== WRITE_WORD_MARKS_X3) return cells;
    return cells.map((c) => {
      const bcd = mode === 'move' && (c & WM) !== 0 ? ONE_BCD : BLANK_BCD;
      return parity(bcd, false) | bcd;
    });
  }

  // ── Step 7: the transfer, and the paper it lands on ──────────────────────

  /**
   * **Write a Line**, io.md §7 Figure 88 (A22-0526-3 p.80): "transfers 100/132 characters core →
   * print buffer, left to right, until GMWM; THEN the printer starts". The channel has already
   * gathered the core field up to its group-mark-with-word-mark and translated it for a
   * seven-bit device, so `data` is the record and nothing here re-reads storage.
   *
   * **LOAD-MODE `%20` NEEDS NO CODE HERE, AND THAT IS THE POINT.** `translateForOutput` already
   * emits a word separator one position ahead of every word-marked character (channel.ts,
   * io.md §3), and the word separator's chain glyph is BLANK because 0-5-8 is one of the twelve
   * codes on neither arrangement (`CHAIN_SLUGS` above). A blank ahead of each marked character
   * IS io.md §7's "there is no word-separator print slug, so a blank precedes each word-marked
   * character on the page" — the same expression produces it, with no special case.
   *
   * Order of operations, and each step's rule:
   *   1. > 132 characters: WLR, and THE LINE IS NOT PRINTED (`OVERLONG_RECORD_SETS_WLR`). The
   *      carriage does not move either — nothing printed, so nothing spaced — and a previously
   *      armed automatic space stays armed for whatever comes next.
   *   2. Perform any pending automatic single space (`AUTO_SPACE_IS_DEFERRED`). It is carriage
   *      motion the LAST print earned, so it happens before this line lands.
   *   3. Render and record the line where the carriage now sits.
   *   4. Then either the after-print motion a previous `F` parked, or a freshly armed automatic
   *      single space — never both, because the after-print motion is what "a carriage-control
   *      instruction follows" means (io.md §7).
   */
  write(_x3: string, _d: string, data: Uint8Array, _mode: IoMode): Partial<ChannelStatus> {
    // No x3 test here: step 6 of the nine skips the transfer whenever `precheck` set an
    // indicator, so the only x3 that reaches this method is `0` (channel.ts, io.md §5 Figure 40).

    if (OVERLONG_RECORD_SETS_WLR && data.length > PRINT_POSITIONS) {
      return { wrongLengthRecord: true };
    }

    this.performAutoSpace();

    // `BUFFER_CLEARED_BEFORE_TRANSFER`: the record's own positions and no more — positions past
    // it are blank, never the tail of the last line. Trailing blanks INSIDE the record are kept:
    // they are what the program put in the buffer, and trimming them is `renderGreenBar`'s job.
    let text = '';
    for (const byte of data) text += chainGlyph(byte, this.chain);

    this.printEvents.push({ kind: 'line', text });
    this.printed.push({ page: this.pageNo, line: this.lineNo, text });

    const parked = this.pending;
    if (parked === null) {
      this.autoSpace = true;
    } else {
      // The after-print carriage operation replaces the automatic space (io.md §7, "if NO
      // carriage-control instruction follows"). Its `PrintEvent` was pushed when the `F` ran,
      // with `afterPrint: true` — this is where it becomes motion.
      this.pending = null;
      this.autoSpace = false;
      if (parked.kind === 'skip') this.skipToChannel(parked.channel);
      else this.space(parked.lines);
    }
    return {};
  }

  /**
   * **`F d` Carriage Control**, io.md §7 Figure 90 (A22-0526-3 p.81). All thirty rows come from
   * `isa/dmods.ts`'s `CARRIAGE_D_TABLE` — the numeric bits of d give the channel or the space
   * count, the zone bits select the variant — and there is NO second copy of that table anywhere
   * in this project (plan §12): the wave-3 test drives this function against `CARRIAGE_D_TABLE`
   * itself.
   *
   * ANY `F` consumes the automatic single space, immediate or deferred: io.md §7's rule is "if
   * no carriage-control instruction FOLLOWS", and one just did
   * (`AUTO_SPACE_IS_CANCELLED_BY_A_CARRIAGE_INSTRUCTION`). An immediate variant then moves the
   * carriage now.
   *
   * **AN AFTER-PRINT VARIANT DEPENDS ON WHETHER A PRINT IS OUTSTANDING, and getting that wrong
   * loses a line.** `autoSpace` armed means the last thing this device did was print and the
   * carriage has not moved since — so THIS `F` is the carriage-control instruction that "follows"
   * that print, and its motion is that print's motion: it happens NOW, in place of the automatic
   * single space the print armed. Figure 91 reads the same way from the other side — the Busy row
   * for a carriage op is "forms in motion / **forms instruction waiting**", i.e. the queued motion
   * belongs to the print in progress, not to some later one (io.md §7, A22-0526-3 p.81).
   * Only when NO print is outstanding is there a later print for the motion to attach to, and only
   * then is it parked. Parking it in both cases would leave a `W` `F/` `W` sequence printing both
   * lines at line 1 — the second silently on top of the first.
   *
   * Figure 91's status column is six "never"s and a Not Ready that this configuration cannot
   * reach except by an op the printer does not have, so `{}` is the whole of step 8.
   * "Word marks are not affected" (io.md §7) is `table.ts`'s `regs: NSI_AP_BP` on the `F` row
   * plus this method touching no storage.
   */
  control(op: string, d: string): Partial<ChannelStatus> {
    if (op !== CARRIAGE_OP) return { notReady: true };

    const row = CARRIAGE_D_TABLE.find((r) => r.d === d);
    if (row === undefined) {
      if (!UNDEFINED_CARRIAGE_D_CHAR_IS_INSTRUCTION_CHECK) return {};
      // No `at` to attach: `Device.control(op, d)` carries no instruction address, and the check
      // is raised at step 7 of the nine — after step 5 armed the interlock, which is what the
      // machine would be left holding.
      throw new InstructionCheck(
        `undefined carriage d-character "${d}" (io.md §7 Figure 90, A22-0526-3 p.81)`,
      );
    }

    // A print is outstanding exactly while its automatic space is still armed — read it before
    // clearing, because it decides which print an after-print motion belongs to.
    const printOutstanding = this.autoSpace;
    this.autoSpace = false;

    switch (row.mode) {
      case 'immediateSkip':
        this.printEvents.push({ kind: 'skip', channel: row.value, afterPrint: false });
        this.skipToChannel(row.value);
        break;
      case 'immediateSpace':
        this.printEvents.push({ kind: 'space', lines: spaceCount(row.value), afterPrint: false });
        this.space(row.value);
        break;
      case 'skipAfterPrint':
        this.printEvents.push({ kind: 'skip', channel: row.value, afterPrint: true });
        if (printOutstanding) this.skipToChannel(row.value);
        else this.pending = { kind: 'skip', channel: row.value };
        break;
      case 'spaceAfterPrint':
        this.printEvents.push({ kind: 'space', lines: spaceCount(row.value), afterPrint: true });
        if (printOutstanding) this.space(row.value);
        else this.pending = { kind: 'space', lines: row.value };
        break;
    }
    return {};
  }

  /**
   * Perform a pending automatic single space. **END OF JOB ONLY** — `machine.endOfJob()` calls
   * it after the halt, and nothing else does.
   *
   * IT IS NOT A GETTER AND MUST NEVER BECOME ONE (plan §7.3). `snapshot()` runs on every
   * animation frame and in every test; if reading the paper performed the pending space, then
   * `snapshot().printer.paper` would depend on how many times the UI redrew, the byte-for-byte
   * golden would differ between one `npm run demo` and a browser that rendered a hundred frames,
   * and `architecture.md` §2's "devices produce values, never side effects" would be false. The
   * pending space is instead VISIBLE, as `CarriageState.autoSpacePending`, so a view can draw
   * the paper as it will be without moving it.
   */
  flush(): void {
    this.performAutoSpace();
  }

  // ── The carriage itself — io.md §7 "Carriage tape", §5 Figure 35 ─────────

  private performAutoSpace(): void {
    if (!this.autoSpace) return;
    this.autoSpace = false;
    this.space(1);
  }

  /**
   * Space `lines` line positions. `page` counts FORMS and increments on exactly one event:
   * motion that passes the last line of the form and wraps to line 1 of the next (types.ts §7).
   * Stating it as the wrap rather than as "a skip to channel 1" keeps it true for any tape.
   */
  private space(lines: number): void {
    for (let i = 0; i < lines; i++) this.advanceOneLine();
    this.senseChannels();
  }

  private advanceOneLine(): void {
    if (this.lineNo >= this.tape.formLines) {
      this.lineNo = 1;
      this.pageNo++;
    } else {
      this.lineNo++;
    }
  }

  /**
   * **"A skip to a channel the brushes are already positioned on moves to the next punch of that
   * channel"** (io.md §7, A22-0526-3 pp.68, 71-72) — verbatim, because it is the one carriage
   * rule implementers get wrong. It falls out of starting the search at `currentLine + 1` rather
   * than at `currentLine`, and it is why `F 1` from the power-on home position ejects a form
   * (`CARRIAGE_POWER_ON_AT_CHANNEL_1_HOME`).
   *
   * A channel with NO punch on the tape is undocumented — a real carriage would run away until
   * the forms-check stopped it, and Figure 91 has no status row for it. Rather than loop forever,
   * the search is bounded at one full form: the carriage ends one form on, at the line it started
   * from (`SKIP_TO_UNPUNCHED_CHANNEL_ADVANCES_ONE_FORM` above, where the alternative is argued).
   * Nothing in this project issues such a skip, but `F 5` on the default tape is one keystroke
   * away in the ALTER box, so the bound is a behaviour and is pinned by a test.
   */
  private skipToChannel(channel: number): void {
    for (let moved = 0; moved < this.tape.formLines; moved++) {
      this.advanceOneLine();
      if (this.punchesAt(this.lineNo).includes(channel)) break;
    }
    this.senseChannels();
  }

  private punchesAt(line: number): readonly number[] {
    return this.tape.punches.filter((p) => p.line === line).map((p) => p.channel);
  }

  /**
   * io.md §5 Figure 35, verbatim: "Carriage 9 and 12 indicators turn on when their hole is
   * sensed and off when any other carriage-tape channel is sensed." So a line carrying a punch
   * SETS the matching indicator and CLEARS the other; a line with no punch at all senses nothing
   * and leaves both where they were.
   *
   * Called ONCE per carriage motion, on the destination line — see
   * `CARRIAGE_SENSES_AT_DESTINATION_ONLY` above, where the divergence from "when their hole is
   * sensed" and the fix path are argued. The rule below is per-line either way.
   */
  private senseChannels(): void {
    const punches = this.punchesAt(this.lineNo);
    if (punches.length === 0) return;
    this.ch9 = punches.includes(9);
    this.ch12 = punches.includes(12);
  }
}

/** `CARRIAGE_D_TABLE`'s space rows carry 1, 2 or 3 — `PrintEvent` types the same three. */
function spaceCount(value: number): 1 | 2 | 3 {
  return value === 2 ? 2 : value === 3 ? 3 : 1;
}

// ═══ The green-bar renderer — plan §5's five rules ═══════════════════════════

/**
 * The pure renderer the golden page and the green-bar view both consume. A byte-for-byte gate
 * cannot be built against an unspecified renderer, so the contract is FIVE RULES and no more
 * (docs/plans/phase-2-unit-record.md §5):
 *
 *  1. One header line — `1403 Model 2 · chain A · 66-line form` — then one blank line. The chain
 *     and the form length are not derivable from the text and both change every glyph or break.
 *  2. Body: each form in order; within a form, every line position from 1 to the highest line
 *     that printed on it. A position that printed nothing renders as an empty line, which is how
 *     carriage motion becomes visible in a diff.
 *  3. A printed line renders `text` with TRAILING BLANKS TRIMMED. Never padded to 132, never
 *     left-padded: position 1 is the first character. (`PrintLine.text` itself keeps its
 *     trailing blanks — that is device truth; the trim is a rendering.)
 *  4. Every form after the first is preceded by a lone form-feed character `\f` on its own line —
 *     one byte, a real printer artefact, visible in a diff as `^L`.
 *  5. Every line ends `\n`, the last one included. Bar shading, column rules, the carriage-
 *     position marker and the tape punches are `printerView.ts`'s and never appear in the text.
 *
 * **TWO `PrintLine`s AT THE SAME (page, line) THROW.** Rule 2 renders one line per position, so a
 * second line landing where a first already printed would be dropped on the floor and the golden
 * page would still compare equal — a gate that can lose a line is not a gate (plan §14 R8). The
 * device is what must not produce the overprint; this is where it becomes visible instead of
 * silent. A real 1403 CAN overprint a line with the carriage held, but nothing in this
 * configuration issues that, and `renderGreenBar` has no way to show it: it renders text, and
 * two texts do not occupy one line position.
 */
export function renderGreenBar(
  paper: readonly PrintLine[],
  opts: { chain: PrintChain; formLines: number },
): string {
  const at = new Set<string>();
  for (const line of paper) {
    const key = `${line.page}:${line.line}`;
    if (at.has(key)) {
      throw new Error(
        `renderGreenBar: two print lines at form ${line.page}, line ${line.line} — `
        + 'the page can render only one and the second would be lost (plan §5 rule 2, §14 R8)',
      );
    }
    at.add(key);
  }

  const out: string[] = [
    `1403 Model 2 · chain ${opts.chain} · ${opts.formLines}-line form`,
    '',
  ];

  // Rule 2: forms in order, and only forms something printed on — a form with no lines has no
  // "highest line that printed on it" and so has no body.
  const forms = [...new Set(paper.map((l) => l.page))].sort((a, b) => a - b);
  forms.forEach((page, i) => {
    if (i > 0) out.push('\f');                       // rule 4
    const lines = paper.filter((l) => l.page === page);
    const highest = Math.max(...lines.map((l) => l.line));
    for (let n = 1; n <= highest; n++) {
      const printed = lines.find((l) => l.line === n);
      out.push(printed === undefined ? '' : printed.text.replace(/ +$/, ''));   // rule 3
    }
  });

  return out.map((line) => `${line}\n`).join('');    // rule 5
}
