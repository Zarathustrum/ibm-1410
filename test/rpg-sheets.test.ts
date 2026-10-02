import { describe, expect, it } from 'vitest';

import { parseCalcCard } from '../src/rpg/sheets/calc.js';
import { parseControlCard } from '../src/rpg/sheets/control.js';
import { parseDataCard } from '../src/rpg/sheets/data.js';
import { parseFormatCard } from '../src/rpg/sheets/format.js';
import { parseInputCard } from '../src/rpg/sheets/input.js';
import { readSpecSource } from '../src/rpg/sheets/read.js';
import type { SheetKind, SpecCard, SpecRef } from '../src/rpg/types.js';

function ref(sheet: SheetKind, page: string, cardNo: string): SpecRef {
  return { seqno: 1, sheet, page, cardNo };
}

function punched(text: string): SpecCard {
  return text.padEnd(80);
}

describe('RPG specification-source reader', () => {
  it('uses the assembler source-box aliases and keeps invalid content as a diagnosed 80-column card', () => {
    const [line] = readSpecSource('ca+\t(');

    expect(line?.card).toHaveLength(80);
    expect(line?.card.slice(0, 5)).toBe('CA&  ');
    expect(line?.issues).toEqual([
      { column: 4, message: 'a tab is not a punch — write the columns out, or read them off the ruler' },
      { column: 5, message: '"(" is not one of the 64 machine glyphs' },
    ]);
  });

  it('flags the first position beyond the physical card and retains the first 80 columns', () => {
    const [line] = readSpecSource(`C${'A'.repeat(80)}`);

    expect(line?.card).toHaveLength(80);
    expect(line?.issues).toEqual([{ column: 81, message: 'the line is longer than 80 columns' }]);
  });
});

describe('1401/1410 shared X24 sheet parsers', () => {
  it('reads the Input card fields from X24-1336 (J24-0215-2 pp.21-22)', () => {
    const row = parseInputCard(
      punched('CAA  001 CS                              010060300302                      03010'),
      ref('input', '03', '010'),
    );

    expect(row).toMatchObject({
      kind: 'record',
      seq: 'AA',
      number: '',
      optional: false,
      codes: [{ position: '001', not: false, compare: 'C', code: 'S' }],
      resultingCondition: '01',
      controlFields: [{ end: '006', length: '03' }, { end: '003', length: '02' }],
    });
  });

  it('retains a punched Input code even when its position and comparison companions are blank', () => {
    const image = [...punched('CAA')];
    image[10] = 'S';

    const row = parseInputCard(image.join(''), ref('input', '03', '010'));

    expect(row.codes).toEqual([{
      n: 1, position: '', not: false, notMarker: '', compare: '', code: 'S',
    }]);
  });

  it('reads the Data source and numeric flag from X24-1337 (J24-0215-2 pp.26,28)', () => {
    const row = parseDataCard(
      punched('DQTY   005         CAAN019                                                 04030'),
      ref('data', '04', '030'),
    );

    expect(row).toMatchObject({
      name: 'QTY',
      length: '005',
      statuses: [],
      sources: [{
        source: 'CAA', numeric: 'N', end: '019', length: '', operation: '', conditions: [],
      }],
    });
  });

  it('reads the Calculation operation, punches and time from X24-1338 (J24-0215-2 pp.33-34)', () => {
    const row = parseCalcCard(
      punched('ACOMM  014         AMT   008X00005 005?         D0202                      05010'),
      ref('calculation', '05', '010'),
    );

    expect(row).toMatchObject({
      result: 'COMM',
      length: '014',
      factor1: 'AMT',
      factor1Length: '008',
      operation: 'X',
      factor2: '00005',
      factor2Length: '005',
      accumulate: '?',
      conditions: [],
      time: 'D',
      halfAdjust: '02',
      positionAdjust: '02',
    });
  });

  it('reads both halves of X24-1339 without crossing them (J24-0215-2 pp.38-44)', () => {
    const line = parseFormatCard(
      punched('LHA1X  HA2    01    1P                                                     06010'),
      ref('format', '06', '010'),
    );
    const field = parseFormatCard(
      punched('F                           PAGENO067         Z                            06050'),
      ref('format', '06', '050'),
    );

    expect(line).toMatchObject({
      kind: 'line', id: 'HA1', print: 'X', nextLine: 'HA2', skipBefore: '01',
      conditions: [{ not: false, indicator: '1P' }],
    });
    expect(field).toMatchObject({
      kind: 'field', entryKind: 'F', name: 'PAGENO', end: '067', zeroSuppress: 'Z',
      conditions: [],
    });
  });

  it('diagnoses RG body columns 3-75 but does not read or diagnose columns 76-80', () => {
    const at = ref('control', '02', '010');
    const clean = parseControlCard(punched(`RG${' '.repeat(73)}02010`), at);
    const malformed = parseControlCard(punched(`RGX${' '.repeat(72)}02010`), at);

    expect(clean.diagnostics).toEqual([]);
    expect(clean.row).toMatchObject({ kind: 'rg', body: '' });
    expect(malformed.diagnostics).toHaveLength(1);
    expect(malformed.diagnostics[0]).toMatchObject({
      at,
      column: 3,
      severity: 'terminate',
      message: { text: 'EOJ-ERRONEOUS RG CARD', provenance: 'recovered-1410', messageNo: 10805 },
    });
  });
});
