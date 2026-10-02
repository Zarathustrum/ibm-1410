// Tier 0 — the DOM-free guarantee for src/rpg/** (Phase-5 plan §3.5, wave 2).
//
// Two entries are owned here: every current src/rpg TypeScript file, and the future
// src/ui/period/rpg/session.ts. The latter lands in wave 6, so this wave records a named skip; wave 6
// appends a separate required-path case and does not edit this one.

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RPG_DIR = join(REPO_ROOT, 'src/rpg');
const ALLOWED_DIRS = ['src/rpg', 'src/asm', 'src/core', 'src/formats']
  .map((dir) => join(REPO_ROOT, dir));

const BANNED: readonly RegExp[] = [
  /\brequire\(/, /\bprocess\./, /\bwindow\./, /\bdocument\./, /\bglobalThis\b/, /\bself\./,
  /\blocation\.(href|assign|reload|replace|origin|pathname|hostname|protocol|search|hash)\b/,
  /\bfetch\(/, /\bsetTimeout\(/, /\bsetInterval\(/, /\blocalStorage\b/, /\bnavigator\./,
  /\bnew XMLHttpRequest\b/, /[:<]\s*(HTML\w*Element|Element|Node)\b/,
];

function listTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...listTsFiles(full));
    else if (name.endsWith('.ts')) files.push(full);
  }
  return files;
}

function isAllowed(fromFile: string, specifier: string): boolean {
  const resolved = resolve(dirname(fromFile), specifier);
  return ALLOWED_DIRS.some((dir) => {
    // `join` supplies the host separator; trimming the sentinel leaves a directory boundary.
    const childPrefix = join(dir, '_').slice(0, -1);
    return resolved === dir || resolved.startsWith(childPrefix);
  });
}

function violationsIn(files: readonly string[]): string[] {
  const violations: string[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    source.split('\n').forEach((line, index) => {
      const where = `${file}:${index + 1}`;
      const banned = BANNED.find((pattern) => pattern.test(line));
      if (banned) violations.push(`${where}: matches ${String(banned)}: ${line.trim()}`);
      const specifier = /\bfrom\s+['"]([^'"]+)['"]/.exec(line)?.[1];
      if (specifier === undefined) return;
      if (!specifier.startsWith('.')) {
        violations.push(`${where}: imports "${specifier}", not a relative path`);
      } else if (!isAllowed(file, specifier)) {
        violations.push(`${where}: imports outside src/rpg|asm|core|formats: "${specifier}"`);
      }
    });
  }
  return violations;
}

describe('Phase 5 DOM-free paths: src/rpg/** plus src/ui/period/rpg/session.ts', () => {
  const files = listTsFiles(RPG_DIR);

  it('has src/rpg files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('keeps src/rpg DOM-free and inside the four permitted library directories', () => {
    expect(violationsIn(files)).toEqual([]);
  });

  it.skip('src/ui/period/rpg/session.ts is DOM-free — the file lands in wave 6');

  it('src/ui/period/rpg/session.ts exists and is DOM-free', () => {
    const session = join(REPO_ROOT, 'src/ui/period/rpg/session.ts');
    expect(existsSync(session)).toBe(true);
    expect(violationsIn([session])).toEqual([]);
  });
});
