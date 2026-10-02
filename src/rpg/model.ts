import type { ParsedDeck } from './deck.js';
import { oursMessage, RPG_RESERVED_NAMES } from './messages.js';
import { GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET } from './layout.js';
import type {
  CalcStep,
  Condition,
  ControlField,
  DataField,
  FieldEntry,
  FieldSource,
  Model,
  OutputLine,
  RecordType,
  RpgDiagnostic,
  SheetField,
  SpecRef,
} from './types.js';
import { CALC_COLUMNS, DATA_COLUMNS, FORMAT_COLUMNS, INPUT_COLUMNS, fieldOf } from './sheets/columns.js';
import {
  CALC_ACCUMULATE_VOCABULARY,
  CALC_OPERATION_VOCABULARY,
  CALC_STATUS_VOCABULARY,
  type CalcRow,
} from './sheets/calc.js';
import {
  DATA_OPERATION_VOCABULARY,
  DATA_STATUS_VOCABULARY,
  type DataRow,
  type DataSourceRow,
  type RawCondition,
} from './sheets/data.js';
import { FORMAT_ENTRY_TYPES, FORMAT_LINE_TYPES, type FormatFieldRow, type FormatLineRow } from './sheets/format.js';
import type { InputRow } from './sheets/input.js';

/** OPEN: `CONDITION_GROUP_IS_NOT_PLUS_TWO_DIGIT_INDICATOR` — `[verified]` shared-sheet layout;
 * the first column of each three-column condition group is Not, and the indicator is right-justified in the remaining two.
 * Fallback: move the split in columns.ts and re-cut every condition-bearing deck. Plan §15;
 * J24-0215-2 p.26; open-questions.md, Phase 5 / Wave 4. */
export const CONDITION_GROUP_IS_NOT_PLUS_TWO_DIGIT_INDICATOR = true;

/** OPEN: `THE_LEVEL_ORDERING_RULE_APPLIES_TO_NUMERIC_LEVELS_ONLY` — `[verified]` IBM 1401
 * hierarchy and `[likely]` 1410 runtime; Format ordering applies to numeric hierarchical levels
 * only, not alphabetic independent lines. Fallback: order alphabetic levels too and re-cut the
 * HA/HB demo group. Plan §15; J24-0215-2 pp.12-16,43;
 * open-questions.md, Phase 5 / Wave 4. */
export const THE_LEVEL_ORDERING_RULE_APPLIES_TO_NUMERIC_LEVELS_ONLY = true;

/** OPEN: `LEVEL_NUMBER_IS_NOT_THE_CONTROL_FIELD_NUMBER` — `[verified]` J24-0215-2 pp.12-16:
 * a Format level orders output; it never selects a control field. Total lines fire from their own
 * Fn/LC conditions. There is no fallback mapping.
 * Plan §15; open-questions.md, Phase 5 / Wave 4. */
export const LEVEL_NUMBER_IS_NOT_THE_CONTROL_FIELD_NUMBER = true;

/** OPEN: `EDIT_WORD_IS_THE_1410_MCE_CONTROL_WORD` — `[likely]`. J24-0215-2 p.43 supplies the
 * shared sheet placement; 1410 semantics come from A22-0526-3 pp.31-33, not the 1401 manual.
 * Fallback: reject cols 48-75 and retain only zero suppression. Plan §15; Phase 5 / Wave 4. */
export const EDIT_WORD_IS_THE_1410_MCE_CONTROL_WORD = true;

/** OPEN: `CXX_NAMES_THE_RECORD_TYPE_BY_INPUT_COLS_1_TO_3` — `[verified]` shared-form reading:
 * Data `Cxx` names Input columns 1-3 (`C` plus Seq), not the resulting condition. Fallback
 * requires a research correction and a demo re-cut. Plan §15; J24-0215-2 p.26; open-questions.md,
 * Phase 5 / Wave 4. */
export const CXX_NAMES_THE_RECORD_TYPE_BY_INPUT_COLS_1_TO_3 = true;

/** OPEN: `SER_AND_RCT_ARE_THE_SERIAL_AND_RECORD_COUNTERS` — `[likely]`; the shared Data sheet
 * lists the tokens but defines neither, and only SER is visible in PR-108. The §15 fallback is
 * selected: diagnose both until C28-1443 establishes storage, increment and reset cadence.
 * Plan §15; rpg-sources.md §§4.5,6.2; Phase 5 / pre-Wave-5 correction. */
export const SER_AND_RCT_ARE_THE_SERIAL_AND_RECORD_COUNTERS = false;

/** OPEN: `HL_STATUSES_NEED_NO_SPECIAL_FEATURE_ON_THE_1410` — `[verified]` for the 1410:
 * base Compare provides H/E/L without the 1401 High-Low-Equal special feature (A22-0526-3 p.28).
 * No fallback. Plan §15; Phase 5 / Wave 4. */
export const HL_STATUSES_NEED_NO_SPECIAL_FEATURE_ON_THE_1410 = true;

/** OPEN: `SENSE_SWITCH_CONDITIONS_ARE_1401_ONLY` — `[verified]` 1415 sense switches A-G operate
 * only in 1401 mode; this emulator has no compatibility mode. SB-SD therefore diagnose rather
 * than becoming false indicators. Fallback: treat them as permanently off. A22-0526-3 pp.56-58;
 * plan §15; Phase 5 / Wave 4. */
export const SENSE_SWITCH_CONDITIONS_ARE_1401_ONLY = true;

/** OPEN: `SEQUENCE_CHECK_IS_THE_SCF_LINE_NOT_MATCHING_FIELDS` — shared SCFx card layout is
 * `[verified]`; interpreting it as the sequence-check request rather than RPG II is `[likely]`
 * for 1410 runtime. Plan §15; J24-0215-2 p.21; Phase 5 / Wave 4. */
export const SEQUENCE_CHECK_IS_THE_SCF_LINE_NOT_MATCHING_FIELDS = true;

/** OPEN: `SEQUENCE_CHECK_IS_GENERATED_ONLY_WITH_AN_SCF_LINE` — `[likely]`; emit sequence checking
 * only when an SCFx line is present. Fallback: always generate against control field 1. Plan §15;
 * J24-0215-2 p.21; Phase 5 / Wave 4. */
export const SEQUENCE_CHECK_IS_GENERATED_ONLY_WITH_AN_SCF_LINE = true;

/** OPEN: `PUNCH_STACKER_IS_THE_PUNCH_X3_DIGIT_NOT_SSF` — `[verified]` for the punch x3 digit:
 * Format col 19 values 4/8 are not SSF d-characters. Punch output is out of Phase 5 and any
 * nonblank value diagnoses. A22-0526-3 p.63; plan §15; open-questions.md, Phase 5 / Wave 4. */
export const PUNCH_STACKER_IS_THE_PUNCH_X3_DIGIT_NOT_SSF = true;

/** OPEN: `OVERFLOW_HEADING_IS_AN_INDEPENDENT_ALPHABETIC_LEVEL_LINE` — `[verified]` IBM 1401
 * sheet meaning and `[likely]` 1410 runtime; p.38 forbids OF from appearing in only some
 * alternatives, so the demo uses an independent HB group.
 * Fallback: name the 1P-or-OF departure. Plan §15; J24-0215-2 pp.12-16,38; Phase 5 / Wave 4. */
export const OVERFLOW_HEADING_IS_AN_INDEPENDENT_ALPHABETIC_LEVEL_LINE = true;

export interface ModelResult {
  readonly model?: Model;
  readonly diagnostics: readonly RpgDiagnostic[];
}

export const GENERATED_RESERVED_NAMES = [
  'START', 'RDCARD', 'IDENT', 'SEQCHK', 'EXTRCT', 'CTLBRK', 'TOTCAL', 'TOTOUT', 'LVLRST',
  'DTLCAL', 'HDGOUT', 'DTLOUT', 'LASTCD', 'NOTFND', 'EOJ', 'IND', 'CDIN', 'PLINE', 'PLGM',
  'PRIME', 'FSTPG', 'ZEROS', 'IZERO', 'ONE', 'ZERO', 'FIVE', 'WORDnn',
] as const;

export const CONDITION_VOCABULARY = [
  '00-99', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'OF', 'LC', '1P', 'SB', 'SC', 'SD',
] as const;

const CANONICAL_INDICATORS = [
  ...Array.from({ length: 100 }, (_, n) => String(n).padStart(2, '0')),
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'OF', 'LC', '1P', 'PRIME',
] as const;

const GENERATED_RESERVED = new Set<string>(GENERATED_RESERVED_NAMES.filter((name) => name !== 'WORDnn'));
const RECOVERED_RESERVED: ReadonlySet<string> = new Set(RPG_RESERVED_NAMES.map((entry) => entry.name));
const SENSE_SWITCHES = new Set(['SB', 'SC', 'SD']);
const DATA_STATUSES = new Set<string>(DATA_STATUS_VOCABULARY);
const DATA_OPERATIONS = new Set<string>(DATA_OPERATION_VOCABULARY);
const CALC_STATUSES = new Set<string>(CALC_STATUS_VOCABULARY);
const CALC_OPERATIONS = new Set<string>(CALC_OPERATION_VOCABULARY);
const CALC_ACCUMULATES = new Set<string>(CALC_ACCUMULATE_VOCABULARY);
const FORMAT_LINES = new Set<string>(FORMAT_LINE_TYPES);
const FORMAT_ENTRIES = new Set<string>(FORMAT_ENTRY_TYPES);

interface MutableOutputLine {
  readonly id: string;
  readonly type: 'H' | 'D' | 'T';
  readonly level: string;
  readonly number: string;
  readonly print: boolean;
  readonly nextLine?: string;
  readonly spaceBefore?: 1 | 2 | 3;
  readonly spaceAfter?: 1 | 2 | 3;
  readonly skipBefore?: number;
  readonly skipAfter?: number;
  readonly conditionGroups: Condition[][];
  readonly fields: FieldEntry[];
  readonly at: SpecRef;
}

export function model(parsed: ParsedDeck): ModelResult {
  const diagnostics: RpgDiagnostic[] = [...parsed.diagnostics];
  const definedConditions = new Map<string, SpecRef>();
  const referencedIndicators = new Set<string>(['LC', 'OF', 'PRIME']);

  const diagnose = (at: SpecRef, text: string, cite: string, column?: number): void => {
    diagnostics.push({
      at,
      ...(column === undefined ? {} : { column }),
      message: oursMessage(text, cite),
      severity: 'flag',
    });
  };

  const registerCondition = (condition: string, at: SpecRef): void => {
    if (!/^\d{2}$/.test(condition)) {
      diagnose(at, `resulting condition ${condition || 'blank'} must be two digits`,
        'J24-0215-2 pp.20,24,33; resulting-condition columns are two digits');
      return;
    }
    const previous = definedConditions.get(condition);
    if (previous !== undefined) {
      diagnose(at, `resulting condition ${condition} is defined on both ${previous.sheet} and ${at.sheet} sheets`,
        'J24-0215-2 pp.20,24,33; resulting conditions are unique');
    } else {
      definedConditions.set(condition, at);
    }
    referencedIndicators.add(condition);
  };

  const useConditions = (raw: readonly RawCondition[], at: SpecRef): readonly Condition[] => raw.flatMap((entry) => {
    if (entry.notMarker !== '' && entry.notMarker !== 'N') {
      diagnose(at, `condition negation ${entry.notMarker} is not blank or N`,
        'J24-0215-2 p.26 cols 31-33; shared three-column condition-group layout');
      return [];
    }
    if (!isSheetIndicator(entry.indicator)) {
      diagnose(at, `condition indicator ${entry.indicator || 'blank'} is outside the shared X24 vocabulary`,
        'J24-0215-2 pp.24,33,38; rpg-sources.md §6');
      return [];
    }
    if (SENSE_SWITCHES.has(entry.indicator)) {
      diagnose(at, `${entry.indicator} sense-switch conditions are 1401-only (A22-0526-3 pp.56-58)`,
        'A22-0526-3 pp.56-58 [verified]');
      return [];
    }
    if (/^\d{2}$/.test(entry.indicator) && !definedConditions.has(entry.indicator)) {
      diagnose(at, `condition ${entry.indicator} has not been defined by an earlier specification`,
        'J24-0215-2 pp.24,33,38; numeric conditions name earlier resulting conditions');
      return [];
    }
    referencedIndicators.add(entry.indicator);
    return [{ indicator: entry.indicator, negated: entry.not }];
  });

  const { records, sequenceField, controlFields } = resolveInput(parsed.input, diagnose, registerCondition);
  for (const field of controlFields) referencedIndicators.add(`F${field.n}`);
  const recordNames = new Set(records.flatMap((record) => record.seq === undefined ? [] : [`C${record.seq}`]));
  const fields = resolveData(parsed.data, recordNames, diagnose, registerCondition, useConditions);
  const pageFields = fields.filter((field) => field.name === 'PAGENO').length;
  if (pageFields !== 1) {
    const at = parsed.data[0]?.at ?? parsed.control?.at ?? parsed.cards[0]?.at;
    if (at !== undefined) {
      diagnose(at, `PAGENO must be defined exactly once; found ${pageFields}`, 'J24-0215-2 p.26 [verified]');
    }
  }
  const knownFields = new Set(fields.map((field) => field.name));
  const calcs = resolveCalcs(parsed.calculations, knownFields, diagnose, registerCondition, useConditions);
  for (const calc of calcs) if (calc.result !== undefined) knownFields.add(calc.result);
  const fieldWidths = new Map(fields.map((field) => [field.name, field.length]));
  for (const calc of calcs) {
    if (calc.result !== undefined && calc.length !== undefined) {
      fieldWidths.set(calc.result, Math.max(0, calc.length - (calc.positionAdjust ?? 0)));
    }
  }
  const lines = resolveFormat(parsed.format, knownFields, fieldWidths, diagnose, useConditions);

  const indicators = CANONICAL_INDICATORS.filter((indicator) => referencedIndicators.has(indicator));
  const value: Model = {
    control: parsed.control === undefined
      ? { present: false }
      : { present: parsed.control.kind === 'rg', at: parsed.control.at },
    records,
    ...(sequenceField === undefined ? {} : { sequenceField }),
    controlFields,
    fields,
    calcs,
    lines,
    indicators,
  };
  return { model: value, diagnostics };
}

function resolveInput(
  rows: readonly InputRow[],
  diagnose: (at: SpecRef, text: string, cite: string, column?: number) => void,
  registerCondition: (condition: string, at: SpecRef) => void,
): { readonly records: readonly RecordType[]; readonly sequenceField?: 1 | 2 | 3 | 4 | 5 | 6;
     readonly controlFields: readonly ControlField[] } {
  const records: RecordType[] = [];
  let sequenceField: 1 | 2 | 3 | 4 | 5 | 6 | undefined;
  let pending: { first: InputRow; rows: InputRow[] } | undefined;
  let finalControlFields: ControlField[] = [];
  let previousNumericSequence: number | undefined;
  let firstNumericSequenceAt: SpecRef | undefined;
  const seenSequences = new Set<string>();
  let sequenceFieldRows = 0;
  let firstSequenceFieldAt: SpecRef | undefined;
  let diagnosedRecordAfterSequenceField = false;

  const finish = (): void => {
    if (pending === undefined) return;
    const last = pending.rows.at(-1) ?? pending.first;
    const codes = pending.rows.flatMap((row) => row.codes.map((code) => {
      const position = numeric(code.position);
      if (position === undefined) {
        diagnose(row.at, 'non-numeric character in a position field', 'J24-0215-2 p.21 record-position columns',
          columnOf(INPUT_COLUMNS, `recordPosition${code.n}`));
      } else if (position > 80) {
        diagnose(row.at, `record position ${position} is above the 80-column card image`,
          'phase-5-rpg.md §2.2; shared X24 form', columnOf(INPUT_COLUMNS, `recordPosition${code.n}`));
      }
      if (code.notMarker !== '' && code.notMarker !== 'N') {
        diagnose(row.at, `record-code negation ${code.notMarker} is not blank or N`, 'J24-0215-2 p.21',
          columnOf(INPUT_COLUMNS, `recordNot${code.n}`));
      }
      if (!['Z', 'D', 'C'].includes(code.compare)) {
        diagnose(row.at, `record comparison ${code.compare || 'blank'} is not Z, D, or C`, 'J24-0215-2 p.21',
          columnOf(INPUT_COLUMNS, `recordCompare${code.n}`));
      }
      return {
        position: position ?? 0,
        not: code.not,
        compare: (['Z', 'D', 'C'].includes(code.compare) ? code.compare : 'C') as 'Z' | 'D' | 'C',
        code: code.code,
      };
    }));
    const sequence = pending.first.seq;
    const numericSequence = /^\d{2}$/.test(sequence);
    const alphabeticSequence = /^[A-Z]{2}$/.test(sequence);
    if (!numericSequence && !alphabeticSequence) {
      diagnose(pending.first.at, `Input sequence ${sequence || 'blank'} must be two digits or two alphabetic characters`,
        'J24-0215-2 p.20 cols 2-3', columnOf(INPUT_COLUMNS, 'seq'));
    } else if (seenSequences.has(sequence)) {
      diagnose(pending.first.at, `Input sequence ${sequence} is defined more than once`,
        'J24-0215-2 p.20 cols 2-3 [verified]', columnOf(INPUT_COLUMNS, 'seq'));
    } else {
      seenSequences.add(sequence);
      if (numericSequence) {
        const value = Number(sequence);
        firstNumericSequenceAt ??= pending.first.at;
        if (previousNumericSequence !== undefined && value <= previousNumericSequence) {
          diagnose(pending.first.at, `numeric Input sequence ${sequence} must be greater than the preceding ${String(previousNumericSequence).padStart(2, '0')}`,
            'J24-0215-2 p.20 cols 2-3 [verified]', columnOf(INPUT_COLUMNS, 'seq'));
        }
        previousNumericSequence = value;
      }
    }
    const numberIsValid = pending.first.number === '' || pending.first.number === '1' || pending.first.number === 'N';
    if (!numberIsValid) {
      diagnose(pending.first.at, `Input record number ${pending.first.number} is not blank, 1, or N`,
        'J24-0215-2 p.20 col 4', columnOf(INPUT_COLUMNS, 'number'));
    } else if (numericSequence && pending.first.number === '') {
      diagnose(pending.first.at, `numeric Input sequence ${sequence} requires Number 1 or N`,
        'J24-0215-2 p.20 col 4 [verified]', columnOf(INPUT_COLUMNS, 'number'));
    } else if (alphabeticSequence && pending.first.number !== '') {
      diagnose(pending.first.at, `non-sequential Input sequence ${sequence} must leave Number blank`,
        'J24-0215-2 p.20 col 4 [verified]', columnOf(INPUT_COLUMNS, 'number'));
    }
    const optionIsValid = pending.first.option === '' || pending.first.option === 'X';
    if (!optionIsValid) {
      diagnose(pending.first.at, `Input option ${pending.first.option} is not blank or X`,
        'J24-0215-2 p.20 col 5', columnOf(INPUT_COLUMNS, 'option'));
    } else if (alphabeticSequence && pending.first.option === 'X') {
      diagnose(pending.first.at, `non-sequential Input sequence ${sequence} must leave Option blank`,
        'J24-0215-2 p.20 col 5 [verified]', columnOf(INPUT_COLUMNS, 'option'));
    }
    registerCondition(last.resultingCondition, last.at);
    const number = pending.first.number;
    const record: RecordType = {
      condition: last.resultingCondition,
      codes,
      ...(pending.first.seq === '' ? {} : { seq: pending.first.seq }),
      ...(number === '1' || number === 'N' ? { number } : {}),
      optional: pending.first.optional,
      at: pending.first.at,
    };
    records.push(record);
    let controlFieldDiagnosticRaised = false;
    finalControlFields = last.controlFields.map((field) => {
      const end = numeric(field.end);
      const length = numeric(field.length);
      if (!controlFieldDiagnosticRaised && (end === undefined || length === undefined)) {
        diagnose(last.at, `control-field ${field.n} end and length must both be numeric`,
          'J24-0215-2 p.21 control-field End/Length pair',
          columnOf(INPUT_COLUMNS, end === undefined ? `controlFieldEnd${field.n}` : `controlFieldLength${field.n}`));
        controlFieldDiagnosticRaised = true;
      } else if (!controlFieldDiagnosticRaised && (length === 0 || !/^\d{2}$/.test(field.length))) {
        diagnose(last.at, 'control-field length is outside the punched length columns',
          'J24-0215-2 p.21 length is a two-column field', columnOf(INPUT_COLUMNS, `controlFieldLength${field.n}`));
        controlFieldDiagnosticRaised = true;
      } else if (!controlFieldDiagnosticRaised && end !== undefined && end > 80) {
        diagnose(last.at, `control-field ${field.n} end ${end} is above the 80-column card image`,
          'phase-5-rpg.md §2.2; shared X24 form', columnOf(INPUT_COLUMNS, `controlFieldEnd${field.n}`));
        controlFieldDiagnosticRaised = true;
      } else if (!controlFieldDiagnosticRaised && length !== undefined && end !== undefined && length > end) {
        diagnose(last.at, `control-field ${field.n} length ${length} exceeds its end position ${end}`,
          'J24-0215-2 p.21 control-field End/Length pair', columnOf(INPUT_COLUMNS, `controlFieldLength${field.n}`));
        controlFieldDiagnosticRaised = true;
      }
      return {
        n: field.n,
        end: end ?? 0,
        length: length ?? 0,
      };
    });
    pending = undefined;
  };

  for (const row of rows) {
    if (row.kind === 'sequenceField') {
      finish();
      sequenceFieldRows += 1;
      firstSequenceFieldAt ??= row.at;
      if (sequenceFieldRows > 1) {
        diagnose(row.at, 'Input specifications permit exactly one SCF line', 'J24-0215-2 p.21 [verified]');
      } else {
        const value = numeric(row.number);
        if (value !== undefined && value >= 1 && value <= 6) sequenceField = value as 1 | 2 | 3 | 4 | 5 | 6;
        else diagnose(row.at, 'SCF must name control field 1-6', 'J24-0215-2 p.21');
      }
      continue;
    }
    if (sequenceFieldRows > 0 && !diagnosedRecordAfterSequenceField) {
      diagnose(row.at, 'Input record specification appears after the SCF line', 'J24-0215-2 p.21 [verified]');
      diagnosedRecordAfterSequenceField = true;
    }
    if (pending === undefined) pending = { first: row, rows: [row] };
    else pending.rows.push(row);
    if (row.resultingCondition !== '') finish();
  }
  finish();

  if (firstNumericSequenceAt !== undefined && sequenceFieldRows === 0) {
    diagnose(firstNumericSequenceAt, 'numeric Input sequence specifications require one trailing SCF line',
      'J24-0215-2 p.21 [verified]');
  } else if (firstNumericSequenceAt === undefined && firstSequenceFieldAt !== undefined) {
    diagnose(firstSequenceFieldAt, 'SCF requires numeric Input sequence specifications',
      'J24-0215-2 p.21 [verified]');
  }

  if (records.length > 20) {
    const at = rows.at(-1)?.at;
    if (at !== undefined) diagnose(at, 'Input specifications permit at most 20 record types', 'J24-0215-2 p.21');
  }
  return { records, ...(sequenceField === undefined ? {} : { sequenceField }), controlFields: finalControlFields };
}

function resolveData(
  rows: readonly DataRow[],
  recordNames: ReadonlySet<string>,
  diagnose: (at: SpecRef, text: string, cite: string, column?: number) => void,
  registerCondition: (condition: string, at: SpecRef) => void,
  useConditions: (raw: readonly RawCondition[], at: SpecRef) => readonly Condition[],
): readonly DataField[] {
  const groups: { first: DataRow; rows: DataRow[] }[] = [];
  for (const row of rows) {
    if (row.name !== '') groups.push({ first: row, rows: [row] });
    else {
      const group = groups.at(-1);
      if (group === undefined) diagnose(row.at, 'Data continuation appears before a named field', 'J24-0215-2 p.24');
      else {
        if (row.length !== '' || row.statuses.length > 0) {
          diagnose(row.at, 'Data continuation columns 2-19 must be blank', 'J24-0215-2 p.24');
        }
        group.rows.push(row);
      }
    }
  }

  const seenNames = new Set<string>();
  return groups.map(({ first, rows: fieldRows }) => {
    if (!/^[A-Z]{1,6}$/.test(first.name)) {
      diagnose(first.at, `Data field name ${first.name || 'blank'} must be alphabetic`, 'J24-0215-2 p.26 cols 2-7',
        columnOf(DATA_COLUMNS, 'fieldName'));
    }
    if (seenNames.has(first.name) && first.name !== 'PAGENO') {
      diagnose(first.at, `Data field ${first.name} is defined more than once`, 'J24-0215-2 p.26');
    }
    seenNames.add(first.name);
    if ((GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET && GENERATED_RESERVED.has(first.name))
      || (RECOVERED_RESERVED.has(first.name) && first.name !== 'PAGENO')) {
      diagnose(first.at, `field name ${first.name} collides with a generated reserved name`,
        'phase-5-rpg.md §8.4; GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET');
    }
    const length = numeric(first.length);
    if (length === undefined || length <= 0) {
      diagnose(first.at, `Data field length ${first.length || 'blank'} must be numeric and positive`,
        'J24-0215-2 p.26 cols 8-10', columnOf(DATA_COLUMNS, 'fieldLength'));
    }
    for (const status of first.statuses) {
      if (!DATA_STATUSES.has(status.status)) {
        diagnose(first.at, `Data status ${status.status || 'blank'} is outside the shared X24 vocabulary`,
          'J24-0215-2 p.24 cols 11,14,17');
      }
    }
    const sources = fieldRows.flatMap((row) => row.sources.map((source) => resolveSource(
      source, length ?? 0, row.at, recordNames, diagnose, useConditions,
    )));
    for (const status of first.statuses) registerCondition(status.condition, first.at);
    return {
      name: first.name,
      length: length ?? 0,
      sources,
      statuses: first.statuses.map((status) => ({ status: status.status, condition: status.condition })),
      at: first.at,
    };
  });
}

function resolveSource(
  row: DataSourceRow,
  fieldLength: number,
  at: SpecRef,
  recordNames: ReadonlySet<string>,
  diagnose: (at: SpecRef, text: string, cite: string, column?: number) => void,
  useConditions: (raw: readonly RawCondition[], at: SpecRef) => readonly Condition[],
): FieldSource {
  let kind: FieldSource['kind'] = 'record';
  let recordType: string | undefined;
  if (row.source === 'PAG') kind = 'page';
  else if (row.source === 'SER' || row.source === 'RCT') {
    kind = row.source === 'SER' ? 'serial' : 'recordCount';
    if (!SER_AND_RCT_ARE_THE_SERIAL_AND_RECORD_COUNTERS) {
      diagnose(at, 'unsupported: SER / RCT semantics require C28-1443',
        'J24-0215-2 p.26 cols 20-22; phase-5-rpg.md §15',
        columnOf(DATA_COLUMNS, `source${row.n}FieldSource`));
    }
  }
  else if (/^C[A-Z0-9]{2}$/.test(row.source)) {
    recordType = row.source;
    if (!recordNames.has(row.source)) {
      diagnose(at, `Cxx field source ${row.source} names no Input record type`,
        'J24-0215-2 p.26 cols 20-22 [verified]');
    }
  } else {
    diagnose(at, `Data field source ${row.source || 'blank'} is outside the shared X24 vocabulary`,
      'J24-0215-2 p.26 cols 20-22', columnOf(DATA_COLUMNS, `source${row.n}FieldSource`));
  }

  const operation = ({
    '': 'move', A: 'add', S: 'subtract', '?': 'resetAdd', '!': 'resetSubtract', D: 'digit', Y: 'zone',
  } as const)[row.operation as '' | 'A' | 'S' | '?' | '!' | 'D' | 'Y'];
  if (!DATA_OPERATIONS.has(row.operation)) {
    diagnose(at, `Data operation ${row.operation || 'blank'} is outside the shared X24 vocabulary`,
      'J24-0215-2 p.26 col 30', columnOf(DATA_COLUMNS, `source${row.n}Operation`));
  }
  if (row.numeric === 'M') {
    diagnose(at, 'unsupported: Data month conversion M requires C28-1443',
      'J24-0215-2 p.26 col 23; phase-5-rpg.md §2.2', columnOf(DATA_COLUMNS, `source${row.n}Numeric`));
  } else if (row.numeric !== '' && row.numeric !== 'N') {
    diagnose(at, `source numeric marker ${row.numeric} is not valid in its column`,
      'J24-0215-2 p.26 numeric-marker column', columnOf(DATA_COLUMNS, `source${row.n}Numeric`));
  }
  const end = numeric(row.end);
  const sourceLength = numeric(row.length);
  if (kind === 'record') {
    if (row.end === '') {
      diagnose(at, `record field source ${row.source} requires a field-end position`,
        'J24-0215-2 p.26 cols 20-29 [verified]', columnOf(DATA_COLUMNS, `source${row.n}FieldEnd`));
    } else if (end !== undefined && end > 80) {
      diagnose(at, `record position ${end} is above the 80-column card image`, 'phase-5-rpg.md §2.2',
        columnOf(DATA_COLUMNS, `source${row.n}FieldEnd`));
    } else if (end === undefined) {
      diagnose(at, 'non-numeric character in a position field', 'J24-0215-2 p.26 field-end columns',
        columnOf(DATA_COLUMNS, `source${row.n}FieldEnd`));
    }
    if (row.length !== '' && sourceLength === undefined) {
      diagnose(at, 'Data source length must be numeric', 'J24-0215-2 p.26 source-length columns',
        columnOf(DATA_COLUMNS, `source${row.n}FieldLength`));
    } else if (row.length !== '' && sourceLength !== undefined && sourceLength <= 0) {
      diagnose(at, 'Data source length must be positive', 'J24-0215-2 p.26 source-length columns [verified]',
        columnOf(DATA_COLUMNS, `source${row.n}FieldLength`));
    } else if (end !== undefined && (sourceLength ?? fieldLength) > end) {
      diagnose(at, `record source length ${sourceLength ?? fieldLength} exceeds field-end position ${end}`,
        'J24-0215-2 p.26 field-end/source-length columns [verified]',
        columnOf(DATA_COLUMNS, `source${row.n}FieldLength`));
    }
  } else if (row.end !== '' || row.length !== '') {
    const field = row.end !== '' ? `source${row.n}FieldEnd` : `source${row.n}FieldLength`;
    diagnose(at, `${row.source} field source must leave field-end and source-length blank`,
      'J24-0215-2 p.26 cols 20-29 [verified]', columnOf(DATA_COLUMNS, field));
  }

  return {
    kind,
    ...(recordType === undefined ? {} : { recordType }),
    ...(end === undefined ? {} : { end }),
    ...(kind === 'record' ? { sourceLength: sourceLength ?? fieldLength } : {}),
    numeric: row.numeric === 'N',
    operation: operation ?? 'move',
    conditions: useConditions(row.conditions, at),
  };
}

function resolveCalcs(
  rows: readonly CalcRow[],
  knownFields: Set<string>,
  diagnose: (at: SpecRef, text: string, cite: string, column?: number) => void,
  registerCondition: (condition: string, at: SpecRef) => void,
  useConditions: (raw: readonly RawCondition[], at: SpecRef) => readonly Condition[],
): readonly CalcStep[] {
  const result: CalcStep[] = [];
  let previousResult: string | undefined;
  for (const row of rows) {
    for (const status of row.statuses) {
      if (!CALC_STATUSES.has(status.status)) {
        diagnose(row.at, `Calculation status ${status.status || 'blank'} is outside the shared X24 vocabulary`,
          'J24-0215-2 pp.33-34 cols 11,14,17');
      }
    }
    if (row.time !== 'T' && row.time !== 'D') {
      diagnose(row.at, 'Calculation column 49 must be T or D',
        'J24-0215-2 pp.33-34 col 49 [verified]', columnOf(CALC_COLUMNS, 'totalDetail'));
    }
    const op: CalcStep['op'] | undefined = ['+', '-', 'X', '/', 'C'].includes(row.operation)
      ? row.operation as CalcStep['op'] : undefined;
    if (!CALC_OPERATIONS.has(row.operation)) {
      diagnose(row.at, `Calculation operation ${row.operation || 'blank'} is outside the shared X24 vocabulary`,
        'J24-0215-2 pp.33-34 col 29', columnOf(CALC_COLUMNS, 'op'));
    }
    const resultName = row.operation === 'C' ? undefined : row.result === '' ? previousResult : row.result;
    if (row.result !== '' && !/^[A-Z]{1,6}$/.test(row.result)) {
      diagnose(row.at, `Calculation field name ${row.result} must be alphabetic`,
        'J24-0215-2 pp.33-34 cols 2-7', columnOf(CALC_COLUMNS, 'fieldName'));
    }
    if (row.result !== '' && ((GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET && GENERATED_RESERVED.has(row.result))
      || RECOVERED_RESERVED.has(row.result))) {
      diagnose(row.at, `field name ${row.result} collides with a generated reserved name`,
        'phase-5-rpg.md §8.4; GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET');
    }
    if (row.operation === 'C' && row.result !== '') {
      diagnose(row.at, 'a compare must leave Calculation field name blank', 'J24-0215-2 pp.33-34');
    }
    const factor1 = factorOf(row.factor1, row.factor1Length, knownFields, row.at, diagnose);
    const factor2 = factorOf(row.factor2, row.factor2Length, knownFields, row.at, diagnose);
    const length = numeric(row.length);
    if (row.result !== '' && (length === undefined || length <= 0)) {
      diagnose(row.at, `Calculation result length ${row.length || 'blank'} must be numeric and positive`,
        'J24-0215-2 pp.33-34 cols 8-10', columnOf(CALC_COLUMNS, 'fieldLength'));
    }
    const positionAdjust = numeric(row.positionAdjust);
    if (row.positionAdjust !== '' && positionAdjust === undefined) {
      diagnose(row.at, 'Calculation position adjust must be numeric', 'J24-0215-2 pp.33-34 cols 52-53',
        columnOf(CALC_COLUMNS, 'positionAdjust'));
    }
    if (row.operation === 'X' && length !== undefined) {
      const minimum = (numeric(row.factor1Length) ?? 0) + (numeric(row.factor2Length) ?? 0) - (positionAdjust ?? 0);
      if (length < minimum) {
        diagnose(row.at, `multiply result length ${length} is below the required minimum ${minimum}`,
          'J24-0215-2 pp.33-34 cols 8-10 [verified]');
      }
    }
    if (row.operation === '/' && length !== undefined) {
      const minimum = (numeric(row.factor1Length) ?? 0) - (positionAdjust ?? 0);
      if (length < minimum) {
        diagnose(row.at, `divide result length ${length} is below the required minimum ${minimum}`,
          'J24-0215-2 pp.33-34 cols 8-10 [verified]');
      }
    }
    const accumulate = ({ A: 'A', S: 'S', '?': 'resetAdd', '!': 'resetSubtract' } as const)[
      row.accumulate as 'A' | 'S' | '?' | '!'
    ];
    const halfAdjust = numeric(row.halfAdjust);
    if (!CALC_ACCUMULATES.has(row.accumulate)) {
      diagnose(row.at, `Calculation accumulate ${row.accumulate || 'blank'} is outside the shared X24 vocabulary`,
        'J24-0215-2 pp.33-34 col 39', columnOf(CALC_COLUMNS, 'accumulate'));
    } else if (CALC_OPERATIONS.has(row.operation)) {
      // A one-column right shift puts a factor-length's last digit in the adjacent operation or
      // accumulate column; that invalid token is the primary diagnostic, not a derived zero width.
      for (const [field, text] of [
        ['factor1Length', row.factor1Length],
        ['factor2Length', row.factor2Length],
      ] as const) {
        if (text !== '' && numeric(text) === 0) {
          diagnose(row.at, 'Calculation factor length must be positive',
            'J24-0215-2 pp.33-34 factor-length columns [verified]', columnOf(CALC_COLUMNS, field));
        }
      }
    }
    if (row.halfAdjust !== '' && halfAdjust === undefined) {
      diagnose(row.at, 'Calculation half-adjust position must be numeric', 'J24-0215-2 pp.33-34 cols 50-51',
        columnOf(CALC_COLUMNS, 'halfAdjust'));
    }
    const step: CalcStep = {
      ...(resultName === undefined || resultName === '' ? {} : { result: resultName }),
      ...(length === undefined ? {} : { length }),
      ...(factor1 === undefined ? {} : { factor1 }),
      ...(op === undefined ? {} : { op }),
      ...(factor2 === undefined ? {} : { factor2 }),
      ...(accumulate === undefined ? {} : { accumulate }),
      conditions: useConditions(row.conditions, row.at),
      time: row.time === 'T' ? 'total' : 'detail',
      ...(halfAdjust === undefined ? {} : { halfAdjust }),
      ...(positionAdjust === undefined ? {} : { positionAdjust }),
      statuses: row.statuses.map((status) => ({ status: status.status, condition: status.condition })),
      at: row.at,
    };
    result.push(step);
    for (const status of row.statuses) registerCondition(status.condition, row.at);
    if (resultName !== undefined && resultName !== '') {
      previousResult = resultName;
      knownFields.add(resultName);
    }
  }
  return result;
}

function factorOf(
  text: string,
  lengthText: string,
  knownFields: ReadonlySet<string>,
  at: SpecRef,
  diagnose: (at: SpecRef, text: string, cite: string, column?: number) => void,
): { readonly text: string; readonly length: number } | undefined {
  if (text === '') return undefined;
  const numericLiteral = /^\d+$/.test(text);
  if (/^[A-Z]+$/.test(text)) {
    if (!knownFields.has(text)) {
      diagnose(at, `undefined field name ${text}`, 'J24-0215-2 pp.33-34 factor columns');
    }
  } else if (!numericLiteral) {
    diagnose(at, `Calculation factor ${text} is neither an alphabetic field nor a numeric literal`,
      'J24-0215-2 pp.33-34 factor columns');
  }
  const length = numeric(lengthText);
  if (lengthText !== '' && length === undefined) {
    diagnose(at, `Calculation factor length ${lengthText} must be numeric`,
      'J24-0215-2 pp.33-34 factor-length columns');
  }
  const resolvedLength = length ?? text.length;
  if (numericLiteral && length !== undefined && length > 0 && text.length > length) {
    diagnose(at, `numeric Calculation factor ${text} exceeds declared length ${length}`,
      'J24-0215-2 pp.33-34 factor and factor-length columns [verified]');
  }
  return {
    text: numericLiteral ? text.padStart(resolvedLength, '0') : text,
    length: resolvedLength,
  };
}

function resolveFormat(
  rows: readonly (FormatLineRow | FormatFieldRow)[],
  knownFields: ReadonlySet<string>,
  fieldWidths: ReadonlyMap<string, number>,
  diagnose: (at: SpecRef, text: string, cite: string, column?: number) => void,
  useConditions: (raw: readonly RawCondition[], at: SpecRef) => readonly Condition[],
): readonly OutputLine[] {
  const lines: MutableOutputLine[] = [];
  const byId = new Map<string, MutableOutputLine>();
  const wordBodies = new Map<string, { length: number; literal: string }>();
  let current: MutableOutputLine | undefined;
  let previousHeadingLevel: number | undefined;
  let previousTotalLevel: number | undefined;

  if (rows[0]?.kind === 'field' && rows[0].entryKind === 'W') {
    diagnose(rows[0].at, 'a W entry may appear anywhere except first', 'J24-0215-2 p.43 [verified]');
  } else if (rows[0]?.kind === 'field' && (rows[0].entryKind === 'F' || rows[0].entryKind === 'B')) {
    diagnose(rows[0].at, 'field entry appears before its line entry', 'J24-0215-2 p.43 [verified]');
  } else if (rows[0]?.kind !== 'line') {
    const at = rows[0]?.at;
    if (at !== undefined) diagnose(at, 'the first Format entry must be an L line entry', 'J24-0215-2 p.43 [verified]');
  }

  for (const row of rows) {
    if (row.kind === 'line') {
      if (!/^[HDT](?:[1-8][0-9]|[A-Z][A-Z0-9])$/.test(row.id)
        || !FORMAT_LINES.has(row.id[0] ?? '')) {
        diagnose(row.at, `invalid Format line identification ${row.id || 'blank'}`, 'J24-0215-2 pp.12-16,43');
      }
      if (row.nextLine !== '' && row.nextLine.slice(0, 2) !== row.id.slice(0, 2)) {
        diagnose(row.at, `Next Line ${row.nextLine} does not match ${row.id.slice(0, 2)}`,
          'J24-0215-2 p.43 cols 8-10 [verified]', columnOf(FORMAT_COLUMNS, 'nextLine'));
      }
      if (row.print !== '' && row.print !== 'X') {
        diagnose(row.at, `Format print marker ${row.print} is not blank or X`, 'J24-0215-2 p.43 col 5',
          columnOf(FORMAT_COLUMNS, 'print'));
      }
      if (row.punch !== '' || row.reserved !== '') {
        diagnose(row.at, 'punch and magnetic-tape Format output are out of Phase 5 scope', 'phase-5-rpg.md §2.2');
      }
      if (row.stacker !== '') {
        diagnose(row.at, 'unsupported: Format col 19 punch stacker is out of scope for Phase 5',
          'A22-0526-3 p.63 [verified]', columnOf(FORMAT_COLUMNS, 'stacker'));
      }

      const first = row.id[0] ?? '';
      const type = FORMAT_LINES.has(first) ? first as 'H' | 'D' | 'T' : 'D';
      const level = row.id[1] ?? '';
      const numericLevel = numeric(level);
      if (numericLevel !== undefined && type === 'H') {
        if (previousHeadingLevel !== undefined && numericLevel > previousHeadingLevel) {
          diagnose(row.at, 'heading lines must appear in descending numeric level order', 'J24-0215-2 p.43 [verified]');
        }
        previousHeadingLevel = numericLevel;
      } else if (numericLevel !== undefined && type === 'T') {
        if (previousTotalLevel !== undefined && numericLevel < previousTotalLevel) {
          diagnose(row.at, 'total lines must appear in ascending numeric level order', 'J24-0215-2 p.43 [verified]');
        }
        previousTotalLevel = numericLevel;
      }

      const conditions = [...useConditions(row.conditions, row.at)];
      const existing = byId.get(row.id);
      if (existing !== undefined) {
        existing.conditionGroups.push(conditions);
        current = existing;
      } else {
        const created: MutableOutputLine = {
          id: row.id,
          type,
          level,
          number: row.id[2] ?? '',
          print: row.print === 'X',
          ...(row.nextLine === '' ? {} : { nextLine: row.nextLine }),
          ...spacingOf(row.spaceBefore, 'spaceBefore', row.at, diagnose),
          ...spacingOf(row.spaceAfter, 'spaceAfter', row.at, diagnose),
          ...spacingOf(row.skipBefore, 'skipBefore', row.at, diagnose),
          ...spacingOf(row.skipAfter, 'skipAfter', row.at, diagnose),
          conditionGroups: conditions.length === 0 ? [] : [conditions],
          fields: [],
          at: row.at,
        };
        lines.push(created);
        byId.set(row.id, created);
        current = created;
      }
      continue;
    }

    if (current === undefined) {
      if (rows[0] !== row) {
        diagnose(row.at, 'field entry appears before its line entry', 'J24-0215-2 p.43 [verified]');
      }
      continue;
    }
    if (!FORMAT_ENTRIES.has(row.entryKind)) {
      diagnose(row.at, `Format entry type ${row.entryKind || 'blank'} is outside the shared X24 vocabulary`,
        'J24-0215-2 p.43 col 1');
    }
    if (row.entryKind === 'K' && row.name !== '') {
      diagnose(row.at, 'K entries must leave field-name columns 29-34 blank', 'J24-0215-2 p.43 cols 29-34');
    }
    if (row.entryKind === 'W' && !/^WORD\d{2}$/.test(row.name)) {
      diagnose(row.at, 'W entries must be named WORDxx', 'J24-0215-2 p.43');
    }
    if (row.entryKind === 'F' || row.entryKind === 'B') {
      if (!knownFields.has(row.name) && !/^WORD\d{2}$/.test(row.name)) {
        diagnose(row.at, `undefined field name ${row.name || 'blank'}`, 'J24-0215-2 p.43 cols 29-34');
      }
    }
    const end = numeric(row.end);
    if (row.entryKind !== 'W' && end === undefined) {
      diagnose(row.at, 'non-numeric character in a position field', 'J24-0215-2 p.43 cols 35-37',
        columnOf(FORMAT_COLUMNS, 'fieldEnd'));
    } else if (end !== undefined && (end < 1 || end > 132)) {
      diagnose(row.at, `Format field end ${end} is outside print positions 1-132`,
        '1403 Model 2 print width; phase-5-rpg.md §2.2', columnOf(FORMAT_COLUMNS, 'fieldEnd'));
    }
    if (row.zeroSuppress !== '' && row.zeroSuppress !== 'Z') {
      diagnose(row.at, `Format zero-suppress marker ${row.zeroSuppress} is not blank or Z`,
        'J24-0215-2 p.43 col 47', columnOf(FORMAT_COLUMNS, 'zeroSuppress'));
    }
    const declaredLength = numeric(row.length);
    if (row.length !== '' && (declaredLength === undefined || declaredLength < 1 || declaredLength > 25)) {
      diagnose(row.at, `Format constant/edit length ${row.length} is outside cols 51-75`,
        'J24-0215-2 p.43 cols 48-75 [verified]', columnOf(FORMAT_COLUMNS, 'fieldLength'));
    }
    if ((row.entryKind === 'K' || row.entryKind === 'W') && declaredLength === undefined) {
      diagnose(row.at, `${row.entryKind} entry must give a numeric constant/edit length`,
        'J24-0215-2 p.43 cols 48-50', columnOf(FORMAT_COLUMNS, 'fieldLength'));
    }
    const conditions = [...useConditions(row.conditions, row.at)];
    const entryLength = row.entryKind === 'W' ? declaredLength : undefined;
    const literal = row.entryKind === 'W' && entryLength !== undefined
      ? row.literal.padEnd(entryLength)
      : row.literal;
    const entry: FieldEntry = {
      kind: (['F', 'B', 'K', 'W'].includes(row.entryKind) ? row.entryKind : 'F') as FieldEntry['kind'],
      ...(row.name === '' ? {} : { name: row.name }),
      ...(end === undefined ? {} : { end }),
      conditionGroups: conditions.length === 0 ? [] : [conditions],
      zeroSuppress: row.zeroSuppress === 'Z',
      ...(entryLength === undefined ? {} : { length: entryLength }),
      ...(literal === '' ? {} : { literal }),
      at: row.at,
    };
    current.fields.push(entry);
    if (row.entryKind === 'W') {
      if (wordBodies.has(row.name)) {
        diagnose(row.at, `edit word ${row.name} is defined more than once`, 'J24-0215-2 p.43');
      } else {
        wordBodies.set(row.name, { length: declaredLength ?? literal.length, literal });
      }
    }
  }

  const nextLineTargets = new Set(lines.flatMap((line) => (
    line.nextLine === undefined ? [] : [line.nextLine]
  )));
  for (const line of lines) {
    if (nextLineTargets.has(line.id) && line.conditionGroups.length > 0) {
      diagnose(line.at, `Next Line target ${line.id} must leave output conditions blank`,
        'J24-0215-2 p.43 cols 20-28 [verified]',
        columnOf(FORMAT_COLUMNS, 'lineCondition1Not'));
    }
    if (line.type === 'T' && line.conditionGroups.length === 0) {
      diagnose(line.at, 'total line has no output condition in columns 20-28',
        'J24-0215-2 p.43; phase-5-rpg.md §6.2');
    }
    if (line.conditionGroups.length > 1) {
      const withOverflow = line.conditionGroups.filter((group) => group.some((condition) => condition.indicator === 'OF')).length;
      if (withOverflow > 0 && withOverflow !== line.conditionGroups.length) {
        diagnose(line.at, 'OF may participate in an or-group only if it is part of every alternative',
          'J24-0215-2 p.38 [verified]');
      }
    }
    for (const field of line.fields) {
      if ((field.kind !== 'F' && field.kind !== 'B') || field.literal === undefined) continue;
      const word = /^WORD\d{2}$/.test(field.literal) ? wordBodies.get(field.literal) : undefined;
      if (/^WORD\d{2}$/.test(field.literal) && word === undefined) {
        diagnose(field.at, `edit word ${field.literal} is not defined by a W entry`, 'J24-0215-2 p.43');
        continue;
      }
      const body = word?.literal ?? field.literal;
      const width = field.name === undefined ? undefined : fieldWidths.get(field.name);
      const capacity = [...body].filter((glyph) => glyph === ' ' || glyph === '0').length;
      if (EDIT_WORD_IS_THE_1410_MCE_CONTROL_WORD && width !== undefined && width > capacity) {
        diagnose(field.at, `edit word ${field.literal} has ${capacity} digit positions for field ${field.name} width ${width}`,
          'A22-0526-3 p.31 [verified]; phase-5-rpg.md §10.2');
      }
    }
  }

  return lines;
}

function spacingOf(
  text: string,
  name: 'spaceBefore' | 'spaceAfter' | 'skipBefore' | 'skipAfter',
  at: SpecRef,
  diagnose: (at: SpecRef, text: string, cite: string, column?: number) => void,
): Partial<Pick<MutableOutputLine, 'spaceBefore' | 'spaceAfter' | 'skipBefore' | 'skipAfter'>> {
  if (text === '') return {};
  const value = numeric(text);
  if (name === 'spaceBefore' || name === 'spaceAfter') {
    if (value !== 1 && value !== 2 && value !== 3) {
      diagnose(at, `${name} must be 1, 2, or 3`, 'J24-0215-2 p.43 spacing columns',
        columnOf(FORMAT_COLUMNS, name));
      return {};
    }
    return { [name]: value };
  }
  if (value === undefined || value < 1 || value > 12) {
    diagnose(at, `${name} must name carriage channel 1-12`, 'J24-0215-2 p.43 skip columns',
      columnOf(FORMAT_COLUMNS, name));
    return {};
  }
  return { [name]: value };
}

function numeric(text: string): number | undefined {
  return /^\d+$/.test(text) ? Number(text) : undefined;
}

function isSheetIndicator(indicator: string): boolean {
  return /^\d{2}$/.test(indicator)
    || /^(?:F[1-6]|OF|LC|1P|SB|SC|SD)$/.test(indicator);
}

function columnOf(fields: readonly SheetField[], name: string): number | undefined {
  return fieldOf(fields, name)?.cols[0];
}
