// src/core/devices/console1415.ts — the IBM 1415 console I/O printer as a channel-1 device.
// Source: research/io.md §8 (A22-0526-3 pp.45-49, Figures 44-46); research/console-and-physical.md
// §2 (A22-0526-3 Fig.42 p.46, p.49; S223-2648 Fig.5 p.9); docs/plans/architecture.md §2 B8, §4.10.
//
// A modified Selectric: 64 characters plus a word-mark symbol and an underscore, ≤932 char/min.
// It is the ONE eight-bit device on this machine — 223-2692 contradicts itself on p.8 vs p.9 and
// the p.8 reading wins, because A22-0526-3 Figure 44's RCPW enters word marks into storage
// directly from the keyboard, which a seven-bit path cannot do (io.md §1, plan §10).
//
// The device renders; it never mutates the machine. `lines` is a value the machine's
// `snapshot()` reads (docs/plans/architecture.md §2, "Devices produce values").
//
// It is the second producer of a `ConsoleLine` and follows the same convention as `printout.ts`:
// `text` is the BARE message, `id` carries the ID character, and `wordMarks`/`underline` index
// `text` from 0. The renderer prints `id + ' ' + text`.
//
// **The inquiry path (Phase 2 wave 4).** Both directions are now real. The keyboard side is four
// members — `pendingRequest` (the inquiry latch the INQUIRY REQUEST key sets), `supply(entry)`
// (the typed line, queued by RELEASE or CANCEL), `precheck` (CANCEL during a message) and
// `read` (the transfer, and the `I` line the console types as it happens) — and nothing else,
// because io.md §8's three wrong-length sentences and Figure 44's RCP/RCPW word-mark pair are
// already what `channel.ts` does with an eight-bit device (plan §6: "No console code").

import { bcdOfGlyph, glyphOf, parity } from '../bcd.js';
import { formatPrintout } from '../printout.js';
import {
  BCD6, C, WM,
  type ChannelStatus, type ConsoleLine, type Device, type IoMode,
} from '../types.js';

/** io.md §2 Figure 107: x2 = `T` is the console I/O printer; x3 = `0` has no meaning. */
export const CONSOLE_X2 = 'T';
export const CONSOLE_X3 = '0';

/**
 * The ID character a PROGRAM message carries. console-and-physical.md §2's print-out table
 * ("Console reply (program) | single | R | program message, invalid chars underlined | 30") and
 * io.md §8's reply behaviour agree: "The console reply routine prints `R`, a space, then data
 * until the GMWM, then carrier return + vertical space" (A22-0526-3 pp.46, 48-49; S223-2648
 * Fig.5 p.9). `S C E B # D A I` are the operator- and stop-print-out lines, not this path.
 */
export const PROGRAM_MESSAGE_ID = 'R';

/** Same table: the reply line spaces single and prints at matrix position 30. */
export const PROGRAM_MESSAGE_SPACING = 'single' as const;
export const PROGRAM_MESSAGE_MATRIX = 30 as const;

/**
 * "In load-mode console printing, blanks print as a small `b`" (console-and-physical.md §2,
 * A22-0526-3 p.49; io.md §8 Figure 44, WCPW). Move mode (WCP) prints a valid blank as a space —
 * "a valid blank in storage spaces the printer" (io.md §8).
 */
export const LOAD_MODE_BLANK_GLYPH = 'b';
const BLANK_BCD = 0o00;

/**
 * The ID character an INQUIRY message carries, and its layout. console-and-physical.md §2's
 * print-out table: "Console inquiry | single | I | operator-typed message | 30" (S223-2648 Fig.5
 * p.9), which is io.md §8 step 3 — "the console prints `I`, a space, and unlocks the keyboard".
 * `printout.ts` already formats that row; this device does not invent a line format (plan §7.5).
 */
export const INQUIRY_MESSAGE_ID = 'I';

/**
 * The d-character of a console READ, io.md §8 Figure 44: RCP / RCPW are `M or L %T0 bbbbb R`.
 * `precheck` needs it to tell Figure 45's READ column from Figure 46's WRITE column — Condition
 * is "Cancel key during inquiry" on the read and "never" on the write, and step 4 of the nine
 * runs on both paths (io.md §5).
 */
export const INQUIRY_READ_D = 'R';

/**
 * What the operator typed, handed over whole.
 *
 * `text` is glyphs from the 1415's 64-character set (io.md §8 "Device"); `wordMarks[i]` is the
 * WORD MARK key pressed before position `i` ("the Word Mark key prints a word mark then
 * backspaces; the next key entered enters both the word mark and the character", io.md §8
 * step 4); `ending` is which of the two lever keys finished the line — INQUIRY RELEASE or
 * INQ CAN (console-and-physical.md §2's key map).
 *
 * OPEN: `INQUIRY_ENTRY_IS_PRE_SUPPLIED` — see the constant below. Declared here rather than in
 * `types.ts` because the console is its only producer and its only consumer (plan §5).
 */
export interface InquiryEntry {
  readonly text: string;
  readonly wordMarks: readonly boolean[];
  readonly ending: 'release' | 'cancel';
}

/**
 * OPEN: `INQUIRY_ENTRY_IS_PRE_SUPPLIED` — an emulator device, NOT a hardware claim. On the real
 * machine the program's `RCP` unlocks the keyboard and the CPU waits while the operator types
 * (io.md §8 steps 3-5); here the line is queued by `supply()` when RELEASE or CANCEL is pressed
 * and consumed when the read executes. What a program can observe is identical either way —
 * core, the six channel indicators and the console log all end in the same state, and the `I`
 * line is typed at read time, which is where it appears in the log — and only wall-clock
 * ordering differs, which this emulator does not model. What it buys is that `step()` stays
 * synchronous and promise-free (architecture.md §2; plan §5, §15).
 */
export const INQUIRY_ENTRY_IS_PRE_SUPPLIED = true;

/**
 * OPEN: `CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH` — `[unverified]`, and **io.md §8 contradicts
 * itself**, so this is a ruling rather than a reading.
 *
 * Reading A, io.md §8 "Inquiry sequence" steps 1-2: INQUIRY REQUEST "sets the inquiry status
 * latch in the 1411", and "the program tests it with `J iiiii Q` (BNQ)". ONE latch — set by the
 * key, tested by BNQ, cleared by Program Reset (A22-0526-3 p.52 lists "the console inquiry latch"
 * among what Program Reset resets).
 *
 * Reading B, io.md §8 "Console status": the latches that survive Computer Reset are glossed as
 * "the *remote* inquiry latches (the per-channel inquiry-request latches tested by
 * `J iiiii Q`)" — which makes BNQ test a latch the console key never sets and Program Reset
 * never clears. Both cannot hold on a machine with one console and no remote stations.
 *
 * **We take A** (Zarathustrum, 2026-08-30 — ruled, no primary-source re-read), because it is the only one
 * that gives a demonstrable inquiry path on this configuration, and because io.md §5 Figure 35
 * lists inquiry request as a per-CHANNEL condition — and channel 1 is where the console is. If B
 * turns out to be right, this machine needs a second latch and `J (I) Q` answers false forever.
 *
 * **That the completed READ clears the latch is our inference too** — io.md §8 names exactly two
 * clearing points, step 6's "Cancel before the request is recognized resets the latch" and
 * Program Reset / Computer Reset (A22-0526-3 pp.48-49, p.52), and no sentence in the section says
 * what a served request does. We clear on the read because the request/serve cycle does not work
 * otherwise: step 2's `J (I) Q` branches to the routine that executes the read, so a latch the
 * read left standing would send the program straight back to it forever. It is pinned by test,
 * on the device and through the real machine (`test/console-inquiry.test.ts`).
 *
 * Cited here, at `Channel.inquiryRequest` and at `machine.programReset` (both wave 4b).
 * docs/plans/phase-2-unit-record.md §7.4, §15; open-questions.md, Phase 2 section.
 */
export const CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH = true;

export class Console1415 implements Device {
  readonly x2 = CONSOLE_X2;
  /** io.md §1: the 1415 and the disks are the eight-bit devices; everything else is seven-bit. */
  readonly bits = 8 as const;

  /** Everything the printer has typed, oldest first. Read by `machine.snapshot()`. */
  readonly lines: ConsoleLine[] = [];

  /**
   * **The inquiry latch.** The INQUIRY REQUEST key lever sets it (io.md §8 step 1;
   * console-and-physical.md §2: it is the repurposed Carrier Return lever), `J (I) Q` tests it
   * through `Channel.inquiryRequest` and PROGRAM RESET drops it — both wave 4b.
   * `CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH` above is what says those are all the SAME latch.
   */
  pendingRequest = false;

  /** The line the operator typed, waiting for the program's read. `INQUIRY_ENTRY_IS_PRE_SUPPLIED`. */
  entry: InquiryEntry | undefined;

  // ── The operator's side of the dialogue ──────────────────────────────────

  /** INQUIRY REQUEST (io.md §8 step 1). Pressing it twice is pressing a latch that is already on. */
  requestInquiry(): void {
    this.pendingRequest = true;
  }

  /**
   * INQUIRY RELEASE or INQ CAN, with everything typed since the request — io.md §8 steps 4-6.
   * Queuing rather than typing into a blocked `step()` is `INQUIRY_ENTRY_IS_PRE_SUPPLIED`.
   * A second entry supplied before the program reads replaces the first: there is one keyboard
   * and one message buffer.
   */
  supply(entry: InquiryEntry): void {
    this.entry = entry;
  }

  /**
   * Step 4 of the nine (io.md §5). The console status tables (Figures 45-46, io.md §8) print
   * "never" for Not Ready on both read and write, and "never" for Busy on read; Busy on write is
   * only "carriage returning", which is device motion this emulator does not model (the whole
   * `I/O` term of `49.5 + I/O` is 0 in Phase 1 — cycles.ts). So nothing is set before a WRITE.
   *
   * The one row this device sets before a transfer is **Figure 45's Condition, "Cancel key during
   * inquiry"** (io.md §8 step 6): the operator typed characters and then pressed INQ CAN. It is
   * reported HERE rather than in `read()` for the reason the reader's end-of-file is
   * (`reader1402.ts` `precheck`): step 6 of the nine skips execution whenever any indicator is
   * on, so reporting it at step 4 is what makes "the message is not transferred" fall out of the
   * sequence instead of being special-cased. The instruction that reports it consumes the entry
   * and clears the latch — the cancelled message is gone and the request has been serviced.
   *
   * Gated on `INQUIRY_READ_D` because Figure 46 prints Condition as "never" for a console WRITE:
   * a program's `WCP` must not be handed the operator's cancelled inquiry. With no d-character at
   * all (a caller asking nothing more than "is the console ready?") there is no operation to judge
   * and the answer is the empty set.
   *
   * **This gate is a whitelist of one, and `R` is not the only d-character that reads** —
   * `channel.decodeD` reads on `$` too (the §9 C17 ruling). Rather than widen the whitelist and
   * risk the write column, `read()` below is authoritative: it refuses to hand over a cancelled
   * message however the read was asked for.
   */
  precheck(_x3?: string, d?: string): Partial<ChannelStatus> {
    if (d !== INQUIRY_READ_D) return {};
    const entry = this.entry;
    if (entry === undefined || entry.ending !== 'cancel' || entry.text.length === 0) return {};
    this.entry = undefined;
    this.pendingRequest = false;
    return { condition: true };
  }

  /**
   * WCP (`M %T0 bbbbb W`) and WCPW (`L %T0 bbbbb W`) — io.md §8 Figure 44. The channel has
   * already stopped at the terminating GM-WM and has NOT sent it: Figure 44 carries the same
   * note 3, "‡ is not printed with message", on both rows. In move mode the channel transfers no
   * word marks at all, so WCP's line shows none — which is exactly what "word marks not
   * indicated" means; in load mode the WM bits arrive intact and print as an inverted circumflex
   * over the character.
   */
  write(_x3: string, _d: string, data: Uint8Array, mode: IoMode): Partial<ChannelStatus> {
    const text: string[] = [];
    const wordMarks: boolean[] = [];
    const underline: boolean[] = [];
    let badParity = false;

    for (const cell of data) {
      const bcd = cell & BCD6;
      const wm = (cell & WM) !== 0;
      // The error-underscore feature: a character whose eight bits do not carry odd parity is
      // printed AND underlined, Data Check is set, and the reply continues — it does not stop
      // (io.md §8, A22-0526-3 pp.48-49; S223-2648 p.6).
      const bad = (cell & C) !== parity(bcd, wm);
      text.push(mode === 'load' && bcd === BLANK_BCD ? LOAD_MODE_BLANK_GLYPH : glyphOf(bcd));
      wordMarks.push(wm);
      underline.push(bad);
      badParity ||= bad;
    }

    this.lines.push({
      id: PROGRAM_MESSAGE_ID,
      text: text.join(''),
      wordMarks,
      underline,
      spacingBefore: PROGRAM_MESSAGE_SPACING,
      matrixPos: PROGRAM_MESSAGE_MATRIX,
    });
    return badParity ? { dataCheck: true } : {};
  }

  /**
   * **RCP / RCPW** (`M or L %T0 bbbbb R`) — io.md §8 Figure 44, the whole inquiry transfer.
   *
   * `null` is Figure 45's No Transfer row, "no message request, or Cancel before inquiry"
   * (A22-0526-3 pp.47-48). It carries the two cases the manual names — nothing typed at all, and
   * INQ CAN pressed before any character was entered — and, as the cancel branch below explains,
   * it is also what a cancelled message WITH characters gets when the read was not asked for with
   * `R`. The channel turns the `null` into the indicator.
   *
   * Otherwise the console types io.md §8 step 3's `I` line and hands the record over as cell
   * bytes — `parity(bcd, wm) | (wm ? WM : 0) | bcd`, the WORD MARK key's marks riding the record
   * itself, because this is the one eight-bit device (io.md §1) and its E-1 register HAS a
   * word-mark bit. **The marks are returned unconditionally and the CHANNEL gates them**, which
   * is Figure 44's RCP/RCPW pair exactly: `channel.read()` does
   * `setChar(a, byte & BCD6, storage.wm(a))` in move mode ("word marks in storage are
   * undisturbed") and `writeWhole` with `device.bits === 8 && (byte & WM)` in load mode ("word
   * marks in storage are erased and entered"). io.md §8 step 4's "load-mode read only" is that
   * line of the channel and not a test here (plan §6, §7.4).
   *
   * The three wrong-length sentences of step 5 are the channel's too, and they fall out of the
   * pre-placed GM-WM rather than out of any count kept here: RELEASE at the correct count leaves
   * core[BAR] holding the GM-WM, so the extra E-cycle blocks WLR; an early RELEASE leaves
   * something else there and WLR sets; excess characters run into the GM-WM, whose store gate
   * ends the transfer, and WLR sets.
   *
   * **The read that services the request is what clears the latch.** It consumes the entry in the
   * same statement, and the two belong together: the operator's message has been delivered, so
   * there is nothing left for `J (I) Q` to find. A second read with no new INQUIRY REQUEST is
   * back to Figure 45's "no message request" — No Transfer.
   */
  read(_x3?: string, _d?: string): Uint8Array | null {
    const entry = this.entry;
    // "No message request" — nothing has been typed and released.
    if (entry === undefined) return null;
    if (entry.ending === 'cancel') {
      // **EVERY cancel ends here, whatever was typed.** The device refuses to deliver a cancelled
      // message itself rather than trusting `precheck` to have taken it away first, because
      // `precheck` cannot see every read: it is gated on `INQUIRY_READ_D` so that Figure 46's
      // write column stays "never", and `channel.decodeD` also reads on `$` (the §9 C17 ruling),
      // which walks past that gate. Two cases reach this branch, and both are No Transfer:
      //   · zero characters — Figure 45's "Cancel before inquiry", io.md §8 step 6, "Cancel
      //     before any character is entered sets No Transfer";
      //   · characters, on a read whose d-character is not `R` — Figure 45's Condition row is
      //     served at step 4 for the `R` the manual describes, and `$` on a console read is our
      //     own extension, which the manual does not describe at all. The message is not
      //     transferred either way, which is the part io.md §8 step 6 actually rules on.
      // Step 6's "Cancel before the request is recognized resets the latch" is why the request
      // goes with it.
      this.entry = undefined;
      this.pendingRequest = false;
      return null;
    }
    // Reaching this point means RELEASE — every cancel was consumed above.

    const glyphs = [...entry.text];
    const wordMarks = glyphs.map((_, i) => entry.wordMarks[i] ?? false);
    const record = new Uint8Array(glyphs.length);
    glyphs.forEach((glyph, i) => {
      // A glyph outside the 64-character set cannot be typed on a Selectric with 64 characters
      // (io.md §8 "Device"), so Figure 45's Data Check row — "input character validity error" —
      // is unreachable from any entry this emulator can construct, exactly as the reader's
      // validity light is unreachable from any card it can accept (reader1402.ts). The blank is
      // a display fallback for an impossible input, never an observed value.
      const bcd = bcdOfGlyph(glyph) ?? BLANK_BCD;
      const wm = wordMarks[i] === true;
      record[i] = (wm ? WM : 0) | parity(bcd, wm) | bcd;
    });

    // io.md §8 step 3: "The console prints `I`, a space, and unlocks the keyboard." The line is
    // typed as the read executes, which is where it belongs in the log — the operator's
    // characters are already known (`INQUIRY_ENTRY_IS_PRE_SUPPLIED`) but the machine has not
    // said anything until now. `printout.ts` owns the format; Phase 2 adds none (plan §7.5).
    this.lines.push(formatPrintout(INQUIRY_MESSAGE_ID, { text: entry.text, wordMarks }));

    this.entry = undefined;
    this.pendingRequest = false;
    return record;
  }

  /** Empties the typed log. The inquiry latch and a queued entry are machine state, not paper. */
  clear(): void {
    this.lines.length = 0;
  }
}
