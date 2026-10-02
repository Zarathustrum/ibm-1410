// CLI: line diff a produced trace against an expected trace.
// See docs/plans/phase-1-cpu-core.md §2 and §6.2 — the three trace levels are line-oriented
// text precisely so this file can be seventy lines of positional comparison. Positional, not
// LCS: a trace that drifts by one line has diverged, and saying so at the line where it did
// is more useful than resynchronising past it.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface DiffLine {
  /** 1-based line number. */
  line: number;
  /** `null` where that side ran out of lines. */
  expected: string | null;
  produced: string | null;
}

export interface DiffResult {
  total: number;
  differing: number;
  /** The first `limit` differing lines. */
  lines: DiffLine[];
}

export const DEFAULT_LIMIT = 20;

/** Split on \n, dropping one trailing newline so a file ending in \n is not one line longer. */
function toLines(text: string): string[] {
  const lines = text.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export function diffTraces(produced: string, expected: string, limit = DEFAULT_LIMIT): DiffResult {
  const p = toLines(produced);
  const e = toLines(expected);
  const total = Math.max(p.length, e.length);
  const lines: DiffLine[] = [];
  let differing = 0;
  for (let i = 0; i < total; i++) {
    const pl = i < p.length ? p[i] ?? '' : null;
    const el = i < e.length ? e[i] ?? '' : null;
    if (pl === el) continue;
    differing++;
    if (lines.length < limit) lines.push({ line: i + 1, expected: el, produced: pl });
  }
  return { total, differing, lines };
}

export function formatDiff(result: DiffResult): string {
  const out: string[] = [];
  for (const d of result.lines) {
    const n = String(d.line).padStart(6);
    if (d.expected !== null) out.push(`${n} - ${d.expected}`);
    if (d.produced !== null) out.push(`${n} + ${d.produced}`);
  }
  if (result.differing > result.lines.length) {
    out.push(`       … ${result.differing - result.lines.length} more differing lines`);
  }
  out.push(`${result.total} lines, ${result.differing} differ`);
  return out.join('\n');
}

function main(argv: string[]): number {
  const files = argv.filter((a) => !a.startsWith('--'));
  const limitArg = argv.find((a) => a.startsWith('--limit='));
  if (files.length !== 2) {
    console.log('usage: node build/tools/trace-diff.js <produced.txt> <expected.txt> [--limit=N]');
    return 2;
  }
  const limit = limitArg === undefined ? DEFAULT_LIMIT : Number.parseInt(limitArg.slice(8), 10);
  const result = diffTraces(
    readFileSync(files[0] ?? '', 'utf8'),
    readFileSync(files[1] ?? '', 'utf8'),
    limit,
  );
  console.log(formatDiff(result));
  return result.differing === 0 ? 0 : 1;
}

// Same entry guard as the tests need: importing this module must not run the CLI.
const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] !== undefined && resolve(process.argv[1]) === thisFile;
if (invoked) process.exit(main(process.argv.slice(2)));
