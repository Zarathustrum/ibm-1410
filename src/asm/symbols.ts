// src/asm/symbols.ts — PASS 1: the assignment-counter walk (docs/plans/phase-3-autocoder.md §6.1;
// wave 4).
//
//     pass1   Statement[] -> { SymbolTable, sized[], reserved[] }        symbols.ts + literals.ts
//
// ONE WALK, IN SOURCE ORDER, AND IT NEEDS NO SYMBOL VALUES — which is what makes one pass enough
// (§6.1). An instruction's length is a function of its SHAPE (op character, how many address
// operands are written, whether an x-control field is present, whether a d is) and never of what a
// symbol resolves to. `mnemonics.ts` supplies the shape; this file advances the counter;
// `OPS[octal].forms[].lengths` VALIDATES the result in pass 2 and never drives it (Phase 1's rule,
// unchanged).
//
// THE SHARPEST SENTENCE IN THE LANGUAGE, quoted verbatim because a warm start is where it bites —
// DS: "No information is entered into the area, no word mark is assigned by the processor, and the
// area is not cleared prior to reservation." (`software.md` §5, C28-0326-2 p.30.) A DS emits
// nothing, so the addresses it reserves are simply not covered by any item; `reserved` below is the
// only record that they were spoken for at all, which is why `pack()` takes it as a second
// argument (§8.3).
//
// ADDRS IS ONE RULE AND IT IS IMPLEMENTED ONCE, in `addrsOf` below: *the address a label on this
// statement WOULD resolve to*, computed for every line whether or not a label is written
// (`ListingLine.addrs`'s comment in types.ts; Exhibit IV's SEQNO 37 and 38 are both unlabelled and
// both carry an ADDRS).

import type { Addr } from '../core/types.js';
import type { SizedStatement } from './emit.js';
import {
  LiteralPool, literalStatement, resolveAddressConstant, type AssignedLiteral,
} from './literals.js';
import { resolve, type MnemonicRow } from './mnemonics.js';
import type { ReservedExtent } from './pack.js';
import { field } from './source.js';
import {
  CORE_SIZE_DEFAULT, CTL_CORE_SIZE_COLUMN, CTL_SUPPRESS_COLUMN, ORG_DEFAULT,
  type AsmFlag, type ListingLine, type Operand, type Statement, type SymbolEntry, type SymbolTable,
} from './types.js';

// ═══ The `// OPEN:` ledger for this file — plan §15, one named export per row ═══════════════

/**
 * OPEN: `COL7_INDENT_IS_STANDALONE_TOO` — `[likely]`. The claim: a label whose field begins in
 * column 7 rather than column 6 resolves to the HIGH-order position of what it names, on the
 * standalone C28-0309-1 Autocoder as well as the OS one. The sentence is the OS manual's —
 * "The high-order position will be referenced if the label is indented one column in the label
 * field; that is, if it begins in column 7" (`software.md` §5, C28-0326-2 p.28) — and C28-0309-1
 * says only the low-order half of the rule. Exhibit IV's two column-7 DCs at 00396 and 00402 are
 * the evidence that the rule is real; they are OS evidence, which is why
 * `test/tier1-exhibit-iv.test.ts` carries them in a separately named block (§11.2).
 * Fallback: drop the rule — every constant label is low-order, and `demos/hello-dad.asm` would
 * need `LINE` moved above the DCW or an explicit EQU. `open-questions.md`, Phase 3 / Wave 4.
 */
export const COL7_INDENT_IS_STANDALONE_TOO = true;

/**
 * OPEN: `ACTUAL_LABEL_IS_CHECKED_AGAINST_THE_COUNTER` — `[unverified]`. Both of `software.md` §1's
 * sentences are `[verified]`: an actual label "refers to the high-order position of the
 * instruction, constant, or defined field", and "actual labels have no effect on the address
 * assignment counters". What no source states is what happens when the number written disagrees
 * with where the counter actually is. This file flags `F` and assigns the counter's address
 * anyway. Fallback: define the symbol and do NOT check. It is deliberately NOT "treat it as an
 * implicit ORG" — that would contradict a `[verified]` sentence.
 * `open-questions.md`, Phase 3 / Wave 4.
 */
export const ACTUAL_LABEL_IS_CHECKED_AGAINST_THE_COUNTER = true;

/**
 * OPEN: `MULTIPLY_DEFINED_KEEPS_THE_FIRST_VALUE` — `[unverified]`. `software.md` §6 names the flag
 * `M` "multiply defined" and says nothing else: not which definition wins, and not whether
 * REFERENCES to the name are flagged too. This file keeps the FIRST value, flags `M` on every
 * later definition's own line, and leaves references unflagged — so one duplicated label produces
 * one flagged line rather than a listing whose every reference is red.
 * Fallback: keep the last value and flag the references too. `open-questions.md`, Phase 3 / Wave 4.
 */
export const MULTIPLY_DEFINED_KEEPS_THE_FIRST_VALUE = true;

/**
 * OPEN: `FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS` — `[likely]`. An `F` on a declarative's operand
 * does not un-reserve its storage: a flagged `DA 1X80,G` still reserves 81 positions, still
 * assigns the header address and every sub-entry address, and still advances the counter — only
 * the group-mark emission is dropped. It is what lets `test/tier1-exhibit-iv.test.ts` assert
 * Exhibit IV's 00315 / 00318 / 00394 on a line we flag (§2.2's `,G` row, §11.2).
 * Fallback: reserve nothing on a flagged declarative — which would slide every later address in
 * the listing, and is why this is the default. `open-questions.md`, Phase 3 / Wave 4.
 */
export const FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS = true;

/**
 * OPEN: `EQU_TO_AN_XCONTROL_FIELD_IS_OUT` — scope ruling on a `[verified]` source.
 * `software.md` §5 lists FOUR EQU forms (C28-0309-1 pp.12-16): an actual or previously-defined
 * symbolic address with adjustment, an index register (`X2` / `2,X`), and a label for "a tape unit
 * / X-control field". The fourth is out with an `F`: it makes a symbol whose value is three glyphs
 * rather than an address — a second namespace with no consumer in Phases 3, 5 or 6 (this
 * configuration has no tape, and since 2026-08-31 no source deck writes an x-control field at all
 * — the assembler synthesises it from the mnemonic, `mnemonics.ts` `IoControl`). Fallback: a
 * `kind: 'xcontrol'` `SymbolEntry` carrying a 3-glyph string, and §5.2
 * step 3 rule 1 accepting a symbol — ~15 lines, no other rule moves.
 * `open-questions.md`, Phase 3 / Wave 4.
 */
export const EQU_TO_AN_XCONTROL_FIELD_IS_OUT = true;

// ═══ What pass 1 hands the rest of the pipeline ════════════════════════════════════════════

/** The pass-1 half of a listing line. `listing.ts` (wave 5) merges it with pass 2's. */
export interface Pass1Line {
  readonly seqno: number;
  /** ADDRS — ONE RULE (`addrsOf`), computed for every line, labelled or not. */
  readonly addrs: Addr;
  /** CT — positions a declarative reserves, or an imperative's assembled length. Absent where the
   *  manual prints nothing: EQU, a DA sub-entry, a control statement, a comments card. */
  readonly ct?: number;
  /** ONE flag, precedence O > F > M > U — emit.ts's `ONE_FLAG_PER_LISTING_LINE` applied to the
   *  defects pass 1 is the one place that can see (a duplicate label, an actual label that
   *  disagrees with the counter, an out-of-scope suffix). */
  readonly flag?: AsmFlag;
  readonly why?: string;
  readonly kind: ListingLine['kind'];
}

export interface Pass1Result {
  /** Pass 2's input — one entry per source statement, plus one per pooled literal at its flush
   *  point. Parallel to `lines`, index for index. */
  readonly sized: readonly SizedStatement[];
  readonly symbols: SymbolTable;
  /** The DS / DA extents `pack()` cannot otherwise see (§8.3). */
  readonly reserved: readonly ReservedExtent[];
  readonly lines: readonly Pass1Line[];
  /** CTL column 22, or 20K when there is no CTL card. Feeds pass 2's range checks. */
  readonly coreSize: number;
  /** CTL column 23 as punched — one character, `tools/asm.ts`'s only consumer (types.ts). */
  readonly suppress: string;
  /** JOB / RESEQ columns 76-80, punched into cols 76-80 of every condensed card. */
  readonly ident: string;
  /** JOB's operand, the listing heading. */
  readonly heading: string;
  /** The LOAD card: "a load program should precede the object deck" = `loaderDeck()`. */
  readonly wantsLoader: boolean;
  /** END's operand -> `ObjectDeck.entry` -> the execute card. */
  readonly entry?: Addr;
}

// ═══ §2.2's operation partition, as pass 1 needs to see it ═════════════════════════════════

const DECLARATIVES: ReadonlySet<string> = new Set(['DCW', 'DC', 'DS', 'DA', 'EQU']);
const CONTROLS: ReadonlySet<string> = new Set(
  ['ORG', 'LTORG', 'END', 'JOB', 'CTL', 'RUN', 'LOAD', 'EJECT', 'RESEQ', 'PST'],
);

/** `software.md` §5: a DA header operand is `b X l` — blocking factor by field length. */
const DA_HEADER = /^([0-9]{1,5})X([0-9]{1,5})$/;
/** EQU's index-register form written as one operand: `X2` (`software.md` §5). */
const INDEX_EQUATE = /^X([0-9]{1,2})$/;
/** `software.md` §2: a symbolic label is ≤10 alphameric, first alphabetic, no specials. */
const SYMBOL = /^[A-Z][A-Z0-9]{0,9}$/;
/** `software.md` §2: X1 through X15. */
const INDEX_REGISTERS = 15;

/** ONE FLAG PER LINE, precedence O > F > M > U — emit.ts's `ONE_FLAG_PER_LISTING_LINE` (§6.3). */
const FLAG_ORDER: readonly AsmFlag[] = ['O', 'F', 'M', 'U'];

/**
 * The SAME precedence, applied to a line the walk has already finished. `pass1`'s `strongest()`
 * reduces the flags a line raised WHILE it was being walked; the two post-walk back-patches at the
 * foot of `pass1` — an address constant whose target never got defined, and an END naming an
 * undefined entry point — arrive after that reduction has run and its `raised` list is gone, so
 * they compare against the flag already on the line instead. Same rule, same order, one letter out
 * (emit.ts's `ONE_FLAG_PER_LISTING_LINE`): a line that already earned `O`, `F` or `M` keeps it.
 * emit.ts's own `strongest()` is not exported and takes its private `Accum`, hence the comparison
 * rather than a call.
 */
function raise(line: Pass1Line, flag: AsmFlag, why: string): Pass1Line {
  const held = line.flag;
  if (held !== undefined && FLAG_ORDER.indexOf(held) <= FLAG_ORDER.indexOf(flag)) return line;
  return { ...line, flag, why };
}

// ═══ Pass 1 ════════════════════════════════════════════════════════════════════════════════

/**
 * The assignment-counter walk. Never throws on source content: every defect is a flag on a line
 * (§6.3), and a statement pass 1 cannot make sense of still gets an ADDRS and still leaves the
 * counter somewhere sane, so the addresses below it stay right.
 */
export function pass1(statements: readonly Statement[]): Pass1Result {
  const symbols = new Map<string, SymbolEntry>();
  const reserved: ReservedExtent[] = [];
  const sized: SizedStatement[] = [];
  const lines: Pass1Line[] = [];
  const pool = new LiteralPool();

  let counter: Addr = ORG_DEFAULT;
  /** The high-water mark a blank ORG returns to: "high assignment counter + 1", which is this
   *  counter's own reading of "the next free address" (`software.md` §2). */
  let highWater: Addr = ORG_DEFAULT;
  let coreSize = CORE_SIZE_DEFAULT;
  let suppress = ' ';
  let ident = '';
  let heading = '';
  let wantsLoader = false;
  let endOperand: Operand | undefined;
  let endLine = -1;

  /** The DA header currently collecting sub-entries: its index in `sized`, and its origin. */
  let daHeader: { index: number; at: Addr; fields: Addr[] } | undefined;

  /** Pooled-literal SEQNOs continue past the last source card: a processor-generated DCW is not a
   *  card, and `pack()`'s `cardOf` is keyed on SEQNO and must stay a function. */
  let literalSeqno = statements.length;

  // ─── the flags this walk raises, one per line by precedence ───────────────────────────────
  let raised: { flag: AsmFlag; why: string }[] = [];
  const flag = (f: AsmFlag, why: string): void => { raised.push({ flag: f, why }); };
  const strongest = (): { flag: AsmFlag; why: string } | undefined => {
    for (const f of FLAG_ORDER) {
      const hit = raised.find((r) => r.flag === f);
      if (hit !== undefined) return hit;
    }
    return undefined;
  };

  // ─── the symbol table ─────────────────────────────────────────────────────────────────────

  /**
   * MULTIPLY_DEFINED_KEEPS_THE_FIRST_VALUE: the first definition's value and seqno stand, every
   * later one flags `M` on its own line, and the stored entry records that the NAME is multiply
   * defined — which is the only place `SymbolEntry.duplicate` can be observed, since the later
   * definition is never entered.
   */
  const define = (
    name: string, value: Addr, kind: SymbolEntry['kind'],
    resolvedTo: SymbolEntry['resolvedTo'], seqno: number, indexRegister?: number,
  ): void => {
    const first = symbols.get(name);
    if (first !== undefined) {
      symbols.set(name, { ...first, duplicate: true });
      flag('M', `${name} is already defined at SEQNO ${first.definedAt} — the first value stands`);
      return;
    }
    symbols.set(name, {
      name, value, kind, resolvedTo, definedAt: seqno, duplicate: false,
      ...(indexRegister === undefined ? {} : { indexRegister }),
    });
  };

  /** A pooled literal enters the table under the literal's OWN TEXT, which is the key `emit.ts`'s
   *  `operandValue` looks a `literal` operand up under. A second copy of a non-pooled literal is
   *  dead storage holding the same characters by construction, so it defines nothing and flags
   *  nothing — both references resolve to the first copy, which is the same value. */
  const defineLiteral = (name: string, value: Addr, seqno: number): void => {
    if (symbols.has(name)) return;
    symbols.set(name, {
      name, value, kind: 'literal', resolvedTo: 'lowOrder', definedAt: seqno, duplicate: false,
    });
  };

  /** ORG / EQU / END take an ACTUAL address, a PREVIOUSLY-DEFINED symbol, or `*` — and in EQU /
   *  ORG / LTORG the asterisk is the assignment counter, never the last character of an
   *  instruction (`software.md` §2's two meanings; the two readings never share a helper). */
  const valueOf = (operand: Operand): number | undefined => {
    switch (operand.kind) {
      case 'actual':
        return (operand.actual ?? 0) + operand.adjust;
      case 'asterisk':
        return counter + operand.adjust;
      case 'symbolic': {
        const name = operand.symbol ?? operand.text;
        const entry = symbols.get(name);
        if (entry !== undefined) return entry.value + operand.adjust;
        flag('U', `${name} is not defined`);
        return undefined;
      }
      default:
        return undefined;
    }
  };

  /** Advance the counter, and range-check the extent against CTL column 22 (§2.2's CTL row). */
  const advance = (by: number): void => {
    counter += by;
    if (counter > highWater) highWater = counter;
    if (counter > coreSize) {
      flag('F', `the assignment counter reached ${counter}, past the ${coreSize}-position core `
        + '(CTL column 22)');
    }
  };

  /**
   * ADDRS — ONE RULE: the address a label on this statement WOULD resolve to. HIGH-order for an
   * instruction, a DA header, a column-7-indented label field and an actual label; LOW-order for a
   * constant or a reserved area in an un-indented label field (`software.md` §5,
   * COL7_INDENT_IS_STANDALONE_TOO above).
   *
   * This helper is the LOW-order half of that rule and its two exceptions. The high-order cases
   * that never reach it — an instruction, a DA header, a DA sub-entry — pass their own address
   * straight through at the call site, because for them there is no extent to walk to the end of.
   */
  const addrsOf = (statement: Statement, at: Addr, extent: number): Addr => {
    if (statement.labelIndented || statement.labelIsActual) return at;
    return at + Math.max(extent, 1) - 1;
  };

  /** The high-order position an ACTUAL label names, cross-checked against the counter.
   *
   *  `resolvedTo` is normally READ OFF the two addresses — a label listed at the counter resolves
   *  high-order, one listed past it resolves low-order. A DA sub-entry is the one call site where
   *  that inference is wrong: the sub-entry's `at` IS its own low-order position, so the two
   *  addresses agree and the inference would say high-order, while `software.md` §5 says
   *  low-order for BOTH sub-entry forms ("Low-order position of the field" for `hi,lo`, "That
   *  low-order position" for the bare `lo`). It passes the answer in. */
  const defineLabel = (
    statement: Statement, at: Addr, addrs: Addr, kind: SymbolEntry['kind'],
    resolvedTo?: SymbolEntry['resolvedTo'],
  ): void => {
    if (statement.label === '') return;
    if (statement.labelIsActual) {
      // ACTUAL_LABEL_IS_CHECKED_AGAINST_THE_COUNTER: it refers to the HIGH-ORDER position and
      // MOVES NOTHING, so the number written must be where the counter already is.
      const written = Number(statement.label);
      if (written !== at) {
        flag('F', `the actual label ${statement.label} names ${written}, but the assignment `
          + `counter is at ${String(at).padStart(5, '0')} — an actual label moves nothing `
          + '(software.md §1)');
      }
      define(statement.label, at, 'actual', 'highOrder', statement.seqno);
      return;
    }
    define(
      statement.label, addrs, kind,
      resolvedTo ?? (addrs === at ? 'highOrder' : 'lowOrder'), statement.seqno,
    );
  };

  /** §6.1's shape ladder, in the three slots the emitter fills — the SAME arithmetic
   *  `emit.ts`'s `emitImperative` performs, so pass 1's length is pass 2's cell count. */
  const lengthOf = (statement: Statement, row: MnemonicRow): number => {
    const xcontrol = statement.operands.some((operand) => operand.kind === 'xcontrol');
    const addresses = statement.operands.filter(
      (operand) => operand.kind !== 'xcontrol' && operand.kind !== 'blank',
    ).length;
    // Row 1 of the ladder: length 1 is "op alone, EVERYTHING chained" — the d is chained too.
    const chained = row.chainable && row.lengths.includes(1)
      && statement.operands.every((operand) => operand.kind === 'blank')
      && statement.d === undefined;
    const d = chained ? undefined : statement.d ?? row.d;
    return 1 + (xcontrol ? 3 : 0) + 5 * addresses + (d === undefined ? 0 : 1);
  };

  /** One processor-generated DCW, at the address the flush assigned it. Its label — an
   *  area-defining literal's own — resolves LOW-order, exactly as a constant's does. */
  const emitLiteral = (assigned: AssignedLiteral): void => {
    raised = [];
    literalSeqno += 1;
    const statement = literalStatement(assigned, literalSeqno);
    const low = assigned.at + assigned.length - 1;
    defineLiteral(assigned.literal.text, low, literalSeqno);
    // An area-defining literal ALSO defines its own label, at the area's low-order position
    // (`software.md` §3's worked example: BUFFERTWO = 00596 for a 10-position area).
    if (assigned.label !== '') defineLiteral(assigned.label, low, literalSeqno);
    sized.push({ statement, at: assigned.at, length: assigned.length, pooled: assigned.literal });
    advance(assigned.length);
    const hit = strongest();
    lines.push({
      seqno: literalSeqno, addrs: low, ct: assigned.length,
      ...(hit === undefined ? {} : { flag: hit.flag, why: hit.why }),
      kind: 'literal',
    });
  };

  /**
   * Assign the pending pool at `at`, in ENCOUNTER order, and emit one sized line per literal.
   *
   * MOVING THE COUNTER IS NOT MOVING THE HIGH-WATER MARK, and `counter = at` is deliberately
   * unguarded. `highWater` is "the high assignment counter + 1" — what a BLANK ORG returns to
   * (`software.md` §2) — and `advance()` is the only thing that raises it, which means an LTORG
   * whose pool is EMPTY relocates the counter and leaves the high-water mark where it was, so a
   * later blank ORG can return BELOW that LTORG's address. That is the rule read literally:
   * nothing was assigned at `at`, so the high assignment counter did not move. A non-empty pool
   * raises the mark through `emitLiteral`'s `advance`, which is the only case where an LTORG
   * assigns anything at all.
   */
  const flushPool = (at: Addr): void => {
    counter = at;
    for (const assigned of pool.flush(at)) emitLiteral(assigned);
  };

  // ─── the walk ─────────────────────────────────────────────────────────────────────────────

  for (const statement of statements) {
    raised = [];
    const op = statement.op.toUpperCase();
    const at = counter;
    let length = 0;
    let ct: number | undefined;
    let kind: ListingLine['kind'] = 'imperative';
    let addrs: Addr = counter;
    /** What pass 2 is told this statement sits at. It is the counter for everything that occupies
     *  storage; a DA SUB-ENTRY is the exception — the area was reserved by the header, and the
     *  sub-entry's own address is the field it names, not wherever the counter has since gone. */
    let sizedAt: Addr = counter;
    const operand = statement.operands[0];

    // A DA's sub-entries are the cards immediately after it whose OPERATION FIELD IS BLANK; the
    // first card with an operation closes the area (`software.md` §5).
    if (op !== '' && daHeader !== undefined) daHeader = undefined;

    if (statement.comment) {
      kind = 'comment';
    } else if (op === '') {
      kind = 'daSubEntry';
      if (daHeader === undefined) {
        if (statement.label !== '' || statement.operands.length > 0) {
          flag('F', 'a blank operation field is a DA sub-entry, and no DA statement precedes it');
        }
        kind = 'control';
      } else {
        // `hi,lo` sets a word mark on the field's HIGH-ORDER position and the label resolves
        // LOW-order; a bare `lo` defines a subfield with NO word mark (`software.md` §5).
        const first = statement.operands[0];
        const second = statement.operands[1];
        const lo = second ?? first;
        const relative = (o: Operand | undefined): number | undefined =>
          (o?.kind === 'actual' ? (o.actual ?? 0) + o.adjust : undefined);
        const hi = second === undefined ? undefined : relative(first);
        const low = relative(lo);
        if (low === undefined) {
          flag('F', 'a DA sub-entry is `hi,lo` or a single relative position (software.md §5)');
        } else {
          addrs = daHeader.at + low - 1;
          sizedAt = addrs;
          if (hi !== undefined) daHeader.fields.push(daHeader.at + hi - 1);
          // LOW-order for BOTH forms, stated explicitly rather than inferred from `at === addrs`:
          // `software.md` §5's table gives the `hi,lo` sub-entry "Low-order position of the field"
          // and the bare-`lo` subfield "That low-order position". Only the HEADER is high-order.
          defineLabel(statement, addrs, addrs, 'area', 'lowOrder');
          const header = sized[daHeader.index];
          if (header !== undefined) {
            sized[daHeader.index] = { ...header, daFields: [...daHeader.fields] };
          }
        }
      }
    } else if (CONTROLS.has(op)) {
      kind = 'control';
      switch (op) {
        case 'RUN':
          // RUN's mode word is in the LABEL FIELD and DEFINES NO SYMBOL — it is consumed by RUN,
          // so a program may still label something `AUTOCODER` (§2.2's RUN row).
          if (statement.label === 'SYSTEMS') {
            flag('F', 'RUN SYSTEMS: no library — this configuration has no tape (software.md §7, '
              + 'DECISIONS.md 2026-08-30)');
          } else if (statement.label !== 'AUTOCODER') {
            flag('F', `RUN's mode word is written in the label field: AUTOCODER assembles, `
              + `SYSTEMS updates the library; "${statement.label}" is neither (software.md §6)`);
          }
          break;
        case 'JOB':
          // JOB's operand is FREE TEXT read off the raw card, and the ident is the card's OWN
          // columns 76-80 (JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80, §15).
          heading = field(statement.card, 'operand').trim();
          ident = field(statement.card, 'ident').trimEnd();
          break;
        case 'CTL': {
          // Read by ABSOLUTE COLUMN: core size at 22 (1 = 10K … 5 = 80K), suppress code at 23.
          const size = statement.card[CTL_CORE_SIZE_COLUMN - 1] ?? ' ';
          const code = Number(size);
          if (size !== ' ' && Number.isInteger(code) && code >= 1 && code <= 5) {
            coreSize = [10_000, 20_000, 40_000, 60_000, 80_000][code - 1] ?? CORE_SIZE_DEFAULT;
          } else if (size !== ' ') {
            flag('F', `CTL column 22 is the core-size code 1-5 (1 = 10K … 5 = 80K); "${size}" is `
              + 'not one (software.md §6)');
          }
          suppress = statement.card[CTL_SUPPRESS_COLUMN - 1] ?? ' ';
          break;
        }
        case 'LOAD':
          wantsLoader = true;
          break;
        case 'RESEQ':
          // RESEQ resets the object-deck sequence to 001 and changes the ident. The RESET is
          // applied by the caller that walks the records (wave 6); pass 1 reads the ident.
          ident = field(statement.card, 'ident').trimEnd();
          break;
        case 'ORG': {
          // Actual, previously-defined symbolic, `*` with adjustment, or BLANK = the high
          // assignment counter + 1 (`software.md` §2).
          if (operand === undefined || operand.kind === 'blank') counter = highWater;
          else {
            const value = valueOf(operand);
            if (value === undefined) {
              if (operand.kind !== 'symbolic') {
                flag('F', `ORG takes an actual address, a previously-defined symbol, \`*\` or a `
                  + `blank operand; "${operand.text}" is none of them (software.md §2)`);
              }
            } else if (value < 0 || value >= coreSize) {
              flag('F', `origin ${value} is outside the ${coreSize}-position core (CTL column 22)`);
            } else {
              counter = value;
            }
          }
          addrs = counter;
          if (counter > highWater) highWater = counter;
          break;
        }
        case 'LTORG': {
          // Assign the literals collected since the last flush AT THE OPERAND ADDRESS (or the
          // counter for `*`), in ENCOUNTER order (`software.md` §2).
          const value = operand === undefined || operand.kind === 'blank'
            ? counter
            : valueOf(operand);
          addrs = value ?? counter;
          break;
        }
        case 'END':
          // END names the entry point and FLUSHES the pool if no LTORG has (`software.md` §3).
          endOperand = operand;
          endLine = lines.length;
          break;
        default:
          break;
      }
    } else if (DECLARATIVES.has(op)) {
      kind = 'declarative';
      switch (op) {
        case 'EQU': {
          // Three of four forms (§2.2): actual / previously-defined symbolic with adjustment, and
          // the index register. EMITS NOTHING, MOVES NOTHING.
          const index = indexRegisterOf(statement);
          if (index !== undefined) {
            if (index < 1 || index > INDEX_REGISTERS) {
              flag('F', `index register ${index} does not exist — the 1410 has X1 through `
                + `X${INDEX_REGISTERS} (software.md §2)`);
            } else if (statement.label !== '') {
              define(statement.label, index, 'equate', 'highOrder', statement.seqno, index);
            }
            addrs = counter;
            break;
          }
          const name = operand?.symbol ?? operand?.text ?? '';
          if (operand !== undefined && operand.kind === 'symbolic' && !SYMBOL.test(name)) {
            // EQU_TO_AN_XCONTROL_FIELD_IS_OUT: the fourth documented form — a label for a tape
            // unit or an X-control field — makes a symbol whose value is three glyphs rather than
            // an address. Out, with an `F`.
            flag('F', `EQU to a tape unit or an X-control field is out of scope: "${operand.text}" `
              + 'is not an address (software.md §5, C28-0309-1 pp.12-16)');
            addrs = counter;
            break;
          }
          const value = operand === undefined ? undefined : valueOf(operand);
          addrs = value ?? counter;
          if (value !== undefined && statement.label !== '') {
            // An equate's value IS the address; there is no high/low order to choose.
            define(statement.label, value, 'equate', 'highOrder', statement.seqno);
          }
          break;
        }
        case 'DS': {
          // Reserves positions, EMITS NOTHING, and DOES NOT CLEAR THE AREA.
          const positions = operand?.kind === 'actual' ? (operand.actual ?? 0) + operand.adjust : 0;
          if (positions <= 0) {
            flag('F', 'DS reserves a number of positions (software.md §5)');
          }
          length = Math.max(positions, 0);
          ct = length;
          addrs = addrsOf(statement, at, length);
          defineLabel(statement, at, addrs, 'area');
          if (length > 0) {
            reserved.push({ from: at, to: at + length - 1, label: statement.label });
          }
          advance(length);
          break;
        }
        case 'DA': {
          const header = DA_HEADER.exec(operand?.text ?? '');
          const blocking = header === null ? 0 : Number(header[1]);
          const fieldLength = header === null ? 0 : Number(header[2]);
          if (header === null) {
            flag('F', `a DA header operand is \`b X l\` — blocking factor by field length; `
              + `"${operand?.text ?? ''}" is not (software.md §5)`);
          }
          // FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS: the suffixes below are out of scope and each
          // flags `F`, and the area is reserved and assigned anyway — only the group-mark /
          // record-mark EMISSION is dropped (§2.2's two DA `SUFFIX_RULINGS` rows).
          let extra = 0;
          for (const suffix of statement.operands.slice(1)) {
            const text = suffix.text.toUpperCase();
            if (text === 'G') {
              extra += 1;
              flag('F', 'DA `,G` is out: the group-mark-word-mark it asks for is one the condensed '
                + 'deck cannot carry (OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK, '
                + 'src/formats/objectdeck.ts; plan §2.2, §2.4). The area is still reserved and '
                + 'every address still assigned');
            } else if (text === '#') {
              extra += Math.max(blocking, 0);
              flag('F', 'DA `,#` is out on scope: nothing in Phases 3, 5 or 6 defines a blocked '
                + 'area needing an inter-area record mark (plan §2.2). The area is still reserved '
                + 'and every address still assigned');
            } else if (text === '0' || text === 'N') {
              flag('F', `DA \`,${text}\` is out: \`,N\` is OS-only (C28-0326-2 p.25, not documented `
                + 'for C28-0309-1) and `,0` relative-to-zero addressing changes what every '
                + 'sub-entry label means, with no consumer here (plan §2.2)');
            } else {
              flag('F', `"${suffix.text}" is not a DA heading suffix this assembler carries — `
                + '`,G` `,#` `,0` `,N` are all out of scope (plan §2.2)');
            }
          }
          length = blocking * fieldLength + extra;
          ct = length;
          // The header label is the HIGH-ORDER position of the WHOLE AREA (`software.md` §5).
          addrs = at;
          defineLabel(statement, at, at, 'area');
          if (length > 0) {
            reserved.push({ from: at, to: at + length - 1, label: statement.label });
          }
          daHeader = { index: sized.length, at, fields: [] };
          advance(length);
          break;
        }
        default: {
          // DCW / DC. The constant is the operand's OWN literal (§5.2 rule 3: written as a
          // DECLARATIVE's operand it is that statement's constant and NEVER pools); an address
          // constant — `DCW LABEL+10` — has no literal and is five positions.
          let constant = operand?.literal?.cells.length ?? 5;
          if (operand === undefined) {
            flag('F', `${op} has no constant (software.md §5)`);
            constant = 0;
          }
          let extra = 0;
          for (const suffix of statement.operands.slice(1)) {
            if (suffix.text.toUpperCase() === 'G') {
              // The third `SUFFIX_RULINGS` row. `,G` places a group-mark-word-mark FOLLOWING the
              // last character and "the associated label will refer to the last character of the
              // constant, not the group-mark word-mark" (`software.md` §5) — so the position is
              // reserved, the label still resolves to the constant's own low-order, and the mark
              // itself is not emitted (FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS).
              extra += 1;
              flag('F', `${op} \`,G\` is out: a word mark over a group mark is one the condensed `
                + 'deck cannot carry (OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK, '
                + 'src/formats/objectdeck.ts; plan §2.2, §2.4). The position is still reserved and '
                + 'the label still resolves to the constant');
            } else {
              flag('F', `"${suffix.text}" follows the constant — only \`,G\` is written there, and `
                + 'it is out of scope (plan §2.2)');
            }
          }
          length = constant + extra;
          ct = length;
          addrs = addrsOf(statement, at, constant);
          defineLabel(statement, at, addrs, 'constant');
          advance(length);
          break;
        }
      }
    } else {
      // An IMPERATIVE. An unrecognised operation is pass 2's `O` — CT 0, ADDRS the current
      // counter, no emission and a surviving listing line (§2.2's closing paragraph).
      const row = resolve(op);
      if (row !== undefined) {
        length = lengthOf(statement, row);
        ct = length;
        addrs = at;
        defineLabel(statement, at, at, 'instruction');
        pool.note(statement);
        advance(length);
      } else {
        // Its LABEL is still defined, at the counter: ADDRS is one rule — "the address a label on
        // this statement WOULD resolve to" — and an operation that assembles no characters leaves
        // the counter exactly where a label on it would point. Defining it keeps one unknown
        // operation to ONE flagged line instead of flagging every reference to its label as well.
        ct = 0;
        addrs = at;
        defineLabel(statement, at, at, 'instruction');
      }
    }

    // ORG / LTORG / END operands pool too (`software.md` §3: a program section is bounded by
    // LTORG, END or EX) — and no other control does, and no declarative ever does.
    if (op === 'ORG' || op === 'LTORG' || op === 'END') pool.note(statement);

    const hit = strongest();
    sized.push({ statement, at: sizedAt, length });
    lines.push({
      seqno: statement.seqno, addrs,
      ...(ct === undefined ? {} : { ct }),
      ...(hit === undefined ? {} : { flag: hit.flag, why: hit.why }),
      kind,
    });

    // The pool is assigned AFTER the flush statement's own line, which is the order Exhibit IV
    // prints: SEQNO 58 `LTORG *` at 00302, then the four literals at 00302-00314 (§11.2).
    if (op === 'LTORG') flushPool(lines[lines.length - 1]?.addrs ?? counter);
    else if (op === 'END') flushPool(counter);
  }

  // ─── after the walk: the two things that need the finished table ──────────────────────────

  // An address-constant literal's cells were a five-blank PLACEHOLDER at parse — `&LABEL` is the
  // 5-character machine address of LABEL and that value is not known until the walk is over
  // (`software.md` §3; wave 3's ruling 4). Rebuild them here, through the SymbolTable, so
  // `emit.ts` emits the resolved address and not five blanks.
  for (const [index, entry] of sized.entries()) {
    if (entry.pooled?.kind !== 'addressConstant') continue;
    const name = entry.pooled.text.slice(1);
    const target = symbols.get(name);
    if (target === undefined) {
      const line = lines[index];
      if (line !== undefined) lines[index] = raise(line, 'U', `${name} is not defined`);
    }
    sized[index] = { ...entry, pooled: resolveAddressConstant(entry.pooled, target?.value ?? 0) };
  }

  // END's operand is the entry point. It is resolved against the FINISHED table: END is the last
  // card, so everything a program can name is defined by the time it is read.
  let entry: Addr | undefined;
  if (endOperand !== undefined && endOperand.kind !== 'blank') {
    const name = endOperand.symbol ?? endOperand.text;
    const target = endOperand.kind === 'actual'
      ? (endOperand.actual ?? 0)
      : symbols.get(name)?.value;
    if (target === undefined) {
      const line = lines[endLine];
      if (line !== undefined) lines[endLine] = raise(line, 'U', `${name} is not defined`);
    } else {
      entry = target + endOperand.adjust;
    }
  }

  return {
    sized, symbols, reserved, lines, coreSize, suppress, ident, heading, wantsLoader,
    ...(entry === undefined ? {} : { entry }),
  };
}

/**
 * EQU's index-register form, in BOTH its spellings (`software.md` §5): `X2` written as one
 * operand, and `2,X` written as two. Neither is an address, which is why it is decided before the
 * address forms are.
 */
function indexRegisterOf(statement: Statement): number | undefined {
  const [first, second] = statement.operands;
  if (second !== undefined && (second.symbol ?? second.text).toUpperCase() === 'X'
    && first?.kind === 'actual') {
    return first.actual ?? 0;
  }
  if (statement.operands.length !== 1 || first === undefined) return undefined;
  const index = INDEX_EQUATE.exec((first.symbol ?? first.text).toUpperCase());
  return index === null ? undefined : Number(index[1]);
}
