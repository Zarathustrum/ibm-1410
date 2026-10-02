// Tier 1 — `Cpu.stepCycle()` / `Machine.stepCycle()`, the STORAGE-CYCLE boundary.
// Plan §1 (the `stepCycle()` bullet), §8 demo 2 (the half-cycled add);
// docs/plans/architecture.md §7 (the Phase-1 demo). The console control is MODE = I/E CYCLE —
// there is no SINGLE STEP key on a 1410 (research/console-and-physical.md §3 lists six MODE
// positions and no such control).
//
// The point of the boundary is demo 2: key an add by hand, half-cycle it, and watch the B
// field fill in RIGHT TO LEFT from the units digit, one position per cycle, until the word
// mark on the high-order B position stops it. A whole `A aaaaa bbbbb` completes in one
// `step()`, so without this it would fill in a single frame.

import { describe, it, expect } from 'vitest';
import { bcdOfGlyph, glyphOf, parity } from '../src/core/bcd.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { BCD6, C, type Addr, type CycleStep } from '../src/core/types.js';

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

function program(s: CoreStorage, at: Addr, ...instructions: readonly string[]): void {
  let p = at;
  for (const text of instructions) {
    [...text].forEach((glyph, i) => s.setChar(p + i, code(glyph), i === 0));
    p += text.length;
  }
  s.setWm(p, true);
}

/** A field ending at its units position, word-marked on the high-order position. */
function field(s: CoreStorage, units: Addr, digits: string): void {
  const n = digits.length;
  [...digits].forEach((glyph, i) => s.setChar(units - n + 1 + i, code(glyph), i === 0));
}

function glyphs(s: CoreStorage, units: Addr, n: number): string {
  let out = '';
  for (let i = n - 1; i >= 0; i--) out += glyphOf(s.bcd(units - i));
  return out;
}

const B_UNITS = 403;

/**
 * A level-3 tracer with a sink that drops the line. `CycleStep.record` is the L3 latch trace's
 * and is built ONLY when a tracer is attached (`alu.ts`, `types.ts` `CycleStep`): the storage
 * cycle happens either way, but an untraced pass yields `undefined` rather than a twelve-field
 * record. Every test below that reads `record` therefore asks for one; the ones that assert the
 * CYCLE BOUNDARY, which is what MODE = I/E CYCLE actually exposes, deliberately do not.
 */
const TRACED = { tracer: { level: 3, sink: (): void => {} } } as const;

/** `A 00302 00403` over a 3-digit A field and a FOUR-digit B field. 4567 + 123 = 4690. */
function addMachine(...extra: readonly string[]): Machine {
  return builtAdd({}, ...extra);
}

/** The same machine with the level-3 tracer attached, so the latch records are built. */
function tracedAddMachine(...extra: readonly string[]): Machine {
  return builtAdd(TRACED, ...extra);
}

function builtAdd(opts: { tracer?: { level: 3; sink: (l: string) => void } }, ...extra: readonly string[]): Machine {
  const m = createMachine({ size: 10_000, ...opts });
  program(m.storage, 100, 'A0030200403', ...extra);
  field(m.storage, 302, '123');               // 300-302, word mark at 300
  field(m.storage, B_UNITS, '4567');          // 400-403, word mark at 400
  m.addressSet(100);
  return m;
}

/** Half-cycle to the end of the instruction, keeping every cycle. */
function cycles(m: Machine): CycleStep[] {
  const out: CycleStep[] = [];
  for (let guard = 0; guard < 50; guard++) {
    const cycle = m.stepCycle();
    out.push(cycle);
    if (cycle.complete) return out;
  }
  throw new Error('stepCycle never completed');
}

describe('the I phase — one read-out cycle, nothing written (plan §1)', () => {
  it('the first `stepCycle()` decodes and advances the IAR, and writes no operand position', () => {
    const m = addMachine();
    const before = glyphs(m.storage, B_UNITS, 4);
    const first = m.stepCycle();
    expect(first.phase).toBe('I');
    expect(first.complete).toBe(false);
    expect(first.record, 'no storage cycle of the operation has run yet').toBeUndefined();
    expect(m.regs.iar, 'IAR = NSI').toBe(111);
    expect(m.regs.aar, 'read-out loaded the A address').toBe(302);
    expect(m.regs.bar).toBe(B_UNITS);
    expect(glyphs(m.storage, B_UNITS, 4), 'the B field is untouched').toBe(before);
  });

  // Reported by the Wave 1-2 review. The Op register is seven bits — the word mark is dropped
  // on the way in (research/architecture.md §6, A22-0526-3 pp.8-10 Figure 5) — but parity is
  // ODD over BA8421 + WM + C, so dropping the word mark must invert the check bit or the
  // register holds an even-parity character and the stop print-out underlines the op code on
  // every halt (research/charset.md §1, A22-0526-3 p.5).
  it('drops the word mark from the Op register and FLIPS the check bit with it', () => {
    const m = addMachine();
    m.stepCycle();
    expect(m.regs.op & 0x80, 'the word-mark bit is not in the Op register').toBe(0);
    expect(m.regs.op & BCD6, 'the op character itself').toBe(code('A'));
    expect(m.regs.op & C, 'odd parity over the six data bits alone').toBe(parity(code('A'), false));
    let bits = 0;
    for (let b = m.regs.op; b !== 0; b >>= 1) bits += b & 1;
    expect(bits % 2, 'odd total').toBe(1);
  });
});

describe('the E cycles — one B position each, units first (plan §8 demo 2)', () => {
  it('fills the B field right to left, one position per cycle', () => {
    const m = addMachine();
    m.stepCycle();                                           // I
    expect(glyphs(m.storage, B_UNITS, 4)).toBe('4567');
    m.stepCycle();
    // A plain `0`, not a 12-zoned `?`: a true add takes the sign the B field already carries, so
    // no sign is developed and the unzoned units position keeps its (absent) zone — the machine
    // writes a sign only "when [it] develops or changes a sign" (opcodes.md §4.1 p.16).
    expect(glyphs(m.storage, B_UNITS, 4), 'units: 7+3 = 10, zero written, carry').toBe('4560');
    m.stepCycle();
    expect(glyphs(m.storage, B_UNITS, 4), '6+2+carry').toBe('4590');
    m.stepCycle();
    expect(glyphs(m.storage, B_UNITS, 4), '5+1').toBe('4690');
    m.stepCycle();
    expect(glyphs(m.storage, B_UNITS, 4), 'extension: 4+0').toBe('4690');
  });

  it('yields one scan record per B position, then `end`, then completes', () => {
    const all = cycles(tracedAddMachine());
    expect(all.map((c) => c.phase)).toEqual(['I', 'E', 'E', 'E', 'E', 'E', 'E']);
    const kinds = all.map((c) => c.record?.kind);
    expect(kinds).toEqual([undefined, 'scan', 'scan', 'scan', 'scan', 'end', undefined]);
    expect(all.at(-1)?.complete, 'the last cycle applies the registers and the timing').toBe(true);
    expect(all.slice(0, -1).every((c) => !c.complete)).toBe(true);
  });

  // The half-cycle boundary is not the trace. Without a tracer the same add still takes the same
  // seven cycles; it just carries no `record` (`types.ts` `CycleStep.record`, `alu.ts`).
  it('an untraced machine half-cycles identically and yields no records at all', () => {
    const all = cycles(addMachine());
    expect(all.map((c) => c.phase)).toEqual(['I', 'E', 'E', 'E', 'E', 'E', 'E']);
    expect(all.every((c) => c.record === undefined)).toBe(true);
    expect(glyphs(addMachine().storage, B_UNITS, 4)).toBe('4567');
  });

  it('the B-field word mark is what stops it — a five-digit B field takes five', () => {
    const m = createMachine({ size: 10_000, ...TRACED });
    program(m.storage, 100, 'A0030200403');
    field(m.storage, 302, '123');
    field(m.storage, B_UNITS, '34567');        // 399-403, word mark at 399
    m.addressSet(100);
    const scans = cycles(m).filter((c) => c.record?.kind === 'scan');
    expect(scans).toHaveLength(5);
    expect(glyphs(m.storage, B_UNITS, 5)).toBe('34690');
  });
});

describe('half-cycling and `step()` leave the machine in the same state', () => {
  it('registers, indicators, core and µs all match a single `step()`', () => {
    const stepped = addMachine();
    const halved = addMachine();
    expect(stepped.step()).toBeUndefined();
    cycles(halved);
    expect(halved.snapshot()).toEqual(stepped.snapshot());
    expect(halved.cpu.microsecondsSimulated).toBe(stepped.cpu.microsecondsSimulated);
    expect(halved.cpu.microsecondsSimulated).toBe(4.5 * (11 + 1 + 0 + 3 + 1.5 * 4));
    expect(halved.cpu.instructions, 'one instruction, however it was driven').toBe(1);
  });

  // Reported by the Wave 3-7 review: the equality above was proved for ONE add. These are the
  // other three shapes `stepCycle()` has to get right — a taken branch (IAR moved by
  // `endInstruction`, not by the register triple), the halt-and-branch that both branches AND
  // stops, and a NOT-taken branch, which is the only path that uses `regsNotTaken`.
  const SHAPES: readonly (readonly [string, string])[] = [
    ['a taken `J iiiii` — unconditional branch', 'J00300 '],
    ['`. iiiii` — halt and branch (opcodes.md §2 p.23)', '.00300'],
    // `V iiiii bbbbb d`, d = 1: the word-mark test over 00400, which has none — NOT taken, so
    // BAR = B-1 out of `regsNotTaken` (opcodes.md §6.3, architecture.md §9).
    ['a NOT-taken `V iiiii bbbbb 1`', 'V00300004001'],
  ];

  for (const [name, text] of SHAPES) {
    it(`${name}: half-cycled and stepped leave the same machine`, () => {
      const build = (): Machine => {
        const m = createMachine({ size: 10_000 });
        program(m.storage, 100, text);
        m.addressSet(100);
        return m;
      };
      const stepped = build();
      const halved = build();
      const stop = stepped.step();
      const all = cycles(halved);

      expect(all[0]?.phase, 'the first cycle is always the I phase').toBe('I');
      expect(all.at(-1)?.stop, 'and the last cycle reports whatever `step()` did').toBe(stop);
      expect(halved.snapshot()).toEqual(stepped.snapshot());
      expect(halved.cpu.microsecondsSimulated).toBe(stepped.cpu.microsecondsSimulated);
      expect(halved.cpu.instructions).toBe(1);
    });
  }

  it('`step()` finishes an instruction left half-cycled — START out of I/E CYCLE', () => {
    const m = addMachine();
    m.stepCycle();                                           // I
    m.stepCycle();                                           // one B position
    expect(m.step(), 'carries on rather than re-reading the instruction').toBeUndefined();
    expect(glyphs(m.storage, B_UNITS, 4)).toBe('4690');
    expect(m.regs.iar).toBe(111);
    expect(m.cpu.instructions).toBe(1);
  });
});

describe('an op that is not a multi-cycle pass — I phase, then ONE E phase', () => {
  it('`N` No Operation', () => {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, 'N');
    m.addressSet(100);
    const all = cycles(m);
    expect(all.map((c) => c.phase)).toEqual(['I', 'E']);
    expect(all.every((c) => c.record === undefined)).toBe(true);
    expect(m.regs.iar).toBe(101);
  });

  it('`, aaaaa` Set Word Mark', () => {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, ',00300');
    m.storage.setChar(300, code('9'), false);
    m.addressSet(100);
    const all = cycles(m);
    expect(all.map((c) => c.phase)).toEqual(['I', 'E']);
    expect(m.storage.wm(300), 'the whole executor ran on the E cycle').toBe(true);
    expect(m.regs.aar, 'and the registers were applied with it').toBe(299);
  });
});
