// src/asm/mnemonics.ts — Autocoder mnemonic -> { opChar, d, shape }.
//
// DERIVED from src/core/isa/table.ts and src/core/isa/dmods.ts wherever a derivation exists,
// with Phase-3-owned rows ONLY where it does not (docs/plans/phase-3-autocoder.md §7).
// `table.ts` is on the do-not-touch list, so this file is *keyed to* the core tables and
// *diffable against* them: test/asm-mnemonics.test.ts runs containment in both directions,
// and a research correction that adds a name to either source fails that test until this
// file catches up (plan §7.4).
//
// THE AUTOCODER-VS-MACHINE COLLISION, stated at the head because it is the first thing that
// misleads a reader (opcodes.md §1.6, [verified]): Autocoder `M` = Multiply but the machine
// op-code character `M` = move-mode I/O; Autocoder `D` = Divide but machine `D` = Move.
// Resolution keys on the MNEMONIC, so the collision cannot bite the resolver — only a reader.
//
// WHAT `OPS[].autocoder` IS AND IS NOT (plan §7.1, all four points read off the file):
//   1. There is no mnemonic -> d map. `OP_R.autocoder` carries eight names and no d at all.
//   2. Two entries are PATTERNS, not names: `OP_D`'s `M{L,R}{…}{…}` and `SCN{L,R}{…}`.
//   3. The lists are incomplete — `opcodes.md` §2's `J`, `L` and `M` rows end in a literal `…`
//      which `table.ts`'s plain string arrays cannot carry.
//   4. `'RW#'` USED to appear under BOTH `OP_L` (0o43) and `OP_M` (0o44), which made
//      mnemonic -> opChar not a function. `OP_M`'s copy was a transcription artifact and is
//      gone (2026-08-31, A22-0526-3 Fig 107 p.104 + C28-0309-1 p.47). The mapping IS a
//      function now; `AMBIGUOUS` below is empty. See RW_HASH_IS_LOAD_MODE.
//
// SCOPE, not capability: every row of `OPS` RESOLVES, including the `implemented: false` ones
// (`Y` `U` `2` `4` `X` `P` `Q`). `BXPA /PCH/` assembles to `Y /PCH/` and the MACHINE rejects it
// at run time with UnimplementedOp — which is why Exhibit IV is an assembly-only oracle
// (plan §2.5, architecture.md §8). Rows this configuration cannot execute carry
// `unimplemented: true`, for the listing only.

import { glyphOf } from '../core/bcd.js';
import {
  J_D_TABLE,
  MOVE_DIRECTION,
  MOVE_PORTION,
  RX_RELEASE_D_GLYPH,
  RX_STATUS_BITS,
  V_D_TABLE,
  X1_CHANNEL,
  X2_DEVICE,
} from '../core/isa/dmods.js';
import { ALL_OPS, Y_BQPR2_D_UNVERIFIED, opByChar } from '../core/isa/table.js';
import type { OpEntry } from '../core/types.js';

// ═══ The `// OPEN:` ledger for this file — plan §15, one named export per row ═══════════════

/**
 * SETTLED 2026-08-31: `RW_HASH_IS_LOAD_MODE` — `[verified]`, was `[likely]`. `RW#` = "Read
 * **W**ith word marks" = load mode = machine op `L` (0o43). A22-0526-3 Figure 107 p.104 gives the
 * family one row, `R(#)w° 0,b` -> `M or L x¹10 (B) R`, and its legend reads `w` = "W if WM (load
 * mode)" — the `W` selects `L`, its absence `M`. C28-0309-1 p.47 lists the same family expanded:
 * `R`/`R1`/`R2` and `RO`/`R1O`/`R2O` on `M`, `RW`/`R1W`/`R2W` and `RWO`/`R1WO`/`R2WO` on `L`, with no
 * RW-family form on `M` anywhere. `OP_M`'s copy of the name WAS a transcription artifact — flattening
 * Figure 107's combined "M or L" rows into two op rows duplicates the load-mode name — and the
 * escalation was accepted: `opcodes.md` §2 row 207 and `OP_M.autocoder` no longer carry it, so
 * `AMBIGUOUS` below is empty and mnemonic -> opChar is a function.
 */
export const RW_HASH_IS_LOAD_MODE = true;

/**
 * OPEN: `BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY` — `[unverified]`. `BEX1`/`BEX2` are in
 * `OP_R`/`OP_X.autocoder` and pinned by nothing: `RX_STATUS_BITS` has six rows and `dmods.ts`
 * deliberately omits `BRC1`/`BRC2` for the same reason (`opcodes.md` §6.2). d = `9` = bits
 * 8+1 = Condition OR Not Ready, which is what the shipped loader executes at 00292.
 * Fallback: drop `BEX1`/`BEX2` and flag `O`.
 */
export const BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY = '9';

/**
 * OPEN: `V_ZONE_WORD_IS_THE_THIRD_OPERAND` — `[unverified]`. `V_D_TABLE.autocoder` prints the
 * manual's space-separated form, `'BZN (I)(B) AB'`, with four rows sharing `BZN` (d `2 B K S`)
 * and four sharing `BWZ` (d `3 C L T`). Ruling: the zone word is the explicit THIRD OPERAND,
 * `BZN LOOP,SWITCH,AB`. The two readings diverge on a real case: `BZN a,b,B` is d = `K` under
 * this reading and d = `B` under the raw-d one. Fallback: accept the concatenated mnemonics
 * `BZNAB` / `BWZA` / … instead, or take the third operand as the literal d. (opcodes.md §6.3.)
 */
export const V_ZONE_WORD_IS_THE_THIRD_OPERAND = true;

/**
 * OPEN: `T_MNEMONIC_SUFFIX_IS_THE_D_BITS` — `[likely]`. The letters after the leading `L` of a
 * Table Lookup mnemonic are the d bits, `L`=1 `E`=2 `H`=4 summed: `LL` 1, `LE` 2, `LLE` 3,
 * `LH` 4, `LLH` 5, `LEH` 6. All six of `opcodes.md` §2's `T` d-list agree. Fallback: a
 * hand-written 6-row table with identical values, so the fallback is free.
 */
export const T_MNEMONIC_SUFFIX_IS_THE_D_BITS = true;

/**
 * OPEN: `MOVE_MNEMONIC_IS_DIR_PORTION_TERM` — `[likely]`, corroborated four ways.
 * `('M' | 'SCN') + direction.dirLetter + portion.letters + direction.termLetter`, with
 * `d = direction.key | portion.key` (A22-0526-3 Figure 21 p.26; `opcodes.md` §3.1).
 * The four hits already in this repo, zero misses: `MLCB` -> 0x20|3 = 0o43 = `L`, which is
 * Exhibit IV's `D 00394 00306 L`; `MLC` -> 0x30|3 = 0o63 = `C`, which is `software.md` §3's
 * `D0079600596C`; `MLCWS` -> 0x00|7 = `7` and `MRCWG` -> 0x28|7 = 0o57 = `Δ`, the two `D`
 * instructions in the SHIPPED loader at 00318 and 00330. Fallback: a hand-transcribed 64-row
 * table from Figure 21.
 */
export const MOVE_MNEMONIC_IS_DIR_PORTION_TERM = true;

/**
 * OPEN: `CARRIAGE_MNEMONIC_TAKES_THE_D_AS_ITS_ONLY_OPERAND` — `[likely]`. CARRIAGE ONLY:
 * `F` -> `CC1`, `2` -> `CC2`. `CARRIAGE_D_TABLE` (`dmods.ts` §6.4 / `opcodes.md` §6.4,
 * A22-0526-3 p.81 Figure 90) gives 30 rows and NO per-d Autocoder mnemonics, so `CC1 1`
 * writes the d literally as its only operand. Fallback: per-d mnemonics, if a C28-0309-1 page
 * ever surfaces.
 */
export const CARRIAGE_MNEMONIC_TAKES_THE_D_AS_ITS_ONLY_OPERAND = true;

/**
 * OPEN: `STACKER_MNEMONIC_TAKES_THE_POCKET_AS_ITS_ONLY_OPERAND` — `[likely]`. `K` (0o42) is
 * `SSF1` and `4` (0o4) is `SSF2` — **Select Stacker and Feed**, a DIFFERENT family from the
 * carriage (`opcodes.md` §2, A22-0526-3 pp.62-63). Their d comes from the op's own inline
 * `dModifiers` (`0` pocket NR, `1` pocket 1, `2` pocket 8-2), not from `CARRIAGE_D_TABLE`, and
 * like the carriage ops they take the d as their only operand: `SSF1 1`. Recorded because an
 * earlier plan draft folded `K`/`4` under the carriage rule and left both names unresolvable.
 * Fallback: per-d mnemonics, as for the carriage.
 */
export const STACKER_MNEMONIC_TAKES_THE_POCKET_AS_ITS_ONLY_OPERAND = true;

/**
 * SETTLED 2026-08-31: `WM_HASH_STAYS_AS_SHIPPED` — `[verified]`, was `[unverified]`, and the
 * REASON recorded here was wrong even though the ruling was right. `WM#` is not "write with word
 * marks" and never was a load-mode form: A22-0526-3 Figure 107 p.105 lists **Write Word Marks As
 * 1's** as `WM(#)° b` -> `M x¹21 (B) W` — no `w` suffix and no `L` alternative, unlike the
 * `W(#)w°` printer row above it — and p.80 says the same in prose. C28-0309-1 p.47: `WM  WRITE
 * WORDMARKS - CHANNEL 1   M %21 34567 W`, with `WM1`/`WM2` and overlapped `WMO` (`M @21`). `WM` is
 * a distinct printer function selected by **x³ = 1** (print the word marks) against `W`'s **x³ = 0**.
 * BOTH ARE THE PRINTER, x² = 2 — Figure 107 p.105's field diagram puts the 1403 at x² and the
 * "I/O Unit No. or Specific Operation" at x³, which is exactly why the two fields read `%21` and
 * `%20` and differ in their LAST position. (An earlier note here said x2 = 1 against x2 = 0; the
 * ruling was right and the position name was wrong.) So the `W`-selects-load-mode rule never
 * applied to it, and it stays on `OP_M` on the merits, not as a default.
 */
export const WM_HASH_STAYS_AS_SHIPPED = true;

/**
 * RETIRED 2026-08-31: `IO_OPERAND_IS_XCONTROL_BADDR_D` — SETTLED AGAINST, and the constant is
 * gone rather than flipped, because nothing read it. It claimed that an I/O mnemonic supplies
 * only the op character and a channel digit and that the programmer writes the x-control field
 * as operand 1 (`RW1 %10,LINE,$` -> `L %10 00564 $`). It was inherited from `loader.ts`'s
 * Phase-2 regenerable-source comment, and it was the manual's TAPE convention applied to a card
 * op: C28-0309-1 p.23's "Magnetic Tape Commands … 3. Write the X-control field as the A-operand
 * of the tape instruction" is the ONE place that facility is defined, and `CU %U2,W` (p.48) is
 * the single row in the whole I/O table shaped that way.
 *
 * The unit-record statement is not shaped that way, on four independent readings:
 *  · A22-0526-3 Figure 107 pp.104-105 gives each family ONE generative row — `R(#)w° 0,b`,
 *    `P(#)w° 0,b`, `W(#)° b`, `WM(#)° b`, `RCPw° b` — whose operand is a POCKET and an address,
 *    or an address alone. p.62 prints the channel digit INFIXED: "RW or R1W (Ch 1) / R2W (Ch 2)".
 *  · C28-0309-1 pp.47-48 list the same families expanded — twelve card-read rows, eighteen
 *    printer rows, sixteen punch rows, eight console rows — and every operand cell is `0,B`,
 *    `1,B`, `2,B` or a bare `B`. The x-control field appears only in the INSTRUCTION column.
 *  · C28-0309-1 pp.23-24 — the sentence straddles the page break: "A read command must have as
 *    the first entry in its operand either the number of the stacker … The address (symbolic or
 *    actual) of the storage area … must be the second entry." Two entries, and neither is an
 *    x-control field.
 *  · C28-0309-1 p.41: where the programmer must supply a d, "a D appears in the operand column";
 *    across pp.41-58 only BCE (p.44), BBE, BEX1 and BEX2 (p.45) carry it — all branches, no I/O
 *    data transfer. The unit-record d is baked (p.21, "supplied automatically for unique
 *    mnemonics").
 *
 * So the mnemonic supplies x1 (channel + overlap) and x2 (device) and the d; x3 is the pocket
 * the programmer writes, or a value the family bakes. See `IO_FAMILIES` below, and
 * `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS` in `operand.ts` for the one exception kept.
 */

/**
 * OPEN: `STANDALONE_HAS_NO_NOP_PSEUDO_OP` — `[unverified]`, and this REVERSES a recorded
 * research default. `software.md` §6's own footnote says the NOP / NOPWM row "was not
 * confirmed against C28-0309-1's op tables"; `open-questions.md`'s software row offers the
 * opposite default ("Accept both mnemonics in the assembler"). Phase 3 declines it because the
 * standalone op table is unconfirmed and the whole phase is scoped to C28-0309-1, so the
 * PROGRAM-SWITCH pseudo-ops NOP and NOPWM are out of scope (plan §2.2).
 *
 * POINT OF USE, here and not in a pseudo-op module: the IMPERATIVE `NOP` is unaffected either
 * way. It is machine op `N` (0o45), `OPS` row 045's only Autocoder mnemonic, and it resolves
 * through the one-mnemonic remainder below like any other imperative. The constant is what
 * says that the `NOP` this file resolves is the instruction and never the pseudo-op —
 * `test/asm-pseudo-ops.test.ts` reads it from here for exactly that reason.
 * Fallback: the research's default — accept both, NOP = word-marked `N`, NOPWM = word-marked
 * `N` followed by an unmarked unconditional branch, both marked OS-era.
 */
export const STANDALONE_HAS_NO_NOP_PSEUDO_OP = true;

// ═══ The resolved row ══════════════════════════════════════════════════════════════════════

/**
 * What an I/O row hands `operand.ts` so it can SYNTHESISE the three-position x-control field.
 * A source deck never writes that field (the retired constant above); the assembler builds it,
 * which is why these two glyphs and the pocket set live on the mnemonic row.
 */
export interface IoControl {
  /** x¹x² — the two glyphs the MNEMONIC alone fixes. x¹ is the `X1_CHANNEL` row for this row's
   *  channel and overlap (`%` `@` `⌑` `*`); x² is the family's `X2_DEVICE` glyph, Figure 107
   *  p.105's "Type of I/O Unit" (`1` 1402 reader, `2` 1403, `4` 1402 punch, `T` 1415 console). */
  readonly prefix: string;
  /** x³ when the FAMILY bakes it — Figure 107 p.105's "I/O Unit No. or Specific Operation":
   *  Write a Line `0`, Write Word Marks As 1's `1`, console `0`. Absent when `pockets` is set. */
  readonly x3?: string;
  /** x³ when the PROGRAMMER writes it — the 1402 stacker pocket, and it is the FIRST operand:
   *  "A read command must have as the first entry in its operand either the number of the
   *  stacker" (C28-0309-1 p.23). Read `0 1 2` and `9` = no stack or feed; punch `0 4 8`
   *  (A22-0526-3 Figure 107 pp.104-105). Absent when `x3` is set. */
  readonly pockets?: readonly string[];
}

export interface MnemonicRow {
  readonly mnemonic: string;
  /** The MACHINE op character — `OPS`'s `opChar`, never the mnemonic (opcodes.md §1.6). */
  readonly opChar: string;
  /** The d the MNEMONIC bakes in. Absent when the programmer writes it, or the op takes none. */
  readonly d?: string;
  /** WHO writes the d — the programmer, not this table. It says nothing about WHERE in the
   *  operand the d sits: that positional ruling (`D_FOLLOWS_THE_ADDRESSES`, plan §15) belongs to
   *  wave 3's `operand.ts`, which owns the constant and the `// OPEN:` comment at its point of use
   *  (plan §5.2's "The explicit d", §11 wave 3). This file declares no constant for it because
   *  nothing here depends on it — `software.md` §4's `BCE ENTRYA,SWITCH,2` is the example. */
  readonly dFromOperand: boolean;
  /** Carriage and stacker only: the d is the ONLY operand — `CC1 1`, `SSF1 1`. */
  readonly dIsOnlyOperand: boolean;
  /** The `lengths: [10]` I/O form carries a three-position x-control field, which is NOT an
   *  address (`AddressKind` `'xcontrol'`, types.ts; plan §5.2 step 3 rule 1). Since 2026-08-31
   *  the field is SYNTHESISED from `io` and never written, so this is exactly `io !== undefined`
   *  — `makeRow` derives it so the two cannot drift. */
  readonly xcontrol: boolean;
  /** I/O only: what `operand.ts` builds the x-control field out of. */
  readonly io?: IoControl;
  /** I/O only: the channel this mnemonic names. `R1` and a bare `R` are both channel 1 — Figure
   *  107 p.105's legend, "`(#)` = 1 or 2 for Ch, but the 1 may be omitted" — and `R2` is channel
   *  2. The console printer writes no digit and is channel 1. It is redundant with `io.prefix`'s
   *  x¹ and kept because it is the fact a reader checks against the manual. */
  readonly channel?: 1 | 2;
  /** I/O only: the `#` name in `OPS[].autocoder` and `opcodes.md` §2 that this row's family was
   *  generated from. All six of `RW` `R1W` `R2W` `RWO` `R1WO` `R2WO` carry `'RW#'`; the four
   *  console reads carry `'RCP'` or `'RCPW'`, which the core table holds in full. Containment
   *  direction 1 reads `sourceName ?? mnemonic` (plan §7.4). */
  readonly sourceName?: string;
  /** `V`'s third operand, the zone WORD -> the d it selects (V_ZONE_WORD_IS_THE_THIRD_OPERAND). */
  readonly zoneWords?: Readonly<Record<string, string>>;
  /** Every length this op's forms carry, deduplicated and ascending. THE ANY SENTINEL IS THE
   *  EMPTY ARRAY (`ANY_LENGTH`, table.ts:88) and it is what `N` carries — plan §6.1: the check
   *  must read `lengths.length === 0 || lengths.includes(n)`, and a naive `includes` throws on
   *  every NOP. `lengths` VALIDATES an assembled length and never drives it (plan §6.1). */
  readonly lengths: readonly number[];
  readonly addressDouble: boolean;
  readonly chainable: boolean;
  /** This configuration cannot EXECUTE it; it still assembles, and the listing says so (§2.5). */
  readonly unimplemented: boolean;
  /** Research file + section for the row's behaviour. */
  readonly cite: string;
}

/** Names carried under more than one op character, so mnemonic -> opChar would not be a function
 *  (plan §7.1 point 4, §7.2). **Empty since 2026-08-31**: its only member, `RW#`, was `opcodes.md`
 *  §2 row 207's transcription artifact and is gone from both the research row and `OP_M.autocoder`
 *  (see RW_HASH_IS_LOAD_MODE). The export stays as the fourth exit in `test/asm-mnemonics.test.ts`'s
 *  `accountedFor`, so a future duplicate has a home without re-plumbing the test. An entry would be
 *  the `#` SOURCE NAME — the string in `OPS[].autocoder`; for `RW#` what resolves is the six
 *  generated spellings `RW` `R1W` `R2W` `RWO` `R1WO` `R2WO`.
 *  The `readonly string[]` annotation is load-bearing: a bare `[]` infers `never[]`. */
export const AMBIGUOUS: readonly string[] = [];

export interface OutOfScopeRow {
  readonly name: string;
  readonly reason: string;
}

/**
 * Names that appear in `OPS[].autocoder` or in a per-op d-table and DELIBERATELY do not
 * resolve, each with the reason (plan §7.4 directions 2a and 2b). This list is what keeps the
 * containment tests honest: a name is either resolvable or it is here, never neither.
 */
export const OUT_OF_SCOPE: readonly OutOfScopeRow[] = [
  // ── Tape: no device on this configuration (DECISIONS.md 2026-08-30, KISS peripherals) ──
  { name: 'BSP', reason: 'tape Unit Control (op U) — no tape device' },
  { name: 'SKP', reason: 'tape Unit Control (op U) — no tape device' },
  { name: 'RWD', reason: 'tape Unit Control (op U) — no tape device' },
  { name: 'RWU', reason: 'tape Unit Control (op U) — no tape device' },
  { name: 'WTM', reason: 'tape Unit Control (op U) — no tape device' },
  { name: 'RT', reason: 'tape read, move mode (op M) — no tape device' },
  { name: 'RTB', reason: 'tape read binary, move mode (op M) — no tape device' },
  { name: 'WT', reason: 'tape write, move mode (op M) — no tape device' },
  { name: 'WTB', reason: 'tape write binary, move mode (op M) — no tape device' },
  { name: 'RTW', reason: 'tape read with word marks (op L) — no tape device' },
  { name: 'WTW', reason: 'tape write with word marks (op L) — no tape device' },
  // ── Disk ──
  { name: 'SD', reason: 'Seek Disk (op M) — no disk, KISS peripherals (DECISIONS.md 2026-08-30)' },
  // ── MICR, the 1412 / 1419 short-form control ops (opcodes.md §2 rows P / Q, §9.2) ──
  { name: 'ECR1', reason: 'MICR engage, channel 1 (op P) — no 1412/1419' },
  { name: 'DCR1', reason: 'MICR disengage, channel 1 (op P) — no 1412/1419' },
  { name: 'SS1', reason: 'MICR stacker select, channel 1 (op P) — no 1412/1419' },
  { name: 'ECR2', reason: 'MICR engage, channel 2 (op Q) — no 1412/1419' },
  { name: 'DCR2', reason: 'MICR disengage, channel 2 (op Q) — no 1412/1419' },
  { name: 'SS2', reason: 'MICR stacker select, channel 2 (op Q) — no 1412/1419' },
  // ── The one name the CORE TABLE's own constant excludes ──
  {
    name: 'BQPR2',
    reason:
      'Y Priority, channel 2 outquiry request: its d "is not safely determined" (opcodes.md §9.1) '
      + `and table.ts exports Y_BQPR2_D_UNVERIFIED = ${String(Y_BQPR2_D_UNVERIFIED)} rather than `
      + 'guessing, so it is deliberately absent from Y_DMODS. The other thirteen OP_Y names resolve',
  },
  // ── Direction-2b names: in a per-op d-table, in no `OPS[].autocoder` (plan §7.4 assertion 4) ──
  // BSS A-BSS G are 1401-Compatibility sense switches AND the only mnemonics carrying an
  // embedded blank, whose placement inside the 5-column operation field is unattested — the
  // plan's own ruling, and the reason they are excluded BY NAME rather than derived.
  { name: 'BSS A', reason: '1401-mode sense switch A; embedded blank, placement in cols 16-20 unattested' },
  { name: 'BSS B', reason: '1401-mode sense switch B; embedded blank, placement in cols 16-20 unattested' },
  { name: 'BSS C', reason: '1401-mode sense switch C; embedded blank, placement in cols 16-20 unattested' },
  { name: 'BSS D', reason: '1401-mode sense switch D; embedded blank, placement in cols 16-20 unattested' },
  { name: 'BSS E', reason: '1401-mode sense switch E; embedded blank, placement in cols 16-20 unattested' },
  { name: 'BSS F', reason: '1401-mode sense switch F; embedded blank, placement in cols 16-20 unattested' },
  { name: 'BSS G', reason: '1401-mode sense switch G; embedded blank, placement in cols 16-20 unattested' },
  { name: 'BB1', reason: 'branch on binary card, channel 1 — column-binary card feature, not installed' },
  { name: 'BB2', reason: 'branch on binary card, channel 2 — column-binary card feature, not installed' },
  { name: 'BOQ', reason: 'branch on outquiry, channel 1 — needs the 1414 model 4/5 serial adapter' },
  { name: 'BOQ1', reason: 'branch on outquiry, channel 1 — needs the 1414 model 4/5 serial adapter' },
];

const OUT_OF_SCOPE_NAMES: ReadonlySet<string> = new Set(OUT_OF_SCOPE.map((r) => r.name));

// ═══ Construction helpers ══════════════════════════════════════════════════════════════════

function mustOp(opChar: string): OpEntry {
  const op = opByChar(opChar);
  if (op === undefined) throw new RangeError(`mnemonics.ts: no OPS row for op char '${opChar}'`);
  return op;
}

/** Every length the op's forms carry. Empty = `ANY_LENGTH`, the sentinel — see MnemonicRow. */
function lengthsOf(op: OpEntry): readonly number[] {
  const all = new Set<number>();
  for (const form of op.forms) for (const n of form.lengths) all.add(n);
  return [...all].sort((a, b) => a - b);
}

/** True when ANY form of the op accepts a d at all — `'none'` is the only form that does not. */
function takesADModifier(op: OpEntry): boolean {
  return op.forms.some((form) => form.dModifiers !== 'none');
}

interface RowInit {
  readonly d?: string;
  readonly dFromOperand?: boolean;
  readonly dIsOnlyOperand?: boolean;
  readonly io?: IoControl;
  readonly channel?: 1 | 2;
  readonly sourceName?: string;
  readonly zoneWords?: Readonly<Record<string, string>>;
  /** Defaults to `!op.implemented` — the §2.5 rule. */
  readonly unimplemented?: boolean;
  readonly cite: string;
}

function makeRow(opChar: string, mnemonic: string, init: RowInit): MnemonicRow {
  const op = mustOp(opChar);
  return {
    mnemonic,
    opChar,
    ...(init.d === undefined ? {} : { d: init.d }),
    dFromOperand: init.dFromOperand ?? false,
    dIsOnlyOperand: init.dIsOnlyOperand ?? false,
    xcontrol: init.io !== undefined,
    ...(init.io === undefined ? {} : { io: init.io }),
    ...(init.channel === undefined ? {} : { channel: init.channel }),
    ...(init.sourceName === undefined ? {} : { sourceName: init.sourceName }),
    ...(init.zoneWords === undefined ? {} : { zoneWords: init.zoneWords }),
    lengths: lengthsOf(op),
    addressDouble: op.addressDouble,
    chainable: op.chainable,
    unimplemented: init.unimplemented ?? !op.implemented,
    cite: init.cite,
  };
}

/** The `dModifiers` map of a form, or `undefined` when the form prints a word instead. */
function dMapOf(op: OpEntry, formIndex: number): Readonly<Record<string, string>> | undefined {
  const mods = op.forms[formIndex]?.dModifiers;
  return mods === undefined || typeof mods === 'string' ? undefined : mods;
}

// ═══ §7.3 family 1 — op `D` Move / Scan, all 64, derived ═══════════════════════════════════
// MOVE_PORTION (8 rows, `d & 0x07`) × MOVE_DIRECTION (8 rows, `d & 0x38`) = the 64 d-characters
// of opcodes.md §3.2. The scan portion (`key: 0`, `letters: ''`) takes the `SCN` prefix; the
// other seven take `M`. Note the SUBSTITUTE-BLANK TRAP the two tables already carry: `SCNLA`
// is d octal 20 (`ƀ`, A bit only) while `SCNLS` is d octal 00 (a true blank) — two different
// instructions, and `glyphOf` is what keeps them apart (dmods.ts, charset.md §2).
function moveScanRows(): MnemonicRow[] {
  const rows: MnemonicRow[] = [];
  for (const dir of MOVE_DIRECTION) {
    for (const portion of MOVE_PORTION) {
      const prefix = portion.portion === 'scan' ? 'SCN' : 'M';
      rows.push(
        makeRow('D', `${prefix}${dir.dirLetter}${portion.letters}${dir.termLetter}`, {
          d: glyphOf(dir.key | portion.key),
          cite: 'opcodes.md §3.1-§3.2 / A22-0526-3 Figures 19, 21 pp.25-26 (MOVE_MNEMONIC_IS_DIR_PORTION_TERM)',
        }),
      );
    }
  }
  return rows;
}

// ═══ §7.3 family 2 — op `J` conditional branches, EVERY row of J_D_TABLE ═══════════════════
// Not twelve: `J_D_TABLE` carries 33 mnemonics across its rows, including the channel-2 twins
// (BC92, BCV2, BPCB2, BNQ2), the overlap pair BOL1 / BOL2, and names in NO `OPS[].autocoder`
// at all (BC91, BCV1, BPCB1, BNQ1 and the eight above). `available: false` rows resolve and
// are marked unimplemented (§2.5); the eleven on OUT_OF_SCOPE do not resolve at all.
function jRows(): MnemonicRow[] {
  const rows: MnemonicRow[] = [];
  for (const row of J_D_TABLE) {
    for (const name of row.autocoder) {
      if (OUT_OF_SCOPE_NAMES.has(name)) continue;
      rows.push(makeRow('J', name, {
        d: row.d,
        unimplemented: !row.available,
        cite: `opcodes.md §6.1 / ${row.cite}`,
      }));
    }
  }
  return rows;
}

// ═══ §7.3 family 3 — ops `R` / `X`, the channel I/O status branches ════════════════════════
// Six of eight derive from RX_STATUS_BITS' `dAlone` (`[0]` = channel 1 -> `R`, `[1]` = channel
// 2 -> `X`). `BA1`/`BA2` take RX_RELEASE_D_GLYPH, the group mark, the only form that releases
// the channel interlock without a branch. `BEX1`/`BEX2` are the pair nothing pins — see
// BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY. NOTE `BNT1`/`BNT2`: `dAlone` is the SUBSTITUTE BLANK
// `ƀ` (octal 20), not an ASCII space (dmods.ts's own SUBSTITUTE-BLANK TRAP note).
const RX_CITE = 'opcodes.md §6.2 / A22-0526-3 p.37 Figure 36';
function rxRows(): MnemonicRow[] {
  const rows: MnemonicRow[] = [];
  for (const bit of RX_STATUS_BITS) {
    rows.push(makeRow('R', bit.autocoder[0], { d: bit.dAlone, cite: RX_CITE }));
    rows.push(makeRow('X', bit.autocoder[1], { d: bit.dAlone, cite: RX_CITE }));
  }
  rows.push(makeRow('R', 'BA1', { d: RX_RELEASE_D_GLYPH, cite: `${RX_CITE}; A22-0526-3 pp.37, 41` }));
  rows.push(makeRow('X', 'BA2', { d: RX_RELEASE_D_GLYPH, cite: `${RX_CITE}; A22-0526-3 pp.37, 41` }));
  rows.push(makeRow('R', 'BEX1', {
    d: BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY,   // OPEN: see the constant above
    cite: 'opcodes.md §6.2 (BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY, [unverified])',
  }));
  rows.push(makeRow('X', 'BEX2', {
    d: BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY,   // OPEN: see the constant above
    cite: 'opcodes.md §6.2 (BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY, [unverified])',
  }));
  return rows;
}

// ═══ §7.3 family 4 — op `T` Table Lookup, and op `G` Store Address Register ════════════════
// T: the letters after the leading `L` are the d bits, summed (T_MNEMONIC_SUFFIX_IS_THE_D_BITS).
// G: the d is the mnemonic's SECOND letter — SAR/SBR/SER/SFR -> A/B/E/F.
const T_SUFFIX_BITS: Readonly<Record<string, number>> = { L: 1, E: 2, H: 4 };

function tRows(): MnemonicRow[] {
  const op = mustOp('T');
  return op.autocoder.map((name) => {
    let bits = 0;
    for (const letter of name.slice(1)) {
      const bit = T_SUFFIX_BITS[letter];
      if (bit === undefined) throw new RangeError(`mnemonics.ts: T mnemonic '${name}' has no d bit for '${letter}'`);
      bits |= bit;
    }
    return makeRow('T', name, {
      d: String(bits),
      cite: 'opcodes.md §2 T row / A22-0526-3 pp.29-30 (T_MNEMONIC_SUFFIX_IS_THE_D_BITS)',
    });
  });
}

function gRows(): MnemonicRow[] {
  const op = mustOp('G');
  return op.autocoder.map((name) =>
    makeRow('G', name, {
      d: name.slice(1, 2),
      cite: 'opcodes.md §2 G row / A22-0526-3 p.22',
    }),
  );
}

// ═══ §7.4 — op `V`, the nine d-characters behind three mnemonics ═══════════════════════════
// V_D_TABLE.autocoder prints the manual's own space-separated form: `'BZN (I)(B) AB'`. The
// leading token is the mnemonic; anything after `(I)(B)` is the ZONE WORD, which under
// V_ZONE_WORD_IS_THE_THIRD_OPERAND is written as the third operand rather than as a raw d.
// Four rows share BZN (d `2 B K S`), four share BWZ (d `3 C L T`), and BW stands alone (d `1`).
function vRows(): MnemonicRow[] {
  const bases = new Map<string, string>();
  const zones = new Map<string, Record<string, string>>();
  for (const row of V_D_TABLE) {
    const parts = row.autocoder.split(/\s+/).filter((p) => p.length > 0);
    const name = parts[0];
    if (name === undefined) throw new RangeError('mnemonics.ts: empty V_D_TABLE autocoder cell');
    const zoneWord = parts.slice(2).join(' ');   // parts[1] is the manual's `(I)(B)` placeholder
    if (zoneWord === '') {
      bases.set(name, row.d);
    } else {
      let byZone = zones.get(name);
      if (byZone === undefined) {
        byZone = {};
        zones.set(name, byZone);
      }
      byZone[zoneWord] = row.d;
    }
  }
  const rows: MnemonicRow[] = [];
  for (const [name, d] of bases) {
    const zoneWords = zones.get(name);
    rows.push(makeRow('V', name, {
      d,
      ...(zoneWords === undefined ? {} : { zoneWords }),
      cite: 'opcodes.md §6.3 / A22-0526-3 p.39 Figure 37 (V_ZONE_WORD_IS_THE_THIRD_OPERAND)',
    }));
  }
  return rows;
}

// ═══ §7.4 — the `L` / `M` I/O family, GENERATED THE WAY THE MANUAL GENERATES IT ════════════
// "The family" is not one thing: `L` (0o43) is LOAD mode and `M` (0o44) is MOVE mode, and the
// demo depends on landing `R1W` on one and `W1` on the other. The rule under all of it: the `W`
// that means "with word marks" selects `L`, its absence selects `M` — `[verified]` off A22-0526-3
// Figure 107 pp.104-105, whose legend spells the rule out (`w` = "W if WM (load mode)") and whose
// combined rows read `M or L`, and off C28-0309-1 pp.47-48, which lists both sides expanded.
//
// FIGURE 107 pp.104-105 GIVES EACH FAMILY ONE ROW WITH GENERATIVE SUFFIXES, and this table is
// that row transcribed rather than the expansion transcribed:
//
//     Read a Card, Stack in Pocket 0/1/2, or 9 = No Stack or Feed   R(#)w° 0,b  -> M or L x¹10 (B) R   p.62
//     Punch a Card, Stack in Pocket 0/4/8                           P(#)w° 0,b  -> M or L x¹40 (B) W   p.63
//     Write a Line                                                  W(#)°  b    -> M     x¹20 (B) W    p.80
//     Write a Line, WM Create Blanks in Printing                    W(#)W° b    -> L     x¹20 (B) W    p.80
//     Write Word Marks As 1's                                       WM(#)° b    -> M     x¹21 (B) W    p.80
//     Read / Write Console Printer                                  RCPw° b     -> M or L x¹T0 (B) R/W p.47
//
// with the legend on p.105: `#` = 1 or 2 for Ch · `(#)` = 1 or 2 for Ch, BUT THE 1 MAY BE
// OMITTED · `w` = W if WM (load mode) · `°` = O if overlap. So a family's names are
// {bare, `1`, `2`} × {plain, `W`} × {plain, `O`}, and the CHANNEL DIGIT IS INFIXED immediately
// after the family stem — A22-0526-3 p.62 prints "RW or R1W (Ch 1) / R2W (Ch 2)", and
// C28-0309-1 p.47 lists `RW R1W R2W RWO R1WO R2WO` in that spelling. `WM` is the one family that
// SUFFIXES the digit (`WM(#)°`) and the one with no load-mode form at all.
//
// THE OVERLAP FORMS ARE GENERATED even though this configuration has no Processing Overlap, for
// the same reason the channel-2 forms are: the assembler assembles the MACHINE, not this
// configuration (plan §2.5). Both resolve, both assemble, and since 2026-08-31 both carry
// `unimplemented: true` — the machine raises `unsupportedFeature` on an `@` or `*` x1 and
// `unimplementedOp('channel2')` on a `⌑` or `*` (core/types.ts, test/wave7-rejections.test.ts).
//
// WHAT IS DELIBERATELY NOT HERE: `PB1` / `PB2` / `PB1O` / `PB2O`, punch column binary. C28-0309-1
// p.48 lists them at `M %80`, but `docs/research/io.md` records column binary as a `[verified]`
// NEGATIVE result for the 1410 and `X2_DEVICE` has no `8` row. That contradiction is recorded in
// `open-questions.md`, not resolved in code.

/** A22-0526-3 Figure 107 p.104: pockets 0, 1, 2, and 9 = "1402 No Stack or Feed Operation".
 *  C28-0309-1 pp.23-24 give the same set in prose, the sentence straddling the page break: "A
 *  0-punch selects cards into stacker pocket 0; a 1-punch, into stacker pocket 1; and a 2-punch,"
 *  ends p.23 and p.24 opens "into stacker pocket 8/2. A 9-punch indicates that a select stacker
 *  command will follow." */
const READ_POCKETS: readonly string[] = ['0', '1', '2', '9'];
/** A22-0526-3 Figure 107 p.104 (`x¹40` / `x¹44` / `x¹48`), C28-0309-1 p.48. */
const PUNCH_POCKETS: readonly string[] = ['0', '4', '8'];

interface IoFamily {
  /** The op-code stem the suffixes hang off: `R`, `P`, `W`, `WM`, `RCP`, `WCP`. */
  readonly stem: string;
  /** Where the channel digit goes. `'infix'` — straight after the stem (`R1W`, p.62). `'suffix'`
   *  — after the whole stem, which only `WM(#)°` does. `'none'` — the console printer is not a
   *  channel device and writes no digit at all (C28-0309-1 p.48's CONSOLE OPERATIONS block). */
  readonly channelDigit: 'infix' | 'suffix' | 'none';
  /** x², an `X2_DEVICE` glyph — Figure 107 p.105's "Type of I/O Unit". */
  readonly device: string;
  /** The d the INSTRUCTION column bakes in: `R` to read, `W` to write (C28-0309-1 pp.47-48). */
  readonly d: string;
  /** x³ when the family fixes it; `pockets` when the programmer writes it. Exactly one. */
  readonly x3?: string;
  readonly pockets?: readonly string[];
  /** The name `OPS[].autocoder` and `opcodes.md` §2 hold for the MOVE-mode half of Figure 107's
   *  one `M or L` row, and for the LOAD-mode half. `load: undefined` = the family has no `w`. */
  readonly move: string;
  readonly load?: string;
  readonly why: string;
}

const IO_FAMILIES: readonly IoFamily[] = [
  {
    stem: 'R', channelDigit: 'infix', device: '1', d: 'R', pockets: READ_POCKETS,
    move: 'R#', load: 'RW#',
    // RW_HASH_IS_LOAD_MODE — settled; OP_M.autocoder no longer carries the load-mode name.
    why: 'read a card, 1402; the `W` form is load mode (RW_HASH_IS_LOAD_MODE, [verified] '
      + 'A22-0526-3 Fig 107 p.104, C28-0309-1 p.47)',
  },
  {
    stem: 'P', channelDigit: 'infix', device: '4', d: 'W', pockets: PUNCH_POCKETS,
    move: 'P#', load: 'PW#',
    why: 'punch a card, 1402 — the punch exists on this configuration, so it is IN '
      + '(A22-0526-3 Fig 107 p.104 / p.63, C28-0309-1 p.48)',
  },
  {
    stem: 'W', channelDigit: 'infix', device: '2', d: 'W', x3: '0',
    move: 'W#', load: 'WW#',
    why: 'write a line, 1403; the `W` form is "WM Create Blanks in Printing" = load mode '
      + '(A22-0526-3 Fig 107 p.105 / p.80, C28-0309-1 p.47)',
  },
  {
    stem: 'WM', channelDigit: 'suffix', device: '2', d: 'W', x3: '1',
    move: 'WM#',
    // WM_HASH_STAYS_AS_SHIPPED — settled; not an exception to the W-selects-load-mode rule.
    why: 'WRITE WORD MARKS AS 1s — the same 1403 (x² = 2) on x³ = 1 against Write a Line\'s '
      + 'x³ = 0, a distinct function and not a load-mode variant, so it has no `w` form at all '
      + '(WM_HASH_STAYS_AS_SHIPPED, [verified] A22-0526-3 Fig 107 p.105 + p.80, C28-0309-1 p.47)',
  },
  {
    stem: 'RCP', channelDigit: 'none', device: 'T', d: 'R', x3: '0',
    move: 'RCP', load: 'RCPW',
    // Read Console Printer is Figure 107's p.104 row; only WRITE Console Printer is on p.105.
    why: 'read the 1415 console printer (A22-0526-3 Fig 107 p.104 / p.47, C28-0309-1 p.48)',
  },
  {
    stem: 'WCP', channelDigit: 'none', device: 'T', d: 'W', x3: '0',
    move: 'WCP', load: 'WCPW',
    why: 'write the 1415 console printer (A22-0526-3 Fig 107 p.105 / p.47, C28-0309-1 p.48)',
  },
];

/** The channel each written digit names. The EMPTY digit is the omitted `1` — Figure 107 p.105:
 *  "`(#)` = 1 or 2 for Ch, but the 1 may be omitted", which is why `R` and `R1` are two spellings
 *  of one instruction and both are in C28-0309-1 p.47's table. */
const IO_CHANNELS: readonly { readonly digit: string; readonly channel: 1 | 2 }[] = [
  { digit: '', channel: 1 },
  { digit: '1', channel: 1 },
  { digit: '2', channel: 2 },
];

/** x¹, off `X1_CHANNEL` rather than transcribed: `%` `@` `⌑` `*` for channel 1/2 × non-overlap/
 *  overlap (`software.md` §10.9, `[verified]`). A miss is an assembler-internal invariant. */
function x1Glyph(channel: 1 | 2, overlap: boolean): string {
  const row = X1_CHANNEL.find(
    (candidate) => candidate.channel === channel && candidate.overlap === overlap && candidate.onThe1410,
  );
  if (row === undefined) {
    throw new RangeError(`mnemonics.ts: X1_CHANNEL has no 1410 row for channel ${channel}${overlap ? ' overlapped' : ''}`);
  }
  return row.glyph;
}

/** x², looked up in `X2_DEVICE` so the family table cannot name a device the machine has no
 *  glyph for — the same reason x¹ is looked up rather than written out. */
function x2Glyph(device: string): string {
  const row = X2_DEVICE.find((candidate) => candidate.glyph === device);
  if (row === undefined) throw new RangeError(`mnemonics.ts: X2_DEVICE has no row for '${device}'`);
  return row.glyph;
}

function ioRows(): MnemonicRow[] {
  const rows: MnemonicRow[] = [];
  for (const family of IO_FAMILIES) {
    const x2 = x2Glyph(family.device);
    // `'none'` is decided BY VALUE on both axes, never by position: the row is selected on
    // `channel === 1 && digit === ''` and the digit is taken from the FAMILY, so reordering
    // `IO_CHANNELS` can neither re-home the console to channel 2 nor produce `RCP1W`.
    // A miss drops the console families outright, which the fifty-name check in
    // test/asm-mnemonics.test.ts catches.
    const channels = family.channelDigit === 'none'
      ? IO_CHANNELS.filter((row) => row.channel === 1 && row.digit === '')
      : IO_CHANNELS;
    const loadForms = family.load === undefined ? [''] : ['', 'W'];
    for (const entry of channels) {
      const { channel } = entry;
      const digit = family.channelDigit === 'none' ? '' : entry.digit;
      for (const load of loadForms) {
        for (const overlap of ['', 'O']) {
          // `WM(#)°` is the only family that puts the digit after the whole stem; every other one
          // infixes it, and the console's digit is the empty string either way.
          const mnemonic = family.channelDigit === 'suffix'
            ? `${family.stem}${digit}${overlap}`
            : `${family.stem}${digit}${load}${overlap}`;
          const sourceName = load === 'W' ? family.load : family.move;
          if (sourceName === undefined) throw new RangeError(`mnemonics.ts: ${mnemonic} has no source name`);
          rows.push(makeRow(load === 'W' ? 'L' : 'M', mnemonic, {
            d: family.d,
            channel,
            sourceName,
            io: {
              prefix: x1Glyph(channel, overlap === 'O') + x2,
              ...(family.x3 === undefined ? {} : { x3: family.x3 }),
              ...(family.pockets === undefined ? {} : { pockets: family.pockets }),
            },
            // NEITHER FORM CAN EXECUTE ON THIS CONFIGURATION, and both still ASSEMBLE (§2.5) —
            // `unimplemented` says only the first (see `MnemonicRow.unimplemented`). Processing
            // Overlap is not installed, so an `@` or `*` x1 raises `unsupportedFeature` (the
            // overlap bit is tested first, so `*` stops there); channel 2 is not installed
            // either, so a `⌑` x1 raises `unimplementedOp('channel2')`. Both rejections are
            // pinned in test/wave7-rejections.test.ts.
            //
            // CHANNEL 2 WAS LEFT UNMARKED UNTIL 2026-08-31 for a reason that no longer holds: the
            // channel lived in the OPERAND's x-control field, so the row could not know it. The
            // mnemonic fixes it now (`R2W` is channel 2 by its own spelling), so the row marks it.
            ...(overlap === 'O' || channel === 2 ? { unimplemented: true } : {}),
            cite: `opcodes.md §2 rows 206/207, io.md §2 — ${family.why}`,
          }));
        }
      }
    }
  }
  return rows;
}

// ═══ §7.4 — carriage `F` / `2`, and Select Stacker and Feed `K` / `4` ══════════════════════
// Two different families with the same 2-character shape and two different d tables. Both take
// the d as their only operand, each behind its own constant.
function carriageAndStackerRows(): MnemonicRow[] {
  const carriage = 'opcodes.md §6.4 / A22-0526-3 p.81 Figure 90 (CARRIAGE_MNEMONIC_TAKES_THE_D_AS_ITS_ONLY_OPERAND)';
  const stacker = 'opcodes.md §2 K / 4 rows / A22-0526-3 pp.62-63 (STACKER_MNEMONIC_TAKES_THE_POCKET_AS_ITS_ONLY_OPERAND)';
  return [
    makeRow('F', 'CC1', { dFromOperand: true, dIsOnlyOperand: true, cite: carriage }),
    makeRow('2', 'CC2', { dFromOperand: true, dIsOnlyOperand: true, cite: carriage }),
    makeRow('K', 'SSF1', { dFromOperand: true, dIsOnlyOperand: true, cite: stacker }),
    makeRow('4', 'SSF2', { dFromOperand: true, dIsOnlyOperand: true, cite: stacker }),
  ];
}

// ═══ §7.4 — op `Y` Priority, thirteen of fourteen, PARSED from the form's own dModifiers ═══
// `Y_DMODS` is module-private in table.ts but reachable through the form. Each value reads
// `'BUPR1 — channel 1 I-O unit priority request'`, so the mnemonic is the token before the em
// dash and the key is its d. The fourteenth name, BQPR2, is deliberately absent from Y_DMODS
// (Y_BQPR2_D_UNVERIFIED) and is on OUT_OF_SCOPE — the one exclusion the core table itself
// justifies. Every Y row is `unimplemented`: the Priority feature is not installed (§2.5).
function yRows(): MnemonicRow[] {
  const op = mustOp('Y');
  const mods = dMapOf(op, 0);
  if (mods === undefined) throw new RangeError('mnemonics.ts: OP_Y form 0 carries no d-modifier map');
  return Object.entries(mods).map(([d, meaning]) => {
    const name = meaning.split('—')[0]?.trim();
    if (name === undefined || name === '') {
      throw new RangeError(`mnemonics.ts: Y_DMODS['${d}'] has no mnemonic before the em dash`);
    }
    return makeRow('Y', name, { d, cite: 'opcodes.md §9.1 / A22-0530-1 pp.4-8' });
  });
}

// ═══ §7.4 — the one-mnemonic remainder ═════════════════════════════════════════════════════
// "Everything else (`A S C ? ! , ⌑ / @ % Z E . N W B` …) is one mnemonic, no baked d, shape
// from `lengths` and `addressDouble`." The ops the families above own are skipped here; `U`,
// `P` and `Q` contribute nothing because every one of their names is on OUT_OF_SCOPE; `=` and
// `$` carry an empty `autocoder` array and so contribute no name at all (plan §2.5).
const FAMILY_OPS: ReadonlySet<string> = new Set(['D', 'J', 'R', 'X', 'T', 'G', 'V', 'L', 'M', 'F', '2', 'K', '4', 'Y']);

function remainderRows(): MnemonicRow[] {
  const rows: MnemonicRow[] = [];
  for (const op of ALL_OPS) {
    if (FAMILY_OPS.has(op.opChar)) continue;
    for (const name of op.autocoder) {
      if (OUT_OF_SCOPE_NAMES.has(name)) continue;
      rows.push(makeRow(op.opChar, name, {
        dFromOperand: takesADModifier(op),
        cite: op.forms[0]?.cite ?? 'opcodes.md §2',
      }));
    }
  }
  return rows;
}

// ═══ The table, built once ═════════════════════════════════════════════════════════════════

function buildRows(): readonly MnemonicRow[] {
  const rows = [
    ...moveScanRows(),
    ...jRows(),
    ...rxRows(),
    ...tRows(),
    ...gRows(),
    ...vRows(),
    ...ioRows(),
    ...carriageAndStackerRows(),
    ...yRows(),
    ...remainderRows(),
  ];
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.mnemonic)) {
      throw new RangeError(`mnemonics.ts: '${row.mnemonic}' is generated twice — mnemonic -> row must be a function`);
    }
    seen.add(row.mnemonic);
  }
  return rows;
}

/** Every mnemonic this assembler resolves, in derivation order. */
export const ALL_MNEMONICS: readonly MnemonicRow[] = buildRows();

const BY_MNEMONIC: ReadonlyMap<string, MnemonicRow> = new Map(
  ALL_MNEMONICS.map((row) => [row.mnemonic, row]),
);

/**
 * The one entry point. `undefined` means the operation field holds something this assembler
 * does not know — the caller flags `O` (invalid operation code), CT 0, no emission, and the
 * listing line survives (plan §2.2's closing paragraph). Never throws on source content.
 */
export function resolve(mnemonic: string): MnemonicRow | undefined {
  return BY_MNEMONIC.get(mnemonic);
}
