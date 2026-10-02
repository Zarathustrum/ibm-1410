// T3 — Phase 5's relaxed convergence gate. The spec-driven program and the hand-written target
// may differ as source, but they must be the same machine and print the same frozen page.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { renderGreenBar } from '../src/core/devices/printer1403.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import type { Deck } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';
import type { ObjectDeck } from '../src/formats/objectdeck.js';
import { generate } from '../src/rpg/generate.js';

const SPEC = readFileSync('demos/sales-summary.rpg', 'utf8');
const TARGET_SOURCE = readFileSync('demos/sales-summary.asm', 'utf8');
const DATA = readFileSync('demos/sales-summary.data.cards', 'utf8');
const GOLDEN_PAGE = readFileSync('test/golden/sales-summary.page.txt', 'utf8');

const generated = generate(SPEC);
const generatedAssembly = assemble(generated.source);
const targetAssembly = assemble(TARGET_SOURCE);

function highWater(items: readonly { readonly at: number; readonly cells: Uint8Array }[]): number {
  return Math.max(...items.map((item) => item.at + item.cells.length - 1));
}

function lineDifferences(left: string, right: string): readonly number[] {
  const a = left.split('\n');
  const b = right.split('\n');
  return Array.from({ length: Math.max(a.length, b.length) }, (_, index) => index + 1)
    .filter((line) => a[line - 1] !== b[line - 1]);
}

function operate(deck: Deck): { readonly machine: Machine; readonly stop: string | undefined } {
  const machine = createMachine({ size: 10_000 });
  machine.loadDeck(deck);
  machine.readerStart();
  machine.readerEndOfFile();
  machine.display(BOOTSTRAP_ORIGIN);
  machine.setMode('alter');
  expect(machine.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks)).toBe(12);
  machine.computerReset();
  machine.setMode('run');

  let stop: string | undefined;
  for (let count = 0; count < 100_000; count++) {
    stop = machine.step();
    if (stop !== undefined) break;
  }
  return { machine, stop };
}

function rendered(deck: ObjectDeck): string {
  const parsed = parseDeck(DATA);
  expect(parsed.errors).toEqual([]);
  const { machine, stop } = operate([...loaderDeck(deck), ...parsed.deck]);
  expect(stop).toBe('halt');
  machine.endOfJob();
  return renderGreenBar(machine.snapshot().printer.paper, { chain: 'A', formLines: 66 });
}

describe('Phase 5 Wave 5 — generated sales summary converges on the hand-written target', () => {
  it('generates and assembles both programs cleanly', () => {
    expect(generated.ok).toBe(true);
    expect(generated.diagnostics).toEqual([]);
    for (const assembly of [generatedAssembly, targetAssembly]) {
      expect(assembly.ok).toBe(true);
      expect(assembly.flagged).toEqual([]);
      expect(assembly.warnings).toEqual([]);
      expect(assembly.deck.records).toHaveLength(39);
      expect(assembly.deck.entry).toBe(808);
      expect(highWater(assembly.items)).toBe(2832);
    }
  });

  it('deep-equals every object record while treating the explained source diff as non-gating', () => {
    const sourceDiff = lineDifferences(generated.source, TARGET_SOURCE);
    expect(generatedAssembly.deck.records,
      `source differs on ${sourceDiff.length} line positions; BUILD-LOG-5 explains the non-gating diff`)
      .toEqual(targetAssembly.deck.records);
    expect(generatedAssembly.deck.entry).toBe(targetAssembly.deck.entry);
  });

  it('runs both decks through the real loader, 1402 and 1411 to the frozen two-form page', () => {
    expect(rendered(targetAssembly.deck)).toBe(GOLDEN_PAGE);
    expect(rendered(generatedAssembly.deck)).toBe(GOLDEN_PAGE);
  });
});
