// test/fixtures/reentry-reference.ts — the reference the emulated 1410 is judged against: the
// closed forms of NACA Report 1381 (layer 1), a double-precision RK4 integration of the same
// two-state set (layer 2), and a fixed-point simulator of the deck's own decimal arithmetic
// (layer 3).
// Source: docs/plans/phase-6-reentry.md §4 (the physics, the four reference layers, the published
// tolerances, the two guards), §5.1-§5.7 (the five rules, the scaling table, the nineteen products,
// the antilog, and why there is no u^3.15 table), §11 wave 1.
//
// PRIMARY SOURCES, by form number and page:
//  · NACA Report 1381, Allen & Eggers (1958; work dated 1953) — assumptions pp.5-6, eq.7 (the
//    exponential atmosphere), eq.13 (V(h)), eq.15 (y1), eq.16 (V1), eq.17 (peak deceleration, and
//    the warning that 16-17 apply only when y1 > 0). [verified] via docs/research/avco-and-reentry.md
//    §4 and §8.
//  · Detra, Kemp & Riddell, "Addendum to Heat Transfer to Satellite Vehicles Re-entering the
//    Atmosphere," Jet Propulsion 27(12) (1957) pp.1256-1257 — stagnation heating. The period-unit
//    form used here is [likely] (avco-and-reentry.md:158-160), and the correlation's OWN accuracy is
//    +/-10-20 % (avco-and-reentry.md:160). Nothing downstream of it is more accurate than that.
//  · IBM A22-0526-3, IBM 1410 Principles of Operation (NOT the 1401 — 1401 is a different machine
//    with a different multiply) — pp.18-19: the product develops in the B field, which must hold
//    multiplicand digits + multiplier digits + 1, so 8 x 8 needs 17 (§5.4, PRODUCT_FIELD_POSITIONS);
//    p.16 Fig.11: sign is the zone bits of the units position; p.29: the "five positions or less,
//    store the factor itself" table guidance §5.7 declines.
//  · IBM C28-0328-3 p.10 — "A**B is computed from EXP(B*ALOG(A))" [verified]: the documented IBM
//    rule that puts V^3.15 through logs instead of through a table (§5.7).
//  · Abramowitz & Stegun, Handbook of Mathematical Functions (1964) — 5.1.10/5.1.11 (the Ei series),
//    5.1.51 (its asymptotic form), 7.1.6 (the positive-term erf series used below).
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It imports NOTHING from `src/`, of any kind.** That is a rule of the file, not a preference.
//    Layer 2 is the counterpart the emulated machine is gated against (plan §4.4); a reference that
//    imported the emulator's own arithmetic — its ALU, its antilog, its scaling helpers — would be
//    gating the machine against itself, and the gate would go green on a shared bug. Node and vitest
//    built-ins only, and in practice not even those.
//  · It prints nothing and formats nothing. Edit words, print positions and the truncation on the
//    print path are §7's business; every quantity here is a number at its scale.
//  · It models no gravity. `// OPEN: GRAVITY_IS_NOT_IMPLEMENTED` — a ruling (plan §4.1, §15 row 9).
//    Fallback: add `-g0 sin gamma_E` to dV/dt, one constant and one add per derivative evaluation;
//    what would settle it is Zarathustrum's word, and the price is that eq.13 stops being an oracle (123.77
//    ft/s of physics in a column designed to print 0.07 ft/s of arithmetic).
//  · It asserts nothing. The assertions are `test/reentry-reference.test.ts`,
//    `test/reentry-tables.test.ts` and `test/reentry-scaling.test.ts`, which a separate wave-1
//    worker writes against the data this file exports.
//
// THE TWO DERIVATIONS THAT ARE NOT ON A PAGE OF NACA 1381 (plan §4.3 requires them here, in full,
// because they are the only physics in the phase without a primary page behind it). Both hold ONLY
// in the drag-only configuration — avco-and-reentry.md:372, [verified] — and both depend on the run
// starting on eq.13's own curve, which is why V0 is not V_E.
//
//   ELAPSED TIME — the Ei form.  With dh/dt = V sin gamma_E and 1/V = e^(K X')/V_E:
//
//     t(h) = (1 / (|sin g| V_E)) INTEGRAL[h..h0] e^(K X') dh'
//            X' = e^(-beta h'),  dh' = -dX'/(beta X')
//          = (1 / (beta |sin g| V_E)) INTEGRAL[X0..X] e^(K X') dX'/X'
//            w = K X',  dw/w = dX'/X'
//          = [ Ei(K X) - Ei(K X0) ] / (beta |sin g| V_E)
//
//   with beta |sin g| V_E = 0.52272727 s^-1.  Ei is the exponential integral.
//
//   HEAT LOAD — the erf form.  q_dot = A_q X^(1/2) e^(-3.15 K X) once V = V_E e^(-K X) is put into
//   Detra-Kemp-Riddell, and the same 1/V substitution collapses the time integral:
//
//     Q(h) = INTEGRAL q_dot dt = (1/(|sin g| V_E)) INTEGRAL[h..h0] q_dot(h') e^(K X') dh'
//            the integrand is A_q X'^(1/2) e^(-2.15 K X')          (3.15 - 1 = 2.15)
//            X' = e^(-beta h'):
//          = C_q INTEGRAL[X0..X] X'^(-1/2) e^(-2.15 K X') dX'      C_q = A_q/(beta |sin g| V_E)
//            u = sqrt(X'),  dX' = 2u du,  X'^(-1/2) = 1/u:
//          = C_q * 2 INTEGRAL e^(-2.15 K u^2) du
//          = C_q sqrt(pi/(2.15 K)) [ erf(sqrt(2.15 K X)) - erf(sqrt(2.15 K X0)) ]
//
//   and CQ — the log10 prefactor the deck folds its heating constants into — is EXACTLY log10(A_q).
//   `constantDisagreements()` computes both independently and reports if they part company in the
//   eighth digit; that agreement is what makes the log form and the erf form the same physics.

// ---------------------------------------------------------------------------------------------
// The constants (plan §4.2, the authoritative copy). Every one is recomputed here from its own
// definition and checked against §4.2's published literal by `constantDisagreements()`.
// ---------------------------------------------------------------------------------------------

/** NACA 1381 eq.7's curve-fit surface density — NOT sea level. [verified] */
export const RHO0 = 0.0034;
/** NACA 1381 eq.7's inverse scale height, 1/H with H = 22,000 ft. [verified] */
export const BETA = 1 / 22000;
/** True sea-level density, the value Detra-Kemp-Riddell normalises by. [verified] */
export const RHO_SL = 0.0023769;
/** ft/s^2. [verified] avco-and-reentry.md §5. */
export const G0 = 32.174;
/** log10(e), to double precision. */
export const LOG10_E = Math.LOG10E;

/**
 * THE NORMALISATION TRAP (avco-and-reentry.md:325, [verified]). Allen-Eggers rho0 is a curve-fit
 * constant; DKR divides by true rho_SL. The 1.43043460 between them is real and is the easiest
 * constant in the phase to drop.
 */
export const RHO0_OVER_RHO_SL = RHO0 / RHO_SL;
/** C1 = log10(rho0/rho_SL) = 0.15546801. [verified] */
export const C1 = Math.log10(RHO0_OVER_RHO_SL);
/** C2 = beta log10(e) = 1.97406583e-5 per ft. [verified] */
export const C2 = BETA * LOG10_E;

/** The eighty columns of the case card, as numbers (plan §4.2, Zarathustrum's decision 5; §6.12). */
export interface ReentryCase {
  /** ft/s at h_E — the card's `V-E`. The run does NOT start here; see `Derived.v0`. */
  readonly vE: number;
  /** Printed on every row as the loudest disclosure of the constant-gamma assumption. */
  readonly gammaEDegrees: number;
  /** EXACTLY -0.5 at -30.00 deg. Written as a literal, not as Math.sin, so it is exact. */
  readonly sinGammaE: number;
  /** cot|gamma_E| = sqrt(3) at -30.00 deg — the RANGE constant's numerator. */
  readonly cotAbsGammaE: number;
  /** lb/ft^2. `// OPEN: BALLISTIC_COEFFICIENT_IS_GENERIC` — see the note at DEFAULT_CASE. */
  readonly wOverCdA: number;
  /** Nose radius, ft. */
  readonly rN: number;
  /** Entry altitude, ft — on the card and echoed in the heading, and NOT the band top. */
  readonly hE: number;
  /** ft — where the printed table starts. */
  readonly bandTop: number;
  /** s. */
  readonly dt: number;
}

/**
 * Plan §4.2's card, Zarathustrum's decision 5. Defensible, arbitrary within a factor of two, and generic.
 *
 * `// OPEN: BALLISTIC_COEFFICIENT_IS_GENERIC` — [unverified] as a vehicle number, plan §15 row 3.
 * avco-and-reentry.md:154 is explicit that representative Mark-4/5/11 ballistic coefficients "are
 * not documented in any source consulted here — do not invent them". There is no fallback because
 * there is nothing to fall back to; the page says GENERIC beside the number. What would settle it:
 * a declassified period vehicle document, which is why it is a permanent disclosure and not a task.
 */
export const DEFAULT_CASE: ReentryCase = {
  vE: 23000.0,
  gammaEDegrees: -30.0,
  sinGammaE: -0.5,
  cotAbsGammaE: Math.sqrt(3),
  wOverCdA: 1000.0,
  rN: 1.0,
  hE: 400000,
  bandTop: 150000,
  dt: 0.25,
};

/** Everything the deck's init block forms once, from the card (plan §4.2). */
export interface Derived {
  /** m/(C_D A), slug/ft^2 — the card's W/(C_D A) over g0. 31.080997 at the default case. */
  readonly betaB: number;
  /** K = rho0/(2 beta beta_B |sin gamma_E|) — eq.13's exponent coefficient. */
  readonly k: number;
  /** K log10(e). */
  readonly kLog10e: number;
  /** 3.15 K log10(e) — the heating chain's X coefficient. */
  readonly k315Log10e: number;
  /** CQ, the folded log10 heating prefactor. Exactly log10(aq). */
  readonly cq: number;
  /** A_q = 17600 sqrt(rho0/rho_SL) (V_E/26000)^3.15 / sqrt(R_N) = 14,306.1676. */
  readonly aq: number;
  /** C_q = A_q/(beta |sin g| V_E) = 27,368.321 — the erf form's coefficient. */
  readonly cqHeat: number;
  /** 2.15 K = 5.174223. */
  readonly twoPointOneFiveK: number;
  /** sqrt(pi/(2.15 K)) = 0.779206. */
  readonly sqrtPiOver215K: number;
  /** 1/(2 beta_B). */
  readonly oneOver2BetaB: number;
  /** rho0/(2 beta_B) — an identity, K |sin g|/H, not a constant the deck holds (plan §4.2). */
  readonly rho0Over2BetaB: number;
  /** rho_SL/(2 beta_B). The deck holds 10^6 times this as CDP. */
  readonly rhoSlOver2BetaB: number;
  /** cot|gamma_E|/6076.1 — ft to nautical miles along the ground. */
  readonly crng: number;
  /** beta |sin gamma_E| V_E = 0.52272727 s^-1 — the Ei form's divisor. */
  readonly betaSinVe: number;
  /** X0 = e^(-beta h0) at the band top. */
  readonly x0: number;
  /** K X0. */
  readonly kx0: number;
  /**
   * THE BAND-TOP STATE. The run does NOT start at V_E: it starts on eq.13's own curve continued
   * down from h_E = 400,000 ft, at 22,939.54 ft/s. Starting at 23,000 puts the whole trajectory
   * 60.46 ft/s off eq.13 on every row — 121x the published 0.50 ft/s DIFF bound of §4.5 — moves the
   * last row from h = 198.8 ft to 135.5, moves the printed peak from 68.7 g to 69.1, and breaks the
   * Ei and erf substitutions above, which both assume 1/V = e^(K X')/V_E. It is the single easiest
   * thing in this phase to get wrong (plan §4.1).
   */
  readonly v0: number;
}

export function derive(c: ReentryCase = DEFAULT_CASE): Derived {
  const betaB = c.wOverCdA / G0;
  const absSin = Math.abs(c.sinGammaE);
  const k = RHO0 / (2 * BETA * betaB * absSin);
  const aq = 17600 * Math.sqrt(RHO0_OVER_RHO_SL) * (c.vE / 26000) ** 3.15 / Math.sqrt(c.rN);
  const betaSinVe = BETA * absSin * c.vE;
  const x0 = Math.exp(-BETA * c.bandTop);
  return {
    betaB,
    k,
    kLog10e: k * LOG10_E,
    k315Log10e: 3.15 * k * LOG10_E,
    // Formed the way the deck forms it — from four independent logs, never from log10(aq) — so
    // that the agreement with log10(aq) is a check and not a tautology.
    cq: Math.log10(17600) - 0.5 * Math.log10(c.rN) + 0.5 * C1 + 3.15 * Math.log10(c.vE / 26000),
    aq,
    cqHeat: aq / betaSinVe,
    twoPointOneFiveK: 2.15 * k,
    sqrtPiOver215K: Math.sqrt(Math.PI / (2.15 * k)),
    oneOver2BetaB: 1 / (2 * betaB),
    rho0Over2BetaB: RHO0 / (2 * betaB),
    rhoSlOver2BetaB: RHO_SL / (2 * betaB),
    crng: c.cotAbsGammaE / 6076.1,
    betaSinVe,
    x0,
    kx0: k * x0,
    v0: c.vE * Math.exp(-k * x0),
  };
}

/** The default case's derived block, formed once. */
export const DERIVED: Derived = derive(DEFAULT_CASE);

/**
 * Plan §4.2's published literals, verbatim. `constantDisagreements()` recomputes each from its own
 * definition and compares at eight significant digits: a disagreement is a finding, not a rounding.
 */
export const PUBLISHED_CONSTANTS: Readonly<Record<string, number>> = {
  rho0OverRhoSl: 1.43043460,
  c1: 0.15546801,
  c2: 1.97406583e-5,
  betaB: 31.080997,
  k: 2.40661520,
  kLog10e: 1.04517970,
  k315Log10e: 3.29231606,
  cq: 4.15552331,
  aq: 14306.1676,
  oneOver2BetaB: 0.01608700,
  rho0Over2BetaB: 5.4695800e-5,
  rhoSlOver2BetaB: 3.8237190e-5,
  crng: 2.8505963e-4,
  betaSinVe: 0.52272727,
  x0: 1.0937077e-3,
  kx0: 2.632134e-3,
  v0: 22939.54,
  cqHeat: 27368.321,
  twoPointOneFiveK: 5.174223,
  sqrtPiOver215K: 0.779206,
  y1: 34570.1,
  v1: 13950.2,
  peakDecelG: 68.7343,
};

/** Round to eight significant digits — the precision plan §5.1 rule 5 asks every constant to carry. */
export function toEightSignificant(x: number): number {
  if (x === 0) return 0;
  const f = 10 ** (7 - Math.floor(Math.log10(Math.abs(x))));
  return Math.round(x * f) / f;
}

/**
 * How many significant digits a published literal actually carries. §4.2 publishes some constants
 * to fewer than eight — `y1` as 34,570.1, `sqrt(pi/2.15K)` as 0.779206 — and a check that demanded
 * eight from a six-digit literal would report a disagreement where there is only a shorter
 * publication. Trailing zeros are gone by the time the literal is a JS number, so this is a floor
 * and never an overstatement.
 */
function significantDigits(x: number): number {
  const mantissa = Math.abs(x).toExponential().split('e')[0] ?? '0';
  return mantissa.replace('.', '').replace(/0+$/, '').length || 1;
}

/**
 * Every recomputed constant against §4.2's published literal, at the precision the literal is
 * published to and never beyond eight significant digits. Returns one line per disagreement, and an
 * empty array when the section and the arithmetic agree.
 * `aq` and `cq` are in here twice over: `cq` is checked against its literal, and `log10(aq)` against
 * `cq`, which is the identity plan §4.2 says makes the log form and the erf form the same physics.
 */
export function constantDisagreements(c: ReentryCase = DEFAULT_CASE): string[] {
  const d = derive(c);
  const out: string[] = [];
  const check = (name: string, computed: number): void => {
    const published = PUBLISHED_CONSTANTS[name];
    if (published === undefined) { out.push(`${name}: no published literal`); return; }
    const n = Math.min(significantDigits(published), 8);
    const halfUlp = 0.5 * 10 ** (Math.floor(Math.log10(Math.abs(published))) - n + 1);
    // The 1e-9 is slack for a decimal literal that is a floating-point tie, not tolerance for a
    // wrong digit: a real disagreement in the last published digit is a whole ulp, not half of one.
    if (Math.abs(computed - published) > halfUlp * (1 + 1e-9)) {
      out.push(`${name}: recomputed ${computed} vs published ${published} at ${n} significant digits`);
    }
  };
  check('rho0OverRhoSl', RHO0_OVER_RHO_SL);
  check('c1', C1);
  check('c2', C2);
  check('betaB', d.betaB);
  check('k', d.k);
  check('kLog10e', d.kLog10e);
  check('k315Log10e', d.k315Log10e);
  check('cq', d.cq);
  check('aq', d.aq);
  check('oneOver2BetaB', d.oneOver2BetaB);
  check('rho0Over2BetaB', d.rho0Over2BetaB);
  check('rhoSlOver2BetaB', d.rhoSlOver2BetaB);
  check('crng', d.crng);
  check('betaSinVe', d.betaSinVe);
  check('x0', d.x0);
  check('kx0', d.kx0);
  check('v0', d.v0);
  check('cqHeat', d.cqHeat);
  check('twoPointOneFiveK', d.twoPointOneFiveK);
  check('sqrtPiOver215K', d.sqrtPiOver215K);
  check('y1', eq15PeakDecelAltitude(c));
  check('v1', eq16PeakDecelVelocity(c));
  check('peakDecelG', eq17PeakDecelG(c));
  if (toEightSignificant(Math.log10(d.aq)) !== toEightSignificant(d.cq)) {
    out.push(`cq vs log10(aq): ${toEightSignificant(d.cq)} vs ${toEightSignificant(Math.log10(d.aq))} — the log form and the erf form are not the same physics`);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// LAYER 1 — the closed forms. NACA 1381 through avco-and-reentry.md §4 and §8, all [verified],
// plus the two quadratures derived in this file's header.
// ---------------------------------------------------------------------------------------------

/** X = e^(-beta h), the variable every closed form below is written in. */
export function atmosphereX(h: number): number {
  return Math.exp(-BETA * h);
}

/** eq.7 — rho = rho0 e^(-h/22,000) slug/ft^3. [verified] NACA 1381 eq.7. */
export function density(h: number): number {
  return RHO0 * atmosphereX(h);
}

/** eq.13 — V(h) = V_E exp(-K X). [verified] NACA 1381 eq.13. Column 4 on every printed row. */
export function eq13Velocity(h: number, c: ReentryCase = DEFAULT_CASE, d: Derived = derive(c)): number {
  return c.vE * Math.exp(-d.k * atmosphereX(h));
}

/** eq.15 — y1 = (1/beta) ln(2K), the altitude of peak deceleration. [verified] NACA 1381 eq.15. */
export function eq15PeakDecelAltitude(c: ReentryCase = DEFAULT_CASE, d: Derived = derive(c)): number {
  return Math.log(2 * d.k) / BETA;
}

/** eq.16 — V1 = V_E e^(-1/2), the speed there. [verified] NACA 1381 eq.16. Valid only when y1 > 0. */
export function eq16PeakDecelVelocity(c: ReentryCase = DEFAULT_CASE): number {
  return c.vE * Math.exp(-0.5);
}

/**
 * eq.17 — max (dV/dt)/g = beta V_E^2 |sin theta_E| / (2 g0 e). [verified] NACA 1381 eq.17.
 * Independent of mass, size and C_D, which is what makes the W/(C_D A) invariance regression of
 * plan §4.6 free. Valid only when y1 > 0.
 */
export function eq17PeakDecelG(c: ReentryCase = DEFAULT_CASE): number {
  return BETA * c.vE ** 2 * Math.abs(c.sinGammaE) / (2 * G0 * Math.E);
}

/**
 * GUARD A — eqs.16-17 apply only when y1 from eq.15 is positive (avco-and-reentry.md:152 and :368,
 * [verified], NACA 1381's own warning), i.e. exactly when 2K > 1. The deck's guard is a compare on
 * the constant it has just formed, so it is general in gamma_E and beta_B rather than a threshold
 * on one input. Test case: W/(C_D A) = 5,000 lb/ft^2, where K = 0.4813 and y1 = -838 ft.
 */
export function closedFormCheckpointsApply(c: ReentryCase = DEFAULT_CASE, d: Derived = derive(c)): boolean {
  return 2 * d.k > 1;
}

/**
 * Detra-Kemp-Riddell stagnation heating in period units, BTU/ft^2-s.
 * [likely] — avco-and-reentry.md:158, unit-checked against arXiv 1910.06397 eq.19. Its OWN accuracy
 * is +/-10-20 % (avco-and-reentry.md:160), which is printed beside the two heating columns.
 *
 * `// OPEN: DKR_IN_PERIOD_UNITS` — [likely], plan §15 row 5. The SI form is primary and the period
 * form is an arithmetic conversion (1.99876e8 W/m^2 x 8.811e-5 = 17,611 BTU/ft^2-s at r_n = 1 ft;
 * 7,924.8 m/s = 26,000 ft/s). Fallback: evaluate the SI form and convert at print time — the same
 * numbers, one more multiply, a less period-plausible program. What would settle it: the 1957 Jet
 * Propulsion pages in their original units.
 */
export function heatRate(h: number, v: number, c: ReentryCase = DEFAULT_CASE): number {
  return 17600 * Math.sqrt(density(h) / RHO_SL) * (v / 26000) ** 3.15 / Math.sqrt(c.rN);
}

/**
 * The exponential integral Ei(x) for x > 0. Series (A&S 5.1.10/5.1.11) below 20, asymptotic form
 * (A&S 5.1.51) above it. Every argument this phase asks for is small — K X runs from K X0 =
 * 2.632134e-3 up to K = 2.4066 at sea level — so the series governs and the asymptotic branch is
 * carried for completeness rather than for the trajectory.
 */
export function ei(x: number): number {
  if (x <= 0) throw new RangeError(`ei: x must be positive, got ${x}`);
  const EULER_GAMMA = 0.5772156649015329;
  if (x < 20) {
    let term = 1;
    let sum = 0;
    for (let n = 1; n <= 200; n += 1) {
      term *= x / n;
      const add = term / n;
      sum += add;
      if (Math.abs(add) < 1e-18 * Math.abs(sum)) break;
    }
    return EULER_GAMMA + Math.log(x) + sum;
  }
  let term = 1;
  let sum = 1;
  for (let n = 1; n <= 40; n += 1) {
    const next = term * n / x;
    if (next > term) break;
    term = next;
    sum += term;
  }
  return Math.exp(x) / x * sum;
}

/**
 * The error function, by A&S 7.1.6 — erf(x) = (2x/sqrt(pi)) e^(-x^2) SUM (2x^2)^n/(1.3.5...(2n+1)).
 * Every term is positive, so there is no cancellation at the arguments this phase uses
 * (sqrt(2.15 K X) reaches 2.2746 at sea level). A&S 7.1.26's rational form was declined: its 1.5e-7
 * absolute error is fifty times the heat-load quantity the erf difference is checked to.
 */
export function erf(x: number): number {
  if (x < 0) return -erf(-x);
  if (x === 0) return 0;
  const xx = x * x;
  let term = 1;
  let sum = 1;
  for (let n = 1; n <= 300; n += 1) {
    term *= 2 * xx / (2 * n + 1);
    sum += term;
    if (term < 1e-18 * sum) break;
  }
  return 2 * x / Math.sqrt(Math.PI) * Math.exp(-xx) * sum;
}

/**
 * Elapsed time from the band top to altitude h, by the Ei form derived in this file's header.
 * Reference-side only: it costs the emulator nothing and turns TIME from an unchecked counter into
 * a quantity with a closed form behind it. Published tolerance 1.0e-4 s (plan §4.5).
 */
export function elapsedTime(h: number, c: ReentryCase = DEFAULT_CASE, d: Derived = derive(c)): number {
  return (ei(d.k * atmosphereX(h)) - ei(d.kx0)) / d.betaSinVe;
}

/**
 * Heat load from the band top to altitude h, by the erf form derived in this file's header.
 * Published tolerance 1.0e-3 relative (plan §4.5); the dt = 0.25 trapezoid the program runs agrees
 * with it to 3.28e-5 at the last row.
 */
export function heatLoad(h: number, c: ReentryCase = DEFAULT_CASE, d: Derived = derive(c)): number {
  const x = atmosphereX(h);
  return d.cqHeat * d.sqrtPiOver215K
    * (erf(Math.sqrt(d.twoPointOneFiveK * x)) - erf(Math.sqrt(d.twoPointOneFiveK * d.x0)));
}

// ---------------------------------------------------------------------------------------------
// LAYER 2 — double-precision RK4 over (V, h) at dt = 0.25 s, plus the trapezoid for Q.
// THE GATE'S COUNTERPART (plan §4.4). This is what the emulated machine is judged against.
// ---------------------------------------------------------------------------------------------

/** One printed row's worth of state, at full double precision or at the deck's scales. */
export interface TrajectoryRow {
  /** 1-based; the last is 92. */
  readonly index: number;
  /** s, from the band top. */
  readonly t: number;
  /** ft. */
  readonly h: number;
  /** ft/s, integrated. */
  readonly v: number;
  /** ft/s, eq.13 at this row's altitude — the per-row independent check. */
  readonly vAE: number;
  /** v - vAE. The fixed-point error itself, which is why DIFF is exempt from the one-ulp rule. */
  readonly diff: number;
  /** a_D/g0. */
  readonly decelG: number;
  /** rho V^2/2, lb/ft^2. */
  readonly dynPressure: number;
  /** C1 - C2 h — the antilog's own argument, exact, with no antilog in its path. */
  readonly log10RhoRatio: number;
  /** BTU/ft^2-s. */
  readonly heatRate: number;
  /** BTU/ft^2, the running trapezoid. */
  readonly heatLoad: number;
  /** n.mi. along the ground, (h0 - h) cot|gamma_E|/6076.1. */
  readonly range: number;
}

export interface TrajectoryRun {
  readonly rows: readonly TrajectoryRow[];
  /**
   * GUARD B — the altitude the step after the last row would have reached, refused because it is
   * at or below zero. -62.2 ft at the default case. The loop tests the CANDIDATE h before
   * committing the step and before printing, so the last printed row is the last row above ground:
   * this is loop control, not error handling — the run ends because the vehicle arrived.
   */
  readonly refusedAltitude: number;
  /** The row carrying the largest DECEL. */
  readonly peakDecelRow: TrajectoryRow;
  /** The row carrying the largest HEAT RATE. */
  readonly peakHeatRateRow: TrajectoryRow;
  /** The largest DYN PRESS over the run, lb/ft^2. */
  readonly peakDynPressure: number;
  /** The largest |DIFF| over the run, ft/s. */
  readonly maxAbsDiff: number;
}

/** dV/dt = -rho V^2/(2 beta_B), the drag-only derivative. Gravity is not modelled (see the header). */
function dvdt(v: number, h: number, betaB: number): number {
  return -density(h) * v * v / (2 * betaB);
}

/** dh/dt = V sin gamma_E, with sin gamma_E constant and exactly -0.5 at -30.00 deg. */
function dhdt(v: number, sinGammaE: number): number {
  return v * sinGammaE;
}

/**
 * Layer 2. RK4 in time over the two states, the trapezoid for Q, both guards.
 *
 * `// OPEN: RK4_IS_ASSERTED_ERA_PRACTICE` — [unverified], plan §15 row 4. avco-and-reentry.md:187
 * says plainly that "period trajectory programs used fourth-order Runge-Kutta" has no Avco source.
 * Nothing here appeals to it: RK4 is chosen by measurement (6.463e-4 ft/s against eq.13 at
 * dt = 0.25, three orders inside the fixed-point error the DIFF column measures). Fallback: Heun at
 * dt = 0.25, half the derivative evaluations and four orders of method accuracy given up — enough to
 * move the printed VELOCITY column, so it is a fallback of last resort. What would settle it: a
 * period Avco program listing.
 */
export function integrate(c: ReentryCase = DEFAULT_CASE, d: Derived = derive(c)): TrajectoryRun {
  const rows: TrajectoryRow[] = [];
  const { dt, sinGammaE, bandTop } = c;
  let t = 0;
  let h = bandTop;
  let v = d.v0;
  let q = 0;
  let previousRate = 0;
  let refusedAltitude = Number.NaN;

  for (let index = 1; ; index += 1) {
    const rate = heatRate(h, v, c);
    if (index > 1) q += (previousRate + rate) / 2 * dt;
    previousRate = rate;
    const accel = -dvdt(v, h, d.betaB);
    const vAE = eq13Velocity(h, c, d);
    rows.push({
      index, t, h, v, vAE,
      diff: v - vAE,
      decelG: accel / G0,
      dynPressure: density(h) * v * v / 2,
      log10RhoRatio: C1 - C2 * h,
      heatRate: rate,
      heatLoad: q,
      range: (bandTop - h) * d.crng,
    });

    const k1v = dvdt(v, h, d.betaB), k1h = dhdt(v, sinGammaE);
    const k2v = dvdt(v + dt / 2 * k1v, h + dt / 2 * k1h, d.betaB), k2h = dhdt(v + dt / 2 * k1v, sinGammaE);
    const k3v = dvdt(v + dt / 2 * k2v, h + dt / 2 * k2h, d.betaB), k3h = dhdt(v + dt / 2 * k2v, sinGammaE);
    const k4v = dvdt(v + dt * k3v, h + dt * k3h, d.betaB), k4h = dhdt(v + dt * k3v, sinGammaE);
    const candidateH = h + dt / 6 * (k1h + 2 * k2h + 2 * k3h + k4h);
    if (candidateH <= 0) { refusedAltitude = candidateH; break; }
    v += dt / 6 * (k1v + 2 * k2v + 2 * k3v + k4v);
    h = candidateH;
    t += dt;
  }
  return summarise(rows, refusedAltitude);
}

function summarise(rows: readonly TrajectoryRow[], refusedAltitude: number): TrajectoryRun {
  const first = rows[0];
  if (first === undefined) throw new Error('a trajectory with no rows');
  let peakDecelRow = first;
  let peakHeatRateRow = first;
  let peakDynPressure = 0;
  let maxAbsDiff = 0;
  for (const row of rows) {
    if (row.decelG > peakDecelRow.decelG) peakDecelRow = row;
    if (row.heatRate > peakHeatRateRow.heatRate) peakHeatRateRow = row;
    if (row.dynPressure > peakDynPressure) peakDynPressure = row.dynPressure;
    if (Math.abs(row.diff) > maxAbsDiff) maxAbsDiff = Math.abs(row.diff);
  }
  return { rows, refusedAltitude, peakDecelRow, peakHeatRateRow, peakDynPressure, maxAbsDiff };
}

// ---------------------------------------------------------------------------------------------
// LAYER 3 — the fixed-point simulator, at §5.2's scaling table and §5.6's antilog.
//
// A REGRESSION PIN, NEVER THE GATE (plan §4.4). It and the deck are written from one scaling table
// by one team, so their agreement proves a shared implementation and not correctness — and the
// cheapest way past a red gate is to edit the simulator. Its value survives the demotion intact: it
// is what turns a fixed-point scaling bug into a digit-for-digit comparison during the build, and
// wave 3's oracle is exact per-step equality against it. THE GATE IS LAYER 4 AGAINST LAYERS 1-2.
//
// `// OPEN: THE_SCALING_TABLE_IS_OURS` — [verified by absence], plan §15 row 6. IBM never issued a
// 1410 numeric-conventions manual and A22-0526-3 deliberately has no fixed decimal point: the
// machine is variable-field-length and the programmer owns the point (avco-and-reentry.md:213).
// The only surviving model is pi.job. Fallback: none needed — the table is a design, and it says so
// on the page. What would settle it: an IBM 1410 numeric-conventions manual, which does not exist.
// ---------------------------------------------------------------------------------------------

/**
 * Plan §5.1 rule 3 — half-adjust before every truncating move, `A +5,WORK-n+1`, INSIDE the
 * arithmetic and nowhere else. Layer 3 models the arithmetic, so it half-adjusts everywhere; the
 * print path's truncation is §7's business and is not modelled here.
 *
 * `// OPEN: HALF_ADJUST_IS_ON_THE_MAGNITUDE` — a ruling, ours, added in wave 1 and therefore a LOGGED
 * PLAN DEVIATION (§15 freezes its ledger at the close of this wave; PHASE-6-NOTES.md §2 carries it,
 * and §1 owes it a row for wave 7's set-difference test).
 *
 * The half-adjust is taken on the MAGNITUDE — round half away from zero, which is what "half
 * adjust" means. The machine does not do this for free: `A +5,WORK-n+1` is an ALGEBRAIC add, so on
 * a field whose units zone carries a minus it adds +5 to a negative number and REDUCES the
 * magnitude, rounding toward zero instead. The fields where that bites are the ones this deck
 * actually carries signed — `K1V`…`K4V`, `DIF`, `L10R` and `ARG`.
 *
 * FALLBACK: model the literal `A +5` (round half toward zero on negative fields) and accept a
 * half-ulp split between layer 3 and the deck on exact ties.
 * WHAT SETTLES IT, and it is a CONSTRAINT ON WAVE 3 rather than an open question: the deck does its
 * arithmetic on MAGNITUDES and stamps the sign with `MLZS` — `pi.job`'s own idiom, §5.1 rule 4 —
 * in which case `A +5` always sees a positive field and this ruling and the machine agree. A wave-3
 * deck that half-adjusts a signed field in place instead must use the sign-matched literal, and
 * wave 3's oracle (f) parses the deck's own `A +5` sites, which is where the two are reconciled.
 */
export function halfAdjust(value: number, s: number): number {
  const scale = 10 ** s;
  const scaled = value * scale;
  return (scaled < 0 ? -Math.floor(-scaled + 0.5) : Math.floor(scaled + 0.5)) / scale;
}

/** ln 10 — the antilog residual's linear coefficient, at the deck's eight digits and S = 7. */
export const ANTILOG_C1 = 2.3025851;
/**
 * (ln 10)^2/2 — the quadratic coefficient. It is 2.6509491, NOT the 2.6509337 an earlier sheet
 * printed: (ln 10)^2/2 = 2.6509490552, so eight digits at S = 7 is 2.6509491.
 */
export const ANTILOG_C2 = 2.6509491;
/**
 * (ln10 r)^3/6 at r < 0.01 — the residual's truncation bound, RELATIVE and at every decade, which
 * is the whole point of a mantissa/decade form: ANTA[F1] is in [1,10), CORR in [1, 1.0233] and the
 * decade is exact, so the bound holds over every decade rho and q_dot traverse.
 *
 * It bounds the RESIDUAL TERM ALONE. The whole quantised chain carries it plus the eight-digit
 * fetch (9.02e-8 relative at the 100 entries) plus the half-adjusts at S = 7, and measures
 * 2.15e-6 over 201 interpolated arguments and 2.07e-6 over this trajectory's own — above 2.034e-6
 * and 4.7x inside §4.5's published 1.0e-5. Assert the published tolerance, not this bound.
 */
export const ANTILOG_TRUNCATION_BOUND = 2.034e-6;
/** A22-0526-3 pp.18-19: 8 x 8 develops in multiplicand + multiplier + 1 = 17 positions. */
export const PRODUCT_FIELD_POSITIONS = 17;

/**
 * ANTA — 100 entries of 10^(i/100), one ten-character DCW card each, contiguous at a ten-position
 * stride so the entry offset 10*F1 is a move one position left and costs nothing. TEN significant
 * digits are punched; the fetch takes the TOP EIGHT, and the low two are guard digits the `MLC`
 * discards rather than `00` filler. Entry 99 is 10^0.99 = 9.772372210, so its fetched form is
 * 97723722 — it is not 99770006, which is 10^0.999 and belongs to a table this design does not have.
 *
 * `// OPEN: ANTILOG_IS_ANTA_100_BY_10_WITH_A_QUADRATIC_RESIDUAL` — [likely] as a sizing, plan §15
 * row 7. Fallback, named and measured: add ANTB, 100 entries of 10^(i/10000) at the same stride
 * (+1,000 positions), for ANTA[F1] . ANTB[F2] . (1 + ln10 . F3) — truncation 2.65e-8, still three
 * multiplies, and not measured to change any printed digit on the page. What would settle it: the
 * wave-2 sweep under truncation, recorded in docs/BUILD-LOG-6.md.
 */
export const ANTA_DIGITS: readonly string[] = Array.from({ length: 100 }, (_unused, i) => {
  const value = 10 ** (i / 100);
  // Ten significant digits; every entry is in [1,10), so that is one integer digit and nine
  // fractional ones — the ten characters of the card, with the point implied.
  return Math.round(value * 1e9).toString().padStart(10, '0');
});

/** The eight digits an `MLC ANTA-2+X1,MANT` actually fetches, as a number at S = 7. */
export const ANTA_FETCHED: readonly number[] = ANTA_DIGITS.map((digits) => Number(digits.slice(0, 8)) / 1e7);

function anta(index: number): number {
  const entry = ANTA_FETCHED[index];
  if (entry === undefined) throw new RangeError(`ANTA index out of range: ${index}`);
  return entry;
}

/** What the deck's ANTLOG routine leaves behind: a mantissa in [1,10) at S = 7 and its decade. */
export interface Antilog {
  /** MANT, S = 7. */
  readonly mantissa: number;
  /** The unbiased decade — DEC - 10. */
  readonly decade: number;
  /** mantissa * 10^decade, for the callers that want the number rather than the two fields. */
  readonly value: number;
}

/**
 * §5.6's antilog: 10^F = ANTA[F1] (1 + r (c1 + c2 r)), Horner, three multiplies.
 *
 * The argument is biased by +10 into a NINE-position field so the decade slice is a plain field
 * slice rather than a signed test (§5.2). The three arguments this program antilogs are -C2 h in
 * [-2.9611, 0], -K log10(e) X in [-1.045, -0.001] and log10(q_dot) in [0.892, 3.348]; biased, they
 * run 7.039 ... 13.348, which needs two integer digits — which is why ARGB and KBIAS are nine
 * positions and eight would not hold the bias constant, let alone the biased argument.
 *
 * A product that reaches 10 or more is renormalised into [1,10) with its decade incremented; §5.3
 * row 4's peak of 10.0001 is exactly that case, and §5.2 holds MANT to [1,10).
 */
export function antilogFixed(argument: number): Antilog {
  const argb = halfAdjust(argument + 10, 7);          // ARGB, 9 positions at S = 7
  const dec = Math.floor(argb);                        // DEC, a two-digit field slice
  const f = halfAdjust(argb - dec, 7);                 // F, 7 positions at S = 7
  // F1, the two-digit index into ANTA. `MLN ARGB,F` then a two-digit slice is a FIELD SLICE on the
  // machine — it reads digits, it does not divide — so the model must not introduce arithmetic the
  // machine does not do. `Math.floor(f * 100)` does: over all 10^7 values `F` can hold it
  // disagrees with the slice on exactly three — F = 0.2900000, 0.5700000, 0.5800000 — where the
  // binary product lands a hair low and F1 comes out 28/56/57 instead of 29/57/58, leaving
  // r = 0.01, which the 5-position `R` field at S = 7 cannot hold (§5.2, max 0.0099999). Measured
  // at F = -2.71 that is 2.05e-6 relative against a correct slice's 9e-8. It does not bite this
  // trajectory, but wave 2 compares the deck digit-for-digit against this routine at 100 arguments
  // spanning -10..+6, and wave 3's oracle (a) is EXACT per-step equality; either could go red with
  // the deck right. Taking the digits off the integer field is what the machine does.
  const f1 = Math.floor(Math.round(f * 1e7) / 1e5);
  const r = halfAdjust(f - f1 / 100, 7);               // R, 5 positions at S = 7
  const inner = halfAdjust(ANTILOG_C2 * r, 7);         // product 2, offset 7
  const corr = 1 + halfAdjust((ANTILOG_C1 + inner) * r, 7); // product 3, offset 7
  let mantissa = halfAdjust(anta(f1) * corr, 7);       // product 4, offset 7
  let decade = dec - 10;
  if (mantissa >= 10) { mantissa = halfAdjust(mantissa / 10, 7); decade += 1; }
  return { mantissa, decade, value: mantissa * 10 ** decade };
}

/** The deck's constants, each at the S that fills its eight positions (plan §5.1 rule 5, §5.3). */
export interface FixedConstants {
  readonly kc2: number; readonly khc2: number; readonly rr0: number; readonly cdp: number;
  readonly bb: number; readonly cg: number; readonly ve: number; readonly kkl: number;
  readonly k315: number; readonly cq: number; readonly c1: number; readonly crng: number;
  readonly sing: number; readonly dt: number; readonly dt2: number; readonly dt6: number;
  readonly h0: number; readonly ktwo: number;
}

/**
 * `// OPEN: CONSTANTS_CARRY_EIGHT_SIGNIFICANT_DIGITS_AT_WHATEVER_S_THAT_TAKES` — a ruling, plan §15
 * row 24. 1/g0 = 0.031080997 written at S = 1 is 0.0, so each constant's S is chosen to fill its
 * eight positions and §5.3's offsets follow. Fallback if a constant ever needs nine: a nine-position
 * field and the offsets recomputed, one position each and nothing else — which is what ARGB and
 * KBIAS already are.
 */
export function fixedConstants(c: ReentryCase = DEFAULT_CASE, d: Derived = derive(c)): FixedConstants {
  return {
    kc2: halfAdjust(C2, 12),                 // S = 12 -> 19740658
    khc2: halfAdjust(C2 / 2, 13),            // S = 13 -> 98703291
    rr0: halfAdjust(RHO0_OVER_RHO_SL, 7),    // S =  7 -> 14304346
    cdp: halfAdjust(1e6 * d.rhoSlOver2BetaB, 6), // S = 6 -> 38237190; the 10^6 is free because VK is V in thousands
    bb: halfAdjust(d.betaB, 6),              // S =  6 -> 31080997
    cg: halfAdjust(1 / G0, 9),               // S =  9 -> 31080997, the SAME eight digits as BB
    ve: halfAdjust(c.vE, 2),
    kkl: halfAdjust(d.kLog10e, 7),           // S =  7 -> 10451797
    k315: halfAdjust(d.k315Log10e, 7),       // S =  7 -> 32923161
    cq: halfAdjust(d.cq, 7),                 // S =  7 -> 41555233
    c1: halfAdjust(C1, 8),                   // S =  8 -> 15546801
    crng: halfAdjust(d.crng, 11),            // S = 11 -> 28505963, NOT S = 10 (which is 7 digits)
    sing: halfAdjust(c.sinGammaE, 1),
    dt: halfAdjust(c.dt, 4),
    dt2: halfAdjust(c.dt / 2, 4),
    dt6: halfAdjust(c.dt / 6, 9),            // S = 9 -> 41666667
    h0: halfAdjust(c.bandTop, 1),
    ktwo: halfAdjust(2 * d.k, 7),            // the y1 > 0 guard's compare operand
  };
}

/** The drag chain, §5.3 products 1, 5, 6, 7, 8 and 9, at the scales §5.2 gives them. */
function fixedDeriv(v: number, h: number, k: FixedConstants): { ad: number; av: number; ah: number } {
  const argX = -halfAdjust(k.kc2 * h, 7);                  // product 1: S 12+1 -> 7, offset 6
  const x = antilogFixed(argX);
  let rhom = halfAdjust(k.rr0 * x.mantissa, 7);            // product 5: S 7+7 -> 7, offset 7
  let rhod = x.decade;
  if (rhom >= 10) { rhom = halfAdjust(rhom / 10, 7); rhod += 1; }
  const vk = v;                                            // VK EQU V — the same eight digits at S = 5
  const w1 = halfAdjust(vk / 1000 * (vk / 1000), 5);       // product 6: S 5+5 -> 5, offset 5
  const w2 = halfAdjust(w1 * k.cdp, 3);                    // product 7: S 5+6 -> 3, offset 8
  const ad = halfAdjust(w2 * rhom * 10 ** rhod, 4);        // product 8: offset 6 - RHOD, indexed
  // The stage is quantised to `K1V`...`K4V`'s own S = 2 (§5.2), NOT left at `AD`'s S = 4.
  // CORRECTED in wave 3 under §11.2's tie-break, and the reason is structural rather than a
  // preference. Left at S = 4 this line contradicted its own SCALING_TABLE row, and wave 1's
  // oracle could not see it: that oracle checks the TABLE against the rule, never the
  // implementation against the table. It also broke a [verified] machine fact — `SUMV` at S = 4
  // peaks at 132,652,361, nine digits, so `DT6 x SUMV` becomes 9 x 8 and needs an 18-position
  // product field, against A22-0526-3 pp.18-19's 8 + 8 + 1 = 17 that §5.2, §5.4, §5.11 and
  // test/reentry-scaling.test.ts all assert. Measured both ways over the 92 rows: S = 2 gives
  // max |DIFF| 0.0600 against S = 4's 0.0800, so the declared scale is also the more accurate
  // one and nothing is traded away. §5.3 rows 18 and 19 keep their published offsets, 4 and 9.
  // `ad` is returned at its OWN S = 4 (§5.2's `AD` row) alongside the stage at S = 2, because the
  // two have different consumers and the deck keeps them apart: `DERIV` lands `AD` at S = 4, and
  // only the stage copy `DVM` is rescaled to S = 2. Products 14 and 15 (`DECEL`, `DYN PRESS`)
  // multiply off `AD` at S = 4 — §5.3's own rows say `sA: 4` — so taking them from the S = 2 stage
  // would quantise them twice and move 7 of the 92 printed DYN PRESS cells.
  return { ad, av: halfAdjust(-ad, 2), ah: halfAdjust(v * k.sing, 1) };  // product 9: S 2+1 -> 1, offset 2
}

/** eq.13's velocity through the deck's own antilog — §5.3 products 10 and 11. */
function fixedVae(h: number, k: FixedConstants): number {
  const argX = -halfAdjust(k.kc2 * h, 7);
  const x = antilogFixed(argX);
  const kx = halfAdjust(k.kkl * x.mantissa * 10 ** x.decade, 7); // product 10, then the decade
  return halfAdjust(k.ve * antilogFixed(-kx).value, 2);          // product 11: S 2+7 -> 2, offset 7
}

/**
 * HEAT RATE through logs, IBM's own documented rule A**B = EXP(B*ALOG(A)) — C28-0328-3 p.10,
 * [verified]. There is NO u^3.15 table: linear interpolation on a uniform grid in u has an ABSOLUTE
 * error bound, so its relative error is worst where u^3.15 is smallest — 1.180e-2 at u = 0.0846,
 * which breaks HEAT RATE's 4.5e-5 printed-digit bound by 260x. No number of stored digits fixes
 * that, because the function spans 3.26 decades over this trajectory (plan §5.7).
 *
 * `// OPEN: HEATING_USES_THE_CLOSED_FORM_LOG_OF_V` — [likely], plan §15 row 8. log10 V in this
 * expression is the CLOSED FORM's, log10 V_E - K log10(e) X, not the integrated V's, because the
 * integrated V has no logarithm the machine can take. The two differ by at most 0.07 ft/s, i.e.
 * 3.15 x 3.1e-6 = 9.6e-6 in q_dot — inside HEAT RATE's last printed digit by 4.7 — and the page
 * prints that difference in column 5, so a reader can check the claim with the paper in his hand.
 * Fallback: three Newton iterations on 10^y = V per row (~25,000 us, +1.6 % of the run) to get
 * log10 of the integrated V; cost to flip, one subroutine of ~15 instructions.
 * `// OPEN: U315_GOES_THROUGH_LOGS_NOT_A_TABLE` — a ruling with the bound above, plan §15 row 25.
 */
function fixedHeatRate(h: number, k: FixedConstants): number {
  const argX = -halfAdjust(k.kc2 * h, 7);
  const x = antilogFixed(argX);
  const halfC2h = halfAdjust(k.khc2 * h, 7);                       // product 12: S 13+1 -> 7
  const k315x = halfAdjust(k.k315 * x.mantissa * 10 ** x.decade, 7); // product 13, then the decade
  return halfAdjust(antilogFixed(halfAdjust(k.cq - halfC2h - k315x, 7)).value, 2);
}

/**
 * Layer 3. The same trajectory, quantised at every S the scaling table names, through the same
 * antilog the deck calls. Its worst |V - V A-E| is the number plan §4.5's 0.50 ft/s bound was
 * written down to cover, before the simulator was ever run against it.
 */
export function simulateFixed(c: ReentryCase = DEFAULT_CASE, d: Derived = derive(c)): TrajectoryRun {
  const k = fixedConstants(c, d);
  const rows: TrajectoryRow[] = [];
  let t = 0;
  let h = k.h0;
  // The init block's one extra ANTLOG call: V0 = V_E antilog(-K log10(e) X0), the band-top state.
  let v = fixedVae(k.h0, k);
  let qtot = 0;
  let qdp = 0;
  let refusedAltitude = Number.NaN;

  for (let index = 1; ; index += 1) {
    const qd = fixedHeatRate(h, k);
    if (index > 1) qtot = halfAdjust(qtot + halfAdjust((qd + qdp) * k.dt2, 2), 2); // product 16
    qdp = qd;
    // `ad` at S = 4 for products 14 and 15; the S = 2 stage is the RK4 chain's and is not used here.
    const { ad } = fixedDeriv(v, h, k);
    const vae = fixedVae(h, k);
    rows.push({
      index,
      t: halfAdjust(t, 2),
      h,
      v,
      vAE: vae,
      diff: halfAdjust(v - vae, 2),
      decelG: halfAdjust(ad * k.cg, 1),                      // product 14: S 4+9 -> 1, offset 12
      dynPressure: halfAdjust(ad * k.bb, 1),                 // product 15: S 4+6 -> 1, offset 9
      log10RhoRatio: halfAdjust(k.c1 - halfAdjust(k.kc2 * h, 7), 6),
      heatRate: qd,
      heatLoad: qtot,
      range: halfAdjust((k.h0 - h) * k.crng, 2),             // product 17: S 1+11 -> 2, offset 10
    });

    const s1 = fixedDeriv(v, h, k);
    const s2 = fixedDeriv(halfAdjust(v + halfAdjust(k.dt2 * s1.av, 2), 2),
                          halfAdjust(h + halfAdjust(k.dt2 * s1.ah, 1), 1), k);
    const s3 = fixedDeriv(halfAdjust(v + halfAdjust(k.dt2 * s2.av, 2), 2),
                          halfAdjust(h + halfAdjust(k.dt2 * s2.ah, 1), 1), k);
    const s4 = fixedDeriv(halfAdjust(v + halfAdjust(k.dt * s3.av, 2), 2),
                          halfAdjust(h + halfAdjust(k.dt * s3.ah, 1), 1), k);
    const sumH = s1.ah + 2 * s2.ah + 2 * s3.ah + s4.ah;      // adds at S = 1, exact
    const candidateH = halfAdjust(h + halfAdjust(k.dt6 * sumH, 1), 1); // product 19, offset 9
    if (candidateH <= 0) { refusedAltitude = candidateH; break; }
    const sumV = s1.av + 2 * s2.av + 2 * s3.av + s4.av;      // adds at S = 2, exact
    v = halfAdjust(v + halfAdjust(k.dt6 * sumV, 2), 2);
    h = candidateH;
    t = halfAdjust(t + k.dt, 2);
  }
  return summarise(rows, refusedAltitude);
}

// ---------------------------------------------------------------------------------------------
// §5.2's SCALING TABLE and §5.3's PRODUCTS, transcribed AS DATA.
//
// Transcribed faithfully from the plan and NOT adjusted to make any rule come out: a row of the
// plan that fails its own rule is a finding for the plan, not a bug to paper over here. The rules
// test/reentry-scaling.test.ts applies are §5.2's and §5.3's own: digits >= the range claimed,
// offset === sA + sB - sTarget, digitsInProd === floor(log10(peak * 10^(sA+sB))) + 1, PROD === 17.
//
// Two transcription notes, both shape and neither value: the plan carries `VS, HS`, `K1V...K4V`,
// `XM, XD`, `RHOM, RHOD`, `QD, QDP`, `W1, W2, W3` and `PROD, PROD2, PROD3` as single rows covering
// several fields; they are split here so each entry carries one digit count, one S and one range.
// And where the plan states a range in words (`as V, H`; `constant`; `per use`), `rangeMax` carries
// the largest magnitude the field must hold in its STORED form — biased, for the decades — with the
// plan's own words kept verbatim in `range`.
// ---------------------------------------------------------------------------------------------

export interface ScalingRow {
  readonly symbol: string;
  readonly meaning: string;
  /** Positions in the field. */
  readonly digits: number;
  /** Implied fractional digits, constant for the life of the run. `null` where the plan writes a dash. */
  readonly s: number | null;
  /** The plan's "range carried" column, verbatim. */
  readonly range: string;
  /** The largest magnitude the field must hold, stored form. `null` where the plan states none. */
  readonly rangeMax: number | null;
}

export const SCALING_TABLE: readonly ScalingRow[] = [
  { symbol: 'T', meaning: 'elapsed time, s', digits: 5, s: 2, range: '0 - 999.99', rangeMax: 999.99 },
  { symbol: 'DT', meaning: 'step, s', digits: 4, s: 4, range: '0.0001 - 0.9999', rangeMax: 0.9999 },
  { symbol: 'H', meaning: 'altitude, ft', digits: 8, s: 1, range: '0 - 9,999,999.9', rangeMax: 9999999.9 },
  { symbol: 'V', meaning: 'speed, ft/s', digits: 8, s: 2, range: '0 - 999,999.99', rangeMax: 999999.99 },
  { symbol: 'VK', meaning: 'speed, kft/s — = V, an alias', digits: 8, s: 5, range: '0 - 999.99999', rangeMax: 999.99999 },
  { symbol: 'V0', meaning: 'the band-top velocity V_E e^(-K X0), formed at init and moved into V — the run\'s initial speed, and it is not V_E', digits: 8, s: 2, range: '22,939.54 at this case; 0 - 999,999.99', rangeMax: 999999.99 },
  { symbol: 'VS', meaning: 'RK4 stage argument, speed', digits: 8, s: 2, range: 'as V', rangeMax: 999999.99 },
  { symbol: 'HS', meaning: 'RK4 stage argument, altitude', digits: 8, s: 1, range: 'as H', rangeMax: 9999999.9 },
  { symbol: 'K1V...K4V', meaning: 'dV/dt stages, ft/s^2', digits: 8, s: 2, range: '+/-999,999.99', rangeMax: 999999.99 },
  { symbol: 'K1H...K4H', meaning: 'dh/dt stages, ft/s', digits: 8, s: 1, range: '+/-9,999,999.9', rangeMax: 9999999.9 },
  { symbol: 'ARG', meaning: 'the antilog argument, log10, signed', digits: 8, s: 7, range: '-9.9999999 ... +5.9999999', rangeMax: 9.9999999 },
  { symbol: 'KBIAS', meaning: 'the bias constant, +10.0000000', digits: 9, s: 7, range: 'constant', rangeMax: 10.0 },
  { symbol: 'ARGB', meaning: 'biased antilog argument, ARG + KBIAS', digits: 9, s: 7, range: '0.0000000 - 99.9999999', rangeMax: 99.9999999 },
  { symbol: 'F', meaning: 'its fraction', digits: 7, s: 7, range: '0.0000000 - 0.9999999', rangeMax: 0.9999999 },
  { symbol: 'F1', meaning: 'x100 of F — the index into ANTA', digits: 2, s: 0, range: '00 - 99', rangeMax: 99 },
  { symbol: 'ARGF1', meaning: 'the index-register image 0.0.F1.0 = 10.F1, moved into X1 by MLCWA', digits: 5, s: null, range: '00000 - 00990', rangeMax: 990 },
  { symbol: 'R', meaning: 'residual, F - F1/100', digits: 5, s: 7, range: '0.0000000 - 0.0099999', rangeMax: 0.0099999 },
  { symbol: 'DEC', meaning: 'the decade, biased by 10', digits: 2, s: 0, range: '00 - 99', rangeMax: 99 },
  { symbol: 'MANT', meaning: 'antilog mantissa', digits: 8, s: 7, range: '1.0000000 - 9.9999999', rangeMax: 9.9999999 },
  { symbol: 'XM', meaning: 'X = e^(-beta h) as mantissa', digits: 8, s: 7, range: '[1,10)', rangeMax: 9.9999999 },
  { symbol: 'XD', meaning: 'X = e^(-beta h) as decade', digits: 2, s: 0, range: '-3...0 biased', rangeMax: 10 },
  { symbol: 'RHOM', meaning: 'rho/rho_SL as mantissa', digits: 8, s: 7, range: '[1,10)', rangeMax: 9.9999999 },
  { symbol: 'RHOD', meaning: 'rho/rho_SL as decade', digits: 2, s: 0, range: '-3...0 biased', rangeMax: 10 },
  { symbol: 'AD', meaning: 'drag deceleration, ft/s^2', digits: 8, s: 4, range: '0 - 9,999.9999', rangeMax: 9999.9999 },
  { symbol: 'DG', meaning: 'DECEL, g', digits: 8, s: 1, range: '0 - 9,999,999.9', rangeMax: 9999999.9 },
  { symbol: 'QB', meaning: 'DYN PRESS, lb/ft^2', digits: 8, s: 1, range: '0 - 9,999,999.9', rangeMax: 9999999.9 },
  { symbol: 'L10R', meaning: 'log10(rho/rho_SL)', digits: 8, s: 6, range: '+/-99.999999', rangeMax: 99.999999 },
  { symbol: 'PL10', meaning: 'the print copy of L10R, §7.2 column 9', digits: 4, s: 3, range: '+/-9.999', rangeMax: 9.999 },
  { symbol: 'VAE', meaning: 'eq.13 velocity, ft/s', digits: 8, s: 2, range: '0 - 999,999.99', rangeMax: 999999.99 },
  { symbol: 'DIF', meaning: 'V - V_AE, ft/s', digits: 8, s: 2, range: '+/-999,999.99', rangeMax: 999999.99 },
  { symbol: 'QD', meaning: 'HEAT RATE', digits: 8, s: 2, range: '0 - 999,999.99', rangeMax: 999999.99 },
  { symbol: 'QDP', meaning: 'HEAT RATE, previous value', digits: 8, s: 2, range: '0 - 999,999.99', rangeMax: 999999.99 },
  { symbol: 'QTOT', meaning: 'HEAT LOAD', digits: 8, s: 2, range: '0 - 999,999.99', rangeMax: 999999.99 },
  { symbol: 'RNG', meaning: 'RANGE, n.mi.', digits: 8, s: 2, range: '0 - 999,999.99', rangeMax: 999999.99 },
  { symbol: 'W1', meaning: 'rescale intermediate', digits: 8, s: null, range: 'per use', rangeMax: null },
  { symbol: 'W2', meaning: 'rescale intermediate', digits: 8, s: null, range: 'per use', rangeMax: null },
  { symbol: 'W3', meaning: 'rescale intermediate', digits: 8, s: null, range: 'per use', rangeMax: null },
  { symbol: 'PROD', meaning: 'multiply B-field', digits: PRODUCT_FIELD_POSITIONS, s: null, range: 'multiplicand 8 + multiplier 8 + 1', rangeMax: null },
  { symbol: 'PROD2', meaning: 'multiply B-field', digits: PRODUCT_FIELD_POSITIONS, s: null, range: 'multiplicand 8 + multiplier 8 + 1', rangeMax: null },
  { symbol: 'PROD3', meaning: 'multiply B-field', digits: PRODUCT_FIELD_POSITIONS, s: null, range: 'multiplicand 8 + multiplier 8 + 1', rangeMax: null },
];

export interface ProductRow {
  /** §5.3's own numbering, 1-19. */
  readonly n: number;
  readonly product: string;
  readonly sA: number;
  readonly sB: number;
  readonly sTarget: number;
  /** = sA + sB - sTarget, plan §5.1 rule 2. An assembly-time constant, because every S is one. */
  readonly offset: number;
  /** The plan's qualification of the offset, where it carries one. */
  readonly offsetNote?: string;
  /** Peak magnitude of the product's value, `null` where the plan writes it in words. */
  readonly peak: number | null;
  /** = floor(log10(peak * 10^(sA+sB))) + 1. `null` where the plan writes a dash. */
  readonly digitsInProd: number | null;
}

export const PRODUCTS: readonly ProductRow[] = [
  { n: 1, product: 'KC2 x H -> the antilog argument', sA: 12, sB: 1, sTarget: 7, offset: 6, peak: 2.9611, digitsInProd: 14 },
  { n: 2, product: 'CL2 x R (Horner, 8x5)', sA: 7, sB: 7, sTarget: 7, offset: 7, peak: 0.0265, digitsInProd: 13 },
  { n: 3, product: '(CL1 + .) x R (Horner, 8x5)', sA: 7, sB: 7, sTarget: 7, offset: 7, peak: 0.0233, digitsInProd: 13 },
  // Plan §5.3 row 4 publishes peak 10.0001 / 16 digits. That peak is UNATTAINABLE and the build
  // follows the measurement: swept over all 100 x 100,000 (F1, R) pairs, max ANTA[F1]*CORR is
  // 9.9999776 at F1 = 99, r = 0.0099999 — ANTA[99] fetches 9.7723722 and CORR caps at 1.0232907 —
  // so the digit count is 15. §5.2's own MANT range (1.0000000-9.9999999) already says so; the two
  // plan tables contradicted each other, and no oracle in the phase could see it, because the rule
  // checks digitsInProd against the STATED peak and nothing checked the stated peak against
  // reality. No field-size consequence: 16 is still the widest product (rows 5, 7, 8) and PROD is
  // still 17. Recorded in docs/BUILD-LOG-6.md wave 1 and PHASE-6-NOTES.md §2.
  { n: 4, product: 'ANTA[F1] x CORR -> MANT (CORR is W3)', sA: 7, sB: 7, sTarget: 7, offset: 7, peak: 9.9999776, digitsInProd: 15 },
  { n: 5, product: 'RR0 x XM -> RHOM', sA: 7, sB: 7, sTarget: 7, offset: 7, peak: 14.304, digitsInProd: 16 },
  { n: 6, product: 'VK x VK -> W1', sA: 5, sB: 5, sTarget: 5, offset: 5, peak: 526.20, digitsInProd: 13 },
  { n: 7, product: 'W1 x CDP -> W2', sA: 5, sB: 6, sTarget: 3, offset: 8, peak: 20122, digitsInProd: 16 },
  { n: 8, product: 'W2 x RHOM -> AD', sA: 3, sB: 7, sTarget: 4, offset: 6, offsetNote: '6 - RHOD, indexed', peak: 201220, digitsInProd: 16 },
  { n: 9, product: 'V x SING -> dh/dt (8x1)', sA: 2, sB: 1, sTarget: 1, offset: 2, peak: 11470, digitsInProd: 8 },
  { n: 10, product: "KKL x XM -> eq.13's argument", sA: 7, sB: 7, sTarget: 7, offset: 7, offsetNote: '7, then the decade', peak: 1.0452, digitsInProd: 15 },
  { n: 11, product: 'VE x MANT -> VAE, and V0 at init', sA: 2, sB: 7, sTarget: 2, offset: 7, peak: 22939.54, digitsInProd: 14 },
  { n: 12, product: 'KHC2 x H -> 1/2 C2 h', sA: 13, sB: 1, sTarget: 7, offset: 7, peak: 1.4805, digitsInProd: 15 },
  { n: 13, product: 'K315 x XM -> 3.15 K X', sA: 7, sB: 7, sTarget: 7, offset: 7, offsetNote: '7, then the decade', peak: 3.2923, digitsInProd: 15 },
  { n: 14, product: 'AD x CG -> DG (DECEL)', sA: 4, sB: 9, sTarget: 1, offset: 12, peak: 68.7, digitsInProd: 15 },
  { n: 15, product: 'AD x BB -> QB (DYN PRESS)', sA: 4, sB: 6, sTarget: 1, offset: 9, peak: 68681, digitsInProd: 15 },
  { n: 16, product: '(QD + QDP) x DT2 -> the trapezoid', sA: 2, sB: 4, sTarget: 2, offset: 4, peak: 556.85, digitsInProd: 9 },
  { n: 17, product: '(H0 - H) x CRNG -> RNG', sA: 1, sB: 11, sTarget: 2, offset: 10, peak: 42.76, digitsInProd: 14 },
  { n: 18, product: 'DT2 x k -> a stage argument (x6)', sA: 4, sB: 2, sTarget: 2, offset: 4, offsetNote: 'S_b and S_target are 2 or 1, as V or H', peak: null, digitsInProd: null },
  { n: 19, product: 'DT6 x (k1+2k2+2k3+k4) -> the combination (x2)', sA: 9, sB: 2, sTarget: 2, offset: 9, offsetNote: 'S_b and S_target are 2 or 1, as V or H', peak: null, digitsInProd: null },
];

// ---------------------------------------------------------------------------------------------
// §4.5's PUBLISHED TOLERANCES, as data.
//
// THE RULE, verbatim, and it is not negotiable inside the build: a tolerance published in
// docs/BUILD-LOG-6.md before the golden may not be widened, and the reference may not be edited to
// match the program, without Zarathustrum's authorisation; any such change is its own commit with its own
// reason.
// ---------------------------------------------------------------------------------------------

export const TOLERANCES = {
  /** eq.13 per row, worst |V - V_AE|, ft/s. RK4 truncation goes as dt^4; one order under VELOCITY's
   *  last printed digit, 15x the measurement. */
  eq13PerRowFtPerS: 1.0e-2,
  /** Ei elapsed time, worst |t - t(h)|, s. One hundredth of TIME's last printed digit (0.01 s). */
  eiElapsedTimeSeconds: 1.0e-4,
  /** erf heat load, worst relative. The trapezoid's own method error at dt = 0.25. */
  erfHeatLoadRelative: 1.0e-3,
  /** eq.7 atmosphere, ANTA against Math.pow at 100 entries and 200 interpolated points, relative.
   *  5x the antilog's 2.034e-6 truncation bound. */
  atmosphereRelative: 1.0e-5,
  /** eq.17 peak g, relative. dV/dt is flat at its maximum. */
  peakDecelGRelative: 0.005,
  /** eq.15 y1, ft — ONE INTEGRATION STEP, V sin gamma dt at that row. A grid property, not an error
   *  bound: the peak is located to the nearest printed row, and this is the number that has to
   *  change if dt changes. */
  eq15AltitudeFeet: 1778,
  /** eq.16 V1, ft/s — one integration step, a_D dt. Same reasoning. */
  eq16VelocityFtPerS: 553,
  /**
   * max |DIFF|, ft/s. Derived from S and the step count before the simulator was run against it:
   *   V is carried at S = 2, so each step's combination move half-adjusts once:   <= 0.005 ft/s
   *   92 steps, worst case, no cancellation:                          92 x 0.005 = 0.460 ft/s
   *   antilog chain at 2.034e-6 relative over a total speed change of 20,821 ft/s: 0.042 ft/s
   *                                                                                ---------
   *   worst-case bound                                                              0.502 ft/s
   *   published                                                                     0.50   ft/s
   * DIFF is otherwise exempt from the one-unit-in-the-last-printed-digit rule, because DIFF IS the
   * fixed-point error and layer 2 does not have one.
   */
  maxAbsDiffFtPerS: 0.50,
} as const;
