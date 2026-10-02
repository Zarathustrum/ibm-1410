// Tier 0 — ONE ANIMATION FRAME FOR THE WHOLE PAGE (plan §10.2, §11 wave 5 oracle (f), §12.1 T0).
//
// WHICH MACHINE: none, and that is the point. Nothing here is a hardware claim — the 1410 had no
// frame rate and the plan's §10.2 spine rules that the BROWSER page gets exactly one
// `requestAnimationFrame` loop, in `src/ui/main.ts`, which executes a budget and then hands ONE
// `machine.snapshot()` to every view of the visible tab. A second loop is not a style defect: two
// loops render two different snapshots of the same machine in the same paint, and the console log
// and the paper disagree about what the 1411 just did.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · IT IMPORTS NO MODULE UNDER `src/ui` AND CONSTRUCTS NO VIEW. The run is `environment: 'node'`
//    (vite.config.ts:8-11) and plan §2.2 refuses jsdom, so there is no `requestAnimationFrame` to
//    call here at all. Every assertion below is a READ of the files under `src/ui/**`.
//  · IT SAYS NOTHING ABOUT WHAT THE FRAME DOES — the budget, the dirty latch and the visible-tab
//    rule are `src/ui/main.ts`'s and are not asserted here. This file counts loops, not behaviour.
//  · It reads with COMMENTS STRIPPED and LINE COMMENTS FIRST (the `codeOf` shape
//    `test/period-console.test.ts:119-121` and `test/period-keydown-ownership.test.ts:50-52` use),
//    because a header is entitled to name the call in the prose that explains why exactly one file
//    may make it — `src/ui/main.ts:7` and `period/mount.ts:23` both do, in the bare-name form
//    without the paren, which this needle would not have caught anyway — and because a `//` line
//    that writes the glob `src/ui` + a doubled star hands a block-first stripper a false comment
//    OPENER that then runs to the next `*/` and swallows live code. Case 4 proves the mechanism
//    rather than resting on either file's current wording.
//  · IT SHARES NO HELPER. `strip` is written out here and again in
//    `test/period-refusal-grep.test.ts` and `test/period-css-covers-every-class.test.ts` ON
//    PURPOSE: Phase 4 adds no shared test-support module (§3's file tables list none), and three
//    short copies are a better trade than a fourth module three tier-0 gates depend on.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const UI = 'src/ui';
const THE_ONE_FRAME = `${UI}/main.ts`;

/** Every `.ts` file under `src/ui/**`, repo-relative with `/` separators, sorted. `.d.ts` is a
 *  `.ts` file and is included — the shape `test/period-is-dom-free.test.ts:64-73` uses. */
function uiFiles(dir: string = UI): readonly string[] {
  return readdirSync(join(REPO_ROOT, dir))
    .flatMap((name) => (statSync(join(REPO_ROOT, dir, name)).isDirectory()
      ? uiFiles(`${dir}/${name}`)
      : name.endsWith('.ts') ? [`${dir}/${name}`] : []))
    .sort();
}

/** Comments out, LINE COMMENTS FIRST — see the header for why the order is load-bearing. */
const strip = (source: string): string =>
  source.replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');

const CODE = new Map(uiFiles().map((p) => [p, strip(readFileSync(join(REPO_ROOT, p), 'utf8'))]));
const FILES = [...CODE.keys()];
const naming = (needle: string): readonly string[] =>
  FILES.filter((p) => (CODE.get(p) ?? '').includes(needle));

describe('exactly one animation frame under src/ui (plan §10.2, §13 wave 5 oracle (f))', () => {
  it('finds the src/ui tree at all, so an empty sweep cannot pass these cases vacuously', () => {
    expect(FILES.length).toBeGreaterThan(20);
    expect(FILES).toContain(THE_ONE_FRAME);
  });

  it('calls requestAnimationFrame( in EXACTLY ONE file, src/ui/main.ts, named', () => {
    expect(naming('requestAnimationFrame(')).toEqual([THE_ONE_FRAME]);
  });

  it('cancels a frame nowhere: cancelAnimationFrame( appears in no file under src/ui', () => {
    // No loop is ever torn down because there is only ever one, and it lives as long as the page.
    expect(naming('cancelAnimationFrame(')).toEqual([]);
  });

  it('catches a seeded second loop, and still lets a header name the call in prose', () => {
    const seededCode = 'const loop = (): void => { requestAnimationFrame(loop); };';
    const seededComment = '// `requestAnimationFrame(` appears in exactly one file (plan §10.2).\n';
    const seededBlock = '/* the glob src/ui/**, then requestAnimationFrame( in prose */\n';
    expect(strip(seededCode)).toContain('requestAnimationFrame(');
    expect(strip(seededComment)).not.toContain('requestAnimationFrame(');
    expect(strip(seededBlock)).not.toContain('requestAnimationFrame(');
  });
});
