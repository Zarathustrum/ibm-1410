// src/core/isa/exec/io.ts — I/O executors.
//
// WAVE 2 builds `M` and `L` (opcodes.md §2 pp.40-41) against `ExecContext.channel1`. What they
// do here is deliberately thin: pull the x-control field and the d-character out of the
// instruction, hand them to the channel, and record LB. Everything else — the nine-step
// sequence, the interlock, the six status indicators, move vs load — is channel work, and no
// executor knows what a 1415 is (docs/plans/architecture.md §4.10).
//
// `F` and `K` are base-machine ops whose DEVICE is Phase 2 (1403 carriage, 1402 stacker). Wave 2
// built `K` against `Channel.control` and the 1402; WAVE 3 BUILT `F` against the same call and
// the 1403. `U` is tape, `2`/`4` channel 2, `P`/`Q` MICR — those rows carry `implemented: false`
// and cpu.ts rejects them before `exec` is called.

import { glyphOf } from '../../bcd.js';
import { UnimplementedOp } from '../../checks.js';
import { BCD6, type ExecContext, type IoMode, type OpForm } from '../../types.js';
import { notBuilt } from './stub.js';

/**
 * `M`/`L` are form `Oxxxbd` — `O x1x2x3 bbbbb d` (architecture.md §7). `decode.ts` deliberately
 * leaves the three x-characters RAW in the instruction image and loads only the B-address, so
 * this is the first place they are looked at (decode.ts `Oxxxbd`, io.md §2).
 */
const X1 = 1, X2 = 2, X3 = 3;

/**
 * One transfer. `ctx.sym.LB` is the number of CORE positions the channel covered, which the
 * table's `bar: 'B+LB+1'` turns into the final BAR — one position past the group-mark-with-word-
 * mark that ended the record, because the GM-WM is read out and tested on an extra cycle
 * (opcodes.md §2 pp.40-41; io.md §1 "End-of-op address", §8 "after: IAR = NSI, AAR = Ap,
 * BAR = B + LB + 1"; 223-2692 p.42).
 */
function transfer(ctx: ExecContext, mode: IoMode): void {
  const chars = ctx.fetched.chars;
  const glyph = (i: number): string => glyphOf((chars[i] ?? 0) & BCD6);
  const at = ctx.fetched.opAddr;

  const x = ctx.channel1.decodeX(glyph(X1), glyph(X2), glyph(X3), at);
  const d = glyphOf(ctx.regs.opMod & BCD6);
  ctx.sym.LB = ctx.channel1.io(mode, ctx.storage, x, ctx.sym.B, d, at);

  // OPEN: when the channel skips execution at step 6 (an indicator already on) or the device has
  // nothing to transfer, no manual states where BAR lands. LB = 0 gives `B + 1`, which is what
  // the printed register column produces for a zero-length record; the only thing said about the
  // skipped instruction is opcodes.md §6.2's interlock-semantics bullet (line 526, A22-0526-3
  // pp.37, 41 `[verified]`): the pre-transfer test covers not-ready, busy and condition, and
  // "any one ⇒ the instruction is ignored, no data transferred, next sequential instruction is
  // read out, no stop". open-questions.md, io row.
}

// `M` I/O move mode — WCP on the console. "Word separators pass through unchanged in both
// directions; core word marks are not sent to the medium" (opcodes.md §2 p.40).
export const ioMove: OpForm['exec'] = (ctx) => transfer(ctx, 'move');

// `L` I/O load mode — WCPW on the console. The output translation (word mark → separator one
// position ahead, separator → two) is the channel's; the 8-bit 1415 bypasses it and renders the
// WM bit itself (opcodes.md §2 pp.40-41, io.md §3 p.41, §8 Figure 44).
export const ioLoad: OpForm['exec'] = (ctx) => transfer(ctx, 'load');

/**
 * `F d` Carriage Control, channel 1 — opcodes.md §2 pp.80-81, Figures 90-91.
 *
 * Form `Od`, exactly like `K` below: the d-character is the whole instruction past the op code
 * and `decode.ts` has already put it in the op-modifier register. There is no x-control field
 * and no B-address, so this executor knows nothing about a 1403 — `Channel.control` runs the
 * nine steps and routes on the op character (channel.ts `SHORT_FORM_DEVICE`, io.md §5, §7), and
 * the thirty d-characters of Figure 90 are the 1403's own interpretation
 * (devices/printer1403.ts against `isa/dmods.ts`'s `CARRIAGE_D_TABLE`).
 */
export const carriage1: OpForm['exec'] = (ctx) => {
  ctx.channel1.control('F', glyphOf(ctx.regs.opMod & BCD6), ctx.fetched.opAddr);
};

/**
 * `K d` Select Stacker and Feed, channel 1 — opcodes.md §2 pp.62-63, Figure 62.
 *
 * Form `Od`: the d-character is the whole instruction past the op code, and `decode.ts` has
 * already put it in the op-modifier register. There is no x-control field to decode and no
 * B-address, so this executor knows nothing about a 1402 — `Channel.control` runs the nine steps
 * and routes on the op character (channel.ts `SHORT_FORM_DEVICE`, io.md §5, §6).
 */
export const selectStacker1: OpForm['exec'] = (ctx) => {
  ctx.channel1.control('K', glyphOf(ctx.regs.opMod & BCD6), ctx.fetched.opAddr);
};

/**
 * `U %Ux d` Unit Control (tape) — opcodes.md §2 pp.85-86, Figure 97. Its table row carries
 * `implemented: false` / `feature: 'tape'`, so cpu.ts raises `UnimplementedOp` with the row's
 * own citation before this is reached; the throw here is the belt to that braces.
 */
export const unitControl: OpForm['exec'] = (ctx) => {
  throw new UnimplementedOp(
    'U', 'tape',
    'Unit Control — magnetic tape is not part of this configuration (opcodes.md §2 pp.85-86, io.md §9)',
    ctx.fetched.opAddr,
  );
};

// `2` Carriage Control, channel 2 — opcodes.md §2 pp.80-81. Row is implemented: false.
export const carriage2: OpForm['exec'] = notBuilt('2');

// `4` Select Stacker and Feed, channel 2 — opcodes.md §2 pp.62-63. Row is implemented: false.
export const selectStacker2: OpForm['exec'] = notBuilt('4');

// `P` / `Q` MICR short-form control — opcodes.md §9.2. Rows are implemented: false.
export const micr1: OpForm['exec'] = notBuilt('P');
export const micr2: OpForm['exec'] = notBuilt('Q');
