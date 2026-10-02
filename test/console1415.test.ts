// Tier 1 — the IBM 1415 console I/O printer as a device: what a WCP / WCPW line looks like, and
// what a read finds when no operator has asked for anything. The inquiry READ path itself lives
// in test/console-inquiry.test.ts.
// research/io.md §1 (seven- vs eight-bit), §8 (Figure 44, Figures 45-46; A22-0526-3 pp.45-49);
// research/console-and-physical.md §2 (the print-out table; A22-0526-3 Fig.42 p.46, p.49;
// S223-2648 Fig.5 p.9, p.6); docs/plans/architecture.md §2 B8.

import { describe, it, expect } from 'vitest';

import { bcdOfGlyph, glyphOf, parity } from '../src/core/bcd.js';
import { Channel1 } from '../src/core/channel.js';
import { Console1415, LOAD_MODE_BLANK_GLYPH, PROGRAM_MESSAGE_ID } from '../src/core/devices/console1415.js';
import { CoreStorage } from '../src/core/storage.js';
import { C, WM, type Addr, type XControl } from '../src/core/types.js';

const X_CONSOLE: XControl = { channel: 1, overlap: false, deviceType: 'T', unit: '0' };

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for "${glyph}"`);
  return c;
}

/** `text` at `at`, word marks at the named offsets, then the terminating GM-WM. */
function message(text: string, marks: readonly number[] = [], at: Addr = 100): CoreStorage {
  const s = new CoreStorage(10_000);
  [...text].forEach((g, i) => s.setChar(at + i, code(g), marks.includes(i)));
  s.setChar(at + text.length, code('⧧'), true);
  return s;
}

function typeIt(s: CoreStorage, mode: 'move' | 'load', at: Addr = 100): Console1415 {
  const printer = new Console1415();
  const ch = new Channel1();
  ch.devices.register(printer);
  ch.io(mode, s, X_CONSOLE, at, 'W', 0);
  return printer;
}

describe('Console1415 as a channel-1 device (io.md §1, §2)', () => {
  it('is x2 = `T` and EIGHT bits — the p.8 reading of 223-2692', () => {
    const printer = new Console1415();
    expect(printer.x2).toBe('T');
    // 223-2692 contradicts itself on p.8 vs p.9; p.8 wins because A22-0526-3 Figure 44's RCPW
    // enters word marks into storage directly from the keyboard (io.md §1, plan §10).
    expect(printer.bits).toBe(8);
  });

  it('is never Not Ready and never Busy before a transfer (io.md §8 Figures 45-46)', () => {
    expect(new Console1415().precheck()).toEqual({});
  });
});

describe('WCP — `M %T0 bbbbb W`, write without word marks (io.md §8 Figure 44)', () => {
  it('types the field up to but not including the terminating GM-WM', () => {
    const printer = typeIt(message('CC01A'), 'move');
    expect(printer.lines).toHaveLength(1);
    // Figure 44 note 3, on both WCP and WCPW: "‡ is not printed with message".
    expect(printer.lines[0]?.text).toBe('CC01A');
  });

  it('carries the program-message ID `R`, single spacing, matrix position 30', () => {
    // console-and-physical.md §2: "Console reply (program) | single | R | program message,
    // invalid chars underlined | 30"; io.md §8: "The console reply routine prints `R`, a space,
    // then data until the GMWM, then carrier return + vertical space".
    const line = typeIt(message('AB'), 'move').lines[0];
    expect(line?.id).toBe(PROGRAM_MESSAGE_ID);
    expect(line?.id).toBe('R');
    expect(line?.spacingBefore).toBe('single');
    expect(line?.matrixPos).toBe(30);
  });

  it('shows NO word marks even where core has them — move mode transfers none', () => {
    const printer = typeIt(message('CC01A', [0, 2]), 'move');
    expect(printer.lines[0]?.wordMarks).toEqual([false, false, false, false, false]);
  });

  it('prints a valid blank as a space (io.md §8, "a valid blank in storage spaces the printer")', () => {
    expect(typeIt(message('A B'), 'move').lines[0]?.text).toBe('A B');
  });
});

describe('WCPW — `L %T0 bbbbb W`, write WITH word marks (io.md §8 Figure 44)', () => {
  it('marks each word-marked character — the inverted circumflex over the character', () => {
    const printer = typeIt(message('CC01A', [0, 2]), 'load');
    expect(printer.lines[0]?.text).toBe('CC01A');
    expect(printer.lines[0]?.wordMarks).toEqual([true, false, true, false, false]);
  });

  it('prints blanks as a small `b` — the load-mode rendering only', () => {
    // console-and-physical.md §2 / A22-0526-3 p.49: "In load-mode console printing, blanks print
    // as a small `b`." The channel hands an 8-bit device the same bytes in both modes, so this
    // rendering is the device's and needs the mode.
    expect(typeIt(message('A B'), 'load').lines[0]?.text).toBe(`A${LOAD_MODE_BLANK_GLYPH}B`);
    expect(LOAD_MODE_BLANK_GLYPH).toBe('b');
  });
});

describe('the error-underscore feature (io.md §8, A22-0526-3 pp.48-49; S223-2648 p.6)', () => {
  it('underlines a bad-parity character, sets Data Check, and keeps going', () => {
    const s = new CoreStorage(10_000);
    s.setChar(100, code('A'), false);
    s.pokeRaw(101, code('B') ^ C ^ parity(code('B'), false));   // deliberately even parity
    s.setChar(102, code('C'), false);
    s.setChar(103, code('⧧'), true);

    const printer = new Console1415();
    const ch = new Channel1();
    ch.devices.register(printer);
    ch.io('move', s, X_CONSOLE, 100, 'W', 0);

    const line = printer.lines[0];
    expect(line?.text, 'the character is printed as well as underlined').toBe('ABC');
    expect(line?.underline).toEqual([false, true, false]);
    expect(ch.status.dataCheck, 'a console printer parity error sets Data Check').toBe(true);
    expect(printer.lines, 'and the reply continues — it is not a stop').toHaveLength(1);
  });

  it('underlines nothing when every character carries odd parity', () => {
    expect(typeIt(message('CC01A', [1]), 'load').lines[0]?.underline)
      .toEqual([false, false, false, false, false]);
  });
});

describe('Console1415.read — a console with nothing to say (io.md §8 Figure 45)', () => {
  it('returns null with no inquiry request, which the channel turns into No Transfer', () => {
    const printer = new Console1415();
    // Unchanged since Phase 1, and now for the reason the manual gives rather than for want of
    // an implementation: Figure 45's No Transfer row is "no message request, or Cancel before
    // inquiry" (A22-0526-3 pp.47-48), and this console has had no INQUIRY REQUEST and no typed
    // line supplied. The rest of the inquiry dialogue — the latch, the WORD MARK key, RELEASE
    // and CANCEL — is exercised in test/console-inquiry.test.ts.
    expect(printer.read()).toBeNull();

    const ch = new Channel1();
    ch.devices.register(printer);
    const s = new CoreStorage(10_000);
    expect(ch.io('move', s, X_CONSOLE, 100, 'R', 0)).toBe(0);
    expect(ch.status.noTransfer).toBe(true);
    expect(s.bcd(100), 'core untouched').toBe(bcdOfGlyph(' '));
  });
});

describe('the line is a value, not a side effect (architecture.md §2)', () => {
  it('accumulates lines oldest first and clear() empties the log', () => {
    const printer = new Console1415();
    const ch = new Channel1();
    ch.devices.register(printer);
    const s = message('ONE');
    [...'TWO'].forEach((g, i) => s.setChar(200 + i, code(g), false));
    s.setChar(203, code('⧧'), true);

    ch.io('move', s, X_CONSOLE, 100, 'W', 0);
    ch.release();
    ch.io('move', s, X_CONSOLE, 200, 'W', 0);
    expect(printer.lines.map((l) => l.text)).toEqual(['ONE', 'TWO']);

    printer.clear();
    expect(printer.lines).toHaveLength(0);
  });

  it('renders every character through the A2 glyph table', () => {
    // The 1415 prints 64 characters; `glyphOf` is the one place the mapping lives (charset.md §2).
    const printer = typeIt(message('⌒$#'), 'move');
    expect(printer.lines[0]?.text)
      .toBe([code('⌒'), code('$'), code('#')].map(glyphOf).join(''));
  });

  it('an 8-bit device receives the word-mark bit itself — no channel translation', () => {
    // io.md §3 / architecture.md B9: the translation to word separators is for SEVEN-bit devices.
    const s = message('AB', [0]);
    expect((s.read(100) & WM) !== 0).toBe(true);
    expect(typeIt(s, 'load').lines[0]?.wordMarks).toEqual([true, false]);
  });
});
