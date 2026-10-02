// src/formats/card.ts — the 80-column card: the Hollerith ↔ BCD bijection, and the deck text
// a person types. Sources: docs/plans/phase-2-unit-record.md §5, §9; research/charset.md §2,
// §2.1, §3, §7.
//
// The punch tables are DERIVED AT MODULE LOAD from the `hollerith` column already in
// src/core/bcd.ts ('12-7-8', '2-8', '0', 'none'). There is no second punch table anywhere in
// this project, and test/card.test.ts proves the derivation against charset.md §3's structural
// rule recomputed independently inside the test, so a transcription slip in either one fails.
//
// A mask is a RENDERING and an interchange form. The 1414 read buffer holds BCD (io.md §1) and
// the machine never sees a punch, which is why `Column` lives here and `Card` lives in
// src/core/types.ts (plan §2). src/formats may import src/core; src/core may never import
// src/formats (test/core-is-dom-free.test.ts).

import { BCD_TABLE, BLANK, bcdOfGlyph, glyphOf } from '../core/bcd.js';
import { BCD6, CARD_COLUMNS, type Card, type Deck } from '../core/types.js';

/** 12-bit mask: bit11 = row 12, bit10 = row 11, bit9 = row 0, bit8 = row 1 … bit0 = row 9. */
export type Column = number;

// Top to bottom as the card is punched — 12, 11, 0, then the nine digit rows. The bit order is
// that reading order, which is what lets a mask be drawn as a column of holes without a table.
const ROW_NAMES: readonly string[] = ['12', '11', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function rowBit(name: string): number {
  const i = ROW_NAMES.indexOf(name);
  return i < 0 ? 0 : 1 << (11 - i);
}

// Both directions, built once from bcd.ts. `hollerith` is 'none' for the blank (no holes at
// all), and 'none' is the only row name that is not a row: charset.md §2.
const MASK_OF_BCD = new Uint16Array(64);
const BCD_OF_MASK = new Map<Column, number>();
for (const e of BCD_TABLE) {
  let mask = 0;
  if (e.hollerith !== 'none') {
    for (const row of e.hollerith.split('-')) {
      const bit = rowBit(row);
      if (bit === 0) throw new RangeError(`bcd.ts hollerith "${e.hollerith}" names no card row "${row}"`);
      mask |= bit;
    }
  }
  MASK_OF_BCD[e.bcd] = mask;
  BCD_OF_MASK.set(mask, e.bcd);
}

/** The punches for a code. Blank (0o00) has none; the substitute blank (0o20) is 8-2 — §2.1. */
export function punchMask(bcd6: number): Column {
  const m = MASK_OF_BCD[bcd6 & BCD6];
  if (m === undefined) throw new RangeError(`no BCD entry for ${bcd6}`);
  return m;
}

/** Inverse of `punchMask`. `null` for a hole pattern the 1410 does not read — a validity check. */
export function bcdOfPunches(mask: Column): number | null {
  return BCD_OF_MASK.get(mask) ?? null;
}

/**
 * The ONLY Card constructor. Short input is blank-padded to CARD_COLUMNS with 0o00 — an
 * unpunched column reads as a blank, not as a substitute blank (bcd.ts's BLANK_TRAP).
 */
export function makeCard(codes?: ArrayLike<number>): Card {
  const card = new Uint8Array(CARD_COLUMNS);
  if (codes === undefined) return card;
  if (codes.length > CARD_COLUMNS) {
    throw new RangeError(`${codes.length} codes; a card has ${CARD_COLUMNS} columns`);
  }
  for (let i = 0; i < codes.length; i++) {
    const c = codes[i];
    if (c === undefined || !Number.isInteger(c) || c < 0 || c > BCD6) {
      throw new RangeError(`column ${i + 1}: ${String(c)} is not a 6-bit BCD code`);
    }
    card[i] = c;
  }
  return card;
}

export interface DeckError {
  readonly line: number;      // 1-based line in the pasted text
  readonly column: number;    // 1-based card column the token would have produced
  readonly message: string;
}

/**
 * One line = one card. A COLUMN TOKEN is one of:
 *   - any of the 64 machine glyphs (bcd.ts's `glyph` column) — one column;
 *   - `{12-7-8}` — a punch list naming rows 12, 11, 0..9 in any order;
 *   - `{}` — an unpunched column, for legibility.
 * `{` and `}` are NOT among the 64 characters, so a punch list can never collide with data.
 * Short lines are blank-padded to 80; a longer line is an error naming line and column 81; a
 * whitespace-only line is skipped (a genuinely blank card is `{}`).
 *
 * THERE IS NO WORD-MARK NOTATION IN A DECK, AND THAT IS THE POINT. A card carries no word mark
 * (charset.md §7); a mark travels as a `{0-5-8}` word separator that load mode converts on the
 * way in (io.md §3, software.md §8.1). A `^` here would let someone punch a card the 1402
 * cannot punch — so `^` is simply "not one of the 64", an error like any other.
 *
 * Errors are DATA, not throws: the paste box has to show WHERE, and a bad column parses as
 * blank so the whole deck still renders.
 *
 * The round-trip property is stated on the CARD, not the text:
 * `parseDeck(formatDeck(d)).deck` equals `d` cardwise and columnwise.
 */
export function parseDeck(text: string): { deck: Deck; errors: readonly DeckError[] } {
  const deck: Card[] = [];
  const errors: DeckError[] = [];
  const lines = text.split('\n');
  for (let li = 0; li < lines.length; li++) {
    // Trailing CR and trailing SPACES come off before anything is counted: a trailing blank is
    // not a punched column and formatDeck never emits one, so this is round-trip-safe, and a
    // legal 80-column card pasted with a stray space no longer reports a bogus column 81.
    const raw = (lines[li] ?? '').replace(/[ \r]+$/, '');
    if (raw.trim() === '') continue;
    const chars = [...raw];                 // by code point: eight of the 64 glyphs are not ASCII
    const codes: number[] = [];
    const line = li + 1;
    for (let i = 0; i < chars.length; i++) {
      if (codes.length === CARD_COLUMNS) {
        errors.push({ line, column: CARD_COLUMNS + 1, message: `line is longer than ${CARD_COLUMNS} columns` });
        break;
      }
      const column = codes.length + 1;
      const ch = chars[i] ?? '';
      if (ch !== '{') {
        const code = bcdOfGlyph(ch);
        if (code === undefined) {
          errors.push({ line, column, message: `"${ch}" is not one of the 64 machine glyphs` });
          codes.push(BLANK);
        } else {
          codes.push(code);
        }
        continue;
      }
      const end = chars.indexOf('}', i);
      if (end < 0) {
        errors.push({ line, column, message: 'unclosed "{"' });
        codes.push(BLANK);
        break;
      }
      const body = chars.slice(i + 1, end).join('');
      i = end;
      codes.push(parsePunchList(body, line, column, errors));
    }
    deck.push(makeCard(codes));
  }
  return { deck, errors };
}

// `{}` is a blank column. Anything else is a hyphen-separated row list; a bad one is reported
// and the column parses as blank so the rest of the deck still renders.
function parsePunchList(body: string, line: number, column: number, errors: DeckError[]): number {
  if (body === '') return BLANK;
  let mask = 0;
  for (const row of body.split('-')) {
    const bit = rowBit(row);
    if (bit === 0) {
      errors.push({ line, column, message: `"${row}" is not a card row (12, 11, 0..9)` });
      return BLANK;
    }
    if ((mask & bit) !== 0) {
      errors.push({ line, column, message: `row ${row} punched twice` });
      return BLANK;
    }
    mask |= bit;
  }
  const code = bcdOfPunches(mask);
  if (code === null) {
    errors.push({ line, column, message: `${body} is not a valid card code` });
    return BLANK;
  }
  return code;
}

/**
 * Canonical form: the glyph where a person can type one, `{…}` otherwise. Eight of the 64
 * glyphs are not on any keyboard (⌑ ⧧ Δ ⌒ ⧻ ƀ √ ‡) and go out as punch lists — which is the
 * form §9's example shows a person actually typing. Trailing blank columns are trimmed; an
 * all-blank card is emitted as `{}` so it survives the whitespace-only-line rule.
 */
export function formatDeck(deck: Deck): string {
  let out = '';
  for (const card of deck) {
    let last = -1;
    for (let i = 0; i < card.length; i++) if (card[i] !== BLANK) last = i;
    if (last < 0) { out += '{}\n'; continue; }
    let line = '';
    for (let i = 0; i <= last; i++) {
      const code = card[i] ?? BLANK;
      const glyph = glyphOf(code);
      const cp = glyph.codePointAt(0) ?? 0;
      line += cp < 0x80 ? glyph : `{${rowsOf(punchMask(code))}}`;
    }
    out += `${line}\n`;
  }
  return out;
}

// Rows in card order, 12 first — the order bcd.ts's own `hollerith` column is written in.
function rowsOf(mask: Column): string {
  const rows: string[] = [];
  for (let i = 0; i < ROW_NAMES.length; i++) {
    if ((mask & (1 << (11 - i))) !== 0) rows.push(ROW_NAMES[i] ?? '');
  }
  return rows.join('-');
}
