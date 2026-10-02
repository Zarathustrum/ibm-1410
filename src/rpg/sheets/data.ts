import type { SpecCard, SpecRef } from '../types.js';
import { DATA_COLUMNS, valueOf } from './columns.js';

export const DATA_STATUS_VOCABULARY = ['B', 'Z', 'N', 'P'] as const;
export const DATA_SOURCE_VOCABULARY = ['Cxx', 'PAG', 'SER', 'RCT'] as const;
export const DATA_OPERATION_VOCABULARY = ['', 'A', 'S', '?', '!', 'D', 'Y'] as const;

export interface RawCondition {
  readonly not: boolean;
  readonly notMarker: string;
  readonly indicator: string;
}

export interface DataSourceRow {
  readonly n: 1 | 2 | 3;
  readonly source: string;
  readonly numeric: string;
  readonly end: string;
  readonly length: string;
  readonly operation: string;
  readonly conditions: readonly RawCondition[];
}

export interface DataRow {
  readonly at: SpecRef;
  readonly card: SpecCard;
  readonly name: string;
  readonly length: string;
  readonly statuses: readonly { readonly status: string; readonly condition: string }[];
  readonly sources: readonly DataSourceRow[];
}

const trimmed = (card: SpecCard, name: string): string => valueOf(card, DATA_COLUMNS, name).trim();

function conditionsOf(card: SpecCard, source: number): readonly RawCondition[] {
  const conditions: RawCondition[] = [];
  for (let condition = 1; condition <= 2; condition++) {
    const indicator = trimmed(card, `source${source}Condition${condition}Indicator`);
    const notMarker = trimmed(card, `source${source}Condition${condition}Not`);
    const not = notMarker === 'N';
    if (indicator !== '' || notMarker !== '') conditions.push({ not, notMarker, indicator });
  }
  return conditions;
}

export function parseDataCard(card: SpecCard, at: SpecRef): DataRow {
  const statuses: { status: string; condition: string }[] = [];
  for (let n = 1; n <= 3; n++) {
    const status = trimmed(card, `status${n}`);
    const condition = trimmed(card, `resultingCondition${n}`);
    if (status !== '' || condition !== '') statuses.push({ status, condition });
  }

  const sources: DataSourceRow[] = [];
  for (let n = 1; n <= 3; n++) {
    const source = trimmed(card, `source${n}FieldSource`);
    const numeric = trimmed(card, `source${n}Numeric`);
    const end = trimmed(card, `source${n}FieldEnd`);
    const length = trimmed(card, `source${n}FieldLength`);
    const operation = trimmed(card, `source${n}Operation`);
    const conditions = conditionsOf(card, n);
    if (source !== '' || numeric !== '' || end !== '' || length !== '' || operation !== '' || conditions.length > 0) {
      sources.push({ n: n as 1 | 2 | 3, source, numeric, end, length, operation, conditions });
    }
  }

  return {
    at,
    card,
    name: trimmed(card, 'fieldName'),
    length: trimmed(card, 'fieldLength'),
    statuses,
    sources,
  };
}
