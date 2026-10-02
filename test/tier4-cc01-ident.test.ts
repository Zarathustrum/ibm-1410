// Tier 4 (smoke) — `cc01.cor` from its entry point types its ident on the console.
// research/emulators.md §4.3: the whole 10,000-position image holds exactly five I/O
// instructions and all five target `%T0`, the console printer. `M %T0 01250 W` at 02194 types
// the `CC01A` ident, which is word-marked at 01250 and group-mark terminated. §4.4: the entry
// point is IAR = 02000.
//
// This is a SMOKE test, not a gate (plan §7, §10): there is no published pass/fail transcript
// for CC01A. It asserts the one thing Wave 2 owes — that the ident reaches the console log —
// and then PRINTS where the run stops, which will be an op a later wave still owes.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { createMachine, type Machine } from '../src/core/machine.js';
import { loadCor } from '../src/formats/cor.js';
import { ORACLES_ABSENT_MESSAGE, oraclePath } from './oracles.js';
import type { StopReason } from '../src/core/types.js';

const ENTRY = 2000;
const IDENT = 'CC01A';
/** emulators.md §4.3: `M %T0 01250 W` at 02194 — the ident type-out. */
const IDENT_WRITE = 2194;

function cc01(): Machine {
  const path = oraclePath('cc01.cor');
  if (path === null) throw new Error(ORACLES_ABSENT_MESSAGE);
  // `zeroFill: 'keep'` — cc01.cor fills with 0x40, a valid blank; nothing needs normalising
  // (cor.test.ts asserts byte identity for this image).
  const img = loadCor(readFileSync(path).slice().buffer as ArrayBuffer, { zeroFill: 'keep' });
  const m = createMachine({ size: 10_000 });
  m.loadImage(img);
  m.addressSet(ENTRY);
  return m;
}

interface RunResult {
  /** A stop of the emulated MACHINE — a `StopReason`. */
  stop: StopReason | undefined;
  /** A stop of the EMULATOR — the build-order stub of an executor a later wave owes. */
  notBuilt: string | undefined;
  /** The op-code address of the instruction that ended the run. */
  at: number;
  instructions: number;
}

/**
 * Steps until the machine stops, an executor a later wave owes throws its build-order stub, or
 * `limit` instructions have run. The stub throws a plain `Error`, not a `MachineCheck`, exactly
 * so that "the emulator does not have this yet" cannot be mistaken for "the 1410 stopped"
 * (isa/exec/stub.ts; plan §4.1).
 */
function runSmoke(m: Machine, limit: number): RunResult {
  for (let i = 0; i < limit; i++) {
    const at = m.regs.iar;
    try {
      const stop = m.step();
      if (stop !== undefined) return { stop, notBuilt: undefined, at, instructions: m.cpu.instructions };
    } catch (e) {
      return { stop: undefined, notBuilt: (e as Error).message, at, instructions: m.cpu.instructions };
    }
  }
  return { stop: undefined, notBuilt: undefined, at: m.regs.iar, instructions: m.cpu.instructions };
}

describe.skipIf(!oraclePath('cc01.cor'))('cc01.cor flow-chart step 5 — "type ident"', () => {
  it('types CC01A on the console printer', () => {
    const m = cc01();
    const result = runSmoke(m, 2000);

    expect(m.console.lines.map((l) => l.text), 'the console log').toContain(IDENT);
    // WCP is move mode, so the line carries no word marks even though 01250 is word-marked in
    // core (io.md §8 Figure 44, "word marks not indicated").
    const line = m.console.lines.find((l) => l.text === IDENT);
    expect(line?.id, 'a program message is a console reply line').toBe('R');
    expect(line?.wordMarks).toEqual([false, false, false, false, false]);

    // Where it got to. Expected to be an op a later wave still owes — printed, never hidden
    // (plan §7: tier 4 is a smoke test, and `oracle/cc01a-halts.ts` grows one entry at a time).
    console.info(
      `[tier4] cc01.cor from ${ENTRY}: stop=${String(result.stop)} notBuilt=${String(result.notBuilt)} ` +
      `at=${result.at} instructions=${result.instructions} ` +
      `lines=${JSON.stringify(m.console.lines.map((l) => l.text))}`,
    );
    // The marker, moved forward each time a wave earns it. It was the `G` at 02258 (plan §5
    // Wave 3), then the `!` at 03055 (Wave 6), then the `/ 00000` at 03436 while Clear Storage
    // treated its own 000 boundary as an address check. With that ruling settled
    // (`CLEAR_STORAGE_BAR_AT_00000`, storage.ts) the run types both messages and ends on CC01A's
    // last step, the tape read-in relocated into blank low core at 00322.
    // `test/tier4-cc01-progress` owns the observation of where it gets to and why; this stays a
    // one-line tripwire.
    expect(result.notBuilt, 'no executor a later wave owes was reached').toBeUndefined();
    expect(result.at, 'the relocated tape read-in at 00322').toBe(322);
    expect(result.stop, 'blank storage there — see tier4-cc01-progress').toBe('instructionCheck');
  });

  it('reaches the ident write at 02194 with the channel interlock clear', () => {
    const m = cc01();
    while (m.regs.iar !== IDENT_WRITE) {
      const stop = m.step();
      if (stop !== undefined) throw new Error(`stopped at ${m.regs.iar} before reaching 02194: ${stop}`);
    }
    expect(m.snapshot().channel1.interlock, 'nothing has used channel 1 yet').toBe(false);
    expect(m.step()).toBeUndefined();
    // `.at(-1)`, not `[0]`: MODE = ADDRESS SET types its own `B` print-out line into the log
    // before the program runs (machine.ts `addressSet`, plan §1).
    expect(m.console.lines.at(-1)?.text).toBe(IDENT);
    expect(m.snapshot().channel1.interlock, 'and now it is set — io.md §5 step 5').toBe(true);
  });

  it('the `R 02194 2` at 02204 is not taken, and the `R 02218 ⧧` at 02211 releases', () => {
    // Busy is never set on a console write (io.md §8 Figures 45-46), so the retry branch back to
    // the write is not taken; the group-mark form then clears the interlock without branching
    // (io.md §5, A22-0530-1 p.8) — which is the only reason the next `M` on channel 1 does not
    // stop the system.
    const m = cc01();
    const seen = new Map<number, { taken: boolean; interlockAfter: boolean }>();
    for (let i = 0; i < 200; i++) {
      const at = m.regs.iar;
      let stop: StopReason | undefined;
      try {
        stop = m.step();
      } catch {
        break;                       // an executor a later wave owes — see `runSmoke` above
      }
      if (at === 2204 || at === 2211) {
        seen.set(at, {
          taken: m.regs.iar !== at + 7,
          interlockAfter: m.snapshot().channel1.interlock,
        });
      }
      if (stop !== undefined) break;
    }
    expect(seen.get(2204), 'R 02194 2 — busy off, no branch').toEqual({
      taken: false, interlockAfter: true,
    });
    expect(seen.get(2211), 'R 02218 ⧧ — released without branching').toEqual({
      taken: false, interlockAfter: false,
    });
  });
});
