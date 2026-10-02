// Tier 0 — table fidelity. The 1403's A/H chain switch as a page transform (plan §4.3, §5.3,
// §12.1 T0, §13 criterion 12). Research: A22-0526-3 pp.6-7 Figure 2; GA24-3073 p.25, p.27.
//
// The five duals are NOT transcribed here: they are SLICED FROM docs/research/charset.md §5 at
// test time — the table whose header row is `| Hollerith | BCD | Octal | A … | H … |` — on
// test/rpg-columns-vs-research.test.ts's precedent. A copied expectation is a second
// transcription of a primary source and is free to drift invisibly; a slice moves with the
// research file or fails at the slice (plan §12.3).
//
// The bijection is re-derived from the SHIPPED DEVICE, `chainGlyph` in
// src/core/devices/printer1403.ts, so it covers two chain-independent facts without naming them:
// `!` (minus zero) prints `-` and `ƀ` (substitute blank) prints the record-mark slug `‡`, on BOTH
// arrangements, because `-` and the record mark are on both 48-graphic sets (charset.md §5,
// A22-0526-3 p.6 footnotes). It is well defined because none of the five H glyphs is on the A set,
// the twelve codes on neither chain print blank on both, and `?` collides with BCD 0o60
// identically on both (charset.md §5.1, `[likely]`).
//
// "A SECOND CHAIN TABLE", CONCRETELY — the definition the grep below uses: a file under src/ui/**
// carrying all five A graphics `& ⌑ % # @` AND all five H graphics `+ ) ( = '` as one-character
// string literals, or declaring its own `chainGlyph`. paper/chain.ts is expected to be the ONLY
// match, which is what keeps that grep from passing vacuously.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { chainGlyph } from '../src/core/devices/printer1403.js';
import {
  CHAIN_DUALS,
  H_CHAIN_IS_A_FIVE_GLYPH_RESTRIKE_OF_THE_A_PAGE,
  restrike,
} from '../src/ui/period/paper/chain.js';

const CHARSET = readFileSync('docs/research/charset.md', 'utf8');
const DUAL_TABLE_HEADER = '| Hollerith | BCD | Octal |';
const A_GLYPHS = ['&', '⌑', '%', '#', '@'] as const;
const H_GLYPHS = ['+', ')', '(', '=', "'"] as const;

describe('paper/chain.ts — the A/H restrike (plan §4.3, §5.3)', () => {
  it('carries charset.md §5’s five dualed code points, read from the research file', () => {
    expect(CHARSET.split(DUAL_TABLE_HEADER).length - 1).toBe(1);
    expect(researchDuals()).toEqual([
      { octal: '60', a: '&', h: '+' },
      { octal: '74', a: '⌑', h: ')' },
      { octal: '34', a: '%', h: '(' },
      { octal: '13', a: '#', h: '=' },
      { octal: '14', a: '@', h: "'" },
    ]);
    expect(CHAIN_DUALS.map(([a, h]) => ({ a, h })))
      .toEqual(researchDuals().map(({ a, h }) => ({ a, h })));
  });

  it('restrikes every one of the 64 codes, in both directions, against the shipped chain', () => {
    expect(H_CHAIN_IS_A_FIVE_GLYPH_RESTRIKE_OF_THE_A_PAGE).toBe(true);
    for (let code = 0o00; code <= 0o77; code++) {
      const a = chainGlyph(code, 'A');
      const h = chainGlyph(code, 'H');
      expect([code, restrike(a, 'H')]).toEqual([code, h]);
      expect([code, restrike(h, 'A')]).toEqual([code, a]);
    }
  });

  it('restrikes a whole printed line and leaves every chain-independent glyph alone', () => {
    const a = 'AB 12 &⌑%#@ .-$*/,‡';
    expect(restrike(a, 'H')).toBe("AB 12 +)(=' .-$*/,‡");
    expect(restrike(restrike(a, 'H'), 'A')).toBe(a);
  });

  it('finds no second chain table under src/ui/**', () => {
    expect(tsFiles(resolve('src/ui')).filter(isChainTable).map(shown))
      .toEqual(['src/ui/period/paper/chain.ts']);
  });

  it('detects a seeded chain table, so the grep above cannot pass vacuously', () => {
    expect(isChainTableSource("['&','+'],['⌑',')'],['%','('],['#','='],['@',\"'\"]")).toBe(true);
    expect(isChainTableSource('const chainGlyph = (c: number) => c;')).toBe(true);
    expect(isChainTableSource("const plus = '+'; const at = '@';")).toBe(false);
  });

  it('is imported by nothing under src/asm/**', () => {
    expect(tsFiles(resolve('src/asm')).length).toBeGreaterThan(0);
    const importers = tsFiles(resolve('src/asm'))
      .filter((file) => /paper\/chain/.test(readFileSync(file, 'utf8')))
      .map(shown);

    expect(importers).toEqual([]);
  });
});

/** charset.md §5's dual table, sliced: the rows under the one `| Hollerith | BCD | Octal …` head. */
function researchDuals(): readonly { octal: string; a: string; h: string }[] {
  const start = CHARSET.indexOf(DUAL_TABLE_HEADER);
  if (start === -1) throw new Error(`charset.md carries no "${DUAL_TABLE_HEADER}" table`);
  const rows: { octal: string; a: string; h: string }[] = [];
  for (const line of CHARSET.slice(start).split('\n').slice(1)) {
    if (!line.startsWith('|')) break;
    if (line.includes('|---')) continue;
    const cells = line.split('|').slice(1, -1);
    rows.push({ octal: cell(cells[2]), a: backticked(cells[3]), h: backticked(cells[4]) });
  }
  return rows;
}

const cell = (text: string | undefined): string => (text ?? '').trim();

/** The first backtick-quoted token in a cell — `⌑` lozenge is one glyph and one gloss. */
function backticked(text: string | undefined): string {
  const found = /`([^`]+)`/.exec(cell(text));
  if (found?.[1] === undefined) throw new Error(`no backticked glyph in "${cell(text)}"`);
  return found[1];
}

function tsFiles(root: string): readonly string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) return tsFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

const isChainTable = (file: string): boolean => isChainTableSource(readFileSync(file, 'utf8'));

function isChainTableSource(source: string): boolean {
  if (/\b(?:function|const|let|var)\s+chainGlyph\b/.test(source)) return true;
  const literal = (glyph: string): boolean =>
    new RegExp(`(['"\`])${glyph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`).test(source);
  return A_GLYPHS.every(literal) && H_GLYPHS.every(literal);
}

const shown = (file: string): string => file.slice(resolve('.').length + 1);
