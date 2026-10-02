// Tier 0 — the DOM-free guarantee for the period surface's computing modules, and the two imports
// that are allowed to cross the surface boundary (plan §3.8, §4, §12.1 T0).
//
// The rule set is test/core-is-dom-free.test.ts's, at its lines 14-20, verbatim: CODE SHAPES, not
// English words, because that file's own header records what banning words cost — three verbatim
// IBM manual quotes forced into paraphrase, a research file corrupted to satisfy a lint.
// EXTENDED HERE BY THREE PATTERNS THE CORE SET DOES NOT MATCH: `/\bSVGElement\b/` (the core
// alternation requires `HTML…`, `Element` or `Node` immediately after the `:`),
// `/\brequestAnimationFrame\(/` and `/\baddEventListener\(/` — exactly what §10.2's one-frame rule
// and §6.5's focus rule need forbidden inside this set. Views are NOT scanned: they are adapters
// that compute nothing, and only the required paths below are held to the ban.
//
// THE REQUIRED-PATH LIST GROWS WITH THE WAVES, and this is the one Phase-4 test file a later wave
// APPENDS to (§11's ownership note 1). Eight at wave 1. Wave 4 appends two cases,
// `console/session.ts` and `console/lamps.ts`; wave 5 appends one, `period/session.ts` — eleven at
// the end. Append entries to REQUIRED_PATHS; edit nothing that is already there.
//
// EXACTLY TWO IMPORTS CROSS THE SURFACE BOUNDARY, and both are asserted BY MODULE NAME rather than
// by importer, so a later wave's file move costs the guarantee nothing: period → internals is
// `keyed` from `src/ui/internals/controls.js` (imported from `unitrecord/inquiryView.ts` today,
// from `console/session.ts` after wave 4), and internals → period is `renderSelectric` from
// `src/ui/period/console/selectric.js`, wave 1's fold in `internals/panel.ts`.
// `demos` is an allowed root: the five `?raw` sample imports resolve there — a build input, not
// a cross-surface reach: reader/deckBoxView.ts:50, coding/sheetView.ts:37-38, specs/sheetView.ts:32-33.

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PERIOD_DIR = join(REPO_ROOT, 'src/ui/period');
const INTERNALS_DIR = join(REPO_ROOT, 'src/ui/internals');
const ALLOWED_ROOTS = ['src/ui/period', 'src/core', 'src/formats', 'src/asm', 'src/rpg', 'demos']
  .map((dir) => join(REPO_ROOT, dir));

/** The one sanctioned period → internals import, and the one sanctioned internals → period one. */
const KEYED_MODULE = join(REPO_ROOT, 'src/ui/internals/controls.js');
const FOLD = { importer: join(INTERNALS_DIR, 'panel.ts'), module: join(PERIOD_DIR, 'console/selectric.js') };

// Wave 1's eight: the five modules this wave lands, plus the three block sessions moved in wave 0.
const REQUIRED_PATHS: readonly string[] = [
  'src/ui/period/paper/page.ts',
  'src/ui/period/paper/carriage.ts',
  'src/ui/period/paper/chain.ts',
  'src/ui/period/paper/cardGeometry.ts',
  'src/ui/period/console/selectric.ts',
  'src/ui/period/unitrecord/session.ts',
  'src/ui/period/autocoder/session.ts',
  'src/ui/period/rpg/session.ts',
  // WAVE 4 APPENDS TWO — the 1415 station's two computing modules, which land with this wave.
  'src/ui/period/console/session.ts',
  'src/ui/period/console/lamps.ts',
  // WAVE 5 APPENDS ONE — the page's own view state and its pure transitions. Eleven, and this list
  // is complete: no Phase-4 wave after this one lands a computing module (§11 ownership note 1).
  'src/ui/period/session.ts',
];

const BANNED: readonly RegExp[] = [
  /\brequire\(/, /\bprocess\./, /\bwindow\./, /\bdocument\./, /\bglobalThis\b/, /\bself\./,
  /\blocation\.(href|assign|reload|replace|origin|pathname|hostname|protocol|search|hash)\b/,
  /\bfetch\(/, /\bsetTimeout\(/, /\bsetInterval\(/, /\blocalStorage\b/, /\bnavigator\./,
  /\bnew XMLHttpRequest\b/, /[:<]\s*(HTML\w*Element|Element|Node)\b/,
  /\bSVGElement\b/, /\brequestAnimationFrame\(/, /\baddEventListener\(/,
];

function listTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...listTsFiles(full));
    else if (name.endsWith('.ts')) files.push(full);      // .d.ts is a .ts file and is included
  }
  return files;
}

function domViolations(files: readonly string[]): string[] {
  const violations: string[] = [];
  for (const file of files) {
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      const banned = BANNED.find((pattern) => pattern.test(line));
      if (banned) violations.push(`${file}:${index + 1}: matches ${String(banned)}: ${line.trim()}`);
    });
  }
  return violations;
}

/** A bare side-effect import — none exists under src/ui/period today; the guard is for later waves. */
const SIDE_EFFECT = /\bimport\s+['"]([^'"]+)['"]/;

/** Every import specifier in a file, resolved, with Vite's `?raw` suffix stripped. */
function importsOf(file: string): { readonly where: string; readonly spec: string; readonly to: string }[] {
  return readFileSync(file, 'utf8').split('\n').flatMap((line, index) => {
    const spec = /\bfrom\s+['"]([^'"]+)['"]/.exec(line)?.[1] ?? SIDE_EFFECT.exec(line)?.[1];
    if (spec === undefined) return [];
    const bare = spec.split('?')[0] ?? spec;
    const to = spec.startsWith('.') ? resolve(dirname(file), bare) : bare;
    return [{ where: `${file}:${index + 1}`, spec, to }];
  });
}

/** `join` supplies the host separator; trimming the sentinel leaves a directory boundary. */
const inside = (dir: string, path: string): boolean =>
  path === dir || path.startsWith(join(dir, '_').slice(0, -1));

describe('Phase 4: the period surface computes DOM-free, and two imports cross the boundary', () => {
  for (const path of REQUIRED_PATHS) {
    it(`${path} exists and touches no DOM global`, () => {
      const full = join(REPO_ROOT, path);
      expect(existsSync(full)).toBe(true);
      expect(domViolations([full])).toEqual([]);
    });
  }

  it('every import under src/ui/period is relative and lands in the six allowed roots', () => {
    const violations = listTsFiles(PERIOD_DIR).flatMap((file) => importsOf(file).flatMap((imp) => {
      if (!imp.spec.startsWith('.')) return [`${imp.where}: imports "${imp.spec}", not a relative path`];
      if (imp.to === KEYED_MODULE) return [];              // the one sanctioned exception, by name
      return ALLOWED_ROOTS.some((root) => inside(root, imp.to))
        ? [] : [`${imp.where}: resolves outside the allowed roots: "${imp.spec}"`];
    }));
    expect(violations).toEqual([]);
  });

  it('nothing under src/ui/internals reaches into src/ui/period except the selectric fold', () => {
    const crossings = listTsFiles(INTERNALS_DIR).flatMap((file) =>
      importsOf(file).filter((imp) => inside(PERIOD_DIR, imp.to)).map((imp) => `${file} -> ${imp.to}`));
    expect(crossings).toEqual([`${FOLD.importer} -> ${FOLD.module}`]);
  });
});
