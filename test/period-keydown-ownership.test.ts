// Tier 0 — KEYDOWN OWNERSHIP (plan §6.5 rulings 2 and 3, §12.1 T0, §13 criterion 18b, §14 R2′).
//
// WHICH MACHINE: the IBM 1415 console keyboard on a 1410 — a real WORD MARK key at the far left of
// the QWERTY row and no backspace at all, the physical Backspace key being INQUIRY RELEASE
// (A22-0526-3 Fig.43 p.47; S223-2648 p.78, both [verified]; console-and-physical.md §2). But the
// question this file settles is a BROWSER one, not a hardware one: the period desk puts that
// keyboard on the same page as three `<textarea>`s — the coding sheet, the spec sheet and the deck
// box — and a `document`-level listener would silently eat the operator's source into the console
// log. §15 `KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT`.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · IT INSTANTIATES NO VIEW AND IMPORTS NO VIEW MODULE. The run is `environment: 'node'`
//    (vite.config.ts:8-11) and plan §2.2 refuses jsdom, so a keystroke cannot be dispatched here
//    at all. Every assertion below is a READ of the files under `src/ui/**`.
//  · It reads them with COMMENTS STRIPPED (the `codeOf` shape `test/period-reader.test.ts` uses),
//    because a header is entitled to name `addEventListener('keydown'` in the prose that explains
//    why exactly one file may call it — which is what the header of `console/keyboardView.ts` does.
//  · It changes nothing in `src/core`. There is no core question here.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PERIOD = 'src/ui/period';
/** THE SWEEP ROOT IS THE WHOLE UI TREE, NOT `period/`. A `document`-level listener does the same
 *  damage wherever it is bound, and the file most able to bind one is `src/ui/main.ts` — it owns
 *  the tab switch and the frame loop, it is outside `period/`, and it is the file this phase
 *  edited most. Swept at `period/` alone, `document.addEventListener('keydown', …)` in `main.ts`
 *  was caught by nothing. `PERIOD` below stays the console-ownership PREFIX (ruling 3). */
const UI = 'src/ui';
const KEYBOARD_VIEW = `${PERIOD}/console/keyboardView.ts`;

/** Every `.ts` file under `src/ui/**`, repo-relative with `/` separators, sorted. Walked
 *  with `statSync` rather than `withFileTypes`, which `tools/node-shims.d.ts:16` does not declare —
 *  the shape `test/period-is-dom-free.test.ts:67-71` already uses. */
function uiFiles(dir: string = UI): readonly string[] {
  return readdirSync(join(REPO_ROOT, dir))
    .flatMap((name) => (statSync(join(REPO_ROOT, dir, name)).isDirectory()
      ? uiFiles(`${dir}/${name}`)
      : name.endsWith('.ts') ? [`${dir}/${name}`] : []))
    .sort();
}

/**
 * A file with its comments removed, so a header may name what the code may not call.
 *
 * LINE COMMENTS COME OUT FIRST, and the order is load-bearing here in a way it is not in
 * `test/period-reader.test.ts`: `console/keyboardView.ts`'s own OPEN block writes the glob
 * `src/ui` + a doubled star in prose, whose slash-star a block-comment regex reads as a comment
 * OPENER and then runs to the next closer — swallowing the exported constant this file pins.
 * Stripping the `//` lines first removes the false opener before the block pass ever sees it.
 */
const codeOf = (path: string): string =>
  readFileSync(join(REPO_ROOT, path), 'utf8')
    .replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');

const FILES = uiFiles();
const CODE = new Map(FILES.map((p) => [p, codeOf(p)] as const));
const naming = (needles: readonly string[]): readonly string[] =>
  FILES.filter((p) => needles.some((n) => (CODE.get(p) ?? '').includes(n)));

describe('keydown ownership under src/ui (plan §6.5 rulings 2-3, §13 criterion 18b)', () => {
  it('finds the ui tree at all, so an empty sweep cannot pass these cases vacuously', () => {
    expect(FILES.length).toBeGreaterThan(20);
    expect(FILES).toContain(KEYBOARD_VIEW);
  });

  it('binds keydown and keypress in EXACTLY ONE file, console/keyboardView.ts (ruling 2)', () => {
    expect(naming(["addEventListener('keydown'", "addEventListener('keypress'"]))
      .toEqual([KEYBOARD_VIEW]);
  });

  it('binds NO listener on document or window anywhere under src/ui (ruling 2)', () => {
    // The named case: typing in the coding sheet while the MACHINE ROOM tab is visible must not
    // reach the carrier. Both are on screen at once — that is what the desk is.
    expect(naming(['document.addEventListener(', 'window.addEventListener('])).toEqual([]);
  });

  it('keeps every `.press(` caller under src/ui/period/console (ruling 3)', () => {
    // The three callers: the `keydown` handler on the console region, the drawn key tops' click
    // handlers, and `ConsoleSession.keyBootstrap`. The deck box's "key the bootstrap" button calls
    // `session.keyBootstrap` and never `press` — that is what this case asserts rather than claims.
    const callers = naming(['.press(']);
    expect(callers.length).toBeGreaterThan(0);
    for (const path of callers) expect(path.startsWith(`${PERIOD}/console/`), path).toBe(true);
  });

  it('pins KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT in keyboardView.ts (§15)', () => {
    // Read from the source rather than imported: `keyboardView.ts` is a VIEW, and importing a view
    // for one boolean is how a `document` reach gets into a node run (§12.1 T0).
    expect(CODE.get(KEYBOARD_VIEW))
      .toContain('KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT = true');
  });
});
