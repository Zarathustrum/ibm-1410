# Phase 1 notes — what was hit, what was chosen

Named deliverable from `docs/plans/phase-1-cpu-core.md` §2 and §10. Three sections:
`[unverified]` fallbacks actually hit, plan deviations, and research corrections.

## 1. `[unverified]` fallbacks hit (each behind a named constant with `// OPEN:`)

| Constant | Where | Fallback taken | Hit by |
|---|---|---|---|
| `INDEX_OUT_OF_RANGE_TRAPS = true` | `src/core/address.ts` | Indexed effective address outside installed storage → AddressCheck, never wrap (`open-questions.md` architecture row; plan §10 row 1). | Tier 3 index block: `insttest.cor` 02244 (A → 90122, B → 101229) and 02255 (A → 87658) on an 80K image. Jaeger's own test therefore expects these values to *exist*; his simulator evidently does not range-check at decode. Our reading of "the system will stop on an error" traps. Observed, not asserted as machine truth. |
| `Y_TIMING_US = 0`, `MICR_TIMING_US = 0`, `SEVEN_OH_TEN_TIMING_US = 0` | `src/core/cycles.ts` | `opcodes.md` §2 prints no timing for `Y`, `P`/`Q`, `$`/`=`. All are `implemented: false`; the constants exist only so the rows are complete. | Never executed. |
| `MICR_REGS_UNVERIFIED`, `REGS_NOT_STATED_7010`, `Y_BQPR2_D_UNVERIFIED = null` | `src/core/isa/table.ts` | §2 marks `P`/`Q` registers-after `[unverified]`; §9.1 cannot determine the BQPR2 d-glyph, so it is absent from the `Y` d-table rather than guessed. | Never executed. |
| `UNDEFINED_J_D_CHAR_IS_INSTRUCTION_CHECK = true` | `src/core/isa/exec/branch.ts` | `opcodes.md` §6.1 / Figure 35 do not say what an undecodable `J` modifier does; the I-ring rule (Instruction Check, nothing executes) is taken over "no indicator on, no branch", which would hide the fault. | Never on the oracles. |
| `UNDEFINED_IO_D_CHAR_IS_INSTRUCTION_CHECK` | `src/core/channel.ts` / `isa/exec/io.ts` | The PoO defines no I/O d-character validity check; same rule as `J`. | Never on the oracles. |
| BAR after an I/O that transfers nothing (LB = 0 → B + 1) | `src/core/isa/exec/io.ts` | No manual statement; `B + LB + 1` applied with LB = 0. | Console read stub (`noTransfer`). |
| Load-mode output of a word mark over a core word separator | `src/core/channel.ts` | Rules composed in the manual's order → three separators; unreachable from a 7-bit device in Phase 1. | Never. |
| Console write sets no WLR | `src/core/channel.ts` | io.md §8 Figures 45-46 print WLR "never" for a console write; the core GM-WM defines the record. Tape zero-length exception flagged for Phase 2. | Every `M %T0` write. |
| Zone bits on an un-indexable (`G`) address | `src/core/decode.ts` | Research says only that `G` cannot be indexed; the 64-entry table reads each zoned character as its digit (`Z` = 9), tag forced to 0. | Never on the oracles. |
| DAR for a percent-type address (`G`) | `src/core/decode.ts` | §1.4 states "read into AAR and CAR" for not-percent-type only; encoded as CAR alone, no D cycle. | cc01 `G 02231 B` etc. — CAR only. |
| `L3_LATCHES_SAMPLED_AFTER_CYCLE = true` | `src/core/alu.ts` | Plan §6.2's sample L3 line is internally inconsistent (`zb=1` on a units cycle whose digit is 8, `cout` plainly post-cycle); latches are recorded at the end of the cycle that developed the position. | Every L3 record. |
| `UNDEFINED_G_D_CHAR_IS_INSTRUCTION_CHECK = true` | `src/core/isa/exec/control.ts` | `opcodes.md` §2 p.22 names d = `A B E F` (+ feature-only `T` → UnimplementedOp); silent on any other d; `J` precedent. | Never on the oracles. |
| `PRINTED_BLANK = 'b'` | `src/core/printout.ts` | A22-0526-3 p.49 states the small-`b` blank only for load-mode console printing; whether the fixed-format stop print-out is such a print is not stated (the Exhibit II sample is transcribed that way). Display only. Row added to `open-questions.md`. | Every stop print-out. |
| x2 glyph outside Figure 107 → InstructionCheck | `src/core/channel.ts` | `io.md` §2/§5 state no validity check; the I-ring rule is applied as for x1 and the d-characters. A known class with nothing attached is Not Ready (`io.md` §9 Figure 99). | Never on the oracles. |
| `W` accepts every 6-bit d as a mask | `src/core/isa/exec/branch.ts` | §6 has no d-table for `W`; asserted by a 64×64 sweep. | cc01 `W` tests. |
| `SHORT_A_TURNS_HIGH_ON = true` | `src/core/compare.ts` | 223-2588-2 Comparing row prints "In this case Hi-ind is on" with no qualifier; whether a LOW compared portion changes that is never stated. HIGH unconditionally. | Never on the oracles. |
| Recomplement latch timing and scan-3 phase naming (comment-only OPEN) | `src/core/alu.ts` | The research names the latches (`emulators.md` §5.3) but never says which are up when; the note1410 oracle decides: the last scan-1 cycle of a recomplementing add records `Bc = 1`, `cin = 1`; scan-3 positions after the units are `extension`. | Tier 3 arithmetic (02333, 02433, 02485). |
| `MOVE_LENGTHS_ARE_POSITIONS_STEPPED = true` | `src/core/move.ts` | Figure 20 prints LA/LB/LW in different rows but Figure 8 defines them over fields; a Move has no field boundary but its terminator. All three = positions stepped. | All 15 tier-3 move cases. |
| `MOVE_REGISTERS_FROM_FIGURE_20 = true` | `src/core/move.ts` | Plan §10's fallback (the eight-row terminator/direction table), verified against the 15-case matrix. The note prints no registers for the block. | All 15 tier-3 move cases. |
| `CONSOLE_LINE_LENGTH = 80` | `src/core/machine.ts` | DISPLAY/ALTER end at "a word mark or the end of line" (console-and-physical.md §4, software.md §10.8); no source gives the Selectric's characters per line. | Every DISPLAY. |
| `CLEAR_STORAGE_BAR_AT_00000 = 99_999` | `src/core/storage.ts` | `/ 00000`: Clear Storage terminates on the hundreds boundary (A22-0526-3 p.23) and never addresses below 00000; `bbb00 − 1` in a five-position register is 99999. Neither §4's decrementing rule nor the `/` row covers `bbb = 000`. CC01A step 10 requires it (AAR 00000, BAR x9999). Row in open-questions.md. | cc01 03436. |
| `MOVE_WORD_MARK_PORTION_IS_A_COPY = true` | `src/core/move.ts` | A22-0526-3 p.25 "the selected portion of each A character replaces the corresponding portion" demonstrates set (note1410 02836); clear is undemonstrated. Coded as a copy. Row in open-questions.md. | Every word-mark-portion move. |
| `HALT_TYPES_NO_PRINTOUT = true` | `src/core/machine.ts` | console-and-physical.md §2's `S` row names the STOP key and a mode change; §3's PRINT OUT CONTROL toggle and START PRINT OUT key are counter-evidence that the automatic print-out fires on stops generally. Coded as no print-out on a programmed halt. Row in open-questions.md. | Every `.` halt. SUPERSEDED 2026-09-04 — superseded by S223-2648 p.6: Phase 6 wave 0 renamed the constant `PROGRAM_STOP_TYPES_S = true`, `[verified]`, and a programmed halt types `S`. See `docs/BUILD-LOG-6.md` wave 0 and `docs/plans/phase-6-reentry.md` §9. |
| `DISPLAY_WRAPS_ABOVE_10K = false` | `src/core/machine.ts` | §4: on 20K-80K machines DISPLAY continues from 00000 after the last location unless it carried a word mark. Not modelled in Phase 1. | Never on the oracles. |
| `DISPLAY_STOPS_BEFORE_NEXT_WORD_MARK = true` | `src/core/machine.ts` | §4 "storage contents until a word mark" — the displayed field's own marked character prints; the next field's does not, so "START again displays the adjacent field" lines up. | Every DISPLAY. |
| `PRINT_CHAIN = 'A2'` | `src/core/bcd.ts` | `charset.md` §5 names no print chain for the 1410's 1403 and §5.1 prints two candidate glyph columns; plan §10 takes A2, so rank 06 is `&` not `+`, 15 is `%` not `(`, 21 is `@` not `'`, 02 is the lozenge. Display only — a chain changes which glyph a code PRINTS, never its bits, punches or collating rank. | Every glyph rendering: the console log, the core window, `printout.ts`. |

## 2. Plan deviations (minimal, logged, not redesigns)

1. **Implemented-check after the decode-only return** (`cpu.ts`). Plan §4.1 throws
   `UnimplementedOp` before `if (!execute) return`. Tier 2 must decode `@ % Z E T` from
   `ilentest.cor` without executing them, so the check now sits on the execute path. Dispatch
   still raises `UnimplementedOp` with the row's cite.
2. **`MachineState.window` → `coreWindow`** (`types.ts`). Originally forced by the DOM-free
   grep, which banned the bare word `window`; that grep now matches code shapes (`window.`), so
   the rename is no longer forced. Kept anyway — `coreWindow` says which window it is.
3. **`ANY_LENGTH: readonly number[] = []`** (`isa/table.ts`). `lengths` cannot say "any";
   `selectForm` treats the empty array as any. Used by `N` (§2: "any (1, 2, 3, …)") and,
   for lack of a better encoding, by `=` whose length §2 does not state.
4. **`X` is `implemented: false, feature: 'channel2'`.** Plan §5 Wave 7 lists only `2`/`4`;
   architecture.md §12 lists `X` among the rejected channel-2 ops. Rejecting it with a cite
   beats a raw stub error.
5. **`J` has two §2 rows, both `lengths [1,7]`.** A length-keyed `selectForm` cannot separate
   them; `pickForm` in `decode.ts` chooses by d-character (blank → unconditional).
6. **`A` has two §2 rows (L=1/11 and L=6), not three** as plan §3 / `types.ts`'s comment say.
7. **`classifyForm` returns `Olong` for `N` at every length**, not only beyond 12: `N` is
   percent-type (§1.2) and its §2 row is `NSI / Ap / Bp`, so an 11-character `N` must not
   load AAR/BAR.
8. **`checkAddress(s, a, use, topAddressPermitted)`** added to `address.ts`: the three
   declared signatures have nowhere to put the use-dependent checks.
9. **`F`/`K` are `implemented: true`** (base-machine ops) with executors that throw until
   Phase 2 brings the 1403 carriage / 1402 stacker; `feature` has no member for "device out
   of phase scope".
10. **`tools/*.ts` run via `tsc` → `build/`**, not `vite-node` (Vitest 4 dropped it). Hence
    NodeNext resolution and `.js` import extensions throughout.
11. **`ExecContext.halt`** (Wave 1): halt is a flag read after `regs`/`timing`, so the
    36 µs halt-and-branch and the instruction count survive; a thrown check would skip both.
12. **`Indicators` constructor performs a computer reset**: power-on reset = program +
    start + computer reset (S223-2648 pp.76-77), so a fresh machine has low and unequal ON.
13. **`Device.write(x3, d, data, mode)`** (Wave 2): architecture.md §3 printed three
    parameters; WCPW's small-`b` blank rendering needs the mode because a load-mode record
    with no word marks is byte-identical to a move-mode one and `ConsoleLine` is frozen.
14. **`test/isa-table.test.ts` `BUILT_SO_FAR` / `DEVICE_DEFERRED` lists**: the Wave 0
    "every executor is a stub" assertion is updated per wave.
15. **Review cadence**: the Wave 1 review was folded into the Wave 2 review (one diff, one
    reviewer) to save a cycle; both waves' files were in its scope.
16. **`LatchTraceRecord` / `Latch` live in `types.ts`** (re-exported from `trace.ts`) so
    `OpForm.exec` can name the iterator type; `OpForm.exec` may return
    `Iterator<LatchTraceRecord>`; `ExecContext.recomplement` and `traceLatch` added;
    `CycleStep` type for `stepCycle()`.
17. **An I/O transfer is one E-cycle** — `Channel.io()` runs the whole record inside one
    exec, so MODE = I/E CYCLE cannot pause inside a console write. The plan budgets the
    storage-cycle seam against the add only (§8 demo 2); logged from the Wave 1-2 review.
18. **The tier-3 arithmetic block runs as halt-terminated sub-blocks** (02300→02391,
    02400→02496, 02500→02596, 02600→02644, 02700→02766), one per START — not standalone
    instructions: operands at 10001-10600 are mutated in place and the chained forms carry
    no address fields. The second `.` after each halt is the word mark ending the halt's
    read-out, not an instruction.
19. **Tier-3 index block with execution on asserts at the end of the I-phase** (via
    `stepCycle()`): every instruction there is an `A` whose registers after are
    `A−LW / B−LB`, and seven of the nine index into blank fill. Only 02200 and 02211, whose
    operands the image provides, are run to completion.
20. **`*` in x1** — was rejected as channel 2 before its overlap bit was seen; `decodeX` now
    tests overlap first, so `@` and `*` both stop `unsupportedFeature` as plan §1 says
    (Wave 3-7 review, finding 9).
21. **The x1 `=` row in `dmods.ts` was unreachable** (the 1410 chart prints octal 13 as
    `#`) and has been deleted; `#` in x1 instruction-checks via the generic branch.
22. **MODE = I/E CYCLE steps the E phase one storage cycle per START** — the real key steps
    one instruction phase (console-and-physical.md §4); the finer boundary is the plan's own
    choice (§8 demo 2) so the B field can be watched filling. Stated at `Cpu.stepCycle`.
23. **Latch records exist only under a level-3 tracer** — `CycleStep.record` is optional;
    the UI watches `snapshot().coreWindow`, not the records.
24. **Console print-outs as encoded**: a mode change types `S` only on an actual change
    (A22-0526-3 p.50); STOP types `S` (p.52); a programmed halt types nothing; neither reset
    key types anything (§2's table has no row for a reset). DISPLAY stops before the next
    field's word mark so "START again displays the adjacent field" (§4) lines up.
25. **The cc01 PASS rule's third assertion is "instruction check at 00322", not
    "IAR reached 08980"**: the `J 01972` at 08980 is on no executed path (no operand in the
    image names 08959/08966/08973/08980); the diagnostic ends by relocating its tape read-in
    and branching to the blank hole at 00322 where the CE keyed the tape read. Plan §7/§8 and
    `emulators.md` §4.4 read 08980 off the static image; `emulators.md` corrected in place.
26. **The card and object-deck boundary types are not in Phase 1** (`types.ts`). `Card`,
    `Deck`, `Column`, `PunchMask`, `BcdOfPunches`, `ObjectRecord` and `ObjectDeck` were frozen
    in §6/§7 of `types.ts` against a Phase-2 consumer that does not exist yet, and had zero
    importers. Removed: they return in Phase 2 with their first consumer and their first test,
    which is what the plan's own §12 argument requires. Every format is still pinned in the
    research, so nothing is lost by waiting (`charset.md` §2/§2.1/§3, `software.md` §8.1 and §1,
    `console-and-physical.md` §12) — see the surviving `types.ts` §6 note.
27. **Size against the plan §2 budget**: ~7,020 source lines vs ~3,700, ~9,166 test lines vs
    ~1,700, `isa/table.ts` 1,226 vs ~500 — comment density (every row carries its manual cite and
    the reasoning behind it, which is the point of the diff-by-eye design) and declarative
    columns written out in full rather than abbreviated, not extra scope: the file list, the op
    set and the tier list are the plan's.

## 3. Research corrections and observations

- `charset.md` §2 rank 35 (`!`, B-8-2) printed C = 1; three bits is odd, so C = 0 (fixed in
  place, commit 68ba52e). Rank 05 group mark shared `‡` with the record mark; now `⧧`.
- `ilentest.cor` and `insttest.cor` are byte-identical over 00000-02599, so the index block
  at 02200 is in both, not only `insttest` as architecture.md §9 C4 reads.
- `emulators.md` §5.2 predicts 11/6/1 for `!`; block 00400 holds four `!` instructions
  (11/6/1/1) — inside the group, count 5 not 4. §5.2 gives no group for the 02100 I/O block;
  the test uses `opcodes.md` §1.1.
- Every ilentest block ends with a spare word-marked `.` whose own read-out would scan into
  the next block; the tier-2 walk stops at the last-but-one word mark.
- `types.ts` cannot express: a per-d register effect (`D` uses `special` and points at the
  eight Figure 20 rows in `dmods.ts`); set-vs-reset in `indicators: IndicatorName[]`.
- `note1410.txt` names the B field of 02485 as 10147 (image: 10150) and of 02633 as 10336
  (image: 10337 in the note) — the fixture follows the image and quotes the note. The
  "Carry In/Out" phrase is one light and is mapped to `cout` only.
- `opcodes.md` §4.1's "when the machine develops or changes a sign" is load-bearing: a true
  add onto an already-positive B field leaves the units zone untouched (nine oracle cases).
- `emulators.md` §5.3's Move block is fifteen `D` instructions (02800-02968) plus the halt
  at 02980, not sixteen moves. Recorded in `oracle/note1410/move.ts` CORRECTIONS.
- The `#b&-bn%` ZA example in `research/architecture.md` §10 contains two non-A2 glyphs —
  `b` (the transcriber's blank, possibly the substitute blank) and `n` (no glyph at all);
  the result `300004D` is invariant under every reading, so `test/exec-za.test.ts` asserts
  it over the full cross product (`ZA_EXAMPLE_N_CODES_TO`). Transcription gap, not a
  machine one.

## 4. Open items carried out of Phase 1

- Confirmation read of A22-0526-3 pp.31-35 (MCE) — Phase 1b.
- `cc01.cor` baseline established 2026-08-30: 1241 instructions, both messages, instruction check at 00322 (see BUILD-LOG "cc01 halt archaeology"). Modelling the tape read-in hole is Phase 2+ (tape is out of scope).
- `alu.ts` `addToStorage` will not serve `@`/`%` as is (fixed B units, single terminator, sign baked into the units cycle) — Phase 1b should replace the mode flag with a `{ bUnits, positions, writeSign }` primitive (Wave 3-7 review, finding 14).
