// Tier 1 — `T` Table Lookup, the Phase 1b Wave C executor (`src/core/tablelookup.ts`).
// docs/plans/phase-1b.md §3.4 (the design), §4 Wave C (this vector list), §8 (the asymmetry
// risk), §9 (the two named readings).
// Machine facts: research/opcodes.md §2 pp.29-30 (the `T` row and its d-modifier map), §5.1 (the
// C-address reload, the end-of-table rule, Figure 25's d-characters), §5.2 (the collating rule
// and the sticky-equal rule), §8 (the four compare latches), §1.3 (Figure 8's LA/LB/LW), §1.5
// (Figure 7's N); research/charset.md §2, §4 (the collating sequence).
//
// EVERY EXPECTED VALUE HERE IS HAND-DERIVED FROM THE PRINCIPLES OF OPERATION; NO FIXTURE
// EXERCISES THIS OP SEMANTICALLY. `insttest.cor` 01100 is the `T` LENGTH/DECODE block —
// `emulators.md` §5.2 calls those blocks "decode tests only", their oracle being the post-decode
// AAR/BAR/IAR — and PHASE-1-NOTES §3 records that `ilentest.cor` and `insttest.cor` are
// byte-identical over 00000-02599, so tier 2 already walks exactly those bytes. `note1410.txt`
// names the block and annotates nothing in it. So the arithmetic and the collate reasoning
// behind each number below are written out beside it, and the citation with them.
//
// THE TABLE IS DELIBERATELY ASYMMETRIC (phase-1b.md §8): its three arguments compare HIGH,
// EQUAL and LOW against the search argument in the order the machine reaches them, and its
// functions differ from its arguments, so an implementation that compared the search argument to
// the table instead of the table to the search argument (TABLE_LOOKUP_COMPARES_TABLE_TO_ARGUMENT)
// lands on a different field with a different BAR and fails visibly rather than passing by
// symmetry.

import { describe, it, expect } from 'vitest';
import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { tTableLookup } from '../src/core/cycles.js';
import { Indicators } from '../src/core/indicators.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import {
  TABLE_LOOKUP_COMPARES_TABLE_TO_ARGUMENT, TABLE_LOOKUP_RESETS_COMPARE_PER_FIELD,
  tableLookupFields,
} from '../src/core/tablelookup.js';
import type { Addr, ExecContext } from '../src/core/types.js';

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

/** A run of characters starting at `at`, word-marked on its FIRST (leftmost) position. */
function place(s: CoreStorage, at: Addr, image: string): void {
  [...image].forEach((glyph, i) => s.setChar(at + i, code(glyph), i === 0));
}

// ═══ The core layout every vector below shares ════════════════════════════
//
// Search argument `200` at 00500-00502, word mark at 00500, so A = 00502 — its RIGHTMOST
// position (§2's `T` row). Table fields are `[ WM function | argument ]`, five characters each,
// ascending left to right, so the RIGHT-TO-LEFT search meets them in descending order:
//
//   00999   01000-01004   01005-01009   01010-01014
//   [*]     [ A A 1 0 0 ] [ B B 2 0 0 ] [ C C 3 0 0 ]
//    ^       ^             ^             ^        ^
//    short   WM            WM            WM       B = 01014, the rightmost character
//    field                                        of the WHOLE table
//
//   field 3 argument `300` vs `200` -> the table collates HIGH  (`3` rank 57 > `2` rank 56)
//   field 2 argument `200` vs `200` -> EQUAL
//   field 1 argument `100` vs `200` -> the table collates LOW   (`1` rank 55 < `2` rank 56)
//
// research/charset.md §4: rank, not the six-bit value, is what §5.2 compares.
const A_UNITS: Addr = 502;
const TABLE_UNITS: Addr = 1_014;

function layout(s: CoreStorage): void {
  place(s, 500, '200');            // the search argument, word mark at 00500
  place(s, 999, '*');              // the END-OF-TABLE field: one character, word-marked, and so
                                   // SHORTER than the three-character search argument (§5.1)
  place(s, 1_000, 'AA100');        // field 1
  place(s, 1_005, 'BB200');        // field 2
  place(s, 1_010, 'CC300');        // field 3
}

/**
 * The whole of what `tableLookupFields` reads off an `ExecContext` and writes back to it —
 * driven directly, as test/alu-pass.test.ts drives `addPass`, so LB and Figure 7's N can be
 * asserted as numbers instead of only through the timing formula they feed.
 */
interface Ctx {
  storage: CoreStorage;
  indicators: Indicators;
  regs: { opMod: number; car: Addr; bar: Addr };
  sym: { A: Addr; B: Addr; LA: number; LB: number; LW: number };
  terms: { M: number; Q: number; N: number; Z: number; D: number };
}

function search(d: string, build: (s: CoreStorage) => void = layout, bUnits = TABLE_UNITS): Ctx {
  const storage = new CoreStorage(10_000);
  build(storage);
  const ctx: Ctx = {
    storage,
    indicators: new Indicators(),
    regs: { opMod: code(d), car: 0, bar: 0 },
    sym: { A: A_UNITS, B: bUnits, LA: 0, LB: 0, LW: 0 },
    terms: { M: 0, Q: 0, N: 0, Z: 0, D: 0 },
  };
  tableLookupFields(ctx as unknown as ExecContext);
  return ctx;
}

/** The four latches as one readable word — they are set and reset as a GROUP (§8). */
function verdict(ctx: Ctx): string {
  const i = ctx.indicators;
  const which = i.compareHigh ? 'high' : i.compareLow ? 'low' : i.compareEqual ? 'equal' : 'none';
  return `${which}${i.compareUnequal ? '/unequal' : ''}`;
}

describe('`T` — the eight d-characters over an ascending table (opcodes.md §2 pp.29-30, §5.1)', () => {
  // A22-0526-3 Figure 25, p.30, as `open-questions.md` reads it: d is a THREE-BIT MASK over the
  // comparison result — 1 lower, 2 equal, 4 higher — and the printed map is those bits. The
  // search stops on the first field whose verdict the mask selects.
  //
  // Search order and verdicts, from the layout above: field 3 HIGH, field 2 EQUAL, field 1 LOW.
  // So: `4 5 6 7` all stop on field 3 (their masks all contain bit 4); `2 3` skip field 3 and
  // stop on field 2; `1` skips both and stops on field 1; blank stops on nothing.
  //
  // BAR, from the row verbatim: "address of the function immediately left of the stopping table
  // argument" — the argument's leftmost position minus one, which is the function's own units.
  //   field 3 argument 01012-01014 -> BAR 01011, the second `C`
  //   field 2 argument 01007-01009 -> BAR 01006, the second `B`
  //   field 1 argument 01002-01004 -> BAR 01001, the second `A`
  const hits = [
    { d: '1', field: 1, bar: 1_001, fn: 'A', latches: 'low/unequal', n: 3, lb: 13 },
    { d: '2', field: 2, bar: 1_006, fn: 'B', latches: 'equal', n: 2, lb: 8 },
    { d: '3', field: 2, bar: 1_006, fn: 'B', latches: 'equal', n: 2, lb: 8 },
    { d: '4', field: 3, bar: 1_011, fn: 'C', latches: 'high/unequal', n: 1, lb: 3 },
    { d: '5', field: 3, bar: 1_011, fn: 'C', latches: 'high/unequal', n: 1, lb: 3 },
    { d: '6', field: 3, bar: 1_011, fn: 'C', latches: 'high/unequal', n: 1, lb: 3 },
    { d: '7', field: 3, bar: 1_011, fn: 'C', latches: 'high/unequal', n: 1, lb: 3 },
  ] as const;

  // LB — Figure 8's B, "table positions actually stepped", accumulated across the WHOLE search
  // (phase-1b.md §3.4: a miss must not leave it holding one field's worth). Per missed field the
  // machine steps its three argument positions and then walks on left to the field's word mark,
  // which for these two-character functions is two more positions:
  //   d=4/5/6/7  field 3 compared           = 3
  //   d=2/3      field 3 (3 + 2) + field 2 compared (3)          = 8
  //   d=1        field 3 (5) + field 2 (3 + 2) + field 1 (3)     = 13
  for (const h of hits) {
    it(`d = \`${h.d}\` stops on table field ${h.field}: BAR on its function, latches ${h.latches}`, () => {
      const ctx = search(h.d);
      expect(ctx.regs.bar, 'BAR = the function immediately left of the stopping argument').toBe(h.bar);
      expect(glyphOf(ctx.storage.read(ctx.regs.bar)), 'the function character itself').toBe(h.fn);
      expect(verdict(ctx), 'the four latches, from the LAST argument comparison').toBe(h.latches);
      expect(ctx.terms.N, 'Figure 7 N — table fields actually compared').toBe(h.n);
      expect(ctx.sym.LB, 'Figure 8 LB — table positions actually stepped').toBe(h.lb);
      // Figure 8's LW — "whichever is shorter" over the LAST comparison. On a hit the two sides
      // are the same length (§5.1's requirement), so it is the search argument's 3.
      expect(ctx.sym.LW, 'the last comparison read all three positions').toBe(3);
    });
  }

  it('d = blank never satisfies, so the search runs to the end of the table (Figure 25)', () => {
    // Mask 0 selects no result, so all three fields miss and the search reaches the
    // one-character field at 00999 — SHORTER than the search argument, which §5.1 makes the
    // end-of-table condition: HIGH on, BAR immediately left of that short field.
    const ctx = search(' ');
    expect(verdict(ctx), 'the end-of-table HIGH, not the last comparison’s LOW').toBe('high/unequal');
    expect(ctx.regs.bar, 'immediately left of the short field at 00999').toBe(998);
    // Three full fields (3 compared + 2 walked, each) plus one position of the short field.
    expect(ctx.sym.LB).toBe(16);
    expect(ctx.terms.N, 'the aborted comparison is still a search cycle — see the module note').toBe(4);
  });

  it('the compare direction is TABLE to SEARCH ARGUMENT, and the table proves it', () => {
    expect(TABLE_LOOKUP_COMPARES_TABLE_TO_ARGUMENT).toBe(true);
    // Inverting the direction turns field 3's HIGH into a LOW and field 1's LOW into a HIGH, so
    // `d = 4` would walk past field 3 and stop on field 1 with BAR 01001 instead of 01011, and
    // `d = 1` the other way about. THE REAL DIRECTION PROOF IS THE HITS TABLE ABOVE — each
    // d-character's exact BAR — and this case restates its load-bearing half: an inequality
    // would still hold under the inverted reading (the two BARs merely swap), so the assertion
    // has to name field 3's own address (phase-1b.md §8).
    expect(search('4').regs.bar, 'field 3’s function `C` at 01011, not field 1’s at 01001').toBe(1_011);
  });
});

describe('`T` — the C-address reload, and where a miss restarts (opcodes.md §5.1)', () => {
  // §5.1, verbatim: "At the start of each search cycle, the C-address register automatically
  // receives this address [the A-address] and, if no hit is made, replaces it in the A-address
  // register so the search can be repeated at the next table argument to the left. An emulator
  // must reload AAR from a saved copy at the start of every table-field comparison, not merely
  // decrement it." The restart is one position left of the TABLE FIELD'S WORD MARK — not one
  // position left of where the comparison stopped, which is a different address whenever the
  // field carries a function.
  //
  //   01095-01099   01100 . . . . . . . . 01107
  //   [ C D 2 0 0 ] [ A B 2 0 0 5 0 0 ]
  //    ^             ^         ^     ^
  //    WM            WM        |     B = 01107
  //                            |     argument = 01105-01107 = `500`
  //                            the trap: 01102-01104 also reads `200`
  //
  // Field X's argument `500` compares HIGH against `200` and misses. The comparison stops at
  // 01105; an implementation that restarted one position left of THAT would take 01102-01104 —
  // the tail of the function — for the next table argument, find `200`, and report a HIT with
  // BAR 01101. The machine instead walks on to the word mark at 01100 and restarts at 01099,
  // where field Y's real argument `200` gives the same EQUAL verdict at a different address.
  function trap(s: CoreStorage): void {
    place(s, 500, '200');
    place(s, 1_095, 'CD200');       // field Y — the real hit
    place(s, 1_100, 'AB200500');    // field X — a five-character function ending in `200`
  }

  it('restarts one position left of the field WORD MARK, not of where the comparison stopped', () => {
    const ctx = search('2', trap, 1_107);
    expect(ctx.regs.bar, 'field Y’s function `D` at 01096 — NOT the trap’s 01101').toBe(1_096);
    expect(glyphOf(ctx.storage.read(ctx.regs.bar))).toBe('D');
    expect(verdict(ctx)).toBe('equal');
    expect(ctx.terms.N, 'two fields compared: X missed, Y hit').toBe(2);
    // 3 positions of X's argument + 5 walked to its word mark at 01100 + 3 of Y's argument.
    expect(ctx.sym.LB).toBe(11);
  });

  it('leaves the A-address in the C-address register — the copy each cycle reloads from', () => {
    const ctx = search('2', trap, 1_107);
    expect(ctx.regs.car, 'CAR receives the A-address at the start of every search cycle').toBe(A_UNITS);
  });
});

describe('`T` — end of table: a short field turns HIGH on (opcodes.md §5.1)', () => {
  // §5.1, `[verified]`: "a table field SHORTER than the search argument ends the operation and
  // turns on the HIGH compare indicator; BAR then holds the address of the position immediately
  // left of that short table field."
  //
  //   00899   00900-00904
  //   [*]     [ E E 9 0 0 ]     B = 00904
  //    ^       ^
  //    WM      WM
  //
  // `900` vs `200` is HIGH, which d = `1` (lower) does not select, so the one field misses and
  // the search reaches the one-character field at 00899.
  function tiny(s: CoreStorage): void {
    place(s, 500, '200');
    place(s, 899, '*');
    place(s, 900, 'EE900');
  }

  it('ends with HIGH and BAR immediately left of the short field', () => {
    const ctx = search('1', tiny, 904);
    expect(verdict(ctx)).toBe('high/unequal');
    expect(ctx.regs.bar).toBe(898);
    expect(ctx.sym.LB, '3 compared + 2 walked to the word mark + 1 of the short field').toBe(6);
    expect(ctx.terms.N).toBe(2);
    // LW IS THE LAST COMPARISON'S POSITIONS-READ COUNT, and the last comparison here is the
    // aborted one against the one-character field at 00899: it read a single position before
    // that field's word mark ended the operation. §1.3 `[verified]` defines LW as the A- or
    // B-field length "whichever is SHORTER", and on this exit the table side genuinely is
    // shorter; §5.1's AAR mechanism agrees, since the A-address register is reloaded per search
    // cycle and stepped per position read, so an operation ending mid-cycle leaves A minus the
    // positions THAT cycle read. (Rejected: phase-1b.md §3.4's "the search-argument length,
    // since that is the length every comparison reads" — false of the aborted comparison, which
    // is what makes it the end condition. Logged in PHASE-1B-NOTES §2.)
    expect(ctx.sym.LW, 'the aborted comparison read one position').toBe(1);
    // So the row's `AAR = A − LW`, which `regs.ts` evaluates from exactly this symbol, leaves
    // AAR one position left of the search argument's UNITS: 00502 − 1 = 00501, not the 00499 a
    // full-length comparison gives.
    expect(A_UNITS - ctx.sym.LW, 'the row’s `A−LW` as regs.ts evaluates it').toBe(501);
  });

  it('the HIGH is the end-of-table rule’s own, not the last comparison’s verdict', () => {
    // Make the last real comparison LOW and check HIGH still comes out: `100` vs `200` is LOW,
    // which d = `2` (equal) does not select, so the search runs on into the short field.
    const ctx = search('2', (s) => {
      place(s, 500, '200');
      place(s, 899, '*');
      place(s, 900, 'EE100');
    }, 904);
    expect(verdict(ctx)).toBe('high/unequal');
  });
});

describe('`T` — the compare group resets per table field (phase-1b.md §3.4, §9)', () => {
  // THE VECTOR THAT SEPARATES THE TWO READINGS. §5.2's sticky-equal rule — "once the B=A
  // indicator is turned off during an operation it cannot be turned on again for the rest of
  // that operation" (223-2588-2 p.24) — is written for `C`, one operation with ONE comparison.
  // Read per-OPERATION it would make this case impossible: field 3 compares HIGH, turning equal
  // off, and no later field could ever turn it back on, so a `d = 2` lookup could never hit
  // after any miss. Read per-FIELD (TABLE_LOOKUP_RESETS_COMPARE_PER_FIELD) field 2's EQUAL
  // stands, which is also what §2's `T` row means by "from the LAST argument comparison".
  it('a miss on the first field compared, then an EQUAL hit on the second', () => {
    expect(TABLE_LOOKUP_RESETS_COMPARE_PER_FIELD).toBe(true);
    const ctx = search('2');
    expect(ctx.terms.N, 'field 3 missed HIGH, field 2 hit').toBe(2);
    expect(ctx.indicators.compareEqual, 'equal came back ON for the second comparison').toBe(true);
    expect(ctx.indicators.compareHigh, 'field 3’s HIGH did not survive into field 2').toBe(false);
    expect(ctx.indicators.compareUnequal).toBe(false);
  });
});

// ═══ Through a whole instruction — the row's registers and its timing ══════

function machine(text: string): Machine {
  const m = createMachine({ size: 10_000 });
  [...text].forEach((glyph, i) => m.storage.setChar(100 + i, code(glyph), i === 0));
  m.storage.setWm(100 + text.length, true);
  layout(m.storage);
  m.addressSet(100);
  return m;
}

describe('`T aaaaa bbbbb d` — the row’s register triple and timing (opcodes.md §2, §1.3, §1.5)', () => {
  it('leaves NSI / A−LW / the function address (the row’s `special` BAR)', () => {
    const m = machine('T0050201014' + '2');
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'NSI — 12 characters from 00100').toBe(112);
    // AAR = A − LW with LW = 3, the search-argument length every comparison reads: 00502 − 3.
    // That is one position left of the argument's high-order character at 00500, exactly where
    // `A`/`S`/`C` leave AAR after their own fields.
    expect(m.regs.aar).toBe(499);
    expect(m.regs.bar, 'field 2’s function, `B` at 01006').toBe(1_006);
    expect(m.indicators.compareEqual).toBe(true);
  });

  it('reports Figure 7’s N through the row’s timing (opcodes.md §1.5, cycles.ts)', () => {
    const m = machine('T0050201014' + '2');
    m.step();
    // `4.5(L + 1 + B + NA)` with L = 12, B = LB = 8, N = 2 and A = LA = 3: 4.5 x 27 = 121.5 µs.
    // N reaches the formula only through `ctx.terms.N`, so this is the search loop's own count —
    // the row hard-wired 0 before Wave C.
    expect(m.cpu.microsecondsSimulated).toBe(tTableLookup(12, 3, 8, 2));
    expect(m.cpu.microsecondsSimulated).toBe(121.5);
  });

  it('the table and the search argument are left untouched — `T` writes no storage', () => {
    const m = machine('T0050201014' + '1');
    const before = [...Array(20).keys()].map((i) => m.storage.read(999 + i));
    m.step();
    expect([...Array(20).keys()].map((i) => m.storage.read(999 + i))).toEqual(before);
    expect(glyphOf(m.storage.read(500)) + glyphOf(m.storage.read(501)) + glyphOf(m.storage.read(502)))
      .toBe('200');
  });
});
