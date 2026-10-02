import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { ORG_DEFAULT } from '../src/asm/types.js';
import { driver } from '../src/rpg/cycle.js';
import {
  CARD_AREA_IS_CLEARED_AT_ENTRY_AND_HUNDREDS_ALIGNED,
  CARD_IMAGE_LENGTH,
  GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET,
  INDICATORS_ARE_ONE_CHARACTER_EACH,
  layoutInvariant,
  layoutOf,
  measure,
  measureStmt,
  ONLY_REFERENCED_INDICATORS_ARE_ALLOCATED,
  PRINT_LINE_LENGTH,
  PRINT_AREA_IS_HUNDREDS_ALIGNED,
  RECORD_POSITION_IS_THREE_DIGITS,
  RESERVED_AREAS_ARE_PAIRWISE_DISJOINT_AND_THE_PRINT_AREA_CLEARS_THE_CARD_IMAGE,
  RESERVED_AREAS_SIT_ABOVE_THE_CODE_AND_BELOW_THE_PRINT_GROUP_MARK,
} from '../src/rpg/layout.js';
import type { Model, SheetKind, SpecRef, Stmt } from '../src/rpg/types.js';
import {
  SALES_SUMMARY_MODEL,
  SALES_SUMMARY_STATEMENTS,
} from './fixtures/sales-summary.model.js';

const SOURCE = readFileSync('demos/sales-summary.asm', 'utf8');

function ref(seqno: number, sheet: SheetKind, page: string, cardNo: string): SpecRef {
  return { seqno, sheet, page, cardNo };
}

function symbol(name: string): number {
  const value = SALES_SUMMARY_ASSEMBLY.symbols.get(name)?.value;
  if (value === undefined) throw new Error(`sales-summary has no ${name} symbol`);
  return value;
}

function snapshot(layout: ReturnType<typeof layoutOf>, names: readonly string[]) {
  return {
    org: layout.org,
    constants: layout.constants,
    code: layout.code,
    codeLength: layout.codeLength,
    slack: layout.slack,
    indicatorFile: layout.indicatorFile,
    cardIn: layout.cardIn,
    printLine: layout.printLine,
    printGroupMark: layout.printGroupMark,
    highWater: layout.highWater,
    coreSizeCode: layout.coreSizeCode,
    areas: Object.fromEntries(names.map((name) => [name, layout.areaOf(name)])),
  };
}

function measuredSlice(stmts: readonly Stmt[]): readonly { readonly seqno: number; readonly stmt: Stmt }[] {
  const first = stmts.findIndex((stmt) => stmt.label === 'ONE');
  const areas = stmts.findIndex((stmt) => stmt.comment?.includes('-- 15. RESERVED AREAS'));
  if (first === -1 || areas === -1 || first >= areas) {
    throw new Error('sales-summary statements no longer contain the expected constants/code slice');
  }
  return stmts
    .map((stmt, index) => ({ seqno: index + 1, stmt }))
    .slice(first, areas)
    .filter(({ stmt }) => (stmt.kind ?? 'statement') !== 'comment');
}

const SALES_SUMMARY_ASSEMBLY = assemble(SOURCE);
const MEASURED = measuredSlice(SALES_SUMMARY_STATEMENTS);
const MEASURED_SEQNOS = new Set(MEASURED.map(({ seqno }) => seqno));
const MEASURED_LISTING = SALES_SUMMARY_ASSEMBLY.listing
  .filter((line) => MEASURED_SEQNOS.has(line.seqno));
const MEASURED_TOTAL = measure(MEASURED.map(({ stmt }) => stmt));

const BOUNDARY_MODEL = {
  control: { present: true, at: ref(1, 'control', '02', '010') },
  records: [{
    condition: '01',
    seq: 'AA',
    optional: false,
    codes: [{ position: 1, not: false, compare: 'C', code: 'S' }],
    at: ref(2, 'input', '03', '010'),
  }],
  controlFields: [{ n: 1, end: 1, length: 1 }],
  fields: [{
    name: 'PAGENO',
    length: 3,
    sources: [{ kind: 'page', numeric: false, operation: 'move', conditions: [] }],
    statuses: [],
    at: ref(3, 'data', '04', '010'),
  }],
  calcs: [],
  lines: [],
  // 21 since START's clear aligned IND (slack 603 -> IND 700): the card image ends at 800 and
  // PLINE rounds a whole block up, as 17 did against the old one-cell slack.
  indicators: Array.from({ length: 21 }, (_, index) => `I${String(index).padStart(2, '0')}`),
} satisfies Model;

describe('Wave 2 — layout and sizing (plan §11 wave 2)', () => {
  it('pins every Wave-2 layout ruling by its frozen §15 name', () => {
    expect([
      RECORD_POSITION_IS_THREE_DIGITS,
      INDICATORS_ARE_ONE_CHARACTER_EACH,
      ONLY_REFERENCED_INDICATORS_ARE_ALLOCATED,
      RESERVED_AREAS_SIT_ABOVE_THE_CODE_AND_BELOW_THE_PRINT_GROUP_MARK,
      RESERVED_AREAS_ARE_PAIRWISE_DISJOINT_AND_THE_PRINT_AREA_CLEARS_THE_CARD_IMAGE,
      PRINT_AREA_IS_HUNDREDS_ALIGNED,
      GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET,
    ]).toEqual([true, true, true, true, true, true, true]);
  });

  it('measures the hand-built constants-and-code slice, not the header, comments, or reserved areas', () => {
    expect(SALES_SUMMARY_ASSEMBLY.ok).toBe(true);
    expect(MEASURED_LISTING).toHaveLength(MEASURED.length);
    expect(MEASURED_TOTAL).toBe(2038);
  });

  it('matches the assembler ct column statement-for-statement over the measured slice', () => {
    for (const [index, entry] of MEASURED.entries()) {
      const listing = MEASURED_LISTING[index];
      expect(listing?.ct).toBeDefined();
      expect(measureStmt(entry.stmt)).toBe(listing?.ct);
    }
  });

  it('reconstructs the published Wave-1 layout from the hand-built model and measured length', () => {
    const layout = layoutOf(SALES_SUMMARY_MODEL, MEASURED_TOTAL);

    expect(layout.org).toBe(ORG_DEFAULT);
    expect(layout.constants).toBe(ORG_DEFAULT);
    expect(layout.code).toBe(symbol('START'));
    expect(layout.codeLength).toBe(MEASURED_TOTAL);
    expect(layout.slack).toBe(2538);
    expect(layout.areaOf('IND')).toBe(symbol('IND'));
    expect(layout.areaOf('RC01')).toBe(symbol('IND'));
    expect(layout.areaOf('F1')).toBe(2601);
    expect(layout.areaOf('FSTPG')).toBe(2605);
    expect(layout.areaOf('CDIN')).toBe(symbol('CDIN'));
    expect(layout.areaOf('C001')).toBe(2607);
    expect(layout.areaOf('C003')).toBe(2609);
    expect(layout.areaOf('C006')).toBe(2612);
    expect(layout.areaOf('C014')).toBe(2620);
    expect(layout.areaOf('C019')).toBe(2625);
    expect(layout.areaOf('C027')).toBe(2633);
    expect(layout.areaOf('PLINE')).toBe(symbol('PLINE'));
    expect(layout.areaOf('PLGM')).toBe(symbol('PLGM'));
    expect(layout.highWater).toBe(2833);
    expect(layout.coreSizeCode).toBe(1);
  });

  it('asserts the pairwise-disjoint ascending extents and the print-line ceiling on the demo layout', () => {
    const layout = layoutOf(SALES_SUMMARY_MODEL, MEASURED_TOTAL);
    const invariant = layoutInvariant(layout, SALES_SUMMARY_MODEL);

    expect(invariant.ok).toBe(true);
    expect(invariant.errors).toEqual([]);
    expect(invariant.expectedPrintLine).toBe(2700);
    expect(invariant.extents).toEqual([
      { name: 'code', start: 500, end: 2537, length: 2038 },
      { name: 'slack', start: 2538, end: 2538, length: 1 },
      { name: 'indicatorFile', start: 2600, end: 2606, length: 7 },
      { name: 'cardIn', start: 2607, end: 2686, length: CARD_IMAGE_LENGTH },
      { name: 'printLine', start: 2700, end: 2831, length: PRINT_LINE_LENGTH },
      { name: 'printGroupMark', start: 2832, end: 2832, length: 1 },
    ]);
  });

  it('catches the hundreds-boundary case on a model the fixed demo can never reach', () => {
    const layout = layoutOf(BOUNDARY_MODEL, 103);
    const invariant = layoutInvariant(layout, BOUNDARY_MODEL);

    expect(layout.indicatorFile).toBe(700);
    expect(layout.cardIn).toBe(721);
    expect(layout.printLine).toBe(900);
    expect(invariant.expectedPrintLine).toBe(900);
    expect(invariant.ok).toBe(true);
  });

  it('clears IND and CDIN at entry with one CS per hundreds block, never below IND', () => {
    // 21 indicators + 80 columns = 101 positions, 00700-00800: the chained case the demos never
    // reach. CS clears B down through its hundreds position (A22-0526-3 p.23), so 800 then 799.
    expect(CARD_AREA_IS_CLEARED_AT_ENTRY_AND_HUNDREDS_ALIGNED).toBe(true);
    const layout = layoutOf(BOUNDARY_MODEL, 103);
    const init = driver(BOUNDARY_MODEL, layout).get('init') ?? [];
    expect(init.filter((stmt) => stmt.op === 'CS').map((stmt) => stmt.operands))
      .toEqual([['IND+100'], ['IND+99']]);
    expect(init[0]?.label, 'the clear is the program entry').toBe('START');
    expect(layoutInvariant({ ...layout, indicatorFile: layout.slack + 1 }, BOUNDARY_MODEL).errors)
      .toContain('indicatorFile must be the first hundreds boundary above the slack');
  });

  it('is a fixed point once the measured constants-and-code run is supplied', () => {
    const first = layoutOf(SALES_SUMMARY_MODEL, MEASURED_TOTAL);
    const second = layoutOf(SALES_SUMMARY_MODEL, measure(MEASURED.map(({ stmt }) => stmt)));

    expect(snapshot(second, ['IND', 'RC01', 'F1', 'FSTPG', 'CDIN', 'PLINE', 'PLGM']))
      .toEqual(snapshot(first, ['IND', 'RC01', 'F1', 'FSTPG', 'CDIN', 'PLINE', 'PLGM']));
  });
});
