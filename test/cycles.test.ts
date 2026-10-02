// Tier 0 — timing (plan §7, §4.3).
// The whole Figure 7 E matrix is a fixture (oracle/timing.json); the named traps are
// separate assertions, because both of them are silent when they are wrong.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CYCLE_US,
  INDEX_US,
  IO_TERM_US,
  T_CARRIAGE_US,
  T_HALT_AND_BRANCH_US,
  T_HALT_US,
  T_SELECT_STACKER_US,
  T_STORE_ADDRESS_REGISTER_US,
  eTerm,
  tBranchOneChar,
  tBranchTaken,
  tMultiply,
  tTwoFieldArith,
} from '../src/core/cycles.js';
import { opByChar } from '../src/core/isa/table.js';
import type { ExecContext } from '../src/core/types.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
interface TimingFixture {
  cycleUs: number;
  e: Record<string, Record<string, number>>;
  indexUs: number;
  ioTermUs: number;
  constants: Record<string, number>;
}
const TIMING = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/timing.json'), 'utf8'),
) as TimingFixture;

/** Just enough ExecContext for a timing closure: L, the A/B field lengths, C — and R, the
 *  recomplement term the `A`/`S` formulas read (opcodes.md §1.5; alu.ts sets it). */
function ctx(length: number, LA = 0, LB = 0, branchTaken = false): ExecContext {
  return {
    fetched: { chars: new Uint8Array(length) },
    sym: { LA, LB, LW: Math.min(LA, LB) },
    branchTaken,
    recomplement: 0,
    terms: { M: 0, Q: 0, N: 0, Z: 0, D: 0 },
  } as unknown as ExecContext;
}

describe('cycles.ts — base-machine constants', () => {
  it('the core cycle is 4.5 µs, not the Accelerator 4.0', () => {
    expect(CYCLE_US).toBe(4.5);
    expect(CYCLE_US).toBe(TIMING.cycleUs);
    expect(CYCLE_US).not.toBe(4.0);
  });

  it('INDEX_US is 34.5 per address indexed (30.67 is the Accelerator figure)', () => {
    expect(INDEX_US).toBe(34.5);
    expect(INDEX_US).toBe(TIMING.indexUs);
  });

  it('the device I/O term is 0 in Phase 1 — not a timing claim', () => {
    expect(IO_TERM_US).toBe(0);
    expect(IO_TERM_US).toBe(TIMING.ioTermUs);
  });

  it('the constant-timing ops match the fixture', () => {
    expect(T_STORE_ADDRESS_REGISTER_US).toBe(TIMING.constants['G']);
    expect(T_HALT_AND_BRANCH_US).toBe(TIMING.constants['.@6']);
    expect(T_CARRIAGE_US).toBe(TIMING.constants['F']);
    expect(T_SELECT_STACKER_US).toBe(TIMING.constants['K']);
    expect(T_HALT_US).toBe(4.5);
  });
});

describe('cycles.ts — the Figure 7 E matrix', () => {
  it('eTerm agrees with oracle/timing.json for every (op, length)', () => {
    let checked = 0;
    for (const [opChar, byLength] of Object.entries(TIMING.e)) {
      for (const [length, expected] of Object.entries(byLength)) {
        expect(eTerm(opChar, Number(length)), `E for ${opChar} at L=${length}`).toBe(expected);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(60);
  });

  it('E = 2 on a single-character multiply or divide', () => {
    expect(eTerm('@', 1)).toBe(2);
    expect(eTerm('%', 1)).toBe(2);
  });

  it('E = 1 on a single-character A S ? ! T, and on a 6-character @ or %', () => {
    for (const op of ['A', 'S', '?', '!', 'T']) expect(eTerm(op, 1)).toBe(1);
    expect(eTerm('@', 6)).toBe(1);
    expect(eTerm('%', 6)).toBe(1);
  });

  it('E = 0 otherwise — including A/S at 6 and 11, and every non-arithmetic op', () => {
    for (const op of ['A', 'S', '?', '!']) {
      expect(eTerm(op, 6)).toBe(0);
      expect(eTerm(op, 11)).toBe(0);
    }
    for (const op of ['C', 'D', 'B', 'W', 'V', 'Z', 'E', ',', '⌑', '/', 'J', 'N', 'G']) {
      expect(eTerm(op, 1)).toBe(0);
      expect(eTerm(op, 6)).toBe(0);
    }
  });
});

describe('cycles.ts — the two named traps', () => {
  // plan §4.3: A22-0526-3 pp.96-98 print 4(L+1+C); the base machine gives 4.5(L+1+C).
  it('a taken conditional branch costs 4.5(L+1+C), NOT 4(L+1+C)', () => {
    expect(tBranchTaken(7, 1)).toBe(40.5);
    expect(tBranchTaken(7, 1)).not.toBe(4 * (7 + 1 + 1));
    expect(tBranchTaken(7, 0)).toBe(36);

    const jCond = opByChar('J')!.forms[1]!;
    expect(jCond.timing(ctx(7, 0, 0, true))).toBe(40.5);
    expect(jCond.timing(ctx(7, 0, 0, false))).toBe(36);
  });

  it('the one-character branch tests cost 4.5(L+2.5+C), NOT 4(L+2.5+C)', () => {
    expect(tBranchOneChar(12, 1)).toBe(4.5 * 15.5);
    expect(tBranchOneChar(12, 1)).not.toBe(4 * 15.5);
    for (const op of ['B', 'W', 'V']) {
      expect(opByChar(op)!.forms[0]!.timing(ctx(12, 0, 0, true))).toBe(4.5 * 15.5);
    }
  });

  // plan §4.3, §10: a blanket "E=1 for any chained arithmetic op" leaves chained multiply
  // and divide exactly one cycle short.
  it('a chained @ costs E=2 while a chained A costs E=1', () => {
    const chainedAdd = opByChar('A')!.forms[0]!.timing(ctx(1));
    expect(chainedAdd).toBe(tTwoFieldArith(1, 1, 0, 0, 0));
    expect(chainedAdd).toBe(4.5 * 3);

    const chainedMultiply = opByChar('@')!.forms[0]!.timing(ctx(1));
    expect(chainedMultiply).toBe(tMultiply(1, 2, 0, 0));
    // The wrong answer, one core cycle short:
    expect(chainedMultiply - tMultiply(1, 1, 0, 0)).toBe(CYCLE_US);
  });
});

describe('cycles.ts — the table wires the constants through', () => {
  it('. at L=1 is 4.5 and . at L=6 is 36', () => {
    const period = opByChar('.')!;
    expect(period.forms[0]!.timing(ctx(1))).toBe(4.5);
    expect(period.forms[1]!.timing(ctx(6))).toBe(36);
  });

  it('G is 69.75, F is 13.5, K is 13.5 + I/O', () => {
    expect(opByChar('G')!.forms[0]!.timing(ctx(7))).toBe(69.75);
    expect(opByChar('F')!.forms[0]!.timing(ctx(2))).toBe(13.5);
    expect(opByChar('K')!.forms[0]!.timing(ctx(2))).toBe(13.5);
  });

  it('M and L cost 49.5 + I/O against card, print or console', () => {
    expect(opByChar('M')!.forms[0]!.timing(ctx(10))).toBe(49.5);
    expect(opByChar('L')!.forms[0]!.timing(ctx(10))).toBe(49.5);
  });

  it('N costs 4.5(L+1) at any length', () => {
    const n = opByChar('N')!.forms[0]!;
    expect(n.timing(ctx(1))).toBe(9);
    expect(n.timing(ctx(40))).toBe(4.5 * 41);
  });
});
