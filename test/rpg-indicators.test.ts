import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { resolve } from '../src/asm/mnemonics.js';
import { layoutOf, measure } from '../src/rpg/layout.js';
import {
  clearIndicatorFileStmt,
  conditionStmts,
  F1_TO_F6_ARE_THE_CONTROL_LEVEL_INDICATORS,
  indicatorAreaStmts,
  indicatorLabel,
  setIndicator,
} from '../src/rpg/indicators.js';
import type { Condition, Model, Stmt } from '../src/rpg/types.js';
import {
  SALES_SUMMARY_MODEL,
  SALES_SUMMARY_STATEMENTS,
} from './fixtures/sales-summary.model.js';

const SOURCE = readFileSync('demos/sales-summary.asm', 'utf8');
const ASSEMBLED = assemble(SOURCE);
const NUMBERED_INDICATORS = Array.from({ length: 100 }, (_, n) => String(n).padStart(2, '0'));
const ALL_INDICATORS = [
  ...NUMBERED_INDICATORS, 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'OF', 'LC', '1P', 'PRIME',
] as const;
const ALL_INDICATOR_LABELS = [
  ...NUMBERED_INDICATORS.map((name) => `RC${name}`),
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'OF', 'LC', 'FSTPG', 'PRIME',
] as const;

function cond(indicator: string, negated = false): Condition {
  return { indicator, negated };
}

function coreSlice(stmts: readonly Stmt[]): readonly Stmt[] {
  const first = stmts.findIndex((stmt) => stmt.label === 'ONE');
  const areas = stmts.findIndex((stmt) => stmt.comment?.includes('-- 15. RESERVED AREAS'));
  return stmts.slice(first, areas).filter((stmt) => (stmt.kind ?? 'statement') !== 'comment');
}

function targetIndicatorArea(): readonly Stmt[] {
  const area = SALES_SUMMARY_STATEMENTS.findIndex((stmt) => stmt.label === 'IND' && stmt.op === 'DA');
  const afterArea = SALES_SUMMARY_STATEMENTS.findIndex((stmt, index) => index > area && stmt.label === 'CDIN');
  return SALES_SUMMARY_STATEMENTS.slice(area, afterArea);
}

function symbol(name: string): number {
  const value = ASSEMBLED.symbols.get(name)?.value;
  if (value === undefined) throw new Error(`sales-summary has no ${name} symbol`);
  return value;
}

describe('Wave 3 — indicator file allocation and labels (plan §6.1, §11 wave 3)', () => {
  it('pins the Wave-3 control-level ruling by its frozen §15 name', () => {
    expect(F1_TO_F6_ARE_THE_CONTROL_LEVEL_INDICATORS).toBe(true);
  });

  it('maps each referenced demo indicator to the Wave-1 Autocoder symbol', () => {
    expect(SALES_SUMMARY_MODEL.indicators.map(indicatorLabel))
      .toEqual(['RC01', 'F1', 'F2', 'OF', 'LC', 'FSTPG', 'PRIME']);
    expect(resolve('P1')?.io).toBeDefined();
    expect(indicatorLabel('1P')).toBe('FSTPG');
  });

  it('keeps the emitter and Wave-2 layout label maps identical over the valid vocabulary', () => {
    const model: Model = { ...SALES_SUMMARY_MODEL, indicators: ALL_INDICATORS };
    const layout = layoutOf(model, 0);

    expect(ALL_INDICATORS.map(indicatorLabel)).toEqual(ALL_INDICATOR_LABELS);
    for (const [index, indicator] of ALL_INDICATORS.entries()) {
      const address = layout.indicatorFile + index;
      expect(layout.areaOf(indicator), indicator).toBe(address);
      expect(layout.areaOf(ALL_INDICATOR_LABELS[index]!), ALL_INDICATOR_LABELS[index]).toBe(address);
    }
  });

  it('emits the target indicator DA header and bare-lo sub-entries without owning any fixture', () => {
    expect(indicatorAreaStmts(SALES_SUMMARY_MODEL)).toEqual(targetIndicatorArea());
  });

  it('allocates only the fixture-referenced indicators at the Wave-1 addresses', () => {
    const layout = layoutOf(SALES_SUMMARY_MODEL, measure(coreSlice(SALES_SUMMARY_STATEMENTS)));

    expect(layout.areaOf('IND')).toBe(symbol('IND'));
    for (const [index, indicator] of SALES_SUMMARY_MODEL.indicators.entries()) {
      const label = indicatorLabel(indicator);
      expect(layout.areaOf(indicator)).toBe(symbol(label));
      expect(layout.areaOf(label)).toBe(symbol(label));
      expect(symbol(label)).toBe(symbol('IND') + index);
    }
    expect(layout.areaOf('P1')).toBeUndefined();
  });

  it('clears the unmarked file with one source-terminated move to the last indicator', () => {
    expect(clearIndicatorFileStmt(SALES_SUMMARY_MODEL))
      .toEqual({ op: 'MLCA', operands: ['IZERO', 'PRIME'], comment: '        ALL INDICATORS OFF' });
  });

  it('sets and clears a single-character indicator through MLCS', () => {
    expect(setIndicator('01', true)).toEqual({ op: 'MLCS', operands: ['ONE', 'RC01'] });
    expect(setIndicator('F1', false)).toEqual({ op: 'MLCS', operands: ['ZERO', 'F1'] });
    expect(setIndicator('1P', true)).toEqual({ op: 'MLCS', operands: ['ONE', 'FSTPG'] });
  });

  it('branches to the supplied skip label when any AND condition fails', () => {
    expect(conditionStmts([cond('F1'), cond('LC', true), cond('1P')], 'SKIP')).toEqual([
      { op: 'BCE', operands: ['SKIP', 'F1', '0'] },
      { op: 'BCE', operands: ['SKIP', 'LC', '1'] },
      { op: 'BCE', operands: ['SKIP', 'FSTPG', '0'] },
    ]);
  });
});
