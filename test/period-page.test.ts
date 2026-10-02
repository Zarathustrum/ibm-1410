// Tier 2 — `paginate`, `trimRule3` and the free oracle. Plan §5.1, §12.1 T2, §13 criterion 8.
//
// THE ORACLE IS `renderGreenBar` OVER THE THREE SHIPPED PAGE GOLDENS, and it costs no fixture:
// `test/golden/hello-dad.page.txt` (348 B), `sales-summary.page.txt` (3688 B) and
// `cycle-probe.page.txt` (2522 B) are READ here and NEVER WRITTEN — they are Phase 2's and Phase
// 5's, on §3.7's do-not-touch list, and each paper below is obtained by RE-RUNNING the shipped
// deck through the real loader, the real 1402 and the real 1411 rather than parsed out of the
// file. The identity of §5.1 then says the two independent renderers agree byte for byte:
//
//   renderGreenBar(paper, {chain:'A', formLines:66})
//     === '1403 Model 2 · chain A · 66-line form\n\n'
//       + paginate(paper, carriage, 66).filter((p) => p.printedThrough > 0)
//           .map(trimRule3).join('\f\n')
//
// It is an oracle only while the two are independent, which is `PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR`
// (§15): the last case here READS `src/ui/period/paper/page.ts` and asserts no import specifier in
// it names `printer1403` — the file's text, not its module. The synthetic three-form paper is
// authored here because no shipped demo prints past two forms and Phase 6's trajectory report
// will (critic item 4d); its form 2 carries the one blank `PrintLine` of
// `L_WRITE_WORD_MARKS_PRINTS_A_BLANK_LINE`, which is why `printedThrough` is a field.
// The machine is the IBM 1403 Model 2 throughout: 132 print positions (io.md §7, A22-0526-3 p.67).

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import {
  PRINT_POSITIONS as CORE_PRINT_POSITIONS, renderGreenBar,
} from '../src/core/devices/printer1403.js';
import { createMachine } from '../src/core/machine.js';
import type { CarriageState, Deck, PrintLine } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';
import { generate } from '../src/rpg/generate.js';
import {
  paginate, PRINT_POSITIONS, trimRule3, type FormPage,
} from '../src/ui/period/paper/page.js';

const CHAIN = 'A' as const;
const FORM_LINES = 66;
const RUN_BUDGET = 100_000;
const HEADER = `1403 Model 2 · chain ${CHAIN} · ${FORM_LINES}-line form\n\n`;

interface Paper { readonly paper: readonly PrintLine[]; readonly carriage: CarriageState }

/** `noUncheckedIndexedAccess` is on: name the form rather than index into the array. */
function form(pages: readonly FormPage[], n: number): FormPage {
  const found = pages.find((page) => page.form === n);
  if (found === undefined) throw new Error(`no form ${n} in the paginated paper`);
  return found;
}

/** The message a call threw, so two renderers' message SHAPES can be compared directly. */
function thrownBy(call: () => unknown): string {
  try {
    call();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('expected a throw, got a value');
}

/** The operator's whole sequence, exactly as `tools/run-deck.ts` and the tier-4 gates perform it. */
function operate(deck: Deck): Paper {
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
  // The pending automatic single space is carriage motion only `endOfJob` performs (plan §7.3).
  machine.endOfJob();
  const state = machine.snapshot();
  return { paper: state.printer.paper, carriage: state.printer.carriage };
}

/** The RPG route of `test/tier4-rpg-demo.test.ts`: specification -> Autocoder -> loader -> 1411. */
function fromSpec(name: string): Paper {
  const result = generate(readFileSync(`demos/${name}.rpg`, 'utf8'));
  expect(result.ok, name).toBe(true);
  const assembled = assemble(result.source);
  expect(assembled.ok, name).toBe(true);
  const data = parseDeck(readFileSync(`demos/${name}.data.cards`, 'utf8'));
  expect(data.errors, name).toEqual([]);
  return operate([...loaderDeck(assembled.deck), ...data.deck]);
}

/**
 * The deck runs LAZILY and exactly once. `operate` asserts as it goes — the ALTER count, the halt
 * — and those `expect`s must fire INSIDE a test, so a machine regression is a named failing case
 * and not a collection error with no case attached to it.
 */
function once(run: () => Paper): () => Paper {
  let ran: Paper | undefined;
  return (): Paper => (ran ??= run());
}

const DEMOS: readonly (readonly [string, () => Paper])[] = [
  ['hello-dad', once(() => operate(parseDeck(readFileSync('demos/hello-dad.cards', 'utf8')).deck))],
  ['sales-summary', once(() => fromSpec('sales-summary'))],
  ['cycle-probe', once(() => fromSpec('cycle-probe'))],
];

describe('§5.1 — the identity, over the three shipped page goldens', () => {
  for (const [name, run] of DEMOS) {
    const golden = readFileSync(`test/golden/${name}.page.txt`, 'utf8');

    it(`${name}: the re-run paper is the golden page`, () => {
      const { paper } = run();
      expect(renderGreenBar(paper, { chain: CHAIN, formLines: FORM_LINES })).toBe(golden);
    });

    it(`${name}: renderGreenBar === header + the trimmed, \\f\\n-joined paginate`, () => {
      const { paper, carriage } = run();
      expect(renderGreenBar(paper, { chain: CHAIN, formLines: FORM_LINES })).toBe(
        HEADER
        + paginate(paper, carriage, FORM_LINES)
          .filter((p) => p.printedThrough > 0)
          .map(trimRule3)
          .join('\f\n'),
      );
    });

    it(`${name}: every FormPage.lines entry is exactly ${PRINT_POSITIONS} characters`, () => {
      const { paper, carriage } = run();
      const pages = paginate(paper, carriage, FORM_LINES);
      expect(pages.length).toBeGreaterThan(0);
      for (const page of pages) {
        expect(page.lines).toHaveLength(FORM_LINES);
        for (const line of page.lines) expect(line).toHaveLength(PRINT_POSITIONS);
      }
    });
  }
});

// Forms 1, 2 and 3. Form 2 carries ONE blank PrintLine at line 1 — 132 blanks, which is what
// `L_WRITE_WORD_MARKS_PRINTS_A_BLANK_LINE` (printer1403.ts:309-326) puts on the paper — so rule 3
// emits it, `printedThrough` is 1, and a blank SCAN of `lines` would have said 0.
const SYNTHETIC: readonly PrintLine[] = [
  { page: 1, line: 1, text: 'FORM ONE LINE ONE' },
  { page: 1, line: 4, text: 'FORM ONE LINE FOUR    ' },
  { page: 2, line: 1, text: ' '.repeat(PRINT_POSITIONS) },
  { page: 3, line: 2, text: 'FORM THREE LINE TWO' },
];
const ON_FORM_3: CarriageState = {
  page: 3, line: 2, channel9: false, channel12: false, autoSpacePending: true,
};

describe('§5.1 — the synthetic three-form paper (critic item 4d)', () => {
  const pages = paginate(SYNTHETIC, ON_FORM_3, FORM_LINES);

  it('rule 1: three forms, 66 entries each, every entry exactly 132 characters', () => {
    expect(pages.map((p) => p.form)).toEqual([1, 2, 3]);
    for (const page of pages) {
      expect(page.lines).toHaveLength(FORM_LINES);
      for (const line of page.lines) expect(line).toHaveLength(PRINT_POSITIONS);
    }
    expect(form(pages, 1).lines[0]).toBe('FORM ONE LINE ONE'.padEnd(PRINT_POSITIONS, ' '));
    expect(form(pages, 1).lines[1]).toBe(' '.repeat(PRINT_POSITIONS));
  });

  it('rule 2: `complete` is false only for the form the carriage is on', () => {
    expect(pages.map((p) => p.complete)).toEqual([true, true, false]);
  });

  it('rule 3: the emitted set is the ascending union of the paper and the carriage', () => {
    const onEmptyForm4 = paginate(SYNTHETIC, { ...ON_FORM_3, page: 4, line: 1 }, FORM_LINES);
    expect(onEmptyForm4.map((p) => p.form)).toEqual([1, 2, 3, 4]);
    expect(form(onEmptyForm4, 4).printedThrough).toBe(0);   // so the page filters it out
    expect(form(onEmptyForm4, 4).complete).toBe(false);
    expect(onEmptyForm4.map((p) => p.form)).not.toContain(5);
  });

  it('`printedThrough` is a field, so the 132-blank line on form 2 counts as printed', () => {
    expect(pages.map((p) => p.printedThrough)).toEqual([4, 1, 2]);
    expect(trimRule3(form(pages, 2))).toBe('\n');
    expect(trimRule3(form(pages, 1))).toBe('FORM ONE LINE ONE\n\n\nFORM ONE LINE FOUR\n');
  });

  it('rule 4: two PrintLines at one page:line throw in renderGreenBar\'s message shape', () => {
    const doubled: readonly PrintLine[] = [
      ...SYNTHETIC, { page: 1, line: 4, text: 'THE SECOND WOULD BE LOST' },
    ];
    const mine = thrownBy(() => paginate(doubled, ON_FORM_3, FORM_LINES));
    const theirs = thrownBy(() => renderGreenBar(doubled, { chain: CHAIN, formLines: FORM_LINES }));
    expect(mine).toBe(theirs.replace(/^renderGreenBar:/, 'paginate:'));
    expect(mine).toContain('two print lines at form 1, line 4');
  });
});

describe('§15 — PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR, as an import shape', () => {
  const SOURCE = 'src/ui/period/paper/page.ts';
  const text = readFileSync(SOURCE, 'utf8');

  it('the period 132 and core\'s printer1403.ts:43 agree — the check, not a restatement', () => {
    expect(PRINT_POSITIONS).toBe(CORE_PRINT_POSITIONS);
    expect(PRINT_POSITIONS).toBe(132);
  });

  it(`${SOURCE} contains no import specifier naming printer1403`, () => {
    const specifiers: string[] = [];
    for (const m of text.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) specifiers.push(m[1] ?? '');
    for (const m of text.matchAll(/\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]/g)) {
      specifiers.push(m[1] ?? '');
    }
    // The text, not the module: `renderGreenBar`, `chainGlyph` and `DEFAULT_CARRIAGE_TAPE` are
    // unreachable from `page.ts`, so §5.1's identity is two computations and not one.
    expect(specifiers.filter((s) => s.includes('printer1403'))).toEqual([]);
    expect(specifiers).toEqual(['../../../core/types.js']);
  });
});
