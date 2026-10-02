// Tier 2 — Wave-5 composition: specification deck to standalone Autocoder source cards.

import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { bcdOfGlyph } from '../src/core/bcd.js';
import {
  generate,
  GENERATED_PROGRAM_IS_OPEN_CODED_NOT_IOCS,
} from '../src/rpg/generate.js';
import { CYCLE_ORDER, CYCLE_SECTION_LABEL } from '../src/rpg/cycle.js';
import { SALES_SUMMARY_MODEL } from './fixtures/sales-summary.model.js';

/** OPEN: `RPG_GOLDENS_ARE_CONSTRUCTED` — provenance, not a period claim. No published 1410 RPG
 * report survives; the page oracles are authored from precommitted print maps and checked through
 * the real Machine. Fallback: none; the mitigation is the independent object/page/loop gates.
 * Plan §12.1, §15; research/METHOD.md; open-questions.md, Phase 5 / Wave 5. */
export const RPG_GOLDENS_ARE_CONSTRUCTED = true;

const SALES = readFileSync('demos/sales-summary.rpg', 'utf8');

afterEach(() => vi.useRealTimers());

describe('Wave 5 — RPG generator composition', () => {
  it('carries the constructed/open-code provenance at the two first-use points', () => {
    expect(RPG_GOLDENS_ARE_CONSTRUCTED).toBe(true);
    expect(GENERATED_PROGRAM_IS_OPEN_CODED_NOT_IOCS).toBe(true);
  });

  it('composes the clean sales deck into 80-column machine-glyph source cards', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('1964-07-16T12:00:00Z'));
    const result = generate(SALES);

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.model).toEqual(SALES_SUMMARY_MODEL);
    expect(result.layout).toBeDefined();
    expect(result.cards.every((card) => [...card].length === 80)).toBe(true);
    expect(result.cards.flatMap((card) => [...card]).every((glyph) => bcdOfGlyph(glyph) !== undefined))
      .toBe(true);
    expect(result.source).toContain('* SOURCE RPG SPECIFICATION DECK.');
    expect(result.source).toContain('* GENERATED 1964-07-16 UTC.');
    expect(result.source).toContain('* TARGET 1410 10K, ONE CHANNEL, 1402, 1403 MODEL 2, CHAIN A.');
  });

  it('uses the pass-2 core code, cleanly assembles, and publishes every generated cycle head', () => {
    const result = generate(SALES);
    const assembled = assemble(result.source);
    expect(assembled.ok).toBe(true);
    expect(assembled.flagged).toEqual([]);
    expect(assembled.warnings).toEqual([]);
    expect(assembled.deck.entry).toBe(808);
    expect(result.layout).toMatchObject({ coreSizeCode: 1, highWater: 2833 });
    expect(result.cards[2]?.slice(20, 22)).toBe(' 1');

    const generatedSections = CYCLE_ORDER.filter((section) => (
      section !== 'sequence' || result.model?.sequenceField !== undefined
    ));
    for (const section of generatedSections) {
      expect(assembled.symbols.has(CYCLE_SECTION_LABEL[section]), section).toBe(true);
    }
  });

  it('emits numeric Data fields as zeros and alphameric fields as blanks', () => {
    const result = generate(SALES);
    const assembly = assemble(result.source);
    const line = (label: string) => assembly.listing.find((entry) => entry.label === label);

    expect(line('QTY')).toMatchObject({ opcod: 'DCW', instruction: '00000' });
    expect(line('AMT')).toMatchObject({ opcod: 'DCW', instruction: '00000000' });
    expect(line('DEPT')).toMatchObject({ opcod: 'DCW', ct: 3 });
    expect(line('DEPT')?.instruction?.trim()).toBe('');
    expect(line('PART')).toMatchObject({ opcod: 'DCW', ct: 8 });
    expect(line('PART')?.instruction?.trim()).toBe('');
  });

  it('returns inspectable source but keeps ok false for a nonfatal Format output-type flag', () => {
    const cards = SALES.trimEnd().split('\n');
    const index = cards.findIndex((card) => card.startsWith('LHA2'));
    expect(index).toBeGreaterThan(-1);
    const card = cards[index]!;
    cards[index] = `${card.slice(0, 4)} ${card.slice(5)}`;

    const result = generate(cards.join('\n'));
    expect(result.ok).toBe(false);
    expect(result.cards.length).toBeGreaterThan(0);
    expect(result.source).toBe(result.cards.join('\n'));
    expect(result.layout).toBeDefined();
    expect(assemble(result.source).ok).toBe(true);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      column: 5,
      message: { text: 'OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC' },
    });
  });

  it('returns diagnostics and no generated source for an invalid specification deck', () => {
    const result = generate('CAA');
    expect(result.ok).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.cards).toEqual([]);
    expect(result.source).toBe('');
    expect(result.layout).toBeUndefined();
  });
});
