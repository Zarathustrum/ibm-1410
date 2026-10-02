# Phase 6 (reentry showcase) — design-panel dossier

Output of the FULL design panel, workflow run `wf_cf69d70d-d3a`, 2026-09-03 on `voltron`, against
`main` at `53b46d4`. Three Opus architects (exact-solution-first / paper-first / reuse-first) -> three
Opus judges (period fidelity / buildability / testability) -> this Opus synthesis. 7 agents, 1.61M
tokens, ~53 min, 0 errors. The main session (the orchestrator) wrote the kickoff brief and the
statement the architects read, and ruled on the dossier's open items before the plan was written.

**This file is panel evidence, not the plan.** `docs/plans/phase-6-reentry.md` is written FROM it,
in the sixteen-section shape of `phase-3-autocoder.md` / `phase-5-rpg.md` / `phase-4-period-ui.md`.
Every number carried forward below was checked against the proposal that stated it AND against the
tree in this synthesis session; where a judge's figure and my re-measurement differ, mine is the one
printed and the difference is named.

---

## Winner

**paper-first** — the page and the integration are the spine, with exact-solution-first's altitude
band and page-parsing oracle and reuse-first's gate mechanics, RPG predicate and scope discipline
grafted in.

| angle | total | per lens |
|---|---|---|
| paper-first | **448** | period fidelity 152 (2nd) · buildability 148 (2nd) · testability 148 (2nd) |
| exact-solution-first | **431** | period fidelity 168 (1st) · buildability 131 (3rd) · testability 132 (3rd) |
| reuse-first | **422** | period fidelity 118 (3rd) · buildability 152 (1st) · testability 152 (1st) |

### Why it won

It is the only proposal with no last place, and — the finding that settles it — it is the only one
whose page is both a real trajectory and produced by the oracle `architecture.md:1031` names. I
re-integrated all three cases this session (drag-only two-state RK4 at each proposal's own dt,
`scratchpad/band.mjs`). paper-first's case reproduces digit for digit: at t = 21.50 s I get
h = 152,801.0 ft and V = 22,946.8 ft/s against its mock's `152,801` and `22,947`; its β_B = 31.081
slug/ft² and γ = −30° give K = 2.4066, eq.15 y₁ = 34,570 ft and eq.17 peak 68.73 g, matching its
trailer to the digit. That peak sits at 33,654 ft — the band a ballistic RV actually decelerates in.
exact-solution-first's peak is at 24,111 ft and 62.89 g, also real. reuse-first's is at 93,582 ft
with K = 35.18, and its vehicle **never arrives**: integrating its own case, V at sea level is 0 and
the body asymptotes in the stratosphere, so roughly the last third of its 120 rows show a vehicle
hanging under a heading that reads BALLISTIC REENTRY TRAJECTORY. On a phase whose deliverable is a
sheet of paper that is disqualifying for its case parameters, which is why the best build discipline
on the panel cannot carry the spine.

Two of the three judges recommended reuse-first's skeleton, and both did so on grounds that survive
inside paper-first rather than against it. Judge 2's case is scope (`zero new modules under src/`)
and gate mechanics; judge 3's is the commit ordering and the RPG predicate. Every one of those is a
rule, not a physics choice, and every one is grafted below. Judge 1's case against reuse-first is
not a preference — it is that the page is not a reentry. Judge 1's case FOR exact-solution-first is
strong on arithmetic and weakest exactly where it matters most structurally: stepping on altitude
deletes the integration, and with it `architecture.md:1031`'s named Phase-6 oracle ("the emulated
fixed-point run must track a double-precision reference integration"), leaving eq.13 as the thing
the program computes rather than the thing that checks it. Judge 3 made the same call independently.
So the ruling is paper-first's spine with exact-solution-first's arithmetic apparatus bolted on top
of a real integrator, and reuse-first's rules governing how it is built.

paper-first's own defects are real and all of them are fixable without touching its spine: it runs
the model 250,000 ft above the band its authors defined, it has no `h <= 0` guard (its own step 91
lands at −322 ft with V = 2,001 ft/s — reproduced exactly this session), its positions-per-instruction
figure is a quarter low, its `RHOR` field has no decade companion, its DEFERRED-01 ruling accepts a
red gate that does not need to exist, and its punch-station wave is 765 lines of art in a phase whose
deliverable is a page. Each is corrected below from a loser or from this synthesis.

---

## The seven bullets

1. **The page is the spine and the integration stays.** paper-first's twelve-column, 132-position
   page is the specification, cut from a column map of end positions and MCE control words committed
   to `docs/BUILD-LOG-6.md` before the golden (Phase 5 §10.5's discipline). The model is Allen-Eggers
   drag-only two-state (V, h) at constant γ, integrated in time by RK4 — NOT tabulated on an altitude
   grid — because `architecture.md:1031` names the Phase-6 oracle as "a double-precision reference
   integration in TypeScript" and a tabulator of eq.13 makes that oracle vacuous. The integrator order
   is chosen by paper-first's measured table (Euler 587 / Heun 24.0 / midpoint 14.8 / **RK4 0.011**
   ft/s worst |V − V_eq13| at dt = 0.5), where RK4 at dt = 0.5 and RK2 at dt = 0.25 cost the same 360
   derivative evaluations for 330× the accuracy — which discharges the `[unverified]` "RK4 is what
   the era used" claim (`avco-and-reentry.md` §5, §10) by measurement instead of by appeal.

2. **The table starts at 150,000 ft, and the page says why.** Allen-Eggers neglects gravity against
   drag through the pulse (`avco-and-reentry.md` §4); at 400,000 ft drag is nil and gravity is the
   only term, so the model is being run 250,000 ft above its own band. Re-integrated this session at
   paper-first's case: **26 of its 90 rows (29% of the sheet) print VELOCITY 23,000**, and over the
   21.7 s of that coast a real vehicle would gain g·sin30° ≈ **349 ft/s (1.5%)** — 700× the 0.47 ft/s
   the DIFF column is built to measure. Take exact-solution-first's band and its heading wording
   (`TABULATED FROM 150,000. FT`), keep h_E on the case card and echoed in the heading, and print one
   line stating that gravity is not modelled and the run therefore agrees with eq.13 to the last
   printed digit and with a real reentry to a few percent. Consequence the plan must price: from
   150,000 ft at dt = 0.5 the run is **46 rows, one form**; dt = 0.25 restores 92 rows and three
   forms at double the emulated time.

3. **DEFERRED-01 discharges BEFORE the plan commit, on the feature branch, and the gate is never
   red.** `scripts/check-deferred.sh:69` is `RESOLVED) rc=$((rc+1)); continue ;;` inside the
   `case "$status"` block — a RESOLVED entry is skipped before its trigger is ever evaluated. So the
   kickoff's "the gate trips at the plan commit by construction" is false and paper-first's "one red
   commit, the alternatives are dishonest" ruling misses a third option that falsifies nothing.
   **The gate line all three proposals state is wrong.** Run this session, today's register reads
   `Summary: 1 ok · 0 tripped · 0 manual · 0 no-trigger · 0 resolved`; after the discharge it reads
   `Summary: 0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved`, exit 0 — DEFERRED-01 is the
   register's only entry. The discharge is a rename (`PROGRAM_STOP_TYPES_S = true`, `[verified]`
   against S223-2648 p.6), a halt in I/E CYCLE types `C` alone, the two emulator-side stops stay
   silent as a category ruling, and the register's "eleven `S` lines in `cc01.cor`" claim is corrected
   with the measured zero.

4. **Four reference layers, and the page is parsed back into numbers.** Layer 1 closed forms
   (eqs.7/13/15/16/17 plus exact-solution-first's `Ei` for elapsed time and `erf` for heat load, both
   derivations checked); layer 2 the double-precision RK4; layer 3 paper-first's fixed-point
   simulator, run before a line of Autocoder exists, **demoted from oracle to regression pin** because
   it and the deck are written from the same scaling table by the same team; layer 4 the emulated
   machine. The gate is layer 4 against layers 1-2 at a published tolerance, not layer 4 against
   layer 3. On top of that, exact-solution-first's criterion 4: parse the golden page back into
   numbers and assert **every computed column on every row** within one unit in the last printed
   digit — which closes the six-column value gap paper-first and reuse-first both ship, where DYN
   PRESS, LOG10 RHO-R, HEAT RATE, HEAT LOAD, RANGE and the DECEL edit are checked by nothing but a
   golden they themselves authored.

5. **The RPG check is four clauses over assembler SYMBOLS, and the kickoff's version is false.**
   Verified this session: `node build/tools/rpg.js demos/card-list.rpg --source` on a job with zero
   control fields emits `01330CTLBRK    B    DTLCAL`, `01340TOTCAL    B    TOTOUT`,
   `01350TOTOUT    B    LVLRST`. The label is always emitted, so "contains no `CTLBRK`" fails on a
   correct build — and a text predicate on `F1` also fails, because `01250          BEF1 LASTCD` is
   in the same output. The predicate asserts over `assemble(generate(...).source).symbols`: no symbol
   matching `/^F[0-9]+$/`, no `/^C[NO][0-9]+$/`, exactly one statement in each of controlBreak /
   totalCalc / totalOutput / levelReset, and the indicator file is `IND DA 1X5` with exactly
   `RC01 OF LC FSTPG PRIME` (verified at `01750IND       DA   1X5`) — plus the positive half (the job
   prints its golden through the real generator, assembler, loader, 1402 and 1411), plus
   exact-solution-first's inversion of the same predicate over `sales-summary.rpg` so it cannot rot
   into a tautology. reuse-first's LR total line rides along as the one piece of generator coverage
   `demos/card-list.rpg` does not already have.

6. **Zero new modules under `src/`, and the punch feed goes live with the minimum retirement.**
   `git diff --name-only --diff-filter=A <base>..HEAD -- src` is empty at every wave; the only `src/`
   edits are wave 0's core rename and the punch-ruling retirement. paper-first's new
   `punchBoxView.ts` (~130 lines inside a ~765-line wave) is refused against `architecture.md:855`
   ("an Autocoder program, no new machinery") and STATEMENT.md's "it adds no station". But the deck
   must punch, because the alternative is an RPG job reading hand-typed trajectory numbers — so
   `PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT` (`hopperView.ts:71`) and `READS_AND_DOES_NOT_PUNCH`
   (`:74`, drawn at `:145`) come out, along with `stackerView.ts:98`'s citing comment and the pins at
   `test/period-reader.test.ts:55, 217-219`. Shipping a deck that punches 46 cards while the drawn
   page says the 1402 does not punch is a false statement on the artifact in the one phase whose
   thesis is honesty on the page.

7. **The size numbers, corrected and re-derived.** The deck is **≈130 condensed cards**: I ran
   `node build/tools/asm.js demos/sales-summary.asm` this session and got **39 condensed cards**, and
   two judges independently measured its 2,033 payload positions, giving **52.1 positions per card** —
   not exact-solution-first's ~70. Code size is **9.6-9.9 positions per instruction** (measured off
   `sales-summary`'s item-length histogram, {12:78, 11:28, 7:42, 6:20}), not paper-first's 7.5, so its
   367 instructions are ~3,600 positions and its high-water moves from 07,230 to **~08,100** on a
   10,000-position machine with `LOADER_CEILING = 499` (`src/formats/loader.ts:199`). The exit
   criterion is paper-first's reasoned **≤ 09,000** ceiling, not reuse-first's 08,000 sitting twelve
   positions above its own estimate. The seven shipped goldens stay at 348 / 2251 / 3688 / 6982 /
   card-list 120 / cycle-probe 2522 / card-face 33,450 — all seven re-measured this session.

---

## Grafts taken from the losing designs

| from | lands in | idea |
|---|---|---|
| exact-solution-first | §2 The printout; §3 the band; §13 criterion | **Start the table at 150,000 ft**, with the heading wording `TABULATED FROM 150,000. FT` and h_E still echoed from the case card. It is the only band choice on the panel that respects both `avco-and-reentry.md` §4's validity condition and a fixed-point machine's dynamic range, and it deletes the 26 informationless rows measured in bullet 2. |
| exact-solution-first | §3 the reference; §11 wave 1 | **Closed forms for the two quadrature columns** — `Ei` for elapsed time and `erf` for heat load under the drag-only configuration (both derivations checked this session: substitute X = e^{−βy}, and the Q integrand reduces to X^{−1/2}e^{−2.15KX}, u = √X giving the erf). Costs nothing in the emulator and converts an asserted quadrature tolerance into a bounded one. |
| exact-solution-first | §13 exit criteria | **Parse the golden page back into numbers and assert every computed column on every row at one unit in the last printed digit.** The single most valuable criterion on the panel; both rivals leave six columns value-unchecked. |
| exact-solution-first | §9 the ledger (fallback only) | The **two-level decimal antilog**: `10^F = ANTA[F1]·ANTB[F2]·(1 + ln10·F3)`, two 100-entry tables at 10 positions = 2,000 positions for ~8 significant digits, against `avco-and-reentry.md` §7's 1,000-entry table (8,000 positions, does not fit) and its 100-entry fallback (4-5 digits). Keep it as the named precision fallback, priced in printed significant digits. |
| exact-solution-first | §3; §13 checkpoints | The **eq.15 `y1 > 0` guard** as both a run-time validity check and a test checkpoint. `avco-and-reentry.md:152` and `:368` are explicit and `[verified]`: eqs.16-17 apply only when y₁ is positive. Absent from paper-first and reuse-first alike, and with β_B on a user-supplied case card it is the one input that can silently invalidate two checkpoints. |
| exact-solution-first | §13; §14 R-regression | The **eq.17 invariance test stated as a regression**, not a checkpoint: re-run with β_B doubled and assert the printed peak-g figure does not move. Free, and it catches a scaling error nothing else sees. |
| exact-solution-first | §4.4 the RPG check | The **two-sided assertion**: the same predicate asserted over the trajectory job AND inverted over `sales-summary.rpg`, so a generator change cannot silently turn the check into a tautology. (Its own clause 1 is false — see corrections.) |
| exact-solution-first | §2; the walkthrough | The **printer-bound period note**: ~190 lines at the 1403 Model 2's 600 lpm is 19.0 s of printing against ~10.9 s of computing, so on real iron the job is printer-bound roughly two to one. The only proposal that priced the printer against its own line count, and the honest answer to "the run is over in 0.2 s of wall clock". |
| exact-solution-first | §2 the mock | Its **heading block is the only chain-A-clean one on the panel** (see corrections): no `=`, no parentheses. Take its `RHO ZERO   .0034000 SLUG/FT3` / `SCALE HEIGHT 22,000. FT` form over the rivals' `RHO = 0.0034 EXP(-Y/22,000)`. |
| reuse-first | §5 DEFERRED-01; §12.2 gates | **Discharge before the plan commit, on the feature branch.** Verified against `scripts/check-deferred.sh:69` — `RESOLVED` is `continue`d before the trigger runs — so the gate is green at every commit, no red window, and no core change on `main`. Retires the kickoff's §2.1 claim and paper-first's §5.6 ruling in one line. |
| reuse-first | §4.4 the RPG check | Assert the predicate over **`assemble(generate(...).source).symbols`**, not over source text, because `01250          BEF1 LASTCD` defeats any `F1` text grep (reproduced this session). Plus the **LR total line** in the trajectory job, which is the one genuinely new generator coverage on the panel: `demos/card-list.rpg` has no total-output specs and its `TOTOUT` collapses to `B LVLRST`. |
| reuse-first | §3.3 the scaling table | **`PROD` is 17 positions, not 16** — multiplicand + multiplier + 1 for an 8×8 multiply, `avco-and-reentry.md:241` `[verified — A22-0526-3 pp.18-19]`. The only proposal that got the multiply B-field width right; exact-solution-first's `PROD16` is one position short in the field the antilog's product lands in. |
| reuse-first | §3 the tables; §11 wave 1 | **`DS`-reserve a large table and build it at run time from one constant**, rather than punching it. Measured by judge 2: a `DS 500` area emits zero payload positions, so a 2,000-position table costs ~40 fewer object cards. Take it at a table size where the digit-slice index is genuinely free (100 or 1,000), not at 200 — and carry the word-mark discipline that comes with it (see Unresolved). |
| reuse-first | §4.3 the card contract | Name the machine-punched deck **`demos/reentry-summary.data.cards`** so `tools/rpg.ts:225`'s existing `sibling(args.spec, '.data.cards')` inference feeds the RPG job with zero new plumbing, and assert the committed deck equals the run's punch pocket. That makes "no trajectory number is ever hand-typed into a file" enforceable rather than aspirational. |
| reuse-first | §5.5 the migration list | The **complete DEFERRED-01 edit list**, including `docs/STATUS.md:161` and `test/loader.test.ts:409` (both verified this session) which the other two miss, AND its section enumerating the sites **deliberately not edited with a reason each** (append-only build logs, historical phase notes, the `id === 'E'` filter tests). That is what makes an edit list auditable rather than merely long. |
| reuse-first | §11; §13 | **Refuse a third listing golden**, with the reason: `renderListing` is already byte-gated twice at 2,251 and 6,982 bytes (re-measured this session), so a third proves nothing and churns on every source edit. This also kills exact-solution-first's wave-4 self-inflicted red gate. |
| reuse-first | §10; §15 ledger | The **`PeriodViewState` correction**: PHASE-4-NOTES §4(c)'s white-form requirement is met by the existing toggle, not by a changed default; state is written and never read and dispatch is a sink, so a per-deck default is four view edits and one mount, not the 4-line cost exact-solution-first budgets. |
| reuse-first | §3.4 the memory map | The map as **contiguous address ranges summing to the machine size**, with every boundary named to a `file:line`, rather than a bag of block sizes. It is the only form a reviewer can check in one pass. |
| paper-first (kept, named here because it is the phase's best build rule) | §11 waves | **RULE: no wave's oracle reads a file a later wave writes**, with every wave row naming its inputs. One line, and it is worth more to an Opus build than the rest of the wave table. |
| paper-first (kept) | §13 criterion 13 | **The last `ConsoleLine` of the trajectory run has `id === 'S'` and its Op group is `.`** — the programmed halt, not the STOP key, not a mode change. Implementable against `machine.ts:226-234`'s `fieldLine`, and the only criterion on the panel that makes wave 0 pay for itself on the artifact. See the corrections for which harness can assert it. |

---

## Rulings where the judges disagreed

**Q. Does the phase integrate a trajectory, or tabulate a closed form?**

- Positions: judge 1 ruled for exact-solution-first's altitude-grid tabulation on the strength of its
  digit-for-digit oracle. Judge 3 ruled the opposite — "keep an actual integration so eq.13 stays an
  independent per-step check rather than the thing the program computes" — and judge 2 named the same
  risk structurally ("a tabulator of a closed form has nothing to integrate, so `architecture.md`
  §8's oracle becomes vacuous").
- **Ruling: INTEGRATE.** Take the exact forms as reference-side checks, not as the program.
- Basis: `docs/plans/architecture.md:1031` names the Phase-6 oracle as "a double-precision reference
  integration in TypeScript; the emulated fixed-point run must track it within the tolerance the
  scaling tables predict", and the kickoff opens by calling the phase "a ballistic reentry trajectory
  integration". Judge 1's argument is that exactness beats independence; that is true of the
  arithmetic and false of the physics, because a program that evaluates eq.13 cannot be checked by
  eq.13. Nothing in exact-solution-first's apparatus is lost by this ruling — `Ei`, `erf`, the
  altitude band, the antilog and the page-parsing criterion all graft onto an integrator.

**Q. Whose spine — reuse-first's (judges 2 and 3) or one of the others?**

- Positions: judges 2 and 3 both recommended reuse-first's skeleton with paper-first's numerics
  grafted on. Judge 1 scored reuse-first 34 points behind paper-first and called its case
  disqualifying.
- **Ruling: paper-first's spine, reuse-first's RULES.**
- Basis: judge 2's and judge 3's cases for reuse-first are its commit ordering, its symbol-based RPG
  predicate, its migration list, its memory-map form, its refusal of a third listing golden and its
  zero-new-modules discipline. Every one of those is a rule that transplants intact and is grafted
  above; neither judge's substantive finding is contradicted by adopting them inside paper-first.
  Judge 1's case against reuse-first does not transplant: with K = 35.18 and β_B = 3.108 slug/ft² its
  vehicle asymptotes in the stratosphere (re-integrated this session, V at sea level 0) and its peak
  deceleration lands at 93,582 ft — a blunt-body number under a heading that says BALLISTIC REENTRY.
  Its case parameters are the design; the page is the deliverable.

**Q. Does the deck punch, and does the punch station come alive?**

- Positions: all three architects chose axis C(iii), print and punch. paper-first budgets ~765 lines
  including a new `src/ui/period/reader/punchBoxView.ts`; reuse-first budgets ~54 lines across three
  existing files; exact-solution-first commits a screenshot of the lit station while its own exit
  criterion 9 forbids touching the punch views. Judges 2 and 3 both found that reuse-first's and
  exact-solution-first's migration lists omit the sites that pin the opposite ruling.
- **Ruling: the deck punches; the station is retired, not rebuilt.** No new module. The edit set is
  `hopperView.ts:71` and `:74`/`:145`, `stackerView.ts:98`, `keysView.ts:179-180`, and
  `test/period-reader.test.ts:55, 217-219` — all verified present this session — plus live stacker
  counts. `punchBoxView.ts` is refused.
- Basis: `architecture.md:855` says "an Autocoder program, no new machinery" and STATEMENT.md says
  "it adds no station". The punch feed is already drawn; making it live is not adding a station. But
  the deck must punch, because the alternative gives the RPG job hand-typed trajectory numbers, which
  reuse-first is right to call dishonest — and a deck that punches beside a drawn line reading "This
  1402 reads and does not punch", asserted true by a green test, is a false statement on the artifact.

**Q. Does the DEFERRED-01 discharge cost a red gate?**

- Positions: paper-first rules for one red commit and calls the alternatives dishonest. exact-solution-first
  and reuse-first both order the discharge first. Judges 2 and 3 both verified the script; judge 1 did
  not rule.
- **Ruling: discharge first, on the feature branch. No red window.**
- Basis: `scripts/check-deferred.sh:69` is `RESOLVED) rc=$((rc+1)); continue ;;` inside the
  `case "$status"` block, evaluated before any trigger. paper-first considered only two alternatives
  (falsify the register, or falsify the trigger) and missed the third, which falsifies nothing because
  the work is genuinely done before the status changes. exact-solution-first's venue (`main`) is
  refused: the branch gives the same green result without a core change on the default branch.

**Q. Twelve columns, or eleven?**

- Positions: `architecture.md:855` commits to twelve. exact-solution-first drops MACH and V(A-E),
  adds V/VE and H DOT; paper-first drops MACH and adds DIFF, keeping GAMMA as a constant column;
  reuse-first prints eleven and refuses GAMMA and MACH with reasons. Judge 1 called the three-way
  divergence a stated architecture commitment settled by three incompatible substitutions.
- **Ruling: twelve, paper-first's set, with GAMMA kept as a constant column.** It is the only set
  that contains all eight of STATEMENT.md's minimum columns, and a column of identical numbers is a
  louder disclosure of the model's central assumption than a footnote, for seven print positions and
  zero arithmetic. All three cut MACH for the same correct reason (`avco-and-reentry.md` §9 calls it
  "an extra tabulated function" needing a speed-of-sound table on a non-exponential temperature
  profile) and that refusal is ratified. Tom may overrule to eleven live columns — see below.

**Q. Is paper-first's fixed-point simulator an oracle?**

- Positions: judge 2 called it "the single best idea in the panel for de-risking a hand-written
  fixed-point program". Judge 3 called exit criterion 7 (exact equality against it at all 90 steps)
  a non-independent oracle with no tie-breaking rule.
- **Ruling: keep the layer, demote the criterion.** The simulator is built and run before any
  Autocoder exists; exact equality against it is a REGRESSION PIN, and the GATE is the emulated run
  against eqs.13/15/16/17 and the double-precision integration at a published tolerance.
- Basis: both the simulator and the deck are written from the same §3.3 scaling table by the same
  team, so their agreement proves a shared implementation, not correctness — and the cheapest way
  past a red gate is to edit the simulator. Judge 2's value is real and is preserved: the simulator
  is still what turns a fixed-point scaling bug into a digit-for-digit comparison during the build.

---

## Corrections the plan must carry

**What the kickoff brief got wrong.**

- KICKOFF §2.1's "**The gate trips at the plan commit by construction**" is false.
  `scripts/check-deferred.sh:69` skips a RESOLVED entry before evaluating its trigger, so ordering
  the discharge first keeps every commit green. Two architects and two judges found this independently.
- KICKOFF §2.2's suggested RPG check — "the generated program for the trajectory job contains no
  `CTLBRK`/`F1` ladder" — is false in both halves. Verified this session on
  `demos/card-list.rpg`, a job with zero control fields: `01330CTLBRK    B    DTLCAL` is emitted, and
  `01250          BEF1 LASTCD` defeats a text predicate on `F1`.
- KICKOFF §2.1(b) points at `test/demo.test.ts:195-203` as the I/E CYCLE discriminator. It is
  `toBeGreaterThanOrEqual(9)` (read this session at `:203`), so it does not move under either ruling
  and discriminates nothing.
- KICKOFF §2.2's PHASE-4-NOTES §4(a) item ("Phase 6 adds a sample button of an existing kind") is
  stale in its `?raw` half: `src/ui/period/raw-import.d.ts` already declares `*.asm?raw`, `*.cards?raw`
  and `*.rpg?raw`. Zero shim work.
- KICKOFF's gate line for after the discharge, repeated by all three proposals as "1 ok / 0 tripped",
  is wrong. Run this session: today reads `Summary: 1 ok · 0 tripped · 0 manual · 0 no-trigger ·
  0 resolved`; after the discharge it reads `0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved`.
  DEFERRED-01 is the register's only entry.

**Against paper-first (the winner).**

- **The 400,000 ft band.** Corrected by graft 1. 26 of 90 rows print VELOCITY 23,000; gravity is
  worth ~349 ft/s (1.5%) over that coast against a 0.47 ft/s DIFF column. Re-integrated this session.
- **No `h <= 0` guard.** Its own step 91 lands at h = **−322 ft** with V = **2,001 ft/s** — reproduced
  exactly this session at its case and dt. `ALTITUDE` is a `9(6)` unsigned field with a comma edit
  word, so the last row prints a negative altitude through an unsigned edit. §3.6's loop control is a
  step counter only, and the case card is advertised as user-supplied.
- **`RHOR` has no decade companion.** §3.3 declares it 8 digits at S=7 with range 1.0000000-9.9999999
  — a mantissa — while §3.6 applies the decade by indexed move into the same field. There is no
  DEC/decade field anywhere in §3.3 or §3.5's work list. Take reuse-first's explicit 2-digit `DEC`
  field, or keep `LOG10 RHO-R` as the only printed form and carry the decade internally with the
  field named.
- **7.5 positions per instruction is ~25% low.** Measured: `sales-summary`'s item-length histogram is
  {12:78, 11:28, 7:42, 6:20}, i.e. 9.6-9.9. 367 instructions is ~3,600 positions, not 2,753, and
  high-water moves 07,230 → ~08,100. Its own R3 and its ≤09,000 ceiling absorb it, but the stated
  number is wrong.
- **§5.2 cites a test that does not exist.** There is no mechanical sweep over `// OPEN:` constants in
  `test/`; `test/period-refusal-grep.test.ts` is a drawn-label grep over string literals. The
  Phase-4 §16 item 3 set difference is a manual process step. Either write the sweep in this phase or
  mark exit criterion 12 as human.
- **The mock is not the program's page and says so.** §2.2's `DIFF` figures are the double-precision
  reference's 0.00-0.01 while the summary line in the same artifact prints `MAXIMUM DIFFERENCE 0.47`.
  Honest, but it means the design "from the page backward" does not yet have the page — and the
  1.00 ft/s tolerance printed on the artifact was chosen after seeing the 0.47 measurement. Either
  derive the printed tolerance from the scaling table or keep it off the paper.
- **The `=` on the page is chain H, not chain A.** My finding this session:
  `src/core/devices/printer1403.ts` `CHAIN_SLUGS` octal 13 is `{a: '#', h: '='}`, so §2.2's
  `RHO = 0.0034 EXP -Y/22,000` prints as `RHO # 0.0034 …` on the A arrangement. Same class as
  reuse-first's parentheses (octal 34 `%`/`(`, octal 74 `⌑`/`)`), which is why reuse-first's
  `EXP(-Y/22,000)` and `100.0 LB/FT2 (GENERIC)` are also wrong. exact-solution-first's heading block
  is the only chain-A-clean mock on the panel. **The plan needs a rule and a test: no character
  outside the A arrangement may appear in any printed literal.**
- **Two internal arithmetic slips**, both mine this session. Bullet 5 says high-water ≈ 07,215 with
  2,800 spare; §3.5 sums to 6,730 and `ORG 00500` gives 07,230 with 2,770 spare. Bullet 4 says
  19,550 instructions; §3.6 sums 17,550 + 1,800 + 135 + 50 + 40 = **19,575**.
- **The eq.15 `y1 > 0` guard is missing** from §3.7's checkpoint table.
- **The 765-line punch wave** — refused above; the retirement edit set replaces it.
- **DKR's ±10-20%** appears once in prose and never beside the HEAT RATE / HEAT LOAD columns, which
  print five and six significant figures. `avco-and-reentry.md:160` says that accuracy "sets the
  precision target for everything downstream".

**Against exact-solution-first (grafted from — fix before any graft is written).**

- Its axis-D check clause 1 ("the generated source contains no `CTLBRK` label") is **measurably
  false** and fails on a correct build. Replaced wholesale by the four-clause symbol predicate.
- Its initialisation logarithms are a binary search over `ANTA`, resolving log₁₀ to ±0.005 — about two
  decimal digits. An 0.005 error in the DKR prefactor is 1.16% in q-dot, which destroys its own
  one-ulp claim for a six-significant-figure `Q DOT` column. Its own stated fallback (punch
  log₁₀ V_E and log₁₀ R_N on the parameter card) is the primary.
- `PROD16` must be `PROD17` — `avco-and-reentry.md:241`, `[verified — A22-0526-3 pp.18-19]`.
- "~70 payload positions per condensed card" is wrong; the measured figure is 52.1, so its 6,687
  positions are ~128 cards, not ~98 — against its own ~150-card alarm.
- Its truncation bound `(ln10)²·F3²/2 ≤ 1.3e-8` should be 2.65e-8 at F3 = 1e-4. Immaterial to the
  total, but it is the one place it claims a derived bound.
- Running Simpson gives values at even-indexed grid points only; the design prints TIME and Q TOTAL
  on all 151 rows and never states the odd-row rule.
- Wave 3 is a monolith: ~1,468 new lines closed by one binary signal, with no intermediate oracle
  between the antilog probe and the full page.
- Wave 4 adds ~25 lines to `demos/reentry.asm` while wave 3 owns a ~500-line listing golden it does
  not own — red at wave 4 by construction. Resolved by refusing the third listing golden.
- Its exit criterion 9 (`git diff --stat -- src/` touches only five named files) contradicts its own
  wave-4 evidence (a screenshot of the lit punch station).
- Nothing in its exit criteria asserts the program FITS in 10K.
- Its antilog argument field is inconsistent: `L` declared 10 digits at S=9, biased +10 into a range
  up to ~16, then sliced for a 2-digit integer — which needs 11 positions, as its own §3.5 `LBIAS(11)`
  says.
- Its `ieCycle` ruling carries no named `OPEN:` constant, against the kickoff's §4 item 9.
- Its §2 heading block is 12 lines while §2.3's pagination arithmetic assumes 8.

**Against reuse-first (grafted from).**

- Its case is not a reentry (see Why it won). Its parameters are refused; its rules are taken.
- Its 200-entry table index is wrong: `MLC FRCHI,IDX+3` yields floor(1000·F), the index into a
  1,000-entry grid, not floor(200·F). `avco-and-reentry.md` §6's "the argument digits ARE the index"
  holds at 10/100/1,000, not at 200.
- No word marks are set for the 200 reserved `ANTI` entries, and its claim that the Clear Storage
  card leaves the area zeroed is doubly wrong: C20-1602-8 clears to blanks (`software.md:260`), and
  judge 2 measured that an emitted deck contains **no Clear Storage card at all** (a two-object-card
  program produces exactly four cards: loader bootstrap, loader body, object, execute).
- Its ≤08,000 memory ceiling sits twelve positions above its own 07,988 estimate and trips on the
  first build. Replaced by paper-first's reasoned ≤09,000.
- Parentheses and `=` on its page (chain A carries neither).
- Only VELOCITY and altitude are value-checked; six columns are defined by a golden they authored.
- Its 50 ft altitude tolerance is underived next to a derived 5.0 ft/s speed tolerance.
- Its punch migration omits `stackerView.ts:98` and `test/period-reader.test.ts:217-219`.
- Its exit criteria never assert the `S` stop print-out on the showcase run, which is the whole point
  of making wave 0 the entry condition.

**Cross-cutting, found by more than one judge or by this synthesis.**

- **All three DEFERRED-01 migration lists miss `PHASE-4-NOTES.md:7`** (verified this session), which
  names `HALT_TYPES_NO_PRINTOUT` in the phase's opening inventory sentence — a rename makes that
  sentence false in a way nothing greps for. Only reuse-first names `docs/STATUS.md:161` and
  `test/loader.test.ts:409`. Judge 2 also found a repo-root
  `whats-next-systems-controls-go-with-the-photograph-2026-09-03T2041.md:123` that no proposal names.
- **The `S` line never appears on the tools path.** `tools/run-deck.ts:99` calls `m.run(max)`;
  `machine.ts:466` is `run(n) { return cpu.run(n); }`, and `printIfError` is called only at `:363`
  and `:370` inside `start()`. So after the discharge, `npm run demo` still produces a console log
  with no stop print-out, and paper-first's criterion 13 is satisfiable **only** through the
  period-session or UI harness. The plan must name which harness asserts it.
- **Subroutine linkage is unspecified in all three**, and every one of them calls an antilog routine
  three to six times per step. `SAR`/`SBR`/`SER`/`SFR` exist in `ALL_MNEMONICS` (op char `G`,
  `src/core/isa/table.ts:1060-1083`, `control.storeAddressRegister` at
  `src/core/isa/exec/control.ts:118`), but `avco-and-reentry.md` §6's timing table gives op G an
  ACCELERATED figure only, and `architecture.md` §12 forbids assuming the Accelerator. The mechanism
  and its unaccelerated cost are both absent from all three µs budgets.
- **Nobody states how the parameter/case card enters the deck**, nor how the 1402's trailing-card rule
  is satisfied — the rule `tools/run-deck.ts:84-88` handles with `readerStart()` then
  `readerEndOfFile()`, citing `software.md` §10.7. A two-file deck needs a stated concatenation rule
  for the sample button, the golden run and the tier-4 storyboard alike. The precedent is
  `demos/hello-dad.cards` + `demos/hello-dad.data.cards`, imported separately at
  `deckBoxView.ts:50` and `coding/sheetView.ts:37-38`.
- **Nobody commits a golden for the 1415 log of the showcase run.** The Selectric roll is named in
  the kickoff as an artifact of the phase, DEFERRED-01 exists solely to make it correct, and
  `renderSelectric` is already the golden renderer used by `test/tier4-period-storyboard.test.ts`.
  The strongest thing on offer is one assertion on the last `ConsoleLine`.
- **Nobody ties the heading block's printed values to the constants the run used.** A deck that prints
  `BALLISTIC COEF 50.00` in an edited heading field while the drag constant was formed from a
  different field is fully self-consistent and passes every criterion in all three proposals. One
  assertion fixes it: decode the heading's edited fields out of the golden page and require them to
  equal the values handed to the reference.
- **No proposal proves its oracle has teeth.** Nothing checks that the tolerance assertions actually
  FAIL when a constant is perturbed by one unit, so a column test that parses the wrong print
  positions and compares empty strings passes forever. A mutation pass over two or three constants,
  asserted to fail, costs a dozen lines.
- **No proposal states what happens when its own tolerance fails during the build.** Every bound was
  set by the author who will supervise the build, and the cheapest way past a red gate is to widen the
  tolerance or edit the reference. The plan needs one line: a tolerance published in
  `docs/BUILD-LOG-6.md` before the golden may not be widened, and the reference may not be edited to
  match the program, without Tom's authorisation — and any such change is its own commit with its own
  reason.
- **The reconstruction disclaimer must be asserted on the RPG page too.** All three assert the framing
  line per form of the trajectory page; each also produces a second printed artifact with its own
  golden and no disclaimer asserted on it.
- **The 132-position claim is taken from the code in all three** (`PRINT_POSITIONS = 132`) rather than
  from A22-1407-2, which `avco-and-reentry.md` §9 cites for exactly that fact. It is the one hardware
  claim on the panel sourced from the tree instead of a form number and page.
- **`avco-and-reentry.md` §6's `[verified by absence]` finding reaches no artifact.** There is no
  published IBM 1410 fixed-point scaling standard; every scaling table in this phase is the project's
  own design. It belongs in the deck's comment block and the walkthrough, not only in a proposal.

---

## Decisions that are Tom's

1. **Integrate or tabulate — the spine ruling itself.** The panel ruled INTEGRATE, on
   `architecture.md:1031`. The alternative is exact-solution-first's altitude-grid tabulation, which
   buys the strongest arithmetic oracle this project has ever had (≤1 ulp on all 151 rows × 11
   columns, measured by its author) and costs the phase's named oracle plus everything downstream of
   it. This is the only decision that changes the shape of the whole phase, and judge 1 ruled the
   other way.
2. **The band.** 150,000 ft (panel's recommendation, from exact-solution-first) against 400,000 ft
   with a gravity note (paper-first as written). At 150,000 ft and dt = 0.5 the run is 46 rows on one
   form; keeping three forms means dt = 0.25 and ~92 rows at double the emulated time. Tom owns which
   of {rows, forms, dt, band} gives.
3. **The job shape and the punch station.** Panel: the deck punches and the drawn ruling is retired
   with the minimum edit set, no new module. Alternatives: paper-first's full station (~765 lines,
   one extra wave, a new `punchBoxView.ts`), or print-only (one deck, two fewer waves, and the RPG
   requirement lands on a hand-typed deck — which reuse-first calls dishonest and it is right).
4. **Twelve columns with a constant GAMMA, or eleven live ones.** `architecture.md:855` says twelve.
   The panel keeps twelve with GAMMA as the visible disclosure of the model's central assumption.
   Eleven live columns is reuse-first's position and it changes the column map.
5. **The case-card numbers.** V_E 23,000 ft/s, γ_E −30°, W/C_D A 1,000 lb/ft² (β_B 31.081 slug/ft²),
   R_N 1 ft, dt 0.5 s — all defensible, all arbitrary within a factor of two, and h_E chosen to match
   `demos/hello-dad.data.cards`. These are the numbers on a period analyst's page.
6. **Whether ~0.2 s of wall clock is acceptable.** A pacing control means touching
   `START_BUDGET = 2000` (`machine.ts:45`), a core constant no phase should move on its own authority.
   The honest alternative is the walkthrough note: 9.8 s of unaccelerated 1411 time against ~19 s of
   1403 time at 600 lpm, so on real iron the job was printer-bound.
7. **Whether the white form becomes this deck's default or stays a control.** PHASE-4-NOTES §4(c)
   calls the white side a Phase-6 requirement; reuse-first reads that as met by the existing toggle,
   and changing the default is state plumbing through a `PeriodViewState` that is currently a sink
   (four view edits and one mount), not a four-line edit.
8. **What the page says about `demos/hello-dad.asm`.** It is titled `HELLO DAD - REENTRY TABLE`,
   prints five hand-typed rows, and is byte-locked by a 348-byte page golden and a 2,251-byte listing
   golden. It is not touched by any proposal. Whether the walkthrough frames it as the first sketch
   beside the real thing, or the sample buttons simply grow from two to three with no commentary, is
   a taste call.
9. **The walkthrough's form** — `docs/WALKTHROUGH.md`, a published artifact, or a facsimile of the
   printed page. The brief's §Phases says "showcase program + walkthrough" and does not say where.
10. **Worktree or main checkout, and whether the phase gets a Fable build orchestrator** per
    `CLAUDE.md`'s model policy. Every worker stays Opus or lower.

---

## Unresolved

What the plan writer must settle, and how.

1. **The internal representation of ρ/ρ_SL over its seven decades.** Settle it by the printed-digit
   rule: decide the printed columns first (`LOG10 RHO-R` at S=3 is the panel's recommendation because
   it is the antilog's own argument and costs nothing), then size the internal field to the worst
   column it feeds. If any internal field must span more than three decades, take reuse-first's
   explicit 2-digit `DEC` companion and name it in the scaling table. Do not ship a mantissa field
   with the decade applied "by indexed move" and no field to hold it.
2. **The antilog's size and build.** Three candidates: paper-first's 101 × 10 `DCW` table (1,010
   positions, ~40 object cards), exact-solution-first's two-level 100 × 100 (2,000 positions, ~8
   significant digits), reuse-first's `DS`-reserved run-time recurrence (one 8-digit constant in the
   source, ~40 fewer cards). Settle by the rule "no printed column may carry more significant digits
   than the error bound supports", applied to the final column map — and whichever is chosen, state
   the word-mark discipline (a `DS` area emits nothing and arrives blank and unmarked; every entry
   needs its field defined before an arithmetic result lands in it).
3. **Subroutine linkage.** Name the mechanism (`SAR`/`SBR`/`SER`/`SFR`, op char `G`, in the tree at
   `src/core/isa/table.ts:1060-1083`) and price it unaccelerated. `avco-and-reentry.md` §6 gives op G
   an accelerated figure only, and `architecture.md` §12 forbids assuming the Accelerator, so the
   plan owes a derivation from A22-0526-3 Fig.7's formula or an explicit `[unverified]` constant with
   a fallback.
4. **Code size, and therefore the high-water.** Re-derive the instruction count at the measured
   9.6-9.9 positions per instruction before the memory map is committed, and state the ceiling with
   its margin reasoned (≤09,000 against a ~08,100 design). If the ceiling is threatened, the named
   fallback is the u^3.15 table dropping to a 5-position stride (−555) at the cost of one multiply
   per step.
5. **The case card's position in the deck**, and the concatenation rule for the sample button, the
   `--golden` run and the tier-4 storyboard — including how the 1402's four-trailing-card rule is
   satisfied (`tools/run-deck.ts:84-88`, `software.md` §10.7).
6. **Which harness asserts criterion 13.** The tools path never types the `S` line
   (`tools/run-deck.ts:99` → `machine.ts:466` → `cpu.run`, with `printIfError` only inside `start()`),
   so the assertion must run through `machine.start()` or the period session. Name the file.
7. **The scope of the 1415 log golden** — the whole roll of the showcase run (B, the mode turns, D,
   A, RUN, and the new `S` at the halt) against just the tail. The panel's recommendation is the whole
   roll through `renderSelectric`, the renderer `test/tier4-period-storyboard.test.ts` already uses.
8. **The mutation pass's scope** — which constants are perturbed, and which assertions must go red.
   Two or three is enough; the point is to prove the column and tolerance assertions are live rather
   than decorative.
9. **The printed tolerance.** Either derive the number that appears in the summary line from the
   scaling table (so it is a property of the design), or keep the tolerance off the paper and assert
   it only in the test. Do not print a bound chosen after seeing the measurement.
10. **The row count and the pagination after the band change.** 46 rows at dt = 0.5 from 150,000 ft
    fits one form; the heading block, the overflow heading and the summary block all change with the
    form count, and the golden's byte size follows. Settle it before the column map is committed,
    because the map and the pagination are one artifact.
