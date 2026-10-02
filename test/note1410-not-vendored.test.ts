// The licence guard for `note1410.txt`.
//
// Jaeger's `note1410.txt` is GPL-3.0-or-later and this project is MIT, so his text is fetched at
// test time into the gitignored `oracles/` and never committed. The tier-3 fixtures cite it by
// LINE NUMBER (`oracle/note1410/ref.ts`) and keep only the facts — addresses, field contents,
// digits, which lights are on — as structured data. This test fails if any substantive line of
// his (20 characters or more once trimmed) turns up verbatim in a tracked source file again.
//
// `docs/` is outside the guard on purpose: `docs/research/` quotes at quotation scale and
// `docs/research/raw/` is byte-faithful by rule.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ORACLES_ABSENT_MESSAGE, oraclePath } from './oracles.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const GUARDED = ['src', 'oracle', 'test', 'tools', 'demos'];
const MIN_LENGTH = 20;

/** Tracked files under the guarded directories — or, outside a git checkout, every file there. */
function guardedFiles(): string[] {
  try {
    const listed = execFileSync('git', ['ls-files', '-z', '--', ...GUARDED],
      { cwd: REPO_ROOT, encoding: 'utf8' });
    return listed.split('\0').filter((f) => f !== '');
  } catch {
    return GUARDED
      .flatMap((d) => readdirSync(join(REPO_ROOT, d), { recursive: true, encoding: 'utf8' })
        .map((f) => join(d, f)))
      .filter((f) => statSync(join(REPO_ROOT, f)).isFile());
  }
}

const notePath = oraclePath('note1410.txt');

describe.skipIf(!notePath)(`note1410.txt is cited, never vendored — ${ORACLES_ABSENT_MESSAGE}`, () => {
  it(`no line of it ${MIN_LENGTH}+ characters long appears in ${GUARDED.join('/, ')}/`, () => {
    const lines = [...new Set(readFileSync(notePath ?? '', 'utf8').split(/\r?\n/)
      .map((l) => l.trim()).filter((l) => l.length >= MIN_LENGTH))];
    const files = guardedFiles()
      .map((f) => ({ f, text: readFileSync(join(REPO_ROOT, f), 'utf8') }));
    const hits: string[] = [];
    for (const line of lines) {
      const where = files.filter(({ text }) => text.includes(line)).map(({ f }) => f);
      if (where.length > 0) hits.push(`${JSON.stringify(line)} in ${where.join(', ')}`);
    }
    expect(hits, `${hits.length} of ${lines.length} note1410.txt lines are vendored`)
      .toEqual([]);
  });
});
