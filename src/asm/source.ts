// src/asm/source.ts — plan §5.1. Pasted text -> `SourceCard[]` -> the CARD-LEVEL half of a
// `Statement`. This file knows about COLUMNS and GLYPHS and nothing else: the operand grammar is
// `operand.ts`'s (§5.2) and the assignment counter is `symbols.ts`'s (§6.1).
//
// THE COLUMN TABLE IS `software.md` §1's, `[verified]` (C28-0309-1 pp.5-7; coding sheet X24-1350),
// and it is transcribed once, in `types.ts`'s `SOURCE_FIELDS`. Columns 73-75 are IGNORED on input:
// §1's own note says the processor WRITES an object-deck sequence number there on OUTPUT cards and
// does not read it.
//
// THE STORED CARD IS IN THE 64-GLYPH ALPHABET — the one `bcdOfGlyph` accepts (`types.ts`'s
// `SourceCard` contract). Exactly two typing aliases are normalised on the way in, and nothing
// else is: lowercase up-cases, and `+` becomes the 12-punch `&`. Each is a claim about the period
// language rather than an implementation convenience, so each is a named `OPEN:` constant below.
//
// NO CONVENIENCE PADDING OF THE LABEL FIELD (§5.1): a line short of 80 columns is right-padded
// with blanks and nothing is shifted. Accepting a "close enough" layout would be a second source
// language, and the UI carries an 80-column ruler above the textarea — which is what the X24-1350
// coding sheet was — instead.
//
// Every one of the 64 glyphs is a single UTF-16 code unit (`bcd.ts`: the eight non-ASCII ones,
// `⌑ ⧧ ⌒ ⧻ ƀ √ Δ ‡`, are all in the BMP), so column arithmetic on a STORED card is plain string
// indexing. The pasted TEXT is walked by code point instead — `parseDeck`'s precedent — because an
// astral character a person pastes out of a PDF must be reported at one column and not two.

import { bcdOfGlyph } from '../core/bcd.js';
import {
  COMMENT_COLUMN, LABEL_INDENT_COLUMN, SOURCE_COLUMNS, SOURCE_FIELDS, type SourceCard,
} from './types.js';

/**
 * OPEN: `SOURCE_LOWERCASE_UPCASES` — `[likely]`, plan §15, §5.1. The claim: a lowercase letter
 * typed into the source box up-cases to its 64-glyph equivalent, a typing alias exactly like
 * `+` -> `&`. The 1410 has no lowercase (`charset.md` §2's 64 codes hold one case) and the X24-1350
 * coding sheet was written in capitals, so up-casing costs nothing and refusing it would fail a
 * deck that is unambiguously right. Fallback: flag lowercase as well — one branch here, and a
 * worse first five minutes for a person typing the demo.
 */
export const SOURCE_LOWERCASE_UPCASES = true;

/**
 * OPEN: `SOURCE_PLUS_IS_THE_12_PUNCH` — `[likely]`, plan §15, §5.1. The claim: Autocoder's `+`
 * — written for address adjustment, for index tags, for a numeric literal's sign and for an
 * address constant — is Hollerith **12**, BCD `0o60`, which `bcd.ts` names `&` (rank 6) and a
 * chain-A 1403 prints as `&` (`charset.md` §5's dualing table: 12 prints `&` on A, `+` on H).
 * There is no `+` among the 64 machine glyphs. So `+` is a typing alias that normalises to `&`
 * BEFORE the card is stored, exactly as `parseDeck` accepts `{12}`, and the listing printed
 * through chain A shows `A&3` where the manual prints `A+3`.
 *
 * THE CONSEQUENCE `operand.ts` DEPENDS ON: its term introducers are `&` and `-`, never `+`.
 * Fallback: require `&` in the source and drop the alias — a worse read next to the manual, and
 * the only alternative available.
 */
export const SOURCE_PLUS_IS_THE_12_PUNCH = true;

/** The stored glyph a typed `+` becomes — Hollerith 12, `bcd.ts` rank 6 (`0o60`). */
export const TWELVE_PUNCH = '&';

export type SourceField = keyof typeof SOURCE_FIELDS;

/** One field of a stored card, 1-based and inclusive, sliced by `software.md` §1's table. */
export function field(card: SourceCard, name: SourceField): string {
  const [from, to] = SOURCE_FIELDS[name];
  return card.slice(from - 1, to);
}

/** One line of pasted text, stored as one 80-column card. */
export interface SourceLine {
  /** 1-based line in the pasted text — what a person counts in the textarea. */
  readonly line: number;
  /** EXACTLY 80 characters, every one of them in the 64-glyph alphabet. */
  readonly card: SourceCard;
  /** The `F` message this line earned at the CARD level, with its column (§6.3). */
  readonly format?: string;
}

/** One defect found on one line, with the 1-based CARD column it sits in. */
export interface Problem {
  readonly column: number;
  readonly message: string;
}

/**
 * ONE `F` PER LINE (§6.3, `ONE_FLAG_PER_LISTING_LINE`): the LEFTMOST offender is reported with
 * its 1-based column, and the rest are counted. Sorted rather than assumed, so a caller that
 * finds a defect out of column order — `operand.ts` counts the operands before it classifies
 * them — still reports the leftmost one.
 */
export function messageOf(problems: readonly Problem[]): string | undefined {
  const first = [...problems].sort((a, b) => a.column - b.column)[0];
  if (first === undefined) return undefined;
  const rest = problems.length - 1;
  return `${first.message} (column ${first.column})${rest === 0 ? '' : `; ${rest} more like it on this line`}`;
}

/**
 * Pasted text -> stored cards, §5.1's rules and no others.
 *
 * ONE LINE = ONE CARD, right-padded to exactly 80 characters. A line longer than 80 is an `F`.
 * A character `bcdOfGlyph` rejects is an `F` with its 1-based column and STORES AS A BLANK, so
 * the card is still 80 valid glyphs and the listing still renders that line — errors are data
 * (§5.2's closing sentence).
 */
export function readSource(text: string): readonly SourceLine[] {
  const lines: SourceLine[] = [];
  const pasted = text.split('\n');
  for (let index = 0; index < pasted.length; index++) {
    // Trailing CR and trailing SPACES come off before any column is counted — `parseDeck`'s own
    // rule (`src/formats/card.ts`, PHASE-2-NOTES §2 deviation 2), so a legal 80-column card
    // pasted with a stray space no longer reports a bogus column 81. A TAB is deliberately NOT
    // stripped: it is an `F` below, and stripping it would hide the flag it earned.
    const line = (pasted[index] ?? '').replace(/[ \r]+$/, '');
    // An entirely blank line is not a card, `parseDeck`'s precedent again — otherwise a source
    // file's trailing newline would assemble one blank card and consume a SEQNO.
    if (line === '') continue;

    const problems: Problem[] = [];
    const glyphs: string[] = [];
    for (const typed of line) {
      if (glyphs.length === SOURCE_COLUMNS) {
        problems.push({
          column: SOURCE_COLUMNS + 1,
          message: `the line is longer than ${SOURCE_COLUMNS} columns`,
        });
        break;
      }
      const column = glyphs.length + 1;
      if (typed === '\t') {
        // A tab is an `F` and never a column count: the card has 80 columns and no tab stops.
        // The UI carries the 80-column ruler the X24-1350 coding sheet was (§5.1).
        problems.push({ column, message: 'a tab is not a punch — write the columns out, or read them off the ruler' });
        glyphs.push(' ');
        continue;
      }
      // The two typing aliases, and nothing else (SOURCE_LOWERCASE_UPCASES, SOURCE_PLUS_IS_THE_12_PUNCH).
      const stored = typed >= 'a' && typed <= 'z' ? typed.toUpperCase()
        : typed === '+' ? TWELVE_PUNCH
          : typed;
      if (bcdOfGlyph(stored) === undefined) {
        problems.push({ column, message: `"${typed}" is not one of the 64 machine glyphs` });
        glyphs.push(' ');
        continue;
      }
      glyphs.push(stored);
    }

    const format = messageOf(problems);
    lines.push({
      line: index + 1,
      card: glyphs.join('').padEnd(SOURCE_COLUMNS),
      ...(format === undefined ? {} : { format }),
    });
  }
  return lines;
}

/** The card-level half of a `Statement` — everything `software.md` §1's columns decide. */
export interface CardFields {
  /** Columns 1-5 verbatim: the page and line numbers, as punched. */
  readonly pglin: string;
  /** `*` in column 6 — and ONLY there. A `*` in column 21 is the asterisk OPERAND (types.ts). */
  readonly comment: boolean;
  /** Columns 6-15, blanks trimmed from both ends: the NAME. The one legal leading blank is the
   *  column-7 indent, and `labelIndented` is what carries that fact — a label with a blank in it
   *  is not a label at all (`software.md` §1: "≤10 alphameric, first alphabetic, no specials"). */
  readonly label: string;
  /** Column 6 blank AND column 7 not. The MECHANICAL flag only: what an indented label RESOLVES
   *  to is `symbols.ts`'s (`COL7_INDENT_IS_STANDALONE_TOO`, plan §15, wave 4). */
  readonly labelIndented: boolean;
  /** All digits — an ACTUAL label. `software.md` §1, both sentences `[verified]`: it "refers to
   *  the high-order position" and "actual labels have no effect on the address assignment
   *  counters". Wave 4 acts on it; this file only reads the column. */
  readonly labelIsActual: boolean;
  /** Columns 16-20, trimmed. */
  readonly op: string;
  /** Columns 21-72 AS STORED, blank-padded — `operand.ts` needs the COLUMNS, not a trim: the
   *  comment cut, the right-to-left `@` scan and CTL's absolute columns are all positional. */
  readonly operand: string;
}

export function cardFields(card: SourceCard): CardFields {
  const comment = card[COMMENT_COLUMN - 1] === '*';
  const label = comment ? '' : field(card, 'label').trim();
  return {
    pglin: card.slice(SOURCE_FIELDS.page[0] - 1, SOURCE_FIELDS.line[1]),
    comment,
    label,
    labelIndented: !comment
      && card[COMMENT_COLUMN - 1] === ' ' && card[LABEL_INDENT_COLUMN - 1] !== ' ',
    labelIsActual: label !== '' && /^[0-9]+$/.test(label),
    op: comment ? '' : field(card, 'op').trim(),
    operand: field(card, 'operand'),
  };
}
