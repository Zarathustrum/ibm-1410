// Tier 4 (smoke) — the Phase-5 RPG storyboard through its DOM-free RpgSession.
//
// The browser contributes only the two typed hand-off calls. This file drives everything else in
// node: specification text -> generation -> Autocoder hand-off -> assembly -> loader/1402/1411 ->
// frozen 1403 page. It also pins the broken-deck and stale-result states that disable the hand-off.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { renderGreenBar } from '../src/core/devices/printer1403.js';
import { createMachine } from '../src/core/machine.js';
import type { Deck } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';
import { createRpgSession } from '../src/ui/period/rpg/session.js';

const CHAIN = 'A' as const;
const FORM_LINES = 66;
const RUN_BUDGET = 100_000;

interface Demo {
  readonly name: string;
  readonly spec: string;
  readonly data: string;
  readonly golden: string;
}

function demo(name: string): Demo {
  return {
    name,
    spec: readFileSync(`demos/${name}.rpg`, 'utf8'),
    data: readFileSync(`demos/${name}.data.cards`, 'utf8'),
    golden: readFileSync(`test/golden/${name}.page.txt`, 'utf8'),
  };
}

const SALES = demo('sales-summary');
const PROBE = demo('cycle-probe');
const CARD_LIST = demo('card-list');

function run(deck: Deck): string {
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
  for (let count = 0; count < RUN_BUDGET; count += 1) {
    stop = machine.step();
    if (stop !== undefined) break;
  }
  expect(stop).toBe('halt');
  machine.endOfJob();
  const state = machine.snapshot();
  expect(state.console.filter((line) => line.id === 'E')).toEqual([]);
  return renderGreenBar(state.printer.paper, { chain: CHAIN, formLines: FORM_LINES });
}

function throughSession(input: Demo): string {
  const session = createRpgSession();
  session.setSpecText(input.spec);
  session.setDataText(input.data);
  const generated = session.generate();
  expect(generated.ok, input.name).toBe(true);
  expect(generated.diagnostics, input.name).toEqual([]);

  const handed = session.handOff();
  const assembled = assemble(handed.source);
  expect(assembled.ok, input.name).toBe(true);
  expect(assembled.flagged, input.name).toEqual([]);
  expect(assembled.warnings, input.name).toEqual([]);
  const data = parseDeck(handed.dataCards);
  expect(data.errors, input.name).toEqual([]);
  return run([...loaderDeck(assembled.deck), ...data.deck]);
}

describe('Tier 4 GATE — RpgSession hand-off, with no DOM (plan §13 criterion 13a)', () => {
  it('is DOM-free in the node smoke environment', () => {
    expect(typeof globalThis.document).toBe('undefined');
    expect(typeof createRpgSession).toBe('function');
  });

  it('generates, hands off, assembles and prints the frozen two-form sales report', () => {
    const page = throughSession(SALES);
    expect(page).toBe(SALES.golden);
    expect(page.split('\f')).toHaveLength(2);
    expect(page).toContain('PAGE   2');
  });

  it('runs the cycle probe and anti-transcription card list through the same session route', () => {
    expect(throughSession(PROBE)).toBe(PROBE.golden);
    expect(throughSession(CARD_LIST)).toBe(CARD_LIST.golden);
  });

  it('returns a disabled hand-off for a diagnosed deck without throwing', () => {
    const broken = SALES.spec.trimEnd().split('\n').map((card) => (
      card.slice(75) === '06230' ? `${card.slice(0, 4)}   ${card.slice(7)}` : card
    )).join('\n') + '\n';
    const session = createRpgSession();
    session.setSpecText(broken);
    session.setDataText(SALES.data);
    const result = session.generate();
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message.text))
      .toContain('OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC');
    expect(session.handOff()).toEqual({ source: '', dataCards: '' });
  });

  it('retires a successful result when either specification or data text changes', () => {
    const session = createRpgSession();
    session.setSpecText(SALES.spec);
    session.setDataText(SALES.data);
    expect(session.generate().ok).toBe(true);
    expect(session.handOff().source).not.toBe('');

    session.setSpecText(SALES.spec.replace('MONTHLY SALES', 'MONTHLY SALEZ'));
    expect(session.result).toBeUndefined();
    expect(session.handOff()).toEqual({ source: '', dataCards: '' });

    session.setSpecText(SALES.spec);
    session.setDataText(SALES.data);
    expect(session.generate().ok).toBe(true);
    session.setDataText(`${SALES.data.trimEnd()}\n`);
    expect(session.result).toBeUndefined();
    expect(session.handOff()).toEqual({ source: '', dataCards: '' });
  });
});
