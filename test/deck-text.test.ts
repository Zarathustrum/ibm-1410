import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLANK, bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { CARD_COLUMNS, type Card } from '../src/core/types.js';
import { formatDeck, makeCard, parseDeck } from '../src/formats/card.js';

const GM = 0o77;   // group mark, 12-7-8 (research/charset.md §2)
const WS = 0o35;   // word separator, 0-5-8 (research/charset.md §7)

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function codesOf(glyphs: string): number[] {
  return [...glyphs].map((g) => {
    const c = bcdOfGlyph(g);
    expect(c, `glyph "${g}" is not one of the 64`).toBeDefined();
    return c ?? -1;
  });
}

function textOf(card: Card | undefined, from: number, to: number): string {
  let s = '';
  for (let col = from; col <= to; col++) s += glyphOf(card?.[col - 1] ?? -1);
  return s;
}

describe('parseDeck / formatDeck round trip (plan §9 — stated on the CARD)', () => {
  it('survives a deck holding every one of the 64 codes, trailing blanks and an all-blank card', () => {
    const all: number[] = [];
    for (let c = 0; c < 64; c++) all.push(c);
    const deck = [
      makeCard(all.slice(0, 32)),
      makeCard(all.slice(32)),
      makeCard([...codesOf('HELLO'), BLANK, BLANK, ...codesOf('DAD')]),  // interior blanks
      makeCard(codesOf('TRAILING BLANKS')),                              // trailing blanks
      makeCard(new Array<number>(CARD_COLUMNS).fill(0o61)),              // a full 80 columns
      makeCard(),                                                        // all blank
    ];
    const back = parseDeck(formatDeck(deck));
    expect(back.errors).toEqual([]);
    expect(back.deck).toHaveLength(deck.length);
    deck.forEach((card, i) => {
      for (let col = 0; col < CARD_COLUMNS; col++) {
        expect(back.deck[i]?.[col], `card ${i + 1} column ${col + 1}`).toBe(card[col]);
      }
    });
  });

  it('emits an all-blank card as `{}` so it is not skipped as a whitespace-only line', () => {
    expect(formatDeck([makeCard()])).toBe('{}\n');
    expect(parseDeck('{}\n').deck).toHaveLength(1);
  });

  it('emits the glyph where a person can type one and a punch list where they cannot', () => {
    // ⌒ (word separator) and ⧧ (group mark) are in the 64 but on no keyboard — plan §9.
    expect(formatDeck([makeCard([...codesOf('F1'), WS, GM])])).toBe('F1{0-5-8}{12-7-8}\n');
  });
});

describe('the two spellings of plan §9\'s example', () => {
  it('parse to the same 80 codes', () => {
    const punched = '00018{12-7-8}{0-5-8}L%1000100${0-5-8}R000668{0-5-8}R00042{12-7-8}';
    const glyphed = '00018⧧⌒L%1000100$⌒R000668⌒R00042⧧';
    const a = parseDeck(punched);
    const b = parseDeck(glyphed);
    expect(a.errors).toEqual([]);
    expect(b.errors).toEqual([]);
    expect([...(a.deck[0] ?? [])]).toEqual([...(b.deck[0] ?? [])]);
    expect(textOf(a.deck[0], 1, 6)).toBe('00018⧧');
  });
});

describe('DeckErrors are data, name their line and column, and parse as blank', () => {
  it('reports a glyph outside the 64', () => {
    const { deck, errors } = parseDeck('AB^CD');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.line).toBe(1);
    expect(errors[0]?.column).toBe(3);          // `^` is no word-mark notation — plan §5
    expect(deck[0]?.[2]).toBe(BLANK);
    expect(textOf(deck[0], 1, 5)).toBe('AB CD'); // the rest of the card still renders
  });

  it('reports an unclosed "{"', () => {
    const { deck, errors } = parseDeck('AB{12-7');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ line: 1, column: 3 });
    expect(errors[0]?.message).toContain('unclosed');
    expect(deck[0]?.[2]).toBe(BLANK);
  });

  it('reports an unknown row name', () => {
    const { deck, errors } = parseDeck('A{13}');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ line: 1, column: 2 });
    expect(deck[0]?.[1]).toBe(BLANK);
  });

  it('reports a duplicate row', () => {
    const { errors } = parseDeck('{12-12}');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ line: 1, column: 1 });
  });

  it('reports a hole pattern that is not a card code', () => {
    const { errors } = parseDeck('{12-11}');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ line: 1, column: 1 });
  });

  it('reports a line longer than 80 columns at column 81, and still produces the card', () => {
    const { deck, errors } = parseDeck('A'.repeat(CARD_COLUMNS + 5));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ line: 1, column: CARD_COLUMNS + 1 });
    expect(deck).toHaveLength(1);
    expect(deck[0]).toHaveLength(CARD_COLUMNS);
    expect(textOf(deck[0], CARD_COLUMNS, CARD_COLUMNS)).toBe('A');
  });

  it('does not call a full 80-column line too long over a trailing space or CRLF', () => {
    const full = 'A'.repeat(CARD_COLUMNS);
    for (const text of [`${full} `, `${full}   `, `${full}\r\n`, `${full} \r\n`]) {
      const { deck, errors } = parseDeck(text);
      expect(errors, JSON.stringify(text)).toEqual([]);
      expect(deck).toHaveLength(1);
      expect(textOf(deck[0], CARD_COLUMNS, CARD_COLUMNS)).toBe('A');
    }
  });

  it('skips a whitespace-only line and counts lines, not cards, in an error', () => {
    const { deck, errors } = parseDeck('A\n   \nB^\nC');
    expect(deck).toHaveLength(3);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ line: 3, column: 2 });
  });

  it('short lines blank-pad to 80', () => {
    const { deck } = parseDeck('A');
    expect(deck[0]).toHaveLength(CARD_COLUMNS);
    expect([...(deck[0] ?? []).slice(1)].every((c) => c === BLANK)).toBe(true);
  });
});

// docs/plans/phase-2-unit-record.md §13, transcribed run for run. Each entry is the 1-based
// column its run starts at, so the expansion below proves the table tiles columns 1..80 with no
// gap and no overlap — which is §13's own "ten separators, seventy stored positions" check.
const CARD_1: readonly (readonly [number, string | number])[] = [
  [1, '00018'], [6, GM], [7, WS], [8, 'L%1000100$'], [18, WS], [19, 'R000668'], [26, WS],
  [27, 'R00042'], [33, GM], [34, WS], [35, 'M%2000100W'], [45, WS], [46, 'R00059'], [52, GM],
  [53, WS], [54, 'J00018'], [60, ' '], [61, WS], [62, 'F1'], [64, WS], [65, 'R00075'], [71, GM],
  [72, WS], [73, '.'], [74, WS], [75, 'HELLO1'],
];

describe('demos/hello-dad.cards (plan §13)', () => {
  const text = readFileSync(join(REPO_ROOT, 'demos/hello-dad.cards'), 'utf8');
  const { deck, errors } = parseDeck(text);

  it('parses to exactly 6 cards and zero errors', () => {
    expect(errors).toEqual([]);
    expect(deck).toHaveLength(6);
    for (const card of deck) expect(card).toHaveLength(CARD_COLUMNS);
  });

  it('punches card 1 column for column as §13\'s table prints it', () => {
    const expected: number[] = [];
    for (const [col, what] of CARD_1) {
      expect(expected.length + 1, `run starting at column ${col}`).toBe(col);
      if (typeof what === 'number') expected.push(what);
      else expected.push(...codesOf(what));
    }
    expect(expected).toHaveLength(CARD_COLUMNS);
    for (let col = 1; col <= CARD_COLUMNS; col++) {
      expect(deck[0]?.[col - 1], `column ${col}`).toBe(expected[col - 1]);
    }
  });

  it('puts §13\'s named fields at §13\'s named columns', () => {
    const card = deck[0];
    expect(textOf(card, 1, 5)).toBe('00018');        // I-address of the keyed R at 00011
    expect(card?.[5]).toBe(GM);                      // col 6: its d-character
    expect(card?.[6]).toBe(WS);                      // col 7: word mark on the next character
    expect(textOf(card, 8, 17)).toBe('L%1000100$');  // LOOP: read a data card into 00100
    expect(card?.[59]).toBe(BLANK);                  // col 60: the J's blank d, and it must be there
    expect(textOf(card, 62, 63)).toBe('F1');         // END: skip to channel 1 — eject the page
    expect(textOf(card, 73, 73)).toBe('.');          // halt
    expect(textOf(card, 75, 80)).toBe('HELLO1');     // deck identification, stored and harmless
  });

  it('carries ten word separators and seventy stored positions on card 1', () => {
    const seps = [...(deck[0] ?? [])].filter((c) => c === WS).length;
    expect(seps).toBe(10);
    expect(CARD_COLUMNS - seps).toBe(70);            // 00012 + 70 - 1 = 00081
  });

  // §13: each data card plants its own group-mark-with-word-mark at 00178 as load mode reads
  // the 0-5-8 in column 79 followed by the group mark in column 80 — which is what terminates
  // the print. Neither character may appear anywhere in the 78 columns of report text.
  it('ends every data card with a word separator then a group mark, and nowhere else', () => {
    for (let i = 1; i < deck.length; i++) {
      const card = deck[i];
      expect(card?.[78], `card ${i + 1} column 79`).toBe(WS);
      expect(card?.[79], `card ${i + 1} column 80`).toBe(GM);
      for (let col = 1; col <= 78; col++) {
        expect(card?.[col - 1], `card ${i + 1} column ${col}`).not.toBe(WS);
        expect(card?.[col - 1], `card ${i + 1} column ${col}`).not.toBe(GM);
      }
    }
  });

  // The 1403's A (A2) arrangement prints 48 graphics and NOTHING else — research/charset.md §5's
  // set table: `A-Z`, `0-9`, and the 12 specials `& . ⌑ - $ * / , % # @ ‡`. The set is recomputed
  // here rather than imported (no printer code exists yet, and importing it would test the
  // printer against itself). Without this check the first thing to notice an off-chain code in
  // the report text — a `[`, a `:`, a substitute blank — would be wave 3's byte-for-byte golden
  // printout, where the failure reads as a printer bug rather than as a bad deck.
  it('punches only A-chain-printable characters in columns 1-78 of the data cards (charset.md §5)', () => {
    const A_CHAIN = new Set<string>([
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      ...'0123456789',
      ...'&.⌑-$*/,%#@‡',
      ' ',                                       // the blank is not a graphic; it is no slug at all
    ]);
    expect(A_CHAIN.size).toBe(49);               // 48 graphics + the blank
    for (let i = 1; i < deck.length; i++) {
      for (let col = 1; col <= 78; col++) {
        const g = textOf(deck[i], col, col);
        expect(A_CHAIN.has(g), `card ${i + 1} column ${col}: "${g}" is not on the A chain`).toBe(true);
      }
    }
  });

  it('round-trips through formatDeck', () => {
    const back = parseDeck(formatDeck(deck));
    expect(back.errors).toEqual([]);
    back.deck.forEach((card, i) => expect([...card]).toEqual([...(deck[i] ?? [])]));
  });
});
