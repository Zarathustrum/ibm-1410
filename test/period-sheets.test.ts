// test/period-sheets.test.ts — Tier T2/T0. The two authoring stations' DRAWN DATA, and the A/H
// restrike over the two shipped listings. Plan §5.3, §9.1-§9.3, §11 wave 5 oracle (b), (c) and
// (d), §13 criteria 6, 12 and 15, §15 `THE_RULER_IS_THE_FORM`.
//
// WHY THIS FILE EXISTS — a §3 file-list deviation the build records. §11 wave 5's clauses (c) and
// (d) name no test file, and every test file wave 5 owns landed in wave 5a under Zarathustrum's split with
// no append to any of them sanctioned. So the two clauses have no carrier; this is it, and it is
// new rather than an append for exactly that reason.
//
// WHICH MACHINE:
//  · The coding sheet is the IBM 1410 AUTOCODER coding form, C28-0309-1 pp.5-7 `[verified]`
//    (software.md §1) — page 1-2, line 3-5, label 6-15, operation 16-20, operand 21-72,
//    identification 76-80 — plus the two columns the parser reads by ABSOLUTE position,
//    `COMMENT_COLUMN` and `LABEL_INDENT_COLUMN` (software.md §5; C28-0326-2 p.28).
//  · The specification sheets are the CARD RPG's shared X24-1336…1339 forms, columns from
//    J24-0215-2 (rpg-sources.md §5, §6 `[verified]`); C28-1443 is not digitised and none of the
//    four forms is drawn (§9.2, §14 R12).
//  · The restrike is the IBM 1403 Model 2's interchangeable print chains, arrangements A (report
//    writing) and H (program language) — charset.md §5 `[verified]`, A22-0526-3 pp.6-7 Figure 2,
//    GA24-3073 p.27. FIVE code points differ and nothing else does.
//
// THE GOLDENS ARE READ AND NEVER WRITTEN. `test/golden/hello-dad.lst` (2251 B) and
// `test/golden/sales-summary.lst` (6982 B) are Phase 3's and Phase 5's, on §3.7's do-not-touch
// list. Each is re-derived by re-running its shipped source through the real pipeline and compared
// byte for byte; nothing here opens a golden for writing.
//
// A CORRECTION §5.3 EARNS, stated at its point of use: the two shipped `.lst` goldens are NOT two
// Autocoder listings. `hello-dad.lst` is `renderListing` over an Autocoder listing;
// `sales-summary.lst` is `renderRpgListing` over an RPG SPECIFICATION listing (`src/rpg/listing.ts`,
// pinned by test/rpg-listing.test.ts). Both go through `renderGreenBar` with the same `{ chain }`
// option, so the restrike identity is one identity over both — but the Autocoder listing of the
// RPG-GENERATED source is a THIRD artefact with no golden, asserted below for the transform only.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO: it instantiates NO view. `vite.config.ts:8-11` sets
// `test: { environment: 'node' }` and §2.2 refuses jsdom, so a constructor would throw on
// `document`; only the DATA exports of the three view modules are imported, and none of those
// modules creates a node at import time. It edits no golden, no research file and no `src/` file.
//
// WHAT THE STRUCTURAL CASES DO AND DO NOT PROVE. `RULER_FIELDS` and `SHEET_RULERS` are PURE MAPS
// over `SOURCE_FIELDS` and `SHEET_COLUMNS` — each sheet view builds its export by walking its own
// table — so the three equality cases below cannot fail while those maps stay honest. They are here
// to pin the map's SHAPE (one entry per field, in table order, both endpoints carried) and to catch
// a view that stops deriving, not to discover a disagreement between two independent transcriptions.
// What guards the DRAWN OUTPUT against a hand-typed column is the defined grep, and the grep is why
// this file is not a tautology.
//
// THE DEFINED GREP, its scope, and WHAT IT DOES NOT CLAIM. The boundaries of `SOURCE_FIELDS` ∪
// `SHEET_COLUMNS` ∪ the two marks are 78 of the 80 integers 1..80 (only 55 and 79 are absent —
// asserted below), so §11 (d)'s "no column number written anywhere" would forbid a tens-ruler
// modulus, a `padStart` width and a textarea row count. THE CLAIM IS THEREFORE NARROWED, here and
// in the case's own name: no hand-typed span ON A CARD-IMAGE RECEIVER in the restyled code. The
// detector is `test/rpg-columns-is-the-only-place.test.ts`'s, for its stated reason — a decimal
// integer 1..80 passed to `.slice`/`.substring`/`.substr`/`.padEnd`/`.padStart` on a
// card/spec/source/image/pglin receiver, or an array literal of exactly two such integers — plus
// one pattern of this file's own: a literal `N-M` span written into drawn text, both ends 1..80.
// Comments are stripped FIRST (test/period-console.test.ts's `codeOf`, whose own note says why),
// LINE-FOR-LINE here so a whitelist row can carry a true file line. Scope is the two consumers wave
// 5b restyles, `src/ui/period/coding/**` and `src/ui/period/specs/**`; the rest of
// `src/ui/period/**` draws card geometry and holds coordinate pairs that are not column spans.
// The detector is proved to FIRE on seeded literals, so a clean tree is not a vacuous pass — and
// the one site in the restyled trees that it DOES catch is whitelisted by file, line and reason
// below, so the literal is visible rather than hidden behind a narrower receiver list.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { pass2 } from '../src/asm/emit.js';
import { buildListing } from '../src/asm/listing.js';
import { renderListing } from '../src/asm/listing1403.js';
import { parse } from '../src/asm/operand.js';
import { pack } from '../src/asm/pack.js';
import { pass1 } from '../src/asm/symbols.js';
import { COMMENT_COLUMN, LABEL_INDENT_COLUMN, SOURCE_FIELDS } from '../src/asm/types.js';
import type { PrintChain } from '../src/core/devices/printer1403.js';
import { parseScanned, scan } from '../src/rpg/deck.js';
import { generate } from '../src/rpg/generate.js';
import { buildRpgListing, renderRpgListing } from '../src/rpg/listing.js';
import { model } from '../src/rpg/model.js';
import { SHEET_COLUMNS } from '../src/rpg/sheets/columns.js';
import { readSpecSource } from '../src/rpg/sheets/read.js';
import type { SheetKind } from '../src/rpg/types.js';
import { CHAIN_DUALS } from '../src/ui/period/paper/chain.js';
import { paintedListing } from '../src/ui/period/coding/listingView.js';
import {
  RULER_FIELDS, RULER_MARKS, THE_RULER_IS_THE_FORM,
} from '../src/ui/period/coding/sheetView.js';
import { SHEET_RULERS } from '../src/ui/period/specs/sheetView.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** test/period-console.test.ts's helper: LINE comments first, so a `src/ui/**` glob written in
 *  prose cannot present its doubled star to a block-comment regex as an opener. One change to it:
 *  a block comment is blanked IN PLACE rather than collapsed to a space, so a finding's line
 *  number is the file's own and a whitelist row below can cite it. */
const codeOf = (path: string): string =>
  readFileSync(join(REPO_ROOT, path), 'utf8')
    .replace(/^[ \t]*\/\/.*$/gm, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '));

// ═══ (c) THE LISTING GOLDENS CONSTRAIN THE RESTRIKE ═══════════════════════════════════════════

/** test/asm-listing.test.ts's composition: `parse -> pass1 -> pass2 -> pack -> buildListing`. */
function asmListing(text: string, chain?: PrintChain): string {
  const p1 = pass1(parse(text));
  const p2 = pass2(p1.sized, p1.symbols, p1.coreSize);
  const lines = buildListing(p1, p2, pack(p2.items, p1.reserved).cardOf);
  return chain === undefined ? renderListing(lines) : renderListing(lines, { chain });
}

/** test/rpg-listing.test.ts's composition: `readSpecSource -> scan -> parseScanned -> model`. */
function rpgListing(source: string, chain?: PrintChain): string {
  const scanned = scan(readSpecSource(source));
  const lines = buildRpgListing(scanned, model(parseScanned(scanned)).diagnostics);
  return chain === undefined ? renderRpgListing(lines) : renderRpgListing(lines, { chain });
}

const HELLO = readFileSync('demos/hello-dad.asm', 'utf8');
const SALES = readFileSync('demos/sales-summary.rpg', 'utf8');

/** The two SHIPPED listings, each with the renderer that made its golden. */
const SHIPPED = [
  {
    name: 'hello-dad.lst', bytes: 2251,
    a: (): string => asmListing(HELLO),
    at: (chain: PrintChain): string => asmListing(HELLO, chain),
  },
  {
    name: 'sales-summary.lst', bytes: 6982,
    a: (): string => rpgListing(SALES),
    at: (chain: PrintChain): string => rpgListing(SALES, chain),
  },
] as const;

const bodyOf = (page: string): string => page.slice(page.indexOf('\n'));
const countOf = (text: string, glyph: string): number => [...text].filter((c) => c === glyph).length;

describe('(c) the two shipped listing goldens, and the restrike over them (plan §5.3, §9.3)', () => {
  for (const listing of SHIPPED) {
    const golden = readFileSync(`test/golden/${listing.name}`, 'utf8');

    it(`${listing.name}: the chain-A rendering is the golden, byte for byte, at ${listing.bytes} B`, () => {
      expect(readFileSync(`test/golden/${listing.name}`)).toHaveLength(listing.bytes);
      expect(listing.a()).toBe(golden);
    });

    for (const chain of ['A', 'H'] as const) {
      it(`${listing.name}: paintedListing(A rendering, '${chain}') is the chain-${chain} rendering, byte for byte`, () => {
        expect(paintedListing(listing.a(), chain)).toBe(listing.at(chain));
      });
    }

    it(`${listing.name}: the H painting names chain H and carries the H duals, not the A duals`, () => {
      const painted = paintedListing(listing.a(), 'H');
      expect(painted.split('\n')[0]).toContain('chain H');
      expect(painted.split('\n')[0]).not.toContain('chain A');
      const before = bodyOf(listing.a());
      const after = bodyOf(painted);
      for (const [a, h] of CHAIN_DUALS) {
        expect(countOf(before, h), `${h} is on the A page`).toBe(0);
        expect(countOf(after, a), `${a} survived the restrike`).toBe(0);
        expect(countOf(after, h), `${a} -> ${h}`).toBe(countOf(before, a));
      }
    });
  }

  // NOT a golden, and this case says so: the coding station shows the AUTOCODER listing of the
  // source the specs station hands off, which no `.lst` file pins. The transform is the same.
  it('the Autocoder listing of the RPG-generated source satisfies the same identity, ungoldened', () => {
    const generated = generate(SALES);
    expect(generated.ok).toBe(true);
    const result = assemble(generated.source);
    expect(result.ok).toBe(true);
    for (const chain of ['A', 'H'] as const) {
      expect(paintedListing(renderListing(result.listing), chain))
        .toBe(renderListing(result.listing, { chain }));
    }
  });

  it('coding/listingView.ts restrikes from paper/chain.js and passes no chain into renderListing', () => {
    const code = codeOf('src/ui/period/coding/listingView.ts');
    expect(code).toMatch(/import\s*\{[^}]*\brestrike\b[^}]*\}\s*from\s*'\.\.\/paper\/chain\.js'/);
    // Reading the argument text alone is defeated by one indirection — `const opts = { chain };
    // renderListing(l, opts)` — so the shape is pinned instead: EXACTLY ONE call, its argument list
    // exactly a value and the LITERAL default constant, and exactly one chain OPTIONS OBJECT in the
    // whole file, which is that call's. One built anywhere else adds a second and fails here. The
    // lookbehind excludes `${chain}` — a template interpolation is the toggle's LABEL, not an option
    // — and the trailing `[:}]` is what separates `{ chain: … }` / `{ chain }` from a BLOCK whose
    // first statement happens to assign `chain`, which is the toggle's own click handler.
    const args = callArgsOf(code, 'renderListing');
    expect(args, 'one renderListing call, and one only').toHaveLength(1);
    expect((args[0] ?? '').replace(/\s+/g, ' ').trim())
      .toMatch(/^[A-Za-z_$][\w$.]*, \{ chain: PRINT_CHAIN_A_IS_DEFAULT \}$/);
    expect([...code.matchAll(/(?<!\$)\{\s*chain\s*[:}]/g)], 'a second chain options object')
      .toHaveLength(1);
  });
});

// ═══ (d) THE RULER IS THE FORM ════════════════════════════════════════════════════════════════

const SOURCE_KEYS = Object.keys(SOURCE_FIELDS) as (keyof typeof SOURCE_FIELDS)[];
const SHEET_KINDS = Object.keys(SHEET_COLUMNS) as SheetKind[];

describe('(d) every drawn sheet field is at the span its source table gives (plan §11 wave 5)', () => {
  it('RULER_FIELDS is SOURCE_FIELDS field for field, each name once (C28-0309-1 pp.5-7)', () => {
    expect(RULER_FIELDS.map((f) => [f.start, f.end]))
      .toEqual(SOURCE_KEYS.map((key) => [...SOURCE_FIELDS[key]]));
    expect(new Set(RULER_FIELDS.map((f) => f.name)).size).toBe(RULER_FIELDS.length);
    let previous = 0;
    for (const { name, start, end } of RULER_FIELDS) {
      expect(start, `${name} starts inside the card`).toBeGreaterThan(previous);
      expect(end, `${name} ends inside the card`).toBeLessThanOrEqual(80);
      expect(end, `${name} is not backwards`).toBeGreaterThanOrEqual(start);
      previous = end;
    }
  });

  it('RULER_MARKS is the two absolute columns the parser reads, and only those two', () => {
    expect(RULER_MARKS.map((mark) => mark.column)).toEqual([COMMENT_COLUMN, LABEL_INDENT_COLUMN]);
  });

  it('SHEET_RULERS is SHEET_COLUMNS for every kind, name and span', () => {
    expect(Object.keys(SHEET_RULERS).sort()).toEqual([...SHEET_KINDS].sort());
    for (const kind of SHEET_KINDS) {
      expect(SHEET_RULERS[kind], kind).toEqual(
        SHEET_COLUMNS[kind].map((f) => ({ name: f.name, start: f.cols[0], end: f.cols[1] })),
      );
    }
  });

  // The three GROUP fields — `firstSourceGroup`, `lineSpecificationGroup`,
  // `fieldSpecificationGroup` — are umbrellas over a run of leaves and are the only spans that
  // contain another. Leaves are what a person reads columns off, so they carry the ordering rule.
  it('each field once; the leaf spans ascend contiguously and each group covers exactly its run', () => {
    for (const kind of SHEET_KINDS) {
      const fields = SHEET_RULERS[kind];
      expect(new Set(fields.map((f) => f.name)).size, kind).toBe(fields.length);
      const contains = (o: { start: number; end: number }, i: { start: number; end: number }): boolean =>
        o.start <= i.start && i.end <= o.end && (o.start !== i.start || o.end !== i.end);
      const groups = fields.filter((f) => fields.some((g) => contains(f, g)));
      const leaves = fields.filter((f) => !groups.includes(f));
      let next = 1;
      for (const leaf of leaves) {
        expect(leaf.start, `${kind}/${leaf.name} follows the previous leaf`).toBe(next);
        expect(leaf.end, `${kind}/${leaf.name} is not backwards`).toBeGreaterThanOrEqual(leaf.start);
        next = leaf.end + 1;
      }
      expect(next - 1, `${kind} ends inside the card`).toBeLessThanOrEqual(80);
      for (const group of groups) {
        const covered = leaves.filter((l) => l.start >= group.start && l.end <= group.end);
        expect(covered.length, `${kind}/${group.name} covers leaves`).toBeGreaterThan(0);
        expect([covered[0]?.start, covered[covered.length - 1]?.end], `${kind}/${group.name}`)
          .toEqual([group.start, group.end]);
      }
    }
  });

  it('the boundary set covers 78 of the 80 columns, which is why the detector below is narrow', () => {
    const boundaries = new Set<number>([COMMENT_COLUMN, LABEL_INDENT_COLUMN]);
    for (const key of SOURCE_KEYS) for (const n of SOURCE_FIELDS[key]) boundaries.add(n);
    for (const kind of SHEET_KINDS) {
      for (const f of SHEET_COLUMNS[kind]) { boundaries.add(f.cols[0]); boundaries.add(f.cols[1]); }
    }
    const absent = Array.from({ length: 80 }, (_, i) => i + 1).filter((n) => !boundaries.has(n));
    expect(boundaries.size).toBe(78);
    expect(absent).toEqual([55, 79]);
  });

  it('THE_RULER_IS_THE_FORM is pinned by name, and the spans arrive by import in both consumers', () => {
    expect(THE_RULER_IS_THE_FORM).toBe(true);
    expect(codeOf('src/ui/period/coding/sheetView.ts'))
      .toMatch(/import\s*\{[^}]*\bSOURCE_FIELDS\b[^}]*\}\s*from\s*'\.\.\/\.\.\/\.\.\/asm\/types\.js'/);
    expect(codeOf('src/ui/period/specs/sheetView.ts'))
      .toMatch(/import\s*\{[^}]*\bSHEET_COLUMNS\b[^}]*\}\s*from\s*'\.\.\/\.\.\/\.\.\/rpg\/sheets\/columns\.js'/);
  });

  it('writes no hand-typed span on a card-image receiver under coding/** or specs/**, whitelist apart', () => {
    const offenders = [...tsFiles(resolve('src/ui/period/coding')), ...tsFiles(resolve('src/ui/period/specs'))]
      .flatMap((file) => spanLiterals(codeOf(shownPath(file)), shownPath(file)));
    expect(offenders.filter((hit) => !WHITELIST.some((row) => row.finding === hit))).toEqual([]);
    // A stale row is a failure too: every whitelisted literal must still be there, or the narrowing
    // has outlived the code it was granted for.
    for (const row of WHITELIST) expect(offenders, row.why).toContain(row.finding);
  });

  it('the detector fires on seeded literals and stays silent on ordinary slicing', () => {
    const seeded = [
      'card.slice(6);', 'spec.substring(7);', 'sourceImage.substr(8);',
      'const span = [9, 10];', "text('columns 21-72 operand');",
      'const pglin = line.pglin.padEnd(5);',
      'stmts.slice(1);', 'operand.slice(1);', 'const big = [9, 810];',
    ].join('\n');
    expect(spanLiterals(seeded, 'seed.ts')).toEqual([
      'seed.ts:1 card.slice(6) uses 6',
      'seed.ts:2 spec.substring(7) uses 7',
      'seed.ts:3 sourceImage.substr(8) uses 8',
      'seed.ts:6 pglin.padEnd(5) uses 5',
      'seed.ts:4 [9, 10]',
      'seed.ts:5 21-72',
    ]);
  });
});

// ═══ (b) THE SESSION / ADAPTER BOUND ══════════════════════════════════════════════════════════

describe('(b) the three session files never move (plan §11 wave 5 (b), §13 criterion 15)', () => {
  // NOT a byte-identity check on the two tier-4 files — that is the standing gate's job, in git.
  // What is asserted here is the half a restyle can break: the specifier each still carries has a
  // file at the end of it.
  const CARRIED = [
    ['test/tier4-autocoder-demo.test.ts', 'src/ui/period/autocoder/session'],
    ['test/tier4-rpg-demo.test.ts', 'src/ui/period/rpg/session'],
    ['test/session.test.ts', 'src/ui/period/unitrecord/session'],
  ] as const;

  for (const [test, module] of CARRIED) {
    it(`${test} still imports ${module}.js, and that file is on disk`, () => {
      expect(readFileSync(join(REPO_ROOT, test), 'utf8')).toContain(`from '../${module}.js'`);
      expect(existsSync(join(REPO_ROOT, `${module}.ts`)), `${module}.ts`).toBe(true);
    });
  }
});

// ═══ The detector, and the reader ═════════════════════════════════════════════════════════════

function tsFiles(root: string): readonly string[] {
  return readdirSync(root).flatMap((entry) => {
    const full = join(root, entry);
    if (statSync(full).isDirectory()) return tsFiles(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}

const shownPath = (file: string): string => file.slice(REPO_ROOT.length + 1);

/**
 * THE WHITELIST, by file + line + reason, on §13 criterion 18a's shape: a row with no reason is not
 * a row. `coding/listingView.ts`'s `diagnostic()` reads PGLIN — source columns 1-5, `SOURCE_FIELDS`
 * `page` (1-2) and `line` (3-5) concatenated — by hand: the width 5, and the 2 that splits page from
 * line. It is PHASE-3 CODE CARRIED UNCHANGED through the `git mv`, not something wave 5b wrote, and
 * §9 says this station is restyled and may NOT be re-implemented. So §11 (d)'s "no column number
 * anywhere" is NARROWED here rather than satisfied, and the narrowing is three visible rows instead
 * of a receiver list quietly drawn to exclude `pglin`. Closing it is `diagnostic()` slicing through
 * `SOURCE_FIELDS.page` / `.line`, which is a Phase-3 body edit and not this wave's to make.
 */
const WHITELIST: readonly { readonly finding: string; readonly why: string }[] = [
  {
    finding: 'src/ui/period/coding/listingView.ts:80 pglin.padEnd(5) uses 5',
    why: 'listingView.ts:80 — PGLIN is SOURCE_FIELDS.page + .line, columns 1-5 (C28-0309-1 pp.5-7); '
      + 'Phase-3 code carried unchanged by the wave-5b git mv, §9 forbids re-implementing it',
  },
  {
    finding: 'src/ui/period/coding/listingView.ts:81 pglin.slice(0, 2) uses 2',
    why: 'listingView.ts:81 — the page half, SOURCE_FIELDS.page = [1, 2]; Phase-3 code carried '
      + 'unchanged, §11 (d) narrowed here rather than met',
  },
  {
    finding: 'src/ui/period/coding/listingView.ts:81 pglin.slice(2) uses 2',
    why: 'listingView.ts:81 — the line half, SOURCE_FIELDS.line = [3, 5] read as the remainder; '
      + 'Phase-3 code carried unchanged, §11 (d) narrowed here rather than met',
  },
];

/** The three patterns the header defines. Nothing else is a column declaration. */
function spanLiterals(source: string, shown: string): readonly string[] {
  const found: string[] = [];
  const isColumn = (n: number | undefined): n is number => n !== undefined && n >= 1 && n <= 80;
  const int = (text: string): number | undefined => (/^\d+$/.test(text) ? Number(text) : undefined);
  const lineOf = (offset: number): number => source.slice(0, offset).split('\n').length;

  const CALLS = /\b([A-Za-z_$][\w$]*)\.(slice|substring|substr|padEnd|padStart)\s*\(([^)]*)\)/g;
  for (const m of source.matchAll(CALLS)) {
    if (!/(?:card|spec|source|image|pglin)/i.test(m[1] ?? '')) continue;
    for (const arg of (m[3] ?? '').split(',')) {
      const n = int(arg.trim());
      if (isColumn(n)) found.push(`${shown}:${lineOf(m.index ?? 0)} ${m[1]}.${m[2]}(${m[3]}) uses ${n}`);
    }
  }
  for (const m of source.matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*\]/g)) {
    if (isColumn(int(m[1] ?? '')) && isColumn(int(m[2] ?? ''))) {
      found.push(`${shown}:${lineOf(m.index ?? 0)} ${m[0]}`);
    }
  }
  for (const m of source.matchAll(/(?<![\w.-])(\d+)-(\d+)(?![\w.-])/g)) {
    if (isColumn(int(m[1] ?? '')) && isColumn(int(m[2] ?? ''))) {
      found.push(`${shown}:${lineOf(m.index ?? 0)} ${m[0]}`);
    }
  }
  return found;
}

/** Every argument list a call to `callee` is given, by balanced parentheses. */
function callArgsOf(source: string, callee: string): readonly string[] {
  const out: string[] = [];
  const needle = `${callee}(`;
  let at = source.indexOf(needle);
  while (at !== -1) {
    let depth = 0;
    let i = at + needle.length - 1;
    for (; i < source.length; i++) {
      if (source[i] === '(') depth += 1;
      else if (source[i] === ')' && --depth === 0) break;
    }
    out.push(source.slice(at + needle.length, i));
    at = source.indexOf(needle, i);
  }
  return out;
}
