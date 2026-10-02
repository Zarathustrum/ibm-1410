import { bcdOfGlyph } from '../../core/bcd.js';
import { TWELVE_PUNCH } from '../../asm/source.js';
import type { SpecCard } from '../types.js';

export const SPEC_CARD_COLUMNS = 80;

/**
 * OPEN: `FIFTY_ONE_COLUMN_MODE_IS_OUT` — `[verified]` for the 1401 translation and
 * `[unverified]` for whether the 1410 retained it. J24-0215-2 p.44 maps a 51-column 1401 card's
 * columns 1-51 into physical columns 15-65. This project accepts only the 80-column shared-form
 * layout because architecture.md §12 already refuses the 51-column feed. Fallback: translate
 * accepted 51-column input by +14 here. Plan §15; open-questions.md, Phase 5 / Wave 4.
 */
export const FIFTY_ONE_COLUMN_MODE_IS_OUT = true;

export interface SpecReadIssue {
  readonly column: number;
  readonly message: string;
}

/** A normalized physical specification card before deck-order classification. */
export interface ReadSpecLine {
  readonly line: number;
  readonly card: SpecCard;
  readonly issues: readonly SpecReadIssue[];
}

/**
 * Read pasted RPG specification text using the same source-box aliases as Autocoder.
 * Classification belongs to deck.ts: a bad column-1 card has no truthful SheetKind yet.
 */
export function readSpecSource(text: string): readonly ReadSpecLine[] {
  const result: ReadSpecLine[] = [];
  const pasted = text.split('\n');

  for (let index = 0; index < pasted.length; index++) {
    const typedLine = (pasted[index] ?? '').replace(/[ \r]+$/, '');
    if (typedLine === '') continue;

    const issues: SpecReadIssue[] = [];
    const glyphs: string[] = [];
    for (const typed of typedLine) {
      if (glyphs.length === SPEC_CARD_COLUMNS) {
        issues.push({
          column: SPEC_CARD_COLUMNS + 1,
          message: `the line is longer than ${SPEC_CARD_COLUMNS} columns`,
        });
        break;
      }

      const column = glyphs.length + 1;
      if (typed === '\t') {
        issues.push({
          column,
          message: 'a tab is not a punch — write the columns out, or read them off the ruler',
        });
        glyphs.push(' ');
        continue;
      }

      const stored = typed >= 'a' && typed <= 'z'
        ? typed.toUpperCase()
        : typed === '+' ? TWELVE_PUNCH : typed;
      if (bcdOfGlyph(stored) === undefined) {
        issues.push({ column, message: `"${typed}" is not one of the 64 machine glyphs` });
        glyphs.push(' ');
      } else {
        glyphs.push(stored);
      }
    }

    result.push({
      line: index + 1,
      card: glyphs.join('').padEnd(SPEC_CARD_COLUMNS),
      issues,
    });
  }

  return result;
}
