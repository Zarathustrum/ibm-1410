// CLI: assemble an Autocoder source deck and print the two artefacts the assembly produced — the
// 1403 listing and the condensed object deck. See docs/plans/phase-3-autocoder.md §3.3, §9, §12.2.
//
//   node build/tools/asm.js <source.asm> [--listing] [--deck <out>] [--chain A|H]
//                           [--golden <file>] [--update]
//
// `--golden` compares the rendered listing byte for byte and exits NON-ZERO on any mismatch;
// `--golden … --update` rewrites it, and that is the ONLY sanctioned way `test/golden/hello-dad.lst`
// is regenerated (plan §12.3). npm swallows flags without `--`, so it is `npm run asm -- …`,
// exactly as `run-deck.ts` is invoked.
//
// WAVE 6 REWROTE THE MIDDLE OF THIS FILE AND NOTHING ELSE. Until `src/asm/assemble.ts` landed the
// CLI ran `parse -> pass1 -> pass2 -> pack -> listing` itself, module by module, because
// `assemble()` did not exist and no wave reaches forward (plan §3.3). `main()` below now calls
// `assemble(text, opts)` once and renders the page it returns. The argument handling, the
// `--golden` / `--update` behaviour and the output files did NOT move — which is why
// `test/golden/hello-dad.lst` comes out byte-identical across the rewrite, and that is the
// wave-6 check on the golden (§11's wave-6 row).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PrintChain } from '../src/core/devices/printer1403.js';
import { assemble } from '../src/asm/assemble.js';
import { renderListing } from '../src/asm/listing1403.js';
import { formatDeck } from '../src/formats/card.js';
import { loaderDeck } from '../src/formats/loader.js';
import { encodeObjectRecord } from '../src/formats/objectdeck.js';

/**
 * The rendered listing's size in BYTES, not in JavaScript characters — `run-deck.ts`'s own note:
 * `page.length` counts UTF-16 code units and the record-mark slug makes the two differ, while
 * "byte for byte" is what `--golden` compares.
 */
const byteSize = (page: string): number => new TextEncoder().encode(page).length;

interface Args {
  source: string;
  listing: boolean;
  deck: string | undefined;
  chain: PrintChain;
  golden: string | undefined;
  update: boolean;
}

function parseArgs(argv: string[]): Args {
  let source: string | undefined;
  let listing = false;
  let deck: string | undefined;
  let chain: PrintChain = 'A';
  let golden: string | undefined;
  let update = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? '';
    const next = (): string => argv[++i] ?? '';
    if (a === '--listing') listing = true;
    else if (a === '--deck') deck = next();
    else if (a === '--chain') {
      const written = next().toUpperCase();
      if (written !== 'A' && written !== 'H') throw new Error(`--chain takes A or H, not ${written}`);
      chain = written;
    } else if (a === '--golden') golden = next();
    else if (a === '--update') update = true;
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else source = a;
  }
  if (source === undefined) throw new Error('usage: asm <source.asm> [--listing] [--deck <out>] [--chain A|H] [--golden <file>] [--update]');
  if (update && golden === undefined) throw new Error('--update needs --golden <file>');
  return { source, listing, deck, chain, golden, update };
}

/** First differing line, as a three-line report — `run-deck.ts`'s own shape. */
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
  // THE WHOLE PIPELINE, in one call (plan §4, §11's wave-6 row). `assemble()` never throws on
  // source content, so a deck full of flags prints its listing and exits non-zero below rather
  // than exploding here. The chain is `renderListing`'s and not `assemble()`'s: it decides which
  // GLYPH a stored code prints, which is a rendering and not an assembly (`src/asm/assemble.ts`).
  const result = assemble(readFileSync(args.source, 'utf8'));
  const page = renderListing(result.listing, { chain: args.chain });

  console.log(
    `assembled ${args.source} — ${result.deck.records.length} condensed cards, `
    + `${result.flagged.length} flagged line(s), chain ${args.chain}`,
  );
  for (const warning of result.warnings) console.log(`  warning: ${warning}`);

  // CTL column 23 AS PUNCHED, and this CLI is its one consumer (types.ts): `1` writes no deck
  // file, `2` prints no listing.
  if (args.listing && result.suppress !== '2') {
    console.log('');
    for (const line of page.split('\n').slice(0, -1)) console.log(line);
  }
  if (args.deck !== undefined && result.suppress !== '1') {
    const cards = result.wantsLoader ? loaderDeck(result.deck) : result.deck.records.map(encodeObjectRecord);
    writeFileSync(args.deck, formatDeck(cards));
    console.log(`wrote ${args.deck} — ${cards.length} cards`);
  }

  if (args.golden !== undefined) {
    if (args.update) {
      writeFileSync(args.golden, page);
      console.log(`UPDATED ${args.golden} (${byteSize(page)} bytes)`);
      return 0;
    }
    const want = readFileSync(args.golden, 'utf8');
    if (want !== page) {
      console.log(`FAIL: the listing does not match ${args.golden}.`);
      for (const line of firstDifference(want, page)) console.log(line);
      console.log(`      regenerate with: npm run asm -- ${args.source} --listing --golden ${args.golden} --update`);
      return 1;
    }
    console.log(`PASS: the listing matches ${args.golden} byte for byte (${byteSize(page)} bytes).`);
  }
  return result.ok ? 0 : 1;
}

// Same entry guard as run-deck.ts: importing this module must not run the CLI.
const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] !== undefined && resolve(process.argv[1]) === thisFile;
if (invoked) process.exit(main(process.argv.slice(2)));
