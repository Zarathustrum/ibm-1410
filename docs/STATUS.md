# Status

Update before ending a session. Newest first.

## 2026-10-03 — GitHub snapshot privacy cleanup

Personal attribution now uses Zarathustrum; lab hosts have consistent neutral
labels, and the private repository address is omitted. See `HISTORY.md`.
Development records and outstanding emulator work remain as recorded below.

## 2026-10-02 — Phase 6 merged into `main` at `145abd3`; criterion 21 outstanding; pushed (host-b)

**Pushed to Gitea on Zarathustrum's word ("push it"): `main` at `8ebee95` and the branch at `f469255`.** Checked
2026-10-02 after the later docs commits: `main` = `origin/main` = `cf66748`, and the branch = its origin = `f469255`.
**Criterion 21 deferred by Zarathustrum the same day for time**; the resume prompt for it is
`resume-ibm-1410-criterion-21-2026-10-02.md` in the repo root, and a Twos to-do points at it.
`feature/phase-6-reentry` at `f469255`, pushed. Opus main session
(Zarathustrum confirmed Opus for the Fable seats); workers Opus and Sonnet.

**Done this session.** The dead `main-gate` worktree pruned. Zarathustrum's three rulings built on the branch:
**the 20K machine accepted** and criterion 6 as written superseded; **real-time pacing** built
(`1411 SPEED`, default on; measured in Chrome at 18-19 s against the 1411's 19.14 s); **DEFERRED-02
discharged by building the DISPLAY/ALTER wrap**. The record corrected (`PHASE-6-NOTES.md` §2's "the
pacing item was declined" was false). A **whole-branch Opus review** — required by the plan, never run
by the build — returned **BLOCK**: the walkthrough's two-job walk on the desk's one machine printed 52
wrong extract lines from a stale word mark. Fixed in the RPG generator on Zarathustrum's ruling (the generated
program clears its own card area at entry), plus a pacing average that spanned jobs, two drawn 10K
captions and six false statements in the notes; re-review **APPROVE-WITH-NOTES**. Merged `--no-ff`.
The register gains DEFERRED-02 (RESOLVED), -03 (WATCHING) and -04 (MANUAL). The spent SYSTEMS
CONTROLS handoff is deleted. `docs/DECISIONS.md` carries the Phase 6 block.

**Gate on `main` at `145abd3`:** typecheck clean · `npm test` **121 / 2126 / 1 skipped** · smoke **9 /
73** · cc01 PASS at **00322 / 1241** · six CLI goldens **348 / 2251 / 3688 / 6982 / 13,488 / 9,648**
byte-for-byte · build exit 0, 375 kB JS, 1 asset ref · `controls.ts` SHA unmoved · `check:deferred`
after the register entries **1 ok / 0 tripped / 1 manual / 2 resolved**.

**Next — Zarathustrum's:**
1. **Criterion 21: walk the desk** — `npm run dev`, `docs/reentry-walkthrough.md` §2, both jobs, on one
   page without reloading. **Outstanding; do not mark it done until he has walked it.** Phase 4's walk
   found a defect the reviews missed, and this phase's review found another of the same class.
   Worth watching on the walk: running the reentry deck *twice* prints 121 lines, not 116
   (`PHASE-6-NOTES.md` §4 item 18, not chased); and the coding sheet's notice still says "key the
   bootstrap and run it" after every PUNCH INTO HOPPER, where §2.9 says the second job must not
   (`src/ui/period/coding/mount.ts:94-96`, harmless prose).
2. Publication to GitHub is a separate, later task.

Superseded, not preserved: an uncommitted 2026-10-02 docs-sweep entry written before Zarathustrum's rulings.

## 2026-09-04 — Phase 6 plan at Zarathustrum's gate (host-b)

**`feature/phase-6-reentry` at `bb7cd7e`+, pushed to Gitea. `main` untouched at `53b46d4` (still one
commit ahead of origin, unpushed).** The Phase 6 (reentry showcase) plan — `docs/plans/phase-6-reentry.md`,
4,852 lines, sixteen sections plus §2.4 (Zarathustrum's ten decisions on one page) — is written FROM
`docs/plans/phase-6-panel-dossier.md` (`wf_cf69d70d-d3a`: three Opus architects, three Opus judges, one
Opus synthesis; **paper-first 448 / exact-solution-first 431 / reuse-first 422**) and the orchestrator's
rulings on it, then closed through the FULL review shape (`wf_cf337e1c-998`): spine + four drafters +
integrator → two Opus skeptics (2/6/8, 1/4/11; 32 applied) → three Opus verifiers (all 32 closed; new
1/1/5, 0/2/3, 0/2/7; 23 applied) → whole-document re-verifier (needs-revision 1/2/5; 9 applied) → second
pass **`ready-with-notes`, zero blockers**, three residual minors applied by the main session. Record:
`docs/BUILD-LOG-6.md` Arrival. Main session on Fable 5.1; every worker seat Opus; Zarathustrum's instruction
substitutes Opus for the build orchestrator's Fable seat this session.

**The spine.** Allen-Eggers drag-only two-state (V, h) at constant γ, RK4 at dt = 0.25 s from a 150,000 ft
band top (a **state**: V₀ = 22,939.54 ft/s on eq.13's curve, not V_E), 92 rows over three inked forms —
one break by the channel-12 latch, one by a programmed `CC1 1`; twelve columns on 132 positions with eq.13
printed beside the integrated velocity and the difference beside that (worst 0.07 ft/s against a
derived, published 0.50); one decimal antilog (100 × 10 `DCW` entries + a quadratic residual, 2.034e-6),
no `u^3.15` table, no `T`, zero divides at run time; the deck prints **and punches** 92 summary cards
that an RPG job with no control fields tabulates (the `STATUS.md:221` requirement, behind a four-clause
symbol predicate asserted both ways); the punch station retired in ~26 lines, no new module under `src/`;
four reference layers with the page parsed back to one unit in the last printed digit and a five-way
mutation pass. Eight waves, each closed by an oracle no later wave writes.

**DEFERRED-01 is wave 0**: `HALT_TYPES_NO_PRINTOUT` → `PROGRAM_STOP_TYPES_S = true`, `[verified]` against
S223-2648 p.6; the migration list complete with a deliberately-unedited list beside it; the register's
"eleven `S` lines" claim **measured false** — zero op `.` on cc01's 1241-instruction path, so the rename
moves no byte of that transcript — and the tools path switched to `machine.start()` so `npm run demo`'s
console log ends on the `S` the desk's does.

**Gate at `bb7cd7e`:** typecheck clean · `npm test` **111 / 1968 / 1 skipped** · smoke **7 / 50** · cc01
PASS at **00322 / 1241** · goldens 348 / 2251 / 3688 / 6982 / 120 / 2522 / 33450 · build clean, 1 asset
ref · `controls.ts` SHA `a6d90f54…` · **`check:deferred` 0 ok / 1 tripped, exit 1** — DEFERRED-01
moved WATCHING → TRIPPED per its own protocol; the plan's ordering A, one red commit on the branch,
`main` untouched, and Zarathustrum's decision 1.

**Next: Zarathustrum's ≤7-bullet gate for Phase 6**, posted in-session 2026-09-04 with the ten decisions of plan
§2.4 (register ordering; band/gravity/rows; job shape and punch; twelve or eleven columns; case-card
numbers; real-time pacing; plain-white form; the hello-dad framing; the walkthrough's form; the build
process). **The build does not start before his "go."** On "go": an Opus build orchestrator on
`feature/phase-6-reentry`, waves 0-7 per §11, Opus workers, per-wave Opus review, §12.2's gate at every
commit, four screenshots under `docs/screenshots/phase-6/`; wave 0 turns the register RESOLVED and the
gate green. At merge the orchestrator amends this file's 2026-09-02 DEFERRED-01 sentence (line 161) and
adds the Phase 6 block to `DECISIONS.md` (plan §16 item 9).

**Open for Zarathustrum, none blocking beyond the gate itself:** the ten decisions above. Carried unchanged:
`EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS`, the `PB1`/`PB2` contradiction, the `exec-bce`/`exec-w`
flake, the host-a worktree at `/private/tmp/ibm1410-phase5-whole-review.nrZHUI/tree`. New, recorded
not acted on (plan §15 row 19): `avco-and-reentry.md` §6's Move-timing row disagrees with
`opcodes.md:219` / `src/core/cycles.ts` — an `[observed]` research inconsistency for an escalation
commit, never a build-wave edit.

## 2026-09-03 (evening) — `SYSTEMS CONTROLS`: Zarathustrum ruled for the photograph (host-b)

**An escalation commit against `docs/research/`, not a build-wave edit.** Zarathustrum, on the two-source
difference left open at the Phase 4 merge: *"SYSTEMS CONTROLS — go with the photograph."* A22-0526-3
Figure 55 p.55 **prints** `SYSTEM CONTROLS`; the S223-2648 Figure 3 p.8 **photograph** shows the
1415 panel silkscreened `SYSTEMS CONTROLS`. Both sources stay cited at `console-and-physical.md` §5;
the label now follows the physical object, and §5 records the reversal in its own text so a later
reader who finds Fig.55 sees a decision rather than a typo.

**Nine sites, one commit, because they cannot move apart.**
`test/period-light-panel-vs-research.test.ts` carries **no golden**: its expectation is a live slice
of §5's `| Box | Sub-group | Lights |` table, diffed against `lamps.ts`'s `PANEL_BOXES` in both
directions with `PANEL_BOXES.map(spec => spec.title)` asserted equal to §5's box column. Editing
either side alone turns it red — by design (§12.3). Moved together: §5's box-order sentence, §5's
table row and the ruling recorded beneath it; `console/lamps.ts`'s drawn title, its header comment
(which stated the opposite verbatim) and its STOP prose; `console/lightsView.ts`'s REDUCED PANEL
label and stacking comment; and the two test files carrying the string in a citation and a comment.
`open-questions.md`, `BUILD-LOG-4.md` and `PHASE-4-NOTES.md` now record the ruling where they
recorded the difference. `docs/plans/phase-4-period-ui.md` stays **unpatched by decision**.

**The header comment was rewritten line-count neutral, deliberately.** A longer rewrite shifted
`lamps.ts` by four lines and turned `test/period-refusal-grep.test.ts` red: its `1401 COMPAT` /
`TAPE OFF LINE` / `DISK OFF LINE` whitelist entries are pinned to `lamps.ts:137`, `:138`, `:163`,
`:165`, `:166`, and `BUILD-LOG-4.md:901` and `PHASE-4-NOTES.md:57-64,455` cite the same lines in
prose. Three lines in, three lines out — no pin churn anywhere.

**Gate green on the change:** typecheck clean · `npm test` **111 files / 1968 passed / 1 skipped** ·
`npm run smoke` **7 files / 50** · `npm run cc01` PASS at **00322 / 1241 instructions** ·
`npm run build` clean with **1** relative asset ref in `dist/index.html` · `controls.ts` SHA-256
`a6d90f54…` unmoved · `npm run check:deferred` 1 ok / 0 tripped. The Phase 4 hard constraint still
holds: `git diff --stat 6755b1d..HEAD -- src/core src/asm src/rpg src/formats tools demos
test/golden` is **exactly one line** — this ruling is a legend, not a machine fact.

**Open for Zarathustrum, none blocking:** (a) `specs/mount.ts`'s SEND TO AUTOCODER declines correctly but
says nothing at all — outlawing silence-on-refusal is a rule change, not a whitelist entry, and it
widens the sweep's Case A predicate across ~19 handlers. (b) The RPG report's AMOUNT and COMMISSION
columns abut with no gap; Phase 5's frozen output, byte-locked by the 3688-byte golden, cosmetic.
Carried unchanged: `DEFERRED-01`, `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS`, the `PB1`/`PB2`
contradiction, the `exec-bce`/`exec-w` flake, and the host-a worktree at
`/private/tmp/ibm1410-phase5-whole-review.nrZHUI/tree`.

## 2026-09-03 — criterion 19 walked; six silent refusals found and fixed (host-b)

**`main` at `d37cb52`+, pushed to Gitea, tree clean.** Zarathustrum walked §1 from the authoring end and
**criterion 19 discharged by finding a real defect** — *"i got to the point where i have punched
cards. however, no matter what ive tried they wont load."* `key the bootstrap` reported keying
`AL%1000012$R` at the 1415 while the Selectric stayed blank, then instructed COMPUTER RESET / RUN /
START into a machine with nothing loaded: `ConsoleSession.keyBootstrap`'s §6.5 ruling-3 guard is
correct but returned `void`, so the deck box painted its affirmative note unconditionally. Seven
gated waves, per-wave Opus review, RULE 4's six screenshots, 1,950 tests and a `ready-with-notes`
whole-branch review had all passed over it. **All 19 exit criteria are now discharged**
(`docs/BUILD-LOG-4.md`, criterion 19).

**One bug became six, all one shape** — a control calling something that can silently refuse, and a
caller that paints success anyway. A read-only Opus audit of the whole period surface reproduced
five more at runtime: INQ CAN discarded nothing and, mid-ALTER, **committed the cancelled text to
storage** on the next control action; a refused DISPLAY address vanished looking exactly like success
(`ABCDE` and every address ≥ 10000 on a 10K machine); START in ALTER with nothing displayed fell off
the end of `startKey` under a caption promising it unlocks the keyboard; a stray INQUIRY RELEASE
queued a phantom entry a later read would take as Figure 45's Condition; and M2 stalled silently in
both directions. Commits `e6b2d08` (the bootstrap), `afbcaf3` (the four console defects), `1c81ac5`
(M2), `d37cb52` (the sweep). **Every fix verified in the browser, not only in test.**

**M2 reopened on Zarathustrum's call and fixed**, taking `PHASE-4-NOTES.md` §4's candidate 1 — surface the
disagreement, both directions. The gate is **explained, not opened**: a START on the wrong tab still
executes nothing and now names the control holding it. The two alternatives were refused with
reasons recorded in `DECISIONS.md`. §14 R6's residual is narrowed, not closed.

**The class is now caught mechanically.** `test/period-a-refusal-is-visible.test.ts` sweeps every
click handler under `src/ui/period/**` for a `.textContent` write with no branch, and every `: void`
early return for a cited reason (15 `GUARDED_VOIDS` entries, none refused). It **failed red on a
seventh site** — `coding/mount.ts`'s punch handler, which would have wiped the deck box and printed
"0 cards punched" with a full set of instructions — before that was fixed. Why nothing caught the
original: `period-console.test.ts` proved those refusals at the session level but imports no view;
`period-keydown-ownership.test.ts` sweeps `.press(` callers, not return values;
`period-refusal-grep.test.ts` reads label text and never looks at a handler. Both halves were tested,
in two files that never meet.

**Gate on `main`:** typecheck clean · `npm test` **111 files / 1968 passed / 1 skipped** (was
110 / 1950 / 1) · `npm run smoke` 7 / 50 · cc01 byte-identical at 00322 / 1241 · goldens
348 / 2251 / 3688 / 6982 unmoved · build clean · asset grep 1 · `controls.ts` SHA `a6d90f54…`
unmoved. **`git diff --stat 6755b1d..HEAD` over `src/core src/asm src/rpg src/formats tools demos
test/golden` is still exactly one line** — six behaviour fixes, no byte of the machine moved.

**Both authoring paths re-driven end to end on `main`:** the punch path prints the reentry table
(form 2, line 1, five lines); the RPG chain gives `No diagnostics.`, the memory map
`CONSTANTS 00500 · CODE 00808 · IND 02533 · CDIN 02540 · PLINE 02700 · PLGM 02832 · HIGH 02833 ·
CTL 1`, **254** source cards, **0** flagged lines, **39** condensed object cards at entry 00808, and a
four-form 62-line report. Every number §11 wave 6 predicted.

**Open for Zarathustrum, none blocking:** (a) `specs/mount.ts`'s SEND TO AUTOCODER declines correctly but says
nothing at all, leaving the previous note standing — verified unreachable and cited in
`GUARDED_VOIDS` rather than changed, because outlawing silence-on-refusal is a rule change, not a
whitelist entry. (b) The RPG report's AMOUNT and COMMISSION columns abut with no gap
(`000,001.000000,000,000.05`); it is Phase 5's frozen output, byte-locked by the 3688-byte golden,
cosmetic. (c) `SYSTEMS CONTROLS` vs `SYSTEM CONTROLS` — **ruled and applied 2026-09-03, see the
entry above.** Carried unchanged:
`DEFERRED-01`, `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS`, the `PB1`/`PB2` contradiction, the
`exec-bce`/`exec-w` flake, and the host-a worktree at
`/private/tmp/ibm1410-phase5-whole-review.nrZHUI/tree`.

## 2026-09-02 (evening) — Phase 4 merged (host-b)

**`main` at `65ddb4a`, the `--no-ff` merge of `feature/phase-4-period-ui` (`786647c`), pushed to
Gitea.** The whole period UI landed in one session, from Zarathustrum's "go" to the merge: **seven wave
commits**
`4932bee` (the move, the shell, the freeze, the build fix) · `d3b3984` (the paper and the console,
DOM-free, and the phase oracle) · `d837aab` (the 1403 station) · `4cfaf38` (the 1402 station) ·
`9b5d0de` (the 1415 station) · `48fec7e` (the desk and the stylesheet) · `21b86a1` (the two authoring
stations) · `af44d45` (the storyboard test and the documents), plus eleven `[Docs]:`/`[Test]:`
commits. One Fable build orchestrator, every worker on Opus or lower, per-wave Opus adversarial
review with fixes applied **before** each commit, the §12.2 standing gate at every commit, and a
committed browser screenshot per art wave — six PNGs under `docs/screenshots/phase-4/`, all taken by
the main session because the orchestrator's seat had no browser.

**Gate re-run on `main` after the merge**, a `git merge-tree` dry run having been conflict-free
beforehand: typecheck clean · `npm test` **110 files / 1950 passed / 1 skipped** · `npm run
smoke` **7 files / 50** · `npm run cc01` byte-identical (CC01A, CC01 COMPLETE, check at 00322, 1241
instructions) · goldens **348 / 2251 / 3688 / 6982** bytes unmoved, plus the phase's one new golden
`card-face-a.svg.txt` at 33,450 · `npm run build` clean, `dist/` 300 kB · `grep -c 'src="\./assets'
dist/index.html` = **1** · `shasum` of `src/ui/internals/controls.ts` `a6d90f54…` unmoved. **The hard
constraint holds:** `git diff --stat 6755b1d..HEAD -- src/core src/asm src/rpg src/formats tools
demos test/golden` is exactly one line, `test/golden/card-face-a.svg.txt | 19 +`.

**18 of 19 exit criteria discharged** — 13 green by command, 5 green by review judgement (3, 9, 13,
16, 18a), each on a corrected figure or a recorded ruling. **Criterion 3 does not pass as literally
written** ("exactly 16 deleted / 2 added" against the measured `3 / 17` fold — `noUnusedLocals` forces
the `ConsoleLine` token out of the type import) and was never evaluated on that literal; the plan is
stale at five sites and, by Zarathustrum's standing instruction, **was not patched** — corrections live in
`PHASE-4-NOTES.md` §2 and `docs/BUILD-LOG-4.md`. Two plan oracles asserted end states the demo does
not produce: the carriage straddle (wrong in three places) and §11 wave 6's `I` line (`sales-summary`
issues no `RCP`, so a released inquiry types nothing). **Nine absence assertions were found reading
nothing** — a control byte making `grep` treat a file as binary, a comment-stripper that swallowed
live code, a refusal grep that missed the entire 1415 (258 labels swept, 418 after), and six more;
**not one came from a gate going red**, and the whole-branch review's four were each proved by
off-tree mutation. Rulings recorded in `docs/DECISIONS.md` 2026-09-02: no framework; `controls.ts`
frozen; the H-chain restrike; DISPLAY and C.E. as UI-only detents; the inquiry hold; the keyboard
focus rule; sound out; criterion 17's `file://` clause accepted as unmeetable (Zarathustrum, `83a02bd`).
Line 11 flips to Vite `[settled]` in the same block.

**Outstanding: criterion 19, Zarathustrum's human walk.** It did not gate the merge — Zarathustrum's call, 2026-09-02:
*"lets push it then i'll test"* — so the merge went in with it open and the walk is recorded on `main`
afterwards. `npm run dev -- --port 5173 --strictPort`, walk §1's storyboard on the desk, and the main
session records it by name and date at `docs/BUILD-LOG-4.md`'s criterion-19 line. The drive that works: deck box `sample deck` →
`PUT DECK IN HOPPER` → 1402 `READER START` → `END OF FILE` → 1415 `STOP` → rotary `DISPLAY` → `START`
→ type `00000` → rotary `ALTER` → `START` → `key the bootstrap` → `COMPUTER RESET` → rotary `RUN` →
`START`. **Two known non-bugs to expect**, both recorded: a released inquiry types no `I` line on
this deck; and M2 — DISPLAY → INTERNALS → START re-latches `running` into a gate closed on `detent`,
nothing executes, and the live MODE label reads `RUN`. If the walk turns up anything beyond those two,
it lands on `main` as its own fix commit.

**Open for Zarathustrum, none blocking:** (a) `SYSTEMS CONTROLS` vs `SYSTEM CONTROLS` — the S223-2648
photograph silkscreens the CE panel one way, `console-and-physical.md` §5 says the other per
A22-0526-3 Fig.55; logged in `open-questions.md` rather than patched, because §5 is wave 4's oracle
target. **[Ruled 2026-09-03 — the photograph. Applied as an escalation commit; see the top entry.]** (b) M2, recorded not fixed (`PHASE-4-NOTES.md` §4) — two candidate fixes named. (c)
`DEFERRED-01` in `docs/deferred-work-register.md`: S223-2648 p.6 says a program stop initiates a stop
print-out, against `HALT_TYPES_NO_PRINTOUT = true` (`src/core/machine.ts:65`); trips when a Phase 6
plan appears, check with `npm run check:deferred`. **[Resolved 2026-09-04 in Phase 6 wave 0, recorded
at the merge 2026-10-02: renamed `PROGRAM_STOP_TYPES_S = true`, `[verified]` against S223-2648 p.6 — a
programmed halt types the `S` line. See `docs/deferred-work-register.md` DEFERRED-01.]** Carried forward unchanged:
`EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS`, the `PB1`/`PB2` contradiction,
`LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE`, the `exec-bce`/`exec-w` flake. Housekeeping still on
host-a: the detached worktree at `/private/tmp/ibm1410-phase5-whole-review.nrZHUI/tree` (`9305a06`).

## 2026-09-02 — Phase 4 plan closed at ready-with-notes, at Zarathustrum's gate (host-b)

**`feature/phase-4-period-ui` at `5f98c23`+, pushed to Gitea. `main` untouched at `6755b1d`.** The
Phase 4 (period UI) plan — `docs/plans/phase-4-period-ui.md`, 3,367 lines, sixteen sections — is written
FROM the design-panel dossier (`eed111f`) and closed through the FULL review shape on host-b: two Opus
skeptics (research 3/8/9, engineering 5/12/15) → two revisions → three Opus verifiers (all 52 round-1
items closed; new 1/4/13, 0/2/9, 3/11/13) → consolidated fix → one Opus re-verifier: **`ready-with-notes`,
zero blockers**, residual 3 majors / 7 minors applied by the main session. Commits `d4bcfdc` (IN REVIEW),
`3361368`, `cfbcd0e`, `0466fe3`, `5f98c23` (closed). Record: `docs/BUILD-LOG-4.md` Arrival. Gates re-run
at `0466fe3`: identical to the `2be10b4` baseline (93 / 1745 / 1 · 6 / 49 · cc01 1241 at 00322 ·
348 / 2251 / 3688 / 6982 · build clean); node v26 on host-b, no effect.

**Settled this session:** `DECISIONS.md`'s `[open]` build-provenance item closed (`0d0fb2a`) — Phase 4
builds with a Fable orchestrator and Opus workers, per Zarathustrum's 2026-09-01 answer; the Phase 5 Codex footers
stand as a one-off. The plan corrects the dossier in four places and says so (line totals, golden
count, one frame loop not two, sixteen driven lamps not fifteen) and narrows one graft (`PRIORITY ALERT`
omitted, not drawn dark — §12 refuses the feature).

**Next: Zarathustrum's ≤7-bullet gate for Phase 4.** The bullets and the two items the plan flags as his (the
declared spec-sheet fidelity gap, §14 R12; the Selectric-keyboard focus risk with no oracle, §14 R2′)
were posted in-session on 2026-09-02. **The build does not start before his "go."** On "go": a Fable
build orchestrator on `feature/phase-4-period-ui`, seven waves per §11, Opus workers, per-wave Opus
review, per-wave browser screenshot committed under `docs/screenshots/phase-4/`. At merge the orchestrator
turns `DECISIONS.md` line 11 to `[settled]` (Vite) and adds the Phase 4 rulings (§16 item 9).

**Open for Zarathustrum, none blocking:** the plan is 3,367 lines against the kickoff's 1,700-3,200 target
(structure, not compression, if he wants it shorter); the Workflow tool was absent from the host-b
session, so the rounds ran as Agent-tool calls in the same shape (`BUILD-LOG-4.md` mechanism note);
carried forward unchanged from 2026-09-01: `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS`, the
`PB1`/`PB2` contradiction, the carriage straddle (drawn, not fixed, by this plan),
`LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE`, the `exec-bce`/`exec-w` flake. Housekeeping still on
host-a: the detached worktree at `/private/tmp/ibm1410-phase5-whole-review.nrZHUI/tree` (`9305a06`).

## 2026-09-01 (evening) — Phase 5 merged

**`main` at `2be10b4`, the `--no-ff` merge of `feature/phase-5-rpg` (`cd1cc64`). NOT YET PUSHED — Gitea
unreachable from host-a at merge time; Zarathustrum pushes.** Gates re-run on `main` after the
merge: typecheck clean · 93 files / **1745** tests / 1 named skip / 0 fail · smoke 6 files / 49 · cc01
byte-identical (CC01A, CC01 COMPLETE, check at 00322, 1241 instructions) · page golden 348 bytes · listing
golden 2251 bytes · RPG page golden 3688 bytes · RPG listing golden 6982 bytes. A `git merge-tree` dry run was
conflict-free beforehand. Record: seven waves + whole-branch review in `docs/BUILD-LOG-5.md`; 36 OPEN
constants in `PHASE-5-NOTES.md` §1; dated Phase 5 section in `docs/research/open-questions.md`; `DECISIONS.md`
2026-09-01. Landed: `src/rpg/**` (20 modules), `src/ui/rpg/**`, `tools/rpg.ts`, 24 test files, three demo decks
+ five stress decks, three page goldens + one listing golden. `demos/sales-summary.rpg` generates 254 Autocoder
cards that assemble to the same object records as the 270-card hand target and print the frozen page.

**Build provenance.** The three plan commits are Claude Code (`opus-5`); every build commit from wave 0 through
the closeout carries an OpenAI Codex footer (`gpt-5` waves 0-1, `gpt-5.6-sol` from wave 2). `CLAUDE.md`'s model
policy still reads Fable orchestrator / Opus workers — `[open]` in `DECISIONS.md` for Zarathustrum.

**Next: Phase 4, the period UI** (`architecture.md` §6: Selectric log, MODE rotary, display/alter dialogue, 1402
card viewer, 1403 green-bar; the internals view becomes a tab). Plan doc first through the design-panel
workflow, then Zarathustrum's ≤7-bullet gate. Phase 4 consumes `ConsoleLine[]`, `PrintEvent[]`, `Deck` and makes no core
changes; `PHASE-5-NOTES.md` §4 lists what Phase 5 hands it (the unstyled RPG block, the parser-backed per-sheet
ruler as the spec for the drawn forms). Then Phase 6, which must show the RPG generator can *omit* control-break
machinery for a trajectory table.

**Open for Zarathustrum, none blocking:** (a) `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS` `[unverified]`; (b) the
`PB1`/`PB2` column-binary contradiction; (c) the carriage straddle the cycle probe observed (form line 59 → 61
across the channel-12 punch at 60; `CARRIAGE_SENSES_AT_DESTINATION_ONLY`) and `LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE`;
(d) the model-policy wording above. Housekeeping: a detached review worktree at
`/private/tmp/ibm1410-phase5-whole-review.nrZHUI/tree` (`9305a06`) is still registered — `git worktree remove`
when nothing runs there. Non-blocking, long-standing: the `exec-bce`/`exec-w` timeout flake under parallel load.
An orientation doc for this state is at `docs/orient-ibm-1410-project-state.html` (untracked; Zarathustrum's to place).

## 2026-08-31 / 09-01 — four escalated findings closed, I/O syntax flipped, Phase 5 plan gate-ready

**`main` at `61bcd00`+, pushed, clean.** Gates green: typecheck clean · 71 files / **1494** tests / 0 fail ·
smoke 39 · cc01 byte-identical (1241 instructions, check at 00322) · page golden 348 bytes · listing golden
2251 bytes. Commits: `b65fc3b` `[IO]` loader comment `BA1 *+7` -> `*+1` · `9fc0dc9` `[Research]` `RW#` out of
`opcodes.md` §2 row 207 and `table.ts`, `WM#` confirmed as shipped · `303cb64` `[Asm]` period-correct
Autocoder I/O syntax · `61bcd00` `[Docs]` STATUS.

**All four findings Phase 3 escalated are closed**, each on a primary source read first-hand. The re-read
succeeded on C28-0309-1 (pp.41-58) and A22-0526-3 (Figure 107, pp.101-105), so nothing was annotated-only.
Figure 107 is where the project's `#` notation comes from, and it explains the error: it gives each I/O family
ONE row reading "M or L" with a generative `w` = "W if WM (load mode)" suffix, so splitting those into separate
`L` and `M` rows duplicates the load-mode name — that is how `RW#` reached row 207. `WM(#)°` has no `w` and no
`L` alternative, so `WM#` was never a load-mode form. The fourth, `IO_OPERAND_IS_XCONTROL_BADDR_D`, was retired
and shipped: the mnemonic supplies channel, device, mode and d; the programmer writes the stacker pocket and
the B-address (`R1W 0,LINE,$`, `W1 LINE`). **Zero assembled bytes moved** — object deck byte-identical at 539
bytes, verified against a detached worktree at HEAD. Reasoning in `DECISIONS.md`.

**Next: Zarathustrum's go on Phase 5.** The plan is `docs/plans/phase-5-rpg.md` on **`feature/phase-5-rpg` (`c80c668`,
pushed)** — 3,168 lines, **`ready-with-notes`, gate-ready, zero blockers**. Design panel (3 Opus architects,
3 judges; cycle-first won 484/422/411) then four review rounds; every round's findings verified closed, three
residual majors applied by the main session. The seven bullets are §"The seven bullets" at the head of the
plan; `docs/BUILD-LOG-5.md` on that branch records the arrival, what the review caught, and the target draft's
real assembler figures. **On "go", the build orchestrator (Fable subagent, Opus workers) starts at wave 0.**
Build order after Phase 5: period UI (4) -> reentry (6).

**Open for Zarathustrum, neither blocking:** (a) `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS` `[unverified]` — the
one exception the I/O flip carries; C28-0309-1 p.21 reads as permitting a programmer-written d, pp.23-24 and
p.41 as forbidding it on a unit-record statement, and no worked example in three manuals tests it. Fallback:
coin a card analogue of `RTG`/`RTGW` (p.49), IBM's own grammar for reaching `$`. Phase 5 does not lean on it —
its generated reads take the family's baked d. (b) The `PB1`/`PB2` column-binary contradiction: C28-0309-1
p.48 prints `M %80` where `io.md` records column binary as a `[verified]` negative for the 1410, and
`X2_DEVICE` has no `8` row.

**Carried into the Phase 5 build:** two `§8.2` emission rows the closure check asked for and the main session
did not add — a plain `F`/`B` field entry with neither `Z` nor an edit word, and a `PAG` field source's runtime
behaviour. Both are visible in §10.4's target; wave 5 generalises from it rather than transcribing it.

**Non-blocking, long-standing:** the pre-existing `exec-bce`/`exec-w` timeout flake under parallel load
(Phase-1 tests, nobody owns it); the Phase-2 OPEN divergences (`CARRIAGE_SENSES_AT_DESTINATION_ONLY`,
`LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE`).

**Process note.** The review earned its cost: it caught a plan section claiming real assembler output for a
program that did not exist, spec cards punched nine columns off the plan's own layout, a lint that would fire
on the generator's own label, a `?` that prints `&`, a message corpus miscounted and wired into a gate, and a
memory map whose print area sat 22 positions inside the card image while every gate read green (`DA`/`DS` emit
nothing, so no assembler check can see an overlap). Its weakness is arithmetic drift in a 3,000-line document
— one count was wrong in three consecutive rounds — so sums must be done explicitly and cross-checked against
a second enumeration, never restated.

## 2026-08-31 — Phase 3 merged

**State:** Phase 3 (the standalone C28-0309-1 Autocoder cross-assembler) merged to `main` as `236f39f` and pushed. Six waves on `feature/phase-3` (4606618 · 85e177d · 1e5c1ad · e5903c1 · f6dd15f · 1ab7ac9), each Opus-reviewed with fixes before commit; independent whole-branch review verdict MERGE, three minors applied (`f631c08`); exit criterion 11b run in Chrome by the main session (sample → ASSEMBLE → PUNCH INTO HOPPER → the Phase-2 operator sequence → five lines on the green bar). Gates on `main`: typecheck clean; **71 files / 1494 tests / 0 fail** (1486 before the 2026-08-31 I/O-syntax flip); smoke **39** (was 17); cc01 byte-identical (CC01A, CC01 COMPLETE, check at 00322, 1241 instructions); `npm run demo` page golden 348 bytes; `npm run asm -- demos/hello-dad.asm --listing --golden test/golden/hello-dad.lst` 2251 bytes (constructed, labelled). `src/asm/**` (11 modules), `src/ui/autocoder/**`, `tools/asm.ts`, `demos/hello-dad.asm`, 14 test files; the assembled hello-dad deck loads through the real condensed loader and 1402 and prints the untouched Phase-2 page golden. Record in `docs/BUILD-LOG-3.md`; 25 OPEN constants and 24 deviations in `PHASE-3-NOTES.md`; dated Phase 3 section in `docs/research/open-questions.md`. One orchestrator death (API auth expiry mid-wave-5), resumed with nothing lost.

**Next:** Phase 5 — RPG (`spec sheets → SourceCard[]`, host-side, macro-free open-coded Autocoder per `PHASE-3-NOTES.md` §4) — plan doc first, per the phase gate; build order after that: period UI (4) → reentry (6). **Open for Zarathustrum:** (a) the Phase 5 plan itself, at its ≤7-bullet gate — the design panel ran in the FULL Phase-3 shape (3 Opus architects → 3 judges → synthesis → 2 skeptics), taken on Zarathustrum's "do what's best" rather than the trimmed "skeptic-then-verify, no judges" shape he had raised as a hypothetical; cycle-first won 484/422/411; (b) whether to accept `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS` as it stands — `[unverified]`, the one exception carried by the I/O syntax flip, and undecidable from C28-0309-1 / A22-0526-3 / C28-0351-5; and (c) the recorded-not-acted-on `PB1`/`PB2` column-binary contradiction (C28-0309-1 p.48 `M %80` vs `io.md`'s `[verified]` negative, and a possibly missing `X2_DEVICE` `8` row). **All four escalated findings are now closed** — `RW#` corrected out of `opcodes.md` §2 row 207 and `table.ts`; `WM#` confirmed as shipped (and its x²/x³ position name fixed); `loader.ts`'s comment fixed to `BA1 *+1`; and `IO_OPERAND_IS_XCONTROL_BADDR_D` **retired, settled against** on Zarathustrum's "do what's best" — the Autocoder I/O statement is now the manual's own (`R1W 0,LINE,$`, `W1 LINE`), the mnemonic supplies x1/x2/d and the programmer writes the stacker pocket and the B-address, 50 generated I/O mnemonics against the old 18, and **zero assembled bytes moved** (`DECISIONS.md` 2026-08-31). Non-blocking: the pre-existing `exec-bce`/`exec-w` timeout flake under load (Phase-1 tests); the Phase-2 OPEN divergences (`CARRIAGE_SENSES_AT_DESTINATION_ONLY`, `LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE`).

## 2026-08-30 (late night) — Phase 3 plan ready, awaiting gate

**State:** `docs/plans/phase-3-autocoder.md` on `feature/phase-3`. Design panel (3 Opus architects — language-/consumer-/demo-first; 3 Opus judges; demo-first won 155/141/139) → synthesis → 2 skeptics, 32 findings (5 blockers, 13 majors) → revision → 3 parallel verifiers (research / engineering / coherence) → consolidated fix → re-verify **ready-with-notes**, five residual minors applied directly by the orchestrator. Demo: `demos/hello-dad.asm` — the Phase-2 hand deck rewritten in real Autocoder at ORG 00500, assembled, loaded through the real condensed loader and 1402, gated on the untouched 348-byte page golden. Scope machine-checked (`asm-pseudo-ops` partitions software.md §6's own table); mnemonics derived from `isa/table.ts` + `dmods.ts` with a both-directions containment test; 6 waves, 14 test files, ~2,080 src + ~536 UI + ~140 CLI + ~1,700 test lines, zero new dependencies. Two research-correction escalations recorded in-plan (`RW#` duplicated across OP_L/OP_M; `WM#` under OP_M though "with word marks" reads load-mode), never silently edited.

**Next:** Zarathustrum's phase gate — the ≤7 bullets + two defaulted decisions (the `deckBox.setText` wiring edit into a Phase-2 UI file; EQU-to-x-control-field ruled out) posted in-session. On "go": Fable build orchestrator on `feature/phase-3`, Opus workers, per-wave ownership, gates at every commit, `/loop 10m status?`.

## 2026-08-30 (night) — Phase 1b and Phase 2 merged

**State:** both parallel builds merged to `main` (`21302e4` Phase 1b, `d5ee440` Phase 2) and pushed. Gates on `main`: typecheck clean; 1099 tests / 0 todo / 0 fail (58 files); smoke 17/17; cc01 byte-identical (CC01A, CC01 COMPLETE, check at 00322, 1241 instructions); `npm run demo` reproduces `test/golden/hello-dad.page.txt` byte for byte (348 bytes). Every table.ts op outside `['U']` is implemented; the full 46-step MCE Figure 34 trace passes; the demo deck loads via the hand-keyed bootstrap and prints on the 1403. Worktrees removed; branches `feature/phase-1b` / `feature/phase-2` kept on origin.

**Next:** Zarathustrum approves starting Phase 3 (the Autocoder cross-assembler, whose object deck feeds the Phase 2 loader) — plan doc first via the design-panel workflow, per the phase gate. Build order thereafter (settled 2026-08-30): RPG (5) → period UI (4) → reentry (6). Open for Zarathustrum, non-blocking: the reviewer-recorded OPEN divergences (`CARRIAGE_SENSES_AT_DESTINATION_ONLY`, `LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE`) if he wants them modelled tighter.

## 2026-08-30 (evening) — Phase 2 built

**State:** Phase 2 (unit record: 1402 reader+punch, 1403 printer+carriage, console inquiry,
the four channel-1 `J` senses, `%21`, card deck text format, object deck + condensed loader)
built on `feature/phase-2`, **rebased onto `main` 21302e4 (Phase 1b already merged)** and
re-verified, awaiting merge. Five waves, five commits (d37d624, 946ef64, 099dc1e, 5283127,
205b2e9; close-out 5892da4 — the pre-rebase hashes this entry used to print are on no branch),
each adversarially reviewed (Opus) with fixes applied before commit, then a whole-branch review
whose findings are applied on top. `npm run typecheck` clean; `npm test` 1099 passed / 0 todo /
0 failed across 58 files; `npm run smoke` 17 passed across 3 files (incl. the gating tier-4 demo
test); `npm run cc01` unchanged (CC01A, CC01 COMPLETE, instruction check at 00322, 1241
instructions, 82543.5 µs); `npm run demo` reproduces `test/golden/hello-dad.page.txt` byte for
byte (348 bytes — the true UTF-8 size; the old 346 was a JavaScript character count) — the
phase's one golden, also verified live in Chrome (paste deck → hopper → READER START/EOF → key
the bootstrap via DISPLAY/ALTER → COMPUTER RESET → RUN → 5-line report, halt at 00076). All
seven §13 exit criteria checked mechanically at close-out. Per-wave record and the gate lines in
`docs/BUILD-LOG-2.md`; every fallback and deviation in `PHASE-2-NOTES.md` (§1 constants,
§2 items 1-28); wave-tagged rows appended to `docs/research/open-questions.md`.

- Highlights: the wave-3 demo gates the phase (headless golden + browser); wave 5 shipped
  BOTH the object-deck format and the condensed loader — the loader is a reconstruction
  (no listing survives) built on the index adder instead of §8.3's self-modifying setup,
  retiring risk R1 outright; reviews found real bugs each wave (an after-print `F`
  double-booking a print line; a `$` read leaking a cancelled inquiry; the loader's EOF
  test masking Not Ready — a one-character machine-code fix).
- Whole-branch review (post-rebase): 1 major behaviour fix — the reader's END OF FILE condition
  survived a new deck, so a second PUT DECK IN HOPPER let the next deck's last three cards
  through without the key (io.md §6 `[verified]`: "the Stop key, or processing the last card,
  resets the EOF condition"); `loadDeck()` now clears key and latch, pinned by test. Plus two
  divergences recorded rather than fixed, each behind a named constant carrying both readings
  and a fix path (`CARRIAGE_SENSES_AT_DESTINATION_ONLY`,
  `LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE`); the stale commit hashes and the never-written
  gate lines in `docs/BUILD-LOG-2.md`; and `PHASE-2-NOTES.md` §1 made exact against the code in
  both directions.
- Worktree: built in `../ibm-1410-p2` (worktree of this repo) on `feature/phase-2`.

**Next:** Zarathustrum reviews `docs/BUILD-LOG-2.md` + the branch, runs `npm test` / `npm run demo` /
`npm run dev`, then merge `feature/phase-2` → `main` (`git merge --no-ff`). Phase 1b is ALREADY
on `main` (21302e4) and this branch is rebased onto it, so the merge closes Phase 2 rather than
choosing between the two. **At the merge commit**, correct `docs/plans/architecture.md` in the
three places plan §16 names (~line 336, ~line 315, ~line 160) — it was do-not-touch for the
duration of the parallel build; `PHASE-2-NOTES.md` §4 carries the list. After merge: the
Autocoder assembler phase, feeding the now-real loader.
## 2026-08-30 (afternoon) — Phase 1b ∥ Phase 2 started

**State:** Zarathustrum chose both in parallel. Worktrees `../ibm-1410-1b` (`feature/phase-1b`) and `../ibm-1410-p2` (`feature/phase-2`) off `main` `669aabd`; deps + oracles installed in each, 741 / 10 todo / 0 fail in both. Plan docs in flight, all Opus: `docs/plans/phase-1b.md` (one writer → research + engineering skeptics → one revision) on the 1b branch; `docs/plans/phase-2-unit-record.md` (design panel: 3 architects → 3 judges → synthesis → 2 skeptics → revision) on the P2 branch. Each plan carries a file-ownership list and a do-not-touch list so the two builds cannot collide.

**Next:** Zarathustrum approves both ≤7-bullet summaries in one message → one Fable build orchestrator per worktree (per-phase `docs/BUILD-LOG-1B.md`/`PHASE-1B-NOTES.md` and `docs/BUILD-LOG-2.md`/`PHASE-2-NOTES.md`; `npm test` green and `npm run smoke` PASS at every commit) → merge 1b first (`--no-ff`), rebase and merge P2, correct `docs/plans/architecture.md` ~line 336 at the P2 merge, remove the worktrees.

## 2026-08-30 (later) — Phase 1 merged

**State:** Phase 1 (CPU core + Channel 1 + 1415 console + internals page) merged to `main`. 741 tests / 10 todo / 0 fail; `npm run smoke` runs CC01A to completion (`CC01A`, `CC01 COMPLETE`, instruction check at 00322). Phase 1b (`@ % T Z E` executors) and Phase 2 (cards, 1402, 1403, console inquiry, loader) are both unstarted.

- Build: Fable build-orchestrator subagent, Opus/Sonnet workers, ~3.3 h wall clock, 36 commits on `feature/phase-1-cpu-core`; per-wave log in `docs/BUILD-LOG.md`, deviations and OPEN fallbacks in `PHASE-1-NOTES.md`.
- Final review verdict: MERGE WITH FIXES — 1 epistemics finding (emulator observation tagged `[verified]` → new `[observed]` tag), 4 major, 8 minor; all applied before merge. Zero column errors found in `isa/table.ts` vs `opcodes.md` §2.
- Decision made on merge (Zarathustrum can veto): cc01 PASS rule is `CC01A` → `CC01 COMPLETE` → instruction check at 00322; the plan's 08980 marker is unreachable code (static operand scan, `[verified]`).

**Next:** Zarathustrum decides Phase 1b (Multiply/Divide/Table Lookup/MCS/Edit against the insttest `@`/`%` blocks and the 46-step MCE trace) vs Phase 2 (cards/1402/1403 — what makes the first showcase possible). Recommendation: Phase 2 first — nothing on the RPG or reentry path needs `@ % T Z E` until a program uses them, and Phase 2 is what a period reader can see. Then the plan doc for that phase via the same design-panel workflow.

## 2026-08-30 — Phase 1 built

**State:** Phase 1 built on `feature/phase-1-cpu-core`, awaiting merge. Thirty-four commits
from `main` (04605e3): scaffold, Waves 0-7, the internals page, four adversarial
reviews with their fixes, the cc01 halt archaeology. `npm run typecheck` clean; `npm test`
741 passed / 10 todo (`@ %` Phase 1b entries) / 0 failed across 42 files; `npm run smoke`
(tier 4, which plan §7 says must not gate) 5 passed; `npm run cc01`
PASS (`CC01A`, `CC01 COMPLETE`, instruction check at the relocated read-in hole 00322 —
1241 instructions); `npm run dev` serves the internals page with the console controls
(demo 2, the half-cycled add, driven by clicks in Chrome). Per-wave record in
`docs/BUILD-LOG.md`; every `[unverified]` fallback hit and every plan deviation in
`PHASE-1-NOTES.md`. Research corrected in place where the build proved it wrong
(charset.md rank 35 C bit and the group-mark glyph; emulators.md §4.4's exit path —
the `J 01972` at 08980 is on no executed path).

**Next:** the main session reviews `docs/BUILD-LOG.md` and the branch, then merges
`feature/phase-1-cpu-core` into `main` (`git merge --no-ff`); Zarathustrum runs `npm test`,
`npm run cc01`, `npm run dev` and approves Phase 2 — or Phase 1b first (`@ % T Z E`;
note PHASE-1-NOTES §4: `addToStorage` needs a `{ bUnits, positions, writeSign }` primitive
before multiply/divide). Also queued for Phase 1b, from the final review: **machine-check
`isa/table.ts`'s prose columns against `opcodes.md` §2 at test time** — `semantics`,
`terminatesOn` and the d-modifier maps are transcribed by eye today, and the table is only
worth diffing against the research if drift is caught by the suite rather than by a reader.

## 2026-08-29

**State:** research done; Step 0 answered; architecture + Phase 1 plan written and adversarially reviewed (`docs/plans/`); awaiting Zarathustrum's approval of the Phase 1 bullets. No code yet.

- Research: run 1 (Fable subagents) verified 7 of 8 topics before hitting a session limit; results preserved in `docs/research/raw/`. Run 2 (all Opus, 30 agents, 0 failures, ~108 min) researched the opcode table in two verified parts, closed 8 critic gaps, and wrote all ten `docs/research/*.md`. The critic's 12 cross-file contradictions are listed in `open-questions.md`; a ruling→apply→verify consistency workflow (Opus) resolved them in place (11 verified rulings, 1 likely); see `METHOD.md`. Provenance in `docs/research/METHOD.md`.
- Step 0 answered: RPG from the start; functional but inspectable; KISS peripherals; period-accurate UI; no artifacts; RPG report maybe first showcase; run local + Gitea. Judge-panel design (core-first 119 / pipeline-first 117 / oracle-first 111; winner core-first with grafts) produced `docs/plans/architecture.md` and `docs/plans/phase-1-cpu-core.md`; two adversarial reviewers raised 31 findings (5 blockers), all applied in one revision. Closed since: C17 ruled from the manual (`$` legal on a card read; research files corrected; `open-questions.md` #13). 1410 RPG spec-sheet sources found (`docs/research/rpg-sources.md`: shared 1401/1410 forms, verified layout; 1410 RPG processor object code survives on the PR-108 tape image). Still Zarathustrum's: Phase 1b split of `@ % T Z E`; RPG-first showcase order (research now supports it).
- Git initialized 2026-08-30; first commit = docs; pushed to the private Gitea repository.

**Next:** Zarathustrum approves the Phase 1 bullets (top of `docs/plans/phase-1-cpu-core.md`) → scaffold repo (Vite/Vitest/TS strict) → Opus subagents implement Wave 0 onward per the plan.
