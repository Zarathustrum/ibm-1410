import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  CALC_COLUMNS,
  CONTROL_COLUMNS,
  DATA_COLUMNS,
  FORMAT_COLUMNS,
  INPUT_COLUMNS,
} from '../src/rpg/sheets/columns.js';
import type { SheetField } from '../src/rpg/types.js';

/*
 * This is the plan §7.2 diff, not a second hand transcription. It slices the
 * `| Cols | Name | Content |` tables from rpg-sources.md §§6.1-6.4, expands
 * their five published shapes, and compares the result against columns.ts in
 * both directions. §6.5 is explicitly excluded: it is the superseded 1401
 * CNTL card, while the 1410 control card is the RG/body pair cited to §5.
 */

type SheetName = 'input' | 'data' | 'calculation' | 'format';
type Cols = readonly [number, number];

interface ResearchRow {
  readonly section: string;
  readonly cols: string;
  readonly name: string;
  readonly sourceKey?: string;
}

interface ExpectedField {
  readonly sheet: SheetName;
  readonly name: string;
  readonly cols: Cols;
  readonly cite: string;
  readonly inScope: boolean;
  readonly why?: string;
  readonly rowKey: string;
}

const RESEARCH = readFileSync('docs/research/rpg-sources.md', 'utf8');
const ROWS = new Map<string, ResearchRow>();

for (const section of ['6.1', '6.2', '6.3', '6.4'] as const) {
  for (const row of tableRows(section)) {
    ROWS.set(rowKey(row), row);
  }
}

const EXPECTED: readonly ExpectedField[] = [
  ...inputFields(),
  ...dataFields(),
  ...calcFields(),
  ...formatFields(),
];

describe('RPG sheet columns vs rpg-sources.md §6.1-§6.4 (plan §7.2)', () => {
  it('implements every expanded research span exactly once and adds no uncited span', () => {
    const actual = [
      ...actualFields('input', INPUT_COLUMNS),
      ...actualFields('data', DATA_COLUMNS),
      ...actualFields('calculation', CALC_COLUMNS),
      ...actualFields('format', FORMAT_COLUMNS),
    ];

    expect(sorted(actual)).toEqual(sorted(EXPECTED.map(({ rowKey: _rowKey, ...field }) => field)));
  });

  it('accounts for every §6.1-§6.4 table row under the published expansion rule', () => {
    const consumed = new Set(EXPECTED.map((field) => field.rowKey));
    const unaccounted = [...ROWS.keys()].filter((key) => !consumed.has(key));

    expect(unaccounted).toEqual([]);
  });

  it('keeps §6.5 fully exempt and keeps the 1410 RG card cited to §5', () => {
    expect(EXPECTED.some((field) => field.cite.includes('§6.5'))).toBe(false);
    expect(CONTROL_COLUMNS).toEqual([
      {
        name: 'rg',
        cols: [1, 2],
        cite: 'rpg-sources.md §5, 1410 RG control card messages',
        inScope: true,
      },
      {
        name: 'body',
        cols: [3, 75],
        cite: 'rpg-sources.md §5, 1410 control card differs from §6.5',
        inScope: false,
        why: 'unsupported: the RG card column layout is not recovered',
      },
    ]);
  });
});

function inputFields(): readonly ExpectedField[] {
  const fields: ExpectedField[] = [
    expected('input', 'c', [1, 1], row('6.1', '1', 'C')),
    expected('input', 'seq', [2, 3], row('6.1', '2-3', 'Seq')),
    expected('input', 'number', [4, 4], row('6.1', '4', 'Number')),
    expected('input', 'option', [5, 5], row('6.1', '5', 'Option')),
    expected('input', 'recordPosition1', [6, 8], row('6.1', '6-8', 'Position')),
    expected('input', 'recordNot1', [9, 9], row('6.1', '9', 'Not')),
    expected('input', 'recordCompare1', [10, 10], row('6.1', '10', 'Z/D/C')),
    expected('input', 'recordCode1', [11, 11], row('6.1', '11', 'Code')),
  ];

  const recordRows = spans(row('6.1', '12-17, 18-23, 24-29, 30-35, 36-41', 'Record codes 2-6'));
  for (const [index, span] of recordRows.entries()) {
    const n = index + 2;
    fields.push(
      expected('input', `recordPosition${n}`, [span[0], span[0] + 2], rowForSpan('6.1', span, 'Record codes 2-6')),
      expected('input', `recordNot${n}`, [span[0] + 3, span[0] + 3], rowForSpan('6.1', span, 'Record codes 2-6')),
      expected('input', `recordCompare${n}`, [span[0] + 4, span[0] + 4], rowForSpan('6.1', span, 'Record codes 2-6')),
      expected('input', `recordCode${n}`, [span[1], span[1]], rowForSpan('6.1', span, 'Record codes 2-6')),
    );
  }

  fields.push(
    expected('input', 'resultingCondition', [42, 43], row('6.1', '42-43', 'Resulting Condition')),
    expected('input', 'controlFieldEnd1', [44, 46], row('6.1', '44-46', 'Field End')),
    expected('input', 'controlFieldLength1', [47, 48], row('6.1', '47-48', 'Field Length')),
  );

  const controlRows = spans(row('6.1', '49-53, 54-58, 59-63, 64-68, 69-73', 'Control fields 2-6'));
  for (const [index, span] of controlRows.entries()) {
    const n = index + 2;
    fields.push(
      expected('input', `controlFieldEnd${n}`, [span[0], span[0] + 2], rowForSpan('6.1', span, 'Control fields 2-6')),
      expected('input', `controlFieldLength${n}`, [span[0] + 3, span[1]], rowForSpan('6.1', span, 'Control fields 2-6')),
    );
  }

  fields.push(
    expected('input', 'unused', [74, 75], row('6.1', '74-75', '—'), false, 'not used'),
    expected('input', 'page', [76, 77], row('6.1', '76-77', 'Page')),
    expected('input', 'cardNumber', [78, 80], row('6.1', '78-80', 'Card Number')),
  );
  return fields;
}

function dataFields(): readonly ExpectedField[] {
  return [
    expected('data', 'd', [1, 1], row('6.2', '1', 'D')),
    expected('data', 'fieldName', [2, 7], row('6.2', '2-7', 'Field Name')),
    expected('data', 'fieldLength', [8, 10], row('6.2', '8-10', 'Field Length')),
    expected('data', 'status1', [11, 11], row('6.2', '11, 14, 17', 'Status')),
    expected('data', 'resultingCondition1', [12, 13], row('6.2', '12-13, 15-16, 18-19', 'Resulting Condition')),
    expected('data', 'status2', [14, 14], row('6.2', '11, 14, 17', 'Status')),
    expected('data', 'resultingCondition2', [15, 16], row('6.2', '12-13, 15-16, 18-19', 'Resulting Condition')),
    expected('data', 'status3', [17, 17], row('6.2', '11, 14, 17', 'Status')),
    expected('data', 'resultingCondition3', [18, 19], row('6.2', '12-13, 15-16, 18-19', 'Resulting Condition')),
    expected('data', 'firstSourceGroup', [20, 36], row('6.2', '20-36', 'First field source')),
    ...sourceFields('data', 1, [20, 36], '6.2', '20-36', 'First field source'),
    ...sourceFields('data', 2, [37, 53], '6.2', '37-53', 'Second source'),
    ...sourceFields('data', 3, [54, 70], '6.2', '54-70', 'Third source'),
    expected('data', 'unused', [71, 75], row('6.2', '71-75', '—'), false, 'not used'),
    expected('data', 'page', [76, 77], row('6.2', '76-77', 'Page')),
    expected('data', 'cardNumber', [78, 80], row('6.2', '78-80', 'Card Number')),
  ];
}

function calcFields(): readonly ExpectedField[] {
  return [
    expected('calculation', 'a', [1, 1], row('6.3', '1', 'A')),
    expected('calculation', 'fieldName', [2, 7], row('6.3', '2-7', 'Field Name')),
    expected('calculation', 'fieldLength', [8, 10], row('6.3', '8-10', 'Field Length')),
    expected('calculation', 'status1', [11, 11], row('6.3', '11, 14, 17', 'Status')),
    expected('calculation', 'resultingCondition1', [12, 13], row('6.3', '12-13, 15-16, 18-19', 'Resulting Condition')),
    expected('calculation', 'status2', [14, 14], row('6.3', '11, 14, 17', 'Status')),
    expected('calculation', 'resultingCondition2', [15, 16], row('6.3', '12-13, 15-16, 18-19', 'Resulting Condition')),
    expected('calculation', 'status3', [17, 17], row('6.3', '11, 14, 17', 'Status')),
    expected('calculation', 'resultingCondition3', [18, 19], row('6.3', '12-13, 15-16, 18-19', 'Resulting Condition')),
    expected('calculation', 'factor1', [20, 25], row('6.3', '20-25', 'Factor 1')),
    expected('calculation', 'factor1Length', [26, 28], row('6.3', '26-28', 'Length')),
    expected('calculation', 'op', [29, 29], row('6.3', '29', 'OP')),
    expected('calculation', 'factor2', [30, 35], row('6.3', '30-35', 'Factor 2')),
    expected('calculation', 'factor2Length', [36, 38], row('6.3', '36-38', 'Length')),
    expected('calculation', 'accumulate', [39, 39], row('6.3', '39', 'A/S/0+/0-')),
    ...conditionFields('calculation', '', spans(row('6.3', '40-42, 43-45, 46-48', 'Condition')), '6.3', 'Condition'),
    expected('calculation', 'totalDetail', [49, 49], row('6.3', '49', 'Total/Detail')),
    expected('calculation', 'halfAdjust', [50, 51], row('6.3', '50-51', 'Half Adjust')),
    expected('calculation', 'positionAdjust', [52, 53], row('6.3', '52-53', 'Position Adjust')),
    expected('calculation', 'unused', [54, 75], row('6.3', '54-75', '—'), false, 'not used'),
    expected('calculation', 'page', [76, 77], row('6.3', '76-77', 'Page')),
    expected('calculation', 'cardNumber', [78, 80], row('6.3', '78-80', 'Card Number')),
  ];
}

function formatFields(): readonly ExpectedField[] {
  return [
    expected('format', 'format', [1, 1], row('6.4', '1', 'Format')),
    expected('format', 'lineSpecificationGroup', [2, 28], row('6.4', '2-28', 'Line specification')),
    expected('format', 'line', [2, 4], row('6.4', '2-4', 'Line')),
    expected('format', 'print', [5, 5], row('6.4', '5', 'Print')),
    expected('format', 'punch', [6, 6], row('6.4', '6', 'Punch'), false, 'punch output is out of scope for Phase 5'),
    expected('format', 'reserved', [7, 7], row('6.4', '7', 'Reserved'), false, 'magnetic-tape output is out of scope'),
    expected('format', 'nextLine', [8, 10], row('6.4', '8-10', 'Next Line')),
    expected('format', 'spaceBefore', [11, 12], row('6.4', '11-12', 'Space Before')),
    expected('format', 'spaceAfter', [13, 14], row('6.4', '13-14', 'Space After')),
    expected('format', 'skipBefore', [15, 16], row('6.4', '15-16', 'Skip Before')),
    expected('format', 'skipAfter', [17, 18], row('6.4', '17-18', 'Skip After')),
    expected('format', 'stacker', [19, 19], row('6.4', '19', 'Stacker'), false, 'punch stacker selection is out of scope for Phase 5'),
    ...conditionFields('format', 'line', [span('20-22')], '6.4', 'Line Output Condition'),
    ...conditionFields('format', 'line', spans(row('6.4', '23-25, 26-28', 'Conditions 2, 3')), '6.4', 'Conditions 2, 3', 2),
    expected('format', 'fieldSpecificationGroup', [29, 75], row('6.4', '29-75', 'Field specification')),
    expected('format', 'fieldName', [29, 34], row('6.4', '29-34', 'Field Name')),
    expected('format', 'fieldEnd', [35, 37], row('6.4', '35-37', 'Field End')),
    ...conditionFields('format', 'field', [span('38-40')], '6.4', 'Field Output Condition'),
    ...conditionFields('format', 'field', spans(row('6.4', '41-43, 44-46', 'Conditions 2, 3')), '6.4', 'Conditions 2, 3', 2),
    expected('format', 'zeroSuppress', [47, 47], row('6.4', '47', 'Zero Suppress')),
    expected('format', 'fieldLength', [48, 50], row('6.4', '48-50', 'Field Length')),
    expected('format', 'constantOrEditControlWord', [51, 75], row('6.4', '51-75', 'Constant or Edit Control Word')),
    expected('format', 'page', [76, 77], row('6.4', '76-77', 'Page')),
    expected('format', 'cardNumber', [78, 80], row('6.4', '78-80', 'Card Number')),
  ];
}

function sourceFields(
  sheet: SheetName,
  n: number,
  sourceSpan: Cols,
  section: string,
  rowCols: string,
  rowName: string,
): readonly ExpectedField[] {
  const sourceRow = row(section, rowCols, rowName);
  const fieldSourceRow = n === 1 ? row(section, '20-22', 'Field Source') : sourceRow;
  const numericRow = n === 1 ? row(section, '23', 'Numeric') : sourceRow;
  const fieldEndRow = n === 1 ? row(section, '24-26', 'Field End') : sourceRow;
  const fieldLengthRow = n === 1 ? row(section, '27-29', 'Field Length') : sourceRow;
  const operationRow = n === 1 ? row(section, '30', 'Operation') : sourceRow;
  const condition1Row = n === 1 ? row(section, '31-33', 'Cond.') : sourceRow;
  const condition2Row = n === 1 ? row(section, '34-36', 'Cond.') : sourceRow;
  return [
    expected(sheet, `source${n}FieldSource`, [sourceSpan[0], sourceSpan[0] + 2], fieldSourceRow),
    expected(sheet, `source${n}Numeric`, [sourceSpan[0] + 3, sourceSpan[0] + 3], numericRow),
    expected(sheet, `source${n}FieldEnd`, [sourceSpan[0] + 4, sourceSpan[0] + 6], fieldEndRow),
    expected(sheet, `source${n}FieldLength`, [sourceSpan[0] + 7, sourceSpan[0] + 9], fieldLengthRow),
    expected(sheet, `source${n}Operation`, [sourceSpan[0] + 10, sourceSpan[0] + 10], operationRow),
    expected(sheet, `source${n}Condition1Not`, [sourceSpan[0] + 11, sourceSpan[0] + 11], condition1Row),
    expected(sheet, `source${n}Condition1Indicator`, [sourceSpan[0] + 12, sourceSpan[0] + 13], condition1Row),
    expected(sheet, `source${n}Condition2Not`, [sourceSpan[0] + 14, sourceSpan[0] + 14], condition2Row),
    expected(sheet, `source${n}Condition2Indicator`, [sourceSpan[0] + 15, sourceSpan[1]], condition2Row),
  ];
}

function conditionFields(
  sheet: SheetName,
  prefix: string,
  conditionSpans: readonly Cols[],
  section: string,
  rowName: string,
  firstIndex = 1,
): readonly ExpectedField[] {
  return conditionSpans.flatMap((conditionSpan, index) => {
    const n = firstIndex + index;
    const base = prefix === '' ? `condition${n}` : `${prefix}Condition${n}`;
    const sourceRow = rowForSpan(section, conditionSpan, rowName);
    return [
      expected(sheet, `${base}Not`, [conditionSpan[0], conditionSpan[0]], sourceRow),
      expected(sheet, `${base}Indicator`, [conditionSpan[0] + 1, conditionSpan[1]], sourceRow),
    ];
  });
}

function actualFields(sheet: SheetName, fields: readonly SheetField[]) {
  return fields.map(({ name, cols, cite, inScope, why }) => ({
    sheet,
    name,
    cols,
    cite,
    inScope,
    ...(why === undefined ? {} : { why }),
  }));
}

function expected(
  sheet: SheetName,
  name: string,
  cols: Cols,
  sourceRow: ResearchRow,
  inScope = true,
  why?: string,
): ExpectedField {
  return {
    sheet,
    name,
    cols,
    cite: `rpg-sources.md §${sourceRow.section} cols ${colsText(sourceRow, cols)}`,
    inScope,
    ...(why === undefined ? {} : { why }),
    rowKey: rowKey(sourceRow),
  };
}

function tableRows(section: string): readonly ResearchRow[] {
  const body = sectionBody(section);
  return body
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .filter((line) => !line.includes('|---'))
    .slice(1)
    .map((line) => {
      const [_empty, cols, name] = line.split('|');
      if (cols === undefined || name === undefined) throw new Error(`bad markdown row: ${line}`);
      return { section, cols: clean(cols), name: clean(name) };
    });
}

function sectionBody(section: string): string {
  const start = RESEARCH.indexOf(`### ${section} `);
  if (start === -1) throw new Error(`missing section ${section}`);
  const next = RESEARCH.indexOf('\n### ', start + 1);
  return RESEARCH.slice(start, next === -1 ? RESEARCH.length : next);
}

function row(section: string, cols: string, name: string): ResearchRow {
  const key = rowKey({ section, cols, name });
  const found = ROWS.get(key);
  if (found === undefined) throw new Error(`missing research row: ${key}`);
  return found;
}

function rowForSpan(section: string, sourceSpan: Cols, name: string): ResearchRow {
  const matching = [...ROWS.values()].find((candidate) => (
    candidate.section === section
    && candidate.name === name
    && spans(candidate).some((candidateSpan) => sameCols(candidateSpan, sourceSpan))
  ));
  if (matching === undefined) {
    throw new Error(`missing research row in §${section} for ${sourceSpan.join('-')} | ${name}`);
  }
  return { ...matching, cols: formatCols(sourceSpan), sourceKey: rowKey(matching) };
}

function spans(source: ResearchRow): readonly Cols[] {
  return source.cols.split(',').map((part) => span(part.trim()));
}

function span(text: string): Cols {
  const parts = text.split('-');
  const startText = parts[0];
  if (startText === undefined) throw new Error(`bad span: ${text}`);
  const start = Number(startText);
  const endText = parts[1];
  const end = endText === undefined ? undefined : Number(endText);
  if (!Number.isInteger(start)) throw new Error(`bad span: ${text}`);
  if (end !== undefined && !Number.isInteger(end)) throw new Error(`bad span: ${text}`);
  return [start, end ?? start];
}

function colsText(source: ResearchRow, actual: Cols): string {
  const parsed = spans(source);
  return parsed.some((candidate) => sameCols(candidate, actual)) ? formatCols(actual) : source.cols;
}

function rowKey(source: Pick<ResearchRow, 'section' | 'cols' | 'name' | 'sourceKey'>): string {
  if (source.sourceKey !== undefined) return source.sourceKey;
  return `${source.section}|${source.cols}|${source.name}`;
}

function sameCols(a: Cols, b: Cols): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function formatCols(cols: Cols): string {
  return cols[0] === cols[1] ? String(cols[0]) : cols.join('-');
}

function clean(cell: string): string {
  return cell.trim().replace(/\*\*/g, '');
}

function sorted<T extends object>(values: readonly T[]): readonly T[] {
  return [...values].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
