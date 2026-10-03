# IBM 1410 emulator — whole-system architecture

Status: design, awaiting Zarathustrum's approval. Companion: [phase-1-cpu-core.md](phase-1-cpu-core.md).
Every hardware behaviour below cites a file in `docs/research/`. Where the research is
`[unverified]`, the fallback from `open-questions.md` is named at the point of use.

---

## 0. Thesis

Four decisions IBM made in 1960 generate the whole machine. Encode those honestly and the
rest is bookkeeping:

1. **A storage position is eight bits** — `B A 8 4 2 1` + word mark + odd-parity check,
   with parity computed *including* the word-mark bit, so setting a word mark flips C
   (`architecture.md` §2, `charset.md` §1). That is one byte in a `Uint8Array`, and it is
   byte-identical to the `.cor` oracle format (`emulators.md` §6).
2. **Instruction length is not a property of the op code.** Read-out starts at a
   word-marked op character and scans forward until it senses the *next* word mark
   (`architecture.md` §7, `opcodes.md` §1.1). The op-code length table exists only to
   *validate* what the scan produced — it never drives the scan.
3. **Omitted addresses chain.** AAR and BAR keep whatever the previous instruction left,
   so every op's "registers after" row is executable semantics, not documentation
   (`opcodes.md` implementer summary §2). An 11-character two-address instruction
   additionally **blanks the op-modifier register** (`opcodes.md` §1.2) — the nastiest
   trap in the ISA.
4. **Arithmetic is add-to-storage**, right-to-left from the units position, length governed
   by the B-field word mark, sign in the zone bits of the units character
   (`architecture.md` §10, `opcodes.md` §4).

Build order follows: cell → address → registers → decode → per-op table → executors →
indicators → channel → one device. Cards, the assembler, RPG and the period UI are all
downstream of a core that is already correct.

The concrete consequence for the code: **the per-op semantics live in a TypeScript data
table whose rows are the rows of `opcodes.md` §2, in the same order, with the same column
names, each row carrying its own citation.** A reviewer opens `opcodes.md` §2 on the left
and `src/core/isa/table.ts` on the right and diffs them by eye. That is the single most
important legibility decision in the project — this code gets read by the owner and a family member
together.

---

## 1. Module map and file layout

```
                 ┌──────────────────────────────────────────────┐
   RPG spec  →   │ src/rpg/    spec sheets → Autocoder source    │  (Phase 5)
   sheets        └────────────────┬─────────────────────────────┘
                                  │ SourceCard[]  — 80-column text
                 ┌────────────────▼─────────────────────────────┐
   Autocoder →   │ src/asm/    two-pass assembler + listing     │  (Phase 3)
   source        └────────────────┬─────────────────────────────┘
                     ObjectDeck   │   ListingLine[]
                 ┌────────────────▼─────────────────────────────┐
                 │ src/formats/  card ↔ Hollerith ↔ cell bytes, │  (P1 types, P2 code)
                 │               object decks, .cor images      │
                 └────────────────┬─────────────────────────────┘
                                  │ Uint8Array of cell bytes
   ┌──────────────────────────────▼─────────────────────────────┐
   │ src/core/  Storage · Registers · Indicators · ALU · Move ·  │  (Phase 1)
   │            Edit · ISA table · CPU (scan fetch) · Channel ·  │
   │            Device[] · print-out formatter · tracer          │
   └──────────────────────────────┬─────────────────────────────┘
                     MachineState │   ConsoleLine[]   PrintEvent[]
   ┌──────────────────────────────▼─────────────────────────────┐
   │ src/ui/    internals panel (P1) · period console, card      │
   │            viewer, green-bar 1403 (P4)                      │
   └────────────────────────────────────────────────────────────┘
```

### 1.1 File layout

```
package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html

src/core/                     DOM-free, dependency-free library
  types.ts                    every boundary type in one file, re-exported
  bcd.ts                      64-code table: bits, octal, C, Hollerith, collate rank, glyphs
  storage.ts                  Storage: Uint8Array, read/setChar/setWm/pokeRaw/clearToHundreds
  address.ts                  5-char address decode, zone index tags, validity, indexing
  registers.ts                IAR AAR BAR CAR DAR EAR FAR + Op / OpMod; reset semantics
  indicators.ts               seven latches (3 arithmetic + 4 compare), named after the rules
  checks.ts                   AddressCheck / InstructionCheck / ProcessCheck / StopReason
  decode.ts                   scan-to-next-WM, form classification, length validity,
                              address-double + chaining + op-modifier blanking
  cpu.ts                      step({ execute }) · stepCycle() · run(n) · cycles · dispatch
  cycles.ts                   T formulas, base machine 4.5 µs (NOT the Accelerator set)
  alu.ts                      true/complement add, recomplement, multiply, divide, ZA/ZS
  compare.ts                  Compare (collate) + the short-A HIGH rule
  move.ts                     op D — all 64 d-characters, two structural tables
  mcs.ts                      op Z — Move Characters and Suppress Zeros
  tablelookup.ts              op T, with the CAR reload per search cycle
  edit.ts                     op E — three scans, two skid cycles, eight BAR cases
  isa/table.ts                THE DATA TABLE — one row per (op char, form) of opcodes.md §2
  isa/regs.ts                 the 'A-LW' / 'B-1' / 'NSIB' Figure-8 notation evaluator
  isa/dmods.ts                J / R / X / V / F / K / carriage / x-control d-char tables
  isa/exec/                   arith.ts branch.ts wordmark.ts move.ts io.ts control.ts
  channel.ts                  Channel 1: nine-step sequence, interlock, six status bits,
                              move-vs-load-mode translation
  devices/device.ts           the Device interface
  devices/console1415.ts      1415 console printer (%T0), 8-bit
  devices/reader1402.ts       (P2)   devices/punch1402.ts (P2)
  devices/printer1403.ts      (P2, Model 2, 132 positions + carriage tape)
  printout.ts                 S / C / E / B / # / D / A / I / R console line formatter
  trace.ts                    Tracer interface, three levels, line-oriented text
  machine.ts                  façade: build, load, reset, step, run, snapshot

src/formats/
  cor.ts                      .cor load/dump + the documented fill normalisation
  card.ts                     (P2) BCD ↔ Hollerith punches, .cards text decks
  objectdeck.ts               (P2) ObjectRecord ↔ Card
  loader.ts                   (P2) our 5-card condensed loader + hand-keyed bootstrap

src/asm/                      (P3) lex parse symbols literals declaratives emit listing
src/rpg/                      (P5) specs → SourceCard[]

src/ui/internals/             (P1) panel.ts coreView.ts registerView.ts controls.ts main.ts
                              controls.ts = LOAD/START/STOP/RESETs + MODE ADDRESS SET,
                              ALTER, I/E CYCLE — console-and-physical.md §2-§4
src/ui/period/                (P4) console1415 · cardViewer · greenbar · modeRotary

tools/
  fetch-oracles.ts            downloads the cube1us .cor images into gitignored oracles/
  run-cor.ts                  CLI: load a .cor, run, print the Selectric transcript + halt
  trace-diff.ts               CLI: diff a produced trace against an expected trace
  simh-diff.ts                (deferred — see phase-1-cpu-core.md §6.3; the ledger stays)

oracle/                       transcribed fixtures (in the repo) + .cor images (gitignored)
  lengths.json  dchar-matrix.json  signs.json  collate.json  jdchars.json  vdchars.json
  indicators.json  note1410/*.ts  UNMAPPED.md  simh-deviations.ts  cc01a-halts.ts

test/                         one file per src/core module + the oracle tiers
```

Rules that keep the split honest:

- `src/core/` imports nothing outside itself. No DOM, no Node built-ins (`cor.ts` lives in
  `src/formats/` and takes an `ArrayBuffer`, not a path).
- The CPU talks only to `Channel`. `Channel` talks only to `Device`. No executor knows what
  a 1403 is.
- Devices produce **values** (`Uint8Array` records, `PrintEvent`, `ConsoleLine`), never side
  effects. That is why the headless `run-cor.ts` and the browser page share one code path.
- Enforcement is a ten-line test, not build machinery:
  `test/core-is-dom-free.test.ts` greps `src/core/**/*.ts` for
  `/\b(document|window|navigator|HTMLElement|require|process)\b/`.
  Same guarantee as an ESLint rule, one readable file, nothing to maintain.
  *(grafted from oracle-first)*

---

## 2. The data format at every boundary

| # | Boundary | Format |
|---|---|---|
| B1 | RPG spec sheets → `src/rpg/` | **Open.** The 1410 RPG specification-sheet column layout is absent from the research package (`software.md` §12.5 documents only that RPG "produces a symbolic program deck (Autocoder format)"; the sheets X24-1336..X24-1339 and manual C28-1443 are named in the bibliography but not on bitsavers). We do **not** invent a layout. See §9 conflict R1 and the open decision in §11. |
| B2 | `src/rpg/` → `src/asm/` | `SourceCard[]` — exactly 80 characters per card: page 1-2, line 3-5, label 6-15, operation 16-20, operand 21-72, ident 76-80; `*` in col 6 = comment (`software.md` §1). Pure text → text; RPG never touches the core. |
| B3 | `src/asm/` → listing | `ListingLine[]` for the **standalone** C28-0309-1 Autocoder we target (§5 step 2): SEQNO, PGLIN, LABEL, OPCOD, OPERAND, CT, ADDRS, INSTRUCTION, CARD, FLAG (F/U/M/O). The OS-only columns in `console-and-physical.md` §12's C28-0326-2 set — S/G, REL, and the wider F/M/N/O/R/U/W flag set — are **not** carried, because they belong to the relocatable OS assembler whose object format we deliberately do not implement (`software.md` §8.2). The 1403 renderer is a formatter over this, not a second code path. The type itself is defined in Phase 3 with its producer (§3 item 8). |
| B4 | `src/asm/` → object deck | `ObjectRecord[]`: col 1 word separator, 2-6 load address, 7 WS, 8-10 `000`, 11-12 count, 13-72 payload, 73-75 sequence, 76-80 ident. Word marks travel as 0-5-8 word-separator punches *preceding* the marked character and are **not** counted in cols 11-12 (`software.md` §8.1). |
| B5 | deck → cards | `Card = Uint8Array` — 80 six-bit BCD codes (landed in Phase 2, `src/core/types.ts`). Hollerith punch masks are **derived on render**, because on the 1410 the mapping is a bijection in both directions including `2-8` ↔ A-bit (`charset.md` §2.1, §3) — the case the 1401 gets wrong. |
| B6 | 1402 → core | Mutation of `Storage` through the channel. Move mode: byte stored, existing WM retained. Load mode: **whole byte replaced including the WM bit**; a single word separator sets a WM on the *next* stored character and is not itself stored; two consecutive separators store one separator with no WM (`io.md` §3, 223-2692 p.58 + Figure 5). |
| B7 | CPU → 1403 | `PrintEvent[]`: `{kind:'line', text}` from Write-a-Line, plus `{kind:'space'|'skip', afterPrint}` from `F d`; automatic single space when no carriage instruction follows (`io.md` §7). |
| B8 | CPU / console → 1415 | `ConsoleLine[]`: id char (`S C E B # D A I R`), text, per-char word-mark flags (inverted circumflex), per-char underline flags (bad parity), spacing, matrix position 30 or 35 (`console-and-physical.md` §2). |
| B9 | Channel ↔ Device | A record is a `Uint8Array` of **cell bytes**. The device declares `bits: 7 | 8`. Eight-bit devices (1415 only) receive the WM bit intact; seven-bit devices (1402, 1403) never can, so on **load-mode output** the channel performs the documented translation *first* — each core word mark becomes a word separator written one position **ahead** of its character, and a core word separator becomes **two**, so the record lengthens — and only then masks bit 7 (`opcodes.md` §2 `L` row / A22-0526-3 pp.40-41; `io.md` §3, p.41). Move-mode output transfers no word marks at all and passes separators through unchanged. What the *device* then does with a separator is the device's business: 1403 load-mode write (Autocoder WW) prints it as a **blank ahead of** the character (`io.md` §7), the 1402 punch punches 0-5-8, and the 8-bit 1415 skips the translation entirely — WCPW gets the WM bit and prints an **inverted circumflex over** the character (`io.md` §8, Figure 44). Seven- vs eight-bit resolves the 223-2692 p.8/p.9 self-contradiction in favour of p.8 (`io.md` §1). |
| B10 | disk file ↔ core | `CoreImage = { size, width: 2|4, cells: Uint8Array }`. `.cor` = 5 ASCII digits of core size, then `size` little-endian ints of width `(filesize−5)/size`; the byte is `WM C B A 8 4 2 1` — **identical to our in-memory cell** (`emulators.md` §6). |
| B11 | core → UI | `MachineState`: a structured-cloneable snapshot of plain objects — registers as numbers, a `Uint8Array` slice of the visible core window, indicator booleans, cycle count, stop reason, console log. The UI never imports an executor. Structured-cloneable on purpose, so the machine can move into a Worker later without a boundary change. |

---

## 3. Load-bearing TypeScript types

```ts
// ═══ src/core/types.ts ═════════════════════════════════════════════════════

// ─── 1. The storage cell ───────────────────────────────────────────────────
// architecture.md §2; charset.md §1; emulators.md §6 (this IS the .cor layout)
//   bit7 WM · bit6 C (odd parity over BA8421+WM) · bit5 B · bit4 A · bits3-0 8421
// `cell & 0x3F` is exactly the octal BCD code printed throughout the research.
export type Cell = number;                       // 0x00..0xFF, one storage position
export const WM = 0x80, C = 0x40, ZB = 0x20, ZA = 0x10, BCD6 = 0x3f;

export type Addr = number;                       // 0 .. size-1

export interface Storage {
  readonly size: 10_000 | 20_000 | 40_000 | 60_000 | 80_000;
  bcd(a: Addr): number;                          // BA8421 only — what Compare/BCE see
  read(a: Addr): Cell;                           // whole byte
  wm(a: Addr): boolean;
  setChar(a: Addr, bcd6: number, wm: boolean): void;   // recomputes C
  setWm(a: Addr, on: boolean): void;                   // flips C — architecture.md §2
  writeWhole(a: Addr, cell: Cell): void;               // LOAD MODE ONLY — io.md §3
  pokeRaw(a: Addr, cell: Cell): void;                  // LOADER ONLY — preserves C verbatim
  clearToHundreds(from: Addr): Addr;                   // op `/`; returns bbb00-1 for BAR
  dump(): Uint8Array;                                  // .cor round-trip, SimH diff
}
```

`writeWhole` vs `setChar` is the seam that makes load mode impossible to scatter: BCD, WM
and C of a load-mode stored byte all come from the channel register and the old core byte
contributes nothing (`io.md` §3, mechanism from 223-2692 p.11 Case 2). *(seam grafted from
pipeline-first; `pokeRaw` from oracle-first.)*

```ts
// ─── 2. Address: 5 chars in core, magnitude + index tag in flight ──────────
// architecture.md §4-5. Zones are LEGAL ONLY over tens/hundreds, where they tag
// one of 15 index registers held in core at 00020+5n .. 00024+5n.
export interface DecodedAddress {
  value: number;                                 // 00000..79999, zones stripped
  tag: 0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15;    // A-tens 1, B-tens 2, A-hund 4, B-hund 8
  valid: boolean;                                // false → AddressCheck stop
}
export type AddressUse = 'increment' | 'decrement';   // 00000 and top-of-core rules differ
```

```ts
// ─── 3. The per-op semantics rows — the diffable table ─────────────────────
// One OpForm per ROW of opcodes.md §2. `A` has three rows there (1/11, 6, and the
// register/indicator/timing sets differ), so `A` has three OpForms here. `regs` uses
// the manual's own Figure 8 notation (opcodes.md §1.3), evaluated by isa/regs.ts.
export type RegExpr =
  | 'NSI' | 'NSIB' | 'BI' | 'Ap' | 'Bp' | 'A' | 'B' | 'special'
  | 'B+LB+1'                       // M / L — opcodes.md §2 pp.40-41; io.md §8 (WCP)
  | `${'Ap'|'Bp'}-1`               // chained , / ⌑ — opcodes.md §2 p.22
  | `${'A'|'B'}${'+'|'-'}${'1'|'LA'|'LB'|'LW'}`;
export interface RegTriple { iar: RegExpr; aar: RegExpr; bar: RegExpr }

// opcodes.md §8 enumerates SEVEN latches — three arithmetic, four compare. They are named
// individually because the tested facts need them individually: computer reset leaves *low*
// and *unequal* ON, and once *equal* is turned off during an operation it cannot be turned
// back on (§5.2). 'six' in this project always means ChannelStatus, which is a different set.
// Carriage channel-9 / channel-12 indicators (opcodes.md §8, io.md §5) arrive with the 1403
// in Phase 2; Wave 1's one-address d-table cannot branch on them yet.
export type IndicatorName =
  | 'arithOverflow' | 'zeroBalance' | 'divideOverflow'
  | 'compareHigh' | 'compareEqual' | 'compareLow' | 'compareUnequal';

export interface OpForm {
  lengths: readonly number[];      // opcodes.md §1.1 — a CHECK, never a driver
  dModifiers: 'none' | 'any' | 'bitmask' | Readonly<Record<string, string>>;
  semantics: string;               // the manual's own prose, verbatim
  indicators: readonly IndicatorName[];
  terminatesOn: string;
  regs: RegTriple;
  regsNotTaken?: RegTriple;        // branches
  timing(ctx: ExecContext): number;  // µs, base machine, 4.5 µs cycle
  cite: string;                    // 'opcodes.md §2 / A22-0526-3 p.17'
  exec(ctx: ExecContext): void;
}

export interface OpEntry {
  opChar: string;                  // '@'  — the MACHINE character, not the mnemonic
  octal: number;                   // 0o14 — index into OPS[]
  autocoder: readonly string[];    // ['M'] — collides with opChar! opcodes.md §1.6
  addressDouble: boolean;          // A S ? ! , ⌑ / J R X   — opcodes.md §1.4
  chainable: boolean;              // false for U M L F K G N and for R X — §1.2
  implemented: boolean;
  feature?: 'priority'|'channel2'|'tape'|'disk'|'micr'|'columnBinary'|'7010only';
  forms: readonly OpForm[];        // one per opcodes.md §2 row for this op character
}
```

`OPS: (OpEntry | undefined)[]` indexed by octal BCD, so `OPS[0o61]` is Add. Ops that exist
on paper but not in this configuration (`Y` priority, `2`/`4` channel 2, `U` tape, `P`/`Q`
MICR, `$`/`=` 7010-only) get rows with `implemented: false` and a `feature` tag, so the
table stays complete against the research while the executor set stays as small as the KISS
decision demands. Dispatching one raises `UnimplementedOp` carrying `cite` — a good error
message instead of a mystery.

```ts
// ─── 4. What the scan fetch produced ───────────────────────────────────────
// architecture.md §7: read from the word-marked op char until the NEXT word mark.
// NOTE: no `length: 1|2|5|6|7|10|11|12` union — `N` is legal at ANY length
// (opcodes.md §2 N row; software.md §10.4, the tape bootstrap depends on it).
export interface Fetched {
  opAddr: Addr;
  chars: Uint8Array;               // op char first, no interior word mark
  nsi: Addr;                       // IAR after read-out = address of the next word mark
}
export type Form = 'O' | 'Od' | 'Oxxxd' | 'Oa' | 'Oad' | 'Oxxxbd' | 'Oab' | 'Oabd' | 'Olong';
```

```ts
// ─── 5. Channel and devices — io.md §1, §3, §5-8 ───────────────────────────
export interface ChannelStatus {                 // the six channel indicators, io.md §5
  notReady: boolean; busy: boolean; dataCheck: boolean;
  condition: boolean; wrongLengthRecord: boolean; noTransfer: boolean;
}
// CLR (correct-length-record) is not a seventh field: 223-2692 p.42 requires WLR and CLR to
// agree at the end of every I/O operation, or a programmed BWL test mismatches its branch and
// no-branch latches and instruction-checks. We hold the invariant `CLR === !wrongLengthRecord`
// by construction — one derived accessor in channel.ts, asserted in a test — rather than
// carrying a second latch that can drift out of step (io.md §5).
export interface XControl {                      // `O x1x2x3 bbbbb d` — io.md §2
  channel: 1 | 2;
  overlap: boolean;                              // '@'/'*' — P1 raises unsupportedFeature
  deviceType: string;                            // x2 glyph: '1' '2' '4' 'T' 'U' 'B' 'F' …
  unit: string;                                  // x3 glyph
}
export type IoMode = 'move' | 'load';

export interface Device {
  readonly x2: string;                           // '1' reader, '2' printer, '4' punch, 'T' console
  readonly bits: 7 | 8;                          // 8-bit devices carry word marks (1415 only)
  precheck(x3: string, d: string): Partial<ChannelStatus>;   // step 4 of the nine
  read?(x3: string, d: string): Uint8Array | null;           // cell bytes; null = no transfer
  write?(x3: string, d: string, data: Uint8Array): Partial<ChannelStatus>;
  control?(op: string, d: string): Partial<ChannelStatus>;   // K/4 stacker, F/2 carriage
}
```

```ts
// ─── 6. Unit record — src/formats/card.ts + src/core/types.ts (landed P2) ─────
// charset.md §2, §2.1, §3. Only the 6-bit BCD is stored; punches are derived,
// because on the 1410 the mapping is a bijection including 2-8 ↔ A-bit.
export type Card = Uint8Array;                 // 80 codes 0..63, built only by makeCard (P2)
export type Deck = readonly Card[];
export type Column = number;                     // 12-bit mask, bit11 = row 12 … bit0 = row 9
export declare function punchMask(bcd6: number): Column;
export declare function bcdOfPunches(mask: Column): number | null;   // null = invalid column

// ─── 7. Object deck — software.md §8.1 (C28-0309-1 Figure 2) ──────────────
// Word marks ride in bit 7 of the payload cells; the deck writer turns each one into a
// 0-5-8 word separator in the preceding column. Separators are NOT in the count.
export interface ObjectRecord {
  readonly loadAddress: Addr;      // cols 2-6, high-order position of the payload
  readonly payload: Uint8Array;    // cells; payload.length === the cols 11-12 count
  readonly sequence?: string;      // cols 73-75
  readonly ident?: string;         // cols 76-80
}
export interface ObjectDeck {
  readonly records: readonly ObjectRecord[];
  readonly entry?: Addr;           // END → execute card; EX/XFR re-enter the loader at 00281
}

// ─── 8. NOT in Phase 1: SourceCard and ListingLine ────────────────────────
// `Card` and `ObjectRecord` were NOT frozen in Phase 1 — its final review removed them from
// types.ts as consumerless (PHASE-1-NOTES §2 item 26). They landed in Phase 2 with their first
// consumers (`Card`/`Deck` in src/core/types.ts; `ObjectRecord` in src/formats/objectdeck.ts,
// payload as cells, no C bit), and Phase 2's hand-written decks against them are why the
// Phase-3 assembler cannot be allowed to define its own format.
// `SourceCard` (a bare alias for `string`) and `ListingLine` have no Phase-2 consumer — they
// are produced by the Phase-3 assembler and rendered in Phase 4 — so they land in Phase 3
// with their producer. Freezing them here would be exactly the speculative typing §12
// disclaims. Their formats are already pinned in the research: `software.md` §1 for the
// 80-column source card, `console-and-physical.md` §12 for the listing column set.

// ─── 9. Output streams ────────────────────────────────────────────────────
export type PrintEvent =
  | { kind: 'line';  text: string }                             // ≤132 glyphs
  | { kind: 'space'; lines: 1|2|3; afterPrint: boolean }
  | { kind: 'skip';  channel: number; afterPrint: boolean };    // carriage tape 1..12

export interface ConsoleLine {
  readonly id: 'S'|'C'|'E'|'B'|'#'|'D'|'A'|'I'|'R'|null;
  readonly text: string;
  readonly wordMarks: readonly boolean[];   // inverted circumflex over the character
  readonly underline: readonly boolean[];   // invalid parity
  readonly spacingBefore: 'single'|'double';
  readonly matrixPos: 30 | 35;
}

// ─── 10. Images and stops ─────────────────────────────────────────────────
export interface CoreImage { readonly size: number; readonly width: 2|4; readonly cells: Uint8Array }

export type StopReason =
  | 'halt' | 'instructionCheck' | 'addressCheck' | 'processCheck'
  | 'ioInterlockStop' | 'unsupportedFeature' | 'unimplementedOp' | 'stopKey';

export interface MachineState {           // structured-cloneable snapshot for the UI
  iar: Addr; aar: Addr; bar: Addr; car: Addr; dar: Addr; ear: Addr; far: Addr;
  op: Cell; opMod: Cell;
  indicators: Readonly<Record<IndicatorName, boolean>>;
  channel1: ChannelStatus & { interlock: boolean };
  window: { base: Addr; cells: Uint8Array };
  microseconds: number; instructions: number;
  stop?: StopReason;
  console: readonly ConsoleLine[];
}
```

---

## 4. The core, designed

### 4.1 The cell — we store the C bit

Deriving parity would be shorter by line count and it costs us three things the project
actually uses:

- The `.cor` format carries C, so **load → dump → byte-compare is a test**
  (`emulators.md` §6).
- Two of the four oracle images ship parity-invalid `0x00` fill (`emulators.md` §5.1). We
  want to *detect* that on load and normalise it as a named, tested step, not paper over it
  invisibly.
- The console underlines a bad-parity character (`console-and-physical.md` §2; S223-2648
  p.6 gives 128 even-parity patterns printable underscored). With C derived, invalid parity
  is unrepresentable and the underline has no source.

`setChar()` recomputes odd parity over `BA8421 + WM`; `setWm()` flips C. Only the loader
calls `pokeRaw()`. Parity *checking* on read is a config flag, default off in Phase 1.

Word marks live in bit 7 of the cell, never in a parallel array: `cc01.cor` stores op codes
**without** word marks and sets them at run time to test branch-on-word-mark
(`emulators.md` §4.5). A loader that infers word marks from instruction boundaries breaks
that test. One byte, one truth.

### 4.2 The address

Addresses in *storage* are five characters where the zone bits over the tens and hundreds
positions are an **index tag**, not magnitude (`architecture.md` §4, §5). Addresses in
*registers* are magnitudes. Conversion happens exactly once, when the address field is read
into an address register:

```
decodeAddress(cells[p..p+4]) → { value, tag, valid }
   value = Σ addressDigit(cell) × 10^k
   tag   = (A over tens ? 1 : 0) | (B over tens ? 2 : 0)
         | (A over hundreds ? 4 : 0) | (B over hundreds ? 8 : 0)
   valid = zones appear only in tens/hundreds
         ∧ every position holds a legal address character
```

then, if `tag ≠ 0`, add the index factor from IR*n* at `00020+5n … 00024+5n` algebraically,
sign from the zone bits of the factor's own units position, **without** touching arithmetic
overflow (`architecture.md` §5). Worked example that is a Phase-1 test: `009Z6` tagged IR1
containing `0001J` → effective 00985 (`architecture.md` §5, p.15).

`addressDigit` is a hand-written **64-entry table**, not a derived rule. The research gives
two overlapping statements — "every position must have a numeric total of 0-9" and "legal
tens/hundreds characters: numerals, letters, and `/ ? ! ‡`", with `&`, `$`, `#` explicitly
causing an address check (`architecture.md` §4). Those do not reduce to one arithmetic rule
(`&` has numeric bits 0 yet is illegal; `0` is coded 8-2 yet means zero). A 64-entry table
with the research's list as the spec is shorter to read, impossible to get subtly wrong, and
diffable. The same shape of table handles arithmetic digit coding (`opcodes.md` §4.2: blank
→ 0, `&`/`-`/substitute blank → 0, group mark → 7, `#` → 3).

Address-check branches, each named, each citing `architecture.md` §4: 00000 legal only for
incrementing ops; the top address illegal for incrementing except console display/alter and
end-of-core I/O; on a 10K machine the high-order position of an indexed address must be
zero; an indexed result outside installed storage is an address check, **not** a wrap
(`open-questions.md` architecture row — the documented fallback).

### 4.3 Registers

`IAR AAR BAR CAR DAR EAR FAR` as numbers; `Op`, `OpMod` as cell bytes
(`architecture.md` §6). CAR and DAR exist because the address-double mechanism needs them
(`opcodes.md` §1.4) and because Table Lookup reloads AAR from CAR at the start of every
search cycle (`opcodes.md` §5.1) — a real behavioural requirement. EAR/FAR exist so
`G ccccc E` has something to store; overlap is out of scope.

### 4.4 The fetch loop — scan, then validate

```ts
step({ execute = true } = {}) {
  const opAddr = IAR;
  let cell = storage.read(opAddr);
  if (!(cell & WM)) throw new InstructionCheck('no word mark on op code', opAddr);

  const chars = [cell];
  let p = opAddr + 1;
  while (!(storage.read(p) & WM)) {          // scan to the NEXT word mark
    chars.push(storage.read(p));
    p = advance(p);                          // address-checks off the end of storage
  }
  IAR = p;                                   // = NSI, the address of the next word mark

  const entry = OPS[chars[0] & BCD6];
  if (!entry) throw new InstructionCheck('undefined op code', opAddr);
  const form = selectForm(entry, chars.length);   // length-validity check lives HERE
  if (!form) throw new InstructionCheck('invalid instruction length', opAddr);

  applyFields(entry, form, chars);           // chaining, address-double, opMod blanking
  if (!execute) return;                      // ← decode-only mode
  form.exec(ctx);
  applyRegisters(form, ctx);
  microseconds += form.timing(ctx);
}
```

That is the whole decoder. Three things about it are load-bearing:

- **The scan has no length cap.** `N` accepts any length (`opcodes.md` §2 N row: "any (1,
  2, 3, …)") and the tape bootstrap works precisely because of it — a word-marked `N` at
  00011 runs to the first word mark inside the just-loaded record (`software.md` §10.4).
  A `length: 1|2|5|6|7|10|11|12` union type cannot represent a legal long `N`, so we do not
  have one. The scan's only bound is the end of installed storage, which raises an address
  check.
- **Length checking is a check, not a driver.** `selectForm` looks up `chars.length` in the
  op's `forms[].lengths` from `opcodes.md` §1.1. `R`/`X` accept **7 only**; `D`/`T` reject
  2, 7 and 11 (both are documented SimH divergences — `opcodes.md` §1.1 and §3.3).
- **`execute: false` is a first-class mode.** `note1410.txt` says the length and index
  blocks are decode tests and that Jaeger had to patch his simulator to disable execution
  (`emulators.md` §5.2). Making that supported validates the decoder — where the
  address-double set, the op-modifier blanking trap and the R/X-length-7-only rule all
  live — against documented expected values before a single executor exists.
  *(grafted from oracle-first; the highest-value idea in the design set.)*

`applyFields` is keyed on the instruction **form**, not on a raw length number
(`opcodes.md` §1.1, §1.4):

| Form | Chars | Field assignment |
|---|---|---|
| `O` | 1 | AAR/BAR untouched; op-modifier register untouched. D cycle copies BAR→DAR. Legal only for `chainable` ops. |
| `O d` | 2 | `F`/`2`/`K`/`4`/`P`/`Q` only. OpMod ← d. |
| `O xxx d` | 5 | `U` only. x-control decoded; no B-address. |
| `O aaaaa` | 6 | address-double op (`A S ? ! , ⌑ /`): AAR=BAR=CAR=DAR←A, field operates on itself. Not address-double (`@ % C T D B W V Z E .`): AAR=CAR←A, **BAR chained**, D cycle sets DAR←BAR. **OpMod ← unchanged**: a 6-character form supplies no d-character and *reuses the last previous operation modifier* (§8 bullet 2; A22-0526-3 pp.12, 25, 30, 38; `opcodes.md` §2 rows `D`, `B`, `V`). This is the mirror of the 11-character blanking trap and is just as easy to get wrong. |
| `O aaaaa d` | 7 | `J R X G` (and `Y` with Priority). AAR=CAR←I/C-address; OpMod ← d. |
| `O xxx bbbbb d` | 10 | `M`/`L`. x-control decoded at channel level; BAR←B; OpMod ← d. |
| `O aaaaa bbbbb` | 11 | AAR=CAR←A, BAR=DAR←B, **and the op-modifier register is BLANKED** (`opcodes.md` §1.2 / A22-0526-3 p.12). |
| `O aaaaa bbbbb d` | 12 | as 11, OpMod ← d. |

The address-double set is `A S ? ! , ⌑ / J R X`, verbatim from `opcodes.md` §1.4 (CE
Handbook ALD grouping objectives cross-checked against SimH's `O_DBL` flags). It **excludes**
`@` and `%`, which is the opposite of the 1401 rule and is called out there as the
compatibility trap. `J`, `R` and `X` are in the set but have no 6-character form, so their
doubling is exercised only through the `O aaaaa d` path — the length table forbids the
combination before `applyFields` can see it.

### 4.5 The per-op semantics table

`src/core/isa/table.ts`, indexed by BCD octal, **one `OpForm` per row of `opcodes.md` §2**.
That shape is deliberate: §2 splits `A`, `S`, `?`, `!`, `/`, `.` and `J` into separate rows
per length whose semantics, indicators, registers-after and timing all differ — `A` at 11
gives `NSI / A−LW / B−LB`, `A` at 6 gives `NSI / A−LA / A−LA`; `/` at 1 or 6 gives
`NSI / B / bbb00−1`, `/` at 11 gives `NSIB / BI / NSIB`. A table with fewer rows than the
source cannot be diffed against it, and diffability is the whole point.

The load-bearing choice is `regs`. It is **not** a function; it is the manual's own notation:

```ts
regs:         { iar: 'NSI', aar: 'A-LW', bar: 'B-LB' },
regsNotTaken: { iar: 'NSI', aar: 'BI',   bar: 'B-1'  },   // two-address branches
```

evaluated by a ~30-line interpreter over the context `{ A, B, Ap, Bp, LA, LB, LW, NSI,
NSIB, BI }` — the exact symbol set of `opcodes.md` §1.3 (Figure 8). `'special'` means the
executor sets BAR itself (only `E`, whose BAR "varies with result of edit"; `opcodes.md`
§7.3 gives the eight cases as a sub-table).

That buys three things for ~60 lines: the chaining contract is inspectable data rather than
assignments scattered through executors; a mis-implemented register effect shows up as a
wrong *string* in a diff instead of a subtle bug; and the decode-only oracle can check
`regs` before any executor exists.

`chainable` deserves a note on honesty. `opcodes.md` §1.2 (223-2589 p.50) states that only
not-percent-type op codes can be chained, and not `R`/`X` — percent-type being
`U M L F K G N`. Every one of those is already excluded from length 1 by the §1.1 length
table (`U`=5, `M`/`L`=10, `F`/`K`=2, `G`=7, `R`/`X`=7), and `N` at length 1 is a legal NOP
rather than a chained op. So `chainable` adds no gate the length table lacks. We carry it
anyway as a **redundancy check**, with `N` named out of it explicitly:

```ts
// tier 0: for every entry, chainable === false && opChar !== 'N'  ⇒  1 ∉ lengths
// `N` is the exception on the plan's own data — opcodes.md §1.2 lists it percent-type
// (not chainable) while the §2 N row gives lengths "any (1, 2, 3, …)", so 1 ∈ lengths.
// A 1-character `N` is a legal NOP, not a chained op. The rule as stated without the
// exclusion is simply false and the gating test could not pass.
```

That catches a future typo in either column. Stating it plainly, exception and all, is better
than claiming a rule the machine enforces twice.

### 4.6 Indicators

One `Indicators` object, **seven latches** — three arithmetic and four compare, exactly the
seven rows of `opcodes.md` §8 — with methods named after the manual's rules rather than
generic setters, because the reset rules are the part everyone gets wrong (`opcodes.md` §8,
`architecture.md` §10). "Six" in this project means `ChannelStatus`, never these:

- `arithOverflow` — set by **Add and Subtract only**, never by ZA, ZS, Multiply, Divide or
  indexing; reset by the `J (I) Z` test that reads it, or computer reset.
- `divideOverflow` — Divide only: divide by zero (always), an improperly addressed dividend,
  or a quotient field **two or more** positions too small. One position short silently
  corrupts the adjacent field and is *not* checked (`opcodes.md` §4.6). Reset by `J (I) W`
  or computer reset.
- `zeroBalance` — Add, Subtract, **Multiply**, ZA, ZS — never Divide. Reset by the next such
  op with a non-zero result, or computer reset.
- `high / equal / low / unequal` — set as a group by Compare, Table Lookup and BCE; reset as
  a group by the next of those three. Once equal is turned off during an operation it
  cannot be turned back on (`opcodes.md` §5.2, 223-2588-2 p.24).
- `computerReset()` — clears overflow and zero balance and turns **low** and **unequal ON**.
  That asymmetry is real and it is a test — and it is why the four compare latches are four
  named members of `IndicatorName`, not one collapsed `'compare'`.
- Not here in Phase 1: the **carriage channel-9 and channel-12** indicators (`opcodes.md` §8,
  `io.md` §5 J-table). They arrive with the 1403 in Phase 2, so Wave 1's "full one-address
  d-table" is full *minus* `BC9`/`BCV`, which raise `UnimplementedOp` with their citation.

### 4.7 Arithmetic

`alu.ts` works on storage through a cursor, digit by digit, right to left. No conversion to
JS numbers: field lengths are unbounded, signs live in zones, and the recomplement pass is
an observable (it feeds the timing term `R`). True-add vs complement-add is selected from
the Figure 12 table (`opcodes.md` §4.3), with Subtract inverting the A sign first. B zone
bits are preserved except in the units position; A zone bits ignored except units. Plus is
written B+A, minus B alone (`architecture.md` §10).

The pass is structured as the documented scan phases — **units / body / extension**, with
A-complement, B-complement, carry-in, carry-out, zero-balance and overflow latches
(`architecture.md` §10, `opcodes.md` §4.3). This is not a timing-accuracy claim; it is
writing the algorithm the way the hardware describes it, which is also the shape that lets
us consume `note1410.txt`'s cycle-level annotations rather than settling for end states
(`emulators.md` §5.3). Cycle counting stays separate and formula-driven. *(scan-phase
structure grafted from oracle-first.)*

Multiply is the documented repetitive-add over the B field (`opcodes.md` §4.5) — a
multiplier digit 1-4 costs that many true-adds; 5-9 costs complement-adds plus a shift and a
true-add — not a JS multiply written into place, because the multiplier image is destroyed
in core and that is visible state.

Divide is the documented windowed restoring division with the **B-address at the leftmost
position of the dividend**, `len(divisor)+1` positions in from the left end of the field —
not the left end of the field (`opcodes.md` §4.6, Figures 15-17). Implementing the loop as
documented makes "an improperly addressed dividend causes divide overflow" fall out for
free, rather than needing a special case.

### 4.8 Move/Scan — 64 d-characters, zero switch statements

With our byte layout, `d & 0x07` is the portion (bits 4/2/1 → word mark / zone / numeric;
none = scan) and `d & 0x38` is the direction+terminator field — literally SimH's
`op_mod & 070` (`opcodes.md` §3.1). One function, two small structural tables, no 64-way
dispatch. The 64-row mnemonic/direction/terminator matrix from `opcodes.md` §3.2 is
*generated in a test* and asserted against a fixture transcribed from the research file, so
the table in the docs and the behaviour of the code are mechanically tied. Register effects
come from the eight-row Figure 20 table (`opcodes.md` §3.3).

Two glyph traps the assembler and the tests must both respect: octal 20 (A bit only) is the
**substitute blank** `ƀ`, not an ASCII space — `SCNLA` and `BNT1`/`BNT2` use it, and a true
blank (octal 00) tests nothing and turns SCNLA into SCNLS (`opcodes.md` §3.2,
`charset.md` §2, cross-file contradiction #7).

### 4.9 Move Characters and Edit

Implemented from `opcodes.md` §7, which reconstructs MCE in full including the
registers-after rule the Principles of Operation refuses to state: three scans, `BAR` −1 per
B-cycle on scans 1 and 3 and +1 on scan 2 including the terminating cycle, the eight-case
BAR table (§7.3), the 46-step Figure 34 trace, and the two **skid cycles** at the scan
boundaries that read and rewrite a byte outside the declared B field — the scan-1→2 skid at
`B_high − 1` **preserving** any word mark there, where every other MCE store clears one
(§7.5). Do **not** copy SimH's `OP_E`, which has three documented deviations (§7.6).

`open-questions.md` (architecture row) originally said "leave E unimplemented and trap it",
then added in place: "opcodes.md §7 has since reconstructed MCE including the
registers-after rule; use that, then confirm against pp. 31-35." We use it, and the
confirmation read of A22-0526-3 pp.31-35 is a named open item in `PHASE-1-NOTES.md`.

### 4.10 The channel and one device

Phase 1 needs I/O because CC01A types two messages through `%T0` (`emulators.md` §4.3) —
its entire 10,000-position image contains exactly five I/O instructions and all five target
the console printer. Console I/O is CPU work on this machine, not peripheral work.

The channel implements the nine-step sequence of `io.md` §5 verbatim: recognise, test
interlock (on → system stop), reset the six status indicators, test device readiness, set
the interlock, skip execution if any indicator is on, transfer, post-test, next instruction.
Interlock release is exactly two things: an `R`/`X` that actually branches, or `R (I) ‡`
with the group-mark d-character (`io.md` §5, `architecture.md` §9). Interrogating the
indicators does not reset them; the next I/O read-out on that channel does.

Move vs load mode lives in the channel, not the device (`io.md` §3), and it has **two** rules,
not one. `channel.ts` states both explicitly:

- **Load-mode input.** Consume a separator and set a word mark on the **next** stored
  character; collapse a pair of separators to one stored separator with no word mark; and
  **replace the whole byte including the WM bit** — the rule the Principles of Operation never
  states and the CE manual does (223-2692 p.58, Figure 5; `io.md` §3).
- **Load-mode output.** A core word mark becomes a word separator written one position
  **ahead** of its character; a core word separator becomes **two** separators. The record
  therefore *lengthens* (`io.md` §3 p.41; `opcodes.md` §2 `L` row, A22-0526-3 pp.40-41). This
  rule was missing from the earlier draft while Phase 1 shipped `L %T0 bbbbb W` (WCPW), which
  needs it.

Move-mode output is the easy half: separators pass through unchanged, core word marks are not
transferred at all (`io.md` §3).

The translation runs in the channel only for **7-bit** devices, which have nowhere to put a WM
bit. For the 8-bit 1415 the channel hands the record over with its WM bits intact and the
device renders them — WCPW prints an inverted circumflex over the marked character and `b` for
blanks (`io.md` §8, Figure 44). That is the seam that keeps the "channel does not change in
Phase 2" promise honest: the 1403's load-mode write prints a **blank ahead of** the marked
character (`io.md` §7, Autocoder WW) and the 1402 punch punches 0-5-8, but both are just
*renderings of the separator the channel already produced*. Rendering is device work; the
translation is channel work. Re-checked against B9, which now says the same thing.

Phase 1 ships one device: `Console1415` (8-bit, channel 1 only, `%T0`). The write path is real
in Phase 1. `Console1415.read` is a three-line documented stub returning `null` with
`noTransfer: true` — which is not a placeholder but the machine's actual behaviour when no
inquiry request is pending (`io.md` §8 console status table) — so a stray branch into
`cc01.cor`'s loader/monitor block at 01800-01912 gets defined behaviour instead of an
undefined path. Real inquiry, with the keyboard, is Phase 2. Phase 2 adds `Reader1402`,
`Punch1402`, `Printer1403` behind the same interface, and the channel gains nothing beyond
the 7-bit output path already specified here.

### 4.11 Stops and the console print-out

`step()` returns a discriminated `StopReason`. Internally the ALU and address paths throw a
typed `MachineCheck`, caught once in `step()`; threading error returns through the digit
loops would cost far more legibility than it buys.

On any stop the core produces the real machine's print-out line via `printout.ts`
(`console-and-physical.md` §2, A22-0526-3 Figure 42): ID char, space, IAR(5), space,
AAR(5), space, BAR(5), space, **Op+OpMod as one 2-character group**, space, A-channel /
B-channel / assembly-channel (3), space, CH1+CH2 unit-select/unit-number as one 4-character
group with **no inner space**. The real log sample is
`S 149ØØ 1bbbb 11622 bb bbb bbbb`. Any register field with bad or absent parity is
underlined.

Twenty lines, DOM-free, in the core from Phase 1 — so the terminal harness is
period-correct for free and Phase 4 restyles the Selectric log rather than reimplementing
it. That is the cheapest possible way to make the period console designed-in rather than
bolted-on.

---

## 5. How the pipeline composes

Walk one program end to end. Every arrow is a total function between two named types, and
every stage is testable with the stages either side stubbed.

0. **Where the toolchain runs.** `src/rpg/` and `src/asm/` are **host-side TypeScript**. The
   real processors were tape-resident and could not run on the machine we model: RPG
   generation needed 20K + a 1402 + **two tapes**, the Autocoder assembly of the generated
   program needed 20K + a 1402 + **four tapes** + a 1403-2, and the disk RPG needed 40K +
   overlap/priority + a 1301 (`software.md` §12.5, C20-1602-8). Our settled configuration is
   one channel, no tape, no disk, no overlap (`DECISIONS.md` 2026-08-30, KISS peripherals).
   So the **pipeline shape** is historically accurate — spec sheets → Autocoder source cards
   → condensed object deck → 1402 load → run — and the *artifacts* at every arrow are
   period-correct, but the **execution model is not**: the translators are modern code on the
   host, not 1410 programs. Said plainly here so "historically accurate" is never read as a
   claim we assemble on the emulated machine.
1. **RPG spec sheets → `SourceCard[]`** (`src/rpg/`). The mechanism is exact: RPG "accepts
   report specifications and produces a symbolic program deck (Autocoder format)" and is a
   preprocessor, not a compiler (`software.md` §12.5). Pure text → text, no privileged
   access to the core, golden-file testable against Autocoder source with zero dependency on
   the CPU. *The input side of this boundary is open — see §9 R1.*
2. **`SourceCard[]` → `{ ListingLine[], ObjectDeck }`** (`src/asm/`). **Which assembler: the
   standalone C28-0309-1 Autocoder, not the OS C28-0326-2 one.** They are different products
   and the earlier draft mixed them — B4's absolute condensed deck and the 00500 origin are
   standalone, while B3's listing columns (S/G, REL, the F/M/N/O/R/U/W flag set) and the
   Exhibit IV oracle are OS. The OS assembler emits **relocatable** cards — TITLE / Load with
   a per-item relocation indicator from col 71 downward and col 72 = `0`/`1`/`2` / Termination
   / DEFIN / Random Load / Clear Storage / Set WM — which needs a relocating loader we have no
   reason to build (`software.md` §8.2, C28-0319-4 pp.64-67), and its ORG default is 00000
   (`software.md` §2). We target the standalone: absolute condensed deck (§8.1), ORG default
   **00500** because the loader occupies storage below it, flag set F/U/M/O. B3's listing type
   drops the OS-only columns to match. Two passes: symbol resolution then emission. The rules
   that bite: symbolic labels resolve **low-order** for
   constants and **high-order** for instructions, for actual (numeric) labels, and for
   labels indented to column 7 (`software.md` §5); DCW sets a word mark on the high-order
   position, DC does not, DS emits nothing and does not clear the area; literals scan
   right-to-left from column 72 for the closing `@` and pool at the LTORG/EX/END point; the
   asterisk means the last character of the instruction as an operand but the current
   assignment counter in EQU/ORG/LTORG (`software.md` §2); indexing writes zone bits over
   the tens position and the **rightmost** tag wins; ORG defaults to 00500 on the standalone
   assembler.
3. **`ObjectDeck` → `Card[]`** (`src/formats/objectdeck.ts`). Each record becomes one
   condensed card in the C28-0309-1 Figure 2 layout; each word mark in the payload becomes
   a 0-5-8 word separator punched in the column *before* its character and is not counted in
   cols 11-12 (`software.md` §8.1).
4. **`Card[]` → punched-card images** (`src/formats/card.ts`). `punchMask(bcd)` derives the
   12-bit column from `charset.md` §3's zone × digit structure; `2-8` ↔ A-bit round-trips
   the 1410 way (`charset.md` §2.1).
5. **1402 → core.** The operator keys the 12-character bootstrap `AL%1000012$R` into
   00000-00011 with word marks on the `L` at 00001 and the `R` at 00011, presses COMPUTER
   RESET then START (`software.md` §10.2). The `$` d-character is load-bearing: on a cleared
   machine there is no GM-WM to stop an `R` read, so `$` is what says "ignore GM-WM, fill to
   end of record" (`software.md` §10.4). **`io.md` §3 says the opposite** — that `$` is a tape
   facility and a card read accepts only `R`. That is a live cross-file contradiction on the
   exact instruction the Phase-2 demo executes; it is ruled in §9 **C17** in favour of
   `software.md`, and `Channel.decodeD()` carries the ruling and both citations in a comment.
   The channel then runs the load-mode read of §4.10;
   because the loader is a **load-mode** read, the word separators in the deck become word
   marks in core. 80 is the buffer size, not an unconditional store count — a normal `R`
   read stops at the first GM-WM in core (`software.md` §10.4).
6. **CPU runs.** Nothing in `src/core/` knows a card exists.
7. **1403 / 1415 out.** Write-a-Line transfers core → the 132-position print buffer up to
   the GM-WM, then the printer starts; if no carriage instruction follows, an automatic
   single space occurs at the end of the buffer-to-printer transfer (`io.md` §7). The
   console write emits data up to but **not including** the terminating GM-WM
   (`io.md` §8, cross-file contradiction #1, resolved).

The parallelism this unlocks matters for a two-person project with agent help: `src/rpg/`
and `src/asm/` are pure functions over 80-column text and can be written against golden
files with no dependency on the CPU landing first. Only the *demos* are ordered.

The one refactor this ordering deliberately avoids: **freeze `ObjectRecord` in Phase 1 and
hand-write object decks from a ~30-line test helper in Phase 2**, so Phase 3's assembler
targets a format that already has a tested consumer. Writing the assembler and the loader
together reliably produces an assembler that emits whatever its own loader happens to
accept. *(grafted from pipeline-first.)*

---

## 6. UI: period-accurate, plus a separate internals view

Two surfaces, visually foreign to each other on purpose (`DECISIONS.md` 2026-08-30).

**Period surface** (`src/ui/period/`, Phase 4). The machine as the operator saw it. The
1410 shows **no register contents in lights** — every stop, display, alter and inquiry goes
out on the typewriter as a fixed-format line (`console-and-physical.md` §2). So:

- **1415 Selectric log**: fixed pitch, slashed zero `Ø` (letter O unslashed), word marks as
  an inverted circumflex over the character, bad parity underscored, `b` for blanks in
  load-mode printing, single/double spacing and matrix positions 30/35 per Figure 42.
  Rendered from `ConsoleLine[]` that `printout.ts` already produces in Phase 1.
- **MODE rotary**, six positions, physical layout RUN top, then clockwise DISPLAY, ALTER,
  CE, I/E CYCLE, ADDRESS SET; START / STOP / PROGRAM RESET / COMPUTER RESET keys
  (`console-and-physical.md` §3). **Any** mode change triggers a stop print-out — a real
  side effect, modelled.
- **Display / Alter dialogue**: display types `D`, unlocks the keyboard, takes a 5-digit
  address, then prints storage to the next word mark; alter must follow a display and ends
  at a word mark or end of line; a previously displayed word mark must be re-entered
  (`console-and-physical.md` §4, `software.md` §10.8).
- **1402 card viewer**: 80 columns × 12 rows, holes rendered, interpretation band across
  the top 3/16 in, left upper corner cut (`console-and-physical.md` §10).
- **1403 green-bar**: 132 positions at 10 cpi, 6 or 8 lpi, 48 printable graphics (A2 chain
  by default, H chain a switch — `charset.md` §5). Green-bar default with a plain-white
  toggle, per the `console-and-physical.md` §13 fallback, since 1961-65 stock is unverified.

**Internals surface** (`src/ui/internals/`, Phase 1). The deliberate anachronism, separated
by a hairline rule and a label saying so: IAR/AAR/BAR/CAR/DAR/EAR/FAR, Op and Op-modifier as
glyphs, the **seven** indicator latches, the six channel-1 status indicators plus the interlock, a
scrollable core window rendering each position as its glyph with an **overbar where the word
mark is set**, the cycle counter in µs, and the real console controls — LOAD, START, STOP, PROGRAM RESET,
COMPUTER RESET, plus the two MODE positions Phase 1 cannot do without: **ADDRESS SET** (type a
5-digit address into the IAR; prints the `B` line) and **I/E CYCLE** (half-cycle; prints the
`C` line). There is **no SINGLE STEP key on a 1410** — `console-and-physical.md` §3 gives six
MODE positions and no such control, and §2 gives `C` as the half-cycle print-out ID, so the
earlier draft's button would have produced a print-out line the machine could never emit.
ALTER (display-then-alter, ending at a word mark) comes with it, because without it Phase 1
has no way to put a hand-keyed program into storage at all. In Phase 4 the whole surface
becomes a tab and Phase 4 reuses these controls verbatim; nothing is thrown away.

The cycle counter is named `microsecondsSimulated` and is never rendered as a clock. Zarathustrum's
settled decision is instruction-accurate with a cycle counter and **no cycle-accurate timing
claims**.

---

## 7. Phase sequence, each ending on a demo

**Build order (Zarathustrum, 2026-08-30): 1 → 1b ∥ 2 → 3 → 5 → 4 → 6.** RPG builds before the period
UI — the green-bar report is the showcase and needs no chrome, and Phase 4 then dresses a real
job. Phase numbers are stable names, not the sequence.

Gated. Approval before each (`CLAUDE.md`).

| Phase | Function it adds | Demo it ends on |
|---|---|---|
| **1 — CPU core** | `.cor → Storage`, `step()` and `stepCycle()`, Channel 1, 1415 write | `npm run cc01` prints the Selectric transcript `CC01A` / `CC01 COMPLETE`. In the browser: LOAD `cc01.cor`, MODE = ADDRESS SET, key 02000 into the IAR, START, watch it type. Then key a three-instruction add through ALTER, put MODE on **I/E CYCLE** and half-cycle it, and **watch the B field fill right to left from the units digit until the word mark stops it.** |
| **1b — the ops CC01A does not reach** | `@` Multiply, `%` Divide, `T` Table Lookup, `Z` MCS, `E` MCE promoted from `implemented: false` to real executors | `insttest.cor`'s ZA/ZS/multiply/divide blocks pass, and MCE reproduces the 46-step Figure 34 trace cycle by cycle. |
| **2 — Unit record** | `Card`, 1402 reader/punch, 1403 Model 2, 1415 read/inquiry, the condensed loader | Paste a hand-punched deck into the browser, key `AL%1000012$R` into 00000-00011, COMPUTER RESET + START — a card image lands in core and a line hits the printer. **This demo depends on the §9 C17 ruling** that `$` is decoded at channel level and suppresses the GM-WM record test on a *card* read; `io.md` §3 reads A22-0526-3 p.62 as allowing only `R` there. If C17 goes the other way, the demo bootstraps with `R` and a pre-set GM-WM instead, and the keyed string changes. |
| **3 — Autocoder** | `SourceCard[] → { ListingLine[], ObjectDeck }` | Type Autocoder in a textarea; see the 1403-format listing and the punched object deck side by side; load the deck; run it. |
| **4 — Period UI** | Consumes `ConsoleLine[]`, `PrintEvent[]`, `Deck` — **no core changes** | The whole machine as the operator saw it: Selectric log, MODE rotary, card hopper, green-bar. Internals becomes a tab. |
| **5 — RPG** | `spec sheets → SourceCard[]`, **on the host** — the real RPG processor was tape-resident (20K + 1402 + two tapes) and cannot run on this configuration (`software.md` §12.5, §5 step 0) | An RPG business report — file description, input specs over a card file, calculation specs with level breaks, output specs with edit codes — printed on green-bar. Zarathustrum's flagged candidate for the *first* showcase, **which reverses the order in `CLAUDE.md` and `PROJECT-BRIEF.md` — see §11 item 3**. |
| **6 — Reentry showcase** | An Autocoder program, no new machinery | A ballistic reentry trajectory printed in twelve columns on the 132-position carriage, framed honestly as a reconstruction. |

The Phase-1 period-reader demo is the half-cycled add, not the diagnostic banner. It needs one thing the
instruction-level `step()` cannot give — a **storage-cycle** boundary, since a whole
`A aaaaa bbbbb` completes in one `step()` and the B field would fill in a single frame. The add
pass in `alu.ts` is already written as the documented units / body / extension scan phases for
the `note1410.txt` latch tracer (§4.7), so the cycle boundary already exists; `stepCycle()` on
the machine façade exposes it, and the L3 latch trace and the UI are driven from the same
records. The control is MODE = **I/E CYCLE** (half cycle, print-out ID `C`), not a "SINGLE STEP"
key — the 1410 has no such key (`console-and-physical.md` §2, §3). It shows the one
thing about this machine worth explaining to someone who read its output for a living, in
fifteen seconds, with no period art. The CC01A transcript is the *engineering* gate; the add
is the *human* one. *(demo grafted from pipeline-first.)*

**Phase 6 notes** (`avco-and-reentry.md`): fixed-point decimal with a documented implied
point per variable, rescaled by moves between offset addresses (the machine has no shift
instruction); the one transcendental needed is a decimal antilog `10^F`, fetched by
**indexed move** (~138 µs), never by op `T` (~25 ms on a 1000-entry table); RK4 over the 2-D
point-mass set costs ~185 ms per step and ~2 minutes of emulated CPU for a 600-step
trajectory. And it says so in the demo text: **no IBM 1410 is documented at any Avco site**
(`avco-and-reentry.md` §1-2). Period-plausible reconstruction, stated as such.

---

## 8. Oracle and test strategy, per phase

Line-oriented, diffable, cheapest tier first. Vitest. `npm test` runs everything that does
not need a downloaded image; the oracle tiers skip with a clear message when
`oracles/` is absent.

**Tier 0 — table fidelity (every phase).** Fixtures transcribed from the research into
`oracle/*.json`, each with a `source` field naming file + section, asserted against the
implementation. `lengths.json` (`opcodes.md` §1.1) · `dchar-matrix.json` (64 Move
d-characters + Figure 20 register effects, §3.2-3.3) · `signs.json` (add-cycle table §4.3,
ZS sign map §4.4, digit coding §4.2) · `collate.json` (all 64 code points: rank, BCD, octal,
Hollerith, A/H glyph — `charset.md` §2, with a round-trip property test
`bcd → punches → bcd` for every punchable code) · `jdchars.json` (§6.1) · `vdchars.json`
(§6.3) · `indicators.json` (§8, **seven** latches) · `timing.json` — the Figure 7 `E`-term
matrix keyed on (op, length): `E`=2 for `@`/`%` at length 1, `E`=1 for `A S ? ! T` at length 1
and for `@`/`%` at length 6, `E`=0 everywhere else; plus the terms a formula-only `cycles.ts`
would silently drop — `INDEX_US = 34.5` per address indexed (`architecture.md` §5, p.15), the
device `I/O` term (0 in Phase 1, with a comment that the 1415's 932 char/min is not modelled),
and the ops whose timing is a **constant, not a formula**: `G` = 69.75, `.` at L=6 = 36,
`F`/`K` = 13.5 (`opcodes.md` §1.5, §2). These tests fail loudly if someone edits the code
without editing the research — the property Zarathustrum wants from a project that cites its sources.

Named negative tests, each a documented trap: `R`/`X` at length 1 or 6 → Instruction Check;
`D`/`T` at 2/7/11 → Instruction Check; an 11-character instruction blanks the op-modifier
register; a chained 1-character `A`/`S` is the **two-field** form; `?`/`!` in x1 and `3`/`1`
as branch ops are rejected as 7010 (`io.md` §2, `software.md` §10.3); computer reset leaves
**low** and **unequal** ON.

**Tier 1 — manual worked examples.** Each a named test citing a page. `A 05985 06985` leaves
AAR 05980 / BAR 06979 and the following bare `S` operates on two distinct fields
(`opcodes.md` §1.2) · `009Z6` tagged IR1 = `0001J` → 00985 (`architecture.md` §5) · ZA
one-field `#b&-bn%` → `300004D` and `ABCD5` → `1234E` (`architecture.md` §10) · Compare
short-A turns HIGH on even when the compared portion is equal, and **A-field `444444D`**
against **B-field `444444M`** (six 4s, not seven) gives **HIGH** — the minus zone on `M` does
not participate; `M` simply collates above `D` (`charset.md` §4.1, A22-0526-3 p.29) · Divide `12` into `00014700` with the B-address at the `1` of
`14700` (`opcodes.md` §4.6, Figure 17) · `/ 12590` clears 12590-12500 and leaves BAR 12499
(`opcodes.md` §2) · MCE Figure 34 all 46 steps, ending AAR 12155 / **BAR 04677**
(`opcodes.md` §7.3) · load-mode `WS A WS B WS WS C` → `A(wm) B(wm) WS C`, 4 positions
(`io.md` §3, Figure 5) — driven through a fake device in Phase 1, through the real 1402 in
Phase 2 · **the print-out formatter**, which ships in Phase 1 and whose output is the first
thing anyone sees from `npm run cc01`, reproduces the real log line
`S 149ØØ 1bbbb 11622 bb bbb bbbb` from the corresponding machine state — Op+OpMod as one
2-character group, CH1+CH2 as one 4-character group with no inner space, the underline on the
absent-parity empty `bbbb` group, and the slashed zero (`console-and-physical.md` §2). Free
coverage of the fiddliest formatting rule in the phase; the *styled* Selectric golden is still
Phase 4.

**Tier 2 — decode-only against `ilentest.cor`.** `step({execute:false})` over the
length/decode block 00100-02100, asserting instruction length and post-decode IAR/AAR/BAR
against **the instruction lengths present in the image** as `emulators.md` §5.2 inventories
them: 11/6/1 for `A S ? ! @ % Z E C , ⌑ /`; 12/6/1 for `D B W V T`; 6/1 for `.`; and a
7-character case each for `J X R G` (`_J11111A`, `_X22222B`, `_R33333D`, `_G11111A`).

**That is a description of the image, not of the machine, and the distinction is load-bearing.**
`forms[].lengths` is sourced from `opcodes.md` §1.1 / 223-2589 p.53 **only** — where `J` is
**1 or 7**, and the same `emulators.md` §5.2 section says so in its next line ("Branch `J`
L = 1 or 7"). An implementer who wrote `lengths` from the phrase "7 only for `J X R G`" would
Instruction-Check every legal chained `J`, and tier 4 would not catch it because `cc01.cor`
uses `J` only at length 7. So tier 0 carries a **named positive test that a 1-character
chained `J` decodes as a legal form**, alongside the existing `R`/`X`-at-1-or-6 rejection.
(We assert the length groups, not a headline case count — the research states the groups and
gives no total.)

**Tier 3 — `insttest.cor` against `note1410.txt`.** The index block 02200-02288: an
unindexed `A 11111 22222` at 02200, then seven 11-character two-address instructions at
02211…02277 giving 14 indexed addresses, plus one 6-character one-address form at 02288 —
all fifteen index registers (`emulators.md` §9 step 3; §5.1 assigns this block to
`insttest.cor`, not `ilentest.cor`). Then the annotated arithmetic block **02300-02799**:
scan-phase latch traces including the chained pairs at 02368/02379 (add), 02473/02484
(subtract) and 02550/02561 (zero-and-add), and the zones-in-A-and-B cases at 02380 and
02485. Then the 16-case Move d-character matrix at **02800-02968**. `emulators.md` §5.1's
"02300-02968" is the **union** of the two — §5.3 places the 16 Move instructions at
02800-02968 — so the arithmetic sub-block ends where the Move matrix starts, and the two
fixtures never claim the same addresses. Stated identically in
[phase-1-cpu-core.md](phase-1-cpu-core.md) §5 Waves 3 and 5.

Two `note1410.txt` label errors are corrected in the fixtures with citations: `(M)` for
Multiply at 00500 is wrong — the op character is `@` (`emulators.md` §5.2); and the label at
02848 reads "Move D=T" but the image holds `D 10517 10519 -`, d = hyphen (B bit only) —
Jaeger's prose is right, his label is wrong (`emulators.md` §5.3).

Anything in `note1410.txt` we cannot confidently map onto a named latch goes verbatim into
`oracle/note1410/UNMAPPED.md` rather than being silently dropped. Silently discarding the
unmappable half is how oracle coverage quietly rots. *(grafted from oracle-first.)*

**Tier 4 — `cc01.cor` end to end, as a smoke test.** Load at IAR 02000, console attached,
run. PASS = console contains `CC01A` then `CC01 COMPLETE`, and the machine reaches the
`J 01972` at 08980 (01972 is blank in this image — the TC50 read-in entry the physical
Execute card targeted; stop there and call it pass, `emulators.md` §4.4). **All stops are
error stops**; any other halt address is a failure and the harness prints it.

**Revised 2026-08-30 after the first cc01 run.** That PASS rule is superseded; the original
text stays as written because it is what this document committed to. In force now: `CC01A`
typed, `CC01 COMPLETE` typed, then an **instruction check at 00322** — the relocated tape-read
hole, blank because no CE ever keyed the per-channel `M` into it. The `J 01972` at **08980** is
on no executed path; a full-image operand scan finds nothing in the image naming 08980, 08966,
08973 or 08959, and `emulators.md` §4.4 had read 08980 off the static image. See
`oracle/cc01a-halts.ts` and `docs/BUILD-LOG.md` ("cc01 halt archaeology"); the plan carries the
same note at §7 and §8. The baseline is `[observed]`, this emulator's own output, not
`[verified]` (`research/METHOD.md`) — which is why the tier still does not gate.

**This tier does not gate Phase 1.** Nobody has published a pass/fail transcript of
`cc01.cor` under any simulator; the repo ships the image with no expected-output file and
`note1410.txt` never mentions it (`emulators.md` §10, `open-questions.md` emulators row).
The first clean run *establishes* a baseline rather than confirming one. Until then a halt
address is a localisation pointer: drop to tiers 2 and 3, which *do* carry expected values,
fix, re-run. `oracle/cc01a-halts.ts` starts empty and grows one entry at a time as real
halts land there — the 38-page listing has no OCR layer and speculative transcription is the
wrong trade for a two-person project. *(incremental halt table grafted from oracle-first.)*

**Tier 5 — SimH `i7010` differential (optional, never gates CI).**
`set cpu 7010 80k nofloat nopri noprot`, inject with generated `d <addr> <val>` lines
(`sim_load` is a stub), never `boot` (that is the 7010 Load key). Compare halt addresses and
memory dumps, **not** console text. `oracle/simh-deviations.ts` is a written ledger, one
entry per known divergence with its citation, so a diff can never be resolved in the wrong
direction: *(grafted from oracle-first)*

```
glyph-6        6 of 64 render differently (radical, record mark, word separator,
               segment mark, delta, group mark)          — emulators.md §6
move-first-wm  SimH forces a WM on the first char of a MOVE-mode input record;
               contradicts 223-2692 p.58 and Figure 5    — io.md §3
dt-lengths     SimH accepts D/T at lengths 2, 7, 11      — opcodes.md §3.3
rx-chainable   SimH marks R/X as O_DBL (chainable)       — opcodes.md §1.1
chan-norec     SimH never applies the p.92 overlap downgrade — io.md §4
7010-channels  SimH decodes ? ! $ = in x1                — io.md §2
edit-op-e      SimH's OP_E has three deviations          — opcodes.md §7.6
```

**Later-phase oracles**, written before the code they judge:

- *Phase 2:* the round-trip property test (`decode(encode(c)) === c` for every punchable
  BCD code, and `.cards` text → `Card` → text unchanged); the Figure 5 load-mode vector
  through the real 1402; golden `.lst` files for the 1403 plus a per-d-character carriage
  test (`io.md` §7).
- *Phase 3:* C28-0326-2 Appendix C Exhibit IV — the one 1410 Autocoder listing with
  **published assembled output** (`software.md` §5; not a claim that no other listing
  survives). Exhibit IV is an **OS** listing while we build the standalone assembler (§5
  step 2), so we assert only the facts that are assembler-independent: `MLCB AR80,IDENT#5` →
  `D 00394 00306 L`; `EOF EQU *` = 00216 = 00209+7; and the ADDRS
  low-order-for-constants / high-order-for-instructions rule proven from the punched deck. It
  is an **assembly-only** oracle and there is no execute-the-Exhibit-IV-deck test: SEQNO 37
  assembles `BXPA /PCH/` → `Y /PCH/` at 00192 CT 7, and `Y` is the **Priority feature**
  (`opcodes.md` §9.1), which §12 and Phase-1 Wave 7 reject with `UnimplementedOp`. Then the
  loop that needs no external oracle at all: **assemble → object deck → 1402 load → core dump
  must equal assemble-direct-to-memory.** *(grafted from oracle-first.)*
- *Phase 4:* golden console log against the Figure 42 layout and the real 1410 OS job log
  (`console-and-physical.md` §2). The renderer and formatter already exist and are already
  tested from Phase 1; Phase 4 restyles.
- *Phase 5:* golden Autocoder source per spec-sheet input, then the Phase-3 assembler oracle
  applies transitively, plus the generated report as a printer golden.
- *Phase 6:* the Allen-Eggers validation checkpoints (`avco-and-reentry.md` §8) against a
  double-precision reference integration in TypeScript; the emulated fixed-point run must
  track it within the tolerance the scaling tables predict.

---

## 9. Resolved research conflicts

Every conflict the design review found, with the ruling and its citation.

| # | Conflict | Ruling |
|---|---|---|
| **C1** | A fetch loop that caps the word-mark scan at 12 characters. | **Wrong.** `N` accepts any length (`opcodes.md` §2, N row: "any (1, 2, 3, …)"), and the tape bootstrap works precisely because a word-marked `N` at 00011 runs to the first word mark inside the just-loaded record (`software.md` §10.4). The scan is bounded only by installed storage. `Fetched` carries `chars: Uint8Array`, and there is no `InstrLength` union type anywhere. |
| **C2** | One ISA table row per op character. | **Wrong shape.** `opcodes.md` §2 splits `A S ? ! / . J` into rows per length with different semantics, indicators, registers-after and timing. One `OpForm` per §2 row (§3, §4.5). A table with fewer rows than the source cannot be diffed against it. |
| **C3** | `J R X` listed under an "L=6 address-double" case. | **Wrong.** `opcodes.md` §1.1: `J` = 1 or 7; `R`/`X` = **7 only**, verified from three independent sources. `applyFields` is keyed on instruction *form*, and the length table rejects a 6-character `J`/`R`/`X` before it is reached (§4.4). |
| **C4** | Index block 02200-02288 attributed to `ilentest.cor`. | It is in **`insttest.cor`** (`emulators.md` §5.1). The 14+1 = 15-register decomposition is real and lives in `emulators.md` §9 step 3, not §5.2 (§8, tier 3). |
| **C5** | Register state after a taken branch: `opcodes.md` §2 prints `IAR = NSIB`, `architecture.md` §9 says IAR becomes branch address + 1. | **Both, and they are the same machine.** At the end of the branch's execute phase IAR holds NSIB and AAR holds BI; the *next* read-out takes the op-code address from AAR into STAR and reloads IAR (`opcodes.md` §1.3, `architecture.md` §9). We model it by setting `IAR = BI`, `AAR = BI`, `BAR = NSIB` and fetching from IAR — behaviourally identical for every program, since `G ccccc B` reads BAR. The equivalence is stated in a comment at the branch executor with both citations, and the print-out formatter is tested against the *real* log sample, not a fabricated one. |
| **C6** | Instruction implementation order claimed to follow CC01A's flow chart while reordering it. | Use the actual order from `emulators.md` §4.1 (CC01A p.006). "Type ident" is **fifth**, not eleventh, and full 64-d data moves are near the end. See `phase-1-cpu-core.md` §5. |
| **C7** | Store the C bit, or derive it? | **Store it** (§4.1). Deriving makes invalid parity unrepresentable, which kills the `.cor` byte-identity test, makes the `0x00`-fill normalisation a no-op, and leaves the console's bad-parity underline with no source (`emulators.md` §6, §5.1; `console-and-physical.md` §2). |
| **C8** | `.cor` load rule `(v & 0x3F) \| (v & 0x80)`. | That is the **SimH** conversion — "drop the parity bit" (`emulators.md` §6, §9 step 1). The native `.cor` byte is `WM C B A 8 4 2 1`, identical to our cell. We load `cell = v & 0xFF`. |
| **C9** | "Normalise `0x00` → `0x40` for insttest/ilentest" **and** "assert `.cor` load→dump byte-identity on all three images" — mutually exclusive. | Byte-identity is asserted for **`cc01.cor` only** (it fills with `0x40`, a valid character). For `insttest`/`ilentest` the assertion is identity *modulo the documented normalisation*. The loader also records the word width `W` so the dumper round-trips it — the committed files use W=4 while cube1us's own `DumpCore` writes W=2 (`emulators.md` §5.1, §6). |
| **C10** | Multiply and the zero-balance indicator. | Multiply **does** set zero balance; Divide sets neither zero balance nor arithmetic overflow (`opcodes.md` §8, `architecture.md` §10). Encoded in `indicators.json` (§4.6). |
| **C11** | Chaining legality — percent-type op codes `U M L F K G N` cannot be chained, nor can `R`/`X` (`opcodes.md` §1.2, 223-2589 p.50). | Carried as the `chainable` column, but stated honestly: every one of those ops is already barred from length 1 by the §1.1 length table, so it adds no gate. Its job is a tier-0 redundancy assertion that the two columns agree — written as `chainable === false && opChar !== 'N' ⇒ 1 ∉ lengths`, because `N` is percent-type *and* legal at length 1 (`opcodes.md` §2 N row, "any (1, 2, 3, …)"), so the rule without the exclusion is false on our own data and the gating test could not pass (§4.5). |
| **C12** | Op `U` length: A22-0530-1 Figure 1 prints 2; A22-0526-3 p.85 and 223-2589 p.53 say 5. | **5** (`U x1x2x3 d`). The `2` is a printing error in the priority bulletin — two independent OCR passes read it, so it is not a scanning artifact (`open-questions.md`, opcodes row). Out of scope in this configuration regardless; the row is `implemented: false, feature: 'tape'`. |
| **C13** | Move Characters and Edit: trap it, or implement it? | **Implement from `opcodes.md` §7**, which is `[verified]` and reconstructs the registers-after rule, the eight-case BAR table, the 46-step Figure 34 trace and the two skid cycles. `open-questions.md`'s trap fallback was superseded in place by its own parenthetical: "use that, then confirm against pp. 31-35." The confirmation read is a named open item, not a gate (§4.9). |
| **C14** | Does `cc01.cor` gate Phase 1? | **No.** It has never been observed to run anywhere (`emulators.md` §10, `open-questions.md` emulators row). Tiers 0-3 gate; tier 4 is a smoke test whose first clean pass establishes a baseline (§8). |
| **C15** | MCS (`Z`) scan direction — `[likely]`, forced only by the printed `AAR = A − LA`. | Right-to-left copy from the units position, then a left-to-right suppression pass, leaving `BAR = B + 1` (`open-questions.md`, opcodes row; `opcodes.md` §5.3, §10). Coded behind a named constant with an `// OPEN:` comment. |
| **C16** | MCE address wrap during the `−1` BAR modification, and the skid cycles that touch bytes outside the declared B field. | Undocumented in every manual. We **trap** rather than wrap — `open-questions.md` offers "follow cube1us's wrap-with-latch reading, or trap the case if the emulator does not model wrap", and we do not model wrap. Named constant, `// OPEN:` comment. The skid at `B_high − 1` is not a wrap and is implemented, preserving the word mark it finds (`opcodes.md` §7.5). |
| **C17** | Is `$` a legal d-character on a **card** read? `software.md` §4's d-modifier table lists `$` under "`M`/`L` tape **or card** read", §10.2 keys it into the card bootstrap `AL%1000012$R`, and §10.4 argues it is load-bearing there. `io.md` §3 said the opposite as `[verified]`: "Read a Card allows only d-character `R` (A22-0526-3 p.62). The `$`/`X` d-modifier that suppresses GMWM termination is a **tape** facility." | **Ruled for `software.md` (2026-08-30, eyes-on read; research files corrected; `open-questions.md` #13): `$` is legal on a card read `[verified]` and is decoded at channel level, before device dispatch.** Settling evidence: C28-0351-5 p.8 Table II ("Not using 7010 Load Key", step 2) prescribes `ALcde00012$r` with `$` as a fixed literal while the device selector `d` varies (1 = card reader, B = tape), and step 1 puts the Bootstrap 1 card first in a card Standard Input Unit — IBM itself keying `$` on a 1402 read. A22-0526-3 names the end-of-core class device-independently on pp.9 and 92 (p.86 is the tape instruction page, not a definition); p.62's `R`-only d-column is silence, not a prohibition, and the PoO defines no I/O d-character validity check anywhere. SimH agrees structurally (`CHAN_NOREC` set in `chan_cmd()`, all GMWM tests guarded on it). What `$` *does* on a 1402 is `[likely]`, derived from p.86: suppress the GM-WM termination test, store all 80 buffer columns, set no WLR — the 80-column buffer, not core, bounds the transfer. Note the corrected rationale: an `R` read *does* stop at 80 columns; the bootstrap needs `$` to avoid a wrong-length-record check and early truncation on a load-mode-created GMWM, not because `R` "has no terminator". **Consequence for the code:** `Channel.decodeD()` carries this ruling and the C28-0351-5 citation in a comment; `decodeD` is the one place that moves if it is ever overturned. |
| **R1** | The RPG specification-sheet card layout. | **Do not encode.** `software.md` §12.5 documents only that RPG is a preprocessor emitting Autocoder-format source; the sheets (X24-1336..X24-1339) and manual (C28-1443) are named in the bibliography and are not on bitsavers. An H/F/I/C/O form-type column is later-RPG (RPG II) knowledge and encoding it would violate the `[unverified] — do not encode` rule in `research/README.md`. We freeze only the **output** boundary (`SourceCard[]`) and schedule a research pass. See §11. |
| **UI1** | "Every phase must end with something demonstrable in a browser" — attributed to `CLAUDE.md`, which does not say it. | `CLAUDE.md` says phases are gated and need approval; `PROJECT-BRIEF.md` says Phase 1 is "CPU core + memory + instruction tests (no UI)". We add a ~310-line unstyled internals page in Phase 1 anyway, because `DECISIONS.md` 2026-08-30 makes the internals view a settled deliverable and Phase 4 reuses every line of it. **This is a deliberate deviation from the brief and it is Zarathustrum's to accept.** See §11. |

---

## 10. Dependencies

Three, and nothing else.

| Dependency | Why |
|---|---|
| **TypeScript** (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | Settled in `DECISIONS.md`. The strictness flags matter here specifically: this codebase is full of `Uint8Array` indexing and optional register fields. |
| **Vite** | Build + dev server for the static site. From the brief; the deliverable is a static local site. |
| **Vitest** | Shares Vite's transform, so one config and one toolchain. The alternative is a second build pipeline or a hand-rolled runner, either of which costs more than it saves. |

Explicitly **no framework in any phase**. The internals panel is vanilla DOM against a grid.
The period UI in Phase 4 is period art — hand-drawn SVG/CSS and a `<pre>` log — which is
exactly the case a component framework helps least. If Phase 4 turns out to need one, that
is a decision made then, with a concrete reason, not now.

No monorepo tooling. Path aliases (`@core/*`, `@formats/*`) do the job; the alternative buys
ceremony.

**Oracle licensing.** `cc01.cor`, `insttest.cor`, `ilentest.cor` and `note1410.txt` live in
a GPL-3.0-or-later repository (`emulators.md` §3). We do **not** vendor them.
`tools/fetch-oracles.ts` downloads them into a gitignored `oracles/` directory; the tiers
that need them skip with a clear message when it is absent. Every table in `src/` and
`oracle/` is transcribed from A22-0526-3 and the CE manuals via the research files, never
copied from Jaeger or SimH. `cube1us/IBM1410FPGA`'s license is unclear (author's site says
GPL, repo has no LICENSE file) — read for understanding, derive nothing.

**Correction (2026-10-02).** For `note1410.txt`, "we do not vendor them" was not true from Phase 1
(`394b22e`, `638989e`) until the release preparation: `oracle/note1410/arith.ts`, `move.ts`
and `UNMAPPED.md` quoted 304 of its 356 lines of twenty characters or more verbatim, as test
data. They now cite it by line number into the fetched copy (`oracle/note1410/ref.ts`) and
keep only the facts, so the project can be MIT; `test/note1410-not-vendored.test.ts` holds
the line. `NOTICE` carries the attribution.

---

## 11. Open — genuinely needs Zarathustrum

1. **Phase 1 ships a browser page.** `PROJECT-BRIEF.md` says Phase 1 is "no UI";
   `DECISIONS.md` 2026-08-30 makes the internals view settled. We propose ~310 unstyled
   lines in Phase 1 that Phase 4 reuses as a tab, so the phase ends on something a period reader can
   watch. Accept the deviation, or hold Phase 1 to the terminal harness?
2. **The 1410 RPG spec-sheet layout — RESOLVED 2026-08-30 by option (a).** A targeted
   research pass (`docs/research/rpg-sources.md`) established that the four sheet forms
   X24-1336..X24-1339 are titled "1401 - 1410 RPG Input / Data / Calculation / Format
   Specification Sheet" in the 1410 publications index N20-1410-27, so J24-0215-2's column
   layout `[verified]` *is* the 1410 card-RPG layout — no proxy label needed. C28-1443 itself
   is not digitised, but the 1410 RPG processor's object code survives on the bitsavers
   PR-108 tape image (phases RPG1..RPG13, `RG` control card, 1410 IOCS emission), which is the
   oracle for Phase 5. Only the >999 record-position widening stays `[unverified]`; cap at 999
   with an explicit error.
3. **The phase order in §7 inverts the brief's, and that should be Zarathustrum's call too.**
   `CLAUDE.md` gives "CPU core → cards/reader/printer → Autocoder assembler → web UI →
   reentry showcase → optional RPG/FORTRAN/tape", and `PROJECT-BRIEF.md` schedules Phase 5
   reentry, Phase 6 optional RPG. §7 puts RPG at 5 and reentry at 6, on the strength of
   `DECISIONS.md` 2026-08-30 — which tags "an RPG report may be the first showcase" as
   `[flexible]`, not settled. Flagging it here for the same reason as item 1: this document
   flags its deviations rather than making them quietly. **The dependency is now satisfied:** item 2
   resolved to (a), so RPG at Phase 5 and reentry at Phase 6 stands unless Zarathustrum flips it; a
   flip swaps the two phases and nothing else in the plan moves — Phase 6 needs no new
   machinery beyond an Autocoder program. **RESOLVED 2026-08-30: Zarathustrum set the build order to
   3 → 5 → 4 → 6 ("revise the plan") — RPG builds before the period UI, reentry closes on the
   finished UI; numbering unchanged. Recorded in DECISIONS.md and §7's build-order line.**

---

## 12. What we deliberately do not build

- **No cycle-accurate timing claims.** A µs counter from the published formulas, base
  machine at 4.5 µs, and never the Accelerator appendix at A22-0526-3 pp.96-98 — mixing the
  two sets is a silent error (`opcodes.md` §1.5).
- **No 1401 compatibility mode.** Settled. The 3-character-address decode and 16K mapping are
  undocumented anyway (`architecture.md` §13, `open-questions.md`).
- **No tape, no disk, no channel 2, no processing overlap, no Priority feature.** Their op
  codes (`U`, `Y`, `2`, `4`, `X`) decode and are rejected with a citation. An overlap x1
  character (`@`/`*`) raises an unsupported-feature stop, matching "an overlapped instruction
  on a machine without the feature stops the system" (`io.md` §4).
- **No storage protection.** The 1410 has none in any edition (`architecture.md` §1).
- **No abstraction over machine models.** One machine: 1411 + 1414-3 + 1402 + 1403-2 + 1415,
  one channel.
- **No plugin architecture, no event bus, no dependency-injection container.** Devices go in
  an array indexed by the x2 character.
- **No column binary, no 51-column read feed, no MICR, no 7010 ops.**
- **No copied SimH or cube1us code.** Both are behavioural second opinions with documented
  deviations; tables come from the manuals via the research files, and the deviation ledger
  keeps a diff from being resolved the wrong way.
- **No speculative types for phases we have not designed.** `ObjectRecord`, `Card`,
  `PrintEvent` and `ConsoleLine` are frozen in Phase 1 because each has a documented format
  *and* a Phase-2 consumer. `SourceCard` and `ListingLine` have a documented format but no
  Phase-2 consumer, so they move to Phase 3 with the assembler that produces them.
  `RpgSpecCard` has neither.
