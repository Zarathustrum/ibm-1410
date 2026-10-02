import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * Plan §7.1 forbids IBM sheet-column literals outside src/rpg/sheets/columns.ts.
 * The matcher is deliberately narrow: decimal integers 1..80 used as arguments
 * to .slice/.substring/.substr on a simple card/spec/source/image receiver, or
 * array literals made of exactly two such integers. Area lengths, ordinary
 * array slicing, arithmetic on imported spans, and other arrays are not column
 * declarations and are out of scope for this gate.
 */

const RPG_ROOT = resolve('src/rpg');
const COLUMNS_FILE = join(RPG_ROOT, 'sheets', 'columns.ts');

describe('RPG column spans stay centralized in sheets/columns.ts (plan §7.1)', () => {
  it('finds no forbidden column-number literals in src/rpg outside columns.ts', () => {
    const offenders = tsFiles(RPG_ROOT)
      .filter((file) => file !== COLUMNS_FILE)
      .flatMap((file) => forbiddenColumnLiterals(file));

    expect(offenders).toEqual([]);
  });

  it('keeps the allowed numeric spans path-boundary-scoped to the real columns.ts file', () => {
    expect(COLUMNS_FILE).toBe(join(RPG_ROOT, 'sheets', 'columns.ts'));
    expect(statSync(COLUMNS_FILE).isFile()).toBe(true);
  });

  it('catches representative card/spec/source/image aliases without hiding ordinary slices', () => {
    const seeded = [
      'card.slice(6);',
      'spec.substring(7);',
      'sourceImage.substr(8);',
      'const span = [9, 10];',
      'stmts.slice(1);',
      'operand.slice(1);',
    ].join('\n');

    expect(forbiddenColumnLiteralsInSource(seeded, 'seed.ts')).toEqual([
      'seed.ts:1 card.slice(6) uses 6',
      'seed.ts:2 spec.substring(7) uses 7',
      'seed.ts:3 sourceImage.substr(8) uses 8',
      'seed.ts:4 [9, 10]',
    ]);
  });
});

function tsFiles(root: string): readonly string[] {
  return readdirSync(root).flatMap((entry) => {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return tsFiles(fullPath);
    return stat.isFile() && fullPath.endsWith('.ts') ? [fullPath] : [];
  });
}

function forbiddenColumnLiterals(file: string): readonly string[] {
  const source = readFileSync(file, 'utf8');
  return forbiddenColumnLiteralsInSource(source, displayPath(file));
}

function forbiddenColumnLiteralsInSource(source: string, shownPath: string): readonly string[] {
  const findings: string[] = [];

  for (const match of source.matchAll(/\b([A-Za-z_$][\w$]*)\.(slice|substring|substr)\s*\(([^)]*)\)/g)) {
    if (!isCardImageReceiver(match[1] ?? '')) continue;
    const args = match[3]?.split(',') ?? [];
    for (const arg of args) {
      const n = decimalInteger(arg.trim());
      if (isColumn(n)) {
        findings.push(`${shownPath}:${lineOf(source, match.index ?? 0)} ${match[1]}.${match[2]}(${match[3]}) uses ${n}`);
      }
    }
  }

  for (const match of source.matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*\]/g)) {
    const first = decimalInteger(match[1] ?? '');
    const second = decimalInteger(match[2] ?? '');
    if (isColumn(first) && isColumn(second)) {
      findings.push(`${shownPath}:${lineOf(source, match.index ?? 0)} ${match[0]}`);
    }
  }

  return findings;
}

function decimalInteger(text: string): number | undefined {
  return /^\d+$/.test(text) ? Number(text) : undefined;
}

function isColumn(n: number | undefined): n is number {
  return n !== undefined && n >= 1 && n <= 80;
}

function isCardImageReceiver(name: string): boolean {
  return /(?:card|spec|source|image)/i.test(name);
}

function lineOf(source: string, offset: number): number {
  return source.slice(0, offset).split('\n').length;
}

function displayPath(file: string): string {
  return file.startsWith(`${RPG_ROOT}/`) ? `src/rpg/${file.slice(RPG_ROOT.length + 1)}` : file;
}
