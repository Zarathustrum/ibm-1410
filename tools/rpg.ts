// CLI for the host-side Card-RPG generator and its three operator artefacts.
//
//   node build/tools/rpg.js deck.rpg --source [--diff]
//   node build/tools/rpg.js deck.rpg --map
//   node build/tools/rpg.js deck.rpg --listing [--golden file] [--update]
//   node build/tools/rpg.js deck.rpg --page [--golden file] [--update]
//
// The page route infers `<deck>.data.cards`: the published Wave-6 gate has no --data argument.
// `--source --diff` is report-only and exits zero when the two valid sources differ; there is no
// source golden because Phase-5 plan §11.1 explicitly retired that over-constrained gate.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assemble } from '../src/asm/assemble.js';
import { readSource } from '../src/asm/source.js';
import { renderGreenBar } from '../src/core/devices/printer1403.js';
import { START_BUDGET, createMachine } from '../src/core/machine.js';
import type { Deck, StopReason } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import { BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, loaderDeck } from '../src/formats/loader.js';
import { scan } from '../src/rpg/deck.js';
import { generate } from '../src/rpg/generate.js';
import { buildRpgListing, renderRpgListing } from '../src/rpg/listing.js';
import { readSpecSource } from '../src/rpg/sheets/read.js';
import type { Layout, RpgDiagnostic } from '../src/rpg/types.js';

const CHAIN = 'A' as const;
const FORM_LINES = 66;
const RUN_BUDGET = 100_000;

interface Args {
  readonly spec: string;
  readonly source: boolean;
  readonly page: boolean;
  readonly map: boolean;
  readonly listing: boolean;
  readonly golden?: string;
  readonly update: boolean;
  readonly diff: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  let spec: string | undefined;
  let source = false;
  let page = false;
  let map = false;
  let listing = false;
  let golden: string | undefined;
  let update = false;
  let diff = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? '';
    const next = (): string => argv[++index] ?? '';
    if (arg === '--source') source = true;
    else if (arg === '--page') page = true;
    else if (arg === '--map') map = true;
    else if (arg === '--listing') listing = true;
    else if (arg === '--golden') golden = next();
    else if (arg === '--update') update = true;
    else if (arg === '--diff') diff = true;
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`);
    else if (spec === undefined) spec = arg;
    else throw new Error(`unexpected second specification deck ${arg}`);
  }
  if (spec === undefined || !source && !page && !map && !listing) {
    throw new Error(
      'usage: rpg <deck.rpg> (--source|--page|--map|--listing) '
      + '[--golden <file>] [--update] [--diff]',
    );
  }
  if (diff && !source) throw new Error('--diff requires --source');
  if (update && golden === undefined) throw new Error('--update needs --golden <file>');
  if (golden !== undefined && Number(page) + Number(listing) !== 1) {
    throw new Error('--golden requires exactly one of --page or --listing');
  }
  return {
    spec,
    source,
    page,
    map,
    listing,
    ...(golden === undefined ? {} : { golden }),
    update,
    diff,
  };
}

const byteSize = (text: string): number => new TextEncoder().encode(text).length;

function sibling(spec: string, suffix: string): string {
  return spec.endsWith('.rpg') ? `${spec.slice(0, -4)}${suffix}` : `${spec}${suffix}`;
}

function diagnosticText(diagnostic: RpgDiagnostic): string {
  const at = diagnostic.at;
  const where = `${at.page}${at.cardNo}${diagnostic.column === undefined ? '' : ` col ${diagnostic.column}`}`;
  const number = diagnostic.message.messageNo === undefined ? '' : `${diagnostic.message.messageNo} `;
  return `${diagnostic.severity.toUpperCase()} ${where}: ${number}${diagnostic.message.text} `
    + `[${diagnostic.message.provenance}]`;
}

function mapText(layout: Layout): string {
  const five = (value: number): string => String(value).padStart(5, '0');
  return [
    'RPG MEMORY MAP - CONSTRUCTED HOST-SIDE GENERATOR',
    `CONSTANTS ${five(layout.constants)}`,
    `CODE      ${five(layout.code)}  LENGTH ${layout.codeLength}`,
    `SLACK     ${five(layout.slack)}`,
    `IND       ${five(layout.indicatorFile)}`,
    `CDIN      ${five(layout.cardIn)}`,
    `PLINE     ${five(layout.printLine)}`,
    `PLGM      ${five(layout.printGroupMark)}`,
    `HIGH      ${five(layout.highWater)}`,
    `CTL       ${layout.coreSizeCode}`,
  ].join('\n') + '\n';
}

function boot(deck: Deck): string {
  const machine = createMachine({ size: 20_000 });
  machine.loadDeck(deck);
  machine.readerStart();
  machine.readerEndOfFile();
  machine.display(BOOTSTRAP_ORIGIN);
  machine.setMode('alter');
  const keyed = machine.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks);
  if (keyed !== BOOTSTRAP_KEYSTROKES.text.length) {
    throw new Error(`ALTER wrote ${keyed} positions, not ${BOOTSTRAP_KEYSTROKES.text.length}`);
  }
  machine.computerReset();
  machine.setMode('run');
  // START, in `START_BUDGET`-sized turns, and NOT `machine.run(RUN_BUDGET)` (phase-6 plan §9.8,
  // §10.2): `printStop` — the 1415's stop print-out — lives only inside `start()`.
  //
  // FOR THIS TOOL THE CHANGE IS INERT, and the comment says so rather than implying an output it
  // does not produce: `boot()` returns the page only and prints no console log at all (§9.8), so
  // nothing here shows the `S` line. `tools/run-deck.ts` is where it becomes visible. This is
  // symmetry — both tools drive the machine the way the desk does — and the three goldens this
  // tool gates are byte-for-byte unmoved by it.
  //
  // The ceiling is unchanged, the slices sum to `RUN_BUDGET`, and at 100,000 that is at most 50 turns.
  let left = RUN_BUDGET;
  let stop: StopReason | undefined;
  while (left > 0 && stop === undefined) {
    const slice = Math.min(START_BUDGET, left);
    stop = machine.start(slice);
    left -= slice;
  }
  if (stop !== 'halt') {
    throw new Error(
      `generated program did not halt within ${RUN_BUDGET} instructions: ${stop ?? 'budget exhausted'}`,
    );
  }
  machine.endOfJob();
  return renderGreenBar(machine.snapshot().printer.paper, { chain: CHAIN, formLines: FORM_LINES });
}

function firstDifference(want: string, got: string): readonly string[] {
  const a = want.split('\n');
  const b = got.split('\n');
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) {
      return [
        `first difference at source card ${index + 1}`,
        `  target:    ${JSON.stringify(a[index] ?? '<absent>')}`,
        `  generated: ${JSON.stringify(b[index] ?? '<absent>')}`,
      ];
    }
  }
  return ['sources are identical'];
}

function compareGolden(path: string, actual: string, update: boolean, kind: string): number {
  if (update) {
    writeFileSync(path, actual);
    console.log(`UPDATED ${path} (${byteSize(actual)} bytes)`);
    return 0;
  }
  const expected = readFileSync(path, 'utf8');
  if (expected === actual) {
    console.log(`PASS: the ${kind} matches ${path} byte for byte (${byteSize(actual)} bytes).`);
    return 0;
  }
  console.log(`FAIL: the ${kind} does not match ${path}.`);
  for (const line of firstDifference(expected, actual)) console.log(line);
  console.log(`      regenerate with: npm run rpg -- <deck.rpg> --${kind} --golden ${path} --update`);
  return 1;
}

function main(argv: readonly string[]): number {
  const args = parseArgs(argv);
  const specText = readFileSync(args.spec, 'utf8');
  const result = generate(specText);
  for (const diagnostic of result.diagnostics) console.log(diagnosticText(diagnostic));

  const listing = result.listing
    ?? buildRpgListing(scan(readSpecSource(specText)), result.diagnostics);
  const listingPage = renderRpgListing(listing, { chain: CHAIN });
  // A diagnosed specification is precisely when the listing's under-card diagnostic lines are
  // useful. Print that complete artefact before the non-zero exit; page/map/source still require
  // a successful generation below.
  if (args.listing) process.stdout.write(listingPage);
  if (!result.ok || result.layout === undefined) return 1;
  let reportPage: string | undefined;

  if (args.source) {
    if (args.diff) {
      const target = sibling(args.spec, '.asm');
      if (!existsSync(target)) {
        console.log(`SOURCE DIFF: no hand-written target at ${target}`);
        return 1;
      }
      const wanted = readFileSync(target, 'utf8');
      const wantedCards = readSource(wanted).map((line) => line.card);
      console.log(
        `SOURCE DIFF - REPORT ONLY: generated ${result.cards.length} cards; `
        + `hand-written target ${wantedCards.length} cards.`,
      );
      // Both sides are stored 80-column source cards here: right-padding and the typed `+` alias
      // are representation boundaries, not meaningful source differences.
      for (const line of firstDifference(wantedCards.join('\n'), result.cards.join('\n'))) {
        console.log(line);
      }
      console.log('The source spelling/order difference is not a gate; object records and pages are.');
    } else {
      console.log(result.source);
    }
  }
  if (args.map) process.stdout.write(mapText(result.layout));

  if (args.page) {
    const assembled = assemble(result.source);
    if (!assembled.ok || assembled.flagged.length > 0 || assembled.warnings.length > 0) {
      console.log(
        `generated assembly failed: ok=${assembled.ok} flags=${assembled.flagged.length} `
        + `warnings=${assembled.warnings.length}`,
      );
      return 1;
    }
    const dataPath = sibling(args.spec, '.data.cards');
    if (!existsSync(dataPath)) {
      console.log(`missing inferred data deck ${dataPath}`);
      return 1;
    }
    const parsed = parseDeck(readFileSync(dataPath, 'utf8'));
    if (parsed.errors.length > 0) {
      console.log(`${dataPath}: ${parsed.errors.length} deck error(s)`);
      return 1;
    }
    reportPage = boot([...loaderDeck(assembled.deck), ...parsed.deck]);
    process.stdout.write(reportPage);
  }

  if (args.golden === undefined) return 0;
  return compareGolden(
    args.golden,
    args.page ? reportPage ?? '' : listingPage,
    args.update,
    args.page ? 'page' : 'listing',
  );
}

// Same import-safe entry guard as tools/asm.ts and tools/run-deck.ts.
const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] !== undefined && resolve(process.argv[1]) === thisFile;
if (invoked) process.exit(main(process.argv.slice(2)));
