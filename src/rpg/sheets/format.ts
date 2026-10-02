import type { SpecCard, SpecRef } from '../types.js';
import { FORMAT_COLUMNS, valueOf } from './columns.js';
import type { RawCondition } from './data.js';

export const FORMAT_LINE_TYPES = ['H', 'D', 'T'] as const;
export const FORMAT_ENTRY_TYPES = ['L', 'F', 'B', 'K', 'W'] as const;

interface FormatBaseRow {
  readonly at: SpecRef;
  readonly card: SpecCard;
}

export interface FormatLineRow extends FormatBaseRow {
  readonly kind: 'line';
  readonly id: string;
  readonly print: string;
  readonly punch: string;
  readonly reserved: string;
  readonly nextLine: string;
  readonly spaceBefore: string;
  readonly spaceAfter: string;
  readonly skipBefore: string;
  readonly skipAfter: string;
  readonly stacker: string;
  readonly conditions: readonly RawCondition[];
}

export interface FormatFieldRow extends FormatBaseRow {
  readonly kind: 'field';
  readonly entryKind: string;
  readonly name: string;
  readonly end: string;
  readonly conditions: readonly RawCondition[];
  readonly zeroSuppress: string;
  readonly length: string;
  readonly literal: string;
}

export type FormatRow = FormatLineRow | FormatFieldRow;

const trimmed = (card: SpecCard, name: string): string => valueOf(card, FORMAT_COLUMNS, name).trim();

function conditionsOf(card: SpecCard, prefix: 'line' | 'field'): readonly RawCondition[] {
  const conditions: RawCondition[] = [];
  for (let n = 1; n <= 3; n++) {
    const indicator = trimmed(card, `${prefix}Condition${n}Indicator`);
    const notMarker = trimmed(card, `${prefix}Condition${n}Not`);
    const not = notMarker === 'N';
    if (indicator !== '' || notMarker !== '') conditions.push({ not, notMarker, indicator });
  }
  return conditions;
}

export function parseFormatCard(card: SpecCard, at: SpecRef): FormatRow {
  const entryKind = trimmed(card, 'format');
  if (entryKind === 'L') {
    return {
      kind: 'line',
      at,
      card,
      id: trimmed(card, 'line'),
      print: trimmed(card, 'print'),
      punch: trimmed(card, 'punch'),
      reserved: trimmed(card, 'reserved'),
      nextLine: trimmed(card, 'nextLine'),
      spaceBefore: trimmed(card, 'spaceBefore'),
      spaceAfter: trimmed(card, 'spaceAfter'),
      skipBefore: trimmed(card, 'skipBefore'),
      skipAfter: trimmed(card, 'skipAfter'),
      stacker: trimmed(card, 'stacker'),
      conditions: conditionsOf(card, 'line'),
    };
  }

  const length = trimmed(card, 'fieldLength');
  const rawLiteral = valueOf(card, FORMAT_COLUMNS, 'constantOrEditControlWord');
  const declaredLength = /^\d+$/.test(length) ? Number(length) : undefined;

  return {
    kind: 'field',
    at,
    card,
    entryKind,
    name: trimmed(card, 'fieldName'),
    end: trimmed(card, 'fieldEnd'),
    conditions: conditionsOf(card, 'field'),
    zeroSuppress: trimmed(card, 'zeroSuppress'),
    length,
    literal: declaredLength === undefined ? rawLiteral.trimEnd() : rawLiteral.slice(0, declaredLength),
  };
}
