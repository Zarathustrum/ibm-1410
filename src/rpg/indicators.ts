import type { Condition, Model, Stmt } from './types.js';

/**
 * OPEN: `F1_TO_F6_ARE_THE_CONTROL_LEVEL_INDICATORS` — `[verified]` IBM 1401 meaning,
 * `[likely]` 1410 processor behaviour. IBM 1401 J24-0215-2 pp.24, 36 identify F1-F6 as the
 * control-field indicators; pp.20, 22 establish the six control levels they report. Phase 5
 * carries those labels into the 1410 processor. Fallback: replace only this label map if a
 * recovered 1410 processor gives them different names. Plan §15; `rpg-sources.md` §10.1,
 * §10.5; `open-questions.md`, Phase 5 / Wave 3.
 */
export const F1_TO_F6_ARE_THE_CONTROL_LEVEL_INDICATORS = true;

const ON = '1';
const OFF = '0';

/**
 * Map the RPG condition name to the Autocoder symbol stored in the one-character indicator file.
 * `1P` cannot be `P1`, because `P1` is already the channel-1 punch mnemonic.
 */
export function indicatorLabel(name: string): string {
  if (/^[0-9]{2}$/.test(name)) return `RC${name}`;
  if (name === '1P') return 'FSTPG';
  return name;
}

export function indicatorAreaStmts(model: Pick<Model, 'indicators'>): readonly Stmt[] {
  if (model.indicators.length === 0) return [];
  return [
    { label: 'IND', op: 'DA', operands: [`1X${model.indicators.length}`], comment: '                THE INDICATOR FILE' },
    ...model.indicators.map((indicator, index) => ({
      label: indicatorLabel(indicator),
      op: '',
      operands: [String(index + 1)],
    })),
  ];
}

export function clearIndicatorFileStmt(model: Pick<Model, 'indicators'>): Stmt | undefined {
  const last = model.indicators.at(-1);
  if (last === undefined) return undefined;
  return { op: 'MLCA', operands: ['IZERO', indicatorLabel(last)], comment: '        ALL INDICATORS OFF' };
}

export function setIndicator(name: string, on: boolean): Stmt {
  return { op: 'MLCS', operands: [on ? 'ONE' : 'ZERO', indicatorLabel(name)] };
}

/**
 * Emit an AND-condition guard. Each BCE branches to `skip` when one required condition fails:
 * a positive condition fails on `0`, and a negated condition fails on `1`.
 */
export function conditionStmts(conditions: readonly Condition[], skip: string): readonly Stmt[] {
  return conditions.map((condition) => ({
    op: 'BCE',
    operands: [skip, indicatorLabel(condition.indicator), condition.negated ? ON : OFF],
  }));
}
