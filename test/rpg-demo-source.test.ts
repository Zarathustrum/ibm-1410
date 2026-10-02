import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { model } from '../src/rpg/model.js';
import { parse } from '../src/rpg/deck.js';
import {
  CALC_COLUMNS,
  DATA_COLUMNS,
  FORMAT_COLUMNS,
  INPUT_COLUMNS,
  valueOf,
} from '../src/rpg/sheets/columns.js';

const SOURCE = readFileSync('demos/sales-summary.rpg', 'utf8').trimEnd();
const CARDS = SOURCE.split('\n');

const numbered = (page: string, count: number): readonly string[] => Array.from(
  { length: count },
  (_, index) => `${page}${String((index + 1) * 10).padStart(3, '0')}`,
);

const EXPECTED_IDENTITIES = [
  '02010',
  '03010',
  ...numbered('04', 5),
  ...numbered('05', 7),
  ...numbered('06', 26),
  ...numbered('07', 20),
] as const;

function shiftSpan(cardNo: string, start: number, end: number, delta: -1 | 1): string {
  return CARDS.map((line) => {
    if (!line.endsWith(cardNo)) return line;
    const chars = [...line];
    const value = chars.slice(start - 1, end);
    for (let column = start; column <= end; column++) chars[column - 1] = ' ';
    for (let index = 0; index < value.length; index++) chars[start + delta - 1 + index] = value[index] ?? ' ';
    return chars.join('');
  }).join('\n');
}

describe('sales-summary RPG source deck', () => {
  it('is the exact 60-card §10.3 deck, including every page/card identity', () => {
    expect(CARDS).toHaveLength(60);
    expect(CARDS.every((card) => [...card].length === 80)).toBe(true);
    expect(CARDS.map((card) => card.slice(75))).toEqual(EXPECTED_IDENTITIES);

    const parsed = parse(SOURCE);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.cards.map(({ at }) => `${at.page}${at.cardNo}`)).toEqual(EXPECTED_IDENTITIES);
  });

  it('pins the exact sheet/card split: RG, Input, Data, Calculation, 8 L, 35 F/B/K, and 3 W', () => {
    const parsed = parse(SOURCE);
    const formatLines = parsed.format.filter((row) => row.kind === 'line');
    const formatFields = parsed.format.filter((row) => row.kind === 'field');

    expect(parsed.control?.at).toMatchObject({ page: '02', cardNo: '010' });
    expect(parsed.input).toHaveLength(1);
    expect(parsed.data).toHaveLength(5);
    expect(parsed.calculations).toHaveLength(7);
    expect(formatLines).toHaveLength(8);
    expect(formatFields.filter((row) => row.entryKind !== 'W')).toHaveLength(35);
    expect(formatFields.filter((row) => row.entryKind === 'W')).toHaveLength(3);
  });

  it('pins every load-bearing source span that previously drifted', () => {
    const input = CARDS.find((card) => card.endsWith('03010')) ?? '';
    expect(valueOf(input, INPUT_COLUMNS, 'recordPosition1')).toBe('001');
    expect(valueOf(input, INPUT_COLUMNS, 'recordCompare1')).toBe('C');
    expect(valueOf(input, INPUT_COLUMNS, 'resultingCondition')).toBe('01');
    expect(valueOf(input, INPUT_COLUMNS, 'controlFieldEnd1')).toBe('006');
    expect(valueOf(input, INPUT_COLUMNS, 'controlFieldLength1')).toBe('03');
    expect(valueOf(input, INPUT_COLUMNS, 'controlFieldEnd2')).toBe('003');
    expect(valueOf(input, INPUT_COLUMNS, 'controlFieldLength2')).toBe('02');

    const data = CARDS.filter((card) => card.startsWith('D'));
    expect(data.map((card) => valueOf(card, DATA_COLUMNS, 'source1FieldSource').trim()))
      .toEqual(['CAA', 'CAA', 'CAA', 'CAA', 'PAG']);
    expect(data.map((card) => valueOf(card, DATA_COLUMNS, 'source1FieldEnd')))
      .toEqual(['006', '014', '019', '027', '   ']);

    const calculationConditions = CARDS.filter((card) => card.startsWith('A'))
      .map((card) => [
        valueOf(card, CALC_COLUMNS, 'condition1Not'),
        valueOf(card, CALC_COLUMNS, 'condition1Indicator'),
        valueOf(card, CALC_COLUMNS, 'totalDetail'),
      ].join(''));
    expect(calculationConditions).toEqual(['   D', '   D', '   D', ' F1T', ' F1T', ' F2T', ' F2T']);

    const formatLines = CARDS.filter((card) => card.startsWith('L'));
    expect(formatLines.map((card) => valueOf(card, FORMAT_COLUMNS, 'line')))
      .toEqual(['HA1', 'HA2', 'HB1', 'HB2', 'D11', 'T11', 'T21', 'T31']);
    expect(formatLines.map((card) => valueOf(card, FORMAT_COLUMNS, 'lineCondition1Indicator')))
      .toEqual(['1P', '  ', 'OF', '  ', '01', 'F1', 'F2', 'LC']);

    const words = CARDS.filter((card) => card.startsWith('W'));
    expect(words.map((card) => valueOf(card, FORMAT_COLUMNS, 'fieldName').trim()))
      .toEqual(['WORD01', 'WORD02', 'WORD03']);
    expect(words.map((card) => valueOf(card, FORMAT_COLUMNS, 'fieldLength')))
      .toEqual(['010', '013', '015']);
    expect(words.map((card) => valueOf(card, FORMAT_COLUMNS, 'constantOrEditControlWord')))
      .toEqual(['   ,   .                 ', '  ,   ,   .              ', '    ,   ,   .            ']);
  });

  const wrongColumns = [
    ['Input record position left', '03010', 6, 8, -1, 5, 'Input option 0 is not blank or X'],
    ['Input record position right', '03010', 6, 8, 1, 9, 'record-code negation 1 is not blank or N'],
    ['Input comparison right', '03010', 10, 10, 1, 10, 'record comparison blank is not Z, D, or C'],
    ['Input control length right', '03010', 47, 48, 1, 47, 'control-field length is outside the punched length columns'],
    ['Data field end left, DEPT', '04010', 24, 26, -1, 23, 'source numeric marker 0 is not valid in its column'],
    ['Data numeric marker right', '04030', 23, 23, 1, 24, 'non-numeric character in a position field'],
    ['Data field end left, PART', '04020', 24, 26, -1, 23, 'source numeric marker 0 is not valid in its column'],
    ['Calculation factor-1 length right', '05010', 26, 28, 1, 29,
      'Calculation operation 8 is outside the shared X24 vocabulary'],
    ['Calculation factor-2 left', '05010', 30, 35, -1, 29,
      'Calculation operation 0 is outside the shared X24 vocabulary'],
    ['Calculation factor-2 length right', '05010', 36, 38, 1, 39,
      'Calculation accumulate 5 is outside the shared X24 vocabulary'],
    ['Calculation half-adjust left', '05010', 50, 51, -1, 49, 'Calculation column 49 must be T or D'],
    ['Format print left', '06010', 5, 5, -1, 5, 'OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC'],
    ['Format skip-before right', '06010', 15, 16, 1, 15, 'skipBefore must name carriage channel 1-12'],
    ['Format field length left', '06020', 48, 50, -1, 47, 'Format zero-suppress marker 0 is not blank or Z'],
    ['Format zero-suppress right', '06050', 47, 47, 1, 48, 'Format constant/edit length Z is outside cols 51-75'],
  ] as const;

  it.each(wrongColumns)(
    'diagnoses exactly one one-column shift: %s',
    (_name, cardNo, start, end, delta, column, message) => {
      const found = model(parse(shiftSpan(cardNo, start, end, delta))).diagnostics;
      expect(found).toHaveLength(1);
      expect(found[0]).toMatchObject({ column, message: { text: message } });
    },
  );
});

describe('cycle-probe RPG source deck', () => {
  it('is a valid 80-column Wave-4 specification deck', () => {
    const source = readFileSync('demos/cycle-probe.rpg', 'utf8').trimEnd();
    const cards = source.split('\n');
    const parsed = parse(source);
    const resolved = model(parsed);

    expect(cards.every((card) => [...card].length === 80)).toBe(true);
    expect(parsed.diagnostics).toEqual([]);
    expect(resolved.diagnostics).toEqual([]);
    expect(resolved.model).toBeDefined();
  });
});
