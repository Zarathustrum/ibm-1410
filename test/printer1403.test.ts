// Tier 0 + tier 1 — the IBM 1403 Model 2, its 48-graphic chain and its carriage.
//
// Four things are proved here, and each is a different kind of claim:
//  (a) TIER 0 — the chain. All 64 codes on both arrangements against `oracle/chain48.json`, which
//      transcribes research/charset.md §5 independently of the table in `printer1403.ts`. The
//      twelve blanks and the three special renderings are named, not merely counted.
//  (b) TIER 1 — the carriage. All THIRTY rows of `isa/dmods.ts`'s `CARRIAGE_D_TABLE` driven one
//      d at a time through real `F d` instructions. `CARRIAGE_D_TABLE` is the spec and gets no
//      second fixture (plan §12): the test asserts the PRINTER'S INTERPRETATION of that table,
//      so a transcription slip would have to be made twice in the same direction to hide.
//  (c) TIER 1 — the two rules implementers get wrong: "a skip to a channel the brushes are
//      already positioned on moves to the next punch of that channel" (io.md §7), from the
//      power-on home position in BOTH directions; and the page counting on the WRAP rather than
//      on a skip to channel 1.
//  (d) TIER 1 — the deferred automatic single space, both arms, with `snapshot()` proved not to
//      move the carriage; the overlong record; load-mode `%20`'s blank ahead of a marked
//      character, through the real channel; and io.md §7 Figures 89/91 against
//      `oracle/io-status.json` wherever the row is reachable.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bcdOfGlyph, BCD_TABLE } from '../src/core/bcd.js';
import {
  chainGlyph, DEFAULT_CARRIAGE_TAPE, Printer1403, renderGreenBar,
  type CarriageTape, type PrintChain,
} from '../src/core/devices/printer1403.js';
import { CARRIAGE_D_TABLE, RX_RELEASE_D_GLYPH } from '../src/core/isa/dmods.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { WM, type Addr, type PrintEvent } from '../src/core/types.js';

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

/**
 * A machine whose 1403 carries `tape`. `DeviceRegistry.register` is keyed on x2, so registering a
 * second printer REPLACES the default one — which is how a test drives real `F d` instructions
 * against a tape it chose. The returned printer is the one the channel will reach.
 */
function machineWithTape(tape: CarriageTape): { m: Machine; p: Printer1403 } {
  const m = createMachine({ size: 10_000 });
  const p = new Printer1403({ tape });
  m.channel1.devices.register(p);
  return { m, p };
}

/**
 * A tape punched on ALL TWELVE channels so every one of Figure 90's skip rows lands somewhere
 * defined: channel n at line n, on a 24-line form. Nothing about it is a hardware claim — it is
 * a test fixture whose only job is to give twelve distinguishable targets.
 */
const TWELVE_CHANNEL_TAPE: CarriageTape = {
  formLines: 24,
  punches: Array.from({ length: 12 }, (_, i) => ({ line: i + 1, channel: i + 1 })),
};

// ═══ (a) TIER 0 — the chain, against oracle/chain48.json ═══════════════════

interface ChainRow {
  octal: string; hollerith: string; name: string; a: string; h: string;
}
const CHAIN48 = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/chain48.json'), 'utf8'),
) as {
  sets: Record<PrintChain, string>;
  dualed: readonly { octal: string; a: string; h: string }[];
  blankOnBothChains: { octals: readonly string[]; names: readonly string[] };
  specialRenderings: readonly { octal: string; name: string; glyph: string; a: string; h: string }[];
  rows: readonly ChainRow[];
};

describe('oracle/chain48.json — the 1403 chain for all 64 codes (charset.md §5)', () => {
  it('covers all 64 codes exactly once, and its punches agree with bcd.ts', () => {
    expect(CHAIN48.rows).toHaveLength(64);
    const octals = new Set(CHAIN48.rows.map((r) => r.octal));
    expect(octals.size, 'no code transcribed twice').toBe(64);
    // The fixture carries `hollerith` so a reviewer can check a row against charset.md §2's chart
    // without a second lookup; that column is the one place the two tables can be cross-checked
    // mechanically, and it is checked here rather than assumed.
    for (const row of CHAIN48.rows) {
      const entry = BCD_TABLE.find((e) => e.octal === row.octal);
      if (entry === undefined) throw new Error(`no bcd.ts row for octal ${row.octal}`);
      expect(entry.hollerith, `octal ${row.octal}`).toBe(row.hollerith);
      expect(entry.name, `octal ${row.octal}`).toBe(row.name);
    }
  });

  for (const chain of ['A', 'H'] as const) {
    it(`chainGlyph renders every code on arrangement ${chain} as the fixture says`, () => {
      // HOW MUCH THIS ONE PROVES, exactly: the fixture's `a`/`h` columns and `printer1403.ts`'s
      // `CHAIN_SLUGS` were both transcribed from charset.md §5, so a glyph wrong in §5 — or read
      // wrong twice in the same direction — is wrong in both and this diff stays green. The
      // fixture's INDEPENDENT weight is the row above: `hollerith` and `name` cross-checked
      // against `bcd.ts`, a table with a different provenance (charset.md §2's punch chart). Read
      // this test as "the printer agrees with the transcription", not as "the transcription is
      // right"; only a re-render of A22-0526-3 Figure 2 settles the second.
      for (const row of CHAIN48.rows) {
        const bcd = Number.parseInt(row.octal, 8);
        const want = chain === 'A' ? row.a : row.h;
        // `""` in the fixture is "no slug on this arrangement"; the printer renders that as one
        // blank position, because the hammer simply does not fire (charset.md §5).
        expect(chainGlyph(bcd, chain), `octal ${row.octal} (${row.name}) on ${chain}`)
          .toBe(want === '' ? ' ' : want);
      }
    });

    it(`arrangement ${chain} carries exactly 48 graphics`, () => {
      const graphics = new Set(
        CHAIN48.rows
          .map((r) => (chain === 'A' ? r.a : r.h))
          .filter((g) => g !== '' && g !== ' '),
      );
      // 26 alphabetic + 10 numeric + 12 special — io.md §7 "Configuration", charset.md §5.
      expect(graphics.size, CHAIN48.sets[chain]).toBe(48);
    });
  }

  it('the twelve codes on NEITHER arrangement print blank, by name', () => {
    expect(CHAIN48.blankOnBothChains.octals).toHaveLength(12);
    expect(CHAIN48.blankOnBothChains.names).toHaveLength(12);
    CHAIN48.blankOnBothChains.octals.forEach((octal, i) => {
      const bcd = Number.parseInt(octal, 8);
      const name = CHAIN48.blankOnBothChains.names[i];
      expect(chainGlyph(bcd, 'A'), `${name} on A`).toBe(' ');
      expect(chainGlyph(bcd, 'H'), `${name} on H`).toBe(' ');
    });
  });

  it('the three special renderings: `ƀ` → record mark, `?` → & / +, `!` → -', () => {
    expect(CHAIN48.specialRenderings).toHaveLength(3);
    for (const s of CHAIN48.specialRenderings) {
      const bcd = Number.parseInt(s.octal, 8);
      expect(bcdOfGlyph(s.glyph), `${s.name} is bcd.ts's "${s.glyph}"`).toBe(bcd);
      expect(chainGlyph(bcd, 'A'), `${s.name} on A`).toBe(s.a);
      expect(chainGlyph(bcd, 'H'), `${s.name} on H`).toBe(s.h);
    }
    // Named individually as well, because the fixture could be wrong in the same way twice.
    expect(chainGlyph(code('ƀ'), 'A'), 'substitute blank prints the record-mark slug').toBe('‡');
    expect(chainGlyph(code('?'), 'A'), '`?` prints `&` on A').toBe('&');
    expect(chainGlyph(code('?'), 'H'), '`?` prints `+` on H — charset.md §5.1 [likely]').toBe('+');
    expect(chainGlyph(code('!'), 'A'), '`!` prints `-`').toBe('-');
    expect(chainGlyph(code('!'), 'H'), 'and `-` is chain-independent').toBe('-');
  });

  it('the five dualed code points differ between the arrangements and nothing else does', () => {
    const differing = CHAIN48.rows.filter((r) => r.a !== r.h).map((r) => r.octal).sort();
    // `?` (octal 72) prints the 12-zone slug, so it moves with `&` — six rows differ, five of
    // which are Figure 2's dualed pairs and the sixth is the plus-zero that renders as one.
    const dualed = CHAIN48.dualed.map((d) => d.octal);
    expect(differing).toEqual([...dualed, '72'].sort());
  });

  it('charset.md §5.3: this table is NOT SimH\'s — 12 prints `&`, not `+`, on the default chain', () => {
    // The whole point of the caution: an emulator that copies SimH's `mem_to_ascii` silently
    // selects the H arrangement. The default here is A.
    expect(chainGlyph(code('&'))).toBe('&');
    expect(chainGlyph(code('⌑'))).toBe('⌑');
    expect(chainGlyph(code('%'))).toBe('%');
    expect(chainGlyph(code('#'))).toBe('#');
    expect(chainGlyph(code('@'))).toBe('@');
  });
});

// ═══ (b) TIER 1 — all 30 rows of CARRIAGE_D_TABLE through real `F d` ═══════

describe('`F d` — all 30 rows of CARRIAGE_D_TABLE (io.md §7 Figure 90, A22-0526-3 p.81)', () => {
  it('the table has exactly the 30 rows Figure 90 prints', () => {
    expect(CARRIAGE_D_TABLE).toHaveLength(30);
  });

  for (const row of CARRIAGE_D_TABLE) {
    it(`\`F ${row.d}\` — ${row.meaning}`, () => {
      const { m, p } = machineWithTape(TWELVE_CHANNEL_TAPE);
      program(m.storage, 100, `F${row.d}`);
      m.addressSet(100);
      expect(m.step(), `F ${row.d}`).toBeUndefined();

      // Step 8 of the nine: Figure 91's status column is six "never"s in this configuration.
      const st = m.snapshot().channel1;
      expect(st.notReady, 'the 1403 is there and the carriage can move').toBe(false);
      expect(st.dataCheck).toBe(false);
      expect(st.condition).toBe(false);
      expect(st.wrongLengthRecord).toBe(false);
      expect(st.noTransfer).toBe(false);

      const events = p.events;
      expect(events, `one PrintEvent for \`F ${row.d}\``).toHaveLength(1);
      const event = events[0] as PrintEvent;
      const { page, line } = p.carriage;

      switch (row.mode) {
        case 'immediateSkip':
          expect(event).toEqual({ kind: 'skip', channel: row.value, afterPrint: false });
          // Channel n is punched at line n on TWELVE_CHANNEL_TAPE, and the search starts at
          // currentLine + 1 — so from home (line 1) channel 1 is the one that has to wrap.
          if (row.value === 1) expect({ page, line }).toEqual({ page: 2, line: 1 });
          else expect({ page, line }).toEqual({ page: 1, line: row.value });
          break;
        case 'skipAfterPrint':
          expect(event).toEqual({ kind: 'skip', channel: row.value, afterPrint: true });
          expect({ page, line }, 'parked, not performed').toEqual({ page: 1, line: 1 });
          break;
        case 'immediateSpace':
          expect(event).toEqual({ kind: 'space', lines: row.value, afterPrint: false });
          expect({ page, line }).toEqual({ page: 1, line: 1 + row.value });
          break;
        case 'spaceAfterPrint':
          expect(event).toEqual({ kind: 'space', lines: row.value, afterPrint: true });
          expect({ page, line }, 'parked, not performed').toEqual({ page: 1, line: 1 });
          break;
      }
    });
  }

  it('an after-print motion is what the NEXT write performs, instead of the single space', () => {
    const p = new Printer1403();
    // `F S` = space 2 after print, then a write. The line lands where the carriage already is
    // and the parked motion follows it — the automatic single space never happens.
    p.control('F', 'S');
    p.write('0', 'W', Uint8Array.from([code('X')]), 'move');
    expect(p.paper).toEqual([{ page: 1, line: 1, text: 'X' }]);
    expect(p.carriage.line, 'space 2, not space 1').toBe(3);
    expect(p.carriage.autoSpacePending, 'the after-print motion replaced it').toBe(false);
  });

  it('an after-print `F` while a print is OUTSTANDING moves the carriage NOW', () => {
    // The blocker the wave-3 review found. `W` `F /` `W`: the `F /` is the carriage-control
    // instruction that "follows" the first print (io.md §7), so it performs the first print's
    // motion in place of the automatic single space — it does NOT park a motion for the second
    // print, which would leave both lines at line 1 and lose the first.
    const p = new Printer1403();
    p.write('0', 'W', Uint8Array.from([code('A')]), 'move');
    expect(p.carriage).toMatchObject({ page: 1, line: 1, autoSpacePending: true });
    p.control('F', '/');                       // space 1 after print
    expect(p.carriage, 'the armed space is consumed BY this motion, not added to it')
      .toMatchObject({ page: 1, line: 2, autoSpacePending: false });
    p.write('0', 'W', Uint8Array.from([code('B')]), 'move');
    expect(p.paper).toEqual([
      { page: 1, line: 1, text: 'A' },
      { page: 1, line: 2, text: 'B' },
    ]);
    // Space-1-after-print IS the automatic single space, so the page is the same one two plain
    // writes produce — which is the check that the motion happened once, not twice or never.
    expect(p.carriage).toMatchObject({ page: 1, line: 2, autoSpacePending: true });
  });

  it('`F B` after a print SKIPS immediately — the skip belongs to the print in progress', () => {
    // Channel 2 is punched at line 2 on TWELVE_CHANNEL_TAPE. Figure 91's Busy row for a carriage
    // op is "forms in motion / forms instruction waiting": the queued motion is the print's.
    const p = new Printer1403({ tape: TWELVE_CHANNEL_TAPE });
    p.write('0', 'W', Uint8Array.from([code('X')]), 'move');
    p.control('F', 'B');                       // skip after print to channel 2
    expect(p.events[1], 'the event still records what the PROGRAM asked for')
      .toEqual({ kind: 'skip', channel: 2, afterPrint: true });
    expect(p.carriage, 'performed, not parked')
      .toMatchObject({ page: 1, line: 2, autoSpacePending: false });
    p.write('0', 'W', Uint8Array.from([code('Y')]), 'move');
    expect(p.paper, 'and nothing was left parked to move the second line further')
      .toEqual([
        { page: 1, line: 1, text: 'X' },
        { page: 1, line: 2, text: 'Y' },
      ]);
  });

  it('an undefined d-character is an Instruction Check (io.md §7 Figure 90 lists 30)', () => {
    const m = createMachine({ size: 10_000 });
    // `V` is not one of Figure 90's thirty. UNDEFINED_CARRIAGE_D_CHAR_IS_INSTRUCTION_CHECK.
    expect(CARRIAGE_D_TABLE.some((r) => r.d === 'V')).toBe(false);
    program(m.storage, 100, 'FV');
    m.addressSet(100);
    expect(m.step()).toBe('instructionCheck');
    expect(m.cpu.lastCheck?.message).toContain('undefined carriage d-character');
  });
});

// ═══ (c) TIER 1 — the next-punch rule and the page count ═══════════════════

describe('"a skip to a channel the brushes are already positioned on moves to the next punch of that channel" (io.md §7)', () => {
  it('powers on at page 1, line 1, POSITIONED ON the channel-1 punch', () => {
    const p = new Printer1403();
    expect(p.carriage).toEqual({
      page: 1, line: 1, channel9: false, channel12: false, autoSpacePending: false,
    });
    expect(DEFAULT_CARRIAGE_TAPE.punches).toContainEqual({ line: 1, channel: 1 });
  });

  it('`F 1` FROM HOME ejects a form — the rule paying its way (plan §13)', () => {
    // The search starts at currentLine + 1, so the channel-1 punch at line 1 of THIS form is
    // behind the brushes; the next channel-1 punch is line 1 of the next form.
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, 'F1');
    m.addressSet(100);
    m.step();
    expect(m.snapshot().printer.carriage).toMatchObject({ page: 2, line: 1 });
  });

  it('`F 1` FROM MID-FORM reaches the same place — line 1 of the next form', () => {
    const p = new Printer1403();
    p.control('F', 'L');                       // immediate space 3 -> line 4
    expect(p.carriage).toMatchObject({ page: 1, line: 4 });
    p.control('F', '1');
    expect(p.carriage).toMatchObject({ page: 2, line: 1 });
  });

  it('the page counts the WRAP, not the skip: a mid-form channel does not bump it', () => {
    const p = new Printer1403();
    p.control('F', '9');                       // channel 9 is line 57 on DEFAULT_CARRIAGE_TAPE
    expect(p.carriage).toMatchObject({ page: 1, line: 57 });
    p.control('F', '@');                       // channel 12 is line 60
    expect(p.carriage).toMatchObject({ page: 1, line: 60 });
    p.control('F', '9');                       // no channel 9 left on this form -> wrap
    expect(p.carriage).toMatchObject({ page: 2, line: 57 });
  });

  it('a skip to an UNPUNCHED channel advances exactly one form and no more', () => {
    // SKIP_TO_UNPUNCHED_CHANNEL_ADVANCES_ONE_FORM. DEFAULT_CARRIAGE_TAPE is punched on channels
    // 1, 9 and 12 only, so `F 5` — one keystroke away in the ALTER box — searches a channel that
    // is not there. No manual says what a real carriage does; the search is bounded at one full
    // form, which lands the carriage one form on at the line it started from. The alternative,
    // an unbounded search, is a hang rather than a behaviour.
    const p = new Printer1403();
    expect(DEFAULT_CARRIAGE_TAPE.punches.some((x) => x.channel === 5), 'channel 5 is unpunched')
      .toBe(false);
    p.control('F', '5');
    expect(p.carriage, 'one form on, same line').toMatchObject({ page: 2, line: 1 });
    p.control('F', '5');
    expect(p.carriage, 'and again — one form per skip, never a runaway')
      .toMatchObject({ page: 3, line: 1 });
  });

  it('channel 9 and channel 12 turn on when their hole is sensed and off at any other punch (Figure 35)', () => {
    const p = new Printer1403();
    expect(p.carriage).toMatchObject({ channel9: false, channel12: false });
    p.control('F', '9');
    expect(p.carriage).toMatchObject({ line: 57, channel9: true, channel12: false });
    p.control('F', 'J');                       // space 1 -> line 58, which has NO punch at all
    expect(p.carriage, 'an unpunched line senses nothing and changes nothing')
      .toMatchObject({ line: 58, channel9: true, channel12: false });
    p.control('F', '@');                       // channel 12 at line 60 — another punched line
    expect(p.carriage).toMatchObject({ line: 60, channel9: false, channel12: true });
    p.control('F', '1');                       // home on the next form: a channel-1 punch
    expect(p.carriage).toMatchObject({ page: 2, line: 1, channel9: false, channel12: false });
  });
});

// ═══ (d) TIER 1 — printing, the automatic space, and the status table ══════

/** `M %20 00500 W` — Write a Line from 00500, move mode (io.md §7 Figure 88). */
function machineThatPrints(text: string, at = 500): Machine {
  const m = createMachine({ size: 10_000 });
  program(m.storage, 100, 'M%2000500W', `R00300${RX_RELEASE_D_GLYPH}`);
  [...text].forEach((g, i) => m.storage.setChar(at + i, code(g), false));
  m.storage.setChar(at + text.length, code('⧧'), true);   // the GM-WM that ends the record
  m.addressSet(100);
  return m;
}

describe('Write a Line — io.md §7 Figure 88 (A22-0526-3 p.80)', () => {
  it('prints the record through the chain, trailing blanks preserved on the PrintLine', () => {
    const m = machineThatPrints('DAD  ');
    m.step();
    const paper = m.snapshot().printer.paper;
    expect(paper).toEqual([{ page: 1, line: 1, text: 'DAD  ' }]);
    // Rule 3 of the five: the TRIM is the renderer's, never the device's.
    expect(renderGreenBar(paper, { chain: 'A', formLines: 66 }))
      .toBe('1403 Model 2 · chain A · 66-line form\n\nDAD\n');
  });

  it('a 133-character record sets WLR and prints NOTHING (OVERLONG_RECORD_SETS_WLR)', () => {
    const m = machineThatPrints('X'.repeat(133));
    m.step();
    expect(m.snapshot().channel1.wrongLengthRecord, 'io.md §7 Figure 89').toBe(true);
    expect(m.snapshot().printer.paper, 'the line is not printed').toEqual([]);
    expect(m.snapshot().printer.carriage, 'and the carriage did not move')
      .toMatchObject({ page: 1, line: 1, autoSpacePending: false });
  });

  it('132 characters is the Model 2 buffer and prints', () => {
    const m = machineThatPrints('Y'.repeat(132));
    m.step();
    expect(m.snapshot().channel1.wrongLengthRecord).toBe(false);
    expect(m.snapshot().printer.paper[0]?.text).toHaveLength(132);
  });

  it('an x3 the printer has no sub-operation for is Not Ready (UNKNOWN_X3_IS_NOT_READY)', () => {
    const p = new Printer1403();
    expect(p.precheck('0', 'W'), 'Write a Line').toEqual({});
    // `1` was Not Ready through wave 3 — the stated descope of plan §14 R3 — and is a real
    // sub-operation from wave 4, which added `Device.outputCells` (A22-0526-3 p.80).
    expect(p.precheck('1', 'W'), 'Write Word Marks as 1s').toEqual({});
    expect(p.precheck('7', 'W'), 'no such sub-operation').toEqual({ notReady: true });
  });
});

// ═══ `%21` Write Word Marks as 1s — io.md §7, charset.md §7 ════════════════
//
// THE SAME MARKED FIELD THROUGH `M %21` AND `L %21`, which is the whole point of the pair: the
// two orderings of `Device.outputCells` and `translateForOutput` give different answers over
// marked data, and only this test can tell them apart (plan §6.3). The hook runs FIRST, so the
// load-mode row is read off the word-mark bits themselves and never off separators that do not
// exist yet.
describe('`%21` Write Word Marks as 1s — the M and L rows of A22-0526-3 p.80', () => {
  /** `A` marked, `B` unmarked, `C` marked, `D` unmarked, then the GM-WM that ends the record. */
  function machineThatWritesMarks(op: 'M' | 'L'): Machine {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, `${op}%2100500W`);
    [...'ABCD'].forEach((g, i) => m.storage.setChar(500 + i, code(g), i % 2 === 0));
    m.storage.setChar(504, code('⧧'), true);
    m.addressSet(100);
    return m;
  }

  it('`M %21` prints `1` in every word-marked position and blank in every other', () => {
    const m = machineThatWritesMarks('M');
    m.step();
    expect(m.snapshot().channel1.notReady, 'x3 = `1` is a sub-operation now').toBe(false);
    expect(m.snapshot().printer.paper).toEqual([{ page: 1, line: 1, text: '1 1 ' }]);
  });

  it('`L %21` — "if the L Op code is used, no printing results": a BLANK line, all four positions', () => {
    // A22-0526-3 p.80 / charset.md §7, verbatim: "(Thus, if the L Op code is used, no printing
    // results.)" The manual's own reason is mechanical — load mode converts the word marks to
    // word separators before the buffer, and every non-word-mark position is blank — so every
    // position is blank. THE LINE IS STILL PRINTED: the transfer happened and the carriage still
    // spaces, so what the operator sees is a blank line, not a suppressed print cycle. Nothing in
    // any source describes a suppressed cycle, and the paper below is the pin on that reading.
    const m = machineThatWritesMarks('L');
    m.step();
    expect(m.snapshot().printer.paper).toEqual([{ page: 1, line: 1, text: '    ' }]);
    expect(renderGreenBar(m.snapshot().printer.paper, { chain: 'A', formLines: 66 }),
      'and nothing survives the trim — no ink on the page')
      .toBe('1403 Model 2 · chain A · 66-line form\n\n\n');
    expect(m.snapshot().printer.carriage.autoSpacePending, 'the carriage still spaced').toBe(true);
  });

  it('the same field through `M %20` prints the CHARACTERS — the hook is what differs', () => {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, 'M%2000500W');
    [...'ABCD'].forEach((g, i) => m.storage.setChar(500 + i, code(g), i % 2 === 0));
    m.storage.setChar(504, code('⧧'), true);
    m.addressSet(100);
    m.step();
    expect(m.snapshot().printer.paper[0]?.text).toBe('ABCD');
  });

  it('`outputCells` leaves every other sub-operation alone, so `%20` never sees it', () => {
    const p = new Printer1403();
    const cells = [WM | code('A'), code('B')];
    expect(p.outputCells('0', cells, 'move'), 'Write a Line is untouched').toBe(cells);
    expect(p.outputCells('1', cells, 'move').map((c) => c & 0o77)).toEqual([code('1'), code(' ')]);
    expect(p.outputCells('1', cells, 'load').map((c) => c & 0o77)).toEqual([code(' '), code(' ')]);
  });
});

describe('load-mode `L %20` — "a blank precedes each word-marked character" (io.md §7, charset.md §7)', () => {
  it('needs no printer code: the separator the CHANNEL emits has no chain slug', () => {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, 'L%2000500W');
    // `A` marked, `B` unmarked, `C` marked, then the GM-WM.
    m.storage.setChar(500, code('A'), true);
    m.storage.setChar(501, code('B'), false);
    m.storage.setChar(502, code('C'), true);
    m.storage.setChar(503, code('⧧'), true);
    m.addressSet(100);
    m.step();
    // `translateForOutput` put a word separator (0-5-8) ahead of A and ahead of C; 0-5-8 is one
    // of the twelve codes on neither arrangement, so it prints blank — which IS the rule.
    expect(m.snapshot().printer.paper[0]?.text).toBe(' AB C');
  });

  it('the same field in MOVE mode prints without the blanks', () => {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, 'M%2000500W');
    m.storage.setChar(500, code('A'), true);
    m.storage.setChar(501, code('B'), false);
    m.storage.setChar(502, code('C'), true);
    m.storage.setChar(503, code('⧧'), true);
    m.addressSet(100);
    m.step();
    expect(m.snapshot().printer.paper[0]?.text).toBe('ABC');
  });
});

describe('the automatic single space is DEFERRED — io.md §7, plan §7.3', () => {
  it('a print ARMS it and does not perform it', () => {
    const p = new Printer1403();
    p.write('0', 'W', Uint8Array.from([code('A')]), 'move');
    expect(p.carriage).toMatchObject({ page: 1, line: 1, autoSpacePending: true });
    expect(p.paper).toEqual([{ page: 1, line: 1, text: 'A' }]);
  });

  it('ARM 1 — the next write performs it first, so the second line lands one down', () => {
    const p = new Printer1403();
    p.write('0', 'W', Uint8Array.from([code('A')]), 'move');
    p.write('0', 'W', Uint8Array.from([code('B')]), 'move');
    expect(p.paper).toEqual([
      { page: 1, line: 1, text: 'A' },
      { page: 1, line: 2, text: 'B' },
    ]);
  });

  it('ARM 2 — the next `F` CONSUMES it: one motion, not two', () => {
    const p = new Printer1403();
    p.write('0', 'W', Uint8Array.from([code('A')]), 'move');
    p.control('F', 'J');                       // immediate space 1
    expect(p.carriage, 'space 1, not the space plus the automatic one')
      .toMatchObject({ page: 1, line: 2, autoSpacePending: false });
  });

  it('a WLR write moves nothing and leaves an armed space STILL ARMED', () => {
    // OVERLONG_RECORD_SETS_WLR returns before the deferred space is performed: nothing printed,
    // so nothing spaced, and the space the LAST print earned is still owed to whatever comes next.
    const p = new Printer1403();
    p.write('0', 'W', Uint8Array.from([code('A')]), 'move');
    expect(p.carriage.autoSpacePending).toBe(true);
    const tooLong = Uint8Array.from({ length: 133 }, () => code('X'));
    expect(p.write('0', 'W', tooLong, 'move')).toEqual({ wrongLengthRecord: true });
    expect(p.paper, 'the overlong line is not printed').toEqual([{ page: 1, line: 1, text: 'A' }]);
    expect(p.carriage, 'still armed, carriage still where the print left it')
      .toMatchObject({ page: 1, line: 1, autoSpacePending: true });
    // And it is still a real arm, not a stuck flag: the next good write performs it.
    p.write('0', 'W', Uint8Array.from([code('B')]), 'move');
    expect(p.paper[1]).toEqual({ page: 1, line: 2, text: 'B' });
  });

  it('ARM 3 — `flush()` performs it: the carriage moves one line, the paper does not change', () => {
    const p = new Printer1403();
    p.write('0', 'W', Uint8Array.from([code('A')]), 'move');
    const before = p.paper.slice();
    p.flush();
    expect(p.carriage).toMatchObject({ page: 1, line: 2, autoSpacePending: false });
    expect(p.paper, 'flush prints nothing').toEqual(before);
    p.flush();
    expect(p.carriage, 'and there is nothing left to perform').toMatchObject({ line: 2 });
  });

  it('NOTHING THAT ONLY OBSERVES STATE PERFORMS IT — two snapshots are identical', () => {
    const m = machineThatPrints('A');
    m.step();
    const first = m.snapshot();
    const second = m.snapshot();
    expect(first.printer.carriage.autoSpacePending, 'armed by the print').toBe(true);
    // If a getter performed the space, the golden page would depend on how many animation frames
    // the browser drew (plan §7.3, architecture.md §2 "devices produce values, never side
    // effects"). Reading it a second time must give the same answer.
    expect(second.printer.carriage).toEqual(first.printer.carriage);
    expect(second.printer.paper).toEqual(first.printer.paper);
    m.endOfJob();
    expect(m.snapshot().printer.carriage)
      .toMatchObject({ line: 2, autoSpacePending: false });
  });
});

// ═══ oracle/io-status.json — Figures 89 and 91 ════════════════════════════

interface StatusRow {
  figure: number; page: number | string; device: string; operation: string;
  condition: string; whenSet: string; never?: boolean; sameAs?: string;
}
const IO_STATUS = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/io-status.json'), 'utf8'),
) as { conditions: readonly string[]; rows: readonly StatusRow[] };

const figure = (n: number, condition: string): StatusRow => {
  const row = IO_STATUS.rows.find((r) => r.figure === n && r.condition === condition);
  if (row === undefined) throw new Error(`oracle/io-status.json has no Figure ${n} ${condition} row`);
  return row;
};

describe('oracle/io-status.json — io.md §7 Figures 89 and 91 (A22-0526-3 pp.80-81)', () => {
  it('has all six conditions for both 1403 operations', () => {
    for (const condition of IO_STATUS.conditions) {
      expect(figure(89, condition).device, condition).toBe('1403');
      expect(figure(91, condition).device, condition).toBe('1403');
    }
  });

  it('Figure 89: WLR is "line not printed", and it is the one row a deck can reach', () => {
    expect(figure(89, 'wrongLengthRecord').whenSet).toContain('line not printed');
    const m = machineThatPrints('Z'.repeat(133));
    m.step();
    expect(m.snapshot().channel1.wrongLengthRecord).toBe(true);
    expect(m.snapshot().printer.paper).toEqual([]);
  });

  it('Figure 89: No Transfer is "never", and a Write a Line never sets it', () => {
    expect(figure(89, 'noTransfer').never).toBe(true);
    const m = machineThatPrints('A');
    m.step();
    expect(m.snapshot().channel1.noTransfer).toBe(false);
  });

  it('Figure 91: Data Check, Condition, WLR and No Transfer are "never" for a carriage op', () => {
    for (const condition of ['dataCheck', 'condition', 'wrongLengthRecord', 'noTransfer']) {
      expect(figure(91, condition).never, condition).toBe(true);
    }
    const p = new Printer1403();
    expect(p.control('F', '9'), 'step 8 sets nothing').toEqual({});
  });

  it('Figure 91: Not Ready is "same" as the write path — and only an op the 1403 lacks reaches it', () => {
    expect(figure(91, 'notReady').sameAs).toBe('write a line');
    const p = new Printer1403();
    // `K` is the 1402's select-stacker-and-feed; the routing table can never send it here, and if
    // it did the printer would answer as io.md §9 Figure 99's "no such unit" does.
    expect(p.control('K', '0')).toEqual({ notReady: true });
  });

  it('Figure 89 Data Check, Condition and Busy are STATED, NOT FAKED', () => {
    // No input this emulator accepts can produce a print-buffer parity error, a hammer-fire check
    // or a line still printing (`cycles.ts`'s I/O term is 0), and `precheck` could not express
    // "set Data Check and still print" anyway — step 6 of the nine skips the transfer whenever
    // any indicator is on. The rows are asserted as TABLE ROWS; the gap is in PHASE-2-NOTES.md §2.
    expect(figure(89, 'dataCheck').whenSet).toContain('print buffer parity error');
    expect(figure(89, 'condition').whenSet).toContain('hammer-fire check');
    expect(figure(89, 'busy').whenSet).toContain('previous line still being printed');
    const m = machineThatPrints('A');
    m.step();
    const st = m.snapshot().channel1;
    expect([st.dataCheck, st.condition, st.busy]).toEqual([false, false, false]);
  });
});

// ═══ renderGreenBar — the five rules of plan §5 ═══════════════════════════

describe('renderGreenBar — the five-rule contract (plan §5)', () => {
  it('names the chain and the form length in the header, then a blank line', () => {
    expect(renderGreenBar([], { chain: 'H', formLines: 88 }))
      .toBe('1403 Model 2 · chain H · 88-line form\n\n');
  });

  it('renders every line position up to the highest that printed, blanks included', () => {
    const paper = [
      { page: 1, line: 1, text: 'ONE' },
      { page: 1, line: 4, text: 'FOUR' },
    ];
    expect(renderGreenBar(paper, { chain: 'A', formLines: 66 }))
      .toBe('1403 Model 2 · chain A · 66-line form\n\nONE\n\n\nFOUR\n');
  });

  it('THROWS on two print lines at the same (form, line) — a gate that can lose a line is not one', () => {
    // Rule 2 renders one line per position, so a second line landing where a first printed would
    // be dropped and the byte-for-byte golden would still compare equal (plan §14 R8). The
    // wave-3 review found the silent version; this is the loud one.
    const overprinted = [
      { page: 1, line: 1, text: 'FIRST' },
      { page: 1, line: 1, text: 'SECOND' },
    ];
    expect(() => renderGreenBar(overprinted, { chain: 'A', formLines: 66 }))
      .toThrow(/two print lines at form 1, line 1/);
    // The same two lines one position apart are fine — it is the collision that throws.
    expect(() => renderGreenBar(
      [{ page: 1, line: 1, text: 'FIRST' }, { page: 1, line: 2, text: 'SECOND' }],
      { chain: 'A', formLines: 66 },
    )).not.toThrow();
  });

  it('puts a lone form feed before every form after the first, and ends every line with \\n', () => {
    const paper = [
      { page: 1, line: 1, text: 'PAGE ONE  ' },
      { page: 2, line: 2, text: 'PAGE TWO' },
    ];
    expect(renderGreenBar(paper, { chain: 'A', formLines: 66 }))
      .toBe('1403 Model 2 · chain A · 66-line form\n\nPAGE ONE\n\f\n\nPAGE TWO\n');
  });
});
