// The literal pool — what pools, in what order, and where it lands
// (docs/plans/phase-3-autocoder.md §6.1, `software.md` §3; wave 4).
//
// Every case is observed through the ADDRESSES the pool hands out, because that is the only thing
// a pool is: `operand.ts` already built the cells, and pass 2 already knows how to emit a DCW. The
// four rules under test are ENCOUNTER ORDER, the dedup sizes, what a DECLARATIVE's own constant
// does (nothing — it never pools), and where the flush puts them.
//
// The last case is the trap wave 3 named a wave in advance: an address-constant literal's cells
// are a five-blank PLACEHOLDER at parse, and pass 1 has to rebuild them from the finished symbol
// table. A pipeline that read `Literal.cells` straight through would emit five blanks into core
// and lose the address silently — which is why the test reads the EMITTED CELLS and not the
// literal.

import { describe, expect, it } from 'vitest';

import { glyphOf } from '../src/core/bcd.js';
import { BCD6, WM, type Addr } from '../src/core/types.js';
import { pass2 } from '../src/asm/emit.js';
import { LiteralPool } from '../src/asm/literals.js';
import { parse } from '../src/asm/operand.js';
import { pass1, type Pass1Result } from '../src/asm/symbols.js';

const LABEL = 6, OPERATION = 16, OPERAND = 21;

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

const walk = (cards: readonly (readonly (readonly [number, string])[])[]): Pass1Result =>
  pass1(parse(deck(cards)));

const RUN_CARD = [[LABEL, 'AUTOCODER'], [OPERATION, 'RUN']] as const;

/** Every pooled line pass 1 produced: the literal as written, where it landed, how long it is. */
const pooled = (result: Pass1Result): { text: string; at: Addr; length: number }[] =>
  result.sized
    .filter((entry) => entry.pooled !== undefined)
    .map((entry) => ({ text: entry.pooled?.text ?? '', at: entry.at, length: entry.length }));

// ═══ The four kinds, and which of them deduplicate ═════════════════════════════════════════

describe('the four literal kinds pool in ENCOUNTER order (software.md §3)', () => {
  it('numeric, alphameric, area-defining and address-constant, in the order they were written', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00600']],
      [[LABEL, 'TARGET'], [OPERATION, 'H']],                       // 00600
      [[OPERATION, 'A'], [OPERAND, '&123']],                       // numeric,  3
      [[OPERATION, 'A'], [OPERAND, '@ABCD@']],                     // alpha,    4
      [[OPERATION, 'MLC'], [OPERAND, 'WORK#6,TARGET']],            // area,     6
      [[OPERATION, 'MLC'], [OPERAND, '&TARGET,TARGET']],           // address,  5
      [[OPERATION, 'LTORG'], [OPERAND, '*']],
    ]);
    // 00601 + 6 + 6 + 12 + 12 = 00637 is where the four instructions leave the counter, and the
    // pool follows in the order the operands were encountered — not sorted, not grouped by kind.
    expect(pooled(result)).toEqual([
      { text: '&123', at: 637, length: 3 },
      { text: '@ABCD@', at: 640, length: 4 },
      { text: 'WORK#6', at: 644, length: 6 },
      { text: '&TARGET', at: 650, length: 5 },
    ]);
  });

  it('a pooled literal enters the symbol table under its OWN TEXT, and an area literal under its label too', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'MLC'], [OPERAND, 'WKAREA#6,@AB@']],
      [[OPERATION, 'LTORG'], [OPERAND, '*']],
    ]);
    // `emit.ts`'s `operandValue` looks a `literal` operand up under `Literal.text`; there is no
    // collision with a program's own names, because `WKAREA#6` and `@AB@` are names no source can
    // write in a label field (§5.2 rule 9).
    const area = result.symbols.get('WKAREA#6');
    expect(area?.value).toBe(517);      // 00512-00517, low-order
    expect(area?.kind).toBe('literal');
    expect(area?.resolvedTo).toBe('lowOrder');
    // "The label resolves to the LOW-order position" — `software.md` §3's worked example.
    expect(result.symbols.get('WKAREA')?.value).toBe(517);
    expect(result.symbols.get('@AB@')?.value).toBe(519);
  });
});

describe('deduplication is by kind and size (software.md §3)', () => {
  it('a ≤9-digit numeric and a 1-9-character alphameric are pooled ONCE per section', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'A'], [OPERAND, '&123456789']],
      [[OPERATION, 'A'], [OPERAND, '@NINECHARS@']],
      [[OPERATION, 'A'], [OPERAND, '&123456789']],       // the same literal, written again
      [[OPERATION, 'A'], [OPERAND, '@NINECHARS@']],      // and again
      [[OPERATION, 'LTORG'], [OPERAND, '*']],
    ]);
    expect(pooled(result).map((p) => p.text)).toEqual(['&123456789', '@NINECHARS@']);
  });

  it('a LONGER literal is allocated on EACH occurrence — ten digits and ten characters', () => {
    // `software.md` §3 draws the line at nine: "≤9 digits + sign are pooled once per program
    // section; longer literals are allocated on each occurrence", and the same for 1-9 alphameric
    // characters.
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'A'], [OPERAND, '&1234567890']],
      [[OPERATION, 'A'], [OPERAND, '@TENCHARSXX@']],
      [[OPERATION, 'A'], [OPERAND, '&1234567890']],
      [[OPERATION, 'A'], [OPERAND, '@TENCHARSXX@']],
      [[OPERATION, 'LTORG'], [OPERAND, '*']],
    ]);
    expect(pooled(result).map((p) => p.text))
      .toEqual(['&1234567890', '@TENCHARSXX@', '&1234567890', '@TENCHARSXX@']);
    // The second copy holds the same characters by construction, so both references resolve to
    // the first and the extra copy is dead storage — never a multiply-defined flag.
    expect(result.lines.every((line) => line.flag === undefined)).toBe(true);
  });

  it('an area-defining literal never deduplicates — two work areas of the same size are two areas', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'MLC'], [OPERAND, 'ONE#6,TWO#6']],
      [[OPERATION, 'LTORG'], [OPERAND, '*']],
    ]);
    const pool = pooled(result);
    expect(pool).toHaveLength(2);
    expect(pool[0]?.at).not.toBe(pool[1]?.at);
    expect(result.symbols.get('ONE')?.value).toBe(517);
    expect(result.symbols.get('TWO')?.value).toBe(523);
  });
});

describe('a constant written as a DECLARATIVE\'s operand NEVER pools (§6.1)', () => {
  it('DCW, DC, DS and DA operands contribute nothing to the pool', () => {
    const result = walk([
      RUN_CARD,
      [[LABEL, 'ID'], [OPERATION, 'DCW'], [OPERAND, '@HELLO1@']],
      [[LABEL, 'PAD'], [OPERATION, 'DC'], [OPERAND, '#4']],
      [[LABEL, 'BUF'], [OPERATION, 'DS'], [OPERAND, '10']],
      [[LABEL, 'REC'], [OPERATION, 'DA'], [OPERAND, '1X10']],
      [[OPERATION, 'END'], [OPERAND, 'ID']],
    ]);
    // A literal IS a request for a processor-generated DCW, so pooling a DCW's own operand would
    // generate a SECOND copy of the constant at the flush point — which on the demo lands past
    // 00643, adds a third object record and breaks §13's criteria 3 and 5 (§6.1).
    expect(pooled(result)).toEqual([]);
    expect(result.lines.some((line) => line.kind === 'literal')).toBe(false);
  });

  it('the same `@…@` in an IMPERATIVE does pool — the classification is identical, the ruling is not', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'MLC'], [OPERAND, '@HELLO1@,00600']],
      [[OPERATION, 'END'], [OPERAND, '00500']],
    ]);
    expect(pooled(result).map((p) => p.text)).toEqual(['@HELLO1@']);
  });
});

describe('the flush: LTORG at the operand address, END if no LTORG did (software.md §2, §3)', () => {
  it('LTORG assigns at its OPERAND address, and `*` means the counter', () => {
    const atOperand = walk([
      RUN_CARD,
      [[OPERATION, 'A'], [OPERAND, '@AB@']],
      [[OPERATION, 'LTORG'], [OPERAND, '00800']],
    ]);
    expect(pooled(atOperand)).toEqual([{ text: '@AB@', at: 800, length: 2 }]);

    const atCounter = walk([
      RUN_CARD,
      [[OPERATION, 'A'], [OPERAND, '@AB@']],       // 00500-00505
      [[OPERATION, 'LTORG'], [OPERAND, '*']],
    ]);
    expect(pooled(atCounter)).toEqual([{ text: '@AB@', at: 506, length: 2 }]);
  });

  it('the counter continues PAST the pool, so the next statement follows the literals', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'A'], [OPERAND, '@ABCDE@']],       // 00500-00505
      [[OPERATION, 'LTORG'], [OPERAND, '*']],         // pool at 00506-00510
      [[LABEL, 'AFTER'], [OPERATION, 'H']],
    ]);
    expect(result.symbols.get('AFTER')?.value).toBe(511);
  });

  it('END flushes whatever is still pending when no LTORG has (software.md §3)', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'A'], [OPERAND, '@AB@']],          // 00500-00505
      [[LABEL, 'STOP'], [OPERATION, 'H']],            // 00506
      [[OPERATION, 'END'], [OPERAND, 'STOP']],
    ]);
    expect(pooled(result)).toEqual([{ text: '@AB@', at: 507, length: 2 }]);
    expect(result.entry).toBe(506);
  });

  it('a section is bounded by the flush: literals written after an LTORG go to the END pool', () => {
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'A'], [OPERAND, '@AB@']],          // 00500-00505
      [[OPERATION, 'LTORG'], [OPERAND, '*']],         // 00506-00507
      [[OPERATION, 'A'], [OPERAND, '@CD@']],          // 00508-00513
      [[OPERATION, 'END'], [OPERAND, '00500']],
    ]);
    expect(pooled(result)).toEqual([
      { text: '@AB@', at: 506, length: 2 },
      { text: '@CD@', at: 514, length: 2 },
    ]);
  });

  it('an area-defining literal label DIES at the flush and may be redefined without an M', () => {
    // `software.md` §2: "Area-defining-literal labels die at each LTORG/SPEND and must be
    // redefined." The pool forgets them, so the second section's `WKAREA#6` is a NEW allocation
    // rather than a deduplicated hit, and its line carries no flag.
    const result = walk([
      RUN_CARD,
      [[OPERATION, 'MLC'], [OPERAND, 'WKAREA#6,00600']],
      [[OPERATION, 'LTORG'], [OPERAND, '*']],
      [[OPERATION, 'MLC'], [OPERAND, 'WKAREA#6,00600']],
      [[OPERATION, 'END'], [OPERAND, '00500']],
    ]);
    const pool = pooled(result);
    expect(pool).toHaveLength(2);
    expect(pool[0]?.at).not.toBe(pool[1]?.at);
    expect(result.lines.filter((line) => line.flag !== undefined)).toEqual([]);
  });

  it('the pool is emptied by the flush — the same `LiteralPool` collects the next section', () => {
    // The unit under the deck-level cases above, driven directly.
    const pool = new LiteralPool();
    const [first, second] = parse(deck([
      [[OPERATION, 'A'], [OPERAND, '@AB@']],
      [[OPERATION, 'A'], [OPERAND, '@CD@']],
    ]));
    if (first === undefined || second === undefined) throw new Error('two statements expected');
    pool.note(first);
    expect(pool.pending).toHaveLength(1);
    expect(pool.flush(700).map((a) => [a.literal.text, a.at])).toEqual([['@AB@', 700]]);
    expect(pool.pending).toEqual([]);
    pool.note(second);
    expect(pool.flush(800).map((a) => [a.literal.text, a.at])).toEqual([['@CD@', 800]]);
  });
});

// ═══ The address-constant rebuild — wave 3's named trap ════════════════════════════════════

describe('the address-constant literal is REBUILT from the finished symbol table (software.md §3)', () => {
  const built = (cards: readonly (readonly (readonly [number, string])[])[]) => {
    const p1 = walk(cards);
    return { p1, p2: pass2(p1.sized, p1.symbols, p1.coreSize) };
  };

  it('`&LABEL` emits the five-digit address of LABEL, UNSIGNED, word-marked high-order', () => {
    const { p1, p2 } = built([
      RUN_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00700']],
      [[OPERATION, 'MLC'], [OPERAND, '&TARGET,00600']],     // 00700-00711
      [[LABEL, 'TARGET'], [OPERATION, 'H']],                // 00712 — a FORWARD reference
      [[OPERATION, 'END'], [OPERAND, 'TARGET']],
    ]);
    const constant = p2.items.find((item) => item.at === 713);
    expect(constant).toBeDefined();
    // FIVE BLANKS WOULD PASS A WEAKER TEST: read the emitted cells, not the parsed literal.
    expect([...(constant?.cells ?? [])].map((cell) => glyphOf(cell & BCD6)).join('')).toBe('00712');
    expect((constant?.cells[0] ?? 0) & WM).toBe(WM);
    expect([...(constant?.cells ?? [])].slice(1).every((cell) => (cell & WM) === 0)).toBe(true);
    // Unsigned in core storage: no zone over the units position.
    expect((constant?.cells[4] ?? 0) & ~BCD6 & ~WM).toBe(0);
    expect(p1.lines.every((line) => line.flag === undefined)).toBe(true);
  });

  it('the REFERENCE addresses the generated DCW, and adjustment moves the ADDRESS not the VALUE', () => {
    const { p2 } = built([
      RUN_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00700']],
      [[OPERATION, 'MLC'], [OPERAND, '&TARGET&2,00600']],   // 00700-00711
      [[LABEL, 'TARGET'], [OPERATION, 'H']],                // 00712
      [[OPERATION, 'END'], [OPERAND, 'TARGET']],
    ]);
    // The literal lands at 00713-00717 and resolves LOW-order to 00717; the `+2` is an adjustment
    // on THE ADDRESS OF THE LITERAL, so the A-address is 00719 while the constant still holds
    // 00712 (`software.md` §3, verbatim).
    expect(p2.statements.find((s) => s.seqno === 3)?.instruction).toBe('D 00719 00600 C');
    const constant = p2.items.find((item) => item.at === 713);
    expect([...(constant?.cells ?? [])].map((cell) => glyphOf(cell & BCD6)).join('')).toBe('00712');
  });

  it('an address constant naming nothing is U on the pooled line, and emits 00000', () => {
    const { p1, p2 } = built([
      RUN_CARD,
      [[OPERATION, 'MLC'], [OPERAND, '&NOWHERE,00600']],
      [[OPERATION, 'END'], [OPERAND, '00500']],
    ]);
    const pooledLine = p1.lines.find((line) => line.kind === 'literal');
    expect(pooledLine?.flag).toBe('U');
    expect(pooledLine?.why).toContain('NOWHERE');
    // Value 0 on a miss, exactly as `emit.ts`'s `lookup` does it: one flagged line, and every
    // later address still right (§6.2 step 1).
    const constant = p2.items.find((item) => item.at === (pooledLine?.addrs ?? 0) - 4);
    expect([...(constant?.cells ?? [])].map((cell) => glyphOf(cell & BCD6)).join('')).toBe('00000');
  });

  it('the pooled address constant is what pass 2 emits — not the five-blank placeholder', () => {
    // The placeholder is observable: `operand.ts` builds it and `pass1` replaces it. If a future
    // change loses the rebuild, this fails on the glyphs and not on an address.
    const { p2 } = built([
      RUN_CARD,
      [[LABEL, 'HERE'], [OPERATION, 'H']],
      [[OPERATION, 'MLC'], [OPERAND, '&HERE,00600']],
      [[OPERATION, 'END'], [OPERAND, 'HERE']],
    ]);
    const cells = p2.items.at(-1)?.cells ?? new Uint8Array();
    expect([...cells].map((cell) => glyphOf(cell & BCD6)).join('')).not.toBe('     ');
    expect([...cells].map((cell) => glyphOf(cell & BCD6)).join('')).toBe('00500');
  });
});
