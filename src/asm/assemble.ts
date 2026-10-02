// src/asm/assemble.ts — THE ONE ENTRY POINT. Source text in, `AssemblyResult` out.
// Source: docs/plans/phase-3-autocoder.md §2.3 (the macro seam), §4 (the signature and every
// field of `AssemblyResult`), §8.3 (the ident/RESEQ map), §11 wave 6.
//
// IT NEVER THROWS ON SOURCE CONTENT. Every defect a person can write is a FLAG on a listing line
// and a `false` in `ok`; the deck is still returned and is simply wrong, which is what lets the
// view render a broken assembly instead of showing an exception (§4, §6.3). The only throwable
// that can escape is `AssemblerBug` — an assembler-internal invariant violation, raised by
// `emit.ts` and deliberately NOT caught here: a bug that is swallowed is a bug that ships.
//
// THIS FILE COMPOSES AND DOES NOTHING ELSE. Every rule lives in the module that owns it, so the
// pipeline below is five calls and a shape. That is the point of building it last: waves 1-5 each
// closed on their own oracle, and wave 6 adds no behaviour to join them up.

import { pass2 } from './emit.js';
import { JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80, buildListing } from './listing.js';
import { parse } from './operand.js';
import { pack } from './pack.js';
import { field } from './source.js';
import { pass1 } from './symbols.js';
import type {
  AssemblyOptions, AssemblyResult, EmittedItem, ListingLine, Statement,
} from './types.js';
import type { ObjectDeck, ObjectRecord } from '../formats/objectdeck.js';

/**
 * THE CALLER-SIDE IDENT / RESEQ MAP. `pack()` numbers the cards and stops there — "RESEQ resets
 * the sequence to 001; that reset is the caller's" (`pack.ts`) — and `pack.ts`'s two-argument
 * arity is frozen. So the ident that JOB and RESEQ punch into columns 76-80 of every condensed
 * card (`software.md` §6, `[verified]`) is applied HERE, over the records `pack()` returned,
 * before any deck is handed out.
 *
 * MIGRATED VERBATIM FROM `tools/asm.ts` IN WAVE 6, which is where it landed in wave 5 because
 * `assemble()` did not exist yet and the CLI was the only caller that walked the records
 * (`open-questions.md`, Phase 3 / Wave 5, which names this move). It takes no CLI argument and
 * reads no CLI state, so the move was a cut and paste; `tools/asm.ts` re-exports the name so
 * `test/asm-listing.test.ts`'s import keeps resolving, and the wave-6 assertion is the same fact
 * one level up — `assemble(demos/hello-dad.asm)` punches `001HDAD1` and `002HDAD1`.
 *
 * WHICH CARD A CHANGE LANDS ON is a ruling, not a reading: `software.md` §6 says RESEQ "resets the
 * object-deck sequence to 001 and changes the ident" and says NOTHING about card boundaries. The
 * ruling: a card takes the ident and the sequence in force for THE STATEMENT THAT OWNS ITS FIRST
 * CELL — the emitted item whose `[at, at + cells.length)` covers `record.loadAddress` — under the
 * latest JOB or RESEQ whose seqno is LESS than that owner's, a RESEQ governing the statements
 * after it.
 *
 * WHY NOT `cardOf`. `cardOf` records where a statement BEGINS, and packing is contiguous, so a
 * statement written after a RESEQ routinely begins in the middle of a card already half full of
 * cells assembled BEFORE it. Keyed on `cardOf`, that straddling card would be relabelled and the
 * JOB's ident could vanish from the deck entirely — a 50-character DCW, a RESEQ, and two more
 * 50-character DCWs pack to three cards of which the first holds the JOB's program. Under the
 * ruling that card keeps the OLD ident and the OLD sequence, and the rebase to 001 happens on the
 * first card whose first cell is the RESEQ's own. `open-questions.md`, Phase 3 / Wave 5.
 */
export function withIdent(
  records: readonly ObjectRecord[],
  statements: readonly Statement[],
  items: readonly EmittedItem[],
): readonly ObjectRecord[] {
  interface Change { readonly seqno: number; readonly ident: string; readonly reseq: boolean; }
  const changes: Change[] = [];
  for (const statement of statements) {
    const op = statement.op.toUpperCase();
    if (op !== 'JOB' && op !== 'RESEQ') continue;
    // THE PUNCH SITE of `JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80` (`listing.ts`, plan §15,
    // `[likely]`): the ident is the JOB/RESEQ card's OWN identification field, columns 76-80, and
    // the constant is imported from the heading's point of use rather than restated so the punched
    // ident and the printed one cannot diverge. Fallback if it is overturned: the first five
    // characters of the JOB operand, which is the other branch here.
    const ident = (JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80
      ? field(statement.card, 'ident')
      : field(statement.card, 'operand').slice(0, 5)).trimEnd();
    changes.push({ seqno: statement.seqno, ident, reseq: op === 'RESEQ' });
  }

  /** The seqno of the statement that owns a card's first cell. */
  const ownerOf = (record: ObjectRecord): number | undefined => items.find(
    (item) => record.loadAddress >= item.at && record.loadAddress < item.at + item.cells.length,
  )?.seqno;

  let governing = -1;                       // index into `changes`; -1 = no JOB seen yet
  let base = 0;                             // the record the sequence counts from — RESEQ moves it
  return records.map((record, index) => {
    const owner = ownerOf(record);
    // The LATEST change the owning statement is after. `changes` is in statement order, so the
    // last index that passes the test is the one in force.
    const next = owner === undefined
      ? governing
      : changes.reduce((latest, change, i) => (change.seqno < owner ? i : latest), -1);
    if (next !== governing) {
      governing = next;
      if (changes[governing]?.reseq === true) base = index;
    }
    const ident = changes[governing]?.ident ?? '';
    return {
      ...record,
      sequence: String(index + 1 - base).padStart(3, '0'),
      ...(ident === '' ? {} : { ident }),
    };
  });
}

/**
 * `source text -> AssemblyResult`, the whole of it (§4).
 *
 * `opts` IS ACCEPTED AND NOT READ, and that is a frozen shape rather than an oversight worth
 * hiding. §4 gives `AssemblyOptions` exactly one member, `chain`, and gives `AssemblyResult` no
 * rendered page: the chain decides which GLYPH a stored code prints, which is `listing1403.ts`'s
 * `chained()` at render time and nothing this file computes. So both callers §4 names — the
 * view's A/H toggle and the CLI's `--chain` — hand the chain to `renderListing(result.listing,
 * { chain })` themselves, and the parameter stays because §4 froze the signature in wave 1 and a
 * later renderer inside `assemble()` would need it. Recorded in `open-questions.md`, Phase 3 /
 * Wave 6, not patched around by editing the wave-1 type.
 */
export function assemble(text: string, opts?: AssemblyOptions): AssemblyResult {
  void opts;
  const statements = parse(text);

  // ─── THE MACRO SEAM, and NOTHING IS BUILT IN IT (§2.3) ──────────────────────────────────
  // A source-to-source `expand(statements)` would go exactly here, between `parse()` and
  // `pass1()`. There is no macro processor and no library: macros lived on the system/library
  // tape under a Librarian phase (`software.md` §7) and this configuration has no tape
  // (`DECISIONS.md` 2026-08-30), so a macro call would have nothing to expand FROM. Phase 5's
  // RPG generator emits macro-free, open-coded Autocoder for the same reason — the generator
  // plays the part the macro library played — and that deviation is the Phase 5 plan's to state.

  const p1 = pass1(statements);
  const p2 = pass2(p1.sized, p1.symbols, p1.coreSize);
  const packed = pack(p2.items, p1.reserved);
  const listing = buildListing(p1, p2, packed.cardOf);

  // END's operand is the entry point, and `loaderDeck()` is what turns it into the execute card
  // (§4). `exactOptionalPropertyTypes` is on, so an absent END omits the key rather than
  // spelling it `undefined` — which is also how the wave-2 closed-loop decks say "no execute
  // card, load and halt in the loader".
  const deck: ObjectDeck = {
    records: withIdent(packed.records, statements, p2.items),
    ...(p1.entry === undefined ? {} : { entry: p1.entry }),
  };

  // ONE walk for both `ok` and `flagged`, so the view never re-filters the listing (§4) and the
  // two can never disagree about what a flagged line is.
  const flagged: ListingLine[] = listing.filter((line) => line.flag !== undefined);

  return {
    ok: flagged.length === 0,
    listing,
    deck,
    items: p2.items,
    symbols: p1.symbols,
    flagged,
    warnings: packed.warnings,
    wantsLoader: p1.wantsLoader,
    ident: p1.ident,
    heading: p1.heading,
    coreSize: p1.coreSize,
    suppress: p1.suppress,
  };
}
