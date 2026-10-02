import type { SpecCard, SpecRef } from '../types.js';
import { CALC_COLUMNS, valueOf } from './columns.js';
import type { RawCondition } from './data.js';

export const CALC_STATUS_VOCABULARY = ['B', 'Z', 'N', 'P', 'U', 'E', 'H', 'L'] as const;
export const CALC_OPERATION_VOCABULARY = ['', '+', '-', 'X', '/', 'C'] as const;
export const CALC_ACCUMULATE_VOCABULARY = ['', 'A', 'S', '?', '!'] as const;

export interface CalcRow {
  readonly at: SpecRef;
  readonly card: SpecCard;
  readonly result: string;
  readonly length: string;
  readonly statuses: readonly { readonly status: string; readonly condition: string }[];
  readonly factor1: string;
  readonly factor1Length: string;
  readonly operation: string;
  readonly factor2: string;
  readonly factor2Length: string;
  readonly accumulate: string;
  readonly conditions: readonly RawCondition[];
  readonly time: string;
  readonly halfAdjust: string;
  readonly positionAdjust: string;
}

const trimmed = (card: SpecCard, name: string): string => valueOf(card, CALC_COLUMNS, name).trim();

export function parseCalcCard(card: SpecCard, at: SpecRef): CalcRow {
  const statuses: { status: string; condition: string }[] = [];
  for (let n = 1; n <= 3; n++) {
    const status = trimmed(card, `status${n}`);
    const condition = trimmed(card, `resultingCondition${n}`);
    if (status !== '' || condition !== '') statuses.push({ status, condition });
  }

  const conditions: RawCondition[] = [];
  for (let n = 1; n <= 3; n++) {
    const indicator = trimmed(card, `condition${n}Indicator`);
    const notMarker = trimmed(card, `condition${n}Not`);
    const not = notMarker === 'N';
    if (indicator !== '' || notMarker !== '') conditions.push({ not, notMarker, indicator });
  }

  const storedOperation = trimmed(card, 'op');

  return {
    at,
    card,
    result: trimmed(card, 'fieldName'),
    length: trimmed(card, 'fieldLength'),
    statuses,
    factor1: trimmed(card, 'factor1'),
    factor1Length: trimmed(card, 'factor1Length'),
    // The source-box reader stores a typed `+` as the machine's 12-punch `&`.
    // The sheet-row boundary restores the manual's logical operation spelling.
    operation: storedOperation === '&' ? '+' : storedOperation,
    factor2: trimmed(card, 'factor2'),
    factor2Length: trimmed(card, 'factor2Length'),
    accumulate: trimmed(card, 'accumulate'),
    conditions,
    time: trimmed(card, 'totalDetail'),
    halfAdjust: trimmed(card, 'halfAdjust'),
    positionAdjust: trimmed(card, 'positionAdjust'),
  };
}
