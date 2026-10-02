// Tier 1 — the IBM 1415 inquiry READ path: research/io.md §8's six numbered steps as six named
// tests, Figure 45 row for row, and Figure 44's RCP/RCPW pair.
// Sources: research/io.md §8 (A22-0526-3 pp.45-49, Figures 44, 45, 46), §1 (seven- vs eight-bit),
// §3 (the load-mode store rules); research/console-and-physical.md §2 (the print-out table and
// the key map); docs/plans/phase-2-unit-record.md §6, §7.4, §15.
//
// **Everything runs through the REAL channel**, because that is where most of the inquiry lives:
// plan §6 says of this path "No console code", and it is right — Figure 44's word-mark gating and
// all three of step 5's wrong-length sentences are `channel.ts` behaviour that Phase 1 already
// built. The tests are written to fail if that stops being true.
//
// The machine-level half — `J (I) Q` (BNQ), `MachineState`, PROGRAM RESET dropping the latch — is
// wave 4b. Where a step needs it, the test asserts the device's own `pendingRequest` and says so.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { CARRIAGE_NEVER_BUSY, Channel1 } from '../src/core/channel.js';
import {
  Console1415, INQUIRY_MESSAGE_ID, type InquiryEntry,
} from '../src/core/devices/console1415.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { CoreStorage } from '../src/core/storage.js';
import { WM, type Addr, type IoMode, type XControl } from '../src/core/types.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** io.md §2 Figure 107 / §8 Figure 44: `%T0`, and the console is channel 1 only. */
const X_CONSOLE: XControl = { channel: 1, overlap: false, deviceType: 'T', unit: '0' };
const B = 100;

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

const entry = (
  text: string,
  opts: { marks?: readonly number[]; ending?: 'release' | 'cancel' } = {},
): InquiryEntry => ({
  text,
  wordMarks: [...text].map((_, i) => opts.marks?.includes(i) === true),
  ending: opts.ending ?? 'release',
});

interface Rig { s: CoreStorage; ch: Channel1; dev: Console1415 }

/**
 * A console on channel 1, and a receiving area with ONE pre-placed group-mark-word-mark at
 * `B + fieldLength` — io.md §8 step 5: "the next position must hold a previously inserted GMWM".
 * That GM-WM is the whole wrong-length mechanism; nothing here counts characters.
 */
function rig(fieldLength: number): Rig {
  const s = new CoreStorage(10_000);
  s.setChar(B + fieldLength, code('⧧'), true);
  const dev = new Console1415();
  const ch = new Channel1();
  ch.devices.register(dev);
  return { s, ch, dev };
}

/** `M or L %T0 bbbbb R` — RCP / RCPW (io.md §8 Figure 44). Returns LB. */
const rcp = (r: Rig, mode: IoMode): number => r.ch.io(mode, r.s, X_CONSOLE, B, 'R', 0);

/** The 64-set text stored from `at`, as glyphs, for a readable failure message. */
function stored(s: CoreStorage, length: number, at: Addr = B): string {
  let out = '';
  for (let i = 0; i < length; i++) out += glyphOf(s.bcd(at + i));
  return out;
}

// ═══ io.md §8's inquiry sequence, its six numbered steps ═══════════════════

describe('io.md §8 inquiry sequence — the six numbered steps (A22-0526-3 pp.46-48)', () => {
  it('step 1 — INQUIRY REQUEST sets the inquiry status latch in the 1411', () => {
    const r = rig(3);
    expect(r.dev.pendingRequest, 'nothing pending on a quiet console').toBe(false);
    // console-and-physical.md §2: the key is the repurposed Carrier Return lever.
    r.dev.requestInquiry();
    expect(r.dev.pendingRequest).toBe(true);
    r.dev.requestInquiry();
    expect(r.dev.pendingRequest, 'pressing a latch that is already on').toBe(true);
  });

  it('step 2 — the latch is what `J iiiii Q` (BNQ) tests, and the read clears it', () => {
    // OPEN: CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH. io.md §8 contradicts itself about whether
    // BNQ tests the console key's latch or a separate remote one; step 2's reading (ONE latch)
    // is the ruling, and it is the only one that gives a demonstrable inquiry path here.
    //
    // **The BRANCH arrives in wave 4b** — `Channel.inquiryRequest` reads `pendingRequest`,
    // `isa/dmods.ts` flips the `J (I) Q` row to available and `isa/exec/branch.ts` wires it — so
    // what this test can assert is the latch itself, which is the thing BNQ will read.
    const r = rig(3);
    r.dev.requestInquiry();
    r.dev.supply(entry('ABC'));
    expect(r.dev.pendingRequest, 'BNQ would branch here').toBe(true);

    rcp(r, 'move');
    expect(r.dev.pendingRequest, 'the read that services the request clears it').toBe(false);
    expect(r.dev.entry, 'and consumes the message').toBeUndefined();
  });

  it('step 3 — the console prints `I`, a space, and unlocks the keyboard', () => {
    const r = rig(3);
    r.dev.requestInquiry();
    r.dev.supply(entry('ABC'));
    expect(r.dev.lines, 'nothing is typed until the program reads').toHaveLength(0);

    rcp(r, 'move');
    const line = r.dev.lines[0];
    expect(r.dev.lines).toHaveLength(1);
    expect(line?.id, 'the ID character is not inside `text`').toBe(INQUIRY_MESSAGE_ID);
    expect(line?.text).toBe('ABC');
    // console-and-physical.md §2's print-out table: "Console inquiry | single | I |
    // operator-typed message | 30" (S223-2648 Fig.5 p.9).
    expect(line?.spacingBefore).toBe('single');
    expect(line?.matrixPos).toBe(30);
  });

  it('step 4 — the WORD MARK key enters the mark WITH the character it precedes', () => {
    // "The Word Mark key prints a word mark then backspaces; the next key entered enters both
    // the word mark and the character (load-mode read only)" (io.md §8 step 4). The device hands
    // the marks over unconditionally — they ride the record on this, the one eight-bit device
    // (io.md §1) — and the CHANNEL decides whether they reach core. That is Figure 44's RCP /
    // RCPW pair, asserted in both directions below.
    const r = rig(3);
    r.dev.requestInquiry();
    r.dev.supply(entry('ABC', { marks: [0, 2] }));
    const record = r.dev.read();
    expect(record).not.toBeNull();
    expect([...(record as Uint8Array)].map((c) => (c & WM) !== 0)).toEqual([true, false, true]);
  });

  it('step 5 — RELEASE at the correct count completes the record; the GM-WM is still there', () => {
    const r = rig(3);
    r.dev.requestInquiry();
    r.dev.supply(entry('ABC'));

    expect(rcp(r, 'move'), 'LB = 3 core positions').toBe(3);
    expect(stored(r.s, 3)).toBe('ABC');
    // "the next position must hold a previously inserted GMWM" — read out, tested, regenerated.
    expect(r.s.bcd(B + 3)).toBe(code('⧧'));
    expect(r.s.wm(B + 3)).toBe(true);
    expect(r.ch.status.wrongLengthRecord, 'the correct count sets no WLR').toBe(false);
  });

  it('step 6 — CANCEL during the message sets Condition, and the message is not stored', () => {
    const r = rig(3);
    r.dev.requestInquiry();
    r.dev.supply(entry('AB', { ending: 'cancel' }));

    expect(rcp(r, 'move'), 'step 6 of the nine skips the transfer').toBe(0);
    expect(r.ch.status.condition, 'Figure 45: "Cancel key during inquiry"').toBe(true);
    expect(r.s.bcd(B), 'core untouched').toBe(code(' '));
    expect(r.dev.lines, 'a cancelled message is never typed as an `I` line').toHaveLength(0);
    expect(r.dev.entry, 'the instruction that reports it consumes it').toBeUndefined();
    expect(r.dev.pendingRequest, 'and the request has been serviced').toBe(false);
  });
});

// ═══ Figure 45, row for row, through the real channel ══════════════════════

describe('io.md §8 Figure 45 — the console READ status table, row by row', () => {
  it('WLR: an early RELEASE sets it and the program continues', () => {
    // "Releasing early sets WLR and the program continues" (io.md §8 step 5). The mechanism is
    // the extra E-cycle of 223-2692 p.42: core[BAR] is not the GM-WM, so WLR is not blocked.
    const r = rig(3);
    r.dev.requestInquiry();
    r.dev.supply(entry('AB'));

    expect(rcp(r, 'move')).toBe(2);
    expect(stored(r.s, 2)).toBe('AB');
    expect(r.ch.status.wrongLengthRecord).toBe(true);
    expect(r.s.bcd(B + 3), 'the GM-WM was never reached').toBe(code('⧧'));
  });

  it('WLR: excess characters run into the GM-WM, whose store gate ends the transfer', () => {
    // "Excess characters are not accepted; pressing Release or Cancel then also sets WLR."
    const r = rig(3);
    r.dev.requestInquiry();
    r.dev.supply(entry('ABCDE'));

    expect(rcp(r, 'move'), 'three positions stored, then core said stop').toBe(3);
    expect(stored(r.s, 3)).toBe('ABC');
    expect(r.s.bcd(B + 3), 'the GM-WM is regenerated, never overwritten').toBe(code('⧧'));
    expect(r.s.wm(B + 3)).toBe(true);
    expect(r.s.bcd(B + 4), 'D and E are simply not accepted').toBe(code(' '));
    expect(r.ch.status.wrongLengthRecord).toBe(true);
  });

  it('No Transfer: no message request', () => {
    const r = rig(3);
    expect(rcp(r, 'move')).toBe(0);
    // Figure 45: "No Transfer — no message request, or Cancel before inquiry" (pp.47-48).
    expect(r.ch.status.noTransfer).toBe(true);
    expect(r.dev.lines).toHaveLength(0);
    expect(r.s.bcd(B), 'core untouched').toBe(code(' '));
  });

  it('No Transfer: CANCEL before any character is entered', () => {
    const r = rig(3);
    r.dev.requestInquiry();
    r.dev.supply(entry('', { ending: 'cancel' }));

    expect(rcp(r, 'move')).toBe(0);
    expect(r.ch.status.noTransfer).toBe(true);
    expect(r.ch.status.condition, 'zero characters is No Transfer, NOT Condition').toBe(false);
    // "Cancel before the request is recognized resets the latch" (io.md §8 step 6).
    expect(r.dev.pendingRequest).toBe(false);
    expect(r.dev.entry).toBeUndefined();
  });

  it('a second read with no new request is back to No Transfer', () => {
    const r = rig(3);
    r.dev.requestInquiry();
    r.dev.supply(entry('ABC'));
    rcp(r, 'move');
    r.ch.release();          // io.md §5: the interlock needs its intervening `R` status test

    expect(rcp(r, 'move')).toBe(0);
    expect(r.ch.status.noTransfer).toBe(true);
    expect(r.dev.lines, 'and the console types nothing the second time').toHaveLength(1);
  });

  it('Not Ready and Busy are "never" on a console read, in every case above', () => {
    const r = rig(3);
    r.dev.requestInquiry();
    r.dev.supply(entry('ABC'));
    rcp(r, 'move');
    expect(r.ch.status.notReady).toBe(false);
    expect(r.ch.status.busy).toBe(false);
    // And with nothing pending at all — `precheck` is the only thing that could set either.
    expect(new Console1415().precheck()).toEqual({});
  });

  it('Condition is a READ row: a program WRITE never sees the cancelled inquiry', () => {
    // Figure 46 prints Condition as "never" for a console write, and step 4 of the nine runs on
    // both paths (io.md §5) — so `precheck` has to tell the two columns apart by d-character.
    const r = rig(3);
    r.dev.requestInquiry();
    r.dev.supply(entry('AB', { ending: 'cancel' }));
    [...'HI'].forEach((g, i) => r.s.setChar(200 + i, code(g), false));
    r.s.setChar(202, code('⧧'), true);

    r.ch.io('move', r.s, X_CONSOLE, 200, 'W', 0);
    expect(r.ch.status.condition, 'Figure 46: never').toBe(false);
    expect(r.dev.lines[0]?.text, 'the WCP reply went out normally').toBe('HI');
    expect(r.dev.entry, 'and the operator\'s cancelled message is still queued').toBeDefined();
  });

  it('`$` reads too, and the cancelled message is not delivered on that path either', () => {
    // **`precheck` is a whitelist of one, and `R` is not the only d-character that reads.**
    // `channel.decodeD` puts `$` on the read direction as well (`d === 'R' || d === '$'`, the §9
    // C17 ruling), so `M %T0 00100 $` walks straight past the Condition precheck. The thing that
    // must NOT follow is a program being handed a message the operator cancelled, and what stops
    // it is `read()` itself: the device refuses every cancelled entry, whatever asked for it.
    //
    // **Where Condition lands on this path, and our reading of it.** Nowhere — and that is a
    // deliberate divergence, stated rather than hidden. Figure 45 has ONE read column and the
    // manual knows ONE console read d-character, `R`; "Condition — Cancel key during inquiry"
    // (A22-0526-3 pp.47-48) is served at step 4 on that path, which the step-6 test above pins.
    // `$` on a CONSOLE read is our own extension of the C17 ruling and no manual describes it, so
    // the only indicator this path can report is the one `read()`'s return type can express: it
    // answers `null` and `channel.read()` turns that into **No Transfer**, not Condition.
    // Widening the whitelist to `$` would report Condition here instead, at the cost of a gate
    // that no longer keeps Figure 46's write column ("Condition: never") structurally safe.
    // What holds on BOTH paths is the half io.md §8 step 6 actually rules on: the cancelled
    // message is not transferred, the entry is consumed, and the latch drops.
    const r = rig(3);
    r.dev.requestInquiry();
    r.dev.supply(entry('AB', { ending: 'cancel' }));

    expect(r.ch.io('move', r.s, X_CONSOLE, B, '$', 0), 'LB = 0, nothing transferred').toBe(0);
    expect(r.s.bcd(B), 'the cancelled message did NOT reach core').toBe(code(' '));
    expect(r.s.bcd(B + 1)).toBe(code(' '));
    expect(r.dev.lines, 'and it is never typed as an `I` line').toHaveLength(0);
    expect(r.ch.status.noTransfer, 'the indicator this path can express').toBe(true);
    expect(r.ch.status.condition, 'precheck was skipped for `$` — see above').toBe(false);
    // The request has been serviced, not left standing: entry and latch both gone.
    expect(r.dev.entry).toBeUndefined();
    expect(r.dev.pendingRequest).toBe(false);
  });
});

// ═══ Figure 44 — the RCP / RCPW pair over the SAME typed message ═══════════

describe('io.md §8 Figure 44 — RCP leaves word marks alone, RCPW erases and enters them', () => {
  /** The same message both times: `AB` with the WORD MARK key pressed before `A`. */
  const typed = entry('AB', { marks: [0] });

  /** The same core both times: a mark already sitting on the SECOND position. */
  function withExistingMark(): Rig {
    const r = rig(2);
    r.s.setChar(B, code(' '), false);
    r.s.setChar(B + 1, code(' '), true);
    r.dev.requestInquiry();
    r.dev.supply(typed);
    return r;
  }

  it('RCP (`M %T0 bbbbb R`) — "word marks in storage are undisturbed"', () => {
    const r = withExistingMark();
    expect(rcp(r, 'move')).toBe(2);

    expect(stored(r.s, 2)).toBe('AB');
    expect([r.s.wm(B), r.s.wm(B + 1)], 'core’s own marks, exactly as they were')
      .toEqual([false, true]);
  });

  it('RCPW (`L %T0 bbbbb R`) — "word marks in storage are erased and entered"', () => {
    const r = withExistingMark();
    expect(rcp(r, 'load')).toBe(2);

    expect(stored(r.s, 2)).toBe('AB');
    // The typed mark is entered on position 0 and the pre-existing one on position 1 is ERASED —
    // load mode replaces the whole byte, word-mark bit included (223-2692 p.11 Case 2, io.md §3).
    expect([r.s.wm(B), r.s.wm(B + 1)]).toEqual([true, false]);
  });

  it('the gating is the CHANNEL’s: the device returns the same record either way', () => {
    // io.md §8 step 4's "(load-mode read only)" is `channel.read()`'s
    // `device.bits === 8 && (byte & WM) !== 0`, not a test inside the 1415 (plan §6, §7.4).
    const a = new Console1415();
    const b = new Console1415();
    a.supply(typed);
    b.supply(typed);
    expect([...(a.read() as Uint8Array)]).toEqual([...(b.read() as Uint8Array)]);
  });
});

// ═══ oracle/io-status.json — Figures 45 and 46 ═════════════════════════════

interface StatusRow {
  figure: number; page: number | string; device: string; operation: string;
  condition: string; whenSet: string; never?: boolean;
}
const IO_STATUS = JSON.parse(
  readFileSync(join(REPO_ROOT, 'oracle/io-status.json'), 'utf8'),
) as { conditions: readonly string[]; rows: readonly StatusRow[] };

const row = (figure: number, condition: string): StatusRow => {
  const found = IO_STATUS.rows.find((r) => r.figure === figure && r.condition === condition);
  if (found === undefined) throw new Error(`no Figure ${figure} ${condition} row`);
  return found;
};

describe('oracle/io-status.json — Figures 45 and 46, the 1415 (A22-0526-3 pp.47-49)', () => {
  it('carries all six conditions for the read and for the write', () => {
    for (const figure of [45, 46]) {
      const rows = IO_STATUS.rows.filter((r) => r.figure === figure);
      expect(rows.map((r) => r.condition), `Figure ${figure}`).toEqual([...IO_STATUS.conditions]);
      for (const r of rows) {
        expect(r.device).toBe('1415');
        expect(r.page).toBe('47-49');
      }
    }
  });

  it('Figure 45: Not Ready and Busy are never; the other four are the four tests above', () => {
    expect(row(45, 'notReady').never).toBe(true);
    expect(row(45, 'busy').never).toBe(true);
    expect(row(45, 'condition').whenSet).toBe('Cancel key during inquiry');
    expect(row(45, 'wrongLengthRecord').whenSet).toContain('early Release / excess characters');
    expect(row(45, 'noTransfer').whenSet).toBe('no message request, or Cancel before inquiry');
    // Data Check — "input character validity error" — is unreachable: an InquiryEntry is built
    // from the Selectric's 64 characters by construction (console1415.ts's refusal comment).
    expect(row(45, 'dataCheck').whenSet).toBe('input character validity error');
  });

  it('Figure 46: the WRITE column prints Condition, WLR and No Transfer as never', () => {
    for (const condition of ['condition', 'wrongLengthRecord', 'noTransfer']) {
      expect(row(46, condition).never, `Figure 46 ${condition}`).toBe(true);
    }
  });
});

// ═══ The machine-level half — wave 4b ══════════════════════════════════════
//
// `J (I) Q` (BNQ) is io.md §8 step 2, "the program tests it with `J iiiii Q`", and it is the ONLY
// documented way a program learns an inquiry request is pending. The latch is the console's
// (`pendingRequest`), the channel exposes it as `Channel.inquiryRequest`, `isa/dmods.ts` marks the
// row available and `isa/exec/branch.ts` maps the d-glyph onto the getter — four files, one
// condition, and this is where the whole path is asserted from a running program.
//
// OPEN: `CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH` (console1415.ts, plan §15). io.md §8 contradicts
// itself; reading A — ONE latch, set by the key, tested by BNQ, cleared by Program Reset — is the
// ruling (Tom, 2026-08-30). Every assertion below is that reading made mechanical.
//
// The two CARRIAGE senses (`J (I) 9` BC9 and `J (I) @` BCV) are asserted in
// test/exec-branch.test.ts, beside the rest of the `J` d-table and the 1403's carriage; they are
// not repeated here.

/** Instructions laid end to end from `at`, each word-marked on its op code. */
function program(s: CoreStorage, at: Addr, ...instructions: readonly string[]): void {
  let p = at;
  for (const text of instructions) {
    [...text].forEach((glyph, i) => s.setChar(p + i, code(glyph), i === 0));
    p += text.length;
  }
  s.setWm(p, true);
}

/** A whole machine — the real console, the real channel, the real `J` executor. */
function machineWith(at: Addr, ...instructions: readonly string[]): Machine {
  const m = createMachine({ size: 10_000 });
  program(m.storage, at, ...instructions);
  m.addressSet(at);
  return m;
}

describe('`J (I) Q` (BNQ) — io.md §8 step 2, through the real machine', () => {
  it('falls through on a quiet console', () => {
    const m = machineWith(100, 'J00300Q');
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'NSI, nothing branched').toBe(107);
  });

  it('branches once INQUIRY REQUEST has been pressed, and does NOT clear the latch', () => {
    const m = machineWith(100, 'J00300Q');
    m.console.requestInquiry();
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'the branch was taken').toBe(300);
    // Only the READ that services the request clears it, or a reset — never the test. io.md §8's
    // own sequence depends on it: step 2 branches to a routine that then executes the read, so a
    // test that cleared the latch would leave that routine reading a request nobody made.
    // (`J (I) Z` and `J (I) W` are the two J tests that DO reset what they read — opcodes.md §8.)
    expect(m.console.pendingRequest, 'the test only reads it').toBe(true);
  });

  it('a second `J (I) Q` after the read falls through — the read cleared it', () => {
    const m = machineWith(100, 'J00300Q');
    m.console.requestInquiry();
    m.console.supply({ text: 'AB', wordMarks: [false, false], ending: 'release' });
    // `M %T0 00500 R` at 00300, with the GM-WM the operator's field needs at 00502.
    program(m.storage, 300, 'M%T000500R', 'J00400Q');
    m.storage.setChar(502, code('⧧'), true);

    expect(m.step()).toBeUndefined();          // the BNQ branches to the read routine
    expect(m.step()).toBeUndefined();          // the read services the request
    expect(m.console.pendingRequest).toBe(false);
    expect(m.step()).toBeUndefined();          // and the retest falls through
    expect(m.regs.iar, 'NSI after the second BNQ').toBe(317);
  });
});

describe('PROGRAM RESET drops a pending console inquiry request — A22-0526-3 p.49, p.52', () => {
  it('the latch is off after the key, and `J (I) Q` no longer branches', () => {
    const m = machineWith(100, 'J00300Q');
    m.console.requestInquiry();
    m.programReset();
    expect(m.console.pendingRequest, 'p.52 lists the console inquiry latch among what it resets')
      .toBe(false);

    m.addressSet(100);                         // PROGRAM RESET put IAR at 00001
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'nothing branched').toBe(107);
  });

  it('COMPUTER RESET inherits it, because it is a Program Reset plus a Start Reset', () => {
    const m = machineWith(100, 'J00300Q');
    m.console.requestInquiry();
    m.computerReset();
    expect(m.console.pendingRequest).toBe(false);
  });
});

describe('`J (I) R` (BPCB) — CARRIAGE_NEVER_BUSY, so it never branches', () => {
  it('answers false on a quiet machine and with the carriage just moved', () => {
    // io.md §7 says of the 1403's busy latch "Model this — programs rely on it to overlap", and
    // this configuration is where that stops being observable: no overlap feature, and the whole
    // `I/O` term of `49.5 µs + I/O` is 0 (cycles.ts), so a polling program sees "ready" and
    // proceeds correctly. A modelling REFUSAL, named at `channel.ts` `CARRIAGE_NEVER_BUSY`.
    expect(CARRIAGE_NEVER_BUSY).toBe(true);
    const m = machineWith(100, 'F9', 'J00300R');
    m.step();
    expect(m.printer.carriage.line, 'the carriage did move').toBe(57);
    expect(m.channel1.carriageBusy).toBe(false);
    expect(m.step()).toBeUndefined();
    expect(m.regs.iar, 'NSI — BPCB never branches here').toBe(109);
  });
});
