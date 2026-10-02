// src/asm/emit.ts — pass 2: resolve, encode, emit cells (docs/plans/phase-3-autocoder.md §6.2,
// §8.1, §8.2; wave 2).
//
// Pass 1 (`symbols.ts`, wave 4) walks the assignment counter and hands pass 2 a SIZED statement:
// the statement, the address it occupies and its length. Pass 2 resolves every operand against
// the symbol table, encodes the addresses, and produces `EmittedItem[]` — which is both
// `pack.ts`'s input and the LEFT-HAND SIDE of the closed-loop oracle (§11.1).
//
// THREE RULES THIS FILE IS THE ONLY PLACE FOR:
//
//  1. `encodeAddress` is PHASE-3-OWNED because `src/core/address.ts` exports `addressDigit`,
//     `decodeAddress`, `resolveIndex` and `checkAddress` and NO ENCODER, and its
//     `TAG_A_TENS` … `TAG_B_HUND` are module-private (§8.1). The weights below are therefore a
//     SECOND statement of a `[verified]` fact (research/architecture.md §5's index-tag table and
//     its weights line, A22-0526-3 p.14 Fig. 10), and the only thing that keeps them from being a
//     second transcription free to drift is that they are verified ONLY by round-tripping through
//     the shipped `decodeAddress` — every tag 0-15 over a boundary-plus-sample sweep, plus the two
//     tagged addresses already sitting in `src/formats/loader.ts` (`00A?0` = 00100 tag 15 at
//     00318, `00?!0` = 00000 tag 14 at 00330). One implementation, one test; if the weights ever
//     move, one test fails and not two tables (`test/asm-emit.test.ts`).
//
//  2. `applyToStorage` writes payload cells and word marks and NOTHING ELSE. That is what makes
//     the closed loop an oracle rather than a restatement: the loader's terminating GM-WM at
//     `loadAddress + count` (opcodes.md §3.1, quoted in loader.ts's own NOTE) shows up on the
//     machine side as a named, asserted DIFFERENCE instead of being mirrored on both sides
//     (§11.1). Do not "fix" it by planting marks here.
//
//  3. `AssemblerBug` is the only throw a SOURCE DECK can reach in `src/asm`, and what it means
//     is an ASSEMBLER-INTERNAL invariant violation — never source content (§6.3). (The
//     `RangeError`s in `mnemonics.ts` and `operand.ts`'s `mustCode` are construction-time guards
//     on glyphs and rows those files chose themselves; no operand text reaches them either.) §4's signature table words the trigger
//     "internal invariant violation, e.g. an assembled length not in `OPS[octal].forms[].lengths`":
//     the length is the EXAMPLE, and `mustCode` below is the other site — a glyph THIS FILE chose
//     that `bcdOfGlyph` does not know. THE SENTINEL on the length check: `ANY_LENGTH` is the EMPTY
//     ARRAY (`src/core/isa/table.ts:88`) and it is what `N` carries, so the check reads
//     `lengths.length === 0 || lengths.includes(n)` — a naive `includes` throws on every NOP in a
//     source deck. Source defects never reach either site: an operand list that makes no form the
//     op carries is an `F` from `checkOperandShape` BEFORE the length check runs, and every other
//     defect is F / U / M / O on a listing line (software.md §6), which is what `flag` and `why`
//     below carry.

import { bcdOfGlyph, glyphOf } from '../core/bcd.js';
import { WORD_SEPARATOR } from '../core/channel.js';
import { GROUP_MARK_BCD } from '../core/move.js';
import { BCD6, WM, ZA, ZB, type Addr } from '../core/types.js';
import { resolve, type MnemonicRow } from './mnemonics.js';
import {
  CORE_SIZE_DEFAULT,
  type AsmFlag, type EmittedItem, type Literal, type Operand, type Statement, type SymbolTable,
} from './types.js';

// ═══ The `// OPEN:` ledger for this file — plan §15 ═════════════════════════════════════════
//
// `ONE_FLAG_PER_LISTING_LINE` is this file's second §15 row and is NOT here: §15 puts each
// `// OPEN:` comment at its POINT OF USE, and that constant's point of use is `FLAG_ORDER` and
// `strongest()` further down, which are the precedence it names.

/**
 * OPEN: `DA_EMITS_ONLY_ITS_MARKED_POSITIONS` — `[unverified]` for the standalone. The condensed
 * format CANNOT set a word mark without storing a character — a word separator marks the *next*
 * stored character (software.md §8.1's verbatim NOTE) — so a DA emits one marked blank per
 * defined field high-order and clears nothing else. That is as close to C28-0309-1's silence and
 * to DS's "the area is not cleared prior to reservation" (software.md §5, C28-0326-2 p.30) as the
 * format permits. Fallback: the OS behaviour — clear the whole reserved area to blanks before
 * setting the marks (C28-0326-2 p.25) — which is one switch in `emitDefineArea` below.
 * `open-questions.md`, Phase 3 / Wave 2.
 */
export const DA_EMITS_ONLY_ITS_MARKED_POSITIONS = true;

// ═══ AssemblerBug ══════════════════════════════════════════════════════════════════════════

/**
 * The one throw in `src/asm`, and a real class rather than a declaration (§4's signature table).
 * Thrown ONLY for an assembler-internal invariant violation — an assembled length that is not in
 * the op's `lengths` — never for anything a source deck can contain (§6.3).
 */
export class AssemblerBug extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssemblerBug';
  }
}

/**
 * `OPS[octal].forms[].lengths` VALIDATES an assembled length and never drives it (§6.1). THE ANY
 * SENTINEL IS THE EMPTY ARRAY, so an op carrying `ANY_LENGTH` — `N`, and only `N` — accepts every
 * length. `MnemonicRow.lengths` is `lengthsOf(op)`, every length the op's forms carry.
 */
export function checkAssembledLength(row: MnemonicRow, length: number, seqno: number): void {
  if (row.lengths.length === 0 || row.lengths.includes(length)) return;
  throw new AssemblerBug(
    `seqno ${seqno}: '${row.mnemonic}' assembled ${length} characters, but op '${row.opChar}' `
    + `carries lengths [${row.lengths.join(', ')}] (opcodes.md §2 / isa/table.ts). `
    + 'This is an assembler bug, not a source error.',
  );
}

// ═══ Address encoding — §8.1 ═══════════════════════════════════════════════════════════════

/** Five characters: ten-thousands, thousands, hundreds, tens, units (architecture.md §4). */
export const ADDRESS_LENGTH = 5;

// research/architecture.md §5's index-tag table, weights line: A-over-tens = 1, B-over-tens = 2,
// A-over-hundreds = 4, B-over-hundreds = 8 `[verified — A22-0526-3 p.14 Fig. 10]`. Written ONCE
// and used once — see rule 1 in this file's header for why there is no second table.
const TAG_A_TENS = 1, TAG_B_TENS = 2, TAG_A_HUND = 4, TAG_B_HUND = 8;
const HUNDREDS_INDEX = 2, TENS_INDEX = 3;

/**
 * A glyph THIS FILE chose — a decimal digit, a blank, an op character off `table.ts` — turned into
 * its BCD code. Every caller passes a glyph the 64-character set contains, so a miss is an
 * assembler-internal invariant violation and raises `AssemblerBug` and not a bare `RangeError`:
 * §6.3 and this file's own header say `AssemblerBug` is the ONE throw in `src/asm`, and §4's table
 * reads "internal invariant violation, e.g. an assembled length…" — the length check is an example
 * of the trigger, not the whole of it. NOTHING a source deck can contain reaches here: a d-modifier
 * or an x-control glyph the source wrote goes through `bcdOfGlyph` directly and is an `F`.
 */
function mustCode(glyph: string): number {
  const code = bcdOfGlyph(glyph);
  if (code === undefined) throw new AssemblerBug(`emit.ts: "${glyph}" is not one of the 64 machine glyphs`);
  return code;
}

/** BCD for `0`-`9`, off `bcd.ts` rather than transcribed (charset.md §2). */
const DIGIT_BCD: readonly number[] = [...'0123456789'].map(mustCode);

/**
 * A five-digit address as it sits in STORAGE: BCD digits with the index tag as zone bits over the
 * tens and hundreds positions. The result carries no word mark and no C bit — the deck has no
 * parity (objectdeck.ts's header), and the caller marks the op character, never a field.
 *
 * DOMAIN: `0 <= value < 100000` and `0 <= tag <= 15`. Pass 2 guarantees both — it range-checks
 * every address against `coreSize` (≤ 80 000) and flags `F` before it gets here, and substitutes
 * 0 for anything it could not resolve — so the out-of-domain branch below is unreachable from a
 * source deck and encodes 00000 rather than throwing (§6.3: the only throw is `AssemblerBug`).
 */
export function encodeAddress(value: number, tag: number): Uint8Array {
  const cells = new Uint8Array(ADDRESS_LENGTH);
  let n = Number.isInteger(value) && value >= 0 && value < 10 ** ADDRESS_LENGTH ? value : 0;
  for (let i = ADDRESS_LENGTH - 1; i >= 0; i--) {
    cells[i] = DIGIT_BCD[n % 10] ?? 0;
    n = Math.floor(n / 10);
  }
  const tens = ((tag & TAG_A_TENS) !== 0 ? ZA : 0) | ((tag & TAG_B_TENS) !== 0 ? ZB : 0);
  const hund = ((tag & TAG_A_HUND) !== 0 ? ZA : 0) | ((tag & TAG_B_HUND) !== 0 ? ZB : 0);
  cells[TENS_INDEX] = (cells[TENS_INDEX] ?? 0) | tens;
  cells[HUNDREDS_INDEX] = (cells[HUNDREDS_INDEX] ?? 0) | hund;
  return cells;
}

/** The glyphs a listing prints for a run of cells — a zone-tagged digit renders as its own
 *  glyph, which is what the manual prints (`D 030Y9 00140 C`, §4's `instruction` comment). */
function glyphsOf(cells: Uint8Array | readonly number[]): string {
  let text = '';
  for (const cell of cells) text += glyphOf(cell & BCD6);
  return text;
}

// ═══ applyToStorage — the closed loop's LEFT-HAND SIDE (§11.1) ═════════════════════════════

/**
 * Write what pass 2 emitted into a `Storage`-shaped thing: characters and word marks, and
 * NOTHING else — no group marks, no clearing, no gaps filled. The parameter is structural rather
 * than `Storage` so a test can hand it any recorder; `CoreStorage.setChar` satisfies it and
 * recomputes C (charset.md §1).
 */
export function applyToStorage(
  items: readonly EmittedItem[],
  st: { setChar(a: Addr, bcd6: number, wm: boolean): void },
): void {
  for (const item of items) {
    for (const [i, cell] of item.cells.entries()) {
      st.setChar(item.at + i, cell & BCD6, (cell & WM) !== 0);
    }
  }
}

// ═══ What pass 1 hands pass 2 ══════════════════════════════════════════════════════════════

/**
 * One statement, sized. `at` and `length` are pass 1's (`symbols.ts`, wave 4); wave 2's tests
 * build them by hand, which is the whole point of building emission before the front end (§11).
 */
export interface SizedStatement {
  readonly statement: Statement;
  /** The assignment counter at this statement — the HIGH-order position it occupies. */
  readonly at: Addr;
  /** CT: the assembled length of an imperative, or the positions a declarative reserves. */
  readonly length: number;
  /** DA only: the high-order position of every DEFINED field, from pass 1's sub-entry walk. */
  readonly daFields?: readonly Addr[];
  /** A processor-generated DCW at a pool flush point — LTORG, or END (software.md §5). When set
   *  it decides the emission, whatever the statement's own operation field says. */
  readonly pooled?: Literal;
}

/** What one sized statement produced. `items` is empty for DS, EQU, a control and a comment. */
export interface EmittedStatement {
  readonly seqno: number;
  readonly at: Addr;
  readonly items: readonly EmittedItem[];
  /** The INSTRUCTION column, in the manual's own spacing: `D 00394 00306 L`. */
  readonly instruction?: string;
  /** ONE flag, precedence O > F > M > U (ONE_FLAG_PER_LISTING_LINE, §15). Data, never a throw. */
  readonly flag?: AsmFlag;
  readonly why?: string;
}

export interface Pass2Result {
  /** Every item, in EMISSION order — `pack.ts`'s input and `applyToStorage`'s (§6, §8.3). */
  readonly items: readonly EmittedItem[];
  readonly statements: readonly EmittedStatement[];
}

// ─── The operation partition, §2.2's fifteen in-scope pseudo-operations ─────────────────────
const DECLARATIVES: ReadonlySet<string> = new Set(['DCW', 'DC', 'DS', 'DA', 'EQU']);
/** Assemble no characters at all: a listing line and an untouched counter (§6.1). */
const NON_EMITTING: ReadonlySet<string> = new Set(
  ['ORG', 'LTORG', 'END', 'JOB', 'CTL', 'RUN', 'LOAD', 'EJECT', 'RESEQ', 'PST'],
);

/**
 * OPEN: `ONE_FLAG_PER_LISTING_LINE` — `[unverified]`. The claim: the listing has ONE FLAG column
 * holding ONE letter, and where a line earns several the precedence is **O > F > M > U** — you
 * cannot judge an operand before you know the op, or a label before you can parse the line
 * (§6.3). No source says whether a line can print several: `software.md` §6 publishes the
 * STANDALONE flag set F / U / M / O (C28-0309-1 pp.17-20) and names no precedence, and
 * `console-and-physical.md` §12 publishes the OS listing's column SET without its metrics.
 * Fallback: widen FLAG to four positions and print every flag the line earned — `Accum.flags`
 * already collects them all, so the fallback is `strongest()` returning the list instead of the
 * first hit. `open-questions.md`, Phase 3 / Wave 2.
 *
 * POINT OF USE, which is why the constant is here and not in the ledger at the head of the file:
 * `FLAG_ORDER` below IS the precedence, and `strongest()` IS the one-letter reduction.
 */
export const ONE_FLAG_PER_LISTING_LINE = true;

/** The precedence ONE_FLAG_PER_LISTING_LINE names, in order. */
const FLAG_ORDER: readonly AsmFlag[] = ['O', 'F', 'M', 'U'];

interface Flagged {
  readonly flag: AsmFlag;
  readonly why: string;
  /**
   * This flag SUPPRESSED characters the form calls for, so the assembled length is no longer the
   * written shape. It is what the length check at the foot of `emitImperative` stands down for,
   * and the marker exists so the stand-down can be NARROW: a `U` or a range-check `F` changes no
   * length and must not hide a real invariant violation.
   */
  readonly drops: boolean;
}

interface Accum {
  readonly cells: number[];
  readonly fields: string[];
  readonly flags: Flagged[];
}

const accum = (): Accum => ({ cells: [], fields: [], flags: [] });

/** `drops` = this flag dropped characters the form calls for; see `Flagged.drops`. */
function flagged(acc: Accum, flag: AsmFlag, why: string, drops = false): void {
  acc.flags.push({ flag, why, drops });
}

/** One flag per line, by precedence — ONE_FLAG_PER_LISTING_LINE above (§6.3, §15). */
function strongest(acc: Accum): Flagged | undefined {
  for (const flag of FLAG_ORDER) {
    const hit = acc.flags.find((f) => f.flag === flag);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

// ═══ Operand resolution — §6.2 steps 1-3 ═══════════════════════════════════════════════════

interface Context {
  readonly symbols: SymbolTable;
  readonly coreSize: number;
  readonly at: Addr;
  readonly length: number;
}

/**
 * A symbol lookup, and the U flag when it misses. VALUE 0 ON A MISS is deliberate: every later
 * address stays right, so one undefined symbol produces one flagged line rather than a listing
 * whose whole ladder has slid (§6.2 step 1).
 *
 * A pooled literal is looked up under the literal's own TEXT, which is the key pass 1's flush
 * enters it under. There is no collision: a symbol is ≤10 characters, alphabetic-first and
 * special-free (§5.2 rule 9), so `@AB@`, `+LABEL`, `#5` and `-123` are names no source can write.
 */
function lookup(name: string, ctx: Context, acc: Accum): number {
  const entry = ctx.symbols.get(name);
  if (entry !== undefined) return entry.value;
  flagged(acc, 'U', `${name} is not defined`);
  return 0;
}

function operandValue(operand: Operand, ctx: Context, acc: Accum): number {
  switch (operand.kind) {
    case 'actual':
      return operand.actual ?? 0;
    // The ASTERISK AS AN ORDINARY OPERAND is the address of the LAST character of the instruction
    // it appears in — `BA1 *+1` at 00517 is 00524, not 00530 (software.md §2 `[verified]`, §10
    // trap 4). The EQU / ORG / LTORG reading — the current assignment counter — is pass 1's and
    // lives at a different call site; the two never share a helper (§5.2).
    case 'asterisk':
      return ctx.at + ctx.length - 1;
    case 'symbolic':
    case 'addressConstant':
      return lookup(operand.symbol ?? operand.text, ctx, acc);
    case 'literal':
      return lookup(operand.literal?.text ?? operand.text, ctx, acc);
    default:
      return 0;
  }
}

/** 0..15. Wave 3 records only the RIGHTMOST index term (software.md §2), so this resolves one
 *  tag: the written number, or the index register an EQU gave the tail symbol. */
function operandTag(operand: Operand, ctx: Context, acc: Accum): number {
  if (operand.tagSymbol === undefined) return operand.tag;
  const entry = ctx.symbols.get(operand.tagSymbol);
  const register = entry?.indexRegister;
  if (register === undefined) {
    flagged(acc, 'U', `${operand.tagSymbol} is not equated to an index register`);
    return 0;
  }
  return register;
}

/** Resolve, range-check against the CTL core size, encode, and push five characters. */
function pushAddress(operand: Operand, ctx: Context, acc: Accum): void {
  const value = operandValue(operand, ctx, acc) + operand.adjust;
  const tag = operandTag(operand, ctx, acc);
  if (value < 0 || value >= ctx.coreSize) {
    flagged(acc, 'F', `address ${value} is outside the ${ctx.coreSize}-position core (CTL column 22)`);
  }
  const cells = encodeAddress(value, tag);
  acc.cells.push(...cells);
  acc.fields.push(glyphsOf(cells));
}

/** The three-position x-control field, written as operand 1 of the `lengths: [10]` form. It is
 *  never resolved, never adjusted and never tagged (types.ts `AddressKind`, §5.2 step 3 rule 1);
 *  wave 3 validates its glyphs against `dmods.ts`. Here it is copied through. */
function pushXControl(operand: Operand, acc: Accum): void {
  const glyphs = [...operand.text];
  if (glyphs.length !== 3) {
    flagged(acc, 'F', `the x-control field is always 3 positions; "${operand.text}" is ${glyphs.length}`, true);
    return;
  }
  for (const glyph of glyphs) {
    const code = bcdOfGlyph(glyph);
    if (code === undefined) {
      flagged(acc, 'F', `"${glyph}" is not one of the 64 machine glyphs`, true);
      return;
    }
    acc.cells.push(code);
  }
  acc.fields.push(operand.text);
}

/**
 * The d actually assembled. THREE RULINGS, §5.2: the mnemonic's baked d stands when nothing is
 * written; an explicit d WINS over a baked one (which is what makes `BZN LOOP,SWITCH,AB` and any
 * d the mnemonic table has no name for writable at all); and for `V` the written token is a ZONE
 * WORD naming a d, not the d itself (`V_ZONE_WORD_IS_THE_THIRD_OPERAND`, mnemonics.ts).
 */
function dOf(row: MnemonicRow, statement: Statement): string | undefined {
  const written = statement.d;
  if (written === undefined) return row.d;
  const zoned = row.zoneWords?.[written];
  return zoned ?? written;
}

// ═══ The operand shape — §6.1's ladder, and why a mismatch is an `F` and never a bug ═══════

/** The three operand slots a form can take. The assembled length falls out of them: one op
 *  character, three for an x-control field, five per address, one for a d. */
interface FormShape {
  readonly xcontrol: boolean;
  readonly addresses: number;
  readonly d: boolean;
}

/**
 * Plan §6.1's shape ladder, keyed by the assembled length its layout produces — the table §6.1
 * enumerated OFF `table.ts` rather than from memory, restated here in the three slots the emitter
 * actually fills. Every length any resolvable mnemonic carries is a key: over all 166 rows the
 * union of `lengths` is {1, 2, 6, 7, 10, 11, 12}, plus `ANY_LENGTH` — the empty array, `N` alone.
 * (§6.1's fifth row, length 5 = op + unit + d, is `U` tape unit control: OUT OF SCOPE and
 * unresolvable, so no row can reach it; `layoutOf` degrades to the bare length if one ever does.)
 */
const FORM_SHAPES: ReadonlyMap<number, FormShape> = new Map([
  [1, { xcontrol: false, addresses: 0, d: false }],    // op alone, everything chained
  [2, { xcontrol: false, addresses: 0, d: true }],     // op + d — carriage, stacker, MICR
  [6, { xcontrol: false, addresses: 1, d: false }],    // op + one 5-digit address
  [7, { xcontrol: false, addresses: 1, d: true }],     // op + one address + d
  [10, { xcontrol: true, addresses: 1, d: true }],     // op + x-control + address + d — `L`, `M`
  [11, { xcontrol: false, addresses: 2, d: false }],   // op + two addresses
  [12, { xcontrol: false, addresses: 2, d: true }],    // op + two addresses + d
]);

const slots = (shape: FormShape): string[] => {
  const parts: string[] = [];
  if (shape.xcontrol) parts.push('a 3-position x-control field');
  if (shape.addresses === 1) parts.push('one address');
  if (shape.addresses > 1) parts.push(`${shape.addresses} addresses`);
  if (shape.d) parts.push('a d');
  return parts;
};

/** A form length as §6.1's Layout column reads it: `10 (op + a 3-position x-control field + …)`. */
function layoutOf(length: number): string {
  const shape = FORM_SHAPES.get(length);
  if (shape === undefined) return `${length} characters`;
  const parts = slots(shape);
  return parts.length === 0 ? 'op alone, everything chained' : ['op', ...parts].join(' + ');
}

/** What the statement WROTE, in the same three slots. A `blank` operand is chaining and fills no
 *  slot, which is what makes the chained forms 1 and 6 characters long (§6.1 row 1). */
function wroteShape(statement: Statement, d: string | undefined): FormShape {
  return {
    xcontrol: statement.operands.some((operand) => operand.kind === 'xcontrol'),
    addresses: statement.operands.filter(
      (operand) => operand.kind !== 'xcontrol' && operand.kind !== 'blank',
    ).length,
    d: d !== undefined,
  };
}

/** Which of the shortest form's slots the statement left empty. */
function missingSlots(want: FormShape | undefined, wrote: FormShape): string {
  if (want === undefined) return 'the operand field';
  const gaps: string[] = [];
  if (want.xcontrol && !wrote.xcontrol) gaps.push('the 3-position x-control field');
  const short = want.addresses - wrote.addresses;
  if (short === 1) gaps.push('the address');
  else if (short > 1) gaps.push(`${short} addresses`);
  if (want.d && !wrote.d) gaps.push('the d');
  return gaps.length === 0 ? 'the operand field' : gaps.join(', ');
}

/**
 * THE SOURCE-SIDE HALF OF §6.3, and the reason a blank operand field cannot reach `AssemblerBug`.
 * An operand list that makes no form the op carries is a SOURCE defect, so it is an `F` with the
 * slot named and cited to the form's own shape: `CC1` with nothing after it is a missing d,
 * `R1W` with nothing after it is a missing x-control field and address (its d is baked), and
 * `H 00500,00600` is one address too many. Before this check each of those assembled a length the op does not carry and
 * threw — which §6.3 forbids source content from doing.
 *
 * WHAT THE FLAG DROPS, and it is nothing the statement wrote: the op character and every operand
 * that WAS written are already in `acc`, so the item still lands at pass 1's address and the
 * line still carries its ADDRS and its reservation. That is
 * `FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS` (§15) applied to an imperative — the flag drops only
 * what could not be built. The too-many case keeps the extra operands rather than truncating to a
 * plausible-looking instruction, so the defect is visible in the listing's INSTRUCTION column;
 * the deck is returned and is simply wrong, `ok` is false and the view refuses to hopper it (§4).
 *
 * Returns true when it flagged, and the length check below then stands down: the assembled length
 * IS the shape, and re-reporting one defect as an assembler bug is what §6.3 forbids.
 */
function checkOperandShape(
  row: MnemonicRow,
  wrote: FormShape,
  assembled: number,
  acc: Accum,
): boolean {
  // ANY_LENGTH — the empty array, `N` alone — takes every shape, exactly as it takes every length.
  if (row.lengths.length === 0 || row.lengths.includes(assembled)) return false;

  const wrotePart = slots(wrote);
  const said = `'${row.mnemonic}' with ${wrotePart.length === 0 ? 'no operands' : wrotePart.join(' + ')} `
    + `assembles ${assembled} character${assembled === 1 ? '' : 's'}, and op '${row.opChar}' carries `
    + `${row.lengths.map((n) => `${n} (${layoutOf(n)})`).join('; ')} `
    + "(plan §6.1's shape ladder, off isa/table.ts)";

  // `MnemonicRow.lengths` is deduplicated and ASCENDING, so [0] is the shortest form and the last
  // is the longest, which is what tells an `operand missing` apart from a `too many operands`.
  const shortest = row.lengths[0] ?? 0;
  const longest = row.lengths[row.lengths.length - 1] ?? 0;
  if (assembled < shortest) {
    flagged(acc, 'F', `operand missing — ${missingSlots(FORM_SHAPES.get(shortest), wrote)}: ${said}`, true);
  } else if (assembled > longest) {
    flagged(acc, 'F', `too many operands: ${said}`, true);
  } else {
    flagged(acc, 'F', `the operands make no form this op carries: ${said}`, true);
  }
  return true;
}

// ═══ Emission — §8.2's table, row by row ═══════════════════════════════════════════════════

/**
 * DCW / DC / a pooled literal / an area-defining literal: the constant's own cells. `Literal`
 * carries the mark on its high-order position already (types.ts, whose contract is "WM
 * high-order" and nothing else — so the HIGH-ORDER cell is the only one whose mark this file
 * decides), so DC is the same cells with that one bit cleared: under load mode the DC's extent
 * arrives unmarked, which is what clears any word marks standing there (software.md §5's
 * correction, `[likely]`).
 *
 * TWO CELL SHAPES THE OBJECT DECK CANNOT CARRY MARKED, closed HERE so the assembler cannot build
 * a record `encodeObjectRecord` would throw on (§8.3: "the packer must never hand it a record it
 * will reject", and a throw out of the encoder is not one of the four flags):
 *
 *  · a **group mark** (`GROUP_MARK_BCD`, 0o77) — a load-mode read would assemble a live
 *    group-mark-with-word-mark in core and terminate the record early with a spurious WLR
 *    (`OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK`, src/formats/objectdeck.ts, `[likely]`;
 *    research/io.md §3), and our own loader's `D 00100 00?!0 Δ` terminates on exactly that
 *    pattern, so the move would truncate too;
 *  · a **word separator** (`WORD_SEPARATOR`, 0o35) — C28-0309-1 Figure 2's NOTE, verbatim
 *    (software.md §8.1): "Word separator characters cannot be loaded with an associated word
 *    mark." The separator is punctuation in the deck; there is no column left to mark it from.
 *
 * WHAT THE FLAG DROPS: the MARK, and only the mark. The characters, the reservation and every
 * address stand — plan §2.2's DCW/DC `,G` row is the same ruling on the same rejection
 * (`FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS`, §15), and §2.4 is why the rejection is recorded and
 * escalated rather than patched. A program that wants the mark sets it at run time with a `,` Set
 * Word Mark, which is §2.4's own remedy.
 */
function constantCells(cells: Uint8Array, marked: boolean, acc: Accum): Uint8Array {
  const out = Uint8Array.from(cells);
  const first = out[0];
  if (first === undefined) return out;
  const bcd = first & BCD6;
  if (!marked) {
    out[0] = bcd;
    return out;
  }
  if (bcd === GROUP_MARK_BCD) {
    flagged(acc, 'F',
      'a word mark over the GROUP MARK in the high-order position: the condensed deck cannot '
      + 'carry it — a load-mode read would assemble a live group-mark-with-word-mark and end the '
      + 'record early (OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK, src/formats/objectdeck.ts; io.md '
      + '§3, software.md §8.1). The constant is emitted UNMARKED; the reservation and every '
      + 'address stand (plan §2.2 DCW/DC `,G`, §2.4)');
    out[0] = bcd;
    return out;
  }
  if (bcd === WORD_SEPARATOR) {
    flagged(acc, 'F',
      'a word mark over the WORD SEPARATOR in the high-order position: C28-0309-1 Figure 2\'s '
      + 'NOTE, verbatim (software.md §8.1) — "Word separator characters cannot be loaded with an '
      + 'associated word mark". The constant is emitted UNMARKED; the reservation and every '
      + 'address stand (plan §2.2 DCW/DC `,G`, §2.4)');
    out[0] = bcd;
    return out;
  }
  out[0] = first | WM;
  return out;
}

function emitDeclarative(sized: SizedStatement, ctx: Context, acc: Accum): EmittedItem[] {
  const { statement } = sized;
  const op = statement.op.toUpperCase();
  const operand = statement.operands[0];
  const seqno = statement.seqno;

  // DS emits NOTHING and does not clear the area — "no information is entered into the area, no
  // word mark is assigned by the processor, and the area is not cleared prior to reservation"
  // (software.md §5 verbatim, C28-0326-2 p.30). EQU emits nothing and moves nothing.
  if (op === 'DS' || op === 'EQU') return [];

  if (op === 'DA') {
    // DA_EMITS_ONLY_ITS_MARKED_POSITIONS: one marked blank per defined field high-order, and
    // nothing else. Each is its own item because the fields are not contiguous — pack.ts reads
    // the gaps directly and opens a record at each (§8.2, §8.3).
    return (sized.daFields ?? []).map((at) => ({
      at,
      cells: Uint8Array.from([WM | mustCode(' ')]),
      seqno,
    }));
  }

  // DCW / DC. The constant is the operand's own literal (§5.2 rule 3: written as a DECLARATIVE's
  // operand, `@…@` is that statement's constant and never enters the pool). An address constant —
  // `DCW LABEL+10`, software.md §5 — has no literal and resolves to a five-position value.
  const marked = op === 'DCW';
  if (operand?.literal !== undefined) {
    return [{ at: sized.at, cells: constantCells(operand.literal.cells, marked, acc), seqno }];
  }
  if (operand === undefined) {
    flagged(acc, 'F', `${op} has no constant`);
    return [];
  }
  const value = operandValue(operand, ctx, acc) + operand.adjust;
  return [{ at: sized.at, cells: constantCells(encodeAddress(value, operand.tag), marked, acc), seqno }];
}

/**
 * THE INSTRUCTION COLUMN OF A DECLARATIVE — §4's `instruction` comment reads "blank for a
 * declarative that emits NOTHING", and Exhibit IV shows the converse directly: SEQNO 39,
 * `DCW AREA` at ADDRS 00208 with CT 5, prints its emitted five-character constant `00315` in the
 * INSTRUCTION column (software.md §5's Exhibit IV table, C28-0326-2 p.57). So an EMITTING
 * declarative renders its emitted cells as glyphs, exactly as an imperative's fields do — one
 * field, no interior spacing, the word mark not shown (`glyphsOf` masks it, and the manual prints
 * no marks in that column either). SEQNO 38's `DCW #5` is the same rule seen from the other side:
 * five blank characters render as five blanks, and the cell reads empty on the page.
 *
 * WHO STAYS BLANK, and why:
 *  · DS and EQU emit nothing at all (§8.2) — which is §4's sentence verbatim;
 *  · DA. Its own Exhibit IV row — SEQNO 64, `AREA DA 1X80,G`, CT 81 at ADDRS 00315 — prints
 *    NOTHING in INSTRUCTION (and nothing in CARD), and what a DA emits under
 *    `DA_EMITS_ONLY_ITS_MARKED_POSITIONS` is one marked BLANK per defined field (§8.2), from
 *    cells that are not even contiguous — so rendering them would print blanks anyway. Blank is
 *    what Exhibit IV supports, and blank is what this prints.
 */
function declarativeInstruction(op: string, emitted: readonly EmittedItem[]): string | undefined {
  if (op !== 'DCW' && op !== 'DC') return undefined;
  const constant = emitted[0];
  return constant === undefined ? undefined : glyphsOf(constant.cells);
}

/**
 * An imperative: the op character WITH A WORD MARK — "a word mark must be associated with the
 * first character of each instruction (op code position)", A22-0526-3 p.7, and the assembler is
 * what sets it — then the fields the form takes, and no interior word marks (§6.2 step 4).
 *
 * FIELD ORDER is the machine's own instruction format: op, x-control (I/O forms only), the
 * addresses, then the d (`D_FOLLOWS_THE_ADDRESSES`, wave 3's constant; software.md §4). An EMPTY
 * operand is a blank address — chaining — and contributes no characters, which is what makes the
 * chained forms 1 and 6 characters long (§6.1's shape ladder).
 */
function emitImperative(sized: SizedStatement, row: MnemonicRow, ctx: Context, acc: Accum): EmittedItem[] {
  const { statement } = sized;
  acc.cells.push(WM | mustCode(row.opChar));
  acc.fields.push(row.opChar);

  for (const operand of statement.operands) {
    if (operand.kind === 'xcontrol') pushXControl(operand, acc);
    else if (operand.kind !== 'blank') pushAddress(operand, ctx, acc);
  }

  // §6.1's shape ladder, row 1: length 1 is "op alone, EVERYTHING chained" on every
  // `chainable: true` op — the d is chained too (table.ts's own BCE note: the chained form reuses
  // the previous d). A chainable op written with no address and no explicit d IS that form, and
  // the mnemonic's baked d is not emitted. Without this, a bare `B` in a source deck would
  // assemble two characters and reach `AssemblerBug`, which §6.3 forbids source content from
  // doing.
  const chained = row.chainable && row.lengths.includes(1)
    && statement.operands.every((operand) => operand.kind === 'blank')
    && statement.d === undefined;

  const d = chained ? undefined : dOf(row, statement);
  if (d !== undefined) {
    const code = bcdOfGlyph(d);
    if (code === undefined) flagged(acc, 'F', `d-modifier "${d}" is not one of the 64 machine glyphs`, true);
    else {
      acc.cells.push(code);
      acc.fields.push(d);
    }
  }

  // TWO CHECKS, in this order, and the order is §6.3's — a SOURCE defect first, an ASSEMBLER
  // defect only when there is none:
  //
  //  · `checkOperandShape` — the operand list makes no form this op carries. `F`, with the slot
  //    named. Without it, a blank operand field on a NON-CHAINABLE op (`CC1`, `R1W`, `SSF1`)
  //    assembles one character and reaches `AssemblerBug`, and so does one operand too many.
  //  · `checkAssembledLength` — the one internal invariant, and the ANY_LENGTH sentinel it turns
  //    on (§6.1, §6.3).
  //
  // THE STAND-DOWN IS NARROW, and this is its whole enumeration: only the `F` paths that
  // SUPPRESS characters the form calls for carry `drops` — the malformed or unencodable
  // x-control field (`pushXControl`, both returns), the unencodable d just above, and a shape
  // flag that has already said the same thing. A `U`, an `M` or a range-check `F` changes no
  // length — `lookup` substitutes 0 precisely so five characters are still pushed — so the
  // invariant stays LIVE on those lines. Standing down on "any flag at all" would hide a real
  // invariant violation on every undefined-symbol line.
  const suppressed = acc.flags.some((flag) => flag.drops);
  if (!suppressed && !checkOperandShape(row, wroteShape(statement, d), acc.cells.length, acc)) {
    checkAssembledLength(row, acc.cells.length, statement.seqno);
  }
  return [{ at: sized.at, cells: Uint8Array.from(acc.cells), seqno: statement.seqno }];
}

// ═══ Pass 2 ════════════════════════════════════════════════════════════════════════════════

/**
 * `sized[] -> EmittedItem[]`, in source order (§6). Never throws on source content: an unknown
 * operation is `O` with no emission and a surviving listing line, which is §2.2's closing
 * paragraph and the Phase-2 `DeckError` pattern one level up.
 */
export function pass2(
  sized: readonly SizedStatement[],
  symbols: SymbolTable,
  coreSize: number = CORE_SIZE_DEFAULT,
): Pass2Result {
  const statements: EmittedStatement[] = [];
  const items: EmittedItem[] = [];

  for (const entry of sized) {
    const { statement } = entry;
    const acc = accum();
    const ctx: Context = { symbols, coreSize, at: entry.at, length: entry.length };
    const op = statement.op.toUpperCase();
    let emitted: EmittedItem[] = [];
    let instruction: string | undefined;

    if (entry.pooled !== undefined) {
      // A processor-generated DCW at the pool origin, word mark high-order (§8.2's last row) —
      // and an EMITTING declarative, so its cells render into INSTRUCTION like a DCW's.
      const cells = constantCells(entry.pooled.cells, true, acc);
      emitted = [{ at: entry.at, cells, seqno: statement.seqno }];
      instruction = glyphsOf(cells);
    } else if (statement.comment || op === '') {
      emitted = [];
    } else if (NON_EMITTING.has(op)) {
      emitted = [];
    } else if (DECLARATIVES.has(op)) {
      emitted = emitDeclarative(entry, ctx, acc);
      instruction = declarativeInstruction(op, emitted);
    } else {
      const row = resolve(statement.op.toUpperCase());
      if (row === undefined) {
        // O — invalid operation code. CT 0, no emission, the line survives (§2.2).
        flagged(acc, 'O', `${statement.op} is not a valid operation code`);
      } else {
        emitted = emitImperative(entry, row, ctx, acc);
        instruction = acc.fields.join(' ');
      }
    }

    // A defect the parser already found rides along: a `Statement.format` message is an F.
    if (statement.format !== undefined) flagged(acc, 'F', statement.format);
    const flag = strongest(acc);
    statements.push({
      seqno: statement.seqno,
      at: entry.at,
      items: emitted,
      ...(instruction === undefined ? {} : { instruction }),
      ...(flag === undefined ? {} : { flag: flag.flag, why: flag.why }),
    });
    items.push(...emitted);
  }

  return { items, statements };
}
