// Tier 0 + tier 1 — op `D` Move / Scan, all 64 d-characters (plan §5 Wave 5, §7).
// opcodes.md §3.1-§3.3 (A22-0526-3 pp.25-27, Figures 19, 20, 21, 22); architecture.md §4.8.
//
// The 64 cases are GENERATED from `oracle/dchar-matrix.json`, never hand-written 64 times, and
// the expected result is computed from that fixture's PROSE — `portion: 'zone+WM'`,
// `terminatesOn: 'A-field GM-WM'`, `direction: 'L→R'` — while `src/core/move.ts` works from
// `d & 0x07` and `d & 0x38`. The two paths meet only at the answer, so neither the research
// table nor the bit arithmetic can drift without this failing (architecture.md §4.8, §8 tier 0).
//
// ─── THE FIXED LAYOUT, AND WHY EACH POSITION IS WHAT IT IS ─────────────────────────────────
// One A field and one B field serve all 64 d-characters. Both are six positions; the A- and
// B-addresses are the RIGHTMOST positions for a right-to-left d and the LEFTMOST for a
// left-to-right one (opcodes.md §3.1), so index i of A always pairs with index i of B.
//
//   i          0      1      2      3        4      5
//   A 5000+i   2      S      ‡      ⧧(wm)    A(wm)  4
//   B 6000+i   J      9      K(wm)  0        7      N
//
//  · At every index the A and B characters differ in their ZONE bits AND in their NUMERIC bits,
//    so a zone-only move, a numeric-only move and a whole-character move all leave visibly
//    different results — a layout where they agreed would pass three different d-characters
//    with the same core image.
//  · `‡` at index 2 and `⧧`-with-word-mark at index 3 give the three left-to-right terminators
//    something to sense; the group mark carries the word mark that `MRnG` requires and `MRnR`
//    ignores.
//  · The word marks are placed so that every terminator stops at a DIFFERENT count, in both
//    directions: 1, 2, 3 and 4 positions all occur, and the A word mark and the B word mark are
//    never at the same index — otherwise "first word mark in either field" would be
//    indistinguishable from either single-field rule.
//  · Index 2 of B is word-marked and index 2 of A is not, so any d carrying the word-mark
//    portion CLEARS a B word mark there — eight of the 64 cases hit it. THOSE EIGHT ARE NOT
//    VERIFIED. §3.1 demonstrates the word-mark portion SETTING a mark (`insttest.cor` 02836) and
//    nowhere demonstrates it clearing one; "replaces the corresponding portion" is equally
//    satisfiable by an OR. `combine()` below encodes the same copy reading `src/core/move.ts`
//    does, so on this one point the two paths share an assumption rather than checking each
//    other — it is the fallback of `MOVE_WORD_MARK_PORTION_IS_A_COPY` (open-questions.md,
//    opcodes row), pinned here so a future correction breaks a test instead of passing silently.

import { describe, it, expect } from 'vitest';

import { bcdOfGlyph, glyphOf, parity, SUBSTITUTE_BLANK } from '../src/core/bcd.js';
import { CYCLE_US } from '../src/core/cycles.js';
import { GROUP_MARK_BCD, RECORD_MARK_BCD } from '../src/core/move.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { BCD6, C, WM, ZA, ZB, type Addr, type Cell } from '../src/core/types.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MATRIX = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle', 'dchar-matrix.json'), 'utf8'),
) as {
  dCharacters: {
    dec: number; glyph: string | null; mnemonic: string;
    direction: string; portion: string; terminatesOn: string;
  }[];
  figure20RegisterEffects: {
    terminatingControl: string; direction: string; iar: string; aar: string; bar: string;
  }[];
};

const SIZE = 20_000;
const PROG = 100;
const A_BASE = 5000;
const B_BASE = 6000;
const FIELD = 6;
const ZONE_BITS = ZB | ZA;
const NUMERIC_BITS = 0x0f;

/** `[glyph, wordMark]` per position, left to right. See the layout note in the header. */
const A_FIELD: readonly (readonly [string, boolean])[] = [
  ['2', false], ['S', false], ['‡', false], ['⧧', true], ['A', true], ['4', false],
];
const B_FIELD: readonly (readonly [string, boolean])[] = [
  ['J', false], ['9', false], ['K', true], ['0', false], ['7', false], ['N', false],
];

const bcd = (glyph: string): number => {
  const code = bcdOfGlyph(glyph);
  if (code === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return code;
};

/** The cell a position starts with, so an expectation can be written without touching core. */
const cellOf = ([glyph, wm]: readonly [string, boolean]): Cell =>
  (wm ? WM : 0) | parity(bcd(glyph), wm) | bcd(glyph);

function layout(m: Machine): void {
  A_FIELD.forEach((p, i) => m.storage.setChar(A_BASE + i, bcd(p[0]), p[1]));
  B_FIELD.forEach((p, i) => m.storage.setChar(B_BASE + i, bcd(p[0]), p[1]));
}

const addr5 = (a: Addr): string => String(a).padStart(5, '0');

/** Writes glyphs from `at`, word-marking the first, and word-marks the position after the last. */
function program(m: Machine, at: Addr, text: string): void {
  [...text].forEach((glyph, i) => m.storage.setChar(at + i, bcd(glyph), i === 0));
  m.storage.setWm(at + text.length, true);
}

// ─── The independent expectation, written from opcodes.md §3.2's own words ─────────────────

/** Figure 19's eight terminators, as the fixture's `terminatesOn` column spells them. */
function stops(terminatesOn: string, a: Cell, b: Cell): boolean {
  const aWm = (a & WM) !== 0;
  const bWm = (b & WM) !== 0;
  switch (terminatesOn) {
    case 'after one position': return true;
    case 'A-field word mark': return aWm;
    case 'B-field word mark': return bWm;
    case 'first WM in either field': return aWm || bWm;
    case 'A-field record mark': return (a & BCD6) === RECORD_MARK_BCD;
    case 'A-field GM-WM': return (a & BCD6) === GROUP_MARK_BCD && aWm;
    case 'A-field RM or GM-WM':
      return (a & BCD6) === RECORD_MARK_BCD || ((a & BCD6) === GROUP_MARK_BCD && aWm);
    default: throw new Error(`unknown terminator "${terminatesOn}"`);
  }
}

/**
 * Figure 19's eight portions, as the fixture's `portion` column spells them. `null` = scan.
 * The word-mark column is a COPY here, matching `MOVE_WORD_MARK_PORTION_IS_A_COPY` — the
 * clear half of that reading is the fallback, not verified (see the layout note above).
 */
function combine(portion: string, a: Cell, b: Cell): { bcd6: number; wm: boolean } | null {
  const fromA = { zone: false, numeric: false, wm: false };
  switch (portion) {
    case 'scan': return null;
    case 'numeric': fromA.numeric = true; break;
    case 'zone': fromA.zone = true; break;
    case 'zone+numeric': fromA.zone = fromA.numeric = true; break;
    case 'word mark': fromA.wm = true; break;
    case 'numeric+WM': fromA.numeric = fromA.wm = true; break;
    case 'zone+WM': fromA.zone = fromA.wm = true; break;
    case 'all': fromA.zone = fromA.numeric = fromA.wm = true; break;
    default: throw new Error(`unknown portion "${portion}"`);
  }
  return {
    bcd6: ((fromA.zone ? a : b) & ZONE_BITS) | ((fromA.numeric ? a : b) & NUMERIC_BITS),
    wm: (((fromA.wm ? a : b) & WM)) !== 0,
  };
}

/**
 * `terminatesOn` (Figure 19, §3.2) named as `terminatingControl` (Figure 20, §3.3). The two
 * figures word the same eight controls differently; this is the only place the two spellings
 * meet, and the test below asserts the map is total in both directions.
 */
const FIGURE_20_NAME: Readonly<Record<string, string>> = {
  'after one position': 'After one storage position',
  'A-field word mark': 'A-field word mark',
  'B-field word mark': 'B-field word mark',
  'first WM in either field': 'First word mark in either field',
  'A-field record mark': 'A-field record mark',
  'A-field GM-WM': 'A-field group-mark-with-word-mark',
  'A-field RM or GM-WM': 'A-field record mark or GM-WM',
};

/** `A+LW`, `B-LB`, `A-1` … evaluated here rather than through `isa/regs.ts`. */
function evalFigure20(expr: string, base: number, length: number): number {
  const m = /^([AB])([+-])(1|LA|LB|LW)$/.exec(expr);
  if (!m) throw new Error(`unparsed Figure 20 expression "${expr}"`);
  const term = m[3] === '1' ? 1 : length;
  return m[2] === '+' ? base + term : base - term;
}

interface Expectation {
  positions: number;
  cells: Cell[];        // the whole B field, index 0..5, after the operation
  aar: number;
  bar: number;
}

function expected(row: (typeof MATRIX.dCharacters)[number]): Expectation {
  const leftToRight = row.direction === 'L→R';
  const step = leftToRight ? 1 : -1;
  const aAddr = leftToRight ? A_BASE : A_BASE + FIELD - 1;
  const bAddr = leftToRight ? B_BASE : B_BASE + FIELD - 1;

  const cells = B_FIELD.map(cellOf);
  const aCells = A_FIELD.map(cellOf);
  let i = leftToRight ? 0 : FIELD - 1;
  let positions = 0;

  for (;;) {
    const a = aCells[i];
    const b = cells[i];
    if (a === undefined || b === undefined) {
      throw new Error(`d=${row.dec} (${row.mnemonic}) ran off the six-position layout`);
    }
    const last = stops(row.terminatesOn, a, b);
    const write = combine(row.portion, a, b);
    if (write) cells[i] = (write.wm ? WM : 0) | parity(write.bcd6, write.wm) | write.bcd6;
    positions++;
    if (last) break;
    i += step;
  }

  const name = FIGURE_20_NAME[row.terminatesOn];
  const effect = MATRIX.figure20RegisterEffects.find(
    (r) => r.terminatingControl === name && r.direction === row.direction,
  );
  if (!effect) throw new Error(`no Figure 20 row for "${name}" / ${row.direction}`);
  return {
    positions,
    cells,
    aar: evalFigure20(effect.aar, aAddr, positions),
    bar: evalFigure20(effect.bar, bAddr, positions),
  };
}

// ─── Running one `D` ───────────────────────────────────────────────────────────────────────

/** `D aaaaa bbbbb d` at length 12, addresses per the d-character's own direction. */
function runMatrix(dec: number, direction: string): Machine {
  const leftToRight = direction === 'L→R';
  const a = leftToRight ? A_BASE : A_BASE + FIELD - 1;
  const b = leftToRight ? B_BASE : B_BASE + FIELD - 1;
  const m = createMachine({ size: SIZE });
  layout(m);
  program(m, PROG, `D${addr5(a)}${addr5(b)}${glyphOf(dec)}`);
  m.addressSet(PROG);
  const stop = m.step();
  expect(stop, `d=${dec} stopped: ${String(stop)}`).toBeUndefined();
  return m;
}

const bField = (m: Machine): Cell[] =>
  Array.from({ length: FIELD }, (_, i) => m.storage.read(B_BASE + i));

// ═══ The generated matrix ══════════════════════════════════════════════════════════════════

describe('op D — all 64 d-characters, generated from oracle/dchar-matrix.json', () => {
  it('the terminator naming between Figure 19 and Figure 20 is a total bijection', () => {
    const fromMatrix = new Set(MATRIX.dCharacters.map((r) => r.terminatesOn));
    expect([...fromMatrix].sort()).toEqual(Object.keys(FIGURE_20_NAME).sort());
    const named = new Set(Object.values(FIGURE_20_NAME));
    const printed = new Set(MATRIX.figure20RegisterEffects.map((r) => r.terminatingControl));
    expect([...named].sort()).toEqual([...printed].sort());
  });

  for (const row of MATRIX.dCharacters) {
    const label = `d=${row.dec} ${row.mnemonic} (${row.direction}, ${row.portion}, `
      + `stop: ${row.terminatesOn})`;

    it(label, () => {
      const want = expected(row);
      const m = runMatrix(row.dec, row.direction);

      // Every byte of the B field, C bit included — a partial move that got parity wrong shows
      // up here and nowhere else (research/architecture.md §2, A22-0526-3 p.5).
      expect(bField(m).map((c) => c.toString(16)), `${label} B field`)
        .toEqual(want.cells.map((c) => c.toString(16)));

      // The A field is never written by `D`.
      expect(
        Array.from({ length: FIELD }, (_, i) => m.storage.read(A_BASE + i)),
        `${label} A field untouched`,
      ).toEqual(A_FIELD.map(cellOf));

      expect(m.regs.aar, `${label} AAR`).toBe(want.aar);
      expect(m.regs.bar, `${label} BAR`).toBe(want.bar);
      expect(m.regs.iar, `${label} IAR = NSI`).toBe(PROG + 12);

      // `4.5(L+1+A+1.5B)` with A and B both the positions stepped (opcodes.md §2 D row).
      expect(m.cpu.microsecondsSimulated, `${label} timing`)
        .toBe(CYCLE_US * (12 + 1 + want.positions + 1.5 * want.positions));
    });
  }

  it('the layout really does exercise every terminator at a different count', () => {
    const counts = new Map<string, Set<number>>();
    for (const row of MATRIX.dCharacters) {
      const key = `${row.direction} ${row.terminatesOn}`;
      const set = counts.get(key) ?? new Set<number>();
      set.add(expected(row).positions);
      counts.set(key, set);
      expect(set.size, `${key} is not a single count`).toBe(1);
    }
    expect(counts.size, 'all eight direction/terminator groups appear').toBe(8);
    // 1, 2, 3 and 4 positions all occur, so no group can be passing by luck of a shared length.
    expect([...new Set([...counts.values()].map((s) => [...s][0]))].sort()).toEqual([1, 2, 3, 4]);
  });

  it('a scan writes NOTHING — not even the B character back over itself', () => {
    // "None of 4/2/1 set = scan: the address registers are stepped, no data is transferred"
    // (opcodes.md §3.1). Rewriting a position with its own bits would recompute its C bit and
    // silently repair a parity-invalid cell, which is the difference between a scan and a
    // character move of a field onto itself.
    const scans = MATRIX.dCharacters.filter((r) => r.portion === 'scan');
    expect(scans.length, 'eight of the 64 are scans').toBe(8);
    for (const row of scans) {
      const m = createMachine({ size: SIZE });
      layout(m);
      // A deliberately parity-INVALID byte inside the B field. Only a write would fix it.
      m.storage.pokeRaw(B_BASE + 1, bcd('9'));
      program(m, PROG, `D${addr5(row.direction === 'L→R' ? A_BASE : A_BASE + FIELD - 1)}`
        + `${addr5(row.direction === 'L→R' ? B_BASE : B_BASE + FIELD - 1)}${glyphOf(row.dec)}`);
      m.addressSet(PROG);
      m.step();
      expect(m.storage.read(B_BASE + 1), `${row.mnemonic} left 6001 alone`).toBe(bcd('9'));
    }
  });
});

// ═══ The named cases ═══════════════════════════════════════════════════════════════════════

/** `D aaaaa bbbbb d` over two two-character fields the test lays out itself. */
function twoFields(
  aText: readonly (readonly [string, boolean])[],
  bText: readonly (readonly [string, boolean])[],
  d: string,
  addressing: 'right' | 'left' = 'right',
): Machine {
  const m = createMachine({ size: SIZE });
  aText.forEach((p, i) => m.storage.setChar(A_BASE + i, bcd(p[0]), p[1]));
  bText.forEach((p, i) => m.storage.setChar(B_BASE + i, bcd(p[0]), p[1]));
  const a = addressing === 'left' ? A_BASE : A_BASE + aText.length - 1;
  const b = addressing === 'left' ? B_BASE : B_BASE + bText.length - 1;
  program(m, PROG, `D${addr5(a)}${addr5(b)}${d}`);
  m.addressSet(PROG);
  expect(m.step()).toBeUndefined();
  return m;
}

const glyphs = (m: Machine, base: Addr, n: number): string =>
  Array.from({ length: n }, (_, i) => glyphOf(m.storage.read(base + i) & BCD6)).join('');
const marks = (m: Machine, base: Addr, n: number): string =>
  Array.from({ length: n }, (_, i) => (m.storage.wm(base + i) ? '^' : '.')).join('');

describe('the three scan/move d-characters CC01A names first (plan §5 Wave 5)', () => {
  // All three stop after ONE position (no B, A or 8 bit), so each moves exactly the units
  // position of A into the units position of B and nothing else — which is what makes them the
  // clean demonstration of the three portions (opcodes.md §3.2, dec 1, 2, 3).
  const A: readonly (readonly [string, boolean])[] = [['A', true], ['J', false]];
  const B: readonly (readonly [string, boolean])[] = [['0', true], ['1', false]];

  it('MLNS (d=`1`) moves the NUMERIC portion only — B keeps its zone bits', () => {
    const m = twoFields(A, B, '1');
    // `J` is BCD 41 (B zone, numeric 1); `1` is BCD 01 (no zone, numeric 1). Numeric 1 over
    // numeric 1 leaves `1` — the zone did NOT travel, which is the whole point.
    expect(glyphs(m, B_BASE, 2)).toBe('01');
    expect(m.storage.read(B_BASE + 1) & ZONE_BITS, 'B kept its own (absent) zone').toBe(0);
    expect(m.regs.aar, 'A-1').toBe(A_BASE);
    expect(m.regs.bar, 'B-1').toBe(B_BASE);
  });

  it('MLZS (d=`2`) moves the ZONE portion only — B keeps its numeric bits', () => {
    const m = twoFields(A, B, '2');
    // `J`'s B zone over `1`'s numeric 1 gives BCD 41 — the glyph `J` again, but arrived at from
    // the other half of the character.
    expect(glyphs(m, B_BASE, 2)).toBe('0J');
    expect(m.storage.read(B_BASE + 1) & NUMERIC_BITS, 'B kept its own numeric 1').toBe(1);
    expect(m.storage.read(B_BASE + 1) & ZONE_BITS, 'and took A’s B zone').toBe(ZB);
  });

  it('MLCS (d=`3`) moves BOTH portions — the whole character, but not the word mark', () => {
    const m = twoFields(A, B, '3');
    expect(glyphs(m, B_BASE, 2)).toBe('0J');
    expect(marks(m, B_BASE, 2), 'no word mark travelled').toBe('^.');
  });

  it('all three leave the A field alone and step both registers by exactly one', () => {
    for (const d of ['1', '2', '3']) {
      const m = twoFields(A, B, d);
      expect(glyphs(m, A_BASE, 2), `d=${d}`).toBe('AJ');
      expect(marks(m, A_BASE, 2), `d=${d}`).toBe('^.');
      expect(m.regs.aar, `d=${d} AAR = A-1`).toBe(A_BASE);
      expect(m.regs.bar, `d=${d} BAR = B-1`).toBe(B_BASE);
    }
  });
});

describe('the left-to-right terminators — opcodes.md §3.1 (A22-0526-3 Figure 19 p.25)', () => {
  const B6: readonly (readonly [string, boolean])[] =
    [['0', false], ['1', false], ['2', false], ['3', false], ['4', false], ['5', false]];

  it('MRCR (d=`,`) stops at an A-field RECORD MARK that carries no word mark', () => {
    const m = twoFields(
      [['A', true], ['B', false], ['C', true], ['‡', false], ['D', false], ['E', false]],
      B6, ',', 'left',
    );
    // The record mark itself is moved — "the position holding the terminating character is
    // moved/replaced like every other position" (§3.1) — and nothing beyond it is.
    expect(glyphs(m, B_BASE, 6)).toBe('ABC‡45');
    expect(marks(m, B_BASE, 6), 'the portion is zone+numeric; no word mark travels').toBe('......');
    expect(m.regs.aar, 'A+LA').toBe(A_BASE + 4);
    expect(m.regs.bar, 'B+LA').toBe(B_BASE + 4);
  });

  it('MRCG (d=`$`) stops at a group mark WITH a word mark', () => {
    const m = twoFields(
      [['A', true], ['B', false], ['C', true], ['⧧', true], ['D', false], ['E', false]],
      B6, '$', 'left',
    );
    expect(glyphs(m, B_BASE, 6)).toBe('ABC⧧45');
    expect(m.regs.aar).toBe(A_BASE + 4);
    expect(m.regs.bar).toBe(B_BASE + 4);
  });

  it('a group mark WITHOUT a word mark does NOT stop MRCG — it is a GM-WM terminator', () => {
    // The trap: `⧧` alone is an ordinary character (charset.md §2 rank 05). Only the pair
    // stops the move, so this one runs past the bare group mark at index 3 and is stopped by
    // the real GM-WM at index 5.
    const m = twoFields(
      [['A', true], ['B', false], ['C', true], ['⧧', false], ['D', false], ['⧧', true]],
      B6, '$', 'left',
    );
    expect(glyphs(m, B_BASE, 6)).toBe('ABC⧧D⧧');
    expect(m.regs.aar, 'six positions, not four').toBe(A_BASE + 6);
    expect(m.regs.bar).toBe(B_BASE + 6);
  });

  it('MRCM (d=`.`) takes whichever of the two comes first', () => {
    const rmFirst = twoFields(
      [['A', true], ['B', false], ['‡', false], ['⧧', true], ['D', false], ['E', false]],
      B6, '.', 'left',
    );
    expect(glyphs(rmFirst, B_BASE, 6)).toBe('AB‡345');
    expect(rmFirst.regs.aar).toBe(A_BASE + 3);

    const gmFirst = twoFields(
      [['A', true], ['B', false], ['⧧', true], ['‡', false], ['D', false], ['E', false]],
      B6, '.', 'left',
    );
    expect(glyphs(gmFirst, B_BASE, 6)).toBe('AB⧧345');
    expect(gmFirst.regs.aar).toBe(A_BASE + 3);
  });

  it('word marks do not terminate a record-mark or GM-WM d, in either field', () => {
    // With bit 8 set and either of bits B/A set, Figure 19 names no word-mark terminator at
    // all — the A field here is word-marked in every position and the move runs straight past.
    const m = twoFields(
      [['A', true], ['B', true], ['C', true], ['‡', true], ['D', true], ['E', true]],
      [['0', true], ['1', true], ['2', true], ['3', true], ['4', true], ['5', true]],
      ',', 'left',
    );
    expect(glyphs(m, B_BASE, 6)).toBe('ABC‡45');
    expect(marks(m, B_BASE, 6), 'the B word marks are all still there').toBe('^^^^^^');
  });
});

describe('the word-mark portion is a COPY of A’s mark, not a set (opcodes.md §3.1)', () => {
  it('MLCWB (d=`P`) sets a B word mark where A has one', () => {
    const m = twoFields([['A', true], ['B', true]], [['0', true], ['1', false]], 'P');
    expect(glyphs(m, B_BASE, 2)).toBe('AB');
    expect(marks(m, B_BASE, 2)).toBe('^^');
  });

  it('and CLEARS a B word mark where A has none', () => {
    // Three positions, so the clear happens at a position that is NOT the terminating one:
    // index 2 is moved, index 1 carries the B word mark that stops the move, and A index 1 has
    // no mark — so the mark that ended the operation is itself wiped by the same store.
    const m = twoFields(
      [['A', true], ['B', false], ['C', false]],
      [['0', true], ['1', true], ['2', false]],
      'P',
    );
    expect(glyphs(m, B_BASE, 3)).toBe('0BC');
    expect(marks(m, B_BASE, 3), 'the mark at 6001 was cleared by A’s unmarked `B`').toBe('^..');
    expect(m.regs.bar, 'two positions, B-LB').toBe(B_BASE);
  });

  it('MLWB (d=`M`) moves the word mark ALONE, leaving the data bits of B', () => {
    const m = twoFields([['A', true], ['B', false]], [['0', true], ['1', true]], 'M');
    expect(glyphs(m, B_BASE, 2), 'no data moved').toBe('01');
    expect(marks(m, B_BASE, 2)).toBe('^.');
  });

  it('every store recomputes the C bit — parity is odd over BA8421 + WM + C', () => {
    // A22-0526-3 p.5 / research/charset.md §1. `2` (BCD 02, one bit) has C on; giving it a word
    // mark must turn C off, and taking one away must turn it back on. A move that only shuffled
    // BA8421 and WM would leave both cells with EVEN parity.
    const m = twoFields([['2', true], ['2', false]], [['5', true], ['5', false]], 'P');
    expect(glyphs(m, B_BASE, 2)).toBe('22');
    expect(marks(m, B_BASE, 2), 'A’s marks travelled, both of them').toBe('^.');
    for (const a of [B_BASE, B_BASE + 1]) {
      const cell = m.storage.read(a);
      let bits = 0;
      for (let x = cell; x !== 0; x >>= 1) bits += x & 1;
      expect(bits % 2, `${a} has odd parity (cell 0x${cell.toString(16)})`).toBe(1);
    }
    // `2` is BCD 02 — a single bit. Alone it is already odd, so C is OFF; add a word mark and
    // the total goes even, so C must come ON. Both cells above are the same character.
    expect(m.storage.read(B_BASE) & C, 'word-marked `2` carries a C bit').toBe(C);
    expect(m.storage.read(B_BASE + 1) & C, 'unmarked `2` carries none').toBe(0);
  });

  it('the terminator is sensed on the character READ OUT, before the word mark is overwritten', () => {
    // `MLCWB` writes a word mark into the last position it touches. If the B word mark were
    // sensed after the store, this move would stop one position early — at 6001 — instead of
    // running back to the real mark at 6000. `insttest.cor` 02836 is exactly this case.
    const m = twoFields(
      [['A', true], ['B', true]], [['0', true], ['1', false]], 'P',
    );
    expect(glyphs(m, B_BASE, 2)).toBe('AB');
    expect(m.regs.bar, 'two positions, B-LB').toBe(B_BASE - 1);
  });
});

describe('the substitute-blank trap — opcodes.md §3.2 note, charset.md §2', () => {
  // Octal 20 (the A bit alone) is the substitute blank `ƀ` and assembles SCNLA; octal 00, a
  // true blank, assembles SCNLS. One keystroke apart, and two different instructions.
  const A: readonly (readonly [string, boolean])[] =
    [['A', true], ['B', false], ['C', false], ['D', false]];
  const B: readonly (readonly [string, boolean])[] =
    [['0', false], ['1', false], ['2', false], ['3', false]];

  it('SCNLS (true blank, octal 00) scans exactly ONE position', () => {
    const m = twoFields(A, B, ' ');
    expect(glyphs(m, B_BASE, 4), 'a scan transfers nothing').toBe('0123');
    expect(m.regs.aar, 'A-1').toBe(A_BASE + 2);
    expect(m.regs.bar, 'B-1').toBe(B_BASE + 2);
  });

  it('SCNLA (substitute blank, octal 20) scans to the A-field word mark — four positions', () => {
    const m = twoFields(A, B, 'ƀ');
    expect(glyphs(m, B_BASE, 4)).toBe('0123');
    expect(m.regs.aar, 'A-LA').toBe(A_BASE - 1);
    expect(m.regs.bar, 'B-LA').toBe(B_BASE - 1);
  });

  it('and the two glyphs really are two different codes', () => {
    expect(bcdOfGlyph(' ')).toBe(0);
    expect(bcdOfGlyph('ƀ')).toBe(SUBSTITUTE_BLANK);
    expect(SUBSTITUTE_BLANK).toBe(0o20);
    expect(MATRIX.dCharacters[0]?.mnemonic).toBe('SCNLS');
    expect(MATRIX.dCharacters[0o20]?.mnemonic).toBe('SCNLA');
  });
});

describe('chaining — `D` at lengths 6 and 1 reuse the op-modifier register', () => {
  // A 6- or 1-character instruction supplies no d-character and REUSES the last one
  // (A22-0526-3 pp.12, 25; decode.ts `applyFields`, which deliberately does not write opMod for
  // forms `Oa` and `O`). An 11-character instruction would have BLANKED it — `D` has no
  // 11-character form, which is why the chain survives here.
  const A: readonly (readonly [string, boolean])[] =
    [['A', true], ['B', false], ['C', false], ['D', false]];
  const B: readonly (readonly [string, boolean])[] =
    [['0', true], ['1', false], ['2', false], ['3', false]];

  function chain(second: string): Machine {
    const m = createMachine({ size: SIZE });
    A.forEach((p, i) => m.storage.setChar(A_BASE + i, bcd(p[0]), p[1]));
    B.forEach((p, i) => m.storage.setChar(B_BASE + i, bcd(p[0]), p[1]));
    // First: `D 05003 06003 3` — MLCS, one position, leaving AAR 5002 / BAR 6002.
    program(m, PROG, `D${addr5(A_BASE + 3)}${addr5(B_BASE + 3)}3`);
    program(m, PROG + 12, second);
    m.addressSet(PROG);
    expect(m.step()).toBeUndefined();
    expect(m.regs.aar, 'after the 12-character D').toBe(A_BASE + 2);
    expect(m.regs.bar).toBe(B_BASE + 2);
    expect(m.step()).toBeUndefined();
    return m;
  }

  it('a bare `D` (L=1) repeats the previous d over the chained AAR / BAR', () => {
    // The 12-character `D` moved A index 3 into B index 3; the chained `D` moves A index 2 into
    // B index 2 with the SAME d — one position each, MLCS both times.
    const m = chain('D');
    expect(glyphs(m, B_BASE, 4)).toBe('01CD');
    expect(m.regs.aar, 'a second single position').toBe(A_BASE + 1);
    expect(m.regs.bar).toBe(B_BASE + 1);
    expect(m.cpu.microsecondsSimulated, '4.5(12+1+1+1.5) + 4.5(1+1+1+1.5)')
      .toBe(CYCLE_US * (12 + 1 + 1 + 1.5) + CYCLE_US * (1 + 1 + 1 + 1.5));
  });

  it('`D aaaaa` (L=6) supplies a new A-address, chains the B-address, and keeps the d', () => {
    // opcodes.md §2 D row: "Length 6 chains the B-address and reuses the previous modifier".
    // So the second move reads A index 0 and writes the B position the first one left BAR on.
    const m = chain(`D${addr5(A_BASE)}`);
    expect(m.regs.aar, 'the new A-address, minus one position').toBe(A_BASE - 1);
    expect(m.regs.bar, 'the chained B-address, minus one position').toBe(B_BASE + 1);
    expect(glyphs(m, B_BASE, 4), 'A’s index-0 character landed at B index 2').toBe('01AD');
  });

  it('the retained d is genuinely the previous one, not a default', () => {
    // Chain a `1` (MLNS, numeric only) and prove the chained instruction moved only the numeric
    // half. A default of blank (SCNLS, a scan) would leave `0`; a default of `3` (MLCS) would
    // give `J`; only the retained `1` gives `1`.
    const m = createMachine({ size: SIZE });
    m.storage.setChar(A_BASE, bcd('J'), false);      // BCD 41 — B zone, numeric 1
    m.storage.setChar(A_BASE + 1, bcd('S'), false);  // BCD 22 — A zone, numeric 2
    m.storage.setChar(B_BASE, bcd('0'), false);      // BCD 12 — no zone, numeric 8-2
    m.storage.setChar(B_BASE + 1, bcd('7'), false);  // BCD 07 — no zone, numeric 7
    program(m, PROG, `D${addr5(A_BASE + 1)}${addr5(B_BASE + 1)}1`);
    program(m, PROG + 12, 'D');
    m.addressSet(PROG);
    expect(m.step()).toBeUndefined();
    expect(m.step()).toBeUndefined();
    expect(glyphs(m, B_BASE, 2), 'numeric 1 over `0`, numeric 2 over `7`').toBe('12');
    expect(m.regs.opMod & BCD6, 'the modifier register still holds `1`').toBe(bcd('1'));
    expect(m.regs.aar).toBe(A_BASE - 1);
    expect(m.regs.bar).toBe(B_BASE - 1);
  });
});

describe('an operation whose terminator is never sensed stops with an ADDRESS CHECK', () => {
  it('right to left, walking into 00000', () => {
    // research/architecture.md §4 (A22-0526-3 p.8): "addressing 00000 in a decrementing
    // operation stops with an address check — no exceptions". Nothing in Figure 19 bounds a
    // move except its terminator, so this is the machine's own answer, not a guard we invented.
    const m = createMachine({ size: SIZE });
    // No word mark anywhere in either field, and d = `L` (MLCB, stop on the B-field word mark).
    m.storage.setChar(50, bcd('A'), false);
    m.storage.setChar(60, bcd('0'), false);
    program(m, PROG, `D${addr5(50)}${addr5(60)}L`);
    m.addressSet(PROG);
    expect(m.step()).toBe('addressCheck');
  });

  it('left to right, walking off the top of installed storage', () => {
    const m = createMachine({ size: SIZE });
    program(m, PROG, `D${addr5(19_000)}${addr5(19_500)},`);   // MRCR, no record mark anywhere
    m.addressSet(PROG);
    expect(m.step()).toBe('addressCheck');
  });
});
