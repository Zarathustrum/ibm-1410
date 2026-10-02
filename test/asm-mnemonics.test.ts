// Tier 0 — the Autocoder mnemonic table, checked in BOTH DIRECTIONS against the core tables
// and against the research (docs/plans/phase-3-autocoder.md §7.4, wave 1).
//
// `src/asm/mnemonics.ts` is DERIVED from `src/core/isa/table.ts` and `src/core/isa/dmods.ts`,
// both of which are on the plan's §3.4 do-not-touch list. This file is the diff between them.
//
// THE RULE, inherited from test/isa-table-vs-research.test.ts. When this check fails, the fix
// is in `mnemonics.ts` unless a MANUAL PAGE says otherwise. Editing `opcodes.md` §2 or
// `table.ts` to make the check pass is a plan violation: a research correction is its own
// commit, cites the form number and page, and is verified against that page (plan §3.4).
//
// WHY DIRECTION 2 IS SPLIT IN TWO. `OPS[].autocoder` and the per-op d-tables hold DIFFERENT
// name sets — `BC91`, `BCV1`, `BPCB1`, `BNQ1`, `BC92`, `BCV2`, `BPCB2`, `BNQ2`, `BOQ`, `BOQ1`,
// `BB1`, `BB2` and `BSS A`-`BSS G` are in a d-table and in NO `OPS[].autocoder` at all. An
// earlier plan draft aimed the d-table exclusion list at `OPS[].autocoder`, where none of those
// names appears, so the test would have passed while checking nothing. 2a and 2b each say which
// source they read, and 2b re-asserts the disjointness that makes it necessary (plan §7.4).

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CARRIAGE_D_TABLE,
  J_D_TABLE,
  MOVE_DIRECTION,
  MOVE_PORTION,
  RX_STATUS_BITS,
  V_D_TABLE,
} from '../src/core/isa/dmods.js';
import { ALL_OPS, opByChar } from '../src/core/isa/table.js';
import {
  ALL_MNEMONICS,
  AMBIGUOUS,
  OUT_OF_SCOPE,
  resolve,
} from '../src/asm/mnemonics.js';
import type { OpEntry } from '../src/core/types.js';

// This file lives at <repo>/test/asm-mnemonics.test.ts.
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OPCODES_MD = readFileSync(join(REPO_ROOT, 'docs/research/opcodes.md'), 'utf8');

const OUT_OF_SCOPE_NAMES = new Set(OUT_OF_SCOPE.map((r) => r.name));
const AMBIGUOUS_NAMES = new Set(AMBIGUOUS);

/**
 * A `#` name in `OPS[].autocoder` or `opcodes.md` §2 is a FAMILY, not a mnemonic, and the `#` is
 * NOT where the digit goes. A22-0526-3 p.62 prints "RW or R1W (Ch 1) / R2W (Ch 2)" and
 * C28-0309-1 p.47 lists `RW R1W R2W RWO R1WO R2WO`, so `RW#`'s digit is INFIXED after the stem
 * `R` while `WM#`'s really is suffixed (Figure 107 p.105's `WM(#)°`). The `#` string cannot say
 * which, so the family is accounted for through the SOURCE NAME every generated row carries —
 * and the generated spellings themselves are pinned name-for-name against the two manuals in
 * "the I/O families are generated the manual's way" below, which is the check that would catch a
 * wrong position.
 */
const IO_SOURCE_NAMES = new Set(
  ALL_MNEMONICS.map((row) => row.sourceName).filter((name): name is string => name !== undefined),
);

function ioFamilyResolves(name: string): boolean {
  return IO_SOURCE_NAMES.has(name);
}

/** The four exits a name may take. Anything else is an unaccounted-for mnemonic. */
function accountedFor(name: string): boolean {
  return resolve(name) !== undefined
    || ioFamilyResolves(name)
    || AMBIGUOUS_NAMES.has(name)
    || OUT_OF_SCOPE_NAMES.has(name);
}

// ═══ The two generative `D` rows, expanded ═════════════════════════════════════════════════
// `OP_D.autocoder` holds PATTERNS, not names: `M{L,R}{N,Z,C,W,NW,ZW,CW}{S,A,B,␣,R,G,M}` and
// `SCN{L,R}{…}`. Containment in either direction would otherwise fail on two of its members by
// testing strings no resolver can be asked for, so both are expanded through
// MOVE_PORTION × MOVE_DIRECTION first — the same two tables mnemonics.ts derives from, which is
// why the brace groups themselves are checked against those tables below (plan §7.4 2a).

const IS_PATTERN = /[{}…]/;

function generateMoveScanNames(): string[] {
  const out: string[] = [];
  for (const dir of MOVE_DIRECTION) {
    for (const portion of MOVE_PORTION) {
      const prefix = portion.portion === 'scan' ? 'SCN' : 'M';
      out.push(`${prefix}${dir.dirLetter}${portion.letters}${dir.termLetter}`);
    }
  }
  return out;
}

const MOVE_SCAN_NAMES = generateMoveScanNames();

function braceGroups(pattern: string): string[][] {
  return [...pattern.matchAll(/\{([^}]*)\}/g)].map((m) => (m[1] ?? '').split(','));
}

// ═══ The name sets, from the two sources ═══════════════════════════════════════════════════

const RAW_OPS_ENTRIES: string[] = ALL_OPS.flatMap((op) => [...op.autocoder]);
const OPS_PATTERNS = RAW_OPS_ENTRIES.filter((n) => IS_PATTERN.test(n));
const OPS_PLAIN_NAMES = new Set(RAW_OPS_ENTRIES.filter((n) => !IS_PATTERN.test(n)));
/** `OPS[].autocoder` with the two generative rows expanded — the set 2a and direction 1 read. */
const OPS_EXPANDED_NAMES = new Set([...OPS_PLAIN_NAMES, ...MOVE_SCAN_NAMES]);

/** The leading token of a `V_D_TABLE` cell: `'BZN (I)(B) AB'` -> `'BZN'`. */
function vMnemonic(cell: string): string {
  return cell.split(/\s+/)[0] ?? '';
}

const D_TABLE_NAMES = new Set<string>([
  ...J_D_TABLE.flatMap((r) => [...r.autocoder]),
  ...RX_STATUS_BITS.flatMap((b) => [...b.autocoder]),
  ...V_D_TABLE.map((r) => vMnemonic(r.autocoder)),
]);

// ═══ opcodes.md §2's Autocoder column, read directly ═══════════════════════════════════════
// That column is UNGUARDED today — test/isa-table-vs-research.test.ts says so in its own
// header ("Autocoder, Timing and Cite are prose/provenance columns with no machine-checkable
// counterpart in OpForm") — so this is a strictly new guarantee, added without touching a
// single existing file. Chained transitively, opcodes.md §2 -> table.ts -> mnemonics.ts then
// has a machine at every arrow (plan §7.4 assertion 5).

const SECTION_2_START = '## 2. Complete instruction table';
const SECTION_2_END = '### 2.1';
const AUTOCODER_COLUMN = 1;

/** A candidate mnemonic: upper-case start, then letters, digits or the channel `#`. */
const NAME_TOKEN = /^[A-Z][A-Z0-9#]*$/;
/** §2's `Y` row prints its channel pairs as `BUPR1/2`, meaning `BUPR1` and `BUPR2`. */
const CHANNEL_PAIR = /^([A-Z][A-Z0-9#]*?)(\d)\/(\d)$/;

/** §2's data rows as trimmed cell arrays — the table read once, for both checks below. */
function section2Rows(md: string): string[][] {
  const start = md.indexOf(SECTION_2_START);
  if (start < 0) throw new Error(`opcodes.md: heading "${SECTION_2_START}" not found`);
  const end = md.indexOf(SECTION_2_END, start);
  if (end < 0) throw new Error(`opcodes.md: "${SECTION_2_END}" not found after §2`);

  const rows: string[][] = [];
  for (const line of md.slice(start, end).split('\n')) {
    if (!line.startsWith('| ')) continue;               // prose, and the |---|---| separator
    const parts = line.split('|');
    const cells = parts.slice(1, parts.length - 1).map((c) => c.trim());
    if (cells[0] === 'Op char (oct)') continue;         // the header
    rows.push(cells);
  }
  return rows;
}

const SECTION_2_ROWS = section2Rows(OPCODES_MD);

/** The row's op character: `` '`J` (041)' `` -> `'J'`. */
function section2OpChar(cells: readonly string[]): string {
  return (cells[0] ?? '').replace(/`/g, '').split(/\s+/)[0] ?? '';
}

function section2AutocoderTokens(rows: readonly string[][]): string[] {
  const tokens: string[] = [];
  for (const cells of rows) {
    const cell = cells[AUTOCODER_COLUMN];
    if (cell === undefined) continue;
    for (const raw of cell.replace(/[`*]/g, ' ').split(/\s+/)) {
      const pair = CHANNEL_PAIR.exec(raw);
      if (pair && pair[1] !== undefined && pair[2] !== undefined && pair[3] !== undefined) {
        tokens.push(`${pair[1]}${pair[2]}`, `${pair[1]}${pair[3]}`);
      } else if (NAME_TOKEN.test(raw)) {
        tokens.push(raw);
      }
      // Everything else is dropped by construction: the two `D` patterns (they carry braces),
      // the `…` continuations of the J / L / M rows, and the italic feature notes
      // `(7010 only)` / `(Priority feature)` / `(1412/1419 MICR)`.
    }
  }
  return tokens;
}

const SECTION_2_NAMES = new Set(section2AutocoderTokens(SECTION_2_ROWS));

// ═══ 1. Every row is internally valid ══════════════════════════════════════════════════════

/** Every `d` key the op's forms publish, across all of them. Empty when none is a map. */
function dModifierKeys(op: OpEntry): Set<string> {
  const keys = new Set<string>();
  for (const form of op.forms) {
    if (typeof form.dModifiers === 'string') continue;
    for (const key of Object.keys(form.dModifiers)) keys.add(key);
  }
  return keys;
}

function opAcceptsAnyD(op: OpEntry): boolean {
  return op.forms.some((form) => form.dModifiers === 'any' || form.dModifiers === 'bitmask');
}

describe('asm/mnemonics — assertion 1: every row resolves through opByChar and carries a legal d', () => {
  it('names a real op character', () => {
    const bad = ALL_MNEMONICS.filter((row) => opByChar(row.opChar) === undefined)
      .map((row) => `${row.mnemonic} -> '${row.opChar}'`);
    expect(bad).toEqual([]);
  });

  it("bakes in only d-characters that op's dModifiers publish", () => {
    const bad: string[] = [];
    for (const row of ALL_MNEMONICS) {
      if (row.d === undefined) continue;
      const op = opByChar(row.opChar);
      if (op === undefined) continue;                   // reported by the test above
      const keys = dModifierKeys(op);
      if (keys.size > 0) {
        if (!keys.has(row.d)) bad.push(`${row.mnemonic}: d '${row.d}' is not a key of op '${row.opChar}'`);
      } else if (!opAcceptsAnyD(op)) {
        bad.push(`${row.mnemonic}: op '${row.opChar}' takes no d, but the row bakes in '${row.d}'`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('gives every mnemonic exactly one row', () => {
    expect(ALL_MNEMONICS.length).toBe(new Set(ALL_MNEMONICS.map((r) => r.mnemonic)).size);
  });
});

// ═══ The two generative rows are the patterns this file expands ════════════════════════════

describe("asm/mnemonics — OP_D's two entries are patterns, and their brace groups are the two tables", () => {
  it('finds exactly two patterns, both on op D', () => {
    expect(OPS_PATTERNS.length).toBe(2);
    const dOp = opByChar('D');
    expect(dOp?.autocoder).toEqual(OPS_PATTERNS);
  });

  it('expands to the 64 d-characters of MOVE_PORTION × MOVE_DIRECTION', () => {
    expect(MOVE_SCAN_NAMES.length).toBe(64);
    expect(new Set(MOVE_SCAN_NAMES).size).toBe(64);
  });

  it("matches table.ts's own pattern strings against dmods.ts's tables", () => {
    const [movePattern, scanPattern] = OPS_PATTERNS;
    expect(movePattern?.startsWith('M{')).toBe(true);
    expect(scanPattern?.startsWith('SCN{')).toBe(true);

    const dirLetters = new Set(MOVE_DIRECTION.map((d) => d.dirLetter));
    const portionLetters = new Set(
      MOVE_PORTION.filter((p) => p.portion !== 'scan').map((p) => p.letters),
    );
    // The pattern prints the empty terminator letter as `␣`, the manual's blank.
    const termLetters = new Set(MOVE_DIRECTION.map((d) => (d.termLetter === '' ? '␣' : d.termLetter)));

    const moveGroups = braceGroups(movePattern ?? '');
    expect(moveGroups.length).toBe(3);
    expect(new Set(moveGroups[0])).toEqual(dirLetters);
    expect(new Set(moveGroups[1])).toEqual(portionLetters);
    expect(new Set(moveGroups[2])).toEqual(termLetters);

    const scanGroups = braceGroups(scanPattern ?? '');
    expect(new Set(scanGroups[0])).toEqual(dirLetters);
    expect(scanGroups[1]).toEqual(['…']);               // §2's own elision, carried into table.ts
  });
});

// ═══ 2. Containment, direction 1 ═══════════════════════════════════════════════════════════

describe('asm/mnemonics — assertion 2: direction 1, every resolved name comes from a core table', () => {
  it('appears in OPS[].autocoder (patterns expanded) or in a per-op d-table', () => {
    // `sourceName ?? mnemonic`: the I/O rows resolve as `RW` / `R1W` / `R2W` / `RWO` / … but
    // their SOURCE string in `OPS[].autocoder` is `RW#`, so containment is checked against the
    // name the table holds.
    const orphans = ALL_MNEMONICS
      .filter((row) => {
        const source = row.sourceName ?? row.mnemonic;
        return !OPS_EXPANDED_NAMES.has(source) && !D_TABLE_NAMES.has(source);
      })
      .map((row) => `${row.mnemonic} (op '${row.opChar}')`);
    expect(orphans).toEqual([]);
  });

  it('invents nothing: the resolver is not empty and every row cites its source', () => {
    expect(ALL_MNEMONICS.length).toBeGreaterThan(100);
    expect(ALL_MNEMONICS.filter((row) => row.cite.trim() === '')).toEqual([]);
  });

  it('holds 198 rows: 148 non-I/O rows plus the eleven I/O families, generated out', () => {
    // Pinned so the generation cannot be silently undone or silently doubled. ELEVEN source names
    // carry I/O rows: the seven `#` families R# RW# P# PW# W# WW# WM#, and the four console names
    // RCP RCPW WCP WCPW, which `OPS[].autocoder` holds in full because the console printer is not
    // a channel device. Each `#` family generates SIX rows — {bare, 1, 2} channel spellings ×
    // {plain, O} overlap (A22-0526-3 Figure 107 p.105's legend) — and each console name TWO, so
    // 7×6 + 4×2 = 50. It was 18 rows under the `#`-suffix reading this replaced on 2026-08-31,
    // which is the +32.
    const io = ALL_MNEMONICS.filter((row) => row.io !== undefined);
    expect(new Set(io.map((row) => row.sourceName)).size).toBe(11);
    expect(io.length).toBe(50);
    // `sourceName` is set on EVERY I/O row and on no other row, which is what makes containment
    // direction 1 and `ioFamilyResolves` above read the same set.
    expect(ALL_MNEMONICS.filter((row) => row.sourceName !== undefined).length).toBe(50);
    expect(ALL_MNEMONICS.length - io.length).toBe(148);
    expect(ALL_MNEMONICS.length).toBe(198);
  });
});

// ═══ 3. Containment, direction 2a — over OPS[].autocoder ═══════════════════════════════════

describe('asm/mnemonics — assertion 3: direction 2a, over OPS[].autocoder', () => {
  it('holds 108 entries in 33 name-carrying rows, 108 unique, and no duplicate', () => {
    // Counted off table.ts by this test rather than remembered (plan §7.4 2a). 35 OPS rows in
    // all: `=` (0o13) and `$` (0o53) carry an empty array and so contribute no name (§2.5).
    expect(ALL_OPS.length).toBe(35);
    expect(ALL_OPS.filter((op) => op.autocoder.length > 0).length).toBe(33);
    // 109 until 2026-08-31, when `RW#` came out of OP_M.autocoder as a transcription artifact
    // (A22-0526-3 Fig 107 p.104, C28-0309-1 p.47). Entries now EQUAL unique: the mapping is a function.
    expect(RAW_OPS_ENTRIES.length).toBe(108);
    expect(new Set(RAW_OPS_ENTRIES).size).toBe(108);

    const counts = new Map<string, number>();
    for (const name of RAW_OPS_ENTRIES) counts.set(name, (counts.get(name) ?? 0) + 1);
    const duplicates = [...counts].filter(([, n]) => n > 1).map(([name]) => name);
    // Kept as the tripwire that would catch a re-introduction, not as a proof of one.
    expect(duplicates).toEqual([]);
  });

  it('resolves the RW# family to L under RW_HASH_IS_LOAD_MODE, and to no other op', () => {
    // mnemonic -> opChar IS a function since 2026-08-31. `RW#` was under both OP_L (0o43) and
    // OP_M (0o44); OP_M's copy was `opcodes.md` §2 row 207's transcription artifact and is gone.
    // A22-0526-3 Fig 107 p.104 gives the family one combined `M or L` row whose legend reads
    // `w` = "W if WM (load mode)"; C28-0309-1 p.47 lists R/R1/R2 and RO/R1O/R2O on M, and
    // RW/R1W/R2W and RWO/R1WO/R2WO on L — no RW-family form on M anywhere (plan §7.1 point 4, §7.2).
    expect(opByChar('L')?.autocoder).toContain('RW#');
    expect(opByChar('M')?.autocoder).not.toContain('RW#');
    expect(AMBIGUOUS).toEqual([]);
    for (const name of ['RW', 'R1W', 'R2W', 'RWO', 'R1WO', 'R2WO']) {
      expect(resolve(name)?.opChar, name).toBe('L');
    }
    // The `#` itself is not a character a programmer types — and neither is the `#`-SUFFIX
    // spelling `RW1` that this assembler resolved until 2026-08-31: the digit is infixed.
    expect(resolve('RW#')).toBeUndefined();
    expect(resolve('RW1')).toBeUndefined();
  });

  it('accounts for every name: resolved, AMBIGUOUS (now empty), or OUT_OF_SCOPE with a reason', () => {
    const unaccounted = [...OPS_EXPANDED_NAMES].filter((name) => !accountedFor(name)).sort();
    expect(unaccounted).toEqual([]);
    expect(OUT_OF_SCOPE.filter((row) => row.reason.trim() === '')).toEqual([]);
  });

  it('excludes exactly the tape, disk, MICR and BQPR2 names from OPS[].autocoder', () => {
    const excludedHere = [...OPS_EXPANDED_NAMES].filter((n) => OUT_OF_SCOPE_NAMES.has(n)).sort();
    expect(excludedHere).toEqual([
      'BQPR2',
      'BSP', 'DCR1', 'DCR2', 'ECR1', 'ECR2',
      'RT', 'RTB', 'RTW', 'RWD', 'RWU',
      'SD', 'SKP', 'SS1', 'SS2',
      'WT', 'WTB', 'WTM', 'WTW',
    ]);
  });

  it('resolves the names an earlier draft would have dropped', () => {
    // The thirteen resolvable `Y` names (OP_Y holds fourteen; BQPR2 is the one excluded), plus
    // BOL1/BOL2, P1W/P2W, SSF1, SSF2, CC2 and the whole `X` channel-2 status family (plan §7.4 2a).
    expect(opByChar('Y')?.autocoder.length).toBe(14);
    const yResolved = (opByChar('Y')?.autocoder ?? []).filter((n) => resolve(n) !== undefined);
    expect(yResolved.length).toBe(13);
    for (const name of ['BOL1', 'BOL2', 'P1W', 'P2W', 'SSF1', 'SSF2', 'CC2', 'BEX1', 'BEX2', 'BA1', 'BA2']) {
      expect(resolve(name), name).toBeDefined();
    }
    for (const name of opByChar('X')?.autocoder ?? []) {
      expect(resolve(name)?.opChar, name).toBe('X');
    }
  });

  it('marks the rows this configuration cannot execute, and still resolves them (§2.5)', () => {
    expect(resolve('BXPA')?.unimplemented).toBe(true);      // Y, Priority feature
    expect(resolve('BEX2')?.unimplemented).toBe(true);      // X, channel 2
    expect(resolve('CC2')?.unimplemented).toBe(true);       // 2, channel 2
    expect(resolve('BOL1')?.unimplemented).toBe(true);      // J d-row, available: false
    expect(resolve('MLCB')?.unimplemented).toBe(false);
  });
});

// ═══ 4. Containment, direction 2b — over the per-op d-tables ═══════════════════════════════

describe('asm/mnemonics — assertion 4: direction 2b, over J_D_TABLE / RX_STATUS_BITS / V_D_TABLE', () => {
  it('carries names that appear in NO OPS[].autocoder — which is why 2b exists', () => {
    const dTableOnly = [
      'BC91', 'BC92', 'BCV1', 'BCV2', 'BPCB1', 'BPCB2', 'BNQ1', 'BNQ2',
      'BOQ', 'BOQ1', 'BB1', 'BB2',
      'BSS A', 'BSS B', 'BSS C', 'BSS D', 'BSS E', 'BSS F', 'BSS G',
    ];
    for (const name of dTableOnly) {
      expect(D_TABLE_NAMES.has(name), `${name} should be in a d-table`).toBe(true);
      expect(OPS_PLAIN_NAMES.has(name), `${name} should NOT be in OPS[].autocoder`).toBe(false);
    }
  });

  it('accounts for every d-table name: resolved, or OUT_OF_SCOPE with a reason', () => {
    const unaccounted = [...D_TABLE_NAMES].filter((name) => !accountedFor(name)).sort();
    expect(unaccounted).toEqual([]);
  });

  it('excludes BSS A-BSS G, BB1/BB2 and BOQ/BOQ1 by name, and derives the rest', () => {
    // The plan's ruling, taken as written in §7.4's direction-2b list: the sense switches carry
    // an embedded blank whose placement in the 5-column operation field is unattested; BB1/BB2
    // need the column-binary card feature; BOQ/BOQ1 need the 1414 model 4/5 outquiry adapter.
    const excludedHere = [...D_TABLE_NAMES].filter((n) => OUT_OF_SCOPE_NAMES.has(n)).sort();
    expect(excludedHere).toEqual([
      'BB1', 'BB2', 'BOQ', 'BOQ1',
      'BSS A', 'BSS B', 'BSS C', 'BSS D', 'BSS E', 'BSS F', 'BSS G',
    ]);
    for (const name of ['BC91', 'BC92', 'BCV1', 'BCV2', 'BPCB1', 'BPCB2', 'BNQ1', 'BNQ2']) {
      expect(resolve(name)?.opChar, name).toBe('J');
    }
  });

  it("reads V's nine d-characters as three mnemonics plus a zone word (V_ZONE_WORD_IS_...)", () => {
    expect(V_D_TABLE.length).toBe(9);
    expect(resolve('BW')?.d).toBe('1');
    expect(resolve('BZN')?.d).toBe('2');
    expect(resolve('BWZ')?.d).toBe('3');
    // The divergent case the plan names: `BZN a,b,B` is d = `K` under the zone-word reading.
    expect(resolve('BZN')?.zoneWords).toEqual({ AB: 'B', B: 'K', A: 'S' });
    expect(resolve('BWZ')?.zoneWords).toEqual({ AB: 'C', B: 'L', A: 'T' });
    expect(resolve('BW')?.zoneWords).toBeUndefined();
  });
});

// ═══ 5. The research column, read directly — and it is KNOWN-INCOMPLETE ═══════════════════
// §2's `J`, `L` and `M` Autocoder cells end in a literal `…` (plan §7.1 point 3), so the column
// is a partial list of the real Autocoder op set. Everything below checks that the column and
// `table.ts` are the SAME partial list and that the `…` is where the plan says it is — never
// that either source is complete.

describe('asm/mnemonics — assertion 5: opcodes.md §2\'s Autocoder column', () => {
  it('yields a real column, not an empty slice', () => {
    expect(SECTION_2_NAMES.size).toBeGreaterThan(100);
    expect(SECTION_2_NAMES.has('MLCB')).toBe(false);      // §2 prints the pattern, not the names
  });

  it('accounts for every non-pattern, non-ellipsis token', () => {
    const unaccounted = [...SECTION_2_NAMES].filter((name) => !accountedFor(name)).sort();
    expect(unaccounted).toEqual([]);
  });

  it('agrees name-for-name with table.ts over the names §2 PRINTS — a column §2 says is partial', () => {
    // table.ts's own header: "This file MIRRORS opcodes.md §2 ROW FOR ROW." The Autocoder column
    // is the one column isa-table-vs-research.test.ts does not compare; this closes it — but only
    // over the names actually printed. THE COLUMN IS KNOWN-INCOMPLETE (plan §7.1 point 3): §2's
    // `J`, `L` and `M` rows end in a literal `…`, and `table.ts`'s plain string arrays cannot carry
    // it, so the two sources agree ROW FOR ROW while both stay short of the real Autocoder op list.
    // What this asserts is that the two are the SAME partial list, not that either is complete.
    // The test below pins where the `…` is, so the incompleteness is checked, not just described.
    const inResearchOnly = [...SECTION_2_NAMES].filter((n) => !OPS_PLAIN_NAMES.has(n)).sort();
    const inTableOnly = [...OPS_PLAIN_NAMES].filter((n) => !SECTION_2_NAMES.has(n)).sort();
    expect({ inResearchOnly, inTableOnly }).toEqual({ inResearchOnly: [], inTableOnly: [] });
  });

  it('carries the `…` continuation marker in exactly the J, L and M Autocoder cells', () => {
    // Plan §7.1 point 3 names J, L and M; this reads the file rather than trusting the plan.
    const elided = SECTION_2_ROWS
      .filter((cells) => (cells[AUTOCODER_COLUMN] ?? '').endsWith('…'))
      .map(section2OpChar);
    expect(elided).toEqual(['J', 'L', 'M']);

    // `D`'s cell holds a `…` TOO, and is deliberately NOT on that list: it sits inside a brace
    // group — `SCN{L,R}{…}` — where it elides the pattern's own portion letters, not the row's
    // remaining mnemonics. Asserted both ways so a future edit cannot quietly turn one into
    // the other.
    const dCell = SECTION_2_ROWS.find((cells) => section2OpChar(cells) === 'D')?.[AUTOCODER_COLUMN];
    expect(dCell).toContain('{…}');
    expect(dCell?.endsWith('…')).toBe(false);
  });
});

// ═══ The four d-derivations already in this repo — the wave-1 oracle (plan §11) ════════════

describe('asm/mnemonics — the four independent d derivations, zero misses', () => {
  it("MLCB -> D, d 'L' — Exhibit IV's `D 00394 00306 L` (software.md §5)", () => {
    const row = resolve('MLCB');
    expect(row?.opChar).toBe('D');
    expect(row?.d).toBe('L');
  });

  it("MLC -> d 'C' — software.md §3's `D0079600596C`", () => {
    expect(resolve('MLC')?.d).toBe('C');
  });

  it("MLCWS -> d '7' — the shipped loader at 00318 (src/formats/loader.ts)", () => {
    expect(resolve('MLCWS')?.d).toBe('7');
  });

  it("MRCWG -> d 'Δ' (octal 57) — the shipped loader at 00330", () => {
    expect(resolve('MRCWG')?.d).toBe('Δ');
  });

  it('keeps the SUBSTITUTE-BLANK TRAP apart: SCNLA is octal 20, SCNLS is a true blank', () => {
    expect(resolve('SCNLA')?.d).toBe('ƀ');
    expect(resolve('SCNLS')?.d).toBe(' ');
  });
});

// ═══ The I/O families, generated the way the manual generates them ════════════════════════
// A22-0526-3 Figure 107 pp.104-105 gives each family ONE row with generative suffixes and an op
// cell reading "M or L"; C28-0309-1 pp.47-48 print the expansion. THE TWO SOURCES AGREE, and the
// name-for-name list below is the C28-0309-1 pages transcribed. The rule under it: the `W` that
// means "with word marks" selects `L` (0o43), its absence `M` (0o44) — `w` = "W if WM (load
// mode)" in Figure 107's own legend — and the channel digit is INFIXED after the family stem
// (p.62, "RW or R1W (Ch 1) / R2W (Ch 2)"). `WM#` is NOT an exception to the load-mode rule: it is
// a distinct printer function on x³ = 1 against Write a Line's x³ = 0, both on the 1403 at x² = 2,
// so it has no `w` form at all (WM_HASH_STAYS_AS_SHIPPED, [verified]).

/** Every mnemonic this assembler generates, family by family — C28-0309-1 p.47 (READ, PRINTER),
 *  p.48 (PUNCH, CONSOLE), and A22-0526-3 Figure 107 pp.104-105 for the generative rule. */
const IO_FAMILY_NAMES: readonly (readonly [string, string, readonly string[]])[] = [
  ['card read, move mode', 'M', ['R', 'R1', 'R2', 'RO', 'R1O', 'R2O']],
  ['card read, load mode', 'L', ['RW', 'R1W', 'R2W', 'RWO', 'R1WO', 'R2WO']],
  ['punch, move mode', 'M', ['P', 'P1', 'P2', 'PO', 'P1O', 'P2O']],
  ['punch, load mode', 'L', ['PW', 'P1W', 'P2W', 'PWO', 'P1WO', 'P2WO']],
  ['printer, move mode', 'M', ['W', 'W1', 'W2', 'WO', 'W1O', 'W2O']],
  ['printer, load mode', 'L', ['WW', 'W1W', 'W2W', 'WWO', 'W1WO', 'W2WO']],
  ['write word marks as 1s', 'M', ['WM', 'WM1', 'WM2', 'WMO', 'WM1O', 'WM2O']],
  ['console read', 'M', ['RCP', 'RCPO']],
  ['console read, load mode', 'L', ['RCPW', 'RCPWO']],
  ['console write', 'M', ['WCP', 'WCPO']],
  ['console write, load mode', 'L', ['WCPW', 'WCPWO']],
];

describe('asm/mnemonics — the I/O families are generated the manual\'s way', () => {
  it('generates exactly these fifty names, and no others, each on the op the `w` selects', () => {
    const expected = IO_FAMILY_NAMES.flatMap(([, , names]) => names);
    expect(ALL_MNEMONICS.filter((row) => row.io !== undefined).map((row) => row.mnemonic).sort())
      .toEqual([...expected].sort());
    for (const [family, opChar, names] of IO_FAMILY_NAMES) {
      for (const name of names) expect(resolve(name)?.opChar, `${family}: ${name}`).toBe(opChar);
    }
  });

  it('bakes x1 and x2 into the mnemonic, and NEVER lets a source deck write them', () => {
    // Figure 107 p.105's field diagram: x¹ = channel + overlap (`%` ch1, `⌑` ch2, `@` ch1
    // overlapped, `*` ch2 overlapped), x² = "Type of I/O Unit" (`1` 1402 reader, `2` 1403,
    // `4` 1402 punch, `T` 1415 console). Both come off the MNEMONIC, so the prefix is a fact
    // about the name and nothing a programmer types.
    expect(resolve('R')?.io?.prefix).toBe('%1');
    expect(resolve('R2W')?.io?.prefix).toBe('⌑1');
    expect(resolve('R1WO')?.io?.prefix).toBe('@1');
    expect(resolve('R2WO')?.io?.prefix).toBe('*1');
    expect(resolve('P1W')?.io?.prefix).toBe('%4');
    expect(resolve('W1')?.io?.prefix).toBe('%2');
    expect(resolve('WM2')?.io?.prefix).toBe('⌑2');
    expect(resolve('RCP')?.io?.prefix).toBe('%T');
    expect(resolve('WCPWO')?.io?.prefix).toBe('@T');
    // Every I/O row carries a two-glyph prefix and exactly one of `x3` / `pockets`.
    for (const row of ALL_MNEMONICS.filter((one) => one.io !== undefined)) {
      expect([...(row.io?.prefix ?? '')], row.mnemonic).toHaveLength(2);
      expect(row.io?.x3 === undefined, row.mnemonic).toBe(row.io?.pockets !== undefined);
    }
  });

  it('takes x3 from the stacker pocket on the 1402 and bakes it everywhere else', () => {
    // C28-0309-1 p.23: "A read command must have as the first entry in its operand either the
    // number of the stacker". Figure 107 p.104: read pockets 0/1/2 and 9 = No Stack or Feed;
    // punch pockets 0/4/8. The printer and the console have no pocket — Figure 107's "I/O Unit
    // No. or Specific Operation" is `0` for Write a Line, `1` for Write Word Marks As 1's.
    expect(resolve('R1W')?.io?.pockets).toEqual(['0', '1', '2', '9']);
    expect(resolve('P')?.io?.pockets).toEqual(['0', '4', '8']);
    expect(resolve('W1')?.io?.x3).toBe('0');
    expect(resolve('WM1')?.io?.x3).toBe('1');
    expect(resolve('RCP')?.io?.x3).toBe('0');
    expect(resolve('W1')?.io?.pockets).toBeUndefined();
    expect(resolve('R1W')?.io?.x3).toBeUndefined();
  });

  it('bakes the d the INSTRUCTION column prints — `R` to read, `W` to write', () => {
    // C28-0309-1 pp.47-48's last column, and p.41's converse: a d the PROGRAMMER must supply is
    // marked with a `D` in the operand column, and across pp.41-58 only BCE (p.44) and
    // BBE / BEX1 / BEX2 (p.45) are — all branches, no I/O data transfer.
    for (const name of ['R', 'R1W', 'R2WO', 'RCP', 'RCPWO']) expect(resolve(name)?.d, name).toBe('R');
    for (const name of ['P', 'P1W', 'W', 'W2W', 'WM', 'WM2O', 'WCP', 'WCPW']) {
      expect(resolve(name)?.d, name).toBe('W');
    }
    // …and the row says the TABLE writes it, not the programmer.
    expect(ALL_MNEMONICS.filter((row) => row.io !== undefined && row.dFromOperand)).toEqual([]);
  });

  it('names the channel on the mnemonic — and the omitted digit IS channel 1', () => {
    // Figure 107 p.105's legend: "`(#)` = 1 or 2 for Ch, but the 1 may be omitted", which is why
    // C28-0309-1 p.47 lists `R` and `R1` as two rows of the same instruction.
    expect(resolve('R')?.channel).toBe(1);
    expect(resolve('R1')?.channel).toBe(1);
    expect(resolve('R2')?.channel).toBe(2);
    expect(resolve('R')?.io?.prefix).toBe(resolve('R1')?.io?.prefix);
    // The console printer writes no digit at all and is channel 1.
    expect(resolve('RCP')?.channel).toBe(1);
  });

  it('marks the overlapped AND channel-2 forms unimplemented, and still resolves them (§2.5)', () => {
    // Neither feature is installed: the machine raises `unsupportedFeature` on an `@` or `*` x1
    // and `unimplementedOp('channel2')` on a `⌑` (core/types.ts, wave7-rejections). The
    // assembler assembles the MACHINE, so both still resolve.
    const io = ALL_MNEMONICS.filter((row) => row.io !== undefined);
    expect(io.filter((row) => row.unimplemented).map((row) => row.mnemonic).sort())
      .toEqual(io.filter((row) => row.mnemonic.endsWith('O') || row.channel === 2)
        .map((row) => row.mnemonic).sort());
    // 32 of the 50 I/O rows: 25 overlapped + 14 channel-2 − 7 that are both. Channel 2 was
    // unmarked until 2026-08-31, when the channel moved from the operand onto the mnemonic.
    expect(io).toHaveLength(50);
    expect(io.filter((row) => row.unimplemented)).toHaveLength(32);
    expect(resolve('R1WO')?.unimplemented).toBe(true);
    expect(resolve('R2W')?.unimplemented).toBe(true);
    expect(resolve('R1W')?.unimplemented).toBe(false);
  });

  it('keeps the source `#` name on every generated row, and resolves no literal `#`', () => {
    expect(resolve('R1W')?.sourceName).toBe('RW#');
    expect(resolve('R2WO')?.sourceName).toBe('RW#');
    expect(resolve('R')?.sourceName).toBe('R#');
    expect(resolve('WM2O')?.sourceName).toBe('WM#');
    // The console names are carried in full by `OPS[].autocoder`, so they are their own source.
    expect(resolve('RCPO')?.sourceName).toBe('RCP');
    expect(resolve('RCPWO')?.sourceName).toBe('RCPW');
    for (const name of ['R#', 'RW#', 'P#', 'PW#', 'W#', 'WW#', 'WM#']) {
      expect(resolve(name), name).toBeUndefined();
    }
  });

  it('does NOT generate the punch column-binary rows (io.md §2, a [verified] negative)', () => {
    // C28-0309-1 p.48 lists PB1 / PB2 / PB1O / PB2O at `M %80`, and `io.md` records column binary
    // as a [verified] NEGATIVE result for the 1410 — `X2_DEVICE` has no `8` row to build the
    // prefix out of. The contradiction is recorded in open-questions.md, not resolved here.
    for (const name of ['PB1', 'PB2', 'PB1O', 'PB2O']) expect(resolve(name), name).toBeUndefined();
  });

  it('resolves every mnemonic the demo writes (plan §10)', () => {
    for (const name of ['R1W', 'BEF1', 'BA1', 'W1', 'B', 'CC1', 'H']) {
      expect(resolve(name), name).toBeDefined();
    }
  });
});

// ═══ Shape, the thing pass 1 actually consumes (plan §6.1's ladder) ════════════════════════

describe('asm/mnemonics — the shape the assignment counter reads', () => {
  it('gives R and X lengths [7] and 7 only — no chained 1-character form', () => {
    expect(resolve('BEF1')?.lengths).toEqual([7]);
    expect(resolve('BA1')?.lengths).toEqual([7]);
    expect(resolve('BEX2')?.lengths).toEqual([7]);
  });

  it('gives the L / M I/O family the x-control form and a BAKED d', () => {
    for (const name of ['R1W', 'R2W', 'R1', 'W1', 'P1W', 'W2W', 'WM1', 'RCPW', 'WCP']) {
      const row = resolve(name);
      expect(row?.lengths, name).toEqual([10]);
      expect(row?.xcontrol, name).toBe(true);
      // `xcontrol` is exactly `io !== undefined` — `makeRow` derives it so they cannot drift.
      expect(row?.io, name).toBeDefined();
      expect(row?.d, name).toBeDefined();
      expect(row?.dFromOperand, name).toBe(false);
    }
    // And nothing else in the table carries an x-control field: ops `L` and `M` are the only
    // `lengths: [10]` rows in `OPS` (emit.ts's FORM_SHAPES row 10).
    expect(ALL_MNEMONICS.filter((row) => row.xcontrol !== (row.io !== undefined))).toEqual([]);
  });

  it('carries ANY_LENGTH for NOP as the EMPTY array, the sentinel a naive includes() throws on', () => {
    expect(resolve('NOP')?.lengths).toEqual([]);
    expect(resolve('NOP')?.opChar).toBe('N');
  });

  it('makes the carriage and stacker ops take their d as the only operand', () => {
    for (const name of ['CC1', 'CC2', 'SSF1', 'SSF2']) {
      expect(resolve(name)?.dIsOnlyOperand, name).toBe(true);
      expect(resolve(name)?.lengths, name).toEqual([2]);
      expect(resolve(name)?.d, name).toBeUndefined();
    }
    expect(resolve('CC1')?.opChar).toBe('F');
    expect(resolve('SSF1')?.opChar).toBe('K');
    expect(resolve('SSF2')?.opChar).toBe('4');
  });

  it("sums T's suffix bits and takes G's d from the second letter", () => {
    expect(['LL', 'LE', 'LLE', 'LH', 'LLH', 'LEH'].map((n) => resolve(n)?.d))
      .toEqual(['1', '2', '3', '4', '5', '6']);
    expect(['SAR', 'SBR', 'SER', 'SFR'].map((n) => resolve(n)?.d)).toEqual(['A', 'B', 'E', 'F']);
  });

  // STACKER_MNEMONIC_TAKES_THE_POCKET_AS_ITS_ONLY_OPERAND exists because an earlier plan draft
  // folded `K` / `4` under the carriage rule, which would have left SSF1 / SSF2 unresolvable. The
  // constant records the ruling; this asserts the thing the ruling turns on — that Select Stacker
  // and Feed reads its own inline three-key `dModifiers` and NOT the carriage's 30-row table
  // (plan §7.4, §15; A22-0526-3 pp.62-63 for the pockets, p.81 Figure 90 for the carriage).
  it('keeps Select Stacker and Feed off the carriage d-table: three pockets, not 30 channels', () => {
    const POCKETS = { '0': 'pocket NR', '1': 'pocket 1', '2': 'pocket 8-2' };

    const k = opByChar('K');                                   // 0o42, SSF1
    const four = ALL_OPS.find((op) => op.octal === 0o4);        // 0o4, SSF2 — keyed on the octal
    expect(four?.opChar).toBe('4');
    expect(k?.autocoder).toEqual(['SSF1']);
    expect(four?.autocoder).toEqual(['SSF2']);
    expect(k?.forms[0]?.dModifiers).toEqual(POCKETS);
    expect(four?.forms[0]?.dModifiers).toEqual(POCKETS);

    // Not the carriage table: three keys against thirty, and the one key they share means a
    // different thing on each. `CC1 1` is "immediate skip to channel 1"; `SSF1 1` is "pocket 1".
    const carriageKeys = new Set(CARRIAGE_D_TABLE.map((row) => row.d));
    expect(carriageKeys.size).toBe(30);
    expect(new Set(Object.keys(POCKETS))).not.toEqual(carriageKeys);
    expect(CARRIAGE_D_TABLE.find((row) => row.d === '1')?.meaning).toBe('immediate skip to channel 1');
    expect(POCKETS['1']).toBe('pocket 1');

    // And the carriage ops really do read the carriage table, so the two families are not merely
    // described as separate — they resolve off different d sources.
    const carriageMods = opByChar('F')?.forms[0]?.dModifiers;
    expect(typeof carriageMods === 'string' ? new Set<string>() : new Set(Object.keys(carriageMods ?? {})))
      .toEqual(carriageKeys);
  });

  it('resolves the Autocoder/machine collision on the mnemonic, not the character', () => {
    expect(resolve('M')?.opChar).toBe('@');    // Autocoder M = Multiply
    expect(resolve('D')?.opChar).toBe('%');    // Autocoder D = Divide
    expect(resolve('MLC')?.opChar).toBe('D');  // machine D = Move
  });
});
