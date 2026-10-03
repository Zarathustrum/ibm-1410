# BUILD-LOG-4 — Phase 4, the period UI

**STATUS:** BUILD COMPLETE — Zarathustrum's "go" on 2026-09-02; waves 0 through 6 committed on
`feature/phase-4-period-ui` (wave 5 split into 5a and 5b by Zarathustrum's ruling); the branch awaits the
main session's whole-branch Opus review, criterion 19's human walk, and the `--no-ff` merge, at which
`docs/DECISIONS.md` and `docs/STATUS.md` are updated by the main session and never by a wave. A Fable build orchestrator with every worker on Opus (`CLAUDE.md` § Model policy).
From wave 1 each wave's section lands in the wave's own single commit, so wave headings carry no SHA
— `git log` does; wave 0's `4932bee` was recorded by a follow-up commit the build has since stopped
making.

## Arrival — 5f98c23 (the plan, on feature/phase-4-period-ui)

The plan is `docs/plans/phase-4-period-ui.md` (3,367 lines; sixteen sections mirroring
`phase-3-autocoder.md` and `phase-5-rpg.md`). It arrived through a design panel on `host-a` and
three review rounds on `host-b`, all Opus workers under the model policy, the main session
(Fable) integrating and ruling.

**Design panel** (`wf_b43127ed-583`, 2026-09-01, host-a; 7 Opus agents, 1.73M tokens, ~54 min,
0 errors) — three architects proposed independently from distinct angles (operator-first,
paper-first, reuse-first); three judges scored them on period fidelity, buildability and
testability. **paper-first won 480 / 451 / 440** — the only proposal with no last place, because
every judge ranked a different design first (buildability → reuse-first 166, testability →
paper-first 172, fidelity → operator-first 163). Its case: the paper is the spine and the paper is
arithmetic — no number is computed in a file that touches the DOM — which is the only mechanism
anyone proposed that makes hand-drawn SVG testable in node without jsdom. Grafted from the losers:
operator-first's detent rule (`PeriodMode` with one narrowing function, `S` through
`machine.stop()` on the two UI-only detents), its `lampsOf` with `source: null` as a typed
"not modelled", and the four named 1401 refusals; reuse-first's slice-the-research-at-test-time
oracle for the Exhibit II log, its both-directions light-panel diff, its two drift guards, its
`base: './'` build fix, and its identity-not-green wave-0 oracle. Sixteen grafts, eight rulings,
twenty factual corrections, thirty ledger rows, nine completeness-critic items — rendered to
`docs/plans/phase-4-panel-dossier.md` at `eed111f` so the work could move machines.

**Plan drafting** (host-b, 2026-09-01) — the main session wrote §0-§3 as the spine and a rulings
note; four Opus drafters wrote §4-§6, §7-§10, §11-§13 and §14-§16 in parallel against it; the
main session integrated (`d4bcfdc`). Two corrections to the dossier's own bullet 7 were made in
the plan and itemised there (the line totals; the golden count), plus one ruling against the
dossier's internal contradiction on the frame loop (one loop, not two).

**Review — round 1, two Opus skeptics.** The research skeptic: needs-revision, **3 blockers / 8
majors / 9 minors**, applied in `3361368`. The engineering skeptic (its first run was stopped before
it wrote; Zarathustrum chose a fresh re-run over folding the lens into round 2): needs-revision, **5 blockers
/ 12 majors / 15 minors**, applied in `cfbcd0e`. **Round 2, three Opus verifiers** on `cfbcd0e`:
every round-1 item closed — 32 of 32 engineering, 20 of 20 research, zero regressed — and new
findings of **1 blocker / 4 majors / 13 minors** (engineering: the DOM-free import rule forgot that
five `?raw` sample imports resolve to `demos/`), **0 / 2 / 9** (research: an `io.md` section number;
`POWER` and `READY` given a `source: null` field only panel lamps have) and **3 / 11 / 13**
(consistency: three §3 rows citing §4 blocks by stale numbers; criterion 18a carried by no test file
— now `test/period-refusal-grep.test.ts`, the seventeenth; criterion 19 asking for six `S` lines from
a walk that produces four), applied in the consolidated fix `0466fe3`. **Round 3, one Opus
re-verifier** over the whole document: all 56 round-2 findings closed, none regressed, no stale copy
of any moved count — **verdict `ready-with-notes`, zero blockers**. Three residual majors and seven
minors applied directly by the main session in `5f98c23`, per the Phase 3 and Phase 5 precedent:
wave 5's two intra-wave specifier edits named; criterion 18a's grep made case-sensitive over whole
label tokens with comments and headers out of scope (so `CLOCK` and `END OF FORMS` cannot collide
with `clock` and `ms`); the wave-5 split naming all four wave-5 tests; `LIT_CONSTANTS` reaching the
wave oracles; COMPUTER RESET in the power/control cluster; `mountConsole`'s signature written.

**What the review caught, in order.** From the research seat: the light panel drew two of
architecture.md §12's five refusals — CH1's OVERLAP IN PROCESS / NOT OVERLAP IN PROCESS and PRIORITY
ALERT — on a panel-versus-feature distinction the dossier had made and the research does not (the
lamps are now omitted; one dossier graft narrowed); a turn of the rotary to DISPLAY or C.E. typed
the `S` line but never stopped the CPU, because the two UI-only detents leave `machine.mode` at
`'run'` and nothing in the session could reach the frame's run latch (a `halt` hook, and the gate
reads the session's detent); a backspace key on the 1415 keyboard that S223-2648 p.78 says cannot be
commanded (withdrawn — INQ CAN is the correction); `?`-on-H upgraded from `[likely]` to `[verified]`
where the restrike's exactness rests on it; the Fig.60 strip miscounted at fifteen entries when it
is seventeen; the spec-sheet columns mis-tagged `[unverified]` in the argument put to Zarathustrum's gate,
when only the artwork is undocumented; the interpretation band attributed to the 1415's typeball
with no source (now a ledger row); and the phase oracle byte-gated on `PRINTED_BLANK`, whose own
declaration says nothing downstream may key on it (now the inherited-constant row the oracle
depends on). The Exhibit II oracle itself was rebuilt by the reviewer through `printout.ts`'s own
logic and held byte for byte.

From the engineering seat: RULE 2 broken twice more than the two the plan had repaired — wave 3
deleted `cardView.ts` and `deckBox.ts` while `period/autocoder/objectDeckView.ts` and
`period/autocoder/mount.ts` still imported them (wave 3 now owns both edits); wave 0's `main.ts`
imported a stylesheet wave 5 creates, which typecheck does not catch and `vite build` does (wave 0
now creates the stub); wave 1's DOM-free test carried required-path cases for three files waves 4
and 5 write (the test now grows by named appends, the one carve-out from the no-append rule); three
oracles instantiated `*View.ts` files in a jsdom-free node run (all three re-aimed at the DOM-free
modules, and `PRINT_POSITIONS` declared independently in `page.ts` so the 132-character rule is a
`paginate` property); and "exactly two cross-surface imports" was false from wave 0 because thirteen
moved files import `make` from `internals/panel.ts` (wave 0 now swaps them to `period/dom.ts`, an
import-specifier change inside the identity oracle). Among the majors: the free oracle written three
ways with the exit-criterion version off by one byte per form break; a `halt` hook with no `run`
hook, so the period START key could never start the frame; a frame gate that dropped the
`machine.mode === 'run'` guard while the frozen `controls.ts` `<select>` can still move the mode;
nothing focusing the console region after START; and the `?raw` "duplicate declaration fails
typecheck" claim, measured false on `tsc` 5.9.3 — retracted, with `npm run build` in the gate as
the real mitigation. The wave-0 identity oracle was executed for real on a scratch clone with all
sixteen renames applied: it prints nothing, detects every rename at 91-98% similarity, and prints an
injected body line.

**Mechanism note.** The Phase 5 panel and reviews ran as Claude Code Workflows (`wf_…` run ids
with a `journal.jsonl`). On host-b the Workflow tool was not present in the session's toolset, so
the drafting and the review rounds ran as parallel Opus Agent-tool calls in the same shape — four
drafters, two skeptics, three verifiers, one re-verifier, two revisers — with `model: 'opus'` on
every seat. The findings and their resolutions are recorded here, as `docs/BUILD-LOG-5.md` records
Phase 5's; the raw reports stayed in the session's scratchpad, as Phase 5's stayed in its workflow
journals.

**Baseline gates on host-b at `b7c60b3`, before a line of the plan was written (2026-09-01
21:58 PDT), and re-run at `0466fe3` with identical numbers:**

```
npm run typecheck                                            clean
npm test                                                     93 files, 1745 passed, 1 skipped
npm run smoke                                                6 files, 49 passed
npm run cc01                                                 PASS · CC01A · CC01 COMPLETE ·
                                                             instruction check at 00322 ·
                                                             1241 instructions
test/golden/hello-dad.page.txt                               348 bytes
test/golden/hello-dad.lst                                    2251 bytes
test/golden/sales-summary.page.txt                           3688 bytes
test/golden/sales-summary.lst                                6982 bytes
npm run build                                                clean (dist/index.html 2.42 kB,
                                                             assets/index-IerEAi40.js 258.20 kB)
```

Identical to `main` at `2be10b4` on host-a. Environment differs from host-a and did not matter:
node `v26.0.0` / npm `12.0.2` (host-a `v20.19.5` / `10.8.2`); `npm ci` warned that `fsevents`'s
install script was blocked by `allowScripts`, which is harmless here.

**Measured for §12.2's oracle-count rule:** with `oracles/` absent and `ALLOW_MISSING_ORACLES=1`,
`npm test`'s suite reports 87 passed / 5 skipped / 1 FAILED files (`test/tier3-index-exec.test.ts`
fails outright), 1649 passed / 93 skipped tests; smoke 4 passed / 2 skipped files, 44 / 5. Without
the flag, `test/oracles-present.test.ts` fails red. A wave gate is never run under the flag.

**Two things the plan flags as Zarathustrum's, not the plan writer's** (§14 R12, §14 R2′): the spec sheets
and coding sheet stay `<textarea>`s in a drawn frame — the columns are `[verified]`, the artwork is
not digitised, and the refusal stands on the artwork alone; and the Selectric keyboard shares a page
with three `<textarea>`s, which is designed against (the console region owns `keydown`, a grep
enforces it, a focus contract on unlock) but which no oracle can see. Both are for the gate.

## Wave 0 — the move, the shell, the freeze, the build fix — commit 4932bee

**What landed.** Sixteen `git mv`s — `src/ui/{unitrecord,autocoder,rpg}/` into `src/ui/period/` —
with the only content change inside a moved file being import specifiers under §3.1's seven
rewrites, the seventh pointing all thirteen `internals/panel.js` importers at the period surface's
own `period/dom.ts` (new, 77 lines: `make` / `cell` / `row` / `table` / `View` at `panel.ts`'s
signatures, plus `box` / `svg` / `text`). The three `?raw` shims merged into `period/raw-import.d.ts`
with `declare module '*.css';` added. `src/ui/main.ts` (94) is the page: one `createMachine`, the
two-tab shell (MACHINE ROOM default, INTERNALS), and the page's one animation frame in its wave-0
form — execute on `running && machine.mode === 'run'`, render the internals `View` on `dirty` —
with `period/unitrecord/mount.ts`'s own rAF untouched, so `requestAnimationFrame(` is in two files
until wave 3, as §10.2 says. `src/ui/internals/mount.ts` (77) carries the old `internals/main.ts`
body and the `View` adapter, both halves: an `undefined` redraw message renders as nothing, and the
three-space separator keeps the note off the MODE label. `internals/main.ts` deleted.
`src/ui/styles/period.css` is a five-line stub owned by wave 5. `index.html` holds `#machine-room`
and `#internals` inside `#app`, points its script at `main.ts`, and scopes exactly the seven
internals-only selectors under `#internals`. `vite.config.ts` gains `base: './'`.
`test/ui-controls-verbatim.test.ts` pins `controls.ts` at its SHA-256. Four test import lines moved
with their prose mentions. `docs/screenshots/phase-4/README.md` creates RULE 4's directory.

**The identity oracle, all four checks.** (a) The rename diff over the six moved trees, minus
`from '../` lines, prints nothing; the sixteen `wc -l` are unchanged at 127·171·83·94·156·97·78 /
110·85·70·61·161 / 59·70·55·104; per-file churn is 2-10 lines, every one an import;
`'../../internals/'` survives on the one line §3.1 names. (b) `controls.ts` at
`a6d90f54…f318f`; `--numstat` zero over `controls`, `panel`, `coreView` and `registerView`. (c) The
counts below, with `oracles/` present. (d) `npm run build` clean, `grep -c 'src="\./assets'
dist/index.html` = 1 (the CSS `href` is relative too), `dist/` 256 kB.

**Where the build decided what the plan left open, or blocked.** (1) `test/ui-controls-verbatim.test.ts`'s
second case pins SHA-256 for `coreView.ts` and `registerView.ts` instead of spawning
`git diff --numstat`: `tools/node-shims.d.ts` declares no `node:child_process` and `tools/**` is
do-not-touch, so the test cannot shell out without a forbidden edit; the numstat stays as the
orchestrator's per-commit gate command (criterion 3). `panel.ts` is not pinned because wave 1 folds
it. (2) The tab bar carries no class literal — two bare buttons, the active one marked inline — so
wave 5's class-coverage test owes it no rule. (3) `dom.ts`'s `box()` is a `fieldset`/`legend`,
unused at wave 0; no period file creates either element, which is what makes scoping both under
`#internals` a no-op. (4) `index.html` is 47 lines, not ~55; the `<title>` is `IBM 1410`, an
unlisted one-word edit named here. (5) The run latch is behaviourally equivalent to the deleted
loop: `controls.ts:97` calls `run()` only in RUN mode and every mode change calls `halt()` first, so
`running && machine.mode === 'run'` is the old loop condition; the one difference is a redraw
deferred to the next frame, which §10.2 mandates. (6) `raw-import.d.ts` is 49 lines against ~30
because it carries the measurement record §3.1 asks for.

**A number in the plan the build corrected.** §3.1 and §10.6 item 1 say duplicate ambient
`declare module '*.cards?raw'` blocks exit 0 on this toolchain. Review re-measured: they exit 0
BECAUSE `tsconfig.json:22` sets `skipLibCheck: true`; without the flag they are `TS2300: Duplicate
identifier 'text'`. The shipped shim's claim was right about the merge and wrong only about the
flag; the merged shim's header now says so.

**The bounded primary read (§11.1): two attempts, four targets reached.** A22-0526-3 (14,511,698
bytes, SHA-256 `8142a72d…e58273`) and S223-2648 (35,614,952 bytes, `c7b642e6…d6495a`), fetched
from bitsavers with a browser User-Agent (the site returns 403 to curl's default — a UA block, not
`absent`), neither with a text layer, read visually at 110-600 dpi. **(b) READ.** Fig.47 p.49 is a
schematic with no ticks; S223-2648 Fig.2 p.7's photograph carries six index dots measuring
0.0 / 58.3 / 119.6 / 180.0 / 238.6 / 301.3° — 60° spacing within 1.7°, RUN at twelve, order as §3 —
so `ROTARY_ANGLE` stands and wave 4 may cite the geometry as measured off a primary photograph,
with the caveat that no page prints the degrees. **(c) READ.** Fig.3 p.8 shows seven framed boxes
and 103 lamp positions (CPU 49, STATUS 6, CH CONTROL 12, CH STATUS 12, SYSTEM CHECK 15, POWER 5,
SYSTEMS CONTROLS 4), the POWER legends illegible in that scan and read from A22-0526-3 Fig.54 p.55;
§8.2's 103 − 18 = 85 holds against the figure. **(a) READ, stays `[likely]`.** Fig.5's column is
`Matrix Pos ID Char` with bare 30/35; p.6 says the ID character "prints in position 1", which rules
out a paper-column reading and leaves a matrix index with unpublished origin — `matrixPos − 30` is
the right shape. **(e) READ, RECORD ONLY.** S223-2648 p.6 — "a program stop, an error stop, the
stop key, or any cycle step, will initiate a stop print-out" — contradicts `HALT_TYPES_NO_PRINTOUT
= true` (`machine.ts:65`); a core constant behind a byte-pinned cc01 transcript, so Phase 4 records
it for a later phase's escalation. **(d) NOT REACHED** — the two-attempt budget was spent on the
two documents covering four targets. Two observations for an escalation commit, not applied: §5's
"left-to-right" implies one row, and Fig.3 stacks POWER over SYSTEMS CONTROLS beside a full-height
SYSTEM CHECK (order right, row implication wrong — wave 4's `lightsView` draws the stack); and the
CE panel is silkscreened "SYSTEMS CONTROLS" where A22-0526-3 Fig.55 prints "SYSTEM CONTROLS", which
§5 follows. **[Closed 2026-09-03 — Zarathustrum ruled "go with the photograph". §5 now reads SYSTEMS
CONTROLS, applied as an escalation commit that moved the research file, `console/lamps.ts`,
`console/lightsView.ts` and two test files together, because the panel test slices §5 live in both
directions. The row-implication observation needed no action — wave 4 had already drawn the
stack.]** The full record is `open-questions.md`'s new `## Phase 4 — 2026-09-02` section (122
lines against the plan's ~30, kept whole for its citations); the PDFs and every render stayed in
the session's scratchpad.

**The browser look — deferred.** No Chrome extension is connected to this account from any device,
so the "identical to `main` except two tabs" look could not be taken from the build orchestrator's
seat. Verified structurally instead under `npm run dev`: the served page carries `#app` →
`#machine-room` + `#internals`, `main.ts` transforms, and the stub stylesheet and every moved mount
resolve (all 200). The look is the main session's to take.

**Adversarial review (Opus): APPROVE-WITH-FIXES — no blocker, no major, four minors.** Two applied
before the commit: the shim header's measurement now names `skipLibCheck` (above), and a comment
line carrying a literal `from '…'` was reworded so wave 1's import matcher cannot misread it. Two
are notes: the `<title>` edit and the line counts (new `src/` 290 against 275, +5%; deletions 76 in
four files, exact; the stub 5; the test 43). The reviewer independently re-ran (a)-(d), read all
329 diff lines of the sixteen renames, and confirmed the frame's behaviour against the deleted
loop, the `#internals` scoping's safety, and the cross-surface import count of one.

**Gates (final wave-0 tree, `oracles/` present, all green):**

```
npm run typecheck                                            clean
npm test                                                     94 files, 1747 passed, 1 skipped
npm run smoke                                                6 files, 49 passed
npm run cc01                                                 PASS · CC01A · CC01 COMPLETE ·
                                                             instruction check at 00322 ·
                                                             1241 instructions
test/golden/hello-dad.page.txt                               348 bytes
test/golden/hello-dad.lst                                    2251 bytes
test/golden/sales-summary.page.txt                           3688 bytes
test/golden/sales-summary.lst                                6982 bytes
npm run build                                                clean (dist/index.html 2.92 kB,
                                                             assets/index-BgriRmb7.js 251.15 kB)
grep -c 'src="\./assets' dist/index.html                     1
```

## Wave 1 — the paper and the console, DOM-free — and the phase oracle

**What landed.** Five DOM-free modules that own every number the page will draw, and not one
view: `paper/page.ts` (139 — `FormPage`, `paginate`, `trimRule3`, `PRINT_POSITIONS` and
`LINES_PER_BAR` carried from `printerView.ts:28` / `:35` with their comments, importing two types
and nothing from `printer1403.ts`), `paper/carriage.ts` (129 — `traversed`, `straddled`,
`STRADDLE_BANNER`), `paper/chain.ts` (76 — `CHAIN_DUALS`, `restrike`), `paper/cardGeometry.ts`
(184 — `CARD_GEOMETRY`, `holePath`, `outlinePath`, `bandGlyphs`, from `cardView.ts:32-53` with
the "1415 typeball" attribution withdrawn in its header), and `console/selectric.ts` (133 —
`toSelectric`, `renderSelectric`, the two combining marks with their four-line citation carried
from `panel.ts:61-64`). The `panel.ts` fold: lines 61-75 deleted, one import added, the call at
145 rewritten to `renderSelectric(s.console, { matrix: 'flush', marks: 'render', spacing:
'render' })`. Six tests (1,022 lines) and the phase's one new golden file,
`test/golden/card-face-a.svg.txt` (33,450 bytes; header CONSTRUCTED). Nine §15 rows land in
`open-questions.md`'s `### Wave 1` subsection, every one with its `// OPEN:` comment and an
exported declaration at the point of use, and **the ledger is FROZEN from the close of this
wave**: a later `// OPEN:` is a deviation for `PHASE-4-NOTES.md` §2.

**The four checks of §11's wave-1 row.** **(a) The Phase-4 oracle.** `test/period-selectric.test.ts`
slices the fence at lines 59-79 of `console-and-physical.md` at test time, drops `D bbbb...` by
name in its header, builds the eighteen remaining lines through `formatPrintout` with §2's
layout-table fields, and matches `renderSelectric(lines, { matrix: 'flush', marks: 'strip',
spacing: 'ignore' })` byte for byte — on the first run. The marks, spacing, matrix, slashed-zero
and blank-versus-`b` rules are separate named cases, plus one that pins `{ flush, render,
render }` to the deleted `renderConsoleLine`'s bytes over a corpus, which is what makes the fold
an identity and not a claim. **(b) The free cross-check.** §5.1's identity — `renderGreenBar(paper,
{ chain: 'A', formLines: 66 })` against the header plus the trimmed, `\f\n`-joined `paginate` —
holds for `hello-dad`, `sales-summary` and `cycle-probe`, each re-run through the real loader,
1402 and 1411 and each re-run page also asserted equal to its golden; the synthetic three-form
paper carries form 2's blank `PrintLine` at line 1; every `FormPage.lines` entry is 132; the
two-lines-at-one-position throw is pinned against `renderGreenBar`'s own message with the prefix
swapped; `page.ts`'s only import specifier is `../../../core/types.js`, read off the file. **(c)**
The restrike bijection holds both ways for all 64 codes against the shipped `chainGlyph`;
`CHAIN_DUALS` equals charset.md §5's table sliced from the research file; no second chain table
under `src/ui/**` (the detector is proved to fire on a seeded source) and no `paper/chain` import
under `src/asm/**`. **(d)** The card-face golden is byte-identical through `cardGeometry.ts`,
`holePath` agrees with `punchMask` for every punchable code, and §12.1's geometry invariants hold.
`npm run cc01` is byte-identical after the fold — evidence now, and not only a gate.

**Two numbers in the plan the build corrected.** (1) §3.2 and §13 criterion 3 put the `panel.ts`
fold at 16 deleted / 2 added; it is numstat **17 / 3**. Deleting `renderConsoleLine` orphans
`ConsoleLine` in the type import at `panel.ts:12`, and `noUnusedLocals` makes that a typecheck
error — criterion 1 — so the import line is rewritten, one deletion and one addition in git's
count. The diff is otherwise exactly lines 61-75, the new import and the rewritten call;
`make` / `cell` / `row` / `table` / `View` are untouched, and `controls.ts`'s SHA is unmoved.
Criterion 3's diagnostics move with it — an orphaned comment now fails at 13/3, a doubled blank
at 16/3 — and the four other sites that say 16/2 (§3.2's row, §6.1's "sixteen deleted, two
added", §11's wave-1 row and its cost table) are stale by one. No wave edits the plan, so the
correction lives here and goes to `PHASE-4-NOTES.md` §2 at wave 6. The reviewer also noted a
pre-existing slip: §3.2 and §6.1 list `box` among `panel.ts`'s frozen exports, and `panel.ts` has
never exported one. (2) The golden is 19 lines and 33,450 bytes, not ~12 lines: two path strings
over 960 rectangles, and a twelve-line provenance header.

**Where the build decided.** (1) `MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT` is declared as `30`,
the origin the indent subtracts — one load-bearing, greppable declaration rather than a `= true`
beside a live number. Review judged KEEP: the repo's `OPEN:` constants carry the datum when the
ruling is one (`LISTING_LINES_PER_PAGE = 55`, `BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY = '9'`), and
the block now says that 30 is the `[verified]` position used as the origin while the `[likely]`
part is the choice to render the 30-group flush — the open question is the origin, not the
number. (2) The indent precedes the ID character — S223-2648 p.6 via wave 0's read: the ID
"prints in position 1" — and a double-spaced line's blank line is a carriage space outside the
indent. (3) The rotated "IBM" legend carries one `x` for the run, as `cardView.ts:88-89` anchors
it; the band and both column-number rows carry one per character. (4) `restrike`'s parameter
names the destination arrangement. (5) The two chain-independent facts `!` → `-` and `ƀ` → `‡`
are charset.md §5's footnote paragraph, not §5.1's as the plan cites; the code cites §5. (6) One
clause of `LINES_PER_BAR`'s carried comment, "below", no longer resolved in `page.ts` and now
points at the drawn printer view. (7) `paginate`'s throw is `renderGreenBar`'s sentence with the
prefix swapped, pinned mechanically rather than retyped.

**Adversarial review (Opus): APPROVE-WITH-FIXES — no blocker, one major, seven minors, all but
one applied before the commit.** The major: five of the nine ledger names had no exported
declaration — §15's comment shape ends "then the exported declaration", and every `OPEN:` constant
under `src/asm`, `src/rpg` and `printer1403.ts` has one — so `chain.ts` and `cardGeometry.ts` now
export them and their tests pin each by name. The minors applied: `PRINTED_BLANK`'s refused core
change priced in the oracle's header (one constant at `printout.ts:40`, and the cc01 transcript
moves); `selectric.ts`'s local `glyphOf` renamed `renderCell` so it no longer shadows core's; the
two test headers name their machine; the chain test's `src/asm` importer grep can no longer pass
on an empty file list; the DOM-free test's import matcher also catches a bare side-effect
import; the page test's deck runs moved from describe-collection into the cases through a
memoized getter, so a machine regression is a named failure. Not applied, by the reviewer's own
reading: the golden pins raw doubles in its `x` arrays — deterministic under IEEE-754 and needed
by the test. The reviewer independently reproduced the `noUnusedLocals` error with the repo's
tsc, read the fold's three hunks, re-ran all six tests, and confirmed the phase oracle and the
free cross-check are genuinely independent.

**Gates (final wave-1 tree, `oracles/` present, all green):**

```
npm run typecheck                                            clean
npm test                                                     100 files, 1812 passed, 1 skipped
npm run smoke                                                6 files, 49 passed
npm run cc01                                                 PASS · CC01A · CC01 COMPLETE ·
                                                             instruction check at 00322 ·
                                                             1241 instructions
test/golden/hello-dad.page.txt                               348 bytes
test/golden/hello-dad.lst                                    2251 bytes
test/golden/sales-summary.page.txt                           3688 bytes
test/golden/sales-summary.lst                                6982 bytes
test/golden/card-face-a.svg.txt                              33450 bytes (new, CONSTRUCTED)
npm run build                                                clean (dist/index.html 2.92 kB,
                                                             assets/index-B55v2n2y.js 251.56 kB)
grep -c 'src="\./assets' dist/index.html                     1
git diff --numstat -- src/ui/internals/panel.ts              3 17 — the fold
shasum -a 256 src/ui/internals/controls.ts                   a6d90f54…f318f, unchanged
```

## Wave 2 — the 1403 station: the form, the stack, the tape, the straddle

**What landed.** Three views under `src/ui/period/printer/`, none of which computes a number:
`formView.ts` (the form at the platen and the printed stack from `paginate`, one line element per
line position with `textContent` straight from `FormPage.lines`, the 132-position ruler inside the
same `width: max-content` wrapper so it scrolls with the form — `printerView.ts:72-78`'s comment
carried verbatim — the bar / plain-white toggle with `BAR_SHADE` inline, a completed form sliding
onto the stack in one 200 ms transform, the word-separator caption under the form, and END OF JOB
at the paper stack captioned as the emulator's), `carriageView.ts` (the twelve-channel tape loop
drawn from `machine.printer.tape` — the device's own object, asserted `toBe` in the test — the
brush at `carriage.line`, the channel-9 and channel-12 lamps labelled as the emulator's, crossed
punches hatched under `STRADDLE_BANNER`), and `panelView.ts` (console-and-physical.md §8's two-row
sentence reproduced as it stands, Fig.70's PRINT START / PRINT STOP, all dark in one lamp colour,
no END OF JOB key, the 1401 red-fault convention refused by name in its header; the legends
exported as data). `period/unitrecord/printerView.ts` is deleted and `period/unitrecord/mount.ts`
constructs the three views in the same commit (RULE 2); the mount's own frame loop is untouched,
so `requestAnimationFrame(` is still in two files, as §10.2 says through wave 3.
`paper/carriage.ts` gains `lastPrintedOn` (§5.2's "how a caller gets `from`", named by criterion
9 but assigned to no wave) and `CARRIAGE_CHANNELS` (the twelve channels, derived once from core's
`CARRIAGE_D_TABLE` in a DOM-free file after review moved it out of the view). `test/period-printer.test.ts`
drives both shipped RPG decks through the real loader, 1402 and 1411. Five §15 rows land in
`open-questions.md`'s `### Wave 2`; the ledger has been frozen since wave 1 and no constant was
added.

**The oracle, and what the deck actually does.** (a) `paginate` returns **three** `FormPage`s of 66
line positions, two of them inked, and every entry is 132 characters. (c) `STRADDLE_BANNER({ line:
60, channel: 12 })` is asserted character for character, em dash and `src/core/devices/printer1403.ts:354`
included, and line 354 of that file is asserted to declare `CARRIAGE_SENSES_AT_DESTINATION_ONLY`.
(e) `renderGreenBar` over the re-run cycle-probe paper equals `test/golden/cycle-probe.page.txt`
byte for byte — on the first run; the golden is read and never written. The Fig.69 rows and
Fig.70 keys are asserted as drawn strings with `END OF JOB` and `LOAD` as named absences.
**(b) and (d), as ruled.** The derivation is the frozen constant's own words — `from` is the last
print on the last INKED form, `to` is the final carriage — and it is what the view draws
(`carriageView.ts`: `straddled(lastPrintedOn(paper, lastInkedForm(paper)) ?? to, to, tape)`). On
cycle-probe it returns exactly `[{ line: 60, channel: 12 }]` with `carriage.channel12 === false` on
the same snapshot: the last print is form 3 line 59, the armed space carries the carriage to 61
across the channel-12 punch unsensed (`CARRIAGE_SENSES_AT_DESTINATION_ONLY`, `printer1403.ts:329-354`),
and the closing skip runs on to form 4 line 1 across no further punch; the channel-9 punch at 57
was landed on before 59 and is outside the span. On sales-summary it returns `[{ line: 57, channel:
9 }, { line: 60, channel: 12 }]`, and both are TRUE: the last print is form 3 line 9, `CC1 S` spaces
to 11, and the end-of-job eject to form 4 line 1 passes both punches without stopping on either —
iron's indicators "turn on when their hole is sensed" (io.md:268 `[verified]`; A22-0526-3 p.36
Figure 35) and the emulator's do not. The negative that proves the derivation reports only crossed
punches is synthetic — a motion from form 3 line 61 to form 4 line 1 covers 62-66 and the
channel-1 landing and returns `[]` — because no shipped deck ends without an eject. Each crossing
is drawn hatched under `STRADDLE_BANNER(p)`, unchanged.

**Three numbers in the plan the build corrected**, all from one cause: both RPG-generated decks
open with a skip to channel 1 before their first print, which ejects the power-on form, and every
shipped deck closes with a skip to channel 1 (the generator's `EOJ CC1 1`, `src/rpg/cycle.ts:545`;
`demos/sales-summary.asm:247`; `demos/hello-dad.asm:14`), which parks the carriage on a fresh form.
`hello-dad` has no opening skip and prints on form 1. (1) The RPG reports are on **forms 2 and 3**,
not 1 and 2 (§5.2 line 1090, §11 (b), criterion 9, storyboard step 13). (2) §11 (a)'s "2
forms" is the inked count; `paginate` emits **three** pages because rule 3 emits the carriage's own
form, and the carriage rests at **4:1**. (3) §5.2's derivation — `from` is the last print on the
carriage's form — is `[]` on both shipped decks, and criterion 9's literal composition
`straddled(lastPrintedOn(form 2), {carriage})` would throw past `traversed`'s one-form bound;
§11 (d)'s "sales-summary yields zero straddles" is false of the machine, whose end-of-job eject
from form 3 line 11 passes channels 9 and 12 unsensed. The main session ruled on 2026-09-02, after one reversal that is recorded here so the reasoning
survives: the derivation is the ledger's, unchanged — the last print and the final carriage, in
those words — because `from` taken on the carriage's OWN form (§5.2's wording) is empty on every
shipped deck at rest, and a per-form derivation would redefine a constant frozen at wave 1. §11
(d)'s "sales-summary returns empty" was wrong on the facts, not merely unsatisfiable, and a
negative that asserted a true finding away would be the worst outcome available; it is replaced
by the synthetic no-punch motion, with the eject's two crossings asserted as the positives they
are. One limit is named in the `OPEN:` block beside the constant rather than designed around: the
span from the last print to the final rest can cover more than one motion, so a deck whose
carriage LANDS on a punch between them would report that punch as crossed when it was sensed —
no shipped deck does, and Phase 6's trajectory report is to be checked against it when it lands.
`lastPrintedOn`, `lastInkedForm` and `CARRIAGE_CHANNELS` landing in wave 1's `paper/carriage.ts`
during wave 2 is a plan-phasing miss, accepted on the condition — met — that all six wave-1 tests
pass unedited. None of this edits the plan (Zarathustrum's standing ruling): it is recorded here and goes
to `PHASE-4-NOTES.md` §2 at wave 6 as the second and larger entry there — the one substantive
thing the review rounds missed, and Phase 6's trajectory report will paginate across forms the
same way.

**Adversarial review (Opus): APPROVE-WITH-FIXES — no blocker, one major, ten minors.** The major:
the twelve channels were derived inside `carriageView.ts` (bullet 1); moved to `paper/carriage.ts`
as `CARRIAGE_CHANNELS` with its citation and pinned in the wave's test. Applied minors: the mount's
Phase-2-era comment naming the deleted file; `autoSpacePending`, drawn on the old status line and
lost in the restyle, restored as one string on the form's status line; the ruler's bare decade `10`
named so it cannot be read as the 10 cpi pitch. Recorded, not changed: `paper/carriage.ts`'s +19
sits on no wave-2 row (a plan gap — §5.2 and criterion 9 name `lastPrintedOn` and assign it
nowhere); the mount diff is +13/−7 against ±6, comment reflow; the views are 589 lines against
510 with 304 of code, the test 300 against 200 with 192 of code — the rest is the header that
records the deck trace; the 200 ms slide is `Element.animate` rather than a CSS transition
because a transition needs a class and `period.css` is wave 5's (wave 5 may revisit); PRINT STOP
is drawn dark like the rest, with §8's "light key" surviving in the drawn note; the strip's fixed
`em` box matches the `viewBox` ratio only at 66 lines. The reviewer independently re-ran both
decks step by step and confirmed the trace, and confirmed that nothing outside `carriageView.ts:217`
depends on the straddle derivation. A narrow re-review of the A delta found three majors, all
stale prose contradicting the ruling — `lastPrintedOn`'s docblock and one §5.2 refusal line still
stating the carriage's-own-form composition and `form 2`, and wave 1's §15 ledger row in
`open-questions.md` still stating `{form:2,…}` and "sales-summary is empty" — and three minors (a
`mount.ts:47` citation this wave's own edit moved to `:49-51`; the header's function count). All
applied; the ledger row's fact is corrected under the freeze, which bars new rows, not the
correction of a disproved one.

**The screenshot — `docs/screenshots/phase-4/wave-2-1403.png`** (RULE 4; taken by the main session,
whose seat has the Chrome extension, against `npm run dev` on this tree before the commit). The desk
at wave 2 has no RPG-to-Autocoder chain yet — those controls are wave 5's — so the drive path is the
deck box's own: `sample deck` (`demos/hello-dad.cards`) → `PUT DECK IN HOPPER` → `READER START` →
`END OF FILE` → `key the bootstrap` → INTERNALS (address `00000`, `DISPLAY`, MODE `ALTER`, `START`,
`COMPUTER RESET`, MODE `RUN`, `START`) → MACHINE ROOM. `hello-dad` has no opening skip, so it prints
on form 1 and its closing skip parks the carriage at form 2 line 1: the status line reads
`carriage: form 2, line 1   5 lines printed`, form 1 is captioned torn off onto the stack, form 2
sits at the platen. **§11.3 question 1, the panel's box order — PASS**: three visually separate
silkscreened groups, each in its own bordered box — `PRINT READY · END OF FORMS · FORMS CHECK`;
`CARRIAGE RESTORE · CARRIAGE SPACE · SINGLE CYCLE · PRINT CHECK · SYNC CHECK · CHECK RESET ·
CARRIAGE STOP` in that order; `PRINT START · PRINT STOP` — every legend dark in one lamp colour, no
END OF JOB among them (it sits under the paper, captioned as the emulator's). **§11.3 question 2,
the paper's proportions — PASS**: the two-row ruler reads to 132, every printed line is one unbroken
row, the wrapper scrolls horizontally with the ruler, and the bars are three line positions to a bar,
correctly phased (001-003 shaded, 004-006 clear, 007-009 shaded) and running the full 132-position
width past the ink to the right-hand scroll edge. **Two defects, both fixed in the wave, both found
by RULE 4 and by nothing else.** (1) The first shot showed the carriage-tape strip collapsed to a
sliver of about 30 × 50 px: nothing external sizes the SVG while `period.css` is a stub, and the
`font-size: 1.6` presentation attribute that sizes the labels in user units sat on the root
`<svg>`, so the CSS `width: 11em` set on that same element resolved against 1.6 px. The `<svg>`
now carries explicit pixel `width`/`height` attributes with its `viewBox`, `display: block;
flex: none`, inside a wrapper of the same width — inline, as this wave's row sanctions. (2) The
second shot, the strip legible at 1:1 with its twelve columns, the 57 / 60 call-outs, the brush
and ruling A's two hatched punches and banners in place, showed the channel headings reading
`1 2 3 4 5 6 7 8 9 101112`: a two-digit label at 1.6 user units overran a 2-unit column, so the
last three of twelve `[verified]` channels could not be told apart. The column was what was wrong, so the column was widened — `COLUMN` 2 → 3 user units, with
`STRIP_WIDTH_PX` 180 → 252 (`viewW × 6`, so one unit stays 6 px and the labels 9.6 px), the height
unchanged at 426 — rather than shrinking the twelve labels a reader most needs or squeezing their
glyphs with `textLength`; every punch, guide and hatch is derived from `COLUMN` and followed. The third
shot is the committed PNG (182 KB). It frames the tape strip, its two banners and all three panel
groups; the form is not in the frame — the strip is 426 px tall and the station does not fit one
viewport while `period.css` is a stub and nothing lays it out side by side — and the form's verdict
stands from the first shot, where it was photographed and passed; wave 5's desk shot is where the
whole station fits one frame. A note for waves 3-5: take the screenshot only when no worker is
editing — Vite's hot reload wiped the machine state mid-drive when a fix landed — and drive by
coordinate, since element references go stale against the frame loop's re-render. Around the strip the first shot was already right: the caption states
the punching, CHANNEL 9 and CHANNEL 12 are dark, and the two banners were present verbatim —
`hello-dad`'s end-of-job eject from a low line crosses 57 and 60 unsensed, exactly as
sales-summary's does. Both are drawing defects invisible to every oracle in the phase, which is the
argument §14 R11 makes for the screenshot existing at all, and this station is its first evidence:
every gate was green on the collapsed strip and on the colliding headings.

**Gates (final wave-2 tree, `oracles/` present, all green):**

```
npm run typecheck                                            clean
npm test                                                     101 files, 1835 passed, 1 skipped
npm run smoke                                                6 files, 49 passed
npm run cc01                                                 PASS · CC01A · CC01 COMPLETE ·
                                                             instruction check at 00322 ·
                                                             1241 instructions
test/golden/hello-dad.page.txt                               348 bytes
test/golden/hello-dad.lst                                    2251 bytes
test/golden/sales-summary.page.txt                           3688 bytes
test/golden/sales-summary.lst                                6982 bytes
npm run build                                                clean (dist/index.html 2.92 kB,
                                                             assets/index-CWTfdZmL.js 258.20 kB)
grep -c 'src="\./assets' dist/index.html                     1
shasum -a 256 src/ui/internals/controls.ts                   a6d90f54…f318f, unchanged
```

## Wave 3 — the 1402 station: hopper, faces, stackers, keys, deck box

**What landed.** Six files under `src/ui/period/reader/`, none of which computes a number:
`cardFaceView.ts` (`renderCardFace(card, caption, scale)` — four SVG nodes over
`paper/cardGeometry.ts`'s paths and text runs at three inline widths, the caption required, and
`CARD_CAPTIONS` as data so a node test can read §7.1's five templates without building a node),
`hopperView.ts` (the file feed as at most `HOPPER_SLIVER_LIMIT` edge slivers with the literal count
against the 3,000-card capacity, drawing `session.hopperCards(reader)` and never the parsed deck;
the read station's face; the punch feed drawn per Fig.59 with its hopper empty and the one line
that this 1402 reads and does not punch), `stackerView.ts` (five radial pockets in the published
order with `pocketCounts` carried from `readerView.ts:29-34` — the only place that knows 8/2 is
one pocket seen from two feeds), `keysView.ts` (Fig.60's strip as seventeen position-keyed entries,
READER START and END OF FILE wired to the façade's two calls, PUNCH START / PUNCH STOP / READER
STOP drawn inert and captioned so, twelve lights dark and POWER lit as a constant, the emulator's
own `EOF KEY` / `EOF LATCH` / `READ BUFFER` strip beside END OF FILE, no LOAD key), `deckBoxView.ts`
(`deckBox.ts` restyled: LEGEND, RECONSTRUCTION, `refresh`, `setText`, the `put.disabled` rule and
the `?raw` sample survive; `findAlterBox()`'s `querySelectorAll` walk and the clipboard fallback are
deleted — §9.4's prediction, now paid), and `reader/mount.ts` (`mountReader(machine, host, hooks)`
returning the `View[]`, the `gated: Session` wrapper verbatim, no frame loop). `paper/cardGeometry.ts`
gains `HOPPER_SLIVER_LIMIT = 40` (+13, a rendering budget with a test and deliberately no `OPEN:`;
wave 1's tests pass unedited). `src/ui/main.ts` calls `mountReader` and renders its views on the
machine-room tab — **`requestAnimationFrame(` is now in one file**, §10.2's row 3 met a wave early
of the plan's own table, because the moved mount's loop died with the mount. The four deletions —
`period/unitrecord/{cardView,readerView,deckBox,mount}.ts`, 127 · 97 · 171 · 101 (the mount at 101
after wave 2's ±6) — land with all three importer edits RULE 2 names: `reader/mount.ts` replaces the
mount, `period/autocoder/objectDeckView.ts` moves to `renderCardFace` at both call sites with §7.1's
captions (3 / 3), `period/autocoder/mount.ts` repoints its `DeckBox` type (1 / 1). `test/period-reader.test.ts`
(306 lines, eleven cases) drives real reads through `Channel1` and `Reader1402` on the unchanged
session. Five §15 rows land in `open-questions.md`'s `### Wave 3`; the ledger stays frozen.

**The oracle, §11 wave 3 (a)-(e).** (a) Wave 1's card-face golden is pinned by digest and size, and
`cardFaceView.ts` is shown to take its geometry only from `../paper/cardGeometry.js` — no
`punchMask`, no `glyphOf` — so the view is an adapter over one golden and no node run builds it
(criterion 13). (b) Through the unchanged `unitrecord/session.ts` after real reads: the hopper
falls 3 → 2 → 1 → 0 front card first, `bufferedCard` follows AAA → BBB → CCC, and the five pocket
counts come back `[0, 0, 1, 1, 1]` over `0 (NP) · 4 · 8/2 · 1 · 0 (NR)` — the program selects a
different read-feed pocket per read (x3 = 0 / 1 / 2), so the published order and the 8/2 sum are
both load-bearing rather than a column of zeros. (b2) After one read the deck-box text is retyped
to a four-card deck: `hopperCards` still holds the loaded deck's remaining card, the buffer still
holds BBB, and `session.deck` shows the four new cards — `THE_HOPPER_DRAWS_THE_LOADED_DECK`, the
visible bug all three panel designs carried, refused in node. The five caption templates are
asserted verbatim. (c) `test/session.test.ts` passes on its wave-0 import line alone — the standing
gate. (d) `STRIP` is Fig.60's seventeen entries in order (two legends twice), `KEY_LABELS` carries
no `LOAD` (software.md §10.1, §10.10), the three inert keys are named, and the punch feed's line
reads that the machine reads and does not punch. (e) `LIT_CONSTANTS` is `['POWER']` and nothing
else. `HOPPER_SLIVER_LIMIT` is 40, under 3,000.

**Where the build decided.** (1) **`key the bootstrap` is disabled this wave.** §3.3 turns the
button into a typed `keyBootstrap(text, marks)` into the console session, and the console session
is wave 4's; the deck box takes the hook as an optional argument, no caller supplies it yet, and
the button is drawn disabled and captioned "keyed at the 1415 from wave 4". The DOM walk and the
clipboard fallback go now, not in wave 4, because leaving a `querySelectorAll` in a moved file for
one more wave would be the thing DECISIONS.md 2026-08-31 refused. For this wave's screenshot the
bootstrap is keyed by hand in the frozen alter box as `A^L%1000012$^R` — `keyed()`'s `^` marks the
`L` at position 1 and the `R` at 11. (2) **A face's `N` is its index within the source the caption
names, from 1** — `read station, card 1` is the one card the 1414 holds — because the frozen
session exposes no absolute ordinal and reconstructing one from three stacker counts plus the
buffer is arithmetic in a view. Review judged the choice defensible for the read station and a small lie for the file feed —
`session.hopperCards` returns the LAST waiting cards of the loaded deck, so after READER START the
face captioned `loaded deck, card 1` is card 2 — and asked for a ruling. Ruled: the file-feed face
is captioned **`loaded deck, next card`**, no ordinal, because a wrong ordinal is the thing the
caption exists to prevent and the frozen session cannot supply a right one; one of §7.1's five
templates therefore changes, a recorded deviation for `PHASE-4-NOTES.md` §2. `read station, card
N` keeps its shape and is always 1 — the station holds one card. (3) `HOPPER_SLIVER_LIMIT` lives in `paper/cardGeometry.ts`
as the plan's "`paper/`-side constant with a test", additive to a wave-1 file. (4) `main.ts` is
numstat 19 / 19 against ±8: +5 / −3 of code, the rest the wave-0 comments the change made false.
(5) Two header sentences in `period/autocoder/{objectDeckView,mount}.ts` still name `renderCard`;
both files are `git mv`'d and restyled in wave 5, the cheap place to fix them. (6) `STRIP` wires
its two live keys by strip position (14 and 16), never by label, because `PUNCH STOP` and
`READER STOP` each occur twice.

**Adversarial review (Opus): APPROVE-WITH-FIXES — no blocker, four majors, eleven minors.** The
majors, all applied before the commit: the (b2) case proved the session's freeze and not the
view's — nothing bound `hopperView.ts` to `hopperCards`, and a one-accessor regression to
`session.deck` would have passed — so the test now reads the view's source for the accessor and
for the absence of `session.deck`; the file-feed caption's ordinal (the ruling above); the deck
box's faces moved into a flex container while `index.html:31` sizes the SVG by percentage, which
can leave a face at the 300 × 150 default — the `.card-face` wrapper now carries an explicit
inline width per scale and `flex: 0 0 auto`, and the screenshot is what confirms it; and the
transitional bootstrap note handed the operator the un-`^`'d string and 0-based positions for a
box that parses `^` as the WORD MARK key — the note now prints `A^L%1000012$^R`, derived from
`BOOTSTRAP_KEYSTROKES` exactly as the deleted helper did. Minors applied: `INERT_KEYS` derived from
`STRIP` and the wiring table rather than a second hand-written list; `LAMP_LIT`'s citation (the
lit value is introduced here and wave 5 hoists it); the hopper heading and the punch feed's label
(`punch feed — empty`, with both feeds' `[verified]` travel directions as captions, A22-0526-3
p.59); `cardGeometry.ts`'s header naming its wave-3 addition; the `gated` wrapper's comment
saying verbatim but for the one `dirty = true` → `hooks.kick()` line the gate move forced.
Recorded, not changed: two header sentences in `period/autocoder/{objectDeckView,mount}.ts`
still name the deleted `renderCard` — deferred to wave 5, which moves and restyles both files;
`pocketCounts`' signature is `(s: MachineState)` and its first comment sentence reworded, the
expression verbatim; (b2) reads one card, not the plan's three, deliberately — at hopper 0 the
plan's version is nearly vacuous; `hopperCards` slices up to `reader.hopper` cards per render
while the sliver limit bounds nodes only; `DeckBox` is an `interface` where it was a `type`; the
stackers' five fan angles are the wave's one authored presentation number and set no precedent
for wave 4's rotary. The reviewer confirmed bullet 1 across all six files (the one sum is the
carried 8/2), zero DOM reach under `src/ui/period`, RULE 2 with zero surviving importers, the
single rAF file, the frozen session untouched, and no refused token in any drawn label.

**The screenshot — `docs/screenshots/phase-4/wave-3-1402.png`** (RULE 4; the main session, whose
seat has the Chrome extension, against its own `npm run dev` on this tree, with every worker holding
edits so no hot reload could wipe the machine state — wave 2's lesson applied). Drive: MACHINE ROOM →
deck box `sample deck` → `PUT DECK IN HOPPER` → `READER START`, and stop: hopper 5, the bootstrap
card in the 1414 buffer. **§11.3 question 1, the panel's box order — PASS**: Fig.60's strip reads
left to right in the published order — PUNCH START and PUNCH STOP grey and inert, the twelve lights
with **POWER the one lit lens, cream against twelve dark**, then END OF FILE, READER STOP (inert),
READER START (live); both twice-used legends land as a key and a light in their right places; no
LOAD key anywhere; the emulator's own `EOF KEY: off · EOF LATCH: off · READ BUFFER: ON` strip sits
below, visually distinct, with its disclaiming line. **§11.3 question 2, the paper's proportions —
PASS, measured**: the read-station face at 668 × 294 px and the six deck-box faces at 459 × 202 px
are both 2.272 against the 7 3/8 × 3 1/4 card's 2.269 — within a tenth of a percent — and the
diagonal cut is at the upper LEFT on every face at both scales, the file feed's `loaded deck, next
card` included. The deck-box six were inspected at full size: none is a 300 × 150 box — review's
flex-width fix held, the same defect class as wave 2's collapsed strip, caught before the shot this
time. The object-deck scale is not photographable this wave (the coding station has no ASSEMBLE
control until wave 5); its two `renderCardFace` call sites are covered by typecheck and the node
tests, and wave 5's shot is told to look for the third scale. Framed: the file feed's face and
caption, the full read-station face, the empty punch feed with its two lines, the complete strip;
above and below the fold, by the stated priority order, the stackers and the deck box. The caption
ruling reads on the page as intended, and `key the bootstrap` is greyed beside its caption with the
corrected by-hand note naming the 2nd and the 12th character. No defect.

**Gates (final wave-3 tree, `oracles/` present, all green):**

```
npm run typecheck                                            clean
npm test                                                     102 files, 1846 passed, 1 skipped
npm run smoke                                                6 files, 49 passed
npm run cc01                                                 PASS · CC01A · CC01 COMPLETE ·
                                                             instruction check at 00322 ·
                                                             1241 instructions
test/golden/hello-dad.page.txt                               348 bytes
test/golden/hello-dad.lst                                    2251 bytes
test/golden/sales-summary.page.txt                           3688 bytes
test/golden/sales-summary.lst                                6982 bytes
npm run build                                                clean (dist/index.html 2.92 kB,
                                                             assets/index-DVxbUiBf.js 263.92 kB)
grep -c 'src="\./assets' dist/index.html                     1
grep -rln 'requestAnimationFrame(' src/ui                    src/ui/main.ts only
shasum -a 256 src/ui/internals/controls.ts                   a6d90f54…f318f, unchanged
```

## Wave 4 — the 1415 station: Selectric paper, rotary, keys, keyboard, light panel

**What landed.** Nine files under `src/ui/period/console/`, two of them DOM-free and seven of
them views that compute nothing. `session.ts` (§4.6-§4.8: `PeriodMode`, `ROTARY_ANGLE`, `turnTo`,
`ConsoleKeyboard`, `PendingEntry`, `ConsoleSession`) is the one place `machine.setMode` is
reachable from the period surface and the new home of the phase's one sanctioned cross-surface
import, `keyed` from the byte-frozen `controls.ts`; `lamps.ts` (§4.9: `PANEL_BOXES`,
`OMITTED_LAMPS`, `lampsOf`) is console-and-physical.md §5's panel as data — seven boxes in the
published order with STATUS immediately right of the CPU box, 103 published positions less the eight-entry omission list's 18 = 85 drawn, of which
exactly sixteen carry a `MachineState` source. The views:
`logView.ts` (the pin-feed Selectric form, `renderSelectric` at the browser's triple
`{ matrix: 'indent', marks: 'render', spacing: 'render' }`, ruled at the 80 positions of core's
`CONSOLE_LINE_LENGTH`, the pending row for an entry the operator has typed and the machine has
not), `rotaryView.ts` (six detents at `ROTARY_ANGLE`, snapping, the C.E. door drawn closed with
one line naming what §3 documents behind it, the 1401 address dials refused in its header),
`keysView.ts` (START / STOP / PROGRAM RESET / COMPUTER RESET wired, the four power keys inert,
READY lit as a constant beside POWER ON), `keyboardView.ts` (Fig.43's key tops with the dual-legend
caption, the WORD MARK key, the visible lock state, and **the one `keydown` listener in
`src/ui/**`**, bound to its own `tabindex="0"` wrapper whose `focus()` the session calls on every
unlock), `inquiryView.ts` (INQUIRY REQUEST, INQUIRY RELEASE, INQ CAN and the hold indicator),
`lightsView.ts` (the reduced panel with its `REDUCED PANEL` label, one lens colour, groups by
silkscreened border, POWER stacked over SYSTEM CONTROLS beside a full-height SYSTEM CHECK as
S223-2648 Fig.3 shows), and `mount.ts` (`mountConsole`, the one caller of `createConsoleSession`).
`period/unitrecord/inquiryView.ts` is deleted and `reader/mount.ts` constructs the console
station in the same commit (RULE 2), threading the deck box's `keyBootstrap` to the session — the
button wave 3 drew disabled is live. `src/ui/main.ts`'s execute gate carries all four terms —
`running && !consoleSession.held && consoleSession.detent === 'run' && machine.mode === 'run'`
— and `internals/mount.ts` draws the live MODE label above the frozen controls (§10.4). Three
tests and the two sanctioned appends to `test/period-is-dom-free.test.ts` (ten required paths).
Fifteen §15 rows land in `open-questions.md`'s `### Wave 4`; the ledger stays frozen.

**The oracle, §11 wave 4 (a)-(g), on a real `createMachine({ size: 10_000 })` with spies for
`run`, `halt` and `focus`.** (a) `turnTo` over all 30 ordered pairs: one `S` on `snapshot().console`
per real turn, none for a turn to the current detent, `machine.mode` unmoved by a turn to DISPLAY
or C.E., the `halt` spy on every real turn; RUN → DISPLAY → RUN types two — the case `machine.ts:325`'s
early return would swallow; with the run latch on, a turn to DISPLAY types one `S` and halts.
(b) The dialogue in A22-0526-3 p.51's order: a keystroke before START refused; START in DISPLAY
unlocks at five with a pending `D` row at 35 and the `focus` spy fired; the fifth digit auto-locks
and the two lines on the log equal, field for field, what `keyAddress('00000'); display()` types
on a twin machine; a sixth digit refused; the display data line runs to the 80 positions of
`CONSOLE_LINE_LENGTH`; ALTER before any display unlocks nothing and types nothing, asserted on the
log's length; the typed line echoes as a pending row with its marks; COMPUTER RESET commits — the
`A` line carries its word mark and STORAGE holds the characters; a displayed word mark not
re-entered is gone from storage; the commit also fires on the span filling, on START, on a turn
and on PROGRAM RESET; the fourth `S` and START in RUN firing `run`. (c) `take('release')` equals
the frozen, imported `keyed()` over a nine-line corpus; `~` and `^` are refused; `keyBootstrap`
feeds the twelve characters of `AL%1000012$R` with marks at 1 and 11 and is refused outside the
`data` state. (d) REQUEST sets the session's own `held` and the device latch; RELEASE and CANCEL
clear it; the discriminator — a program that never reads, the device latch already dropped — still
clears on RELEASE, which a hold read off `Console1415.pendingRequest` fails. (e) `PANEL_BOXES`
diffs clean in both directions against §5's table sliced from `console-and-physical.md`, modulo the
eight omissions with their §12 citations (the two CH2 columns as whole-column entries); STATUS is
`PANEL_BOXES[1]`; exactly sixteen sources, §8.1's set, each returning a boolean on a real snapshot
— a fresh machine lights `B<A` alone, the documented reset asymmetry (opcodes.md §8; A22-0526-3
p.36), and an instruction check lights INSTRUCTION CHECK and STOP beside it; the register grep
finds nothing in `lamps.ts` or `lightsView.ts`; the REDUCED label names §12 and the count.
(f) The keydown grep: `addEventListener('keydown'` in exactly `console/keyboardView.ts`,
`document.`/`window.addEventListener(` nowhere under `src/ui/period`, `.press(` only under
`console/`. (g) `console/keysView.ts`'s `LIT_CONSTANTS` is `['POWER ON', 'READY']`; wave 1's Exhibit
II slice re-rendered at the browser's triple puts the 35-lines five columns right of the 30-lines,
and `logView.ts`'s text carries that exact triple.

**Where the build decided.** (1) The light panel sits between the key strip and the keyboard —
§1 step 14's "above the keyboard", physically the panel on its stand behind the typewriter. (2) The
keyboard's WORD MARK chord is Option+W on `ev.code`, beside the drawn WORD MARK key; `^` is the
internals text box's convention and never the keyboard's. (3) The inquiry lamp follows `session.held`
because `MachineState` exposes no inquiry field — `channel1` is io.md §5's six indicators plus the
interlock — and the hold is the session's own by ruling; the view's header says so. (4) `OMITTED_LAMPS`
covers eighteen positions in eight entries: the two CH2 columns carry a whole-column marker, the
other six name one label each; §5's `A RING | 1-6` expands to six lamps for the 103 total; SCAN /
SUB SCAN stays one group of eight as §5's single row prints it. (5) STOP is not a commit point —
§6.4 names four control actions and STOP is not among them; `startKey()` has three live arms and
ADDRESS SET, I/E CYCLE and C.E. turn, type their `S` and are inert on the desk (the internals tab
still reaches `machine.start()` in those modes). (6) The pending `I` row survives RELEASE until the
program's read consumes the entry — nothing is on the paper yet (§6.6); an empty ALTER commits
(on iron the `A` and its space are on the paper from START); a non-numeric DISPLAY address
auto-locks to nothing rather than reaching `keyAddress`, which would throw. (7) The 932 cpm reveal
is not built and its `OPEN:` block says so. (11) Under the review's inquiry ruling, one
narrowing of the builder's: a RELEASED entry is not cancelled by a later control action — it is
queued on the device, cancelling it would discard an operator's correct action and set Figure 45's
Condition on the read, and its row stays on the form until the program's `RCP` types the real `I`
line (§6.6); `held` is already false by then, so no frame can stall behind it. (8) `mountConsole` appends into its host and
`reader/mount.ts` re-parents the station into its own order — a re-parent, not a duplicate.
(9) W5's numstats run over their rows — `reader/mount.ts` 43 / 31 against ±8, `main.ts` 17 / 8,
`internals/mount.ts` 15 / 7 — on header prose describing what changed; the code is the row's size.
(10) Recorded for later waves: `OMITTED_LAMPS` must carry the literal labels `1401 COMPAT`, `TAPE OFF
LINE` and `DISK OFF LINE` (§8.2), so wave 5's refusal grep whitelists `lamps.ts` by file, line and
citation. (12) **An ownership crossing, ruled by the main session:** wave 3's `test/period-reader.test.ts`
stripped block comments before line comments in its `codeOf`, so a line comment writing the glob
`src/ui/**` — which `reader/mount.ts:18`, `main.ts:8`, `console/mount.ts:17`, `keyboardView.ts:46`
and `paper/chain.ts:24` all do — opens a false block match that swallows live code up to the next
`*/` (measured: 79% of such a file). It was latent — `hopperView.ts` carries no such comment, so
wave 3's negative guard read what it claimed to — but one future line comment there would turn the
guard silently green on code it never read, the control-byte failure mode with a committed oracle
behind it. Wave 4 edits the wave-3 file by ONE line — the two `.replace` calls swapped so `//`
strips first, as this wave's own tests do — no behaviour, no new case; recorded here and in
`PHASE-4-NOTES.md` §2 with the other deviations. Wave 5's `test/period-refusal-grep.test.ts`, all
absence assertions, is told to strip line comments first and read in node.

**Adversarial review (Opus): PASS WITH FIXES — no code blocker (the one BLOCKER was the PNG not yet
taken), two majors, nine minors.** The majors, both applied before the commit: the INQUIRY REQUEST
lens had been wired to `session.held`, so it went dark at RELEASE while the 1411 latch `J iiiii Q`
tests was still set — §6.6 rules the deleted view's device-flag read "correct and stays correct"
for the lamp — and it now reads `machine.console.pendingRequest` through a closure the mount hands
it, with the HELD indicator staying on the session's own latch; and `request()` unlocked the
keyboard without committing a pending ALTER while a START or a turn after REQUEST overwrote the
inquiry entry and stranded `held`, a silent frame stall two clicks away. Ruled: `request()` commits
first, and an open inquiry entry is CANCELLED by any other control action exactly as INQ CAN would
cancel it — only RELEASE supplies an entry, so walking away discards it, the mirror of ALTER's
commit-on-control-action — with both directions pinned in the test. **One assertion in that new test was wrong and the
code was right**: the cancel case asserted the device's `pendingRequest` false after a control-action
cancel, which could only be satisfied by the UI writing device state — the thing §6.6 refuses and
the lamp fix above was about not doing — and it contradicted the same file's discriminator case,
which asserts that flag survives RELEASE. `session.ts`'s author refused to edit code to satisfy a
red assertion and measured the flag on a real machine instead: it survives INQ CAN, RELEASE, START
and a rotary turn, and core's own COMPUTER RESET and PROGRAM RESET clear it. Ruled by the main
session: the test asserts the frame gate (`held`, false in every row) and the device flag per
action as measured — the lamp/gate split is now a tested property, not a comment. The per-wave
review working in the rarer direction. Minors applied: the
non-repeating WORD MARK key tested against a doubled press; `onFive`'s validity guard tested (a
non-numeric address locks and types nothing rather than reaching `keyAddress`, which would throw);
the key-strip and keyboard label data asserted as drawn strings rather than exported to no
consumer; the two `CONSOLE_LINE_LENGTH` citations given their `OPEN:` marker so the ledger grep
finds all fifteen. Recorded, not changed: `stopKey()` is not a commit point (§6.4's enumerated
four over its looser gloss; the consequence is ordering only); the tests run 904 lines against
395 with 640 of code — the one overrun in the phase that is code, the thirty-pair and twin-machine
rigs the oracle demands; `console/mount.ts` draws a bare `hr` as `reader/mount.ts` does, so wave 5
owes a `#machine-room hr` rule for two files; `OMITTED_LAMPS` carries three §18a tokens as data
that never reach the page, so wave 5's grep whitelists `lamps.ts` by file, line and citation; and
**a plan gap** — `logView.ts` authors the Selectric form's proportions (the quarter-inch hole
inset, the hole pitch, the tick-every-ten ruling) as literals in a view, because no DOM-free
module owns that form's geometry (wave 1 landed four `paper/` modules and `selectric.ts`, none of
which covers it), which is exactly what §11.3's second question exists for; it goes to
`PHASE-4-NOTES.md` §2. The reviewer independently re-derived all thirty rotary pairs, the three
unlock sites of the focus hook, the sixteen sources against §8.1, every box of `PANEL_BOXES`
against §5's rows, and the four-term frame gate; found the keydown grep clean across `src/ui/**`;
and put the module cost at 1,931 lines against 1,380 with 1,004 of code — under budget on code,
the rest §16 headers and the fourteen `OPEN:` blocks. **A hazard for the phase, not a defect**: a
stray control byte in a string literal (found and removed from `logView.ts` by its own author) makes
shell `grep` treat the file as binary and suppress every match, so an ABSENCE assertion run through
`grep` would pass vacuously — a false green. Every absence check in this phase reads files with
`readFileSync(file, 'utf8')` in node (`period-is-dom-free`, `period-keydown-ownership`, the source
reads in `period-reader` and `period-printer`), and wave 5's `test/period-refusal-grep.test.ts` must
be written the same way. The tree is clean of control bytes (`LC_ALL=C grep -rlP
'[\x00-\x08\x0B\x0C\x0E-\x1F]' src/ui/period/` returns nothing).

**The screenshot — `docs/screenshots/phase-4/wave-4-1415.png`** (RULE 4; the main session against
its own `npm run dev` on this tree, all five workers holding). Drive: deck box `sample deck` →
`PUT DECK IN HOPPER` → `READER START` → `END OF FILE`; at the 1415, `STOP`, rotary `DISPLAY`, `START`,
`00000` typed with no click, rotary `ALTER`, `START`, `key the bootstrap`, `COMPUTER RESET`, rotary
`RUN`, `START` — and the deck ran to its halt (`carriage: form 2, line 1   5 lines printed`).
**§11.3 question 1, the panel and its omissions — PASS.** Left to right CENTRAL PROCESSING UNIT
(its six sub-groups stacked) · STATUS as its own framed column immediately right of ARITH · I/O
CHANNEL CONTROL · I/O CHANNEL STATUS, and below them a full-width SYSTEM CHECK with POWER stacked
over SYSTEM CONTROLS at its right. `PRIORITY ALERT` is absent — no lens, no legend, no dark slot;
CH1's OVERLAP pair is absent the same way, the CONTROL row reading `INTERLOCK · RBC INTERLOCK ·
READ · WRITE` and stopping; neither channel box has a CH2 column — empty frame, not dark lenses. The
`REDUCED PANEL` paragraph is legible and states 85 of 103 drawn with the eighteen named. One lamp
colour, warm white on charcoal, groups by silkscreened border. **§11.3 question 2, the Selectric
form — PASS.** A tall cream sheet with a pin-feed hole column down each margin and the 80-position
ruling ticked every ten; the seven lines read exactly `S S D D S A S`; the 35-matrix lines (the
`S` lines, the `D` address line) sit five columns right of the 30-matrix lines (the `D` data line,
`A`) — a 47 px gap at about 9.4 px per column; the `D` data line is 80 blanks, §6.3's cleared-storage
display running to the end of the line; `Ø` slashed and `O` not; the inverted circumflexes over
the `L` and the `R` of `AL%1ØØØØ12$R`, the 2nd and 12th characters; the four-character group
underscored on every `S` line — all legible at the drawn size. **§6.5 ruling 5 held**: after START
in DISPLAY the five digits landed on the Selectric with no click anywhere, and again for the ALTER
entry; nothing reached a textarea — the phase's named unseen defect did not occur. **One correction
to the orchestrator's prediction, not to the page**: the request predicted one lit lens, `STATUS ·
B<A`; the shot shows two, because the final START ran the deck to its halt and `SYSTEM CONTROLS ·
STOP` is a driven lamp (`lamps.ts`: `source: (s) => s.stop !== undefined`, one of the sixteen) doing
its job — the prediction described the state before the run. Framed: the light panel whole with its
REDUCED PANEL paragraph, the lower shelf above it, the keyboard heading below; the form, the rotary
(at RUN, the C.E. door closed with its contents listed as not modelled) and the key strip are above
the fold and were verified at full size before framing. No defect.

**Gates (final wave-4 tree, `oracles/` present, all green):**

```
npm run typecheck                                            clean
npm test                                                     105 files, 1893 passed, 1 skipped
npm run smoke                                                6 files, 49 passed
npm run cc01                                                 PASS · CC01A · CC01 COMPLETE ·
                                                             instruction check at 00322 ·
                                                             1241 instructions
test/golden/hello-dad.page.txt                               348 bytes
test/golden/hello-dad.lst                                    2251 bytes
test/golden/sales-summary.page.txt                           3688 bytes
test/golden/sales-summary.lst                                6982 bytes
npm run build                                                clean (dist/index.html 2.92 kB,
                                                             assets/index-CN_aBhgb.js 287.09 kB)
grep -c 'src="\./assets' dist/index.html                     1
grep -rln 'requestAnimationFrame(' src/ui                    src/ui/main.ts only
git diff --numstat -- src/ui/internals/controls.ts           0 0 — imported for keyed(), never edited
shasum -a 256 src/ui/internals/controls.ts                   a6d90f54…f318f, unchanged
```

## Wave 5a — the desk and the stylesheet

**The split.** Zarathustrum ruled before this wave that wave 5 takes §11's pre-declared cut: **5a** — `period/desk.ts`,
`period/mount.ts`, `period/session.ts`, `src/ui/styles/period.css` and the four wave-5 tests — and
**5b** — the two authoring stations' `git mv` and restyle. Two commits, two reviews, two gates, five
screenshots in the phase, recorded in `PHASE-4-NOTES.md` §2 with §14 R13's reason (2,135 lines,
decided in advance rather than improvised). Two items sit in 5a by the build's reading rather than
the ruling's list: the `reader/mount.ts` narrowing (§14 R13's own text puts it in 5a, and a mount
cannot take the printer and console over while the reader mount still constructs them) and the
`+16 stale` edit to `period/autocoder/session.ts` — a file that never moves — because
`test/period-session.test.ts` is 5a's and would otherwise need a skip that 5b un-skips, an edit to
another wave's test. Both are put to the main session at this wave's stopping point.

**What landed.** `src/ui/styles/period.css` (651 lines, filled from the five-line stub; the SOLE
owner of its content): colour, type, spacing and the two paper textures; nine custom properties on
`#machine-room`, one per `[unverified]` colour in §15 — `--lamp-lit` / `--lamp-lens` / `--lamp-dark`,
`--lamp-group-border`, `--ribbon`, `--card-stock` `#f7f3e8`, `--desk-top` / `--desk-pedestal`,
`--bar-shade` `#ececec` — each naming its row, the values those the views already carried inline;
the machine-room grid in paper order (SPEC SHEET and CODING SHEET down the left with the 1402
below them, the 1415 in the middle, the 1403 the widest right-hand column; one column below 64 em);
every rule scoped under `#machine-room` or `.period-*`, no bare element selector, no `@import`, no
`@font-face`, no `url(http`, no pixel width on a form or card, no number that matters; the 1401
red-fault convention refused by name in its header for END OF FORMS / FORMS CHECK and the 1415's
lamps; `body` never styled. `index.html` completes §10.3's second step: the remaining global rules
(`hr`, `table`, `td`, `.on`, `.off`, `pre`, `input, select, button`) scoped under `#internals`, the
four period classes moved out, `body` the one global — the block now holds `body` and fourteen
`#internals` rules and nothing else. `period/desk.ts` (156): `createDesk(host)` with five named
areas and `place(area, station)`, so mount order and display order cannot disagree; the four §15
declarations CSS cannot make (`DESK_IS_LIGHT_LAMINATE_ON_CHARCOAL_PEDESTALS`, `SOUND_IS_OUT`,
`NO_WEBFONT`, `NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED`). `period/session.ts` (87, DOM-free): §4.10's
`PeriodViewState`, `PeriodAction`, `INITIAL_VIEW_STATE` and a pure `reduce` that clamps `form` and
`card` and returns the same object on a no-op. `period/mount.ts` (148): `mountPeriod(machine, host,
hooks)` builds the 1415 first so its session reaches the deck box's `keyBootstrap`, then the 1402
through the narrowed `mountReader`, the 1403's three views, and the two transitional authoring
stations at their pre-5b paths, places each in paper order, keeps both typed hand-offs inside the
mounts that own them, holds one `PeriodViewState`, and returns `{ views, session, dispatch }`.
`reader/mount.ts` narrows to the reader (the printer and console constructions and their comments
move up; net −33 against −12, the difference comment). `src/ui/main.ts` makes one `mountPeriod` call
and dispatches `tab` on a switch. `autocoder/session.ts` gains `stale` (+25 against +16, the extra
its doc comment and header note), set by `setSource` and `setDataText`, cleared by `assemble()`,
`hopperText()` returning `''` while it holds — with `result` kept so the listing stays readable
beside edited source; both tier4 tests pass unedited (criterion 15's bound). The third and last
sanctioned append to `test/period-is-dom-free.test.ts` — eleven required paths. Four tests (822
lines): `period-session` (the six transitions, constraint 11 on both sessions, the CSS lint),
`period-css-covers-every-class` (both directions over class tokens — nineteen literals, nineteen
rules, the three §10.3 predicted would fail now ruled), `period-no-second-frame-loop`
(`requestAnimationFrame(` in `src/ui/main.ts` and nowhere else), and `period-refusal-grep` — the
carrying file for criterion 18a, reading in node with line comments stripped first, case-sensitive
over whole label tokens, whitelisted by file, line and citation: the three `OMITTED_LAMPS` labels
§8.2 requires (`1401 COMPAT`, `TAPE OFF LINE`, `DISK OFF LINE`) and the checked phrase
`carriage-control tape` — and, as wave 6's review counted, the two published `PANEL` rows that carry
the tokens (`lamps.ts:137-138`): six rows, not the four this paragraph first said — a seeded positive proving the detector fires, and no other hit in the
tree. Four §15 rows land in `open-questions.md`'s `### Wave 5a`; `THE_RULER_IS_THE_FORM` is 5b's.

**The oracle, §11 wave 5's clauses 5a can satisfy.** (a) Constraint 11 in node — `assemble()` then
a one-character `setSource` gives `stale === true` and `hopperText() === ''`; `setSpecText` then
`handOff()` gives `{ source: '', dataCards: '' }`. (b) `test/tier4-autocoder-demo.test.ts` and
`test/tier4-rpg-demo.test.ts` pass with only their wave-0 import line changed. (e) The CSS lint,
all five rules. (f) Both drift guards — every class literal ruled and every rule referenced; one
frame loop, named. (g) The §12 refusal grep over drawn labels with the time-unit tokens. (c) the
listing goldens (unmoved here at 2251 and 6982 bytes) and (d) the sheets' field spans wait for 5b.
`npm test` reaches §12.1's regression target exactly: **109 files, 1927 passed, 1 skipped** against
the plan's 109 / ≈1,930 / 1.

**Where the build decided.** (1) `mountPeriod` wires only the `tab` action; the other five
`PeriodAction`s are pure transitions the test exercises while the views keep the local toggles they
shipped with (the form's bar and ruler toggles, the listing's A/H) — a recorded limitation in the
mount's header, not a design; `BOUNDS` is a constant until something dispatches `form` or `card`.
**The main session asked whether anything later in the phase reads the state, and the answer is
no.** 5b restyles the two authoring stations from views that keep their own toggles — the
listing's A/H toggle calls `restrike()` directly, as §9.3 specifies — and wave 6's storyboard test
drives the three sessions and never the view state; its only reader at merge is
`test/period-session.test.ts`. So §4.10's `PeriodViewState` ships as a **documented inert seam**:
`state` is written and never read, `dispatch` is a sink, `BOUNDS` pins `form` to 1 and `card` to
0. That is a plan defect — §4.10 specified a state machine no wave was asked to consume — and it
goes to `PHASE-4-NOTES.md` §2 with the others; it is not ripped out mid-wave, because the plan is
a reviewed artifact and the deletion is not worth the churn. What would make it live: the form
view's bar and ruler toggles, the listing's A/H toggle, the stack's form selection and the deck
box's card index dispatching through `reduce`, with `BOUNDS` read off `paginate`'s page count and
the loaded deck's length — edits to four views and one mount, a later phase's.
(2) `reduce` guards empty bounds — a form pins at 1 and a card at 0 rather than 0 and −1 — stated
in the module and pinned in its own case. (3) `stale` keeps `result`. (4) The refused colour tokens
are matched case-sensitively exactly as criterion 18a enumerates them (`red`, `#f00`, `#ff0000`,
`crimson`), because case is load-bearing for `clock` against §8's `CLOCK`; a label reading `RED
FAULT` would not fire, and nothing in the tree does. (5) The tab bar's two buttons sit in `#app`,
outside both surfaces, and lost `font: inherit` when that rule was scoped under `#internals`; they
carry it inline, with no class and no rule. (6) The wave-5 screenshot named in §3.4 is two under
the split: `wave-5a-desk-both-tabs.png` here and 5b's own.

**Adversarial review (Opus): fix-then-commit — two blockers, three majors, eight minors, every
gate green.** The blockers, both in files 5a owns and both applied before the commit: **criterion
18a's carrier could not see the 1415's drawn labels** — its fourth shape matched only `export const
… = [`, so the non-exported `CONTROLS` of the Fig.47 key strip, the non-exported rotary `LEGEND`
and the computed `PANEL_BOXES` were out of scope while the anti-vacuity guard passed on
`OMITTED_LAMPS`, the lamps NOT drawn, and a `PRIORITY ON` key added to the 1415 would have passed
green; the shape now matches any `const` array or object initializer, exported or not (the two
hits that widening surfaces are `const PANEL`, §5's markdown table — the research-diff target,
never drawn — whitelisted with that citation), a case walks `PANEL_BOXES`'s drawn labels directly,
and a per-file floor makes a blanked file visible. **In plain terms, because it is the most
important thing found in wave 5 so far**: criterion 18a's carrier was sweeping 258 labels and now
sweeps 418 — the 1415's own drawn tables (`keyboardView` 72, `lamps` 107, `keysView` 33,
`rotaryView` 14) were invisible to the refusal grep entirely, so a criterion whose whole job is to
prove that nothing architecture.md §12 refuses is drawn was not looking at the station where the
refusals live; it passed, it would have passed at merge, and it would have meant nothing. That is
the third vacuous-pass class this phase has met — after the control byte that blanks a file to
shell `grep`, and the `codeOf` comment-strip order that swallows code — and all three were caught
by review or by measurement, never by a gate going red: the strongest argument in this record for
the per-wave adversarial pass. The `PANEL_BOXES` walk is the right closer, since a `.map()`
initializer leaves no literal for a text shape to read. One refinement to criterion 18a ruled by
the main session at the close: the colour tokens gain their uppercase forms (`RED`, `CRIMSON`,
`#F00`, `#FF0000`) — no legitimate legend reads them — while the time-unit tokens stay
case-sensitive, which is what keeps `clock` apart from §8's `CLOCK`; the test header says the two
classes are matched differently and why. And **`#machine-room button` painted the 1402's
Fig.60 strip, the 1415's Fig.47 keys and the inquiry levers as beige page buttons** while the
stylesheet's own comment said the drawn keys were untouched — the comment had the lamps (spans)
and the keys (buttons) reversed. Ruled: the bare element keeps only `font: inherit; color:
inherit`, the skin moves onto the page-button containers (`.deck-box`, `.period-coding`,
`.period-specs`), the drawn strips fall back to their views' own inline looks, and the comment
now says which buttons are page controls and which are keys — with one refinement of the
builder's: the bare element keeps `font: inherit` but not `color: inherit`, because `.period-console`
sets a near-white legend colour on the dark cabinet and an unlit 1415 key with no inline background
would then be unreadable on the UA's light button face; the UA's own `buttontext` is right for every
bare button, and the three skinned containers set their colour explicitly. The census: every page
control sits inside those three containers except the 1403's bar/plain-white toggle and END OF
JOB, left bare in the one station drawn entirely from published figures. The majors: the three lamp custom
properties are declared and used by nothing — the four views hold those values inline and row 5
forbids the hoist — so the declaration now says a later phase hoists them and the header's
"flipping a ruling is one line" is narrowed to the six properties that are used; `--lamp-lens`
carried a false provenance (the value was a Selectric key-top colour) and now has an honest one;
and the tests run 919 lines against 340, most of it criterion 18a's carrier, with three hand-written strip-and-balance
parsers across three files — recorded, because the phase adds no shared test-support module, and
each header now says the duplication is deliberate; at 919 lines against the plan's 340 (+170%)
this is the largest single divergence from §3.9's arithmetic in the build, spent on criterion 18a's
carrier and on anti-vacuity floors — the number and the reason go to `PHASE-4-NOTES.md` §2 so
§3.9's totals do not stand unqualified at merge. Minors applied: `main.ts`'s and `period/mount.ts`'s
headers (the mount-chain row cited; `state` written and never read, `BOUNDS` pinning `form` and
`card` to no-ops, stated plainly); a `Reserved for wave 3` comment carried into the end-state
stylesheet; a caption comment that promised more than its rule set; the frame-loop test's header
describing prose V2 had trimmed. Recorded: `period/dom.ts`'s `cell`, `row`, `table` and `box` are
imported by nothing under `src/ui/period` — which is what makes scoping `table`, `td`, `fieldset`
and `legend` to `#internals` cost the period surface nothing, a fact the reviewer verified and
the wave had not stated; and the station headings are uppercased by CSS while their `textContent`
stays mixed-case, flagged before any test asserts one. The reviewer confirmed §14 R9's three walls
— no rule in `period.css` touches `#internals` and none in `index.html` touches `#machine-room`,
no period file imports `internals/panel.ts`, and exactly two imports cross the surfaces — the
grid's five areas in paper order, no number that matters in the stylesheet, `body` never styled,
the four whitelist entries (six — corrected at wave 6) as §8.2-required data and not convenience, and the source-side cost
(391 against 360; 651 against 640) inside tolerance.

**The screenshots — `docs/screenshots/phase-4/wave-5a-machine-room.png` and
`docs/screenshots/phase-4/wave-5a-internals.png`** (RULE 4; the main session against its own `npm
run dev` on this tree, all three workers holding; two captures, one per tab, because a single frame
cannot hold both). Drive: deck box `sample deck` → `PUT DECK IN HOPPER` → `READER START` → `END OF
FILE`; at the 1415 the display/alter/bootstrap sequence with `key the bootstrap` live; rotary `RUN`,
`START`; `hello-dad`'s five lines on the 1403. **§11.3 question 1, box order — PASS.** The five
stations sit in the desk's paper order — SPEC SHEET and CODING SHEET down the left with the 1402
below them, the 1415 the middle column, the 1403 the wide right column — each in its own framed area
with the pedestal band above it, and the three panels' published orders survived the stylesheet:
the §5 panel with STATUS right of ARITH, Fig.60's strip, Fig.69's rows. The two key strips read as
their views draw them and not as page buttons — the `#machine-room button` fix confirmed in pixels.
**§11.3 question 2, proportions — PASS.** The 1403 form is 132 positions unbroken under its ruler,
three lines to a bar, scrolling inside its own paper; the card faces are 7 3/8 × 3 1/4 with the cut
upper left on cream stock; the Selectric sheet is the tall-narrow form with its pin-feed holes
unobstructed by the `#machine-room pre` rule. **§14 R9 — PASS.** Laminate, paper and drawn panels on
MACHINE ROOM; the undecorated monospace fieldset-and-table debugger on INTERNALS, unchanged but for
the tab bar. The page on the 1403 is `hello-dad`'s five lines, the deck box's own sample. No defect.

**Addendum, recorded in wave 5b's commit** — the main session re-shot the desk before `48fec7e`
landed, so the two committed PNGs are the re-shoot and the paragraph above described its first
drive: in the committed captures the spec sheet and the coding sheet carry paper (`sample specs`
pressed; the shared X24-1336 column ruler and the generated source on show), so both are judged as
filled forms; the skinned buttons are exactly the three container sets (`sample deck` / `PUT DECK IN
HOPPER` / `key the bootstrap`; `sample program` / `ASSEMBLE` / the chain toggle / `PUNCH INTO
HOPPER`; `sample specs` / `GENERATE`); §6.5 ruling 5 held again through the restyled desk (`00000`
typed after START with no click); and **§14 R9 passes decisively** — a three-column desk on laminate
with cream stocks, pedestal bands, a charcoal cabinet and drawn key tops against a white page of
monospace fieldsets and browser-default buttons, nobody mistaking one for a restyle of the other.
**One measured consequence of the grid, ruled rather than fixed:** at a 1340 CSS px viewport the
three columns are narrow enough that the horizontal strips reflow — the 1402's Fig.60 strip into
five rows, the 1415's power/control cluster into two, the 1403's Fig.69 second group into 4 + 3 —
where wave 3's shot had Fig.60 as one strip at full page width. Published order survives in
reading order in all three. The build orchestrator accepted the main session's recommendation and
ruled: accept the reflow and record it, add no horizontal scrolling to a key strip. It is
viewport-dependent, not a fixed error — a wider screen gives fewer breaks, and a minimum width
would trade a reflow for a page-level scrollbar; a scrolling strip hides legends behind a scrollbar
on panels whose whole point is that every legend is visible at once; and reading order is what
criterion 18 and §11.3 ask about, and it is intact. Goes to `PHASE-4-NOTES.md` §4 as a carried
item for whoever revisits the desk's breakpoints.

**Gates (final wave-5a tree, `oracles/` present, all green):**

```
npm run typecheck                                            clean
npm test                                                     109 files, 1929 passed, 1 skipped
npm run smoke                                                6 files, 49 passed
npm run cc01                                                 PASS · CC01A · CC01 COMPLETE ·
                                                             instruction check at 00322 ·
                                                             1241 instructions
test/golden/hello-dad.page.txt                               348 bytes
test/golden/hello-dad.lst                                    2251 bytes
test/golden/sales-summary.page.txt                           3688 bytes
test/golden/sales-summary.lst                                6982 bytes
npm run build                                                clean (dist/index.html 3.03 kB,
                                                             assets/index-B1FA0dGu.css 5.54 kB,
                                                             assets/index-B25gZno6.js 288.51 kB; dist/ 296 kB)
grep -c 'src="\./assets' dist/index.html                     1
grep -rln 'requestAnimationFrame(' src/ui                    src/ui/main.ts only
shasum -a 256 src/ui/internals/controls.ts                   a6d90f54…f318f, unchanged
```

## Wave 5b — the two authoring stations

**What landed.** The second half of Zarathustrum's wave-5 split: seven `git mv`s and a restyle that re-implements
nothing. `period/autocoder/{sourceBox,listingView,objectDeckView,mount}.ts` → `period/coding/{sheetView,listingView,objectDeckView,mount}.ts`
and `period/rpg/{specBox,resultView,mount}.ts` → `period/specs/{sheetView,resultView,mount}.ts`, the
three session files staying where wave 0 put them so the four external test import lines never move
again. **The coding sheet** (§9.1): `FRAMING` on the page verbatim, `PLUS_NOTE`, `columnLegend()`,
`ruler()` computed from `SOURCE_FIELDS`, both column-exact textareas and the typed `setText(source,
dataCards)` survive; the one sample button is two, `sample program` and `sample data`;
`COMMENT_COLUMN` (6) and `LABEL_INDENT_COLUMN` (7) are drawn as tick marks on the ruler, imported
from `src/asm/types.ts`; the textarea stays a textarea under a period frame and header band, and
`THE_RULER_IS_THE_FORM` — the phase's largest deliberate fidelity gap, §14 R12 — is declared at that
point of use: the forms' columns are `[verified]`, their artwork is not digitised, and the refusal
stands on the artwork alone. The ruler's spans are exported as data (`RULER_FIELDS`, `RULER_MARKS`)
so a node test can hold them to the tables. **The listing** (§9.3): `renderListing` is not touched;
the C28-0326-2 §12 page heading is drawn around the `<pre>` as period furniture and never inside it;
the 1401 Autocoder heading is refused by name in the file's header; the A/H toggle is a display
transform — the view holds `renderListing(listing)` once at the default chain and paints the H view
through the shared `restrike()` from `paper/chain.ts`, restriking from the first `\n` on and
rendering the header line from the toggle's own state (§9.3's wart), exported as a pure
`paintedListing(rendered, chain)`. **The object deck** keeps decode-don't-remember and draws its
faces at the third scale through wave 3's `renderCardFace`. **`coding/mount.ts`** keeps
`invalidateArtifacts` and the `punch.disabled` rule byte-identical and additionally reads
`session.stale`. **The spec sheet** (§9.2): `ruler(kind)`, `sheetOf`, `activeLine` and the five
listeners survive exactly; the ruler is `SHEET_COLUMNS`' and redraws as the caret crosses from a
`D` Data line to an `L` Format line; a header band names the four X24 sheets and the refusal in
words; `SHEET_RULERS` is exported as data; **no facsimile form**. `specs/resultView.ts` draws the
memory map as one line from `layoutOf`'s own numbers — `CONSTANTS 00500 · CODE 00808 · IND 02533 ·
CDIN 02540 · PLINE 02700 · PLGM 02832 · HIGH 02833 · CTL 1`, §1 step 3's string byte for byte.
`specs/mount.ts` repoints its `SourceBox` type at `../coding/sheetView.js` and keeps the
`setText(handOff.source, handOff.dataCards)` hand-off and `invalidate`; `period/mount.ts` repoints
its two imports (RULE 2's importer edits for both moves). **`test/period-sheets.test.ts`** (411
lines, 21 cases) is new — a §3 file-list deviation, because §11 wave 5's clauses (c) and (d) name no
test file and every wave-5 test landed in 5a with no append sanctioned — and carries (c) the
restrike against both listing goldens and (d) the sheets' spans against their tables with the
defined grep. One §15 row lands in `open-questions.md`'s `### Wave 5b`; the ledger stays frozen.

**The oracle, §11 wave 5's remaining clauses.** (c) The two listing goldens do not move — 2251 and
6982 bytes — and `paintedListing(renderListing(l), chain)` equals `renderListing(l, { chain })` byte
for byte for both chains, first try, over `hello-dad`'s listing, over the Autocoder listing of the
RPG-generated `sales-summary` source (ungoldened), and — a plan correction recorded here —
`sales-summary.lst` is the RPG **specification** listing (`renderRpgListing` over
`buildRpgListing`, `src/rpg/listing.ts`), not an Autocoder listing, so §5.3's "two listing goldens"
is one of each and each is asserted against the renderer that made it; the H painting's first line
names chain H, the five duals swap in the body and none of the H glyphs was on the A page;
`listingView.ts`'s text imports `restrike` and its one `renderListing` call carries only the
literal `{ chain: PRINT_CHAIN_A_IS_DEFAULT }`. (d) `RULER_FIELDS` equals `SOURCE_FIELDS` field for
field — PG 1-2, LIN 3-5, LABEL 6-15, OPCOD 16-20, OPERAND 21-72, IDENT 76-80 (C28-0309-1 pp.5-7);
`RULER_MARKS` is `[6, 7]` from the two constants; `SHEET_RULERS[kind]` equals `SHEET_COLUMNS[kind]`
for all five sheets, each field once, leaves ascending and contiguous from column 1; the union of
every boundary covers 78 of the 80 columns (55 and 79 the exceptions), which is why the defined
grep is `rpg-columns-is-the-only-place`'s narrow mechanism plus a literal `N-M` span pattern, not a
blanket integer ban; it finds nothing under `coding/**` or `specs/**` and fires on a seeded literal.
(b) The three session import specifiers still resolve; the standing gate proves the two tier4
tests unedited.

**Where the build decided.** (1) `sales-summary.lst`'s provenance, above. (2) `listingView.ts`
passes `{ chain: PRINT_CHAIN_A_IS_DEFAULT }` — the literal default and nothing else — and the test
pins that exact form rather than banning the option entirely. (3) `specs/sheetView.ts` wrote the
card width as a literal `80`; it now imports core's `CARD_COLUMNS`, the same constant
`paper/cardGeometry.ts` uses. (4) `resultView.ts` prints the memory map as one line and no longer
prints the slack and code length separately — both follow from `IND` and `CONSTANTS` by
`layout.ts`'s own arithmetic, and the function's doc says so.

**Adversarial review (Opus): ready after fixes — no blocker, three majors, thirteen minors, every
gate green and both goldens byte-identical.** The majors: the stale note fired before any assembly
had happened — `stale` goes true on the first `setSource`, which the SEND TO AUTOCODER hand-off
is, so the storyboard's own happy path read "edited since the last ASSEMBLE … Press ASSEMBLE
again" with nothing retired and no "again" — gated now on a result existing, one condition,
`invalidateArtifacts` and `punch.disabled` untouched; the four header bands the wave drew carried
four geometries (inset, bleeding, station-wide, none), and all now take the spec sheet's bleed so
the two stations read as one desk; and the cost — the seven restyled files land at 1,015 lines
against ~795, three of them more than a third over (`coding/sheetView` 257, `coding/listingView`
187, `specs/sheetView` 176), 329 of the 1,015 comment, plus the 358-line sheets test §3 budgets
nowhere — recorded here as the overrun it is, +714 lines in all (wave 6: that sum does not re-add —
1,015 − 795 + 358 = 578, and the sheets test landed at 411 lines by `wc -l`, so +631). Minors applied: the listing's
error block moved above the C28-0326-2 strip so the heading sits over the paper; HEADR centred on
the strip (console-and-physical.md §12); `period/mount.ts`'s two hand-off citations restored at
their new lines; six stale forward references in `period.css` to `period/autocoder/**`,
`period/rpg/**` and "the next wave" repointed by comment-only edits (the mover owns dead
references, as ruled for `desk.ts`'s three); the `renderListing` grep hardened against the one
indirection that would defeat it; and §11 (d)'s "no column number anywhere" narrowed to what
the detector proves — `coding/listingView.ts:80-82`'s `pglin.slice(0, 2)` / `.slice(2)`
hand-encode `SOURCE_FIELDS`' page and line spans, Phase-3 code carried unchanged under "restyles
and may not re-implement", now a named, cited whitelist row so the literal is visible rather than
invisible. Two detector bugs X3 found in its own file by measurement, in the family of the
vacuous-pass findings already recorded: `/\{\s*chain/` was matching four `${chain}` template
interpolations and the toggle handler's `chain` assignment — a detector firing on its own file's
template strings proves nothing — and is now `/(?<!\$)\{\s*chain\s*[:}]/`; and `codeOf` now blanks
block comments in place rather than collapsing them, so a finding's line number is the file's own
and a whitelist row can honestly cite `:80` — a row that goes stale fails as loudly as a new
literal, which is why this test was re-run standalone, last, against `listingView.ts`'s final bytes
before the gate. That is the third refinement to this phase's file readers, after the comment-strip
order and the shell-versus-node rule, and the lesson goes to `PHASE-4-NOTES.md` §2 in one sentence:
every absence assertion in this phase needed its reader fixed before it meant anything, and none of
those fixes came from a gate going red. X1's header-band fix is a recorded deviation from the
literal instruction: the spec sheet's `-.5em -.6em` is `.rpg-spec-box`'s padding cancelled, and the
listing strip and object-deck band sit in `.period-coding` whose padding differs, so the same RULE
— bleed to the container's edge, text on its content column — was applied against each container's
own padding; the literals would have left a ledge on one band and pulled the other over the
listing's paper. Recorded, not changed: §3.4 names two intra-wave specifier edits; the build needed four in
all (not 2 + 4), because both session files stay behind (`'./session.js'` → `'../{autocoder,rpg}/session.js'`
in four files) — the plan's count, not the build; `git diff -M` at git's default 50% shows only
ONE of the seven as a rename, `{rpg => specs}/mount.ts` (`git diff -M20%` shows all seven; the
commit message's "three fall below" is wrong — six do — and stands as pushed, corrected here); the
(d) equality cases are structural, since `RULER_FIELDS` and `SHEET_RULERS` are pure maps over the
tables they are compared with, and the defined grep is the real guard on the drawn output; two
survivors are not byte-identical for good reason (`ruler()` emits the fourth tick line §9.1 asks
for; the spec sheet's `80` became core's `CARD_COLUMNS`); a fresh `sample specs` leaves the spec
ruler reading `UNIDENTIFIED SHEET` until the caret is placed (Phase-5 behaviour carried), so the
screenshot drive must click a `D` line and then an `L` line; criterion 18a's carrier cannot see
the five module-level string constants the two stations draw (`FRAMING`, `PLUS_NOTE`, `BAND`,
`BAND_FORMS`, `specs/mount.ts`'s `FRAMING`) — hand-checked clean, and 5a's file to widen; and
each authoring station opens with four horizontal elements (the pedestal band, an `hr`, the
station heading, the sheet's own masthead), pre-existing mount structure flagged for the shot.
The reviewer confirmed the survivor set byte-for-byte against `HEAD:`'s files, the sample-button
split, `memoryMapText`'s eight fields read straight off `layoutOf` with the header's `layout.ts:358-359`
claim verified, the 1401 heading refused verbatim against `console-and-physical.md:285`, the A/H
proof non-vacuous (the goldens carry real dualed glyphs), one new `OPEN:` block repo-wide, and the
§5.3 correction — `sales-summary.lst` is `renderRpgListing`'s, not `renderListing`'s — as a real
catch the plan got wrong.

**The screenshot — `docs/screenshots/phase-4/wave-5b-authoring-stations.png`** (RULE 4; the main session
against its own `npm run dev` on this tree, all three workers holding). Drive: SPEC SHEET `sample
specs` → a click into a `D` line, then an `L` line → `GENERATE` → `SEND TO AUTOCODER` → CODING SHEET
`ASSEMBLE` → the chain toggle → `PUNCH INTO HOPPER`. **§11.3 question 1 — PASS on all three parts.**
The spec sheet's ruler follows the caret in both directions — `DATA SPECIFICATION SHEET — SHARED X24
CARD LAYOUT` with the data field list on a `D` line, the FORMAT list (`47-47 zeroSuppress`, `48-50
fieldLength`, `51-75 constantOrEditControlWord`, `76-77 page`, `78-80 cardNumber`) on an `L` line —
the ruler is the form and it follows the line the operator is on; the coding sheet's ruler reads
`SOURCE_FIELDS`' six spans in published order with the tick marks where the plan puts them; and the
C28-0326-2 page heading is a strip around the paper — `date | HEADR | PAGE n · identification` on its
own dark band above a listing whose first line is still `1403 Model 2 · chain A · 66-line form`,
no `SEQ PG LIN` anywhere, which is what keeps `hello-dad.lst` at 2251 bytes. **§11.3 question 2 —
PASS, and the third scale is photographed at last**: the object-deck faces at the narrowest scale
measure 336 × 146 px, 2.30 against the card's 2.269, with the diagonal cut at the upper LEFT,
captioned `object deck, card 1` over `load address 00500, count 50, sequence 001` — closing the item
wave 3's shot flagged as unreachable; the listing sits on green bar under its heading and scrolls
inside its own paper. The stale-note fix held on the live path (`Press ASSEMBLE.` after the
hand-off, not the stale note). The chain ran end to end with the plan's numbers: `No diagnostics.`,
the memory map `CONSTANTS 00500 · CODE 00808 · IND 02533 · CDIN 02540 · PLINE 02700 · PLGM 02832 ·
HIGH 02833 · CTL 1`, 254 Autocoder source cards, 0 flagged lines, 39 condensed cards at entry 00808.
**And the gate item made visible**: the spec station's masthead states the declared fidelity gap
to the operator in its own words — "X24-1336 · X24-1337 · X24-1338 · X24-1339 — column layout
from J24-0215-2. The ruler is the form: the columns are verified, the artwork of the four sheets is
not digitised, and none of it is drawn" — §14 R12, one of the two items the plan flagged as Zarathustrum's,
said on the page and not only in a document, the difference between a limitation and an
undisclosed one. Framed: the listing's foot, the OBJECT DECK band and two faces at the third scale
with their captions; the heading strip, the two rulers and the ruler switch are above the fold and
were verified at full size. No defect.

**Gates (final wave-5b tree, `oracles/` present, all green):**

```
npm run typecheck                                            clean
npm test                                                     110 files, 1950 passed, 1 skipped
npm run smoke                                                6 files, 49 passed
npm run cc01                                                 PASS · CC01A · CC01 COMPLETE ·
                                                             instruction check at 00322 ·
                                                             1241 instructions
test/golden/hello-dad.page.txt                               348 bytes
test/golden/hello-dad.lst                                    2251 bytes
test/golden/sales-summary.page.txt                           3688 bytes
test/golden/sales-summary.lst                                6982 bytes
npm run build                                                clean (dist/index.html 3.03 kB,
                                                             assets/index-B1FA0dGu.css 5.54 kB,
                                                             assets/index-Bzb6D76t.js 291.77 kB; dist/ 300 kB)
grep -c 'src="\./assets' dist/index.html                     1
grep -rln 'requestAnimationFrame(' src/ui                    src/ui/main.ts only
shasum -a 256 src/ui/internals/controls.ts                   a6d90f54…f318f, unchanged
```

## Wave 6 — the storyboard and the documents

**What landed.** One test and three documents, and no `src/` file: `test/tier4-period-storyboard.test.ts`
(§1's storyboard end to end in node, one case, joining `npm run smoke` — **7 files / 50**),
`PHASE-4-NOTES.md` (§16 item 8's four sections), the completed dated Phase 4 section of
`docs/research/open-questions.md` (every §15 row present under the wave that first depended on it,
`INQUIRY_ENTRY_IS_PRE_SUPPLIED`'s wording amended in place per §6.6 with the two wave-4 refinements),
and this closeout. `docs/DECISIONS.md` and `docs/STATUS.md` are the main session's at merge.

**The storyboard, headless (§1, criterion 16) — `test/tier4-period-storyboard.test.ts`, 316 lines, one
case.** `demos/sales-summary.rpg` → `RpgSession.generate` with no diagnostics and the memory map
`CONSTANTS 00500 · CODE 00808 · IND 02533 · CDIN 02540 · PLINE 02700 · PLGM 02832 · HIGH 02833 · CTL 1`
exact → `handOff()` → the Autocoder session's `assemble()` `ok` with zero flags and zero warnings,
`stale` false, then true on a one-character edit with `hopperText()` empty (constraint 11) → 94
cards into the hopper, READER START and END OF FILE through the unit-record session → at the 1415,
through a real `ConsoleSession` with spy hooks: STOP, DISPLAY, START, `00000` one key at a time, the
`D` pair, ALTER, START, **the twelve characters of `AL%1000012$R` pressed one at a time with the WORD
MARK key before the second and the twelfth**, COMPUTER RESET committing the `A` line with its two
marks and marking storage at 00001 and 00011, RUN, START → the frame's four-term gate emulated
until `machine.start(START_BUDGET)` returns `'halt'` on the second frame → the paper: three
`FormPage`s (2, 3, 4), two inked, `printedThrough` 60 / 9 / 0, and §5.1's identity equal to
`test/golden/sales-summary.page.txt` byte for byte; the eject's crossings `[{57,9},{60,12}]` with
both channel indicators false; the log reading `S S D D S A S` — four `S` lines at matrix 35, the
`D` pair, `A AĽ%1ØØØØ12$Ř` at 30; sixteen drivable lamps with `STATUS · B=A` and `SYSTEM CONTROLS ·
STOP` lit after the halt (a fresh machine's `B<A` is the reset asymmetry; after this deck the pair
is `B=A` and STOP). Then the inquiry: REQUEST holds, a marked message is typed, RELEASE queues the
entry — **and the generated program never issues `RCP`**, so the released inquiry types nothing:
asserted as an absence with its reason, and the positive taken on a second machine in the same case
with a planted `M %T0 00500 R` console read (io.md §8 step 5), which types one `I` line, `I ȞI`, at
matrix 30 with its word mark and clears the pending row once the machine has typed. Two plan
corrections the storyboard carries in its header: §11 wave 6's "2 forms" and "`straddled` reports
none" are wave 2's findings again (three pages, two inked; the eject crosses 57 and 60); and §1
step 14 / criterion 16's `I` line assumed a program that reads the console, which the RPG-generated
report does not. `npm run smoke` is **7 files / 50 passed**; `npm test` unmoved at 110 / 1950 / 1.

**Adversarial review (Opus): ready with fixes — one blocker, five majors, six minors, every one in
the documents; the machine work stood** (every gate re-run green; the three ledgers — plan §15,
`open-questions.md`'s Phase 4 section, `PHASE-4-NOTES.md` §1 — re-derived at 39 rows / 40 names and
set-equal pairwise in both directions; every sampled line reference resolving; both plan
corrections confirmed as the machine's numbers by `run-deck` — `carriage page 4 line 1` — and by
wave 2's own assertions; the planted `M %T0 00500 R` an honest positive). The blocker: this
section's review slot was a literal placeholder — filled by this paragraph. The majors: drafting
scaffolding shipped into `open-questions.md`'s `### Wave 6` ("which the orchestrator writes in place
of this marker") — clause removed, the two paragraphs folded; `PHASE-4-NOTES.md` §3 said "four
whitelist rows" against the test's six and this closeout's own criterion-18a line — corrected to
six, and the wave-5a paragraphs above that first counted four are annotated in place rather than
rewritten; the `panel.ts` bullet's "four sites still say 16/2" omitted the gated one, §13
criterion 3 — five; "git's default 50% shows four of the seven `git mv`s as renames" — it shows
ONE (`{rpg => specs}/mount.ts`), `-M20%` shows seven, and 5b's commit message carries the same
error, which stands as pushed and is corrected in 5b's paragraph and the notes; and an unlogged
deviation — criterion 18a's whitelist planned at one entry and shipped at six, five of them the
`lamps.ts` data §8.2 requires — given its §2 bullet. The minors: the `OPEN:` count reconciled in
both documents as 43 matching lines, four of them references (`cardGeometry.ts:13`, `:26`,
`carriageView.ts:256`, `keysView.ts:80`), 39 blocks; the notes' source-side line counts restated
under `wc -l`, the convention the test-side ones already used; criterion 11 given its file; 5b's
specifier sentence re-read as four files in all, not 2 + 4; the storyboard's `:210` comment no
longer claiming four load-bearing terms inside a loop where only `frame.running` varies (316 lines
after the rewording, still one case); and "418 drawn labels" marked as the 5a worker's instrumented
count against the asserted floor of 300. Nothing under `src/` moved for any of it; the gate below
was re-run after the comment edit.

**Two things to carry from the review's close.** First, the method that fixed the notes is the
standard the whole-branch review should hold to: the notes worker re-measured every claim at HEAD
before editing, reproduced all six of the reviewer's findings, and corrected two figures the
reviewer had wrong — 4,096 → 4,409, and a "313" the notes never cited — rather than taking them on
trust. Second, the test-line ladder, stated once with its reason: §3.9's sixteen `npm test` files
landed at 3,682 lines against 2,075; seventeen with `period-sheets` at 4,093; the storyboard at 316
against ~240; the phase's eighteen test files at 4,409 against §3.9's 2,315 — +90%, the phase's
largest divergence from its own arithmetic at the phase level (wave 5a's 919 against 340, +170%,
is the largest single-wave one). The growth is in anti-vacuity floors, whitelists that carry
citations, and the absence-detectors that five separate findings showed were reading
less than they appeared to — the single most valuable thing this phase learned, stated once and
completely: (1) a stray control byte in `logView.ts` making shell `grep` treat the file as binary
and suppress matches; (2) `period-reader.test.ts`'s `codeOf` stripping block comments BEFORE line
comments, so a line comment containing `src/ui/**` opened a false block and swallowed live code;
(3) criterion 18a's refusal grep matching only exported consts — 258 labels swept, the entire 1415
invisible, 418 after the fix; (4) `/\{\s*chain/` matching four `${chain}` template interpolations
and the toggle's click-handler block, so the detector fired on its own file's strings; (5) `codeOf`
collapsing block comments to a space rather than blanking them in place, desynchronising every
line number a whitelist row cites. That is
where this phase should have spent lines, and it did; §3.9's totals are not merely wrong. This
paragraph, the criterion-3 statement below and the notes' matching edits land in a second wave-6
commit: the coordinator's rulings arrived after `af44d45` was pushed — a departure from one commit
per wave, recorded here as one.

**The per-wave screenshot record (RULE 4).** Six PNGs under `docs/screenshots/phase-4/`, all taken by
the main session (whose seat has the Chrome extension) against `npm run dev` at each wave's HEAD
before that wave's commit, every worker holding: `wave-2-1403.png` (182 KB — the tape strip, its two
banners, the three panel groups; two in-wave defects found by the shot alone: the strip collapsed by
a `font-size` presentation attribute, the colliding two-digit headings), `wave-3-1402.png` (369 KB —
the read-station face, the Fig.60 strip with POWER lit, the card aspect measured at 2.272 against
2.269), `wave-4-1415.png` (457 KB — the reduced panel with its omissions absent not dark, the
Selectric form's seven lines, §6.5's focus rule holding with no click), `wave-5a-machine-room.png`
(577 KB) and `wave-5a-internals.png` (191 KB — the desk in paper order and the unchanged debugger,
§14 R9 passing decisively, the key-strip reflow at 1340 px ruled and recorded), and
`wave-5b-authoring-stations.png` (366 KB — the rulers, the C28-0326-2 heading around the paper, the
object-deck faces at the third scale, cut upper left, measured at 2.30). Five per §13's moved count
under the split — six files, because 5a's two tabs could not share a frame.

**The nineteen exit criteria at close-out (§13), commands run on this tree, `<base>` = `6755b1d`.**
1. `npm run typecheck` clean. 2. `npm test` **110 files / 1950 passed / 1 skipped / 0 fail** and
`npm run smoke` **7 files / 50 passed**, `oracles/` present (§12.1's target: 109 / ≈1,930 / 1 and
7 / 50 — 110 because `test/period-sheets.test.ts` was added under the split; §12.1's file count is
corrected to 110 here, not in the plan). 3. `shasum -a 256 src/ui/internals/controls.ts` =
`a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f`; `git diff --numstat <base>..HEAD`
over `controls.ts`, `coreView.ts`, `registerView.ts` prints nothing and over `panel.ts` prints
**`3 17`** — wave 1's fold, seventeen deleted and three added. **Criterion 3 as written — "exactly
16 deleted / 2 added" — does not pass on this tree, and it was never evaluated on that literal**:
wave 1 measured `3 17`, traced the extra line to the `ConsoleLine` token `noUnusedLocals` forced
out of the type import, recorded the plan's 16 / 2 as stale at five sites — this criterion among
them — and every gate since has checked the criterion against the measured fold. So it passes
only on that reading, and the merge gate should take it as such: the evidence that the fold is
correct is the criterion's other half (the three SHA-pinned files unchanged) and criterion 5's
cc01 byte-identity, which exercises the very console line the fold moved. 4. `git diff --stat
<base>..HEAD -- src/core src/asm src/rpg src/formats tools demos test/golden` is exactly
`test/golden/card-face-a.svg.txt | 19 +`. 5. `npm run cc01` byte-identical: CC01A, CC01 COMPLETE,
instruction check at 00322, 1241 instructions. 6. The four goldens 348 / 2251 / 3688 / 6982 bytes
unmoved; `git log --follow` puts the last commit to `cycle-probe.page.txt` (2522 B) and
`card-list.page.txt` (120 B) at `0a1b0c6`, 2026-09-01, Phase 5. 7. `test/period-selectric.test.ts` —
the Exhibit II slice byte for byte at `{flush, strip, ignore}`, the named cases separate. 8.
`test/period-page.test.ts` — §5.1's identity over the three shipped page goldens re-run and the
synthetic three-form paper, every entry 132, `page.ts` importing nothing from `printer1403.ts`. 9.
`test/period-printer.test.ts` — the straddle under the ruled derivation: cycle-probe
`[{60,12}]` with `channel12 === false` on the same frame, the banner verbatim with
`printer1403.ts:354`, sales-summary's eject `[{57,9},{60,12}]` asserted as true and the negative
synthetic (the plan's "empty" corrected). 10. `test/period-console.test.ts` — all thirty ordered
pairs, one `S` each, RUN→DISPLAY→RUN two, the `halt` spy on every turn; `git diff --stat
<base>..HEAD -- src/core/machine.ts` empty. 11. `test/period-console.test.ts`, same file as 10 — the keyed dialogue, the refused ALTER, the
word mark gone from storage, the twelve bootstrap characters. 12. `test/period-chain.test.ts` — the 64-code
bijection both ways, the duals sliced from charset.md, no second chain table, no `paper/chain`
import under `src/asm`; `hello-dad.lst` at 2251. 13. `test/period-cardgeometry.test.ts` — the golden
through `cardGeometry.ts`, `holePath` against `punchMask`; no oracle instantiates a view. 14.
`test/period-light-panel-vs-research.test.ts` — both directions against §5 modulo the eight
omissions, sixteen drivable, STATUS right of ARITH, the register grep empty, the REDUCED label. 15.
`test/period-session.test.ts` — constraint 11 on both sessions; both tier4 tests pass with only
their wave-0 import line changed. 16. `test/tier4-period-storyboard.test.ts` — §1 headless, one
case, in `npm run smoke` at 7 / 50 — **with a plan correction**: §11 wave 6's oracle clause "the `I`
line from a released inquiry" cannot be met on the shipped deck, because `sales-summary` issues no
`RCP`; the released inquiry is queued and types nothing (asserted as an absence with its reason), and
the `I` line is produced on a planted `M %T0 00500 R` read on a second machine in the same case —
the second place a reviewed plan asserted an end state the demo does not produce (the straddle
oracle was the first); `PHASE-4-NOTES.md` §2 carries it. 17. `npm run build` clean; `grep -c 'src="\./assets'
dist/index.html` = 1; `vite.config.ts:5` `base: './'` its only Phase-4 change; `dist/` **300 kB**
under 400 kB. The "opens from the filesystem" clause is **command-green on the evidence and not on
the render**: `dist/index.html` references both assets relatively (`src="./assets/index-Bzb6D76t.js"`,
`href="./assets/index-B1FA0dGu.css"`); `grep -c 'src="/assets' dist/index.html` = 0; no `fetch("/`,
`from"/`, `src="/` or `href="/` in the emitted JS or CSS (0 and 0); the only `http` string in the
bundle is `http://www.w3.org/2000/svg`, the `createElementNS` namespace, never fetched — so the page
makes no network request by construction. **Nobody has opened it over `file://`**: every browser
check in this phase (waves 2, 3, 4, 5a, 5b) ran against `npm run dev` on `localhost:5173`, and the
main session's browser tooling refuses `file://` URLs. **RULED BY ZARATHUSTRUM 2026-09-02: accepted and
recorded, not fixed.** The built page emits `<script type="module" crossorigin
src="./assets/index-….js">`, and a module script is blocked by CORS over a `file://` origin in
Chrome, Firefox and Safari alike — so this clause is **unmeetable as built**, and the relative asset
paths `base: './'` bought are necessary but not sufficient for it. Making it pass would mean a
classic-IIFE bundle (`rollupOptions.output.format`), a build-format change after eight gated waves,
for a property the plan asserted without checking; the page works from any server and that is what
the showcase needs. Criterion 17 stands GREEN on its command evidence with this clause struck and
its reason recorded. An earlier draft of this line credited the
render to the 5a browser check; that check did not happen. The render itself is folded into
criterion 19's walk below.
18a. `test/period-refusal-grep.test.ts` — the §12 tokens and the time units over 418 drawn labels
(the 5a worker's instrumented count; the test asserts a floor of 300), six cited whitelist rows
against the plan's one — a deviation recorded in `PHASE-4-NOTES.md` §2 — the colour tokens in both
cases. 18b. `test/period-keydown-ownership.test.ts`
— `keydown` in `console/keyboardView.ts` alone, no `document`/`window` listener, `.press(` only
under `console/`. **19. The human walk — WALKED BY ZARATHUSTRUM, 2026-09-03**, and it found a defect no
oracle in this phase could see. He took §1 from the authoring end — coding sheet, ASSEMBLE, PUNCH
INTO HOPPER — and stopped dead at the load: *"i got to the point where i have punched cards.
however, no matter what ive tried they wont load. i suspect bug."* He was right. `key the bootstrap`
called `ConsoleSession.keyBootstrap`, whose §6.5 ruling-3 guard (`keyboard.state !== 'data'`) is
CORRECT but returned `void`, so the refusal was invisible to its caller; the deck box wrote its
affirmative note unconditionally. The button reported keying `AL%1000012$R` at the 1415 while the
Selectric stayed blank, then instructed COMPUTER RESET / RUN / START into a machine with nothing
loaded — no error, no lamp, no console line. Compounding it, the PUNCH INTO HOPPER note ended at
END OF FILE and never named the console dialogue, leaving the operator at step 7 of a sixteen-step
procedure with no signpost. **Seven gated waves, per-wave Opus review, RULE 4's six screenshots,
1,950 tests and a `ready-with-notes` whole-branch review all passed over it**; a person at the desk
found it in one sitting. §14 R11 said this criterion existed because the art is judged by oracles
that cannot see it — the record should show the criterion earned its place on its first outing.
Criterion 17's render clause, folded in here, is discharged in the same sitting: the desk drew and
the three stations laid out as §14 R9 requires.

**What the walk bought.** The defect was one instance of a class — a control calling something that
can silently refuse, and a caller that paints success anyway. An audit of the whole period surface
found five more, every one reproduced at runtime against a real `Machine`: INQ CAN discarded nothing
and, mid-ALTER, still committed the cancelled text to storage on the next control action; a refused
DISPLAY address vanished looking exactly like success, the pending row cleared before the guard; START
in ALTER with nothing displayed fell off the end of `startKey` under a drawn caption promising it
unlocks the keyboard; a stray INQUIRY RELEASE queued a phantom entry a later program read would
consume as Figure 45's Condition; and M2 stalled silently in both directions. All six are fixed in
`e6b2d08`, `afbcaf3` and `1c81ac5` — each verified in the browser, not merely in test — and M2 was
reopened on Zarathustrum's call, taking §4's candidate 1: the gate is explained, not opened. `d37cb52` adds
`test/period-a-refusal-is-visible.test.ts`, which sweeps every click handler under `src/ui/period/**`
for a `.textContent` write with no branch, and every `: void` early return for a cited reason; it
failed red on a seventh site, `coding/mount.ts`'s punch handler, before that was fixed too.
**Why nothing caught this**: `period-console.test.ts` already proved those refusals at the session
level, but it imports no view, so it cannot see that the caller ignored the answer;
`period-keydown-ownership.test.ts` sweeps `.press(` callers, not return values;
`period-refusal-grep.test.ts` reads drawn label text and never looks at a handler. Both halves of the
bug were tested, in two files that never meet.

**The storyboard end to end, after the fixes**, re-driven on `main`: the punch path — `sample program`
+ `sample data` → ASSEMBLE → PUNCH INTO HOPPER → PUT DECK IN HOPPER → READER START → END OF FILE →
DISPLAY, START, `00000` → ALTER, START → `key the bootstrap` → COMPUTER RESET → RUN → START — printing
the reentry table at form 2, line 1, five lines; and the full RPG chain, `sample specs` → GENERATE
(`No diagnostics.`, the memory map `CONSTANTS 00500 · CODE 00808 · IND 02533 · CDIN 02540 ·
PLINE 02700 · PLGM 02832 · HIGH 02833 · CTL 1`, **254** source cards) → SEND TO AUTOCODER → ASSEMBLE
(**0** flagged lines) → **39** condensed object cards at entry 00808 → the hand-keyed bootstrap → a
four-form, 62-line report. Every number §11 wave 6 predicted, met on the desk. The typed `00000` again
landed on the Selectric with no click, which is §6.5 ruling 5 holding for the third recorded time. One action rides inside it: the walk note for §1 step 14: the inquiry hold and release are demonstrable on the desk,
but the `I` line appears only when a program reads the console, which this demo does not do — a
released inquiry that types nothing on the `sales-summary` run is correct behaviour, not a bug. One line outside §13: `package.json` carries one added script line since `<base>`,
the main session's deferred-work register (`6263d2e`), not a wave's — §3.7's "no script is added"
holds for the waves.

**The build, added up.** Seven wave commits above `<base>` (`4932bee`, `d3b3984`, `d837aab`,
`4cfaf38`, `9b5d0de`, `48fec7e`, `21b86a1`) plus this one; the gate moved 93 / 1745 / 1 → 110 / 1950
/ 1 and 6 / 49 → 7 / 50, every step stated in its commit; the four goldens and the cc01 transcript
never moved; 43 `OPEN:` matches under `src/ui/period/**`, four of them references to blocks (`cardGeometry.ts:13`,
`:26`, `carriageView.ts:256`, `keysView.ts:80`), 39 blocks for §15's thirty-nine rows; every worker on Opus or Sonnet under a Fable build orchestrator — from
wave 4 by Zarathustrum's decision under an Opus main seat.

**Gates (final wave-6 tree, `oracles/` present, all green):**

```
npm run typecheck                                            clean
npm test                                                     110 files, 1950 passed, 1 skipped
npm run smoke                                                7 files, 50 passed
npm run cc01                                                 PASS · CC01A · CC01 COMPLETE ·
                                                             instruction check at 00322 ·
                                                             1241 instructions
test/golden/hello-dad.page.txt                               348 bytes
test/golden/hello-dad.lst                                    2251 bytes
test/golden/sales-summary.page.txt                           3688 bytes
test/golden/sales-summary.lst                                6982 bytes
npm run build                                                clean (dist/ 300 kB)
grep -c 'src="\./assets' dist/index.html                     1
shasum -a 256 src/ui/internals/controls.ts                   a6d90f54…f318f, unchanged
```
