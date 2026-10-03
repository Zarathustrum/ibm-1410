// src/ui/period/specs/sheetView.ts — the SPECIFICATION SHEET station: one 80-column text area
// under a parser-backed per-sheet ruler, in a period header band.
// Source: Phase-4 plan §9.2 (this file's spec), §1 step 2 (the storyboard), §2.2 and §14 R12 (the
// refusal below, at Zarathustrum's gate rather than at criterion 19), §10.3 (inline style attributes;
// `src/ui/styles/period.css` owns the class rules), §11 wave 5b. `git mv` from Phase 5's
// `period/rpg/specBox.ts`; the ruler, `sheetOf`, `activeLine` and the five listeners are its.
//
// WHICH MACHINE: the 1410's CARD RPG. C28-1443, the 1410 RPG manual, is not digitised
// (rpg-sources.md §2.2 and §3, `[verified]` absences), so the columns the ruler prints are the
// SHARED X24-1336…1339 card-system sheets of J24-0215-2 pp.21-22, 26-28, 33-34, 43-44 —
// rpg-sources.md §6 `[verified]`, with §5's ruling that the sheets *are* the 1401 sheets
// `[verified for the card systems]`. The spans live in `src/rpg/sheets/columns.ts` where the parser
// slices them; this view reads that table and writes no column number of its own (§11 wave 5 (d)).
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It draws no facsimile X24-1336…1339 form.** No scan of any of the four exists
//    (rpg-sources.md §3, a `[verified]` absence): the COLUMNS are `[verified]` and the ARTWORK is
//    not, so a drawn form would put invented artwork around verified columns, against
//    `docs/research/README.md`'s "Do not encode". PHASE-5-NOTES.md §4 calls this ruler "the
//    parser-backed specification for the later drawn forms" — later. It is the largest deliberate
//    fidelity gap in the phase (§2.2, §14 R12), and the §15 ruling that carries it,
//    `THE_RULER_IS_THE_FORM`, is declared once in `period/coding/sheetView.ts` — cited here, not
//    redeclared. No separate on-screen Input / Data / Calculation / Format sheet is drawn either:
//    one text area holds the deck as Phase 5 shipped it, and column 1 selects the ruler over it.
//  · It creates no node at import time — `SHEET_RULERS` is DATA, so a node test reads the drawn
//    spans without a DOM (plan §12).

import { CARD_COLUMNS } from '../../../core/types.js';
import { SHEET_COLUMNS } from '../../../rpg/sheets/columns.js';
import type { SheetField, SheetKind } from '../../../rpg/types.js';
import { make } from '../dom.js';
import sampleData from '../../../../demos/sales-summary.data.cards?raw';
import sampleSpecs from '../../../../demos/sales-summary.rpg?raw';
import reentryData from '../../../../demos/reentry-summary.data.cards?raw';
import reentrySpecs from '../../../../demos/reentry-summary.rpg?raw';
import type { RpgSession } from '../rpg/session.js';

/** The band across the top of the sheet: what the form is, and that it is a ruler and not a scan. */
const BAND = 'RPG specification sheets — 1410 card system';
const BAND_FORMS = 'X24-1336 · X24-1337 · X24-1338 · X24-1339 — column layout from J24-0215-2. '
  + 'The ruler is the form: the columns are verified, the artwork of the four sheets is not '
  + 'digitised, and none of it is drawn.';

export interface RpgSpecBox {
  readonly el: HTMLElement;
}

/** One drawn span on a ruler: a field's name and the two card positions it occupies. */
export interface RulerField {
  readonly name: string;
  readonly start: number;
  readonly end: number;
}

const spansOf = (fields: readonly SheetField[]): readonly RulerField[] =>
  fields.map((field) => ({ name: field.name, start: field.cols[0], end: field.cols[1] }));

/** Every drawn ruler, DERIVED from `SHEET_COLUMNS` and never written out here — the one place a
 *  node test reads what this station puts on the page and diffs it against the parser's table. */
export const SHEET_RULERS: Readonly<Record<SheetKind, readonly RulerField[]>> = {
  control: spansOf(SHEET_COLUMNS.control),
  input: spansOf(SHEET_COLUMNS.input),
  data: spansOf(SHEET_COLUMNS.data),
  calculation: spansOf(SHEET_COLUMNS.calculation),
  format: spansOf(SHEET_COLUMNS.format),
};

interface Hooks {
  generate(): void;
  invalidate(): void;
}

function codingArea(rows: number): HTMLTextAreaElement {
  const box = document.createElement('textarea');
  box.rows = rows;
  box.spellcheck = false;
  box.wrap = 'off';
  return box;
}

function sheetOf(line: string): SheetKind | undefined {
  if (line.startsWith('RG')) return 'control';
  const first = line[0] ?? '';
  if (first === 'C' || first === 'S') return 'input';
  if (first === 'D') return 'data';
  if (first === 'A') return 'calculation';
  if ('LFBKW'.includes(first)) return 'format';
  return undefined;
}

function ruler(kind: SheetKind | undefined): string {
  const tens = Array.from({ length: CARD_COLUMNS }, (_, index) => {
    const column = index + 1;
    return column % 10 === 0 ? String((column / 10) % 10) : column % 5 === 0 ? '+' : '.';
  }).join('');
  if (kind === undefined) return `UNIDENTIFIED SHEET - COLUMN 1 SELECTS THE RULER\n${tens}`;
  const fields = SHEET_COLUMNS[kind].map((field) => {
    const [from, to] = field.cols;
    return `${String(from).padStart(2, '0')}-${String(to).padStart(2, '0')} ${field.name}`
      + `${field.inScope ? '' : ` - ${field.why ?? 'out of scope'}`}`;
  });
  return [`${kind.toUpperCase()} SPECIFICATION SHEET - SHARED X24 CARD LAYOUT`, tens, ...fields]
    .join('\n');
}

function activeLine(box: HTMLTextAreaElement): string {
  const before = box.value.slice(0, box.selectionStart);
  return before.slice(before.lastIndexOf('\n') + 1);
}

/** The band, pulled out over the box's own padding (`period.css` §7's) so the sheet reads as
 *  printed stock with a masthead. Both colours are the desk's, so flipping §15's ruling is a
 *  stylesheet edit and not a view edit. */
function headerBand(): HTMLElement {
  const el = make('div');
  el.style.margin = '-.5em -.6em .55em';
  el.style.padding = '.35em .6em .4em';
  el.style.background = 'var(--desk-pedestal)';
  el.style.color = 'var(--card-stock)';
  const title = make('div');
  title.textContent = BAND;
  title.style.textTransform = 'uppercase';
  title.style.letterSpacing = '.08em';
  const forms = make('div');
  forms.textContent = BAND_FORMS;
  forms.style.fontSize = '.85em';
  el.append(title, forms);
  return el;
}

export function createRpgSpecBox(session: RpgSession, hooks: Hooks): RpgSpecBox {
  const el = make('div', 'rpg-spec-box');
  const guide = make('pre');
  guide.style.whiteSpace = 'pre';
  guide.style.overflowX = 'auto';

  const specs = codingArea(20);
  const dataLabel = make('div');
  dataLabel.textContent = 'Data cards placed behind the generated object deck.';
  dataLabel.style.margin = '.6em 0 .2em';
  const data = codingArea(6);
  data.style.marginBottom = '.6em';

  const refreshRuler = (): void => { guide.textContent = ruler(sheetOf(activeLine(specs))); };
  const specChanged = (): void => {
    session.setSpecText(specs.value);
    hooks.invalidate();
    refreshRuler();
  };
  const dataChanged = (): void => {
    session.setDataText(data.value);
    hooks.invalidate();
  };
  specs.addEventListener('input', specChanged);
  specs.addEventListener('click', refreshRuler);
  specs.addEventListener('keyup', refreshRuler);
  specs.addEventListener('select', refreshRuler);
  data.addEventListener('input', dataChanged);

  const sample = make('button');
  sample.textContent = 'sample specs';
  sample.addEventListener('click', () => {
    specs.value = sampleSpecs;
    data.value = sampleData;
    session.setSpecText(sampleSpecs);
    session.setDataText(sampleData);
    hooks.invalidate();
    refreshRuler();
  });

  // THE SECOND SAMPLE (phase-6 plan §10.1, §1 step 11). BOTH files are imported BY NAME, exactly
  // as the sales pair above is: the `.data.cards` sibling inference lives in `tools/rpg.ts:234` and
  // is CLI-side, so it gives this view nothing. The data deck is the one the 1402 punched on the
  // trajectory run, byte for byte (§8.3).
  const sampleReentry = make('button');
  sampleReentry.textContent = 'sample reentry summary';
  sampleReentry.addEventListener('click', () => {
    specs.value = reentrySpecs;
    data.value = reentryData;
    session.setSpecText(reentrySpecs);
    session.setDataText(reentryData);
    hooks.invalidate();
    refreshRuler();
  });

  const generate = make('button');
  generate.textContent = 'GENERATE';
  generate.addEventListener('click', hooks.generate);

  el.append(headerBand(), guide, specs, dataLabel, data, sample, ' ', sampleReentry,
    ' ', generate);
  refreshRuler();
  return { el };
}
