// src/core/cpu.ts — the fetch/decode/execute loop, and the only place a machine check becomes
// a stop reason.
// Source: docs/plans/phase-1-cpu-core.md §4.1; docs/plans/architecture.md §4.4.
//
// The loop is the plan's, in the plan's order. Everything it does between the word mark and
// the E phase lives in decode.ts; everything it does after lives in the table's `exec`,
// `regs` and `timing` columns. This file adds the counters, the trace hooks and the catch.
//
// Wave 3 split that loop at the STORAGE-CYCLE boundary, because MODE = I/E CYCLE is a real
// console position and the add demo needs it (plan §1, §8 demo 2): `beginInstruction` is the
// I phase, `executeCycle` is one E cycle, and `endInstruction` is the post-execution
// bookkeeping — ONE copy of it, shared by `step()` and `stepCycle()`.

import { applyFields, classifyForm, effectiveDChar, fetch, pickForm } from './decode.js';
import { InstructionCheck, MachineCheck, UnimplementedOp, stopReasonOf } from './checks.js';
import { INDEX_US } from './cycles.js';
import { applyRegs } from './isa/regs.js';
import { OPS, selectForm } from './isa/table.js';
import { BLANK_WITH_C } from './registers.js';
import { disassemble, formatL1, formatL2, formatL3Latch, glyphOfCell, type Tracer } from './trace.js';
import {
  BCD6, C, WM,
  type Channel, type CycleStep, type ExecContext, type Fetched, type Form,
  type IndicatorLatches, type LatchTraceRecord, type OpEntry, type Registers, type StopReason,
  type Storage,
} from './types.js';

import type { FieldEffects } from './decode.js';

export interface CpuOptions {
  tracer?: Tracer;
}

/** An instruction between its read-out and the cycle that completes it. */
interface InFlight {
  ctx: ExecContext;
  fetched: Fetched;
  shape: Form;
  entry: OpEntry;
  effects: FieldEffects;
  /** `exec` has been called. A multi-cycle executor left its iterator in `iter`. */
  started: boolean;
  iter?: Iterator<LatchTraceRecord | undefined>;
}

/** What one E cycle did. `complete` means `endInstruction` has run. */
interface ExecutedCycle {
  record?: LatchTraceRecord;
  complete: boolean;
  stop?: StopReason;
}

export class Cpu {
  /** Instructions that completed an execute phase. Decode-only steps do not count. */
  instructions = 0;

  /**
   * Simulated 1411 time, base machine, 4.5 µs core cycle (cycles.ts). NEVER rendered as a
   * clock — plan §4.3: this is a cycle count in microseconds, not a wall time.
   */
  microsecondsSimulated = 0;

  lastStop?: StopReason;
  lastCheck?: MachineCheck;
  tracer?: Tracer;

  /** Set between the I phase and the cycle that completes the instruction. */
  private inFlight: InFlight | undefined;

  constructor(
    private readonly storage: Storage,
    private readonly regs: Registers,
    /** The seven latches of opcodes.md §8 — read by `J`, written by the arithmetic and
     *  compare ops. The machine owns them so a reset key can reach them (machine.ts). */
    private readonly indicators: IndicatorLatches,
    /** Data channel 1 — `M`, `L` and `R` reach the outside world through this and nothing
     *  else (research/io.md §5; docs/plans/architecture.md §4.10). */
    private readonly channel1: Channel,
    opts?: CpuOptions,
  ) {
    if (opts?.tracer) this.tracer = opts.tracer;
  }

  /**
   * One instruction. Returns a `StopReason` if the machine stopped, `undefined` if it is still
   * running. `execute: false` is the decode-only mode `note1410.txt` says the length and index
   * blocks need (emulators.md §5.2) — a supported mode here rather than a patched simulator.
   *
   * An instruction left half-cycled by `stepCycle()` is carried to completion first: START out
   * of MODE = I/E CYCLE does not re-read the instruction it was in the middle of.
   */
  step({ execute = true } = {}): StopReason | undefined {
    try {
      if (this.inFlight === undefined && !this.beginInstruction(execute)) return undefined;
      for (;;) {
        const cycle = this.executeCycle();
        if (cycle.complete) return cycle.stop;
      }
    } catch (e) {
      return this.stopOn(e);
    }
  }

  /**
   * ONE STORAGE CYCLE — the MODE = I/E CYCLE half cycle (plan §1, §7, §8 demo 2;
   * research/console-and-physical.md §3, which lists six MODE positions and no SINGLE STEP
   * key). The first call performs the I phase: read-out, decode, field assignment, IAR = NSI,
   * and nothing written to the operand fields. Each call after that advances the executor by
   * one cycle — for `A` and `S` that is exactly one B position written, from the units digit
   * leftward, until the B-field word mark stops it — and the cycle that finds the executor
   * finished applies the register effects and the timing.
   *
   * PLAN-DEVIATION from research/console-and-physical.md §4 (A22-0526-3 p.50). §4 says "Each
   * START executes one instruction PHASE; the print-out is preceded by `C`" — two STARTs per
   * instruction, I then E, however many storage cycles the E phase takes. This steps the E side
   * one STORAGE cycle per call instead, which is the settled plan choice (plan §1 "a
   * storage-cycle boundary, not just an instruction boundary", §7, §8 demo 2): the whole point
   * of the demo is watching the B field fill one position at a time, and a whole
   * `A aaaaa bbbbb` finishes in a single phase. The I side matches §4 exactly; only the E side
   * is finer than the real key.
   */
  stepCycle(): CycleStep {
    const phase: 'I' | 'E' = this.inFlight === undefined ? 'I' : 'E';
    try {
      if (phase === 'I') {
        this.beginInstruction(true);
        return { phase, complete: false };
      }
      return { phase, ...this.executeCycle() };
    } catch (e) {
      const stop = this.stopOn(e);
      return { phase, complete: true, stop };
    }
  }

  /** Steps until the machine stops or `maxInstructions` have been attempted. */
  run(maxInstructions: number): StopReason | undefined {
    for (let i = 0; i < maxInstructions; i++) {
      const stop = this.step();
      if (stop !== undefined) return stop;
    }
    return undefined;
  }

  /** A machine check becomes a stop reason; anything else is an emulator bug and rethrows. */
  private stopOn(e: unknown): StopReason {
    const stop = stopReasonOf(e);
    if (stop === undefined) throw e;
    this.inFlight = undefined;                 // a checked instruction does not resume
    this.lastStop = stop;
    this.lastCheck = e as MachineCheck;
    return stop;
  }

  /**
   * The I phase. Returns false in decode-only mode, where nothing is left in flight — the
   * implemented-check and the executor are both downstream of that return.
   */
  private beginInstruction(execute: boolean): boolean {
    const fetched = fetch(this.storage, this.regs.iar);
    const length = fetched.chars.length;

    const entry = OPS[(fetched.chars[0] ?? 0) & BCD6];
    if (!entry) throw new InstructionCheck('undefined op code', fetched.opAddr);

    const matched = selectForm(entry, length);   // the ONLY use of the length table
    if (!matched) throw new InstructionCheck('invalid instruction length', fetched.opAddr);
    const shape = classifyForm(entry, matched, length);
    const form = pickForm(entry, length, effectiveDChar(shape, fetched, this.regs)) ?? matched;

    const Ap = this.regs.aar, Bp = this.regs.bar;
    const effects = applyFields(entry, shape, fetched, this.regs, this.storage);
    // The Op register is SEVEN bits — "Op | 7 | op code, WM bit dropped"
    // (research/architecture.md §6, A22-0526-3 pp.8-10 Figure 5). The word mark that started the
    // read-out belongs to the instruction in storage, not to the register, and the console
    // print-out types the op character from here.
    //
    // Dropping the WM bit FLIPS THE CHECK BIT: parity is odd over BA8421 + WM + C, so a
    // word-marked character whose word mark is removed must have its C bit inverted to stay
    // valid (research/architecture.md §2, research/charset.md §1, A22-0526-3 p.5 — the same
    // rule storage.setWm and the channel's load-mode word-mark strip already honour). Without
    // the flip every op code read out of storage lands in the Op register with EVEN parity and
    // the stop print-out underlines the op character on every halt.
    const opCell = fetched.chars[0] ?? BLANK_WITH_C;
    this.regs.op = (opCell & (C | BCD6)) ^ ((opCell & WM) !== 0 ? C : 0);
    this.regs.iar = fetched.nsi;                 // = NSI, the address of the next word mark
    this.traceDecode(fetched, shape, entry, effects);
    if (!execute) return false;

    // PLAN-DEVIATION (logged): implemented-check moved after the decode-only return — tier 2
    // decodes @ % Z E, T from ilentest.cor without executing them; dispatching them still
    // raises UnimplementedOp.
    if (!entry.implemented) {
      throw new UnimplementedOp(entry.opChar, entry.feature, form.cite, fetched.opAddr);
    }

    const t = this.tracer;
    const ctx: ExecContext = {
      storage: this.storage,
      regs: this.regs,
      fetched,
      entry,
      form,
      // A and B are the addresses this read-out left in AAR and BAR; Ap and Bp are what the
      // previous operation left there. LA/LB/LW/BI/NSIB are the executor's to fill
      // (opcodes.md §1.3, A22-0526-3 Figure 8 p.13).
      sym: {
        A: this.regs.aar, B: this.regs.bar, Ap, Bp,
        LA: 0, LB: 0, LW: 0, NSI: fetched.nsi, NSIB: fetched.nsi, BI: 0,
      },
      branchTaken: false,
      indicators: this.indicators,
      channel1: this.channel1,
      // Figure 7's `R`, which only an add or subtract that actually recomplements sets.
      recomplement: 0,
      // The rest of Figure 7's executor-supplied terms (opcodes.md §1.5): `@` fills M, `%` fills
      // Q, and N / Z / D wait for `T` and `E`. Zero is "this operation develops no such term".
      terms: { M: 0, Q: 0, N: 0, Z: 0, D: 0 },
      halt: false,
      // The L3 sink exists only at level 3, and with no tracer the records are not BUILT at
      // all (plan §6.2, `alu.ts`): the generator still yields once per storage cycle, which is
      // all `stepCycle()` needs, but it yields `undefined` instead of a twelve-field record.
      // The L3 trace is the only consumer of the records; the UI watches the B field fill
      // through `snapshot().coreWindow` (src/ui/internals/coreView.ts).
      ...(t && t.level === 3 ? { traceLatch: (r: LatchTraceRecord) => t.sink(formatL3Latch(r)) } : {}),
    };
    this.inFlight = { ctx, fetched, shape, entry, effects, started: false };
    return true;
  }

  /**
   * One E cycle. The executor is called on the FIRST E cycle, never in the I phase: a
   * single-cycle executor does its whole job here, and a multi-cycle one only builds its
   * generator, whose every `next()` is one storage cycle.
   */
  private executeCycle(): ExecutedCycle {
    const f = this.inFlight;
    if (f === undefined) throw new Error('execute cycle with no instruction in flight');

    if (!f.started) {
      f.started = true;
      const produced = f.ctx.form.exec(f.ctx);
      if (produced !== undefined) f.iter = produced;
    }
    if (f.iter !== undefined) {
      const next = f.iter.next();
      if (next.done !== true) {
        // `exactOptionalPropertyTypes`: an untraced cycle carries no `record` key at all.
        const record = next.value;
        return record === undefined ? { complete: false } : { record, complete: false };
      }
    }

    this.inFlight = undefined;
    const stop = this.endInstruction(f);
    return stop === undefined ? { complete: true } : { complete: true, stop };
  }

  /** Registers, timing, counters and the halt flag — the one copy, per plan §4.1. */
  private endInstruction(f: InFlight): StopReason | undefined {
    const { ctx, fetched, shape, entry, effects } = f;
    const form = ctx.form;

    const triple = ctx.branchTaken || !form.regsNotTaken ? form.regs : form.regsNotTaken;
    const applied = applyRegs(triple, ctx.sym);
    if (applied.iar !== 'special') this.regs.iar = applied.iar;
    if (applied.aar !== 'special') this.regs.aar = applied.aar;
    if (applied.bar !== 'special') this.regs.bar = applied.bar;

    // The taken-branch model, architecture.md §9 row C5 / plan §4.1. opcodes.md §2 prints
    // `IAR = NSIB` for a taken branch; research/architecture.md §9 says IAR becomes the branch
    // address + 1. Both describe the same machine at different instants: at the end of the
    // execute phase IAR holds NSIB and AAR holds BI, and the NEXT read-out takes the op-code
    // address from AAR into STAR and reloads IAR (opcodes.md §1.3). Setting IAR = BI here and
    // always fetching from IAR is behaviourally identical for every program, because the
    // subroutine-return mechanism `G ccccc B` reads BAR — which the triple above has just left
    // holding NSIB.
    if (ctx.branchTaken) this.regs.iar = ctx.sym.BI;

    // Every indexed address costs one index cycle on the base machine (cycles.ts INDEX_US,
    // A22-0526-3 p.15).
    const cycles = form.timing(ctx) + effects.indexed * INDEX_US;
    this.microsecondsSimulated += cycles;
    this.instructions++;
    this.traceStep(fetched, shape, entry, cycles);

    // Op `.` (opcodes.md §2 p.23). The HALT is not a check: the instruction completed, so its
    // register effects and its timing are already counted above, and the machine stops with IAR
    // where the form's own register column put it — NSI for `.`, the branch address for
    // `. iiiii`. The next `step()` is the operator's START key and simply carries on there.
    if (ctx.halt) {
      this.lastStop = 'halt';
      return 'halt';
    }
    return undefined;
  }

  // Nothing is formatted when no tracer is attached — the records are not built either.
  private traceDecode(f: Fetched, shape: Form, entry: OpEntry, effects: FieldEffects): void {
    const t = this.tracer;
    if (!t || t.level < 2) return;
    t.sink(formatL2({
      addr: f.opAddr,
      form: shape,
      length: f.chars.length,
      opChar: entry.opChar,
      aar: this.regs.aar,
      bar: this.regs.bar,
      touched: effects.a !== null || effects.b !== null,
      addressDouble: entry.addressDouble,
      dCycle: effects.dCycle,
      status: 'OK',
    }));
  }

  private traceStep(f: Fetched, shape: Form, entry: OpEntry, cycles: number): void {
    const t = this.tracer;
    if (!t) return;
    t.sink(formatL1({
      iar: f.opAddr,
      aar: this.regs.aar,
      bar: this.regs.bar,
      opChar: entry.opChar,
      dGlyph: glyphOfCell(this.regs.opMod),
      length: f.chars.length,
      cycles,
      text: disassemble(shape, f.chars),
    }));
  }
}
