// Tier 3 — THE CONDENSED-CARD LOADER, on the real machine.
//
// The oracle of plan §11 wave 5: "hopper = [bootstrap card, three condensed cards, execute card];
// key the twelve characters; COMPUTER RESET; run; core equals the records cell for cell including
// word marks, and IAR reached the entry point."
//
// ONE DEVIATION FROM THAT SENTENCE, and it is geometry rather than judgement: the loader deck is
// TWO cards, not one. IBM's hand-keyed bootstrap reads its card into 00012 — `00012` is a fixed
// literal in C28-0351-5 p.8 Table II, and wave 3's `BOOTSTRAP_CHANNEL_1` carries it — while the
// loader's re-entry point is 00281 (C28-0309-1 pp.19-20). One card cannot land in two places, so
// a card that reads the loader body to 00281 is not a convenience, it is the only way in; that is
// exactly the shape of IBM's own Bootstrap 1 card, which reads a program to 00138 and branches
// there (`software.md` §10.5). `software.md` §9's sizes say the same thing louder — IBM's
// Autocoder loader is FIVE cards and the standalone distribution is NINE — so a one-card loader
// was never a physical possibility, and §11's "bootstrap card" is the loader's bootstrap, which is
// exactly what card 1 here is. Everything else in the oracle is asserted verbatim.
//
// It is built the way §14 R1 asks for: the format's round trip is green first
// (`test/objectdeck.test.ts`), then the machine is stopped at each stage of the load and asked what
// it holds — the body card landed, the header landed in the index registers, the GM-WM was planted,
// the record moved — before the full run is asserted at all.

import { describe, it, expect } from 'vitest';

import { BLANK, bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { WORD_SEPARATOR } from '../src/core/channel.js';
import { GROUP_MARK_BCD } from '../src/core/move.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { BCD6, CARD_COLUMNS, WM, type Addr, type Deck } from '../src/core/types.js';
import { encodeObjectRecord, type ObjectDeck, type ObjectRecord } from '../src/formats/objectdeck.js';
import {
  BOOTSTRAP_KEYSTROKES, BOOTSTRAP_ORIGIN,
  CONDENSED_LOADER_IS_A_RECONSTRUCTION, CONDENSED_LOADER_PROGRAM, EXECUTE_CARD_IS_E_IN_COLUMN_1,
  LOADER_ADDRESS_INDEX, LOADER_BOOTSTRAP_CARD,
  LOADER_BOOTSTRAP_HEADER, LOADER_BOOTSTRAP_PROGRAM, LOADER_BODY_CARD, LOADER_CEILING,
  LOADER_COUNT_INDEX, LOADER_LOOPS_BACK_PAST_THE_RE_ENTRY_SLOT, LOADER_PAYLOAD, LOADER_RE_ENTRY,
  LOADER_WORK,
  executeCard, loaderDeck,
} from '../src/formats/loader.js';

const code = (glyph: string): number => {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`"${glyph}" is not one of the 64`);
  return c;
};

/** Cells from a glyph string; `^` before a glyph marks it. The deck itself has no such notation. */
function cells(text: string): Uint8Array {
  const out: number[] = [];
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '^') { i += 1; out.push(WM | code(chars[i] ?? '')); } else { out.push(code(chars[i] ?? '')); }
  }
  return Uint8Array.from(out);
}

const glyphAt = (m: Machine, a: Addr): string => glyphOf(m.storage.read(a) & BCD6);
const textAt = (m: Machine, from: Addr, to: Addr): string => {
  let s = '';
  for (let a = from; a <= to; a++) s += glyphAt(m, a);
  return s;
};

// ─── The object program the loader is asked to load ─────────────────────────────────────────
//
// Three records that load CONTIGUOUSLY, which is what an assembler emits and what makes the
// trailing group-mark-with-word-mark of one card the first character of the next. Between them
// they carry every shape the format has: word marks, a stored word separator (a doubled pair on
// the card), a plain group mark, a count of eleven, of nine and of one, and the sequence/ident
// fields in columns 73-80 that the Load Program is documented to ignore.

const ENTRY: Addr = 520;

const RECORDS: readonly ObjectRecord[] = [
  // 00500-00510. `J 00520 ` is a real instruction and the `^A` is what ends its read-out.
  { loadAddress: 500, payload: cells('^J00520 ^ABC⌒'), sequence: '001', ident: 'REENT' },
  // 00511-00519. Nine characters of data, marked at the high order.
  { loadAddress: 511, payload: cells('^123456789'), sequence: '002', ident: 'REENT' },
  // 00520. One character: the halt the execute card branches to.
  { loadAddress: ENTRY, payload: cells('^.'), sequence: '003', ident: 'REENT' },
];

const DECK: ObjectDeck = { records: RECORDS, entry: ENTRY };

/** Where each record ends, and therefore where its trailing GM-WM lands. */
const endOf = (r: ObjectRecord): Addr => r.loadAddress + r.payload.length;

function hopper(): Deck {
  const cards = loaderDeck(DECK);
  expect(cards, 'bootstrap + loader body + three condensed + execute').toHaveLength(6);
  return cards;
}

interface Step { readonly at: Addr; readonly next: Addr }

/**
 * The whole operator sequence, exactly as `test/tier4-demo-deck.test.ts` performs it — the
 * PRE-SPLIT keystrokes through the core façade, never the UI's `^` string (plan §8.1) — stopped
 * after `budget` instructions so a stage of the load can be inspected before the next one runs.
 */
function run(budget: number): { m: Machine; trace: Step[]; stop: string | undefined } {
  const m = createMachine({ size: 10_000 });
  m.loadDeck(hopper());
  m.readerStart();
  m.readerEndOfFile();

  m.display(BOOTSTRAP_ORIGIN);
  m.setMode('alter');
  expect(m.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks)).toBe(12);

  m.computerReset();
  m.setMode('run');

  const trace: Step[] = [];
  let stop: string | undefined;
  for (let i = 0; i < budget; i++) {
    const at = m.regs.iar;
    const reason = m.step();
    trace.push({ at, next: m.regs.iar });
    if (reason !== undefined) { stop = reason; break; }
  }
  return { m, trace, stop };
}

/** Run until the instruction at `addr` is ABOUT to execute, then stop. */
function runUntil(addr: Addr, limit = 400): { m: Machine; trace: Step[] } {
  const m = createMachine({ size: 10_000 });
  m.loadDeck(hopper());
  m.readerStart();
  m.readerEndOfFile();
  m.display(BOOTSTRAP_ORIGIN);
  m.setMode('alter');
  m.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks);
  m.computerReset();
  m.setMode('run');

  const trace: Step[] = [];
  for (let i = 0; i < limit; i++) {
    if (m.regs.iar === addr) return { m, trace };
    const at = m.regs.iar;
    const reason = m.step();
    trace.push({ at, next: m.regs.iar });
    if (reason !== undefined) break;
  }
  throw new Error(`never reached ${addr} in ${limit} instructions`);
}

// ═══ Stage 0 — the two cards are what the two listings say, before any machine runs ═════════

describe('the loader deck is DERIVED from the listing, and the listing is contiguous', () => {
  it('card 2 is exactly eighty columns: ten word marks and seventy characters', () => {
    const marks = CONDENSED_LOADER_PROGRAM.length;
    const characters = CONDENSED_LOADER_PROGRAM.reduce((n, f) => n + [...f.text].length, 0);
    expect(marks).toBe(10);
    expect(characters).toBe(70);
    expect(marks + characters).toBe(CARD_COLUMNS);
    expect(LOADER_BODY_CARD).toHaveLength(CARD_COLUMNS);
    // Every column is punched — there is no room for a blank on this card.
    expect([...LOADER_BODY_CARD].filter((c) => c === BLANK)).toHaveLength(1);   // the `J`'s blank d
  });

  it('every field follows the one before it, in both listings', () => {
    for (const program of [LOADER_BOOTSTRAP_PROGRAM, CONDENSED_LOADER_PROGRAM]) {
      for (let i = 1; i < program.length; i++) {
        const prev = program[i - 1]!;
        expect(program[i]!.at, `${prev.text} is ${[...prev.text].length} characters at ${prev.at}`)
          .toBe(prev.at + [...prev.text].length);
      }
    }
  });

  it('the whole loader — code, constants and work area — lives at or below 00499', () => {
    // C20-1602-8: the standalone deck's Clear Storage card "clears all storage above location
    // 00499" (software.md §9), so this is the loader's ceiling and not a preference.
    const last = CONDENSED_LOADER_PROGRAM.at(-1)!;
    expect(last.at + [...last.text].length - 1).toBeLessThanOrEqual(LOADER_CEILING);
    expect(LOADER_WORK + CARD_COLUMNS - 1).toBeLessThanOrEqual(LOADER_CEILING);
    // And the work area starts above everything the bootstrap card can store: that card is 80
    // columns with four word separators, so it stores 76 positions ending at 00087.
    expect(12 + (CARD_COLUMNS - LOADER_BOOTSTRAP_PROGRAM.length) - 1).toBeLessThan(LOADER_WORK);
    // And the same ceiling from the deck's side: every record this deck loads sits ABOVE it, so
    // the loaded program cannot land on the loader. `loaderDeck()` itself stays permissive — the
    // constraint belongs to the deck a program emits, not to the encoder.
    expect(RECORDS.filter((r) => r.loadAddress <= LOADER_CEILING)).toEqual([]);
  });

  it('the re-entry point is 00281 and it is a one-character instruction slot', () => {
    // C28-0309-1 pp.19-20 for the address; J28-0249 p.27 for what PAT stores there.
    // 00281 is one of the two DOCUMENTED fixed points this reconstruction is pinned to (the other
    // is the keyed bootstrap's 00012); every other address in the listing is ours.
    expect(CONDENSED_LOADER_IS_A_RECONSTRUCTION, 'the chosen fallback, pinned by name').toBe(true);
    const slot = CONDENSED_LOADER_PROGRAM[0]!;
    expect(slot.at).toBe(LOADER_RE_ENTRY);
    expect(slot.text).toBe('N');
    expect([...slot.text]).toHaveLength(1);
  });

  it('the work area is index registers 14 and 15, which is why it is at 00090', () => {
    // 00020 + 5n (address.ts, A22-0526-3 p.14 Figure 9). The card's load address becomes IR14 and
    // its `000nn` count becomes IR15, with no instruction executed.
    expect(LOADER_WORK).toBe(20 + 5 * LOADER_ADDRESS_INDEX);
    expect(LOADER_WORK + 5).toBe(20 + 5 * LOADER_COUNT_INDEX);
    expect(LOADER_PAYLOAD).toBe(LOADER_WORK + 10);
  });

  it('the bootstrap card hands the keyed `R` at 00011 its own I-address and d-character', () => {
    expect(LOADER_BOOTSTRAP_HEADER).toBe('00018⧧');
    expect(LOADER_BOOTSTRAP_PROGRAM[0]!.at).toBe(18);
    expect(LOADER_BOOTSTRAP_CARD.slice(0, 6)).toEqual(Uint8Array.from([...'00018⧧'].map(code)));
    expect(LOADER_BOOTSTRAP_CARD[6]).toBe(WORD_SEPARATOR);   // the mark on 00018
  });
});

// ═══ Stage 1 — the bootstrap card put the loader at 00281, character for character ══════════

describe('stage 1: the hand-keyed bootstrap loads the loader', () => {
  const { m, trace } = runUntil(LOADER_RE_ENTRY);

  it('the keyed twelve characters ran, read card 1, released the interlock and branched', () => {
    // The keyed `L` at 00001, the keyed one-character `R` at 00011 whose operands arrived on the
    // card, then the card's own three instructions (software.md §10.2, §10.5).
    expect(trace.map((s) => s.at)).toEqual([1, 11, 18, 28, 35]);
    expect(textAt(m, 12, 17)).toBe(LOADER_BOOTSTRAP_HEADER);
    expect(m.storage.wm(18), 'column 7\'s separator marked 00018 AND ended the keyed `R`').toBe(true);
  });

  it('the loader body sits at 00281-00350, every field where the listing says', () => {
    for (const field of CONDENSED_LOADER_PROGRAM) {
      const end = field.at + [...field.text].length - 1;
      expect(textAt(m, field.at, end), `${field.at}: ${field.cite}`).toBe(field.text);
      expect(m.storage.wm(field.at), `word mark on the op code at ${field.at}`).toBe(true);
      for (let a = field.at + 1; a <= end; a++) {
        expect(m.storage.wm(a), `no word mark inside the field at ${field.at}`).toBe(false);
      }
    }
  });

  it('the constant at 00350 is a LIVE group-mark-with-word-mark inside the loader', () => {
    expect(m.storage.read(350) & BCD6).toBe(GROUP_MARK_BCD);
    expect(m.storage.wm(350)).toBe(true);
    // Safe only because every read this loader issues carries `$` (io.md §3 steps 2 and 5).
    expect(CONDENSED_LOADER_PROGRAM.find((f) => f.at === 282)!.text).toContain('$');
  });
});

// ═══ Stage 2 — one condensed card, read into the work area, lands in the index registers ════

describe('stage 2: a condensed card lands at a FIXED offset, and in the index registers', () => {
  // Stop with the BCE at 00306 about to run: the read and both interlock instructions are done.
  const { m } = runUntil(306);
  const first = RECORDS[0]!;

  it('cols 2-6 are at WORK+0..4 — which IS index register 14', () => {
    expect(textAt(m, LOADER_WORK, LOADER_WORK + 4)).toBe('00500');
    expect(m.storage.wm(LOADER_WORK), 'column 1\'s separator marked it').toBe(true);
    expect(LOADER_WORK).toBe(20 + 5 * LOADER_ADDRESS_INDEX);
  });

  it('cols 8-12 are ONE word-marked five-digit field at WORK+5..9 — index register 15', () => {
    // This is what the three zeros in columns 8-10 are FOR (objectdeck.ts ZEROS_COLUMNS).
    expect(textAt(m, LOADER_WORK + 5, LOADER_WORK + 9)).toBe('00011');
    expect(m.storage.wm(LOADER_WORK + 5), 'column 7\'s separator marked it').toBe(true);
    expect(first.payload).toHaveLength(11);
  });

  it('the payload is at WORK+10 with its word marks ALREADY SET and its length exactly the count', () => {
    for (let i = 0; i < first.payload.length; i++) {
      const cell = m.storage.read(LOADER_PAYLOAD + i);
      expect(cell & BCD6, `payload character ${i}`).toBe(first.payload[i]! & BCD6);
      expect((cell & WM) !== 0, `payload word mark ${i}`).toBe((first.payload[i]! & WM) !== 0);
    }
    // The doubled separator on the card arrived as ONE stored separator with no mark (io.md §3).
    expect(m.storage.read(LOADER_PAYLOAD + 10) & BCD6).toBe(WORD_SEPARATOR);
    expect(m.storage.wm(LOADER_PAYLOAD + 10)).toBe(false);
  });

  it('columns 73-80 are read in and ignored — they land past the payload and never move', () => {
    // The card's own columns 73-80 arrive 46 blank columns past an 11-character payload.
    const at = LOADER_PAYLOAD + first.payload.length + 46;
    expect(textAt(m, at, at + 7)).toBe('001REENT');
  });

  it('nothing has been loaded yet: 00500 is still blank', () => {
    expect(m.storage.read(500)).toBe(m.storage.read(499));
    expect(glyphAt(m, 500)).toBe(' ');
  });
});

// ═══ Stage 3 — the plant, and then the move: the two self-addressing instructions ═══════════

describe('stage 3: the index adder computes both addresses, and nothing modifies itself', () => {
  const first = RECORDS[0]!;

  it('the plant at 00318 puts a GM-WM at PAYLOAD + count, from index register 15', () => {
    const before = runUntil(318).m;
    expect(before.storage.read(LOADER_PAYLOAD + first.payload.length) & BCD6).not.toBe(GROUP_MARK_BCD);

    const after = runUntil(330).m;                    // one instruction later
    const at = LOADER_PAYLOAD + first.payload.length;
    expect(after.storage.read(at) & BCD6, 'the group mark').toBe(GROUP_MARK_BCD);
    expect(after.storage.wm(at), 'carrying a word mark — d = `7` moves the word-mark portion').toBe(true);
  });

  it('the plant instruction in core is UNCHANGED after it runs — no self-modification', () => {
    const plant = CONDENSED_LOADER_PROGRAM.find((f) => f.at === 318)!;
    const move = CONDENSED_LOADER_PROGRAM.find((f) => f.at === 330)!;
    const after = runUntil(342).m;                    // both have run
    expect(textAt(after, plant.at, plant.at + [...plant.text].length - 1)).toBe(plant.text);
    expect(textAt(after, move.at, move.at + [...move.text].length - 1)).toBe(move.text);
    // "the 5-digit factor is added AFTER the address enters the address register; the instruction
    // image in storage is never modified" — architecture.md §5, A22-0526-3 pp.14-15.
    expect(move.text).toContain('00?!0');
    expect(plant.text).toContain('00A?0');
  });

  it('the move at 00330 put the first record where its own card said, marks included', () => {
    const after = runUntil(342).m;
    for (let i = 0; i < first.payload.length; i++) {
      const cell = after.storage.read(first.loadAddress + i);
      expect(cell & BCD6, `character ${i} of record 1`).toBe(first.payload[i]! & BCD6);
      expect((cell & WM) !== 0, `word mark ${i} of record 1`).toBe((first.payload[i]! & WM) !== 0);
    }
  });

  it('and carried the terminating GM-WM across with it, which is opcodes.md §3.1 being right', () => {
    // "The position holding the terminating character is moved/replaced like every other
    // position" (A22-0526-3 pp.25-26). Asserted, not tolerated: for a contiguous deck the next
    // card overwrites it, and the last one marks the end of the loaded program.
    const after = runUntil(342).m;
    expect(after.storage.read(endOf(first)) & BCD6).toBe(GROUP_MARK_BCD);
    expect(after.storage.wm(endOf(first))).toBe(true);
  });
});

// ═══ Stage 4 — the whole deck, the oracle of plan §11 wave 5 ════════════════════════════════

describe('THE ORACLE: three condensed cards and an execute card, end to end', () => {
  const { m, trace, stop } = run(400);
  const state = m.snapshot();

  it('core equals the records CELL FOR CELL, INCLUDING WORD MARKS', () => {
    for (const [n, record] of RECORDS.entries()) {
      for (let i = 0; i < record.payload.length; i++) {
        const at = record.loadAddress + i;
        const cell = m.storage.read(at);
        expect(cell & BCD6, `record ${n + 1}, character ${i} at ${at}`).toBe(record.payload[i]! & BCD6);
        expect((cell & WM) !== 0, `record ${n + 1}, word mark ${i} at ${at}`)
          .toBe((record.payload[i]! & WM) !== 0);
      }
    }
    // And as one string, so a failure prints the loaded program rather than a byte.
    expect(textAt(m, 500, 520)).toBe('J00520 ABC⌒123456789.');
    const marked: Addr[] = [];
    for (let a = 500; a <= 520; a++) if (m.storage.wm(a)) marked.push(a);
    expect(marked).toEqual([500, 507, 511, 520]);
  });

  it('the trailing GM-WM of each card is overwritten by the next, and the last one remains', () => {
    expect(endOf(RECORDS[0]!)).toBe(RECORDS[1]!.loadAddress);
    expect(endOf(RECORDS[1]!)).toBe(RECORDS[2]!.loadAddress);
    const end = endOf(RECORDS[2]!);
    expect(m.storage.read(end) & BCD6).toBe(GROUP_MARK_BCD);
    expect(m.storage.wm(end)).toBe(true);
    // It is also what ends the read-out of the one-character halt the last record loaded.
    expect(end).toBe(ENTRY + 1);
  });

  it('IAR REACHED THE ENTRY POINT — the execute card branched, and the loaded halt ran', () => {
    // The execute card's `E` in column 1 is at WORK+0 and its `J 00520 ` at WORK+1; the BCE at
    // 00306 branched to WORK+1 and the card's own branch did the rest (EXECUTE_CARD_IS_E_IN_COLUMN_1).
    const executed = trace.map((s) => s.at);
    expect(executed).toContain(LOADER_WORK + 1);
    expect(executed).toContain(ENTRY);
    // The last three instructions: the BCE that matched, the card's branch, the loaded halt.
    expect(executed.slice(-3)).toEqual([306, LOADER_WORK + 1, ENTRY]);
    expect(glyphAt(m, LOADER_WORK)).toBe('E');
    expect(textAt(m, LOADER_WORK + 1, LOADER_WORK + 7)).toBe('J00520 ');
  });

  it('the stop reason is a halt, at the loaded program\'s own halt instruction', () => {
    expect(stop).toBe('halt');
    expect(state.stop).toBe('halt');
    // `MachineState` carries no stop ADDRESS; after the one-character `.` at the entry point the
    // IAR is already at the next sequential instruction (as in `test/tier4-demo-deck.test.ts`).
    expect(state.iar).toBe(ENTRY + 1);
  });

  it('the loader went round the loop once per card and never through the re-entry slot', () => {
    // 00281 runs once, on the way in from the bootstrap; the loop branches to the READ at 00282
    // (LOADER_LOOPS_BACK_PAST_THE_RE_ENTRY_SLOT).
    expect(LOADER_LOOPS_BACK_PAST_THE_RE_ENTRY_SLOT, 'the chosen fallback, pinned by name — a loop '
      + 'back to 00281 would run the slot once per card').toBe(true);
    const executed = trace.map((s) => s.at);
    expect(executed.filter((a) => a === LOADER_RE_ENTRY)).toHaveLength(1);
    expect(executed.filter((a) => a === 282)).toHaveLength(RECORDS.length + 1);   // + the execute card
    expect(executed.filter((a) => a === 330)).toHaveLength(RECORDS.length);       // the move, once each
    expect(executed.filter((a) => a === 349), 'the halt at 00349 is the EOF path, not this one')
      .toHaveLength(0);
  });

  it('all six cards went through the reader to pocket NR, and channel 1 is clear', () => {
    expect(state.reader.hopper).toBe(0);
    expect(state.reader.stackers).toEqual({ '0': 6, '1': 0, '8-2': 0 });
    // Every read was followed by `R (I) <group mark>`, which releases the interlock without
    // requiring a branch (io.md §5) — so nothing is left holding it at the halt.
    expect(state.channel1.interlock).toBe(false);
    expect(state.channel1.condition).toBe(false);
    expect(state.channel1.wrongLengthRecord).toBe(false);
    expect(state.console.filter((l) => l.id === 'E')).toEqual([]);
  });

  it('THE BOUNDARY: the loader never wrote outside its own three regions', () => {
    // The layout plan §8.3 pins: the keyed bootstrap at 00000-00011, the bootstrap card's image
    // from 00012, the work area from 00090, and the loader body at 00281-00350. Nothing else
    // below 00500 may hold a character or a word mark — in particular the loader's staging area
    // must not have reached the loaded region, and the loaded region must not have reached back.
    const regions: readonly (readonly [Addr, Addr, string])[] = [
      [0, 11, 'the hand-keyed bootstrap'],
      [12, 12 + CARD_COLUMNS - LOADER_BOOTSTRAP_PROGRAM.length - 1, 'the bootstrap card image'],
      [LOADER_WORK, LOADER_WORK + CARD_COLUMNS - 1, 'the work area'],
      [LOADER_RE_ENTRY, 350, 'the loader body'],
    ];
    const strays: string[] = [];
    for (let a = 0; a < RECORDS[0]!.loadAddress; a++) {
      const cell = m.storage.read(a);
      if ((cell & BCD6) === BLANK && (cell & WM) === 0) continue;
      if (regions.some(([lo, hi]) => a >= lo && a <= hi)) continue;
      strays.push(`${a}: "${glyphAt(m, a)}"${m.storage.wm(a) ? ' (marked)' : ''}`);
    }
    expect(strays).toEqual([]);
    // And the far side of the boundary: nothing above the last record either.
    for (let a = endOf(RECORDS[2]!) + 1; a < 600; a++) {
      expect(m.storage.read(a) & BCD6, `${a} above the loaded program`).toBe(BLANK);
      expect(m.storage.wm(a), `${a} above the loaded program`).toBe(false);
    }
  });
});

// ═══ The end-of-file path, which is the loader's only other exit ════════════════════════════

describe('a deck with no execute card stops at the loader\'s own halt', () => {
  it('the 1402 Condition on the read after the last card reaches the halt at 00349', () => {
    const m = createMachine({ size: 10_000 });
    m.loadDeck([LOADER_BOOTSTRAP_CARD, LOADER_BODY_CARD, encodeObjectRecord(RECORDS[0]!)]);
    m.readerStart();
    m.readerEndOfFile();
    m.display(BOOTSTRAP_ORIGIN);
    m.setMode('alter');
    m.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks);
    m.computerReset();
    m.setMode('run');

    const executed: Addr[] = [];
    let stop: string | undefined;
    for (let i = 0; i < 200; i++) {
      executed.push(m.regs.iar);
      const reason = m.step();
      if (reason !== undefined) { stop = reason; break; }
    }
    // io.md §6: the EOF latch turns on as the Condition indicator does, on the read that FOLLOWS
    // the last card — so the record loads, the loop comes round, and `R 00349 9` takes it.
    expect(stop).toBe('halt');
    expect(executed.at(-1)).toBe(349);
    expect(executed.at(-2)).toBe(292);
    expect(textAt(m, 500, 510)).toBe('J00520 ABC⌒');
  });
});

// ═══ The operator error: cards in the hopper and END OF FILE never pressed ══════════════════

describe('a hopper the operator never pressed END OF FILE on', () => {
  it('halts at 00349 on Not Ready instead of re-loading the previous card for ever', () => {
    // io.md §6 `[verified]`: "With 4 or more cards in the hopper all are processed normally;
    // with 3 cards remaining, a read issued before the EOF key is pressed sets the Not Ready
    // indicator — press EOF then Start to let the last three through." That is the one operator
    // error this phase documents (software.md §10.7; `test/tier4-demo-deck.test.ts` performs the
    // correct sequence deliberately). The loop's exit is `R 00349 9`, d = octal 11 = bits 8 + 1 =
    // Condition OR Not Ready (opcodes.md §6.2), so a Not Ready read reaches the halt. On `8`
    // alone it would fall through, transfer nothing, and re-plant and re-move the record already
    // in the work area on every pass — a loop with no exit and nothing on the console to see.
    const m = createMachine({ size: 10_000 });
    m.loadDeck(hopper());
    m.readerStart();                                  // and NO m.readerEndOfFile()
    m.display(BOOTSTRAP_ORIGIN);
    m.setMode('alter');
    m.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks);
    m.computerReset();
    m.setMode('run');

    const executed: Addr[] = [];
    let stop: string | undefined;
    for (let i = 0; i < 400; i++) {
      executed.push(m.regs.iar);
      const reason = m.step();
      if (reason !== undefined) { stop = reason; break; }
    }

    expect(stop, 'it STOPPED — the loop is not spinning').toBe('halt');
    expect(executed.at(-1), 'at the loader\'s own halt').toBe(349);
    expect(executed.at(-2), 'reached from the status branch at 00292').toBe(292);
    expect(m.regs.iar, 'the one-character halt at 00349 leaves the IAR past it').toBe(350);
    // The Not Ready read transferred no data, so the load stopped where it was: the first
    // record is in core with its trailing GM-WM, and the second never arrived.
    expect(textAt(m, 500, 510)).toBe('J00520 ABC⌒');
    expect(m.storage.read(endOf(RECORDS[0]!)) & BCD6).toBe(GROUP_MARK_BCD);
    expect(glyphAt(m, RECORDS[1]!.loadAddress + 1)).toBe(' ');
  });
});

// ═══ The execute card, on its own ═══════════════════════════════════════════════════════════

describe('the execute card is `E` in column 1 and its instruction from column 2', () => {
  it('punches as emulators.md §7 describes, and lands as the BCE at 00306 expects', () => {
    expect(EXECUTE_CARD_IS_E_IN_COLUMN_1, 'the chosen fallback, pinned by name').toBe(true);
    const card = executeCard(2000);
    expect(glyphOf(card[0]! & BCD6)).toBe('E');
    expect(card[1]).toBe(WORD_SEPARATOR);
    expect([...card.slice(2, 9)].map((c) => glyphOf(c & BCD6)).join('')).toBe('J02000 ');
    expect(card[9]).toBe(WORD_SEPARATOR);
    expect(card[10]! & BCD6).toBe(GROUP_MARK_BCD);
  });

  it('rejects an entry point that is not a five-digit address', () => {
    expect(() => executeCard(100_000)).toThrow(/not a five-digit address/);
  });
});
