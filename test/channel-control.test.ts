// Tier 1 — `Channel.control(op, d, at)`: the nine-step sequence of io.md §5 Figure 40 run for the
// two SHORT-FORM I/O ops, `F d` and `K d`, which carry no x-control field, no B-address and no
// data (io.md §2's instruction summary; isa/table.ts `lengths: [2]`).
//
// The point of this file is the STEPS, not the 1402 — `test/reader1402.test.ts` owns the device's
// own rules. What is proved here is that a short-form op is an I/O instruction in every way that
// matters: it arms the interlock, it is a system stop if the interlock is already on, it resets
// the six indicators, it reports Not Ready for a device that is absent or cannot perform it, and
// it moves neither BAR nor a word mark (io.md §5, §6 item 5, A22-0526-3 pp.37-38, 42, 62).

import { describe, it, expect } from 'vitest';

import { bcdOfGlyph } from '../src/core/bcd.js';
import { CARRIAGE_DEVICE_X2, Channel1, STACKER_DEVICE_X2 } from '../src/core/channel.js';
import { IoInterlockStop } from '../src/core/checks.js';
import { Reader1402 } from '../src/core/devices/reader1402.js';
import { RX_RELEASE_D_GLYPH } from '../src/core/isa/dmods.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { parseDeck } from '../src/formats/card.js';
import type { Addr, ChannelStatus, Device, XControl } from '../src/core/types.js';

/** `%19` — the 1402 read feed, x3 = 9: transfer the buffer, no stack, no feed (io.md §6 step 3). */
const X_READ_NO_FEED: XControl = { channel: 1, overlap: false, deviceType: '1', unit: '9' };

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

/** A device that is present at its x2 and has no `control` method at all. */
class WriteOnlyDevice implements Device {
  constructor(readonly x2: string) {}
  readonly bits = 7 as const;
  precheck(): Partial<ChannelStatus> { return {}; }
  write(): Partial<ChannelStatus> { return {}; }
}

/** A 1402 with one card in the buffer and its image already handed over by an x3 = 9 read. */
function readyForStacking(): Reader1402 {
  const reader = new Reader1402();
  reader.loadDeck(parseDeck('ABCDE\n').deck);
  reader.readerStart();
  reader.read('9', 'R');                   // x3 = 9: transfer, no stack, no feed (io.md §6 step 3)
  return reader;
}

// ═══ Steps 2 and 5 — the interlock, on the same op list as M and L ═════════

describe('`F`/`K` are on the interlock op list (io.md §5, A22-0526-3 pp.37-38, 42)', () => {
  it('arms the interlock, and a second short-form op with no intervening `R` stops the system', () => {
    const ch = new Channel1();
    ch.devices.register(readyForStacking());
    expect(ch.interlock, 'step 5 has not run yet').toBe(false);

    ch.control('K', '0', 0);
    expect(ch.interlock, 'step 5: turn on the interlock').toBe(true);

    // "Two I/O instructions on one channel with no intervening R/X = system stop", and the op
    // list is M, L, U, F, 2, K, 4 — `K` is on it.
    expect(() => ch.control('K', '0', 0)).toThrow(IoInterlockStop);
  });

  it('a release lets the next one run', () => {
    const ch = new Channel1();
    ch.devices.register(readyForStacking());
    ch.control('K', '0', 0);
    ch.release();
    expect(() => ch.control('K', '0', 0)).not.toThrow();
  });

  it('an M/L interlock stops a `K`, and a `K` interlock stops an M/L — one latch, per channel', () => {
    const ch = new Channel1();
    ch.devices.register(readyForStacking());
    const s = new CoreStorage(10_000);

    ch.io('load', s, X_READ_NO_FEED, 200, '$', 0);
    expect(() => ch.control('K', '0', 0), 'a read then a K').toThrow(IoInterlockStop);

    ch.release();
    ch.control('K', '0', 0);
    expect(
      () => ch.io('load', s, X_READ_NO_FEED, 200, '$', 0),
      'a K then a read',
    ).toThrow(IoInterlockStop);
  });
});

// ═══ Steps 3, 4 and 6 — reset the six, then test the device ════════════════

describe('the routing table and the absent-device rule (io.md §9 Figure 99 "no such unit")', () => {
  it('routes `K` to x2 = 1 and `F` to x2 = 2 — the mapping is physical, not printed', () => {
    // OPEN: no figure prints an x2 for an op that has NO X-FIELD (plan §15). The constants carry
    // the tag; what the test can prove is that the two ops reach two different devices.
    expect(STACKER_DEVICE_X2, 'io.md §2 / §6, A22-0526-3 pp.62-63').toBe('1');
    expect(CARRIAGE_DEVICE_X2, 'io.md §2 / §7, A22-0526-3 pp.80-81').toBe('2');

    const ch = new Channel1();
    ch.devices.register(readyForStacking());          // x2 = 1 only
    ch.control('K', '0', 0);
    expect(ch.status.notReady, 'the 1402 is there and can stack').toBe(false);

    ch.release();
    // Nothing is registered at x2 = 2 on THIS bare channel, so `F` still reports Figure 99's
    // "no such unit" — which is what makes the routing visible: the two ops reached two
    // different lookups. `createMachine` registers a real 1403 there, and the instruction-level
    // test below is what proves `F` now moves a carriage.
    ch.control('F', '1', 0);
    expect(ch.status.notReady, 'nothing is registered at x2 = 2 on this channel').toBe(true);
  });

  it('a device with no `control` method is Not Ready, exactly like an absent one', () => {
    const ch = new Channel1();
    ch.devices.register(new WriteOnlyDevice(STACKER_DEVICE_X2));
    ch.control('K', '0', 0);
    expect(ch.status.notReady).toBe(true);
  });

  it('step 3 resets the six before step 4 sets any of them', () => {
    const ch = new Channel1();
    ch.status.wrongLengthRecord = true;
    ch.status.condition = true;
    ch.control('K', '0', 0);                          // no device: Not Ready and nothing else
    expect(ch.status.wrongLengthRecord, 'cleared by step 3').toBe(false);
    expect(ch.status.condition, 'cleared by step 3').toBe(false);
    expect(ch.status.notReady, 'set by step 4').toBe(true);
  });

  it('step 5 runs even when the device refuses — an unready op still arms the interlock', () => {
    // Step 5 precedes step 6 in Figure 40, so an operation that sets Not Ready and does nothing
    // else STILL leaves the channel interlocked and still owes an `R` before the next I/O.
    const ch = new Channel1();
    const reader = new Reader1402();                  // never started: Figure 62's Not Ready
    ch.devices.register(reader);
    ch.control('K', '0', 0);
    expect(ch.status.notReady).toBe(true);
    expect(ch.interlock, 'step 5 ran before step 6 skipped').toBe(true);
    expect(reader.stackers['0'], 'and nothing was stacked').toBe(0);
  });
});

// ═══ The instruction, end to end ═══════════════════════════════════════════

const CARD = 'ABCDE';
const READ_AT = 200;
const MARKED = 500;

/**
 * `L %19 00200 $` — read the buffer with no stack and no feed, `$` so the GM-WM test is
 * suppressed and no status indicator is set (io.md §3, software.md §10.4); then `R (I) ⧧` to
 * release the interlock without branching; then `K 0`, Select Stacker and Feed to pocket NR.
 */
function machineWithSsf(): Machine {
  const m = createMachine({ size: 10_000 });
  program(m.storage, 100, 'L%1900200$', `R00300${RX_RELEASE_D_GLYPH}`, 'K0');
  m.storage.setWm(MARKED, true);
  m.storage.setWm(MARKED + 1, true);
  m.loadDeck(parseDeck(`${CARD}\n`).deck);
  m.readerStart();
  m.addressSet(100);
  return m;
}

describe('`K 0` as a real instruction — io.md §6 item 5 (A22-0526-3 p.62)', () => {
  it('leaves BAR = Bp and word marks untouched', () => {
    const m = machineWithSsf();
    expect(m.step(), 'the x3 = 9 read').toBeUndefined();
    expect(m.snapshot().channel1.wrongLengthRecord, '`$` makes no correct-length check').toBe(false);
    expect(m.step(), 'the release').toBeUndefined();

    const barBefore = m.regs.bar;
    expect(m.step(), 'the SSF').toBeUndefined();

    // "Select Stacker and Feed leaves BAR = Bp (unchanged) and 'Word marks are not affected'".
    // The MECHANISM is `table.ts`'s `regs: NSI_AP_BP` on the `K` row plus an executor that
    // touches no storage — the code arranges nothing, the table does, and this asserts it.
    expect(m.regs.bar, 'BAR = Bp').toBe(barBefore);
    expect(m.storage.wm(MARKED), 'word marks are not affected').toBe(true);
    expect(m.storage.wm(MARKED + 1)).toBe(true);
    expect(m.storage.wm(READ_AT), 'nor are the ones the read did not make').toBe(false);
    expect(m.snapshot().reader.stackers['0'], 'the card went to pocket NR').toBe(1);
  });

  it('two `K` instructions with no intervening `R` are an I/O interlock stop', () => {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, 'K0', 'K0');
    m.addressSet(100);
    expect(m.step(), 'the first K runs (the reader is not started: Not Ready)').toBeUndefined();
    expect(m.snapshot().channel1.interlock).toBe(true);
    expect(m.step()).toBe('ioInterlockStop');
  });

  it('`F 1` runs and MOVES THE CARRIAGE — Phase 2 wave 3 registered the 1403 at x2 = 2', () => {
    const m = createMachine({ size: 10_000 });
    program(m.storage, 100, 'F1');
    m.addressSet(100);
    expect(m.step(), 'no stop: `F` is an ordinary short-form I/O op now').toBeUndefined();
    expect(m.snapshot().channel1.notReady, 'the 1403 is there').toBe(false);
    expect(m.snapshot().channel1.interlock, 'step 5 armed it, like any I/O').toBe(true);
    // From the power-on home position the channel-1 punch is behind the brushes, so the skip
    // ejects a form (io.md §7; devices/printer1403.ts CARRIAGE_POWER_ON_AT_CHANNEL_1_HOME).
    // The carriage rules themselves are test/printer1403.test.ts's; what this file owns is that
    // the OP reached the right device.
    expect(m.snapshot().printer.carriage).toMatchObject({ page: 2, line: 1 });
  });
});
