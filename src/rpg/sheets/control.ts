import { RPG_PROCESSOR_MESSAGES } from '../messages.js';
import type { RpgDiagnostic, SpecCard, SpecRef } from '../types.js';
import { CONTROL_COLUMNS, fieldOf, valueOf } from './columns.js';

/**
 * OPEN: `RG_CARD_BODY_IS_NOT_READ` — the 1410 RG card and its failure messages are `[verified]`
 * from the recovered PR-108 processor, but no RG column layout survives. Only `RG` in columns 1-2
 * is read; nonblank body columns 3-75 diagnose, while identity columns 76-80 are neither control
 * content nor diagnosed. Fallback: replace this parser wholesale if C28-1443 surfaces. Plan §15;
 * rpg-sources.md §5; open-questions.md, Phase 5 / Wave 4.
 */
export const RG_CARD_BODY_IS_NOT_READ = true;

export interface ControlRow {
  readonly at: SpecRef;
  readonly card: SpecCard;
  readonly kind: 'rg' | '1405' | '1301' | 'unknown';
  readonly body: string;
}

export interface ControlParseResult {
  readonly row: ControlRow;
  readonly diagnostics: readonly RpgDiagnostic[];
}

export function parseControlCard(card: SpecCard, at: SpecRef): ControlParseResult {
  const controlText = card.trim();
  const bodyRaw = valueOf(card, CONTROL_COLUMNS, 'body');
  const body = bodyRaw.trim();
  // CONTROL_COLUMNS deliberately does not invent a 1410 disk-card layout. For
  // the one recovered 1301 token, remove only the `01` already classified as
  // part of that token; identity columns 76-80 are outside bodyRaw.
  const terminalBody = bodyRaw.slice('01'.length).trim();
  const kind = valueOf(card, CONTROL_COLUMNS, 'rg') === 'RG'
    ? 'rg'
    : controlText.startsWith('1405') ? '1405'
      : controlText.startsWith('1301') ? '1301' : 'unknown';
  const row: ControlRow = { at, card, kind, body };

  if (kind === 'rg' && body !== '') {
    const bodyField = fieldOf(CONTROL_COLUMNS, 'body');
    const firstNonblank = bodyRaw.search(/\S/);
    return {
      row,
      diagnostics: [{
        at,
        ...(bodyField === undefined ? {} : { column: bodyField.cols[0] + firstNonblank }),
        message: RPG_PROCESSOR_MESSAGES[3],
        severity: 'terminate',
      }],
    };
  }

  if (kind === '1301' && terminalBody !== '') {
    return {
      row,
      diagnostics: [{ at, message: RPG_PROCESSOR_MESSAGES[4], severity: 'terminate' }],
    };
  }

  return { row, diagnostics: [] };
}
