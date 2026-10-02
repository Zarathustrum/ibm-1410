// Tier 2 — Phase-5 cycle-driver convergence against the hand-written Wave-1 target.
// Wave 5 appends the generated/corpus half; this file's Wave-3 cases are not rewritten.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { applyToStorage } from '../src/asm/emit.js';
import { readSource } from '../src/asm/source.js';
import { BCD_TABLE, bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { createMachine } from '../src/core/machine.js';
import { BCD6 } from '../src/core/types.js';
import { toCard } from '../src/rpg/card.js';
import {
  CONTROL_BREAK_AT_LEVEL_N_BREAKS_ALL_MINOR_LEVELS,
  CYCLE_ORDER,
  CYCLE_SECTION_LABEL,
  HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION,
  literalLabelsOf,
  TOTAL_TIME_PRECEDES_DETAIL_TIME_ON_A_BREAK,
  driver,
  type CycleEmitter,
  type CycleEmitters,
  type CycleSection,
  type ExtensibleCycleSection,
} from '../src/rpg/cycle.js';
import { layoutOf, measure } from '../src/rpg/layout.js';
import type { Model, RecordType, Stmt } from '../src/rpg/types.js';
import {
  SALES_SUMMARY_MODEL,
  SALES_SUMMARY_STATEMENTS,
} from './fixtures/sales-summary.model.js';

const SOURCE = readFileSync('demos/sales-summary.asm', 'utf8');
const ASSEMBLY = assemble(SOURCE);
// The draft is a frozen plan file and predates Phase 6's one MACHINE change to the target: START's
// CS over IND and CDIN, and IND on a hundreds boundary (`CARD_AREA_IS_CLEARED_AT_ENTRY_AND_
// HUNDREDS_ALIGNED`, layout.ts). The same two cards are applied to the draft here, so the proof
// below still says what it said: everything ELSE between draft and target is a source-only re-cut.
const ORIGINAL_TARGET = readFileSync('docs/plans/phase-5-target-draft.asm', 'utf8')
  .replace('01520START     MLCA IZERO,PRIME',
    '01515START     CS   IND+86\n01520          MLCA IZERO,PRIME')
  .replace('03530          ORG  *+1 ', '03530          ORG  02600');
const ORIGINAL_ASSEMBLY = assemble(ORIGINAL_TARGET);

const OWNED_SECTIONS = [
  'constants', 'init', 'read', 'identify', 'extract', 'controlBreak', 'levelReset', 'lastCard',
  'endOfJob', 'areas',
] as const satisfies readonly CycleSection[];

const DEFERRED_SECTIONS = [
  'sequence', 'totalCalc', 'totalOutput', 'detailCalc', 'headingOutput', 'detailOutput', 'notFound',
] as const satisfies readonly CycleSection[];

const TARGET_RANGES: Readonly<Record<(typeof OWNED_SECTIONS)[number], readonly [string, string]>> = {
  constants: ['ONE', 'START'],
  init: ['START', 'RDCARD'],
  read: ['RDCARD', 'IDENT'],
  identify: ['IDENT', 'EXTRCT'],
  extract: ['EXTRCT', 'CTLBRK'],
  controlBreak: ['CTLBRK', 'TOTCAL'],
  levelReset: ['LVLRST', 'DTLCAL'],
  lastCard: ['LASTCD', 'NOTFND'],
  endOfJob: ['EOJ', '$AREAS'],
  areas: ['$AREAS', '$END'],
};

function indexOfMarker(marker: string): number {
  if (marker === '$AREAS') {
    return SALES_SUMMARY_STATEMENTS.findIndex((stmt, index) => (
      stmt.op === 'ORG' && SALES_SUMMARY_STATEMENTS[index + 1]?.label === 'IND'
    ));
  }
  if (marker === '$END') {
    return SALES_SUMMARY_STATEMENTS.findIndex((stmt) => stmt.op === 'END');
  }
  return SALES_SUMMARY_STATEMENTS.findIndex((stmt) => stmt.label === marker);
}

function targetSection(section: (typeof OWNED_SECTIONS)[number]): readonly Stmt[] {
  const [startMarker, endMarker] = TARGET_RANGES[section];
  const start = indexOfMarker(startMarker);
  const end = indexOfMarker(endMarker);
  if (start < 0 || end < 0 || start >= end) {
    throw new Error(`bad hand-built target range for ${section}: ${start}..${end}`);
  }
  return SALES_SUMMARY_STATEMENTS.slice(start, end)
    .filter((stmt) => (stmt.kind ?? 'statement') !== 'comment');
}

function decided(stmt: Stmt) {
  return {
    kind: stmt.kind,
    label: stmt.label,
    indent: stmt.indent,
    op: stmt.op,
    operands: stmt.operands,
  };
}

const codeStart = indexOfMarker('ONE');
const areasStart = indexOfMarker('$AREAS');
const TARGET_CODE = SALES_SUMMARY_STATEMENTS.slice(codeStart, areasStart)
  .filter((stmt) => (stmt.kind ?? 'statement') !== 'comment');
const LAYOUT = layoutOf(SALES_SUMMARY_MODEL, measure(TARGET_CODE));
const SECTIONS = driver(SALES_SUMMARY_MODEL, LAYOUT);

type RecordCode = RecordType['codes'][number];

function record(condition: string, codes: readonly RecordCode[]): RecordType {
  return {
    condition,
    codes,
    optional: false,
    at: SALES_SUMMARY_MODEL.records[0]!.at,
  };
}

function modelWithRecords(
  records: readonly RecordType[],
  sequenceField?: 1 | 2 | 3 | 4 | 5 | 6,
): Model {
  const model: Model = {
    ...SALES_SUMMARY_MODEL,
    records,
    controlFields: [],
    fields: [],
    calcs: [],
    lines: [],
    indicators: records.map((entry) => entry.condition),
  };
  return sequenceField === undefined ? model : { ...model, sequenceField };
}

function sourceOf(stmts: readonly Stmt[]): string {
  return stmts.map((stmt, index) => (
    toCard(stmt, String((index + 1) * 10).padStart(5, '0'), '')
  )).join('\n');
}

function matcherSource(model: Model): string {
  const positions = new Set<number>();
  for (const entry of model.records) {
    for (const code of entry.codes) positions.add(code.position);
  }
  const indicators = [...new Set(model.records.map((entry) => entry.condition))];
  const identify = driver(model, layoutOf(model, 0)).get('identify') ?? [];
  return sourceOf([
    { label: 'AUTOCODER', op: 'RUN', operands: [] },
    { op: 'CTL', operands: ['1'] },
    { op: 'LOAD', operands: [] },
    { op: 'ORG', operands: ['00500'] },
    { label: 'ONE', op: 'DCW', operands: ['@1@'] },
    { label: 'ZERO', op: 'DCW', operands: ['@0@'] },
    ...[...positions].sort((left, right) => left - right).map((position): Stmt => ({
      label: `C${String(position).padStart(3, '0')}`,
      op: 'DCW',
      operands: ['@ @'],
    })),
    ...indicators.map((indicator): Stmt => ({
      label: `RC${indicator}`,
      op: 'DCW',
      operands: ['@0@'],
    })),
    ...identify,
    { op: 'B', operands: ['DONE'] },
    { label: 'SEQCHK', op: 'B', operands: ['DONE'] },
    { label: 'EXTRCT', op: 'B', operands: ['DONE'] },
    { label: 'NOTFND', op: 'B', operands: ['DONE'] },
    { label: 'DONE', op: 'H', operands: [] },
    { op: 'NOP', operands: [] },
    { op: 'END', operands: ['IDENT'] },
  ]);
}

const MATCHER_ASSEMBLIES = new Map<string, ReturnType<typeof assemble>>();

function runMatcher(
  model: Model,
  source: string,
  actual: ReadonlyMap<number, number>,
  indicator = '01',
): string {
  let assembled = MATCHER_ASSEMBLIES.get(source);
  if (assembled === undefined) {
    assembled = assemble(source);
    MATCHER_ASSEMBLIES.set(source, assembled);
  }
  if (!assembled.ok || assembled.flagged.length !== 0 || assembled.warnings.length !== 0) {
    throw new Error(`matcher did not assemble clean: ${assembled.flagged.length} flags, ${assembled.warnings.length} warnings`);
  }
  const machine = createMachine({ size: 10_000 });
  applyToStorage(assembled.items, machine.storage);
  for (const [position, bcd] of actual) {
    const at = assembled.symbols.get(`C${String(position).padStart(3, '0')}`)?.value;
    if (at === undefined) throw new Error(`matcher has no C${String(position).padStart(3, '0')}`);
    machine.storage.setChar(at, bcd, false);
  }
  const entry = assembled.symbols.get('IDENT')?.value;
  const result = assembled.symbols.get(`RC${indicator}`)?.value;
  if (entry === undefined || result === undefined) throw new Error('matcher has no entry or result cell');
  machine.addressSet(entry);
  const stop = machine.run(200);
  if (stop !== 'halt') {
    throw new Error(`matcher did not halt: stop=${String(stop)} IAR=${machine.regs.iar}`);
  }
  return glyphOf(machine.storage.read(result) & BCD6);
}

function emittedHighWater(result: ReturnType<typeof assemble>): number {
  return Math.max(...result.items.map((item) => item.at + item.cells.length));
}

function numericLabel(label: string): number {
  return Number(label.slice(1));
}

function zLabelsIn(stmts: readonly Stmt[]): readonly string[] {
  const labels = new Set<string>();
  for (const stmt of stmts) {
    for (const value of [stmt.label, ...stmt.operands]) {
      if (value !== undefined && /^Z[0-9]{3}$/.test(value)) labels.add(value);
    }
  }
  return [...labels].sort((left, right) => numericLabel(left) - numericLabel(right));
}

function measuredSections(sections: ReadonlyMap<CycleSection, readonly Stmt[]>): readonly Stmt[] {
  return CYCLE_ORDER
    .filter((section) => section !== 'areas')
    .flatMap((section) => sections.get(section) ?? []);
}

describe('Wave 3 — cycle driver and hand-written target oracle (plan §11 wave 3)', () => {
  it('pins the cycle order, labels and the three Wave-3 ordering rulings', () => {
    expect(CONTROL_BREAK_AT_LEVEL_N_BREAKS_ALL_MINOR_LEVELS).toBe(true);
    expect(TOTAL_TIME_PRECEDES_DETAIL_TIME_ON_A_BREAK).toBe(true);
    expect(HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION).toBe(true);
    expect(CYCLE_ORDER).toEqual([
      'constants', 'init', 'read', 'identify', 'sequence', 'extract',
      'controlBreak', 'totalCalc', 'totalOutput', 'levelReset',
      'detailCalc', 'headingOutput', 'detailOutput', 'lastCard', 'notFound', 'endOfJob', 'areas',
    ]);
    expect(CYCLE_SECTION_LABEL).toEqual({
      constants: 'ONE', init: 'START', read: 'RDCARD', identify: 'IDENT', sequence: 'SEQCHK',
      extract: 'EXTRCT', controlBreak: 'CTLBRK', totalCalc: 'TOTCAL', totalOutput: 'TOTOUT',
      levelReset: 'LVLRST', detailCalc: 'DTLCAL', headingOutput: 'HDGOUT',
      detailOutput: 'DTLOUT', lastCard: 'LASTCD', notFound: 'NOTFND', endOfJob: 'EOJ', areas: 'IND',
    });
    expect(CYCLE_ORDER.indexOf('totalCalc')).toBeLessThan(CYCLE_ORDER.indexOf('detailCalc'));
    expect(CYCLE_ORDER.indexOf('detailCalc')).toBeLessThan(CYCLE_ORDER.indexOf('headingOutput'));
    expect(CYCLE_ORDER.indexOf('headingOutput')).toBeLessThan(CYCLE_ORDER.indexOf('detailOutput'));
  });

  it('returns all seventeen sections in cycle order and keeps all seven Wave-5 sections empty', () => {
    expect([...SECTIONS.keys()]).toEqual(CYCLE_ORDER);
    expect(DEFERRED_SECTIONS).toHaveLength(7);
    for (const section of DEFERRED_SECTIONS) {
      expect(SECTIONS.get(section), section).toEqual([]);
    }
  });

  it('assigns distinct Knnn constants with one monotonic emission counter', () => {
    const labels = [...literalLabelsOf(SALES_SUMMARY_MODEL).values()];
    expect(labels).toEqual(Array.from(
      { length: labels.length },
      (_, index) => `K${String(index + 1).padStart(3, '0')}`,
    ));
    expect(SECTIONS.get('constants')?.filter((stmt) => stmt.label?.startsWith('K')).map((stmt) => stmt.label))
      .toEqual(labels);
  });

  it('matches all ten Wave-3-owned sections against the Wave-3 target fields, in order', () => {
    expect(OWNED_SECTIONS).toHaveLength(10);
    for (const section of OWNED_SECTIONS) {
      // Re-cut 3 made Data col-23 N a ZA zone strip in the current target. Full Data operations
      // belong to Wave 5's extract override; this frozen Wave-3 base oracle still covers its
      // original move-only seam, while the convergence gate compares the override to ZA.
      const expected = targetSection(section).map((stmt) => (
        section === 'extract'
          && stmt.op === 'ZA'
          && (stmt.operands[1] === 'QTY' || stmt.operands[1] === 'AMT')
          ? { ...stmt, op: 'MLC' }
          : stmt
      ));
      expect(SECTIONS.get(section)?.map(decided), section)
        .toEqual(expected.map(decided));
    }
  });

  it('reaches the Wave-3 driver fixed point when n comes from its ten owned sections', () => {
    const passOne = driver(SALES_SUMMARY_MODEL, layoutOf(SALES_SUMMARY_MODEL, 0));
    const passOneCode = measuredSections(passOne);
    const n = measure(passOneCode);
    const passTwo = driver(SALES_SUMMARY_MODEL, layoutOf(SALES_SUMMARY_MODEL, n));

    expect(measure(measuredSections(passTwo))).toBe(n);
    for (const section of CYCLE_ORDER.filter((name) => name !== 'areas')) {
      expect(passTwo.get(section)?.map(decided), section)
        .toEqual(passOne.get(section)?.map(decided));
    }
  });

  it('proves both monotonic source-label re-cuts are source-only against the label-sparse draft', () => {
    expect(SOURCE).not.toBe(ORIGINAL_TARGET);
    expect(ORIGINAL_ASSEMBLY.ok).toBe(true);
    expect(ORIGINAL_ASSEMBLY.flagged).toEqual([]);
    expect(ORIGINAL_ASSEMBLY.warnings).toEqual([]);
    expect(ASSEMBLY.ok).toBe(true);
    expect(ASSEMBLY.flagged).toEqual([]);
    expect(ASSEMBLY.warnings).toEqual([]);

    expect(ORIGINAL_ASSEMBLY.deck.records).toHaveLength(39);
    expect(ASSEMBLY.deck.records).toHaveLength(39);
    expect(ASSEMBLY.deck.records).toEqual(ORIGINAL_ASSEMBLY.deck.records);
    expect(ASSEMBLY.deck.entry).toBe(ORIGINAL_ASSEMBLY.deck.entry);
    expect(emittedHighWater(ASSEMBLY)).toBe(emittedHighWater(ORIGINAL_ASSEMBLY));
    expect(ASSEMBLY.deck.entry).toBe(808);
    expect(emittedHighWater(ASSEMBLY)).toBe(2833);
  });

  it('invokes Wave-5 callbacks in cycle order with one shared monotonic allocator', () => {
    const callbackSections = [
      'sequence', 'extract', 'totalCalc', 'totalOutput',
      'detailCalc', 'headingOutput', 'detailOutput', 'notFound',
    ] as const satisfies readonly ExtensibleCycleSection[];
    const observed: { section: ExtensibleCycleSection; label: string }[] = [];
    const callback = (section: ExtensibleCycleSection): CycleEmitter => (
      (_model, _layout, labels) => {
        const label = labels.label(`test-callback:${section}`);
        observed.push({ section, label });
        return section === 'extract'
          ? [
              { label: 'EXTRCT', op: 'B', operands: [label] },
              { label, op: 'N', operands: [] },
            ]
          : [{ label, op: 'N', operands: [] }];
      }
    );
    const emitters: CycleEmitters = {
      sequence: callback('sequence'),
      extract: callback('extract'),
      totalCalc: callback('totalCalc'),
      totalOutput: callback('totalOutput'),
      detailCalc: callback('detailCalc'),
      headingOutput: callback('headingOutput'),
      detailOutput: callback('detailOutput'),
      notFound: callback('notFound'),
    };

    const extended = driver(SALES_SUMMARY_MODEL, LAYOUT, emitters);
    expect(observed.map((entry) => entry.section)).toEqual(callbackSections);
    expect(extended.get('extract')?.[0]?.label).toBe('EXTRCT');
    expect(extended.get('extract')).not.toEqual(SECTIONS.get('extract'));

    const allZ = zLabelsIn(CYCLE_ORDER.flatMap((section) => extended.get(section) ?? []));
    expect(allZ).toEqual(Array.from(
      { length: allZ.length },
      (_, index) => `Z${String(index + 1).padStart(3, '0')}`,
    ));
    expect(new Set(observed.map((entry) => entry.label)).size).toBe(callbackSections.length);
    const identifyZ = zLabelsIn(extended.get('identify') ?? []);
    expect(numericLabel(observed[0]!.label)).toBe(numericLabel(identifyZ.at(-1)!) + 1);
    expect(numericLabel(observed[1]!.label)).toBe(numericLabel(observed[0]!.label) + 1);
    const controlZ = zLabelsIn(extended.get('controlBreak') ?? []);
    expect(numericLabel(observed[2]!.label)).toBe(numericLabel(controlZ.at(-1)!) + 1);
    for (let index = 1; index < observed.length; index++) {
      expect(numericLabel(observed[index]!.label)).toBeGreaterThan(numericLabel(observed[index - 1]!.label));
    }
  });

  it('routes a non-final record match through sequence when present and extract otherwise', () => {
    const records = [
      record('01', [{ position: 1, not: false, compare: 'C', code: 'A' }]),
      record('02', [{ position: 2, not: false, compare: 'C', code: 'B' }]),
    ];
    const matchedBranch = (sequenceField?: 1): Stmt | undefined => {
      const identify = driver(modelWithRecords(records, sequenceField), LAYOUT).get('identify') ?? [];
      const firstSet = identify.findIndex((stmt) => stmt.operands.includes('RC01'));
      return identify[firstSet + 1];
    };
    const withSequence = driver(modelWithRecords(records, 1), LAYOUT).get('identify') ?? [];

    expect(matchedBranch(1)).toEqual({ op: 'B', operands: ['SEQCHK'] });
    expect(matchedBranch()).toEqual({ op: 'B', operands: ['EXTRCT'] });
    expect(withSequence.at(-1)).toMatchObject({ op: 'MLCS', operands: ['ONE', 'RC02'] });
  });

  it('uses the shared allocator without continuation-label collisions beyond six codes', () => {
    const longCodes = Array.from({ length: 8 }, (_, index): RecordCode => ({
      position: index + 1,
      not: false,
      compare: 'C',
      code: String((index + 1) % 10),
    }));
    const model = modelWithRecords([
      record('01', longCodes),
      record('02', [{ position: 9, not: false, compare: 'C', code: '9' }]),
    ]);
    const identify = driver(model, layoutOf(model, 0)).get('identify') ?? [];
    const definitions = identify.flatMap((stmt) => stmt.label === undefined ? [] : [stmt.label]);
    const source = matcherSource(model);
    const assembled = assemble(source);

    expect(new Set(definitions).size).toBe(definitions.length);
    expect(zLabelsIn(identify)).toEqual(Array.from(
      { length: zLabelsIn(identify).length },
      (_, index) => `Z${String(index + 1).padStart(3, '0')}`,
    ));
    expect(assembled.ok).toBe(true);
    expect(assembled.flagged).toEqual([]);
    expect(assembled.warnings).toEqual([]);

    const code = (glyph: string): number => bcdOfGlyph(glyph)!;
    const secondMatch = new Map([[1, code('0')], [9, code('9')]]);
    expect(runMatcher(model, source, secondMatch, '01')).toBe('0');
    expect(runMatcher(model, source, secondMatch, '02')).toBe('1');
    const noMatch = new Map([[1, code('0')], [9, code('8')]]);
    expect(runMatcher(model, source, noMatch, '01')).toBe('0');
    expect(runMatcher(model, source, noMatch, '02')).toBe('0');
  });

  it('leaves NOTFND deferred for validated models and lets Wave 5 fill it in order', () => {
    const empty = modelWithRecords([]);
    const base = driver(empty, layoutOf(empty, 0));
    const filled = driver(empty, layoutOf(empty, 0), {
      notFound: (_model, _layout, labels) => [{
        label: 'NOTFND', op: 'B', operands: [labels.label('test:notFound:return')],
      }],
    });

    expect(base.get('identify')).toEqual([{ label: 'IDENT', op: 'B', operands: ['NOTFND'] }]);
    expect(base.get('notFound')).toEqual([]);
    expect(filled.get('notFound')?.[0]?.label).toBe('NOTFND');
  });

  it('places every hand-written target section the demo generates at a strictly ascending address', () => {
    expect(ASSEMBLY.ok).toBe(true);
    expect(ASSEMBLY.flagged).toEqual([]);
    expect(ASSEMBLY.warnings).toEqual([]);

    const generated = CYCLE_ORDER.filter((section) => section !== 'sequence');
    const points = generated.map((section) => {
      const label = CYCLE_SECTION_LABEL[section];
      const value = ASSEMBLY.symbols.get(label)?.value;
      expect(value, `${section}:${label}`).toBeDefined();
      return { section, label, value: value! };
    });
    expect(points).toHaveLength(16);
    for (let index = 1; index < points.length; index++) {
      expect(points[index]!.value, points[index]!.section).toBeGreaterThan(points[index - 1]!.value);
    }
  });
});

describe('Wave 3 — record-code comparisons on the real assembler and Machine', () => {
  const comparisons = ['C', 'Z', 'D'] as const;

  it('keeps BCE for 62 full characters and uses BBE only for blank/comma, zone and digit bits', () => {
    const identifyFor = (compare: 'C' | 'Z' | 'D', code: string): readonly Stmt[] => {
      const model = modelWithRecords([record('01', [{
        position: 1, not: false, compare, code,
      }])]);
      return driver(model, layoutOf(model, 0)).get('identify') ?? [];
    };
    const ordinary = identifyFor('C', 'ƀ');
    const blank = identifyFor('C', ' ');
    const comma = identifyFor('C', ',');
    const zone = identifyFor('Z', 'A');
    const digit = identifyFor('D', 'ƀ');

    expect(ordinary[0]).toMatchObject({ op: 'BCE', operands: ['Z001', 'C001', 'ƀ'] });
    expect(blank.filter((stmt) => stmt.op === 'BBE')).toHaveLength(6);
    expect(comma.filter((stmt) => stmt.op === 'BBE')).toHaveLength(6);
    expect(blank.some((stmt) => stmt.op === 'BCE')).toBe(false);
    expect(comma.some((stmt) => stmt.op === 'BCE')).toBe(false);
    expect(zone.filter((stmt) => stmt.op === 'BBE')).toHaveLength(2);
    expect(zone.some((stmt) => stmt.operands.includes('ƀ'))).toBe(true);
    expect(digit.filter((stmt) => stmt.op === 'BBE')).toHaveLength(4);
    expect(digit.some((stmt) => stmt.operands.includes('ƀ'))).toBe(false);

    for (const [compare, code] of [['C', 'ƀ'], ['C', ' '], ['C', ','], ['Z', 'A'], ['D', 'ƀ']] as const) {
      const source = matcherSource(modelWithRecords([record('01', [{
        position: 1, not: false, compare, code,
      }])]));
      expect(readSource(source).map((line) => line.card).join('\n')).toBe(source);
    }
  });

  it.each(comparisons)('exhausts the 64-by-64 %s truth table in both polarities', (compare) => {
    let sawSubstituteBlankOnSourceCard = false;
    for (const expected of BCD_TABLE) {
      for (const not of [false, true]) {
        const model = modelWithRecords([record('01', [{
          position: 1,
          not,
          compare,
          code: expected.glyph,
        }])]);
        const source = matcherSource(model);
        const cards = readSource(source);
        const roundTrip = cards.map((line) => line.card).join('\n');
        if (roundTrip.includes('ƀ')) sawSubstituteBlankOnSourceCard = true;
        expect(cards.every((line) => line.format === undefined)).toBe(true);
        expect(roundTrip).toBe(source);

        for (const actual of BCD_TABLE) {
          const same = compare === 'C'
            ? actual.bcd === expected.bcd
            : compare === 'Z'
              ? (actual.bcd & 0o60) === (expected.bcd & 0o60)
              : (actual.bcd & 0o17) === (expected.bcd & 0o17);
          const shouldSet = not ? !same : same;
          const got = runMatcher(model, source, new Map([[1, actual.bcd]]));
          if (got !== (shouldSet ? '1' : '0')) {
            throw new Error(
              `${compare}${not ? ' NOT' : ''} expected ${expected.octal}/${expected.glyph} `
              + `against ${actual.octal}/${actual.glyph}: got ${got}`,
            );
          }
        }
      }
    }
    expect(sawSubstituteBlankOnSourceCard).toBe(compare !== 'D');
  }, 60_000);

  it('keeps eight mixed codes as one AND and preserves NOT polarity', () => {
    const codes: readonly RecordCode[] = [
      { position: 1, not: false, compare: 'C', code: 'A' },
      { position: 2, not: false, compare: 'Z', code: 'J' },
      { position: 3, not: false, compare: 'D', code: '7' },
      { position: 4, not: false, compare: 'C', code: 'ƀ' },
      { position: 5, not: false, compare: 'Z', code: 'A' },
      { position: 6, not: false, compare: 'D', code: '8' },
      { position: 7, not: false, compare: 'C', code: ',' },
      { position: 8, not: true, compare: 'C', code: ' ' },
    ];
    const model = modelWithRecords([record('01', codes)]);
    const source = matcherSource(model);
    const code = (glyph: string): number => {
      const value = bcdOfGlyph(glyph);
      if (value === undefined) throw new Error(`no BCD for ${glyph}`);
      return value;
    };
    const passing = new Map([
      [1, code('A')], [2, code('J')], [3, code('7')], [4, code('ƀ')],
      [5, code('A')], [6, code('8')], [7, code(',')], [8, code('A')],
    ]);

    expect(source).toContain('ƀ');
    expect(readSource(source).map((line) => line.card).join('\n')).toBe(source);
    expect(runMatcher(model, source, passing)).toBe('1');
    expect(runMatcher(model, source, new Map([...passing, [7, code('.')]]))).toBe('0');
  });
});

describe('Wave 5 append — generated storage and EOF composition seams', () => {
  it('emits allocator-owned storage in constants and counts it in both layout passes', () => {
    const storage = [
      { key: 'test:work', length: 4, fill: 'zero' as const },
      { key: 'test:text', length: 3, fill: 'blank' as const },
    ];
    const emitters: CycleEmitters = {
      generatedStorage: () => storage,
      readEofTarget: (_model, labels) => labels.label('test:eof'),
    };
    const firstLayout = layoutOf(SALES_SUMMARY_MODEL, 0, storage);
    const first = driver(SALES_SUMMARY_MODEL, firstLayout, emitters);
    const constants = first.get('constants') ?? [];
    const read = first.get('read') ?? [];

    expect(constants).toContainEqual({ label: 'Z001', op: 'DCW', operands: ['@0000@'] });
    expect(constants).toContainEqual({ label: 'Z002', op: 'DCW', operands: ['#3'] });
    expect(read[1]).toEqual({ op: 'BEF1', operands: ['Z003'] });

    const measured = CYCLE_ORDER
      .filter((section) => section !== 'areas')
      .flatMap((section) => first.get(section) ?? []);
    const n = measure(measured);
    const secondLayout = layoutOf(SALES_SUMMARY_MODEL, n, storage);
    const second = driver(SALES_SUMMARY_MODEL, secondLayout, emitters);

    expect(measure(CYCLE_ORDER
      .filter((section) => section !== 'areas')
      .flatMap((section) => second.get(section) ?? []))).toBe(n);
    expect(secondLayout.code - layoutOf(SALES_SUMMARY_MODEL, n).code).toBe(7);
  });
});
