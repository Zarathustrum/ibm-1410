import type { SpecCard, SpecRef } from '../types.js';
import { INPUT_COLUMNS, valueOf } from './columns.js';

export interface InputCodeRow {
  readonly n: 1 | 2 | 3 | 4 | 5 | 6;
  readonly position: string;
  readonly not: boolean;
  readonly notMarker: string;
  readonly compare: string;
  readonly code: string;
}

export interface InputControlFieldRow {
  readonly n: 1 | 2 | 3 | 4 | 5 | 6;
  readonly end: string;
  readonly length: string;
}

export interface InputRow {
  readonly at: SpecRef;
  readonly card: SpecCard;
  readonly kind: 'record' | 'sequenceField';
  readonly seq: string;
  readonly number: string;
  readonly option: string;
  readonly optional: boolean;
  readonly codes: readonly InputCodeRow[];
  readonly resultingCondition: string;
  readonly controlFields: readonly InputControlFieldRow[];
}

const trimmed = (card: SpecCard, name: string): string => valueOf(card, INPUT_COLUMNS, name).trim();

export function parseInputCard(card: SpecCard, at: SpecRef): InputRow {
  const identity = [
    trimmed(card, 'c'),
    trimmed(card, 'seq'),
    trimmed(card, 'number'),
  ].join('');
  const kind = /^SCF[1-6]$/.test(identity) ? 'sequenceField' : 'record';

  const codes: InputCodeRow[] = [];
  for (let n = 1; n <= 6; n++) {
    const position = trimmed(card, `recordPosition${n}`);
    const notMarker = trimmed(card, `recordNot${n}`);
    const not = notMarker === 'N';
    const compare = trimmed(card, `recordCompare${n}`);
    const code = valueOf(card, INPUT_COLUMNS, `recordCode${n}`);
    if (position !== '' || notMarker !== '' || compare !== '' || code.trim() !== '') {
      codes.push({ n: n as 1 | 2 | 3 | 4 | 5 | 6, position, not, notMarker, compare, code });
    }
  }

  const controlFields: InputControlFieldRow[] = [];
  for (let n = 1; n <= 6; n++) {
    const end = trimmed(card, `controlFieldEnd${n}`);
    const length = trimmed(card, `controlFieldLength${n}`);
    if (end !== '' || length !== '') {
      controlFields.push({ n: n as 1 | 2 | 3 | 4 | 5 | 6, end, length });
    }
  }

  return {
    at,
    card,
    kind,
    seq: trimmed(card, 'seq'),
    number: trimmed(card, 'number'),
    option: trimmed(card, 'option'),
    optional: trimmed(card, 'option') === 'X',
    codes,
    resultingCondition: trimmed(card, 'resultingCondition'),
    controlFields,
  };
}
