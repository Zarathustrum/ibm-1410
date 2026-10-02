// Tier 2 — the source card: `software.md` §1's column table, asserted FIELD BY FIELD on
// hand-built 80-character cards (docs/plans/phase-3-autocoder.md §5.1; wave 3).
//
// EVERY CARD BELOW IS BUILT COLUMN BY COLUMN by `punch()`, never by counting blanks in a string
// literal — §1's field widths are 2 + 3 + 10 + 5 + 52 + 3 + 5 and the test asserts that they add
// to 80 before it asserts anything else. A card written as one long literal would pass a wrong
// column table as readily as the right one.

import { describe, expect, it } from 'vitest';

import { cardFields, field, readSource } from '../src/asm/source.js';
import { SOURCE_COLUMNS, SOURCE_FIELDS } from '../src/asm/types.js';

/** One card, laid out by `software.md` §1's columns. Columns 73-75 are the SEQUENCE field the
 *  processor writes on OUTPUT cards; a caller may punch anything there and nothing may read it. */
function punch(parts: {
  page?: string; line?: string; label?: string; op?: string;
  operand?: string; sequence?: string; ident?: string;
}): string {
  return (parts.page ?? '').padEnd(2)
    + (parts.line ?? '').padEnd(3)
    + (parts.label ?? '').padEnd(10)
    + (parts.op ?? '').padEnd(5)
    + (parts.operand ?? '').padEnd(52)
    + (parts.sequence ?? '').padEnd(3)
    + (parts.ident ?? '').padEnd(5);
}

const only = (text: string) => {
  const lines = readSource(text);
  const line = lines[0];
  if (line === undefined) throw new Error(`readSource produced no card for ${JSON.stringify(text)}`);
  return line;
};

describe("software.md §1's column table, field by field (C28-0309-1 pp.5-7)", () => {
  const card = punch({
    page: '01', line: '023', label: 'START', op: 'MLC',
    operand: 'FIELDA,FIELDB', sequence: '007', ident: 'DEMO1',
  });

  it('the six fields add up to exactly 80 columns', () => {
    expect(card).toHaveLength(SOURCE_COLUMNS);
    expect(SOURCE_FIELDS).toEqual({
      page: [1, 2], line: [3, 5], label: [6, 15], op: [16, 20], operand: [21, 72], ident: [76, 80],
    });
  });

  it('slices each field at its own columns', () => {
    expect(field(card, 'page')).toBe('01');
    expect(field(card, 'line')).toBe('023');
    expect(field(card, 'label')).toBe('START     ');
    expect(field(card, 'op')).toBe('MLC  ');
    expect(field(card, 'operand')).toBe('FIELDA,FIELDB'.padEnd(52));
    expect(field(card, 'ident')).toBe('DEMO1');
  });

  it('reads the card-level half of the statement off those columns', () => {
    expect(cardFields(card)).toEqual({
      pglin: '01023',
      comment: false,
      label: 'START',
      labelIndented: false,
      labelIsActual: false,
      op: 'MLC',
      operand: 'FIELDA,FIELDB'.padEnd(52),
    });
  });

  it('IGNORES columns 73-75 — the processor WRITES a sequence number there on OUTPUT cards', () => {
    const written = punch({
      page: '01', line: '023', label: 'START', op: 'MLC',
      operand: 'FIELDA,FIELDB', sequence: '999', ident: 'DEMO1',
    });
    expect(written).not.toBe(card);
    expect(cardFields(written)).toEqual(cardFields(card));
    // …and the ident is still read from its own columns, 76-80.
    expect(field(written, 'ident')).toBe('DEMO1');
  });
});

describe('the two asterisks — the COLUMN decides and nothing else does (§5.1, types.ts)', () => {
  it('`*` in column 6 is a COMMENTS card, text 7-72, no assembly', () => {
    // A comments card is not a fielded card: the `*` is column 6 and the text runs 7-72.
    const card = '     *THE REENTRY TABLE'.padEnd(SOURCE_COLUMNS);
    expect(card).toHaveLength(SOURCE_COLUMNS);
    expect(card[5]).toBe('*');
    const fields = cardFields(card);
    expect(fields.comment).toBe(true);
    expect(fields.label).toBe('');
    expect(fields.op).toBe('');
  });

  it('`*` in column 21 is the asterisk OPERAND, not a comments card', () => {
    const card = punch({ label: 'EOF', op: 'EQU', operand: '*' });
    expect(card[20]).toBe('*');
    expect(cardFields(card).comment).toBe(false);
    expect(cardFields(card).label).toBe('EOF');
  });
});

describe('the column-7 indent, the MECHANICAL flag only (§5.1, COL7_INDENT_IS_STANDALONE_TOO)', () => {
  it('is set when column 6 is blank and column 7 is not', () => {
    const card = punch({ label: ' EOJ', op: 'DC', operand: '@EOJ@' });
    expect(card[5]).toBe(' ');
    expect(card[6]).toBe('E');
    const fields = cardFields(card);
    expect(fields.labelIndented).toBe(true);
    // The label is the NAME: the one legal leading blank is the indent itself, and
    // `labelIndented` is what carries that fact.
    expect(fields.label).toBe('EOJ');
  });

  it('is clear for a label written left-justified in column 6', () => {
    expect(cardFields(punch({ label: 'EOJ', op: 'DC' })).labelIndented).toBe(false);
  });

  it('is clear on a comments card, whose column 6 holds the `*`', () => {
    expect(cardFields('     *NOTE'.padEnd(SOURCE_COLUMNS)).labelIndented).toBe(false);
  });

  it('is clear when the whole label field is blank', () => {
    expect(cardFields(punch({ op: 'MLC', operand: 'A,B' })).labelIndented).toBe(false);
  });
});

describe('an ACTUAL label is all digits (software.md §1, [verified])', () => {
  it('flags a numeric label', () => {
    const fields = cardFields(punch({ label: '00500', op: 'MLC', operand: 'A,B' }));
    expect(fields.labelIsActual).toBe(true);
    expect(fields.label).toBe('00500');
  });

  it('does not flag a symbolic label, an empty one, or a mixed one', () => {
    expect(cardFields(punch({ label: 'START' })).labelIsActual).toBe(false);
    expect(cardFields(punch({ label: '' })).labelIsActual).toBe(false);
    expect(cardFields(punch({ label: 'X1' })).labelIsActual).toBe(false);
  });
});

describe('the two typing aliases, and NOTHING else (§5.1)', () => {
  it('`+` normalises to `&`, the 12-punch (SOURCE_PLUS_IS_THE_12_PUNCH)', () => {
    const line = only(punch({ op: 'A', operand: 'TOTAL+3+X1-12+X2' }));
    expect(line.format).toBeUndefined();
    expect(field(line.card, 'operand').trimEnd()).toBe('TOTAL&3&X1-12&X2');
    expect(line.card).not.toContain('+');
  });

  it('lowercase UP-CASES (SOURCE_LOWERCASE_UPCASES)', () => {
    const line = only(punch({ label: 'start', op: 'mlc', operand: 'fielda,fieldb' }));
    expect(line.format).toBeUndefined();
    expect(cardFields(line.card)).toMatchObject({ label: 'START', op: 'MLC' });
    expect(field(line.card, 'operand').trimEnd()).toBe('FIELDA,FIELDB');
  });

  it('stores the 12-punch as a glyph `bcdOfGlyph` accepts, so the whole card is 80 valid glyphs', () => {
    const line = only(punch({ op: 'A', operand: '+00025' }));
    expect(line.card).toHaveLength(SOURCE_COLUMNS);
    expect(field(line.card, 'operand').startsWith('&00025')).toBe(true);
  });
});

describe('a character outside the 64 glyphs is an `F` with its column (§5.1, §6.3)', () => {
  it('reports the 1-based column and stores a BLANK, so the line still renders', () => {
    const line = only(punch({ op: 'MLC', operand: 'A~B' }));
    expect(line.format).toBe('"~" is not one of the 64 machine glyphs (column 22)');
    expect(line.card).toHaveLength(SOURCE_COLUMNS);
    expect(field(line.card, 'operand').slice(0, 3)).toBe('A B');
  });

  it('reports the LEFTMOST offender and COUNTS the rest — one `F` per line', () => {
    const line = only(punch({ op: 'MLC', operand: 'A~B~C~D' }));
    expect(line.format)
      .toBe('"~" is not one of the 64 machine glyphs (column 22); 2 more like it on this line');
  });

  it('a TAB is an `F`, and is not stripped as trailing whitespace', () => {
    const line = only('  \tMLC');
    expect(line.format).toBe(
      'a tab is not a punch — write the columns out, or read them off the ruler (column 3)',
    );
  });

  it('a line longer than 80 columns is an `F` at column 81', () => {
    const line = only(`${punch({ op: 'MLC', operand: 'A,B' })}X`);
    expect(line.format).toBe('the line is longer than 80 columns (column 81)');
    expect(line.card).toHaveLength(SOURCE_COLUMNS);
  });

  it('accepts the eight non-ASCII glyphs, each in ONE column', () => {
    // An alphameric literal is where a non-ASCII glyph now reaches a source deck: since
    // 2026-08-31 the assembler SYNTHESISES the x-control field, so `⌑` is no longer written as an
    // x1 channel character. The claim under test is the SOURCE layer's — one glyph, one column.
    const line = only(punch({ op: 'MLC', operand: '@⌑10@,WORK' }));
    expect(line.format).toBeUndefined();
    expect(line.card).toHaveLength(SOURCE_COLUMNS);
    expect(field(line.card, 'operand').trimEnd()).toBe('@⌑10@,WORK');
  });
});

describe('one line = one card, right-padded to 80 (§5.1)', () => {
  it('right-pads a short line and NEVER pads the label field', () => {
    const line = only('  MLC');
    expect(line.card).toHaveLength(SOURCE_COLUMNS);
    // Columns 3-5 hold `MLC` because that is where it was typed. No convenience shift into the
    // operation field: that would be a second source language.
    expect(field(line.card, 'line')).toBe('MLC');
    expect(cardFields(line.card).op).toBe('');
  });

  it('strips a trailing CR and trailing spaces before columns are counted', () => {
    const card = punch({ op: 'MLC', operand: 'A,B' });
    expect(only(`${card}\r`).card).toBe(card);
    expect(only(`${card}   \r`).format).toBeUndefined();
  });

  it('numbers the lines it kept, and keeps an entirely blank line out of the deck', () => {
    const lines = readSource(['  A', '', '   ', '  B'].join('\n'));
    expect(lines.map((line) => line.line)).toEqual([1, 4]);
  });
});
