// src/core/types.ts — every boundary type for the 1410 core in one place, re-exported by consumers.
// Source: docs/plans/architecture.md §3 "Load-bearing TypeScript types"; docs/plans/phase-1-cpu-core.md §3.
// This file imports nothing; every future import elsewhere in this project must carry an explicit
// `.js` extension (ESM resolution), per the same source docs.

// ═══ src/core/types.ts ═════════════════════════════════════════════════════

// ─── 1. The storage cell ───────────────────────────────────────────────────
// architecture.md §2; charset.md §1; emulators.md §6 (this IS the .cor layout)
//   bit7 WM · bit6 C (odd parity over BA8421+WM) · bit5 B · bit4 A · bits3-0 8421
// `cell & 0x3F` is exactly the octal BCD code printed throughout the research.
export type Cell = number;                       // 0x00..0xFF, one storage position
export const WM = 0x80, C = 0x40, ZB = 0x20, ZA = 0x10, BCD6 = 0x3f;

export type Addr = number;                       // 0 .. size-1

export interface Storage {
  readonly size: 10_000 | 20_000 | 40_000 | 60_000 | 80_000;
  bcd(a: Addr): number;                          // BA8421 only — what Compare/BCE see
  read(a: Addr): Cell;                           // whole byte
  wm(a: Addr): boolean;
  setChar(a: Addr, bcd6: number, wm: boolean): void;   // recomputes C
  setWm(a: Addr, on: boolean): void;                   // flips C — architecture.md §2
  writeWhole(a: Addr, cell: Cell): void;               // LOAD MODE ONLY — io.md §3
  pokeRaw(a: Addr, cell: Cell): void;                  // LOADER ONLY — preserves C verbatim
  clearToHundreds(from: Addr): Addr;                   // op `/`; returns bbb00-1 for BAR
  dump(): Uint8Array;                                  // .cor round-trip, SimH diff
}

// ─── 2. Address: 5 chars in core, magnitude + index tag in flight ──────────
// architecture.md §4-5. Zones are LEGAL ONLY over tens/hundreds, where they tag
// one of 15 index registers held in core at 00020+5n .. 00024+5n.
export interface DecodedAddress {
  value: number;                                 // 00000..79999, zones stripped
  tag: 0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15;    // A-tens 1, B-tens 2, A-hund 4, B-hund 8
  valid: boolean;                                // false → AddressCheck stop
}
export type AddressUse = 'increment' | 'decrement';   // 00000 and top-of-core rules differ

// ─── 3. The per-op semantics rows — the diffable table ─────────────────────
// One OpForm per ROW of opcodes.md §2. `A` has three rows there (1/11, 6, and the
// register/indicator/timing sets differ), so `A` has three OpForms here. `regs` uses
// the manual's own Figure 8 notation (opcodes.md §1.3), evaluated by isa/regs.ts.
export type RegExpr =
  | 'NSI' | 'NSIB' | 'BI' | 'Ap' | 'Bp' | 'A' | 'B' | 'special'
  | 'B+LB+1'                       // M / L — opcodes.md §2 pp.40-41; io.md §8 (WCP)
  | `${'Ap'|'Bp'}-1`               // chained , / ⌑ — opcodes.md §2 p.22
  | `${'A'|'B'}${'+'|'-'}${'1'|'LA'|'LB'|'LW'}`;
export interface RegTriple { iar: RegExpr; aar: RegExpr; bar: RegExpr }

// opcodes.md §8 enumerates SEVEN latches — three arithmetic, four compare. They are named
// individually because the tested facts need them individually: computer reset leaves *low*
// and *unequal* ON, and once *equal* is turned off during an operation it cannot be turned
// back on (§5.2). 'six' in this project always means ChannelStatus, which is a different set.
// Carriage channel-9 / channel-12 indicators (opcodes.md §8, io.md §5) arrive with the 1403
// in Phase 2; Wave 1's one-address d-table cannot branch on them yet.
export type IndicatorName =
  | 'arithOverflow' | 'zeroBalance' | 'divideOverflow'
  | 'compareHigh' | 'compareEqual' | 'compareLow' | 'compareUnequal';

// research/architecture.md §6 — IAR AAR BAR CAR DAR EAR FAR as magnitudes; Op / OpMod as cells
export interface Registers { iar: Addr; aar: Addr; bar: Addr; car: Addr; dar: Addr; ear: Addr; far: Addr; op: Cell; opMod: Cell }

// opcodes.md §1.3 (A22-0526-3 Figure 8, p.13): the symbol set isa/regs.ts evaluates RegExpr over
export interface RegSymbols { A: Addr; B: Addr; Ap: Addr; Bp: Addr; LA: number; LB: number; LW: number; NSI: Addr; NSIB: Addr; BI: Addr }

export interface OpForm {
  lengths: readonly number[];      // opcodes.md §1.1 — a CHECK, never a driver
  dModifiers: 'none' | 'any' | 'bitmask' | Readonly<Record<string, string>>;
  semantics: string;               // the manual's own prose, verbatim
  indicators: readonly IndicatorName[];
  terminatesOn: string;
  regs: RegTriple;
  regsNotTaken?: RegTriple;        // branches
  timing(ctx: ExecContext): number;  // µs, base machine, 4.5 µs cycle
  cite: string;                    // 'opcodes.md §2 / A22-0526-3 p.17'
  /**
   * Most executors do their whole E phase and return nothing. An executor whose operation
   * takes MORE THAN ONE STORAGE CYCLE may instead return an iterator that yields ONE VALUE PER
   * STORAGE CYCLE: `Cpu.step()` drains it, `Cpu.stepCycle()` advances it one cycle at a time
   * (plan §1 `stepCycle()`, §8 demo 2). Wave 3's `A`/`S` are the first — the add pass is
   * already written as the documented scan phases for the L3 latch trace (§6.2). The yielded
   * value is a latch record only when a level-3 tracer is attached, and `undefined` otherwise;
   * the cycle boundary is what `stepCycle()` consumes, the record is the trace's alone.
   */
  exec(ctx: ExecContext): void | Iterator<LatchTraceRecord | undefined>;
}

export interface OpEntry {
  opChar: string;                  // '@'  — the MACHINE character, not the mnemonic
  octal: number;                   // 0o14 — index into OPS[]
  autocoder: readonly string[];    // ['M'] — collides with opChar! opcodes.md §1.6
  addressDouble: boolean;          // A S ? ! , ⌑ / J R X   — opcodes.md §1.4
  chainable: boolean;              // false for U M L F K G N and for R X — §1.2
  implemented: boolean;
  feature?: 'priority'|'channel2'|'tape'|'disk'|'micr'|'columnBinary'|'7010only';
  forms: readonly OpForm[];        // one per opcodes.md §2 row for this op character
}

// ─── 3a. The L3 latch record — plan §6.2 ───────────────────────────────────
// DECLARED HERE, not in trace.ts, and re-exported from there under the same names: it is a
// value that crosses TWO boundaries — the arithmetic pass produces it and `formatL3Latch`
// renders it — and this file imports nothing, so an `OpForm.exec` returning
// `Iterator<LatchTraceRecord | undefined>` could not name it anywhere else. The L3 trace is
// the only consumer; the UI does NOT read these records (it watches the B field fill through
// `snapshot().coreWindow`), which is why an untraced pass yields `undefined` and builds none. The
// named latches are `note1410.txt`'s own, by way of emulators.md §5.3: Scan 1 / Scan 3,
// Units / Body / Extension, A Complement, B Complement, Carry In, Carry Out, Zero Balance,
// Arithmetic Overflow. They are logical phases of the documented add algorithm
// (research/architecture.md §10, opcodes.md §4.3) — never a timing claim; cycle counting stays
// in cycles.ts.
export type Latch = 0 | 1;

export type LatchTraceRecord =
  | {
      kind: 'scan';
      addr: Addr; opChar: string;
      scan: 'scan1' | 'scan3';
      unit: 'units' | 'body' | 'extension';
      Ac: Latch; Bc: Latch; cin: Latch; cout: Latch; zb: Latch; ovf: Latch;
      /** The two digits and the result digit, as the annotation prints them. */
      a: string; b: string; r: string;
    }
  | {
      kind: 'end';
      addr: Addr; opChar: string;
      zb: Latch; ovf: Latch;
      /** The field as left in core, sign included — `B=00812+`. */
      result: string;
    };

/**
 * One STORAGE cycle, as MODE = I/E CYCLE exposes it (plan §1, §8 demo 2). `I` is the read-out
 * half — fetch, decode, field assignment, IAR = NSI, nothing written to the operand fields;
 * `E` is one execute cycle. `complete` marks the cycle on which the register effects and the
 * timing were applied.
 */
export interface CycleStep {
  phase: 'I' | 'E';
  /**
   * Present only while a multi-cycle executor is running AND A TRACER IS ATTACHED. The record
   * is built for the level-3 latch trace and nothing else, so an untraced machine pays neither
   * the object nor the three glyph lookups per storage cycle (`alu.ts`); the cycle boundary
   * itself is unaffected. Nothing in `src/ui` reads it.
   */
  record?: LatchTraceRecord;
  complete: boolean;
  stop?: StopReason;
}

// ─── 4. What the scan fetch produced ───────────────────────────────────────
// architecture.md §7: read from the word-marked op char until the NEXT word mark.
// NOTE: no `length: 1|2|5|6|7|10|11|12` union — `N` is legal at ANY length
// (opcodes.md §2 N row; software.md §10.4, the tape bootstrap depends on it).
export interface Fetched {
  opAddr: Addr;
  chars: Uint8Array;               // op char first, no interior word mark
  nsi: Addr;                       // IAR after read-out = address of the next word mark
}
export type Form = 'O' | 'Od' | 'Oxxxd' | 'Oa' | 'Oad' | 'Oxxxbd' | 'Oab' | 'Oabd' | 'Olong';

// The executor's view of the machine. Wave 0 needs only these; later waves add fields
// (indicators, channel, tracer) — the owner of cpu.ts in that wave edits this interface.
//
// `Indicators` is imported as a structural shape rather than as the class, because this file
// imports nothing (see the header). The seven latch fields and the methods the executors of
// Waves 1-6 call are exactly what `src/core/indicators.ts` provides.
export interface IndicatorLatches extends Record<IndicatorName, boolean> {
  setArithOverflow(): void;
  setDivideOverflow(): void;
  setZeroBalance(zero: boolean): void;
  beginCompare(): void;
  compareDigit(result: 'high' | 'equal' | 'low'): void;
  endCompare(): void;
  setCompare(result: 'high' | 'equal' | 'low'): void;
  testAndResetArithOverflow(): boolean;
  testAndResetDivideOverflow(): boolean;
  computerReset(): void;
  snapshot(): Record<IndicatorName, boolean>;
}

export interface ExecContext {
  storage: Storage;
  regs: Registers;
  fetched: Fetched;
  entry: OpEntry;
  form: OpForm;
  sym: RegSymbols;          // decoder fills A B Ap Bp NSI; executors fill LA LB LW BI NSIB
  branchTaken: boolean;     // set by branch executors; selects regs vs regsNotTaken
  indicators: IndicatorLatches;   // the seven latches — opcodes.md §8 (Wave 1)
  /**
   * Figure 7's `R` term: 1 if a recomplement was taken on this add or subtract, else 0
   * (opcodes.md §1.5, §4.3). Set by `alu.ts`, read by the `A`/`S` timing formulas' `+1.5RB`.
   * It is a register-free observable of the second pass the machine actually makes over B.
   */
  recomplement: 0 | 1;
  /**
   * Figure 7's remaining executor-supplied timing terms, in the figure's own symbols
   * (opcodes.md §1.5, A22-0526-3 p.12): `M` multiplier length, `Q` quotient length, `N` fields
   * actually compared on a table search, `Z` characters from the start of zero suppression to
   * the left end of the B field, `D` characters from it to the `$` insert point. Each is set by
   * the one executor that can know it — `muldiv.ts` fills `M` and `Q` — and read by that row's
   * `timing` lambda in isa/table.ts, exactly as `recomplement` above carries the `R` term. A row
   * that reports 0 for a term its own operation develops is a wrong row, which is why these live
   * on the context rather than inside any one executor.
   */
  terms: { M: number; Q: number; N: number; Z: number; D: number };
  /**
   * The L3 latch sink — present ONLY when a level-3 tracer is attached, so a null tracer
   * still costs nothing to format (plan §6.2). `cpu.ts` sets it; `alu.ts` calls it once per
   * storage cycle with the same record it yields.
   */
  traceLatch?: ((r: LatchTraceRecord) => void) | undefined;
  // Data channel 1 — the ONLY thing `M`, `L` and `R` touch (Wave 2). Channel 2 is a special
  // feature this configuration does not have, so there is no `channel2` member: the x-control
  // decode rejects `⌑`/`*` before anything would need one (io.md §1, §2).
  channel1: Channel;
  // Op `.` only (opcodes.md §2 p.23). The machine STOPS but the instruction completes: its
  // register effects and its timing still apply, and the next `step()` resumes at IAR. That is
  // why halting is a flag the executor raises and cpu.ts reads AFTER `regs`/`timing`, and not a
  // thrown check — a thrown check would skip both.
  halt: boolean;
}

// ─── 5. Channel and devices — io.md §1, §3, §5-8 ───────────────────────────
export interface ChannelStatus {                 // the six channel indicators, io.md §5
  notReady: boolean; busy: boolean; dataCheck: boolean;
  condition: boolean; wrongLengthRecord: boolean; noTransfer: boolean;
}
// CLR (correct-length-record) is not a seventh field: 223-2692 p.42 requires WLR and CLR to
// agree at the end of every I/O operation, or a programmed BWL test mismatches its branch and
// no-branch latches and instruction-checks. We hold the invariant `CLR === !wrongLengthRecord`
// by construction — one derived accessor in channel.ts, asserted in a test — rather than
// carrying a second latch that can drift out of step (io.md §5).
export interface XControl {                      // `O x1x2x3 bbbbb d` — io.md §2
  channel: 1 | 2;
  overlap: boolean;                              // '@'/'*' — P1 raises unsupportedFeature
  deviceType: string;                            // x2 glyph: '1' '2' '4' 'T' 'U' 'B' 'F' …
  unit: string;                                  // x3 glyph
}
export type IoMode = 'move' | 'load';

export interface Device {
  readonly x2: string;                           // '1' reader, '2' printer, '4' punch, 'T' console
  readonly bits: 7 | 8;                          // 8-bit devices carry word marks (1415 only)
  precheck(x3: string, d: string): Partial<ChannelStatus>;   // step 4 of the nine
  read?(x3: string, d: string): Uint8Array | null;           // cell bytes; null = no transfer
  // `mode` is a DEVIATION from docs/plans/architecture.md §3, which printed `write(x3, d, data)`.
  // The channel does all the mode-dependent TRANSLATION (io.md §3), but two of the 1415's
  // load-mode renderings are device work and one of them cannot be recovered from the record:
  // the inverted circumflex can (it is the WM bit the channel only forwards in load mode), but
  // "in load-mode console printing, blanks print as a small `b`" cannot — a WCPW record with no
  // word marks is byte-identical to a WCP record (io.md §8 Figure 44;
  // console-and-physical.md §2, A22-0526-3 p.49). One parameter, ignorable by every 7-bit device.
  write?(x3: string, d: string, data: Uint8Array, mode: IoMode): Partial<ChannelStatus>;
  control?(op: string, d: string): Partial<ChannelStatus>;   // K/4 stacker, F/2 carriage
  /**
   * ADDED IN PHASE 2, WAVE 4. An x3 OUTPUT SUB-OPERATION that must see core WORD MARKS, applied
   * by the channel to the cells BEFORE `translateForOutput` runs. Exactly one implementer: the
   * 1403's `%21` Write Word Marks as 1s (io.md §7; charset.md §7, both [verified]).
   *
   * It cannot be device-side work after the fact — `translateForOutput`'s `dropWordMark` masks
   * bit 7 (and flips C) for every 7-bit device before `write()` is called, so the marks are
   * already gone — and it cannot be channel-side work either, because Figure 107's x3 column is
   * keyed on x2 (`1` means "pocket 1" on the reader and "word marks as 1s" on the printer) and
   * `channel.ts`'s own `decodeX` comment states that x3 belongs to the device, not the channel.
   * The device declares the substitution; the channel applies it.
   *
   * DESCOPE (plan §14 R3): if a reviewer judges this speculative, drop `%21`, have
   * `Printer1403.precheck` return Not Ready for x3 = `1`, and delete the member. Nothing else in
   * the phase uses it.
   */
  outputCells?(x3: string, cells: readonly Cell[], mode: IoMode): readonly Cell[];
}

/**
 * The CPU's view of a data channel — implemented by `channel.ts`, held by `ExecContext`.
 * The executors of `M`, `L` and `R` see only this: no executor knows what a 1415 is, and the
 * channel is the only thing that knows what a `Device` is (docs/plans/architecture.md §2 B9,
 * §4.10). Structural, like `IndicatorLatches`, because this file imports nothing.
 */
export interface Channel {
  readonly status: Readonly<ChannelStatus>;
  /** Set at read-out of every I/O instruction; cleared only by `R`/`X` — io.md §5. */
  readonly interlock: boolean;
  /** Derived, never a seventh latch: `CLR === !wrongLengthRecord` (223-2692 p.42). */
  readonly correctLengthRecord: boolean;
  /** `O x1x2x3 …` — io.md §2. Rejects overlap, channel 2 and the 7010 x1 characters. */
  decodeX(x1: string, x2: string, x3: string, at: Addr): XControl;
  /** The nine-step sequence of io.md §5 Figure 40. Returns LB, the CORE length transferred. */
  io(mode: IoMode, storage: Storage, x: XControl, start: Addr, d: string, at: Addr): number;
  /** `R (I) d` — true if any status indicator named by the d-character's bits is on. */
  testStatus(dBits: number): boolean;
  /** `R`/`X`: a branch that actually branches, or the group-mark d — io.md §5. */
  release(): void;
  /**
   * ADDED IN PHASE 2. `F d` and `K d` are form `Od` — no x-control field, no B-address, no data
   * (io.md §2's instruction summary; isa/table.ts `lengths: [2]`) — so they cannot go through
   * `io()`. But they ARE I/O instructions on the interlock's own op list — io.md §5: "I/O
   * instructions requiring the intervening test are op codes M, L, U, F, 2, K, 4" — and Figures
   * 62 and 91 give both a status column. So ALL NINE STEPS run, reusing the same clearStatus /
   * applyStatus / anyStatusOn / interlock code; what changes is that step 7 transfers no data —
   * it is the device's mechanical action (stack-and-feed, carriage motion) — and that step 4's
   * readiness test, step 7 and step 8's error test are the ONE call `device.control(op, d)`,
   * whose returned `Partial<ChannelStatus>` is step 8. The device checks its own readiness first
   * and returns Not Ready without acting.
   *
   * `Device.precheck` is deliberately NOT on this path, and that is load-bearing: Figure 62 says
   * the reader's Condition is "EOF — last card stacked (**never** for select-stacker)" and its
   * Data Check "…(never for select-stacker)". Routing `K` through `precheck` would report
   * Condition and clear the EOF latch, stealing the end-of-file report the next card-read
   * instruction owes the program. Structural, not conditional (io.md §6, A22-0526-3 pp.61, 63).
   * There is no `io()` record and no B-address either way.
   *
   * Routing is by the OP character, because the instruction carries no x2:
   * `STACKER_DEVICE_X2 = '1'`, `CARRIAGE_DEVICE_X2 = '2'`. `[likely]` — no figure prints an x2
   * for an op that has no x-field (channel.ts `SHORT_FORM_DEVICE`, plan §15).
   */
  control(op: 'F' | 'K', d: string, at: Addr): void;
  /**
   * ADDED IN PHASE 2, WAVE 4. The four conditions op `J` tests, io.md §5 Figure 35 [verified]:
   * BC9 `9`, BCV `@`, BPCB `R`, BNQ `Q`. They are NOT among the seven `IndicatorName` latches —
   * §3 above says so explicitly ("'six' in this project always means `ChannelStatus`") — they are
   * DEVICE state, and the channel is the only thing that holds devices. Figure 35 lists them PER
   * CHANNEL, which is what makes the channel the right owner. Four named booleans rather than a
   * `sense(d)` string switch, because four names read better to two people reading this file
   * together (`isa/exec/branch.ts` maps the four d-glyphs onto them).
   */
  readonly carriageChannel9: boolean;
  readonly carriageChannel12: boolean;
  // OPEN: CARRIAGE_NEVER_BUSY — always false; this configuration has no overlap feature and
  // `cycles.ts`'s I/O term is 0, so no program here can observe device motion (channel.ts, §15).
  readonly carriageBusy: boolean;
  // OPEN: CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH — io.md §8 contradicts itself about whether the
  // latch the INQUIRY REQUEST key sets is the latch BNQ tests. ONE latch here (console1415.ts, §15).
  readonly inquiryRequest: boolean;
}

// ─── 6. The card — charset.md §2, §2.1, §3, §7 ─────────────────────────────
// charset.md §2, §2.1, §3. Only the 6-bit BCD is stored; punches are DERIVED on render,
// because on the 1410 the mapping is a bijection in BOTH directions including 2-8 ↔ A-bit.
// A card carries NO word mark and NO check bit — charset.md §7: "word marks exist only in
// core — they are not on cards or tape". Marks travel in a deck as 0-5-8 word separators.
//
// These live HERE and not in src/formats because their first consumer is
// devices/reader1402.ts, and src/core imports nothing outside src/core
// (test/core-is-dom-free.test.ts). `Column`, `punchMask` and `bcdOfPunches` stay in
// src/formats/card.ts: the 1414 read buffer holds BCD, and the machine never sees a punch.
// `ObjectRecord` / `ObjectDeck` stay out of core for the same reason, and `SourceCard` (a bare
// alias for `string`) and `ListingLine` still arrive in Phase 3 with the assembler.

export const CARD_COLUMNS = 80;

/** Exactly CARD_COLUMNS six-bit BCD codes, 0o00..0o77. Built only by `makeCard`. */
export type Card = Uint8Array;
export type Deck = readonly Card[];

// ─── 7. Output streams ────────────────────────────────────────────────────
export type PrintEvent =
  | { kind: 'line';  text: string }                             // ≤132 glyphs
  | { kind: 'space'; lines: 1|2|3; afterPrint: boolean }
  | { kind: 'skip';  channel: number; afterPrint: boolean };    // carriage tape 1..12

// WAVE 3, with devices/printer1403.ts and §8's `printer` block. `PrintEvent` above is what the
// PROGRAM asked for and does not move; these two are what the PAPER and the CARRIAGE are. The
// 1403 keeps both, because the carriage position is live device state during the run — `J (I) 9`
// and `J (I) @` read it — so deriving the paper afterwards would implement the carriage twice.
// `renderGreenBar(paper)` (printer1403.ts) is the pure function the golden file and the UI share.

export interface PrintLine {
  readonly page: number;      // 1-based FORM number — see the increment rule on CarriageState
  readonly line: number;      // 1-based within the form
  readonly text: string;      // ≤132 chain glyphs, trailing blanks preserved
}

export interface CarriageState {
  // `page` is the FORM count, and it increments on exactly one event: carriage motion that
  // passes the last line of the form and wraps to line 1 of the next one. On
  // DEFAULT_CARRIAGE_TAPE, which punches channel 1 once at line 1, "skip to channel 1" IS that
  // event — but stating the rule as the wrap rather than as "a skip to channel 1" keeps it true
  // for any tape.
  readonly page: number;
  readonly line: number;                    // 1..tape.formLines
  readonly channel9: boolean;               // io.md §5 Figure 35 — on when the hole is sensed,
  readonly channel12: boolean;              // off when any other channel is sensed
  // The automatic single space the last print armed, NOT yet performed. Exposed rather than
  // hidden so that `snapshot()` stays a pure read (io.md §7, plan §7.3): the space is performed
  // only by the next write, the next `F`, or an explicit `flush()` — never by looking at the
  // paper.
  readonly autoSpacePending: boolean;
}

export interface ConsoleLine {
  readonly id: 'S'|'C'|'E'|'B'|'#'|'D'|'A'|'I'|'R'|null;
  readonly text: string;
  readonly wordMarks: readonly boolean[];   // inverted circumflex over the character
  readonly underline: readonly boolean[];   // invalid parity
  readonly spacingBefore: 'single'|'double';
  readonly matrixPos: 30 | 35;
}

// ─── 8. Images and stops ─────────────────────────────────────────────────
export interface CoreImage { readonly size: number; readonly width: 2|4; readonly cells: Uint8Array }

export type StopReason =
  | 'halt' | 'instructionCheck' | 'addressCheck' | 'processCheck'
  | 'ioInterlockStop' | 'unsupportedFeature' | 'unimplementedOp' | 'stopKey';

export interface MachineState {           // structured-cloneable snapshot for the UI
  iar: Addr; aar: Addr; bar: Addr; car: Addr; dar: Addr; ear: Addr; far: Addr;
  op: Cell; opMod: Cell;
  indicators: Readonly<Record<IndicatorName, boolean>>;
  channel1: ChannelStatus & { interlock: boolean };
  coreWindow: { base: Addr; cells: Uint8Array };   // the slice of core the UI renders: base address + cells
  microseconds: number; instructions: number;
  stop?: StopReason;
  console: readonly ConsoleLine[];
  // WAVE 2, with devices/reader1402.ts and machine.loadDeck(). COUNTS, not cards: the session
  // (src/ui/unitrecord/session.ts) holds the Deck and derives which card is in the read station
  // and which are in each pocket, so a snapshot never copies 80-byte arrays and `MachineState`
  // stays structured-cloneable (architecture.md §2 B11).
  //
  // The 1402 has FIVE pockets, not six: 8/2 is shared between the read feed and the punch feed
  // (console-and-physical.md §7 "0 (NP), 4, 8/2, 1, 0 (NR)"; io.md §6). Each device counts what
  // IT stacked, so the shared cell is rendered as `reader['8-2'] + punch['8-2']` once the punch
  // block arrives in wave 4 — two counts, one pocket.
  reader: {
    hopper: number; buffered: boolean; eofKey: boolean; eofLatch: boolean;
    stackers: { readonly '0': number; readonly '1': number; readonly '8-2': number };
  };
  // WAVE 3, with devices/printer1403.ts — and it is why §7's PrintLine / CarriageState are wave 3
  // too. `paper` is the device's own array, sliced the way the console log is (R7): a snapshot
  // stays structured-cloneable and a view rebuilds only when the length changes.
  printer: { carriage: CarriageState; paper: readonly PrintLine[] };
  // WAVE 4, with devices/punch1402.ts. Counts of what the PUNCH feed stacked, and `readerView.ts`
  // is where they are added to the reader's: `8-2` is the one pocket the two feeds SHARE, so the
  // strip renders `reader['8-2'] + punch['8-2']` (the five-pockets comment on `reader` above).
  punch: { stackers: { readonly '0': number; readonly '4': number; readonly '8-2': number } };
}
