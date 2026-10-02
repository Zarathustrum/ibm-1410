import { oursMessage, RPG_PROCESSOR_MESSAGES } from './messages.js';
import type { RpgDiagnostic, RpgMessage, SheetKind, SpecCard, SpecRef } from './types.js';
import { parseCalcCard, type CalcRow } from './sheets/calc.js';
import { cardIdentityOf, CONTROL_COLUMNS, INPUT_COLUMNS, valueOf } from './sheets/columns.js';
import { parseControlCard, type ControlRow } from './sheets/control.js';
import { parseDataCard, type DataRow } from './sheets/data.js';
import { parseFormatCard, type FormatRow } from './sheets/format.js';
import { parseInputCard, type InputRow } from './sheets/input.js';
import { readSpecSource, type ReadSpecLine } from './sheets/read.js';

/**
 * OPEN: `SPEC_DECK_ORDER_IS_THE_1401_ORDER` — `[verified]` for the shared 1401 X24 sheet deck
 * (J24-0215-2 p.44) and `[likely]` for the lost 1410 Card-RPG processor. We scan RG, Input, Data,
 * Calculation, Format and never reorder cards. Fallback: one transition table here if C28-1443
 * establishes a different 1410 order. Plan §15; open-questions.md, Phase 5 / Wave 4.
 */
export const SPEC_DECK_ORDER_IS_THE_1401_ORDER = true;

/**
 * OPEN: `WE_ARE_MODELLING_CARD_RPG` — C28-1443 establishes that a 1410 Card-RPG existed, while
 * its program number and minimum configuration remain unrecovered. The project is card-only by
 * settled peripheral scope and never claims Full-RPG program 1410-RG-910. Fallback: none; this
 * constant prevents that unsupported identity from entering the UI. Plan §15; open-questions.md,
 * Phase 5 / Wave 4.
 */
export const WE_ARE_MODELLING_CARD_RPG = true;

export interface ParsedSpecCard {
  readonly card: SpecCard;
  readonly at: SpecRef;
}

export interface ScannedControlCard extends ParsedSpecCard {
  readonly kind: '1405' | '1301';
}

/** The explicit §5.3 state-machine output: ordered card sections, before sheet-row parsing. */
export interface ScannedDeck {
  readonly cards: readonly ParsedSpecCard[];
  readonly control?: ParsedSpecCard;
  readonly controls: readonly ScannedControlCard[];
  readonly input: readonly ParsedSpecCard[];
  readonly data: readonly ParsedSpecCard[];
  readonly calculations: readonly ParsedSpecCard[];
  readonly format: readonly ParsedSpecCard[];
  readonly boundaryMessages: readonly RpgMessage[];
  readonly diagnostics: readonly RpgDiagnostic[];
}

/** Sheet-row parse output consumed by model.ts. */
export interface ParsedDeck {
  readonly cards: readonly ParsedSpecCard[];
  readonly control?: ControlRow;
  readonly input: readonly InputRow[];
  readonly data: readonly DataRow[];
  readonly calculations: readonly CalcRow[];
  readonly format: readonly FormatRow[];
  readonly boundaryMessages: readonly RpgMessage[];
  readonly diagnostics: readonly RpgDiagnostic[];
}

const SECTION_ORDER = {
  input: 1,
  data: 2,
  calculation: 3,
  format: 4,
} as const;

type Classified = SheetKind | '1405' | '1301' | 'unknown';

function classify(card: SpecCard): Classified {
  if (valueOf(card, CONTROL_COLUMNS, 'rg') === 'RG') return 'control';
  const firstToken = card.trimStart();
  if (firstToken.startsWith('1405')) return '1405';
  if (firstToken.startsWith('1301')) return '1301';
  const code = valueOf(card, INPUT_COLUMNS, 'c');
  if (code === 'C') return 'input';
  if (code === 'S' && valueOf(card, INPUT_COLUMNS, 'seq') === 'CF') return 'input';
  if (code === 'D') return 'data';
  if (code === 'A') return 'calculation';
  if (code === 'L' || code === 'F' || code === 'B' || code === 'K' || code === 'W') return 'format';
  return 'unknown';
}

function expectedSheet(highest: number): SheetKind {
  if (highest <= SECTION_ORDER.input) return 'input';
  if (highest === SECTION_ORDER.data) return 'data';
  if (highest === SECTION_ORDER.calculation) return 'calculation';
  return 'format';
}

function referenceOf(line: ReadSpecLine, seqno: number, sheet: SheetKind): SpecRef {
  return { seqno, sheet, ...cardIdentityOf(line.card) };
}

function issueDiagnostics(line: ReadSpecLine, at: SpecRef): readonly RpgDiagnostic[] {
  return line.issues.map((issue) => ({
    at,
    column: issue.column,
    message: oursMessage(issue.message, 'phase-5-rpg.md §5.1; shared source-box input rule'),
    severity: 'terminate' as const,
  }));
}

/** Run only the explicit five-state deck-order scan; no sheet row is parsed here. */
export function scan(read: readonly ReadSpecLine[]): ScannedDeck {
  const cards: ParsedSpecCard[] = [];
  const controls: ScannedControlCard[] = [];
  const input: ParsedSpecCard[] = [];
  const data: ParsedSpecCard[] = [];
  const calculations: ParsedSpecCard[] = [];
  const format: ParsedSpecCard[] = [];
  const boundaryMessages: RpgMessage[] = [];
  const diagnostics: RpgDiagnostic[] = [];
  let control: ParsedSpecCard | undefined;
  let highest = 0;
  let endedInput = false;
  let endedData = false;
  let endedCalc = false;
  let terminalControlSeen = false;

  const firstLine = read[0];
  if (firstLine === undefined || classify(firstLine.card) !== 'control') {
    const at: SpecRef = firstLine === undefined
      ? { seqno: 1, sheet: 'control', page: '', cardNo: '' }
      : referenceOf(firstLine, 1, 'control');
    diagnostics.push({ at, message: RPG_PROCESSOR_MESSAGES[0], severity: 'terminate' });
  }

  for (let index = 0; index < read.length; index++) {
    const line = read[index];
    if (line === undefined) continue;
    const seqno = index + 1;
    const classified = classify(line.card);
    const sheet: SheetKind = classified === 'control' || classified === 'input'
      || classified === 'data' || classified === 'calculation' || classified === 'format'
      ? classified
      : expectedSheet(highest);
    const at = referenceOf(line, seqno, sheet);
    const scannedCard = { card: line.card, at };
    cards.push(scannedCard);
    diagnostics.push(...issueDiagnostics(line, at));

    if (classified === 'unknown') {
      diagnostics.push({
        at,
        column: 1,
        message: oursMessage(
          'column 1 does not identify an Input, Data, Calculation, or Format specification card',
          'rpg-sources.md §6, sheet-identifying character [verified]',
        ),
        severity: 'terminate',
      });
      continue;
    }

    if (classified === 'control') {
      if (index !== 0 || control !== undefined) {
        diagnostics.push({
          at: { ...at, sheet: 'control' },
          message: oursMessage(
            'RG control card must be first and appear exactly once',
            'J24-0215-2 p.44 deck order; phase-5-rpg.md §5.3',
          ),
          severity: 'terminate',
        });
        continue;
      }
      control = { card: line.card, at: { ...at, sheet: 'control' } };
      continue;
    }
    if (classified === '1405' || classified === '1301') {
      controls.push({ kind: classified, card: line.card, at: { ...at, sheet: 'control' } });
      terminalControlSeen = true;
      if (classified === '1405') {
        diagnostics.push({
          at: { ...at, sheet: 'control' },
          message: oursMessage(
            'unsupported: 1405 disk input is out of scope (DECISIONS.md 2026-08-30)',
            'DECISIONS.md 2026-08-30; phase-5-rpg.md §2.2',
          ),
          severity: 'terminate',
        });
      }
      continue;
    }

    const order = SECTION_ORDER[classified];
    if (order < highest) {
      diagnostics.push({
        at,
        message: oursMessage(
          `${classified} specification card appears after the ${expectedSheet(highest)} section was opened`,
          'J24-0215-2 p.44; rpg-sources.md §6.6 [verified for the 1401]',
        ),
        severity: 'terminate',
      });
      continue;
    }

    if (order > highest) {
      if (order >= SECTION_ORDER.data && input.length > 0 && !endedInput) {
        boundaryMessages.push(RPG_PROCESSOR_MESSAGES[8]);
        endedInput = true;
      }
      if (order >= SECTION_ORDER.calculation && data.length > 0 && !endedData) {
        boundaryMessages.push(RPG_PROCESSOR_MESSAGES[9]);
        endedData = true;
      }
      if (order >= SECTION_ORDER.format && calculations.length > 0 && !endedCalc) {
        boundaryMessages.push(RPG_PROCESSOR_MESSAGES[10]);
        endedCalc = true;
      }
      if (classified === 'format' && calculations.length === 0) {
        diagnostics.push({ at, message: RPG_PROCESSOR_MESSAGES[5], severity: 'terminate' });
      }
      highest = order;
    }

    if (classified === 'input') input.push(scannedCard);
    else if (classified === 'data') data.push(scannedCard);
    else if (classified === 'calculation') calculations.push(scannedCard);
    else format.push(scannedCard);
  }

  if (format.length === 0 && !terminalControlSeen
    && !diagnostics.some((diagnostic) => diagnostic.severity === 'terminate')) {
    const last = cards.at(-1)?.at ?? { seqno: 1, sheet: 'format' as const, page: '', cardNo: '' };
    diagnostics.push({ at: { ...last, sheet: 'format' }, message: RPG_PROCESSOR_MESSAGES[5], severity: 'terminate' });
  }
  if (format.length > 0) boundaryMessages.push(RPG_PROCESSOR_MESSAGES[12]);

  return {
    cards,
    ...(control === undefined ? {} : { control }),
    controls,
    input,
    data,
    calculations,
    format,
    boundaryMessages,
    diagnostics,
  };
}

/** Parse scanned card sections into the owning sheet modules' raw row types. */
export function parseScanned(scanned: ScannedDeck): ParsedDeck {
  const diagnostics = [...scanned.diagnostics];
  let control: ControlRow | undefined;
  if (scanned.control !== undefined) {
    const result = parseControlCard(scanned.control.card, scanned.control.at);
    control = result.row;
    diagnostics.push(...result.diagnostics);
  }

  for (const card of scanned.controls) {
    const result = parseControlCard(card.card, card.at);
    diagnostics.push(...result.diagnostics);
    if (card.kind === '1301' && result.diagnostics.length === 0) {
      diagnostics.push({
        at: card.at,
        message: oursMessage(
          'unsupported: 1301 disk input is out of scope (DECISIONS.md 2026-08-30)',
          'DECISIONS.md 2026-08-30; phase-5-rpg.md §2.2',
        ),
        severity: 'terminate',
      });
    }
  }

  const input = scanned.input.map(({ card, at }) => parseInputCard(card, at));
  const data = scanned.data.map(({ card, at }) => parseDataCard(card, at));
  const calculations = scanned.calculations.map(({ card, at }) => parseCalcCard(card, at));
  const format = scanned.format.map(({ card, at }) => parseFormatCard(card, at));

  const lineRows = format.filter((row) => row.kind === 'line');
  const hasPrintedOutput = lineRows.some((row) => row.print === 'X');
  if (hasPrintedOutput) {
    for (const row of lineRows) {
      if (row.print === '' && row.punch === '' && row.reserved === '') {
        diagnostics.push({ at: row.at, column: 5, message: RPG_PROCESSOR_MESSAGES[6], severity: 'flag' });
      }
    }
  }
  if (format.length > 0 && !hasPrintedOutput) {
    const at = format[0]?.at ?? { seqno: 1, sheet: 'format', page: '', cardNo: '' };
    diagnostics.push({ at, message: RPG_PROCESSOR_MESSAGES[7], severity: 'terminate' });
  }

  return {
    cards: scanned.cards,
    ...(control === undefined ? {} : { control }),
    input,
    data,
    calculations,
    format,
    boundaryMessages: scanned.boundaryMessages,
    diagnostics,
  };
}

/** Convenience surface used by Wave 4 tests: read → scan → parse sheet rows. */
export function parse(text: string): ParsedDeck {
  return parseScanned(scan(readSpecSource(text)));
}
