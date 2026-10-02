// Tier 2 — the 1402 station's DATA half: what the hopper, the read station, the five pockets and
// the Fig.60 strip are made of (plan §7.1, §11 wave 3 (a)-(e), §12.1 T2, §13 criterion 13).
//
// WHICH MACHINE: the IBM 1402 Card Read-Punch MODEL 2 on a 1410 — 800 cpm reader, 250 cpm punch,
// a 3,000-card file feed and FIVE radial stackers labelled `0 (NP) · 4 · 8/2 · 1 · 0 (NR)`
// (console-and-physical.md §7 [verified] — A22-0526-3 pp.59-61, Figs.58-60) — together with the
// 1414's 80-position read buffer, which is what `session.bufferedCard` names. Not a 1401: the
// Fig.60 p.61 strip has NO LOAD key, and that absence is asserted below as a string over the
// drawn labels (software.md §10.1, §10.10).
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · IT INSTANTIATES NO VIEW. The run is `environment: 'node'` (vite.config.ts:8-11) and plan
//    §2.2 refuses jsdom, so `renderCardFace` / `createHopperView` / `createStackerView` /
//    `createKeysView` would throw on `document` the moment they were called. Every reader module
//    below is imported for its EXPORTED DATA only — captions, labels, the strip, the constants —
//    which those files build at import time and never as a node (§3.3). WHICH caption a station
//    passes is criterion 19's eye check, never a node assertion (§13 criterion 13).
//  · It READS `test/golden/card-face-a.svg.txt` and never writes it. Wave 1's
//    `test/period-cardgeometry.test.ts` regenerates that file through `paper/cardGeometry.ts` and
//    compares it byte for byte; this file pins its identity by digest and length, adding no
//    second generator.
//  · It does not touch `unitrecord/session.ts`, whose body is FROZEN for the whole phase (§3.6).
//    The reads below go through the real `createMachine`, `Channel1` and `Reader1402` in the shape
//    `test/session.test.ts` already uses — copied, because a test may not import another test
//    file. §11 wave 3 (c) — that file passing with only its `:27` import changed — is the standing
//    gate's assertion and is not re-made here.
//
// THREE DEPARTURES FROM THE PLAN'S LETTER, all deliberate and all recorded here rather than
// discovered later.
//  1. §7.1's file-feed caption template `loaded deck, card N` is asserted below as
//     `loaded deck, next card` — an ORCHESTRATOR RULING. `session.hopperCards(reader)` returns a
//     SUFFIX of the loaded deck and the frozen session exposes no ordinal for its first card, so
//     an `N` there would be a suffix index passed off as a deck index. The other four templates
//     are §7.1's, verbatim.
//  2. (b2) reads ONE card, not §11's three. With three read the hopper is EMPTY, and "the empty
//     hopper did not follow the box" is very nearly vacuous; one card leaves a real card in the
//     file feed AND a real card at the read station for the retyped box to fail to move. A
//     stronger case, not a miscount.
//  3. (b2) asserts the freeze TWICE — once against the session, once against `hopperView.ts`'s
//     own source — because the session's half of it is frozen for the phase and the view's is not.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { RX_RELEASE_D_GLYPH } from '../src/core/isa/dmods.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import type { CoreStorage } from '../src/core/storage.js';
import { BCD6, type Addr, type Card, type MachineState } from '../src/core/types.js';
import { HOPPER_SLIVER_LIMIT } from '../src/ui/period/paper/cardGeometry.js';
import { CARD_CAPTIONS, CARD_STOCK_IS_CREAM } from '../src/ui/period/reader/cardFaceView.js';
import {
  PUNCHES_UNDER_PROGRAM_CONTROL,
  THE_1402_ELEVATION_IS_NOT_DRAWN, THE_HOPPER_DRAWS_THE_LOADED_DECK,
} from '../src/ui/period/reader/hopperView.js';
import {
  INERT_KEYS, KEY_LABELS, LIGHT_LABELS, LIT_CONSTANTS, POWER_AND_READY_ARE_DRAWN_LIT, STRIP,
} from '../src/ui/period/reader/keysView.js';
import { POCKET_LABELS, pocketCounts } from '../src/ui/period/reader/stackerView.js';
import { createSession, type Session } from '../src/ui/period/unitrecord/session.js';

const GOLDEN = 'test/golden/card-face-a.svg.txt';
const CARD_FACE_VIEW = 'src/ui/period/reader/cardFaceView.ts';

/** A22-0526-3 pp.59-60, Figs.58-59 [verified] — what the file feed holds. */
const FILE_FEED_CAPACITY = 3_000;

const DECK_TEXT = 'AAA\nBBB\nCCC\n';
const FACES = ['AAA', 'BBB', 'CCC'];

describe('the 1402 station — the golden face and the adapter over it (plan §11 wave 3 (a))', () => {
  it('pins wave 1’s one card face by digest and length, reading it and never cutting it', () => {
    const bytes = readFileSync(GOLDEN);
    expect(createHash('sha256').update(bytes).digest('hex'))
      .toBe('0a4662709bd9f4890a937f0dfbbb0ecceae7dd13e58b055167f20615989b6eb1');
    expect(bytes.length, 'the whole file, header included').toBe(33_450);
  });

  it('keeps cardFaceView.ts an adapter: its geometry comes only from paper/cardGeometry.js', () => {
    // A second geometry source is what would make the one golden stop covering the face.
    // Asserted over the file's CODE, comments stripped: the header's prose may name what the
    // code may not call.
    const src = codeOf(CARD_FACE_VIEW);
    expect(specifiers(src), 'one geometry module').toContain('../paper/cardGeometry.js');
    expect(specifiers(src).filter((s) => /formats\/card/.test(s)), 'no second punch table')
      .toEqual([]);
    expect(src).not.toContain('punchMask');
    expect(src).not.toContain('glyphOf');
    expect(CARD_STOCK_IS_CREAM, '§15, `[unverified]` — one shade, one line').toBe(true);
  });
});

describe('the 1402 station — real reads through the frozen session (plan §11 wave 3 (b))', () => {
  it('follows the hopper down one card per read, front of the deck first', () => {
    const { m, session } = loaded();
    expect(depth(m, session), 'three cards, none read').toEqual([3, FACES, '(none)']);

    // READER START feeds the front card into the 1414 buffer; END OF FILE goes with it, because
    // a deck of fewer than four cards would otherwise report Not Ready on its first feeding read
    // (io.md §6 step 1; software.md §10.7).
    m.readerStart();
    m.readerEndOfFile();
    expect(depth(m, session), 'the front card is at the read station')
      .toEqual([2, ['BBB', 'CCC'], 'AAA']);

    stackTheDeck(m);
    expect(m.step(), 'card 1 into 00300, stacked in 0 (NR)').toBeUndefined();
    expect(depth(m, session)).toEqual([1, ['CCC'], 'BBB']);
    expect(m.step(), 'the release').toBeUndefined();
    expect(m.step(), 'card 2 into 00500, stacked in 1').toBeUndefined();
    expect(depth(m, session)).toEqual([0, [], 'CCC']);
    expect(m.step(), 'the release').toBeUndefined();
    expect(m.step(), 'card 3 into 00700, stacked in 8/2').toBeUndefined();
    expect(depth(m, session), 'and the read buffer empties with the hopper')
      .toEqual([0, [], '(none)']);

    // The cards landed in deck order, which is what makes "the card the 1414 holds" checkable.
    expect([core(m.storage, 300, 3), core(m.storage, 500, 3), core(m.storage, 700, 3)])
      .toEqual(FACES);
  });

  it('sums 8/2 across both feeds and reports five pockets in the published order', () => {
    const { m } = loaded();
    m.readerStart();
    m.readerEndOfFile();
    stackTheDeck(m);
    for (let i = 0; i < 5; i++) expect(m.step(), `instruction ${i + 1}`).toBeUndefined();
    const s: MachineState = m.snapshot();

    // console-and-physical.md §7 [verified], A22-0526-3 pp.60-61. FIVE pockets, not six: 8/2 is
    // ONE physical pocket seen from two feeds, so its count is the sum of what each device
    // stacked — `readerView.ts:29-34`'s rule, carried into `stackerView.ts` unchanged.
    expect(POCKET_LABELS).toEqual(['0 (NP)', '4', '8/2', '1', '0 (NR)']);
    expect(pocketCounts(s), 'the sum rule, against the two device blocks').toEqual([
      s.punch.stackers['0'], s.punch.stackers['4'],
      s.reader.stackers['8-2'] + s.punch.stackers['8-2'],
      s.reader.stackers['1'], s.reader.stackers['0'],
    ]);
    expect(pocketCounts(s), 'one card to each read-feed pocket').toEqual([0, 0, 1, 1, 1]);
    expect([s.punch.stackers['0'], s.punch.stackers['4'], s.punch.stackers['8-2']],
      'this rig\'s five-instruction program punches nothing').toEqual([0, 0, 0]);
  });
});

describe('the 1402 station — the loaded-deck freeze (plan §11 wave 3 (b2))', () => {
  it('draws the deck that WENT IN, not the text the box now holds', () => {
    const { m, session } = loaded();
    m.readerStart();
    m.readerEndOfFile();
    stackTheDeck(m);
    m.step();                                      // card 1 read: hopper 1, buffer BBB

    expect(session.setDeckText('ZZZ\nZZZ\nZZZ\nZZZ\n'), 'a different deck, also clean').toEqual([]);
    expect(session.deck.map(face), 'the box holds the new text')
      .toEqual(['ZZZ', 'ZZZ', 'ZZZ', 'ZZZ']);
    expect(depth(m, session), 'the hopper and the read station do not follow the box')
      .toEqual([1, ['CCC'], 'BBB']);
    expect(THE_HOPPER_DRAWS_THE_LOADED_DECK, '§15 — the accessor is session.hopperCards')
      .toBe(true);

    // Everything above is the SESSION's freeze, and the session is frozen. THIS is the VIEW's:
    // nothing else binds `hopperView.ts` to the accessor, so changing its one call to
    // `session.deck` would leave every assertion above green — which is the one-accessor
    // regression the §15 row exists to forbid, so the source read IS the assertion.
    const h = codeOf('src/ui/period/reader/hopperView.ts');
    expect(h, 'the drawn hopper reads the LOADED deck').toContain('hopperCards(');
    expect(h, 'and never the re-parsed box').not.toMatch(/session\.deck\b/);
  });

  it('captions every face with the deck it belongs to — §7.1’s five templates', () => {
    // ORCHESTRATOR RULING, departing from §7.1's `loaded deck, card N`: the file-feed caption
    // carries NO ordinal. `session.hopperCards(reader)` returns a SUFFIX of the loaded deck and
    // the frozen session exposes no ordinal for its first element, so an `N` there would be the
    // suffix's index passed off as the deck's. The position is named instead.
    expect(CARD_CAPTIONS.loadedDeck).toBe('loaded deck, next card');
    expect(CARD_CAPTIONS.deckBox(7)).toBe('deck box, card 7');
    expect(CARD_CAPTIONS.readStation(7)).toBe('read station, card 7');
    expect(CARD_CAPTIONS.objectDeck(7)).toBe('object deck, card 7');
    expect(CARD_CAPTIONS.executeCard).toBe('execute card — E in column 1');
  });
});

describe('the 1402 station — the Fig.60 strip (plan §11 wave 3 (d), (e))', () => {
  it('has NO LOAD key, which is the 1401 fact this station refuses', () => {
    // software.md §10.1: "The Load key is a 7010-only console toggle"; §10.10 and its
    // open-questions row leave the 1402 LOAD key unanswered for a 1410 in 1401 mode. A22-0526-3
    // Fig.60 p.61 prints five keys and LOAD is not one of them. Asserted over the DRAWN labels.
    expect(KEY_LABELS).not.toContain('LOAD');
    expect(KEY_LABELS.join('|'), 'not as a substring either').not.toMatch(/LOAD/);
    expect(KEY_LABELS).toEqual([
      'PUNCH START', 'PUNCH STOP', 'END OF FILE', 'READER STOP', 'READER START',
    ]);
  });

  it('reproduces Fig.60’s seventeen entries in order, both twice-used legends included', () => {
    // A sequence, never a de-duplicated set: PUNCH STOP is a key AND a light, READER STOP is a
    // light AND a key, so `keysView.ts` keys its records by strip position and never by label.
    expect(STRIP.map((e) => `${e.kind} ${e.label}`)).toEqual([
      'key PUNCH START', 'key PUNCH STOP',
      'light PUNCH READY', 'light CHIPS', 'light PUNCH CHECK', 'light PUNCH STOP',
      'light STACKER', 'light POWER', 'light FUSE', 'light TRANSPORT', 'light VALIDITY',
      'light READER READY', 'light READER CHECK', 'light READER STOP',
      'key END OF FILE', 'key READER STOP', 'key READER START',
    ]);
    expect(STRIP.length, '2 keys + 12 lights + 3 keys').toBe(17);
    expect(LIGHT_LABELS.length).toBe(12);
    expect(new Set(STRIP.map((e) => e.label)).size, 'two legends occur twice').toBe(15);
  });

  it('draws the punch feed as a feed that punches, and names the program that drives it', () => {
    // The two punch keys STAY inert, and only the reason moved: `INERT_KEYS` is derived from the
    // strip, and a key is inert exactly when no `Machine` call is wired to it. `Machine`'s whole
    // unit-record surface is loadDeck / readerStart / readerEndOfFile / endOfJob
    // (machine.ts:130-148) — there is no punch-start call to wire. The punch runs under program
    // control from `P1`, the way the read feed runs after READER START.
    expect(INERT_KEYS).toEqual(['PUNCH START', 'PUNCH STOP', 'READER STOP']);
    expect(PUNCHES_UNDER_PROGRAM_CONTROL.toLowerCase()).toContain('punches');
    expect(PUNCHES_UNDER_PROGRAM_CONTROL).toContain('demos/reentry.asm');
    expect(PUNCHES_UNDER_PROGRAM_CONTROL).toContain('P1 0,PAREA');
    expect(PUNCHES_UNDER_PROGRAM_CONTROL.toLowerCase()).not.toContain('does not punch');
  });

  it('lights POWER and nothing else, as a constant rather than a Lamp', () => {
    // None of Fig.60's twelve lights has a `MachineState` field behind it, so the strip is drawn
    // dark under the not-modelled legend with ONE stated exception: the machine is on.
    expect(LIT_CONSTANTS).toEqual(['POWER']);
    expect(LIGHT_LABELS, 'and POWER is a light of the strip, not a sixth key').toContain('POWER');
    expect(POWER_AND_READY_ARE_DRAWN_LIT, '§15 — the 1415 half is period-console’s').toBe(true);
  });
});

describe('the 1402 station — the file feed drawn as slivers (plan §7.1)', () => {
  it('budgets forty edge slivers against a 3,000-card file feed', () => {
    // A rendering decision with no source behind it: one node per card would rebuild a
    // 3,000-node stack on every frame the machine runs. It lives in `paper/` with a test rather
    // than as a number inside a view, and it is a budget, not an uncertainty — no §15 row.
    expect(HOPPER_SLIVER_LIMIT).toBe(40);
    expect(HOPPER_SLIVER_LIMIT).toBeLessThan(FILE_FEED_CAPACITY);
    expect(THE_1402_ELEVATION_IS_NOT_DRAWN, '§15 — state made legible, not cabinet art')
      .toBe(true);
  });
});

// ── the machine, driven the way test/session.test.ts drives it ────────────────

/** A machine with the three-card deck parsed and put in the 1402's hopper. */
function loaded(): { m: Machine; session: Session } {
  const m = createMachine({ size: 10_000 });
  const session = createSession(m);
  expect(session.setDeckText(DECK_TEXT), 'the deck parses clean').toEqual([]);
  expect(session.putDeckInHopper(), 'and goes in the hopper').toBe(true);
  return { m, session };
}

/**
 * Three loads at 00300 / 00500 / 00700, each selecting a DIFFERENT read-feed pocket — x3 = 0, 1,
 * 2 is 0 (NR), 1, 8/2 (io.md §2 Figure 107, §6 step 2). The `R` between them is the release: a
 * second I/O on channel 1 with no intervening status test stops the system (io.md §5). `$` is the
 * end-of-core class, so the reads need no group-mark-with-word-mark planted in core and set no
 * wrong-length-record, which is why the `R` finds nothing on and does not branch.
 */
function stackTheDeck(m: Machine): void {
  const release = `R00400${RX_RELEASE_D_GLYPH}`;
  program(m.storage, 100, 'L%1000300$', release, 'L%1100500$', release, 'L%1200700$');
  m.addressSet(100);
}

/** What the two views draw between them: hopper depth, the cards left, and the buffered card. */
function depth(m: Machine, session: Session): [number, readonly string[], string] {
  const r = m.snapshot().reader;
  return [r.hopper, session.hopperCards(r).map(face), face(session.bufferedCard(r))];
}

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

/** A file with its comments removed, so a header may name what the code may not call. */
const codeOf = (path: string): string =>
  readFileSync(path, 'utf8').replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')  // `//` FIRST: a line comment writing the glob `src/ui/**` holds `/**`, which the block-comment regex would take as an opener and swallow live code up to the next `*/` (wave 4's fix, one line);

/** Every module specifier the code imports from, in source order. */
const specifiers = (src: string): readonly string[] =>
  [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '');
