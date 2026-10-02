// src/core/machine.ts — the façade the UI, the tools and the oracle tiers all hold.
// Source: docs/plans/phase-1-cpu-core.md §2, §5; docs/plans/architecture.md §4.
//
// A plain object literal over the four pieces that already exist — storage, registers, the
// CPU and a core-display base. No class: there is no state here that the parts do not
// already own, and `snapshot()` has to stay structured-cloneable so the machine can move
// into a Worker later without a boundary change (plan §9).
//
// Wave 1 wired the real indicator latches; Wave 2 wires channel 1 with the 1415 console
// registered on it, so `snapshot()` carries the console log and the channel's six status
// indicators. Later waves add the operator keys that produce a print-out of their own.

import { bcdOfGlyph, glyphOf, parity } from './bcd.js';
import { Channel1 } from './channel.js';
import { Cpu, type CpuOptions } from './cpu.js';
import { Console1415 } from './devices/console1415.js';
import { Printer1403 } from './devices/printer1403.js';
import { Punch1402 } from './devices/punch1402.js';
import { Reader1402 } from './devices/reader1402.js';
import { Indicators } from './indicators.js';
import { formatPrintout } from './printout.js';
import { RegisterFile } from './registers.js';
import { CoreStorage } from './storage.js';
import { BCD6, C, WM, type Addr, type CoreImage, type CycleStep, type Deck, type MachineState, type StopReason } from './types.js';

/** How much of core `snapshot()` carries, starting at `windowBase`. */
const CORE_SLICE_LENGTH = 1000;

/**
 * The MODE rotary, as much of it as Phase 1 has.
 *
 * The real switch has SIX positions — RUN (top), ADDRESS SET, DISPLAY, I/E CYCLE, ALTER and
 * C.E. (research/console-and-physical.md §3, A22-0526-3 Fig.47 p.49). Phase 1 models the three
 * the plan names plus RUN (plan §1, §8): C.E. is the maintenance panel and is out of scope, and
 * DISPLAY is reached through `display()` rather than through the rotary, because ALTER is
 * defined only as the thing that follows a display (§4) and the two are always keyed together.
 */
export type ConsoleMode = 'run' | 'addressSet' | 'alter' | 'ieCycle';

/**
 * Instructions per `start()` in MODE = RUN. A budget rather than "run to completion" so the
 * caller keeps the frame: the internals panel calls `start()` once per animation frame and
 * redraws between calls (plan §8 "In the browser").
 */
export const START_BUDGET = 2000;

/**
 * A PROGRAMMED HALT TYPES THE `S` LINE. `[verified]` — S223-2648, "CE Instruction — IBM 1415
 * Console Model 1" (docs/research/README.md:63), p.6, under "Output Operations":
 *
 *   "Stop Print-Out: With the inhibit print-out control switch (CE console) set to normal, a
 *   program stop, an error stop, the stop key, or any cycle step, will initiate a stop
 *   print-out."
 *
 * A program stop IS the programmed halt, and Figure 5's first row — Normal Stop / `S` / matrix
 * position 35 — is the line it types.
 *
 * THE COUNTER-EVIDENCE, BOTH HALVES, because the weaker half alone would misrepresent it.
 * (a) A22-0526-3 p.23's Halt description ("The system stops. Pressing the start key starts system
 * operation with the next sequential instruction") is SILENT, NOT CONTRARY: silence in an
 * instruction description is not a denial. (b) The harder half: A22-0526-3 pp.50-58 ENUMERATE the
 * print-out triggers — the STOP key, any mode-switch change, ADDRESS SET, each I/E-cycle or
 * storage-cycle step, the three error stops, and the CE panel's START PRINT OUT button — and the
 * program stop is NOT among them. That is an omission from a list in the console operating
 * section, not silence in a p.23 aside. It is still an omission and not a denial, and S223-2648 is
 * the 1415 console's own CE manual naming the case in a sentence written to enumerate: where the
 * two disagree the more specific document governs. p.56's PRINT OUT CONTROL toggle "controls all
 * stop print-out operations, including error print-out" — a control over stopping generally, which
 * is the reading this constant takes.
 *
 * The read is Phase 4 wave 0's bounded primary read, recorded at
 * docs/research/open-questions.md:939-963 and PHASE-4-NOTES.md:389-399. It discharges DEFERRED-01
 * and retires the `[unverified]` fallback that read §2's print-out table literally: there is no
 * open question left to state, so the constant is named for what the machine does rather than for
 * what the fallback withheld (Phase 6 wave 0, docs/BUILD-LOG-6.md).
 */
export const PROGRAM_STOP_TYPES_S = true;

// OPEN: IE_CYCLE_HALT_TYPES_C_ALONE — `[likely]`, ours.
// S223-2648 p.6 lists FOUR triggers for ONE print-out — "a program stop, an error stop, the stop
// key, or any cycle step" — and does not say what a stop that is BOTH a program stop and a cycle
// step types. Under I/E CYCLE every START is a cycle step and already types `C` (A22-0526-3
// p.50); the START that lands on the halt is that cycle step, so it types once, as `C`. Reading
// the sentence as a sum rather than a list would have a single START type twice.
// FALLBACK: `C` then `S` — delete the `mode !== 'ieCycle'` term in `printStop` and nothing else.
// WHAT WOULD SETTLE IT: a worked I/E CYCLE example in S223-2648's 97 pages, or an
// Exhibit-II-class transcript of a diagnostic single-stepped onto a halt.
//
// THE CATEGORY RULING ON EVERY OTHER `StopReason` (types.ts:405-407), written here as ONE block
// because they are one decision: split across three sites a category ruling rots into three
// unrelated omissions.
//   `halt` — types `S`. S223-2648 p.6, `[verified]`, above.
//   `instructionCheck`, `addressCheck`, `processCheck` — type `E`. Unchanged:
//     console-and-physical.md §2's three error-stop rows.
//   `ioInterlockStop` — SILENT. An interlock system stop (io.md §5). It is a stop, and p.6's "a
//     program stop, an error stop, the stop key" does not name it; no sentence in hand says it
//     prints. OPEN: INTERLOCK_STOP_STAYS_SILENT — `[unverified]`, fallback `S`. COST TO FLIP: one
//     clause in `printStop`; no shipped test asserts a console line for an `ioInterlockStop`
//     (`test/channel-control.test.ts:201`, `test/exec-io.test.ts:101` and `:207` all drive
//     `step()`, which never reaches `printStop` — verified in wave 0, §15 row 13's obligation).
//     WHAT WOULD SETTLE IT: an interlock stop in S223-2648's print-out enumeration, or an
//     Exhibit-II-class transcript of a channel interlock reached under a stop print-out.
//   `unsupportedFeature`, `unimplementedOp` — SILENT. Emulator-side stops that exist on no 1410:
//     a real 1411 either executes the op or takes an instruction check. Typing a machine
//     print-out for a condition the machine cannot reach would be inventing a line of the log.
//     OPEN: EMULATOR_STOPS_ARE_NOT_MACHINE_STOPS — a ruling, not an uncertainty.
//   `stopKey` — UNREACHABLE. Declared in the union at types.ts:407 and produced nowhere: the STOP
//     key runs through `machine.stop()` below, which types `S` directly. Named here so a later
//     reader does not read its absence from this list as an oversight.

/**
 * DISPLAY and ALTER wrap from the top of core to 00000 on a 20K-80K machine. `[verified]`
 *
 * §4: "On 10K machines, display and alter stop at the last storage location. On 20K-80K
 * machines, display continues from 00000 after the last location unless that location carried a
 * word mark; alter wraps to 00000 unless the last character was printed at end of line or has a
 * word mark" (A22-0526-3 p.51). Each clause, as `display()` and `alter()` below take it:
 *
 *   10K — the scan stops after the last location, as it always did. Unchanged.
 *   DISPLAY above 10K — after printing the last location the scan continues at 00000, unless
 *     that location's cell carried a word mark. With `DISPLAY_STOPS_BEFORE_NEXT_WORD_MARK` a
 *     word-marked last location is reached only when it IS the typed address (any other marked
 *     position stops the scan before it is printed), so that is the one case this clause decides
 *     on its own; it does not settle which reading of the stopping mark is right, because either
 *     reading already stops there. After a wrap 00000 is an ordinary next position: a word mark on
 *     it starts the next field and stops the scan BEFORE it, exactly as at any other address.
 *   ALTER above 10K — `alter()` takes the whole typed line at once and is bounded by the span the
 *     display captured, so it wraps exactly where the display wrapped. "Has a word mark" is the
 *     stored mark that kept the display from wrapping. "Printed at end of line" has no separate
 *     analogue here: a display whose line fills on the last location captures a span that ends
 *     there, so the alter ends there too. `[likely]` for this reading of the ALTER clause; a word
 *     mark the operator TYPES into the last location does not end the entry, matching every
 *     other position under `alter()`.
 *
 * Discharged 2026-10-02 when the desk moved to 20K (`src/ui/main.ts`) and made a DISPLAY near
 * 19,999 reachable. `docs/research/open-questions.md`, console-and-physical row.
 */
export const DISPLAY_WRAPS_ABOVE_10K = true;

/**
 * OPEN: WHICH word mark stops a DISPLAY — the one that starts the next field.
 *
 * §4 says the machine prints "storage contents until a word mark (the word-marked character
 * prints with its mark)" and that "START again displays the adjacent field" (A22-0526-3 p.51).
 * It does not say whether the mark that stops the scan is printed or held back. We stop BEFORE
 * the next word-marked position: the character at the typed address is always printed because it
 * carries the displayed field's own mark, and stopping before the next one is what leaves that
 * position available as the first character of the ADJACENT FIELD the next START displays. Read
 * the other way — print the marked character and then stop — the adjacent field would start one
 * position late and its own mark would already be on the paper. `open-questions.md`,
 * console-and-physical.md row.
 */
export const DISPLAY_STOPS_BEFORE_NEXT_WORD_MARK = true;   // OPEN: open-questions.md console-and-physical row

/**
 * How many positions a DISPLAY prints, and an ALTER writes, before END OF LINE stops it.
 *
 * OPEN: research/console-and-physical.md §4 and research/software.md §10.8 both terminate a
 * display or an alter on "a word mark **or** the end of line" — "On a freshly cleared machine
 * there are no word marks, so an ALTER of 00000-00011 runs to the end of the printer line" —
 * without saying where the line ends. §2 gives the form (9 7/8 in wide, 9 3/8 in between the
 * pin holes) and the 64-character element, but no characters-per-line figure. 80 is the chosen
 * fallback. It is display-only: nothing downstream keys on it.
 */
export const CONSOLE_LINE_LENGTH = 80;

export interface MachineOptions extends CpuOptions {
  size: 10_000 | 20_000 | 40_000 | 60_000 | 80_000;
  /** research/charset.md §1 — off by default; two of the three oracle images ship 0x00 fill. */
  checkParity?: boolean;
}

export interface Machine {
  readonly storage: CoreStorage;
  readonly regs: RegisterFile;
  readonly indicators: Indicators;
  readonly cpu: Cpu;
  /** Data channel 1: the nine-step sequence, the interlock, the six status indicators. */
  readonly channel1: Channel1;
  /** The 1415 console printer, registered on channel 1 at x2 = `T` (research/io.md §2, §8). */
  readonly console: Console1415;
  /** The 1402 read feed, registered on channel 1 at x2 = `1` (research/io.md §2, §6). */
  readonly reader: Reader1402;
  /** The 1403 printer and its carriage, on channel 1 at x2 = `2` (research/io.md §2, §7). */
  readonly printer: Printer1403;
  /** The 1402 PUNCH feed, on channel 1 at x2 = `4` — the other half of the same 1402 (§2, §6). */
  readonly punch: Punch1402;
  /**
   * Put a deck in the 1402's hopper, replacing whatever was there. It does NOT press READER
   * START: on the real machine those are two separate operator actions, and the three-cards-
   * remaining rule means the order matters (research/io.md §6, software.md §10.7).
   */
  loadDeck(deck: Deck): void;
  /** The READER START key — feeds the first card into the 1414 read buffer (io.md §6 step 1). */
  readerStart(): void;
  /** The END OF FILE key — "signals the last-card condition" (io.md §6). */
  readerEndOfFile(): void;
  /**
   * END OF JOB — the operator tearing the form off. It performs the automatic single space the
   * last print armed and nothing else (research/io.md §7; devices/printer1403.ts `flush()`).
   *
   * It is a façade call rather than something `snapshot()` does, because the space is carriage
   * MOTION: a getter that performed it would make `snapshot().printer.paper` depend on how many
   * times the UI redrew and the byte-for-byte golden depend on frame count (plan §7.3,
   * docs/plans/architecture.md §2 "devices produce values, never side effects"). `run-deck.ts`
   * and `test/tier4-demo-deck.test.ts` call it once, after the halt.
   */
  endOfJob(): void;
  /** Base of the core slice `snapshot()` carries. Set it to scroll the internals panel. */
  windowBase: Addr;
  /** Where the MODE rotary is pointing. Turn it with `setMode` — the turn itself prints. */
  mode: ConsoleMode;
  /** The last 5-digit address keyed on the console keyboard, for ADDRESS SET and DISPLAY. */
  keyedAddress: Addr;
  loadImage(img: CoreImage): void;
  programReset(): void;
  computerReset(): void;
  addressSet(addr: Addr): void;
  /** Turn the rotary. ANY change of setting types a stop print-out (§3, A22-0526-3 p.50). */
  setMode(next: ConsoleMode): void;
  /** The 5-digit address the operator types, as typed. Returns the address it decoded. */
  keyAddress(digits: string): Addr;
  /** The START key, in whichever MODE the rotary is on. */
  start(budget?: number): StopReason | undefined;
  /** The STOP key: stop after the current instruction, print `S` (§3, A22-0526-3 p.52). */
  stop(): void;
  /** MODE = DISPLAY: print `D` + the address, then storage to the next word mark (§4). */
  display(addr?: Addr): void;
  /** MODE = ALTER: write the typed line from the displayed address. Returns positions written. */
  alter(text: string, wordMarks?: readonly boolean[]): number;
  step(opts?: { execute?: boolean }): StopReason | undefined;
  /** MODE = I/E CYCLE — one STORAGE cycle, not one instruction. See `Cpu.stepCycle`. */
  stepCycle(): CycleStep;
  run(maxInstructions: number): StopReason | undefined;
  snapshot(): MachineState;
}

export function createMachine(opts: MachineOptions): Machine {
  const storage = new CoreStorage(opts.size);
  if (opts.checkParity) storage.checkParity = true;
  const regs = new RegisterFile();
  // The seven latches of opcodes.md §8. A freshly built machine is in the computer-reset state,
  // because a power-on reset is program reset + start reset + computer reset
  // (research/console-and-physical.md §3, S223-2648 pp.76-77) — so low and unequal start ON.
  const indicators = new Indicators();
  // One channel, one device. `cc01.cor`'s entire 10,000-position image contains five I/O
  // instructions and all five are `%T0` — the console printer (research/emulators.md §4.3), so
  // this is the whole of Phase 1's outside world. Phase 2 registers the 1402 and 1403 beside it
  // and the channel does not change (docs/plans/architecture.md §4.10).
  const channel1 = new Channel1();
  const consolePrinter = new Console1415();
  channel1.devices.register(consolePrinter);
  // Phase 2 wave 2: the 1402 read feed beside it at x2 = `1`, and the channel does not change
  // (docs/plans/architecture.md §4.10; plan §6 "Zero lines change").
  const reader = new Reader1402();
  channel1.devices.register(reader);
  // Phase 2 wave 3: the 1403 at x2 = `2`, and the channel still does not change.
  const printer = new Printer1403();
  channel1.devices.register(printer);
  // Phase 2 wave 4: the 1402's PUNCH feed at x2 = `4`. It is the same physical 1402 as the read
  // feed above and shares the 8/2 pocket with it, but it is a separate x2 and therefore a
  // separate `Device` (research/io.md §2 Figure 107, §6 "Mechanics").
  const punch = new Punch1402();
  channel1.devices.register(punch);
  // The four `J` senses of research/io.md §5 Figure 35 are DEVICE state read PER CHANNEL, so the
  // channel is handed the two devices that hold them (channel.ts `carriageChannel9` / `12` /
  // `carriageBusy` / `inquiryRequest`). Wiring at registration, not a registry lookup: the
  // registry hands back a `Device`, which has neither a carriage nor an inquiry latch.
  channel1.printer = printer;
  channel1.console = consolePrinter;
  const cpu = new Cpu(storage, regs, indicators, channel1, opts.tracer ? { tracer: opts.tracer } : undefined);

  // What the last DISPLAY put on the paper, and therefore what an ALTER is allowed to touch.
  // ALTER "must follow a display" and may reach "only the first displayed field"
  // (research/console-and-physical.md §4; research/software.md §10.8, A22-0526-3 p.51), so the
  // span is captured when the display prints and consumed when the alter ends.
  let displayed: { base: Addr; length: number } | undefined;

  /**
   * The `S` / `C` / `E` field line — IAR AAR BAR, Op+OpMod, the A/B/assembly channel group, and
   * the CH1+CH2 unit-select group (research/console-and-physical.md §2, A22-0526-3 Fig.42 p.46).
   * The channel registers and the unit-select registers are not modelled in Phase 1: `null`
   * prints them as the underlined blanks of a field whose contents have absent parity, which is
   * what the real Exhibit II log shows. Same call `tools/run-cor.ts` makes.
   */
  const fieldLine = (id: 'S' | 'C' | 'E'): void => {
    consolePrinter.lines.push(formatPrintout(id, {
      iar: regs.iar, aar: regs.aar, bar: regs.bar,
      op: regs.op, opMod: regs.opMod,
      ch1Unit: null, ch2Unit: null,
    }));
  };

  /**
   * What a stop types. An error stop types the `E` line (§2's three error-stop rows); a program
   * stop types the `S` line, which is the same `S` the STOP key types at `stop()` and a rotary
   * turn types in `setMode()` — S223-2648 Fig.5 has ONE Normal Stop row, so there is one line.
   * Every remaining stop is silent. `PROGRAM_STOP_TYPES_S` above carries the citation, the I/E
   * CYCLE ruling behind the `mode` term, and the category ruling on the other `StopReason`s.
   */
  const printStop = (stop: StopReason | undefined, mode: ConsoleMode): void => {
    if (stop === 'instructionCheck' || stop === 'addressCheck' || stop === 'processCheck') {
      fieldLine('E');                       // unchanged: §2's three error-stop rows
      return;
    }
    if (stop === 'halt' && PROGRAM_STOP_TYPES_S && mode !== 'ieCycle') fieldLine('S');
  };

  const machine: Machine = {
    storage,
    regs,
    indicators,
    cpu,
    channel1,
    console: consolePrinter,
    reader,
    printer,
    punch,
    windowBase: 0,
    // RUN is the rotary's top position and where a machine sits when nobody has touched it
    // (research/console-and-physical.md §3, A22-0526-3 Fig.47 p.49).
    mode: 'run',
    keyedAddress: 0,

    // `pokeRaw` is the loader seam: the byte, its check bit and its word mark go in verbatim.
    // Word marks are NEVER inferred from instruction boundaries — `cc01.cor` stores op codes
    // without them at 02181 and 02234 and sets them at run time, which is how its
    // branch-on-word-mark test works (emulators.md §4.5). Duplicated from `formats/cor.ts`
    // rather than imported: `src/core` imports nothing outside `src/core`.
    loadImage(img: CoreImage): void {
      if (img.size !== storage.size) {
        throw new Error(`image of ${img.size} positions does not fit a ${storage.size}-position machine`);
      }
      for (let i = 0; i < img.size; i++) storage.pokeRaw(i, img.cells[i] ?? 0);
    },

    // PROGRAM RESET does NOT touch the indicators. A22-0526-3 p.52 lists what the key resets —
    // check circuits, the A- and B-data registers, the Op register, the Op-modifier register,
    // the console inquiry latch — and IAR goes to 00001; the machine indicators are not in that
    // list, they are computer reset's (research/console-and-physical.md §3,
    // research/architecture.md §10 "Resets").
    // Neither reset key types anything. §2's print-out table has a row for every line the
    // Selectric produces — S, C, E, B, #, D, A, I, R — and a reset is on none of them; §3's
    // reset semantics list latches and registers and no print-out either.
    programReset(): void {
      regs.programReset();
      // A22-0526-3 p.52 lists "the console inquiry latch" among what PROGRAM RESET resets, and
      // research/io.md §8 reads p.49's "the inquiry latches (except the console inquiry latch)
      // … are not reset" as carving the console latch OUT of the not-reset set: it IS cleared.
      // `computerReset()` below calls THIS method, which is how Computer Reset inherits the drop
      // — io.md §8: "Computer Reset is a Program Reset plus a Start Reset … on Computer Reset drop
      // any pending console inquiry request; leave remote-station inquiry latches and the
      // tape-density latch alone."
      // OPEN: CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH (devices/console1415.ts) — under the OTHER
      // reading of io.md §8 the latch `J (I) Q` tests would survive this line.
      consolePrinter.pendingRequest = false;
    },

    // COMPUTER RESET = program reset + start reset + a reset of the check circuits, the timing
    // clocks and ALL MACHINE INDICATORS (A22-0526-3 pp.49, 52; S223-2648 p.76 item 1). The
    // indicator half is the documented asymmetry: overflow and zero balance go off, low and
    // unequal come ON (opcodes.md §8, A22-0526-3 p.36).
    // It calls the FAÇADE's `programReset` rather than `regs.computerReset()`, so that
    // "Computer Reset is a Program Reset plus a Start Reset" (io.md §8, A22-0526-3 p.49) is true
    // of the machine and not only of the register file — and so the console inquiry latch is
    // dropped in one place. Nothing is lost: `RegisterFile.computerReset` is documented as doing
    // exactly what its `programReset` does, "for the registers alone" (registers.ts).
    computerReset(): void { machine.programReset(); indicators.computerReset(); },

    // MODE = ADDRESS SET: STOP, turn the rotary, START prints `B` and a single space, the
    // operator types a 5-digit address into the IAR, the carrier returns
    // (research/console-and-physical.md §3, A22-0526-3 p.50, p.57). The `B` line is ADDRESS
    // SET's OWN output, so it is pushed here rather than synthesised by whichever tool happens
    // to be driving the machine (plan §1, §8).
    addressSet(addr: Addr): void {
      regs.iar = addr;
      consolePrinter.lines.push(formatPrintout('B', { address: addr }));
    },

    // "ANY change of the mode-switch setting — not only the STOP key — causes a stop print-out
    // once the current instruction completes" (research/console-and-physical.md §3, §4
    // "Mode-switch side effect"; A22-0526-3 p.50). So this is the one control whose print-out is
    // a side effect of the operator's hand rather than of a key press. Turning the rotary to
    // where it already points is not a change and types nothing.
    //
    // "once the current instruction completes": every caller of this façade is between
    // instructions — `start()` returns at an instruction boundary — so the line is typed here.
    setMode(next: ConsoleMode): void {
      if (next === machine.mode) return;
      machine.mode = next;
      fieldLine('S');
    },

    // The console keyboard, in ADDRESS SET and in DISPLAY: five digits, then an automatic
    // carrier return (research/console-and-physical.md §4, A22-0526-3 pp.50-51). The 1410 has NO
    // address-dial rotary switches — the address is typed (§1) — so this is the only way in.
    keyAddress(digits: string): Addr {
      if (!/^\d{5}$/.test(digits)) throw new Error(`ADDRESS SET takes five digits, not "${digits}"`);
      const addr = Number.parseInt(digits, 10);
      if (addr >= storage.size) throw new Error(`address ${digits} is outside ${storage.size} positions`);
      machine.keyedAddress = addr;
      return addr;
    },

    // The START key. What it does is entirely the rotary's business (§3, §4):
    //   RUN         — run. The budget is this emulator's, not the machine's: it lets the caller
    //                 redraw between batches. A stop inside the budget is returned and, if it is
    //                 an error stop, typed as the `E` line (§2's print-out table).
    //   ADDRESS SET — "START prints `B`, single space → type the 5-digit address into the IAR".
    //   I/E CYCLE   — "Each START executes one instruction phase; the print-out is preceded by
    //                 `C`" (§4). PLAN-DEVIATION from §4: the E phase is stepped one STORAGE cycle
    //                 per START, not one whole phase, so the B field can be watched filling one
    //                 position at a time (plan §1, §7, §8 demo 2). The real key steps one phase;
    //                 `Cpu.stepCycle`'s header carries the argument. The `C` line is per START
    //                 either way.
    //   ALTER       — "START prints `A`, space, keyboard unlocks → operator types corrections".
    //                 We take the whole typed line at once, so the operation IS `alter()` and
    //                 the `A` line is typed there; START alone has nothing left to do.
    start(budget: number = START_BUDGET): StopReason | undefined {
      switch (machine.mode) {
        case 'addressSet':
          machine.addressSet(machine.keyedAddress);
          return undefined;
        case 'ieCycle': {
          const cycle = cpu.stepCycle();
          fieldLine('C');
          printStop(cycle.stop, machine.mode);
          return cycle.stop;
        }
        case 'alter':
          return undefined;
        case 'run': {
          const stop = cpu.run(budget);
          printStop(stop, machine.mode);
          return stop;
        }
      }
    },

    // The STOP key: "stops after the current instruction and prints the `S` line"
    // (research/console-and-physical.md §3, A22-0526-3 p.52). The machine is already between
    // instructions whenever a caller can reach this — `start()`'s budget ends on an instruction
    // boundary — so there is nothing to finish first.
    stop(): void { fieldLine('S'); },

    // MODE = DISPLAY, the whole dialogue of research/console-and-physical.md §4: START prints
    // `D` and unlocks the keyboard, the operator types the 5-digit HIGH-ORDER address, the
    // carrier returns, and the machine prints `D` and then storage contents until a word mark,
    // "the word-marked character prints with its mark" (A22-0526-3 p.51).
    //
    // WHICH word mark stops it: the one that starts the NEXT field — `DISPLAY_STOPS_BEFORE_NEXT_
    // WORD_MARK` above carries the argument and the open question. On core with no word marks at
    // all the end of line stops it instead (research/software.md §10.8: an ALTER of a freshly
    // cleared 00000-00011 "runs to the end of the printer line"). The top of installed storage
    // stops it on a 10K machine and wraps it to 00000 above 10K — see `DISPLAY_WRAPS_ABOVE_10K`.
    display(addr: Addr = machine.keyedAddress): void {
      consolePrinter.lines.push(formatPrintout('D', { address: addr }));
      const text: string[] = [];
      const wordMarks: boolean[] = [];
      const underline: boolean[] = [];
      const wraps = DISPLAY_WRAPS_ABOVE_10K && storage.size > 10_000;
      let a = addr;
      while (a < storage.size && text.length < CONSOLE_LINE_LENGTH) {
        const cell = storage.read(a);
        const wm = (cell & WM) !== 0;
        if (wm && a !== addr) break;
        text.push(glyphOf(cell & BCD6));
        wordMarks.push(wm);
        // The error-underscore feature: a character whose bits do not carry odd parity prints
        // underscored (§2; S223-2648 p.6). Same test `devices/console1415.ts` makes.
        underline.push((cell & C) !== parity(cell & BCD6, wm));
        a++;
        // §4 above 10K: on past the last location to 00000, unless that location was word-marked.
        if (a === storage.size && wraps && !wm) a = 0;
      }
      consolePrinter.lines.push(formatPrintout('D', { text: text.join(''), wordMarks, underline }));
      displayed = { base: addr, length: text.length };
    },

    // MODE = ALTER. "Must follow a display" (§4) — the keyboard is unlocked over the field the
    // display just printed and nothing else, and "only the first displayed field can be altered"
    // (research/software.md §10.8, A22-0526-3 p.51). So the span the display captured IS the
    // limit, and it already ends where the machine's own rule ends it: at a word mark, at the end
    // of line, or at the top of a 10K machine's core — and above 10K it wraps to 00000 with it.
    //
    // "Any previously displayed word mark must be re-entered into storage" (§10.8): the operator
    // types characters, and a word mark arrives only when the WORD MARK key is pressed for that
    // position — so `setChar` is called with the caller's flag and NOT with what core held. A
    // word mark that was on the paper and is not typed back is gone. That is the rule the manual
    // is warning about, and modelling it any other way would make the warning meaningless.
    alter(text: string, wordMarks: readonly boolean[] = []): number {
      if (displayed === undefined) throw new Error('ALTER must follow a DISPLAY (A22-0526-3 p.51)');
      const span = displayed;
      displayed = undefined;                   // one alter per display — §4, software.md §10.8
      const glyphs = [...text];
      // The span already ends where §4 ends an alter: on a 10K machine it never runs past the top
      // of core, and above 10K it wraps to 00000 exactly where the display wrapped
      // (`DISPLAY_WRAPS_ABOVE_10K`), so the modulo below only ever folds a wrapped span.
      const n = Math.min(glyphs.length, span.length);
      for (let i = 0; i < n; i++) {
        const glyph = glyphs[i] ?? ' ';
        const bcd = bcdOfGlyph(glyph);
        if (bcd === undefined) throw new Error(`"${glyph}" is not one of the 64 console characters`);
        storage.setChar((span.base + i) % storage.size, bcd, wordMarks[i] ?? false);
      }
      // §2's print-out table: "Alter | single | A | operator-typed replacement data | 30".
      consolePrinter.lines.push(formatPrintout('A', {
        text: glyphs.slice(0, n).join(''),
        wordMarks: wordMarks.slice(0, n),
      }));
      return n;
    },

    // The two 1402 operator keys and the hopper. They are KEYS, not instructions
    // (research/io.md §6 step 1, "End-of-file and last card"), which is why they are here beside
    // START and STOP rather than anywhere near an executor. IBM's own procedure presses both:
    // "Place the card deck in the 1402 Card Reader. Press READER START and END-OF-FILE"
    // (research/software.md §10.7, J28-0249 p.41) — the second because a deck of fewer than four
    // cards would otherwise report Not Ready on its first read.
    loadDeck(deck: Deck): void { reader.loadDeck(deck); },
    readerStart(): void { reader.readerStart(); },
    readerEndOfFile(): void { reader.endOfFile(); },
    endOfJob(): void { printer.flush(); },

    step(o?: { execute?: boolean }): StopReason | undefined {
      return cpu.step(o?.execute === false ? { execute: false } : {});
    },

    // MODE = I/E CYCLE, the half-cycle control (there is no SINGLE STEP key on a 1410 —
    // research/console-and-physical.md §3 lists six MODE positions and no such control). What the
    // internals panel shows the B field filling from is `snapshot().coreWindow`, redrawn after
    // every START — the `CycleStep.record` handed back here is the level-3 latch trace's and is
    // `undefined` unless a tracer is attached (`alu.ts`, `types.ts`). `start()` above is what a
    // console START in this mode calls, and it is what types the `C` line.
    stepCycle(): CycleStep { return cpu.stepCycle(); },
    run(maxInstructions: number): StopReason | undefined { return cpu.run(maxInstructions); },

    snapshot(): MachineState {
      // Read the core slice through `storage.read`, the machine's own access path — `dump()`
      // copies all 10,000-80,000 positions to hand back 1,000 of them, and a snapshot runs on
      // every UI frame. Clamped at installed storage, because `read` address-checks past the top.
      const end = Math.min(machine.windowBase + CORE_SLICE_LENGTH, storage.size);
      const cells = new Uint8Array(Math.max(0, end - machine.windowBase));
      for (let i = 0; i < cells.length; i++) cells[i] = storage.read(machine.windowBase + i);
      const state: MachineState = {
        iar: regs.iar, aar: regs.aar, bar: regs.bar, car: regs.car, dar: regs.dar,
        ear: regs.ear, far: regs.far, op: regs.op, opMod: regs.opMod,
        indicators: indicators.snapshot(),
        channel1: { ...channel1.status, interlock: channel1.interlock },
        coreWindow: { base: machine.windowBase, cells },
        microseconds: cpu.microsecondsSimulated,
        instructions: cpu.instructions,
        console: consolePrinter.lines.slice(),
        // COUNTS, not cards (types.ts §8): the session holds the Deck and derives which card is
        // where, so the frame never copies 80-byte arrays.
        reader: {
          hopper: reader.hopper.length,
          buffered: reader.buffer !== null,
          eofKey: reader.eofKey,
          eofLatch: reader.eofLatch,
          stackers: { ...reader.stackers },
        },
        // The paper is SLICED, the way the console log above is (plan §14 R7): `PrintLine` is
        // three primitives, so the snapshot stays structured-cloneable, and reading it moves
        // nothing — the pending automatic space is reported, never performed (`endOfJob`).
        printer: { carriage: printer.carriage, paper: printer.paper.slice() },
        // COUNTS again, from the punch's own pockets. The 8/2 count here is what the PUNCH feed
        // stacked; `readerView.ts` adds it to the reader's for the one pocket they share.
        punch: { stackers: punch.stackers },
      };
      // `exactOptionalPropertyTypes`: `stop?` takes a value or is absent, never an explicit
      // undefined.
      return cpu.lastStop === undefined ? state : { ...state, stop: cpu.lastStop };
    },
  };
  return machine;
}
