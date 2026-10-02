# BUILD-LOG-6 — Phase 6, the reentry showcase

**STATUS:** AT TOM'S GATE — the plan arrived at `bb7cd7e` on `feature/phase-6-reentry`; no build
has started. The ≤7-bullet gate summary and the ten decisions the plan marks as his were put to Tom
in-session on 2026-09-04. Wave 0 (the DEFERRED-01 discharge) is the first build commit after his go.

## Arrival — bb7cd7e (the plan, on feature/phase-6-reentry)

The plan is `docs/plans/phase-6-reentry.md` (4,852 lines; sixteen sections mirroring
`phase-4-period-ui.md` and `phase-5-rpg.md`, headed by "The seven bullets" and, new in this phase,
§2.4 — Tom's ten decisions on one page, each with its default and its priced alternative). It arrived
through a design panel and four review rounds, all Opus workers under the model policy, the main
session integrating and ruling.

**Seats and provenance, stated plainly.** The main session ran on Fable 5.1 (the `/model` line at
session start). Tom's instruction for this session substitutes Opus for every Fable seat named in
`CLAUDE.md` — the build orchestrator will be an Opus subagent — and every panel, drafting and review
seat below was Opus by construction (`model: 'opus'` on every `agent()` call). The commit footers
carry the form Tom instructed, `(anthropic claude-code opus-5 / voltron)`.

**Before the panel, the main session did two things the kickoff brief carries.** It wrote
`STATEMENT.md` — what the showcase must print and why that output is faithful — and it measured the
DEFERRED-01 entry condition: `node build/tools/run-cor.js oracles/cc01.cor --iar 02000 --trace 1`
emits 1241 level-1 step lines and **zero of them execute op `.`** (histogram J 325, D 153, `,` 138,
W 133, S 131, ⌑ 115, V 75, C 47, B 36, G 33, ? 24, / 10, A 7, N 5, R 4, ! 3, M 2). The register's
"eleven `S` lines in the cc01 transcript" is a static count of halt sites in the image, reachable
only on a failed check. The rename moves no byte of that transcript; plan §9.6 carries the command.

**Design panel** (`wf_cf69d70d-d3a`, 2026-09-03, voltron; 7 Opus agents, 1.61M tokens, ~53 min,
0 errors) — three architects proposed independently from distinct angles (exact-solution-first,
paper-first, reuse-first); three judges scored them on period fidelity, buildability and testability.
**paper-first won 448 / 431 / 422** — the only proposal with no last place (fidelity 152 · buildability
148 · testability 148, second on every lens), and the only one whose page is both a real trajectory
and produced by the oracle `architecture.md` §8 names: exact-solution-first (fidelity 168, first)
tabulates the closed form on an altitude grid and so cannot be checked by it; reuse-first
(buildability 152 and testability 152, first on both) chose a case whose vehicle never arrives — peak
deceleration at 93,582 ft under a heading that says BALLISTIC REENTRY, re-integrated by the synthesis.
Grafted from the losers: exact-solution-first's 150,000 ft band, its `Ei` and `erf` closed forms for
the two quadrature columns, its parse-the-page-back-into-numbers criterion, its `y1 > 0` guard and its
chain-A-clean heading block; reuse-first's discharge-ordering analysis of `scripts/check-deferred.sh`,
its symbol-based RPG predicate, its complete DEFERRED-01 migration list with a deliberately-unedited
list beside it, its refusal of a third listing golden, and its contiguous memory-map form. Rendered
to `docs/plans/phase-6-panel-dossier.md` in this commit.

**Two kickoff claims the panel measured false, and one it confirmed.** (1) The gate does not trip
"by construction": `scripts/check-deferred.sh:69` is `RESOLVED) rc=$((rc+1)); continue ;;` and skips a
resolved entry before its trigger is evaluated, so a discharge that lands before the plan commit is
never red — but that discharge is a `src/core` change and the phase gate forbids it before Tom's go,
which is why the ordering is his decision 1. (2) The suggested RPG check — "the generated program
contains no `CTLBRK`/`F1` ladder" — is false in both halves: `node build/tools/rpg.js
demos/card-list.rpg --source` emits `01330CTLBRK    B    DTLCAL` on a job with zero control fields,
and `01250          BEF1 LASTCD` defeats a text grep for `F1`; the predicate runs over assembler
symbols (plan §8.6). (3) The cc01 zero above, reproduced independently by one architect and one judge.
Two more corrections the plan carries: `test/demo.test.ts:203` is `toBeGreaterThanOrEqual(9)` and
discriminates nothing on the I/E CYCLE ruling, and `src/ui/period/raw-import.d.ts` already declares
`*.asm?raw`, so PHASE-4-NOTES §4(a)'s shim item is stale.

**Orchestrator rulings on the dossier** (`RULINGS.md`, before a line of the plan was written):
integrate, never tabulate; the 150,000 ft band by default with the gravity-term option priced as
Tom's; the report over at least two forms; twelve columns with a constant GAMMA; chain-A-clean
literals with a test; the deck prints and punches and the RPG job tabulates the punched cards, the
station retired and not rebuilt, no new module; DEFERRED-01 as a rename (`PROGRAM_STOP_TYPES_S`),
I/E CYCLE typing `C` alone, the other stops silent as a category ruling; every 1415 transcript
through `machine.start()`; four reference layers with the fixed-point simulator demoted to a
regression pin; tolerances published before the golden and never widened without Tom; the page
parsed back into numbers with a mutation pass; no third listing golden; the real-time pacing item
as Tom's decision with a recommendation to take it.

**Plan writing** (`wf_cf337e1c-998`, 2026-09-03/04, voltron; 16 Opus agents, 5.67M tokens, ~4.3 h,
0 errors) — an Opus spine writer fixed the numbers sheet (`NUMBERS.md`: case card, band, dt, rows,
forms, the column map, the scaling table, the antilog, per-step op counts and µs from
`src/core/cycles.ts`, the memory map, card counts, tolerances, the migration list, the wave skeleton)
and wrote sections 0-3; four Opus drafters wrote 4-16 in parallel against it and reported 46
disagreements with the sheet, the largest being that the sheet's mock rows came from the two-level
antilog it had itself designated the fallback; an Opus integrator assembled the document (4,145
lines) and reconciled 29 numbers and cross-references.

**Review — round 1, two Opus skeptics.** Research: needs-revision, **2 blockers / 6 majors / 8
minors** — the band top is a **state**, not an altitude (a run started at V_E = 23,000 ft/s at
150,000 ft is 60.46 ft/s off eq.13 on every row, 121× the published DIFF bound; the deck now starts on
eq.13's own curve at 22,939.54 ft/s), a case-card literal that could not have been punched as
claimed, `DECEL`'s scale, the extract's precision claim, the product-fit proof, the antilog's bias
range, the `u^3.15` interpolation bound at the bottom of the trajectory, the punch block's count.
Engineering: needs-revision, **1 blocker / 4 majors / 11 minors** — the 54-card RPG spec deck's
claimed run and page, the emitted-position and card-count figures disagreeing across sections
(7,440 / 143 / 147), the work-block overrun, and Tom's decisions scattered without a default and a
priced alternative (which is where §2.4 came from). **32 applied, 0 declined** by the Opus reviser
(4,524 lines).

**Round 2, three Opus verifiers.** Research: all 32 closed; **1 blocker / 1 major / 5 minors** new —
seven printed columns are fed truncating sub-fields while the mock showed rounded values, so eleven
cells were re-cut under the truncation rule and the rule was stated (§5.1 rule 3, §7.6). Engineering:
30 closed, 2 partial (one shared root cause: the work-block itemisation); **0 / 2 / 3** new,
including the `ANTA` listing's filler digits. Coherence: all 32 closed; **0 / 2 / 7** new — the work
block again, and "twelve MCE words" where the deck carries nineteen. Each verifier re-derived the
physics, re-called the µs from `cycles.ts`, re-summed the map and re-read every cited `file:line`;
the research seat ran the 54 spec cards through the real generator, assembler, loader, 1402 and 1411
with a 92-card data deck (9,648 bytes, two forms, `RECONSTRUCTION` on both). **23 applied, 0
declined** (4,630 lines).

**Round 3, one Opus whole-document re-verifier:** 22 of 23 closed, 1 partial; needs-revision on
**1 blocker / 2 majors / 5 minors** — §6.11 listed the work areas as `DS` while §5.11 booked them as
emitting `DCW`s (now the `DCW`-of-zeros rule, §5.5, with the word-mark reason: a `DS` arrives blank
and **unmarked**, and arithmetic length is the B-field word mark's), `PL10`'s rescale offset, and the
mock's truncation claim. **9 applied, 0 declined** (4,841 lines). **Round 4, second pass:** all 9
closed, **`ready-with-notes`, zero blockers, three residual minors**, each independently verified —
120 mock cells re-derived, 19 control words re-run through the shipped MCE executor, 21 unit costs
re-called from `cycles.ts`, the trajectory re-integrated.

**The three residual minors, applied by the main session at `bb7cd7e`** after checking each against
the tree: `CDIN`'s twelve `DA` sub-entries are the bare-`lo` form and emit nothing
(`software.md:98`, `src/asm/symbols.ts:427-428`), so the "twelve emitted positions" paragraph was
wrong and the two one-position group-mark records `PAGM` and `PLGM` — each at its own `ORG`, each
its own record, the `demos/sales-summary.asm:268-269` precedent — were unbooked: the object-deck
estimate moves **152 / 156 → 154 / 158**, an estimate either way, and criterion 18 asserts the
measured count; the mock's column 6 is an `MLCA` literal, so "eleven detail control words", not
twelve; and the multiply-idiom citation names the elided `A AMT,DTOT` card at
`demos/sales-summary.asm:157`. One attribution fixed in §3.1: this build log is opened by the
arrival commit (§16 item 7), and wave 0 appends.

**What the review caught, in order of consequence.** The band-top state (a wrong first row on
every page, invisible to a golden it would have authored); the `DS`-versus-`DCW` word-mark rule (a
deck that would have run every arithmetic statement past its own field); the truncation rule (a mock
that promised digits the deck cannot print); the case card's literal; the work-block overrun; the
emitted-position arithmetic; the nineteen control words; Tom's decisions gathered. None of it moved
the spine — the winner's page, the integration, the punch, the rename — and every number the review
moved is now stated in exactly one section and cited from the others.

**The gate baseline measured on `voltron` at `53b46d4` (`main`) before a line of the plan was
written:** typecheck clean · `npm test` **111 files / 1968 passed / 1 skipped** · `npm run smoke`
**7 / 50** · `npm run cc01` PASS, instruction check at **00322**, **1241 instructions**, 82,543.5 µs ·
goldens **348 / 2251 / 3688 / 6982** by their CLI lines and **120 / 2522 / 33450** by `npm test` ·
`npm run build` clean, `dist/` 294.89 kB JS + 5.53 kB CSS, **1** relative asset ref ·
`npm run check:deferred` **1 ok · 0 tripped · 0 manual · 0 no-trigger · 0 resolved** ·
`src/ui/internals/controls.ts` SHA-256 `a6d90f54…` unmoved.

**The gate at `bb7cd7e`** (the plan, the dossier and the register on the branch): every line above
identical, **except `npm run check:deferred`: `0 ok · 1 tripped · 0 manual · 0 no-trigger · 0
resolved`, exit 1** — DEFERRED-01, tripped by `ls docs/plans/phase-6-*.md`, which the dossier and the
plan both match.

**The register's state at the plan commit, explicitly.** `docs/deferred-work-register.md`'s
DEFERRED-01 moved **WATCHING → TRIPPED** at `bb7cd7e`, per the register's own protocol ("auto-trigger
fired; commit when noticed"), with the trigger and the discharge named. That status change buys no
gate output — `scripts/check-deferred.sh:73` puts WATCHING and TRIPPED in the same case arm — it is
documentation of what is true. This is plan §9.9's **ordering A**: one red `check:deferred` commit on
the feature branch, `main` untouched, the entry saying the work is not done because it is not. The
alternative, ordering B (the escalation and wave 0 before the plan commit, never red), lands a
`src/core` change before Tom has gated the plan and is his decision 1. **Nothing is falsified in
either ordering.**

**Open for Tom at this gate** — plan §2.4, the ten decisions on one page, each with the
orchestrator's recommended default and the priced alternative: (1) the register ordering; (2) the
band and gravity, with rows / forms / dt; (3) the job shape and the punch; (4) twelve columns or
eleven; (5) the case-card numbers; (6) real-time pacing at the desk; (7) the plain-white form; (8)
what the desk says about `hello-dad`; (9) the walkthrough's form; (10) the build process. The seven
bullets at the head of the plan are the gate summary.

---

## Wave 0 — DEFERRED-01 discharged

`HALT_TYPES_NO_PRINTOUT` is deleted and `PROGRAM_STOP_TYPES_S = true` declared, `[verified]`
against S223-2648 p.6. A halt under MODE = I/E CYCLE types the `C` line alone; the interlock stop
and the two emulator-side stops stay silent as one category ruling. Plan §9 in full; the migration
is §9.4's list and the omissions are §9.5's.

**What landed** — eight files edited, two created, **144 insertions / 55 deletions**, no file added
under `src/`:

| file | edit | lines |
|---|---|---|
| `src/core/machine.ts` | the `[verified]` citation block, `PROGRAM_STOP_TYPES_S`, the `IE_CYCLE_HALT_TYPES_C_ALONE` `OPEN:`, the category ruling; `printIfError` → `printStop(stop, mode)`; both call sites | +55 / −22 |
| `test/machine-console.test.ts` | the import, the describe comment, two inverted cases, one new named case | +34 / −12 |
| `test/tier4-period-storyboard.test.ts` | `:262` gains an eighth id; `:265` four matrix-35 `S ` rows become five | +4 / −3 |
| `src/ui/period/console/session.ts` | the citing comment, rewritten to the resolved name and the measured zero | +10 / −10 |
| `src/ui/period/console/rotaryView.ts` | the constant's name and its `file:line` | +2 / −2 |
| `docs/deferred-work-register.md` | DEFERRED-01 → RESOLVED, §9.6's text, the cost claim corrected | +25 / −4 |
| `PHASE-1-NOTES.md`, `PHASE-4-NOTES.md` | five appended dated `SUPERSEDED` lines, no rewrites | +19 / −2 |
| `docs/screenshots/phase-6/README.md` | NEW — §11.6's protocol and the `wave-N-<station>.png` rule | 18 |
| `docs/screenshots/phase-6/wave-0-1415.png` | NEW — this wave's screenshot, below | 49 kB |

**The measured zero, reproduced three times this session** — by the orchestrator, by the
implementing worker and by the reviewer, independently:

    node build/tools/run-cor.js oracles/cc01.cor --iar 02000 --trace 1 | grep -c "OP \. "   ->  0

1241 level-1 instruction lines and not one op `.`. The executed-op histogram is **J 325 · D 153 ·
`,` 138 · W 133 · S 131 · ⌑ 115 · V 75 · C 47 · B 36 · G 33 · ? 24 · / 10 · A 7 · N 5 · R 4 · ! 3 ·
M 2**, summing to 1241. So the rename moves **zero bytes** of the cc01 transcript, and `npm run
cc01` is byte-identical below — which is what makes any movement there a defect in the rename
rather than a Phase 6 finding. The register's "eleven `S` lines" was a **static** count of `.` sites
in the core image, CC01A's error-halt sites, reachable only on a failed check; the corrected entry
records the claim and its correction rather than deleting either.

**Gate at this commit** (§12.2; baseline at `bcd93f8` in brackets where it moved):

```text
npm run typecheck                            clean
npm test                                     111 files / 1969 passed / 1 skipped   [1968 -> +1 case]
npm run smoke                                7 files / 50 passed
npm run cc01                                 PASS — CC01A, CC01 COMPLETE, instruction check 00322,
                                             1241 instructions, 82,543.5 us — BYTE-IDENTICAL
npm run check:deferred                       0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved
                                             exit 0                    [was 0/1/0/0/0, exit 1]
goldens                                      348 / 2251 / 3688 / 6982 / 120 / 2522 / 33450 unmoved
npm run build                                exits 0; dist/ 3.03 kB HTML + 5.53 kB CSS
                                             + 294.95 kB JS           [294.89 -> +0.06]
grep -c 'src="\./assets' dist/index.html     1
shasum -a 256 src/ui/internals/controls.ts   a6d90f54…4bf318f unmoved
grep -rn HALT_TYPES_NO_PRINTOUT src/ test/   0
git diff --name-only --diff-filter=A -- src  empty  (criterion 7)
```

`check:deferred` is the one line that moves, and it moves the way §9.9's **ordering A** says: the
arrival commit `bcd93f8` was red for exactly one commit on this branch, `main` untouched, and this
commit turns it green. Nothing was falsified in that window — the entry said the work was not done,
because it was not.

**§15 row 13's wave-0 obligation, discharged.** The row says *"No shipped test asserts a console
line for an `ioInterlockStop`; wave 0 verifies that before it lands."* Verified: the only three
sites are `test/channel-control.test.ts:201`, `test/exec-io.test.ts:101` and `:207`, and all three
drive `machine.step()`, which never reaches `printStop`. The ruling costs no shipped assertion, and
the cost-to-flip is now written into the constant's own comment.

**Five numbers this build corrected against the plan.** The plan is not edited during the build;
each is recorded here and built to as measured.

| plan says | measured | consequence |
|---|---|---|
| §9.2 / §9.4: a halt under I/E CYCLE gives `['B','C']` | **`['B','S','C','C']`** | `Cpu.stepCycle` returns the I phase incomplete and only reaches the executor on the second START, and each START types its `C`; the leading `S` is the rotary turn through `setMode`, the public surface the rest of the file uses. The whole list is still what discriminates the ruling — under the fallback it becomes `['B','S','C','C','S']`, verified red before the case was accepted |
| §9.4: the register entry is `:21-38` | `:21-39` | the trigger fence closes at `:39`; no edit consequence |
| §3.1 / §9.4: `printIfError` at `:234-243` | `:235-242` | none |
| §9.4: `PHASE-4-NOTES.md:515-518` | `:515-519` | the bullet is one line longer; the append lands after `:519` |
| §9.1: `open-questions.md:938-955` | `:939-956` | `:938` is blank; the citation in `machine.ts` uses the measured range |

`docs/STATUS.md:161` (§9.4) is now `:214`, with a second site at `:30` in the 2026-09-04 block.
Both are the orchestrator's at merge, not a wave's, and neither is touched here.

**One drift this wave causes and does not fix.** The rewritten block grew, so `machine.ts:<line>`
citations elsewhere in the tree are stale: measured against two anchors, `fieldLine` 226 → **255**
(+29) and `stop()` 380 → **413** (+33). There are **160** such citations tree-wide (excluding
`build/`, `dist/` and `node_modules`), **118** of them above old line 65 and therefore stale. Every
file carrying them is either do-not-touch under §3.9 (the plans, the panel dossiers, the research,
the build logs, the phase notes) or outside wave 0's list (`src/ui/period/**`, `src/ui/main.ts`,
`test/period-console.test.ts`), so none is edited. A uniform drift with a stated offset is
checkable; a partial fix would not be. Carried to `PHASE-6-NOTES.md` §4 as an open item.

**Two findings from the wave's Opus adversarial review, both applied before this commit.**
The review returned `NEEDS-REVISION` on two blockers and two majors; all four are closed here.

1. **`PHASE-4-NOTES.md:18-20` was made false by the rename, and nothing greps for it** — the same
   defect class the design panel caught at `:7`, one paragraph lower. The sentence counts
   `grep -rn "OPEN:" src/ui/period src/ui/styles` at **43** matching lines and **39** blocks; wave 0
   replaced `session.ts`'s `OPEN:` block with a `RESOLVED:` one, so the count is now **42** and
   **38** (measured; the four references-rather-than-blocks are in untouched files, so 42 − 4 = 38).
   Closed by one more sentence in the same appended paragraph — an append, not a rewrite.
2. **The `[verified]` block rebutted only the weak counter-evidence.** It disposed of A22-0526-3
   p.23 as silent, but `open-questions.md:939-947` records the harder half: pp.50-58 *enumerate* the
   print-out triggers and the program stop is **not** among them. An omission from a list is still
   not a denial, and S223-2648 is the 1415's own CE manual naming the case in a sentence written to
   enumerate — but a block tagged `[verified]` that answers only p.23 reads as though p.23 were the
   whole opposition. Both halves are now in the comment.
   The two majors — §15 row 13's unrecorded verification, and this section's absence — are the
   paragraph above and this section itself.

Three review minors are recorded rather than fixed: the `[verified]` block states no
settle-condition or flip-cost (§15 row 11 carries both, and §15 exempts the one `[verified]` row
from the `// OPEN:` shape); `INTERLOCK_STOP_STAYS_SILENT` and `EMULATOR_STOPS_ARE_NOT_MACHINE_STOPS`
carry their `OPEN:` token **mid-line** inside the category block rather than at line start, so
wave 7's `test/reentry-open-constants.test.ts` must match on a substring and not anchor; and
`machine.ts` introduces **three** new `OPEN:` names into §16 item 3's first source domain, all three
of which wave 7 owes a `PHASE-6-NOTES.md` §1 row.

**Screenshot — `docs/screenshots/phase-6/wave-0-1415.png`.** The 1415 Selectric roll after
`demos/hello-dad.cards` is walked at the desk: `sample deck`, PUT DECK IN HOPPER, READER START, END
OF FILE, STOP, MODE = DISPLAY, START, `00000` keyed on the drawn keyboard, MODE = ALTER, START,
`key the bootstrap`, COMPUTER RESET, MODE = RUN, START. Eight lines, and the last one is the wave:

```text
S ØØØ76 ØØØ75 ØØØ75 .÷ bbb b̲b̲b̲b̲
```

— matrix 35, Op group `.`, the programmed halt typing the line that did not exist yesterday. The
1403 printed its five lines and the page golden did not move. §11.6's two questions do not apply to
this station (they are about the twelve-column table, waves 4 and 6), and the question this shot
does answer — *can the operator tell a finished job from a jammed one?* — is now yes, on the paper,
which is the whole of §1 step 8. **One defect found by taking it, in the harness and not in the
build:** the period MODE rotary's detents are SVG `<text>`, and the INTERNALS tab carries buttons
with identical labels (`DISPLAY`, `START`, `STOP`, `COMPUTER RESET`), so a label-matched click can
drive the wrong panel and move `machine.mode` from underneath the desk. Recorded for waves 4, 5 and
6, which take three more screenshots through the same harness.

**Wave 0's second commit is the research escalation** (§9.7): `docs/research/open-questions.md` and
nothing else, amending the five DEFERRED-01 rows in place. It lands immediately after this one.
Between the two commits `open-questions.md:174` reads *"Coded as `HALT_TYPES_NO_PRINTOUT` … pinned
by `test/machine-console.test.ts`"*, which both halves of this commit have just made false. That
one-commit window is the price of §9.7's rule that a research correction is its own commit, and it
is named here for the same reason the red `check:deferred` window is: it is true, and the log says
so rather than letting a reader discover it.

**On the missing sha in this section's heading.** §16 item 7's shape is
`## Wave N — <what> — commit <sha>`, and §9.6's register template carries a `<sha>` too. Neither is
reachable: both files are *inside* the commit they would name, so a commit cannot contain its own
hash, and amending to insert it changes the hash again. Rather than cite a sha that a later amend
falsified — this build did exactly that once, and caught it — both places name the wave and give the
command that finds the commit: `git log -S PROGRAM_STOP_TYPES_S`. Later waves whose sections are
written after their own commit can carry the literal form.

**Wave 0 postscript — two consequences of the escalation commit, closed in a third commit.**

1. **The escalation invalidated a citation the discharge had just written.** `machine.ts` cites the
   primary read at `open-questions.md:939-956`; the escalation's own append extended Target (e) to
   **`:939-963`**, so the range stopped seven lines short of the finding it names. Corrected here.
   This is the cost of §9.7's rule that a research correction is its own commit, taken in the order
   §9.9's ordering A requires — the discharge first, so the red `check:deferred` window stays at
   exactly one commit — and it is cheaper than the alternative, which was a second red commit.
   `docs/plans/phase-6-reentry.md:3429` carries the same citation as `:938-955` and is left as
   written: §3.9 makes the plan do-not-touch, and the plan is not edited during the build.
2. **One deviation from §9.7, recorded rather than silently taken.** §9.7's table says
   `open-questions.md:1098` is *"renamed"*. That line is Phase 4's own inventory sentence naming
   three core constants; renaming the token in place would make it read as though Phase 4 had known
   the new name. The escalation left the sentence as Phase 4 wrote it and put the current name in a
   dated parenthetical immediately after — the treatment §9.4 prescribes for every other historical
   record, and for the reason it gives: editing a phase's record into agreement with a later phase
   destroys the audit trail that made the discharge possible. Carried to `PHASE-6-NOTES.md` §2.

---

## Wave 1 — the reference layers, and the published tolerances

Four new files, **1,542 lines**, no `src/` change and no `demos/` change. This is the wave the rest
of the phase is judged against, and its deliverable is the table below: **the tolerances are
published here, before any golden exists.** §14 R2 is why — the goldens in this phase are ours, so
one could be "fixed" to match a bug; the defence is that the bounds are written down first and the
page is later parsed back into numbers against **layer 2**, never against the golden.

| file | what | lines |
|---|---|---|
| `test/fixtures/reentry-reference.ts` | layers 1, 2 and 3; §5.2's scaling table and §5.3's products as data; §4.5's tolerances as data | **1,026** (§12.3 estimated ~430) |
| `test/reentry-reference.test.ts` | oracle (a) and (c) — layer 1 vs layer 2, layer 3 vs eq.13, §4.6's guards and the invariance regression, and the no-`src/` rule | 222 |
| `test/reentry-tables.test.ts` | oracle (b) — `ANTA` vs `Math.pow` | 157 |
| `test/reentry-scaling.test.ts` | oracle (d) — §5.2 and §5.3 against the rule | 137 |

**The fixture imports nothing. Not from `src/`, not from anywhere.** §12.3 makes that a rule of the
file rather than an accident: layer 2 is the counterpart the emulated machine is gated against, and
a reference that imported the emulator's own arithmetic would be gating the machine against itself.
§12.3 says the rule "is asserted" — **it was not, by anything, until this wave's review found it**,
and it would have fallen through the whole phase: waves 2-5 read the fixture and §11.2 lets layer 3
be corrected freely, so a later worker "fixing" layer 3 by reaching for `src/core/alu.ts` is the
plausible way it rots. Two cases now assert it, and both were verified to go red with a `src/`
import injected.

### The published tolerances

**Layer 1 against layer 2 — the physics against the integration.** Measured values are from the
wave's reviewer, integrating independently with no fixture import.

| check | published bound | measured | derivation of the bound |
|---|---|---|---|
| eq.13 per row, worst \|V − V_AE\| | **1.0e-2 ft/s** | **6.4627e-4 ft/s** at t = 12.00 s | RK4 truncation goes as (dt)⁴; one order under VELOCITY's last printed digit, 15× the measurement |
| `Ei` elapsed time, worst \|t − t(h)\| | **1.0e-4 s** | **7.8323e-7 s** at t = 22.75 s | one hundredth of TIME's last printed digit (0.01 s) |
| `erf` heat load, worst relative over the 91 rows with Q > 1 | **1.0e-3** | **3.2686e-4** at t = 0.25 s; last row **3.2868e-5** (19,489.06 trapezoid vs 19,489.70 closed) | the trapezoid's own method error at dt = 0.25 |
| eq.7 atmosphere — `ANTA` vs `Math.pow`, 100 entries + 200 interpolated points | **1.0e-5 relative** | **9.0180e-8** over the entries; **2.11e-6** worst interpolated | 5× the antilog's 2.034e-6 truncation bound (§5.6) |
| eq.17 peak g | **0.5 %** | closed 68.7343 g; layer 2's peak row 68.6817 g at t = 11.00 → **0.0765 %** | dV/dt is flat at its maximum |
| eq.15 y₁ | **1,778 ft** = one integration step | closed 34,570.1 ft; peak row 35,436.9 → Δ **866.8 ft** | a grid property, not an error bound: V sin γ dt = 1,777.8 ft at that row. It changes if dt changes |
| eq.16 V₁ | **553 ft/s** = one integration step | closed 13,950.2 ft/s; peak row 14,222.3 → Δ **272.1 ft/s** | a_D dt = 68.7343 × 32.174 × 0.25 = 552.9 ft/s |

**Layer 3 against eq.13 — the fixed-point regression pin, never the gate (§4.4).**

| check | published bound | measured | derivation |
|---|---|---|---|
| max \|DIFF\| = max \|V − V A-E\| | **0.50 ft/s** | **0.0800 ft/s** at t = 13.25 s over 92 rows | V at S = 2, one half-adjust per combination move ≤ 0.005 × 92 steps with no cancellation = 0.460; plus the antilog chain at 2.034e-6 relative over 20,821 ft/s = 0.042; total 0.502 → published **0.50**. Written down from S and the step count *before* the simulator was run against it |

**The antilog's own bound (§5.6), and it is RELATIVE.**

| check | published bound | measured | derivation |
|---|---|---|---|
| quadratic residual truncation, **relative** | **2.034e-6** | leading term (ln10·r)³/6 at r = 0.0099999 is 2.0345e-6 **absolute**, **1.9882e-6 relative to 10^r**; measured worst \|CORR − 10^r\|/10^r over all 10⁵ values of `R` is **1.99973e-6** | `ANTA[F1]` ∈ [1,10), `CORR` ∈ [1, 1.0232907] and the decade is exact, so the bound holds at **every** decade. §5.6 capitalises RELATIVE, and its own "1.9998e-6 with the correct constant" reproduces here to five digits. The absolute reading would exceed 2.034e-6 and is a different quantity |

### The rule, verbatim, published with the table

*A tolerance published in `docs/BUILD-LOG-6.md` before the golden may not be widened, and the
reference may not be edited to match the program, without Tom's authorisation; any such change is
its own commit with its own reason.* Tightening is free. Checked at close-out by
`git log --follow docs/BUILD-LOG-6.md` against this section (§4.5, §11.4, §14 R3).

### What this wave's oracle does NOT establish, stated so a green test is not over-read

The S values and rescale offsets in the fixture were **transcribed by hand** from §5.2 and §5.3, so
this wave checks the fixture **against the rule**, not the fixture against the deck: a
consistent-but-wrong pair passes here. Nothing ties `demos/reentry.asm`'s literal `WORK-n` offsets
to the table until **wave 3's oracle (f)** parses the deck's own `MLC` and `A +5` sites and asserts
them against it. The test files say so in their headers.

### Numbers this wave corrected against the plan

| plan | measured | consequence |
|---|---|---|
| §5.3 row 4: `ANTA[F1] × CORR` peak **10.0001**, 16 digits | **9.9999776**, **15 digits** | The peak is **unattainable**: swept over all 100 × 100,000 (F1, R) pairs, the max is 9.9999776 — `ANTA[99]` fetches 9.7723722 and `CORR` caps at 1.0232907. §5.2's own `MANT` range (1.0000000-9.9999999) already said so, so the plan's two tables contradicted each other, and **no oracle in the phase could see it**: the rule checks `digitsInProd` against the *stated* peak and nothing checked the stated peak against reality. No field-size consequence — 16 is still the widest product (rows 5, 7, 8) and `PROD` is still 17 |
| §4.3/§4.5: worst relative `erf` deviation **3.287e-4** | **3.2686e-4** at t = 0.25 s | A transcription slip, confirmed: 3.287e-4 is the **last row's 3.2868e-5 with its exponent shifted one place**, not the worst-over-rows figure, which merely resembles it. The published **tolerance** 1.0e-3 is untouched and correct; only the measured column moves |
| §4.5: layer 3 worst \|DIFF\| **0.07 ft/s at t = 14.00** | **0.0800 ft/s at t = 13.25** | Both 6-7× inside the published 0.50. Layer 3 is a regression pin, so this is a measurement the build replaces, like the memory map. §7.7's summary block and §7.6's mock carry 0.07; **wave 4 prints what the deck computes**, and criterion 9's requirement is that the printed figure equals the test's — which holds at whatever the value turns out to be |
| §12.3: the fixture at ~430 lines | **1,026** | An estimate the build replaces. The header is 77 lines and §5.2/§5.3 transcribe to 59 data rows |

Layer 3's own tail, recorded here because waves 3 and 5 will otherwise expect layer 2's: last row
**h = 198.6 ft**, **V = 2,118.09 ft/s**, **QTOT = 19,489.08**, refused 93rd candidate **−62.4 ft**.
§8.5's punched-digit table is written from layer 2's 198.8 / 19,489.06 and is a **wave-5** test to
write against the deck, not against either layer.

### A constraint on wave 3, and a logged plan deviation

**`// OPEN: HALF_ADJUST_IS_ON_THE_MAGNITUDE`** — a ruling that arrived during wave 1, so it is a
**logged plan deviation**: §15 freezes its ledger at the close of this wave and the plan is not
edited during the build (§3.9), so it goes to `PHASE-6-NOTES.md` §2 and owes a §1 row for wave 7's
set-difference test.

Layer 3 half-adjusts on the **magnitude** — round half away from zero, which is what "half adjust"
means. **The machine does not do this for free.** `A +5,WORK-n+1` is an *algebraic* add: on a field
whose units zone carries a minus it adds +5 to a negative number, reduces the magnitude and rounds
toward zero. §5.1 rule 3 states the idiom with no sign caveat, which is what a wave-3 worker will be
reading. The fields it bites are the ones this deck carries signed — `K1V`…`K4V`, `DIF`, `L10R`,
`ARG` — and it is load-bearing beyond them, because the V combination move half-adjusts a negative
`dt/6 · Σk` on **every** step and wave 3's oracle (a) is **exact** per-step equality.

**So, binding on wave 3:** the deck does its arithmetic on **magnitudes** and stamps the sign with
`MLZS` — `pi.job`'s own idiom and §5.1 rule 4 — in which case `A +5` always sees a positive field
and the ruling and the machine agree. A deck that half-adjusts a signed field in place must use the
sign-matched literal instead. Wave 3's oracle (f) parses the deck's own `A +5` sites, and that is
where the two are reconciled.

### One defect in the model that no measurement on this trajectory would have caught

`F1` is a **field slice** on the machine — `MLN ARGB,F` and two digits, reading digits rather than
dividing — and the fixture computed it as `Math.floor(f * 100)`. Over all 10⁷ values `F` can hold,
that disagrees with the slice on exactly three: **F = 0.2900000, 0.5700000, 0.5800000**, where the
binary product lands a hair low, `F1` comes out 28/56/57 instead of 29/57/58, and the residual
becomes `r = 0.01` — which the 5-position `R` field at S = 7 cannot hold (§5.2 caps it at
0.0099999). Measured at F = −2.71 that is **2.05e-6 relative** against a correct slice's 9e-8.

None of the 92 rows nor either sweep touches those three arguments, so every assertion in this wave
had margin and stayed green. But **wave 2's oracle is digit-for-digit against this routine at 100
arguments spanning −10 … +6**, and **wave 3's oracle (a) is exact per-step equality against it** —
either could have gone red with the deck entirely correct. Both slice sites now take the digits off
the integer field, which is what the machine does.

### Gate at this commit

```text
npm run typecheck                            clean
npm test                                     114 files / 2003 passed / 1 skipped   [111 / 1969]
npm run smoke                                7 files / 50 passed                   [unchanged]
npm run cc01                                 PASS — 00322, 1241 instructions, 82,543.5 us
npm run check:deferred                       0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved
                                             exit 0
goldens                                      348 / 2251 / 3688 / 6982 / 120 / 2522 / 33450 unmoved
git diff --diff-filter=A 53b46d4..HEAD -- src  empty  (criterion 7)
```

The `+34` cases are 32 from the three new files plus the two no-`src/` guards the review added.

### Review

One Opus adversarial review before the commit: **three blockers, two majors, eight minors**, verdict
`NEEDS-REVISION`. All five blockers and majors are closed above — §5.3 row 4's unattainable peak,
the `erf` figure's shifted exponent, the `OPEN:` name written without its `// ` prefix (which would
have taken wave 7's set-difference red in one direction), the `F1` float hazard, and the unasserted
no-`src/` rule. The review also re-derived every constant in §4.2 from NACA 1381 with no fixture
import and reproduced all of them to the published digit, including `CQ = log₁₀(A_q)` to a
difference of exactly zero and the band-top state `V₀ = 22,939.54 ft/s` — the single easiest thing
in this phase to get wrong.

Minors carried rather than fixed: `ei`'s asymptotic branch is unreachable at these arguments and is
kept for completeness; `antilogFixed`'s `mantissa >= 10` renormalisation is unreachable for the same
reason B1 gives and is kept as defence; both integration loops are unbounded `for(;;)` with monotone
descent as the termination argument, which is sound for the default card and worth a cap if a user
card ever drives them; `constantDisagreements` compares at 8 significant digits, which discards the
9th published digit of `C2`, `A_q` and `CQ` — uncapping passes for all 23 and would be strictly
stronger. The reviewer proposed adding this wave's ruling as a §15 row 30; that would edit the plan
during the build, which §3.9 forbids, so it is logged as a deviation instead.

---

## Wave 2 — the antilog probe, the first Autocoder that runs

Three new files, no `src/` change, **no golden** — §11 wave 2 refuses one, because the probe is
scaffolding whose numbers are checked against a function and a golden would freeze a page nothing
later reads. `test/golden/` stays at seven files.

| file | what | size |
|---|---|---|
| `demos/probe-antilog.asm` | `ANTA`, `ANTLOG`, a read loop, a print block, a programmed halt | **288** source cards (§3.3 estimated ~160) |
| `demos/probe-antilog.data.cards` | 30 comment cards stating the selection, then 100 argument cards | **130** (estimated ~105) |
| `test/tier3-reentry-antilog.test.ts` | the oracle | 367 lines, 19 cases |

**This is the routine that ships.** §11's wave-3 row says the `ANTLOG` in `demos/reentry.asm` is
"THIS ONE, copied forward by wave 3". It is the phase's only non-elementary operation and every
printed column except TIME and GAMMA passes through it, six times per row.

### The oracle

The deck through `assemble()` → `loaderDeck()` → the real 1402 → the real condensed loader → the
real 1411 → the 1403, driven through `machine.start()`, ending `stop === 'halt'`:

```text
assemble()                       ok: true · flagged 0 · warnings 0 · 41 condensed records
the run                          5,089 instructions · 1,236,531.75 emulated us · hopper 0
the page                         104 printed lines — 4 heading, 100 detail
against layer 3's antilog        100 of 100 arguments agree, mantissa AND decade
worst per-argument difference    0 ulp at S = 7
ANTA vs the fixture              100 cards byte-equal; entry 99 = 9772372210, top eight 97723722
ANTA emission                    19 object records / 1,000 payload positions, 07480-08479
```

The four mechanisms §11 names are asserted separately, so a failure says which one broke: the
**negative-argument bias** (71 negative cards; `ARGB = ARG + 10` is what makes the decade slice
unsigned), the **two-digit field slice** (`F1 = 00` on 10 cards and `F1 = 99` on 13), the
**ten-position indexed fetch** (`ANTA-2+X1`, the top eight of a ten-digit entry, at 20 sweep points),
and the **Horner residual** (`R` at 0 on 56 cards, at 1 ulp on 4, at its 0.0099999 maximum on 9).
All sixteen biased decades and 51 distinct `F1` values are covered, computed from the data deck
rather than taken from its comment cards.

`ANTA`'s 100 punched cards were checked against `10^(i/100)` **computed independently of the
fixture**, under both half-even and half-up rounding with no ties — so a shared generator error is
ruled out rather than assumed. Worst relative error of the fetched top eight: **9.018e-8**.

### The oracle has teeth — ten mutations, ten red

The panel's standing finding is that no proposal proved its oracle had teeth. This one was mutated
ten ways and went red on every one: the half-adjust moved onto the target units (2 cases red), a
rescale offset off by one (7), `SBR ANTX+5` → `+6` (14), the sign stamp removed (13), the fetch
`ANTA-2` → `ANTA-1` (11), `R` widened to six positions (11), `ARGF1-1` → `ARGF1` (10), `KBIAS` one
ulp off (13), `KC1`/`KC2` swapped in the Horner chain (8), and — the one expected to survive — **a
corrupted `ANTA` entry 04, which no argument fetches**, caught by the source-against-`ANTA_DIGITS`
byte comparison. Every file restored and re-verified afterwards.

### Six errors in the plan's own listings, found by running them

The plan is not edited during the build; each is recorded here and built to as measured.

| # | plan | measured | why it matters |
|---|---|---|---|
| 1 | `SBR ANTX+6` (§5.8, §6.4, and **three more sites**) | **`SBR ANTX+5`** | `opcodes.md:222`: `G ccccc d` is 7 characters and the C-address is the **rightmost** position of the destination; a branch is 7 characters, so its address units is `+5` and **`+6` writes across the d-character**. Corroborated by `rpg-sources.md:579`'s `[verified]` period skeleton `RDCD1 SBR BCCK1&5` — chain A prints `&` where H prints `+`, so the surviving IBM listing shows `+5`. **This is the one to carry forward:** the review found it wrong at **five** plan sites, not two — §2.3 (`:302`), §5.8 (`:1492`), §6.1 prose (`:1939`), §6.4 (`:2084`), and **comment card 01180 of §6.1's block (`:1919`), which wave 3 copies verbatim into `demos/reentry.asm`** and which would put a false statement on the one header a reader of the artifact ever sees (§16 item 1) |
| 2 | `S=7` in statement comments (§6.2, §6.11 throughout) | `S 7` | `=` has no BCD in this emulator at all, so the card is flagged. The first assembly took **11 flagged lines** for exactly this. §6.1's chain-A rule is written as applying to *printed* literals and comment cards; it applies to **statement comments** too |
| 3 | §5.4: `A +5,PROD-5` then `MLC PROD-5,W1` | `A +5,PROD-6` with `MLC PROD-7,…` | The snippet half-adjusts at the **same** address it rescales from, so the +5 lands on the target units and adds a whole unit. §6.0 rule 1 states it correctly as `A +5,WORK-n+1`, and `demos/sales-summary.asm:156,158` is the shipped precedent |
| 4 | no `LTORG` | `LTORG *` after the code | The literal pool otherwise flushes at `END`, above the high-water. §6.11's "07000 — the slack the literal run's GM-WM hits" presupposes it and never shows it |
| 5 | — | literals cap at 52 characters; card comments end by column 72 | Three heading lines had to be split into six `DCW`s |
| 6 | §6.11 indents `CDIN` to column 7; `sales-summary.asm:260` has it at column 6 | **either works** | Measured: a `DA` label resolves **high-order regardless of indent** — column-6 `CDIN` resolves `{value: 2540, resolvedTo: 'highOrder'}`. So the indent is *not* load-bearing for `CDIN`. It **is** load-bearing for `PLINE`, which is a `DS` — §6.0 rule 2 stands there |

Two further figures the build replaces: `ANTLOG` is **27 statements** (26 executed per call), not
§6.4's 25 — §6.3 already disagreed with itself at 8,323.5 µs; and the probe's high-water of
**08,732** is *not* independent agreement with §5.11's map, it is the map's own `ORG 08600` +
`PLINE DS 132` + `PLGM` copied into the probe. The probe has **no `PAREA`**, so 08,500-08,599 is
untested, and its code run ends at **01,528** against the shipped deck's projected ~07,000. **Wave 3
must republish the map against its own measured code length and must not read this as confirmation.**

### The renormalise arm is a clamp, and that is now written on the card

`ANTLOG` carries an overflow arm whose detection is correct — the 8×8 product is at most 16 digits,
so `PROD-16` is always `0` and `BCE ANTX,PROD-15,0` is the exact 16th-digit test — but whose action
writes `1.0000000` into `MANT` rather than dividing by ten as the fixture does. For `ANTLOG` the arm
is **provably dead**: `ANTA[99]` fetches 9.7723722, `CORR` caps at 1.0232907, the product tops out at
**9.9999776**, and it fired **zero times in 100 calls**. Wave 1 proved the same bound analytically
and corrected §5.3 row 4's peak on it.

It is kept as defence — that proof depends on `ANTA` and the two Horner constants, which a later
wave could move — but the divergence must not travel unlabelled, **because wave 3 has a live site of
the same shape**: the identical `if (x >= 10) { x/10; decade++ }` pattern governs **`RHOM`**, and
§5.3 row 5 gives `RR0 × XM → RHOM` a peak of **14.304**, so that arm fires for real on many of the 92
rows. A wave-3 worker copying `ANTLOG`'s arm as the model would silently destroy the mantissa's
significance, and wave 3's exact-equality oracle would report it as an unexplained *integration*
mismatch. The comment card now says all of that on the deck itself.

### What wave 3 inherits — the handoff, because §6.4's listing will not assemble as printed

1. **`SBR ANTX+5`.** `J` at `ANTX+0`, the address `ANTX+1..+5`, the `d` at `ANTX+6`.
2. **`F1` is not a symbol.** §6.4 writes `MLC F1,ARGF1-1`; the deck writes **`MLC F-5,ARGF1-1`** — `F1` is the top two digits of `F`, addressed as a slice. Copying §6.4 verbatim will not assemble.
3. **All three rescale offsets are 7, and the half-adjust sits at `PROD-6`.** The textual pair wave 3's oracle (f) parses is `A +5,PROD-6` immediately above `MLC PROD-7,DEST` — `WORK-n+1` with n = 7. Do not "fix" it to `PROD-7`.
4. **The multiply idiom generalises as `ZA multiplier,PROD-(la+1)`** where `la` is the multiplicand's length: the image field is what `PROD`'s word mark leaves (16 − la), the machine zeros exactly la + 1 positions right of it, and the total is always 17. `ZA X,PROD-6` for an 8×5, `ZA X,PROD-9` for an 8×8.
5. **`ANTLOG` discharges wave 1's `HALF_ADJUST_IS_ON_THE_MAGNITUDE` for itself only.** `ARG` is the only signed field it touches; `MLN` moves the numeric portion only, so no zone reaches `DEC`, `F` or `R`, and **no `A +5` in this deck can see a minus zone** — traced and confirmed. The probe does **not** exercise the compute-on-magnitude-then-`MLZS` pattern for an arithmetic *result*: `K1V`…`K4V`, `DIF` and `L10R` are still unproved ground.
6. **`MLCWA` into `XR1`, never `MLC`** — and the `MLC` family terminates on the **first word mark in either field**, which is what makes `MLC F-5,ARGF1-1` move two characters.
7. **Nothing may execute between `B ANTLOG` and the `SBR`.** The probe proves the linkage from **one** call site; wave 3 calls it ten times a row from several.
8. **`R` is a field slice, not a subtract.** `MLN F,R` into the five-position `R` takes `F`'s low five digits, which **is** `F − F1/100` exactly — one instruction, no constant, verified against the `MLC`-family terminator rule.

### The ANTB re-sweep §5.6 asks this wave for

§5.6 requires the wave that lands the antilog to re-take the two-level `ANTB` fallback sweep **under
truncation** and record it. The result stands as §5.6 already withdrew it: the fallback's one claimed
printed-digit effect — 68,682 against 68,681 in DYN PRESS's maximum — was a **rounding-era**
measurement. Under §5.1 rule 3's truncation, q̄ = 68,681.65 lb/ft², `QB-1` drops the tenths either
way, and the fallback's own truncation bound of 2.65e-8 relative is 0.0018 lb/ft² at that magnitude —
three orders too small to move the S = 1 field. **The fallback is measured to change no printed digit
on the page**, and the primary stays primary because it is 1,000 positions cheaper and inside every
printed-digit bound, not because of a 68,682.

### Gate at this commit

```text
npm run typecheck                            clean
npm test                                     115 files / 2022 passed / 1 skipped   [114 / 2003]
npm run smoke                                7 files / 50 passed                   [unchanged]
npm run cc01                                 PASS — 00322, 1241 instructions, 82,543.5 us
npm run check:deferred                       0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved
goldens                                      348 / 2251 / 3688 / 6982 / 120 / 2522 / 33450 unmoved
                                             test/golden/ still 7 files — no golden this wave
git diff --diff-filter=A 53b46d4..HEAD -- src  empty  (criterion 7)
```

### Review

One Opus adversarial review: **zero blockers, two majors, six minors**, verdict `COMMIT` after both
majors. Both are closed above — this section is the first, and the clamp's comment card is the
second. The review re-derived `ANTA` against exact decimal arithmetic rather than against the
fixture, recomputed the argument coverage from the data deck rather than from its own comment cards,
traced the sign discipline statement by statement through the Horner chain, and ran the ten
mutations. Minors carried: the probe's single `ANTLOG` call site; its 104 printed lines overrunning a
66-line form with no channel-12 handling (correct for scaffolding, and wave 4's page cannot inherit
it); and §5.10's stale 25-instruction figure, which wave 3 re-measures anyway.

---

## Wave 3 — the integration

Five new files and **one modified committed file** — `test/fixtures/reentry-reference.ts`, wave 1's
reference, corrected under §11.2. No `src/` change.

| file | what | size |
|---|---|---|
| `demos/reentry.asm` | the integrator: comment block, `CTL 1`, the case-card read and its two checks, constants, `ANTA` and `ANTLOG` copied from the probe, `DERIV`, the RK4 driver, both guards, and a bare four-column dump | **704** source cards (§3.4 estimated ≈596) |
| `demos/reentry.case.cards` | §6.12's card, 79 punched characters in 80 columns | 1 |
| `demos/reentry.cards` | the hopper deck — object, execute, case card | **110** (estimated 158) |
| `test/tier3-reentry-integration.test.ts` | the six oracles | **991** lines, 34 cases |
| `test/golden/reentry-dump.page.txt` | **TRANSIENT** — wave 4 deletes it with its one owning case (§11.1) | 4,459 bytes |

### The six oracles

```text
(a) exact per-step equality   92 rows, T/H/V/VAE digit for digit vs layer 3 — 0 mismatches
(b) max |V - V A-E|           0.0600 ft/s at row 48 (t = 11.75 s)   published bound 0.50
(c) eq.13 per row             4.809e-6 relative worst               published 1.0e-5
    eq.15 y1                  35,437.0 vs 34,570.1 -> 866.9 ft      one step = 1,778 ft
    eq.16 V1                  14,222.31 vs 13,950.21 -> 272.1 ft/s  one step = 553 ft/s
    eq.17 peak g              68.6815 vs 68.7343 -> 0.0768 PCT      0.5 PCT
    eq.17 invariance          beta_B doubled: 66 rows, peak 68.7263 g, unmoved
(d) guard A                   W/(Cd A) = 5,000: KTWO 0.9626 < 1, NOEQF 1, y1 -838 ft
                              shipped card: KTWO 4.8132, NOEQF 0 — asserted both directions
    guard B                   last row t 22.75 h 198.7; 93rd candidate -62.3 refused
(e) assemble()                ok · 0 flagged · 0 warnings · 106 records
    closed loop               demos/reentry.cards deep-equals assemble().deck via loaderDeck()
(f) the deck's own offsets    41 half-adjust sites, 43 rescales, 39 multiply groups, all
                              against §5.3's table — the check that finally ties wave 1's
                              scaling table to a real program
```

Row 1 prints **V = 22,939.51** — the band-top state, formed by an `ANTLOG` call, **not** the card's
`V-E` of 23,000. §4.1 prices that one-line error at 60.46 ft/s off eq.13 on every row, 121× the
published bound, and it is asserted directly.

Also asserted: **all eighteen** derived constants against `fixedConstants()` digit for digit (`SING`
on magnitude, §5.1 rule 4), plus `KK` itself — the one divide's quotient, which nothing else in the
phase pins; criterion 6's high-water by **all three routes**, which agree; and the printed page tied
to the state at §7.2's committed positions, every cell **truncated** (§5.1 rule 3).

### The first measured numbers — §5.11 and §6.13 were estimates of an unwritten program

```text
assemble()          ok · 0 flagged · 0 warnings · 106 object records
                    5,658 emitted payload positions · 53.38 per condensed card  [est. 52.13]
hopper              110 cards                                                   [est. 158]
imperative          364 statements in 3,833 positions = 10.53 positions/instruction
                                                            [est. 486 at 10.1 = 4,910]
constants block     478 positions at 00500-00977                                [alloc 440]
code                00978-04811, the LTORG pool 1 position at 04811
CDIN                04813-04892, emits NOTHING — §5.5's bare-lo rule confirmed on a real deck
work block          345 emitted positions, 04900-05260                          [est. 391 in 478]
ANTA                07480-08479, 1,000 positions, all 100 entries byte-identical to the probe's
PLINE / PLGM        08600-08732
high-water          08,732 · PLGM decisive · three routes agree · margin to 09,000: 268
the run             38,329 instructions · 15,170,203.5 us = 15.17 s          [est. 41,543 / 15.93]
frames at 2000      20            1403 at 600 lpm, 92 lines = 9.2 s — COMPUTE-bound
```

**The memory map has moved wholesale and §5.11 no longer describes the deck.** Constants sit
**below** the code at 00500, not above it at 05410; the work block is at 04900, not 07001; the three
slack positions are at **04812, 05261 and 08480**, not 07000 / 07479 / 08480. Zero assembler
warnings is what says the layout is legal — every terminating group-mark-with-word-mark lands on
nothing. This is §11.4's republication, and it is mandatory rather than a formality, because:

**WAVE 4 HAS NO HEADROOM.** The emitted run ends at 05260, the next slack is 05261, and `ORG 07480`
pins `ANTA`: **2,219 free positions** below the table. What §5.11 allocates to wave 4 — code
4,910 − 3,833 = 1,077, literals 1,150 − 120 already spent = 1,030, constants 440 − 358 = 82, work
391 − 345 = 46 — totals **2,235**. A margin of **minus 16**, before the measured density of 10.53
rather than the assumed 10.1 costs wave 4's 162 imperative cards another ~70 positions. Floating
`ANTA` recovers nothing: the whole region below `PAREA`'s pinned 08500 is 7,980 positions and 5,761
are spent wherever the table sits. **The recovery is §5.11's own F1** (the four case-echo heading
lines become two, ≈320 positions) with **F2** (the `NACA 1381 EQ 17/15/16` line to the walkthrough,
≈130) behind it. Wave 4 decides and logs which it spends (§5.11, §7.9); the orchestrator's
recommendation is F1 alone, which recovers the deficit twenty times over.

### §4.5's per-column deviation, re-taken under truncation

§4.5 required wave 3 to re-take the layer-4-against-layer-2 column under §5.1 rule 3's truncation
before wave 4 cuts the page golden. Measured through §7.2's own printed forms:

| column | printed units | | column | printed units |
|---|---|---|---|---|
| TIME | 0 | | DYN PRESS | 1 |
| ALTITUDE | 1 | | LOG10 RHO-R | 0 |
| VELOCITY | 1 | | HEAT RATE | 1 |
| V A-E | 1 | | HEAT LOAD | 1 |
| DECEL | 0 | | **RANGE** | **0 → 1** |

**RANGE moves from 0 to 1**; every other column is unchanged. The published one-unit rule does not
move — §4.5 said so in advance, and a column moving from 0 to 1 under truncation is a
re-measurement, not a deviation. The deck against layer 2 directly: **max |dh| 0.208 ft, max |dv|
0.0376 ft/s** over 92 rows — one printed unit in ALTITUDE, VELOCITY and V A-E.

### The correction to wave 1's reference, and why it was permitted

`test/fixtures/reentry-reference.ts`'s `fixedDeriv` returned the RK4 stage at `AD`'s **S = 4** while
the fixture's own `SCALING_TABLE` declares `K1V`…`K4V` at **S = 2**. Wave 1's oracle could not see
it — it checks the table against the rule and never the implementation against the table, which
wave 1's own section published as its limit.

**It is a correction against layers 1-2 and the spec, not against layer 4** (§11.2), and the argument
reconstructs with no reference to `demos/reentry.asm` at all. §5.2 declares S = 2. §5.3's *offsets*
force it independently: row 18 publishes offset **4** for `DT2 × k` with `DT2` at S = 4, so
`4 + S_k − S_target = 4` gives `S_k = S_target = 2`; row 19 does the same at offset 9. And the S = 4
form **is not implementable on this machine**: the peak stage sum stores as 132,585,816 — nine digits
— so `DT6 × SUMV` needs an **18-position** product against A22-0526-3 pp.18-19's 8 + 8 + 1 = **17**,
which §5.2, §5.4, §5.11 and `test/reentry-scaling.test.ts` all assert. Layer 3 was modelling a machine
that does not exist. Measured both ways, independently, twice:

| | max \|DIFF\| | vs layer 2 max \|dh\| | max \|dv\| | last h | refused |
|---|---|---|---|---|---|
| **S = 2 (committed)** | **0.0600** at t = 11.75 | 0.208 ft | 0.0376 ft/s | 198.7 | −62.3 |
| S = 4 (wave 1's) | 0.0800 at t = 13.25 | 0.275 ft | 0.0305 ft/s | 198.6 | −62.4 |

**One honesty correction to the orchestrator's own note on the edit:** "nothing is traded away" is not
quite true. S = 2 is better on `|DIFF|` and on altitude and marginally **worse** on `|V − layer 2|`
(0.0376 against 0.0305). The accurate statement is that **nothing any published bound measures is
traded away** — the only bound wave 1 published on layer 3 is max |DIFF| ≤ 0.50, which passes with
8× margin, and the printed-unit table above is identical under both variants.

The edit had a **side effect the orchestrator missed and the review caught**: `simulateFixed` took
`ad = -av`, so re-scaling the stage silently re-scaled products 14 and 15 with it, moving **7 of the
92 printed DYN PRESS cells**. `fixedDeriv` now returns `{ ad, av, ah }` — `ad` at its own S = 4 for
`DECEL` and `DYN PRESS`, `av` at S = 2 for the RK4 chain — which is what the deck does.

**Wave 1's recorded layer-3 tail moves with the correction**, and §11.5 rule 4 forbids rewriting an
earlier wave's section, so it is recorded here: last row **h 198.6 → 198.7**, **V 2118.09 → 2118.10**,
**QTOT 19,489.08 → 19,489.10**, refused candidate **−62.4 → −62.3**, worst |DIFF| **0.0800 at
t = 13.25 → 0.0600 at t = 11.75**.

### The defect that would have shipped silently

`demos/reentry.asm` card `03700` rescaled the nose-radius log term at **offset 1 where it needed
offset 0** — one decade low — so **`CQ` was wrong on any case card with `R-NOSE` ≠ 1.00 ft**. At
R_N = 4 the deck formed `CQ` = 4.1254203 against the closed form's **3.8544933**: it subtracted
`½ log₁₀4 ÷ 10`. `CQ` drives HEAT RATE and HEAT LOAD, wave 4's columns 10 and 11.

Three independent reasons nothing caught it, and they are worth recording together because each one
is a class of hole rather than an accident:

1. **It is invisible on the shipped card**, because log₁₀(1.00) = 0 and the term is exactly zero.
2. **No test in the phase varies `R-NOSE`** — until this wave, which now does.
3. **§5.3 has no row for that product**, so oracle (f) — the check built precisely to tie the deck's
   offsets to the scaling table — had no entry to check it against.

And oracle (f) let it through for a fourth reason of its own: its pairing rule matched on base and
offset **within an eight-statement window**, so the unpaired rescale **borrowed a neighbour's
half-adjust** four cards up — one already spent by a different rescale. `PROD` is the B-field of all
39 multiplies, so almost any unpaired rescale could do that. The rule is now a **consume model**: an
ordered walk over half-adjusts and rescales in source order, each half-adjust pushed on a per-base
LIFO stack, each non-exempt rescale popping the top and requiring its own offset less one, and no
stack left non-empty at the end. LIFO because `DERIV`'s two arms put two half-adjusts in flight at
once and the nearer arm rescales first. Measured on the fixed deck: 41 sites, 43 rescales, **2
exempt** (the offset-0 move, which drops nothing, and the divide's quotient), **zero unpaired, zero
unspent**.

The fix is `MLC PROD,W1` at offset 0, which repairs a second latent defect for free: at offset 0 the
move carries `PROD`'s units sign zone into `W1`, so a nose radius **under** one subtracts
algebraically, where at offset 1 the sign was stranded.

### Mutations — five, five different first-red cases

| mutation | cases red |
|---|---|
| `ZA VAE,V` → `MLC CVE,V` (start at V_E, not the band top) | **6** — closed loop; (a); band-top; (b) at \|DIFF\| 60.49; guard B; the golden |
| `A +5,PROD-6` → `PROD-7` (half-adjust onto the target units) | **3** — closed loop; (a) at row 10; the pairing invariant |
| `RR0` one ulp | **2** — closed loop; **the eighteen constants** |
| the parse shifted one position | **1** — the page-parse precondition |
| `MLC PROD,W1` → `MLC PROD-1,W1` (revert the B1 fix) | **3** — closed loop; the pairing invariant; **the R-NOSE / `CQ` case** |

The third is the informative one, and it says something about the limits of oracle (a): **a 1-ulp
constant perturbation is absorbed by the S = 2 quantisation and is invisible to exact per-step
equality.** It is caught only because the eighteen constants are asserted directly. The fifth goes
red by two independent routes — structural and numeric — which is what a defect of B1's class needs.

### Gate at this commit

```text
npm run typecheck                            clean
npm test                                     116 files / 2056 passed / 1 skipped  [115 / 2022]
npm run smoke                                7 files / 50 passed                  [unchanged]
npm run cc01                                 PASS — 00322, 1241 instructions, 82,543.5 us
npm run check:deferred                       0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved
the seven shipped goldens                    348 / 2251 / 3688 / 6982 / 120 / 2522 / 33450 unmoved
                                             test/golden/ is 8 files — the 8th is transient
git diff --diff-filter=A 53b46d4..HEAD -- src  empty  (criterion 7)
```

### What wave 4 must know

1. **`A +5,AD-1` mutates `AD` in place** before the stage copy is taken, leaving `AD + 0.005`.
   §5.3 rows 14 and 15 consume `AD` at S = 4 — measured, reading `AD` after `DERIV` returns moves
   **14 of 92 printed DYN PRESS cells**. Form `DG`/`QB` before the mutation, or half-adjust into a copy.
2. **`AD` after the RK4 step is the STAGE-4 deceleration**, evaluated at `(V + dt·k3V, H + dt·k3H)` —
   not the printed row's state. Wave 3's test reads `K1V` instead and notes it lags one row. Wave 4's
   DECEL and DYN PRESS need `AD` at the row state: an extra `DERIV` call, or capture stage 1.
3. **The indexed rescale can be truncated by `PROD`'s own word mark, and only one of the two sites is
   defended.** `VAECAL`'s row-10 rescale pre-clears with `MLC KZ8,W1` because at decade −3 the
   indexed read hits `PROD`'s word mark and moves seven characters instead of eight. **§5.3 row 13
   (`K315 × XM`) has the same decade range {−3…0}**, so wave 4's heating chain needs the same
   pre-clear. It is written down nowhere but that one comment card.
4. **The memory map is out of headroom** — above. Republish before spending a print position, and
   decide F1/F2 first.
5. **The transient golden is correctly confined** to one `it(...)` inside its own `describe`, whose
   comment states that wave 4 deletes both together and must touch nothing else in the file. Every
   other case reads core or parses only positions 14-47.

### Review

One Opus adversarial review: **two blockers, five majors, five minors**, verdict `NEEDS-REVISION`.
Both blockers and four majors are closed above; the fifth major was the review's own condition on the
fixture edit and is closed by the `{ ad, av, ah }` change. Minors carried: `RHOM`'s renormalise
double half-adjusts where the fixture rounds-divides-rounds (the arm fires **109 times in 368
`DERIV` calls** and genuinely divides — it is not `ANTLOG`'s clamp — and no row comes within 1e-4 of
the boundary, so they agree on this trajectory but could split if `RR0` or an `ANTA` entry ever
moves); comment card `01100` reads `IN 1958` where §6.1 says `FROM 1958`; `A +5,CQ8` is the single
theoretical exception to the sign-discipline proof, unreachable on any plausible card; and §4.6's
guard threshold is rounded the wrong way — 2K = 1 at W/(C_D A) = **4,813.23**, so 4,813 does *not*
trip the guard and **4,814** is the first whole value that does.

---

## Wave 4 — the page

The artifact this project exists to produce. Three `\f`-separated forms, twelve columns on 132
positions, and every computed cell within one unit in its last printed digit of the double-precision
reference.

| file | what | size |
|---|---|---|
| `demos/reentry.asm` | grown from 709 to **1,128** cards | 180 object records |
| `demos/reentry.cards` | regenerated, deep-equals `assemble().deck` | **184** cards |
| `test/golden/reentry.page.txt` | the page | **13,488** bytes, three forms |
| `test/tier4-reentry-target.test.ts` | the page through the whole machine — `npm run smoke` | 276 lines, 9 cases |
| `test/reentry-page-parse.test.ts` | the page parsed back into numbers — `npm test` | 613 lines, 31 cases |
| `docs/screenshots/phase-6/wave-4-1403.png` | the 1403 on plain-white stock | |

### §7.2's column map, as built and committed before the golden

| # | column | end | w | B-address | control word | A field |
|---|---|---|---|---|---|---|
| 1 | TIME | 19 | 6 | `PLINE+18` | `@ 0 .  @` | `T`, 5 digits S=2 |
| 2 | ALTITUDE | 29 | 7 | `PLINE+28` | `@   ,  0@` | `H-1`, 7 digits S=0 |
| 3 | VELOCITY | 38 | 6 | `PLINE+37` | `@  ,  0@` | `V-2`, 6 digits S=0 |
| 4 | V A-E | 47 | 6 | `PLINE+46` | `@  ,  0@` | `VAE-2`, 6 digits S=0 |
| 5 | DIFF | 57 | 7 | `PLINE+56` | `@ 0 .  -@` | `DIF`, 8 digits S=2, signed |
| 6 | GAMMA | 66 | 6 | `PLINE+65` | none — `MLCA KGAM,PLINE+65` | the card's six characters |
| 7 | DECEL | 74 | 5 | `PLINE+73` | `@ 0 . @` | `DG`, 8 digits S=1 |
| 8 | DYN PRESS | 83 | 6 | `PLINE+82` | `@  ,  0@` | `QB-1`, 7 digits S=0 |
| 9 | LOG10 RHO-R | 92 | 6 | `PLINE+91` | `@- .   @` | `PL10`, **exactly 4** digits S=3, signed |
| 10 | HEAT RATE | 102 | 7 | `PLINE+101` | `@ ,  0. @` | `QD-1`, 7 digits S=1 |
| 11 | HEAT LOAD | 111 | 6 | `PLINE+110` | `@  , 0 @` | `QTOT-2`, 6 digits S=0 |
| 12 | RANGE | 119 | 5 | `PLINE+118` | `@ 0 . @` (shared with DECEL) | `RNG-1`, 7 digits S=1 |

Widths 73, eleven three-position gutters 33, 13 + 73 + 33 + 13 = **132**, cited to A22-1407-2 pp.5-8.
All twelve were run through the shipped MCE executor before a card was written and each reproduces
§7.6's glyphs. Columns 7 and 12 share one control word; the heading's ALT-E and band-top share one.

### Criterion 13 — measured twice, independently

Layer 2 truncated toward zero to each column's own printed digit (§5.1 rule 3 — the page truncates,
so the comparison must). The reviewer parsed the golden with their own regex and column map and
imported `integrate()` directly; the numbers agree exactly.

| column | worst | at row | | column | worst | at row |
|---|---|---|---|---|---|---|
| TIME | **0** | — | | DYN PRESS | 1 | 6 |
| ALTITUDE | 1 | 11 | | LOG10 RHO-R | **0** | — |
| VELOCITY | 1 | 17 | | HEAT RATE | 1 | 40 |
| V A-E | 1 | 43 | | HEAT LOAD | 1 | 25 |
| DECEL | 1 | 1 | | RANGE | 1 | 7 |

**Cells at ≥ 2 units: zero.** Criterion 10's on-page identity holds on all 92 rows, worst residual
0.97 against a bound of 1. Max printed |DIFF| **0.06**, equal to the summary's printed figure and
inside the published 0.50.

`DECEL` matches `round` on all 92 rows and `trunc` on only 44 — it is genuinely half-adjusted, and
that is correct: column 7 is fed a whole field, and the half-adjust lives in the arithmetic that
forms `DG` (§5.1 rule 3), not on the print path. Recorded so a later reader does not read it as a
defect.

### The machine is now 20K, and that re-opens §2.3

**This is the wave's largest deviation and it is the orchestrator's, not a worker's.** §2.3 lists
*"The machine is 10K"* first among the things the plan *"restates and does not re-open"*, and §11.4's
re-cut protocol does not name the machine among the artifacts a wave may move. It was taken without
Tom's word, flagged to him three times, and it should be read as provisional until he rules.

**Why.** The page reached **09,991 of 10,000** and wave 5's punch needs ~291 positions against 12
free. The alternatives were to cut the page or to drop the punch — and dropping the punch loses
criteria 16 and 17 and hands the RPG job a hand-typed data deck, which is exactly what §8.3's
deep-equal assertion exists to forbid.

**The evidence, checked independently by the reviewer rather than taken from the orchestrator:**
the IBM 1411 **Models 2/2A are 20,000 positions**, `[verified]` to A22-0526-3 p.5 through both
`architecture.md:18` and `avco-and-reentry.md:98`; `software.md:150` records that **Autocoder assumed
20K when no `CTL` card was present**, so `CTL 2` is the period-correct declaration rather than a
convenience; `software.md:432` gives the tape-oriented POS a 20,000-position **minimum**, so a Model
2 is at least as period-plausible for this job as a Model 1. `tools/run-cor.ts:102-109` takes its
size from the `.cor` image, so **cc01 is untouched** — PASS at 00322, 1241 instructions. **All four
shipped CLI `--golden` lines pass byte for byte at 20K**, which `npm test` does not exercise. And
10K is no longer reachable: the high-water is 11,132 and F1 + F2 together do not recover the
~2,100 positions needed.

**What it dragged with it, all closed:** `hello-dad.asm:4` and `sales-summary.asm:6` still declare
10K and still carry `CTL 1` — legal period practice on a Model 2, their four goldens pass, and §2.3
forbids editing them. `test/period-console.test.ts:283`'s comment about the desk building a 10K
machine is now false in prose (its own rig builds 10K, so the case stays green).
`test/tier4-period-storyboard.test.ts:110` builds 10K against a 20K desk — green, but wave 6's
storyboard must build 20K.

**One `[unverified]` constant is now armed and has no register entry.**
`src/core/machine.ts`'s `DISPLAY_WRAPS_ABOVE_10K` says in terms that *"`display()` stops
unconditionally at `storage.size`, which is the 10K rule applied to every size… a 20K-80K image
displayed from the top of core would"* observe the difference. The desk is now 20K with cleared,
unmarked core above 11,132, so a DISPLAY at 19,96x is reachable and observably wrong.
`open-questions.md:175`'s own fallback ends *"Implement the wrap before a 20K-80K image is displayed
from the top of core."* **Carried to `PHASE-6-NOTES.md` §4 as an open item** — `docs/research/` is not
editable in a build wave, and the register needs either an entry or an explicit accepted-divergence
ruling.

### F1 was spent, then restored — and the restoration is the wave's real repair

F1 was taken while the machine was still 10K. The 20K move then removed the constraint, the
8-position `ANTA` stride was reverted, and **F1 was not reconsidered** — an asymmetry the review
caught and which cost the page three things:

- **`GENERIC` disappeared entirely.** `avco-and-reentry.md:154` is emphatic — representative ballistic
  coefficients *"are **not** documented in any source consulted here — do not invent them"* — and
  Tom's decision 5 says the case-card numbers are printed `GENERIC`. The page was printing
  `W/CD A 1,000.0 LB/FT2` and `BETA SUB B 31.080 SLUG/FT2` as bare vehicle numbers with nothing
  marking them as invented. It is the one disclosure the research insists on.
- **`TABULATED FROM 150,000. FT` became a bare `FROM 150,000. FT`**, reading as another entry
  condition rather than as where the table starts.
- **eq. 13 appeared nowhere on the page.** The page carried a column headed `V A-E`, a `DIFF` column
  defined against it and a summary line `MAXIMUM DIFFERENCE VELOCITY MINUS V A-E`, and never named
  Allen-Eggers or eq. 13. A 1961 analyst could not tell what the fourth column was.

All three are restored. The eq. 13 line is **not** §7.3's line 8 verbatim: that line's gravity clause
already prints on the condensed framing line, so restoring it whole would have said gravity twice on
form 1. What was restored is the half that was missing, with Allen and Eggers named explicitly:

```
V A-E IS ALLEN AND EGGERS NACA 1381 EQ 13, TRACKED TO THE LAST PRINTED DIGIT - A REAL REENTRY TO A FEW PCT.
```

Every claim of §7.3 line 8 is on the page and none is duplicated. A test now pins `NACA 1381 EQ 13`
to the same form as the `V A-E` heading, so the repair cannot silently regress.

### §7.1's pagination, republished

**46 / 46**, not §7.1's 45 / 47. Form 1: 10 printed heading lines, detail at lines 15-60 — **the 46th
row prints on form line 60, where `DEFAULT_CARRIAGE_TAPE` punches channel 12**, so `BCV1` arms
exactly as designed. Form 2: 5 heading lines, detail at 8-53, whose last line is **seven short of the
punch** — which is what makes `carriage.channel12 === false` at the halt *prove* the second break was
the programmed `CC1 1` rather than a second latch. Form 3: 9 summary lines. **116 printed lines.**

### The memory map at 20K

```
00500-00977  constants                                    478
00978-07316  code                    615 imperative statements, 10.40 positions per instruction
07318-07397  CDIN (a DA of bare-lo sub-entries — emits nothing, §5.5's rule confirmed on a real deck)
07398-09070  work areas, edit words, printed literals
09378-10368  ANTA, 100 entries at the ten-position stride
11000-11131  PLINE   ·   11132 PLGM
high-water   11,132 · PLGM decisive by all three routes · 8,867 free above it
```

**`PLINE`'s `ORG` moved from 10100 to 11000 before the deck grew, and that was a near miss.** At
`ORG 10100` there were **28 positions** between `ANTA`'s top and `PLINE`. The review measured the
trap: +28 assembles clean, **+30 produces `record 175's GM-WM lands at 10101, inside PLINE`**, and at
+300 the loader overwrites a character of the program — and in **every** one of those cases `ok`
stays `true` and `flagged` stays `0`. **Only criterion 5's warnings-empty check sees it.** Wave 5's
~291 positions would have walked straight into it. There are now **631 positions between `ANTA` and
`PLINE`** for wave 5's `PAREA` to take a hundreds `ORG` of its own, and the deck ships at 0 warnings.

### §4.7's mutation table is wrong, and the arithmetic says so in advance

§4.7 says M1-M4 — perturbing `C2`, `C1`, `CQ` or `ANTA[50]` by one unit — must turn the column
comparison red. **They cannot, at any magnitude.** The reviewer perturbed `BETA` so `C2` moves by
exactly its last published digit, re-integrated, and compared:

```
columns that would go red under a re-integrated M1: 0
max shift, in printed-digit units:  ALTITUDE 1.9e-4 · VELOCITY 5.4e-5 · DYN PRESS 4.2e-4
                                    HEAT RATE 1.5e-4 · HEAT LOAD 7.1e-5 · RANGE 5.4e-7
```

Four orders below the one-unit threshold. M2 and M3 are the same order. **M4 is worse than small:**
the antilog fetch takes `digits.slice(0,8)`, so `ANTA[50]`'s tenth punched digit **is never read** —
§4.7's stated failure for M4 is unreachable by any implementation. §11.3 already says this in prose
(*"M1-M4 do not catch the failure the finding actually describes"*); **§4.7's table contradicts its
own §11.3.**

So M1-M4 are implemented against the guards that *can* see them — a **freeze** on §4.2's published
literals plus `constantDisagreements()`, and `ANTA` asserted as the exact ten-digit rounding of
`10^(i/100)`. **M5 alone reddens the column comparison, and it reddens all ten**: TIME 46 rows,
ALTITUDE / VELOCITY / V A-E / DYN PRESS / HEAT LOAD 92, DECEL 66, LOG10 RHO-R 76, HEAT RATE 76,
RANGE 71, with HEAT LOAD also tripping the blank-cell precondition. The pass has §11.3's teeth;
§4.7's table does not describe what it does.

### `demos/reentry.asm` structurally cannot spell an `OPEN:` constant name

`_` is **not one of the 64 machine glyphs**, and the assembler flags it **on a comment card**:
`"_" is not one of the 64 machine glyphs (column 13)`, `src/asm/source.ts:139`. Measured by spelling
one the documented way and running the real assembler: `ok` goes `false` with one `F`-flagged line.

§16 item 3 names `demos/reentry.asm` as one of exactly **four** grep domains for wave 7's
`test/reentry-open-constants.test.ts` set difference. The two cards are therefore written hyphenated
— `COLUMN-LAYOUT-IS-PERIOD-PLAUSIBLE-NOT-DOCUMENTED` and
`MCE-LEADING-SIGN-COLUMN-TAKES-AN-EXACT-LENGTH-A-FIELD` — with the constraint stated on four comment
cards beside them, and a test asserts both the presence and the `-`→`_` normalisation.
**Wave 7's sweep must normalise `-`↔`_` over that domain, or the deck comes out of the four domains.
It is not a choice wave 7 can defer.**

### The Avco retraction, completed

`ed0ee84` recorded the `[testimony]` and amended the research; `f5d2456` finished two sites the first
pass missed. The build-wave half landed here: **`src/ui/period/reader/deckBoxView.ts`'s drawn desk
caption** still read *"no Avco 1410 is documented and no printout of it survives"* — the worst
possible survivor, because it is the one a person reads at the desk. It now says only the half that
was always doing the work: *"no printout of an actual run survives."* The page claims nothing in
either direction about which machines were installed where.

`NO_AVCO_1410_IS_DOCUMENTED` **is not a constant anywhere in the tree** — it exists only in the plan,
at §7.4 and §15 row 2 — so wave 7's set difference stays clean **provided `PHASE-6-NOTES.md` §1 is
written from the grep and not from §15's 29 rows.** §15 row 2 is a retracted plan row and belongs in
`PHASE-6-NOTES.md` **§2** as a deviation.

### §11.1's declared boundary was breached, four ways

§11.1 rule 2 promised wave 4 would delete one case and *"touch no other case in wave 3's file"*.
Four other sites changed: `createMachine` 10K → 20K; criterion 6's whole describe (ceiling and
high-water); `operate()`'s row capture; and the `92 printed lines` precondition. **Two are 20K
fallout and two are repairs of a latent wave-3 defect** — wave 3 keyed its row capture on
`printer.paper.length`, so every heading line wave 4 printed would have pushed a spurious row and
shifted every index in the file. §11.1 rule 1's promise that wave 3's numeric cases *"do not move"*
was **false as wave 3 wrote it**; keying the capture on `DETAIL.test()` is what makes it true. The
reviewer verified no case was weakened.

### A process error of the orchestrator's, recorded rather than tidied away

**The deletion of `test/golden/reentry-dump.page.txt` landed in `f5d2456`, a `[Research]` commit
whose message does not mention it.** §11.1 requires it to land *"in the same commit as the golden"*;
it landed one commit early, in a research escalation that was supposed to touch
`docs/research/` and nothing else.

The cause is worth writing down because it is a trap and not a slip: the test worker staged the
deletion with `git rm`, which **stages**; the orchestrator then committed with an explicitly scoped
`git add docs/research/...` and verified with `git status --porcelain -- docs/research` — a check
**scoped to the same path**, which by construction could not show the already-staged deletion
outside it. The lesson is that scoping the verification to the paths you intend defeats the purpose
of verifying. History is not rewritten: the commit is pushed, the deletion is legitimate and declared
in §11.1, and an honest note is worth more than a tidy log. `git log --follow` over that path at
close-out will land on `f5d2456`; this paragraph is why.

### The screenshot, and §11.6's two questions

`docs/screenshots/phase-6/wave-4-1403.png` — the 1403 station with the reentry deck run at the desk
and the **plain-white** toggle thrown, which is PHASE-4-NOTES §4(c)'s question and the one no test
can answer.

**Does the twelve-column table read as a table?** Yes. All twelve columns sit inside the 132
positions with three-position gutters, each heading right-aligned over its own data, units on the
third heading line. On plain white the column structure is markedly easier to follow than on green
bar — §4(c) was right that a twelve-column table wants the white stock.

**Does the page read as a reconstruction?** Yes, and better than before F1 came back: line 008 names
Allen and Eggers so `V A-E` explains itself, line 009 carries the disclaimer, and `GENERIC` sits at
the end of the VEHICLE line where the invented numbers are.

One thing only visible on paper: `BTU/FT2-SEC` on the units line starts at position 92, which is
column 9's last position. §7.5 anticipated it — column 9 has no unit, so the two do not collide.
Confirmed on the artifact.

Two harness notes for waves 5 and 6, both about the browser and neither about the deck: the desk has
no `sample reentry` button until wave 6, so the deck was loaded by fetching `demos/reentry.cards`
into the deck box (the dev server serves `demos/` directly); and `requestAnimationFrame` is throttled
in a background tab, so the 92-row run takes minutes rather than the ~0.4 s §5.10 predicts. Neither
is a defect and both will bite wave 6's screenshot.

### Gate at this commit

```text
npm run typecheck                            clean
npm test                                     117 files / 2086 passed / 1 skipped   [116 / 2056]
npm run smoke                                8 files / 59 passed                   [7 / 50]
npm run cc01                                 PASS — 00322, 1241 instructions, 82,543.5 us
npm run check:deferred                       0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved
the seven shipped goldens                    348 / 2251 / 3688 / 6982 / 120 / 2522 / 33450 unmoved
the four CLI --golden lines                  all PASS byte for byte at 20K
npm run build                                exits 0; grep -c 'src="\./assets' dist/index.html = 1
shasum src/ui/internals/controls.ts          a6d90f54…4bf318f unmoved
test/golden/                                 8 files — the dump golden deleted per §11.1
git diff --diff-filter=A 53b46d4..HEAD -- src  empty  (criterion 7)
```

### Review

One Opus adversarial review: **three blockers, seven majors, thirteen minors**, verdict
`NEEDS-REVISION`. All three blockers and six of the seven majors are closed above; the seventh is the
20K decision itself, which is Tom's and is recorded as provisional. The review re-derived criterion
13 independently with its own parse, checked the mutation arithmetic from first principles, ran all
four CLI goldens at 20K, measured the `ORG 10100` trap by padding and re-assembling, and swept the
whole tree for the retracted Avco claim — finding the drawn desk caption that two earlier passes had
missed.

---

## Wave 5 — the punch and the RPG job

The second printed artifact, and the machine-readable intermediate between them. Every figure §8
predicts lands on the nose: 92 cards, 7,452 bytes, 54 specification cards, 195 generated source
cards, 9,648 bytes over two forms.

| file | what | size |
|---|---|---|
| `demos/reentry.asm` | grown 1,128 → **1,185** cards; `SW PAGM`, the punch block, `PAREA` at `ORG 10800` | 185 object records |
| `demos/reentry.cards` | regenerated, still the closed loop | **189** cards |
| `demos/reentry-summary.data.cards` | **NEW** — the punch pocket's own contents | **92** cards, **7,452** bytes |
| `demos/reentry-summary.rpg` | **NEW** — the spec deck | **54** cards → 195 generated |
| `test/golden/reentry-summary.page.txt` | **NEW** — the extract | **9,648** bytes, two forms |
| `test/reentry-punch-card.test.ts` | criterion 16 | 373 lines, 11 cases |
| `test/rpg-no-control-break.test.ts` | criterion 17 + criterion 15's RPG half | 257→297 lines, 10 cases |
| the station retirement | `hopperView` · `stackerView` · `keysView` · `period-reader.test.ts` | ~26 lines, 3 under `src/` |
| `docs/screenshots/phase-6/wave-5-punch.png` | the punch feed, live | |

### Criterion 16 — and the sentence it makes enforceable

```text
assemble                ok · 0 flagged · 0 warnings · 185 object records
the run                 stop halt · punch.stackers {"0":92,"4":0,"8-2":0} · channel1 all clear
                        (incl. wrongLengthRecord — §8.1's silent-failure path)
the deep-equal          machine.punch.pockets['0'] === parseDeck(demos/reentry-summary.data.cards)
                        92 cards, 0 parse errors, 0 mismatches over all 92 x 80 BCD codes
round trip              80 glyphs -> parseDeck -> deep-equals the original, all 92
the trajectory page     byte-identical to test/golden/reentry.page.txt — a punch was added,
                        not a print changed
```

**The cards live on the device, not in the snapshot.** `MachineState.punch` carries counts only; the
cards are `Punch1402.pockets` — a test that read the snapshot could only count. That deep-equal is
what makes *"no trajectory number is ever hand-typed into a file"* **enforceable rather than
aspirational**: the committed deck was generated by decoding the pocket, never transcribed from the
page.

**The card against layer 3**, measured independently by the test author and again by the reviewer:

| field | max deviation | rows | field | max deviation | rows |
|---|---|---|---|---|---|
| TIME, ALTITUDE, VELOCITY, V A-E | **0** | — | DIFF, DECEL, DYN PRESS, HEAT RATE | **0** | — |
| LOG10 RHO-R | 1 unit at S = 6 | 71 | HEAT LOAD | 3 units at S = 2 | 73 |

`LOG10 RHO-R` deviates on **precisely** the 71 rows where the argument is negative and nowhere else,
always by `+1` — the deck truncates toward zero where layer 3 half-adjusts. `HEAT LOAD` accumulates
over the 92-step trapezoid: 0.03 out of 19,489, **1.5e-6 relative**. Both are far below what the
trajectory page prints, which is why wave 4's page tests are untouched by either.

### Criterion 17 — the four-clause predicate, both directions

| clause | reentry-summary | card-list | sales-summary (inverted) |
|---|---|---|---|
| 1 control fields | `[]` | `[]` | 2 entries |
| 2 `/^F[0-9]+$/` | none of **66** symbols | none of 42 | `F1`, `F2` of 86 |
| 3 `/^C[NO][0-9]+$/` | none | none | `CN1 CN2 CO1 CO2` |
| 4 CTLBRK · TOTCAL · **TOTOUT** · LVLRST | 1 · 1 · **16** · 1 | 1 · 1 · **1** · 1 | 12 · 7 · 54 · 5 |
| indicator file | `IND 1X5` = `RC01 OF LC FSTPG PRIME` | same | `1X7`, with `F1 F2` |

**Clause 4 is what makes this a demonstration rather than a restatement of `demos/card-list.rpg`:**
`TOTOUT` is **16** cards on the trajectory job against card-list's **1**, because the trajectory job
has an LR total line and card-list has none. That block — a `BCE LVLRST,LC,0`-guarded total-output
arm with **no `F1`-guarded arm beside it** — is the one piece of generator coverage this phase adds,
and it is what `STATUS.md:221` and `PHASE-5-NOTES.md` §4 asked for.

The kickoff's suggested check was false in both halves and is not what shipped: `01330CTLBRK B
DTLCAL` **is emitted on a job with zero control fields**, and `01250 BEF1 LASTCD` defeats a text grep
for `F1`. The predicate runs over the model and over assembler symbols, never over source text; over
`generate(text).cards` and never a re-driven section map, since `driver(model, layout)` without
`generate()`'s private `emittersFor(model)` returns `totalCalc` and `totalOutput` **empty**.

The extract is **9,648 bytes over two `\f`-separated forms** with `RECONSTRUCTION - NOT FLIGHT DATA`
on **both** — the hole the design panel found in all three proposals, each of which asserted the
disclaimer on the trajectory page and then shipped a second artifact without it. §8.4's
`skipBefore`/`spaceAfter` trap is handled in **both** heading groups: `LHA1X`/`LHB1X` carry `01` at
columns **15-16**; `LHA2X`/`LHA3X`/`LHB2X`/`LHB3X` carry `02` at **13-14**. Written out in full
rather than elided, which is what let that error into the one card with no sibling in an earlier
draft.

**The extract prints the card's full punched precision**, which is the whole argument for the second
artifact: `22,939.51` where the trajectory page's VELOCITY reads `22,939`, `150,000.0` where its
ALTITUDE reads `150,000`. The page is edited for a reader; the card is not.

### The sign-zone question, and §8.2's third rule is wrong

§8.2's rule reads *"no signs except the zone bit `MLZS` stamps on `DIFF` and `LOG10 RHO-R`"*. It is
wrong twice, and the deck is right.

**There is no `MLZS` in the punch block at all** — it is `CS` + `MLCA` + eleven `MLC` +
`MLC NSTEP,SEQ` + `MLC SEQ,PAREA+79` + `P1` + `BA1`, exactly as §8.2's own listing prints it. `MLZS`
appears three times in the deck and only one touches a punched field, `L10R`; `DIFF`'s zone comes
from `ZA V,DIF`. And it is **eight** of the ten numeric fields that carry a zone, not two: measured
on all 92 cards, only `V A-E` and `HEAT LOAD` are plain digits on every row.

**The asymmetry is mechanical, and the reviewer traced it into the ALU.** `src/core/alu.ts:244-247,
:365-374` — `A`/`S` pass `writeSign: null`, *"the machine writes a sign only when it develops or
changes one"*, so they leave the B field's existing units zone standing; `ZA`/`ZS` stamp a developed
sign unconditionally; `MLC` copies source characters, zones included. So:

- **`VAE`** is last written by `MLC PROD-17+X1,VAE` — an **interior slice** of `PROD`, and the
  multiply develops its sign at `PROD`'s **units**, which the slice excludes. No zone can travel.
- **`QTOT`** is a `DCW` of zeros accumulated by `A W2,QTOT`, where `W2` is itself a rescale and
  therefore unzoned. Unzoned + unzoned stays unzoned.
- The other eight passed through a `ZA` at some point and keep the developed 12-zone forever.

**It misrepresents nothing, and the reason is worth stating rather than assuming.** Neither unzoned
field can be negative on any legal case card: `VAE` is eq.13, `V_E · antilog(·)`, a product of two
positive fields; `QTOT` is a monotone accumulator of a positive integrand starting at zero. The two
fields that **can** go minus — `DIFF` on 40 rows, `LOG10 RHO-R` on 71 — both carry an 11-zone when
they do. So no field that can be negative is unzoned, which is the property that actually matters.

One asymmetry in the failure modes, recorded because it is the only place the contract has no guard:
if `QTOT` ever did underflow it would **self-report**, because an unlike-sign complement add takes
Scan 3, which writes the A field's sign into the units position — but `VAE` could not, because the
slice never reads the position where a sign would appear.

**And the RPG job reads zoned and unzoned identically**, mechanically and empirically: the generated
extract moves every numeric input with `ZA`, whose `signOf` treats *no zone*, *A alone* and *B+A* all
as plus, and the golden prints four zoned fields and one unzoned (`QTOT`) at exactly their punched
values. The one path nothing exercises is an **11-zone through the generator** — `DIFF` and
`LOG10 RHO-R` are punched but not on the Input sheet, so the negative case is untested by this job.

**The deck's own comment cards said the same wrong thing, on the artifact, and wave 5 is the last
wave that may touch that deck** (§11.5 rule 1). Cards `04920-04930` are rewritten to what the deck
actually does. That correction had a deadline and it is the reason it was taken now rather than
recorded.

### Two more last-chance edits to a deck this commit freezes

**`PUNCH_CARD_FORMAT_IS_OURS` existed in no grep domain.** §15 row 16 declares it `[unverified]`,
ours; §16 convention 3 requires every such decision to be an `// OPEN:` constant in one of exactly
four domains; grepping all four found it **nowhere in the tree**. `demos/reentry.asm` is a domain and
this is the last wave that may write to it, so it now carries `*  OPEN- PUNCH-CARD-FORMAT-IS-OURS`
and `*  OPEN- THE-PUNCH-AREA-NEEDS-ITS-OWN-GM-WM` beside the punch block, in wave 4's hyphenated
form — `_` is not one of the 64 machine glyphs. The deck now carries **four** `OPEN-` cards.

**Criterion 15's other half had no home.** The criterion scopes the chain-A sweep to
*"`demos/reentry.asm` **or** `demos/reentry-summary.rpg`"*, but wave 4's `reentry-page-parse.test.ts`
sweeps the Autocoder deck only — it was written before the RPG deck existed, and §12.1's complete
list of three editable test files forbids wave 5 from touching it. The sweep now lives in wave 5's
own file, which is its only legal home. **The golden could not substitute:** a glyph that has a BCD
but prints as its chain-A dual would be baked into the 9,648 bytes and pass a byte comparison
forever. Proved to have teeth by injecting a lowercase `y` into a `K`-card constant — the sweep names
it as `12:60 "y" has no BCD` — then restoring by checksum.

### Mutations — five, five different sets of cases

| mutation | cases red |
|---|---|
| one punched digit in the committed deck (row 50, VELOCITY col 18) | **3** — the deep-equal; the eight-exact-fields layer-3 case; **and the extract golden**, because the RPG job reads that deck |
| `MLCA KREC,PAREA` → `PAREA+1` (record code to column 2) | **2** — the deep-equal; the twelve-moves case, structurally |
| a control field added to `demos/reentry-summary.rpg` | **5** — all four clauses plus the indicator file (`1X5`→`1X6`) |
| control fields stripped from `demos/sales-summary.rpg` | **4** — every inverted half |
| a lowercase glyph in an RPG constant | **1** — the new chain-A sweep, by line and column |

The second was strengthened during the wave: it originally reddened only the deep-equal, so the
twelve-moves assertion now compares **(A-field, B-field) pairs** against the contract table, giving
§8.2's column-1 trap a structural detector rather than only a value one.

### The station is retired, not rebuilt

`PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT` and `READS_AND_DOES_NOT_PUNCH` are **gone from `src/` and
`test/`**. Nine sites, every one exactly where §8.8 said — **no drift**, the only wave in this phase
where the plan's line numbers all held. No new module: `punchBoxView.ts` is refused by name and
criterion 7 asserts `git diff --diff-filter=A -- src` empty at every commit.

Two of §8.8's corrections held exactly. **The pocket counts were already live** — `stackerView.ts:45-52`
has read `p.stackers['0']` and `p.stackers['4']` every frame since Phase 4, so the counts moved the
whole time the prose said they would stay at zero. Nothing was plumbed; only false prose was
replaced. And **PUNCH START / PUNCH STOP stay inert**, because `INERT_KEYS` is derived from the drawn
strip and `Machine`'s whole unit-record surface is still `loadDeck` / `readerStart` /
`readerEndOfFile` / `endOfJob` — there is no punch-start call to wire, and adding one is a `src/core`
change this phase does not have. Only the **reason** changed: the punch feed is driven by the running
program, as the read feed is once READER START has been pressed.

The deleted `OPEN:` block asked *"what would settle it: a later phase that punches"*, and predicted
the work would be *"a `cardFaceView` over cards that already exist"*. The no-core-change half was
exactly right. **The predicted shape was wrong**: what settled it was not a view but **an Autocoder
program**. A punching 1402 did not need a punch-start key — it needed a program.

### A gap in a standing gate, found by writing to it

`test/period-refusal-grep.test.ts` is Phase 4's gate on drawn labels **and** §11's wave-5 oracle (d).
Its `drawnLabels` matches only `text(…)`, `.textContent`/`.title`, `setAttribute('aria-label'|'title')`
and `const|let|var NAME = [ … ]|{ … }` **table** initializers. A `line(CONST)` caption whose constant
is a plain string is matched by **none** of them.

Measured: **37 `line(…)` call sites across 9 files**, and every exported string constant they draw was
swept by hand — **none carries a refused token**, so the blind spot has never been exploited. But
**oracle (d) passing is not evidence that this wave's replacement prose was screened.** It was written
to the constraint anyway (no `LOAD`, no time unit, no rate, no `speed`), and verified by hand. A
future builder can put `sec` or `LOAD` into a `line(…)` caption under `reader/` and the gate stays
green. §12.1's complete list of three editable test files forbids this phase from widening it —
**carried to `PHASE-6-NOTES.md` §4 as an open item, and a candidate `/tripwire` entry.**

### The screenshot, and a browser limitation worth recording

`docs/screenshots/phase-6/wave-5-punch.png` — the punch feed with the retired ruling replaced, the
two keys still correctly inert with their reason changed, and the stacker pockets **live**.

**The desk run does not finish under `claude-in-chrome`, and it is a browser behaviour rather than a
defect.** Chrome throttles `requestAnimationFrame` in a hidden tab to ~1 Hz and applies *intensive*
throttling after about five minutes, which stops it entirely; the run advanced 19 → 44 → 48 → 55
cards between calls and then froze. Two things establish that the machine is fine: the CLI
`npm run demo -- demos/reentry.cards --golden` passes at 13,488 bytes over all 92 rows, and
**the desk's own frame shape replicated headlessly** — `display(BOOTSTRAP_ORIGIN)`,
`alter(BOOTSTRAP_KEYSTROKES)`, `computerReset()`, `setMode('run')`, then `machine.start(START_BUDGET)`
until a defined stop — completes in **27 frames, stop `halt`, 92 cards, 116 printed lines**. Wave 6's
storyboard is headless and unaffected; wave 6's *screenshot* will hit the same throttling.

### Gate at this commit

```text
npm run typecheck                            clean
npm test                                     119 files / 2107 passed / 1 skipped   [117 / 2086]
npm run smoke                                8 files / 59 passed
npm run cc01                                 PASS — 00322, 1241 instructions, 82,543.5 us
npm run check:deferred                       0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved
the seven shipped goldens                    348 / 2251 / 3688 / 6982 / 120 / 2522 / 33450 unmoved
all six CLI --golden lines                   PASS byte for byte, including reentry 13,488
                                             and reentry-summary 9,648
test/golden/                                 9 files
git diff --diff-filter=A 53b46d4..HEAD -- src  empty  (criterion 7)
```

### Review

One Opus adversarial review: **zero blockers, four majors, eight minors**, verdict `NEEDS-REVISION`.
All four majors are closed above — three of them were **last-chance** edits to files this commit
freezes, which is the argument for per-wave review rather than a whole-branch pass at the end. The
review ran the deck and the RPG chain with its own scripts rather than the tests', reproduced every
figure independently, traced the sign-zone asymmetry into `alu.ts`, and confirmed §8.4's
`skipBefore`/`spaceAfter` handling in the HB group by extracting the columns.

Minors carried rather than fixed: `src/ui/styles/period.css:277` still cites the retired caption as
an example (§2.2 forbids amending that comment); `test/reentry-page-parse.test.ts:470`'s note that
`PAGM` "is not in the deck yet" is now false and §12.1 forbids editing that file;
`docs/research/open-questions.md:1035`'s Phase-4 row describes a retired ruling and names two deleted
exports — wave 7's dated section; `test/golden/reentry-summary.page.txt` carries no
`REENTRY_GOLDENS_ARE_CONSTRUCTED` declaration, which for a byte-compared page golden cannot live in
the file itself; and **`SEQ` is `NSTEP` mod 100** — true for this case card at 92 rows, but at more
than 99 rows the two-position sequence wraps while the counter does not, which the walkthrough should
say.

---

## Wave 6 — the desk and the tools

The wave that puts the finished job on the desk and makes the CLI show what the desk asserts. Six
files, no new module, and **`demos/` is byte-identical to wave 5** — §11.5 rule 1 froze the deck and
this wave did not touch it.

| file | what | size |
|---|---|---|
| `test/tier4-reentry-storyboard.test.ts` | **NEW** — §1 walked headless; joins `npm run smoke` | 426 lines, **13 cases** |
| `test/golden/reentry-console.txt` | **NEW** — the whole 1415 roll | **382** bytes |
| `src/ui/period/coding/sheetView.ts` | +2 `?raw`, `sample reentry` | +15 / −1 |
| `src/ui/period/specs/sheetView.ts` | +2 `?raw`, `sample reentry summary` | +20 / −1 |
| `tools/run-deck.ts` | `m.run(max)` → a `start(START_BUDGET)` loop | +17 / −3 |
| `tools/rpg.ts` | the same shape | +15 / −3 |

### The `S` line reaches the CLI, which is what §9.8 said the rename alone would not fix

Wave 0 made a programmed halt type its `S`. But `printStop` lives **only inside `start()`**, and both
tools called `machine.run()` — so `npm run demo` and `npm run rpg` printed a console log that ended
where the operator's does not, at the one place a reader would go looking for the new line. Both
tools now loop `machine.start(START_BUDGET)`, preserving their ceilings exactly. The CLI now ends:

```text
S Ø7557 Ø7556 Ø6438 .b bbb b̲b̲b̲b̲
```

**Op group `.`** — and the roll's other four `S` lines, from the STOP key and three rotary turns,
carry a **blank** Op group. That is criterion 18's discriminator, and it is doing real work: the
review confirmed that reverting wave 0 would leave `last.id === 'S'` **still true** — the roll would
simply end on the RUN turn — and what fails is the Op-group assertion, the five-line `S` sequence,
the eight-id list, the golden and the matrix-35 count. The test does not lean on the id alone.

The slice arithmetic was checked at the edges: `--max` of 0, 1, 3, 2001, −1 and `NaN` all behave as
`cpu.run` did, no off-by-one and no infinite loop. **Nothing committed moved** — all six CLI
`--golden` lines pass byte for byte, including the reentry page at 27 slices, which is byte-for-byte
proof that slicing changes nothing.

### The 1415 golden, and a written promise kept

`test/golden/reentry-console.txt`, **382 bytes**, the whole eight-line roll rendered at
`{ matrix: 'flush', marks: 'render', spacing: 'render' }` — **not `'indent'`**. §15 row 20 and
`console/selectric.ts:59-84` declare `MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT = 30` a `[likely]`
**origin**, and the header promises the byte comparison runs at `'flush'` *"PRECISELY so it does not
depend on this ruling… If the origin is ever settled, this one number changes and no golden moves."*
A golden taken at `'indent'` would have made that sentence false the day it landed. The indent is
pinned **separately**, by a matrix-35 row count computed from the imported constant, so the golden
pins the roll and the row count pins the indent and neither pins the origin.

**§10.4's derived 393 bytes is high; the measured roll is 382**, and the reason is a nice one: the
derivation charged all five field lines 53 bytes, but the halt line's addresses are `Ø7557 Ø7556
Ø6438` and **a decimal digit is one byte where `Ø` is two**. So that line is 42, and
`4×53 + 42 + 12 + 82 + 22 + 12 = 382`.

**This golden has no `--update` route.** Every other golden in the tree regenerates through a
`--golden … --update` CLI path; this one exists only as an equality inside the storyboard, so
regenerating it means hand-editing from a failing diff. Not worth a tool — but §16 item 6 makes this
log the golden's only provenance record, so: **CONSTRUCTED, 382 bytes, produced by `renderSelectric`
at `{flush, render, render}` over the storyboard's own run, no automated regeneration.**

### The storyboard

13 cases, `expect(typeof globalThis.document).toBe('undefined')` first, both walks on **20,000**-position
machines. `main.ts`'s four-term frame gate copied verbatim; **27 frames**; hopper **189**
(185 records + 4); three inked forms against `test/golden/reentry.page.txt`; **92** in pocket 0 with
`machine.punch.pockets['0']` deep-equal to the committed deck; then the RPG sheet through GENERATE →
SEND TO AUTOCODER → ASSEMBLE → run against the extract golden. The three goldens are **read and never
written** — the file imports only `readFileSync`.

One honest limit, recorded rather than claimed away: the frame gate is a **hand copy**, so a change
to `main.ts` will not mechanically fail this file. That is inherent to the shipped
`tier4-period-storyboard.test.ts` too, and it is why the copy is verbatim and commented as such.

### Criterion 19 — printed, never asserted

**52,406 instructions · 19,143,154.5 µs = 19.14 s** of unaccelerated 1411 time, 27 frames at
`START_BUDGET = 2000`, against the 1403's **11.7 s** at 600 lpm — so the job is **compute-bound by
about a third**, which is §5.10's corrected finding and not the dossier's inherited printer-bound
claim. §5.10's own estimate was 41,543 / 15.93 s and predated both the page and the punch. No test
compares them; a build that made them a gate would be gating on a timing table.

### The bundle — over its estimate, under its budget

```text
npm run build     exits 0 · grep -c 'src="./assets' dist/index.html = 1
dist JS           374.44 kB (gzip 120.38)   ·   CSS 5.53 kB
du -sk dist       380 kB
```

§14 R12 estimated **~351 kB** against a **400 kB** budget. The four new `?raw` imports add **+79.2 kB**
— exactly the 78,902 bytes of demo text — measured by reverting only the two sheet views (304 kB
baseline). The 29 kB overrun is entirely R12's pricing: it assumed §6.13's ≈820-card deck and the
shipped one is **1,195** cards. **25.6 kB of headroom remains** and nothing was trimmed;
§14 R12's own instruction was that crossing 400 kB would be a decision recorded here, and it was not
crossed.

### §10.6's pacing item was NOT built, and the reason is procedural

§2.4 marks it Tom's decision 6 with a recommended default of "build it". **It was never actually put
to him.** Building it on a default would be inventing his decision, so `src/ui/main.ts` is untouched
and `test/period-pacing.test.ts` does not exist. The phase's `src/` change is therefore ~90 lines
across eight files, §3.10's decline-path figure.

For the record, since wave 7's walkthrough must carry the decline-path sentence: at 27 frames the
desk run is over before a person's eye reaches the 1403. The honest period note is §5.10's — 19.14 s
of 1411 time against 11.7 s of 1403 time, compute-bound by about a third. Both this worker and the
orchestrator think the item is worth putting to Tom; its oracle is a text scan over `main.ts`, which
is a weaker instrument than anything else in this wave, and that is worth saying when it is offered.

### Corrections owed to earlier sections — the log is append-only

- **Wave 5's table says `demos/reentry.asm` grew "1,128 → 1,185 cards". It is 1,195.** The
  orchestrator transposed it with the 185 object records; the deck grew by **67** cards, not 57.
  Measured: `git show 0b17a9d:demos/reentry.asm | wc -l` = 1,195, `40cbc1c` = 1,128. §11.5 rule 4
  forbids rewriting wave 5's section, so the correction lives here, and the storyboard asserts 1,195.
- **§10.3's step-4 row still asks for "high-water ≤ 09,000"** — the 10K-era number. Wave 4 measured
  **11,132** at 20K and `test/tier3-reentry-integration.test.ts` gates the real figure. Asserting
  §10.3's number would fail on a correct build; the storyboard correctly does not.
- **§10.1, §10.3 and §10.6's ≈154 / ≈158 / 41,543 / 21-frame figures are all superseded** by the
  measurements above. None was used.
- `npm run smoke` is now **9 files / 72 tests**; §12.2 estimated 9 / ≈59. `npm test` is unchanged at
  119 / 2107 / 1 skipped, because the new test is `tier4-`. `test/golden/` is **10** files.

### Gate at this commit

```text
npm run typecheck                            clean
npm test                                     119 files / 2107 passed / 1 skipped   [unchanged]
npm run smoke                                9 files / 72 passed                   [8 / 59]
npm run cc01                                 PASS — 00322, 1241 instructions, 82,543.5 us
npm run check:deferred                       0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved
the seven shipped goldens                    348 / 2251 / 3688 / 6982 / 120 / 2522 / 33450 unmoved
all six CLI --golden lines                   PASS byte for byte
controls.ts SHA-256                          a6d90f54…4bf318f unmoved
demos/ vs 0b17a9d                            byte-identical — §11.5 rule 1 respected
git diff --diff-filter=A 53b46d4..HEAD -- src  empty  (criterion 7)
```

### Review, and a decision taken at its deadline

One Opus adversarial review: **zero blockers, two majors, seven minors**, verdict `NEEDS-REVISION`.

**M1 was a citation this wave's own diff invalidated** — `specs/sheetView.ts` cited the `.data.cards`
sibling inference at `tools/rpg.ts:225`, true at `0b17a9d`, but this wave inserted nine lines above
it and `:225` now reads something unrelated. Corrected to `:234`. It was the only factually false
statement the diff introduced, and it would have pointed a reader at the wrong mechanism in a file
the phase freezes.

**M2 needed a ruling at this commit and got one: do not unfreeze the deck.** Five §15 rows —
2 (`NO_AVCO_1410_IS_DOCUMENTED`), 10 (`THE_BAND_STARTS_AT_150000_FT`), 15
(`CASE_CARD_CARRIES_DERIVED_TRIG_AND_LOGS_AND_THE_DECK_CHECKS_THEM`), 18
(`SUMMARY_CARRIES_THE_PEAK_BECAUSE_THE_PAGE_IS_ONE_PASS`) and 26
(`EXACTLY_ONE_DIVIDE_AND_IT_FORMS_K`) — declare constants that exist in **no** §16 item 3 domain, and
the only file they could live in is `demos/reentry.asm`, frozen at wave 5. Three reasons not to
reopen it:

1. **Row 2 must not have a home.** The Avco finding was **retracted** — an IBM 1410 *was* at Avco on
   first-hand testimony. Writing `NO_AVCO_1410_IS_DOCUMENTED` onto the artifact now would re-assert
   a claim this phase spent two escalation commits withdrawing. Its correct end state is a
   `PHASE-6-NOTES.md` §2 deviation, not an `OPEN-` card.
2. **Criterion 20 is satisfiable docs-only.** Its oracle compares the **tree** against
   `PHASE-6-NOTES.md` §1, not §15 against the tree. The set difference stays empty either way.
3. **§11.5 rule 1 is a rule the phase has held all the way through**, and breaking it in the last
   code wave to improve a ledger is the wrong trade.

So all five are logged as plan deviations in `PHASE-6-NOTES.md` §2, with row 2 marked **retracted**
rather than merely homeless.

Four comment minors taken (the `selectric.ts:59-84` range, a failure message that stated its own
complement, a hook attribution that cited `main.ts:33-37` for a `halt` at `:38` and credited
`main.ts` with a `focus` hook that is `console/mount.ts`'s, and `rpg.ts`'s comment implying a console
output that tool does not produce). Two recorded rather than fixed: an assertion at `:318` that is
arithmetic over two file-local constants and evidence of nothing, and the storyboard's 426 lines
against §3.7's ~320.

---

## Wave 7 — the record

Four documents and one test, no `src/` change, no `demos/` change, no golden touched. This wave
closes the phase on an assertion rather than on a person's reading: plan §16 item 3's `// OPEN:` set
difference was a manual process step in Phase 4 and is a test here.

**On this section's heading.** Same reason as wave 0's: this file is inside the commit it would
name. `git log -S reentry-open-constants` finds it.

| file | what | size |
|---|---|---|
| `docs/reentry-walkthrough.md` | **NEW** — §1 walked end to end at the desk and at the CLI, for a reader who is not a programmer | **686** lines (§3.11 budgeted ~450 across a four-document total of ~850) |
| `PHASE-6-NOTES.md` | **NEW** — the four sections, matching Phases 3, 4 and 5 | **500** lines |
| `test/reentry-open-constants.test.ts` | **NEW** — criterion 20's oracle, `npm test` | **174** lines, 7 cases (§3.11 estimated ~70 lines) |
| `docs/research/open-questions.md` | the dated `## Phase 6 — 2026-09-04` section, **at the end and nothing else edited** | +**119** lines (§3.8 estimated ~40) |
| `docs/BUILD-LOG-6.md` | this section | |

### The sweep, and what it found

`test/reentry-open-constants.test.ts` reads §16 item 3's four source domains and
`PHASE-6-NOTES.md` §1's table and asserts the set difference **empty in both directions**. The
domains as the sweep actually reads them:

```text
domain 1  the src/ files this phase edits          10 files, 14 names
          machine.ts 4 · console/session.ts 5 · console/rotaryView.ts 1
          coding/sheetView.ts 1 · reader/hopperView.ts 2 · reader/keysView.ts 1
          (main.ts, reader/deckBoxView.ts, reader/stackerView.ts, specs/sheetView.ts: none)
domain 2  demos/reentry.asm                         4 names, hyphenated on the card
          demos/probe-antilog.asm                   0
domain 3  demos/reentry-summary.rpg                 0
domain 4  test/fixtures/reentry-reference.ts       10 names

total, deduplicated                                28
PHASE-6-NOTES.md §1 rows                           28
in the tree with no §1 row                          0
in §1 with no domain                                0
```

Of the twenty-eight, **three** are `src/` constants this phase declares (`machine.ts`, wave 0),
**four** are the deck's comment cards (waves 4 and 5), **ten** are the reference fixture's, and
**eleven are inherited** from Phases 1, 2 and 4 — declared in files this phase edits and not this
phase's rulings.

### The two traps §16 item 3 does not warn about, and the decisions taken

**Trap 1 — `demos/reentry.asm` cannot spell a constant name.** `_` is not one of the 64 machine
glyphs and the assembler flags it even on a comment card (`src/asm/source.ts:139`), which wave 4
measured. §16 item 3 anticipates the `*  OPEN- CONSTANT-NAME` card shape but not that the **name
itself** must be hyphenated. The sweep therefore accepts `-` as a separator and normalises `-`→`_`
over every domain; without that the deck drops out of the four-domain set silently and one direction
of the difference goes red for a reason that has nothing to do with the record.

**Trap 2 — two `OPEN:` comments in `src/core/machine.ts` are prose.** `:112` is *"OPEN: DISPLAY and
ALTER wraparound above 10K is not modelled"* and `:125` is *"OPEN: WHICH word mark stops a
DISPLAY"*. A bare `/OPEN:\s*([A-Z0-9_]+)/` harvests the names `DISPLAY` and `WHICH`, and both would
have gone red as orphans.

**A shape rule was chosen over an exclusion list, and the reason is recorded because the alternative
was defensible.** The rule is that a name must contain at least one `_` or `-` separator. Three
arguments for it: every constant in this project is SCREAMING_SNAKE, so the rule is a property of
the namespace rather than a fact about two lines; it needs no maintenance when a later writer writes
a third prose `OPEN:`; and a two-entry exclusion list is a hole through which a real single-word
constant could be pushed, deliberately or not. **Its cost, stated plainly:** a genuine one-word
`OPEN:` constant would be invisible to the sweep. None exists in any domain, and one would be a
naming defect anyway. A case in the test asserts that both prose sites are still present in
`machine.ts` **and** that neither yields a name, so the rule cannot silently stop mattering.

One consequence worth knowing: `DISPLAY_WRAPS_ABOVE_10K` (`:122`) and
`DISPLAY_STOPS_BEFORE_NEXT_WORD_MARK` (`:137`) are declared under those two prose blocks and carry
trailing `// OPEN: open-questions.md …` markers that name a **document**, not a constant, so the
sweep yields no name for them either. That is the right answer — they are Phase 1's rulings — but
`DISPLAY_WRAPS_ABOVE_10K` is **armed** by wave 4's 20K move and is carried to `PHASE-6-NOTES.md` §4
with a drafted register entry.

### The inherited-constants decision, and why it is rows rather than an allowlist

Eleven of the twenty-eight belong to Phases 1, 2 and 4. Plan §15 cites such constants and never
redeclares them, which is right for a ledger of *this* phase's decisions — but criterion 20's oracle
compares the **tree** against `PHASE-6-NOTES.md` §1, so a constant in the tree and absent from §1
fails in one direction no matter whose it is.

Two ways to close that, and the choice is recorded because §16 item 8 points the other way. §16
item 8 says §1 is *"§15's ledger reduced to the constants actually reached"*, which taken literally
yields seventeen rows and a red test. **Criterion 20 wins, because it is the mechanical one** and
because the alternative — a justified allowlist inside the test — is a hole a real Phase 6 constant
could fall through, and one that would need maintaining by hand for ever. The eleven get rows,
marked **inherited**, each saying whose it is and that this phase did not rule on it; the reasoning
is written into §1's own header so the next reader does not undo it. Cost: eleven rows. Gain: the
test's reach is exactly the grep's, with nothing suppressed.

### The sweep has teeth — two mutations, one in each direction

| mutation | expected | result |
|---|---|---|
| a row added to `PHASE-6-NOTES.md` §1 for `A_CONSTANT_THAT_IS_NOT_IN_THE_TREE` | the §1→tree direction goes red | **2 cases red** — *"a §1 row for a constant in no domain: A_CONSTANT_THAT_IS_NOT_IN_THE_TREE"*, plus the set-equality case |
| the `THE_HOPPER_DRAWS_THE_LOADED_DECK` row deleted from §1 | the tree→§1 direction goes red | **2 cases red** — *"in the tree, no §1 row: THE_HOPPER_DRAWS_THE_LOADED_DECK"*, plus the set-equality case |

Both restored and re-verified green afterwards. The second mutation is the informative one: it
removed an **inherited** row, and it is exactly the failure an allowlist would have hidden.

### Criterion 21 — NOT RUN, and it is the one thing this phase cannot close for itself

§16 item 7's wave-7 row requires *"criterion 21's human walk, by name and date"* in this file.
**It has not happened.** Criterion 21 is Tom running `npm run dev` and walking §1 end to end in one
sitting, and no agent can run it or record it on his behalf. This section says so rather than
leaving a reader to infer it from an absence — and the Phase 4 precedent is why it matters: that
phase's criterion 19 found a defect no oracle in its plan saw.

**Outstanding, with the eleven things §13 criterion 21 asks him to look at**, and the last of them
is the one no oracle in this plan can ask: *does this page look like what a period analyst read?*

### The record's own reading of §16, where §16 was wrong when it was run

The conventions are Phase 4's and Phase 5's, re-pointed for a phase that writes almost no `src/`.
Five places where following them literally would have produced a false document:

1. **§16 item 3's domain 1 says "the nine `src/` files this phase edits (§3.10)". It is ten.**
   `git diff --name-only 53b46d4..HEAD -- src` lists `src/ui/main.ts` alongside the nine, edited by
   one line for wave 4's 20K move. §3.10 booked `main.ts` only against the pacing item, which was
   declined — so the file count is wrong in both directions at once. **No name moves**: `main.ts`
   carries no `OPEN:`, so a sweep over §3.10's literal nine finds the same twenty-eight. The sweep
   reads all ten anyway, because the domain is "what this phase edits" and that is measurable.
2. **§16 item 10's period timing figure, 15.93 s, is superseded.** It is §5.10's estimate and it
   predates both the page and the punch. The measured figure is **52,406 instructions ·
   19,143,154.5 µs = 19.14 s**, reproduced live at close-out by `npm run demo`. The walkthrough
   carries 19.14 s. The conclusion §16 draws from it survives and gets stronger: against the 1403's
   11.7 s at 600 lpm the job is compute-bound by about a third, and the dossier's inherited
   printer-bound claim does not survive this design. (For completeness: 116 printed lines at
   600 lpm is 11.6 s; §13 criterion 19's 11.7 s is the same claim rounded, and the ratio is
   unaffected.)
3. **§16 item 8's §1 description and §13 criterion 20 are in tension**, above. Criterion 20 wins.
4. **§16 item 3 anticipates the `OPEN-` card but not the hyphenated name**, above.
5. **§3.8's ~40 lines for the `open-questions.md` section is 119**, and §3.11's ~450 for the
   walkthrough is 686. Both are estimates the build replaces, not defects — recorded because §3.11
   says every row is summed from its parts rather than estimated in the round, and these two rows
   were the exception.

One thing §16 got exactly right and is worth naming: **item 3's narrowing of the grep domain**.
A sweep over all of `src/` would have pulled in every Phase 1-5 constant and made the difference
meaningless; the four-domain rule is what makes a mechanical set difference say something.

### Gate at this commit

```text
npm run typecheck                            clean
npm test                                     120 files / 2114 passed / 1 skipped   [119 / 2107]
npm run smoke                                9 files / 72 passed                   [unchanged]
npm run cc01                                 PASS — CC01A, CC01 COMPLETE, instruction check 00322,
                                             1241 instructions, 82,543.5 us
npm run check:deferred                       0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved
                                             exit 0
npm run demo -- demos/reentry.cards --golden  PASS byte for byte, 13,488 bytes;
                                             52,406 instructions · 19,143,154.5 us · stop halt
npm run rpg  -- ... --page --golden           PASS byte for byte, 9,648 bytes
the seven shipped goldens                    348 / 2251 / 3688 / 6982 / 120 / 2522 / 33450 unmoved
test/golden/                                 10 files, none touched this wave
demos/ vs 0b17a9d                            byte-identical — §11.5 rule 1 still respected
git diff --name-only 53b46d4..HEAD -- src    unchanged by this wave (docs + one test only)
git diff --diff-filter=A 53b46d4..HEAD -- src  empty  (criterion 7)
```

`npm test` moves by **one file and seven cases**, which is exactly this wave's one test file. The
count lands on **120 files**, the number §13 criterion 1 predicted for the decline path — the plan
said 120 / ≈2,093 without the pacing item, and the measured figure is 120 / 2,114 / 1 skipped.

### Where the twenty-one criteria stand at the close of wave 7

| | criterion | status |
|---|---|---|
| 1 | the standing gate | **green** at 120 / 2,114 / 1 skipped and 9 / 72; `npm run build` last measured at wave 6 (380 kB, one relative asset ref) |
| 2 | `npm run cc01` byte-identical | **green** — 00322, 1241 instructions, unmoved since Phase 1b |
| 3 | `check:deferred` `1 resolved`, exit 0 | **green** from wave 0 on |
| 4 | nothing that shipped moved | **green** — seven goldens, `demos/hello-dad.*`, `controls.ts` SHA-256 |
| 5 | `assemble()` `ok` / 0 flagged / 0 warnings, closed loop | **green** (waves 3, 4, 5) |
| 6 | the program fits | **green against the measured ceiling**, 11,132 on a 20,000-position machine. The criterion's own *"≤ 09,000 on a 10,000-position machine"* is superseded by the 20K move and is logged as a deviation |
| 7 | zero new modules under `src/` | **green** at every commit |
| 8 | 92-step exact equality | **green**, 0 mismatches |
| 9 | max \|DIFF\| ≤ 0.50 ft/s, and the summary prints the test's figure | **green** — 0.06 both |
| 10 | DIFF is internally honest on every row | **green**, worst residual 0.97 of a bound of 1 |
| 11 | guards and the four NACA checkpoints | **green** |
| 12 | the page byte for byte over three forms | **green**, 13,488 bytes |
| 13 | the page parsed back into numbers | **green**, zero cells at ≥ 2 units |
| 14 | the mutation pass has teeth | **green as re-implemented** — M5 reddens all ten columns; §4.7's M1-M4 are unreachable as written and are implemented against the guards that can see them, logged as a deviation |
| 15 | no character outside chain A in any printed literal | **green**, both decks, in two files |
| 16 | the punch | **green** — 92 cards, deep-equal to the committed deck |
| 17 | the RPG demonstration | **green**, both directions |
| 18 | the operator's evidence | **green** — 189 cards, the `S` with Op group `.`, the 1415 roll |
| 19 | performance printed, never asserted | **green** — 52,406 / 19.14 s / 27 frames, unaccelerated, Accelerator not assumed |
| 20 | the record closes | **green** — the dated section exists, the set difference is empty both ways under `test/reentry-open-constants.test.ts`, and `docs/reentry-walkthrough.md` states all three caveats the artifacts cannot carry |
| 21 | **the human walk** | **OUTSTANDING — Tom's, and it is the phase gate's last item** |

**What is left before merge**, and none of it is a wave's: criterion 21; Tom's ruling on the 20K
machine, which is recorded as provisional (`PHASE-6-NOTES.md` §2); his decision on the pacing item,
which was never put to him; `docs/STATUS.md` and `docs/DECISIONS.md` at the merge; and the three
register entries drafted in `PHASE-6-NOTES.md` §4 for `/tripwire add`. The whole-branch Opus review
judges whether each row of §1, §2, §3 and §4 says the **right** thing — criterion 20 only asserts
that the set of rows is the set of constants, which is the part a person should not have to check.

---

## Wave 7, addendum — the review's ten findings, and wave 6's missing screenshot

The wave-7 Opus adversarial review returned **BLOCK** on two findings and eight lesser ones. All ten
are real; every one was reproduced before it was acted on. Both blockers were in the *paperwork*, which
is now this phase's whole record on the point: not one defect found by any of the eight wave reviews
was in the emulated machine.

### Blocker 1 — the Avco retraction was not complete, and this log said it was

`ed0ee84` and `f5d2456` amended §2's table row, §2's interpretation and §10's open question of
`docs/research/avco-and-reentry.md`. Two statements survived, both outside any build wave's reach and
so outside both escalations:

- `docs/research/avco-and-reentry.md:5` — the **Implementer summary**'s item 1, the first prose in the
  file, still reading *"there is no evidence any IBM 1410 was ever installed at AVCO … treat 1410 at
  AVCO as period-plausible fiction, not history"*.
- `docs/research/README.md:28` — the index row, describing the file as carrying *"the flat negative
  that no 1410 is documented at any Avco site"*.

`PHASE-6-NOTES.md` asserted that two escalation commits had landed the retraction. That was **false as
written**, and it cited `§1` for a bullet that lives in the file's unnumbered Implementer summary.
Both are corrected in the wave-7 files, and the row now records the miss rather than quietly
rewording. The two research sites were fixed in a **third escalation commit**, `dc905d0`, on its own
because `docs/research/*` is escalation-only (`DECISIONS.md`, 2026-08-31).

The correction is not cosmetic. This is the phase's most important factual reversal — a family member
**remembers being in the room with the 1410 and using it** — and a reader who opened the research file
at the top would have found the withdrawn claim stated flatly, with a `[verified]` tag beside it.

### Blocker 2 — wave 6 has no screenshot, and nothing recorded that

§11.6 requires four: wave 0 the 1415 roll, wave 4 the 1403 on plain white, wave 5 the punch feed,
**wave 6 the whole desk in both tabs**. Only the first three were taken. Wave 5 predicted the cause
(`BUILD-LOG-6.md:1342`) and `PHASE-6-NOTES.md` explains the throttling, but no document said the shot
had not been taken, and the criterion table omitted it.

**Discharged here, late and partially, with the limit measured rather than asserted.** The line §11.6
asks for is below; the verdict it carries is a defect with a named deferral, which §11.6 provides for.

| | |
|---|---|
| wave | 6 (screenshot taken at wave 7, `dc905d0`+, against `npm run dev`) |
| station | the whole desk, both tabs — `docs/screenshots/phase-6/wave-6-desk-machine-room.png` and `docs/screenshots/phase-6/wave-6-desk-internals.png` |
| Q1 — does the twelve-column table read as a table? | **not answerable from this shot.** The 1403 is at `form 1, line 1 0 lines printed`. Wave 4's `wave-4-1403.png` is the answer on the record |
| Q2 — does the page read as a reconstruction? | **not answerable from this shot**, same reason; wave 4 answered it |
| defect | the run does not advance under browser automation, so the desk photographs **idle** |
| deferral | **criterion 21**, Tom's human walk, where the desk is in front of a person and the shot is trivially obtainable |

**The measurement, because "Chrome throttles background tabs" was until now an assertion.** In the
automation harness the page reports `document.visibilityState === 'hidden'` and
`document.hasFocus() === false`, and a `requestAnimationFrame` callback registered by hand fired
**0 times in 2,500 ms**. The desk's run loop is rAF-driven, so START latches and then nothing steps:
after `sample reentry` → `ASSEMBLE` → `PUNCH INTO HOPPER` → `PUT DECK IN HOPPER` → `key the bootstrap`
→ `READER START` → `START`, the INTERNALS tab reads **`IAR 00001`**, **`0 instructions 0 µs
simulated`**, and core all zeros. That is the second screenshot, and it is the *evidence* rather than
the deliverable.

This is a **harness limit, not an emulator defect**, and the separation is already on the record: wave
6 verified the desk's own frame shape headlessly — 27 frames, halt, 92 cards, 116 lines — which is the
same walk this shot could not drive.

Two further attempts were made and both failed, which is where they stopped per the two-attempt rule:
setting `document.body.style.zoom` to fit the desk vertically reflowed the responsive layout to
**56,819 px** and then **froze the renderer** (CDP `Runtime.evaluate` timed out at 45 s). With the
189-card deck drawn in the hopper the page is **75,675 px** tall, so "the whole desk" was never a
single viewport in the first place — which is itself worth recording against §11.6's wording for any
later phase that inherits the rule.

### The eight lesser findings, all applied

| # | file | what was wrong | fix |
|---|---|---|---|
| 3 | `docs/reentry-walkthrough.md:124` | *"read one card … into address 00001 and branch to it"* — both halves wrong. `loader.ts:13-17`: the card lands at **00012**; 00001 is where the keyed `L` sits | rewritten to the source's own words, with the citation |
| 4 | `PHASE-6-NOTES.md` | `demos/probe-antilog.asm` given as **288** cards in a column headed *measured*. `wc -l` is **296** — 288 is the sequence-range arithmetic, and 8 cards are intercalated at 02541-02547 | **296**, with the reason |
| 5 | `PHASE-6-NOTES.md` | the fixture given as **1,026** lines; it was 1,026 at wave 1 and is **1,041** since `3aed06b` | **1,041**, with both figures |
| 6 | `docs/reentry-walkthrough.md:318` | *"121 times the error the page's own DIFF column tracks"* — the plan's 121× is against the **0.50 published bound**, not the printed 0.06. A reader dividing off the paper lands ~8× away | denominator named; the ~1,000× against the printed figure stated too |
| 7 | `PHASE-6-NOTES.md` §4 item 15 | *"the set of rows **is** the set of constants in the tree"* — true of §16 item 3's four domains only. `REENTRY_GOLDENS_ARE_CONSTRUCTED` at `test/tier4-reentry-target.test.ts:49` is a Phase 6 `OPEN:` outside them | qualifier added and the one exception named out loud; widening the domain refused for §16 item 3's own reason |
| 8 | both documents | the 1410's 12 Sep 1960 announcement / 1961 first ship, and the 1965 7090 + 1401 print satellite, restated as bare fact. Both are `[likely]` at source | tags and sources restored; the announcement date is load-bearing for the surveys' silence |
| 9 | `PHASE-6-NOTES.md:98` | `hello-dad.asm:4` / `sales-summary.asm:6` cited for `CTL 1`; it is line **3** in both | corrected, with what `:4` and `:6` actually are |
| 10 | `docs/reentry-walkthrough.md:562` | 11.7 s of 1403 time printed with no form number, where §16 item 10 names **A22-0526-3 p.67** and the other two RULINGS §E 29 facts carry theirs | citation added, and the honest 11.6 s at 116 lines noted beside the round figure |

### What the review could not fault

Criterion 20's sweep is **real**. The reviewer re-enumerated every `OPEN[:-]` occurrence across all
fourteen domain files with its own grep and an independent re-implementation of the regex: **28 names,
set-identical to the test's**, and the glob is not too narrow — it carries `demos/probe-antilog.asm`
and `demos/reentry-summary.rpg`, which §16 item 3 requires. The shape rule drops exactly two prose
`OPEN:` sites and nothing else. Teeth reproduced at **2 red cases** in each direction, restored from a
SHA-256-verified backup, tree byte-identical afterwards. `open-questions.md` is one hunk,
`@@ -1148,0 +1149,119 @@`, pure insertion past the old EOF. No 1401/1410 confusion in either new
document. Every reproduced page block in the walkthrough — heading, first five rows, peak rows, last
rows, summary block, both RPG excerpts, the full Selectric roll — is **byte-identical to the committed
goldens**, and the deck is 1,195 cards everywhere with no surviving 1,185.

### Criterion 6's row, restated honestly

The criterion asks for high-water **≤ 09,000 on a 10,000-position machine**. The measured figure is
**11,132 on a 20,000-position machine**. That is not the criterion passing; it is the criterion
**superseded by the 20K move**, which is itself **provisional pending Tom's ruling** (`PHASE-6-NOTES.md`
§2). The table row above says "green against the measured ceiling" and that phrasing does more work
than it should. Recorded here plainly: **criterion 6 as written is not met, and cannot be met at 20K.**

### Gate after the ten fixes

```text
npm run typecheck                            clean
npm test                                     120 files / 2114 passed / 1 skipped
npm run smoke                                9 files / 72 passed
npm run cc01                                 PASS — check 00322, 1241 instructions
npm run check:deferred                       0 ok · 0 tripped · 0 manual · 0 no-trigger · 1 resolved
npm run build                                exit 0 · 1 relative asset ref
the seven shipped goldens                    348 / 2251 / 3688 / 6982 / 120 / 2522 / 33450 unmoved
src/ui/internals/controls.ts                 SHA-256 a6d90f54…f318f unmoved
```

Only documents and one test moved. No `src/`, no `demos/`, no golden.

---

## Close-out, 2026-10-02 — the two rulings, built; the record corrected

Run by an Opus main session on Tom's instruction (Fable seats substituted by Opus, confirmed at the
start of the session), workers on Opus and Sonnet. The dead `main-gate` worktree under a deleted
scratchpad was pruned first; it had held `main` checked out.

**Tom's rulings, 2026-10-02.** (1) The 20K machine is **accepted**, and criterion 6 as written is
superseded by the 20K figure. (2) The pacing item: **build it**. (3) DEFERRED-02's discharge, the
sub-choice the 20K acceptance forced: **build the wrap**, rather than an accepted divergence.

| commit | what |
|---|---|
| `002e9b7` | §10.6's pacing item as the plan wrote it, plus `test/period-pacing.test.ts` (five cases: the four oracles and a seeded strip); walkthrough §2.6 and §8 rewritten for the paced default; a §1 row for the new `OPEN:` constant, set difference 28 → 29 |
| `f5dd292` | DISPLAY / ALTER wrap above 10K, `DISPLAY_WRAPS_ABOVE_10K = true` `[verified]`; six cases; `open-questions.md` row ANSWERED |

**Two things in §10.6 did not match the tree, both cosmetic:** its `machine.ts:117` citation for the
Cpu is stale (the comment says "the façade exposes the Cpu" instead), and its numbers are the plan's
41,543 instructions / 15.93 s, where the build measured **52,406 / 19.14 s**; the walkthrough uses the
measured pair.

### The screenshot — `docs/screenshots/phase-6/close-out-desk-paced.png`

The desk ~10 s into the paced reentry run in Chrome via `claude-in-chrome`, `1411 SPEED` checked,
80 of 116 lines printed. **The run was timed, not just shot:** lines printed per second of wall clock
went 15, 21, 26, 31 … 109, 116, and the run stopped between 18 and 19 s with the roll ending on
`S Ø7557 Ø7556 Ø6438 .`, the programmed halt of `test/golden/reentry-console.txt`. The 1411's own
figure is 19.14 s. The first attempt hit wave 5's throttling exactly (`visibilityState: hidden`,
rAF frozen); it ran once the Chrome window was brought to the front. **Unpaced it is 27 frames.**

### Gate at `f5dd292`

```text
npm run typecheck                            clean
npm test                                     121 files / 2125 passed / 1 skipped
npm run smoke                                9 files / 72 passed
```

The merge gate, re-run in full on `main`, is in `docs/DECISIONS.md`'s Phase 6 block and
`docs/STATUS.md`.
