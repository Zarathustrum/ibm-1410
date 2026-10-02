// src/formats/objectdeck.ts — the STANDALONE CONDENSED CARD (absolute), C28-0309-1 Figure 2 p.7.
// Sources: research/software.md §8.1 (the column table and its verbatim NOTE), §9 (the 60-character
// bound, C20-1602-8 program 1410-UT-106); research/io.md §3 (load-mode word-separator processing,
// 223-2692 pp.8, 11, 58-59; A22-0526-3 p.41); docs/plans/phase-2-unit-record.md §2, §5, §8.3, §15.
//
// NOT in src/core/types.ts, and that is the rule of plan §2 applied: a boundary type lives in
// `types.ts` only if something inside `src/core` names it. Nothing does. An object deck becomes
// `Card`s before it reaches a device, and the program that consumes those cards is a 1410 program
// (src/formats/loader.ts), not TypeScript.
//
// THE ONE FACT THE WHOLE FILE TURNS ON (research/io.md §3, 223-2692 p.58 verbatim): "if the op code
// character is an L, specifying load mode, a single word separator character on the channel input
// lines is converted into a word mark and placed over the next input character. Two successive word
// separator characters from the reader buffer appear as a single word separator character in the
// 1411 core storage." So a card carries no word-mark bit (charset.md §7); marks travel as 0-5-8
// punches, and the machine's own read hardware is the decoder. `encodeObjectRecord` is the exact
// inverse of that hardware, which is why `test/objectdeck.test.ts` can round-trip against it and
// `test/loader.test.ts` can then check the same records through the REAL reader.

import { BLANK, bcdOfGlyph, glyphOf } from '../core/bcd.js';
import { WORD_SEPARATOR } from '../core/channel.js';
import { GROUP_MARK_BCD } from '../core/move.js';
import { BCD6, CARD_COLUMNS, WM, type Addr, type Card, type Cell } from '../core/types.js';
import { makeCard } from './card.js';

// `WORD_SEPARATOR` (0o35, punched 0-5-8) and `GROUP_MARK_BCD` (0o77) are imported, not restated:
// `channel.ts` is the module whose load-mode read this encoder is the inverse of, and `move.ts` is
// where the `Δ` terminator the loader uses is decided. A second copy of either would be a second
// thing to drift.

// ─── Figure 2's column map, C28-0309-1 p.7. One-based, as the figure prints them. ──────────
/** Column 1: word separator. Load mode eats it and marks column 2 — hence `loadAddress` at WORK+0. */
export const SEPARATOR_COLUMN_1 = 1;
/** Columns 2-6: `xxxxx`, the high-order position of the area the data is to be loaded into. */
export const ADDRESS_COLUMNS = [2, 6] as const;
/** Column 7: word separator. Its mark is what makes 8-12 a five-digit field with a word mark. */
export const SEPARATOR_COLUMN_7 = 7;
/**
 * Columns 8-10: `0 0 0`. Figure 2 prints them as literal zeros and never says why; the loader
 * says why. Read in load mode they land at WORK+5..7 immediately ahead of the count at WORK+8..9,
 * and column 7's separator word-marks WORK+5 — so cols 8-12 arrive in core as ONE five-digit
 * word-marked field holding `000nn`. That is a five-digit address-shaped number the loader can add,
 * index or move as a unit, and it is the only reason a two-digit count needs three leading zeros.
 */
export const ZEROS_COLUMNS = [8, 10] as const;
/** Columns 11-12: `xx`, the count of characters to load. Word separators are NOT counted. */
export const COUNT_COLUMNS = [11, 12] as const;
/** Columns 13-72: instructions and/or data, beginning in column 13. */
export const PAYLOAD_COLUMNS = [13, 72] as const;
/**
 * Columns 70-72, Figure 2's own row, verbatim: "Relocation indicators, if required (occupying
 * cols 72, 71, 70)" (software.md §8.1). It OVERLAPS the payload's tail, and this deck never
 * carries them: relocation indicators exist to be consumed by a RELOCATING loader (software.md
 * §8.1's correction note, `[verified]`) and ours is the standalone ABSOLUTE deck
 * (`architecture.md` §5 step 2), so `encodeObjectRecord` fills 13-72 with payload and stops.
 */
export const RELOCATION_INDICATOR_COLUMNS = [70, 72] as const;
/** Columns 73-75 / 76-80: "ignored by the Load Program"; Autocoder puts sequence and ident here. */
export const SEQUENCE_COLUMNS = [73, 75] as const;
export const IDENT_COLUMNS = [76, 80] as const;

/**
 * Sixty columns, 13 through 72 — C20-1602-8's own description of the standard load program:
 * "THIS PROGRAM LOADS UP TO 60 CHARACTERS CONTAINED ON A LOAD CARD INTO SEQUENTIAL CORE STORAGE
 * LOCATIONS" (research/software.md §9). The QUOTE is `[verified]`; what follows is OUR READING
 * of it and is `[likely]`: sixty is a COLUMN count, not a character count, because a marked
 * character costs two columns and a stored separator costs two, so a card whose payload is all
 * marked holds thirty characters. Figure 2 gives 13-72 as sixty columns and the count in 11-12
 * as two digits, so the sentence cannot be a bound on the count field — but no manual says
 * which of the two it means, and C20-1602-8 is a sales description, not a reference manual.
 */
export const PAYLOAD_FIELD_COLUMNS = PAYLOAD_COLUMNS[1] - PAYLOAD_COLUMNS[0] + 1;   // 60

/**
 * OPEN: `WS_PAIR_COUNTS_AS_ONE` — `[likely]`. C28-0319-4 p.65 NOTE 1 states it for the OS
 * relocatable loader ("two adjacent word separators load one word separator and add only 1 to the
 * count"); C28-0309-1's standalone NOTE states the doubling rule but never says what it does to the
 * count. We take 1, because 0 would leave the format unable to describe a payload containing a
 * separator at all — the count would then disagree with the number of core positions written and
 * every loader that trusts it would run short. `open-questions.md`, Phase 2 / Wave 5.
 */
export const WS_PAIR_COUNTS_AS_ONE = true;

/**
 * OPEN: `OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK` — `[likely]`. The MECHANISM is documented and the
 * CASE is not: research/io.md §3, "a load-mode read CAN create a GMWM … if the card image holds a
 * word separator immediately followed by a group-mark character (BCD 77), load mode assembles and
 * stores a genuine GMWM; the next cycle senses it and terminates the transfer early with WLR on".
 * The research row offers exactly two options — model the early truncation, or "forbid the pattern
 * in the deck format" — and this is the second. Rejecting at ENCODE is what makes the loader's
 * `D … Δ` move safe: its terminator IS an A-field group-mark-with-word-mark, so a payload carrying
 * one would truncate the move as well as the read. The alternative stays available and costs
 * nothing to reach: `channel.read()` already models the early termination for a card that arrives
 * from outside this encoder. `open-questions.md`, Phase 2 / Wave 5.
 */
export const OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK = true;

/**
 * OPEN: `TRAILING_SEPARATOR_IS_A_DECK_ERROR` — `[unverified]`. "A word separator in the last column
 * of the load field with nothing following it" is described by no manual: the separator is not
 * stored, so there is no character for its word mark to land on. The encoder can never emit one
 * (it writes the separator and its character in the same step, or rejects the record), and the
 * decoder rejects one. If such a card arrived from outside, the channel would drop the pending mark
 * without storing, which is what SimH does — but our format guarantees it cannot.
 * `open-questions.md`, Phase 2 / Wave 5.
 */
export const TRAILING_SEPARATOR_IS_A_DECK_ERROR = true;

/**
 * One condensed card's worth of program. `payload` is CELL BYTES — `WM | bcd6` — and never a C bit:
 * the deck has no parity, because a condensed card is loaded by a load-mode read, which "replaces
 * the whole target byte including the word-mark bit" and recomputes parity (research/io.md §3,
 * 223-2692 p.11 Case 2 — which is `storage.writeWhole`). `payload.length` IS the count in columns
 * 11-12; separators are punctuation, not characters (software.md §8.1 NOTE).
 *
 * `ident` and `sequence` are kept here, unlike on `Card` (plan §2 deviation 1), because here the
 * writer needs them as INPUTS: Autocoder punches the card sequence number in 73-75 and the program
 * identification in 76-80, and neither is derivable from the payload. Both are STORED TRIMMED of
 * trailing blanks — see `trimTrailingBlanks` — so `'AB '` round-trips to `'AB'` and `''` comes
 * back absent.
 */
export interface ObjectRecord {
  readonly loadAddress: Addr;
  readonly payload: Uint8Array;
  readonly sequence?: string;
  readonly ident?: string;
}

/** A whole object program: its records in deck order, and the execute card's entry point. */
export interface ObjectDeck {
  readonly records: readonly ObjectRecord[];
  /** The execute card's entry point. Column 1 = `E`, instruction from column 2 (emulators.md §7). */
  readonly entry?: Addr;
}

/** Every rejection this module raises, so a test can name the one it means. */
export class ObjectDeckError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = 'ObjectDeckError';
  }
}

const DIGITS = '0123456789';

function digitsOf(value: number, width: number, what: string): number[] {
  if (!Number.isInteger(value) || value < 0 || value >= 10 ** width) {
    throw new ObjectDeckError(`${what} ${value} does not fit in ${width} digits`);
  }
  const text = String(value).padStart(width, '0');
  return [...text].map((ch) => bcdOfGlyph(ch) as number);
}

function readDigits(card: Card, from: number, to: number, what: string): number {
  let value = 0;
  for (let col = from; col <= to; col++) {
    const glyph = glyphOf((card[col - 1] ?? BLANK) & BCD6);
    const digit = DIGITS.indexOf(glyph);
    if (digit < 0) throw new ObjectDeckError(`${what}: column ${col} holds "${glyph}", not a digit`);
    value = value * 10 + digit;
  }
  return value;
}

/**
 * Columns 73-80 are STORED TRIMMED, and the CARD is why: an unpunched column and a punched
 * blank are the same absence of holes, so nothing on the medium distinguishes `AB` from
 * `AB   `. Both ends normalize the same way — the encoder trims before punching, the decoder
 * trims what it reads and omits an all-blank field — so `decode(encode(r))` is exact over the
 * trimmed domain rather than approximately exact over all strings. `test/objectdeck.test.ts`
 * pins `'AB '` and `''`.
 */
const trimTrailingBlanks = (text: string): string => text.replace(/ +$/, '');

function fieldText(card: Card, from: number, to: number): string {
  let text = '';
  for (let col = from; col <= to; col++) text += glyphOf((card[col - 1] ?? BLANK) & BCD6);
  return trimTrailingBlanks(text);
}

function codesOf(text: string, from: number, to: number, what: string): number[] {
  const width = to - from + 1;
  const chars = [...text];
  if (chars.length > width) {
    throw new ObjectDeckError(`${what} "${text}" is longer than columns ${from}-${to}`);
  }
  return chars.map((ch) => {
    const code = bcdOfGlyph(ch);
    if (code === undefined) throw new ObjectDeckError(`${what}: "${ch}" is not one of the 64 machine glyphs`);
    return code;
  });
}

/**
 * `ObjectRecord` → an 80-column card, punched exactly as Figure 2 prints it, and exactly as the
 * 1410's own load-mode read will take it apart again.
 *
 * The payload loop IS the inverse of research/io.md §3's input table, one row at a time:
 *  · an ordinary cell            → its own column;
 *  · a cell carrying a word mark → a word separator, then the character (software.md §8.1 NOTE:
 *    "punch a word separator character in the column preceding the character with which the word
 *    mark is to be associated");
 *  · a cell that IS a word separator → two adjacent separators ("to enter a word separator
 *    character into core storage, punch two adjacent columns with it") and it may not be marked —
 *    C28-0309-1 Figure 2's NOTE, verbatim: "Word separator characters cannot be loaded with an
 *    associated word mark." (That is the STANDALONE deck's note; C28-0319-4 p.65's "NOTE 1",
 *    quoted at `WS_PAIR_COUNTS_AS_ONE` above, is the OS relocatable loader's and is a different
 *    note in a different manual.)
 *
 * Three rejections, each named after the shape it refuses, each with its research row: the field
 * bound (60 columns), the word-marked group mark (`OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK`) and the
 * trailing separator (`TRAILING_SEPARATOR_IS_A_DECK_ERROR`).
 */
export function encodeObjectRecord(r: ObjectRecord): Card {
  const codes = new Array<number>(CARD_COLUMNS).fill(BLANK);
  const put = (col: number, code: number): void => { codes[col - 1] = code; };

  put(SEPARATOR_COLUMN_1, WORD_SEPARATOR);
  digitsOf(r.loadAddress, 5, 'load address').forEach((c, i) => put(ADDRESS_COLUMNS[0] + i, c));
  put(SEPARATOR_COLUMN_7, WORD_SEPARATOR);
  for (let col = ZEROS_COLUMNS[0]; col <= ZEROS_COLUMNS[1]; col++) put(col, bcdOfGlyph('0') as number);
  digitsOf(r.payload.length, 2, 'count').forEach((c, i) => put(COUNT_COLUMNS[0] + i, c));

  // The payload field, column by column. `field` is what columns 13-72 will hold.
  const field: number[] = [];
  for (const cell of r.payload) {
    const bcd = cell & BCD6;
    const marked = (cell & WM) !== 0;
    if (bcd === WORD_SEPARATOR) {
      if (marked) {
        throw new ObjectDeckError(
          'word separator with a word mark: C28-0309-1 Figure 2 NOTE (software.md §8.1), '
          + 'verbatim — "Word separator '
          + 'characters cannot be loaded with an associated word mark"',
        );
      }
      field.push(WORD_SEPARATOR, WORD_SEPARATOR);   // WS_PAIR_COUNTS_AS_ONE
      continue;
    }
    if (marked && bcd === GROUP_MARK_BCD) {
      throw new ObjectDeckError(
        'word-marked group mark in the payload: a load-mode read would assemble a live '
        + 'group-mark-with-word-mark in core and terminate the record early with a spurious WLR '
        + '(io.md §3) — OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK',
      );
    }
    if (marked) field.push(WORD_SEPARATOR);
    field.push(bcd);
  }

  if (field.length > PAYLOAD_FIELD_COLUMNS) {
    // Which of the two boundary rejections is this? The trailing-separator case is the one where
    // the LAST column of the field holds a separator whose character was pushed past it.
    if (field[PAYLOAD_FIELD_COLUMNS - 1] === WORD_SEPARATOR) {
      throw new ObjectDeckError(
        `word separator in column ${PAYLOAD_COLUMNS[1]} with its character in `
        + `${PAYLOAD_COLUMNS[1] + 1}: nothing follows it inside the load field — `
        + 'TRAILING_SEPARATOR_IS_A_DECK_ERROR',
      );
    }
    throw new ObjectDeckError(
      `payload and separators need ${field.length} columns; the load field is columns `
      + `${PAYLOAD_COLUMNS[0]}-${PAYLOAD_COLUMNS[1]}, ${PAYLOAD_FIELD_COLUMNS} columns `
      + '(C20-1602-8, "up to 60 characters contained on a load card")',
    );
  }
  field.forEach((code, i) => put(PAYLOAD_COLUMNS[0] + i, code));

  // Trimmed on the way in as well as on the way out: the card cannot record a trailing blank,
  // so normalizing here is what makes the round trip an identity (`trimTrailingBlanks`).
  if (r.sequence !== undefined) {
    codesOf(trimTrailingBlanks(r.sequence), SEQUENCE_COLUMNS[0], SEQUENCE_COLUMNS[1], 'sequence')
      .forEach((c, i) => put(SEQUENCE_COLUMNS[0] + i, c));
  }
  if (r.ident !== undefined) {
    codesOf(trimTrailingBlanks(r.ident), IDENT_COLUMNS[0], IDENT_COLUMNS[1], 'ident')
      .forEach((c, i) => put(IDENT_COLUMNS[0] + i, c));
  }
  return makeCard(codes);
}

/**
 * An 80-column card → the `ObjectRecord` it carries. This is a READER, not a machine: it walks the
 * load field the way the 1414's load-mode path walks it (io.md §3 steps 3 and 4) and stops when it
 * has the number of characters columns 11-12 promised.
 *
 * The header is checked because the loader cannot check it: `L %10 WORK $` stores whatever is on
 * the card, so a card with a mispunched column 7 would silently shift the count field and load the
 * wrong length. Rejections carry the column that failed.
 */
export function decodeObjectRecord(card: Card): ObjectRecord {
  const at = (col: number): number => (card[col - 1] ?? BLANK) & BCD6;

  if (at(SEPARATOR_COLUMN_1) !== WORD_SEPARATOR) {
    throw new ObjectDeckError(`column ${SEPARATOR_COLUMN_1} is not a word separator (0-5-8)`);
  }
  if (at(SEPARATOR_COLUMN_7) !== WORD_SEPARATOR) {
    throw new ObjectDeckError(`column ${SEPARATOR_COLUMN_7} is not a word separator (0-5-8)`);
  }
  const loadAddress = readDigits(card, ADDRESS_COLUMNS[0], ADDRESS_COLUMNS[1], 'load address');
  const zeros = readDigits(card, ZEROS_COLUMNS[0], ZEROS_COLUMNS[1], 'zeros field');
  if (zeros !== 0) {
    throw new ObjectDeckError(
      `columns ${ZEROS_COLUMNS[0]}-${ZEROS_COLUMNS[1]} hold ${String(zeros).padStart(3, '0')}, not 000`,
    );
  }
  const count = readDigits(card, COUNT_COLUMNS[0], COUNT_COLUMNS[1], 'count');

  const payload = new Uint8Array(count);
  let col: number = PAYLOAD_COLUMNS[0];
  for (let i = 0; i < count; i++) {
    if (col > PAYLOAD_COLUMNS[1]) {
      throw new ObjectDeckError(
        `the count says ${count} characters, but the load field ran out at column `
        + `${PAYLOAD_COLUMNS[1]} after ${i} (C20-1602-8, "up to 60 characters")`,
      );
    }
    const here = at(col);
    if (here !== WORD_SEPARATOR) {                      // an ordinary character
      payload[i] = here;
      col += 1;
      continue;
    }
    if (col === PAYLOAD_COLUMNS[1]) {                       // a separator with nothing after it
      throw new ObjectDeckError(
        `word separator in column ${PAYLOAD_COLUMNS[1]} with nothing following inside the load `
        + 'field — TRAILING_SEPARATOR_IS_A_DECK_ERROR',
      );
    }
    const next = at(col + 1);
    if (next === WORD_SEPARATOR) {                      // a doubled pair = one stored separator
      payload[i] = WORD_SEPARATOR;                      // WS_PAIR_COUNTS_AS_ONE: it counts as 1
      col += 2;
      continue;
    }
    if (next === GROUP_MARK_BCD) {
      throw new ObjectDeckError(
        `word separator in column ${col} ahead of the group mark in column ${col + 1}: a load-mode `
        + 'read would assemble a live group-mark-with-word-mark (io.md §3) — '
        + 'OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK',
      );
    }
    payload[i] = (WM | next) as Cell;                       // the mark lands on the NEXT character
    col += 2;
  }

  const sequence = fieldText(card, SEQUENCE_COLUMNS[0], SEQUENCE_COLUMNS[1]);
  const ident = fieldText(card, IDENT_COLUMNS[0], IDENT_COLUMNS[1]);
  return {
    loadAddress,
    payload,
    ...(sequence === '' ? {} : { sequence }),
    ...(ident === '' ? {} : { ident }),
  };
}
