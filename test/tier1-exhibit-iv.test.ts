// Tier 1 — C28-0326-2 Appendix C, EXHIBIT IV: the one 1410 Autocoder listing with PUBLISHED
// ASSEMBLED OUTPUT (docs/plans/phase-3-autocoder.md §11.2; `software.md` §5's evidence table;
// wave 4).
//
// ═══ WHAT THIS FILE MAY ASSERT, AND WHY THE LINE IS DRAWN THERE ═══════════════════════════════
//
// Exhibit IV is an **OS** listing (1410-PR-155) and this phase builds the **standalone**
// C28-0309-1 assembler. So the only facts asserted below are the ones that do not depend on which
// assembler produced them — address arithmetic, the low-order / high-order rule proved from the
// PUNCHED DECK, the derived move table's d, and the literal pool's order. Anything that is a
// property of the OS processor is either left alone or, where it corroborates a `[likely]`
// standalone rule, carried in a SEPARATELY NAMED block that says so
// (`COL7_CORROBORATION_IS_OS_EVIDENCE`, at the foot of this file).
//
// ═══ ASSEMBLY ONLY. THERE IS NO EXECUTE-THE-DECK TEST ═════════════════════════════════════════
//
// SEQNO 37 assembles `BXPA` -> op `Y`, the PRIORITY feature (`opcodes.md` §9.1), which this
// machine rejects at run time with `UnimplementedOp`. That is not a defect in the assembler: the
// assembler assembles the MACHINE, not the configuration (§2.5), and `table.ts`'s
// `implemented: false` rows all resolve. Loading and running this deck is therefore not a thing
// this oracle can do, and §11.2 says so in advance rather than leaving it to be discovered.
//
// ═══ THE SOURCE BELOW IS A RECONSTRUCTION, AND IT IS LABELLED ONE ═════════════════════════════
//
// `software.md` §5's table publishes SEQNO, LABEL, OPCOD, OPERAND, CT, ADDRS, INSTRUCTION and CARD
// for FIFTEEN of Exhibit IV's lines — SEQNO 37, 38, 39, 40, 43, 58, 59, 60, 61, 62, 64, 65, 66,
// 68 and 69 — and not the whole program. The deck below is the smallest source that reproduces
// those fifteen rows' arithmetic: same origins, same lengths, same encounter order, with filler
// where the exhibit publishes nothing. Three places where the reconstruction had to choose, each
// recorded at its card:
//
//  1. SEQNO 37's operand is printed `/PCH/` — a device field this configuration does not model.
//     The reconstruction writes `BXPA PCH`, which is the same SEVEN characters at 00192 and the
//     same ladder into SEQNO 38. CT and ADDRS are what §11.2 binds; the operand text is not.
//  2. SEQNO 40 is printed with a BLANK operand and `J 00000` in INSTRUCTION — an OS forward
//     reference the Linkage Loader fills. A standalone assembler has no such filler, so the
//     reconstruction writes `B 00000` and assembles the same seven characters at 00209. That is
//     what `EOF EQU *` = 00216 = 00209 + 7 rests on.
//  3. SEQNO 68's constant is printed `@EOJ@,G` with CT 6, and three characters plus the
//     group-mark position is 4, not 6. CT 6 is what the published card geometry needs — two
//     constants at 00396 and 00402 — so the reconstruction writes a FIVE-character constant and
//     records the discrepancy here rather than papering over either half.

import { describe, expect, it } from 'vitest';

import { glyphOf } from '../src/core/bcd.js';
import { BCD6, type Addr } from '../src/core/types.js';
import { pass2, type EmittedStatement, type Pass2Result } from '../src/asm/emit.js';
import { parse } from '../src/asm/operand.js';
import { pack, type PackResult } from '../src/asm/pack.js';
import { FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS, pass1, type Pass1Result } from '../src/asm/symbols.js';

const LABEL = 6, INDENT = 7, OPERATION = 16, OPERAND = 21, IDENT = 76;

function card(fields: readonly (readonly [number, string])[]): string {
  let out = '';
  for (const [column, text] of fields) {
    if (out.length > column - 1) {
      throw new Error(`"${text}" will not fit at column ${column}: ${out.length} columns used`);
    }
    out = out.padEnd(column - 1) + text;
  }
  return out.trimEnd();
}

/**
 * The reconstruction. Card numbers on the right are this deck's SEQNOs; the Exhibit IV row each
 * one stands for is named where there is one.
 */
const EXHIBIT_IV: readonly (readonly (readonly [number, string])[])[] = [
  [[LABEL, 'AUTOCODER'], [OPERATION, 'RUN']],                              //  1
  [[OPERATION, 'JOB'], [OPERAND, 'EXHIBIT IV'], [IDENT, 'EXIV1']],         //  2
  [[OPERATION, 'ORG'], [OPERAND, '00150']],                                //  3
  // Four instructions that write the four literals, in the encounter order the pool prints them
  // in at SEQNO 59-62. Their lengths are chosen so the emission reaches column 60 exactly at
  // 00203 — which is what puts the next constant on the card that begins at 00204.
  [[OPERATION, 'MLCB'], [OPERAND, 'AR80,IDENT#5']],                        //  4  -> the D 00394 00306 L row
  [[OPERATION, 'MLC'], [OPERAND, '@ABC@,AR04']],                           //  5
  [[OPERATION, 'A'], [OPERAND, '@X@']],                                    //  6
  [[OPERATION, 'MLC'], [OPERAND, 'AR04,CNT#4']],                           //  7
  [[OPERATION, 'BXPA'], [OPERAND, 'PCH']],                                 //  8  = SEQNO 37
  [[OPERATION, 'DCW'], [OPERAND, '#5']],                                   //  9  = SEQNO 38
  [[OPERATION, 'DCW'], [OPERAND, 'AREA']],                                 // 10  = SEQNO 39
  [[LABEL, 'PCH'], [OPERATION, 'B'], [OPERAND, '00000']],                  // 11  = SEQNO 40
  [[LABEL, 'EOF'], [OPERATION, 'EQU'], [OPERAND, '*']],                    // 12  = SEQNO 43
  [[OPERATION, 'DCW'], [OPERAND, '#19']],                                  // 13  filler, 00216-00234
  [[OPERATION, 'DCW'], [OPERAND, 'EOJ']],                                  // 14  the card's LAST constant
  [[OPERATION, 'ORG'], [OPERAND, '00302']],                                // 15
  [[OPERATION, 'LTORG'], [OPERAND, '*']],                                  // 16  = SEQNO 58
  [[LABEL, 'AREA'], [OPERATION, 'DA'], [OPERAND, '1X80,G']],               // 17  = SEQNO 64
  [[LABEL, 'AR04'], [OPERAND, '1,4']],                                     // 18  = SEQNO 65
  [[LABEL, 'AR80'], [OPERAND, '5,80']],                                    // 19  = SEQNO 66
  [[INDENT, 'EOJ'], [OPERATION, 'DC'], [OPERAND, '@EOJ  @,G']],            // 20  = SEQNO 68
  [[INDENT, 'ERR'], [OPERATION, 'DC'], [OPERAND, '@ERROR@,G']],            // 21  = SEQNO 69
  [[OPERATION, 'END'], [OPERAND, 'PCH']],                                  // 22
];

interface Assembled {
  readonly p1: Pass1Result;
  readonly p2: Pass2Result;
  readonly packed: PackResult;
}

function assembled(): Assembled {
  const p1 = pass1(parse(EXHIBIT_IV.map(card).join('\n')));
  const p2 = pass2(p1.sized, p1.symbols, p1.coreSize);
  return { p1, p2, packed: pack(p2.items, p1.reserved) };
}

const AT = assembled();

const addrs = (seqno: number): Addr | undefined => AT.p1.lines.find((l) => l.seqno === seqno)?.addrs;
const ct = (seqno: number): number | undefined => AT.p1.lines.find((l) => l.seqno === seqno)?.ct;
const emitted = (seqno: number): EmittedStatement | undefined =>
  AT.p2.statements.find((s) => s.seqno === seqno);
const symbol = (name: string): number | undefined => AT.p1.symbols.get(name)?.value;

// ═══ 1. The derived move table, through a published instruction ════════════════════════════

describe('Exhibit IV — `MLCB AR80,IDENT#5` -> `D 00394 00306 L` (software.md §5)', () => {
  it('assembles the published instruction, d and all', () => {
    // The `L` falls out of the DERIVED Move table (`MOVE_MNEMONIC_IS_DIR_PORTION_TERM`,
    // mnemonics.ts) rather than a transcription, so this row tests the derivation. The two
    // addresses come from pass 1: `AR80` is a DA sub-entry's low-order and `IDENT#5` is an
    // area-defining literal's low-order, and neither is written anywhere in this file.
    expect(emitted(4)?.instruction).toBe('D 00394 00306 L');
    expect(symbol('AR80')).toBe(394);
    expect(symbol('IDENT#5')).toBe(306);
    expect(emitted(4)?.flag).toBeUndefined();
  });
});

// ═══ 2. `EOF EQU *` = 00216 = 00209 + 7 ════════════════════════════════════════════════════

describe('Exhibit IV — `EOF EQU *` is 00216, which is 00209 + 7 (SEQNO 40, 43)', () => {
  it('the asterisk in an EQU is the ASSIGNMENT COUNTER, and the counter is past the branch', () => {
    // `software.md` §2, `[verified]`: the same `*` written as an ordinary operand on that
    // instruction would be 00215. The chain is what confirms the branch is seven characters.
    expect(addrs(11)).toBe(209);
    expect(ct(11)).toBe(7);
    expect(symbol('EOF')).toBe(216);
    expect(addrs(12)).toBe(216);
    expect(ct(12)).toBeUndefined();
  });
});

// ═══ 3. SEQNO 37-40: the address ladder ════════════════════════════════════════════════════

describe('Exhibit IV — SEQNO 37-40 at 00192 / 00203 / 00208 / 00209, CT 7 / 5 / 5 / 7', () => {
  it('the four published rows, in order', () => {
    expect([addrs(8), addrs(9), addrs(10), addrs(11)]).toEqual([192, 203, 208, 209]);
    expect([ct(8), ct(9), ct(10), ct(11)]).toEqual([7, 5, 5, 7]);
  });

  it('an instruction is HIGH-order and a constant is LOW-order — both rows unlabelled', () => {
    // The single ADDRS rule, seen on lines that carry no label at all: SEQNO 37 occupies
    // 00192-00198 and is listed at its first position; SEQNO 38 occupies 00199-00203 and is
    // listed at its last.
    expect(addrs(8)).toBe(192);
    expect(emitted(8)?.items[0]?.at).toBe(192);
    expect(addrs(9)).toBe(203);
    expect(emitted(9)?.items[0]?.at).toBe(199);
  });

  it('SEQNO 39 prints its ADDRESS CONSTANT in the INSTRUCTION column: 00315, the DA header', () => {
    // `software.md` §5's own row — an EMITTING declarative renders its cells like an imperative's
    // fields — and it is a cross-check on the DA header resolving HIGH-order.
    expect(emitted(10)?.instruction).toBe('00315');
    expect(symbol('AREA')).toBe(315);
  });

  it('SEQNO 37 assembles the PRIORITY op, which this machine cannot execute — and still assembles', () => {
    // §2.5: the assembler assembles the machine, not the configuration. This is also why there is
    // no execute-the-deck test in this file.
    expect(emitted(8)?.instruction).toBe('Y 00209 X');
    expect(emitted(8)?.flag).toBeUndefined();
  });
});

// ═══ 4. The 00204 card — the low-order proof that owes nothing to the col-7 rule ═══════════

describe('Exhibit IV — the 00204 card: count 00036, loading 00204-00239 (software.md §5)', () => {
  it('one record loads 00204-00239 and its LAST constant is listed at 00239', () => {
    // THE STRONGEST FORM OF THE LOW-ORDER PROOF, because it comes from the PUNCHED DECK rather
    // than the listing: the card's load address and count fix its final byte at 00239, and the
    // last constant on it — `DCW EOJ`, CT 5 — is listed at ADDRS 00239. Nothing about that
    // depends on which assembler punched the card, and nothing about it depends on the column-7
    // rule either, which is why §11.2 makes this the row that carries the proof.
    const record = AT.packed.records.find((r) => r.loadAddress === 204);
    expect(record).toBeDefined();
    expect(record?.payload.length).toBe(36);
    expect((record?.loadAddress ?? 0) + (record?.payload.length ?? 0) - 1).toBe(239);
    expect(ct(14)).toBe(5);
    expect(addrs(14)).toBe(239);
    expect(emitted(14)?.items[0]?.at).toBe(235);
  });

  it('the card that precedes it ends at 00203, so 00204 really is a card boundary', () => {
    const first = AT.packed.records[0];
    expect((first?.loadAddress ?? 0) + (first?.payload.length ?? 0) - 1).toBe(203);
    expect(AT.packed.records[1]?.loadAddress).toBe(204);
  });
});

// ═══ 5. The DA, on a line that carries an F ════════════════════════════════════════════════

describe('Exhibit IV — `DA 1X80,G` at 00315 with sub-entries at 00318 and 00394', () => {
  it('FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS: the three addresses, on a line WE flag F', () => {
    // §2.2's `,G` row flags `F` because `encodeObjectRecord` refuses a word mark over a group
    // mark by design (`OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK`, a Phase-2 `[likely]` constant this
    // phase records and escalates rather than patches, §2.4). The flag does NOT un-reserve the
    // area: 81 positions are still reserved, the header still resolves HIGH-order to 00315, and
    // both sub-entries still resolve LOW-order.
    expect(FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS).toBe(true);
    expect(AT.p1.lines.find((l) => l.seqno === 17)?.flag).toBe('F');
    expect(addrs(17)).toBe(315);
    expect(ct(17)).toBe(81);
    expect(addrs(18)).toBe(318);      // 00315 + 4 - 1
    expect(addrs(19)).toBe(394);      // 00315 + 80 - 1
    expect(AT.p1.reserved).toContainEqual({ from: 315, to: 395, label: 'AREA' });
  });

  it('asserts the three addresses, and what WE emit — nothing about what IBM punched', () => {
    // §11.2's warning, written out: Appendix C's DA line shows a BLANK CARD column despite
    // requesting a group-mark-word-mark, and `open-questions.md`'s own row says "do not conclude
    // DA emits nothing; assume the GMWM card is punched elsewhere in the deck". So what this file
    // may state is what WE do — we flag it and emit no group mark — and not what IBM punched.
    // The historical question is a row in the dated Phase 3 section of `open-questions.md`.
    const fields = (emitted(17)?.items ?? []).map((item) => item.at);
    expect(fields).toEqual([315, 319]);       // one marked blank per DEFINED field high-order
    expect(AT.p2.items.some((item) => item.at === 395)).toBe(false);   // no group mark emitted
  });
});

// ═══ 6. The literal pool, 00302-00314, in encounter order ══════════════════════════════════

describe('Exhibit IV — the literal pool at 00302-00314 (SEQNO 58-62)', () => {
  it('four literals, in ENCOUNTER order, at the addresses the exhibit lists', () => {
    // SEQNO 58 `LTORG *` at 00302, then IDENT#5 (5) at 00302-00306, a three-character alphameric
    // at 00307-00309, a one-character one at 00310, and CNT#4 (4) at 00311-00314. Every one is
    // listed at its LOW-order position, and the order is the order the four instructions above
    // wrote them — not sorted, and not grouped by kind (`software.md` §3).
    expect(addrs(16)).toBe(302);
    const pool = AT.p1.sized
      .filter((entry) => entry.pooled !== undefined)
      .map((entry) => [entry.pooled?.text, entry.at, entry.length]);
    expect(pool).toEqual([
      ['IDENT#5', 302, 5],
      ['@ABC@', 307, 3],
      ['@X@', 310, 1],
      ['CNT#4', 311, 4],
    ]);
    expect(symbol('IDENT')).toBe(306);
    expect(symbol('CNT')).toBe(314);
  });

  it('the DA header follows the pool at 00315 with no ORG — the pool ends at 00314', () => {
    expect(addrs(17)).toBe(315);
  });
});

// ═══ COL7_CORROBORATION_IS_OS_EVIDENCE ═════════════════════════════════════════════════════

describe('COL7_CORROBORATION_IS_OS_EVIDENCE — OS evidence for a [likely] standalone rule', () => {
  // READ THIS BLOCK'S NAME AS ITS SCOPE. The column-7 rule — "the high-order position will be
  // referenced if the label is indented one column in the label field; that is, if it begins in
  // column 7" — is documented in C28-0326-2 p.28, the OS manual, and is `[likely]` and NOT
  // `[verified]` for the standalone C28-0309-1 assembler (`COL7_INDENT_IS_STANDALONE_TOO`, §15).
  // Exhibit IV's two column-7 DCs are evidence that the rule is REAL. They are not evidence for
  // the low-order/high-order rule itself — using them for that would be circular, and it is
  // exactly the OS/standalone conflation `architecture.md` §8 exists to prevent, which is why
  // they sit in a block of their own rather than beside the assembler-independent rows above.

  it('the two column-7 DCs are listed at 00396 and 00402 — their HIGH-order positions', () => {
    expect(addrs(20)).toBe(396);
    expect(addrs(21)).toBe(402);
    expect(symbol('EOJ')).toBe(396);
    expect(symbol('ERR')).toBe(402);
    expect(AT.p1.symbols.get('EOJ')?.resolvedTo).toBe('highOrder');
  });

  it('CT 6 each, which is what puts the second one at 00402', () => {
    // Five characters plus the position the `,G` group mark would occupy. Exhibit IV prints
    // `@EOJ@,G` for the first, which is four by that arithmetic — see this file's header note 3.
    expect(ct(20)).toBe(6);
    expect(ct(21)).toBe(6);
  });

  it('an address constant naming a column-7 label resolves to the HIGH-order position', () => {
    // SEQNO 14's `DCW EOJ` — the 00204 card's last constant — prints 00396 and not 00400, which
    // is the col-7 rule seen from a second direction inside the same deck.
    expect(emitted(14)?.instruction).toBe('00396');
  });

  it('the constants themselves are what the DCs asked for, minus the group mark we do not emit', () => {
    const first = AT.p2.items.find((item) => item.at === 396);
    const second = AT.p2.items.find((item) => item.at === 402);
    expect([...(first?.cells ?? [])].map((cell) => glyphOf(cell & BCD6)).join('')).toBe('EOJ  ');
    expect([...(second?.cells ?? [])].map((cell) => glyphOf(cell & BCD6)).join('')).toBe('ERROR');
  });
});

// ═══ The whole deck, as one statement about the reconstruction ═════════════════════════════

describe('the reconstruction assembles cleanly except where §2.2 rules a suffix out', () => {
  it('exactly three flagged lines, all F, all of them a `,G`', () => {
    const flagged = AT.p1.lines.filter((line) => line.flag !== undefined);
    expect(flagged.map((line) => [line.seqno, line.flag])).toEqual([[17, 'F'], [20, 'F'], [21, 'F']]);
    expect(AT.p2.statements.filter((s) => s.flag !== undefined)).toEqual([]);
  });

  it('and the entry point is the branch at 00209', () => {
    expect(AT.p1.entry).toBe(209);
  });
});
