// Tier 0 — THE §12 REFUSAL GREP, and the file exit criterion 18a is carried by it
// (plan §12 "In the browser", §11 wave 5 oracle (g), §12.1 T0, §13 criterion 18a; §16 item 2).
//
// WHICH MACHINE: an IBM 1410, and every token below is refused because it belongs to a DIFFERENT
// one or to no machine at all. `1401 COMPAT`, `PRIORITY ON`, `PRIORITY PROCESSING`,
// `COMPATIBILITY`, `DENSITY`, `DISK WR`, `TAPE OFF LINE`, `DISK OFF LINE`, `729` and the 1402
// `LOAD` key name features architecture.md §12 settles OUT — no tape, no disk, no channel 2, no
// overlap, no Priority feature, no 1401 compatibility mode — and a period UI is exactly where a
// 1401 photograph gets mistaken for the machine this project models. `address dial` is the
// sharpest: the 1410 has NO address-dial rotary switches unlike the 1401 (console-and-physical.md
// §1; A22-0526-3 pp.50-51), which is why §6.4's address is TYPED. The red-fault colour tokens are
// the 1401's lamp convention (console-and-physical.md §11). The time-unit tokens are refused for a
// different reason: `microsecondsSimulated` is an INTERNALS number and the desk draws no clock, no
// speed and no elapsed time (architecture.md §6, §12; plan §2.2; critic item 8).
//
// WHAT A DRAWN LABEL IS, concretely — the whole scope of this file, and it is a DEFINED grep, the
// mechanism `test/rpg-columns-is-the-only-place.test.ts` already ships:
//   1. a string literal in the argument list of `text(` (`period/dom.ts:73`, the SVG `<text>` node);
//   2. a string literal assigned to `.textContent` or `.title`;
//   3. a string literal handed to `setAttribute('aria-label', …)` or `setAttribute('title', …)`;
//   4. a string literal inside ANY `const` whose initializer is an array or object literal — the
//      label tables, EXPORTED OR NOT. `export` is a wrong proxy for "drawn" in both directions:
//      `console/keysView.ts:55`'s `CONTROLS` and `console/rotaryView.ts:63`'s `LEGEND` are module-
//      private and every legend in them reaches the page, while `KEY_LABELS` is exported and is
//      only a `.map` over the first of those.
// A table DERIVED by a call rather than written as a literal — `lamps.ts:207`'s
// `PANEL_BOXES = PANEL.map(…)` is the one in this tree — has no literal for shape 4 to read, so it
// is covered by IMPORTING it and walking the drawn fields, which is the last case below.
// Everything else is out of scope BY CONSTRUCTION rather than by exception: an identifier such as
// `loadDeck`, a CSS value such as a `200ms` transition assigned through `.style`, an import
// specifier, and — because comments are stripped before any of the four run — every file header,
// including the three that §16 item 2 requires to quote the 1401 refusals by name.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · IT IMPORTS NO MODULE UNDER `src/ui` AND CONSTRUCTS NO VIEW: `environment: 'node'`
//    (vite.config.ts:8-11), and §2.2 refuses jsdom. Every assertion is a READ of the tree.
//  · IT DOES NOT MATCH SUBSTRINGS. The match is over WHOLE label tokens, never inside one, so
//    §7.2's `END OF FORMS` cannot fire on `ms` and an identifier like `loadDeck` is not `LOAD`.
//  · THE TWO TOKEN CLASSES ARE MATCHED DIFFERENTLY, on purpose (main-session ruling, this wave).
//    `REFUSED_TOKENS` and `REFUSED_PHRASES` are CASE-SENSITIVE, and that is load-bearing: §8's
//    `[verified]` legend `CLOCK` would otherwise collide with the refused `clock`, and folding case
//    would fire `ms`, `sec` and `speed` on legends and prose that are correct 1410 text.
//    `REFUSED_COLOURS` carries BOTH CASES, because no legitimate 1410 legend anywhere in
//    console-and-physical.md §§5/7/8 reads `RED` or `CRIMSON` — so the uppercase forms cost nothing
//    and close the gap a drawn `RED FAULT` would otherwise walk through (console-and-physical.md
//    §11: the red fault lamp is the 1401's convention and this machine refuses it).
//  · It judges no colour and no stylesheet. `period.css`'s own red-fault refusal is its comment's
//    and the CSS lint's (`test/period-session.test.ts`), not this file's.
//  · IT SHARES NO HELPER. `strip`, `balanced` and the literal scanner are written out here and
//    again in `test/period-css-covers-every-class.test.ts` and
//    `test/period-no-second-frame-loop.test.ts` ON PURPOSE: Phase 4 adds no shared test-support
//    module (§3's file tables list none), and a fourth production-shaped module that three tier-0
//    gates depend on is a worse trade than three short copies that can drift apart safely.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PANEL_BOXES } from '../src/ui/period/console/lamps.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PERIOD = 'src/ui/period';

/**
 * The floor each label-bearing file must clear, measured on this tree and set at roughly half.
 * Its job is NOT to count labels: it is to make a file BLANKED by a stripper accident visible,
 * because an emptied file passes every absence case in this suite in silence.
 */
const AT_LEAST: readonly (readonly [string, number])[] = [
  ['console/keyboardView.ts', 30], ['console/keysView.ts', 15], ['console/lamps.ts', 50],
  ['console/rotaryView.ts', 6], ['printer/carriageView.ts', 5], ['printer/formView.ts', 8],
  ['printer/panelView.ts', 8], ['reader/keysView.ts', 12], ['reader/stackerView.ts', 5],
  ['desk.ts', 5],
];

/** Refusals that are more than one token; matched as a token SEQUENCE inside one label. */
const REFUSED_PHRASES: readonly string[] = [
  'PRIORITY ON', 'PRIORITY PROCESSING', 'DISK WR', '1401 COMPAT', 'TAPE OFF LINE',
  'DISK OFF LINE', 'address dial',
];

/** Refusals that are one token. `LOAD` is here as the 1402 key label (§16 item 2, software.md
 *  §10.1, §10.10); the last seven are critic item 8's time units, and they are the reason THIS
 *  class is matched case-sensitively — see the header. */
const REFUSED_TOKENS: readonly string[] = [
  'COMPATIBILITY', 'DENSITY', '729', 'LOAD',
  'µs', 'ms', 'sec', 'seconds', 'clock', 'elapsed', 'speed',
];

/** The 1401's red-fault convention (console-and-physical.md §11), BOTH CASES — see the header for
 *  why this one class may carry its uppercase forms and the time units may not. */
const REFUSED_COLOURS: readonly string[] = [
  'red', 'RED', 'crimson', 'CRIMSON', '#f00', '#F00', '#ff0000', '#FF0000',
];

interface Label { readonly file: string; readonly line: number; readonly kind: string;
  readonly text: string; }

/** An exception, and a missing `citation` FAILS the test — plan §13 criterion 18a. */
interface Exception { readonly at: string; readonly text: string; readonly citation: string; }

const WHITELIST: readonly Exception[] = [
  // The three OMITTED_LAMPS labels: plan §8.2 requires the exception list to NAME the lamp it
  // refuses, checkably against S223-2648 Fig.3 p.8, so the literal is in the table that keeps the
  // lamp OFF the panel. None of the three is ever drawn; the string never reaches the page.
  { at: 'src/ui/period/console/lamps.ts:163', text: '1401 COMPAT',
    citation: 'plan §8.2; architecture.md §12 "No 1401 compatibility mode. Settled."' },
  { at: 'src/ui/period/console/lamps.ts:165', text: 'TAPE OFF LINE',
    citation: 'plan §8.2; architecture.md §12 "No tape…"' },
  { at: 'src/ui/period/console/lamps.ts:166', text: 'DISK OFF LINE',
    citation: 'plan §8.2; architecture.md §12 "…no disk…"' },
  // `const PANEL` is console-and-physical.md §5's published table read in verbatim — the source
  // `test/period-light-panel-vs-research.test.ts` diffs against, and the input `omitted()` filters
  // before `PANEL_BOXES` is built. The refused positions ARE published on the real 1415 and must
  // stay in the table that documents them; the last case below proves none reaches the drawn panel.
  { at: 'src/ui/period/console/lamps.ts:137',
    text: 'THERMAL,CB TRIP,I/O OFF LINE,TAPE OFF LINE,DISK OFF LINE',
    citation: 'plan §8 and §8.2; console-and-physical.md §5 [verified] — A22-0526-3 Figs.49-55 '
      + 'pp.52-55; S223-2648 Fig.3 p.8. The POWER box as published, before omitted() filters it.' },
  { at: 'src/ui/period/console/lamps.ts:138', text: '1401 COMPAT,OFF NORMAL,PRIORITY ALERT,STOP',
    citation: 'plan §8 and §8.2; console-and-physical.md §5 [verified] — the SYSTEMS CONTROLS box '
      + 'as published; architecture.md §12 refuses two of its four, and omitted() drops them.' },
  { at: 'src/ui/period/printer/carriageView.ts:114', text: 'carriage-control tape',
    citation: 'plan §13 criterion 18a checks the phrase `carriage tape` BECAUSE a builder reaches '
      + 'for "tape" and it carries no refused token: the 1403\'s is a PAPER loop in the printer '
      + '(console-and-physical.md §7; A22-0526-3 pp.66-67), not a 729 architecture.md §12 refuses.' },
];

// ── the sweep ────────────────────────────────────────────────────────────────────────────────────

/** Every `.ts` file under `src/ui/period/**`, repo-relative, sorted (the shape
 *  `test/period-keydown-ownership.test.ts:33-39` uses). */
function periodFiles(dir: string = PERIOD): readonly string[] {
  return readdirSync(join(REPO_ROOT, dir))
    .flatMap((name) => (statSync(join(REPO_ROOT, dir, name)).isDirectory()
      ? periodFiles(`${dir}/${name}`)
      : name.endsWith('.ts') ? [`${dir}/${name}`] : []))
    .sort();
}

/**
 * Comments out, LINE COMMENTS FIRST — the `codeOf` shape `test/period-console.test.ts:119-121`
 * uses, for the reason `test/period-keydown-ownership.test.ts:41-49` records: a `//` line that
 * writes the glob `src/ui` + a doubled star hands a block-first stripper a false comment OPENER.
 * A block comment keeps its NEWLINES here, because this file's whitelist is keyed on line numbers.
 */
const strip = (source: string): string => source
  .replace(/^[ \t]*\/\/.*$/gm, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '));

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

/** Every `'…'` and `` `…` `` literal in `span`, with its offset in the whole file. */
function literals(span: string, base: number): readonly (readonly [string, number])[] {
  return [...span.matchAll(/'((?:[^'\\\n]|\\.)*)'|`([^`]*)`/g)]
    .map((m) => [m[1] ?? m[2] ?? '', base + (m.index ?? 0)] as const);
}

/** The four drawn-label shapes named in this file's header, over one file's stripped source. */
function drawnLabels(file: string, code: string): readonly Label[] {
  const found: Label[] = [];
  const add = (offset: number, text: string, kind: string): void => {
    if (text.trim() !== '') found.push({ file, line: lineOf(code, offset), kind, text });
  };

  for (const m of code.matchAll(/\btext\(/g)) {
    const [span, base] = balanced(code, (m.index ?? 0) + m[0].length, '(', ')');
    for (const [text, at] of literals(span, base)) add(at, text, 'text()');
  }
  for (const m of code.matchAll(/\.(textContent|title)\s*=\s*([^;]*)/g)) {
    const rhs = m[2] ?? '';
    const base = (m.index ?? 0) + m[0].length - rhs.length;
    for (const [text, at] of literals(rhs, base)) add(at, text, `.${m[1] ?? ''}`);
  }
  for (const m of code.matchAll(/setAttribute\(\s*'(aria-label|title)'\s*,/g)) {
    const [span, base] = balanced(code, (m.index ?? 0) + m[0].length, '(', ')');
    for (const [text, at] of literals(span, base)) add(at, text, `setAttribute('${m[1] ?? ''}')`);
  }
  // `const|let|var`, not `const` alone: a label table declared with `let` or `var` — the shape a
  // table that is reassigned or hoisted arrives in — was invisible to criterion 18a entirely.
  for (const m of code.matchAll(/\b(?:const|let|var) ([A-Za-z_$][\w$]*)/g)) {
    const start = initializerOf(code, (m.index ?? 0) + m[0].length);
    if (start === undefined) continue;
    const open = code[start] ?? '';
    const [span, base] = balanced(code, start + 1, open, open === '[' ? ']' : '}');
    for (const [text, at] of literals(span, base)) add(at, text, `table ${m[1] ?? ''}`);
  }
  return found;
}

/**
 * The offset of an exported const's `[` or `{` initializer, or `undefined` when it has neither.
 * The scan walks to the first top-level `=` that is not part of `=>`, `==`, `!=`, `<=` or `>=`,
 * counting brackets on the way, because a type annotation may hold both — `OMITTED_LAMPS`
 * (`console/lamps.ts:156-157`) is `readonly { … ; … }[]`, semicolons and all.
 */
function initializerOf(code: string, from: number): number | undefined {
  let depth = 0;
  let i = from;
  while (i < code.length) {
    const ch = code[i] ?? '';
    if ('{(['.includes(ch)) depth += 1;
    else if ('})]'.includes(ch)) depth -= 1;
    else if (ch === '=' && depth === 0 && code[i + 1] !== '>' && !'=!<>'.includes(code[i - 1] ?? '')) {
      let j = i + 1;
      while (j < code.length && /\s/.test(code[j] ?? '')) j += 1;
      return code[j] === '[' || code[j] === '{' ? j : undefined;
    } else if (ch === ';' && depth === 0) return undefined;
    i += 1;
  }
  return undefined;
}

// ── the match: WHOLE TOKENS, CASE-SENSITIVE ─────────────────────────────────────────────────────

/** `#` and `µ` are token characters so that `#f00` and `µs` are tokens at all. */
const tokensOf = (text: string): readonly string[] =>
  text.split(/[^0-9A-Za-zµ#]+/u).filter((t) => t !== '');

function refusedIn(text: string): readonly string[] {
  const tokens = tokensOf(text);
  const hits = [...REFUSED_TOKENS, ...REFUSED_COLOURS].filter((t) => tokens.includes(t));
  for (const phrase of REFUSED_PHRASES) {
    const want = tokensOf(phrase);
    for (let i = 0; i + want.length <= tokens.length; i += 1) {
      if (want.every((w, j) => tokens[i + j] === w)) { hits.push(phrase); break; }
    }
  }
  return hits;
}

const LABELS = periodFiles()
  .flatMap((file) => drawnLabels(file, strip(readFileSync(join(REPO_ROOT, file), 'utf8'))));
/** A whitelist entry suppresses a finding only when it names the WHOLE label at that exact line —
 *  so `carriage-control tape`, which is a SUBSTRING of a longer caption and carries no refused
 *  token, documents a checked phrase without ever suppressing one. */
const ALLOWED = new Set(WHITELIST.map((e) => `${e.at}|${e.text}`));

describe('the §12 refusal grep over drawn labels under src/ui/period (§13 criterion 18a)', () => {
  it('finds the drawn labels at all, so an empty sweep cannot pass these cases vacuously', () => {
    expect(LABELS.length).toBeGreaterThan(300);
    expect(LABELS.map((l) => l.file)).toContain(`${PERIOD}/console/lamps.ts`);
  });

  it('clears a per-file floor, so ONE file blanked by a stripper accident is visible', () => {
    const short = AT_LEAST
      .map(([path, floor]) => [path, floor,
        LABELS.filter((l) => l.file === `${PERIOD}/${path}`).length] as const)
      .filter(([, floor, found]) => found < floor)
      .map(([path, floor, found]) => `${PERIOD}/${path}: ${found} labels, floor ${floor}`);
    expect(short).toEqual([]);
  });

  it('draws no refused token in any label outside the whitelist', () => {
    const findings = LABELS
      .flatMap((l) => refusedIn(l.text).map((token) => ({ ...l, token })))
      .filter((f) => !ALLOWED.has(`${f.file}:${f.line}|${f.text}`))
      .map((f) => `${f.file}:${f.line} [${f.kind}] refuses ${f.token} — ${JSON.stringify(f.text)}`);

    expect(findings).toEqual([]);
  });

  it('carries a citation on every whitelist entry, and an entry with none fails', () => {
    for (const entry of WHITELIST) {
      expect(entry.citation.trim().length, entry.at).toBeGreaterThan(20);
    }
    expect(WHITELIST.filter((e) => e.citation.trim() === '')).toEqual([]);
  });

  it('resolves every whitelist entry to a drawn label still at that file and line', () => {
    const at = (label: Label): string => `${label.file}:${label.line}`;
    for (const entry of WHITELIST) {
      const there = LABELS.filter((l) => at(l) === entry.at && l.text.includes(entry.text));
      expect(there.length, `${entry.at} no longer draws ${JSON.stringify(entry.text)}`)
        .toBeGreaterThan(0);
    }
  });

  it('fires on a seeded label, and does NOT fire on the legends §5/§7/§8 verify', () => {
    expect(refusedIn('PRIORITY ON')).toEqual(['PRIORITY ON']);
    expect(refusedIn('1401 COMPAT')).toEqual(['1401 COMPAT']);
    expect(refusedIn('type the address dial setting')).toEqual(['address dial']);
    expect(refusedIn('LOAD')).toEqual(['LOAD']);
    expect(refusedIn('729 II')).toEqual(['729']);
    expect(refusedIn('elapsed 12 ms')).toEqual(['ms', 'elapsed']);
    // The colour class, and ONLY the colour class, fires in both cases (main-session ruling).
    for (const colour of ['red', 'RED', 'crimson', 'CRIMSON', '#f00', '#F00', '#ff0000', '#FF0000'])
      expect(refusedIn(`${colour} FAULT`), colour).toEqual([colour]);
    // …while the time units stay case-sensitive, which is what protects §8's CLOCK legend.
    for (const legend of ['MS', 'SEC', 'SPEED', 'ELAPSED']) {
      expect(refusedIn(legend), legend).toEqual([]);
    }
    // The [verified] legends this grep must NOT eat: §8's CLOCK, §7.2's END OF FORMS and FORMS
    // CHECK, §7's READ CHECK, and the object deck's own lower-case `load address` caption.
    for (const legend of ['CLOCK', 'END OF FORMS', 'FORMS CHECK', 'READ CHECK', 'SECOND',
      'load address 00500', 'loaded deck, next card', 'MSEC']) {
      expect(refusedIn(legend), legend).toEqual([]);
    }
  });

  it('takes comments and file headers out of scope by construction, not by exception', () => {
    // §16 item 2 requires three headers under src/ui/period to quote the 1401 refusals BY NAME.
    const header = "// the 1402 LOAD key and the 1401 address dial are refused here\n"
      + "const label = 'PUNCH STOP';\n";
    expect(drawnLabels('seed.ts', strip(header)).map((l) => l.text)).toEqual([]);
    // The positive fires in a MODULE-PRIVATE table as well as an exported one — the widening that
    // brings `keysView.ts`'s `CONTROLS` and `rotaryView.ts`'s `LEGEND` into scope at all.
    // …and in a `let` or `var` table as well as a `const` one, which is the second widening: the
    // shape-4 matcher read `const` alone, so either other keyword hid a whole table from 18a.
    for (const seeded of ["export const KEYS = ['LOAD', 'START'];\n",
      "const CONTROLS = [{ kind: 'key', label: 'LOAD' }];\n",
      "let CONTROLS = [{ kind: 'key', label: 'LOAD' }];\n",
      "var LEGEND = { load: 'LOAD' };\n",
      "const LEGEND = { load: 'LOAD' };\n"]) {
      expect(drawnLabels('seed.ts', strip(seeded)).flatMap((l) => refusedIn(l.text)), seeded)
        .toEqual(['LOAD']);
    }
  });

  it('draws no refused token on the PANEL_BOXES the 1415 actually renders', () => {
    // `PANEL_BOXES` is DERIVED by `PANEL.map(…)` (`lamps.ts:207`), so no literal in the file is the
    // drawn table and shape 4 cannot reach it. It is imported instead — `lamps.ts` is DOM-free and
    // on `test/period-is-dom-free.test.ts`'s required-path list — and every field that reaches the
    // page is walked. This is what says the whitelisted `const PANEL` rows are filtered by
    // `omitted()` before anything is drawn, rather than merely declared to be.
    const drawn = PANEL_BOXES.flatMap((box) =>
      [box.title, ...box.lamps.flatMap((l) => [l.label, l.group ?? ''])]);
    expect(drawn.length).toBeGreaterThan(60);
    expect(drawn.filter((label) => refusedIn(label).length > 0)).toEqual([]);
  });
});
