// src/asm/listing1403.ts — the listing on paper: ListingLine[] -> PrintLine[] -> renderGreenBar.
// Source: docs/plans/phase-3-autocoder.md §9 (the column stops, the chain paragraph, the page
// rule); docs/research/charset.md §5, §5.1 (which glyphs print blank, `ƀ` -> `‡`, `!` -> `-`);
// docs/research/console-and-physical.md §12 (the OS listing's column SET and page heading).
//
// A FORMATTER, NOT A SECOND CODE PATH (`architecture.md` §2 B3). It decides where a field sits
// in the 132 print positions of a 1403 Model 2 and nothing else; what prints is `listing.ts`'s.
// The paper itself is `renderGreenBar`'s — already tested, already the demo page's renderer — so
// page breaks, form feeds, trailing-blank trimming and the header line come from one function
// and there is exactly one page renderer in the repo.
//
// THE LISTING APPLIES THE CHAIN ITSELF (§9's binding paragraph). `renderGreenBar` renders
// `PrintLine.text` VERBATIM and prints the chain name only in its header; `chainGlyph` is applied
// in the DEVICE write path (`printer1403.ts`), which a listing never goes through. So every
// character composed here is mapped `bcdOfGlyph -> chainGlyph` before it becomes a `PrintLine`.
// The consequences are period-real and are what the tests pin:
//   · the stored `&` (Hollerith 12, the `+` a person typed) prints `&` on chain A and `+` on H;
//   · `[ < ] ; \ : > Δ √ ⧻ ⌒` and the group mark print BLANK on both chains, one position wide;
//   · `ƀ` prints the record-mark slug `‡` on BOTH chains and `!` prints `-` — so the INSTRUCTION
//     column of a `BNT1` line, whose d IS `ƀ` (`dmods.ts`'s SUBSTITUTE-BLANK TRAP), shows `‡`.
//     A listing that blanked it would look right and be wrong.
import { bcdOfGlyph } from '../core/bcd.js';
import {
  DEFAULT_CARRIAGE_TAPE, PRINT_CHAIN_A_IS_DEFAULT, PRINT_POSITIONS, chainGlyph, renderGreenBar,
  type PrintChain,
} from '../core/devices/printer1403.js';
import type { PrintLine } from '../core/types.js';
import { AssemblerBug } from './emit.js';
import type { ListingLine } from './types.js';

/** One field of the listing, 1-based and inclusive, within the 132 positions. */
export interface ListingColumn {
  readonly name: string;
  readonly from: number;
  readonly to: number;
}

/**
 * OPEN: `LISTING_COLUMN_STOPS` — `[unverified]`, plan §9 and §15, and this array is the ONE
 * PLACE they live. `console-and-physical.md` §12 publishes the OS Autocoder listing's column SET
 * (C28-0326-2 Fig.2 pp.10-11) and not its metrics: no source gives a single print position. So
 * the stops are OURS, derived from the fields they have to hold — OPERAND is 52 wide because
 * card columns 21-72 are, INSTRUCTION is 18 because `D 00394 00306 L` is 15 — and everything
 * fits inside the 132 positions of a 1403 Model 2.
 *
 * The OS-only columns are absent by scope, not by oversight: `(S/G)` and `REL` belong to the
 * relocatable assembler whose object format Phase 3 deliberately does not implement, and the
 * FLAG column is one position because the standalone flag set is F / U / M / O and
 * `ONE_FLAG_PER_LISTING_LINE` prints one letter (`software.md` §6, `emit.ts`).
 *
 * Fallback: any other stops. One array, one place, and the only artefact that depends on them is
 * our own constructed golden, regenerable in one command.
 * `open-questions.md`, Phase 3 / Wave 5.
 */
export const LISTING_COLUMN_STOPS: readonly ListingColumn[] = [
  { name: 'SEQNO', from: 1, to: 5 },
  { name: 'PGLIN', from: 7, to: 11 },
  { name: 'LABEL', from: 13, to: 22 },
  { name: 'OPCOD', from: 24, to: 28 },
  { name: 'OPERAND', from: 30, to: 81 },
  { name: 'CT', from: 84, to: 86 },
  { name: 'ADDRS', from: 88, to: 92 },
  { name: 'INSTRUCTION', from: 95, to: 112 },
  { name: 'CARD', from: 115, to: 117 },
  { name: 'FLAG', from: 120, to: 120 },
];

/** The whole line, for a heading, a trailer or a comment — the lines that ignore the stops. */
const FULL_LINE: ListingColumn = { name: 'LINE', from: 1, to: PRINT_POSITIONS };

const span = (name: string): ListingColumn =>
  LISTING_COLUMN_STOPS.find((stop) => stop.name === name) ?? FULL_LINE;

/**
 * Write `text` into a span, truncated at its right edge. Nothing ever runs past 132.
 *
 * The `max(0, …)` is DEFENSIVE and, as the file stands, unreachable: the only computed span is
 * `headingRow`'s centring one, and its width goes negative only if the right-hand `PAGE n  IDENT`
 * block eats the whole line — 13 to 18 positions against 132. It stays because a negative `slice`
 * length does not clamp: it would take everything BUT the last few characters, which is a
 * silently wrong line rather than an obvious one.
 */
function place(row: string[], where: ListingColumn, text: string): void {
  const width = Math.max(0, where.to - where.from + 1);
  const cut = [...text].slice(0, width);
  for (const [i, ch] of cut.entries()) row[where.from - 1 + i] = ch;
}

/** Five digits with leading zeros — the way the machine punches an address. */
const five = (at: number): string => String(at).padStart(5, '0');

/**
 * The page heading: `console-and-physical.md` §12's shape, minus its date.
 *
 * THE DATE IS DELIBERATELY ABSENT. The OS heading printed the assembly date at the left (`64015`)
 * and the run's own date is the one thing that would make `test/golden/hello-dad.lst` differ
 * between two runs of the same command — a golden that changes daily cannot gate a commit
 * (plan §12.2). The JOB text is centred, `PAGE n` and the five-character identification sit at
 * the right, exactly as the OS heading places them.
 */
function headingRow(row: string[], line: ListingLine): void {
  const right = `PAGE ${String(line.seqno)}${line.label === '' ? '' : `  ${line.label}`}`;
  place(row, { name: 'LINE', from: PRINT_POSITIONS - right.length + 1, to: PRINT_POSITIONS }, right);
  const room = PRINT_POSITIONS - right.length - 2;
  const from = Math.max(1, Math.floor((room - [...line.operand].length) / 2) + 1);
  place(row, { name: 'LINE', from, to: room }, line.operand);
}

/** One listing line as 132 stored glyphs, before the chain is applied. */
function compose(line: ListingLine): string {
  const row = new Array<string>(PRINT_POSITIONS).fill(' ');

  if (line.kind === 'heading') {
    headingRow(row, line);
    return row.join('');
  }
  if (line.kind === 'trailer' || (line.kind === 'symbolTable' && line.label === '')) {
    place(row, FULL_LINE, line.operand);
    return row.join('');
  }

  place(row, span('SEQNO'), line.seqno === 0 ? '' : String(line.seqno).padStart(5));
  place(row, span('PGLIN'), line.pglin);
  place(row, span('LABEL'), line.label);
  place(row, span('OPCOD'), line.opcod);
  // A comments card is text from columns 7-72 — 66 positions, more than OPERAND holds — so it
  // runs from the LABEL stop to the right edge of OPERAND, which is 69 wide and where the eye
  // already expects the body of a line to begin.
  place(
    row,
    line.kind === 'comment'
      ? { name: 'LINE', from: span('LABEL').from, to: span('OPERAND').to }
      : span('OPERAND'),
    line.operand,
  );
  if (line.ct !== undefined) place(row, span('CT'), String(line.ct).padStart(3));
  if (line.addrs !== undefined) place(row, span('ADDRS'), five(line.addrs));
  // A CONSTANT LONGER THAN THE COLUMN IS CUT AT 18, and that is a stated rendering rule rather
  // than an accident of `place()`. §9 sized INSTRUCTION for an INSTRUCTION — `D 00394 00306 L` is
  // 15 — but an emitting DCW/DC renders its whole constant here (`emit.ts`'s
  // `declarativeInstruction`, on Exhibit IV SEQNO 39's precedent), and a constant may be 52
  // characters wide. No source describes a standalone listing's constant column at all; the only
  // continuation anything publishes is the OS listing's second line for an unprintable REL field
  // (`console-and-physical.md` §12, C28-0326-2 Fig.2 pp.10-11) — an OS-only column Phase 3 does
  // not carry, and adopting its second-line form for a different column would be inventing a
  // period behaviour. So: the first 18 characters, and the CT column already prints the true
  // length. `open-questions.md`, Phase 3 / Wave 5; `test/asm-listing.test.ts` pins the cut.
  if (line.instruction !== undefined) place(row, span('INSTRUCTION'), line.instruction);
  if (line.card !== undefined) place(row, span('CARD'), String(line.card).padStart(3, '0'));
  if (line.flag !== undefined) place(row, span('FLAG'), line.flag);
  return row.join('');
}

/**
 * Every composed character through the selected chain. A character outside `bcd.ts`'s 64 can
 * only come from a string THIS ASSEMBLER composed — a source card is 64-glyph by construction
 * (`source.ts` stores anything else as a blank and flags `F`) — so it is an assembler bug and
 * throws like one, never a source diagnostic (§6.3).
 */
function chained(text: string, chain: PrintChain): string {
  let out = '';
  for (const ch of text) {
    const bcd = bcdOfGlyph(ch);
    if (bcd === undefined) {
      throw new AssemblerBug(
        `the listing composed ${JSON.stringify(ch)}, which is not one of bcd.ts's 64 glyphs. `
        + 'This is an assembler bug, not a source error.',
      );
    }
    out += chainGlyph(bcd, chain);
  }
  return out;
}

/**
 * `ListingLine[] -> PrintLine[]`, the same `{ page, line, text }` the paper is made of.
 *
 * A `kind: 'heading'` line STARTS A FORM — that is the whole page rule here, because
 * `listing.ts` already emits a heading at every page break and at every EJECT. Line numbers run
 * 1..n within the form, so `renderGreenBar`'s "one line per position" walk sees no gaps and its
 * two-lines-at-one-position guard can never fire.
 */
export function formatListing(
  lines: readonly ListingLine[],
  opts?: { readonly chain?: PrintChain },
): readonly PrintLine[] {
  const chain = opts?.chain ?? PRINT_CHAIN_A_IS_DEFAULT;
  const paper: PrintLine[] = [];
  let page = 1;
  let line = 0;
  for (const [index, entry] of lines.entries()) {
    if (entry.kind === 'heading' && index > 0) page += 1;
    if (entry.kind === 'heading') line = 0;
    line += 1;
    paper.push({ page, line, text: chained(compose(entry), chain) });
  }
  return paper;
}

/** The listing as a person reads it off the 1403 — the golden's own bytes. */
export function renderListing(
  lines: readonly ListingLine[],
  opts?: { readonly chain?: PrintChain },
): string {
  const chain = opts?.chain ?? PRINT_CHAIN_A_IS_DEFAULT;
  return renderGreenBar(formatListing(lines, { chain }), {
    chain,
    formLines: DEFAULT_CARRIAGE_TAPE.formLines,
  });
}
