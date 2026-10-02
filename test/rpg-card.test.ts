import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { cardFields, field, readSource } from '../src/asm/source.js';
import { COMMENT_COLUMN, SOURCE_FIELDS } from '../src/asm/types.js';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { toCard } from '../src/rpg/card.js';
import { EDIT_WORD_RIDES_ON_THE_FIELD_ENTRY } from '../src/rpg/types.js';
import {
  SALES_SUMMARY_MODEL,
  SALES_SUMMARY_STATEMENTS,
} from './fixtures/sales-summary.model.js';

const TARGET_SOURCE = readFileSync('demos/sales-summary.asm', 'utf8');
const TARGET_LINES = readSource(TARGET_SOURCE);
const TARGET_CARDS = TARGET_LINES.map((line) => line.card);
const EMITTED_CARDS = SALES_SUMMARY_STATEMENTS.map((stmt, index) => {
  const target = TARGET_CARDS[index];
  if (target === undefined) throw new Error(`missing target card ${index + 1}`);
  return toCard(stmt, field(target, 'page') + field(target, 'line'), field(target, 'ident'));
});

function commentText(card: string): string {
  return card.slice(COMMENT_COLUMN, SOURCE_FIELDS.operand[1]).trimEnd();
}

describe('RPG Stmt -> Autocoder source card (plan §11 wave 2)', () => {
  it('re-emits the whole Wave-1 target through readSource normalization', () => {
    expect(TARGET_CARDS).toHaveLength(271);
    expect(SALES_SUMMARY_STATEMENTS).toHaveLength(271);
    expect(EMITTED_CARDS).toEqual(TARGET_CARDS);
  });

  it('round-trips every emitted card through readSource + cardFields field-for-field', () => {
    const roundTripped = readSource(EMITTED_CARDS.join('\n')).map((line) => line.card);
    expect(roundTripped).toEqual(EMITTED_CARDS);

    for (let index = 0; index < EMITTED_CARDS.length; index++) {
      const emitted = EMITTED_CARDS[index];
      const again = roundTripped[index];
      if (emitted === undefined || again === undefined) throw new Error(`missing card ${index + 1}`);

      expect(cardFields(again), `card ${index + 1}`).toEqual(cardFields(emitted));
      if (cardFields(emitted).comment) {
        expect(commentText(again), `card ${index + 1}`).toBe(commentText(emitted));
      }
    }
  });

  it('writes address adjustment as the stored 12-punch `&`, never typed `+`', () => {
    const card = EMITTED_CARDS.find((c) => field(c, 'operand').trimEnd() === 'PLINE&131');
    expect(card).toBeDefined();
    expect(EMITTED_CARDS.join('\n')).not.toContain('+');
  });

  it('keeps DA subentries as blank-op statements with one operand and no comment cut', () => {
    const rc01 = EMITTED_CARDS.find((c) => cardFields(c).label === 'RC01');
    expect(rc01).toBeDefined();
    if (rc01 === undefined) return;

    const fields = cardFields(rc01);
    expect(fields.op).toBe('');
    expect(fields.operand.trimEnd()).toBe('1');
    expect(fields.operand.trimEnd()).not.toContain('  ');
  });

  it('preserves the column-7 indent on PLINE', () => {
    const pline = EMITTED_CARDS.find((c) => cardFields(c).label === 'PLINE');
    expect(pline).toBeDefined();
    if (pline === undefined) return;
    expect(cardFields(pline).labelIndented).toBe(true);
  });

  it('emits only 64-glyph source cards', () => {
    for (const [cardIndex, card] of EMITTED_CARDS.entries()) {
      expect([...card], `card ${cardIndex + 1}`).toHaveLength(80);
      for (const [columnIndex, glyph] of [...card].entries()) {
        expect(bcdOfGlyph(glyph), `card ${cardIndex + 1}, column ${columnIndex + 1}`).not.toBeUndefined();
      }
    }
  });

  it('keeps reusable edit-word references on exactly the eight edited F/B entries', () => {
    const entries = SALES_SUMMARY_MODEL.lines.flatMap((line) => line.fields);
    const ordinary = entries.filter((entry) => entry.kind !== 'W');
    const edited = ordinary.filter((entry) => (
      (entry.kind === 'F' || entry.kind === 'B') && entry.literal !== undefined
    ));
    const words = entries.filter((entry) => entry.kind === 'W');

    expect(EDIT_WORD_RIDES_ON_THE_FIELD_ENTRY).toBe(true);
    expect(ordinary).toHaveLength(35);
    expect(edited.map((entry) => entry.literal)).toEqual([
      'WORD01', 'WORD03', 'WORD02', 'WORD02', 'WORD02', 'WORD02', 'WORD03', 'WORD03',
    ]);
    expect(words.map((entry) => entry.name)).toEqual(['WORD01', 'WORD02', 'WORD03']);
  });
});
