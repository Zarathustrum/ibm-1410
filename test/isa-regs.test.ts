// Tier 0 — the Figure 8 register-expression interpreter (plan §7, opcodes.md §1.3).
// Every member of the RegExpr union is evaluated against one fixed symbol set, so a
// missing case in isa/regs.ts fails here rather than as a wrong address in Wave 3.

import { describe, it, expect } from 'vitest';

import { applyRegs, evalReg } from '../src/core/isa/regs.js';
import type { RegExpr, RegSymbols, RegTriple } from '../src/core/types.js';

// Deliberately spread apart so that every expression below has a distinct value: an
// off-by-one or a swapped symbol cannot coincide with the right answer.
const SYM: RegSymbols = {
  A: 1000, B: 2000, Ap: 3000, Bp: 4000,
  LA: 5, LB: 7, LW: 5,
  NSI: 100, NSIB: 200, BI: 300,
};

// Every member of the RegExpr union in types.ts, with its Figure 8 meaning.
const CASES: ReadonlyArray<readonly [RegExpr, number | 'special']> = [
  ['NSI', 100],
  ['NSIB', 200],
  ['BI', 300],
  ['A', 1000],
  ['B', 2000],
  ['Ap', 3000],
  ['Bp', 4000],
  ['special', 'special'],
  ['B+LB+1', 2008],   // M / L — opcodes.md §2 pp.40-41, io.md §8
  ['Ap-1', 2999],     // chained Set / Clear Word Mark — §2 p.22
  ['Bp-1', 3999],
  ['A+1', 1001],
  ['A-1', 999],
  ['A+LA', 1005],
  ['A-LA', 995],
  ['A+LB', 1007],
  ['A-LB', 993],
  ['A+LW', 1005],
  ['A-LW', 995],
  ['B+1', 2001],
  ['B-1', 1999],
  ['B+LA', 2005],
  ['B-LA', 1995],
  ['B+LB', 2007],
  ['B-LB', 1993],
  ['B+LW', 2005],
  ['B-LW', 1995],
];

describe('isa/regs.ts evaluates the Figure 8 notation', () => {
  it('covers all 27 members of the RegExpr union', () => {
    expect(new Set(CASES.map(([e]) => e)).size).toBe(27);
  });

  for (const [expr, expected] of CASES) {
    it(`evaluates '${expr}'`, () => {
      expect(evalReg(expr, SYM)).toBe(expected);
    });
  }

  it("passes 'special' straight through — the executor sets that register itself", () => {
    expect(evalReg('special', SYM)).toBe('special');
    expect(applyRegs({ iar: 'NSI', aar: 'A-LA', bar: 'special' }, SYM)).toEqual({
      iar: 100, aar: 995, bar: 'special',
    });
  });

  it('applies a whole triple — the `A` two-field row, NSI / A-LW / B-LB', () => {
    const regs: RegTriple = { iar: 'NSI', aar: 'A-LW', bar: 'B-LB' };
    expect(applyRegs(regs, SYM)).toEqual({ iar: 100, aar: 995, bar: 1993 });
  });

  it('applies the chained Set Word Mark triple, NSI / Ap-1 / Bp-1', () => {
    const regs: RegTriple = { iar: 'NSI', aar: 'Ap-1', bar: 'Bp-1' };
    expect(applyRegs(regs, SYM)).toEqual({ iar: 100, aar: 2999, bar: 3999 });
  });

  it('applies the console write triple, NSI / Ap / B+LB+1', () => {
    const regs: RegTriple = { iar: 'NSI', aar: 'Ap', bar: 'B+LB+1' };
    expect(applyRegs(regs, SYM)).toEqual({ iar: 100, aar: 3000, bar: 2008 });
  });

  it('throws on an unknown expression rather than evaluating to 0', () => {
    expect(() => evalReg('C-LZ' as RegExpr, SYM)).toThrow(/unknown RegExpr/);
    expect(() => evalReg('' as RegExpr, SYM)).toThrow(/unknown RegExpr/);
  });
});
