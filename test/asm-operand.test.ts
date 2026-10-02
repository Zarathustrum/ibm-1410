// Tier 2 — the operand grammar and the PARSE stage
// (docs/plans/phase-3-autocoder.md §5.2, §6; wave 3).
//
// EVERY CASE IS ASSERTED IN THE STORED ALPHABET. `source.ts` normalises a typed `+` to the
// 12-punch `&` before the card exists (`SOURCE_PLUS_IS_THE_12_PUNCH`), so the manual's `+` is `&`
// here — and the wave-3 gate, `software.md` §2's own published worked equivalence, is written
// that way below. Both spellings are driven through `parse()` in the first test so the alias and
// the grammar are pinned to each other rather than to two hand-typed strings.

import { describe, expect, it } from 'vitest';

import { MINUS_ZONE, PLUS_ZONE } from '../src/core/alu.js';
import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { BCD6, WM } from '../src/core/types.js';
import { EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS, parse } from '../src/asm/operand.js';
import { resolve } from '../src/asm/mnemonics.js';
import { field } from '../src/asm/source.js';
import { CTL_CORE_SIZE_COLUMN, SOURCE_COLUMNS, type Operand, type Statement } from '../src/asm/types.js';

/** One source line: columns 1-5 blank, label 6-15, operation 16-20, operand 21-72. */
const write = (label: string, op: string, operand: string): string =>
  `     ${label.padEnd(10)}${op.padEnd(5)}${operand}`;

function one(label: string, op: string, operand: string): Statement {
  const statement = parse(write(label, op, operand))[0];
  if (statement === undefined) throw new Error(`parse produced no statement for ${op} ${operand}`);
  return statement;
}

/** The operand at `index`, so a missing one fails on its own line rather than on a property. */
function at(statement: Statement, index: number): Operand {
  const operand = statement.operands[index];
  if (operand === undefined) {
    throw new Error(`no operand ${index} in ${JSON.stringify(statement.operands)}`);
  }
  return operand;
}

/** A cell string, `^` marking a word mark — `test/asm-emit.test.ts`'s own notation. */
function show(cells: Uint8Array): string {
  let text = '';
  for (const cell of cells) text += ((cell & WM) !== 0 ? '^' : '') + glyphOf(cell & BCD6);
  return text;
}

// ═══ The wave-3 gate — software.md §2's published worked equivalence ═══════════════════════

describe('the worked equivalence, asserted STRUCTURALLY (software.md §2, [verified])', () => {
  // A TOTAL+3+X1-12+X2,ACCUM-5+X2+35   ≡   A TOTAL-9+X2,ACCUM+30+X2
  const long = one('', 'A', 'TOTAL&3&X1-12&X2,ACCUM-5&X2&35');
  const short = one('', 'A', 'TOTAL-9&X2,ACCUM&30&X2');

  it('parses both spellings with no flag', () => {
    expect(long.format).toBeUndefined();
    expect(short.format).toBeUndefined();
    expect(long.operands).toHaveLength(2);
    expect(short.operands).toHaveLength(2);
  });

  it('sums every adjustment term and keeps the RIGHTMOST index tag, per operand', () => {
    for (const index of [0, 1]) {
      const written = at(long, index);
      const equivalent = at(short, index);
      expect(written.symbol).toBe(equivalent.symbol);
      expect(written.adjust).toBe(equivalent.adjust);
      expect(written.tag).toBe(equivalent.tag);
      expect(written.kind).toBe('symbolic');
    }
    expect(at(long, 0)).toMatchObject({ symbol: 'TOTAL', adjust: -9, tag: 2, tagWritten: true });
    expect(at(long, 1)).toMatchObject({ symbol: 'ACCUM', adjust: 30, tag: 2, tagWritten: true });
  });

  it('is reached from the manual\'s own `+` spelling too, through the source-card alias', () => {
    const typed = one('', 'A', 'TOTAL+3+X1-12+X2,ACCUM-5+X2+35');
    expect(typed.format).toBeUndefined();
    expect(typed.operands).toEqual(long.operands);
  });
});

// ═══ Step 1 — the literal span, THEN the comment cut ═══════════════════════════════════════

describe('the right-to-left `@` scan runs BEFORE the comment cut (software.md §3, §1)', () => {
  it('`MLC @AB  CD@,FIELD` — the two blanks are INSIDE the literal', () => {
    const statement = one('', 'MLC', '@AB  CD@,FIELD');
    expect(statement.format).toBeUndefined();
    expect(statement.operands).toHaveLength(2);
    expect(at(statement, 0).literal?.text).toBe('@AB  CD@');
    expect(show(at(statement, 0).literal?.cells ?? new Uint8Array())).toBe('^AB  CD');
    expect(at(statement, 1)).toMatchObject({ kind: 'symbolic', symbol: 'FIELD' });
    expect(statement.comment_text).toBe('');
  });

  it('cuts the comment at the first double blank OUTSIDE the span', () => {
    const statement = one('', 'MLC', '@AB  CD@,FIELD  MOVE THE NAME');
    expect(statement.format).toBeUndefined();
    expect(statement.operands).toHaveLength(2);
    expect(statement.comment_text).toBe('MOVE THE NAME');
  });

  it('an unmatched `@` is `F`', () => {
    const statement = one('', 'MLC', '@ABC,FIELD');
    expect(statement.format).toContain('unmatched @');
    expect(statement.format).toContain('(column 21)');
  });

  it('A TRAILING COMMENT CONTAINING `@` BREAKS THE STATEMENT — documented behaviour', () => {
    // The right-to-left scan finds the comment's `@` as the closing one, so the span swallows the
    // comma and the double blank: one operand, no comment, and the statement is wrong. That is
    // the cost of the rule that makes `@AB  CD@` work, and it is tested by name rather than
    // patched (§5.2 step 1).
    const statement = one('', 'MLC', '@AB@,FIELD  SEE NOTE @ 12');
    expect(statement.operands).toHaveLength(1);
    expect(at(statement, 0).literal?.text).toBe('@AB@,FIELD  SEE NOTE @');
    expect(statement.comment_text).toBe('');
  });
});

// ═══ Step 2 — the comma split, and the blank address ═══════════════════════════════════════

describe('an EMPTY operand is a blank address — chaining, and meaningful (§5.2 step 2)', () => {
  it('distinguishes `A` (nothing written), `A ,ACCUM` and `A ACCUM`', () => {
    expect(one('', 'A', '').operands).toEqual([]);
    expect(one('', 'A', ',ACCUM').operands.map((operand) => operand.kind)).toEqual(['blank', 'symbolic']);
    expect(one('', 'A', 'ACCUM').operands.map((operand) => operand.kind)).toEqual(['symbolic']);
  });

  it('flags a fourth operand — at most three are written: A, B and the d', () => {
    expect(one('', 'BCE', 'A,B,2,X').format).toContain('at most three operands');
  });
});

// ═══ Step 3 rule 0 — the control operations whose operand is not an address ════════════════

describe('rule 0 — tested FIRST, before every other rule (§5.2 step 3)', () => {
  it('JOB takes its heading as FREE TEXT from columns 21-72, verbatim and unflagged', () => {
    const statement = one('', 'JOB', 'HELLO DAD - REENTRY TABLE');
    expect(statement.format).toBeUndefined();
    expect(statement.operands).toEqual([]);
    expect(statement.comment_text).toBe('');
    // 25 characters with blanks and a hyphen — the symbolic rule would have flagged it.
    expect(field(statement.card, 'operand').trimEnd()).toBe('HELLO DAD - REENTRY TABLE');
    expect(field(statement.card, 'operand').trimEnd()).toHaveLength(25);
  });

  it('a JOB heading is never comment-cut, even when it contains a double blank', () => {
    const statement = one('', 'JOB', 'REENTRY  TABLE');
    expect(statement.format).toBeUndefined();
    expect(statement.comment_text).toBe('');
    expect(field(statement.card, 'operand').trimEnd()).toBe('REENTRY  TABLE');
  });

  it('CTL is read by ABSOLUTE COLUMN, with column 21 blank and column 22 the core size', () => {
    const statement = one('', 'CTL', ' 1');
    expect(statement.format).toBeUndefined();
    expect(statement.operands).toEqual([]);
    // A rule keyed on the operand's first character would read a blank operand and flag it.
    expect(field(statement.card, 'operand')[0]).toBe(' ');
    expect(statement.card[CTL_CORE_SIZE_COLUMN - 1]).toBe('1');
    expect(statement.card).toHaveLength(SOURCE_COLUMNS);
  });

  it('RUN carries its mode word in the LABEL field and its operand MUST be blank', () => {
    const good = one('AUTOCODER', 'RUN', '');
    expect(good.format).toBeUndefined();
    expect(good.label).toBe('AUTOCODER');
    expect(good.operands).toEqual([]);

    const bad = one('AUTOCODER', 'RUN', 'AUTOCODER');
    expect(bad.format).toContain('RUN takes no operand');
  });

  it('a comments card never reaches step 3 at all', () => {
    const statement = parse('     *PUNCH THE DECK, THEN LOAD IT')[0];
    expect(statement?.comment).toBe(true);
    expect(statement?.operands).toEqual([]);
    expect(statement?.comment_text).toBe('PUNCH THE DECK, THEN LOAD IT');
    expect(statement?.format).toBeUndefined();
  });
});

// ═══ Step 3 rule 1 — the x-control field, SYNTHESISED ══════════════════════════════════════
// The field is BUILT by the assembler and never written (mnemonics.ts's retired
// IO_OPERAND_IS_XCONTROL_BADDR_D, 2026-08-31). A22-0526-3 Figure 107 pp.104-105 spells each
// family as `R(#)w° 0,b` / `P(#)w° 0,b` / `W(#)° b` / `WM(#)° b` / `RCPw° b`, and every operand
// cell in C28-0309-1 pp.47-48's expansion is `0,B`, `1,B`, `2,B` or a bare `B`.

describe('rule 1 — the three-position x-control field, built not written (A22-0526-3 Fig 107)', () => {
  it('synthesises it from the mnemonic and the pocket, and the pocket is NOT an address', () => {
    // The demo's first instruction. Two operands are written — the stacker pocket and the storage
    // address (C28-0309-1 p.23's "first entry" / "second entry") — and THREE things come out: the
    // built x-control field, the address, and the explicit d.
    const statement = one('', 'R1W', '0,LINE,$');
    expect(statement.format).toBeUndefined();
    expect(statement.operands).toHaveLength(2);
    expect(at(statement, 0)).toEqual({
      kind: 'xcontrol', text: '%10', adjust: 0, tag: 0, tagWritten: false,
    });
    expect(at(statement, 1)).toMatchObject({ kind: 'symbolic', symbol: 'LINE' });
    expect(statement.d).toBe('$');
  });

  it('takes x1 from the channel and the overlap the MNEMONIC names', () => {
    // X1_CHANNEL: `%` ch1, `⌑` ch2, `@` ch1 overlapped, `*` ch2 overlapped (software.md §10.9).
    // The four 1410 channel characters are now reachable only through four mnemonics.
    for (const [mnemonic, field] of [['R', '%10'], ['R2', '⌑10'], ['RO', '@10'], ['R2O', '*10']]) {
      const statement = one('', mnemonic ?? '', '0,WORK,$');
      expect(statement.format, mnemonic).toBeUndefined();
      expect(at(statement, 0).text, mnemonic).toBe(field);
    }
  });

  it('bakes x3 where the family does, so the printer writes ONE operand', () => {
    // Figure 107 p.105's "I/O Unit No. or Specific Operation": Write a Line `0`, Write Word Marks
    // As 1's `1`, console `0`. The demo's print instruction is the whole statement.
    const printer = one('', 'W1', 'LINE');
    expect(printer.format).toBeUndefined();
    expect(printer.operands).toHaveLength(2);
    expect(at(printer, 0).text).toBe('%20');
    expect(at(printer, 1)).toMatchObject({ kind: 'symbolic', symbol: 'LINE' });
    expect(one('', 'WM1', 'LINE').operands[0]?.text).toBe('%21');
    expect(one('', 'WCP', 'MSG').operands[0]?.text).toBe('%T0');
  });

  it('validates the pocket against the family — read 0 1 2 9, punch 0 4 8', () => {
    for (const pocket of ['0', '1', '2', '9']) {
      expect(one('', 'R1W', `${pocket},WORK,$`).format, pocket).toBeUndefined();
      expect(one('', 'R1W', `${pocket},WORK,$`).operands[0]?.text).toBe(`%1${pocket}`);
    }
    for (const pocket of ['0', '4', '8']) {
      expect(one('', 'P1', `${pocket},WORK`).format, pocket).toBeUndefined();
      expect(one('', 'P1', `${pocket},WORK`).operands[0]?.text).toBe(`%4${pocket}`);
    }
    // A pocket of the WRONG family is the case a "one of the ten digits" check would miss.
    expect(one('', 'P1', '9,WORK').format).toContain('is not a stacker pocket');
    expect(one('', 'R1', '4,WORK').format).toContain('is not a stacker pocket');
    expect(one('', 'R1', '4,WORK').format).toContain('0 1 2 9');
  });

  it('is `F` and never a throw when the pocket is missing, and the field is STILL 3 positions', () => {
    const missing = one('', 'R1W', ',WORK,$');
    expect(missing.format).toContain('takes the stacker pocket as its first operand');
    // Three positions on a flagged line too, so emit.ts sees the length its form carries and the
    // message a person reads is this one rather than a downstream complaint about a short field.
    expect([...(at(missing, 0).text)]).toHaveLength(3);
  });

  it('NO SOURCE DECK WRITES AN X-CONTROL FIELD ANY MORE — the old spelling is `F`', () => {
    // The strengthened form of what this block used to assert. `RW1 %10,LINE,$` was the demo's
    // first instruction until 2026-08-31; `RW1` is not a mnemonic now, and writing the field out
    // under the right mnemonic lands it in the pocket slot, where it is not a pocket.
    expect(resolve('RW1')).toBeUndefined();
    expect(one('', 'R1W', '%10,LINE,$').format).toContain('is not a stacker pocket');
    // Nor on a family that bakes x3: there the field falls through to the ADDRESS rules.
    expect(one('', 'W1', '%20,LINE,W').format).toContain('not a valid symbolic address');
  });

  it('is NEVER adjusted and NEVER index-tagged — true by construction now', () => {
    // It is built with `tag: 0` / `tagWritten: false` and can carry nothing else. A term written
    // on the POCKET fails as a pocket, which is the only way in.
    const tagged = one('', 'R1W', '0&X1,WORK,$');
    expect(tagged.format).toContain('is not a stacker pocket');
    expect(at(tagged, 0).tagWritten).toBe(false);
    expect(at(tagged, 0).tag).toBe(0);
    expect(at(tagged, 0).adjust).toBe(0);
  });

  it('EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS — the baked d stands unless one is written', () => {
    // The mnemonic bakes `R` / `W` (C28-0309-1 pp.47-48's INSTRUCTION column), so a statement
    // with no third operand writes no d at all and `emit.ts`'s `dOf` falls back to the row's.
    expect(EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS).toBe(true);
    expect(one('', 'R1W', '0,LINE').d).toBeUndefined();
    expect(resolve('R1W')?.d).toBe('R');
    // …and the one exception this constant names: a d written last still wins, unflagged.
    const explicit = one('', 'R1W', '0,LINE,$');
    expect(explicit.d).toBe('$');
    expect(explicit.format).toBeUndefined();
    // It is still checked against the op's own d-modifiers.
    expect(one('', 'R1W', '0,LINE,Z').format).toContain('is not defined for R1W');
  });
});

// ═══ Step 3 rules 2-9 — the four literal kinds and the address heads ═══════════════════════

describe('the four literal kinds (software.md §3)', () => {
  it('rule 3 — ALPHAMERIC `@…@`, word mark on the high-order position', () => {
    const literal = at(one('', 'MLC', '@HELLO1@,LINE'), 0).literal;
    expect(literal).toMatchObject({ kind: 'alphameric', text: '@HELLO1@', pooled: true });
    expect(show(literal?.cells ?? new Uint8Array())).toBe('^HELLO1');
  });

  it('rule 3 — the word separator may never be its first character', () => {
    expect(one('', 'MLC', `@${glyphOf(0o35)}AB@,LINE`).format).toContain('word separator');
  });

  it('rule 4 — NUMERIC, sign REQUIRED, placed as a zone over the units position', () => {
    const plus = at(one('', 'A', '&00025,TOTAL'), 0).literal;
    expect(plus).toMatchObject({ kind: 'numeric', text: '&00025', pooled: true });
    const cells = plus?.cells ?? new Uint8Array();
    expect(cells).toHaveLength(5);
    expect(cells[4]).toBe((bcdOfGlyph('5') ?? 0) | PLUS_ZONE);
    expect(show(cells)).toBe('^0002E');   // charset.md §6.1: 12-5 = BA41 = `E`

    const minus = at(one('', 'A', '-00025,TOTAL'), 0).literal;
    expect(minus?.cells[4]).toBe((bcdOfGlyph('5') ?? 0) | MINUS_ZONE);
    expect(show(minus?.cells ?? new Uint8Array())).toBe('^0002N');   // 11-5 = B41 = `N`
  });

  it('rule 4 — an UNSIGNED number is not a literal; it is rule 8, an actual address', () => {
    expect(at(one('', 'A', '00025,TOTAL'), 0)).toMatchObject({ kind: 'actual', actual: 25 });
  });

  it('rule 5 — `&LABEL` is the ADDRESS-CONSTANT literal, five positions', () => {
    const operand = at(one('', 'MLC', '&AREA,LINE'), 0);
    expect(operand.kind).toBe('literal');
    expect(operand.symbol).toBe('AREA');
    expect(operand.literal).toMatchObject({ kind: 'addressConstant', text: '&AREA', pooled: true });
    expect(operand.literal?.cells).toHaveLength(5);
  });

  it('rule 6 — `NAME#n` is the AREA-DEFINING literal, n blank positions', () => {
    const operand = at(one('', 'MLC', 'AMOUNT,BUFFERTWO#10'), 1);
    expect(operand.symbol).toBe('BUFFERTWO');
    expect(operand.literal).toMatchObject({ kind: 'areaDefining', text: 'BUFFERTWO#10' });
    expect(operand.literal?.cells).toHaveLength(10);
    expect(show(operand.literal?.cells ?? new Uint8Array())).toBe(`^${' '.repeat(10)}`);
  });

  it('rule 6 — over 500 positions is `F`', () => {
    expect(one('', 'MLC', 'A,WORK#501').format).toContain('limited to 500 positions');
    expect(one('', 'MLC', 'A,WORK#500').format).toBeUndefined();
  });
});

describe('rule 6 is a HEAD-THEN-SCAN test, which is what settles the three collisions', () => {
  it('`@A#B@` is an ALPHAMERIC literal — rule 3 consumed the `#` as data', () => {
    const literal = at(one('', 'MLC', '@A#B@,LINE'), 0).literal;
    expect(literal).toMatchObject({ kind: 'alphameric', text: '@A#B@' });
  });

  it('a `#` reached AFTER a term is `F` — nothing may follow the term tail', () => {
    const statement = one('', 'MLC', 'TOTAL&5#3,LINE');
    expect(statement.format).toContain('nothing may follow the term tail');
  });

  it('`DCW #5` matches rule 6 at its FIRST character', () => {
    const operand = at(one('ID', 'DCW', '#5'), 0);
    expect(operand.kind).toBe('literal');
    expect(operand.symbol).toBeUndefined();
    expect(operand.literal).toMatchObject({ kind: 'areaDefining', text: '#5' });
    expect(operand.literal?.cells).toHaveLength(5);
  });
});

describe('the remaining address heads (software.md §2)', () => {
  it('rule 7 — `*` is the asterisk operand, and carries its adjustment', () => {
    expect(at(one('', 'ORG', '*&200'), 0)).toMatchObject({ kind: 'asterisk', adjust: 200 });
  });

  it('rule 8 — 1-5 digits are an ACTUAL address, leading zeros optional', () => {
    expect(at(one('', 'B', '00500'), 0)).toMatchObject({ kind: 'actual', actual: 500 });
    expect(at(one('', 'B', '500'), 0)).toMatchObject({ kind: 'actual', actual: 500 });
  });

  it('rule 9 — SYMBOLIC: ≤10 characters, first alphabetic, no specials', () => {
    expect(at(one('', 'B', 'LOOP'), 0)).toMatchObject({ kind: 'symbolic', symbol: 'LOOP' });
    expect(one('', 'B', 'ELEVENCHAR1').format).toContain('not a valid symbolic address');
    expect(one('', 'B', '123456').format).toContain('not a valid symbolic address');
  });

  it('rule 9 plus step 4 — `LABEL&10` is a DECLARATIVE address constant, NOT rule 5\'s literal', () => {
    const trailing = at(one('', 'DCW', 'LABEL&10'), 0);
    expect(trailing).toMatchObject({ kind: 'symbolic', symbol: 'LABEL', adjust: 10 });
    expect(trailing.literal).toBeUndefined();
    // The `&` is LEADING on rule 5's and TRAILING on this one, and that is all the two rules key on.
    expect(at(one('', 'DCW', '&LABEL'), 0).literal?.kind).toBe('addressConstant');
  });
});

// ═══ Step 4 — the term tail ════════════════════════════════════════════════════════════════

describe('step 4 — the index tag (software.md §2, [verified])', () => {
  it('with several index tags on one address, only the RIGHTMOST is effective', () => {
    expect(at(one('', 'A', 'TOTAL&X1&X2&X7,B'), 0)).toMatchObject({ tag: 7, tagWritten: true });
  });

  it('`&X0` and `&X16` are `F` — the 1410 has X1 through X15', () => {
    expect(one('', 'A', 'TOTAL&X0,B').format).toContain('index register 0 does not exist');
    expect(one('', 'A', 'TOTAL&X16,B').format).toContain('index register 16 does not exist');
    expect(one('', 'A', 'TOTAL&X15,B').format).toBeUndefined();
  });

  it('`&NAME` in the TAIL is an index tag resolved in pass 2, not an address constant', () => {
    const operand = at(one('', 'A', 'TOTAL&INDEXB,B'), 0);
    expect(operand).toMatchObject({ kind: 'symbolic', symbol: 'TOTAL', tag: 0, tagWritten: true });
    expect(operand.tagSymbol).toBe('INDEXB');
  });

  it('a symbolic tag is overridden by a numeric one to its right, and the other way round', () => {
    expect(at(one('', 'A', 'TOTAL&INDEXB&X3,B'), 0).tagSymbol).toBeUndefined();
    expect(at(one('', 'A', 'TOTAL&INDEXB&X3,B'), 0).tag).toBe(3);
    expect(at(one('', 'A', 'TOTAL&X3&INDEXB,B'), 0)).toMatchObject({ tag: 0, tagSymbol: 'INDEXB' });
  });
});

describe('a term-tail `F` reports the CARD COLUMN of the term, not an offset (§6.3)', () => {
  // The operand field IS columns 21-72 (`software.md` §1), so in `A TOTAL&X0,B` the `T` is column
  // 21 and the `&` five characters later is column 26 — and in `A ACCUM,TOTAL&X0` the `T` of
  // TOTAL is 27 and its `&` is 32. Every other `F` in the file is already a card column; the tail
  // has to be one too or the ONE-FLAG sort in `messageOf` compares two different origins.
  it('operand 1 — the `&` of `TOTAL&X0` is column 26', () => {
    expect(one('', 'A', 'TOTAL&X0,B').format).toContain('(column 26)');
  });

  it('operand 2 — the same tail past the comma is column 32', () => {
    expect(one('', 'A', 'ACCUM,TOTAL&X0').format).toContain('(column 32)');
  });

  it('so the LEFTMOST offender wins, even when the tail defect is written second', () => {
    // Two defects: the 11-character symbol at column 21 and the `&X0` at column 38. Measured as
    // an offset the tail would report column 17 and WIN a sort it must lose.
    const statement = one('', 'MLC', 'ELEVENCHAR1,TOTAL&X0');
    expect(statement.format).toContain('not a valid symbolic address');
    expect(statement.format).toContain('(column 21)');
    expect(statement.format).toContain('1 more like it on this line');
  });
});

// ═══ Step 5 — where indexing is rejected ═══════════════════════════════════════════════════

describe('step 5 — indexing is rejected, and the tag is IGNORED (software.md §2, [verified])', () => {
  const rejected: readonly (readonly [string, string])[] = [
    ['DS', '10&X1'],
    ['ORG', '00500&X1'],
    ['LTORG', '*&X1'],
    ['END', 'START&X1'],
    ['EJECT', 'START&X1'],
  ];

  for (const [op, operand] of rejected) {
    it(`${op} does not accept indexing`, () => {
      const statement = one('', op, operand);
      expect(statement.format).toContain('does not accept indexing');
      expect(at(statement, 0).tag).toBe(0);
      expect(at(statement, 0).tagSymbol).toBeUndefined();
    });
  }

  it('a `G` Store Address Register instruction does not accept indexing', () => {
    const statement = one('', 'SAR', 'LOOP&X1');
    expect(statement.format).toContain('does not accept indexing');
    expect(at(statement, 0).tag).toBe(0);
  });

  it('an x-control field does not accept indexing — it is built, so it cannot carry a tag', () => {
    expect(one('', 'R1W', '0&X2,WORK,$').format).toContain('is not a stacker pocket');
    expect(at(one('', 'R1W', '0&X2,WORK,$'), 0).tagWritten).toBe(false);
  });

  it('an ordinary imperative DOES accept it', () => {
    expect(one('', 'A', 'TOTAL&X1,B').format).toBeUndefined();
    expect(at(one('', 'A', 'TOTAL&X1,B'), 0).tag).toBe(1);
  });
});

// ═══ The explicit d ════════════════════════════════════════════════════════════════════════

describe('the explicit d follows the addresses (D_FOLLOWS_THE_ADDRESSES, software.md §4)', () => {
  it('`BCE ENTRYA,SWITCH,2` — two addresses, then the d', () => {
    const statement = one('', 'BCE', 'ENTRYA,SWITCH,2');
    expect(statement.format).toBeUndefined();
    expect(statement.operands.map((operand) => operand.symbol)).toEqual(['ENTRYA', 'SWITCH']);
    expect(statement.d).toBe('2');
  });

  it('a form that takes NO d flags `F`', () => {
    expect(one('', 'A', 'FIELDA,FIELDB,X').format).toContain('takes no d-modifier');
  });

  it('a glyph that is not a key of the form\'s dModifiers flags `F`, naming the keys', () => {
    const statement = one('', 'SSF1', 'Q');
    expect(statement.format).toContain('is not defined for SSF1');
    expect(statement.format).toContain('0 1 2');
  });

  it('op `J`\'s LEGITIMATE BLANK key is shown as `␣`, not as an invisible gap', () => {
    // `table.ts`'s J forms[0] is the unconditional branch, whose d-modifier key is a blank —
    // "the blank d position must be present". Unrendered, the key list opens with a hole.
    const statement = one('', 'B', 'LOOP,3');
    expect(statement.format).toContain('d-modifier "3" is not defined for B');
    expect(statement.format).toContain('the defined ones are ␣ 1 2 4');
    expect(statement.format).toContain('(column 26)');
  });

  it('`dModifiers: \'bitmask\'` accepts every glyph too — a summed-bit d has no key set', () => {
    // Plan §5.2 names only `any` as the exception; `bitmask` is the second, on the W / X / R
    // forms (BBE and the two channel-status branches). Recorded in open-questions.md, wave 3.
    for (const glyph of ['Q', '‡', '9']) {
      expect(one('', 'BBE', `FIELDA,FIELDB,${glyph}`).format).toBeUndefined();
      expect(one('', 'BNR1', `LOOP,${glyph}`).format).toBeUndefined();
    }
  });

  it('THE ONE EXCEPTION is `dModifiers: \'any\'` — BCE\'s d IS the compared character', () => {
    for (const glyph of ['Q', '‡', '⌑', '9']) {
      const statement = one('', 'BCE', `ENTRYA,SWITCH,${glyph}`);
      expect(statement.format).toBeUndefined();
      expect(statement.d).toBe(glyph);
    }
  });

  it('an explicit d OVERRIDES a mnemonic-baked one, and the line carries NO flag', () => {
    // MLCB bakes d `L` (Exhibit IV's `D 00394 00306 L`); writing one reaches a d the mnemonic
    // table has no name for. `emit.ts`'s `dOf` is the other half of the ruling.
    const statement = one('', 'MLCB', 'AR80,IDENT&5,W');
    expect(statement.format).toBeUndefined();
    expect(statement.d).toBe('W');
  });

  it('`BZN LOOP,SWITCH,AB` — V\'s third operand is a ZONE WORD naming a d', () => {
    const statement = one('', 'BZN', 'LOOP,SWITCH,AB');
    expect(statement.format).toBeUndefined();
    expect(statement.d).toBe('AB');
  });

  it('a d written where the mnemonic takes the d as its ONLY operand', () => {
    const statement = one('', 'CC1', '1');
    expect(statement.format).toBeUndefined();
    expect(statement.operands).toEqual([]);
    expect(statement.d).toBe('1');
  });
});

// ═══ §2.2's graceful degradation ═══════════════════════════════════════════════════════════

describe('an unrecognised operation degrades gracefully (§2.2, §6.3)', () => {
  it('leaves the operands unjudged — you cannot judge an operand before you know the op', () => {
    const statement = one('', 'GET', 'INFILE,1X80');
    expect(statement.format).toBeUndefined();
    expect(statement.operands).toHaveLength(2);
    expect(at(statement, 1).text).toBe('1X80');
  });

  it('a DA header is a declarative grammar pass 1 reads, not an address', () => {
    const statement = one('AREA', 'DA', '1X80,G');
    expect(statement.format).toBeUndefined();
    expect(statement.operands.map((operand) => operand.text)).toEqual(['1X80', 'G']);
  });

  it('the >3-operand `F` obeys the same suppression — how many operands an op takes is the OP\'s fact', () => {
    const unknown = one('', 'GET', 'A,B,C,D');
    expect(unknown.format).toBeUndefined();          // flag O, from emit.ts — never F
    // The TRUNCATION still happens: classification never sees more than A, B and the d.
    expect(unknown.operands).toHaveLength(3);
    expect(one('AREA', 'DA', '1X80,G,H,J').format).toBeUndefined();
    // A KNOWN op still earns it.
    expect(one('', 'BCE', 'A,B,2,X').format).toContain('at most three operands');
  });
});
