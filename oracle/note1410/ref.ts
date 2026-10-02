// oracle/note1410/ref.ts — how the fixtures beside this file cite `note1410.txt`.
//
// Jaeger's notes are GPL-3.0-or-later and this project is MIT, so `arith.ts` and `move.ts` carry
// his FACTS — addresses, field contents, digits, which lights are on — as data, and cite his
// WORDS by line number into `oracles/note1410.txt`, the sha256-pinned copy `npm run oracles`
// fetches. `noteText` reads that copy on its first call, never at import, so the fixtures load
// without it. `test/note1410-not-vendored.test.ts` keeps his lines out of the tree, and
// `test/note1410-refs.test.ts` checks that every ref still lands on the line it was cut from.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** A 1-based, inclusive line range into `oracles/note1410.txt`. */
export type NoteRef = readonly [first: number, last: number];

// This file lives at <repo>/oracle/note1410/ref.ts.
const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const NOTE_PATH = join(REPO_ROOT, 'oracles', 'note1410.txt');

let lines: string[] | undefined;

/**
 * The note's own text for `ref`, verbatim — indentation, tabs and typos included. The file's
 * CRLF line ends come back as `\n`. Throws on a range outside the file.
 */
export function noteText(ref: NoteRef): string {
  lines ??= readFileSync(NOTE_PATH, 'utf8').replace(/\r?\n$/, '').split(/\r?\n/);
  const [first, last] = ref;
  if (first < 1 || last < first || last > lines.length) {
    throw new RangeError(`note1410.txt lines ${first}-${last}: outside 1-${lines.length}`);
  }
  return lines.slice(first - 1, last).join('\n');
}
