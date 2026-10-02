// Tier 1 — `Channel1`: the nine-step sequence, the interlock, the six status indicators, the
// x-control and d-character decodes, and the move/load translation in both directions.
// research/io.md §2, §3 (Figure 5, 223-2692 p.8), §4, §5 (Figure 40, Figure 36), §8;
// docs/plans/architecture.md §2 B6/B9, §9 C17; plan §5 Wave 2.
//
// Everything here runs through a FAKE device, so the transfer rules are tested independently of
// any real peripheral — which is the whole point of the channel/device seam: the channel does
// the mode translation, the device only renders (architecture.md §4.10).

import { describe, it, expect } from 'vitest';

import { bcdOfGlyph, parity } from '../src/core/bcd.js';
import {
  Channel1, GROUP_MARK, WORD_SEPARATOR, isGroupMarkWordMark, translateForOutput,
} from '../src/core/channel.js';
import { AddressCheck, InstructionCheck, IoInterlockStop, UnimplementedOp, UnsupportedFeature } from '../src/core/checks.js';
import { X2_DEVICE } from '../src/core/isa/dmods.js';
import { CoreStorage } from '../src/core/storage.js';
import {
  BCD6, WM,
  type Addr, type ChannelStatus, type Device, type IoMode, type XControl,
} from '../src/core/types.js';

// ── A fake device on either width, recording what the channel handed it ─────
class FakeDevice implements Device {
  received: Uint8Array | null = null;
  receivedMode: IoMode | null = null;

  constructor(
    readonly x2: string,
    readonly bits: 7 | 8,
    private readonly record: Uint8Array | null = null,
    private readonly status: Partial<ChannelStatus> = {},
  ) {}

  precheck(): Partial<ChannelStatus> { return this.status; }
  read(): Uint8Array | null { return this.record; }
  write(_x3: string, _d: string, data: Uint8Array, mode: IoMode): Partial<ChannelStatus> {
    this.received = data;
    this.receivedMode = mode;
    return {};
  }
}

const X_FAKE: XControl = { channel: 1, overlap: false, deviceType: '1', unit: '0' };

/** A seven-bit line character: C over BA8421, no word-mark bit to carry. */
function seven(bcd6: number): number {
  return parity(bcd6, false) | bcd6;
}
function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for "${glyph}"`);
  return c;
}

/** Write `text` into core at `at`; `marks` names the offsets that carry a word mark. */
function core(text: string, at: Addr = 100, marks: readonly number[] = []): CoreStorage {
  const s = new CoreStorage(10_000);
  [...text].forEach((g, i) => s.setChar(at + i, code(g), marks.includes(i)));
  return s;
}

/** A group-mark-with-word-mark, the transfer terminator (io.md §3). */
function groupMarkWordMark(s: CoreStorage, at: Addr): void {
  s.setChar(at, GROUP_MARK, true);
}

function channelWith(device: Device): Channel1 {
  const ch = new Channel1();
  ch.devices.register(device);
  return ch;
}

// ═══ io.md §5 — the derived CLR and the six indicators ═════════════════════

describe('the six status indicators and the derived CLR (io.md §5, 223-2692 p.42)', () => {
  it('holds CLR === !WLR by construction — never a seventh latch', () => {
    const ch = new Channel1();
    expect(ch.correctLengthRecord).toBe(true);
    ch.status.wrongLengthRecord = true;
    // 223-2692 p.42: "The two latches, WLR and CLR, must be in agreement at the end of an I-O
    // operation or a subsequent programmed test of the WLR indicator (BWL) results in a mismatch
    // between the branch latch and the no branch latch."
    expect(ch.correctLengthRecord).toBe(!ch.status.wrongLengthRecord);
    expect(ch.correctLengthRecord).toBe(false);
  });

  it('`R (I) d` tests the indicators the d-character\'s BITS name — Figure 36', () => {
    const ch = new Channel1();
    ch.status.busy = true;
    expect(ch.testStatus(0o1), 'd = 1, not ready').toBe(false);
    expect(ch.testStatus(0o2), 'd = 2, busy').toBe(true);
    expect(ch.testStatus(0o3), 'd = 3, plural test of 1+2').toBe(true);
    expect(ch.testStatus(0o77), 'd = group mark, all six').toBe(true);
    // The No Transfer d-character is the SUBSTITUTE BLANK, octal 20 — an ASCII space (octal 00)
    // has no bits and tests nothing (io.md §5 "Blank trap").
    ch.status.busy = false;
    ch.status.noTransfer = true;
    expect(ch.testStatus(0o20), 'substitute blank, A bit').toBe(true);
    expect(ch.testStatus(0o00), 'true blank tests nothing').toBe(false);
  });

  it('interrogating the indicators does not reset them; the next I/O read-out does', () => {
    const device = new FakeDevice('1', 7, null);
    const ch = channelWith(device);
    const s = new CoreStorage(10_000);
    ch.io('move', s, X_FAKE, 100, 'R', 0);
    expect(ch.status.noTransfer, 'nothing to read — Figure 36 No Transfer').toBe(true);
    expect(ch.testStatus(0o20)).toBe(true);
    expect(ch.status.noTransfer, 'the test did not reset it').toBe(true);

    ch.release();
    groupMarkWordMark(s, 100);
    ch.io('move', s, X_FAKE, 100, 'W', 0);
    expect(ch.status.noTransfer, 'step 3 of the nine reset it').toBe(false);
  });
});

// ═══ io.md §5 Figure 40 — the nine steps ═══════════════════════════════════

describe('the nine-step sequence (io.md §5 Figure 40, A22-0526-3 pp.42-43)', () => {
  it('step 5 sets the interlock and step 2 stops the system on the next I/O', () => {
    const ch = channelWith(new FakeDevice('1', 7));
    const s = core('AB');
    groupMarkWordMark(s, 102);
    expect(ch.interlock).toBe(false);
    ch.io('move', s, X_FAKE, 100, 'W', 0);
    expect(ch.interlock, 'step 5').toBe(true);
    expect(() => ch.io('move', s, X_FAKE, 100, 'W', 0)).toThrow(IoInterlockStop);
  });

  it('release() clears it — the only two things that do are R-branch and R (I) group mark', () => {
    const ch = channelWith(new FakeDevice('1', 7));
    const s = core('AB');
    groupMarkWordMark(s, 102);
    ch.io('move', s, X_FAKE, 100, 'W', 0);
    ch.release();
    expect(ch.interlock).toBe(false);
    expect(() => ch.io('move', s, X_FAKE, 100, 'W', 0)).not.toThrow();
  });

  it('step 4: no device at that x2 is Not Ready — "no such unit" (io.md §9 Figure 99)', () => {
    const ch = channelWith(new FakeDevice('T', 8));
    const s = core('AB');
    groupMarkWordMark(s, 102);
    const lb = ch.io('move', s, { ...X_FAKE, deviceType: '1' }, 100, 'W', 0);
    expect(ch.status.notReady).toBe(true);
    expect(lb, 'step 6: skipped, nothing transferred').toBe(0);
    expect(ch.interlock, 'step 5 happens before step 6 — the interlock is still set').toBe(true);
  });

  it('step 6: an indicator set by the pre-transfer test skips the execution', () => {
    const device = new FakeDevice('1', 7, null, { busy: true });
    const ch = channelWith(device);
    const s = core('AB');
    groupMarkWordMark(s, 102);
    expect(ch.io('move', s, X_FAKE, 100, 'W', 0)).toBe(0);
    expect(device.received, 'no data reached the device').toBeNull();
  });
});

// ═══ io.md §2 / §4 — the x-control field ═══════════════════════════════════

describe('decodeX — the x-control field (io.md §2, opcodes.md §6.5)', () => {
  const ch = new Channel1();

  it('`%` is channel 1, non-overlap', () => {
    expect(ch.decodeX('%', 'T', '0', 0)).toEqual({
      channel: 1, overlap: false, deviceType: 'T', unit: '0',
    });
  });

  // The OVERLAP bit is tested before the channel number, so both overlap glyphs stop the system:
  // io.md §4's rule belongs to the missing feature, not to the channel. Plan §1 and
  // architecture.md §12 name `@` and `*` together.
  it.each(['@', '*'])('`%s` asks for an overlap this machine has no feature for — a system stop (io.md §4)', (x1) => {
    // "An overlapped instruction on a machine without the overlap feature stops the system."
    expect(() => ch.decodeX(x1, 'T', '0', 0)).toThrow(UnsupportedFeature);
  });

  it('`⌑` selects channel 2 without overlap — a Phase-1 scope gap, not a system stop (io.md §1)', () => {
    expect(() => ch.decodeX('⌑', 'T', '0', 0)).toThrow(UnimplementedOp);
  });

  it.each(['?', '!', '$'])('`%s` is a 7010 channel selector, not a 1410 feature', (x1) => {
    // io.md §2 "SimH caution": the 7010 decodes four channels; the 1410 has two. SimH's fourth
    // glyph, `=`, is not a BCD code at all and has no `X1_CHANNEL` row (`dmods.ts`); an x1 the
    // table does not name falls to the generic undefined-character check, tested below.
    expect(() => ch.decodeX(x1, 'T', '0', 0)).toThrow(InstructionCheck);
  });

  it('an x1 glyph outside the table is an instruction check', () => {
    expect(() => ch.decodeX('#', 'T', '0', 0)).toThrow(/undefined x-control channel character/);
  });

  it('every x2 of Figure 107 decodes; a glyph outside it is an instruction check', () => {
    // OPEN (channel.ts `decodeX`): no manual states an x2 validity check. A glyph that names no
    // device CLASS is treated as the I ring treats an undecodable modifier — nothing executes.
    for (const row of X2_DEVICE) {
      expect(ch.decodeX('%', row.glyph, '0', 0).deviceType, row.device).toBe(row.glyph);
    }
    expect(() => ch.decodeX('%', 'W', '0', 0)).toThrow(InstructionCheck);
    expect(() => ch.decodeX('%', 'W', '0', 0)).toThrow(/undefined x-control device character/);
  });

  it('an x2 that IS a device class but has nothing attached is Not Ready, not a check', () => {
    // The distinction the check above rests on — io.md §9 Figure 99, "no such unit".
    const empty = new Channel1();
    expect(empty.decodeX('%', '2', '0', 0).deviceType, 'the 1403 decodes fine').toBe('2');
    empty.io('move', new CoreStorage(10_000), { ...X_FAKE, deviceType: '2' }, 100, 'W', 0);
    expect(empty.status.notReady).toBe(true);
  });
});

// ═══ architecture.md §9 C17 — the d-character ══════════════════════════════

describe('decodeD — direction and the C17 `$` ruling (opcodes.md §6.5)', () => {
  const ch = new Channel1();

  it('`W` writes and `R` reads, both honouring the GM-WM test', () => {
    expect(ch.decodeD('W', 0)).toEqual({ d: 'W', direction: 'write', suppressGroupMarkTest: false });
    expect(ch.decodeD('R', 0)).toEqual({ d: 'R', direction: 'read', suppressGroupMarkTest: false });
  });

  it('`$` and `X` are the end-of-core class, decoded HERE — before device dispatch', () => {
    // architecture.md §9 C17, ruled 2026-08-30 on C28-0351-5 p.8 Table II: `$` is legal on a
    // CARD read and is decoded at channel level. This decode is the one place that moves if the
    // ruling is overturned.
    expect(ch.decodeD('$', 0)).toEqual({ d: '$', direction: 'read', suppressGroupMarkTest: true });
    expect(ch.decodeD('X', 0)).toEqual({ d: 'X', direction: 'write', suppressGroupMarkTest: true });
  });

  it('`Q` / `V` are the Priority feature\'s I/O NOPs — not this configuration', () => {
    expect(() => ch.decodeD('Q', 0)).toThrow(UnimplementedOp);
  });

  it('a d-character outside the table is an Instruction Check (OPEN — see channel.ts)', () => {
    expect(() => ch.decodeD('Z', 0)).toThrow(InstructionCheck);
  });
});

// ═══ io.md §3 — the OUTPUT side ════════════════════════════════════════════

describe('output: the record ends at, and excludes, the GM-WM (io.md §3, §8)', () => {
  it('gathers up to but not including the terminating group-mark-with-word-mark', () => {
    const device = new FakeDevice('1', 7);
    const ch = channelWith(device);
    const s = core('CC01A');
    groupMarkWordMark(s, 105);
    const lb = ch.io('move', s, X_FAKE, 100, 'W', 0);
    expect(lb, 'LB counts CORE positions, so BAR = B + LB + 1 lands past the GM-WM').toBe(5);
    expect(device.received).toHaveLength(5);
    // Figure 44 note 3, on both WCP and WCPW: "‡ is not printed with message".
    expect([...(device.received ?? [])].map((b) => b & BCD6)).not.toContain(GROUP_MARK);
  });

  it('a group mark WITHOUT a word mark is data, not a terminator', () => {
    const device = new FakeDevice('1', 7);
    const ch = channelWith(device);
    const s = new CoreStorage(10_000);
    s.setChar(100, code('A'), false);
    s.setChar(101, GROUP_MARK, false);        // group mark, no word mark
    s.setChar(102, code('B'), false);
    groupMarkWordMark(s, 103);
    expect(ch.io('move', s, X_FAKE, 100, 'W', 0)).toBe(3);
    expect(isGroupMarkWordMark(s.read(101))).toBe(false);
  });

  it('runs off the top of core as an address check when no GM-WM is ever found', () => {
    const ch = channelWith(new FakeDevice('1', 7));
    const s = new CoreStorage(10_000);
    expect(() => ch.io('move', s, X_FAKE, 9_990, 'W', 0)).toThrow(AddressCheck);
  });

  it('sets no wrong-length-record: the core field defines the record (io.md §8 Figures 45-46)', () => {
    const ch = channelWith(new FakeDevice('1', 7));
    const s = core('AB');
    groupMarkWordMark(s, 102);
    ch.io('load', s, X_FAKE, 100, 'W', 0);
    expect(ch.status.wrongLengthRecord).toBe(false);
    expect(ch.correctLengthRecord).toBe(true);
  });
});

// The Figure 5 worked example, output side (223-2692 p.8, io.md §3): core `A(wm) B(wm) WS C`
// punches as `A B WS C` in move mode and `WS A WS B WS WS C` in load mode.
describe('output translation, io.md §3 p.41 / architecture.md B9', () => {
  const FIGURE_5_CORE = (): CoreStorage => {
    const s = new CoreStorage(10_000);
    s.setChar(100, code('A'), true);
    s.setChar(101, code('B'), true);
    s.setChar(102, WORD_SEPARATOR, false);
    s.setChar(103, code('C'), false);
    groupMarkWordMark(s, 104);
    return s;
  };

  it('move mode sends no word marks and passes separators through unchanged', () => {
    const device = new FakeDevice('1', 7);
    const ch = channelWith(device);
    expect(ch.io('move', FIGURE_5_CORE(), X_FAKE, 100, 'W', 0)).toBe(4);
    expect([...(device.received ?? [])]).toEqual(
      [code('A'), code('B'), WORD_SEPARATOR, code('C')].map(seven),
    );
  });

  it('load mode to a 7-BIT device: WM → separator one position AHEAD, separator → two', () => {
    const device = new FakeDevice('1', 7);
    const ch = channelWith(device);
    // "core `A(wm) B(wm) WS C` … punches as `WS A WS B WS WS C` in load mode" — the record
    // LENGTHENS, 4 core positions to 7 (io.md §3 Figure 5, A22-0526-3 pp.40-41).
    expect(ch.io('load', FIGURE_5_CORE(), X_FAKE, 100, 'W', 0)).toBe(4);
    expect([...(device.received ?? [])]).toEqual([
      WORD_SEPARATOR, code('A'), WORD_SEPARATOR, code('B'),
      WORD_SEPARATOR, WORD_SEPARATOR, code('C'),
    ].map(seven));
  });

  it('load mode to an 8-BIT device: no translation, the WM bits go over intact', () => {
    const device = new FakeDevice('1', 8);
    const ch = channelWith(device);
    ch.io('load', FIGURE_5_CORE(), X_FAKE, 100, 'W', 0);
    const got = [...(device.received ?? [])];
    expect(got).toHaveLength(4);
    expect(got.map((b) => (b & WM) !== 0), 'the 1415 renders these itself — io.md §8 Figure 44')
      .toEqual([true, true, false, false]);
  });

  it('move mode drops the word mark by FLIPPING the check bit, not by regenerating it', () => {
    // The word mark participates in parity (A22-0526-3 p.5), so a character that loses it must
    // have its C bit inverted — the same rule storage.setWm follows. Regenerating instead would
    // launder a genuine core parity error and the device could never underline it (io.md §8).
    const marked = WM | parity(code('A'), true) | code('A');
    const [out] = translateForOutput('move', 7, [marked]);
    expect(out).toBe(seven(code('A')));
    // ... and a core cell that was ALREADY parity-invalid stays invalid across the drop.
    const [bad] = translateForOutput('move', 7, [WM | code('A')]);
    expect(bad).not.toBe(seven(code('A')));
  });
});

// ═══ io.md §3 — the INPUT side, 223-2692 p.58 + Figure 5 ═══════════════════

describe('input: Figure 5 word-separator processing (223-2692 p.8, io.md §3)', () => {
  /** Card columns 1-7 of the figure: `WS A WS B WS WS C`, off a seven-bit device. */
  const FIGURE_5_RECORD = Uint8Array.from(
    [WORD_SEPARATOR, code('A'), WORD_SEPARATOR, code('B'),
      WORD_SEPARATOR, WORD_SEPARATOR, code('C')].map(seven),
  );

  it('load mode stores `A(wm) B(wm) WS C` in FOUR positions', () => {
    const ch = channelWith(new FakeDevice('1', 7, FIGURE_5_RECORD));
    const s = new CoreStorage(10_000);
    groupMarkWordMark(s, 104);                 // a correct-length read ends exactly here
    const lb = ch.io('load', s, X_FAKE, 100, 'R', 0);

    // "Length check: 7 columns − 2 stored word marks − 1 stored word separator = 4 core
    // positions" (io.md §3 Figure 5 table).
    expect(lb).toBe(4);
    expect([100, 101, 102, 103].map((a) => s.bcd(a)))
      .toEqual([code('A'), code('B'), WORD_SEPARATOR, code('C')]);
    expect([100, 101, 102, 103].map((a) => s.wm(a))).toEqual([true, true, false, false]);
    expect(ch.status.wrongLengthRecord, 'the GM-WM was exactly where it belonged').toBe(false);
    expect(ch.correctLengthRecord).toBe(true);
  });

  it('load mode REPLACES the whole byte: an existing word mark is erased', () => {
    // 223-2692 p.58: "In load mode operation, existing word marks in the input field are
    // removed." Figure 5 p.8 annotates the same path "Existing Word Marks Are Erased".
    const ch = channelWith(new FakeDevice('1', 7, Uint8Array.from([seven(code('A'))])));
    const s = new CoreStorage(10_000);
    s.setChar(100, code('9'), true);
    groupMarkWordMark(s, 101);
    ch.io('load', s, X_FAKE, 100, 'R', 0);
    expect(s.bcd(100)).toBe(code('A'));
    expect(s.wm(100), 'erased, not OR-ed').toBe(false);
  });

  it('move mode stores all seven columns and adds NO word mark to the first character', () => {
    // Ledger `move-first-wm` (plan §10): SimH forces a word mark onto the first character of a
    // move-mode input record; 223-2692 p.58 and Figure 5 say move mode adds none at all.
    const ch = channelWith(new FakeDevice('1', 7, FIGURE_5_RECORD));
    const s = new CoreStorage(10_000);
    groupMarkWordMark(s, 107);
    expect(ch.io('move', s, X_FAKE, 100, 'R', 0)).toBe(7);
    expect(s.wm(100), 'move-first-wm: no word mark on the first character').toBe(false);
    expect([100, 101, 102, 103, 104, 105, 106].map((a) => s.wm(a)))
      .toEqual([false, false, false, false, false, false, false]);
    expect(s.bcd(102), 'separators are stored as ordinary data').toBe(WORD_SEPARATOR);
  });

  it('move mode leaves an existing word mark undisturbed', () => {
    const ch = channelWith(new FakeDevice('1', 7, Uint8Array.from([seven(code('A'))])));
    const s = new CoreStorage(10_000);
    s.setChar(100, code('9'), true);
    groupMarkWordMark(s, 101);
    ch.io('move', s, X_FAKE, 100, 'R', 0);
    expect(s.bcd(100)).toBe(code('A'));
    expect(s.wm(100), '"existing word marks in the input field are undisturbed"').toBe(true);
  });

  it('a GM-WM in core suppresses the store and ends the transfer, setting WLR', () => {
    // 223-2692 p.59: the target position is read out onto the B-channel before the store, and a
    // GM-WM there suppresses the store gate — so it survives and terminates the transfer.
    const ch = channelWith(new FakeDevice('1', 7, FIGURE_5_RECORD));
    const s = new CoreStorage(10_000);
    groupMarkWordMark(s, 102);
    const lb = ch.io('load', s, X_FAKE, 100, 'R', 0);
    expect(lb).toBe(2);
    expect(isGroupMarkWordMark(s.read(102)), 'regenerated unchanged').toBe(true);
    expect(ch.status.wrongLengthRecord).toBe(true);
    expect(ch.correctLengthRecord).toBe(false);
  });

  it('the extra E-cycle sets WLR when the position past the record is not a GM-WM', () => {
    // 223-2692 p.42: after external end of transfer an extra E-cycle tests the B-channel for a
    // GM-WM; finding one blocks the WLR latch, and anything else sets it.
    const ch = channelWith(new FakeDevice('1', 7, Uint8Array.from([seven(code('A'))])));
    const s = new CoreStorage(10_000);
    groupMarkWordMark(s, 105);                 // too far right
    expect(ch.io('load', s, X_FAKE, 100, 'R', 0)).toBe(1);
    expect(ch.status.wrongLengthRecord).toBe(true);
  });

  it('a device with nothing to send sets No Transfer and stores nothing', () => {
    const ch = channelWith(new FakeDevice('1', 7, null));
    const s = new CoreStorage(10_000);
    expect(ch.io('move', s, X_FAKE, 100, 'R', 0)).toBe(0);
    expect(ch.status.noTransfer).toBe(true);
    expect(ch.status.wrongLengthRecord, 'nothing was transferred to be the wrong length')
      .toBe(false);
  });
});
