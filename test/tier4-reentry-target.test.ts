// Tier 4 (smoke) — THE PAGE THROUGH THE WHOLE MACHINE. Plan §11 wave 4 oracle (a) and (d),
// §12.1 T4, §13 criteria 12 and 15's page half. `demos/reentry.asm` through `assemble()` ->
// `loaderDeck()` -> the real 1402 -> the real condensed loader -> the real 1411 -> the 1403,
// driven through `machine.start()`, and the twelve-column trajectory report it prints compared to
// `test/golden/reentry.page.txt` BYTE FOR BYTE.
//
// `tier4-` IS THE ONE PREFIX `package.json` KEYS ON — `"test": "vitest run --exclude
// 'test/tier4-*.test.ts'"`, `"smoke": "vitest run test/tier4-"` — so this file joins
// `npm run smoke` and is excluded from `npm test`, on `test/tier4-demo-deck.test.ts`'s model. Like
// that file and unlike `tier4-cc01-*`, IT GATES: we wrote the deck and we know what it prints.
//
// WHAT THIS FILE IS FOR, AND WHAT IT DELIBERATELY IS NOT. It is the PHOTOGRAPH — the whole page,
// every byte, three forms, both page-break mechanisms. It is NOT the numeric gate: the page parsed
// back into numbers against layer 2 is `test/reentry-page-parse.test.ts`, which runs in `npm test`
// and is where §4.5's one-unit-in-the-last-printed-digit rule lives. A byte comparison against a
// page we authored says "nothing moved"; it cannot say "the numbers are right" (§11's own reason
// for splitting wave 3 from wave 4, and §14 R2).
//
// THE TWO PAGE BREAKS ARE TWO DIFFERENT MECHANISMS AND ARE ASSERTED AS TWO. Form 1 -> form 2 is
// the CHANNEL-12 OVERFLOW LATCH: the 46th detail row lands on form line 60, which is where
// `DEFAULT_CARRIAGE_TAPE` punches channel 12, `BCV1` catches the latch before the carriage moves
// and sets `OFIND`, and the next row's `BCE Z020,OFIND,0` routes through `HDGB`. Form 2 -> form 3
// is a PROGRAMMED `CC1 1`: form 2 stops printing at line 53, seven lines short of the channel-12
// punch, so no latch can have been set and the break is `DONEH -> SUMOUT -> PFORM`'s own carriage
// order. Asserting only "three forms" would pass with one mechanism doing both jobs
// (`BUILD-LOG-4.md:420-425`'s carriage-straddle expectation, §7.1).
//
// The ORDINAL is the only thing the wave-4 review's re-cut moved: F1 was restored — four case-echo
// heading lines instead of two, `GENERIC` back beside the ballistic coefficient, `TABULATED FROM`
// restored, and a new line naming eq.13 — so form 1's heading block is 10 printed lines and the
// split is 46/46 rather than 49/43. The MECHANISM is unchanged: the last detail row on form 1 still
// lands on the channel-12 punch, because that is what ends form 1.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { DEFAULT_CARRIAGE_TAPE, renderGreenBar } from '../src/core/devices/printer1403.js';
import { createMachine } from '../src/core/machine.js';
import type { CarriageState, PrintLine, StopReason } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';
import {
  PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR, paginate, trimRule3,
} from '../src/ui/period/paper/page.js';

/**
 * OPEN: `REENTRY_GOLDENS_ARE_CONSTRUCTED` — provenance, not a period claim, declared as a grepable
 * export on `test/rpg-generate.test.ts:20`'s `RPG_GOLDENS_ARE_CONSTRUCTED` precedent (§12.1).
 *
 * NO AVCO TRAJECTORY LISTING SURVIVES and none is documented (`avco-and-reentry.md` §9-10), so
 * every golden in this phase is OURS: `test/golden/reentry.page.txt` is a regression pin on our own
 * deck and is not evidence about anything IBM or Avco printed. The column SET is constrained by the
 * physics; the LAYOUT is ours (§7.2, `// OPEN: COLUMN_LAYOUT_IS_PERIOD_PLAUSIBLE_NOT_DOCUMENTED`).
 * Fallback: none — there is nothing to fall back to. THE MITIGATION IS THE ORACLES, NOT A BETTER
 * GOLDEN: §4.4's four layers exist precisely because a golden we cut cannot check us, and
 * `test/reentry-page-parse.test.ts` is where the page is checked against a reference written before
 * the deck existed. What would settle it: a surviving period Avco trajectory listing.
 */
export const REENTRY_GOLDENS_ARE_CONSTRUCTED = true;

const SOURCE = readFileSync('demos/reentry.asm', 'utf8');
/** The one case card, without its terminating newline — the deck reads it as data. */
const CASE_CARD = readFileSync('demos/reentry.case.cards', 'utf8').replace(/\n$/, '');
const GOLDEN = readFileSync('test/golden/reentry.page.txt', 'utf8');

/** The 1403 `machine.ts` builds: Model 2, chain A, the 66-line `DEFAULT_CARRIAGE_TAPE`. */
const CHAIN = 'A' as const;
const FORM_LINES = 66;

/** §1's step count, §7.1's form count, and the page's own measured line arithmetic. */
const ROWS = 92;
const FORMS = 3;
/** 46 to the channel-12 punch and 46 after it — the split the wave-4 review's re-cut produced. */
const ROWS_ON_FORM_1 = 46;
/** 10 heading lines on form 1, 5 on form 2, 7 summary lines plus 2 on form 3. */
const PRINTED_LINES = 116;
const HEADING_LINES_ON_FORM_1 = 10;

/**
 * A detail row, by §7.2's TIME cell at print positions 14-19 and nothing else. Heading lines, the
 * three column-heading lines and the summary block all carry text there and none of them carries
 * `d.dd` in six positions after a thirteen-position margin, so this is the whole predicate.
 */
const DETAIL = /^ {13}[ \d]{3}\.\d{2} /;

/** §5.11's `CTL 2` — a 1411 Model 2, 20,000 positions (A22-0526-3 p.5), which the deck declares. */
const MACHINE_POSITIONS = 20_000;

interface Run {
  readonly stop: StopReason | undefined;
  readonly paper: readonly PrintLine[];
  readonly carriage: CarriageState;
  readonly consoleErrors: number;
  readonly hopper: number;
}

/**
 * The whole operator sequence, in the order a person performs it, through `machine.start()` and
 * NOT `machine.run()`: the stop print-out lives inside `start()` (wave 0, §9.8) and this run ends
 * on the programmed halt that types its `S` line on the 1415.
 */
function operate(): Run {
  const result = assemble(SOURCE);
  expect(result.ok, 'demos/reentry.asm assembles').toBe(true);
  const machine = createMachine({ size: MACHINE_POSITIONS });
  const { deck: card, errors } = parseDeck(`${CASE_CARD}\n`);
  expect(errors, 'the case card parses with zero errors').toEqual([]);
  machine.loadDeck([...loaderDeck(result.deck), ...card]);
  // READER START then END OF FILE — IBM's own procedure: with fewer than four cards behind the
  // last one the machine would stop Not Ready instead (research/software.md §10.7).
  machine.readerStart();
  machine.readerEndOfFile();
  // MODE = DISPLAY at 00000, MODE = ALTER, the twelve PRE-SPLIT bootstrap keystrokes — the same
  // core façade calls the browser's controls make, never the UI's `^` string.
  machine.display(BOOTSTRAP_ORIGIN);
  machine.setMode('alter');
  expect(machine.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks)).toBe(12);
  machine.computerReset();
  machine.setMode('run');

  let stop: StopReason | undefined;
  for (let i = 0; stop === undefined && i < 4_000_000; i += 1) stop = machine.start(1);
  machine.endOfJob();

  const state = machine.snapshot();
  return {
    stop,
    paper: state.printer.paper,
    carriage: state.printer.carriage,
    consoleErrors: state.console.filter((line) => line.id === 'E').length,
    hopper: state.reader.hopper,
  };
}

const run = operate();
const detail = run.paper.filter((line) => DETAIL.test(line.text));
const rendered = renderGreenBar(run.paper, { chain: CHAIN, formLines: FORM_LINES });

/** Every line the run printed on one form, in the order the 1403 accepted them. */
const onForm = (form: number): readonly PrintLine[] => run.paper.filter((l) => l.page === form);
const lineOf = (channel: number): number =>
  DEFAULT_CARRIAGE_TAPE.punches.find((p) => p.channel === channel)?.line ?? 0;

describe('Tier 4 GATE — the reentry page, whole (plan §11 wave 4, §13 criterion 12)', () => {
  it('carries the constructed-golden provenance where a reader will find it', () => {
    // §12.1: "Every golden in this phase is OURS, and says so where a reader will find it." The
    // grep that finds it is this export's name, and the second constant is what makes the
    // `paginate` case below evidence rather than a tautology.
    expect(REENTRY_GOLDENS_ARE_CONSTRUCTED).toBe(true);
    expect(PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR).toBe(true);
  });

  it('the run reaches the programmed halt with the hopper empty and nothing error-stopped', () => {
    expect(run.stop, `the run ended ${String(run.stop)} and not on the deck's own H`).toBe('halt');
    expect(run.hopper, 'cards left in the hopper').toBe(0);
    expect(run.consoleErrors, 'the 1415 typed an E line — something error-stopped').toBe(0);
  });

  it('THE PRECONDITION: 92 detail rows reached the paper, on three forms', () => {
    // Asserted before the byte comparison, so a run that printed a heading block and stopped fails
    // HERE — with the count — rather than failing as an opaque byte diff (§11.3's discipline).
    expect(detail, `the run printed ${detail.length} detail rows and §7.1 fixes 92`)
      .toHaveLength(ROWS);
    expect(new Set(run.paper.map((l) => l.page)).size, 'inked forms').toBe(FORMS);
    expect(run.paper, `the run printed ${run.paper.length} lines`).toHaveLength(PRINTED_LINES);
    expect(onForm(1).length - ROWS_ON_FORM_1, "form 1's heading block, in printed lines")
      .toBe(HEADING_LINES_ON_FORM_1);
  });

  it('the green-bar page equals test/golden/reentry.page.txt BYTE FOR BYTE', () => {
    // The whole artifact: heading block, twelve columns, 92 rows, the overflow heading, the
    // summary block. `renderGreenBar`'s five rules are the contract this is written against
    // (docs/plans/phase-2-unit-record.md §5, `printer1403.ts:692-717`).
    expect(rendered).toBe(GOLDEN);
  });

  it('and it is THREE \\f-separated forms — rule 4, one form feed between each pair', () => {
    const forms = rendered.split('\f');
    expect(forms, `the page renders ${forms.length} forms and §7.1 fixes ${FORMS}`)
      .toHaveLength(FORMS);
  });

  it('MECHANISM 1 — form 1 to form 2 is the CHANNEL-12 OVERFLOW LATCH', () => {
    // The 1403's own tape, not a number this file invents: `DEFAULT_CARRIAGE_TAPE` punches channel
    // 12 at form line 60 (`printer1403.ts:212-218`, [unverified] as a punching and [verified] as a
    // mechanism, §15 row 21). A detail line MAY print through line 60 — the shipped
    // `sales-summary` golden is where that was measured — and it is the sensing at 60 that arms the
    // latch, which `BCV1` then catches BEFORE the carriage moves.
    const channel12 = lineOf(12);
    expect(channel12, "the carriage tape's channel-12 punch").toBe(60);

    const last = detail[ROWS_ON_FORM_1 - 1];
    const next = detail[ROWS_ON_FORM_1];
    expect(last, `there is no ${ROWS_ON_FORM_1}th detail row`).toBeDefined();
    expect([last?.page, last?.line], `the ${ROWS_ON_FORM_1}th detail row is at form ${String(last?.page)} `
      + `line ${String(last?.line)}; the latch is armed by printing ON the channel-12 punch`)
      .toEqual([1, channel12]);
    expect([next?.page, next?.line], 'the row after it opens form 2 below the overflow heading')
      .toEqual([2, 8]);

    // And the deck's own path, because the latch is only half the mechanism: `BCV1` reads the
    // overflow indicator into `OFIND`, and the next row's `BCE Z020,OFIND,0` is what sends it
    // through `HDGB` instead of straight to `DTLOUT` (§7.1, the deck's section 15).
    expect(SOURCE, 'the deck has no BCV1 — nothing catches the overflow latch').toMatch(/\bBCV1\b/);
    expect(SOURCE, 'the deck never tests OFIND').toMatch(/BCE\s+DTLOUT,OFIND,0/);

    // Form 2 opens at line 1 with its five-line overflow heading — title, the condensed framing
    // line, and §7.5's three column-heading lines re-using form 1's own literals (§7.7).
    const form2 = onForm(2);
    expect(form2[0]?.line, 'form 2 opens at line 1').toBe(1);
    expect(form2.length - (ROWS - ROWS_ON_FORM_1), 'printed lines of overflow heading').toBe(5);
  });

  it('MECHANISM 2 — form 2 to form 3 is a PROGRAMMED CC1 1, and it CANNOT be the latch', () => {
    // The distinction is the page-break DECISION, not the carriage order: both forms are opened by
    // `PFORM`'s `CC1 1`. What separates them is what asked for it. Form 2 stops printing ten lines
    // short of the channel-12 punch, so nothing on form 2 can have armed the latch, and the break
    // is `DONEH -> SUMOUT -> PFORM` — the program deciding the trajectory is over.
    const form2 = onForm(2);
    const lastLine = Math.max(...form2.map((l) => l.line));
    expect(lastLine, `form 2's last printed line is ${lastLine}; at or past the channel-12 punch `
      + `at ${lineOf(12)} the overflow latch would be indistinguishable from the programmed order`)
      .toBeLessThan(lineOf(12));
    expect(run.carriage.channel12, 'the carriage is sitting on a channel-12 punch at the halt')
      .toBe(false);

    // The order itself, in the deck: `PFORM` skips to channel 1 before printing, and `SUMOUT`'s
    // first act is to call it (§7.7, the deck's section 16).
    expect(SOURCE, 'PFORM does not skip to channel 1')
      .toMatch(/PFORM\s+SBR\s+PFMX\+5\n\d+\s+CC1\s+1\b/);
    expect(SOURCE, 'the summary block does not open its own form')
      .toMatch(/SUMOUT\s+B\s+PFORM/);

    const form3 = onForm(3);
    expect(form3[0]?.line, 'form 3 opens at line 1').toBe(1);
    expect(form3.length, "the summary block's printed lines (§7.7 counts seven, plus the title "
      + 'and the condensed framing line PFORM prints)').toBe(9);
  });

  it('EVERY FORM CARRIES THE WORD RECONSTRUCTION — criterion 12', () => {
    // The finding the panel made against all three proposals was not that the disclaimer was
    // missing: it was that each asserted it on the trajectory page and then shipped a SECOND
    // artifact without it. So it is asserted per form here rather than per page, and wave 5 owes
    // the identical assertion over `test/golden/reentry-summary.page.txt` (§11's wave-5 oracle (c),
    // §13 criterion 17). §7.4: forms 2 and 3 carry the condensed single-line version so that every
    // form of the page carries it (RULINGS §C 13).
    rendered.split('\f').forEach((form, i) => {
      expect(form, `form ${i + 1} of ${FORMS} carries no RECONSTRUCTION line`)
        .toContain('RECONSTRUCTION');
    });
    // And on the paper itself, not only in the render, so a rendering bug cannot supply it.
    for (let form = 1; form <= FORMS; form += 1) {
      expect(onForm(form).some((l) => l.text.includes('RECONSTRUCTION')),
        `form ${form} has no PrintLine carrying RECONSTRUCTION`).toBe(true);
    }
  });

  it('paginate(paper, carriage, 66) agrees with the rendered forms', () => {
    // §5.1's free oracle, and it is EVIDENCE rather than a tautology only because
    // `PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR`: `src/ui/period/paper/page.ts` imports nothing at all
    // from `src/core/devices/printer1403.ts`, so the two renderers are independent computations
    // over one paper — one a DIFF ARTEFACT (trailing blanks gone, stop at the last ink), the other
    // a SHEET OF PAPER (the blanks are where the carriage went). `test/period-page.test.ts` asserts
    // the absent import against that file's TEXT; this case is the identity on Phase 6's own page,
    // which is the first in the repository to print past two forms.
    const pages = paginate(run.paper, run.carriage, FORM_LINES);
    expect(pages.filter((p) => p.printedThrough > 0), 'inked forms through paginate')
      .toHaveLength(FORMS);
    expect(
      `1403 Model 2 · chain ${CHAIN} · ${FORM_LINES}-line form\n\n`
      + pages.filter((p) => p.printedThrough > 0).map(trimRule3).join('\f\n'),
    ).toBe(rendered);
  });
});
