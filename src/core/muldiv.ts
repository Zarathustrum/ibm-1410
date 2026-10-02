// src/core/muldiv.ts — `@` Multiply and `%` Divide, built on `alu.ts`'s `addPass`.
// Source: docs/plans/phase-1b.md §3.1 (the primitive), §3.2 (`@`), §3.3 (`%`), §4 Wave B, §9.
// Machine facts: research/opcodes.md §2 pp.19-21 (the two rows), §4.1-§4.3 (signs, digit coding,
// Figure 12), §4.5 (multiply), §4.6 (divide — the field layout and Figure 15-17), §8 (indicators),
// §1.3-§1.5 (the Figure 8 register symbols and the Figure 7 timing terms).
//
// NEITHER OPERATION DOES DIGIT ARITHMETIC OF ITS OWN. Every add and every subtract here is one
// `addPass` call over storage — the same units / body / extension scan `A` and `S` take, on a
// cycle this file chooses because a partial product has no signs to derive one from
// (phase-1b.md §3.1). What multiply and divide add on top is the WALK: which window, how many
// times, and in which direction the window moves.
//
// The two indicator rules are the load-bearing half of §8, and they are opposite in shape:
// multiply sets ZERO BALANCE and *never* arithmetic overflow — "the overflow condition can be
// detected only during an add or subtract operation, and not during a zero and add, zero and
// subtract, multiply or divide operation" (A22-0526-3 p.53) — while divide sets DIVIDE OVERFLOW
// and touches neither arithmetic overflow nor zero balance. `addPass` reports latches and sets
// none, so both rules live here, where the operation is.

import {
  MINUS_ZONE, PLUS_ZONE, addPass, digitOf, signOf,
  type AddPassResult, type Sign,
} from './alu.js';
import {
  BCD6, ZA as ZONE_A_BIT, ZB as ZONE_B_BIT,
  type Addr, type ExecContext, type LatchTraceRecord, type Storage,
} from './types.js';

/** The two zone bits — the sign of a field (opcodes.md §4.1, A22-0526-3 p.16 Figure 11). */
const ZONES = ZONE_B_BIT | ZONE_A_BIT;
/** The 8421 numeric portion, which is all the adder ever sees. */
const NUMERIC = BCD6 & ~ZONES;

/**
 * The numeric bits the machine WRITES for a digit — zero is 8-2, not no-bits (charset.md §2:
 * `0` is octal 12). This is `alu.ts`'s `NUMERIC_BITS_OF_DIGIT`, which is private to the pass;
 * the pass writes every digit it develops, and this file writes the three digits the pass never
 * sees — the pre-development zeros, the destroyed multiplier image and the quotient digits.
 */
const NUMERIC_BITS_OF_DIGIT: readonly number[] = [0o12, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// OPEN: how wide multiply's partial-product and divide's partial-remainder adder windows are.
// §4.5 and Figure 14 give the digit-group algorithm; §4.6 and Figures 15-17 give the divide field
// layout — NO SOURCE STATES THE WINDOW. Operand length + 1 is an IMPLEMENTATION CHOICE, one carry
// position beyond the operand, and it is exactly wide enough: a partial add of the multiplicand
// into a window whose high-order position starts at zero cannot carry out of it (the running
// product below 10^LA keeps the top digit clear), and the one place a carry IS discarded — the
// shifted true add of the 5-9 group, whose high-order position is the multiplier digit being
// consumed and zeroed — is made exact NOT by cancellation but by that unconditional zeroing.
//
// The two windows are ONE POSITION APART, so nothing cancels. For multiplier digit `k` at
// `digitAddr = mUnits − k`: the complement adds run in a window whose units is `bUnits − k`,
// `la + 1` wide, so its top is `digitAddr + 1` and the borrow it loses lands AT `digitAddr`.
// Exactly one borrow is lost (b = 1), because the running product `W = floor(P_k / 10^k)` is
// always less than the multiplicand — only the first of the `10 − d` complement adds underflows.
// The shifted true add's window is one position left (units `bUnits − k − 1`, top `digitAddr`):
// it leaves `q = d + 1 − 10c` at `digitAddr` — the multiplier digit plus that stray borrow — and
// its carry-out `c` falls at `digitAddr − 1`, the NEXT multiplier digit, so `c` must be discarded,
// which a window exactly `la + 1` wide does by having nothing above `digitAddr`. The
// unconditional `store(s, digitAddr, 0, 0)` that ends the group then removes both the multiplier
// digit and the spurious +1 in one write. Worked anchors: 999 x 9 → `08991` (q = 0, c = 1);
// 3 x 8 → `024` (q = 9, c = 0), the '8' case in test/tier1-muldiv.test.ts.
//
// So the width is PINNED, not merely "wide enough": narrower loses a carry out of the partial
// product or partial remainder; `la + 2` puts the complement adds' lost borrow back inside the
// window, and the shifted true add's overflow then corrupts the next multiplier digit. Its check
// is the fixtures — at any other width the ten tier-3 products and quotients go wrong.
// docs/research/open-questions.md, Phase 1b section; docs/plans/phase-1b.md §3.2, §3.3, §9.
export const ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE = true;

// ─── Storage helpers the pass does not provide ─────────────────────────────

/**
 * Store one digit with the zone bits given, keeping the position's word mark — `alu.ts`'s
 * `writeDigit` for the positions no `addPass` develops. Zone 0 ELIMINATES the zones that were
 * there, which is what §4.5 asks for in the product area and in the multiplier image.
 */
function store(s: Storage, addr: Addr, digit: number, zone: number): void {
  // `digit` is 0-9 at every call site; the `??` is `noUncheckedIndexedAccess` bookkeeping.
  s.setChar(addr, zone | (NUMERIC_BITS_OF_DIGIT[digit] ?? 0), s.wm(addr));
}

/**
 * Write a sign the operation DEVELOPED over a units position: plus as B+A, minus as a B bit
 * alone (opcodes.md §4.1 p.16 — "when the machine develops or changes a sign"). The digit under
 * it and the word mark are kept.
 */
function applySign(s: Storage, addr: Addr, sign: Sign): void {
  const cell = s.read(addr);
  s.setChar(addr, (sign === '-' ? MINUS_ZONE : PLUS_ZONE) | (cell & NUMERIC), s.wm(addr));
}

/**
 * The length of a field defined by the word mark over its high-order position, counting left
 * from its units position — the multiplicand's, and the multiplier image's inside B
 * (opcodes.md §2 `@` row's `terminatesOn`), and the divisor's (`%` row's).
 *
 * A field with no word mark has no stopping condition and walks down through storage until the
 * address leaves installed core, where `Storage.read` stops the machine with an ADDRESS CHECK —
 * the machine's own failure mode for the same program, and the same bound `compare.ts` and
 * `move.ts` run under.
 */
function fieldLength(s: Storage, units: Addr): number {
  let n = 0;
  for (;;) {
    n++;
    if (s.wm(units - n + 1)) return n;
  }
}

/** True if any of `n` positions ending at `units` holds a non-zero digit. */
function anyNonZeroDigit(s: Storage, units: Addr, n: number): boolean {
  for (let i = 0; i < n; i++) if (digitOf(s.read(units - i)) !== 0) return true;
  return false;
}

/** Run a pass to completion for its result — `%` develops its quotient in a single E cycle. */
function drain(g: Generator<LatchTraceRecord | undefined, AddPassResult, void>): AddPassResult {
  let n = g.next();
  while (n.done !== true) n = g.next();
  return n.value;
}

// ─── `@` Multiply — opcodes.md §2 pp.19-20, §4.5 ───────────────────────────

/**
 * `@` Multiply, all three lengths (opcodes.md §2 pp.19-20; A22-0526-3 Figure 14).
 *
 * **The field layout**, from the row verbatim: A is the multiplicand at its **units** position;
 * B is the product field at its units position "with the multiplier image pre-placed in the
 * high-order positions of B", `len(B) = digits(multiplicand) + digits(multiplier) + 1`. So the
 * B field is `[ multiplier image | product area ]`, the image `M` positions wide under the B
 * word mark and the product area `LA + 1` wide, and the image's own units position sits at
 * `B − LA − 1`.
 *
 * **The walk.** First a plain loop zeros the product positions right of the multiplier — that is
 * NOT an `addPass` mode (`'zero'` STORES the A digit; phase-1b.md §3.1), and it is where §4.5's
 * "zones anywhere in the assigned product area are eliminated before product development" is
 * carried out. Then one digit group per multiplier digit, RIGHT TO LEFT, the window one position
 * further left each time:
 *
 *  - **1-4** — that many true adds of the multiplicand into the window ("the digit is decremented
 *    each cycle; zero ends the group and shifts left one position").
 *  - **5-9** — `10 − d` tens-complement complement-adds in the low-order positions, then a left
 *    shift and a true add starting in the tens position, which is `d = (d − 10) + 10` done in
 *    `11 − d` cycles: **multiplier digit 8 costs three cycles, not eight** (§4.5, Figure 14).
 *
 * The multiplier digit's own position is left holding zero when its group ends — that is §4.5's
 * "the multiplier image is destroyed" and "zones in the multiplier are eliminated during
 * development", and it costs no storage cycle of its own because the digit is the counter the
 * add cycles decrement. Zones in the MULTIPLICAND are undisturbed: no pass ever writes A.
 *
 * **Signs**, sampled before anything is written and applied after everything is: the units zones
 * of the multiplicand and of the multiplier, LIKE signs → plus, UNLIKE → minus, written into the
 * units position of B at the end (§4.5, §4.1).
 *
 * **Indicators:** zero balance from the FINAL product only — §8's reset rule is about the end of
 * an operation, so the partial products never touch it — and NEVER arithmetic overflow, even when
 * a high-order carry is cut off at the B word mark (§4.5, §8, A22-0526-3 p.53).
 *
 * Returned as a GENERATOR yielding once per storage cycle — the zeroing scan and every position
 * of every partial add — so MODE = I/E CYCLE can half-cycle a multiply the way it half-cycles an
 * add (phase-1b.md §7; `alu.ts`'s file header).
 */
export function* multiplyFields(
  ctx: ExecContext,
): Generator<LatchTraceRecord | undefined, void, void> {
  const s = ctx.storage;
  const aUnits = ctx.sym.A;
  const bUnits = ctx.sym.B;

  const la = fieldLength(s, aUnits);          // multiplicand — its own word mark
  const mUnits = bUnits - la - 1;             // units position of the pre-placed multiplier image
  const m = fieldLength(s, mUnits);           // the image — the B-field word mark over its high order

  // §4.5: "signs of the units positions of the multiplicand and of the multiplier are sampled
  // FIRST" — before the zeroing scan reaches the product area and before the image is consumed.
  const sign: Sign = signOf(s.read(aUnits)) === signOf(s.read(mUnits)) ? '+' : '-';

  // The first scan, §2's own word: zeros the product positions right of the multiplier, zones
  // and all. One storage cycle per position.
  for (let i = 0; i <= la; i++) {
    store(s, bUnits - i, 0, 0);
    yield undefined;
  }

  for (let k = 0; k < m; k++) {
    const digitAddr = mUnits - k;
    const d = digitOf(s.read(digitAddr));
    // The window: `ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE` positions with its units at B − k,
    // so its high-order position is the multiplier digit consumed one group ago.
    const partial = {
      aUnits,
      positions: la + 1,
      writeSign: null,
      recomplementSign: null,   // "no Scan 3 here" — §4.5 corrects by a shift and a true add
      mode: 'add' as const,
      emit: ctx.traceLatch,
    };
    if (d >= 1 && d <= 4) {
      for (let i = 0; i < d; i++) {
        yield* addPass(ctx, { ...partial, bUnits: bUnits - k, cycle: 'true' });
      }
    } else if (d >= 5) {
      for (let i = 0; i < 10 - d; i++) {
        yield* addPass(ctx, { ...partial, bUnits: bUnits - k, cycle: 'complement' });
      }
      // "…followed by a left shift and a true-add starting in the tens position." Its high-order
      // position is the multiplier digit itself, which the next line then destroys — see the
      // OPEN constant above for why that is exactly right and not merely harmless.
      yield* addPass(ctx, { ...partial, bUnits: bUnits - k - 1, cycle: 'true' });
    }
    store(s, digitAddr, 0, 0);
  }

  applySign(s, bUnits, sign);

  // §8: zero balance is set by multiply, and only the finished product can set it. Arithmetic
  // overflow is not consulted at all — `addPass` reported it and this operation must not latch it.
  const length = la + m + 1;
  ctx.indicators.setZeroBalance(!anyNonZeroDigit(s, bUnits, length));

  // The row's `NSI / A−LA / B−LB` (opcodes.md §2, §1.3). LB is the WHOLE B field — §2 gives its
  // length outright as `digits(multiplicand) + digits(multiplier) + 1`, and every position of it
  // is developed, so `B − LB` leaves BAR one position left of the field's high-order character,
  // exactly where `A`/`S` leave it.
  ctx.sym.LA = la;
  ctx.sym.LB = length;
  // Figure 7's `M`, multiplier length — the `2.5M` and `(2.5M + 1.5)` of the row's T (§1.5).
  ctx.terms.M = m;
}

// ─── `%` Divide — opcodes.md §2 pp.20-21, §4.6 ─────────────────────────────

/**
 * `%` Divide, all three lengths (opcodes.md §2 pp.20-21; A22-0526-3 Figures 15-17).
 *
 * **The field layout — "the easiest thing on the machine to get wrong" (§4.6).** A is the
 * **units** position of the divisor. B is the **leftmost position of the DIVIDEND**, which sits
 * `len(divisor) + 1` positions in from the left end of the quotient/dividend field, not at the
 * left end of the field. Figure 17: divisor `12`, dividend `14700`, an 8-position field holding
 * `00014700`, and the B-address on the `1`. §4.6 Note 1 says what an emulator that starts at the
 * left end of the whole field gets: wrong quotients AND spurious divide overflows.
 *
 * **The walk.** One quotient digit per step: repeated complement-adds of the divisor into a
 * window `ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE` positions wide, counting the ones that carry
 * out of the high-order position (Figure 12's "B was the greater value"), then one true add to
 * correct the subtraction that underflowed, then the window steps RIGHT one position. The digit
 * is stored one position to its left.
 *
 * **Termination**, from the row verbatim: the word mark over the leftmost position of the
 * DIVISOR fixes the divisor's length; the division is stopped by the SIGN in the units position
 * of the dividend. A B-field word mark left by a preceding `ZA` is ignored — nothing here reads
 * it — but retained, because every write preserves the word mark it finds.
 *
 * **Results** (§4.6, Figure 16): the quotient in the leftmost positions, its units at
 * `(units of the dividend) − len(divisor) − 1`; the remainder in the rightmost; the quotient
 * sign algebraic; the remainder taking the sign of the ORIGINAL dividend — which it keeps
 * untouched, since the pass writes no sign over a window's units position and §4.1 has the
 * machine write a sign only where it develops or changes one. The dividend is destroyed except
 * for the remainder. An unsigned divisor is assumed positive, which is what `signOf` reads.
 *
 * **Indicators:** divide overflow, and neither arithmetic overflow nor zero balance (§8).
 * §4.6 gives three causes, of which two are determinate and one is not: division by zero
 * **always**; an improperly addressed dividend, i.e. a first divide step whose quotient digit
 * would exceed 9 (Note 1); and a quotient field two or more positions too small, which "usually
 * does" — a hedge, not a rule, and not implemented. A quotient field ONE position short raises
 * nothing at all and silently corrupts the neighbouring field, which falls out of the walk
 * without a line of code: nothing here knows where the B field begins.
 *
 * Runs in a single E cycle: `%` returns nothing, so `Cpu.stepCycle()` completes it in one press.
 */
export function divideFields(ctx: ExecContext): void {
  const s = ctx.storage;
  const aUnits = ctx.sym.A;
  const dividendLeft = ctx.sym.B;             // §4.6: the LEFTMOST POSITION OF THE DIVIDEND

  const la = fieldLength(s, aUnits);          // divisor — the word mark over its leftmost position
  const dividendUnits = signedUnits(s, dividendLeft);
  const quotientUnits = dividendUnits - la - 1;

  ctx.sym.LA = la;
  // The row's BAR is `special` = "tens position of the quotient field" (opcodes.md §2 `%` row),
  // so this executor sets it — `isa/regs.ts` leaves a `special` register alone. It is well
  // defined on the overflow path too, which is why it is set before the divisor is looked at.
  ctx.regs.bar = quotientUnits - 1;
  // Figure 7's `Q`, "quotient length" (§1.5) — read here as the STEP count, `dividendDigits −
  // divisorDigits + 1`: the number of divide positions the row's `6.5Q[…]` term charges for, not
  // the developed quotient's digit count and not the quotient field's length. §1.5 says only
  // "quotient length"; this is the reading the formula wants.
  ctx.terms.Q = 0;

  // "Division by zero always raises divide overflow" (§4.6, §8) — and it is also the one input
  // for which the subtraction loop below would never end.
  if (!anyNonZeroDigit(s, aUnits, la)) {
    ctx.indicators.setDivideOverflow();
    return;
  }

  // §4.6: quotient sign by the algebraic rule; the remainder keeps the dividend's own.
  const quotientSign: Sign =
    signOf(s.read(dividendUnits)) === signOf(s.read(aUnits)) ? '+' : '-';

  for (let u = dividendLeft + la - 1; u <= dividendUnits; u++) {
    const step = {
      aUnits,
      bUnits: u,
      positions: la + 1,
      writeSign: null,
      recomplementSign: null,   // the correction is the true add below, not a Scan 3
      mode: 'add' as const,
      emit: ctx.traceLatch,
    };
    let digit = 0;
    // A complement add that carries out of the high-order position subtracted successfully
    // (opcodes.md §4.3); one that does not has underflowed and is the end of the group.
    while (drain(addPass(ctx, { ...step, cycle: 'complement' })).cout === 1) {
      digit++;
      // §4.6 Note 1: "An improperly addressed dividend can cause a divide overflow condition if
      // the result of the first divide operation is greater than 9." After a correct first step
      // the partial remainder is below the divisor, so no later step can reach ten — which makes
      // this the loop's bound as well as the rule. What the machine leaves in core afterwards is
      // not stated anywhere we hold; the division stops here and the field is whatever the
      // subtractions made of it.
      if (digit > 9) {
        ctx.indicators.setDivideOverflow();
        return;
      }
    }
    drain(addPass(ctx, { ...step, cycle: 'true' }));   // put back the subtraction that underflowed
    store(s, u - la - 1, digit, 0);
    ctx.terms.Q++;
  }

  applySign(s, quotientUnits, quotientSign);
}

/**
 * The units position of the dividend, found by walking RIGHT from the B-address to the first
 * position carrying zone bits: §2's `%` row makes the sign the terminator — "the dividend must
 * carry a sign (BA plus / B minus) — the sign stops the division" — and §4.6 recommends the `ZA`
 * that supplies both it and the quotient area's zeros. A dividend with no sign has no stopping
 * condition and walks up through storage to the address check, as `fieldLength` does downward.
 */
function signedUnits(s: Storage, left: Addr): Addr {
  let a = left;
  for (;;) {
    if ((s.read(a) & ZONES) !== 0) return a;
    a++;
  }
}
