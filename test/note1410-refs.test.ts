// The line refs in `oracle/note1410/arith.ts` and `move.ts` land where they were cut from.
//
// The fixtures cite `note1410.txt` by line number instead of quoting it (`oracle/note1410/ref.ts`),
// so an off-by-one ref would silently point a case at its neighbour's text. These checks are the
// shape every ref had when it was generated from the quotes it replaced: a case's range opens on
// its own heading line, which starts with its five-digit address; a cycle's range sits inside its
// case's, opens on an `A:` or `B:` line and holds exactly one `B:` line — one B-field position.
import { describe, expect, it } from 'vitest';

import { NOTE1410_ARITH } from '../oracle/note1410/arith.js';
import { NOTE1410_MOVE } from '../oracle/note1410/move.js';
import { noteText, type NoteRef } from '../oracle/note1410/ref.js';
import { ORACLES_ABSENT_MESSAGE, oraclePath } from './oracles.js';

const addr5 = (a: number): string => String(a).padStart(5, '0');
const span = (r: NoteRef): string => `lines ${r[0]}-${r[1]}`;

const NOTE = oraclePath('note1410.txt');

describe.skipIf(!NOTE)(`note1410.txt line refs — ${ORACLES_ABSENT_MESSAGE}`, () => {
  it('every case opens on its own heading and ends on a non-blank line', () => {
    const wrong: string[] = [];
    for (const c of [...NOTE1410_ARITH, ...NOTE1410_MOVE]) {
      const text = noteText(c.lines).split('\n');
      if (!text[0]?.startsWith(addr5(c.addr))) {
        wrong.push(`${addr5(c.addr)} ${span(c.lines)} opens on ${JSON.stringify(text[0])}`);
      }
      if (text.at(-1)?.trim() === '') wrong.push(`${addr5(c.addr)} ${span(c.lines)} ends blank`);
    }
    expect(wrong).toEqual([]);
  });

  it('every cycle is one B-field position inside its case, in order', () => {
    const wrong: string[] = [];
    for (const c of NOTE1410_ARITH) {
      let after = c.lines[0];
      for (const e of c.expected) {
        const where = `${addr5(c.addr)} cycle ${e.cycle} ${span(e.lines)}`;
        const [first, last] = e.lines;
        if (first <= after || last > c.lines[1]) wrong.push(`${where} outside or out of order`);
        after = last;
        const text = noteText(e.lines).split('\n').map((l) => l.trim());
        if (!/^[AB]:/.test(text[0] ?? '')) {
          wrong.push(`${where} opens on ${JSON.stringify(text[0])}`);
        }
        const bLines = text.filter((l) => l.startsWith('B:')).length;
        if (bLines !== 1) wrong.push(`${where} holds ${bLines} B: lines`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('a ref outside the file throws rather than resolving to nothing', () => {
    expect(() => noteText([0, 1])).toThrow(RangeError);
    expect(() => noteText([10_000, 10_000])).toThrow(RangeError);
  });
});
