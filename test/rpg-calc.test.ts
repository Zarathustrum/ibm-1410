// Tier 2 — Wave-5 Data/Calculation emitters. Shape checks are paired with assembled-machine
// checks below so the generator is not accepted merely for spelling the intended mnemonics.

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { applyToStorage } from '../src/asm/emit.js';
import { digitOf, signOf } from '../src/core/alu.js';
import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { BCD6, ZA, ZB } from '../src/core/types.js';
import { toCard } from '../src/rpg/card.js';
import {
  CALC_EMITTERS,
  calcStorageOf,
  dataExtractionStmts,
  detailCalculationStmts,
  HALF_ADJUST_IS_ADD_FIVE_AT_THE_NAMED_POSITION,
  totalCalculationStmts,
} from '../src/rpg/calc.js';
import { driver, type CycleSection } from '../src/rpg/cycle.js';
import { indicatorLabel } from '../src/rpg/indicators.js';
import { layoutOf, measure } from '../src/rpg/layout.js';
import type { CalcStep, FieldSource, Model, Stmt } from '../src/rpg/types.js';
import {
  SALES_SUMMARY_MODEL,
  SALES_SUMMARY_STATEMENTS,
} from './fixtures/sales-summary.model.js';

function decided(stmt: Stmt) {
  return { kind: stmt.kind, label: stmt.label, indent: stmt.indent, op: stmt.op, operands: stmt.operands };
}

function targetRange(first: string, after: string): readonly Stmt[] {
  const start = SALES_SUMMARY_STATEMENTS.findIndex((stmt) => stmt.label === first);
  const end = SALES_SUMMARY_STATEMENTS.findIndex((stmt) => stmt.label === after);
  if (start < 0 || end < 0 || start >= end) throw new Error(`bad target range ${first}..${after}`);
  return SALES_SUMMARY_STATEMENTS.slice(start, end)
    .filter((stmt) => (stmt.kind ?? 'statement') !== 'comment');
}

function labels() {
  const values = new Map<string, string>();
  return {
    label(key: string): string {
      const present = values.get(key);
      if (present !== undefined) return present;
      const value = `Z${String(values.size + 1).padStart(3, '0')}`;
      values.set(key, value);
      return value;
    },
  };
}

function source(overrides: Partial<FieldSource>): FieldSource {
  return {
    kind: 'record', recordType: 'CAA', end: 8, sourceLength: 3, numeric: false,
    operation: 'move', conditions: [], ...overrides,
  };
}

function modelWith(fields: Model['fields'], calcs: readonly CalcStep[] = []): Model {
  return {
    ...SALES_SUMMARY_MODEL,
    controlFields: [], fields, calcs, lines: [], indicators: ['01', '10', '11', '12', '13'],
  };
}

type Zone = 'none' | 'A' | 'B' | 'BA';
const ZONE_BITS: Readonly<Record<Zone, number>> = { none: 0, A: ZA, B: ZB, BA: ZA | ZB };
const NUMERIC = 0x0f;
const ZONES = ZA | ZB;

interface CalcHarness {
  readonly machine: Machine;
  run(): void;
  glyphs(name: string, length: number): string;
  numeric(name: string, length: number): string;
  setGlyphs(name: string, text: string): void;
  setNumeric(name: string, digits: string, zone?: Zone): void;
  indicator(name: string): string;
}

function cardSource(stmts: readonly Stmt[]): string {
  return stmts.map((stmt, index) => (
    toCard(stmt, String((index + 1) * 10).padStart(5, '0'), '')
  )).join('\n');
}

function calcHarness(model: Model, section: 'extract' | 'detailCalc'): CalcHarness {
  const storage = calcStorageOf(model);
  const first = driver(model, layoutOf(model, 0, storage), CALC_EMITTERS);
  const exit = section === 'extract' ? 'CTLBRK' : 'HDGOUT';
  const stubs = [{ label: exit, op: 'H', operands: [] }, { op: 'NOP', operands: [] }] satisfies readonly Stmt[];
  const firstBody = [
    ...(first.get('constants') ?? []), ...(first.get(section) ?? []), ...stubs,
  ];
  const layout = layoutOf(model, measure(firstBody), storage);
  const sections = driver(model, layout, CALC_EMITTERS);
  const source = cardSource([
    { label: 'AUTOCODER', op: 'RUN', operands: [] },
    { op: 'CTL', operands: ['1'] },
    { op: 'LOAD', operands: [] },
    { op: 'ORG', operands: ['00500'] },
    ...(sections.get('constants') ?? []),
    ...(sections.get(section) ?? []),
    ...stubs,
    ...(sections.get('areas') ?? []),
    { op: 'END', operands: [section === 'extract' ? 'EXTRCT' : 'DTLCAL'] },
  ]);
  const assembled = assemble(source);
  expect(assembled.ok).toBe(true);
  expect(assembled.flagged).toEqual([]);
  expect(assembled.warnings).toEqual([]);
  const machine = createMachine({ size: 10_000 });
  applyToStorage(assembled.items, machine.storage);

  const address = (name: string): number => {
    const value = assembled.symbols.get(name)?.value;
    if (value === undefined) throw new Error(`calculation harness has no ${name}`);
    return value;
  };
  const setGlyphs = (name: string, text: string): void => {
    const units = address(name);
    for (const [index, glyph] of [...text].entries()) {
      const at = units - text.length + index + 1;
      machine.storage.setChar(at, bcdOfGlyph(glyph) ?? 0, machine.storage.wm(at));
    }
  };
  const glyphs = (name: string, length: number): string => {
    const units = address(name);
    let result = '';
    for (let offset = length - 1; offset >= 0; offset--) {
      result += glyphOf(machine.storage.read(units - offset) & BCD6);
    }
    return result;
  };
  const setNumeric = (name: string, digits: string, zone: Zone = 'none'): void => {
    const units = address(name);
    for (const [index, glyph] of [...digits].entries()) {
      const at = units - digits.length + index + 1;
      const code = bcdOfGlyph(glyph) ?? 0;
      const value = index + 1 === digits.length
        ? ZONE_BITS[zone] | (code & NUMERIC)
        : code;
      machine.storage.setChar(at, value, machine.storage.wm(at));
    }
  };
  const numeric = (name: string, length: number): string => {
    const units = address(name);
    let digits = '';
    for (let offset = length - 1; offset >= 0; offset--) {
      digits += String(digitOf(machine.storage.read(units - offset)));
    }
    return digits + signOf(machine.storage.read(units));
  };
  return {
    machine, glyphs, numeric, setGlyphs, setNumeric,
    run(): void {
      machine.computerReset();
      machine.addressSet(address(section === 'extract' ? 'EXTRCT' : 'DTLCAL'));
      const stop = machine.run(2_000);
      expect(stop).toBe('halt');
      expect(machine.regs.iar).toBe(address(exit) + 1);
    },
    indicator(name: string): string {
      return glyphOf(machine.storage.read(address(indicatorLabel(name))) & BCD6);
    },
  };
}

const targetLayout = layoutOf(SALES_SUMMARY_MODEL, 2032);

describe('Wave 5 — RPG calculation emitters', () => {
  it('carries the frozen half-adjust ruling at the point that emits it', () => {
    expect(HALF_ADJUST_IS_ADD_FIVE_AT_THE_NAMED_POSITION).toBe(true);
  });

  it('replaces Wave-3 extraction and normalizes both numeric N sources with ZA', () => {
    const got = dataExtractionStmts(SALES_SUMMARY_MODEL, targetLayout, labels()).map(decided);
    const expected = targetRange('EXTRCT', 'CTLBRK').map(decided);

    expect(got).toEqual(expected.map((stmt) => (
      stmt.op === 'MLC' && (stmt.operands[1] === 'QTY' || stmt.operands[1] === 'AMT')
        ? { ...stmt, op: 'ZA' }
        : stmt
    )));
  });

  it('keeps the demo total/detail arithmetic exact, including multiply placement and half adjust', () => {
    const sections = driver(SALES_SUMMARY_MODEL, targetLayout, CALC_EMITTERS);
    expect(sections.get('totalCalc')?.map(decided))
      .toEqual(targetRange('TOTCAL', 'TOTOUT').map(decided));
    expect(sections.get('detailCalc')?.map(decided))
      .toEqual(targetRange('DTLCAL', 'HDGOUT').map(decided));
  });

  it('uses single-position MLNS/MLZS and a marked stage for short record sources', () => {
    const at = SALES_SUMMARY_MODEL.fields[0]!.at;
    const model = modelWith([{
      name: 'VALUE', length: 5,
      sources: [
        source({ operation: 'move' }),
        source({ operation: 'digit', end: 9 }),
        source({ operation: 'zone', end: 10 }),
      ],
      statuses: [], at,
    }]);
    const allocator = labels();
    for (const request of calcStorageOf(model)) allocator.label(request.key);
    const stmts = dataExtractionStmts(model, layoutOf(model, 0, calcStorageOf(model)), allocator);

    expect(stmts.map((stmt) => stmt.op)).toEqual(['MLCS', 'MLCS', 'MLCS', 'MLC', 'MLNS', 'MLZS']);
    expect(stmts.slice(0, 3).map((stmt) => stmt.operands[0])).toEqual(['C008', 'C008-1', 'C008-2']);
    expect(stmts[3]).toMatchObject({ op: 'MLC', operands: ['Z001', 'VALUE'] });
    expect(stmts[4]).toMatchObject({ op: 'MLNS', operands: ['C009', 'VALUE'] });
    expect(stmts[5]).toMatchObject({ op: 'MLZS', operands: ['C010', 'VALUE'] });
  });

  it('maps two-factor plus/minus through every col-39 accumulate without reset-subtract drift', () => {
    const at = SALES_SUMMARY_MODEL.calcs[0]!.at;
    const cases = [
      ['+', 'A', ['A', 'A']], ['+', 'S', ['S', 'S']],
      ['+', 'resetAdd', ['ZA', 'A']], ['+', 'resetSubtract', ['ZS', 'S']],
      ['-', 'A', ['A', 'S']], ['-', 'S', ['S', 'A']],
      ['-', 'resetAdd', ['ZA', 'S']], ['-', 'resetSubtract', ['ZS', 'A']],
    ] as const;
    for (const [op, accumulate, expected] of cases) {
      const step: CalcStep = {
        result: 'RESULT', length: 6, factor1: { text: 'LEFT', length: 4 }, op,
        factor2: { text: 'RIGHT', length: 3 }, accumulate, conditions: [], time: 'detail',
        statuses: [], at,
      };
      const model = modelWith([
        { name: 'LEFT', length: 4, sources: [], statuses: [], at },
        { name: 'RIGHT', length: 3, sources: [], statuses: [], at },
      ], [step]);
      const got = detailCalculationStmts(model, layoutOf(model, 0), labels())
        .filter((stmt) => stmt.op !== 'NOP').map((stmt) => stmt.op);
      expect(got, `${op}/${accumulate}`).toEqual(expected);
    }
  });

  it('plans exact work fields for non-direct multiply, divide, and value-status tests', () => {
    const at = SALES_SUMMARY_MODEL.calcs[0]!.at;
    const model = modelWith([
      { name: 'LEFT', length: 5, sources: [], statuses: [{ status: 'B', condition: '10' }], at },
      { name: 'RIGHT', length: 2, sources: [], statuses: [{ status: 'N', condition: '11' }], at },
    ], [
      { result: 'PROD', length: 8, factor1: { text: 'LEFT', length: 5 }, op: 'X',
        factor2: { text: 'RIGHT', length: 2 }, accumulate: 'A', conditions: [], time: 'detail',
        statuses: [{ status: 'P', condition: '12' }], at },
      { result: 'QUOT', length: 6, factor1: { text: 'LEFT', length: 5 }, op: '/',
        factor2: { text: 'RIGHT', length: 2 }, accumulate: 'resetAdd', conditions: [], time: 'detail',
        statuses: [{ status: 'Z', condition: '13' }], at },
    ]);

    expect(calcStorageOf(model).map(({ key, length, fill }) => ({ key, length, fill }))).toEqual([
      { key: 'calc:status:blank:5', length: 5, fill: 'blank' },
      { key: 'calc:status:numeric:2', length: 2, fill: 'zero' },
      { key: 'calc:work:0', length: 8, fill: 'zero' },
      { key: 'calc:status:numeric:8', length: 8, fill: 'zero' },
      { key: 'calc:work:1', length: 8, fill: 'zero' },
      { key: 'calc:status:numeric:6', length: 6, fill: 'zero' },
    ]);
  });

  it('composes its three callbacks without changing the other cycle sections', () => {
    expect(CALC_EMITTERS).toEqual({
      generatedStorage: calcStorageOf,
      extract: dataExtractionStmts,
      totalCalc: totalCalculationStmts,
      detailCalc: detailCalculationStmts,
    });
    const storage = calcStorageOf(SALES_SUMMARY_MODEL);
    const sections = driver(SALES_SUMMARY_MODEL, layoutOf(SALES_SUMMARY_MODEL, 0, storage), CALC_EMITTERS);
    const names = [...sections.keys()] as CycleSection[];
    expect(names).toHaveLength(17);
    expect(measure(sections.get('detailCalc') ?? [])).toBeGreaterThan(0);
  });

  it('executes N normalization, short right-justification and D/Y single-position moves', () => {
    const at = SALES_SUMMARY_MODEL.fields[0]!.at;

    const normalized = modelWith([{
      name: 'VALUE', length: 3,
      sources: [source({ end: 3, sourceLength: 3, numeric: true })], statuses: [], at,
    }]);
    const n = calcHarness(normalized, 'extract');
    n.setGlyphs('C003', 'ABC');
    n.run();
    expect(n.numeric('VALUE', 3)).toBe('123+');
    expect([...n.glyphs('VALUE', 3).slice(0, 2)].every((glyph) => (
      ((bcdOfGlyph(glyph) ?? 0) & ZONES) === 0
    ))).toBe(true);

    const short = modelWith([{
      name: 'VALUE', length: 5,
      sources: [source({ end: 3, sourceLength: 3 })], statuses: [], at,
    }]);
    const s = calcHarness(short, 'extract');
    s.setGlyphs('C003', 'ABC');
    s.run();
    expect(s.glyphs('VALUE', 5)).toBe('  ABC');

    for (const [operation, sourceGlyph, initial, expected] of [
      ['digit', 'R', 'A', 'I'],
      ['zone', 'R', '1', 'J'],
    ] as const) {
      const one = modelWith([{
        name: 'VALUE', length: 1,
        sources: [source({ operation, end: 1, sourceLength: 1 })], statuses: [], at,
      }]);
      const h = calcHarness(one, 'extract');
      h.setGlyphs('C001', sourceGlyph);
      h.setGlyphs('VALUE', initial);
      h.run();
      expect(h.glyphs('VALUE', 1), operation).toBe(expected);
    }
  });

  it('executes reset-subtract, non-direct multiply and divide through real arithmetic', () => {
    const at = SALES_SUMMARY_MODEL.calcs[0]!.at;

    const subtract = modelWith([
      { name: 'LEFT', length: 4, sources: [], statuses: [], at },
      { name: 'RIGHT', length: 3, sources: [], statuses: [], at },
    ], [{
      result: 'RESULT', length: 6, factor1: { text: 'LEFT', length: 4 }, op: '+',
      factor2: { text: 'RIGHT', length: 3 }, accumulate: 'resetSubtract', conditions: [],
      time: 'detail', statuses: [], at,
    }]);
    const sub = calcHarness(subtract, 'detailCalc');
    sub.setNumeric('LEFT', '0012');
    sub.setNumeric('RIGHT', '003');
    sub.run();
    expect(sub.numeric('RESULT', 6)).toBe('000015-');

    const multiply = modelWith([
      { name: 'LEFT', length: 3, sources: [], statuses: [], at },
      { name: 'RIGHT', length: 2, sources: [], statuses: [], at },
    ], [{
      result: 'RESULT', length: 8, factor1: { text: 'LEFT', length: 3 }, op: 'X',
      factor2: { text: 'RIGHT', length: 2 }, accumulate: 'A', conditions: [],
      time: 'detail', statuses: [], at,
    }]);
    const mul = calcHarness(multiply, 'detailCalc');
    mul.setNumeric('LEFT', '123');
    mul.setNumeric('RIGHT', '04');
    mul.setNumeric('RESULT', '00000010');
    mul.run();
    expect(mul.numeric('RESULT', 8)).toBe('00000502+');

    const divide = modelWith([
      { name: 'LEFT', length: 3, sources: [], statuses: [], at },
      { name: 'RIGHT', length: 1, sources: [], statuses: [], at },
    ], [{
      result: 'RESULT', length: 4, factor1: { text: 'LEFT', length: 3 }, op: '/',
      factor2: { text: 'RIGHT', length: 1 }, accumulate: 'resetAdd', conditions: [],
      time: 'detail', statuses: [], at,
    }]);
    const div = calcHarness(divide, 'detailCalc');
    div.setNumeric('LEFT', '100');
    div.setNumeric('RIGHT', '4');
    div.run();
    expect(div.numeric('RESULT', 4)).toBe('0025+');
  });

  it('executes B/Z/N/P value statuses and E/H/L/U compare statuses', () => {
    const at = SALES_SUMMARY_MODEL.fields[0]!.at;
    const valueModel = modelWith([{
      name: 'VALUE', length: 3, sources: [],
      statuses: [
        { status: 'B', condition: '10' }, { status: 'Z', condition: '11' },
        { status: 'N', condition: '12' }, { status: 'P', condition: '13' },
      ], at,
    }]);
    for (const [digits, zone, expected] of [
      ['   ', undefined, ['1', '1', '0', '1']],
      ['000', 'none', ['0', '1', '0', '1']],
      ['012', 'B', ['0', '0', '1', '0']],
      ['012', 'none', ['0', '0', '0', '1']],
    ] as const) {
      const h = calcHarness(valueModel, 'extract');
      if (zone === undefined) h.setGlyphs('VALUE', digits);
      else h.setNumeric('VALUE', digits, zone);
      h.run();
      expect(['10', '11', '12', '13'].map((condition) => h.indicator(condition)), `${digits}/${String(zone)}`)
        .toEqual(expected);
    }

    const compareModel = modelWith([
      { name: 'LEFT', length: 3, sources: [], statuses: [], at },
      { name: 'RIGHT', length: 3, sources: [], statuses: [], at },
    ], [{
      factor1: { text: 'LEFT', length: 3 }, op: 'C', factor2: { text: 'RIGHT', length: 3 },
      conditions: [], time: 'detail', statuses: [
        { status: 'E', condition: '10' }, { status: 'H', condition: '11' },
        { status: 'L', condition: '12' }, { status: 'U', condition: '13' },
      ], at,
    }]);
    for (const [left, right, expected] of [
      ['123', '123', ['1', '0', '0', '0']],
      ['124', '123', ['0', '1', '0', '1']],
      ['122', '123', ['0', '0', '1', '1']],
    ] as const) {
      const h = calcHarness(compareModel, 'detailCalc');
      h.setGlyphs('LEFT', left);
      h.setGlyphs('RIGHT', right);
      h.run();
      expect(['10', '11', '12', '13'].map((condition) => h.indicator(condition)), `${left}/${right}`)
        .toEqual(expected);
    }
  });
});
