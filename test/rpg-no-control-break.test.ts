// Tier 2 — THE NO-CONTROL-BREAK DEMONSTRATION, AND THE EXTRACT PAGE. Plan §8.4-§8.7, §11 wave 5
// oracles (b) and (c), §12.1 T2, §13 criterion 17. This is `STATUS.md:221`'s and
// `PHASE-5-NOTES.md` §4's requirement discharged on a trajectory table: the generator must be
// SHOWN to omit control-break machinery, with a check behind it.
//
// THE KICKOFF'S SUGGESTED CHECK IS FALSE IN BOTH HALVES AND IS NOT WRITTEN HERE. "The generated
// program contains no `CTLBRK`/`F1` ladder" fails on a CORRECT build: `01330CTLBRK B DTLCAL` is
// emitted on a job with zero control fields, because the cycle always has the section even when
// the section is one unconditional branch, and `01250 BEF1 LASTCD` — the end-of-file branch —
// defeats any text grep for `F1`. So the predicate runs over the MODEL and over ASSEMBLER
// SYMBOLS, never over source text (§8.6, §14 R14).
//
// AND IT IS INVERTED OVER `demos/sales-summary.rpg`, so it cannot rot into a tautology. Every
// clause below is asserted positively over the trajectory job and negatively over the sales job,
// which HAS two control fields; a generator change that quietly stopped emitting the machinery
// altogether would turn the inverted half red.
//
// CLAUSE 4 IS WHAT MAKES THIS A DEMONSTRATION RATHER THAN A RESTATEMENT OF `demos/card-list.rpg`.
// `TOTOUT` is 16 cards on the trajectory job against card-list's 1, because the trajectory job has
// an LR total line and card-list has none: a `BCE …,LC,0`-guarded total-output arm with NO
// `F1`-guarded arm beside it. That block is the one piece of generator coverage this phase adds.
//
// TWO ACCESSOR NOTES, both measured. `driver(model, layout)` called without `generate()`'s private
// `emittersFor(model)` returns `totalCalc` and `totalOutput` EMPTY, so clause 4 runs over
// `generate(text).cards` and never over a re-driven section map. And `scan()` alone does not
// produce a model — the pipeline is `model(parseScanned(scan(readSpecSource(text))))`
// (`src/rpg/generate.ts:4-7`).

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { chainGlyph } from '../src/core/devices/printer1403.js';
import { renderGreenBar } from '../src/core/devices/printer1403.js';
import { createMachine } from '../src/core/machine.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';
import { CYCLE_SECTION_LABEL } from '../src/rpg/cycle.js';
import { parseScanned, scan } from '../src/rpg/deck.js';
import { generate } from '../src/rpg/generate.js';
import { model } from '../src/rpg/model.js';
import { readSpecSource } from '../src/rpg/sheets/read.js';

const REENTRY = readFileSync('demos/reentry-summary.rpg', 'utf8');
const SALES = readFileSync('demos/sales-summary.rpg', 'utf8');
const DATA = readFileSync('demos/reentry-summary.data.cards', 'utf8');
const GOLDEN_PAGE = readFileSync('test/golden/reentry-summary.page.txt', 'utf8');

/** Autocoder's own card layout: label in columns 6-15, operation in 16-20, operand from 21. */
const LABEL = [5, 15] as const;
const OPCODE = [15, 20] as const;
const OPERAND = 20;

/** §1's step count, which the extract's `ROWS TABULATED` line counts independently. */
const ROWS = 92;
/** The generated program declares `CTL 1` — 10,000 positions, as `demos/sales-summary.rpg` does. */
const MACHINE_POSITIONS = 10_000;

/** The four sections whose card counts §8.6 clause 4 publishes. */
const CONTROL_BREAK_SECTIONS = ['controlBreak', 'totalCalc', 'totalOutput', 'levelReset'] as const;

interface Measured {
  readonly controlFields: readonly unknown[];
  readonly symbols: readonly string[];
  readonly indicatorSymbols: readonly string[];
  readonly saveAreaSymbols: readonly string[];
  readonly sections: Readonly<Record<string, number>>;
  readonly indicatorFile: string;
  readonly indicatorEntries: readonly string[];
}

const field = (card: string, [from, to]: readonly [number, number]): string =>
  card.slice(from, to).trim();

/**
 * Source cards between one cycle-section label and the next, in emitted order — §8.6 clause 4.
 * `CYCLE_SECTION_LABEL` (`src/rpg/cycle.ts:60-78`) names every section head, and a section's size
 * is the distance to whichever head follows it, so a section that emits nothing but its own label
 * measures 1.
 */
function sectionCounts(cards: readonly string[]): Record<string, number> {
  const heads: { readonly at: number; readonly section: string }[] = [];
  for (const [section, label] of Object.entries(CYCLE_SECTION_LABEL)) {
    const at = cards.findIndex((card) => field(card, LABEL) === label);
    if (at < 0) continue;
    expect(cards.filter((card) => field(card, LABEL) === label),
      `${label} labels ${cards.filter((c) => field(c, LABEL) === label).length} cards, not 1`)
      .toHaveLength(1);
    heads.push({ at, section });
  }
  heads.sort((a, b) => a.at - b.at);
  const counts: Record<string, number> = {};
  heads.forEach((head, i) => {
    counts[head.section] = (heads[i + 1]?.at ?? cards.length) - head.at;
  });
  return counts;
}

/** The `IND DA` declaration and the indicator names declared under it, in order. */
function indicatorFile(cards: readonly string[]): { file: string; entries: string[] } {
  const at = cards.findIndex((card) => field(card, LABEL) === 'IND' && field(card, OPCODE) === 'DA');
  expect(at, 'the generated program declares no IND DA indicator file').toBeGreaterThan(-1);
  const entries: string[] = [];
  for (let i = at + 1; i < cards.length; i += 1) {
    const card = cards[i] ?? '';
    if (field(card, OPCODE) !== '') break;
    entries.push(field(card, LABEL));
  }
  return { file: field(cards[at] ?? '', [OPERAND, OPERAND + 5] as const), entries };
}

function measure(text: string): Measured {
  const generated = generate(text);
  expect(generated.ok, 'the specification deck generates').toBe(true);
  expect(generated.diagnostics, 'the specification deck generates cleanly').toEqual([]);
  const assembled = assemble(generated.source);
  expect(assembled.ok, 'the generated program assembles').toBe(true);
  expect(assembled.flagged, 'the generated program assembles with flagged lines').toEqual([]);
  expect(assembled.warnings, 'the generated program assembles with warnings').toEqual([]);

  const resolved = model(parseScanned(scan(readSpecSource(text))));
  const symbols = [...assembled.symbols.keys()];
  const { file, entries } = indicatorFile(generated.cards);
  return {
    controlFields: resolved.model?.controlFields ?? [],
    symbols,
    indicatorSymbols: symbols.filter((s) => /^F[0-9]+$/.test(s)),
    saveAreaSymbols: symbols.filter((s) => /^C[NO][0-9]+$/.test(s)),
    sections: sectionCounts(generated.cards),
    indicatorFile: file,
    indicatorEntries: entries,
  };
}

const reentry = measure(REENTRY);
const sales = measure(SALES);

/** The extract, through the real generator, assembler, condensed loader, 1402 and 1411. */
function extractPage(): { readonly page: string; readonly stop: string | undefined } {
  const generated = generate(REENTRY);
  const assembled = assemble(generated.source);
  const { deck, errors } = parseDeck(DATA);
  expect(errors, 'the punched data deck parses with zero errors').toEqual([]);
  expect(deck, `the punched data deck holds ${deck.length} cards`).toHaveLength(ROWS);

  const machine = createMachine({ size: MACHINE_POSITIONS });
  machine.loadDeck([...loaderDeck(assembled.deck), ...deck]);
  machine.readerStart();
  machine.readerEndOfFile();
  machine.display(BOOTSTRAP_ORIGIN);
  machine.setMode('alter');
  expect(machine.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks)).toBe(12);
  machine.computerReset();
  machine.setMode('run');

  let stop: string | undefined;
  for (let i = 0; stop === undefined && i < 2_000_000; i += 1) stop = machine.start(1);
  machine.endOfJob();
  return {
    page: renderGreenBar(machine.snapshot().printer.paper, { chain: 'A', formLines: 66 }),
    stop,
  };
}

const extract = extractPage();

describe('Wave 5 — the RPG demonstration, four clauses (plan §8.6, §13 criterion 17)', () => {
  it('CLAUSE 1 — the trajectory job declares no control fields, and the sales job declares two', () => {
    // `controlFieldEnd1` at columns 44-46 of the Input sheet is BLANK on every `reentry-summary`
    // record, which is the whole point of the deck (§8.4).
    expect(reentry.controlFields, 'the trajectory job declares control fields').toEqual([]);
    expect(sales.controlFields, 'the inverted half: the sales job must declare two')
      .toEqual([{ n: 1, end: 6, length: 3 }, { n: 2, end: 3, length: 2 }]);
  });

  it('CLAUSE 2 — no Fn indicator symbol is assembled, against the sales jobs F1 and F2', () => {
    // Over ASSEMBLER SYMBOLS, not source text: `BEF1 LASTCD` is an end-of-file branch and puts the
    // characters `F1` in a correct program's source on every job in the repository.
    expect(reentry.indicatorSymbols,
      `the trajectory job assembles ${reentry.indicatorSymbols.join(' ')} among its `
      + `${reentry.symbols.length} symbols`).toEqual([]);
    expect(reentry.symbols, 'the trajectory job assembles a different symbol count').toHaveLength(66);
    expect(sales.indicatorSymbols, 'the inverted half: the sales job must assemble F1 and F2')
      .toEqual(['F1', 'F2']);
    expect(sales.symbols).toHaveLength(86);
  });

  it('CLAUSE 3 — no CN/CO control-field save area, against the sales jobs four', () => {
    // `CNn` holds the control field read off this card and `COn` the one off the last; with no
    // control field there is nothing to compare and neither area is allocated.
    expect(reentry.saveAreaSymbols,
      `the trajectory job assembles ${reentry.saveAreaSymbols.join(' ')}`).toEqual([]);
    expect(sales.saveAreaSymbols, 'the inverted half: the sales job must assemble all four')
      .toEqual(['CN1', 'CN2', 'CO1', 'CO2']);
  });

  it('CLAUSE 4 — the four control-break sections are one card each, against the sales jobs 12/7/54/5', () => {
    // The clause that makes this a demonstration. `CTLBRK`, `TOTCAL` and `LVLRST` are their own
    // labels and nothing else — the section exists, and it is empty. `TOTOUT` is 16 because the
    // trajectory job HAS a total line (`LT11X 02 LC`, the LR-guarded `ROWS TABULATED` /
    // `FINAL HEAT LOAD` line), and that block is a `BCE …,LC,0`-guarded arm with NO `F1`-guarded
    // arm beside it. Against `demos/card-list.rpg`, whose `TOTOUT` is 1, that is the generator
    // coverage this phase adds (§8.6, `PHASE-5-NOTES.md` §4).
    expect(CONTROL_BREAK_SECTIONS.map((s) => reentry.sections[s]),
      `the trajectory job's ${CONTROL_BREAK_SECTIONS.join('/')} card counts`)
      .toEqual([1, 1, 16, 1]);
    expect(CONTROL_BREAK_SECTIONS.map((s) => sales.sections[s]),
      "the inverted half: the sales job's own four").toEqual([12, 7, 54, 5]);
    // And the comparison that makes the claim evidence rather than prose: `demos/card-list.rpg` —
    // the other job with zero control fields — emits `TOTOUT` as its own label and nothing else.
    const cardList = sectionCounts(generate(readFileSync('demos/card-list.rpg', 'utf8')).cards);
    expect(cardList['totalOutput'], "card-list's TOTOUT, which the trajectory job's 16 exceeds "
      + 'by the whole LR total-line block').toBe(1);
  });

  it('the indicator file carries five names and not one of them is an Fn', () => {
    expect(reentry.indicatorFile, "the trajectory job's IND DA declaration").toBe('1X5');
    expect(reentry.indicatorEntries).toEqual(['RC01', 'OF', 'LC', 'FSTPG', 'PRIME']);
    expect(sales.indicatorFile, 'the inverted half: two more indicators, two more positions')
      .toBe('1X7');
    expect(sales.indicatorEntries).toEqual(['RC01', 'F1', 'F2', 'OF', 'LC', 'FSTPG', 'PRIME']);
  });
});

describe('Wave 5 — the extract page (plan §8.7, §13 criterion 17)', () => {
  it('the run halts and the page equals test/golden/reentry-summary.page.txt BYTE FOR BYTE', () => {
    // Through the REAL generator -> assembler -> condensed loader -> 1402 -> 1411. The chain is
    // `test/tier3-rpg-generated-equals-target.test.ts`'s, on the punched trajectory deck.
    expect(extract.stop, `the extract run ended ${String(extract.stop)}`).toBe('halt');
    const bytes = (text: string): number => new TextEncoder().encode(text).length;
    expect(bytes(extract.page), 'the extract page is a different size than §8.7 fixes')
      .toBe(bytes(GOLDEN_PAGE));
    expect(extract.page).toBe(GOLDEN_PAGE);
  });

  it('RECONSTRUCTION IS ON EVERY \\f-SEPARATED FORM — criterion 17s second half', () => {
    // The hole the design panel found in all three proposals: each asserted the disclaimer on the
    // trajectory page and then shipped a SECOND printed artifact without it (RULINGS §C 13). It is
    // on the `HA2` line for form 1 and the `HB2` line for every overflow form, so it is asserted
    // PER FORM here, exactly as `test/tier4-reentry-target.test.ts` asserts it on the page.
    const forms = extract.page.split('\f');
    expect(forms, `the extract paginates to ${forms.length} forms and §8.7 fixes 2`).toHaveLength(2);
    forms.forEach((form, i) => {
      expect(form, `form ${i + 1} of ${forms.length} carries no RECONSTRUCTION line`)
        .toContain('RECONSTRUCTION - NOT FLIGHT DATA');
    });
  });

  it('the total line counts the same 92 rows the punch stacked', () => {
    // The LR total line is the block clause 4 measures at 16 cards; this is what it prints.
    const tabulated = /ROWS TABULATED\s+(\d+)/.exec(extract.page)?.[1];
    expect(tabulated, 'the extract carries no ROWS TABULATED line').toBeDefined();
    expect(Number(tabulated), `the extract tabulated ${String(tabulated)} rows`).toBe(ROWS);
    expect(extract.page, 'the extract carries no FINAL HEAT LOAD figure')
      .toMatch(/FINAL HEAT LOAD\s+19,489\.13/);
  });
});

// CRITERION 15's OTHER HALF. §13 criterion 15 scopes the chain-A sweep to "any printed literal of
// `demos/reentry.asm` OR `demos/reentry-summary.rpg`". `test/reentry-page-parse.test.ts` sweeps the
// Autocoder deck only — it was written in wave 4, before this RPG deck existed, and §12.1's
// complete list of three editable test files forbids wave 5 from touching it. So the RPG half lives
// here, in wave 5's own file, which is the only legal home for it.
//
// The golden cannot substitute for this. A glyph that HAS a BCD but prints as something else on
// chain A would be baked into `test/golden/reentry-summary.page.txt` and pass a byte comparison
// forever — the page would simply be wrong in the same way every time. `=`, `(`, `)` and `+` have
// no BCD in this emulator AT ALL (`bcdOfGlyph` returns undefined), so a spec deck cannot even spell
// them; what this catches is the subtler case, a character that survives the punch and prints as
// its chain-A dual.
describe('Wave 5 — criterion 15: no character outside chain A in the RPG spec deck', () => {
  it('every character of demos/reentry-summary.rpg is on the A arrangement', () => {
    const text = readFileSync('demos/reentry-summary.rpg', 'utf8');
    const offenders: string[] = [];
    text.split('\n').forEach((line, i) => {
      [...line].forEach((ch, col) => {
        if (ch === '\r') return;
        const bcd = bcdOfGlyph(ch);
        if (bcd === undefined) { offenders.push(`${i + 1}:${col + 1} ${JSON.stringify(ch)} has no BCD`); return; }
        const back = chainGlyph(bcd, 'A');
        if (back !== ch) offenders.push(`${i + 1}:${col + 1} ${JSON.stringify(ch)} prints as ${JSON.stringify(back)} on chain A`);
      });
    });
    expect(offenders, `${offenders.length} character(s) off the A arrangement`).toEqual([]);
  });

  it('sweeps a deck with something in it, so the empty case cannot pass vacuously', () => {
    const text = readFileSync('demos/reentry-summary.rpg', 'utf8');
    const printable = [...text].filter((ch) => ch !== '\n' && ch !== ' ').length;
    expect(printable, `${printable} non-blank characters swept`).toBeGreaterThan(1_000);
  });
});
