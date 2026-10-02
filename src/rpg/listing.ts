// The constructed Card-RPG specification listing: scanned specification cards and diagnostics
// -> 132-position 1403 lines -> green-bar forms. No IBM 1410 RPG listing survives, so only the
// recovered separator/trailer text is period evidence; the stops and heading are ours.
// Phase-5 plan §9, §15; rpg-sources.md §3; research/METHOD.md.

import { bcdOfGlyph } from '../core/bcd.js';
import {
  DEFAULT_CARRIAGE_TAPE,
  PRINT_CHAIN_A_IS_DEFAULT,
  PRINT_POSITIONS,
  chainGlyph,
  renderGreenBar,
  type PrintChain,
} from '../core/devices/printer1403.js';
import type { PrintLine } from '../core/types.js';
import type { ScannedDeck } from './deck.js';
import type {
  RpgDiagnostic,
  RpgListingLine,
  RpgMessage,
  SheetKind,
  SpecCard,
  SpecRef,
} from './types.js';

export interface RpgListingColumn {
  readonly name: string;
  readonly from: number;
  readonly to: number;
}

/**
 * OPEN: `RPG_LISTING_COLUMN_STOPS` — `[unverified]`. No 1410 RPG specification listing survives;
 * these stops are our period-shaped construction inside the verified 132 positions of a 1403
 * Model 2. Fallback: any other stops, changed only in this one array and followed by regeneration
 * of the explicitly constructed golden. Plan §9, §15; Phase-5-NOTES.md §1;
 * open-questions.md, Phase 5 / Wave 6.
 */
export const RPG_LISTING_COLUMN_STOPS: readonly RpgListingColumn[] = [
  { name: 'SEQNO', from: 1, to: 5 },
  { name: 'SHEET', from: 7, to: 12 },
  { name: 'PGCARD', from: 14, to: 18 },
  { name: 'CARD IMAGE', from: 21, to: 100 },
  { name: 'FLAG', from: 103, to: 103 },
  { name: 'DIAGNOSTIC', from: 1, to: 132 },
];

const FULL_LINE: RpgListingColumn = { name: 'LINE', from: 1, to: PRINT_POSITIONS };
const BLANK_CARD = ''.padEnd(80);
const BLANK_REF: SpecRef = { seqno: 1, sheet: 'control', page: '', cardNo: '' };
const SHEET_LABEL: Readonly<Record<SheetKind, string>> = {
  control: 'RG',
  input: 'INPUT',
  data: 'DATA',
  calculation: 'CALC',
  format: 'FORMAT',
};
const END_AFTER: Readonly<Partial<Record<SheetKind, string>>> = {
  input: 'END INPUT SPECS',
  data: 'END DATA SPECS',
  calculation: 'END CALC SPECS',
};
const TRAILER = 'END OF RPG.BEGIN AUTOCODER';

function column(name: string): RpgListingColumn {
  return RPG_LISTING_COLUMN_STOPS.find((candidate) => candidate.name === name) ?? FULL_LINE;
}

function place(row: string[], target: RpgListingColumn, text: string): void {
  const width = target.to - target.from + 1;
  for (const [index, glyph] of [...text].slice(0, width).entries()) {
    row[target.from - 1 + index] = glyph;
  }
}

function diagnosticsAt(
  diagnostics: readonly RpgDiagnostic[],
  at: SpecRef,
): readonly RpgDiagnostic[] {
  return diagnostics.filter((diagnostic) => diagnostic.at.seqno === at.seqno);
}

function listingMessage(
  kind: 'separator' | 'diagnostic' | 'trailer',
  at: SpecRef,
  card: SpecCard,
  message: RpgMessage,
): RpgListingLine {
  return { kind, at, card, message };
}

/** Build the semantic listing rows without rendering or renumbering the specification deck. */
export function buildRpgListing(
  scanned: ScannedDeck,
  diagnostics: readonly RpgDiagnostic[],
): readonly RpgListingLine[] {
  const lines: RpgListingLine[] = [];
  const consumed = new Set<RpgDiagnostic>();
  const boundaries = new Map(scanned.boundaryMessages.map((message) => [message.text, message]));
  let page: string | undefined;

  for (const [index, parsed] of scanned.cards.entries()) {
    if (parsed.at.page !== page) {
      page = parsed.at.page;
      lines.push({ kind: 'heading', at: parsed.at, card: parsed.card });
    }

    const found = diagnosticsAt(diagnostics, parsed.at);
    const flag = found.some((diagnostic) => diagnostic.severity === 'terminate')
      ? 'E' as const
      : found.length === 0 ? undefined : 'W' as const;
    lines.push({
      kind: 'spec',
      at: parsed.at,
      card: parsed.card,
      ...(flag === undefined ? {} : { flag }),
    });
    for (const diagnostic of found) {
      consumed.add(diagnostic);
      lines.push(listingMessage('diagnostic', diagnostic.at, parsed.card, diagnostic.message));
    }

    const next = scanned.cards[index + 1];
    if (next?.at.sheet !== parsed.at.sheet) {
      const text = END_AFTER[parsed.at.sheet];
      const message = text === undefined ? undefined : boundaries.get(text);
      if (message !== undefined) lines.push(listingMessage('separator', parsed.at, parsed.card, message));
    }
  }

  for (const diagnostic of diagnostics) {
    if (consumed.has(diagnostic)) continue;
    if (diagnostic.at.page !== page) {
      page = diagnostic.at.page;
      lines.push({ kind: 'heading', at: diagnostic.at, card: BLANK_CARD });
    }
    lines.push(listingMessage('diagnostic', diagnostic.at, BLANK_CARD, diagnostic.message));
  }

  const trailer = boundaries.get(TRAILER);
  if (trailer !== undefined) {
    const last = scanned.cards.at(-1) ?? { at: diagnostics.at(-1)?.at ?? BLANK_REF, card: BLANK_CARD };
    lines.push(listingMessage('trailer', last.at, last.card, trailer));
  }
  return lines;
}

function diagnosticText(message: RpgMessage): string {
  const number = message.messageNo === undefined ? '' : `${message.messageNo} `;
  return `${number}${message.text} - ${message.provenance}`.toUpperCase();
}

function compose(line: RpgListingLine): string {
  const row = new Array<string>(PRINT_POSITIONS).fill(' ');
  if (line.kind === 'heading') {
    const title = 'CONSTRUCTED RPG SPECIFICATION LISTING';
    place(row, FULL_LINE, title);
    const right = `SOURCE PAGE ${line.at.page || 'UNNUMBERED'}`;
    place(row, { name: 'PAGE', from: PRINT_POSITIONS - right.length + 1, to: PRINT_POSITIONS }, right);
    return row.join('');
  }
  if (line.kind === 'diagnostic') {
    place(
      row,
      column('DIAGNOSTIC'),
      line.message === undefined ? '' : diagnosticText(line.message),
    );
    return row.join('');
  }
  if (line.kind === 'separator' || line.kind === 'trailer') {
    place(row, FULL_LINE, line.message?.text ?? '');
    return row.join('');
  }

  place(row, column('SEQNO'), String(line.at.seqno).padStart(5, '0'));
  place(row, column('SHEET'), SHEET_LABEL[line.at.sheet]);
  place(row, column('PGCARD'), `${line.at.page}${line.at.cardNo}`);
  place(row, column('CARD IMAGE'), line.card);
  if (line.flag !== undefined) place(row, column('FLAG'), line.flag);
  return row.join('');
}

/** Apply the selected 1403 chain to every stored listing glyph. */
function chained(text: string, chain: PrintChain): string {
  let printed = '';
  for (const glyph of text) {
    const bcd = bcdOfGlyph(glyph);
    // Invented diagnostics are modern prose and can contain punctuation outside Standard BCD.
    // The period artefact can only print a blank for such a character; the UI's diagnostic block
    // retains the exact text. Recovered messages are asserted to need no such substitution.
    printed += chainGlyph(bcd ?? 0, chain);
  }
  return printed;
}

/** Turn semantic rows into the one PrintLine array consumed by the shipped page renderer. */
export function formatRpgListing(
  lines: readonly RpgListingLine[],
  opts?: { readonly chain?: PrintChain },
): readonly PrintLine[] {
  const chain = opts?.chain ?? PRINT_CHAIN_A_IS_DEFAULT;
  const paper: PrintLine[] = [];
  let page = 0;
  let line = 0;
  for (const entry of lines) {
    if (entry.kind === 'heading') {
      page += 1;
      line = 0;
    }
    if (page === 0) page = 1;
    line += 1;
    paper.push({ page, line, text: chained(compose(entry), chain) });
  }
  return paper;
}

/** Render the constructed listing on 66-line green-bar forms. */
export function renderRpgListing(
  lines: readonly RpgListingLine[],
  opts?: { readonly chain?: PrintChain },
): string {
  const chain = opts?.chain ?? PRINT_CHAIN_A_IS_DEFAULT;
  return renderGreenBar(formatRpgListing(lines, { chain }), {
    chain,
    formLines: DEFAULT_CARRIAGE_TAPE.formLines,
  });
}
