// Tier 4 (smoke) — the Wave-1 RPG target, and like `tier4-autocoder-demo.test.ts` THIS ONE GATES.
//
// docs/plans/phase-5-rpg.md §11 wave 1: the hand-written target must assemble clean, load through
// the real loader and the real 1402, run on the real 1411, print the frozen two-form page, and
// leave the indicator FILE in the hand-written state table. The file is the point here: `F1`,
// `F2`, `OF`, `LC` and `PRIME` are core cells under `IND`, not `MachineState.indicators`.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { glyphOf } from '../src/core/bcd.js';
import { renderGreenBar } from '../src/core/devices/printer1403.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { BCD6, type Addr, type Deck } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';

const SOURCE = readFileSync('demos/sales-summary.asm', 'utf8');
const DATA = readFileSync('demos/sales-summary.data.cards', 'utf8');
const GOLDEN_PAGE = readFileSync('test/golden/sales-summary.page.txt', 'utf8');

const CHAIN = 'A' as const;
const FORM_LINES = 66;
const SOURCE_KINDS: ReadonlySet<string> = new Set([
  'comment', 'imperative', 'declarative', 'control', 'daSubEntry',
]);
const SOURCE_CARDS = 271;
const OBJECT_RECORDS = 39;
const DATA_CARDS = 52;
const ENTRY = 808;
const RUN_BUDGET = 100_000;

/**
 * PROVENANCE, not a machine fact: no period 1410 RPG report with published output survives.
 * The page is ours, authored from the map committed in BUILD-LOG-5 Wave 1 before this golden.
 */
const RPG_GOLDENS_ARE_CONSTRUCTED = true;

const result = assemble(SOURCE);

function operate(deck: Deck, budget: number): { m: Machine; stop: string | undefined } {
  const m = createMachine({ size: 10_000 });
  m.loadDeck(deck);
  m.readerStart();
  m.readerEndOfFile();
  m.display(BOOTSTRAP_ORIGIN);
  m.setMode('alter');
  expect(m.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks)).toBe(12);
  m.computerReset();
  m.setMode('run');

  let stop: string | undefined;
  for (let i = 0; i < budget; i++) {
    stop = m.step();
    if (stop !== undefined) break;
  }
  return { m, stop };
}

function symbol(name: string): number {
  const value = result.symbols.get(name)?.value;
  if (value === undefined) throw new Error(`missing symbol ${name}`);
  return value;
}

const glyphAt = (m: Machine, a: Addr): string => glyphOf(m.storage.read(a) & BCD6);

describe('Tier 4 GATE — the hand-written RPG target (plan §11 wave 1)', () => {
  it('declares the page golden constructed rather than period output', () => {
    expect(RPG_GOLDENS_ARE_CONSTRUCTED).toBe(true);
  });

  it('assembles cleanly: ok, zero flagged lines, zero warnings, and the published counts', () => {
    expect(result.ok).toBe(true);
    expect(result.flagged).toEqual([]);
    expect(result.warnings).toEqual([]);

    const cards = result.listing.filter((line) => SOURCE_KINDS.has(line.kind));
    expect(cards).toHaveLength(SOURCE_CARDS);
    expect(result.deck.records).toHaveLength(OBJECT_RECORDS);
    expect(result.deck.entry).toBe(ENTRY);
  });

  it('matches the published Wave-1 layout in assembled storage', () => {
    expect(result.coreSize).toBe(10_000);
    expect(symbol('START')).toBe(808);
    expect(symbol('RDCARD')).toBe(844);
    expect(symbol('TOTOUT')).toBe(1166);
    expect(symbol('HDGOUT')).toBe(1791);
    expect(symbol('DTLOUT')).toBe(2252);
    expect(symbol('EOJ')).toBe(2528);
    expect(symbol('IND')).toBe(2600);
    expect(symbol('CDIN')).toBe(2607);
    expect(symbol('PLINE')).toBe(2700);
    expect(symbol('PLGM')).toBe(2832);
  });

  it('parses the reconstructed data deck with zero errors and exactly 52 cards', () => {
    const parsed = parseDeck(DATA);
    expect(parsed.errors).toEqual([]);
    expect(parsed.deck).toHaveLength(DATA_CARDS);

    const sourceLines = DATA.trimEnd().split('\n');
    expect(sourceLines).toHaveLength(DATA_CARDS);
    expect(sourceLines.every((line) => line.length === 48)).toBe(true);
    expect(sourceLines.every((line) => line.slice(27, 48) === ' RECONSTRUCTED SAMPLE')).toBe(true);
  });

  it('loads, runs, prints the frozen two-form page, and leaves the indicator file in the target state', () => {
    const parsed = parseDeck(DATA);
    expect(parsed.errors).toEqual([]);
    const hopper: Deck = [...loaderDeck(result.deck), ...parsed.deck];
    const { m, stop } = operate(hopper, RUN_BUDGET);

    expect(stop).toBe('halt');

    m.endOfJob();
    const state = m.snapshot();
    const rendered = renderGreenBar(state.printer.paper, { chain: CHAIN, formLines: FORM_LINES });

    expect(state.stop).toBe('halt');
    expect(state.reader.hopper).toBe(0);
    expect(state.reader.buffered).toBe(false);
    expect(state.console.filter((line) => line.id === 'E')).toEqual([]);

    expect(rendered).toBe(GOLDEN_PAGE);
    expect(rendered.split('\f')).toHaveLength(2);
    expect(rendered).toContain('PAGE   2');
    expect(rendered).toContain('DEPT TOTAL              00,000,022.00  00,000,001.10  *');
    expect(rendered).toContain('DISTRICT TOTAL              00,000,022.00  00,000,001.10  **');
    expect(rendered).toContain('GRAND TOTAL            0000,000,052.000000,000,002.60  ***');

    expect(state.printer.paper.map((line) => line.text.trimEnd())).toEqual(
      expect.arrayContaining([
        'MONTHLY SALES SUMMARY BY DISTRICT                          PAGE   2',
        '     DEPT TOTAL              00,000,022.00  00,000,001.10  *',
        ' DISTRICT TOTAL              00,000,022.00  00,000,001.10  **',
        '    GRAND TOTAL            0000,000,052.000000,000,002.60  ***',
      ]),
    );

    expect(glyphAt(m, symbol('LC'))).toBe('1');
    expect(glyphAt(m, symbol('F1'))).toBe('0');
    expect(glyphAt(m, symbol('F2'))).toBe('0');
    expect(glyphAt(m, symbol('OF'))).toBe('0');
    expect(glyphAt(m, symbol('PRIME'))).toBe('1');
  });
});
