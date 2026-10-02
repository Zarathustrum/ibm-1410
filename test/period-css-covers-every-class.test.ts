// Tier 0 — THE TWO DRIFT GUARDS OVER CSS CLASSES, in BOTH DIRECTIONS (plan §10.3's class
// inventory, §11 wave 5 oracle (f), §12.1 T0).
//
// WHICH MACHINE: none. Nothing here is a hardware claim — this is a browser bookkeeping gate over
// two files that no compiler reads. A class literal in TypeScript and a rule in CSS are joined by
// nothing but a string, so a rename in one silently un-styles the other: direction ONE catches a
// class the stylesheet never got (the state §10.3 records for `.source-box`, `.rpg-spec-box` and
// `.rpg-result`, which are class literals with nothing matching them today), and direction TWO
// catches a rule left behind by a rename.
//
// THE TWO HOMES A RULE MAY LIVE IN, and the split is plan §10.3's: `src/ui/styles/period.css` for
// the period surface, and `index.html`'s `<style>` block for `body` and the rules scoped under
// `#internals`. Either satisfies direction one; both are swept for direction two.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · IT IMPORTS NO MODULE UNDER `src/ui` AND CONSTRUCTS NO VIEW. `environment: 'node'`
//    (vite.config.ts:8-11); plan §2.2 refuses jsdom. Every assertion is a READ of the three trees.
//  · IT READS CLASS TOKENS, NEVER WHOLE SELECTORS — `index.html:31` is
//    `.card-face svg, .deck-box textarea`, a compound selector naming two classes, and a
//    whole-selector matcher would miss both. A class attribute is likewise SPLIT ON SPACES.
//  · IT JUDGES NO RULE'S CONTENT and no selector's shape. Whether a selector is properly scoped is
//    `test/period-session.test.ts`'s CSS lint (§11 wave 5 oracle (e)); this file only asks whether
//    each class has a rule somewhere and each rule's class has a user somewhere.
//  · IT SHARES NO HELPER. `strip`, `balanced` and the literal scanner are written out here and
//    again in `test/period-refusal-grep.test.ts` and `test/period-no-second-frame-loop.test.ts` ON
//    PURPOSE: Phase 4 adds no shared test-support module (§3's file tables list none), and a
//    fourth production-shaped module that three tier-0 gates depend on is a worse trade than three
//    short copies that can drift apart safely.
//  · It reads with COMMENTS STRIPPED, LINE COMMENTS FIRST (the `codeOf` shape
//    `test/period-console.test.ts:119-121` uses), so a header may quote a class it does not use —
//    and so a `//` line writing the glob `src/ui` + a doubled star cannot open a false block
//    comment over live code.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const UI = 'src/ui';
const CSS_PATH = 'src/ui/styles/period.css';
const HTML_PATH = 'index.html';

const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');

function uiFiles(dir: string = UI): readonly string[] {
  return readdirSync(join(REPO_ROOT, dir))
    .flatMap((name) => (statSync(join(REPO_ROOT, dir, name)).isDirectory()
      ? uiFiles(`${dir}/${name}`)
      : name.endsWith('.ts') ? [`${dir}/${name}`] : []))
    .sort();
}

const strip = (source: string): string => source
  .replace(/^[ \t]*\/\/.*$/gm, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '));

const lineOf = (code: string, offset: number): number => code.slice(0, offset).split('\n').length;

/** The balanced span opened at `at`, and where it starts. */
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

/** One call's arguments, split on TOP-LEVEL commas — quotes and nesting respected. */
function argsOf(span: string): readonly string[] {
  const args: string[] = [];
  let depth = 0;
  let quote = '';
  let current = '';
  for (let i = 0; i < span.length; i += 1) {
    const ch = span[i] ?? '';
    if (quote !== '') {
      if (ch === '\\') { current += ch + (span[i + 1] ?? ''); i += 1; continue; }
      if (ch === quote) quote = '';
    } else if (ch === '\'' || ch === '"' || ch === '`') quote = ch;
    else if ('([{'.includes(ch)) depth += 1;
    else if (')]}'.includes(ch)) depth -= 1;
    else if (ch === ',' && depth === 0) { args.push(current); current = ''; continue; }
    current += ch;
  }
  args.push(current);
  return args;
}

/** The class TOKENS in one expression's string literals — a class attribute splits on spaces.
 *  EITHER QUOTE CHARACTER, matched with a backreference: the single-quote-only form read a
 *  double-quoted class literal as no literal at all, so `make('div', "ghost")` was invisible to
 *  both directions of this file and could neither want a rule nor keep one alive. */
const tokensIn = (expr: string): readonly string[] =>
  [...expr.matchAll(/(['"])((?:[^'"\\\n]|\\.)*)\1/g)]
    .flatMap((m) => (m[2] ?? '').split(/\s+/))
    .filter((t) => /^-?[A-Za-z_][\w-]*$/.test(t));

/**
 * Every class literal a TS file hands to the DOM, by the four helper shapes the two surfaces use:
 * `make(tag, cls)` / `svg(tag, cls)` / `text(content, cls)` — `period/dom.ts:32, :66, :73` and
 * `internals/panel.ts:23` — plus `className =`, `classList.add/remove/toggle(…)` and
 * `setAttribute('class', …)`. The class is argument INDEX 1 of all three helpers.
 */
function classUses(file: string, code: string): readonly (readonly [string, string])[] {
  const uses: (readonly [string, string])[] = [];
  const add = (offset: number, expr: string): void => {
    for (const token of tokensIn(expr)) uses.push([token, `${file}:${lineOf(code, offset)}`]);
  };
  for (const m of code.matchAll(/\b(?:make|svg|text)\(/g)) {
    const [span] = balanced(code, (m.index ?? 0) + m[0].length, '(', ')');
    add(m.index ?? 0, argsOf(span)[1] ?? '');
  }
  for (const m of code.matchAll(/\.className\s*=\s*([^;]*)/g)) add(m.index ?? 0, m[1] ?? '');
  for (const m of code.matchAll(/\.classList\.(?:add|remove|toggle)\(/g)) {
    const [span] = balanced(code, (m.index ?? 0) + m[0].length, '(', ')');
    add(m.index ?? 0, span);
  }
  for (const m of code.matchAll(/setAttribute\(\s*'class'\s*,/g)) {
    const [span] = balanced(code, (m.index ?? 0) + m[0].length, '(', ')');
    add(m.index ?? 0, span);
  }
  return uses;
}

/** Every class token named in a selector of `source`, with where it was found. */
function classRules(source: string, where: string, firstLine = 1)
  : readonly (readonly [string, string])[] {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, ' '));
  const found: (readonly [string, string])[] = [];
  for (const m of css.matchAll(/([^{}]*)\{/g)) {
    const head = (m[1] ?? '').trim();
    if (head.startsWith('@') || head === '') continue;
    for (const cls of head.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) {
      found.push([cls[1] ?? '', `${where}:${lineOf(css, m.index ?? 0) + firstLine - 1}`]);
    }
  }
  return found;
}

const HTML = read(HTML_PATH);
const STYLE = /<style[^>]*>([\s\S]*?)<\/style>/.exec(HTML);
const STYLE_BLOCK = STYLE?.[1] ?? '';
const STYLE_FIRST_LINE = lineOf(HTML, (STYLE?.index ?? 0) + (STYLE?.[0] ?? '').indexOf('>') + 1);

const USES = uiFiles().flatMap((file) => classUses(file, strip(read(file))));
const RULED = [
  ...classRules(read(CSS_PATH), CSS_PATH),
  ...classRules(STYLE_BLOCK, `${HTML_PATH} <style>`, STYLE_FIRST_LINE),
];

const USED_NAMES = new Set(USES.map(([name]) => name));
const RULED_NAMES = new Set(RULED.map(([name]) => name));
/** One line per class: the name, then every place it was found — a miss names both. */
const inventory = (pairs: readonly (readonly [string, string])[]): string =>
  [...new Set(pairs.map(([n]) => n))].sort()
    .map((n) => `  .${n} @ ${[...new Set(pairs.filter(([m]) => m === n)
      .map(([, at]) => at))].join(', ')}`)
    .join('\n');
const namesMissingFrom = (pairs: readonly (readonly [string, string])[], known: ReadonlySet<string>)
  : readonly string[] =>
  [...new Set(pairs.filter(([name]) => !known.has(name)).map(([name]) => name))].sort();

describe('every class has a rule and every rule has a class (plan §10.3, wave 5 oracle (f))', () => {
  it('finds classes, rules and both stylesheets at all — no case may pass vacuously', () => {
    expect(STYLE_BLOCK.length).toBeGreaterThan(200);
    expect(read(CSS_PATH).length).toBeGreaterThan(0);
    expect(USED_NAMES.size).toBeGreaterThan(5);
    expect(RULED_NAMES.size).toBeGreaterThan(5);
  });

  it('DIRECTION ONE: every class literal under src/ui/**.ts has a rule somewhere', () => {
    const missing = namesMissingFrom(USES, RULED_NAMES).map((name) =>
      `.${name} used at ${USES.filter(([n]) => n === name).map(([, at]) => at).join(', ')}`
      + ` — no rule in ${CSS_PATH} or ${HTML_PATH}`);
    expect(missing, `class inventory:\n${inventory(USES)}`).toEqual([]);
  });

  it('DIRECTION TWO: every class in a rule is referenced from some TypeScript file', () => {
    const orphans = namesMissingFrom(RULED, USED_NAMES).map((name) =>
      `.${name} ruled at ${RULED.filter(([n]) => n === name).map(([, at]) => at).join(', ')}`
      + ` — no class literal under ${UI}`);
    expect(orphans, `rule inventory:\n${inventory(RULED)}`).toEqual([]);
  });

  it('reads TOKENS out of compound selectors and space-separated attributes, not whole selectors',
    () => {
      expect(classRules('.card-face svg, .deck-box textarea { display: block }', 'seed')
        .map(([n]) => n)).toEqual(['card-face', 'deck-box']);
      expect(classUses('seed.ts', "el.className = 'green-bar period-form';").map(([n]) => n))
        .toEqual(['green-bar', 'period-form']);
      // DOUBLE-QUOTED, and mixed with a single-quoted argument in the same call — without a case
      // in this shape the widening above has no reader and the gap reopens silently.
      expect(classUses('seed.ts', `make('div', "green-bar period-form");`).map(([n]) => n))
        .toEqual(['green-bar', 'period-form']);
      expect(classUses('seed.ts', "const e = make('td');").map(([n]) => n)).toEqual([]);
      expect(classUses('seed.ts', "make('div', on ? 'on' : 'off');").map(([n]) => n))
        .toEqual(['on', 'off']);
      expect(classUses('seed.ts', "text(`${n}`, 'period-ruler');").map(([n]) => n))
        .toEqual(['period-ruler']);
      expect(classUses('seed.ts', strip("// make('div', 'ghost')\n")).map(([n]) => n)).toEqual([]);
    });
});
