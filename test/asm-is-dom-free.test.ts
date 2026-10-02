// Tier 0 — the DOM-free guarantee, extended to `src/asm/**` (plan §3.5, wave 1).
//
// `test/core-is-dom-free.test.ts` is an existing test on the §3.4 do-not-touch list and is NOT
// edited. It greps `src/core` only and forbids any import leaving `src/core`, so `src/formats`
// is already outside it and `src/asm` cannot be folded in without editing it. RULING: extend the
// guarantee with a Phase-3-owned file. Same banned code shapes; the import rule relaxed to
// "relative, and resolving inside `src/asm`, `src/core` or `src/formats`" — ~45 duplicated
// lines, zero edits to a Phase-1 file.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// This file lives at <repo>/test/asm-is-dom-free.test.ts.
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ASM_DIR = join(REPO_ROOT, 'src/asm');
/** The three directories an `src/asm` module may reach into, and no others. */
const ALLOWED_DIRS = ['src/asm', 'src/core', 'src/formats'].map((d) => join(REPO_ROOT, d));

// Code shapes, not English words — core-is-dom-free.test.ts's own rule, and it matters here for
// the same reason: this phase's comments quote IBM manuals and name the demo's `window` of
// storage. A global is only a global when it is dereferenced or called.
const BANNED: readonly RegExp[] = [
  /\brequire\(/, /\bprocess\./, /\bwindow\./, /\bdocument\./, /\bglobalThis\b/, /\bself\./,
  /\blocation\.(href|assign|reload|replace|origin|pathname|hostname|protocol|search|hash)\b/,
  /\bfetch\(/, /\bsetTimeout\(/, /\bsetInterval\(/, /\blocalStorage\b/, /\bnavigator\./,
  /\bnew XMLHttpRequest\b/, /[:<]\s*(HTML\w*Element|Element|Node)\b/,
];

function listTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listTsFiles(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

function isAllowed(fromFile: string, spec: string): boolean {
  const resolved = join(fromFile, '..', spec);
  return ALLOWED_DIRS.some((dir) => resolved.startsWith(dir));
}

describe('src/asm is DOM-free and imports only src/asm, src/core and src/formats', () => {
  const files = listTsFiles(ASM_DIR);

  it('has files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('touches no browser/Node global, and imports nothing outside the three directories', () => {
    const violations: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      src.split('\n').forEach((line, i) => {
        const where = `${file}:${i + 1}`;
        const hit = BANNED.find((re) => re.test(line));
        if (hit) violations.push(`${where}: matches ${String(hit)}: ${line.trim()}`);
        const spec = /\bfrom\s+['"]([^'"]+)['"]/.exec(line)?.[1];
        if (spec === undefined) return;
        // Bare = a package name or a `node:` built-in; either leaves the pure-library contract.
        if (!spec.startsWith('.')) violations.push(`${where}: imports "${spec}", not a relative path`);
        else if (!isAllowed(file, spec)) violations.push(`${where}: imports outside src/asm|core|formats: "${spec}"`);
      });
    }
    expect(violations).toEqual([]);
  });
});
