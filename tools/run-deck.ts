// CLI: put a card deck in the 1402, key the twelve-character bootstrap, run, and print the two
// artefacts the operator would be holding — the 1415 Selectric transcript and the 1403 green-bar
// page. See docs/plans/phase-2-unit-record.md §8.1, §13.
//
//   node build/tools/run-deck.js [deck.cards] [--golden <file>] [--update] [--max N]
//
// The deck defaults to demos/hello-dad.cards. `--golden` compares the rendered page byte for
// byte and exits NON-ZERO on any mismatch; `--golden … --update` rewrites it, and that is the
// ONLY sanctioned way the golden is regenerated (plan §14 R8). npm swallows flags without `--`,
// so it is `npm run demo -- --golden …`.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderGreenBar } from '../src/core/devices/printer1403.js';
import { START_BUDGET, createMachine, type Machine } from '../src/core/machine.js';
import type { ConsoleLine, StopReason } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN } from '../src/formats/loader.js';

/**
 * The page's size in BYTES, not in JavaScript characters. `page.length` counts UTF-16 code units
 * — the green bar's non-ASCII glyphs make the two differ (the hello-dad golden is 346 characters
 * and 348 bytes) — and "byte for byte" is what `--golden` actually compares, so the number
 * printed beside that claim has to be the byte count. `TextEncoder` rather than
 * `Buffer.byteLength`: there is no @types/node here and `tools/node-shims.d.ts` declares `Buffer`
 * as an interface only, while lib "DOM" already provides `TextEncoder`.
 */
const byteSize = (page: string): number => new TextEncoder().encode(page).length;

const DEFAULT_DECK = 'demos/hello-dad.cards';
const DEFAULT_MAX = 100_000;

/** The 1403 the machine builds: Model 2, chain A, the 66-line DEFAULT_CARRIAGE_TAPE. */
const CHAIN = 'A' as const;
const FORM_LINES = 66;

// The Selectric overstrikes, exactly as run-cor.ts renders them: an inverted circumflex over a
// word-marked character, an underscore under one with invalid parity
// (research/console-and-physical.md §2, A22-0526-3 p.49).
const WORD_MARK_OVER = '̌';
const UNDERLINE_UNDER = '̲';

function renderConsoleLine(l: ConsoleLine): string {
  const body = [...l.text]
    .map((ch, i) => ch + (l.wordMarks[i] ? WORD_MARK_OVER : '') + (l.underline[i] ? UNDERLINE_UNDER : ''))
    .join('');
  return l.id === null ? body : `${l.id} ${body}`;
}

interface Args {
  deck: string;
  golden: string | undefined;
  update: boolean;
  max: number;
}

function parseArgs(argv: string[]): Args {
  let deck = DEFAULT_DECK;
  let golden: string | undefined;
  let update = false;
  let max = DEFAULT_MAX;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? '';
    const next = (): string => argv[++i] ?? '';
    if (a === '--golden') golden = next();
    else if (a === '--update') update = true;
    else if (a === '--max') max = Number.parseInt(next(), 10);
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else deck = a;
  }
  if (update && golden === undefined) throw new Error('--update needs --golden <file>');
  return { deck, golden, update, max };
}

/**
 * The operator's whole sequence, in the order a person performs it (plan §13 "What the owner and
 * a family member see"). Every call here is one the browser's controls make too — the pre-split keystrokes,
 * never the UI's `^` string (plan §8.1).
 */
function boot(deck: ReturnType<typeof parseDeck>['deck'], max: number): Machine {
  const m = createMachine({ size: 20_000 });
  m.loadDeck(deck);
  // READER START then END OF FILE: with fewer than four cards behind the last one the machine
  // would otherwise stop Not Ready — IBM's own procedure (research/software.md §10.7).
  m.readerStart();
  m.readerEndOfFile();

  // MODE = DISPLAY at 00000: a cleared machine has no word mark to stop the scan, so the whole
  // line is captured and ALTER may write over it (research/software.md §10.8).
  m.display(BOOTSTRAP_ORIGIN);
  m.setMode('alter');
  const keyed = m.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks);
  if (keyed !== BOOTSTRAP_KEYSTROKES.text.length) {
    throw new Error(`ALTER wrote ${keyed} positions, not ${BOOTSTRAP_KEYSTROKES.text.length}`);
  }

  // COMPUTER RESET puts the IAR at 00001, which is the word-marked `L`; MODE = RUN, START.
  m.computerReset();
  m.setMode('run');
  // START, in `START_BUDGET`-sized turns, and NOT `m.run(max)` (phase-6 plan §9.8, §10.2). The
  // stop print-out — the `S` line the 1415 types on a programmed halt — lives inside `start()`
  // (`machine.ts` `printStop`), which `run()` never reaches, so the console log below used to end
  // where the operator's does not. The ceiling is unchanged: the slices sum to `max` exactly, and
  // at DEFAULT_MAX that is at most 50 turns of the loop.
  let left = max;
  let stop: StopReason | undefined;
  while (left > 0 && stop === undefined) {
    const slice = Math.min(START_BUDGET, left);
    stop = m.start(slice);
    left -= slice;
  }
  // END OF JOB: the pending automatic single space is carriage motion, and only this performs it
  // (devices/printer1403.ts `flush()`, plan §7.3).
  m.endOfJob();
  return m;
}

/** First differing line, as a three-line report. Enough to see what moved; not a diff library. */
function firstDifference(want: string, got: string): string[] {
  const a = want.split('\n');
  const b = got.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return [
        `  line ${i + 1}:`,
        `    golden: ${JSON.stringify(a[i] ?? '<absent>')}`,
        `    run:    ${JSON.stringify(b[i] ?? '<absent>')}`,
      ];
    }
  }
  return ['  (the two strings differ only in length)'];
}

function main(argv: string[]): number {
  const args = parseArgs(argv);

  const { deck, errors } = parseDeck(readFileSync(args.deck, 'utf8'));
  if (errors.length > 0) {
    console.log(`${args.deck}: ${errors.length} deck error(s)`);
    for (const e of errors) console.log(`  line ${e.line}, column ${e.column}: ${e.message}`);
    return 1;
  }

  const m = boot(deck, args.max);
  const state = m.snapshot();
  const page = renderGreenBar(state.printer.paper, { chain: CHAIN, formLines: FORM_LINES });

  console.log(`loaded ${args.deck} — ${deck.length} cards`);
  console.log('');
  console.log('1415 CONSOLE');
  for (const l of state.console) console.log(`  ${renderConsoleLine(l)}`);
  console.log('');
  console.log('1403 GREEN-BAR');
  for (const line of page.split('\n').slice(0, -1)) console.log(`  ${line}`);
  console.log('');
  console.log(
    `stop = ${state.stop ?? 'none'}   IAR = ${String(state.iar).padStart(5, '0')}   `
    + `hopper ${state.reader.hopper}   stacker NR ${state.reader.stackers['0']}   `
    + `carriage page ${state.printer.carriage.page} line ${state.printer.carriage.line}`,
  );
  console.log(`${state.instructions} instructions   ${state.microseconds} µs simulated`);

  if (args.golden === undefined) return 0;
  if (args.update) {
    writeFileSync(args.golden, page);
    console.log(`UPDATED ${args.golden} (${byteSize(page)} bytes)`);
    return 0;
  }
  const want = readFileSync(args.golden, 'utf8');
  if (want === page) {
    console.log(`PASS: the page matches ${args.golden} byte for byte (${byteSize(page)} bytes).`);
    return 0;
  }
  console.log(`FAIL: the page does not match ${args.golden}.`);
  for (const line of firstDifference(want, page)) console.log(line);
  console.log(`      regenerate with: npm run demo -- --golden ${args.golden} --update`);
  return 1;
}

// Same entry guard as run-cor.ts: importing this module must not run the CLI.
const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] !== undefined && resolve(process.argv[1]) === thisFile;
if (invoked) process.exit(main(process.argv.slice(2)));
