// The listing and its 1403 rendering — docs/plans/phase-3-autocoder.md §9, §12.1 T2, §11 wave 5.
//
// Two files under test and one seam between them: `listing.ts` decides WHAT prints and
// `listing1403.ts` decides WHERE, so every case below either reads a `ListingLine` field or reads
// a print position, and none reads both to prove the same thing.
//
// THE THING THIS FILE IS THE ONLY GUARD FOR: the listing applies the chain ITSELF. `renderGreenBar`
// renders text verbatim and `chainGlyph` lives in the device write path a listing never enters
// (`printer1403.ts`), so a listing built without the mapping would look right — plain ASCII in,
// plain ASCII out — and be wrong in exactly the places a period reader would notice: the stored
// `&` that a person typed as `+`, the twelve codes neither 48-character chain can print, and
// `BNT1`'s substitute-blank d, which prints the record-mark slug and not a blank.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { BCD_TABLE, glyphOf } from '../src/core/bcd.js';
import {
  DEFAULT_CARRIAGE_TAPE, PRINT_POSITIONS, chainGlyph, type PrintChain,
} from '../src/core/devices/printer1403.js';
import { pass2 } from '../src/asm/emit.js';
import {
  JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80, LISTING_LINES_PER_PAGE,
  LISTING_TRAILER_FOLLOWS_THE_OS_FORM, buildListing,
} from '../src/asm/listing.js';
import { LISTING_COLUMN_STOPS, formatListing, renderListing } from '../src/asm/listing1403.js';
import { parse } from '../src/asm/operand.js';
import { pack, type PackResult } from '../src/asm/pack.js';
import { pass1 } from '../src/asm/symbols.js';
import type { ListingLine } from '../src/asm/types.js';
import { encodeObjectRecord, type ObjectRecord } from '../src/formats/objectdeck.js';
import { withIdent } from '../src/asm/assemble.js';

/**
 * §12.3, and greppable on purpose. NO STANDALONE 1410 AUTOCODER LISTING WITH PUBLISHED OUTPUT
 * SURVIVES — the CC01A PDF is 38 scanned pages with no OCR text layer and `a.job`'s provenance is
 * unestablished (`emulators.md` §4, §9; plan §12.3) — so `test/golden/hello-dad.lst` is a fixture
 * this emulator constructed, `[observed]` at best and never period truth (`research/METHOD.md`).
 * The golden says so in its own last line, and this constant is the same statement in the test.
 */
const LISTING_GOLDEN_IS_CONSTRUCTED = true;

/** The label the golden carries, so the artefact is self-describing (`listing.ts`). */
const CONSTRUCTED_LABEL = 'CONSTRUCTED LISTING, NOT PERIOD OUTPUT';

const COMMENT_COLUMN = 6, LABEL = 6, OPERATION = 16, OPERAND = 21, IDENT = 76;

/** One 80-column source card from `[column, text]` pairs — `asm-literals.test.ts`'s helper. */
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

const RUN_CARD = [[LABEL, 'AUTOCODER'], [OPERATION, 'RUN']] as const;
const JOB_CARD = [[OPERATION, 'JOB'], [OPERAND, 'LISTING UNDER TEST'], [IDENT, 'TEST1']] as const;

/**
 * `parse -> pass1 -> pass2 -> pack -> listing`, composed here exactly as `tools/asm.ts` and
 * `tier3-asm-load-equals-memory.test.ts` compose it: `assemble()` is wave 6 (plan §3.3).
 */
function listingOf(text: string): readonly ListingLine[] {
  const p1 = pass1(parse(text));
  const p2 = pass2(p1.sized, p1.symbols, p1.coreSize);
  const packed = pack(p2.items, p1.reserved);
  return buildListing(p1, p2, packed.cardOf);
}

/** Columns 73-80 of a record AS PUNCHED — the sequence and the ident, read off the real card. */
const sequenceAndIdent = (record: ObjectRecord): string =>
  [...encodeObjectRecord(record).slice(72, 80)].map(glyphOf).join('');

/**
 * The OBJECT half of `tools/asm.ts`'s pipeline — `parse -> pass1 -> pass2 -> pack -> withIdent`,
 * composed here exactly as `listingOf` composes the paper half. `withIdent` is imported from the
 * CLI because that is where §8.3's ident/RESEQ map lives until wave 6 moves it into
 * `src/asm/assemble.ts`; when it moves, this import moves with it and the assertions do not
 * change. Importing `tools/asm.ts` runs no CLI — its entry guard compares `import.meta.url`
 * against `process.argv[1]`, which under vitest is the runner (`trace-diff.test.ts`'s precedent).
 */
function punchedDeck(text: string): { packed: PackResult; cards: readonly string[] } {
  const statements = parse(text);
  const p1 = pass1(statements);
  const p2 = pass2(p1.sized, p1.symbols, p1.coreSize);
  const packed = pack(p2.items, p1.reserved);
  return { packed, cards: withIdent(packed.records, statements, p2.items).map(sequenceAndIdent) };
}

/** Every glyph the chain can put on paper, blanks included — `bcd.ts`'s 64 codes, mapped. */
const printable = (chain: PrintChain): ReadonlySet<string> =>
  new Set(BCD_TABLE.map((entry) => chainGlyph(entry.bcd, chain)));

/** 1-based print positions, inclusive — the way the column stops are written. */
const at = (text: string, from: number, to: number): string => text.slice(from - 1, to);

const stopOf = (name: string): { from: number; to: number } => {
  const hit = LISTING_COLUMN_STOPS.find((stop) => stop.name === name);
  if (hit === undefined) throw new Error(`no column stop named ${name}`);
  return { from: hit.from, to: hit.to };
};

/** The rendered 132 positions of the listing line at `index` — `formatListing` is 1:1 with it. */
function positionsOf(
  lines: readonly ListingLine[], index: number, chain: PrintChain = 'A',
): string {
  const line = formatListing(lines, { chain })[index];
  if (line === undefined) throw new Error(`no rendered line at index ${index}`);
  return line.text;
}

const indexOfSeqno = (lines: readonly ListingLine[], seqno: number): number =>
  lines.findIndex((line) => line.kind !== 'heading' && line.seqno === seqno);

const DEMO = readFileSync('demos/hello-dad.asm', 'utf8');

// ═══ The golden — the same comparison the CLI gate makes ═══════════════════════════════════

describe('test/golden/hello-dad.lst — CONSTRUCTED, and the fifth gate line (plan §12.2, §12.3)', () => {
  it('is declared constructed here and labelled constructed in the artefact itself', () => {
    expect(LISTING_GOLDEN_IS_CONSTRUCTED).toBe(true);
    expect(readFileSync('test/golden/hello-dad.lst', 'utf8')).toContain(CONSTRUCTED_LABEL);
  });

  it('matches the demo listing byte for byte', () => {
    // Byte for byte, exactly as `npm run asm -- … --golden` compares it: the same string, and the
    // gate that fails a commit is the CLI's, not this one. Both run on every commit from wave 5.
    expect(renderListing(listingOf(DEMO))).toBe(readFileSync('test/golden/hello-dad.lst', 'utf8'));
  });
});

// ═══ The 132 positions of a 1403 Model 2 ═══════════════════════════════════════════════════

describe('every rendered line fits the paper and prints on the chain (§9)', () => {
  it('no line exceeds 132 print positions, on either chain', () => {
    for (const chain of ['A', 'H'] as const) {
      for (const line of formatListing(listingOf(DEMO), { chain })) {
        expect(line.text.length).toBeLessThanOrEqual(PRINT_POSITIONS);
      }
    }
  });

  it('every rendered character is one of bcd.ts\'s 64 AS PRINTED through the selected chain', () => {
    // Blanks included: twelve of the 64 codes have no slug on a 48-character chain and print as
    // one blank position (`charset.md` §5), so the allowed set is the IMAGE of the 64 under
    // `chainGlyph` and not the 64 glyphs themselves.
    for (const chain of ['A', 'H'] as const) {
      const allowed = printable(chain);
      for (const line of formatListing(listingOf(DEMO), { chain })) {
        for (const ch of line.text) expect(allowed.has(ch)).toBe(true);
      }
    }
  });

  it('a character outside the 64 is an assembler bug, not a source diagnostic', () => {
    const rogue: ListingLine = {
      seqno: 1, pglin: '', label: '', opcod: '', operand: 'lower case', kind: 'comment',
    };
    expect(() => formatListing([rogue])).toThrow(/not one of bcd.ts's 64 glyphs/);
  });
});

// ═══ The column stops — OPEN: LISTING_COLUMN_STOPS ═════════════════════════════════════════

describe('LISTING_COLUMN_STOPS — §9\'s stops over console-and-physical.md §12\'s column SET', () => {
  it('is exactly the ten stops the plan publishes, in order', () => {
    expect(LISTING_COLUMN_STOPS).toEqual([
      { name: 'SEQNO', from: 1, to: 5 },
      { name: 'PGLIN', from: 7, to: 11 },
      { name: 'LABEL', from: 13, to: 22 },
      { name: 'OPCOD', from: 24, to: 28 },
      { name: 'OPERAND', from: 30, to: 81 },
      { name: 'CT', from: 84, to: 86 },
      { name: 'ADDRS', from: 88, to: 92 },
      { name: 'INSTRUCTION', from: 95, to: 112 },
      { name: 'CARD', from: 115, to: 117 },
      { name: 'FLAG', from: 120, to: 120 },
    ]);
  });

  it('puts each field of a real assembled line at its own start column', () => {
    // `LOOP R1W 0,LINE,$` — the demo's first instruction, SEQNO 8, on object card 001.
    const lines = listingOf(DEMO);
    const text = positionsOf(lines, indexOfSeqno(lines, 8));
    expect(at(text, stopOf('SEQNO').from, stopOf('SEQNO').to)).toBe('    8');
    expect(at(text, stopOf('PGLIN').from, stopOf('PGLIN').to)).toBe('01080');
    expect(at(text, stopOf('LABEL').from, stopOf('LABEL').to)).toBe('LOOP      ');
    expect(at(text, stopOf('OPCOD').from, stopOf('OPCOD').to)).toBe('R1W  ');
    expect(at(text, stopOf('OPERAND').from, stopOf('OPERAND').from + 7)).toBe('0,LINE,$');
    expect(at(text, stopOf('CT').from, stopOf('CT').to)).toBe(' 10');
    expect(at(text, stopOf('ADDRS').from, stopOf('ADDRS').to)).toBe('00500');
    expect(at(text, stopOf('INSTRUCTION').from, stopOf('INSTRUCTION').from + 12)).toBe('L %10 00564 $');
    expect(at(text, stopOf('CARD').from, stopOf('CARD').to)).toBe('001');
    expect(at(text, stopOf('FLAG').from, stopOf('FLAG').to)).toBe(' ');
  });
});

// ═══ The chain, applied by the listing itself (§9's binding paragraph) ═════════════════════

describe('the listing applies the chain (charset.md §5, §5.1)', () => {
  it('the stored `&` — the 12-punch a person typed as `+` — prints `&` on A and `+` on H', () => {
    // `BA1 *+1` is stored `*&1` (SOURCE_PLUS_IS_THE_12_PUNCH, `source.ts`), SEQNO 10 in the demo.
    const lines = listingOf(DEMO);
    const index = indexOfSeqno(lines, 10);
    const operand = stopOf('OPERAND');
    expect(at(positionsOf(lines, index, 'A'), operand.from, operand.from + 2)).toBe('*&1');
    expect(at(positionsOf(lines, index, 'H'), operand.from, operand.from + 2)).toBe('*+1');
  });

  it('`ƀ` prints the record-mark slug `‡` in INSTRUCTION on BOTH chains — the BNT1 trap', () => {
    // `dmods.ts`'s SUBSTITUTE-BLANK TRAP: BNT1's d IS `ƀ`, and `ƀ` is NOT among the codes neither
    // chain prints — it strikes the record-mark slug. A listing that blanked it would look right.
    const lines = listingOf(deck([
      RUN_CARD, JOB_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00500']],
      [[LABEL, 'HERE'], [OPERATION, 'BNT1'], [OPERAND, 'HERE']],
      [[OPERATION, 'END'], [OPERAND, 'HERE']],
    ]));
    const index = indexOfSeqno(lines, 4);
    const instruction = stopOf('INSTRUCTION');
    for (const chain of ['A', 'H'] as const) {
      const text = positionsOf(lines, index, chain);
      expect(at(text, instruction.from, instruction.from + 8)).toBe('R 00500 ‡');
    }
  });

  it('the twelve codes neither 48-character chain carries print BLANK, one position wide', () => {
    // `[ < ⧧ ] ; Δ ⌒ \ ⧻ : > √` — charset.md §5, A22-0526-3 p.6 footnotes. They reach the listing
    // through a comments card, which is TEXT: the hammer does not fire and the paper moves on, so
    // twelve glyphs in become twelve blanks out and the line does not shorten.
    const blanked = '[<⧧];Δ⌒\\⧻:>√';
    const lines = listingOf(deck([
      RUN_CARD, JOB_CARD,
      [[COMMENT_COLUMN, `*${blanked}`]],
      [[OPERATION, 'END']],
    ]));
    const index = lines.findIndex((line) => line.kind === 'comment');
    expect(lines[index]?.operand).toBe(blanked);
    const text = positionsOf(lines, index);
    expect(at(text, stopOf('LABEL').from, stopOf('LABEL').from + blanked.length - 1))
      .toBe(' '.repeat(blanked.length));
  });
});

// ═══ Pages, EJECT and the heading ══════════════════════════════════════════════════════════

describe('pages on the 66-line form, heading re-emitted (§9, console-and-physical.md §12)', () => {
  const long = deck([
    RUN_CARD, JOB_CARD,
    ...Array.from({ length: 120 }, () => [[LABEL, '*A COMMENT CARD']] as const),
    [[OPERATION, 'END']],
  ]);

  it('breaks every LISTING_LINES_PER_PAGE lines and re-emits the heading', () => {
    const lines = listingOf(long);
    const paper = formatListing(lines);
    const pages = [...new Set(paper.map((line) => line.page))];
    expect(pages.length).toBeGreaterThan(2);
    // A form starts where and ONLY where a heading is emitted — the two facts in one assertion.
    for (const [index, entry] of lines.entries()) {
      expect(paper[index]?.line === 1).toBe(entry.kind === 'heading');
    }
    for (const page of pages.slice(0, -1)) {
      expect(paper.filter((line) => line.page === page).length).toBe(LISTING_LINES_PER_PAGE);
    }
  });

  it('renders through renderGreenBar — the 66-line form, one form feed per break', () => {
    const page = renderListing(listingOf(long));
    expect(page.split('\n')[0]).toBe(`1403 Model 2 · chain A · ${DEFAULT_CARRIAGE_TAPE.formLines}-line form`);
    const pages = new Set(formatListing(listingOf(long)).map((line) => line.page));
    expect([...page].filter((ch) => ch === '\f').length).toBe(pages.size - 1);
  });

  it('EJECT restores to the top of the next page, heading and all (software.md §6)', () => {
    const lines = listingOf(deck([
      RUN_CARD, JOB_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00500']],
      [[OPERATION, 'EJECT']],
      [[LABEL, 'HERE'], [OPERATION, 'H']],
      [[OPERATION, 'END'], [OPERAND, 'HERE']],
    ]));
    const paper = formatListing(lines);
    // The EJECT card itself prints on the page it appeared on; SEQNO 5 is on the next form.
    expect(paper[indexOfSeqno(lines, 4)]?.page).toBe(1);
    expect(paper[indexOfSeqno(lines, 5)]?.page).toBe(2);
    expect(lines[indexOfSeqno(lines, 5) - 1]?.kind).toBe('heading');
    expect(renderListing(lines)).toContain('\f');
  });

  it('the heading carries the JOB text, the page number and the five-character ident', () => {
    const lines = listingOf(DEMO);
    const heading = positionsOf(lines, 0);
    expect(heading.trimEnd()).toMatch(/HELLO DAD - REENTRY TABLE\s+PAGE 1  HDAD1$/);
  });

  it('each page heading carries the ident IN FORCE there, not the deck\'s last one', () => {
    // `Pass1Result.ident` is what the LAST JOB or RESEQ left behind, so a heading that read it
    // would print `RSEQ2` on page 1 — a page assembled before the RESEQ card existed. The EJECT
    // is only a short way to force a second heading; a page break does the same.
    const lines = listingOf(deck([
      RUN_CARD, JOB_CARD,                                   // ident TEST1
      [[OPERATION, 'ORG'], [OPERAND, '00500']],
      [[LABEL, 'HERE'], [OPERATION, 'H']],
      [[OPERATION, 'RESEQ'], [IDENT, 'RSEQ2']],
      [[OPERATION, 'EJECT']],
      [[OPERATION, 'H']],
      [[OPERATION, 'END'], [OPERAND, 'HERE']],
    ]));
    const headings = lines.filter((line) => line.kind === 'heading');
    expect(headings.map((line) => line.label)).toEqual(['TEST1', 'RSEQ2']);
    for (const [page, ident] of [[1, 'TEST1'], [2, 'RSEQ2']] as const) {
      const index = lines.indexOf(headings[page - 1] as ListingLine);
      expect(positionsOf(lines, index).trimEnd().endsWith(`PAGE ${page}  ${ident}`)).toBe(true);
    }
  });
});

// ═══ The line shapes §9 names row by row ═══════════════════════════════════════════════════

describe('the line shapes: pooled literals, DA sub-entries, and the FLAG column', () => {
  const source = deck([
    RUN_CARD, JOB_CARD,
    [[OPERATION, 'ORG'], [OPERAND, '00500']],
    [[LABEL, 'AREA'], [OPERATION, 'DA'], [OPERAND, '1X20']],
    [[OPERAND, '10,1']],
    [[OPERAND, '20,11']],
    [[OPERATION, 'MLC'], [OPERAND, '@AB@,AREA']],
    [[OPERATION, 'LTORG'], [OPERAND, '*']],
    [[OPERATION, 'ZZZZ'], [OPERAND, 'BADOP']],
    [[OPERATION, 'MLC'], [OPERAND, 'NOSUCH,AREA']],
    [[OPERATION, 'END']],
  ]);

  it('a pooled literal prints with a BLANK OPCOD and its text in OPERAND (Exhibit IV rows 59-62)', () => {
    const lines = listingOf(source);
    const literal = lines.find((line) => line.kind === 'literal');
    expect(literal?.opcod).toBe('');
    expect(literal?.operand).toBe('@AB@');
    // Its SEQNO continues past the last source card — a processor-generated DCW is not a card.
    expect(literal?.seqno).toBeGreaterThan(10);
    const text = positionsOf(lines, lines.indexOf(literal as ListingLine));
    expect(at(text, stopOf('OPCOD').from, stopOf('OPCOD').to)).toBe('     ');
    expect(at(text, stopOf('OPERAND').from, stopOf('OPERAND').from + 3)).toBe('@AB@');
  });

  it('a DA sub-entry prints with a BLANK OPCOD and its own address (rows 65-66)', () => {
    const lines = listingOf(source);
    const subs = lines.filter((line) => line.kind === 'daSubEntry');
    expect(subs.map((line) => line.opcod)).toEqual(['', '']);
    expect(subs.map((line) => line.operand)).toEqual(['10,1', '20,11']);
    // The area is at the origin — the DA header reserves 20 positions from 00500, and the first
    // sub-entry's own address is the field it names, not wherever the counter has since gone.
    const text = positionsOf(lines, lines.indexOf(subs[0] as ListingLine));
    expect(at(text, stopOf('OPCOD').from, stopOf('OPCOD').to)).toBe('     ');
    expect(at(text, stopOf('ADDRS').from, stopOf('ADDRS').to)).toBe('00500');
  });

  it('the FLAG column carries one letter for a deliberately broken source', () => {
    const lines = listingOf(source);
    const flag = stopOf('FLAG');
    // `ZZZZ` is not an operation code — O. `NOSUCH` is never defined — U. ONE letter each.
    const bad = lines.find((line) => line.opcod === 'ZZZZ');
    const undefinedLabel = lines.find((line) => line.operand === 'NOSUCH,AREA');
    expect(bad?.flag).toBe('O');
    expect(undefinedLabel?.flag).toBe('U');
    expect(at(positionsOf(lines, lines.indexOf(bad as ListingLine)), flag.from, flag.to)).toBe('O');
    expect(at(positionsOf(lines, lines.indexOf(undefinedLabel as ListingLine)), flag.from, flag.to))
      .toBe('U');
  });

  it('a constant longer than INSTRUCTION prints its first 18 characters and no more', () => {
    // The stated rendering rule at `listing1403.ts`'s INSTRUCTION `place()`: §9 sized the column
    // for an instruction (`D 00394 00306 L` is 15) and an emitting DCW renders its whole constant
    // there, so a 40-character constant is cut at the column's right edge. CT still prints the
    // true length, and nothing spills into CARD.
    const forty = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCD';
    const lines = listingOf(deck([
      RUN_CARD, JOB_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00500']],
      [[LABEL, 'LONG'], [OPERATION, 'DCW'], [OPERAND, `@${forty}@`]],
      [[OPERATION, 'END']],
    ]));
    const index = indexOfSeqno(lines, 4);
    expect(lines[index]?.instruction).toBe(forty);          // the LINE carries all forty
    expect(lines[index]?.ct).toBe(forty.length);
    const instruction = stopOf('INSTRUCTION');
    expect(instruction.to - instruction.from + 1).toBe(18);
    const text = positionsOf(lines, index);
    expect(at(text, instruction.from, instruction.to)).toBe(forty.slice(0, 18));
    expect(at(text, instruction.to + 1, stopOf('CARD').from - 1)).toBe('  ');
  });

  it('PST prints the symbol table', () => {
    const lines = listingOf(deck([
      RUN_CARD, JOB_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00500']],
      [[LABEL, 'HERE'], [OPERATION, 'H']],
      [[OPERATION, 'PST']],
      [[OPERATION, 'END'], [OPERAND, 'HERE']],
    ]));
    const table = lines.filter((line) => line.kind === 'symbolTable');
    expect(table[0]?.operand).toBe('SYMBOL TABLE');
    expect(table.some((line) => line.label === 'HERE' && line.addrs === 500)).toBe(true);
  });
});

// ═══ The trailer — OPEN: LISTING_TRAILER_FOLLOWS_THE_OS_FORM ═══════════════════════════════

describe('the trailer (console-and-physical.md §12, C28-0326-2 p.57)', () => {
  it('reads NONE on a clean assembly and ends on the processor-identification line', () => {
    expect(LISTING_TRAILER_FOLLOWS_THE_OS_FORM).toBe(true);
    const trailer = listingOf(DEMO).filter((line) => line.kind === 'trailer');
    expect(trailer.length).toBe(2);
    expect(trailer[0]?.operand).toBe('NUMBER OF FLAGGED STATEMENTS NONE');
    expect(trailer[1]?.operand).toContain(CONSTRUCTED_LABEL);
  });

  it('carries the count and up to twenty flagged SEQNOs when the source is broken', () => {
    const lines = listingOf(deck([
      RUN_CARD, JOB_CARD,
      [[OPERATION, 'ORG'], [OPERAND, '00500']],
      [[OPERATION, 'ZZZZ']],
      [[OPERATION, 'YYYY']],
      [[OPERATION, 'END']],
    ]));
    const trailer = lines.filter((line) => line.kind === 'trailer');
    expect(trailer[0]?.operand).toBe('NUMBER OF FLAGGED STATEMENTS 2');
    expect(trailer[1]?.operand).toBe('FLAGGED STATEMENTS 4 5');
  });
});

// ═══ The ident and the RESEQ sequence — columns 73-80 of the object deck ════════════════════

describe('withIdent — JOB / RESEQ over the packed records (software.md §6, plan §8.3)', () => {
  /** A 50-character constant: marked, it costs 2 + 49 = 51 of a card's 60 payload columns. */
  const FIFTY = 'A'.repeat(50);

  it('declares JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80, the rule both halves read', () => {
    // One constant, two points of use: the page heading (`listing.ts`, where it is declared) and
    // the punch (`tools/asm.ts`, which imports it). The demo is the case that makes it matter —
    // the first five characters of its JOB operand are `HELLO`, its columns 76-80 are `HDAD1`.
    expect(JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80).toBe(true);
    expect(listingOf(DEMO)[0]?.label).toBe('HDAD1');
  });

  it('a straddling card keeps the ident and sequence of the statement owning its FIRST cell', () => {
    // THE RULING (`tools/asm.ts`): a card takes what is in force for the statement that owns its
    // first cell, so a card half full of pre-RESEQ program keeps the OLD ident and the rebase to
    // 001 happens on the first card the RESEQ's own cells open. Packing, recomputed: card 1 =
    // AAA's 50 cells (51 columns) plus the first 8 of the next DCW (2 + 7 = 9) = 60 columns.
    const { packed, cards } = punchedDeck(deck([
      RUN_CARD,
      [[OPERATION, 'JOB'], [OPERAND, 'STRADDLING RESEQ'], [IDENT, 'AAAA1']],
      [[OPERATION, 'ORG'], [OPERAND, '00500']],
      [[LABEL, 'AAA'], [OPERATION, 'DCW'], [OPERAND, `@${FIFTY}@`]],
      [[OPERATION, 'RESEQ'], [IDENT, 'BBBB2']],
      [[OPERATION, 'DCW'], [OPERAND, `@${FIFTY}@`]],
      [[OPERATION, 'DCW'], [OPERAND, `@${FIFTY}@`]],
      [[OPERATION, 'END']],
    ]));
    expect(packed.records.map((record) => [record.loadAddress, record.payload.length]))
      .toEqual([[500, 58], [558, 59], [617, 33]]);
    // The trap, pinned: `cardOf` says the post-RESEQ DCW (SEQNO 6) BEGINS on card 1, so a rule
    // keyed on `cardOf` relabels card 1 and the JOB's ident never reaches paper at all.
    expect(packed.cardOf.get(6)).toBe(1);
    expect(cards).toEqual(['001AAAA1', '001BBBB2', '002BBBB2']);
  });

  it('a RESEQ that lands on a record boundary rebases the very next card to 001', () => {
    // An ORG is one of `pack()`'s three record breaks, so here the first post-RESEQ cell opens a
    // card of its own and the two rules agree — which is the case the straddling one departs from.
    const { packed, cards } = punchedDeck(deck([
      RUN_CARD,
      [[OPERATION, 'JOB'], [OPERAND, 'RESEQ ON A BOUNDARY'], [IDENT, 'AAAA1']],
      [[OPERATION, 'ORG'], [OPERAND, '00500']],
      [[LABEL, 'AAA'], [OPERATION, 'DCW'], [OPERAND, '@HELLO@']],
      [[OPERATION, 'RESEQ'], [IDENT, 'BBBB2']],
      [[OPERATION, 'ORG'], [OPERAND, '00700']],
      [[OPERATION, 'DCW'], [OPERAND, '@WORLD@']],
      [[OPERATION, 'DCW'], [OPERAND, '@AGAIN@']],
      [[OPERATION, 'END']],
    ]));
    expect(packed.records.map((record) => record.loadAddress)).toEqual([500, 700]);
    expect(cards).toEqual(['001AAAA1', '001BBBB2']);
  });

  it('numbers a deck with no RESEQ straight through, under the JOB ident', () => {
    const { cards } = punchedDeck(DEMO);
    expect(cards).toEqual(['001HDAD1', '002HDAD1']);
  });
});
