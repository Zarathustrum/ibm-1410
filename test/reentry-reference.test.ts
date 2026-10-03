// Tier 0 — the reference layers judged against each other at the tolerances §4.5 publishes.
// Plan docs/plans/phase-6-reentry.md §4.5 (the published tolerance table), §4.6 (the four
// checkpoints, the two guards and the eq.17 invariance regression), §11 wave 1 oracles (a) and (c),
// §12.1 T0. The data is `test/fixtures/reentry-reference.ts`, written by a different worker of the
// same wave: this file checks that fixture, it does not own it.
//
// PRIMARY SOURCES, by form number and page, through docs/research/avco-and-reentry.md §4 and §8:
//  · NACA Report 1381, Allen & Eggers (1958) — eq.7 (the exponential atmosphere), eq.13 (V(h)),
//    eq.15 (y1), eq.16 (V1), eq.17 (peak deceleration), and NACA's own warning that 16-17 apply
//    only when y1 > 0 (avco-and-reentry.md:152, :368, [verified]) — which is guard A below.
//  · Detra, Kemp & Riddell, Jet Propulsion 27(12) (1957) pp.1256-1257 — stagnation heating, whose
//    OWN accuracy is +/-10-20 %; nothing downstream of the erf check is more accurate than that.
//  · Abramowitz & Stegun (1964) 5.1.10/5.1.11 (Ei) and 7.1.6 (erf) — the two quadratures the
//    fixture derives in its header, which are what turn TIME and HEAT LOAD into checked columns.
//
// EVERY BOUND ASSERTED HERE IS THE PUBLISHED ONE, NEVER THE MEASURED ONE. The measured value goes
// in the message so a reader sees the margin without the test being fitted to it. §4.5's rule is
// verbatim and is not negotiable inside the build: *a tolerance published in docs/BUILD-LOG-6.md
// before the golden may not be widened, and the reference may not be edited to match the program,
// without Zarathustrum's authorisation.* A failure here is a finding, not a number to move.
//
// WHAT THIS FILE DOES NOT CHECK: the emulated machine. Layers 1, 2 and 3 are all reference; the
// gate is layer 4 against layers 1-2 and it is wave 3's and wave 4's (§4.4, §11).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  closedFormCheckpointsApply, constantDisagreements, DEFAULT_CASE, derive, elapsedTime,
  eq13Velocity, eq15PeakDecelAltitude, eq16PeakDecelVelocity, eq17PeakDecelG, heatLoad, integrate,
  simulateFixed, TOLERANCES, type ReentryCase, type TrajectoryRow, type TrajectoryRun,
} from './fixtures/reentry-reference.js';

/** §4.6 guard A's test case: W/(C_D A) = 5,000 lb/ft^2, where K = 0.4813 and y1 = -838 ft. */
const HEAVY_CASE: ReentryCase = { ...DEFAULT_CASE, wOverCdA: 5000 };
/** §4.6's invariance regression: the same card with W/(C_D A) doubled to 2,000 lb/ft^2. */
const DOUBLED_CASE: ReentryCase = { ...DEFAULT_CASE, wOverCdA: 2000 };

/** §4.6 checkpoint 4's published figure, the g the printed maximum is judged against. */
const PUBLISHED_PEAK_G = 68.7343;

const RUN: TrajectoryRun = integrate();
const FIXED: TrajectoryRun = simulateFixed();

interface Worst { readonly value: number; readonly row: TrajectoryRow }

/** The largest `measure` over the run, carrying the row it fell on so a message can name t. */
function worst(rows: readonly TrajectoryRow[], measure: (row: TrajectoryRow) => number): Worst {
  const first = rows[0];
  if (first === undefined) throw new Error('a trajectory with no rows');
  let out: Worst = { value: measure(first), row: first };
  for (const row of rows) {
    const value = measure(row);
    if (value > out.value) out = { value, row };
  }
  return out;
}

/** `noUncheckedIndexedAccess` is on: name the last row rather than index into the array. */
function lastRow(run: TrajectoryRun): TrajectoryRow {
  const row = run.rows[run.rows.length - 1];
  if (row === undefined) throw new Error('a trajectory with no rows');
  return row;
}

// §12.3 says this rule "is asserted", and until this case nothing asserted it. The fixture is the
// counterpart the emulated machine is gated against (§4.4 layer 2), so a reference that imported
// the emulator's own arithmetic would be gating the machine against itself — the one failure mode
// four reference layers exist to prevent. It matters more later than now: waves 2-5 READ the
// fixture and §11.2 lets layer 3 be corrected freely, so a future worker "fixing" layer 3 by
// reaching for src/core/alu.ts is the plausible way this rots. A read of the tree, the way
// test/period-is-dom-free.test.ts asserts its import direction — not a runtime check.
describe('Wave 1 — the fixture imports nothing from src/, and that is a rule of the file (§12.3)', () => {
  it('has no import, require or dynamic import naming src/', () => {
    const text = readFileSync('test/fixtures/reentry-reference.ts', 'utf8');
    const offenders = text.split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /(?:^|\s)(?:import|export)\b[^\n]*\bfrom\s*['"][^'"]*src\//.test(line)
        || /\brequire\s*\(\s*['"][^'"]*src\//.test(line)
        || /\bimport\s*\(\s*['"][^'"]*src\//.test(line));
    expect(offenders.map((o) => `${o.n}: ${o.line.trim()}`),
      'the reference may not import the emulator it is the counterpart to').toEqual([]);
  });

  it('in fact imports nothing at all, which is the strongest form of the rule', () => {
    const text = readFileSync('test/fixtures/reentry-reference.ts', 'utf8');
    const imports = text.split('\n').filter((l) => /^\s*import\b/.test(l));
    expect(imports, `${imports.length} import statements; the fixture is self-contained`).toEqual([]);
  });
});

describe('Wave 1 — layer 1 against layer 2 at §4.5\'s published tolerances (oracle (a))', () => {
  it('carries §4.5\'s published tolerances as its own literals, so none of them can be widened here', () => {
    expect(TOLERANCES).toEqual({
      eq13PerRowFtPerS: 1.0e-2,
      eiElapsedTimeSeconds: 1.0e-4,
      erfHeatLoadRelative: 1.0e-3,
      atmosphereRelative: 1.0e-5,
      peakDecelGRelative: 0.005,
      eq15AltitudeFeet: 1778,
      eq16VelocityFtPerS: 553,
      maxAbsDiffFtPerS: 0.50,
    });
  });

  it('runs 92 rows to t = 22.75 s and h = 198.774 ft, and guard B refuses the 93rd at h = -62.2 ft', () => {
    const last = lastRow(RUN);
    expect(RUN.rows.length, `${RUN.rows.length} rows against §4.6's 92`).toBe(92);
    expect(last.t, `last row t = ${last.t} s against §4.6's 22.75`).toBe(22.75);
    expect(last.h, `last row h = ${last.h.toFixed(3)} ft against §4.6's 198.774`).toBeCloseTo(198.774, 3);
    expect(RUN.refusedAltitude, `the refused 93rd candidate is h = ${RUN.refusedAltitude.toFixed(1)} ft, which must be at or below zero`)
      .toBeLessThanOrEqual(0);
    expect(RUN.refusedAltitude, `the refused candidate ${RUN.refusedAltitude.toFixed(1)} ft against §4.6's -62.2`)
      .toBeCloseTo(-62.2, 1);
  });

  it('eq.13 per row: worst |V - V_AE| within the published 1.0e-2 ft/s', () => {
    const w = worst(RUN.rows, (row) => Math.abs(row.v - eq13Velocity(row.h)));
    expect(w.value, `eq.13 worst |V - V_AE| ${w.value.toExponential(4)} ft/s at t = ${w.row.t} s, against the published ${TOLERANCES.eq13PerRowFtPerS} ft/s`)
      .toBeLessThanOrEqual(TOLERANCES.eq13PerRowFtPerS);
  });

  it('Ei elapsed time: worst |t - t(h)| within the published 1.0e-4 s', () => {
    const w = worst(RUN.rows, (row) => Math.abs(row.t - elapsedTime(row.h)));
    expect(w.value, `Ei worst |t - t(h)| ${w.value.toExponential(4)} s at t = ${w.row.t} s, against the published ${TOLERANCES.eiElapsedTimeSeconds} s`)
      .toBeLessThanOrEqual(TOLERANCES.eiElapsedTimeSeconds);
  });

  it('erf heat load: worst relative deviation over the rows with Q > 1, within the published 1.0e-3', () => {
    const scored = RUN.rows.filter((row) => row.heatLoad > 1);
    // The precondition, not decoration: a filter that selected nothing would pass the comparison
    // below vacuously, which is exactly the defect §4.7's M5 exists to catch.
    expect(scored.length, `${scored.length} rows carry Q > 1; the relative check needs some`).toBe(91);
    const w = worst(scored, (row) => Math.abs(row.heatLoad - heatLoad(row.h)) / Math.abs(heatLoad(row.h)));
    expect(w.value, `erf worst relative ${w.value.toExponential(4)} at t = ${w.row.t} s over ${scored.length} rows with Q > 1, against the published ${TOLERANCES.erfHeatLoadRelative}`)
      .toBeLessThanOrEqual(TOLERANCES.erfHeatLoadRelative);
  });

  it('eq.17 peak g: the integrated maximum within the published 0.5 % of 68.7343 g', () => {
    const measured = RUN.peakDecelRow.decelG;
    const relative = Math.abs(measured - PUBLISHED_PEAK_G) / PUBLISHED_PEAK_G;
    expect(eq17PeakDecelG(), `eq.17 itself is ${eq17PeakDecelG().toFixed(4)} g against §4.6's published ${PUBLISHED_PEAK_G}`)
      .toBeCloseTo(PUBLISHED_PEAK_G, 4);
    expect(relative, `peak DECEL ${measured.toFixed(4)} g at t = ${RUN.peakDecelRow.t} s is ${(relative * 100).toFixed(4)} % off eq.17's ${PUBLISHED_PEAK_G}, against the published ${(TOLERANCES.peakDecelGRelative * 100).toFixed(1)} %`)
      .toBeLessThanOrEqual(TOLERANCES.peakDecelGRelative);
  });

  it('eq.15 y1: the peak row\'s altitude within one integration step, the published 1,778 ft', () => {
    const y1 = eq15PeakDecelAltitude();
    const delta = Math.abs(RUN.peakDecelRow.h - y1);
    expect(delta, `peak row h = ${RUN.peakDecelRow.h.toFixed(1)} ft against eq.15's ${y1.toFixed(1)} ft is a gap of ${delta.toFixed(1)} ft, against the published one integration step = ${TOLERANCES.eq15AltitudeFeet} ft`)
      .toBeLessThanOrEqual(TOLERANCES.eq15AltitudeFeet);
  });

  it('eq.16 V1: the peak row\'s velocity within one integration step, the published 553 ft/s', () => {
    const v1 = eq16PeakDecelVelocity();
    const delta = Math.abs(RUN.peakDecelRow.v - v1);
    expect(delta, `peak row V = ${RUN.peakDecelRow.v.toFixed(1)} ft/s against eq.16's ${v1.toFixed(1)} ft/s is a gap of ${delta.toFixed(1)} ft/s, against the published one integration step = ${TOLERANCES.eq16VelocityFtPerS} ft/s`)
      .toBeLessThanOrEqual(TOLERANCES.eq16VelocityFtPerS);
  });

  it('recomputes every §4.2 constant from its own definition and agrees with the published literal', () => {
    const disagreements = constantDisagreements();
    expect(disagreements, `§4.2's constants disagree with their own definitions:\n${disagreements.join('\n')}`)
      .toEqual([]);
  });
});

describe('Wave 1 — layer 3 against eq.13 at the published 0.50 ft/s (oracle (c))', () => {
  it('quantises the same 92 rows the double-precision run does', () => {
    const last = lastRow(FIXED);
    expect(FIXED.rows.length, `layer 3 runs ${FIXED.rows.length} rows against layer 2's ${RUN.rows.length}`)
      .toBe(RUN.rows.length);
    expect(last.t, `layer 3's last row is t = ${last.t} s against §4.6's 22.75`).toBe(22.75);
    expect(FIXED.refusedAltitude, `layer 3's refused candidate is h = ${FIXED.refusedAltitude.toFixed(1)} ft, which must be at or below zero`)
      .toBeLessThanOrEqual(0);
  });

  it('worst |V - V A-E| within the published 0.50 ft/s, the bound §4.5 derives from S and the step count', () => {
    const w = worst(FIXED.rows, (row) => Math.abs(row.diff));
    expect(w.value, `layer 3 worst |V - V A-E| ${w.value.toFixed(4)} ft/s at t = ${w.row.t} s, against the published ${TOLERANCES.maxAbsDiffFtPerS.toFixed(2)} ft/s`)
      .toBeLessThanOrEqual(TOLERANCES.maxAbsDiffFtPerS);
    expect(FIXED.maxAbsDiff, `the run's own max |DIFF| ${FIXED.maxAbsDiff.toFixed(4)} ft/s must equal the row sweep's ${w.value.toFixed(4)}`)
      .toBe(w.value);
  });
});

describe('Wave 1 — §4.6\'s two guards and the eq.17 invariance regression', () => {
  it('guard A refuses the closed-form checkpoints at W/(C_D A) = 5,000 lb/ft^2, where y1 = -838 ft', () => {
    const heavy = derive(HEAVY_CASE);
    const y1 = eq15PeakDecelAltitude(HEAVY_CASE);
    expect(heavy.k, `K = ${heavy.k.toFixed(4)} at W/(C_D A) = 5,000 against §4.6's 0.4813`).toBeCloseTo(0.4813, 4);
    expect(2 * heavy.k, `2K = ${(2 * heavy.k).toFixed(4)} must be at or below 1 for eqs.16-17 to be refused`)
      .toBeLessThanOrEqual(1);
    expect(y1, `y1 = ${y1.toFixed(1)} ft at W/(C_D A) = 5,000 against §4.6's -838 ft`).toBeCloseTo(-838, 0);
    expect(closedFormCheckpointsApply(HEAVY_CASE), `y1 = ${y1.toFixed(1)} ft is not positive, so NACA 1381's own warning refuses eqs.16-17`)
      .toBe(false);
  });

  it('guard A passes the default case, so the refusal above is a guard and not a constant false', () => {
    const y1 = eq15PeakDecelAltitude();
    expect(closedFormCheckpointsApply(), `y1 = ${y1.toFixed(1)} ft at the default card is positive, so the checkpoints apply`)
      .toBe(true);
  });

  it('eq.17 is invariant when W/(C_D A) doubles to 2,000 lb/ft^2 — 66 rows, the same peak g', () => {
    const doubled = derive(DOUBLED_CASE);
    const run = integrate(DOUBLED_CASE);
    const y1 = eq15PeakDecelAltitude(DOUBLED_CASE);
    const measured = run.peakDecelRow.decelG;
    const relative = Math.abs(measured - PUBLISHED_PEAK_G) / PUBLISHED_PEAK_G;
    expect(doubled.betaB, `beta_B = ${doubled.betaB.toFixed(3)} against §4.6's 62.162`).toBeCloseTo(62.162, 3);
    expect(doubled.k, `K = ${doubled.k.toFixed(4)} against §4.6's 1.2033`).toBeCloseTo(1.2033, 4);
    expect(y1, `y1 = ${y1.toFixed(0)} ft against §4.6's 19,321`).toBeCloseTo(19321, 0);
    expect(run.rows.length, `the doubled case runs ${run.rows.length} rows against §4.6's 66`).toBe(66);
    // eq.17 carries no mass, size or C_D, so this is an identity and not a tolerance.
    expect(eq17PeakDecelG(DOUBLED_CASE), `eq.17 at the doubled card is ${eq17PeakDecelG(DOUBLED_CASE).toFixed(4)} g against ${eq17PeakDecelG().toFixed(4)} at the default card`)
      .toBe(eq17PeakDecelG());
    expect(relative, `the doubled case's peak DECEL ${measured.toFixed(4)} g is ${(relative * 100).toFixed(4)} % off eq.17's ${PUBLISHED_PEAK_G}, against the published ${(TOLERANCES.peakDecelGRelative * 100).toFixed(1)} %`)
      .toBeLessThanOrEqual(TOLERANCES.peakDecelGRelative);
  });
});
