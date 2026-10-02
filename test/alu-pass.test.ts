// Tier 1 — `addPass`, the primitive `alu.ts` was reshaped into (docs/plans/phase-1b.md §3.1,
// §4 Wave A). Machine facts: research/opcodes.md §4.1-§4.3 (A22-0526-3 pp.16-18, Figures 11-12),
// §4.5, §8.
//
// `addToStorage` fixed five things a partial product cannot live with: the B cursor, the
// word-mark end, the derived add cycle, the sign it writes and the indicators it latches. These
// cases exercise the three degrees of freedom the reshape adds — a counted run, a caller-chosen
// sign, a caller-owned Scan 3 — and then prove the wrapper still is the old pass.
//
// The pass is driven DIRECTLY here rather than through an instruction (as test/alu.test.ts does),
// because a counted run and a null `recomplementSign` have no instruction: they exist for `@`
// and `%`, which Wave B builds. The ExecContext is the minimum the pass reads, cast the way
// test/cycles.test.ts casts its timing context.

import { describe, it, expect } from 'vitest';
import {
  MINUS_ZONE, PLUS_ZONE, addPass, addToStorage, digitOf, signOf,
  type AddPassOptions, type AddPassResult,
} from '../src/core/alu.js';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { Indicators } from '../src/core/indicators.js';
import { CoreStorage } from '../src/core/storage.js';
import { ZA, ZB, type Addr, type LatchTraceRecord } from '../src/core/types.js';

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

/** The four sign zones of A22-0526-3 p.16 Figure 11 — minus is B alone. */
type Zone = 'none' | 'BA' | 'B' | 'A';
const ZONE_BITS: Readonly<Record<Zone, number>> = { none: 0, BA: ZB | ZA, B: ZB, A: ZA };
const ZONES = ZB | ZA;
const NUMERIC = 0x0f;

/**
 * A numeric field ending at its UNITS position with `zone` written over the units digit as the
 * sign — test/alu.test.ts's helper, plus the `wordMark` flag case (a) needs: a counted run must
 * work over a field that carries no word mark at all.
 */
function field(s: CoreStorage, units: Addr, digits: string, zone: Zone = 'none', wordMark = true): void {
  const n = digits.length;
  [...digits].forEach((glyph, i) => {
    const bits = code(glyph);
    s.setChar(units - n + 1 + i, i === n - 1 ? ZONE_BITS[zone] | (bits & NUMERIC) : bits, wordMark && i === 0);
  });
}

/** `n` positions ending at `units`, as the adder reads them, then the sign of the units zone. */
function readField(s: CoreStorage, units: Addr, n: number): string {
  let out = '';
  for (let i = n - 1; i >= 0; i--) out += String(digitOf(s.read(units - i)));
  return out + signOf(s.read(units));
}

const A_UNITS = 302;
const B_UNITS = 402;
const OP_ADDR = 1000;

interface Ctx {
  storage: CoreStorage;
  indicators: Indicators;
  sym: { A: Addr; B: Addr; LA: number; LB: number; LW: number };
  recomplement: 0 | 1;
}

/** The whole of what `addPass` and `addToStorage` read off the context. */
function context(s: CoreStorage): Ctx {
  return {
    storage: s,
    indicators: new Indicators(),
    sym: { A: A_UNITS, B: B_UNITS, LA: 0, LB: 0, LW: 0 },
    recomplement: 0,
  };
}

/** Drain a pass, keeping every yielded record and the value it returns. */
function drive(
  gen: Generator<LatchTraceRecord | undefined, AddPassResult, void>,
): { records: (LatchTraceRecord | undefined)[]; result: AddPassResult } {
  const records: (LatchTraceRecord | undefined)[] = [];
  let n = gen.next();
  while (!n.done) {
    records.push(n.value);
    n = gen.next();
  }
  return { records, result: n.value };
}

/** The cast test/cycles.test.ts uses, plus the two fields only the L3 records read. */
const asCtx = (c: Ctx) =>
  ({ ...c, entry: { opChar: 'A' }, fetched: { opAddr: OP_ADDR } }) as unknown as
    Parameters<typeof addPass>[0];

describe('addPass — the counted run (phase-1b.md §3.1, §4 Wave A)', () => {
  // (a) The three degrees of freedom, all at once: `positions: 3` over a B field whose word mark
  // is four positions further left, `writeSign: null` so the units zone is B's own, and no
  // indicator, `ctx.recomplement` or Figure 8 symbol touched — §3.1's "Who owns what" table.
  it('runs exactly n positions, writes no sign and latches nothing', () => {
    const s = new CoreStorage(10_000);
    field(s, A_UNITS, '111');                 // A: 111, word-marked on its high-order position
    field(s, B_UNITS, '222', 'A', false);     // B: 222, units zone A alone (plus) — NO word mark
    s.setChar(B_UNITS - 4, code('9'), true);  // the word mark a 3-position run must never reach
    s.setChar(B_UNITS - 3, code('9'), false); // and the neighbour it must never write

    const ctx = context(s);
    const before = ctx.indicators.snapshot();
    const zoneBefore = s.read(B_UNITS) & ZONES;

    const { records, result } = drive(addPass(asCtx(ctx), {
      aUnits: A_UNITS, bUnits: B_UNITS, positions: 3,
      cycle: 'true', writeSign: null, recomplementSign: null, mode: 'add',
    }));

    expect(result.lb).toBe(3);
    expect(records).toHaveLength(3);          // one storage cycle, one yield
    expect(readField(s, B_UNITS, 3)).toBe('333+');
    // The run stopped on the COUNT: not one of the three positions carries a word mark.
    expect([0, 1, 2].map((i) => s.wm(B_UNITS - i))).toEqual([false, false, false]);
    // The high-order neighbour and the word mark beyond it are untouched.
    expect(digitOf(s.read(B_UNITS - 3))).toBe(9);
    expect(s.wm(B_UNITS - 4)).toBe(true);
    // `writeSign: null` leaves B's own zone bits — A alone, not the B+A the machine writes when
    // it develops a plus sign (opcodes.md §4.1 p.16).
    expect(s.read(B_UNITS) & ZONES).toBe(zoneBefore);
    expect(s.read(B_UNITS) & ZONES).toBe(ZA);
    // Nothing latched, nothing reported into the context: §3.1's table gives all of it away.
    expect(ctx.indicators.snapshot()).toEqual(before);
    expect(ctx.recomplement).toBe(0);
    expect([ctx.sym.LA, ctx.sym.LB, ctx.sym.LW]).toEqual([0, 0, 0]);
  });
});

// 25 - 83 in Figure 12's complement cycle: Scan 1 develops 42 with NO carry out of the
// high-order position, so A was the greater value and the result is in complement form
// (opcodes.md §4.3). Whether Scan 3 corrects it is the CALLER's, and that is the whole point.
function underflowingComplementAdd(s: CoreStorage): void {
  field(s, A_UNITS, '83');
  field(s, B_UNITS, '25', 'BA');
}
const UNDERFLOW: Omit<AddPassOptions, 'recomplementSign'> = {
  aUnits: A_UNITS, bUnits: B_UNITS, positions: 'bWordMark',
  cycle: 'complement', writeSign: null, mode: 'add',
};

describe('addPass — Scan 3 is the caller\'s (phase-1b.md §3.1)', () => {
  // (b) `recomplementSign: '-'` — the tier-3 recomplement cases (02333 / 02433 / 02485) restated
  // at tier 1: the Figure 12 sign of the greater value is written over the units position, minus
  // as a B bit alone (opcodes.md §4.1 p.16).
  it('recomplements and writes the Figure 12 sign when handed one', () => {
    const s = new CoreStorage(10_000);
    underflowingComplementAdd(s);
    const ctx = context(s);

    const { records, result } = drive(addPass(asCtx(ctx), { ...UNDERFLOW, recomplementSign: '-' }));

    expect(result.cout).toBe(0);              // no carry out — A was the greater value
    expect(result.recomplemented).toBe(true);
    expect(records).toHaveLength(4);          // 2 positions of Scan 1, then 2 of Scan 3
    expect(readField(s, B_UNITS, 2)).toBe('58-');
    expect(s.read(B_UNITS) & ZONES).toBe(MINUS_ZONE);
  });

  // (c) `recomplementSign: null` is how `@` says "no Scan 3 here" (§3.1, §4.5): the same
  // underflow is left in complement form, and B's own units zone stands.
  it('leaves the complement form and the units zone alone when handed null', () => {
    const s = new CoreStorage(10_000);
    underflowingComplementAdd(s);
    const ctx = context(s);

    const { records, result } = drive(addPass(asCtx(ctx), { ...UNDERFLOW, recomplementSign: null }));

    expect(result.cout).toBe(0);
    expect(result.recomplemented).toBe(false);
    expect(records).toHaveLength(2);          // Scan 1 only — no second pass over B
    expect(readField(s, B_UNITS, 2)).toBe('42+');
    expect(s.read(B_UNITS) & ZONES).toBe(PLUS_ZONE);
  });
});

describe('addToStorage is addPass plus the ownership (phase-1b.md §3.1)', () => {
  // (d) A plain `A`: 95 + 15, both plus, so Figure 12 takes a true add and the carry out of the
  // high-order position IS an arithmetic overflow (opcodes.md §8, A22-0526-3 p.53). Same fields,
  // same records — and only the wrapper latches anything.
  it('writes the same bytes and the same records, and latches what the pass does not', () => {
    const setup = (s: CoreStorage): void => {
      field(s, A_UNITS, '15');
      field(s, B_UNITS, '95', 'BA');
    };
    const sPass = new CoreStorage(10_000);
    const sWrap = new CoreStorage(10_000);
    setup(sPass);
    setup(sWrap);
    const ctxPass = context(sPass);
    const ctxWrap = context(sWrap);

    const fromPass: LatchTraceRecord[] = [];
    const fromWrap: LatchTraceRecord[] = [];
    drive(addPass(asCtx(ctxPass), {
      aUnits: A_UNITS, bUnits: B_UNITS, positions: 'bWordMark',
      cycle: 'true', writeSign: null, recomplementSign: null, mode: 'add',
      emit: (r) => fromPass.push(r),
    }));
    for (const _ of addToStorage(asCtx(ctxWrap), {
      mode: 'add', subtract: false, oneField: false, emit: (r) => fromWrap.push(r),
    })) { /* drained for its side effects; the records come through the sink */ }

    expect(sPass.dump()).toEqual(sWrap.dump());
    expect(readField(sPass, B_UNITS, 2)).toBe('10+');
    // The wrapper adds exactly one record: the `end` yield §3.1 leaves it owning.
    expect(fromWrap.filter((r) => r.kind === 'scan')).toEqual(fromPass);
    expect(fromWrap.at(-1)).toEqual({
      kind: 'end', addr: OP_ADDR, opChar: 'A', zb: 0, ovf: 1, result: 'B=10+',
    });

    // The pass reported the overflow; the wrapper is what latched it, and what filled Figure 8.
    expect(ctxPass.indicators.arithOverflow).toBe(false);
    expect([ctxPass.sym.LA, ctxPass.sym.LB, ctxPass.sym.LW]).toEqual([0, 0, 0]);
    expect(ctxWrap.indicators.arithOverflow).toBe(true);
    expect([ctxWrap.sym.LA, ctxWrap.sym.LB, ctxWrap.sym.LW]).toEqual([2, 2, 2]);
    expect(ctxWrap.recomplement).toBe(0);
  });
});
