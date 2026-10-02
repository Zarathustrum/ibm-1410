// Tier 0 — `ANTA` and the quadratic residual: the one non-elementary operation in the program.
// Plan docs/plans/phase-6-reentry.md §5.6 (the antilog, its six decisions and its truncation
// bound), §4.5 (the published 1.0e-5 relative tolerance on the eq.7 atmosphere), §11 wave 1
// oracle (b), §12.1 T0. The table is `test/fixtures/reentry-reference.ts`'s, not this file's.
//
// SOURCES: NACA Report 1381 eq.7 — the Allen-Eggers atmosphere is EXACTLY exponential, so log10 rho
// is exactly linear in altitude and both the atmosphere and the heating go through one base-10
// antilog (avco-and-reentry.md §7, [verified]). IBM A22-0526-3 — on a decimal machine the
// decade/fraction split of a base-10 antilog is a field slice, and the ten-position stride makes the
// entry offset 10*F1 a move one position left.
//
// THE BOUND ASSERTED IS §4.5'S PUBLISHED 1.0e-5 RELATIVE, and the measured worst goes in the
// message. It is NOT 2.034e-6: that figure is §5.6's truncation bound on the residual TERM alone,
// and the whole quantised chain carries it plus the eight-digit fetch plus the half-adjusts at
// S = 7. The residual bound is asserted here numerically, from (ln10 r)^3/6, rather than quoted.
//
// §4.5's rule is verbatim and is not negotiable inside the build: a tolerance published in
// docs/BUILD-LOG-6.md before the golden may not be widened. A failure here is a finding.

import { describe, expect, it } from 'vitest';

import {
  ANTA_DIGITS, ANTA_FETCHED, ANTILOG_C1, ANTILOG_C2, ANTILOG_TRUNCATION_BOUND, antilogFixed,
  halfAdjust, TOLERANCES,
} from './fixtures/reentry-reference.js';

/**
 * The 200 interpolated points of §11 wave 1's oracle (b), taken as MIDPOINTS of 200 equal
 * sub-intervals of the three arguments this program actually antilogs — §5.2's -2.9611 … +3.3480,
 * which is `-C2 h` at the band top through `log10 q_dot` at the peak. Midpoints of an interval
 * whose width is not a multiple of the table stride land between table entries by construction,
 * which is what "interpolated" has to mean for the check to exercise the residual at all; the
 * preconditions below assert exactly that rather than assuming it.
 */
const ARG_LOW = -2.9611;
const ARG_HIGH = 3.3480;
const INTERPOLATED_POINTS = 200;
const INTERPOLATED: readonly number[] = Array.from(
  { length: INTERPOLATED_POINTS },
  (_unused, i) => ARG_LOW + (ARG_HIGH - ARG_LOW) * (i + 0.5) / INTERPOLATED_POINTS,
);

/** `R` is a 5-position field at S = 7 (§5.2), so these are every value the residual can take. */
const RESIDUAL_STEPS = 100_000;

interface Worst<T> { readonly value: number; readonly at: T }

function worstOf<T>(items: readonly T[], measure: (item: T) => number): Worst<T> {
  const first = items[0];
  if (first === undefined) throw new Error('nothing to measure');
  let out: Worst<T> = { value: measure(first), at: first };
  for (const item of items) {
    const value = measure(item);
    if (value > out.value) out = { value, at: item };
  }
  return out;
}

/** `F1` and `R` as the deck slices them out of the biased argument (§5.2, §5.6). */
function slice(argument: number): { readonly f1: number; readonly r: number } {
  const argb = halfAdjust(argument + 10, 7);
  const f = halfAdjust(argb - Math.floor(argb), 7);
  // Off the integer field, not by multiplying — the machine's F1 is a field slice, and
  // `Math.floor(f * 100)` disagrees with it on F = 0.2900000, 0.5700000 and 0.5800000. Same
  // reasoning as the fixture's `antilogFixed`; the two must slice identically or this file is
  // testing a different routine from the one wave 2 compares the deck against.
  const f1 = Math.floor(Math.round(f * 1e7) / 1e5);
  return { f1, r: halfAdjust(f - f1 / 100, 7) };
}

describe('Wave 1 — ANTA against Math.pow at the published 1.0e-5 relative (oracle (b))', () => {
  it('is 100 entries of ten punched digits, of which the fetch takes the top eight', () => {
    expect(ANTA_DIGITS.length, `${ANTA_DIGITS.length} ANTA cards against §5.6's 100`).toBe(100);
    expect(ANTA_FETCHED.length, `${ANTA_FETCHED.length} fetched entries against 100`).toBe(100);
    for (const [i, digits] of ANTA_DIGITS.entries()) {
      expect(digits.length, `ANTA[${i}] is punched "${digits}", ${digits.length} characters against the card's ten`)
        .toBe(10);
    }
  });

  it('fetches 9.7723722 at ANTA[99] — 10^0.99, and not the 9.9770006 of a table this design does not have', () => {
    expect(ANTA_DIGITS[99], `ANTA[99] is punched "${ANTA_DIGITS[99]}" against 10^0.99 = 9772372210`)
      .toBe('9772372210');
    expect(ANTA_FETCHED[99], `ANTA[99] fetches ${ANTA_FETCHED[99]} against 10^0.99 = 9.7723722`)
      .toBe(9.7723722);
    expect(ANTA_FETCHED[99], 'ANTA[99] must not be 9.9770006, which is 10^0.999 and belongs to a 1,000-entry table')
      .not.toBe(9.9770006);
  });

  it('agrees with Math.pow at all 100 entries within the published 1.0e-5 relative', () => {
    const indices = Array.from({ length: 100 }, (_unused, i) => i);
    const w = worstOf(indices, (i) => {
      const want = 10 ** (i / 100);
      const got = ANTA_FETCHED[i];
      if (got === undefined) throw new RangeError(`ANTA has no entry ${i}`);
      return Math.abs(got - want) / want;
    });
    expect(w.value, `ANTA's worst relative deviation over the 100 entries is ${w.value.toExponential(4)} at ANTA[${w.at}] (the eight-digit fetch), against the published ${TOLERANCES.atmosphereRelative.toExponential(1)}`)
      .toBeLessThanOrEqual(TOLERANCES.atmosphereRelative);
  });

  it('takes 200 points that are genuinely interpolated — none on a table entry, all 100 entries used', () => {
    expect(INTERPOLATED.length, `${INTERPOLATED.length} interpolated points against wave 1's 200`).toBe(200);
    expect(new Set(INTERPOLATED).size, 'the 200 interpolated arguments must be distinct').toBe(200);
    const sliced = INTERPOLATED.map(slice);
    const leastResidual = Math.min(...sliced.map(({ r }) => r));
    expect(leastResidual, `the closest of the 200 points sits ${leastResidual.toExponential(3)} above its table entry; a point ON an entry would exercise no residual at all`)
      .toBeGreaterThan(0);
    expect(new Set(sliced.map(({ f1 }) => f1)).size, 'the 200 points must interpolate off every one of the 100 ANTA entries')
      .toBe(100);
  });

  it('agrees with Math.pow at those 200 interpolated points within the published 1.0e-5 relative', () => {
    const w = worstOf(INTERPOLATED, (a) => Math.abs(antilogFixed(a).value - 10 ** a) / 10 ** a);
    expect(w.value, `the quantised antilog's worst relative deviation over the 200 interpolated points is ${w.value.toExponential(4)} at argument ${w.at.toFixed(6)}, against the published ${TOLERANCES.atmosphereRelative.toExponential(1)}`)
      .toBeLessThanOrEqual(TOLERANCES.atmosphereRelative);
  });
});

describe('Wave 1 — the quadratic residual\'s truncation bound, computed rather than quoted', () => {
  it('carries ln 10 and (ln 10)^2/2 at eight digits, and c2 is 2.6509491 and not 2.6509337', () => {
    expect(ANTILOG_C1, `c1 = ${ANTILOG_C1} against ln 10 = ${Math.LN10} at eight digits`).toBe(2.3025851);
    expect(ANTILOG_C2, `c2 = ${ANTILOG_C2} against (ln 10)^2/2 = ${(Math.LN10 ** 2 / 2).toFixed(10)} at eight digits`)
      .toBe(2.6509491);
    expect(ANTILOG_C2, 'c2 must not be the 2.6509337 the panel\'s sheet printed (§5.6)').not.toBe(2.6509337);
  });

  it('bounds the leading truncated term (ln10 r)^3/6 by §5.6\'s 2.034e-6 at the worst r < 0.01', () => {
    // §5.6 states the bound as RELATIVE, and the mantissa/decade form is what makes it so:
    // ANTA[F1] is in [1,10), CORR in [1, 1.0233] and the decade is exact, so the residual term is
    // divided by 10^r before it reaches the mantissa. Taken as a bare absolute quantity the same
    // term is 2.0347e-6 at r -> 0.01, which is above the published figure by a rounding of its own
    // last digit — the message carries both so the reader can see which one 2.034e-6 is.
    const rMax = 0.0099999;
    const leadingTerm = (ANTILOG_C1 * rMax) ** 3 / 6;
    const relative = leadingTerm / 10 ** rMax;
    expect(relative, `(ln10 r)^3/6 at r = ${rMax} is ${leadingTerm.toExponential(4)} absolute and ${relative.toExponential(4)} relative to 10^r, against §5.6's published ${ANTILOG_TRUNCATION_BOUND.toExponential(3)}`)
      .toBeLessThanOrEqual(ANTILOG_TRUNCATION_BOUND);
  });

  it('measures the quadratic form itself against 10^r over every value R can hold, inside the same bound', () => {
    let worstValue = 0;
    let worstR = 0;
    for (let i = 0; i <= RESIDUAL_STEPS; i += 1) {
      const r = i / 1e7;
      if (r > 0.0099999) break;
      const corr = 1 + r * (ANTILOG_C1 + ANTILOG_C2 * r);
      const want = 10 ** r;
      const deviation = Math.abs(corr - want) / want;
      if (deviation > worstValue) { worstValue = deviation; worstR = r; }
    }
    expect(worstValue, `the quadratic CORR deviates from 10^r by at most ${worstValue.toExponential(4)} relative, at r = ${worstR}, against §5.6's published ${ANTILOG_TRUNCATION_BOUND.toExponential(3)}`)
      .toBeLessThanOrEqual(ANTILOG_TRUNCATION_BOUND);
    expect(worstValue, 'the residual sweep must find a non-zero worst case, or it swept nothing')
      .toBeGreaterThan(0);
  });
});
