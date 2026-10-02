**STATUS:** Phase 1b COMPLETE — all five waves shipped and pushed — 21:55

# Phase 1b build log

One entry per wave, newest last. Written by the build orchestrator (Fable) from its own
verification runs, not from worker claims. Plan: `docs/plans/phase-1b.md` §4. Separate from the
frozen `docs/BUILD-LOG.md` so 1b and the concurrent Phase 2 build never conflict in a log.

Arrival state (branch `feature/phase-1b` at e474c1e = `main` 669aabd + the plan): typecheck
clean; `npm test` 42 files, 741 passed | 10 todo (751); `npm run smoke` 5 passed; `npm run cc01`
PASS — `CC01A`, `CC01 COMPLETE`, stop `E ØØ322 ØØ322 Ø8966 Jb bbb b̲b̲b̲b̲`, 1241 instructions,
82543.5 µs.

## Wave A — the reshape, and the machine check — commit e27fc03

- Shipped (two Opus workers in parallel, then one Opus fix worker): `src/core/alu.ts`
  reshaped — `addPass` extracted as the
  `{ aUnits, bUnits, positions, cycle, writeSign, recomplementSign, mode }` primitive
  (plan §3.1); `addToStorage` keeps signature and yields and becomes the `A S ? !` wrapper
  owning `selectAddCycle`, the sign rules, `ctx.recomplement`, the indicators and
  `LA/LB/LW`. `test/alu-pass.test.ts` (new, 4 cases): counted run stops without a word mark,
  no sign, no latch moved; `recomplementSign: '-'` writes the Figure 12 sign;
  `recomplementSign: null` leaves complement form; `positions: 'bWordMark'` reproduces
  `addToStorage` byte- and record-identically. `test/isa-table-vs-research.test.ts` (new,
  870 lines, 31 cases): the §5 machine check — 42 rows all 10 cells, 35 ops in `ALL_OPS`
  order, 46 forms (42 + 2×2 for `,`/`⌑`), octal/addressDouble/indicators/dModifiers/regs
  exact with §5's named exemptions, semantics/terminatesOn at Jaccard ≥ 0.9 plus hard
  tokens, every one-to-one pair pinned at 1.000, permanent liveness cases through the same
  comparator functions.
- Tests (orchestrator run): typecheck clean; `Tests  776 passed | 10 todo (786)` across 44
  files — the 741 pre-existing passes unchanged, no existing test edited; smoke
  `5 passed`; cc01 `CC01A` / `CC01 COMPLETE` / stop `E ØØ322`, 1241 instructions,
  82543.5 µs — byte-identical to arrival.
- Deviations from plan: PHASE-1B-NOTES.md §2 items 1-5 (hard-token rule narrowed after
  review; `,` 0.600 vs 0.545, uncompared; 870 lines vs ~450-600; `ctx.recomplement` at end
  of operation; effective cycle for `?`/`!`).
- Research corrections: none. The check is green against `main`'s `opcodes.md` §2 untouched —
  §5's prediction held.

### Wave A review — rode the same commit

- Findings: 0 blocker, 0 major, 9 minor — all fixed or logged. Notable: the hard-token rule
  read English "a" as an address expression (fixed by deriving the single-char vocabulary
  from §2's backticks); per-column loops aborted on first failure (now collect-all);
  `positions >= 1` documented; `ctx.recomplement` timing clause; alu.ts header names
  `addPass`.
- Verified correct by the reviewer: HEAD-vs-worktree differential over 19 add/subtract/ZA/ZS
  cases — every yield, emit record, storage byte, word mark, indicator call and `LA/LB/LW`
  identical; `addPass` touches no indicator and no `ctx.sym`; four independent perturbations
  (regs, semantics digit, indicator, dropped d-key) all caught with the op named; liveness
  cases call the comparator functions themselves, not copies.

## Wave B — `@` Multiply and `%` Divide — commits dde2697 (research), 27a6883 (wave)

- Shipped (two Opus workers in parallel — executors ∥ fixtures/docs — plus one Sonnet
  mechanical pass and one Opus fix pass): `src/core/muldiv.ts` (new, 351 lines) — `@` as a
  per-storage-cycle generator over `addPass` (zeroing scan + digit groups: 1-4 true adds,
  5-9 = (10−d) complement adds + shift + true add), `%` single E-cycle (§4.6 layout,
  quotient left / remainder right, remainder zone never written); window = operand + 1
  behind `// OPEN: ARITH_PARTIAL_WINDOW_IS_OPERAND_PLUS_ONE`. `exec/arith.ts` delegates;
  `table.ts` `@`/`%` rows `implemented: true` with `ctx.terms.M` / `ctx.terms.Q`;
  `ExecContext.terms { M Q N Z D }` + the `cpu.ts` zero literal. Fixture: the ten `@`/`%`
  cases gain hand-`[derived]` `resultField`s (02600 `01484K` … 02744 `1?0?`; 02755
  indicator-only), derived three times independently — fixture worker, reviewer,
  orchestrator — all character-identical; `[derived]` defined in `open-questions.md`'s new
  Phase 1b section. `test/tier3-arith.test.ts` todo branch deleted (suite todo count now 0);
  `test/tier1-muldiv.test.ts` (new, 15 cases: Figure 15-17's own `12` into `14700`,
  div-by-zero, one-short-no-overflow, digit groups, truncation-no-overflow, chained `@`
  E=2); `BUILT_SO_FAR` + `@ %`; `emulators.md` corrected (own commit).
- Tests (orchestrator run): typecheck clean; `Tests  799 passed (799)` across 45 files —
  0 failed, 0 todo; smoke `5 passed`; cc01 `CC01A` / `CC01 COMPLETE` / stop `E ØØ322`,
  1241 instructions, 82543.5 µs — unchanged.
- Deviations from plan: PHASE-1B-NOTES.md §2 items 6-8 (three mechanical test files outside
  the §4 list; `terms.Q` = step count; `@` yield-granularity convention).
- Research corrections: PHASE-1B-NOTES.md §3 (`emulators.md` multiply/divide latch-state
  claims; `opcodes.md` §4.5 observation, no edit).

### Wave B review — rode the wave commit

- Findings: 0 blocker, 2 major, 4 minor, 1 nit. Majors: the OPEN constant's justification
  claimed the 5-9 group's discarded carry cancels the lost borrow — the reviewer proved the
  windows are one position apart and the unconditional image-digit zeroing is what makes the
  result exact (comment rewritten to the two-case algebra, 999×9 and 3×8 anchors; code
  unchanged); the log files owed their Wave B entries (this entry). Minors: the
  open-questions row overstated window freedom (now pinned exactly); `terms.Q` reading named;
  yield-granularity sentence; research-correction commit split honoured; ZONES re-derivation
  nit accepted.
- Verified correct by the reviewer: all ten derivations re-derived independently before
  reading the fixture (character-identical); circularity clean (fixture predates the
  executors; every literal carries its arithmetic); §4.5/§4.6/§8 fidelity line by line;
  `B−LB` and BAR-special (tens position) register conventions; 02755's zeroBalance:false is
  genuinely "untouched" (reset state, divides never touch it); the emulators.md correction
  against oracles/note1410.txt 476-505; exactly one new OPEN constant; gates re-run raw.

## Wave C — `T` Table Lookup and `Z` MCS — commit e7f9d5a

- Shipped (one Opus worker killed mid-task by a session rate limit, one Opus completion
  worker, one Opus fix pass): `src/core/tablelookup.ts` (~267 lines) — per-field
  `collateRank` window (compare.ts untouched, as §2 demands), CAR reload per search cycle
  with the restart one left of the table field's word mark, short-field end-of-table →
  HIGH + BAR left of the field, hit BAR on the function character, d mask 1/2/4 with `7`
  unconditional and blank running to the end-of-table exit; `src/core/mcs.ts` (~187
  lines) — right-to-left copy then left-to-right suppression, `-`/`.` pass-through, blank
  in the suppressed class, zone strip last, B word marks inside the moved area removed.
  `T`/`Z` rows `implemented: true` (T timing gains `ctx.terms.N`; Z's lambda untouched);
  `BUILT_SO_FAR` + `T Z`, implemented-false case narrowed to `E`; two new
  `open-questions.md` Phase 1b rows + one from review (`MCS_BLANK_IS_SUPPRESSED`);
  tier-1 vector files for both ops (hand-derived; the d-value table, the CAR-reload trap,
  the latch-scope separator vector, the restart-right-of-alphabetic case).
- Tests (orchestrator run): typecheck clean; `Tests  824 passed (824)` across 47 files —
  0 failed, 0 todo; smoke `5 passed`; cc01 `CC01A` / `CC01 COMPLETE` / stop `E ØØ322`,
  1241 instructions, 82543.5 µs — unchanged.
- Deviations from plan: PHASE-1B-NOTES.md §2 items 9-11 (out-of-list mechanical flips; the
  LW ruling against §3.4's sentence; two commented choices).
- Research corrections: none.

### Wave C review — rode the wave commit

- Findings: 0 blocker, 3 major, 3 minor. Majors: `Z` blank restarted suppression against
  §5.3's SimH class (now suppressed, behind `MCS_BLANK_IS_SUPPRESSED`, with the separating
  vector); `LW` shipped on plan §3.4's sentence, overruled for §1.3's `[verified]`
  "whichever is shorter" (orchestrator ruling, logged §2); the notes entries owed (this
  entry). Minors: CAR comment described a data path that did not exist (reworded); the
  direction assertion did not test direction (now exact BAR); N-counting and zone-strip
  choices commented.
- Verified correct by the reviewer: all eight d-vectors, the CAR-reload trap, both
  end-of-table cases, the separator vector traced under both latch-scope readings, every
  `Z` expected string re-derived against bcd.ts (incl. `00?` → `␣␣0` proving the clause
  order observable), word marks provably confined to the moved area, registers and both
  timing formulas, ownership (compare.ts byte-untouched), exactly four (now five) OPEN
  constants with resolving rows.

## Wave D — `E` MCE — commits 34b09c8 (research), 6ac47e3 (wave)

- Shipped (two Opus workers in parallel — executor ∥ Figure 34 fixture — then one Opus
  research worker, one Opus fix worker, one Sonnet comment fix): `src/core/edit.ts` (~728
  lines) — the three-scan ring with both skid B-cycles (skid 1 preserving the neighbour's
  word mark), the four scan-1 latches per §3.6's table, the p.50 body rules (enabling `*`
  consumes an A character), the scan-2 re-arming rule with its scan-2-local decimal latch,
  §7.4's two unconditional word-mark answers, the extension-latch still-stored A character,
  the eight-case BAR table, `terms.Z`/`terms.D`, one yield per B-cycle skids included.
  `oracle/mce-figure34.ts` — **the confirmation read landed**: all 46 steps of A22-0526-3
  Figure 34 via the S223-2698 Figures 23A/23B reprint (bitsavers, `pdftotext`; A22-0526-3's
  scan has no text layer), 26 B/skid-cycle entries + 8 A-folds, every OCR adjudication
  commented, a 250-check mechanical replay clean, all 14 §7.3 anchors matched. The trace
  test drives every cycle through `stepCycle()`. Tier-1: 25+ cases — the eight BAR rows,
  the 04668 skid word-mark survival, single-character edit (BAR-discriminating), asterisk
  fill, floating dollar, decimal control both ways, the CARS re-arming example, `b*b0`
  consumption, truncation, the `*`+`$` refusal as a stop. `E` row implemented; the
  `implemented: false` case deleted (Wave E installs the inverse); `laterWaves` and
  `PHASE_1B_OPS` emptied.
- Tests (orchestrator run): typecheck clean; `Tests  849 passed (849)` expected at commit
  (verified below); smoke `5 passed`; cc01 `CC01A` / `CC01 COMPLETE` / stop `E ØØ322`,
  1241 instructions — unchanged.
- Deviations from plan: PHASE-1B-NOTES.md §2 items 12-14.
- Research corrections: PHASE-1B-NOTES.md §3 — six §7 corrections in their own commit
  (S223-2698 pp.50-51, Fig 23A p.52), plus the rtk-folding phantom recorded.

### Wave D review — rode the wave commit

- Findings: 0 blocker, 2 MAJOR, 2 moderate, 6 minor/low. Majors, both against the primary
  page: the enabling `*` did not consume an A character (p.50 rule 4 — fixed, vector
  added); scan-2 re-arming of zero suppression absent (pp.50-51 — implemented, CARS
  vector). Moderates: the claimed §7.3 step-14 disagreement (an rtk artifact, no §7.3
  change) and the early-A-WM single-scan inference (now behind
  `MCE_EARLY_A_WM_ENDS_AT_SCAN_1` with a BAR-discriminating vector). Minors: scan-2 fill
  class narrowed to zeros+commas; the `*`+`$` refusal became an UnsupportedFeature stop;
  the eight-case switch's unreachable self-check dropped; A-data-register header note;
  skid-2 extension latch set; significance-flag comment rewritten (A2b).
- Verified correct by the reviewer: ALL 26 fixture entries against the raw OCR (not a
  sample); the 14 anchors; both skids' storage semantics; the single-scan decision reading
  the latch only; §7.4 both unconditional; `terms.Z = 8` on Figure 34; the interleave rule
  (steps 31/32); ownership exact; one new OPEN constant with an existing row (wrap) and
  one with a new row (early A WM); gates re-run raw.

## Wave E — the generalised inverse, documents — commit f2dac89 (+ final docs commit)

- Shipped (one Opus worker): `BUILT_SO_FAR` complete at 24 ops with an exact-set derivation
  case; the `implemented: false` case replaced by §7 criterion 5's generalised inverse;
  `open-questions.md`'s Phase 1b section closed — five new rows open, three carried rows
  confirmed-still-open, `[derived]` settled, the `[observed]` cc01 note, nothing struck
  (the architecture.md MCE row recorded eligible-to-close pending its own file's pass).
- Tests (orchestrator run): typecheck clean; `Tests  851 passed (851)` across 48 files —
  0 failed, 0 todo; smoke `5 passed`; cc01 `CC01A` / `CC01 COMPLETE` / stop `E ØØ322`,
  1241 instructions, 82543.5 µs — unchanged end to end.
- Exit criteria (§7): 1-6 verified by the orchestrator and independently by the Wave E
  reviewer (tier3-arith runs five halt-terminated sub-blocks, `@` 02600→02644 and `%`
  02700→02766 included; the machine check green with its five liveness cases); criterion 7
  verified on the `export const` lines (the literal `grep 'OPEN:'` matches prose headlines —
  PHASE-1B-NOTES §2 item 16): eight constants ↔ eight §1 rows, both directions exact.
- Deviations: §2 item 15 (STATUS.md reserved for the main session at merge, per the
  orchestrator brief — the one Wave E reviewer "blocker" overruled on instructions).

### Wave E review — resolved in this commit + the final docs commit

- Findings: 2 blocker (this log entry, now present; STATUS.md — overruled, logged), 2 minor
  (§4 staleness fixed; the criterion-7 grep noted as a plan defect). Verified by the
  reviewer: all seven §7 criteria from its own runs; the closing block pure-append with
  honest tags; the exact-set case non-circular; ownership clean.
