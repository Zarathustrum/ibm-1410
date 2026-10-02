// Tier 0 — the pseudo-operation in/out PARTITION, sliced off the research itself
// (docs/plans/phase-3-autocoder.md §2.2, wave 1).
//
// Every OPERATION in `software.md` §6's table appears in the scope table below exactly once.
// This file slices §6's own markdown and asserts that partition, so the scope decision itself
// is machine-checked and mid-build creep fails a gate instead of surviving a review. It lands
// in wave 1 because it needs only `software.md` §6 and the §2.2 table — no `src/asm` module at
// all — so the plan's scope gate is live from the first commit (plan §11, wave 1).
//
// THE SPLITTING RULE, because "row" and "operation" are not the same unit. §6's Op cells are
// slash-joined (`DCW / DC / DS / DA / EQU`, `ORG / LTORG / END`, …), so the test splits each Op
// cell on `/` and trims. THE OS COLUMN IS NEVER READ, which is why `HEADR` is not a row at all:
// it is a cell in the OS column of the JOB row. It is out of scope for the same reason as the
// other OS names, and it is asserted absent below so nobody looks for it as a §6 name.
//
// THE TWO NAMED ALLOWANCES. Two families are carried that are NOT §6 rows at all:
// `EXTRA_ROWS` (the macros and IOCS, from `software.md` §7's PROSE) and `SUFFIX_RULINGS` (three
// rulings keyed on an operand SUFFIX rather than on an operation). Without them the partition
// either counts names §6 never printed, or counts the suffix rulings as unmatched rows.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { STANDALONE_HAS_NO_NOP_PSEUDO_OP } from '../src/asm/mnemonics.js';

// This file lives at <repo>/test/asm-pseudo-ops.test.ts.
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SOFTWARE_MD = readFileSync(join(REPO_ROOT, 'docs/research/software.md'), 'utf8');

// ═══ The slicer — header at software.md:145, thirteen body rows at 147-159 ═════════════════

const SECTION_6_START = '## 6. Pseudo-ops and control statements';
const SECTION_6_END = '## 7. Macros';
const OP_COLUMN = 0;
/** Op | Standalone C28-0309-1 | OS C28-0326-1 | Function. */
const CELLS_PER_ROW = 4;
const BODY_ROWS = 13;

function section6OpNames(md: string): { rows: number; names: string[] } {
  const start = md.indexOf(SECTION_6_START);
  if (start < 0) throw new Error(`software.md: heading "${SECTION_6_START}" not found`);
  const end = md.indexOf(SECTION_6_END, start);
  if (end < 0) throw new Error(`software.md: "${SECTION_6_END}" not found after §6`);

  let rows = 0;
  const names: string[] = [];
  for (const line of md.slice(start, end).split('\n')) {
    if (!line.startsWith('| ')) continue;               // prose, and the |---|---| separator
    const parts = line.split('|');
    const cells = parts.slice(1, parts.length - 1).map((c) => c.trim());
    if (cells[0] === 'Op') continue;                    // the header
    // THE TRIPWIRE: a future column change must stop this file, not be absorbed by it.
    if (cells.length !== CELLS_PER_ROW) {
      throw new Error(
        `software.md §6 row yielded ${cells.length} cells, expected ${CELLS_PER_ROW}:\n${line}`,
      );
    }
    rows += 1;
    const cell = cells[OP_COLUMN] ?? '';
    for (const name of cell.split('/')) {
      const trimmed = name.trim();
      if (trimmed !== '') names.push(trimmed);
    }
  }
  return { rows, names };
}

const SECTION_6 = section6OpNames(SOFTWARE_MD);

// ═══ §2.2's table, transcribed as DATA so the partition can be machined ════════════════════

interface ScopeRow {
  /** The §6 operation names this row rules on. */
  readonly names: readonly string[];
  readonly inScope: boolean;
  readonly ruling: string;
}

const PSEUDO_OPS: readonly ScopeRow[] = [
  { names: ['DCW'], inScope: true, ruling: 'constant with a word mark on the high-order position (software.md §5)' },
  { names: ['DC'], inScope: true, ruling: 'same, no word mark; under load-mode loading it clears marks over its own extent ([likely])' },
  { names: ['DS'], inScope: true, ruling: 'reserves positions, emits nothing, and does NOT clear the area (software.md §5, C28-0326-2 p.30)' },
  { names: ['DA'], inScope: true, ruling: 'minimal: header `b X l`, `hi,lo` sub-entries and the bare-`lo` subfield (software.md §5)' },
  { names: ['EQU'], inScope: true, ruling: 'three of four forms; the tape-unit / X-control form is out (EQU_TO_AN_XCONTROL_FIELD_IS_OUT, §15)' },
  { names: ['ORG'], inScope: true, ruling: 'actual / previously-defined symbolic / blank / `*`; default origin 00500 (software.md §2)' },
  { names: ['LTORG'], inScope: true, ruling: 'flushes the pool at the operand address, in encounter order (software.md §3)' },
  { names: ['END'], inScope: true, ruling: 'operand names the entry point -> ObjectDeck.entry; also flushes the pool (software.md §6)' },
  { names: ['JOB'], inScope: true, ruling: 'listing heading; its OWN cols 76-80 become the object deck ident (JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80, §15)' },
  { names: ['CTL'], inScope: true, ruling: 'core size from card column 22, suppress from column 23; absent = 20K (software.md §6, [verified])' },
  { names: ['RUN'], inScope: true, ruling: 'first card; the mode word is in the LABEL field. `AUTOCODER` assembles; `SYSTEMS` flags F (no library, no tape)' },
  { names: ['LOAD'], inScope: true, ruling: '"a load program should precede the object deck" = loaderDeck(); Phase 2 shipped one (software.md §6)' },
  { names: ['EJECT'], inScope: true, ruling: 'skip to channel 1 in the listing; the renderer turns it into a form feed' },
  { names: ['RESEQ'], inScope: true, ruling: 'resets the object-deck sequence to 001 and changes the ident (software.md §6, [verified])' },
  { names: ['PST'], inScope: true, ruling: 'prints the symbol table at the end of the listing' },

  { names: ['EX', 'XFR'], inScope: false, ruling: 'O — execute during load; depends on LOADER_LOOPS_BACK_PAST_THE_RE_ENTRY_SLOT, an [unverified] Phase-2 constant with no source' },
  { names: ['SFX'], inScope: false, ruling: 'O — label suffixing exists to keep macro-library labels distinct; no macros, no library (software.md §6)' },
  {
    names: ['NOP', 'NOPWM'],
    inScope: false,
    ruling:
      'O — software.md §6\'s own footnote: the row was not confirmed against C28-0309-1\'s op tables '
      + '(STANDALONE_HAS_NO_NOP_PSEUDO_OP, §15). The IMPERATIVE NOP (machine op N) is IN and needs no '
      + 'pseudo-op ruling at all; only the program-switch pseudo-op is out',
  },
  {
    names: ['DAV', 'RSV', 'SPEND', 'TITLE', 'BASE1', 'BASE2', 'CALL', 'DEFIN', 'PRTCT', 'DCWF', 'DCWS'],
    inScope: false,
    ruling:
      'O — the eleven OS Autocoder / Linkage Loader names, software.md §6\'s own rows. CALL IS HERE, '
      + 'not with the macros: it is simultaneously a Linkage-Loader operation in §6 and a macro-library '
      + 'call in §7, and this row is the one that owns it, so the partition counts it exactly once. The '
      + 'OS emits RELOCATABLE cards needing a relocating loader we have no reason to build (software.md §8.2)',
  },
];

/**
 * Two families that are NOT in §6 at all, carried with their citation: `software.md` §7's PROSE
 * rather than §6's table. `CALL` is DELIBERATELY not on this list — it is a §6 Op-cell name
 * (`software.md:158`) as well as a §7 macro-library call, so filing it under a "not a §6 row"
 * allowance would make the partition assertion false on its first run. The OS out row owns it.
 */
const EXTRA_ROWS: readonly ScopeRow[] = [
  {
    names: ['MATH', 'BOOL', 'COMP', 'NOTE', 'MEND', 'INCLD', 'DELET', 'INSER'],
    inScope: false,
    ruling: 'O — macros. No macro processor, no library: this configuration has no tape (software.md §7; plan §2.3)',
  },
  {
    names: ['GET', 'PUT', 'DTF', 'OPEN', 'CLOSE'],
    inScope: false,
    ruling: 'O — IOCS, from the 1410-IO-926 package (software.md §7; plan §2.3)',
  },
];

/**
 * Three rows keyed on an operand SUFFIX rather than on an operation. They are sub-rulings of the
 * DCW / DC / DA rows, which already match those names, so the partition excludes them by name.
 * Without this list the test counts them as three unmatched rows and fails (plan §2.2).
 */
interface SuffixRuling {
  /** The §6 operation(s) the ruling rides on — each already matched by a PSEUDO_OPS row. */
  readonly on: readonly string[];
  readonly suffixes: readonly string[];
  readonly ruling: string;
}

const SUFFIX_RULINGS: readonly SuffixRuling[] = [
  {
    on: ['DA'],
    suffixes: [',G', ',#'],
    ruling:
      'F — `,G` emits a word-marked group mark, which encodeObjectRecord refuses by design '
      + '(OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK, plan §2.4). `,#` is out on SCOPE, not on format: '
      + 'record marks ARE loaded at object time and encode without complaint, but nothing in Phases 3, '
      + '5 or 6 defines a blocked area that needs one. The flag does not un-reserve the area '
      + '(FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS, §15)',
  },
  {
    on: ['DA'],
    suffixes: [',0', ',N'],
    ruling: 'F — `,N` is OS-only (C28-0326-2 p.25, not documented for C28-0309-1); `,0` relative-to-zero has no consumer',
  },
  {
    on: ['DCW', 'DC'],
    suffixes: [',G'],
    ruling: 'F — same encoder rejection as the DA `,G` row (plan §2.4)',
  },
];

// ═══ The partition ═════════════════════════════════════════════════════════════════════════

const SECTION_6_NAMES = SECTION_6.names;
const SCOPE_NAMES = PSEUDO_OPS.flatMap((row) => [...row.names]);

describe('asm/pseudo-ops — software.md §6 yields the 31 names the partition is over', () => {
  it('slices thirteen body rows', () => {
    expect(SECTION_6.rows).toBe(BODY_ROWS);
  });

  it('yields 31 operation names, all distinct, by splitting every Op cell on "/"', () => {
    expect(SECTION_6_NAMES.length).toBe(31);
    expect(new Set(SECTION_6_NAMES).size).toBe(31);
  });

  it('never reads the OS column — HEADR is a cell there, not a §6 row', () => {
    expect(SECTION_6_NAMES).not.toContain('HEADR');
    // Proof the OS column really is present in the source and really is being skipped.
    expect(SOFTWARE_MD.slice(SOFTWARE_MD.indexOf(SECTION_6_START))).toContain('— (HEADR)');
  });
});

describe('asm/pseudo-ops — §2.2\'s partition: 15 in, 16 out, each matched exactly once', () => {
  it('splits 15 / 16, and 15 + 16 = 31', () => {
    const inNames = PSEUDO_OPS.filter((r) => r.inScope).flatMap((r) => [...r.names]);
    const outNames = PSEUDO_OPS.filter((r) => !r.inScope).flatMap((r) => [...r.names]);
    expect(inNames.length).toBe(15);
    expect(outNames.length).toBe(16);
    expect(inNames.length + outNames.length).toBe(31);
    expect(inNames.sort()).toEqual([
      'CTL', 'DA', 'DC', 'DCW', 'DS', 'EJECT', 'END', 'EQU', 'JOB',
      'LOAD', 'LTORG', 'ORG', 'PST', 'RESEQ', 'RUN',
    ]);
    expect(outNames.sort()).toEqual([
      'BASE1', 'BASE2', 'CALL', 'DAV', 'DCWF', 'DCWS', 'DEFIN', 'EX',
      'NOP', 'NOPWM', 'PRTCT', 'RSV', 'SFX', 'SPEND', 'TITLE', 'XFR',
    ]);
  });

  it('matches every §6 name by exactly one scope row', () => {
    const unmatched: string[] = [];
    const multiplyMatched: string[] = [];
    for (const name of SECTION_6_NAMES) {
      const hits = PSEUDO_OPS.filter((row) => row.names.includes(name));
      if (hits.length === 0) unmatched.push(name);
      if (hits.length > 1) multiplyMatched.push(name);
    }
    expect({ unmatched, multiplyMatched }).toEqual({ unmatched: [], multiplyMatched: [] });
  });

  it('invents no name: every scope-table name is a §6 name', () => {
    const invented = SCOPE_NAMES.filter((name) => !SECTION_6_NAMES.includes(name)).sort();
    expect(invented).toEqual([]);
    expect(SCOPE_NAMES.length).toBe(31);
    expect(new Set(SCOPE_NAMES).size).toBe(31);
  });

  it('gives every row a ruling with its citation', () => {
    expect([...PSEUDO_OPS, ...EXTRA_ROWS].filter((row) => row.ruling.trim() === '')).toEqual([]);
  });
});

describe('asm/pseudo-ops — the two named allowances, and nothing else', () => {
  it('EXTRA_ROWS are §7 PROSE families, none of them a §6 name', () => {
    const extraNames = EXTRA_ROWS.flatMap((row) => [...row.names]);
    expect(extraNames.length).toBe(13);
    const wronglyInSection6 = extraNames.filter((name) => SECTION_6_NAMES.includes(name)).sort();
    expect(wronglyInSection6).toEqual([]);
  });

  it('deliberately keeps CALL out of EXTRA_ROWS — the OS out row owns it', () => {
    // CALL is a §6 Op-cell name (software.md:158) AND a §7 macro-library call. Filing it under a
    // "not a §6 row" allowance would make the partition assertion false on its first run.
    expect(EXTRA_ROWS.flatMap((row) => [...row.names])).not.toContain('CALL');
    expect(SECTION_6_NAMES).toContain('CALL');
    const owners = PSEUDO_OPS.filter((row) => row.names.includes('CALL'));
    expect(owners.length).toBe(1);
    expect(owners[0]?.inScope).toBe(false);
  });

  it('SUFFIX_RULINGS key on a suffix, so they add no name to the partition', () => {
    expect(SUFFIX_RULINGS.length).toBe(3);
    for (const ruling of SUFFIX_RULINGS) {
      for (const op of ruling.on) {
        // The operation the ruling rides on is already a §6 name matched by a scope row.
        expect(SECTION_6_NAMES, op).toContain(op);
        expect(PSEUDO_OPS.filter((row) => row.names.includes(op)).length, op).toBe(1);
      }
      for (const suffix of ruling.suffixes) {
        expect(suffix.startsWith(','), suffix).toBe(true);
        expect(SECTION_6_NAMES, suffix).not.toContain(suffix);
      }
    }
    expect(SUFFIX_RULINGS.flatMap((r) => [...r.suffixes])).toEqual([',G', ',#', ',0', ',N', ',G']);
  });

  it('accounts for every §6 name with the scope table alone — the allowances add none', () => {
    const accounted = new Set(SCOPE_NAMES);
    const leftOver = SECTION_6_NAMES.filter((name) => !accounted.has(name)).sort();
    expect(leftOver).toEqual([]);
  });
});

describe('asm/pseudo-ops — the NOP ruling, which reverses a recorded research default', () => {
  it('takes STANDALONE_HAS_NO_NOP_PSEUDO_OP from mnemonics.ts, where the constant lives', () => {
    expect(STANDALONE_HAS_NO_NOP_PSEUDO_OP).toBe(true);
    const row = PSEUDO_OPS.find((r) => r.names.includes('NOP'));
    expect(row?.inScope).toBe(false);
    expect(row?.names).toEqual(['NOP', 'NOPWM']);
    expect(row?.ruling).toContain('STANDALONE_HAS_NO_NOP_PSEUDO_OP');
  });

  it('reads the footnote that the ruling rests on, verbatim from software.md §6', () => {
    expect(SOFTWARE_MD).toContain(
      'The NOP/NOPWM row for the standalone assembler was not confirmed against C28-0309-1',
    );
  });
});
