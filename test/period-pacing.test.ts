// Tier 0 — THE REAL-TIME PACING ITEM'S ORACLE (plan §10.6, §3.7, §11 wave 6; decision 6).
//
// THIS IS A TEXT SCAN OVER SOURCE, and it is a WEAKER oracle than the rest of the phase's tests. It
// proves that the clamp and the single call site are PRESENT in `src/ui/main.ts`. It does NOT prove
// that the pacing produces 1411 wall-clock time: `environment: 'node'` (vite.config.ts:8-11) and
// plan §2.2's refusal of jsdom mean no frame ever runs here, so the 15.9-19 s the desk takes is
// asserted by nothing. A screenshot is not an oracle either, which is why this file exists at all.
//
// WHICH MACHINE: none — pacing is the BROWSER's. The 1411 has no frame rate.
//
// WHAT IT ASSERTS, the four oracles of §10.6:
//  1. `src/ui/main.ts` has exactly ONE `machine.start(` call site, comments stripped first (a raw
//     scan counts two: a prose comment names the call too);
//  2. `budgetFor`'s RETURN is clamped by `Math.min(START_BUDGET`, and the one call site's argument
//     is `budgetFor(` — the clamp lives inside `budgetFor`, not in the argument expression;
//  3. `START_BUDGET` is still 2000, by value, imported from `src/core/machine.js`;
//  4. `requestAnimationFrame(` is still in exactly one file under `src/ui`, so the pacing item
//     cannot have introduced a second loop. `test/period-no-second-frame-loop.test.ts` owns that
//     invariant and is not edited; this file only re-asserts it.
//
// `strip` is written out here ON PURPOSE, as in the files it is copied from: no shared helper.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { START_BUDGET } from '../src/core/machine.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const UI = 'src/ui';
const MAIN = `${UI}/main.ts`;

/** Comments out, LINE COMMENTS FIRST — see `test/period-no-second-frame-loop.test.ts`'s header. */
const strip = (source: string): string =>
  source.replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');

const uiFiles = (dir: string = UI): readonly string[] =>
  readdirSync(join(REPO_ROOT, dir))
    .flatMap((name) => (statSync(join(REPO_ROOT, dir, name)).isDirectory()
      ? uiFiles(`${dir}/${name}`)
      : name.endsWith('.ts') ? [`${dir}/${name}`] : []))
    .sort();

const code = (path: string): string => strip(readFileSync(join(REPO_ROOT, path), 'utf8'));
const MAIN_CODE = code(MAIN);

/** The text of `budgetFor`'s arrow function, from its declaration to the closing `};` at column 0. */
const budgetForBody = (): string => {
  const at = MAIN_CODE.indexOf('const budgetFor');
  expect(at, 'main.ts must declare budgetFor').toBeGreaterThan(-1);
  return MAIN_CODE.slice(at, MAIN_CODE.indexOf('\n};', at));
};

describe('real-time pacing: the clamp and the one call site are present (plan §10.6)', () => {
  it('has exactly ONE machine.start( call site in main.ts, comments stripped', () => {
    expect(MAIN_CODE.split('machine.start(').length - 1).toBe(1);
  });

  it('clamps budgetFor\'s return by Math.min(START_BUDGET, and passes budgetFor( at the call site', () => {
    expect(budgetForBody()).toMatch(/return[^;]*Math\.min\(START_BUDGET/);
    expect(MAIN_CODE).toMatch(/machine\.start\(\s*budgetFor\(/);
  });

  it('leaves START_BUDGET at 2000, by value', () => {
    expect(START_BUDGET).toBe(2000);
  });

  it('keeps requestAnimationFrame( in exactly one file under src/ui', () => {
    const naming = uiFiles().filter((p) => code(p).includes('requestAnimationFrame('));
    expect(naming).toEqual([MAIN]);
  });

  it('catches a seeded second call site, and still lets a comment name the call', () => {
    expect(strip('if (x) machine.start(START_BUDGET);').includes('machine.start(')).toBe(true);
    expect(strip('// machine.start() dispatches on machine.mode\n').includes('machine.start(')).toBe(false);
  });
});
