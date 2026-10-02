import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// This file lives at <repo>/test/core-is-dom-free.test.ts.
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CORE_DIR = join(REPO_ROOT, 'src/core');

// Code shapes, not English words. An earlier version banned the bare words `document`,
// `window`, `process` and `require`, which forced three verbatim IBM manual quotes into
// paraphrase — a research file corrupted to satisfy a lint. A global is only a global when it
// is dereferenced or called, so that is what these match, and prose is left alone.
const FETCH = /\bfetch\(/;
const BANNED: readonly RegExp[] = [
  /\brequire\(/, /\bprocess\./, /\bwindow\./, /\bdocument\./, /\bglobalThis\b/, /\bself\./,
  /\blocation\.(href|assign|reload|replace|origin|pathname|hostname|protocol|search|hash)\b/,
  FETCH, /\bsetTimeout\(/, /\bsetInterval\(/, /\blocalStorage\b/, /\bnavigator\./,
  /\bnew XMLHttpRequest\b/, /[:<]\s*(HTML\w*Element|Element|Node)\b/
];
/** This core has its own `fetch`: the I-cycle instruction fetch in `decode.ts`. */
const OWN_FETCH = /export function fetch\b|\bfetch,.*from '\./;

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

describe('src/core is DOM-free and self-contained', () => {
  const files = listTsFiles(CORE_DIR);

  it('touches no browser/Node global, and imports nothing outside src/core', () => {
    const violations: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      const rules = OWN_FETCH.test(src) ? BANNED.filter((re) => re !== FETCH) : BANNED;
      src.split('\n').forEach((line, i) => {
        const where = `${file}:${i + 1}`;
        const hit = rules.find((re) => re.test(line));
        if (hit) violations.push(`${where}: matches ${String(hit)}: ${line.trim()}`);
        const spec = /\bfrom\s+['"]([^'"]+)['"]/.exec(line)?.[1];
        if (spec === undefined) return;
        // Bare = a package name or a `node:` built-in; either leaves the pure-library contract.
        if (!spec.startsWith('.')) violations.push(`${where}: imports "${spec}", not a relative path`);
        else if (!isInsideCore(file, spec)) violations.push(`${where}: imports outside src/core: "${spec}"`);
      });
    }
    expect(violations).toEqual([]);
  });
});

function isInsideCore(fromFile: string, spec: string): boolean {
  return join(fromFile, '..', spec).startsWith(CORE_DIR);
}
