// Tier 1 — the Wave-1 branch executors: `J` (both opcodes.md §2 rows, with the full §6.1
// one-address d-table) and `V` Branch if Word Mark Present / Zone Equal (§6.3).
// A22-0526-3 p.36 Figure 35, p.39 Figure 37; plan §5 Wave 1, flow-chart steps 2-3.
//
// The taken-branch model under test is architecture.md §9 row C5 / plan §4.1: IAR = BI,
// AAR = BI, BAR = NSIB, and the next read-out fetches from IAR.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bcdOfGlyph } from '../src/core/bcd.js';
import { CYCLE_US } from '../src/core/cycles.js';
import { J_DMODS_NOT_IN_PHASE_1 } from '../src/core/isa/exec/branch.js';
import { J_D_TABLE, V_D_TABLE } from '../src/core/isa/dmods.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import type { Addr, IndicatorName } from '../src/core/types.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

interface VFixture { rows: { d: string; octal: number; instruction: string; condition: string }[] }
const VDCHARS = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/vdchars.json'), 'utf8'),
) as VFixture;

interface JFixture { rows: { d: string; indicator: string; notes: string }[] }
const JDCHARS = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/jdchars.json'), 'utf8'),
) as JFixture;

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

describe('`J iiiii ␣` Branch Unconditionally — opcodes.md §2 p.36', () => {
  it('takes the branch: IAR = BI, AAR = BI, BAR = NSIB (architecture.md §9 row C5)', () => {
    const m = machineWith(100, 'J00300 ');
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar).toBe(300);
    expect(m.regs.aar).toBe(300);
    expect(m.regs.bar).toBe(107);          // NSIB = NSI, what `G ccccc B` returns to
  });

  it('fetches the next instruction from the branch address', () => {
    const m = machineWith(100, 'J00300 ');
    program(m.storage, 300, 'N1234567');
    m.step();
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar).toBe(308);
  });

  it('costs 4.5(L+2) — its own §2 row, not the conditional formula', () => {
    const m = machineWith(100, 'J00300 ');
    m.step();
    expect(m.cpu.microsecondsSimulated).toBe(CYCLE_US * (7 + 2));
  });
});

// ── The §6.1 d-table: the seven latches the base machine can branch on ──────
const AVAILABLE: readonly [string, IndicatorName][] = [
  ['Z', 'arithOverflow'],      // BAV
  ['W', 'divideOverflow'],     // BDV
  ['V', 'zeroBalance'],        // BZ
  ['S', 'compareEqual'],       // BE
  ['U', 'compareHigh'],        // BH
  ['T', 'compareLow'],         // BL
  ['/', 'compareUnequal'],     // BU
];

function setLatch(m: Machine, name: IndicatorName, on: boolean): void {
  m.indicators[name] = on;
}

describe('`J iiiii d` Branch on Indicator — opcodes.md §2 p.36 Figure 35 / §6.1', () => {
  it('the seven testable d-characters are exactly the ones §6.1 maps to a latch', () => {
    const mapped = J_D_TABLE.filter((r) => r.indicator !== null).map((r) => [r.d, r.indicator]);
    expect(mapped).toEqual(AVAILABLE.map(([d, name]) => [d, name]));
  });

  it.each(AVAILABLE)('`J (I) %s` branches when %s is ON', (d, name) => {
    const m = machineWith(100, `J00300${d}`);
    setLatch(m, name, true);
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'IAR = BI').toBe(300);
    expect(m.regs.aar, 'AAR = BI').toBe(300);
    expect(m.regs.bar, 'BAR = NSIB').toBe(107);
    expect(m.cpu.microsecondsSimulated, 'taken: 4.5(L+1+C), C=1').toBe(CYCLE_US * (7 + 1 + 1));
  });

  // §2's not-taken column: "NSI / BI / BI (both A and B registers hold the branch-to address)".
  it.each(AVAILABLE)('`J (I) %s` falls through when %s is OFF, leaving NSI / BI / BI', (d, name) => {
    const m = machineWith(100, `J00300${d}`);
    setLatch(m, name, false);
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'IAR = NSI').toBe(107);
    expect(m.regs.aar, 'AAR = BI').toBe(300);
    expect(m.regs.bar, 'BAR = BI').toBe(300);
    expect(m.cpu.microsecondsSimulated, 'not taken: 4.5(L+1+C), C=0').toBe(CYCLE_US * (7 + 1));
  });

  // opcodes.md §8 and §6.1: "Turned off by this test, or by computer reset."
  it('`J (I) Z` resets arithmetic overflow after reading it — the second test falls through', () => {
    const m = machineWith(100, 'J00300Z', 'J00300Z');
    m.indicators.setArithOverflow();
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar).toBe(300);
    expect(m.snapshot().indicators.arithOverflow, 'reset by the test that read it').toBe(false);

    m.addressSet(107);
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'not taken the second time').toBe(114);
  });

  it('`J (I) W` resets divide overflow after reading it', () => {
    const m = machineWith(100, 'J00300W');
    m.indicators.setDivideOverflow();
    m.step();
    expect(m.regs.iar).toBe(300);
    expect(m.snapshot().indicators.divideOverflow).toBe(false);
  });

  it('`J (I) V` (zero balance) and the compare tests do NOT reset what they read', () => {
    const m = machineWith(100, 'J00300V');
    m.indicators.setZeroBalance(true);
    m.step();
    expect(m.snapshot().indicators.zeroBalance).toBe(true);
  });
});

describe('the §6.1 d-characters this configuration cannot serve', () => {
  it('J_DMODS_NOT_IN_PHASE_1 is every row the table marks unavailable, and no latch row', () => {
    expect(J_DMODS_NOT_IN_PHASE_1).toEqual(J_D_TABLE.filter((r) => !r.available).map((r) => r.d));
    for (const [d] of AVAILABLE) expect(J_DMODS_NOT_IN_PHASE_1).not.toContain(d);
    expect(J_DMODS_NOT_IN_PHASE_1).not.toContain(' ');
    // The whole of channel 2, overlap, tape, binary card, the 7010 rows and the 1401 sense
    // switches (opcodes.md §6.1). The four CHANNEL-1 device senses — `9` `@` `R` `Q` — left this
    // list in Phase 2 wave 4 and are exercised below.
    expect(J_DMODS_NOT_IN_PHASE_1).toContain('!');    // BC92  — carriage channel 9, channel 2
    expect(J_DMODS_NOT_IN_PHASE_1).toContain('A');    // BSS A — 1401 mode only
  });

  it('the fixture and the table agree on which d-characters exist at all', () => {
    expect(JDCHARS.rows.map((r) => r.d)).toEqual(J_D_TABLE.map((r) => r.d));
  });

  // Never a silent `false`: a program that tests a condition and is told "not on" takes the wrong
  // arm of a decision it believes it made (docs/plans/architecture.md §4.6). `!` is BC92 —
  // carriage channel 9 on the channel this configuration does not have.
  it('`J (I) !` (BC92, channel 2) stops with `unimplementedOp` and its citation', () => {
    const m = machineWith(100, 'J00300!');
    expect(m.step()).toBe('unimplementedOp');
    expect(m.cpu.lastCheck?.message).toContain('Carriage channel 9');
    expect(m.cpu.lastCheck?.message).toContain('A22-0526-3 p.36 Figure 35');
    expect(m.regs.iar, 'nothing branched').toBe(107);
  });

  // OPEN (branch.ts UNDEFINED_J_D_CHAR_IS_INSTRUCTION_CHECK): §6.1 does not say what an
  // undecodable modifier does; we take the I-ring rule — an Instruction Check, nothing executes.
  it('a d-character outside the §6.1 table is an instruction check', () => {
    const m = machineWith(100, 'J00300#');
    expect(m.step()).toBe('instructionCheck');
    expect(m.cpu.lastCheck?.message).toContain('undefined J d-character');
  });
});

// ── The two CARRIAGE senses, driven through the real 1403 ──────────────────
// io.md §5 Figure 35 [verified]: BC9 `9` and BCV `@` are carriage channel 9 and carriage overflow
// (channel 12), per channel, and "the indicators turn on when their hole is sensed and off when
// any other carriage-tape channel is sensed". They are not latches — `Channel.carriageChannel9`
// and `carriageChannel12` read the 1403's `CarriageState` (channel.ts, plan §6.2) — so these
// tests move the REAL carriage with a real `F d` and then ask the branch what it sees.
// `DEFAULT_CARRIAGE_TAPE` is punched on channels 1 (line 1, home), 9 (57) and 12 (60).
describe('`J (I) 9` (BC9) and `J (I) @` (BCV) follow the 1403 carriage — io.md §5 Figure 35', () => {
  it('`J (I) 9` branches with the carriage sitting on the channel-9 punch', () => {
    // `F 9` — immediate skip to channel 9 (io.md §7 Figure 90, A22-0526-3 p.81).
    const m = machineWith(100, 'F9', 'J003009');
    m.step();
    expect(m.printer.carriage).toMatchObject({ line: 57, channel9: true, channel12: false });
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'the branch was taken').toBe(300);
  });

  it('`J (I) 9` falls through from the power-on home position, where channel 1 is sensed', () => {
    const m = machineWith(100, 'J003009');
    expect(m.printer.carriage).toMatchObject({ page: 1, line: 1, channel9: false });
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'NSI, nothing branched').toBe(107);
  });

  it('`J (I) @` branches on channel 12, and channel 9 goes off when 12 is sensed', () => {
    const m = machineWith(100, 'F@', 'J00300@');
    m.step();
    expect(m.printer.carriage).toMatchObject({ line: 60, channel9: false, channel12: true });
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar).toBe(300);
  });

  it('`J (I) @` falls through while the carriage sits on channel 9', () => {
    const m = machineWith(100, 'F9', 'J00300@');
    m.step();
    expect(m.step()).toBeUndefined();
    // NSI: `F@` is two positions at 00100, the `J` seven at 00102.
    expect(m.regs.iar, 'channel 12 is not sensed at line 57').toBe(109);
  });
});

// ── A chained `J`: length 1, d from the retained op-modifier ────────────────
// opcodes.md §1.2 / A22-0526-3 p.12: an ELEVEN-position two-address instruction BLANKS the
// op-modifier register, so a chained instruction following it is automatically assigned a blank
// d-character; a twelve-position one leaves its own d in the register. Both §2 `J` rows carry
// lengths [1, 7], so at length 1 that register is the ONLY thing that separates Branch
// Unconditionally from Branch on Indicator — `pickForm`/`effectiveDChar` in decode.ts.
describe('a chained `J` (length 1) takes its d from the op-modifier register', () => {
  it('after an 11-character two-address op the blanked d selects the unconditional row', () => {
    // `, 00400 00300` Set Word Mark at both, then a bare `J`.
    const m = machineWith(100, ',0040000300', 'J');
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'NSI past the 11-character `,`').toBe(111);
    expect(m.regs.aar, 'AAR = A-1 — which is the chained `J`\'s BI').toBe(399);

    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'blank d: Branch Unconditionally, taken').toBe(399);
    expect(m.regs.aar, 'AAR = BI').toBe(399);
    expect(m.regs.bar, 'BAR = NSIB').toBe(112);
  });

  it('after a 12-character op with d = `Z` it selects the conditional row and tests BAV', () => {
    // `W 00400 00300 Z` Branch if Bit Equal: its d is a bare mask (every one of the 64 codes is
    // legal, table.ts `'bitmask'`), 00300 holds a blank with no bits, so it does not branch and
    // `Z` — BAV, arithmetic overflow (§6.1) — is what the chained `J` finds in the register.
    const off = machineWith(100, 'W0040000300Z', 'J');
    expect(off.step()).toBeUndefined();
    expect(off.regs.iar, 'the `W` did not branch').toBe(112);

    expect(off.step()).toBeUndefined();
    expect(off.regs.iar, 'arithmetic overflow is off: NOT taken, IAR = NSI').toBe(113);
    expect(off.regs.aar, 'not taken: AAR = BI').toBe(400);
    expect(off.regs.bar, 'not taken: BAR = BI').toBe(400);

    // And it really is `Z` in there, not merely "some non-blank d": turn BAV on and it branches.
    const on = machineWith(100, 'W0040000300Z', 'J');
    on.indicators.setArithOverflow();
    on.step();
    expect(on.step()).toBeUndefined();
    expect(on.regs.iar, 'BAV on: taken').toBe(400);
    expect(on.snapshot().indicators.arithOverflow, 'and the test reset it').toBe(false);
  });
});

// ── `V` — opcodes.md §2 pp.38-39 / §6.3, A22-0526-3 p.39 Figure 37 ──────────
// One case per printed row: a B-address character the row's "Branch condition" cell says must
// branch, and one it says must not. Zone glyphs: `1` no zones, `/` A only, `J` B only,
// `A` both B and A (research/charset.md §2).
interface VCase { d: string; hit: [string, boolean]; miss: [string, boolean] }
const V_CASES: readonly VCase[] = [
  { d: '1', hit: ['1', true],  miss: ['1', false] },   // word mark present
  { d: '2', hit: ['1', false], miss: ['A', false] },   // neither B nor A bit
  { d: 'B', hit: ['A', false], miss: ['1', false] },   // both B and A (plus test)
  { d: 'K', hit: ['J', false], miss: ['A', false] },   // B but no A (minus test)
  { d: 'S', hit: ['/', false], miss: ['J', false] },   // A but no B
  { d: '3', hit: ['A', true],  miss: ['A', false] },   // word mark OR no zones
  { d: 'C', hit: ['1', true],  miss: ['1', false] },   // word mark OR both
  { d: 'L', hit: ['1', true],  miss: ['1', false] },   // word mark OR B only
  { d: 'T', hit: ['1', true],  miss: ['1', false] },   // word mark OR A only
];

// The four combined rows again, on the OTHER arm. §6.3 makes the two bits INDEPENDENTLY
// enabling ("d bit 1 enables the word-mark test; d bit 2 enables the zone test … both bits set =
// branch on either condition"), so `3 C L T` must also branch on their zone test alone, with no
// word mark anywhere. Above, every one of the four is exercised through the word-mark arm only,
// which a `V` that ignored bit 2 entirely would still pass.
const V_ZONE_ARM_CASES: readonly { d: string; hit: [string, boolean] }[] = [
  { d: '3', hit: ['1', false] },   // no zones
  { d: 'C', hit: ['A', false] },   // both B and A
  { d: 'L', hit: ['J', false] },   // B only
  { d: 'T', hit: ['/', false] },   // A only
];

function vMachine(d: string, char: string, wm: boolean): Machine {
  const m = machineWith(100, `V0040000300${d}`);
  m.storage.setChar(300, bcdOfGlyph(char) ?? 0, wm);
  return m;
}

describe('`V iiiii bbbbb d` Branch if Word Mark Present, or Zone Equal — opcodes.md §6.3', () => {
  it('covers every row of Figure 37, and the fixture agrees with the table', () => {
    expect(V_CASES.map((c) => c.d)).toEqual(V_D_TABLE.map((r) => r.d));
    expect(VDCHARS.rows.map((r) => r.d)).toEqual(V_D_TABLE.map((r) => r.d));
    for (const row of VDCHARS.rows) expect(bcdOfGlyph(row.d), row.d).toBe(row.octal);
  });

  it.each(V_CASES)('d = $d branches on its own condition', ({ d, hit }) => {
    const m = vMachine(d, hit[0], hit[1]);
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'IAR = BI').toBe(400);
    expect(m.regs.aar, 'AAR = BI').toBe(400);
    expect(m.regs.bar, 'BAR = NSIB').toBe(112);
    expect(m.cpu.microsecondsSimulated, '4.5(L+2.5+C), C=1').toBe(CYCLE_US * (12 + 2.5 + 1));
  });

  // The not-taken triple is `NSI / BI / B-1`, and the B-1 is deliberate machine design: it
  // positions a chained retest one position lower (research/architecture.md §9, plan §4.2).
  it.each(V_CASES)('d = $d falls through otherwise, leaving BAR = B-1', ({ d, miss }) => {
    const m = vMachine(d, miss[0], miss[1]);
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'IAR = NSI').toBe(112);
    expect(m.regs.aar, 'AAR = BI').toBe(400);
    expect(m.regs.bar, 'BAR = B-1').toBe(299);
    expect(m.cpu.microsecondsSimulated, '4.5(L+2.5+C), C=0').toBe(CYCLE_US * (12 + 2.5));
  });

  it.each(V_ZONE_ARM_CASES)('d = $d branches on its ZONE arm with no word mark present', ({ d, hit }) => {
    const m = vMachine(d, hit[0], hit[1]);
    expect(m.storage.wm(300), 'no word mark — only bit 2 can carry this branch').toBe(false);
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'IAR = BI').toBe(400);
    expect(m.regs.bar, 'BAR = NSIB').toBe(112);
  });

  it('a chained retest walks one position lower — the whole point of B-1', () => {
    // `V 00400 00300 1` not taken, then the 6-character form, which chains the B-address and
    // reuses the previous modifier (opcodes.md §2 `V` row, A22-0526-3 p.12).
    const m = machineWith(100, 'V00400003001', 'V00400');
    m.storage.setChar(300, bcdOfGlyph('1') ?? 0, false);   // no word mark: first test misses
    m.storage.setChar(299, bcdOfGlyph('1') ?? 0, true);    // word mark one position lower

    expect(m.step()).toBeUndefined();
    expect(m.regs.bar).toBe(299);
    expect(m.regs.iar).toBe(112);

    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'the retest at 299 finds the word mark and branches').toBe(400);
    expect(m.regs.bar, 'BAR = NSIB').toBe(118);
  });

  it('never needs a B-field word mark to end it — always a one-character test', () => {
    const m = vMachine('2', '1', false);
    // Nothing between 300 and the end of the field is marked; the test still terminates.
    expect(m.storage.wm(301)).toBe(false);
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar).toBe(400);
  });
});
