// src/core/devices/reader1402.ts — the IBM 1402 Card Read-Punch, read feed, as a channel-1
// device at x2 = `1`.
// Source: research/io.md §6 (A22-0526-3 pp.59-64, Figures 61, 62), §5 (Figure 40, Figure 36),
// §3 (223-2692 pp.8, 11, 42, 58-59); research/software.md §10.4, §10.6;
// docs/plans/phase-2-unit-record.md §6.1, §7.1, §15.
//
// The device holds CARDS and produces VALUES: it hands the channel the 80 columns of the 1414
// Model 3 read buffer as bare BCD line characters and never touches core. How many of those 80
// reach storage is the CHANNEL's business — software.md §10.4 is blunt about it, "80 is the
// buffer size, not an unconditional store count" — and move-vs-load translation is the channel's
// too (docs/plans/architecture.md §4.10).
//
// TWO KEYS, NOT INSTRUCTIONS. READER START and END OF FILE are things an operator presses
// (io.md §6 steps 1 and "End-of-file and last card"); `machine.ts` exposes them as
// `readerStart()` / `readerEndOfFile()` and the UI wires them to buttons.

import { parity } from '../bcd.js';
import {
  CARD_COLUMNS,
  type Card, type ChannelStatus, type Device,
} from '../types.js';

/** io.md §2 Figure 107: x2 = `1` is the 1402 read feed. */
export const READER_X2 = '1';

/**
 * The three read-feed pockets, io.md §6 "Mechanics": "the reader can direct to 0 (NR), 1 or
 * 8/2". x3 selects one (Figure 107); `9` selects none.
 */
export type ReadStacker = '0' | '1' | '8-2';
const POCKET_OF_X3: Readonly<Record<string, ReadStacker>> = { '0': '0', '1': '1', '2': '8-2' };

/** x3 = `9`: transfer the buffer with no stacker select and no feed (io.md §6 step 3). */
const NO_FEED_X3 = '9';

/** `K d`, d = 0/1/2 — Select Stacker and Feed (io.md §6 step 3, A22-0526-3 pp.62-63). */
export const SELECT_STACKER_OP = 'K';

/**
 * OPEN: `UNKNOWN_X3_IS_NOT_READY` — io.md §2 and §5 state no validity check for the x3
 * sub-operation character, and Figure 107's x3 column is keyed on x2, so a glyph outside
 * `0 1 2 9` on the reader names no sub-operation the device has. We answer Not Ready, following
 * io.md §9 Figure 99's "no such unit" reading — a *selectable* device with an unselectable
 * sub-unit is a readiness question, not a decode question. The alternative is the
 * `InstructionCheck` `channel.ts` takes for an unknown x1/x2 glyph, and it is rejected for that
 * reason. Same rule for `K`'s d-character, which is the same pocket selector in short form.
 * docs/plans/phase-2-unit-record.md §15; open-questions.md, Phase 2 section.
 */
export const UNKNOWN_X3_IS_NOT_READY = true;

/**
 * OPEN: `EOF_KEY_REQUIRED_AT_THREE_CARDS` — io.md §6 `[verified]`: "with 3 cards remaining, a
 * read issued before the EOF key is pressed sets the Not Ready indicator — press EOF then Start
 * to let the last three through" (A22-0526-3 pp.61, 63). What it does not say is whether the
 * card already sitting in the read buffer counts toward the three. We COUNT IT — remaining =
 * buffered + hopper — which is the reading that matches the transport: the three cards the
 * READER START key feeds are one at the read station and two behind it. The alternative is the
 * hopper alone, observable only on a 3- or 4-card deck; the wave-2 test pins the choice.
 * docs/plans/phase-2-unit-record.md §15.
 */
export const EOF_KEY_REQUIRED_AT_THREE_CARDS = true;

/**
 * OPEN: `READER_TRANSPORT_MODELS_ONE_CARD` — a simplification, not a hardware claim. The real
 * READER START "feeds three cards and fills the read buffer with the first card's image"
 * (io.md §6 step 1, A22-0526-3 pp.41-42, 60). We model the 80-position buffer, which is all the
 * CPU can observe, and enforce the three-cards-remaining Not Ready rule directly rather than
 * simulating two cards in transit that no instruction can see.
 * docs/plans/phase-2-unit-record.md §15.
 */
export const READER_TRANSPORT_MODELS_ONE_CARD = true;

/** io.md §6: the three-cards-remaining rule's boundary. */
const EOF_THRESHOLD_CARDS = 3;

/**
 * READER DATA CHECK AND VALIDITY ARE NOT IMPLEMENTED, AND THAT IS A REFUSAL, NOT AN OVERSIGHT.
 * io.md §6 "Errors" `[verified]`: a Reader Check transfers the data *and* sets Data Check; a
 * validity error transfers the invalid character unchanged. Neither is producible by any input
 * this emulator accepts — a `Card` is 80 six-bit codes by construction (types.ts §6,
 * formats/card.ts) and there is no hole-count brush, no 1414 parity line and no card-jam model —
 * and `precheck` cannot express "set Data Check and still transfer" anyway, because step 6 of the
 * nine skips the transfer whenever any indicator is on (io.md §5). Both rows are asserted as
 * table rows in `oracle/io-status.json`; the gap is recorded in `PHASE-2-NOTES.md` §2.
 * docs/plans/phase-2-unit-record.md §7.1 "Errors, stated not faked", §15.
 */

export class Reader1402 implements Device {
  readonly x2 = READER_X2;
  /** io.md §1: everything but the 1415 and the disks is seven-bit — no word-mark bit on the line. */
  readonly bits = 7 as const;

  /** The file feed. `loadDeck` fills it; a feed cycle takes from the front. */
  readonly hopper: Card[] = [];

  /** The 1414 Model 3's 80-position card-read buffer (io.md §1 "1414 models"). */
  buffer: Card | null = null;

  /** Counts, not cards — `machine.snapshot()` carries these and the session maps them back. */
  readonly stackers: Record<ReadStacker, number> = { '0': 0, '1': 0, '8-2': 0 };

  /** The READER START key has been pressed and the transport is ready (io.md §6 step 1). */
  started = false;

  /** An x3 = `9` read has handed the buffer over and no SSF has stacked it yet (Figure 62). */
  transferred = false;

  /** The END OF FILE key has been pressed (io.md §6 "End-of-file and last card"). */
  eofKey = false;

  /** "The EOF latch turns on following the data transfer of the last card" (io.md §6). */
  eofLatch = false;

  // ── The two operator keys ────────────────────────────────────────────────

  /**
   * READER START. "Feeds three cards and fills the read buffer with the first card's image"
   * (io.md §6 step 1) — see `READER_TRANSPORT_MODELS_ONE_CARD`: we fill the buffer and leave the
   * rest of the file in the hopper. Pressing it again on a reader that already has a buffered
   * card is harmless and feeds nothing.
   */
  readerStart(): void {
    this.started = true;
    if (this.buffer === null) this.buffer = this.hopper.shift() ?? null;
  }

  /**
   * END OF FILE. "The End-of-File key signals the last-card condition" (io.md §6) — it does not
   * itself turn the EOF latch on; the latch turns on when the feed that empties the transport
   * happens, which is `stackAndFeed` below.
   */
  endOfFile(): void {
    this.eofKey = true;
  }

  /**
   * Put a deck in the hopper, replacing whatever was there. Does NOT press READER START.
   *
   * IT ALSO RESETS THE END-OF-FILE CONDITION, key and latch both. io.md §6 "End-of-file and last
   * card" `[verified]` (A22-0526-3 pp.61, 63): "The Stop key, or processing the last card, resets
   * the EOF condition." A new file in the hopper is the far side of "processing the last card" —
   * the previous file is done — so an EOF pressed for the OLD deck must not carry into the new
   * one. Without this the three-cards-remaining Not Ready rule can never re-arm: a second PUT DECK
   * IN HOPPER after an end-of-file would read its last three cards without the operator ever
   * pressing END OF FILE again. Pinned in `test/reader1402.test.ts`.
   */
  loadDeck(cards: readonly Card[]): void {
    this.hopper.length = 0;
    this.hopper.push(...cards);
    this.eofKey = false;
    this.eofLatch = false;
  }

  /** buffered + hopper — the `EOF_KEY_REQUIRED_AT_THREE_CARDS` reading. */
  get cardsRemaining(): number {
    return (this.buffer === null ? 0 : 1) + this.hopper.length;
  }

  // ── Step 4 of the nine: can the device execute? ──────────────────────────

  /**
   * io.md §6 Figure 62 as a table, READ PATH ONLY. `control('K', d)` does NOT come through here
   * and that is load-bearing, not an optimisation: Figure 62 prints "(never for select-stacker)"
   * on both the Data Check and the Condition rows, so routing `K` through `precheck` would report
   * Condition and clear the EOF latch, stealing the end-of-file report the next card-read
   * instruction owes the program (io.md §6, A22-0526-3 pp.61, 63; plan §6.1).
   *
   * The rows, in §7.1's order:
   *   · not started, or nothing buffered and nothing left        -> Not Ready
   *   · <= 3 cards remaining and the EOF key not pressed,
   *     on a FEEDING read (x3 0/1/2)                             -> Not Ready
   *   · the EOF latch is on   -> Condition ON, latch OFF, and step 6 of the nine then makes the
   *                              read the documented NO OP ("the next card-read instruction is a
   *                              NO OP", io.md §6)
   *   · x3 = 9 with the image already transferred and no
   *     intervening Select Stacker and Feed                      -> No Transfer
   *   · x3 outside 0 1 2 9                                       -> Not Ready
   *
   * Busy is never set: the whole `I/O` term of `49.5 + I/O` is 0 in this emulator (cycles.ts), so
   * no program here can observe a buffer being filled or a card being stacked (io.md §6 Busy row).
   *
   * The rows are tested in the order §7.1 prints them, which means an unrecognised x3 arriving
   * while the EOF latch is on would report Condition and consume the latch rather than report Not
   * Ready. No program reaches that corner — it needs an invalid sub-operation and a pending
   * end-of-file in the same instruction — and reordering would put the emulator's convenience
   * ahead of the table.
   */
  precheck(x3: string, _d: string): Partial<ChannelStatus> {
    // A reader nobody has started is not running at all (io.md §6 step 1).
    if (!this.started) return { notReady: true };
    if (this.eofLatch) {
      // §7.1 prints this row THIRD; it has to run SECOND, and Figure 62 is what says so. Its Not
      // Ready row reads "reader out of cards (**not** EOF)" — an empty transport is Not Ready
      // only when end-of-file is NOT what emptied it, and the EOF latch is exactly that
      // distinction. Tested in §7.1's printed order the out-of-cards row would swallow every
      // end-of-file report, because the latch can only be on once the transport is empty.
      //
      // "On the read that reports it, the EOF latch is turned OFF as the Condition indicator is
      // turned ON" (io.md §6, A22-0526-3 pp.61, 63). Reporting it here rather than in `read()` is
      // what makes "the next card-read instruction is a NO OP" fall out of step 6 of the nine
      // instead of being special-cased (plan §14 R5).
      this.eofLatch = false;
      return { condition: true };
    }
    // Figure 62's Not Ready row: "reader out of cards (NOT EOF)" — the EOF case left above.
    if (this.buffer === null && this.hopper.length === 0) return { notReady: true };
    const feeding = POCKET_OF_X3[x3] !== undefined;
    if (feeding && this.cardsRemaining <= EOF_THRESHOLD_CARDS && !this.eofKey) {
      // "With 3 cards remaining, a read issued before the EOF key is pressed sets the Not Ready
      // indicator — press EOF then Start to let the last three through" (io.md §6).
      return { notReady: true };
    }
    if (x3 === NO_FEED_X3 && this.transferred) {
      // Figure 62's No Transfer row: "image already transferred: ... two x3=9 reads with no
      // intervening SSF".
      return { noTransfer: true };
    }
    if (!feeding && x3 !== NO_FEED_X3) return { notReady: true };   // UNKNOWN_X3_IS_NOT_READY
    return {};
  }

  // ── Step 7: the transfer, and the card motion that follows it ────────────

  /**
   * All 80 buffer columns as seven-bit line characters — `parity(bcd, false) | bcd`. A card
   * carries no word mark and no check bit (charset.md §7) and a seven-bit device has nowhere to
   * put a WM bit (io.md §1), so the C bit is generated here over the BCD alone.
   *
   * Then the post-transfer motion, io.md §6 step 2: x3 = 0/1/2 "stacks that card in the selected
   * pocket" and "reads the next card into the buffer"; x3 = 9 does neither and "the buffer keeps
   * the image" (step 3).
   */
  read(x3: string, _d: string): Uint8Array | null {
    const card = this.buffer;
    if (card === null) return null;      // unreachable through `precheck`; Figure 36 No Transfer

    const out = new Uint8Array(CARD_COLUMNS);
    for (let i = 0; i < CARD_COLUMNS; i++) {
      const bcd = card[i] ?? 0;
      out[i] = parity(bcd, false) | bcd;
    }

    const pocket = POCKET_OF_X3[x3];
    if (pocket === undefined) {
      this.transferred = true;           // x3 = 9: no stacker select, no feed
    } else {
      this.stackAndFeed(pocket);
    }
    return out;
  }

  /**
   * `K d` Select Stacker and Feed, d = 0/1/2 — io.md §6 step 3 (A22-0526-3 pp.62-63). Reached
   * through `Channel.control`, which runs all nine steps but does NOT call `precheck` (plan §6.1).
   *
   * NEVER Data Check and NEVER Condition: Figure 62 prints "(never for select-stacker)" on both
   * rows, so a `K` issued with the EOF latch on reports NO CONDITION and LEAVES THE LATCH ALONE —
   * the following card read is still owed its end-of-file report. The two indicators this path can
   * set are Not Ready and No Transfer, and No Transfer is Figure 62's own row for it: "two
   * select-stacker-and-feeds with no intervening x3=9 read".
   *
   * There is no out-of-cards test here beyond `started`, and it would be dead code if there were:
   * an x3 = 9 read neither stacks nor feeds, so `transferred` can only be true while a card is
   * still sitting in the buffer, and an empty buffer therefore always fails the No Transfer test
   * first.
   *
   * The negative control the manual states and the test asserts: "Select Stacker and Feed leaves
   * BAR = Bp (unchanged) and 'Word marks are not affected'" (io.md §6 item 5, A22-0526-3 p.62).
   * That is `table.ts`'s `regs: NSI_AP_BP` on the `K` row and this instruction touching no
   * storage — arranged by the table, asserted by the test, not coded here.
   */
  control(op: string, d: string): Partial<ChannelStatus> {
    if (op !== SELECT_STACKER_OP) return { notReady: true };
    // The d-character IS the pocket selector, so an undefined one gets the same answer an
    // undefined x3 gets — `UNKNOWN_X3_IS_NOT_READY` above.
    const pocket = POCKET_OF_X3[d];
    if (pocket === undefined) return { notReady: true };
    if (!this.started) return { notReady: true };
    if (!this.transferred) return { noTransfer: true };

    this.stackAndFeed(pocket);
    this.transferred = false;
    return {};
  }

  /**
   * Stack the buffered card and feed the next one. "If the feed leaves nothing buffered the EOF
   * latch turns on following the data transfer of the last card" (io.md §6) — and only if the
   * operator pressed END OF FILE, because without that key the reader running dry is Figure 62's
   * "reader out of cards (NOT EOF)", a Not Ready on the next read instead.
   */
  private stackAndFeed(pocket: ReadStacker): void {
    if (this.buffer === null) return;
    this.stackers[pocket]++;
    this.buffer = this.hopper.shift() ?? null;
    if (this.buffer === null) this.eofLatch = this.eofKey;
  }
}
