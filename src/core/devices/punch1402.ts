// src/core/devices/punch1402.ts — the IBM 1402 Card Read-Punch, PUNCH feed, as a channel-1
// device at x2 = `4`.
// Source: research/io.md §6 ("Punch a Card", Figure 63; A22-0526-3 pp.59-60, 63), §3 (the output
// side of the move/load rules, A22-0526-3 p.41; 223-2692 p.8 Figure 5), §2 (Figure 107);
// docs/plans/phase-2-unit-record.md §7.2, §15.
//
// The punch is the smallest device in the phase because the CHANNEL has already done the work:
// `translateForOutput` gathered the core field up to the terminating GM-WM and, in load mode,
// put a 0-5-8 word separator ahead of every word-marked character and doubled every core
// separator (io.md §3, A22-0526-3 pp.40-41). So the record that arrives here is the card image
// already — the punch's whole job is to strip the check bit, drop the 80 codes into a fresh card
// and stack it. Rendering the separator as holes is `formats/card.ts`'s business, and the punch
// bijection is the same one the reader's cards come through (charset.md §2.1).
//
// `Card` is built here rather than by `formats/card.ts`'s `makeCard` because src/core imports
// nothing outside src/core (test/core-is-dom-free.test.ts). The invariant `makeCard` enforces —
// exactly CARD_COLUMNS six-bit codes — holds by construction below: a fixed-length
// `Uint8Array(CARD_COLUMNS)` written only with `byte & BCD6`.

import {
  BCD6, CARD_COLUMNS,
  type Card, type ChannelStatus, type Device, type IoMode,
} from '../types.js';

/** io.md §2 Figure 107: x2 = `4` is the 1402 punch feed. */
export const PUNCH_X2 = '4';

/**
 * The three punch pockets, io.md §6 "Mechanics": "the punch [can direct] to 0 (NP), 4 or 8/2".
 * Figure 107's x3 column for the punch is `0,4,8` — note the GLYPHS are not the pocket names:
 * x3 = `8` selects the pocket the manual calls 8/2, which is the one pocket the read feed and
 * the punch feed share (console-and-physical.md §7; MachineState's `reader`/`punch` blocks each
 * count what THEY stacked).
 */
export type PunchStacker = '0' | '4' | '8-2';
const POCKET_OF_X3: Readonly<Record<string, PunchStacker>> = { '0': '0', '4': '4', '8': '8-2' };

/**
 * OPEN: `UNKNOWN_X3_IS_NOT_READY` — the same ruling `devices/reader1402.ts` carries, for the same
 * reason: io.md §2 and §5 state no validity check for the x3 sub-operation character, and Figure
 * 107's x3 column is keyed on x2, so a glyph outside `0 4 8` names no sub-operation the punch
 * has. Not Ready, following io.md §9 Figure 99's "no such unit" — a *selectable* device with an
 * unselectable sub-unit is a readiness question, not a decode question. The alternative is the
 * `InstructionCheck` `channel.ts` takes for an unknown x1/x2 glyph, rejected for that reason.
 * **`9` is the interesting case**: it is a legal x3 on the READ feed (transfer with no stack and
 * no feed, io.md §6 step 3) and names nothing at all on the punch feed.
 * docs/plans/phase-2-unit-record.md §15; open-questions.md, Phase 2 section.
 */
export const UNKNOWN_X3_IS_NOT_READY = true;

/**
 * OPEN: `OVERLONG_RECORD_SETS_WLR` — `[likely]`. io.md §6 Figure 63 lists WLR for the punch as
 * "wrong length record; card not punched", and io.md §7 Figure 89 says the same of the printer's
 * line, but NEITHER states what causes WLR on an OUTPUT operation: on output the core field's own
 * GM-WM defines the record, so the two ends have no length to disagree about — except at the
 * hardware's own limit, which for the 1402 is the 1414 Model 3's 80-position punch buffer
 * (io.md §1). We take a record of more than CARD_COLUMNS characters as that disagreement: WLR on,
 * and the card is NOT punched, which is Figure 63's own consequence clause. The alternative is to
 * truncate at column 80 and punch what fits, which would put 81 characters' worth of program
 * intent into a card with no indication that anything was lost.
 * docs/plans/phase-2-unit-record.md §7.2, §15.
 */
export const OVERLONG_RECORD_SETS_WLR = true;

/**
 * OPEN: `BUFFER_CLEARED_BEFORE_TRANSFER` — `[unverified]`. No source says what the punch buffer
 * holds in the columns a short record does not reach. We punch BLANKS: a fresh `Uint8Array`,
 * whose zero fill IS the blank code (charset.md §2 — BCD 0o00 is the blank, and it is a different
 * code from the substitute blank 0o20). The alternative, stale buffer contents from the previous
 * card punching through, is unattested, makes output nondeterministic and could not be relied on
 * by any program.
 * docs/plans/phase-2-unit-record.md §7.2, §15.
 */
export const BUFFER_CLEARED_BEFORE_TRANSFER = true;

/**
 * PUNCH DATA CHECK AND CONDITION ARE NOT IMPLEMENTED, AND THAT IS A REFUSAL, NOT AN OVERSIGHT.
 * io.md §6 Figure 63 sets Data Check when "1414 detects parity error; card not punched" and
 * Condition on a "parity error during punching or hole-count check; error card goes to pocket 0".
 * Both are parity/mechanical paths with no expressible cause here: the cells arrive from core
 * through `translateForOutput`, which regenerates the check bit for every synthesised separator
 * and flips it for every dropped word mark (channel.ts), and there is no punch-check brush and no
 * 1414 parity line in this emulator. Busy — "previous card still being punched" — is unreachable
 * for the same reason it is on every other device here: the whole `I/O` term of `49.5 + I/O` is 0
 * (cycles.ts), so no program can observe a punch cycle. Not Ready's causes (card jam, out of
 * cards, stacker full, chip basket full, cover open) are all physical states this device does not
 * model; the ONE Not Ready it can report is `UNKNOWN_X3_IS_NOT_READY` above. Every row is
 * asserted as a table row in `oracle/io-status.json` (test/punch1402.test.ts).
 * docs/plans/phase-2-unit-record.md §7.2.
 */

export class Punch1402 implements Device {
  readonly x2 = PUNCH_X2;
  /** io.md §1: everything but the 1415 and the disks is seven-bit — no word-mark bit on the line. */
  readonly bits = 7 as const;

  /**
   * The punched cards, per pocket, oldest first. The 1402 stacks CARDS, and this is the one
   * device in the phase whose output a person can pick up and put back in the reader — which is
   * exactly what test/punch1402.test.ts's identity loop does — so the cards themselves are kept
   * rather than only counted. `stackers` below is the count view `machine.snapshot()` reads
   * (wave 4b), so there is one source of truth and no drift.
   */
  readonly pockets: { readonly '0': Card[]; readonly '4': Card[]; readonly '8-2': Card[] } = {
    '0': [], '4': [], '8-2': [],
  };

  /** Counts, not cards — the shape `MachineState.punch.stackers` carries (plan §5). */
  get stackers(): Record<PunchStacker, number> {
    return { '0': this.pockets['0'].length, '4': this.pockets['4'].length, '8-2': this.pockets['8-2'].length };
  }

  /**
   * Step 4 of the nine (io.md §5), against Figure 63. Nothing is set before a transfer in this
   * configuration — see the refusal comment above for every row and why it is unreachable — with
   * the single exception of an x3 that names no pocket (`UNKNOWN_X3_IS_NOT_READY`).
   */
  precheck(x3: string, _d: string): Partial<ChannelStatus> {
    return POCKET_OF_X3[x3] === undefined ? { notReady: true } : {};
  }

  /**
   * **Punch a Card**, `M or L %4x bbbbb W` — io.md §6 (A22-0526-3 p.63), x3 = 0/4/8 = pocket
   * NP/4/8-2. "Transfers 80 characters core -> punch buffer until GMWM, then punches."
   *
   * `mode` is not read, and that is the point of the seam rather than an omission: the record
   * arrives ALREADY TRANSLATED. In load mode the channel has put the 0-5-8 separators into the
   * data (io.md §3 p.41: "a core word mark becomes a word separator *preceding* the character,
   * and a core word separator becomes two"), so "load mode punches a word separator ahead of each
   * word-marked character" needs no code here — the separator is just another column. In move
   * mode the word marks never left core at all. The channel does the mode work; the device does
   * the rendering (architecture.md §4.10).
   */
  write(x3: string, _d: string, data: Uint8Array, _mode: IoMode): Partial<ChannelStatus> {
    const pocket = POCKET_OF_X3[x3];
    // Unreachable through `precheck`, which has already answered Not Ready for this x3; kept
    // because `write` is a public method and the pocket lookup has to be total either way.
    if (pocket === undefined) return { notReady: true };

    if (OVERLONG_RECORD_SETS_WLR && data.length > CARD_COLUMNS) {
      // Figure 63: "wrong length record; card not punched" — and WLR is NOT No Transfer here,
      // which Figure 63 prints as "never" for this device. The instruction transferred; the card
      // is what did not happen.
      return { wrongLengthRecord: true };
    }

    // BUFFER_CLEARED_BEFORE_TRANSFER: the zero fill is the blank code, so columns past the record
    // are blank without being written.
    const card = new Uint8Array(CARD_COLUMNS);
    // A card carries no word mark and no check bit (charset.md §7: "word marks exist only in
    // core — they are not on cards or tape"), so the six-bit code is all that survives the
    // punch. `translateForOutput` has already masked bit 7 for this seven-bit device; masking
    // again with BCD6 is what makes the `Card` invariant hold here rather than upstream.
    for (let i = 0; i < data.length; i++) card[i] = (data[i] ?? 0) & BCD6;

    this.pockets[pocket].push(card);
    return {};
  }
}
