// T2 — the demo program's own file: column-exact, and the data cards have not drifted.
// Source: docs/plans/phase-3-autocoder.md §10, §12.1 (T2), §11's wave-6 row.
//
// WHY THIS FILE EXISTS AT ALL. "Column-exact" is a claim about a file THIS PHASE OWNS, so §10
// checks it rather than asserting it: the JOB card in an earlier draft of the plan was **79**
// characters, which would have put `HDAD1` in columns 75-79 and punched `DAD1` into columns 76-80
// of every condensed card — a wrong artefact that `JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80`
// (§15) and storyboard step 6 both rest on, and that nothing else in the plan would have caught.
//
// The second half is the DRIFT GUARD. `demos/hello-dad.data.cards` is a COPY of lines 2-6 of
// `demos/hello-dad.cards`, a Phase-2 artefact Phase 3 may not modify (§3.4). The duplication is
// guarded here rather than apologised for in a comment, so the copy cannot drift.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assemble } from '../src/asm/assemble.js';
import { field } from '../src/asm/source.js';
import { SOURCE_COLUMNS } from '../src/asm/types.js';

const SOURCE_FILE = 'demos/hello-dad.asm';
const DATA_FILE = 'demos/hello-dad.data.cards';
const HAND_DECK_FILE = 'demos/hello-dad.cards';

/** §10: the file holds the NINETEEN cards `01010` … `01190` and nothing else. */
const SOURCE_CARDS = 19;
/** The ident §10 names, and the one the object deck is checked against in tier 4. */
const IDENT = 'HDAD1';
/** The five report cards are lines 2-6 of the Phase-2 hand deck — its card 1 is the program. */
const DATA_CARDS = 5;

const lines = (path: string): string[] => readFileSync(path, 'utf8').split('\n');

/** Lines as PUNCHED: the file's trailing newline is not a twentieth card. */
function cards(path: string): string[] {
  const out = lines(path);
  if (out.at(-1) === '') out.pop();
  return out;
}

describe('demos/hello-dad.asm is column-exact (plan §10)', () => {
  const source = cards(SOURCE_FILE);

  it('holds exactly nineteen source cards, sequenced 01010 through 01190', () => {
    expect(source).toHaveLength(SOURCE_CARDS);
    // The `....+....1…` ruler in §10's fence is a NOTE, not a card: a file that copied the fence
    // verbatim would have twenty lines and a bogus card 1, which is the trap §10 names.
    expect(source.map((card) => card.slice(0, 5)))
      // Page 01, lines 010 to 190 in tens — the coding sheet's own numbering, which leaves room
      // to insert nine cards between any two without renumbering the deck.
      .toEqual(Array.from({ length: SOURCE_CARDS }, (_, i) => `01${String((i + 1) * 10).padStart(3, '0')}`));
  });

  it('no line exceeds eighty columns', () => {
    for (const [index, card] of source.entries()) {
      expect(card.length, `card ${index + 1} is ${card.length} columns`)
        .toBeLessThanOrEqual(SOURCE_COLUMNS);
    }
  });

  it('the JOB card is EXACTLY eighty columns with HDAD1 in 76-80', () => {
    const job = source.find((card) => card.slice(15, 20).trimEnd() === 'JOB');
    expect(job, 'the deck has a JOB card').toBeDefined();
    // EXACTLY 80, not "at most": the ident is read by absolute column, so a 79-character card
    // silently shifts it left by one and punches four characters of it into the deck.
    expect(job).toHaveLength(SOURCE_COLUMNS);
    expect(field(job ?? '', 'ident')).toBe(IDENT);
  });

  it('and the assembler agrees — assemble(...).ident is HDAD1', () => {
    // The other end of the same fact: `pass1` reads the ident off the card's own columns 76-80
    // (`JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80`), so this fails if either the file or the
    // reading moves.
    expect(assemble(readFileSync(SOURCE_FILE, 'utf8')).ident).toBe(IDENT);
  });
});

describe('demos/hello-dad.data.cards has not drifted from the Phase-2 deck (plan §10)', () => {
  it('is byte-identical to lines 2-6 of demos/hello-dad.cards', () => {
    const data = cards(DATA_FILE);
    const hand = cards(HAND_DECK_FILE);
    expect(data).toHaveLength(DATA_CARDS);
    // Card 1 of the hand deck is the hand-punched PROGRAM; cards 2-6 are the report. Phase 3 may
    // not modify `demos/hello-dad.cards` (§3.4), so the copy is what moves and this is what
    // catches it.
    expect(data).toEqual(hand.slice(1, 1 + DATA_CARDS));
  });
});
