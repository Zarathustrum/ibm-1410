// Tier 1 — the operator's side of the 1415: the MODE rotary, the keys, and the print-out each
// one types. DOM-free; the browser panel drives exactly these calls.
//
// research/console-and-physical.md §2 (the print-out table — A22-0526-3 Fig.42 p.46, S223-2648
// Fig.5 p.9), §3 (the six-position MODE rotary, the STOP key, the reset semantics) and §4 (the
// operator procedures: display, alter, address set, I/E cycle, and the mode-switch side effect).
// research/software.md §10.8 for the ALTER mechanics. Plan §1, §8; architecture.md §6.

import { describe, it, expect } from 'vitest';
import { bcdOfGlyph } from '../src/core/bcd.js';
import {
  createMachine, CONSOLE_LINE_LENGTH, DISPLAY_STOPS_BEFORE_NEXT_WORD_MARK, DISPLAY_WRAPS_ABOVE_10K,
  PROGRAM_STOP_TYPES_S, type Machine,
} from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import type { Addr, ConsoleLine } from '../src/core/types.js';

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

/** The graphic zero is slashed on the Selectric (printout.ts, C28-0351-5 p.2). */
const addr5 = (a: Addr): string => String(a).padStart(5, '0').replace(/0/g, 'Ø');

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

/** `A 00302 00403` at 00100, over a 3-digit A field and a 4-digit B field. */
function addMachine(): Machine {
  const m = createMachine({ size: 10_000 });
  program(m.storage, 100, 'A0030200403');
  field(m.storage, 302, '123');
  field(m.storage, 403, '4567');
  return m;
}

const ids = (m: Machine): (string | null)[] => m.snapshot().console.map((l) => l.id);
const last = (m: Machine): ConsoleLine => {
  const lines = m.snapshot().console;
  const l = lines.at(-1);
  if (l === undefined) throw new Error('the console has typed nothing');
  return l;
};

// ═══ MODE = ADDRESS SET — §4, A22-0526-3 p.50 ═════════════════════════════

describe('MODE = ADDRESS SET: the keyed address goes into the IAR and prints `B`', () => {
  it('keys 02000 and START loads the IAR and types the `B` line', () => {
    const m = createMachine({ size: 10_000 });
    m.setMode('addressSet');
    expect(m.keyAddress('02000')).toBe(2000);
    expect(m.start()).toBeUndefined();

    expect(m.snapshot().iar, 'the address went into the IAR, not into a dial').toBe(2000);
    const line = last(m);
    expect(line.id).toBe('B');
    expect(line.text, 'the 5-digit address the operator typed').toBe(addr5(2000));
    // §2: address set spaces SINGLE and prints at matrix position 35.
    expect(line.spacingBefore).toBe('single');
    expect(line.matrixPos).toBe(35);
  });

  it('the keyboard takes five digits and nothing else — the 1410 has no address dials (§1)', () => {
    const m = createMachine({ size: 10_000 });
    expect(() => m.keyAddress('2000')).toThrow();
    expect(() => m.keyAddress('0200A')).toThrow();
    expect(() => m.keyAddress('99999'), 'outside 10,000 positions').toThrow();
  });
});

// ═══ MODE = I/E CYCLE — §4, A22-0526-3 p.50 ═══════════════════════════════

describe('MODE = I/E CYCLE: one half cycle per START, and a `C` line with it', () => {
  it('the `C` line carries the IAR, AAR and BAR the half cycle left behind', () => {
    const m = addMachine();
    m.addressSet(100);
    m.setMode('ieCycle');
    expect(m.start(), 'the I phase is not a stop').toBeUndefined();

    const s = m.snapshot();
    expect(s.iar, 'the read-out advanced the IAR to NSI').toBe(111);
    expect(s.aar).toBe(302);
    expect(s.bar).toBe(403);
    const line = last(m);
    expect(line.id).toBe('C');
    expect(line.text.startsWith(`${addr5(s.iar)} ${addr5(s.aar)} ${addr5(s.bar)} `)).toBe(true);
    // §2: the half-cycle print-out spaces DOUBLE at matrix position 35, like every S/C/E line.
    expect(line.spacingBefore).toBe('double');
    expect(line.matrixPos).toBe(35);
  });

  it('is a STORAGE cycle, not an instruction: the B field fills one position per START', () => {
    const m = addMachine();
    m.addressSet(100);
    m.setMode('ieCycle');
    m.start();                                     // I — nothing written
    const before = m.snapshot().coreWindow.cells.slice(400, 404);
    m.start();                                     // the units position
    const after = m.snapshot().coreWindow.cells.slice(400, 404);
    expect(after[3], 'units: 7 + 3 = 10, a zero written and a carry').not.toBe(before[3]);
    expect([after[0], after[1], after[2]], 'and nothing to its left yet')
      .toEqual([before[0], before[1], before[2]]);
    expect(ids(m).filter((id) => id === 'C'), 'one `C` line per half cycle').toHaveLength(2);
  });
});

// ═══ The STOP key and the mode-switch side effect — §3, §4 ════════════════

describe('the STOP key prints `S` (§3, A22-0526-3 p.52)', () => {
  it('types the field line with the registers as they stand', () => {
    const m = addMachine();
    m.addressSet(100);
    m.step();
    m.stop();
    const s = m.snapshot();
    const line = last(m);
    expect(line.id).toBe('S');
    expect(line.text.startsWith(`${addr5(s.iar)} ${addr5(s.aar)} ${addr5(s.bar)} `)).toBe(true);
    expect(line.spacingBefore).toBe('double');
  });
});

// `PROGRAM_STOP_TYPES_S` — S223-2648 p.6 ("Output Operations"): "With the inhibit print-out
// control switch (CE console) set to normal, a program stop, an error stop, the stop key, or any
// cycle step, will initiate a stop print-out." A program stop IS the programmed halt, and §2's
// one non-error stop row — Normal Stop, double space, `S` at matrix 35 (S223-2648 Fig.5 p.9) — is
// the line it types. A22-0526-3 p.23's Halt description is silent about the print-out, not
// contrary to it. §3's PRINT OUT CONTROL / START PRINT OUT controls are consistent with p.6 and
// no longer counter-evidence: the automatic print-out does fire on stops generally.
describe('a programmed halt types `S` — PROGRAM_STOP_TYPES_S (S223-2648 p.6)', () => {
  it('op `.` stops the machine and types the Normal Stop line', () => {
    expect(PROGRAM_STOP_TYPES_S, '[verified] on S223-2648 p.6, pinned by name').toBe(true);
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, '.');
    m.addressSet(100);                            // the `B` line
    expect(m.start()).toBe('halt');
    expect(ids(m), 'ADDRESS SET typed `B`; the halt typed its `S`').toEqual(['B', 'S']);
  });

  it('and the operator pressing STOP after it types a second `S`', () => {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, '.');
    m.addressSet(100);
    m.start();
    m.stop();
    expect(ids(m), "the halt's `S`, then the operator's").toEqual(['B', 'S', 'S']);
  });

  // IE_CYCLE_HALT_TYPES_C_ALONE (machine.ts): p.6 lists four triggers for ONE print-out, and a
  // START under I/E CYCLE is already a cycle step, so the START that lands on the halt types once
  // — as `C`. The whole id list is asserted because that is the only shape the fallback (`C` then
  // `S`) fails; a `C` count is identical under both readings, which is why test/demo.test.ts:203
  // discriminates nothing and is left alone.
  it('but a halt reached under MODE = I/E CYCLE types the `C` line alone', () => {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, '.');
    m.addressSet(100);                            // the `B` line
    m.setMode('ieCycle');                         // the rotary turn types its own `S` (§3, §4)
    expect(m.start(), 'the I phase is not a stop').toBeUndefined();
    expect(m.start(), 'the E cycle reaches the halt').toBe('halt');
    // TWO STARTs, so TWO `C`s: `Cpu.stepCycle` (`cpu.ts`) returns the I phase incomplete and only
    // reaches the executor on the second. Plan §9.2 and §9.4 write this list as `['B','C']`, on
    // one START; measured, it is the four below, and the build follows the measurement.
    expect(ids(m), 'the turn typed `S`, each START its `C`, and the halt added nothing')
      .toEqual(['B', 'S', 'C', 'C']);
  });
});

describe('ANY mode change types a stop print-out (§3, §4; A22-0526-3 p.50)', () => {
  it('turning the rotary prints `S` even though no key was pressed', () => {
    const m = createMachine({ size: 10_000 });
    expect(m.mode, 'RUN is the top position').toBe('run');
    m.setMode('addressSet');
    expect(ids(m)).toEqual(['S']);
    m.setMode('run');
    expect(ids(m), 'a second change, a second print-out').toEqual(['S', 'S']);
  });

  it('turning it to where it already points is not a change', () => {
    const m = createMachine({ size: 10_000 });
    m.setMode('alter');
    m.setMode('alter');
    expect(ids(m)).toEqual(['S']);
  });
});

// ═══ MODE = DISPLAY — §4, A22-0526-3 p.51 ════════════════════════════════

describe('DISPLAY prints `D` and the address, then storage to the next word mark', () => {
  // The two named fallbacks on machine.ts, pinned so a future correction breaks a test.
  it('stops BEFORE the next word mark, and wraps above 10K (§4, A22-0526-3 p.51)', () => {
    expect(DISPLAY_STOPS_BEFORE_NEXT_WORD_MARK).toBe(true);
    expect(DISPLAY_WRAPS_ABOVE_10K, '[verified] A22-0526-3 p.51, discharged 2026-10-02').toBe(true);
    const m = createMachine({ size: 10_000 });
    // Two fields: 00300-00302 word-marked at 00300, 00303 word-marked and starting the next.
    [...'123'].forEach((g, i) => m.storage.setChar(300 + i, code(g), i === 0));
    m.storage.setChar(303, code('9'), true);
    m.display(300);
    expect(last(m).text, 'the next field\'s marked character is not on this line').toBe('123');
  });

  function displayed(): Machine {
    const m = createMachine({ size: 10_000 });
    // A three-character field at 02000 and the next field's word mark at 02003.
    m.storage.setChar(2000, code('D'), true);
    m.storage.setChar(2001, code('A'), false);
    m.storage.setChar(2002, code('D'), false);
    m.storage.setChar(2003, code('X'), true);
    m.display(2000);
    return m;
  }

  it('types two lines: the typed address at matrix 35, the contents at matrix 30', () => {
    const m = displayed();
    const lines = m.snapshot().console;
    expect(lines.map((l) => l.id)).toEqual(['D', 'D']);
    expect(lines[0]?.text).toBe(addr5(2000));
    expect(lines[0]?.matrixPos).toBe(35);
    expect(lines[1]?.text, 'stops BEFORE the word mark that starts the next field').toBe('DAD');
    expect(lines[1]?.matrixPos).toBe(30);
  });

  it('the displayed field prints WITH its own word mark (§4)', () => {
    const m = displayed();
    expect(m.snapshot().console[1]?.wordMarks).toEqual([true, false, false]);
  });

  it('with no word marks anywhere, the end of line stops it (software.md §10.8)', () => {
    const m = createMachine({ size: 10_000 });
    m.display(500);
    expect(m.snapshot().console[1]?.text).toHaveLength(CONSOLE_LINE_LENGTH);
  });

  it('takes the address the keyboard last keyed when it is not given one', () => {
    const m = createMachine({ size: 10_000 });
    m.keyAddress('00500');
    m.display();
    expect(m.snapshot().console[0]?.text).toBe(addr5(500));
  });
});

// ═══ MODE = ALTER — §4; software.md §10.8 ════════════════════════════════

describe('ALTER writes the typed line from the displayed address', () => {
  function displayedField(): Machine {
    const m = createMachine({ size: 10_000 });
    m.storage.setChar(2000, code('D'), true);
    m.storage.setChar(2001, code('A'), false);
    m.storage.setChar(2002, code('D'), false);
    m.storage.setChar(2003, code('X'), true);
    m.display(2000);
    return m;
  }

  it('writes glyphs and word marks, and types the `A` line', () => {
    const m = displayedField();
    expect(m.alter('CAT', [true, false, false])).toBe(3);
    expect(m.storage.bcd(2000)).toBe(code('C'));
    expect(m.storage.bcd(2001)).toBe(code('A'));
    expect(m.storage.bcd(2002)).toBe(code('T'));
    expect(m.storage.wm(2000)).toBe(true);
    expect(m.storage.wm(2001)).toBe(false);
    const line = last(m);
    expect(line.id).toBe('A');
    expect(line.text).toBe('CAT');
    expect(line.wordMarks).toEqual([true, false, false]);
    // §2: alter spaces single and prints at matrix position 30.
    expect(line.spacingBefore).toBe('single');
    expect(line.matrixPos).toBe(30);
  });

  it('"any previously displayed word mark must be re-entered" — §10.8', () => {
    const m = displayedField();
    m.alter('CAT');                          // no marks typed back
    expect(m.storage.wm(2000), 'the displayed word mark is gone').toBe(false);
  });

  it('refuses without a prior display, and a display buys exactly one alter (§4)', () => {
    const m = createMachine({ size: 10_000 });
    expect(() => m.alter('CAT')).toThrow(/must follow a DISPLAY/);
    m.display(2000);
    m.alter('CAT');
    expect(() => m.alter('DOG'), 'the second alter needs its own display').toThrow();
  });

  it('stops where the display stopped: a word mark, or the end of line', () => {
    const m = displayedField();
    expect(m.alter('CATTLE'), 'the displayed field was three positions').toBe(3);
    expect(m.storage.bcd(2003), 'the next field is untouched').toBe(code('X'));

    const cleared = createMachine({ size: 10_000 });
    cleared.display(500);
    expect(cleared.alter('X'.repeat(200))).toBe(CONSOLE_LINE_LENGTH);
  });

  it('rejects a character the console keyboard does not have', () => {
    const m = displayedField();
    expect(() => m.alter('C^T')).toThrow(/64 console characters/);
  });
});

// ═══ Wraparound at the top of core — §4, A22-0526-3 p.51 ═════════════════

describe('DISPLAY and ALTER at the top of core: 10K stops, 20K-80K wrap to 00000 (§4)', () => {
  /** `AB` in the last two positions, unmarked; `C` at 00000; `D` word-marked at 00001. */
  function topOfCore(size: 10_000 | 20_000): Machine {
    const m = createMachine({ size });
    m.storage.setChar(size - 2, code('A'), false);
    m.storage.setChar(size - 1, code('B'), false);
    m.storage.setChar(0, code('C'), false);
    m.storage.setChar(1, code('D'), true);
    return m;
  }

  it('10K: display and alter stop at the last storage location', () => {
    const m = topOfCore(10_000);
    m.display(9_998);
    expect(last(m).text).toBe('AB');
    expect(m.alter('XYZW'), 'the span ended at 09999').toBe(2);
    expect(m.storage.bcd(0), '00000 is untouched').toBe(code('C'));
  });

  it('20K: display continues from 00000 and stops BEFORE the next word mark there', () => {
    const m = topOfCore(20_000);
    m.display(19_998);
    expect(last(m).text, '19998, 19999, then 00000; 00001 starts the next field').toBe('ABC');
    expect(last(m).wordMarks).toEqual([false, false, false]);
  });

  it('20K: a word mark AT 00000 after the wrap starts the next field and is not printed', () => {
    const m = topOfCore(20_000);
    m.storage.setWm(0, true);
    m.display(19_998);
    expect(last(m).text).toBe('AB');
  });

  it('20K: a word-marked last location does not wrap', () => {
    const m = topOfCore(20_000);
    m.storage.setWm(19_999, true);
    m.display(19_999);
    expect(last(m).text, 'the marked last location prints and the scan stops').toBe('B');
    expect(last(m).wordMarks).toEqual([true]);
  });

  it('20K: alter wraps to 00000 where the display wrapped, and no further', () => {
    const m = topOfCore(20_000);
    m.display(19_998);
    expect(m.alter('XYZW', [true, false, false, false]), 'the displayed span was three').toBe(3);
    expect(m.storage.bcd(19_998)).toBe(code('X'));
    expect(m.storage.wm(19_998)).toBe(true);
    expect(m.storage.bcd(19_999)).toBe(code('Y'));
    expect(m.storage.bcd(0)).toBe(code('Z'));
    expect(m.storage.bcd(1), 'the next field is untouched').toBe(code('D'));
    expect(last(m).text).toBe('XYZ');
  });

  it('20K: a word-marked last location keeps the alter from wrapping', () => {
    const m = topOfCore(20_000);
    m.storage.setWm(19_999, true);
    m.display(19_999);
    expect(m.alter('QR')).toBe(1);
    expect(m.storage.bcd(0)).toBe(code('C'));
  });
});

// ═══ The reset keys — §2's table has no row for them ══════════════════════

describe('the reset keys type nothing (§2, §3)', () => {
  it('PROGRAM RESET and COMPUTER RESET leave the paper alone and put the IAR at 00001', () => {
    const m = addMachine();
    m.addressSet(100);
    const before = m.snapshot().console.length;
    m.programReset();
    expect(m.snapshot().iar).toBe(1);
    m.computerReset();
    expect(m.snapshot().console.length, 'no print-out row exists for a reset').toBe(before);
  });
});
