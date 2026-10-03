# Phase 1 — CPU core

Companion to [architecture.md](architecture.md). Every hardware behaviour cites a file in
`docs/research/`; every `[unverified]` item Phase 1 touches is listed in §10 with the
fallback chosen.

---

## The seven bullets

1. **Build the CPU core as a DOM-free library whose per-op semantics are a data table that
   mirrors `opcodes.md` §2 row for row** — same columns, same order, each row carrying its
   own citation and its registers-after in the manual's Figure 8 notation (`A-LW`, `B-1`,
   `NSIB`). Open the manual on the left and `isa/table.ts` on the right and diff by eye.
2. **Fetch is scan-to-the-next-word-mark with no length cap** (`N` is legal at any length —
   the tape bootstrap depends on it); the op-code length table only *validates* the result.
   `step({ execute: false })` is a first-class mode, so the decoder is oracle-tested against
   `ilentest.cor` before a single instruction executes.
3. **Implement instructions in CC01A's own flow-chart order**, which puts the console `%T0`
   write and Channel 1 **fifth** — the diagnostic types its ident before most of the
   arithmetic, so console I/O is CPU work here, not peripheral work.
4. **In scope:** storage, addressing + indexing, every op CC01A's flow chart reaches, the
   **seven** indicator latches (`opcodes.md` §8 — three arithmetic, four compare; "six" in
   this project means the *channel* status set), Channel 1, the 1415 write path, `.cor`
   load/dump, the stop print-out formatter, a Node harness, and a plain browser internals page
   carrying the real console controls. `@ % T Z E` ship as **complete table rows** with
   `implemented: false`, so `isa/table.ts` still diffs row-for-row against `opcodes.md` §2 and
   dispatching one raises `UnimplementedOp` with its citation; their executors are **Phase 1b**.
   **Out:** cards, 1402, 1403, assembler, RPG, tape, disk, channel 2, overlap, priority,
   1401 mode.
5. **Gate on tiers 0-3** — transcribed research tables, manual worked examples, `ilentest`
   decode-only, `insttest` latch traces and the Move matrix. **`cc01.cor` is a smoke test,
   not a gate**: it has never been observed to run under any simulator, so the first clean
   pass *establishes* a baseline rather than confirming one.
6. **Two demos, driven by real 1410 controls.** `npm run cc01` prints a period-correct
   Selectric transcript ending `CC01A` / `CC01 COMPLETE`. In the browser: MODE = ADDRESS SET
   to key IAR 02000, then ALTER to key a three-instruction add by hand, then MODE = I/E CYCLE
   to half-cycle it and watch the B field fill **right to left from the units digit** until
   the word mark stops it. That needs storage-cycle granularity, so the machine façade exposes
   `stepCycle()` as well as `step()`; there is **no SINGLE STEP key on a 1410**.
7. **~3,700 source + ~1,000 oracle-fixture + ~1,700 test lines, three dependencies**
   (TypeScript, Vite, Vitest), zero framework, plus `PHASE-1-NOTES.md` — a named deliverable
   in the file list — recording which `[unverified]` items were hit and which fallback was
   taken.

---

## 1. Scope

**In.**

- Storage: 10K/20K/40K/60K/80K, one byte per position — `WM C B A 8 4 2 1`, odd parity over
  `BA8421 + WM`, so setting a word mark flips C (`architecture.md` §2, `charset.md` §1).
- Reserved low core: index registers IR1-IR15 at 00025-00099 as ordinary storage; IAR =
  00001 after program/computer reset (`architecture.md` §1).
- Addressing: 5-character addresses, zone-bit index tags over the tens and hundreds
  positions with the documented weights, algebraic index addition with the sign from the
  index register's own units zone, and every documented address-check branch
  (`architecture.md` §4-5).
- Instruction read-out: length by scan to the next word mark, then length validity per op;
  an illegal length is an Instruction Check with no execution (`architecture.md` §7,
  `opcodes.md` §1.1).
- Chaining, address-doubling, and the op-modifier blanking trap on 11-character
  instructions (`opcodes.md` §1.2, §1.4).
- All base-machine op **table rows**: `A S ? ! @ % Z E C T D B W V J R G , ⌑ / . N M L`, each
  with its full declarative columns (lengths, addressDouble, chainable, regs, timing, cite).
  **Executors** in Phase 1 for everything on CC01A's flow chart: `A S C D B W V J R G , ⌑ /
  . N M L`. `@` Multiply, `%` Divide, `T` Table Lookup, `Z` MCS and `E` MCE carry
  `implemented: false` and are promoted in **Phase 1b** — see §5 Wave 6.
- The **seven** indicator latches with their documented set/reset rules — arithmetic overflow,
  zero balance, divide overflow, and compare high / equal / low / unequal as four separately
  addressable members — including computer reset leaving **low** and **unequal** ON, and the
  rule that once *equal* is turned off during an operation it cannot be turned back on
  (`opcodes.md` §8, §5.2). Not seven-ish: `IndicatorName` has exactly these seven names and no
  `'channel'` member, because channel status is the separate six-bit `ChannelStatus`. The
  carriage channel-9 / channel-12 indicators arrive with the 1403 in Phase 2, so Wave 1's
  one-address d-table is complete minus `BC9`/`BCV`.
- Channel 1: the nine-step sequence, the per-channel interlock, the six status indicators,
  the `R (I) d` release rules including the group-mark form (`io.md` §5). CLR is not a seventh
  status field: 223-2692 p.42 requires WLR and CLR to agree at the end of every I/O operation
  or a programmed BWL test mismatches its branch and no-branch latches and instruction-checks,
  so `channel.ts` holds `CLR === !wrongLengthRecord` by construction — a derived accessor and
  one assertion, rather than a second latch that can drift. Cheaper than deferring it, and it
  means a Phase-2 1402 read cannot inherit the omission silently (`io.md` §5).
- The 1415 console **write** path — `M %T0 bbbbb W` (WCP) and `L %T0 bbbbb W` (WCPW). Not
  scope creep: `cc01.cor`'s only five I/O instructions all target `%T0` (`emulators.md`
  §4.3), so the primary oracle cannot run without it. WCPW is a **load-mode write**, so the
  channel's load-mode *output* rule ships here too: a core word mark becomes a word separator
  one position **ahead** of its character, a core separator becomes two, and the record
  lengthens (`opcodes.md` §2 `L` row / A22-0526-3 pp.40-41; `io.md` §3 p.41). The 8-bit 1415
  skips the translation and renders the WM bit as an inverted circumflex (`io.md` §8,
  Figure 44); the 7-bit devices get the translated record in Phase 2 and render the separator
  their own way (1403: blank ahead — `io.md` §7). See [architecture.md](architecture.md) B9
  and §4.10.
- `Console1415.read` as a documented three-line stub returning `null` with `noTransfer: true`.
  Two of `cc01.cor`'s five I/O instructions are console *reads* — `M %T0 01887 R` at 01852 and
  `L %T0 00000 R` at 01883, both in the loader/monitor block at 01800-01912 (`emulators.md`
  §4.3). The executed path from 02000 should never reach them, but `Device.read` is optional
  in the interface and an absent method is undefined behaviour. `null` + `noTransfer` is not a
  placeholder: it is what the machine actually does when no inquiry request is pending
  (`io.md` §8 console status table). Real inquiry, with the keyboard, is Phase 2.
- `.cor` load and dump, with the documented per-file fill normalisation.
- Cycle counter in µs, base machine, 4.5 µs core cycle, formulas from the per-op timing
  column — explicitly **not** the Accelerator appendix at A22-0526-3 pp.96-98
  (`opcodes.md` §1.5).
- The stop print-out formatter (`console-and-physical.md` §2).
- A three-level line-oriented tracer, a `run-cor` CLI, and a `trace-diff` CLI.
- A deliberately unstyled browser internals page carrying the **real** console controls: LOAD,
  START, STOP, PROGRAM RESET, COMPUTER RESET, plus MODE = **ADDRESS SET** (5-digit entry into
  the IAR, print-out ID `B`), **ALTER** (display-then-alter, ends at a word mark), and
  **I/E CYCLE** (half cycle, print-out ID `C`). These are not decoration: COMPUTER RESET forces
  IAR → 00001 and `cc01.cor`'s entry point is 02000, so without ADDRESS SET the demo runs from
  the wrong address; and without ALTER there is no mechanism in Phase 1 by which any program
  other than a downloaded `.cor` reaches storage (`console-and-physical.md` §2, §3, §4).
- `stepCycle()` on the machine façade — a storage-cycle boundary, not just an instruction
  boundary, so MODE = I/E CYCLE is real and the B field can be watched filling one position at
  a time. The add pass is already structured as units / body / extension scan phases for the
  latch tracer (§6.2), so this exposes a boundary that already exists rather than inventing one.

**Out.** Cards, 1402, 1403, the assembler, RPG, tape, disk, channel 2, processing overlap,
the Priority feature, 1401 compatibility mode, console read/**inquiry** — the keyboard dialogue
is Phase 2; the `read` entry point itself is stubbed as above — MICR, column binary, the
51-column read feed. Also out of *Phase 1* though present in the table: the executors for
`@ % T Z E` (Phase 1b). Those op codes and x-control characters decode and are
**rejected with their citation** — `Y` (priority), `P`/`Q` (MICR), `U` (tape), `2`/`4`
(channel 2), `$`/`=` (7010), `?`/`!` in x1 and `3`/`1` as branch ops (7010 channels 3/4 —
`io.md` §2, `software.md` §10.3), and an overlap x1 (`@`/`*`) raising an unsupported-feature
stop (`io.md` §4).

**Deviation from `PROJECT-BRIEF.md`, flagged for Zarathustrum.** The brief says Phase 1 is "CPU core
+ memory + instruction tests (no UI)". We add a ~310-line unstyled internals page (~250 panel + ~60 of MODE/key controls), because
`DECISIONS.md` 2026-08-30 makes the internals view a settled deliverable and Phase 4 reuses
every line of it as a tab. Zarathustrum's call; the terminal harness alone is a valid Phase 1 if he
prefers it.

---

## 2. File list

```
package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html          —

src/core/
  types.ts          every boundary type in one place, re-exported                ~160
  bcd.ts            64-code table: bits, octal, C, Hollerith, collate rank, glyphs ~180
  storage.ts        Uint8Array; bcd/read/wm/setChar/setWm/writeWhole/pokeRaw/dump  ~130
  address.ts        5-char decode, 64-entry digit table, index tags, validity      ~170
  registers.ts      IAR AAR BAR CAR DAR EAR FAR, Op, OpMod; reset semantics         ~90
  indicators.ts     SEVEN latches (3 arith + 4 compare), named after the rules     ~120
  checks.ts         AddressCheck / InstructionCheck / ProcessCheck / StopReason     ~50
  decode.ts         scan, form classification, length validity, chaining/doubling  ~220
  cpu.ts            step({execute}), stepCycle(), run(n), dispatch, cycles        ~320
  cycles.ts         T formulas + Figure 7 E matrix, INDEX_US, I/O term, consts    ~130
  alu.ts            true/complement add, recomplement, ZA/ZS; cycle generator     ~260
                    (multiply + divide are Phase 1b, ~170 more)
  compare.ts        collate compare, terminate on either WM, short-A HIGH rule      ~70
  move.ts           op D — 64 d-characters via d&0x07 / d&0x38, Figure 20 effects  ~170
  mcs.ts            op Z — R-to-L copy then L-to-R suppression      (Phase 1b)     ~90
  tablelookup.ts    op T — CAR reload per search cycle              (Phase 1b)    ~110
  edit.ts           op E — three scans, two skid cycles, 8 BAR cases (Phase 1b)   ~300
  isa/table.ts      THE DATA TABLE — one OpForm per opcodes.md §2 row              ~500
                    ALL rows land in Wave 0, declarative columns complete;
                    exec starts as a throwing stub and fills in per wave
  isa/regs.ts       the 'A-LW' / 'B-1' / 'NSIB' Figure-8 notation evaluator          ~70
  isa/dmods.ts      J / R / X / V / carriage / x-control d-character tables        ~190
  isa/exec/         arith · branch · wordmark · move · io · control                ~700
  channel.ts        nine-step sequence, interlock, status, move/load translation   ~260
  devices/device.ts the Device interface                                            ~50
  devices/console1415.ts  1415 console printer, 8-bit, %T0, read() stub           ~135
  printout.ts       S / C / E / B / # / D / A / I / R console line formatter       ~120
  trace.ts          Tracer interface, three levels, text formatters                ~140
  machine.ts        façade: build, load, reset, step, run, snapshot                ~160

src/formats/cor.ts  .cor load/dump, width recording, fill normalisation             ~90

src/ui/internals/   panel · coreView · registerView · main                         ~250
                    controls.ts  keys + MODE ADDRESS SET / ALTER / I/E CYCLE      ~60

tools/
  fetch-oracles.ts  pinned repo + commit SHA, per-file sha256, verify or fail      ~90
  run-cor.ts        CLI: load, run, print the Selectric transcript and the halt    ~130
  trace-diff.ts     CLI: line diff a produced trace against an expected trace       ~70

oracle/             transcribed fixtures + the deviation ledger + UNMAPPED.md    ~1,000
                    (a 64-row d-char matrix, a 64-code collate table with
                    round-trip data, lengths/timing/indicator/sign/J/V fixtures
                    and the note1410 cycle-level latch traces — the earlier
                    ~400 did not cover what §8 actually specifies)
test/               one file per core module + the oracle tiers                  ~1,700
PHASE-1-NOTES.md    which [unverified] items were hit, which fallback was taken     —
```

Roughly **3,700 lines of source, 1,000 of oracle fixtures and 1,700 of tests.** That is a real
Phase 1, not a spike — and it is ~800 lines smaller than the earlier draft because the five ops
CC01A never reaches moved to Phase 1b and `tools/simh-diff.ts` is deferred (§6.3), while
`stepCycle()`, the MODE controls and an honest oracle budget were added.

---

## 3. Memory, address and instruction types

```ts
// ─── cell ──────────────────────────────────────────────────────────────────
// architecture.md §2; charset.md §1; emulators.md §6 (this IS the .cor layout)
export type Cell = number;                       // 0x00..0xFF
export const WM = 0x80, C = 0x40, ZB = 0x20, ZA = 0x10, BCD6 = 0x3f;
export type Addr = number;

export class Storage {
  readonly size: 10_000 | 20_000 | 40_000 | 60_000 | 80_000;
  private readonly m: Uint8Array;

  bcd(a: Addr): number;                          // BA8421 only — what Compare/BCE see
  read(a: Addr): Cell;
  wm(a: Addr): boolean;
  setChar(a: Addr, bcd6: number, wm: boolean): void;  // recomputes odd parity over BA8421+WM
  setWm(a: Addr, on: boolean): void;                  // flips C — architecture.md §2
  writeWhole(a: Addr, cell: Cell): void;              // LOAD MODE ONLY — io.md §3
  pokeRaw(a: Addr, cell: Cell): void;                 // LOADER ONLY — preserves C verbatim
  clearToHundreds(from: Addr): Addr;                  // op `/`; returns bbb00-1 for BAR
  dump(): Uint8Array;
}
```

Three writers, three meanings, one seam each. `setChar` is normal execution. `writeWhole` is
load mode, where BCD, WM and C all come from the channel register and the old core byte
contributes nothing (`io.md` §3 mechanism, 223-2692 p.11 Case 2). `pokeRaw` is the `.cor`
loader and nothing else, which is what keeps the byte-identity test honest and makes the
`0x00`-fill normalisation a visible step rather than an invisible non-issue.

```ts
// ─── address ───────────────────────────────────────────────────────────────
// architecture.md §4-5. Zones legal ONLY over tens/hundreds, where they tag one of
// 15 index registers at 00020+5n .. 00024+5n.
export interface DecodedAddress {
  value: number;                                 // 00000..79999, zones stripped
  tag: 0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15;    // A-tens 1, B-tens 2, A-hund 4, B-hund 8
  valid: boolean;
}
export type AddressUse = 'increment' | 'decrement';

export declare function decodeAddress(s: Storage, at: Addr): DecodedAddress;
export declare function resolveIndex(s: Storage, d: DecodedAddress): Addr;  // may AddressCheck
export declare function addressDigit(cell: Cell): number | null;            // 64-entry TABLE
```

`addressDigit` is a hand-written 64-entry table, not a derived rule. `architecture.md` §4
gives two overlapping statements — "every position must have a numeric total of 0-9" and
"legal tens/hundreds characters: numerals, letters, and `/ ? ! ‡`", with `&`, `$`, `#`
explicitly causing an address check. They do not reduce to one arithmetic rule: `&` has
numeric bits 0 yet is illegal, and `0` is coded 8-2 yet means zero.

```ts
// ─── instruction ───────────────────────────────────────────────────────────
// architecture.md §7. NOTE: no `length: 1|2|5|6|7|10|11|12` union anywhere — `N` is
// legal at ANY length (opcodes.md §2 N row; software.md §10.4).
export interface Fetched {
  opAddr: Addr;
  chars: Uint8Array;                             // op char first, no interior word mark
  nsi: Addr;                                     // address of the NEXT word mark
}
export type Form = 'O'|'Od'|'Oxxxd'|'Oa'|'Oad'|'Oxxxbd'|'Oab'|'Oabd'|'Olong';

export interface XControl { channel: 1|2; overlap: boolean; deviceType: string; unit: string }
```

The `OpEntry` / `OpForm` types are in [architecture.md §3](architecture.md); they are the
same file (`src/core/types.ts`).

---

## 4. Fetch, decode, execute

### 4.1 The loop

```ts
step({ execute = true } = {}): StopReason | undefined {
  const opAddr = IAR;
  if (!storage.wm(opAddr)) throw new InstructionCheck('no word mark on op code', opAddr);

  const chars: number[] = [storage.read(opAddr)];
  let p = opAddr + 1;
  while (!storage.wm(checkAddr(p))) { chars.push(storage.read(p)); p++; }   // no cap
  IAR = p;                                       // = NSI

  const entry = OPS[chars[0] & BCD6];
  if (!entry)             throw new InstructionCheck('undefined op code', opAddr);
  if (!entry.implemented) throw new UnimplementedOp(entry.opChar, entry.feature, entry.cite);

  const form = selectForm(entry, chars.length);  // ← the ONLY use of the length table
  if (!form) throw new InstructionCheck('invalid instruction length', opAddr);

  applyFields(entry, form, chars);               // chaining, address-double, opMod blanking
  if (!execute) return;                          // ← decode-only mode

  form.exec(ctx);
  applyRegisters(form, ctx);                     // regs / regsNotTaken, Figure 8 notation
  microseconds += form.timing(ctx);
}
```

**The scan-to-word-mark length rule.** Read-out starts at the op code, which must carry a
word mark, and continues character by character until a word mark is sensed — that word mark
belongs to the *next* instruction's op code, and the instruction itself must contain no
interior word marks (`architecture.md` §7, A22-0526-3 p.11). The resulting length is then
validity-checked against the op code; an illegal length lights Instruction Check and nothing
executes.

The scan has **no length cap**. `N` accepts any length (`opcodes.md` §2 N row: "any (1, 2,
3, …)"), and that is not a curiosity — the tape bootstrap works because a word-marked `N` at
00011 runs to the first word mark inside the just-loaded record, giving a self-locating
entry point (`software.md` §10.4). The scan's only bound is the end of installed storage,
which raises an address check.

**Chaining.** Omitted addresses reuse whatever the previous instruction left in AAR/BAR.
The manual's own worked example is a Phase-1 test: `A 05985 06985` with a 5-character A
field and a 6-character B field leaves AAR = 05980 and BAR = 06979, and the following
1-character `S` "causes the data at location 05980 to be subtracted from the data at 06979"
— two distinct fields, never the one-field form (`opcodes.md` §1.2).

`applyFields` is keyed on **form**, not on a raw length number:

| Form | Chars | Field assignment |
|---|---|---|
| `O` | 1 | AAR/BAR/OpMod untouched. D cycle copies BAR→DAR. Legal only for `chainable` ops (`N` excepted — see §4.5 of [architecture.md](architecture.md)). |
| `O d` | 2 | `F 2 K 4` (+ `P Q` with MICR). OpMod ← d. No addresses. |
| `O xxx d` | 5 | `U` only. x-control decoded; no B-address. |
| `O aaaaa` | 6 | **address-double** (`A S ? ! , ⌑ /`): AAR = BAR = CAR = DAR ← A — the field operates on itself. **Not** address-double (`@ % C T D B W V Z E .`): AAR = CAR ← A, **BAR chained**, D cycle sets DAR ← BAR. **OpMod ← unchanged — the form supplies no d-character and reuses the last previous operation modifier** (`architecture.md` §8 bullet 2, A22-0526-3 pp.12, 25, 30, 38; `opcodes.md` §2 rows `D`, `B`, `V`: "Length 6 chains the B-address and reuses the previous modifier"). |
| `O aaaaa d` | 7 | `J R X G` (+ `Y`). AAR = CAR ← I/C-address; OpMod ← d. |
| `O xxx bbbbb d` | 10 | `M L`. x-control decoded at channel level; BAR ← B; OpMod ← d. |
| `O aaaaa bbbbb` | 11 | AAR = CAR ← A, BAR = DAR ← B, **and the op-modifier register is BLANKED**. |
| `O aaaaa bbbbb d` | 12 | as 11, OpMod ← d. |

The address-double set is `A S ? ! , ⌑ / J R X`, verbatim from `opcodes.md` §1.4 (CE
Handbook ALD grouping objectives, cross-checked against SimH's `O_DBL` flags). It **excludes
`@` and `%`** — the opposite of the 1401, which is the compatibility trap the same section
calls out. `J R X` are in the set but have no 6-character form (`J` = 1 or 7; `R`/`X` = 7
only, `opcodes.md` §1.1), so the length table rejects the combination before `applyFields`
sees it.

**No `E` term in this table.** The earlier draft annotated two rows "(E=1)". `E` is a *timing*
term, not a register fact, and Figure 7 defines it per (op, length): 2 on a single-character
multiply or divide, 1 on a single-character add / subtract / ZA / ZS / table lookup or a
6-character multiply or divide, 0 otherwise (`opcodes.md` §1.5). So "(E=1)" was wrong for
`@`/`%` at length 1 (E=2) and wrong for `C D B W V Z E .` at both 1 and 6 (E=0). The D/C-cycle
note stays here because it is a register fact; `E` lives only in `cycles.ts`, keyed on
(op, length) from Figure 7, and is covered by the tier-0 `timing.json` fixture (§7).

**The two traps are symmetrical, and both live in `applyFields`.** An 11-character
two-address instruction **blanks** the op-modifier register; a 6-character form **reuses** it.
Tier 1 asserts both directions: an 11-character `A` followed by a chained `D aaaaa` sees a
**blank** d, while a `D aaaaa bbbbb d` followed by a chained `D aaaaa` sees **that same `d`**.

**Op-modifier blanking** is one clearly-commented line citing A22-0526-3 p.12: "if a
two-address instruction does not require a d-character (11-position instruction), the
op-modifier register is blanked; thus, any chained instructions then directly following will
be automatically assigned a blank d-character."

**Taken branches.** `opcodes.md` §2 prints `IAR = NSIB` for a taken branch while
`architecture.md` §9 says IAR becomes branch address + 1. Both describe the same machine at
different instants: at the end of the branch's execute phase IAR holds NSIB and AAR holds
BI, and the *next* read-out takes the op-code address from AAR into STAR and reloads IAR
(`opcodes.md` §1.3). We model it by setting `IAR = BI`, `AAR = BI`, `BAR = NSIB` and
fetching from IAR — behaviourally identical for every program, since the subroutine-return
mechanism `G ccccc B` reads BAR. The equivalence is a commented note at the branch executor
with both citations.

### 4.2 The per-op register-effects table, as data

One `OpForm` per row of `opcodes.md` §2, with `regs` in the manual's own Figure 8 notation
over the symbol set `{ A, B, Ap, Bp, LA, LB, LW, NSI, NSIB, BI }` (`opcodes.md` §1.3),
evaluated by a ~30-line interpreter in `isa/regs.ts`. Representative rows, transcribed
verbatim:

| Op / form | `regs` (IAR / AAR / BAR) | `regsNotTaken` | Cite |
|---|---|---|---|
| `A` L=1,11 | `NSI / A-LW / B-LB` | — | §2, p.17 |
| `A` L=6 | `NSI / A-LA / A-LA` | — | §2, p.17-18 |
| `?` `!` L=1,11 | `NSI / A-LW / B-LB` | — | §2, p.18 |
| `@` | `NSI / A-LA / B-LB` | — | §2, p.19-20 |
| `%` | `NSI / A-LA / special` (tens position of the quotient) | — | §2, p.20-21 |
| `C` | `NSI / A-LW / B-LW` | — | §2, p.28 |
| `T` | `NSI / A-LW / special` (rightmost function char) | — | §2, p.29-30 |
| `Z` | `NSI / A-LA / B+1` | — | §2, p.27-28 |
| `E` | `NSI / A-LA / special` (eight cases, §7.3) | — | §7.3 |
| `,` `⌑` 2-addr (L=11) | `NSI / A-1 / B-1` | — | §2, p.22 |
| `,` `⌑` 1-addr (L=6) | `NSI / A-1 / A-1` | — | §2, p.22 |
| `,` `⌑` chained (L=1) | `NSI / Ap-1 / Bp-1` | — | §2, p.22 |
| `/` L=1,6 | `NSI / B / special` (`bbb00`−1) | — | §2, p.23 |
| `/` L=11 | `NSIB / BI / NSIB` | — | §2, p.23 |
| `J` | `NSIB / BI / NSIB` | `NSI / BI / BI` | §2, p.36 |
| `R` `X` | `NSIB / BI / NSIB` | `NSI / BI / BI` | §2, p.36-37 |
| `B` `W` `V` | `NSIB / BI / NSIB` | `NSI / BI / B-1` | §2, p.37-39 |
| `G` | `NSI / Ap / Bp` | — | §2, p.22 |
| `N` `.` L=1 | `NSI / Ap / Bp` | — | §2, p.23-24 |
| `.` L=6 | `NSIB / BI / NSIB` | — | §2, p.23 |
| `M` `L` | `NSI / Ap / B+LB+1` | — | §2, p.40-41 |
| `D` | per the eight-row Figure 20 table | — | §3.3 |

`RegExpr` must be able to *say* all of that, so the union carries three members the earlier
draft omitted: the literal `'B+LB+1'` for `M`/`L` (the console write — Wave 2 cannot be typed
without it; `opcodes.md` §2 pp.40-41, `io.md` §8 "after: IAR = NSI, AAR = Ap, BAR = B + LB + 1")
and the template members `` `${'Ap'|'Bp'}-1` `` for chained Set/Clear Word Mark. Two extra cases
in `isa/regs.ts`, no evaluator redesign. We deliberately do **not** reach for `'special'` here:
`'special'` moves the effect back into an executor and defeats the diffability the table exists
for. Likewise `,`/`⌑` get three rows, not one — `opcodes.md` §2 prints three distinct results
per form and a table with fewer rows than the source cannot be diffed against it.

`'special'` means the executor sets the register itself. The two-address branches'
`bar: 'B-1'` on the not-taken path is deliberate machine design — it positions a chained
retest one position lower (`architecture.md` §9) — and it is exactly the kind of thing that
becomes a wrong *string* in a diff rather than a silent bug.

Move's register effects come from the eight-row Figure 20 table (`opcodes.md` §3.3):
L→R first-WM-either-field → `A+LW / B+LW`; L→R record mark / GM-WM / either → `A+LA /
B+LA`; R→L one position → `A-1 / B-1`; R→L A-field WM → `A-LA / B-LA`; R→L B-field WM →
`A-LB / B-LB`; R→L first WM either field → `A-LW / B-LW`.

### 4.3 Timing

`cycles.ts` implements the per-op `T` formulas from `opcodes.md` §2, base machine, 4.5 µs
core cycle. The header comment names the **Accelerator trap**: A22-0526-3 pp.96-98 is the
Accelerator timing set (4.0 µs cycle) and prints `4(L+1+C)` where the base machine gives
`4.5(L+1+C)`; mixing the two is silent (`opcodes.md` §1.5). A unit test asserts a taken
conditional branch costs `4.5(L+1+C)`.

The `E` term (`opcodes.md` §1.5, Figure 7): **2** on a single-character multiply or divide;
**1** on a single-character add, subtract, ZA, ZS or table lookup, or on a 6-character
multiply or divide; **0** otherwise. Any chained (1-character) arithmetic op uses the
**two-field** formula with L=1 and **`E` taken from Figure 7** — E=1 for `A S ? ! T`, **E=2
for `@` and `%`**, which are arithmetic ops and *are* chainable at length 1 (`opcodes.md`
§1.1: `@ %` = 1, 6, 11; §1.4's per-length table gives them "D cycle **and then** C cycle. E=2").
A blanket "E=1 for any chained arithmetic op" leaves chained multiply and divide one cycle
short. The One-Field line's `L = 1 or 6` with no E term at all is editorial carryover,
identical in A22-1407-2, and is one cycle short in the other direction (`opcodes.md` §1.4, §10).

Three cost terms `cycles.ts` names explicitly, because a formulas-only file drops them
silently:

- `INDEX_US = 34.5` — added **per address indexed**, base machine (30.67 with the Accelerator,
  which we do not model). `architecture.md` §5, A22-0526-3 p.15.
- the device **`I/O`** term in `49.5 + I/O` for the I/O ops — **0 in Phase 1**, with a comment
  saying the 1415's 932 char/min is not modelled and this is not a timing claim (`opcodes.md`
  §1.5).
- the ops whose timing is a **constant, not a formula**: `G` = 69.75, `.` at L=6 = 36,
  `F`/`K` = 13.5 (`opcodes.md` §2). Table values, not formulas.

Unit tests: a taken conditional branch costs `4.5(L+1+C)` and not `4(L+1+C)` (the Accelerator
trap), and a **chained `@` costs E=2** while a chained `A` costs E=1. The whole E matrix is a
tier-0 fixture, `timing.json`. The counter is named `microsecondsSimulated` and is never
rendered as a clock.

---

## 5. Instruction implementation order

The order is CC01A's own flow chart, from `emulators.md` §4.1 (CC01A PDF p.006): *NO-OP;
unconditional branch; branch on word mark; clear and set word mark; type ident; store A and
B address registers; branch bit equal; branch zone and WM/zone; add and subtract; clear
storage; clear storage and branch; indexing; branch character equal; the MLNS/MLZS/MLCS
scans; compare; data moves; type "CC01 complete".* The diagnostic was designed to exercise
the ambiguous areas in dependency order, so each finished wave moves the first halt further
into the program.

**Wave 0 — decode only, nothing executes.** ~1,200 lines, not ~800.
`bcd`, `storage`, `address`, `registers`, `checks`, `decode`, `cor`, `trace` level 2 — **and
`isa/table.ts` and `isa/regs.ts`, in full.** That is not a detail: the decoder *is* the table.
`OPS[chars[0] & BCD6]`, `entry.implemented`, `selectForm(entry, chars.length)` reading
`forms[].lengths`, and the address-double flag are all table lookups, and the decode-only
oracle asserts post-decode AAR/BAR, which is `isa/regs.ts`. `isa/table.ts` is the single
largest file in the phase (~500 lines) and the earlier draft assigned it to no wave at all, so
a subagent handed "Wave 0" had no instruction to build it. Wave 0 therefore ships **every
declarative column of every row** — `opChar`, `octal`, `autocoder`, `lengths`, `addressDouble`,
`chainable`, `implemented`, `feature`, `regs`, `cite` — with every `exec` a throwing stub and
every `timing` unimplemented. Executors and timing functions fill in per wave.
`step({ execute: false })` fetches, scans to the next word mark, classifies the form,
validates the length, loads AAR/BAR/CAR/DAR per the address-double rules, blanks OpMod where
required, and advances IAR — and does nothing else.
*Oracle:* `ilentest.cor` 00100-02100 against the per-op length groups (`emulators.md` §5.2);
`insttest.cor` 02200-02288 producing the correct 15 indexed effective addresses
(`emulators.md` §9 step 3); `.cor` load→dump byte-identity on `cc01.cor`.
This is the highest-leverage move in the plan: the decoder — where address-doubling,
op-modifier blanking and the R/X-length-7-only rule all live — is validated against
documented expected values before one executor exists. `note1410.txt` says these blocks are
decode tests and that Jaeger patched his simulator to disable execution; we make that a
supported mode instead of a hack.

**Wave 1 — flow-chart steps 1-4.**
`N` (any length), `.` (Halt, and Halt-and-Branch at L=6), `J` unconditional plus the full
one-address d-table (`opcodes.md` §6.1), `V` Branch if Word Mark Present / Zone Equal
(§6.3), `,` Set Word Mark and `⌑` Clear Word Mark in all three forms.
*Oracle:* tier-0 and tier-1 unit tests, plus — critically — the run-time word-mark creation
pattern at `cc01.cor` 02181/02188 and 02234/02241, where op codes are stored **without**
word marks and a chained 6-character Set Word Mark creates them (`emulators.md` §4.5). If
the loader infers word marks from instruction boundaries, this wave fails loudly.

**Wave 2 — flow-chart step 5, "type ident".**
`M %T0 bbbbb W` (WCP) and `L %T0 bbbbb W` (WCPW), the x-control field decode, `Channel1`
with the nine-step sequence, the interlock and the six status indicators, and `R (I) d`
including the group-mark form that releases the interlock without branching (`io.md` §5).
`Console1415` as an 8-bit device on channel 1 (`io.md` §1, §8), emitting data up to but
**not including** the terminating GM-WM, plus the `read()` stub returning `null` /
`noTransfer: true`. `L %T0 bbbbb W` is a **load-mode write**, so this wave also ships the
channel's load-mode *output* translation for 7-bit devices — WM → word separator one position
**ahead** of its character, core separator → two separators, record lengthens (`opcodes.md` §2
`L` row / A22-0526-3 pp.40-41; `io.md` §3 p.41) — even though the 1415 itself, being 8-bit,
bypasses it and renders the WM bit as an inverted circumflex (`io.md` §8, Figure 44). Writing
it now is what lets Phase 2 add the 1403 (blank ahead of the character, `io.md` §7) and the
1402 punch (0-5-8) with no channel change.
*Oracle:* `cc01.cor` from IAR 02000 gets as far as typing `CC01A` on the console log; a tier-1
vector through a fake 7-bit device asserts the output translation independently of any device.

**Wave 3 — flow-chart steps 6-11.**
`G` Store Address Register (d = `A B E F`; uses the C-address register so **AAR is not
disturbed**; not indexable — `opcodes.md` §2 p.22), `W` Branch if Bit Equal, `A` and `S`
with the units/body/extension scan and the complement/recomplement machinery, `/` Clear
Storage and Clear-Storage-and-Branch.
*Oracle:* `insttest.cor` arithmetic latch traces, which live in **02300-02799** — the block
`emulators.md` §5.1 inventories as "02300-02968" is the union of the arithmetic annotations and
the Move matrix that §5.3 places at 02800-02968, so the arithmetic sub-block ends where the
Move matrix begins. Within it, the chained pairs at
02368/02379 (add), 02473/02484 (subtract) and 02550/02561 (zero-and-add) with their D-cycle
behaviour, and the zones-in-A-and-B cases at 02380 and 02485 (`emulators.md` §5.3). Plus
`/ 12590` clearing 12590-12500 and leaving BAR 12499.

**Wave 4 — flow-chart steps 12-13.**
Indexing exercised end-to-end with execution enabled; `B` Branch if Character Equal and the
compare latches it shares with `C` and `T`.
*Oracle:* `insttest.cor` 02200-02288 re-run with execution on; the `009Z6` / `0001J` → 00985
worked example (`architecture.md` §5).

**Wave 5 — flow-chart steps 14-16.**
The three scan d-characters CC01A names first — MLNS (`1`), MLZS (`2`), MLCS (`3`) — then
`C` Compare (collate table, terminate on either word mark, the short-A-turns-HIGH rule),
then op `D` with all 64 d-characters via `d & 0x07` / `d & 0x38`.
*Oracle:* the 16-case Move matrix at `insttest.cor` **02800-02968** — disjoint from Wave 3's
02300-02799, so the two fixtures never claim the same addresses — with `note1410.txt`'s
annotations, corrected per `emulators.md` §5.3 (the 02848 label says "D=T"; the image holds
`D 10517 10519 -`, d = hyphen). Then `cc01.cor` types `CC01 COMPLETE` and reaches the
`J 01972` at 08980.

**Wave 6 — `?` ZA and `!` ZS, then the gate closes.**
`?` Zero and Add and `!` Zero and Subtract reuse the Wave-3 add machinery and are cheap, so
they stay in Phase 1.

**Phase 1b — `@ % T Z E`, promoted out of the table.**
`@` Multiply, `%` Divide (with the B-address at the **leftmost position of the dividend**),
`T` Table Lookup (with the CAR reload at the start of every search cycle), `Z` MCS, and `E`
MCE. **These are cut from the Phase-1 gate.** They are roughly 900 of the source lines
(multiply/divide in `alu.ts`, `tablelookup.ts` 110, `mcs.ts` 90, `edit.ts` 300) and they are
the least-verified code in the phase: this document's own risk table says CC01A does not
exercise MCE "so it cannot block the gate", §10 records MCS's scan direction as `[likely]`
behind a named `OPEN` constant, and the MCE confirmation read of A22-0526-3 pp.31-35 has not
happened. None of it is required by any gating tier (0-3) and none of it is on the CC01A flow
chart that orders this phase — that is work carried inside a gate that does not need it,
against "simplicity first / phases are gated / each phase ends on a demo".

In Phase 1 they are **complete table rows** with the full declarative columns and
`implemented: false`, so `isa/table.ts` still diffs row-for-row against `opcodes.md` §2 and
dispatching one raises `UnimplementedOp` carrying its citation.
*Phase 1b's gate:* `insttest.cor` 00300-01100 decode plus the annotated ZA/ZS/multiply/divide
blocks; for MCE, the 46-step Figure 34 trace asserted at every cycle, ending IAR 00012 /
AAR 12155 / **BAR 04677**, plus the eight-case BAR table (`opcodes.md` §7.3) and the skid cycle
at 04668 that preserves the word mark it finds (§7.5).

**Wave 7 — rejections.**
`Y P Q U 2 4 $ =` raise `UnimplementedOp` carrying their citation; an overlap x1 raises
`unsupportedFeature`; `?`/`!` in x1 and `3`/`1` as branch ops are Instruction Checks.

---

## 6. Test harness

### 6.1 The `.cor` loader

`src/formats/cor.ts`. Format from `emulators.md` §6: five bytes of ASCII decimal core size
(`%05d`), then `size` little-endian integers of width `W = (filesize − 5) / size`, which
must be 2 or 4.

```ts
export function loadCor(buf: ArrayBuffer): CoreImage {
  const size  = parseInt(ascii(buf, 0, 5), 10);
  const width = (buf.byteLength - 5) / size;             // must be 2 or 4
  const cells = new Uint8Array(size);
  for (let i = 0; i < size; i++) cells[i] = leInt(buf, 5 + i * width, width) & 0xff;
  return { size, width, cells };                          // width recorded for round-trip
}
```

Four rules, each with its citation, each a test:

1. **`cell = v & 0xFF`.** The `.cor` byte layout is `WM C B A 8 4 2 1` — bit 7 word mark,
   bit 6 the odd-parity check bit, bits 5-0 `B A 8 4 2 1` — which **is** our in-memory
   layout (`emulators.md` §6). The frequently-quoted `(v & 0x3F) | (v & 0x80)` is the
   *SimH* conversion ("drop the parity bit") and would throw the C bit away.
2. **Copy the WM bit verbatim; never infer word marks from instruction boundaries.**
   `cc01.cor`'s branch-on-word-mark test stores op codes without word marks and sets them at
   run time (`emulators.md` §4.5).
3. **Fill normalisation is per file, not a format constant.** `cc01.cor` fills unused
   storage with `0x40` — a space with its C bit, a valid character. `insttest.cor` and
   `ilentest.cor` fill with `0x00` — **no C bit**, parity-invalid in Jaeger's own encoding,
   so a parity-checking read process-checks on untouched storage. The loader normalises
   `0x00 → 0x40` for those two files as a named, commented, tested step
   (`emulators.md` §5.1). `cc01.cor` needs no normalisation.
4. **Byte-identity is asserted where it can be.** `loadCor → dumpCor` is byte-identical for
   `cc01.cor` (which needs no normalisation), and identical *modulo the documented
   normalisation* for the other two. `width` is carried on the image because the committed
   files use W=4 while cube1us's own `DumpCore` writes W=2 (`emulators.md` §6) — without
   that, round-tripping is impossible for a different reason than parity.

`loadCor` writes through `pokeRaw` only. Nothing else in the system may.

Images are fetched, not vendored: they are GPL-3.0 upstream (`emulators.md` §3).
`tools/fetch-oracles.ts` downloads `cc01.cor`, `insttest.cor`, `ilentest.cor` and
`note1410.txt` into a gitignored `oracles/`.

Because tiers 2-4 assert against those four files, the fetch **pins**: repository **and commit
SHA** in one named constant at the top of `fetch-oracles.ts`, plus a recorded **sha256 per
file**, verified after download. A mismatch fails loudly with its own message —
`ORACLE CHECKSUM MISMATCH: <file>, expected <sha>, got <sha>` — which is deliberately *distinct*
from the absent-`oracles/` message. Without that, an upstream edit silently changes what the
gating tiers assert, and a failed download is indistinguishable from a legitimately absent
`oracles/` (both would simply skip). Tiers 2-4 skip, with a clear message, only when the
directory is genuinely absent. CI and a fresh clone both work; the repo stays clean.

### 6.2 The `note1410.txt` latch trace

Three trace levels, all line-oriented text, all diffable with `tools/trace-diff.ts`.

```
L1  step
    I 02194  A 01250  B 00000  OP M  D W  LEN 10  CY 49.5   # M %T0 01250 W

L2  decode  (Wave 0's oracle)
    D 00100  FORM Oab   LEN 11  OP A  AAR 11111 BAR 22222 DBL=1  OK
    D 00111  FORM Oa    LEN  6  OP A  AAR 33333 BAR 33333 DBL=1  OK
    D 00117  FORM O     LEN  1  OP A  AAR=prev BAR=prev  Dcycle  OK

L3  latch  (arithmetic and move; the note1410 oracle)
    02300 A  scan1 units  Ac=0 Bc=0 cin=0 cout=0 zb=1 ovf=0  a=5 b=3 → 8
    02300 A  scan1 body   Ac=0 Bc=0 cin=0 cout=1 zb=0 ovf=0  a=7 b=4 → 1
    02300 A  end          zb=0 ovf=0  B=00812+
```

`note1410.txt`'s arithmetic annotations are latch states, not results — Scan 1 / Scan 3,
Units / Body / Extension, Zero Balance, A Complement, B Complement, Carry In/Out, Overflow
(`emulators.md` §5.3) — and they are the richest expected-value data that exists for a 1410
anywhere. Structuring the add/subtract pass as those named scan phases is not a timing claim:
they are logical phases of the documented algorithm (`architecture.md` §10, `opcodes.md`
§4.3), and cycle counting stays a separate formula-driven number. When the tracer sink is
null the latch record is never constructed, so it costs nothing in the browser.

Two `note1410.txt` label errors are corrected in the fixtures with citations: `(M)` for
Multiply at 00500 — the op character is `@` (`emulators.md` §5.2); and the 02848 "Move D=T"
label, where the image holds d = hyphen and Jaeger's prose is right but his label is wrong
(§5.3).

Anything in `note1410.txt` that cannot be confidently mapped onto one of our named latches
goes verbatim into `oracle/note1410/UNMAPPED.md` with the raw quote — visible, not silently
dropped.

### 6.3 The SimH deviation ledger (the runner itself is deferred)

**`tools/simh-diff.ts` is cut from Phase 1.** It is ~120 lines plus a SimH build, it is
declared optional, it never gates CI, and this section already conceded that the value is in
the ledger rather than the runner. Speculative work inside a gated phase whose named risk is
scope. It comes back the moment a real halt-address hunt needs it — which the tier-4 risk row
already schedules as a working session — and the recipe is recorded here so that session starts
from a spec, not a blank page: `set cpu 7010 80k nofloat nopri noprot`, inject with generated
`d <addr> <val>` lines (`sim_load` is a stub returning `SCPE_NOFNC`), never `boot` — that is
the 7010 Load key, and the 1410 has none (`emulators.md` §2.1, §9 step 5). Compare halt
addresses and memory dumps, **not** console text (i7010 console fidelity is unverified,
`emulators.md` §10).

What **does** ship in Phase 1 is the data file. `oracle/simh-deviations.ts` is a written ledger
so a diff can never be resolved in the wrong direction — `glyph-6`, `move-first-wm`, `dt-lengths`, `rx-chainable`, `chan-norec`,
`7010-channels`, `edit-op-e`, each with its research citation (see
[architecture.md §8](architecture.md)). It is cheap, and it is the thing that actually stops a
future session from "fixing" a correct 1410 behaviour to match a known-wrong oracle.

### 6.4 `oracle/cc01a-halts.ts`

Starts empty and grows one entry at a time, each transcribed only when a real halt lands
there. The 38-page CC01A listing has no OCR text layer and no machine-readable halt-address
→ routine table exists (`emulators.md` §10). Transcribing it speculatively is the wrong
trade for a two-person project; transcribing the `ROUTINE nn.mm` heading you actually need
is a few minutes.

---

## 7. Test tiers and what gates the phase

| Tier | What | Gates Phase 1? |
|---|---|---|
| 0 | Transcribed research tables as fixtures: op lengths (`opcodes.md` §1.1 **only** — `J` = [1, 7], `R`/`X` = [7], `G` = [7]), 64 Move d-characters + Figure 20 effects (§3.2-3.3), add-cycle/sign tables (§4.3-4.4), collate order and the 64-code round trip (`charset.md` §2, §4), `J` d-table (§6.1), `V` rules (§6.3), indicator set/reset for the **seven** latches (§8), and `timing.json` — the Figure 7 E-term matrix keyed on (op, length) plus `INDEX_US = 34.5`, the device `I/O` term and the constant-timing ops `G` = 69.75, `.` at L=6 = 36, `F`/`K` = 13.5. Plus the named negative tests, and two named positive ones: **a 1-character chained `J` decodes as a legal form**, and the redundancy assertion written as `chainable === false && opChar !== 'N' ⇒ 1 ∉ lengths`. | **Yes** |
| 1 | Manual worked examples, each a named test citing a page — the full list is in [architecture.md §8](architecture.md). | **Yes** |
| 2 | `ilentest.cor` decode-only against **the instruction lengths present in the image** (`emulators.md` §5.2's inventory), never as a source for `forms[].lengths`. §5.2's "7 only \| `J X R G`" row describes what the image contains — `_J11111A`, `_X22222B`, `_R33333D`, `_G11111A` — and the same section's next line says "Branch `J` L = 1 or 7". Sourcing `lengths` from the tier-2 sentence would Instruction-Check every legal chained `J`, and tier 4 would not catch it because `cc01.cor` uses `J` only at length 7. | **Yes** |
| 3 | `insttest.cor`: index block 02200-02288, arithmetic latch traces **02300-02799**, the 16-case Move matrix **02800-02968** — disjoint ranges. `emulators.md` §5.1's "02300-02968" is the union of the two; §5.3 places the Move instructions at 02800-02968. | **Yes** |
| 4 | `cc01.cor` end to end. PASS is literally: the console received `CC01A`, then `CC01 COMPLETE`, and the IAR reached **08980** — **stop there** (`emulators.md` §4.4: "treat 'reached 08980 having typed both messages' as PASS and stop there"). Assumes the executed path from 02000 uses only the writes at 02194 and 08890; the three I/O instructions in the loader/monitor block at **01800-01912** are assumed unreached and will raise `unimplementedOp` (or hit the `read` stub) if they are — a useful localisation signal, not a failure. | **No — smoke test** |
| 5 | SimH `i7010` differential. The **ledger** (`oracle/simh-deviations.ts`) ships in Phase 1; the runner is deferred (§6.3). | No — deferred |

Tier 4 does not gate because **nobody has published a pass/fail transcript of `cc01.cor`
under any simulator**; the repo ships the image with no expected-output file and
`note1410.txt` never mentions it (`emulators.md` §10, `open-questions.md` emulators row).
The first clean run establishes a baseline rather than confirming one. Until then a halt
address is a localisation pointer: drop to tiers 2 and 3, which *do* carry expected values,
fix, re-run. That is precisely why tiers 2 and 3 come first in the build order and why they
are not optional.

**Revised 2026-08-30 after the first cc01 run.** The tier-4 PASS rule in the table above is
superseded. The original text stays as written because it is what the plan committed to; this
block is what is now in force: **`CC01A` typed, then `CC01 COMPLETE` typed, then an instruction
check at 00322.** 00322 is the relocated tape-read hole — CC01A ends by copying its own tape
read-in into low core (`D 08967 00333 Δ`, `D 00332 00339 3`) and branching to `J 00322`, and the
ten characters there are blank because no CE ever keyed the per-channel `M`. The `J 01972` at
**08980** is on no executed path: a full-image operand scan finds nothing in the image naming
08980, 08966, 08973 or 08959, so nothing branches there. `emulators.md` §4.4 had read 08980
straight off the static image and is corrected in place. Halt addresses land in
`oracle/cc01a-halts.ts` one at a time; the archaeology is `docs/BUILD-LOG.md` under "cc01 halt
archaeology". Tier 4 still does not gate: the run **established** a baseline, it did not confirm
one, and an emulator's own output is `[observed]`, never `[verified]` (`research/METHOD.md`).

Also mandatory and cheap: `test/core-is-dom-free.test.ts`, ten lines, greps
`src/core/**/*.ts` for `/\b(document|window|navigator|HTMLElement|require|process)\b/`.

---

## 8. Exit criteria — what the owner and a family member actually see

**In the terminal**, `npm run cc01`. The block below is **ILLUSTRATIVE — SHAPE ONLY**, not an
acceptance target: no instruction count and no simulated-seconds figure appears in it, because
`cc01.cor` has never been observed to run anywhere (`emulators.md` §10) and any such number
would be invented. It shows the *layout* an implementer should produce, nothing more.

```
$ npm run cc01
loaded oracles/cc01.cor — 10000 positions, W=4, IAR = 02000   (MODE = ADDRESS SET)

1415 CONSOLE
  CC01A
  CC01 COMPLETE

S 08980 ..... ..... .. ... ....
PASS: both messages typed, IAR reached 08980 — stopping here.
      (emulators.md §4.4: 01972 is blank in this image, the TC50 read-in entry the
       physical Execute card targeted. We do not run on into it.)
<n> instructions   <t> µs simulated (4.5 µs cycle)
```

**The harness asserts exactly three things** and nothing else: the console received `CC01A`,
then `CC01 COMPLETE`, and the IAR reached **08980** — at which point the run **stops**. It does
not branch into 01972 and it does not expect an instruction check there; `emulators.md` §4.4
says "treat 'reached 08980 having typed both messages' as PASS and stop there". If someone
later wants the 01972 branch modelled, it is an **observed-behaviour note** in
`PHASE-1-NOTES.md`, never expected output. The instruction count and the simulated-microsecond
total are *printed* because they are interesting; they are not asserted, and there is no
published figure to assert them against (§7 tier 4, §9, `architecture.md` §9 C14).

**Revised 2026-08-30 after the first cc01 run.** The three assertions above are superseded; the
original text stays as written because it is what the plan committed to. The harness now asserts
**`CC01A` typed, then `CC01 COMPLETE` typed, then an instruction check at 00322** — the relocated
tape-read hole, blank in this image because no CE ever keyed the per-channel `M` into it. The
`J 01972` at **08980** is on no executed path: a full-image operand scan finds nothing in the
image naming 08980, 08966, 08973 or 08959. `emulators.md` §4.4 had read 08980 off the static
image and is corrected in place. The illustrative terminal block above therefore prints the
wrong stop line; the real one ends at 00322. Halt addresses go in `oracle/cc01a-halts.ts`; the
archaeology is `docs/BUILD-LOG.md` under "cc01 halt archaeology". The baseline (1241
instructions) is `[observed]`, not `[verified]` — it is this emulator's own output
(`research/METHOD.md`), which is exactly why §7 still does not let tier 4 gate the phase.

**In the browser**, `npm run dev`: one page, no styling worth the name — the register file,
the **seven** indicator latches and the six channel-1 status indicators as labelled boxes, a
scrollable core window rendering each position as its glyph with an **overbar where the word
mark is set**, the console log as a `<pre>`, the cycle counter in µs, and the real console
controls: LOAD, START, STOP, PROGRAM RESET, COMPUTER RESET, plus a MODE selector carrying
**ADDRESS SET**, **ALTER** and **I/E CYCLE**.

Those three MODE positions are load-bearing, not period decoration. COMPUTER RESET forces
IAR → 00001 (`console-and-physical.md` §3) and `cc01.cor` starts at **02000**, so LOAD + START
alone runs from the wrong address; ADDRESS SET is how the IAR gets 02000, and it prints the `B`
line (§2 print-out table). ALTER is the only mechanism in the Phase-1 file list by which any
program other than a downloaded `.cor` reaches storage — there is no keyboard, no assembler
until Phase 3. And I/E CYCLE is the half-cycle control that makes demo 2 possible; it prints
the `C` line, which `printout.ts` already emits. There is **no SINGLE STEP key on a 1410**
(`console-and-physical.md` §3 lists six MODE positions and no such control), so the earlier
draft's button would have been an invention that also left `printout.ts` emitting a `C` line
for a mode the machine could never enter. ~60 lines in `controls.ts`, reused verbatim by
Phase 4.

Two demos on that page:

1. LOAD `cc01.cor`; MODE = ADDRESS SET, key 02000; MODE = RUN; START. Watch `CC01A` and then
   `CC01 COMPLETE` type themselves out. Then MODE = I/E CYCLE through the branch-on-word-mark
   test at 02181 and watch the word mark appear over the op code when the chained Set Word
   Mark at 02188 executes.
2. **The one for a period reader.** Key a three-instruction add by hand through ALTER — set the word marks,
   put two signed fields in core, `A aaaaa bbbbb` — then MODE = I/E CYCLE and half-cycle it.
   Watch the B field fill in **right to left from the units digit**, one position per cycle,
   with the word mark on the high-order B position stopping it. That needs a **storage-cycle**
   boundary: a whole `A aaaaa bbbbb` completes in a single `step()` and the field would fill in
   one frame. `alu.ts` is already written as the documented units / body / extension scan phases
   for the latch tracer (§6.2), so the boundary exists — the add pass becomes a generator (or
   takes a per-cycle callback), `stepCycle()` on the machine façade drives it, and the L3 latch
   trace and the UI read the **same** records. Budgeted: ~60 core lines, ~30 UI. Cheaper
   fallback if ALTER slips: commit a `fixtures/demo-add.cor` built by a ~20-line test helper
   plus `setIar()` on the façade — but ALTER is the period-correct answer and Phase 4 needs it
   anyway. That is the thing about this machine worth explaining to someone who read its output
   for a living, and it takes fifteen seconds with no period art.

**And:** `npm test` green across tiers 0-3 (tier 4 reported, not gating); `tsc --noEmit`
clean under `strict` with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`;
`src/core/` provably DOM-free; and `PHASE-1-NOTES.md` recording which open questions were
hit and which fallback was taken.

**Gate:** Zarathustrum runs `npm test`, `npm run cc01` and `npm run dev`, and approves Phase 2.

---

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| `cc01.cor` has never been observed to pass anywhere; a first run that halts somewhere unexpected could be our bug or an unknown property of the image (`emulators.md` §10). | It does not gate the phase. Tiers 2 and 3 come first and carry documented expected values. Budget one working session for halt-address archaeology; transcribe only the `ROUTINE nn.mm` headings actually needed, into `oracle/cc01a-halts.ts`. If the halt address will not move after two sessions, ship on tiers 0-3 and record the open baseline in `PHASE-1-NOTES.md`. |
| MCE is the hardest op on the machine — three scans, two skid cycles that touch storage outside the declared B field, and a BAR result the Principles of Operation refuses to state. | **Moved out of the Phase-1 gate entirely, into Phase 1b**, with `@ % T Z` — CC01A does not exercise any of them and no gating tier needs them, so carrying ~900 of the least-verified lines inside this gate bought nothing. They ship as complete `isa/table.ts` rows with `implemented: false`. Tested against the 46-step Figure 34 trace and the eight-case BAR table (`opcodes.md` §7.3, §7.5). **Do not copy SimH's `OP_E`** — three documented deviations (§7.6). The confirmation read of A22-0526-3 pp.31-35 is a named open item. |
| Op-modifier blanking after an 11-character instruction silently corrupts the next chained op. | Tier-1 test, plus the rule lives in `applyFields` as one commented line citing p.12. |
| A `length` union type or a scan cap silently makes a long `N` unrepresentable, breaking the bootstrap path Phase 2 needs. | No union type anywhere; `Fetched.chars` is a `Uint8Array`. A tier-0 test decodes an `N` of length 14. |
| `insttest.cor` / `ilentest.cor` ship parity-invalid `0x00` fill; a parity-checking read would process-check on untouched storage. | Named, commented, tested normalisation in `cor.ts`; parity checking is a config flag, default off in Phase 1 (`emulators.md` §5.1). |
| Importing 1401 behaviour from the abundant 1401 literature. | The address-double set, the load-mode word-mark rule, the single-character edit and the `2-8` / A-bit card code all differ. Every borrowed fact must cite a 1410 source; the `cite` column on every `OpForm` is the enforcement mechanism, and `oracle/simh-deviations.ts` covers the emulator side. |
| Cycle counter mistaken for a timing claim, or built from the Accelerator appendix. | Named `microsecondsSimulated`, never rendered as a clock. `cycles.ts` carries the Accelerator-trap comment; a unit test asserts `4.5(L+1+C)` for a taken conditional branch, not `4(L+1+C)`. |
| Scope creep into the period UI — the fun part. | The internals panel is explicitly ugly and explicitly anachronistic. No Selectric font, no green-bar, no card art in Phase 1. `printout.ts` produces `ConsoleLine[]` in the *core*; rendering it prettily is Phase 4. |
| Interpreter performance in the browser. | 80K `Uint8Array`, per-character loops, no allocation in the hot path. A reentry trajectory is ~2 minutes of *emulated* 1411 time (`avco-and-reentry.md` implementer summary), a fraction of a second of real time. `MachineState` is structured-cloneable by design, so moving the machine into a Worker later needs no boundary change. |

---

## 10. `[unverified]` items Phase 1 touches, and the fallback chosen

Each is coded behind a named constant with an `// OPEN:` comment pointing at the
`open-questions.md` row, and each one actually hit is recorded in `PHASE-1-NOTES.md`.

| Item | Fallback chosen |
|---|---|
| Indexed effective address outside installed storage on a 20K/40K/60K machine — wrap or hard address check? The manual says only "the system will stop on an error". | **Address-check stop, never wrap.** `open-questions.md`, architecture row. |
| Per-d-character register effects for the 64 Move variants (Figure 20 cited, only two rows captured in the original pass). | Use the **eight-row terminator/direction table** in `opcodes.md` §3.3 and verify against the 16-case matrix in `insttest.cor` 02800-02968 before shipping the wave. |
| MCS (`Z`) scan direction and units addressing — `[likely]`, forced only by the printed `AAR = A − LA`, confirmed only by SimH `OP_MSZ`. | **Right-to-left copy from the units position, then a left-to-right suppression pass, leaving `BAR = B + 1`.** The only reading consistent with a decreasing A-address register. `open-questions.md`, opcodes row. |
| MCE rules, A22-0526-3 pp.31-35 not read directly. | **Implement from `opcodes.md` §7**, which reconstructs MCE including the registers-after rule, the eight-case BAR table, the 46-step Figure 34 trace and the skid cycles, and is `[verified]`. `open-questions.md`'s own parenthetical directs this. **The confirmation read of pp.31-35 is a named open item in `PHASE-1-NOTES.md`, not a gate.** |
| Address wrap during MCE's `−1` BAR modification, and the interaction with the two skid cycles that touch bytes outside the declared B field. | **Trap it.** `open-questions.md` offers cube1us's wrap-with-latch reading *or* trapping the case if the emulator does not model wrap — we do not model wrap. Named constant `MCE_WRAP_TRAPS = true`. The skid at `B_high − 1` is not a wrap: it is implemented, and it **preserves** any word mark it finds (`opcodes.md` §7.5). |
| Behaviour of a chained op whose AAR or BAR was clobbered by an intervening branch or I/O — the manual gives only "the address registers contain valid addresses". | **Run the normal address-validity check and otherwise execute with whatever the registers hold.** No special case. `open-questions.md`, opcodes row. |
| One-field arithmetic timing formula at L=1 prints `L = 1 or 6` with no `E` term, contradicting Figure 7 and the hardware's chained D cycle. | **Use the two-field formula with L=1 and `E` from Figure 7** — E=1 for `A S ? ! T`, **E=2 for `@` and `%`** (`opcodes.md` §1.4's per-length table: at length 1 they take "a D cycle **and then** a C cycle"). Not a blanket E=1, which leaves chained multiply and divide one cycle short. Timing only; semantics unaffected. |
| Whether the two MCE skid cycles are counted inside the `B`/`Z`/`D` terms of the timing formula (S223-2698 Figure 25 is an image, not extracted). | **Ignore.** Not cycle-accurate; register and memory state are unaffected. |
| SimH permissiveness: it accepts `D`/`T` at lengths 2, 7, 11 and marks `R`/`X` chainable. | **Enforce the 223-2589 p.53 length table** on every fetch; both are in `oracle/simh-deviations.ts` so a future diff cannot resolve them the wrong way. |
| Op-code character-set completeness — A22-0526-3 Appendix Figure 107 (pp.101-105) only partially transcribed. | **`opcodes.md` §2 is the working dispatch set**; any unknown op character is an Instruction Check. Re-read pp.101-105 before claiming full ISA coverage. |
| Whether the May-1963 edition (A22-0526, revised 5/1/63) changes any addressing, indexing or chaining rule. | **Implement A22-0526-3 semantics throughout**; diff the later edition before declaring the CPU spec-complete. |
| 223-2692 contradicts itself on seven- vs eight-bit devices (p.8 vs p.9). | **The 1415 is eight-bit** (the p.8 reading); A22-0526-3 Figure 44's RCPW entering word marks directly from the keyboard supports it. Everything else is seven-bit. `io.md` §1. |
| SimH forces a word mark onto the first character of a MOVE-mode input record, contradicting 223-2692 p.58 and Figure 5. | **Follow the manual** — move-mode input adds no word marks at all. Ledger entry `move-first-wm`. |
| 1415 asterisk-insert CE switch behaviour (A22-0526-3 pp.50-58 not read). | Config flag, default **ON** (every C28-0351-5 initialization table says "The Asterisk-Insert switch must be set to ON"). Only reachable in Phase 1 if parity checking is enabled. |
| 1403 chain arrangement (A vs H) for glyph rendering. | **Default A2**, matching the Figure 2 footnotes the PoO assumes; expose the chain as a switch (`charset.md` §5, §5.1). Display only. |
| No published pass/fail transcript of `cc01.cor`; no machine-readable halt-address → routine table. | Tier 4 is a smoke test, not a gate; `oracle/cc01a-halts.ts` grows one entry at a time. |

Not touched by Phase 1, listed so the omission is deliberate: the priority-interrupt
register snapshot, 1401-mode 3-character address decoding, `Y` instruction timing, the
priority interruptible-length column, op `U` length, disk sub-operation digits, `P`/`Q` MICR
d-characters, `BQPR2`, `BRC1`/`BRC2`, load-mode word-mark erasure for tape and paper tape,
and the 80th-column-word-separator edge case. Every one belongs to a feature this
configuration does not have.
