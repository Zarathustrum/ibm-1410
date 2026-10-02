// Tier 1 — the Wave-1 control executors: `N` No Operation and `.` Halt / Halt and Branch.
// opcodes.md §2 pp.23-24 (A22-0526-3); plan §5 Wave 1, flow-chart steps 1-2.

import { describe, it, expect } from 'vitest';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { CYCLE_US, T_HALT_AND_BRANCH_US, T_HALT_US } from '../src/core/cycles.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import type { Addr } from '../src/core/types.js';

// Instructions into real core: a word mark over each op code and nowhere else, which is the
// only thing the 1411 uses to find a length (research/architecture.md §7, A22-0526-3 p.11).
// The trailing word mark on the position after the last instruction is the rule the manual
// states for the last instruction in a program (opcodes.md §2 `.` row).
function program(s: CoreStorage, at: Addr, ...instructions: readonly string[]): void {
  let p = at;
  for (const text of instructions) {
    [...text].forEach((glyph, i) => {
      const code = bcdOfGlyph(glyph);
      if (code === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
      s.setChar(p + i, code, i === 0);
    });
    p += text.length;
  }
  s.setWm(p, true);
}

function machineWith(at: Addr, ...instructions: readonly string[]): Machine {
  const m = createMachine({ size: 10_000 });
  program(m.storage, at, ...instructions);
  m.addressSet(at);
  return m;
}

describe('`N` No Operation — opcodes.md §2 p.24, "any (1, 2, 3, …)"', () => {
  // §2 register row `NSI / Ap / Bp`: untouched at EVERY length. The "remaining characters are
  // skipped" IS the read-out scan, so the executor has nothing to do.
  it.each([
    ['length 1', 'N'],
    ['length 8', 'N1234567'],
    ['length 14', 'N1234567890123'],
  ])('at %s leaves AAR and BAR alone and puts IAR at NSI', (_label, text) => {
    const m = machineWith(100, text);
    m.regs.aar = 1234;
    m.regs.bar = 5678;
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar).toBe(100 + text.length);
    expect(m.regs.aar).toBe(1234);
    expect(m.regs.bar).toBe(5678);
  });

  it('costs 4.5(L+1) — opcodes.md §2 p.24', () => {
    const m = machineWith(100, 'N1234567');
    m.step();
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (8 + 1));
  });

  it('does not disturb the word marks it scans over ("Word marks unaffected")', () => {
    const m = machineWith(100, 'N1234567');
    m.step();
    expect(m.storage.wm(100)).toBe(true);
    expect(m.storage.wm(108)).toBe(true);
    for (let a = 101; a < 108; a++) expect(m.storage.wm(a), String(a)).toBe(false);
  });
});

describe('`.` Halt, length 1 — opcodes.md §2 p.23, registers NSI / Ap / Bp', () => {
  it('stops with reason `halt`, and the next step resumes at the next sequential instruction', () => {
    const m = machineWith(100, '.', 'N');
    m.regs.aar = 1234;
    m.regs.bar = 5678;

    expect(m.step()).toBe('halt');
    expect(m.regs.iar).toBe(101);          // NSI — START resumes with the next instruction
    expect(m.regs.aar).toBe(1234);         // Ap
    expect(m.regs.bar).toBe(5678);         // Bp
    expect(m.snapshot().stop).toBe('halt');

    expect(m.step()).toBeUndefined();      // the emulator's START key
    expect(m.regs.iar).toBe(102);
  });

  it('counts as a completed instruction and costs the constant T = 4.5', () => {
    const m = machineWith(100, '.', 'N');
    m.step();
    expect(m.cpu.instructions).toBe(1);
    expect(m.cpu.microsecondsSimulated).toBe(T_HALT_US);
  });

  it('stops `run()` where a check would — the loop ends at the halt', () => {
    const m = machineWith(100, 'N', '.', 'N');
    expect(m.run(50)).toBe('halt');
    expect(m.cpu.instructions).toBe(2);
    expect(m.regs.iar).toBe(102);
  });
});

describe('`. iiiii` Halt and Branch, length 6 — opcodes.md §2 p.23, registers NSIB / BI / NSIB', () => {
  // The C5 model (docs/plans/architecture.md §9, plan §4.1): IAR = BI, AAR = BI, BAR = NSIB,
  // and the next read-out fetches from IAR. §2 prints no not-taken result — it always branches.
  it('stops with IAR at the I-address, and the next step fetches from there', () => {
    const m = machineWith(100, '.00300');
    program(m.storage, 300, 'N');

    expect(m.step()).toBe('halt');
    expect(m.regs.iar).toBe(300);          // BI
    expect(m.regs.aar).toBe(300);          // BI
    expect(m.regs.bar).toBe(106);          // NSIB — what `G ccccc B` would store

    expect(m.step()).toBeUndefined();
    expect(m.regs.iar).toBe(301);
  });

  it('costs the constant T = 36, not a formula (opcodes.md §2 p.23)', () => {
    const m = machineWith(100, '.00300');
    program(m.storage, 300, 'N');
    m.step();
    expect(m.cpu.microsecondsSimulated).toBe(T_HALT_AND_BRANCH_US);
    expect(T_HALT_AND_BRANCH_US).toBe(36);
  });
});
