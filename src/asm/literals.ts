// src/asm/literals.ts — the literal pool: what pools, in what order, and where it lands
// (docs/plans/phase-3-autocoder.md §6.1; wave 4).
//
// A LITERAL IS A REQUEST FOR A PROCESSOR-GENERATED DCW (`software.md` §3, §5). `operand.ts`
// CLASSIFIES the four kinds and builds their cells; this file decides which of them enter the pool,
// in what order, whether two occurrences share one copy, and at what address the pool lands. Those
// are pass-1 decisions and none of them is visible to the operand grammar.
//
// THE FOUR RULES, all `[verified]` in `software.md` §3 unless marked:
//
//  1. ORDER IS ENCOUNTER ORDER, never sorted and never grouped by kind: "All pooled literals are
//     emitted as processor-produced DCW cards at the LTORG/EX/END point, in encounter order — not
//     where they were written."
//  2. DEDUPLICATION IS BY KIND AND SIZE, and `Literal.pooled` already carries the answer:
//     ≤9 digits plus sign, or 1-9 alphameric characters, are "pooled once per program section";
//     longer literals "are allocated on each occurrence". An area-defining literal is
//     `pooled: false` because deduplicating two work areas of the same size would merge them.
//  3. A CONSTANT WRITTEN AS A DECLARATIVE'S OPERAND NEVER POOLS. `ID DCW @HELLO1@` is that
//     statement's own constant; pooling it would generate a SECOND copy at the flush point, which
//     on the demo lands past 00643, adds a third object record and breaks §13's criteria 3 and 5
//     while the assembler still reports `ok: true` (§6.1). Only IMPERATIVES and the ORG / LTORG /
//     END operands pool — a program section is bounded by LTORG, END or EX.
//  4. A PROGRAM SECTION IS BOUNDED BY THE FLUSH. Area-defining-literal labels "die at each
//     LTORG/SPEND and must be redefined" (`software.md` §2), which this file models as the pool
//     forgetting them: a later section writing the same `NAME#n` gets a NEW allocation and no `M`.
//     The FLAT symbol table keeps the first assignment, so a reference in a later section to a
//     name it did not redefine still resolves — a modelling limit of a two-pass assembler with one
//     table, and the only part of the rule this pipeline cannot express.
//
// AND THE TRAP WAVE 3 NAMED IN ADVANCE: an address-constant literal's cells are a FIVE-BLANK
// PLACEHOLDER. `&LABEL` is the 5-character machine address of LABEL and that value is not known at
// parse — it is a symbol — so `resolveAddressConstant` below rebuilds the constant once the walk
// has a finished symbol table. A wave that read `Literal.cells` straight through would emit five
// blanks into core and lose the address silently.

import { WM } from '../core/types.js';
import type { Addr } from '../core/types.js';
import { encodeAddress } from './emit.js';
import { SOURCE_COLUMNS, SOURCE_FIELDS, type Literal, type Statement } from './types.js';

/** The declaratives, whose operand constants never pool (rule 3 above). */
const DECLARATIVES: ReadonlySet<string> = new Set(['DCW', 'DC', 'DS', 'DA', 'EQU']);
/** The three control operations whose operands DO pool — a program section's own boundaries. */
const POOLING_CONTROLS: ReadonlySet<string> = new Set(['ORG', 'LTORG', 'END']);
/** Every other control assembles no characters and writes no literal. */
const CONTROLS: ReadonlySet<string> = new Set(
  ['ORG', 'LTORG', 'END', 'JOB', 'CTL', 'RUN', 'LOAD', 'EJECT', 'RESEQ', 'PST'],
);

/** One literal waiting for the next flush, in encounter order. */
export interface PendingLiteral {
  readonly literal: Literal;
  /** The source card that FIRST wrote it — the one a deduplicated second occurrence shares. */
  readonly seqno: number;
  /** An area-defining literal's own label (`WKAREA` in `WKAREA#6`), `''` otherwise. */
  readonly label: string;
}

/** A pending literal after the flush gave it an address. */
export interface AssignedLiteral extends PendingLiteral {
  /** The HIGH-order position — where the processor-generated DCW's word mark goes. */
  readonly at: Addr;
  readonly length: number;
}

/**
 * The literals collected since the last flush. One instance per assembly; `symbols.ts` owns it and
 * is the only caller.
 */
export class LiteralPool {
  private items: PendingLiteral[] = [];

  /** The pending literals, in encounter order — for a test, and for a listing that wants to show
   *  the pool before it is assigned. */
  get pending(): readonly PendingLiteral[] {
    return this.items;
  }

  /**
   * Collect whatever literals this statement wrote, in the order it wrote them. A comments card, a
   * declarative and every control but ORG / LTORG / END contribute nothing (rule 3).
   */
  note(statement: Statement): void {
    const op = statement.op.toUpperCase();
    if (statement.comment || op === '' || DECLARATIVES.has(op)) return;
    if (CONTROLS.has(op) && !POOLING_CONTROLS.has(op)) return;

    for (const operand of statement.operands) {
      const literal = operand.literal;
      if (literal === undefined) continue;
      // Rule 2: `Literal.pooled` IS the dedup answer — the classifier already applied
      // `software.md` §3's size limits, kind by kind.
      if (literal.pooled && this.items.some((held) => held.literal.text === literal.text)) continue;
      // ONLY an area-defining literal carries a label of its own. `Operand.symbol` is also set on
      // an ADDRESS-CONSTANT literal, where it names the label being pointed AT — entering that as
      // a definition would redefine the target at the pool's address (`software.md` §3).
      const label = literal.kind === 'areaDefining' ? operand.symbol ?? '' : '';
      this.items.push({ literal, seqno: statement.seqno, label });
    }
  }

  /**
   * Assign every pending literal, starting at `at`, IN ENCOUNTER ORDER, and empty the pool. The
   * caller advances the assignment counter as it emits each one; this returns the addresses so
   * that arithmetic lives in exactly one place (`symbols.ts`'s `emitLiteral`).
   */
  flush(at: Addr): readonly AssignedLiteral[] {
    const assigned: AssignedLiteral[] = [];
    let next = at;
    for (const item of this.items) {
      const length = item.literal.cells.length;
      assigned.push({ ...item, at: next, length });
      next += length;
    }
    // Rule 4: the section ends here, so every label it defined dies with it.
    this.items = [];
    return assigned;
  }
}

/**
 * An area-defining literal carries its own label; a pooled literal is otherwise anonymous and is
 * looked up under its own TEXT (`emit.ts`'s `operandValue`). This builds the 80-column card the
 * listing prints for the generated DCW: the label in columns 6-15 and the literal as written in
 * the operand field, with a BLANK operation field — which is what Exhibit IV's rows 59-62 show
 * (`software.md` §5) and what keeps `emit.ts`'s `pooled` branch, not its DCW branch, in charge.
 */
export function literalStatement(assigned: AssignedLiteral, seqno: number): Statement {
  const card = [
    ' '.repeat(SOURCE_FIELDS.label[0] - 1),
    assigned.label.padEnd(SOURCE_FIELDS.operand[0] - SOURCE_FIELDS.label[0]),
    assigned.literal.text,
  ].join('').padEnd(SOURCE_COLUMNS).slice(0, SOURCE_COLUMNS);

  return {
    seqno,
    card,
    pglin: card.slice(0, SOURCE_FIELDS.line[1]),
    comment: false,
    label: assigned.label,
    labelIndented: false,
    labelIsActual: false,
    op: '',
    operands: [],
    comment_text: '',
  };
}

/**
 * The address-constant rebuild, run once the walk has a finished symbol table. `software.md` §3:
 * `&LABEL` "yields the 5-character machine address of LABEL, emitted via a processor-generated
 * DCW, UNSIGNED in core storage" — so no sign zone over the units position, and the word mark on
 * the high-order position exactly as the placeholder carried it.
 *
 * `encodeAddress(value, 0)` is `emit.ts`'s, deliberately: adjustment and indexing on an
 * address-constant literal modify THE ADDRESS OF THE LITERAL, not the literal's value
 * (`software.md` §3), so the tag is always 0 here and `Operand.adjust` / `Operand.tag` are applied
 * by pass 2 to the reference, never to the constant.
 */
export function resolveAddressConstant(literal: Literal, value: Addr): Literal {
  const cells = encodeAddress(value, 0);
  const first = cells[0];
  if (first !== undefined) cells[0] = first | WM;
  return { ...literal, cells };
}
