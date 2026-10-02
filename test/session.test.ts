// Tier 1 — `src/ui/period/unitrecord/session.ts`, the browser's half of the 1402: the deck a person
// pasted, the Machine those cards went into, and the mapping from `snapshot().reader`'s COUNTS
// back to the cards themselves (plan §5, §10, §11 wave 2).
//
// THIS TEST IS WHY THE FILE HAS THE SHAPE IT HAS. Plan §12's "always green" row promises the
// session logic proves WITHOUT A DOM, and session.ts earns that by construction — no `document`,
// no `window`, nothing from src/ui/internals — so it runs in bare node beside the core tests. If
// an import ever drags the DOM in, this file stops loading and says so.
//
// Two rules are pinned here because nothing else states them:
//   · DECK ORDER — cards leave the hopper FRONT TO BACK, so the first line of the pasted text is
//     the first card the 1402 reads (session.ts's "THE ASSUMPTION, stated once"). Both
//     derivations are arithmetic on that assumption and neither is checkable without it.
//   · THE LOADED-DECK FREEZE — the counts map back to the deck that was PUT IN THE HOPPER, so
//     editing the textarea afterwards must not change what `hopperCards` returns. The reader is
//     holding CARDS, not text, and `deckBox.refresh` re-parses on every keystroke.
//
// The reads are real: a program in core, through `Channel1` and the real `Reader1402`, driven the
// way `test/reader1402.test.ts` drives it. Nothing here pokes device state directly.

import { describe, it, expect } from 'vitest';

import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { RX_RELEASE_D_GLYPH } from '../src/core/isa/dmods.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { createSession, type Session } from '../src/ui/period/unitrecord/session.js';
import { BCD6, type Addr, type Card } from '../src/core/types.js';

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

/** Instructions laid end to end from `at`, each word-marked on its op code. */
function program(s: CoreStorage, at: Addr, ...instructions: readonly string[]): void {
  let p = at;
  for (const text of instructions) {
    [...text].forEach((glyph, i) => s.setChar(p + i, code(glyph), i === 0));
    p += text.length;
  }
  s.setWm(p, true);
}

/** Core as glyphs — enough of the 80 columns a card lands to say WHICH card landed. */
function core(s: CoreStorage, at: Addr, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += glyphOf(s.read(at + i) & BCD6);
  return out;
}

/** A card's first three columns as glyphs. One argument, so it is safe to `.map`. */
const face = (card: Card | undefined): string =>
  card === undefined ? '(none)' : [...card.slice(0, 3)].map(glyphOf).join('');

const DECK_TEXT = 'AAA\nBBB\nCCC\n';
const FACES = ['AAA', 'BBB', 'CCC'];

/** A machine with the three-card deck parsed and put in the 1402's hopper. */
function loaded(): { m: Machine; session: Session } {
  const m = createMachine({ size: 10_000 });
  const session = createSession(m);
  expect(session.setDeckText(DECK_TEXT), 'the deck parses clean').toEqual([]);
  expect(session.putDeckInHopper(), 'and goes in the hopper').toBe(true);
  return { m, session };
}

describe('createSession — snapshot counts mapped back to cards (plan §10, §11 wave 2)', () => {
  it('runs with no DOM at all, which is the promise session.ts is making', () => {
    expect(typeof globalThis.document, 'vitest environment: node').toBe('undefined');
    expect(typeof createSession).toBe('function');
  });

  it('refuses a deck the 1402 cannot be handed, and leaves the machine alone', () => {
    const m = createMachine({ size: 10_000 });
    const session = createSession(m);
    expect(session.setDeckText('AAA\n^^^\n').length, 'a bad column is DATA, not a throw')
      .toBeGreaterThan(0);
    expect(session.putDeckInHopper(), 'errors outstanding').toBe(false);
    expect(session.setDeckText('   \n'), 'clean, but no cards').toEqual([]);
    expect(session.putDeckInHopper(), 'nothing to load').toBe(false);
    expect(m.snapshot().reader.hopper, 'and nothing reached the reader').toBe(0);
  });

  it('tracks the hopper and the read buffer through READER START and two real card reads', () => {
    const { m, session } = loaded();

    expect(m.snapshot().reader.hopper, 'three cards, none read').toBe(3);
    expect(session.hopperCards(m.snapshot().reader).map(face)).toEqual(FACES);
    expect(session.bufferedCard(m.snapshot().reader), 'the 1414 buffer is empty').toBeUndefined();

    // READER START feeds the FRONT card into the buffer (io.md §6 step 1) — the deck-order pin.
    // END OF FILE goes with it: IBM's own procedure presses both, because a deck of fewer than
    // four cards would otherwise report Not Ready on its first feeding read (software.md §10.7).
    m.readerStart();
    m.readerEndOfFile();
    expect(session.hopperCards(m.snapshot().reader).map(face)).toEqual(['BBB', 'CCC']);
    expect(face(session.bufferedCard(m.snapshot().reader)), 'the FIRST line of the text')
      .toBe('AAA');

    // Two card reads with the `R` release between them — a second I/O on channel 1 with no
    // intervening status test stops the system (io.md §5). `$` is the end-of-core class, so the
    // reads need no group-mark-with-word-mark planted in core and set no wrong-length-record,
    // which is why the `R` finds nothing on and does not branch.
    program(m.storage, 100,
      'L%1000300$',                       // card 1 -> 00300
      `R00400${RX_RELEASE_D_GLYPH}`,      // release the interlock
      'L%1000500$');                      // card 2 -> 00500
    m.addressSet(100);

    expect(m.step(), 'the first read').toBeUndefined();
    expect(core(m.storage, 300, 3), 'the front card is the one that landed').toBe('AAA');
    expect(session.hopperCards(m.snapshot().reader).map(face)).toEqual(['CCC']);
    expect(face(session.bufferedCard(m.snapshot().reader)), 'the next card fed up').toBe('BBB');

    expect(m.step(), 'the release').toBeUndefined();
    expect(m.step(), 'the second read').toBeUndefined();
    expect(core(m.storage, 500, 3), 'and the second card, in deck order').toBe('BBB');
    expect(session.hopperCards(m.snapshot().reader), 'the hopper is empty').toEqual([]);
    expect(face(session.bufferedCard(m.snapshot().reader)), 'the last card is buffered')
      .toBe('CCC');
  });

  it('freezes the loaded deck: retyping the box changes nothing the reader is holding', () => {
    const { m, session } = loaded();
    m.readerStart();

    expect(session.setDeckText('ZZZ\nZZZ\n'), 'a different deck, also clean').toEqual([]);
    expect(session.deck.map(face), 'the box holds the new text').toEqual(['ZZZ', 'ZZZ']);
    expect(m.snapshot().reader.hopper, 'and the machine was not touched by the typing').toBe(2);
    expect(session.hopperCards(m.snapshot().reader).map(face), 'still the deck that went in')
      .toEqual(['BBB', 'CCC']);
    expect(face(session.bufferedCard(m.snapshot().reader))).toBe('AAA');
  });
});
