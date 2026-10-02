// Tier 1 — the IBM 1402 PUNCH feed, and the cheapest oracle in the phase.
//
// Three things are proved here:
//  (a) the OUTPUT half of research/io.md §3's Figure 5 worked example (223-2692 printed p.8),
//      driven through the REAL channel and the REAL punch in both modes: core
//      `A(wm) B(wm) WS C` punches as `A B WS C` in move mode and `WS A WS B WS WS C` in load
//      mode (A22-0526-3 p.41);
//  (b) **the identity loop** — core -> punch -> card -> reader -> core. In LOAD mode it restores
//      the word marks, because the separators the channel synthesised on the way out are the
//      separators it consumes on the way in; in MOVE mode it restores the data image and NOT the
//      marks, which is the same asymmetry stated from the other side;
//  (c) io.md §6 Figure 63 against `oracle/io-status.json`, and the two rows this device can
//      reach: an overlong record (WLR, card not punched) and an x3 that names no pocket.
//
// **No `Machine` here, deliberately.** Registering the punch on `machine.ts` — `MachineState.punch`,
// the snapshot block, the shared 8/2 pocket cell — is wave 4b. Everything below is one `Channel1`
// with a `Punch1402`, a `Reader1402` and a `CoreStorage`, which is all the device seam needs.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { Channel1 } from '../src/core/channel.js';
import { Punch1402, type PunchStacker } from '../src/core/devices/punch1402.js';
import { Reader1402 } from '../src/core/devices/reader1402.js';
import { CoreStorage } from '../src/core/storage.js';
import { CARD_COLUMNS, type Addr, type Card, type IoMode, type XControl } from '../src/core/types.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** io.md §2 Figure 107: `%` channel 1 non-overlap, `4` punch, x3 = the pocket. */
const xPunch = (unit: string): XControl =>
  ({ channel: 1, overlap: false, deviceType: '4', unit });
const X_READ: XControl = { channel: 1, overlap: false, deviceType: '1', unit: '0' };

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

/** The leading `length` columns of a card, as 64-set glyphs. */
function face(card: Card, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += glyphOf(card[i] ?? 0);
  return out;
}

interface Rig {
  s: CoreStorage; ch: Channel1; punch: Punch1402; reader: Reader1402;
}

function rig(): Rig {
  const s = new CoreStorage(10_000);
  const ch = new Channel1();
  const punch = new Punch1402();
  const reader = new Reader1402();
  ch.devices.register(punch);
  ch.devices.register(reader);
  return { s, ch, punch, reader };
}

/** `text` at `at`, word marks at the named offsets, then the terminating GM-WM. */
function field(s: CoreStorage, at: Addr, text: string, marks: readonly number[] = []): void {
  [...text].forEach((g, i) => s.setChar(at + i, code(g), marks.includes(i)));
  s.setChar(at + text.length, code('⧧'), true);
}

/** `M or L %4x bbbbb W` — Punch a Card (io.md §6, A22-0526-3 p.63). */
function punchCard(r: Rig, mode: IoMode, at: Addr, unit = '0'): void {
  r.ch.io(mode, r.s, xPunch(unit), at, 'W', 0);
  r.ch.release();
}

// ═══ (a) io.md §3 Figure 5, output side ════════════════════════════════════
//
// 223-2692 printed p.8 as the manual prints it, read right to left this time:
//
//   core          | A(wm) | B(wm) | WS | C |
//   move -> card  | A | B | WS | C |                   4 columns, no marks transferred
//   load -> card  | WS | A | WS | B | WS | WS | C |     7 columns, the record LENGTHENS

const SOURCE = 300;
const CORE_FIELD = 'AB⌒C';
const CORE_MARKS = [0, 1];

describe('io.md §3 Figure 5, output side — `A(wm) B(wm) WS C` through the real punch', () => {
  it('move mode punches `A B WS C`: word separators pass through, word marks do not', () => {
    const r = rig();
    field(r.s, SOURCE, CORE_FIELD, CORE_MARKS);
    punchCard(r, 'move', SOURCE);

    const card = r.punch.pockets['0'][0];
    expect(card, 'the card is in pocket NP').toBeDefined();
    // "Output side (move mode): core word separators are written unchanged and core word marks
    // are not transferred" (io.md §3, A22-0526-3 p.41).
    expect(face(card as Card, 4)).toBe('AB⌒C');
    expect(r.ch.status.wrongLengthRecord).toBe(false);
  });

  it('load mode punches `WS A WS B WS WS C`: a separator ahead of each mark, the core one doubled', () => {
    const r = rig();
    field(r.s, SOURCE, CORE_FIELD, CORE_MARKS);
    punchCard(r, 'load', SOURCE);

    // "a core word mark becomes a word separator PRECEDING the character, and a core word
    // separator becomes two word separators — the record lengthens" (io.md §3, p.41). The punch
    // itself does none of this: `translateForOutput` did it before `write()` was called.
    expect(face(r.punch.pockets['0'][0] as Card, 7)).toBe('⌒A⌒B⌒⌒C');
  });

  it('columns past the record are blank — BUFFER_CLEARED_BEFORE_TRANSFER', () => {
    const r = rig();
    field(r.s, SOURCE, CORE_FIELD, CORE_MARKS);
    punchCard(r, 'move', SOURCE);

    const card = r.punch.pockets['0'][0] as Card;
    expect(card.length, 'a card is always 80 columns').toBe(CARD_COLUMNS);
    // BCD 0o00 is the blank, and it is a DIFFERENT code from the substitute blank 0o20
    // (charset.md §2). No source says what the buffer holds past a short record; blanks is the
    // fallback, and the alternative — stale contents from the previous card — is unattested.
    expect([...card.slice(4)].every((c) => c === 0o00)).toBe(true);
  });
});

// ═══ (b) the identity loop: core -> punch -> card -> reader -> core ════════

const DEST = 500;

/** Put a punched card back in the hopper and read it into `DEST`. */
function readBack(r: Rig, card: Card, mode: IoMode, length: number): void {
  r.reader.loadDeck([card]);
  r.reader.readerStart();
  // IBM's own procedure presses both keys together (software.md §10.7): a deck of fewer than
  // four cards would otherwise report Not Ready on its first feeding read (io.md §6).
  r.reader.endOfFile();
  // The receiving area is bare core with ONE pre-placed GM-WM, where the record should end.
  r.s.setChar(DEST + length, code('⧧'), true);
  r.ch.io(mode, r.s, X_READ, DEST, 'R', 0);
  r.ch.release();
}

describe('the identity loop — a punched card read back is the field that punched it', () => {
  it('LOAD mode round-trips the cells EXACTLY, word marks included', () => {
    const r = rig();
    field(r.s, SOURCE, CORE_FIELD, CORE_MARKS);
    punchCard(r, 'load', SOURCE);
    readBack(r, r.punch.pockets['0'][0] as Card, 'load', CORE_FIELD.length);

    for (let i = 0; i < CORE_FIELD.length; i++) {
      expect(r.s.read(DEST + i), `position ${i}: cell byte, C bit and word mark`)
        .toBe(r.s.read(SOURCE + i));
    }
    expect([0, 1, 2, 3].map((i) => r.s.wm(DEST + i)), 'A(wm) B(wm) WS C')
      .toEqual([true, true, false, false]);
    // The 1402 delivers EIGHTY columns (software.md §10.4, "80 is the buffer size"); the GM-WM
    // stopped the transfer after four, which is io.md §5's WLR row exactly. Not a defect of the
    // round trip — the same thing happens to Figure 5's own read (test/reader1402.test.ts).
    expect(r.ch.status.wrongLengthRecord).toBe(true);
  });

  it('MOVE mode round-trips the DATA IMAGE, and the marks stay behind — the same rule twice', () => {
    const r = rig();
    field(r.s, SOURCE, CORE_FIELD, CORE_MARKS);
    punchCard(r, 'move', SOURCE);
    readBack(r, r.punch.pockets['0'][0] as Card, 'move', CORE_FIELD.length);

    for (let i = 0; i < CORE_FIELD.length; i++) {
      expect(r.s.bcd(DEST + i), `position ${i}: the six data bits`).toBe(r.s.bcd(SOURCE + i));
    }
    // Move mode transfers no word marks in EITHER direction: the punch never got them
    // (A22-0526-3 p.41) and the read leaves the destination's own marks undisturbed
    // (223-2692 p.58). Both halves of that are visible here, and neither is the device's doing.
    expect([0, 1, 2, 3].map((i) => r.s.wm(DEST + i))).toEqual([false, false, false, false]);
    expect([0, 1].map((i) => r.s.wm(SOURCE + i)), 'the source keeps its own marks')
      .toEqual([true, true]);
  });
});

// ═══ (c) pockets, the two reachable status rows, and Figure 63 ═════════════

describe('x3 selects the pocket — Figure 107, io.md §6 "Mechanics"', () => {
  it('`0`, `4` and `8` stack in NP, 4 and 8/2, and nothing else moves', () => {
    const r = rig();
    field(r.s, SOURCE, 'A');
    for (const unit of ['0', '4', '8']) punchCard(r, 'move', SOURCE, unit);

    expect(r.punch.stackers).toEqual({ '0': 1, '4': 1, '8-2': 1 });
    for (const pocket of ['0', '4', '8-2'] as PunchStacker[]) {
      expect(face(r.punch.pockets[pocket][0] as Card, 1), `pocket ${pocket}`).toBe('A');
    }
    // `stackers` is a VIEW of `pockets`, not a second tally — wave 4b's snapshot reads it.
    expect(r.punch.stackers['8-2']).toBe(r.punch.pockets['8-2'].length);
  });

  it('x3 = `9` is Not Ready — UNKNOWN_X3_IS_NOT_READY', () => {
    const r = rig();
    field(r.s, SOURCE, 'A');
    punchCard(r, 'move', SOURCE, '9');

    // `9` is a legal x3 on the READ feed (transfer, no stack, no feed — io.md §6 step 3) and
    // names nothing on the punch feed, which is what makes it the sharp case: the device is
    // selectable, the sub-unit is not.
    expect(r.ch.status.notReady).toBe(true);
    expect(r.punch.stackers).toEqual({ '0': 0, '4': 0, '8-2': 0 });
  });
});

describe('Figure 63 — the two rows this punch can reach', () => {
  it('more than 80 characters sets WLR and the card is NOT punched', () => {
    const r = rig();
    field(r.s, SOURCE, 'A'.repeat(CARD_COLUMNS + 1));
    punchCard(r, 'move', SOURCE);

    // OPEN: OVERLONG_RECORD_SETS_WLR. Figure 63's WLR cell is "wrong length record; card not
    // punched"; the cause on an OUTPUT operation is not stated, and the 1414's 80-position punch
    // buffer is the only length the two ends can disagree about (io.md §1, §6).
    expect(r.ch.status.wrongLengthRecord).toBe(true);
    expect(r.punch.stackers['0'], 'no card leaves the punch').toBe(0);
    // Figure 63 prints No Transfer as "never" for this device — WLR is not a No Transfer.
    expect(r.ch.status.noTransfer).toBe(false);
  });

  it('80 core characters carrying a word mark are 81 punched columns — so load mode WLRs first', () => {
    const r = rig();
    field(r.s, SOURCE, 'A'.repeat(CARD_COLUMNS), [0]);
    punchCard(r, 'move', SOURCE);
    expect(r.ch.status.wrongLengthRecord, 'move mode drops the mark: exactly 80').toBe(false);
    expect(r.punch.stackers['0']).toBe(1);

    punchCard(r, 'load', SOURCE);
    // The separator the channel puts ahead of the marked character is an 81st column
    // (io.md §3 p.41). The lengthening is the channel's; the limit is the punch's.
    expect(r.ch.status.wrongLengthRecord).toBe(true);
    expect(r.punch.stackers['0'], 'still just the move-mode card').toBe(1);
  });
});

// ═══ oracle/io-status.json — Figure 63 as a table ══════════════════════════

interface StatusRow {
  figure: number; page: number | string; device: string; operation: string;
  condition: string; whenSet: string;
  never?: boolean; neverForSelectStacker?: boolean; sameAs?: string;
}
const IO_STATUS = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/io-status.json'), 'utf8'),
) as { conditions: readonly string[]; rows: readonly StatusRow[] };

const figure63 = (condition: string): StatusRow => {
  const row = IO_STATUS.rows.find((r) => r.figure === 63 && r.condition === condition);
  if (row === undefined) throw new Error(`oracle/io-status.json has no Figure 63 ${condition} row`);
  return row;
};

describe('oracle/io-status.json — Figure 63, the punch (A22-0526-3 p.63)', () => {
  it('carries all six conditions for the punch, on page 63', () => {
    const rows = IO_STATUS.rows.filter((r) => r.figure === 63);
    expect(rows.map((r) => r.condition)).toEqual([...IO_STATUS.conditions]);
    for (const row of rows) {
      expect(row.device).toBe('1402');
      expect(row.operation).toBe('punch');
      expect(row.page).toBe(63);
    }
  });

  it('prints No Transfer as "never" — the one row that is a hard negative', () => {
    expect(figure63('noTransfer').never).toBe(true);
    expect(figure63('noTransfer').whenSet).toBe('never');
  });

  it('states the consequence clauses the implementation follows', () => {
    expect(figure63('wrongLengthRecord').whenSet).toContain('card not punched');
    expect(figure63('dataCheck').whenSet).toContain('card not punched');
    expect(figure63('condition').whenSet).toContain('error card goes to pocket 0');
    // Not Ready is a list of physical states — jams, empty hopper, full stacker, chip basket,
    // open cover — none of which this device models. The one Not Ready it reports is an x3 that
    // names no pocket, which Figure 63 does not list because Figure 107 governs it.
    expect(figure63('notReady').whenSet).toContain('card jam');
  });
});
