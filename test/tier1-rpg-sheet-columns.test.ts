import { describe, expect, it } from 'vitest';

import {
  cardIdentityOf,
  CALC_COLUMNS,
  CONTROL_COLUMNS,
  DATA_COLUMNS,
  FORMAT_COLUMNS,
  INPUT_COLUMNS,
  valueOf,
} from '../src/rpg/sheets/columns.js';
import { parseCalcCard } from '../src/rpg/sheets/calc.js';
import { parseDataCard } from '../src/rpg/sheets/data.js';
import { parseFormatCard } from '../src/rpg/sheets/format.js';
import { parseInputCard } from '../src/rpg/sheets/input.js';
import type { SpecCard, SpecRef } from '../src/rpg/types.js';

function exactCard(parts: readonly string[]): SpecCard {
  const card = parts.join('');
  expect([...card]).toHaveLength(80);
  return card;
}

function ref(seqno: number, sheet: SpecRef['sheet'], card: SpecCard): SpecRef {
  return { seqno, sheet, ...cardIdentityOf(card) };
}

describe('Tier 1 RPG sheet columns from hand-built 80-column cards', () => {
  it('reads the 1410 RG control card identity without adding cols 76-80 to CONTROL_COLUMNS', () => {
    const card = exactCard([
      'RG',
      'UNSUPPORTED RG BODY MUST BE DIAGNOSED BY THE DECK PARSER'.padEnd(73),
      '02010',
    ]);

    expect(valueOf(card, CONTROL_COLUMNS, 'rg')).toBe('RG');
    expect(valueOf(card, CONTROL_COLUMNS, 'body').trimEnd())
      .toBe('UNSUPPORTED RG BODY MUST BE DIAGNOSED BY THE DECK PARSER');
    expect(CONTROL_COLUMNS.map((field) => field.name)).toEqual(['rg', 'body']);
    expect(cardIdentityOf(card)).toEqual({ page: '02', cardNo: '010' });
  });

  it('parses every Input-specification field from X24-1336, J24-0215-2 p.21', () => {
    const card = exactCard([
      'C', 'AA', 'N', 'X',
      '001', 'N', 'C', 'S',
      '014', ' ', 'D', 'A',
      '027', 'N', 'Z', '5',
      '080', ' ', 'C', ' ',
      '009', 'N', 'D', '0',
      '010', ' ', 'Z', '1',
      '01',
      '073', '06',
      '068', '05',
      '063', '04',
      '058', '03',
      '053', '02',
      '048', '01',
      '  ',
      '03', '010',
    ]);

    expect(valueOf(card, INPUT_COLUMNS, 'recordPosition6')).toBe('010');
    expect(parseInputCard(card, ref(2, 'input', card))).toEqual({
      at: ref(2, 'input', card),
      card,
      kind: 'record',
      seq: 'AA',
      number: 'N',
      option: 'X',
      optional: true,
      codes: [
        { n: 1, position: '001', not: true, notMarker: 'N', compare: 'C', code: 'S' },
        { n: 2, position: '014', not: false, notMarker: '', compare: 'D', code: 'A' },
        { n: 3, position: '027', not: true, notMarker: 'N', compare: 'Z', code: '5' },
        { n: 4, position: '080', not: false, notMarker: '', compare: 'C', code: ' ' },
        { n: 5, position: '009', not: true, notMarker: 'N', compare: 'D', code: '0' },
        { n: 6, position: '010', not: false, notMarker: '', compare: 'Z', code: '1' },
      ],
      resultingCondition: '01',
      controlFields: [
        { n: 1, end: '073', length: '06' },
        { n: 2, end: '068', length: '05' },
        { n: 3, end: '063', length: '04' },
        { n: 4, end: '058', length: '03' },
        { n: 5, end: '053', length: '02' },
        { n: 6, end: '048', length: '01' },
      ],
    });
  });

  it('parses every Data-specification field from X24-1337, J24-0215-2 p.26', () => {
    const card = exactCard([
      'D', 'AMOUNT', '006',
      'B', '11', 'Z', '12', 'P', '13',
      'CAA', 'N', '080', '006', 'A', ' ', '01', 'N', 'F1',
      'PAG', ' ', '   ', '   ', ' ', ' ', '02', 'N', 'LC',
      'SER', ' ', '   ', '   ', 'S', ' ', 'OF', 'N', '03',
      '     ',
      '04', '010',
    ]);

    expect(valueOf(card, DATA_COLUMNS, 'source3Condition2Indicator')).toBe('03');
    expect(parseDataCard(card, ref(3, 'data', card))).toEqual({
      at: ref(3, 'data', card),
      card,
      name: 'AMOUNT',
      length: '006',
      statuses: [
        { status: 'B', condition: '11' },
        { status: 'Z', condition: '12' },
        { status: 'P', condition: '13' },
      ],
      sources: [
        {
          n: 1,
          source: 'CAA',
          numeric: 'N',
          end: '080',
          length: '006',
          operation: 'A',
          conditions: [
            { not: false, notMarker: '', indicator: '01' },
            { not: true, notMarker: 'N', indicator: 'F1' },
          ],
        },
        {
          n: 2,
          source: 'PAG',
          numeric: '',
          end: '',
          length: '',
          operation: '',
          conditions: [
            { not: false, notMarker: '', indicator: '02' },
            { not: true, notMarker: 'N', indicator: 'LC' },
          ],
        },
        {
          n: 3,
          source: 'SER',
          numeric: '',
          end: '',
          length: '',
          operation: 'S',
          conditions: [
            { not: false, notMarker: '', indicator: 'OF' },
            { not: true, notMarker: 'N', indicator: '03' },
          ],
        },
      ],
    });
  });

  it('parses every Calculation-specification field from X24-1338, J24-0215-2 p.33', () => {
    const card = exactCard([
      'A', 'TOTAL ', '008',
      'N', '21', 'P', '22', 'B', '23',
      'AMOUNT', '006',
      '+',
      'TAX   ', '003',
      'A',
      ' ', 'F1', 'N', 'LC', ' ', '01',
      'T',
      '02', '02',
      ''.padEnd(22),
      '05', '010',
    ]);

    expect(valueOf(card, CALC_COLUMNS, 'totalDetail')).toBe('T');
    expect(parseCalcCard(card, ref(4, 'calculation', card))).toEqual({
      at: ref(4, 'calculation', card),
      card,
      result: 'TOTAL',
      length: '008',
      statuses: [
        { status: 'N', condition: '21' },
        { status: 'P', condition: '22' },
        { status: 'B', condition: '23' },
      ],
      factor1: 'AMOUNT',
      factor1Length: '006',
      operation: '+',
      factor2: 'TAX',
      factor2Length: '003',
      accumulate: 'A',
      conditions: [
        { not: false, notMarker: '', indicator: 'F1' },
        { not: true, notMarker: 'N', indicator: 'LC' },
        { not: false, notMarker: '', indicator: '01' },
      ],
      time: 'T',
      halfAdjust: '02',
      positionAdjust: '02',
    });
  });

  it('parses every line half of the Format sheet from X24-1339, J24-0215-2 p.43', () => {
    const card = exactCard([
      'L',
      'HA1', 'X', 'X', ' ', 'HA2',
      '01', '02', '01', '02',
      '4',
      ' ', '1P', 'N', 'OF', ' ', 'F1',
      ''.padEnd(47),
      '06', '010',
    ]);

    expect(valueOf(card, FORMAT_COLUMNS, 'lineSpecificationGroup')).toBe(card.slice(1, 28));
    expect(parseFormatCard(card, ref(5, 'format', card))).toEqual({
      kind: 'line',
      at: ref(5, 'format', card),
      card,
      id: 'HA1',
      print: 'X',
      punch: 'X',
      reserved: '',
      nextLine: 'HA2',
      spaceBefore: '01',
      spaceAfter: '02',
      skipBefore: '01',
      skipAfter: '02',
      stacker: '4',
      conditions: [
        { not: false, notMarker: '', indicator: '1P' },
        { not: true, notMarker: 'N', indicator: 'OF' },
        { not: false, notMarker: '', indicator: 'F1' },
      ],
    });
  });

  it('parses every field half of the Format sheet from X24-1339, J24-0215-2 p.44', () => {
    const card = exactCard([
      'F',
      ''.padEnd(27),
      'AMOUNT', '132',
      ' ', 'F1', 'N', 'LC', ' ', '01',
      'Z',
      '010',
      '  $,$$0.00'.padEnd(25),
      '06', '020',
    ]);

    expect(valueOf(card, FORMAT_COLUMNS, 'fieldSpecificationGroup')).toBe(card.slice(28, 75));
    expect(parseFormatCard(card, ref(6, 'format', card))).toEqual({
      kind: 'field',
      at: ref(6, 'format', card),
      card,
      entryKind: 'F',
      name: 'AMOUNT',
      end: '132',
      conditions: [
        { not: false, notMarker: '', indicator: 'F1' },
        { not: true, notMarker: 'N', indicator: 'LC' },
        { not: false, notMarker: '', indicator: '01' },
      ],
      zeroSuppress: 'Z',
      length: '010',
      literal: '  $,$$0.00',
    });
  });
});
