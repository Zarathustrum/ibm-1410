// Tier 1 + one PUBLISHED EXTERNAL ORACLE — the IBM 1402 read feed.
//
// Three things are proved here, and only the first is ours:
//  (a) research/io.md §3's Figure 5 worked example (223-2692 printed p.8) driven through the REAL
//      1402 and the real channel, in both modes, with the register column asserted;
//  (b) **IBM's own Bootstrap 1 routine card** — software.md §10.5, transcribed from C28-0351-5 p.8
//      at 400 dpi — punched from that transcription, read by the hand-keyed `AL%1000012$R` boot
//      of §10.2, and landing every character at the address IBM printed. Nothing in this test
//      chooses those addresses; the card and the manual do. It exercises the deck parser, the
//      punch bijection, `decodeD('$')`, the separator-to-word-mark rule and the address
//      arithmetic in one instruction;
//  (c) io.md §6 Figure 62 row by row against `oracle/io-status.json`, wherever the row is
//      reachable — the EOF sequence, the three-cards rule, the No Transfer pair, and the two
//      "(never for select-stacker)" exclusions that are the whole reason `Channel.control` does
//      not call `Device.precheck` (plan §6.1).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { Channel1 } from '../src/core/channel.js';
import { Reader1402 } from '../src/core/devices/reader1402.js';
import { RX_RELEASE_D_GLYPH } from '../src/core/isa/dmods.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { parseDeck } from '../src/formats/card.js';
import { BCD6, CARD_COLUMNS, type Addr, type XControl } from '../src/core/types.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

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

/** The 64-glyph rendering of a core position, for a readable failure message. */
function read(s: CoreStorage, at: Addr, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += glyphOf(s.read(at + i) & BCD6);
  return out;
}

function deckOf(text: string): ReturnType<typeof parseDeck>['deck'] {
  const { deck, errors } = parseDeck(text);
  expect(errors, `deck text "${text.slice(0, 40)}…"`).toEqual([]);
  return deck;
}

/**
 * A reader with a deck in its hopper and both keys pressed. IBM's own procedure is the two of
 * them together — "Place the card deck in the 1402 Card Reader. Press READER START and
 * END-OF-FILE" (software.md §10.7, J28-0249 p.41) — because a deck of fewer than four cards
 * would otherwise report Not Ready on its first feeding read (io.md §6).
 */
function readerWith(text: string, opts: { eof?: boolean } = {}): Reader1402 {
  const reader = new Reader1402();
  reader.loadDeck(deckOf(text));
  reader.readerStart();
  if (opts.eof !== false) reader.endOfFile();
  return reader;
}

function channelWith(reader: Reader1402): Channel1 {
  const ch = new Channel1();
  ch.devices.register(reader);
  return ch;
}

const X = (x3: string): XControl => ({ channel: 1, overlap: false, deviceType: '1', unit: x3 });

// ═══ (a) io.md §3 Figure 5, through the real 1402 ══════════════════════════
//
// 223-2692 printed p.8, "Word Separator Processing", as a card:
//
//   card column   | 1  | 2 | 3  | 4 | 5  | 6  | 7 |
//   card content  | WS | A | WS | B | WS | WS | C |
//   move -> core  | WS | A | WS | B | WS | WS | C |     7 positions
//   load -> core  | A(wm) | B(wm) | WS | C |             4 positions
//
// "Length check: 7 columns − 2 stored word marks − 1 stored word separator = 4 core positions."

const FIGURE_5_CARD = '⌒A⌒B⌒⌒C';
const B = 300;

describe('io.md §3 Figure 5 — the canonical word-separator vector (223-2692 p.8)', () => {
  function figure5Machine(op: 'M' | 'L', groupMarkAt: Addr): Machine {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, `${op}%10${String(B).padStart(5, '0')}R`);
    m.storage.setChar(groupMarkAt, code('⧧'), true);   // the terminating GM-WM
    m.loadDeck(deckOf(`${FIGURE_5_CARD}\n`));
    m.readerStart();
    m.readerEndOfFile();
    m.addressSet(100);
    return m;
  }

  it('move mode stores all seven characters and disturbs no existing word mark', () => {
    const m = figure5Machine('M', B + 7);
    // "Existing word marks in the input field are undisturbed" (223-2692 p.58, Figure 5).
    m.storage.setWm(B + 1, true);
    expect(m.step()).toBeUndefined();

    expect(read(m.storage, B, 7)).toBe(FIGURE_5_CARD);
    expect(m.storage.wm(B + 1), 'the mark that was already there').toBe(true);
    // And SimH's `chan_cmd()` forcing a word mark onto the first move-mode character is the one
    // divergence io.md §3 says not to copy.
    expect(m.storage.wm(B), 'no word mark is ADDED in move mode').toBe(false);
    expect(m.regs.bar, 'BAR = B + LB + 1, LB = 7').toBe(B + 8);
    expect(m.regs.bar, 'which is address(GM-WM) + 1').toBe(B + 7 + 1);
    expect(m.storage.wm(B + 7), 'the GM-WM is regenerated, never overwritten').toBe(true);

    // WLR IS ON, and that is correct, not a bug: the record the 1402 delivers is EIGHTY columns
    // (software.md §10.4, "80 is the buffer size"), the GM-WM at B+7 stopped it after seven, and
    // io.md §5's WLR row is exactly "record read/written not correct length (GMWM misplaced)".
    // "WLR is a status indicator only — it does not stop the program" (io.md §5, p.62).
    expect(m.snapshot().channel1.wrongLengthRecord).toBe(true);
    expect(m.channel1.correctLengthRecord).toBe(false);
  });

  it('load mode consumes the separators into word marks and shortens the record to four', () => {
    const m = figure5Machine('L', B + 4);
    // "In load mode operation, existing word marks in the input field are removed" — this one is
    // in a position the record reaches, so it must be gone afterwards (223-2692 p.58).
    m.storage.setWm(B + 3, true);
    expect(m.step()).toBeUndefined();

    expect(read(m.storage, B, 4)).toBe('AB⌒C');
    expect(
      [0, 1, 2, 3].map((i) => m.storage.wm(B + i)),
      'A(wm) B(wm) WS(no mark — a PAIR collapses) C(no mark)',
    ).toEqual([true, true, false, false]);
    expect(m.regs.bar, 'BAR = B + LB + 1, LB = 4 — the SHORTENED core length').toBe(B + 5);
    expect(m.snapshot().channel1.wrongLengthRecord, 'the same 80-vs-4 mismatch').toBe(true);
  });
});

// ═══ (d) `$` — the bootstrap read form ═════════════════════════════════════

describe('`$` on a card read stores all 80 buffer columns and sets no WLR', () => {
  it('io.md §3 conflict C17, A22-0526-3 pp.9, 86, 92', () => {
    const full = 'ABCDEFGHIJKLMNOPQR'.repeat(5).slice(0, CARD_COLUMNS);
    expect(full).toHaveLength(CARD_COLUMNS);
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, 'L%1000300$');
    m.storage.setChar(B + 10, code('⧧'), true);      // a GM-WM squarely in the way
    m.loadDeck(deckOf(`${full}\n`));
    m.readerStart();
    m.readerEndOfFile();
    m.addressSet(100);
    expect(m.step()).toBeUndefined();

    expect(read(m.storage, B, CARD_COLUMNS), 'the GM-WM did not stop it').toBe(full);
    expect(m.regs.bar, 'BAR = B + 80 + 1').toBe(B + CARD_COLUMNS + 1);
    // "With the GM-WM test suppressed there is no correct-length check left to fail, so set no
    // wrong-length-record" (io.md §3).
    expect(m.snapshot().channel1.wrongLengthRecord).toBe(false);
    expect(m.snapshot().channel1.condition).toBe(false);
  });
});

// ═══ (b) THE EXTERNAL ORACLE — IBM's Bootstrap 1 routine card ══════════════
//
// software.md §10.5, "Bootstrap 1 routine card for the 1410 System (C28-0351-5 p.8)", full
// transcription confirmed at 400 dpi. Legend on the card: `x` = `%` (channel 1), `y` = `R`
// (channel 1), `F` = 1301 disk, `a m tttth2` = the geometric record address.

/**
 * OPEN: `BOOTSTRAP_1_J_ROW_IS_SHORT_ONE_COLUMN` — `[likely]`, and a research TRANSCRIPTION gap
 * rather than a hardware claim.
 *
 * software.md §10.5's row `54-59 | J 00138 | 00059-00065` maps SIX card columns onto SEVEN core
 * positions. Only the seven-column reading closes the card: `table.ts`'s `J` row carries
 * `lengths: [1, 7]` and the semantics line "the blank d-character position must be present", so
 * the branch occupies columns 54-60, the word separator sits at 61, and the disk control field
 * starts at column 62 → **00066**, which is the B-address BOTH `L` instructions on this card
 * carry. Read as six columns the row ends at 00064, one short of the 00065 §10.5 itself prints
 * and one short of 00066.
 *
 * So the oracle asserts 00012-00058 mechanically FROM THE TRANSCRIPTION AS PRINTED, and asserts
 * the `J` and the control field's first character only against this reconstruction. Columns past
 * the control field's start are left unasserted: §10.5 enumerates cols 1-59 and 77-80 only and
 * prints 60- as an open range, so there is no published address to check them against.
 * Alternative, available at any time: assert nothing past 00058, at the cost of the 00066 check.
 * A re-render of C28-0351-5 p.8 settles it. docs/plans/phase-2-unit-record.md §15.
 */
const BOOTSTRAP_1_J_ROW_IS_SHORT_ONE_COLUMN = true;

interface BootstrapRow {
  readonly cols: string;
  readonly punched: string;
  /** The core address §10.5 prints for the row. Absent on a word separator: it is not stored. */
  readonly at?: number;
  /** True where the row is the seven-column reconstruction rather than the printed transcription. */
  readonly reconstructed?: boolean;
}

/**
 * The card, column by column, from §10.5's table. The eight word separators are the columns the
 * transcription marks "(not stored)".
 */
const BOOTSTRAP_1: readonly BootstrapRow[] = [
  { cols: '1-5', punched: '00018', at: 12 },
  { cols: '6', punched: '⧧', at: 17 },
  { cols: '7', punched: '⌒' },
  { cols: '8-17', punched: 'L%F000066R', at: 18 },
  { cols: '18', punched: '⌒' },
  { cols: '19-25', punched: 'R00035⧧', at: 28 },
  { cols: '26', punched: '⌒' },
  { cols: '27-36', punched: 'L%F100066$', at: 35 },
  { cols: '37', punched: '⌒' },
  { cols: '38-44', punched: 'R000352', at: 45 },
  { cols: '45', punched: '⌒' },
  { cols: '46-52', punched: 'R00059⧧', at: 52 },
  { cols: '53', punched: '⌒' },
  // Columns 54-60 under the seven-column reading above; §10.5 prints "54-59 | J 00138".
  { cols: '54-60', punched: 'J00138 ', at: 59, reconstructed: true },
  { cols: '61', punched: '⌒' },
  // §10.5: "60- | WS a m t t t t h 2 WS group mark | 00066- | 8-character disk control field at
  // 00066 (the B-address both reads carry) followed by a group-mark-word-mark". The digits are
  // ours — the field is a 1301 geometric address and no real one is published — and only its
  // FIRST character's address is asserted.
  { cols: '62-69', punched: '00010002', at: 66, reconstructed: true },
  { cols: '70', punched: '⌒' },
  { cols: '71', punched: '⧧' },
  { cols: '72-76', punched: '     ' },
  { cols: '77-80', punched: '1410' },
];

/** One line of deck text: the transcription, concatenated. 80 columns exactly. */
const BOOTSTRAP_1_DECK_TEXT = BOOTSTRAP_1.map((r) => r.punched).join('');

/** software.md §10.2's keyed string, and the two word marks the tables print over it. */
const BOOTSTRAP_KEYSTROKES = 'AL%1000012$R';
const BOOTSTRAP_WORD_MARKS = [...BOOTSTRAP_KEYSTROKES].map((_, i) => i === 1 || i === 11);

describe('software.md §10.5 — IBM\'s Bootstrap 1 card, read by §10.2\'s keyed boot', () => {
  it('is 80 columns of legal card codes', () => {
    expect([...BOOTSTRAP_1_DECK_TEXT]).toHaveLength(CARD_COLUMNS);
    expect(deckOf(`${BOOTSTRAP_1_DECK_TEXT}\n`)).toHaveLength(1);
  });

  /** Hopper → READER START → END OF FILE → DISPLAY 00000 → ALTER → COMPUTER RESET → one step. */
  function bootedMachine(): Machine {
    const m = createMachine({ size: 10_000 });
    m.loadDeck(deckOf(`${BOOTSTRAP_1_DECK_TEXT}\n`));
    m.readerStart();
    m.readerEndOfFile();
    // "Ready the reader, key the 12 characters, press COMPUTER RESET then START" (§10.2). ALTER
    // must follow a DISPLAY of the target location (§10.8, A22-0526-3 p.51).
    m.display(0);
    expect(m.alter(BOOTSTRAP_KEYSTROKES, BOOTSTRAP_WORD_MARKS), 'twelve keyed positions').toBe(12);
    m.computerReset();
    return m;
  }

  it('keys `AL%1000012$R` with word marks on the `L` at 00001 and the `R` at 00011', () => {
    const m = bootedMachine();
    expect(read(m.storage, 0, 12)).toBe(BOOTSTRAP_KEYSTROKES);
    for (let a = 0; a < 12; a++) {
      expect(m.storage.wm(a), `word mark at ${a}`).toBe(a === 1 || a === 11);
    }
    // "The word mark on the `R` at 00011 is what terminates read-out of the 10-character `L`
    // instruction at 00001" (§10.2, A22-0526-3 p.11), and both resets load 00001 into the IAR.
    expect(m.regs.iar, 'COMPUTER RESET loads 00001').toBe(1);
  });

  it('lands every transcribed character at the address IBM printed, 00012-00058', () => {
    const m = bootedMachine();
    expect(m.step(), 'the keyed `L %10 00012 $` — and we never execute past it').toBeUndefined();

    let stored = 0;
    for (const row of BOOTSTRAP_1) {
      if (row.at === undefined || row.at > 58) continue;
      const chars = [...row.punched];
      for (let i = 0; i < chars.length; i++) {
        expect(
          glyphOf(m.storage.read(row.at + i) & BCD6),
          `cols ${row.cols} "${row.punched}" -> ${String(row.at + i).padStart(5, '0')}`,
        ).toBe(chars[i]);
      }
      stored += chars.length;
    }
    // §10.5's own arithmetic: columns 1-53 hold 47 stored characters plus six word separators at
    // columns 7, 18, 26, 37, 45 and 53. 00012 + 47 − 1 = 00058.
    expect(stored, '47 stored characters').toBe(47);
    expect(12 + stored - 1).toBe(58);
  });

  it('sets a word mark on each character a separator preceded, and nowhere else', () => {
    const m = bootedMachine();
    m.step();
    // The rule the tables assume: "each instruction must have a word mark set over the operation
    // code, and must not contain word marks in any other position" (A22-0526-3 p.11, §10.2).
    const marked = new Set([18, 28, 35, 45, 52, 59, 66]);
    for (let a = 12; a <= 66; a++) {
      expect(m.storage.wm(a), `word mark at ${String(a).padStart(5, '0')}`).toBe(marked.has(a));
    }
  });

  it('puts the `J` at 00059-00065 and the disk control field at 00066 — the reconstruction', () => {
    expect(BOOTSTRAP_1_J_ROW_IS_SHORT_ONE_COLUMN).toBe(true);
    const m = bootedMachine();
    m.step();
    expect(read(m.storage, 59, 7), 'the blank d-character position must be present').toBe('J00138 ');
    // The B-address BOTH `L` instructions on this card carry, which is the whole reason the
    // seven-column reading is the one that closes.
    expect(read(m.storage, 18, 10)).toContain('00066');
    expect(read(m.storage, 35, 10)).toContain('00066');
    expect(glyphOf(m.storage.read(66) & BCD6), 'first character of the control field').toBe('0');
    // Columns past the control field's first character carry no published address; unasserted.
  });

  it('leaves the reader empty, the card in pocket NR, and no status indicator on', () => {
    const m = bootedMachine();
    m.step();
    const s = m.snapshot();
    expect(s.reader.hopper).toBe(0);
    expect(s.reader.buffered).toBe(false);
    expect(s.reader.stackers, 'x3 = 0 stacks in NR').toEqual({ '0': 1, '1': 0, '8-2': 0 });
    expect(s.reader.eofLatch, 'the feed that emptied the transport armed it').toBe(true);
    expect(s.channel1.wrongLengthRecord, '`$` makes no correct-length check').toBe(false);
    expect(s.channel1.notReady, 'END OF FILE cleared the three-cards rule').toBe(false);
  });
});

// ═══ (c) io.md §6 Figure 62, against oracle/io-status.json ═════════════════

interface StatusRow {
  figure: number; page: number | string; device: string; operation: string;
  condition: string; whenSet: string;
  never?: boolean; neverForSelectStacker?: boolean; sameAs?: string;
}
const IO_STATUS = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/io-status.json'), 'utf8'),
) as { conditions: readonly string[]; rows: readonly StatusRow[] };

const figure62 = (condition: string): StatusRow => {
  const row = IO_STATUS.rows.find((r) => r.figure === 62 && r.condition === condition);
  if (row === undefined) throw new Error(`oracle/io-status.json has no Figure 62 ${condition} row`);
  return row;
};

describe('oracle/io-status.json — Figures 62 and 63 as a table (A22-0526-3 p.63)', () => {
  it('carries all six conditions for the reader and for the punch', () => {
    for (const figure of [62, 63]) {
      const rows = IO_STATUS.rows.filter((r) => r.figure === figure);
      expect(rows.map((r) => r.condition), `Figure ${figure}`).toEqual([...IO_STATUS.conditions]);
      for (const row of rows) expect(row.page, `Figure ${figure} page`).toBe(63);
    }
  });

  it('carries the two "(never for select-stacker)" exclusions, and only those two', () => {
    // These are the rows plan §6.1 is built on: routing `K` through `Device.precheck` would
    // report Condition and clear the EOF latch, stealing the end-of-file report the next
    // card-read instruction owes the program.
    const excluded = IO_STATUS.rows.filter((r) => r.neverForSelectStacker === true);
    expect(excluded.map((r) => `${r.figure}:${r.condition}`))
      .toEqual(['62:dataCheck', '62:condition']);
    expect(figure62('condition').whenSet).toContain('EOF — last card stacked');
    expect(figure62('noTransfer').whenSet).toContain('two select-stacker-and-feeds');
    expect(figure62('noTransfer').whenSet).toContain('two x3=9 reads');
  });

  it('prints the punch\'s No Transfer as never (Figure 63) — asserted by wave 4', () => {
    const row = IO_STATUS.rows.find((r) => r.figure === 63 && r.condition === 'noTransfer');
    expect(row?.never).toBe(true);
  });
});

describe('Figure 62 Not Ready — the rows this emulator can reach', () => {
  it('a reader nobody started is Not Ready, and transfers nothing', () => {
    const reader = new Reader1402();
    reader.loadDeck(deckOf('ABCDE\n'));
    const ch = channelWith(reader);
    const s = new CoreStorage(10_000);
    expect(ch.io('load', s, X('0'), B, '$', 0), 'LB = 0').toBe(0);
    expect(ch.status.notReady).toBe(true);
    expect(s.bcd(B), 'core untouched').toBe(0);
  });

  it('an empty transport is Not Ready — Figure 62\'s "out of cards (not EOF)"', () => {
    const reader = readerWith('ABCDE\n');
    const ch = channelWith(reader);
    const s = new CoreStorage(10_000);
    ch.io('load', s, X('0'), B, '$', 0);        // the only card
    ch.release();
    ch.io('load', s, X('0'), B, '$', 0);        // the EOF report
    expect(ch.status.condition).toBe(true);
    ch.release();
    ch.io('load', s, X('0'), B, '$', 0);        // now genuinely out of cards
    expect(ch.status.notReady).toBe(true);
  });

  it('three cards remaining without the EOF key is Not Ready — four is not', () => {
    // OPEN: `EOF_KEY_REQUIRED_AT_THREE_CARDS` counts the BUFFERED card, so READER START on a
    // four-card deck leaves buffered + hopper = 4 and the read runs. On the hopper-alone reading
    // it would be 3 and this test would fail — which is what pins the choice (plan §15).
    const s = new CoreStorage(10_000);
    for (const [cards, notReady] of [[3, true], [4, false]] as const) {
      const reader = readerWith('ABCDE\n'.repeat(cards), { eof: false });
      const ch = channelWith(reader);
      ch.io('load', s, X('0'), B, '$', 0);
      expect(ch.status.notReady, `${cards} cards, no EOF key`).toBe(notReady);
    }
  });

  it('the same three cards go through once END OF FILE is pressed', () => {
    // "Press EOF then Start to let the last three through" (io.md §6).
    const reader = readerWith('ABCDE\n'.repeat(3));
    const ch = channelWith(reader);
    const s = new CoreStorage(10_000);
    for (let i = 0; i < 3; i++) {
      ch.io('load', s, X('0'), B, '$', 0);
      expect(ch.status.notReady, `card ${i + 1}`).toBe(false);
      ch.release();
    }
    expect(reader.stackers['0']).toBe(3);
  });

  it('a second PUT DECK IN HOPPER resets the EOF condition and the three-cards rule re-arms', () => {
    // io.md §6 "End-of-file and last card", `[verified]` (A22-0526-3 pp.61, 63): "The Stop key,
    // or PROCESSING THE LAST CARD, resets the EOF condition." A new file in the hopper is on the
    // far side of that — the previous file's last card has been processed — so the END OF FILE
    // the operator pressed for deck 1 must not carry into deck 2. `loadDeck` clears both the key
    // and the latch; without that clear the three-cards Not Ready rule could never re-arm and
    // deck 2's last three cards would run through unasked.
    const reader = readerWith('ABCDE\n'.repeat(3));
    const ch = channelWith(reader);
    const s = new CoreStorage(10_000);
    for (let i = 0; i < 3; i++) {
      ch.io('load', s, X('0'), B, '$', 0);
      ch.release();
    }
    expect(reader.eofLatch, 'the third feed emptied the transport with EOF pressed').toBe(true);

    reader.loadDeck(deckOf('FGHIJ\n'.repeat(3)));
    expect(reader.eofKey, 'the key the operator pressed for deck 1').toBe(false);
    expect(reader.eofLatch, 'and the latch deck 1 armed').toBe(false);
    reader.readerStart();

    ch.io('load', s, X('0'), B, '$', 0);
    expect(ch.status.notReady, 'three cards, no EOF key — the rule is armed again').toBe(true);
    expect(ch.status.condition, 'and deck 1\'s latch does not report on deck 2').toBe(false);
    ch.release();

    reader.endOfFile();
    ch.io('load', s, X('0'), B, '$', 0);
    expect(ch.status.notReady, 'pressed again, deck 2\'s last three go through').toBe(false);
  });

  it('an x3 outside 0 1 2 9 is Not Ready — UNKNOWN_X3_IS_NOT_READY, not a check', () => {
    const ch = channelWith(readerWith('ABCDE\n'));
    const s = new CoreStorage(10_000);
    // Rejected as a READINESS question, not a decode question: `channel.decodeX` instruction-
    // checks an unknown x1/x2 glyph, but a selectable device with an unselectable sub-unit is
    // io.md §9 Figure 99's "no such unit" (plan §15).
    expect(() => ch.io('load', s, X('7'), B, '$', 0)).not.toThrow();
    expect(ch.status.notReady).toBe(true);
  });
});

describe('Figure 62 Condition — the EOF latch (io.md §6, A22-0526-3 pp.61, 63)', () => {
  it('turns on after the last card is transferred, and the reporting read is a NO OP', () => {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100,
      'L%1000300$',                       // the only card
      `R00300${RX_RELEASE_D_GLYPH}`,      // release; nothing is on, so it does not branch
      'L%1000400$');                      // the read that reports EOF
    m.loadDeck(deckOf('ABCDE\n'));
    m.readerStart();
    m.readerEndOfFile();
    m.addressSet(100);

    expect(m.step()).toBeUndefined();
    expect(m.snapshot().reader.eofLatch, '"following the data transfer of the last card"').toBe(true);
    expect(m.step(), 'the release').toBeUndefined();

    expect(m.step(), 'the reporting read').toBeUndefined();
    expect(m.snapshot().channel1.condition).toBe(true);
    expect(m.snapshot().reader.eofLatch, 'latch OFF as Condition goes ON').toBe(false);
    // "The next card-read instruction is a NO OP" — step 6 of the nine, not special-case code.
    expect(m.storage.bcd(400), 'core untouched').toBe(0);
    // Carried forward from PHASE-1-NOTES.md §1 and now reachable: BAR after an I/O that transfers
    // nothing is LB = 0 → B + 1.
    expect(m.regs.bar, 'BAR = B + 1').toBe(401);
  });

  it('a `K` with the latch on reports NO Condition and does not clear it — the §6.1 sequence', () => {
    const reader = readerWith('ABCDE\n');
    const ch = channelWith(reader);
    const s = new CoreStorage(10_000);

    ch.io('load', s, X('0'), B, '$', 0);
    expect(reader.eofLatch, 'the feed emptied the transport').toBe(true);
    ch.release();

    ch.control('K', '0', 0);
    // Figure 62 prints "(never for select-stacker)" on the Condition and Data Check rows, and
    // `Channel.control` reaches this device WITHOUT going through `precheck` — which is the only
    // reason the latch survives.
    expect(ch.status.condition, 'never for select-stacker').toBe(false);
    expect(ch.status.dataCheck, 'never for select-stacker').toBe(false);
    // What it DOES report is Figure 62's own No Transfer row: no intervening x3 = 9 read.
    expect(ch.status.noTransfer).toBe(true);
    expect(reader.eofLatch, 'the latch is untouched').toBe(true);
    ch.release();

    ch.io('load', s, X('0'), 400, '$', 0);
    expect(ch.status.condition, 'the following read is still owed its report').toBe(true);
    expect(reader.eofLatch).toBe(false);
    expect(s.bcd(400), 'and it is a NO OP').toBe(0);
  });

  it('the reader running dry with no EOF key does NOT arm the latch', () => {
    const reader = readerWith('ABCDE\n', { eof: false });
    const ch = channelWith(reader);
    const s = new CoreStorage(10_000);
    ch.io('load', s, X('9'), B, '$', 0);        // x3 = 9 skips the three-cards rule
    ch.release();
    ch.control('K', '0', 0);                   // stack and feed: nothing behind it
    expect(reader.buffer).toBeNull();
    expect(reader.eofLatch, 'Figure 62 calls that "out of cards (not EOF)"').toBe(false);
  });
});

describe('Figure 62 No Transfer — the x3 = 9 / Select Stacker pair (io.md §6 step 3)', () => {
  it('two x3 = 9 reads with no intervening SSF', () => {
    const reader = readerWith('ABCDE\nFGHIJ\n');
    const ch = channelWith(reader);
    const s = new CoreStorage(10_000);

    ch.io('load', s, X('9'), B, '$', 0);
    expect(ch.status.noTransfer, 'the first one transfers').toBe(false);
    expect(read(s, B, 5)).toBe('ABCDE');
    expect(reader.buffer, '"the buffer keeps the image" — no feed, no stacker select')
      .not.toBeNull();
    ch.release();

    ch.io('load', s, X('9'), 400, '$', 0);
    expect(ch.status.noTransfer, '"image already transferred"').toBe(true);
    expect(s.bcd(400), 'and nothing moved').toBe(0);
    expect(reader.stackers, 'nothing was stacked either')
      .toEqual({ '0': 0, '1': 0, '8-2': 0 });
  });

  it('two select-stacker-and-feeds with no intervening x3 = 9 read', () => {
    const reader = readerWith('ABCDE\nFGHIJ\n');
    const ch = channelWith(reader);
    const s = new CoreStorage(10_000);

    ch.io('load', s, X('9'), B, '$', 0);
    ch.release();
    ch.control('K', '1', 0);
    expect(ch.status.noTransfer, 'the first SSF has an image to stack').toBe(false);
    expect(reader.stackers['1'], 'd = 1 selects pocket 1').toBe(1);
    ch.release();

    ch.control('K', '1', 0);
    expect(ch.status.noTransfer, '"two select-stacker-and-feeds with no intervening x3=9 read"')
      .toBe(true);
    expect(reader.stackers['1'], 'and the second one stacked nothing').toBe(1);
  });

  it('an x3 = 9 read after an SSF transfers again — the loader\'s own cycle', () => {
    const reader = readerWith('ABCDE\nFGHIJ\n');
    const ch = channelWith(reader);
    const s = new CoreStorage(10_000);
    ch.io('load', s, X('9'), B, '$', 0);
    ch.release();
    ch.control('K', '2', 0);
    expect(reader.stackers['8-2'], 'd = 2 selects the shared 8/2 pocket').toBe(1);
    ch.release();
    ch.io('load', s, X('9'), 400, '$', 0);
    expect(ch.status.noTransfer).toBe(false);
    expect(read(s, 400, 5), 'the next card').toBe('FGHIJ');
  });

  it('a `K` with an unrecognised d-character is Not Ready, like an unknown x3', () => {
    const reader = readerWith('ABCDE\n');
    const ch = channelWith(reader);
    ch.io('load', new CoreStorage(10_000), X('9'), B, '$', 0);
    ch.release();
    ch.control('K', '9', 0);        // `9` selects no pocket: 0/1/2 only (io.md §6 step 3)
    expect(ch.status.notReady).toBe(true);
    expect(reader.transferred, 'and the image is still owed a stacker').toBe(true);
  });
});
