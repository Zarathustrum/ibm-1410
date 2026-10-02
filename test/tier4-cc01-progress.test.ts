// Tier 4 (smoke) — how far `cc01.cor` gets. The companion to `tier4-cc01-ident.test.ts`, which
// owns the ident type-out; this file owns the MARKER: the run no longer ends where the previous
// wave left it, and where it ends instead is printed, never hidden.
//
// Not a gate (plan §7, §10): nobody has published a pass/fail transcript of CC01A under any
// simulator, so a clean run establishes a baseline rather than confirming one. The assertions are
// the WAVE'S OWN CLAIM — Wave 3's `G` executes, Wave 6's `!` and `?` execute — plus the observed
// stop, recorded as a constant so the next wave that moves it has to say so.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { createMachine, type Machine } from '../src/core/machine.js';
import { loadCor } from '../src/formats/cor.js';
import { ORACLES_ABSENT_MESSAGE, oraclePath } from './oracles.js';
import type { StopReason } from '../src/core/types.js';

const ENTRY = 2000;
/** The first `G ccccc B` on the executed path — emulators.md §5.1; plan §5 Wave 3. */
const FIRST_G = 2258;
/** Its C-address: the five characters at 02227-02231 are the I-address of the `J` at 02226. */
const G_TARGET = 2231;

/** Where Wave 5 left the marker: the first `!` Zero and Subtract on the executed path. */
const FIRST_ZS = 3055;
/**
 * Every `?` / `!` CC01A reaches from 02000, in execution order — two two-field `!`, a one-field
 * `!`, and a two-field `?`. Each is followed by `V (I)(B) d` zone tests that read the sign and
 * the body zones the op left, so getting past them is a real check of Wave 6 and not merely of
 * its dispatch (`V` d-characters: `K` zone B, `S` zone A, `2` no zones, `B` zone BA — §6.3).
 */
const ZERO_ARITH = [3055, 3066, 3123, 3226];

/** The second type-out, and the last thing CC01A has to say (emulators.md §4.1 p.005). */
const COMPLETE = 'CC01 COMPLETE';

/**
 * OBSERVED, not expected — there is no published transcript to expect anything from (plan §7
 * tier 4).
 *
 * The marker was the `/ 00000` at 03436 while `clearToHundreds` treated the 000 block as an
 * address check. It is not one: `/` "terminates on the hundreds boundary" (opcodes.md §2 p.23),
 * and CC01A reads the registers straight back and halts unless AAR = 00000 and BAR's low four
 * digits = 9999 — see `CLEAR_STORAGE_BAR_AT_00000` in storage.ts and `oracle/cc01a-halts.ts`.
 * With that ruling the run types `CC01 COMPLETE` and walks all the way to CC01A's last step.
 *
 * Where it now stops is the flow chart's "read in tape control" and it is not an error of ours.
 * `D 08967 00333 Δ` relocates 08967-08987 to 00333-00353 and `J 00322` at 08959 branches into
 * the result; the copy is self-locating — its own `R 00346 ⧧` at 00339 points at the copied
 * `J 01972` that lands exactly at 00346 — which leaves 00322-00331 a ten-character hole for the
 * tape read `M` the CE keys per channel. `cc01.cor` entered at 02000 never fills it, and the
 * image holds no tape instruction anywhere (emulators.md §4.3), so reading an instruction out of
 * blank storage at 00322 is an `instructionCheck`. `oracle/cc01a-halts.ts` carries the decode.
 *
 * CONSEQUENCE for plan §7's PASS rule: `J 01972` at **08980 is not on the executed path**. It is
 * reached only as the relocated copy at 00346, and only once the missing read at 00322 has run.
 * emulators.md §4.4 took 08980 off the static image; this trace disproves it. Changing the PASS
 * rule is the orchestrator's call, not this file's.
 */
const OBSERVED_STOP = { at: 322, stop: 'instructionCheck' as StopReason | undefined };

/** The relocation that ends the run: the two `D`s and the `J` into the copy. */
const TAPE_READIN = [8935, 8947, 8959];

function cc01(): Machine {
  const path = oraclePath('cc01.cor');
  if (path === null) throw new Error(ORACLES_ABSENT_MESSAGE);
  const m = createMachine({ size: 10_000 });
  m.loadImage(loadCor(readFileSync(path).slice().buffer as ArrayBuffer, { zeroFill: 'keep' }));
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
  /** Every op-code address the run read out, in order. */
  path: number[];
}

function runSmoke(m: Machine, limit: number): RunResult {
  const path: number[] = [];
  for (let i = 0; i < limit; i++) {
    const at = m.regs.iar;
    path.push(at);
    try {
      const stop = m.step();
      if (stop !== undefined) return { stop, notBuilt: undefined, at, instructions: m.cpu.instructions, path };
    } catch (e) {
      return { stop: undefined, notBuilt: (e as Error).message, at, instructions: m.cpu.instructions, path };
    }
  }
  return { stop: undefined, notBuilt: undefined, at: m.regs.iar, instructions: m.cpu.instructions, path };
}

describe.skipIf(!oraclePath('cc01.cor'))('cc01.cor — the marker now sits past both type-outs', () => {
  it('gets past the `?` and `!` block without an unbuilt-op error, and reports where it now stops', () => {
    const m = cc01();
    const result = runSmoke(m, 2000);

    console.info(
      `[tier4/progress] cc01.cor from ${ENTRY}: IAR=${String(result.at).padStart(5, '0')} `
      + `stop=${String(result.stop)} notBuilt=${String(result.notBuilt)} `
      + `instructions=${result.instructions} µs=${m.cpu.microsecondsSimulated}\n`
      + `  AAR=${String(m.regs.aar).padStart(5, '0')} BAR=${String(m.regs.bar).padStart(5, '0')} `
      + `CAR=${String(m.regs.car).padStart(5, '0')}\n`
      + `  console=${JSON.stringify(m.console.lines.map((l) => l.text))}`,
    );

    expect(result.path, 'the `G` at 02258 was read out').toContain(FIRST_G);
    expect(result.at, 'and the run did not end there').not.toBe(FIRST_G);
    expect(result.notBuilt ?? '', 'nothing failed on the `G` stub').not.toMatch(/not built yet: G/);
    // The three `G`s at 02258 / 02265 / 02272 and the `J 02226` at 02279 are one block; getting
    // to 02279 means all three executed.
    expect(result.path, 'all three `G`s of the 02258 block ran').toEqual(
      expect.arrayContaining([2258, 2265, 2272, 2279]),
    );

    // Wave 6's own claim.
    expect(result.path, 'every `?` and `!` CC01A reaches was read out')
      .toEqual(expect.arrayContaining(ZERO_ARITH));
    expect(result.at, 'and the run did not end on the first `!`').not.toBe(FIRST_ZS);
    expect(result.notBuilt ?? '', 'nothing failed on the `?` / `!` stubs')
      .not.toMatch(/not built yet: [?!]/);
    // CC01A reads back what they wrote: the last `?` at 03226 is followed by four `V` zone tests
    // (03249 / 03268 / 03287 / 03306) that each branch to the next only if the sign and the body
    // zones are what the manual says. Reaching 03325 means all four took their branch.
    expect(result.path, 'the zone tests after the `?` at 03226 all branched')
      .toEqual(expect.arrayContaining([3249, 3268, 3287, 3306, 3325]));

    // The `/ 00000` at 03436 is now executed rather than stopped on, and the run goes on to
    // CC01A's own last step — the relocation at 08935/08947 and the branch into it at 08959.
    expect(result.path, 'the `/ 00000` at 03436 executed').toContain(3436);
    expect(result.at, 'and the run did not end there').not.toBe(3436);
    expect(result.path, 'the tape read-in relocation ran')
      .toEqual(expect.arrayContaining(TAPE_READIN));

    // The baseline, printed above and pinned here. Not an expected value from any source.
    expect({ at: result.at, stop: result.stop }, 'the marker — see OBSERVED_STOP')
      .toEqual(OBSERVED_STOP);
    expect(result.notBuilt, 'no executor a later wave owes was reached').toBeUndefined();
    // In order, and asserted as an order: `arrayContaining` is a subset check that does not
    // care which came first, so the sequence has to be compared by position.
    const typed = m.console.lines.map((l) => l.text);
    expect(typed, 'the ident type-out').toContain('CC01A');
    expect(typed, 'the completion type-out').toContain(COMPLETE);
    expect(typed.indexOf('CC01A'), `${COMPLETE} typed after CC01A, not before`)
      .toBeLessThan(typed.indexOf(COMPLETE));
  });

  it('the `G 02231 B` at 02258 writes five characters into the `J` at 02226', () => {
    // The subroutine-return shape of opcodes.md §2.1 / p.22, on the real image: 02226 holds
    // `J 02233 ␣`, so its I-address occupies 02227-02231 and 02231 is the C-address `G` names.
    // Whatever BAR holds at 02258 lands there — this asserts the WRITE, not the value, because
    // the value is CC01A's business and this tier carries no expected transcript.
    const m = cc01();
    const before: number[] = [];
    for (let a = G_TARGET - 4; a <= G_TARGET; a++) before.push(m.storage.read(a));

    let bar = -1;
    for (let i = 0; i < 2000; i++) {
      if (m.regs.iar === FIRST_G) { bar = m.regs.bar; }
      try {
        if (m.step() !== undefined) break;
      } catch { break; }
      if (bar >= 0) break;                      // the step that just ran WAS the `G`
    }

    expect(bar, 'reached the `G` at 02258').toBeGreaterThanOrEqual(0);
    const after: number[] = [];
    for (let a = G_TARGET - 4; a <= G_TARGET; a++) after.push(m.storage.read(a));
    expect(after, 'the five-character I-address changed').not.toEqual(before);

    // Five decimal characters, units digit ON the C-address (opcodes.md §2 p.22).
    const digits = after.map((cell) => { const n = cell & 0x0f; return n === 0b1010 ? 0 : n; });
    expect(digits.reduce((acc, d) => acc * 10 + d, 0), 'reads back as the BAR `G` was given')
      .toBe(bar);
  });
});
