import {
  literalLabelsOf,
  type CycleEmitter,
  type CycleEmitters,
  type CycleLabelAllocator,
} from './cycle.js';
import { carriageStmt, ioStmt, senseOverflowStmts } from './emitio.js';
import { conditionStmts, indicatorLabel, setIndicator } from './indicators.js';
import type { GeneratedStorage } from './layout.js';
import type { Condition, FieldEntry, Model, OutputLine, RecordType, Stmt } from './types.js';

const RECORD_NOT_FOUND = 'RECORD TYPE NOT FOUND';
const INPUT_OUT_OF_SEQUENCE = 'INPUT REC OUT OF SEQ';

type LineType = OutputLine['type'];
type SkipChannel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

function labelled(label: string | undefined, stmt: Stmt): Stmt {
  return label === undefined ? stmt : { ...stmt, label };
}

function printPosition(end: number): string {
  return `PLINE+${end - 1}`;
}

function positionAdjustsOf(model: Model): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  for (const step of model.calcs) {
    if (step.result !== undefined && step.positionAdjust !== undefined) {
      result.set(step.result, step.positionAdjust);
    }
  }
  return result;
}

function adjustedField(model: Model, name: string): string {
  const adjust = positionAdjustsOf(model).get(name) ?? 0;
  return adjust === 0 ? name : `${name}-${adjust}`;
}

function outputFields(
  model: Model,
  line: OutputLine,
  labels: CycleLabelAllocator,
  key: string,
): readonly Stmt[] {
  const literals = literalLabelsOf(model);
  const result: Stmt[] = [];
  for (const [index, field] of line.fields.entries()) {
    if (field.kind === 'W' || field.end === undefined) continue;
    const body: Stmt[] = [];
    if (field.kind === 'K') {
      const constant = field.literal === undefined ? undefined : literals.get(field.literal);
      if (constant !== undefined) {
        body.push({ op: 'MLCA', operands: [constant, printPosition(field.end)], from: field.at });
      }
    } else if (field.name !== undefined) {
      const source = adjustedField(model, field.name);
      if (field.literal !== undefined) {
        const control = /^WORD\d{2}$/.test(field.literal)
          ? field.literal
          : literals.get(field.literal);
        if (control !== undefined) {
          body.push(
            { op: 'MLCWA', operands: [control, printPosition(field.end)], from: field.at },
            { op: 'MCE', operands: [source, printPosition(field.end)], from: field.at },
          );
        }
      } else {
        body.push({
          op: field.zeroSuppress ? 'MCS' : 'MLCA',
          operands: [source, printPosition(field.end)],
          from: field.at,
        });
      }
    }
    if (field.conditionGroups.length === 0) {
      result.push(...body);
    } else {
      const skip = labels.label(`${key}:field:${index}:skip`);
      result.push(
        ...guardAlternatives(field.conditionGroups, body, skip, labels, `${key}:field:${index}`),
        { label: skip, op: 'NOP', operands: [] },
      );
    }
  }
  return result;
}

function resetFields(
  line: OutputLine,
  labels: CycleLabelAllocator,
  key: string,
): readonly Stmt[] {
  const resets = new Map<string, {
    readonly at: FieldEntry['at'];
    conditionGroups: (readonly Condition[])[];
  }>();
  for (const field of line.fields) {
    if (field.kind !== 'B' || field.name === undefined) continue;
    const present = resets.get(field.name);
    if (present === undefined) {
      resets.set(field.name, { at: field.at, conditionGroups: [...field.conditionGroups] });
    } else if (present.conditionGroups.length !== 0) {
      present.conditionGroups = field.conditionGroups.length === 0
        ? []
        : [...present.conditionGroups, ...field.conditionGroups];
    }
  }

  const result: Stmt[] = [];
  for (const [index, [name, reset]] of [...resets].entries()) {
    const body = [{ op: 'MLCB', operands: ['ZEROS', name], from: reset.at }] satisfies Stmt[];
    if (reset.conditionGroups.length === 0) {
      result.push(...body);
    } else {
      const skip = labels.label(`${key}:reset:${index}:skip`);
      result.push(
        ...guardAlternatives(reset.conditionGroups, body, skip, labels, `${key}:reset:${index}`),
        { label: skip, op: 'NOP', operands: [] },
      );
    }
  }
  return result;
}

function guardAlternatives(
  groups: readonly (readonly Condition[])[],
  body: readonly Stmt[],
  failure: string,
  labels: CycleLabelAllocator,
  key: string,
  entry?: string,
): readonly Stmt[] {
  if (body.length === 0) return [];
  if (groups.length === 0) return [labelled(entry, body[0]!), ...body.slice(1)];
  if (groups.length === 1) {
    const guards = conditionStmts(groups[0]!, failure);
    if (guards.length === 0) return [labelled(entry, body[0]!), ...body.slice(1)];
    return [labelled(entry, guards[0]!), ...guards.slice(1), ...body];
  }

  const bodyLabel = labels.label(`${key}:body`);
  const result: Stmt[] = [];
  for (const [index, group] of groups.entries()) {
    const alternative = index === 0 ? entry : labels.label(`${key}:or:${index}`);
    const next = index + 1 < groups.length
      ? labels.label(`${key}:or:${index + 1}`)
      : failure;
    const guards = conditionStmts(group, next);
    if (guards.length === 0) {
      result.push({ ...(alternative === undefined ? {} : { label: alternative }), op: 'B', operands: [bodyLabel] });
    } else {
      result.push(labelled(alternative, guards[0]!), ...guards.slice(1));
      result.push({ op: 'B', operands: [bodyLabel] });
    }
  }
  result.push(labelled(bodyLabel, body[0]!), ...body.slice(1));
  return result;
}

function beforeMotion(line: OutputLine): readonly Stmt[] {
  if (line.skipBefore !== undefined) {
    return carriageStmt({ kind: 'skip', when: 'immediate', n: line.skipBefore as SkipChannel });
  }
  if (line.spaceBefore !== undefined) {
    return carriageStmt({ kind: 'space', when: 'immediate', n: line.spaceBefore });
  }
  return [];
}

function afterMotion(line: OutputLine): readonly Stmt[] {
  if (line.skipAfter !== undefined) {
    return carriageStmt({ kind: 'skip', when: 'afterPrint', n: line.skipAfter as SkipChannel });
  }
  return carriageStmt({ kind: 'space', when: 'afterPrint', n: line.spaceAfter ?? 1 });
}

function physicalLineStmts(
  model: Model,
  line: OutputLine,
  labels: CycleLabelAllocator,
  key: string,
  incrementPage: boolean,
): readonly Stmt[] {
  const result: Stmt[] = [
    { op: 'CS', operands: ['PLINE+131'], from: line.at },
    { op: 'CS', operands: ['PLINE+99'], from: line.at },
  ];
  if (incrementPage) result.push({ op: 'A', operands: ['K001', 'PAGENO'], from: line.at });
  result.push(...outputFields(model, line, labels, key));
  result.push(...beforeMotion(line));
  result.push(...ioStmt({
    unit: 'printer', direction: 'write', mode: 'move', area: 'PLINE',
  }));

  const motion = afterMotion(line);
  if (line.type === 'D' || line.type === 'T') {
    const done = labels.label(`${key}:overflow:done`);
    result.push(...senseOverflowStmts('OF', done));
    result.push(labelled(done, motion[0]!), ...motion.slice(1));
  } else {
    result.push(...motion);
  }
  result.push(...resetFields(line, labels, key));
  return result;
}

function rootsOf(model: Model, type: LineType): readonly OutputLine[] {
  const referenced = new Set(model.lines.flatMap((line) => (
    line.nextLine === undefined ? [] : [line.nextLine]
  )));
  return model.lines.filter((line) => line.type === type && !referenced.has(line.id));
}

function chainOf(model: Model, root: OutputLine): readonly OutputLine[] {
  const byId = new Map(model.lines.map((line) => [line.id, line] as const));
  const result: OutputLine[] = [];
  const seen = new Set<string>();
  let current: OutputLine | undefined = root;
  while (current !== undefined && !seen.has(current.id)) {
    result.push(current);
    seen.add(current.id);
    current = current.nextLine === undefined ? undefined : byId.get(current.nextLine);
  }
  return result;
}

function lineChainStmts(
  model: Model,
  root: OutputLine,
  labels: CycleLabelAllocator,
  key: string,
): readonly Stmt[] {
  const chain = chainOf(model, root);
  const increment = root.type === 'H'
    && chain.some((line) => line.fields.some((field) => field.name === 'PAGENO'));
  return chain.flatMap((line, index) => physicalLineStmts(
    model,
    line,
    labels,
    `${key}:line:${index}`,
    increment && index === 0,
  ));
}

function singleRecordCondition(model: Model, groups: readonly (readonly Condition[])[]): boolean {
  const condition = model.records[0]?.condition;
  return model.records.length === 1
    && groups.length === 1
    && groups[0]?.length === 1
    && groups[0]?.[0]?.indicator === condition
    && groups[0]?.[0]?.negated === false;
}

export const totalOutputStmts: CycleEmitter = (model, _layout, labels) => {
  const roots = rootsOf(model, 'T');
  if (roots.length === 0) return [{ label: 'TOTOUT', op: 'B', operands: ['LVLRST'] }];
  const result: Stmt[] = [];
  for (const [index, root] of roots.entries()) {
    const entry = index === 0 ? 'TOTOUT' : labels.label(`total:${index}:entry`);
    const failure = index + 1 < roots.length
      ? labels.label(`total:${index + 1}:entry`)
      : 'LVLRST';
    result.push(...guardAlternatives(
      root.conditionGroups,
      lineChainStmts(model, root, labels, `total:${index}`),
      failure,
      labels,
      `total:${index}:line`,
      entry,
    ));
  }
  return result;
};

export const headingOutputStmts: CycleEmitter = (model, _layout, labels) => {
  const roots = rootsOf(model, 'H');
  if (roots.length === 0) return [{ label: 'HDGOUT', op: 'B', operands: ['DTLOUT'] }];
  const result: Stmt[] = [];
  for (const [index, root] of roots.entries()) {
    const entry = index === 0 ? 'HDGOUT' : labels.label(`heading:${index}:entry`);
    const failure = index + 1 < roots.length
      ? labels.label(`heading:${index + 1}:entry`)
      : 'DTLOUT';
    const body: Stmt[] = [...lineChainStmts(model, root, labels, `heading:${index}`)];
    const latches = new Set(root.conditionGroups.flatMap((group) => group
      .filter((condition) => !condition.negated && (condition.indicator === '1P' || condition.indicator === 'OF'))
      .map((condition) => condition.indicator)));
    for (const latch of latches) body.push(setIndicator(latch, false));
    if (index + 1 < roots.length) body.push({ op: 'B', operands: ['DTLOUT'] });
    result.push(...guardAlternatives(
      root.conditionGroups,
      body,
      failure,
      labels,
      `heading:${index}:root`,
      entry,
    ));
  }
  return result;
};

export const detailOutputStmts: CycleEmitter = (model, _layout, labels) => {
  const roots = rootsOf(model, 'D');
  if (roots.length === 0) {
    const clears = [...new Set(model.records.map((record) => record.condition))]
      .map((condition) => setIndicator(condition, false));
    if (clears.length === 0) return [{ label: 'DTLOUT', op: 'B', operands: ['RDCARD'] }];
    return [labelled('DTLOUT', clears[0]!), ...clears.slice(1), { op: 'B', operands: ['RDCARD'] }];
  }

  const exit = labels.label('detail:exit');
  const result: Stmt[] = [];
  for (const [index, root] of roots.entries()) {
    const entry = index === 0 ? 'DTLOUT' : labels.label(`detail:${index}:entry`);
    const failure = index + 1 < roots.length
      ? labels.label(`detail:${index + 1}:entry`)
      : exit;
    const groups = singleRecordCondition(model, root.conditionGroups) ? [] : root.conditionGroups;
    result.push(...guardAlternatives(
      groups,
      lineChainStmts(model, root, labels, `detail:${index}`),
      failure,
      labels,
      `detail:${index}:root`,
      entry,
    ));
  }
  const conditions = [...new Set(model.records.map((record) => record.condition))];
  const first = conditions.length === 0
    ? { label: exit, op: 'B', operands: ['RDCARD'] } satisfies Stmt
    : labelled(exit, setIndicator(conditions[0]!, false));
  result.push(first);
  for (const condition of conditions.slice(1)) result.push(setIndicator(condition, false));
  if (conditions.length > 0) result.push({ op: 'B', operands: ['RDCARD'] });
  return result;
};

function runtimeMessageStmts(
  model: Model,
  text: string,
  target: string,
  label: string,
): readonly Stmt[] {
  const constant = literalLabelsOf(model).get(text);
  const move: Stmt[] = constant === undefined ? [] : [{
    op: 'MLCA', operands: [constant, printPosition(text.length)],
  }];
  const body: Stmt[] = [
    { label, op: 'CS', operands: ['PLINE+131'] },
    { op: 'CS', operands: ['PLINE+99'] },
    ...move,
    ...ioStmt({ unit: 'printer', direction: 'write', mode: 'move', area: 'PLINE' }),
    ...carriageStmt({ kind: 'space', when: 'afterPrint', n: 1 }),
    { op: 'B', operands: [target] },
  ];
  return body;
}

export const notFoundStmts: CycleEmitter = (model) => (
  runtimeMessageStmts(model, RECORD_NOT_FOUND, 'RDCARD', 'NOTFND')
);

function numericRecords(model: Model): readonly RecordType[] {
  return model.records.filter((record) => /^\d{2}$/.test(record.seq ?? ''));
}

function sequenceControl(model: Model) {
  return model.controlFields.find((field) => field.n === model.sequenceField);
}

function sequenceStateKeys(model: Model): readonly GeneratedStorage[] {
  const control = sequenceControl(model);
  if (model.sequenceField === undefined || control === undefined) return [];
  const records = numericRecords(model);
  return [
    { key: 'sequence:started', length: 1, fill: 'zero' },
    { key: 'sequence:current', length: control.length, fill: 'blank' },
    { key: 'sequence:previous', length: control.length, fill: 'blank' },
    ...records.map((_record, index): GeneratedStorage => ({
      key: `sequence:seen:${index}`, length: 1, fill: 'zero',
    })),
    ...records.flatMap((record, index): readonly GeneratedStorage[] => (
      record.number === 'N'
        ? [{ key: `sequence:many:${index}`, length: 1, fill: 'zero' }]
        : []
    )),
  ];
}

export function outputStorageOf(model: Model): readonly GeneratedStorage[] {
  return sequenceStateKeys(model);
}

function stateLabel(labels: CycleLabelAllocator, key: string): string {
  return labels.label(`sequence:${key}`);
}

function validateCompleted(
  record: RecordType,
  index: number,
  error: string,
  labels: CycleLabelAllocator,
  key: string,
): readonly Stmt[] {
  const seen = stateLabel(labels, `seen:${index}`);
  if (record.number === '1') {
    return record.optional ? [] : [{ op: 'BCE', operands: [error, seen, '0'] }];
  }
  const many = stateLabel(labels, `many:${index}`);
  if (!record.optional) return [{ op: 'BCE', operands: [error, many, '0'] }];
  const pass = labels.label(`${key}:optional-n:${index}:pass`);
  return [
    { op: 'BCE', operands: [pass, seen, '0'] },
    { op: 'BCE', operands: [error, many, '0'] },
    { label: pass, op: 'NOP', operands: [] },
  ];
}

function requireUnseen(
  indexes: readonly number[],
  error: string,
  labels: CycleLabelAllocator,
): readonly Stmt[] {
  const result: Stmt[] = [];
  for (const index of indexes) {
    const pass = labels.label(`sequence:unseen:${index}:${result.length}:pass`);
    result.push(
      { op: 'BCE', operands: [pass, stateLabel(labels, `seen:${index}`), '0'] },
      { op: 'B', operands: [error] },
      { label: pass, op: 'NOP', operands: [] },
    );
  }
  return result;
}

function resetSequenceState(records: readonly RecordType[], labels: CycleLabelAllocator): readonly Stmt[] {
  const result: Stmt[] = [];
  for (const [index, record] of records.entries()) {
    result.push({ op: 'MLCS', operands: ['ZERO', stateLabel(labels, `seen:${index}`)] });
    if (record.number === 'N') {
      result.push({ op: 'MLCS', operands: ['ZERO', stateLabel(labels, `many:${index}`)] });
    }
  }
  return result;
}

function validateGroup(
  records: readonly RecordType[],
  error: string,
  labels: CycleLabelAllocator,
  key: string,
): readonly Stmt[] {
  return records.flatMap((record, index) => validateCompleted(record, index, error, labels, key));
}

function clearRecordIndicators(model: Model): readonly Stmt[] {
  return [...new Set(model.records.map((record) => record.condition))]
    .map((condition) => setIndicator(condition, false));
}

export const sequenceStmts: CycleEmitter = (model, _layout, labels) => {
  const control = sequenceControl(model);
  const records = numericRecords(model);
  if (model.sequenceField === undefined || control === undefined || records.length === 0) return [];

  const started = stateLabel(labels, 'started');
  const current = stateLabel(labels, 'current');
  const previous = stateLabel(labels, 'previous');
  const first = labels.label('sequence:first');
  const changed = labels.label('sequence:changed');
  const dispatch = labels.label('sequence:dispatch');
  const cardError = labels.label('sequence:error:card');
  const eofError = labels.label('sequence:error:eof');
  const eof = labels.label('sequence:eof');
  const result: Stmt[] = [
    // SEQCHK precedes EXTRCT in CYCLE_ORDER, so CNn still holds the preceding card here. Compare
    // the current card-image field directly; EXTRCT will publish it to CNn after the check passes.
    { label: 'SEQCHK', op: 'MLC', operands: [`C${String(control.end).padStart(3, '0')}`, current] },
    { op: 'BCE', operands: [first, started, '0'] },
    { op: 'C', operands: [previous, current] },
    { op: 'BU', operands: [changed] },
    { op: 'B', operands: [dispatch] },
    { label: first, op: 'MLCS', operands: ['ONE', started] },
    { op: 'MLC', operands: [current, previous] },
    { op: 'B', operands: [dispatch] },
    { label: changed, op: 'NOP', operands: [] },
    ...validateGroup(records, cardError, labels, 'sequence:change'),
    ...resetSequenceState(records, labels),
    { op: 'MLC', operands: [current, previous] },
  ];

  for (const [index, record] of records.entries()) {
    const next = index + 1 < records.length
      ? labels.label(`sequence:dispatch:${index + 1}`)
      : cardError;
    const entry = index === 0 ? dispatch : labels.label(`sequence:dispatch:${index}`);
    result.push({ label: entry, op: 'BCE', operands: [next, indicatorLabel(record.condition), '0'] });
    for (let prior = 0; prior < index; prior++) {
      result.push(...validateCompleted(records[prior]!, prior, cardError, labels, `sequence:record:${index}`));
    }
    result.push(...requireUnseen(
      records.map((_candidate, candidate) => candidate).filter((candidate) => candidate > index),
      cardError,
      labels,
    ));
    const seen = stateLabel(labels, `seen:${index}`);
    if (record.number === 'N') {
      const firstN = labels.label(`sequence:record:${index}:first`);
      result.push(
        { op: 'BCE', operands: [firstN, seen, '0'] },
        { op: 'MLCS', operands: ['ONE', stateLabel(labels, `many:${index}`)] },
        { op: 'B', operands: ['EXTRCT'] },
        { label: firstN, op: 'MLCS', operands: ['ONE', seen] },
        { op: 'B', operands: ['EXTRCT'] },
      );
    } else {
      const accept = labels.label(`sequence:record:${index}:accept`);
      result.push(
        { op: 'BCE', operands: [accept, seen, '0'] },
        { op: 'B', operands: [cardError] },
        { label: accept, op: 'MLCS', operands: ['ONE', seen] },
        { op: 'B', operands: ['EXTRCT'] },
      );
    }
  }

  result.push(
    { label: eof, op: 'BCE', operands: ['LASTCD', started, '0'] },
    ...validateGroup(records, eofError, labels, 'sequence:eof'),
    { op: 'B', operands: ['LASTCD'] },
    { label: cardError, op: 'MLCS', operands: ['ZERO', started] },
    ...resetSequenceState(records, labels),
    ...clearRecordIndicators(model),
    ...runtimeMessageStmts(model, INPUT_OUT_OF_SEQUENCE, 'RDCARD', labels.label('sequence:error:card:print')),
    ...runtimeMessageStmts(model, INPUT_OUT_OF_SEQUENCE, 'LASTCD', eofError),
  );
  return result;
};

function sequenceEofTarget(model: Model, labels: CycleLabelAllocator): string {
  return outputStorageOf(model).length === 0 ? 'LASTCD' : labels.label('sequence:eof');
}

export const OUTPUT_EMITTERS = {
  generatedStorage: outputStorageOf,
  readEofTarget: sequenceEofTarget,
  sequence: sequenceStmts,
  totalOutput: totalOutputStmts,
  headingOutput: headingOutputStmts,
  detailOutput: detailOutputStmts,
  notFound: notFoundStmts,
} satisfies CycleEmitters;
