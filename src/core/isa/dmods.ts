// src/core/isa/dmods.ts — the d-character and x-control tables, as DATA with citations.
//
// Every table here mirrors one figure of the research. Nothing in this file executes
// anything: branch.ts, io.ts and move.ts read these rows in their own waves. Sources:
//   §6.1  op `J`  one-address branch-on-indicator d-table  (A22-0526-3 p.36 Figure 35)
//   §6.2  ops `R` / `X`  channel-status d-bits             (A22-0526-3 p.37 Figure 36)
//   §6.3  op `V`  word-mark / zone-equal d-table           (A22-0526-3 p.39 Figure 37)
//   §6.4  ops `F` / `2`  carriage-control d-table          (A22-0526-3 p.81 Figure 90)
//   §6.5  I/O x-control x1 / x2 and the M/L d-chars        (A22-0526-3 pp.11, 92, 105)
//   §3.1  op `D`  portion and direction/terminator         (A22-0526-3 p.25 Figure 19)
//   §3.3  op `D`  address registers after operation        (A22-0526-3 p.26 Figure 20)
//
// Decode on the BCD CODE, not the ASCII glyph: Figure 107's "Code Alternate" column prints
// `%`, `@` and the lozenge as `(`, `'` and `)` on alternate type heads (io.md §2). The
// glyphs below are the primary rendering; `octal` is the authority.

import type { ChannelStatus, IndicatorName, RegExpr } from '../types.js';

/** Turns a cited row list into the plain `d -> meaning` map the OpForm.dModifiers column takes. */
function dMap(rows: readonly { readonly d: string; readonly meaning: string }[]): Readonly<
  Record<string, string>
> {
  const out: Record<string, string> = {};
  for (const row of rows) out[row.d] = row.meaning;
  return out;
}

// ═══ §6.1 — op `J`, Branch on Indicator ════════════════════════════════════

export interface JModifier {
  readonly d: string;
  readonly autocoder: readonly string[];
  readonly meaning: string;
  /** The Phase-1 latch this tests, where it is one of the seven (opcodes.md §8). */
  readonly indicator: IndicatorName | null;
  /** false ⇒ the executor rejects the instruction with `cite`; the hardware is out of Phase-1 scope. */
  readonly available: boolean;
  readonly notes: string;
  readonly tag: '[verified]' | '[likely]';
  readonly cite: string;
}

const J_CITE = 'opcodes.md §6.1 / A22-0526-3 p.36 Figure 35';
const J_CITE_AUTOCODER = 'opcodes.md §6.1 / C28-0309-1 p.46 (feature-dependent, not Figure 35)';
const J_CITE_7010 = 'opcodes.md §6.1 / SimH i7010 (7010 only)';
const J_CITE_1401 = 'opcodes.md §6.1 / A22-0526-3 §9.5 (1401 Compatibility mode only)';

/**
 * Complete, including the rows Phase 1 cannot serve. A22-0526-3 Figure 35 lists 18
 * d-characters; the `N`, `H` and `%` rows come from the Autocoder mnemonic table and are
 * feature-dependent additions, not base machine (opcodes.md §6.1).
 *
 * Note the `K` collision: on a native 1410 `K` is the tape indicator, in 1401 mode the
 * same character is End of Reel. One row, 1410 meaning, collision recorded in `notes`.
 */
export const J_D_TABLE: readonly JModifier[] = [
  { d: ' ', autocoder: ['B'], meaning: '(none — unconditional)', indicator: null, available: true,
    notes: 'Branch Unconditionally. The blank d position must be present', tag: '[verified]', cite: J_CITE },
  { d: 'Z', autocoder: ['BAV'], meaning: 'Arithmetic overflow', indicator: 'arithOverflow', available: true,
    notes: 'Turned off by this test, or by computer reset', tag: '[verified]', cite: J_CITE },
  { d: 'W', autocoder: ['BDV'], meaning: 'Divide overflow', indicator: 'divideOverflow', available: true,
    notes: 'Turned off by this test, or by computer reset', tag: '[verified]', cite: J_CITE },
  { d: 'V', autocoder: ['BZ'], meaning: 'Zero balance', indicator: 'zeroBalance', available: true,
    notes: 'Turned off by computer reset and by power-on reset', tag: '[verified]', cite: J_CITE },
  { d: 'S', autocoder: ['BE'], meaning: 'Compare equal (B = A)', indicator: 'compareEqual', available: true,
    notes: 'Reset as a group by the next Compare / Table Lookup / BCE', tag: '[verified]', cite: J_CITE },
  { d: 'U', autocoder: ['BH'], meaning: 'Compare high (B > A)', indicator: 'compareHigh', available: true,
    notes: '', tag: '[verified]', cite: J_CITE },
  { d: 'T', autocoder: ['BL'], meaning: 'Compare low (B < A)', indicator: 'compareLow', available: true,
    notes: 'Computer reset turns this ON', tag: '[verified]', cite: J_CITE },
  { d: '/', autocoder: ['BU'], meaning: 'Compare unequal', indicator: 'compareUnequal', available: true,
    notes: 'Computer reset turns this ON', tag: '[verified]', cite: J_CITE },
  { d: '9', autocoder: ['BC9', 'BC91'], meaning: 'Carriage channel 9, channel 1 (1403)', indicator: null, available: true,
    notes: 'On when the channel-9 hole is sensed; off when any other carriage-tape channel is sensed. Answered by Channel.carriageChannel9, which reads the 1403 carriage (Phase 2 wave 4)', tag: '[verified]', cite: J_CITE },
  { d: '!', autocoder: ['BC92'], meaning: 'Carriage channel 9, channel 2', indicator: null, available: false,
    notes: 'Channel 2 is out of Phase-1 scope', tag: '[verified]', cite: J_CITE },
  { d: '@', autocoder: ['BCV', 'BCV1'], meaning: 'Carriage overflow (channel 12), channel 1', indicator: null, available: true,
    notes: 'Same on/off rule as channel 9. Answered by Channel.carriageChannel12, which reads the 1403 carriage (Phase 2 wave 4)', tag: '[verified]', cite: J_CITE },
  { d: '⌑', autocoder: ['BCV2'], meaning: 'Carriage overflow (channel 12), channel 2', indicator: null, available: false,
    notes: 'Channel 2 is out of Phase-1 scope', tag: '[verified]', cite: J_CITE },
  { d: 'R', autocoder: ['BPCB', 'BPCB1'], meaning: 'Printer carriage busy, channel 1', indicator: null, available: true,
    notes: 'Answered by Channel.carriageBusy, which is always false on this configuration — no overlap feature and an I/O term of 0 (CARRIAGE_NEVER_BUSY, channel.ts)', tag: '[verified]', cite: J_CITE },
  { d: 'L', autocoder: ['BPCB2'], meaning: 'Printer carriage busy, channel 2', indicator: null, available: false,
    notes: 'Channel 2 is out of Phase-1 scope', tag: '[verified]', cite: J_CITE },
  { d: 'Q', autocoder: ['BNQ', 'BNQ1'], meaning: 'Inquiry request, channel 1', indicator: null, available: true,
    notes: 'Set by the 1415 console INQUIRY REQUEST key; answered by Channel.inquiryRequest, which reads that latch (CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH, console1415.ts)', tag: '[verified]', cite: J_CITE },
  { d: '*', autocoder: ['BNQ2'], meaning: 'Inquiry request, channel 2', indicator: null, available: false,
    notes: 'Channel 2 is out of Phase-1 scope', tag: '[verified]', cite: J_CITE },
  // A22-0526-3 Figure 35's own wording for the BOL1/BOL2/7010 overlap indicators.
  { d: '1', autocoder: ['BOL1'], meaning: 'Overlap in process, channel 1', indicator: null, available: false,
    notes: 'Must be tested before any R/X status branch when Processing Overlap is installed, or the overlapped operation reverts to non-overlap. Overlap is out of Phase-1 scope', tag: '[verified]', cite: J_CITE },
  { d: '2', autocoder: ['BOL2'], meaning: 'Overlap in process, channel 2', indicator: null, available: false,
    notes: 'Channel 2 and overlap are both out of Phase-1 scope', tag: '[verified]', cite: J_CITE },
  { d: 'K', autocoder: [], meaning: 'Tape indicator', indicator: null, available: false,
    notes: 'Documented "for CE use" in A22-0526-3. In 1401 mode the same character means End of Reel — a different indicator on the same glyph', tag: '[verified]', cite: J_CITE },
  { d: 'N', autocoder: ['BOQ', 'BOQ1'], meaning: 'Outquiry, channel 1', indicator: null, available: false,
    notes: 'Not in Figure 35 — needs the 1414 model 4/5 serial adapter. Distinct from BQPR1 = Y 56789 N', tag: '[verified]', cite: J_CITE_AUTOCODER },
  { d: 'H', autocoder: ['BB1'], meaning: 'Binary card, channel 1', indicator: null, available: false,
    notes: 'Not in Figure 35 — requires the column-binary card feature', tag: '[verified]', cite: J_CITE_AUTOCODER },
  { d: '%', autocoder: ['BB2'], meaning: 'Binary card, channel 2', indicator: null, available: false,
    notes: 'Column-binary card feature, channel 2', tag: '[verified]', cite: J_CITE_AUTOCODER },
  { d: '4', autocoder: [], meaning: 'Overlap in process, channel 3', indicator: null, available: false,
    notes: '7010 only', tag: '[likely]', cite: J_CITE_7010 },
  { d: ')', autocoder: [], meaning: 'Overlap in process, channel 4', indicator: null, available: false,
    notes: '7010 only', tag: '[likely]', cite: J_CITE_7010 },
  { d: 'X', autocoder: [], meaning: 'Floating-point exponent underflow', indicator: null, available: false,
    notes: '7010 only, optional FP feature; reset by the test', tag: '[likely]', cite: J_CITE_7010 },
  { d: 'Y', autocoder: [], meaning: 'Floating-point exponent overflow', indicator: null, available: false,
    notes: '7010 only, optional FP feature; reset by the test', tag: '[likely]', cite: J_CITE_7010 },
  { d: 'A', autocoder: ['BSS A'], meaning: 'Sense switch A', indicator: null, available: false,
    notes: '1401 mode only (Compatibility feature). Not valid in native 1410', tag: '[verified]', cite: J_CITE_1401 },
  { d: 'B', autocoder: ['BSS B'], meaning: 'Sense switch B', indicator: null, available: false,
    notes: '1401 mode only', tag: '[verified]', cite: J_CITE_1401 },
  { d: 'C', autocoder: ['BSS C'], meaning: 'Sense switch C', indicator: null, available: false,
    notes: '1401 mode only', tag: '[verified]', cite: J_CITE_1401 },
  { d: 'D', autocoder: ['BSS D'], meaning: 'Sense switch D', indicator: null, available: false,
    notes: '1401 mode only', tag: '[verified]', cite: J_CITE_1401 },
  { d: 'E', autocoder: ['BSS E'], meaning: 'Sense switch E', indicator: null, available: false,
    notes: '1401 mode only', tag: '[verified]', cite: J_CITE_1401 },
  { d: 'F', autocoder: ['BSS F'], meaning: 'Sense switch F', indicator: null, available: false,
    notes: '1401 mode only', tag: '[verified]', cite: J_CITE_1401 },
  { d: 'G', autocoder: ['BSS G'], meaning: 'Sense switch G', indicator: null, available: false,
    notes: '1401 mode only', tag: '[verified]', cite: J_CITE_1401 },
  { d: '?', autocoder: [], meaning: 'Reader error', indicator: null, available: false,
    notes: '1401 mode only', tag: '[verified]', cite: J_CITE_1401 },
  { d: '‡', autocoder: [], meaning: 'Printer error', indicator: null, available: false,
    notes: '1401 mode only. Record mark, octal 032', tag: '[verified]', cite: J_CITE_1401 },
  { d: 'I', autocoder: [], meaning: 'Punch error', indicator: null, available: false,
    notes: '1401 mode only', tag: '[verified]', cite: J_CITE_1401 },
];

/** The `dModifiers` column value for the op `J` conditional row of opcodes.md §2. */
export const J_DMODS = dMap(J_D_TABLE);

// ═══ §6.2 — ops `R` (channel 1) and `X` (channel 2), branch on I/O status ═══
//
// The d-character's BIT CONFIGURATION selects which indicators to test; one to six may be
// tested by a single instruction, and "branch if any on" is the plural test.
// Masks are in our cell layout: bits 3-0 are 8421, bit 4 (0x10) is the A zone, bit 5
// (0x20) is the B zone (types.ts ZA / ZB).

export interface RxStatusBit {
  readonly mask: number;
  /** The d-character that tests this bit alone. */
  readonly dAlone: string;
  readonly octal: number;
  readonly autocoder: readonly [string, string];
  readonly status: keyof ChannelStatus;
  readonly when: string;
  readonly cite: string;
}

const RX_CITE = 'opcodes.md §6.2 / A22-0526-3 p.37 Figure 36, A22-0530-1 p.8';

export const RX_STATUS_BITS: readonly RxStatusBit[] = [
  { mask: 0x01, dAlone: '1', octal: 0o1, autocoder: ['BNR1', 'BNR2'], status: 'notReady',
    when: 'Before any transfer, if the device or its buffer is not ready. Operation terminated, no data transferred, machine does not stop', cite: RX_CITE },
  { mask: 0x02, dAlone: '2', octal: 0o2, autocoder: ['BCB1', 'BCB2'], status: 'busy',
    when: 'Before any transfer. Operation terminated, no data transferred', cite: RX_CITE },
  { mask: 0x04, dAlone: '4', octal: 0o4, autocoder: ['BER1', 'BER2'], status: 'dataCheck',
    when: 'After the transfer — parity error in the device, its buffer, or the processing unit', cite: RX_CITE },
  { mask: 0x08, dAlone: '8', octal: 0o10, autocoder: ['BEF1', 'BEF2'], status: 'condition',
    when: 'Normally before any transfer (e.g. card-reader end-of-file). Operation terminated, no data transferred', cite: RX_CITE },
  { mask: 0x20, dAlone: '-', octal: 0o40, autocoder: ['BWL1', 'BWL2'], status: 'wrongLengthRecord',
    when: 'The record written from or into storage is not the correct length (GM-WM mispositioned)', cite: RX_CITE },
  { mask: 0x10, dAlone: 'ƀ', octal: 0o20, autocoder: ['BNT1', 'BNT2'], status: 'noTransfer',
    when: 'Normally before any transfer; no data was available to transfer. SUBSTITUTE BLANK (A bit only, octal 20) — NOT an ASCII space, which has no bits and tests nothing (io.md §2)', cite: RX_CITE },
];

/**
 * `R (I) ⧧` / `X (I) ⧧` — group mark, octal 77, all six bits. Tests every status
 * indicator AND is the only form that releases the channel interlock without an actual
 * branch (opcodes.md §6.2, A22-0526-3 pp.37, 41). Autocoder BA1 / BA2.
 *
 * AMBIGUITY: A22-0530-1's typewriter face types both the group mark and the record mark
 * as a double dagger, so the printed `R(I)‡` in that manual does not by itself distinguish
 * octal 077 from octal 032 (opcodes.md §9.1 note). We key on the octal from §6.2's own
 * "group mark (octal 77)" row, which is unambiguous.
 */
export const RX_RELEASE_D_OCTAL = 0o77;
export const RX_RELEASE_D_GLYPH = '⧧';

// The interlock rules themselves are PROSE, not a table an executor reads: they live where they
// execute — `channel.ts` (the nine steps, the interlock, the six indicators) and
// `isa/exec/branch.ts` (which branch releases) — each quoting io.md §5 / A22-0526-3 pp.37-38, 42.

// NOTE: BRC1 / BRC2 "Branch Read Back Check" appear in the C28-0309-1 Autocoder table
// immediately after BER1/BER2 and would be a SEVENTH channel status condition beyond
// Figure 36's six. The d-character does not OCR reliably. `[unverified]` — deliberately
// NOT encoded (opcodes.md §6.2).

// ═══ §6.3 — op `V`, Branch if Word Mark Present, or Zone Equal ═════════════

export interface VModifier {
  /** The §6.3 "Instruction" cell. */
  readonly instruction: string;
  readonly d: string;
  readonly octal: number;
  readonly autocoder: string;
  /** The §6.3 "Branch condition" cell. */
  readonly condition: string;
  readonly cite: string;
}

const V_CITE = 'opcodes.md §6.3 / A22-0526-3 p.39 Figure 37';

export const V_D_TABLE: readonly VModifier[] = [
  { instruction: 'Branch if Word Mark Present', d: '1', octal: 0o1, autocoder: 'BW (I)(B)',
    condition: 'B-address character has a word-mark bit', cite: V_CITE },
  { instruction: 'Branch if Zone Bits Absent', d: '2', octal: 0o2, autocoder: 'BZN (I)(B)',
    condition: 'B character has neither a B nor an A bit', cite: V_CITE },
  { instruction: 'Branch if Zone Equal AB', d: 'B', octal: 0o62, autocoder: 'BZN (I)(B) AB',
    condition: 'B character has both B and A bits (plus test)', cite: V_CITE },
  { instruction: 'Branch if Zone Equal B', d: 'K', octal: 0o42, autocoder: 'BZN (I)(B) B',
    condition: 'B character has a B bit but no A bit (minus test)', cite: V_CITE },
  { instruction: 'Branch if Zone Equal A', d: 'S', octal: 0o22, autocoder: 'BZN (I)(B) A',
    condition: 'B character has an A bit but no B bit', cite: V_CITE },
  { instruction: 'Branch if WM, or Zone Bits Absent', d: '3', octal: 0o3, autocoder: 'BWZ (I)(B)',
    condition: 'word mark or no B and no A', cite: V_CITE },
  { instruction: 'Branch if WM, or Zone Equal AB', d: 'C', octal: 0o63, autocoder: 'BWZ (I)(B) AB',
    condition: 'word mark or both B and A', cite: V_CITE },
  { instruction: 'Branch if WM, or Zone Equal B', d: 'L', octal: 0o43, autocoder: 'BWZ (I)(B) B',
    condition: 'word mark or B but no A', cite: V_CITE },
  { instruction: 'Branch if WM, or Zone Equal A', d: 'T', octal: 0o23, autocoder: 'BWZ (I)(B) A',
    condition: 'word mark or A but no B', cite: V_CITE },
];

export const V_DMODS = dMap(
  V_D_TABLE.map((r) => ({ d: r.d, meaning: `${r.instruction} — ${r.condition}` })),
);

/**
 * The directly implementable rule behind the nine rows, verbatim from opcodes.md §6.3:
 * d bit 1 enables the word-mark test; d bit 2 enables the zone test, comparing the B and
 * A bits of the B-address character against the B and A bits of d. Both bits set = branch
 * on either condition. Always a one-character test; no B-field word mark needed.
 */
export const V_RULE =
  'branch if ((d & 0o1) && char has WM) || ((d & 0o2) && (char & 0o60) === (d & 0o60))';

// ═══ §6.4 — ops `F` (channel 1) and `2` (channel 2), Carriage Control ══════
//
// Data only: Phase 2 (the 1403) consumes this. The encoding rule is that the numeric
// (8421) portion of d is the channel number or space count and the zone portion selects
// the mode — no zone = immediate skip, BA = skip after print, B = immediate space,
// A = space after print. d-characters `3`, `C`, `L`, `T` all have numeric value 3 and
// give four different 3-factor operations.

export type CarriageMode = 'immediateSkip' | 'skipAfterPrint' | 'immediateSpace' | 'spaceAfterPrint';

export interface CarriageModifier {
  readonly d: string;
  readonly mode: CarriageMode;
  /** Carriage-tape channel 1-12 for skips, space count 1-3 for spaces. */
  readonly value: number;
  readonly meaning: string;
  readonly cite: string;
}

const CC_CITE = 'opcodes.md §6.4 / A22-0526-3 p.81 Figure 90';

export const CARRIAGE_D_TABLE: readonly CarriageModifier[] = [
  { d: '1', mode: 'immediateSkip', value: 1, meaning: 'immediate skip to channel 1', cite: CC_CITE },
  { d: '2', mode: 'immediateSkip', value: 2, meaning: 'immediate skip to channel 2', cite: CC_CITE },
  { d: '3', mode: 'immediateSkip', value: 3, meaning: 'immediate skip to channel 3', cite: CC_CITE },
  { d: '4', mode: 'immediateSkip', value: 4, meaning: 'immediate skip to channel 4', cite: CC_CITE },
  { d: '5', mode: 'immediateSkip', value: 5, meaning: 'immediate skip to channel 5', cite: CC_CITE },
  { d: '6', mode: 'immediateSkip', value: 6, meaning: 'immediate skip to channel 6', cite: CC_CITE },
  { d: '7', mode: 'immediateSkip', value: 7, meaning: 'immediate skip to channel 7', cite: CC_CITE },
  { d: '8', mode: 'immediateSkip', value: 8, meaning: 'immediate skip to channel 8', cite: CC_CITE },
  { d: '9', mode: 'immediateSkip', value: 9, meaning: 'immediate skip to channel 9', cite: CC_CITE },
  { d: '0', mode: 'immediateSkip', value: 10, meaning: 'immediate skip to channel 10', cite: CC_CITE },
  { d: '#', mode: 'immediateSkip', value: 11, meaning: 'immediate skip to channel 11', cite: CC_CITE },
  { d: '@', mode: 'immediateSkip', value: 12, meaning: 'immediate skip to channel 12', cite: CC_CITE },
  { d: 'A', mode: 'skipAfterPrint', value: 1, meaning: 'skip after print to channel 1', cite: CC_CITE },
  { d: 'B', mode: 'skipAfterPrint', value: 2, meaning: 'skip after print to channel 2', cite: CC_CITE },
  { d: 'C', mode: 'skipAfterPrint', value: 3, meaning: 'skip after print to channel 3', cite: CC_CITE },
  { d: 'D', mode: 'skipAfterPrint', value: 4, meaning: 'skip after print to channel 4', cite: CC_CITE },
  { d: 'E', mode: 'skipAfterPrint', value: 5, meaning: 'skip after print to channel 5', cite: CC_CITE },
  { d: 'F', mode: 'skipAfterPrint', value: 6, meaning: 'skip after print to channel 6', cite: CC_CITE },
  { d: 'G', mode: 'skipAfterPrint', value: 7, meaning: 'skip after print to channel 7', cite: CC_CITE },
  { d: 'H', mode: 'skipAfterPrint', value: 8, meaning: 'skip after print to channel 8', cite: CC_CITE },
  { d: 'I', mode: 'skipAfterPrint', value: 9, meaning: 'skip after print to channel 9', cite: CC_CITE },
  { d: '?', mode: 'skipAfterPrint', value: 10, meaning: 'skip after print to channel 10', cite: CC_CITE },
  { d: '.', mode: 'skipAfterPrint', value: 11, meaning: 'skip after print to channel 11', cite: CC_CITE },
  { d: '⌑', mode: 'skipAfterPrint', value: 12, meaning: 'skip after print to channel 12', cite: CC_CITE },
  { d: 'J', mode: 'immediateSpace', value: 1, meaning: 'immediate space 1', cite: CC_CITE },
  { d: 'K', mode: 'immediateSpace', value: 2, meaning: 'immediate space 2', cite: CC_CITE },
  { d: 'L', mode: 'immediateSpace', value: 3, meaning: 'immediate space 3', cite: CC_CITE },
  { d: '/', mode: 'spaceAfterPrint', value: 1, meaning: 'space 1 after print', cite: CC_CITE },
  { d: 'S', mode: 'spaceAfterPrint', value: 2, meaning: 'space 2 after print', cite: CC_CITE },
  { d: 'T', mode: 'spaceAfterPrint', value: 3, meaning: 'space 3 after print', cite: CC_CITE },
];

export const CARRIAGE_DMODS = dMap(
  CARRIAGE_D_TABLE.map((r) => ({ d: r.d, meaning: r.meaning })),
);

// ═══ §6.5 / io.md §2 — the I/O x-control field `O x1x2x3 bbbbb d` ══════════

export interface X1Channel {
  readonly glyph: string;
  readonly channel: 1 | 2 | 3 | 4;
  readonly overlap: boolean;
  /** false ⇒ decode rejects it: 7010 extension, not a 1410 feature. */
  readonly onThe1410: boolean;
  readonly tag: '[verified]' | '[likely]';
  readonly cite: string;
}

const X_CITE = 'opcodes.md §6.5 / A22-0526-3 pp.11, 92, 105 Figure 107; io.md §2';
const X_CITE_7010 = 'opcodes.md §6.5 / SimH i7010 decode — 7010 only, io.md §2';

/**
 * There is no `=` row. SimH's 7010 decode gives channel 4 overlap the glyph `=`, but `=` is not
 * one of the 64 BCD codes `bcd.ts` renders — octal 13, the code an assembler would emit for it,
 * prints `#` — so `decodeX`, which keys on `glyphOf`'s output, could never match such a row from
 * any storage content. It was dead by construction. `#` in x1 still fails, on the generic
 * "undefined x-control channel character" branch (test/wave7-rejections.test.ts).
 */
export const X1_CHANNEL: readonly X1Channel[] = [
  { glyph: '%', channel: 1, overlap: false, onThe1410: true, tag: '[verified]', cite: X_CITE },
  { glyph: '@', channel: 1, overlap: true, onThe1410: true, tag: '[verified]', cite: X_CITE },
  { glyph: '⌑', channel: 2, overlap: false, onThe1410: true, tag: '[verified]', cite: X_CITE },
  { glyph: '*', channel: 2, overlap: true, onThe1410: true, tag: '[verified]', cite: X_CITE },
  { glyph: '?', channel: 3, overlap: false, onThe1410: false, tag: '[likely]', cite: X_CITE_7010 },
  { glyph: '!', channel: 3, overlap: true, onThe1410: false, tag: '[likely]', cite: X_CITE_7010 },
  { glyph: '$', channel: 4, overlap: false, onThe1410: false, tag: '[likely]', cite: X_CITE_7010 },
];

export interface X2Device {
  readonly glyph: string;
  readonly device: string;
  readonly tag: '[verified]' | '[likely]';
  readonly cite: string;
}

export const X2_DEVICE: readonly X2Device[] = [
  { glyph: '1', device: 'Card reader, IBM 1402', tag: '[verified]', cite: X_CITE },
  { glyph: '2', device: 'Printer, IBM 1403', tag: '[verified]', cite: X_CITE },
  { glyph: '4', device: 'Card punch, IBM 1402', tag: '[verified]', cite: X_CITE },
  { glyph: 'D', device: 'Data transmission unit, IBM 1009', tag: '[verified]', cite: X_CITE },
  { glyph: 'F', device: 'Disk storage, IBM 1405 / 1301 (via 7631 File Control); io.md §2 reads the same glyph as 1311 per A22-6704', tag: '[verified]', cite: X_CITE },
  { glyph: 'K', device: 'Programmed transmission control, IBM 7750', tag: '[verified]', cite: X_CITE },
  { glyph: 'L', device: 'Teletype', tag: '[verified]', cite: X_CITE },
  { glyph: 'P', device: 'Paper tape reader, IBM 1011', tag: '[verified]', cite: X_CITE },
  { glyph: 'Q', device: 'Remote inquiry unit, IBM 1014', tag: '[verified]', cite: X_CITE },
  { glyph: 'S', device: 'Magnetic character reader, IBM 1412 / 1419 (A22-0530-1 Figure 3 OCRs it ambiguously as 5)', tag: '[verified]', cite: X_CITE },
  { glyph: 'T', device: 'Console I/O printer (1415)', tag: '[verified]', cite: X_CITE },
  { glyph: 'U', device: 'Magnetic tape unit, even parity (BCD)', tag: '[verified]', cite: X_CITE },
  { glyph: 'B', device: 'Magnetic tape unit, odd parity (binary)', tag: '[verified]', cite: X_CITE },
];

export interface MlModifier {
  readonly d: string;
  readonly meaning: string;
  readonly priorityFeatureOnly: boolean;
  readonly tag: '[verified]' | '[unverified]';
  readonly cite: string;
}

/**
 * d-modifiers for `M` / `L`. `$` and `X` are NOT tape-only — decode them at CHANNEL
 * level, before device dispatch (opcodes.md §6.5, conflict C17; IBM's own hand-keyed boot
 * template C28-0351-5 p.8 puts `$` on a 1402 read).
 * `S` / `C` are a SimH decode with no manual behind them and are deliberately not encoded.
 */
export const ML_D_TABLE: readonly MlModifier[] = [
  { d: 'R', meaning: 'Read into core storage. Tape read stops at the first inter-record gap or the first GM-WM in core; if the GM-WM is sensed first, data transfer stops but tape movement continues to the inter-record gap', priorityFeatureOnly: false, tag: '[verified]', cite: X_CITE },
  { d: 'W', meaning: 'Write from core storage. Stops at the first GM-WM in core, then produces an inter-record gap', priorityFeatureOnly: false, tag: '[verified]', cite: X_CITE },
  { d: '$', meaning: 'Read to inter-record gap or end of core, ignoring GM-WMs. Stops at the highest-numbered core position', priorityFeatureOnly: false, tag: '[verified]', cite: X_CITE },
  { d: 'X', meaning: 'Write to end of core, ignoring GM-WMs. Stops only at the highest-numbered core position', priorityFeatureOnly: false, tag: '[verified]', cite: X_CITE },
  { d: 'Q', meaning: 'I-O NOP, input status — Priority feature only. Identical to a read except no data transfer occurs (file addresses in file-address tests are still transferred)', priorityFeatureOnly: true, tag: '[verified]', cite: X_CITE },
  { d: 'V', meaning: 'I-O NOP, output status — Priority feature only', priorityFeatureOnly: true, tag: '[verified]', cite: X_CITE },
];

export const ML_DMODS = dMap(ML_D_TABLE.map((r) => ({ d: r.d, meaning: r.meaning })));

// ═══ §3.1 / §3.3 — op `D` Move / Scan, the two structural tables ═══════════
//
// With the types.ts cell layout, `d & 0x07` is bits 4/2/1 (the portion moved) and
// `d & 0x38` is bits B/A/8 (direction and terminator) — literally SimH's `op_mod & 070`.
// One function over two small tables, no 64-way dispatch (plan/architecture.md §4.8).
// Data only here; move.ts (Wave 5) consumes it.

export const MOVE_PORTION_MASK = 0x07;
export const MOVE_DIRECTION_MASK = 0x38;

export type MovePortion =
  | 'scan' | 'numeric' | 'zone' | 'zone+numeric' | 'word mark' | 'numeric+WM' | 'zone+WM' | 'all';

export interface MovePortionRow {
  /** `d & 0x07`. */
  readonly key: number;
  readonly portion: MovePortion;
  /** The portion letters of the Figure 21 mnemonic; '' for a scan. */
  readonly letters: string;
  readonly cite: string;
}

const D_CITE_ENCODING = 'opcodes.md §3.1 / A22-0526-3 p.25 Figure 19, Figure 21 p.26';

/** Bits 4 / 2 / 1 select the portion moved; none of 4/2/1 set = scan. */
export const MOVE_PORTION: readonly MovePortionRow[] = [
  { key: 0, portion: 'scan', letters: '', cite: D_CITE_ENCODING },
  { key: 1, portion: 'numeric', letters: 'N', cite: D_CITE_ENCODING },
  { key: 2, portion: 'zone', letters: 'Z', cite: D_CITE_ENCODING },
  { key: 3, portion: 'zone+numeric', letters: 'C', cite: D_CITE_ENCODING },
  { key: 4, portion: 'word mark', letters: 'W', cite: D_CITE_ENCODING },
  { key: 5, portion: 'numeric+WM', letters: 'NW', cite: D_CITE_ENCODING },
  { key: 6, portion: 'zone+WM', letters: 'ZW', cite: D_CITE_ENCODING },
  { key: 7, portion: 'all', letters: 'CW', cite: D_CITE_ENCODING },
];

export type MoveDirection = 'R→L' | 'L→R';

export interface MoveDirectionRow {
  /** `d & 0x38`. */
  readonly key: number;
  readonly bits: string;
  readonly direction: MoveDirection;
  readonly terminator: string;
  /** Figure 21's direction letter: L = right-to-Left, R = left-to-Right. Counter-intuitive but correct. */
  readonly dirLetter: 'L' | 'R';
  /** Figure 21's terminator letter; '' for "first WM in either field". */
  readonly termLetter: string;
  readonly cite: string;
}

/**
 * Bits B / A / 8 select direction and terminator. Addressing follows direction: for a
 * left-to-right move the A- and B-addresses are the LEFTMOST positions of their fields,
 * for right-to-left the RIGHTMOST. The position holding the terminating character is
 * moved/replaced like every other position.
 */
export const MOVE_DIRECTION: readonly MoveDirectionRow[] = [
  { key: 0x00, bits: '—', direction: 'R→L', terminator: 'after one position', dirLetter: 'L', termLetter: 'S', cite: D_CITE_ENCODING },
  { key: 0x10, bits: 'A', direction: 'R→L', terminator: 'A-field word mark', dirLetter: 'L', termLetter: 'A', cite: D_CITE_ENCODING },
  { key: 0x20, bits: 'B', direction: 'R→L', terminator: 'B-field word mark', dirLetter: 'L', termLetter: 'B', cite: D_CITE_ENCODING },
  { key: 0x30, bits: 'B A', direction: 'R→L', terminator: 'first WM in either field', dirLetter: 'L', termLetter: '', cite: D_CITE_ENCODING },
  { key: 0x08, bits: '8', direction: 'L→R', terminator: 'first WM in either field', dirLetter: 'R', termLetter: '', cite: D_CITE_ENCODING },
  { key: 0x18, bits: 'A 8', direction: 'L→R', terminator: 'A-field record mark', dirLetter: 'R', termLetter: 'R', cite: D_CITE_ENCODING },
  { key: 0x28, bits: 'B 8', direction: 'L→R', terminator: 'A-field GM-WM', dirLetter: 'R', termLetter: 'G', cite: D_CITE_ENCODING },
  { key: 0x38, bits: 'B A 8', direction: 'L→R', terminator: 'A-field RM or GM-WM', dirLetter: 'R', termLetter: 'M', cite: D_CITE_ENCODING },
];

export interface MoveRegEffect {
  /** `d & 0x38`, so the eight Figure 20 rows key the same way the direction table does. */
  readonly key: number;
  readonly terminatingControl: string;
  readonly direction: MoveDirection;
  readonly iar: RegExpr;
  readonly aar: RegExpr;
  readonly bar: RegExpr;
  readonly cite: string;
}

const D_CITE_REGS = 'opcodes.md §3.3 / A22-0526-3 Figure 20, p.26';

/**
 * Move — address registers after operation. `opcodes.md` §2 prints only "NSI / see §3.2"
 * in the `D` row's register column because the effect is per-d; this is the eight-row
 * figure it points at, in the figure's own order.
 */
export const MOVE_REG_EFFECTS: readonly MoveRegEffect[] = [
  { key: 0x08, terminatingControl: 'First word mark in either field', direction: 'L→R', iar: 'NSI', aar: 'A+LW', bar: 'B+LW', cite: D_CITE_REGS },
  { key: 0x18, terminatingControl: 'A-field record mark', direction: 'L→R', iar: 'NSI', aar: 'A+LA', bar: 'B+LA', cite: D_CITE_REGS },
  { key: 0x28, terminatingControl: 'A-field group-mark-with-word-mark', direction: 'L→R', iar: 'NSI', aar: 'A+LA', bar: 'B+LA', cite: D_CITE_REGS },
  { key: 0x38, terminatingControl: 'A-field record mark or GM-WM', direction: 'L→R', iar: 'NSI', aar: 'A+LA', bar: 'B+LA', cite: D_CITE_REGS },
  { key: 0x00, terminatingControl: 'After one storage position', direction: 'R→L', iar: 'NSI', aar: 'A-1', bar: 'B-1', cite: D_CITE_REGS },
  { key: 0x10, terminatingControl: 'A-field word mark', direction: 'R→L', iar: 'NSI', aar: 'A-LA', bar: 'B-LA', cite: D_CITE_REGS },
  { key: 0x20, terminatingControl: 'B-field word mark', direction: 'R→L', iar: 'NSI', aar: 'A-LB', bar: 'B-LB', cite: D_CITE_REGS },
  { key: 0x30, terminatingControl: 'First word mark in either field', direction: 'R→L', iar: 'NSI', aar: 'A-LW', bar: 'B-LW', cite: D_CITE_REGS },
];

/**
 * THE SUBSTITUTE-BLANK TRAP. BCD 16 / octal 20 (A bit only) is the substitute blank `ƀ`,
 * a distinct 1410 graphic (A22-0526-3 Figure 4 "Symbol Names", p.7) — NOT an ASCII space.
 * `SCNLA a,b` assembles as `D (A)(B) ƀ` (octal 20) while `SCNLS a,b` assembles as
 * `D (A)(B) blank` (true blank, octal 00): the two appear on adjacent appendix lines,
 * which is what makes the distinction unambiguous. The same character is BNT1/BNT2's d
 * (§6.2 above). An assembler that emits an ASCII space for either turns the instruction
 * into a different one (opcodes.md §3.2, charset.md §2).
 */
export const SUBSTITUTE_BLANK_OCTAL = 0o20;
export const TRUE_BLANK_OCTAL = 0o0;
