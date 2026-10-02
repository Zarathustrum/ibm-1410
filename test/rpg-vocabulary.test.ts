// Tier 0 — the shared-sheet vocabulary is a two-way partition, not a list of
// tokens remembered from a later RPG. The recovered PR-108 phase names are
// Input/Data/Calculation/Format/Edit — explicitly not RPG II's File
// Description/Input/Calculation/Output-Format set (rpg-sources.md §4.3,
// [verified]). Every accepted token below comes from §6, or is a named refusal
// with a reason. The test derives the in-scope side from the research tables so
// deleting or inventing a token fails in either direction.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../src/rpg/deck.js';
import { RPG_RESERVED_NAMES } from '../src/rpg/messages.js';
import {
  CONDITION_VOCABULARY,
  CXX_NAMES_THE_RECORD_TYPE_BY_INPUT_COLS_1_TO_3,
  GENERATED_RESERVED_NAMES,
  HL_STATUSES_NEED_NO_SPECIAL_FEATURE_ON_THE_1410,
  model,
  SENSE_SWITCH_CONDITIONS_ARE_1401_ONLY,
} from '../src/rpg/model.js';
import {
  CALC_ACCUMULATE_VOCABULARY,
  CALC_OPERATION_VOCABULARY,
  CALC_STATUS_VOCABULARY,
} from '../src/rpg/sheets/calc.js';
import { parseControlCard } from '../src/rpg/sheets/control.js';
import {
  DATA_OPERATION_VOCABULARY,
  DATA_SOURCE_VOCABULARY,
  DATA_STATUS_VOCABULARY,
} from '../src/rpg/sheets/data.js';
import { FORMAT_ENTRY_TYPES, FORMAT_LINE_TYPES } from '../src/rpg/sheets/format.js';
import type { RpgDiagnostic } from '../src/rpg/types.js';

const RESEARCH = readFileSync('docs/research/rpg-sources.md', 'utf8');
const PLAN = readFileSync('docs/plans/phase-5-rpg.md', 'utf8');
const SALES = readFileSync('demos/sales-summary.rpg', 'utf8').trimEnd();

interface TableRow {
  readonly cols: string;
  readonly name: string;
  readonly content: string;
}

function section(markdown: string, heading: string, nextHeading: string): string {
  const start = markdown.indexOf(heading);
  if (start < 0) throw new Error(`missing heading ${heading}`);
  const end = markdown.indexOf(nextHeading, start + heading.length);
  if (end < 0) throw new Error(`missing heading ${nextHeading}`);
  return markdown.slice(start, end);
}

function sheetSection(number: '6.2' | '6.3' | '6.4'): string {
  const start = RESEARCH.indexOf(`### ${number} `);
  if (start < 0) throw new Error(`missing rpg-sources.md §${number}`);
  const end = RESEARCH.indexOf('\n### ', start + 1);
  if (end < 0) throw new Error(`unterminated rpg-sources.md §${number}`);
  return RESEARCH.slice(start, end);
}

function row(number: '6.2' | '6.3' | '6.4', name: string): TableRow {
  const matches = sheetSection(number).split('\n').flatMap((line) => {
    if (!line.startsWith('| ') || line.startsWith('|---')) return [];
    const cells = line.split('|').slice(1, -1).map((cell) => cell.replaceAll('**', '').trim());
    return cells.length === 3 ? [{ cols: cells[0] ?? '', name: cells[1] ?? '', content: cells[2] ?? '' }] : [];
  }).filter((entry) => entry.name === name);
  if (matches.length !== 1) throw new Error(`rpg-sources.md §${number} has ${matches.length} ${name} rows`);
  return matches[0]!;
}

function codeTokens(text: string): readonly string[] {
  return [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '');
}

function uniqueCodeTokens(text: string): readonly string[] {
  return [...new Set(codeTokens(text))];
}

function storedResetPunch(token: string): string {
  return token === '0+' ? '?' : token === '0-' ? '!' : token;
}

function conditionsFromResearch(): readonly string[] {
  const conditionRows = [
    ...sheetSection('6.2').split('\n').filter((line) => /\| Cond\. \|/.test(line)),
    row('6.3', 'Condition').content,
    ...sheetSection('6.4').split('\n').filter((line) =>
      /\| (?:Line Output Condition|Field Output Condition|Conditions 2, 3) \|/.test(line)),
  ].join('\n');
  const names = new Set(codeTokens(conditionRows).filter((token) => token !== 'N'));
  if (!sheetSection('6.2').includes('(00-99)')) throw new Error('§6.2 lost the 00-99 condition range');
  names.add('00-99');
  if (/`F1`-`F6`/.test(conditionRows)) for (let n = 1; n <= 6; n++) names.add(`F${n}`);
  if (/`SB`-`SD`/.test(conditionRows)) for (const name of ['SB', 'SC', 'SD']) names.add(name);
  return [...names].sort();
}

function reservedNamesFromResearch(): readonly string[] {
  const body = section(
    RESEARCH,
    '### 4.5 Reserved names visible in the 1410 skeleton',
    '\n---\n\n## 5.',
  );
  const firstSentence = body.slice(0, body.indexOf(' all appear'));
  return codeTokens(firstSentence);
}

function generatedNamesFromPlan(): readonly string[] {
  const start = PLAN.indexOf('**The published list is the short digit-free names, and only those.**');
  if (start < 0) throw new Error('phase plan lost the generated-name publication paragraph');
  const end = PLAN.indexOf('**`RATE` is gone from it**', start);
  if (end < 0) throw new Error('phase plan lost the generated-name paragraph terminator');
  return codeTokens(PLAN.slice(start, end));
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

function diagnostics(source: string): readonly RpgDiagnostic[] {
  return model(parse(source)).diagnostics;
}

function oneDiagnostic(source: string, text: string): void {
  const found = diagnostics(source);
  expect(found).toHaveLength(1);
  expect(found[0]?.message.text).toBe(text);
}

const OUT_OF_SCOPE_VOCABULARY = [
  {
    names: ['M'],
    reason: 'Data month conversion requires the unrecovered 1410 processor detail in C28-1443',
  },
  {
    names: ['SB', 'SC', 'SD'],
    reason: 'A22-0526-3 pp.56-58 verifies that 1415 sense switches are active only in 1401 mode',
  },
  {
    names: ['4', '8'],
    reason: 'Format punch stacker selection has no Phase-5 punch-output consumer',
  },
  {
    names: ['L0-L9', 'M1-M3', '*IN', 'File Description'],
    reason: 'rpg-sources.md §4.3 verifies that the recovered phase set is not RPG II',
  },
] as const;

type Evidence = 'verified-shared-form' | 'verified-1401-form';
type TapeEvidence = 'verified-literal' | 'not-recovered' | 'verified-absence-no-conclusion';

interface ProvenanceRow {
  readonly names: readonly string[];
  readonly form: Evidence;
  readonly tape: TapeEvidence;
}

function provenanceRowsFromPlan(): readonly ProvenanceRow[] {
  const table = section(
    PLAN,
    '| Name | Form-layout evidence (J24-0215-2 on X24-1336…1339) | Tape evidence (PR-108, §4.5) |',
    '\n\n   **The rule `rpg-vocabulary.test.ts` enforces',
  );
  return table.split('\n').flatMap((line) => {
    const trimmedLine = line.trimStart();
    if (!trimmedLine.startsWith('| `')) return [];
    const cells = trimmedLine.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 3) throw new Error(`provenance table row has ${cells.length} cells`);
    const names = [...codeTokens(cells[0] ?? '')].filter((name) => name !== 'SCFx');
    if ((cells[0] ?? '').includes('F1`-`F6')) {
      names.splice(names.indexOf('F1'), 2, 'F1', 'F2', 'F3', 'F4', 'F5', 'F6');
    }
    const form: Evidence = (cells[1] ?? '').includes('for the 1401')
      ? 'verified-1401-form' : 'verified-shared-form';
    const tapeText = cells[2] ?? '';
    const tape: TapeEvidence = tapeText.includes('appears as a literal') || tapeText.includes('plaintext literals')
      ? 'verified-literal'
      : tapeText.includes('verified for absence') ? 'verified-absence-no-conclusion' : 'not-recovered';
    return [{ names, form, tape }];
  });
}

describe('RPG vocabulary partition against rpg-sources.md §6', () => {
  it('matches every accepted status, source, operation and format token in both directions', () => {
    expect(DATA_STATUS_VOCABULARY).toEqual(codeTokens(row('6.2', 'Status').content));
    expect(DATA_SOURCE_VOCABULARY).toEqual(codeTokens(row('6.2', 'Field Source').content));
    expect(DATA_OPERATION_VOCABULARY).toEqual([
      '', ...uniqueCodeTokens(row('6.2', 'Operation').content).map(storedResetPunch),
    ]);
    expect(CALC_STATUS_VOCABULARY).toEqual(uniqueCodeTokens(row('6.3', 'Status').content));
    expect(CALC_OPERATION_VOCABULARY).toEqual(['', ...codeTokens(row('6.3', 'OP').content)]);
    expect(CALC_ACCUMULATE_VOCABULARY).toEqual([
      '', ...codeTokens(row('6.3', 'A/S/0+/0-').content).map(storedResetPunch),
    ]);
    expect(FORMAT_LINE_TYPES).toEqual(codeTokens(row('6.4', 'Line').content));
    expect(FORMAT_ENTRY_TYPES).toEqual(codeTokens(row('6.4', 'Format').content)
      .filter((token) => token.length === 1));
    expect([...CONDITION_VOCABULARY].sort()).toEqual(conditionsFromResearch());
  });

  it('partitions recovered and generated reserved names without inventing either set', () => {
    expect(RPG_RESERVED_NAMES.map((entry) => entry.name)).toEqual(reservedNamesFromResearch());
    expect(GENERATED_RESERVED_NAMES).toEqual(generatedNamesFromPlan());
    expect(new Set(GENERATED_RESERVED_NAMES).size).toBe(GENERATED_RESERVED_NAMES.length);
  });

  it('carries every refusal on a named out-of-scope row with a reason', () => {
    expect(OUT_OF_SCOPE_VOCABULARY.every((entry) => entry.names.length > 0 && entry.reason.length > 0)).toBe(true);
    expect(OUT_OF_SCOPE_VOCABULARY.flatMap((entry) => entry.names)).toEqual([
      'M', 'SB', 'SC', 'SD', '4', '8', 'L0-L9', 'M1-M3', '*IN', 'File Description',
    ]);
    for (const phrase of ['Data-sheet `M` month conversion', '`SB` / `SC` / `SD`', 'Anything from RPG II']) {
      expect(PLAN).toContain(phrase);
    }
  });

  it('keeps form-layout evidence and PR-108 tape evidence as independent axes', () => {
    expect(provenanceRowsFromPlan()).toEqual([
      { names: ['PAGENO', 'WORD', 'LC', 'OF'], form: 'verified-shared-form', tape: 'verified-literal' },
      { names: ['SER'], form: 'verified-shared-form', tape: 'verified-literal' },
      {
        names: ['PAG', 'WORDxx', 'SB', 'SC', 'SD', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', '1P'],
        form: 'verified-shared-form', tape: 'not-recovered',
      },
      { names: ['RCT'], form: 'verified-shared-form', tape: 'verified-absence-no-conclusion' },
      { names: ['SCF'], form: 'verified-shared-form', tape: 'verified-absence-no-conclusion' },
      { names: ['CNTL'], form: 'verified-1401-form', tape: 'verified-absence-no-conclusion' },
    ]);
  });
});

describe('RPG vocabulary is enforced by the model boundary', () => {
  const rejected = [
    ['Data status', '04010', 11, 3, 'Q02', 'Data status Q is outside the shared X24 vocabulary'],
    ['Data source', '04010', 20, 3, 'XYZ', 'Data field source XYZ is outside the shared X24 vocabulary'],
    ['Data operation', '04010', 30, 1, 'Q', 'Data operation Q is outside the shared X24 vocabulary'],
    ['Calculation status', '05010', 11, 3, 'Q02', 'Calculation status Q is outside the shared X24 vocabulary'],
    ['Calculation operation', '05020', 29, 1, 'Q', 'Calculation operation Q is outside the shared X24 vocabulary'],
    ['Calculation accumulate', '05020', 39, 1, 'Q', 'Calculation accumulate Q is outside the shared X24 vocabulary'],
    ['condition', '06010', 20, 3, ' ZZ', 'condition indicator ZZ is outside the shared X24 vocabulary'],
  ] as const;

  it.each(rejected)('rejects an invalid %s token instead of coercing it', (_name, cardNo, column, width, token, message) => {
    oneDiagnostic(edit(SALES, cardNo, column, width, token), message);
  });

  it('diagnoses the accepted shared-sheet M token as an explicit Phase-5 refusal', () => {
    oneDiagnostic(edit(SALES, '04010', 23, 1, 'M'), 'unsupported: Data month conversion M requires C28-1443');
  });

  it('round-trips the manual plus operation through the stored 12-punch alias', () => {
    const result = model(parse(edit(SALES, '05010', 29, 1, '+')));

    expect(result.diagnostics).toEqual([]);
    expect(result.model?.calcs[0]?.op).toBe('+');
  });

  it('keeps H/L status available on the 1410 while refusing 1401-only sense switches', () => {
    expect(HL_STATUSES_NEED_NO_SPECIAL_FEATURE_ON_THE_1410).toBe(true);
    expect(SENSE_SWITCH_CONDITIONS_ARE_1401_ONLY).toBe(true);
    const accepted = model(parse(edit(SALES, '05010', 11, 3, 'H02')));
    expect(accepted.diagnostics).toEqual([]);
    expect(accepted.model?.calcs[0]?.statuses).toEqual([{ status: 'H', condition: '02' }]);
    oneDiagnostic(edit(SALES, '06010', 20, 3, ' SB'),
      'SB sense-switch conditions are 1401-only (A22-0526-3 pp.56-58)');
  });

  it('rejects representative RPG II vocabulary and never admits a File Description sheet', () => {
    oneDiagnostic(edit(SALES, '06010', 20, 3, ' L0'),
      'condition indicator L0 is outside the shared X24 vocabulary');
    oneDiagnostic(edit(SALES, '06010', 20, 3, ' M1'),
      'condition indicator M1 is outside the shared X24 vocabulary');

    let inArray = edit(SALES, '05020', 20, 6, '*IN');
    inArray = edit(inArray, '05020', 26, 3, '003');
    oneDiagnostic(inArray, 'Calculation factor *IN is neither an alphabetic field nor a numeric literal');

    const fileDescription = edit(SALES, '06010', 1, 7, 'FMYFILE');
    expect(diagnostics(fileDescription).length).toBeGreaterThan(0);
  });

  it('uses a safe Model union fallback after diagnosing an invalid Format line type', () => {
    let source = edit(SALES, '06010', 2, 1, 'Q');
    source = edit(source, '06010', 8, 3, '');
    const result = model(parse(source));

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.message.text).toBe('invalid Format line identification QA1');
    expect(result.model?.lines[0]?.type).toBe('D');
  });

  it('pins Cxx to Input columns 1-3 rather than the resulting condition', () => {
    expect(CXX_NAMES_THE_RECORD_TYPE_BY_INPUT_COLS_1_TO_3).toBe(true);
    expect(model(parse(SALES)).model?.fields.map((field) => field.sources[0]?.recordType))
      .toEqual(['CAA', 'CAA', 'CAA', 'CAA', undefined]);
    oneDiagnostic(edit(SALES, '04010', 20, 3, 'C01'), 'Cxx field source C01 names no Input record type');
  });

  it('does not read or diagnose RG identity columns 76-80 as control content', () => {
    const at = { seqno: 1, sheet: 'control' as const, page: '99', cardNo: '999' };
    const result = parseControlCard(`RG${' '.repeat(73)}99999`, at);

    expect(result.diagnostics).toEqual([]);
    expect(result.row).toMatchObject({ kind: 'rg', body: '' });
  });
});
