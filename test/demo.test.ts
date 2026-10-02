// The two Phase-1 browser demos, driven headless through the same façade calls the internals
// panel makes — plan §8 ("Two demos on that page"), docs/plans/architecture.md §7.
//
// Demo 1 is the engineering gate: LOAD cc01.cor, MODE = ADDRESS SET, key 02000, MODE = RUN,
// START, and watch the diagnostic type its ident. Demo 2 is the human one — the add, keyed by
// hand through DISPLAY/ALTER and half-cycled on MODE = I/E CYCLE, so the B field is seen filling
// right to left from the units digit until the word mark stops it.
//
// Controls and print-outs: research/console-and-physical.md §3 (the rotary, the keys), §4 (the
// operator procedures) and §2 (the print-out table); research/software.md §10.8 (ALTER).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createMachine, type Machine } from '../src/core/machine.js';
import { loadCor } from '../src/formats/cor.js';
import type { Addr, StopReason } from '../src/core/types.js';
import { oraclePath } from './oracles.js';

// ═══ Demo 1 — LOAD, ADDRESS SET 02000, RUN, START ═════════════════════════

const CC01 = oraclePath('cc01.cor');

describe.skipIf(!CC01)('demo 1 — cc01.cor from the console keys (plan §8)', () => {
  it('types CC01A on the 1415', () => {
    const bytes = readFileSync(CC01 ?? '');
    const buf = new ArrayBuffer(bytes.length);
    new Uint8Array(buf).set(bytes);
    // `cc01.cor` fills unused storage with 0x40, a blank with its check bit, so no normalisation
    // is needed for this image (research/emulators.md §5.1) — the panel's checkbox is for the
    // two images that ship 0x00 fill.
    const img = loadCor(buf, { zeroFill: 'keep' });
    expect(img.size).toBe(10_000);

    const m = createMachine({ size: 10_000 });
    m.loadImage(img);
    // COMPUTER RESET forces IAR -> 00001 and this image's entry point is 02000, so ADDRESS SET
    // is not decoration: without it the demo runs from the wrong address (plan §1).
    m.setMode('addressSet');
    m.keyAddress('02000');
    m.start();
    expect(m.snapshot().iar).toBe(2000);
    expect(m.snapshot().console.some((l) => l.id === 'B')).toBe(true);

    m.setMode('run');
    let stop: StopReason | undefined;
    // An executor a concurrent wave has not landed yet throws a plain Error rather than stopping
    // the machine (isa/exec/stub.ts), and that is a build-order fact about the ISA waves, not a
    // property of this demo. Caught, reported, never asserted on.
    let escaped: string | undefined;
    try {
      // 200 frames of the panel's own budget — pressing START and letting it run.
      for (let frame = 0; frame < 200 && stop === undefined; frame++) stop = m.start();
    } catch (e) {
      escaped = e instanceof Error ? e.message : String(e);
    }

    const lines = m.snapshot().console.map((l) => l.text.replace(/\s+/g, ' ').trim());
    expect(lines.some((t) => t.includes('CC01A')), 'the diagnostic types its ident').toBe(true);

    // Both messages, unconditionally. Before the 2026-08-30 baseline run there was no published
    // transcript of `cc01.cor` anywhere (research/emulators.md §10), so this assertion was
    // written to fire only when the message happened to be there — which is a test that cannot
    // fail. The baseline exists now (PHASE-1-NOTES §4), so a demo-1 run that stops short of
    // `CC01 COMPLETE` is a regression. Where it stopped is printed first: that address is the
    // localisation pointer plan §7 asks for.
    const identAt = lines.findIndex((t) => t.includes('CC01A'));
    const completed = lines.slice(identAt + 1).some((t) => /CC01.?COMPLETE/.test(t));
    if (!completed) {
      const s = m.snapshot();
      console.log(`demo 1: CC01A typed; no CC01 COMPLETE — stop=${escaped ?? stop ?? 'none'} IAR=${String(s.iar).padStart(5, '0')} after ${s.instructions} instructions`);
    }
    expect(completed, 'the diagnostic types CC01 COMPLETE after its ident').toBe(true);
  });
});

// ═══ Demo 2 — the one for a period reader ═════════════════════════════════

const A_FIELD = 500;          // 00500-00502, units 00502
const B_FIELD = 600;          // 00600-00603, units 00603
const PROGRAM = 700;          // 00700-00712

/**
 * Key the whole thing by hand, exactly as §4's procedure runs: DISPLAY the location, turn the
 * rotary to ALTER, type the line. A freshly built machine has no word marks anywhere, so each
 * display runs to the end of line and the alter may write the whole field (software.md §10.8).
 *
 * The two fields are SIGNED, which on this machine means the sign rides as a zone over the units
 * position: +123 is keyed `12C` (C = the 12-zone over 3) and +4567 is keyed `456G`
 * (G = the 12-zone over 7) — research/charset.md §2, opcodes.md §4.1.
 */
function keyedAdd(): Machine {
  const m = createMachine({ size: 10_000 });

  const key = (at: Addr, text: string, marks: readonly boolean[]): void => {
    m.display(at);
    m.setMode('alter');
    m.alter(text, marks);
  };

  key(A_FIELD, '12C', [true, false, false]);
  key(B_FIELD, '456G', [true, false, false, false]);
  // `A 00502 00603` then `.` Halt. Both operands are addressed at their UNITS position. The
  // trailing blank carries the word mark that bounds the halt, because instruction read-out is a
  // scan to the NEXT word mark (architecture.md §7) and there are none on a cleared machine.
  key(PROGRAM, 'A0050200603. ', [true, ...Array<boolean>(10).fill(false), true, true]);

  m.setMode('addressSet');
  m.keyAddress('00700');
  m.start();
  return m;
}

/** The four B-field digits as numbers. The 1410 zero is 8-2, so a bare `& 0x0f` reads 10. */
function bDigits(m: Machine): number[] {
  const cells = m.snapshot().coreWindow.cells;
  return [1, 2, 3, 4].map((i) => {
    const d = (cells[i] ?? 0) & 0x0f;
    return d === 10 ? 0 : d;
  });
}

describe('demo 2 — a three-instruction add, keyed by hand and half-cycled (plan §8)', () => {
  function halfCycled(): Machine {
    const m = keyedAdd();
    // The core slice starts one position BELOW the B field, so the guard position 00599 — the one
    // the word mark at 00600 must protect — is in view.
    m.windowBase = B_FIELD - 1;
    m.setMode('ieCycle');
    return m;
  }

  it('DISPLAY and ALTER really put the program in core', () => {
    const m = keyedAdd();
    expect(m.snapshot().iar, 'ADDRESS SET keyed the entry point').toBe(PROGRAM);
    expect(m.storage.wm(A_FIELD), 'the word mark was re-entered with the field').toBe(true);
    expect(m.storage.wm(B_FIELD)).toBe(true);
    expect(m.storage.wm(PROGRAM)).toBe(true);
    expect(m.storage.wm(PROGRAM + 11), 'the halt is its own instruction').toBe(true);
    expect(m.storage.wm(PROGRAM + 12), 'and the scan that reads it has somewhere to stop').toBe(true);
    // §2's table: a display prints `D` twice, an alter prints `A`, an address set prints `B`.
    // Two `S` lines and no more, because only two turns of the rotary happened: RUN -> ALTER
    // before the first field, and ALTER -> ADDRESS SET at the end. Keying the second and third
    // fields leaves the switch where it already is, and a setting that does not change types
    // nothing (research/console-and-physical.md §4 "Mode-switch side effect").
    expect(m.snapshot().console.map((l) => l.id))
      .toEqual(['D', 'D', 'S', 'A', 'D', 'D', 'A', 'D', 'D', 'A', 'S', 'B']);
  });

  it('the B field fills RIGHT TO LEFT, one position per E half cycle', () => {
    const m = halfCycled();
    const guard = m.snapshot().coreWindow.cells[0] ?? 0;

    // Cycle 1 is the I phase — read-out, decode, IAR = NSI, and nothing written.
    expect(m.start()).toBeUndefined();
    expect(bDigits(m), 'the I phase writes no operand position').toEqual([4, 5, 6, 7]);
    expect(m.snapshot().bar, 'BAR holds the B units address until the instruction completes').toBe(603);

    // Then one B position per E cycle, units first. 4567 + 123 = 4690.
    const seen: number[][] = [];
    let starts = 1;
    while (m.snapshot().bar === 603 && starts < 20) {
      m.start();
      starts++;
      seen.push(bDigits(m));
    }

    expect(seen[0], 'units: 7 + 3 = 10 — a zero written and a carry').toEqual([4, 5, 6, 0]);
    expect(seen[1], 'tens: 6 + 2 + carry').toEqual([4, 5, 9, 0]);
    expect(seen[2], 'hundreds: 5 + 1').toEqual([4, 6, 9, 0]);
    expect(seen[3], 'the word-marked high-order position, A exhausted: 4 + 0').toEqual([4, 6, 9, 0]);
    expect(seen.at(-1), 'and that is the answer').toEqual([4, 6, 9, 0]);

    // One I phase + one E cycle per B position + the end record + the cycle that applies the
    // registers = 7. The B-field word mark at 00600 is what fixes that count: a five-position
    // field would take one more (test/step-cycle.test.ts).
    expect(starts, 'I + 4 scans + end + complete').toBe(7);
    expect(m.snapshot().coreWindow.cells[0], 'the word mark stopped it — 00599 is untouched')
      .toBe(guard);
    expect(m.snapshot().bar, 'B − LB on completion').toBe(599);
  });

  it('the sign rides on the units position and the add does not disturb it', () => {
    const m = halfCycled();
    const zone = (cell: number): number => cell & 0x30;
    const before = zone(m.snapshot().coreWindow.cells[4] ?? 0);
    for (let i = 0; i < 7; i++) m.start();
    expect(zone(m.snapshot().coreWindow.cells[4] ?? 0), 'a true add develops no new sign')
      .toBe(before);
  });

  it('half-cycles on into the halt, and the machine stops', () => {
    const m = halfCycled();
    let stop: StopReason | undefined;
    for (let i = 0; i < 12 && stop === undefined; i++) stop = m.start();
    expect(stop).toBe('halt');
    expect(bDigits(m), 'with the answer in the B field').toEqual([4, 6, 9, 0]);
    // Every START in MODE = I/E CYCLE types its own `C` line. The COUNT is the plan's, not §4's:
    // §4 gives one START per instruction PHASE, while `stepCycle()` steps the E side one STORAGE
    // cycle per START so the B field can be watched filling (plan §1, §7, §8 demo 2 — the
    // deviation is stated on `Cpu.stepCycle` and on machine.ts's `ieCycle` case). §4 is still the
    // authority for the `C` ID and for one line per START (A22-0526-3 p.50); only how many STARTs
    // an instruction takes is ours.
    expect(m.snapshot().console.filter((l) => l.id === 'C').length).toBeGreaterThanOrEqual(9);
  });
});
