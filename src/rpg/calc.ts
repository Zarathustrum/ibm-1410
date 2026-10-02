import {
  literalLabelsOf,
  type CycleEmitter,
  type CycleEmitters,
  type CycleLabelAllocator,
} from './cycle.js';
import { conditionStmts, setIndicator } from './indicators.js';
import type { GeneratedStorage } from './layout.js';
import type { CalcStep, DataField, FieldSource, Model, Stmt } from './types.js';

/**
 * OPEN: `HALF_ADJUST_IS_ADD_FIVE_AT_THE_NAMED_POSITION` — `[likely]`. Calculation cols 50-51
 * name the result position where the five is added before position-adjusted references. Fallback:
 * diagnose half-adjust as requiring C28-1443 and re-cut the demo commission line. Plan §8.2,
 * §10.3/§10.4, §15; `open-questions.md`, Phase 5 / Wave 5.
 */
export const HALF_ADJUST_IS_ADD_FIVE_AT_THE_NAMED_POSITION = true;

const VALUE_STATUSES = new Set(['B', 'Z', 'N', 'P']);
const COMPARE_BRANCH: Readonly<Record<string, string>> = {
  U: 'BU', E: 'BE', H: 'BH', L: 'BL',
};

function labelled(label: string | undefined, stmt: Stmt): Stmt {
  return label === undefined ? stmt : { ...stmt, label };
}

function adjusted(name: string, positions = 0): string {
  return positions <= 0 ? name : `${name}-${positions}`;
}

function cardLabel(position: number): string {
  return `C${String(position).padStart(3, '0')}`;
}

function workKey(index: number): string {
  return `calc:work:${index}`;
}

function dataStageKey(fieldIndex: number, sourceIndex: number): string {
  return `calc:data:${fieldIndex}:${sourceIndex}`;
}

function statusKey(fill: 'blank' | 'numeric', length: number): string {
  return `calc:status:${fill}:${length}`;
}

function storageNamesOf(model: Model): ReadonlySet<string> {
  const names = new Set(model.fields.map((field) => field.name));
  for (const step of model.calcs) if (step.result !== undefined) names.add(step.result);
  return names;
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

function factorOperand(
  model: Model,
  factor: { readonly text: string; readonly length: number } | undefined,
): string | undefined {
  if (factor === undefined) return undefined;
  if (storageNamesOf(model).has(factor.text)) {
    return adjusted(factor.text, positionAdjustsOf(model).get(factor.text) ?? 0);
  }
  return literalLabelsOf(model).get(factor.text);
}

function fieldLengthOf(model: Model, name: string): number | undefined {
  const data = model.fields.find((field) => field.name === name);
  if (data !== undefined) return data.length;
  return model.calcs.find((step) => step.result === name)?.length;
}

function addStorage(
  result: GeneratedStorage[],
  seen: Set<string>,
  request: GeneratedStorage,
): void {
  if (request.length <= 0 || seen.has(request.key)) return;
  seen.add(request.key);
  result.push(request);
}

function addStatusStorage(
  result: GeneratedStorage[],
  seen: Set<string>,
  statuses: readonly { readonly status: string }[],
  length: number,
): void {
  if (statuses.some((status) => status.status === 'B')) {
    addStorage(result, seen, { key: statusKey('blank', length), length, fill: 'blank' });
  }
  if (statuses.some((status) => status.status === 'Z'
    || status.status === 'N' || status.status === 'P')) {
    addStorage(result, seen, { key: statusKey('numeric', length), length, fill: 'zero' });
  }
}

function needsDataStage(field: DataField, source: FieldSource): boolean {
  return source.kind === 'record'
    && source.operation !== 'digit'
    && source.operation !== 'zone'
    && (source.sourceLength ?? field.length) < field.length;
}

function directMultiply(step: CalcStep): boolean {
  if (step.op !== 'X' || step.accumulate !== 'resetAdd'
    || step.length === undefined || step.factor1 === undefined || step.factor2 === undefined) {
    return false;
  }
  return step.length === step.factor1.length + step.factor2.length + 1;
}

/** Exact generated mutable storage, traversed in the same order the emitters consume it. */
export function calcStorageOf(model: Model): readonly GeneratedStorage[] {
  const result: GeneratedStorage[] = [];
  const seen = new Set<string>();
  for (const [fieldIndex, field] of model.fields.entries()) {
    for (const [sourceIndex, source] of field.sources.entries()) {
      if (!needsDataStage(field, source)) continue;
      const numeric = source.numeric || source.operation !== 'move';
      addStorage(result, seen, {
        key: dataStageKey(fieldIndex, sourceIndex),
        length: field.length,
        fill: numeric ? 'zero' : 'blank',
      });
    }
    addStatusStorage(result, seen, field.statuses, field.length);
  }
  for (const [index, step] of model.calcs.entries()) {
    if (step.factor1 !== undefined && step.factor2 !== undefined
      && (step.op === '/' || (step.op === 'X' && !directMultiply(step)))) {
      addStorage(result, seen, {
        key: workKey(index),
        length: step.factor1.length + step.factor2.length + 1,
        fill: 'zero',
      });
    }
    if (step.result !== undefined) {
      const length = Math.max(1, (step.length ?? fieldLengthOf(model, step.result) ?? 1)
        - (step.positionAdjust ?? 0));
      addStatusStorage(result, seen, step.statuses, length);
    }
  }
  return result;
}

function statusStmts(
  statuses: readonly { readonly status: string; readonly condition: string }[],
  target: string,
  length: number,
  labels: CycleLabelAllocator,
  key: string,
): readonly Stmt[] {
  const stmts: Stmt[] = [];
  // Compare-result latches must be consumed before a blank-status C instruction replaces them.
  const ordered = [
    ...statuses.filter((status) => !VALUE_STATUSES.has(status.status)),
    ...statuses.filter((status) => VALUE_STATUSES.has(status.status)),
  ];
  for (const [index, status] of ordered.entries()) {
    const set = labels.label(`${key}:status:${index}:set`);
    const done = labels.label(`${key}:status:${index}:done`);
    stmts.push(setIndicator(status.condition, false));
    const compareBranch = COMPARE_BRANCH[status.status];
    if (compareBranch !== undefined) {
      stmts.push({ op: compareBranch, operands: [set] });
    } else if (status.status === 'B') {
      stmts.push({
        op: 'C',
        operands: [labels.label(statusKey('blank', length)), target],
      }, { op: 'BE', operands: [set] });
    } else {
      const work = labels.label(statusKey('numeric', length));
      stmts.push({ op: 'ZA', operands: [target, work] });
      if (status.status === 'Z') stmts.push({ op: 'BZ', operands: [set] });
      else stmts.push({ op: 'BZN', operands: [set, work, status.status === 'N' ? 'B' : 'AB'] });
    }
    stmts.push({ op: 'B', operands: [done] });
    stmts.push(labelled(set, setIndicator(status.condition, true)));
    stmts.push({ label: done, op: 'NOP', operands: [] });
  }
  return stmts;
}

function sourceOperation(op: FieldSource['operation'], numericMove: boolean): string {
  switch (op) {
    case 'move': return numericMove ? 'ZA' : 'MLC';
    case 'add': return 'A';
    case 'subtract': return 'S';
    case 'resetAdd': return 'ZA';
    case 'resetSubtract': return 'ZS';
    case 'digit': return 'MLNS';
    case 'zone': return 'MLZS';
  }
}

function stagedRecordStmts(
  field: DataField,
  source: FieldSource,
  stage: string,
): readonly Stmt[] {
  const end = source.end;
  if (end === undefined) return [];
  const sourceLength = source.sourceLength ?? field.length;
  const copies: Stmt[] = [];
  for (let offset = 0; offset < sourceLength; offset++) {
    copies.push({
      op: 'MLCS',
      operands: [adjusted(cardLabel(end), offset), adjusted(stage, offset)],
      from: field.at,
    });
  }
  return [
    ...copies,
    {
      op: sourceOperation(source.operation, source.numeric),
      operands: [stage, field.name],
      from: field.at,
    },
  ];
}

function sourceStmts(
  field: DataField,
  source: FieldSource,
  fieldIndex: number,
  sourceIndex: number,
  labels: CycleLabelAllocator,
): readonly Stmt[] {
  // SER/RCT never reach generation: model.ts takes their frozen §15 fallback diagnostic.
  if (source.kind === 'serial' || source.kind === 'recordCount') return [];
  if (source.kind === 'page') {
    if (field.name === 'PAGENO' && source.operation === 'move') return [];
    return [{
      op: sourceOperation(source.operation, source.numeric),
      operands: ['PAGENO', field.name],
      from: field.at,
    }];
  }
  if (source.end === undefined) return [];
  if (needsDataStage(field, source)) {
    return stagedRecordStmts(field, source, labels.label(dataStageKey(fieldIndex, sourceIndex)));
  }
  return [{
    op: sourceOperation(source.operation, source.numeric),
    operands: [cardLabel(source.end), field.name],
    from: field.at,
  }];
}

function guarded(
  stmts: readonly Stmt[],
  conditions: FieldSource['conditions'] | CalcStep['conditions'],
  labels: CycleLabelAllocator,
  key: string,
): readonly Stmt[] {
  if (stmts.length === 0 || conditions.length === 0) return stmts;
  const skip = labels.label(`${key}:skip`);
  return [...conditionStmts(conditions, skip), ...stmts, { label: skip, op: 'NOP', operands: [] }];
}

export const dataExtractionStmts: CycleEmitter = (model, _layout, labels) => {
  const stmts: Stmt[] = [];
  for (const field of [...model.controlFields].sort((left, right) => right.n - left.n)) {
    stmts.push({ op: 'MLC', operands: [cardLabel(field.end), `CN${field.n}`] });
  }
  for (const [fieldIndex, field] of model.fields.entries()) {
    for (const [sourceIndex, source] of field.sources.entries()) {
      const block = sourceStmts(field, source, fieldIndex, sourceIndex, labels);
      stmts.push(...guarded(block, source.conditions, labels, `extract:${fieldIndex}:${sourceIndex}`));
    }
    stmts.push(...statusStmts(
      field.statuses,
      field.name,
      field.length,
      labels,
      `extract:${fieldIndex}`,
    ));
  }
  const first = stmts[0] ?? { op: 'B', operands: ['CTLBRK'] };
  return [labelled('EXTRCT', first), ...stmts.slice(1)];
};

function accumulateOp(accumulate: CalcStep['accumulate']): 'A' | 'S' | 'ZA' | 'ZS' {
  if (accumulate === 'S') return 'S';
  if (accumulate === 'resetAdd') return 'ZA';
  if (accumulate === 'resetSubtract') return 'ZS';
  return 'A';
}

function addSubtractStmts(model: Model, step: CalcStep): readonly Stmt[] {
  if (step.result === undefined) return [];
  const left = factorOperand(model, step.factor1);
  const right = factorOperand(model, step.factor2);
  if (left === undefined && right === undefined) return [];
  if (left === undefined || right === undefined || step.op === undefined) {
    const source = right ?? left!;
    return [{ op: accumulateOp(step.accumulate), operands: [source, step.result], from: step.at }];
  }
  const subtract = step.op === '-';
  const first = accumulateOp(step.accumulate);
  const second = subtract
    ? (first === 'S' || first === 'ZS' ? 'A' : 'S')
    : (first === 'S' || first === 'ZS' ? 'S' : 'A');
  return [
    { op: first, operands: [left, step.result], from: step.at },
    { op: second, operands: [right, step.result], from: step.at },
  ];
}

interface OperationResult {
  readonly stmts: readonly Stmt[];
  readonly statusTarget?: string;
  readonly statusLength?: number;
}

function multiplyStmts(
  model: Model,
  step: CalcStep,
  index: number,
  labels: CycleLabelAllocator,
): OperationResult {
  if (step.result === undefined || step.factor1 === undefined || step.factor2 === undefined) {
    return { stmts: [] };
  }
  const factor1 = factorOperand(model, step.factor1);
  const factor2 = factorOperand(model, step.factor2);
  if (factor1 === undefined || factor2 === undefined) return { stmts: [] };
  const work = directMultiply(step) ? step.result : labels.label(workKey(index));
  const stmts: Stmt[] = [
    { op: 'ZA', operands: [factor1, adjusted(work, step.factor2.length + 1)], from: step.at },
    { op: 'M', operands: [factor2, work], from: step.at },
  ];
  if (step.halfAdjust !== undefined) {
    stmts.push({ op: 'A', operands: ['FIVE', adjusted(work, step.halfAdjust - 1)], from: step.at });
  }
  const source = adjusted(work, step.positionAdjust ?? 0);
  if (!directMultiply(step)) {
    stmts.push({ op: accumulateOp(step.accumulate), operands: [source, step.result], from: step.at });
  }
  return {
    stmts,
    statusTarget: adjusted(step.result, step.positionAdjust ?? 0),
    statusLength: Math.max(1, (step.length ?? 1) - (step.positionAdjust ?? 0)),
  };
}

function divideStmts(
  model: Model,
  step: CalcStep,
  index: number,
  labels: CycleLabelAllocator,
): OperationResult {
  if (step.result === undefined || step.factor1 === undefined || step.factor2 === undefined) {
    return { stmts: [] };
  }
  const dividend = factorOperand(model, step.factor1);
  const divisor = factorOperand(model, step.factor2);
  if (dividend === undefined || divisor === undefined) return { stmts: [] };
  const work = labels.label(workKey(index));
  const quotient = adjusted(work, step.factor2.length + 1 + (step.positionAdjust ?? 0));
  const stmts: Stmt[] = [
    { op: 'ZA', operands: [dividend, work], from: step.at },
    { op: 'D', operands: [divisor, adjusted(work, step.factor1.length - 1)], from: step.at },
  ];
  if (step.halfAdjust !== undefined) {
    stmts.push({ op: 'A', operands: ['FIVE', adjusted(quotient, step.halfAdjust - 1)], from: step.at });
  }
  stmts.push({ op: accumulateOp(step.accumulate), operands: [quotient, step.result], from: step.at });
  return {
    stmts,
    statusTarget: adjusted(step.result, step.positionAdjust ?? 0),
    statusLength: Math.max(1, (step.length ?? 1) - (step.positionAdjust ?? 0)),
  };
}

function operationStmts(
  model: Model,
  step: CalcStep,
  index: number,
  labels: CycleLabelAllocator,
): OperationResult {
  if (step.op === 'X') return multiplyStmts(model, step, index, labels);
  if (step.op === '/') return divideStmts(model, step, index, labels);
  if (step.op === 'C') {
    const factor1 = step.factor1;
    const left = factorOperand(model, factor1);
    const right = factorOperand(model, step.factor2);
    if (factor1 === undefined || left === undefined || right === undefined) return { stmts: [] };
    return {
      stmts: [{ op: 'C', operands: [right, left], from: step.at }],
      statusTarget: left,
      statusLength: factor1.length,
    };
  }
  const stmts = addSubtractStmts(model, step);
  if (step.result !== undefined && step.halfAdjust !== undefined) {
    return {
      stmts: [...stmts, {
        op: 'A', operands: ['FIVE', adjusted(step.result, step.halfAdjust - 1)], from: step.at,
      }],
      statusTarget: adjusted(step.result, step.positionAdjust ?? 0),
      statusLength: Math.max(1, (step.length ?? 1) - (step.positionAdjust ?? 0)),
    };
  }
  return {
    stmts,
    ...(step.result === undefined ? {} : {
      statusTarget: adjusted(step.result, step.positionAdjust ?? 0),
      statusLength: Math.max(1, (step.length ?? 1) - (step.positionAdjust ?? 0)),
    }),
  };
}

function calcStepStmts(
  model: Model,
  step: CalcStep,
  index: number,
  labels: CycleLabelAllocator,
  key: string,
): readonly Stmt[] {
  const operation = operationStmts(model, step, index, labels);
  const statuses = operation.statusTarget === undefined || operation.statusLength === undefined
    ? []
    : statusStmts(step.statuses, operation.statusTarget, operation.statusLength, labels, key);
  return [...operation.stmts, ...statuses];
}

function sameConditions(left: CalcStep['conditions'], right: CalcStep['conditions']): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function calculationStmts(
  model: Model,
  labels: CycleLabelAllocator,
  time: 'total' | 'detail',
  sectionLabel: 'TOTCAL' | 'DTLCAL',
  exitLabel: 'TOTOUT' | 'HDGOUT',
  branchAtEnd: boolean,
): readonly Stmt[] {
  const indexed = model.calcs.map((step, index) => ({ step, index }))
    .filter(({ step }) => step.time === time);
  const groups: { conditions: CalcStep['conditions']; entries: typeof indexed }[] = [];
  for (const entry of indexed) {
    const group = groups.at(-1);
    if (group !== undefined && sameConditions(group.conditions, entry.step.conditions)) {
      group.entries.push(entry);
    } else {
      groups.push({ conditions: entry.step.conditions, entries: [entry] });
    }
  }

  const stmts: Stmt[] = [];
  let entryLabel: string | undefined = sectionLabel;
  for (const [groupIndex, group] of groups.entries()) {
    const skip = group.conditions.length === 0
      ? undefined
      : groupIndex + 1 < groups.length
        ? labels.label(`${time}Calc:${groupIndex}:skip`)
        : branchAtEnd ? labels.label(`${time}Calc:${groupIndex}:skip`) : exitLabel;
    if (skip !== undefined) {
      const guards = conditionStmts(group.conditions, skip);
      stmts.push(labelled(entryLabel, guards[0]!), ...guards.slice(1));
      entryLabel = undefined;
    }
    for (const { step, index } of group.entries) {
      const block = calcStepStmts(model, step, index, labels, `${time}Calc:${index}`);
      if (block.length === 0) continue;
      stmts.push(labelled(entryLabel, block[0]!), ...block.slice(1));
      entryLabel = undefined;
    }
    if (skip !== undefined && groupIndex + 1 < groups.length) entryLabel = skip;
    else if (skip !== undefined && branchAtEnd) entryLabel = skip;
  }
  if (branchAtEnd) stmts.push(labelled(entryLabel, { op: 'B', operands: [exitLabel] }));
  if (stmts.length === 0) {
    return [{ label: sectionLabel, op: branchAtEnd ? 'B' : 'NOP', operands: branchAtEnd ? [exitLabel] : [] }];
  }
  return stmts;
}

export const totalCalculationStmts: CycleEmitter = (model, _layout, labels) =>
  calculationStmts(model, labels, 'total', 'TOTCAL', 'TOTOUT', true);

export const detailCalculationStmts: CycleEmitter = (model, _layout, labels) =>
  calculationStmts(model, labels, 'detail', 'DTLCAL', 'HDGOUT', false);

export const CALC_EMITTERS: CycleEmitters = {
  generatedStorage: calcStorageOf,
  extract: dataExtractionStmts,
  totalCalc: totalCalculationStmts,
  detailCalc: detailCalculationStmts,
};
