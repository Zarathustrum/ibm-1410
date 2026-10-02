import { bcdOfGlyph } from '../core/bcd.js';
import { readBlockStmts } from './emitio.js';
import {
  clearIndicatorFileStmt,
  indicatorAreaStmts,
  indicatorLabel,
  setIndicator,
} from './indicators.js';
import { CARD_IMAGE_LENGTH, type GeneratedStorage } from './layout.js';
import type {
  DataField,
  FieldEntry,
  Layout,
  Model,
  OutputLine,
  Stmt,
} from './types.js';

export const CYCLE_ORDER = [
  'constants', 'init', 'read', 'identify', 'sequence', 'extract',
  'controlBreak', 'totalCalc', 'totalOutput', 'levelReset',
  'detailCalc', 'headingOutput', 'detailOutput', 'lastCard', 'notFound', 'endOfJob', 'areas',
] as const;

export type CycleSection = (typeof CYCLE_ORDER)[number];

export type ExtensibleCycleSection =
  | 'extract'
  | 'sequence'
  | 'totalCalc'
  | 'totalOutput'
  | 'detailCalc'
  | 'headingOutput'
  | 'detailOutput'
  | 'notFound';

export interface CycleLabelAllocator {
  label(key: string): string;
}

export type CycleEmitter = (
  model: Model,
  layout: Layout,
  labels: CycleLabelAllocator,
) => readonly Stmt[];

/**
 * Wave-5 callbacks are invoked in CYCLE_ORDER against one shared label allocator. `extract`
 * replaces the Wave-3 move-only target emitter so calc.ts can preserve every Data-source
 * operation in sheet order. `detailOutput` owns the common exit and must clear every RCnn once
 * before returning to RDCARD; the frozen target already clears RC01 there.
 */
export type CycleEmitters = Partial<Readonly<Record<ExtensibleCycleSection, CycleEmitter>>> & {
  /** Model-derived storage emitted before code and counted by layoutOf's matching third argument. */
  readonly generatedStorage?: (model: Model) => readonly GeneratedStorage[];
  /** Optional Wave-5 EOF route; the two-argument Wave-3 driver still branches straight to LASTCD. */
  readonly readEofTarget?: (model: Model, labels: CycleLabelAllocator) => string;
};

export const CYCLE_SECTION_LABEL: Readonly<Record<CycleSection, string>> = {
  constants: 'ONE',
  init: 'START',
  read: 'RDCARD',
  identify: 'IDENT',
  sequence: 'SEQCHK',
  extract: 'EXTRCT',
  controlBreak: 'CTLBRK',
  totalCalc: 'TOTCAL',
  totalOutput: 'TOTOUT',
  levelReset: 'LVLRST',
  detailCalc: 'DTLCAL',
  headingOutput: 'HDGOUT',
  detailOutput: 'DTLOUT',
  lastCard: 'LASTCD',
  notFound: 'NOTFND',
  endOfJob: 'EOJ',
  areas: 'IND',
};

/**
 * OPEN: `CONTROL_BREAK_AT_LEVEL_N_BREAKS_ALL_MINOR_LEVELS` — `[likely]`. The fall-through
 * ladder implements the universal RPG reading: a break at level n sets Fn and every less
 * significant control-level indicator. Fallback: branch from each set to TOTCAL so only the
 * named level fires. Plan §15; `open-questions.md`, Phase 5 / Wave 3.
 */
export const CONTROL_BREAK_AT_LEVEL_N_BREAKS_ALL_MINOR_LEVELS = true;

/**
 * OPEN: `TOTAL_TIME_PRECEDES_DETAIL_TIME_ON_A_BREAK` — `[verified]` IBM 1401 cycle order,
 * `[likely]` 1410 processor behaviour. IBM 1401 J24-0215-2 pp.31, 35 place total time before
 * the new record's detail time; pp.15, 37 give the associated ascending total-line order.
 * Fallback: put a comparator in total output and re-cut the demo. Plan §15;
 * `rpg-sources.md` §10.2, §10.5; `open-questions.md`, Phase 5 / Wave 3.
 */
export const TOTAL_TIME_PRECEDES_DETAIL_TIME_ON_A_BREAK = true;

/**
 * OPEN: `HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION` — `[unverified]`. IBM 1401
 * J24-0215-2 p.35 names the surrounding phases but does not settle this relative order, and
 * no 1410 processor source in hand does. Fallback: move heading output before detail calculation
 * and re-cut the demo's first-record path. Plan §15; `rpg-sources.md` §10.2, §10.5;
 * `open-questions.md`, Phase 5 / Wave 3.
 */
export const HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION = true;

const RUNTIME_MESSAGE_RECORD_NOT_FOUND = 'RECORD TYPE NOT FOUND';
const RUNTIME_MESSAGE_INPUT_OUT_OF_SEQ = 'INPUT REC OUT OF SEQ';
const RESERVED_COUNTERS = new Set(['PAGENO', 'SER', 'RCT']);
const HUNDREDS = 100;

function labelled(label: string, stmt: Stmt): Stmt {
  return { ...stmt, label };
}

function addressLabel(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(3, '0')}`;
}

function cycleLabelAllocator(): CycleLabelAllocator {
  const labels = new Map<string, string>();
  return {
    label(key: string): string {
      const present = labels.get(key);
      if (present !== undefined) return present;
      const label = addressLabel('Z', labels.size + 1);
      labels.set(key, label);
      return label;
    },
  };
}

function zeros(n: number): string {
  return `@${'0'.repeat(n)}@`;
}

function uniqueByName<T extends { readonly name: string }>(items: readonly T[]): readonly T[] {
  const names = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (names.has(item.name)) continue;
    names.add(item.name);
    result.push(item);
  }
  return result;
}

function storageNamesOf(model: Model): ReadonlySet<string> {
  const names = new Set(model.fields.map((field) => field.name));
  for (const calc of model.calcs) {
    if (calc.result !== undefined) names.add(calc.result);
  }
  return names;
}

function leadingLiteralTextsOf(model: Model): ReadonlySet<string> {
  const texts = new Set<string>(['1']);
  const storageNames = storageNamesOf(model);
  for (const calc of model.calcs) {
    if (calc.factor1 !== undefined && !storageNames.has(calc.factor1.text)) texts.add(calc.factor1.text);
    if (calc.factor2 !== undefined && !storageNames.has(calc.factor2.text)) texts.add(calc.factor2.text);
  }
  return texts;
}

function kFields(line: OutputLine): readonly FieldEntry[] {
  return line.fields.filter((field) => field.kind === 'K' && field.literal !== undefined);
}

/**
 * Assign one monotonic Knnn per distinct literal. The traversal is deterministic and contains no
 * report text: generator/calculation literals first; then the first K field of each total line,
 * headings, details, remaining total fields, and the recovered runtime messages. That ordering
 * preserves the frozen target's constant bytes while the counter itself obeys plan §8.4.
 */
export function literalLabelsOf(model: Model): ReadonlyMap<string, string> {
  const labels = new Map<string, string>();
  const storageNames = storageNamesOf(model);
  const add = (text: string | undefined): void => {
    if (text === undefined || labels.has(text)) return;
    labels.set(text, addressLabel('K', labels.size + 1));
  };

  add('1');
  for (const calc of model.calcs) {
    if (calc.factor1 !== undefined && !storageNames.has(calc.factor1.text)) add(calc.factor1.text);
    if (calc.factor2 !== undefined && !storageNames.has(calc.factor2.text)) add(calc.factor2.text);
  }

  const totalLines = model.lines.filter((line) => line.type === 'T');
  for (const line of totalLines) add(kFields(line)[0]?.literal);
  for (const line of model.lines.filter((candidate) => candidate.type === 'H')) {
    for (const field of kFields(line)) add(field.literal);
  }
  for (const line of model.lines.filter((candidate) => candidate.type === 'D')) {
    for (const field of kFields(line)) add(field.literal);
  }
  for (const line of totalLines) {
    for (const field of kFields(line).slice(1)) add(field.literal);
  }

  add(RUNTIME_MESSAGE_RECORD_NOT_FOUND);
  if (model.sequenceField !== undefined) {
    add(RUNTIME_MESSAGE_INPUT_OUT_OF_SEQ);
  }
  // Inline edit bodies are literals too. They join the same monotonic Knnn stream after the
  // recovered runtime texts; a WORDxx token names the separately emitted reusable control word.
  for (const line of model.lines) {
    for (const field of line.fields) {
      if ((field.kind === 'F' || field.kind === 'B')
        && field.literal !== undefined
        && !/^WORD\d{2}$/.test(field.literal)) {
        add(field.literal);
      }
    }
  }
  return labels;
}

function accumulatorResults(model: Model): readonly { readonly name: string; readonly length: number }[] {
  return model.calcs.flatMap((calc) => (
    calc.result !== undefined
      && calc.length !== undefined
      && (calc.accumulate === 'A' || calc.accumulate === 'S')
      ? [{ name: calc.result, length: calc.length }]
      : []
  ));
}

function reservedDataFields(model: Model): readonly DataField[] {
  return model.fields.filter((field) => RESERVED_COUNTERS.has(field.name));
}

function regularDataFields(model: Model): readonly DataField[] {
  return model.fields.filter((field) => !RESERVED_COUNTERS.has(field.name));
}

function remainingCalcResults(model: Model): readonly { readonly name: string; readonly length: number }[] {
  const accumulatorNames = new Set(accumulatorResults(model).map((field) => field.name));
  return model.calcs.flatMap((calc) => (
    calc.result !== undefined && calc.length !== undefined && !accumulatorNames.has(calc.result)
      ? [{ name: calc.result, length: calc.length }]
      : []
  ));
}

function numericDataField(field: DataField, calcNames: ReadonlySet<string>): boolean {
  return RESERVED_COUNTERS.has(field.name)
    || calcNames.has(field.name)
    || field.sources.some((source) => source.numeric);
}

function fieldLengthsOf(model: Model): ReadonlyMap<string, number> {
  const lengths = new Map(model.fields.map((field) => [field.name, field.length] as const));
  for (const calc of model.calcs) {
    if (calc.result !== undefined && calc.length !== undefined) lengths.set(calc.result, calc.length);
  }
  return lengths;
}

function longestResetField(model: Model): number {
  const lengths = fieldLengthsOf(model);
  let longest = 0;
  for (const line of model.lines) {
    for (const field of line.fields) {
      if (field.kind === 'B' && field.name !== undefined) {
        longest = Math.max(longest, lengths.get(field.name) ?? 0);
      }
    }
  }
  return longest;
}

function wordEntries(model: Model): readonly (FieldEntry & {
  readonly name: string;
  readonly literal: string;
})[] {
  const entries: (FieldEntry & { readonly name: string; readonly literal: string })[] = [];
  for (const line of model.lines) {
    for (const field of line.fields) {
      if (field.kind === 'W' && field.name !== undefined && field.literal !== undefined) {
        entries.push({ ...field, name: field.name, literal: field.literal });
      }
    }
  }
  return uniqueByName(entries);
}

function constantsStmts(
  model: Model,
  generatedStorage: readonly GeneratedStorage[],
  labels: CycleLabelAllocator,
): readonly Stmt[] {
  const stmts: Stmt[] = [
    { label: 'ONE', op: 'DCW', operands: ['@1@'] },
    { label: 'ZERO', op: 'DCW', operands: ['@0@'] },
    { label: 'FIVE', op: 'DCW', operands: ['@5@'] },
  ];

  const leadingLiterals = leadingLiteralTextsOf(model);
  for (const [text, label] of literalLabelsOf(model)) {
    if (leadingLiterals.has(text)) stmts.push({ label, op: 'DCW', operands: [`@${text}@`] });
  }

  if (model.indicators.length > 0) {
    stmts.push({ label: 'IZERO', op: 'DCW', operands: [zeros(model.indicators.length)] });
  }
  const resetLength = longestResetField(model);
  if (resetLength > 0) stmts.push({ label: 'ZEROS', op: 'DCW', operands: [zeros(resetLength)] });

  const calcNames = new Set(model.calcs.flatMap((calc) => (
    calc.result === undefined ? [] : [calc.result]
  )));
  const storage = uniqueByName([
    ...accumulatorResults(model),
    ...reservedDataFields(model),
    ...regularDataFields(model),
    ...remainingCalcResults(model),
  ]);
  const dataByName = new Map(model.fields.map((field) => [field.name, field] as const));
  for (const field of storage) {
    const data = dataByName.get(field.name);
    const numeric = data === undefined || numericDataField(data, calcNames);
    stmts.push({
      label: field.name,
      op: 'DCW',
      operands: [numeric ? zeros(field.length) : `#${field.length}`],
    });
  }

  for (const field of model.controlFields) {
    stmts.push({ label: `CN${field.n}`, op: 'DCW', operands: [zeros(field.length)] });
  }
  for (const field of model.controlFields) {
    stmts.push({ label: `CO${field.n}`, op: 'DCW', operands: [zeros(field.length)] });
  }
  for (const word of wordEntries(model)) {
    stmts.push({ label: word.name, op: 'DCW', operands: [`@${word.literal}@`] });
  }
  for (const storage of generatedStorage) {
    stmts.push({
      label: labels.label(storage.key),
      op: 'DCW',
      operands: [storage.fill === 'zero' ? zeros(storage.length) : `#${storage.length}`],
    });
  }

  const nonLeadingLabels = new Set(stmts.map((stmt) => stmt.label));
  for (const [text, label] of literalLabelsOf(model)) {
    if (nonLeadingLabels.has(label)) continue;
    stmts.push({ label, op: 'DCW', operands: [`@${text}@`] });
  }
  return stmts;
}

/**
 * The program's first act: clear the indicator file and the card image, data AND word marks, so a
 * prior job's marks cannot change this one's result (`CARD_AREA_IS_CLEARED_AT_ENTRY_AND_HUNDREDS_
 * ALIGNED`, layout.ts). `[verified]` CS clears from its B address down through the nearest
 * hundreds position (A22-0526-3 p.23); IND starts on one, so one CS per hundreds block from
 * CDIN's last column reaches exactly IND and touches neither the code below it nor PLINE above.
 * The loaded constants need no clearing — the loader writes their marks — and PLINE is CS-cleared
 * before every line. The clear comes before MLCA IZERO, which then puts the indicators at 0.
 */
function clearCardAreaStmts(layout: Layout): readonly Stmt[] {
  const base = layout.indicatorFile === layout.cardIn ? 'CDIN' : 'IND';
  const top = layout.cardIn + CARD_IMAGE_LENGTH - 1;
  const stmts: Stmt[] = [];
  for (let at = top; at >= layout.indicatorFile; at = Math.floor(at / HUNDREDS) * HUNDREDS - 1) {
    const operand = `${base}+${at - layout.indicatorFile}`;
    const pad = ' '.repeat(Math.max(2, 19 - operand.length));
    stmts.push({
      op: 'CS',
      operands: [operand],
      ...(at === top ? { comment: `${pad}CARD AREA AND INDICATORS` } : {}),
    });
  }
  return stmts;
}

function initStmts(model: Model, layout: Layout): readonly Stmt[] {
  const clear = clearIndicatorFileStmt(model)
    ?? { op: 'MLCA', operands: ['IZERO', indicatorLabel('PRIME')] };
  const [first, ...rest] = clearCardAreaStmts(layout);
  const stmts: Stmt[] = [
    labelled('START', first!), ...rest, clear, { op: 'SW', operands: ['PLGM'] },
  ];
  if (model.indicators.includes('1P')) stmts.push(setIndicator('1P', true));
  return stmts;
}

function readStmts(eof: string): readonly Stmt[] {
  const block = readBlockStmts({
    unit: 'reader', direction: 'read', mode: 'move', pocket: '0', area: 'CDIN',
  }, eof);
  return block.map((stmt, index) => index === 0 ? labelled('RDCARD', stmt) : stmt);
}

function bitEqualityStmts(
  position: number,
  code: string,
  compare: 'Z' | 'D' | 'C',
  equal: string,
  unequal: string,
  key: string,
  labels: CycleLabelAllocator,
): readonly Stmt[] {
  // `[verified]` machine primitive: full-form BBE tests one selected B-address bit and a miss
  // leaves BAR = B-1 (IBM 1410 A22-0526-3 pp.37-38; `opcodes.md` §2 W). Repeating the explicit
  // Cnnn address prevents that miss side effect from changing the next test. The six/four-bit
  // sequence below is OUR Boolean composition, not a recovered IBM RPG processor sequence.
  const value = bcdOfGlyph(code) ?? 0;
  const zoneMasks = [{ bit: 0o40, glyph: '-' }, { bit: 0o20, glyph: 'ƀ' }];
  const digitMasks = [
    { bit: 0o10, glyph: '8' },
    { bit: 0o04, glyph: '4' },
    { bit: 0o02, glyph: '2' },
    { bit: 0o01, glyph: '1' },
  ];
  const masks = compare === 'Z'
    ? zoneMasks
    : compare === 'D' ? digitMasks : [...zoneMasks, ...digitMasks];
  const stmts: Stmt[] = [];
  let entry: string | undefined;
  for (const [index, mask] of masks.entries()) {
    const expected = (value & mask.bit) !== 0;
    const continuation = expected ? labels.label(`${key}:bit:${index}`) : undefined;
    stmts.push({
      ...(entry === undefined ? {} : { label: entry }),
      op: 'BBE',
      operands: [expected ? continuation! : unequal, addressLabel('C', position), mask.glyph],
    });
    if (expected) stmts.push({ op: 'B', operands: [unequal] });
    entry = continuation;
  }
  stmts.push({
    ...(entry === undefined ? {} : { label: entry }),
    op: 'B',
    operands: [equal],
  });
  return stmts;
}

function equalityStmts(
  position: number,
  code: string,
  compare: 'Z' | 'D' | 'C',
  equal: string,
  unequal: string,
  key: string,
  labels: CycleLabelAllocator,
): readonly Stmt[] {
  // `[verified]`: BCE compares one exact B-address character (IBM 1410 A22-0526-3 p.37). Of the
  // 64 glyphs, only blank (trimmed) and comma (operand separator) cannot round-trip as its written
  // d through the free-form source field. Use the constructed BBE composition for those two and
  // for Z/D; keep BCE for all other 62 full-character codes, including `@` and `ƀ`.
  if (compare !== 'C' || code === ' ' || code === ',') {
    return bitEqualityStmts(position, code, compare, equal, unequal, key, labels);
  }
  return [
    { op: 'BCE', operands: [equal, addressLabel('C', position), code] },
    { op: 'B', operands: [unequal] },
  ];
}

function identifyStmts(model: Model, labels: CycleLabelAllocator): readonly Stmt[] {
  if (model.records.length === 0) return [{ label: 'IDENT', op: 'B', operands: ['NOTFND'] }];
  const stmts: Stmt[] = [];
  for (const [recordIndex, record] of model.records.entries()) {
    const recordTest = recordIndex === 0
      ? 'IDENT'
      : labels.label(`identify:record:${recordIndex}`);
    const success = labels.label(`identify:success:${recordIndex}`);
    const failure = recordIndex + 1 < model.records.length
      ? labels.label(`identify:record:${recordIndex + 1}`)
      : 'NOTFND';

    if (record.codes.length === 0) {
      stmts.push({ label: recordTest, op: 'B', operands: [success] });
    }
    for (const [codeIndex, code] of record.codes.entries()) {
      const last = codeIndex + 1 === record.codes.length;
      const pass = last ? success : labels.label(`identify:${recordIndex}:code:${codeIndex + 1}`);
      const equal = code.not ? failure : pass;
      const unequal = code.not ? pass : failure;
      const test = equalityStmts(
        code.position,
        code.code,
        code.compare,
        equal,
        unequal,
        `identify:${recordIndex}:code:${codeIndex}`,
        labels,
      );
      const entry = codeIndex === 0
        ? recordTest
        : labels.label(`identify:${recordIndex}:code:${codeIndex}`);
      stmts.push(labelled(entry, test[0]!), ...test.slice(1));
    }
    stmts.push(labelled(success, setIndicator(record.condition, true)));
    if (recordIndex + 1 < model.records.length) {
      stmts.push({ op: 'B', operands: [model.sequenceField === undefined ? 'EXTRCT' : 'SEQCHK'] });
    }
  }
  return stmts;
}

function descendingControls(model: Model) {
  return [...model.controlFields].sort((left, right) => right.n - left.n);
}

function extractStmts(model: Model): readonly Stmt[] {
  const stmts: Stmt[] = [];
  for (const field of descendingControls(model)) {
    stmts.push({ op: 'MLC', operands: [addressLabel('C', field.end), `CN${field.n}`] });
  }
  for (const field of model.fields) {
    for (const source of field.sources) {
      if (source.kind === 'record' && source.end !== undefined && source.operation === 'move') {
        stmts.push({ op: 'MLC', operands: [addressLabel('C', source.end), field.name] });
      }
    }
  }
  const first = stmts[0] ?? { op: 'B', operands: ['CTLBRK'] };
  return [labelled('EXTRCT', first), ...stmts.slice(1)];
}

function controlBreakStmts(model: Model, labels: CycleLabelAllocator): readonly Stmt[] {
  const controls = descendingControls(model);
  if (controls.length === 0) return [{ label: 'CTLBRK', op: 'B', operands: ['DTLCAL'] }];

  const afterFirstRecord = labels.label('controlBreak:compare');

  const stmts: Stmt[] = [
    { label: 'CTLBRK', op: 'BCE', operands: [afterFirstRecord, indicatorLabel('PRIME'), '1'] },
    setIndicator('PRIME', true),
  ];
  for (const field of controls) stmts.push({ op: 'MLC', operands: [`CN${field.n}`, `CO${field.n}`] });
  stmts.push({ op: 'B', operands: ['DTLCAL'] });
  for (const [index, field] of controls.entries()) {
    stmts.push({
      ...(index === 0 ? { label: afterFirstRecord } : {}),
      op: 'C',
      operands: [`CO${field.n}`, `CN${field.n}`],
    });
    stmts.push({ op: 'BU', operands: [labels.label(`controlBreak:level:${field.n}`)] });
  }
  stmts.push({ op: 'B', operands: ['DTLCAL'] });
  for (const field of controls) {
    stmts.push(labelled(labels.label(`controlBreak:level:${field.n}`), setIndicator(`F${field.n}`, true)));
  }
  return stmts;
}

function levelResetStmts(model: Model): readonly Stmt[] {
  const stmts: Stmt[] = [];
  for (const field of descendingControls(model)) {
    stmts.push({ op: 'MLC', operands: [`CN${field.n}`, `CO${field.n}`] });
  }
  for (const field of model.controlFields) stmts.push(setIndicator(`F${field.n}`, false));
  stmts.push({ op: 'BCE', operands: ['EOJ', indicatorLabel('LC'), '1'] });
  return [labelled('LVLRST', stmts[0]!), ...stmts.slice(1)];
}

function lastCardStmts(model: Model): readonly Stmt[] {
  return [
    labelled('LASTCD', setIndicator('LC', true)),
    ...model.controlFields.map((field) => setIndicator(`F${field.n}`, true)),
    { op: 'B', operands: ['TOTCAL'] },
  ];
}

function endOfJobStmts(): readonly Stmt[] {
  return [
    { label: 'EOJ', op: 'CC1', operands: ['1'] },
    { op: 'BA1', operands: ['*+1'] },
    { op: 'H', operands: [] },
  ];
}

function referencedCardPositions(model: Model): readonly number[] {
  const positions = new Set<number>();
  for (const record of model.records) {
    for (const code of record.codes) positions.add(code.position);
  }
  for (const field of model.controlFields) positions.add(field.end);
  for (const field of model.fields) {
    for (const source of field.sources) {
      if (source.kind === 'record' && source.end !== undefined) positions.add(source.end);
    }
  }
  return [...positions].sort((left, right) => left - right);
}

function areaStmts(model: Model, layout: Layout): readonly Stmt[] {
  return [
    { op: 'ORG', operands: [String(layout.indicatorFile).padStart(5, '0')] },
    ...indicatorAreaStmts(model),
    { label: 'CDIN', op: 'DA', operands: ['1X80'] },
    ...referencedCardPositions(model).map((position): Stmt => ({
      label: addressLabel('C', position), op: '', operands: [String(position)],
    })),
    { op: 'ORG', operands: [String(layout.printLine).padStart(5, '0')] },
    { label: 'PLINE', indent: true, op: 'DS', operands: ['132'] },
    { label: 'PLGM', op: 'DC', operands: ['@⧧@'] },
  ];
}

export function driver(
  model: Model,
  layout: Layout,
  emitters: CycleEmitters = {},
): ReadonlyMap<CycleSection, readonly Stmt[]> {
  const sections = new Map<CycleSection, readonly Stmt[]>();
  const labels = cycleLabelAllocator();
  const generatedStorage = emitters.generatedStorage?.(model) ?? [];
  for (const section of CYCLE_ORDER) {
    switch (section) {
      case 'constants': sections.set(section, constantsStmts(model, generatedStorage, labels)); break;
      case 'init': sections.set(section, initStmts(model, layout)); break;
      case 'read': sections.set(
        section,
        readStmts(emitters.readEofTarget?.(model, labels) ?? 'LASTCD'),
      ); break;
      case 'identify': sections.set(section, identifyStmts(model, labels)); break;
      case 'extract': sections.set(
        section,
        emitters.extract?.(model, layout, labels) ?? extractStmts(model),
      ); break;
      case 'controlBreak': sections.set(section, controlBreakStmts(model, labels)); break;
      case 'levelReset': sections.set(section, levelResetStmts(model)); break;
      case 'lastCard': sections.set(section, lastCardStmts(model)); break;
      case 'endOfJob': sections.set(section, endOfJobStmts()); break;
      case 'areas': sections.set(section, areaStmts(model, layout)); break;
      default: sections.set(section, emitters[section]?.(model, layout, labels) ?? []);
    }
  }
  return sections;
}
