import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../src/rpg/deck.js';
import {
  EDIT_WORD_IS_THE_1410_MCE_CONTROL_WORD,
  model,
  SER_AND_RCT_ARE_THE_SERIAL_AND_RECORD_COUNTERS,
} from '../src/rpg/model.js';
import type { RpgDiagnostic } from '../src/rpg/types.js';
import { SALES_SUMMARY_MODEL } from './fixtures/sales-summary.model.js';

const SALES = readFileSync('demos/sales-summary.rpg', 'utf8').trimEnd();
const CYCLE_PROBE = readFileSync('demos/cycle-probe.rpg', 'utf8').trimEnd();

function equalIgnoringAt(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length
      && a.every((value, index) => equalIgnoringAt(value, b[index]));
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  const aEntries = Object.entries(a).filter(([key]) => key !== 'at');
  const bEntries = Object.entries(b).filter(([key]) => key !== 'at');
  if (aEntries.length !== bEntries.length) return false;
  const bObject = b as Record<string, unknown>;
  return aEntries.every(([key, value]) => Object.hasOwn(bObject, key) && equalIgnoringAt(value, bObject[key]));
}

function setColumns(line: string, column: number, width: number, text: string): string {
  const chars = [...line.padEnd(80)];
  for (let index = 0; index < width; index++) chars[column - 1 + index] = ' ';
  for (let index = 0; index < text.length && index < width; index++) chars[column - 1 + index] = text[index] ?? ' ';
  return chars.join('');
}

function edit(source: string, cardNo: string, column: number, width: number, text: string): string {
  return source.split('\n')
    .map((line) => line.endsWith(cardNo) ? setColumns(line, column, width, text) : line)
    .join('\n');
}

function mutate(cardNo: string, column: number, width: number, text: string): string {
  return edit(SALES, cardNo, column, width, text);
}

function mutatedLine(cardNo: string, edits: readonly (readonly [number, number, string])[]): string {
  const original = SALES.split('\n').find((line) => line.endsWith(cardNo));
  if (original === undefined) throw new Error(`test fixture has no card ${cardNo}`);
  return edits.reduce((line, [column, width, text]) => setColumns(line, column, width, text), original);
}

function insertBefore(cardNo: string, ...cards: readonly string[]): string {
  const lines = SALES.split('\n');
  const index = lines.findIndex((line) => line.endsWith(cardNo));
  if (index < 0) throw new Error(`test fixture has no card ${cardNo}`);
  lines.splice(index, 0, ...cards);
  return lines.join('\n');
}

function append(...cards: readonly string[]): string {
  return [...SALES.split('\n'), ...cards].join('\n');
}

function insertInto(source: string, cardNo: string, ...cards: readonly string[]): string {
  const lines = source.split('\n');
  const index = lines.findIndex((line) => line.endsWith(cardNo));
  if (index < 0) throw new Error(`test fixture has no card ${cardNo}`);
  lines.splice(index, 0, ...cards);
  return lines.join('\n');
}

function sequenceFieldLine(cardNo: string): string {
  return setColumns(setColumns('', 1, 4, 'SCF1'), 76, 5, `03${cardNo}`);
}

function inputRecordLine(seq: string, number: string, condition: string, cardNo: string): string {
  return mutatedLine('03010', [
    [2, 2, seq],
    [4, 1, number],
    [42, 2, condition],
    [78, 3, cardNo],
  ]);
}

function numericSales(seq = '01', number = '1', option = ''): string {
  let source = edit(SALES, '03010', 2, 2, seq);
  source = edit(source, '03010', 4, 1, number);
  source = edit(source, '03010', 5, 1, option);
  for (const cardNo of ['04010', '04020', '04030', '04040']) {
    source = edit(source, cardNo, 20, 3, `C${seq}`);
  }
  return source;
}

function diagnostics(source: string): readonly RpgDiagnostic[] {
  return model(parse(source)).diagnostics;
}

function oneDiagnostic(source: string, text: string, column?: number): void {
  const found = diagnostics(source);
  expect(found).toHaveLength(1);
  expect(found[0]?.message.text).toBe(text);
  if (column !== undefined) expect(found[0]?.column).toBe(column);
}

const extraData = (name: string, cardNo: string): string => mutatedLine('04010', [
  [2, 6, name],
  [78, 3, cardNo],
]);

describe('RPG model resolution', () => {
  it('deep-equals the Wave 2 sales-summary fixture modulo recursive at references', () => {
    const result = model(parse(SALES));

    expect(result.diagnostics).toEqual([]);
    expect(equalIgnoringAt(result.model, SALES_SUMMARY_MODEL)).toBe(true);
  });

  it('allocates the latches and generated control-level indicators the cycle emits', () => {
    const result = model(parse(CYCLE_PROBE));

    expect(result.diagnostics).toEqual([]);
    expect(result.model?.indicators).toEqual(expect.arrayContaining(['F1', 'F2', 'OF', 'LC', 'PRIME']));
  });

  it('asserts the recursive at-stripping comparator on nested arrays and objects', () => {
    const left = {
      at: { seqno: 1 },
      nested: [{ value: 1, at: { seqno: 2 } }],
    };
    expect(equalIgnoringAt(left, { nested: [{ value: 1 }] })).toBe(true);
    expect(equalIgnoringAt(left, { nested: [{ value: 2 }] })).toBe(false);
  });

  it('resolves Cxx against Input columns 1-3, not the resulting condition', () => {
    expect(model(parse(SALES)).model?.fields.map((field) => field.sources[0]?.recordType))
      .toEqual(['CAA', 'CAA', 'CAA', 'CAA', undefined]);

    oneDiagnostic(mutate('04010', 20, 3, 'C01'), 'Cxx field source C01 names no Input record type');
  });

  it('keeps the two plan-named Format ordering checks as focused unit cases', () => {
    const wFirst = insertBefore('06010', mutatedLine('07180', [[78, 3, '001']]));
    oneDiagnostic(wFirst, 'a W entry may appear anywhere except first');
    oneDiagnostic(mutate('06010', 8, 3, 'HB2'), 'Next Line HB2 does not match HA', 8);
  });

  it('requires a line reached as Next Line to leave its own output conditions blank', () => {
    oneDiagnostic(
      mutate('06060', 20, 3, ' 01'),
      'Next Line target HA2 must leave output conditions blank',
      20,
    );
  });

  it('requires the one mandated PAGENO field', () => {
    const withoutPage = SALES.split('\n')
      .filter((line) => !line.endsWith('04050') && !line.endsWith('06050') && !line.endsWith('06160'))
      .join('\n');

    oneDiagnostic(withoutPage, 'PAGENO must be defined exactly once; found 0');
  });

  it('checks the 1410 MCE edit-body capacity, not just WORDxx existence', () => {
    expect(EDIT_WORD_IS_THE_1410_MCE_CONTROL_WORD).toBe(true);
    oneDiagnostic(
      mutate('07180', 51, 10, '$$$$$$$$$$'),
      'edit word WORD01 has 0 digit positions for field AMT width 8',
    );
  });

  it('rejects mixed Input sequence characters without changing the Cxx referent test', () => {
    let source = edit(SALES, '03010', 2, 2, 'A1');
    for (const cardNo of ['04010', '04020', '04030', '04040']) {
      source = edit(source, cardNo, 20, 3, 'CA1');
    }
    oneDiagnostic(source, 'Input sequence A1 must be two digits or two alphabetic characters', 2);
  });

  it('diagnoses an Input code whose required position and comparison companions are blank', () => {
    const found = diagnostics(mutate('03010', 6, 5, ''));

    expect(found.map((entry) => ({ column: entry.column, text: entry.message.text }))).toEqual([
      { column: 6, text: 'non-numeric character in a position field' },
      { column: 10, text: 'record comparison blank is not Z, D, or C' },
    ]);
  });

  it('requires numeric Input sequences to ascend uniquely and end in exactly one SCF line', () => {
    oneDiagnostic(numericSales(), 'numeric Input sequence specifications require one trailing SCF line');

    const valid = insertInto(numericSales(), '04010', sequenceFieldLine('020'));
    expect(diagnostics(valid)).toEqual([]);

    let descending = numericSales('02');
    descending = insertInto(descending, '04010',
      inputRecordLine('01', '1', '02', '020'), sequenceFieldLine('030'));
    oneDiagnostic(descending, 'numeric Input sequence 01 must be greater than the preceding 02', 2);

    let duplicate = numericSales();
    duplicate = insertInto(duplicate, '04010',
      inputRecordLine('01', '1', '02', '020'), sequenceFieldLine('030'));
    oneDiagnostic(duplicate, 'Input sequence 01 is defined more than once', 2);

    const duplicateScf = insertInto(numericSales(), '04010',
      sequenceFieldLine('020'), sequenceFieldLine('030'));
    oneDiagnostic(duplicateScf, 'Input specifications permit exactly one SCF line');

    const recordAfterScf = insertInto(numericSales(), '04010',
      sequenceFieldLine('020'), inputRecordLine('02', '1', '02', '030'));
    oneDiagnostic(recordAfterScf, 'Input record specification appears after the SCF line');
  });

  it('couples Input Number and Option to numeric sequencing', () => {
    oneDiagnostic(mutate('03010', 4, 1, '1'),
      'non-sequential Input sequence AA must leave Number blank', 4);
    oneDiagnostic(mutate('03010', 5, 1, 'X'),
      'non-sequential Input sequence AA must leave Option blank', 5);

    const missingNumber = insertInto(numericSales('01', ''), '04010', sequenceFieldLine('020'));
    oneDiagnostic(missingNumber, 'numeric Input sequence 01 requires Number 1 or N', 4);

    const optionalNumeric = insertInto(numericSales('01', '1', 'X'), '04010', sequenceFieldLine('020'));
    expect(diagnostics(optionalNumeric)).toEqual([]);

    const unneededScf = insertBefore('04010', sequenceFieldLine('020'));
    oneDiagnostic(unneededScf, 'SCF requires numeric Input sequence specifications');
  });

  it('rejects undefined and forward numeric condition references', () => {
    oneDiagnostic(mutate('06010', 20, 3, ' 99'),
      'condition 99 has not been defined by an earlier specification');

    let forward = edit(SALES, '05010', 40, 3, ' 99');
    forward = edit(forward, '05020', 11, 3, 'B99');
    oneDiagnostic(forward, 'condition 99 has not been defined by an earlier specification');
  });

  it('does not let a blank-result compare inherit the preceding calculation result', () => {
    const compare = mutatedLine('05020', [
      [2, 9, ''],
      [29, 1, 'C'],
      [39, 1, ''],
      [78, 3, '080'],
    ]);
    const source = insertBefore('06010', compare);
    const result = model(parse(source));
    const step = result.model?.calcs.at(-1);

    expect(result.diagnostics).toEqual([]);
    expect(step).toMatchObject({ op: 'C' });
    expect(step).not.toHaveProperty('result');
  });

  it('requires positions only on record sources and refuses them on counters', () => {
    oneDiagnostic(mutate('04010', 24, 3, ''),
      'record field source CAA requires a field-end position', 24);

    let page = edit(SALES, '04050', 24, 3, '001');
    page = edit(page, '04050', 27, 3, '003');
    oneDiagnostic(page, 'PAG field source must leave field-end and source-length blank', 24);
  });

  it('keeps record sources within the card image to the left of their end position', () => {
    oneDiagnostic(
      mutate('04010', 24, 3, '002'),
      'record source length 3 exceeds field-end position 2',
      27,
    );
    oneDiagnostic(
      mutate('04010', 27, 3, '000'),
      'Data source length must be positive',
      27,
    );
  });

  it('normalises numeric Calculation literals to their declared widths and rejects overflow', () => {
    const padded = model(parse(mutate('05010', 30, 6, '5')));

    expect(padded.diagnostics).toEqual([]);
    expect(padded.model?.calcs[0]?.factor2).toEqual({ text: '00005', length: 5 });

    let oversized = mutate('05010', 30, 6, '123');
    oversized = edit(oversized, '05010', 36, 3, '002');
    oneDiagnostic(oversized, 'numeric Calculation factor 123 exceeds declared length 2');

    oneDiagnostic(
      mutate('05010', 36, 3, '000'),
      'Calculation factor length must be positive',
      36,
    );
  });

  it('enforces the documented minimum result width for divide', () => {
    let source = mutate('05010', 8, 3, '005');
    source = edit(source, '05010', 29, 1, '/');

    oneDiagnostic(source, 'divide result length 5 is below the required minimum 6');
  });

  it.each(['SER', 'RCT'])('takes the documented unsupported fallback for %s', (source) => {
    expect(SER_AND_RCT_ARE_THE_SERIAL_AND_RECORD_COUNTERS).toBe(false);
    oneDiagnostic(
      mutate('04050', 20, 3, source),
      'unsupported: SER / RCT semantics require C28-1443',
      20,
    );
  });

  const malformed: readonly (readonly [name: string, source: string, message: string, column?: number])[] = [
    ['undefined field name', mutate('06240', 29, 6, 'NOPE'), 'undefined field name NOPE'],
    ['resulting condition collision', mutate('04010', 11, 3, 'B01'),
      'resulting condition 01 is defined on both input and data sheets'],
    ['K with name', mutate('06020', 29, 6, 'BAD'), 'K entries must leave field-name columns 29-34 blank'],
    ['W not WORDxx', append(mutatedLine('07180', [[29, 6, 'BAD'], [78, 3, '201']])),
      'W entries must be named WORDxx'],
    ['field before line', insertBefore('06010', mutatedLine('06240', [[78, 3, '001']])),
      'field entry appears before its line entry'],
    ['first Format entry not L', insertBefore('06010', mutatedLine('06020', [[78, 3, '001']])),
      'the first Format entry must be an L line entry'],
    ['ascending numeric heading levels', insertBefore(
      '06010',
      mutatedLine('06010', [[2, 3, 'H21'], [8, 3, ''], [15, 2, ''], [20, 3, ''], [78, 3, '001']]),
      mutatedLine('06010', [[2, 3, 'H31'], [8, 3, ''], [15, 2, ''], [20, 3, ''], [78, 3, '002']]),
    ), 'heading lines must appear in descending numeric level order'],
    ['Next Line columns mismatch', mutate('06010', 8, 3, 'HB2'), 'Next Line HB2 does not match HA', 8],
    ['SB condition', mutate('06010', 20, 3, ' SB'),
      'SB sense-switch conditions are 1401-only (A22-0526-3 pp.56-58)'],
    ['stacker col 19', mutate('06010', 19, 1, '4'),
      'unsupported: Format col 19 punch stacker is out of scope for Phase 5', 19],
    ['record position above 80', mutate('04010', 24, 3, '081'),
      'record position 81 is above the 80-column card image', 24],
    ['non-numeric position', mutate('04010', 24, 3, '0A1'), 'non-numeric character in a position field', 24],
    ['blank Calculation col 49', mutate('05010', 49, 1, ' '), 'Calculation column 49 must be T or D', 49],
    ['unconditional total line', mutate('07030', 20, 9, ' '),
      'total line has no output condition in columns 20-28'],
    ['reserved EOJ field', insertBefore('05010', extraData('EOJ', '060')),
      'field name EOJ collides with a generated reserved name'],
    ['duplicate PAGENO', insertBefore('05010', mutatedLine('04050', [[78, 3, '060']])),
      'PAGENO must be defined exactly once; found 2'],
    ['digit in Data name', insertBefore('05010', extraData('D1PT', '060')),
      'Data field name D1PT must be alphabetic', 2],
    ['partial OF or-group', append(mutatedLine('06010', [[8, 3, ''], [20, 3, ' OF'], [78, 3, '210']])),
      'OF may participate in an or-group only if it is part of every alternative'],
    ['unresolved Cxx', mutate('04010', 20, 3, 'CZZ'), 'Cxx field source CZZ names no Input record type'],
    ['undersized multiply result', mutate('05010', 8, 3, '010'),
      'multiply result length 10 is below the required minimum 11'],
  ];

  const malformedCases = malformed.map((entry) => ({
    name: entry[0],
    source: entry[1],
    message: entry[2],
    column: entry[3],
  }));

  it.each(malformedCases)('diagnoses exactly one malformed deck: $name', ({ source, message, column }) => {
    oneDiagnostic(source, message, column);
  });
});
