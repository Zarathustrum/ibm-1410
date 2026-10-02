// Pass 1 — the assignment-counter walk (docs/plans/phase-3-autocoder.md §6.1; wave 4).
//
// Every case below is `software.md` §1, §2, §3, §5 or §6 read as a rule and then written as a
// source deck, because the assignment counter is only observable through the addresses it hands
// out. The decks are built by `card()`, which places each field at its 1-BASED COLUMN — the
// column table is the language (`software.md` §1, C28-0309-1 pp.5-7), and a test that wrote
// `'LOOP  R1W  ...'` by eye would be testing its own spacing.
//
// THE DEMO'S LADDER IS HERE TOO, at the foot of the file: §10's eleven-row table, every ADDRS
// checked, plus the two traps that are addresses rather than instructions — `ID` resolving
// LOW-order to 00563 while the word mark it sets lands at 00558, and ` LINE` resolving HIGH-order
// to 00564 because it is indented to column 7, against the un-indented counterfactual 00643.
// The record geometry and the GM-WM warning are asserted where the packer runs, in
// `test/tier3-asm-load-equals-memory.test.ts`'s demo program.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { glyphOf } from '../src/core/bcd.js';
import { BCD6, WM, type Addr } from '../src/core/types.js';
import { pass2, type EmittedStatement } from '../src/asm/emit.js';
import { parse } from '../src/asm/operand.js';
import { pack } from '../src/asm/pack.js';
import {
  ACTUAL_LABEL_IS_CHECKED_AGAINST_THE_COUNTER, COL7_INDENT_IS_STANDALONE_TOO,
  EQU_TO_AN_XCONTROL_FIELD_IS_OUT, FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS,
  MULTIPLY_DEFINED_KEEPS_THE_FIRST_VALUE, pass1, type Pass1Line, type Pass1Result,
} from '../src/asm/symbols.js';
import { ORG_DEFAULT, type AsmFlag } from '../src/asm/types.js';

// ═══ Building a column-exact source deck ═══════════════════════════════════════════════════

/** `software.md` §1's columns, 1-based: page 1-2, line 3-5, label 6-15, operation 16-20,
 *  operand 21-72, identification 76-80. */
const LABEL = 6, INDENT = 7, OPERATION = 16, OPERAND = 21, IDENT = 76;

/** One 80-column card, each field placed at the column it belongs in. Throws rather than
 *  silently shifting: a field that will not fit is a broken fixture, not a card. */
function card(fields: readonly (readonly [number, string])[]): string {
  let out = '';
  for (const [column, text] of fields) {
    if (out.length > column - 1) {
      throw new Error(`"${text}" will not fit at column ${column}: ${out.length} columns used`);
    }
    out = out.padEnd(column - 1) + text;
  }
  return out.trimEnd();
}

const deck = (cards: readonly (readonly (readonly [number, string])[])[]): string =>
  cards.map(card).join('\n');

/** `parse -> pass1`, which is all most of these cases need. */
const walk = (cards: readonly (readonly (readonly [number, string])[])[]): Pass1Result =>
  pass1(parse(deck(cards)));

const lineOf = (result: Pass1Result, seqno: number): Pass1Line => {
  const line = result.lines.find((l) => l.seqno === seqno);
  if (line === undefined) throw new Error(`no pass-1 line for SEQNO ${seqno}`);
  return line;
};

const valueOf = (result: Pass1Result, name: string): number | undefined =>
  result.symbols.get(name)?.value;

/** The RUN card every standalone assembly opens with (`software.md` §6). */
const RUN_CARD = [[LABEL, 'AUTOCODER'], [OPERATION, 'RUN']] as const;

// ═══ §6.1 — the counter, statement by statement ════════════════════════════════════════════

describe('pass 1 — where the counter starts, and what does not move it (§6.1)', () => {
  it('starts at 00500 with no ORG — the loader occupies storage below it', () => {
    const result = walk([[[OPERATION, 'H']]]);
    expect(ORG_DEFAULT).toBe(500);
    expect(lineOf(result, 1).addrs).toBe(500);
  });

  it('a comments card and every non-allocating control leave the counter exactly where it was', () => {
    // `software.md` §6: JOB, CTL, RUN, LOAD, EJECT, RESEQ and PST are listing and deck control;
    // END names the entry point. None of them assembles a character.
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'JOB'], [OPERAND, 'A HEADING'], [IDENT, 'JOB01']],
      [[OPERATION, 'CTL'], [22, '1']],
      [[LABEL, '*  A COMMENTS CARD, TEXT 7-72']],
      [[OPERATION, 'LOAD']],
      [[OPERATION, 'EJECT']],
      [[OPERATION, 'PST']],
      [[OPERATION, 'RESEQ'], [IDENT, 'SEQ02']],
      [[LABEL, 'AFTER'], [OPERATION, 'H']],
      [[OPERATION, 'END'], [OPERAND, 'AFTER']],
    ]);
    for (const seqno of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(lineOf(result, seqno).addrs, `SEQNO ${seqno} moved the counter`).toBe(500);
      expect(lineOf(result, seqno).ct).toBeUndefined();
    }
    expect(valueOf(result, 'AFTER')).toBe(500);
    expect(result.lines.every((line) => line.flag === undefined)).toBe(true);
  });

  it('reads the deck-level facts off the control cards: core size, suppress, ident, heading, LOAD, entry', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'JOB'], [OPERAND, 'HELLO DAD - REENTRY TABLE'], [IDENT, 'HDAD1']],
      // CTL is read by ABSOLUTE column: core size at 22, suppress code at 23 (`software.md` §6).
      [[OPERATION, 'CTL'], [22, '12']],
      [[OPERATION, 'LOAD']],
      [[LABEL, 'START'], [OPERATION, 'H']],
      [[OPERATION, 'END'], [OPERAND, 'START']],
    ]);
    expect(result.coreSize).toBe(10_000);
    expect(result.suppress).toBe('2');
    expect(result.ident).toBe('HDAD1');
    expect(result.heading).toBe('HELLO DAD - REENTRY TABLE');
    expect(result.wantsLoader).toBe(true);
    expect(result.entry).toBe(500);
  });

  it('CTL absent = 20K, and LOAD absent leaves wantsLoader false', () => {
    const result = walk([RUN_CARD, [[OPERATION, 'H']]]);
    expect(result.coreSize).toBe(20_000);
    expect(result.wantsLoader).toBe(false);
    expect(result.entry).toBeUndefined();
  });

  it("RUN's label is a MODE WORD and never a symbol — a program may still label something AUTOCODER", () => {
    const result = walk([
      RUN_CARD,
      [[LABEL, 'AUTOCODER'], [OPERATION, 'H']],
      [[OPERATION, 'END'], [OPERAND, 'AUTOCODER']],
    ]);
    // One definition, from the HALT — not two, and no `M`.
    expect(valueOf(result, 'AUTOCODER')).toBe(500);
    expect(result.symbols.get('AUTOCODER')?.definedAt).toBe(2);
    expect(result.lines.every((line) => line.flag === undefined)).toBe(true);
    expect(result.entry).toBe(500);
  });

  it('RUN SYSTEMS is F on the label field — a valid operation with a mode word that has no library', () => {
    // `O` is the INVALID-OPERATION-CODE flag and RUN is a valid operation, so overloading it here
    // would make the FLAG column mean two things (§2.2's RUN row).
    const result = walk([[[LABEL, 'SYSTEMS'], [OPERATION, 'RUN']]]);
    expect(lineOf(result, 1).flag).toBe('F');
    expect(lineOf(result, 1).why).toContain('no library');
  });
});

describe('pass 1 — ORG, all four forms (§6.1, software.md §2)', () => {
  it('actual, previously-defined symbolic, `*` with adjustment, and blank = high-water + 1', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00700']],          // 2: actual
      [[LABEL, 'HERE'], [OPERATION, 'H']],               // 3: 00700
      [[OPERATION, 'ORG'], [OPERAND, 'HERE&100']],       // 4: previously-defined symbolic + 100
      [[OPERATION, 'H']],                                // 5: 00800
      [[OPERATION, 'ORG'], [OPERAND, '*&9']],            // 6: `*` with adjustment
      [[OPERATION, 'H']],                                // 7: 00810
      [[OPERATION, 'ORG'], [OPERAND, '00600']],          // 8: backwards
      [[OPERATION, 'H']],                                // 9: 00600
      [[OPERATION, 'ORG']],                              // 10: blank = high-water + 1
      [[OPERATION, 'H']],                                // 11: 00811
    ]);
    expect(lineOf(result, 3).addrs).toBe(700);
    expect(lineOf(result, 5).addrs).toBe(800);
    expect(lineOf(result, 7).addrs).toBe(810);
    expect(lineOf(result, 9).addrs).toBe(600);
    // The high assignment counter after the 00810 halt is 00811, and a blank ORG returns to it —
    // NOT to 00601, which is where the counter happened to be standing.
    expect(lineOf(result, 11).addrs).toBe(811);
    expect(result.lines.every((line) => line.flag === undefined)).toBe(true);
  });

  it('an ORG to a symbol that is not yet defined is U, and the counter does not move', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'ORG'], [OPERAND, 'LATER']],
      [[OPERATION, 'H']],
      [[LABEL, 'LATER'], [OPERATION, 'H']],
    ]);
    expect(lineOf(result, 2).flag).toBe('U');
    expect(lineOf(result, 3).addrs).toBe(500);
  });

  it('an ORG past the core size CTL column 22 declares is F', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'CTL'], [22, '1']],
      [[OPERATION, 'ORG'], [OPERAND, '20000']],
    ]);
    expect(lineOf(result, 3).flag).toBe('F');
    expect(lineOf(result, 3).why).toContain('10000');
  });
});

describe('pass 1 — EQU, three forms in and the fourth out (§2.2, software.md §5)', () => {
  it('the value is the resolved operand, and `*` is the COUNTER — not the last character of an instruction', () => {
    // `software.md` §2's own worked case, `[verified]`: `EOF EQU *` after a 7-character
    // instruction at 00209 is 00216, while the same `*` written as an ordinary operand on that
    // instruction would be 00215. The two readings never share a helper.
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00209']],
      [[LABEL, 'PCH'], [OPERATION, 'B'], [OPERAND, '00000']],   // 7 characters, 00209-00215
      [[LABEL, 'EOF'], [OPERATION, 'EQU'], [OPERAND, '*']],
      [[LABEL, 'ALIAS'], [OPERATION, 'EQU'], [OPERAND, 'PCH&2']],
      [[LABEL, 'FIXED'], [OPERATION, 'EQU'], [OPERAND, '00777']],
      [[LABEL, 'AFTER'], [OPERATION, 'H']],
    ]);
    expect(valueOf(result, 'EOF')).toBe(216);
    expect(lineOf(result, 4).addrs).toBe(216);
    expect(lineOf(result, 4).ct).toBeUndefined();
    expect(valueOf(result, 'ALIAS')).toBe(211);
    expect(valueOf(result, 'FIXED')).toBe(777);
    // EQU emits nothing and MOVES NOTHING: three of them in a row, one of which equates to
    // 00777, and the counter is still where the seven-character branch left it.
    expect(valueOf(result, 'AFTER')).toBe(216);
  });

  it('the index-register form, in BOTH spellings — `X2` and `2,X`', () => {
    const result = walk([
      RUN_CARD,
      [[LABEL, 'TALLY'], [OPERATION, 'EQU'], [OPERAND, 'X2']],
      [[LABEL, 'COUNT'], [OPERATION, 'EQU'], [OPERAND, '3,X']],
    ]);
    expect(result.symbols.get('TALLY')?.indexRegister).toBe(2);
    expect(result.symbols.get('COUNT')?.indexRegister).toBe(3);
    expect(result.lines.every((line) => line.flag === undefined)).toBe(true);
  });

  it('an index register outside X1-X15 is F', () => {
    const result = walk([RUN_CARD, [[LABEL, 'BAD'], [OPERATION, 'EQU'], [OPERAND, 'X16']]]);
    expect(lineOf(result, 2).flag).toBe('F');
  });

  it('EQU_TO_AN_XCONTROL_FIELD_IS_OUT — the fourth documented form is F', () => {
    // `software.md` §5 lists four EQU forms; the fourth makes a symbol whose value is three
    // glyphs rather than an address, and this configuration has no tape to name (§15).
    expect(EQU_TO_AN_XCONTROL_FIELD_IS_OUT).toBe(true);
    const result = walk([RUN_CARD, [[LABEL, 'TAPE'], [OPERATION, 'EQU'], [OPERAND, '%10']]]);
    expect(lineOf(result, 2).flag).toBe('F');
    expect(result.symbols.has('TAPE')).toBe(false);
  });
});

describe('pass 1 — DCW / DC / DS, and what each one moves (§6.1, software.md §5)', () => {
  it('DCW and DC advance by the constant length; DS advances and emits nothing', () => {
    const result = walk([
      RUN_CARD,
      [[LABEL, 'TEXT'], [OPERATION, 'DCW'], [OPERAND, '@ABCDE@']],   // 5, 00500-00504
      [[LABEL, 'BLANKS'], [OPERATION, 'DC'], [OPERAND, '#4']],       // 4, 00505-00508
      [[LABEL, 'NUM'], [OPERATION, 'DCW'], [OPERAND, '&123']],       // 3, 00509-00511
      [[LABEL, 'PTR'], [OPERATION, 'DCW'], [OPERAND, 'TEXT']],       // 5, 00512-00516 (address)
      [[LABEL, 'WORK'], [OPERATION, 'DS'], [OPERAND, '20']],         // 20, 00517-00536
      [[LABEL, 'NEXT'], [OPERATION, 'H']],                           // 00537
    ]);
    expect(lineOf(result, 2).ct).toBe(5);
    expect(lineOf(result, 3).ct).toBe(4);
    expect(lineOf(result, 4).ct).toBe(3);
    expect(lineOf(result, 5).ct).toBe(5);
    expect(lineOf(result, 6).ct).toBe(20);
    expect(valueOf(result, 'NEXT')).toBe(537);

    // A DS EMITS NOTHING — "no information is entered into the area, no word mark is assigned by
    // the processor, and the area is not cleared prior to reservation" (software.md §5 verbatim).
    const emitted = pass2(result.sized, result.symbols, result.coreSize);
    const ds = emitted.statements.find((s) => s.seqno === 6);
    expect(ds?.items).toEqual([]);
    // …and nothing else in the deck emits into 00517-00536 either.
    expect(emitted.items.some((item) => item.at >= 517 && item.at <= 536)).toBe(false);
  });

  it('a DS or DA extent is what pack() is handed as its second argument (§8.3)', () => {
    const result = walk([
      RUN_CARD,
      [[LABEL, 'INBUF'], [OPERATION, 'DS'], [OPERAND, '80']],        // 00500-00579
      [[OPERATION, 'DS'], [OPERAND, '5']],                           // 00580-00584, unlabelled
      [[LABEL, 'REC'], [OPERATION, 'DA'], [OPERAND, '2X10']],        // 00585-00604
      [[LABEL, 'HOLD'], [OPERATION, 'DCW'], [OPERAND, '@Z@']],       // a constant, NOT reserved
    ]);
    expect(result.reserved).toEqual([
      { from: 500, to: 579, label: 'INBUF' },
      { from: 580, to: 584, label: '' },
      { from: 585, to: 604, label: 'REC' },
    ]);
  });
});

describe('pass 1 — DA, header and sub-entries (§6.1, software.md §5)', () => {
  const area = () => walk([
    RUN_CARD,
    [[OPERATION, 'ORG'], [OPERAND, '00600']],
    [[LABEL, 'REC'], [OPERATION, 'DA'], [OPERAND, '2X40']],   // 2 × 40 = 80, 00600-00679
    [[LABEL, 'NAME'], [OPERAND, '1,20']],                     // hi,lo — mark 00600, label 00619
    [[LABEL, 'CODE'], [OPERAND, '21,24']],                    // hi,lo — mark 00620, label 00623
    [[LABEL, 'FLAG'], [OPERAND, '40']],                       // bare lo — subfield, NO mark
    [[LABEL, 'AFTER'], [OPERATION, 'H']],                     // 00680
  ]);

  it('total = b x l, and the header label is the HIGH-order position of the WHOLE area', () => {
    const result = area();
    expect(lineOf(result, 3).ct).toBe(80);
    expect(lineOf(result, 3).addrs).toBe(600);
    expect(valueOf(result, 'REC')).toBe(600);
    expect(result.symbols.get('REC')?.resolvedTo).toBe('highOrder');
    expect(valueOf(result, 'AFTER')).toBe(680);
  });

  it('a `hi,lo` sub-entry marks the field HIGH-order and resolves LOW-order; a bare `lo` marks nothing', () => {
    const result = area();
    expect(valueOf(result, 'NAME')).toBe(619);      // 00600 + 20 - 1
    expect(valueOf(result, 'CODE')).toBe(623);      // 00600 + 24 - 1
    expect(valueOf(result, 'FLAG')).toBe(639);      // 00600 + 40 - 1, and no word mark
    expect(lineOf(result, 4).addrs).toBe(619);
    expect(lineOf(result, 6).addrs).toBe(639);

    // DA_EMITS_ONLY_ITS_MARKED_POSITIONS (emit.ts): one marked blank per DEFINED field high-order
    // — 00600 and 00620 — and nothing for the bare-`lo` subfield.
    const emitted = pass2(result.sized, result.symbols, result.coreSize);
    const marks = emitted.statements.find((s) => s.seqno === 3)?.items ?? [];
    expect(marks.map((item) => item.at)).toEqual([600, 620]);
    for (const item of marks) expect((item.cells[0] ?? 0) & WM).toBe(WM);
  });

  it('the HEADER records highOrder and EVERY sub-entry lowOrder, values unchanged (software.md §5)', () => {
    const result = area();
    // `SymbolEntry.resolvedTo` is what `PST` prints, so it is as load-bearing as the value — and
    // it cannot be inferred from the two addresses here, because a sub-entry's own `at` IS its
    // low-order position. §5's declarative table states it directly: the DA header is "High-order
    // position of the whole reserved area", the `hi,lo` sub-entry is "Low-order position of the
    // field", and the bare-`lo` subfield is "That low-order position".
    expect(result.symbols.get('REC')?.resolvedTo).toBe('highOrder');
    expect(result.symbols.get('NAME')?.resolvedTo).toBe('lowOrder');    // `hi,lo`
    expect(result.symbols.get('CODE')?.resolvedTo).toBe('lowOrder');    // `hi,lo`
    expect(result.symbols.get('FLAG')?.resolvedTo).toBe('lowOrder');    // bare `lo`
    const values = ['REC', 'NAME', 'CODE', 'FLAG'].map((name) => valueOf(result, name));
    expect(values).toEqual([600, 619, 623, 639]);
  });

  it('a blank operation field with no DA in front of it is F, not a silent no-op', () => {
    const result = walk([RUN_CARD, [[LABEL, 'ORPHAN'], [OPERAND, '1,4']]]);
    expect(lineOf(result, 2).flag).toBe('F');
  });
});

describe('pass 1 — the actual label (§6.1, software.md §1)', () => {
  it('defines the symbol at the HIGH-order position and MOVES NOTHING', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00700']],
      [[LABEL, '00700'], [OPERATION, 'DCW'], [OPERAND, '@ABCDE@']],
      [[LABEL, 'NEXT'], [OPERATION, 'H']],
    ]);
    // "This actual address refers to the high-order position of the instruction, constant, or
    // defined field" — so 00700 and not the constant's low-order 00704 — and "actual labels have
    // no effect on the address assignment counters", so NEXT is still 00705.
    expect(valueOf(result, '00700')).toBe(700);
    expect(result.symbols.get('00700')?.resolvedTo).toBe('highOrder');
    expect(lineOf(result, 3).addrs).toBe(700);
    expect(valueOf(result, 'NEXT')).toBe(705);
    expect(result.lines.every((line) => line.flag === undefined)).toBe(true);
  });

  it('ACTUAL_LABEL_IS_CHECKED_AGAINST_THE_COUNTER — a mismatch is F, and NOT an implicit ORG', () => {
    expect(ACTUAL_LABEL_IS_CHECKED_AGAINST_THE_COUNTER).toBe(true);
    const result = walk([
      RUN_CARD,
      [[LABEL, '00900'], [OPERATION, 'DCW'], [OPERAND, '@AB@']],
      [[LABEL, 'NEXT'], [OPERATION, 'H']],
    ]);
    expect(lineOf(result, 2).flag).toBe('F');
    expect(lineOf(result, 2).why).toContain('00500');
    // The counter did NOT jump to 00900: treating it as an ORG would contradict a [verified]
    // sentence. The constant sits where the counter was, and NEXT follows it.
    expect(lineOf(result, 2).addrs).toBe(500);
    expect(valueOf(result, 'NEXT')).toBe(502);
  });
});

describe('pass 1 — multiply-defined labels (§6.1, software.md §6)', () => {
  const duplicated = () => walk([
    RUN_CARD,
    [[LABEL, 'DUP'], [OPERATION, 'DCW'], [OPERAND, '@AB@']],     // 00500-00501, DUP = 00501
    [[LABEL, 'DUP'], [OPERATION, 'DCW'], [OPERAND, '@CD@']],     // 00502-00503, M
    [[LABEL, 'DUP'], [OPERATION, 'H']],                          // 00504, M again
    [[OPERATION, 'B'], [OPERAND, 'DUP']],                        // a REFERENCE — never flagged
  ]);

  it('MULTIPLY_DEFINED_KEEPS_THE_FIRST_VALUE — M on every later definition, first value stands', () => {
    expect(MULTIPLY_DEFINED_KEEPS_THE_FIRST_VALUE).toBe(true);
    const result = duplicated();
    expect(lineOf(result, 2).flag).toBeUndefined();
    expect(lineOf(result, 3).flag).toBe('M');
    expect(lineOf(result, 4).flag).toBe('M');
    expect(valueOf(result, 'DUP')).toBe(501);
    expect(result.symbols.get('DUP')?.definedAt).toBe(2);
    expect(result.symbols.get('DUP')?.duplicate).toBe(true);
  });

  it('a REFERENCE to a multiply-defined name assembles against the first value and is not flagged', () => {
    const result = duplicated();
    const emitted = pass2(result.sized, result.symbols, result.coreSize);
    const branch = emitted.statements.find((s) => s.seqno === 5);
    expect(branch?.flag).toBeUndefined();
    expect(branch?.instruction).toBe('J 00501  ');
  });
});

// ═══ ADDRS — ONE RULE (§6.1, §4's ListingLine.addrs comment) ════════════════════════════════

describe('ADDRS is ONE rule: the address a label on this statement WOULD resolve to', () => {
  it('is computed for UNLABELLED lines too — which is what makes it one rule and not two', () => {
    // Exhibit IV's SEQNO 37 (an instruction) and 38 (a constant) are both unlabelled and both
    // carry an ADDRS. Phrased as "this statement's own label" the rule is undefined for the
    // majority of lines.
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00192']],
      [[OPERATION, 'B'], [OPERAND, '00000']],        // 7 characters, 00192-00198, high-order
      [[OPERATION, 'DCW'], [OPERAND, '#5']],         // 5 positions, 00199-00203, low-order
    ]);
    expect(lineOf(result, 3).addrs).toBe(192);
    expect(lineOf(result, 4).addrs).toBe(203);
  });

  it('low-order for a constant, HIGH-order for an instruction, a DA header, an actual label and a column-7 label', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00600']],
      [[LABEL, 'INST'], [OPERATION, 'H']],                       // 00600, high
      [[LABEL, 'CONST'], [OPERATION, 'DCW'], [OPERAND, '@ABCD@']],  // 00601-00604, low = 00604
      [[INDENT, 'HIGH'], [OPERATION, 'DCW'], [OPERAND, '@ABCD@']],  // 00605-00608, HIGH = 00605
      [[LABEL, '00609'], [OPERATION, 'DCW'], [OPERAND, '@ABCD@']],  // 00609-00612, HIGH = 00609
      [[LABEL, 'AREA'], [OPERATION, 'DA'], [OPERAND, '1X10']],      // 00613-00622, HIGH = 00613
    ]);
    expect(valueOf(result, 'INST')).toBe(600);
    expect(valueOf(result, 'CONST')).toBe(604);
    expect(valueOf(result, 'HIGH')).toBe(605);
    expect(valueOf(result, '00609')).toBe(609);
    expect(valueOf(result, 'AREA')).toBe(613);
    expect(result.lines.every((line) => line.flag === undefined)).toBe(true);
  });

  it('COL7_INDENT_IS_STANDALONE_TOO — column 6 and column 7 are the whole difference', () => {
    expect(COL7_INDENT_IS_STANDALONE_TOO).toBe(true);
    const un = walk([RUN_CARD, [[LABEL, 'BUF'], [OPERATION, 'DS'], [OPERAND, '80']]]);
    const indented = walk([RUN_CARD, [[INDENT, 'BUF'], [OPERATION, 'DS'], [OPERAND, '80']]]);
    expect(valueOf(un, 'BUF')).toBe(579);
    expect(valueOf(indented, 'BUF')).toBe(500);
  });
});

// ═══ The SUFFIX_RULINGS — F, and the reservation stands (§2.2, §15) ════════════════════════

describe('FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS — the three SUFFIX_RULINGS rows (§2.2)', () => {
  it('is the constant this behaviour is named by', () => {
    expect(FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS).toBe(true);
  });

  it('DA `,G` and `,#` flag F — and still reserve, still assign, still advance', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00600']],
      [[LABEL, 'REC'], [OPERATION, 'DA'], [OPERAND, '1X80,G']],   // 80 + 1 group-mark position
      [[LABEL, 'FLD'], [OPERAND, '1,4']],
      [[LABEL, 'AFTER'], [OPERATION, 'H']],
    ]);
    expect(lineOf(result, 3).flag).toBe('F');
    expect(lineOf(result, 3).why).toContain('still reserved');
    expect(lineOf(result, 3).ct).toBe(81);
    expect(valueOf(result, 'REC')).toBe(600);
    expect(valueOf(result, 'FLD')).toBe(603);
    expect(valueOf(result, 'AFTER')).toBe(681);
    expect(result.reserved).toEqual([{ from: 600, to: 680, label: 'REC' }]);

    // `,#` reserves one record-mark position per area, and flags for a different reason: scope,
    // not format (§2.2's own note that the two halves of that row do not share a reason).
    const blocked = walk([
      RUN_CARD,
      [[LABEL, 'REC'], [OPERATION, 'DA'], [OPERAND, '3X10,#']],
      [[LABEL, 'AFTER'], [OPERATION, 'H']],
    ]);
    expect(lineOf(blocked, 2).flag).toBe('F');
    expect(lineOf(blocked, 2).ct).toBe(33);
    expect(valueOf(blocked, 'AFTER')).toBe(533);
  });

  it('DA `,0` and `,N` flag F and reserve exactly b x l — neither adds a position', () => {
    for (const suffix of ['0', 'N']) {
      const result = walk([
        RUN_CARD,
        [[LABEL, 'REC'], [OPERATION, 'DA'], [OPERAND, `1X80,${suffix}`]],
        [[LABEL, 'AFTER'], [OPERATION, 'H']],
      ]);
      expect(lineOf(result, 2).flag, suffix).toBe('F');
      expect(lineOf(result, 2).ct, suffix).toBe(80);
      expect(valueOf(result, 'AFTER'), suffix).toBe(580);
    }
  });

  it('DCW/DC `,G` flags F, reserves the group-mark position, and the label still names the CONSTANT', () => {
    // `software.md` §5: `,G` "places a group-mark-word-mark following the last character", and
    // "the associated label, if any, will refer to the last character of the constant, not the
    // group-mark word-mark".
    const result = walk([
      RUN_CARD,
      [[LABEL, 'MSG'], [OPERATION, 'DCW'], [OPERAND, '@ERROR@,G']],   // 5 + 1, 00500-00505
      [[LABEL, 'AFTER'], [OPERATION, 'H']],
    ]);
    expect(lineOf(result, 2).flag).toBe('F');
    expect(lineOf(result, 2).ct).toBe(6);
    expect(valueOf(result, 'MSG')).toBe(504);       // the constant's low-order, not 00505
    expect(valueOf(result, 'AFTER')).toBe(506);

    // The flag drops the MARK ONLY: five characters are still emitted, at the address pass 1
    // assigned (emit.ts's `constantCells`, the same ruling from the other side).
    const emitted = pass2(result.sized, result.symbols, result.coreSize);
    const constant = emitted.statements.find((s) => s.seqno === 2)?.items[0];
    expect(constant?.at).toBe(500);
    expect(constant?.cells).toHaveLength(5);
  });
});

// ═══ §11's wave-4 row — the four-defect deck ═══════════════════════════════════════════════

describe('a deck carrying all four defects returns U / M / O / F and never throws (§11)', () => {
  // `listing.ts` (wave 5) merges pass 1's flags with pass 2's; until it exists the merge is
  // written here, and it is §6.3's precedence and nothing else: O > F > M > U.
  const PRECEDENCE: readonly AsmFlag[] = ['O', 'F', 'M', 'U'];
  const merge = (a: AsmFlag | undefined, b: AsmFlag | undefined): AsmFlag | undefined => {
    for (const flag of PRECEDENCE) if (a === flag || b === flag) return flag;
    return undefined;
  };

  const BROKEN = [
    RUN_CARD,
    [[OPERATION, 'ORG'], [OPERAND, '00500']],
    [[LABEL, 'DUP'], [OPERATION, 'DCW'], [OPERAND, '@A@']],
    [[LABEL, 'DUP'], [OPERATION, 'DCW'], [OPERAND, '@B@']],       // M — multiply defined
    [[OPERATION, 'B'], [OPERAND, 'NOWHERE']],                     // U — undefined symbol
    [[OPERATION, 'FROB'], [OPERAND, 'DUP']],                      // O — invalid operation code
    [[OPERATION, 'B'], [OPERAND, '12X34']],                       // F — unparseable operand
    [[OPERATION, 'END'], [OPERAND, 'DUP']],
  ] as const;

  const assembled = (): {
    flags: (AsmFlag | undefined)[];
    statements: readonly EmittedStatement[];
    lines: readonly Pass1Line[];
  } => {
    const result = pass1(parse(deck(BROKEN)));
    const emitted = pass2(result.sized, result.symbols, result.coreSize);
    const flags = result.lines.map((line) => merge(
      line.flag,
      emitted.statements.find((s) => s.seqno === line.seqno)?.flag,
    ));
    return { flags, statements: emitted.statements, lines: result.lines };
  };

  it('EXACTLY four flagged lines, one of each letter, and nothing thrown', () => {
    expect(() => assembled()).not.toThrow();
    const { flags } = assembled();
    expect(flags.filter((flag) => flag !== undefined)).toEqual(['M', 'U', 'O', 'F']);
  });

  it('the deck still assembles everything it could: an O emits nothing and the listing survives', () => {
    const { statements, lines } = assembled();
    // The invalid operation code assembles NO characters — CT 0, ADDRS the current counter, no
    // emission — and the lines around it are untouched (§2.2's graceful-degradation paragraph).
    expect(statements.find((s) => s.seqno === 6)?.items).toEqual([]);
    const unknown = lines.find((line) => line.seqno === 6);
    expect(unknown?.ct).toBe(0);
    // The counter did not move across it: the line after the unknown operation carries the same
    // ADDRS. A macro call in a source deck therefore costs one flagged line and no addresses.
    expect(unknown?.addrs).toBe(509);
    expect(lines.find((line) => line.seqno === 7)?.addrs).toBe(509);
    expect(statements.find((s) => s.seqno === 5)?.instruction).toBe('J 00000  ');
    expect(statements).toHaveLength(8);
  });
});

describe('the post-walk back-patches obey the SAME precedence, O > F > M > U (§6.3)', () => {
  it('a pooled address constant that is both past core and undefined keeps its F', () => {
    // The narrow case the two `raise()` call sites exist for. The pool is flushed at END with the
    // counter at 09996: the five-position address constant crosses the 10K core CTL column 22
    // declares, so `advance()` flags `F` on the generated DCW's own line — and THEN the post-walk
    // rebuild finds `NOWHERE` undefined and would have overwritten it with `U`. Assigning the `U`
    // unconditionally would hide the one flag that says the program does not fit in the machine.
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'CTL'], [22, '1']],                     // 10K
      [[OPERATION, 'ORG'], [OPERAND, '09990']],
      [[OPERATION, 'MLC'], [OPERAND, '&NOWHERE']],
      [[OPERATION, 'END']],
    ]);
    const pooled = result.lines.find((line) => line.kind === 'literal');
    expect(pooled?.flag).toBe('F');
    expect(pooled?.why).toContain('10000-position core');
    // The value half is unchanged: an undefined target still resolves to 0 (asm-literals.test.ts).
    expect(result.symbols.has('NOWHERE')).toBe(false);
  });
});

// ═══ §10 — the demo's ladder ═══════════════════════════════════════════════════════════════

describe('demos/hello-dad.asm — §10\'s assembled ladder, every row', () => {
  const source = readFileSync('demos/hello-dad.asm', 'utf8');
  const build = (text: string = source): {
    p1: Pass1Result; statements: readonly EmittedStatement[]; cells: number;
  } => {
    const p1 = pass1(parse(text));
    const p2 = pass2(p1.sized, p1.symbols, p1.coreSize);
    return {
      p1,
      statements: p2.statements,
      cells: p2.items.reduce((total, item) => total + item.cells.length, 0),
    };
  };

  /** §10's table: ADDRS, the statement, and the assembled instruction. */
  const LADDER: readonly (readonly [number, Addr, string])[] = [
    [8, 500, 'L %10 00564 $'],
    [9, 510, 'R 00548 8'],
    [10, 517, 'R 00524 ⧧'],
    [11, 524, 'M %20 00564 W'],
    [12, 534, 'R 00541 ⧧'],
    [13, 541, 'J 00500  '],
    [14, 548, 'F 1'],
    [15, 550, 'R 00557 ⧧'],
    [16, 557, '.'],
  ];

  it('the nineteen cards produce nineteen listing lines and no literal pool at all', () => {
    const { p1 } = build();
    expect(parse(source)).toHaveLength(19);
    // `ID DCW @HELLO1@` is a DECLARATIVE'S CONSTANT, not a literal (§5.2 rule 3, §6.1). A pool
    // here would add a third object record and break §13's criteria 3 and 5.
    expect(p1.lines).toHaveLength(19);
    expect(p1.lines.some((line) => line.kind === 'literal')).toBe(false);
  });

  it('every ADDRS and every assembled instruction in §10\'s table', () => {
    const { p1, statements } = build();
    for (const [seqno, addrs, instruction] of LADDER) {
      expect(lineOf(p1, seqno).addrs, `SEQNO ${seqno} ADDRS`).toBe(addrs);
      expect(statements.find((s) => s.seqno === seqno)?.instruction, `SEQNO ${seqno}`)
        .toBe(instruction);
    }
    // CT is the assembled length, and it is what the ladder's spacing rests on.
    expect(LADDER.map(([seqno]) => lineOf(p1, seqno).ct)).toEqual([10, 7, 7, 10, 7, 7, 2, 7, 1]);
  });

  it('trap 1 — `ID DCW @HELLO1@`: the label resolves LOW-order to 00563, the word mark lands at 00558', () => {
    const { p1, statements } = build();
    expect(lineOf(p1, 17).addrs).toBe(563);
    expect(lineOf(p1, 17).ct).toBe(6);
    expect(valueOf(p1, 'ID')).toBe(563);
    expect(p1.symbols.get('ID')?.resolvedTo).toBe('lowOrder');

    // A one-character halt reads out to the next word mark (`opcodes.md` §2's `.` row), so the
    // mark DCW sets in the position immediately right of the halt at 00557 is what bounds it.
    const constant = statements.find((s) => s.seqno === 17)?.items[0];
    expect(constant?.at).toBe(558);
    expect((constant?.cells[0] ?? 0) & WM).toBe(WM);
    expect(constant?.cells.slice(1).every((cell) => (cell & WM) === 0)).toBe(true);
  });

  it('trap 2 — ` LINE` is indented to column 7, so it is 00564 and not 00643', () => {
    const { p1 } = build();
    expect(lineOf(p1, 18).addrs).toBe(564);
    expect(lineOf(p1, 18).ct).toBe(80);
    expect(valueOf(p1, 'LINE')).toBe(564);
    expect(p1.reserved).toEqual([{ from: 564, to: 643, label: 'LINE' }]);

    // THE COUNTERFACTUAL: the same source with the label un-indented reads 00643, and every read
    // would land past the end of its own buffer.
    const unindented = source.replace('\n01180 LINE', '\n01180LINE ');
    expect(unindented).not.toBe(source);
    expect(valueOf(build(unindented).p1, 'LINE')).toBe(643);
  });

  it('trap 4 — `BA1 *+1` is the fall-through, because the asterisk is the LAST character of its own instruction', () => {
    const { statements } = build();
    // A 7-character `R` at 00517 ends at 00523, so `*` is 00523 and `*+1` is 00524.
    expect(statements.find((s) => s.seqno === 10)?.instruction).toBe('R 00524 ⧧');
    expect(statements.find((s) => s.seqno === 12)?.instruction).toBe('R 00541 ⧧');
    expect(statements.find((s) => s.seqno === 15)?.instruction).toBe('R 00557 ⧧');
  });

  it('sixty-four emitted cells, ten word-marked fields, zero flags, and the entry point from END', () => {
    const { p1, statements, cells } = build();
    expect(cells).toBe(64);

    const marked = pass2(p1.sized, p1.symbols, p1.coreSize).items
      .flatMap((item) => [...item.cells].filter((cell) => (cell & WM) !== 0));
    expect(marked).toHaveLength(10);

    // "ok-equivalent": every line clean on BOTH passes. `assemble()`'s own `ok` is wave 6's.
    expect(p1.lines.filter((line) => line.flag !== undefined)).toEqual([]);
    expect(statements.filter((s) => s.flag !== undefined)).toEqual([]);

    expect(p1.entry).toBe(500);
    expect(p1.ident).toBe('HDAD1');
    expect(p1.coreSize).toBe(10_000);
    expect(p1.wantsLoader).toBe(true);
  });

  it('EXACTLY ONE warning, and it names 00564 inside LINE (§13 criterion 2)', () => {
    const { p1 } = build();
    const emitted = pass2(p1.sized, p1.symbols, p1.coreSize);
    const packed = pack(emitted.items, p1.reserved);
    expect(packed.warnings).toEqual([
      'the last record\'s GM-WM lands at 00564, inside LINE — a read with d = `R` will transfer '
      + 'nothing; use `$`',
    ]);
    // The designed outcome, not a defect: it is §10's trap 3 stated by the packer, and the demo
    // is correct precisely because the read carries `$` (CARD_DOLLAR_SUPPRESSES_GM_WM_TEST).
    expect(packed.records.map((r) => [r.loadAddress, r.payload.length])).toEqual([[500, 52], [552, 12]]);
  });

  it('the 60-column budget closes record 1 at 00551 — the break is the budget, not a gap', () => {
    const { p1 } = build();
    const emitted = pass2(p1.sized, p1.symbols, p1.coreSize);
    const packed = pack(emitted.items, p1.reserved);
    const first = packed.records[0];
    if (first === undefined) throw new Error('no first record');

    // The emission is CONTIGUOUS across the break — 00551 and 00552 are consecutive addresses —
    // so nothing but the column budget could have closed it. Counted here rather than taken from
    // `pack.ts`: a marked cell costs two columns, an ordinary one costs one (§8.3).
    expect(first.loadAddress + first.payload.length - 1).toBe(551);
    const columns = [...first.payload].reduce((n, cell) => n + ((cell & WM) !== 0 ? 2 : 1), 0);
    expect(columns).toBe(60);
    expect(emitted.items.some((item) => item.at <= 552 && item.at + item.cells.length > 552)).toBe(true);
  });

  it('the five report cards are a byte-exact copy of the Phase-2 deck', () => {
    // `demos/hello-dad.data.cards` duplicates lines 2-6 of `demos/hello-dad.cards`, which is a
    // Phase-2 artifact Phase 3 may not modify. The duplication is GUARDED, not commented.
    const hand = readFileSync('demos/hello-dad.cards', 'utf8').split('\n').slice(1, 6);
    const copied = readFileSync('demos/hello-dad.data.cards', 'utf8').split('\n').filter((l) => l !== '');
    expect(copied).toHaveLength(5);
    expect(copied).toEqual(hand);
  });

  it('the source file is column-exact where §10 says it is', () => {
    const cards = source.split('\n').filter((line) => line !== '');
    expect(cards).toHaveLength(19);
    for (const line of cards) expect(line.length).toBeLessThanOrEqual(80);
    // Card 1: `AUTOCODER` in columns 6-14 with 15 blank, so RUN starts in column 16.
    expect(cards[0]?.slice(5, 14)).toBe('AUTOCODER');
    expect(cards[0]?.[14]).toBe(' ');
    expect(cards[0]?.slice(15, 18)).toBe('RUN');
    // Card 2 is EXACTLY 80 columns with the ident in 76-80 — a 79-column card would punch `DAD1`
    // into columns 76-80 of every condensed card (§10).
    expect(cards[1]).toHaveLength(80);
    expect(cards[1]?.slice(75, 80)).toBe('HDAD1');
    // Card 3: operand column 21 blank, column 22 = the core-size code.
    expect(cards[2]?.[20]).toBe(' ');
    expect(cards[2]?.[21]).toBe('1');
    // Card 18's label begins in column 7.
    expect(cards[17]?.[5]).toBe(' ');
    expect(cards[17]?.[6]).toBe('L');
  });

  it('the six cells at 00558 spell HELLO1 — the same characters the hand deck punched', () => {
    // Phase 2's hand-punched card 1 holds `{0-5-8}HELLO1` at 00076; the assembler puts the same
    // six characters, with the same single high-order word mark, at 00558 (§10 trap 1).
    const { p1 } = build();
    const emitted = pass2(p1.sized, p1.symbols, p1.coreSize);
    const constant = emitted.items.find((item) => item.at === 558);
    expect([...(constant?.cells ?? [])].map((cell) => glyphOf(cell & BCD6)).join('')).toBe('HELLO1');
  });
});
