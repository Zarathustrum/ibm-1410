// src/asm/operand.ts — plan §5.2. The operand grammar, and the PARSE stage of §6:
//
//     parse   text -> SourceCard[] -> Statement[]     source.ts + operand.ts + mnemonics.ts
//
// ONE PIPELINE OVER THE 52 COLUMNS OF THE OPERAND FIELD, AND THE ORDER IS THE MANUAL'S OWN.
// Step 1 locates the alphameric literal span and only THEN cuts the comment; step 2 splits on
// commas outside that span; step 3 classifies each operand by an ORDERED list keyed on position
// first and first character second; step 4 reads the term tail; step 5 says where indexing is
// rejected. Several of step 3's tests overlap and the FIRST MATCH WINS, which is the whole
// content of that step.
//
// ═══ THE ALPHABET THIS FILE SCANS ═════════════════════════════════════════════════════════════
// It scans the STORED 64-glyph card, never the typed text (§5.1's own paragraph). So its term
// introducers are `&` and `-`, NOT `+` and `-`: a `+` exists only in the typing layer inside
// `source.ts` and is gone before a `Statement` is built (`SOURCE_PLUS_IS_THE_12_PUNCH`). Plan
// §5.2 is written in `+` because the manual is, and every rule below is that rule with `+` read
// as the stored `&`. Getting this backwards breaks every address adjustment, every index tag,
// every numeric-literal sign and every address constant at once, and breaks them QUIETLY — which
// is why the wave-3 worked-equivalence gate is asserted in the stored alphabet:
//
//     A TOTAL&3&X1-12&X2,ACCUM-5&X2&35   ≡   A TOTAL-9&X2,ACCUM&30&X2
//
// (`software.md` §2, `[verified]` — C28-0309-1 pp.8-11.)
//
// ═══ WHAT THIS FILE DOES NOT DECIDE ═══════════════════════════════════════════════════════════
// Pooling — whether a classified literal enters the literal pool at all, or is a declarative's
// own constant — is pass 1's (`literals.ts`, §6.1). This file CLASSIFIES. The asterisk's second
// meaning (the current assignment counter, in EQU / ORG / LTORG) is pass 1's too, at a different
// call site: an operand here records `kind: 'asterisk'` plus its adjustment and the two readings
// never share a helper (§5.2's closing paragraph; they differ by seven).

import { MINUS_ZONE, PLUS_ZONE } from '../core/alu.js';
import { bcdOfGlyph, glyphOf } from '../core/bcd.js';
import { WORD_SEPARATOR } from '../core/channel.js';
import { opByChar } from '../core/isa/table.js';
import { WM } from '../core/types.js';
import { resolve, type IoControl, type MnemonicRow } from './mnemonics.js';
import {
  TWELVE_PUNCH, cardFields, messageOf, readSource, type Problem, type SourceLine,
} from './source.js';
import {
  COMMENT_COLUMN, SOURCE_FIELDS,
  type Literal, type Operand, type Statement,
} from './types.js';

/**
 * OPEN: `D_FOLLOWS_THE_ADDRESSES` — `[likely]`, plan §15, §5.2 "The explicit d". The claim: the
 * explicit d is the operand written AFTER the addresses the resolved form takes.
 * `software.md` §4 shows only the two-address case, `[verified]`: `BCE ENTRYA,SWITCH,2` assembles
 * `B 00392 00498 2` (C28-0309-1 pp.7, 11). This file generalises it to every form by the
 * arithmetic of §6.1's own shape ladder — one op character, three positions for an x-control
 * field, five per address, one for the d — so `CC1 1` (length 2, no address) and
 * `R1W 0,LINE,$` (length 10, x-control + one address) both fall out of the same rule.
 *
 * Deferred here from wave 1 BY NAME: `mnemonics.ts` records only WHO writes the d
 * (`MnemonicRow.dFromOperand`) and never parses an operand, so nothing there depends on the
 * position. Fallback: accept a trailing d in any slot, including `B EOJ,,8`.
 */
export const D_FOLLOWS_THE_ADDRESSES = true;

/**
 * OPEN: `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS` — `[unverified]`. A unit-record mnemonic
 * BAKES its d (`R` to read, `W` to write — C28-0309-1 pp.47-48's INSTRUCTION column), and this
 * file still lets a d written last override it, which is how `R1W 0,LINE,$` reaches `$`.
 *
 * The doubt, and it is real. C28-0309-1 p.41 says that "where d-modifier characters must be
 * provided by the programmer, a D appears in the operand column", and across pp.41-58 only BCE
 * (p.44), BBE, BEX1 and BEX2 (p.45) carry that marker — all branches, no I/O data transfer.
 * pp.23-24 define the read operand as exactly two entries, the stacker pocket and the storage
 * address. Yet p.21 says the d "will be supplied automatically for unique mnemonics, or will be
 * taken from the operand field if the programmer has supplied it", which reads as a general
 * permission. No worked example in
 * C28-0309-1, A22-0526-3 or C28-0351-5 tests an explicit d on an UNMARKED mnemonic, so the
 * question is undecidable from the three manuals; it needs the recovered 1410-AU-906 / PR-108
 * processor listing.
 *
 * WHY WE TAKE IT: the demo and the condensed loader's regenerable source both need `d = $` on a
 * 1402 read, and C28-0351-5 p.8 Table II (Initialization with Disk System Operating File), the
 * "Not using 7010 Load Key" column, step 2, prescribes exactly that for the boot path ("Enter
 * ALcde00012$r into location 00000") — its c/d/e legend covers the CARD Standard Input Unit
 * explicitly (`d` = `1` card reader / `B` tape, `e` = `0` card reader / `0-9` tape). Nothing else
 * in this file or in `emit.ts` had to change to allow it — `checkExplicitD` below already declines
 * to flag an explicit d over a baked one, and `emit.ts`'s `dOf` already lets the written one win.
 *
 * Fallback: coin a card analogue of IBM's own `$`-reaching grammar — a distinct mnemonic in the
 * `RTG` / `RTGW` mould (C28-0309-1 p.49 reads tape to the inter-record gap with a baked `$`
 * exactly that way — `RTG 12,B … M %U2 34567 $`; p.48's MAGNETIC TAPE OPERATIONS block runs
 * BSP/SKP/WTM/RWD/RWU/CU/MU and stops), e.g. `RG` / `RWG`, and refuse the third operand outright.
 */
export const EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS = true;

// ═══ §2.2's operation partition, as this file needs to see it ══════════════════════════════
// `software.md` §6's fifteen in-scope pseudo-operations. `emit.ts` keeps its own module-private
// copies of the same two sets for its own emission ladder; §2.2's table is the single source
// both transcribe, and neither file imports the other's.

const DECLARATIVES: ReadonlySet<string> = new Set(['DCW', 'DC', 'DS', 'DA', 'EQU']);
/** The control operations — assemble no characters at all (§6.1). */
const CONTROLS: ReadonlySet<string> = new Set(
  ['ORG', 'LTORG', 'END', 'JOB', 'CTL', 'RUN', 'LOAD', 'EJECT', 'RESEQ', 'PST'],
);
const PSEUDO_OPS: ReadonlySet<string> = new Set([...DECLARATIVES, ...CONTROLS]);

/**
 * §5.2 step 5, `software.md` §2 `[verified]`: indexing is "not accepted in DS, ORG, LTORG, or
 * control operations". `G` Store Address Register and the x-control field are the two additional
 * rejections (`architecture.md` §5; A22-0526-3 pp.11, 22), and both are keyed elsewhere — on the
 * op CHARACTER, and by construction, since the field is synthesised — because neither is an
 * operation NAME.
 */
const INDEXING_REJECTED: ReadonlySet<string> = new Set(['DS', ...CONTROLS]);

// ── Geometry, off `software.md` §1's column table via `types.ts` ────────────────────────────
const OPERAND_FROM = SOURCE_FIELDS.operand[0];        // column 21
const OPERAND_TO = SOURCE_FIELDS.operand[1];          // column 72

/** `software.md` §2: symbolic labels are ≤10 characters, first alphabetic, no specials. */
const SYMBOL = /^[A-Z][A-Z0-9]{0,9}$/;
/** `software.md` §2: an actual address is 1-5 digits, leading zeros optional. */
const ACTUAL = /^[0-9]{1,5}$/;
/** An address-adjustment term: `±ddddd` (`software.md` §2). */
const ADJUSTMENT = /^[0-9]{1,5}$/;
/** `software.md` §3: an area-defining literal is limited to 500 positions — `F` if exceeded. */
const AREA_LIMIT = 500;
/** `software.md` §3: a literal may be up to 52 characters including the sign. */
const LITERAL_LIMIT = 52;
/** `software.md` §3: ≤9 digits + sign, or 1-9 alphameric characters, are pooled ONCE. */
const POOLED_LIMIT = 9;
/** `software.md` §3: an address-constant literal is the 5-character machine address of a label. */
const ADDRESS_CONSTANT_LENGTH = 5;
/** `software.md` §2: X1 through X15; `+X0` and `+X16` are `F`. */
const INDEX_REGISTERS = 15;

function mustCode(glyph: string): number {
  const code = bcdOfGlyph(glyph);
  if (code === undefined) throw new RangeError(`operand.ts: "${glyph}" is not one of the 64 glyphs`);
  return code;
}

// ═══ Step 1 — the alphameric literal span, THEN the comment cut ════════════════════════════

/** Indices into the 52-column operand field, inclusive of both `@`s. */
interface Span {
  readonly from: number;
  readonly to: number;
}

/**
 * `software.md` §3, `[verified]`: an alphameric literal is bracketed by `@` and "the processor
 * scans from column 72 right-to-left for the closing `@`". `software.md` §1: a comment "begins
 * after ≥2 blanks". THOSE TWO RULES INTERACT, and the interaction is the most attractive bug in
 * this file — `MLC @AB  CD@,FIELD` contains two blanks INSIDE a literal. The right-to-left scan
 * exists precisely so the literal's extent is known before any blank scan runs.
 *
 * A consequence, and it is the documented behaviour rather than a defect: a trailing comment that
 * itself contains an `@` BREAKS the statement, because the comment's `@` is the one the
 * right-to-left scan finds.
 *
 * A LONE `@` LOCATES NO SPAN, and this step says so rather than flagging it. The reason it was
 * WRITTEN that way is now historical — `@` is an x1 CHANNEL CHARACTER (channel 1 with overlap,
 * `X1_CHANNEL`, `software.md` §10.9) and a source deck used to write the x-control field itself,
 * so `RW1 @10,WORK,$` was a legal instruction with exactly one `@` in its operand field. Since
 * 2026-08-31 the assembler SYNTHESISES that field and no source deck writes an x1 glyph at all
 * (`xControlOf` below), so a lone `@` now always ends in an `F`. The rule stays because it is the
 * one that keeps step 1 from deciding a defect step 3 can describe far better: an unmatched `@`
 * meant as a literal is `F` at rule 3, where the head test can tell the two apart; here there is
 * no span and the comma split proceeds.
 */
function literalSpan(operand: string): Span | undefined {
  const from = operand.indexOf('@');
  if (from < 0) return undefined;
  const to = operand.lastIndexOf('@');
  return to === from ? undefined : { from, to };
}

/**
 * The first double blank OUTSIDE the literal span (`software.md` §1). Testing the pair's LEFT
 * index alone is enough: a span begins and ends on an `@`, so a blank pair can never straddle its
 * boundary.
 */
function commentCut(operand: string, span: Span | undefined): number {
  for (let i = 0; i + 1 < operand.length; i++) {
    if (operand[i] !== ' ' || operand[i + 1] !== ' ') continue;
    if (span !== undefined && i >= span.from && i <= span.to) continue;
    return i;
  }
  return operand.length;
}

// ═══ Step 2 — comma split outside the span ═════════════════════════════════════════════════

/** One written operand and where it starts, as an index into the operand field. */
interface Piece {
  readonly text: string;
  readonly at: number;
}

/**
 * At most three operands: A, B, d. An EMPTY operand is a blank address — chaining — which is
 * MEANINGFUL, not missing: `B` (nothing written), `B ,LOOP` and `B LOOP` are three different
 * statements and, on a chainable op, three different lengths (§6.1).
 */
function splitOperands(statement: string, span: Span | undefined): Piece[] {
  if (statement.trim() === '') return [];
  const pieces: Piece[] = [];
  let start = 0;
  const push = (from: number, to: number): void => {
    let head = from;
    let tail = to;
    while (head < tail && statement[head] === ' ') head++;
    while (tail > head && statement[tail - 1] === ' ') tail--;
    pieces.push({ text: statement.slice(head, tail), at: head });
  };
  for (let i = 0; i < statement.length; i++) {
    if (statement[i] !== ',') continue;
    if (span !== undefined && i >= span.from && i <= span.to) continue;
    push(start, i);
    start = i + 1;
  }
  push(start, statement.length);
  return pieces;
}

// ═══ Step 4 — the term tail ════════════════════════════════════════════════════════════════

interface Tail {
  readonly adjust: number;
  readonly tag: number;
  readonly tagSymbol?: string;
  readonly tagWritten: boolean;
}

/**
 * The repeated `&` / `-` groups written after the head, `software.md` §2 `[verified]`:
 *
 *  · `±ddddd` is an ADJUSTMENT term, and ALL adjustment terms are SUMMED;
 *  · `&X1` … `&X15`, or `&` followed by a symbol EQU'd to an index register, is an INDEX term,
 *    and with several on one address only the RIGHTMOST is effective. `&X0` / `&X16` are `F`;
 *  · position disambiguates `&NAME`: as the whole operand it is an address-constant literal
 *    (step 3 rule 5); in the TAIL it is an index term recorded as `tagSymbol` and resolved in
 *    pass 2 — which is precisely why parse and resolve are separate passes.
 *
 * A `-` introduces an adjustment and nothing else: the manual writes every index tag with a `+`
 * (the stored `&`), so `-X1` is not a documented term and is `F` with the rest.
 *
 * `at` IS THE 1-BASED CARD COLUMN of the tail's first character, not an offset into the operand
 * field: every `Problem.column` in this file is a card column (`source.ts`'s `Problem`), and
 * §6.3's leftmost-offender sort compares them across operands, so a tail error measured from the
 * wrong origin would both misreport its column and win a sort it should lose. The caller adds
 * `OPERAND_FROM` and the head's width.
 */
function parseTail(tail: string, at: number, problems: Problem[]): Tail {
  let adjust = 0;
  let tag = 0;
  let tagSymbol: string | undefined;
  let tagWritten = false;
  let i = 0;
  while (i < tail.length) {
    const sign = tail[i];
    if (sign !== TWELVE_PUNCH && sign !== '-') {
      // Nothing may follow the term tail — which is what settles `LABEL&5#3` (§5.2 rule 6's
      // second collision: a `#` reached after a term is `F`, not an area-defining literal).
      problems.push({
        column: at + i,
        message: `"${tail.slice(i)}" follows the address terms — nothing may follow the term tail`,
      });
      break;
    }
    let end = i + 1;
    while (end < tail.length && tail[end] !== TWELVE_PUNCH && tail[end] !== '-') end++;
    const term = tail.slice(i + 1, end);
    const index = /^X([0-9]{1,2})$/.exec(term);
    if (ADJUSTMENT.test(term)) {
      adjust += (sign === '-' ? -1 : 1) * Number(term);
    } else if (sign === '-') {
      problems.push({
        column: at + i,
        message: `an address-adjustment term is 1-5 digits; "-${term}" is not one`,
      });
    } else if (index !== null) {
      const register = Number(index[1]);
      if (register < 1 || register > INDEX_REGISTERS) {
        problems.push({
          column: at + i,
          message: `index register ${register} does not exist — the 1410 has X1 through X${INDEX_REGISTERS}`,
        });
      } else {
        tag = register;
        tagSymbol = undefined;
        tagWritten = true;
      }
    } else if (SYMBOL.test(term)) {
      tag = 0;
      tagSymbol = term;
      tagWritten = true;
    } else {
      problems.push({
        column: at + i,
        message: `"${TWELVE_PUNCH}${term}" is neither an address adjustment nor an index tag `
          + '— nothing may follow the term tail',
      });
    }
    i = end;
  }
  return { adjust, tag, tagWritten, ...(tagSymbol === undefined ? {} : { tagSymbol }) };
}

/**
 * Where the term tail begins. The scan is HEAD-AWARE and has to be: an alphameric literal's head
 * runs to its closing `@` and may contain `&` and `-` as DATA, and rules 4 and 5 own their leading
 * sign, so the scan starts past it.
 */
function tailStart(token: string): number {
  if (token.startsWith('@')) {
    const close = token.lastIndexOf('@');
    return close <= 0 ? token.length : close + 1;
  }
  let i = token[0] === TWELVE_PUNCH || token[0] === '-' ? 1 : 0;
  for (; i < token.length; i++) {
    const ch = token[i];
    if (ch === TWELVE_PUNCH || ch === '-') return i;
  }
  return token.length;
}

// ═══ The four literal kinds — `software.md` §3, §5 ═════════════════════════════════════════
// `Literal.cells` is "what the processor-generated DCW will hold, WM high-order" (types.ts), and
// `emit.ts` reads it directly for a declarative's own constant. `Literal.text` is the HEAD, never
// the whole operand: ADJUSTMENT AND INDEXING MODIFY THE LITERAL'S ADDRESS, NOT ITS VALUE
// (`software.md` §3), so a tail belongs to `Operand.adjust` / `Operand.tag` and never to the
// constant. Whether a literal is POOLED at all is pass 1's (`literals.ts`, §6.1).

function marked(cells: Uint8Array): Uint8Array {
  const first = cells[0];
  if (first !== undefined) cells[0] = first | WM;
  return cells;
}

function alphamericLiteral(head: string, pooled: boolean): Literal {
  const content = [...head.slice(1, -1)];
  const cells = new Uint8Array(content.length);
  for (const [i, glyph] of content.entries()) cells[i] = mustCode(glyph);
  return { kind: 'alphameric', text: head, cells: marked(cells), pooled };
}

/**
 * `software.md` §3, `[verified]`: a numeric literal REQUIRES a leading sign, "and the sign is
 * placed as a zone over the units position". The zone bits are `alu.ts`'s — B+A for plus, B alone
 * for minus (`charset.md` §6, A22-0526-3 p.16 Figure 11) — imported rather than restated.
 */
function numericLiteral(head: string, sign: string, digits: string): Literal {
  const cells = new Uint8Array(digits.length);
  for (const [i, digit] of [...digits].entries()) cells[i] = mustCode(digit);
  const units = cells.length - 1;
  const last = cells[units];
  if (last !== undefined) cells[units] = last | (sign === '-' ? MINUS_ZONE : PLUS_ZONE);
  return {
    kind: 'numeric',
    text: head,
    cells: marked(cells),
    pooled: digits.length <= POOLED_LIMIT,
  };
}

/**
 * `software.md` §3: `WKAREA#6` reserves 6 BLANK positions via a processor-generated DCW with a
 * word mark over the high-order position; the label resolves LOW-order. `pooled` is false because
 * each named area is its own reservation — deduplicating two work areas of the same size would
 * merge them. §3 states the dedup sizes for the numeric and alphameric kinds only.
 */
function areaLiteral(head: string, positions: number): Literal {
  const cells = new Uint8Array(positions).fill(mustCode(' '));
  return { kind: 'areaDefining', text: head, cells: marked(cells), pooled: false };
}

/**
 * `software.md` §3: `&LABEL` yields the 5-character machine address of LABEL, emitted via a
 * processor-generated DCW and UNSIGNED in core storage. THE VALUE IS NOT KNOWN AT PARSE — it is
 * a symbol — so the cells are the five reserved positions and pass 1 rebuilds the constant when
 * it assigns the pool (`SizedStatement.pooled`, `emit.ts`). `Operand.symbol` carries the name.
 */
function addressConstantLiteral(head: string): Literal {
  const cells = new Uint8Array(ADDRESS_CONSTANT_LENGTH).fill(mustCode(' '));
  return { kind: 'addressConstant', text: head, cells: marked(cells), pooled: true };
}

// ═══ Step 3 — the ORDERED classification, rules 2-9 ════════════════════════════════════════

const blankOperand: Operand = { kind: 'blank', text: '', adjust: 0, tag: 0, tagWritten: false };

/**
 * ONE ADDRESS OPERAND. The list is exhaustive and ORDERED, and the first match wins — several of
 * these tests overlap and the order is the whole content of the step (§5.2, `software.md` §2, §3).
 * Rule 0 (JOB / CTL / RUN and comment cards) and rule 1 (the x-control field) are decided by the
 * caller, before this function is reached.
 *
 * `at` is the operand's 0-based offset INTO THE OPERAND FIELD, so every column reported from here
 * is `OPERAND_FROM + at + …` — `parseTail` is handed the sum rather than the offset.
 */
function classifyAddress(token: string, at: number, problems: Problem[]): Operand {
  // Rule 2 — EMPTY is a blank address, chaining. Not "missing", not `F`.
  if (token === '') return blankOperand;

  const cut = tailStart(token);
  const head = token.slice(0, cut);
  const tail = parseTail(token.slice(cut), OPERAND_FROM + at + cut, problems);
  const base = {
    text: token,
    adjust: tail.adjust,
    tag: tail.tag,
    tagWritten: tail.tagWritten,
    ...(tail.tagSymbol === undefined ? {} : { tagSymbol: tail.tagSymbol }),
  };

  // Rule 3 — ALPHAMERIC LITERAL. The closing `@` was located in step 1. The word separator
  // (0-5-8) may never be its first character, and a literal is ≤52 characters including the sign
  // (`software.md` §3). "Must not extend beyond column 72" needs no test of its own: the operand
  // field IS columns 21-72, so the slice enforces it and an unterminated literal is step 1's `F`.
  //
  // IT IS A LITERAL ONLY IN AN IMPERATIVE — written as a DECLARATIVE's operand the same `@…@` is
  // that statement's own constant and does not enter the pool (§6.1). That is a POOLING ruling
  // and pass 1's; the classification is the same either way.
  if (head.startsWith('@')) {
    if (head.length < 2 || !head.endsWith('@')) {
      problems.push({
        column: OPERAND_FROM + at,
        message: 'unmatched @ — an alphameric literal is closed by the last @ at or before '
          + `column ${OPERAND_TO} (software.md §3)`,
      });
      return { ...base, kind: 'literal', literal: alphamericLiteral(`${head}@`, false) };
    }
    if (head.length > LITERAL_LIMIT) {
      problems.push({
        column: OPERAND_FROM + at,
        message: `an alphameric literal is at most ${LITERAL_LIMIT} characters; this one is ${head.length}`,
      });
    }
    if (head[1] === glyphOf(WORD_SEPARATOR)) {
      problems.push({
        column: OPERAND_FROM + at + 1,
        message: 'the word separator (0-5-8) may never be the first character of an alphameric literal',
      });
    }
    const content = head.length - 2;
    return {
      ...base,
      kind: 'literal',
      literal: alphamericLiteral(head, content >= 1 && content <= POOLED_LIMIT),
    };
  }

  // Rule 4 — SIGNED NUMERIC LITERAL. The sign is REQUIRED (`software.md` §3): to store an
  // unsigned literal value, write an alphameric literal.
  const numeric = /^([&-])([0-9]+)$/.exec(head);
  if (numeric !== null) {
    const sign = numeric[1] ?? TWELVE_PUNCH;
    const digits = numeric[2] ?? '';
    return { ...base, kind: 'literal', literal: numericLiteral(head, sign, digits) };
  }

  // Rule 5 — ADDRESS-CONSTANT LITERAL `&LABEL`: five characters, unsigned in storage. The `&` is
  // LEADING here and TRAILING on rule 9's `LABEL&10`, which is exactly what the two rules key on.
  // A tail after it is step 4's, and `software.md` §3 says what it means: adjustment and indexing
  // on an address-constant literal modify THE ADDRESS OF THE LITERAL, not the literal's value.
  if (head.startsWith(TWELVE_PUNCH) && SYMBOL.test(head.slice(1))) {
    return {
      ...base,
      kind: 'literal',
      symbol: head.slice(1),
      literal: addressConstantLiteral(head),
    };
  }

  if (head.startsWith(TWELVE_PUNCH) || head.startsWith('-')) {
    problems.push({
      column: OPERAND_FROM + at,
      message: `"${head}" is neither a signed numeric literal nor an address constant`,
    });
    return { ...base, kind: 'symbolic', symbol: head };
  }

  // Rule 6 — AREA-DEFINING LITERAL, a HEAD-THEN-SCAN test and not "contains `#`". That is what
  // settles the three collisions an unordered rule leaves open: a `#` inside an `@…@` span is
  // data (rule 3 already consumed it, so `@A#B@` is an alphameric literal); a `#` reached after a
  // term is `F` (parseTail's "nothing may follow the term tail"); and `DCW #5`'s operand matches
  // HERE, at its first character — though as a declarative's operand it is that DCW's own blank
  // constant and does not pool, exactly as in rule 3.
  const hash = head.indexOf('#');
  if (hash >= 0) {
    const name = head.slice(0, hash);
    if (name === '' || SYMBOL.test(name)) {
      const size = head.slice(hash + 1);
      if (!/^[0-9]+$/.test(size)) {
        problems.push({
          column: OPERAND_FROM + at + hash + 1,
          message: `an area-defining literal reserves a number of positions; "${size}" is not one`,
        });
        return { ...base, kind: 'symbolic', symbol: head };
      }
      const positions = Number(size);
      if (positions > AREA_LIMIT) {
        problems.push({
          column: OPERAND_FROM + at + hash + 1,
          message: `an area-defining literal is limited to ${AREA_LIMIT} positions; this one asks for ${positions}`,
        });
      }
      return {
        ...base,
        kind: 'literal',
        ...(name === '' ? {} : { symbol: name }),
        literal: areaLiteral(head, Math.min(positions, AREA_LIMIT)),
      };
    }
  }

  // Rule 7 — ASTERISK. Here it is the address of the LAST CHARACTER of the instruction it appears
  // in; in EQU / ORG / LTORG it is the current assignment counter. TWO CALL SITES, never one
  // shared helper — `EOF EQU *` after a 7-character instruction at 00209 is 00216, not 00215
  // (`software.md` §2, `[verified]`). Pass 1 owns the other reading.
  if (head === '*') return { ...base, kind: 'asterisk' };

  // Rule 8 — ACTUAL, 1-5 digits, leading zeros optional.
  if (ACTUAL.test(head)) return { ...base, kind: 'actual', actual: Number(head) };

  // Rule 9 — SYMBOLIC. A declarative's ADDRESS CONSTANT `LABEL&10` is this rule plus step 4's
  // tail: an operand of a declarative, resolved to a five-position value at emission, and a
  // different thing from rule 5's pooled `&LABEL`.
  if (SYMBOL.test(head)) return { ...base, kind: 'symbolic', symbol: head };

  problems.push({
    column: OPERAND_FROM + at,
    message: `"${head}" is not a valid symbolic address — ≤10 characters, first alphabetic, no specials`,
  });
  return { ...base, kind: 'symbolic', symbol: head };
}

// ═══ Step 3 rule 1 — the x-control field, SYNTHESISED and never written ════════════════════

/**
 * The three-position x-control field of an I/O statement, BUILT BY THE ASSEMBLER — the rule that
 * replaced `mnemonics.ts`'s retired `IO_OPERAND_IS_XCONTROL_BADDR_D` on 2026-08-31. A period
 * Autocoder deck never writes that field on a unit-record statement: A22-0526-3 Figure 107
 * pp.104-105 spells each family as `R(#)w° 0,b` / `W(#)° b`, and every operand cell in
 * C28-0309-1 pp.47-48's expansion is `0,B`, `1,B`, `2,B` or a bare `B`. The x-control field
 * appears only in those pages' INSTRUCTION column, which is this function's output.
 *
 * WHERE THE THREE GLYPHS COME FROM. x1 and x2 are the mnemonic's — `MnemonicRow.io.prefix`, built
 * in `mnemonics.ts` off `X1_CHANNEL` (channel + overlap) and `X2_DEVICE` (the family's unit). x3
 * is Figure 107 p.105's "I/O Unit No. or Specific Operation": the family bakes it for the printer
 * (`0`), Write Word Marks As 1's (`1`) and the console (`0`), and the PROGRAMMER writes it as the
 * first operand for the 1402 — "A read command must have as the first entry in its operand either
 * the number of the stacker" (C28-0309-1 p.23).
 *
 * A POCKET THAT IS NOT ONE OF THE FAMILY'S IS `F`, never a throw (emit.ts's header rule). The
 * field is still built at THREE positions so the flagged line keeps the length its form carries
 * and the message a person sees is this one rather than emit.ts's downstream complaint about a
 * short field: a one-glyph pocket is carried through verbatim so the defect is visible in the
 * INSTRUCTION column, and anything else — a blank operand, an x-control field somebody typed out
 * of habit, an index-tagged pocket — leaves the substitute blank `source.ts` already uses when it
 * rejects a character.
 *
 * The field is NEVER index-tagged, never adjusted and never resolved (step 5, types.ts): it is
 * built here with `tag: 0` and `tagWritten: false`, so that is true by construction now, and an
 * `R1W 0&X1,LINE,$` fails as a pocket rather than as a tagged address.
 */
const POCKET_SUBSTITUTE = ' ';

function xControlOf(row: MnemonicRow, io: IoControl, pocket: Piece | undefined, problems: Problem[]): Operand {
  let x3 = io.x3 ?? '';
  if (io.pockets !== undefined) {
    const written = pocket?.text ?? '';
    if (io.pockets.includes(written)) {
      x3 = written;
    } else {
      problems.push({
        column: OPERAND_FROM + (pocket?.at ?? 0),
        message: written === ''
          ? `${row.mnemonic} takes the stacker pocket as its first operand — one of `
            + `${io.pockets.join(' ')} (C28-0309-1 p.23)`
          : `"${written}" is not a stacker pocket for ${row.mnemonic} — the pockets are `
            + `${io.pockets.join(' ')} (A22-0526-3 Figure 107 pp.104-105)`,
      });
      x3 = [...written].length === 1 ? written : POCKET_SUBSTITUTE;
    }
  }
  return { kind: 'xcontrol', text: io.prefix + x3, adjust: 0, tag: 0, tagWritten: false };
}

// ═══ The explicit d ════════════════════════════════════════════════════════════════════════

/**
 * `D_FOLLOWS_THE_ADDRESSES`, by the arithmetic of §6.1's shape ladder: an assembled length is one
 * op character, three positions for an x-control field, five per address and one for the d, so
 * `addresses = ⌊(length - 1 - 3·xcontrol) / 5⌋` and the remainder 1 is the d. Taken over every
 * length the row carries, the widest form is what decides how many operands are ADDRESSES; the
 * one after them is the d. `ANY_LENGTH` — the EMPTY array, which only `N` carries (`table.ts:88`)
 * — states no layout at all, so no operand can be identified as the d by position.
 */
function addressSlots(row: MnemonicRow): number {
  let slots = 0;
  for (const length of row.lengths) {
    const rest = length - 1 - (row.xcontrol ? 3 : 0);
    slots = Math.max(slots, Math.floor(rest / 5));
  }
  return slots;
}

/**
 * A d-key as the message SHOWS it. Op `J`'s unconditional-branch form has a LEGITIMATE BLANK key
 * (`table.ts:610`, "the blank d position must be present"), which renders in a list of keys as an
 * invisible gap — so it is shown as `␣`, the same substitution `table.ts`'s own `OP_D.autocoder`
 * pattern and `test/isa-table-vs-research.test.ts` already make for a blank d.
 */
const shownKey = (key: string): string => (key === ' ' ? '␣' : key);

/**
 * The three rulings of §5.2's "The explicit d", so no worker has to guess:
 *
 *  · the resolved form takes NO d (`dModifiers: 'none'`) -> `F`;
 *  · the form takes a d and the written glyph is not a key of that form's `dModifiers` -> `F`,
 *    listing the keys. THE ONE EXCEPTION is `dModifiers: 'any'` (BCE), where the d IS the compared
 *    character and every glyph is legal;
 *  · the mnemonic already bakes a d and an explicit one is written -> THE EXPLICIT ONE WINS, and
 *    the line carries NO flag. That is what makes `BZN LOOP,SWITCH,AB` writable at all and what
 *    lets a person reach a d the mnemonic table has no name for. `emit.ts`'s `dOf` is the other
 *    half of that ruling; this file only declines to flag it.
 *
 * `V`'s written token is a ZONE WORD naming a d rather than the d itself
 * (`V_ZONE_WORD_IS_THE_THIRD_OPERAND`, `mnemonics.ts`), so a `zoneWords` key is legal here and
 * `emit.ts` maps it to the d.
 */
function checkExplicitD(row: MnemonicRow, written: string, at: number, problems: Problem[]): void {
  if (row.zoneWords?.[written] !== undefined) return;
  const column = OPERAND_FROM + at;
  const keys = new Set<string>(Object.keys(row.zoneWords ?? {}));
  let takesD = false;
  let anyGlyph = false;
  for (const form of opByChar(row.opChar)?.forms ?? []) {
    if (form.dModifiers === 'none') continue;
    takesD = true;
    // §5.2 names `any` (BCE's compared character) as the one exception. `bitmask` joins it, and
    // the plan's list is what was incomplete: it is a real `table.ts` value on the W / X / R forms
    // (`table.ts:426, 453, 803` — BBE and the two channel-status branches), where the d is a SUM
    // of the bits to test (`dmods.ts` `RX_STATUS_BITS`, "one to six may be tested by a single
    // instruction"). A summed-bit d has no enumerable key set, so there is nothing to list and no
    // glyph to reject. Recorded in `docs/research/open-questions.md`'s wave-3 subsection.
    if (form.dModifiers === 'any' || form.dModifiers === 'bitmask') anyGlyph = true;
    else for (const key of Object.keys(form.dModifiers)) keys.add(key);
  }
  if (!takesD) {
    problems.push({ column, message: `${row.mnemonic} takes no d-modifier` });
    return;
  }
  if (!anyGlyph && !keys.has(written)) {
    problems.push({
      column,
      message: `d-modifier "${written}" is not defined for ${row.mnemonic} — the defined ones are `
        + [...keys].map(shownKey).join(' '),
    });
    return;
  }
  if ([...written].length !== 1) {
    problems.push({ column, message: `a d-modifier is one character; "${written}" is not` });
  }
}

// ═══ The parse stage — §6's first row ══════════════════════════════════════════════════════

/**
 * `text -> SourceCard[] -> Statement[]`. `source.ts` slices the columns, this file classifies the
 * operands and `mnemonics.ts` resolves the operation.
 *
 * AN UNRECOGNISED OPERATION gets flag `O` from `emit.ts` — CT 0, ADDRS the current counter, no
 * emission and a surviving listing line (§2.2's graceful-degradation paragraph). Its operands are
 * still split and still carry their text, but no `F` from classification is promoted onto the
 * line: §6.3's own reason for the precedence `O > F` is that YOU CANNOT JUDGE AN OPERAND BEFORE
 * YOU KNOW THE OP.
 */
export function parse(text: string): readonly Statement[] {
  return readSource(text).map((line, index) => statementOf(line, index + 1));
}

function statementOf(line: SourceLine, seqno: number): Statement {
  const { operand: operandField, ...half } = cardFields(line.card);
  const problems: Problem[] = [];
  let operands: readonly Operand[] = [];
  let explicitD: string | undefined;
  let commentText = '';

  if (half.comment) {
    // §5.1: a comments card is text 7-72 and no assembly. It never reaches step 3 at all.
    commentText = line.card.slice(COMMENT_COLUMN, OPERAND_TO).trimEnd();
  } else {
    const op = half.op.toUpperCase();
    const row = PSEUDO_OPS.has(op) ? undefined : resolve(op);
    const known = row !== undefined || PSEUDO_OPS.has(op) || op === '';

    if (op === 'JOB') {
      // Rule 0 — JOB's operand is FREE TEXT, columns 21-72 of the raw card verbatim. It is never
      // classified, never comma-split and never comment-cut: a JOB heading may contain double
      // blanks, and the demo's own card is `JOB  HELLO DAD - REENTRY TABLE`, 25 characters with
      // blanks and a hyphen that the symbolic rule would flag. It stays on `Statement.card`,
      // which is what `Statement` keeps the raw 80 columns FOR; pass 1 reads it by column,
      // exactly as it reads CTL's.
      operands = [];
    } else if (op === 'CTL') {
      // Rule 0 — CTL's operand field is read ONLY BY ABSOLUTE COLUMN: core size at column 22,
      // suppress code at column 23, off the raw card (`CTL_CORE_SIZE_COLUMN` /
      // `CTL_SUPPRESS_COLUMN`, types.ts). The demo's card has column 21 BLANK and column 22 = `1`,
      // so any rule keyed on the operand's first character would read a blank operand. Nothing
      // here is classified.
      operands = [];
    } else if (op === 'RUN') {
      // Rule 0 — RUN's mode word is in the LABEL field (`AUTOCODER` / `SYSTEMS`, §2.2's RUN row)
      // and the operand MUST BE BLANK. Which mode words are accepted, and RUN's label defining no
      // symbol, are pass 1's — this file owns the operand rule only.
      if (operandField.trim() !== '') {
        problems.push({
          column: OPERAND_FROM,
          message: 'RUN takes no operand — its mode word is in the label field (software.md §6)',
        });
      }
      operands = [];
    } else {
      const span = literalSpan(operandField);
      const cut = commentCut(operandField, span);
      const statement = operandField.slice(0, cut);
      commentText = operandField.slice(cut).trim();

      // §6.3's precedence rationale, applied: an operand cannot be judged before the op is known,
      // and a DA header's `b X l` is a DECLARATIVE grammar (`software.md` §5, C28-0309-1 pp.13-15)
      // that pass 1 parses off the raw text — step 3's ADDRESS rules cannot judge `1X80` either.
      const judged: Problem[] = known && op !== 'DA' ? problems : [];

      let pieces = splitOperands(statement, span);
      if (pieces.length > 3) {
        // "At most three" is an ADDRESS-RULE flag like every other one below, so it goes into
        // `judged` and obeys the same O > F suppression: how many operands an operation takes is
        // a fact about the operation, and an unknown op — or a DA header, whose `b X l` pass 1
        // parses off the raw text — has not established one. The TRUNCATION is unconditional:
        // classification never sees more than the A address, the B address and the d.
        judged.push({
          column: OPERAND_FROM + (pieces[3]?.at ?? 0),
          message: 'at most three operands are written: the A address, the B address and the d',
        });
        pieces = pieces.slice(0, 3);
      }

      // Where the addresses stop and the d begins (D_FOLLOWS_THE_ADDRESSES). A pseudo-operation
      // takes no d at all, and `ANY_LENGTH` states no layout, so both leave every piece an
      // address. A card read or punch spends its FIRST operand on the stacker pocket, which is
      // not an address either (C28-0309-1 p.23) — that is the extra slot, and it is the ONLY
      // operand an I/O statement writes beyond the B address and the optional d.
      const io = row?.io;
      const pocketSlot = io?.pockets === undefined ? 0 : 1;
      const slots = row === undefined || row.lengths.length === 0
        ? pieces.length
        : addressSlots(row) + pocketSlot;

      const written: Operand[] = [];
      // Rule 1 — the x-control field, built rather than read. It goes in first because operand
      // order IS the machine's field order, which is what `emit.ts` walks.
      if (row !== undefined && io !== undefined) written.push(xControlOf(row, io, pieces[0], judged));

      for (const [index, piece] of pieces.entries()) {
        if (index === 0 && pocketSlot === 1) continue;      // already spent, on x3 above
        if (index >= slots) {
          explicitD = piece.text;
          if (row !== undefined) checkExplicitD(row, piece.text, piece.at, judged);
          continue;
        }
        written.push(classifyAddress(piece.text, piece.at, judged));
      }

      // Step 5 — where indexing is REJECTED. `tagWritten` on one of these is `F` and the tag is
      // IGNORED. The x-control field needs no entry here: `xControlOf` builds it with `tag: 0` /
      // `tagWritten: false`, so it CANNOT carry a tag, and a term written on the POCKET fails as
      // a pocket instead.
      //
      // `written` and `pieces` are index-parallel ONLY when `pocketSlot` is 1: for the printer
      // and console families `written[0]` is the SYNTHESISED field, built from no piece at all.
      // The remap below is unreachable for I/O (`INDEXING_REJECTED` holds `DS` and the controls,
      // and I/O rows are `L`/`M`), so the mismatch is recorded, not worked around.
      if (INDEXING_REJECTED.has(op) || row?.opChar === 'G') {
        operands = written.map((operand, index) => {
          if (!operand.tagWritten) return operand;
          judged.push({
            column: OPERAND_FROM + (pieces[index]?.at ?? 0),
            message: `${op} does not accept indexing (software.md §2) — the index tag is ignored`,
          });
          const { tagSymbol: _dropped, ...rest } = operand;
          return { ...rest, tag: 0 };
        });
      } else {
        operands = written;
      }
    }
  }

  // ONE `F` per line (§6.3). A CARD-level defect wins over an operand one: the operand grammar was
  // reading a blank `source.ts` substituted for a character it rejected, so its complaint is
  // downstream of the card's.
  const format = line.format ?? messageOf(problems);
  return {
    seqno,
    card: line.card,
    ...half,
    operands,
    ...(explicitD === undefined ? {} : { d: explicitD }),
    comment_text: commentText,
    ...(format === undefined ? {} : { format }),
  };
}
