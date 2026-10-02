// src/core/channel.ts — data channel 1: the nine-step I/O sequence, the interlock, the six
// status indicators, and the move/load translation in both directions.
// Source: research/io.md §1-§5, §8; docs/plans/architecture.md §2 B6/B9, §4.10, §9 C17;
// docs/plans/phase-1-cpu-core.md §1, §5 Wave 2.
//
// The CPU talks only to a `Channel`; a `Channel` talks only to a `Device`. No executor knows
// what a 1415 is, and no device knows what move mode is: the MODE TRANSLATION is channel work
// and the RENDERING is device work (io.md §3; docs/plans/architecture.md §4.10).

import { parity } from './bcd.js';
import {
  InstructionCheck, IoInterlockStop, UnimplementedOp, UnsupportedFeature,
} from './checks.js';
import { DeviceRegistry, type Device } from './devices/device.js';
import { ML_D_TABLE, RX_STATUS_BITS, X1_CHANNEL, X2_DEVICE } from './isa/dmods.js';
import {
  BCD6, C, WM,
  type Addr, type CarriageState, type Cell, type Channel, type ChannelStatus, type IoMode,
  type Storage, type XControl,
} from './types.js';

// research/charset.md §2 (A22-0526-3 Figure 2): the two characters the transfer rules turn on.
// A group mark WITHOUT a word mark is ordinary data — only the GM-WM terminates (io.md §3).
export const GROUP_MARK = 0o77;
export const WORD_SEPARATOR = 0o35;

/** Every field of `ChannelStatus`, taken from the Figure 36 table so there is one source. */
const STATUS_KEYS: readonly (keyof ChannelStatus)[] = RX_STATUS_BITS.map((b) => b.status);

function clearStatus(): ChannelStatus {
  return {
    notReady: false, busy: false, dataCheck: false,
    condition: false, wrongLengthRecord: false, noTransfer: false,
  };
}

/** A group-mark-with-word-mark in core — the transfer terminator (io.md §3, 223-2692 p.59). */
export function isGroupMarkWordMark(cell: Cell): boolean {
  return (cell & WM) !== 0 && (cell & BCD6) === GROUP_MARK;
}

/** What `decodeD` extracted from the instruction's d-character. */
export interface IoDirectionDecode {
  /** The d-character glyph itself, handed on to the device. */
  readonly d: string;
  readonly direction: 'read' | 'write';
  /**
   * The `$`/`X` end-of-core class: suppress the GM-WM termination test. Phase 1 decodes it and
   * carries it; what it does to a 1402's 80-column buffer is Phase 2 (io.md §3).
   */
  readonly suppressGroupMarkTest: boolean;
}

/**
 * OPEN: no manual defines a validity check for I/O d-characters — "the PoO defines no
 * d-character validity check for I/O at all" (opcodes.md §6.5 / io.md §3). So what a character
 * outside `ML_D_TABLE` does is unstated. We treat it as the I ring treats an op-modifier it
 * cannot decode: an Instruction Check with nothing executed (research/architecture.md §7),
 * matching the same ruling for `J` in `isa/exec/branch.ts`. The alternative reading is "no
 * direction selected, therefore no transfer", which would hide the fault.
 * open-questions.md, opcodes row.
 */
export const UNDEFINED_IO_D_CHAR_IS_INSTRUCTION_CHECK = true;

/**
 * OPEN: `CARD_DOLLAR_SUPPRESSES_GM_WM_TEST` — the constant behind the `$`/`X` line of `decodeD`
 * below, split the way the evidence splits.
 *
 * **LEGALITY `[verified]`.** C28-0351-5 p.8 Table II, "Not using 7010 Load Key", step 2 prints
 * IBM's own hand-keying template `ALcde00012$r` with `$` as a fixed literal while the device
 * selector `d` varies (`1` = card reader, `B` = tape), and step 1 puts the Bootstrap 1 routine
 * card first in a card Standard Input Unit. So `$` on a 1402 read is IBM's own prescription.
 *
 * **EFFECT `[likely]`.** No manual states what `$` does on a CARD. The semantics here are derived
 * from A22-0526-3 p.86's device-independent definition of the end-of-core class: suppress the
 * GM-WM termination test, store all 80 buffer columns, and set no wrong-length-record — with the
 * test gone there is no correct-length check left to fail (`read()` below). The transfer is still
 * bounded by the 1414's 80-position buffer, not by the top of core: a card `$` cannot literally
 * run to end of core.
 *
 * **`decodeD` is the one place that moves if the derivation is overturned** — it is where the
 * class is decoded, at channel level and before device dispatch (docs/plans/architecture.md §9
 * row C17). Flipping this to `false` would make `$` an ordinary read that stops at the first
 * GM-WM, which is the reading `io.md` §3 held before C28-0351-5 refuted it.
 * open-questions.md, io row and #13's rider; docs/plans/phase-2-unit-record.md §15.
 */
export const CARD_DOLLAR_SUPPRESSES_GM_WM_TEST = true;

/**
 * OPEN: `LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE` — a KNOWN DIVERGENCE from a `[likely]`
 * research line, recorded rather than fixed, because the two readings come out of the same
 * paragraph of `io.md` §3 and only one of them is a mechanism.
 *
 * **Reading A — the summary sentence, `[likely]`.** io.md §3 line 173, "A load-mode read CAN
 * create a GMWM": "If the card image holds a word separator immediately followed by a group-mark
 * character (BCD 77), load mode assembles and stores a genuine GMWM; THE NEXT CYCLE SENSES IT and
 * terminates the transfer early with WLR on." Taken literally, a load-mode read that writes a
 * GM-WM must stop on the very mark it just made.
 *
 * **Reading B — the mechanism, in the same paragraph and in the termination table above it.**
 * 223-2692 p.59's store gate "inspects the OLD contents of the target position, not the character
 * being assembled" (io.md §3 line 173's own words), and §3's "Termination sequence to model"
 * step 1 is explicit that each cycle reads `core[BAR]` to the B-channel BEFORE the store. A mark
 * written at position P is therefore never read out again: the next cycle tests P+1. Under B the
 * transfer runs on and a self-created GM-WM terminates nothing.
 *
 * **We take B**, for three reasons. It is the mechanism the same source states, and a mechanism
 * outranks a summary of it. The SimH oracle agrees — `i7010_chan.c` writes the assembled
 * character with its mark (`if (cmd[chan] & CHAN_WM && ch != 035) ch |= WM;`, no group-mark
 * exclusion) and tests the target position's prior contents, never the byte it just stored. And
 * the case is unreachable from anything this project produces: `formats/objectdeck.ts` refuses
 * the pattern outright (`OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK`, pinned in both directions by
 * `test/objectdeck.test.ts`), which is the second of the two options io.md §3 offers a card
 * loader — "either guarantee that pattern cannot occur in its deck format or model the early
 * termination".
 *
 * **The fix path**, if A is ever confirmed: in `read()` below, after the load-mode
 * `storage.writeWhole`, test the byte just written for GM-WM and, if it is one, set
 * `endedOnGroupMark` and break — which drops WLR out of the existing branch unchanged. One
 * three-line block; nothing else in the channel moves.
 * open-questions.md, Phase 2 section and the "GM-WM created by a load-mode read" io row;
 * PHASE-2-NOTES.md §1.
 */
export const LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE = true;

// OPEN: `CARRIAGE_DEVICE_X2` / `STACKER_DEVICE_X2` — `[likely]`. io.md §2's instruction summary
// says `F d` is the 1403 carriage (A22-0526-3 pp.80-81) and `K d` is the 1402 reader's select-
// stacker-and-feed (pp.62-63), and §§6-7's device chapters say the same. But NO FIGURE PRINTS AN
// x2 FOR AN OP THAT HAS NO X-FIELD — Figure 107's x2 column is keyed on the instruction's
// x-control field, and these two instructions have none — so the mapping is physical rather than
// stated, and the tag records that. There is no plausible alternative; what a wrong guess would
// cost is a short-form op reaching the wrong device, which the wave-2 and wave-3 tests catch.
// docs/plans/phase-2-unit-record.md §6.1, §15; open-questions.md, Phase 2 section.
export const STACKER_DEVICE_X2 = '1';
export const CARRIAGE_DEVICE_X2 = '2';

/**
 * OPEN: `CARRIAGE_NEVER_BUSY` — a MODELLING REFUSAL, not an unknown. The cause is `[verified]`:
 * io.md §7 says the 1403 "is not busy while data are transferred to the print buffer; it becomes
 * busy after the transfer completes and printing starts. Model this — programs rely on it to
 * overlap" (A22-0526-3 pp.81-82). This configuration has **no overlap feature** and the whole
 * `I/O` term of `49.5 µs + I/O` is 0 (`cycles.ts`), so no program here can observe device motion:
 * a polling program sees "ready" and proceeds correctly, one iteration sooner than on iron.
 * So `carriageBusy` is always false and `J (I) R` (BPCB) never branches.
 * docs/plans/phase-2-unit-record.md §15; open-questions.md, Phase 2 section.
 */
export const CARRIAGE_NEVER_BUSY = true;

/**
 * What `carriageChannel9` / `carriageChannel12` read — a device that HAS a carriage. Structural,
 * so `channel.ts` still knows nothing more concrete than `Device` (architecture.md §2 B9): the
 * 1403 satisfies it by having a `carriage`, and `machine.ts` hands it over at registration time.
 */
export interface CarriageSensing { readonly carriage: CarriageState }

/** What `inquiryRequest` reads — the 1415's inquiry latch, same rule (io.md §8 step 2). */
export interface InquirySensing { readonly pendingRequest: boolean }

/**
 * `Channel.control`'s whole routing table: two rows, a data table rather than a mechanism.
 * Keyed on the op character so the TYPE SYSTEM supplies the row — `control`'s `op` is `'F' | 'K'`
 * and both keys are present, so there is no "op not in the table" case to branch on.
 */
const SHORT_FORM_DEVICE: Readonly<Record<'F' | 'K', { readonly x2: string; readonly cite: string }>> = {
  K: { x2: STACKER_DEVICE_X2, cite: 'io.md §6 / A22-0526-3 pp.62-63' },
  F: { x2: CARRIAGE_DEVICE_X2, cite: 'io.md §7 / A22-0526-3 pp.80-81' },
};

export class Channel1 implements Channel {
  /** The six indicators of io.md §5 Figure 36. Reset at step 3 of the NEXT I/O, never by a test. */
  status: ChannelStatus = clearStatus();

  /** io.md §5: set at read-out of every I/O instruction, cleared only by `R`. */
  interlock = false;

  readonly devices = new DeviceRegistry();

  /**
   * The two devices the four `J` senses of io.md §5 Figure 35 read — set by `machine.ts` when it
   * registers them, and left `undefined` on a channel that has neither (every Phase-1 test rig).
   *
   * They are references and not registry lookups because the getters must stay TYPED: the
   * registry is keyed on x2 and hands back a `Device`, which has no `carriage` and no
   * `pendingRequest`, so reading either through it would need a runtime duck-type and a cast.
   * The cost is stated rather than hidden: a test that REPLACES the printer at x2 = `2` (which
   * `test/printer1403.test.ts` does, to choose a carriage tape) gets a channel still sensing the
   * machine's original 1403 — the device the `F` instructions in THAT test do not reach, and the
   * reason those tests assert `p.carriage` directly rather than through `J (I) 9`.
   */
  printer: CarriageSensing | undefined;
  console: InquirySensing | undefined;

  /**
   * CLR is NOT a seventh latch. 223-2692 p.42: "The two latches, WLR and CLR, must be in
   * agreement at the end of an I-O operation or a subsequent programmed test of the WLR
   * indicator (BWL) results in a mismatch between the branch latch and the no branch latch. An
   * instruction check occurs during a branch operation if the branch and no branch latches do
   * not match." Holding the invariant by construction is cheaper than a second latch that can
   * drift out of step (io.md §5; docs/plans/phase-1-cpu-core.md §1).
   */
  get correctLengthRecord(): boolean {
    return !this.status.wrongLengthRecord;
  }

  /**
   * **The four `J` senses of io.md §5 Figure 35** — BC9 `9`, BCV `@`, BPCB `R`, BNQ `Q`, all four
   * listed PER CHANNEL (A22-0526-3 p.36) [verified]. They are not indicator latches (types.ts §3)
   * and `ExecContext` holds no device, so the channel — the only thing that holds devices — is
   * where `isa/exec/branch.ts` reads them. A channel with no printer and no console answers
   * `false` to all four, which is what an absent device means and not a claim about one.
   *
   * "Carriage 9 and 12 indicators turn on when their hole is sensed and off when any other
   * carriage-tape channel is sensed" (io.md §5) — that rule is the 1403's, held in
   * `CarriageState`, and read here rather than re-derived.
   */
  get carriageChannel9(): boolean { return this.printer?.carriage.channel9 ?? false; }
  get carriageChannel12(): boolean { return this.printer?.carriage.channel12 ?? false; }
  /** OPEN: `CARRIAGE_NEVER_BUSY` above — `J (I) R` never branches on this configuration. */
  get carriageBusy(): boolean { return false; }
  /** OPEN: `CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH` (console1415.ts) — one latch, reading A. */
  get inquiryRequest(): boolean { return this.console?.pendingRequest ?? false; }

  /**
   * The x-control field `x1x2x3`, io.md §2 / opcodes.md §6.5 (A22-0526-3 p.105 Figure 107).
   *
   * The glyphs arrive from `glyphOf`, which is a bijection over the 64 BCD codes — so keying
   * the tables on the glyph IS the "decode on the BCD code, not the ASCII glyph" rule io.md §2
   * insists on: the alternate type-head renderings (`(`, `'`, `)`) never reach this function,
   * because they are the same codes and `glyphOf` returns the one canonical glyph for each.
   */
  decodeX(x1: string, x2: string, x3: string, at: Addr): XControl {
    const row = X1_CHANNEL.find((r) => r.glyph === x1);
    if (row === undefined) {
      throw new InstructionCheck(`undefined x-control channel character "${x1}" (io.md §2)`, at);
    }
    // `? ! $ =` decode as channels 3/4 on a 7010 and are not 1410 features
    // (opcodes.md §6.5, io.md §2 "SimH caution"; software.md §10.3).
    if (!row.onThe1410) {
      throw new InstructionCheck(
        `x-control "${x1}" selects 7010 channel ${row.channel} — not a 1410 feature (${row.cite})`,
        at,
      );
    }
    // THE OVERLAP BIT IS TESTED FIRST, before the channel number. io.md §4: "An overlapped
    // instruction on a machine without the overlap feature stops the system" — the stop is the
    // OVERLAP FEATURE's, and it is what the machine does with `@` (channel 1, overlap) and `*`
    // (channel 2, overlap) alike, because a machine with no overlap feature has no channel 2
    // either (io.md §1: channel 2 "requires the processing-overlap feature"). Testing channel 2
    // first would report the narrower fault for `*` and contradict the plan's own wording — plan
    // §1 and docs/plans/architecture.md §12 both say "an overlap x1 (`@`/`*`) raises an
    // unsupported-feature stop".
    if (row.overlap) {
      throw new UnsupportedFeature(
        `x-control "${x1}" asks for processing overlap; this machine has no overlap feature — io.md §4, A22-0526-3 p.92`,
        at,
      );
    }
    // Channel 2 without overlap — the lozenge. Still needs the feature (io.md §1), but it is a
    // Phase-1 scope gap rather than a documented system stop, so it carries its citation.
    if (row.channel === 2) {
      throw new UnimplementedOp(
        x1, 'channel2',
        `channel 2 requires the processing-overlap feature and is out of Phase 1 — ${row.cite}`,
        at,
      );
    }
    // OPEN: x2 names the DEVICE CLASS (io.md §2 Figure 107 / opcodes.md §6.5), and neither §2 nor
    // §5's nine steps state a validity check for it. A glyph outside the table names no class at
    // all, so step 4 has nothing to test — we take the same I-ring rule the x1 row above and the
    // `J` and I/O d-characters take: an Instruction Check, nothing executed (architecture.md §7).
    // NOT the same case as a glyph that IS in the table with no device attached — io.md §9
    // Figure 99 calls that "no such unit", a Not Ready, and step 4 below still does exactly that.
    if (!X2_DEVICE.some((r) => r.glyph === x2)) {
      throw new InstructionCheck(`undefined x-control device character "${x2}" (io.md §2)`, at);
    }
    // x3 is deliberately NOT validated here: it is a sub-operation whose legal set depends on the
    // device (Figure 107's x3 column is keyed on x2), so it belongs to the device, not the
    // channel — `Device.precheck(unit, d)` receives it (io.md §2, §5 step 4).
    return { channel: 1, overlap: false, deviceType: x2, unit: x3 };
  }

  /**
   * The d-character of `M`/`L`, opcodes.md §6.5 / io.md §3.
   *
   * **The §9 C17 ruling lives here, verbatim** (docs/plans/architecture.md §9 row C17,
   * 2026-08-30): "`$` is legal on a card read `[verified]` and is decoded at channel level,
   * before device dispatch." Settling evidence: C28-0351-5 p.8 Table II ("Not using 7010 Load
   * Key", step 2) prescribes `ALcde00012$r` with `$` as a fixed literal while the device
   * selector `d` varies (1 = card reader, B = tape), and step 1 puts the Bootstrap 1 card first
   * in a card Standard Input Unit — IBM itself keying `$` on a 1402 read. A22-0526-3 names the
   * end-of-core class device-independently on pp.9 and 92; p.62's `R`-only d-column is silence,
   * not a prohibition. **This function is the one place that moves if the ruling is overturned.**
   *
   * Phase 1 needs only `W` and `R`; `$`/`X` are recognised and carried as
   * `suppressGroupMarkTest`, and their card semantics (store all 80 buffer columns, no WLR)
   * arrive with the 1402 in Phase 2.
   */
  decodeD(d: string, at: Addr): IoDirectionDecode {
    const row = ML_D_TABLE.find((r) => r.d === d);
    if (row === undefined) {
      if (!UNDEFINED_IO_D_CHAR_IS_INSTRUCTION_CHECK) {
        return { d, direction: 'read', suppressGroupMarkTest: false };
      }
      throw new InstructionCheck(`undefined I/O d-character "${d}" (opcodes.md §6.5)`, at);
    }
    if (row.priorityFeatureOnly) {
      throw new UnimplementedOp(d, 'priority', `${row.meaning} — ${row.cite}`, at);
    }
    return {
      d,
      direction: d === 'R' || d === '$' ? 'read' : 'write',
      // `CARD_DOLLAR_SUPPRESSES_GM_WM_TEST` above carries the `[verified]` legality and the
      // `[likely]` effect; this is the line it governs.
      suppressGroupMarkTest: CARD_DOLLAR_SUPPRESSES_GM_WM_TEST && (d === '$' || d === 'X'),
    };
  }

  /**
   * **The nine-step sequence of io.md §5 Figure 40 (A22-0526-3 pp.42-43), verbatim.**
   * Returns LB — the number of CORE positions the transfer covered, which is what
   * `regs: B+LB+1` needs (opcodes.md §2 pp.40-41; io.md §1 "End-of-op address").
   */
  io(mode: IoMode, storage: Storage, x: XControl, start: Addr, d: string, at: Addr): number {
    // 1. Recognize the I/O op.
    const dc = this.decodeD(d, at);

    // 2. Test the interlock indicator — ON => system stop.
    if (this.interlock) {
      throw new IoInterlockStop(
        'a second I/O instruction on channel 1 with no intervening R status test — io.md §5, A22-0526-3 pp.37-38, 42',
        at,
      );
    }

    // 3. Reset all six status indicators for that channel. (A status TEST never resets them;
    //    this read-out is the only thing that does — io.md §5.)
    this.status = clearStatus();

    // 4. Test whether the device can execute; set indicators if not.
    const device = this.devices.lookup(x.deviceType);
    if (device === undefined) {
      // "no such unit" is a Not Ready condition, not a check — io.md §9 Figure 99 status table
      // (A22-0526-3 p.88), the only status table that spells the case out.
      this.applyStatus({ notReady: true });
    } else {
      this.applyStatus(device.precheck(x.unit, dc.d));
    }

    // 5. Turn on the interlock.
    this.interlock = true;

    // 6. If any indicator is on, do NOT execute; skip to step 9.
    if (this.anyStatusOn() || device === undefined) return 0;

    // 7. Transfer data.  8. Test for errors; set indicators.  (Both live in the two paths
    //    below: the post-transfer test is what the device's return value and the WLR rule are.)
    return dc.direction === 'write'
      ? this.write(mode, device, storage, start, x.unit, dc)
      : this.read(mode, device, storage, start, x.unit, dc);

    // 9. Proceed to the next sequential instruction — the caller's `regs` column does that,
    //    and it "can never legally be another I/O on that channel" (step 2 above enforces it).
  }

  /**
   * **The short-form I/O ops, `F d` and `K d`** — the same nine steps of io.md §5 Figure 40,
   * with no data.
   *
   * They are form `Od`: no x-control field, no B-address, no record (io.md §2's instruction
   * summary; isa/table.ts `lengths: [2]`), so `io()` cannot carry them and `DeviceRegistry` has
   * no x2 to look up on. But io.md §5 puts both on the interlock's own op list — "I/O
   * instructions requiring the intervening test are op codes **M, L, U, F, 2, K, 4**" — and
   * Figures 62 and 91 give each a status column, so every step still runs:
   *
   *   1 recognize · 2 interlock test (on => system stop) · 3 reset the six · 5 interlock on ·
   *   6 skip if any indicator is on · and **steps 4, 7 and 8 fused into the one
   *   `device.control(op, d)` call** — the device tests its own readiness and returns Not Ready
   *   without acting, performs its mechanical action (stack-and-feed, carriage motion) instead of
   *   a transfer, and its returned `Partial<ChannelStatus>` IS step 8.
   *
   * **`Device.precheck` is deliberately not called here**, and that is what makes Figure 62's two
   * "(never for select-stacker)" rows structural rather than conditional: a `K` routed through
   * `precheck` would report Condition and clear the reader's EOF latch, stealing the end-of-file
   * report the next card-read instruction owes the program (io.md §6, A22-0526-3 pp.61, 63).
   * There is no `io()` record and no B-address either way — `regs: NSI_AP_BP` on both table rows
   * leaves BAR where it was, and "word marks are not affected" (io.md §6 item 5, §7).
   */
  control(op: 'F' | 'K', d: string, at: Addr): void {
    // 1. Recognize the I/O op. Routing is the two-row table above, keyed on the OP character —
    //    a `Record<'F' | 'K', …>` rather than an array, so the row is total and there is no
    //    unreachable "no such op" branch to leave untested.
    const row = SHORT_FORM_DEVICE[op];

    // 2. Test the interlock indicator — ON => system stop.
    if (this.interlock) {
      throw new IoInterlockStop(
        `a second I/O instruction on channel 1 with no intervening R status test — '${op}' is on the interlock's op list (io.md §5, A22-0526-3 pp.37-38, 42)`,
        at,
      );
    }

    // 3. Reset all six status indicators for that channel.
    this.status = clearStatus();

    // 4 (first half). Nothing attached at that x2, or a device that cannot perform this
    // operation, is "no such unit" — a Not Ready, exactly as `write()` treats a device with no
    // `write` method (io.md §9 Figure 99, the one status table that spells the case out).
    const device = this.devices.lookup(row.x2);
    const control = device?.control?.bind(device);
    if (control === undefined) this.applyStatus({ notReady: true });

    // 5. Turn on the interlock.
    this.interlock = true;

    // 6. If any indicator is on, do NOT execute; skip to step 9.
    if (control === undefined || this.anyStatusOn()) return;

    // 4 (readiness) + 7 (the mechanical action) + 8 (test for errors) — one call.
    this.applyStatus(control(op, d));

    // 9. Proceed to the next sequential instruction — the caller's `regs` column does that.
  }

  /**
   * **Output.** Gathers the core field from `start` forward up to but NOT including the
   * terminating group-mark-with-word-mark, translates it for the device's width, and hands the
   * record over. Returns LB, the core length — NOT the record length, which load mode
   * lengthens (io.md §3 p.41).
   */
  write(
    mode: IoMode, device: Device, storage: Storage, start: Addr, x3: string,
    d: IoDirectionDecode,
  ): number {
    if (device.write === undefined) {
      // A device attached at this x2 that cannot accept a write is not ready for this operation
      // — the same reading as "no such unit" above (io.md §9 Figure 99).
      this.applyStatus({ notReady: true });
      return 0;
    }

    const cells: number[] = [];
    for (let a = start; ; a++) {
      // Reading through `storage.read` is what makes running off the top of core an address
      // check rather than a silent stop (research/architecture.md §4).
      const cell = storage.read(a);
      // The GM-WM is read out, tested and left in place; it is the terminator and is never
      // sent to the device — Figure 44 note 3, "‡ is not printed with message" (io.md §8).
      if (!d.suppressGroupMarkTest && isGroupMarkWordMark(cell)) break;
      cells.push(cell);
      // The `$`/`X` end-of-core class "stops only at the highest-numbered core position"
      // (opcodes.md §6.5, A22-0526-3 p.86).
      if (d.suppressGroupMarkTest && a === storage.size - 1) break;
    }

    // The x3 output sub-operations that must see WORD MARKS, applied AHEAD of the translation —
    // the 1403's `%21` and nothing else (types.ts §5 `Device.outputCells`). The cells still carry
    // their WM bits at this point in BOTH modes, which is the whole reason the hook is here:
    // `dropWordMark` below masks bit 7 for every 7-bit device, and in load mode the separators
    // the marks become do not exist yet.
    const out = device.outputCells?.(x3, cells, mode) ?? cells;
    this.applyStatus(device.write(x3, d.d, translateForOutput(mode, device.bits, out), mode));

    // No wrong-length-record on this path: on output the core field's own GM-WM defines the
    // record, so there is no length for the two ends to disagree about. io.md §8's console
    // status table (A22-0526-3 pp.47-49, Figures 45-46) prints WLR "never" for a console write.
    // OPEN: io.md §9's tape table carries one write exception — "never (unless zero-length
    // record, first char GMWM)" — which needs a 729 to be reachable. Phase 2, with the device.
    return cells.length;
  }

  /**
   * **Input.** The device produces a record of cell bytes, or `null` when it has nothing to
   * send (io.md §5 Figure 36 No Transfer). Returns LB, the number of core positions written —
   * which load mode SHORTENS, one per stored word mark and one per stored separator
   * (A22-0526-3 p.41).
   */
  read(
    mode: IoMode, device: Device, storage: Storage, start: Addr, x3: string,
    d: IoDirectionDecode,
  ): number {
    if (device.read === undefined) {
      this.applyStatus({ notReady: true });
      return 0;
    }
    const record = device.read(x3, d.d);
    if (record === null) {
      this.applyStatus({ noTransfer: true });
      return 0;
    }

    let a = start;
    let pendingWordMark = false;
    let endedOnGroupMark = false;
    for (const byte of record) {
      // 223-2692 p.59: the target position is read out onto the B-channel BEFORE the store, and
      // a GM-WM there suppresses the store gate — so the GM-WM survives and ends the transfer.
      // It is the OLD contents of the position that are tested, never the character being
      // assembled, which is why a GM-WM this very read creates does not stop it:
      // `LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE` above, where both readings are set out.
      if (!d.suppressGroupMarkTest && isGroupMarkWordMark(storage.read(a))) {
        endedOnGroupMark = true;
        break;
      }
      if (mode === 'move') {
        // "Existing word marks in the input field are undisturbed" (223-2692 p.58). And NO word
        // mark is added to the first character: SimH forces one and contradicts the manual —
        // ledger entry `move-first-wm` (io.md §3 "Divergence — do NOT copy"; plan §10).
        storage.setChar(a, byte & BCD6, storage.wm(a));
        a++;
        continue;
      }
      // Load mode, 223-2692 pp.11, 58 + Figure 5 (io.md §3).
      const bcd = byte & BCD6;
      if (bcd === WORD_SEPARATOR && !pendingWordMark) {
        pendingWordMark = true;      // consumed, not stored; the record shortens one position
        continue;
      }
      // Two successive separators store ONE separator with no word mark (the 1410 rule is
      // PAIRWISE, not the 1401's greedy run — 223-2588-2 p.52).
      const wm = bcd === WORD_SEPARATOR
        ? false
        : pendingWordMark || (device.bits === 8 && (byte & WM) !== 0);
      // "Replace the whole target byte including the word-mark bit" — the BCD, WM and C bits all
      // come from the channel register and the old core byte contributes nothing; parity is
      // RECOMPUTED, not carried (223-2692 p.11 Case 2).
      storage.writeWhole(a, (wm ? WM : 0) | parity(bcd, wm) | bcd);
      pendingWordMark = false;
      a++;
    }

    const stored = a - start;
    if (!d.suppressGroupMarkTest) {
      if (endedOnGroupMark) {
        // The record still had characters left when core said stop — io.md §5, "the record
        // read into storage is not the correct length (GM-WM mispositioned)".
        this.applyStatus({ wrongLengthRecord: true });
      } else {
        // The extra E-cycle of 223-2692 p.42: read core[BAR]; a GM-WM there blocks WLR, anything
        // else sets it. Either way the character is regenerated, not stored.
        this.applyStatus({ wrongLengthRecord: !isGroupMarkWordMark(storage.read(a)) });
      }
    }
    // OPEN: `$` reads suppress the test, so there is no correct-length check left to make and
    // no WLR is set (io.md §3 termination table, steps 2 and 5) — [likely], derived.
    return stored;
  }

  /** `R (I) d` — io.md §5 Figure 36. One to six indicators per d-character, by bit. */
  testStatus(dBits: number): boolean {
    return RX_STATUS_BITS.some((bit) => (dBits & bit.mask) !== 0 && this.status[bit.status]);
  }

  /**
   * io.md §5: the interlock is cleared by exactly two things — an `R` that actually branches,
   * or `R (I) ǂ` with the group-mark d-character, which clears without requiring a branch
   * (A22-0526-3 pp.37-38, 42; A22-0530-1 p.8). `branch.ts` decides which; this just does it.
   */
  release(): void {
    this.interlock = false;
  }

  /** Indicators only ever turn ON during an operation; step 3 is the only thing that clears. */
  private applyStatus(partial: Partial<ChannelStatus>): void {
    for (const key of STATUS_KEYS) if (partial[key] === true) this.status[key] = true;
  }

  private anyStatusOn(): boolean {
    return STATUS_KEYS.some((key) => this.status[key]);
  }
}

/**
 * The output half of move vs load, io.md §3 (A22-0526-3 p.41) and docs/plans/architecture.md B9.
 *
 * - **Move mode**, any device: word separators pass through unchanged and core word marks are
 *   not transferred at all.
 * - **Load mode, 8-bit device** (the 1415, and only the 1415 — io.md §1): no translation. The
 *   cells go over with their WM bits intact and the device renders them, WCPW as an inverted
 *   circumflex over the character (io.md §8 Figure 44).
 * - **Load mode, 7-bit device** (1402, 1403, tape): the device has nowhere to put a WM bit, so
 *   each core word mark becomes a word separator written one position AHEAD of its character
 *   and each core word separator becomes TWO — the record LENGTHENS — and only then is bit 7
 *   masked off (opcodes.md §2 `L` row / A22-0526-3 pp.40-41; io.md §3 p.41).
 *
 * What the device then does with a separator is the device's business: the 1403 prints a blank
 * ahead of the character (io.md §7), the 1402 punches 0-5-8. Rendering is device work.
 */
export function translateForOutput(
  mode: IoMode, bits: 7 | 8, cells: readonly Cell[],
): Uint8Array {
  if (mode === 'load' && bits === 8) return Uint8Array.from(cells);

  const out: number[] = [];
  // A character that crosses to a 7-bit device loses its word-mark bit, and the word mark
  // participates in parity — so dropping it FLIPS the check bit, exactly as `storage.setWm`
  // does (research/architecture.md §2, A22-0526-3 p.5). Flipping rather than regenerating is
  // the difference between a machine that can report a data check on bad core data and one
  // that silently launders it (io.md §8: a parity error prints, underlines and sets Data Check).
  const dropWordMark = (cell: Cell): number =>
    (cell & (C | BCD6)) ^ ((cell & WM) !== 0 ? C : 0);
  // The separators the translation SYNTHESISES have no core cell behind them, so they are
  // generated with correct odd parity.
  const separator = parity(WORD_SEPARATOR, false) | WORD_SEPARATOR;

  for (const cell of cells) {
    const bcd = cell & BCD6;
    if (mode === 'load') {
      // OPEN: a word mark OVER a word separator is expressible in 8-bit core but no manual says
      // what load-mode output does with one. We compose the two rules in the order the manual
      // states them — the mark's separator first, then the separator's pair — giving three.
      // Unreachable from a 7-bit device, which can never have read one in (io.md §3 table row
      // "WM-over-WS character: not possible from a 7-bit device"). open-questions.md, io row.
      if ((cell & WM) !== 0) out.push(separator);
      if (bcd === WORD_SEPARATOR) { out.push(separator, separator); continue; }
    }
    out.push(dropWordMark(cell));
  }
  return Uint8Array.from(out);
}
