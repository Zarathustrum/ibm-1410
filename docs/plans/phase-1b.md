# Phase 1b — the arithmetic and edit tail

Companion to [phase-1-cpu-core.md](phase-1-cpu-core.md), whose §5 defines this phase and §10 chose
three of its fallbacks. Every hardware behaviour cites `docs/research/`.

**Phase 2 (cards, 1402, 1403, inquiry, loader, card UI) is being built concurrently in another
worktree. 1b merges first; Phase 2 rebases onto it.** §2 is load-bearing, not bookkeeping.

---

## The seven bullets

1. **Reshape `alu.ts` into a primitive, then build on it.** `addToStorage` fixes the B cursor at
   `ctx.sym.B`, ends on one thing, derives the add cycle from the field signs and writes a sign at
   `lb === 0`; multiply needs a *moving* window, a *counted* run, a caller-chosen cycle and no sign
   until the end (PHASE-1-NOTES §4, review finding 14). Wave A extracts `addPass`;
   `addToStorage` becomes its `A S ? !` wrapper — and keeps everything the primitive must not
   own: the recomplement sign it hands **in**, the indicators, `ctx.recomplement` and
   `LA/LB/LW` it sets **after** (§3.1). **Zero behaviour change** — the existing vectors and
   `cc01` are the proof.
2. **Five executors, no new abstraction layer.** `@` and `%` in a new `muldiv.ts` over the
   primitive; `T` in `tablelookup.ts` over `bcd.ts`'s `collateRank` — `compare.ts` is not
   touched (§3.4); `Z` in `mcs.ts`; `E` in
   `edit.ts` as the three-scan ring with two skid B-cycles. Each is reached through the executor
   file its `isa/table.ts` row already names; the rows change `implemented` and their timing terms,
   nothing else.
3. **Turn the ten tier-3 `todo`s green** — `test/tier3-arith.test.ts`, the `@` block at
   02600-02644 and the `%` block at 02700-02766. `note1410.txt` gives those cases operands and
   **no latch lines at all**, so the fixture is real and the expected products and quotients are
   hand-derived from `opcodes.md` §4.5 / §4.6 under a `[derived]` fixture-provenance label defined
   once in `open-questions.md` — **by Wave B, the wave that first cites it, which therefore owns
   that file too** (§2, §4). Written into the fixture, not glossed (§4, §9).
   `emulators.md` still claims the opposite twice, and Wave B corrects it in place (§2, §4).
4. **MCE against the Figure 34 trace, honestly scoped — and that scoping is Tom's call.**
   `opcodes.md` §7.3 reprints **14 of the 46 steps** of A22-0526-3 Figure 34, plus the eight-case
   BAR table and the skid rules. Wave D opens with the confirmation read of A22-0526-3 pp.31-35 /
   S223-2698 pp.47-56 (PHASE-1-NOTES §4); if it lands the fixture becomes all 46 steps, otherwise
   we ship on the 14, the end state (IAR 00012 / AAR 12155 / **BAR 04677**), the eight BAR cases
   and the skid word-mark rule. That fallback **narrows the gate phase-1-cpu-core.md §5 wrote**,
   which its own §10 contradicts; §1 states the narrowing explicitly and Tom rules before Wave D.
5. **Machine-check `isa/table.ts` against `opcodes.md` §2 at test time** — the Phase 1 final
   review's queued item (`docs/STATUS.md`). §2's rows pair with `table.ts`'s `OpForm`s **by
   printed order** — the invariant `table.ts`'s own header already claims — and §5 compares op
   char, octal, `addressDouble`, indicators, register triples and d-modifier key sets exactly,
   `semantics` / `terminatesOn` by token similarity, each with the short exemption list §5 names
   and measures. It lands in **Wave A** and **these rules were run against `main`'s `opcodes.md`
   §2 and `main`'s `table.ts` while this plan was written** — it is green there before a row is
   touched, so it guards Waves B-D instead of rubber-stamping them.
6. **Gate on tiers 0-3 as Phase 1 does.** `npm test` green and `npm run smoke` PASS at every
   commit; **`npm run cc01` output unchanged** — `CC01A`, `CC01 COMPLETE`, instruction check at
   00322, 1241 instructions. `cc01.cor` executes none of these ops, so drift there is a regression
   by definition.
7. **~1,000 source lines (`src/` only — tests and fixtures on top), no new dependency, and one
   thing a period reader can watch.** `@` and `E` return per-storage-cycle iterators like the add pass does,
   so MODE = I/E CYCLE half-cycles them (§7).
   Plus `PHASE-1B-NOTES.md` and `docs/BUILD-LOG-1B.md` as named deliverables.

---

## 1. Scope and non-scope

**In, and nothing else.**

- The `alu.ts` reshape to a
  `{ aUnits, bUnits, positions, cycle, writeSign, recomplementSign, mode }` primitive, with
  **zero regression** on the existing tier-3 `A` / `S` / `?` / `!` vectors
  (`insttest.cor` 02300-02596, `oracle/note1410/arith.ts`) and on `cc01`.
- Executors for `@` Multiply, `%` Divide, `T` Table Lookup, `Z` MCS and `E` MCE, and the
  promotion of their five `isa/table.ts` entries to `implemented: true`.
- The Figure 7 timing terms those ops report — `M`, `Q`, `N`, `Z`, `D` — hard-wired `0` today.
- The isa-table machine check (§5).
- Their tests and fixtures, `BUILT_SO_FAR`, and the three documents of §9.

**Not in 1b, so the omission is deliberate.** Cards, the 1402, the 1403, console inquiry, the
condensed-card loader, any device, channel or UI work — **all Phase 2, and 1b must not touch it.**
The assembler, RPG, the reentry showcase. Tape, disk, channel 2, overlap, Priority, 1401 mode:
`Y P Q U 2 4 $ = X` keep Wave 7's rejections. Cycle-accurate timing — the two MCE skid cycles are
**not** counted inside `B`/`Z`/`D` (§10). MCE address wrap — `MCE_WRAP_TRAPS = true` stands from
plan §10. Any change to the cc01 PASS rule, the tier list, or `METHOD.md`'s tag set.

**One gate narrowing, stated rather than slipped in — Tom rules before Wave D.**
`phase-1-cpu-core.md` §5 sets Phase 1b's gate as *"`insttest.cor` 00300-01100 decode plus the
annotated ZA/ZS/multiply/divide blocks; for MCE, the 46-step Figure 34 trace asserted at every
cycle, ending IAR 00012 / AAR 12155 / BAR 04677, plus the eight-case BAR table and the skid cycle
at 04668"*. 1b narrows it in two places, on the authority of that same plan's §10, whose MCE row
says *"the confirmation read of pp.31-35 is a named open item in `PHASE-1-NOTES.md`, **not a
gate**"* — the two statements conflict, and this is the resolution:

1. **MCE** — from *the 46-step trace asserted at every cycle* to the **14 printed steps at their
   own B-cycle ordinals** (§4 Wave D), the end state, the eight BAR cases and the 04668 skid —
   and only if the confirmation read fails after two attempts. The 46 steps stay the preferred
   oracle and are used the moment the read lands.
2. **`insttest.cor` 00300-01100 decode** — already covered at tier 2. PHASE-1-NOTES §3 records
   that `ilentest.cor` and `insttest.cor` are **byte-identical over 00000-02599**, and
   `test/tier2-ilentest.test.ts` walks that range, so 1b adds nothing at tier 2 rather than
   re-asserting the same bytes at tier 3.

Neither is 1b's decision to take silently: **a phase gate is Tom's to relax.** The orchestrator
raises both before Wave D starts and ships the fallback only on his word (§9).

---

## 2. File ownership

**1b owns these.**

| File | Change |
|---|---|
| `src/core/alu.ts` | Extract `addPass`; `addToStorage` becomes its `A S ? !` wrapper. No behaviour change. |
| `src/core/muldiv.ts` | **New.** `@` and `%` over `addPass`. |
| `src/core/tablelookup.ts` | **New.** `T` — CAR reload per search cycle, d mask, short-field end. |
| `src/core/mcs.ts` | **New.** `Z` — right-to-left copy then left-to-right suppression. |
| `src/core/edit.ts` | **New.** `E` — three scans, two skid B-cycles, eight BAR cases. |
| `src/core/isa/exec/arith.ts` | `multiply`, `divide`, `tableLookup` stop being `notBuilt` stubs and delegate. |
| `src/core/isa/exec/move.ts` | Two lines: `moveSuppressZeros` / `moveEdit` delegate to `mcs.ts` / `edit.ts`. **Justification:** the `Z` and `E` rows already name these exports; repointing the rows would leave two orphans here, and this file is on no Phase 2 path. |
| `src/core/isa/table.ts` | **Only** the `@ % T Z E` entries: `implemented: true`, and four of the five `timing` lambdas fed the real terms — `@` gains `ctx.terms.M`, `%` `ctx.terms.Q`, `T` `ctx.terms.N`, `E` `ctx.terms.Z` and `ctx.terms.D`. **`Z`'s lambda already reads `ctx.sym.LA` and changes not at all.** Import block, every other row, and the header untouched. |
| `src/core/types.ts` | **One hunk.** `ExecContext` gains `terms: { M: number; Q: number; N: number; Z: number; D: number }` — Figure 7's own symbols (§1.5) — so an executor can report a timing term. **Required, not optional, and one field rather than five:** `ctx.recomplement` is the precedent for a required scalar an executor writes and a timing lambda reads, and under `exactOptionalPropertyTypes` an optional nested bag would make every lambda read `ctx.terms?.M ?? 0`. Rebase note below. |
| `src/core/cpu.ts` | **One line, out of the ownership list. Justification:** `ExecContext` is built in exactly one place — the literal at `cpu.ts` ~207-215 that already writes `recomplement: 0`. A required `terms` needs its zero default beside it (`terms: { M: 0, Q: 0, N: 0, Z: 0, D: 0 }`) and nothing else in the file changes. Phase 2's cpu.ts work (if any) is I/O dispatch, not this literal. |
| `oracle/note1410/arith.ts` | The ten `@`/`%` cases gain `resultField` and lose `pending: 'phase1b'`. |
| `oracle/mce-figure34.ts` | **New.** The Figure 34 trace as data. **Justification for the location:** it is not a `note1410.txt` transcription — it is a manual figure, like `oracle/cc01a-halts.ts` and `oracle/simh-deviations.ts`, which is what `oracle/` root already holds. `note1410/*` is reserved for the note's own annotations. |
| `docs/research/emulators.md` | **Out of the ownership list. Justification:** Wave B's fixture claim contradicts it, and METHOD.md requires the research file be corrected **in place**. §5.2's 02300-02968 row and summary point 4 both say `note1410.txt` carries cycle-by-cycle latch states for **multiply/divide**; the note carries field addresses and contents only for 02600-02644 and 02700-02766. Own commit, cited, logged in PHASE-1B-NOTES §3. |
| `docs/research/opcodes.md` | **Out of the ownership list. Justification:** §5's check diffs against it and §9 tells PHASE-1B-NOTES §3 to log corrections made in place, so the file has to be named. **Rule, load-bearing:** a §2 or §4-§7 correction lands in its **own** commit, cites the manual form number and page it came from, and is verified by the reviewer **against that page, never against `table.ts`**. Editing §2 to make §5 pass is a plan violation, not a fix. **Wave lists:** in **A** (the check reads it) and in **B, C, D** (the waves that read §4.5-§4.6, §5.1-§5.3 and §7 closely enough to prove a row wrong), so the correction the rule describes has a wave permitted to make it. Not in **E** — Wave E records corrections, it does not make them. |
| `test/tier3-arith.test.ts` | Delete the `test.todo` branch; the two blocks run like the other three. |
| `test/isa-table.test.ts` | **Edited in four waves, not one** (B, C, D, E) — see §4. `BUILT_SO_FAR` gains one wave's ops at a time and the "`implemented: false`" case narrows to match, because both existing cases go red the moment a row flips. Wave E installs the generalised inverse (§7). Phase 2 must know this file moved four times. |
| `test/{alu-pass,tier1-muldiv,tier1-tablelookup,tier1-mcs,tier1-mce,isa-table-vs-research}.test.ts` | **New.** |
| `docs/BUILD-LOG-1B.md`, `PHASE-1B-NOTES.md` | **New, and written per wave rather than at the end** — the same rule as `open-questions.md`: the wave that first has something to record is the wave that writes it. **Wave A creates both** (its own log entry, and any deviation the reshape or the machine check forces); **B, C, D** each add their log entry and the constants, plan deviations and research corrections §9 names; **E** closes them. So both files are in the lists of Waves A, B, C, D **and** E. Conventions in §9. |
| `docs/research/open-questions.md` | A dated `## Phase 1b — 2026-08-30` section **appended**, in four touches, not one — **the wave that first needs a row is the wave that writes it**, because a fixture or a constant citing a row that does not exist yet is the epistemics slip this plan is written to prevent. **B opens the section** with the one-paragraph `[derived]` definition (bullet 3, §9) and the `ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE` row; **C** adds `TABLE_LOOKUP_RESETS_COMPARE_PER_FIELD` and `MCS_PASSTHROUGH_CHARS` (§3.4, §3.5); **D** adds whatever the MCE confirmation read leaves open; **E** closes it — outcomes, fallbacks and constants per §9. So the file is in the lists of Waves B, C, D **and** E. |
| `docs/STATUS.md` | One new top entry at merge. |

**1b must NOT touch:** `src/core/channel.ts`, `src/core/devices/*`, `src/formats/*`, the
`machine.ts` load path, `src/core/isa/exec/io.ts`, the `F`/`K` rows of `table.ts`, `src/ui/*`,
`docs/BUILD-LOG.md`, `PHASE-1-NOTES.md`, `docs/plans/architecture.md`. **And
`src/core/compare.ts` — named here on purpose:** the obvious way to build `T` is to generalise
`compareFields`, and §3.4 says why 1b does not (it would edit a file no wave owns, to no gain).
`test/compare.test.ts` stays untouched as the proof. Anything else outside the table above needs a
one-line justification in `PHASE-1B-NOTES.md` §2 before the commit that introduces it.

**The parallel constraint.** Phase 2 is being planned and built at the same time in a separate
worktree and rebases onto 1b after 1b merges to `main`. Every 1b worker therefore gets its wave's
file list as a hard boundary and the orchestrator rejects a diff touching anything outside it —
not because the change would be wrong, but because a conflict in `channel.ts` or `machine.ts`
costs Phase 2 a rebase it cannot verify without running its whole suite. 1b is a leaf: four new
core modules nothing else imports, two executor files, five entries in one shared file. If a 1b
problem seems to need a device, a format or a UI change, that is the signal to stop and hand it to
Phase 2, not to widen the diff.

**Expected rebase conflict points.**

1. **`table.ts` rows.** 1b edits five `OpEntry` literals (`@` ~217, `T` ~322, `Z` ~496, `%` ~568,
   `E` ~1002 on `main`); Phase 2 edits `F`, `K`, `M`, `L` and the import block. Disjoint hunks.
   **1b adds no import here** — `tMultiply`, `tDivide`, `tTableLookup`, `tEdit`,
   `tMoveSuppressZeros` and `eTerm` are already imported — which removes the one colliding hunk.
2. **`test/isa-table.test.ts` `BUILT_SO_FAR`.** One array literal both phases extend (1b:
   `@ % T Z E`, **in four commits**; Phase 2: `F K` off `DEVICE_DEFERRED`). **Guaranteed
   conflict, resolution = take the union.** Two other cases in that file move with it — the
   `implemented: false` case (narrows B → C → D, deleted in E) and the loud-stub case (whose
   `BUILT_SO_FAR` exclusion is what keeps it honest). Flagged so Phase 2's rebase is not
   surprised by four touches rather than one.
3. **`types.ts` / `cpu.ts`.** 1b adds one required field inside `ExecContext` and its zero
   default in the one literal that builds it (§4 of that file, `cpu.ts` ~207-215); Phase 2
   re-adds the card / deck / object-deck types (PHASE-1-NOTES §2 item 26) at the end, §6.
4. **Doc appends.** `STATUS.md` is newest-first and both phases prepend; `open-questions.md` takes
   a dated section per phase at the end — keep both in each, and note that 1b appends to its own
   section in **four** waves (B, C, D, E), so the rebase sees four touches there as it does in
   `test/isa-table.test.ts`. `BUILD-LOG.md` and `PHASE-1-NOTES.md`
   are frozen, and 1b's log and notes are separate files so they cannot conflict.

---

## 3. Design, op by op

Register expressions are the strings already in the rows, Figure 8 notation (`opcodes.md` §1.3),
evaluated by `isa/regs.ts`; `'special'` means the executor sets that register itself. Throughout
§3, an unqualified `§n` is `opcodes.md`'s.

### 3.1 The reshape

Today: `const bUnits = opts.oneField ? ctx.sym.A : ctx.sym.B;` — the B cursor is a register; the
loop ends on `s.wm(bAddr)` and nothing else; the add cycle comes from
`selectAddCycle(subtract, signOf(aUnitsCell), bSign)`; the sign is written at `lb === 0`; the pass
sets `zeroBalance`/`arithOverflow` itself. Multiply violates all five: its partial adds walk a B
window moving one position left per multiplier digit, run for a **counted** number of positions
rather than to a word mark, take a caller-chosen cycle with no signs in sight, write no sign until
the product is complete, and must not touch zero balance until the operation ends (§4.5, §8). The
reshape is an extraction, not a rewrite:

```ts
export interface AddPassOptions {
  aUnits: Addr;                       // A cursor start — multiply re-reads one field per digit
  bUnits: Addr;                       // B cursor start — multiply's window moves left per digit
  positions: number | 'bWordMark';    // an exact count, or scan to the B word mark
  cycle: 'true' | 'complement';       // Figure 12's choice, made by the CALLER
  writeSign: Sign | null;             // Scan 1's sign over bUnits, or null to leave B's own
  recomplementSign: Sign | null;      // Scan 3's sign — null disables the recomplement pass
  mode: 'add' | 'zero';
  emit?: (r: LatchTraceRecord) => void;
}
export interface AddPassResult {
  cout: Latch; zb: Latch; ovf: Latch; la: number; lb: number;
  digits: number[]; recomplemented: boolean;
}
export function* addPass(ctx, o): Generator<LatchTraceRecord | undefined, AddPassResult, void>;
```

**Why `recomplementSign` and not the `recomplement: boolean` the review's sketch carried.** Today's
Scan 1 writes **no** sign (`bCell & ZONES` over the units position — `alu.ts` ~315, the nine
plus-sign oracle cases and §4.1's *"when the machine develops or changes a sign"*), and the only
sign the pass ever writes is `zoneOfSign(aSign)` on the Scan-3 recomplement, `aSign` coming from
`selectAddCycle`. A single `writeSign` plus a `recomplement: boolean` therefore has nowhere to put
that sign and breaks tier-3 02333 / 02433 / 02485 and every plus-sign case — the exact opposite of
Wave A's gate. Two nullable sign slots is the smallest shape that expresses both scans, and
`recomplementSign: null` is also how multiply says "no Scan 3 here" (§4.5: its complement-add is
corrected by a shift-and-true-add).

**Who owns what, explicitly** — everything the pass does today that is not per-position arithmetic
moves **out** to `addToStorage`, which keeps its signature and its yields:

| Owned by `addPass` | Owned by `addToStorage` (the `A S ? !` wrapper) |
|---|---|
| the digit loop, carries, the Scan-3 pass, the trace records | `cycle` and `recomplementSign` from `selectAddCycle(opts.subtract, signOf(aUnitsCell), bSign)` |
| `cout` / `zb` / `ovf` **reported**, never latched | `writeSign` from the `A S ? !` rules already commented in `alu.ts` |
| `recomplemented` reported | `ctx.recomplement = result.recomplemented ? 1 : 0` — Figure 7's `R` (§1.5) |
| nothing else | `setZeroBalance` / `setArithOverflow`, and `ctx.sym.LA = la`, `LB = lb`, `LW = Math.min(la, lb)` |

`addToStorage` passes `positions: 'bWordMark'` and the `recomplementSign` it computed. The review
named three fields; six ship, each for a machine fact — `aUnits` because multiply re-runs one
multiplicand against a moving window, `cycle` because a partial product has no signs to derive
from, `recomplementSign` for the Figure 12 rule above. Indicator ownership leaves the primitive:
`muldiv.ts` calls `setZeroBalance` for `@` and `setDivideOverflow` for `%`, `addPass` calls
neither — §8's *"the overflow condition can be detected only during an add or subtract
operation"* (A22-0526-3 p.53) made structural.

`mode` keeps exactly today's two meanings and gains **no** third: `'add'` adds the A digit to the
B digit, `'zero'` **stores** the A digit (that is ZA/ZS, `alu.ts` ~289 — not "writes zeros"). So
multiply's product-zeroing scan is **not** a `mode`: it is a four-line loop in `muldiv.ts` before
the first partial add. A `'clear'` mode would be a primitive grown for one caller.

### 3.2 `@` Multiply — §2 p.19-20, §4.5

**Fields.** A is the multiplicand at its **units** position; B the product field at its units
position *"with the multiplier image pre-placed in the high-order positions of B",
`len(B) = digits(multiplicand) + digits(multiplier) + 1`* (row `semantics`, verbatim).

**Walk.** First a plain loop in `muldiv.ts` zeros the product positions right of the multiplier
(§3.1: no `mode` does this). Then per multiplier digit, right to left: **1-4** causes that many
true-adds of the multiplicand, the digit decremented each cycle, zero ending the group and
shifting the window one left; **5-9** causes tens-complement complement-adds in the low-order
positions, then a left shift and a true-add starting in the tens position — digit 8 costs three
cycles, not eight (Figure 14). Each is one `addPass` call, `writeSign: null`,
`recomplementSign: null`.

**The window width is ours, not the manual's.** §4.5 and Figure 14 describe the digit-group
algorithm; **no source states the width of the partial-product adder window.** `positions` =
multiplicand length + 1 is an *implementation choice* — one carry position beyond the operand —
carried as `// OPEN: ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE = true` (shared with `%`, §3.3) with
a row in §9. Its check is the fixtures: any window too narrow loses a carry and the ten tier-3
products and quotients go wrong.

**Termination**, row `terminatesOn` verbatim: *"word marks over high-order multiplicand and over
high-order multiplier image in B; ends when the multiplier image is exhausted."* The image is
destroyed as consumed.

**Zones and sign.** Multiplicand zones undisturbed; zones anywhere in the product area eliminated
**before** development; multiplier zones eliminated during it. Units signs sampled first — **like
signs → plus, unlike → minus** — written into B's units position at the end, B+A for plus, B alone
for minus (§4.5, §4.1).

**Indicators:** `['zeroBalance']`, and §8's correction is the load-bearing half — **multiply never
sets arithmetic overflow**, even when high-order multiplicand digits are cut off by the B word
mark. **Registers:** `NSI / A-LA / B-LB`, fully evaluable; the executor only reports `LA`/`LB`.
**Chaining:** not address-double (§1.4, the 1401 trap). L=6: `AAR ← A`, `CAR ← A`, **BAR chained**,
D cycle sets `DAR ← BAR`, `E = 1`. L=1: registers untouched, D cycle **and then** C cycle, `E = 2`
— already in `cycles.ts` `eTerm`.

### 3.3 `%` Divide — §2 pp.20-21, §4.6

**Fields — the easiest thing on the machine to get wrong.** A is the **units** position of the
divisor. B is the **leftmost position of the DIVIDEND**, `len(divisor) + 1` positions in from the
left end of the quotient/dividend field; `len(B) = digits(divisor) + digits(dividend) + 1`.
Figure 17: divisor `12`, dividend `14700`, an 8-position field holding `00014700`, B-address on the
`1`. Note 1 on p.21 is why the fixture carries `Field.from`: starting at the left end of the whole
field gives wrong quotients **and** spurious divide overflows.

**Walk.** Repeated complement-add with true-add correction and shift — `addPass` calls with
`cycle: 'complement'`, `writeSign: null`, `recomplementSign: null`, the window stepping right one
position per quotient digit. `positions` = divisor length + 1 is the **same implementation
choice** as multiply's, under the same `ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE` constant: §4.6
gives the field layout and the algorithm, not the adder window. Quotient positions pre-zeroed by
the program (the recommended `ZA`, §4.6); an unsigned divisor is assumed positive.

**Termination**, verbatim: *"word mark over the leftmost position of the divisor; the division is
stopped by the sign in the units position of the dividend. A B-field word mark left by a preceding
ZA is ignored but retained."*

**Results.** Quotient leftmost, its units at (units of dividend) − len(divisor) − 1; remainder
rightmost; quotient sign algebraic; **the remainder takes the sign of the original dividend**; the
dividend is destroyed except for the remainder.

**Indicators:** `['divideOverflow']` only. §4.6's own words, hedge included: a quotient field
**two or more positions too small "usually does"** raise it; an improperly addressed dividend
does; **division by zero always** does. One position short raises nothing and silently corrupts
the neighbour, a programming error the machine does not check. 1b encodes only the two
determinate cases — divide-by-zero → always, one position short → never — which is exactly what
the Wave B vector list tests; "usually" is not a rule an emulator can implement and is not
implemented.
Divide sets neither arithmetic overflow nor zero balance (§8). **Registers:** `NSI / A-LA /
special`, `special` = the **tens position of the quotient field**. **Chaining** as `@`: not
address-double, D cycle then C cycle at L=1, `E = 2`.

### 3.4 `T` Table Lookup — §2 pp.29-30, §5.1

**Fields.** A = rightmost position of the search argument; B = rightmost character of the whole
table. Each table field is an implicit B field — argument rightmost, function leftmost — with a
defining word mark at its leftmost position, and must be **exactly as long** as the search argument
for the search to continue.

**The table-argument scan, and the trap in it.** Row `semantics`, verbatim: *"At the start of each
search cycle the C-address register receives the A-address and, on a miss, replaces it in AAR so
the search restarts one position left of the table field word mark."* §5.1 draws the consequence —
**reload AAR from a saved copy at the start of every table-field comparison, not merely decrement
it.** The search runs right to left and the A-field word mark ends each comparison.

**The compare is `tablelookup.ts`'s own, and `compare.ts` is not touched.** `compareFields(ctx)`
is the wrong shape and cannot be reused: it takes no window (it reads `ctx.sym.A`/`ctx.sym.B`),
terminates on a word mark in **either** field, applies the unconditional `SHORT_A_TURNS_HIGH_ON`
rule, calls `beginCompare`/`compareDigit`/`endCompare` itself, returns nothing, and overwrites
`ctx.sym.LA/LB/LW` — all of which `T` needs differently, per table field. Extracting a
`compareWindow` primitive from it would edit a file no wave owns (§2) to save a dozen lines, so
`tablelookup.ts` instead walks its own window with **`collateRank` from `bcd.ts`** — already
exported, and already the collating order `compare.ts` itself uses (§5.2: all BA8421 bits, no C
bit, no word mark). Right to left, the leftmost unequal position decides; all-equal is equal.

**Latch scope — an unstated choice, so it is named.** §5.2's *"once the B=A indicator is turned
off during an operation it cannot be turned on again for the rest of that operation"*
(223-2588-2 p.24) is written for `C`, one operation with one comparison. A `T` is one operation
with **many** comparisons, and §2's `T` row says the four latches come *"from the **last**
argument comparison"* — which the per-operation reading makes impossible, since after one miss
equal could never come back on and no `d = 2` lookup could ever hit. The rows differ, so:
`// OPEN: TABLE_LOOKUP_RESETS_COMPARE_PER_FIELD = true` — the sticky-equal rule is scoped to one
table-field comparison, and `tablelookup.ts` reports each field's verdict with
**`ctx.indicators.setCompare(result)`**, which is `beginCompare` + `compareDigit` + `endCompare`
in one call and is documented for exactly this — an operation that already knows its verdict.
(`setCompare` is the right method **because** the per-position sticky rule is applied in this
file's own loop, not because the group reset is free.) The end-of-table HIGH is its own
`setCompare('high')`. Fallback recorded in PHASE-1B-NOTES §1, row added to `open-questions.md`,
and Wave C ships **the vector that separates the two readings**: a miss on table field 1, an equal
hit on field 2.

**The d-modifier compare-condition** is a three-bit mask over the result — 1 lower, 2 equal, 4
higher (`open-questions.md`, Table-Lookup row) — giving the row's map: `1` lower, `2` equal, `3`
equal or lower, `4` higher, `5` unequal, `6` equal or higher, `7` stop on any, blank = search to end
(Figure 25). Satisfaction is `(dMask & bitOfResult) !== 0`; `7` stops unconditionally; blank never
satisfies. **Which side is "high" is not printed:** §5.2 says Compare compares **B to A, never A to
B**, and `T` shares that latch set, so *high* means the table argument collates above the search
argument — `// OPEN: TABLE_LOOKUP_COMPARES_TABLE_TO_ARGUMENT = true`, corroborated by
`open-questions.md`'s LEH-with-ascending-order note.

**End of table.** A table field **shorter** than the search argument ends the operation and turns
**HIGH** on, BAR immediately left of that short field; on a hit, BAR = the function immediately
left of the stopping argument. Both `'special'`; AAR is `A−LW`, evaluated by `regs.ts` from the
`ctx.sym.LW` **the executor sets** — the search-argument length, since that is the length every
comparison reads. `ctx.sym.LB` takes the table positions actually stepped (the `B` of
`4.5(L+1+B+NA)`) and `ctx.terms.N` the number of table fields compared; both are the executor's
to report, and a miss must not leave either holding one field's worth. **Chaining:** chaining `T`
at I ring 1 initiates a **C cycle** to update CAR, not a D cycle (§1.4); `E = 1`, Figure 7
grouping it with `A S ? !`.

### 3.5 `Z` MCS — §2 pp.27-28, §5.3

**What it shares with `E`, and what it does not.** Shared: the *idea* of zero suppression and the
blank fill. **Not shared, so `mcs.ts` and `edit.ts` share no code:** `Z` has no control word, no
scan ring, no auto-set word mark, no skid cycles, no extension latch, no floating `$`, no decimal
control, and its BAR is the evaluable `B+1` where `E`'s is `'special'` over eight cases. Fusing
them is the speculative abstraction the project rules forbid.

**Walk.** `[likely]`, and the only reading consistent with the printed `AAR = A − LA`: a
**right-to-left copy from the units position** (A unchanged), then a **left-to-right suppression
pass** over B, leaving `BAR = B + 1` (§5.3; plan §10). `// OPEN:
MCS_RIGHT_TO_LEFT_THEN_SUPPRESS = true`. Corroboration is SimH `OP_MSZ` alone, which by
`METHOD.md` counts one tier below its stated label.

**Termination**, verbatim: *"A-field word mark defines the length moved; B-field word marks inside
the moved area, including its leftmost position, are removed."* **Suppression** blanks high-order
zeros and commas and strips the zone bits from B's units (sign) position; *"alphabetic and most
special characters (e.g. `@`) count as non-significant, so suppression can restart to their
right"* — the sentence that makes this more than a leading-zero loop. SimH also treats `-` and `.`
as pass-through; no manual says so, so `// OPEN: MCS_PASSTHROUGH_CHARS` names them and follows it.
**Indicators:** none. **Registers:** `NSI / A-LA / B+1` — both evaluable, no executor register work.

### 3.6 `E` MCE — §7

**Edit-control characters** (§7.1, Figure 28 p.32). `b` → replaced by the corresponding A
character. `0` → suppression code, replaced by its A character; the **rightmost** `0` marks the
rightmost limit of suppression. `.` stays unless decimal control is in effect and the field had no
significant digit. `,` undisturbed unless suppression reaches it with no significant character to
its left. `CR` / `-` → body undisturbed, status blanked (both positions for `CR`) if the A sign is
plus. `&` → a blank, usable in multiples. `*` and `$` → status undisturbed, and **two rules each,
in opposite directions** (encoding only one of the two is the mistake this paragraph exists to
prevent): in the body **right** of the suppression code either is treated as a blank — **§7.1,
which states this for both characters**; in the body **left** of the suppression code an `*`
**enables asterisk protection** — **§7.2, which states this for `*` only** — and a `$` **enables
the floating dollar**, which **no subsection states** and which the latch table below carries as
the marked parallel of the `*` rule. §7.2: *"Asterisk protection and floating dollar
sign cannot be used in the same control field"* — the invariant that makes the two latches
mutually exclusive, and an assertion in `edit.ts`, not a comment.

**The four latches, and what sets each — all tested on scan 1, and each cited to the subsection it
actually comes from.** They are spread across §7.1, §7.2 and §7.6, not all in §7.2; the earlier
draft of this plan said "all §7.2" and only two of the four are literally there. Nothing below is
derivable from the control characters at write time; the scan sets them, and §7.6's termination
test then reads them, so this table is the whole of the two-scans-or-three decision.

| Latch | Set during scan 1 by | Consequence | Cite |
|---|---|---|---|
| zero suppress | a `0` sensed in the body (the suppression code) | if it is **off** when the B-field word mark is sensed, scan 1 **is** the operation — the one-scan case | set: **§7.1**, the `0` control-character row (*"Zero-suppression code … the rightmost `0` marks the rightmost limit of suppression"*). Consequence: **§7.6**, quoting S223-2698 p.50 — *"If the zero suppress latch is not set when the B-field word mark is sensed, the first scan and the edit operation end"* |
| asterisk | an `*` in the body **left** of the suppression code | scan 2's reverse fill writes `*` instead of blanks; still a two-scan operation | **§7.2**, *Asterisk protection (2 scans)*, verbatim: *"An `*` in the body **left** of the suppression code enables it"*; the two-scan consequence is §7.6's *"asterisk fill is done inside scan 2"* |
| floating dollar | a `$` in the body **left** of the suppression code | forces scan 3 **regardless** of anything scan 2 establishes; scan 3 writes `$` into the first blank and stops | **inferred, and marked as such: the enable condition is nowhere stated.** §7.1's `$` row states only the mirror — *"Body: floating dollar sign; a `$` in the body to the right of the suppression code is treated as a blank"* — so *left* enabling it is the **parallel of §7.1's `*` row**, whose left/right pair §7.2 does state. §7.2's *Floating dollar sign (3 scans)* supplies the consequence and the "cannot be used right of the decimal point" restriction. Encode the inference, not a §7.2 quotation |
| decimal control | a `.` in the body **left** of the suppression code | the point prints only if the field has a significant digit; with **no** significant digit a third scan blanks the zeros right of the point and the point itself | **§7.2**, *Decimal control*, verbatim: *"A point in the body left of the suppression code makes the point print only when the field has significant digits"* |

**Body vs status** (§7.1): the body begins at the **rightmost blank or zero** and runs left until
the A-field word mark; everything else is status. Do not encode the wording error §7.6 flags —
A22-0526-3 p.33 says the *B-field* word mark ends the body; it is the **A-field** word mark
(S223-2698 p.50).

**The scan ring and the two skid B-cycles** (§7.6, transcribed as the executor's structure):

| Phase | Direction | BAR delta / B-cycle | Starts at | Ends when | Word mark |
|---|---|---|---|---|---|
| Scan 1 | right → left | −1 | B-address | B-field high-order WM read | writes back **without** the WM |
| Skid 1→2 | — | +1 | `B_high − 1` | one cycle | rewrites, **preserving** any WM |
| Scan 2 | left → right | +1 | `B_high` | auto WM at the `0` code read | writes back without the WM |
| Skid 2→3 | — | −1 | suppression code + 1 | one cycle | rewrites unchanged |
| Scan 3 | right → left | −1 | suppression code | `$` stored into first blank, **or** decimal point read | `BAR = terminating address − 1` |

A-cycles run **only during scan 1**, decrementing AAR, stopping at the A-field word mark. BAR is
modified on **every** B-cycle *including the terminating one* (S223-2698 pp.50-51; cube1us
`scan_mod[] = { 0, -1, +1, -1 }`). Both skids are real storage references outside the declared B
field, and the first **preserves** the word mark it finds — cube1us stores it with `AsmChannelWMB`
where every other MCE store uses `AsmChannelWMNone` (§7.5).

**Scan-2 termination**, quoted (S223-2698 p.51) and read entirely off the latch table above: the
operation ends at the end of scan 2 if the
floating-dollar latch is off and either the decimal-control or zero-suppress latches are off when
the B-field word mark is sensed, or the character read out with the word mark is a significant
digit; a floating-dollar latch set during scan 1 forces a third scan regardless. **Asterisk fill
happens inside scan 2, so asterisk protection is a two-scan operation.**

**The eight-case BAR table** (§7.3) is the row's `'special'`, a `switch` on the termination case
carrying each row's text in its comment. `IAR = NSI` and `AAR = A − LA` in all eight:

| Case | Scans | BAR after |
|---|---|---|
| No `0` anywhere in the control word | 1 | `addr(B high-order WM) − 1` |
| Plain zero suppression | 2 | `addr(suppression code) + 1` |
| Asterisk protection | 2 | `addr(suppression code) + 1` |
| Sign control left | 2 | `addr(suppression code) + 1` |
| Decimal control, **has** a significant digit | 2 | `addr(suppression code) + 1` |
| Decimal control, **no** significant digit | 3 | `addr(decimal point) − 1` |
| Floating dollar sign | 3 | `addr($ store position) − 1` |
| Floating dollar **and** decimal control | 3 | `addr(first blank-or-decimal read in scan 3) − 1` |

**Word marks — both unconditional yes** (§7.4). The high-order B word mark is **always** removed
during scan 1, in every variant *including the single-scan case no manual traces* (*"a word mark is
gated to the B-field only when the low-order 0 in the control word is sensed"*, S223-2698 p.50);
the auto-set word mark at the suppression code is **always** erased before the end (step 46).

**Extension latch** (§7.2), and the nuance that decides step 36: when the A-field word mark is
sensed the body latch resets and the extension latch sets, a comma read from B becomes a blank, and
the A character **already in the A-data register is still stored** into B on the following B-cycle
— only further A-*cycles* stop. **Truncation:** the B-field word mark hard-stops the forward scan,
so `A − LA` holds **only for legal usage** (§7.3). **The A field is never written** (Figure 27).
**Indicators:** none.

**Three traps.** Do not copy SimH's `OP_E` (§7.6) — its single-scan decision reads a byte outside
the control word (a behaviour change) and both skid storage references are missing;
`simh-deviations.ts` carries `edit-op-e`. Do not quote the 1401: A24-1403-5 Figure 58 traces the
identical example in 41 steps, 3-digit addresses, **no skid row**. And the one 1401 habit that
changes an **answer** rather than a trace — §7.6, 223-2588-2 p.53 `[verified]`: *"**Single
Character Edit** — if the specified A-field in an edit operation contains a word mark in the units
position (a single character field), the 1401 system will **not** transfer this single-character
field to the B-field. The **1410 will** transfer and edit this single-character field."*
`open-questions.md`'s MCE row names exactly this as the reason not to port the 1401 rules by
analogy. Wave D ships it as a tier-1 vector: a one-character A field word-marked in its units
position, a control word with a body — assert the character **is** transferred and edited.

---

## 4. Implementation order

Per wave: Opus workers with the wave's file list as a hard boundary → orchestrator runs
`typecheck`, `test`, `smoke`, `cc01` → Opus adversarial reviewer → fixes → one commit,
`[Scope]: description` with footer `(anthropic claude-code opus-5 / gaiking)`, pushed to
`feature/phase-1b`. `main` is never touched.

**Wave A — the reshape, and the machine check.** *Files:* `alu.ts`, `test/alu-pass.test.ts` (new),
`test/isa-table-vs-research.test.ts` (new), `docs/BUILD-LOG-1B.md` and `PHASE-1B-NOTES.md` (**both
created here**, §2), `docs/research/opcodes.md` (**only** under §2's
correction rule: own commit, manual page cited, verified against that page — and the check is
expected to be green on `main`'s text as it stands, so a correction here is a surprise, not a
step). *Oracle:* **the existing suite, unchanged** — the
**741 existing tests all pass with no edit to any of them**, 10 todo, 0 failed, *plus* the new
`alu-pass` and `isa-table-vs-research` cases (so the printed total rises; the load-bearing number
is 741 unchanged passes, 0 failures, and no edited test); `alu.test.ts`, `signs-fixture.test.ts`,
`exec-arith.test.ts`, `exec-za.test.ts` and tier-3 02300-02596 green with no edits; `smoke` 5
passed; `cc01` byte-identical. Plus one tier-1 test driving `addPass` with `positions: 3`,
`writeSign: null`, `recomplementSign: null`, asserting the counted run stops **without** a word
mark, no sign is written over `bUnits` and no latch moves — the three degrees of freedom the
reshape adds; and one asserting `recomplementSign: '-'` still writes the Figure 12 sign, which is
the tier-3 recomplement cases' behaviour restated at tier 1.

**The machine check is in this wave on purpose (§5).** It depends on nothing a later wave builds
and goes green against `main`'s `opcodes.md` §2 before a single row is touched, so it guards
Waves B-D. Written in Wave E — beside the rows it checks and by the same workers — it would be a
rubber stamp, and its failures could be "fixed" by editing the research prose.

**Wave B — `@` and `%`.** *Files:* `muldiv.ts` (new), `exec/arith.ts`, the `@`/`%` entries of
`table.ts`, the `types.ts` + `cpu.ts` hunks, `oracle/note1410/arith.ts`,
`test/tier3-arith.test.ts`, `test/isa-table.test.ts`, `docs/research/emulators.md`,
`docs/research/open-questions.md`, `docs/research/opcodes.md` (§2's correction rule),
`test/tier1-muldiv.test.ts` (new), `docs/BUILD-LOG-1B.md`, `PHASE-1B-NOTES.md` (§2 — this wave's
log entry, the `[derived]` deviation and the `emulators.md` correction).
*`open-questions.md` is in this wave because this wave's fixture headers cite `[derived]`, and the
definition has to exist before the citation does:* Wave B **opens** the `## Phase 1b` section with
the one-paragraph definition (§9) and the `ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE` row. A wave
that ships a fixture header carrying a tag defined nowhere is the slip the Phase 1 final review
already caught once.
*Two things in that list are there because they go red otherwise.* `test/isa-table.test.ts`:
`BUILT_SO_FAR` gains `@ %` (or line 225's *"every executor a later wave still owes is a loud
stub"* fails — a real generator returns a generator instead of throwing `/executor not built
yet/`) and line 128's *"`@ % T Z E` are `implemented: false`"* narrows to `T Z E`. And
`docs/research/emulators.md`: this wave's fixture claim contradicts it, so this wave corrects it —
§5.2's 02300-02968 row and summary point 4 are amended to say the multiply (02600-02644) and
divide (02700-02766) sub-blocks carry **field addresses and contents only, no latch lines**, the
ZA/ZS/add/subtract/move half left standing. Own commit, logged in PHASE-1B-NOTES §3.
*Oracle:* **the ten `todo`s in `test/tier3-arith.test.ts`** —
that is the tier-3 file they live in: four `@` cases (02600, 02611, 02622, 02633) and six `%`
(02700, 02711, 02722, 02733, 02744, 02755), turned green by deleting the `pending`/`test.todo`
branch so the sub-blocks run halt-terminated like the other three (`@` 02600→02644, `%`
02700→02766).

*Be exact about what that oracle is.* `insttest.cor` plus `oracle/note1410/arith.ts` is a real
fixture: the image supplies the instructions and operand fields, the test already asserts every one
character by character, and running the block asserts the halt address, the register chain and the
indicators. But the fixture's own header says it — *"The note gives field addresses and contents
and NOTHING ELSE — no latch lines at all."* So `expected` stays empty and the **`resultField`
values are hand-derived** from `opcodes.md` §4.5 / §4.6, both `[verified]` rules — 02600 multiplies `18J` (181,
minus) by the pre-placed image `8B` (82, plus), unlike signs, so B ends `01484K`; 02700 divides
`000720I` (7209 plus, B-address 10405, three in for a 2-digit divisor) by `8N` (85, minus). Each
entry carries its arithmetic and citation in a comment plus the words **"`[derived]` — hand-derived
from `opcodes.md` §4.x; no published trace exists for this case."** They are not `[observed]`
(nothing was established by running this emulator) and not `[verified]`, and rather than leave that
as prose in a plan, **`[derived]` is defined once** — in `open-questions.md`'s Phase 1b section, as
a **fixture-provenance** label for a value computed from `[verified]` rules, explicitly distinct
from and not added to `METHOD.md`'s four research tags (§1 non-scope). 02755 is the note's own
behavioural claim, *"puposely mis addressing, causing an overflow"*, asserted as `divideOverflow`
on, zero balance untouched. Supporting tier-1 vectors, hand-derived with citations: the Figure
15-17 layout (`12` into `14700`); division by zero → overflow always; a quotient one position short
→ **no** overflow and a corrupted neighbour; multiplier digits 1-4 vs 5-9 taking the two documented
cycle groups; a multiplicand truncated by the B word mark raising **no** overflow (`opcodes.md` §8).

**Wave C — `T` and `Z`.** *Files:* `tablelookup.ts`, `mcs.ts` (new), `exec/arith.ts`,
`exec/move.ts`, the `T`/`Z` entries of `table.ts`, `test/isa-table.test.ts` (`BUILT_SO_FAR` gains
`T Z`; the implemented-false case narrows to `E`), `test/tier1-tablelookup.test.ts`,
`test/tier1-mcs.test.ts` (new), `docs/research/open-questions.md` (the
`TABLE_LOOKUP_RESETS_COMPARE_PER_FIELD` and `MCS_PASSTHROUGH_CHARS` rows §3.4 and §3.5 require
before the constants citing them ship), `docs/research/opcodes.md` (§2's correction rule — this is
the wave that reads §5.1-§5.3 closely), `docs/BUILD-LOG-1B.md`, `PHASE-1B-NOTES.md` (§2 — the log
entry and the three `Z`/`T` fallbacks §3.4 and §3.5 send to §1).
*Oracle:* **hand-derived vectors — no fixture exercises either op semantically.** `insttest.cor` 00800 holds the `Z` length/decode block and 01100 the `T` one;
`note1410.txt` names both and annotates neither, and PHASE-1-NOTES §3 records that `ilentest.cor`
and `insttest.cor` are **byte-identical over 00000-02599**, so tier 2 already walks those exact
bytes (`emulators.md` §5.2: the length blocks are *"decode tests only"*, oracle = the post-decode
AAR/BAR/IAR). `T` gets one vector per d value (`1`-`7` and blank) over a
deliberately **asymmetric** ascending table, the CAR-reload case (a miss restarts one position left
of the table field's word mark, not of where the comparison stopped), the end-of-table case (short
field → HIGH, BAR immediately left of it), a hit's BAR on the function character, and **the vector
that separates the two latch-scope readings** (§3.4): a miss on table field 1 followed by an equal
hit on field 2, which can only pass if the compare group resets per field —
`opcodes.md` §2 pp.29-30, §5.1, §5.2. `Z` gets what §2 pp.27-28 and Figures 23-24 describe: leading zeros and commas blanked, units
zones stripped, a B word mark inside the moved area removed, and the restart-right-of-an-alphabetic
case. Both headers state **"hand-derived from the Principles of Operation; no fixture exercises
this op"**; `Z`'s names `MCS_RIGHT_TO_LEFT_THEN_SUPPRESS` as `[likely]`.

**Wave D — `E`.** *Files:* `edit.ts` (new), `exec/move.ts`, the `E` entry of `table.ts`,
`test/isa-table.test.ts` (`BUILT_SO_FAR` gains `E`; the implemented-false case is **deleted**, its
last op having landed), `oracle/mce-figure34.ts` (new), `test/tier1-mce.test.ts` (new),
`docs/research/open-questions.md` (whatever the confirmation read leaves open),
`docs/research/opcodes.md` (§2's correction rule — the confirmation read of A22-0526-3 pp.31-35 is
exactly the primary-source read that can prove a §7 or §2 line wrong, and this is the only wave
holding that page), `docs/BUILD-LOG-1B.md`, `PHASE-1B-NOTES.md` (§2 — the log entry, the yield
convention logged as a deviation, and whether the confirmation read closed).

*Where the trace comes from, honestly.* It is **not** an `emulators.md` fixture. `insttest.cor`
00900 does hold an `E` block — it decodes to `_E1111122222 _E33333 _E` against **blank operands**,
a length/decode block (`emulators.md` §5.2, and PHASE-1-NOTES §3's byte-identity note puts it at
tier 2 already) — and `note1410.txt` names it while annotating nothing, so **no image exercises MCE
semantically**. The oracle is **A22-0526-3 Figure 34
(pp.34-35), reprinted as S223-2698 Figures 23A/23B**, and what we hold today is the **hand
transcription in `opcodes.md` §7.3, which prints 14 of the 46 steps** (12, 13, 14, 16, 20, 25, 35,
36, 37, 38, 40, 42, 43, 46) under the heading "key steps". Wave D therefore opens with the
confirmation read PHASE-1-NOTES §4 carries out of Phase 1.

*The yield convention, stated before the fixture is written — the manual's step numbers are not
addressable.* `Cpu.stepCycle()` runs the **whole I phase in one call** (`cpu.ts` ~122-133), so
Figure 34's steps 1-12 collapse into a single cycle; and `alu.ts`'s established convention is one
yield per **B position with the A cycle folded in**, while Figure 34 prints A cycles as steps of
their own (13, 35). So: **`edit.ts` yields once per B-cycle, skids included, A cycles folded in as
`alu.ts` does, and yields `undefined`** — no `LatchTraceRecord`, because `LatchTraceRecord.scan` is
the closed union `'scan1' | 'scan3'` and `unit` is `'units' | 'body' | 'extension'` (`types.ts`
~114-121), with no room for scan 2 or a skid; widening it would cost a second `types.ts` hunk plus
`trace.ts`, which this plan does not budget and MCE does not need. **`oracle/mce-figure34.ts` is
therefore indexed by B-cycle ordinal, not by the manual's step number**, each entry carrying the
manual's step number as a label plus what the test reads after each `stepCycle()`: AAR, BAR, the
data character, the character put back, and the B field from `m.regs` / `m.storage`. Logged in
PHASE-1B-NOTES §2 as a deviation from `phase-1-cpu-core.md` §5's *"asserted at every cycle"*.

*Oracle,* in order of preference: (1) **if the read lands**, all 46 steps mapped onto their
B-cycle ordinals — AAR, BAR, the data-register character, the character put back and the B field
at every cycle; (2) **fallback after two failed attempts** (and only with Tom's ruling on §1's
gate narrowing), the 14 printed steps at their own B-cycle ordinals, the end state (**IAR 00012 /
AAR 12155 / BAR 04677** — `12163 − 8` confirming `A − LA`, `04676 + 1` confirming
suppression-code + 1), the final B field `$  2,574.26    **`, one vector per **eight-case BAR
row**, the skid at **04668** proving the neighbour's word mark survives, the single-character-edit
vector (§3.6), and the §7.4 / §7.2 invariants. Either way the fixture header says which it is, and
`PHASE-1B-NOTES.md` §4 records whether the open item closed.

**Wave E — the generalised inverse, documents.** *Files:* `test/isa-table.test.ts`
(`BUILT_SO_FAR` complete, and the `implemented: false` case's **generalised inverse** installed,
§7 criterion 5), `docs/BUILD-LOG-1B.md`, `PHASE-1B-NOTES.md`, `docs/research/open-questions.md`
(**closing** the Phase 1b section Wave B opened — outcomes, fallbacks, constants; not new rows),
`docs/STATUS.md`. **`docs/research/opcodes.md` is deliberately not here:** Wave E records research
corrections, it does not make them, and a §2 edit in the wave that signs the check off is exactly
the circularity §2's rule forbids. The machine check itself shipped in Wave A. *Oracle:* the check still green
against `opcodes.md` §2 including any correction Waves B-D made to it, and §7's exit criteria all
verified by the orchestrator's own run.

---
## 5. The isa-table machine check

From the Phase 1 final review (`docs/STATUS.md`): *"`semantics`, `terminatesOn` and the d-modifier
maps are transcribed by eye today, and the table is only worth diffing against the research if
drift is caught by the suite rather than by a reader."* One new test file, and not a small one:
the slicer with its 10-cell tripwire, the four normalisations, the printed-order pairing with its
count assertion and two named exemptions, a `regs` splitter carrying four cell shapes, the
indicators and `dModifiers` maps with their allowlists, the Jaccard comparator with its exact-token
rule, and the failure printer — **~450-600 lines**, plus §7 criterion 6's perturbed-pair liveness
case in the same file. (An earlier draft of this section said ~200; that predates most of what the
section now specifies.) Shipped in **Wave A** (§4) so it guards the rest of the phase. **No `src/`
change** — bullet 7's ~1,000 counts `src/`, and this file is not in it.

**Parsed.** `opcodes.md` is in-repo, so no fetch and no skip. The test slices from
`## 2. Complete instruction table` to `### 2.1`, keeps `| ` lines that are not header or separator,
and splits on `|`. **A row not yielding exactly 10 cells fails loudly** — the tripwire against a
future column change. Column 1 gives op character and octal (`` `@` (014) ``); the rest are
Autocoder, Lengths, d-modifiers, Semantics, Indicators, Terminates on, Registers, Timing, Cite.
§1.4's address-double list is parsed from its own sentence.

**Four normalisations, all of them load-bearing — this spec was run against `main`'s text and
these are what it hit.** Without them the check red-lights on a table nobody has touched.

1. **Confidence tags.** Strip `[verified]` / `[likely]` / `[observed]` / `[unverified]` from the
   markdown side before comparing. `P` and `Q` score Jaccard **0.80** without this, purely because
   their `Semantics` cells end in a tag `table.ts` does not carry.
2. **Unicode.** §2 writes register expressions with **U+2212 MINUS SIGN** (`A−LA`, 94
   occurrences); `table.ts` writes ASCII `-` (`'A-LA'`). Fold U+2212 and U+2014 to ASCII `-` on
   **both** sides before tokenising, or every arithmetic row fails on its register tokens. (This
   plan's own prose mixes the two; the test does not care, but a reader should know why.)
3. **Duplicate op characters.** §2 prints **42 rows for 35 ops** — `A`, `S`, `?`, `!`, `/`, `J`
   and `.` each have two. Dedup-preserving-order before comparing the op sequence to `ALL_OPS`.
4. **Row → OpForm pairing, keyed on printed order — not on any parsed cell.** 42 rows against 46
   `OpForm`s. Within an op, §2's rows **in the order printed** pair with that op's `forms[]` **in
   index order**. That key is not invented for this check: it is the invariant `table.ts`'s own
   header already asserts — *"This file MIRRORS opcodes.md §2 ROW FOR ROW, in the same order …
   If §2 gains a row, this gains a row"* — so the check enforces a claim the file makes about
   itself, and needs no second key. **The guard is a count assertion**: rows-for-op must equal
   forms-for-op, and a mismatch fails loudly, so a future extra form on either side is caught
   rather than skipped. It fails on exactly **two** ops, both deliberate and both allowlisted by
   name: `,` and `⌑`, where §2 prints **one** row and `table.ts` carries **three** forms because
   the register cell prints three results (plan §4.2, and `table.ts`'s header says so). 42 + 2×2
   = 46 accounts for the whole discrepancy. Their one row pairs with `forms[0]` for the scalar
   columns and `terminatesOn`; their `regs` cell splits three ways onto all three forms (below);
   their `semantics` is not compared, and the measurement below says why.

   **An earlier draft of this plan keyed the pairing on the Lengths cell.** That does not survive
   contact with `main`'s text — it needs to parse the one column the next-but-one paragraph
   declares unparseable, and it is wrong on `U` (*"**5** (`U x1x2x3 d`)"* scrapes to `{5,1,2,3}`
   against `[5]`), `$` (*"`$ bbbbb d`"* scrapes to `[]` against `[7]`), `N` (*"any (1, 2, 3, …)"*
   against `ANY_LENGTH`) and `Y` (*"7 (interruptible), 1 (non-interruptible)"* against `[1, 7]`,
   order-sensitive). Printed order costs no parse and is checkable by eye against either file.

**Compared exactly:** the deduped op-character sequence against `ALL_OPS` (measured identical on
`main`, all 35 in the same order); each `octal`; `addressDouble` against §1.4's own one-line list
(*"`A`, `S`, `?` (ZA), `!` (ZS), `,` (SW), `⌑` (CW), `/` (CS), `J`, `R`, `X`"* — a backtick-glyph
sentence of its own, which is what makes it parseable); the `indicators` head clause and the
`dModifiers` key set, each with the exemptions below; and **`regs` / `regsNotTaken`** — the column
§3 spends most of its pages on and the most drift-prone structured column in the table, so it does
not get to sit out.

**`regs` / `regsNotTaken`, in detail, because the cell has four shapes and all four occur on
untouched text.** Normalise first: strip confidence tags, backticks and `**`; fold U+2212 / U+2014;
close the spaces around `+` and `-` (§2 prints `B + LB + 1` where `table.ts` writes `B+LB+1`); drop
a trailing parenthetical and everything from the first sentence break — `J`'s *"(both A and B
registers hold the branch-to address)"* and `Y`'s *"…NSIB. Return address = BAR **minus six**"* are
the two that need it. Then split on ` · ` into results, and strip each result's label:

| Cell shape | Where it occurs | Maps to |
|---|---|---|
| a bare `IAR / AAR / BAR` triple | most rows | the paired form's `regs` |
| `taken: … · not taken: …` | `V` `W` `X` `B` `R`, and `J` row 2 | `regs` / `regsNotTaken` of the **one** paired form |
| `taken: …` with no ` · ` at all | `Y` only | `regs`; `regsNotTaken` is absent and nothing is asserted about it |
| `2 addr: … · 1 addr: … · chained: …` | `,` and `⌑` | the three results onto `forms[0]`, `forms[1]`, `forms[2]` **in printed order** — measured: `NSI / A−1 / B−1`, `NSI / A−1 / A−1`, `NSI / Ap−1 / Bp−1` against the forms with `lengths` `[11]`, `[6]`, `[1]`, which is the printed order in both files |

A cell that yields **two** `/`-parts rather than three (`D`'s *"NSI / see §3.2"*) is IAR plus one
prose clause covering **both** address registers. Any part that is not a Figure 8 address
expression is `'special'` — `T`'s *"address of the function immediately left of the stopping table
argument"*, `%`'s *"tens position of the quotient field"*, `E`'s *"varies — see §7.3"*, and `/`'s
*"bbb00−1"*, which `table.ts` also carries as `'special'`. **Two rows are exempt by name:** `=`
(*"BAR forced to 299"*) and `$` (`—`), whose cells state no triple at all and whose `table.ts`
value is the named `REGS_NOT_STATED_7010` fallback — an `// OPEN:` constant with its own
`open-questions.md` row, so comparing it to prose would assert the guess.

**`lengths` is NOT in this check.** `oracle/lengths.json` already owns that column
(`test/isa-table.test.ts` pins every op against it), and §2's Lengths column prints ~18 distinct
forms — `**5** (`U x1x2x3 d`)`, `` `$ bbbbb d` ``, `7 (interruptible), 1 (non-interruptible)`,
`7 (`G ccccc d`)`, `6 (`. iiiii`)`, `—` — that a digit-scraper reads wrong in at least five
places. Duplicating a working oracle with a parser that needs six special cases is the opposite of
this file's job.

**Indicators — head clause only, and only for the ops that have one.** Several §2 cells name an
indicator in order to **negate** it, so any map over the whole cell is wrong on exactly the two
ops 1b is promoting: `@` is *"**zero balance only** — multiply never sets arithmetic overflow"*
against `['zeroBalance']`, and `%` is *"**divide overflow only** — divide never sets arithmetic
overflow or zero balance"* against `['divideOverflow']`. Same shape on `J` conditional, `X`, `R`
and `F`. So: split each cell at the first ` — ` and map **only the head clause**, then cut it again
at the first `,` (`T`'s *"…unequal, from the last argument comparison"*), drop parentheticals
(`C`'s *"high (B>A)"*, `B`'s *"(shared with Compare and Table Lookup)"*) and a leading *"sets"*;
treat `none` as `[]`; compare as a **set, not a sequence** — not because the two sides
disagree today (`A`'s two rows print the two latches in opposite orders and `table.ts` mirrors each
row's order, so a sequence compare is green on `main` too), but so that reordering a list in either
file later is a reword rather than a build break. Assert exact equality only for an **explicit
allowlist of ops whose cell is a genuine latch list — `A S ? ! @ % T C B`**, all nine measured
green on `main`. Every
other op asserts `indicators.length === 0` (their cells are channel-status, feature or
cross-reference prose: `=`, `$`, `Y`, `X`, `R`, `K`, `F`, `L`, `M`, `P`, `Q`, `U`).

**`J` is on neither list, and that is the third named exemption.** Its conditional row's cell is
*"the overflow indicators are **reset** by the test that reads them"* — prose that names no latch
to map — while `table.ts` carries `['arithOverflow', 'divideOverflow']` from §8 and `dmods.ts`'s
`J_D_TABLE`, with the row's own comment saying `indicators` cannot express the direction. Putting
`J` on the allowlist red-lights the check on untouched text; putting it on the
`indicators.length === 0` branch red-lights it too, since the length is 2. So `J` is compared on
nothing here and says so in the test. **No general prose→latch parser**, and a test case naming
`@` and `%` as the rows the head-clause rule was written for, so a later simplification cannot
quietly drop it.

**`dModifiers` — key sets, with four cells exempt because they point elsewhere instead of
listing.** `none` → `'none'`, **and so does a bare `—`**: `=` (013, 7010-only) is the one row whose
d-modifier cell is a dash rather than a word, against `table.ts`'s `dModifiers: 'none'`, so the
mapping needs it or the check red-lights on text nobody has touched. `bit mask` / `bit-coded, §6` →
`'bitmask'`; `ignored` / `any character` / `all 64 valid` → `'any'`; `blank` → the single key
`' '`. Where the cell lists glyphs in backticks — `4 K T U V L M P Q G $` — the **key set** must
match, order-insensitively (`Q` prints `E D 3` against keys `3 E D`), and `T`'s trailing
*"blank=search to end of table"* supplies its `' '` key. Exempt by name: `2` and `F` (*"see §6
carriage table"*) and `J` row 2 (*"see §6 J-table"*), whose cells are cross-references, not lists.
And **`Y`**, whose cell prints `‡` while `Y_DMODS` deliberately omits it behind the `// OPEN:`
constant `Y_BQPR2_D_UNVERIFIED` — the check asserts the cell's glyphs **minus `‡`**, and the
constant is why. **A bare `—` is the whole of exactly one other compared cell** — `$`'s `regs`,
already exempt by name above — and every other `—` in the d-modifier, indicators and register
columns (`V`, `Y`, `D`, `@`, `%`, `E`) is a clause separator inside a longer cell, handled by the
head-clause, glyph-list and `'special'` rules.

**Compared loosely:** `semantics` and `terminatesOn`. Both sides normalised as above and further —
lowercased, backticks and `**` stripped, `§`-references and parenthetical see-alsos removed,
punctuation collapsed — then reduced to the multiset of tokens of four characters or more. The
assertion is **Jaccard similarity ≥ 0.9**, *plus* exact equality of every token that is a number,
an address expression (`A-LA`, `B+1`, `bbb00`) or a single op character.

**What 0.9 is, measured rather than asserted.** With the four normalisations applied, **every
one-to-one row/form pair on `main` scores 1.000** on both columns. That includes `T`'s
`terminatesOn`, which an earlier draft of this plan named as the threshold's provenance: §2 does
write *"the table field's word mark"* against `table.ts`'s *"the table field word mark"*, but the
possessive leaves a one-character token that the four-character filter drops, so the pair
normalises to identity and never approached 0.9. The **only** pairs below 1.000 are the two
one-row-three-form ops: `⌑` at **0.923** (§2's one cell against `forms[0]`, which adds *"at the A
and B locations"*) and `,` at **0.545** (§2's *"at the A and B locations, or at A only, or
(chained) at the addresses currently in AAR/BAR"* deliberately split across three form strings).
**So `semantics` is not compared for `,` and `⌑`** — the same two ops the pairing count exempts,
for the same structural reason: a one-cell-to-three-strings split has no meaningful token
similarity, and `⌑` passing while `,` fails is an accident of wording, not a rule. Their
`terminatesOn` (*"fixed — one or two positions"*, identical on all three forms) **is** compared,
and so is every scalar column. 0.9 is therefore **headroom for future rewording, not a fit to any
delta on `main`** — nothing compared is nearer to it than 1.000. An editor may reword a clause,
split a sentence or fix a typo without breaking the build, but cannot change a length, a register
expression, a terminator or a digit without the suite saying so.

**Every number in this section was produced by running these rules against `main`'s `opcodes.md`
§2 and `main`'s `table.ts` while the plan was written** — 42 rows, all 10 cells wide; 35 ops in
`ALL_OPS` order; 46 forms; the three-way and two-way `regs` splits; the nine-op indicator
allowlist. Wave A's job is to reproduce them. If the shipped check disagrees with a number here,
one of the two is wrong and the wave resolves which **before** it commits — and under §2's rule
the resolution is in the test or in `table.ts` unless a manual page says otherwise.

**Failure.** One `expect` per op per column, named `@ semantics` / `T terminatesOn`, printing the
two normalised strings and the **symmetric difference of their token sets** — the words that
actually moved — not a 400-character diff. No YAML, no schema, no generator: one markdown table
against one TypeScript array.

**And one rule that is not about parsing.** When this check fails, the fix is in `table.ts` unless
a **manual page** says otherwise. Editing `opcodes.md` §2 to make the check pass is a plan
violation (§2's `opcodes.md` row): a research correction is its own commit, cites the form number
and page, and is verified against that page — never against the table it is being compared to.
Wave A ownership plus that rule is what keeps the check from being circular.

---

## 6. Test tiers and gates

1b adds to **tier 0** (the machine check — a transcribed-research check like `lengths.json`),
**tier 1** (the hand-derived `@ % T Z E` vectors and the Figure 34 trace, which is what tier 1 is)
and **tier 3** (the ten `insttest.cor` cases). Nothing at tier 2 — `ilentest.cor` already decodes
all five, and PHASE-1-NOTES §3's byte-identity finding means the `insttest.cor` 00300-01100 decode
the parent plan asks for **is** that tier-2 walk (§1, gate narrowing 2). Nothing at tier 4, tier 5
still deferred.

**At every commit, all four:** `npm run typecheck` clean under `strict` +
`noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; `npm test` (tiers 0-3) green, 0 failed
and from Wave B onward 0 todo — which is why `test/isa-table.test.ts` is in the file list of Waves
B, C, D **and** E (§2, §4): both its `implemented: false` case and its loud-stub case go red the
instant a row flips, so a wave that promotes an op and does not move that file cannot commit;
`npm run smoke` (tier 4) PASS — it still does not *gate* the phase
(plan §7), but a change there is a regression 1b has no business producing; and `npm run cc01`
output **unchanged** — `CC01A`, `CC01 COMPLETE`, instruction check at **00322**, **1241
instructions**, since `cc01.cor` executes none of `@ % T Z E`.
`test/core-is-dom-free.test.ts` covers the four new modules for free.

---

## 7. Exit criteria

1. `npm run typecheck` — clean.
2. `npm test` — **0 failed, 0 todo.** `test/tier3-arith.test.ts` runs five halt-terminated
   sub-blocks, not three: `A` 02300→02391, `S` 02400→02496, `?/!` 02500→02596, `@` 02600→**02644**,
   `%` 02700→**02766**, each stopping on its own `.` Halt with every annotated instruction reached.
3. `npm run smoke` — PASS, 5 passed.
4. `npm run cc01` — `CC01A`, `CC01 COMPLETE`, instruction check at 00322, **1241 instructions**,
   identical to `main`.
5. `test/isa-table.test.ts` — `BUILT_SO_FAR` lists **every** op character in `ALL_OPS` not in
   `DEVICE_DEFERRED` (`F K U`) and carrying no `feature`, and the case *"`@ % T Z E` are
   `implemented: false` with NO feature"* is **replaced by its generalised inverse**,
   `ALL_OPS.every(e => e.implemented || e.feature !== undefined)`: after 1b an unimplemented row
   without a feature tag is a bug, not a phase boundary.
6. `test/isa-table-vs-research.test.ts` — green, and demonstrably live **by a permanent test, not
   by a reviewer's scratch copy**: a case in the same file feeds the comparator a hard-coded
   perturbed pair (one word changed in a `semantics` string, one register expression changed in a
   `regs` triple, one indicator added) and asserts it **fails, naming that op and printing the
   moved tokens**. A liveness proof that leaves nothing behind is not a proof this file's premise
   accepts.
7. `PHASE-1B-NOTES.md` §1 lists every `// OPEN:` constant 1b introduced and whether it was hit —
   checked mechanically, not by eye:
   `git diff main...feature/phase-1b -- src/core test | grep -n 'OPEN:'` must name no constant
   absent from that table (and the table no constant absent from the diff).
   `docs/BUILD-LOG-1B.md` has one entry per wave from the orchestrator's own runs.

**What the owner and a family member can see.** On the internals page (`npm run dev`), MODE = ALTER to key the
Figure 34 edit by hand — A field `00257426`, control word `$bbb,bb0.bb&CR&**`, both word-marked,
then `E aaaaa bbbbb` — and MODE = **I/E CYCLE** to half-cycle it. The B field becomes
`$  2,574.26    **` one storage cycle at a time: scan 1 pulling digits right to left, the
high-order word mark coming off, the skid touching 04668 *outside* the field, scan 2 running back
left to right blanking zeros to the first significant digit, ending on the auto word mark at 04676.
That requires `edit.ts` to return a per-storage-cycle iterator as `alu.ts` does — **one yield per
B-cycle, skids included, A cycles folded in** (§4 Wave D), which is also the fixture's index. A
design requirement, not an afterthought. `@` returns one too; `%`, `T` and `Z` may run in a single
E-cycle. Note what the key cannot show: `stepCycle()` runs the whole I phase in one call, so
Figure 34's first twelve steps go by in one press.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **MCE is the hard one: the PoO prints "Varies with result of edit" for BAR in every edition, and what we hold is a 14-of-46-step hand transcription in `opcodes.md` §7.3, not a fixture.** | Four handles, none dependent on the missing 32 steps. (a) The **confirmation read of A22-0526-3 pp.31-35 / S223-2698 pp.47-56** is Wave D's first task (PHASE-1-NOTES §4); if it lands, all 46 steps become the fixture — mapped onto B-cycle ordinals, since the manual's step numbers are not addressable through `stepCycle()` (§4 Wave D). If it does not, the fallback **narrows a gate the parent plan set**, so it is Tom's ruling and not the orchestrator's (§1). (b) The **eight-case BAR table** is `[verified]` on its own and each row gets its own vector, so BAR is tested case by case, not through one example. (c) S223-2698 pp.50-51 states the **mechanism** — −1 per B-cycle on scans 1 and 3, +1 on scan 2, terminating cycle included — confirmed independently by cube1us `scan_mod[]`; an implementation built from it reproduces the 14 known steps or fails visibly at the first. (d) The **end state** is arithmetic on two `[verified]` rules and is asserted regardless. Two failed attempts → stop and ask, ship the fallback, record it. |
| Multiply and divide have a real fixture but **no expected results anywhere**, so ten green tests assert numbers we computed. | Say so per case, with the `opcodes.md` §4.5 / §4.6 citation and the arithmetic written out. Add tier-1 vectors from the manual's **own** worked example (Figure 17) so at least one divide answer is the manual's, not ours. Tag question to Tom. |
| The reshape silently changes `A S ? !`. | Wave A ships **no new behaviour** — its gate is the unchanged suite and an unchanged `cc01` line; `addToStorage` keeps signature and yields, and the reviewer diffs one add's yield sequence before and after. |
| `Z` is `[likely]` with a single SimH corroboration and no oracle of any kind. | Ship plan §10's fallback behind the named constant, record the hit, leave the `open-questions.md` row **open**. Copying SimH does not make it verified (`METHOD.md`: emulator code is a second oracle for behaviour, never a primary source for spec). |
| Table Lookup's compare direction gets inverted — a symmetric table passes either way. | Deliberately **asymmetric** vectors, plus the OPEN constant naming the reading and the LEH cross-check. |
| A 1b change collides with Phase 2 and costs a rebase Phase 2 cannot verify. | §2's ownership enforced per wave; four known collision points named in advance with resolutions; no new `table.ts` import; one `types.ts` hunk plus one line in `cpu.ts`'s `ExecContext` literal; `test/isa-table.test.ts` flagged as moving four times, not once. |
| Scope creep, and importing 1401 behaviour — acute here, since A24-1403-5 Figure 58 traces the **same** MCE example. | Scope is five ops, the reshape and the machine check; timing terms are in only because a row reporting `0` for `M` is a wrong row. Every per-step register value is checked against the manual it came from, and `edit.ts`'s header names the 1401 trace. |

---

## 9. `[unverified]` / `[likely]` items 1b touches, and the fallback chosen

Each is coded behind a named constant with an `// OPEN:` comment pointing at its
`open-questions.md` row; each one hit is recorded in `PHASE-1B-NOTES.md` §1.

| Item | Tag | Fallback chosen |
|---|---|---|
| MCS (`Z`) scan direction and units addressing — unstated in every edition of the PoO, A22-1407-2 and the CE Handbook. | `[likely]` | `MCS_RIGHT_TO_LEFT_THEN_SUPPRESS = true`: right-to-left copy from the units position, then a left-to-right suppression pass, `BAR = B + 1` — the only reading consistent with the printed `AAR = A − LA`. Row stays open. |
| `Z` treating `-` and `.` as pass-through — SimH `OP_MSZ` only. | `[unverified]` | `MCS_PASSTHROUGH_CHARS` follows SimH, named and cited. New row in the Phase 1b section. |
| MCE rules — A22-0526-3 pp.31-35 not read directly. | `[verified]` reconstruction in `opcodes.md` §7 | Implement from it. **The confirmation read is Wave D's first task**, and its outcome (closed / attempted / not obtained) is recorded either way. |
| Address wrap during MCE's `−1` BAR modification, and the skid cycles touching bytes outside the B field. | `[unverified]` | `MCE_WRAP_TRAPS = true` (plan §10, unchanged): we do not model wrap. The skid at `B_high − 1` is implemented and **preserves** the word mark it finds. |
| Whether the two MCE skid cycles are counted inside the `B`/`Z`/`D` timing terms. | `[unverified]` | **Ignore.** Not cycle-accurate; register and memory state unaffected. |
| Table Lookup's compare direction against the d mask (Figure 26's OCR is mangled). | `[likely]` | `TABLE_LOOKUP_COMPARES_TABLE_TO_ARGUMENT = true` — the `C` convention, B to A, shared latch set. |
| Scope of §5.2's sticky-equal rule across a Table Lookup's many argument comparisons: §5.2 says *"for the rest of that operation"* (223-2588-2 p.24), §2's `T` row says the latches come *"from the last argument comparison"*. The two disagree for `d = 2 / 3 / 6` after any miss. | `[unverified]` (a genuine source conflict) | `TABLE_LOOKUP_RESETS_COMPARE_PER_FIELD = true` — sticky-equal scoped to **one table-field comparison**, `setCompare` per field, which is the only reading under which a `d = 2` lookup can hit after a miss. Wave C ships the vector that separates the readings (miss on field 1, equal hit on field 2). New row in the Phase 1b section. |
| Width of multiply's partial-product and divide's partial-remainder adder window. §4.5 / §4.6 give the digit-group algorithm and the field layout; **no source states the window**. | `[unverified]` — an implementation choice, not a machine fact | `ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE = true`: operand length + 1, one carry position beyond the operand. Its check is the ten tier-3 results — too narrow a window loses a carry and they go wrong. New row in the Phase 1b section. |
| One-field arithmetic timing at L=1 with `E` from Figure 7 — `E = 2` for `@` and `%`, not a blanket 1. | contradiction, resolved (`opcodes.md` §10) | Already in `cycles.ts` `eTerm`; 1b's duty is not to regress it, asserted by a chained-`@`-costs-E=2 test. |
| The expected products and quotients of the ten tier-3 cases. | `[derived]` — see below | Written into each fixture entry with its arithmetic and citation. **`[derived]` is defined once**, in `open-questions.md`'s Phase 1b section, as a **fixture-provenance** label for a value computed from `[verified]` rules — explicitly not a fifth research tag and not a change to `METHOD.md`'s four (§1 non-scope). It is not `[observed]` (nothing established by running this emulator) and not `[verified]`, and a fixture header carrying an undefined tag is the epistemics slip the Phase 1 final review already caught once. **Written by Wave B, in the same commit as the fixture headers that cite it** — which is why `open-questions.md` is in Wave B's file list (§2, §4) and not only Wave E's. |

### Document conventions

- **`docs/BUILD-LOG-1B.md`** — separate from the frozen `docs/BUILD-LOG.md` so 1b and Phase 2 can
  never conflict in a log. Same shape as Phase 1's: one section per wave, newest last,
  `## Wave X — <name> — commits <sha>`, written by the orchestrator **from its own verification
  runs, not worker claims**, sub-bullets *Shipped* / *Tests* / *Deviations from plan* / *Research
  corrections* / *Review*, plus a `### Wave X review` subsection with the reviewer's findings and
  the commits that fixed them.
- **`PHASE-1B-NOTES.md`** — repo root, beside `PHASE-1-NOTES.md`, four sections in the same order:
  (1) `[unverified]` fallbacks hit, as *Constant · Where · Fallback taken · Hit by*; (2) plan
  deviations, numbered, one line each, logged rather than redesigned; (3) research corrections and
  observations made in place; (4) open items carried out of 1b.
- **`docs/research/open-questions.md`** — a dated `## Phase 1b — 2026-08-30` section **appended**
  at the end, never an edit to another phase's rows, and **appended in four touches: B opens it,
  C and D extend it, E closes it** (§2's row, §4's file lists). The rule behind the split is that
  the wave which first cites a row is the wave that writes it — a constant or a fixture header
  pointing at a row that does not exist yet is exactly the failure the label is meant to prevent.
  It lists every row 1b touched with its outcome
  (*closed* / *confirmed, still open* / *new*), the fallback shipped and the constant carrying it.
  A row is struck only by the file's own five-step closing procedure — a primary-source read, not
  an emulator agreement. The `[observed]` tag (`METHOD.md`: established by running this emulator,
  below `[likely]`) applies to nothing 1b produces except the note that `cc01`'s 1241-instruction
  baseline is unchanged. This section also carries the **one-paragraph definition of `[derived]`**
  as a fixture-provenance label (§9, last row) — written here, once, **by Wave B in the commit
  that first cites it**, because `METHOD.md`'s tag set is out of scope and an undefined tag in a
  fixture header is worse than either.
- **Research corrections land in the research file, in place, in their own commit** —
  `METHOD.md`'s rule, and §2's for both `opcodes.md` and `emulators.md`. 1b already owes one:
  `emulators.md` summary point 4 and §5.2's 02300-02968 row claim `note1410.txt` carries
  cycle-by-cycle latch states for **multiply/divide**, and it does not (Wave B, §4). Each
  correction is logged in `PHASE-1B-NOTES.md` §3 with the manual page or fixture that settles it.
