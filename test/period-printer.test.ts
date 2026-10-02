// Tier 2 — the DECK-DRIVEN half of §11 wave 2's oracle: the 1403 station's printed stack, its
// carriage tape and the straddle. Plan §5.2, §7.2, §11 wave 2 (a)-(e), §12.1 T2, §13 criterion 9.
//
// WHICH MACHINE: the IBM 1403 MODEL 2 on a 1410 — 132 print positions (io.md §7, A22-0526-3 p.67)
// — and its carriage running core's own `DEFAULT_CARRIAGE_TAPE` (`printer1403.ts:212`,
// `[unverified]`, §15): 66 lines, channel 1 at line 1, channel 9 at 57, channel 12 at 60. The tape
// is `machine.printer.tape`, the SAME OBJECT the device skips against and never a copy, which is
// `unitrecord/mount.ts:49-51`'s hand-over — this wave's own — and is asserted below. Not a 1401.
//
// THE PAPER IS RE-RUN, NEVER PARSED. `demos/cycle-probe.rpg` and `demos/sales-summary.rpg` — both
// frozen at Phase 5 — go through `generate` -> `assemble` -> `loaderDeck` -> the real 1402 and the
// real 1411, in `test/period-page.test.ts`'s own `operate` / `fromSpec` / memoized-`once` shape
// (copied, because a test may not import another test file). `test/golden/cycle-probe.page.txt`
// (2522 B) is READ here and NEVER WRITTEN — it is Phase 5's, on §3.7's do-not-touch list.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · It does not fix the straddle. `CARRIAGE_SENSES_AT_DESTINATION_ONLY` is core's constant, cited
//    and asserted, never redeclared; the real fix is `printer1403.ts:347-352`'s own documented one
//    and it would move the golden above, so Phase 4 records and escalates (§15
//    `STRADDLE_IS_SHOWN_NOT_FIXED`, the `RW#` / `WM#` / `loader.ts:90` precedent).
//  · It instantiates no view and touches no DOM node — `environment: 'node'` (vite.config.ts), and
//    the one view module it reaches for is imported for its LABEL DATA only (§8's Fig.69/Fig.70
//    inventory), never rendered.
//
// ══ THE MAIN-SESSION RULING, and the three §11 wave 2 oracle corrections it carries ═════════════
// THE DERIVATION IS THE FROZEN CONSTANT'S OWN WORDS — `CROSSED_PUNCH_IS_DERIVED_FROM_THE_LAST_
// PRINT_AND_THE_FINAL_CARRIAGE` (§15): `from` is the last print on the last INKED form
// (`lastPrintedOn(paper, lastInkedForm(paper) ?? to.form) ?? to`), `to` is the final carriage.
// §5.2's prose said "the last print on `to.form`", and that reads the carriage's OWN form, which
// the closing eject has just left blank — so it reports nothing on the one shipped deck that
// exhibits the divergence. Every number below came off the real machine.
//
//  1. FORM NUMBERS. The first `F 1` ejects the power-on home form
//     (`CARRIAGE_POWER_ON_AT_CHANNEL_1_HOME`), so the FIRST FORM THAT PRINTS IS FORM 2 and the
//     report runs on forms 2 and 3. §11 (b)'s `{form:2,line:59} -> {form:2,line:61}` is the right
//     motion with the form number off by that opening eject: it is form 3.
//  2. PAGE COUNT. Both decks end with a closing `EOJ CC1 1` onto a BLANK FORM 4, where the
//     carriage stops, and `paginate` rule 3 emits the carriage's own form — so `paginate` returns
//     THREE `FormPage`s, two of them inked. §11 (a)'s "2 forms" is the INKED count; both numbers
//     are asserted here.
//  3. §11 (d) WAS WRONG ON THE FACTS. `sales-summary`'s closing eject leaves form 3 line 11 and
//     walks to form 4 line 1, crossing the channel-9 punch at 57 AND the channel-12 punch at 60
//     without sensing either — two TRUE straddles, asserted below as positives, not filtered away.
//     The negative that "stops the derivation reporting everything" is therefore carried by a
//     SYNTHETIC case instead: a last print at form 3 line 61 with the carriage at form 4 line 1
//     spans 62-66 and 4:1, crosses no punch, and returns `[]`.
//
// THE DERIVATION'S NAMED LIMIT. Its span is a straight line from the last print to the final rest,
// so a punch the carriage LANDED on (and therefore sensed) inside that span would be reported as
// crossed. No shipped deck does that — on `cycle-probe` the channel-9 punch at 57 was landed on
// BEFORE the last print at 59 and so falls outside the span, which is why 57 is absent below.
// Phase 6's longer report is where this must be checked again.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import {
  CARRIAGE_SENSES_AT_DESTINATION_ONLY, DEFAULT_CARRIAGE_TAPE, renderGreenBar, type CarriageTape,
} from '../src/core/devices/printer1403.js';
import { createMachine } from '../src/core/machine.js';
import type { CarriageState, Deck, PrintLine } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';
import { generate } from '../src/rpg/generate.js';
import {
  CARRIAGE_CHANNELS, lastInkedForm, lastPrintedOn, straddled, STRADDLE_BANNER,
  type FormPosition, type TapePunch,
} from '../src/ui/period/paper/carriage.js';
import { paginate, PRINT_POSITIONS } from '../src/ui/period/paper/page.js';
import { FRONT_KEYS, PANEL_ROWS } from '../src/ui/period/printer/panelView.js';

const CHAIN = 'A' as const;
const FORM_LINES = 66;
const RUN_BUDGET = 100_000;
const PRINTER1403 = 'src/core/devices/printer1403.ts';

interface Run {
  readonly paper: readonly PrintLine[];
  readonly carriage: CarriageState;
  readonly tape: CarriageTape;
}

/** The operator's whole sequence, exactly as `test/period-page.test.ts` and the tier-4 gates do it. */
function operate(deck: Deck): Run {
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
  machine.endOfJob();                       // the pending automatic single space, and nothing else
  const state = machine.snapshot();
  // The tape is handed over at construction and read back off the device, never rebuilt here.
  return { paper: state.printer.paper, carriage: state.printer.carriage, tape: machine.printer.tape };
}

/** The RPG route of `test/tier4-rpg-demo.test.ts`: specification -> Autocoder -> loader -> 1411. */
function fromSpec(name: string): Run {
  const result = generate(readFileSync(`demos/${name}.rpg`, 'utf8'));
  expect(result.ok, name).toBe(true);
  const assembled = assemble(result.source);
  expect(assembled.ok, name).toBe(true);
  const data = parseDeck(readFileSync(`demos/${name}.data.cards`, 'utf8'));
  expect(data.errors, name).toEqual([]);
  return operate([...loaderDeck(assembled.deck), ...data.deck]);
}

/** The deck runs LAZILY and exactly once, so `operate`'s own `expect`s fire inside a named case. */
function once(run: () => Run): () => Run {
  let ran: Run | undefined;
  return (): Run => (ran ??= run());
}

const cycleProbe = once(() => fromSpec('cycle-probe'));
const salesSummary = once(() => fromSpec('sales-summary'));

const destination = (run: Run): FormPosition =>
  ({ form: run.carriage.page, line: run.carriage.line });

/**
 * THE ADOPTED DERIVATION, and `printer/carriageView.ts`'s own call: the last print on the last
 * INKED form, to the final carriage. `?? to.form` and `?? to` are the empty-paper fallbacks and
 * make `straddled` empty by construction rather than by a special case.
 */
const crossedPunches = (run: Run): readonly TapePunch[] => {
  const to = destination(run);
  return straddled(lastPrintedOn(run.paper, lastInkedForm(run.paper) ?? to.form) ?? to, to,
    run.tape);
};

/** §5.2's PROSE, kept only to show what reading the CARRIAGE's form instead would have returned. */
const fromTheCarriagesOwnForm = (run: Run): readonly TapePunch[] =>
  straddled(lastPrintedOn(run.paper, run.carriage.page) ?? destination(run), destination(run),
    run.tape);

describe('§11 wave 2 (a) — the printed stack of demos/cycle-probe', () => {
  it('three forms — two inked plus the blank form the closing eject stopped on', () => {
    const { paper, carriage } = cycleProbe();
    const pages = paginate(paper, carriage, FORM_LINES);
    expect(pages.map((p) => p.form)).toEqual([2, 3, 4]);
    expect(pages.filter((p) => p.printedThrough > 0).map((p) => p.form)).toEqual([2, 3]);
    expect(pages.map((p) => p.complete)).toEqual([true, true, false]);   // rule 2
  });

  it(`66 line positions per form, blanks included, each exactly ${PRINT_POSITIONS} characters`, () => {
    const { paper, carriage } = cycleProbe();
    for (const page of paginate(paper, carriage, FORM_LINES)) {
      expect(page.lines, `form ${page.form}`).toHaveLength(FORM_LINES);
      for (const line of page.lines) expect(line).toHaveLength(PRINT_POSITIONS);
    }
  });
});

describe('§11 wave 2 (b) / §13 criterion 9 — the straddle on demos/cycle-probe', () => {
  it('the tape is the device\'s own object, not a copy', () => {
    expect(cycleProbe().tape).toBe(DEFAULT_CARRIAGE_TAPE);
    expect(cycleProbe().tape.punches).toEqual([
      { line: 1, channel: 1 }, { line: 57, channel: 9 }, { line: 60, channel: 12 },
    ]);
  });

  it('the last inked form is 3, its last print is line 59, the carriage rests at form 4 line 1', () => {
    const run = cycleProbe();
    expect(lastInkedForm(run.paper)).toBe(3);
    expect(lastPrintedOn(run.paper, 2)).toEqual({ form: 2, line: 60 });
    expect(lastPrintedOn(run.paper, 3)).toEqual({ form: 3, line: 59 });
    expect(destination(run)).toEqual({ form: 4, line: 1 });
  });

  it('the crossing itself: form 3 line 59 -> 61 passes channel 12 at line 60', () => {
    // The motion the device really made — the armed space the last print parked, which lands on 61
    // and never looks at 60. This is §11 (b)'s `[{line:60, channel:12}]`, on the form the opening
    // eject actually put the report on.
    expect(straddled({ form: 3, line: 59 }, { form: 3, line: 61 }, cycleProbe().tape))
      .toEqual([{ line: 60, channel: 12 }]);
  });

  it('§13 criterion 9: the derivation on the terminal snapshot is [{line:60, channel:12}]', () => {
    // The whole of it, from the snapshot alone: form 3 line 59 -> form 4 line 1 spans 3:60 through
    // 3:66 and 4:1, the destination is dropped, and the channel-12 punch at 60 is the one punch
    // left. THE CHANNEL-9 PUNCH AT 57 IS OUTSIDE THE SPAN: the carriage landed on it to print line
    // 57, which is BEFORE the last print at 59, so it is behind `from` and was sensed at the time.
    expect(crossedPunches(cycleProbe())).toEqual([{ line: 60, channel: 12 }]);
  });

  it('THE DIVERGENCE: channel12 is false on that same snapshot', () => {
    // `CARRIAGE_SENSES_AT_DESTINATION_ONLY` (printer1403.ts:329-354): `space()` senses the line it
    // landed on and never the lines it crossed, so the channel-12 punch at 60 left no mark. The
    // closing skip then landed on form 4 line 1, whose channel-1 punch CLEARS both indicators
    // (`senseChannels`, printer1403.ts:677-683) — which is also why channel9 is false at the end:
    // it went TRUE when the carriage LANDED on form 3 line 57 to print there, and line 1's punch
    // cleared it.
    expect(CARRIAGE_SENSES_AT_DESTINATION_ONLY).toBe(true);
    expect(cycleProbe().carriage.channel12).toBe(false);
    expect(cycleProbe().carriage.channel9).toBe(false);
    expect(cycleProbe().carriage.autoSpacePending).toBe(false);      // endOfJob already performed it
  });

  it('why the module asks the last INKED form and not the carriage\'s own', () => {
    // §11's oracle sampled the terminal state and §5.2's prose then reads `to.form` — form 4, which
    // the closing eject left blank — so `lastPrintedOn(...) ?? to` gives `from === to` and the one
    // shipped crossing disappears. That is the reading `lastInkedForm` exists to replace.
    const run = cycleProbe();
    expect(lastPrintedOn(run.paper, run.carriage.page)).toBeUndefined();
    expect(fromTheCarriagesOwnForm(run)).toEqual([]);
  });
});

describe('§11 wave 2 (c) — the banner, character for character', () => {
  it('STRADDLE_BANNER({line: 60, channel: 12}) is exactly the sentence §5.2 publishes', () => {
    expect(STRADDLE_BANNER({ line: 60, channel: 12 })).toBe(
      'channel 12 at line 60 passed unsensed — '
      + 'CARRIAGE_SENSES_AT_DESTINATION_ONLY (src/core/devices/printer1403.ts:354)',
    );
  });

  it(`${PRINTER1403} line 354 is where the constant is declared`, () => {
    // The banner names a file and a LINE, so a later move of the constant has to fail here rather
    // than quietly turn a page annotation into a wrong citation.
    const line354 = readFileSync(PRINTER1403, 'utf8').split('\n')[353] ?? '';
    expect(line354).toContain('CARRIAGE_SENSES_AT_DESTINATION_ONLY');
    expect(line354).toContain('export const');
  });
});

describe('§11 wave 2 (d) — demos/sales-summary, and the eject that really does straddle', () => {
  it('the same three forms: two inked plus the blank form the eject stopped on', () => {
    const { paper, carriage } = salesSummary();
    const pages = paginate(paper, carriage, FORM_LINES);
    expect(pages.map((p) => p.form)).toEqual([2, 3, 4]);
    expect(pages.filter((p) => p.printedThrough > 0).map((p) => p.form)).toEqual([2, 3]);
  });

  it('§11 (d)\'s "zero straddles" WAS WRONG: the closing eject crosses 57 and 60 unsensed', () => {
    // The last print is form 3 line 9; the armed space carries the carriage to 3:11 and the closing
    // eject then walks 12 through 66 and wraps to form 4 line 1 — over the channel-9 punch at 57
    // and the channel-12 punch at 60, sensing neither. On iron both indicators would have come on
    // in passing: io.md §5 Figure 35 line 268 [verified], A22-0526-3 p.36, "turn on when their hole
    // IS SENSED". `CARRIAGE_SENSES_AT_DESTINATION_ONLY` is why both read false below. These are
    // TRUE crossings — the derivation reporting the divergence it exists to report, not noise.
    const run = salesSummary();
    expect(lastInkedForm(run.paper)).toBe(3);
    expect(lastPrintedOn(run.paper, 3)).toEqual({ form: 3, line: 9 });
    expect(destination(run)).toEqual({ form: 4, line: 1 });
    expect(crossedPunches(run)).toEqual([{ line: 57, channel: 9 }, { line: 60, channel: 12 }]);
    expect(run.carriage.channel9).toBe(false);
    expect(run.carriage.channel12).toBe(false);
  });

  it('THE NEGATIVE, synthetic: an eject from below the last punch crosses nothing', () => {
    // The check that stops the derivation reporting everything, and no shipped deck supplies it:
    // a last print at form 3 line 61 with the carriage resting at form 4 line 1 spans 3:62 through
    // 3:66 and 4:1, the destination is dropped, and no punch lies in what is left. Empty because
    // nothing was crossed — not because the span was empty.
    const paper: readonly PrintLine[] = [
      { page: 2, line: 40, text: 'FORM TWO' }, { page: 3, line: 61, text: 'THE LAST LINE' },
    ];
    const to: FormPosition = { form: 4, line: 1 };
    expect(lastInkedForm(paper)).toBe(3);
    expect(straddled(lastPrintedOn(paper, lastInkedForm(paper) ?? to.form) ?? to, to,
      DEFAULT_CARRIAGE_TAPE)).toEqual([]);
  });
});

describe('§11 wave 2 (e) — the golden page, byte for byte', () => {
  it('renderGreenBar over the re-run paper is test/golden/cycle-probe.page.txt', () => {
    // READ, never written: Phase 5's file, and the free oracle §5.1 buys with it.
    expect(renderGreenBar(cycleProbe().paper, { chain: CHAIN, formLines: FORM_LINES }))
      .toBe(readFileSync('test/golden/cycle-probe.page.txt', 'utf8'));
  });
});

describe('§5.2 — `lastPrintedOn` and `lastInkedForm`, the unit cases', () => {
  const PAPER: readonly PrintLine[] = [
    { page: 2, line: 7, text: 'SEVEN' },
    { page: 2, line: 3, text: 'THREE' },      // out of order on purpose: it is a MAX, not a last
    { page: 4, line: 1, text: 'ONE' },
  ];

  it('a form with lines returns its HIGHEST line, whatever order the paper is in', () => {
    expect(lastPrintedOn(PAPER, 2)).toEqual({ form: 2, line: 7 });
    expect(lastPrintedOn(PAPER, 4)).toEqual({ form: 4, line: 1 });
  });

  it('a form that printed nothing returns undefined', () => {
    expect(lastPrintedOn(PAPER, 3)).toBeUndefined();
    expect(lastPrintedOn([], 1)).toBeUndefined();
  });

  it('`lastInkedForm` is the HIGHEST page the paper carries', () => {
    expect(lastInkedForm(PAPER)).toBe(4);
    expect(lastInkedForm([{ page: 9, line: 2, text: 'NINE' }, ...PAPER])).toBe(9);
  });

  it('`lastInkedForm` on paper with no lines at all is undefined', () => {
    expect(lastInkedForm([])).toBeUndefined();
  });

  it('the `?? to` composition makes `straddled` empty by construction', () => {
    const to: FormPosition = { form: 3, line: 61 };
    expect(straddled(lastPrintedOn(PAPER, to.form) ?? to, to, DEFAULT_CARRIAGE_TAPE)).toEqual([]);
  });
});

describe('§0 bullet 1 — the twelve carriage channels live in paper/, not in a drawn view', () => {
  it('CARRIAGE_CHANNELS is 1 through 12, off core\'s own CARRIAGE_D_TABLE', () => {
    // Twelve channels is `[verified]` — io.md §7 "Carriage tape", A22-0526-3 pp.68, 71-72 — and the
    // list is DERIVED from `isa/dmods.ts`'s twelve immediate-skip rows (A22-0526-3 p.81 Figure 90),
    // so no second copy of that table exists (plan §12). It lives in the DOM-free module because
    // `printer/carriageView.ts`, which draws the strip, may compute no number (plan §0 bullet 1).
    expect(CARRIAGE_CHANNELS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

// The one case that reaches a view module, and it reaches for DATA: `panelView.ts`'s label tables
// create no node at import time, so this runs under `environment: 'node'` like everything above.
describe('§7.2 / §16 item 2 — the Fig.69 and Fig.70 legends, as drawn strings', () => {
  it('Fig.69\'s two rows are console-and-physical.md §8\'s sentence, in its order', () => {
    // "top row PRINT READY, END OF FORMS, FORMS CHECK; second row CARRIAGE RESTORE, CARRIAGE SPACE,
    // SINGLE CYCLE, PRINT CHECK, SYNC CHECK, with CHECK RESET and CARRIAGE STOP"
    // — console-and-physical.md §8 [verified], A22-0526-3 pp.68-69.
    expect(PANEL_ROWS).toEqual([
      ['PRINT READY', 'END OF FORMS', 'FORMS CHECK'],
      [
        'CARRIAGE RESTORE', 'CARRIAGE SPACE', 'SINGLE CYCLE', 'PRINT CHECK', 'SYNC CHECK',
        'CHECK RESET', 'CARRIAGE STOP',
      ],
    ]);
  });

  it('Fig.70 is the PRINT START / PRINT STOP pair and nothing else', () => {
    expect(FRONT_KEYS).toEqual(['PRINT START', 'PRINT STOP']);
  });

  it('THE NAMED NEGATIVE: no END OF JOB and no LOAD anywhere on the 1403 panel', () => {
    // §8's inventory contains neither. `machine.endOfJob()` is THIS EMULATOR'S control
    // (`machine.ts:453` is `endOfJob(): void { printer.flush(); }`), so it belongs at the paper
    // stack and captioned as ours; putting it among Fig.69's legends would invent a key the
    // machine did not have. LOAD is the 1402's, and a 1401 one at that (software.md §10.1, §10.10).
    const drawn = [...PANEL_ROWS.flat(), ...FRONT_KEYS];
    expect(drawn).not.toContain('END OF JOB');
    expect(drawn).not.toContain('LOAD');
    expect(drawn.filter((label) => /END OF JOB|LOAD/.test(label))).toEqual([]);
  });
});
