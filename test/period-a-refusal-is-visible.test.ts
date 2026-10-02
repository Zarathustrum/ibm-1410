// Tier 0 — A REFUSAL IS VISIBLE: the two halves of one bug class, closed in ONE file.
//
// WHAT BUG. Six defects were fixed across `e6b2d08`, `afbcaf3` and `1c81ac5` and every one of them
// was the same shape: a UI control calls something that can REFUSE, the refusal is invisible (a
// `void` method with an early `return`), and the caller repaints the page as though it had
// succeeded. One of them wrote a deck the operator had explicitly cancelled into core.
//
// WHY NOTHING CAUGHT IT, which is the whole reason this file exists rather than a case added to one
// of the three that nearly did:
//   · `test/period-console.test.ts` proves the refusals themselves — at the SESSION level. It
//     imports no view and constructs no DOM, so it can see that `startKey()` declined; it cannot
//     see that the caller then wrote "keyed at the 1415" anyway.
//   · `test/period-keydown-ownership.test.ts` sweeps `.press(` CALLERS — who is allowed to press a
//     key — and never looks at what a caller does with the answer.
//   · `test/period-refusal-grep.test.ts` greps DRAWN LABEL TEXT for 1401 tokens. It reads every
//     string this file cares about and never opens a handler.
// The two halves of the bug were each tested, in files that never meet. This file is where they
// meet: the DOM half (case A) and the typed half (case B) are asserted over the same tree, in the
// same sweep, with the same helpers.
//
// WHICH MACHINE: none. Nothing below is a hardware claim about the IBM 1410, the 1402 or the 1403.
// This is a claim about TypeScript control flow under `src/ui/period/**`, and the manuals settle
// none of it. The 1410 facts on every site it names live in the file that draws them.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · IT IMPORTS NOTHING UNDER `src/ui` AND CONSTRUCTS NO DOM: `environment: 'node'`
//    (vite.config.ts:8-11), and plan §2.2 refuses jsdom. Every assertion is a READ of the tree —
//    which is exactly why it can assert a thing no DOM test in this repo is able to: not "the note
//    is right", but "the handler that writes the note asked first".
//  · IT SHARES NO HELPER. `strip`, `balanced` and `literals` are written out here and again in
//    `test/period-refusal-grep.test.ts`, `test/period-css-covers-every-class.test.ts` and
//    `test/period-no-second-frame-loop.test.ts` ON PURPOSE, and that file's header records the
//    trade: Phase 4 adds no shared test-support module, and a production-shaped module three (now
//    four) tier-0 gates depend on is worse than four short copies that can drift apart safely.
//  · IT JUDGES NO TEXT. Whether a note SAYS the right thing is `period-refusal-grep.test.ts`'s and
//    `test/period-console.test.ts`'s. This file asks one question: did the handler branch at all.
//  · It reads `src/ui/period/**` only. `src/ui/internals/controls.ts` is BYTE-FROZEN (plan §13
//    criterion 3) and `src/ui/main.ts` writes no operator note.
//
// THE ONE HELPER THIS FILE HAS THAT THE OTHER THREE DO NOT, and it is load-bearing: `blank()`.
// Case A and case B look for CONTROL FLOW — `if (`, `return;`, `?…:` — and prose is full of all
// three. `deckBoxView.ts`'s own refusal note asks "…press this again." and `paper/chain.ts:39`
// writes `['%', '(']` and `['@', "'"]`, a bare `(` and a bare `'` inside string literals. A scan
// that reads those as code mis-balances the very span it is about to judge. So the literals are
// BLANKED — quotes kept, contents replaced by spaces, newlines preserved so every offset and every
// line number still lands where it did. Two views of one file, the same length, are the mechanism:
// the `'click'` argument is found in the STRIPPED text (it is a literal, and blanking eats it), and
// the handler body is judged in the BLANKED text at the same offset.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PERIOD = 'src/ui/period';

/**
 * A `: void` body with an early bare `return;`, and the honest reason it is not the bug above.
 * `at` is `file:line` OF THE RETURN ITSELF, not of the declaration — one line, one entry, and the
 * last case below re-resolves every one of them against the sweep, so the table cannot rot: move
 * the code and the citation fails rather than silently covering a different guard.
 * `why` must be longer than 20 characters, the bar `period-refusal-grep.test.ts:280` sets on its
 * own citations. A guard nobody can justify in a sentence is a finding, not an entry.
 */
interface Guarded { readonly at: string; readonly why: string }

const GUARDED_VOIDS: readonly Guarded[] = [
  { at: 'src/ui/period/coding/listingView.ts:172',
    why: 'The no-assembly branch WRITES before it returns — status reads "Press ASSEMBLE." and the '
      + 'errors and the paper are cleared. It refuses nothing; it paints the empty state.' },

  // ── console/session.ts — the file the six shipped defects were found in ──────────────────────
  { at: 'src/ui/period/console/session.ts:176',
    why: 'A locked keyboard takes no character at all, and the lock is DRAWN: keyboardView.ts:271 '
      + 'prints "KEYBOARD LOCKED — nothing typed here reaches the machine" beside it.' },
  { at: 'src/ui/period/console/session.ts:177',
    why: 'The WORD MARK key does not repeat (S223-2648 p.78). The mark the caller asked for is '
      + 'already on the line, so the state it wanted is the state that holds — nothing refused.' },
  { at: 'src/ui/period/console/session.ts:345',
    why: 'supply() is a DISPATCH guard, not an operator refusal: only an inquiry entry still being '
      + 'typed is the device\'s. Its two callers, release() and cancel(), are drawn disabled by '
      + 'inquiryView.ts:171-173 in exactly the states this line declines, each with a title.' },
  { at: 'src/ui/period/console/session.ts:365',
    why: 'commit() declines to discard a RELEASED inquiry entry, which already belongs to the '
      + 'device and whose row stays on the form until the program reads it (§6.6). Discarding it '
      + 'is the bug; declining is the fix, and the operator sees the row that stayed.' },
  { at: 'src/ui/period/console/session.ts:386',
    why: 'THE REFUSAL IS REPORTED: this branch sets `notice = addressRefused(...)` and reopens the '
      + 'same five positions before returning, so a mistyped address is drawn at the 1415 instead '
      + 'of being indistinguishable from a display that happened.' },
  { at: 'src/ui/period/console/session.ts:430',
    why: 'A turn to the detent already selected is not a change, so there is nothing to report: '
      + 'turnTo() returned no mode and no stop, and the dial is drawn where the operator left it.' },
  { at: 'src/ui/period/console/session.ts:453',
    why: 'THE REFUSAL IS REPORTED: START at the RUN detent with the facade moved out from under '
      + 'the dial sets `notice = PROCESSOR_IS_NOT_AT_RUN` and latches nothing — this is M2, the '
      + 'silent stall the last commit closed, and the notice is what closed it.' },
  { at: 'src/ui/period/console/session.ts:455',
    why: 'A dispatch return after hooks.run() has already fired: the work is DONE, and the return '
      + 'only keeps the four detent branches from falling through into one another.' },
  { at: 'src/ui/period/console/session.ts:457',
    why: 'A dispatch return after the DISPLAY detent has opened the five-digit address field: the '
      + 'work is DONE and the unlocked keyboard is drawn. Falling through would re-open it.' },
  { at: 'src/ui/period/console/session.ts:458',
    why: 'The other three detents are inert BY THE DRAWN CAPTION (§4.8): keysView.ts captions START '
      + 'as the key that unlocks the keyboard in DISPLAY or ALTER, so a START at RUN-less, '
      + 'display-less detents says nothing because the caption already said it.' },
  { at: 'src/ui/period/console/session.ts:459',
    why: 'THE REFUSAL IS REPORTED: an ALTER that does not follow a display sets '
      + '`notice = ALTER_MUST_FOLLOW_A_DISPLAY` before returning, which is §4\'s rule drawn at the '
      + '1415 rather than a key that quietly did nothing.' },
  { at: 'src/ui/period/console/session.ts:496',
    why: 'INQ CAN with no pending entry has nothing to discard, and inquiryView.ts:173 draws the '
      + 'lever DISABLED with the title NOTHING_TO_DISCARD in exactly that state.' },
  { at: 'src/ui/period/console/session.ts:497',
    why: 'A dispatch return after supply(\'cancel\') has ended the open inquiry entry: the work is '
      + 'DONE. Falling through would then run retype() and set ENTRY_DISCARDED over it.' },

  // ── specs/mount.ts — the same click-handler shape as coding/mount.ts, done right ─────────────
  { at: 'src/ui/period/specs/mount.ts:65',
    why: 'SEND TO AUTOCODER declines an empty hand-off and — the point — does NOT write the '
      + '"boxes filled" note it writes on success, so nothing on the page claims a hand-off that '
      + 'did not happen. Unreachable today (the button is disabled until generate() is ok), and '
      + 'belt-and-braces is why it survives a future caller that forgets to disable it.' },
];

// ── the sweep ────────────────────────────────────────────────────────────────────────────────────

/** Every `.ts` file under `src/ui/period/**`, repo-relative, sorted — `period-refusal-grep`'s
 *  walker, `statSync` and all, because `tools/node-shims.d.ts:16` declares no `withFileTypes`. */
function periodFiles(dir: string = PERIOD): readonly string[] {
  return readdirSync(join(REPO_ROOT, dir))
    .flatMap((name) => (statSync(join(REPO_ROOT, dir, name)).isDirectory()
      ? periodFiles(`${dir}/${name}`)
      : name.endsWith('.ts') ? [`${dir}/${name}`] : []))
    .sort();
}

/**
 * Comments out, LINE COMMENTS FIRST, block comments to spaces with their NEWLINES KEPT — the same
 * order and the same reason as `period-refusal-grep.test.ts:149-151`: a `//` line that writes the
 * glob `src/ui` + a doubled star hands a block-first stripper a false comment OPENER, and this
 * file's citation table is keyed on line numbers, so nothing may change a file's line count.
 * Comments are out of scope BY CONSTRUCTION: a header is entitled to write `if (` in prose, and
 * three of them under `src/ui/period` do.
 */
const strip = (source: string): string => source
  .replace(/^[ \t]*\/\/.*$/gm, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '));

/**
 * Every string-literal SPAN in `code`, quotes included, with its offset. This is the shape that
 * differs from `period-refusal-grep.test.ts:169`'s `literals`, and deliberately: that file wants
 * the TEXT of a label, this one wants the EXTENT of a literal so `blank()` can erase it.
 * DOUBLE QUOTES ARE IN THE SET, which that file does not need and this one cannot do without —
 * `paper/chain.ts:39` writes `['@', "'"]`, and a scanner that skipped it would read that lone
 * apostrophe as opening a string and swallow the rest of the file.
 */
const literals = (code: string): readonly (readonly [string, number])[] =>
  [...code.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)]
    .map((m) => [m[0], m.index ?? 0] as const);

/**
 * The same code with every literal's CONTENTS replaced by spaces — quotes kept, newlines kept, so
 * the result is the same length as the input and every offset and line number is unchanged.
 * See the header: prose is full of `(`, `'`, `?` and `:`, and control-flow scanning must not read
 * an operator note as a branch or a caption's bracket as a nesting level.
 */
function blank(code: string): string {
  let out = code;
  for (const [span, at] of literals(code)) {
    const inner = span.slice(1, -1).replace(/[^\n]/g, ' ');
    out = `${out.slice(0, at)}${span[0] ?? ''}${inner}${span.at(-1) ?? ''}${out.slice(at + span.length)}`;
  }
  return out;
}

const lineOf = (code: string, offset: number): number => code.slice(0, offset).split('\n').length;

/** The span from `at` to its matching `close`, with the span's own offset in `code`. */
function balanced(code: string, at: number, open: string, close: string): readonly [string, number] {
  let depth = 1;
  let i = at;
  while (i < code.length && depth > 0) {
    const ch = code[i];
    if (ch === open) depth += 1;
    else if (ch === close) depth -= 1;
    i += 1;
  }
  return [code.slice(at, i - 1), at];
}

/** A file read twice: `src` keeps its literals (that is where `'click'` lives), `code` has them
 *  blanked (that is where the control flow lives). Same length, so offsets cross over freely. */
interface Views { readonly file: string; readonly src: string; readonly code: string }

const viewsOf = (file: string, source: string): Views => {
  const src = strip(source);
  return { file, src, code: blank(src) };
};

// ── CASE A — the DOM half: a click handler that repaints without asking ──────────────────────────

/**
 * A ternary, and NOT `?.`, `??` or a `?:` optional marker. Run over BLANKED code, so no `?` and no
 * `:` inside an operator note can reach it.
 */
const TERNARY = /(?<!\?)\?(?![.?:])[\s\S]*?:/;
const WRITES_TEXT = /\.textContent\s*=(?!=)/;
const BRANCHES = (span: string): boolean =>
  TERNARY.test(span) || /\bif\s*\(/.test(span) || /\breturn\s*;/.test(span);

interface Handler { readonly file: string; readonly line: number; readonly span: string }

/**
 * Every `addEventListener('click',` in one file, with the BALANCED ARGUMENT LIST as its span.
 * The argument list rather than the arrow body, because that is the one shape that covers both
 * spellings in this tree: `('click', () => { … })` and `('click', onEndOfJob)` — a handler passed
 * by name has no braces to balance, and skipping it would take five of the nineteen out of scope.
 */
function clickHandlers({ file, src, code }: Views): readonly Handler[] {
  const found: Handler[] = [];
  for (const m of src.matchAll(/addEventListener\(\s*'click'\s*,/g)) {
    const at = (m.index ?? 0) + 'addEventListener('.length;
    const [span] = balanced(code, at, '(', ')');
    found.push({ file, line: lineOf(code, m.index ?? 0), span });
  }
  return found;
}

const unguardedClicks = (handlers: readonly Handler[]): readonly string[] => handlers
  .filter((h) => WRITES_TEXT.test(h.span) && !BRANCHES(h.span))
  .map((h) => `${h.file}:${h.line} writes .textContent with no branch — it cannot have asked`);

// ── CASE B — the typed half: a `: void` that refuses by falling out early ────────────────────────

interface VoidBody {
  readonly open: number; readonly end: number; readonly name: string; readonly isRender: boolean;
}
interface EarlyReturn { readonly at: string; readonly isRender: boolean }

/**
 * The name of the function whose body opens at `at`: walk back over the `)` that closes its
 * parameter list to the matching `(`, and take the identifier in front of it. `''` for an
 * anonymous arrow, which is every `const f = (): void => {` in this tree.
 */
function nameBefore(code: string, at: number): readonly [string, number] {
  let i = at - 1;
  while (i >= 0 && /\s/.test(code[i] ?? '')) i -= 1;
  if (code[i] !== ')') return ['', -1];
  let depth = 1;
  i -= 1;
  while (i >= 0 && depth > 0) {
    if (code[i] === ')') depth += 1;
    else if (code[i] === '(') depth -= 1;
    i -= 1;
  }
  while (i >= 0 && /\s/.test(code[i] ?? '')) i -= 1;
  const end = i + 1;
  while (i >= 0 && /[\w$]/.test(code[i] ?? '')) i -= 1;
  return [code.slice(i + 1, end), i + 1];
}

/** The offset of the nearest enclosing `{` at depth 0 from `at`, or -1 when the nearest enclosing
 *  bracket is a `(`/`[` or there is none — i.e. "is this inside an object literal, and where". */
function enclosingBrace(code: string, at: number): number {
  let depth = 0;
  let i = at - 1;
  while (i >= 0) {
    const ch = code[i] ?? '';
    if ('}])'.includes(ch)) depth += 1;
    else if ('{(['.includes(ch)) {
      if (depth === 0) return ch === '{' ? i : -1;
      depth -= 1;
    }
    i -= 1;
  }
  return -1;
}

/**
 * THE ONE EXEMPTION, AND IT IS BY SHAPE RATHER THAN BY NAME: a `render(` whose enclosing object
 * literal also carries `el`. That is the `View` the whole period desk is built from
 * (`src/ui/period/dom.ts`), and its early return is the DIFF KEY — `if (next === cached) return;`,
 * the repaint this frame does not need. It refuses nothing and there is no operator to tell.
 * A `render` anywhere else, and every other `: void`, buys its guard with a line in GUARDED_VOIDS.
 */
function voidBodies(code: string): readonly VoidBody[] {
  return [...code.matchAll(/:\s*void\s*(?:=>\s*)?\{/g)].map((m) => {
    const open = (m.index ?? 0) + m[0].length;
    const [body] = balanced(code, open, '{', '}');
    const [name, nameAt] = nameBefore(code, m.index ?? 0);
    let isRender = false;
    if (name === 'render' && nameAt >= 0) {
      const brace = enclosingBrace(code, nameAt);
      if (brace >= 0) {
        const [object] = balanced(code, brace + 1, '{', '}');
        isRender = /(?:^|[\s{,])el\s*[,:}]/.test(object);
      }
    }
    return { open, end: open + body.length, name, isRender };
  });
}

/**
 * Every bare `return;` that is not the last statement of the `: void` body it sits in, attributed
 * to the INNERMOST such body — a nested arrow's guard belongs to the nearest annotated function,
 * not to the outermost one that happens to contain it. "Not last" is: something other than
 * whitespace and closing braces follows it, still inside that body.
 */
function earlyVoidReturns({ file, code }: Views): readonly EarlyReturn[] {
  const bodies = voidBodies(code);
  const found: EarlyReturn[] = [];
  for (const m of code.matchAll(/\breturn\s*;/g)) {
    const at = (m.index ?? 0);
    const inner = bodies.filter((b) => at >= b.open && at < b.end)
      .sort((a, b) => b.open - a.open)[0];
    if (inner === undefined) continue;
    if (!/[^\s}]/.test(code.slice(at + m[0].length, inner.end))) continue;
    found.push({ at: `${file}:${lineOf(code, at)}`, isRender: inner.isRender });
  }
  return found;
}

// ── the tree, read once ──────────────────────────────────────────────────────────────────────────

const FILES = periodFiles();
const VIEWS = FILES.map((file) => viewsOf(file, readFileSync(join(REPO_ROOT, file), 'utf8')));
const HANDLERS = VIEWS.flatMap(clickHandlers);
const VOID_GUARDS = VIEWS.flatMap(earlyVoidReturns);
const CITED = new Set(GUARDED_VOIDS.map((g) => g.at));

describe('a refusal is visible: click handlers and : void guards under src/ui/period', () => {
  it('finds the tree, the handlers and the guards at all, so nothing below passes vacuously', () => {
    // The floors are `period-refusal-grep.test.ts:256-266`'s answer to a stripper accident that
    // blanks a file: an emptied tree passes every ABSENCE case in this suite in silence.
    expect(FILES.length).toBeGreaterThan(20);
    expect(HANDLERS.length).toBeGreaterThan(8);
    expect(VOID_GUARDS.length).toBeGreaterThan(15);
    expect(FILES).toContain(`${PERIOD}/coding/mount.ts`);
  });

  it('CASE A — no click handler writes .textContent without branching on an answer', () => {
    expect(unguardedClicks(HANDLERS)).toEqual([]);
  });

  it('CASE A — fires on a seeded handler and not on the same handler with a guard', () => {
    const seed = (source: string): readonly string[] =>
      unguardedClicks(clickHandlers(viewsOf('seed.ts', source)));
    expect(seed("b.addEventListener('click', () => { f(); note.textContent = 'done'; });"))
      .toHaveLength(1);
    expect(seed("b.addEventListener('click', () => { if (!f()) return; note.textContent = 'x'; });"))
      .toEqual([]);
    expect(seed("b.addEventListener('click', () => { note.textContent = f() ? 'a' : 'b'; });"))
      .toEqual([]);
    // Prose cannot fake a branch: the note below asks a question and offers a colon, and the
    // literal-blanking is what stops that reading as a ternary.
    expect(seed("b.addEventListener('click', () => { n.textContent = 'Punched? Now: press it.'; });"))
      .toHaveLength(1);
    // …and a comment cannot fake one either.
    expect(seed("b.addEventListener('click', () => {\n  // if (x) return;\n  n.textContent = 'z';\n});"))
      .toHaveLength(1);
  });

  it('CASE B — every early bare return in a : void body is a View diff key or is cited', () => {
    const uncited = VOID_GUARDS
      .filter((g) => !g.isRender && !CITED.has(g.at))
      .map((g) => `${g.at} returns early from a : void body with no GUARDED_VOIDS entry`);
    expect(uncited).toEqual([]);
  });

  it('CASE B — fires on a seeded : void guard and not on a typed refusal', () => {
    const seed = (source: string): readonly EarlyReturn[] =>
      earlyVoidReturns(viewsOf('seed.ts', source));
    expect(seed('foo(): void { if (x) return; bar(); }')).toHaveLength(1);
    expect(seed('foo(): boolean { if (x) return false; return true; }')).toEqual([]);
    // A `return;` that IS the last statement is not an early one.
    expect(seed('foo(): void { bar(); return; }')).toEqual([]);
    // The exemption is by SHAPE. In an object literal carrying `el` it is the View diff key…
    expect(seed('const v = { el, render(s: S): void { if (n === c) return; paint(); } };')
      .filter((g) => !g.isRender)).toEqual([]);
    // …and the identical body anywhere else is not exempt and must be cited.
    expect(seed('function render(s: S): void { if (n === c) return; paint(); }')
      .filter((g) => !g.isRender)).toHaveLength(1);
    expect(seed('const v = { render(s: S): void { if (n === c) return; paint(); } };')
      .filter((g) => !g.isRender)).toHaveLength(1);
  });

  it('carries a why on every GUARDED_VOIDS entry, and an entry with none fails', () => {
    for (const entry of GUARDED_VOIDS) {
      expect(entry.why.trim().length, entry.at).toBeGreaterThan(20);
    }
  });

  it('resolves every GUARDED_VOIDS entry to a real early return still at that line', () => {
    const live = new Set(VOID_GUARDS.map((g) => g.at));
    for (const entry of GUARDED_VOIDS) {
      expect(live.has(entry.at), `${entry.at} is no longer an early return in a : void body`)
        .toBe(true);
    }
  });
});
