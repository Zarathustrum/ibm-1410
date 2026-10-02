// Tier 2 — pass 2: address encoding, storage application, and emission
// (docs/plans/phase-3-autocoder.md §8.1, §8.2, §6.2; wave 2).
//
// WAVE 2 HAS NO PARSER. Every case below is driven from HAND-BUILT `Statement` / `SymbolTable`
// data — the wave-1 types — and never from source text: `source.ts` and `operand.ts` are wave 3
// and `symbols.ts` is wave 4, and the build order is deliberately backwards from the consumer so
// that emission is proved before a single source card is parsed (plan §11).
//
// THE ENCODER'S ONLY ORACLE IS THE SHIPPED DECODER. `encodeAddress` is Phase-3-owned because
// `src/core/address.ts` exports no encoder and keeps its tag-weight constants module-private
// (§8.1), so the weights exist twice in this repo — once there, once in `emit.ts`. What keeps
// them from drifting is that this file NEVER states them: it round-trips every tag 0-15 through
// the shipped `decodeAddress`, and pins the two tagged addresses already sitting in the shipped
// `src/formats/loader.ts` (`00A?0` at 00318, `00?!0` at 00330). If the weights ever move, one
// test fails and not two tables.

import { describe, expect, it } from 'vitest';

import { decodeAddress } from '../src/core/address.js';
import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { WORD_SEPARATOR } from '../src/core/channel.js';
import { GROUP_MARK_BCD } from '../src/core/move.js';
import { CoreStorage } from '../src/core/storage.js';
import { BCD6, WM, type Addr } from '../src/core/types.js';
import { CONDENSED_LOADER_PROGRAM } from '../src/formats/loader.js';
import { decodeObjectRecord, encodeObjectRecord } from '../src/formats/objectdeck.js';
import {
  ADDRESS_LENGTH, AssemblerBug, ONE_FLAG_PER_LISTING_LINE, applyToStorage, checkAssembledLength,
  encodeAddress, pass2, type SizedStatement,
} from '../src/asm/emit.js';
import { pack } from '../src/asm/pack.js';
import { resolve } from '../src/asm/mnemonics.js';
import type {
  AddressKind, EmittedItem, Literal, Operand, Statement, SymbolEntry, SymbolTable,
} from '../src/asm/types.js';

// ─── Hand-built fixtures: the wave-1 types, filled in by hand ────────────────────────────────

const code = (glyph: string): number => {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`"${glyph}" is not one of the 64`);
  return c;
};

/** Cells from a glyph string; `^` before a glyph marks it. Notation for tests only. */
function cells(text: string): Uint8Array {
  const out: number[] = [];
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '^') { i += 1; out.push(WM | code(chars[i] ?? '')); } else { out.push(code(chars[i] ?? '')); }
  }
  return Uint8Array.from(out);
}

/** The inverse, for reading an assertion failure: `^` marks a marked cell. */
function show(bytes: Uint8Array): string {
  let text = '';
  for (const cell of bytes) text += ((cell & WM) !== 0 ? '^' : '') + glyphOf(cell & BCD6);
  return text;
}

function operand(kind: AddressKind, text: string, init: Partial<Operand> = {}): Operand {
  return { kind, text, adjust: 0, tag: 0, tagWritten: false, ...init };
}

function statement(init: Partial<Statement>): Statement {
  return {
    seqno: 1,
    card: ''.padEnd(80),
    pglin: '01010',
    comment: false,
    label: '',
    labelIndented: false,
    labelIsActual: false,
    op: '',
    operands: [],
    comment_text: '',
    ...init,
  };
}

function symbols(entries: readonly (readonly [string, number, Partial<SymbolEntry>?])[]): SymbolTable {
  return new Map(entries.map(([name, value, extra]) => [name, {
    name,
    value,
    kind: 'instruction',
    resolvedTo: 'highOrder',
    definedAt: 1,
    duplicate: false,
    ...extra,
  }] as const));
}

const NO_SYMBOLS: SymbolTable = new Map();

/** One imperative, sized by hand the way pass 1 will size it. */
function sized(at: Addr, length: number, init: Partial<Statement>): SizedStatement {
  return { statement: statement(init), at, length };
}

/** What one statement emitted, as a `^`-marked string, plus its listing INSTRUCTION column. */
function assemble(entry: SizedStatement, table: SymbolTable = NO_SYMBOLS, coreSize = 10_000): {
  text: string; instruction: string | undefined; flag: string | undefined; why: string | undefined;
} {
  const result = pass2([entry], table, coreSize);
  const line = result.statements[0];
  const item = line?.items[0];
  return {
    text: item === undefined ? '' : show(item.cells),
    instruction: line?.instruction,
    flag: line?.flag,
    why: line?.why,
  };
}

// ═══ §8.1 — the address encoder, verified ONLY by round trip ═══════════════════════════════

describe('encodeAddress ↔ the SHIPPED decodeAddress (plan §8.1)', () => {
  // Boundaries of every decimal place, plus samples: the values where a carry, a zero digit or a
  // top-of-core address could hide a transposed weight.
  const VALUES: readonly number[] = [
    0, 1, 9, 10, 11, 99, 100, 101, 500, 552, 564, 999, 1000, 1001, 9999,
    10_000, 12_345, 20_000, 56_789, 79_999, 80_000, 99_998, 99_999,
  ];

  it('round-trips every value for ALL SIXTEEN tags, and every result is a valid address', () => {
    const storage = new CoreStorage(10_000);
    const wrong: string[] = [];
    for (let tag = 0; tag <= 15; tag++) {
      for (const value of VALUES) {
        const encoded = encodeAddress(value, tag);
        expect(encoded).toHaveLength(ADDRESS_LENGTH);
        for (const [i, cell] of encoded.entries()) storage.setChar(i, cell & BCD6, false);
        const decoded = decodeAddress(storage, 0);
        if (decoded.value !== value || decoded.tag !== tag || !decoded.valid) {
          wrong.push(
            `${value} tag ${tag} -> "${show(encoded)}" -> `
            + `${decoded.value} tag ${decoded.tag} valid ${String(decoded.valid)}`,
          );
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('zone bits land ONLY over the tens and hundreds, which is what makes them legal at all', () => {
    // architecture.md §4 (A22-0526-3 p.8): a zone bit in the units, thousands or ten-thousands
    // position makes the address invalid — `decodeAddress` reports it as `valid: false`, so the
    // sweep above already covers it. This is the direct statement of the same thing.
    for (let tag = 0; tag <= 15; tag++) {
      const encoded = encodeAddress(99_999, tag);
      for (const i of [0, 1, 4]) {
        expect(glyphOf(encoded[i] ?? 0), `position ${i} of tag ${tag} carries no zone`).toBe('9');
      }
    }
  });

  it('the two tagged addresses in the SHIPPED loader: `00A?0` and `00?!0`', () => {
    // §8.1's two pins, and they are not ours: loader.ts's `D 00350 00A?0 7` at 00318 plants the
    // GM-WM at PAYLD + count through index register 15, and `D 00100 00?!0 Δ` at 00330 moves the
    // payload to the card's load address through index register 14.
    expect(show(encodeAddress(100, 15))).toBe('00A?0');
    expect(show(encodeAddress(0, 14))).toBe('00?!0');

    const plant = CONDENSED_LOADER_PROGRAM.find((f) => f.at === 318);
    const move = CONDENSED_LOADER_PROGRAM.find((f) => f.at === 330);
    expect(plant?.text).toBe(`D00350${show(encodeAddress(100, 15))}7`);
    expect(move?.text).toBe(`D00100${show(encodeAddress(0, 14))}Δ`);
  });
});

// ═══ §6.3 — AssemblerBug, and the ANY_LENGTH sentinel ══════════════════════════════════════

describe('AssemblerBug and the ANY_LENGTH sentinel (plan §6.1, §6.3)', () => {
  it('`NOP` carries the EMPTY ARRAY, and no length throws on it', () => {
    // table.ts:88's ANY_LENGTH is the empty array, and `N` is the one op that carries it. A naive
    // `lengths.includes(n)` would throw on every NOP in a source deck — which is the trap this
    // assertion exists to keep sprung.
    const nop = resolve('NOP');
    expect(nop?.opChar).toBe('N');
    expect(nop?.lengths).toEqual([]);
    if (nop === undefined) throw new Error('NOP does not resolve');
    for (const length of [1, 2, 6, 7, 11, 12, 40]) {
      expect(() => checkAssembledLength(nop, length, 1)).not.toThrow();
    }
  });

  it('an op with real lengths throws AssemblerBug on a length it does not carry', () => {
    const branch = resolve('B');
    if (branch === undefined) throw new Error('B does not resolve');
    expect(branch.opChar).toBe('J');
    expect(branch.lengths).toEqual([1, 7]);
    expect(() => checkAssembledLength(branch, 7, 9)).not.toThrow();
    expect(() => checkAssembledLength(branch, 6, 9)).toThrow(AssemblerBug);
    expect(() => checkAssembledLength(branch, 6, 9)).toThrow(/assembled 6 characters/);
  });
});

// ═══ §11.1 — applyToStorage, the closed loop's left-hand side ══════════════════════════════

describe('applyToStorage writes the payload cells and NOTHING else (plan §11.1)', () => {
  const ITEMS: readonly EmittedItem[] = [
    { at: 500, cells: cells('^AB^CD'), seqno: 1 },
    { at: 508, cells: cells('^E'), seqno: 2 },
  ];

  it('every emitted cell, character and word mark, and no other position touched', () => {
    const storage = new CoreStorage(10_000);
    applyToStorage(ITEMS, storage);

    const written = new Map<Addr, string>([
      [500, '^A'], [501, 'B'], [502, '^C'], [503, 'D'], [508, '^E'],
    ]);
    const seen: string[] = [];
    for (let a = 495; a <= 515; a++) {
      const cell = storage.read(a);
      const blank = (cell & BCD6) === 0 && (cell & WM) === 0;
      if (!blank) seen.push(`${a}: ${((cell & WM) !== 0 ? '^' : '') + glyphOf(cell & BCD6)}`);
    }
    expect(seen).toEqual([...written].map(([a, text]) => `${a}: ${text}`));
  });

  it('writes through `setChar`, so C is recomputed and nothing is poked raw', () => {
    const calls: string[] = [];
    applyToStorage(ITEMS, { setChar: (a, bcd6, wm) => { calls.push(`${a} ${glyphOf(bcd6)} ${String(wm)}`); } });
    expect(calls).toEqual([
      '500 A true', '501 B false', '502 C true', '503 D false', '508 E true',
    ]);
  });
});

// ═══ §8.2 / §6.2 — emission, statement by statement ════════════════════════════════════════

describe('pass 2 emits an imperative: op char word-marked, then the fields the form takes', () => {
  it('`R1W 0,LINE,$` at 00500 -> `L %10 00564 $` (the demo\'s first instruction)', () => {
    // §10's ladder, and §13 criterion 4. The x-control field is operand 1 of the ONLY form whose
    // lengths are [10]. `operand.ts` BUILDS it out of the mnemonic and the stacker pocket
    // (2026-08-31); this file works one step downstream, where it is copied through and never
    // resolved (§5.2 step 3 rule 1) — which is why the fixture still states it directly.
    const got = assemble(
      sized(500, 10, {
        label: 'LOOP',
        op: 'R1W',
        operands: [operand('xcontrol', '%10'), operand('symbolic', 'LINE', { symbol: 'LINE' })],
        d: '$',
      }),
      symbols([['LINE', 564]]),
    );
    expect(got.text).toBe('^L%1000564$');
    expect(got.instruction).toBe('L %10 00564 $');
    expect(got.flag).toBeUndefined();
  });

  it('`BEF1 EOJ` -> `R 00548 8`, the d BAKED INTO THE MNEMONIC', () => {
    const got = assemble(
      sized(510, 7, { op: 'BEF1', operands: [operand('symbolic', 'EOJ', { symbol: 'EOJ' })] }),
      symbols([['EOJ', 548]]),
    );
    expect(got.text).toBe('^R005488');
    expect(got.instruction).toBe('R 00548 8');
  });

  it('`BA1 *+1` at 00517 -> `R 00524 ⧧` — the asterisk is the LAST character of its own instruction', () => {
    // software.md §2 `[verified]`, §10 trap 4: a 7-character `R` at 00517 ends at 00523, so its
    // fall-through is `*+1` = 00524 and not `*+7`. The hand deck's `R00042⧧` at 00035 is the
    // published check of the same arithmetic.
    const got = assemble(sized(517, 7, {
      op: 'BA1',
      operands: [operand('asterisk', '*&1', { adjust: 1 })],
    }));
    expect(got.text).toBe('^R00524⧧');
    expect(got.instruction).toBe('R 00524 ⧧');
  });

  it('`MLCB AR80,IDENT#5` -> `D 00394 00306 L` — Exhibit IV, through the DERIVED move table', () => {
    // C28-0326-2 Appendix C Exhibit IV (software.md §5). The `L` falls out of
    // MOVE_MNEMONIC_IS_DIR_PORTION_TERM, so this row tests the derivation and the field order,
    // not a transcription.
    const got = assemble(
      sized(192, 12, {
        op: 'MLCB',
        operands: [
          operand('symbolic', 'AR80', { symbol: 'AR80' }),
          operand('symbolic', 'IDENT', { symbol: 'IDENT' }),
        ],
      }),
      symbols([['AR80', 394], ['IDENT', 306]]),
      20_000,
    );
    expect(got.text).toBe('^D0039400306L');
    expect(got.instruction).toBe('D 00394 00306 L');
  });

  it('`CC1 1` -> `F 1`: the carriage d is the only operand, and there is no address at all', () => {
    const got = assemble(sized(548, 2, { op: 'CC1', d: '1' }));
    expect(got.text).toBe('^F1');
    expect(got.instruction).toBe('F 1');
  });

  it('`H` -> `.`, one character, word-marked', () => {
    const got = assemble(sized(557, 1, { op: 'H' }));
    expect(got.text).toBe('^.');
    expect(got.instruction).toBe('.');
  });

  it('an INDEX TAG renders as the tagged digit\'s own glyph in the INSTRUCTION column', () => {
    // §4's `instruction` comment: "a zone-tagged digit renders as its glyph, which is what the
    // manual prints (`D 030Y9 00140 C`)". Here index register 15 over 00100 gives `00A?0`, the
    // shipped loader's own field.
    const got = assemble(
      sized(600, 6, { op: 'A', operands: [operand('symbolic', 'BASE&X15', { symbol: 'BASE', tag: 15, tagWritten: true })] }),
      symbols([['BASE', 100]]),
    );
    expect(got.text).toBe('^A00A?0');
    expect(got.instruction).toBe('A 00A?0');
  });

  it('a SYMBOLIC TAG resolves through an index EQU, which is why parse and resolve are two passes', () => {
    const got = assemble(
      sized(600, 6, { op: 'A', operands: [operand('symbolic', 'BASE&IX', { symbol: 'BASE', tagSymbol: 'IX', tagWritten: true })] }),
      symbols([['BASE', 100], ['IX', 0, { kind: 'equate', indexRegister: 14 }]]),
    );
    // Tag 14 = B+A over the hundreds and B alone over the tens, which over the digits of 00100
    // gives `A` (digit 1 + BA) and `!` (digit 0 + B). `!` and `‡` differ by exactly which zone
    // bit they carry, and picking the wrong one selects index register 13 (loader.ts's note).
    expect(got.text).toBe('^A00A!0');
  });

  it('the SUMMED adjustment, not the last term (software.md §2)', () => {
    const got = assemble(
      sized(600, 6, { op: 'A', operands: [operand('symbolic', 'BASE&3-12&35', { symbol: 'BASE', adjust: 3 - 12 + 35 })] }),
      symbols([['BASE', 500]]),
    );
    expect(got.text).toBe('^A00526');
  });
});

describe('pass 2 flags are DATA on a line, never a throw (plan §6.3)', () => {
  it('an undefined symbol is `U` with VALUE 0, so every later address stays right', () => {
    const got = assemble(sized(541, 7, { op: 'B', operands: [operand('symbolic', 'LOOP', { symbol: 'LOOP' })] }));
    expect(got.flag).toBe('U');
    expect(got.why).toBe('LOOP is not defined');
    expect(got.text).toBe('^J00000 ');
    // §10's table prints this as `J 00500 ␣`: the field separator, then the BLANK d, which
    // `table.ts`'s `J` row requires to be present — loader.ts's `J00281 ` says the same thing.
    expect(got.instruction).toBe('J 00000  ');
  });

  it('an address past the CTL core size is `F`, and the line still assembles', () => {
    const got = assemble(
      sized(500, 6, { op: 'A', operands: [operand('actual', '12000', { actual: 12_000 })] }),
      NO_SYMBOLS,
      10_000,
    );
    expect(got.flag).toBe('F');
    expect(got.why).toBe('address 12000 is outside the 10000-position core (CTL column 22)');
    expect(got.text).toBe('^A12000');
  });

  it('an unknown operation is `O`, CT 0 and no emission — a macro call does not crash', () => {
    const result = pass2([sized(500, 0, { op: 'GET' })], NO_SYMBOLS, 10_000);
    expect(result.statements[0]?.flag).toBe('O');
    expect(result.statements[0]?.items).toEqual([]);
    expect(result.items).toEqual([]);
  });

  it('a malformed x-control field is `F` and does NOT reach AssemblerBug', () => {
    // §6.3: source content can never reach the one internal invariant. A two-character x-control
    // field assembles seven characters where the form carries ten — the length check has to stand
    // down on a flagged line, or a mistyped operand would crash the assembler.
    const entry = sized(500, 10, {
      op: 'R1W',
      operands: [operand('xcontrol', '%1'), operand('symbolic', 'LINE', { symbol: 'LINE' })],
      d: '$',
    });
    expect(() => pass2([entry], symbols([['LINE', 564]]), 10_000)).not.toThrow();
    expect(assemble(entry, symbols([['LINE', 564]])).flag).toBe('F');
  });

  it('a chainable op written with no address is the CHAINED form: op alone, d chained too', () => {
    // §6.1's shape ladder, row 1. `B` bakes a blank d, so without the chained rule a bare `B`
    // would assemble two characters — a length op `J` does not carry — and throw.
    const got = assemble(sized(500, 1, { op: 'B' }));
    expect(got.text).toBe('^J');
    expect(got.instruction).toBe('J');
  });

  it('ONE flag per line, precedence O > F > M > U', () => {
    // Both an undefined symbol (U) and an out-of-core address (F) on one line: the FLAG column
    // has one position, so F wins (ONE_FLAG_PER_LISTING_LINE, §15).
    const got = assemble(
      sized(500, 11, {
        op: 'A',
        operands: [
          operand('symbolic', 'NOPE', { symbol: 'NOPE' }),
          operand('actual', '99000', { actual: 99_000 }),
        ],
      }),
      NO_SYMBOLS,
      10_000,
    );
    expect(got.flag).toBe('F');
  });
});

describe('pass 2 emits declaratives per §8.2\'s table', () => {
  const hello: Literal = {
    kind: 'alphameric', text: '@HELLO1@', cells: cells('^HELLO1'), pooled: false,
  };

  it('DCW: the constant\'s cells, word mark on the HIGH-order position', () => {
    // §10 trap 1: `ID DCW @HELLO1@` occupies 00558-00563, the mark is at 00558, and the label
    // resolves LOW-order to 00563 — which is pass 1's business, not this one's.
    const got = assemble(sized(558, 6, { label: 'ID', op: 'DCW', operands: [operand('literal', '@HELLO1@', { literal: hello })] }));
    expect(got.text).toBe('^HELLO1');
    // INSTRUCTION is the EMITTED CONSTANT, rendered as glyphs. §4 says blank only for a
    // declarative that emits NOTHING, and Exhibit IV's SEQNO 39 (`DCW AREA`, CT 5 at ADDRS
    // 00208) prints its emitted five characters `00315` in this column (software.md §5,
    // C28-0326-2 p.57). The word mark is not shown — the manual prints no marks here.
    expect(got.instruction).toBe('HELLO1');
  });

  it('DC: the same cells with NO word mark (and load mode clears the marks over its extent)', () => {
    const got = assemble(sized(558, 6, { op: 'DC', operands: [operand('literal', '@HELLO1@', { literal: hello })] }));
    expect(got.text).toBe('HELLO1');
    expect(got.instruction).toBe('HELLO1');
  });

  it('DCW `#5`: five blank characters, which is why Exhibit IV\'s SEQNO 38 reads empty', () => {
    // The same rule from the other side (software.md §5): a blank constant emits five blanks, so
    // its INSTRUCTION column renders five blanks and the cell looks empty on the page — which is
    // exactly what the transcribed row shows. Not `undefined`: it emitted something.
    const blanks: Literal = { kind: 'alphameric', text: '#5', cells: cells('^     '), pooled: false };
    const got = assemble(sized(199, 5, { op: 'DCW', operands: [operand('literal', '#5', { literal: blanks })] }));
    expect(got.instruction).toBe('     ');
    expect(got.instruction?.trim()).toBe('');
  });

  it('DS: NOTHING is emitted, and the area is not cleared', () => {
    // software.md §5 verbatim (C28-0326-2 p.30): "no information is entered into the area, no
    // word mark is assigned by the processor, and the area is not cleared prior to reservation".
    // Absence IS the gap: there is no `present` bitmap, and pack.ts reads the hole directly.
    const result = pass2([sized(564, 80, { label: 'LINE', op: 'DS', operands: [operand('actual', '80', { actual: 80 })] })], NO_SYMBOLS);
    expect(result.items).toEqual([]);
    expect(result.statements[0]?.items).toEqual([]);
    // …and INSTRUCTION is blank, which is §4's own sentence: a declarative that emits NOTHING.
    expect(result.statements[0]?.instruction).toBeUndefined();
  });

  it('EQU: nothing emitted, nothing moved', () => {
    const result = pass2([sized(216, 0, { label: 'EOF', op: 'EQU', operands: [operand('asterisk', '*')] })], NO_SYMBOLS);
    expect(result.items).toEqual([]);
    expect(result.statements[0]?.instruction).toBeUndefined();
  });

  it('DA: one marked blank per defined field high-order, and NOTHING ELSE', () => {
    // DA_EMITS_ONLY_ITS_MARKED_POSITIONS (§15): the condensed format cannot set a word mark
    // without storing a character, so this is as close to C28-0309-1's silence as it gets.
    // Exhibit IV's `DA 1X80,G` at 00315 has its sub-entries at 00318 and 00394.
    const result = pass2(
      [{ statement: statement({ label: 'AREA', op: 'DA', seqno: 7 }), at: 315, length: 81, daFields: [318, 394] }],
      NO_SYMBOLS,
    );
    expect(result.items.map((i) => i.at)).toEqual([318, 394]);
    for (const item of result.items) {
      expect(show(item.cells)).toBe('^ ');
      expect(item.seqno).toBe(7);
    }
    // INSTRUCTION stays blank on a DA, and Exhibit IV's own DA row is why: SEQNO 64,
    // `AREA DA 1X80,G` at ADDRS 00315 with CT 81, prints nothing in INSTRUCTION (nor in CARD).
    // What it emits is marked BLANKS at non-contiguous addresses, so rendering them would print
    // blanks anyway (DA_EMITS_ONLY_ITS_MARKED_POSITIONS, §8.2).
    expect(result.statements[0]?.instruction).toBeUndefined();
  });

  it('a pooled literal emits DCW-style at the address the flush gave it', () => {
    const result = pass2(
      [{
        statement: statement({ seqno: 59, op: '' }),
        at: 302,
        length: 6,
        pooled: { kind: 'alphameric', text: '@ABC@', cells: cells('ABC'), pooled: true },
      }],
      NO_SYMBOLS,
    );
    expect(result.items).toHaveLength(1);
    expect(show(result.items[0]?.cells ?? new Uint8Array())).toBe('^ABC');
    expect(result.items[0]?.at).toBe(302);
    // A processor-generated DCW is an EMITTING declarative, so it renders like one.
    expect(result.statements[0]?.instruction).toBe('ABC');
  });

  it('a DCW address constant resolves to five positions (`DCW LABEL&10`, software.md §5)', () => {
    const got = assemble(
      sized(700, 5, { op: 'DCW', operands: [operand('symbolic', 'LOOP&10', { symbol: 'LOOP', adjust: 10 })] }),
      symbols([['LOOP', 500]]),
    );
    expect(got.text).toBe('^00510');
    // Exhibit IV's SEQNO 39 exactly: a `DCW` address constant prints its five emitted characters.
    expect(got.instruction).toBe('00510');
  });

  it('a comment card and a non-emitting control emit nothing and never flag', () => {
    const result = pass2(
      [
        { statement: statement({ seqno: 4, comment: true, card: '*  A COMMENT'.padEnd(80) }), at: 500, length: 0 },
        sized(500, 0, { seqno: 7, op: 'ORG', operands: [operand('actual', '00500', { actual: 500 })] }),
        sized(500, 0, { seqno: 19, op: 'END', operands: [operand('symbolic', 'LOOP', { symbol: 'LOOP' })] }),
      ],
      NO_SYMBOLS,
    );
    expect(result.items).toEqual([]);
    expect(result.statements.map((s) => s.flag)).toEqual([undefined, undefined, undefined]);
  });
});

describe('pass 2 keeps the emission in SOURCE order, which is what pack() then cuts', () => {
  it('items come back in emission order with their statement seqnos', () => {
    const result = pass2(
      [
        sized(500, 1, { seqno: 1, op: 'H' }),
        sized(501, 1, { seqno: 2, op: 'NOP' }),
        sized(502, 2, { seqno: 3, op: 'CC1', d: '1' }),
      ],
      NO_SYMBOLS,
    );
    expect(result.items.map((i) => [i.at, i.seqno])).toEqual([[500, 1], [501, 2], [502, 3]]);
    expect(result.items.map((i) => show(i.cells))).toEqual(['^.', '^N', '^F1']);
  });
});

// ═══ §6.3 — an operand list that makes no form the op carries is `F`, never a bug ═══════════

describe('the operand SHAPE is a source defect: `F` with the slot named, never AssemblerBug', () => {
  // THE BLOCKER THIS BLOCK EXISTS FOR. A non-chainable op with a BLANK operand field assembles
  // the op alone, or the op and a baked d — a length none of `CC1` (op `F`, [2]),
  // `R1W` (op `L`, [10]) or `SSF1` (op `K`, [2]) carries. Before the shape check that reached
  // `checkAssembledLength` and THREW, and §6.3 is explicit that source content never can: errors
  // are DATA on a listing line. The converse family — one operand too many — is the same defect
  // read from the other end and is closed the same way.

  // The third column is what SURVIVES the flag: the characters the emitter could still build,
  // op character first — which is why the op needs no column of its own.
  const BLANK_OPERAND: readonly (readonly [string, string, string])[] = [
    ['CC1', 'the d', '^F'],                                        // carriage: op + d, 2
    // I/O: op + xc + addr + d, 10. The d is NOT in the gap list, and it IS in the emission —
    // since 2026-08-31 the mnemonic BAKES it (`R` to read, C28-0309-1 pp.47-48), so `R1W` alone
    // assembles the op and the d and what is missing is the x-control field and the address.
    ['R1W', 'the 3-position x-control field, the address', '^LR'],
    ['SSF1', 'the d', '^K'],                                       // stacker: op + d, 2
  ];

  for (const [mnemonic, gaps, cells] of BLANK_OPERAND) {
    it(`\`${mnemonic}\` with a BLANK operand field is ONE F and no throw`, () => {
      const entry = sized(500, 2, { op: mnemonic });
      expect(() => pass2([entry], NO_SYMBOLS, 10_000)).not.toThrow();

      const result = pass2([entry], NO_SYMBOLS, 10_000);
      const line = result.statements[0];
      expect(line?.flag).toBe('F');
      expect(line?.why).toContain('operand missing');
      expect(line?.why).toContain(gaps);
      expect(result.statements.filter((one) => one.flag !== undefined)).toHaveLength(1);

      // THE EMISSION: the op character, word-marked, plus whatever else did not depend on the
      // missing operands — the flag drops only what could not be BUILT. The item still lands at
      // pass 1's address, so the reservation and the addressing stand (FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS's spirit, §15; §2.2's DA `,G`
      // row is the same ruling on a declarative).
      expect(result.items).toHaveLength(1);
      expect(show(result.items[0]?.cells ?? new Uint8Array())).toBe(cells);
      expect(result.items[0]?.at).toBe(500);
      expect(line?.at).toBe(500);
    });
  }

  it('TOO MANY operands is the same defect from the other end: `H 00500,00600`', () => {
    // `H` is op `.` with lengths [1, 6] — chained, or one address. Two addresses assemble eleven
    // characters, which reached the same throw.
    const entry = sized(500, 1, {
      op: 'H',
      operands: [
        operand('actual', '00500', { actual: 500 }),
        operand('actual', '00600', { actual: 600 }),
      ],
    });
    expect(() => pass2([entry], NO_SYMBOLS, 10_000)).not.toThrow();

    const got = assemble(entry);
    expect(got.flag).toBe('F');
    expect(got.why).toContain('too many operands');
    expect(got.why).toContain("op '.' carries 1 (op alone, everything chained); 6 (op + one address)");
    // Everything written is still emitted, so the defect is visible in the INSTRUCTION column
    // rather than truncated into a plausible-looking 6-character instruction.
    expect(got.text).toBe('^.0050000600');
    expect(got.instruction).toBe('. 00500 00600');
  });

  it('the shape check does NOT fire on a form the op carries, and ANY_LENGTH takes every shape', () => {
    expect(assemble(sized(500, 2, { op: 'CC1', d: '1' })).flag).toBeUndefined();
    expect(assemble(sized(500, 1, { op: 'NOP' })).flag).toBeUndefined();
    // `NOP` carries ANY_LENGTH — the empty array — so no shape can be wrong on it (§6.1).
    const nop = assemble(sized(500, 6, {
      op: 'NOP',
      operands: [operand('actual', '00600', { actual: 600 })],
    }));
    expect(nop.flag).toBeUndefined();
    expect(nop.text).toBe('^N00600');
  });

  it('a line with ONLY a U flag STILL passes through the length check (the stand-down is narrow)', () => {
    // FIX for the wide stand-down: an undefined symbol cannot change an assembled length —
    // `lookup` substitutes 0 precisely so five characters are still pushed — so a `U` must not
    // stand the invariant down. THE OBSERVABLE: two undefined symbols on a `B` assemble twelve
    // characters, a length op `J` ([1, 7]) does not carry. The line earns `U` twice AND the
    // shape `F`; if the checks had stood down on "any flag at all" the shape would never have
    // been looked at and the line would report `U`. F over U is ONE_FLAG_PER_LISTING_LINE.
    const got = assemble(sized(500, 12, {
      op: 'B',
      operands: [
        operand('symbolic', 'NOPE', { symbol: 'NOPE' }),
        operand('symbolic', 'ALSONOPE', { symbol: 'ALSONOPE' }),
      ],
    }));
    expect(got.flag).toBe('F');
    expect(got.why).toContain('too many operands');
    expect(ONE_FLAG_PER_LISTING_LINE, 'the precedence O > F > M > U, pinned by name').toBe(true);

    // And a `U` line whose shape IS a form the op carries passes both checks untouched.
    const clean = assemble(sized(541, 7, { op: 'B', operands: [operand('symbolic', 'LOOP', { symbol: 'LOOP' })] }));
    expect(clean.flag).toBe('U');
    expect(clean.text).toBe('^J00000 ');
  });

  it('a DROPPING F stands the checks down, and is still the ONLY flag on the line', () => {
    // The other half of the narrowing: a malformed x-control field suppresses three characters
    // the form calls for, so neither the shape nor the length says anything true about what was
    // assembled. One flag, and it is the one that names the real defect.
    const got = assemble(
      sized(500, 10, {
        op: 'R1W',
        operands: [operand('xcontrol', '%1'), operand('symbolic', 'LINE', { symbol: 'LINE' })],
        d: '$',
      }),
      symbols([['LINE', 564]]),
    );
    expect(got.flag).toBe('F');
    expect(got.why).toBe('the x-control field is always 3 positions; "%1" is 2');
  });
});

// ═══ §8.1 / §8.3 — the two cell shapes the object deck cannot carry MARKED ══════════════════

describe('a marked GROUP MARK or WORD SEPARATOR high-order is `F`, and the mark alone is dropped', () => {
  // THE ROUTE THIS BLOCK CLOSES. `encodeObjectRecord` REFUSES a word-marked group mark
  // (OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK) and a marked word separator (C28-0309-1 Figure 2's
  // NOTE, verbatim — software.md §8.1), and it refuses them by THROWING. §8.3 is explicit that
  // "the packer must never hand it a record it will reject", and a throw out of the encoder is
  // not one of the four flags — so the assembler has to be unable to build one. `constantCells`
  // is where the only mark this file decides is set, so it is where the route closes: flag `F`,
  // emit the character UNMARKED, and leave the reservation and every address standing (plan
  // §2.2's DCW/DC `,G` row, §2.4).

  const CASES: readonly (readonly [string, string, number, string])[] = [
    ['a GROUP MARK', '⧧', GROUP_MARK_BCD, 'OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK'],
    ['a WORD SEPARATOR', '⌒', WORD_SEPARATOR, 'Word separator characters cannot be loaded'],
  ];

  for (const [name, glyph, code, cited] of CASES) {
    it(`${name} high-order: F, cells present UNMARKED, and the deck round-trips`, () => {
      const constant: Literal = {
        kind: 'alphameric', text: `@${glyph}AB@`, cells: cells(`^${glyph}AB`), pooled: false,
      };
      const entry = sized(700, 3, { label: 'GM', op: 'DCW', operands: [operand('literal', constant.text, { literal: constant })] });

      const result = pass2([entry], NO_SYMBOLS, 10_000);
      const line = result.statements[0];
      expect(line?.flag).toBe('F');
      expect(line?.why).toContain(cited);
      expect(line?.why).toContain('software.md §8.1');

      // The CELLS are all there, at the address pass 1 gave them; only the MARK is gone.
      const item = result.items[0];
      expect(item?.at).toBe(700);
      expect(show(item?.cells ?? new Uint8Array())).toBe(`${glyph}AB`);
      expect((item?.cells[0] ?? 0) & BCD6).toBe(code);
      expect((item?.cells[0] ?? 0) & WM).toBe(0);

      // AND THE POINT: pack -> encode -> decode now completes. The marked shape is what the
      // encoder throws on, which is asserted below so this is not a vacuous round trip.
      const { records } = pack(result.items, []);
      expect(records).toHaveLength(1);
      const round = decodeObjectRecord(encodeObjectRecord(records[0] ?? { loadAddress: 0, payload: new Uint8Array() }));
      expect([...round.payload]).toEqual([...(item?.cells ?? [])]);
      expect(round.loadAddress).toBe(700);
    });
  }

  it('the encoder really does refuse the marked shape — so the round trip above is not vacuous', () => {
    for (const code of [GROUP_MARK_BCD, WORD_SEPARATOR]) {
      expect(() => encodeObjectRecord({
        loadAddress: 700,
        payload: Uint8Array.from([WM | code, bcdOfGlyph('A') as number]),
      })).toThrow();
    }
  });

  it('a DC does not flag: it sets no mark at all, so the pattern cannot arise (§8.2)', () => {
    const constant: Literal = {
      kind: 'alphameric', text: '@⧧AB@', cells: cells('^⧧AB'), pooled: false,
    };
    const got = assemble(sized(700, 3, { op: 'DC', operands: [operand('literal', '@⧧AB@', { literal: constant })] }));
    expect(got.flag).toBeUndefined();
    expect(got.text).toBe('⧧AB');
  });

  it('a POOLED literal takes the same route — it is a processor-generated DCW (§8.2)', () => {
    const result = pass2(
      [{
        statement: statement({ seqno: 59, op: '' }),
        at: 302,
        length: 4,
        pooled: { kind: 'alphameric', text: '@⧧AB@', cells: cells('^⧧AB'), pooled: true },
      }],
      NO_SYMBOLS,
    );
    expect(result.statements[0]?.flag).toBe('F');
    expect(show(result.items[0]?.cells ?? new Uint8Array())).toBe('⧧AB');
  });
});
