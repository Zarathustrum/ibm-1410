// src/core/alu.ts — the add-to-storage pass behind `A` `S` (Wave 3) and `?` `!` (Wave 6),
// written as the documented units / body / extension scan phases.
// Wave B builds `@` and `%` on the exported `addPass` primitive — docs/plans/phase-1b.md §3.1.
// Source: docs/plans/architecture.md §4.7; docs/plans/phase-1-cpu-core.md §5 Waves 3 and 6, §6.2.
// Machine facts: research/architecture.md §10; research/opcodes.md §4.1-§4.3; charset.md §6.
//
// The 1410 has no accumulator: arithmetic is ADD TO STORAGE, right to left from the units
// position, and this file works on core through a cursor exactly that way. Nothing is
// converted to a JS number, and that is not fastidiousness — field lengths are unbounded,
// the sign lives in the zone bits of the units position, and the recomplement pass is
// OBSERVABLE (it is the `R` term of `4.5(L+1+E+A+1.5B+1.5RB)`, opcodes.md §1.5).
//
// The pass is a GENERATOR yielding once per B position written, plus a closing `end` yield.
// ONE STORAGE CYCLE IS ONE YIELD — that boundary is what `Cpu.stepCycle()` (plan §1, §8
// demo 2) consumes, and `step()` simply drains the generator. The `LatchTraceRecord` carried
// on a yield is the LEVEL-3 LATCH TRACE's alone (plan §6.2): with no tracer attached the
// record is not built and the yield carries `undefined`, because the UI watches the B field
// fill through `snapshot().coreWindow`, not through these records. The tables below are
// transcribed in `oracle/signs.json`, which test/signs-fixture.test.ts holds this file to.

import { glyphOf } from './bcd.js';
import {
  BCD6, ZA as ZONE_A_BIT, ZB as ZONE_B_BIT,
  type Addr, type Cell, type ExecContext, type Latch, type LatchTraceRecord,
} from './types.js';

/** The two zone bits — the sign of a field, and the bits an add preserves in the B body. */
const ZONES = ZONE_B_BIT | ZONE_A_BIT;
/** The 8421 numeric portion, which is all the adder sees. */
const NUMERIC = BCD6 & ~ZONES;

// ─── Digit coding — opcodes.md §4.2 / charset.md §6.2 (A22-0526-3 p.16) ─────
// "Characters whose numeric bits total 0-9 are used at face value ... blank becomes zero,
// and characters whose numeric bits sum above 9 have the 8 bit dropped."
//
// One reading trap, and it is the whole reason this is a table and not an expression: the
// numeric portion 8-2 is the CODE FOR ZERO in this character set (charset.md §2 rank 54 —
// `0` is octal 12), not the value ten. Dropping its 8 bit would turn every zero digit into a
// 2. So 8-2 is face value 0, and only the six patterns above it (8-2-1 … 8-4-2-1) drop the 8.
// Indexed by the four numeric bits, 0..15.
export const DIGIT_OF_NUMERIC_BITS: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,   // no numeric bits (blank, `&`, `-`, substitute blank) … 9
  0,                              // 8-2   the digit zero
  3, 4, 5, 6, 7,                  // 8-2-1 `#` · 8-4 `@` · 8-4-1 `:` · 8-4-2 `>` · 8-4-2-1 group mark
];

/** The numeric bits the machine WRITES for a digit. Zero is written 8-2 (charset.md §2). */
const NUMERIC_BITS_OF_DIGIT: readonly number[] = [0o12, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** The digit a stored character contributes to the adder. Zones play no part. */
export function digitOf(cell: Cell): number {
  // `cell & NUMERIC` is 0..15 and the table has all sixteen rows, so the `?? 0` is
  // `noUncheckedIndexedAccess` bookkeeping and nothing else.
  return DIGIT_OF_NUMERIC_BITS[cell & NUMERIC] ?? 0;
}

// ─── Signs — opcodes.md §4.1 / charset.md §6 (A22-0526-3 p.16 Figure 11) ────
// The sign of a field is the zone bits of its UNITS position: minus is ALWAYS a B bit alone
// (11 zone); B+A (12), A alone (0) and no zone at all are all plus. When the machine
// generates or changes a sign it writes B+A for plus and B for minus (architecture.md §10).
export type Sign = '+' | '-';

export const PLUS_ZONE = ZONE_B_BIT | ZONE_A_BIT;
export const MINUS_ZONE = ZONE_B_BIT;

export function signOf(cell: Cell): Sign {
  return (cell & ZONES) === MINUS_ZONE ? '-' : '+';
}

/**
 * The zone bits the machine writes for a sign it has developed: B+A for plus, B alone for minus
 * (opcodes.md §4.1 p.16). Exported for `?` Zero and Add / `!` Zero and Subtract, whose rule is a
 * DIFFERENT one — §2's `?` row rewrites "a plus sign not already B+A" unconditionally, and §4.4
 * Figure 13 gives ZS its own A-sign-to-B-sign map — so those write it unconditionally, while
 * `A`/`S` write it only on the recomplement path (see Scan 3 below).
 */
function zoneOfSign(sign: Sign): number {
  return sign === '-' ? MINUS_ZONE : PLUS_ZONE;
}

// ─── Add-cycle selection — opcodes.md §4.3 (A22-0526-3 p.16 Figure 12) ──────
type AddCycle = 'true' | 'complement';

/** One printed row of Figure 12. `'greater'` = the sign of the greater value. */
interface AddCycleRow {
  readonly op: 'A' | 'S';
  readonly aSign: Sign;
  readonly bSign: Sign;
  readonly cycle: AddCycle;
  readonly resultSign: Sign | 'greater';
}

export const ADD_CYCLE_TABLE: readonly AddCycleRow[] = [
  { op: 'A', aSign: '+', bSign: '+', cycle: 'true', resultSign: '+' },
  { op: 'A', aSign: '+', bSign: '-', cycle: 'complement', resultSign: 'greater' },
  { op: 'A', aSign: '-', bSign: '+', cycle: 'complement', resultSign: 'greater' },
  { op: 'A', aSign: '-', bSign: '-', cycle: 'true', resultSign: '-' },
  { op: 'S', aSign: '+', bSign: '+', cycle: 'complement', resultSign: 'greater' },
  { op: 'S', aSign: '+', bSign: '-', cycle: 'true', resultSign: '-' },
  { op: 'S', aSign: '-', bSign: '+', cycle: 'true', resultSign: '+' },
  { op: 'S', aSign: '-', bSign: '-', cycle: 'complement', resultSign: 'greater' },
];

/**
 * Figure 12 as one line of machine behaviour: **Subtract inverts the A-field sign first**,
 * and then LIKE signs take a true add while UNLIKE signs take a complement add
 * (opcodes.md §4.3). The eight rows above are the same statement enumerated, and
 * test/signs-fixture.test.ts drives this function over every one of them.
 */
export function selectAddCycle(
  subtract: boolean, aSignRead: Sign, bSign: Sign,
): { cycle: AddCycle; aSign: Sign } {
  const aSign: Sign = subtract ? (aSignRead === '+' ? '-' : '+') : aSignRead;
  return { cycle: aSign === bSign ? 'true' : 'complement', aSign };
}

// ─── Zero and Subtract sign map — opcodes.md §4.4 (A22-0526-3 pp.18-19 Fig 13) ──
// Figure 13 keyed on the A field's units ZONE BITS, in the figure's printed row order. Wave 6's
// `!` executor reads it through `zeroSubtractSign` below, and `oracle/signs.json` pins it.
export const ZERO_AND_SUBTRACT_SIGN_MAP: readonly { readonly aSign: Sign; readonly bSign: Sign }[] = [
  { aSign: '+', bSign: '-' },   // A units zone: none
  { aSign: '-', bSign: '+' },   // A units zone: B
  { aSign: '+', bSign: '-' },   // A units zone: B and A
  { aSign: '+', bSign: '-' },   // A units zone: A
];

/**
 * Figure 13's four rows are printed in the order none / B / B+A / A, while `(cell & ZONES) >> 4`
 * numbers the same four patterns 0 none, 1 A, 2 B, 3 B+A. This is that permutation and nothing
 * else — it exists so `!` reads the transcribed figure rather than restating it.
 */
const ZS_ROW_OF_UNITS_ZONE: readonly number[] = [0, 3, 1, 2];

/**
 * The sign `!` Zero and Subtract writes over the units position of B, given the A field's units
 * character — opcodes.md §4.4, A22-0526-3 pp.18-19 Figure 13. Every row reverses the polarity
 * `signOf` reads, which is why §2's `!` row can say "the OPPOSITE sign" in one line; the figure
 * is followed row by row anyway, because it is the primary source and a future correction to it
 * belongs in one place.
 */
export function zeroSubtractSign(aCell: Cell): Sign {
  // Both index expressions are total over their tables (four zone patterns, four rows); the
  // `??`s are `noUncheckedIndexedAccess` bookkeeping, as in `digitOf` above.
  const row = ZERO_AND_SUBTRACT_SIGN_MAP[ZS_ROW_OF_UNITS_ZONE[(aCell & ZONES) >> 4] ?? 0];
  return row?.bSign ?? '-';
}

// ─── The pass ──────────────────────────────────────────────────────────────

export interface AddOptions {
  /**
   * The two families this one pass serves, which differ ONLY in what reaches the adder:
   *
   * - `'add'` — `A` and `S`. The A digit is added to the B digit, true or complement per
   *   Figure 12, with a recomplement pass when it underflows (opcodes.md §4.3).
   * - `'zero'` — `?` Zero and Add and `!` Zero and Subtract. "Numeric data of A stored into B",
   *   so the B digit is read and DISCARDED: no adder, no carry, no recomplement, and the zone
   *   bits of every B position but the sign are stripped rather than preserved
   *   (opcodes.md §2 pp.18-19, research/architecture.md §10).
   *
   * The cursor, the units / body / extension phases, the B-word-mark termination, the zero fill
   * when A is short and the one-record-per-B-position trace are the same machine either way —
   * which is why this is a mode and not a second scan.
   */
  mode: 'add' | 'zero';
  /**
   * `S` and `!`: invert the A-field sign before Figure 12 (`S`) or Figure 13 (`!`) is consulted
   * (opcodes.md §4.3, §4.4).
   */
  subtract: boolean;
  /**
   * The address-double one-field form `A aaaaa` / `S aaaaa`, where the field is added to
   * itself. Read-out has already put the single address in AAR, BAR, CAR and DAR alike
   * (223-2589 p.52), so this only makes the form's own rule explicit rather than trusting
   * whatever the previous E phase left in BAR.
   */
  oneField: boolean;
  /** The L3 latch sink — set only when a level-3 tracer is attached (plan §6.2). */
  emit?: ((r: LatchTraceRecord) => void) | undefined;
}

// OPEN: plan §6.2's sample L3 line prints `zb=1` on a units cycle whose result digit is 8,
// while its `cout=1` on the next line is plainly the carry that cycle PRODUCED — so the sample
// cannot be read consistently as either pre- or post-cycle latch states. We record the ARITHMETIC
// latches (Ac, Bc, cin, cout, zb, ovf) and the character fields AS THEY STAND AT THE END of the
// storage cycle that developed the position, which is the only self-consistent reading and the one
// a half-cycling operator is looking at.
//
// The `unit` latch is the EXCEPTION and is deliberate: Units / Body / Extension is decided at
// position ENTRY, before the A cycle reads, so it is the A-cycle value while the other six are
// B-cycle values. That is what the oracle prints — `note1410.txt` 02311 c1 and 02380 c4 both put
// `Body` on the `A:` line and `Extension` on the `B:` line of the same position, so the two halves
// of a cycle genuinely disagree about it and the annotation names the A-cycle one first. The line
// FORMAT, which is the actual contract (`formatL3Latch`), is untouched either way. Pinned by
// test/alu.test.ts.
export const L3_LATCHES_SAMPLED_AFTER_CYCLE = true;

/**
 * Write one result digit, keeping the position's word mark and (in the body) its zones, and
 * return the character stored — the L3 record's `r` is the CHARACTER WRITTEN, zones included,
 * which is the only way 02380's `? + U -> D` is distinguishable from an unzoned `0 + 4 -> 4`.
 */
function writeDigit(ctx: ExecContext, addr: number, zone: number, digit: number): Cell {
  const wm = ctx.storage.wm(addr);
  const cell: Cell = zone | (NUMERIC_BITS_OF_DIGIT[digit] ?? 0);
  ctx.storage.setChar(addr, cell, wm);
  return cell;
}

/** A stored character as its print glyph — what `note1410.txt` prints on every `A:` / `B:` line. */
function glyphOfCell(cell: Cell): string {
  return glyphOf(cell & BCD6);
}

/** No A-field position is read on an extension cycle or on the recomplement scan. */
const NO_A_CYCLE = '-';

// ─── The primitive: one add pass over a B field ────────────────────────────

/**
 * What one pass over the B field needs to know, and nothing more. Every field here is a degree
 * of freedom `addToStorage` used to fix — Phase 1b §3.1: `@` Multiply re-runs one multiplicand
 * against a B window that MOVES one position left per multiplier digit, for a COUNTED number of
 * positions rather than to a word mark, on a cycle the caller chose because a partial product
 * has no signs to derive one from, writing no sign until the product is complete.
 */
export interface AddPassOptions {
  /** A cursor start — the A field's units position. */
  aUnits: Addr;
  /** B cursor start — the B field's units position, or a moving window's right end. */
  bUnits: Addr;
  /**
   * An exact count of B positions, or `'bWordMark'` for the documented rule: the B-field word
   * mark "ends the operation and defines the length" (opcodes.md §2 `A` row). A counted run
   * stops after the nth position whether or not a word mark was sensed, and that nth position
   * is the `last` one for the overflow rule below. An exact count is **at least 1**: the scan
   * writes a B position and only then tests the count, so `positions: 0` writes one position
   * rather than none. Callers pass n >= 1.
   */
  positions: number | 'bWordMark';
  /** Figure 12's choice (opcodes.md §4.3) — made by the CALLER, not derived from the signs. */
  cycle: AddCycle;
  /**
   * The zone bits Scan 1 writes over the units position, or `null` to leave B's own. `A`/`S`
   * pass `null`: §4.1 p.16 writes a sign only "when the machine develops or changes a sign",
   * and Scan 1 develops none (see Scan 3 below). `?`/`!` pass the sign they developed.
   */
  writeSign: Sign | null;
  /**
   * The sign Scan 3 writes over the units position when the complement add underflows — and
   * `null` DISABLES the recomplement pass entirely, which is how `@`'s partial adds say "no
   * Scan 3 here" (their complement add is corrected by a shift and a true add, §4.5).
   */
  recomplementSign: Sign | null;
  /** The two families of AddOptions.mode, unchanged: `'add'` adds the A digit, `'zero'` stores it. */
  mode: 'add' | 'zero';
  /** The L3 latch sink — set only when a level-3 tracer is attached (plan §6.2). */
  emit?: ((r: LatchTraceRecord) => void) | undefined;
}

/**
 * What the pass observed. Every one of these is REPORTED, never latched: the pass sets no
 * indicator, writes no `ctx.recomplement` and touches no Figure 8 symbol, because
 * "the overflow condition can be detected only during an add or subtract operation"
 * (opcodes.md §8, A22-0526-3 p.53) is a statement about the CALLER — `@` raises zero balance
 * once for the whole operation and `%` raises divide overflow, not arithmetic overflow.
 */
export interface AddPassResult {
  /** Carry out of the last position developed by Scan 1. */
  cout: Latch;
  /** Zero balance over the digits as they finally stand (after any recomplement). */
  zb: Latch;
  /** The high-order carry of a true add — the caller decides whether that is an overflow. */
  ovf: Latch;
  /** A positions actually read, and B positions written. */
  la: number;
  lb: number;
  /** The result digits, UNITS FIRST — what the `end` record prints reversed. */
  digits: number[];
  /** Whether Scan 3 ran — Figure 7's `R` (opcodes.md §1.5), for the caller to store. */
  recomplemented: boolean;
}

/**
 * One add pass over a B field: Scan 1 right to left from the units position, then Scan 3's
 * recomplement when a complement add underflows and the caller supplied a sign for it.
 * Yields once per B position written — ONE STORAGE CYCLE IS ONE YIELD (see the file header) —
 * and returns what it observed.
 *
 * Length, under `positions: 'bWordMark'`, is governed by the **B-field word mark** — it "ends
 * the operation and defines the length". The A field needs a word mark only if it is shorter
 * than B, in which case the EXTENSION phase carries zeros into B's remaining high-order
 * positions up to and including the B word-mark position; if A is longer, the excess high-order
 * A positions are simply never read — "not an error", and specifically NOT an overflow
 * (research/architecture.md §10; opcodes.md §2 `A` row, §8). B zone bits are preserved except
 * where `writeSign` or `'zero'` mode says otherwise; A zone bits are ignored except in the
 * units position, whose sign the CALLER has already read. Under `positions: n` the same scan
 * runs for exactly n B positions and needs no word mark at all — the word mark of any position
 * it writes is still preserved (`writeDigit`).
 */
export function* addPass(
  ctx: ExecContext, o: AddPassOptions,
): Generator<LatchTraceRecord | undefined, AddPassResult, void> {
  const s = ctx.storage;
  const opChar = ctx.entry.opChar;
  const at = ctx.fetched.opAddr;

  const zero = o.mode === 'zero';
  const complement = o.cycle === 'complement';
  /** `null` = run to the B word mark; a number = run for exactly that many B positions. */
  const runFor: number | null = typeof o.positions === 'number' ? o.positions : null;

  // ── Scan 1: the add scan ─────────────────────────────────────────────────
  // A complement add is a tens complement: the A digit enters the adder nines-complemented
  // (the A Complement latch) with a carry forced into the units position. A carry out of the
  // high-order position then means B was the greater value and the result stands; no carry
  // means A was, the result is in complement form, and Scan 3 recomplements it.
  const digits: number[] = [];        // result digits, units first
  let carry: Latch = complement ? 1 : 0;
  let cout: Latch = 0;
  let zb: Latch = 1;                  // zero balance: still true while every digit is zero
  let ovf: Latch = 0;
  let la = 0;                         // A positions actually read
  let lb = 0;                         // B positions written
  let aExhausted = false;             // the A-field word mark has been sensed

  for (;;) {
    const bAddr = o.bUnits - lb;
    const bCell = s.read(bAddr);
    const bDigit = digitOf(bCell);
    const unit = lb === 0 ? 'units' : aExhausted ? 'extension' : 'body';

    let aDigit = 0;                   // the extension phase adds zeros
    let aGlyph = NO_A_CYCLE;
    if (!aExhausted) {
      const aAddr = o.aUnits - la;
      const aCell = s.read(aAddr);
      aDigit = digitOf(aCell);
      aGlyph = glyphOfCell(aCell);
      la++;
      if (s.wm(aAddr)) aExhausted = true;
    }

    const cin: Latch = carry;
    // `?` and `!` STORE the A digit; the B digit was fetched (the note's own `B: Fetch 3, Store
    // A` lines) and plays no part. The adder, and with it every carry, is idle (§2 pp.18-19).
    const sum: number = zero ? aDigit : (complement ? 9 - aDigit : aDigit) + bDigit + cin;
    const digit = sum % 10;
    carry = sum >= 10 ? 1 : 0;
    cout = carry;
    digits.push(digit);
    if (digit !== 0) zb = 0;

    // The last position of the run: the B word mark ends the operation, or the count runs out.
    const last = runFor !== null ? lb + 1 >= runFor : s.wm(bAddr);
    // Arithmetic overflow: a carry out of the HIGH-ORDER B POSITION, add and subtract only,
    // and only on a true add — on a complement add that same carry is the "B was greater"
    // signal, not an overflow (research/architecture.md §10, opcodes.md §8, A22-0526-3 p.53).
    // ZA and ZS never raise it — §2's `?` and `!` rows list "zero balance only" and §8 says so
    // outright — and with no adder there is no carry out of the high-order position to raise it
    // with, so the guard is a statement of the rule rather than a live branch. REPORTED only:
    // whether it sets an indicator is the caller's, per `AddPassResult`.
    if (!zero && last && !complement && cout === 1) ovf = 1;

    // Scan 1 develops NO sign for `A`/`S`. Figure 12 gives a true add the sign both fields
    // already share and a carrying complement add the B field's own, so on every path that ends
    // here the result keeps B's sign and its units zone stands untouched (§4.1 p.16 — the
    // machine writes a sign only when it develops or changes one). The one path that changes it
    // is the recomplement, and Scan 3 below writes it there. `writeSign` is how `?`/`!` — and
    // any later caller that HAS developed a sign — say so.
    // The zone bits stored with the digit. `A`/`S` keep the B field's own everywhere — the units
    // position included, since Scan 1 develops no sign. `?`/`!` strip them from every position
    // but the units, which receives the sign developed above ("zone bits stripped from all B
    // positions except the sign", §2 pp.18-19; research/architecture.md §10).
    const zoneWritten = lb === 0
      ? (o.writeSign !== null ? zoneOfSign(o.writeSign) : bCell & ZONES)
      : (zero ? 0 : bCell & ZONES);
    const written = writeDigit(ctx, bAddr, zoneWritten, digit);
    lb++;

    // A complement add that reached the end of the run with no carry out is about to
    // recomplement: by the END of this storage cycle — which is when every latch here is sampled
    // (`L3_LATCHES_SAMPLED_AFTER_CYCLE`) — B Complement is up and the carry the recomplement
    // forces into the units position is in the carry latch. OPEN: the research names neither
    // latch's timing; `note1410.txt` prints both on this line in all three recomplement cases
    // (02433's run-on `B:` line at lines 261-262 lists A Complement, B Complement and CarryIn
    // beside the "Begin recomplement cycle" parenthetical; likewise 02333, 02485), and prints
    // "Carry In" there in arithmetic that plainly took no carry INTO this position, so the only
    // carry it can name is the recomplement's. Followed as the oracle has it. With
    // `recomplementSign: null` there is no Scan 3 to begin, so neither latch comes up.
    const recomplementing = last && complement && cout === 0 && o.recomplementSign !== null;

    // Built only for the L3 trace: no tracer, no record — the yield still happens, because the
    // yield IS the storage-cycle boundary `stepCycle()` half-cycles on (see the file header).
    let rec: LatchTraceRecord | undefined;
    if (o.emit !== undefined) {
      rec = {
        kind: 'scan', addr: at, opChar, scan: 'scan1', unit,
        Ac: complement ? 1 : 0, Bc: recomplementing ? 1 : 0,
        cin: recomplementing ? 1 : cin, cout, zb, ovf,
        a: aGlyph, b: glyphOfCell(bCell), r: glyphOfCell(written),
      };
      o.emit(rec);
    }
    yield rec;
    if (last) break;
  }

  // ── Scan 3: the recomplement pass ────────────────────────────────────────
  // Taken when the complement add underflowed AND the caller handed in a sign for it. It is a
  // second pass over the same B field — observable in core, and the `R` of the timing formula
  // (opcodes.md §4.3, §1.5). The result takes the sign of the greater value (Figure 12), which
  // for `A`/`S` is the A field's; `recomplementSign` is that decision, made by the caller.
  let recomplemented = false;
  if (complement && cout === 0 && o.recomplementSign !== null) {
    recomplemented = true;
    carry = 1;
    zb = 1;
    for (let i = 0; i < lb; i++) {
      const bAddr = o.bUnits - i;
      const bCell = s.read(bAddr);
      const was = digits[i] ?? 0;
      const cin: Latch = carry;
      const sum: number = 9 - was + cin;
      const digit = sum % 10;
      carry = sum >= 10 ? 1 : 0;
      digits[i] = digit;
      if (digit !== 0) zb = 0;
      // THE ONE PLACE A SIGN IS DEVELOPED. §4.1 p.16 states the writing rule with a condition on
      // it: "**when the machine develops or changes a sign**, plus is always written as B+A and
      // minus as a B bit alone". Figure 12 (§4.3) says whose sign the result takes, and for a true
      // add and for a complement add that carries out of the high-order position that sign is the
      // B field's own — nothing is developed, nothing is changed, and B's units zone survives
      // exactly as Scan 1 found it: none, A alone, or B+A. That is why Scan 1 writes `bCell &
      // ZONES` for `A`/`S` and only this scan calls `zoneOfSign`. Nine `note1410.txt` cases show
      // the Scan 1 side — 02300 leaves `199`, not `19I`; also 02322, 02344, 02356, 02368/02379,
      // 02411, 02455, 02473/02484 — and it is what makes §2's one-field `S` example (`ABQ` ->
      // `??!`, "zone bits and sign configuration unchanged") exact rather than merely survivable.
      // Since minus is encoded one way only, the rule is observable on plus alone. Here the
      // result took the A field's sign, which is never the sign B went in with (a complement add
      // is selected only for unlike signs), so the units zone IS rewritten.
      const written = writeDigit(
        ctx, bAddr, i === 0 ? zoneOfSign(o.recomplementSign) : bCell & ZONES, digit,
      );
      let rec: LatchTraceRecord | undefined;
      if (o.emit !== undefined) {
        rec = {
          // OPEN: the research names the Units / Body / Extension latches (emulators.md §5.3) but
          // never says which are up on the recomplement scan. `note1410.txt` says Units on the
          // first position and EXTENSION on the rest ("B: (Recomplement) Sum O (-6), Extension, B
          // Complement, NOT A Compl." — 02433, and 02333 the same), which is what the latch means:
          // no A-field position is read on this scan, so every position of it is a B cycle with no
          // A cycle beside it. Followed as the oracle has it.
          kind: 'scan', addr: at, opChar, scan: 'scan3', unit: i === 0 ? 'units' : 'extension',
          Ac: 0, Bc: 1, cin, cout: carry, zb, ovf,
          // No A digit is read on a recomplement scan; the pass complements B alone.
          a: NO_A_CYCLE, b: glyphOfCell(bCell), r: glyphOfCell(written),
        };
        o.emit(rec);
      }
      yield rec;
    }
  }

  return { cout, zb, ovf, la, lb, digits, recomplemented };
}

// ─── The `A S ? !` wrapper ─────────────────────────────────────────────────

/**
 * `A` `S` `?` `!`, all forms. Yields one record per B position written, then an `end` record.
 *
 * This is `addPass` plus everything the primitive must not own (Phase 1b §3.1): the B cursor at
 * `ctx.sym.B` (or `ctx.sym.A` for the address-double one-field form), the add cycle DERIVED from
 * the two field signs through Figure 12, the sign each of the four operations writes, and — after
 * the pass — `ctx.recomplement`, the zero-balance and arithmetic-overflow indicators and the
 * Figure 8 length symbols. Length is the B word mark's, exactly as `addPass` documents it; `?`
 * and `!` govern their length the same way — §2's `?` row prints the same "short A zero-fills
 * high-order B up to and including its word mark" sentence — and differ only as
 * `AddOptions.mode` describes.
 */
export function* addToStorage(
  ctx: ExecContext, opts: AddOptions,
): Generator<LatchTraceRecord | undefined, void, void> {
  const s = ctx.storage;
  const aUnits = ctx.sym.A;
  const bUnits = opts.oneField ? ctx.sym.A : ctx.sym.B;

  const zero = opts.mode === 'zero';
  const bSign = signOf(s.read(bUnits));
  const aUnitsCell = s.read(aUnits);
  const { cycle, aSign } = selectAddCycle(opts.subtract, signOf(aUnitsCell), bSign);
  // `?` and `!` develop no add cycle at all: nothing is added, so there is nothing to complement,
  // and the caller-chosen cycle `addPass` now takes has to say so (§2 pp.18-19).
  const complement = !zero && cycle === 'complement';

  // The sign this operation leaves over the units position of B:
  //  · `A` `S` — B's own, unless the recomplement scan develops the A field's
  //    ("sign of the greater value", Figure 12 / §4.3); Scan 1 never writes one, which is why
  //    `writeSign` below is `null` for them.
  //  · `?` — the A field's sign, and "a plus sign not already B+A is rewritten as B+A"
  //    (§2 p.18), which is exactly what `zoneOfSign` writes for every plus.
  //  · `!` — Figure 13's map (§4.4 pp.18-19).
  let sign: Sign = !zero ? bSign : opts.subtract ? zeroSubtractSign(aUnitsCell) : signOf(aUnitsCell);

  const r = yield* addPass(ctx, {
    aUnits,
    bUnits,
    positions: 'bWordMark',
    cycle: complement ? 'complement' : 'true',
    writeSign: zero ? sign : null,
    recomplementSign: complement ? aSign : null,
    mode: opts.mode,
    emit: opts.emit,
  });
  if (r.recomplemented) sign = aSign;

  // ── Indicators and the Figure 8 symbols ──────────────────────────────────
  // Figure 7's `R`, which the pass reports and only this wrapper stores (opcodes.md §1.5, §4.3)
  // — at END OF OPERATION, after the generator drains, not at Scan 3's entry as Wave 3 wrote it.
  // Nothing reads it mid-flight: the `A`/`S` timing lambdas run after the iterator is drained.
  ctx.recomplement = r.recomplemented ? 1 : 0;
  ctx.indicators.setZeroBalance(r.zb === 1);
  if (r.ovf === 1) ctx.indicators.setArithOverflow();

  // LA / LB / LW as opcodes.md §1.3 defines them: LW is "the number of characters in the A- or
  // B-field, WHICHEVER IS SHORTER". A shorter than B → LW = LA, so `A-LW` leaves AAR one
  // position left of the A field's high-order character. A longer than B → the excess is never
  // read, the machine never learns the true LA, and LW = LB; we report LA = LB for the same
  // reason, which is also what the timing formula's `A` term should charge for. Equal → both.
  ctx.sym.LA = r.la;
  ctx.sym.LB = r.lb;
  ctx.sym.LW = Math.min(r.la, r.lb);

  let end: LatchTraceRecord | undefined;
  if (opts.emit !== undefined) {
    const text = r.digits.slice().reverse().join('');
    end = {
      kind: 'end', addr: ctx.fetched.opAddr, opChar: ctx.entry.opChar,
      zb: r.zb, ovf: r.ovf, result: `B=${text}${sign}`,
    };
    opts.emit(end);
  }
  yield end;
}
