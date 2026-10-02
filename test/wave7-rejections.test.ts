// test/wave7-rejections.test.ts — Wave 7: everything the real machine REJECTS, and the
// citation it rejects with.
// Source: docs/plans/phase-1-cpu-core.md §1 "Out" (lines 120-128), §5 Wave 7 (566-568);
// docs/plans/architecture.md §12. Every case drives the real machine end to end
// (createMachine -> addressSet -> step) rather than calling decode.ts/checks.ts directly.
//
// research/io.md §2: x-control x1 pairs by channel — `%`/`@` channel 1 (plain/overlap),
// `⌑`/`*` channel 2, `?`/`!` channel 3, `$`/`=` channel 4 — with only channels 1-2 on the
// 1410 (`? ! $ =` are 7010-only). io.md §4: an overlapped instruction on a machine without
// the overlap feature stops the system. research/software.md §10.3: `3`/`1` are 7010 branch
// op codes, undefined on this table. research/opcodes.md §9: Y priority, P/Q MICR, $/=
// 7010-only, U tape.

import { describe, it, expect } from 'vitest';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { InstructionCheck, UnimplementedOp, UnsupportedFeature } from '../src/core/checks.js';
import { J_D_TABLE } from '../src/core/isa/dmods.js';
import { opByChar } from '../src/core/isa/table.js';
import { createMachine, type Machine } from '../src/core/machine.js';

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

/** One instruction at 00100, word-marked on its op char, terminated by a bare word mark one
 *  past its last character — `fetch()`'s only length signal (architecture.md §7, p.11). */
function machineWith(text: string): Machine {
  const m = createMachine({ size: 10_000 });
  const at = 100;
  [...text].forEach((glyph, i) => m.storage.setChar(at + i, code(glyph), i === 0));
  m.storage.setWm(at + text.length, true);
  m.addressSet(at);
  return m;
}

const AT = 100;

// ═══ 1. `Y P Q U 2 4 $ = X` — feature-gated ops, each cites its own row ═══════

const FEATURE_OPS: readonly { op: string; text: string; feature: string }[] = [
  { op: 'Y', text: 'Y01111A', feature: 'priority' },       // opcodes.md §2 lengths [1,7]
  { op: 'P', text: 'PA', feature: 'micr' },                  // lengths [2]
  { op: 'Q', text: 'QA', feature: 'micr' },                  // lengths [2]
  { op: 'U', text: 'U%B0U', feature: 'tape' },               // lengths [5]
  { op: '2', text: '2D', feature: 'channel2' },              // lengths [2]
  { op: '4', text: '4C', feature: 'channel2' },              // lengths [2]
  { op: '$', text: '$01111D', feature: '7010only' },         // lengths [7]
  // `=` has no BCD glyph of its own — its op-char octal (013) prints as `#` on the 1410 A2
  // chain (bcd.ts, no `=` row exists in BCD_TABLE). ANY_LENGTH means length 1 is legal.
  { op: '=', text: '#', feature: '7010only' },
  { op: 'X', text: 'X02222B', feature: 'channel2' },         // lengths [7]
];

describe('Wave 7 — feature-gated ops reject unimplementedOp, citing their row and feature', () => {
  for (const { op, text, feature } of FEATURE_OPS) {
    it(`\`${op}\` (opcodes.md §9 / io.md §2) stops unimplementedOp with cite + feature '${feature}'`, () => {
      const entry = opByChar(op);
      if (!entry) throw new Error(`no table row for '${op}'`);
      const form0 = entry.forms[0];
      if (!form0) throw new Error(`'${op}' has no forms[0]`);
      const m = machineWith(text);
      expect(m.step(), op).toBe('unimplementedOp');
      expect(m.snapshot().stop, op).toBe('unimplementedOp');
      expect(m.cpu.lastCheck, op).toBeInstanceOf(UnimplementedOp);
      expect(m.cpu.lastCheck?.message, op).toContain(`op '${op}'`);
      expect(m.cpu.lastCheck?.message, op).toContain(`feature: ${feature}`);
      expect(m.cpu.lastCheck?.message, op).toContain(form0.cite);
    });
  }
});

// ═══ 2. The Phase 1b base-machine rejections — DELETED, all five ops have landed ═══════════
//
// `@ % T Z E` each sat here in turn, rejected by BUILD ORDER rather than by a missing feature,
// and Wave D's `E` was the last: every one of the five now executes, so there is no base-machine
// op left to reject and this section's premise is gone (phase-1b.md §4 Waves B-D).

// ═══ 3. I/O x-control rejections — io.md §2, §4 ═══════════════════════════════

/** `M x1T0 00100 d` — form Oxxxbd, length 10. x2='T' (console), x3='0' are never reached by
 *  any case below: every one throws inside `decodeX` before the channel looks at the device. */
const mIo = (x1: string, d: string): string => `M${x1}T000100${d}`;

describe('Wave 7 — I/O x-control rejections (io.md §2, §4; channel.ts decodeX)', () => {
  it('`M @T0 00100 W` — overlap x1 on channel 1: unsupportedFeature (io.md §4)', () => {
    const m = machineWith(mIo('@', 'W'));
    expect(m.step()).toBe('unsupportedFeature');
    expect(m.cpu.lastCheck).toBeInstanceOf(UnsupportedFeature);
    expect(m.cpu.lastCheck?.message).toContain('overlap');
  });

  // `*` is channel 2 AND overlap. `decodeX` tests the OVERLAP bit first, so it stops the system
  // exactly as `@` does — plan §1 and architecture.md §12 both say "an overlap x1 (`@`/`*`)
  // raises an unsupported-feature stop", and io.md §4's rule is the overlap feature's, not the
  // channel's. (An earlier ordering tested `row.channel === 2` first and reported the narrower
  // unimplementedOp('channel2') for `*`; that contradicted both plan docs.)
  it('`M *T0 00100 W` — channel-2 AND overlap: the overlap stop wins (io.md §4)', () => {
    const m = machineWith(mIo('*', 'W'));
    expect(m.step()).toBe('unsupportedFeature');
    expect(m.cpu.lastCheck).toBeInstanceOf(UnsupportedFeature);
    expect(m.cpu.lastCheck?.message).toContain('overlap');
  });

  it('`M ⌑T0 00100 W` — channel 2, non-overlap: unimplementedOp mentioning channel2', () => {
    const m = machineWith(mIo('⌑', 'W'));
    expect(m.step()).toBe('unimplementedOp');
    expect((m.cpu.lastCheck as UnimplementedOp).feature).toBe('channel2');
    expect(m.cpu.lastCheck?.message).toContain('channel 2');
  });

  it('`M ?T0 00100 W` — 7010 channel 3 x1: instructionCheck', () => {
    const m = machineWith(mIo('?', 'W'));
    expect(m.step()).toBe('instructionCheck');
    expect(m.cpu.lastCheck).toBeInstanceOf(InstructionCheck);
    expect(m.cpu.lastCheck?.message).toContain('7010 channel 3');
  });

  it('`M !T0 00100 W` — 7010 channel 3 (overlap) x1: instructionCheck', () => {
    const m = machineWith(mIo('!', 'W'));
    expect(m.step()).toBe('instructionCheck');
    expect(m.cpu.lastCheck?.message).toContain('7010 channel 3');
  });

  it('`M $T0 00100 W` — 7010 channel 4 x1: instructionCheck', () => {
    const m = machineWith(mIo('$', 'W'));
    expect(m.step()).toBe('instructionCheck');
    expect(m.cpu.lastCheck?.message).toContain('7010 channel 4');
  });

  // SimH's 7010 decode gives channel-4 overlap the glyph `=`, but `=` is not one of the 64 BCD
  // codes: octal 013, the code an assembler would emit, prints `#`, and `decodeX` keys x1 through
  // `glyphOf`, which only ever returns one of those 64. The `X1_CHANNEL` row for it was therefore
  // dead by construction and has been removed (`dmods.ts`). `#` is the reachable stand-in, and it
  // still fails — on the generic "undefined x-control channel character" branch, not the
  // 7010-channel branch `?`/`!`/`$` hit above.
  it('`M =T0 00100 W` — the `=` x1 glyph is unreachable; `#` instructionChecks on the generic branch instead', () => {
    expect(bcdOfGlyph('=')).toBeUndefined();
    const m = machineWith(mIo('#', 'W'));
    expect(m.step()).toBe('instructionCheck');
    expect(m.cpu.lastCheck?.message).toContain('undefined x-control channel character');
  });
});

// ═══ 4. `3` and `1` — 7010 branch op codes, undefined on this table ═══════════

describe('Wave 7 — `3`/`1` as op codes (7010 branch ops, software.md §10.3): instructionCheck', () => {
  for (const glyph of ['3', '1']) {
    it(`\`${glyph}\` instructionChecks — "undefined op code"`, () => {
      const m = machineWith(glyph);
      expect(m.step(), glyph).toBe('instructionCheck');
      expect(m.cpu.lastCheck, glyph).toBeInstanceOf(InstructionCheck);
      expect(m.cpu.lastCheck?.message, glyph).toBe('undefined op code');
    });
  }
});

// ═══ 5. `J` d-characters Phase 1 cannot serve — opcodes.md §6.1 Figure 35 ═════

describe('Wave 7 — `J` d-characters Phase 1 cannot serve (dmods.ts J_D_TABLE, available: false)', () => {
  // The pair was `9` and `R` — carriage channel 9 and printer carriage busy on CHANNEL 1 — until
  // Phase 2 wave 4 gave both an answer (`Channel.carriageChannel9` / `carriageBusy`, from the
  // 1403 and from `CARRIAGE_NEVER_BUSY`). Their CHANNEL-2 twins are the same two conditions on the
  // channel this configuration does not have, so the rejection they prove is the same one:
  // `!` = carriage channel 9, channel 2; `L` = printer carriage busy, channel 2 (Figure 35).
  for (const d of ['!', 'L']) {
    it(`\`J 00100 ${d}\` stops unimplementedOp, citing its §6.1 row`, () => {
      const row = J_D_TABLE.find((r) => r.d === d);
      if (!row) throw new Error(`no J_D_TABLE row for '${d}'`);
      expect(row.available, d).toBe(false);
      const m = machineWith(`J00100${d}`);
      expect(m.step(), d).toBe('unimplementedOp');
      expect(m.cpu.lastCheck).toBeInstanceOf(UnimplementedOp);
      expect(m.cpu.lastCheck?.message, d).toContain(row.meaning);
      expect(m.cpu.lastCheck?.message, d).toContain(row.cite);
    });
  }
});

// ═══ 6. `F` and `K` — the two base-machine ops whose device was Phase 2 ══════
//
// BOTH REJECTION BLOCKS ARE GONE, in the wave that earned each. `K` went in Phase 2 wave 2 with
// the 1402 and `Channel.control`; `F` went in wave 3 with the 1403. Neither op rejects anything
// any more, so there is nothing here to assert — their behaviour lives in
// test/channel-control.test.ts (the nine steps for a short-form op), test/reader1402.test.ts
// (`K`, Figure 62) and test/printer1403.test.ts (`F`, all 30 rows of Figure 90).

// ═══ 7. Control: does decode complete (IAR -> NSI) before the rejection? ══════

describe('Wave 7 — control: IAR at the moment of rejection (cpu.ts beginInstruction)', () => {
  // cpu.ts sets `this.regs.iar = fetched.nsi` BEFORE the `!entry.implemented` check and
  // BEFORE `exec()` ever runs (executeCycle calls exec only after beginInstruction returns).
  // So every rejection raised from `exec` (unimplementedOp for a feature-gated or Phase-1b
  // op, unimplementedOp/unsupportedFeature/instructionCheck from an M's x-control decode,
  // unimplementedOp from a rejected J d-character) leaves IAR at NSI: decode DID
  // complete, only dispatch was refused.
  it('unimplementedOp (op-level) leaves IAR at NSI', () => {
    const text = 'Y01111A';
    const m = machineWith(text);
    expect(m.step()).toBe('unimplementedOp');
    expect(m.regs.iar).toBe(AT + text.length);
    expect(m.snapshot().iar).toBe(AT + text.length);
  });

  it('unsupportedFeature (x-control overlap) leaves IAR at NSI', () => {
    const text = mIo('@', 'W');
    const m = machineWith(text);
    expect(m.step()).toBe('unsupportedFeature');
    expect(m.regs.iar).toBe(AT + text.length);
  });

  it('unimplementedOp (J d-character) leaves IAR at NSI', () => {
    // `!` — carriage channel 9 on channel 2. It was `9` (channel 1) until wave 4 answered that one.
    const text = 'J00100!';
    const m = machineWith(text);
    expect(m.step()).toBe('unimplementedOp');
    expect(m.regs.iar).toBe(AT + text.length);
  });

  // The one exception: an UNDEFINED OP CODE (`3`/`1`) throws in beginInstruction BEFORE the
  // `this.regs.iar = fetched.nsi` line is ever reached — `fetch()` doesn't touch IAR either,
  // it only reads it — so decode did NOT complete, and IAR is left exactly where ADDRESS SET
  // put it, not at NSI.
  it('instructionCheck (undefined op code) leaves IAR UNCHANGED — decode never got that far', () => {
    const m = machineWith('3');
    expect(m.step()).toBe('instructionCheck');
    expect(m.regs.iar).toBe(AT);
    expect(m.snapshot().iar).toBe(AT);
  });
});
