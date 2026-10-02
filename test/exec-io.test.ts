// Tier 1 — the Wave-2 executors: `M` / `L` (opcodes.md §2 pp.40-41) writing the 1415 console
// through channel 1, and `R` (§2 pp.36-37, §6.2 Figure 36) testing status and releasing the
// interlock. Flow-chart step 5, "type ident" (plan §5 Wave 2).
//
// The register model under test is the §2 row itself: `IAR = NSI, AAR = Ap, BAR = B + LB + 1`,
// restated in io.md §8's console timing line — BAR lands ONE POSITION PAST the terminating
// group-mark-with-word-mark, because the GM-WM is read out and tested on an extra cycle
// (io.md §1 "End-of-op address"; 223-2692 p.42; A22-0526-3 p.99).

import { describe, it, expect } from 'vitest';

import { bcdOfGlyph } from '../src/core/bcd.js';
import { RX_RELEASE_D_GLYPH } from '../src/core/isa/dmods.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { tIoRecord, IO_TERM_US } from '../src/core/cycles.js';
import type { Addr, ConsoleLine } from '../src/core/types.js';

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

/** Instructions laid end to end from `at`, each word-marked on its op code. */
function program(s: CoreStorage, at: Addr, ...instructions: readonly string[]): void {
  let p = at;
  for (const text of instructions) {
    [...text].forEach((glyph, i) => s.setChar(p + i, code(glyph), i === 0));
    p += text.length;
  }
  s.setWm(p, true);
}

/** A message field: text, then the terminating group-mark-with-word-mark. */
function field(s: CoreStorage, at: Addr, text: string, marks: readonly number[] = []): void {
  [...text].forEach((glyph, i) => s.setChar(at + i, code(glyph), marks.includes(i)));
  s.setChar(at + text.length, code('⧧'), true);
}

const IDENT = 1250;
const IDENT_TEXT = 'CC01A';
/** The GM-WM sits at B + LB — one past the last data character. */
const IDENT_GMWM = IDENT + IDENT_TEXT.length;

function machineTyping(...instructions: readonly string[]): Machine {
  const m = createMachine({ size: 10_000 });
  program(m.storage, 100, ...instructions);
  field(m.storage, IDENT, IDENT_TEXT, [0]);
  m.addressSet(100);
  return m;
}

/**
 * What the PROGRAM typed. MODE = ADDRESS SET types its own `B` print-out into the console log
 * (machine.ts `addressSet`; research/console-and-physical.md §3, plan §1), and that is an
 * operator line, not device output — a program message carries id `R`
 * (devices/console1415.ts, io.md §8).
 */
const typed = (m: Machine): readonly ConsoleLine[] =>
  m.console.lines.filter((l) => l.id === 'R');

// ═══ `M %T0 bbbbb W` — WCP ═════════════════════════════════════════════════

describe('`M %T0 01250 W` — Write Console Printer (io.md §8 Figure 44)', () => {
  it('types the field up to but not including the GM-WM', () => {
    const m = machineTyping('M%T001250W');
    expect(m.step()).toBeUndefined();
    expect(typed(m).map((l) => l.text)).toEqual([IDENT_TEXT]);
    expect(m.snapshot().console.at(-1)?.text, 'and the snapshot carries it').toBe(IDENT_TEXT);
  });

  it('leaves IAR = NSI, AAR = Ap, BAR = B + LB + 1 — one PAST the GM-WM', () => {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, 'M%T001250W');
    field(m.storage, IDENT, IDENT_TEXT);
    m.regs.aar = 4321;                       // Ap — an I/O instruction never touches AAR
    m.addressSet(100);
    m.step();
    expect(m.regs.iar, 'NSI').toBe(110);
    expect(m.regs.aar, 'Ap, undisturbed').toBe(4321);
    expect(m.regs.bar, 'B + LB + 1').toBe(IDENT + IDENT_TEXT.length + 1);
    expect(m.regs.bar, 'which is address(GM-WM) + 1').toBe(IDENT_GMWM + 1);
    expect(m.storage.wm(IDENT_GMWM), 'the GM-WM itself is regenerated, never overwritten')
      .toBe(true);
  });

  it('costs 49.5 + I/O — the card/print/console row, not the tape one', () => {
    const m = machineTyping('M%T001250W');
    m.step();
    expect(m.cpu.microsecondsSimulated).toBe(49.5 + IO_TERM_US);
    expect(m.cpu.microsecondsSimulated).toBe(tIoRecord());
  });

  it('sets the interlock, so a second I/O with no intervening `R` stops the system', () => {
    const m = machineTyping('M%T001250W', 'M%T001250W');
    expect(m.step()).toBeUndefined();
    expect(m.snapshot().channel1.interlock).toBe(true);
    // io.md §5 step 2, A22-0526-3 pp.37-38: "Two I/O instructions on one channel with no
    // intervening R/X = system stop."
    expect(m.step()).toBe('ioInterlockStop');
  });

  it('an overlap x-control character stops the system on a machine without the feature', () => {
    const m = machineTyping('M@T001250W');
    expect(m.step()).toBe('unsupportedFeature');       // io.md §4
  });

  it('a channel-2 x-control character is not this configuration', () => {
    const m = machineTyping('M⌑T001250W');
    expect(m.step()).toBe('unimplementedOp');
  });

  it('a device type with NOTHING ATTACHED at its x2 is Not Ready, and nothing is typed', () => {
    // `D` is in `X2_DEVICE` — the IBM 1009 data transmission unit (io.md §2 Figure 107) — and no
    // phase attaches one, which is what this test needs: step 4 of the nine looks the class up,
    // finds no device, and reports io.md §9 Figure 99's "no such unit" Not Ready. It has to be a
    // glyph the TABLE KNOWS; a glyph outside the table is `decodeX`'s Instruction Check instead,
    // which is a different claim (channel.ts `decodeX`, the x2 OPEN comment).
    //
    // It used to be `1`, the 1402, which stopped proving this the moment Phase 2 wave 2 attached
    // a reader there — see the sibling test below for what that case proves now.
    const m = machineTyping('M%D001250W');
    expect(m.step()).toBeUndefined();
    expect(typed(m)).toHaveLength(0);
    expect(m.snapshot().channel1.notReady).toBe(true);
  });

  it('and an ATTACHED device that cannot run yet is Not Ready by the other route', () => {
    // The 1402 is registered at x2 = `1` from wave 2 on, so this reaches a real device and gets
    // its Not Ready from `Reader1402.precheck`'s first row — "a reader nobody has started is not
    // running at all" (io.md §6 step 1). Same indicator, different half of step 4: the one above
    // is the channel's lookup failing, this one is the device answering.
    const m = machineTyping('M%1001250W');
    expect(m.step()).toBeUndefined();
    expect(typed(m)).toHaveLength(0);
    expect(m.snapshot().channel1.notReady).toBe(true);
  });
});

// ═══ `L %T0 bbbbb W` — WCPW ════════════════════════════════════════════════

describe('`L %T0 01250 W` — Write Console Printer with Word Marks', () => {
  it('marks the word-marked characters and prints blanks as `b`', () => {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, 'L%T001250W');
    field(m.storage, IDENT, 'A B', [0]);
    m.addressSet(100);
    m.step();
    const line = typed(m)[0];
    expect(line?.text).toBe('AbB');
    expect(line?.wordMarks).toEqual([true, false, false]);
  });

  it('lands BAR in the same place as move mode — LB is a CORE length', () => {
    // Load-mode OUTPUT lengthens the record, but LB counts core positions, so the register
    // effect is unchanged (io.md §3 p.41 vs §1 "End-of-op address").
    const m = machineTyping('L%T001250W');
    m.step();
    expect(m.regs.bar).toBe(IDENT_GMWM + 1);
  });
});

// ═══ The read stub ═════════════════════════════════════════════════════════

describe('`M %T0 bbbbb R` — the console read stub (io.md §8 console status table)', () => {
  it('transfers nothing and sets No Transfer', () => {
    const m = machineTyping('M%T001250R');
    expect(m.step()).toBeUndefined();
    expect(typed(m)).toHaveLength(0);
    expect(m.snapshot().channel1.noTransfer).toBe(true);
    expect(m.storage.bcd(IDENT), 'core untouched').toBe(code('C'));
  });

  it('the same for `L %T0 bbbbb R` (RCPW) — inquiry is Phase 2', () => {
    const m = machineTyping('L%T001250R');
    expect(m.step()).toBeUndefined();
    expect(m.snapshot().channel1.noTransfer).toBe(true);
  });
});

// ═══ `R iiiii d` — opcodes.md §2 pp.36-37, §6.2 ════════════════════════════

describe('`R (I) d` — Branch if Channel 1 I/O Status Indicator On', () => {
  it('branches on an indicator that is on, and a taken branch releases the interlock', () => {
    // `ƀ` is the SUBSTITUTE BLANK (A bit, octal 20) — the No Transfer d-character. A true blank
    // has no bits and tests nothing (io.md §5 "Blank trap").
    const m = machineTyping('M%T001250R', 'R00300ƀ');
    m.step();
    expect(m.snapshot().channel1.noTransfer).toBe(true);
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'taken: IAR = BI').toBe(300);
    expect(m.regs.aar, 'taken: AAR = BI').toBe(300);
    expect(m.regs.bar, 'taken: BAR = NSIB').toBe(117);
    expect(m.snapshot().channel1.interlock, 'a branch that actually branches releases').toBe(false);
  });

  it('does NOT branch when the indicator is off, and then releases nothing', () => {
    const m = machineTyping('M%T001250W', 'R003002', 'M%T001250W');
    m.step();                                        // the write: busy never sets on a console
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'not taken: IAR = NSI').toBe(117);
    expect(m.regs.aar, 'not taken: AAR = BI').toBe(300);
    expect(m.regs.bar, 'not taken: BAR = BI').toBe(300);
    expect(m.snapshot().channel1.interlock, 'a non-branching test on `2` releases nothing')
      .toBe(true);
    expect(m.step(), 'so the next I/O is still a system stop').toBe('ioInterlockStop');
  });

  it('the group-mark d releases WITHOUT branching (io.md §5, A22-0530-1 p.8)', () => {
    const m = machineTyping('M%T001250W', `R00300${RX_RELEASE_D_GLYPH}`, 'M%T001250W');
    m.step();
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'no indicator is on, so no branch').toBe(117);
    expect(m.snapshot().channel1.interlock, 'released all the same').toBe(false);
    expect(m.step(), 'and the next I/O runs').toBeUndefined();
    expect(typed(m)).toHaveLength(2);
  });

  it('the group-mark d tests all six, so it also branches when one is on', () => {
    const m = machineTyping('M%T001250R', `R00300${RX_RELEASE_D_GLYPH}`);
    m.step();
    m.step();
    expect(m.regs.iar).toBe(300);
    expect(m.snapshot().channel1.interlock).toBe(false);
  });

  it('a status test does not reset the indicators; the next I/O read-out does', () => {
    const m = machineTyping('M%T001250R', `R00300${RX_RELEASE_D_GLYPH}`, 'M%T001250W');
    m.step();
    m.step();                                        // branches to 00300 — nothing there
    expect(m.snapshot().channel1.noTransfer, 'the test left it on').toBe(true);
    m.addressSet(117);                               // resume at the write
    m.step();
    expect(m.snapshot().channel1.noTransfer, 'step 3 of the nine cleared it').toBe(false);
  });
});

// The `R` d-character glyph is the group mark by OCTAL, not by look: A22-0530-1's typewriter
// face types the group mark and the record mark alike (dmods.ts, opcodes.md §6.2 / §9.1).
describe('RX_RELEASE_D_GLYPH', () => {
  it('is the group mark, octal 77', () => {
    expect(bcdOfGlyph(RX_RELEASE_D_GLYPH)).toBe(0o77);
  });
});
