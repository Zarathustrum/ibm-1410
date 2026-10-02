// Tier 2 — Wave-5 Format output, runtime messages and sequence-state emission.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { applyToStorage } from '../src/asm/emit.js';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { toCard } from '../src/rpg/card.js';
import { CALC_EMITTERS, calcStorageOf } from '../src/rpg/calc.js';
import { driver, type CycleEmitters } from '../src/rpg/cycle.js';
import { generate } from '../src/rpg/generate.js';
import { layoutOf, measure } from '../src/rpg/layout.js';
import {
  detailOutputStmts,
  headingOutputStmts,
  notFoundStmts,
  OUTPUT_EMITTERS,
  outputStorageOf,
  sequenceStmts,
  totalOutputStmts,
} from '../src/rpg/output.js';
import { indicatorLabel } from '../src/rpg/indicators.js';
import type { Condition, FieldEntry, Model, OutputLine, RecordType, Stmt } from '../src/rpg/types.js';
import { SALES_SUMMARY_MODEL, SALES_SUMMARY_STATEMENTS } from './fixtures/sales-summary.model.js';

function decided(stmt: Stmt) {
  return { label: stmt.label, op: stmt.op, operands: stmt.operands };
}

function targetRange(first: string, after: string): readonly Stmt[] {
  const start = SALES_SUMMARY_STATEMENTS.findIndex((stmt) => stmt.label === first);
  const end = SALES_SUMMARY_STATEMENTS.findIndex((stmt) => stmt.label === after);
  if (start < 0 || end < 0 || start >= end) throw new Error(`bad target range ${first}..${after}`);
  return SALES_SUMMARY_STATEMENTS.slice(start, end)
    .filter((stmt) => (stmt.kind ?? 'statement') !== 'comment');
}

function labels() {
  const values = new Map<string, string>();
  return {
    label(key: string): string {
      const present = values.get(key);
      if (present !== undefined) return present;
      const value = `Z${String(values.size + 1).padStart(3, '0')}`;
      values.set(key, value);
      return value;
    },
  };
}

function field(name: string, end: number, literal?: string): FieldEntry {
  return {
    kind: 'F', name, end, conditionGroups: [], zeroSuppress: false,
    ...(literal === undefined ? {} : { literal }),
    at: SALES_SUMMARY_MODEL.lines[0]!.at,
  };
}

function k(literal: string, end: number): FieldEntry {
  return {
    kind: 'K', literal, end, conditionGroups: [], zeroSuppress: false,
    at: SALES_SUMMARY_MODEL.lines[0]!.at,
  };
}

function cond(indicator: string, negated = false): Condition {
  return { indicator, negated };
}

function line(input: Partial<OutputLine>): OutputLine {
  return {
    id: input.id ?? 'D11', type: input.type ?? 'D', level: input.level ?? '1',
    number: input.number ?? '1', print: input.print ?? true,
    conditionGroups: input.conditionGroups ?? [], fields: input.fields ?? [field('DEPT', 4)],
    at: SALES_SUMMARY_MODEL.lines[0]!.at,
    ...(input.nextLine === undefined ? {} : { nextLine: input.nextLine }),
    ...(input.spaceBefore === undefined ? {} : { spaceBefore: input.spaceBefore }),
    ...(input.spaceAfter === undefined ? {} : { spaceAfter: input.spaceAfter }),
    ...(input.skipBefore === undefined ? {} : { skipBefore: input.skipBefore }),
    ...(input.skipAfter === undefined ? {} : { skipAfter: input.skipAfter }),
  };
}

function modelWith(lines: readonly OutputLine[], extra: Partial<Model> = {}): Model {
  return { ...SALES_SUMMARY_MODEL, lines, ...extra };
}

function wave5Emitters(): CycleEmitters {
  return {
    ...CALC_EMITTERS,
    ...OUTPUT_EMITTERS,
    generatedStorage: (model) => [...calcStorageOf(model), ...outputStorageOf(model)],
  };
}

function cardSource(stmts: readonly Stmt[]): string {
  return stmts.map((stmt, index) => (
    toCard(stmt, String((index + 1) * 10).padStart(5, '0'), '')
  )).join('\n');
}

function assembleOutput(model: Model, section: 'totalOutput' | 'sequence') {
  const storage = outputStorageOf(model);
  const first = driver(model, layoutOf(model, 0, storage), OUTPUT_EMITTERS);
  const firstBody = [
    ...(first.get('constants') ?? []),
    ...(first.get(section) ?? []),
    { label: section === 'totalOutput' ? 'LVLRST' : 'EXTRCT', op: 'H', operands: [] },
    { op: 'NOP', operands: [] },
  ] satisfies readonly Stmt[];
  const layout = layoutOf(model, measure(firstBody), storage);
  const sections = driver(model, layout, OUTPUT_EMITTERS);
  const body = [
    ...(sections.get('constants') ?? []),
    ...(sections.get(section) ?? []),
    { label: section === 'totalOutput' ? 'LVLRST' : 'EXTRCT', op: 'H', operands: [] },
    { op: 'NOP', operands: [] },
    ...(sections.get('areas') ?? []),
  ] satisfies readonly Stmt[];
  return assemble(cardSource([
    { label: 'AUTOCODER', op: 'RUN', operands: [] },
    { op: 'CTL', operands: ['1'] },
    { op: 'LOAD', operands: [] },
    { op: 'ORG', operands: ['00500'] },
    ...body,
    { op: 'END', operands: [section === 'totalOutput' ? 'TOTOUT' : 'SEQCHK'] },
  ]));
}

function sequenceRecord(
  condition: string,
  seq: string,
  number: '1' | 'N',
  optional = false,
): RecordType {
  return {
    condition, seq, number, optional, codes: [], at: SALES_SUMMARY_MODEL.records[0]!.at,
  };
}

function sequenceModel(): Model {
  return {
    ...SALES_SUMMARY_MODEL,
    records: [
      sequenceRecord('01', '01', '1'),
      sequenceRecord('02', '02', 'N'),
      sequenceRecord('03', '03', '1', true),
    ],
    sequenceField: 1,
    controlFields: [{ n: 1, end: 3, length: 3 }],
    fields: [], calcs: [], lines: [], indicators: ['01', '02', '03'],
  };
}

interface SequenceHarness {
  readonly machine: Machine;
  readonly symbols: ReadonlyMap<string, { readonly value: number }>;
  readonly eof: string;
  card(group: string, condition: string): string;
  end(): string;
}

function sequenceHarness(): SequenceHarness {
  const model = sequenceModel();
  const storage = outputStorageOf(model);
  const first = driver(model, layoutOf(model, 0, storage), OUTPUT_EMITTERS);
  const stubs = [
    { label: 'EXTRCT', op: 'H', operands: [] }, { op: 'NOP', operands: [] },
    { label: 'RDCARD', op: 'H', operands: [] }, { op: 'NOP', operands: [] },
    { label: 'LASTCD', op: 'H', operands: [] }, { op: 'NOP', operands: [] },
  ] satisfies readonly Stmt[];
  const firstBody = [
    ...(first.get('constants') ?? []), ...(first.get('sequence') ?? []), ...stubs,
  ];
  const layout = layoutOf(model, measure(firstBody), storage);
  const sections = driver(model, layout, OUTPUT_EMITTERS);
  const eof = sections.get('read')?.[1]?.operands[0] ?? '';
  const source = cardSource([
    { label: 'AUTOCODER', op: 'RUN', operands: [] },
    { op: 'CTL', operands: ['1'] },
    { op: 'LOAD', operands: [] },
    { op: 'ORG', operands: ['00500'] },
    ...(sections.get('constants') ?? []),
    ...(sections.get('sequence') ?? []),
    ...stubs,
    ...(sections.get('areas') ?? []),
    { op: 'END', operands: ['SEQCHK'] },
  ]);
  const assembled = assemble(source);
  expect(assembled.ok).toBe(true);
  expect(assembled.flagged).toEqual([]);
  expect(assembled.warnings).toEqual([]);
  const machine = createMachine({ size: 10_000 });
  applyToStorage(assembled.items, machine.storage);
  const plgm = assembled.symbols.get('PLGM')?.value;
  expect(plgm).toBeDefined();
  machine.storage.setWm(plgm!, true);

  const address = (name: string): number => {
    const value = assembled.symbols.get(name)?.value;
    if (value === undefined) throw new Error(`sequence harness has no ${name}`);
    return value;
  };
  const runFrom = (name: string): string => {
    machine.computerReset();
    machine.addressSet(address(name));
    for (let i = 0; i < 2_000; i++) {
      const at = machine.regs.iar;
      const stop = machine.step();
      if (stop !== undefined) {
        if (stop !== 'halt') throw new Error(`sequence stopped ${stop} at ${at}`);
        for (const halt of ['EXTRCT', 'RDCARD', 'LASTCD']) {
          if (address(halt) === at) return halt;
        }
        throw new Error(`sequence halted at unnamed ${at}`);
      }
    }
    throw new Error('sequence did not halt in 2000 instructions');
  };
  const setCell = (name: string, glyph: string): void => {
    const at = address(name);
    machine.storage.setChar(at, bcdOfGlyph(glyph) ?? 0, machine.storage.wm(at));
  };
  const setGroup = (text: string): void => {
    // SEQCHK runs before EXTRCT copies the new card's control fields into CNn. Drive the card-image
    // sub-entry so this harness exercises the real cycle boundary rather than preloading stale CN1.
    const units = address('C003');
    for (const [index, glyph] of [...text].entries()) {
      const at = units - text.length + index + 1;
      machine.storage.setChar(at, bcdOfGlyph(glyph) ?? 0, machine.storage.wm(at));
    }
  };
  const clearRecords = (): void => {
    for (const record of model.records) setCell(indicatorLabel(record.condition), '0');
  };

  return {
    machine, symbols: assembled.symbols, eof,
    card(group, condition): string {
      setGroup(group);
      clearRecords();
      setCell(indicatorLabel(condition), '1');
      return runFrom('SEQCHK');
    },
    end(): string {
      clearRecords();
      return runFrom(eof);
    },
  };
}

const layout = layoutOf(SALES_SUMMARY_MODEL, 2032);
const PRINT_AREA_DEMOS = [
  'demos/sales-summary.rpg',
  'demos/cycle-probe.rpg',
  'demos/card-list.rpg',
] as const;
const PRINT_AREA_COPY_OPS = new Set(['MLCA', 'MLCWA']);

describe('Wave 5 — RPG output emitters', () => {
  it('publishes the five output callbacks plus storage and EOF routing', () => {
    expect(OUTPUT_EMITTERS).toEqual({
      generatedStorage: outputStorageOf,
      readEofTarget: expect.any(Function),
      sequence: sequenceStmts,
      totalOutput: totalOutputStmts,
      headingOutput: headingOutputStmts,
      detailOutput: detailOutputStmts,
      notFound: notFoundStmts,
    });
  });

  it('preserves the demo output machine shape while routing overflow through the choke point', () => {
    const sections = driver(SALES_SUMMARY_MODEL, layout, wave5Emitters());
    const total = sections.get('totalOutput') ?? [];
    const heading = sections.get('headingOutput') ?? [];
    const detail = sections.get('detailOutput') ?? [];
    const notFound = sections.get('notFound') ?? [];

    expect(total[0]).toMatchObject({ label: 'TOTOUT', op: 'BCE', operands: expect.arrayContaining(['F1']) });
    expect(heading[0]).toMatchObject({ label: 'HDGOUT', op: 'BCE', operands: expect.arrayContaining(['FSTPG']) });
    expect(detail[0]).toMatchObject({ label: 'DTLOUT', op: 'CS', operands: ['PLINE+131'] });
    expect(notFound.map(decided)).toEqual(targetRange('NOTFND', 'EOJ').map(decided));

    const source = readFileSync('src/rpg/output.ts', 'utf8');
    expect(source).toContain('senseOverflowStmts(');
    expect(source).not.toMatch(/op:\s*['"]BCV1['"]/);
    expect([...total, ...detail].filter((stmt) => stmt.op === 'BCV1')).toHaveLength(4);
  });

  it('emits no bare MLC-family write into generated print-area symbols', () => {
    for (const path of PRINT_AREA_DEMOS) {
      const result = generate(readFileSync(path, 'utf8'));
      expect(result.ok, path).toBe(true);
      const assembled = assemble(result.source);
      expect(assembled.ok, path).toBe(true);
      const offenders = assembled.listing
        .filter((line) => line.kind === 'imperative' && line.operand.includes('PLINE'))
        .filter((line) => line.opcod.startsWith('MLC') && !PRINT_AREA_COPY_OPS.has(line.opcod));
      expect(offenders, path).toEqual([]);
    }
  });

  it('increments PAGENO once per heading root chain and clears only the root 1P/OF latch', () => {
    const heading = driver(SALES_SUMMARY_MODEL, layout, wave5Emitters()).get('headingOutput') ?? [];
    expect(heading.filter((stmt) => stmt.op === 'A' && stmt.operands.join(',') === 'K001,PAGENO'))
      .toHaveLength(2);
    expect(heading.filter((stmt) => stmt.op === 'MLCS')).toEqual([
      expect.objectContaining({ operands: ['ZERO', 'FSTPG'] }),
      expect.objectContaining({ operands: ['ZERO', 'OF'] }),
    ]);

    const laterPage = line({ id: 'HA2', type: 'H', fields: [field('PAGENO', 20)] });
    const root = line({ id: 'HA1', type: 'H', nextLine: 'HA2', conditionGroups: [[cond('1P')]], fields: [k('HEAD', 4)] });
    const model = modelWith([root, laterPage]);
    const emitted = headingOutputStmts(model, layoutOf(model, 0), labels());
    expect(emitted.filter((stmt) => stmt.op === 'A' && stmt.operands[1] === 'PAGENO')).toHaveLength(1);
  });

  it('defines every OR-alternative label and keeps field OR independent of line OR', () => {
    const conditionalField: FieldEntry = {
      ...k('OR FIELD', 8), conditionGroups: [[cond('LC')], [cond('OF')]],
    };
    const model = modelWith([line({
      id: 'T11', type: 'T', conditionGroups: [[cond('F1')], [cond('F2')], [cond('LC')]],
      fields: [conditionalField], spaceAfter: 1,
    })]);
    const emitted = totalOutputStmts(model, layoutOf(model, 0), labels());
    const defined = new Set(emitted.flatMap((stmt) => stmt.label === undefined ? [] : [stmt.label]));
    const referenced = emitted.flatMap((stmt) => (
      (stmt.op === 'B' || stmt.op === 'BCE') && /^Z\d{3}$/.test(stmt.operands[0] ?? '')
        ? [stmt.operands[0]!] : []
    ));
    expect(referenced.length).toBeGreaterThan(4);
    for (const target of referenced) expect(defined.has(target), target).toBe(true);

    const assembled = assembleOutput(model, 'totalOutput');
    expect(assembled.ok).toBe(true);
    expect(assembled.flagged).toEqual([]);
    expect(assembled.warnings).toEqual([]);
  });

  it('combines repeated B-entry conditions so any printed alternative resets the field once', () => {
    const first: FieldEntry = {
      ...field('DEPT', 4), kind: 'B', conditionGroups: [[cond('01')]],
    };
    const second: FieldEntry = {
      ...field('DEPT', 8), kind: 'B', conditionGroups: [[cond('02')]],
    };
    const model = modelWith([line({ fields: [first, second] })], {
      indicators: ['01', '02', 'LC', 'OF', 'PRIME'],
    });
    const emitted = detailOutputStmts(model, layoutOf(model, 0), labels());
    const afterPrint = emitted.slice(emitted.findIndex((stmt) => stmt.op === 'W1') + 1);

    expect(afterPrint.filter((stmt) => stmt.op === 'MLCB' && stmt.operands[1] === 'DEPT'))
      .toHaveLength(1);
    expect(afterPrint.some((stmt) => stmt.op === 'BCE' && stmt.operands[1] === 'RC01')).toBe(true);
    expect(afterPrint.some((stmt) => stmt.op === 'BCE' && stmt.operands[1] === 'RC02')).toBe(true);
  });

  it('allocates an inline edit body and emits MLCWA Knnn followed by MCE', () => {
    const inline = field('AMT', 20, '   ,   .  ');
    const lines = SALES_SUMMARY_MODEL.lines.map((candidate) => (
      candidate.id === 'D11' ? { ...candidate, fields: [inline] } : candidate
    ));
    const model = modelWith(lines);
    const emitted = detailOutputStmts(model, layoutOf(model, 0), labels());
    const control = emitted.findIndex((stmt) => stmt.op === 'MLCWA' && stmt.operands[0] === 'K018');
    expect(control).toBeGreaterThan(-1);
    expect(emitted[control]).toMatchObject({ operands: ['K018', 'PLINE+19'] });
    expect(emitted[control + 1]).toMatchObject({ op: 'MCE', operands: ['AMT', 'PLINE+19'] });
  });

  it('always defines DTLOUT and clears every record indicator once at the common exit', () => {
    const model = modelWith([], {
      records: [
        { ...SALES_SUMMARY_MODEL.records[0]!, condition: '01' },
        { ...SALES_SUMMARY_MODEL.records[0]!, condition: '02', seq: 'BB' },
      ],
      indicators: ['01', '02', 'LC', 'OF', 'PRIME'],
    });
    const emitted = detailOutputStmts(model, layoutOf(model, 0), labels());
    expect(emitted).toEqual([
      { label: 'DTLOUT', op: 'MLCS', operands: ['ZERO', 'RC01'] },
      { op: 'MLCS', operands: ['ZERO', 'RC02'] },
      { op: 'B', operands: ['RDCARD'] },
    ]);
  });

  it('derives runtime message end positions from their exact text lengths', () => {
    const notFound = notFoundStmts(SALES_SUMMARY_MODEL, layout, labels());
    expect(notFound.find((stmt) => stmt.op === 'MLCA')?.operands[1]).toBe('PLINE+20');

    const sequenceModel = modelWith([], {
      sequenceField: 1,
      records: [{ ...SALES_SUMMARY_MODEL.records[0]!, seq: '01', number: '1' }],
    });
    const allocator = labels();
    for (const request of outputStorageOf(sequenceModel)) allocator.label(request.key);
    const sequence = sequenceStmts(sequenceModel, layoutOf(sequenceModel, 0, outputStorageOf(sequenceModel)), allocator);
    expect(sequence.filter((stmt) => stmt.op === 'MLCA').map((stmt) => stmt.operands[1]))
      .toEqual(['PLINE+19', 'PLINE+19']);
  });

  it('plans sequence state only for SCF models and routes their read EOF through validation', () => {
    expect(outputStorageOf(SALES_SUMMARY_MODEL)).toEqual([]);
    const sequenceModel = modelWith([], {
      sequenceField: 1,
      records: [
        { ...SALES_SUMMARY_MODEL.records[0]!, seq: '01', number: '1' },
        { ...SALES_SUMMARY_MODEL.records[0]!, condition: '02', seq: '02', number: 'N' },
      ],
    });
    expect(outputStorageOf(sequenceModel).map(({ key, length }) => ({ key, length }))).toEqual([
      { key: 'sequence:started', length: 1 },
      { key: 'sequence:current', length: 3 },
      { key: 'sequence:previous', length: 3 },
      { key: 'sequence:seen:0', length: 1 },
      { key: 'sequence:seen:1', length: 1 },
      { key: 'sequence:many:1', length: 1 },
    ]);
    const storage = outputStorageOf(sequenceModel);
    const sections = driver(sequenceModel, layoutOf(sequenceModel, 0, storage), OUTPUT_EMITTERS);
    expect(sections.get('read')?.[1]?.operands[0]).toMatch(/^Z\d{3}$/);
    expect(sections.get('sequence')?.[0]).toMatchObject({
      label: 'SEQCHK', op: 'MLC', operands: ['C006', expect.stringMatching(/^Z\d{3}$/)],
    });
  });

  it('executes N repetition, optional omission, group reset and a valid EOF on the real Machine', () => {
    const run = sequenceHarness();
    expect(run.card('AAA', '01')).toBe('EXTRCT');
    expect(run.card('AAA', '02')).toBe('EXTRCT');
    expect(run.card('AAA', '02')).toBe('EXTRCT');
    expect(run.card('BBB', '01'), 'new group resets the prior 1/N state').toBe('EXTRCT');
    expect(run.card('BBB', '02')).toBe('EXTRCT');
    expect(run.card('BBB', '02')).toBe('EXTRCT');
    expect(run.end()).toBe('LASTCD');
    expect(run.machine.snapshot().printer.paper).toEqual([]);
  });

  it('executes missing-required and duplicate-1 card errors through the recovered message path', () => {
    for (const bad of ['missing-required', 'duplicate-one'] as const) {
      const run = sequenceHarness();
      expect(run.card('AAA', '01')).toBe('EXTRCT');
      const stop = bad === 'missing-required'
        ? run.card('BBB', '01')
        : run.card('AAA', '01');
      expect(stop, bad).toBe('RDCARD');
      expect(run.machine.snapshot().printer.paper.at(-1)?.text.trimEnd(), bad)
        .toBe('INPUT REC OUT OF SEQ');
    }
  });

  it('executes an insufficient-N EOF error through validation before LASTCD', () => {
    const run = sequenceHarness();
    expect(run.card('AAA', '01')).toBe('EXTRCT');
    expect(run.card('AAA', '02')).toBe('EXTRCT');
    expect(run.end()).toBe('LASTCD');
    expect(run.machine.snapshot().printer.paper.at(-1)?.text.trimEnd())
      .toBe('INPUT REC OUT OF SEQ');
  });
});
