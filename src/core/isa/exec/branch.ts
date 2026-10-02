// src/core/isa/exec/branch.ts — the branch executors.
//
// WAVE 1 builds `J` (both §2 rows) and `V`; WAVE 2 adds `R`, the channel-1 status branch and
// the only instruction that releases the I/O interlock; WAVE 3 adds `W` Branch if Bit Equal.
// `X` is channel 2 (a feature this configuration does not have); WAVE 4 adds `B` Branch if
// Character Equal, the third member of the compare-latch group. `Y` never —
// it is the Priority feature.
//
// Taken-branch register model (plan §4.1, architecture.md §9 row C5): opcodes.md §2 prints
// `IAR = NSIB` for a taken branch while research/architecture.md §9 says IAR becomes the
// branch address + 1. Both describe the same machine at different instants — at the end of
// the execute phase IAR holds NSIB and AAR holds BI, and the NEXT read-out takes the
// op-code address from AAR into STAR and reloads IAR (opcodes.md §1.3, A22-0526-3 p.12).
// We set IAR = BI, AAR = BI, BAR = NSIB and fetch from IAR: behaviourally identical for
// every program, because the subroutine-return mechanism `G ccccc B` reads BAR.
//
// Each executor sets `ctx.branchTaken`, which selects `regs` vs `regsNotTaken`.

import { collateRank, glyphOf } from '../../bcd.js';
import { InstructionCheck, UnimplementedOp } from '../../checks.js';
import { BCD6, WM, ZA, ZB, type ExecContext, type OpForm } from '../../types.js';
import { J_D_TABLE, RX_RELEASE_D_OCTAL, type JModifier } from '../dmods.js';
import { notBuilt } from './stub.js';

/**
 * Fill in the two branch symbols of the Figure 8 set for every branch, taken or not
 * (opcodes.md §1.3). `BI` is the I-address — already decoded, indexed and loaded into AAR by
 * `decode.ts`; at length 1 a chained branch reuses whatever AAR already held. `NSIB` is the
 * instruction that would have followed had the branch not been taken, which is NSI.
 * The not-taken triples need `BI` too: `NSI / BI / BI` for `J`, `NSI / BI / B-1` for `V`.
 */
function prepareBranch(ctx: ExecContext): void {
  ctx.sym.BI = ctx.regs.aar;
  ctx.sym.NSIB = ctx.sym.NSI;
}

// ═══ `J` — opcodes.md §2 p.36, d-table §6.1 ════════════════════════════════

/**
 * The §6.1 table indexed by d-character glyph, built once. First row wins on a glyph clash:
 * `J_D_TABLE`'s 7010 "overlap in process, channel 4" row is printed as `)`, which is the
 * ALTERNATE type-head rendering of the lozenge (io.md §2, dmods.ts header) — the same BCD code
 * 074 as the `⌑` BCV2 row above it, and unreachable through `glyphOf`. Both rows are
 * `available: false`, so the collision cannot change what the machine does.
 */
const J_BY_D: ReadonlyMap<string, JModifier> = (() => {
  const byGlyph = new Map<string, JModifier>();
  for (const row of J_D_TABLE) if (!byGlyph.has(row.d)) byGlyph.set(row.d, row);
  return byGlyph;
})();

/**
 * **The four conditions that are DEVICE state and not a latch** — io.md §5 Figure 35
 * (A22-0526-3 p.36) [verified]: BC9 `9` carriage channel 9, BCV `@` carriage overflow
 * (channel 12), BPCB `R` printer carriage busy, BNQ `Q` inquiry request. Figure 35 lists all
 * four PER CHANNEL, and `ExecContext` holds no device, so the channel answers them
 * (`types.ts` §5, `channel.ts`). Their `J_D_TABLE` rows carry `indicator: null` — the same
 * column value the blank Branch-Unconditionally row carries — which is why the map is consulted
 * BEFORE `testIndicator`, whose `null` arm means "unconditional".
 *
 * Phase 2 wave 4. The channel-2 forms (`!`, `⌑`, `L`, `*`) stay unavailable.
 */
const CHANNEL_SENSE: Readonly<Record<string, (ch: ExecContext['channel1']) => boolean>> = {
  '9': (ch) => ch.carriageChannel9,
  '@': (ch) => ch.carriageChannel12,
  R: (ch) => ch.carriageBusy,
  Q: (ch) => ch.inquiryRequest,
};

/**
 * The d-characters of §6.1 whose hardware this configuration does not have: printer carriage busy
 * on channel 2, overlap, the tape indicator, binary card, every other channel-2 form, the
 * 7010-only rows and the 1401-mode sense switches. Each raises `UnimplementedOp` carrying its own
 * row's citation — never a silent `false`, which would send a program down the wrong arm of a
 * test it believes it made (docs/plans/architecture.md §4.6). It is DERIVED from the table, so
 * flipping a row to `available` shortens this list by itself (Phase 2 wave 4 flipped four).
 */
export const J_DMODS_NOT_IN_PHASE_1: readonly string[] =
  J_D_TABLE.filter((row) => !row.available).map((row) => row.d);

/**
 * OPEN: neither opcodes.md §6.1 nor A22-0526-3 p.36 Figure 35 states what a d-character outside
 * the table does. An op-modifier the machine cannot decode is treated as it is elsewhere in the
 * I ring — an Instruction Check, nothing executed (research/architecture.md §7). The alternative
 * reading is "no indicator on, therefore no branch", which would hide the fault.
 * open-questions.md, opcodes row.
 */
export const UNDEFINED_J_D_CHAR_IS_INSTRUCTION_CHECK = true;

/** `J iiiii ␣` — opcodes.md §2 p.36. The blank d position must be present. */
export const branchUnconditional: OpForm['exec'] = (ctx) => {
  prepareBranch(ctx);
  ctx.branchTaken = true;
};

/**
 * `J iiiii d` — opcodes.md §2 p.36 Figure 35 / §6.1. Tests one internal indicator and branches
 * to the I-address if it is on. The two overflow latches are RESET by the test that reads them
 * (opcodes.md §8); the zero-balance and the four compare latches are only read.
 */
export const branchOnIndicator: OpForm['exec'] = (ctx) => {
  prepareBranch(ctx);
  const glyph = glyphOf(ctx.regs.opMod & BCD6);
  const row = J_BY_D.get(glyph);

  if (row === undefined) {
    if (!UNDEFINED_J_D_CHAR_IS_INSTRUCTION_CHECK) return;
    throw new InstructionCheck(
      `undefined J d-character "${glyph}" (opcodes.md §6.1)`, ctx.fetched.opAddr,
    );
  }
  if (!row.available) {
    throw new UnimplementedOp(`J (I) ${row.d}`, undefined, `${row.meaning} — ${row.cite}`, ctx.fetched.opAddr);
  }
  // The four Figure 35 device senses, which are channel state and carry no `indicator` name.
  const sense = row.indicator === null ? CHANNEL_SENSE[glyph] : undefined;
  if (sense !== undefined) {
    if (sense(ctx.channel1)) ctx.branchTaken = true;
    return;
  }
  if (testIndicator(ctx, row)) ctx.branchTaken = true;
};

/**
 * One §6.1 row's condition. Reached only for rows that name an `IndicatorName` latch and for the
 * blank Branch-Unconditionally row: the four `indicator: null` device senses above return first.
 */
function testIndicator(ctx: ExecContext, row: JModifier): boolean {
  switch (row.indicator) {
    // `J (I) Z` (BAV) and `J (I) W` (BDV): "turned off by this test, or by computer reset"
    // (opcodes.md §6.1, §8).
    case 'arithOverflow':
      return ctx.indicators.testAndResetArithOverflow();
    case 'divideOverflow':
      return ctx.indicators.testAndResetDivideOverflow();
    // `V` zero balance, `S U T /` the four compare latches — read, never reset by the test.
    case 'zeroBalance':
    case 'compareHigh':
    case 'compareEqual':
    case 'compareLow':
    case 'compareUnequal':
      return ctx.indicators[row.indicator];
    // Blank d — Branch Unconditionally. `pickForm` routes a blank d to the other §2 row, so
    // this arm is reached only by a caller dispatching the conditional form directly.
    case null:
      return true;
  }
}

// ═══ `R` — opcodes.md §2 pp.36-37, d-table §6.2 (A22-0526-3 p.37 Figure 36) ═══

/**
 * `R iiiii d` Branch if Channel 1 I/O Status Indicator On.
 *
 * The d-character's BIT CONFIGURATION selects which of the six indicators to test — one to six
 * per instruction — so this is a mask test, not a table lookup: `1` not ready, `2` busy, `4` data
 * check, `8` condition, `-` (B bit) wrong-length record, substitute blank (A bit, octal 20 — NOT
 * an ASCII space, which has no bits and tests nothing) no transfer. The channel owns the six and
 * decodes the mask (`channel.ts` over `RX_STATUS_BITS`).
 *
 * Interlock release is exactly two things (io.md §5; A22-0526-3 pp.37-38, 42; A22-0530-1 p.8):
 * a branch that ACTUALLY BRANCHES, or the group-mark d-character, which releases whether or not
 * it branches. A non-branching test on any other d-character releases NOTHING — which is what
 * makes "two I/O instructions on one channel with no intervening status test" a system stop.
 * Interrogating the indicators does not reset them; the next I/O read-out does (channel step 3).
 */
export const branchChannel1Status: OpForm['exec'] = (ctx) => {
  prepareBranch(ctx);
  const d = ctx.regs.opMod & BCD6;
  if (ctx.channel1.testStatus(d)) ctx.branchTaken = true;
  // The group mark is octal 77 — all six bits. We key on the OCTAL, not the glyph: A22-0530-1's
  // typewriter face types the group mark and the record mark alike as a double dagger
  // (dmods.ts `RX_RELEASE_D_OCTAL`, opcodes.md §6.2, §9.1).
  if (d === RX_RELEASE_D_OCTAL || ctx.branchTaken) ctx.channel1.release();
};

// `X` — the same instruction on channel 2, which needs the processing-overlap feature this
// configuration does not have (io.md §1). The x-control decode rejects `⌑`/`*` before any
// program can leave status on channel 2 to test.
export const branchChannel2Status: OpForm['exec'] = notBuilt('X');

// ═══ `B` — opcodes.md §2 p.37 (A22-0526-3) ════════════════════════════════

/**
 * `B iiiii bbbbb d` Branch if Character Equal — opcodes.md §2 p.37, verbatim: "The BA8421 bits
 * of the character at the B-address are compared with d; exactly equal causes the branch. Also
 * sets the high/low/equal compare latches (high if the B character collates above d). Word marks
 * do not affect it — always a one-character test."
 *
 * So the BRANCH is exact equality of all six bits — not the numeric portion, not the zone
 * portion, and never the word mark or the C bit, which is exactly what `storage.bcd` hands back
 * — while the LATCHES order the same two characters by COLLATING RANK (research/charset.md §4),
 * the one Compare and Table Lookup use. The two tests differ only in the equal case, where they
 * agree; a `9` against a `+` is unequal either way but only the rank says which is higher.
 *
 * `B` is the third member of the compare-latch group with `C` and `T`: it sets high / equal /
 * low / unequal as a group and resets the previous group in doing so, whether or not it branches
 * (research/opcodes.md §8, §2 `B` row indicator column). That is the whole of the difference
 * from `W` Branch if Bit Equal, whose indicator column is empty.
 *
 * Not taken leaves `BAR = B-1` (the row's `regsNotTaken`), positioning a chained retest one
 * position lower so a 12-character `B` followed by chained 6-character `B`s walks a field
 * backwards (research/architecture.md §9). The L=6 form chains the B-address and reuses the
 * previous op modifier; the L=1 form reuses both registers and the modifier.
 */
export const branchCharEqual: OpForm['exec'] = (ctx) => {
  prepareBranch(ctx);
  const d = ctx.regs.opMod & BCD6;
  const b = ctx.storage.bcd(ctx.sym.B);
  if (b === d) {
    ctx.branchTaken = true;
    ctx.indicators.setCompare('equal');
    return;
  }
  ctx.indicators.setCompare(collateRank(b) > collateRank(d) ? 'high' : 'low');
};

// ═══ `W` — opcodes.md §2 pp.37-38 (A22-0526-3) ════════════════════════════

/**
 * `W iiiii bbbbb d` Branch if Bit Equal — opcodes.md §2 pp.37-38, verbatim: "Branches if ANY
 * bit of the B-address character matches ANY bit of d. Word-mark and C (parity) bits are not
 * compared and word marks cannot be tested."
 *
 * So the test is a bare mask intersection over BA8421 — `storage.bcd` is exactly that view, the
 * one Compare and Branch-if-Character-Equal also use (A22-0526-3 p.28). There is no d-character
 * TABLE: §6 gives sub-tables for `J`, `R`/`X` and `V`, and none for `W`, because every one of
 * the 64 codes is a legal mask. A blank d (no bits at all) therefore intersects nothing and
 * never branches — a legal, useless instruction, not an Instruction Check.
 *
 * The §2 row's indicator column is empty: unlike `B`, which shares the four compare latches
 * with Compare and Table Lookup, `W` touches NO latch. Asserted in test/exec-w.test.ts.
 *
 * Always a one-character test at the B address, so no B-field word mark is needed to end it,
 * and the L=6 form chains the B-address while reusing the previous op modifier
 * (research/architecture.md §8). Not taken leaves `BAR = B-1` (the row's `regsNotTaken`) —
 * deliberate machine design, positioning a chained retest one position lower so a chained
 * `W iiiii d` walks a field backwards (research/architecture.md §9).
 */
export const branchBitEqual: OpForm['exec'] = (ctx) => {
  prepareBranch(ctx);
  const d = ctx.regs.opMod & BCD6;
  if ((ctx.storage.bcd(ctx.sym.B) & d) !== 0) ctx.branchTaken = true;
};

// ═══ `V` — opcodes.md §2 pp.38-39, d-table §6.3 ════════════════════════════

/** d bit 1 enables the word-mark test — opcodes.md §6.3, A22-0526-3 p.39 Figure 37. */
const V_D_WORD_MARK_BIT = 0o01;
/** d bit 2 enables the zone test — same source. */
const V_D_ZONE_BIT = 0o02;
/** The B and A bits, and ONLY those, are what the zone test compares (§6.3). */
const ZONE_BITS = ZB | ZA;   // 0o60

/**
 * `V iiiii bbbbb d` Branch if Word Mark Present, or Zone Equal — opcodes.md §2 pp.38-39, §6.3.
 *
 * §6.3's directly implementable rule, verbatim: "d bit 1 enables the word-mark test; d bit 2
 * enables the zone test, comparing the B and A bits of the B-address character against the B and
 * A bits of d. Both bits set = branch on either condition." Always a ONE-CHARACTER test at the
 * B address, and no B-field word mark is needed to end it. The nine rows of Figure 37 are
 * exactly the d-characters whose bits make one of those tests: `1` WM · `2` no zones · `S` A ·
 * `K` B · `B` BA · `3` `T` `L` `C` the same four zone tests OR the word mark.
 *
 * Not taken leaves `BAR = B-1` (the table's `regsNotTaken`), which is deliberate machine design:
 * it positions a chained retest one position lower, so `V iiiii bbbbb d` followed by a chained
 * `V iiiii d` walks a field backwards (research/architecture.md §9).
 */
export const branchWmOrZone: OpForm['exec'] = (ctx) => {
  prepareBranch(ctx);
  const d = ctx.regs.opMod & BCD6;
  const cell = ctx.storage.read(ctx.sym.B);

  const wordMarkHit = (d & V_D_WORD_MARK_BIT) !== 0 && (cell & WM) !== 0;
  const zoneHit = (d & V_D_ZONE_BIT) !== 0 && (cell & ZONE_BITS) === (d & ZONE_BITS);
  if (wordMarkHit || zoneHit) ctx.branchTaken = true;
};

// `Y` Priority Test and Branch — Priority feature, opcodes.md §9.1
export const branchPriority: OpForm['exec'] = notBuilt('Y');
