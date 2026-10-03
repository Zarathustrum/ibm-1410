import { ORG_DEFAULT } from '../asm/types.js';
import type { Addr } from '../core/types.js';
import { RpgBug, type Layout, type Model, type Stmt } from './types.js';

export const CARD_IMAGE_LENGTH = 80;
export const PRINT_LINE_LENGTH = 132;
export const PAGENO_LENGTH = 3;

const HUNDREDS = 100;
const CORE_SIZES = [10_000, 20_000, 40_000, 60_000, 80_000] as const;
const RUNTIME_MESSAGE_RECORD_NOT_FOUND = 'RECORD TYPE NOT FOUND';
const RUNTIME_MESSAGE_INPUT_OUT_OF_SEQ = 'INPUT REC OUT OF SEQ';

export interface LayoutExtent {
  readonly name: 'code' | 'slack' | 'indicatorFile' | 'cardIn' | 'printLine' | 'printGroupMark';
  readonly start: Addr;
  readonly end: Addr;
  readonly length: number;
}

export interface LayoutInvariant {
  readonly extents: readonly LayoutExtent[];
  readonly expectedPrintLine: Addr;
  readonly ok: boolean;
  readonly errors: readonly string[];
}

/**
 * Model-derived mutable storage emitted with the constants run. Its label comes from the shared
 * cycle `Znnn` allocator; layout needs only the exact length/fill so pass 2 counts the same bytes
 * that `cycle.ts` emits. Wave 5 uses this seam for arithmetic work and sequence state without
 * reopening the published user/generated symbol families.
 */
export interface GeneratedStorage {
  readonly key: string;
  readonly length: number;
  readonly fill: 'zero' | 'blank';
}

function decimal(text: string): number {
  return Number(text);
}

function constantLength(operand: string): number {
  if (/^#[0-9]+$/.test(operand)) return Number(operand.slice(1));
  if (/^@.*@$/.test(operand)) return operand.length - 2;
  return 5;
}

export function measureStmt(stmt: Stmt): number {
  if ((stmt.kind ?? 'statement') === 'comment') return 0;
  const op = stmt.op.toUpperCase();
  switch (op) {
    case 'ORG':
      return 0;
    case 'DC':
    case 'DCW':
      return constantLength(stmt.operands[0] ?? '');
    case 'DS':
      return decimal(stmt.operands[0] ?? '');
    case 'DA': {
      const match = /^([0-9]+)X([0-9]+)$/.exec(stmt.operands[0] ?? '')!;
      return Number(match[1]) * Number(match[2]);
    }
    default: {
      // This is the stated Phase-5 sizing rule, not an assembler-table lookup (plan §6).
      // An I/O form adds the three-position x-control and has one B address; reader/punch
      // pockets are not addresses. A carriage/stacker form carries only its d. BCE carries
      // two addresses plus its written d. B-family and move/scan mnemonics bake a d.
      const io = /^(?:R(?:[12])?W?O?|P(?:[12])?W?O?|W(?:[12])?W?O?|WM(?:[12])?O?|RCPW?O?|WCPW?O?)$/.test(op);
      const dOnly = /^(?:CC[12]|SSF[12])$/.test(op);
      const explicitD = op === 'BCE';
      const bakedD = /^B/.test(op) || /^(?:M[LR]|SCN[LR])/.test(op);
      const addresses = io ? 1
        : dOnly ? 0
          : explicitD ? stmt.operands.length - 1
            : stmt.operands.length;
      return 1
        + (io ? 3 : 0)
        + addresses * 5
        + (io || dOnly || explicitD || bakedD ? 1 : 0);
    }
  }
}

export function measure(stmts: readonly Stmt[]): number {
  let total = 0;
  for (const stmt of stmts) total += measureStmt(stmt);
  return total;
}

function setLength(lengths: Map<string, number>, name: string, length: number): void {
  lengths.set(name, length);
}

function fieldLengthsOf(model: Model): ReadonlyMap<string, number> {
  const lengths = new Map<string, number>();
  setLength(lengths, 'PAGENO', PAGENO_LENGTH);
  for (const field of model.fields) setLength(lengths, field.name, field.length);
  for (const step of model.calcs) {
    if (step.result !== undefined && step.length !== undefined) {
      setLength(lengths, step.result, step.length);
    }
  }
  return lengths;
}

function calcLiteralTexts(model: Model): readonly string[] {
  const texts = new Set<string>();
  const maybeAdd = (text: string | undefined): void => {
    if (text === undefined) return;
    if (/^[A-Z][A-Z0-9]{0,9}$/.test(text)) return;
    texts.add(text);
  };
  for (const step of model.calcs) {
    maybeAdd(step.factor1?.text);
    maybeAdd(step.factor2?.text);
  }
  return [...texts];
}

function wordLengthsOf(model: Model): ReadonlyMap<string, number> {
  const lengths = new Map<string, number>();
  for (const line of model.lines) {
    for (const field of line.fields) {
      if (field.kind !== 'W') continue;
      setLength(lengths, field.name!, field.literal!.length);
    }
  }
  return lengths;
}

function kLiteralTexts(model: Model): readonly string[] {
  const texts = new Set<string>();
  texts.add('1');
  for (const text of calcLiteralTexts(model)) texts.add(text);
  for (const line of model.lines) {
    for (const field of line.fields) {
      if (field.kind === 'K' && field.literal !== undefined) texts.add(field.literal);
    }
  }
  for (const line of model.lines) {
    for (const field of line.fields) {
      if ((field.kind === 'F' || field.kind === 'B')
        && field.literal !== undefined
        && !/^WORD\d{2}$/.test(field.literal)) {
        texts.add(field.literal);
      }
    }
  }
  texts.add(RUNTIME_MESSAGE_RECORD_NOT_FOUND);
  if (model.sequenceField !== undefined) {
    texts.add(RUNTIME_MESSAGE_INPUT_OUT_OF_SEQ);
  }
  return [...texts];
}

function longestResetField(model: Model, lengths: ReadonlyMap<string, number>): number {
  let longest = 0;
  for (const line of model.lines) {
    for (const field of line.fields) {
      if (field.kind !== 'B') continue;
      const name = field.name!;
      const length = lengths.get(name) ?? missingModelObject(name);
      longest = Math.max(longest, length);
    }
  }
  return longest;
}

/** The one layout-side RpgBug category: a valid Model names storage the layout cannot derive. */
function missingModelObject(name: string): never {
  throw new RpgBug(`layout: model has no storage object named ${name}`);
}

/**
 * OPEN: `INDICATORS_ARE_ONE_CHARACTER_EACH` — `[unverified]`. Each condition gets one readable
 * core position holding `1` or `0`, so generated BCE tests have symmetric positive/negative
 * forms. Fallback: bit-pack the file and test masks with BBE. Plan §15; `open-questions.md`,
 * Phase 5 / Wave 2.
 */
export const INDICATORS_ARE_ONE_CHARACTER_EACH = true;

/**
 * OPEN: `ONLY_REFERENCED_INDICATORS_ARE_ALLOCATED` — `[unverified]`. Layout reserves exactly
 * Model.indicators, the deck conditions plus generated cycle cells the program actually
 * references, contiguously; it does not manufacture a fixed 00-99 file. Fallback: allocate 109
 * positions for 100 numbered and nine named conditions.
 * Plan §15; `open-questions.md`, Phase 5 / Wave 2.
 */
export const ONLY_REFERENCED_INDICATORS_ARE_ALLOCATED = true;

function constantsLengthOf(
  model: Model,
  generatedStorage: readonly GeneratedStorage[],
): number {
  const fields = fieldLengthsOf(model);
  const words = wordLengthsOf(model);
  const kLiterals = kLiteralTexts(model);
  const zerosLength = longestResetField(model, fields);
  let total = 1 + 1 + 1; // ONE, ZERO, FIVE
  for (const text of kLiterals) total += text.length;
  total += model.indicators.length; // IZERO
  total += zerosLength; // ZEROS
  for (const length of fields.values()) total += length;
  for (const field of model.controlFields) total += field.length * 2; // CNn and COn
  for (const length of words.values()) total += length;
  for (const storage of generatedStorage) total += storage.length;
  return total;
}

/**
 * OPEN: `RECORD_POSITION_IS_THREE_DIGITS` — `[unverified]`. The shared X24 card-system forms
 * carry record positions in three columns (J24-0215-2 pp.19-24; A22-6826-4 Part 3, about p.14,
 * identifies the forms for 1401/1410 Card Systems). Layout therefore publishes `Cnnn` labels.
 * Fallback: cap at 999 with "unsupported: requires C28-1443"; widen only if C28-1443 or RPGIN
 * proves that Full-RPG did. Plan §15; `open-questions.md`, Phase 5 / Wave 2.
 */
export const RECORD_POSITION_IS_THREE_DIGITS = true;

function referencedCardPositions(model: Model): readonly number[] {
  const positions = new Set<number>();
  for (const record of model.records) {
    for (const code of record.codes) positions.add(code.position);
  }
  for (const field of model.controlFields) positions.add(field.end);
  for (const data of model.fields) {
    for (const source of data.sources) {
      if (source.kind === 'record' && source.end !== undefined) positions.add(source.end);
    }
  }
  return [...positions].sort((a, b) => a - b);
}

function coreSizeCodeOf(highWater: Addr): 1 | 2 | 3 | 4 | 5 {
  const code = CORE_SIZES.findIndex((limit) => highWater <= limit);
  // A pass-2 layout above 80K still punches CTL 5. The mandatory assembler gate then flags
  // every address outside that machine, instead of manufacturing a third RpgBug category.
  if (code === -1) return 5;
  return (code + 1) as 1 | 2 | 3 | 4 | 5;
}

/**
 * OPEN: `GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET` — `[likely]`. The recovered 1410
 * processor skeleton supplies PAGENO/SER/WORD/LC/OF (PR-108 bytes 1,107,574-1,254,470); Phase 5
 * extends that namespace with its section heads and generated Z/K/RC/C/CN/CO/F/WORD families,
 * all checked against the shipped resolver. Fallback: put every internal label on Z+digits and
 * move readable names into comments. Plan §15; `open-questions.md`, Phase 5 / Wave 2.
 */
export const GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET = true;

function indicatorLabel(name: string): string {
  if (/^[0-9]{2}$/.test(name)) return `RC${name}`;
  if (name === '1P') return 'FSTPG';
  return name;
}

/**
 * OPEN: `RESERVED_AREAS_SIT_ABOVE_THE_CODE_AND_BELOW_THE_PRINT_GROUP_MARK` — our layout
 * ruling. Constants and code are contiguous, followed by one unreserved slack cell and every
 * DS/DA area; emitted PLGM is the named exception above them all so its GM-WM tail lands in
 * untouched core. Fallback: enumerate and justify expected assembler warnings by name.
 * Plan §15; `open-questions.md`, Phase 5 / Wave 2.
 */
export const RESERVED_AREAS_SIT_ABOVE_THE_CODE_AND_BELOW_THE_PRINT_GROUP_MARK = true;

/**
 * OPEN: `RESERVED_AREAS_ARE_PAIRWISE_DISJOINT_AND_THE_PRINT_AREA_CLEARS_THE_CARD_IMAGE` —
 * our arithmetic ruling. Code, slack, indicator file, 80-column card image, 132-position print
 * line and PLGM must be ascending and non-overlapping, and PLINE rounds from CDIN's end. There is
 * no fallback: DA/DS emit nothing, so the assembler cannot detect this overlap. Plan §15;
 * `open-questions.md`, Phase 5 / Wave 2.
 */
export const RESERVED_AREAS_ARE_PAIRWISE_DISJOINT_AND_THE_PRINT_AREA_CLEARS_THE_CARD_IMAGE = true;

/**
 * OPEN: `PRINT_AREA_IS_HUNDREDS_ALIGNED` — `[likely]`. The 1410 CS instruction clears data and
 * word marks right-to-left through a hundreds boundary (A22-0526-3 p.23), so PLINE starts on one
 * and two CS instructions clear 132 positions without touching PLGM. Fallback: move a 132-blank
 * constant with MLCA and remove the alignment constraint. Plan §15; `open-questions.md`, Phase 5
 * / Wave 2.
 */
export const PRINT_AREA_IS_HUNDREDS_ALIGNED = true;

/**
 * OPEN: `CARD_AREA_IS_CLEARED_AT_ENTRY_AND_HUNDREDS_ALIGNED` — our ruling (Zarathustrum, 2026-10-02) over a
 * `[verified]` instruction. The generated program may not assume clean core: the desk keeps one
 * machine for the page, and a trajectory job's word mark at 01963 once shortened a `ZA` reading
 * CDIN to three digits. A move-mode read leaves core word marks where they are (A22-0526-3
 * pp.40-41), and nothing loads IND or CDIN, so a prior job's marks there survive into this one.
 * The indicator file therefore starts on a hundreds boundary with the card image right above it,
 * and START's CS run clears both, data and word marks, before anything reads them (CS, p.23).
 * The cost is up to 99 idle positions below IND. Fallback: CW (p.22) two positions at a time.
 * `PHASE-6-NOTES.md` §4 item 16; `docs/DECISIONS.md`, Phase 6 merge.
 */
export const CARD_AREA_IS_CLEARED_AT_ENTRY_AND_HUNDREDS_ALIGNED = true;

export function layoutInvariant(layout: Layout, model: Model): LayoutInvariant {
  const indicatorLength = model.indicators.length;
  const candidates: LayoutExtent[] = [
    {
      name: 'code',
      start: layout.constants,
      end: layout.slack - 1,
      length: layout.codeLength,
    },
    { name: 'slack', start: layout.slack, end: layout.slack, length: 1 },
    {
      name: 'indicatorFile',
      start: layout.indicatorFile,
      end: layout.indicatorFile + indicatorLength - 1,
      length: indicatorLength,
    },
    {
      name: 'cardIn',
      start: layout.cardIn,
      end: layout.cardIn + CARD_IMAGE_LENGTH - 1,
      length: CARD_IMAGE_LENGTH,
    },
    {
      name: 'printLine',
      start: layout.printLine,
      end: layout.printLine + PRINT_LINE_LENGTH - 1,
      length: PRINT_LINE_LENGTH,
    },
    {
      name: 'printGroupMark',
      start: layout.printGroupMark,
      end: layout.printGroupMark,
      length: 1,
    },
  ];
  const extents = candidates.filter((extent) => extent.length > 0);

  const errors: string[] = [];
  const expectedPrintLine = Math.ceil((layout.cardIn + CARD_IMAGE_LENGTH) / HUNDREDS) * HUNDREDS;
  if (layout.slack !== layout.constants + layout.codeLength) {
    errors.push('slack must follow the constants-and-code run');
  }
  if (layout.indicatorFile !== Math.ceil((layout.slack + 1) / HUNDREDS) * HUNDREDS) {
    errors.push('indicatorFile must be the first hundreds boundary above the slack');
  }
  if (layout.cardIn - layout.indicatorFile < indicatorLength) {
    errors.push('indicator file is shorter than the referenced-indicator set');
  }
  if (layout.printLine !== expectedPrintLine) {
    errors.push('printLine must be the first hundreds boundary at or above the card image end');
  }
  if (layout.printGroupMark !== layout.printLine + PRINT_LINE_LENGTH) {
    errors.push('printGroupMark must sit at PLINE+132');
  }
  for (let i = 0; i < extents.length - 1; i++) {
    const left = extents[i];
    const right = extents[i + 1];
    if (left === undefined || right === undefined) continue;
    if (left.start >= right.start) {
      errors.push(`${left.name} must start before ${right.name}`);
    }
    if (left.end >= right.start) {
      errors.push(`${left.name} overlaps ${right.name}`);
    }
  }

  return { extents, expectedPrintLine, ok: errors.length === 0, errors };
}

export function layoutOf(
  model: Model,
  codeLength: number,
  generatedStorage: readonly GeneratedStorage[] = [],
): Layout {
  const constants = ORG_DEFAULT;
  const code = constants + constantsLengthOf(model, generatedStorage);
  const slack = constants + codeLength;
  const indicatorFile = Math.ceil((slack + 1) / HUNDREDS) * HUNDREDS;
  const cardIn = indicatorFile + model.indicators.length;
  const printLine = Math.ceil((cardIn + CARD_IMAGE_LENGTH) / HUNDREDS) * HUNDREDS;
  const printGroupMark = printLine + PRINT_LINE_LENGTH;
  const highWater = printGroupMark + 1;
  const areaAddrs = new Map<string, Addr>();

  areaAddrs.set('IND', indicatorFile);
  for (const [index, name] of model.indicators.entries()) {
    const addr = indicatorFile + index;
    areaAddrs.set(name, addr);
    areaAddrs.set(indicatorLabel(name), addr);
  }
  areaAddrs.set('CDIN', cardIn);
  for (const position of referencedCardPositions(model)) {
    areaAddrs.set(`C${String(position).padStart(3, '0')}`, cardIn + position - 1);
  }
  areaAddrs.set('PLINE', printLine);
  areaAddrs.set('PLGM', printGroupMark);

  return {
    org: ORG_DEFAULT,
    constants,
    code,
    codeLength,
    slack,
    indicatorFile,
    cardIn,
    printLine,
    printGroupMark,
    highWater,
    coreSizeCode: coreSizeCodeOf(highWater),
    areaOf(name: string): Addr | undefined {
      return areaAddrs.get(name);
    },
  };
}
