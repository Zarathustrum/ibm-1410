// Tier 0 — the condensed-card format, C28-0309-1 Figure 2 p.7 (research/software.md §8.1).
//
// The oracle of plan §11 wave 5, in its own words: "`decodeObjectRecord(encodeObjectRecord(r)) ===
// r` over generated records including word marks, doubled payload separators, count boundaries, and
// the three named rejections".
//
// Nothing here touches the machine. The SAME records go through the real 1402 and the real load
// mode in `test/loader.test.ts`, which is what makes this file a round trip rather than a tautology:
// this file proves the encoder and decoder are inverses, that file proves the encoder agrees with
// the hardware (src/core/channel.ts) it is the inverse of.

import { describe, it, expect } from 'vitest';

import { BLANK, bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { WORD_SEPARATOR } from '../src/core/channel.js';
import { GROUP_MARK_BCD } from '../src/core/move.js';
import { BCD6, CARD_COLUMNS, WM, type Card } from '../src/core/types.js';
import {
  ADDRESS_COLUMNS, COUNT_COLUMNS, IDENT_COLUMNS, PAYLOAD_COLUMNS, PAYLOAD_FIELD_COLUMNS,
  RELOCATION_INDICATOR_COLUMNS, SEQUENCE_COLUMNS, SEPARATOR_COLUMN_1, SEPARATOR_COLUMN_7,
  WS_PAIR_COUNTS_AS_ONE, ZEROS_COLUMNS,
  decodeObjectRecord, encodeObjectRecord, type ObjectRecord,
} from '../src/formats/objectdeck.js';
import { makeCard } from '../src/formats/card.js';

const code = (glyph: string): number => {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`"${glyph}" is not one of the 64`);
  return c;
};

/** Cells from a glyph string; `^` before a glyph marks it (the UI's convention, not the deck's). */
function cells(text: string): Uint8Array {
  const out: number[] = [];
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '^') {
      i += 1;
      out.push(WM | code(chars[i] ?? ''));
    } else {
      out.push(code(chars[i] ?? ''));
    }
  }
  return Uint8Array.from(out);
}

const columnGlyphs = (card: Card, from: number, to: number): string => {
  let s = '';
  for (let col = from; col <= to; col++) s += glyphOf((card[col - 1] ?? BLANK) & BCD6);
  return s;
};

/** Columns 73-80 as the CARD can hold them: trailing blanks are unpunched columns, and an
 *  all-blank field is no field (objectdeck.ts `trimTrailingBlanks`). */
const trimmed = (text: string | undefined): string | undefined => {
  const t = text?.replace(/ +$/, '');
  return t === '' ? undefined : t;
};

/** The round trip, stated once. Both halves are asserted so a failure names which one moved.
 *  The identity is over the TRIMMED domain for 73-80 — both ends normalize, because the medium
 *  cannot tell `AB` from `AB   `. */
function roundTrips(r: ObjectRecord): void {
  const back = decodeObjectRecord(encodeObjectRecord(r));
  expect(back.loadAddress).toBe(r.loadAddress);
  expect([...back.payload]).toEqual([...r.payload]);
  expect(back.sequence).toBe(trimmed(r.sequence));
  expect(back.ident).toBe(trimmed(r.ident));
}

describe('the condensed card lays out exactly as Figure 2 prints it', () => {
  const r: ObjectRecord = {
    loadAddress: 500,
    payload: cells('^L%1000100$'),
    sequence: '001',
    ident: 'HELLO',
  };
  const card = encodeObjectRecord(r);

  it('columns 1 and 7 are word separators; 2-6 the load address; 8-10 zeros; 11-12 the count', () => {
    expect(card[SEPARATOR_COLUMN_1 - 1]).toBe(WORD_SEPARATOR);
    expect(columnGlyphs(card, ADDRESS_COLUMNS[0], ADDRESS_COLUMNS[1])).toBe('00500');
    expect(card[SEPARATOR_COLUMN_7 - 1]).toBe(WORD_SEPARATOR);
    expect(columnGlyphs(card, ZEROS_COLUMNS[0], ZEROS_COLUMNS[1])).toBe('000');
    // Ten characters, one of them marked — the mark is punctuation, not a character (§8.1 NOTE).
    expect(columnGlyphs(card, COUNT_COLUMNS[0], COUNT_COLUMNS[1])).toBe('10');
    expect(r.payload).toHaveLength(10);
  });

  it('the mark travels as a separator in the column PRECEDING its character', () => {
    // software.md §8.1 NOTE, verbatim: "to enter a word mark into storage during loading, punch a
    // word separator character in the column preceding the character with which the word mark is
    // to be associated."
    expect(columnGlyphs(card, PAYLOAD_COLUMNS[0], PAYLOAD_COLUMNS[0] + 10)).toBe('⌒L%1000100$');
  });

  it('cols 8-12 are ONE five-digit field in core, which is why cols 8-10 are zeros', () => {
    // The loader reads `000nn` as a five-digit number: column 7's separator word-marks WORK+5, and
    // cols 8-12 land at WORK+5..9. That is the whole reason Figure 2 spends three columns on zeros.
    expect(columnGlyphs(card, ZEROS_COLUMNS[0], COUNT_COLUMNS[1])).toBe('00010');
  });

  it('cols 73-80 carry the sequence and ident the Load Program ignores', () => {
    expect(columnGlyphs(card, SEQUENCE_COLUMNS[0], SEQUENCE_COLUMNS[1])).toBe('001');
    expect(columnGlyphs(card, IDENT_COLUMNS[0], IDENT_COLUMNS[1])).toBe('HELLO');
    expect(card).toHaveLength(CARD_COLUMNS);
  });

  it('cols 70-72 are Figure 2\'s relocation indicators, which THIS deck never carries', () => {
    // Figure 2 prints "Relocation indicators, if required (occupying cols 72, 71, 70)" inside
    // the payload's own range (software.md §8.1). They exist to be consumed by a RELOCATING
    // loader; the standalone absolute deck has none, so on our cards those columns are payload.
    expect(RELOCATION_INDICATOR_COLUMNS[1]).toBe(PAYLOAD_COLUMNS[1]);
    const full = encodeObjectRecord({
      loadAddress: 500,
      payload: Uint8Array.from(Array.from({ length: PAYLOAD_FIELD_COLUMNS }, () => code('A'))),
    });
    expect(columnGlyphs(full, RELOCATION_INDICATOR_COLUMNS[0], RELOCATION_INDICATOR_COLUMNS[1]))
      .toBe('AAA');
  });
});

describe('decodeObjectRecord(encodeObjectRecord(r)) === r', () => {
  it('over a payload with no word marks at all', () => {
    roundTrips({ loadAddress: 1000, payload: cells('ABCDE12345') });
  });

  it('over a payload where EVERY character carries a word mark', () => {
    roundTrips({ loadAddress: 0, payload: cells('^A^B^C^D^E') });
  });

  it('over the DOUBLED payload separator — a word separator stored as data', () => {
    // §8.1 NOTE: "to enter a word separator character into core storage, punch two adjacent columns
    // with it", and it is ONE character in the count (WS_PAIR_COUNTS_AS_ONE).
    expect(WS_PAIR_COUNTS_AS_ONE, 'the chosen fallback, pinned by name — the count below is 03, not 04')
      .toBe(true);
    const r: ObjectRecord = { loadAddress: 700, payload: cells('A⌒B') };
    const card = encodeObjectRecord(r);
    expect(columnGlyphs(card, PAYLOAD_COLUMNS[0], PAYLOAD_COLUMNS[0] + 3)).toBe('A⌒⌒B');
    expect(columnGlyphs(card, COUNT_COLUMNS[0], COUNT_COLUMNS[1])).toBe('03');
    roundTrips(r);
  });

  it('over a MARKED character immediately after a stored separator', () => {
    roundTrips({ loadAddress: 812, payload: cells('⌒^A⌒^B') });
  });

  it('over a payload holding a PLAIN group mark — legal, it is only the marked one that is not', () => {
    roundTrips({ loadAddress: 900, payload: Uint8Array.from([code('A'), GROUP_MARK_BCD, code('B')]) });
  });

  it('over every one of the 64 machine codes, marked and unmarked', () => {
    // Two records rather than one: 64 marked characters need 128 columns and the field holds 60.
    for (const marked of [false, true]) {
      for (let base = 0; base < 64; base += marked ? 25 : 50) {
        const payload: number[] = [];
        for (let bcd = base; bcd < Math.min(64, base + (marked ? 25 : 50)); bcd++) {
          // The two shapes the format forbids are proved by their own tests below.
          if (marked && (bcd === GROUP_MARK_BCD || bcd === WORD_SEPARATOR)) continue;
          payload.push(marked ? WM | bcd : bcd);
        }
        roundTrips({ loadAddress: 500, payload: Uint8Array.from(payload) });
      }
    }
  });

  it('at the COUNT BOUNDARIES: 1 character, 30 all-marked, 60 unmarked, and 0', () => {
    roundTrips({ loadAddress: 500, payload: cells('A') });
    roundTrips({ loadAddress: 500, payload: Uint8Array.from(Array.from({ length: 30 }, () => WM | code('A'))) });
    roundTrips({ loadAddress: 500, payload: Uint8Array.from(Array.from({ length: PAYLOAD_FIELD_COLUMNS }, () => code('A'))) });
    roundTrips({ loadAddress: 500, payload: new Uint8Array(0) });
  });

  it('carries the sequence and ident through unchanged, and omits them when blank', () => {
    roundTrips({ loadAddress: 500, payload: cells('A'), sequence: '007', ident: 'REENT' });
    const bare = decodeObjectRecord(encodeObjectRecord({ loadAddress: 500, payload: cells('A') }));
    expect(bare.sequence).toBeUndefined();
    expect(bare.ident).toBeUndefined();
  });

  it('over a TRAILING-BLANK ident and an EMPTY one — the trimmed domain, stated', () => {
    // A card cannot punch a trailing blank: `AB ` and `AB` are the same holes in 76-80. So the
    // decoder returns the trimmed text, the encoder normalizes to it, and the identity holds
    // over the normalized domain rather than approximately over every string.
    roundTrips({ loadAddress: 500, payload: cells('A'), ident: 'AB ', sequence: '1 ' });
    roundTrips({ loadAddress: 500, payload: cells('A'), ident: '', sequence: '' });

    const padded = encodeObjectRecord({ loadAddress: 500, payload: cells('A'), ident: 'AB ' });
    expect(columnGlyphs(padded, IDENT_COLUMNS[0], IDENT_COLUMNS[1])).toBe('AB   ');
    expect(padded)
      .toEqual(encodeObjectRecord({ loadAddress: 500, payload: cells('A'), ident: 'AB' }));
    expect(decodeObjectRecord(padded).ident).toBe('AB');
    const empty = encodeObjectRecord({ loadAddress: 500, payload: cells('A'), ident: '' });
    expect(decodeObjectRecord(empty).ident).toBeUndefined();
    // And the trim is what lets a five-character ident with a blank tail through at all: it is
    // five columns of field, and `'ABCDE '` is five characters plus an unpunchable blank.
    expect(() => encodeObjectRecord({ loadAddress: 500, payload: cells('A'), ident: 'ABCDE ' }))
      .not.toThrow();
  });
});

// ─── The three named rejections, plan §5 / §15 ─────────────────────────────────────────────

describe('rejection 1 — payload and separators past column 72', () => {
  it('rejects a payload needing a 61st column of the 60-column load field', () => {
    // C20-1602-8: "THIS PROGRAM LOADS UP TO 60 CHARACTERS CONTAINED ON A LOAD CARD" — sixty is the
    // width of columns 13-72 (software.md §9).
    const payload = Uint8Array.from(Array.from({ length: PAYLOAD_FIELD_COLUMNS + 1 }, () => code('A')));
    expect(() => encodeObjectRecord({ loadAddress: 500, payload }))
      .toThrow(/61 columns; the load field is columns 13-72/);
  });

  it('rejects 31 marked characters, which need 62 columns', () => {
    const payload = Uint8Array.from(Array.from({ length: 31 }, () => WM | code('A')));
    expect(() => encodeObjectRecord({ loadAddress: 500, payload })).toThrow(/62 columns/);
  });

  it('the DECODER refuses a count that outruns column 72', () => {
    const card = encodeObjectRecord({
      loadAddress: 500,
      payload: Uint8Array.from(Array.from({ length: PAYLOAD_FIELD_COLUMNS }, () => code('A'))),
    });
    const overstated = makeCard(card);
    overstated[COUNT_COLUMNS[1] - 1] = code('1');        // 60 characters punched, 61 claimed
    expect(() => decodeObjectRecord(overstated)).toThrow(/ran out at column 72 after 60/);
  });
});

describe('rejection 2 — a word-marked GROUP MARK in the payload', () => {
  // io.md §3 [likely]: "a load-mode read CAN create a GMWM … the next cycle senses it and terminates
  // the transfer early with WLR on". open-questions.md's io row offers two options and the format
  // takes the second, "forbid the pattern in the deck format" (OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK).
  it('the ENCODER refuses it', () => {
    const payload = Uint8Array.from([code('A'), WM | GROUP_MARK_BCD, code('B')]);
    expect(() => encodeObjectRecord({ loadAddress: 500, payload }))
      .toThrow(/OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK/);
  });

  it('the DECODER refuses a separator punched immediately ahead of a group mark', () => {
    const card = encodeObjectRecord({ loadAddress: 500, payload: cells('A^BC') });
    const forged = makeCard(card);
    forged[PAYLOAD_COLUMNS[0] + 1] = GROUP_MARK_BCD;     // the ⌒ at col 14 now precedes ⧧ at col 15
    expect(() => decodeObjectRecord(forged)).toThrow(/OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK/);
  });

  it('a word separator with a word mark is refused by C28-0309-1 Figure 2\'s NOTE, verbatim', () => {
    // "Word separator characters cannot be loaded with an associated word mark" — and the hardware
    // agrees: load mode reads a pair as ONE separator and sets NO mark (io.md §3).
    expect(() => encodeObjectRecord({ loadAddress: 500, payload: Uint8Array.from([WM | WORD_SEPARATOR]) }))
      .toThrow(/cannot be loaded with an associated word mark/);
  });
});

describe('rejection 3 — a word separator in column 72 with its character in 73', () => {
  it('the ENCODER refuses the record whose last mark would straddle the field boundary', () => {
    // 59 plain characters fill columns 13-71; a 60th MARKED character wants its separator at 72 and
    // its character at 73, which is the sequence field. TRAILING_SEPARATOR_IS_A_DECK_ERROR.
    const payload = Uint8Array.from([
      ...Array.from({ length: PAYLOAD_FIELD_COLUMNS - 1 }, () => code('A')),
      WM | code('B'),
    ]);
    expect(() => encodeObjectRecord({ loadAddress: 500, payload }))
      .toThrow(/TRAILING_SEPARATOR_IS_A_DECK_ERROR/);
  });

  it('the DECODER refuses a card that arrives with one', () => {
    const payload = Uint8Array.from(Array.from({ length: PAYLOAD_FIELD_COLUMNS }, () => code('A')));
    const forged = makeCard(encodeObjectRecord({ loadAddress: 500, payload }));
    forged[PAYLOAD_COLUMNS[1] - 1] = WORD_SEPARATOR;     // column 72 is now a separator
    expect(() => decodeObjectRecord(forged)).toThrow(/TRAILING_SEPARATOR_IS_A_DECK_ERROR/);
  });
});

describe('the header is checked, because the loader cannot check it', () => {
  const good = encodeObjectRecord({ loadAddress: 500, payload: cells('^AB') });

  it('column 1 must be a word separator', () => {
    const bad = makeCard(good);
    bad[0] = code('0');
    expect(() => decodeObjectRecord(bad)).toThrow(/column 1 is not a word separator/);
  });

  it('column 7 must be a word separator — a mispunch there would shift the count field', () => {
    const bad = makeCard(good);
    bad[6] = code('0');
    expect(() => decodeObjectRecord(bad)).toThrow(/column 7 is not a word separator/);
  });

  it('columns 8-10 must be 000', () => {
    const bad = makeCard(good);
    bad[7] = code('1');
    expect(() => decodeObjectRecord(bad)).toThrow(/hold 100, not 000/);
  });

  it('the load address must be five digits', () => {
    const bad = makeCard(good);
    bad[3] = code('A');
    expect(() => decodeObjectRecord(bad)).toThrow(/load address: column 4 holds "A", not a digit/);
  });

  it('an address that will not fit in five digits, or a count that will not fit in two', () => {
    expect(() => encodeObjectRecord({ loadAddress: 100_000, payload: cells('A') }))
      .toThrow(/load address 100000 does not fit in 5 digits/);
    // 100 characters cannot be punched anyway (rejection 1 catches 61) — this is the count field's
    // own bound, asserted so a future 132-column medium cannot quietly overrun it.
    expect(() => encodeObjectRecord({ loadAddress: 0, payload: new Uint8Array(100) }))
      .toThrow(/count 100 does not fit in 2 digits/);
  });

  it('a sequence or ident too long for its field, or outside the 64 characters', () => {
    expect(() => encodeObjectRecord({ loadAddress: 0, payload: cells('A'), sequence: '0012' }))
      .toThrow(/longer than columns 73-75/);
    expect(() => encodeObjectRecord({ loadAddress: 0, payload: cells('A'), ident: 'AB^CD' }))
      .toThrow(/"\^" is not one of the 64 machine glyphs/);
  });
});
