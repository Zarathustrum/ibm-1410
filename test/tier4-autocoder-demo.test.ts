// Tier 4 (smoke) — §1's STORYBOARD, HEADLESS, and like `tier4-demo-deck.test.ts` THIS ONE GATES.
//
// docs/plans/phase-3-autocoder.md §1 ends: "Same page, same 348 bytes — but this time the deck
// came out of an assembler. That last sentence is the whole phase. It is also
// `test/tier4-autocoder-demo.test.ts`." Every assertion below is one of §13's criteria, and the
// two that are not here are named: 11b is the browser check a person performs at a screen, and
// 12's grep is the orchestrator's.
//
// IT DRIVES THE SAME CORE FAÇADE THE BROWSER'S CONTROLS DRIVE — the PRE-SPLIT bootstrap
// keystrokes from `src/formats/loader.ts`, never the UI's `^` string — and it reaches PUNCH INTO
// HOPPER through `src/ui/period/autocoder/session.ts`, which is DOM-free for exactly this reason
// (plan §3.5, §13 criterion 11a). Only the two lines of DOM plumbing are left to 11b.
//
// NOTHING HERE IS CAPTURED FROM A RUN. Every address, count, instruction string and warning is
// §10's published `Assembled` ladder or §13's own text; the golden page is Phase 2's and this
// phase did not write it. If the assembler and a number below ever disagree, the number is a
// finding for `BUILD-LOG-3.md`, not a value to update.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { applyToStorage } from '../src/asm/emit.js';
import { assemble } from '../src/asm/assemble.js';
import type { AssemblyResult } from '../src/asm/types.js';
import { glyphOf } from '../src/core/bcd.js';
import { renderGreenBar } from '../src/core/devices/printer1403.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { GROUP_MARK_BCD } from '../src/core/move.js';
import { CoreStorage } from '../src/core/storage.js';
import { BCD6, WM, type Addr, type Deck } from '../src/core/types.js';
import { parseDeck } from '../src/formats/card.js';
import {
  BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN, LOADER_BODY_CARD, LOADER_BOOTSTRAP_CARD, loaderDeck,
} from '../src/formats/loader.js';
import { decodeObjectRecord, encodeObjectRecord } from '../src/formats/objectdeck.js';
import { createAutocoderSession } from '../src/ui/period/autocoder/session.js';

const SOURCE = readFileSync('demos/hello-dad.asm', 'utf8');
const DATA = readFileSync('demos/hello-dad.data.cards', 'utf8');
const GOLDEN_PAGE = readFileSync('test/golden/hello-dad.page.txt', 'utf8');

/** The 1403 `machine.ts` builds: Model 2, chain A, the 66-line DEFAULT_CARRIAGE_TAPE. */
const CHAIN = 'A' as const;
const FORM_LINES = 66;

/** §13 criterion 2's text, asserted rather than counted — a second warning must fail the gate. */
const THE_ONE_WARNING =
  'the last record\'s GM-WM lands at 00564, inside LINE — a read with d = `R` will transfer '
  + 'nothing; use `$`';

/** §1 step 6: bootstrap, loader body, two condensed cards, the execute card, five data cards. */
const HOPPER_CARDS = 10;

/** §3's listing kinds: one per source card, and the demo has nineteen of them (§13 criterion 3). */
const SOURCE_KINDS: ReadonlySet<string> = new Set(['comment', 'imperative', 'declarative', 'control']);
const SOURCE_CARDS = 19;

const result = assemble(SOURCE);

/** One listing line by the PGLIN a person typed — the handle §1 step 5's error block prints. */
const at = (pglin: string) => result.listing.find((line) => line.pglin === pglin);

/**
 * The whole operator sequence, in the order a person performs it (§1 steps 6-8), stepping one
 * instruction at a time. `budget` is generous because this run loads a deck as well as executing
 * it — the hand-deck tier-4 only executes.
 */
function operate(deck: Deck, budget: number): { m: Machine; stop: string | undefined } {
  const m = createMachine({ size: 10_000 });
  m.loadDeck(deck);
  // READER START then END OF FILE — IBM's own procedure: with fewer than four cards behind the
  // last one the machine would otherwise stop Not Ready (software.md §10.7, io.md §6).
  m.readerStart();
  m.readerEndOfFile();
  // key the bootstrap: DISPLAY at 00000, MODE = ALTER, twelve characters over a cleared line.
  m.display(BOOTSTRAP_ORIGIN);
  m.setMode('alter');
  expect(m.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks)).toBe(12);
  m.computerReset();
  m.setMode('run');

  let stop: string | undefined;
  for (let i = 0; i < budget; i++) {
    stop = m.step();
    if (stop !== undefined) break;
  }
  return { m, stop };
}

/** Every position in the window holding a character or a word mark, as `00500 ^A` rows. */
function occupied(read: (a: Addr) => number, marked: (a: Addr) => boolean, from: Addr, to: Addr): string[] {
  const rows: string[] = [];
  for (let a = from; a <= to; a++) {
    const cell = read(a);
    if ((cell & BCD6) === 0 && !marked(a)) continue;
    rows.push(`${String(a).padStart(5, '0')} ${marked(a) ? '^' : ' '}${glyphOf(cell & BCD6)}`);
  }
  return rows;
}

describe('Tier 4 GATE — §1 step 3: press ASSEMBLE and nothing throws (plan §13 criteria 2, 3)', () => {
  it('assembling the demo throws nothing at all', () => {
    // `assemble()` never throws on source content; the only escape is `AssemblerBug`, and a clean
    // program must not reach one (§4, §6.3).
    expect(() => assemble(SOURCE)).not.toThrow();
  });

  it('ok, ZERO flagged lines, and EXACTLY ONE warning — with its text', () => {
    expect(result.ok).toBe(true);
    expect(result.flagged).toEqual([]);
    // Not zero. §8.3's GM-WM tail is the DESIGNED outcome: the last record loads 12 cells at
    // 00552, so the loader plants a mark at 00564, the first position of LINE's DS extent. A demo
    // that produced no warning here would mean §8.3's second case had been dropped, and a second
    // warning would mean something else fired — so the whole array is asserted.
    expect(result.warnings).toEqual([THE_ONE_WARNING]);
  });

  it('the listing carries nineteen source-card lines, one per card', () => {
    // NOT "19 lines total": §9 adds a heading line per page and a trailer, so a correct listing is
    // longer than nineteen and asserting the total would fail on it (§13 criterion 3).
    const cards = result.listing.filter((line) => SOURCE_KINDS.has(line.kind));
    expect(cards).toHaveLength(SOURCE_CARDS);
    expect(result.listing.length).toBeGreaterThan(SOURCE_CARDS);
    expect(cards.map((line) => line.pglin))
      .toEqual(Array.from({ length: SOURCE_CARDS }, (_, i) => `01${String((i + 1) * 10).padStart(3, '0')}`));
  });
});

describe('Tier 4 GATE — §1 step 4: reading the listing (plan §13 criteria 3, 4)', () => {
  it('LOOP resolves HIGH-order at 00500 and EOJ at 00548 — instructions', () => {
    expect(at('01080')).toMatchObject({ label: 'LOOP', addrs: 500 });
    expect(at('01140')).toMatchObject({ label: 'EOJ', addrs: 548 });
  });

  it('ID DCW @HELLO1@ — CT 6, ADDRS 00563 LOW-order, and the word mark it sets is at 00558', () => {
    expect(at('01170')).toMatchObject({ label: 'ID', ct: 6, addrs: 563 });
    // §10 trap 1: a one-character halt's read-out scans to the next word mark, so `.` at 00557
    // needs one at 00558 — which is the DCW's HIGH-order position, while its LABEL resolves
    // low-order to 00563. The two addresses are different on purpose and both are asserted.
    const constant = result.items.find((item) => item.at === 558);
    expect(constant?.cells).toHaveLength(6);
    expect((constant?.cells[0] ?? 0) & WM, 'the word mark at 00558').toBe(WM);
    expect([...(constant?.cells ?? [])].slice(1).filter((cell) => (cell & WM) !== 0)).toEqual([]);
  });

  it('` LINE DS 80` — CT 80, ADDRS 00564 because it is indented to column 7', () => {
    expect(at('01180')).toMatchObject({ label: 'LINE', ct: 80, addrs: 564 });
  });

  it('THE COUNTERFACTUAL: un-indent that label and it reads 00643 instead', () => {
    // §10 trap 2, and it is the whole reason the card is indented: a DS label resolves LOW-order
    // by default, so un-indented `LINE` is the last position of its own 80-position buffer and
    // every read would land past the end of it.
    const unindented = SOURCE.replace('01180 LINE     DS', '01180LINE      DS');
    expect(unindented, 'the counterfactual actually changed the card').not.toBe(SOURCE);
    const other = assemble(unindented);
    expect(other.listing.find((line) => line.pglin === '01180')?.addrs).toBe(643);
  });

  it('the three published instruction strings assemble exactly (plan §13 criterion 4)', () => {
    expect(at('01100')).toMatchObject({ addrs: 517, instruction: 'R 00524 ⧧' });
    expect(at('01090')).toMatchObject({ addrs: 510, instruction: 'R 00548 8' });
    expect(at('01080')).toMatchObject({ addrs: 500, instruction: 'L %10 00564 $' });
  });
});

describe('Tier 4 GATE — the object deck (plan §13 criterion 5)', () => {
  it('two records, 52 cells and 12, entry 00500', () => {
    expect(result.deck.records.map((record) => [record.loadAddress, record.payload.length]))
      .toEqual([[500, 52], [552, 12]]);
    expect(result.deck.entry).toBe(500);
  });

  it('every record survives decodeObjectRecord(encodeObjectRecord(r))', () => {
    // The round trip runs through Phase 2's own encoder and decoder, neither written by this
    // phase — which is what makes it a check on the packer rather than a restatement of it.
    for (const record of result.deck.records) {
      const back = decodeObjectRecord(encodeObjectRecord(record));
      expect(back.loadAddress).toBe(record.loadAddress);
      expect(back.payload).toEqual(record.payload);
      expect(back.sequence).toBe(record.sequence);
    }
  });

  it('the JOB ident is punched into columns 73-80 as 001HDAD1 and 002HDAD1', () => {
    // The deck-level form of the assertion `test/asm-listing.test.ts` makes one level down, and
    // the other half of wave 6's `withIdent` migration out of `tools/asm.ts` (§11's wave-6 row).
    expect(result.deck.records.map((record) => `${record.sequence}${record.ident ?? ''}`))
      .toEqual(['001HDAD1', '002HDAD1']);
  });
});

describe('Tier 4 GATE — §1 steps 6-9: the hopper, the load, the run, the page', () => {
  const hopper: Deck = [...loaderDeck(result.deck), ...parseDeck(DATA).deck];

  it('TEN cards go into the hopper', () => {
    expect(hopper).toHaveLength(HOPPER_CARDS);
  });

  const { m, stop } = operate(hopper, 20_000);
  const state = m.snapshot();

  it('the machine halts, the hopper empties, and nothing error-stopped', () => {
    expect(stop).toBe('halt');
    expect(state.reader.hopper).toBe(0);
    expect(state.console.filter((line) => line.id === 'E')).toEqual([]);
  });

  it('the green-bar page equals test/golden/hello-dad.page.txt BYTE FOR BYTE', () => {
    // §1's last sentence, and the whole phase: the same page and the same 348 bytes as the
    // hand-punched deck — but this time the deck came out of an assembler. The golden is Phase 2's
    // and is on the do-not-touch list, so nothing in Phase 3 could have bent it to fit.
    m.endOfJob();
    expect(renderGreenBar(state.printer.paper, { chain: CHAIN, formLines: FORM_LINES }))
      .toBe(GOLDEN_PAGE);
  });
});

describe('Tier 4 GATE — the load equals the intent (plan §13 criterion 7)', () => {
  // THE EXECUTE CARD IS DROPPED FOR THIS ONE CHECK, and the reason is trap 3 itself: the run
  // above overwrites 00564 with the first character of the first data card read, because that is
  // exactly what the `$` on `R1W 0,LINE,$` is for. So the comparison is made after the LOAD, on
  // a deck with no `entry` — the loader loads every condensed card, the 1402 reports Condition on
  // the read after the last one, and the `R 00349 9` at 00292 takes the loader to its own halt.
  // Nothing of ours executes, which is the only state in which "the extra bytes are the surviving
  // GM-WMs" can be true. `test/tier3-asm-load-equals-memory.test.ts` runs the same oracle.
  const { m, stop } = operate(loaderDeck({ records: result.deck.records }), 5_000);

  const intent = new CoreStorage(10_000);
  applyToStorage(result.items, intent);

  const FROM = 500;
  const TO = 564;
  /** §11.1's rule, written here rather than imported: the mark at `loadAddress + count` of every
   *  record NO LATER RECORD COVERS. On the demo that is ONE — record 1's at 00552 is inside
   *  record 2's payload and is gone. */
  const SURVIVING: readonly Addr[] = [564];

  it('the loader reaches its own halt with no execute card', () => {
    expect(stop).toBe('halt');
  });

  it('core 00500-00564 is the assembler\'s image plus exactly the surviving GM-WM at 00564', () => {
    const marks = new Set(SURVIVING);
    const want = [
      ...occupied((a) => intent.read(a), (a) => intent.wm(a), FROM, TO)
        .filter((line) => !marks.has(Number(line.slice(0, 5)))),
      ...SURVIVING.map((a) => `${String(a).padStart(5, '0')} ^${glyphOf(GROUP_MARK_BCD)}`),
    ].sort();
    expect(occupied((a) => m.storage.read(a), (a) => m.storage.wm(a), FROM, TO).sort())
      .toEqual(want);
  });

  it('record 1\'s mark at 00552 did NOT survive — record 2\'s payload covers it', () => {
    expect(m.storage.read(552) & BCD6, 'the first character of record 2').not.toBe(GROUP_MARK_BCD);
    expect(intent.read(552) & BCD6).toBe(m.storage.read(552) & BCD6);
  });
});

describe('Tier 4 GATE — §1 step 5: break it on purpose (plan §13 criteria 8, 9)', () => {
  it('EOJ -> EOG: ONE flagged line, FLAG U, and the message names EOG', () => {
    const broken = assemble(SOURCE.replace('BEF1 EOJ', 'BEF1 EOG'));
    expect(broken.ok).toBe(false);
    expect(broken.flagged).toHaveLength(1);
    const line = broken.flagged[0];
    expect(line?.flag).toBe('U');
    // The card a person has to find: page 01, line 090, as punched in columns 1-5. `listingView`
    // prints this as `page 01 line 090, column 21: EOG is not defined` (§1 step 5).
    expect(line?.pglin).toBe('01090');
    expect(line?.why).toContain('EOG');
    expect(line?.why).toContain('not defined');
    // The deck STILL exists and is still wrong — the view refuses to hopper it, and that refusal
    // is `ok`, not a missing deck (§4).
    expect(broken.deck.records.length).toBeGreaterThan(0);
  });

  it('a deck carrying all four defects returns U / M / O / F and throws NOTHING', () => {
    const source = [
      '01010AUTOCODER RUN',
      '01020          ORG  00500',
      '01030DUP       DCW  @A@',
      '01040DUP       DCW  @B@',          // M — defined twice, the first value stands
      '01050          B    NOWHERE',      // U — never defined
      '01060          ZZZZZ00500',        // O — not an operation code
      '01070          MLC  @AB,00600',    // F — the alphameric literal is never closed
      '01080          END  00500',
    ].join('\n');
    let four: AssemblyResult | undefined;
    expect(() => { four = assemble(source); }).not.toThrow();
    if (four === undefined) throw new Error('assemble() returned nothing');
    expect(four.ok).toBe(false);
    expect(four.flagged).toHaveLength(4);
    // ONE letter per line, in source order — `ONE_FLAG_PER_LISTING_LINE`.
    expect(four.flagged.map((line) => line.flag)).toEqual(['M', 'U', 'O', 'F']);
    // The listing still RENDERS: a flagged assembly is data, not an exception (§6.3).
    expect(four.listing.filter((line) => SOURCE_KINDS.has(line.kind)).length).toBeGreaterThan(0);
  });
});

describe('Tier 4 GATE — §13 criterion 11a: PUNCH INTO HOPPER, without a DOM', () => {
  // Everything the button does except the two lines of DOM plumbing 11b covers, driven through
  // `src/ui/period/autocoder/session.ts` in node — which is the whole point of that file being DOM-free
  // (plan §3.5).
  const session = createAutocoderSession();
  session.setSource(SOURCE);
  session.setDataText(DATA);
  session.assemble();

  const parsed = parseDeck(session.hopperText());

  it('the hopper text parses to TEN cards with zero DeckErrors', () => {
    expect(parsed.errors).toEqual([]);
    expect(parsed.deck).toHaveLength(HOPPER_CARDS);
  });

  it('the first two cards are the loader\'s own, byte for byte', () => {
    expect(parsed.deck[0]).toEqual(LOADER_BOOTSTRAP_CARD);
    expect(parsed.deck[1]).toEqual(LOADER_BODY_CARD);
  });

  it('and that deck runs: the same page comes off the green bar', () => {
    // The hand-off is asserted end to end rather than by shape — the text a person would see in
    // the deck box is put back through `parseDeck` and into the machine, and it prints §1 step 9's
    // five lines.
    const { m, stop } = operate(parsed.deck, 20_000);
    expect(stop).toBe('halt');
    expect(renderGreenBar(m.snapshot().printer.paper, { chain: CHAIN, formLines: FORM_LINES }))
      .toBe(GOLDEN_PAGE);
  });
});
