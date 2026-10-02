// Tier 0 — the transcribed instruction table (plan §7).
// Asserts that src/core/isa/table.ts still matches opcodes.md §2 and §1.1 on every
// column a machine can check. The prose columns are checked only for presence; the
// row-for-row wording diff is a human's job, which is why the table is shaped for it.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_OPS, ANY_LENGTH, OPS, opByChar, selectForm } from '../src/core/isa/table.js';
import type { OpEntry } from '../src/core/types.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

interface LengthsFixture {
  source: string;
  lengths: Record<string, number[] | 'any'>;
}
const LENGTHS = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/lengths.json'), 'utf8'),
) as LengthsFixture;

/** opcodes.md §2, in the order it prints them: BCD collating order, octal ascending. */
const SECTION_2_ORDER = [
  '2', '4', '=', '@', '/', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', ',', '%', 'J',
  'K', 'L', 'M', 'N', 'P', 'Q', 'R', '!', '$', 'A', 'B', 'C', 'D', 'E', 'F', 'G',
  '?', '.', '⌑',
];

/** opcodes.md §1.4, verbatim: the CE Handbook ALD grouping objectives. */
const ADDRESS_DOUBLE = ['A', 'S', '?', '!', ',', '⌑', '/', 'J', 'R', 'X'];

function unionLengths(entry: OpEntry): number[] | 'any' {
  if (entry.forms.some((f) => f.lengths.length === 0)) return 'any';
  const all = new Set<number>();
  for (const form of entry.forms) for (const n of form.lengths) all.add(n);
  return [...all].sort((a, b) => a - b);
}

describe('isa/table.ts mirrors opcodes.md §2', () => {
  it('carries every §2 op character, in §2 order', () => {
    expect(ALL_OPS.map((e) => e.opChar)).toEqual(SECTION_2_ORDER);
  });

  it('has 35 op characters over 42 §2 rows', () => {
    expect(ALL_OPS.length).toBe(35);
    // opcodes.md §2 prints 42 rows. This table carries 46 OpForms: one per §2 row, plus
    // two extra each for `,` and `⌑`, whose single §2 row prints THREE distinct register
    // results (two-address / one-address / chained) that a single OpForm cannot hold
    // (plan §4.2 "`,`/`⌑` get three rows, not one"). 42 + 2 + 2 = 46.
    const forms = ALL_OPS.reduce((n, e) => n + e.forms.length, 0);
    expect(forms).toBe(46);
  });

  it('round-trips through OPS[octal] and opByChar', () => {
    let defined = 0;
    for (let i = 0; i < 64; i++) if (OPS[i] !== undefined) defined++;
    expect(defined).toBe(35);
    for (const entry of ALL_OPS) {
      expect(OPS[entry.octal]).toBe(entry);
      expect(opByChar(entry.opChar)).toBe(entry);
    }
  });

  it('matches oracle/lengths.json on every op §1.1 lists', () => {
    for (const [opChar, expected] of Object.entries(LENGTHS.lengths)) {
      const entry = opByChar(opChar);
      expect(entry, `no table entry for op ${opChar}`).toBeDefined();
      expect(unionLengths(entry!), `lengths for op ${opChar}`).toEqual(expected);
    }
  });

  it('has the address-double set exactly A S ? ! , ⌑ / J R X', () => {
    const doubled = ALL_OPS.filter((e) => e.addressDouble).map((e) => e.opChar).sort();
    expect(doubled).toEqual([...ADDRESS_DOUBLE].sort());
  });

  // architecture.md §4.5: chainable adds no gate the length table lacks; it is carried as
  // a redundancy check on the two columns. `N` is the exception on the plan's own data —
  // §1.2 lists it percent-type while the §2 N row gives lengths "any", so 1 ∈ lengths and
  // a 1-character `N` is a legal NOP, not a chained op.
  it('redundancy: chainable === false && opChar !== N  ⇒  1 ∉ lengths', () => {
    for (const entry of ALL_OPS) {
      // Two exclusions. `N` is the plan's own named exception (above). `=` is not a 1410
      // instruction at all and opcodes.md §2 prints "—" in its Lengths column, so its
      // ANY_LENGTH is "unstated", not "every length is legal" — see the PLAN-DEVIATION
      // note on the `=` row in table.ts.
      if (entry.chainable || entry.opChar === 'N' || entry.opChar === '=') continue;
      expect(selectForm(entry, 1), `op ${entry.opChar} accepts length 1`).toBeUndefined();
    }
  });

  it('a 1-character chained J is a legal form', () => {
    const j = opByChar('J')!;
    expect(selectForm(j, 1)).toBeDefined();
    expect(selectForm(j, 7)).toBeDefined();
    expect(selectForm(j, 6)).toBeUndefined();
  });

  it('R and X are length 7 only — they reject 1 and 6', () => {
    for (const opChar of ['R', 'X']) {
      const entry = opByChar(opChar)!;
      expect(selectForm(entry, 7), `${opChar} at 7`).toBeDefined();
      expect(selectForm(entry, 1), `${opChar} at 1`).toBeUndefined();
      expect(selectForm(entry, 6), `${opChar} at 6`).toBeUndefined();
    }
  });

  it('D and T reject 2, 7 and 11 (SimH latitude, not 1410 behaviour)', () => {
    for (const opChar of ['D', 'T']) {
      const entry = opByChar(opChar)!;
      for (const good of [1, 6, 12]) {
        expect(selectForm(entry, good), `${opChar} at ${good}`).toBeDefined();
      }
      for (const bad of [2, 7, 11]) {
        expect(selectForm(entry, bad), `${opChar} at ${bad}`).toBeUndefined();
      }
    }
  });

  it('N accepts any length via the ANY_LENGTH sentinel', () => {
    const n = opByChar('N')!;
    expect(ANY_LENGTH).toEqual([]);
    for (const len of [1, 2, 3, 5, 12, 40]) expect(selectForm(n, len)).toBeDefined();
  });

  // The "`@ % T Z E` are `implemented: false` with NO feature" case is gone: it named a phase
  // boundary and had to be narrowed every time a Phase 1b wave landed a row, and Wave D landed `E`,
  // the last of the five. What stands in its place is its GENERALISED INVERSE, which carries no
  // wave in it — after 1b an unimplemented row without a feature tag is a bug, not a phase
  // boundary (phase-1b.md §4 Wave E, §7 criterion 5).
  it('no row is unimplemented without a feature tag (plan §7 criterion 5)', () => {
    expect(ALL_OPS.every((e) => e.implemented || e.feature !== undefined)).toBe(true);
    // `every` prints only `false` when it goes red; name the rows that broke it.
    const orphans = ALL_OPS
      .filter((e) => !e.implemented && e.feature === undefined)
      .map((e) => e.opChar);
    expect(orphans).toEqual([]);
  });

  it('the feature ops carry their tag and are all unimplemented', () => {
    const expected: Record<string, string> = {
      Y: 'priority',
      U: 'tape',
      '2': 'channel2',
      '4': 'channel2',
      X: 'channel2',
      P: 'micr',
      Q: 'micr',
      $: '7010only',
      '=': '7010only',
    };
    for (const [opChar, feature] of Object.entries(expected)) {
      const entry = opByChar(opChar)!;
      expect(entry.feature, `${opChar}.feature`).toBe(feature);
      expect(entry.implemented, `${opChar}.implemented`).toBe(false);
    }
    // and nothing else claims a feature
    const tagged = ALL_OPS.filter((e) => e.feature !== undefined).map((e) => e.opChar).sort();
    expect(tagged).toEqual(Object.keys(expected).sort());
    for (const entry of ALL_OPS) {
      if (entry.feature !== undefined) expect(entry.implemented).toBe(false);
    }
  });

  it('every form carries a citation, prose semantics, a terminator and a timing function', () => {
    for (const entry of ALL_OPS) {
      expect(entry.forms.length, `${entry.opChar} has no forms`).toBeGreaterThan(0);
      for (const form of entry.forms) {
        expect(form.cite.length, `${entry.opChar} cite`).toBeGreaterThan(0);
        expect(form.cite, `${entry.opChar} cite`).toMatch(/opcodes\.md §2/);
        expect(form.semantics.length, `${entry.opChar} semantics`).toBeGreaterThan(0);
        expect(form.terminatesOn.length, `${entry.opChar} terminatesOn`).toBeGreaterThan(0);
        expect(typeof form.timing, `${entry.opChar} timing`).toBe('function');
        expect(typeof form.exec, `${entry.opChar} exec`).toBe('function');
      }
    }
  });

  it('regsNotTaken is present exactly on J R X B W V', () => {
    const withNotTaken = ALL_OPS.filter((e) =>
      e.forms.some((f) => f.regsNotTaken !== undefined),
    ).map((e) => e.opChar).sort();
    expect(withNotTaken).toEqual(['B', 'J', 'R', 'V', 'W', 'X'].sort());
  });

  it('the unconditional branch forms print a taken result only — no regsNotTaken', () => {
    // `/` at L=11 (Clear Storage and Branch), `.` at L=6 (Halt and Branch) and the blank-d
    // `J` all branch unconditionally, so opcodes.md §2 prints one register result, not two.
    const slash11 = opByChar('/')!.forms.find((f) => f.lengths.includes(11))!;
    expect(slash11.regs).toEqual({ iar: 'NSIB', aar: 'BI', bar: 'NSIB' });
    expect(slash11.regsNotTaken).toBeUndefined();

    const halt6 = opByChar('.')!.forms.find((f) => f.lengths.includes(6))!;
    expect(halt6.regs).toEqual({ iar: 'NSIB', aar: 'BI', bar: 'NSIB' });
    expect(halt6.regsNotTaken).toBeUndefined();

    const jUncond = opByChar('J')!.forms[0]!;
    expect(jUncond.regsNotTaken).toBeUndefined();
    expect(opByChar('J')!.forms[1]!.regsNotTaken).toEqual({ iar: 'NSI', aar: 'BI', bar: 'BI' });
  });

  it('the two-address branches position a chained retest one position lower (bar: B-1)', () => {
    for (const opChar of ['B', 'W', 'V']) {
      const form = opByChar(opChar)!.forms[0]!;
      expect(form.regsNotTaken, `${opChar} not taken`).toEqual({
        iar: 'NSI', aar: 'BI', bar: 'B-1',
      });
    }
  });

  // Wave 1 (plan §5) built the flow-chart step 1-4 executors: `N`, `.`, `J`, `V`, `,`, `⌑`.
  // Wave 2 added step 5, "type ident": `M`, `L` and `R`.
  // Wave 3 adds flow-chart steps 6-11: `G` Store Address Register, `W` Branch if Bit Equal,
  // `A` and `S` with the units/body/extension scan, and `/` Clear Storage (both rows).
  // Wave 4 adds step 12-13: `B` Branch if Character Equal and the compare latches it shares.
  // Wave 5 adds steps 14-16: `C` Compare and `D` Move/Scan with all 64 d-characters.
  // Wave 6 adds `?` Zero and Add and `!` Zero and Subtract, which reuse the Wave-3 pass.
  // Phase 1b (merged first) completed this list for the CPU ops: exactly the ops in `ALL_OPS`
  // outside `DEVICE_DEFERRED` that carry no `feature` (asserted below, phase-1b plan §7
  // criterion 5). Phase 2 moves the device-control ops across both lists as their waves land:
  // wave 2 added `K` Select Stacker and Feed; wave 3 adds `F` Carriage Control, against the
  // 1403 and the same `Channel.control`. What the loud-stub case still guards is a table row
  // claiming an executor that does not exist, which fails here, not at run time.
  const BUILT_SO_FAR: readonly string[] =
    ['N', '.', 'J', 'V', ',', '⌑', 'M', 'L', 'R', 'A', 'S', 'G', 'W', '/', 'C', 'B', 'D', '?', '!',
      '@', '%', 'T', 'Z', 'E', 'K', 'F'];

  // Base-machine ops whose DEVICE is not built. `U` tape is the only one left: it raises
  // `UnimplementedOp` carrying the manual page that specifies the missing behaviour, which is a
  // different and louder failure than the placeholder (plan §1 "Out"; io.md §9).
  //
  // `K` and `F` ARE BUILT — Phase 2 wave 2 landed Select Stacker and Feed against the 1402 and
  // wave 3 landed Carriage Control against the 1403, both through `Channel.control` — and both
  // are in `BUILT_SO_FAR` above, which the loop below consults FIRST. This is the one-line edit
  // Phase 2 §3 predicted for wave 3.
  const DEVICE_DEFERRED: readonly string[] = ['U'];

  // Redundancy on the two lists above, so a row that loses its `feature` tag in a later phase
  // cannot quietly drop out of the loud-stub case's coverage by being absent from BUILT_SO_FAR.
  it('BUILT_SO_FAR is exactly the un-featured ops outside DEVICE_DEFERRED (§7 criterion 5)', () => {
    const owed = ALL_OPS
      .filter((e) => !DEVICE_DEFERRED.includes(e.opChar) && e.feature === undefined)
      .map((e) => e.opChar);
    expect([...BUILT_SO_FAR].sort()).toEqual([...owed].sort());
  });

  it('every executor a later wave still owes is a loud stub', () => {
    for (const entry of ALL_OPS) {
      if (BUILT_SO_FAR.includes(entry.opChar)) continue;
      const expected = DEVICE_DEFERRED.includes(entry.opChar)
        ? /is not implemented/
        : /executor not built yet/;
      for (const form of entry.forms) {
        expect(() => form.exec({ fetched: { opAddr: 0 } } as never), entry.opChar).toThrow(expected);
      }
    }
  });
});
