# Phase 6 (reentry showcase) — plan

Companion to [architecture.md](architecture.md) §4.11, §7 row 6, §8, §12, and to
[phase-4-period-ui.md](phase-4-period-ui.md) §1 (the storyboard) and
[phase-5-rpg.md](phase-5-rpg.md) §10-§16, whose section order, table conventions and level of
concreteness this plan follows. Written FROM
[phase-6-panel-dossier.md](phase-6-panel-dossier.md) — seven Opus agents, 1.61M tokens, winner
**paper-first** with exact-solution-first's altitude band, page-parsing oracle and closed-form
quadratures and reuse-first's gate mechanics, RPG predicate and scope discipline grafted in — and
from the orchestrator's rulings on it. Where the dossier and the rulings differ, the rulings win, and
the departures this plan makes from either are named where they are made (§5.6 the antilog, §5.7 the
u^3.15 table, §5.11 the memory map's instruction density, §11 the wave re-cut, and §15 rows 24-29 the
rulings added when the plan was assembled). **The density departure, stated here because it is the
one a reader would otherwise take for a transcription slip:** RULINGS §E 21 binds the memory map to
*"instruction density at the measured 9.6-9.9 positions/instruction"*, and §5.11's map spends
**10.1** — above that band, deliberately, because 9.87 is the `{6,7,11,12}` subset of a job whose mix
is not Phase 6's, and a map that under-spends is a map that has to move after wave 3 measures. The
band, the subset and Phase 6's own mix are all derived in §5.11.

Single build on `feature/phase-6-reentry`, worktree per the Phase 2/3/5 precedent, arriving at
`bb7cd7e`. Every machine claim cites a manual form number and page, or a `docs/research/` file and
section. Every `[unverified]` / `[likely]` item is in §15 with its named `// OPEN:` constant and its
fallback. **1401 ≠ 1410** throughout, and the sharpest hazard in this phase is not that: it is
mistaking arithmetic the emulator can do for arithmetic a 1961 fixed-point decimal program could do,
which is why every number on the page is traced back to a scaling table in §5 and every scaling
decision to a printed digit in §7.

**Four claims in the kickoff brief are corrected here, and this plan owns the corrections rather
than repeating them.** (a) `check:deferred` does **not** trip "by construction": `scripts/check-deferred.sh:69`
is `RESOLVED) rc=$((rc+1)); continue ;;` and skips a resolved entry *before* its trigger is evaluated —
the red window exists only if the discharge lands after the plan commit, which is §9.9's decision 1.
(b) The suggested RPG check ("the generated program contains no `CTLBRK`/`F1` ladder") is false in
both halves — `01330CTLBRK    B    DTLCAL` is emitted on a job with **zero** control fields and
`01250          BEF1 LASTCD` defeats a text grep for `F1` — so §8.6's predicate runs over assembler
symbols. (c) `test/demo.test.ts:203` is `toBeGreaterThanOrEqual(9)` and discriminates nothing on the
I/E CYCLE ruling, so it is on §9.5's deliberately-unedited list rather than in the migration.
(d) PHASE-4-NOTES §4(a) is stale in its `?raw` half: `src/ui/period/raw-import.d.ts:33-46` already
declares `*.asm?raw`, `*.cards?raw` and `*.rpg?raw`. Zero shim work.

**This is the last phase, and the deliverable is a sheet of paper.** A family member read reentry
trajectory output at Avco in the early 1960s. No IBM 1410 is documented at any Avco site
(`avco-and-reentry.md` §1-2, `[verified]` as a negative for the sources searched), their originals do
not survive, and the page therefore says on its face what it is.

---

## The seven bullets

1. **The page is the specification, and the machine integrates a trajectory rather than tabulating a
   closed form.** Twelve columns on the 132 print positions A22-1407-2 pp.5-8 gives the 1403 Model 2
   (`avco-and-reentry.md` §3, §9 — cited to the manual, not to `PRINT_POSITIONS`): 73 positions of
   data, eleven three-position gutters, a 13-position margin each side, 13 + 73 + 33 + 13 = **132**.
   The column map with every end position, digit count and MCE control word is committed to
   `docs/BUILD-LOG-6.md` **before** the golden (Phase 5 §10.5's discipline), and the model behind it
   is Allen-Eggers drag-only two-state (V, h) at constant γ, **integrated in time by RK4** — because
   `architecture.md:1031` names the Phase-6 oracle as *"a double-precision reference integration in
   TypeScript"* and a program that evaluates eq.13 cannot be checked by eq.13. The closed forms
   (eqs.7/13/15/16/17, plus `Ei` for elapsed time and `erf` for heat load) are reference-side checks,
   and one of them — eq.13 — is also **column 4 on the page**, with the difference in column 5, so
   the run validates itself in the same ink.

2. **The table starts at 150,000 ft and runs 92 rows at dt = 0.25 s over three inked forms.**
   Allen-Eggers neglects gravity against drag (`avco-and-reentry.md` §4, `[verified]`), so running
   from 400,000 ft prints rows of a vehicle that has not begun to decelerate under a heading that
   says BALLISTIC REENTRY — the panel measured **26 of 90 rows at dt = 0.5 printing VELOCITY
   23,000**, over a coast in which a real vehicle would gain ~349 ft/s. From 150,000 ft the run is
   t = 0.00 → **22.75 s**, h = 150,000 → **198.8 ft**, and the 93rd step lands at h = −62.2 ft where
   the `h ≤ 0` guard refuses it. The band top is a **state**, not just an altitude: (t, V, h) =
   (0, **22,939.54 ft/s**, 150,000 ft), the Allen-Eggers curve of eq.13 continued down from
   h_E = 400,000 ft, which is why row 1 prints VELOCITY 22,939 under a heading that says ENTRY
   VELOCITY 23,000 (§4.1, §7.3). Form 1
   carries an **eleven-line** heading block — eight printed lines and three blanks — a
   four-line column-heading group, and 45 rows to paper line 60; the **channel-12 overflow latch**
   opens form 2, which carries 47 rows; a programmed `CC1 1` opens form 3 for the summary. Two
   different page-break mechanisms, both exercised, and `BUILD-LOG-4.md:420-425`'s carriage-straddle
   expectation met. h_E = 400,000 ft stays on the case card and is echoed in the heading, and one
   printed line states that gravity is not modelled.

3. **One non-elementary operation in the whole program: a decimal antilog, 1,000 positions, called
   six times per printed row — and there is no u^3.15 table.** `ANTA` holds 10^(i/100) for i = 0…99
   at a ten-position stride, so the entry offset is a move one position left rather than a run-time
   multiply, and the residual is a quadratic in r < 0.01 evaluated by Horner: three multiplies,
   truncation **2.034e-6** relative. `avco-and-reentry.md` §7's 1,000-entry table (8,000 positions)
   does not fit and its 100-entry linear form (6.63e-4) is too coarse for a `DYN PRESS` column whose
   last printed digit is **1.456e-5** of its maximum. The u^3.15 table the research recommends was built
   and **measured** at 1.09e-2 worst relative error through the simulator, and its *pure* linear-
   interpolation error — independent of how many digits are stored, because the interpolation bound
   is absolute and u^3.15 spans **3.26 decades** over this trajectory — is **1.180e-2 at u = 0.0846**
   (§5.7, exhaustive over every subinterval of the du = 0.01 grid this session) — so the heating goes through logs instead, which is IBM's own
   documented rule (`A**B` from `EXP(B*ALOG(A))`, C28-0328-3 p.10, `[verified]`) and removes 1,110
   positions of table. No square root is computed anywhere. Op `T` is implemented and deliberately
   unused: a 1,000-entry search costs **24,786 µs** against an indexed `MLC`'s **183 µs**, both
   recomputed this session from `src/core/cycles.ts`'s own formulas.

4. **Four reference layers, tolerances derived from the scaling table and published before the
   golden, and the page parsed back into numbers.** Layer 1 the closed forms; layer 2 the
   double-precision RK4; layer 3 the fixed-point simulator, **a regression pin and never the gate**,
   because it and the deck are written from one scaling table by one team; layer 4 the emulated
   machine. The gate is layer 4 against layers 1-2. Every computed column on every one of the 92 rows
   is parsed out of the golden page and asserted **within one unit in its last printed digit**;
   the heading's edited values are decoded and required to equal the case card's; a **mutation pass** of
   five — four constants perturbed by one unit each, and **the parse position itself shifted by one**
   — asserts the column and tolerance tests go red. The
   published tolerance on `|VELOCITY − V A-E|` is **0.50 ft/s**, derived from S = 2 on V over 92 steps
   plus the antilog's 2.034e-6 before the simulator was run against it; the measured worst is
   **0.07 ft/s**. A published tolerance may not be widened, and the reference may not be edited to
   match the program, without Zarathustrum's authorisation.

5. **The deck prints AND punches, the punch was proved end to end this session, and the RPG job
   tabulates the punched cards.** `P1 0,PAREA` through the real assembler, the real condensed loader,
   the real 1402 and the real 1411 leaves `punch.stackers['0'] === 1` with `channel1` all-clear and
   **zero core changes** — and it found three things no proposal names: the punch area needs its own
   group mark, that group mark must be word-marked at run time by `SW PAGM` exactly as
   `demos/sales-summary.asm:53` marks `PLGM`, and its source glyph is `⧧` and not `‡`. The committed
   `demos/reentry-summary.data.cards` **is** the punch pocket's contents, asserted equal after the
   run, so no trajectory number is ever hand-typed into a file; `tools/rpg.ts:225`'s existing
   `.data.cards` sibling inference feeds the RPG job with zero new plumbing. The station is
   **retired, not rebuilt** — `hopperView.ts:71`, `:74`/`:145`, `stackerView.ts:98`,
   `keysView.ts:179-180` and `test/period-reader.test.ts:55, 212-220`, all verified present — because
   shipping a deck that punches 92 cards beside a drawn line reading *"This 1402 reads and does not
   punch"*, asserted true by a green test, is a false statement on the artifact in the one phase
   whose thesis is honesty on the page.

6. **Zero new modules under `src/`, and DEFERRED-01 discharges in wave 0 as a rename.**
   `git diff --name-only --diff-filter=A <base>..HEAD -- src` is empty at every commit. The only
   `src/` edits in the phase are wave 0's core rename and its two citing comments, wave 5's
   punch-ruling retirement, wave 6's two sheet views, and — if Zarathustrum takes decision 6 — the pacing item:
   **~110 lines across nine existing files, ~90 across eight without the pacing item, and no file created.**
   `HALT_TYPES_NO_PRINTOUT` is deleted and `PROGRAM_STOP_TYPES_S = true` declared, `[verified]`
   against S223-2648 p.6 *"a program stop, an error stop, the stop key, or any cycle step, will
   initiate a stop print-out"*; a halt under I/E CYCLE types the `C` line alone; the interlock and
   the two emulator-side stops stay silent as one category ruling. **The register's cost claim is
   wrong and the discharge corrects it**: `npm run cc01` PASSes at 00322 in 1241 instructions and the
   executed-op histogram contains no op `.` at all, so the rename moves **zero bytes** of the cc01
   transcript. It matters because `tools/run-deck.ts:101` calls `m.run(max)` while `printIfError`
   lives only inside `start()` (`machine.ts:355-374`, called at `:363` and `:370`), so the operator's 1415 roll ends silently
   today — and the artifact this project exists to produce needs the operator to be able to tell a
   finished job from a jammed one.

7. **The size and time numbers, measured, not guessed.** Instruction density is **9.32 positions per
   instruction** whole-program off `demos/sales-summary.asm` (185 imperative statements, 1,724
   positions) and **9.87** over the `{6,7,11,12}` instruction-length subset the dossier used; Phase
   6's own move-heavy mix gives **10.1**, which is what the memory map spends — above RULINGS §E 21's
   9.6-9.9 band, declared in the header as a departure. The map is contiguous
   ranges summing to 10,000 with every boundary at a `file:line`, high-water **08,732** on the
   pessimistic density and ≈08,352 on the measured one, against a reasoned ceiling of **≤ 09,000**
   asserted from `AssemblyResult.symbols`. The object deck is an estimated **154 condensed cards** at the measured
   **52.13 payload positions per card** (`sales-summary`: 2,033 positions in 39 cards, re-measured
   this session), plus the loader bootstrap, the loader body, the execute card and one case card —
   **158 cards in the hopper**, and both figures are estimates that waves 3 and 5 replace with the
   assembled count (§13 criterion 18 asserts the measurement, never the estimate). The run is **41,543 instructions and 15.93 s of emulated
   unaccelerated 1411 time**, 21 frames at `START_BUDGET = 2000`, against **11.7 s** of 1403 time at
   600 lpm: this job is
   compute-bound by about a third, not printer-bound. Those figures are **printed in
   `docs/BUILD-LOG-6.md`, never asserted** — the cc01 precedent. The seven shipped goldens stay at
   348 / 2251 / 3688 / 6982 / 120 / 2522 / 33450 bytes, all seven re-measured this session.

---

## 1. The storyboard, step by step

This is what the owner and a family member do. Every later section exists to make one of these steps true, and §13
is this list turned into assertions. Each step names the criteria that check it.

1. **Open the page.** `npm run dev`. The period desk is as Phase 4 left it: the coding sheet, the
   1402 station with its hopper and its stackers, the 1415 console with its Selectric roll, the 1403
   with green-bar stock and a plain-white toggle, and — new in this phase — a punch feed that is no
   longer inert. The 1402 station's page no longer says *"This 1402 reads and does not punch"*,
   because as of this phase it does. → criteria 7, 16.

2. **Press `sample program` on the coding sheet, and take the third of the three.** The source box
   fills with `demos/reentry.asm` — ≈820 80-column Autocoder cards (§6.13, summed block by block)
   headed `BALLISTIC REENTRY
   TRAJECTORY`, opening with the comment block that says what this is: that no published IBM 1410
   fixed-point scaling standard exists and the scaling table below it is the project's own design
   (`avco-and-reentry.md` §6, `[verified by absence]`); that `G ccccc B` after a taken branch is the
   subroutine-return mechanism (`opcodes.md:222`, `[verified]`, 69.75 µs unaccelerated); and that no
   IBM 1410 is documented at any Avco site. The data box fills with `demos/reentry.case.cards` — one
   card. `demos/hello-dad.asm` is still the first button and is not touched: the walkthrough frames
   it as the first sketch — five printed lines off **five** hand-typed data cards, three of them
   rows and two of them the title and the column heading, under the title
   `HELLO DAD - REENTRY TABLE` — beside the ninety-two the machine computes. → criteria 4, 5.

3. **Read the coding sheet before pressing anything.** The case card is one 80-column card and it is
   readable: `C`, then V-E, then GAMMA-E as the six characters `-30.00` that the page will print,
   then SIN GAMMA-E and COT GAMMA-E and LOG10 V-E and LOG10 R-NOSE — the trigonometry and the
   logarithms an analyst took off a desk table and punched, because this machine has no trig library
   and a binary search over the antilog would resolve log₁₀ to ±0.005, which is 1.16 % in the heating
   column. The deck does not trust them: before it integrates, it proves `SIN² (1 + COT²) = 1` and
   antilogs both logarithms back against their own fields, and halts with a printed diagnostic if
   either disagrees. → criterion 11.

4. **Press ASSEMBLE.** Phase 3's shipped path. The 1403-format listing renders with `ok === true`,
   **0 flagged lines and 0 warnings**, and the object deck appears as its condensed card faces —
   **≈154** on §6.13's estimate, and criterion 18 asserts the number the assembler actually returns —
   plus the execute card. The zero warnings are load-bearing and not decorative: they are what says
   the reserved areas sit where the loader's terminating group-mark-with-word-mark cannot land inside
   them (Phase 5 §8.1), which is the same rule that makes the punch area work. → criterion 5.

5. **Press PUNCH INTO HOPPER.** ≈158 cards: bootstrap card, loader body card, **≈154** object cards,
   the execute card, then the one case card (§6.13's estimate; 1 + 1 + 154 + 1 + 1 — the object-card
   count is measured, not asserted, and criterion 18 takes it from `assemble(...).deck.records.length`). The 1402's trailing-card rule is satisfied the way
   `tools/run-deck.ts:84-88` does it — READER START then END OF FILE, `software.md` §10.7. → criterion 18.

6. **At the 1415: STOP, MODE = DISPLAY, 00000, START; MODE = ALTER, key `AL%1000012$R`; COMPUTER
   RESET; MODE = RUN; START.** C28-0351-5 p.8, `[verified]`. The Selectric types `S`, `S`, `D`, `D`,
   `S`, `A`, `S` on the way in — the STOP key, the turn to DISPLAY, the address and data lines, the
   turn to ALTER, the keyed line, the turn to RUN — exactly as it does today (§9.4, §10.4).
   → criterion 18.

7. **Watch the paper move.** The 1402 pulls the whole hopper; the 1403 lays down a heading block, three
   column-heading lines and then a row every quarter-second of flight. At `START_BUDGET = 2000` the
   run is 21 animation frames and about a third of a second of wall clock, which is not something a
   person can watch — so this plan carries a real-time pacing item at §10 as its own wave item,
   buildable or droppable on Zarathustrum's word, that computes the frame's budget from the simulated-µs delta
   so the desk runs at 1411 speed and the whole job takes the **15.93 s** it took the machine. → criterion 19.

8. **The run ends on a programmed halt, and the 1415 says so.** The last line of the Selectric roll
   is an `S` whose Op group is `.` — the programmed stop, not the STOP key, not a mode change. That
   line does not exist today; DEFERRED-01 exists to make it exist, and it is the whole reason the
   deferred item is this phase's entry condition rather than a side item. → criterion 18.

9. **Tear off the form and read it.** Three sheets. Form 1's heading block names the run: entry
   velocity, entry angle, the entry altitude the case card carries, the generic ballistic
   coefficient stated as generic, the nose radius, the atmosphere constants, the integrator and the
   step. Three framing lines say what this is — that no IBM 1410 is documented at any Avco site, that
   Avco RAD Wilmington ran an IBM 704 from 1958, that this is a period-plausible reconstruction and
   not a record of one — and one more says that gravity is not modelled and that the run therefore
   agrees with NACA 1381 eq.13 to the last printed digit and with a real reentry to a few percent.
   Then twelve columns, and column 5 is the machine's own error printed beside the answer: a
   1961 fixed-point program showing its work, worst **0.07 ft/s** over 20,821 ft/s of deceleration.
   Press the plain-white toggle on the 1403 and read it again on plain stock, which is what a
   twelve-column table wants (PHASE-4-NOTES §4(c)). → criteria 12, 13, 14, 15, 21.

10. **Look at the punch feed.** 92 cards in pocket 0, one per printed row, unedited numeric fields
    with a record code and a sequence number — the machine-readable intermediate a period shop
    carried down the hall. → criterion 16.

11. **Press `sample specs` on the RPG sheet, and take the second of the two.** The spec box fills
    with `demos/reentry-summary.rpg` — **54** specification cards (§8.4, written and run this
    session), one record type, **no control fields**, a heading, a detail line, and an LR total line. The data box fills with
    `demos/reentry-summary.data.cards`, which is the deck the 1402 just punched, byte for byte.
    → criterion 16.

12. **GENERATE, SEND TO AUTOCODER, ASSEMBLE, PUNCH INTO HOPPER, run.** The generator emits the
    seventeen-section cycle with its control-break machinery **absent**: no `Fn` indicator symbol, no
    `CN`/`CO` save area, one statement in `CTLBRK`, one in `TOTCAL`, one in `LVLRST`, and a `TOTOUT`
    that holds only the LR block. That is `STATUS.md:221`'s requirement, demonstrated on a trajectory
    table, with a predicate over assembler **symbols** rather than over source text — because
    `01330CTLBRK B DTLCAL` is emitted on a correct build and `01250 BEF1 LASTCD` defeats any text
    grep for `F1`, both re-verified this session. The extract prints: five columns, ninety-two rows,
    and the reconstruction line on every form of it too. → criterion 17.

13. **At the CLI, the same walk, headless.** `npm run asm -- demos/reentry.asm --listing`;
    `npm run demo -- demos/reentry.cards --golden test/golden/reentry.page.txt`;
    `npm run rpg -- demos/reentry-summary.rpg --page --golden test/golden/reentry-summary.page.txt`.
    Both `tools/run-deck.ts` and `tools/rpg.ts` drive the machine through `machine.start()` from this
    phase on, so the console log the CLI prints carries the stop print-out the desk does — today
    neither does, because both call `machine.run()`. → criteria 1, 12, 17, 18.

14. **Read the walkthrough.** `docs/reentry-walkthrough.md` walks the whole thing again in prose, at
    the desk and at the CLI, with the printed page reproduced and every reconstruction caveat stated
    — including the three the artifacts themselves cannot carry: that the column layout is
    period-plausible and undocumented, that RK4 as period practice at Avco is unverified, and that
    the Detra-Kemp-Riddell correlation is itself accurate only to ±10-20 %. → criteria 20, 21.

That ninth step is the whole phase. It is also `test/tier4-reentry-target.test.ts` and
`test/reentry-page-parse.test.ts`.

---

## 2. Scope

### 2.1 In

- **One Autocoder program, `demos/reentry.asm`**, written by hand in C28-0309-1 standalone Autocoder
  — no macros, no IOCS, no `EX`/`XFR` — assembled by the **shipped** `assemble()`, loaded through the
  **real** condensed loader and the **real** 1402, printed on the **real** 1403 and punched on the
  **real** 1402 punch feed. It reads one case card, integrates a ballistic reentry trajectory,
  prints a twelve-column table on three forms, punches one summary card per printed row, prints a
  summary block and halts.
- **The physics**: Allen-Eggers drag-only, two states (V, h), constant flight-path angle, exponential
  atmosphere ρ = 0.0034 e^(−y/22,000) slug/ft³ (NACA Report 1381 eq.7, `[verified]`), integrated in
  time by **RK4** at dt = 0.25 s from an altitude band top of 150,000 ft. Deceleration, dynamic
  pressure, log₁₀ of the density ratio, Detra-Kemp-Riddell stagnation heating and its running
  integral, ground range, and eq.13's closed-form velocity with its difference from the integrated
  one.
- **The arithmetic**: fixed-point decimal with a constant documented implied point per variable,
  rescaled by a Move between offset addresses because the machine has no shift instruction
  (`avco-and-reentry.md` §6, `[verified]`, and `pi.job`'s own comments). Half-adjust with
  `A +5,WORK-n+1` before every truncating move. Sign as zone bits on the units position; the minus
  test is **`BZN target,FIELD,B`** — "Branch if Zone Equal B", d = `K` (`src/core/isa/dmods.ts:214`),
  minus being the B bit alone (A22-0526-3 p.16 Fig.11). The third operand is op `V`'s **zone word**
  (`V_ZONE_WORD_IS_THE_THIRD_OPERAND`, `src/asm/mnemonics.ts:70-77`), not a raw d, and
  `BZN … ,-` **does not assemble** — measured this session (§6.6). Multiply B-fields **17 positions** — multiplicand 8 +
  multiplier 8 + 1 (A22-0526-3 pp.18-19, `[verified]`). **Zero divides at run time.**
- **One transcendental primitive**: a decimal antilog 10^F from a 100-entry table at a ten-position
  stride plus a quadratic residual, fetched by **indexed `MLC`** and never by op `T`
  (`avco-and-reentry.md` §6-7, `[verified]` cost arithmetic, recomputed here from `src/core/cycles.ts`).
  Both the atmosphere and the heating go through it; the heating goes through it in logs, which is
  IBM's own `A**B = EXP(B*ALOG(A))` rule (C28-0328-3 p.10, `[verified]`).
- **Subroutine linkage** by `B SUBR` … `SBR EXIT+6` … `B 00000`, the `G ccccc B` mechanism of
  `opcodes.md:222`, priced at 69.75 µs unaccelerated per call from `oracle/timing.json:42` and stated
  in the deck's comment block.
- **A case card**, 80 columns, read at run time, carrying V_E, γ_E as printed characters, sin γ_E,
  cot γ_E, log₁₀ V_E, W/(C_D A), R_N, log₁₀ R_N, h_E, the band top and dt — with two consistency
  checks the deck performs on it before it integrates.
- **A punched summary deck**, one 80-column card per printed row, unedited numeric fields with a
  record code and a sequence number, committed as `demos/reentry-summary.data.cards` and asserted
  equal to the run's punch pocket.
- **One RPG job, `demos/reentry-summary.rpg`**, over that deck: one record type, **no control
  fields**, a heading, a detail line, an LR total line — the demonstration `STATUS.md:221` and
  `PHASE-5-NOTES.md` §4 require, with a four-clause mechanical predicate asserted positively over it
  and **inverted** over `demos/sales-summary.rpg`.
- **The punch station's retirement**: `PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT` and
  `READS_AND_DOES_NOT_PUNCH` come out and the drawn prose is replaced by what the feed now does —
  **no new module**, an edit set of **~26 lines across four existing files** (three under `src/`).
  Two things it is *not*: the pocket counts are **already live** (`stackerView.ts:45-52` reads
  `p.stackers['0']` and `p.stackers['4']` every frame — only the prose saying they stay at zero is
  false), and PUNCH START / PUNCH STOP **stay inert**, because `INERT_KEYS` is derived from the key
  strip and `Machine`'s whole unit-record surface is `loadDeck` / `readerStart` / `readerEndOfFile` /
  `endOfJob` (`machine.ts:130-148`) — there is no punch-start call to wire and adding one is a
  `src/core` change this phase does not have. The punch runs under program control from `P1`, and the
  drawn line says so (§8.8).
- **The DEFERRED-01 discharge**: `PROGRAM_STOP_TYPES_S = true` in `src/core/machine.ts`, `[verified]`
  against S223-2648 p.6, with its I/E CYCLE ruling and its category ruling on the three silent stops,
  its complete migration list, and the register corrected.
- **Four reference layers** in `test/fixtures/reentry-reference.ts` with no `src/` dependency, and
  the tolerances they gate at, published in `docs/BUILD-LOG-6.md` before any golden exists.
- **Four goldens**: the four-column integration dump (wave 3), the twelve-column page (wave 4), the
  RPG extract page (wave 5), and the 1415 Selectric roll (wave 6).
- **A third coding-sheet sample button and a second spec-sheet one**, of the existing kind. No `?raw`
  shim work: `src/ui/period/raw-import.d.ts:33-46` already declares `*.cards?raw`, `*.asm?raw` and
  `*.rpg?raw`, and its own comment at `:26` says *"Phase 6's `*.asm?raw` line goes here"* — it is
  already there. PHASE-4-NOTES §4(a) is stale in that half and this plan does not repeat it.
- **`docs/reentry-walkthrough.md`**, the walkthrough the brief's §Phases names.

### 2.2 Out — every row with its reason and its page

| Cut | Why, with its citation | What it would cost to restore |
|---|---|---|
| **Gravity, Earth curvature, a varying flight-path angle** — the planar four-state set (V, γ, h, s) | It removes columns 4 and 5. eq.13 is the closed-form solution **only** for the non-rotating, flat-Earth, constant-γ, drag-only problem Allen and Eggers set up (`avco-and-reentry.md` §8's caveat, `[verified]` — NACA 1381 pp.5-6), so with gravity in the loop the `V A-E` column stops being a check and becomes a second, different answer. It also needs sin γ and cos γ as tabulated functions, ~2,000 more positions, and ~13 multiplies per derivative evaluation against this design's 9. | One constant term −g₀ sin γ_E in `DERIV` and one add — the cheap half — plus two tables and two more states for the honest half. Priced in §4 as the third band option; it is Zarathustrum's decision 2. |
| **MACH** | `avco-and-reentry.md` §9 calls it *"an extra tabulated function"* needing a speed-of-sound table over a non-exponential temperature profile — the one column in that section's twelve that is not free, for a quantity that is near-meaningless above 200 kft. All three architects cut it for this reason and the panel ratified the refusal. | A temperature model, a speed-of-sound table (~1,100 positions) and one divide per row. |
| **RHO printed as a density** | Seven decades of dynamic range on a machine with no floating format (`avco-and-reentry.md` §3, `[verified]`: the string "floating" appears in A22-0526-3 only as "floating dollar sign"). A mantissa-plus-decade pair costs two columns; a fixed scale prints zeros for thirty rows. `LOG10 RHO-R` is the antilog's own argument, four digits of range, and free. | One column and a decade field that already exists internally (§5). |
| **A `DS`-reserved antilog table built at run time** | It saves ~19 object cards and costs the word-mark discipline: a `DS` area emits nothing, arrives blank and **unmarked**, and the emitted deck contains **no Clear Storage card at all** (measured by the panel; C20-1602-8's clear is to blanks, `software.md:260`). Every entry's field would have to be defined before an arithmetic result landed in it, in a loop, with no oracle until the whole table is built. | `ANTA` becomes `DS 1000` plus a build loop of ~20 instructions and a word-mark pass. Measured this session: the 100 contiguous ten-character `DCW` cards emit **1,000 payload positions in 19 object records**, so the `DS` option saves 19 object cards — and the 100 source cards are the honest cost of a table that arrives correct. |
| **Op `T` (Table Lookup) anywhere in the phase** | `avco-and-reentry.md` §6, `[verified]` — recomputed here from `src/core/cycles.ts`: a 1,000-entry search is `tTableLookup(12,3,3995,500)` = **24,786 µs** and a 100-entry search **2,511 µs**, against an indexed `MLC` at **183 µs**. The bracketing-direction rule is also `[unverified]` (Figure 26's OCR is mangled, §7 of the research). The grid is uniform and the argument digits **are** the index. | Nothing is gained. Op T stays implemented from Phase 1b and unused, with the reason recorded — the honest outcome. |
| **A `u^3.15` table** | Built and measured this session at **1.09e-2** worst relative error over this trajectory, because five stored decimal places of u^3.15 carry one significant digit at u ≈ 0.08. That breaks the printed-digit rule for `HEAT RATE` (4.5e-5) and `HEAT LOAD` (5.1e-5). **This is a departure from the rulings' named memory fallback and it is stated as one.** | The 111-entry table is 1,110 positions and would force both heating columns down to four significant digits. |
| **A software-float path — `FRA`/`FST`/`FA`/`FS`/`FM`/`FD`** | They are interpreted by the FORTRAN arithmetic routines (C28-0309-1 appendix, `[verified]`), FORTRAN is out of scope (`architecture.md` §12), the object-time package `1410-FO-138` does not survive, and whether the pseudo-ops work without linking it is undocumented (`avco-and-reentry.md` §10). | A package that does not exist. Stays out. |
| **A third listing golden** | `renderListing` is already byte-gated twice, at 2,251 and 6,982 bytes, both re-measured this session. A third proves nothing new and churns on every source edit and every comment change in a ≈820-card deck. | `test/golden/reentry.lst` and a re-cut on every wave that touches the source. |
| **A new module under `src/`** | `architecture.md:855` — *"an Autocoder program, no new machinery"* — and STATEMENT.md's *"it adds no station"*. Asserted mechanically at every commit (§13 criterion 7). | The refused `punchBoxView.ts`, ~130 lines inside a ~765-line wave, in a phase whose deliverable is a page. |
| **Changing `START_BUDGET`** | A core constant (`src/core/machine.ts:45`) that no phase should move on its own authority. The pacing item of §10 computes the **budget passed to** `machine.start()` from the simulated-µs delta and leaves the constant alone. | ~20 lines in `src/ui/main.ts`'s frame, UI-only, and it is Zarathustrum's decision 6. |
| **A per-deck plain-white default** | PHASE-4-NOTES §4(c)'s requirement is met by the existing toggle. `PeriodViewState` is currently a sink — written and never read — so a per-deck default is four view edits and one mount, not a four-line change. | Four view edits, one mount, and a state that means something. Zarathustrum's decision 7. |
| **Tape, disk, channel 2, Priority, storage protection, 1401 mode, FORTRAN** | `architecture.md` §12, settled. | — |
| **Any edit to `src/asm/**`, `src/rpg/**` or `src/formats/**`** | Phase 6 is a **consumer** of the assembler, the generator and the loader, and all three are this phase's oracles. A defect that could be hidden by an assembler edit is the one failure mode the phase cannot detect. | An escalation — a dated `open-questions.md` row and a note to the orchestrator — never a quiet edit. |

### 2.3 Settled ground this plan restates and does not re-open

Named here so no wave re-litigates them and no reviewer has to go looking.

- **The machine is 10K.** `createMachine({ size: 10_000 })` at `src/ui/main.ts:22`,
  `tools/run-deck.ts:82`, `tools/rpg.ts:121`. `CTL 1` is the 10K core-size code (`software.md:150`).
  `demos/hello-dad.asm:4` and `demos/sales-summary.asm:6` both say so on the page. Low core is not
  ours: bootstrap 00000-00011, index registers 00025-00099 at five positions each
  (A22-0526-3 pp.14-15 Fig.9), the condensed loader below `LOADER_CEILING = 499`
  (`src/formats/loader.ts:199`) with its re-entry at 00281. User programs `ORG 00500`.
- **The I/O statement form** was settled 2026-08-31 and shipped: `R1 0,LINE,$`, `W1 LINE`,
  `P1 0,AREA`, `CC1 1` / `CC1 S`, `BA1 *+1` after every I/O. The mnemonic supplies channel, device,
  mode and d; the programmer writes the pocket and the B-address.
- **The print idiom** is `demos/sales-summary.asm`'s, verbatim: `CS PLINE+131`, `CS PLINE+99`,
  `MLCA` / `MLCWA` + `MCE` into `PLINE`, `W1 PLINE`, `BA1 *+1`, `CC1`, `BCV1` after a detail or total
  line and never after a heading line. Phase 6 introduces **no new output pattern**.
- **The reserved-area rule** is Phase 5 §8.1's: every reserved area sits above the code, with one
  slack position between the code and the first of them, so the loader's terminating
  group-mark-with-word-mark lands on nothing and `warnings` stays empty. This phase extends it to the
  punch area and pays for it — see §6 and §8.
- **A label beginning in column 7 resolves HIGH-order** (`src/asm/types.ts:27`,
  `LABEL_INDENT_COLUMN`, `[likely]` for the standalone). `PLINE` and `PAREA` are both indented for
  that reason; forgetting it puts the I/O address at the wrong end of the area and the run takes an
  address check. Measured this session.
- **Paper geometry.** 132 print positions at 10 cpi and 66 line positions at 6 lpi, three lines per
  half-inch bar; `DEFAULT_CARRIAGE_TAPE` punches channel 1 at line 1, channel 9 at 57, channel 12 at
  60 (`src/core/devices/printer1403.ts:212-218`, `[unverified]` as a punching and `[verified]` as a
  mechanism). `paginate` is proved over three forms and `renderGreenBar(paper, {chain:'A',
  formLines:66})` is the golden renderer; `PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR`
  (`src/ui/period/paper/page.ts:45`) is why the two agreeing is evidence.
- **Chain A carries no `=`, no `(`, no `)` and no `+`.** `CHAIN_SLUGS` octal 13 is `{a:'#', h:'='}`,
  34 is `{a:'%', h:'('}`, 74 is `{a:'⌑', h:')'}`, 60 is `{a:'&', h:'+'}`. Every printed literal in
  this phase is chain-A-clean and a test sweeps for it.
- **`CARRIAGE_NEVER_BUSY`** (declared at `src/core/channel.ts:138`, carried on
  `src/core/types.ts:331` and cited at `printer1403.ts:412`): the I/O term is 0, so `BA1 *+1` after a `W1`
  never spins. The idiom is still written, because a period program wrote it.
- **`demos/hello-dad.asm` is not touched**, and neither are its two goldens at 348 and 2251 bytes.
- **Model policy.** Every worker is Opus or lower; Sonnet only for mechanical work. Commit format per
  global `CLAUDE.md` with the footer `(anthropic claude-code opus-5 / host-b)`; no `Co-Authored-By`.
  `docs/research/*` is never edited in a build wave — a research correction is an escalation with its
  own commit. `main` is never pushed without Zarathustrum's per-instance authorisation.

### 2.4 Zarathustrum's ten decisions, on one page

RULINGS' preamble binds the plan to carry *"the default AND the alternative, priced, so his answer is
one word"* for every item marked **ZARATHUSTRUM**. There are ten of them and they are scattered through the
sections that own their arithmetic, so they are gathered here once. **Every default is the
orchestrator's recommendation**; nothing below is built until he answers.

| # | The decision | Default (recommended) | The alternative, and its price | Owned by |
|---|---|---|---|---|
| **1** | **The register gate at the plan commit.** | **Ordering A** — the arrival commit is red for exactly one commit on the feature branch, `main` untouched, reported as such | Ordering B: a `src/core` change lands **before Zarathustrum has gated the plan**, against `CLAUDE.md`'s phase gate, and the dossier and this plan must be held outside `docs/plans/` on disk for two commits. Never red, at the cost of bookkeeping in service of a green light | §9.9, §12.2 |
| **2** | **The altitude band, and gravity.** | **150,000 ft, drag-only** — 92 rows, eq.13 an identity to the last printed digit, column 5 measuring the **machine's** error | 400,000 ft with a gravity note (26 informationless coast rows return), or add `−g₀ sin γ_E` (one constant, one add, 0.33 % of the budget) and run from 400,000: physically more honest above the pulse, but the DIFF column prints up to 420 ft/s of **physics** in a field designed for 0.07 ft/s of **arithmetic**, §4.5's 0.50 ft/s tolerance is withdrawn, §13 loses two criteria, ≈ one wave of rework | §4.1, §15 rows 9-10 |
| **3** | **The job shape.** | **Print AND punch, and the RPG job tabulates the punched cards** — no new `src/` module, the committed `demos/reentry-summary.data.cards` **is** the punch pocket, and the station is retired in ~26 lines across four files | **Print-only**: two fewer wave items (§8.1-§8.3 and §8.8 both go), but `STATUS.md:221`'s RPG requirement then lands on a **hand-typed** data deck — a trajectory number typed into a file, which is exactly what §8.3's deep-equal assertion exists to forbid — and the drawn line *"this 1402 reads and does not punch"* stays true only because the machine was not asked to. **Paper-first's full station** is refused outright: a new module under `src/` (§2.2, §14 R15). Criteria 16 and 17 leave the plan under print-only | §8, RULINGS §C 12 |
| **4** | **Twelve columns, or eleven live ones.** | **Twelve**, with `GAMMA` a constant column printing `-30.00` on every row — the loudest available disclosure of the model's central assumption (§4.1 property 4) | **Eleven live columns**: drop `GAMMA`. Widths fall 73 → 67 and the gutter count 11 → 10, so either the gutters or the two margins absorb six positions and §7.2's map re-flows end to end. It changes the **column map only** — no arithmetic, no scaling row, no reference layer — but it re-cuts `test/golden/reentry.page.txt` and every parse position in `test/reentry-page-parse.test.ts`, and the constant-γ assumption then lives only in the framing line | §7.2, RULINGS §B 9 |
| **5** | **The case-card numbers.** | V_E 23,000 ft/s · γ_E −30.00° · W/(C_D A) 1,000.0 lb/ft² · R_N 1.00 ft · h_E 400,000 ft · band top 150,000 ft · dt 0.25 s — defensible, arbitrary within a factor of two, printed `GENERIC` | Any other punched card. Every golden re-cuts and no program line changes — except that W/(C_D A) ≠ 1,000.0 also breaks §5.1's `β_B` / `1/g₀` shared-digit coincidence and costs one more `DCW`, and §5.9's alternative (punching `1/(2β_B)` on the card) needs eight columns §6.12's layout does not have | §4.2, §5.9, §6.12, §15 row 3 |
| **6** | **Real-time pacing at the desk.** | **Build it** — ~20 lines in `src/ui/main.ts`'s frame, `START_BUDGET` untouched, default ON with a `1411 SPEED` checkbox, so §1 step 7 takes the 15.93 s the machine took | Decline: the item, `test/period-pacing.test.ts` and the checkbox drop as a unit, `src/ui/main.ts` is not touched at all, the phase's `src/` change falls to ~90 lines across eight files, and "watch the paper move" is a **0.35 s** run plus a sentence in the walkthrough | §10.6, §15 row 28 |
| **7** | **The plain-white form.** | **No default change** — the existing toggle meets PHASE-4-NOTES §4(c), and the walkthrough tells the operator to flip it | A per-deck default: `PeriodViewState` is currently a sink (written, never read), so it is four view edits and one mount, not four lines | §2.2, §15 row 23 |
| **8** | **What the desk says about `demos/hello-dad.asm`.** | **Nothing new** — no caption, no ordering change, no relabelling; the buttons grow from two to three and the walkthrough does the framing | A drawn caption beside the sample buttons: drawn text with no oracle — the class `phase-4-period-ui.md` §12's refusal grep, that plan's criterion 18a, is the standing check on — and a new `test/period-refusal-grep.test.ts` surface | §10.5 |
| **9** | **The walkthrough's form.** | **`docs/reentry-walkthrough.md`**, Markdown beside the other docs | A published artifact: changes where it lives and nothing about what it says, and takes it out of `git log --follow` at close-out | §16 item 10 |
| **10** | **The build process.** | **RULINGS §F 30 as written**: branch `feature/phase-6-reentry`, worktree per the Phase 2/3/5 precedent, the build orchestrator an **Opus** subagent (Fable seats substituted by Opus this session, Zarathustrum's instruction), every worker Opus or lower, **per-wave Opus adversarial review before each commit**, §12.2's gate at every commit, one browser screenshot per UI-visible wave, `main` never pushed without his per-instance word | Relax any term. The one with a price worth naming is the review cadence: a single whole-branch review instead of eight per-wave ones saves seven passes and gives up the property §11 is built on — that a wave's defects are found while its own oracle is the only thing in the diff. The Phase 4 and Phase 5 records are that per-wave review caught findings the whole-branch pass did not. Dropping the worktree costs the ability to run `main`'s gate side by side; dropping the screenshots costs §11.6's two questions, which are the only check on §14 R16 | §11, §11.6, RULINGS §F 30 |

---

## 3. File list and ownership

Eight waves, 0-7. **All new files are listed with the wave that owns them; a file is written by
exactly one wave, and only `demos/reentry.asm` and its assembled `demos/reentry.cards` are grown by
later ones — waves 4 and 5, each stated below.** Line counts are estimates for files that do not exist; the wave that lands each one records
the real number in `docs/BUILD-LOG-6.md`.

### 3.1 Wave 0 — DEFERRED-01. No new source; one new document.

| File | Edit | ~lines |
|---|---|---|
| `src/core/machine.ts` | `:47-65` the `OPEN:` block and `HALT_TYPES_NO_PRINTOUT` → `PROGRAM_STOP_TYPES_S = true` with the S223-2648 p.6 citation and the three-stop category ruling; `:234-243` `printIfError` → `printStop(stop, mode)`; `:360-365` and `:368-371` call it; `:236-238`'s prose corrected | ~40 changed |
| `test/machine-console.test.ts` | `:13` the import; `:137-159` inverted — `.` in RUN now gives `['B','S']`, a STOP after it `['B','S','S']`, the constant pinned by its new name; **one new named case**: `.` under I/E CYCLE gives `['B','C']` | ~30 |
| `test/tier4-period-storyboard.test.ts` | `:262` gains one `'S'`; `:263-265`'s four `S ` rows at matrix 35 become five | ~4 |
| `src/ui/period/console/session.ts` | `:102-111` the citing comment, including its "eleven `S` lines" claim | ~12 |
| `src/ui/period/console/rotaryView.ts` | `:110` the constant's name | ~2 |
| `docs/deferred-work-register.md` | `:21-38` → **RESOLVED**, with the cost corrected to the measured **zero** and the command that measured it | ~16 |
| `PHASE-1-NOTES.md` | `:32` — **append** one dated `SUPERSEDED` line; rewrite nothing | ~1 |
| `PHASE-4-NOTES.md` | `:7`, `:62`, `:389-399`, `:515-518` — one dated line each | ~4 |
| `docs/BUILD-LOG-6.md` | opened by the **arrival commit** with its Arrival section (§16 item 7, the Phase 4/5 precedent); wave 0 **appends** its own section | ~90 |
| `docs/screenshots/phase-6/README.md` | **NEW** — git tracks no empty directory; `docs/screenshots/phase-4/README.md` is the shape and the `wave-N-<station>.png` naming rule is its | ~10 |
| `docs/research/open-questions.md` | `:174`, `:952`, `:1036-1037`, `:1054`, `:1098` — **the escalation commit, its own commit, research only** | ~25 |

The sites deliberately **not** edited, with a reason each, are §9's list; they include
`test/loader.test.ts:409` and `test/demo.test.ts:203`, both of which were read this session and both
of which filter on an id the rename does not move.

### 3.2 Wave 1 — the reference layers. No `src/`, no `demos/`.

```text
test/fixtures/reentry-reference.ts    OWNED, NEW
                  Layer 1: eqs.7/13/15/16/17 in double precision, plus Ei for
                  elapsed time and erf for heat load, both derivations stated in
                  the header.  Layer 2: the double-precision RK4 over the same
                  two-state set with the same trapezoid for Q.  Layer 3: the
                  fixed-point simulator at §5's scaling table and §5's antilog,
                  quantising at each S-value.  NO src/ IMPORT OF ANY KIND.        ~430
test/reentry-reference.test.ts        OWNED, NEW
                  §4's layer-1-against-layer-2 table at the tolerances this wave
                  publishes; the eq.15 y1 > 0 guard at W/(Cd A) = 5,000; the
                  eq.17 invariance regression at beta_B doubled                   ~210
test/reentry-tables.test.ts           OWNED, NEW
                  ANTA against Math.pow at all 100 entries and 200 interpolated
                  points, within 1.0e-5 relative; the quadratic residual's
                  truncation bound asserted numerically                            ~120
test/reentry-scaling.test.ts          OWNED, NEW
                  §5's scaling table asserted AS DATA: every row's digit count
                  is >= the range it claims, every rescale offset equals
                  S_a + S_b - S_target, and PROD is 17                             ~110
```

### 3.3 Wave 2 — the antilog probe, the first Autocoder that runs.

```text
demos/probe-antilog.asm               OWNED, NEW   ~160 source cards
                  ANTA, ANTLOG, a read loop over argument cards, a print of the
                  mantissa and the decade.  The subroutine that ships in
                  demos/reentry.asm is THIS ONE, copied forward by wave 3.
demos/probe-antilog.data.cards        OWNED, NEW   ~105 cards (100 arguments + trailers)
test/tier3-reentry-antilog.test.ts    OWNED, NEW   ~150
                  The probe through the real assembler / loader / 1402 / 1411,
                  digit for digit against layer 3's antilog at 100 arguments
                  spanning -10 .. +6, the negative-argument bias and the decade
                  slice named among them
```

### 3.4 Wave 3 — the integration.

```text
demos/reentry.asm                     OWNED, NEW   ~596 source cards at this wave
                  Comment block, CTL 1, ORG 00500, the case-card read and its two
                  consistency checks, constants, ANTA (100 DCW cards), ANTLOG,
                  DERIV, the RK4 driver, the h <= 0 and y1 > 0 guards, the loop,
                  and a bare four-column dump (TIME, ALTITUDE, VELOCITY, V A-E)
demos/reentry.case.cards              OWNED, NEW   1 card — §6's case card
demos/reentry.cards                   OWNED, NEW   the assembled hopper deck, the
                  demos/hello-dad.cards precedent.  REGENERATED by waves 4 and 5
                  whenever demos/reentry.asm grows, and asserted equal to
                  assemble(demos/reentry.asm).deck in test — the Phase-3 closed
                  loop, test/tier3-asm-load-equals-memory.test.ts's shape
test/golden/reentry-dump.page.txt     OWNED, NEW   ~4,300 bytes
test/tier3-reentry-integration.test.ts OWNED, NEW  ~230
```

### 3.5 Wave 4 — the page.

```text
demos/reentry.asm                     GROWN by ~202 source cards (heading block,
                  twelve columns, overflow heading, summary block, and ~40 DCW
                  cards of printed literal).  demos/reentry.cards regenerated with
                  it.  Wave 3 owns both files; wave 4 adds to them, and it
                  re-cuts test/golden/reentry-dump.page.txt out of existence by
                  replacing the four-column dump — that deletion is this wave's,
                  stated here so it is not discovered.
test/golden/reentry.page.txt          OWNED, NEW   ~14,600 bytes, three \f-separated forms
test/tier4-reentry-target.test.ts     OWNED, NEW   ~200
test/reentry-page-parse.test.ts       OWNED, NEW   ~280
                  The page parsed back into numbers; the heading's edited values
                  decoded; the mutation pass M1-M4; the chain-A literal sweep
```

### 3.6 Wave 5 — the punch and the RPG job.

```text
demos/reentry.asm                     GROWN by ~20 source cards (SW PAGM, PAREA,
                  PAGM, the card builder, P1 0,PAREA, BA1); demos/reentry.cards
                  regenerated with it, and this is the LAST wave that moves either
demos/reentry-summary.data.cards      OWNED, NEW   92 cards, 7,452 bytes
demos/reentry-summary.rpg             OWNED, NEW   54 specification cards (measured, 8.4)
test/golden/reentry-summary.page.txt  OWNED, NEW   9,648 bytes, two forms (MEASURED, 8.7)
test/reentry-punch-card.test.ts       OWNED, NEW   ~180
test/rpg-no-control-break.test.ts     OWNED, NEW   ~140
```

Edits to files wave 5 does not own — **the punch-station retirement, ~26 lines across four files**,
every line number read this session:

| File | Edit | ~lines |
|---|---|---|
| `src/ui/period/reader/hopperView.ts` | `:59-71` the `OPEN:` block and `PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT` are **deleted**; `:74-77` `READS_AND_DOES_NOT_PUNCH` is replaced by a line that says what the punch feed now does and cites `demos/reentry.asm`; `:137` `block('punch feed — empty')` loses its "— empty"; `:145` draws the replacement line | ~10 |
| `src/ui/period/reader/stackerView.ts` | `:98-101` — the citing comment at `:98-99` and the *"0 (NP) and 4 … stay at zero"* line at `:100-101`. `:96-97` is the tail of a different and correct sentence about pocket 8/2 and is **not** touched. **The counts themselves are already live** at `:45-52` | ~4 |
| `src/ui/period/reader/keysView.ts` | `:179-180` the reason line only — the two keys **stay** in `INERT_KEYS` (`:98`), because that constant is derived from the strip and no `Machine` call exists to wire | ~2 |
| `test/period-reader.test.ts` | `:55` the imports; `:212-220` the case, whose four assertions are at `:216-219` — rewritten as the positive case, with `expect(INERT_KEYS).toEqual([...])` left standing | ~10 |

### 3.7 Wave 6 — the desk and the tools.

```text
test/tier4-reentry-storyboard.test.ts OWNED, NEW   ~320
test/golden/reentry-console.txt       OWNED, NEW   ~390 bytes (the whole Selectric roll,
                  eight lines; the size is DERIVED from measured line widths in 10.4, not
                  estimated — an earlier ~1,400 guess was high by about three and a half)
test/period-pacing.test.ts            OWNED, NEW   ~60   OPTIONAL, Zarathustrum's decision 6 —
                  dropped as a unit with the pacing item (10.6)
```

| File | Edit | ~lines |
|---|---|---|
| `src/ui/period/coding/sheetView.ts` | two `?raw` imports and a third sample button, of the existing kind | ~10 |
| `src/ui/period/specs/sheetView.ts` | **two** `?raw` imports and a second sample button. `:32-33` imports `demos/sales-summary.rpg?raw` **and** `demos/sales-summary.data.cards?raw` **by name** — the `.data.cards` sibling inference is `tools/rpg.ts:225`'s and is CLI-side, so the UI needs both new files named | ~10 |
| `tools/run-deck.ts` | `:101` `m.run(max)` → a `m.start(START_BUDGET)` loop, so the CLI's console log carries the stop print-out | ~12 |
| `tools/rpg.ts` | `:133` the same | ~10 |
| `src/ui/main.ts` | **OPTIONAL, Zarathustrum's decision 6** — the frame's budget computed from the simulated-µs delta, with a control to turn it off. `START_BUDGET` itself is not touched | ~20 |

### 3.8 Wave 7 — the record.

```text
docs/reentry-walkthrough.md           OWNED, NEW   ~450
PHASE-6-NOTES.md                      OWNED, NEW   ~300  (four sections, matching PHASE-5-NOTES.md)
test/reentry-open-constants.test.ts   OWNED, NEW   ~70   the // OPEN: set difference, both
                  directions, over the four source domains of 16 item 3 and PHASE-6-NOTES 1 --
                  criterion 20's oracle, and the sweep Phase 4's 16 item 3 claimed and never wrote
docs/BUILD-LOG-6.md                   GROWN        the closeout section
docs/research/open-questions.md       a new dated `## Phase 6 — 2026-…` section only    ~40
docs/STATUS.md, docs/DECISIONS.md     THE ORCHESTRATOR'S — amended at the merge, never by a wave
```

### 3.9 Do not touch

`src/asm/**` · `src/rpg/**` · `src/formats/**` · `src/core/**` beyond wave 0's `machine.ts` change ·
`src/ui/period/**` beyond wave 5's four-file retirement and wave 6's two sheet views ·
`src/ui/unitrecord/**` · `src/ui/autocoder/**` · `src/ui/internals/**` · `index.html` ·
`demos/hello-dad.*` · `demos/sales-summary.*` · `demos/card-list.rpg` · `demos/cycle-probe.rpg` ·
every existing golden · every existing test except the three named in §3.1 and §3.6 ·
`docs/plans/*.md` — **every plan except this one**, and `docs/plans/phase-6-panel-dossier.md` is
panel evidence and is not edited either · `docs/BUILD-LOG.md` through `docs/BUILD-LOG-5.md` ·
`PHASE-2-NOTES.md`, `PHASE-3-NOTES.md`, `PHASE-5-NOTES.md` · `CLAUDE.md` ·
`whats-next-systems-controls-go-with-the-photograph-2026-09-03T2041.md` (tracked, verified; a dated
handoff note, left as written).

`docs/research/*.md` is **never edited in a build wave.** Wave 0's `open-questions.md` edits are the
**escalation commit** and are its own commit; wave 7's are a new dated section only. A correction to
anything above either is an escalation to the orchestrator with its own commit — the Phase-1b,
Phase-3 and Phase-5 precedent.

### 3.10 The zero-new-modules guarantee

`git diff --name-only --diff-filter=A <base>..HEAD -- src` is **empty at every commit of this
branch**, and §13 criterion 7 asserts it. Phase 6 adds demos, tests, goldens, three documents, two
sample buttons and a walkthrough. The only `src/` edits in the whole phase are:

- wave 0's `src/core/machine.ts` rename (~40 lines) and its two citing comments —
  `console/session.ts` (~12) and `console/rotaryView.ts` (~2);
- wave 5's three-file punch retirement (~16 lines under `src/`: `hopperView.ts` ~10,
  `stackerView.ts` ~4, `keysView.ts` ~2; the fourth file in that edit set is a test);
- wave 6's two sheet views (~10 + ~10) and, if Zarathustrum takes it, the pacing item in `src/ui/main.ts` (~20).

**Total `src/` change for the phase: ~110 lines across nine existing files — ~90 across eight if Zarathustrum
declines the pacing item — and no file created.**
`architecture.md:855` says *"an Autocoder program, no new machinery"* and this is what that costs.

### 3.11 Totals

| | new files | new lines / cards | bytes |
|---|---|---|---|
| Test files (11) and the one shared fixture | 12 | ~2,440 lines | |
| Autocoder and RPG source (`demos/`) | 7 | ~1,392 cards | |
| Goldens | 4 (three survive to merge) | | ~28,938 as cut; ~24,638 at merge |
| Documents (`BUILD-LOG-6`, `PHASE-6-NOTES`, the walkthrough, the screenshot `README`) | 4 | ~850 lines | |
| Edits to existing files | 0 new | ~222 lines of migration and retirement across 18 files, plus wave 7's ~40 lines of new dated section in `docs/research/open-questions.md` — **~262 in all** — plus `docs/STATUS.md` and `docs/DECISIONS.md` at the merge | |

**Every row summed from its parts, not estimated in the round.** The edits row: §3.1's nine files
40 + 30 + 4 + 12 + 2 + 16 + 1 + 4 + 25 = **134**, §3.6's four 10 + 4 + 2 + 10 = **26**, §3.7's five
10 + 10 + 12 + 10 + 20 = **62**, which is **222**; wave 7 then grows
`docs/research/open-questions.md` — already one of the eighteen — by a further ~40 (§3.8), and that
growth is counted here rather than hidden, so the whole-phase figure is ~262. Test files: the fixture 430 +
reference 210 + tables 120 + scaling 110 + antilog 150 + integration 230 + target 200 + page-parse 280
+ punch-card 180 + no-control-break 140 + storyboard 320 + open-constants 70 = **2,440**; the optional
`test/period-pacing.test.ts` adds ~60 and a twelfth test file. Source cards: probe 160 + probe data 105
+ `reentry.asm` ~820 + case 1 + `reentry.cards` ~158 + summary data 92 + summary spec 54 = **~1,392**.
Goldens: dump ~4,300 + page ~14,600 + RPG summary 9,648 + console ~390 = **28,938**, of which the
dump's ~4,300 is deleted by wave 4 (§11.1). The eighteen edited files are §3.1's nine, §3.6's four and
§3.7's five.

Four of the ≈158 cards in the hopper are not the program's — the loader's bootstrap and body cards,
the execute card and the case card; the other **≈154** are, at the measured 52.13 payload positions
per condensed card (`demos/sales-summary.asm`: 2,033 payload positions in 39 records, re-measured
this session). Both figures are §6.13's **estimate** off an unwritten program; waves 3 and 5 record
the assembled count, and §13 criterion 18 asserts that count rather than this one.

---

## 4. The physics and the reference

The showcase computes a ballistic reentry trajectory and prints it. This section fixes **what** is
computed, **from which constants**, and **against what it is checked**; §5 fixes how a fixed-point
decimal machine executes it. Every closed form below is read from NACA Report 1381 through
`docs/research/avco-and-reentry.md` §4 and §8 and is `[verified]` there; every derived constant was
recomputed this session and is cited from the one place that holds it — this section — never
restated from memory elsewhere in the plan.

### 4.1 The model, and the one it is not

**Allen-Eggers drag-only, two states, constant flight-path angle, exponential atmosphere,
integrated in time by RK4.**

```
state      V (ft/s)          speed along the path
           h (ft)            altitude

dV/dt  =  - rho V^2 / (2 beta_B)          rho = rho0 e^(-beta h)      [verified] NACA 1381 eq.7
dh/dt  =    V sin gamma_E                 gamma_E constant, -30.00 deg

initial state at the band top -- THE INITIAL VELOCITY IS NOT V_E:

   t = 0
   h = h0    = 150,000 ft                     the band top, case-card cols 69-75
   V = V0    = V_E exp(-K X0)  =  22,939.54 ft/s
               X0 = e^(-beta h0) = 1.0937077e-3,  K X0 = 2.632134e-3
```

**The band top is a state, not an altitude, and this is the single easiest thing in the phase to get
wrong.** The case card carries `V-E` = 23,000 ft/s at h_E = 400,000 ft; the table starts 250,000 ft
lower, and the vehicle has already lost 60.46 ft/s to the thin air above the band. So the run does
**not** start at 23,000: it starts on **eq.13's own curve continued down from h_E**, at
`V0 = V_E exp(−K X0) = 22,939.54 ft/s`, which is one antilog call the deck already has (§6.3's init
block, and `ANTLOG` is called on `−K log₁₀e · X₀` exactly as it is on every later row). Starting at
23,000 instead is not a small error and it is not a rounding: it puts the whole trajectory 60.46 ft/s
off eq.13 — **121× the published 0.50 ft/s DIFF bound of §4.5** — makes the last row land at
h = 135.5 ft rather than 198.8, and moves the printed peak from 68.7 g to 69.1. §4.3's `Ei` and `erf`
forms assume the same start (they substitute `1/V = e^(K X')/V_E`), so a deck that started at V_E
would disagree with all three reference layers at once. §5.2 gives `V0` its scaling row and §6.3 its
init step; §7.3 says on the page why row 1 prints 22,939 under a heading that says 23,000.

Four properties make this the right two states and no more:

1. **It is the era's model.** Allen and Eggers set up exactly this problem — point mass, constant
   `C_D`, exponential atmosphere, gravity neglected against drag through the pulse, non-rotating
   flat Earth, straight-line path at the entry angle (`avco-and-reentry.md` §4, `[verified]`, NACA
   1381 pp.5-6). The report that defined the field is the report the program implements.
2. **It has a closed-form solution, and that solution is not what the program computes.**
   `architecture.md:1031` names the Phase-6 oracle as *"a double-precision reference integration in
   TypeScript; the emulated fixed-point run must track it within the tolerance the scaling tables
   predict"*. A program that evaluates eq.13 cannot be checked by eq.13. So the machine integrates,
   and eq.13 is a **per-row independent check** — printed as column 4 with its difference in column
   5, so the run validates itself in the same ink (§7's column map).
3. **Two states is what a 10K 1411 can afford.** The planar four-state set (V, γ, h, s) needs sin γ
   and cos γ as tabulated functions and ~13 multiplies per derivative evaluation against this
   design's 9 (`avco-and-reentry.md` §5's own budget). §5.11's memory map has 268 positions of margin
   at the pessimistic density; two more states and two more tables do not fit.
4. **Gravity's absence is disclosed on the page, not hidden.** One printed line states that gravity
   is not modelled, and the constant `GAMMA` column prints `-30.00` on every row as the loudest
   available disclosure of the model's central assumption (RULINGS §B 9).

`// OPEN: GRAVITY_IS_NOT_IMPLEMENTED` — a ruling, not an uncertainty; §15 row 9 carries it with the
priced alternative below.
`// OPEN: RK4_IS_ASSERTED_ERA_PRACTICE` — `[unverified]`, §15 row 4. `avco-and-reentry.md` §5 and §10
say plainly that "period trajectory programs used fourth-order Runge-Kutta" has no Avco source. This
plan does not appeal to it. RK4 is chosen by **measurement**: at dt = 0.25 s its method error
against eq.13 is **6.463e-4 ft/s** (§4.5, re-run this session), three orders inside the fixed-point
error the DIFF column measures, and the panel's own comparison at dt = 0.5 gives Euler 587 / Heun
24.0 / midpoint 14.8 / RK4 0.011 ft/s worst |V − V_eq13| for the same 360 derivative evaluations RK2
needs at dt = 0.25. Fallback if the instruction budget is ever threatened: Heun at dt = 0.25, which
costs half the derivative evaluations and gives up four orders of method accuracy — enough to move
the printed VELOCITY column, so it is a fallback of last resort.

**Zarathustrum's decision 2, priced — the third band option the panel did not cost.** RULINGS §B 7 asks this
plan to price adding the constant term `−g₀ sin γ_E` to `dV/dt` and running from 400,000 ft.
Measured this session (the same integrator, gravity switched on):

| configuration | rows | worst \|V − V_AE\| | what happens to column 4 |
|---|---|---|---|
| **150,000 ft, no gravity (the default)** | **92** | **6.463e-4 ft/s** | eq.13 is an identity to the last printed digit; column 5 measures the **machine's** error |
| 150,000 ft, gravity on | 91 | **123.77 ft/s** (0.54 %) | eq.13 becomes a physics deviation; column 5 stops measuring the machine |
| 400,000 ft, gravity on | 176 | **420.4 ft/s** (1.83 %) | as above, and 26 informationless coast rows return |

The machine cost of gravity is trivial: one source constant `GSIN = 16.087000` (= −g₀ sin γ_E at
S = 6, and `g₀ = 32.174` is `[verified]`, `avco-and-reentry.md` §5) and **one add per derivative
evaluation** — 4 × 144 µs = 576 µs per printed row, 53.0 ms over the run, **0.33 %** of §5.10's
budget, plus 368 instructions. The cost that matters is not machine time: it is that the
`V A-E` / `DIFF` pair stops being an oracle. At 400,000 ft the DIFF column would print up to
420 ft/s of **physics** in a field designed to print 0.07 ft/s of **arithmetic**, and the phase's
strongest exit criterion (§13 criterion 13, the page parsed back to one unit in the last printed
digit) would have nothing independent to be parsed against. The orchestrator recommends the default.
If Zarathustrum takes gravity, §7's column 5 changes width and edit word, §4.5's 0.50 ft/s tolerance is
withdrawn, and this plan's §13 loses two criteria — that is one word from him and roughly one wave
of rework.

### 4.2 The constants, each with its tag

This section is the authoritative copy of every physics constant in the phase. Every value below was
reproduced this session; the derived block is what the deck forms once, at initialisation, from the
case card.

| symbol | value | tag | source |
|---|---|---|---|
| ρ₀ | 0.0034 slug/ft³ | `[verified]` | NACA 1381 eq.7 via `avco-and-reentry.md` §4 |
| β = 1/H | 1/22,000 ft⁻¹ | `[verified]` | ibid. |
| ρ_SL | 0.0023769 slug/ft³ | `[verified]` | `avco-and-reentry.md` §5 |
| g₀ | 32.174 ft/s² | `[verified]` | ibid. |
| ρ₀/ρ_SL | 1.43043460 | `[verified]` | `avco-and-reentry.md` §7 — **the normalisation trap**, named in the deck's comment block |
| C1 = log₁₀(ρ₀/ρ_SL) | 0.15546801 | `[verified]` | ibid. |
| C2 = β log₁₀e | 1.97406583e-5 /ft | `[verified]` | ibid. |
| DKR | q̇ = 17,600 √(ρ/ρ_SL)(V/26,000)^3.15/√R_N BTU/ft²-s | `[likely]` | `avco-and-reentry.md` §4, unit-checked against arXiv 1910.06397 eq.19 |
| DKR's own accuracy | **±10-20 %** | `[verified]` | `avco-and-reentry.md:160` — *"sets the precision target for everything downstream"*. Printed beside the two heating columns (RULINGS §E 29) |

`// OPEN: DKR_IN_PERIOD_UNITS` — `[likely]`, §15 row 5. The SI form is primary; the period-unit form
is an arithmetic conversion done in `avco-and-reentry.md` §4 (1.99876e8 W/m² × 8.811e-5 = 17,611
BTU/ft²-s at r_n = 1 ft; 7,924.8 m/s = 26,000 ft/s). Fallback: print the heating columns from the
SI form converted at print time — same numbers, one more multiply, and a less period-plausible
program.

**Case-card values** (RULINGS §B 11, **Zarathustrum's decision 5**): V_E 23,000 ft/s · γ_E −30.00° with
sin γ_E = −0.5 exactly · W/(C_D A) 1,000.0 lb/ft² ⇒ β_B 31.080997 slug/ft² · R_N 1.00 ft ·
h_E 400,000 ft · band top 150,000 ft · dt 0.25 s. Defensible, arbitrary within a factor of two, and
**generic**: `// OPEN: BALLISTIC_COEFFICIENT_IS_GENERIC`, `[unverified]` as a vehicle number.
`avco-and-reentry.md:154` is explicit — representative Mark-4/5/11 ballistic coefficients *"are not
documented in any source consulted here — do not invent them"*. The page says `GENERIC` beside the
number. There is no fallback because there is nothing to fall back to; §15 row 3 records it as a
permanent disclosure. §6.12 gives the card's eighty columns.

**Derived once, at initialisation, from the card** (all reproduced this session):

```
K              = rho0 / (2 beta beta_B |sin gamma_E|)   = 2.40661520
K log10 e                                               = 1.04517970
3.15 K log10 e                                          = 3.29231606
CQ  = log10 17600 - 1/2 log10 R_N + 1/2 C1
      + 3.15 log10(V_E / 26000)                         = 4.15552331
1/(2 beta_B)                                            = 0.01608700
rho0   / (2 beta_B)                                     = 5.4695800e-5
rho_SL / (2 beta_B)                                     = 3.8237190e-5
cot|gamma_E| / 6076.1     RANGE, ft -> n.mi.            = 2.8505963e-4

and the BAND-TOP STATE, which is not a constant but the run's initial V (4.1):

X0  = e^(-beta h0)   at h0 = 150,000 ft                 = 1.0937077e-3
K X0                                                    = 2.632134e-3
V0  = V_E exp(-K X0)                                    = 22,939.54 ft/s
```

**The deck's init block forms twelve constants and one state** (§6.3's list): the seven above other
than `ρ₀/(2β_B)`, plus
`dt/2`, `dt/6`, `C1`, `C2` and the band top — and then `V0`, by the one extra `ANTLOG` call §4.1
prices. `ρ₀/(2β_B)` is carried here rather than there because it
is an **identity**, not a constant the deck holds: `ρ₀/(2β_B) = K |sin γ_E| / H`, which is how §5.9
forms the drag chain from `K` without a second divide. The drag constant the deck actually holds is
`CDP = 10⁶ ρ_SL/(2β_B) = 38.237190` at S = 6 (§5.3, product 7).

Two of these have a check the plan should keep in sight. `CQ` is **exactly** log₁₀ of the DKR
prefactor A_q = 17,600 √(ρ₀/ρ_SL)(V_E/26,000)^3.15/√R_N = 14,306.1676 — the two were computed
independently this session and agree to all eight digits, which is what makes §4.3's `erf` form and
the program's log form the same physics.

*(Two fifth-significant-digit slips in the panel's own sheet are corrected above and named so a
reader comparing them is not confused: `ρ_SL/(2β_B)` is **3.8237190e-5**, not 3.82374e-5, and
`cot|γ_E|/6076.1` = √3/6076.1 = 2.85059628e-4 is **2.8505963e-4** to the eight digits rule 5 asks
for — not the panel's 2.85062e-4, and not the 2.8505955e-4 an earlier draft of this section
printed. Neither moves a printed digit — RANGE's last
digit is 2.3e-3 relative — but both are constants a wave punches and a test asserts.)*

### 4.3 The closed forms

Four of the five are read straight out of the report. Two more — elapsed time and heat load — are
quadratures of the same drag-only configuration that this plan closes in terms of `Ei` and `erf`;
both derivations are given here in full because they are the only physics in the phase that is not
already on a page of NACA 1381, and wave 1's reference file carries them in its header.

**From NACA 1381** (`avco-and-reentry.md` §4, §8, all `[verified]`), with `X = e^(−βh)`:

| eq. | form | value at the case |
|---|---|---|
| 7 | ρ = ρ₀ e^(−h/22,000) slug/ft³ | the atmosphere |
| 13 | V(h) = V_E exp(−K X) | column 4, every row |
| 15 | y₁ = (1/β) ln(2K) | **34,570.1 ft** — positive, so 16 and 17 apply |
| 16 | V₁ = V_E e^(−1/2) | **13,950.2 ft/s** |
| 17 | max (dV/dt)/g = β V_E² sin θ_E / (2 g e) | **68.7343 g** |

**eq.13, derived, because the program's `K` must be the report's.** With `dh/dt = V sin γ_E` and
`sin γ_E < 0`,

```
dV/dh  =  (dV/dt)/(dh/dt)  =  -rho0 e^(-beta h) V / (2 beta_B sin gamma_E)
dV/V   =  [ rho0 / (2 beta_B |sin gamma_E|) ] e^(-beta h) dh
ln V   =  -[ rho0 / (2 beta beta_B |sin gamma_E|) ] e^(-beta h)  + const
V      =  V_E exp(-K X),   K = rho0 / (2 beta beta_B |sin gamma_E|),  X = e^(-beta h)
```

which is eq.13 with `C_D A/m = 1/β_B` substituted — `K = 2.40661520` at the case, and the deck's
own `K` is formed by the program's single divide (§5.9) so a card error cannot silently give the
page a different constant from the one the reference used.

**Elapsed time — the `Ei` form.** The band top `h₀ = 150,000 ft` sets `t = 0`, and — this is the
step that makes both quadratures below closed forms at all — the run starts **on eq.13's curve**, at
`V₀ = V_E e^(−K X₀) = 22,939.54 ft/s` (§4.1), so `1/V = e^(K X')/V_E` holds at every altitude in the
band and can be substituted under the integral. A run started at `V_E` instead would break that
substitution and neither form below would be the physics of the trajectory being printed. With
`X₀ = e^(−βh₀)`:

```
t(h) = (1 / (|sin gamma_E| V_E))  INTEGRAL[h..h0]  e^(K X') dh'
       substitute X' = e^(-beta h'),  dh' = -dX'/(beta X')
     = (1 / (beta |sin gamma_E| V_E))  INTEGRAL[X0..X]  e^(K X') dX'/X'
       substitute w = K X',  dw/w = dX'/X'
     = [ Ei(K X) - Ei(K X0) ] / (beta |sin gamma_E| V_E)
```

with `β |sin γ_E| V_E = 0.52272727 s⁻¹`, `K X₀ = 2.632134e-3` and `K X = K` at sea level.
`Ei` is the exponential integral, evaluated in the reference by its series for x < 20 and its
asymptotic form above. **Measured worst |t − t(h)| over the 92 rows: 7.832e-7 s** (§4.5).
This costs the emulator nothing — it is a reference-side check that turns TIME from an
unchecked counter into a quantity with a closed form behind it.

**Heat load — the `erf` form.** Under the drag-only configuration the DKR integrand collapses.
With `A_q = 17,600 √(ρ₀/ρ_SL)(V_E/26,000)^3.15/√R_N` and `ρ/ρ_SL = (ρ₀/ρ_SL) X`:

```
q_dot(h) = A_q X^(1/2) e^(-3.15 K X)                    since V = V_E e^(-K X)

Q(h)  =  INTEGRAL q_dot dt  =  (1/(|sin g| V_E)) INTEGRAL[h..h0] q_dot(h') e^(K X') dh'
                                                              ^^^^^^^^^^ 1/V = e^(K X')/V_E
      the integrand is  A_q X'^(1/2) e^(-2.15 K X')          3.15 - 1 = 2.15
      substitute X' = e^(-beta h') as before:
      =  C_q  INTEGRAL[X0..X]  X'^(-1/2) e^(-2.15 K X') dX'      C_q = A_q/(beta |sin g| V_E)
      substitute u = sqrt(X'),  dX' = 2u du,  X'^(-1/2) = 1/u:
      =  C_q  *  2 INTEGRAL e^(-2.15 K u^2) du
      =  C_q  sqrt(pi / (2.15 K)) [ erf(sqrt(2.15 K X)) - erf(sqrt(2.15 K X0)) ]
```

`C_q = 27,368.321`, `2.15K = 5.174223`, `√(π/2.15K) = 0.779206`. **Measured, and the two numbers the
relative figure is between are named rather than left to be guessed at: the dt = 0.25 trapezoid the
program runs gives 19,489.06 BTU/ft² at the last row against this closed form's 19,489.70 —
relative |19,489.06 − 19,489.70| / 19,489.70 = 3.28e-5 — and the worst relative deviation
over all rows with Q > 1 is 3.287e-4** (§4.5). (An earlier draft printed a third figure, 19,489.16,
for the trapezoid and a relative 3.261e-5 that was between neither pair; both are withdrawn.
19,489.06 is also the value the punch carries at `QTOT`'s S = 2, §8.5.) That converts an asserted quadrature tolerance into a
bounded one, which is the graft RULINGS §E 19 takes from exact-solution-first.

Both derivations hold **only** in the drag-only configuration — `avco-and-reentry.md:372`'s caveat,
`[verified]` — which is a second, independent reason the default band answer is the one it is.

### 4.4 The four reference layers

RULINGS §E 19. Wave 1 builds all three software layers in `test/fixtures/reentry-reference.ts`
before a line of Autocoder exists, **with no `src/` import of any kind** (§3.2, §12.3).

| layer | what it is | role | where |
|---|---|---|---|
| **1** | the closed forms: eqs.7/13/15/16/17, `Ei` for elapsed time, `erf` for heat load | **the physics check** | `test/fixtures/reentry-reference.ts` |
| **2** | double-precision RK4 over the same two-state set, same trapezoid for Q | **the gate's counterpart** | ibid. |
| **3** | the fixed-point simulator at §5.2's scaling table and §5.6's antilog, quantising at each S | **a regression pin, never the gate** | ibid. |
| **4** | the emulated 1410 running `demos/reentry.asm` | **the artifact** | the machine |

**Layer 3 is demoted on purpose.** It and the deck are written from one scaling table by one team,
so their agreement proves a shared implementation and not correctness — and the cheapest way past a
red gate is to edit the simulator. Its value survives the demotion intact: it is what turns a
fixed-point scaling bug into a digit-for-digit comparison during the build, and wave 3's oracle is
exact per-step equality against it (§11). **The gate is layer 4 against layers 1-2**, and §11.2
states the tie-break — written before the build, not negotiated during it.

### 4.5 The published tolerances, and where each one comes from

RULINGS §E 19: these are published in `docs/BUILD-LOG-6.md` **before** any golden exists, by wave 1,
derived from the scaling table rather than fitted to a measurement. **Nothing called TOLERANCE
prints on the page**; the page prints the DIFF column and its maximum (§7.7). This table is the
authoritative copy; §11, §12 and §13 cite it.

**Layer 1 against layer 2** — the physics against the integration:

| check | published tolerance | measured | the derivation |
|---|---|---|---|
| eq.13 per row, worst \|V − V_AE\| | **1.0e-2 ft/s** | 6.463e-4 | RK4 truncation goes as (dt)⁴; one order under VELOCITY's last printed digit, 15× the measurement |
| `Ei` elapsed time, worst \|t − t(h)\| | **1.0e-4 s** | 7.832e-7 | one hundredth of TIME's last printed digit (0.01 s) |
| `erf` heat load, worst relative | **1.0e-3** | 3.287e-4 (Q > 1); **3.28e-5** at the last row — 19,489.06 trapezoid against 19,489.70 closed | the trapezoid's own method error at dt = 0.25 |
| eq.7 atmosphere, `ANTA` vs `Math.pow` at 100 entries and 200 interpolated points | **1.0e-5 relative** | 2.034e-6 (the truncation bound, §5.6) | 5× the bound |
| eq.17 peak g | **0.5 %** | 68.7343 closed vs 68.7 printed, Δ 0.05 % | dV/dt is flat at its maximum |
| eq.15 y₁ | **one integration step** = V sin γ dt = **1,778 ft** at that row | 34,570 closed vs 35,436 printed peak, Δ 866 ft | a grid property, not an error bound: the peak is located to the nearest printed row |
| eq.16 V₁ | **one integration step** = a_D dt = **553 ft/s** | 13,950 closed vs 14,222 printed, Δ 272 ft/s | ibid. |

The last two rows matter more than their size suggests. eq.15 and eq.16 locate the peak; the run
prints rows at 0.25 s intervals, so the printed peak row is displaced from the true peak by up to
half a step in each direction. Stating the tolerance as **one integration step** makes that a
property of the design instead of a fudge, and it is the number that has to change if dt changes.

**Layer 4 against layer 2 — the gate.** Every computed column, every row, **within one unit in the
last printed digit** (RULINGS §E 20). Measured with layer 3 standing in for layer 4, re-run this
session against the **primary** ANTA-only antilog of §5.6:

| column | worst deviation, in printed units |
|---|---|
| TIME | 0 |
| ALTITUDE | **1** |
| VELOCITY | **1** |
| V A-E | **1** |
| DECEL | 0 |
| DYN PRESS | **1** |
| LOG10 RHO-R | 0 |
| HEAT RATE | **1** (0.1) |
| HEAT LOAD | **1** |
| RANGE | 0 |

**This column is a ROUNDING-ERA measurement and wave 3 re-takes it; the published one-unit rule
beside it does not move.** The deviations above were measured before §5.1 rule 3 settled that the
print path does not half-adjust (§7.2, §7.6). Under truncation the deviation is **one-sided**: eight
of the twelve printed columns drop their low digits rather than rounding them, so the printed cell is
at or below layer 2's value and never above it, and the one-unit budget is spent in one direction
instead of half a unit in each. That does not widen the tolerance — the rule is still one unit in the
last printed digit, published in wave 1 and unwidenable under §4.5's own rule below — but it does
mean a column that measured 0 here may measure 1 once truncation is applied, which is a re-measurement
and not a deviation. **Wave 3 republishes this column against the truncated simulator before wave 4
cuts the page golden**, alongside the memory map (§11.4), and any column that moves is recorded in
`docs/BUILD-LOG-6.md` with the row it moved on.

**DIFF is exempt from the one-ulp rule**, because DIFF *is* the fixed-point error and layer 2 does
not have one (layer 2's own DIFF is 6e-4 where layer 3's reaches 0.07). Its two checks are:

1. an **on-page identity** — the printed DIFF equals the printed VELOCITY minus the printed V A-E,
   to the rounding of the printed fields, on every row;
2. the **published tolerance**, `max |DIFF| ≤ 0.50 ft/s`, derived as:

```
V is carried at S = 2, so each step's combination move half-adjusts once:  <= 0.005 ft/s
92 steps, worst case, no cancellation:                           92 x 0.005 = 0.460 ft/s
antilog chain at 2.034e-6 relative over a total speed change of 20,821 ft/s:  0.042 ft/s
                                                                             ---------
worst-case bound                                                              0.502 ft/s
published                                                                     0.50   ft/s
```

The measured worst is **0.07 ft/s** at t = 14.00 s (re-run this session) — seven times
inside a bound written down from S and the step count before the simulator was run against it.

**The rule, verbatim, and it is not negotiable inside the build:** *a tolerance published in
`docs/BUILD-LOG-6.md` before the golden may not be widened, and the reference may not be edited to
match the program, without Zarathustrum's authorisation; any such change is its own commit with its own
reason.* §11.4 carries the same rule as a freeze, and §14 R3 is the risk it closes.

### 4.6 The checkpoints and the two guards

Four checkpoints, both guards, and the invariance regression — asserted against the **emulated**
run in wave 3 (§11), not only against the reference.

| # | check | how it is asserted | value |
|---|---|---|---|
| 1 | **eq.13 per row** | column 4 against layer 1 at every one of the 92 rows | worst 6.463e-4 ft/s (layer 2); 0.07 ft/s (layer 3) |
| 2 | **eq.15 y₁** | the printed peak-deceleration altitude within one integration step of 34,570 ft | 35,436 ft, Δ 866 ft ≤ 1,778 ft |
| 3 | **eq.16 V₁** | the printed peak row's velocity within one integration step of 13,950 ft/s | 14,222 ft/s, Δ 272 ft/s ≤ 553 ft/s |
| 4 | **eq.17 peak g** | the printed MAXIMUM DECELERATION within 0.5 % of 68.7343 g | 68.7, Δ 0.05 % |

**Guard A — `y₁ > 0`, a run-time check and a test checkpoint.** `avco-and-reentry.md:152` and `:368`
are explicit and `[verified]`: eqs.16-17 apply **only** when y₁ from eq.15 is positive. With β_B on
a user-supplied case card this is the one input that can silently invalidate two of the four
checkpoints. y₁ = (1/β) ln(2K) ≤ 0 exactly when **2K ≤ 1**, so the deck's guard is a compare on the
constant it has just formed — general in γ_E and β_B, not a threshold on one input:

```
          C    ONE,KTWO             KTWO = 2K, formed at init from the card
          BL   NOEQ                 2K low -> y1 <= 0 -> refuse eqs.16-17
```

On the guard path the deck prints the trajectory as usual and, in place of the summary's
`NACA 1381 EQ 17/15/16` line, prints one line saying the closed-form checkpoints do not apply
because y₁ is not positive. **The test case is W/(C_D A) = 5,000 lb/ft²**, where K = 0.4813 and the
closed form gives y₁ = **−838 ft** (measured this session); the threshold on the case card as
punched is β_B ≥ 149.60 slug/ft², i.e. W/(C_D A) ≥ **4,813 lb/ft²**.

**Guard B — `h ≤ 0`.** The 93rd step from 150,000 ft at dt = 0.25 lands at **h = −62.2 ft**,
and `ALTITUDE` is an unsigned six-digit field with a comma edit word, so without the
guard the last row prints a negative altitude through an unsigned edit — the defect the panel found
in paper-first's own step 91. The loop tests the **candidate** h before committing the step and
before printing (§6.9's spelling, `BZN DONEH,H,B`), so the last printed row is t = 22.75 s,
h = **198.8 ft** (198.774 in layer 2, printing `198` in the ALTITUDE column at S = 0 — the column
truncates, §7.2 — and `198.8` on the punched card at S = 1), 92 rows. This is loop control, not error handling: the run ends because the
vehicle arrived.

**The eq.17 invariance regression** (measured this session). eq.17 is independent of mass, size
and C_D, so re-running with W/(C_D A) doubled to 2,000 lb/ft² (β_B 62.162, K 1.2033, y₁ 19,321 ft,
66 rows) must leave the printed peak-g figure where it is. It does: **68.73 g against 68.68 g, both
printing `68.7` at S = 1**, and eq.17 itself is 68.7343 g at both. Tolerance 0.5 %. This is free and
it catches a scaling error in the drag chain that nothing else on the page sees.

### 4.7 The mutation pass

RULINGS §E 20, and the panel's finding that no proposal proved its oracle had teeth: a column test
that parses the wrong print positions and compares empty strings passes forever. Wave 4 runs **five**
mutations and asserts the column and tolerance tests go **red** on each:

| # | what is perturbed | perturbation | what must fail |
|---|---|---|---|
| M1 | `C2` = 1.97406583e-5 | last digit, → 1.97406584e-5 | ALTITUDE / VELOCITY column parse at 1 ulp |
| M2 | `C1` = 0.15546801 | → 0.15546800 | LOG10 RHO-R at 1 ulp, DYN PRESS at 1 ulp |
| M3 | `CQ` = 4.15552331 | → 4.15552340 | HEAT RATE and HEAT LOAD at 1 ulp |
| M4 | `ANTA[50]` | last digit | the eq.7 atmosphere check at 1.0e-5 relative |
| M5 | **the parse itself** | one column's start position shifted by one | the same column's 1-ulp assertion |

**M5 is the one the panel's finding actually asks for and the one M1-M4 cannot supply**: if the
parser returns empty strings, perturbing a reference constant only changes what the vacuous
comparison is against and the test stays green. §11.3 states M5 with its reasoning and adds the two
parse preconditions that go with it; §13 criterion 14 is the assertion. It costs a dozen lines and it
is the only thing in the phase that checks the checkers.

---

## 5. The arithmetic on the 1410

**There is no published IBM 1410 fixed-point scaling standard.** `avco-and-reentry.md:213` is
`[verified by absence]`: IBM never issued a 1410 numeric-conventions manual, and A22-0526-3
deliberately has no fixed decimal point because the machine is variable-field-length and the
programmer owns the point. **The table below is this project's own design**, and it says so in
`demos/reentry.asm`'s comment block and in the walkthrough (RULINGS §E 29).
`// OPEN: THE_SCALING_TABLE_IS_OURS` — `[verified by absence]`, §15 row 6.

The one surviving model is `pi.job` (`avco-and-reentry.md` §6, every cited line confirmed in the
source), whose own comments state the convention this section follows: *"FIGURE WHERE THE DECIMAL
POINT WILL BE / SAME RELATIVE PLACE IN EACH AREA"*, and whose idioms — `ZA` to force a sign,
`MLZS` to stamp one, `MLC BASET-7,BASET` to shift, `MLC LC0L9,BASE6` to blank the residue — are the
idioms below.

### 5.1 The five rules the whole program obeys

1. **S is the number of implied fractional digits, constant for the life of the run**, recorded in
   the `DCW` or `DS` comment (`pi.job`, `[verified]`).
2. **A product's scale is S_a + S_b.** The rescale to the target scale is **one `MLC` from a fixed
   offset** — the machine has no shift instruction (`avco-and-reentry.md` §6, `[verified]`: "shift"
   occurs in A22-0526-3 only inside the multiply/divide narrative and the console keyboard
   description) — and because every S is a constant, **the offset is an assembly-time constant**.
   Then blank the residue with an `MLC` of a zeros literal.
3. **Half-adjust before every truncating move**: `A +5,WORK-n+1` — **inside the arithmetic, and
   nowhere else.** It does **not** govern the print path: the `FIELD-n` sub-field an `MCE` is handed
   (§7.2) is the one truncating move in the deck that cannot take an `A +5` on its source field,
   because `V` and `H` are the integration state. The seven columns fed a `FIELD-n` therefore
   **truncate to their last printed digit** — and so does the eighth, column 9, whose four-digit
   print copy `PL10` is itself cut out of `L10R` by an `MLC`, and an `MLC` half-adjusts nothing
   (§7.2 mechanism 3). **Eight of the twelve printed columns truncate**, and every printed figure in
   §7.6 and §7.7 is the truncated one.
4. **Sign is the zone bits of the units position** — B = minus, B+A = machine-developed plus. The
   minus test is **`BZN target,FIELD,B`** (§2.3, §6.6; A22-0526-3 p.16 Fig.11 via
   `avco-and-reentry.md` §6, `[verified]`). `MLZS` stamps a sign in one position.
5. **A constant carries eight significant digits at whatever S that takes.** This is the rule the
   panel's proposals broke and it is the one that decides whether the printed columns can be
   believed: `1/g₀ = 0.031080997` written at S = 1 is `0.0`, and `ρ_SL/(2β_B) = 3.8237190e-5`
   written at S = 7 is `0.0000382` — three significant digits, 1.3e-3 relative, which is ninety
   times outside `DYN PRESS`'s last printed digit. So each constant's S is chosen to fill its eight
   positions, and §5.3's offsets follow from rule 2.
   `// OPEN: CONSTANTS_CARRY_EIGHT_SIGNIFICANT_DIGITS_AT_WHATEVER_S_THAT_TAKES` — a ruling; §15
   row 24. Fallback if a constant needs more than eight: a nine-position field and the offsets
   recomputed, which costs one position each and nothing else. The two fields that already need nine
   are `ARGB` and its bias constant `KBIAS`, below.

**A free corollary that this design uses twice.** Two fields with the same digits and different
implied points are the same eight core positions read two ways, so a rescale by a power of ten
between *named* quantities can cost **zero instructions**:

- `VK EQU V` — the speed in **thousands of ft/s** at S = 5 is the speed in ft/s at S = 2. `02293954`
  is 22,939.54 ft/s and 22.93954 kft/s. §5.3 works in `VK` so that `V²` stays inside the product
  field's range without a single extra move.
- `β_B = 31.080997` at S = 6 and `1/g₀ = 0.031080997` at S = 9 are the **same eight digits**
  `31080997`, because W/(C_D A) is 1,000.0 exactly on this card. One `DCW`, two `EQU`s, two implied
  points — and the deck's comment block says so, because a reader who does not see it will think it
  is a typo. (If Zarathustrum changes W/(C_D A) — decision 5 — the coincidence goes and the deck carries two
  constants. Nothing else moves.)

### 5.2 The scaling table — every variable

This is the authoritative copy; §6, §7 and §8 cite it. Wave 1 asserts this table **as data**
(`test/reentry-scaling.test.ts`): every row's digit count is ≥ the range it claims, every rescale
offset equals S_a + S_b − S_target, and `PROD` is 17.

| symbol | meaning | digits | S | range carried |
|---|---|---|---|---|
| `T` | elapsed time, s | 5 | 2 | 0 – 999.99 |
| `DT` | step, s | 4 | 4 | 0.0001 – 0.9999 |
| `H` | altitude, ft | 8 | 1 | 0 – 9,999,999.9 |
| `V` | speed, ft/s | 8 | 2 | 0 – 999,999.99 |
| `VK` **= `V`, an alias** | speed, kft/s | 8 | 5 | 0 – 999.99999 |
| `V0` | the band-top velocity `V_E e^(−K X₀)`, formed at init and moved into `V` — **the run's initial speed, and it is not `V_E`** (§4.1, §6.3) | 8 | 2 | **22,939.54** at this case; 0 – 999,999.99 |
| `VS`, `HS` | RK4 stage arguments | 8 | 2 / 1 | as `V`, `H` |
| `K1V`…`K4V` | dV/dt stages, ft/s² | 8 | 2 | ±999,999.99 |
| `K1H`…`K4H` | dh/dt stages, ft/s | 8 | 1 | ±9,999,999.9 |
| `ARG` | the antilog argument, log₁₀, signed | 8 | 7 | −9.9999999 … +5.9999999 |
| `KBIAS` | the bias constant, **+10.0000000** | **9** | 7 | constant |
| `ARGB` | **biased** antilog argument, `ARG + KBIAS` | **9** | 7 | 0.0000000 – 99.9999999 |
| `F` | its fraction | 7 | 7 | 0.0000000 – 0.9999999 |
| `F1` | ×100 of `F` — **the index into `ANTA`** | 2 | 0 | 00 – 99 |
| `ARGF1` | the index-register image `0`·`0`·`F1`·`0` = 10·`F1`, moved into X1 by `MLCWA` (§6.4) | **5** | — | 00000 – 00990 |
| `R` | residual, F − F1/100 | 5 | 7 | 0.0000000 – 0.0099999 |
| `DEC` | the decade, biased by 10 | 2 | 0 | 00 – 99 |
| `MANT` | antilog mantissa | 8 | 7 | 1.0000000 – 9.9999999 |
| `XM`, `XD` | `X = e^(−βh)` as mantissa and decade | 8 / 2 | 7 / 0 | [1,10) / −3…0 biased |
| `RHOM`, `RHOD` | ρ/ρ_SL as mantissa and decade | 8 / 2 | 7 / 0 | [1,10) / −3…0 biased |
| `AD` | drag deceleration, ft/s² | 8 | 4 | 0 – 9,999.9999 |
| `DG` | DECEL, g | 8 | 1 | 0 – 9,999,999.9 |
| `QB` | DYN PRESS, lb/ft² | 8 | 1 | 0 – 9,999,999.9 |
| `L10R` | log₁₀(ρ/ρ_SL) | 8 | 6 | ±99.999999 |
| `PL10` | the **print** copy of `L10R`, §7.2 column 9 | **4** | 3 | ±9.999 |
| `VAE` | eq.13 velocity, ft/s | 8 | 2 | 0 – 999,999.99 |
| `DIF` | V − V_AE, ft/s | 8 | 2 | ±999,999.99 |
| `QD`, `QDP` | HEAT RATE and its previous value | 8 | 2 | 0 – 999,999.99 |
| `QTOT` | HEAT LOAD | 8 | 2 | 0 – 999,999.99 |
| `RNG` | RANGE, n.mi. | 8 | 2 | 0 – 999,999.99 |
| `W1`, `W2`, `W3` | rescale intermediates | 8 | per use | §5.3 |
| `PROD`, `PROD2`, `PROD3` | multiply B-fields | **17** | — | multiplicand 8 + multiplier 8 + 1 |

**ρ/ρ_SL is a mantissa AND a decade, and the decade has a field.** ρ/ρ_SL runs from 10^−2.806 to
10^+0.152 over this trajectory — **2.96 decades**. RULINGS §E 22 requires an explicit decade
companion for any internal field spanning more than three decades; this one is just inside three and
the companion is carried anyway, because a mantissa with the decade "applied by indexed move" and
nowhere to live is exactly the defect the panel named against paper-first. `RHOM` and `RHOD` are
separate fields, and **the decade is applied to the finished product by one indexed `MLC`, never to
the mantissa** (§5.3, the `AD` chain). The printed form is `LOG10 RHO-R` at S = 3 — the antilog's own
argument, free, exact (`C1 − C2 h`, no antilog in its path), and four digits of dynamic range where
ρ itself would need a mantissa column and an exponent column.

**`ARGB` is nine positions and that is not a typo.** The antilog argument is biased by +10 so the
decade slice is a plain field slice rather than a signed test. The three arguments this program
antilogs are `−C2 h` ∈ **[−2.9611, 0]**, `−K log₁₀e · X` ∈ [−1.045, −0.001] and `log₁₀ q̇` ∈ [0.892,
3.348]; biased, they run **7.039 … 13.348**, which needs **two integer digits**. (The bracket on the
first is `C2·h` at the band top, 1.97406583e-5 × 150,000 = **2.9611** — §5.3 row 1's own peak — and
**not** the −2.806 of `C1 − C2 h`, which is the printed `LOG10 RHO-R` column of §7.2 and is a
different quantity: the argument the antilog is handed is the one that sizes the field.) Eight positions at S = 7
top out at 9.9999999 — the field could not hold its own bias constant, let alone the biased argument
— so `KBIAS` and `ARGB` are both nine, `ARGB` holds 0 … 99.9999999, and the slice is
`MLN ARGB-7,DEC` for the two-digit biased decade and `MLN ARGB,F` for the seven-digit fraction: a
field slice, not arithmetic, exactly `avco-and-reentry.md` §6's last row. (`MLN` is in
`ALL_MNEMONICS`, checked this session.)

### 5.3 Every product in the program, with its rescale offset

Rule 2 gives `offset = S_a + S_b − S_target`. The peak-magnitude column is what proves each product
fits the 17-position field, and the digit count in it is not an opinion — it is
`floor(log₁₀(peak · 10^(S_a+S_b))) + 1`, which is the rule `test/reentry-scaling.test.ts` computes
row by row. **Fifty-eight multiplies per printed row** (§5.10); these are the
**nineteen** distinct ones.

| # | product | S_a | S_b | S_target | **offset** | peak value, digits in `PROD` |
|---|---|---|---|---|---|---|
| 1 | `KC2 × H` → the antilog argument | 12 | 1 | 7 | **6** | 2.9611 → 14 |
| 2 | `CL2 × R` (Horner, 8×5) | 7 | 7 | 7 | **7** | 0.0265 → 13 |
| 3 | `(CL1 + ·) × R` (Horner, 8×5) | 7 | 7 | 7 | **7** | 0.0233 → 13 |
| 4 | `ANTA[F1] × CORR` → `MANT` (`CORR` is `W3`) | 7 | 7 | 7 | **7** | 10.0001 → 16 |
| 5 | `RR0 × XM` → `RHOM` | 7 | 7 | 7 | **7** | 14.304 → 16 |
| 6 | `VK × VK` → `W1` | 5 | 5 | 5 | **5** | 526.20 → 13 |
| 7 | `W1 × CDP` → `W2` | 5 | 6 | 3 | **8** | 20,122 → 16 |
| 8 | `W2 × RHOM` → `AD` | 3 | 7 | 4 | **6 − RHOD**, indexed | 201,220 pre-decade → 16 |
| 9 | `V × SING` → `dh/dt` (8×1) | 2 | 1 | 1 | **2** | 11,470 → 8 |
| 10 | `KKL × XM` → eq.13's argument | 7 | 7 | 7 | **7**, then the decade | 1.0452 → 15 |
| 11 | `VE × MANT` → `VAE`, and `V0` at init | 2 | 7 | 2 | **7** | 22,939.54 → 14 |
| 12 | `KHC2 × H` → ½C2·h | 13 | 1 | 7 | **7** | 1.4805 → 15 |
| 13 | `K315 × XM` → 3.15K·X | 7 | 7 | 7 | **7**, then the decade | 3.2923 → 15 |
| 14 | `AD × CG` → `DG` (DECEL) | 4 | 9 | 1 | **12** | 68.7 → 15 |
| 15 | `AD × BB` → `QB` (DYN PRESS) | 4 | 6 | 1 | **9** | 68,681 → 15 |
| 16 | `(QD + QDP) × DT2` → the trapezoid | 2 | 4 | 2 | **4** | 556.85 → 9 |
| 17 | `(H0 − H) × CRNG` → `RNG` | 1 | 11 | 2 | **10** | 42.76 → 14 |
| 18 | `DT2 × k` → a stage argument (×6) | 4 | 2 or 1 | 2 or 1 | **4** | as `V`, `H` |
| 19 | `DT6 × (k1+2k2+2k3+k4)` → the combination (×2) | 9 | 2 or 1 | 2 or 1 | **9** | as `V`, `H` |

*(Four of the rescale offsets the panel's sheet published are corrected here, and the correction is
the same in every case: they were written as if every constant sat at S = 7, which starves a small
constant of significant digits — rule 5. `DG`'s is **12**, not 4; the drag chain's is **5 / 8 /
(6 − RHOD)**, not a single 5 against a three-significant-digit `AD` constant; `RNG`'s is **10**, not 5.
`RHOM` 14→7 offset 7, `VAE` 9→2 offset 7 and `QTOT` 6→2 offset 4 were right.)*

*(Two further corrections, both to this table's own arithmetic rather than to the panel's.
**`CRNG` sits at S = 11, not S = 10** (row 17): `cot|γ_E|/6076.1 = 2.85059628e-4` fills eight
positions only as `28505963` at S = 11 — at S = 10 it is `02850596`, **seven** significant digits,
which is the one place in this table rule 5 was broken. The offset follows, 1 + 11 − 2 = **10**.
And **five of the "digits in `PROD`" figures were wrong** and are corrected above against the rule
stated with the table: row 9 is **8** (not 12), row 10 **15** (not 14), row 11 **14** (not 15),
row 12 **15** (not 14) and row 14 **15** (not 14). None of the five threatens the 17-position field —
the widest product in the program is row 4's 16 — but §5.2's wave-1 test asserts this table **as
data**, so a wrong figure here is a test that fails on its first run against its own rule.)*

**Two of these are the design's own arithmetic and deserve a sentence each.**

*The drag chain (6, 7, 8) and where the decade goes.* `a_D = ρ V²/(2β_B) = RHOM · 10^RHOD · VK² ·
CDP` with `CDP = 10⁶ ρ_SL/(2β_B) = 38.237190` at S = 6 — eight significant digits, and the 10⁶ is
free because `VK` is `V` in thousands. The product after step 8 stands in `PROD` at S = 10 with
magnitude up to 201,220; the decade is applied by choosing **which** position of `PROD` the `MLC`
reads from, `MLC PROD-n+X1,AD` with `n = 6 − RHOD`, `RHOD ∈ {−3…0}` so `n ∈ {6,7,8,9}` and X1 holds
`−RHOD`. **The decade IS the rescale offset**, and it costs one indexed address — 34.5 µs — not a
multiply. That is `avco-and-reentry.md` §6's "indexed MLC" idea used for the thing it is best at.

*`DYN PRESS` off `DECEL` (14, 15).* `q̄ = ρV²/2 = a_D · β_B` and `DECEL = a_D/g₀`, so both printed
columns are **one multiply each off `AD`**, with no second antilog and no second decade. This is
where the `β_B` / `1/g₀` shared digit string of §5.1 shows up in the object code: the same `DCW`,
addressed twice.

### 5.4 `PROD` is 17, and the multiply idiom is the one already in the tree

A22-0526-3 pp.18-19, `[verified]` via `avco-and-reentry.md:241`: the product develops in the
B-field, which must hold **multiplicand digits + multiplier digits + 1** positions; the multiplier
image goes in the high-order positions of the product field before the `M` and is destroyed by it.
For 8 × 8 that is **17** — one position more than the panel's exact-solution-first budgeted, in the
field the antilog's product lands in.

The idiom is not invented here. `demos/sales-summary.asm:154-156` and `:158`, shipped and byte-gated, are (card `02580`, `A AMT,DTOT`, sits between them and is not part of the multiply idiom):

```
02550DTLCAL    ZA   AMT,COMM-6         MULTIPLIER IMAGE, HIGH
02560          M    K002,COMM          AUTOCODER M IS MACHINE @
02570          A    FIVE,COMM-1        HALF ADJUST AT POSN 02
02590          A    COMM-2,DCOM        POSITION ADJUST 02
```

`COMM` is 14 = 8 (`AMT`, the multiplier) + 5 (`K002`, the multiplicand) + 1, and the image is loaded
ending 6 positions left of the units — multiplicand digits + 1. Phase 6's 8 × 8 form is the same
four statements against a 17-position field:

```
          ZA   VK,PROD-9          MULTIPLIER IMAGE, HIGH -- 8 PLUS 8 PLUS 1
          M    VK,PROD            V SQUARED, S EQUALS 10 IN KFT PER SEC
          A    +5,PROD-5          HALF ADJUST ONE RIGHT OF THE TARGET UNITS
          MLC  PROD-5,W1          RESCALE, OFFSET 5, AN ASSEMBLY-TIME CONSTANT
```

**The scaled multiply is the unit the whole budget is built from: four instructions, 2,835 µs at
8 × 8 and 2,025 µs at 8 × 5** (§5.10). Nothing in this program multiplies any other way.

### 5.5 Word-mark discipline — every work field is a `DCW`, and `ANTA` is punched rather than built

**The rule, first, because it governs more of the deck than the table does: a field an arithmetic
statement writes into must arrive from the loader with its own word mark, so it is declared
`DCW @00…0@` and never `DS`.** `src/asm/emit.ts:565` is
`if (op === 'DS' || op === 'EQU') return [];` under a comment quoting `software.md` §5 verbatim —
`[verified]` against C28-0326-2 p.30: *"No information is entered into the area, no word mark is
assigned by the processor, and the area is not cleared prior to reservation… This is the sharpest
warm-start hazard in the whole assembler"* (`docs/research/software.md:112`). And length in this
machine's arithmetic is the **B-field word mark's**: `src/core/alu.ts:290-291` — *"Length, under
`positions: 'bWordMark'`, is governed by the B-field word mark — it 'ends the operation and defines
the length'"*. So `ZA CTOP,H`, `A KDT,T`, `MLC PROD-5,W1` and every `M …,PROD` in this deck would
run left past its own field, into whatever the loader last left there, if its target were a `DS`.

**The shipped precedent says the same thing by construction.** `demos/sales-summary.asm:17-32`
declares **every** work field as a `DCW` of zeros — `DTOT DCW @0000000000@`, `AMT DCW @00000000@`,
`COMM DCW @00000000000000@`, `CN1 DCW @000@` — and its two alphameric work fields as blank constants
with a mark, `DEPT DCW #3` and `PART DCW #8`. §6.4 already applies exactly this reasoning to
`ARGF1`; §5.11 and §6.11 apply it to the rest, and §5.11's object-deck arithmetic pays for it:
**+391 emitted positions**, 7,500 → 7,891, and 144 condensed object cards → **152**, plus the two
group-mark records → **154**.

The alternative is a `SW` pass in init over every work field — ~45 statements that §6.13's
70-instruction init and 486-instruction total do not carry, and that would have to run correctly
before any oracle exists. It is refused for the same reason the run-time-built table below is.

`CDIN` is the one reserved area that is neither: it is a `DA`, and a `DA` emits one marked blank per
**`hi,lo` field** (`src/asm/emit.ts:566-575`, `DA_EMITS_ONLY_ITS_MARKED_POSITIONS`) — but `CDIN`'s
twelve sub-entries are the **bare-`lo`** form (`C001 1`, `C003 3`, … — §6.11), and a bare-`lo`
subfield defines a label and emits **nothing** (`software.md:98`, *"No word mark emitted"*;
`src/asm/symbols.ts:427-428` pushes a field only when a `hi` was written). So `CDIN` emits zero
positions, and the card image is read into it whole by `R1 0,CDIN`. **What §5.11 does book are the
two group marks**: `PAGM` at 08580 and `PLGM` at 08732 are one-position constants at `ORG`'d
addresses, so each is its own object record — two records the 7,891-position arithmetic below does
not see, because they are counted as records and not as payload.

`PLINE` and `PAREA` **are** `DS` areas and stay so: nothing arithmetic writes into either, both are
cleared by `CS` before every use, and both are terminated by a group mark whose word mark `SW` sets
at run time (§6.7, §8.1).

RULINGS §E 22 permits a `DS`-reserved, run-time-built table **only** with the discipline written
out. This plan does not take that option either, and the reason is not cost:

- A `DS` area **emits nothing**: it arrives blank and, decisively, **unmarked**.
- The emitted deck contains **no Clear Storage card at all** — a two-object-card program produces
  exactly four cards (loader bootstrap, loader body, object, execute), measured by the panel — and
  C20-1602-8's clear is to **blanks**, not zeros (`software.md:260`).
- So every entry's field would have to be defined by a `SW` pass before an arithmetic result landed
  in it, in a loop, with **no oracle until the whole table is built** — 100 chances to be silently
  wrong in the one routine every printed column depends on.

`ANTA` is therefore `DCW` data in the object deck: **every entry arrives with its own word mark from
the loader**, and no arithmetic result ever lands in an undefined field. Measured this session, the
price is exactly **19 object cards** — 100 contiguous ten-character `DCW`s emit 1,000 payload
positions in 19 records — and it is the right price. (The same discipline is what makes the punch
area work: `PAREA` is a `DS` and its group mark must be marked at run time by `SW PAGM`; §8.1.)

### 5.6 The antilog — the one non-elementary operation

Both the atmosphere and the heating go through a single decimal antilog. That is
`avco-and-reentry.md` §7's central observation, `[verified]`: because the Allen-Eggers atmosphere is
*exactly* exponential, log₁₀ρ is exactly linear in altitude, so `e^(−βh)` and `√(ρ/ρ_SL)` are the
same primitive at coefficients differing by a factor of two — and on a decimal machine the
decade/fraction split of a base-10 antilog is a **field slice**.

**`ANTA` only: 100 entries at a ten-position stride, plus a quadratic residual.**

```
10^F  =  ANTA[F1] * (1 + r (c1 + c2 r))            Horner -- three multiplies

   F1 = digits 1-2 of F, A FIELD SLICE     ANTA[i] = 10^(i/100), 8 digits at S = 7
   r  = F - F1/100  <  0.01                c1 = ln 10        = 2.3025851
                                           c2 = (ln 10)^2/2  = 2.6509491
   truncation  (ln10 r)^3 / 6  <=  2.034e-6 RELATIVE
```

`c2` is **2.6509491**, not the 2.6509337 the panel's sheet printed: `(ln 10)²/2 = 2.6509490552`,
recomputed this session, and the simulator has always used the right one. The 2.034e-6 bound is
unaffected (worst relative residual error 1.9998e-6 with the correct constant, 2.0013e-6 with the
wrong one), but it is a value a wave punches into `demos/reentry.asm` and a test asserts.

Six decisions, each with its reason:

1. **The ten-position stride is the design's one deliberate memory purchase.** The entry offset is
   `10·F1`, and on a decimal machine ×10 is a move one position left — free. An eight-position
   stride needs a run-time multiply (2,369 µs) on **every** call, six times per printed row.
2. **Each entry is one ten-character `DCW` card**: `10^(i/100)` to **ten** significant digits, of
   which the fetch takes the **top eight** — the low two are guard digits the `MLC` discards, not
   `00` filler. 100 cards, **contiguous, with no interleaved `ORG`**. Measured this session: the
   contiguous form emits **1,000 payload positions in 19 object records**, and the strided form —
   eight-digit `DCW` plus `ORG *+2` — emits **800 positions in 100 object records**, because an
   `ORG` breaks the object record. One card per entry either way in the source; 81 more cards in the
   hopper the wrong way. The fetch is `MLC ANTA-2+X1,MANT` (§6.2).
3. **Quadratic, not linear.** `avco-and-reentry.md` §7's 100-entry linear form is 6.63e-4 absolute
   — 4-5 significant digits — and its 1,000-entry linear form is 8,000 positions, which does not fit
   (§5.11). The quadratic residual buys 2.034e-6 for two extra 8 × 5 multiplies and 1,000 positions.
4. **The error is relative by construction, and that is the whole point.** `ANTA[F1]` lies in
   [1,10), `CORR` in [1, 1.0233], and the decade is exact, so the 2.034e-6 bound holds **at every
   decade** — over the decades ρ traverses and the 2.46 decades q̇ traverses. No table on a
   uniform grid in the *value* can do that (§5.7).
5. **The bound is set by `DYN PRESS`, and there is a margin of 1.2.** The tightest relative bound on
   the page that passes through the antilog is DYN PRESS's last printed digit, 1 lb/ft² at 68,681 =
   **1.456e-5** (ALTITUDE's 6.7e-6 is tighter but has no antilog in its path). The budget is
   2.034e-6 from the antilog plus 2 × 4.9e-6 from V's own error entering through V² = **1.18e-5** —
   inside 1.456e-5 by a factor of 1.23. The simulator measures DYN PRESS deviating by exactly one
   printed unit, which is what a margin of 1.23 predicts.
6. **Op `T` is implemented and deliberately unused.** Recomputed this session from
   `src/core/cycles.ts`'s own exported formula: a 1,000-entry search averages
   `tTableLookup(12,3,3995,500)` = **24,786 µs**, a 100-entry search **2,511 µs**, against an
   indexed `MLC` at `tMoveScan(12,8,8) + INDEX_US` = **183 µs**. The grid is uniform and the argument
   digits *are* the index, so op `T`'s right-to-left linear scan buys nothing and costs 135×. The
   bracketing-direction rule is additionally `[unverified]` (Figure 26's OCR is mangled,
   `avco-and-reentry.md` §7). The reason is recorded in the deck's comment block, because "we never
   used the Table Lookup instruction in the table-lookup program" is a sentence a reader will
   otherwise take for an oversight.

`// OPEN: ANTILOG_IS_ANTA_100_BY_10_WITH_A_QUADRATIC_RESIDUAL` — `[likely]` as a sizing, §15 row 7.
**Fallback, named and measured:** add `ANTB`, 100 entries of `10^(i/10000)` at the same stride
(+1,000 positions), for the two-level form `ANTA[F1] · ANTB[F2] · (1 + ln10 · F3)` — truncation
**2.65e-8**, still three multiplies.

**The one printed digit the fallback was said to change is a digit it does not change, and the
measurement is withdrawn.** The panel's figure — *"no printed digit anywhere on the page except DYN
PRESS's maximum, 68,682 against the primary's 68,681"* — was taken under the rounding assumption
§5.1 rule 3 has since withdrawn, and under rounding the two forms straddled 68,681.5 so the
distinction was real. Under truncation it is not: layer 2's peak dynamic pressure is
q̄ = **68,681.65 lb/ft²**, `QB` holds it half-adjusted at S = 1 as `68681.7`, `QB-1` drops the low
digit and prints **68,681**, and the two-level form's own truncation bound of 2.65e-8 relative is
**0.0018 lb/ft²** here — three orders too small to move the S = 1 field, let alone the printed
integer. So the honest statement is that the fallback is **not measured to change any printed digit
on the page**, and the wave that lands the antilog (§11 wave 2) re-takes the sweep under truncation
and records the result in `docs/BUILD-LOG-6.md`. The smaller table stays the primary because it is
1,000 positions cheaper and inside every printed-digit bound (decision 5 above), not because of a
68,682.

**Every printed figure in this plan is the primary's**: §7.6's mock and §7.7's summary
were re-cut from the ANTA-only simulator this session, against a panel sheet that had published the
two-level form's rows.
**Refused fallback:** a five-position stride, which recovers 500 positions and gives 5e-5 relative —
3.4× outside DYN PRESS's bound. Recorded so a later reader does not re-derive it (§5.11, F3).

### 5.7 There is no `u^3.15` table, and this is a departure with its reason

RULINGS §E 21 names a 111-entry `u^3.15` table at a reduced stride as the memory fallback, and
`avco-and-reentry.md` §7 recommends the table as the primary. **This plan refuses it, and the reason
is a bound, not a preference.**

`u = V/26,000` runs from **0.0815 to 0.8823** over this trajectory, and `u^3.15` over that interval
runs from **3.7166e-4 to 0.674049** — **3.26 decades**. Linear interpolation on a uniform grid in
`u` has an error bounded in **absolute** terms, `|f''|h²/8`, so its *relative* error is worst where
the function is smallest:

| where | \|f''\| = 3.15·2.15·u^1.15 | absolute bound at du = 0.01 | u^3.15 there | relative |
|---|---|---|---|---|
| u = 1.1 (research §7's evaluation point) | 7.5570 | **9.45e-5** | 1.35 | 7.0e-5 |
| u = 0.09 (the bottom of **this** trajectory) | 0.42474 | 5.31e-6 | **5.08e-4** | **1.05e-2** |

Exhaustive sampling of every subinterval this session gives a worst **relative** interpolation error
of **1.180e-2 at u = 0.0846**, and the simulator's measurement of the whole table, quantisation
included, is **1.09e-2** — the same number from the other direction. The 1.180e-2 is the decisive
one, because it is independent of how many digits are stored: research §7's own 9.45e-5 reproduces
exactly, at u = 1.1, where the function is O(1), which is why the table looked acceptable.
A22-0526-3 p.29's own guidance ("if the desired factor is five positions or less, it is often
practical to store the factor itself") makes it worse, not better: five decimal places at a function
value of 3.7e-4 is a half-ulp of 1.35e-2 relative. **No number of stored digits fixes this**,
because the interpolation bound is absolute and the function spans 3.26 decades. 1.2e-2 breaks
`HEAT RATE`'s printed-digit bound (4.5e-5) by 260× and `HEAT LOAD`'s (5.1e-5) by 230×.

`avco-and-reentry.md` §7 concludes that these errors are "far inside DKR's own ±10-20 % correlation
error", and that is true and beside the point. The correlation's uncertainty is a statement about
the **physics**, disclosed in ink beside the two heating columns (RULINGS §E 29). The printed-digit
rule is a statement about the **arithmetic**: a column that prints five significant figures must be
a faithful evaluation of the stated formula to five significant figures, whatever the formula's own
standing. Conflating the two is how a program comes to print digits it did not compute.

**The replacement is IBM's own documented rule**, `A**B` is computed from `EXP(B*ALOG(A))` —
C28-0328-3 p.10, `[verified]`, and `avco-and-reentry.md` §7 names it as the period-authentic route
for V^3.15:

```
log10 q_dot  =  CQ  -  (1/2) C2 h  -  3.15 K log10(e) X          X = e^(-beta h)
q_dot        =  antilog(log10 q_dot)
```

Two multiplies and one antilog call replace one antilog (for `√(ρ/ρ_SL)`) plus a table fetch plus an
interpolation multiply, and **remove 1,110 positions of table**. `½C1` and `3.15 log₁₀(V_E/26,000)`
are folded into `CQ` at initialisation, so the printed heating columns cost the same six multiplies
they would have cost with the table and are three orders more accurate. **No square root is computed
anywhere in the phase** — the atmosphere is exactly exponential, so `√(ρ/ρ_SL)` is an antilog at half
the coefficient (`avco-and-reentry.md` §7, `[verified]`).

**One approximation rides in with the log form and it is disclosed on the page.** `log₁₀ V` in that
expression is the **closed form's**, `log₁₀V_E − K log₁₀e · X`, not the integrated V's — because the
integrated V has no logarithm the machine can take. The integrated V differs from the closed form by
at most **0.07 ft/s** (§4.5), i.e. 3.1e-6 relative, i.e. 3.15 × that = **9.6e-6** in q̇ — inside
`HEAT RATE`'s last printed digit by a factor of 4.7. And **the page prints that difference in column
5**, so a reader can check the claim with the paper in his hand.
`// OPEN: HEATING_USES_THE_CLOSED_FORM_LOG_OF_V` — `[likely]`, §15 row 8. Fallback: three Newton
iterations on `10^y = V` per row (three antilog calls, ~25,000 µs per row, +1.6 % of the run) to get
`log₁₀` of the integrated V. Cost to flip: one subroutine of ~15 instructions and the budget above.
`// OPEN: U315_GOES_THROUGH_LOGS_NOT_A_TABLE` — a ruling with the derived bound above; §15 row 25
records the departure from RULINGS §E 21 so it is not read as an oversight.

### 5.8 Subroutine linkage, priced unaccelerated

The panel's Unresolved 3: every proposal calls an antilog routine three to six times per step and
none of them names the mechanism or prices it. `avco-and-reentry.md` §6's timing table gives op `G`
an **accelerated** figure only (`T = 4(L + 8.5) = 62 µs`), and `architecture.md` §12 forbids
assuming the Accelerator.

**The mechanism** is `[verified]` at `docs/research/opcodes.md:222`, the `G` row: *"`G ccccc B` after
a taken branch is the 1410's subroutine-return mechanism"*, A22-0526-3 p.22 — Store Address Register
writes the named register's five characters into the C field, the C-address is the **rightmost**
position of the destination, AAR is not disturbed, and it **cannot be indexed**. The Autocoder
mnemonics are `SAR`/`SBR`/`SER`/`SFR` (`src/core/isa/table.ts:1060-1083`,
`control.storeAddressRegister` at `src/core/isa/exec/control.ts:118`), shipped since Phase 1b.

**The base-machine cost needs no `OPEN:` constant.** `opcodes.md:222`'s own row prints `T = 69.75`
for the base machine, and `oracle/timing.json:42` carries it as `"G": 69.75`; `src/core/cycles.ts`
exports it as `T_STORE_ADDRESS_REGISTER_US`. It is the accelerated figure divided by the cycle
ratio, and it derives: `4.5(L + 8.5)` at `L = 7` is **69.75 µs**, exactly as `4(7 + 8.5)` is the
research table's 62. So the number is primary, not assumed.

```
          B     ANTLOG              the caller                       40.5 us
ANTLOG    SBR   ANTX+6              G ccccc B -- BAR into the exit
                                    branch's operand                 69.75 us
          ...
ANTX      B     00000               patched by the SBR above          40.5 us
```

**150.75 µs per call** — 40.5 for the caller's `B`, 69.75 for the `SBR`, 40.5 for the exit `B` — and
all three are already inside §5.10's per-block figures rather than added to them. Ten calls per
printed row (four `DERIV`, six `ANTLOG`) is **1,507.5 µs**, 0.87 % of the row's 172.34 ms, of which
the ten `SBR`s alone are **697.5 µs**. The mechanism and this figure are stated in the deck's comment
block, because a reader who has not met `SBR` will read `B 00000` as a bug.

### 5.9 Exactly one divide, and it forms `K`

`avco-and-reentry.md` §5's rule — hold `dt/2` and `dt/6` as pre-scaled constants, never divide at run
time — applied to the whole program. A divide is **5,436 µs** against a multiply's 2,369
(`tDivide(11,0,8,8)` vs `tMultiply(11,0,8,8)`, both recomputed this session), and it needs the
`ZA`-into-a-zeroed-field dividend discipline of A22-0526-3 p.20.

**The step loop, the derived-quantity block and the print block execute no divide at all.** Every
reciprocal is either a source constant — `1/g₀`, `1/26,000`, `1/6076.1`, `1/6`, `1/22,000` — or is
formed once at initialisation by multiplication. The single exception is Allen-Eggers's own constant:

```
NUM  = rho0 * H * g0  =  2406.6152                a SOURCE constant, all three factors are
DEN  = 2 * W/(Cd A) * |sin gamma_E|               one add and one multiply off the case card
K    = NUM / DEN                                  THE ONE DIVIDE          5,436 us
```

`K = 2406.6152 / 1000.00 = 2.4066152` ✔ against §4.2's `K = 2.40661520`. Everything downstream
is multiplication: `K log₁₀e` and `3.15 K log₁₀e` by two multiplies, and the drag constant through
the identity `ρ₀/(2β_B) = K |sin γ_E| / H` (§4.2) rather than a second divide.

That the machine's only divide is the constant Allen and Eggers named is a fact for the walkthrough,
not just the budget. `// OPEN: EXACTLY_ONE_DIVIDE_AND_IT_FORMS_K` — a ruling; §15 row 26.
**Alternative, if a later wave prefers a run with no divide at all**: punch `1/(2β_B)` on the case
card beside the sine, the cotangent and the two logarithms — same species, same desk table, and the
deck already proves the punched values by antilogging them back (§6.3). That removes the divide and
5,436 µs, and costs eight card columns the layout does not have: §6.12's card is full at 79 of 80,
so taking it means re-cutting the card, which is Zarathustrum's decision 5 territory rather than a wave's.

### 5.10 Instructions and emulated time

Every µs below is `src/core/cycles.ts`'s own exported formula called from node this session; base
machine, 4.5 µs cycle, **the Accelerator is never assumed** (`architecture.md` §12). This is the
authoritative copy of the phase's performance figures; §1, §10 and §13 cite it.

**Unit costs** — the ones this program actually executes:

| operation | call | µs |
|---|---|---|
| Multiply 8×8, L = 11 | `tMultiply(11,0,8,8)` | **2,369.25** |
| Multiply 8×5 | `tMultiply(11,0,8,5)` | 1,559.25 |
| Multiply 8×1 | `tMultiply(11,0,8,1)` | 479.25 |
| Divide 8/8 | `tDivide(11,0,8,8)` | **5,436** — once, §5.9 |
| Add/Subtract 8,8 | `tTwoFieldArith(11,0,8,8,0)` | 144 |
| Add 1,8 — the `A +5` half-adjust | `tTwoFieldArith(11,0,1,8,0)` | 112.5 |
| Zero and Add 8→17 | `tZeroArith(11,0,8,17)` | 204.75 |
| Move 8→8, L = 12 | `tMoveScan(12,8,8)` | 148.5 |
| **Indexed** move 8→8 | + `INDEX_US` = 34.5 | **183** |
| Compare 8,8 | `tCompare(11,8,8)` | 126 |
| Branch, L = 7 | `tBranchUnconditional(7)` | 40.5 |
| Store Address Register `G ccccc B` | `T_STORE_ADDRESS_REGISTER_US` | **69.75** |
| MCE 8→11 | `tEdit(11,8,11,0,0)` | 164.25 |
| Clear Storage, `CS PLINE+131` — **B = 32** | `tClearStorage(6,32)` | **175.5** |
| Clear Storage, `CS PLINE+99` — **B = 100** | `tClearStorage(6,100)` | **481.5** |
| Clear Storage, `CS PAREA+79` — **B = 80** | `tClearStorage(6,80)` | **391.5** |
| `W1` / `R1` / `P1` | `tIoRecord()` | 49.5 (`IO_TERM_US = 0`) |
| `CC1` | `T_CARRIAGE_US` | 13.5 |
| Halt `.` | `T_HALT_US` | 4.5 |

**There is no `tClearStorage(6,132)` row, and the reason is a machine fact, not a rounding.**
`clearToBoundary` (`src/core/isa/exec/wordmark.ts:81-85`) sets `ctx.sym.LB = (from % 100) + 1`, so a
single `CS` can never carry a `B` term above **100** — which is exactly why §6.7 needs two of them for
a 132-position area, and why costing one `CS` at B = 132 (625.5 µs) was costing an instruction the
machine cannot execute. The formula is `4.5(L + 1 + B)`, so any other `B` this deck ever needs is one
line of arithmetic off the three rows above.

**A discrepancy to record, not to fix.** `avco-and-reentry.md` §6's Move row prints
`T = 4.5(L + 1 + A + B)` and quotes ~113 µs; `docs/research/opcodes.md:219` and `src/core/cycles.ts`
both give `4.5(L + 1 + A + 1.5B)` = **148.5 µs** at 8→8. `opcodes.md` is the spec the CPU is written
from (`CLAUDE.md`), so the emulator's figure is the one used here. This goes in
`PHASE-6-NOTES.md` §3 as an `[observed]` research inconsistency and is **not** a build-wave edit —
`docs/research/*` is never edited in a build wave.
`// OPEN: MOVE_TIMING_FOLLOWS_OPCODES_MD_NOT_AVCO_MD` — `[observed]`; §15 row 19.

**Per call and per step** (reproduced this session):

| block | instructions | µs | multiplies | divides |
|---|---|---|---|---|
| `ANTLOG` body, including entry `SBR` and exit `B` | 25 | 8,283 | 3 | 0 |
| …with the caller's `B` | 26 | 8,323.5 | | |
| `DERIV` — one derivative evaluation, including one `ANTLOG` call | 60 | 24,454.5 | 9 | 0 |
| RK4 step, integration only — 4 `DERIV` + 6 stage arguments + 2 combinations | 295 | 123,499.5 | **44** | 0 |
| derived quantities for one printed row — V A-E, q̇, DECEL, DYN PRESS, `L10R` **and its two-statement `PL10` print copy (§7.2 mechanism 3)**, DIFF, the heat-load trapezoid, RANGE, two peak trackers, **including two `ANTLOG` calls** | 100 | 41,424 | **14** | 0 |
| print block — §6.7's list in full: 2 `CS` (B = 32 and B = 100), **11** × (`MLCWA` + `MCE`), the `MLCA` that moves the `GAMMA` literal, `W1`, `BA1`, `BCV1`, `B`, `MLCS`, `CC1`, `BA1` | **32** | **4,619.25** | 0 | 0 |
| punch block — §8.2's list in full: `CS` (B = 80), `MLCA`, 11 `MLC`, `P1`, `BA1` | **15** | **2,263.5** | 0 | 0 |
| loop control, executed — `A KDT,T`, `BZN DONEH,H,B`, `C H,KZERO`, `BE DONEH`, `B STEP` and the page counter's add (§6.9) | **6** | **535.5** | 0 | 0 |
| **per printed row** | **448** | **172,341.75 µs = 172.34 ms** | **58** | **0** |

*(44 + 14 = 58, and 4 × 9 = 36 of the RK4 step's multiplies are its four `DERIV` calls, 6 are the
stage arguments and 2 the combinations. The panel's sheet printed 40 and 16 against the same 58
total; the parts are corrected here so the column sums.)*

*(**The loop-control row is new, and it is the one term that made the earlier estimate an
under-count rather than an upper bound.** §6.13 costs that block statically at 25 instructions; six
of them execute on **every** printed row — the `T` add, the `h ≤ 0` sign test, the compare and
branch that catch an exact zero, the branch back to `STEP`, and the page counter's add — and no row
of this table or of the whole-run table below booked them. 535.5 µs a row is **49.3 ms over the run,
0.31 %**.)*

*(**Both output blocks are re-derived here from the statement lists §6.7 and §8.2 actually print**,
because the earlier figures counted neither list. The print block has **eleven** `MLCWA`+`MCE` pairs
and not twelve — column 6 is `GAMMA`, a literal moved by one `MLCA` with no edit (§7.2) — and it
carries the `BCV1`/`B`/`MLCS` overflow arm and the `CC1`'s own `BA1`, which the four-item tail
`W1, BA1, CC1, BCV1` left out: 32 statements, not 31, and 4,619.25 µs against a stated 4,738.5 that
also costed both `CS`s at an impossible B = 132. The punch block's list is `CS` + `MLCA` + 11 `MLC` +
`P1` + `BA1` = **15** statements, not the 14 its own summary claimed, and its `CS` clears **80**
positions, not the 32 a `PLINE` figure would give: 2,263.5 µs against a stated 1,899. Net on the row:
+2 instructions and +245.25 µs.)*

**The whole run:**

| item | instructions | µs |
|---|---|---|
| 92 printed rows × 448 | 41,216 | 15,855,441 |
| form-1 heading block and column headings, 11 printed lines | 80 | 13,310 |
| form-2 overflow heading, 5 printed lines | 36 | 6,050 |
| form-3 title and framing, 2 printed lines | 14 | 2,420 |
| summary block, 7 printed lines | 51 | 8,470 |
| init, **executed** — §6.13's static **70** plus the three `ANTLOG` bodies it calls: §6.3's `V0`, and check 2's two; **§5.9's one divide is inside it**, not beside it | **145** | 40,009.5 |
| the programmed halt | 1 | 4.5 |
| **TOTAL** | **41,543** | **15,925,705 µs = 15.93 s emulated** |

*(**The divide had its own row here and that was a double-count**, corrected above. §6.13's init row
is *"card read, extraction, the 12 derived constants and `V0`, the two card checks | 70"*, and
§5.9's single divide forms `K` — one of those twelve — so the divide instruction is already inside
the static 70 and therefore inside the executed 145; §6.13's table has no divide row of its own and
still totals 486. Booking it again added one instruction and 5,436 µs twice. The row is gone and the
init row now says the 40,009.5 µs carries it. Net: 41,544 → **41,543** and 15,931,141 →
**15,925,705 µs**, both withdrawn wherever they appeared; 15.93 s and the 383 µs per instruction of
§10.6 are unmoved at this precision, 15,925,705 / 41,543 = 383.3.)*

**§6.13's table is a STATIC count and this one is an EXECUTED count, and neither is derived from
the other.** §6.13 counts statements as written, each subroutine once; §5.10 counts every call of
`ANTLOG` and `DERIV` where it runs, which is why its RK4 (295 against 67), derived-quantity (100
against 50) and init (145 against 70) rows are whole subroutine bodies larger. The three
heading-and-summary rows differ in both directions — 80/74, 36/40, 51/48 — because the two tables
were estimated independently, block by block, against different unit rates; both are estimates of an
unwritten program, and **wave 3 replaces both with the measured count** (§11.4).

The 25 non-detail printed lines are §7.1's pagination — 11 + 5 + 2 + 7 — and 92 + 25 = **117 printed
1403 lines**, which is the figure §7.1 and §13 use.

- **Frames at `START_BUDGET = 2000`** (`src/core/machine.ts:45`; the four-term gate at
  `src/ui/main.ts:97-98` and the `machine.start(START_BUDGET)` call at `:99`, both read this
  session): **21 frames**, ≈ 0.35 s of wall clock without pacing. That is **Zarathustrum's decision 6**.
- **1403 Model 2 at 600 lpm** (A22-0526-3 p.67): **117 printed lines = 11.7 s**.
- **The honest period figure: ~15.9 s of unaccelerated 1411 time against ~11.7 s of 1403 time — this
  job is COMPUTE-bound by about a third, not printer-bound.** The dossier carried
  exact-solution-first's printer-bound claim; it does not survive this design's multiply count. The
  walkthrough states the corrected figure (§16 item 10).
- **These are printed in `docs/BUILD-LOG-6.md`, never asserted** (RULINGS §E 24, the cc01 precedent,
  §13 criterion 19), and wave 3 republishes them from the first real measurement.

**The estimate is deliberately an upper bound, and three named effects move it.** (a) The scaled
multiply's `ZA` is costed at B = 17, the whole product field, where the shipped idiom's `ZA`
terminates on the multiplier image's own word mark at B = 8 (`demos/sales-summary.asm:154`,
`ZA AMT,COMM-6`) — **60.75 µs per multiply pessimistic**, of order **0.3 s** over the run
(58 × 92 × 60.75 µs = 0.32 s). (b) `a_D = ρ₀ X V²/(2β_B)` can be formed from the raw antilog `X`
instead of from `ρ/ρ_SL`, deleting one scaled 8 × 8 multiply per derivative evaluation — **−1,472
instructions and −1.04 s** — at the cost of `RHOM` no longer existing as a named field, which is why
this plan does not take it before wave 3 measures. (c) The divide adds 5,436 µs, above. Net: the
measured figure should come in **below** 15.93 s, and wave 3's commit is what settles it.

### 5.11 The memory map

`createMachine({ size: 10_000 })` — `src/ui/main.ts:22`, `tools/run-deck.ts:82`, `tools/rpg.ts:121`,
all three read this session. **10K stays.** Contiguous address ranges from 00000 to 09999, every
boundary at a `file:line` or a manual page — the only form a reviewer can check in one pass.

**Instruction density, measured** over `demos/sales-summary.asm`, which `node build/tools/asm.js`
reports as 39 condensed cards, 0 flagged, 0 warnings:

- **185 imperative statements in 1,724 positions → 9.319 positions per instruction**, whole program.
- Length histogram `{1: H×1, 2: CC1×12, 6: CS×18 + SW×1, 7: branches×41, 10: W1/R1×10, 11: arith×26,
  12: moves×76}`. The dossier's 9.6-9.9 band is the `{6,7,11,12}` subset:
  (19·6 + 41·7 + 26·11 + 76·12)/162 = **9.87**.
- **Phase 6's own mix** is move- and arithmetic-heavy — ≈45 % L=12 moves, 25 % L=11 arithmetic,
  15 % L=7 branches, 8 % L=6 `CS`, 4 % L=10 I/O, 3 % L=2 `CC1` → **10.1 positions per instruction**.
  The map spends **10.1**, the pessimistic end; the band is 9.3 – 10.1.

**Static instruction estimate — 486** (§6.13's block table). This is an estimate of a program that is
not yet written, built block by block from §5.10's op counts; **wave 3 republishes the map with the
measured length before wave 4 commits the page golden**. 486 × 10.1 = 4,908.6 positions; the map
spends 4,910.

**The density this map spends is 10.1, and that is a declared departure from RULINGS §E 21**, which
binds the map to *"instruction density at the measured 9.6-9.9 positions/instruction"*. The 9.87 that
band comes from is the `{6,7,11,12}` subset of `demos/sales-summary.asm` — a card-listing job whose
mix is not this one's — and the whole-program figure over the same file is **9.32**. Phase 6's own
mix is derived above and lands at 10.1, outside the band on the pessimistic side, deliberately: a map
that under-spends is a map that has to move after wave 3 measures, and the two fallbacks below exist
precisely so that spending high costs nothing if the estimate holds. The departure is named in this
plan's header and gets its row in `PHASE-6-NOTES.md` §2.

| range | contents | positions | boundary source |
|---|---|---|---|
| 00000–00011 | keyed bootstrap `AL%1000012$R` | 12 | `src/formats/loader.ts:26` |
| 00012–00024 | unused low core | 13 | — |
| 00025–00099 | index registers 1-15, five positions each; X1 = 00025-00029 | 75 | A22-0526-3 pp.14-15 Fig.9 |
| 00100–00499 | condensed loader body, re-entry 00281, `LOADER_CEILING = 499` | 400 | `src/formats/loader.ts:199`, `:202` |
| 00500–05409 | `REENTRY` code — 486 instructions at 10.1 positions | **4,910** | `ORG 00500` |
| 05410–05849 | source and derived constants, the case-card working copies, `KBIAS`, **eleven detail MCE control words and eight heading ones** | 440 | §5.2, §5.3, §7.2, §7.3 |
| 05850–06999 | printed literals: heading, column headings, framing, summary labels — **1,146 ALLOCATED (§7.9), not itemised; wave 4 measures it** | 1,150 | §7.9 |
| 07000 | slack — the terminating GM-WM of the emitted literal run lands here and on nothing | 1 | §6.0 rule 3 |
| 07001–07478 | work areas (**391** itemised, **7** spare) **and `CDIN`, the case card (80)** | 478 | §5.2, §6.11 |
| 07479 | slack — the work run's terminating GM-WM lands here and on nothing (§5.5: the work fields are `DCW`s and emit) | 1 | §6.0 rule 3 |
| 07480–08479 | **`ANTA`** — 100 entries × 10 positions | **1,000** | §5.6, `ORG 07480` |
| 08480 | slack — the `ANTA` run's terminating GM-WM lands here | 1 | §6.11 |
| 08481–08499 | slack up to the hundreds boundary `CS PAREA+79` needs | 19 | §6.11 |
| 08500–08579 | `PAREA`, the punch area | 80 | §8.2, `ORG 08500` |
| 08580 | `PAGM`, the punch group mark, marked at run time by `SW PAGM` | 1 | §8.1 |
| 08581–08599 | slack up to the hundreds boundary `CS PLINE+99` needs | 19 | Phase 5 §8.1 |
| 08600–08731 | `PLINE`, 132 positions | 132 | A22-1407-2 pp.5-8, `ORG 08600` |
| 08732 | `PLGM`, the group mark, marked at run time by `SW PLGM` | 1 | `demos/sales-summary.asm:53` |
| **high-water** | | **08,732** | |
| 08733–09999 | unused | 1,267 | machine size 10,000 |

**Sum: 12 + 13 + 75 + 400 + 4,910 + 440 + 1,150 + 1 + 478 + 1 + 1,000 + 1 + 19 + 80 + 1 + 19 + 132 + 1 +
1,267 = 10,000.** ✔

**Both areas a `CS` clears sit on a hundreds boundary, and that is what fixes the two `ORG`s above
08,479.** `CS` clears from its B address **down to the hundreds boundary below it**
(`clearToBoundary`, `src/core/isa/exec/wordmark.ts:81-85`, which is also why no single `CS` can carry
a `B` term above 100 — §5.10). So an 80-position `PAREA` must not
straddle a boundary: `CS PAREA+79` would clear only the part above it and leave the rest of the card
image dirty. With `ANTA` ending at 08,479 the next legal placement is `ORG 08500`, and `PLINE` then
takes `ORG 08600`. The two short slack runs at 08481–08499 and 08581–08599 are the price: a punch area
that clears in one `CS` and a print area that clears in two (§6.7, §6.11).

*(Three corrections to the panel's map are folded in above. Its `PAREA` + `PAGM` row printed 81
positions of content against an 80-position range and its fifteen rows summed to 10,001; splitting
the punch area from its group mark closes it exactly. Its `CDIN` sat
**immediately above** `ANTA`, where the `ANTA` run's terminating GM-WM would land on `CDIN`'s
high-order position — reproduced this session, and a group mark there makes `R1 0,CDIN` transfer
nothing (§6.0 rule 3, §6.11). `CDIN` moves down into the work block and a slack position takes the
mark. And its `PAREA` at 08401–08480 was legal only under a smaller code and literal budget; at this
map's sizes `PAREA` is at `ORG 08500` and `PLINE` at `ORG 08600`, which moves the design high-water
from the skeleton's 08,632 to **08,732** and leaves the ceiling margin at 268.)*

The work block, itemised: state `H`,`V` 16 · stage arguments `VS`,`HS` 16 · `K1V`…`K4V`
32 · `K1H`…`K4H` 32 · `T`,`DT` 9 · `ARG`,`ARGB`,`ARGF1`,`F`,`F1`,`R`,`DEC`,`KBIAS` **47** ·
`MANT`,`XM`,`XD` 18 · `RHOM`,`RHOD` 10 · `PL10` 4 · the ten printed values 80 · `W1`,`W2`,`W3` 24 ·
`PROD`,`PROD2`,`PROD3` 51 · two peak trackers 50 · counters 11 = **400**
(8+9+5+7+2+5+2+9 = 47 in that sixth group).
One of those fields is not a work area:
**`KBIAS` is a constant** — `+10.0000000`, nine positions, §5.2 — and lives in the constants block at
05410–05849 with everything else the deck never writes to. That leaves **391** positions of true work
area, and the map gives the block **478** beside `CDIN`'s 80: **seven positions spare.**

**Every one of those 391 positions is a `DCW` of zeros, not a `DS`, and that is what the eighth
spare position was spent on.** §5.5 gives the rule and the two `file:line`s behind it: a `DS` emits
nothing and arrives blank **and unmarked** (`src/asm/emit.ts:565`, `software.md:112` /
C28-0326-2 p.30), and arithmetic length in this machine is the B-field word mark's
(`src/core/alu.ts:290-291`), so a `DS`-declared `H`, `T`, `W1` or `PROD` would let `ZA CTOP,H`,
`A KDT,T`, `MLC PROD-5,W1` and every `M …,PROD` run left past its own field. The block therefore
**emits all 391 positions** (§5.11's object-deck arithmetic below), its emitted run needs a
terminating GM-WM to land on nothing under §6.0 rule 3, and the map buys that with the position at
**07479** — which is the eighth spare position, spent, leaving seven.

**Two fields were missing from this itemisation and the earlier residue was arithmetically
impossible, which is why the range moved.** `ARG` (8 positions, §5.2 — the antilog's signed
argument, and a field distinct from `ARGB`, as §6.4's `ZA ARG,ARGB` requires: nothing zero-and-adds
a field into itself at a different width) and `ARGF1` (5 positions, the index-register image §6.4
loads into X1 with `MLCWA`) both had rows in §5.2 or uses in §6.4 and appeared in no group here. With
them the true work area is 391 in the 379 an earlier draft published — a **twelve-position
overrun of a block that was said to have one position spare**. The range is therefore widened to
07001–07478, the slack position at 07479 takes the emitted run's group mark, and `ANTA` stays at
`ORG 07480`; the twenty positions come out of the slack run that
used to sit at 08461–08499 and is now 08481–08499, so the map still sums to 10,000, the high-water is unmoved at 08,732 and
the unused tail is still 1,267. The earlier figures — a 35-position sixth group, a 388 total, a 387
total, a 374 block, a 378-in-379 block, and 5 spare and then 1 spare — are all withdrawn. So is the
claim that the MCE control words help pay any overrun: they are constants, they were never in this
itemisation, and they relieve nothing.

`V0` needs no row — it is formed into `V` at init through the `W1`/`W2` intermediates already
counted — and `CORR`, §5.3 row 4's multiplicand, is **`W3`**: the antilog's Horner residual is
complete and consumed inside `ANTLOG` before `DERIV`'s drag chain touches `W1` or `W2`, so the third
intermediate carries it and no fourth name is needed. The itemisation is written out
here because a work block is where an unnoticed field lands, and **§11's wave 3 republishes this sum,
not only the code length, against the assembled listing.**

**The 440-position constants block is an allocation and not an itemisation**, and wave 3 republishes
its measured length beside the other two. It has to hold the eleven detail MCE control words of §7.2
**and** the eight heading ones of §7.3 — `23,000.`, `-30.00`, `400,000.`, `1,000.0`, `31.081`,
`1.00`, `.25` and `150,000.` are edits of case-card fields and their words are not the detail words'
shapes — which is nineteen control words, not the twelve an earlier draft counted.

**Ceiling ≤ 09,000**, asserted from `AssemblyResult.symbols` in test (§13 criterion 6). Margin on the
pessimistic density **268 positions**; on the measured whole-program density (9.32) the code block is
486 × 9.32 = **4,530** — 380 positions shorter — and the high-water falls to **08,352** with a margin
of **648**.

**Fallbacks, named and priced, if the ceiling is threatened:**

| # | fallback | recovers | costs |
|---|---|---|---|
| F1 | the four case-echo heading lines become two | ≈320 positions | the page stops echoing R-NOSE and the atmosphere constants |
| F2 | the summary drops its `NACA 1381 EQ 17/15/16` line to the walkthrough | ≈130 positions | the closed forms leave the page |
| F3 | `ANTA` at a five-position stride | 500 positions | **refused** — five-digit entries give 5e-5 relative against DYN PRESS's 1.456e-5 bound (§5.6) |

F1 and F2 are the live pair. F3 is recorded so a later reader does not re-derive it.

**The object deck.** `demos/sales-summary.asm` assembles to **39 condensed cards** carrying **2,033
payload positions** (re-measured this session by summing `deck.records[].payload.length`) —
**52.13 payload positions per card**, which is what the emitter achieves across record boundaries
against a `PAYLOAD_COLUMNS` field 60 wide (`src/formats/objectdeck.ts:49, 72`). Phase 6's emitted
positions, taken from the map's own allocations so that one figure governs both:

```
code            4,910
constants         440
literals        1,150     1,146 ALLOCATED in 7.9, measured by wave 4
ANTA            1,000     100 contiguous ten-character DCW cards, 5.6 decision 2
work areas        391     DCW zeros, NOT DS -- 5.5.  ARGF1-s five are in here
                -----
                7,891  /  52.13  =  152 condensed object cards   (151.37, rounded up)
                                 +   2 one-position records: PAGM at 08580, PLGM at 08732
                                     (each at its own ORG, so each breaks a record)
                                 = 154 condensed object cards
                                 +   1 loader bootstrap card
                                 +   1 loader body card
                                 +   1 execute card
                                 +   1 case card, behind the execute card, read by R1
                                 = 158 cards in the hopper
```

**154 / 158 is an ESTIMATE of an unwritten program, and it is labelled as one everywhere it
appears.** §13 criterion 18 and §10.3 assert `assemble(demos/reentry.asm).deck.records.length + 4`
against the number waves 3 and 5 record in `docs/BUILD-LOG-6.md` — never against the literal —
because the whole figure descends from 486 estimated instructions at an estimated 10.1 positions
each, and a plan that asserted it would be asserting its own arithmetic.

**What emits and what does not, corrected — the fifth line above is new and it is the largest single
correction in this section.** Only **`PLINE` and `PAREA`** are `DS` areas, and only those two emit
nothing. The **work areas are `DCW`s of zeros** for the reason §5.5 gives — a `DS` arrives blank and
unmarked, and every arithmetic statement in this deck takes its length from its B field's word mark
(`src/asm/emit.ts:565`, `src/core/alu.ts:290-291`, `demos/sales-summary.asm:17-32`) — so their 391
positions are emitted, which is **+391 on 7,500 and eight more condensed cards**. **`CDIN` is a
`DA` whose twelve sub-entries are the bare-`lo` form, and emits nothing** (§5.5) — an earlier draft
booked twelve marked blanks for it, on the `hi,lo` rule, and that is withdrawn. **The two records the
payload arithmetic cannot see are `PAGM` and `PLGM`**: one-position constants at their own `ORG`s,
each its own record, which is the +2 in the block above.

*(Three earlier figures are withdrawn. The panel's sheet gave 7,240 emitted
positions, 139 object cards and 143 in the hopper, on the assumption that `ANTA` emits only
eight digits per entry with the two-position stride gap taken by an `ORG`. Measured this session,
that form emits 800 positions in **100** object records against the contiguous form's 1,000 in
**19** — the `ORG` breaks the record — so the ten-character `DCW` is both the smaller deck and the
simpler source. An earlier draft of this plan then printed 7,440 / 143 / 147 off a 4,900-position
code block and an 1,100-position literal block; a later one printed 7,500 / 144 / 148 with the work
areas booked as `DS`, and §6.4 announced a 7,505 for `ARGF1`'s five positions that neither this
block nor §6.13 carried. All of them are gone, and so is the **7,891 / 152 / 156** set a later draft carried before the
two group-mark records were booked: **7,891 / 154 / 158** is the set every section of this plan uses,
`ARGF1`'s five are inside the 391, and §6.13 prints the same arithmetic.)*

---

## 6. The program

*`demos/reentry.asm`, section by section.* Everything below was checked against the shipped
assembler this session; where a statement is quoted it assembled with `ok: true`, `flagged` empty
and `warnings` empty, and where a mechanism is claimed it was **run** on the emulated machine. The
skeleton that proves it — case-card read, indexed antilog fetch, heading line, twelve-column detail
line, punched summary card, programmed halt — measured **35 object cards, high-water 08,632, 312
instructions, 41,752.5 µs, `punch.stackers['0'] === 1`, stop `halt`**, 0 flagged, 0 warnings. That
08,632 is the **skeleton's** high-water, with its `PLINE` at `ORG 08500`; §5.11's map places the
shipped deck's `PLINE` at `ORG 08600` and its high-water at **08,732**, for the reason §5.11 gives.
Sizes and timings are §5's and §7's and are cited, never restated.

### 6.0 The rule the deck is written to

C28-0309-1 standalone Autocoder, the Phase 3 scope: no macros, no IOCS, no `EX`/`XFR`. The print
idiom is `demos/sales-summary.asm`'s verbatim (§2.3) and Phase 6 introduces **no new output
pattern**. Three rules govern every line of it, and each is a thing the machine will punish:

1. **No shift instruction.** Every rescale is one `MLC` from an assembly-time constant offset, and
   every truncating move is preceded by `A +5,WORK-n+1` (§5.1, `avco-and-reentry.md` §6, `[verified]`).
2. **A label beginning in column 7 resolves HIGH-order** (`LABEL_INDENT_COLUMN = 7`,
   `src/asm/types.ts:27`, under the rule `COL7_INDENT_IS_STANDALONE_TOO`,
   `src/asm/symbols.ts:52` — both read this session). `PLINE` and `PAREA` are both indented for that
   reason. Measured on the skeleton, whose `PLINE` sat at `ORG 08500`: written at column 7 it gives
   `resolvedTo: 'highOrder', value: 8500`, the area's own `ORG`;
   written at column 6 it resolves low-order and every `CS PLINE+131` addresses the wrong end of
   the area.
3. **Every emitted run's terminating group-mark-with-word-mark must land on nothing.** The
   assembler says so itself; measured this session, a `DA`/`DS` area placed immediately above an
   emitted run produces

   > record 002's GM-WM lands at 00569, inside CDIN — a read with d = `R` will transfer nothing; use `$`

   and one `ORG *+1` between them clears it. §5.11's map carries the **three** slack positions this
   deck needs, at 07000, **07479** and 08480 — the third because §5.5 makes the work block `DCW`
   data, so it emits a run of its own and that run has a terminating group mark — and §6.11 places
   them in source order.

### 6.1 The card, the comment block, the control cards

```
01010AUTOCODER RUN
01020          JOB  BALLISTIC REENTRY TRAJECTORY
01030          CTL   1
01040*  A BALLISTIC REENTRY TRAJECTORY, INTEGRATED IN TIME BY RK4 FROM A
01050*  CASE CARD.  ALLEN AND EGGERS, NACA REPORT 1381, EQ 7 AND EQ 13.
01060*  10K, ONE CHANNEL, A 1402 READ-PUNCH AND A 1403 MODEL 2, CHAIN A.
01070*
01080*  RECONSTRUCTION - NOT FLIGHT DATA.  NO IBM 1410 IS DOCUMENTED AT
01090*  ANY AVCO SITE - BRL 1961 AND 1964 SURVEYS, THE COMPUTERS AND
01100*  AUTOMATION CENSUS.  AVCO RAD WILMINGTON RAN AN IBM 704 FROM 1958.
01110*
01120*  THERE IS NO PUBLISHED IBM 1410 FIXED-POINT SCALING STANDARD.
01130*  THE SCALING TABLE BELOW IS THIS PROJECT-S OWN DESIGN.  EVERY
01140*  DCW CARRIES ITS IMPLIED POINT S IN ITS COMMENT, AS PI.JOB DOES.
01150*
01160*  THE MACHINE HAS NO SHIFT.  A RESCALE IS ONE MLC FROM A CONSTANT
01170*  OFFSET.  A +5 HALF ADJUSTS BEFORE EVERY TRUNCATING MOVE.
01180*  SUBROUTINE RETURN IS SBR EXIT+6 THEN B 00000, THE G CCCCC B
01190*  MECHANISM, 69.75 MICROSECONDS UNACCELERATED ON A BASE 1411.
01200*  THE ACCELERATOR IS NOT ASSUMED ANYWHERE IN THIS DECK.
01210          LOAD
01220          ORG  00500
```

The four facts in that block are the four `avco-and-reentry.md` findings the panel found reach no
artifact: the reconstruction (§1-2, `[verified]` as a negative), the absent scaling standard (§6,
`[verified by absence]`), the `G ccccc B` return (`opcodes.md:222`, `[verified]`, 69.75 µs from
`oracle/timing.json:42`) and the un-assumed Accelerator (`architecture.md` §12). RULINGS §E 29
requires the middle two on the artifact and this is the artifact they belong on.

**Chain A carries no `'`.** `PROJECT-S` above is not a typo: the apostrophe is octal 14 on the H
arrangement and prints `@` on A (§7.8's table). The comment cards are not printed, so this is
convention rather than necessity — and the **parentheses** an earlier draft of cards 01090-01100
carried are gone for the same reason: `(` and `)` have no BCD **at all** in this emulator
(`bcdOfGlyph` returns `undefined`, §7.8), so a source deck cannot even spell them, and §7.8's sweep
is scoped to `@…@` literals and would not have caught them on a comment card.

**The one exception, and it is deliberate.** The `+` in `A +5` and `EXIT+6` — in the statements
themselves, and in cards 01170-01180, which quote them — is Autocoder **address-arithmetic syntax**,
not text: `operand.ts` reads it, no print chain ever sees it, and `demos/sales-summary.asm` writes 85
of them. So the vocabulary rule this deck actually holds is: **no character outside chain A in any
printed literal or any comment card, except `+` where the source quotes the deck's own address
arithmetic** — which is the scope §7.8's sweep has. It is stated here rather than left as "one
vocabulary throughout", which was not true three lines above it.

### 6.2 Constants, edit words, and `ANTA` — the one measured departure from the panel's sheet

Three declarative blocks, in this order, all emitted:

| block | positions | form |
|---|---|---|
| numeric constants, case-card working copies, the twelve derived constants, `KBIAS` | 440 | `DCW @…@`, each with its `S` in the comment |
| the **eleven detail** MCE control words, the **eight heading** ones and the `GAMMA` literal | in the 440 above | `DCW`, §7.2's and §7.3's tables |
| printed literals — heading, column headings, framing, summary labels | **≈1,146** | `DCW`, §7.9 |
| `ANTA` — 100 entries at a ten-position stride | 1,000 | `DCW`, below |

**`ANTA` is 100 contiguous ten-position `DCW` cards, not 100 eight-position ones separated by
`ORG *+2`.** This is a departure from the panel's own wording and it is forced by measurement,
not by taste — both builds run through the shipped `assemble()` this session:

```
  100 x DCW @xxxxxxxx@  with  ORG *+2  between them   ->  100 object records,   800 payload positions
  100 x DCW @xxxxxxxxxx@ contiguous                   ->   19 object records, 1,000 payload positions
```

An `ORG` breaks the object record, so the strided form emits **one card per entry** — 100 cards for
a table that packs into 19. The fix costs nothing: each entry is written as `10^(i/100)` to **ten
significant digits**, so the run is contiguous, the stride is still ten, and the fetch takes the
**top eight** — the low two are guard digits the `MLC` discards, not filler:

```
01xxx          ORG  07480
01xxxANTA      DCW  @1000000000@       ENTRY 00 -- 10 TO THE I OVER 100, S=7 IN THE TOP 8
01xxx          DCW  @1023292992@       ENTRY 01 -- THE LOW TWO ARE GUARD DIGITS
   ...                                 98 more
01xxx          DCW  @9772372210@       ENTRY 99 -- 10 TO THE 99 OVER 100
```

`ANTA` resolves LOW-order (`kind: 'constant', resolvedTo: 'lowOrder'`), so entry `i`'s ten positions
end at `ANTA + 10i` and its eight significant digits end at `ANTA-2 + 10i`. The fetch is therefore
**`MLC ANTA-2+X1,MANT`** with `X1 = 10·F1` and `MANT` an eight-position field. Run end to end this
session at `F1 = 50`: `X1 = 00500`, `MANT = 31622776`, against `10^0.50 = 3.162277660` — the top
eight of the ten stored digits, **truncated by the move**, because an `MLC` half-adjusts nothing
(§5.1 rule 3). **The endpoint checks the same way and it is worth checking, because it is the card a
builder copies to write the tail of the table:** entry 99 is `10^0.99 = 9.772372210`, so
`MANT = 97723722`. It is **not** `99770006` — that is `10^0.999`, the 1,000-entry design §5.6
refuses, and the value an earlier draft of this listing punched into the last card. Its top eight
would have made `ANTA[99]` 2.1 % high, in the one routine every printed column depends on.

**The index register is loaded with `MLCWA`, never `MLC`.** Measured: after the loader runs, core
00025-00029 holds `81$R0` **with a word mark in it**, so `MLC KIDX,XR1` stops after two characters
and leaves `81$00` in X1; the next indexed reference takes an address check. `MLCWA KIDX,XR1` moves
five characters and their word marks and leaves `00500`. (`KIDX` is the probe's name for that
five-position source; the deck's own is `ARGF1` — §5.2's row and §6.4's two statements.) `XR1 EQU 00029` — the units position of
index register 1, A22-0526-3 pp.14-15 Fig.9, `[verified]`. This trap is in no proposal, no judge
report and no ruling; it cost an address check and forty minutes this session, and it is one line in
the deck.

`ANTA`'s own record terminator lands at 08480, the position above the table, which is why §5.11
leaves that position unassigned. Word-mark discipline: `ANTA` is `DCW` data in the object deck, so
**every entry arrives with its own word mark from the loader** and no arithmetic result ever lands
in an undefined field. The `DS`-reserved run-time-built alternative is refused in §2.2 and §5.5 for
exactly that reason.

### 6.3 Init — the case-card read and the two consistency checks

```
01xxxSTART     SW   PLGM               THE GM-WM THAT ENDS W1
01xxx          SW   PAGM               THE GM-WM THAT ENDS P1
01xxx          R1   0,CDIN             MOVE MODE, BAKED D
01xxx          BA1  *+1                RELEASE THE INTERLOCK
01xxx          BCE  GOODCD,CREC,C      COL 1 MUST BE THE LETTER C
01xxx          B    BADREC             A WRONG CARD IS A PRINTED HALT
01xxxGOODCD    MLC  CVE,VE             8 DIGITS, S=2
01xxx          MLCA CGAM,KGAM          6 CHARACTERS, PRINTED AS PUNCHED
01xxx          MLC  CSIN,SING          8 DIGITS, S=7, SIGNED
   ...                                 nine more field extractions
```

Both `SW`s are `demos/sales-summary.asm:53`'s idiom (card `01530`, `SW PLGM  THE GM-WM THAT ENDS
W1`) and the punch's is `SW PAGM` — §8.1's measured requirement. `R1 0,CDIN` is sales-summary's
spelling exactly (`demos/sales-summary.asm:56`, card `01560`, `R1 0,CDIN  MOVE MODE, BAKED D`): the
mnemonic supplies channel, device, mode and d, and the programmer writes the pocket and the address
(`src/asm/mnemonics.ts:140-165`, C28-0309-1 pp.23-24). The explicit-d form `R1 0,CDIN,$` also
assembles — verified this session — but it spends `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS`
(`src/asm/operand.ts`) for nothing, so **the plan uses `R1 0,CDIN`**.

**The two checks the deck performs before it integrates** (§6.12's card, and they are free
because the antilog and the multiply already exist):

| # | check | this case | on failure |
|---|---|---|---|
| 1 | `SIN²·(1 + COT²) = 1` to one unit in the last digit | `COT` as punched is `17320508`, so `COT²` is 2.99999997 and 0.25 × (1 + 2.9999999) = **0.9999999** — one unit low, and it passes | `MLCA KBADT,PLINE+n`, `W1`, `CC1 1`, `H` |
| 2 | `antilog(LOG10 V-E)` equals `V-E` to one unit in its last printed digit; likewise `LOG10 R-NOSE` against `R-NOSE` | 10^4.3617278 = 23,000.0 | ditto, a different literal |

**The one-unit tolerance on check 1 is not slack, and a builder must not tighten it.** √3 is
1.73205081, and the card carries eight digits at S = 7, so the punched `17320508` is already
7.6e-9 low; squaring it gives 2.9999999738, which the field holds as `29999999` at S = 7, and
0.25 × (1 + 2.9999999) = 0.999999975, which truncates to `09999999`. The check's whole tolerance is spent by
the truncation of a correctly punched cotangent, so **`= 1.0000000` exactly is not a reachable
result** and a build that half-adjusts a step differently trips a false diagnostic halt on a good
card. The deck compares `|SIN²(1 + COT²) − 1| ≤ 1` in the last position and no tighter.

Both end in a **programmed halt with a printed diagnostic line**, never a silent wrong answer. That
is why the logarithms are punched rather than searched: the dossier measured that a binary search
over `ANTA` resolves log₁₀ to ±0.005, and 0.005 in the DKR prefactor is 1.16 % in q̇ — which would
destroy `HEAT RATE`'s last two printed digits (§7.2's bound for that column is 4.5e-5).
`// OPEN: CASE_CARD_CARRIES_DERIVED_TRIG_AND_LOGS_AND_THE_DECK_CHECKS_THEM`, `[unverified]`,
§15 row 15.

Then the **twelve derived constants** are formed once — `K`, `K log₁₀e`, `3.15 K log₁₀e`, `CQ`,
`1/(2β_B)`, `ρ_SL/(2β_B)`, `cot|γ_E|/6076.1`, `dt/2`, `dt/6`, `C1`, `C2` and the band top (§4.2) —
and **no divide is executed after this block**: every reciprocal is a source constant or is formed
here, and the block's own single divide is §5.9's, the one that forms `K`.

**And then the initial state, which is where §4.1's band-top velocity is formed.** `T` is zeroed,
`H` takes the band top from the card, and `V` takes **`V0 = V_E e^(−K X₀)`** — not `V_E`. It is one
call to the routine the deck already has:

```
01xxx          ZA   CTOP,H             H := THE BAND TOP, 8 DIGITS S=1
01xxx          MLZS KMINUS,W1          ARG := -KLOG10E * X0 , THE SAME CHAIN
01xxx          ...                     AS EVERY LATER ROW-S EQ 13 TERM, 5.3 ROW 10
01xxx          B    ANTLOG             MANT AND DEC
01xxx          ...                     V := VE * MANT, RESCALED -- 5.3 ROW 11
```

so `V(0) = 22,939.54 ft/s` at this case, against the card's `V-E` of 23,000.00. The cost is one
`ANTLOG` call and one scaled multiply — 8,323.5 + 2,835 µs, inside the **145 executed** instructions
and 40,009.5 µs §5.10 books for init (this block's static 70, §6.13, plus the three `ANTLOG` bodies
init calls: this one and check 2's two). **Loading `V` from `CVE` instead is the single highest-cost
one-line error available in this deck**: §4.1 prices it at 60.46 ft/s off eq.13 on every row, 121×
the published DIFF bound, and wave 3's criterion 9 is what catches it.

### 6.4 `ANTLOG` — the one non-elementary operation, and its linkage

Twenty-five instructions, three multiplies, 8,283 µs (§5.10). Argument `ARG` = log₁₀ of the wanted
quantity, 8 digits at S=7 and signed; it is added to `KBIAS` = +10.0000000 into the **nine-position**
`ARGB` so the whole run is a positive number with room for two integer digits (§5.2). The result is
`MANT` (8 digits, S=7, always in [1,10)) and `DEC` (2 digits, the decade, biased).

```
01xxxANTLOG    SBR  ANTX+6              G CCCCC B -- STORE THE RETURN, 69.75 US
01xxx          ZA   ARG,ARGB            9 POSITIONS -- SEE 5.2
01xxx          A    KBIAS,ARGB          BIAS SO THE SLICE IS UNSIGNED
01xxx          MLN  ARGB-7,DEC          DIGITS 1-2 ARE THE BIASED DECADE
01xxx          MLN  ARGB,F              THE SEVEN-DIGIT FRACTION
01xxx          MLC  F1,ARGF1-1          F1 INTO POSITIONS 3 AND 4 OF 00000
01xxx          MLCWA ARGF1,XR1          X1 = 10 TIMES F1 -- MLCWA, SEE 6.2
01xxx          MLC  ANTA-2+X1,MANT      THE INDEXED FETCH, 183 US
01xxx          ...                      r = F - F1/100 ; HORNER, THREE MULTIPLIES
01xxxANTX      B    00000               PATCHED BY THE SBR ABOVE, 40.5 US
```

**`ARGF1` is a five-position field and it is a work area, not a constant** (§5.2, §5.11): it is
declared `ARGF1 DCW @00000@` so it arrives from the loader already zeroed and word-marked, and the
only positions the routine ever writes are 3 and 4 — `MLC F1,ARGF1-1` puts `F1`'s two digits there,
leaving `0`,`0`,`F1`,`0` = 10·`F1` as a five-digit address. At `F1 = 50` that is `00500`, which is
the `X1` §6.2 measured. It is `DCW` data rather than a `DS` for the reason `ANTA` is (§5.5) — a `DS`
arrives blank **and unmarked** — so it emits its five positions. **That is not a special case and it
is no longer accounted for as one:** §5.5 makes it the rule for the whole work block, and `ARGF1`'s
five positions are inside the **391** §5.11 and §6.13 both add to the emitted total. An earlier draft
of this paragraph announced a 7,500 → 7,505 that neither of those blocks carried; the figure both
blocks now carry is **7,891**. The listing above is
ten of the block's twenty-five statements; the fifteen elided are the residual `r = F − F1/100` and
its Horner chain, so `ARGF1`'s load costs nothing §5.10's budget does not already carry.

`SBR` is op `G` (`src/core/isa/table.ts` G rows, `src/core/isa/exec/control.ts:118`
`storeAddressRegister`); `opcodes.md:222`, `[verified]`: *"`G ccccc B` after a taken branch is the
1410's subroutine-return mechanism"*. **150.75 µs per call** and ten calls per printed row (§5.8).
The mechanism is stated in §6.1's comment block because `avco-and-reentry.md` §6 gives op G an
**accelerated** figure only and `architecture.md` §12 forbids assuming the Accelerator; the number
used here is the emulator's own base-machine constant.

**Op `T` appears nowhere in this deck.** §5.6 decision 6: a 1,000-entry search is 24,786 µs and a
100-entry search 2,511 µs against the indexed `MLC`'s 183 µs. `LL LE LLE LH LLH LEH` remain in
`ALL_MNEMONICS` (all 198 names dumped this session) and remain unused, with the reason recorded in
§2.2.

### 6.5 `DERIV` and the RK4 driver

`DERIV` evaluates (dV/dt, dh/dt) at a stage argument (`VS`, `HS`): 35 instructions of its own plus
one `ANTLOG` call, 60 instructions and 24,454.5 µs, nine multiplies (§5.10).

```
    L10R  =  C1 - C2 * HS                       exact, no antilog in this path
    rho-r =  ANTLOG(L10R)                        -> RHOM mantissa + RHOD decade
    AD    =  RHOM * VS * VS / (2 beta_B)         three scaled multiplies, decade applied last
    dV/dt = -AD                                  MLZS stamps the sign
    dh/dt =  VS * SING                           one scaled multiply
```

The decade is applied to the **finished product** by one indexed `MLC`, never to the mantissa —
`RHOM` (8 digits, S=7, always in [1,10)) and `RHOD` (2 digits) are separate fields, which is the
defect the panel named against paper-first and which §5.2's scaling table fixes.

The driver is 67 instructions: four call sites, six stage-argument formations, two combinations
and the loop (§6.13). Classical RK4 in the two states:

```
    k1 = DERIV(V,           h          )
    k2 = DERIV(V + dt/2 k1V, h + dt/2 k1H)
    k3 = DERIV(V + dt/2 k2V, h + dt/2 k2H)
    k4 = DERIV(V + dt   k3V, h + dt   k3H)
    V := V + (dt/6)(k1V + 2 k2V + 2 k3V + k4V)      A +5 half-adjusts before the rescale
    h := h + (dt/6)(k1H + 2 k2H + 2 k3H + k4H)
```

295 instructions and 123,499.5 µs per step, 44 multiplies, **0 divides** (§5.10). `dt/2`
and `dt/6` are formed once in init (§6.3), which is why there is no divide here.

### 6.6 The derived quantities and the two peak trackers

100 instructions, 41,424 µs, 14 multiplies per printed row (§5.10): `V A-E` from eq.13,
`DIFF`, `DECEL`, `DYN PRESS`, `LOG10 RHO-R`, the DKR heat rate, the heat-load trapezoid, `RANGE`,
and the two peak trackers (maximum deceleration and maximum heat rate, each carrying its row's
`t`, `h` and `V` for §7.7's summary block).

The heating goes through logs, not through a `u^3.15` table — IBM's own documented rule, `A**B` from
`EXP(B*ALOG(A))` (C28-0328-3 p.10, `[verified]`), which §4.3 and §5.7 derive and price:

```
    log10 q-dot = CQ - (1/2) C2 h - 3.15 K log10(e) X          X = 10^(-C2 h)
    q-dot       = ANTLOG(log10 q-dot)
```

Two multiplies and one `ANTLOG` call, no square root anywhere, and 1,110 positions of table removed.
`HEATING_USES_THE_CLOSED_FORM_LOG_OF_V`, `[likely]`, §15 row 8.

The sign is stamped with `MLZS` and tested with **`BZN target,FIELD,B`** — "Branch if Zone Equal B",
d = `K` (`src/core/isa/dmods.ts:214`), and minus is the B bit alone (A22-0526-3 p.16 Fig.11).
**`BZN target,FIELD,-` does not assemble**: measured this session, `d-modifier "-" is not defined for
BZN — the defined ones are AB B A 1 2 3 K S C L T`. The third operand is op `V`'s ZONE WORD
(`V_ZONE_WORD_IS_THE_THIRD_OPERAND`, `src/asm/mnemonics.ts:70-77`), not a raw d, and the three legal
words are `AB`, `B` and `A`. §2.3 carries the corrected spelling.

### 6.7 The print block

**32 instructions, 4,619.25 µs** (§5.10, where the block is itemised statement by statement), and
it is `demos/sales-summary.asm:214-231`'s
shape — cards `03160`-`03330`, quoted here by **file line**, not by card sequence number — with
twelve fields instead of five:

```
01xxxDTLOUT    CS   PLINE+131           B = 32, CLEARS 08731 DOWN TO 08700
01xxx          CS   PLINE+99            B = 100, CLEARS 08699 DOWN TO 08600
01xxx          MLCWA WTIME,PLINE+18
01xxx          MCE  T,PLINE+18          FIELD END 019
01xxx          MLCWA WALT,PLINE+28
01xxx          MCE  H-1,PLINE+28        FIELD END 029
   ...                                  ten more, the map in 7.2
01xxx          MLCA KGAM,PLINE+65       FIELD END 066 -- GAMMA IS A LITERAL
01xxx          W1   PLINE
01xxx          BA1  *+1
01xxx          BCV1 Z001                LATCH OF BEFORE MOTION
01xxx          B    Z002
01xxxZ001      MLCS ONE,OFIND
01xxxZ002      CC1  /                   SPACE 1 AFTER PRINT
01xxx          BA1  *+1
```

Three things in that block are load-bearing and each is measured:

- **Two `CS`, not one, and one is not merely inconvenient but impossible.** Clear Storage clears
  from its B address down to the hundreds boundary below it, and `clearToBoundary`
  (`src/core/isa/exec/wordmark.ts:81-85`) sets the timing formula's `B` term to `(from % 100) + 1` —
  so **no single `CS` can carry a B above 100**, and a 132-position area spanning two hundreds needs
  two whatever a builder would prefer. §5.10 costs them at their real terms, **B = 32 (175.5 µs) and
  B = 100 (481.5 µs) = 657 µs**, and withdraws the `tClearStorage(6,132)` = 625.5 µs row an earlier
  draft used for both. This is why `PLINE` sits on the boundary 08600 (§5.11).
- **`PLINE+n` is print position `n+1`.** `demos/sales-summary.asm:96` — `MLCA K003,PLINE+14`
  with the comment `FIELD END 015`. §7.2's end positions map to `PLINE+(end-1)` and every one of
  them is written out there.
- **`BCV1` catches the overflow latch BEFORE the carriage moves**, and only after a detail or total
  line, never after a heading line (§2.3). It is what turns form 1 into form 2 (§7.1).

### 6.8 The punch block

**15 instructions, 2,263.5 µs** (§5.10). It is §8.2's, in full, and it is written there
because the card contract and the RPG job that reads it are one artifact. The count is `CS` +
`MLCA` + **11** `MLC` + `P1` + `BA1`; the fourteen an earlier draft printed left out the `MLCA` that
puts the record code in column 1, and its µs costed the `CS` at a `PLINE`-sized B = 32 rather than
at `PAREA`'s **B = 80**.

### 6.9 Loop control, and the two guards

```
01xxxSTEP      ...                      RK4, DERIVED QUANTITIES, PRINT, PUNCH
01xxx          A    KDT,T               T := T + DT   (S=2 BOTH)
01xxx          BZN  DONEH,H,B           H WENT MINUS -- THE H NOT ABOVE ZERO GUARD
01xxx          C    H,KZERO
01xxx          BE   DONEH               H IS EXACTLY ZERO
01xxx          B    STEP
01xxxDONEH     ...                      SUMMARY BLOCK, 7.7
```

**The `h ≤ 0` guard** is a run-time refusal, not a step counter. §7.1: the 92nd printed
row is t = 22.75 s at h = 198.8 ft and the 93rd step lands at **h = −62.2 ft**; `ALTITUDE` is an
unsigned six-digit field under a comma edit word, so without the guard the last row prints a negative
altitude through an unsigned edit — the defect the panel measured against paper-first (its own step
91 at −322 ft with V = 2,001 ft/s). The guard is tested on the sign zone, which is why §6.6's
`BZN … ,B` spelling matters here too.

**The `y1 > 0` guard** is checked once, in init, against the case card and before any printing:

```
    y1 = (1/beta) ln(2K)        eqs.16-17 apply only when y1 is positive
                                (avco-and-reentry.md:152 and :368, [verified])
```

§4.6: y₁ ≤ 0 when K ≤ 0.5, i.e. β_B ≥ 149.60 slug/ft², i.e. **W/(C_D A) ≥ 4,813 lb/ft²**
on the case card; at W/(C_D A) = 5,000 the closed form gives y₁ = −838 ft. The deck's response is
to print the trajectory as usual and to **suppress the `NACA 1381 EQ 17 / EQ 15 / EQ 16` figures
from §7.7's summary block, replacing them with one printed line saying the closed forms do not
apply at this ballistic coefficient**. It is the one input a user-supplied case card can silently
use to invalidate two of the four checkpoints, and 5,000 lb/ft² is §13 criterion 11's test case.

The page counter and the loop's own compare-and-branch are the remaining 25 instructions of
§6.13's loop-control block. The `BCV1` arm itself is inside the **print** block (§6.7, §5.10),
because it is written between the `W1` and the `CC1` that follow it.

### 6.10 The summary block and the halt

**Seven printed lines** and the halt (§6.13: 48 instructions for the block, 5 for the halt and
misc). The text and the values are §7.7's; the last instruction of the deck is

```
01xxx          H                        END OF RUN -- THE 1415 TYPES S
```

and it is the whole reason DEFERRED-01 is this phase's entry condition (§9). Verified this session
on the skeleton: driven through `machine.start()` the run ends `stop = 'halt'` with console ids
`D,D,S,A,S` — the trailing `S` there is the `setMode('run')` turn, and the halt types **nothing**
today. §9 makes it type one.

### 6.11 The reserved areas, in address order

`ORG` places them above the code, per §2.3 and Phase 5 §8.1, at the addresses §5.11's map fixes. The
order below is the one the assembler accepts with **zero warnings** — verified this session by
building the same deck with and without each slack position:

```
01xxx          ORG  *+1                 07000 -- THE SLACK THE LITERAL RUN-S GM-WM HITS
01xxx CDIN     DA   1X80                THE CASE CARD, COLUMN 7 -- HIGH ORDER
01xxxCREC           1
01xxxCVE            9
01xxxCGAM           15
01xxxCSIN           23
01xxxCCOT           31
01xxxCLV            39
01xxxCWCD           47
01xxxCRN            53
01xxxCLRN           61
01xxxCHE            68
01xxxCTOP           75
01xxxCDT            79
   ...                                  the RK4 stages and the work areas -- EVERY ONE
                                        A DCW OF ZEROS, NEVER A DS.  SEE 5.5
01xxxH         DCW  @00000000@          ALTITUDE, FT, S=1
01xxxV         DCW  @00000000@          SPEED, FT PER SEC, S=2
01xxxPROD      DCW  @00000000000000000@ 17 POSITIONS -- 5.4
01xxxARGF1     DCW  @00000@             THE INDEX IMAGE -- 6.4
   ...                                  the rest of the 391 positions, 5.11
01xxx          ORG  *+1                 07479 -- THE SLACK THE WORK RUN-S GM-WM HITS
01xxx          ORG  07480
01xxxANTA      DCW  @1000000000@        6.2 -- 100 CONTIGUOUS TEN-POSITION ENTRIES
   ...
01xxx          ORG  *+1                 08480 -- THE SLACK THE ANTA RUN-S GM-WM HITS
01xxx          ORG  08500               HUNDREDS BOUNDARY FOR CS PAREA+79
01xxx PAREA    DS   80                  THE PUNCH CARD IMAGE -- 8.2
01xxxPAGM      DC   @⧧@                 MARKED AT RUN TIME BY SW -- 8.1
01xxx          ORG  08600               HUNDREDS BOUNDARY FOR CS PLINE+99
01xxx PLINE    DS   132
01xxxPLGM      DC   @⧧@                 MARKED AT RUN TIME BY SW
01xxx          END  START
```

`CDIN` sits **below** `ANTA`, in the work block, and that placement is not cosmetic: with `CDIN`
immediately above the table the `ANTA` run's terminating GM-WM lands on `CDIN`'s high-order position
— the assembler's own warning, reproduced this session — and a group mark there would make
`R1 0,CDIN` transfer nothing. §5.11's map carries the reconciled addresses and the **three** slack
positions, at 07000, 07479 and 08480.

**The work block is `DCW` data, and the slack at 07479 is what that costs.** §5.5 is the rule and
`demos/sales-summary.asm:17-32` is the shipped precedent: a `DS` emits nothing and arrives blank
**and unmarked** (`src/asm/emit.ts:565`; `software.md:112`, C28-0326-2 p.30), and every arithmetic
statement here takes its length from its B field's word mark (`src/core/alu.ts:290-291`), so a
`DS`-declared `H`, `T`, `W1` or `PROD` runs left into whatever the loader last left there. Declared
as `DCW`s the work fields **emit**, so their run has a terminating group-mark-with-word-mark of its
own, and §6.0 rule 3 requires it to land on nothing — hence the `ORG *+1` at 07479, immediately
under `ANTA`'s `ORG 07480`. `CDIN` is a `DA` whose sub-entries are bare-`lo` and emits **nothing** (§5.5) — no marked blank per sub-entry in its own
object record; `PLINE` and `PAREA` are the only two `DS` areas left in the deck, and neither is ever
an arithmetic target.

The `DA` sub-entry numbers are the field's **end** column within the area —
`demos/sales-summary.asm:260-264`'s form, which is cards `03620`-`03660` and is quoted here by
**file line** (`CDIN DA 1X80` at line 260, then `C001 1`, `C003 3`, `C006 6`, `C014 14`),
and `MLC C006,DEPT` moves a three-position field ending at column 6. §6.12's table gives the case
card's end columns; the twelve sub-entries above are those columns.

**`PAREA` needs one `CS` and therefore one boundary rule**, which the explicit `ORG 08500` above
satisfies: `CS PAREA+79` clears from `PAREA+79` down to the hundreds boundary below it, which covers
all 80 positions **only if the area's low end is at or above that boundary**. At 08500-08579 the
single `CS` clears 08579 down to 08500 — the area exactly, B = 80, 391.5 µs (§5.10). A `PAREA`
placed by a bare `ORG *+1` after `ANTA` would start at 08481 and straddle 08500, and its `CS` would
clear only the 61 positions above the boundary and leave the previous card's low 19 columns standing —
which is why §5.11 spends **20** positions of slack to get to 08500 rather than letting the assembler
choose. The punch probe punched its card with `PAREA` placed by a bare `ORG *+1`, at a smaller
address where it happened not to straddle; the shipped deck does not rely on that.

### 6.12 The case card — `demos/reentry.case.cards`, one card

`CASE_CARD_CARRIES_DERIVED_TRIG_AND_LOGS_AND_THE_DECK_CHECKS_THEM` — `[unverified]`, ours, §15
row 15. Eighty columns, one card, read by `R1 0,CDIN`:

| cols | field | digits · S | punched for this run |
|---|---|---|---|
| 1 | record code `C` | 1 alphameric | `C` |
| 2–9 | V-E, ft/s | 8 · S=2 | `02300000` |
| 10–15 | GAMMA-E, **printed text** | 6 alphameric | `-30.00` |
| 16–23 | SIN GAMMA-E | 8 · S=7, signed | `05000000` minus |
| 24–31 | COT GAMMA-E | 8 · S=7 | `17320508` |
| 32–39 | LOG10 V-E | 8 · S=7 | `43617278` |
| 40–47 | W/(CD A), lb/ft² | 8 · S=2 | `00100000` |
| 48–53 | R-NOSE, ft | 6 · S=4 | `010000` |
| 54–61 | LOG10 R-NOSE | 8 · S=7, signed | `00000000` |
| 62–68 | ALTITUDE-E, ft | 7 · S=0 | `0400000` |
| 69–75 | BAND TOP, ft | 7 · S=0 | `0150000` |
| 76–79 | DT, s | 4 · S=4 | `2500` |
| 80 | blank | | |

Two notes belong with it:

- **It is the first data card behind the execute card**, and `demos/reentry.cards` is the
  concatenation — object deck, execute card, case card — exactly as `demos/hello-dad.cards` is the
  object deck followed by its five data cards (read this session: 6 lines, the last five being the
  data). The 1402's trailing-card rule is satisfied the way `tools/run-deck.ts:84-88` does it,
  READER START then END OF FILE, citing `software.md` §10.7.
- **`GAMMA-E` is punched as the six printed characters `-30.00`**, not as a number, because column 6
  of the page is that literal moved by one `MLCA` (§7.2). The trigonometry the deck actually
  computes with is `SIN` and `COT`, punched separately and cross-checked against each other (§6.3).

The card, re-punched from the field table above and laid against an **80-column** ruler. Column 80 is
blank, so the line below is 79 printable characters and the ruler is 80:

```
C02300000-30.000500000017320508436172780010000001000000000000040000001500002500
12345678901234567890123456789012345678901234567890123456789012345678901234567890
         1         2         3         4         5         6         7         8
```

*(Column 80 is the blank the table reserves, so the card's last punched character is the `0` of `DT`
in column 79. An earlier draft of this section printed an **81-character** line, with a stray blank
before the last digit and an 81-column ruler under it, and punched `V-E` as `00230000` — which at
8 digits and S = 2 is **2,300.00 ft/s**, not 23,000.00. That card cannot pass §6.3's own check 2:
cols 32-39 punch `LOG10 V-E` = 4.3617278 = log₁₀ 23,000, and `antilog(LOG10 V-E)` against a `V-E` of
2,300.00 disagrees by a factor of ten and halts the deck on its own case card. The tail was wrong the
same way — three extra zeros between `LOG10 R-NOSE` and `ALTITUDE-E` pushed `ALTITUDE-E` to `0004000`
(4,000 ft), `BAND TOP` to `0001500` (1,500 ft) and `DT` to `0025` (0.0025 s). The line above is the
concatenation of the twelve field values in the table, checked to 80.)*

### 6.13 Size — source cards, instructions, positions, object cards, hopper

**Instructions: 486**, block by block; at Phase 6's own move-heavy mix of **10.1 positions per
instruction** (§5.11, against the measured whole-program 9.32 and the `{6,7,11,12}` subset's 9.87)
that is 4,908.6 positions, which is why §5.11's map spends 4,910. This table is the authoritative copy of
the estimate; §5.11 and §11 cite it.

| block | instructions |
|---|---|
| init: card read, extraction, the 12 derived constants and `V0` (§6.3), the two card checks | 70 |
| `ANTLOG` subroutine | 25 |
| `DERIV` subroutine | 35 |
| RK4 driver (4 call sites, 6 stage arguments, 2 combinations, loop) | 67 |
| derived quantities + peak trackers | 50 |
| print block (§6.7's list in full — 11 `MLCWA`+`MCE` pairs, the `GAMMA` `MLCA`, the `BCV1` arm) | **32** |
| punch block (§8.2's list in full — `CS`, `MLCA`, 11 `MLC`, `P1`, `BA1`) | **15** |
| form-1 heading routine (8 lines + 3 column-heading lines) | 74 |
| overflow heading routine (2 + 3 lines) | 40 |
| summary block (**7** printed lines) | 48 |
| loop control, the `h ≤ 0` guard, the `y1 > 0` guard, page counter | 25 |
| halt and misc | 5 |
| **total** | **486** |

*(The summary block prints seven lines, not the six the panel's sheet labelled it; 48 instructions
for seven printed lines is 6.9 each, the same rate as the form-1 heading routine's 74 for eleven.
The instruction count does not move for that. It **does** move by two for the two output blocks: the
print block is 32 statements and not 31, and the punch block 15 and not 14, both re-derived from the
listings §6.7 and §8.2 print — see §5.10. 484 becomes 486, the code block 4,890 becomes 4,908.6, and
§5.11's map allocation 4,900 becomes 4,910.)*

**Source cards, summed:**

| block | cards | the wave that lands it |
|---|---|---|
| `AUTOCODER RUN`, `JOB`, `CTL`, `LOAD`, two `ORG`, `END` | 7 | 3 |
| the comment block of §6.1 and the section-divider comments | 68 | 3 |
| numeric constants, derived constants, **eleven detail and eight heading MCE words**, `GAMMA`, `KBIAS` | 55 | 3 |
| `ANTA` | 100 | 3 |
| reserved areas, the twelve `CDIN` `DA` sub-entries, and **the ~40 work-field `DCW` cards of §5.5** | 58 | 3 |
| imperative statements — init, `ANTLOG`, `DERIV`, RK4, derived, guards, loop, halt, the four-column dump | 308 | 3 |
| printed literals (§7.9's ≈1,146 positions) | 40 | 4 |
| imperative statements — heading routine, twelve columns, overflow, summary | 162 | 4 |
| `PAREA`, `PAGM` and the punch block | 20 | 5 |
| **total** | **818** | |

**≈820** is the figure §1 step 2 and §3 use — wave 3 **≈596** (7 + 68 + 55 + 100 + 58 + 308, the
table's own sum), wave 4 **≈202** (40 + 162), wave 5 **≈20**, and 596 + 202 + 20 = 818 — and the wave
that lands each part records the real number, per §3's own rule.

*(The reserved-area row was **18** and the total **778** while the work areas were `DS` reservations
that fit on a handful of cards. §5.5 makes every one of them a `DCW` of zeros on
`demos/sales-summary.asm:17-32`'s precedent, which is roughly forty more source cards — one per
named field — and it is the honest cost of a work block that arrives word-marked. §1 step 2's ≈780
becomes **≈820** with it.)*

**Emitted positions and the object deck.** Code 4,910 + constants 440 + literals 1,150 +
`ANTA` **1,000** (not 800 — §6.2: the ten-position entry is emitted whole) + **the work areas 391**
(§5.5: `DCW`s of zeros, not `DS` reservations, so they emit) = **7,891**, taken from
§5.11's map allocations rather than from §7.9's budget so that one figure governs both. At §5.11's
measured **52.13 payload positions per condensed card**:

```
  7,891 / 52.13  =  152 condensed object cards   (151.37, rounded up)
                 +   2 one-position records, PAGM and PLGM, each at its own ORG
                 = 154 condensed object cards
                 +   1 loader bootstrap card
                 +   1 loader body card
                 +   1 execute card
                 +   1 case card
                 = 158 cards in the hopper
```

**This is the plan's only home for 154 / 158, and it is an estimate.** It descends from 486 estimated
instructions at an estimated 10.1 positions each; §10.3 and §13 criterion 18 assert
`assemble(demos/reentry.asm).deck.records.length + 4` against the number waves 3 and 5 record in
`docs/BUILD-LOG-6.md`, never against the figure above.

*(**7,500 / 144 / 148 is withdrawn**, and so is §6.4's announced 7,505: both booked the work block as
`DS` reservations that emit nothing. They are `DCW`s — §5.5's rule, `src/asm/emit.ts:565` and
`src/core/alu.ts:290-291` behind it, `demos/sales-summary.asm:17-32` as the shipped precedent — so
their 391 positions emit and `ARGF1`'s five are inside them. `CDIN`'s twelve bare-`lo` `DA`
sub-entries emit nothing (§5.5), so no twelve marked blanks are booked; the two one-position
group-mark records, `PAGM` and `PLGM`, are, and they are the +2 above.)*

(The skeleton measured 49.11 payload positions per card over 35 cards, and the `ANTA`-only build 52.6
over 19; small decks carry proportionally more record boundaries. The design uses 52.13 and the band
is 49–53.)

### 6.14 What was proved this session, and what was not

| claim | how |
|---|---|
| every statement form in §6 assembles clean | 41 statements through `assemble()`, all `ok`, 0 flagged |
| `BZN … ,-` does **not** assemble; `BZN … ,B` does | the flag text quoted in §6.6 |
| the indexed antilog fetch returns 10^0.50 | run on the emulated machine, `MANT = 31622776`, the top eight of `3162277660` |
| `MLC` into an index register is wrong; `MLCWA` is right | run; `MLC` left `81$00` and the next reference address-checked |
| `ORG *+2` between table entries costs 81 extra object cards | two builds through `assemble()`, 100 records against 19 |
| the reserved-area slack rule | three builds; the warning text quoted in §6.0 |
| the whole skeleton — read, fetch, head, print twelve columns, punch, halt | one run; 312 instructions, 0 flagged, 0 warnings, high-water 08,632 **at the skeleton's own `ORG 08500` for `PLINE`** (§5.11's map moves the shipped deck's to 08600 and its high-water to 08,732), pocket 0 holding one card |
| **not proved**: the integration itself, the scaling table in fixed point, the 92-row page | waves 1-4; §11 |

---

## 7. The page

*The column map, the heading block, the framing lines, the mock, and the rule that keeps every
printed character on chain A.* **Every cell of the mock below was produced by the shipped MCE
executor this session** — `src/core/edit.ts`, driven through `Machine.step()` on a real `E`
instruction with a real A field and a real control word — not by hand arithmetic, and every printed
value in it is the **primary** ANTA-only simulator's (§5.6), not the two-level fallback's. The column
map is committed to `docs/BUILD-LOG-6.md` **before** the golden, Phase 5 §10.5's discipline
(§11 wave 4).

### 7.1 Rows, forms and dt are one artifact

Settled together, because the column map and the pagination are one artifact (RULINGS §B 8). This
subsection is the authoritative copy; §1, §5.10, §11, §12 and §13 cite it.

| quantity | value | how it was fixed |
|---|---|---|
| **dt** | **0.25 s** | RULINGS §B 8's own figure; RK4's method error at this step is 6.463e-4 ft/s (§4.5) — three orders inside the fixed-point error the DIFF column measures |
| **the band top** | **150,000 ft**, and `V` there is **22,939.54 ft/s** | `// OPEN: THE_BAND_STARTS_AT_150000_FT` — a ruling, §15 row 10; h_E = 400,000 ft stays on the case card and is echoed, and the heading prints `TABULATED FROM 150,000. FT`. The band top is a **state** and the run starts on eq.13's curve, not at V_E (§4.1) |
| **printed rows** | **92** | t = 0.00 … 22.75 s, h = 150,000 → **198.8 ft**. The 93rd step lands at h = −62.2 ft and the `h ≤ 0` guard refuses it (§6.9) |
| **inked forms** | **3** | below |
| **form-1 heading block** | **11 lines** — 8 printed and 3 blanks | below |
| **column-heading group** | **3 printed lines + 1 blank** | twelve columns need three heading lines to carry the units |
| **overflow heading** | **7 lines** — title, condensed framing, blank, 3 column-heading lines, blank; 5 printed | below |
| **summary block** | **7 printed lines** on form 3 | §7.7 |
| **1403 lines printed** | **117** | 92 detail + 11 (form 1's heading block and column headings) + 5 (form 2's overflow heading) + 2 (form 3's title and framing) + 7 (the summary) — blanks are carriage motion, not print operations |

```
FORM 1  (channel 1 at paper line 1)          FORM 2                        FORM 3
  1  title and PAGE   1                        1  title and PAGE   2         1  title and PAGE   3
  2  (blank)                                   2  condensed framing line     2  condensed framing
  3  ENTRY        line                         3  (blank)                    3  (blank)
  4  VEHICLE      line                         4  column heading 1           4  SUMMARY
  5  ATMOSPHERE   line                         5  column heading 2           5  (blank)
  6  INTEGRATION  line                         6  column heading 3           6  MAXIMUM DECELERATION
  7  (blank)                                   7  (blank)                    7  NACA 1381 EQ 17/15/16
  8  RECONSTRUCTION line 1                     8..54  detail, 47 rows        8  MAXIMUM HEAT RATE
  9  RECONSTRUCTION line 2                                                   9  TOTAL HEAT LOAD
 10  GRAVITY IS NOT MODELLED                   [ programmed CC1 1 after     10  MAXIMUM DIFFERENCE
 11  (blank)                                     the 92nd row ]             11  (blank)
 12  column heading 1                                                       12  END OF RUN
 13  column heading 2
 14  column heading 3
 15  (blank)
 16..60  detail, 45 rows
 [ channel 12 at line 60 sets the overflow latch; BCV1 catches it ]
```

45 + 47 = **92**. **Form 1 to form 2 is the channel-12 overflow path; form 2 to form 3 is a
programmed `CC1 1`.** Two different mechanisms, both exercised, and `BUILD-LOG-4.md:420-425`'s
carriage-straddle expectation met. `DEFAULT_CARRIAGE_TAPE` — 66 form lines, channel 1 at 1, 9 at 57,
12 at 60 — `src/core/devices/printer1403.ts:212-218`, `[unverified]` as a punching and `[verified]`
as a mechanism (§15 row 21). Measured against the shipped `sales-summary` golden: a detail line may
print through paper line 60, and the overflow heading opens the next form at paper line 1.

### 7.2 The column map — twelve columns on 132 positions

Left margin 13 (positions 1-13), content 14-119, right margin 120-132. Widths sum **73**; eleven
gutters of 3 sum **33**; 13 + 73 + 33 + 13 = **132**, and the 132 is `[verified]` from
**A22-1407-2 pp.5-8** via `avco-and-reentry.md` §3 and §9 — not from `PRINT_POSITIONS`
(`src/ui/period/paper/page.ts:55`), per RULINGS §E 29.

| # | column | unit | start-**end** | w | MCE B-address | **control word** | A field handed to MCE | the bound that sets the digits |
|---|---|---|---|---|---|---|---|---|
| 1 | TIME | SEC | 14-**19** | 6 | `PLINE+18` | `@ 0 .  @` | `T`, 5 digits S=2 | exact: t = n·dt |
| 2 | ALTITUDE | FT | 23-**29** | 7 | `PLINE+28` | `@   ,  0@` | `H-1`, 7 digits S=0 | 1 ft = 6.7e-6 of h₀; layer 3 deviates ≤ 1 unit |
| 3 | VELOCITY | FT/SEC | 33-**38** | 6 | `PLINE+37` | `@  ,  0@` | `V-2`, 6 digits S=0 | 1 ft/s = 4.4e-5 relative; antilog bound 2.0e-6 |
| 4 | V A-E | FT/SEC | 42-**47** | 6 | `PLINE+46` | `@  ,  0@` | `VAE-2`, 6 digits S=0 | same |
| 5 | DIFF | FT/SEC | 51-**57** | 7 | `PLINE+56` | `@ 0 .  -@` | `DIF`, 8 digits S=2, signed | it IS the machine's error; §4.5's on-page identity |
| 6 | GAMMA | DEG | 61-**66** | 6 | `PLINE+65` | none — `MLCA KGAM,PLINE+65` | a 6-character literal from case-card cols 10-15 | not a number on this page |
| 7 | DECEL | G | 70-**74** | 5 | `PLINE+73` | `@ 0 . @` | `DG`, 8 digits S=1 | 0.1 g = 1.5e-3 relative at the peak; layer 3 deviates 0 |
| 8 | DYN PRESS | LB/FT2 | 78-**83** | 6 | `PLINE+82` | `@  ,  0@` | `QB-1`, 7 digits S=0 | 1 lb/ft² at 68,681 = **1.456e-5** — the **tightest** column on the page |
| 9 | LOG10 RHO-R | — | 87-**92** | 6 | `PLINE+91` | `@- .   @` | **`PL10`, exactly 4 digits S=3, signed** | exact: C1 − C2·h, no antilog in the path |
| 10 | HEAT RATE | BTU/FT2-SEC | 96-**102** | 7 | `PLINE+101` | `@ ,  0. @` | `QD-1`, 7 digits S=1 | 0.1 = 4.5e-5 at the peak; DKR's ±10-20 PCT printed beside it |
| 11 | HEAT LOAD | BTU/FT2 | 106-**111** | 6 | `PLINE+110` | `@  , 0 @` | `QTOT-2`, 6 digits S=0 | 1 = 5.1e-5 relative |
| 12 | RANGE | N MI | 115-**119** | 5 | `PLINE+118` | `@ 0 . @` | `RNG-1`, 7 digits S=1 | exact: (h₀ − h)·cot γ/6076.1 |

**Zarathustrum's decision 4, priced — twelve columns or eleven live ones.** RULINGS §B 9 rules twelve, with
`GAMMA` kept as a **constant** column and MACH refused, and offers *"eleven live columns instead —
changes the column map only"*. The default here is the twelve above. The alternative drops column 6:
`GAMMA` is the only cell on the page that is neither computed nor a heading, and an analyst who knows
the run is constant-γ does not need it printed 92 times. Its price is exactly what the ruling says
and nothing more — no scaling row, no reference layer, no arithmetic. What does move: widths fall
**73 → 67**, the gutter count **11 → 10**, and 13 + 67 + 30 + 13 = 123, so six positions have to go
somewhere — either three-position gutters become four across the wider half, or the two margins grow
— and every end position from column 7 rightward re-flows. That re-cuts §7.5's three heading lines,
`test/golden/reentry.page.txt`, and every parse position in `test/reentry-page-parse.test.ts`: one
wave-4 commit. The reason the orchestrator recommends keeping it is §4.1 property 4 — a constant
`-30.00` on every row is the loudest available disclosure of the model's central assumption, and
without it that assumption lives only in the framing line. It is Zarathustrum's word either way, and it must
be his **before** wave 4 cuts the map (§11.4).

`// OPEN: COLUMN_LAYOUT_IS_PERIOD_PLAUSIBLE_NOT_DOCUMENTED` — `[unverified]`, §15 row 1: the column
**set** is constrained by the physics, the **layout** is ours, and `avco-and-reentry.md` §9 says so in
those words. Gutter arithmetic, checked position by position: col 2 starts at 23 = 19 + 3 + 1, col 3
at 33 = 29 + 3 + 1, and so on to col 12 at 115 = 111 + 3 + 1, ending at 119. Widths 6+7+6+6+7+6+5+6+6+7+6+5
= 73. Every control-word character — blank, `0`, `.`, `,`, `-` — is on chain A (§7.8). The `FIELD-n`
sub-field notation is `demos/sales-summary.asm:222`'s (`MCE COMM-2,PLINE+56`, card `03240`): it drops
the low-order `n` digits and lowers S by `n`, which is how columns 2, 3, 4, 8, 10 and 11 print
integers out of scaled fields **and** keep their commas (mechanism 2 below).

**It drops them; it does not round them, and eight printed columns are therefore truncated.**
`src/core/edit.ts` is a pure character edit — it places exactly the digits handed to it and contains
no rounding of any kind — and the source of a `FIELD-n` read is the field the arithmetic owns:
half-adjusting `V` or `H` before the print would move the trajectory rather than the printout.
Columns 2, 3, 4, 8, 10, 11 and 12 truncate through their `FIELD-n` sub-field, **and column 9
truncates too** — its four-digit `PL10` copy is cut out of `L10R` by an `MLC`, and an `MLC`
half-adjusts nothing (mechanism 3 below). Only columns 1, 5 and 7 are fed a whole field and print
every digit they carry.
§7.6's cells are the truncated ones and §4.5's one-unit rule is stated against them. The alternative —
a half-adjusted print copy per column, `MLC <fld>,<Pfld>` then `A +5,<Pfld>-(n-1)` — is **14 more
statements and 56 more positions of work area** for the seven `FIELD-n` columns, against a work block
with seven spare (§5.11), plus one more `A +5` for column 9, which has its print copy already; and
this plan does not spend them on rounding a column the machine has no reason to round.

**Six of the twelve control words differ from the panel's sheet, and the difference is not
cosmetic** — its words do not produce its own mock. Measured, each against the shipped executor:

| column | the sheet's word | what it prints at the value the sheet shows | this plan's word | what it prints |
|---|---|---|---|---|
| 1 TIME | `@  0.  @` | `   .00` at t = 0.00 | `@ 0 .  @` | `  0.00` |
| 5 DIFF | `@  0.  -@` | `   .00 ` at 0.00 | `@ 0 .  -@` | `  0.00 ` |
| 7 DECEL | `@  0. @` | `   .9` at 0.9 g | `@ 0 . @` | `  1.0` |
| 9 LOG10 RHO-R | `@-0.   @` | works only by an `[unverified]` latch rule — below | `@- .   @` | `-2.805` / ` 0.151` — over `PL10`'s **truncated** four digits, mechanism 3 |
| 10 HEAT RATE | `@ ,  0. @` with a 5-digit A field | `2 227.4` — **the comma is blanked** | same word, `QD-1`'s 7-digit A field | `2,227.4` |
| 11 HEAT LOAD | `@  ,  0@` | `      ` at 0 — the whole field blank | `@  , 0 @` | `     0` |

The three mechanisms behind those, all read out of `src/core/edit.ts` and all confirmed by running
the instruction:

1. **The zero-suppression code is itself suppressible.** The rule — "the RIGHTMOST `0` in the
   control field marks the rightmost limit of suppression" (`edit.ts:296-311`) — means the code
   position is blanked when its own digit is zero. To protect the integer units digit the code goes
   **one position to its left**, which is the only difference between `@  0.  @` and `@ 0 .  @`.
   That is why TIME prints `0.00` and not `.00`, and why `HEAT LOAD` prints `0` at the first row
   rather than nothing.
2. **A comma is blanked when the A-field word mark has already been sensed** — `edit.ts:325-331`,
   A22-0526-3 p.31: *"When the A-field word mark is sensed, the remaining commas in the B-field are
   set to blanks."* The A-cycle is folded in at the **top** of every B-cycle whenever the register is
   empty (`edit.ts:225-262`), so the word mark is sensed one B-cycle EARLY — at the comma itself when
   exactly one data position remains to its left. Handing the edit an A field **longer than the
   control word's body** stops the word mark being sensed at all ("other A-field characters are not
   processed after the B-channel word mark is detected") and the comma survives. This is why columns
   2, 3, 4, 8, 10 and 11 are all fed `FIELD-n` sub-fields with at least one digit to spare, exactly
   as `demos/sales-summary.asm:222` feeds `MCE COMM-2,PLINE+56`.
3. **The leading minus needs the opposite.** Column 9's `-` is the high-order status position, and
   it is only blanked on a plus sign when the body latch is already off — i.e. when the A-field word
   mark HAS been sensed (`edit.ts:267-283`, `signControlLeft`). Measured: with a long A field,
   `@- .   @` on a **positive** value prints `-0.151` — a false minus sign on a positive number. So
   column 9's A field must be **exactly four digits**, which is why `PL10` is a separate four-digit
   print field (§5.2). **It costs TWO preparatory statements, not one, and an earlier draft of this
   paragraph got both of them wrong:**

   ```
   01xxx          MLC  L10R-3,PL10        4 DIGITS AT S=3 -- L10R IS S=6, SO N IS 3
   01xxx          MLZS L10R,PL10          CARRY THE SIGN ONTO THE UNITS POSITION
   ```

   **(a) The offset is 3, not 2.** `FIELD-n` drops the low-order `n` digits and lowers S by `n`
   (this section's own convention), and `L10R` is eight digits at S = 6, so S = 3 is `L10R-3`.
   `L10R-2` is S = 4: at L10R = −2.805631 the stored digits are `02805631`, a four-position `MLC`
   ending at `L10R-2` copies `8056`, and the edit prints **`8.056`**. `L10R-3` copies `2805` and
   prints `2.805`.
   **(b) The sign does not ride along with the digits.** `src/core/edit.ts:246` takes the A sign from
   the zone bits of the A field's **units position only** — `aSignMinus = (bcd & ZONES) === ZB` at
   `la === 0` — and neither sub-field contains `L10R`'s units position, where the zone lives. Run
   through the shipped executor on this plan's own control word: A = `2805` with a minus zone prints
   `-2.805`; A = `2805` unsigned prints ` 2.805`, the leading minus blanked — which is what column 9
   would print on 91 of the 92 rows without the second statement. `MLZS` is *Move Left Zones, Single
   Position* — zone bits only, one position (A22-0526-3 Fig.22 p.26 via `opcodes.md:289`,
   `[verified]`; present in `ALL_MNEMONICS`, checked this session) — and it is `pi.job`'s own
   sign-stamp idiom, `MLZS +0,BASET`.
   **(c) `PL10` therefore truncates**, because an `MLC` half-adjusts nothing and §5.1 rule 3 forbids
   an `A +5` on the print path. Column 9 is the **eighth** truncated column, and §7.6's LOG10 RHO-R
   cells are the truncated ones.
   **Where the two statements are booked:** inside §5.10's **derived-quantity** block — 100
   instructions and 41,424 µs for one printed row — which is where `L10R` is formed (§6.6). They are
   **not** in the print block, whose 32 statements and 4,619.25 µs are itemised statement by
   statement in §5.10 and reproduce exactly from that list; adding them there would have made the
   itemisation disagree with its own sum.

The sheet's `@-0.   @` happens to print `0.151` today, but only because the A word mark is
sensed on the code's own A-cycle so the suppress latch never arms — behaviour that hangs on
`MCE_EARLY_A_WM_ENDS_AT_SCAN_1` (`src/core/edit.ts:92-119`), an `[unverified]` `OPEN:` constant with
a live alternative reading (§15 row 29). `@- .   @` has **no `0` anywhere**, so it is a single-scan
edit under either reading and the plan does not spend an unverified constant on a printed column.
`// OPEN: MCE_LEADING_SIGN_COLUMN_TAKES_AN_EXACT_LENGTH_A_FIELD` — `[verified]` by measurement,
§15 row 27.

### 7.3 The heading block — eight printed lines

Chain-A-clean, exact-solution-first's form as RULINGS §B 10 requires, laid out from print position 14:

```
             BALLISTIC REENTRY TRAJECTORY                               PAGE   1
             ENTRY        VELOCITY  23,000. FT/SEC     ANGLE  -30.00 DEG     ALTITUDE  400,000. FT
             VEHICLE      W/CD A  1,000.0 LB/FT2      BETA SUB B  31.081 SLUG/FT2      NOSE RADIUS  1.00 FT      GENERIC
             ATMOSPHERE   RHO ZERO  .0034000 SLUG/FT3      SCALE HEIGHT  22,000. FT      NACA REPORT 1381 EQ 7
             INTEGRATION  RUNGE KUTTA 4TH ORDER      DT  .25 SEC      TABULATED FROM  150,000. FT
             RECONSTRUCTION - NOT FLIGHT DATA.  NO IBM 1410 IS DOCUMENTED AT ANY AVCO SITE.
             AVCO RAD WILMINGTON RAN AN IBM 704 FROM 1958.  THIS PAGE IS PERIOD PLAUSIBLE, NOT A RECORD OF ONE.
             GRAVITY IS NOT MODELLED.  THE RUN TRACKS NACA 1381 EQ 13 TO THE LAST PRINTED DIGIT, A REAL REENTRY TO A FEW PCT.
```

Line lengths, measured this session: **80, 98, 120, 110, 97, 91, 111, 125** — all inside 132, the
longest with seven positions to spare. `PAGE` is followed by `MCS PAGENO,PLINE+79`,
`demos/sales-summary.asm:167`'s idiom (card `02680`, `MCS PAGENO,PLINE+66  FIELD END 067, COL 47 Z`).

**Every number on lines 2, 3 and 5 is edited out of the case card's own fields, not written as a
literal.** `23,000.`, `-30.00`, `400,000.`, `1,000.0`, `31.081`, `1.00`, `.25` and `150,000.` are
`MCE`s of `VE`, `KGAM`, `CHE`, `WCD`, `BETAB`, `RN`, `DT` and `CTOP`. §13 criterion 13 decodes them
back out of the golden page and requires them to equal **the values on the case card** — the
"nobody ties the heading's printed values to the constants the run used" hole the panel found in all
three proposals. Lines 4, 6, 7 and 8 are pure literals: the atmosphere constants are the program's,
not the card's.

**`ENTRY VELOCITY 23,000. FT/SEC` and a first row that prints `22,939` are both correct, and the
page says why.** `23,000` is `V-E` at `ALTITUDE 400,000. FT`, both printed on line 2 off the card;
the table starts at `TABULATED FROM 150,000. FT` on line 5, where eq.13 puts the vehicle at
**22,939.54 ft/s** (§4.1). The three altitudes on the page — entry 400,000, tabulated-from 150,000,
and the first ALTITUDE cell — are what make the 60 ft/s difference readable rather than a defect, and
the walkthrough says it in one sentence. **Criterion 13 decodes `ENTRY VELOCITY` against the CARD's
`V-E`, never against the reference's initial `V`**: they are two different numbers by design, and a
criterion that compared them would fail on a correct page.

**`PCT`, not `%`.** `%` is on chain A (octal 34) but it is the slug that carries `(` on chain H, and
a page that reads differently under the A/H toggle is a page that says two things. Same reason the
deck writes `W/CD A` and not `W/(CD A)`.

### 7.4 The framing lines

Three of them, and they are lines 6, 7 and 8 above. RULINGS §B 7 requires the gravity line; the
STATEMENT requires the reconstruction pair. `// OPEN: NO_AVCO_1410_IS_DOCUMENTED` — `[verified]` as a
negative for the sources searched, §15 row 2 — is what they print, and it is the one finding in the
research that the artifact itself has to carry. Form 2 and form 3 carry a **condensed** single-line
version, 103 positions, so that every form of the page carries the disclaimer (RULINGS §C 13,
§13 criterion 12):

```
             RECONSTRUCTION - NOT FLIGHT DATA.  GRAVITY IS NOT MODELLED.  NO IBM 1410 AT ANY AVCO SITE.
```

### 7.5 The column headings — three lines

Twelve columns need three heading lines to carry the units. Right-aligned to §7.2's end positions:

```
               TIME  ALTITUDE VELOCITY    V A-E      DIFF    GAMMA   DECEL      DYN    LOG10      HEAT     HEAT   RANGE
                                                                              PRESS    RHO-R      RATE     LOAD
                SEC        FT   FT/SEC   FT/SEC    FT/SEC      DEG       G   LB/FT2        BTU/FT2-SEC  BTU/FT2    N MI
```

**Column 4 reads `V A-E`, never `V (A-E)`** — chain A carries no parenthesis (§7.8), and
`STATEMENT.md`'s own column table writes it the other way. `BTU/FT2-SEC` ends at 102 and starts at
92, which is column 9's last position; column 9 has no unit, so the two do not collide, and the
nearest live unit to its left (`LB/FT2`) ends at 83.

### 7.6 The mock of form 1

**Produced by the shipped MCE executor, cell by cell**, from the source-field values the primary
fixed-point simulator produces (§4.4 layer 3, §5.6's ANTA-only antilog, re-run this session). Ten of
the 92 rows; the ellipses are the rest. The two ruler lines are not printed. **All eleven detail
control words were re-run through the executor against these A fields and every one printed the glyphs
below** — column 6, `GAMMA`, is an `MLCA` of a literal and has no control word — the map is sound; what moved is the eleven **source values** the table after the mock names,
each re-derived under §5.1 rule 3's truncation.

```
         1         2         3         4         5         6         7         8         9        10        11        12        13
1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012

             BALLISTIC REENTRY TRAJECTORY                               PAGE   1

             ENTRY        VELOCITY  23,000. FT/SEC     ANGLE  -30.00 DEG     ALTITUDE  400,000. FT
             VEHICLE      W/CD A  1,000.0 LB/FT2      BETA SUB B  31.081 SLUG/FT2      NOSE RADIUS  1.00 FT      GENERIC
             ATMOSPHERE   RHO ZERO  .0034000 SLUG/FT3      SCALE HEIGHT  22,000. FT      NACA REPORT 1381 EQ 7
             INTEGRATION  RUNGE KUTTA 4TH ORDER      DT  .25 SEC      TABULATED FROM  150,000. FT

             RECONSTRUCTION - NOT FLIGHT DATA.  NO IBM 1410 IS DOCUMENTED AT ANY AVCO SITE.
             AVCO RAD WILMINGTON RAN AN IBM 704 FROM 1958.  THIS PAGE IS PERIOD PLAUSIBLE, NOT A RECORD OF ONE.
             GRAVITY IS NOT MODELLED.  THE RUN TRACKS NACA 1381 EQ 13 TO THE LAST PRINTED DIGIT, A REAL REENTRY TO A FEW PCT.

               TIME  ALTITUDE VELOCITY    V A-E      DIFF    GAMMA   DECEL      DYN    LOG10      HEAT     HEAT   RANGE
                                                                              PRESS    RHO-R      RATE     LOAD
                SEC        FT   FT/SEC   FT/SEC    FT/SEC      DEG       G   LB/FT2        BTU/FT2-SEC  BTU/FT2    N MI

               0.00   150,000   22,939   22,939     0.00    -30.00     1.0      978   -2.805     469.2        0     0.0
               0.25   147,133   22,931   22,931     0.00    -30.00     1.1    1,113   -2.749     500.2      121     0.8
               0.50   144,267   22,921   22,921     0.01    -30.00     1.3    1,267   -2.692     533.1      250     1.6
                ...
               8.25    58,869   19,488   19,488     0.00    -30.00    44.5   44,450   -1.006   2,227.4   11,017    25.9
                ...
              10.00    43,093   16,380   16,380     0.02-   -30.00    64.3   64,329   -0.695   1,844.4   14,674    30.4
              10.75    37,249   14,773   14,773     0.01-   -30.00    68.2   68,246   -0.579   1,521.5   15,939    32.1
              11.00    35,436   14,222   14,222     0.02-   -30.00    68.7   68,681   -0.544   1,406.5   16,305    32.6
              11.25    33,693   13,669   13,669     0.03-   -30.00    68.7   68,679   -0.509   1,291.6   16,643    33.1
              11.50    32,019   13,118   13,118     0.04-   -30.00    68.3   68,255   -0.476   1,178.6   16,951    33.6
                ...
              22.75       198    2,118    2,118     0.03-   -30.00     7.6    7,558    0.151       7.7   19,489    42.7
```

**Row 1 prints `22,939` under a heading that says `ENTRY VELOCITY 23,000. FT/SEC`, and that is
right.** The underlying value is `V0 = V_E e^(−K X₀) = 22,939.54 ft/s` (§4.1) — eq.13's own velocity
at the band top, 250,000 ft below the entry altitude the same heading line prints. The two numbers
are 60.46 ft/s apart because the vehicle has been decelerating for 250,000 ft, and §7.3 puts all
three altitudes on the page so a reader can see it. A run that started at 23,000 would print
`23,000` here and be **121× the published DIFF bound** wrong on every row afterwards.

**Every cell above is truncated, not rounded, and that is a property of the deck and not of the
mock.** Seven of the twelve columns are fed a `FIELD-n` sub-field (§7.2), the `MCE` places exactly the
digits it is handed, and the fields those sub-fields are cut from — `H`, `V`, `VAE`, `QB`, `QD`,
`QTOT` and `RNG` — are the arithmetic's own, which an `A +5` may not touch (§5.1 rule 3). **The
eighth is column 9**, whose `PL10` copy is cut out of `L10R` by an `MLC` that half-adjusts nothing
(§7.2 mechanism 3). So row 1's VELOCITY is
`22,939` from a `V` of 22,939.54, the last row's ALTITUDE is `198` from an `H` of 198.774, and the
peak-g row's ALTITUDE is `35,436` from 35,436.9 — each one unit below the figure a half-adjust would
have given, and each inside §4.5's one-unit-in-the-last-digit rule, which is stated against these
values.

**Eleven cells above are re-cut, because the earlier sweep left them rounded while the paragraph
above claimed they were not.** Each is a truncation of the layer-3 source value the column's own A
field carries, and each is named so a builder can check the arithmetic rather than trust the mock:

| row | column | was | is | the source value the A field holds |
|---|---|---|---|---|
| 0.50 | HEAT RATE | `533.2` | **`533.1`** | q̇ = 533.1939, `QD` at S = 2, `QD-1` prints S = 1 |
| 11.00 | HEAT RATE | `1,406.6` | **`1,406.5`** | q̇ = 1406.5700 — reaching `.6` needs +1.8e-5 relative, **nine times** the antilog's own 2.034e-6 bound |
| 11.50 | HEAT RATE | `1,178.7` | **`1,178.6`** | q̇ = 1178.6432 |
| 11.00 | RANGE | `32.7` | **`32.6`** | (150,000 − 35,436.9) × 2.85059628e-4 = 32.65732; §7.2 calls this column exact, so no error budget reaches it |
| 11.25 | RANGE | `33.2` | **`33.1`** | 33.15425, ibid. |
| 0.00 | LOG10 RHO-R | `-2.806` | **`-2.805`** | L10R = −2.805631 |
| 8.25 | LOG10 RHO-R | `-1.007` | **`-1.006`** | −1.006644 |
| 10.75 | LOG10 RHO-R | `-0.580` | **`-0.579`** | −0.579855 |
| 11.25 | LOG10 RHO-R | `-0.510` | **`-0.509`** | −0.509667 |
| 11.50 | LOG10 RHO-R | `-0.477` | **`-0.476`** | −0.476616 |
| 22.75 | LOG10 RHO-R | `0.152` | **`0.151`** | +0.151544 |

The six LOG10 RHO-R cells are the ones §7.2 mechanism 3 settles: the plan does **not** half-adjust
`PL10` — §5.1 rule 3 puts the half-adjust inside the arithmetic and nowhere else — so column 9
truncates like the seven `FIELD-n` columns and prints the four digits `MLC L10R-3,PL10` hands it.
Everything else in the mock reproduces: all ten ALTITUDE, VELOCITY, V A-E, DIFF, DECEL, DYN PRESS and
HEAT LOAD cells, the whole of §7.7's summary, and every cell of §8.7's RPG page — the last because
the punch carries the unedited field and the extract's own edit words are §8.5's, not §7.2's.

The peak-g row is t = 11.00 and the peak-heating row is t = 8.25. Column 5 is the machine showing its
work: **worst 0.07 ft/s over 20,821 ft/s of deceleration**, printed beside the answer it belongs to,
with the derived tolerance in `docs/BUILD-LOG-6.md` and never on the paper (RULINGS §E 19).

One honest caveat, which §11 wave 4 closes: the row values are layer 3's, so the golden is what the
emulated machine produces and may move by one unit in the last digit of the columns §4.5 allows one
in. **Every value above is the primary antilog's** — the maximum DYN PRESS is **68,681**, and under
truncation the two-level `ANTB` fallback of §5.6 prints 68,681 there too: q̄ = 68,681.65 lb/ft², the
fallback's truncation bound is 0.0018 lb/ft² at that magnitude, and `QB-1` drops the tenths either
way. The 68,682 an earlier draft printed here was the rounding-era measurement and is withdrawn
(§5.6, §15 row 7).

### 7.7 The overflow heading and the summary block

The overflow heading is five printed lines — title and `PAGE`, the condensed framing line of §7.4,
and §7.5's three column-heading lines re-using the **same literals**, which is why it costs 40
instructions and only **~90** new positions of constant (§7.9 — the condensed line's own measured
text length, corrected from an earlier ~66).

The summary block is seven printed lines on form 3, after a programmed `CC1 1`. Its values are this
run's, from the primary simulator:

```
SUMMARY

MAXIMUM DECELERATION       68.7 G    ALTITUDE  35,436 FT   TIME  11.00 SEC   VELOCITY  14,222 FT/SEC
  NACA 1381  EQ 17         68.7 G    EQ 15 ALTITUDE  34,570 FT      EQ 16 VELOCITY  13,950 FT/SEC
MAXIMUM HEAT RATE       2,227.4 BTU/FT2-SEC    ALTITUDE  58,869 FT   TIME   8.25 SEC
TOTAL HEAT LOAD          19,489 BTU/FT2      DKR CORRELATION IS ACCURATE TO PLUS OR MINUS 10 TO 20 PCT
MAXIMUM DIFFERENCE VELOCITY MINUS V A-E       0.07 FT/SEC

END OF RUN.  92 STEPS.  RECONSTRUCTION - NOT FLIGHT DATA.
```

Three rules govern it:

- **The peak rows are tracked, not re-scanned.** The page is one pass over 92 steps and the deck
  never revisits a row, so the two peak trackers of §6.6 carry the maximum's `t`, `h` and `V`
  forward. `// OPEN: SUMMARY_CARRIES_THE_PEAK_BECAUSE_THE_PAGE_IS_ONE_PASS`, §15 row 18.
- **DKR's ±10-20 PCT prints on the `TOTAL HEAT LOAD` line**, beside the two heating columns rather
  than once in prose — `avco-and-reentry.md:160`, RULINGS §E 29.
- **Nothing called TOLERANCE prints.** The block prints `MAXIMUM DIFFERENCE VELOCITY MINUS V A-E`
  and its measured figure; the bound lives in `docs/BUILD-LOG-6.md` and in the test (§4.5).

Under the `y1 > 0` guard's failure path (§6.9) the `NACA 1381 EQ 17 / EQ 15 / EQ 16` line is
replaced by one printed line saying the closed forms do not apply at this ballistic coefficient.

### 7.8 The chain-A rule, and the test that enforces it

**Rule: no character outside the chain-A arrangement may appear in any printed literal of
`demos/reentry.asm` or `demos/reentry-summary.rpg`.**

The arrangement, dumped from `chainGlyph(code, 'A')` over all 64 code points this session
(`src/core/devices/printer1403.ts:97` `CHAIN_SLUGS`, `:187` `chainGlyph`):

```
  clean:   A-Z  0-9  space  .  ,  -  /  $  *  #  @  &  %  ⌑  ‡
  not on chain A, and with NO BCD AT ALL in this emulator:   =   (   )   +
  on chain A only as a code, printing blank:   :  ;  ⧧ (the group mark, octal 77)
```

So the four characters the panel worried about are not merely wrong on chain A — `bcdOfGlyph` returns
`undefined` for all four, and a source deck cannot even spell them. The five duals the A/H toggle
swaps are octal 13 `#`/`=`, 14 `@`/`'`, 34 `%`/`(`, 60 and 72 `&`/`+`, 74 `⌑`/`)`. (`‡` is the slug
for **two** codes on both arrangements — the substitute blank at octal 20 and the record mark at
octal 32, read this session; the group mark at octal 77 prints on neither.)

**The test** (`test/reentry-page-parse.test.ts`, wave 4) is one predicate over every alphameric
literal — every `DCW`/`DC` operand between `@` delimiters in `demos/reentry.asm`, and every
`constantOrEditControlWord` in columns 51-75 of `demos/reentry-summary.rpg`:

```ts
for (const ch of literal) {
  const bcd = bcdOfGlyph(ch);
  expect(bcd, `${ch} has no BCD`).toBeDefined();
  expect(chainGlyph(bcd!, 'A'), `${ch} is not on the A arrangement`).toBe(ch);
}
```

with exactly one exemption, the group mark `⧧` (octal 77) in `PAGM` and `PLGM`, which is a control
character and is never printed. The walkthrough may note that the A/H toggle shows the scientific
arrangement, because the restrike is exactly those five duals — but the page golden stays chain A
like every other golden (RULINGS §B 10).

### 7.9 The literal budget

| block | positions |
|---|---|
| eight heading lines, literal text only (the edited case-card fields are not literals) | 551 |
| three column-heading lines, shared with the overflow heading | 133 |
| the condensed framing line of §7.4 — **90**, measured | 90 |
| the summary block's labels | 372 |
| **total** | **1,146** |

**The counting rule, stated, because two are possible and they differ by a fifth.** A `DCW` holds
its own internal blanks, so the rule that governs is **literal segments including their internal
blanks, with only the eight edited case-card fields removed** — not a count of non-blank characters.
Measured on §7.3's own eight lines this session: they are 80/98/120/110/97/91/111/125 characters
(all inside 132, §7.3), **728** characters of text after the 13-position left margin, **521**
non-blank characters, and **655** under the segment rule. The summary block's 372 sits nearest that
block's non-blank **362**. So **551 and 372 are reproduced by neither rule exactly**, and the two
rows were not counted the same way as each other.

**This table is therefore an ALLOCATION, in the same sense the 440-position constants block is
(§5.11), and wave 4 replaces it with the measured length.** §5.11's map allocates **1,150** for it
and §6.13's emitted-position arithmetic uses that allocation, so the object-card count descends from
the map rather than from a second figure — but the "4 spare" that phrasing implies is not a
measurement and is withdrawn as one. **The named recovery is F1, not the spare four**: if wave 4
measures the block under the segment rule at ≈1,250 — 655 + 133 + 90 + 372 — it is ~100 positions
over, which pushes `ANTA`, `PAREA` and `PLINE` up by 100, takes the high-water from 08,732 to
**08,832** (still under the 09,000 ceiling, §5.11) and adds ~2 condensed object cards; **F1** (the
four case-echo heading lines become two, −320) recovers it three times over, and **F2** (the
`NACA 1381 EQ 17/15/16` line moves to the walkthrough, −130) is the second. Neither is spent by this
plan, and a wave that spends one logs it in `PHASE-6-NOTES.md` §2 as a fallback taken (§5.11).

**The condensed framing line is 90 positions of text, not 66.** §7.4 prints it at 103 print
positions, of which the first 13 are the left margin every line of this page carries, so the literal
the deck holds is **90** characters — measured on §7.4's own line. An earlier draft budgeted 66 here
and then allocated 1,100 in §5.11 against a total that already summed to 1,122; both figures are
withdrawn.

---

## 8. The punch and the RPG job

*The second printed artifact, and the machine-readable intermediate between them.* This section
carries three things nothing else does: the punch proved end to end, the card contract in both
directions, and `demos/reentry-summary.rpg` **written as real specification cards and run through the
shipped generator, assembler, condensed loader, 1402 and 1411 this session**.

**Zarathustrum's decision 3, priced, because it decides whether this section exists.** RULINGS §C 12 rules
that the deck prints **and** punches and that the RPG job tabulates the punched cards, against two
named alternatives. The default is the ruling.

| | what is built | what it costs |
|---|---|---|
| **print + punch + RPG (default)** | §8.1-§8.3's punch (~20 source cards, **zero** `src/` additions), `demos/reentry-summary.data.cards` as the punch pocket's own contents, `demos/reentry-summary.rpg`, and §8.8's ~26-line retirement of the drawn "reads and does not punch" line | one extra wave item, two new goldens, and four drawn labels rewritten |
| **print-only** | the trajectory page and nothing else | **two fewer wave items** — but `STATUS.md:221`'s no-control-break RPG demonstration then has to run on a **hand-typed** data deck, which is a trajectory number typed into a file: exactly what §8.3's `expect(punched).toEqual(committed)` exists to make impossible, and the opposite of this phase's thesis. §13 loses criteria **16 and 17**, §10.3's steps 10-12 go, and the drawn 1402 line stays true only because the machine was never asked to punch |
| **paper-first's full punch station** | a drawn punch box with its own view module | **refused outright**, not deferred: it is a new module under `src/`, which §2.2 cuts by name and §13 criterion 7 asserts against at every commit (`architecture.md:855`, STATEMENT.md) |

Everything below assumes the default. If Zarathustrum takes print-only, §8.1-§8.5, §8.7 and §8.8 are deleted
as a unit, wave 5 shrinks to nothing and wave 6 absorbs the RPG job against a hand-typed deck — one
word from him, before wave 3 lands the deck that would punch.

### 8.1 The punch, proved — and the three things no proposal names

`punch.stackers['0'] === 1` after a `P1 0,PAREA`, with `channel1` all clear and **zero core
changes**. Run this session from a seven-card probe (stop `halt`, IAR 00583, 50 instructions) and
again inside §6's twelve-column skeleton. Three requirements came out of it, and all three are in the
deck because none is in the dossier, the rulings or any proposal:

1. **The punch area needs its own group-mark-with-word-mark.** `P1` transfers core to the punch
   buffer *until the GM-WM*; with none of its own the transfer ran on to `PLGM`, the channel
   returned `wrongLengthRecord: true`, and **no card was punched**. The layout is `PAREA DS 80`
   with the label indented to column 7 so it resolves HIGH-order (`src/asm/types.ts:27`), followed
   immediately by `PAGM DC @⧧@`.
2. **The group mark must be word-marked at run time**: `SW PAGM` in the init block, exactly as
   `demos/sales-summary.asm:53` (card `01530`) does `SW PLGM  THE GM-WM THAT ENDS W1`. A `DC` emits
   the character without a mark, and an unmarked group mark terminates nothing.
3. **The source glyph is `⧧` (U+29E7), not `‡`.** `‡` is the slug printed for the substitute blank
   (octal 20) **and** for the record mark (octal 32), on both arrangements — read this session; the
   group mark is octal 77 and prints on neither chain.

`// OPEN: THE_PUNCH_AREA_NEEDS_ITS_OWN_GM_WM` — `[verified]` by measurement, §15 row 17.

Statement form: **`P1 0,PAREA`** — move mode, 80 columns. `ALL_MNEMONICS` carries
`P PO PW PWO P1 P1O P1W P1WO P2 P2O P2W P2WO` (`src/asm/mnemonics.ts:590`, *"the punch exists on this
configuration, so it is IN"*, A22-0526-3 Fig.107 p.104 / p.63, C28-0309-1 p.48). `P1W` is load mode
and is not used. Pocket `0` is x3 = `0` (`src/core/devices/punch1402.ts:36`, `POCKET_OF_X3`).

**Where the cards actually are.** `MachineState.punch` carries **counts only** —
`src/core/machine.ts:499` puts `punch: { stackers: punch.stackers }` in the snapshot. The cards live
on the device: `Punch1402.pockets` (`src/core/devices/punch1402.ts:104`) is
`{ '0': Card[]; '4': Card[]; '8-2': Card[] }`. So §8.3's assertion reaches `machine.punch.pockets['0']`
on the `Machine` object, not `snapshot().punch`, and a test that reads the snapshot can only count.

### 8.2 The card contract — 80 columns, one card per printed row, unedited

`// OPEN: PUNCH_CARD_FORMAT_IS_OURS`, `[unverified]`; no period trajectory summary card survives
(§15 row 16). This table is the authoritative copy and §8.4's RPG Input sheet reads it:

| cols | field | digits · S | source |
|---|---|---|---|
| 1 | record code `T` | 1 | identifies a trajectory row to the RPG Input sheet |
| 2–6 | TIME | 5 · 2 | `T` |
| 7–14 | ALTITUDE | 8 · 1 | `H` |
| 15–22 | VELOCITY | 8 · 2 | `V` |
| 23–30 | V A-E | 8 · 2 | `VAE` |
| 31–38 | DIFF | 8 · 2, signed | `DIF` |
| 39–46 | DECEL | 8 · **1** | `DG` |
| 47–54 | DYN PRESS | 8 · 1 | `QB` |
| 55–62 | LOG10 RHO-R | 8 · 6, signed | `L10R` |
| 63–70 | HEAT RATE | 8 · 2 | `QD` |
| 71–78 | HEAT LOAD | 8 · 2 | `QTOT` |
| 79–80 | sequence, 01–92 | 2 | so an out-of-order deck is detectable |

Sums to **80**. Three rules govern it:

- **Unedited numeric fields.** No commas, no points, no signs except the zone bit `MLZS` stamps on
  `DIFF` and `LOG10 RHO-R`. The point is implied and documented in the RPG Data sheet's edit words
  (§8.5), which is how a period shop carried scale between two jobs.
- **A record code in column 1 and a sequence number in columns 79-80**, so the RPG Input sheet can
  identify the record type and an out-of-order deck is detectable.
- **`GAMMA` and `RANGE` are not punched.** Both are closed-form functions of the case card and `h`,
  and a card that carries derivable fields is a card that can disagree with itself.

The block, **15 instructions and 2,263.5 µs** (§5.10 — `CS` + `MLCA` + 11 `MLC` + `P1` + `BA1`;
count them below), addressing `PAREA+(end-1)` because
`PAREA` resolves high-order:

```
01xxxPCHOUT    CS   PAREA+79            ONE CS -- B = 80, 8579 DOWN TO 8500, SEE 6.11
01xxx          MLCA KREC,PAREA          RECORD CODE T, COLUMN 001
01xxx          MLC  T,PAREA+5           TIME        COLS 002-006, 5 DIGITS S=2
01xxx          MLC  H,PAREA+13          ALTITUDE    COLS 007-014, 8 DIGITS S=1
01xxx          MLC  V,PAREA+21          VELOCITY    COLS 015-022, 8 DIGITS S=2
01xxx          MLC  VAE,PAREA+29        V A-E       COLS 023-030, 8 DIGITS S=2
01xxx          MLC  DIF,PAREA+37        DIFF        COLS 031-038, SIGNED
01xxx          MLC  DG,PAREA+45         DECEL       COLS 039-046, 8 DIGITS S=1
01xxx          MLC  QB,PAREA+53         DYN PRESS   COLS 047-054, 8 DIGITS S=1
01xxx          MLC  L10R,PAREA+61       LOG10 RHO-R COLS 055-062, SIGNED
01xxx          MLC  QD,PAREA+69         HEAT RATE   COLS 063-070, 8 DIGITS S=2
01xxx          MLC  QTOT,PAREA+77       HEAT LOAD   COLS 071-078, 8 DIGITS S=2
01xxx          MLC  SEQ,PAREA+79        SEQUENCE    COLS 079-080
01xxx          P1   0,PAREA             MOVE MODE, 80 COLUMNS, POCKET 0
01xxx          BA1  *+1
```

The trap the skeleton found: `PAREA+1` is card column **2**, not column 1. `MLCA KREC,PAREA` puts the
record code where the RPG Input sheet looks for it; `MLCA KREC,PAREA+1` puts it one column right and
the whole job silently reads no records.

**Two corrections inside that block, both of which would have punched a silently wrong card.**
(a) `TIME` moves the **whole** field: `MLC T,PAREA+5`, not `MLC T-3,PAREA+5`. `T` is five digits, and
the `FIELD-n` convention §7.2 states drops the low-order `n` — so `T-3` is a **two**-digit sub-field,
which would leave columns 2-4 as whatever `CS PAREA+79` cleared and punch only the hundredths of a
second. Every other field in the block moves its bare name for exactly this reason.
(b) `DECEL` is punched at **S = 1**, which is where §5.2 carries `DG` and where §5.3 row 14's
rescale offset of 12 puts it. An earlier draft of this contract said S = 3 in the table and in the
comment above, which is a factor of 100 against the field the deck actually holds: §8.5's `WORD04`
would print `0.687` where the trajectory page prints `68.7`. `DG` carries one decimal, so the card
carries one decimal, and the extract prints one — 68.682 is not available to either artifact.

### 8.3 `demos/reentry-summary.data.cards` — 92 cards, and no number is ever typed

The committed deck **is** the punch pocket's contents. The assertion, wave 5:

```ts
const punched = machine.punch.pockets['0'];                 // Card[] -- 8.1
const committed = parseDeck(readFileSync('demos/reentry-summary.data.cards', 'utf8')).deck;
expect(punched).toEqual(committed);
```

Round-trip verified this session on a real punched card: decoding a `Card` to its 80 glyphs and
handing the text back to `parseDeck` returns a `Card` that **deep-equals** the original, with 0 parse
errors. So the comparison is over BCD code arrays and the committed file is a faithful transcription,
which is what makes "no trajectory number is ever hand-typed into a file" enforceable rather than
aspirational (RULINGS §C 12).

92 cards at 81 bytes each — **7,452 bytes**. `tools/rpg.ts:225`'s existing
`sibling(args.spec, '.data.cards')` inference feeds the CLI with zero new plumbing, and the RPG
sheet's sample-data button loads the same file (§10.1). **No transfer button.**

### 8.4 `demos/reentry-summary.rpg` — the spec deck, as real cards

Written this session in the shipped column layout (`src/rpg/sheets/columns.ts`) and **run**:
`node build/tools/rpg.js reentry-summary.rpg --page` produces the page in §8.7 through the real
generator, the real assembler (`ok: true`, 0 flagged, **0 warnings**), the real condensed loader, the
real 1402 and the real 1411. **54 specification cards**, 195 generated source cards.

```
RG                                                                         02010
CAA  001 CT                              01                                03010
DTIME  005         CAAN006005                                              04010
DALT   008         CAAN014008                                              04020
DVEL   008         CAAN022008                                              04030
DDECEL 008         CAAN046008                                              04040
DQTOT  008         CAAN078008                                              04050
DPAGENO003         PAG                                                     04060
ACOUNT 005                   00001 005A         D                          05010
LHA1X  HA2    01    1P                                                     06010
K                                 043          017BALLISTIC REENTRY        06020
K                                 062          018TRAJECTORY SUMMARY       06030
K                                 076          004PAGE                     06040
F                           PAGENO080         Z                            06050
LHA2X  HA3  02                                                             06060
K                                 045          016RECONSTRUCTION -         06070
K                                 061          015NOT FLIGHT DATA          06080
LHA3X       02                                                             06090
K                                 020          004TIME                     06100
K                                 041          008ALTITUDE                 06110
K                                 060          008VELOCITY                 06120
K                                 078          005DECEL                    06130
K                                 097          009HEAT LOAD                06140
LHB1X  HB2    01    OF                                                     06150
K                                 043          017BALLISTIC REENTRY        06160
K                                 062          018TRAJECTORY SUMMARY       06170
K                                 076          004PAGE                     06180
F                           PAGENO080         Z                            06190
LHB2X  HB3  02                                                             06200
K                                 045          016RECONSTRUCTION -         06210
K                                 061          015NOT FLIGHT DATA          06220
LHB3X       02                                                             06230
K                                 020          004TIME                     06240
K                                 041          008ALTITUDE                 06250
K                                 060          008VELOCITY                 06260
K                                 078          005DECEL                    06270
K                                 097          009HEAT LOAD                06280
LD11X       01      01                                                     07010
F                           TIME  020             WORD01                   07020
F                           ALT   041             WORD02                   07030
F                           VEL   060             WORD03                   07040
F                           DECEL 078             WORD04                   07050
F                           QTOT  097             WORD05                   07060
LT11X       02      LC                                                     08010
K                                 034          014ROWS TABULATED           08020
F                           COUNT 041         Z                            08030
K                                 078          015FINAL HEAT LOAD          08040
F                           QTOT  097             WORD05                   08050
K                                 102          003***                      08060
W                           WORD01             006 0 .                     09010
W                           WORD02             011 ,   ,  0.               09020
W                           WORD03             010   , 0 .                 09030
W                           WORD04             009     0 .                 09040
W                           WORD05             010   , 0 .                 09050
```

Column positions to read that by (`src/rpg/sheets/columns.ts:20-174`): Input `c` 1, `seq` 2-3,
`recordPosition1` 6-8, `recordCompare1` 10, `recordCode1` 11, `resultingCondition` 42-43,
`controlFieldEnd1` 44-46 — **blank, which is the whole point**. Data `d` 1, `fieldName` 2-7,
`fieldLength` 8-10, `source1FieldSource` 20-22, `source1Numeric` 23, `source1FieldEnd` 24-26,
`source1FieldLength` 27-29. Calculation `a` 1, `fieldName` 2-7, `factor2` 30-35, `factor2Length`
36-38, `accumulate` 39, `totalDetail` 49. Format `format` 1, `line` 2-4, `print` 5, `nextLine` 8-10,
`spaceAfter` 13-14, **`skipBefore` 15-16**, `lineCondition1Indicator` 21-22, `fieldName` 29-34,
`fieldEnd` 35-37, `zeroSuppress` 47, `fieldLength` 48-50, `constantOrEditControlWord` 51-75.

**Four generator rules this deck had to satisfy, all found by running it:**

| rule | where it is enforced | what it cost |
|---|---|---|
| `PAGENO` must be defined **exactly once** on the Data sheet | `src/rpg/model.ts:213`, J24-0215-2 p.26 `[verified]` | the `DPAGENO003 PAG` card |
| a `W` entry must be named `WORDnn` | `src/rpg/model.ts:804` | the five edit words are `WORD01`-`WORD05` |
| an edit word's digit positions (blanks plus `0`s) must be **≥** the field width | `src/rpg/model.ts:888`, `EDIT_WORD_IS_THE_1410_MCE_CONTROL_WORD` | §8.5's widths |
| a constant is at most **25 characters** (cols 51-75) | `FORMAT_COLUMNS` | the title is two `K` cards, and so is the framing line |

**And one that is not a rule but a defect if you miss it — with a second defect on its other side.**
The **first** line of a heading group carries `skipBefore = 01` in **columns 15-16**, not `spaceAfter`
in 13-14. `demos/sales-summary.rpg:15`
(card `06010`) is `LHA1X  HA2    01    1P` and that `01` is at 15-16. Built the other way, the generated heading
emits no `CC1 1`, so the carriage never skips to channel 1, the channel-12 indicator is never
cleared by the destination-line sense (`printer1403.ts:667-681`,
`CARRIAGE_SENSES_AT_DESTINATION_ONLY`), and the overflow latch fires again on the very next detail
line. Measured this session on the 92-row deck: **one detail row per form from form 2 onward**, three
forms and counting. With `skipBefore = 01` the same deck paginates correctly at **two forms**.

**But 15-16 is the rule for the FIRST heading line only, and every continuation line takes
`spaceAfter` in 13-14.** `HA2` and `HB2` are continuations, so their `02` belongs at **13-14**:
`LHA2X  HA3  02`, not `LHA2X  HA3    02`. `HA3` and `HB3` already have theirs at 13-14, and so do
`demos/sales-summary.rpg`'s own `LD11X` (`:37`) and `LT11X` (`:43`) — **and its `LHA2X` (`:20`, card
`06060`), which is `HA2`'s exact sibling and carries its `02` at 13-14.** The shipped deck settles
it; the earlier draft of this listing contradicted it, putting the `02` in 15-16 and asking the
carriage to **skip to channel 2**. (That draft also cited a `LHA3X` card in `demos/sales-summary.rpg`
and there is none: its heading groups are two lines, not three, and its eight `L` cards are `LHA1X`,
`LHA2X`, `LHB1X`, `LHB2X`, `LD11X`, `LT11X`, `LT21X` and `LT31X`.) `DEFAULT_CARRIAGE_TAPE`
punches channels **1, 9 and 12 only** (`src/core/devices/printer1403.ts:212-218`), so a skip to
channel 2 throws a form: measured on the 92-row deck, **four `\f`-separated segments and 9,652
bytes**, with `RECONSTRUCTION` on only two of the four. With the `02` at 13-14 the same deck gives
**two segments, 9,648 bytes, `RECONSTRUCTION` on both** — §8.7's page exactly. That is where the
9,648 in §3.6, §8.7, §8.9 and §12.3 comes from, and it is why the **HB group is written out in full
above rather than elided**: the elision is what let the error into the one card that has no sibling.

### 8.5 The edit words, and why they are not §7.2's

The RPG generator hands `MCE` an A field of **exactly the declared field length** — it has no
`FIELD-n` sub-field idiom — so §7.2's three MCE mechanisms apply with different answers. The extract
prints the card's **full punched precision**, which is the honest thing for a machine-readable
intermediate and the point the walkthrough makes about it:

| word | body | length | for | prints, first row … last row |
|---|---|---|---|---|
| `WORD01` | `_0_.__` | 006 | `TIME`, 5 digits S=2 | `  0.00` … ` 22.75` |
| `WORD02` | `_,___,__0._` | 011 | `ALT`, 8 digits S=1 | `  150,000.0` … `      198.8` |
| `WORD03` | `___,_0_.__` | 010 | `VEL`, 8 digits S=2 | ` 22,939.54` … `  2,118.11` |
| `WORD04` | `_____0_._` | 009 | `DECEL`, 8 digits **S=1** | `      1.0` … `     68.7` |
| `WORD05` | `___,_0_.__` | 010 | `QTOT`, 8 digits S=2 | `      0.00` … ` 19,489.06` |

(`_` is a blank; the words are written into columns 51-75 with their length in 48-50.) Each protects
its integer units digit by the §7.2 rule — the suppression code sits one position left of it — which
is why the first row's `HEAT LOAD` prints `0.00` and not a blank field.

**Two corrections to that table, and both were the same mistake — printing the trajectory page's
printed figure with zeros appended, which is the one thing this section says the extract does not
do.** (a) The values come from the **punched fields**, which are §7.6's underlying values and not
§7.6's printed ones: `H` at the last row is 198.774 → `00001988` → `      198.8`, not `198.0`;
`V` at the first row is 22,939.5405 → `02293954` → ` 22,939.54`, not `22,939.00`; `QTOT` at the last
row is 19,489.0597 → `01948906` → ` 19,489.06`, not `19,489.00`. (b) `WORD04`'s body and `DECEL`'s
scale had to agree with §5.2, and they did not: `DG` is carried at **S = 1**, so the card holds
`00000687` for 68.7 g and a nine-position word with the point three from the right would print
`0.687`. The corrected body puts the point **one** from the right and the suppression code one
position left of the units digit — `_____0_._`, still nine characters, still `009` in columns 48-50,
so the spec card's length field does not move. **`68.682` is not available to this artifact and never
was**: the deck carries one decimal of `DECEL`, the card carries one, and the extract prints one.

### 8.6 The four-clause no-control-break predicate, measured on this job

`STATUS.md:221` and `PHASE-5-NOTES.md` §4 require Phase 6 to **demonstrate** that the generator omits
control-break machinery, with a check behind it. The kickoff's suggested check — "the generated
program contains no `CTLBRK`/`F1` ladder" — is false in both halves: `01330CTLBRK B DTLCAL` is
emitted on a correct build and `01250 BEF1 LASTCD` defeats any text grep for `F1`. The predicate
runs over the **model** and over **assembler symbols**, and it is asserted positively over the
trajectory job and **inverted** over `demos/sales-summary.rpg` so it cannot rot into a tautology.

All four clauses re-measured this session, on all three jobs:

| clause | accessor | `reentry-summary` | `card-list` | `sales-summary` (inverted) |
|---|---|---|---|---|
| 1 — no control fields | `model(parseScanned(scan(readSpecSource(text)))).model.controlFields` | `[]` ✔ | `[]` | `[{n:1,end:6,length:3},{n:2,end:3,length:2}]` ✔ |
| 2 — no `Fn` indicator symbol | `assemble(generate(text).source).symbols`, `/^F[0-9]+$/` | none of **66** ✔ | none of 42 | `F1`, `F2` ✔ |
| 3 — no `CN`/`CO` save area | same, `/^C[NO][0-9]+$/` | none ✔ | none | `CN1 CN2 CO1 CO2` ✔ |
| 4 — section card counts, from `CYCLE_SECTION_LABEL` (`src/rpg/cycle.ts:60-78`) | source cards between one section label and the next | `CTLBRK` **1** · `TOTCAL` **1** · `TOTOUT` **16** · `LVLRST` **1** ✔ | 1 · 1 · **1** · 1 | 12 · 7 · **54** · 5 ✔ |
| — indicator file | the `IND DA` card and its sub-entries | `IND DA 1X5` carrying exactly `RC01 OF LC FSTPG PRIME` ✔ | same | `1X7`, with `F1 F2` added ✔ |

Clause 4 is what makes the demonstration a demonstration rather than a restatement of
`demos/card-list.rpg`: **`TOTOUT` is 16 cards on the trajectory job against card-list's 1**, because
the trajectory job has an LR total line and card-list has none. That block — a `BCE …,LC,0`-guarded
total-output arm with **no `F1`-guarded arm beside it** — is the one piece of generator coverage this
phase adds, and it is exactly what `PHASE-5-NOTES.md` §4 asked for. The wave that lands the job
publishes its measured counts in `docs/BUILD-LOG-6.md` before the golden.

One accessor note the panel got wrong and the plan must carry: `driver(model, layout)` called without
`generate()`'s private `emittersFor(model)` returns `totalCalc` and `totalOutput` **empty**, so
clause 4 runs over `generate(text).cards`, never over a re-driven section map. And `scan()` alone
does not produce a model — the pipeline is
`model(parseScanned(scan(readSpecSource(text))))` (`src/rpg/generate.ts:4-7`).

### 8.7 The RPG page

Produced this session by the real chain, on §7.6's published rows:

```
1403 Model 2 · chain A · 66-line form

                          BALLISTIC REENTRY TRAJECTORY SUMMARY          PAGE   1
                             RECONSTRUCTION - NOT FLIGHT DATA

                TIME             ALTITUDE           VELOCITY             DECEL          HEAT LOAD

                0.00            150,000.0          22,939.54               1.0               0.00
                0.25            147,133.1          22,931.14               1.1             121.18
                0.50            144,267.3          22,921.57               1.3             250.36
                8.25             58,869.0          19,488.11              44.5          11,017.08
               11.00             35,436.9          14,222.29              68.7          16,305.74
               22.75                198.8           2,118.11               7.6          19,489.06
                    ROWS TABULATED      6                      FINAL HEAT LOAD          19,489.06  ***
```

That extract is a six-row cut for the plan; at the real 92 rows the same deck paginates to **two
forms**, the `PAGE` field advances to 2, and `test/golden/reentry-summary.page.txt` is **9,648
bytes** — measured this session with a 92-row deck, against §3.6's earlier ~5,900 estimate, which
predated the pagination measurement. The 9,648 and the two forms are the figures for the deck with
`HA2`/`HB2`'s `02` at columns **13-14**; at 15-16 the same deck measures 9,652 bytes over four forms
(§8.4).

**Every cell above is the value the PUNCH carries, not the value the trajectory page prints**, and
the two differ on purpose: the card holds `H` at S = 1, `V`, `QTOT` at S = 2 and `DG` at S = 1, so
the extract reads `22,939.54` where §7.6's `VELOCITY` column reads `22,939`, and `198.8` where its
`ALTITUDE` column reads `198` — the page's seven `FIELD-n` columns truncate (§7.2), the card does not. That is the whole point of the second artifact — the page is edited
for a reader, the card is not — and a mock built by appending zeros to the page's figures would have
said the opposite. `DECEL` is the one column where the card is **not** more precise than the page:
both carry one decimal, because §5.2 carries `DG` at S = 1 (§8.5).

**`RECONSTRUCTION - NOT FLIGHT DATA` prints on every form**, because it is on the `HA2` line for the
first page and the `HB2` line for every overflow page. That is RULINGS §C 13's requirement — the hole
all three proposals shipped, each asserting the disclaimer on the trajectory page and producing a
second printed artifact without it — and §13 criterion 17 asserts the word `RECONSTRUCTION` on every
`\f`-separated form of **both** goldens.

### 8.8 The punch-station retirement — the minimum edit set, with what is already live

Shipping a deck that punches 92 cards beside a drawn line reading *"This 1402 reads and does not
punch"*, asserted true by a green test, is a false statement on the artifact in the one phase whose
thesis is honesty on the page. The station is **retired, not rebuilt**: no new module, no
`punchBoxView.ts` (RULINGS §C 12, `architecture.md:855`). Every line number below was read this
session.

| file:line | what is there | the edit |
|---|---|---|
| `src/ui/period/reader/hopperView.ts:59-70` | the `OPEN:` block for `PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT` | **deleted**, with the "WHAT WOULD SETTLE IT: a later phase that punches" line answered in the commit message |
| `hopperView.ts:71` | `export const PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT = true` | **deleted** |
| `hopperView.ts:74-77` | `READS_AND_DOES_NOT_PUNCH`, the one line the ruling required | replaced by a line that says what the punch feed now does and cites `demos/reentry.asm` |
| `hopperView.ts:137` | `block('punch feed — empty')` | the heading loses "— empty" |
| `hopperView.ts:145` | `line(READS_AND_DOES_NOT_PUNCH)` | draws the replacement line |
| `src/ui/period/reader/stackerView.ts:98-101` | the citing comment at `:98-99` and, at `:100-101`, *"0 (NP) and 4 belong to the punch feed and stay at zero: this 1402 reads and does not punch, so nothing is ever stacked in them"*. **`:96-97` is the tail of a different, correct sentence** — pocket 8/2 seen from two feeds, A22-0526-3 pp.60-61 — and is not touched | replaced |
| `test/period-reader.test.ts:55` | the two imports inside the `hopperView.js` import block at `:54-57` | `PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT` goes; the replacement string comes in |
| `test/period-reader.test.ts:212-220` | *"draws the punch feed and leaves it empty and inert, and says so on the page"* — four assertions at `:216-219` | rewritten as the positive case, and the `INERT_KEYS` assertion **stays** (below) |

**Two corrections to RULINGS §C 12's edit set, both verified this session:**

1. **The pocket counts are already live.** `src/ui/period/reader/stackerView.ts:45-52` reads
   `p.stackers['0']`, `p.stackers['4']` and `r.stackers['8-2'] + p.stackers['8-2']` from
   `MachineState` on every frame. Nothing is added; only the prose that says they stay at zero is
   false. The retirement is ~26 lines of prose and one deleted constant, not new plumbing.
2. **PUNCH START and PUNCH STOP stay inert, and the reason changes.** `INERT_KEYS`
   (`src/ui/period/reader/keysView.ts:98`) is **derived** from the drawn key strip — a key is inert
   exactly when no `Machine` call is wired to it — and `Machine`'s whole unit-record surface is
   `loadDeck`, `readerStart`, `readerEndOfFile` and `endOfJob` (`machine.ts:130-148`); there is no
   punch-start surface, and adding one is a `src/core` change this phase does not have. The punch
   runs under program control from `P1`, exactly as the reader does after START. So
   `keysView.ts:179-180`'s line changes from *"…and this 1402 reads and does not punch"* to a
   statement that the punch feed is driven by the program and these two keys have no call behind
   them, and `expect(INERT_KEYS).toEqual(['PUNCH START','PUNCH STOP','READER STOP'])` stays green.
   §2.1 carries the corrected statement; the honest line is cheaper than the dishonest one.

`test/period-refusal-grep.test.ts` is a drawn-label grep over string literals and must still pass on
the replacement text — §11 wave 5's oracle (d). **It binds the replacement prose in two ways the
wave-5 worker should know before writing it, not at the gate:**

1. **`REFUSED_TOKENS` (`:87-90`) is case-sensitive and includes `LOAD`, `µs`, `ms`, `sec`,
   `seconds`, `clock`, `elapsed` and `speed`**, matched over every drawn label in
   `src/ui/period/**` after comments are stripped. So the new punch-feed line may not say the punch
   runs at some *speed*, may not give a card rate in *sec*, and may not use `LOAD` for what the
   program does to `PAREA`. It is 1410 vocabulary or nothing.
2. **`AT_LEAST` (`:71-76`) floors `reader/stackerView.ts` at 5 drawn labels and `reader/keysView.ts`
   at 12** — a per-file floor whose job is to make a file blanked by a stripper accident visible.
   The retirement must therefore **replace** those lines, never delete them: dropping
   `stackerView.ts`'s pocket sentence without writing its successor takes that file to 4 and turns
   the gate red for a reason that looks nothing like the edit.

### 8.9 What this section owns, and what closes it

| artifact | wave | oracle |
|---|---|---|
| `demos/reentry.asm`'s `SW PAGM` / `PAREA` / `PAGM` / punch block, ~20 source cards | 5 | §8.2's contract in both directions |
| `demos/reentry-summary.data.cards`, 92 cards / 7,452 bytes | 5 | deep-equals `machine.punch.pockets['0']` after the run |
| `demos/reentry-summary.rpg`, 54 specification cards | 5 | §8.6's four clauses positive, and inverted over `sales-summary.rpg` |
| `test/golden/reentry-summary.page.txt`, 9,648 bytes, two `\f`-separated forms | 5 | byte for byte through the real generator → assembler → loader → 1402 → 1411, with `RECONSTRUCTION` asserted on every form |
| `test/reentry-punch-card.test.ts` ~180 lines, `test/rpg-no-control-break.test.ts` ~140 | 5 | above |
| the retirement edit set, ~26 lines across four files (three under `src/`) | 5 | `test/period-reader.test.ts` inverted; `test/period-refusal-grep.test.ts` still green |

None of those oracles reads a file a later wave writes: wave 5's inputs are wave 3's integration and
wave 4's page, both already committed.

---

## 9. DEFERRED-01

Wave 0, in full. It is the phase's entry condition and its first build commit, and it is the only
`src/core` change in the phase. Everything below was re-verified in the tree this session; every
`file:line` is a read, not a recollection.

**Why it is wave 0 and not a side item.** §1 step 8 is the last line of the Selectric roll: an `S`
whose Op group is `.`. That line does not exist today. The artifact this project exists to produce
is a printed page *plus* the operator's evidence that the job ended normally rather than jammed, and
that evidence is the console log. `docs/BUILD-LOG-4.md:199` and `PHASE-4-NOTES.md:389-399` recorded
the contradiction; `docs/deferred-work-register.md` armed it to fire on this plan. It fires
correctly and this plan discharges it.

### 9.1 The ruling: rename, do not flip

`HALT_TYPES_NO_PRINTOUT` is **deleted**, not set to `false`. A `false` double negative is a worse
sentence than the one it replaces, and the constant is no longer a fallback under an open question —
it is a `[verified]` reading of a primary source, and a `[verified]` constant should be named for
what the machine does.

| | today | wave 0 |
|---|---|---|
| declaration | `src/core/machine.ts:65` `export const HALT_TYPES_NO_PRINTOUT = true;` under the `OPEN:` block at `:47-64` | `export const PROGRAM_STOP_TYPES_S = true;` under a `[verified]` citation block |
| tag | `[unverified]`, fallback taken (console-and-physical.md §2's table read literally) | **`[verified]`** — S223-2648 p.6 |
| the print-out routine | `printIfError(stop)` at `:239-243`, `E` for the three checks and nothing else | `printStop(stop, mode)` — `E` for the three checks, `S` for `halt` in every mode but I/E CYCLE |

**The citation, verbatim and complete.** S223-2648, *CE Instruction — IBM 1415 Console Model 1*
(`docs/research/README.md:63`), p.6, under "Output Operations":

> *Stop Print-Out:* With the inhibit print-out control switch (CE console) set to normal, **a
> program stop**, an error stop, the stop key, or any cycle step, will initiate a stop print-out.

A program stop is the programmed halt, and Figure 5's first row — Normal Stop / `S` / matrix 35 — is
the line it types. A22-0526-3 p.23's Halt description ("The system stops. Pressing the start key
starts system operation with the next sequential instruction") is **silent, not contrary**: silence
in a p.23 instruction description is not a denial of a print-out documented on p.6 of the console's
own CE manual. The read is Phase 4 wave 0's, recorded at `docs/research/open-questions.md:938-955`
and `PHASE-4-NOTES.md:389-399`, both read this session.

**The body, as wave 0 writes it.** `ConsoleMode` is `'run' | 'addressSet' | 'alter' | 'ieCycle'`
(`src/core/machine.ts:38`), so the mode is a four-way and the ruling is one term:

```ts
const printStop = (stop: StopReason | undefined, mode: ConsoleMode): void => {
  if (stop === 'instructionCheck' || stop === 'addressCheck' || stop === 'processCheck') {
    fieldLine('E');                       // unchanged: §2's three error-stop rows
    return;
  }
  if (stop === 'halt' && PROGRAM_STOP_TYPES_S && mode !== 'ieCycle') fieldLine('S');
};
```

`fieldLine` (`:226-232`) is untouched; the `S` a program stop types is the same `S` the STOP key
types at `:380` and a rotary turn types at `:325-329`, which is what S223-2648 Fig.5's single
Normal Stop row says it should be. The two call sites become
`printStop(cycle.stop, machine.mode)` at `:363` and `printStop(stop, machine.mode)` at `:370`; the
`ieCycle` arm still types `fieldLine('C')` first, so an **error** stop reached under I/E CYCLE still
types `C` then `E` exactly as it does today.

### 9.2 The I/E CYCLE ruling

**A halt reached under MODE = I/E CYCLE types the `C` line alone.**

The sentence lists four triggers — a program stop, an error stop, the stop key, *or any cycle step*
— and one stop types once. Under I/E CYCLE every START is a cycle step and already types `C`
(`machine.ts:360-365`, `console-and-physical.md` §4, A22-0526-3 p.50). The START that lands on the
halt is a cycle step; it has already initiated its stop print-out. Reading the sentence as a sum
rather than a list would have a single START type twice.

```ts
// OPEN: IE_CYCLE_HALT_TYPES_C_ALONE — `[likely]`, ours.
// S223-2648 p.6 lists four triggers for ONE print-out — "a program stop, an error stop, the stop
// key, or any cycle step" — and does not say what a stop that is BOTH a program stop and a cycle
// step types. Under I/E CYCLE every START already types `C` (A22-0526-3 p.50); the START that
// lands on the halt is that cycle step, so it types once, as `C`.
// FALLBACK: `C` then `S` — delete the `mode !== 'ieCycle'` term above and nothing else.
// WHAT WOULD SETTLE IT: a worked I/E CYCLE example in S223-2648's 97 pages, or an Exhibit-II-class
// transcript of a diagnostic single-stepped onto a halt.
```

**It gets its own named test case, because nothing shipped discriminates it.**
`test/demo.test.ts:195-204` single-steps to a halt in I/E CYCLE and then asserts
`…filter(l => l.id === 'C').length` is `toBeGreaterThanOrEqual(9)` — read at `:203` this session.
Neither answer moves a `C` count, so that test passes under both and proves nothing (RULINGS §A 3
adopted; the kickoff's §2.1(b) pointer is retired). The new case is in
`test/machine-console.test.ts` and asserts the whole id list, `['B','C']`, which is the only shape
that fails under the fallback. §15 row 12.

### 9.3 The category ruling on the other stops

Written as **one block in the same comment**, because they are one decision and splitting them
across three sites is how a category ruling rots into three unrelated omissions.

| `StopReason` | ruling | reason |
|---|---|---|
| `halt` | types `S` | S223-2648 p.6, `[verified]` — §9.1 |
| `instructionCheck`, `addressCheck`, `processCheck` | type `E` | unchanged; console-and-physical.md §2's three error-stop rows |
| `ioInterlockStop` | **silent** | an interlock system stop, `io.md` §5. It is a stop, and S223-2648 p.6's "a program stop, an error stop, the stop key" does not name it; no sentence in hand says it prints. `// OPEN: INTERLOCK_STOP_STAYS_SILENT`, `[unverified]`, fallback `S`. §15 row 13. |
| `unsupportedFeature`, `unimplementedOp` | **silent** | emulator-side stops. They exist on no 1410: a real 1411 either executes the op or takes an instruction check. Typing a machine print-out for a condition the machine cannot reach would be inventing a line of the log. `// OPEN: EMULATOR_STOPS_ARE_NOT_MACHINE_STOPS` — a ruling, not an uncertainty. §15 row 14. |
| `stopKey` | **unreachable** | declared in the union at `src/core/types.ts:407` and produced nowhere: the STOP key runs through `machine.stop()` (`:380`), which types `S` directly. Verified by grep this session. Named in the block so a later reader does not read its absence as an oversight. |

### 9.4 The complete migration list — every site read this session

The list is the whole output of `grep -rn HALT_TYPES_NO_PRINTOUT` over the repo, minus
`node_modules`, `.git` and `build/` (a build artifact, regenerated) — **together with §9.5's
deliberately-unedited list, which carries the ten plan-and-panel sites, the two append-only build
logs, the five `E`-filter tests, the two `demo.test.ts` sites, the two view-only test sites, the
handoff note and the compiled copy**. The two tables partition that grep exactly:
every file it names appears on one of them, and nothing else in the tree names the constant.

| file:line | what is there | the edit |
|---|---|---|
| `src/core/machine.ts:47-65` | the `OPEN:` block and `export const HALT_TYPES_NO_PRINTOUT = true;` | replaced by the `[verified]` block of §9.1, `PROGRAM_STOP_TYPES_S = true`, the I/E CYCLE `OPEN:` of §9.2 and the category ruling of §9.3 |
| `src/core/machine.ts:234-243` | `printIfError`'s header (*"every other stop — a programmed `.`, an I/O interlock, an unsupported feature — types nothing at all"*) and its body | becomes `printStop(stop, mode)` per §9.1; the header prose is now false and is rewritten, not annotated |
| `src/core/machine.ts:360-365` | the `ieCycle` arm — `fieldLine('C'); printIfError(cycle.stop);` | `printStop(cycle.stop, machine.mode)` |
| `src/core/machine.ts:368-371` | the `run` arm — `const stop = cpu.run(budget); printIfError(stop);` | `printStop(stop, machine.mode)` |
| `test/machine-console.test.ts:13` | imports `HALT_TYPES_NO_PRINTOUT` | imports `PROGRAM_STOP_TYPES_S` |
| `test/machine-console.test.ts:137-140` | the describe-block comment, *"§2's print-out table has one non-error stop row … and this pins that literal reading"* | rewritten to the S223-2648 p.6 reading. **It is not covered by "the `:137-159` block" in any way a builder would notice**, and left alone it survives as a false sentence under an inverted assertion |
| `test/machine-console.test.ts:141-149` | *"a programmed halt types nothing"*; `expect(HALT_TYPES_NO_PRINTOUT).toBe(true)`; `ids(m) === ['B']` after `.` | inverted: the constant pinned by its new name; `ids(m) === ['B','S']` |
| `test/machine-console.test.ts:151-158` | *"but the operator pressing STOP after it does type `S`"*, `['B','S']` | `['B','S','S']` — the halt's `S`, then the operator's |
| `test/machine-console.test.ts` | — | **NEW named case**: `.` under MODE = I/E CYCLE gives `['B','C']` (§9.2) |
| `test/tier4-period-storyboard.test.ts:262` | `['S','S','D','D','S','A','S']` after the sales-summary deck halts | gains one: `['S','S','D','D','S','A','S','S']`. The run is `machine.start(START_BUDGET)` in a loop at `:214-220` and stops on `'halt'` at `:221`, so the halt now types — verified by reading the loop |
| `test/tier4-period-storyboard.test.ts:263-265` | `rows.filter(r => r.startsWith(AT_35 + 'S ')).toHaveLength(4)` | `toHaveLength(5)`; the four `S` ids are all at matrix 35 today and the fifth is too |
| `src/ui/period/console/session.ts:102-111` | the citing `OPEN:` comment, including *"flipping it puts eleven `S` lines into the cc01 transcript a per-commit gate pins byte-for-byte"* | rewritten to cite the **resolved** constant by its new name and the **measured zero** of §9.6. It is a comment on `UI_ONLY_DETENTS_TYPE_S_THROUGH_STOP` (`:113`), which is unchanged |
| `src/ui/period/console/rotaryView.ts:110` | *"they look like they answer `HALT_TYPES_NO_PRINTOUT` (`machine.ts:65`, §15)"* | renamed; the C.E. door stays drawn closed and the reason is unchanged — the CE PRINT OUT CONTROL toggle and START PRINT OUT button still are not modelled |
| `docs/deferred-work-register.md:23` | `- **Status:** WATCHING` | `- **Status:** RESOLVED` — the exact token `scripts/check-deferred.sh:44`'s `\*\*Status:\*\*[[:space:]]+([A-Z]+)` extracts |
| `docs/deferred-work-register.md:26` | `- **Added:** 2026-09-02` | gains `- **Resolved:** 2026-… (Phase 6 wave 0, `<sha>`)` |
| `docs/deferred-work-register.md:30` | the cost paragraph — *"eleven of them inside the `cc01.cor` demo log"* | **replaced by the measured zero and the command that measured it** (§9.6) |
| `PHASE-1-NOTES.md:32` | the constant's row in the Phase-1 fallback table | **append** one dated line — `SUPERSEDED 2026-… — see docs/BUILD-LOG-6.md wave 0` — and rewrite nothing |
| `PHASE-4-NOTES.md:7` | the opening inventory sentence naming the constant among the four core constants Phase 4 cites and never redeclares | ditto, one dated line. **A rename makes this sentence false and nothing greps for it** — the panel found it and no proposal did |
| `PHASE-4-NOTES.md:62` | the §1 ledger row (*"RECORDED ONLY"*, and it cites `console/session.ts:94`, which is now `:102`) | ditto |
| `PHASE-4-NOTES.md:389-399` | wave 0 target (e)'s finding, with the eleven-lines cost | ditto |
| `PHASE-4-NOTES.md:515-518` | the §4 escalation item | ditto |
| `docs/research/open-questions.md:174, 952, 1036-1037, 1054, 1098` | the Phase-1 `ui` row and the four Phase-4 rows | **the research half — its own escalation commit, research only** (§9.7) |
| `docs/STATUS.md:161` | *"…against `HALT_TYPES_NO_PRINTOUT = true` (`src/core/machine.ts:65`); trips when a Phase 6 plan appears"* | **the orchestrator's file — amended at the merge, never by a wave** (§16 item 9, the Phase 2/3/5 precedent) |

The five historical notes take **one appended dated line each and no rewrite**. A phase note records
what a phase knew when it shipped; editing it into agreement with a later phase destroys the audit
trail that made this discharge possible. **The register entry is `docs/deferred-work-register.md:21-38`**
— the file is 38 lines and the trigger fence closes at `:38`, both read this session.

### 9.5 Deliberately NOT edited, with the reason for each

An edit list is auditable only if the omissions are written down too.

| site | verified this session | reason it is not edited |
|---|---|---|
| `test/loader.test.ts:409` | `expect(state.console.filter((l) => l.id === 'E')).toEqual([])` | an `E` filter. The `E` path does not move. |
| `test/demo.test.ts:145-146` | `['D','D','S','A','D','D','A','D','D','A','S','B']` | the DISPLAY/ALTER keyed-fields dialogue. **No program runs at all** and no stop is reached — a stronger reason than "it never reaches a halt", and a different one. |
| `test/demo.test.ts:203` | `…filter(l => l.id === 'C').length` `toBeGreaterThanOrEqual(9)` | it **does** reach a halt in I/E CYCLE, and it discriminates nothing: the `C` count is identical under the ruling and under the fallback. RULINGS §A 3. |
| `test/tier4-autocoder-demo.test.ts:207`, `test/tier4-demo-deck.test.ts:193`, `test/tier4-rpg-target.test.ts:126`, `test/tier4-rpg-demo.test.ts:62` | all four are `console.filter(l => l.id === 'E')).toEqual([])` | `E` filters. Each run halts and each now gains one `S`, which no `E` filter sees. |
| `test/period-console.test.ts:334, 425` | `S` counts of 3 and 4 from rotary turns; `:431` asserts `log(machine)` is unchanged by START | no program runs — `session.startKey()` in the RUN detent calls `main.ts`'s hook, not `machine.start()`. |
| `test/period-page.test.ts:64-85` | its header says its sequence is *"exactly as `tools/run-deck.ts` and the tier-4 gates perform it"*, and it drives with `machine.step()` | §9.8 changes `run-deck`'s driver, so the comment is worth checking: it reads the **paper**, never the console, and `step()` was already a third method, so the comment was never a claim about the driver. Unaffected, and listed here because it looks affected. |
| `docs/plans/phase-4-period-ui.md:1379, 2576, 2578, 3147, 3212, 3240, 3243, 3330`; `docs/plans/phase-4-panel-dossier.md:340` | eight plan sites and one panel site | shipped plan documents and panel evidence. §3.9: every plan except this one is do-not-touch. |
| `docs/plans/phase-6-panel-dossier.md:386` | *"names `HALT_TYPES_NO_PRINTOUT` in the phase's opening inventory sentence — a rename makes that…"* — **this** phase's dossier, which is the tenth and last plan-or-panel hit in the grep | panel evidence for the phase now being built, and §3.9 lists it as do-not-touch by name. It is in the grep output and belongs on one of the two lists, so it is on this one: with it, §9.4's edit list and this table are provably the whole of `grep -rn HALT_TYPES_NO_PRINTOUT`. |
| `docs/BUILD-LOG.md:300`, `docs/BUILD-LOG-4.md:199` | the Phase-1 constant inventory and the Phase-4 wave-0 finding | append-only build logs. They record what a phase knew; `docs/BUILD-LOG-6.md` records what this one found. |
| `whats-next-systems-controls-go-with-the-photograph-2026-09-03T2041.md:123` | **tracked** (`git ls-files`, verified) | a dated handoff note. Left as written, and said so here so its absence from the list is a decision. |
| `build/src/core/machine.js:50, 144` | the compiled copy | a build artifact; `npm run build:tools` regenerates it. |

### 9.6 The register entry, as it reads after the discharge

The heading is **not** renamed. `scripts/check-deferred.sh:38` parses the id and title out of
`### DEFERRED-01: <title>`, and the register is an audit trail: the heading names the entry as it
was raised, and the body carries what happened. Changing it would make the register disagree with
`docs/BUILD-LOG-4.md:199` and `PHASE-4-NOTES.md:515-518`, which cite it by that name.

````markdown
### DEFERRED-01: `HALT_TYPES_NO_PRINTOUT` contradicted by S223-2648 p.6

- **Status:** RESOLVED
- **Source:** `docs/research/open-questions.md` Phase 4 section (§11.1 primary read, wave 0); `src/core/machine.ts:65`
- **Target:** before Phase 6 (the reentry showcase)
- **Added:** 2026-09-02
- **Resolved:** 2026-… — Phase 6 wave 0, `<sha>`, on `feature/phase-6-reentry`

Phase 4's bounded primary read (§11.1 target e, RECORD ONLY) found S223-2648 p.6: "a program stop
… will initiate a stop print-out." `src/core/machine.ts:65` declared `HALT_TYPES_NO_PRINTOUT = true`
— a programmed halt typed nothing. The two disagreed, and the manual is the primary source.

**The cost claim above was wrong, and the correction is recorded here rather than deleted.** This
entry said flipping the constant "would put eleven of them inside the `cc01.cor` demo log and move
`npm run cc01`'s byte-identical gate." Measured on 2026-09-03 at `53b46d4`:

    node build/tools/run-cor.js oracles/cc01.cor --iar 02000 --trace 1 | grep -c "OP \. "   ->  0

The trace holds **1241 level-1 instruction lines and not one op `.`**; the executed-op histogram is
J 325, D 153, `,` 138, W 133, S 131, ⌑ 115, V 75, C 47, B 36, G 33, ? 24, / 10, A 7, N 5, R 4, ! 3,
M 2, summing to 1241. It is also provable without the trace: `tools/run-cor.ts` breaks on the first
defined `StopReason`, and PASS requires that stop to be `instructionCheck` at 00322, so no `halt` can
precede it. The eleven was a static count of `.` sites in the core image — CC01A's error-halt sites,
reachable only on a failed check. **The change moved zero bytes of the cc01 transcript.**

Resolved by renaming the constant `PROGRAM_STOP_TYPES_S = true`, `[verified]` against S223-2648 p.6,
with a halt under MODE = I/E CYCLE typing the `C` line alone and the interlock and the two
emulator-side stops staying silent as one category ruling. See `docs/plans/phase-6-reentry.md` §9 and
`docs/BUILD-LOG-6.md` wave 0.

**Trigger (auto):** a Phase 6 plan document appears under `docs/plans/`.

```bash
ls docs/plans/phase-6-*.md >/dev/null 2>&1
```
````

The trigger block **stays**, unedited. `scripts/check-deferred.sh:69` is
`RESOLVED) rc=$((rc+1)); continue ;;` — a RESOLVED entry is counted and skipped *before* its trigger
is ever evaluated (read this session), so a live trigger under a resolved entry costs nothing and
falsifying it would be the dishonest alternative.

### 9.7 The research escalation — its own commit, research only

`docs/research/*` is never edited in a build wave (§2.3, and the Phase-1b / Phase-3 / Phase-5
precedent). The DEFERRED-01 rows in `docs/research/open-questions.md` are the one exception this
phase makes, and it is made the way DECISIONS.md 2026-08-31 §3.7 requires: **an escalation with its
own commit, touching `docs/research/open-questions.md` and nothing else.**

| row | what it says today | the amendment |
|---|---|---|
| `:174` | the `ui` row: *"Does a PROGRAMMED HALT type a stop print-out? `[unverified]`"* with the fallback *"Coded as `HALT_TYPES_NO_PRINTOUT`"* | **amended in place**: the question is answered, the answer is S223-2648 p.6, the constant is now `PROGRAM_STOP_TYPES_S` and the row points at the dated Phase 6 section |
| `:952` | *"**Phase 4 takes no action on it.** `HALT_TYPES_NO_PRINTOUT` is a `src/core` constant…"* | one dated sentence appended: acted on in Phase 6 wave 0 |
| `:1036-1037` | *"`HALT_TYPES_NO_PRINTOUT` is recorded only — wave 0's read of S223-2648 p.6 contradicts it, and no core edit is made in this phase."* | ditto |
| `:1054` | the wave-4 ledger row, with *"**Phase 4 CANNOT flip it** … flipping it would put eleven `S` lines into the cc01 transcript"* | ditto, **carrying the measured zero** — this is the sentence the eleven came from |
| `:1098` | *"`CONSOLE_LINE_LENGTH`, `DEFAULT_CARRIAGE_TAPE` and `HALT_TYPES_NO_PRINTOUT` are core constants cited the same way"* | renamed |

Nothing above `## Phase 1b — 2026-08-30` is touched, no other research file is opened, and the
dated `## Phase 6 — 2026-…` section is **wave 7's**, not this commit's (§16 item 9).

### 9.8 The tools path — every 1415 transcript through `machine.start()`

**The `S` line never reaches the CLI today, and that is a defect the rename alone does not fix.**
Measured this session:

```
$ node build/tools/run-deck.js demos/hello-dad.cards
1415 CONSOLE
  D ØØØØØ
  D
  S ØØØØ1 ØØØØØ ØØØØØ bb bbb b̲b̲b̲b̲          <- the ALTER turn
  A AĽ%1ØØØØ12$Ř
  S ØØØØ1 ØØØØØ ØØØØØ bb bbb b̲b̲b̲b̲          <- the RUN turn.  Then the deck halts, silently.
```

`tools/run-deck.ts:101` calls `m.run(max)`; `src/core/machine.ts:466` is
`run(maxInstructions) { return cpu.run(maxInstructions); }`; and `printStop` lives only inside
`start()` (`:355-374`), called at `:363` and `:370`. `tools/rpg.ts:133` calls `machine.run(RUN_BUDGET)` the same way. So after
the rename `npm run demo` and `npm run rpg` would still print a console log that ends where the
operator's does not — the one place a reader would go looking for the new line.

**Both tools move to a `start()` loop**, preserving their instruction ceilings exactly:

```ts
// tools/run-deck.ts — was `m.run(max);` at :101.  START_BUDGET joins the machine.js import.
let left = max;                                   // DEFAULT_MAX = 100_000 (:32), --max overrides
let stop: StopReason | undefined;
while (left > 0 && stop === undefined) {
  const slice = Math.min(START_BUDGET, left);
  stop = m.start(slice);                          // MODE is 'run' — set two lines above
  left -= slice;
}
```

`tools/rpg.ts:133` takes the same shape and keeps its `stop !== 'halt'` throw at `:134-138`.
At most 50 turns of the loop at `RUN_BUDGET = 100_000` (`tools/rpg.ts:31`), which is free.

**Nothing committed moves.** `tools/run-deck.ts:136, 153-166` compares the **page** and never the
console; `tools/rpg.ts:140`'s `boot` returns the page only and prints no console log at all. No test
shells out to either tool — `test/period-page.test.ts:64` merely names `run-deck.ts` in a comment
(verified, §9.5). The four goldens those two `--golden` paths guard stay at 348 / 3688 / 120 / 2522
bytes.

**Criterion.** The last `ConsoleLine` of the trajectory run has `id === 'S'` and its Op group is `.`
— the programmed stop, not the STOP key, not a mode change. It is asserted in
`test/tier4-reentry-storyboard.test.ts` through `machine.start()` and `createConsoleSession`, not
through the tools, because the tools' output is not committed; the tools change so the CLI **shows**
what the desk asserts. §10.4 owns the 1415 log golden that pins the whole roll around it, and §13
criterion 18 is the assertion.

### 9.9 The gate lines, under both orderings

`npm run check:deferred` is `bash scripts/check-deferred.sh`, which `cd`s to the repo root and
evaluates `ls docs/plans/phase-6-*.md` **against the working tree, not the index**. Run this session
with the dossier and the plan present but untracked:

```
$ bash scripts/check-deferred.sh
  [TRIPPED] DEFERRED-01     — `HALT_TYPES_NO_PRINTOUT` contradicted by S223-2648 p.6
Summary: 0 ok · 1 tripped · 0 manual · 0 no-trigger · 0 resolved            exit 1
```

**The gate is already red on this branch, before the plan commit**, because
`docs/plans/phase-6-panel-dossier.md` matches the glob on its own. Three consequences the plan owns:
the kickoff's "trips at the plan commit by construction" is wrong about the mechanism (a RESOLVED
entry is skipped before its trigger runs) and right about the outcome for a different reason;
**ordering B requires the dossier and the plan to be absent from `docs/plans/` on disk**, not merely
untracked, while B1 and B2's gates run; and — §12.2's measured detail — `scripts/check-deferred.sh:73`
puts `WATCHING` and `TRIPPED` in the **same case arm**, so moving the register entry to TRIPPED at the
plan commit changes no gate output at all. It documents what is true; it does not buy a gate.

**Ordering A — one red commit on the feature branch. The default.**

| # | commit | `npm run check:deferred` |
|---|---|---|
| A1 | the dossier + this plan + the register entry moved to **TRIPPED** (the register's own protocol: *"auto-trigger fired (set by checker output; commit when noticed)"*) | `0 ok · 1 tripped · 0 manual · 0 no-trigger · 0 resolved` — **exit 1** |
| A2 | wave 0: the §9.4 migration, the register to **RESOLVED** | `0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved` — exit 0 |
| A3 … | every later commit | unchanged, exit 0 |

Red window: exactly **one** commit, on `feature/phase-6-reentry`, `main` untouched, reported as such
in `docs/BUILD-LOG-6.md`'s Arrival section. **Nothing is falsified** — the entry says the work is not
done, because it is not: `CLAUDE.md`'s phase gate forbids implementation before Zarathustrum's go, and the
discharge is a `src/core` change.

**Ordering B — the escalation and wave 0 land before the plan commit. Never red.**

| # | commit | `npm run check:deferred` |
|---|---|---|
| B1 | the research escalation (`docs/research/open-questions.md` only), with `docs/plans/phase-6-*.md` **held outside the working tree** | `1 ok · 0 tripped · 0 manual · 0 no-trigger · 0 resolved` — exit 0 |
| B2 | wave 0's core discharge, tests, notes, register → **RESOLVED** | `0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved` — exit 0 |
| B3 | the dossier + this plan restored and committed | unchanged, exit 0 |

The price is stated plainly: a `src/core` change lands **before Zarathustrum has gated the plan**, and the
dossier has to be parked outside `docs/plans/` for two commits to keep the gate green, which is
bookkeeping in service of a green light rather than of a fact. **That is the whole of Zarathustrum's decision
1**, and the orchestrator recommends ordering A: one honest red commit that says the work is not
done, on a branch, for the length of one commit.

Either way the post-discharge line — `0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved`,
exit 0 — is what §12.2 carries from wave 0 to merge. DEFERRED-01 is the register's only entry
(the file is 38 lines; verified).

### 9.10 What closes wave 0

Wave 0's oracle is written by wave 0 and read by nothing later (§11's rule):

1. `npm run cc01` **byte-identical**: CC01A, CC01 COMPLETE, instruction check at **00322**, **1241
   instructions** — re-run this session and unchanged by construction, since the executed path holds
   no `.`;
2. `test/machine-console.test.ts`'s three cases — `['B','S']` after a halt in RUN, `['B','S','S']`
   after the operator's STOP, and the **new** `['B','C']` under I/E CYCLE;
3. `test/tier4-period-storyboard.test.ts` at its eight-`id` list and five matrix-35 `S ` rows;
4. `npm run check:deferred` at §9.9's post-discharge line;
5. every other gate of §12.2 unmoved, including all seven shipped goldens.

Evidence committed to `docs/BUILD-LOG-6.md` wave 0: the executed-op histogram with its zero, the
corrected register text, and the `grep -c "OP \. "` command that produced the zero.

---

## 10. The UI and the CLI

Phase 6 adds **no station**. `architecture.md:855` says *"an Autocoder program, no new machinery"*
and STATEMENT.md says *"it adds no station"*; the phase-4 plan's closing sentence promised exactly
that. What follows is the smallest set of edits that puts a second program on the desk, makes the
CLI show what the desk asserts, and pins the 1415 roll — plus one optional item that exists because
a 0.35-second run cannot be watched.

Total: **~40 lines under `src/ui/`, across three existing files, no file created** (§3.10).

### 10.1 The sample buttons

Today the desk offers samples at three places, all `?raw` imports because `demos/` sits outside
`public/` and a fetch that works under `npm run dev` 404s in a `vite build` output:

| station | file:line | button(s) | what they load |
|---|---|---|---|
| 1402 deck box | `reader/deckBoxView.ts:50`, button at `:139` | `sample deck` | `demos/hello-dad.cards` |
| coding sheet | `coding/sheetView.ts:37-38`, buttons at `:236`, `:242` | `sample program`, `sample data` | `demos/hello-dad.asm`, `demos/hello-dad.data.cards` |
| RPG spec sheet | `specs/sheetView.ts:32-33`, button at `:159` | `sample specs` | `demos/sales-summary.rpg` **and** its `.data.cards`, both boxes in one click |

**The coding sheet grows from two buttons to three; the spec sheet from one to two.**

| file | new `?raw` imports | new button | behaviour |
|---|---|---|---|
| `src/ui/period/coding/sheetView.ts` | `demos/reentry.asm?raw`, `demos/reentry.case.cards?raw` | `sample reentry` | one call to the file's own `setText(src, data)` (`:224-230`), setting both boxes — the same function `sample program` and `sample data` already call |
| `src/ui/period/specs/sheetView.ts` | `demos/reentry-summary.rpg?raw`, `demos/reentry-summary.data.cards?raw` | `sample reentry summary` | the four assignments `sample specs` already makes at `:160-165`, against the new pair |

**Four new `?raw` imports, two per file** — `:32-33` imports `sales-summary.rpg` and its
`.data.cards` **by name**, so the sibling inference at `tools/rpg.ts:225` gives the UI nothing and
the reentry job needs both files named too (§3.7).

**Zero shim work, and PHASE-4-NOTES §4(a) is stale in that half.**
`src/ui/period/raw-import.d.ts:33-46` already declares `*.cards?raw`, `*.asm?raw` and `*.rpg?raw`,
and its own comment at `:26` says *"Phase 6's `*.asm?raw` line goes here"* — it is already there. All
four new imports match a declared pattern. The plan says this once and does not repeat the stale
half of the hand-off (RULINGS §A 4).

**Four things deliberately not done here:**

- **`reader/deckBoxView.ts` is not touched.** A `sample deck` for `demos/reentry.cards` would be a
  ≈158-card `?raw` import in the page bundle for a route the storyboard does not use: §1 step 5 puts
  the deck in the hopper with PUNCH INTO HOPPER after ASSEMBLE, which is the period path. §3.9
  already lists the file as do-not-touch and this is the reason. (It is also where §14 R12's other
  ~12 kB of bundle would have come from.)
- **No existing button is relabelled** and no existing sample changes. `demos/hello-dad.asm` and its
  two goldens (348 and 2251 bytes) are untouched (§2.3).
- **No per-sample caption is drawn.** The coding sheet carries no caption beside its buttons today,
  and drawn text with no oracle is the class `phase-4-period-ui.md` §12's refusal grep (that plan's
  criterion 18a, carried by `test/period-refusal-grep.test.ts`) is the standing check on. What the page says about
  `demos/hello-dad.asm` is §10.5.
- **`src/ui/styles/period.css:311-313`'s comment is not amended.** It enumerates the *class* of page
  controls — *"sample deck, PUT DECK IN HOPPER, key the … HOPPER, ASSEMBLE, sample source, sample
  data and the listing's A/H toggle"* — and it already says "sample source" for a button labelled
  `sample program`, so it was never an inventory. Editing a stylesheet comment to track button
  labels invites exactly the drift it would be trying to prevent.

### 10.2 `tools/run-deck.ts` and `tools/rpg.ts`

Specified in full at §9.8: both move from `machine.run(n)` to a `machine.start(START_BUDGET)` loop
so the CLI's 1415 log carries the stop print-out the desk types, and neither committed page golden
moves because `--golden` compares the page. ~12 lines in `tools/run-deck.ts` (`:101`), ~10 in
`tools/rpg.ts` (`:133`). Wave 6 owns both edits.

### 10.3 The storyboard extension

`test/tier4-reentry-storyboard.test.ts` (**NEW, wave 6, ~320 lines**) is §1 walked headless, in the
shape `test/tier4-period-storyboard.test.ts` established: `createConsoleSession(machine, hooks)`,
`createAutocoderSession()`, `createRpgSession()`, `createSession` for the unit-record station — no
DOM (`expect(typeof globalThis.document).toBe('undefined')` is the first assertion), and `main.ts`'s
own hooks as counters plus the module-local `running` latch.

| §1 step | what the test does | asserted |
|---|---|---|
| 2 | `asm.setSource(demos/reentry.asm)`, `asm.setDataText(demos/reentry.case.cards)` — the two files the `sample reentry` button hands over | the sources are read from disk, never inlined |
| 4 | ASSEMBLE | `ok === true`, `flagged` empty, **`warnings` empty**; the object-card count taken from `assemble(demos/reentry.asm).deck.records.length` and asserted against **the number wave 3 recorded in `docs/BUILD-LOG-6.md`**, never against §6.13's ≈154 estimate; the high-water from `AssemblyResult.symbols` ≤ **09,000** |
| 5 | PUNCH INTO HOPPER, then `readerStart()` + `readerEndOfFile()` | the hopper holds `assemble(...).deck.records.length + 4` cards — object deck, loader bootstrap, loader body, execute card, case card — asserted against the same recorded number, with §6.13's ≈158 carried only as the estimate it is |
| 6 | `session.stopKey()`, `turn('display')`, `startKey()`, the five keyed digits, `turn('alter')`, `startKey()`, the twelve `AL%1000012$R` keystrokes with their two word marks, `computerReset()`, `turn('run')`, `startKey()` | `BOOTSTRAP_KEYSTROKES` drives it, as the shipped storyboard does |
| 7 | the four-term frame gate of `src/ui/main.ts:97-98`, **verbatim**, looping `machine.start(START_BUDGET)` as `:99` does | `stop === 'halt'`, and the frame count printed, never asserted (§13 criterion 19) |
| 8 | — | **`state.console.at(-1)!.id === 'S'` and its Op group is `.`** — criterion 18, and the reason wave 0 exists |
| 9 | `paginate(paper, carriage, 66)` and `renderGreenBar(paper, {chain:'A', formLines:66})` | three forms, the identity against `test/golden/reentry.page.txt` (wave 4's, read never written) |
| 10 | `machine.snapshot().punch.stackers` | 92 in pocket `0`, and the pocket deep-equals `demos/reentry-summary.data.cards` (§8.3) |
| 11-12 | `rpg.setSpecText`, `rpg.setDataText`, GENERATE, SEND TO AUTOCODER, ASSEMBLE, PUNCH INTO HOPPER, run | the extract page against `test/golden/reentry-summary.page.txt` (§8.7) |

The gate copied at step 7 is the four-term gate, not the budget. §10.6's pacing item changes only
the *argument* passed to `machine.start()` and leaves `if (running && !consoleSession.held &&
consoleSession.detent === 'run' && machine.mode === 'run')` exactly as it stands, so both storyboard
tests remain verbatim copies of it and neither moves.

### 10.4 The 1415 log golden

`test/golden/reentry-console.txt` (**NEW, wave 6**) — **the whole roll** of the trajectory run
through `renderSelectric`, the renderer `test/tier4-period-storyboard.test.ts:259-260` already uses
and the one `src/ui/period/console/logView.ts:216` draws the paper from. Eight lines, in order:

```
S    the STOP key
S    the turn to DISPLAY
D    the address line, 00000
D    the display data line
S    the turn to ALTER
A    AL%1000012$R, with its two word marks
S    the turn to RUN
S    THE PROGRAMMED HALT — the line that does not exist today
```

**Rendered at `{ matrix: 'flush', marks: 'render', spacing: 'render' }`, not at `'indent'`, and the
reason is a written promise this plan will not break.** `src/ui/period/console/selectric.ts:59-83`
declares `MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT = 30` as a `[likely]` **origin** — S223-2648 Fig.5
p.9 and A22-0526-3 Fig.42 p.46 give the positions 35 and 30 as `[verified]` but give no unit, origin
or left margin — and its own header says: *"The primary-source byte comparison in
test/period-selectric.test.ts runs at `matrix: 'flush'` PRECISELY so it does not depend on this
ruling; only the browser passes `'indent'` … If the origin is ever settled, this one number changes
and **no golden moves**."* A console golden taken at `'indent'` would make that sentence false the
day it lands, and would put a Phase 6 byte count behind an open Phase 4 question for no gain: the
**difference** between a 35-line and a 30-line is what the constant asserts, and the drawn indent is
already exercised — the storyboard asserts the matrix-35 row count in the shape
`tier4-period-storyboard.test.ts:263-265` uses, five rows after wave 0. The golden pins the roll; the
row-count assertion pins the indent; neither pins the origin. §15 row 20.

**Size, derived rather than guessed.** Measured this session against
`node build/tools/run-deck.js demos/hello-dad.cards`: a `S`/`C`/`E` field line is **53 bytes**
(`S ØØØØ1 ØØØØØ ØØØØØ bb bbb b̲b̲b̲b̲` — `Ø` is two bytes and each combining low line U+0332 is two),
a `D` address line **12**, a `D` data line **82** at `CONSOLE_LINE_LENGTH`, the `A` line **22**. Five
field lines, one of each `D`, one `A`, seven newlines and five blank lines for the field lines'
double spacing:

```
5 x 53  +  12  +  82  +  22  +  7  +  5   =   ~ 393 bytes
```

**≈390 bytes** is the figure §3.7 and §12.3 plan against — the earlier ~1,400 estimate was high by a
factor of about three and a half — and wave 6 records the measured number in `docs/BUILD-LOG-6.md`.
The addresses in the reentry roll differ from hello-dad's (the halt is inside `ORG 00500`'s code) but
not the widths.

The golden covers the **trajectory** run only. The RPG job's roll is not committed: it is a second
run of the same eight-step dialogue, the last line of which is the same `S`, and a second golden of
the same shape would churn on every wave that touches the deck while proving nothing the first does
not (the same argument that refuses a third listing golden, §2.2).

### 10.5 What the page says about `demos/hello-dad.asm`

`demos/hello-dad.asm:2` is titled `JOB  HELLO DAD - REENTRY TABLE`. It prints five lines off
**five** hand-typed cards — a title card, a column-heading card and **three** data rows, all read
from `demos/hello-dad.data.cards` (five cards; `demos/hello-dad.cards` is six lines, the object card
followed by those five),
headed `BALLISTIC REENTRY TRAJECTORY - RECONSTRUCTED SAMPLE - NOT FLIGHT DATA` — and it is byte-locked
by a 348-byte page golden and a 2,251-byte listing golden. It is not touched.

**The desk says nothing new about it** (Zarathustrum's decision 8, default): no caption, no ordering change,
no relabelling. The buttons simply grow from two to three, which is what a second program on a
coding sheet looks like.

**The walkthrough frames it, and frames it honestly.** `docs/reentry-walkthrough.md` opens on the
sketch beside the real thing:

- hello-dad's three rows are **invented illustrative numbers** — at t = 40.0 s it prints h = 152,300
  and V = 19,640, where the integration this phase runs gives V = 22,939.54 at h = 150,000 — and it says
  so, because a file titled `HELLO DAD - REENTRY TABLE` that a reader could mistake for computed
  output is the one place this project could tell a lie by omission;
- the continuity is real and worth naming: hello-dad's first row is **400,000 ft**, and the case
  card's `ALTITUDE-E` is **400,000 ft** for that reason (§4.2, §6.12), echoed in the heading. Its
  23,100 ft/s against the case card's 23,000 ft/s is the sketch's, not the run's;
- hello-dad reads its five printed lines off cards; `demos/reentry.asm` computes ninety-two rows
  from one case card. Same title, same page shape, same disclaimer, and one of them is a program.

### 10.6 The real-time pacing item — Zarathustrum's decision 6, its own wave item

**The problem, in this plan's own numbers.** The run is 41,543 instructions (§5.10). At
`START_BUDGET = 2000` (`src/core/machine.ts:45`) that is **21 frames**, about **0.35 s** of wall
clock at 60 Hz. §1 step 7 is "watch the paper move", which is step 11 of the Phase 4 storyboard, and
a third of a second is not something a person watches. The alternative on offer is a walkthrough
sentence, and a sentence is not a moving carriage.

**The design — UI only, ~20 lines in `src/ui/main.ts`, and `START_BUDGET` is not touched.** The
constant is core and no phase should move it on its own authority (§2.2). What changes is the
**argument** passed to `machine.start()` in the one frame at `:86-111`:

```ts
// OPEN: REAL_TIME_PACING_IS_ONE_EMULATED_MICROSECOND_PER_REAL_MICROSECOND — a ruling, ours, UI only.
// The desk runs at 1411 speed so §1 step 7 is watchable.  START_BUDGET (machine.ts:45) is the
// CEILING and is never exceeded, so unpaced behaviour is exactly today's.
// FALLBACK: delete this and pass START_BUDGET, which is what the checkbox off-position does.
const MAX_CATCH_UP_MS = 100;      // a backgrounded tab must not dump seconds of flight into one frame
let paced = true;                 // default ON at the desk
let lastNow: number | undefined;

const budgetFor = (now: number): number => {
  if (!paced) return START_BUDGET;
  const dtMs = lastNow === undefined ? 0 : Math.min(now - lastNow, MAX_CATCH_UP_MS);
  lastNow = now;
  const n = machine.cpu.instructions;                       // machine.ts:117 exposes the Cpu
  const usPerInstruction = n === 0 ? 1 : machine.cpu.microsecondsSimulated / n;
  return Math.max(1, Math.min(START_BUDGET, Math.round((dtMs * 1000) / usPerInstruction)));
};
```

and in the frame, `machine.start(START_BUDGET)` at `:99` becomes `machine.start(budgetFor(now))`,
with `frame` taking the `DOMHighResTimeStamp` `requestAnimationFrame` already passes it and
`lastNow = undefined` set whenever the gate at `:97-98` is false, so a paused desk banks no time.

**The control**: a checkbox labelled `1411 SPEED`, appended to the tab bar `main.ts:44-52` already
builds, styled by one inline `font: inherit` — the technique `phase-4-period-ui.md` §10.3 sanctions and the same one
the two tab buttons use. No CSS class, no `index.html` edit, and `src/ui/internals/controls.ts`
stays byte-frozen at SHA-256 `a6d90f54…` (verified this session). Its `change` handler is
`paced = box.checked; lastNow = undefined; kick();`.

**The numbers it produces**, all derived from §5.10:

| | unpaced (today) | paced |
|---|---|---|
| instructions per frame | 2,000 (the ceiling) | ≈ **43** — 16,667 emulated µs at the measured **383 µs per instruction** (15,925,705 / 41,543) |
| frames for the run | **21** | ≈ **955** at 60 Hz |
| wall clock | ≈ **0.35 s** | ≈ **15.9 s**, the time the 1411 took |

It paces off the real frame delta rather than assuming 60 Hz, so a 120 Hz display runs the same wall
clock at half the budget per frame.

**Its oracle — because a wave item needs one, and a screenshot is not one.**
`test/period-pacing.test.ts` (**NEW, wave 6, ~60 lines**, and §3.7 and §11's wave 6 row both carry
it), in the shape `test/period-no-second-frame-loop.test.ts` already uses — it reads `src/ui/**` as
**text** and asserts over it:

1. `src/ui/main.ts` contains exactly **one** `machine.start(` call site (the frame's) — asserted
   over the file with **comments stripped first**, the technique `test/period-refusal-grep.test.ts`
   already ships (`strip` at `:149`, applied at `:248`). A raw text scan counts **two** today:
   `main.ts:95` is a comment reading *"machine.start() dispatches on machine.mode"* and `:99` is the
   call. Stripping comments is what makes "exactly one" the property it is meant to be;
2. `budgetFor`'s **return** is clamped by `Math.min(START_BUDGET`, and the one call site's argument
   is `budgetFor(`. That is what a text assertion can actually establish and it is the whole of the
   safety property — after the change the call site reads `machine.start(budgetFor(now))` and the
   clamp lives inside `budgetFor`, so asserting that the *argument expression* contains
   `Math.min(START_BUDGET` would assert something false about a correct build, and asserting only
   that the clamp appears somewhere in the file would assert something true of a broken one;
3. `START_BUDGET` imported from `src/core/machine.js` is still `2000`, asserted by value, not text;
4. `requestAnimationFrame(` still appears in exactly one file — the invariant
   `test/period-no-second-frame-loop.test.ts` owns, re-asserted here so the pacing item cannot
   introduce a second loop; that file itself is **not edited** (§3.9).

**If Zarathustrum declines** (decision 6, the alternative): the item, the test file and the checkbox are all
dropped as a unit, `src/ui/main.ts` is not touched at all, the phase's `src/` change falls to ~90
lines across eight files, `npm test` lands one file and ~4 cases lower than §12.2's figure, and
`docs/reentry-walkthrough.md` carries the period note instead — **15.93 s of unaccelerated 1411 time
against 11.7 s of 1403 time at 600 lpm (A22-0526-3 p.67), so the job is compute-bound by about a
third**, which is §5.10's corrected figure and not the dossier's inherited printer-bound claim. The
orchestrator recommends taking it.

---

## 11. Waves, each closed by its oracle

Build order is **backwards from the consumer**, the Phase 3 and Phase 5 order: the reference the page
will be judged against exists before the page, the antilog is proved digit for digit before anything
calls it, and the integration is proved numerically before a column map is cut. Eight waves, 0-7, one
commit each.

**The re-cut, and why.** The rulings' wave list bundles *"the trajectory deck, page golden, column
map first"* into one wave closed by one golden. That is the defect the panel named against
exact-solution-first's own wave 3 — ~1,468 lines closed by a single binary signal with no
intermediate oracle — and it is worse here, because the deck at that point carries the antilog, the
derivative, RK4, two guards, nineteen MCE control words, a heading routine, an overflow routine and a
summary block, and a byte mismatch in a ~14,600-byte golden says only *"something is wrong"*.
Splitting it gives **wave 3 a numeric oracle** (92 rows of (V, h) against layer 3, plus the four NACA
checkpoints against layers 1-2, with no golden byte in the judgement) and **wave 4 a page oracle**
(parse-back against layer 2, plus the mutation pass) that wave 3 cannot fake. The cost is one extra
commit and one transient golden, both stated below. The rulings authorise the re-cut in the same
sentence that gives the list.

**THE RULE, and it is the most load-bearing line in this section:** *at the commit that closes wave N,
every input its oracle reads was written by a wave ≤ N.* Each row names its inputs so the rule can be
checked by reading rather than by trusting. A later wave may **grow** an input an earlier oracle reads
— `demos/reentry.asm` is grown by waves 4 and 5 — and that earlier oracle then runs as a regression on
the grown file, which is the point of ordering the waves this way and not a violation. What the rule
forbids is a wave closing on a file that does not yet exist, or on one whose content a later wave will
have to supply.

| Wave | Files owned this wave | Inputs its oracle reads | The oracle that closes it | Evidence committed |
|---|---|---|---|---|
| **0 — DEFERRED-01** (`src/core`, and the only core change in the phase) | §3.1's list: `src/core/machine.ts`, `test/machine-console.test.ts`, `test/tier4-period-storyboard.test.ts`, `src/ui/period/console/{session,rotaryView}.ts`, `docs/deferred-work-register.md`, `PHASE-1-NOTES.md`, `PHASE-4-NOTES.md`, `docs/BUILD-LOG-6.md` (opened), `docs/screenshots/phase-6/README.md`; the `docs/research/open-questions.md` amendment as **its own escalation commit** (§9.7) | only files that exist on `main` at the arrival commit | **Identity everywhere except the four sites the rename is FOR.** (a) `npm run cc01` byte-identical — CC01A, CC01 COMPLETE, instruction check at **00322**, **1241 instructions** — which §9.6's measurement predicts exactly, because the executed-op histogram contains no op `.` at all and the rename therefore moves **zero bytes** of that transcript; a moved byte is a defect in the rename. (b) All seven shipped goldens unmoved at §12.2's byte counts. (c) `test/machine-console.test.ts`'s two inverted cases — `.` in RUN gives `['B','S']`, a STOP after it `['B','S','S']` — **plus one new named case**: `.` under MODE = I/E CYCLE gives `['B','C']`, the `IE_CYCLE_HALT_TYPES_C_ALONE` ruling (§9.2, §15 row 12). (d) `test/tier4-period-storyboard.test.ts:262`'s id list gains one `'S'` and `:263-265`'s four `S ` rows at matrix 35 become five — the two assertions verified present this session. (e) `npm run check:deferred` per §12.2's ordering table | `docs/BUILD-LOG-6.md` wave-0 section: the executed-op histogram, the corrected register text with the command that measured the zero, the gate line verbatim, and **`docs/screenshots/phase-6/wave-0-1415.png`** — the Selectric roll after `demos/hello-dad.cards` halts at the desk, showing the `S` line that did not exist yesterday. It costs nothing (the page golden does not move) and it is the only picture of what this wave bought |
| **1 — the reference layers and the published tolerances.** No `src/`, no `demos/` | `test/fixtures/reentry-reference.ts` (layers 1, 2 and 3; **no `src/` import of any kind**), `test/reentry-reference.test.ts`, `test/reentry-tables.test.ts`, `test/reentry-scaling.test.ts` | `docs/research/avco-and-reentry.md` (read, never written) and its own fixture | Four, and none of them is a golden. (a) §4.5's layer-1-against-layer-2 table at the tolerances **this wave publishes in `docs/BUILD-LOG-6.md` before any golden exists** — eq.13 per row, `Ei` for elapsed time, `erf` for heat load, eqs.15/16/17 and eq.7. (b) `ANTA` against `Math.pow` at all 100 entries **and 200 interpolated points**, within **1.0e-5** relative, with the quadratic residual's truncation bound asserted numerically rather than quoted. (c) layer 3's worst \|V − V A-E\| ≤ the published **0.50 ft/s**, the bound §4.5 derives from S and the step count. (d) §5.2's scaling table asserted **as data**: every row's digit count ≥ the range it claims, every rescale offset = S_a + S_b − S_target (§5.3), every product's digit count = `floor(log₁₀(peak · 10^(S_a+S_b))) + 1`, and `PROD` = **17**. **Stated plainly, because the oracle's reach is narrower than its name:** the S values and the offsets are transcribed into `test/fixtures/reentry-reference.ts` from §5.2 and §5.3, so this wave checks the fixture against **the rule**, not the fixture against the deck — a consistent-but-wrong pair passes here. Nothing mechanically ties `demos/reentry.asm`'s literal `WORK-n` offsets to the table until **wave 3 parses the `MLC` and `A` offsets out of `demos/reentry.asm` and asserts them against the same table** (its oracle (f) below), which is where a transcription that agrees with itself and disagrees with the deck is caught | the tolerance table in `docs/BUILD-LOG-6.md`, dated, **before** a page exists — the one artifact that makes §14 R3 checkable |
| **2 — the antilog probe, the first Autocoder that runs** | `demos/probe-antilog.asm`, `demos/probe-antilog.data.cards`, `test/tier3-reentry-antilog.test.ts` | wave 1's layer 3 (its antilog only); the shipped assembler, loader, 1402 and 1411 | The probe deck through `assemble()` → `loaderDeck()` → the real 1402 → the real condensed loader → the real 1411 → the 1403, **digit for digit against layer 3's antilog at 100 arguments spanning −10 … +6**, with the negative-argument bias, the two-digit field slice, the ten-position indexed fetch and the Horner residual each named among them — the three places this program can be silently wrong and the one non-elementary operation in it (§5.6). Plus `assemble()` returning `ok: true`, `flagged` empty, **`warnings` empty** | the probe's printed page and the per-argument diff table in `docs/BUILD-LOG-6.md`. **No golden**: the probe is scaffolding whose numbers are checked against a function, and a golden would freeze a page nothing later reads |
| **3 — the derivative, the RK4 driver, the guards** | `demos/reentry.asm` (≈596 source cards: comment block, `CTL 1`, `ORG 00500`, the case-card read and its two consistency checks, constants, `ANTA` and the work block's ~40 `DCW` cards (§5.5), `ANTLOG`, `DERIV`, the RK4 driver, loop control, the `h ≤ 0` and `y1 > 0` guards, and a bare four-column dump **printed at §7.2's column-1-to-4 positions**), `demos/reentry.case.cards`, `demos/reentry.cards`, `test/golden/reentry-dump.page.txt` (**transient — see §11.1**), `test/tier3-reentry-integration.test.ts` | wave 1's layers 1, 2 and 3; wave 2's `ANTLOG`, copied forward; the shipped toolchain | Numeric, not photographic. (a) the emulated (V, h) at **every one of the 92 steps** equals layer 3 **exactly** — the regression pin, with §11.2's tie-break stated. (b) max \|V − V A-E\| over the 92 rows ≤ **0.50 ft/s**. (c) the four NACA checkpoints against the **emulated** run at §4.5's tolerances. (d) the `y1 > 0` guard fires at W/(C_D A) = **5,000 lb/ft²** and the deck refuses eqs.16-17 rather than printing them; the `h ≤ 0` guard refuses step 93 at h = −62.2 ft. (e) `assemble()` `ok` / no flags / **no warnings**, and `demos/reentry.cards` deep-equal to `assemble(demos/reentry.asm).deck` — Phase 3's closed loop. (f) **the deck's own rescale offsets parsed out of `demos/reentry.asm`** — every `MLC SRC-n,DEST` and `A +5,WORK-n+1` in the arithmetic chains — and asserted against §5.3's table, which is the step that makes wave 1's data assertion mean something about the program rather than about the fixture | the 92-row diff table; **the FIRST measured numbers** — instruction count, emulated µs, code length, **object-card count**, high-water — and **the memory map republished** in `docs/BUILD-LOG-6.md` against the measured code length **and the work block's measured sum against §5.11's 391-in-478**, before wave 4 commits a single print position |
| **4 — the page** | `demos/reentry.asm` **grown by ≈202 cards** (heading block, twelve columns, overflow heading, summary block, the printed literals), `demos/reentry.cards` regenerated; `test/golden/reentry.page.txt`; `test/tier4-reentry-target.test.ts`; `test/reentry-page-parse.test.ts`; **and the declared deletion of `test/golden/reentry-dump.page.txt` with wave 3's one golden case** (§11.1) | waves 1 and 3 | **§7.2's column map — end positions, MCE control words, digits per column and the bound that sets them — committed to `docs/BUILD-LOG-6.md` in this commit and BEFORE the golden is cut**, the Phase 5 §10.5 discipline under Phase 5 criterion 6's correction (the map and the page land in the same commit; the ordering that matters is authorial and is reviewed, not timestamped). Then: (a) `renderGreenBar(paper, {chain:'A', formLines:66})` equal to the golden **byte for byte over three `\f`-separated forms**, one break by the **channel-12 overflow latch** and one by a **programmed `CC1 1`**; (b) **the page parsed back into numbers** — every computed column, every row, within **one unit in its last printed digit** of layer 2, with §12.1's parse preconditions asserted first; (c) the heading block's edited values **decoded off the page** and equal to the case card's; (d) every form carries `RECONSTRUCTION`; (e) the **mutation pass M1-M5** all go red (§4.7, §11.3); (f) **no character outside the chain-A arrangement in any printed literal** (§7.8) | the golden; the column map; `docs/screenshots/phase-6/wave-4-1403.png` — the 1403 station **on the plain-white side**, which is the question PHASE-4-NOTES §4(c) actually asks and no test can answer |
| **5 — the punch and the RPG job** | `demos/reentry.asm` **grown by ≈20 cards** (`PAREA`, `PAGM`, `SW PAGM`, the card builder, `P1 0,PAREA`, `BA1`), `demos/reentry.cards` regenerated — **the last wave that moves either**; `demos/reentry-summary.data.cards`; `demos/reentry-summary.rpg`; `test/golden/reentry-summary.page.txt`; `test/reentry-punch-card.test.ts`; `test/rpg-no-control-break.test.ts`; the punch-station retirement at `hopperView.ts:59-70`, `:71`, `:74-77`, `:137`, `:145`, `stackerView.ts:98-101`, `keysView.ts:179-180`, `test/period-reader.test.ts:55, 212-220` — **every site read this session** (§8.8) | waves 3 and 4; `demos/sales-summary.rpg` (read, never written); the shipped RPG generator | (a) §8.2's card contract in **both** directions, and the committed deck **deep-equals `machine.punch.pockets['0']`** after the trajectory run — 92 cards in `punch.stackers['0']`, which is what makes *"no trajectory number is ever hand-typed into a file"* enforceable. (b) §8.6's **four-clause symbol predicate** over `assemble(generate(...).source).symbols` and `generate(...).cards`, asserted positively over the trajectory job **and inverted over `demos/sales-summary.rpg`**, so it cannot rot into a tautology. (c) the RPG extract page byte for byte through the real generator → assembler → loader → 1402 → 1411, **with the reconstruction line asserted on every form of it too**. (d) `test/period-refusal-grep.test.ts` still passes over the replacement drawn text — the retirement rewrites a drawn label, and that file is the standing gate on drawn labels, with its case-sensitive `REFUSED_TOKENS` (`:87-90`) and its per-file floors `AT_LEAST` (`:71-76`, `stackerView.ts` ≥ 5 labels and `keysView.ts` ≥ 12) both binding the replacement prose (§8.8) | both goldens; the punched deck; `docs/screenshots/phase-6/wave-5-punch.png` — the punch feed with 92 cards in pocket 0 and the drawn line that no longer says this 1402 does not punch |
| **6 — the desk and the tools** | `test/tier4-reentry-storyboard.test.ts`; `test/golden/reentry-console.txt`; **`test/period-pacing.test.ts` if Zarathustrum takes decision 6**; and the edits §3.7 enumerates — `coding/sheetView.ts` (+2 `?raw` imports, a third sample button), `specs/sheetView.ts` (+2 imports, a second button), `tools/run-deck.ts:101` and `tools/rpg.ts:133` onto a `start(START_BUDGET)` loop, and **the optional pacing item in `src/ui/main.ts`, Zarathustrum's decision 6** | waves 3, 4 and 5 in full | The **whole two-job walk headless in node through the period session**: sample → ASSEMBLE → PUNCH INTO HOPPER → key `AL%1000012$R` → RUN → the page **and** 92 punched cards → the RPG sheet → GENERATE → SEND TO AUTOCODER → assemble → run → the extract page. Within it, three assertions this phase exists for: **the last `ConsoleLine` has `id === 'S'` and its Op group is `.`** — the programmed halt, not the STOP key, not a mode change; the **1415 log golden, the whole roll** through `renderSelectric` at `matrix: 'flush'` (§10.4); and both goldens reached through `machine.start()` rather than `machine.run()`, since `printStop` lives only inside `start()`. Plus the two new `--golden` CLI lines of §12.2 passing, and — if the pacing item is built — `test/period-pacing.test.ts`'s four text assertions (§10.6) | `docs/screenshots/phase-6/wave-6-desk.png` — the whole desk in both tabs; the console golden; the measured wall-clock figure with and without pacing |
| **7 — the record** | `docs/reentry-walkthrough.md`; `PHASE-6-NOTES.md`; `test/reentry-open-constants.test.ts`; `docs/BUILD-LOG-6.md` closeout; the dated `## Phase 6` section of `docs/research/open-questions.md` | every earlier wave | (a) the `// OPEN:` **set difference in both directions**, mechanically, between the constants grepped out of §16 item 3's four source domains and `PHASE-6-NOTES.md` §1 — `test/reentry-open-constants.test.ts`, the sweep Phase 4's §16 item 3 claimed and never wrote. (b) every §15 row reconciled to what the build actually did. (c) the walkthrough states the three caveats no artifact can carry — the column layout is period-plausible and undocumented, RK4 as Avco practice is unverified, and DKR is itself ±10-20 %. (d) **criterion 21's human walk, run and recorded by name and date** | the walkthrough; the notes; the closeout gate lines |

Commit per wave; **Opus adversarial review per wave with fixes applied before the commit**; a
whole-branch Opus review before merge; §12.2's gate at every commit with its numbers **in the commit
message**, never changed silently. Branch `feature/phase-6-reentry`, worktree per the Phase 2/3/5
precedent, every worker Opus or lower, `main` never pushed without Zarathustrum's per-instance word.

**That paragraph is Zarathustrum's decision 10, and it is priced rather than assumed.** RULINGS §F 30 marks
the whole process shape as his at the gate. The default is the paragraph above, verbatim; the four
terms and what relaxing each costs:

| term | default | the alternative, priced |
|---|---|---|
| **branch and worktree** | `feature/phase-6-reentry`, a worktree per the Phase 2/3/5 precedent | build on the branch in place: saves one `git worktree add`, and costs the ability to run `main`'s gate side by side while a wave is red — which §12.2's "identity everywhere" wave-0 oracle is easiest to check by doing exactly that |
| **the orchestrator's seat** | the build orchestrator is an **Opus** subagent (Fable seats substituted by Opus this session, Zarathustrum's instruction, `CLAUDE.md` model policy); every worker Opus or lower, Sonnet only for mechanical work | a Fable build orchestrator, if Zarathustrum restores the Fable seat — no plan change, one line in the launch |
| **review cadence** | **per-wave Opus adversarial review, fixes applied before the commit**, plus a whole-branch review before merge | one whole-branch review instead of eight: saves seven passes and gives up the property §11 is built on — that a wave's defects are found while its own oracle is the only thing in the diff. Phase 4's and Phase 5's records both carry per-wave findings the whole-branch pass did not reach |
| **screenshots** | one browser shot per UI-visible wave (0, 4, 5, 6) under `docs/screenshots/phase-6/`, §11.6 | drop them: saves four `claude-in-chrome` runs and four PNGs, and leaves **§14 R16 with nothing in its mechanical column and nothing in its human column either** until criterion 21 at the very end. §11.6 exists because every gate in this plan goes green on a page nobody has looked at |

`main` is never pushed without Zarathustrum's per-instance authorisation under any of the alternatives; that
term is not a decision.

### 11.1 The one declared cross-wave deletion — wave 3's golden, and why it is not an ownership breach

Wave 3 prints a four-column dump; wave 4 replaces it with the twelve-column page. So
`test/golden/reentry-dump.page.txt` **cannot survive wave 4**, and pretending otherwise would leave a
worker to discover it mid-wave. It is declared here, in both wave rows, and in §3.5.

Two rules make the deletion safe rather than merely honest:

1. **Wave 3 prints columns 1-4 at §7.2's own print positions** — TIME 14-19, ALTITUDE 23-29, VELOCITY
   33-38, V A-E 42-47 — so wave 3's *numeric* cases parse by the committed column map and **do not
   move when wave 4 adds columns 5-12 to their right and a heading block above them**. Only the
   golden's bytes change, and the golden is one named `it(...)` in `test/tier3-reentry-integration.test.ts`.
2. **Wave 4 deletes exactly that one case, in the same commit as the golden**, and touches no other
   case in wave 3's file. The deletion is safe because wave 4's own oracle **strictly subsumes** it:
   the page parsed back into numbers checks the same four columns on the same 92 rows against layer 2,
   which is a stronger statement than a byte comparison against a page wave 3 authored.

This is the one edit in the phase to a file an earlier wave owns. Phase 5's rule was *"an append adds
cases; it never edits an existing one"*; this is a **declared deletion of one case together with its
subject**, and the whole-branch review checks that wave 4 weakened nothing else in wave 3's file — a
`git diff` of one path, named in advance.

### 11.2 The tie-break between the regression pin and the gate — written before the build, not after

The rulings demote layer 3 from oracle to regression pin *"because it and the deck are written from
the same scaling table by the same team"*. That demotion is only real if the plan says what happens
when the two disagree, which is precisely what the testability judge found missing. So:

| what happened | what it means | what is fixed |
|---|---|---|
| criterion 8 red, criterion 13 green | the deck agrees with double precision to a printed digit and disagrees with the simulator: **the simulator is wrong** | `test/fixtures/reentry-reference.ts`'s layer 3, in a commit that says so and cites the row |
| criterion 13 red | **the deck is wrong**, whatever criterion 8 says — layer 3 is not in criterion 13's path and cannot be edited into it | `demos/reentry.asm` |
| both red | the deck | `demos/reentry.asm` |
| criterion 8 green, criterion 13 red, and the simulator "would pass if…" | the shared-implementation failure the demotion exists to catch | the deck; and `PHASE-6-NOTES.md` §2 records that the pin agreed with a wrong answer |

Editing **layer 1 or layer 2** to make anything pass needs Zarathustrum's authorisation and is its own commit
with its own reason (§4.5's published rule, verbatim). Widening a published tolerance is the same
class of act. Layer 3 may be corrected freely against layers 1-2 and never against layer 4.

### 11.3 The mutation pass — and the fifth mutation the panel did not ask for

The panel's finding was that *"nothing checks that the tolerance assertions actually FAIL when a
constant is perturbed, so a column test that parses the wrong print positions and compares empty
strings passes forever"*. §4.7's M1-M4 perturb reference constants by one unit and require the column
and tolerance assertions to go red. **M1-M4 do not catch the failure the finding actually describes**:
if the parser returns empty strings, perturbing a reference constant changes what it is compared
against and the vacuous comparison stays green. So the fifth mutation exists, and its reasoning
belongs beside the wave that runs it:

- **M5 — the parse itself.** Shift one column's start position by one and require the same assertion
  to go red. That is what proves the parser is reading printed digits and not whitespace.
- **And two preconditions asserted before any comparison runs** (§12.1): the parse yields **exactly 92
  detail rows**, and every one of the ten computed fields on every row is non-empty and parses as a
  number. A test that compares nothing must fail at the precondition, not pass at the comparison.

M1-M5 live in `test/reentry-page-parse.test.ts` (wave 4) and each is a named case that **applies its
mutation, asserts the failure, and restores** — never a committed-red test.

### 11.4 The re-cut protocol — what may move, what may not, and who authorises each

Four artifacts in this phase are frozen by an act rather than by a file permission, and each has a
different rule. Stated together so no wave has to reason it out.

| artifact | frozen at | may it be re-cut? |
|---|---|---|
| the **published tolerances** (§4.5) | wave 1, in `docs/BUILD-LOG-6.md`, before any golden | **Not widened without Zarathustrum's authorisation**, and then in its own commit with its own reason. Tightening is free. Checked at close-out by `git log --follow docs/BUILD-LOG-6.md` against wave 1's section |
| the **column map** (§7.2) | wave 4, in `docs/BUILD-LOG-6.md`, in the golden's own commit and authorially before it | A re-cut lands in the **same commit** as the change that needed it, with its reason in the build log. A re-cut that moves the map **after** the golden is a defect, not a re-cut |
| the **memory map** (§5.11) | published in the plan at the estimated density and the estimated 486 instructions; **republished by wave 3 with the measured code length AND the measured work-block sum** | The wave-3 republication is expected and is not a deviation — it is the whole reason wave 3 lands before wave 4. It republishes **four** numbers, not one: the code block against 4,910, the **work block against 391 itemised in 478**, the constants block against 440 and the **literal block against 1,150** — the last two being allocations the plan never itemised (§7.9 says so of the literals and names F1 as the recovery if the segment rule puts them ~100 over), and the work block having been twelve positions over before `ARG` and `ARGF1` were put back into it (§5.11). Any later movement is a fallback being taken (§5.11's F1/F2) and is logged as one |
| `demos/reentry.cards` | regenerated by waves 4 and 5 whenever `demos/reentry.asm` grows | **Mechanical, never authored.** It must always deep-equal `assemble(demos/reentry.asm).deck`, asserted in test, so a hand edit is a red gate rather than a review finding |

Budget: **two re-cuts across waves 3-6 are expected**. A third is a signal that §7.2's column map was
cut before its digits were understood, and is reviewed as such rather than absorbed.

### 11.5 Ownership notes

1. **`demos/reentry.asm` is wave 3's and is grown by waves 4 and 5, and by nobody else.** Every growth
   is additive to a section wave 3 laid out; the wave that grows it regenerates `demos/reentry.cards`
   in the same commit and re-runs wave 3's numeric cases, which must stay green — a grown deck that
   moves a (V, h) value is a defect in the growth.
2. **`test/tier3-reentry-integration.test.ts` is wave 3's**, and wave 4 deletes exactly one case from
   it (§11.1). No other wave edits a file it does not own.
3. **`test/fixtures/reentry-reference.ts` is wave 1's and is READ by waves 2, 3, 4 and 5.** It is the
   file this phase's ordering exists to protect: it is written before any Autocoder exists, so the
   deck cannot have been fitted to it, and §11.2 governs when it may be corrected.
4. **`docs/BUILD-LOG-6.md` is appended by every wave and rewritten by none** — the Phase 3/4/5 shape.
   Wave 0 opens it with the Arrival section; §16 says what each section carries.
5. **`docs/screenshots/phase-6/` is created by wave 0** with a `README.md`, because git will not track
   an empty directory. The four PNGs are per-wave **evidence**, not source, which is why §3's file
   tables do not enumerate them and this section does.
6. **`docs/STATUS.md` and `docs/DECISIONS.md` are the orchestrator's** and are amended at the merge,
   never by a wave — including `STATUS.md:161`, which names `HALT_TYPES_NO_PRINTOUT` and goes stale the
   moment wave 0 lands (§9.4).
7. **`docs/research/*` is never edited in a build wave.** Wave 0's `open-questions.md` amendment is the
   **escalation commit** and is its own commit; wave 7's is a new dated section only.

### 11.6 The per-wave screenshot protocol

Phase 4's RULE 4, carried forward with Phase 6's own two questions. A screenshot is not a test and this
plan does not pretend it is one: it is a per-wave deliverable with a stated reader and a stated
question, because **every gate in this plan goes green on a page nobody would want to read**.

**What the four screenshots are FOR.** (1) **Does the twelve-column table read as a table?** 132
positions at 10 cpi across three inked forms, with eleven three-position gutters, on the plain-white
stock PHASE-4-NOTES §4(c) says a twelve-column table wants — a proportion question a node test proving
byte equality cannot see. (2) **Does the page read as a reconstruction?** Three framing lines and a
gravity line on paper, in the ink they will actually print in, at the size a person reads them.

**How it is recorded.** The build orchestrator takes it with `claude-in-chrome` against `npm run dev`
at the wave's HEAD, **before** the wave's Opus review, and records in that wave's `docs/BUILD-LOG-6.md`
section: the wave, the commit, the station, what the two questions above answered, and any defect with
its resolution or its deferral to a named later wave. The PNG is **committed with the wave** at
`docs/screenshots/phase-6/wave-N-<station>.png` and referenced **by relative path**, never as a base64
data URI. Four shots: **wave 0** the 1415 roll with its new `S`; **wave 4** the 1403 on plain white;
**wave 5** the punch feed with 92 cards in pocket 0; **wave 6** the whole desk in both tabs. A
screenshot that raises nothing says so explicitly; a wave section with no screenshot line is an
incomplete wave, and the phase gate checks for the line, not for a verdict.

---

## 12. Test tiers and gates

### 12.1 Tiers

**Eleven new test files, counted off the table below rather than estimated, plus one shared fixture —
twelve if Zarathustrum takes the pacing item.** `test/` already spells manual worked examples `tier1-*` and its
oracle tiers `tier2-` / `tier3-` / `tier4-`; this phase adds two files at the `tier3-` prefix and two
at `tier4-`, and gives everything else the `reentry-` module prefix the way `asm-source.test.ts` and
`rpg-cycle.test.ts` are named. The **one** prefix `package.json` keys on is `tier4-`:
`"test": "vitest run --exclude 'test/tier4-*.test.ts'"`, `"smoke": "vitest run test/tier4-"`.
**The tier table is the specification and the number is read off it: 3 + 2 + 4 + 2 = 11.** §11's wave
rows are the independent second count and enumerate the same eleven — wave 1: 3, wave 2: 1, wave 3: 1,
wave 4: 2, wave 5: 2, wave 6: 1 (+1 optional), wave 7: 1 — and §3's per-wave blocks carry the same
rows. `test/fixtures/reentry-reference.ts` is a **fixture, not a test file**, and is in neither count;
it is the twelfth new file under `test/` and §3.11 counts it separately.

| Tier | Files | In `npm test`? |
|---|---|---|
| **T0 — the reference layers and the tables they publish** (3) | `reentry-reference` (§4.5's layer-1-against-layer-2 table at the published tolerances; the `Ei` and `erf` quadratures; the eq.15 `y1 > 0` threshold at W/(C_D A) = 5,000; the eq.17 invariance regression at β_B doubled) · `reentry-tables` (`ANTA` against `Math.pow` at all 100 entries and 200 interpolated points within 1.0e-5 relative, and the quadratic residual's truncation bound asserted **numerically**, not quoted) · `reentry-scaling` (§5.2's scaling table asserted **as data** — digits ≥ the range claimed, every rescale offset = S_a + S_b − S_target, every product's digit count = `floor(log₁₀(peak · 10^(S_a+S_b))) + 1`, `PROD` = 17. **It checks the fixture against the rule, not the fixture against the deck**: the deck's own offsets are parsed and compared in wave 3, §11) | yes |
| **T3 — the machine against the reference** (2) | `tier3-reentry-antilog` (wave 2's probe deck through the real assembler, loader, 1402 and 1411, digit for digit against layer 3's antilog at 100 arguments) · `tier3-reentry-integration` (wave 3's 92-step equality against layer 3; the four NACA checkpoints against the **emulated** run; both guards) | yes |
| **T2 — artifact properties** (4) | `reentry-page-parse` (**the phase's sharpest test**: the golden page parsed back into numbers, every computed column on every row within one unit in its last printed digit of layer 2; the heading's edited values decoded; the mutation pass M1-M5; the chain-A literal sweep; and the two parse preconditions below) · `reentry-punch-card` (§8.2's contract both ways; the committed deck deep-equal to the punch pocket) · `rpg-no-control-break` (§8.6's four-clause symbol predicate, positive over the trajectory job and **inverted** over `demos/sales-summary.rpg`) · `reentry-open-constants` (wave 7 — the `// OPEN:` set difference in both directions over §16 item 3's four source domains against `PHASE-6-NOTES.md` §1) | yes |
| **T4 — the storyboard, and it GATES** (2) | `tier4-reentry-target.test.ts` (wave 4 — the page through the whole machine) · `tier4-reentry-storyboard.test.ts` (wave 6 — §1's walk headless, the `S` assertion, the 1415 roll) | **no — they join `npm run smoke`** |
| **optional, Zarathustrum's decision 6** (1) | `period-pacing` (wave 6 — §10.6's four assertions over `src/ui/main.ts` as text). Dropped as a unit with the pacing item | yes, if built |

**The two parse preconditions, stated here because they are what give T2's first file teeth.** Before
any value comparison runs, `reentry-page-parse` asserts that the parse yields **exactly 92 detail
rows**, and that every one of the **ten computed fields** on every one of them is non-empty and parses
as a number (GAMMA is a literal and DIFF has its own criterion — §4.5). A comparison of empty strings
must fail at the precondition rather than pass at the comparison; M5 (§11.3) is the second half of the
same argument.

**Every golden in this phase is OURS**, and says so where a reader will find it. No Avco trajectory
listing survives and none is documented (`avco-and-reentry.md` §9-10), so
`REENTRY_GOLDENS_ARE_CONSTRUCTED` is declared as a grepable export in `test/tier4-reentry-target.test.ts`
on `RPG_GOLDENS_ARE_CONSTRUCTED`'s precedent (`test/rpg-generate.test.ts:20`), each golden's own header
repeats it in the shape `test/golden/card-face-a.svg.txt:6` already uses, and **the mitigation is the
oracles, not a better golden** — which is the whole architecture of §4.4's four layers.

**Existing test files this phase edits, and the complete list is three.**
`test/machine-console.test.ts` and `test/tier4-period-storyboard.test.ts` in wave 0 (§9.4's migration
list), and `test/period-reader.test.ts` in wave 5 (the punch retirement, §8.8). Every other file in
`test/` passes **unedited**, and that is the gate on the phase's own boundary: Phase 6 touches one core
constant and four drawn labels, so a fourth file going red is a defect that escaped its wave.

### 12.2 Gates at every commit

Every number below was **re-run this session** on `feature/phase-6-reentry` at `53b46d4`. This block is
the authoritative copy; §11's rows and §13's criteria cite it and never restate it.

```text
npm run typecheck                                            clean
npm test                                                     111 files / 1968 passed / 1 skipped today;
                                                             120 / ≈2,093 / 1 skipped at merge
                                                             (121 / ≈2,097 with the pacing item)
                                                             — the new number stated in the commit
npm run smoke                                                7 files / 50 today;
                                                             9 / ≈59 at merge
                                                             — the new number stated in the commit
npm run cc01                                                 byte-identical: CC01A, CC01 COMPLETE,
                                                             instruction check at 00322,
                                                             1241 instructions — NEVER MOVES
npm run demo -- --golden test/golden/hello-dad.page.txt      PASS, 348 bytes, unchanged
npm run asm -- demos/hello-dad.asm --listing \               PASS, 2251 bytes, unchanged
  --golden test/golden/hello-dad.lst
npm run rpg -- demos/sales-summary.rpg --page \              PASS, 3688 bytes, unchanged
  --golden test/golden/sales-summary.page.txt
npm run rpg -- demos/sales-summary.rpg --listing \           PASS, 6982 bytes, unchanged
  --golden test/golden/sales-summary.lst
npm run build                                                exits 0
grep -c 'src="\./assets' dist/index.html                     1
npm run check:deferred                                       see the ordering table below
shasum -a 256 src/ui/internals/controls.ts                   a6d90f54c0649625dcf32161d12332dd867
                                                             bf66a424752fcfc55b4bfd4bf318f

# from wave 4, once the page exists:
npm run demo -- demos/reentry.cards \                        PASS, the byte count wave 4 records
  --golden test/golden/reentry.page.txt
# from wave 5, once the RPG job exists:
npm run rpg -- demos/reentry-summary.rpg --page \            PASS, the byte count wave 5 records
  --golden test/golden/reentry-summary.page.txt
```

**Three goldens are gated by `npm test` rather than by a CLI line**, because the tests that own them
are not `tier4-`: `card-list.page.txt` (**120 bytes**), `cycle-probe.page.txt` (**2522 bytes**) and
`card-face-a.svg.txt` (**33450 bytes**). All three were re-measured this session and all three are on
§3.9's do-not-touch list. Naming them here rather than in the code block is the Phase 5 §12.2
correction — a plan that put every golden inside one command was wrong about which command runs it.

**What each number becomes, and the method.** `typecheck` stays clean. **`npm test` grows only by
addition**: nine new files (§12.1's T0, T3 and T2 rows) plus **one** new case in
`test/machine-console.test.ts` from wave 0, so **120 files exactly** — the file count is exact because
§3 and §12.1 both enumerate the files — and **≈2,093 tests**, an estimate `docs/BUILD-LOG-6.md`
corrects per wave with the actual. The estimate is not a guess: per-file case counts were measured this
session with `npx vitest run --reporter=json` (median **13** cases per file across the 111, mean 17.7),
and the nine files are budgeted against their closest shipped analogues —

| new file in `npm test` | cases, est. | budgeted against |
|---|---|---|
| `reentry-scaling` | ~26 | one case per scaling-table row (§5.2), `rpg-layout`'s per-row shape |
| `reentry-page-parse` | ~24 | ten columns + the heading decode + M1-M5 + the chain-A sweep + two preconditions |
| `reentry-reference` | ~14 | §4.5's seven checkpoint rows plus `Ei`, `erf`, the guard and the regression |
| `tier3-reentry-antilog` | ~12 | `tier3-arith` (56) at a tenth the argument count, grouped |
| `tier3-reentry-integration` | ~12 | the 92-step equality is one case; the checkpoints and guards are named cases |
| `reentry-punch-card` | ~12 | eleven contract fields plus the deck equality |
| `rpg-no-control-break` | ~12 | four clauses × two sides, plus the indicator file, the LR line and the page |
| `reentry-tables` | ~8 | `period-page` (16) at half the surface |
| `reentry-open-constants` | ~4 | two set differences, the domain enumeration and one negative case |
| **total** | **≈124** | 1968 + 124 + wave 0's one new case = **≈2,093** |
| *`period-pacing`, if built* | *~4* | *four text assertions over `src/ui/main.ts` (§10.6) → ≈2,097* |

**`npm run smoke` is 7 files / 50 today and rises twice** — wave 4's `tier4-reentry-target` and wave
6's `tier4-reentry-storyboard` — to **9 files / ≈59**. The per-file measurement makes that estimate
honest rather than round: today's seven are `tier4-autocoder-demo` 22, `tier4-demo-deck` 12,
`tier4-rpg-demo` 5, `tier4-rpg-target` 5, `tier4-cc01-ident` 3, `tier4-cc01-progress` 2 and
**`tier4-period-storyboard` 1** — one long walk in a single `it`. So the target file is budgeted at ~7
on `tier4-rpg-target`'s shape and the storyboard at ~2 on `tier4-period-storyboard`'s, and **the wave's
commit message states the new number** rather than letting it drift.

**`npm run cc01` is byte-identical and never moves.** Wave 0 changes a core path, which is exactly why
this line is in the gate: §9.6's measurement says the rename moves **zero bytes** of the cc01 transcript
because no op `.` is executed on the PASS path, so any movement at all is a defect in the rename rather
than a Phase 6 finding.

**The register gate, both orderings — and one measured detail neither the dossier nor the rulings
carries.** `npm run check:deferred` is **already red on this branch before the plan commit**: the
trigger is `ls docs/plans/phase-6-*.md` and `docs/plans/phase-6-panel-dossier.md` matches it whether or
not it is tracked. Run this session:

```text
$ bash scripts/check-deferred.sh
  [TRIPPED] DEFERRED-01     — `HALT_TYPES_NO_PRINTOUT` contradicted by S223-2648 p.6
Summary: 0 ok · 1 tripped · 0 manual · 0 no-trigger · 0 resolved      exit 1
```

**The detail:** `scripts/check-deferred.sh:73` puts `WATCHING` and `TRIPPED` in the **same case arm**,
and both print `[TRIPPED]` and count into the same total when the trigger fires — so moving the
register entry from WATCHING to TRIPPED at the plan commit **changes no gate output at all**. It is
documentation of what is true, not a gate manoeuvre, and the plan says so rather than implying the
status change bought something. And `:69` is `RESOLVED) rc=$((rc+1)); continue ;;` — a RESOLVED entry
is skipped **before** its trigger is evaluated, which is what makes ordering B possible and what
retires the kickoff's *"the gate trips at the plan commit by construction"*.

| | ordering A — one red commit (the default) | ordering B — discharge first |
|---|---|---|
| the arrival commit (dossier + plan) | `0 ok · 1 tripped · 0 manual · 0 no-trigger · 0 resolved`, **exit 1** | — |
| the escalation commit (`open-questions.md` only) | — | `1 ok · 0 tripped · 0 manual · 0 no-trigger · 0 resolved`, exit 0 |
| wave 0 (the discharge, register → RESOLVED) | `0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved`, exit 0 | ditto |
| the arrival commit, after wave 0 | — | unchanged, exit 0 |
| every commit from there | exit 0 | exit 0 |
| what it costs | **one red commit on the feature branch**, reported as such in `docs/BUILD-LOG-6.md`. Nothing is falsified: the entry says the work is not done, because it is not | a `src/core` change lands **before Zarathustrum has gated the plan**, against `CLAUDE.md`'s phase gate, and the dossier and the plan must be held **outside the working tree** for two commits (§9.9) |

**This is Zarathustrum's decision 1**, and the plan carries both. The orchestrator's ruling is A. Either way,
**the gate discipline applies from wave 0 on**: the arrival commit is a document commit, and no build
commit in this phase is green-by-exception.

**A wave gate is never taken under `ALLOW_MISSING_ORACLES=1`.** Both `npm test` and `npm run smoke` run
`npm run oracles` first (`"pretest"`, `"presmoke"`), and Phase 4 measured that under the flag with
`oracles/` absent one file — `test/tier3-index-exec.test.ts` — **fails outright rather than skipping**,
so a red file in a gate run is indistinguishable from a lost test at the count level. The flag is a
legitimate path for a worker iterating offline; a wave that cannot reach the network **defers its
gate** and says so in `docs/BUILD-LOG-6.md`.

Then Opus adversarial review, fixes, one commit, push `feature/phase-6-reentry`. **Never `main`.**

### 12.3 The fixture inventory, checked rather than assumed

**ONE new fixture file in the whole phase**: `test/fixtures/reentry-reference.ts` (~430 lines, wave 1),
the second file ever to live in `test/fixtures/` — `sales-summary.model.ts` is the first. It carries
three of §4.4's four layers and **imports nothing from `src/`, of any kind**. That is a rule of the
file and not an accident: layer 2 is the counterpart the emulated machine is gated against, and a
reference that imported the emulator's own arithmetic would be gating the machine against itself. The
rule is asserted the way `test/period-is-dom-free.test.ts` asserts its import direction — a read of the
tree, not a runtime check.

**THREE new goldens at merge, and one transient.** `test/golden/` goes from **7 files to 10**:
`reentry.page.txt` (wave 4, ~14,600 bytes, three `\f`-separated forms), `reentry-summary.page.txt`
(wave 5, **9,648 bytes**, measured over two forms — §8.7) and `reentry-console.txt` (wave 6, **≈390 bytes**
derived — §10.4). `reentry-dump.page.txt` (~4,300 bytes) exists only between waves 3 and 4 and is
deleted by §11.1's declared act. **No third listing golden**: `renderListing` is already byte-gated
twice, at 2251 and 6982 bytes, both re-measured this session, so a third would prove nothing and would
churn on every comment change in a ≈820-card deck (§2.2).

**The seven shipped goldens this phase READS and never writes** — 348 / 2251 / 3688 / 6982 / 120 /
2522 / 33450 bytes, every one re-measured this session. All seven are on §3.9's do-not-touch list and
`git log --follow` at close-out proves none moved. `demos/hello-dad.*` is not touched at all.

**What this phase has no period artifact to test against, stated as that rather than as "nothing".**
No IBM 1410 is documented at any Avco site and no Avco trajectory listing has surfaced
(`avco-and-reentry.md` §1-2, §9-10, `[verified]` as a negative for the sources searched), so there is
no period page to diff a golden against and there never will be from these sources. What **does**
survive and is used is a physics literature the golden can be checked against instead — NACA Report
1381's closed forms and Detra-Kemp-Riddell's correlation, both in `docs/research/avco-and-reentry.md`
with their tags — which is why §4.4's four layers exist and why the parse-back criterion, not the
golden, is the thing that says the page is right.

**Two things are read from `docs/research/` at test time rather than copied**, on the mechanism
`test/rpg-columns-vs-research.test.ts` and `test/period-selectric.test.ts` already ship, and for the
same reason: a copied expectation is a second transcription of a primary source, free to drift while
both files stay internally consistent. §4.2 owns which of the physics constants are sliced and which
carry their citation in a comment; what §12.3 fixes is the **rule** — this phase cannot edit
`docs/research/avco-and-reentry.md` in a build wave, so a wave that wanted a friendlier constant would
have to change a quoted manual figure, which is an escalation with its own commit.

---

## 13. Exit criteria — §1's storyboard, mechanically checkable

Twenty-one criteria. Each names the command or the test file that decides it; **criterion 21 is a human
walk and is named as one**, the Phase 3 criterion 11b / Phase 5 criterion 13b / **Phase 4 criterion 19**
precedent — and Phase 4's own record is the reason it is not a formality: that criterion found a defect
no oracle in that plan saw.

1. **The standing gate, green.** `npm run typecheck` clean; `npm test` green at its stated new count
   (**120 files / ≈2,093 / 1 skipped**, or 121 / ≈2,097 with the pacing item); `npm run smoke` green at
   its stated new count (**9 files / ≈59**); `npm run build` exits 0 and
   `grep -c 'src="\./assets' dist/index.html` is **1**. §12.2.
2. **`npm run cc01` byte-identical**: CC01A, CC01 COMPLETE, instruction check at **00322**, **1241
   instructions**. It has not moved since Phase 1b and this phase changes a core path, so it is the
   check that says wave 0 stayed inside its own boundary.
3. **`npm run check:deferred` reads `0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved`, exit 0,
   from wave 0 on**, under either ordering of §12.2.
4. **Nothing that shipped moved.** The seven goldens at **348 / 2251 / 3688 / 6982 / 120 / 2522 /
   33450** bytes; `demos/hello-dad.*` untouched; `src/ui/internals/controls.ts` still SHA-256
   `a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f`, and `git diff --numstat` empty
   over it — `test/ui-controls-verbatim.test.ts` and `git log --follow` at close-out.
5. **`assemble(readFileSync('demos/reentry.asm'))` returns `ok: true`, `flagged` empty and `warnings`
   empty** — all three, because `ok` alone is green on a deck whose loader-planted GM-WM sits inside a
   reserved area (Phase 5 §6.3, §8.1). Zero warnings is §6.11's reserved-area layout working, and a
   warning here is a defect and not a note. And `demos/reentry.cards` deep-equals `assemble(...).deck`.
   `test/tier3-reentry-integration.test.ts` (wave 3), re-run by waves 4 and 5.
6. **The program fits.** High-water **≤ 09,000** on a 10,000-position machine, asserted from
   `AssemblyResult.symbols` — which is `ReadonlyMap<string, SymbolEntry>` (`src/asm/types.ts:203`) and
   whose `SymbolEntry` carries `value: Addr` with **no length** (`:107-118`), so a bare maximum of the
   values is *not* the high-water. The assertion is **the maximum symbol value plus the extent of the
   area it names**, with `PLGM` decisive at §5.11's **08,732**, and no symbol above 09,000. The two
   other routes to the same number, named so a worker does not invent a third, are `items[].at +
   cells.length` and the listing's `ct` column. `test/tier3-reentry-integration.test.ts`, republished
   with the measured number in `docs/BUILD-LOG-6.md` by wave 3 before wave 4 cuts the page.
7. **Zero new modules under `src/`.** `git diff --name-only --diff-filter=A <base>..HEAD -- src` is
   **empty at every commit of the branch**, and the whole-phase `src/` diff touches only the nine files
   §3.10 names (eight if Zarathustrum declines the pacing item). `architecture.md:855`, STATEMENT.md.
8. **Emulated (V, h) at every one of the 92 steps equals layer 3 exactly** — the regression pin, under
   §11.2's tie-break, and **never the gate**. `test/tier3-reentry-integration.test.ts`.
9. **`max |VELOCITY − V A-E| ≤ 0.50 ft/s`** over the 92 printed rows — the tolerance §4.5 derives from
   S = 2 over 92 steps plus the antilog's truncation, published in `docs/BUILD-LOG-6.md` by wave 1
   before any golden — and the summary line's printed figure (**0.07**) equals the test's.
   `test/reentry-page-parse.test.ts`.
10. **The DIFF column is internally honest**: the printed DIFF equals the printed VELOCITY minus the
    printed V A-E, to the rounding of the printed fields, **on every row**. It is the one column layer 2
    cannot supply a value for, which is why its criterion is an on-page identity and not a tolerance.
    `test/reentry-page-parse.test.ts`.
11. **The deck's guards and the physics checkpoints.** The two case-card consistency checks
    (`SIN²(1 + COT²) = 1`, and each punched logarithm antilogged back against its own field) halt with a
    **printed diagnostic** on a corrupted card rather than integrating; the **eq.15 `y1 > 0` guard**
    fires at W/(C_D A) = **5,000 lb/ft²** and the deck refuses eqs.16-17; the **`h ≤ 0` guard** refuses
    step 93 at h = −62.2 ft; the **four NACA checkpoints** (eqs.13/15/16/17) pass against the
    **emulated** run at §4.5's tolerances; and the **eq.17 invariance regression** leaves the printed
    peak-g figure unmoved with β_B doubled. `test/tier3-reentry-integration.test.ts` and
    `test/reentry-reference.test.ts`.
12. **The page.** `renderGreenBar(paper, {chain:'A', formLines:66})` equals `test/golden/reentry.page.txt`
    byte for byte over **three `\f`-separated forms**, one break by the channel-12 overflow latch and one
    by a programmed `CC1 1`; **every form carries the word `RECONSTRUCTION`**; and the golden was cut
    **after** §7.2's column map landed in `docs/BUILD-LOG-6.md` in the same commit, checked by
    `git log --follow` over both paths at close-out under §11.4's rule.
    `test/tier4-reentry-target.test.ts`.
13. **The page parsed back into numbers** — every computed column, every row, **within one unit in its
    last printed digit** of layer 2, with §12.1's two parse preconditions asserted first; and **the
    heading block's edited values decoded off the page and equal to the CASE CARD's**, so a deck that
    prints one ballistic coefficient while integrating another fails rather than passing.
    **The heading decodes against the card, not against the reference's initial state**, and the one
    place that distinction bites is `ENTRY VELOCITY`: the page prints `23,000.` from the card's
    `V-E`, and the reference's initial `V` is `22,939.54`, because the table starts 250,000 ft below
    the entry altitude the same line prints (§4.1, §7.3). A criterion that compared the heading to
    the reference's `V(0)` would fail on a correct page; a criterion that compared the first
    `VELOCITY` cell to the card's `V-E` would too. Both are decoded, and each against its own source.
    `test/reentry-page-parse.test.ts`.
14. **The mutation pass has teeth.** M1-M4 each perturb one reference constant by one unit and **M5
    shifts one column's parse position by one**; each must turn criterion 13 or criterion 9 red, and
    each restores. §4.7, §11.3. `test/reentry-page-parse.test.ts`.
15. **No character outside the chain-A arrangement appears in any printed literal** of
    `demos/reentry.asm` or `demos/reentry-summary.rpg` — no `=`, no `(`, no `)`, no `+`, none of which
    has a BCD in this emulator at all (`printer1403.ts` `CHAIN_SLUGS`, §7.8). A sweep over every
    alphameric literal in both decks, with one exemption: the group mark `⧧` in `PAGM` and `PLGM`.
    `test/reentry-page-parse.test.ts`.
16. **The punch.** **92** cards in `punch.stackers['0']` after the trajectory run; each round-trips
    §8.2's 80-column contract in both directions; and `demos/reentry-summary.data.cards` **deep-equals
    what the run produced** — reached through `machine.punch.pockets['0']`, not through the snapshot,
    which carries counts only (§8.1) — so no trajectory number is hand-typed into a file.
    `test/reentry-punch-card.test.ts`.
17. **The RPG demonstration.** §8.6's four-clause symbol predicate passes over the trajectory job and
    **fails** over `demos/sales-summary.rpg`; the RPG extract page matches
    `test/golden/reentry-summary.page.txt` byte for byte through the real generator, assembler, loader,
    1402 and 1411; and **the reconstruction line is asserted on every form of it too**. That is
    `STATUS.md:221`'s requirement discharged on a trajectory table.
    `test/rpg-no-control-break.test.ts`.
18. **The operator's evidence.** §1's whole two-job walk runs headless through the period session —
    **`assemble(demos/reentry.asm).deck.records.length + 4`** cards into the hopper, asserted against
    the object-card count waves 3 and 5 record in `docs/BUILD-LOG-6.md` and **never against §6.13's
    ≈154 / ≈158 estimate**, with the 1402's trailing-card rule satisfied, the bootstrap keyed, the
    page and the punched deck, then the RPG job — and within it: **the last `ConsoleLine` of the
    trajectory run has `id === 'S'` and its Op group is `.`**, asserted through `machine.start()` and not
    `machine.run()`; and the **1415 log golden matches the whole roll** through `renderSelectric` at
    `matrix: 'flush'`. Both `npm run demo` and `npm run rpg` drive the machine through `start()` from
    wave 6 on, so the CLI's console log carries what the desk's does.
    `test/tier4-reentry-storyboard.test.ts`.
19. **Performance is printed and never asserted** — the cc01 precedent. Instruction count
    (**41,543**), emulated µs (**15,925,705 = 15.93 s**) and frames at `START_BUDGET = 2000` (**21**),
    §5.10, recorded in `docs/BUILD-LOG-6.md` with *"unaccelerated, Accelerator not assumed"*, beside the
    1403's own **11.7 s** at 600 lpm. No test compares them; a build that made them a gate would be
    gating on a timing table.
20. **The record closes.** A dated `## Phase 6 — 2026-…` section exists in
    `docs/research/open-questions.md`; **every `// OPEN:` constant name grepped out of §16 item 3's four
    source domains has a matching row in `PHASE-6-NOTES.md` §1 and vice versa** — a grep, a sort and a
    set difference that must be empty **in both directions**, run by
    `test/reentry-open-constants.test.ts` rather than by a person; and `docs/reentry-walkthrough.md`
    exists and states the three caveats the artifacts cannot carry (the column layout is
    period-plausible and undocumented; RK4 as Avco practice is unverified; DKR is itself ±10-20 %).
    Whether each row says the **right** thing is the whole-branch review's judgement and is listed there
    rather than pretended to be a gate.
21. **The human walk, recorded by name and date in `docs/BUILD-LOG-6.md`.** Zarathustrum runs `npm run dev` and
    walks §1 end to end **in one sitting**, writing down what he saw:

    - the **third sample button** filling the coding sheet, and the case card readable as one card;
    - the **whole hopper** leaving one edge at a time — ≈158 cards on §6.13's estimate, and whatever wave 3 measured — and the object deck's card faces;
    - the bootstrap **keyed by hand**, and the Selectric typing `S`, `S`, `D`, `D`, `S`, `A`, `S` on the way in;
    - the 1403 filling to **132 positions without wrapping** across **three forms**, the first break at
      the channel-12 punch and the second on a programmed skip;
    - **the plain-white toggle** — and whether a twelve-column table actually reads better on it, which
      is PHASE-4-NOTES §4(c)'s question and the only place it gets answered;
    - **column 5**, the machine's own error printed beside its answer, readable as such;
    - the **punch feed with 92 cards in pocket 0**, and a drawn page that no longer says this 1402 does
      not punch;
    - **the last line of the roll: `S`, with Op group `.`** — the one thing wave 0 exists for, and the
      difference between a finished job and a jammed one;
    - the RPG sheet's second sample through GENERATE → SEND TO AUTOCODER → run, and the extract page
      carrying the reconstruction line;
    - if he took decision 6, **the paper moving at 1411 speed** for ~16 s, and the control that stops it;
    - and the one question no oracle in this plan can ask: **does this page look like what a period analyst
      read?**

    A defect found here is a finding for `docs/BUILD-LOG-6.md` and a fix commit, **not** a reason to
    move a golden or widen a tolerance.

**The phase gate.** All twenty-one green; the four per-wave screenshots present in
`docs/BUILD-LOG-6.md` with their two questions answered (§11.6); criterion 21 run and recorded by name
and date; `PHASE-6-NOTES.md` §1 a set-equal match for the `// OPEN:` constants grepped out of the tree;
then **the ≤7 bullets to Zarathustrum** (`CLAUDE.md` § Engineering rules). `docs/STATUS.md` and
`docs/DECISIONS.md` are updated by the orchestrator at merge, never by a wave.

---

## 14. Risks

Sixteen numbered risks. Three are new to this phase and are marked: **R6** (the antilog is the only
transcendental and everything downstream of it inherits its error), **R12** (the `?raw` sample imports
push `dist/` toward Phase 4's budget) and **R13** (the wave ordering is the phase's whole de-risking
argument and one violation collapses it).

| # | Risk | Mitigation, and the oracle that catches it |
|---|---|---|
| R1 | **Size — a ≈820-card hand-written Autocoder deck.** `demos/sales-summary.asm` is 270 cards and is the largest thing anyone has hand-written in this project; `demos/reentry.asm` is close to three times it, carrying an antilog, a derivative, RK4, two guards, nineteen MCE control words and three print routines, in fixed-point decimal with no shift instruction. | **The deck is never written in one piece and never judged by one signal.** Wave 2 lands the antilog alone against a function; wave 3 lands the integrator against 92 rows of numbers with no golden in the judgement; wave 4 adds the page; wave 5 adds the punch. Each has an oracle no later wave writes (§11), and layer 3 exists **before a line of Autocoder** so a scaling bug is a digit-for-digit comparison rather than a hunt across 820 cards. Caught by: §11's per-wave oracles, in that order. |
| R2 | **The goldens are ours, so one could be "fixed" to match a bug.** Phase 3 gated on a golden it did not own; this phase cannot, and no Avco listing exists to gate against (`avco-and-reentry.md` §9-10). | Four independent legs, not one. The tolerances are published in wave 1 **before any golden exists**; §7.2's column map is committed before the page; **the page is parsed back into numbers against layer 2**, not against the golden, so the golden's bytes are not the value check; and the mutation pass proves those value assertions are live. Caught by: criteria 9, 12, 13, 14. |
| R3 | **A tolerance gets widened, or the reference edited, to get past a red gate.** Every bound was set by the same team that will supervise the build, and widening is the cheapest way past red. | The rule is written verbatim in §4.5 and repeated in §11.4: **a tolerance published in `docs/BUILD-LOG-6.md` before the golden may not be widened, and layers 1-2 may not be edited to match the program, without Zarathustrum's authorisation — and any such change is its own commit with its own reason.** Caught by: `git log --follow` over `docs/BUILD-LOG-6.md`'s wave-1 section and `test/fixtures/reentry-reference.ts` at close-out, and by the whole-branch review reading those two histories side by side. |
| R4 | **Layer 3 becomes the gate through the back door.** Criterion 8 asserts exact equality against a simulator written from the same scaling table by the same team; a build under pressure fixes whichever side is cheaper. | §11.2's tie-break, **stated before the build rather than negotiated during it**: criterion 8 red with 13 green means the simulator is wrong; criterion 13 red means the deck is wrong whatever 8 says, because layer 3 is not in criterion 13's path. The two criteria live in two files owned by two waves. Caught by: criteria 8 and 13 as a pair, and by `PHASE-6-NOTES.md` §2 when they disagree. |
| R5 | **The deck does not fit, or the high-water blows the ceiling.** §5.11's map is built on an **estimated** 486 instructions at a **pessimistic** 10.1 positions each — above RULINGS §E 21's 9.6-9.9 band, a declared departure — and the program is not written yet. The work block is the tighter of the two: 391 itemised positions in 478, and it was **twelve positions over** an earlier draft's range until `ARG` and `ARGF1` were added to the itemisation (§5.11). | Measured rather than assumed: density is **9.32** whole-program and **9.87** over the `{6,7,11,12}` subset off `demos/sales-summary.asm`, and the map spends 10.1. The map sums to 10,000 with **1,267 positions unused** and a ceiling of **≤ 09,000** against a design high-water of **08,732**. Two fallbacks are named and priced (F1, F2, ~450 positions between them) and F3 is refused with its reason. **Wave 3 republishes the map with the measured code length AND the measured work-block sum before wave 4 spends a single print position.** Caught by: criterion 6, at every commit from wave 3. |
| R6 | **NEW — the antilog is the only non-elementary operation, and six calls per row sit under every column but two.** A truncation bound that is wrong by an order takes `DYN PRESS` (1.456e-5 of its maximum) and `HEAT RATE` (4.5e-5) with it, and a table fetch that is off by one entry is a plausible-looking page. | Wave 2 exists for exactly this: a probe deck that runs **the routine that ships**, through the real machine, digit for digit against layer 3 at **100 arguments spanning −10 … +6**, with the bias, the field slice and the indexed fetch each named — before anything calls it. The named fallback is `ANTB` (+1,000 positions, truncation 2.65e-8), which under §5.1 rule 3's truncation is measured to change **no printed digit on the page at all** — the 68,682-against-68,681 pair an earlier draft cited was taken under rounding and is withdrawn (§5.6), and wave 2 re-takes the sweep. Caught by: `test/tier3-reentry-antilog.test.ts` and `test/reentry-tables.test.ts`. |
| R7 | **Chain-A contamination.** A `=`, `(`, `)` or `+` in a printed literal has no BCD in this emulator at all, and it is the one defect that reads as a typo rather than as a bug. All three panel architects shipped at least one. | A rule and a test, not care: **no character outside the A arrangement in any printed literal**, swept over both decks. §7.8 states it, §2.3 cites the four dual codes, and the page golden is chain A like every other golden in the tree. Caught by: criterion 15. |
| R8 | **The punch silently produces nothing.** A `P1` with no group-mark-with-word-mark in the punch area transfers past the end of it, and the channel returns `wrongLengthRecord: true` with **no card punched and no error the operator sees**. | Found by measurement this session rather than by review: the probe reproduced it, and the three requirements — `PAREA` with its own `PAGM`, `SW PAGM` at run time, and the group mark's source glyph `⧧` rather than `‡` — are written into §6.11 and §8.1 as build instructions. Caught by: criterion 16, which counts the cards rather than trusting the absence of an error. |
| R9 | **Wave 0's rename breaks something the migration list missed.** A rename is a wide, shallow edit and greps for the old name go green while a sentence naming it goes stale. | §9.4's list was walked site by site this session, and §9.5 carries a **deliberately-not-edited list with a reason for each** — which is what makes an edit list auditable rather than merely long. The standing gate at that commit is identity: cc01 byte-identical, seven goldens unmoved, and every test file except the three §12.1 names passing **unedited**. Caught by: criteria 2 and 4, at wave 0's own commit. |
| R10 | **The `S` line still never reaches the CLI, and criterion 18 is satisfied by one harness only.** `tools/run-deck.ts:101` calls `m.run(max)`; `machine.ts:466` is `run(n) { return cpu.run(n); }`; `printStop` lives only inside `start()` (`:355-374`), called at `:363` and `:370`. All three verified this session. | Named as a wave-6 edit with its line numbers (`run-deck.ts:101`, `rpg.ts:133`) rather than discovered; the page goldens are proved not to move because `--golden` compares the page only (`run-deck.ts:153-166`); and criterion 18 names the harness that asserts it — `test/tier4-reentry-storyboard.test.ts`, through `machine.start()` and the period session. Caught by: criterion 18, plus the 1415 log golden which would show a missing line as a missing row. |
| R11 | **The register gate is red for one commit**, and a red gate in the history is a precedent. | Priced both ways in §12.2 as Zarathustrum's decision 1, with the measured detail that WATCHING and TRIPPED produce **identical gate output**, so nothing is bought by the status change except honesty. Whichever ordering he takes, the gate line at that commit is recorded verbatim in `docs/BUILD-LOG-6.md`. Caught by: criterion 3, from wave 0 on. |
| R12 | **NEW — the `?raw` sample imports grow `dist/` toward Phase 4's 400 kB budget.** The bundle is **303.45 kB** today (3.03 HTML + 5.53 CSS + 294.89 JS, measured this session); the new sample buttons embed `demos/reentry.asm` (≈820 cards at the **43.2** bytes/card `demos/sales-summary.asm` averages — 11,670 bytes over 270 cards, measured — ≈ **35.4 kB**), `demos/reentry-summary.data.cards` (**7,452 bytes**, 92 full 80-column punched cards), `demos/reentry-summary.rpg` (54 cards at the 81 bytes/card a padded spec deck averages ≈ **4.4 kB**) and the case card (81 bytes). | 303.45 + 47.4 = ≈**351 kB**, about **49 kB** of margin — stated rather than discovered, and **measured by wave 6 with `du -sk dist` recorded in the build log**. `demos/reentry.cards` is deliberately **not** `?raw`-imported anywhere (§10.1; the deck box loads what ASSEMBLE produced), which is where another ~12 kB would have come from. If the number ever crosses 400 kB the fallback is trimming the deck's comment block, and **raising the budget is a decision recorded in `PHASE-6-NOTES.md` §2 with the measurement**, never a silent drift. Caught by: `npm run build` in the standing gate, and wave 6's recorded number. |
| R13 | **NEW — a wave closes on a file a later wave writes**, and the whole de-risking argument collapses into one big commit wearing eight labels. | The rule is stated as an inequality a reviewer can check — *at the commit that closes wave N, every input its oracle reads was written by a wave ≤ N* — **each row names its inputs**, and the one cross-wave act in the phase (wave 4 deleting wave 3's golden and its single golden case) is declared in §11.1, in both wave rows and in §3.5. Caught by: the per-wave Opus review against §11's input column, and the whole-branch review's `git diff` of the one named path. |
| R14 | **The RPG predicate is false on a correct build, or rots into a tautology.** Both halves of the kickoff's suggested check are **measurably false**: `01330CTLBRK B DTLCAL` is emitted on a job with zero control fields, and `01250 BEF1 LASTCD` defeats a text grep for `F1`. | Four clauses over assembler **symbols** and over `generate(...).cards` — never over source text, and never over a re-driven section map, since `driver(model, layout)` called without `generate()`'s private `emittersFor(model)` returns `totalCalc` and `totalOutput` **empty**. Asserted positively over the trajectory job **and inverted over `demos/sales-summary.rpg`**, so a generator change cannot quietly make it vacuous. Caught by: criterion 17, both directions. |
| R15 | **Scope creep into `src/`** — a new view module for the punch, or a "small fix" in `src/asm` when generated Autocoder trips a Phase-3 open constant. | `punchBoxView.ts` is refused by name (§2.2) on `architecture.md:855` and STATEMENT.md; the punch station is **retired, not rebuilt**, in ~26 lines across four existing files (§8.8); and `src/asm/**`, `src/rpg/**` and `src/formats/**` are do-not-touch **because they are this phase's oracles** — a defect a `src/asm` edit could hide is the one failure mode Phase 6 cannot detect, so it is an escalation with its own commit. Caught by: criterion 7, at **every** commit. |
| R16 | **The page is period-implausible in a way no oracle sees.** The column layout is `[unverified]` — no Avco listing surfaced — and every gate in this plan goes green on a table nobody would want to read. | Named rather than mitigated away: §15 row 1 carries `COLUMN_LAYOUT_IS_PERIOD_PLAUSIBLE_NOT_DOCUMENTED`, the page prints three framing lines and a gravity line saying what it is, §7.6's mock is committed before the golden so the shape is reviewable in the plan and not only in the artifact, and **§11.6's four screenshots ask the two questions a byte comparison structurally cannot**. Caught by: criterion 21, and nothing else. |

**Which criterion catches which risk**, so a green gate is read for what it is rather than for
reassurance. §13's numbering is §13's; this is the mapping in one place.

| Risk | Caught mechanically by | Caught only by a person |
|---|---|---|
| R1 deck size | §11's per-wave oracles, in order | the orchestrator's per-wave card count against §6.13 |
| R2 our goldens | criteria 9, 12, 13, 14 | — |
| R3 tolerance drift | `git log --follow` at close-out | the whole-branch review reading two histories together |
| R4 layer 3 as gate | criteria 8 + 13 as a pair | §11.2's tie-break, applied by the wave that hits it |
| R5 the fit | criterion 6, from wave 3 | — |
| R6 the antilog | wave 2's `tier3-reentry-antilog`, and criterion 13 downstream | — |
| R7 chain A | criterion 15 | criterion 21 — a `#` where a `=` was meant |
| R8 the punch | criterion 16 | criterion 21 — cards in the pocket |
| R9 the rename | criteria 2, 4 | §9.5's deliberately-not-edited list, re-read at close-out |
| R10 the `S` line | criterion 18 | criterion 21 — the last line of the roll |
| R11 the red commit | criterion 3 | Zarathustrum's decision 1 |
| R12 bundle size | `npm run build`; wave 6's `du -sk dist` | — |
| R13 wave ordering | the per-wave review against §11's input column | the whole-branch review |
| R14 the RPG predicate | criterion 17, inverted half included | — |
| R15 `src/` creep | criterion 7 | — |
| R16 period plausibility | **nothing** | criterion 21, and the four screenshots |

Two rows in that table have **nothing** in the mechanical column, and they are the two the phase most
wants to be right about: whether the page reads like a 1961 trajectory listing, and whether it reads
like something a period analyst would recognise. That is the whole reason criterion 21 is a named human
walk with a written list, and the reason §11.6 makes a screenshot a per-wave deliverable rather than a
closing formality.

---

## 15. `[unverified]` / `[likely]` items — each with its `OPEN:` constant and fallback

Every row is a named constant carrying an `// OPEN:` comment at the point of use — in `src/` where
the phase edits `src/`, and otherwise in `demos/reentry.asm`'s comment block or
`test/fixtures/reentry-reference.ts`'s header, which is where this phase's decisions actually live
(§16 item 3). **The one exception is a `[verified]` row**, which carries a citation block instead of
an `// OPEN:` because there is no open question to state: `PROGRAM_STOP_TYPES_S` (§9.1) is the case
that matters, and the inherited rows 20-23 and 29 are cited at their declaration sites and never
redeclared here. Every row also gets a matching row in the dated Phase 6 section of
`docs/research/open-questions.md`, added by the wave that first depends on it. **The ledger is frozen at the close of wave 1**: a ruling
that is not in this table after wave 1 is a plan deviation and is logged as one in
`PHASE-6-NOTES.md` §2.

**What this table contains, so "both directions" is well defined** (§13 criterion 20): (a) every
constant **this phase declares** behind an `// OPEN:`, and (b) the inherited constants **this phase
depends on, or deliberately avoids depending on**, cited and never redeclared. Constants that merely
appear in a citation because a Phase 1-5 file says something this plan quotes are named at their point
of use with a `file:line` and are **not** rows here — they are those phases' rows in those phases'
notes. In this plan that set is exactly:
`PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT` and `READS_AND_DOES_NOT_PUNCH` (Phase 4's, **deleted** by wave 5,
§8.8), `V_ZONE_WORD_IS_THE_THIRD_OPERAND` (§6.6), `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS`
(§6.3), `EDIT_WORD_IS_THE_1410_MCE_CONTROL_WORD` and `CARRIAGE_SENSES_AT_DESTINATION_ONLY` (§8.4),
`PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR` (§2.3), `UI_ONLY_DETENTS_TYPE_S_THROUGH_STOP` (§9.4) and
`COL7_INDENT_IS_STANDALONE_TOO` at `src/asm/symbols.ts:52`, under its own `OPEN:` block at `:41`
(§6.0 rule 2, which names it beside `LABEL_INDENT_COLUMN`).

Rows 1-10 are the physics and the arithmetic (§4, §5, §7); 11-14 are wave 0's (§9); 15-18 are the
second artifact's (§6, §8); 19 is an observation; 20-23 are inherited and are **cited, never
redeclared**; 24-29 were added when the plan was assembled — three arithmetic rulings from §5, one
measured MCE finding from §7.2, the pacing ruling from §10.6, and one more inherited constant this
phase deliberately does **not** depend on.

| # | Constant | Tag | The claim, and its citation | Fallback, and what it costs to flip |
|---|---|---|---|---|
| 1 | `COLUMN_LAYOUT_IS_PERIOD_PLAUSIBLE_NOT_DOCUMENTED` | `[unverified]` | `avco-and-reentry.md` §9, verbatim: *"Column layout is **period-plausible, not documented** — no Avco listing surfaced."* Every quantity in the twelve is a state variable or a one-line function of one, so the **set** is constrained by the physics; the **layout** is ours. §7.2's map. | Fallback taken: `avco-and-reentry.md` §9's twelve, with MACH refused and GAMMA kept. To flip: re-cut `test/golden/reentry.page.txt` and the position table in `test/reentry-page-parse.test.ts` — one wave-4 commit, no arithmetic changes. Settled by: any period 1410 or 704/7090 trajectory listing. |
| 2 | `NO_AVCO_1410_IS_DOCUMENTED` | `[verified]` **as a negative** for the sources searched | `avco-and-reentry.md` §1-2 and its §10 row 1: nothing in BRL 1961, BRL 1964, the Computers and Automation census or the web. The only 1400-series machine documented at Wilmington is the 1401 print satellite (1965); the heavy integrations ran on a 704 and later a 7090. | Fallback taken is the research's own: *"Present the scenario as period-plausible fiction, not history. Say so in the demo text."* Printed on **every form of both pages** and stated in the walkthrough. To flip: if a 1410 at Avco surfaces, the framing lines change and both page goldens re-cut. Settled by: Textron corporate archives, or a Datamation / C&A new-installations column. |
| 3 | `BALLISTIC_COEFFICIENT_IS_GENERIC` | `[unverified]` **as a vehicle number** | `avco-and-reentry.md` §4: *"Representative Mark-4/Mark-11-class values are **not** documented in any source consulted here — do not invent them; drive the demo from a user-supplied beta_B."* | Fallback taken: W/(C_D A) read from the case card (cols 40-47) at 1,000.0 lb/ft², printed on the page with the word GENERIC beside it. To flip: a different number punched on one card; every golden re-cuts, no program line changes. This is Zarathustrum's decision 5. |
| 4 | `RK4_IS_ASSERTED_ERA_PRACTICE` | `[unverified]` | `avco-and-reentry.md` §10: *"The RK4-vs-Adams claim for period trajectory programs has no Avco source … Say 'standard practice of the era' and cite it as such, or drop the claim."* | Fallback taken: **the claim is dropped and replaced by a measurement.** RK4 is chosen because of the measured worst \|V − V(eq.13)\| across integrators (§4.1), not because the era used it; the heading prints the method and the walkthrough says the provenance is unverified. To flip: nothing functional — one walkthrough sentence. |
| 5 | `DKR_IN_PERIOD_UNITS` | `[likely]` | q̇ = 17,600 √(ρ/ρ_SL)(V/26,000)^3.15 / √R_N BTU/ft²-s. **`avco-and-reentry.md` §4 tags this `[verified]`** — arXiv 1910.06397 eq.19, with the conversion confirmed by arithmetic. **This ledger records it `[likely]`, and the divergence is deliberate**: arXiv 1910.06397 is a secondary restatement of Detra, Kemp and Riddell, *Jet Propulsion* 27(12) pp.1256-1257 (1957), which has not been read, and `CLAUDE.md` reserves `[verified]` for a primary source. Logged as an `[observed]` divergence in `PHASE-6-NOTES.md` §3. | Fallback: the columns stay and DKR's own **±10-20 %** prints beside them (`avco-and-reentry.md:160`, *"which sets the precision target for everything downstream"*). To flip: the prefactor is one source constant; HEAT RATE and HEAT LOAD re-cut and nothing else moves. |
| 6 | `THE_SCALING_TABLE_IS_OURS` | `[verified by absence]` | `avco-and-reentry.md` §6, verbatim: *"There is **no published IBM 1410 fixed-point scaling standard** — IBM never issued a 1410 numeric-conventions manual, and A22-0526-3 deliberately has no fixed decimal point: the machine is variable-field-length and the programmer owns the point."* | No fallback: the statement **is** the disclosure. It is written in `demos/reentry.asm`'s comment block (§6.1) and in the walkthrough (RULINGS §E 29), which is the finding's first artifact — it reached none before this phase. |
| 7 | `ANTILOG_IS_ANTA_100_BY_10_WITH_A_QUADRATIC_RESIDUAL` | `[likely]` (the sizing) | 100 entries × a 10-position stride plus a quadratic residual in r < 0.01; truncation **2.034e-6** relative. §5.6. The `[verified]` half is the cost arithmetic that rules out op T; the `[likely]` half is that 2.034e-6 is enough for every printed column. | Fallback, named and **measured**: add `ANTB` (100 × 10 of 10^(i/10000), +1,000 positions) for the two-level form, truncation 2.65e-8. Measured under §5.1 rule 3's **truncation**: it changes **no printed digit on the page**, including DYN PRESS's maximum — q̄ = 68,681.65 lb/ft², the fallback's bound is 0.0018 lb/ft² there, and `QB-1` prints 68,681 under both forms. The **68,682 against 68,681** an earlier draft carried here, in §5.6, in §7.6 and in §14 R6 was a **rounding-era** measurement and is withdrawn; wave 2 re-takes the sweep under truncation and records it in `docs/BUILD-LOG-6.md`. Cost to flip: 100 `DCW` cards, ≈19 more object cards, one more multiply per call, wave-3 and wave-4 goldens re-cut. |
| 8 | `HEATING_USES_THE_CLOSED_FORM_LOG_OF_V` | `[likely]` | log₁₀ V in the DKR expression is taken from eq.13's closed form rather than from the integrated V. The **method** is `[verified]` — IBM's own rule, *"A**B is computed from EXP(B*ALOG(A))"*, C28-0328-3 p.10, named by `avco-and-reentry.md` §7 as the period-authentic route. The `[likely]` is that the substitution is inside HEAT RATE's last printed digit. §5.7. | The substitution's error is **printed in column 5**: at most 0.07 ft/s of 20,821, i.e. 3.1e-6 relative, i.e. 9.6e-6 in q̇, nearly five times inside HEAT RATE's 4.5e-5 bound — so the reader can check the claim on the paper. Fallback: invert the integrated V through a search over `ANTA`, which resolves log₁₀ to ±0.005 and is 1.16 % in q̇ — refused, and the refusal is why the case card carries `LOG10 V-E` punched. |
| 9 | `GRAVITY_IS_NOT_IMPLEMENTED` | ruling | Not an uncertainty: `avco-and-reentry.md` §4 is `[verified]` that Allen and Eggers neglect gravity against drag through the pulse, and eq.13 is the closed form **only** for that configuration (`avco-and-reentry.md` §8's caveat). | The alternative is priced in §4.1 and is Zarathustrum's decision 2: one constant term −g₀ sin γ_E and one add per derivative evaluation. Cost: near-zero in the program; it demotes eq.13 from a per-row check to a checkpoint with a predicted deviation and costs the digit-level `V A-E` column. One printed line on every run states that gravity is not modelled. |
| 10 | `THE_BAND_STARTS_AT_150000_FT` | ruling | RULINGS §B 7. Above ~150,000 ft drag is nil and the model is being run outside its own band: at 400,000 ft and dt = 0.5, 26 of 90 rows print VELOCITY 23,000. | Alternatives: 400,000 ft with a gravity note, or row 9's third option. h_E = 400,000 ft stays on the case card and is echoed; the heading prints `TABULATED FROM 150,000. FT`. To flip: rows, forms, dt and all four goldens — which is why it is Zarathustrum's decision 2 and is settled before the column map is committed. |
| 11 | `PROGRAM_STOP_TYPES_S` | **`[verified]`** | S223-2648 (CE Instruction — 1415 Console Model 1, `docs/research/README.md:63`) p.6: *"a program stop, an error stop, the stop key, or any cycle step, will initiate a stop print-out."* Figure 5's first row, Normal Stop / `S` / matrix 35. A22-0526-3 p.23 is silent, not contrary. §9.1. | Fallback: the shipped behaviour, restored by setting the constant `false`. Cost to flip: ~40 lines in `src/core/machine.ts`, three test files, and **zero committed goldens** — measured, §9.6. |
| 12 | `IE_CYCLE_HALT_TYPES_C_ALONE` | `[likely]` | S223-2648 p.6 lists four triggers for one print-out and does not say what a stop that is both a program stop and a cycle step types. One stop types once, and under I/E CYCLE the START that lands on the halt is the cycle step. §9.2. | Fallback: `C` then `S` — delete the `mode !== 'ieCycle'` term. Cost to flip: one term and one test case. Nothing else moves: `test/demo.test.ts:203` is a `C`-count and is indifferent under both (verified). Settled by: a worked I/E CYCLE example in S223-2648's 97 pages. |
| 13 | `INTERLOCK_STOP_STAYS_SILENT` | `[unverified]` | `ioInterlockStop` is a system stop on the channel interlock (`io.md` §5). S223-2648 p.6 names a program stop, an error stop, the stop key and a cycle step; no sentence in hand puts an interlock stop among them. §9.3. | Fallback: type `S`. Cost to flip: one clause in `printStop`. No shipped test asserts a console line for an `ioInterlockStop`; wave 0 verifies that before it lands. |
| 14 | `EMULATOR_STOPS_ARE_NOT_MACHINE_STOPS` | ruling | `unsupportedFeature` and `unimplementedOp` exist on no 1410 — a real 1411 executes the op or takes an instruction check — and `stopKey` is declared at `src/core/types.ts:407` and produced nowhere (verified). Typing a machine print-out for a condition the machine cannot reach would be inventing a line of the operator's log. §9.3. | No fallback: this is a modelling refusal, not an uncertainty. It is written as one block with rows 11-13 so it cannot decay into three unrelated omissions. |
| 15 | `CASE_CARD_CARRIES_DERIVED_TRIG_AND_LOGS_AND_THE_DECK_CHECKS_THEM` | `[unverified]`, ours | No period case-card layout survives. sin γ_E, cot γ_E, log₁₀ V_E and log₁₀ R_N are punched rather than computed, as an analyst took them off a desk table — this machine has no trig library, and a search over `ANTA` resolves log₁₀ to ±0.005. §6.3, §6.12. | Fallback: compute them on the machine — refused above at 1.16 % in q̇. The **risk** the card introduces is closed on the machine, not by trust: the deck proves sin²(1 + cot²) = 1 to the last digit and antilogs both logarithms back against their own fields before it integrates, and halts with a printed diagnostic if either disagrees. |
| 16 | `PUNCH_CARD_FORMAT_IS_OURS` | `[unverified]` | No period trajectory summary card survives. The 80-column contract of §8.2 — record code, ten unedited numeric fields, sequence — is the project's design. | Fallback: none needed; nothing depends on it but the RPG Input sheet, which is committed beside it. GAMMA and RANGE are deliberately **not** punched: both are closed-form functions of the case card and h, and a card carrying derivable fields is a card that can disagree with itself. |
| 17 | `THE_PUNCH_AREA_NEEDS_ITS_OWN_GM_WM` | **`[verified]` by measurement** | Proved end to end this session through the real assembler, the real condensed loader, the real 1402 and the real 1411: without its own group-mark-with-word-mark the `P1` transfer runs on to `PLGM`, the channel returns `wrongLengthRecord: true` and **no card is punched**. The mark must be set at run time by `SW PAGM`, exactly as `demos/sales-summary.asm:53` sets `SW PLGM`, and the source glyph is `⧧` and not `‡`. §8.1. | No fallback: it is a machine fact with a reproduction. Recorded because no proposal on the panel named it and a build that missed it would fail silently, punching nothing while every page assertion passed. |
| 18 | `SUMMARY_CARRIES_THE_PEAK_BECAUSE_THE_PAGE_IS_ONE_PASS` | ruling | The 1403 prints forward and the deck makes one pass, so the peak-deceleration and peak-heating rows cannot be known when the heading prints. They are carried in two work-area trackers and printed on form 3. §7.7. | Alternative: a second pass over stored rows — which needs 92 rows of storage the memory map does not have. The ruling is why the summary block is on the last form and not the first. |
| 19 | `MOVE_TIMING_FOLLOWS_OPCODES_MD_NOT_AVCO_MD` | `[observed]` inconsistency | `avco-and-reentry.md` §6's Move row gives T = 4.5(L + 1 + A + B) and quotes ≈113 µs; `docs/research/opcodes.md:219` and `src/core/cycles.ts` both give 4.5(L + 1 + A + 1.5B) = 148.5 µs at 8→8. `opcodes.md` is the spec the CPU is written from (`CLAUDE.md`), so the emulator's figure is the one §5.10's budget uses. | **Not a build-wave edit.** It is recorded in `PHASE-6-NOTES.md` §3 as an `[observed]` research inconsistency for the orchestrator, per §16 item 5. Every µs in §5.10 is `src/core/cycles.ts`'s own exported formula, so the plan is internally consistent whichever figure is right. |
| 20 | `MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT` | `[likely]`, **inherited** — cited, never redeclared | `src/ui/period/console/selectric.ts:59-84`. The positions 35 and 30 are `[verified]` (S223-2648 Fig.5 p.9; A22-0526-3 Fig.42 p.46); the **origin** is not, because neither figure gives a unit or a left margin. **New in this phase**: Phase 6 is the first phase to commit a console golden, so the constant's own promise — *"If the origin is ever settled, this one number changes and no golden moves"* — is at risk. | Fallback taken: **`test/golden/reentry-console.txt` is rendered at `matrix: 'flush'`** and the indent is exercised by a matrix-35 row-count assertion instead (§10.4). Cost of the alternative: a committed byte count behind an open Phase 4 question, for no gain. |
| 21 | `DEFAULT_CARRIAGE_TAPE` | `[unverified]` as a punching, `[verified]` as a mechanism — **inherited**, cited never redeclared | `src/core/devices/printer1403.ts:212-218`: 66 form lines, channel 1 at line 1, 9 at 57, 12 at 60. Phase 6 depends on it for the channel-12 overflow that opens form 2 (§7.1). | Fallback: unchanged. PHASE-4-NOTES §4(b) hands this phase the tape **unparameterised** on purpose — *"Phase 4 must not parameterise away the two numbers the trajectory report depends on"* — and this phase does not parameterise it either. |
| 22 | `CARRIAGE_NEVER_BUSY` | **inherited**, cited never redeclared | `OPEN:` block at `src/core/channel.ts:138`, declared at `:147`, carried on `src/core/types.ts:331` and cited at `printer1403.ts:412` and `channel.ts:218`: the I/O term is 0, so `BA1 *+1` after a `W1` never spins. | Unchanged. The idiom is still written in `demos/reentry.asm`, because a period program wrote it (§2.3). |
| 23 | `GREEN_BAR_IS_THE_DEFAULT_WITH_A_WHITE_TOGGLE` | **inherited**, cited never redeclared | PHASE-4-NOTES §4(c) names the white side a **Phase 6 requirement** for a twelve-column table. RULINGS §E 25: the existing toggle meets it. | Fallback taken: **no default change.** `PeriodViewState` is written and never read and dispatch is a sink, so a per-deck default is four view edits and one mount, not four lines. The walkthrough tells the operator to flip it, and criterion 21's human walk records what it looked like. Zarathustrum's decision 7. |
| 24 | `CONSTANTS_CARRY_EIGHT_SIGNIFICANT_DIGITS_AT_WHATEVER_S_THAT_TAKES` | ruling | §5.1 rule 5. A constant written at a convenient S rather than at its own magnitude loses significant digits silently: `1/g₀` at S = 1 is `0.0`, and `ρ_SL/(2β_B)` at S = 7 is three significant digits, 1.3e-3 relative — ninety times outside DYN PRESS's last printed digit. This is the rule four of the panel's published rescale offsets broke (§5.3) — and the rule this plan's own `CRNG` broke until it was caught: `cot|γ_E|/6076.1` at S = 10 is `02850596`, seven significant digits, so it sits at **S = 11** with a rescale offset of 10 (§5.3 row 17). | Fallback: a nine-position field for any constant that needs one, with its offsets recomputed — one position each and nothing else. `KBIAS` and `ARGB` already take it (§5.2). Asserted as data by `test/reentry-scaling.test.ts` (wave 1), which is what makes the rule mechanical rather than editorial — and it is what would have caught `CRNG` on the test's first run. |
| 25 | `U315_GOES_THROUGH_LOGS_NOT_A_TABLE` | ruling, with a derived bound | §5.7, and it is a **stated departure from RULINGS §E 21's named memory fallback**. Linear interpolation on a uniform grid in u has an absolute error bound, so its relative error is worst where u^3.15 is smallest: **1.180e-2 at u = 0.0846**, exhaustive over every subinterval this session, with the simulator's whole-table measurement at 1.09e-2 agreeing from the other direction. That breaks HEAT RATE's 4.5e-5 by 260×. | The replacement is IBM's own documented rule, `A**B` from `EXP(B*ALOG(A))` (C28-0328-3 p.10, `[verified]`), which removes 1,110 positions of table. To flip back: 111 entries at a 10-position stride and both heating columns down to four significant digits — which is why it is recorded here rather than left to look like an oversight. |
| 26 | `EXACTLY_ONE_DIVIDE_AND_IT_FORMS_K` | ruling | §5.9. The step loop, the derived-quantity block and the print block execute **no divide**; the one divide forms Allen-Eggers's own `K` at initialisation, 5,436 µs, and every other reciprocal is a source constant or is formed by multiplication. | Alternative: punch `1/(2β_B)` on the case card beside the sine, the cotangent and the two logarithms, which removes the divide and 5,436 µs and costs eight card columns §6.12's layout does not have — so it is Zarathustrum's decision 5 territory, not a wave's. |
| 27 | `MCE_LEADING_SIGN_COLUMN_TAKES_AN_EXACT_LENGTH_A_FIELD` | **`[verified]` by measurement** | §7.2 mechanism 3, run through the shipped executor: with an A field longer than the control word's body, `@- .   @` prints a **false minus sign** on a positive value, because the high-order sign position is blanked only once the A-field word mark has been sensed (`src/core/edit.ts:267-283`, `signControlLeft`). Column 9 therefore takes `PL10`, a separate four-digit print field, and **two** preparatory statements — `MLC L10R-3,PL10` for the digits (offset **3**, because `L10R` is S = 6 and `PL10` is S = 3) and `MLZS L10R,PL10` for the sign, since `src/core/edit.ts:246` reads the A sign from the units position only and neither sub-field contains it. Both are booked inside §5.10's derived-quantity block. | No fallback in this design: the alternative is to depend on `MCE_EARLY_A_WM_ENDS_AT_SCAN_1` (row 29) for a printed column, which this plan refuses. Cost if the rule is ever wrong: one field and two moves deleted, and column 9 fed `L10R-3` directly — which would then print an unsigned number on 91 of the 92 rows, so the rule being wrong is cheaper to carry than to exploit. |
| 28 | `REAL_TIME_PACING_IS_ONE_EMULATED_MICROSECOND_PER_REAL_MICROSECOND` | ruling, ours, UI only — **conditional on Zarathustrum's decision 6** | §10.6. The frame's budget is computed from the simulated-µs delta so the desk runs at 1411 speed; `START_BUDGET` (`src/core/machine.ts:45`) is the **ceiling** and is never exceeded, so unpaced behaviour is exactly today's. | Fallback: delete it and pass `START_BUDGET`, which is what the checkbox's off-position does. If Zarathustrum declines, the row, the item, `test/period-pacing.test.ts` and the checkbox are dropped as a unit and `src/ui/main.ts` is not touched at all. |
| 29 | `MCE_EARLY_A_WM_ENDS_AT_SCAN_1` | `[unverified]`, **inherited** — cited, and deliberately **not** depended on | `src/core/edit.ts:92-119`. It is why the panel's `@-0.   @` happens to print correctly today: the A word mark is sensed on the code's own A-cycle, so the suppress latch never arms. The alternative reading is live. | Fallback taken: §7.2's `@- .   @` has **no `0` anywhere** and is a single-scan edit under either reading, so no printed column of this phase depends on the constant. Cost of the alternative: a page golden that moves if a Phase-4 open question is ever settled the other way. |

**Two shapes deliberately absent from this ledger, so their absence is a decision:**

- **No row for `PRINT_POSITIONS = 132`.** The 132 is cited to **A22-1407-2 pp.5-8** through
  `avco-and-reentry.md` §3 and §9, not to the constant (RULINGS §E 29). It is the one hardware claim
  the whole panel sourced from the tree instead of from a form number, and this plan does not.
- **No row for op `T`.** Not using it is a costed refusal with `[verified]` arithmetic behind it
  (§2.2, §5.6), not an open question. Op T stays implemented from Phase 1b and unused, with the reason
  recorded — which is the honest outcome and is stated in §2.2 rather than hidden in a ledger row.

---

## 16. Documentation conventions, matching Phase 4's and Phase 5's

Ten conventions. The first six govern what the waves write; the last four govern the five documents
the phase leaves behind. Phase 6 differs from every earlier phase in one structural way that runs
through all ten: **it writes almost no `src/`** (~110 lines across nine files, §3.10), so its
decisions live in Autocoder comment cards, in RPG specification comments, in test fixtures and on the
printed page. The conventions are re-pointed accordingly and the re-pointing is stated, not assumed.

**1. Every file opens with a header** naming its plan section, its research citations by form number
and page, and **what it deliberately does not do** — the shape `readerView.ts:11`,
`autocoder/mount.ts:12` and `sourceBox.ts:6` already use. For this phase that means:
`test/fixtures/reentry-reference.ts` (whose header carries the `Ei` and `erf` derivations and the
statement that it imports nothing from `src/`), each of the eleven new test files, and — the one that
matters most — **`demos/reentry.asm`'s comment block** (§6.1), which is the only header a reader of the
*artifact* ever sees. It carries, at minimum: that no published IBM 1410 fixed-point scaling standard
exists and the scaling table below it is the project's own design (`avco-and-reentry.md` §6,
`[verified by absence]`); that `G ccccc B` after a taken branch is the subroutine-return mechanism
(`opcodes.md:222`, `[verified]`, 69.75 µs unaccelerated); the implied point per variable, as `pi.job`
states it in its own comments; and that no IBM 1410 is documented at any Avco site.

**2. Every machine claim says WHICH MACHINE** and cites a form number + page, or a `docs/research/`
file and section. **1401 ≠ 1410**, and a 1401 fact that could ride across is named and refused at its
point of use. This phase's four refusals and their homes:

- **the 132 print positions** cited to **A22-1407-2 pp.5-8** via `avco-and-reentry.md` §3 and §9, in
  §7.2's column map and in `demos/reentry.asm`'s comment block — never to `PRINT_POSITIONS`, which is
  the tree agreeing with the manual rather than the manual (RULINGS §E 29);
- **no floating point**, refused in the deck's comment block: A22-0526-3's index carries "floating"
  only as "floating dollar sign", and IBM's float was the FORTRAN software package, out of scope with
  FORTRAN (`architecture.md` §12);
- **op `T`**, refused with its arithmetic beside it — a 1,000-entry search at 24,786 µs against an
  indexed `MLC` at 183 µs, both recomputed from `src/core/cycles.ts`'s own formulas;
- **the antilog table's provenance** — the 1,000-entry table `avco-and-reentry.md` §7 recommends does
  not fit in 10K, and the departure is stated where the table is declared rather than left for a
  reader to notice.

**3. Every `[unverified]` / `[likely]` decision is an `// OPEN: CONSTANT_NAME`** carrying its
fallback and its citation, with a matching row in §15 and an entry in the dated Phase 6 section of
`docs/research/open-questions.md`. **The domain of the grep is wider than `src/` and narrower than all
of it**, and this is the convention's one change from Phase 4. It is exactly four source domains:

1. the nine `src/` files this phase edits (§3.10) — and only those, because a grep over all of `src/`
   would sweep in every Phase 1-5 constant and make the set difference meaningless;
2. `demos/reentry.asm` and `demos/probe-antilog.asm`;
3. `demos/reentry-summary.rpg`;
4. `test/fixtures/reentry-reference.ts`.

In an Autocoder deck an `// OPEN:` is a `*` comment card reading `*  OPEN- CONSTANT-NAME …` — no
`//`, because a comment card is marked by a `*` in **column 6** and nothing else (`COMMENT_COLUMN`,
`src/asm/types.ts:24`), and no `:`, which is on chain A only as a code and prints blank (§7.8).
(`/` **is** chain-A clean — `bcdOfGlyph('/')` is 17 and `chainGlyph(17,'A')` is `/` — and this deck
prints it in `CC1 /`, `W/CD A` and `FT/SEC`. It is the doubled `//` that has no home on a card, not
the slash.)

**The set difference is mechanical in this phase, not manual.** Phase 4's §16 item 3 claimed a sweep
that does not exist — `test/period-refusal-grep.test.ts` is a drawn-label grep over string literals,
and the `OPEN:` set difference was a manual process step. Phase 6 writes it:
**`test/reentry-open-constants.test.ts`** (~70 lines, wave 7, §12.1's T2 row) reads the four domains
and `PHASE-6-NOTES.md` §1's table as text and asserts the set difference **in both directions**, empty
each way. That is wave 7's mechanical oracle, §13 criterion 20, and it closes the phase on an
assertion rather than on a person's reading.

**4. A constant is a fallback, never a claim.** The comment says what would settle it and what it
would cost to flip. §15 carries both columns for all twenty-nine rows, and three of them are worth
naming here because their costs are unusually asymmetric: `PROGRAM_STOP_TYPES_S` costs ~40 lines and
**zero goldens** (measured); `ANTILOG_IS_ANTA_100_BY_10_WITH_A_QUADRATIC_RESIDUAL` costs 100 `DCW`
cards and one printed digit of DYN PRESS (measured); `THE_BAND_STARTS_AT_150000_FT` costs every
golden in the phase, which is why it is settled before the column map is committed.

**5. A research correction found mid-build ESCALATES with its own commit**, and
`docs/research/*.md` is **never edited in a build wave** — the `RW#` / `WM#` / `loader.ts:90`
precedent (DECISIONS.md 2026-08-31). Phase 6 touches `docs/research/` exactly twice, both named in
advance:

- **wave 0's escalation commit**, `docs/research/open-questions.md` and nothing else, amending the
  five DEFERRED-01 rows in place (§9.7);
- **wave 7's** new dated `## Phase 6 — 2026-…` section at the end of the same file (item 9 below).

Everything else — including the `avco-and-reentry.md` §6 Move-timing inconsistency (§15 row 19), the
u^3.15 table measurement that contradicts `avco-and-reentry.md` §7's recommendation (§15 row 25) and the DKR tag divergence
(§15 row 5) — lands in `PHASE-6-NOTES.md` §3 as an `[observed]` finding for the orchestrator, **not**
as an edit.

**6. Goldens carry their provenance, and this phase's provenance cannot live inside the files.**
Phase 4's rule was a header line saying whether a golden is IBM's or CONSTRUCTED; a page golden is
byte-compared, so a header would be a byte of the page. So for Phase 6: **every one of the four new
goldens is CONSTRUCTED, none is IBM's**, and the statement lives in two places that are read together
— `docs/BUILD-LOG-6.md`'s wave section, where each golden is introduced with its byte count and what
produced it, and §12.3's fixture inventory. The artifact carries the same statement in its own ink:
`RECONSTRUCTION - NOT FLIGHT DATA` on **every form of both pages** (RULINGS §C 13). Two further
rules: `test/golden/reentry-dump.page.txt` is created by wave 3 and **deleted by wave 4** when the
four-column dump becomes the twelve-column page — the deletion is stated in §3.5 and §11.1 so it is
not discovered — and the build log records it with its reason; and **no third listing golden is added**
(§2.2), because `renderListing` is byte-gated twice already at 2,251 and 6,982 bytes.

**7. `docs/BUILD-LOG-6.md`** — opened by the arrival commit with
`## Arrival — <sha> (the plan, on feature/phase-6-reentry)`, in `docs/BUILD-LOG-5.md`'s shape:

- the design panel's run id **`wf_cf69d70d-d3a`** and its aggregate scores — **paper-first 448 ·
  exact-solution-first 431 · reuse-first 422**, with the finding that settled it (paper-first is the
  only proposal with no last place, and the only one whose page is both a real trajectory and
  produced by the oracle `architecture.md:1031` names);
- **the four corrections this plan makes to the kickoff brief**, which are the bolded block in this
  plan's opening rather than a numbered section, so a later reader does not
  re-derive them;
- the review rounds, with what each caught and how it closed;
- **the gate baseline measured on `host-b` at `53b46d4` before a line of the plan was written** —
  §12.2's numbers, which are the authoritative copy and are not restated here;
- **the register's state at the plan commit**, explicitly: which of §9.9's two orderings Zarathustrum chose,
  the gate line each commit produced, and — under ordering A — the one red commit named as such,
  with the sentence that it says the work is not done because it is not.

Then one `## Wave N — <what> — commit <sha>` section per wave, in `docs/BUILD-LOG-3.md`'s shape: what
landed, §12.2's gate lines **with their numbers** including the new `npm test` and `npm run smoke`
counts from every wave that moves them, the review findings **with their resolutions**, and any
number in this plan the build corrected. Six wave sections carry something no other phase's did:

| wave | what its BUILD-LOG-6 section must carry, beyond the gate lines |
|---|---|
| 0 | the executed-op histogram with its **zero** op `.`, the command that produced it, and the corrected register text |
| 1 | **the published tolerances, before any golden exists** — §4.5's table, with each bound's derivation |
| 3 | the memory map **republished** with the first measured code length, instruction count, object-card count, high-water **and work-block sum** (§5.11's 391-in-478), the constants block's measured length, **and §4.5's per-column deviation table re-taken under truncation** (§5.1 rule 3, §7.2) |
| 4 | **the column map — end positions, digits and MCE control words — committed before the golden** (Phase 5 §10.5's discipline); the **measured** literal-block length against §7.9's 1,146 allocation, with the counting rule it was measured under; and the run's instructions and emulated µs, printed and never asserted, with "unaccelerated, Accelerator not assumed" |
| 6 | the `du -sk dist` measurement against §14 R12's ≈351 kB estimate, and the wall clock with and without pacing |
| 7 | criterion 21's human walk, by name and date — the Phase 4 criterion 19 precedent, which found a defect no oracle saw |

**Each UI-visible wave carries one browser screenshot** (waves 0, 4, 5 and 6, §11.6), taken with
`claude-in-chrome` against `npm run dev`, committed at
`docs/screenshots/phase-6/wave-N-<station>.png` and referenced by relative path — **a committed PNG,
not a base64 data URI**, which would make the log unreadable in `git diff`. **Wave 0 creates the
directory with a `README.md`**, because git tracks no empty directory —
`docs/screenshots/phase-4/README.md` is the shape and the naming rule (`wave-N-<station>.png`) is its.

**8. `PHASE-6-NOTES.md`** — four sections, matching `PHASE-3-NOTES.md`, `PHASE-4-NOTES.md` and
`PHASE-5-NOTES.md`:

- `## 1. [unverified] / [likely] fallbacks hit (each behind a named constant with // OPEN:)` — §15's
  ledger **reduced to the constants actually reached**, with the fallback taken. This is the table
  `test/reentry-open-constants.test.ts` differences against the source (item 3, criterion 20).
- `## 2. Plan deviations (minimal, logged, not redesigns) and modelling refusals` — including the
  **three** this plan declares in advance, so a reader can tell a planned departure from an unplanned
  one: **no u^3.15 table**, which departs from RULINGS §E 21's named memory fallback on a measurement
  (§15 row 25); **the memory map at 10.1 positions per instruction**, above the same ruling's
  measured 9.6-9.9 band, because 9.87 is a subset figure off a job with a different mix and a map
  that under-spends has to move after wave 3 (the plan's header and §5.11);
  and **the wave re-cut into eight**, which splits RULINGS §F 31's wave 3 so that no wave is a
  monolith closed by one binary signal. Plus: how many re-cuts §11.4's protocol actually took and why;
  whether §5.11's estimated 486 instructions, 391-in-478 work block and 08,732 high-water held once wave 3 measured them (the
  plan names them as estimates, so a difference is a fact to record, not a defect); which of §5.11's
  fallbacks were taken; whether wave 5 was split; whether the pacing item was built (§10.6, Zarathustrum's
  decision 6); the `dist` size if it moved against §14 R12; and **any tolerance that had to be
  re-derived, with Zarathustrum's authorisation recorded and its own commit** (§4.5's rule).
- `## 3. Research corrections and [observed] observations` — §15 row 19's Move-timing inconsistency;
  the u^3.15 measurement against `avco-and-reentry.md` §7's recommendation; the DKR tag divergence
  (§15 row 5); what wave 0's discharge settled and what it corrected in the register; and the punch
  probe's three findings (§15 row 17).
- `## 4. Open items carried out of Phase 6` — **enumerated, not gestured at**, and with one
  difference from every earlier phase: **there is no Phase 7.** This section is the project's own
  close-out list, and it says for each item whether it is deferred to a named successor, registered
  with `/tripwire` as a new DEFERRED-NN entry with a trigger, or **closed as refused with its
  reason**. What a later reader inherits at minimum: op `T` implemented and deliberately unused with
  its arithmetic; the punch station now live and what it still does not draw; the `[unverified]`
  column layout and the recovery path if an Avco listing ever surfaces. An unowned item at the end of
  the last phase is the failure mode this section exists to prevent.

**9. `docs/DECISIONS.md` gains the Phase 6 rulings at merge, by the orchestrator**, in one dated
`## 2026-… — Phase 6 merged` block: **DEFERRED-01 resolved**, with its S223-2648 p.6 citation and the
measured-zero correction; the band; the job shape and the punch station's retirement; twelve columns
with a constant GAMMA; the case-card numbers; the pacing item taken or declined; the white form left
as a control; the hello-dad framing; and the walkthrough's form. Because this is the last phase, the
block also records the state of every `[proposed]` / `[open]` item the file still carries.
**`docs/STATUS.md` is updated by the orchestrator at merge, never by a wave** — the Phase 2 / 3 / 5
precedent — and that is where `docs/STATUS.md:161`'s DEFERRED-01 sentence is amended (§9.4). §3.9
lists both files as do-not-touch for the duration.
**`docs/research/open-questions.md`** gains a `## Phase 6 — 2026-…` section at the end, with
`### Wave N — <title>` subsections and the file's existing four-column table
`| Constant | Question | Where it bites | Fallback taken, and the alternative |`. Nothing outside that
section is edited by wave 7; wave 0's five in-place amendments are the escalation commit (item 5) and
are the only exception in the phase.

**10. `docs/reentry-walkthrough.md`** — the walkthrough the brief's §Phases names, and the phase's
fifth document. **Default: Markdown beside the other docs**; the alternative is a published artifact
(Zarathustrum's decision 9), which changes where it lives and nothing about what it says. Its conventions:

- it walks §1 end to end **at the desk and at the CLI**, both, because the two are different
  operators and this project has both;
- **the printed page is reproduced in it**, at least form 1 and the summary block, in a fenced block
  at 132 columns;
- **every reconstruction caveat is stated**, including the three the artifacts themselves cannot
  carry: that the column layout is period-plausible and undocumented (§15 row 1), that RK4 as period
  practice at Avco is unverified (§15 row 4), and that the Detra-Kemp-Riddell correlation is itself
  accurate only to ±10-20 % (§15 row 5);
- **the three facts RULINGS §E 29 requires on an artifact** appear in it as well as in the deck's
  comment block: no published 1410 scaling standard exists; the 132 positions are A22-1407-2 pp.5-8's;
  DKR's ±10-20 % sits beside the heating columns;
- **the period timing figure is the corrected one** — **15.93 s** of unaccelerated 1411 time against
  **11.7 s** of 1403 time at 600 lpm (A22-0526-3 p.67), so this job is **compute-bound by about a
  third**. The dossier inherited a printer-bound claim from a design with fewer multiplies; it does
  not survive this one, and the walkthrough says the right thing rather than the inherited thing;
- it tells the operator to **press the plain-white toggle** (§15 row 23, PHASE-4-NOTES §4(c)), and it
  frames `demos/hello-dad.asm` as the first sketch — five printed lines off **five** hand-typed data
  cards, three of them rows and two of them the title and the column heading
  (`demos/hello-dad.data.cards` is five cards; `demos/hello-dad.cards` is six lines, the object card
  and those five), under the title `HELLO DAD - REENTRY TABLE` — beside the ninety-two the machine
  computes (§10.5, Zarathustrum's decision 8).
