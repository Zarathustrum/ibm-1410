// Tier 2 — Wave-5 corpus: generated cycle heads and full-path stress runs.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { renderGreenBar } from '../src/core/devices/printer1403.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { type Deck } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';
import { CALC_EMITTERS, calcStorageOf } from '../src/rpg/calc.js';
import { CYCLE_ORDER, CYCLE_SECTION_LABEL, driver } from '../src/rpg/cycle.js';
import { generate } from '../src/rpg/generate.js';
import { layoutOf, measure } from '../src/rpg/layout.js';
import { OUTPUT_EMITTERS, outputStorageOf } from '../src/rpg/output.js';

const CORPUS = [
  'demos/sales-summary.rpg',
  'demos/cycle-probe.rpg',
  'demos/card-list.rpg',
  'demos/stress/or-conditions.rpg',
  'demos/stress/edit-sign.rpg',
  'demos/stress/page-boundary.rpg',
  'demos/stress/sequence-error.rpg',
  'demos/stress/record-not-found.rpg',
] as const;

const DATA: Readonly<Record<string, string>> = {
  'demos/sales-summary.rpg': readFileSync('demos/sales-summary.data.cards', 'utf8'),
  'demos/cycle-probe.rpg': readFileSync('demos/cycle-probe.data.cards', 'utf8'),
  'demos/card-list.rpg': readFileSync('demos/card-list.data.cards', 'utf8'),
  'demos/stress/or-conditions.rpg': 'AONE\nBTWO\nCTRE',
  'demos/stress/edit-sign.rpg': 'C00123',
  'demos/stress/page-boundary.rpg': Array.from({ length: 70 }, (_, n) => (
    `C${String(n + 1).padStart(4, '0')}`
  )).join('\n'),
  'demos/stress/sequence-error.rpg': 'AAA1\nBBB1',
  'demos/stress/record-not-found.rpg': 'XBAD',
};

function operate(deck: Deck, budget: number): { readonly m: Machine; readonly stop: string | undefined } {
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

function generated(path: string) {
  const result = generate(readFileSync(path, 'utf8'));
  expect(result.ok, path).toBe(true);
  expect(result.diagnostics, path).toEqual([]);
  const assembled = assemble(result.source);
  expect(assembled.ok, path).toBe(true);
  expect(assembled.flagged, path).toEqual([]);
  expect(assembled.warnings, path).toEqual([]);
  return { result, assembled };
}

function run(path: string, budget = 200_000): string {
  const { assembled } = generated(path);
  const parsed = parseDeck(DATA[path] ?? '');
  expect(parsed.errors, path).toEqual([]);
  const { m, stop } = operate([...loaderDeck(assembled.deck), ...parsed.deck], budget);
  expect(stop, path).toBe('halt');
  m.endOfJob();
  return renderGreenBar(m.snapshot().printer.paper, { chain: 'A', formLines: 66 });
}

function placed(start: number, text: string): string {
  return `${' '.repeat(start - 1)}${text}`;
}

function reportForms(page: string): readonly (readonly string[])[] {
  return page.split('\f').map((form, index) => {
    const lines = form.split('\n');
    if (index === 0) lines.splice(0, 2); // renderer identification and its blank separator
    if (lines[0] === '') lines.shift();
    while (lines.at(-1) === '') lines.pop();
    return lines;
  });
}

describe('Wave 5 — generated cross-check corpus', () => {
  it('generates and assembles all eight §11.2 decks cleanly', () => {
    for (const path of CORPUS) generated(path);
  });

  it('keeps every generated section head in strict CYCLE_ORDER address order', () => {
    const covered = new Set<string>();
    for (const path of CORPUS) {
      const { assembled } = generated(path);
      let previous = -1;
      for (const section of CYCLE_ORDER) {
        const symbol = assembled.symbols.get(CYCLE_SECTION_LABEL[section]);
        if (symbol === undefined) continue;
        covered.add(section);
        expect(symbol.value, `${path} ${section}`).toBeGreaterThan(previous);
        previous = symbol.value;
      }
    }
    expect([...covered].sort()).toEqual([...CYCLE_ORDER].sort());
  });

  it('reaches the complete-driver layout fixed point on every corpus model', () => {
    for (const path of CORPUS) {
      const { result } = generated(path);
      const model = result.model!;
      const storage = [...calcStorageOf(model), ...outputStorageOf(model)];
      const emitters = {
        ...CALC_EMITTERS,
        ...OUTPUT_EMITTERS,
        generatedStorage: () => storage,
      };
      const pass1 = driver(model, layoutOf(model, 0, storage), emitters);
      const n = measure(CYCLE_ORDER
        .filter((section) => section !== 'areas')
        .flatMap((section) => pass1.get(section) ?? []));
      const layout = layoutOf(model, n, storage);
      const pass2 = driver(model, layout, emitters);

      expect(measure(CYCLE_ORDER
        .filter((section) => section !== 'areas')
        .flatMap((section) => pass2.get(section) ?? [])), path).toBe(n);
      expect(result.layout, path).toMatchObject({ codeLength: n, highWater: layout.highWater });
    }
  });

  it('runs card-list through the machine and prints the anti-transcription detail rows', () => {
    const page = run('demos/card-list.rpg');
    expect(page).toBe(readFileSync('test/golden/card-list.page.txt', 'utf8'));
    expect(reportForms(page)).toEqual([[
      placed(12, 'CARD LIST'),
      '',
      'APPLE      5   125',
      'BANANA    12    99',
      'WIDGET     1  1234',
    ]]);
  });

  it('runs cycle-probe through the machine and prints the frozen two-form probe page', () => {
    const page = run('demos/cycle-probe.rpg');
    expect(page).toBe(readFileSync('test/golden/cycle-probe.page.txt', 'utf8'));
    const forms = reportForms(page);
    expect(forms).toHaveLength(2);
    expect(forms[0]).toEqual([
      placed(10, 'CYCLE PROBE         1'),
      placed(11, 'DETAIL RUN'),
      '',
      ...Array.from({ length: 57 }, (_, index) => placed(
        8, `${String(index + 1).padStart(3, '0')}         1`,
      )),
    ]);
    expect(forms[1]).toEqual([
      placed(10, 'CYCLE PROBE         2'),
      placed(11, 'DETAIL RUN'),
      '',
      ...Array.from({ length: 55 }, (_, index) => placed(
        8, `${String(index + 58).padStart(3, '0')}         2`,
      )),
      placed(12, 'LAST CARD'),
    ]);
  });

  it('runs the stress decks through their named runtime properties', () => {
    const alternatives = run('demos/stress/or-conditions.rpg');
    expect(alternatives).not.toContain('RECORD TYPE NOT FOUND');
    expect(alternatives).toContain('ONE');
    expect(run('demos/stress/record-not-found.rpg')).toContain('RECORD TYPE NOT FOUND');
    expect(run('demos/stress/sequence-error.rpg')).toContain('INPUT REC OUT OF SEQ');
    expect(run('demos/stress/edit-sign.rpg')).toContain('-');
    const boundary = reportForms(run('demos/stress/page-boundary.rpg'));
    expect(boundary).toHaveLength(2);
    expect(boundary[0]?.join('\n')).toContain('0058');
    expect(boundary[0]?.join('\n')).toContain('0059');
    expect(boundary[0]?.join('\n')).not.toContain('0060');
    expect(boundary[1]?.join('\n')).toContain('0060');
    expect(boundary[1]?.join('\n')).toContain('0061');
  });

  it('keeps the legal OF or-group and repeated field-entry shape in the model', () => {
    const { result } = generated('demos/stress/or-conditions.rpg');
    const line = result.model?.lines.find((candidate) => candidate.id === 'D11');
    expect(line?.conditionGroups).toHaveLength(3);
    expect(line?.conditionGroups.every((group) => group.some((condition) => condition.indicator === 'OF')))
      .toBe(true);
    expect(line?.fields.filter((field) => field.name === 'ITEM')).toHaveLength(2);
  });
});
