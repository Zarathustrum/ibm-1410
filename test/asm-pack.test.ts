// Tier 2 — the condensed-card packer, on the 60-COLUMN budget
// (docs/plans/phase-3-autocoder.md §8.3; wave 2).
//
// Every record this file builds is driven back through the SHIPPED `encodeObjectRecord` and
// `decodeObjectRecord` (`src/formats/objectdeck.ts`, untouched by Phase 3): the encoder enforces
// the budget by THROWING, so "the packer never hands it a record it would reject" is asserted by
// handing it every record and by re-decoding what comes out.
//
// THE TRAP THIS FILE EXISTS FOR (§14 R6): sixty is a COLUMN count, not a character count. A
// marked cell costs two columns — a 0-5-8 word separator, then the character — and a stored
// separator costs the doubled pair, so A FULLY MARKED PAYLOAD HOLDS THIRTY CHARACTERS.

import { describe, expect, it } from 'vitest';

import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { WORD_SEPARATOR } from '../src/core/channel.js';
import { GROUP_MARK_BCD } from '../src/core/move.js';
import { WM, type Addr } from '../src/core/types.js';
import {
  PAYLOAD_COLUMNS, PAYLOAD_FIELD_COLUMNS, decodeObjectRecord, encodeObjectRecord,
} from '../src/formats/objectdeck.js';
import {
  CONSTANT_MAY_SPAN_CONDENSED_CARDS, columnCost, pack, survivingTails, tailOf,
  type ReservedExtent,
} from '../src/asm/pack.js';
import type { EmittedItem } from '../src/asm/types.js';

const code = (glyph: string): number => {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`"${glyph}" is not one of the 64`);
  return c;
};

/** Cells from a glyph string; `^` before a glyph marks it. */
function cells(text: string): Uint8Array {
  const out: number[] = [];
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '^') { i += 1; out.push(WM | code(chars[i] ?? '')); } else { out.push(code(chars[i] ?? '')); }
  }
  return Uint8Array.from(out);
}

const item = (at: Addr, text: string, seqno: number): EmittedItem => ({ at, cells: cells(text), seqno });

/** Every position a run of records writes, address -> cell. The decoded deck, flattened. */
function imageOf(records: readonly { loadAddress: Addr; payload: Uint8Array }[]): Map<Addr, number> {
  const image = new Map<Addr, number>();
  for (const record of records) {
    for (const [i, cell] of record.payload.entries()) image.set(record.loadAddress + i, cell);
  }
  return image;
}

function imageOfItems(items: readonly EmittedItem[]): Map<Addr, number> {
  const image = new Map<Addr, number>();
  for (const one of items) {
    for (const [i, cell] of one.cells.entries()) image.set(one.at + i, cell);
  }
  return image;
}

const NO_RESERVED: readonly ReservedExtent[] = [];

// ═══ The budget: sixty COLUMNS ═════════════════════════════════════════════════════════════

describe('the 60-column budget (plan §8.3, software.md §8.1\'s NOTE)', () => {
  it('the three costs, one per row of the NOTE', () => {
    expect(columnCost(code('A'))).toBe(1);                        // an ordinary cell
    expect(columnCost(WM | code('A'))).toBe(2);                   // separator, then the character
    expect(columnCost(WORD_SEPARATOR)).toBe(2);                   // the doubled pair
    // …and the pair still counts ONE toward the count field, which is `payload.length` itself.
    const { records } = pack([{ at: 500, cells: Uint8Array.from([WORD_SEPARATOR]), seqno: 1 }], NO_RESERVED);
    expect(records[0]?.payload).toHaveLength(1);
  });

  it('AN ALL-MARKED PAYLOAD PACKS THIRTY CHARACTERS PER CARD, not sixty', () => {
    // 35 marked cells at 00500. 30 of them fill the field exactly (30 × 2 = 60 columns), the
    // 31st would need column 73, so the record closes and a second opens at 00530 — which is
    // also CONSTANT_MAY_SPAN_CONDENSED_CARDS in miniature: nothing here asks whether the cells
    // belong to one constant or to twenty instructions.
    const marked = Uint8Array.from(
      [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345678'].map((g) => WM | code(g)),
    );
    expect(marked).toHaveLength(35);
    const { records } = pack([{ at: 500, cells: marked, seqno: 1 }], NO_RESERVED);

    expect(records).toHaveLength(2);
    expect(records[0]?.loadAddress).toBe(500);
    expect(records[0]?.payload).toHaveLength(30);
    expect(records[1]?.loadAddress).toBe(530);
    expect(records[1]?.payload).toHaveLength(5);
    expect(CONSTANT_MAY_SPAN_CONDENSED_CARDS, 'the chosen fallback, pinned by name').toBe(true);

    // And the card the encoder punches uses all sixty columns, ending on a CHARACTER — never on
    // a separator whose character was pushed past column 72 (TRAILING_SEPARATOR_IS_A_DECK_ERROR,
    // avoided by construction).
    const card = encodeObjectRecord(records[0] ?? { loadAddress: 0, payload: new Uint8Array() });
    expect(glyphOf(card[PAYLOAD_COLUMNS[0] - 1] ?? 0)).toBe('⌒');
    expect(glyphOf(card[PAYLOAD_COLUMNS[1] - 1] ?? 0)).toBe('3');   // the 30th character
    expect(PAYLOAD_FIELD_COLUMNS).toBe(60);
  });

  it('sixty PLAIN cells are one card, and the sixty-first opens the next', () => {
    const plain = Uint8Array.from(new Array<number>(61).fill(code('7')));
    const { records } = pack([{ at: 500, cells: plain, seqno: 1 }], NO_RESERVED);
    expect(records.map((r) => [r.loadAddress, r.payload.length])).toEqual([[500, 60], [560, 1]]);
  });

  it('every record the packer emits survives the SHIPPED encoder, which throws rather than truncating', () => {
    const mixed = pack(
      [{ at: 500, cells: cells('^A^B^C^D^E^F^G^H^I^J^K^L^M^N^O^P^Q^R^S^T^U^V^W^X^Y^Z^0^1^2^3^4^5'), seqno: 1 }],
      NO_RESERVED,
    );
    for (const record of mixed.records) {
      expect(() => encodeObjectRecord(record)).not.toThrow();
      const columns = [...record.payload].reduce((n, cell) => n + columnCost(cell), 0);
      expect(columns).toBeLessThanOrEqual(PAYLOAD_FIELD_COLUMNS);
    }
  });
});

// ═══ A record breaks in exactly three ways ═════════════════════════════════════════════════

describe('a record breaks in EXACTLY three ways: address, budget, end of emission (plan §8.3)', () => {
  it('a NON-CONTIGUOUS address closes the record — a DS gap, an ORG jump, a pool origin', () => {
    const { records } = pack([item(500, '^ABC', 1), item(508, '^DE', 2)], NO_RESERVED);
    expect(records.map((r) => [r.loadAddress, r.payload.length])).toEqual([[500, 3], [508, 2]]);
  });

  it('the BUDGET closes the record, at the cell that would need column 73', () => {
    // 26 marked cells = 52 columns; the next marked cell needs two more and 54 ≤ 60, so the
    // break is where the arithmetic puts it and not where a character count would.
    const marked = Uint8Array.from([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((g) => WM | code(g)));
    const tail = cells('0123456789');
    const { records } = pack(
      [{ at: 500, cells: marked, seqno: 1 }, { at: 526, cells: tail, seqno: 2 }],
      NO_RESERVED,
    );
    // 52 columns of marks, then eight plain cells fill 60; the ninth opens a new record.
    expect(records.map((r) => [r.loadAddress, r.payload.length])).toEqual([[500, 34], [534, 2]]);
  });

  it('NOTHING ELSE breaks a record — three contiguous items are ONE card', () => {
    const { records } = pack(
      [item(500, '^ABC', 1), item(503, 'DEF', 2), item(506, '^GH', 3)],
      NO_RESERVED,
    );
    expect(records).toHaveLength(1);
    expect(records[0]?.loadAddress).toBe(500);
    expect(records[0]?.payload).toHaveLength(8);
  });

  it('the end of emission closes the last record, and an empty emission makes no card at all', () => {
    expect(pack([], NO_RESERVED).records).toEqual([]);
    expect(pack([item(500, '^A', 1)], NO_RESERVED).records).toHaveLength(1);
  });

  it('sequence numbers run 001.. in deck order (columns 73-75)', () => {
    const { records } = pack([item(500, '^A', 1), item(600, '^B', 2), item(700, '^C', 3)], NO_RESERVED);
    expect(records.map((r) => r.sequence)).toEqual(['001', '002', '003']);
  });
});

describe('cardOf: which object card each item rode in on — the listing\'s CARD column', () => {
  it('maps every statement seqno to its 1-based card', () => {
    const { records, cardOf } = pack(
      [item(500, '^ABC', 11), item(503, '^DE', 12), item(600, '^F', 13)],
      NO_RESERVED,
    );
    expect(records).toHaveLength(2);
    expect([...cardOf]).toEqual([[11, 1], [12, 1], [13, 2]]);
  });

  it('an item SPLIT across cards is recorded on the card it begins on', () => {
    const long = Uint8Array.from([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345678'].map((g) => WM | code(g)));
    const { records, cardOf } = pack(
      [{ at: 500, cells: long, seqno: 17 }, { at: 535, cells: cells('^Z'), seqno: 18 }],
      NO_RESERVED,
    );
    expect(records).toHaveLength(2);
    expect(cardOf.get(17)).toBe(1);
    expect(cardOf.get(18)).toBe(2);
  });
});

// ═══ The property: pack -> encode -> decode -> concatenate === the emission ════════════════

describe('PROPERTY: random emission runs survive the shipped encoder and decoder byte for byte', () => {
  /** A seeded LCG, so a failure is reproducible from its seed rather than "sometimes red". */
  function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 2 ** 32;
    };
  }

  /**
   * A random emission run. CONSTRAINED, and the constraints are the format's own refusals, not
   * conveniences: `encodeObjectRecord` rejects a word mark over a group mark
   * (OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK) and a marked word separator (C28-0309-1 Figure 2's
   * NOTE, verbatim — software.md §8.1).
   *
   * WHY THOSE TWO CELL SHAPES ARE EXCLUDED, stated exactly and no wider: the FORMAT refuses them
   * BY DESIGN, and `emit.ts` now GUARANTEES the assembler cannot produce them — a DCW, DC or
   * pooled literal whose HIGH-ORDER character is a group mark or a word separator is flagged `F`
   * and emitted UNMARKED (`constantCells`, pinned in `test/asm-emit.test.ts`, which drives both
   * shapes through pack → encode → decode). The high-order cell is the only one whose mark
   * `emit.ts` decides (`Literal.cells` is "WM high-order" by contract, types.ts), so the
   * exclusion here matches what the packer can actually be handed.
   *
   * Plain group marks and plain separators ARE generated: the separator is the two-column,
   * one-character cell the count field turns on.
   */
  function randomItems(next: () => number): EmittedItem[] {
    const items: EmittedItem[] = [];
    let at = 500;
    const count = 2 + Math.floor(next() * 6);
    for (let n = 0; n < count; n++) {
      const length = 1 + Math.floor(next() * 40);
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        const bcd = Math.floor(next() * 64);
        const markable = bcd !== WORD_SEPARATOR && bcd !== GROUP_MARK_BCD;
        bytes[i] = (markable && next() < 0.4 ? WM : 0) | bcd;
      }
      items.push({ at, cells: bytes, seqno: n + 1 });
      at += length + Math.floor(next() * 6);          // 0 = contiguous, otherwise a gap
    }
    return items;
  }

  it('120 runs: the decoded deck equals the emitted cells and marks, address for address', () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 120; seed++) {
      const items = randomItems(rng(seed));
      const { records } = pack(items, NO_RESERVED);

      // Through the SHIPPED encoder and the SHIPPED decoder, exactly as the 1402 will.
      const decoded = records.map((r) => decodeObjectRecord(encodeObjectRecord(r)));

      // 1. Concatenated payloads are byte-identical to the concatenated emission.
      const flatIn = items.flatMap((one) => [...one.cells]);
      const flatOut = decoded.flatMap((r) => [...r.payload]);
      if (flatIn.join(',') !== flatOut.join(',')) failures.push(`seed ${seed}: payload bytes differ`);

      // 2. And they land at the same addresses — the record boundaries carry the geometry.
      const want = imageOfItems(items);
      const got = imageOf(decoded);
      if (want.size !== got.size) failures.push(`seed ${seed}: ${want.size} cells emitted, ${got.size} loaded`);
      for (const [address, cell] of want) {
        if (got.get(address) !== cell) failures.push(`seed ${seed}: ${address} is ${String(got.get(address))}, want ${cell}`);
      }

      // 3. The sequence numbers and the count field the encoder re-derives.
      records.forEach((record, i) => {
        if (decoded[i]?.payload.length !== record.payload.length) failures.push(`seed ${seed}: count ${i}`);
        if (decoded[i]?.sequence !== record.sequence) failures.push(`seed ${seed}: sequence ${i}`);
      });
    }
    expect(failures.slice(0, 10)).toEqual([]);
  });
});

// ═══ The GM-WM tail — BOTH cases (plan §8.3) ═══════════════════════════════════════════════

describe('the GM-WM tail rule, both cases (plan §8.3, opcodes.md §3.1)', () => {
  it('the SURVIVING marks are computed from the record list, NOT one per record', () => {
    // A budget break makes two contiguous records: record 1's mark at the boundary is inside
    // record 2's payload and is gone. Two records, ONE surviving mark.
    const marked = Uint8Array.from([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345678'].map((g) => WM | code(g)));
    const { records } = pack([{ at: 500, cells: marked, seqno: 1 }], NO_RESERVED);
    expect(records.map(tailOf)).toEqual([530, 535]);
    expect(survivingTails(records)).toEqual([535]);
  });

  it('CASE 1 — the tail lands inside a DS / DA extent: no record covers it, so nothing else sees it', () => {
    // The demo's own case (§13 criterion 2): the last record loads 12 cells at 00552, so the
    // loader plants a group-mark-with-word-mark at 00564 — the first position of `LINE`'s DS
    // extent. The program is correct only because the read carries `$`
    // (CARD_DOLLAR_SUPPRESSES_GM_WM_TEST, src/core/channel.ts). The warning is the packer saying
    // so; a warning, not a flag, because F/U/M/O is a closed published set (§6.3).
    const reserved: readonly ReservedExtent[] = [{ from: 564, to: 643, label: 'LINE' }];
    const { warnings } = pack([item(552, '^ABCDE^FGHIJKL', 17)], reserved);
    expect(warnings).toEqual([
      'the last record\'s GM-WM lands at 00564, inside LINE — a read with d = `R` will transfer '
      + 'nothing; use `$`',
    ]);
  });

  it('CASE 2 — a BACKWARDS ORG sends the last record below an earlier one and the tail clobbers it', () => {
    // Emission order is deck order: card 1 loads 00520-00522, card 2 loads 00500-00519, and card
    // 2's terminating GM-WM lands at 00520 — one character INSIDE the record that loaded first.
    const items = [item(520, '^XYZ', 1), item(500, '^ABCDEFGHIJKLMNOPQRST', 2)];
    const { records, warnings } = pack(items, NO_RESERVED);
    expect(records.map((r) => [r.loadAddress, r.payload.length])).toEqual([[520, 3], [500, 20]]);
    expect(survivingTails(records)).toEqual([523, 520]);
    expect(warnings).toEqual([
      'the last record\'s GM-WM lands at 00520, inside the record loaded at 00520 — it overwrites '
      + 'one character of the program',
    ]);
  });

  it('an ascending contiguous deck warns about NOTHING — the last mark ends the program', () => {
    const { warnings } = pack([item(500, '^ABC', 1), item(503, '^DEF', 2)], NO_RESERVED);
    expect(warnings).toEqual([]);
  });

  it('a mark that lands in unreserved, uncovered storage is not a warning either', () => {
    // It is where a 1410 program wants one: past the end of the loaded program.
    const { warnings } = pack([item(500, '^ABC', 1)], [{ from: 700, to: 799, label: 'FAR' }]);
    expect(warnings).toEqual([]);
  });

  it('an unlabelled reserved extent still names the address it starts at', () => {
    const { warnings } = pack([item(500, '^ABC', 1)], [{ from: 503, to: 510, label: '' }]);
    expect(warnings[0]).toBe(
      'the last record\'s GM-WM lands at 00503, inside the area reserved at 00503 — a read with '
      + 'd = `R` will transfer nothing; use `$`',
    );
  });
});
