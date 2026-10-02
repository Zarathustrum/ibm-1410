import {
  COMMENT_COLUMN, SOURCE_FIELDS, type SourceCard,
} from '../asm/types.js';
import type { Stmt } from './types.js';

const SEQUENCE_COLUMNS = 3;
const COMMENT_TEXT_COLUMNS = SOURCE_FIELDS.operand[1] - COMMENT_COLUMN;

function asStored(text: string): string {
  return [...text].map((glyph) => (glyph === '+' ? '&' : glyph)).join('');
}

function field(text: string, width: number): string {
  const stored = asStored(text);
  return stored.padEnd(width);
}

function labelField(stmt: Stmt): string {
  const label = stmt.label ?? '';
  if (stmt.indent === true) {
    return field(` ${label}`, SOURCE_FIELDS.label[1] - SOURCE_FIELDS.label[0] + 1);
  }
  return field(label, SOURCE_FIELDS.label[1] - SOURCE_FIELDS.label[0] + 1);
}

function operandText(stmt: Stmt): string {
  const operands = stmt.op === 'CTL' && stmt.operands.length === 1 && stmt.operands[0]?.length === 1
    ? ` ${stmt.operands[0]}`
    : stmt.op.length === SOURCE_FIELDS.op[1] - SOURCE_FIELDS.op[0] + 1 && stmt.operands.length > 0
      ? ` ${stmt.operands.join(',')}`
    : stmt.operands.join(',');
  const comment = stmt.comment === undefined ? ''
    : stmt.comment.startsWith('  ') ? stmt.comment : `  ${stmt.comment}`;
  return `${operands}${comment}`;
}

/**
 * Format one generator-internal statement. The Phase-5 generator validates specification
 * content before constructing Stmt/pglin/ident; this boundary deliberately neither truncates nor
 * substitutes invalid input and has no third RpgBug category (plan §6.3). The full-target and
 * corpus oracles enforce 80-column, 64-glyph SourceCards on every caller-produced value.
 */
export function toCard(stmt: Stmt, pglin: string, ident: string): SourceCard {
  const pglinField = field(pglin, SOURCE_FIELDS.line[1]);
  const identField = field(ident, SOURCE_FIELDS.ident[1] - SOURCE_FIELDS.ident[0] + 1);

  if ((stmt.kind ?? 'statement') === 'comment') {
    const text = field(stmt.comment ?? '', COMMENT_TEXT_COLUMNS);
    return `${pglinField}*${text}${' '.repeat(SEQUENCE_COLUMNS)}${identField}`;
  }

  const opWidth = SOURCE_FIELDS.op[1] - SOURCE_FIELDS.op[0] + 1;
  const operandWidth = SOURCE_FIELDS.operand[1] - SOURCE_FIELDS.operand[0] + 1;
  return pglinField
    + labelField(stmt)
    + field(stmt.op, opWidth)
    + field(operandText(stmt), operandWidth)
    + ' '.repeat(SEQUENCE_COLUMNS)
    + identField;
}
