// src/core/isa/table.ts — the instruction table, and the whole point of the design.
//
// This file MIRRORS opcodes.md §2 ROW FOR ROW, in the same order (BCD collating order,
// octal ascending — the machine's own order), with the same columns. Open the research
// file on the left and this on the right and diff by eye. If §2 gains a row, this gains a
// row; if a column here disagrees with §2, this file is wrong.
//
// `semantics` is the manual's own prose from the §2 Semantics cell. Markdown emphasis
// markers and backticks are dropped; nothing else is.
//
// `regs` / `regsNotTaken` are in the manual's Figure 8 notation (opcodes.md §1.3),
// evaluated by isa/regs.ts. `'special'` means the executor sets that register itself.
//
// Where §2 prints ONE row but the register column prints several results — `,` and `⌑`
// print "2 addr / 1 addr / chained" inside a single cell — this file carries one OpForm
// per printed RESULT, because a table with fewer forms than the source has results it
// cannot express (plan §4.2: "`,`/`⌑` get three rows, not one").
//
// ── The D-cycle / C-cycle notes behind the addressDouble column (opcodes.md §1.4) ──
// The A address of a NOT-percent-type op code is read into AAR and CAR. For an
// ADDRESS-DOUBLE-type op code it goes into AAR, BAR, CAR and DAR simultaneously, "so that
// if a WM is read out at I ring 6 time, the single address is used as both the A and B
// field addresses" (223-2589 p.52). Not-address-double op codes use whatever remains in
// BAR from the previous E phase. Chained arithmetic at I ring 1 takes a D cycle that sets
// BAR into STAR, modifies it by zero and reads it into DAR; chained multiply, divide and
// table lookup take a C cycle instead, to update CAR. Every D cycle exists to restore the
// invariant DAR == BAR when the instruction supplied no B address — an emulator modelling
// only AAR/BAR can ignore D and C cycles except for cycle counting.
// The set is exactly `A S ? ! , ⌑ / J R X`. It EXCLUDES `@` and `%`, the opposite of the
// 1401 rule — that is the compatibility trap (opcodes.md §1.4).
//
// ── The op-modifier traps, which the DECODER implements and this table documents ──
// An 11-character two-address instruction BLANKS the op-modifier register: "if a
// two-address instruction does not require a d-character (11-position instruction), the
// op-modifier register is blanked; thus, any chained instructions then directly following
// will be automatically assigned a blank d-character" (A22-0526-3 p.12). Its mirror: a
// 6-character form supplies no d-character and REUSES the last previous operation
// modifier (A22-0526-3 pp.12, 25, 30, 38 — see the `D`, `B` and `V` rows below, each of
// which prints "Length 6 chains the B-address and reuses the previous modifier").

import type { OpEntry, OpForm, RegTriple } from '../types.js';
import {
  MICR_TIMING_US,
  SEVEN_OH_TEN_TIMING_US,
  T_CARRIAGE_US,
  T_HALT_AND_BRANCH_US,
  T_HALT_US,
  T_SELECT_STACKER_US,
  T_STORE_ADDRESS_REGISTER_US,
  Y_TIMING_US,
  eTerm,
  instrLength,
  tBranchOneChar,
  tBranchTaken,
  tBranchUnconditional,
  tClearStorage,
  tClearStorageAndBranch,
  tCompare,
  tDivide,
  tEdit,
  tIoRecord,
  tMoveScan,
  tMoveSuppressZeros,
  tMultiply,
  tNoOp,
  tOneFieldArith,
  tTableLookup,
  tTapeRecord,
  tTwoFieldArith,
  tWordMark,
  tZeroArith,
} from '../cycles.js';
import { CARRIAGE_DMODS, J_DMODS, ML_DMODS, V_DMODS } from './dmods.js';
import * as arith from './exec/arith.js';
import * as branch from './exec/branch.js';
import * as control from './exec/control.js';
import * as io from './exec/io.js';
import * as move from './exec/move.js';
import * as wordmark from './exec/wordmark.js';

/**
 * The `lengths` sentinel for op `N`, whose §2 row prints "any (1, 2, 3, …)".
 * `readonly number[]` cannot say "any", so an EMPTY array is the sentinel and
 * `selectForm` treats it as "every length is valid". Only `N` uses it as a real
 * statement about the machine; `=` uses it because §2 prints no length at all for a
 * non-1410 op that is rejected before the length check ever runs.
 */
export const ANY_LENGTH: readonly number[] = [];

// OPEN: opcodes.md §2 `P` / `Q` rows print "NSI / Ap / Bp [unverified]" — the MICR
// short-form control ops are known only from the C28-0309-1 Autocoder mnemonic table, and
// no Principles of Operation states their register effects. Fallback: the same
// no-address-touched triple every other 2-character op has. Both rows are
// implemented: false / feature: 'micr', so the fallback is never evaluated in Phase 1.
// open-questions.md, opcodes row.
export const MICR_REGS_UNVERIFIED: RegTriple = { iar: 'NSI', aar: 'Ap', bar: 'Bp' };

// OPEN: opcodes.md §2 `$` row prints "—" in the register column and the `=` row prints
// only "BAR forced to 299". Neither is a 1410 instruction (§9.3); both exist here so that
// decode rejects them explicitly. Fallback: IAR advances, both address registers are
// 'special' (unknown, executor's problem) — never evaluated, since both rows are
// implemented: false / feature: '7010only'.
export const REGS_NOT_STATED_7010: RegTriple = { iar: 'NSI', aar: 'special', bar: 'special' };

// OPEN: opcodes.md §9.1 — BQPR2's d-character "is not safely determined". A22-0530-1 p.8
// prints a double dagger, but that manual's typewriter face types the group mark the same
// way, and SimH uses a third character again (CHR_TRM, octal 017). Deliberately absent
// from Y_DMODS below rather than guessed. `[unverified]`
export const Y_BQPR2_D_UNVERIFIED: string | null = null;

/** Op `Y`, Priority Test and Branch — opcodes.md §9.1 / A22-0530-1 pp.4-8. */
const Y_DMODS: Readonly<Record<string, string>> = {
  U: 'BUPR1 — channel 1 I-O unit priority request',
  F: 'BUPR2 — channel 2 I-O unit priority request',
  '1': 'BOPR1 — channel 1 overlap priority request; reset by R (I) d, not by Y',
  '2': 'BOPR2 — channel 2 overlap priority request; reset by X (I) d, not by Y',
  Q: 'BIPR1 — channel 1 inquiry priority request',
  '*': 'BIPR2 — channel 2 inquiry priority request',
  N: 'BQPR1 — channel 1 outquiry priority request',
  S: 'BSPR1 — channel 1 seek priority request',
  T: 'BSPR2 — channel 2 seek priority request',
  A: 'BXPR1 — channel 1 attention',
  B: 'BXPR2 — channel 2 attention',
  E: 'BEPA — branch unconditionally and enter priority alert mode',
  X: 'BXPA — branch unconditionally and exit priority alert mode',
};

// Register triples that recur across rows, named exactly as §2 prints them.
const NSI_AP_BP: RegTriple = { iar: 'NSI', aar: 'Ap', bar: 'Bp' };
const BRANCH_TAKEN: RegTriple = { iar: 'NSIB', aar: 'BI', bar: 'NSIB' };

// ═══ The table ═════════════════════════════════════════════════════════════
// One OpEntry per op character of opcodes.md §2, in §2 order.

const OP_2: OpEntry = {
  opChar: '2',
  octal: 0o2,
  autocoder: ['CC2'],
  addressDouble: false,
  // inferred: not in §1.2's percent-type set (`U M L F K G N`); `2` is channel 2's twin of
  // `F`, which IS in it. Moot at length 2 — a 2-character form is never the chained form.
  chainable: false,
  implemented: false,
  feature: 'channel2',
  forms: [
    {
      lengths: [2],
      dModifiers: CARRIAGE_DMODS,
      semantics:
        'Carriage Control, channel 2. Numeric part of d = channel number or space count; zone part = mode',
      indicators: [], // §2: "not ready, busy only" — ChannelStatus, not the seven latches
      terminatesOn: 'n/a',
      regs: NSI_AP_BP,
      timing: () => T_CARRIAGE_US,
      cite: 'opcodes.md §2 / A22-0526-3 pp.80-81',
      exec: io.carriage2,
    },
  ],
};

const OP_4: OpEntry = {
  opChar: '4',
  octal: 0o4,
  autocoder: ['SSF2'],
  addressDouble: false,
  // inferred: not in §1.2's percent-type set (`U M L F K G N`); `4` is channel 2's twin of
  // `K`, which IS in it. Moot at length 2 — a 2-character form is never the chained form.
  chainable: false,
  implemented: false,
  feature: 'channel2',
  forms: [
    {
      lengths: [2],
      dModifiers: { '0': 'pocket NR', '1': 'pocket 1', '2': 'pocket 8-2' },
      semantics: 'Select Stacker and Feed, channel 2',
      indicators: [], // §2: "not ready, busy, no transfer" — ChannelStatus
      terminatesOn: 'n/a',
      regs: NSI_AP_BP,
      timing: () => T_SELECT_STACKER_US,
      cite: 'opcodes.md §2 / A22-0526-3 pp.62-63',
      exec: io.selectStacker2,
    },
  ],
};

const OP_EQUALS: OpEntry = {
  opChar: '=',
  octal: 0o13,
  autocoder: [],
  addressDouble: false,
  chainable: false,
  implemented: false,
  feature: '7010only',
  forms: [
    {
      // PLAN-DEVIATION: opcodes.md §2 prints "—" in this row's Lengths column — no 1410
      // form exists and none is stated. `readonly number[]` has no way to say "unstated",
      // so ANY_LENGTH does double duty here and means exactly that. It is vacuous: the
      // row is rejected by `implemented: false` before selectForm ever runs. The tier-0
      // redundancy assertion (chainable === false ⇒ 1 ∉ lengths) names `=` as an
      // exclusion for this reason, alongside `N`.
      lengths: ANY_LENGTH,
      dModifiers: 'none',
      semantics:
        'Floating point against the FP register at 280-299. Not a 1410 instruction. Does not collide with any 1410 op char',
      indicators: [], // §2: "exponent overflow / underflow" — 7010 latches, not our seven
      terminatesOn: 'n/a',
      regs: REGS_NOT_STATED_7010, // §2 prints only "BAR forced to 299"
      timing: () => SEVEN_OH_TEN_TIMING_US,
      cite: 'opcodes.md §2, §9.3 / SimH i7010 (not a 1410 instruction)',
      exec: control.floatingPoint,
    },
  ],
};

const OP_AT: OpEntry = {
  opChar: '@',
  octal: 0o14,
  autocoder: ['M'], // Autocoder M = Multiply, machine M = move-mode I/O. opcodes.md §1.6
  addressDouble: false, // NOT address-double — the 1401 compatibility trap, §1.4
  chainable: true,
  implemented: true, // Phase 1b Wave B — src/core/muldiv.ts
  forms: [
    {
      lengths: [1, 6, 11],
      dModifiers: 'none',
      semantics:
        'Multiply. A = multiplicand at its units position. B = product field at its units position, with the multiplier image pre-placed in the high-order positions of B. len(B) = digits(multiplicand) + digits(multiplier) + 1. First scan zeros product positions right of the multiplier; repetitive true-add (multiplier digit 1-4) or tens-complement complement-add + shift + true-add (5-9); multiplier image is destroyed',
      indicators: ['zeroBalance'], // §2: "zero balance only — multiply never sets arithmetic overflow"
      terminatesOn:
        'word marks over high-order multiplicand and over high-order multiplier image in B; ends when the multiplier image is exhausted',
      regs: { iar: 'NSI', aar: 'A-LA', bar: 'B-LB' },
      // M is Figure 7's multiplier length, which only the executor can know — opcodes.md §1.5.
      timing: (ctx) => tMultiply(instrLength(ctx), eTerm('@', instrLength(ctx)), ctx.sym.LA, ctx.terms.M),
      cite: 'opcodes.md §2 / A22-0526-3 pp.19-20',
      exec: arith.multiply,
    },
  ],
};

const OP_SLASH: OpEntry = {
  opChar: '/',
  octal: 0o21,
  autocoder: ['CS'],
  addressDouble: true,
  chainable: true,
  implemented: true,
  forms: [
    {
      lengths: [1, 6],
      dModifiers: 'none',
      semantics:
        'Clear Storage. Clears data and word marks right-to-left from the B address down to and including the nearest hundreds position. / 12590 clears 12590-12500. Chained form uses current BAR; AAR is not loaded and is undisturbed',
      indicators: [],
      terminatesOn: 'the hundreds boundary (address ending 00)',
      regs: { iar: 'NSI', aar: 'B', bar: 'special' }, // BAR = bbb00−1, set by the executor
      // Figure 7's B term here is the number of positions cleared; Wave 3's executor
      // reports it through ctx.sym.LB, which is 0 until then.
      timing: (ctx) => tClearStorage(instrLength(ctx), ctx.sym.LB),
      cite: 'opcodes.md §2 / A22-0526-3 p.23',
      exec: wordmark.clear,
    },
    {
      lengths: [11],
      dModifiers: 'none',
      semantics:
        'Clear Storage and Branch (/ iiiii bbbbb). Same clearing action, then unconditional branch to the I-address',
      indicators: [],
      terminatesOn: 'the hundreds boundary',
      // An UNCONDITIONAL branch: §2 prints no not-taken result, so there is no
      // regsNotTaken here even though the row branches.
      regs: BRANCH_TAKEN,
      timing: (ctx) => tClearStorageAndBranch(instrLength(ctx), ctx.sym.LB),
      cite: 'opcodes.md §2 / A22-0526-3 p.23',
      exec: wordmark.clearBranch,
    },
  ],
};

const OP_S: OpEntry = {
  opChar: 'S',
  octal: 0o22,
  autocoder: ['S'],
  addressDouble: true,
  chainable: true,
  implemented: true,
  forms: [
    {
      lengths: [1, 11],
      dModifiers: 'none',
      semantics:
        'Subtract (two fields). A subtracted from B, remainder in B, right-to-left from units. A-field sign is inverted first, then the add-cycle table (§4.3) applies. Same zone/word-mark rules as Add',
      indicators: ['arithOverflow', 'zeroBalance'],
      terminatesOn:
        'B-field word mark (required); A-field WM needed only if A is shorter than B',
      regs: { iar: 'NSI', aar: 'A-LW', bar: 'B-LB' },
      // R = 1 if a recomplement was taken (opcodes.md §1.5), which only the pass itself knows;
      // Wave 3's alu.ts sets `ctx.recomplement` as it makes the second scan over B.
      timing: (ctx) =>
        tTwoFieldArith(
          instrLength(ctx), eTerm('S', instrLength(ctx)), ctx.sym.LA, ctx.sym.LB, ctx.recomplement,
        ),
      cite: 'opcodes.md §2 / A22-0526-3 p.17',
      exec: arith.subtract2,
    },
    {
      lengths: [6],
      dModifiers: 'none',
      semantics:
        'Subtract (one field) — address-double: A field subtracted from itself, leaving a zeroed result in A. Zone bits and sign configuration unchanged (example: A-field ABQ becomes ??!)',
      indicators: ['zeroBalance'],
      terminatesOn: 'A-field word mark',
      regs: { iar: 'NSI', aar: 'A-LA', bar: 'A-LA' },
      timing: (ctx) => tOneFieldArith(instrLength(ctx), ctx.sym.LA),
      cite: 'opcodes.md §2 / A22-0526-3 p.18',
      exec: arith.subtract1,
    },
  ],
};

const OP_T: OpEntry = {
  opChar: 'T',
  octal: 0o23,
  autocoder: ['LL', 'LE', 'LLE', 'LH', 'LLH', 'LEH'],
  addressDouble: false,
  chainable: true,
  implemented: true, // Phase 1b Wave C — tablelookup.ts
  forms: [
    {
      lengths: [1, 6, 12], // NOT 2/7/11 — 7010 latitude; opcodes.md §1.1 length table, and the note closing §3.3
      dModifiers: {
        '1': 'lower',
        '2': 'equal',
        '3': 'equal or lower',
        '4': 'higher',
        '5': 'lower or higher (unequal)',
        '6': 'equal or higher',
        '7': 'stop on any',
        ' ': 'blank = search to end of table',
      },
      semantics:
        'Table Lookup. Searches right-to-left through the table for a table argument satisfying d. A = rightmost position of the search argument; B = rightmost character of the whole table. Each table field is an implicit B field: argument rightmost, function leftmost. At the start of each search cycle the C-address register receives the A-address and, on a miss, replaces it in AAR so the search restarts one position left of the table field word mark',
      indicators: ['compareHigh', 'compareEqual', 'compareLow', 'compareUnequal'],
      terminatesOn:
        'A-field word mark ends each argument comparison; the search ends on a hit, or on a table field shorter than the search argument (which sets HIGH)',
      // BAR = address of the function immediately left of the stopping table argument.
      regs: { iar: 'NSI', aar: 'A-LW', bar: 'special' },
      // N is the fields actually compared, which only the search loop can know — it reports it
      // through `ctx.terms.N` exactly as `alu.ts` reports `R` (opcodes.md §1.5; types.ts).
      timing: (ctx) => tTableLookup(instrLength(ctx), ctx.sym.LA, ctx.sym.LB, ctx.terms.N),
      cite: 'opcodes.md §2 / A22-0526-3 pp.29-30',
      exec: arith.tableLookup,
    },
  ],
};

const OP_U: OpEntry = {
  opChar: 'U',
  octal: 0o24,
  autocoder: ['BSP', 'SKP', 'RWD', 'RWU', 'WTM'],
  addressDouble: false,
  chainable: false, // percent-type — opcodes.md §1.2
  implemented: false,
  feature: 'tape',
  forms: [
    {
      // 5, not 2: A22-0530-1 Figure 1 prints 2 and that is a printing error in the
      // priority bulletin (architecture.md §9 row C12; A22-0526-3 p.85, 223-2589 p.53).
      lengths: [5],
      dModifiers: {
        B: 'backspace',
        A: 'move one record (CE)',
        R: 'rewind',
        U: 'rewind and unload',
        E: 'erase forward',
        M: 'write tape mark',
      },
      semantics:
        'Unit Control (tape). Backspace moves over one complete record (a tape mark counts as a record) and does not interlock the 1410; write tape mark writes a single-character record and does interlock. Erase forward blanks ~3.5 in. before the next write and is cancelled by a read or backspace. Only write-tape-mark can be overlapped',
      indicators: [], // §2: "channel status" — ChannelStatus, not the seven latches
      terminatesOn: 'one record (backspace); tape mark = 1-char record',
      regs: NSI_AP_BP,
      // §2 prints `.0045(L+1) + Tm` ms; .0045 ms is 4.5 µs. Tm (tape motion) is 0 — tape
      // is out of Phase-1 scope.
      timing: (ctx) => tTapeRecord(instrLength(ctx), 0),
      cite: 'opcodes.md §2 / A22-0526-3 pp.85-86, Figure 97',
      exec: io.unitControl,
    },
  ],
};

const OP_V: OpEntry = {
  opChar: 'V',
  octal: 0o25,
  autocoder: ['BW', 'BZN', 'BWZ'],
  addressDouble: false,
  chainable: true,
  implemented: true,
  forms: [
    {
      lengths: [1, 6, 12],
      dModifiers: V_DMODS,
      semantics:
        'Branch if Word Mark Present, or Zone Equal. d bit 1 enables the word-mark test; d bit 2 enables the zone test, which compares the B and A bits only of the B-address character against the B and A bits of d. Both bits set = branch on either condition. Always a one-character test; no B-field word mark needed. Length 6 chains the B-address and reuses the previous modifier',
      indicators: [],
      terminatesOn: 'one character',
      regs: BRANCH_TAKEN,
      regsNotTaken: { iar: 'NSI', aar: 'BI', bar: 'B-1' },
      timing: (ctx) => tBranchOneChar(instrLength(ctx), ctx.branchTaken ? 1 : 0),
      cite: 'opcodes.md §2 / A22-0526-3 pp.38-39, Figure 37',
      exec: branch.branchWmOrZone,
    },
  ],
};

const OP_W: OpEntry = {
  opChar: 'W',
  octal: 0o26,
  autocoder: ['BBE'],
  addressDouble: false,
  chainable: true,
  implemented: true,
  forms: [
    {
      lengths: [1, 6, 12],
      dModifiers: 'bitmask',
      semantics:
        'Branch if Bit Equal. Branches if any bit of the B-address character matches any bit of d. Word-mark and C (parity) bits are not compared and word marks cannot be tested',
      indicators: [],
      terminatesOn: 'one character',
      regs: BRANCH_TAKEN,
      regsNotTaken: { iar: 'NSI', aar: 'BI', bar: 'B-1' },
      timing: (ctx) => tBranchOneChar(instrLength(ctx), ctx.branchTaken ? 1 : 0),
      cite: 'opcodes.md §2 / A22-0526-3 pp.37-38',
      exec: branch.branchBitEqual,
    },
  ],
};

const OP_X: OpEntry = {
  opChar: 'X',
  octal: 0o27,
  autocoder: ['BNR2', 'BCB2', 'BER2', 'BEF2', 'BWL2', 'BNT2', 'BEX2', 'BA2'],
  addressDouble: true,
  chainable: false, // §1.2: not R or X, even though neither is percent-type
  // Channel 2 is out of Phase-1 scope (plan §1 "Out"), exactly as for `2` and `4`, so
  // this row rejects with its citation rather than dispatching to a stub.
  implemented: false,
  feature: 'channel2',
  forms: [
    {
      lengths: [7], // 7 ONLY — no chained form. opcodes.md §1.1, three independent sources
      dModifiers: 'bitmask',
      semantics:
        'Branch if Channel 2 I/O Status Indicator On. Also releases the channel 2 I/O interlock — unconditionally if d = group mark, otherwise only if the branch is actually taken',
      indicators: [], // §2: "does not reset the status indicators; they reset at the next I/O read-out"
      terminatesOn: 'n/a',
      regs: BRANCH_TAKEN,
      regsNotTaken: { iar: 'NSI', aar: 'BI', bar: 'BI' },
      timing: (ctx) => tBranchTaken(instrLength(ctx), ctx.branchTaken ? 1 : 0),
      cite: 'opcodes.md §2 / A22-0526-3 pp.36-37, Figure 36',
      exec: branch.branchChannel2Status,
    },
  ],
};

const OP_Y: OpEntry = {
  opChar: 'Y',
  octal: 0o30,
  autocoder: [
    'BUPR1', 'BUPR2', 'BOPR1', 'BOPR2', 'BIPR1', 'BIPR2', 'BQPR1', 'BQPR2',
    'BSPR1', 'BSPR2', 'BXPR1', 'BXPR2', 'BEPA', 'BXPA',
  ],
  addressDouble: false,
  chainable: true, // 1 is a legal length (§2.2 "Y at 1 or 7"), so the redundancy rule holds
  implemented: false,
  feature: 'priority',
  forms: [
    {
      lengths: [1, 7], // §2 "7 (interruptible), 1 (non-interruptible)"; §2.2 "Y at 1 or 7"
      dModifiers: Y_DMODS,
      semantics:
        'Priority Test and Branch. Tests (and usually resets) one of six per-channel priority request indicators; E/X are unconditional branch-and-enter / branch-and-exit priority alert mode',
      indicators: [], // priority request indicators are not among the seven latches
      terminatesOn: 'n/a',
      // §2 prints only the taken result plus "Return address = BAR minus six"; there is no
      // not-taken row for `Y`, so this form carries no regsNotTaken.
      regs: BRANCH_TAKEN,
      timing: () => Y_TIMING_US,
      cite: 'opcodes.md §2, §9.1 / A22-0530-1 pp.4-8',
      exec: branch.branchPriority,
    },
  ],
};

const OP_Z: OpEntry = {
  opChar: 'Z',
  octal: 0o31,
  autocoder: ['MCS'],
  addressDouble: false,
  chainable: true,
  implemented: true, // Phase 1b Wave C — mcs.ts
  forms: [
    {
      lengths: [1, 6, 11],
      dModifiers: 'none',
      semantics:
        'Move Characters and Suppress Zeros. Moves A to B (A unchanged), then blanks high-order zeros and commas in B and strips the zone bits from the units (sign) position of B. Alphabetic and most special characters (e.g. @) count as non-significant, so suppression can restart to their right',
      indicators: [],
      terminatesOn:
        'A-field word mark defines the length moved; B-field word marks inside the moved area, including its leftmost position, are removed',
      regs: { iar: 'NSI', aar: 'A-LA', bar: 'B+1' },
      timing: (ctx) => tMoveSuppressZeros(instrLength(ctx), ctx.sym.LA),
      cite: 'opcodes.md §2 / A22-0526-3 pp.27-28, Figures 23-24',
      exec: move.moveSuppressZeros,
    },
  ],
};

const OP_COMMA: OpEntry = {
  opChar: ',',
  octal: 0o33,
  autocoder: ['SW'],
  addressDouble: true,
  chainable: true,
  implemented: true,
  // One §2 row, three printed register results — three forms (plan §4.2).
  forms: [
    {
      lengths: [11],
      dModifiers: 'none',
      semantics:
        'Set Word Mark at the A and B locations. Data characters undisturbed',
      indicators: [],
      terminatesOn: 'fixed — one or two positions',
      regs: { iar: 'NSI', aar: 'A-1', bar: 'B-1' },
      timing: (ctx) => tWordMark(instrLength(ctx)),
      cite: 'opcodes.md §2 / A22-0526-3 p.22',
      exec: wordmark.setWm2,
    },
    {
      lengths: [6],
      dModifiers: 'none',
      semantics:
        'Set Word Mark at A only (address-double: the single address is used as both the A and B field address). Data characters undisturbed',
      indicators: [],
      terminatesOn: 'fixed — one or two positions',
      regs: { iar: 'NSI', aar: 'A-1', bar: 'A-1' },
      timing: (ctx) => tWordMark(instrLength(ctx)),
      cite: 'opcodes.md §2 / A22-0526-3 p.22',
      exec: wordmark.setWm1,
    },
    {
      lengths: [1],
      dModifiers: 'none',
      semantics:
        'Set Word Mark (chained) at the addresses currently in AAR/BAR. Data characters undisturbed',
      indicators: [],
      terminatesOn: 'fixed — one or two positions',
      regs: { iar: 'NSI', aar: 'Ap-1', bar: 'Bp-1' },
      timing: (ctx) => tWordMark(instrLength(ctx)),
      cite: 'opcodes.md §2 / A22-0526-3 p.22',
      exec: wordmark.setWmChained,
    },
  ],
};

const OP_PERCENT: OpEntry = {
  opChar: '%',
  octal: 0o34,
  autocoder: ['D'], // Autocoder D = Divide, machine D = Move. opcodes.md §1.6
  addressDouble: false, // NOT address-double — the 1401 compatibility trap, §1.4
  chainable: true,
  implemented: true, // Phase 1b Wave B — src/core/muldiv.ts
  forms: [
    {
      lengths: [1, 6, 11],
      dModifiers: 'none',
      semantics:
        'Divide. A = units position of the divisor. B = leftmost position of the DIVIDEND, which sits len(divisor)+1 positions in from the left end of the quotient/dividend field (see §4.6). len(B) = digits(divisor) + digits(dividend) + 1. Quotient positions must be pre-zeroed and the dividend must carry a sign (BA plus / B minus) — the sign stops the division. Divisor may be unsigned (assumed positive). Repeated complement-add with true-add correction and shift; quotient left, remainder right',
      indicators: ['divideOverflow'], // §2: "divide never sets arithmetic overflow or zero balance"
      terminatesOn:
        'word mark over the leftmost position of the divisor; the division is stopped by the sign in the units position of the dividend. A B-field word mark left by a preceding ZA is ignored but retained',
      regs: { iar: 'NSI', aar: 'A-LA', bar: 'special' }, // BAR = tens position of the quotient
      // Q is Figure 7's quotient length, which only the executor can know — opcodes.md §1.5.
      timing: (ctx) => tDivide(instrLength(ctx), eTerm('%', instrLength(ctx)), ctx.sym.LA, ctx.terms.Q),
      cite: 'opcodes.md §2 / A22-0526-3 pp.20-21',
      exec: arith.divide,
    },
  ],
};

const OP_J: OpEntry = {
  opChar: 'J',
  octal: 0o41,
  autocoder: [
    'B', 'BAV', 'BZ', 'BE', 'BH', 'BL', 'BU', 'BDV', 'BNQ', 'BC9', 'BCV', 'BPCB',
    'BOL1', 'BOL2',
  ],
  addressDouble: true,
  chainable: true, // and a 1-character chained J IS a legal form — opcodes.md §1.1
  implemented: true,
  // §2 prints TWO `J` rows and both carry lengths 1 and 7, so a length-keyed selectForm
  // cannot tell them apart: the d-character does. forms[0] is the blank-d unconditional
  // branch, forms[1] every other d. `decode.ts` `pickForm` is what separates them, and it
  // is the only op that needs it — no other entry has two forms overlapping on length.
  forms: [
    {
      lengths: [1, 7],
      dModifiers: { ' ': 'Branch Unconditionally — the blank d position must be present' },
      semantics:
        'Branch Unconditionally to the I-address. The blank d-character position must be present',
      indicators: [],
      terminatesOn: 'n/a',
      regs: BRANCH_TAKEN,
      timing: (ctx) => tBranchUnconditional(instrLength(ctx)),
      cite: 'opcodes.md §2 / A22-0526-3 p.36',
      exec: branch.branchUnconditional,
    },
    {
      lengths: [1, 7],
      dModifiers: J_DMODS,
      semantics:
        'Branch Conditionally (one address). Test one internal indicator; branch to the I-address if on',
      // §2 prints "the overflow indicators are reset by the test that reads them" — these
      // two are RESET here, never set. `indicators` cannot say which direction; the
      // per-d reset rules live in dmods.ts J_D_TABLE and opcodes.md §8.
      indicators: ['arithOverflow', 'divideOverflow'],
      terminatesOn: 'n/a',
      regs: BRANCH_TAKEN,
      // Both A and B registers hold the branch-to address on the not-taken path.
      regsNotTaken: { iar: 'NSI', aar: 'BI', bar: 'BI' },
      timing: (ctx) => tBranchTaken(instrLength(ctx), ctx.branchTaken ? 1 : 0),
      cite: 'opcodes.md §2 / A22-0526-3 p.36, Figure 35',
      exec: branch.branchOnIndicator,
    },
  ],
};

const OP_K: OpEntry = {
  opChar: 'K',
  octal: 0o42,
  autocoder: ['SSF1'],
  addressDouble: false,
  chainable: false, // percent-type — opcodes.md §1.2
  // Base machine, but the 1402 stacker is Phase 2 (plan §1 "Out: cards, 1402"). No
  // `feature` member fits "base-machine op whose device is out of this phase's scope",
  // so this row stays implemented and its executor throws until Phase 2 lands.
  implemented: true,
  forms: [
    {
      lengths: [2],
      dModifiers: { '0': 'pocket NR', '1': 'pocket 1', '2': 'pocket 8-2' },
      semantics:
        'Select Stacker and Feed, channel 1. Used after a Read a Card that had 9 in x3; sends the already-read card to pocket NR / 1 / 8-2 and feeds the next card',
      indicators: [], // §2: "not ready, busy, no transfer" — ChannelStatus
      terminatesOn: 'n/a',
      regs: NSI_AP_BP,
      timing: () => T_SELECT_STACKER_US,
      cite: 'opcodes.md §2 / A22-0526-3 pp.62-63, Figure 62',
      exec: io.selectStacker1,
    },
  ],
};

const OP_L: OpEntry = {
  opChar: 'L',
  octal: 0o43,
  autocoder: ['RW#', 'PW#', 'WW#', 'RTW', 'WTW', 'RCPW', 'WCPW'],
  addressDouble: false,
  chainable: false, // percent-type — opcodes.md §1.2
  implemented: true,
  forms: [
    {
      lengths: [10],
      dModifiers: ML_DMODS,
      semantics:
        'I/O, load mode. Input: a single incoming word separator becomes a word mark over the next incoming character (the record shortens by one); two consecutive separators become one stored separator. Output: each core word mark becomes a word separator written one position ahead of its character; a stored separator becomes two on output',
      indicators: [], // §2: "six channel status indicators" — ChannelStatus, not the seven
      terminatesOn:
        'group-mark-with-word-mark in core; tape read also on inter-record gap; $/X only at the highest-numbered core position',
      regs: { iar: 'NSI', aar: 'Ap', bar: 'B+LB+1' },
      // Card / print / console: 49.5 + I/O. Tape would be tTapeRecord(L, Tm); no tape
      // device exists in Phase 1, and IO_TERM_US is 0 (opcodes.md §1.5).
      timing: () => tIoRecord(),
      cite: 'opcodes.md §2 / A22-0526-3 pp.40-41',
      exec: io.ioLoad,
    },
  ],
};

const OP_M: OpEntry = {
  opChar: 'M',
  octal: 0o44,
  // `RW#` removed 2026-08-31: it is a load-mode name and belongs to OP_L only. A22-0526-3 Fig 107
  // p.104 gives the family one combined `M or L` row, and C28-0309-1 p.47 lists no RW-family form
  // under `M`. `WM#` stays — Fig 107 p.105 `WM(#)° b` -> `M x¹21 (B) W`, a distinct printer function.
  autocoder: ['R#', 'P#', 'W#', 'WM#', 'RT', 'RTB', 'WT', 'WTB', 'RCP', 'WCP', 'SD'],
  addressDouble: false,
  chainable: false, // percent-type — opcodes.md §1.2
  implemented: true,
  forms: [
    {
      lengths: [10],
      dModifiers: ML_DMODS,
      semantics:
        'I/O, move mode. Word separators pass through unchanged in both directions; core word marks are not sent to the medium',
      indicators: [],
      terminatesOn: 'as L',
      regs: { iar: 'NSI', aar: 'Ap', bar: 'B+LB+1' },
      timing: () => tIoRecord(),
      cite: 'opcodes.md §2 / A22-0526-3 pp.40-41, 62-63, 80, 86-87, 46-47, Fig 107 pp.104-105 / C28-0309-1 pp.47-49',
      exec: io.ioMove,
    },
  ],
};

const OP_N: OpEntry = {
  opChar: 'N',
  octal: 0o45,
  autocoder: ['NOP'],
  addressDouble: false,
  // Percent-type per opcodes.md §1.2 — and legal at length 1 anyway, because a
  // 1-character `N` is a NOP, not a chained op. This is the one op the tier-0 redundancy
  // rule (chainable === false ⇒ 1 ∉ lengths) has to name as an exception.
  chainable: false,
  implemented: true,
  forms: [
    {
      // "any (1, 2, 3, …)". The tape bootstrap depends on it: a word-marked `N` at 00011
      // runs to the first word mark inside the just-loaded record (software.md §10.4).
      lengths: ANY_LENGTH,
      dModifiers: 'any',
      semantics:
        'No Operation. Written over any instruction op code to make that whole instruction ineffective; the remaining characters are skipped. Word marks unaffected',
      indicators: [],
      terminatesOn: 'the word mark on the next instruction op code',
      regs: NSI_AP_BP,
      timing: (ctx) => tNoOp(instrLength(ctx)),
      cite: 'opcodes.md §2 / A22-0526-3 p.24',
      exec: control.noOp,
    },
  ],
};

const OP_P: OpEntry = {
  opChar: 'P',
  octal: 0o47,
  autocoder: ['ECR1', 'DCR1', 'SS1'],
  addressDouble: false,
  // inferred: not in §1.2's percent-type set (`U M L F K G N`), which predates the 1412/1419
  // MICR feature. Moot at length 2 — a 2-character form is never the chained form.
  chainable: false,
  implemented: false,
  feature: 'micr',
  forms: [
    {
      lengths: [2],
      dModifiers: { E: 'engage', D: 'disengage', R: 'stacker select' },
      semantics: 'MICR short-form control, channel 1',
      indicators: [], // §2: "MICR channel indicators"
      terminatesOn: 'n/a',
      regs: MICR_REGS_UNVERIFIED,
      timing: () => MICR_TIMING_US,
      cite: 'opcodes.md §2, §9.2 / C28-0309-1',
      exec: io.micr1,
    },
  ],
};

const OP_Q: OpEntry = {
  opChar: 'Q',
  octal: 0o50,
  autocoder: ['ECR2', 'DCR2', 'SS2'],
  addressDouble: false,
  // inferred: not in §1.2's percent-type set (`U M L F K G N`), which predates the 1412/1419
  // MICR feature. Moot at length 2 — a 2-character form is never the chained form.
  chainable: false,
  implemented: false,
  feature: 'micr',
  forms: [
    {
      lengths: [2],
      dModifiers: { E: 'engage', D: 'disengage', '3': 'stacker select' },
      semantics: 'MICR short-form control, channel 2',
      indicators: [],
      terminatesOn: 'n/a',
      regs: MICR_REGS_UNVERIFIED,
      timing: () => MICR_TIMING_US,
      cite: 'opcodes.md §2, §9.2 / C28-0309-1',
      exec: io.micr2,
    },
  ],
};

const OP_R: OpEntry = {
  opChar: 'R',
  octal: 0o51,
  autocoder: ['BNR1', 'BCB1', 'BER1', 'BEF1', 'BWL1', 'BNT1', 'BEX1', 'BA1'],
  addressDouble: true,
  chainable: false, // §1.2: not R or X. A chained R/X executes what the 1411 rejects.
  implemented: true,
  forms: [
    {
      lengths: [7], // 7 ONLY — no chained 1-character form. opcodes.md §1.1
      dModifiers: 'bitmask',
      semantics:
        'Branch if Channel 1 I/O Status Indicator On. Also releases the channel 1 I/O interlock — unconditionally if d = group mark, otherwise only if the branch is taken. Also the instruction that resets the channel 1 overlap priority request indicator',
      indicators: [], // §2: "does not reset the status indicators"
      terminatesOn: 'n/a',
      regs: BRANCH_TAKEN,
      regsNotTaken: { iar: 'NSI', aar: 'BI', bar: 'BI' },
      timing: (ctx) => tBranchTaken(instrLength(ctx), ctx.branchTaken ? 1 : 0),
      cite: 'opcodes.md §2 / A22-0526-3 pp.36-37, Figure 36',
      exec: branch.branchChannel1Status,
    },
  ],
};

const OP_BANG: OpEntry = {
  opChar: '!',
  octal: 0o52,
  autocoder: ['ZS'],
  addressDouble: true,
  chainable: true,
  implemented: true,
  forms: [
    {
      lengths: [1, 11],
      dModifiers: 'none',
      semantics:
        'Zero and Subtract (two fields). Numeric A stored into B with the opposite sign (see §4.4 sign map); zone bits stripped from all B positions except the sign. Short A zero-fills high-order B up to and including its word mark',
      indicators: ['zeroBalance'], // §2: "zero balance only"
      terminatesOn: 'B-field word mark',
      regs: { iar: 'NSI', aar: 'A-LW', bar: 'B-LB' },
      timing: (ctx) =>
        tZeroArith(instrLength(ctx), eTerm('!', instrLength(ctx)), ctx.sym.LA, ctx.sym.LB),
      cite: 'opcodes.md §2 / A22-0526-3 p.18',
      exec: arith.zeroSubtract2,
    },
    {
      lengths: [6],
      dModifiers: 'none',
      semantics:
        'Zero and Subtract (one field) — address-double: zones stripped except the sign, numeric data unchanged, sign polarity reversed (minus→plus becomes BA)',
      indicators: ['zeroBalance'],
      terminatesOn: 'A-field word mark',
      regs: { iar: 'NSI', aar: 'A-LA', bar: 'A-LA' },
      timing: (ctx) => tOneFieldArith(instrLength(ctx), ctx.sym.LA),
      cite: 'opcodes.md §2 / A22-0526-3 p.19',
      exec: arith.zeroSubtract1,
    },
  ],
};

const OP_DOLLAR: OpEntry = {
  opChar: '$',
  octal: 0o53,
  autocoder: [],
  addressDouble: false,
  chainable: false,
  implemented: false,
  feature: '7010only',
  forms: [
    {
      lengths: [7], // §2 prints the form `$ bbbbb d` — 7 characters
      dModifiers: {
        S: 'store internal machine status as one character',
        R: 'restore internal machine status',
        E: 'store channel 1 status',
        F: 'store channel 2 status',
        '1': 'restore channel 1 status',
        '2': 'restore channel 2 status',
      },
      semantics:
        'Store and Restore Status — 7010 only, not a 1410 instruction. See §9.3',
      indicators: [], // §2: "packs the compare/zero/overflow/divide-overflow indicators into one character"
      terminatesOn: '1 character at the B-address',
      regs: REGS_NOT_STATED_7010,
      timing: () => SEVEN_OH_TEN_TIMING_US,
      cite: 'opcodes.md §2, §9.3 / A22-6726 p.33',
      exec: control.storeRestoreStatus,
    },
  ],
};

const OP_A: OpEntry = {
  opChar: 'A',
  octal: 0o61,
  autocoder: ['A'],
  addressDouble: true,
  chainable: true,
  implemented: true,
  forms: [
    {
      lengths: [1, 11],
      dModifiers: 'none',
      semantics:
        'Add (two fields). Algebraic add of A into B, right-to-left from units. Sum in B. B zone bits unchanged except the sign; A zone bits ignored except the sign. Short A zero-fills high-order B up to and including the B word mark; A positions beyond the B word mark are not processed',
      indicators: ['arithOverflow', 'zeroBalance'],
      terminatesOn:
        'B-field word mark (required); A-field WM needed only if A is shorter than B',
      regs: { iar: 'NSI', aar: 'A-LW', bar: 'B-LB' },
      // R = 1 if a recomplement was taken (opcodes.md §1.5), which only the pass itself knows;
      // Wave 3's alu.ts sets `ctx.recomplement` as it makes the second scan over B.
      timing: (ctx) =>
        tTwoFieldArith(
          instrLength(ctx), eTerm('A', instrLength(ctx)), ctx.sym.LA, ctx.sym.LB, ctx.recomplement,
        ),
      cite: 'opcodes.md §2 / A22-0526-3 p.17',
      exec: arith.add2,
    },
    {
      lengths: [6],
      dModifiers: 'none',
      semantics:
        'Add (one field) — address-double: the A field is image-added to itself (doubled) in place. Zones and sign configuration unchanged',
      // §2 prints "zero balance; arithmetic overflow" here, in that order, and §8 confirms
      // Add sets arithmetic overflow "one-field or two-field". The `S` one-field row
      // prints zero balance only — transcribed as printed, asymmetry and all.
      indicators: ['zeroBalance', 'arithOverflow'],
      terminatesOn: 'A-field word mark',
      regs: { iar: 'NSI', aar: 'A-LA', bar: 'A-LA' },
      timing: (ctx) => tOneFieldArith(instrLength(ctx), ctx.sym.LA),
      cite: 'opcodes.md §2 / A22-0526-3 pp.17-18',
      exec: arith.add1,
    },
  ],
};

const OP_B: OpEntry = {
  opChar: 'B',
  octal: 0o62,
  autocoder: ['BCE'],
  addressDouble: false,
  chainable: true,
  implemented: true,
  forms: [
    {
      lengths: [1, 6, 12],
      dModifiers: 'any',
      semantics:
        'Branch if Character Equal. The BA8421 bits of the character at the B-address are compared with d; exactly equal causes the branch. Also sets the high/low/equal compare latches (high if the B character collates above d). Word marks do not affect it — always a one-character test. Length 6 chains the B-address and reuses the previous modifier',
      indicators: ['compareHigh', 'compareEqual', 'compareLow', 'compareUnequal'],
      terminatesOn: 'one character',
      regs: BRANCH_TAKEN,
      regsNotTaken: { iar: 'NSI', aar: 'BI', bar: 'B-1' },
      timing: (ctx) => tBranchOneChar(instrLength(ctx), ctx.branchTaken ? 1 : 0),
      cite: 'opcodes.md §2 / A22-0526-3 p.37',
      exec: branch.branchCharEqual,
    },
  ],
};

const OP_C: OpEntry = {
  opChar: 'C',
  octal: 0o63,
  autocoder: ['C'],
  addressDouble: false,
  chainable: true,
  implemented: true,
  forms: [
    {
      lengths: [1, 6, 11],
      dModifiers: 'none',
      semantics:
        'Compare B to A, never A to B, right-to-left. All BA8421 bits compared; the C (check) bit and word marks are not. Neither field is modified',
      indicators: ['compareHigh', 'compareEqual', 'compareLow', 'compareUnequal'],
      terminatesOn:
        'either an A-field or a B-field word mark. If the A field is shorter than the B field it must have a word mark, and that case turns HIGH on. If B is shorter than or equal to A the indicators are set correctly for the portion compared',
      regs: { iar: 'NSI', aar: 'A-LW', bar: 'B-LW' },
      timing: (ctx) => tCompare(instrLength(ctx), ctx.sym.LA, ctx.sym.LB),
      cite: 'opcodes.md §2 / A22-0526-3 p.28; short-A WM requirement from 223-2588-2',
      exec: arith.compare,
    },
  ],
};

const OP_D: OpEntry = {
  opChar: 'D',
  octal: 0o64,
  autocoder: ['M{L,R}{N,Z,C,W,NW,ZW,CW}{S,A,B,␣,R,G,M}', 'SCN{L,R}{…}'],
  addressDouble: false,
  chainable: true,
  implemented: true,
  forms: [
    {
      lengths: [1, 6, 12], // NOT 2/7/11 — 7010 latitude; opcodes.md §1.1 length table, and the note closing §3.3
      dModifiers: 'any', // all 64 valid — opcodes.md §3.2
      semantics:
        'Move / Scan. Bit 1 = move numeric portion, bit 2 = move zone portion, bit 4 = move word mark; none of 1/2/4 = scan only (registers stepped, no data transferred). Bit 8 set = left-to-right (addresses are the leftmost positions); bit 8 clear = right-to-left (addresses are the rightmost positions). Only the selected portion of each A character replaces the corresponding portion of the B character; the rest of the B character is unchanged. The terminating position is itself moved/replaced. Length 6 chains the B-address and reuses the previous modifier',
      indicators: [],
      terminatesOn:
        'per d: first WM in either field / A-field WM / B-field WM / one position / A-field record mark / A-field GM-WM / A-field RM or GM-WM',
      // §2 prints "NSI / see §3.2": the effect is per-d and a single RegTriple cannot say
      // that. The eight Figure 20 rows are MOVE_REG_EFFECTS in dmods.ts, keyed on d & 0x38.
      regs: { iar: 'NSI', aar: 'special', bar: 'special' },
      timing: (ctx) => tMoveScan(instrLength(ctx), ctx.sym.LA, ctx.sym.LB),
      cite: 'opcodes.md §2 / A22-0526-3 pp.25-27, Figures 19-22',
      exec: move.moveScan,
    },
  ],
};

const OP_E: OpEntry = {
  opChar: 'E',
  octal: 0o65,
  autocoder: ['MCE'],
  addressDouble: false,
  chainable: true,
  implemented: true, // Phase 1b Wave D — src/core/edit.ts
  forms: [
    {
      lengths: [1, 6, 11],
      dModifiers: 'none',
      semantics:
        'Move Characters and Edit. The A field (data) is edited under control of the B field (edit control word) and the result left in B. The two fields are read alternately, character by character. Any sign in the units position of the data is removed from the character moved into B (the A field itself is never written). One to three scans — see §7',
      indicators: [],
      terminatesOn:
        'a word mark in the high-order position of B controls the operation (and is removed on scan 1); the A-field word mark ends the body. Remaining commas in B are blanked while the extension latch is set. The B-field word mark hard-stops the forward scan: any A data not yet moved is dropped',
      // "Varies with result of edit" in every edition; the eight cases are opcodes.md §7.3.
      regs: { iar: 'NSI', aar: 'A-LA', bar: 'special' },
      // Figure 7's `Z` and `D` are MCE's own spans (opcodes.md §1.5) and only the edit can know
      // them, so `edit.ts` reports both on `ctx.terms` exactly as `@` reports `M` — a row that
      // printed 0 for a term its own operation develops would be a wrong row.
      timing: (ctx) => tEdit(instrLength(ctx), ctx.sym.LA, ctx.sym.LB, ctx.terms.Z, ctx.terms.D),
      cite: 'opcodes.md §2 / A22-0526-3 pp.31-33, Figures 27-34',
      exec: move.moveEdit,
    },
  ],
};

const OP_F: OpEntry = {
  opChar: 'F',
  octal: 0o66,
  autocoder: ['CC1'],
  addressDouble: false,
  chainable: false, // percent-type — opcodes.md §1.2
  // Base machine, but the 1403 carriage is Phase 2 (plan §1 "Out: 1403"). Same note as
  // op `K`: no `feature` member fits, so the row stays implemented and its executor
  // throws until Phase 2 lands.
  implemented: true,
  forms: [
    {
      lengths: [2],
      dModifiers: CARRIAGE_DMODS,
      semantics:
        'Carriage Control, channel 1. Numeric (8421) part of d = channel number or space count; zone part = mode (no zone = immediate skip, BA = skip after print, B = immediate space, A = space after print). A skip to a channel the tape is already at moves to the next punch of that channel',
      indicators: [], // §2: "not ready, busy only" — ChannelStatus
      terminatesOn: 'n/a',
      regs: NSI_AP_BP,
      timing: () => T_CARRIAGE_US,
      cite: 'opcodes.md §2 / A22-0526-3 pp.80-81, Figures 90-91',
      exec: io.carriage1,
    },
  ],
};

const OP_G: OpEntry = {
  opChar: 'G',
  octal: 0o67,
  autocoder: ['SAR', 'SBR', 'SER', 'SFR'],
  addressDouble: false,
  chainable: false, // percent-type — opcodes.md §1.2
  implemented: true,
  forms: [
    {
      lengths: [7],
      dModifiers: {
        A: 'AAR',
        B: 'BAR',
        E: 'E-register (tape address in overlap mode)',
        F: 'F-register (tape address in overlap mode)',
        T: 'real-time clock — Program Addressable Clock feature, opcodes.md §9.4',
      },
      semantics:
        'Store Address Register. Stores the named register 5 characters into the C field; the C-address is the rightmost position of the destination. Uses the C-address register, so AAR is not disturbed. Cannot be indexed. Word marks in the C field have no effect; zones in the C field are not disturbed. E and F hold tape addresses in overlap mode. G ccccc B after a taken branch is the 1410 subroutine-return mechanism',
      indicators: [],
      terminatesOn: 'fixed 5-character store',
      regs: NSI_AP_BP,
      timing: () => T_STORE_ADDRESS_REGISTER_US,
      cite: 'opcodes.md §2 / A22-0526-3 p.22',
      exec: control.storeAddressRegister,
    },
  ],
};

const OP_QUESTION: OpEntry = {
  opChar: '?',
  octal: 0o72,
  autocoder: ['ZA'],
  addressDouble: true,
  chainable: true,
  implemented: true,
  forms: [
    {
      lengths: [1, 11],
      dModifiers: 'none',
      semantics:
        'Zero and Add (two fields). Numeric data of A stored into B with A sign; zone bits stripped from all B positions except the sign; a plus sign not already B+A is rewritten as B+A. Short A zero-fills high-order B up to and including its word mark',
      indicators: ['zeroBalance'], // §2: "zero balance only"
      terminatesOn: 'B-field word mark',
      regs: { iar: 'NSI', aar: 'A-LW', bar: 'B-LB' },
      timing: (ctx) =>
        tZeroArith(instrLength(ctx), eTerm('?', instrLength(ctx)), ctx.sym.LA, ctx.sym.LB),
      cite: 'opcodes.md §2 / A22-0526-3 p.18',
      exec: arith.zeroAdd2,
    },
    {
      lengths: [6],
      dModifiers: 'none',
      semantics:
        'Zero and Add (one field) — address-double: strips zones from all A positions except the sign, sign polarity kept (plus normalised to BA), numeric data unchanged. Also normalises blank / 8-3 / 8-4 etc. to their numeric equivalents',
      indicators: ['zeroBalance'],
      terminatesOn: 'A-field word mark',
      regs: { iar: 'NSI', aar: 'A-LA', bar: 'A-LA' },
      timing: (ctx) => tOneFieldArith(instrLength(ctx), ctx.sym.LA),
      cite: 'opcodes.md §2 / A22-0526-3 p.18',
      exec: arith.zeroAdd1,
    },
  ],
};

const OP_PERIOD: OpEntry = {
  opChar: '.',
  octal: 0o73,
  autocoder: ['H'],
  addressDouble: false,
  chainable: true,
  implemented: true,
  forms: [
    {
      lengths: [1],
      dModifiers: 'none',
      semantics:
        'Halt. System stops; START resumes with the next sequential instruction. If it is the last instruction in the program a word mark must be preset in the position immediately to its right',
      indicators: [],
      terminatesOn: 'n/a',
      regs: NSI_AP_BP,
      timing: () => T_HALT_US,
      cite: 'opcodes.md §2 / A22-0526-3 p.23',
      exec: control.halt,
    },
    {
      lengths: [6],
      dModifiers: 'none',
      semantics:
        'Halt and Branch. System stops; START resumes at the I-address (unconditional branch). The last-instruction word-mark rule applies here too',
      indicators: [],
      terminatesOn: 'n/a',
      // Unconditional: §2 prints no not-taken result.
      regs: BRANCH_TAKEN,
      timing: () => T_HALT_AND_BRANCH_US,
      cite: 'opcodes.md §2 / A22-0526-3 p.23',
      exec: control.haltBranch,
    },
  ],
};

const OP_LOZENGE: OpEntry = {
  opChar: '⌑',
  octal: 0o74,
  autocoder: ['CW'],
  addressDouble: true,
  chainable: true,
  implemented: true,
  // Same three printed register results as Set Word Mark — three forms.
  forms: [
    {
      lengths: [11],
      dModifiers: 'none',
      semantics:
        'Clear Word Mark at the A and B locations. Same three forms and same register results as Set Word Mark; clears the word mark if present, data undisturbed',
      indicators: [],
      terminatesOn: 'fixed — one or two positions',
      regs: { iar: 'NSI', aar: 'A-1', bar: 'B-1' },
      timing: (ctx) => tWordMark(instrLength(ctx)),
      cite: 'opcodes.md §2 / A22-0526-3 p.22',
      exec: wordmark.clearWm2,
    },
    {
      lengths: [6],
      dModifiers: 'none',
      semantics:
        'Clear Word Mark at A only (address-double). Clears the word mark if present, data undisturbed',
      indicators: [],
      terminatesOn: 'fixed — one or two positions',
      regs: { iar: 'NSI', aar: 'A-1', bar: 'A-1' },
      timing: (ctx) => tWordMark(instrLength(ctx)),
      cite: 'opcodes.md §2 / A22-0526-3 p.22',
      exec: wordmark.clearWm1,
    },
    {
      lengths: [1],
      dModifiers: 'none',
      semantics:
        'Clear Word Mark (chained) at the addresses currently in AAR/BAR. Clears the word mark if present, data undisturbed',
      indicators: [],
      terminatesOn: 'fixed — one or two positions',
      regs: { iar: 'NSI', aar: 'Ap-1', bar: 'Bp-1' },
      timing: (ctx) => tWordMark(instrLength(ctx)),
      cite: 'opcodes.md §2 / A22-0526-3 p.22',
      exec: wordmark.clearWmChained,
    },
  ],
};

/** Every op character of opcodes.md §2, IN §2 ORDER (BCD collating order). */
export const ALL_OPS: readonly OpEntry[] = [
  OP_2, OP_4, OP_EQUALS, OP_AT, OP_SLASH, OP_S, OP_T, OP_U, OP_V, OP_W, OP_X, OP_Y,
  OP_Z, OP_COMMA, OP_PERCENT, OP_J, OP_K, OP_L, OP_M, OP_N, OP_P, OP_Q, OP_R, OP_BANG,
  OP_DOLLAR, OP_A, OP_B, OP_C, OP_D, OP_E, OP_F, OP_G, OP_QUESTION, OP_PERIOD, OP_LOZENGE,
];

const byOctal: (OpEntry | undefined)[] = new Array<OpEntry | undefined>(64).fill(undefined);
for (const entry of ALL_OPS) byOctal[entry.octal] = entry;

/** Indexed by the 6-bit BCD code — `OPS[chars[0] & BCD6]` is the whole op-code decode. */
export const OPS: readonly (OpEntry | undefined)[] = byOctal;

/** Lookup by machine op character (not by Autocoder mnemonic — they collide, §1.6). */
export function opByChar(ch: string): OpEntry | undefined {
  return ALL_OPS.find((entry) => entry.opChar === ch);
}

/**
 * The only use of the length table (plan §4.4): a CHECK, never a driver. An empty
 * `lengths` array is the ANY_LENGTH sentinel and matches every length.
 */
export function selectForm(entry: OpEntry, length: number): OpForm | undefined {
  return entry.forms.find((form) => form.lengths.length === 0 || form.lengths.includes(length));
}
