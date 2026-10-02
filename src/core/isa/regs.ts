// src/core/isa/regs.ts — the interpreter for the `RegExpr` strings carried in every
// isa/table.ts row's `regs` / `regsNotTaken` column.
//
// The notation is the manual's own: A22-0526-3 Figure 8, p.13, transcribed at
// opcodes.md §1.3. The symbol set is exactly
//   NSI   address of the next sequential instruction
//   BI    branch-to address (the next instruction address when a branch is taken)
//   NSIB  address of the instruction following a taken branch (not executed)
//   LA/LB number of characters in the A- / B-field
//   LW    number of characters in the A- or B-field, WHICHEVER IS SHORTER
//   Ap/Bp previous contents of AAR / BAR
//   A/B   the A- and B-addresses of this instruction
// so `A-LW`, `B+LB+1` and `Ap-1` here mean what they mean on the printed page. Keeping
// the effect as data rather than as assignments inside executors is what makes the table
// diffable against opcodes.md §2 by eye (plan §4.2).

import type { Addr, RegExpr, RegSymbols, RegTriple } from '../types.js';

/** What one row's register column evaluates to. `'special'` = the executor sets it itself. */
export interface AppliedRegs {
  iar: Addr | 'special';
  aar: Addr | 'special';
  bar: Addr | 'special';
}

/**
 * Evaluate one Figure 8 expression. Exhaustive over the `RegExpr` union — a string that
 * is not a member throws rather than quietly evaluating to 0, because a silent 0 here is
 * an address-register bug that surfaces a hundred instructions later.
 */
export function evalReg(expr: RegExpr, sym: RegSymbols): Addr | 'special' {
  switch (expr) {
    case 'special':
      return 'special';

    // Bare symbols
    case 'NSI':
      return sym.NSI;
    case 'NSIB':
      return sym.NSIB;
    case 'BI':
      return sym.BI;
    case 'A':
      return sym.A;
    case 'B':
      return sym.B;
    case 'Ap':
      return sym.Ap;
    case 'Bp':
      return sym.Bp;

    // Chained Set / Clear Word Mark — opcodes.md §2 p.22
    case 'Ap-1':
      return sym.Ap - 1;
    case 'Bp-1':
      return sym.Bp - 1;

    // `M` / `L` console and device writes — opcodes.md §2 pp.40-41, io.md §8
    case 'B+LB+1':
      return sym.B + sym.LB + 1;

    // A ± term
    case 'A+1':
      return sym.A + 1;
    case 'A-1':
      return sym.A - 1;
    case 'A+LA':
      return sym.A + sym.LA;
    case 'A-LA':
      return sym.A - sym.LA;
    case 'A+LB':
      return sym.A + sym.LB;
    case 'A-LB':
      return sym.A - sym.LB;
    case 'A+LW':
      return sym.A + sym.LW;
    case 'A-LW':
      return sym.A - sym.LW;

    // B ± term
    case 'B+1':
      return sym.B + 1;
    case 'B-1':
      return sym.B - 1;
    case 'B+LA':
      return sym.B + sym.LA;
    case 'B-LA':
      return sym.B - sym.LA;
    case 'B+LB':
      return sym.B + sym.LB;
    case 'B-LB':
      return sym.B - sym.LB;
    case 'B+LW':
      return sym.B + sym.LW;
    case 'B-LW':
      return sym.B - sym.LW;

    default: {
      // Exhaustiveness: if a new RegExpr member is added to types.ts without a case here,
      // this assignment fails to compile.
      const unhandled: never = expr;
      throw new Error(`unknown RegExpr: ${String(unhandled)}`);
    }
  }
}

/** Evaluate a whole `IAR / AAR / BAR` triple as opcodes.md §2 prints it. */
export function applyRegs(triple: RegTriple, sym: RegSymbols): AppliedRegs {
  return {
    iar: evalReg(triple.iar, sym),
    aar: evalReg(triple.aar, sym),
    bar: evalReg(triple.bar, sym),
  };
}
