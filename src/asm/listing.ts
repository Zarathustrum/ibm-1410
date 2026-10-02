// src/asm/listing.ts — the assembly listing, as ListingLine[] and nothing else.
// Source: docs/plans/phase-3-autocoder.md §9, §4 (the ListingLine contract), §11 wave 5;
// docs/research/console-and-physical.md §12 (the OS listing's column SET and its trailer,
// C28-0326-2 pp.10-11, 56-57); docs/research/software.md §6 (EJECT / RESEQ / PST).
//
// THIS FILE DECIDES WHAT PRINTS, NEVER WHERE. Every column stop, every glyph and the 132 print
// positions belong to `listing1403.ts`, which is a FORMATTER over what this file returns
// (`architecture.md` §2 B3, taken literally). Two consequences worth stating: the listing is a
// value the browser view and the CLI share without either of them re-deriving it, and a change
// to the column metrics cannot reach the flag precedence or the page rule.
//
// IT IS BUILT AFTER EMISSION AND PACKING, which is what the CARD column costs: `pack()`'s
// `cardOf` is the only place that knows which condensed card an item rode in on
// (C28-0326-2 p.11), so the listing is the LAST stage of the pipeline and not the second.
import type { AsmFlag, ListingLine, Statement, SymbolEntry } from './types.js';
import type { Pass2Result } from './emit.js';
import { field } from './source.js';
import type { Pass1Line, Pass1Result } from './symbols.js';

/**
 * OPEN: `LISTING_LINES_PER_PAGE` — `[likely]`, plan §15. The OS Autocoder prints "normally 55
 * lines per page", the system symbol `/LIN/`, values below 30 rejected
 * (`console-and-physical.md` §12, C28-0326-2 pp.10-11, 56-57) — and 55 lines sits inside the
 * 66-line `DEFAULT_CARRIAGE_TAPE` of `src/core/devices/printer1403.ts` (`PHASE-2-NOTES` §1), so
 * the two numbers are compatible rather than merely both written down. What no source states is
 * the STANDALONE processor's default, C28-0309-1 publishing no listing figure at all.
 *
 * The heading counts as one of the 55: a page is 55 ListingLines of which the first is its
 * heading, so the body is 54 lines. Fallback: change the number — one constant, one place, and
 * `test/golden/hello-dad.lst` regenerates in one command.
 * `open-questions.md`, Phase 3 / Wave 5.
 */
export const LISTING_LINES_PER_PAGE = 55;

/**
 * OPEN: `LISTING_TRAILER_FOLLOWS_THE_OS_FORM` — `[unverified]`, plan §15, and §9 names THIS as
 * its point of use. `console-and-physical.md` §12 records the OS trailer as
 * `NUMBER OF FLAGGED STATEMENTS NONE` when clean and, with flags, the count followed by a line
 * listing up to twenty flagged sequence numbers, then a processor-identification line
 * (C28-0326-2 p.57 Exhibit IV Part B, p.11) — carrying its own correction that the trailer is
 * NOT always the literal form "NUMBER OF FLAGGED STATEMENTS n". Whether the STANDALONE processor
 * printed any trailer is unrecorded.
 *
 * Fallback: drop the trailer — three lines here, and the golden regenerates.
 * `open-questions.md`, Phase 3 / Wave 5.
 */
export const LISTING_TRAILER_FOLLOWS_THE_OS_FORM = true;

/** "a line listing up to 20 flagged sequence numbers" — console-and-physical.md §12. */
const TRAILER_MAX_SEQNOS = 20;

/**
 * The processor-identification line, our own. The OS printed
 * `1410/7010 AUTOCODER...SYSTEM /MID/ 0001` here; this is where the fact that the artefact is
 * CONSTRUCTED belongs, because §12.3 requires the label to live IN the golden and the last line
 * of the trailer is the one line of a period listing whose whole job is to say which processor
 * produced the paper. `test/asm-listing.test.ts` declares `LISTING_GOLDEN_IS_CONSTRUCTED` beside
 * it so a reader can grep either one.
 *
 * Every character is one of `bcd.ts`'s 64 and prints on both chains — no parentheses, no `=`,
 * no lowercase — because `listing1403.ts` maps this line through the chain like any other.
 */
const PROCESSOR_IDENTIFICATION =
  '1410 AUTOCODER - IBM 1410 EMULATOR - CONSTRUCTED LISTING, NOT PERIOD OUTPUT';

/** ONE FLAG PER LINE, precedence O > F > M > U — `emit.ts`'s `ONE_FLAG_PER_LISTING_LINE`. */
const FLAG_ORDER: readonly AsmFlag[] = ['O', 'F', 'M', 'U'];

/** A line's flag can come from either pass; the STRONGER wins, and brings its own message. */
function strongest(
  a: { readonly flag?: AsmFlag; readonly why?: string } | undefined,
  b: { readonly flag?: AsmFlag; readonly why?: string } | undefined,
): { readonly flag: AsmFlag; readonly why?: string } | undefined {
  const rank = (f: AsmFlag | undefined): number => (f === undefined ? FLAG_ORDER.length : FLAG_ORDER.indexOf(f));
  const win = rank(a?.flag) <= rank(b?.flag) ? a : b;
  if (win?.flag === undefined) return undefined;
  return { flag: win.flag, ...(win.why === undefined ? {} : { why: win.why }) };
}

/**
 * The OPERAND column, 52 wide because card columns 21-72 are: the operand field AS PUNCHED,
 * trailing blanks off. A comments card is the one exception — its text is columns 7-72
 * (`source.ts`, `software.md` §1) and it has no operand field at all, so the comment text is
 * what the column carries and `listing1403.ts` prints it from the LABEL stop, which is where a
 * 66-column comment fits.
 *
 * A pooled literal needs no case of its own: `literals.ts`'s `literalStatement` already builds
 * an 80-column card with a BLANK operation field and the literal's text in columns 21-72, which
 * is exactly Exhibit IV rows 59-62's shape. A DA sub-entry is a real source card whose operation
 * field is blank, so it needs none either (rows 65-66).
 */
const operandOf = (statement: Statement): string =>
  statement.comment ? statement.comment_text : field(statement.card, 'operand').trimEnd();

/**
 * OPEN: `JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80` — `[likely]`, plan §15, and THIS is its point
 * of use: the five characters the page heading prints at its right edge and the five
 * `tools/asm.ts` punches into columns 76-80 of every condensed card are read here, by one rule.
 *
 * The claim: the identification is the JOB (or RESEQ) card's OWN columns 76-80 — the
 * identification field EVERY source card carries (`console-and-physical.md` §12's card layout,
 * C28-0309-1 pp.5-7, `[verified]`) — and not five characters taken out of the operand.
 * `software.md` §1 says only that the ident is "punched into the object deck via JOB/RESEQ
 * (standalone) or HEADR/RESEQ (OS)"; WHICH FIELD SUPPLIES IT is unstated, and that is the whole
 * of the doubt. The demo's own JOB card is what makes it matter: its operand is the 25-character
 * free text `HELLO DAD - REENTRY TABLE`, whose first five characters are `HELLO`, while its
 * columns 76-80 read `HDAD1`.
 *
 * Fallback: take the first five characters of the JOB operand instead — the other branch of
 * `identOf` below, and one matching branch at the punch site in `tools/asm.ts`.
 * `open-questions.md`, Phase 3 / Wave 5.
 */
export const JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80 = true;

/** The five-character identification a JOB or RESEQ card carries, under the constant above. */
const identOf = (statement: Statement): string => (JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80
  ? field(statement.card, 'ident')
  : field(statement.card, 'operand').slice(0, 5)).trimEnd();

/**
 * The ident the FIRST page prints: the JOB card's. `Pass1Result.ident` is the LAST one any JOB or
 * RESEQ left behind (`symbols.ts`), which is the same value only in a deck with no RESEQ. A deck
 * with no JOB at all prints no ident rather than borrowing a later RESEQ's.
 */
const jobIdent = (p1: Pass1Result): string => {
  const job = p1.sized.find((entry) => entry.statement.op.toUpperCase() === 'JOB');
  return job === undefined ? '' : identOf(job.statement);
};

/** The page heading, from JOB — re-emitted at every page break and at EJECT (§9). */
const headingLine = (page: number, ident: string, heading: string): ListingLine => ({
  // A heading has no statement, so SEQNO carries the PAGE NUMBER and LABEL the five-character
  // identification — the two things `console-and-physical.md` §12's heading prints beside the
  // JOB text. `listing1403.ts` lays all three out; nothing here knows a column.
  seqno: page,
  pglin: '',
  label: ident,
  opcod: '',
  operand: heading,
  kind: 'heading',
});

/** One trailer or symbol-table line: text only, printed from column 1. */
const textLine = (operand: string, kind: ListingLine['kind']): ListingLine => ({
  seqno: 0, pglin: '', label: '', opcod: '', operand, kind,
});

/** One symbol, for PST. `kind` and `resolvedTo` up-case because the 1410 has no lowercase. */
const symbolLine = (entry: SymbolEntry): ListingLine => ({
  seqno: 0,
  pglin: '',
  label: entry.name,
  opcod: '',
  operand: `${entry.kind.toUpperCase()} ${entry.resolvedTo === 'highOrder' ? 'HIGH' : 'LOW'} ORDER`
    + (entry.duplicate ? ' - MULTIPLY DEFINED' : ''),
  addrs: entry.value,
  kind: 'symbolTable',
});

/**
 * The two passes plus `pack()`'s `cardOf` -> the listing (§9).
 *
 * `Pass1Result.lines` and `Pass1Result.sized` are PARALLEL, index for index (`symbols.ts`), and
 * `pass2` pushes one `EmittedStatement` per sized entry, so all three are read by one index —
 * which is what makes "merge pass 1's half with pass 2's" a walk rather than a join.
 */
export function buildListing(
  p1: Pass1Result,
  p2: Pass2Result,
  cardOf: ReadonlyMap<number, number>,
): readonly ListingLine[] {
  const out: ListingLine[] = [];
  let page = 0;
  let onPage = LISTING_LINES_PER_PAGE;          // forces the first `put` to open page 1

  // THE IDENT IN FORCE AT THE TOP OF THE PAGE, never the deck's final one: `p1.ident` is what the
  // LAST JOB or RESEQ left behind, so a heading that read it would stamp a RESEQ's ident on every
  // page printed BEFORE the RESEQ card. The JOB's holds from page 1 — a JOB is the deck's heading
  // card — and a RESEQ takes effect on the first heading AFTER its own line, the same "governs
  // what follows it" rule `tools/asm.ts` punches into columns 76-80 of the object cards.
  let ident = jobIdent(p1);

  const put = (line: ListingLine): void => {
    if (onPage >= LISTING_LINES_PER_PAGE) {
      page += 1;
      out.push(headingLine(page, ident, p1.heading));
      onPage = 1;
    }
    out.push(line);
    onPage += 1;
  };

  let wantsSymbolTable = false;

  for (const [index, half] of p1.lines.entries()) {
    // `lines` and `sized` are parallel by construction (`symbols.ts` pushes both together), so
    // this guard is `noUncheckedIndexedAccess`'s and not a case: there is no index at which one
    // exists and the other does not.
    const sized = p1.sized[index];
    if (sized === undefined) continue;
    const statement = sized.statement;
    const emitted = p2.statements[index];
    const op = statement.op.toUpperCase();
    if (op === 'PST') wantsSymbolTable = true;

    put(bodyLine(statement, half, emitted, cardOf));

    // RESEQ changes the ident for what FOLLOWS it (`software.md` §6), so the RESEQ card itself
    // prints under the old one and the next heading — page break or EJECT — carries the new.
    if (op === 'RESEQ') ident = identOf(statement);

    // EJECT restores the paper to the top of the next page, so the card itself prints on the page
    // it appeared on and everything after it starts a new one (`software.md` §6). Pretending the
    // page is full is the whole implementation: the next `put` re-emits the heading, and a
    // trailing EJECT costs no empty page because no `put` follows it.
    if (op === 'EJECT') onPage = LISTING_LINES_PER_PAGE;
  }

  // PST prints the symbol table (`software.md` §6). Sorted by name so the listing is a reference
  // rather than a transcript of insertion order.
  if (wantsSymbolTable) {
    put(textLine('SYMBOL TABLE', 'symbolTable'));
    const entries = [...p1.symbols.values()].sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const entry of entries) put(symbolLine(entry));
  }

  // The trailer, over the BODY lines built so far — heading and symbol-table lines carry no flag,
  // so the filter needs no kind test.
  const flagged = out.filter((line) => line.flag !== undefined);
  put(textLine(
    `NUMBER OF FLAGGED STATEMENTS ${flagged.length === 0 ? 'NONE' : String(flagged.length)}`,
    'trailer',
  ));
  if (flagged.length > 0) {
    const seqnos = flagged.slice(0, TRAILER_MAX_SEQNOS).map((line) => String(line.seqno));
    put(textLine(`FLAGGED STATEMENTS ${seqnos.join(' ')}`, 'trailer'));
  }
  put(textLine(PROCESSOR_IDENTIFICATION, 'trailer'));

  return out;
}

/** One source statement, both passes merged. */
function bodyLine(
  statement: Statement,
  half: Pass1Line,
  emitted: Pass2Result['statements'][number] | undefined,
  cardOf: ReadonlyMap<number, number>,
): ListingLine {
  const flag = strongest(half, emitted);
  const card = cardOf.get(half.seqno);
  return {
    seqno: half.seqno,
    pglin: statement.pglin,
    label: statement.label,
    opcod: statement.op,
    operand: operandOf(statement),
    ...(half.ct === undefined ? {} : { ct: half.ct }),
    // ADDRS is computed for every line, labelled or not (§4's ONE RULE) — but a comments card
    // assembles nothing and occupies nothing, so the column stays blank on it. A RENDERING
    // choice, not a research claim: the address itself is still in `Pass1Line`.
    ...(half.kind === 'comment' ? {} : { addrs: half.addrs }),
    ...(emitted?.instruction === undefined ? {} : { instruction: emitted.instruction }),
    ...(card === undefined ? {} : { card }),
    ...(flag === undefined ? {} : flag),
    kind: half.kind,
  };
}
