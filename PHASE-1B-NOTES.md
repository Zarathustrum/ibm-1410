# Phase 1b notes — what was hit, what was chosen

Named deliverable from `docs/plans/phase-1b.md` §2 and §9. Four sections, appended per wave:
`[unverified]` / `[likely]` fallbacks actually hit, plan deviations, research corrections and
observations, open items carried out of 1b.

## 1. `[unverified]` / `[likely]` fallbacks hit (each behind a named constant with `// OPEN:`)

| Constant | Where | Fallback taken | Hit by |
|---|---|---|---|
| `ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE = true` | `src/core/muldiv.ts` | Width of multiply's partial-product / divide's partial-remainder adder window — no source states it (§4.5/§4.6 give algorithm and layout only). Operand length + 1, one carry position beyond the operand, and the width is **pinned**, not merely bounded below: `la+2` puts the complement borrow back inside the window and the 5-9 group's shifted true add then corrupts the next multiplier digit; narrower loses carries. Row in `open-questions.md` Phase 1b section. | All ten tier-3 `@`/`%` cases and every tier-1 muldiv vector. |
| `TABLE_LOOKUP_COMPARES_TABLE_TO_ARGUMENT = true` | `src/core/tablelookup.ts` | `[likely]` — Figure 26's OCR is mangled; high = the TABLE argument collates above the SEARCH argument, the `C` B-to-A convention over the shared latch set (§5.2), corroborated by the LEH-with-ascending-order note. Existing open-questions row (avco-and-reentry.md section). | Every tier-1 `T` d-vector over the asymmetric table (an inverted direction fails the hits table). |
| `TABLE_LOOKUP_RESETS_COMPARE_PER_FIELD = true` | `src/core/tablelookup.ts` | `[unverified]` — genuine source conflict: §5.2's "for the rest of that operation" (223-2588-2 p.24) vs §2's `T` row "from the last argument comparison". Sticky-equal scoped to ONE table-field comparison, `setCompare` per field — the only reading under which a `d = 2` lookup can hit after a miss. New Phase 1b row. | The separator vector: miss on field 1, equal hit on field 2, `d = 2`. |
| `MCS_RIGHT_TO_LEFT_THEN_SUPPRESS = true` | `src/core/mcs.ts` | `[likely]` — right-to-left copy from the units position then a left-to-right suppression pass, the only reading consistent with the printed `AAR = A − LA`; SimH `OP_MSZ` corroborates one tier below its label. Existing row stays open. | Every tier-1 `Z` vector. |
| `MCS_PASSTHROUGH_CHARS` (`-` `.`) | `src/core/mcs.ts` | `[unverified]` — SimH `OP_MSZ` alone treats `-` and `.` as pass-through (left standing, latch untouched); no manual states it. New Phase 1b row. | `123.45` unchanged and `00.007` → `␣␣.␣␣7`. |
| `MCS_BLANK_IS_SUPPRESSED = true` | `src/core/mcs.ts` | `[unverified]` — §5.3's SimH description "suppressing zeros, blanks and commas": blank joins the suppressed class and never re-enables suppression after a significant digit. New Phase 1b row (review finding). | `1␣05` stays `1␣05` (restart-class would give `1␣␣5`). |
| `MCE_WRAP_TRAPS = true` | `src/core/edit.ts` | No wrap modelling: the `−1` BAR walk and both skid addresses go through `checkAddress`, so a reference outside installed storage is an AddressCheck, never a wrap (plan §9, phase-1 plan §10). Existing open-questions row ("Address wrap during MCE's −1 BAR modification…"). | No vector — the trap is `checkAddress`'s existing behaviour. |
| `MCE_EARLY_A_WM_ENDS_AT_SCAN_1 = true` | `src/core/edit.ts` | An A field whose word mark is sensed before the suppression code ends the edit at scan 1 (the body latch cannot restart). Defensible for short fields (S223-2698 p.50's extension rule); collides with 223-2588-2 p.53's single-character "will transfer AND edit" if that sentence implies a full multi-scan edit — the page does not settle it. New Phase 1b row. | The single-character vector asserts BAR 499 (single-scan reading; the alternative, 504, is named in the comment). |

## 2. Plan deviations (minimal, logged, not redesigns)

1. **Machine-check hard-token rule narrowed** (`test/isa-table-vs-research.test.ts`). §5's
   "single op character" hard-token rule read the stray `s` of §2's possessives ("the table
   field's word mark") as op `S`, red-lighting three untouched rows; a fifth normalisation
   (possessive stripping) shipped first, then the review (finding 3) replaced it: a
   single-character token is an op-glyph hard token only when the §2 cell prints it
   **backticked**. The fifth normalisation was then deleted — the file is back to §5's four.
   §5's claim that the possessive "normalises to identity" held for the Jaccard filter only,
   not for its own hard-token rule.
2. **`,` semantics measures 0.600, not §5's 0.545** — the tokeniser collapses `/` to
   whitespace, so `AAR/BAR` splits before length filtering; both sides move identically, the
   column is uncompared for `,` (§5's own exemption), and every compared one-to-one pair pins
   at 1.000, so no compared verdict differs from the plan's.
3. **isa-table-vs-research.test.ts is 870 lines vs §5's ~450-600** — provenance comments and
   the review's collect-all failure shape; review finding 8 named ~35 optional lines, not taken.
4. **`ctx.recomplement` (Figure 7 `R`) is stored at end-of-operation**, after the pass drains,
   not at Scan-3 entry as Wave 3 wrote it. No consumer reads it mid-flight — the `A`/`S`
   timing lambdas run after the iterator is drained (review finding 6).
5. **`addToStorage` hands `addPass` the EFFECTIVE cycle for `?`/`!`** — `'true'` whenever the
   adder is idle, not the raw `selectAddCycle` result — so `Ac` stays down in ZA/ZS L3
   records. The §3.1 sketch left this unspecified; commented at the call site.

6. **Three test files outside Wave B's §4 list took mechanical one-liners** — the
   `implemented: true` flip for `@`/`%` is encoded in three more places than the plan named:
   `test/cycles.test.ts` (the `ctx()` helper gains `terms` zeros; its `@`-row timing call
   would otherwise throw), `test/decode.test.ts` (`laterWaves` drops `@ %`),
   `test/wave7-rejections.test.ts` (`PHASE_1B_OPS` drops `@ %`). None is on a Phase 2 path.
7. **`%`'s `terms.Q` is the step count** `dividendDigits − divisorDigits + 1` — the reading
   the `6.5Q[…]` formula charges for; §1.5 says only "quotient length" (review finding 5).
8. **`@`'s per-yield granularity** (one per zeroing position; the image-digit store costs
   none) is this emulator's own convention, unsourced at that grain; pinned by a tier-1 case
   so a change is deliberate (review finding 6; plan §1 excludes cycle-accurate timing).

9. **`decode.test.ts` and `wave7-rejections.test.ts` outside Wave C's §4 list again** — the
   same mechanical flip as item 6: `laterWaves` / `PHASE_1B_OPS` drop `T Z`. Neither is on a
   Phase 2 path.
10. **`T`'s `LW` takes §1.3's `[verified]` reading over plan §3.4's sentence** — LW = the
   last comparison's positions read ("whichever is shorter"), which on the end-of-table exit
   is the short field's length, matching §5.1's AAR reload/step mechanism; plan §3.4's
   "search-argument length on every exit" is rejected as false of the aborted comparison
   (Wave C review, major 2). Both readings carried in the `tablelookup.ts` comment; the
   end-of-table vector asserts `A − LW = 501`.
11. **Two commented choices, not manual readings**: `Z`'s zone strip runs after suppression
   in §2's printed clause order (observable on `00?` → `␣␣0`); `T`'s `terms.N` counts the
   aborted short-field search cycle (Figure 7's `N` feeds an approximate formula).

12. **`decode.test.ts` / `wave7-rejections.test.ts` outside Wave D's §4 list again** (items 6,
   9's pattern): `laterWaves` removed outright and the `PHASE_1B_OPS` block deleted — all
   five Phase 1b ops have landed, so both lists emptied.
13. **The §7.2 `*`+`$` mutual-exclusion ships as an `UnsupportedFeature` stop**, not the bare
   assertion plan §3.6 asked for — a bare throw escapes `step()` as an emulator bug
   mid-instruction; a stop reason is the codebase's contract for refusals (review finding 6).
   The real 1410 documents no check here; the refusal is the emulator's own.
14. **`edit.ts`'s scan-2 termination is a significance flag** shown equivalent to S223-2698
   p.51's literal clauses under the scan-2 decimal-control latch (reviewer-verified over
   `002.00` / `000.50` / `000.05` / `000.00` / `00X.00`); the earlier comment's claim that
   the literal clause contradicts §7.3 row 5 was false and is rewritten (review A2b).

15. **`docs/STATUS.md` deliberately not edited**, though plan §2/§4 name it in Wave E's list:
   the build-orchestrator brief reserves STATUS.md for the main session at merge. The Wave E
   reviewer flagged the omission; it is this rule, not an oversight.
16. **Plan §7 criterion 7's literal `grep 'OPEN:'` cannot name the constants** — Wave C/D
   comment style puts prose headlines after `OPEN:` with the `export const` on the next
   line. The mechanical check was run on the `export const [A-Z_]+` lines instead, both
   directions: eight constants in the four modules, eight rows in §1, exact match.

## 3. Research corrections and observations

- **`emulators.md` corrected in place, own commit** (Wave B): summary point 4, §5.2's
  02300-02968 row, §5.3's cycle-level claim and §9 step 4 said `note1410.txt` carries
  cycle-by-cycle latch states for multiply/divide; the 02600-02644 and 02700-02766
  sub-blocks carry field addresses and contents only — no latch lines, no `Result:` line.
  Settled by `oracles/note1410.txt` itself (verbatim in `oracle/note1410/arith.ts`);
  the add/subtract/ZA/ZS/move halves stand.
- **`opcodes.md` observation, no edit made**: §4.5 carries no multiply field layout — the
  `len(B)` rule and the multiplier-image placement live only in §2's `@` row. Worth a
  cross-reference if a later wave edits §4.5 anyway.

- **`opcodes.md` §7 corrected in place, own commit (Wave D)** — the confirmation read landed
  via S223-2698 (1961 CE manual, bitsavers, `pdftotext -layout`; A22-0526-3's own scan has
  no text layer). Six corrections, every quote verified against the OCR text independently
  by the reviewer and by the research worker: (1) §7.1 gains the p.50 scan-1 body rules
  verbatim — rule 4 enables BOTH the `*`-fill and floating-dollar latches off the
  zero-suppress LATCH, and the enabling `*` **consumes an A character** (the shipped `*`
  behaviour was wrong and is fixed with a discriminating vector); (2) §7.2's decimal-control
  latch is set during **scan 2**, not scan 1; (3) §7.2 gains the **re-arming** rule
  (pp.50-51, the `100 CARS` example — implemented, with the CARS vector); (4) §7.3 gains the
  registers-print-after-modification convention, the read's provenance, and the
  A-data-register column note; (5) §7.5: extension latch set at both skids, the
  non-regenerated MQ latch identifies a skid; (6) §7.6 gains the cycle-interleave rule
  (steps 31→32).
- **The review's "§7.3 step-14 BAR 04685" finding was a tooling artifact** — rtk output
  folding merged the step 12/13/14 rows during the reviewer's read; HEAD already printed
  04684 (verified `od -c` against `git show HEAD:`). No §7.3 cell was changed; the fixture
  comment that briefly asserted the disagreement is corrected.

## 4. Open items carried out of 1b

- PHASE-1-NOTES §4's "Confirmation read of A22-0526-3 pp.31-35 (MCE)" — **the read itself is
  closed**: it landed via the S223-2698 reprint (Figures 23A/23B carry Figure 34's 46 steps;
  `oracle/mce-figure34.ts` transcribes all of them, `opcodes.md` §7.3 records the
  provenance). The corresponding `open-questions.md` row (architecture.md section, ~line 47)
  is **eligible to close but not struck** — its file's five-step procedure wants
  `architecture.md` itself amended, which no 1b wave owns. **Carried out of 1b: that
  dedicated closing pass.**
- `MCE_EARLY_A_WM_ENDS_AT_SCAN_1` — open; a manual trace of a single-character edit would
  close it (open-questions.md Phase 1b row).
