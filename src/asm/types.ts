// ═══ src/asm/types.ts ══════════════════════════════════════════════════════════════════════
// PLACEMENT, and its citation: src/core/types.ts and src/formats/objectdeck.ts both state the
// rule — a boundary type lives in src/core/types.ts only if something inside src/core names it.
// Nothing in src/core names SourceCard or ListingLine; architecture.md §3 item 8 and §12 put
// them in Phase 3 WITH THEIR PRODUCER. ObjectRecord / ObjectDeck are IMPORTED below and are
// never redefined, extended or forked (architecture.md §2 B4).

// PrintChain is NOT in core/types.ts — it is `export type PrintChain = 'A' | 'H'` at
// src/core/devices/printer1403.ts:47, the same §3.4-sanctioned module §9 takes renderGreenBar,
// chainGlyph and PRINT_CHAIN_A_IS_DEFAULT from. Importing it from core/types.js would fail
// wave 1's first typecheck.
import type { Addr } from '../core/types.js';
import type { PrintChain } from '../core/devices/printer1403.js';
import type { ObjectDeck } from '../formats/objectdeck.js';

// ─── 1. The source card — software.md §1 (C28-0309-1 pp.5-7), 1-based, inclusive ───────────
export const SOURCE_COLUMNS = 80;
export const SOURCE_FIELDS = {
  page: [1, 2], line: [3, 5], label: [6, 15],
  op:   [16, 20], operand: [21, 72], ident: [76, 80],
} as const;
/** '*' HERE — and only here — is a comments card, text 7-72. A '*' in column 21 is the
 *  asterisk OPERAND. Two different asterisks; the COLUMN decides and nothing else does. */
export const COMMENT_COLUMN = 6;
/** A label BEGINNING here resolves HIGH-order even on a constant (software.md §5, C28-0326-2
 *  p.28). [likely] for the standalone — COL7_INDENT_IS_STANDALONE_TOO, §15. */
export const LABEL_INDENT_COLUMN = 7;
/** CTL's core-size and suppress codes are read by ABSOLUTE column, which is why Statement
 *  keeps the raw card (software.md §6). */
export const CTL_CORE_SIZE_COLUMN = 22, CTL_SUPPRESS_COLUMN = 23;
/** Standalone default origin — the loader occupies storage below it, and LOADER_CEILING in
 *  src/formats/loader.ts is 00499 (software.md §2, §9). */
export const ORG_DEFAULT: Addr = 500;
/** CTL absent = 20K (software.md §6, [verified]). */
export const CORE_SIZE_DEFAULT = 20_000;

/** EXACTLY 80 characters, in the project's 64-glyph alphabet — the one bcdOfGlyph accepts.
 *  A bare alias, per architecture.md §3 item 8. Not a `Card`: the assembler reads TEXT; the
 *  card face is a rendering. */
export type SourceCard = string;

/** software.md §6, C28-0309-1 pp.17-20 — the STANDALONE set. The OS F/M/N/O/R/U/W set is not
 *  carried. DATA on a listing line, NEVER a throw. */
export type AsmFlag = 'F' | 'U' | 'M' | 'O';

// ─── 2. The parsed statement ───────────────────────────────────────────────────────────────
export type AddressKind =
  | 'blank' | 'actual' | 'symbolic' | 'asterisk' | 'literal' | 'addressConstant'
  /** The three-position I/O x-control field — the `%10` the assembler SYNTHESISES for
   *  `R1W 0,LINE,$`. NOT an address: never index-tagged, never adjusted, never resolved. It is
   *  operand 1 of the ONLY form whose `lengths` is `[10]` (ops `L` and `M`), and §5.2 step 3
   *  rule 1 builds it in the CALLER, before any head test — since 2026-08-31 no source deck
   *  writes the field, so there is no token for the head tests to misread as 'symbolic'. */
  | 'xcontrol';

export type LiteralKind = 'numeric' | 'alphameric' | 'areaDefining' | 'addressConstant';

export interface Literal {
  readonly kind: LiteralKind;
  readonly text: string;            // as written, sign and @…@ included
  readonly cells: Uint8Array;       // what the processor-generated DCW will hold, WM high-order
  /** ≤9 digits + sign, or 1-9 alphameric characters: pooled ONCE per program section. Longer
   *  literals are allocated on each occurrence (software.md §3). */
  readonly pooled: boolean;
}

export interface Operand {
  readonly kind: AddressKind;
  readonly text: string;            // as written, for the OPERAND column
  readonly symbol?: string;
  readonly actual?: number;
  /** The SUM of every ±ddddd term written after the address (software.md §2). */
  readonly adjust: number;
  /** 0..15. With several +Xn tags only the RIGHTMOST is effective (software.md §2). */
  readonly tag: number;
  /** A tail `+NAME`, resolved in pass 2 against an index EQU — which is precisely why parse
   *  and resolve are separate passes. */
  readonly tagSymbol?: string;
  /** Any index term at all. DS / ORG / LTORG / control operations reject it -> F. Also
   *  rejected on an x-control field and on G (architecture.md §5, A22-0526-3 pp.11, 22). */
  readonly tagWritten: boolean;
  /** ADJUSTMENT AND INDEXING MODIFY THE LITERAL'S ADDRESS, NOT ITS VALUE (software.md §3):
   *  `adjust` and `tag` live here, `literal.cells` is untouched. An implementation that folds
   *  them into the constant is subtly and silently wrong. */
  readonly literal?: Literal;
}

export interface Statement {
  readonly seqno: number;           // 1-based over all cards; the listing's SEQNO
  readonly card: SourceCard;        // the raw 80 columns — CTL reads 22-23 by position
  readonly pglin: string;           // cols 1-5 verbatim
  readonly comment: boolean;        // '*' in column 6
  readonly label: string;           // cols 6-15, trailing blanks trimmed
  /** Column 6 blank, column 7 not — resolves HIGH-order (software.md §5). */
  readonly labelIndented: boolean;
  /** All digits: refers to the HIGH-order position, creates a symbol, and NEVER moves the
   *  assignment counter (software.md §1, [verified], both sentences). */
  readonly labelIsActual: boolean;
  readonly op: string;              // cols 16-20, trimmed
  readonly operands: readonly Operand[];
  readonly d?: string;              // the explicit d, when the mnemonic does not bake one in
  readonly comment_text: string;    // everything after the first double blank OUTSIDE a literal
  readonly format?: string;         // the F-flag message, if the line would not parse
}

// ─── 3. The symbol table ───────────────────────────────────────────────────────────────────
export interface SymbolEntry {
  readonly name: string;
  readonly value: Addr;
  readonly kind: 'instruction' | 'constant' | 'area' | 'equate' | 'literal' | 'actual';
  /** software.md §5: LOW-order for a constant with an ordinary label; HIGH-order for an
   *  instruction, a DA header, a column-7 label or an actual label. */
  readonly resolvedTo: 'lowOrder' | 'highOrder';
  readonly indexRegister?: number;  // EQU's `X2` / `2,X` form
  readonly definedAt: number;       // seqno of the FIRST definition; that value stands
  /** A later definition sets this on ITSELF and flags M (software.md §6). */
  readonly duplicate: boolean;
}
export type SymbolTable = ReadonlyMap<string, SymbolEntry>;

// ─── 4. What pass 2 produced, before it is cut into cards ──────────────────────────────────
/**
 * `cells` is the SAME convention ObjectRecord.payload uses: word mark in bit 7, NO C bit — the
 * deck has no parity because a load-mode read replaces the whole target byte and recomputes it
 * (objectdeck.ts header, io.md §3).
 *
 * THERE IS NO `present` BITMAP. Absence IS the gap between items: a DS emits no item, so the
 * addresses it reserves are simply not covered, and pack.ts's record-break rule reads the gap
 * directly (§8.2). That is what keeps "DS emits nothing and does not clear the area" a property
 * of the data rather than a flag someone has to remember to set.
 *
 * `items` is also the LEFT-HAND SIDE of the closed-loop oracle (§11 wave 2).
 */
export interface EmittedItem {
  readonly at: Addr;
  readonly cells: Uint8Array;
  readonly seqno: number;
}

// ─── 5. The listing line — architecture.md §2 B3, the STANDALONE column set ────────────────
// The OS-only columns (S/G, REL, the wider F/M/N/O/R/U/W flag set) are NOT carried: they belong
// to the relocatable assembler whose object format we deliberately do not implement
// (software.md §8.2, architecture.md §12).
export interface ListingLine {
  readonly seqno: number;
  readonly pglin: string;                 // source cols 1-5, as punched
  readonly label: string;
  readonly opcod: string;
  readonly operand: string;
  /** CT — assembled length of an imperative, or positions reserved by a declarative
   *  (C28-0326-2 p.11 semantics, adopted). */
  readonly ct?: number;
  /**
   * ADDRS — ONE RULE, not two: **the address a label on this statement WOULD resolve to** —
   * the resolution rule applied to the statement's kind and to the column its label field
   * begins in, whether or not a label is actually written. Phrased as "this statement's own
   * label" the rule is undefined for the majority of lines: Exhibit IV's SEQNO 37 (`BXPA`,
   * 00192, high-order) and SEQNO 38 (`DCW #5`, 00203, low-order) are both UNLABELLED.
   * Low-order for a constant in an un-indented label field; HIGH-order for an instruction, a DA
   * header, a column-7-indented label field or an actual label. That single rule explains every row
   * of software.md §5's Exhibit IV evidence table — the constants at 00203 / 00208 / 00239 AND
   * the column-7 DCs at 00396 / 00402 AND the DA header at 00315 — where B3's two-rule phrasing
   * has to special-case the last two.
   */
  readonly addrs?: Addr;
  /** INSTRUCTION — the manual's own spacing: `D 00394 00306 L`. A zone-tagged digit renders as
   *  its glyph, which is what the manual prints (`D 030Y9 00140 C`). Blank for a declarative
   *  that emits nothing. */
  readonly instruction?: string;
  /** CARD — the object-deck card sequence number this item rode in on. Back-filled from pack(),
   *  which is why the listing is built AFTER emission and packing (C28-0326-2 p.11). */
  readonly card?: number;
  /** ONE flag, precedence O > F > M > U — ONE_FLAG_PER_LISTING_LINE, §15. */
  readonly flag?: AsmFlag;
  /** The flag's message and column, for the view's modern error block. The FLAG column prints
   *  only the period letter. */
  readonly why?: string;
  readonly kind:
    | 'heading' | 'comment' | 'imperative' | 'declarative'
    | 'control' | 'literal' | 'daSubEntry' | 'symbolTable' | 'trailer';
}

// ─── 6. Options and result ─────────────────────────────────────────────────────────────────
export interface AssemblyOptions {
  /** The listing's print chain, default 'A'. The ONE option, with one caller each: the view's
   *  A/H toggle and the CLI's --chain. `origin` and `coreSize` are deliberately NOT here —
   *  the origin comes from ORG (default ORG_DEFAULT) and the core size from CTL column 22
   *  (absent = CORE_SIZE_DEFAULT), both read from the source, and an override with no caller
   *  is the speculative typing ARCHITECTURE.MD §12 disclaims — not this plan's §12, which is
   *  Test tiers. */
  readonly chain?: PrintChain;
}

export interface AssemblyResult {
  /** false if ANY line carries a flag. The deck is STILL returned; it is just wrong — the
   *  view refuses to hopper it, the precedent deckBox.putDeckInHopper set in Phase 2. */
  readonly ok: boolean;
  readonly listing: readonly ListingLine[];
  /** src/formats/objectdeck.ts's type, unmodified. `entry` comes from END's operand, and
   *  loaderDeck() turns it into the execute card. */
  readonly deck: ObjectDeck;
  readonly items: readonly EmittedItem[];
  readonly symbols: SymbolTable;
  /** The flagged subset, so the view does not re-filter the listing. */
  readonly flagged: readonly ListingLine[];
  /** Deck-level facts that are NOT one of F/U/M/O, because that flag set is CLOSED and
   *  published (software.md §6): the last record's terminating GM-WM landing inside the
   *  program after a backwards ORG (§8.3), an object core size larger than the machine's. */
  readonly warnings: readonly string[];
  /** The LOAD control card: "a load program should precede the object deck" = loaderDeck(). */
  readonly wantsLoader: boolean;
  /** JOB / RESEQ -> cols 76-80 of every condensed card. */
  readonly ident: string;
  readonly heading: string;               // JOB -> the listing heading
  readonly coreSize: number;              // CTL col 22, or 20_000
  /** CTL column 23 AS PUNCHED — a single character, `'1'` = suppress punch, `'2'` = suppress
   *  print, blank = neither (software.md §6). One character, not an independent pair: the
   *  card holds one code and modelling it as two booleans invents a state the card cannot
   *  express. Its ONE consumer is `tools/asm.ts`: `'1'` writes no deck file, `'2'` prints no
   *  listing. The view ignores it — a person who pressed ASSEMBLE wants to see both. */
  readonly suppress: string;
}
