// src/asm/pack.ts — `EmittedItem[]` -> condensed cards, on a 60-COLUMN budget
// (docs/plans/phase-3-autocoder.md §8.3; wave 2).
//
// `src/formats/objectdeck.ts` is emitted into EXACTLY AS SHIPPED: `ObjectRecord` is imported and
// never redefined, extended or forked (architecture.md §2 B4), and `encodeObjectRecord` enforces
// the budget by THROWING, so the packer must never hand it a record it would reject.
//
// THE BUDGET IS COLUMNS, NOT CHARACTERS, and that is where a naive packer is wrong. From
// software.md §8.1's verbatim NOTE and the shipped encoder's own payload loop:
//   · an ordinary cell            -> 1 column;
//   · a WORD-MARKED cell          -> 2 columns (a 0-5-8 word separator, then the character);
//   · a cell that IS a separator  -> 2 columns (the doubled pair), counts 1 toward the count
//     field (`WS_PAIR_COUNTS_AS_ONE`), and may not be marked (`ObjectDeckError`).
// `PAYLOAD_FIELD_COLUMNS` = 60 is the binding bound; `payload.length`, the count in columns
// 11-12, is a second and never-binding one. A FULLY MARKED PAYLOAD HOLDS THIRTY CHARACTERS.
//
// The separator and its character are pushed in the SAME step, so the packer can never leave a
// separator in column 72 with its character in 73: `TRAILING_SEPARATOR_IS_A_DECK_ERROR`
// (objectdeck.ts) is avoided BY CONSTRUCTION, not by a check.
//
// TWO READINGS OF §8.3'S SKETCH, settled here because they cannot both hold. The sketch says
// "for each (addr, cell) in ADDRESS order"; the items are walked in EMISSION order, and the cells
// of each item in ascending address within it. §11.1's backwards-ORG program is what settles it:
// its whole point is that the LAST card loads at the LOWEST address, so that its terminating
// GM-WM lands inside an earlier record — a globally address-sorted deck would reorder the cards,
// the earlier record would be loaded last, and neither the warning nor the one-byte clobber could
// happen. "ADDRESS order" is therefore the order WITHIN a run, and an ORG jump is precisely one
// of the three ways the sketch's own second branch closes a record.

import { WORD_SEPARATOR } from '../core/channel.js';
import { BCD6, WM, type Addr } from '../core/types.js';
import { PAYLOAD_FIELD_COLUMNS, type ObjectRecord } from '../formats/objectdeck.js';
import type { EmittedItem } from './types.js';

// ═══ The `// OPEN:` ledger for this file — plan §15 ═════════════════════════════════════════

/**
 * OPEN: `CONSTANT_MAY_SPAN_CONDENSED_CARDS` — `[unverified]`. A constant longer than one card's
 * payload SPLITS across cards: the budget break below does not care whether the cells it is
 * cutting belong to one constant or to twenty instructions, and a separator and its character
 * never split, by construction.
 *
 * THIS REVERSES A RECORDED RESEARCH DEFAULT, and says so. `open-questions.md`'s own assembler row
 * ("Whether a DCW/DC constant longer than one card's data field is split across condensed cards,
 * and how the word separator is handled at the split") proposes the OPPOSITE fallback — "cap
 * constants at one card's payload (cols 13-72) and emit an assembler diagnostic if exceeded".
 * Phase 3 declines it because the closed loop PROVES the split byte for byte through the real
 * loader and the real 1402 (§11.1), and because the capped version would refuse a legal program.
 * Fallback: that row's cap plus an `F`. `open-questions.md`, Phase 3 / Wave 2.
 */
export const CONSTANT_MAY_SPAN_CONDENSED_CARDS = true;

// ═══ What pack needs beside the items ══════════════════════════════════════════════════════

/**
 * A DS or DA extent: storage the program RESERVED and the deck never covers. Pass 1
 * (`symbols.ts`, wave 4) builds the list; wave 2's tests build it by hand beside the items.
 *
 * It is `pack()`'s second argument for one reason (§8.3): a GM-WM tail landing in reserved but
 * unemitted storage is invisible to any rule that only asks "does another record cover this
 * address?" — no record does — and that is the DEMO'S OWN CASE, not an exotic one.
 */
export interface ReservedExtent {
  readonly from: Addr;
  /** Inclusive. A DS 80 at 00564 is 00564-00643. */
  readonly to: Addr;
  /** The label, for the warning text: "…lands at 00564, inside LINE". `''` when unlabelled. */
  readonly label: string;
}

export interface PackResult {
  readonly records: readonly ObjectRecord[];
  /** Statement seqno -> the 1-based object-card number it rode in on — the listing's CARD column
   *  (C28-0326-2 p.11), back-filled by `listing.ts`. An item split across cards rides on more
   *  than one; the FIRST is recorded, which is the card the item begins on. */
  readonly cardOf: ReadonlyMap<number, number>;
  /** Deck-level facts that are NOT one of F/U/M/O, because that flag set is closed and published
   *  (software.md §6). §8.3's GM-WM tail is the one this file raises. */
  readonly warnings: readonly string[];
}

/** Columns 73-75. RESEQ resets the sequence to 001; that reset is the caller's (§8.3). */
const sequenceOf = (card: number): string => String(card).padStart(3, '0');

/** Addresses are printed the way the machine punches them: five digits, leading zeros. */
const five = (at: Addr): string => String(at).padStart(5, '0');

/**
 * What one cell costs in the load field, and the ONE place the three costs live.
 * `WS_PAIR_COUNTS_AS_ONE`: a stored separator is two columns and one character.
 */
export function columnCost(cell: number): number {
  if ((cell & BCD6) === WORD_SEPARATOR) return 2;
  return (cell & WM) !== 0 ? 2 : 1;
}

/**
 * Cut the emission into condensed cards. A record breaks in EXACTLY THREE WAYS: a non-contiguous
 * address (a DS gap, an ORG jump, a pool origin), the 60-column budget, or the end of emission.
 * Nothing else.
 */
export function pack(
  items: readonly EmittedItem[],
  reserved: readonly ReservedExtent[],
): PackResult {
  const records: ObjectRecord[] = [];
  const cardOf = new Map<number, number>();

  let payload: number[] = [];
  let loadAddress = 0;
  let columns = 0;
  let previous = 0;

  const close = (): void => {
    if (payload.length === 0) return;
    records.push({
      loadAddress,
      payload: Uint8Array.from(payload),
      sequence: sequenceOf(records.length + 1),
    });
    payload = [];
    columns = 0;
  };

  for (const item of items) {
    for (const [i, cell] of item.cells.entries()) {
      const at = item.at + i;
      const cost = columnCost(cell);
      if (payload.length === 0) {
        loadAddress = at;
      } else if (at !== previous + 1 || columns + cost > PAYLOAD_FIELD_COLUMNS) {
        close();
        loadAddress = at;
      }
      payload.push(cell);
      columns += cost;
      previous = at;
      // The card this item begins on — set after any break above, so it names the OPEN record.
      if (!cardOf.has(item.seqno)) cardOf.set(item.seqno, records.length + 1);
    }
  }
  close();

  return { records, cardOf, warnings: tailWarnings(records, reserved) };
}

// ═══ The GM-WM tail — the hazard the packer is the only place to catch (§8.3) ═══════════════
//
// `CONDENSED_LOADER_PROGRAM`'s `D 00100 00?!0 Δ` at 00330 terminates on the A-field
// group-mark-with-word-mark and "the position holding the terminating character is moved/replaced
// like every other position" (opcodes.md §3.1, A22-0526-3 pp.25-26 `[verified]`, quoted in
// loader.ts's own NOTE) — so EVERY loaded record leaves a GM-WM at `loadAddress + count`. In an
// ascending contiguous deck each is overwritten by the next and the last marks the end of the
// program, which is where a 1410 program wants one. Two ways that goes wrong, and both are here.

/** The addresses a record's payload occupies. */
const covers = (record: ObjectRecord, at: Addr): boolean =>
  at >= record.loadAddress && at < record.loadAddress + record.payload.length;

/** Where record `i`'s terminating group-mark-with-word-mark lands. */
export const tailOf = (record: ObjectRecord): Addr => record.loadAddress + record.payload.length;

/**
 * §11.1's own computation, run in one loop: the SURVIVING marks are those at
 * `record[i].loadAddress + record[i].payload.length` for every record NO LATER RECORD COVERS.
 * "One per record" would be wrong — on the demo, record 1's mark at 00552 is inside record 2's
 * payload and is gone.
 */
export function survivingTails(records: readonly ObjectRecord[]): readonly Addr[] {
  return records
    .map(tailOf)
    .filter((at, i) => !records.slice(i + 1).some((later) => covers(later, at)));
}

function tailWarnings(
  records: readonly ObjectRecord[],
  reserved: readonly ReservedExtent[],
): readonly string[] {
  const warnings: string[] = [];
  for (const [i, record] of records.entries()) {
    const at = tailOf(record);
    if (records.slice(i + 1).some((later) => covers(later, at))) continue;   // overwritten

    // Whose record's mark this is. The demo's wording — asserted verbatim by §13 criterion 2 —
    // is "the last record's"; a mark surviving from an earlier record names its card instead.
    const whose = i === records.length - 1
      ? "the last record's"
      : `record ${sequenceOf(i + 1)}'s`;

    const area = reserved.find((extent) => at >= extent.from && at <= extent.to);
    if (area !== undefined) {
      const name = area.label === '' ? `the area reserved at ${five(area.from)}` : area.label;
      warnings.push(
        `${whose} GM-WM lands at ${five(at)}, inside ${name} — a read with d = \`R\` will `
        + 'transfer nothing; use `$`',
      );
      continue;
    }
    const other = records.find((candidate, j) => j !== i && covers(candidate, at));
    if (other !== undefined) {
      warnings.push(
        `${whose} GM-WM lands at ${five(at)}, inside the record loaded at `
        + `${five(other.loadAddress)} — it overwrites one character of the program`,
      );
    }
  }
  return warnings;
}
