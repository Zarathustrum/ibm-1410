// CLI: load a .cor image, run it, print the Selectric transcript and the halt state.
// See docs/plans/phase-1-cpu-core.md §2 and §8 — §8's block is the shape this produces.
//
//   node build/tools/run-cor.js <file.cor> [--iar NNNNN] [--max N] [--expect-cc01]
//                               [--trace 1|2|3] [--normalize]
//
// The instruction count and the simulated-microsecond total are PRINTED, never asserted:
// `cc01.cor` has never been observed to run anywhere (research/emulators.md §10), so there is
// no published figure to assert them against (plan §8, §7 tier 4).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMachine, type Machine } from '../src/core/machine.js';
import { formatPrintout } from '../src/core/printout.js';
import type { ConsoleLine, StopReason } from '../src/core/types.js';
import { loadCor } from '../src/formats/cor.js';

/**
 * The relocated tape read-in entry. CC01A's exit path is `D 08967 00333 Δ` (copies its read-in
 * to 00333-00353), `D 00332 00339 3` (plants the one op char the copy needs), `J 00322` at 08959
 * — landing on 00322-00331, a ten-character hole for the per-channel tape read `M` the CE keys.
 * Blank in this image (no tape instruction was ever keyed), so a clean run ends with an
 * instruction check here (oracle/cc01a-halts.ts; emulators.md §4.4 as corrected — the `J 01972`
 * at 08980 is not on the executed path).
 */
const CC01_READ_IN_HOLE = 322;
const DEFAULT_MAX = 1_000_000;
const LEGAL_SIZES = [10_000, 20_000, 40_000, 60_000, 80_000] as const;
type LegalSize = (typeof LEGAL_SIZES)[number];

const addr5 = (a: number): string => String(a).padStart(5, '0');
const us = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// The Selectric overstrikes: an inverted circumflex over a word-marked character, an underscore
// under one with invalid parity (research/console-and-physical.md §2, A22-0526-3 p.49).
// Unicode combining marks put both back over the glyph in a terminal.
const WORD_MARK_OVER = '̌';
const UNDERLINE_UNDER = '̲';

// `ConsoleLine.text` is the BARE content and `id` is the ID character (printout.ts); putting the
// two back together as `id + ' ' + text` is the renderer's job, here and in the browser later.
function renderConsoleLine(l: ConsoleLine): string {
  const body = [...l.text]
    .map((ch, i) => ch + (l.wordMarks[i] ? WORD_MARK_OVER : '') + (l.underline[i] ? UNDERLINE_UNDER : ''))
    .join('');
  return l.id === null ? body : `${l.id} ${body}`;
}

interface Args {
  file: string;
  iar: number;
  max: number;
  expectCc01: boolean;
  trace: 1 | 2 | 3 | undefined;
  normalize: boolean;
}

function parseArgs(argv: string[]): Args {
  let file = '';
  let iar = 0;
  let max = DEFAULT_MAX;
  let expectCc01 = false;
  let trace: 1 | 2 | 3 | undefined;
  let normalize = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? '';
    const next = (): string => argv[++i] ?? '';
    if (a === '--iar') iar = Number.parseInt(next(), 10);
    else if (a === '--max') max = Number.parseInt(next(), 10);
    else if (a === '--expect-cc01') expectCc01 = true;
    else if (a === '--normalize') normalize = true;
    else if (a === '--trace') {
      const n = Number.parseInt(next(), 10);
      if (n !== 1 && n !== 2 && n !== 3) throw new Error(`--trace takes 1, 2 or 3, not "${n}"`);
      trace = n;
    } else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else file = a;
  }
  if (file === '') throw new Error('usage: run-cor <file.cor> [--iar NNNNN] [--max N] [--expect-cc01] [--trace 1|2|3] [--normalize]');
  return { file, iar, max, expectCc01, trace, normalize };
}

/** Tolerant of how the console renders a blank — the fixed-format lines print one as `b`. */
const norm = (l: ConsoleLine): string => l.text.replace(/\s+/g, ' ').trim();

/** `CC01A`, then LATER a `CC01 COMPLETE`. The `.` absorbs a blank printed as a space or a `b`. */
function typedBothMessages(lines: readonly ConsoleLine[]): { first: boolean; second: boolean } {
  const first = lines.findIndex((l) => norm(l).includes('CC01A'));
  if (first < 0) return { first: false, second: false };
  const rest = lines.slice(first + 1);
  return { first: true, second: rest.some((l) => /CC01.?COMPLETE/.test(norm(l))) };
}

function main(argv: string[]): number {
  const args = parseArgs(argv);

  const bytes = readFileSync(args.file);
  const buf = new ArrayBuffer(bytes.length);
  new Uint8Array(buf).set(bytes);
  const img = loadCor(buf, { zeroFill: args.normalize ? 'normalize' : 'keep' });
  const size = LEGAL_SIZES.find((s): s is LegalSize => s === img.size);
  if (size === undefined) throw new Error(`.cor: ${img.size} positions is not a 1410 storage size`);

  // Trace levels go to stderr so a redirected stdout stays the §8 transcript (plan §6.2).
  const tracer = args.trace === undefined
    ? {}
    : { tracer: { level: args.trace, sink: (line: string): void => { console.error(line); } } };
  const m: Machine = createMachine({ size, ...tracer });
  m.loadImage(img);

  // MODE = ADDRESS SET: STOP, turn the rotary, START prints `B` and a single space, the operator
  // types the 5-digit address into the IAR (research/console-and-physical.md §3, plan §1).
  // COMPUTER RESET forces IAR → 00001, so without this step the demo runs from the wrong place.
  m.addressSet(args.iar);
  const addressSetLine = formatPrintout('B', { address: args.iar });

  // `m.regs.iar` rather than `snapshot().iar`: the same number, but a snapshot copies a
  // thousand-position core slice, and this loop runs up to a million times.
  let stop: StopReason | undefined;
  let crash: Error | undefined;
  let steps = 0;
  // An exception that escapes `step()` is an emulator bug, not a stop of the machine (cpu.ts).
  // It is still reported through the §8 transcript rather than as a bare stack, so the console
  // lines and the print-out that led up to it are visible; the stack itself goes to stderr.
  try {
    for (; steps < args.max; steps++) {
      stop = m.step();
      if (stop !== undefined) break;
    }
  } catch (e) {
    crash = e instanceof Error ? e : new Error(String(e));
    console.error(crash.stack ?? crash.message);
  }
  const state = m.snapshot();
  const reachedReadInHole = stop === 'instructionCheck' && state.iar === CC01_READ_IN_HOLE;

  console.log(`loaded ${args.file} — ${img.size} positions, W=${img.width}, IAR = ${addr5(args.iar)}   (MODE = ADDRESS SET)`);
  console.log('');
  console.log('1415 CONSOLE');
  // The machine's own console lines, with the ADDRESS SET print-out ahead of them unless the
  // console already recorded it.
  const consoleLines: ConsoleLine[] = state.console.some((l) => l.id === 'B')
    ? [...state.console]
    : [addressSetLine, ...state.console];
  for (const l of consoleLines) console.log(`  ${renderConsoleLine(l)}`);
  console.log('');

  // The stop print-out. `E` is the error-stop ID, `S` the normal one (§2's print-out table).
  // The A/B/assembly-channel registers and the CH1/CH2 unit-select registers are not modelled in
  // Phase 1: omitted prints a valid blank, `null` prints the underlined `bbbb` of a field whose
  // contents have absent parity — which is what the real log shows.
  const errorStop = stop === 'instructionCheck' || stop === 'addressCheck' || stop === 'processCheck';
  const printout = formatPrintout(errorStop ? 'E' : 'S', {
    iar: state.iar, aar: state.aar, bar: state.bar,
    op: state.op, opMod: state.opMod,
    ch1Unit: null, ch2Unit: null,
  });
  console.log(renderConsoleLine(printout));

  // 0 on PASS or when nothing was asserted; 1 on FAIL. An escaped exception is never success.
  let exit = crash === undefined ? 0 : 1;
  if (args.expectCc01) {
    const { first, second } = typedBothMessages(consoleLines);
    if (first && second && reachedReadInHole) {
      console.log('PASS: both messages typed; stopped at the relocated read-in hole 00322 (instruction check) — the end of the diagnostic on a tape-less image.');
      console.log('      (emulators.md §4.4: the J 01972 at 08980 is not on the executed path; 00322 is where the CE keyed the tape read.)');
    } else {
      exit = 1;
      const why = crash !== undefined
        ? `uncaught ${crash.message}`
        : stop ?? (steps >= args.max ? `no stop in ${args.max} instructions` : 'none');
      console.log(`FAIL: stop=${why}  IAR=${addr5(state.iar)}`);
      console.log(`      CC01A typed: ${first ? 'yes' : 'no'}   CC01 COMPLETE typed: ${second ? 'yes' : 'no'}   stopped at read-in hole 00322: ${reachedReadInHole ? 'yes' : 'no'}`);
      const tail = consoleLines.slice(-5);
      console.log('      last console lines:');
      for (const l of tail) console.log(`        ${renderConsoleLine(l)}`);
    }
  }
  console.log(`${state.instructions} instructions   ${us(state.microseconds)} µs simulated (4.5 µs cycle)`);
  return exit;
}

// Same entry guard as trace-diff.ts: importing this module must not run the CLI.
const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] !== undefined && resolve(process.argv[1]) === thisFile;
if (invoked) process.exit(main(process.argv.slice(2)));
