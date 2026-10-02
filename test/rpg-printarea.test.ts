// T2 — the Phase-5 report line before the hammers strike.
//
// This is the rung between the hand-written target's machine run and its frozen page. The eight
// report-format W1 statements are captured directly from core on their first execution; the ninth
// W1 is the record-not-found message and is deliberately outside the Format-sheet column map.
// Expected positions come from docs/BUILD-LOG-5.md's Wave-1 map, committed before the data deck,
// golden, or this test existed. No expected line below is read from printer paper.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { glyphOf } from '../src/core/bcd.js';
import { PRINT_POSITIONS } from '../src/core/devices/printer1403.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { BCD6, type Addr, type Deck } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import {
  BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck,
} from '../src/formats/loader.js';
import { generate } from '../src/rpg/generate.js';

const SOURCE = readFileSync('demos/sales-summary.asm', 'utf8');
const DATA = readFileSync('demos/sales-summary.data.cards', 'utf8');
const assembled = assemble(SOURCE);

function symbol(name: string): Addr {
  const entry = assembled.symbols.get(name);
  if (entry === undefined) throw new Error(`sales-summary has no ${name} symbol`);
  return entry.value;
}

/** One 132-position line, filled by 1-based placements from the precommitted map. */
function line(...placements: readonly (readonly [number, string])[]): string {
  const out = new Array<string>(PRINT_POSITIONS).fill(' ');
  for (const [position, text] of placements) {
    for (const [offset, glyph] of [...text].entries()) out[position - 1 + offset] = glyph;
  }
  return out.join('');
}

const HA1 = (page: number): string => line(
  [1, 'MONTHLY SALES SUMMARY'],
  [23, 'BY DISTRICT'],
  [60, 'PAGE'],
  [65, String(page).padStart(3, ' ')],
);

const HA2 = line(
  [1, 'DEPT'],
  [13, 'PART'],
  [24, 'QTY'],
  [37, 'AMOUNT'],
  [48, 'COMMISSION'],
);

interface ExpectedLine {
  /** Autocoder PGLIN, the stable name a person finds in the source deck. */
  readonly pglin: string;
  /** Assembled instruction address published with the Wave-1 target. */
  readonly at: Addr;
  readonly kind: string;
  readonly text: string;
}

const EXPECTED: readonly ExpectedLine[] = [
  {
    pglin: '02030', at: 1260, kind: 'T11 first department total',
    text: line(
      [6, 'DEPT TOTAL'], [30, '00,000,020.00'], [45, '00,000,001.00'], [60, '*'],
    ),
  },
  {
    pglin: '02210', at: 1430, kind: 'T21 first district total',
    text: line(
      [2, 'DISTRICT TOTAL'], [30, '00,000,030.00'], [45, '00,000,001.50'], [60, '**'],
    ),
  },
  {
    pglin: '02390', at: 1600, kind: 'T31 grand total',
    text: line(
      [5, 'GRAND TOTAL'], [28, '0000,000,052.00'], [43, '0000,000,002.60'], [60, '***'],
    ),
  },
  { pglin: '02710', at: 1882, kind: 'HA1 first-page heading', text: HA1(1) },
  { pglin: '02820', at: 1980, kind: 'HA2 first-page columns', text: HA2 },
  { pglin: '02980', at: 2116, kind: 'HB1 overflow heading', text: HA1(2) },
  { pglin: '03100', at: 2214, kind: 'HB2 overflow columns', text: HA2 },
  {
    pglin: '03250', at: 2345, kind: 'D11 first detail',
    text: line(
      [2, 'AAA'], [9, 'A0000001'], [22, '    1'], [33, '000,001.00'],
      [43, '0000,000,000.05'],
    ),
  },
];

interface Capture {
  readonly text: string;
  readonly terminator: { readonly glyph: string; readonly wordMark: boolean };
}

function textAt(m: Machine, from: Addr, length: number): string {
  let out = '';
  for (let offset = 0; offset < length; offset++) {
    out += glyphOf(m.storage.read(from + offset) & BCD6);
  }
  return out;
}

function boot(deck: Deck): Machine {
  const m = createMachine({ size: 10_000 });
  m.loadDeck(deck);
  m.readerStart();
  m.readerEndOfFile();
  m.display(BOOTSTRAP_ORIGIN);
  m.setMode('alter');
  expect(m.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks)).toBe(12);
  m.computerReset();
  m.setMode('run');
  return m;
}

function captureRun(): { readonly stop: string | undefined; readonly captures: ReadonlyMap<Addr, Capture> } {
  expect(assembled.ok).toBe(true);
  const parsed = parseDeck(DATA);
  expect(parsed.errors).toEqual([]);
  const m = boot([...loaderDeck(assembled.deck), ...parsed.deck]);
  const wanted = new Set(EXPECTED.map((entry) => entry.at));
  const captures = new Map<Addr, Capture>();
  const pline = symbol('PLINE');
  const plgm = symbol('PLGM');

  let stop: string | undefined;
  for (let count = 0; count < 100_000; count++) {
    const at = m.regs.iar;
    if (wanted.has(at) && !captures.has(at)) {
      captures.set(at, {
        text: textAt(m, pline, PRINT_POSITIONS),
        terminator: {
          glyph: glyphOf(m.storage.read(plgm) & BCD6),
          wordMark: m.storage.wm(plgm),
        },
      });
    }
    stop = m.step();
    if (stop !== undefined) break;
  }
  return { stop, captures };
}

describe('Wave 1 — print area immediately before each report-format W1 (plan §11.4)', () => {
  const { stop, captures } = captureRun();

  it('runs the hand-written target to its programmed halt and reaches all eight W1 sites', () => {
    expect(stop).toBe('halt');
    expect([...captures.keys()].sort((a, b) => a - b))
      .toEqual(EXPECTED.map((entry) => entry.at).sort((a, b) => a - b));
  });

  it('the source PGLINs still name those eight assembled instruction addresses', () => {
    const actual = assembled.listing
      .filter((entry) => EXPECTED.some((expected) => expected.pglin === entry.pglin))
      .map((entry) => [entry.pglin, entry.addrs]);
    expect(actual).toEqual(EXPECTED.map((entry) => [entry.pglin, entry.at]));
  });

  for (const expected of EXPECTED) {
    it(`${expected.pglin} ${expected.kind}: all 132 positions match the frozen column map`, () => {
      expect(captures.get(expected.at)?.text).toBe(expected.text);
    });

    it(`${expected.pglin} ${expected.kind}: PLGM is the separate marked terminator`, () => {
      expect(captures.get(expected.at)?.terminator).toEqual({ glyph: '⧧', wordMark: true });
    });
  }
});

describe('Wave 5 append — generated print area matches the same pre-generator map', () => {
  const spec = readFileSync('demos/sales-summary.rpg', 'utf8');
  const generated = generate(spec);
  const generatedAssembly = assemble(generated.source);

  function generatedSymbol(name: string): Addr {
    const entry = generatedAssembly.symbols.get(name);
    if (entry === undefined) throw new Error(`generated sales-summary has no ${name} symbol`);
    return entry.value;
  }

  function captureGenerated(): {
    readonly stop: string | undefined;
    readonly captures: ReadonlyMap<Addr, Capture>;
  } {
    const parsed = parseDeck(DATA);
    expect(parsed.errors).toEqual([]);
    const machine = boot([...loaderDeck(generatedAssembly.deck), ...parsed.deck]);
    const wanted = new Set(EXPECTED.map((entry) => entry.at));
    const captures = new Map<Addr, Capture>();
    const pline = generatedSymbol('PLINE');
    const plgm = generatedSymbol('PLGM');

    let stop: string | undefined;
    for (let count = 0; count < 100_000; count++) {
      const at = machine.regs.iar;
      if (wanted.has(at) && !captures.has(at)) {
        captures.set(at, {
          text: textAt(machine, pline, PRINT_POSITIONS),
          terminator: {
            glyph: glyphOf(machine.storage.read(plgm) & BCD6),
            wordMark: machine.storage.wm(plgm),
          },
        });
      }
      stop = machine.step();
      if (stop !== undefined) break;
    }
    return { stop, captures };
  }

  const { stop, captures } = captureGenerated();

  it('generates cleanly and reaches every mapped W1 address', () => {
    expect(generated.ok).toBe(true);
    expect(generated.diagnostics).toEqual([]);
    expect(generatedAssembly.ok).toBe(true);
    expect(generatedAssembly.flagged).toEqual([]);
    expect(generatedAssembly.warnings).toEqual([]);
    expect(stop).toBe('halt');
    expect([...captures.keys()].sort((a, b) => a - b))
      .toEqual(EXPECTED.map((entry) => entry.at).sort((a, b) => a - b));
  });

  for (const expected of EXPECTED) {
    it(`${expected.kind}: generated all 132 positions match the frozen column map`, () => {
      expect(captures.get(expected.at)?.text).toBe(expected.text);
    });

    it(`${expected.kind}: generated PLGM is the separate marked terminator`, () => {
      expect(captures.get(expected.at)?.terminator).toEqual({ glyph: '⧧', wordMark: true });
    });
  }
});
