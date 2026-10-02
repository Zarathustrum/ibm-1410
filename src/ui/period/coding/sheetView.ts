// src/ui/period/coding/sheetView.ts — THE CODING SHEET: the source a person writes, the
// parser-backed ruler over it, the data cards under it, and the four controls beside them.
// Source: Phase-4 plan §9.1 (this file's survivor table, the split sample button and the two
// marked columns), §2.2 (no facsimile coding form), §10.3 (inline styles — `src/ui/styles/
// period.css` is wave 5a's and this view edits none of it), §14 R12, §15 THE_RULER_IS_THE_FORM,
// §11 wave 5b. Carried across from `autocoder/sourceBox.ts` by `git mv`; Phase-3 plan §1 step 2,
// §2.5, §14 R10 and R11 are still the source of everything the survivor table names.
//
// WHICH MACHINE: an IBM 1410 running the standalone 1410-AU-906 Autocoder. The sheet's six field
// spans are C28-0309-1 pp.5-7 `[verified]` and are IMPORTED as `SOURCE_FIELDS`
// (`src/asm/types.ts`), never typed here, so a ruler that disagrees with the parser is not
// expressible. Not a 1401: that machine's own Autocoder sheet and listing are a different form,
// refused by name in `coding/listingView.ts`'s header.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It draws no facsimile C28-0309-1 coding form.** The COLUMNS are `[verified]`; the ARTWORK
//    is not digitised (rpg-sources.md §3, a `[verified]` absence), so a drawn form would put
//    invented artwork around verified columns — `docs/research/README.md`'s "Do not encode".
//    The ruler is the form; see the ledger row below.
//  · **It writes no column number.** Every span on the ruler comes from `SOURCE_FIELDS` and both
//    ticks from `COMMENT_COLUMN` / `LABEL_INDENT_COLUMN`, which is what `RULER_FIELDS` and
//    `RULER_MARKS` export for the node test to check the drawn lines against.
//  · **It names one CSS class, `.source-box`**, which `src/ui/styles/period.css` already rules
//    (plan §10.3); the header band is an inline style attribute, as `printer/formView.ts` and
//    this file's own ruler have been since Phase 3. It creates no node at import time.
//
// THE SAMPLE PROGRAM IS AN IMPORT, not a fetch — `demos/` sits outside `public/`, so a fetch works
// under `npm run dev` and 404s in a `vite build` output (`deckBoxView.ts`'s own note). `?raw` needs
// no dependency; `period/raw-import.d.ts` declares both halves.

import {
  COMMENT_COLUMN, LABEL_INDENT_COLUMN, SOURCE_COLUMNS, SOURCE_FIELDS,
} from '../../../asm/types.js';
import { TWELVE_PUNCH } from '../../../asm/source.js';
import type { AutocoderSession } from '../autocoder/session.js';
import { make } from '../dom.js';
import sampleSource from '../../../../demos/hello-dad.asm?raw';
import sampleData from '../../../../demos/hello-dad.data.cards?raw';
import reentrySource from '../../../../demos/reentry.asm?raw';
import reentryCase from '../../../../demos/reentry.case.cards?raw';

/**
 * OPEN: `THE_RULER_IS_THE_FORM` — **REFUSED for this phase**, and the largest deliberate fidelity
 * gap in it (plan §2.2, §9.1, §9.2, §14 R12, §15).
 *
 * The question: whether the coding sheet is a column-addressable facsimile of C28-0309-1's form or
 * a parser-backed ruler over a `<textarea>`. The columns themselves are `[verified]` —
 * C28-0309-1 pp.5-7, console-and-physical.md §12 — and the ARTWORK is not: no scan of the coding
 * form exists (rpg-sources.md §3), so drawing one would encode invented artwork as period fact
 * against `docs/research/README.md`'s `[unverified]` rule, "Do not encode".
 *
 * FALLBACK TAKEN: a period header band and the parser-backed ruler around a text area that stays a
 * text area. PHASE-5-NOTES.md §4 hands this phase the ruler as *"the parser-backed specification
 * for the later drawn forms"* — later; a facsimile is a separate phase of roughly 600 lines with
 * its own oracle, because a drawn form is only worth having if a card column and a form box are
 * the same object and proving that needs its own test.
 *
 * WHAT WOULD SETTLE IT: a scan of the C28-0309-1 coding form. Until one exists the refusal stands
 * on the ARTWORK alone — the columns below are the parser's own constants and are exactly as
 * `[verified]` as the manual is. `open-questions.md`, Phase 4 / Wave 5b.
 */
export const THE_RULER_IS_THE_FORM = true;

/**
 * §2.5's framing paragraph, VERBATIM, and it is on the page rather than only in the plan
 * (`architecture.md` §5 step 0, Phase-3 plan §13 criterion 11b). It is the one thing the whole
 * block is honest about: the artefacts are period-correct and the translator is not.
 */
const FRAMING =
  'This assembler is modern host code. The real 1410-AU-906 needed 20K, four magnetic tape '
  + 'units, an IBM 1402 and an IBM 1403 (C20-1602-8; software.md §11) — "THE 1410 AUTOCODER HAS '
  + 'THE LARGEST MINIMUM REQUIREMENT" of the programs on the PR-108 tape — and could not have run '
  + 'on this machine, which has 20K, one channel, a 1402 and a 1403 and no tape at all. The '
  + 'pipeline and every artifact — 80-column source cards, the F/U/M/O listing, the condensed '
  + 'absolute deck, the hand-keyed bootstrap, the 1402 load — are period-correct. The translator '
  + 'is not.';

/**
 * §14 R10, in one line of UI text: there is no `+` among `bcd.ts`'s 64 glyphs. A typed `+` is
 * Hollerith 12 and is STORED as `&`, which chain A prints as `&` and chain H prints as `+`
 * (`SOURCE_PLUS_IS_THE_12_PUNCH`, `src/asm/source.ts`). Without this line the listing looks like a
 * bug to a reader with the manual open, which is the whole of what that risk row says.
 */
const PLUS_NOTE =
  `A typed + is the 12 punch and is stored as ${TWELVE_PUNCH} — it prints ${TWELVE_PUNCH} on `
  + 'chain A and + on chain H. Use the listing\'s chain toggle to see it the other way.';

/** The name printed over each field of the ruler. Widths come from SOURCE_FIELDS, never hand-typed. */
const FIELD_NAMES: Readonly<Record<keyof typeof SOURCE_FIELDS, string>> = {
  page: 'PG', line: 'LIN', label: 'LABEL', op: 'OPCOD', operand: 'OPERAND', ident: 'IDENT',
};

/**
 * THE RULER'S FIELDS AS DATA — the name printed over each field and the span it is printed at,
 * DERIVED from `SOURCE_FIELDS` and never hand-typed, for `test/period-sheets.test.ts` to check the
 * drawn lines against (plan §11 wave 5 oracle (d): every drawn sheet field appears exactly once at
 * the span its source table gives).
 */
export const RULER_FIELDS: readonly {
  readonly name: string; readonly start: number; readonly end: number;
}[] = (Object.keys(FIELD_NAMES) as (keyof typeof SOURCE_FIELDS)[]).map((key) => ({
  name: FIELD_NAMES[key], start: SOURCE_FIELDS[key][0], end: SOURCE_FIELDS[key][1],
}));

/**
 * THE TWO TICKS — the two columns the parser reads by ABSOLUTE position rather than by field, so
 * the sheet marks them rather than leaving a person to count. `COMMENT_COLUMN` (`src/asm/types.ts`)
 * is where a `*` and only a `*` makes the card a comments card — a `*` in the operand field is the
 * asterisk OPERAND — and `LABEL_INDENT_COLUMN` is where a label that BEGINS resolves high-order
 * even on a constant (software.md §5; C28-0326-2 p.28). Two marks, no new constants.
 */
export const RULER_MARKS: readonly { readonly name: string; readonly column: number }[] = [
  { name: 'comments card', column: COMMENT_COLUMN },
  { name: 'label indent', column: LABEL_INDENT_COLUMN },
];

/** `software.md` §1's own column table, as prose, DERIVED from the constants the parser reads. */
const columnLegend = (): string => 'columns '
  + (Object.keys(FIELD_NAMES) as (keyof typeof SOURCE_FIELDS)[])
    .map((name) => {
      const [from, to] = SOURCE_FIELDS[name];
      return `${from}-${to} ${name === 'op' ? 'operation' : name}`;
    })
    .join(' · ');

/** What the two ticks mean, with both numbers INTERPOLATED from the constants above. */
const markLegend = (): string =>
  `the two ticks under the ruler are read by absolute column: ${COMMENT_COLUMN}, where a * and `
  + `only a * there makes the card a comment, and ${LABEL_INDENT_COLUMN}, where a label that `
  + 'begins resolves high-order';

/**
 * The ruler drawn over the textarea: the field names at their own start columns, the spans as
 * `<--->` between first and last column, the tens ruler, and under it the two ticks of
 * `RULER_MARKS`. DERIVED FROM `SOURCE_FIELDS`, the same constant `source.ts` slices a card with,
 * so a ruler that disagrees with the parser is not expressible. Exported so the node test reads
 * the drawn lines rather than a description of them.
 */
export function ruler(): string {
  const names = new Array<string>(SOURCE_COLUMNS).fill(' ');
  const spans = new Array<string>(SOURCE_COLUMNS).fill(' ');
  for (const { name, start, end } of RULER_FIELDS) {
    const width = end - start + 1;
    for (const [i, ch] of [...name].entries()) {
      if (i < width) names[start - 1 + i] = ch;
    }
    // `<` and `>` are the two ends; everything between them is a dash. A one-column field would
    // be `<`, which no field is — the narrowest is `page`, at two.
    for (let i = 0; i < width; i++) spans[start - 1 + i] = i === 0 ? '<' : (i === width - 1 ? '>' : '-');
  }
  let tens = '';
  for (let c = 1; c <= SOURCE_COLUMNS; c++) {
    tens += c % 10 === 0 ? String((c / 10) % 10) : (c % 5 === 0 ? '+' : '.');
  }
  const ticks = new Array<string>(SOURCE_COLUMNS).fill(' ');
  for (const { column } of RULER_MARKS) ticks[column - 1] = '|';
  return `${names.join('')}\n${spans.join('')}\n${tens}\n${ticks.join('')}`;
}

/** A textarea shaped for column-exact typing: monospace, no wrap, no spellcheck (§14 R11). */
function codingArea(rows: number): HTMLTextAreaElement {
  // Built directly rather than through `make()` for the same reason `deckBoxView.ts` builds its
  // own: `make()` returns the widened HTMLElement and `.value` / `.rows` are on HTMLTextAreaElement.
  const box = document.createElement('textarea');
  box.rows = rows;
  box.spellcheck = false;
  box.wrap = 'off';
  return box;
}

/** The sheet's masthead, pulled out over the box's own padding (`period.css` §7's, which rules
 *  `.source-box` and `.rpg-spec-box` together) so the sheet reads as printed stock with a band
 *  across the top — the SAME geometry `specs/sheetView.ts` uses, so the two paper stations read as
 *  one desk. Inline: wave 5a owns the stylesheet and this view adds no class (§10.3). */
function headerBand(title: string): HTMLElement {
  const band = make('div');
  band.textContent = title;
  band.style.margin = '-.5em -.6em .55em';
  band.style.padding = '.35em .6em .4em';
  band.style.background = 'var(--desk-pedestal)';
  band.style.color = 'var(--card-stock)';
  band.style.textTransform = 'uppercase';
  band.style.letterSpacing = '.08em';
  return band;
}

export type SourceBox = {
  readonly el: HTMLElement;
  setText(source: string, dataCards: string): void;
};

export function createSourceBox(
  session: AutocoderSession,
  onAssemble: () => void,
  onChange: () => void,
): SourceBox {
  const el = make('div', 'source-box');

  const framing = make('div');
  framing.textContent = FRAMING;

  const legend = make('div');
  legend.textContent = `${columnLegend()} — ${markLegend()}`;

  const guide = make('pre');
  guide.style.whiteSpace = 'pre';
  guide.style.overflowX = 'auto';
  guide.textContent = ruler();

  const source = codingArea(20);
  source.addEventListener('input', () => {
    session.setSource(source.value);
    onChange();
  });

  const dataLegend = make('div');
  dataLegend.textContent =
    'Data cards — the report the program reads, in the deck box\'s own .cards notation. They '
    + 'follow the object deck into the hopper.';
  const data = codingArea(5);
  data.addEventListener('input', () => {
    session.setDataText(data.value);
    onChange();
  });

  function setText(src: string, dataCards: string): void {
    source.value = src;
    data.value = dataCards;
    session.setSource(src);
    session.setDataText(dataCards);
    onChange();
  }

  // THE ONE SAMPLE BUTTON SPLITS IN TWO (plan §9.1; PHASE-3-NOTES.md line 219 invited it): each
  // button sets ITS OWN box and hands the other box's own text straight back through `setText`, so
  // a hand-typed program over the sample data — or the reverse — is one click.
  const sampleProgram = make('button');
  sampleProgram.textContent = 'sample program';
  sampleProgram.addEventListener('click', () => {
    setText(sampleSource, data.value);
  });

  const sampleDataButton = make('button');
  sampleDataButton.textContent = 'sample data';
  sampleDataButton.addEventListener('click', () => {
    setText(source.value, sampleData);
  });

  // THE THIRD BUTTON, and it is a PAIR rather than a split (phase-6 plan §10.1, §1 step 2). The
  // two above hand the OTHER box's own text back, because a hand-typed program over the sample
  // data is one click; the reentry job has no such combination — `demos/reentry.asm` reads exactly
  // one case card and nothing else parses as one — so this button sets both boxes through the same
  // `setText` and nothing else in this file changes.
  const sampleReentry = make('button');
  sampleReentry.textContent = 'sample reentry';
  sampleReentry.addEventListener('click', () => {
    setText(reentrySource, reentryCase);
  });

  const assembleButton = make('button');
  assembleButton.textContent = 'ASSEMBLE';
  assembleButton.addEventListener('click', onAssemble);

  const plus = make('div');
  plus.textContent = PLUS_NOTE;

  el.append(
    headerBand('CODING SHEET — 1410 AUTOCODER'),
    framing, legend, guide, source, dataLegend, data,
    sampleProgram, ' ', sampleDataButton, ' ', sampleReentry, ' ', assembleButton, plus,
  );
  return { el, setText };
}
