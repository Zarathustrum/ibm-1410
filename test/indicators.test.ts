// Tier 0 — the seven indicator latches (plan §5 Wave 1, architecture.md §4.6).
// Driven from oracle/indicators.json, which carries opcodes.md §8's set / test / reset rules
// as data. The "which op sets which latch" rows become tests in Waves 3-5 with the executors
// that set them; the RESET rules and the reset STATE are testable now and are what an
// emulator gets wrong.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Indicators } from '../src/core/indicators.js';
import { createMachine } from '../src/core/machine.js';
import type { IndicatorName } from '../src/core/types.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

interface IndicatorsFixture {
  source: string;
  latches: { name: IndicatorName; label: string; setBy: string; testedBy: string; resetBy: string }[];
  rules: {
    computerResetTurnsOff: IndicatorName[];
    computerResetTurnsOn: IndicatorName[];
    equalOnceOffCannotComeBackOn: boolean;
    compareLatchesResetAsAGroupBy: string[];
  };
}
const FIXTURE = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/indicators.json'), 'utf8'),
) as IndicatorsFixture;

/** All seven on, so a reset rule that fails to clear one is visible. */
function allOn(): Indicators {
  const ind = new Indicators();
  ind.setArithOverflow();
  ind.setDivideOverflow();
  ind.setZeroBalance(true);
  ind.compareHigh = true;
  ind.compareEqual = true;
  ind.compareLow = true;
  ind.compareUnequal = true;
  return ind;
}

describe('the seven latches of opcodes.md §8 (A22-0526-3 pp.15, 16, 36, 53)', () => {
  it('the fixture names exactly seven, and snapshot() carries exactly those seven', () => {
    expect(FIXTURE.latches.length).toBe(7);
    const names = FIXTURE.latches.map((l) => l.name).sort();
    expect(Object.keys(new Indicators().snapshot()).sort()).toEqual(names);
  });

  it('snapshot() is a fresh structured-cloneable copy, not a live view', () => {
    const ind = new Indicators();
    const before = ind.snapshot();
    ind.setArithOverflow();
    expect(before.arithOverflow).toBe(false);
    expect(ind.snapshot().arithOverflow).toBe(true);
  });
});

describe('computer reset (A22-0526-3 p.36, via opcodes.md §8)', () => {
  it('turns OFF every latch the fixture lists in computerResetTurnsOff', () => {
    const ind = allOn();
    ind.computerReset();
    for (const name of FIXTURE.rules.computerResetTurnsOff) {
      expect(ind.snapshot()[name], name).toBe(false);
    }
    expect(FIXTURE.rules.computerResetTurnsOff).toEqual(
      ['arithOverflow', 'zeroBalance', 'divideOverflow'],
    );
  });

  // The asymmetry, and the reason IndicatorName has four separate compare members rather than
  // one collapsed 'compare': "computer reset turns off the overflow indicators and the
  // zero-result indicator, and turns ON the low-compare and unequal-compare indicators."
  it('leaves LOW and UNEQUAL ON — the asymmetry — while high and equal go off', () => {
    const ind = allOn();
    ind.computerReset();
    expect(FIXTURE.rules.computerResetTurnsOn).toEqual(['compareLow', 'compareUnequal']);
    for (const name of FIXTURE.rules.computerResetTurnsOn) {
      expect(ind.snapshot()[name], name).toBe(true);
    }
    expect(ind.compareHigh).toBe(false);
    expect(ind.compareEqual).toBe(false);
  });

  it('is where a freshly built machine starts — power-on = program + start + computer reset', () => {
    // research/console-and-physical.md §3 (S223-2648 pp.76-77).
    expect(createMachine({ size: 10_000 }).snapshot().indicators).toEqual({
      arithOverflow: false, zeroBalance: false, divideOverflow: false,
      compareHigh: false, compareEqual: false, compareLow: true, compareUnequal: true,
    });
  });

  it('the machine COMPUTER RESET key drives the latches; PROGRAM RESET does not touch them', () => {
    // A22-0526-3 p.52 lists what program reset clears — check circuits, the A/B data registers,
    // the Op and Op-modifier registers, the console inquiry latch, IAR — and the machine
    // indicators are not in it (research/architecture.md §10 "Resets").
    const m = createMachine({ size: 10_000 });
    m.indicators.setArithOverflow();
    m.indicators.setZeroBalance(true);
    m.programReset();
    expect(m.snapshot().indicators.arithOverflow).toBe(true);
    expect(m.snapshot().indicators.zeroBalance).toBe(true);
    m.computerReset();
    expect(m.snapshot().indicators.arithOverflow).toBe(false);
    expect(m.snapshot().indicators.zeroBalance).toBe(false);
    expect(m.snapshot().indicators.compareLow).toBe(true);
  });
});

describe('the two overflow latches are reset BY THE TEST THAT READS THEM (opcodes.md §8, §2 J row)', () => {
  it('`J (I) Z` (BAV) returns arithmetic overflow and clears it', () => {
    const ind = new Indicators();
    expect(ind.testAndResetArithOverflow()).toBe(false);
    ind.setArithOverflow();
    expect(ind.testAndResetArithOverflow()).toBe(true);
    expect(ind.arithOverflow).toBe(false);
    expect(ind.testAndResetArithOverflow()).toBe(false);
  });

  it('`J (I) W` (BDV) returns divide overflow and clears it', () => {
    const ind = new Indicators();
    ind.setDivideOverflow();
    expect(ind.testAndResetDivideOverflow()).toBe(true);
    expect(ind.divideOverflow).toBe(false);
  });

  it('reading one overflow latch does not disturb the other, or zero balance', () => {
    const ind = new Indicators();
    ind.setArithOverflow();
    ind.setDivideOverflow();
    ind.setZeroBalance(true);
    ind.testAndResetArithOverflow();
    expect(ind.divideOverflow).toBe(true);
    expect(ind.zeroBalance).toBe(true);
  });
});

describe('zero balance (opcodes.md §8; A22-0526-3 p.53 "Zero Balance" light)', () => {
  // "Reset by the next arithmetic op (any except Divide) that does not give a zero balance."
  it('is set and cleared by the result of the next qualifying operation', () => {
    const ind = new Indicators();
    ind.setZeroBalance(true);
    expect(ind.zeroBalance).toBe(true);
    ind.setZeroBalance(false);
    expect(ind.zeroBalance).toBe(false);
  });
});

describe('the four compare latches set and reset AS A GROUP (opcodes.md §8, §5.2)', () => {
  it('the fixture says the group is set and reset by the same three ops — C, T and BCE', () => {
    expect(FIXTURE.rules.compareLatchesResetAsAGroupBy).toEqual(['C', 'T', 'B']);
  });

  it('setCompare puts the group in one of the three states, with unequal = !equal', () => {
    const ind = new Indicators();
    ind.setCompare('high');
    expect(ind.snapshot()).toMatchObject({
      compareHigh: true, compareEqual: false, compareLow: false, compareUnequal: true,
    });
    ind.setCompare('equal');
    expect(ind.snapshot()).toMatchObject({
      compareHigh: false, compareEqual: true, compareLow: false, compareUnequal: false,
    });
    ind.setCompare('low');
    expect(ind.snapshot()).toMatchObject({
      compareHigh: false, compareEqual: false, compareLow: true, compareUnequal: true,
    });
  });

  it('beginCompare resets the whole group and starts equal ON', () => {
    const ind = allOn();
    ind.beginCompare();
    expect(ind.snapshot()).toMatchObject({
      compareHigh: false, compareEqual: true, compareLow: false, compareUnequal: false,
    });
  });

  // opcodes.md §5.2 / 223-2588-2 p.24 — the rule the fixture flags
  // `equalOnceOffCannotComeBackOn`. Compare scans right to left, so a later (higher-order)
  // equal position must NOT restore equal, and the leftmost difference decides high vs low.
  it('once equal is off during an operation it cannot be turned back on', () => {
    expect(FIXTURE.rules.equalOnceOffCannotComeBackOn).toBe(true);
    const ind = new Indicators();
    ind.beginCompare();
    ind.compareDigit('low');
    ind.compareDigit('equal');
    ind.compareDigit('equal');
    ind.endCompare();
    expect(ind.compareEqual).toBe(false);
    expect(ind.compareLow).toBe(true);
    expect(ind.compareUnequal).toBe(true);
  });

  it('the LAST unequal position compared wins — right-to-left, so the leftmost difference', () => {
    const ind = new Indicators();
    ind.beginCompare();
    ind.compareDigit('low');
    ind.compareDigit('high');
    ind.endCompare();
    expect(ind.compareHigh).toBe(true);
    expect(ind.compareLow).toBe(false);
  });

  it('an all-equal operation leaves equal ON and unequal OFF', () => {
    const ind = allOn();
    ind.beginCompare();
    ind.compareDigit('equal');
    ind.endCompare();
    expect(ind.compareEqual).toBe(true);
    expect(ind.compareUnequal).toBe(false);
    expect(ind.compareHigh).toBe(false);
    expect(ind.compareLow).toBe(false);
  });
});
