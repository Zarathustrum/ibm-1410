// src/core/checks.ts — the machine's stop conditions as typed exceptions.
// Source: docs/plans/architecture.md §4 file map; docs/plans/phase-1-cpu-core.md §3, §5 Wave 0.
//
// Every abnormal termination the 1410 documents is thrown as a `MachineCheck` subclass and
// caught once, at the top of `step()`. The `stop` field is the same `StopReason` union the UI
// renders, so a caught check converts to machine state without a second mapping table.

import type { Addr, OpEntry, StopReason } from './types.js';

// research/console-and-physical.md §3 (A22-0526-3 p.49, p.52): the operator sees a stop and a
// print-out; the check that caused it is identified by its own name on the console. `at` is the
// storage address the check was raised against, where one is known.
export abstract class MachineCheck extends Error {
  readonly stop: StopReason;
  readonly at?: Addr;

  protected constructor(stop: StopReason, message: string, at?: Addr) {
    super(message);
    // `exactOptionalPropertyTypes` forbids assigning an explicit `undefined` to `at?: Addr`.
    if (at !== undefined) this.at = at;
    this.stop = stop;
    this.name = new.target.name;
  }
}

// research/architecture.md §4 (A22-0526-3 p.8): an invalid address character, a zone bit outside
// the tens/hundreds positions, 00000 in a decrementing operation, the top address in an
// incrementing operation, or an address outside installed storage.
export class AddressCheck extends MachineCheck {
  constructor(message: string, at?: Addr) { super('addressCheck', message, at); }
}

// research/architecture.md §7 (A22-0526-3 p.11): no word mark on the op code, an undefined op
// character, or a length the op does not accept. Nothing executes.
export class InstructionCheck extends MachineCheck {
  constructor(message: string, at?: Addr) { super('instructionCheck', message, at); }
}

// research/charset.md §1 (A22-0526-3 p.5): a storage position whose eight bits do not carry odd
// parity. Only raised when `CoreStorage.checkParity` is on — off by default in Phase 1
// (docs/plans/architecture.md §4.1).
export class ProcessCheck extends MachineCheck {
  constructor(message: string, at?: Addr) { super('processCheck', message, at); }
}

// An op character that decodes to a real 1410 op the emulator does not yet execute. The citation
// travels with the stop so the message names the page that specifies the missing behaviour
// (docs/plans/phase-1-cpu-core.md §5 Wave 0: `new UnimplementedOp(entry.opChar, entry.feature, entry.cite)`).
export class UnimplementedOp extends MachineCheck {
  readonly opChar: string;
  readonly feature?: OpEntry['feature'];
  readonly cite: string;

  constructor(opChar: string, feature: OpEntry['feature'], cite: string, at?: Addr) {
    super('unimplementedOp', `op '${opChar}' is not implemented${feature ? ` (feature: ${feature})` : ''} — ${cite}`, at);
    this.opChar = opChar;
    if (feature !== undefined) this.feature = feature;
    this.cite = cite;
  }
}

// A feature of the real machine deliberately outside this emulator: an overlap x-control
// character, the Priority feature, channel 2, 7010-only codes (research/io.md §4).
export class UnsupportedFeature extends MachineCheck {
  constructor(message: string, at?: Addr) { super('unsupportedFeature', message, at); }
}

// research/io.md §5: a channel operation attempted while that channel's interlock is still set.
export class IoInterlockStop extends MachineCheck {
  constructor(message: string, at?: Addr) { super('ioInterlockStop', message, at); }
}

// The one place that turns a thrown value back into a `StopReason`. Anything that is not a
// `MachineCheck` is a bug in the emulator, not a stop of the emulated machine, and returns
// `undefined` so the caller rethrows it.
export function stopReasonOf(e: unknown): StopReason | undefined {
  return e instanceof MachineCheck ? e.stop : undefined;
}
