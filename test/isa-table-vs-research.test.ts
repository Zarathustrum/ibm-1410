// Tier 0 — the isa-table MACHINE check (plan docs/plans/phase-1b.md §5, exit criterion §7.6).
//
// test/isa-table.test.ts checks the columns a machine could already check without reading
// the research file: lengths against oracle/lengths.json, the op sequence against a
// hand-copied array, presence of the prose columns. This file reads
// docs/research/opcodes.md §2 ITSELF and diffs it against src/core/isa/table.ts, so that
// the prose columns — `semantics`, `terminatesOn`, the `dModifiers` maps, the register
// triples — are guarded by the suite rather than by a reader (Phase 1 final review,
// docs/STATUS.md).
//
// THE RULE (plan §5, last paragraph). When this check fails, the fix is in `table.ts`
// unless a MANUAL PAGE says otherwise. Editing opcodes.md §2 to make the check pass is a
// plan violation: a research correction is its own commit, cites the form number and page,
// and is verified against that page — never against the table it is being compared to.
//
// WHAT IS COMPARED (plan §5):
//   exactly — the deduped op-character sequence, `octal`, `addressDouble` (against §1.4's
//     own list sentence), the `indicators` head clause for an allowlist of nine ops,
//     the `dModifiers` key sets, and `regs` / `regsNotTaken`.
//   loosely — `semantics` and `terminatesOn`: normalised, reduced to tokens of four
//     characters or more, Jaccard ≥ 0.9 PLUS exact equality of every token that is a
//     number, an address expression, or one of the op glyphs THIS §2 cell prints in
//     backticks (a single letter is a glyph only when §2 says it is one).
//   not at all — `lengths`. oracle/lengths.json owns that column and
//     test/isa-table.test.ts pins every op against it; §2's Lengths column prints ~18
//     distinct forms that a digit-scraper reads wrong in at least five places.
//   Autocoder, Timing and Cite are prose/provenance columns with no machine-checkable
//     counterpart in `OpForm`.
//
// FAILURE (plan §5). Each verdict names the op and the column and prints the two normalised
// strings plus the symmetric difference of their token sets. A column's verdicts are COLLECTED
// and asserted once, so a drift across several rows reports every row in one run instead of
// stopping at the first — §5's "one expect per op per column" is about the message, not the
// call count.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ALL_OPS,
  REGS_NOT_STATED_7010,
  Y_BQPR2_D_UNVERIFIED,
} from '../src/core/isa/table.js';
import type { IndicatorName, OpForm, RegTriple } from '../src/core/types.js';

// This file lives at <repo>/test/isa-table-vs-research.test.ts.
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OPCODES_MD = readFileSync(join(REPO_ROOT, 'docs/research/opcodes.md'), 'utf8');

// ═══ 1. The slicer, with its 10-cell tripwire ══════════════════════════════
// §2 runs from its own heading to `### 2.1`. Keep the `| ` lines that are neither the
// header nor the separator (the separator, `|---|…`, does not start with `| ` at all).

const SECTION_2_START = '## 2. Complete instruction table';
const SECTION_2_END = '### 2.1';
/** Op char (oct), Autocoder, Lengths, d-modifiers, Semantics, Indicators, Terminates on, Registers, Timing, Cite. */
const CELLS_PER_ROW = 10;

interface Row {
  /** The op character as §2 prints it in column 1. */
  readonly opChar: string;
  /** Column 1's parenthesised octal, as written (`014`). */
  readonly octalText: string;
  readonly cells: readonly string[];
  /** 0-based position among §2's printed rows — the pairing key (§5). */
  readonly printedIndex: number;
}

const COL = {
  opChar: 0,
  autocoder: 1,
  lengths: 2,
  dModifiers: 3,
  semantics: 4,
  indicators: 5,
  terminatesOn: 6,
  regs: 7,
  timing: 8,
  cite: 9,
} as const;

function parseSection2(md: string): Row[] {
  const start = md.indexOf(SECTION_2_START);
  if (start < 0) throw new Error(`opcodes.md: heading "${SECTION_2_START}" not found`);
  const end = md.indexOf(SECTION_2_END, start);
  if (end < 0) throw new Error(`opcodes.md: "${SECTION_2_END}" not found after §2`);

  const rows: Row[] = [];
  for (const line of md.slice(start, end).split('\n')) {
    if (!line.startsWith('| ')) continue; // prose, and the |---|---| separator
    const parts = line.split('|');
    const cells = parts.slice(1, parts.length - 1).map((c) => c.trim());
    if (cells[0] === 'Op char (oct)') continue; // the header
    // THE TRIPWIRE: a future column change must stop this file, not be absorbed by it.
    if (cells.length !== CELLS_PER_ROW) {
      throw new Error(
        `opcodes.md §2 row yielded ${cells.length} cells, expected ${CELLS_PER_ROW}:\n${line}`,
      );
    }
    const head = cells[COL.opChar] ?? '';
    const m = /^`(.+)` \((\d+)\)$/.exec(head);
    if (!m || m[1] === undefined || m[2] === undefined) {
      throw new Error(`opcodes.md §2 column 1 is not \`<op>\` (<octal>): ${JSON.stringify(head)}`);
    }
    rows.push({ opChar: m[1], octalText: m[2], cells, printedIndex: rows.length });
  }
  return rows;
}

let PARSE_ERROR: string | null = null;
let ROWS: readonly Row[] = [];
try {
  ROWS = parseSection2(OPCODES_MD);
} catch (err) {
  PARSE_ERROR = err instanceof Error ? err.message : String(err);
}

// ═══ 2. The four normalisations (plan §5) ══════════════════════════════════

/** 1. Confidence tags — `P`/`Q` score 0.80 on `semantics` without this, and nothing else. */
const CONFIDENCE_TAG = /`?\[(?:verified|likely|observed|unverified)\]`?/g;
function stripConfidenceTags(s: string): string {
  return s.replace(CONFIDENCE_TAG, ' ');
}

/** 2. Unicode — §2 writes `A−LA` with U+2212; `table.ts` writes ASCII `-`. Fold BOTH sides. */
function foldDashes(s: string): string {
  return s.replace(/[−—]/g, '-');
}

function stripMarkup(s: string): string {
  return s.replace(/\*\*/g, '').replace(/`/g, '');
}

/** 3. Duplicate op characters — §2 prints 42 rows for 35 ops. */
function dedupPreservingOrder(chars: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of chars) {
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

// 4. Row → OpForm pairing, keyed on PRINTED ORDER (not on any parsed cell): within an op,
// §2's rows in the order printed pair with that op's forms[] in index order. That is the
// invariant table.ts's own header asserts about itself. The guard is a count assertion.
/** §2 prints ONE row; `table.ts` carries THREE forms, one per printed register result. */
const THREE_WAY_OPS: readonly string[] = [',', '⌑'];

interface Pair {
  readonly opChar: string;
  readonly row: Row;
  readonly form: OpForm;
  readonly formIndex: number;
}

function rowsByOp(rows: readonly Row[]): Map<string, Row[]> {
  const byOp = new Map<string, Row[]>();
  for (const row of rows) {
    const list = byOp.get(row.opChar);
    if (list) list.push(row);
    else byOp.set(row.opChar, [row]);
  }
  return byOp;
}

const ROWS_BY_OP = rowsByOp(ROWS);

/** Pairs for every column except `regs` on the two three-way ops: their row takes forms[0]. */
const PAIRS: readonly Pair[] = ALL_OPS.flatMap((entry) => {
  const rows = ROWS_BY_OP.get(entry.opChar) ?? [];
  return rows.flatMap((row, i) => {
    const form = entry.forms[i];
    return form ? [{ opChar: entry.opChar, row, form, formIndex: i }] : [];
  });
});

/** The pairs a one-cell-to-one-form comparison is meaningful for. */
const ONE_TO_ONE: readonly Pair[] = PAIRS.filter((p) => !THREE_WAY_OPS.includes(p.opChar));

// ═══ 3. Loose comparison — `semantics` and `terminatesOn` ══════════════════

const JACCARD_FLOOR = 0.9;
const MIN_TOKEN_LENGTH = 4;

/** §-references and parenthetical see-alsos: provenance, not statements about the machine. */
function stripSectionRefs(s: string): string {
  return s
    .replace(/\((?:see\s+)?§[^()]*\)/gi, ' ')
    .replace(/\(see[^()]*\)/gi, ' ')
    .replace(/see\s+§\s?[\w.]+/gi, ' ')
    .replace(/§\s?[\w.]+/g, ' ');
}

function normaliseProse(s: string): string {
  return stripSectionRefs(stripMarkup(foldDashes(stripConfidenceTags(s))))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Punctuation collapsed to whitespace — `+` and `-` survive so `A-LA` stays one token. */
function tokenise(normalised: string): string[] {
  return normalised
    .replace(/[^a-z0-9+-]+/g, ' ')
    .split(' ')
    .map((t) => t.replace(/^[+-]+|[+-]+$/g, ''))
    .filter((t) => t.length > 0);
}

/** The Figure 8 symbol set (opcodes.md §1.3) as `RegExpr` spells it. */
const FIGURE_8: ReadonlySet<string> = new Set<string>([
  'NSI', 'NSIB', 'BI', 'Ap', 'Bp', 'A', 'B', 'B+LB+1', 'Ap-1', 'Bp-1',
  ...['A', 'B'].flatMap((r) => ['+', '-'].flatMap((s) => ['1', 'LA', 'LB', 'LW'].map((t) => `${r}${s}${t}`))),
]);
const FIGURE_8_LOWER: ReadonlySet<string> = new Set([...FIGURE_8].map((s) => s.toLowerCase()));

/**
 * The row's single-character hard tokens: exactly the glyphs §2 prints BACKTICKED in THIS cell,
 * read off the markdown before `stripMarkup` removes the backticks. A blanket "every op
 * character" rule cannot be used, because most op characters are also English words or letters —
 * `A` and `B` are in the Figure 8 set, `a` is an article — so adding the word "a" to a semantics
 * clause would red-light the check at jaccard 1.000, against §5's promise that "an editor may
 * reword a clause, split a sentence or fix a typo without breaking the build". Backticks are how
 * §2 says "this is a glyph, not a word", and that is the whole vocabulary.
 */
function opGlyphsOf(mdCell: string): ReadonlySet<string> {
  const out = new Set<string>();
  for (const m of mdCell.matchAll(/`([^`]+)`/g)) {
    for (const g of (m[1] ?? '').trim().split(/\s+/)) {
      if ([...g].length === 1) out.add(g.toLowerCase());
    }
  }
  return out;
}

/**
 * A token no rewording may move: a number, an address expression (`A-LA`, `B+1`, `bbb00`) or one
 * of this cell's backticked op glyphs. Jaccard headroom is for prose, never for these. The
 * multi-character rules are unconditional; only the single-character one consults `opGlyphs`,
 * which is why the bare `A` / `B` of the Figure 8 set are reachable through it alone.
 */
function isHardToken(t: string, opGlyphs: ReadonlySet<string>): boolean {
  if (/^\d+$/.test(t)) return true;
  if (/^bbb00(?:-1)?$/.test(t)) return true;
  if (t.length === 1) return opGlyphs.has(t);
  return FIGURE_8_LOWER.has(t);
}

interface LooseResult {
  readonly ok: boolean;
  readonly jaccard: number;
  readonly mdNorm: string;
  readonly tsNorm: string;
  readonly onlyMd: string[];
  readonly onlyTs: string[];
  readonly hardMoved: string[];
}

function compareLoose(mdCell: string, tsValue: string): LooseResult {
  const mdNorm = normaliseProse(mdCell);
  const tsNorm = normaliseProse(tsValue);
  const mdAll = tokenise(mdNorm);
  const tsAll = tokenise(tsNorm);

  const mdSet = new Set(mdAll.filter((t) => t.length >= MIN_TOKEN_LENGTH));
  const tsSet = new Set(tsAll.filter((t) => t.length >= MIN_TOKEN_LENGTH));
  const onlyMd = [...mdSet].filter((t) => !tsSet.has(t));
  const onlyTs = [...tsSet].filter((t) => !mdSet.has(t));
  const union = new Set([...mdSet, ...tsSet]).size;
  const intersection = union - onlyMd.length - onlyTs.length;
  const jaccard = union === 0 ? 1 : intersection / union;

  // Derived from the RAW cell — `normaliseProse` has already thrown the backticks away.
  const opGlyphs = opGlyphsOf(mdCell);
  const mdHard = new Set(mdAll.filter((t) => isHardToken(t, opGlyphs)));
  const tsHard = new Set(tsAll.filter((t) => isHardToken(t, opGlyphs)));
  const hardMoved = [
    ...[...mdHard].filter((t) => !tsHard.has(t)).map((t) => `§2:${t}`),
    ...[...tsHard].filter((t) => !mdHard.has(t)).map((t) => `ts:${t}`),
  ];

  return {
    ok: jaccard >= JACCARD_FLOOR && hardMoved.length === 0,
    jaccard, mdNorm, tsNorm, onlyMd, onlyTs, hardMoved,
  };
}

/** The failure printer: the two normalised strings and the words that actually moved. */
function looseVerdict(opChar: string, column: string, mdCell: string, tsValue: string): string {
  const r = compareLoose(mdCell, tsValue);
  if (r.ok) return 'ok';
  return [
    `${opChar} ${column}: jaccard ${r.jaccard.toFixed(3)} (floor ${JACCARD_FLOOR})`,
    `  §2 : ${r.mdNorm}`,
    `  ts : ${r.tsNorm}`,
    `  only in §2 : ${r.onlyMd.join(' ') || '(none)'}`,
    `  only in ts : ${r.onlyTs.join(' ') || '(none)'}`,
    ...(r.hardMoved.length > 0 ? [`  hard tokens moved : ${r.hardMoved.join(' ')}`] : []),
  ].join('\n');
}

// ═══ 4. Indicators — head clause only, for an allowlist of nine ops ════════
// Several §2 cells name an indicator in order to NEGATE it, so a map over the whole cell
// is wrong on exactly the two ops 1b is promoting (`@` and `%`). Split at the first ` — `
// and map only the head clause.

const INDICATOR_ALLOWLIST: readonly string[] = ['A', 'S', '?', '!', '@', '%', 'T', 'C', 'B'];
/** `J`'s conditional row names no latch to map — see the J exemption case below. */
const INDICATOR_EXEMPT: readonly string[] = ['J'];

const INDICATOR_NAMES: Readonly<Record<string, IndicatorName>> = {
  'arithmetic overflow': 'arithOverflow',
  'zero balance': 'zeroBalance',
  'divide overflow': 'divideOverflow',
  high: 'compareHigh',
  equal: 'compareEqual',
  low: 'compareLow',
  unequal: 'compareUnequal',
};

function indicatorsFromCell(cell: string): IndicatorName[] {
  const plain = stripMarkup(stripConfidenceTags(cell));
  const head = plain.split(/\s[—–-]\s/)[0] ?? '';
  const clause = head
    .replace(/\([^()]*\)/g, ' ') // C's "high (B>A)", B's "(shared with Compare…)"
    .split(',')[0] // T's "…unequal, from the last argument comparison"
    ?.replace(/^\s*sets\s+/i, '')
    .trim()
    .toLowerCase() ?? '';
  if (clause === 'none' || clause === '') return [];
  const out: IndicatorName[] = [];
  for (const part of clause.split(/[;/]/)) {
    const name = part.trim().replace(/\s+only$/, '');
    if (name === '') continue;
    const mapped = INDICATOR_NAMES[name];
    if (mapped === undefined) throw new Error(`unmappable indicator clause ${JSON.stringify(name)}`);
    out.push(mapped);
  }
  return out;
}

/** Compared as a SET, so reordering a list in either file is a reword, not a build break. */
function indicatorVerdict(opChar: string, cell: string, actual: readonly IndicatorName[]): string {
  let expected: IndicatorName[];
  try {
    expected = indicatorsFromCell(cell);
  } catch (err) {
    return `${opChar} indicators: ${err instanceof Error ? err.message : String(err)}\n  §2 : ${cell}`;
  }
  const want = [...new Set(expected)].sort();
  const got = [...new Set(actual)].sort();
  if (want.join(' ') === got.join(' ')) return 'ok';
  return [
    `${opChar} indicators: head clause and table.ts disagree`,
    `  §2 : ${cell}`,
    `  §2 head clause → ${want.join(' ') || '(none)'}`,
    `  ts             → ${got.join(' ') || '(none)'}`,
  ].join('\n');
}

// ═══ 5. dModifiers — key sets, four cells exempt because they point elsewhere ══

type DModsShape = 'none' | 'any' | 'bitmask' | readonly string[];

/** Cross-references, not lists: `2` and `F` ("see §6 carriage table"), `J` row 2. */
const DMODS_EXEMPT: ReadonlySet<string> = new Set(['2|0', 'F|0', 'J|1']);
/**
 * `Y`'s cell prints `‡` while `Y_DMODS` deliberately omits it: opcodes.md §9.1 says
 * BQPR2's d-character "is not safely determined" (Y_BQPR2_D_UNVERIFIED). Compare the
 * cell's glyphs MINUS `‡`.
 */
const Y_UNVERIFIED_GLYPH = '‡';

function dModsFromCell(cell: string): DModsShape {
  const plain = stripMarkup(stripConfidenceTags(cell)).trim();
  const bare = cell.replace(/\*\*/g, '').trim();
  const lower = plain.toLowerCase();
  if (lower === 'none' || bare === '—') return 'none';
  if (lower === 'bit mask' || lower.startsWith('bit-coded')) return 'bitmask';
  if (lower === 'ignored' || lower === 'any character' || lower.startsWith('all 64 valid')) return 'any';
  if (lower === 'blank') return [' '];
  const glyphs = [...cell.matchAll(/`([^`]+)`/g)].flatMap((m) =>
    (m[1] ?? '').trim().split(/\s+/).filter((g) => g.length > 0),
  );
  // `T`'s trailing "blank=search to end of table" supplies its ' ' key.
  if (/blank\s*=/.test(lower)) glyphs.push(' ');
  return glyphs.filter((g) => g !== Y_UNVERIFIED_GLYPH);
}

function keySetOf(shape: DModsShape | OpForm['dModifiers']): string {
  if (typeof shape === 'string') return shape;
  const keys = Array.isArray(shape) ? [...shape] : Object.keys(shape as Record<string, string>);
  return [...new Set(keys)].sort().map((k) => (k === ' ' ? '␣' : k)).join(' ');
}

function dModsVerdict(opChar: string, cell: string, actual: OpForm['dModifiers']): string {
  const want = keySetOf(dModsFromCell(cell));
  const got = keySetOf(actual);
  if (want === got) return 'ok';
  return [
    `${opChar} dModifiers: key sets disagree`,
    `  §2 : ${cell}`,
    `  §2 keys → ${want}`,
    `  ts keys → ${got}`,
  ].join('\n');
}

// ═══ 6. regs / regsNotTaken — the cell has four shapes, all four on untouched text ══

/** `=` ("BAR forced to 299") and `$` ("—") state no triple: REGS_NOT_STATED_7010. */
const REGS_EXEMPT: readonly string[] = ['=', '$'];

interface RegResult {
  /** `taken`, `not taken`, `2 addr`, `1 addr`, `chained`, or null for a bare triple. */
  readonly label: string | null;
  readonly triple: RegTriple;
}

function toRegExpr(part: string): string {
  const t = part.trim();
  return FIGURE_8.has(t) ? t : 'special';
}

function parseRegsCell(cell: string): RegResult[] {
  let s = stripMarkup(foldDashes(stripConfidenceTags(cell)));
  s = s.replace(/\s*\([^()]*\)\s*$/, ''); // J row 2's "(both A and B registers hold…)"
  const sentence = s.search(/\.\s/); // Y's "…NSIB. Return address = BAR minus six"
  if (sentence >= 0) s = s.slice(0, sentence);
  s = s.replace(/\s*([+-])\s*/g, '$1'); // §2 prints `B + LB + 1`; table.ts writes B+LB+1

  return s.split('·').map((result) => {
    const m = /^\s*([^:/]+):\s*(.*)$/.exec(result);
    const label = m?.[1]?.trim() ?? null;
    const body = (m?.[2] ?? result).trim();
    const parts = body.split('/').map(toRegExpr);
    // "NSI / see §3.2" — IAR plus ONE prose clause covering BOTH address registers.
    const triple: RegTriple =
      parts.length === 2
        ? { iar: parts[0] as RegTriple['iar'], aar: 'special', bar: 'special' }
        : {
            iar: (parts[0] ?? 'special') as RegTriple['iar'],
            aar: (parts[1] ?? 'special') as RegTriple['aar'],
            bar: (parts[2] ?? 'special') as RegTriple['bar'],
          };
    return { label, triple };
  });
}

function showTriple(t: RegTriple | undefined): string {
  return t === undefined ? '(absent)' : `${t.iar} / ${t.aar} / ${t.bar}`;
}

function regsVerdict(
  opChar: string,
  what: string,
  expected: RegTriple,
  actual: RegTriple | undefined,
): string {
  if (actual !== undefined && showTriple(expected) === showTriple(actual)) return 'ok';
  return [
    `${opChar} ${what}: register triples disagree`,
    `  §2 → ${showTriple(expected)}`,
    `  ts → ${showTriple(actual)}`,
  ].join('\n');
}

// ═══ The cases ═════════════════════════════════════════════════════════════

describe('opcodes.md §2 slices into rows a machine can read', () => {
  it('parses without hitting the 10-cell tripwire', () => {
    expect(PARSE_ERROR).toBeNull();
  });

  it('prints 42 rows, every one exactly 10 cells wide', () => {
    expect(ROWS.length).toBe(42);
    for (const row of ROWS) {
      expect(row.cells.length, `${row.opChar} row ${row.printedIndex}`).toBe(CELLS_PER_ROW);
    }
  });

  it('column 1 gives an op character and an octal on every row', () => {
    for (const row of ROWS) {
      expect(row.opChar.length, `row ${row.printedIndex}`).toBeGreaterThan(0);
      expect(row.octalText, `${row.opChar} octal`).toMatch(/^\d{3}$/);
    }
  });
});

describe('the exact columns', () => {
  it('the deduped op sequence is ALL_OPS, in order', () => {
    expect(dedupPreservingOrder(ROWS.map((r) => r.opChar))).toEqual(ALL_OPS.map((e) => e.opChar));
  });

  it('every row octal matches its OpEntry', () => {
    for (const row of ROWS) {
      const entry = ALL_OPS.find((e) => e.opChar === row.opChar);
      expect(entry, `no OpEntry for ${row.opChar}`).toBeDefined();
      expect(Number.parseInt(row.octalText, 8), `${row.opChar} octal`).toBe(entry?.octal);
    }
  });

  it('addressDouble matches §1.4’s own list sentence', () => {
    // §1.4 prints the set as a sentence of its own, all backtick glyphs, which is what
    // makes it parseable: "`A`, `S`, `?` (ZA), `!` (ZS), `,` (SW), `⌑` (CW), `/` (CS), …".
    const anchor = OPCODES_MD.indexOf('**Address-double op-code set**');
    expect(anchor, '§1.4 address-double paragraph not found').toBeGreaterThan(0);
    const sentence = OPCODES_MD.slice(anchor).split('\n')[1] ?? '';
    expect(sentence.trim().endsWith('`X`.'), `§1.4 list sentence changed shape: ${sentence}`).toBe(true);
    const listed = [...sentence.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? '');
    expect(listed).toEqual(['A', 'S', '?', '!', ',', '⌑', '/', 'J', 'R', 'X']);

    const set = new Set(listed);
    for (const entry of ALL_OPS) {
      expect(entry.addressDouble, `${entry.opChar} addressDouble`).toBe(set.has(entry.opChar));
    }
  });
});

describe('rows pair with OpForms by printed order', () => {
  it('rows-for-op equals forms-for-op, except the two three-way ops', () => {
    for (const entry of ALL_OPS) {
      const rows = ROWS_BY_OP.get(entry.opChar) ?? [];
      expect(rows.length, `${entry.opChar} has no §2 row`).toBeGreaterThan(0);
      if (THREE_WAY_OPS.includes(entry.opChar)) {
        // §2 prints ONE row; table.ts carries THREE forms, one per printed register result
        // (plan §4.2). 42 + 2×2 = 46 accounts for the whole discrepancy.
        expect(rows.length, `${entry.opChar} §2 rows`).toBe(1);
        expect(entry.forms.length, `${entry.opChar} forms`).toBe(3);
        continue;
      }
      expect(entry.forms.length, `${entry.opChar}: §2 rows vs OpForms`).toBe(rows.length);
    }
  });

  it('pairs every §2 row with a form', () => {
    expect(PAIRS.length).toBe(ROWS.length);
    expect(ONE_TO_ONE.length).toBe(ROWS.length - THREE_WAY_OPS.length);
  });
});

describe('indicators — head clause, allowlist of nine', () => {
  it('maps the head clause for A S ? ! @ % T C B', () => {
    const failed: string[] = [];
    for (const pair of PAIRS) {
      if (!INDICATOR_ALLOWLIST.includes(pair.opChar)) continue;
      const cell = pair.row.cells[COL.indicators] ?? '';
      const verdict = indicatorVerdict(pair.opChar, cell, pair.form.indicators);
      if (verdict !== 'ok') failed.push(verdict);
    }
    expect(failed).toEqual([]);
  });

  it('every other op carries no latch — their cells are channel, feature or cross-reference prose', () => {
    for (const pair of PAIRS) {
      if (INDICATOR_ALLOWLIST.includes(pair.opChar) || INDICATOR_EXEMPT.includes(pair.opChar)) continue;
      expect(pair.form.indicators.length, `${pair.opChar} indicators (expected none)`).toBe(0);
    }
  });

  it('`@` and `%` are the rows the head-clause rule was written for', () => {
    // Both cells name an indicator in order to NEGATE it. A map over the WHOLE cell reads
    // the negation as a latch; the head clause is the only reading that matches table.ts.
    for (const [opChar, tail, want] of [
      ['@', 'multiply never sets arithmetic overflow', 'zeroBalance'],
      ['%', 'divide never sets arithmetic overflow or zero balance', 'divideOverflow'],
    ] as const) {
      const row = (ROWS_BY_OP.get(opChar) ?? [])[0];
      const cell = row?.cells[COL.indicators] ?? '';
      expect(cell, `${opChar} indicators cell`).toContain(' — ');
      expect(stripMarkup(cell), `${opChar} negation clause`).toContain(tail);
      expect(indicatorsFromCell(cell), `${opChar} head clause`).toEqual([want]);
      const entry = ALL_OPS.find((e) => e.opChar === opChar);
      expect(entry?.forms[0]?.indicators, `${opChar} table.ts`).toEqual([want]);
    }
  });

  it('`J` is compared on nothing here, and that is deliberate', () => {
    // §2's conditional row says "the overflow indicators are **reset by the test that reads
    // them**" — prose naming no latch to map — while table.ts carries the two overflow
    // latches from §8 and dmods.ts's J_D_TABLE. On the allowlist this check red-lights; on
    // the "no latches" branch it red-lights too, since the length is 2. So: neither.
    const entry = ALL_OPS.find((e) => e.opChar === 'J');
    expect(entry?.forms[1]?.indicators).toEqual(['arithOverflow', 'divideOverflow']);
    expect(INDICATOR_ALLOWLIST).not.toContain('J');
    expect(INDICATOR_EXEMPT).toContain('J');
  });
});

describe('dModifiers — key sets', () => {
  it('matches §2 on every row that lists rather than cross-references', () => {
    const failed: string[] = [];
    for (const pair of PAIRS) {
      if (DMODS_EXEMPT.has(`${pair.opChar}|${pair.formIndex}`)) continue;
      const cell = pair.row.cells[COL.dModifiers] ?? '';
      const verdict = dModsVerdict(pair.opChar, cell, pair.form.dModifiers);
      if (verdict !== 'ok') failed.push(verdict);
    }
    expect(failed).toEqual([]);
  });

  it('the four exempt cells are cross-references, not lists', () => {
    for (const key of DMODS_EXEMPT) {
      const [opChar, idxText] = key.split('|');
      const rows = ROWS_BY_OP.get(opChar ?? '') ?? [];
      const cell = rows[Number(idxText)]?.cells[COL.dModifiers] ?? '';
      expect(cell, `${key} exemption`).toMatch(/see §/);
    }
  });

  it('`Y` is compared minus `‡` — Y_BQPR2_D_UNVERIFIED is why', () => {
    // opcodes.md §9.1: BQPR2's d-character "is not safely determined". A22-0530-1 p.8
    // prints a double dagger, but that typewriter face types the group mark the same way
    // and SimH uses a third character again. Y_DMODS omits it rather than guessing.
    expect(Y_BQPR2_D_UNVERIFIED).toBeNull();
    const cell = (ROWS_BY_OP.get('Y') ?? [])[0]?.cells[COL.dModifiers] ?? '';
    expect(cell).toContain(Y_UNVERIFIED_GLYPH);
    const keys = dModsFromCell(cell);
    expect(Array.isArray(keys) && keys.includes(Y_UNVERIFIED_GLYPH)).toBe(false);
    expect(Array.isArray(keys) ? keys.length : 0).toBe(13);
  });
});

describe('regs / regsNotTaken', () => {
  it('matches §2 on every one-to-one row', () => {
    const failed: string[] = [];
    for (const pair of ONE_TO_ONE) {
      if (REGS_EXEMPT.includes(pair.opChar)) continue;
      const cell = pair.row.cells[COL.regs] ?? '';
      const results = parseRegsCell(cell);
      const taken = results.find((r) => r.label === 'taken') ?? results[0];
      if (!taken) {
        failed.push(`${pair.opChar} regs: cell parsed to nothing\n  §2 : ${cell}`);
        continue;
      }
      const verdict = regsVerdict(pair.opChar, 'regs', taken.triple, pair.form.regs);
      if (verdict !== 'ok') failed.push(verdict);
      const notTaken = results.find((r) => r.label === 'not taken');
      if (notTaken) {
        const v = regsVerdict(pair.opChar, 'regsNotTaken', notTaken.triple, pair.form.regsNotTaken);
        if (v !== 'ok') failed.push(v);
      }
    }
    expect(failed).toEqual([]);
  });

  it('`,` and `⌑` split their one cell three ways, onto forms 0..2 in printed order', () => {
    for (const opChar of THREE_WAY_OPS) {
      const cell = (ROWS_BY_OP.get(opChar) ?? [])[0]?.cells[COL.regs] ?? '';
      const results = parseRegsCell(cell);
      expect(results.map((r) => r.label), `${opChar} regs labels`).toEqual(['2 addr', '1 addr', 'chained']);
      const entry = ALL_OPS.find((e) => e.opChar === opChar);
      results.forEach((result, i) => {
        expect(
          regsVerdict(opChar, `regs[${i}]`, result.triple, entry?.forms[i]?.regs),
          `${opChar} regs[${i}]`,
        ).toBe('ok');
      });
    }
  });

  it('`Y` states a taken triple and no not-taken one, and nothing is asserted about it', () => {
    const cell = (ROWS_BY_OP.get('Y') ?? [])[0]?.cells[COL.regs] ?? '';
    const results = parseRegsCell(cell);
    expect(results.map((r) => r.label)).toEqual(['taken']);
    expect(ALL_OPS.find((e) => e.opChar === 'Y')?.forms[0]?.regsNotTaken).toBeUndefined();
  });

  it('`=` and `$` state no triple at all — REGS_NOT_STATED_7010 is why', () => {
    // Comparing an `// OPEN:` fallback (open-questions.md, opcodes row) to prose that
    // states nothing would assert the guess.
    for (const opChar of REGS_EXEMPT) {
      const cell = (ROWS_BY_OP.get(opChar) ?? [])[0]?.cells[COL.regs] ?? '';
      expect(cell, `${opChar} regs cell`).not.toMatch(/\/.*\//);
      expect(ALL_OPS.find((e) => e.opChar === opChar)?.forms[0]?.regs, `${opChar} regs`).toBe(
        REGS_NOT_STATED_7010,
      );
    }
  });

  it('a part that is not a Figure 8 expression is `special`', () => {
    // T's "address of the function immediately left of…", %'s "tens position of the
    // quotient field", E's "varies — see §7.3", /'s "bbb00−1" — and D's "NSI / see §3.2",
    // which is IAR plus one prose clause covering BOTH address registers.
    for (const [opChar, expected] of [
      ['T', 'NSI / A-LW / special'],
      ['%', 'NSI / A-LA / special'],
      ['E', 'NSI / A-LA / special'],
      ['/', 'NSI / B / special'],
      ['D', 'NSI / special / special'],
    ] as const) {
      const cell = (ROWS_BY_OP.get(opChar) ?? [])[0]?.cells[COL.regs] ?? '';
      const parsed = parseRegsCell(cell)[0]?.triple;
      expect(parsed && showTriple(parsed), `${opChar} §2 regs`).toBe(expected);
      const form = ALL_OPS.find((e) => e.opChar === opChar)?.forms[0];
      expect(form && showTriple(form.regs), `${opChar} table.ts regs`).toBe(expected);
    }
  });
});

describe('semantics and terminatesOn — loose, with an exact-token floor', () => {
  it('semantics scores ≥ 0.9 with no hard token moved', () => {
    const failed: string[] = [];
    for (const pair of ONE_TO_ONE) {
      // `,` and `⌑` are excluded by ONE_TO_ONE: §2's one cell is deliberately split across
      // three form strings, and a one-cell-to-three-strings split has no meaningful token
      // similarity (plan §5: `⌑` 0.923, `,` 0.545).
      const cell = pair.row.cells[COL.semantics] ?? '';
      const verdict = looseVerdict(pair.opChar, 'semantics', cell, pair.form.semantics);
      if (verdict !== 'ok') failed.push(verdict);
    }
    expect(failed).toEqual([]);
  });

  it('terminatesOn scores ≥ 0.9 with no hard token moved, three-way ops included', () => {
    const failed: string[] = [];
    for (const pair of PAIRS) {
      const cell = pair.row.cells[COL.terminatesOn] ?? '';
      const verdict = looseVerdict(pair.opChar, 'terminatesOn', cell, pair.form.terminatesOn);
      if (verdict !== 'ok') failed.push(verdict);
    }
    expect(failed).toEqual([]);
    // The three-way ops print one terminator that holds for all three forms.
    for (const opChar of THREE_WAY_OPS) {
      const entry = ALL_OPS.find((e) => e.opChar === opChar);
      const all = new Set(entry?.forms.map((f) => f.terminatesOn));
      expect(all.size, `${opChar} terminatesOn across forms`).toBe(1);
    }
  });
});

describe('the numbers plan §5 measured against main', () => {
  it('42 rows, 10 cells, 35 ops, 46 forms', () => {
    expect(ROWS.length).toBe(42);
    expect(new Set(ROWS.map((r) => r.cells.length))).toEqual(new Set([CELLS_PER_ROW]));
    expect(dedupPreservingOrder(ROWS.map((r) => r.opChar)).length).toBe(35);
    expect(ALL_OPS.length).toBe(35);
    expect(ALL_OPS.reduce((n, e) => n + e.forms.length, 0)).toBe(46);
    expect(ROWS.length + 2 * THREE_WAY_OPS.length).toBe(46);
  });

  it('the `,` / `⌑` three-way splits are NSI / A-1 / B-1, NSI / A-1 / A-1, NSI / Ap-1 / Bp-1', () => {
    for (const opChar of THREE_WAY_OPS) {
      const cell = (ROWS_BY_OP.get(opChar) ?? [])[0]?.cells[COL.regs] ?? '';
      expect(parseRegsCell(cell).map((r) => showTriple(r.triple)), `${opChar} §2 splits`).toEqual([
        'NSI / A-1 / B-1',
        'NSI / A-1 / A-1',
        'NSI / Ap-1 / Bp-1',
      ]);
      const forms = ALL_OPS.find((e) => e.opChar === opChar)?.forms ?? [];
      expect(forms.map((f) => showTriple(f.regs)), `${opChar} table.ts`).toEqual([
        'NSI / A-1 / B-1',
        'NSI / A-1 / A-1',
        'NSI / Ap-1 / Bp-1',
      ]);
      expect(forms.map((f) => [...f.lengths]), `${opChar} printed order`).toEqual([[11], [6], [1]]);
    }
  });

  it('every one-to-one pair scores 1.000 on both loose columns', () => {
    // Plan §5: nothing compared is nearer the floor than 1.000 — 0.9 is headroom for
    // future rewording, not a fit to any delta on main. If a pair drops below 1.000 the
    // main check above still passes; this case is what pins the plan's number, and the
    // resolution is to report the drift, never to lower the bar.
    const below: string[] = [];
    for (const pair of ONE_TO_ONE) {
      for (const [column, cell, value] of [
        ['semantics', pair.row.cells[COL.semantics] ?? '', pair.form.semantics],
        ['terminatesOn', pair.row.cells[COL.terminatesOn] ?? '', pair.form.terminatesOn],
      ] as const) {
        const r = compareLoose(cell, value);
        if (r.jaccard < 1) {
          below.push(`${pair.opChar} ${column} ${r.jaccard.toFixed(3)} — §2 only: ${r.onlyMd.join(' ')} / ts only: ${r.onlyTs.join(' ')}`);
        }
      }
    }
    expect(below).toEqual([]);
  });

  it('the nine-op indicator allowlist is exactly A S ? ! @ % T C B', () => {
    expect([...INDICATOR_ALLOWLIST].sort().join(' ')).toBe(['A', 'S', '?', '!', '@', '%', 'T', 'C', 'B'].sort().join(' '));
    expect(INDICATOR_ALLOWLIST.length).toBe(9);
  });
});

// ═══ Liveness — plan §7 exit criterion 6 ═══════════════════════════════════
// "demonstrably live by a PERMANENT test, not by a reviewer's scratch copy": feed the
// comparator a hard-coded perturbed pair and assert it FAILS, naming the op and printing
// the moved tokens. These inputs are literals on purpose — they must keep failing even if
// §2 and table.ts are both edited.

describe('the comparator is live', () => {
  const REAL_SEMANTICS =
    '**Multiply.** A = multiplicand at its **units** position. B = product field at its ' +
    '**units** position, with the multiplier image pre-placed in the **high-order** positions of B';
  const PERTURBED_SEMANTICS =
    'Multiply. A = multiplicand at its units position. B = product field at its units ' +
    'position, with the multiplier image pre-placed in the LOW-order positions of B';

  it('catches one word changed in a semantics string', () => {
    expect(looseVerdict('@', 'semantics', REAL_SEMANTICS, REAL_SEMANTICS)).toBe('ok');
    const verdict = looseVerdict('@', 'semantics', REAL_SEMANTICS, PERTURBED_SEMANTICS);
    expect(verdict).not.toBe('ok');
    expect(verdict).toContain('@ semantics'); // names the op and the column
    expect(verdict).toContain('high-order'); // the words that moved, both directions
    expect(verdict).toContain('low-order');
    expect(verdict).toContain('§2 :'); // both normalised strings are printed
    expect(verdict).toContain('ts :');
  });

  it('catches a hard token moved even when the prose still scores 1.000', () => {
    // `L`'s terminator with one op character changed — and BACKTICKED in the §2 side, which is
    // what makes it a hard token at all now. Every token of four characters or more is
    // untouched, so Jaccard alone would call this identical: the exact-token rule is the whole
    // reason a reworded clause is allowed and a changed glyph is not.
    const real =
      'group-mark-with-word-mark in core; tape read also on inter-record gap; ' +
      '`$`/`X` only at the highest-numbered core position';
    const oneGlyph = real.replace('`X`', '`W`');
    const r = compareLoose(real, oneGlyph);
    expect(r.jaccard).toBe(1);
    expect(r.ok).toBe(false);
    const verdict = looseVerdict('L', 'terminatesOn', real, oneGlyph);
    expect(verdict).toContain('hard tokens moved');
    // The vocabulary is §2's own backticked glyphs, so the report reads in §2's direction: the
    // glyph the research prints is the one table.ts no longer carries. That is the direction
    // this file's governing rule runs in — "the fix is in `table.ts` unless a MANUAL PAGE says
    // otherwise" — and `W`, a glyph §2 does not print here, is not tracked as a hard token.
    expect(verdict).toContain('§2:x');
    expect(r.hardMoved).toEqual(['§2:x']);
  });

  it('catches one register expression changed in a regs triple', () => {
    const real = '2 addr: NSI / A−1 / B−1 · 1 addr: NSI / A−1 / A−1 · chained: NSI / Ap−1 / Bp−1';
    const perturbed = real.replace('1 addr: NSI / A−1 / A−1', '1 addr: NSI / A−1 / B−1');
    const good = parseRegsCell(real);
    const bad = parseRegsCell(perturbed);
    const truth = good[1]?.triple ?? { iar: 'NSI', aar: 'special', bar: 'special' };
    const moved = bad[1]?.triple;
    expect(regsVerdict(',', 'regs[1]', truth, good[1]?.triple)).toBe('ok');
    const verdict = regsVerdict(',', 'regs[1]', truth, moved);
    expect(verdict).not.toBe('ok');
    expect(verdict).toContain(', regs[1]');
    expect(verdict).toContain('NSI / A-1 / A-1'); // §2's own
    expect(verdict).toContain('NSI / A-1 / B-1'); // the perturbation
  });

  it('catches one indicator added', () => {
    const real = '**zero balance only** — multiply never sets arithmetic overflow';
    expect(indicatorVerdict('@', real, ['zeroBalance'])).toBe('ok');
    const verdict = indicatorVerdict('@', real, ['zeroBalance', 'arithOverflow']);
    expect(verdict).not.toBe('ok');
    expect(verdict).toContain('@ indicators');
    expect(verdict).toContain('arithOverflow');
  });

  it('catches a d-modifier key added or dropped', () => {
    const real = '`1 2 3 B K S C L T` — see §6';
    expect(dModsVerdict('V', real, { '1': '', '2': '', '3': '', B: '', K: '', S: '', C: '', L: '', T: '' })).toBe('ok');
    const verdict = dModsVerdict('V', real, { '1': '', '2': '', '3': '', B: '', K: '', S: '', C: '', L: '' });
    expect(verdict).not.toBe('ok');
    expect(verdict).toContain('V dModifiers');
    expect(verdict).toContain('§2 keys');
  });
});
