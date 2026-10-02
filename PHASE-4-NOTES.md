# PHASE-4-NOTES — the period UI

## 1. [unverified] / [likely] fallbacks hit (each behind a named constant with // OPEN:)

The table is the exact set of `OPEN:` names reached under `src/ui/period/**`, plus the core
constants this phase makes visible by citing them at a point of use and never redeclaring —
`CONSOLE_LINE_LENGTH`, `DEFAULT_CARRIAGE_TAPE`, `HALT_TYPES_NO_PRINTOUT` and `PRINTED_BLANK` have
rows of their own; `CARRIAGE_SENSES_AT_DESTINATION_ONLY` is cited inside the straddle row rather
than given one; `INQUIRY_ENTRY_IS_PRE_SUPPLIED` is amended in place in `open-questions.md` (§6.6)
and has no row. Each row is also recorded in `docs/research/open-questions.md`, `## Phase 4 —
2026-09-02`, under the wave that first depended on it, in that file's own four-column shape.

SUPERSEDED 2026-09-04 — the `HALT_TYPES_NO_PRINTOUT` named in the sentence above no longer
exists: Phase 6 wave 0 renamed it `PROGRAM_STOP_TYPES_S`, `[verified]` against S223-2648 p.6.
The sentence stands as Phase 4 wrote it; the constant it cites is now the new name. See
`docs/BUILD-LOG-6.md` wave 0 and `docs/plans/phase-6-reentry.md` §9. **The paragraph below is
superseded with it, and the number is the point:** wave 0 replaced `console/session.ts`'s
`OPEN: HALT_TYPES_NO_PRINTOUT` block with a `RESOLVED:` one, which removes one `OPEN:` token, so
`grep -rn "OPEN:" src/ui/period src/ui/styles` returns **42** matching lines and **38** blocks —
not the 43 and 39 below. The four references-rather-than-blocks are in files Phase 6 does not
touch and are unchanged, so the arithmetic is still 42 − 4 = 38. Measured 2026-09-04; Phase 4's
§16 item 3 sweep was never written, so nothing goes red on this and a reader is the only check.

`grep -rn "OPEN:" src/ui/period src/ui/styles` returns **43 matching lines**. **Four** of them
are references to a block rather than blocks — `paper/cardGeometry.ts:13` and `:26`,
`printer/carriageView.ts:256`, `console/keysView.ts:80` — leaving **39 blocks** carrying **39
distinct names**: `paper/carriage.ts:51` carries the straddle pair's two names and
`CONSOLE_LINE_LENGTH` is cited in two blocks, so the two cancel. Collapsing the pair to one row and
adding `PRINTED_BLANK` — cited in `test/period-selectric.test.ts:23`, not under `src/ui/period` —
gives **39 rows**, against §15's thirty-nine. **Both set differences are empty**: no §15 row went unreached, and no row was
invented after the wave-1 freeze. `HOPPER_SLIVER_LIMIT` (`paper/cardGeometry.ts:197`) and
`CARRIAGE_CHANNELS` (`paper/carriage.ts:46`) carry no `OPEN:` on purpose and are therefore not
ledger rows — see §2. `PRINT_POSITIONS` and `LINES_PER_BAR` (`paper/page.ts:55`, `:64`) are
carried numbers, not ledger names.

Confidence per row follows wave 0's bounded primary read and what the waves established, not
older wording in plan §15. Paths below are relative to `src/ui/period/` unless stated; the second
number is the exported declaration.

| Constant | Tag | Where | Fallback taken |
|---|---|---|---|
| `CARD_GEOMETRY_IS_SECONDARY` | `[likely]`, secondary only | `paper/cardGeometry.ts:53` (`:60`) | Use the 0.087 in column pitch, 0.250 in row pitch and 0.055 × 0.125 in rectangular holes; they reproduce a correct 7 3/8 in card. ANSI X3.21-1967 governs if exactness ever matters. |
| `CARD_SIZE_7_3_8_BY_3_1_4` | `[likely]` | `paper/cardGeometry.ts:62` (`:68`) | 7 3/8 × 3 1/4 × 0.007 in, appearing once as `cardW` 737.5 / `cardH` 325 and scaled by CSS width. The aspect ratio is uncontested across sources. |
| `CORNER_CUT_IS_UPPER_LEFT` | `[likely]` | `paper/cardGeometry.ts:123` (`:129`) | Upper left, per the 5081-style layout form. Reversing it is one `M` command in `outlinePath` plus a re-cut of `test/golden/card-face-a.svg.txt`. |
| `INTERPRETATION_BAND_PRINTS_THE_64_GLYPH_SET` | `[unverified]` — new in Phase 4 | `paper/cardGeometry.ts:146` (`:155`) | Print the band in the 64-glyph chain set. The plan's "1415 typeball" attribution was withdrawn in the module header (review round 1). |
| `MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT = 30` | `[likely]`, **narrowed** by wave 0's read of S223-2648 p.6 — new in Phase 4 | `console/selectric.ts:59` (`:84`) | Render the difference `matrixPos − 30`, never an absolute column from the paper's left edge. Declared as the numeric origin `30`, not `= true`. |
| `H_CHAIN_IS_A_FIVE_GLYPH_RESTRIKE_OF_THE_A_PAGE` | ruling, ours, over `[verified]` device behaviour; refusal priced at ≈4 `src/core` lines plus a machine rebuild per toggle | `paper/chain.ts:44` (`:62`) | Restrike the five duals over the printed A page as a display transform; do not thread `MachineOptions.printer` into `new Printer1403(…)`. Bijection proved both ways over all 64 codes. |
| `PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR` | ruling, ours — new in Phase 4 | `paper/page.ts:26` (`:45`) | `page.ts` imports `PrintLine` and `CarriageState` from `src/core/types.ts` and nothing from `printer1403.ts`, so the free identity is not a tautology; `PRINT_POSITIONS` is declared independently for the same reason. |
| `STRADDLE_IS_SHOWN_NOT_FIXED` / `CROSSED_PUNCH_IS_DERIVED_FROM_THE_LAST_PRINT_AND_THE_FINAL_CARRIAGE` | ruling, ours, over a KNOWN DIVERGENCE from a `[verified]` sentence; cites core's `CARRIAGE_SENSES_AT_DESTINATION_ONLY` (`printer1403.ts:329-354`) | `paper/carriage.ts:51` (`:89`, `:90`); drawn at `printer/carriageView.ts:259` | Derive the crossed punch from the last print on the last INKED form plus the final carriage; hatch it under `STRADDLE_BANNER` and do not patch the core. The refused fix — calling `senseChannels()` from `advanceOneLine()` — moves `test/golden/cycle-probe.page.txt`. |
| `PRINTED_BLANK` (`src/core/printout.ts:40`) | `[unverified]`, existing, inherited from Phase 1 — the one inherited constant an exit criterion keys on | cited in `test/period-selectric.test.ts:23`; never redeclared under `src/ui/` | Keep the small `b` inside a fixed-format S/C/E/B/`#` field. The refused core change is one constant, and the byte-pinned cc01 transcript moves with it. |
| `GREEN_BAR_IS_THE_DEFAULT_WITH_A_WHITE_TOGGLE` | `[unverified]` | `printer/formView.ts:52` (`:64`) | Green bar by default, plain white one click away — the toggle IS the fallback, carried from `printerView.ts`. Phase 6 needs the white side. |
| `DEFAULT_CARRIAGE_TAPE` (`src/core/devices/printer1403.ts:212`) | `[unverified]`, existing | cited at `printer/carriageView.ts:38`; never redeclared | Draw the device's own `machine.printer.tape` object — 66 lines, channel 1 at line 1, channel 9 at 57, channel 12 at 60 — and label the two lamps as the emulator's. No manual publishes any site's tape punching. |
| `FORM_FEED_IS_A_SLIDE_NOT_A_SIMULATION` | `[unverified]` source, **REFUSAL** in consequence | `printer/formView.ts:67` (`:83`) | A completed form slides onto the stack in one 200 ms transform; lines appear as the device prints them. 600 lpm is a SPEED spec, not a motion spec. |
| `LINES_PER_BAR_IS_THREE` | `[likely]`, modern vendor specs | `printer/formView.ts:35` (`:49`) | Three line positions per bar at 6 lpi, carried from `printerView.ts:35` with its comment. Four at 8 lpi; a wrong pitch costs a shade and nothing else. |
| `NO_WORD_MARKS_ON_THE_1403_PAGE` | record — `[verified]`, no fallback wanted | `printer/formView.ts:86` (`:99`) | Draw no overstrike. One caption under the form says what the blank preceding a marked character is. |
| `CARD_STOCK_IS_CREAM` | `[unverified]`, **no citation exists** — new in Phase 4 | `reader/cardFaceView.ts:78` (`:86`) | `#f7f3e8`, one named custom property (`--card-stock`, `src/ui/styles/period.css:124`). Reverting to the shipped `#fff` is one line. |
| `THE_1402_ELEVATION_IS_NOT_DRAWN` | contradictory source | `reader/hopperView.ts:35` (`:45`) | Retired by drawing no elevation at all; recorded so a later phase does not rediscover the 35 in height that reads low against photographs. |
| `PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT` | ruling, ours, over `[verified]` figure content — new in Phase 4 | `reader/hopperView.ts:59` (`:71`) | Draw the punch feed per Fig.59 with its hopper empty, PUNCH START / PUNCH STOP grey and captioned inert, and one line saying this 1402 reads and does not punch. |
| `THE_HOPPER_DRAWS_THE_LOADED_DECK` | ruling, ours, over a `[verified]`-in-code invariant — new in Phase 4 | `reader/hopperView.ts:47` (`:57`) | Draw `session.hopperCards(reader)` and never the parsed textarea, so retyping the deck box does not move the hopper. The face is captioned `loaded deck, next card`, no ordinal. |
| `POWER_AND_READY_ARE_DRAWN_LIT` | ruling, ours — new in Phase 4 | `reader/keysView.ts:68` (`:77`); the 1415 half at `console/keysView.ts:80` | Three legends lit as constants because the machine is on. `LIT_CONSTANTS` is `['POWER']` on the 1402 and `['POWER ON', 'READY']` on the 1415, and both are asserted by name. |
| `ROTARY_DETENTS_ARE_60_DEGREES_APART` | `[likely]` derived from `[verified]`, **strengthened** by wave 0's measurement of S223-2648 Fig.2 p.7 — new in Phase 4 | `console/session.ts:58` (`:69`) | Six detents 60° apart with RUN at twelve o'clock, in `console-and-physical.md` §3's clockwise order. The degrees remain our arithmetic over a measured photograph; no page prints them. |
| `NO_KEY_TRAVEL_ANIMATION` | **REFUSED — not open** | `console/rotaryView.ts:42` (`:56`) | Detents snap; keycaps do not depress. §3 publishes positions, not mechanics. |
| `SELECTRIC_RIBBON_IS_BLACK_SINGLE_COLOUR` | `[unverified]` — new in Phase 4 | `console/logView.ts:60` (`:72`) | Black on off-white, one colour, one custom property `--ribbon`. Every period photograph is monochrome and no page names a ribbon colour. |
| `UI_ONLY_DETENTS_TYPE_S_THROUGH_STOP` | ruling, ours, over a `[verified]` rule; refusal priced at 10-15 `src/core` lines plus a fifth MODES row in the byte-frozen `controls.ts` — new in Phase 4 | `console/session.ts:81` (`:105`) | DISPLAY and C.E. type their `S` through `machine.stop()` and leave `machine.mode` untouched; the session's own `detent` carries the frame gate instead. |
| `ALTER_ENTRY_COMMITS_ON_THE_NEXT_CONTROL_ACTION` | `[unverified]` — new in Phase 4 | `console/session.ts:213` (`:254`) | Commit when the displayed span fills, or on §6.4's four control actions — START, a rotary turn, PROGRAM RESET, COMPUTER RESET. STOP is not among them. |
| `INTERACTIVE_INQUIRY_HOLDS_THE_UI_RUN_LOOP` | ruling, ours, narrowing a Phase-2 constant — new in Phase 4 | `console/session.ts:223` (`:255`) | The hold is the UI's own `held` latch from REQUEST to RELEASE, deliberately not `Console1415.pendingRequest`; the lamp still reads the device flag. |
| `KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT` | ruling, ours — new in Phase 4 | `console/keyboardView.ts:43` (`:53`) | One `keydown` binding in the whole of `src/ui/**`, on the console region's own `tabindex="0"` wrapper; `.press(` appears only under `console/`. |
| `UNEQUAL_HAS_NO_LAMP_ON_THE_1415_PANEL` | record — `[verified]` absence, no fallback wanted | `console/lamps.ts:184` (`:202`) | Draw the six STATUS lamps the panel publishes. The emulator's seventh compare latch gets no lens. |
| `REFUSED_FEATURE_LAMPS_ARE_OMITTED_NOT_DARKENED` | ruling, ours — new in Phase 4 | `console/lamps.ts:142` (`:154`) | Eight `OMITTED_LAMPS` entries covering 18 of the 103 published positions; 85 drawn. A refused feature leaves an empty frame, never a dark lens. |
| `LAMP_GROUPS_ARE_SILKSCREEN_NOT_LENS_COLOUR` | `[unverified]` | `console/lightsView.ts:57` (`:63`) | One lens colour per panel, groups distinguished by silkscreened box borders. Reversing it is one CSS rule per box. |
| `LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS` | `[unverified]`; the red-fault half is a **REFUSAL** | `console/lightsView.ts:45` (`:55`) | Warm white behind a clear lens (`--lamp-lit` / `--lamp-lens` / `--lamp-dark`). The 1401 red-fault convention is refused by name at four points of use. |
| `CONSOLE_LINE_LENGTH` (`src/core/machine.ts:105`) | existing OPEN, unchanged by this phase | cited at `console/logView.ts:107` and `console/session.ts:373`; never redeclared | Rule the Selectric form to 80 positions, display-only. No source gives a characters-per-line figure for the form. |
| `HALT_TYPES_NO_PRINTOUT` (`src/core/machine.ts:65`) | `[unverified]`, existing, inherited from Phase 1 — **contradicted by S223-2648 p.6 in wave 0's read; RECORDED ONLY** | cited at `console/session.ts:94`; never edited | Leave the core constant as it stands: no `S` line on a programmed halt. The escalation is a later phase's — see §3 and §4. SUPERSEDED 2026-09-04 — discharged in Phase 6 wave 0: the constant is `PROGRAM_STOP_TYPES_S = true`, `[verified]` against S223-2648 p.6, and a programmed halt types `S`. The `console/session.ts:94` cited above is now `:102`, recorded here rather than edited into the original row. See `docs/BUILD-LOG-6.md` wave 0 and `docs/plans/phase-6-reentry.md` §9. |
| `SELECTRIC_REVEAL_IS_DISPLAY_ONLY` | ruling, ours — display-only, OPTIONAL, and **not built** | `console/logView.ts:74` (`:88`) | The 932 cpm reveal is not implemented and the `OPEN:` block says so. The log is text that is already final; the rate would be a rendering rate, never a simulation rate. |
| `CHECK_LAMPS_FOLLOW_STOP_REASON_NOT_A_LATCH` | ruling, ours — new in Phase 4 | `console/lamps.ts:192` (`:203`) | Drive ADDRESS CHECK, INSTRUCTION CHECK and STOP from `MachineState.stop`: lit while the machine is stopped for that reason, dark once it runs again. |
| `DESK_IS_LIGHT_LAMINATE_ON_CHARCOAL_PEDESTALS` | `[verified from photos]` for the look; `[likely]` for the Noyes palette we are not using | `desk.ts:39` (`:59`) | `--desk-top` / `--desk-pedestal`: light tops on charcoal pedestals, dark console front with white legends. No Noyes colour scheme is claimed. |
| `NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED` | `[unverified]` source, **REFUSAL** in consequence | `desk.ts:62` (`:78`) | No scale elevation, no floor plan, and no dimension in inches anywhere except the card's and the two paper stocks' — the three things a person can hold. |
| `SOUND_IS_OUT` | **REFUSED — not open** | `desk.ts:81` (`:93`) | No audio in the phase. No primary source publishes 1402 / 1403 / Selectric acoustics. |
| `NO_WEBFONT` | ruling, ours | `desk.ts:96` (`:111`) | `ui-monospace, Menlo, Consolas, monospace`, which already renders `⌑` and `‡` in shipped output. `period.css` carries no `@font-face`, no `@import` and no `url(http`, asserted by the CSS lint. |
| `THE_RULER_IS_THE_FORM` | **REFUSED for this phase** — the largest deliberate fidelity gap (§14 R12) | `coding/sheetView.ts:41` (`:60`) | The parser-backed ruler stands in for X24-1336…1339 and C28-0309-1: the columns are `[verified]`, the artwork is not digitised, and none of it is drawn. Stated to the operator on the spec station's masthead, not only here. |

## 2. Plan deviations (minimal, logged, not redesigns) and modelling refusals

- **Two waves landed in more than one commit — 0 and 6 — for the same reason both times: a
  documentation correction arriving after the wave's own commit.** Wave 0: `4932bee` carried the
  move, the shell, the freeze and the build fix; `f71c754` was a follow-up that recorded the wave-0
  SHA into `docs/BUILD-LOG-4.md`, which the wave's own commit could not contain. From wave 1 the
  log section lands inside the wave's commit, so wave headings carry no SHA and `git log` does, and
  §12.2's one-commit-per-wave rule held through wave 5b. Wave 6: `af44d45` carried the storyboard
  test and the three documents; the coordinator's rulings on the test-line ladder's reason, the
  `-M20%` rename caveat and criterion 3's disposition arrived after the push, so `df18bb0`
  (`[Docs]:`) folded them in, and the commit that records this split is a third — documents only,
  nothing under `src/` or `test/`. **That "third" is stale and this sentence is the correction:**
  wave 6's own run closed at five commits — `af44d45` plus `df18bb0`, `6e7ad46`, `75438bf` and
  `dc93d22` — and by the merge gate the chain from `af44d45` is nine, the two handoff `[Docs]:`
  commits (`9ca7161`, `1614fc4`) and the merge gate's own `[Test]:` / `[Docs]:` pair. Every one
  after `af44d45` is documents-or-tests only; nothing under `src/` but comments. Not amended, not
  force-pushed: the eight `[UI]:` wave commits are the phase's build history and the `[Docs]:`
  commits read as what they are.
- **`test/ui-controls-verbatim.test.ts` pins SHA-256 where the plan wanted a spawned
  `git diff --numstat`.** `tools/node-shims.d.ts` declares no `node:child_process` and `tools/**`
  is do-not-touch, so the test cannot shell out without a forbidden edit. `coreView.ts` and
  `registerView.ts` are pinned by digest instead; the numstat stays as the orchestrator's
  per-commit gate command (criterion 3). `panel.ts` is deliberately not pinned, because wave 1
  folds it.
- **The `panel.ts` fold is numstat 3 / 17, not the plan's 16 deleted / 2 added.** Deleting
  `renderConsoleLine` orphans `ConsoleLine` in the type import at `panel.ts:12`, and
  `noUnusedLocals` makes that a typecheck error, so the import line is rewritten — one deletion and
  one addition in git's count. **Five** sites in the plan still say 16/2 and are stale by one —
  §3.2's row (`:424`), §6.1's "Sixteen deleted, two added" (`:1300`), §11's wave-1 row (`:2501`),
  its cost table (`:2529`), and **§13 criterion 3 itself** (`:2838-2839`, "exactly 16 deleted /
  2 added"), which is the gated site and therefore the one that matters. The reviewer also found a
  pre-existing slip:
  §3.2 and §6.1 list `box` among `panel.ts`'s frozen exports and `panel.ts` has never exported one.
  **The plan was not patched** — Tom's standing ruling that no wave edits the plan — so both
  corrections live in `docs/BUILD-LOG-4.md` and here.
- **The plan's `?raw` duplicate-declaration measurement was right about the merge and wrong about
  why.** §3.1 and §10.6 item 1 say duplicate ambient `declare module '*.cards?raw'` blocks exit 0
  on this toolchain. They do — *because* `tsconfig.json:22` sets `skipLibCheck: true`; without the
  flag they are `TS2300: Duplicate identifier 'text'`. The merged shim's header now records the
  measurement with its cause; the structural mitigation (`npm run build` in the per-commit gate)
  was never in doubt.
- **The straddle oracle needed three corrections to the plan's numbers, one main-session ruling,
  and a named limit.** Both RPG-generated decks open with a skip to channel 1 that ejects the
  power-on form, and every shipped deck closes with `EOJ CC1 1` (`src/rpg/cycle.ts:545`) that parks
  the carriage on a fresh form. So: (1) the RPG reports are on **forms 2 and 3**, not 1 and 2
  (§5.2, §11 (b), criterion 9, storyboard step 13); (2) `paginate` emits **three** pages, two of
  them inked, and the carriage rests at **4:1** — §11 (a)'s "2 forms" is the inked count; (3)
  §5.2's derivation taken on the carriage's OWN form is empty on every shipped deck at rest, and
  criterion 9's literal composition would throw past `traversed`'s one-form bound. **Ruling A**
  (main session, 2026-09-02, after one reversal recorded in the log so the reasoning survives): the
  derivation stays the ledger's — the last print on the last inked form, and the final carriage —
  because a per-form derivation would redefine a constant frozen at wave 1. §11 (d)'s
  "sales-summary yields zero straddles" was wrong on the facts, not merely unsatisfiable, so the
  negative is now a **synthetic** no-punch motion (form 3 line 61 → form 4 line 1, returning `[]`)
  and the end-of-job eject's two crossings are asserted as the true positives they are. **A's named
  limit**, in the `OPEN:` block beside the constant rather than designed around: the span from the
  last print to the final rest can cover more than one motion, so a deck whose carriage LANDS on a
  punch between them would report that punch as crossed when it was sensed. No shipped deck does;
  Phase 6's trajectory report is to be checked against it.
- **§11 wave 6's oracle asks for an `I` line the shipped deck cannot type — the second substantive
  place a reviewed plan asserted an end state the demo does not produce.** §13 criterion 16
  (`phase-4-period-ui.md:2943`) requires "the released inquiry's `I` line present in the rendered
  Selectric log". The `I` line types when the PROGRAM's `RCP` executes
  (`src/core/devices/console1415.ts:311-313`), and the RPG-generated `sales-summary` program issues
  no console read — asserted on the generated source in the storyboard test itself
  (`test/tier4-period-storyboard.test.ts:285-286`). So the released inquiry at this desk correctly
  types nothing. The test pins that as an **absence with its reason** and pins the `I` line as a
  **positive** inside the same case, on a second machine driven with a hand-planted
  `M %T0 00500 R` the way `test/console-inquiry.test.ts` drives one (`:293-313`).
  `INQUIRY_ENTRY_IS_PRE_SUPPLIED`'s claim stands either way — the entry is supplied before the read,
  not by it. The straddle oracle (above) was the first such case; both were found by running the
  shipped deck rather than by reading the plan.
- **Two ownership crossings into wave 1's files were accepted rather than deferred.**
  `lastPrintedOn`, `lastInkedForm` and `CARRIAGE_CHANNELS` landed in `paper/carriage.ts` during
  wave 2 (§5.2 and criterion 9 name `lastPrintedOn` and assign it to no wave — a plan gap), and
  `HOPPER_SLIVER_LIMIT = 40` landed in `paper/cardGeometry.ts` during wave 3 as the plan's own
  "`paper/`-side constant with a test". Both were accepted on the condition — met in both waves —
  that all six wave-1 tests pass unedited. Neither constant carries an `OPEN:` on purpose, and
  neither is a ledger row: `HOPPER_SLIVER_LIMIT` is a rendering budget, not an uncertainty about
  the machine (`cardGeometry.ts:26` says so), and the twelve channels are `[verified]` (io.md §7;
  A22-0526-3 pp.68, 71-72), read off core's `CARRIAGE_D_TABLE` rather than typed.
- **One of §7.1's five caption templates changed: the file-feed face is captioned `loaded deck,
  next card`, with no ordinal.** `session.hopperCards` returns the LAST waiting cards of the loaded
  deck, so after READER START a face captioned `loaded deck, card 1` is card 2. The frozen session
  exposes no absolute ordinal and reconstructing one from three stacker counts plus the buffer
  would be arithmetic in a view. A wrong ordinal is the thing the caption exists to prevent.
  `read station, card N` keeps its shape and is always 1.
- **`key the bootstrap` shipped disabled for one wave.** Wave 3 deleted `findAlterBox()`'s
  `querySelectorAll` walk and the clipboard fallback with the rest of `deckBox.ts`, but the typed
  `keyBootstrap(text, marks)` target is wave 4's console session. The button was drawn disabled and
  captioned "keyed at the 1415 from wave 4", with a by-hand note printing `A^L%1000012$^R`; wave 4
  threaded the hook through `reader/mount.ts` and it went live. Leaving a DOM walk in a moved file
  for one more wave would have been exactly what DECISIONS.md 2026-08-31 refused.
- **An open inquiry entry is cancelled by any other control action, and a RELEASED entry is not.**
  Wave 4's review found that `request()` unlocked the keyboard without committing a pending ALTER,
  while a START or a rotary turn after REQUEST overwrote the inquiry entry and stranded `held` — a
  silent frame stall two clicks away. Ruled: `request()` commits first, and an open entry is
  cancelled exactly as INQ CAN would cancel it, the mirror of ALTER's commit-on-control-action.
  The builder's narrowing on top of that ruling: a **released** entry is not cancelled — it is
  queued on the device, discarding it would set Figure 45's Condition on the read, and its pending
  row stays on the form until the program's `RCP` types the real `I` line (§6.6). `held` is already
  false by then, so no frame can stall behind it.
- **One new test assertion was wrong and the code was right, and the code won.** The cancel case
  asserted the device's `pendingRequest` false after a control-action cancel — satisfiable only by
  the UI writing device state, the thing §6.6 refuses — and it contradicted the same file's
  discriminator case, which asserts that flag survives RELEASE. `session.ts`'s author refused to
  edit code to satisfy a red assertion and measured the flag on a real machine: it survives INQ
  CAN, RELEASE, START and a rotary turn, and core's own COMPUTER RESET and PROGRAM RESET clear it.
  Ruled: the test asserts the frame gate (`held`, false in every row) and the device flag per
  action as measured. The lamp/gate split is now a tested property rather than a comment.
- **Wave 4 edited wave 3's `test/period-reader.test.ts` by one line — an ownership crossing ruled
  by the main session.** That file's `codeOf` stripped block comments before line comments, so a
  line comment writing the glob `src/ui/**` — which `reader/mount.ts:18`, `main.ts:8`,
  `console/mount.ts:17`, `keyboardView.ts:46` and `paper/chain.ts:24` all do — opens a false block
  match that swallows live code to the next `*/` (measured at 79% of such a file). It was latent,
  not active: `hopperView.ts` carries no such comment, so wave 3's negative guard read what it
  claimed to. The two `.replace` calls were swapped so `//` strips first. No behaviour, no new case.
- **Wave 5 was split, as §14 R13 pre-declared, and two items moved across the cut.** Tom ruled the
  split before the wave: **5a** = `desk.ts`, `period/mount.ts`, `period/session.ts`, `period.css`
  and the four wave-5 tests (`48fec7e`); **5b** = the two authoring stations' `git mv` and restyle
  (`21b86a1`). Two commits, two reviews, two gates, five screenshots in the phase. Two items sit in
  5a by the build's reading rather than the ruling's list: the **`reader/mount.ts` narrowing**
  (§14 R13's own text puts it in 5a, and a mount cannot take the printer and console over while the
  reader mount still constructs them) and the **`stale` edit** to `period/autocoder/session.ts`, a
  file that never moves, because `test/period-session.test.ts` is 5a's and would otherwise need a
  skip that 5b un-skips — an edit to another wave's test. The `stale` edit landed at +25 against
  R8's planned +16, the extra being its doc comment and header note; both tier4 tests pass unedited,
  which is criterion 15's bound.
- **`PeriodViewState` ships as a documented inert seam, and that is a plan defect.** §4.10
  specified a state machine no wave was asked to consume: `mountPeriod` wires only the `tab`
  action, the views keep the local toggles they shipped with, wave 6's storyboard drives the three
  sessions and never the view state, and its only reader at merge is `test/period-session.test.ts`.
  So `state` is written and never read, `dispatch` is a sink, and `BOUNDS` pins `form` to 1 and
  `card` to 0. It was not ripped out mid-wave — the plan is a reviewed artifact and the deletion is
  not worth the churn. What would make it live is in §4.
- **`#machine-room button` painted the drawn key strips as beige page buttons.** The stylesheet's
  own comment had the lamps (spans) and the keys (buttons) reversed, so the 1402's Fig.60 strip,
  the 1415's Fig.47 keys and the inquiry levers were skinned as page controls. Ruled: the bare
  element keeps only `font: inherit`, the skin moves onto the three page-button containers
  (`.deck-box`, `.period-coding`, `.period-specs`), and the drawn strips fall back to their views'
  own inline looks. `color: inherit` was dropped from the bare rule as well, because
  `.period-console` sets a near-white legend colour and an unlit 1415 key would then be unreadable
  on the UA's light button face. Every page control sits inside those three containers except the
  1403's bar/plain-white toggle and END OF JOB, left bare in the one station drawn entirely from
  published figures.
- **The four header bands 5b drew carried four different geometries, and the rule was applied
  rather than the literals.** Inset, bleeding, station-wide and none became one rule — bleed to the
  container's edge, text on its content column — computed against each container's own padding,
  because the spec sheet's `-.5em -.6em` cancels `.rpg-spec-box`'s padding and `.period-coding`'s
  differs. Copying the literals would have left a ledge on one band and pulled another over the
  listing's paper. A recorded deviation from the literal instruction.
- **Three lamp custom properties are declared and used by nothing.** `--lamp-lit`, `--lamp-lens`
  and `--lamp-dark` sit on `#machine-room` while four views still hold `#f2ecd2` / `#3a3a3a`
  inline (`reader/keysView.ts:108-109`, `console/keysView.ts:109-110`,
  `console/lightsView.ts:82-83`, `console/inquiryView.ts:53-54`), because the ledger row forbids
  the hoist mid-phase. The declaration now says a later phase hoists them, and the header's
  "flipping a ruling is one line" is narrowed to the six properties that are used. `--lamp-lens`
  also carried a false provenance — the value was a Selectric key-top colour — and now has an
  honest one.
- **`test/period-sheets.test.ts` is a §3 file-list deviation.** §11 wave 5's clauses (c) and (d)
  name no test file, and every wave-5 test landed in 5a with no append sanctioned, so 5b wrote a
  new one (411 lines, 21 cases) carrying the restrike against both listing goldens and the sheets'
  spans against their tables.
- **Four intra-wave import-specifier edits were forced, not the two §3.4 names.** Both session
  files stay where wave 0 put them while their views move, so `'./session.js'` becomes
  `'../{autocoder,rpg}/session.js'` in four files. The plan's count was wrong, not the build's.
  Related, and stated so a later reader does not draw the wrong conclusion from the diff: **all
  seven are `git mv` renames**, but the restyle changed enough of each that six fall below git's
  default 50% similarity, so plain `git show -M --stat 21b86a1` detects only **one**
  (`{rpg => specs}/mount.ts`) and shows the other six as an add plus a delete. `-M20%` detects all
  seven. The low count is a similarity-threshold artifact of the restyle, not evidence the files
  were re-implemented — §11's "restyles and may not re-implement" bound held, and the wave-5b
  review confirmed the survivor set byte for byte against `HEAD:`'s files. `21b86a1`'s own commit
  message says "three restyles fall below git's default similarity" and is wrong the same way —
  six do.
- **`test/golden/sales-summary.lst` is the RPG *specification* listing, not an Autocoder
  listing.** §5.3's "two listing goldens" is one of each: `hello-dad.lst` is `renderListing`'s and
  `sales-summary.lst` is `renderRpgListing` over `buildRpgListing` (`src/rpg/listing.ts`). Each is
  now asserted against the renderer that made it. A plan error the wave-5b review caught.
- **§11 (d)'s "no column number anywhere" is narrowed to what the detector proves.**
  `coding/listingView.ts:80-81` hand-encodes `SOURCE_FIELDS`' page and line spans — `pglin.padEnd(5)`,
  `pglin.slice(0, 2)`, `pglin.slice(2)` — Phase-3 code carried unchanged under "restyles and may
  not re-implement". Three cited whitelist rows now make those literals visible rather than
  invisible, and a row that goes stale fails as loudly as a new literal.
- **The phase overran §3.9's test-line arithmetic, and the number is here so the totals do not
  stand unqualified.** Wave 5a's four tests are **919** lines against the plan's 340 (+170%), most
  of it criterion 18a's carrier and the anti-vacuity floors — the largest single divergence from
  §3.9 in the build; 5b's `period-sheets.test.ts` adds **411** that §3.9 budgets nowhere. Across
  the phase, §3.9's sixteen `npm test` files landed at **3,682** lines against its **2,075** (its
  2,315 less the ~240 it gives wave 6's smoke-run storyboard); with `period-sheets.test.ts` the
  seventeen `npm test` files total **4,093**; and with wave 6's
  `test/tier4-period-storyboard.test.ts` at **316** against that ~240, the phase's eighteen test
  files total **4,409** against §3.9's 2,315 in seventeen — **+90%, the phase's largest divergence
  from its own arithmetic** at the phase level, as wave 5a's +170% is at the single-wave level.
  **The reason, once:** the growth is almost entirely anti-vacuity floors, whitelists carrying file
  + line + citation, and the absence-detectors themselves — the readers that five separate
  findings in this phase showed were reading less than they appeared to, the single most valuable
  thing the phase learned: (1) a stray control byte in `logView.ts` making shell `grep` treat the
  file as binary and suppress matches; (2) `period-reader.test.ts`'s `codeOf` stripping block
  comments BEFORE line comments, so a line comment containing `src/ui/**` opened a false block and
  swallowed live code; (3) criterion 18a's refusal grep matching only exported consts — 258 labels
  swept, the entire 1415 invisible, 418 after the fix; (4) `/\{\s*chain/` matching four `${chain}`
  template interpolations and the toggle's click-handler block, so the detector fired on its own
  file's strings; (5) `codeOf` collapsing block comments to a space rather than blanking them in
  place, desynchronising every line number a whitelist row cites. That is where the lines went,
  and on this record it is where they should have gone: every one of the five would have shipped a
  green gate over an unread file. **Source overran too, and the figures below are
  `rtk proxy wc -l` at HEAD** — one convention, restated here because the in-wave numbers in
  `docs/BUILD-LOG-4.md` were counted another way and do not reproduce under `wc -l` (651, 589,
  1,931 and 1,015 there): `period.css` **711** against §3.9's 640; wave 2's three printer views
  **645** against 510; wave 4's nine `console/` modules **1,991** against 1,380 (`selectric.ts` is
  wave 1's and excluded); 5b's seven restyled files **1,039** against ~795. The wave-4 review's
  "1,004 of code — under budget on code, the rest §16 headers and fourteen `OPEN:` blocks" is its
  own code-only count and is not on this convention.
- **`MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT` is declared as `30`, not `= true`.** The origin the
  indent subtracts is one load-bearing, greppable declaration, on the repo's own precedent
  (`LISTING_LINES_PER_PAGE = 55`, `BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY = '9'`). The block says
  that 30 is the `[verified]` position used as the origin and that the `[likely]` part is the
  choice to render the 30-group flush: the open question is the origin, not the number.
- **Criterion 18a's colour tokens gained their uppercase forms; the time units did not.** `RED`,
  `CRIMSON`, `#F00` and `#FF0000` were added because no legitimate legend reads them, while `µs`,
  `ms`, `sec`, `seconds`, `clock`, `elapsed` and `speed` stay case-sensitive — which is what keeps
  `clock` apart from §8's `CLOCK` and `ms` apart from any uppercase legend. The test header says
  the two classes are matched differently and why.
- **The plan budgeted criterion 18a one whitelist entry and the build shipped six — an unlogged
  deviation.** §13 criterion 18a (`phase-4-period-ui.md:2967`) asks for **file + line + citation**
  on each exception "and there is one — the phrase `carriage tape`".
  `test/period-refusal-grep.test.ts:104-129` carries six. Five are `lamps.ts` data that §8.2 itself
  requires the panel to carry: the three `OMITTED_LAMPS` labels at `:163`, `:165` and `:166`, and
  the two published `const PANEL` rows at `:137` and `:138` — console-and-physical.md §5's table
  read in verbatim, which `omitted()` filters before `PANEL_BOXES` is built. The sixth is the
  checked phrase, `printer/carriageView.ts:114`'s `carriage-control tape`. Not drift in
  measurement: the plan's exception list did not anticipate §8.2's own data.
- **§14 R6's residual stands, narrowed: a frozen `<select>` beside a label that now reports both
  surfaces.** `internals/mount.ts` draws a live MODE label reading `machine.mode` on every redraw
  above `controls.el`, but `controls.ts`'s own `<select>` never re-reads the mode and goes stale
  against the period rotary. The only clean fix is the edit criterion 3 forbids — `controls.ts` is
  pinned at SHA-256 `a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f` and its
  `git diff --numstat` is 0/0 at every commit — so it is recorded as a known cost rather than lived
  with silently. **Amended 2026-09-03 with M2's fix (§4):** that live label now also names where
  the machine-room rotary is pointing when the two disagree, so what the stale `<select>` costs is
  a widget the page contradicts in words rather than a disagreement nothing on the page states.
- **The model policy changed mid-phase, by Tom's decision.** `CLAUDE.md` names Fable for the
  main-session orchestrator and the build orchestrator. This phase's main loop ran on Opus and
  started phase work without raising it; the rule was amended in `6e2f29c` to make the substitution
  a gate — ask, and on a yes substitute Opus for Fable at both orchestrator seats. Worker seats are
  unchanged: Opus, or Sonnet for mechanical work.
- **Criterion 18a's carrier has two named blind spots at merge.** It cannot see the five
  module-level string constants the two 5b stations draw — `FRAMING`, `PLUS_NOTE`, `BAND`,
  `BAND_FORMS` and `specs/mount.ts`'s own `FRAMING` — which were hand-checked clean instead; and
  its per-file floor table (`AT_LEAST`, ten entries) covers no file under `coding/**` or `specs/**`,
  so a stripper accident that blanked one of those files would not be visible there. Both are 5a's
  file to widen, carried in §4.
- **The absence-reader lesson, in one sentence: every absence assertion in this phase needed its
  reader fixed before it meant anything, and none of those fixes came from a gate going red.**
  The **control byte** (wave 4): a stray control character in a string literal makes shell `grep`
  treat a file as binary and suppress every match, so every absence check in the phase reads with
  `readFileSync(file, 'utf8')` in node. The **strip order** (wave 4): `codeOf` stripped block
  comments before line comments, so a line comment writing `src/ui/**` opened a false block match
  that swallowed live code. **Blanking in place** (wave 5b): `codeOf` now blanks block comments
  rather than collapsing them, so a finding's line number is the file's own and a whitelist row can
  honestly cite `:80` — with `/\{\s*chain/`, which was matching four `${chain}` template
  interpolations in the detector's own file, tightened to `/(?<!\$)\{\s*chain\s*[:}]/`. In the same
  family, criterion 18a's carrier matched only `export const … = [`, so the 1415's non-exported
  drawn tables were invisible and a `PRIORITY ON` key added to that station would have passed
  green; widening the shape took the sweep from **258 labels to 418** (`keyboardView` 72, `lamps`
  107, `keysView` 33, `rotaryView` 14), and a `PANEL_BOXES` walk closes the case a `.map()`
  initializer leaves no literal for. Both counts are the wave-5a worker's instrumented
  measurement, not asserted figures: the test asserts only `LABELS.length > 300`
  (`test/period-refusal-grep.test.ts:254`), which is the anti-vacuity floor. Every one was found by review or by measurement.
- **RULE 4 found four defects no oracle in the phase could see.** Wave 2: the carriage-tape strip
  collapsed to about 30 × 50 px, because a `font-size: 1.6` presentation attribute on the root
  `<svg>` made `width: 11em` resolve against 1.6 px; and the twelve channel headings read
  `1 2 3 4 5 6 7 8 9 101112`, a two-digit label overrunning a 2-unit column, fixed by widening
  `COLUMN` 2 → 3 (`STRIP_WIDTH_PX` 180 → 252) rather than shrinking twelve `[verified]` labels.
  Wave 5a: `#machine-room button` skinning the drawn key strips, confirmed in pixels by the shot.
  Wave 5b: the stale note firing before any assembly had happened, so the storyboard's own happy
  path read "edited since the last ASSEMBLE … Press ASSEMBLE again" with nothing retired — gated
  now on a result existing. Every gate in the phase was green on all four.
- **The desk's strip reflow at a narrow viewport was accepted and recorded, not fixed.** At a
  1340 CSS px viewport the three columns are narrow enough that the horizontal strips reflow — the
  1402's Fig.60 strip into five rows, the 1415's power/control cluster into two, the 1403's Fig.69
  second group into 4 + 3. Published order survives in reading order in all three. Ruled: accept
  it, add no horizontal scrolling to a key strip. It is viewport-dependent rather than a fixed
  error, a minimum width trades a reflow for a page-level scrollbar, and a scrolling strip hides
  legends behind a scrollbar on panels whose whole point is that every legend is visible at once.
  Carried in §4 for whoever revisits the desk's breakpoints.

## 3. Research corrections and [observed] observations

- **Wave 0, target (a) — matrix position, narrowed and still `[likely]`.** S223-2648 Fig.5 p.9 is
  headed "Printing Layout"; its first column reads `Matrix Pos ID Char` with bare 30 and 35, no
  unit, no origin, no scale. p.6 supplies the discriminator: the figure "shows the printing layout
  and the special character that prints **in position 1**". The number is attached to the line's
  first printed character, which rules out a print-line column counted from the paper's left edge
  and leaves a carrier or print-matrix index whose origin the manual does not publish.
  `matrixPos − 30` is the right shape; the tag does not move.
- **Wave 0, target (b) — the rotary's detent geometry, measured off a primary photograph.**
  A22-0526-3 Fig.47 p.49 is a schematic with no ticks, graduations or degree numbers. S223-2648
  Fig.2 p.7's photograph carries six silkscreened index dots; measured against a fitted circle they
  fall at RUN 0.0°, DISPLAY 58.3°, ALTER 119.6°, C.E. 180.0°, I/E CYCLE 238.6°, ADDRESS SET 301.3°
  clockwise from twelve — 60° spacing within 1.7°, inside the photograph's own perspective error,
  and in `console-and-physical.md` §3's exact clockwise order. What stays true: no page prints the
  degrees, so 0/60/120/180/240/300 remains our arithmetic over a measured drawing. Nothing in
  `console/session.ts` changed.
- **Wave 0, target (c) — 103 published lamp positions, confirmed against the figure the plan
  asserts them from.** S223-2648 Fig.3 p.8 shows seven separately framed boxes (the ARITH/STATUS
  and CONTROL-CH2/STATUS-CH1 junctions re-cropped at 600 dpi to confirm neighbours do not share a
  frame): CPU 49 (I RING 13, A RING 6, CLOCK 10, SCAN 4 + SUB SCAN 4, CYCLE 8, ARITH 4), STATUS 6,
  I/O CHANNEL CONTROL 12, I/O CHANNEL STATUS 12, SYSTEM CHECK 15, POWER 5, SYSTEMS CONTROLS 4. The
  POWER box's legends are illegible at 150 dpi and stay illegible at 600, and were read instead
  from A22-0526-3 Fig.54 p.55 — THERMAL and CB TRIP on the left, I/O OFF LINE, TAPE OFF LINE and
  DISK OFF LINE on the right. 103 − 18 omitted = 85 drawn, and the REDUCED PANEL label states its
  count against the figure rather than against a reconstruction.
- **Wave 0, target (d) — not reached.** Whether `D bbbb...` in C28-0326-2 Appendix C Exhibit II
  p.55 is the manual's own elision was not settled: the two-attempt budget was spent on the two
  documents covering four targets. The exclusion named in `test/period-selectric.test.ts`'s header
  stands, and it remains the phase oracle's one judgement call.
- **Wave 0, target (e) — `HALT_TYPES_NO_PRINTOUT` is contradicted by a primary source. RECORDED
  ONLY.** S223-2648 p.6, under "Output Operations": "*Stop Print-Out:* With the inhibit print-out
  control switch (CE console) set to normal, **a program stop**, an error stop, the stop key, or
  any cycle step, will initiate a stop print-out." A program stop is the programmed halt, and
  Fig.5's first row — "Normal Stop / S / matrix 35" — is the line it would type. A22-0526-3's Halt
  description (p.23) is silent rather than contrary. This resolves the tension §15's row
  identified, against `machine.ts:65`'s `HALT_TYPES_NO_PRINTOUT = true`. **Phase 4 takes no
  action**: it is a `src/core` constant, the phase's architecture row is "no core changes", and
  flipping it puts eleven `S` lines into a cc01 transcript the per-commit gate pins byte for byte.
  It is registered as **DEFERRED-01** in `docs/deferred-work-register.md` (`6263d2e`), tripping
  when a Phase 6 plan appears under `docs/plans/`, for whoever can act on it.
  SUPERSEDED 2026-09-04 — acted on in Phase 6 wave 0: the constant is renamed
  `PROGRAM_STOP_TYPES_S = true`, `[verified]`. **The eleven-lines cost recorded above was
  wrong.** Measured, the change moves **zero** bytes of the cc01 transcript —
  `node build/tools/run-cor.js oracles/cc01.cor --iar 02000 --trace 1 | grep -c "OP \. "` returns
  `0`, the trace holding 1241 level-1 instruction lines and not one op `.`. The eleven was a
  static count of `.` sites in the core image, CC01A's error-halt sites, reachable only on a
  failed check. See `docs/BUILD-LOG-6.md` wave 0 and `docs/plans/phase-6-reentry.md` §9.
- **Two places where a primary source disagrees with `console-and-physical.md` — recorded as OPEN
  QUESTIONS, not corrections.** (1) §5 opens "Left-to-right box order across the panel", which
  reads as seven boxes in one row; Fig.3 stacks POWER over SYSTEMS CONTROLS at the right end beside
  a full-height SYSTEM CHECK, so the panel is five frames across with the sixth and seventh sharing
  the last column. The left-to-right order of the seven names is correct as written; only the row
  implication is wrong, and wave 4's `lightsView.ts` draws the stack. (2) The CE manual's
  photographed panel is silkscreened **SYSTEMS CONTROLS** where A22-0526-3 Fig.55 p.55 prints
  **SYSTEM CONTROLS**, and §5 follows the latter — a two-source difference, not an error. Both were
  ruled at wave 2 (main session, 2026-09-02): §5's labels and box order stay wave 4's diff target,
  and whether `console-and-physical.md` gets an escalation commit is the main session's call at
  merge. **(2) closed 2026-09-03: Tom ruled for the photograph — "go with the photograph" — and §5
  was reversed to SYSTEMS CONTROLS in an escalation commit. `lamps.ts`, `lightsView.ts` and two test
  files moved in the SAME commit, because `test/period-light-panel-vs-research.test.ts` carries no
  golden and slices §5's table live in both directions, titles included. (1) needed no action: wave
  4's `lightsView.ts` already draws the stack.** A third, smaller note in the same paragraph: Fig.5's own row labels differ from §2's
  transcription — the figure names the `B` row "Program Set" and the `#` row "Address Set", with
  separate "Stor Scan Set" and "Display Set" rows above the matrix-30 group — the substance
  matching exactly.
- **Wave 2, the straddle as the drawn page met it.** Every RPG deck's opening skip to channel 1
  ejects the power-on form, so the reports print on forms 2 and 3; the closing `EOJ CC1 1` parks
  the carriage at 4:1. On `cycle-probe` the derivation returns exactly `[{ line: 60, channel: 12 }]`
  with `carriage.channel12 === false` on the same snapshot: the last print is form 3 line 59, the
  armed space carries the carriage to 61 across the channel-12 punch unsensed, and the closing skip
  runs to form 4 line 1 across no further punch; the channel-9 punch at 57 was landed on before 59
  and is outside the span. On `sales-summary` it returns `[{ line: 57, channel: 9 }, { line: 60,
  channel: 12 }]` and **both are true**: the end-of-job eject from form 3 line 11 passes both
  punches without stopping on either. Iron's indicators "turn on when their hole is sensed"
  (io.md:268 `[verified]`; A22-0526-3 p.36 Figure 35) and the emulator's do not — the divergence
  `CARRIAGE_SENSES_AT_DESTINATION_ONLY` names, now observed on the drawn page and banner-labelled
  there rather than only in a comment.
- **`hello-dad` has no opening skip and prints on form 1.** Its closing skip parks the carriage at
  form 2 line 1 — `carriage: form 2, line 1   5 lines printed` on the status line, form 1 captioned
  torn off onto the stack. Its end-of-job eject from a low line crosses 57 and 60 unsensed exactly
  as `sales-summary`'s does, and both banners were present verbatim in wave 2's first shot.
- **The reset asymmetry, observed on a real machine in node.** A freshly created machine lights
  `B<A` alone among the six STATUS lamps — documented in `opcodes.md` §8 and A22-0526-3 p.36 — and
  an instruction check lights INSTRUCTION CHECK and STOP beside it. Sixteen of the 85 drawn lamps
  carry a `MachineState` source; the rest are typed `source: null`, "not modelled", and the
  register grep finds nothing in `lamps.ts` or `lightsView.ts`.
- **The sheets' spans hold field for field, and the artwork does not exist to hold.**
  `RULER_FIELDS` equals `SOURCE_FIELDS` — PG 1-2, LIN 3-5, LABEL 6-15, OPCOD 16-20, OPERAND 21-72,
  IDENT 76-80 (C28-0309-1 pp.5-7) — with `RULER_MARKS` `[6, 7]` from `COMMENT_COLUMN` and
  `LABEL_INDENT_COLUMN`; `SHEET_RULERS[kind]` equals `SHEET_COLUMNS[kind]` for all five sheets,
  each field once, leaves ascending and contiguous from column 1, the union of every boundary
  covering 78 of the 80 columns (55 and 79 the exceptions). The four X24 specification forms
  (X24-1336…1339) and C28-0309-1's coding form are named in `rpg-sources.md`'s index and are **not
  digitised**: the columns are `[verified]`, the artwork is not, and none of it is drawn.
- **The 1401 is refused by name at four points of use, not once in a document.** The red-fault
  convention in `printer/panelView.ts`'s header (for Fig.69's END OF FORMS / FORMS CHECK) and again
  in `period.css`'s header (for those legends and the 1415's lamps); the 1401 address dials in
  `console/rotaryView.ts`'s header; the 1401 Autocoder page heading in `coding/listingView.ts`'s
  header. `test/period-refusal-grep.test.ts` sweeps the drawn labels for the refused tokens,
  phrases and colours — 418 of them by the wave-5a worker's instrumented count, though the test
  asserts only `LABELS.length > 300` (`:254`) as its anti-vacuity floor — with **six** whitelist
  rows (`:104-129`), each carrying file, line and citation: **three** `OMITTED_LAMPS` labels
  (`lamps.ts:163`, `:165`, `:166`), **two** published `const PANEL` rows (`lamps.ts:137`, `:138`),
  and **one** checked phrase (`printer/carriageView.ts:114`). Same six at `48fec7e`, so the count
  is not 5a/5b drift.

## 4. Open items carried out of Phase 4

- **Criterion 17's "opens from the filesystem" clause is unmeetable as built, and was accepted rather
  than fixed (Tom, 2026-09-02).** `dist/index.html` emits `<script type="module" crossorigin>`, and a
  module script is refused by CORS over a `file://` origin in every current browser — the origin is
  opaque, so the fetch cannot satisfy the check. The `base: './'` work of wave 0 is real and
  necessary (both assets are referenced relatively, `grep -c 'src="/assets'` is 0, and the only
  `http` string in the bundle is the `createElementNS` SVG namespace, never fetched), but it is not
  sufficient for this clause and the plan never said so. **Nobody ever opened the page over
  `file://`** — every browser check in the phase ran against `npm run dev` on `localhost:5173`, and
  the main session's browser tooling refuses `file://` URLs, which is why the gap survived to the
  merge gate undetected. *What would make it pass:* a classic-IIFE bundle via Vite's
  `build.rollupOptions.output.format`, its own commit and a full re-gate. *Why it was not taken:*
  changing the bundle format after eight gated waves to satisfy a nice-to-have the plan asserted
  without checking is the wrong trade; the page serves correctly from any HTTP root. *When to
  revisit:* if the showcase is ever to be handed over as a folder rather than served — a plausible
  Phase 6 want, since the point of the reentry showcase is giving someone the printout and the
  machine that made it.

- **Phase 6, (a) — the fourth `?raw` declaration.** `src/ui/period/raw-import.d.ts` merged the
  three shims into one file precisely so a fourth pattern is one line in one place: add
  `declare module '*.asm?raw'` for `demos/reentry.asm` and a sample button on the coding sheet that
  loads it. The coding sheet already carries two (`sample program`, `sample data`), so the button
  is a third of an existing kind. That one line in one file is the whole of what the merge buys.
- **Phase 6, (b) — the 132-position form and the 66-line `DEFAULT_CARRIAGE_TAPE` are left
  unparameterised.** `PRINT_POSITIONS = 132` (`paper/page.ts:55`) and core's 66-line tape with
  channel 1 at line 1, 9 at 57 and 12 at 60 are the two numbers the trajectory report depends on.
  Phase 4 did not parameterise them away.
- **Phase 6, (c) — the plain-white toggle is kept.** A twelve-column trajectory table reads better
  without bars, so `GREEN_BAR_IS_THE_DEFAULT_WITH_A_WHITE_TOGGLE`'s white side is a Phase-6
  requirement rather than a preference. It ships on `printer/formView.ts` as one of the two page
  controls left bare of the button skin.
- **Phase 6, (d) — `paginate` is proved over more than two forms.** Wave 1's synthetic three-form
  paper carries form 2's blank `PrintLine` at line 1 and every `FormPage.lines` entry at 132
  characters; and both shipped RPG decks already yield three pages with the carriage at 4:1. A long
  report therefore needs **no new station**: one Autocoder deck, the same hopper, the same form,
  the same stack.
- **The lamp custom-property hoist.** `--lamp-lit`, `--lamp-lens` and `--lamp-dark` are declared on
  `#machine-room` and used by nothing; four views hold `#f2ecd2` / `#3a3a3a` inline. The ledger row
  forbade the hoist mid-phase; a later phase does it, and the declaration says so.
- **`PeriodViewState`, and what would make it live.** Today `state` is written and never read,
  `dispatch` is a sink, and `BOUNDS` pins `form` to 1 and `card` to 0. Making it live means the
  form view's bar and ruler toggles, the listing's A/H toggle, the stack's form selection and the
  deck box's card index dispatching through `reduce`, with `BOUNDS` read off `paginate`'s page
  count and the loaded deck's length — edits to four views and one mount.
- **The desk's breakpoints.** The strip reflow measured at a 1340 CSS px viewport (§2) is accepted
  and recorded. Whoever revisits the desk's grid owns the decision to add breakpoints, and the
  ruling against scrolling key strips is the constraint to argue with.
- **Criterion 18a's carrier needed widening FOUR times, not twice — two are done and two are still
  open.** Done: wave 4 took the shape from `export const … = [` to any module-level `const`, and
  the sweep from **258 labels to 418**; the merge gate took it from `const` to `(?:const|let|var)`
  (`test/period-refusal-grep.test.ts:194`), so a label table declared with `let` or `var` is no
  longer invisible. Still open, and both edits are to the same 5a file: module-level string
  constants, so the five the 5b stations draw (`FRAMING`, `PLUS_NOTE`, `BAND`, `BAND_FORMS`,
  `specs/mount.ts`'s `FRAMING`) stop being hand-checked; and per-file floors for `coding/**` and
  `specs/**`, which the ten-entry `AT_LEAST` table does not cover.
- **`HALT_TYPES_NO_PRINTOUT`'s escalation.** DEFERRED-01 in `docs/deferred-work-register.md`,
  tripping when a Phase 6 plan appears under `docs/plans/`. Flipping the constant is a `src/core`
  edit that puts stop print-outs into the cc01 transcript the per-commit gate pins; the finding, the
  citation and the cost are all recorded, and Phase 6's showcase runs a program to a stop with the
  1415 log as its artifact.
  SUPERSEDED 2026-09-04 — discharged in Phase 6 wave 0. DEFERRED-01 is RESOLVED and the
  constant is `PROGRAM_STOP_TYPES_S = true`, `[verified]` against S223-2648 p.6. The cost named
  here did not exist: measured, zero bytes of the cc01 transcript move. See
  `docs/BUILD-LOG-6.md` wave 0 and `docs/plans/phase-6-reentry.md` §9.
- **`CARRIAGE_SENSES_AT_DESTINATION_ONLY`'s real fix.** Calling `senseChannels()` from
  `advanceOneLine()` in `src/core/devices/printer1403.ts` is what makes the emulator's indicators
  turn on when their hole is sensed. It moves `test/golden/cycle-probe.page.txt`, so Phase 4
  recorded and drew the divergence instead — the `RW#` / `WM#` / `loader.ts:90` precedent. Ruling
  A's named limit rides with it: the derivation's span can cover more than one motion.
- **The `pglin` literals in `coding/listingView.ts`.** `padEnd(5)` at `:80` and `slice(0, 2)` /
  `slice(2)` at `:81` hand-encode `SOURCE_FIELDS`' page and line spans, Phase-3 code carried
  unchanged. Three whitelist rows in `test/period-sheets.test.ts` cite them by file, line and
  reason; closing the item means `diagnostic()` slicing through the table instead.
- **The frozen `<select>` (§14 R6), NARROWED 2026-09-03.** It still goes stale beside the live MODE
  label and the only clean fix is still the `controls.ts` edit criterion 3 forbids. What changed
  with M2 is the label beside it: it now names the machine-room rotary's position whenever the two
  surfaces disagree (`modeNote`), so the `<select>` is a stale control beside a label that reports
  BOTH positions and the gate's condition. The residual is the stale widget itself, not a page that
  hides the disagreement. Carried as a known cost, not a defect to fix inside this phase's rules.
- **The object deck's third card-face scale is now photographed.** Wave 3's shot flagged it as
  unreachable (the coding station had no ASSEMBLE control until wave 5); wave 5b's shot measures it
  at 336 × 146 px, 2.30 against the card's 2.269, cut upper left, captioned `object deck, card 1`
  over `load address 00500, count 50, sequence 001`. The item wave 3 carried is closed.
- **Criterion 19's human walk is pending Tom's sitting.** §1's fourteen steps walked by a person,
  recorded in `docs/BUILD-LOG-4.md` by name and date — the Phase-3 criterion 11b and Phase-5
  criterion 13b precedent. Two things are named for it in advance, both flagged as Tom's rather
  than the plan writer's: §14 R12, the textareas in drawn frames, and §14 R2′, typing in the coding
  sheet with the machine room visible (which held in wave 4's and 5a's drives — `00000` typed after
  START with no click anywhere, nothing reaching a textarea).
- **The phase's absence-reader count is NINE, not five.** §2's enumeration and
  `docs/BUILD-LOG-4.md` both read five because both were written before the whole-branch review,
  which found four more by seeding the violation into an off-tree copy of the tree and watching the
  gate stay green. All four are fixed at the merge gate, and each fix is proved the same way it was
  found — seed off-tree, run the owning test, watch it go red:
  (6) `test/period-session.test.ts:248`'s `not.toContain('url(http')` read only the UNQUOTED form,
  so `url("https://…/x.png")` — the shape a copied rule actually arrives in — walked past it; now
  `/url\(\s*['"]?http/` at `:251`. Mutation: `.period-desk { background-image:
  url("https://example.com/felt.png") }` appended to `period.css` — 19 passed before, 1 failed / 18
  passed after.
  (7) `test/period-keydown-ownership.test.ts:27`'s sweep was `src/ui/period` alone, so
  `document.addEventListener('keydown', …)` in **`src/ui/main.ts`** — the file this phase edited
  most, wave 0, 3, 4 and 5a, and the one that owns the tab switch and the frame loop — was caught by
  nothing at all. The sweep root is now `src/ui` (`UI` at `:33`, the shape
  `test/period-no-second-frame-loop.test.ts:35` already used); `PERIOD` stays the
  console-ownership prefix ruling 3 needs. **This is the guard behind §14 R2′**, the keyboard-focus
  risk accepted at the gate with no oracle under it. Mutation: that listener appended to `main.ts`
  — 5 passed before, 2 failed / 3 passed after, both the exactly-one-file case and the
  no-document-listener case firing.
  (8) `test/period-css-covers-every-class.test.ts:97`'s `tokensIn` matched `'…'` only, so a
  double-quoted class literal was invisible to BOTH directions — it could neither want a rule nor
  keep one alive; now a backreferenced `['"]` at `:99`, with a double-quoted seed added to the
  anti-vacuity case, without which the case still could not see the gap. Mutation:
  `make("desk-ghost", "ghost-class")` appended to `period/desk.ts` — 4 passed before, DIRECTION ONE
  fails on `.ghost-class` after.
  (9) `test/period-refusal-grep.test.ts:194`'s shape 4 read `/\bconst …/`, so a label table
  declared with `let` or `var` was invisible to criterion 18a entirely; now `(?:const|let|var)` at
  `:196`, with `let` and `var` seeds added to the positive loop. Mutation:
  `let SEEDED_LEGEND = ['PRIORITY ON', '1401 COMPAT'];` appended to `period/desk.ts` — 8 passed
  before, the refusal case fails on both tokens after.
  The lesson does not change with the count, it hardens: **nine absence assertions in one phase read
  less than they appeared to, and not one of the nine was found by a gate going red.**
- **M2 — the silent frame stall. FIXED 2026-09-03, on the operator's call, by candidate 1.** Wave 0
  created ONE `running` latch and its two hooks (`src/ui/main.ts:34`, `:37-38`); both START keys set
  it — the internals one at MODE = RUN (`internals/controls.ts:96`, the frozen file, so this is a
  wave-0 inheritance and not a choice) and the period one from wave 4
  (`console/session.ts:355-357`) — and wave 4 added `detent` and `machine.mode` to the frame gate
  (`main.ts:92-93`). Turning the rotary to DISPLAY
  calls `machine.stop()`, which IS `stop(): void { fieldLine('S'); }` (`src/core/machine.ts:380`) —
  it prints the `S` line and **leaves `machine.mode` at `'run'`**. So: turn the rotary to DISPLAY,
  switch to INTERNALS, press START. `running` goes true; the gate is closed on `detent`; nothing
  executes; **`running` is never cleared**; and the live MODE label reads `MODE = RUN` because
  `machine.mode` says so (`internals/mount.ts:79-81`). **Neither tab shows the rotary's position** —
  `grep -rn detent src/ui/internals` is empty, and the machine room is hidden. The MIRROR case
  exists through the frozen `<select>` (`controls.ts:80`): move it off RUN, go back to the machine
  room where the rotary still reads RUN, press START — the gate is closed on `machine.mode` instead,
  and the same silence follows. **§14 R6 is not this**: R6 is the stale `<select>` beside a correct
  live label, a display disagreement; this is a control that reports nothing when it does nothing.
  Two candidate fixes, both one-line and both `src/ui`: surface the disagreement on the internals
  note (`internals/mount.ts:81` already composes a `MODE = …${note}` string and would say *the
  machine-room rotary is at DISPLAY*), or clear `running` in the gate's `else` branch at
  `main.ts:92-96`, which turns a silent stall into a START that visibly does not latch. The first
  explains, the second refuses; whichever is taken, it is a behaviour change to `src/ui/main.ts` or
  `internals/mount.ts` and it did not belong in a merge-gate commit after eight gated waves.
  **REOPENED AND FIXED 2026-09-03 (Tom, through the console-defect audit): CANDIDATE 1, applied to
  BOTH directions of the disagreement.** `internals/mount.ts` exports `modeNote(mode, rotary)` —
  one pure function of two strings, so it is asserted in node without a DOM — and the live MODE
  label draws `MODE = RUN — the machine-room MODE switch is at DISPLAY, and nothing executes until
  both are at RUN.` whenever the two differ. The rotary arrives as a STRING through a new
  `InternalsHooks.rotary()`, not an import: `src/ui/internals` may not reach into `src/ui/period`
  (`test/period-is-dom-free.test.ts`'s last case pins the ONE crossing at
  `panel.ts -> console/selectric.js`), so `main.ts` — which owns both mounts — passes
  `() => period.session.detent`, and the period mount now runs FIRST so the session exists when the
  closure is built. The mirror direction is the same treatment from the desk: `startKey()` in the
  RUN detent latches nothing when `machine.mode !== 'run'` and sets `notice` instead
  (`PROCESSOR_IS_NOT_AT_RUN`), which `console/keyboardView.ts` draws — the mechanism the same
  audit's findings 2 and 3 had just built. The remedy that sentence names is a real period action
  through the surface's ONE writer of `machine.setMode`: turn the dial off RUN and back.
  **The two candidates NOT taken, and why.** Candidate 2 (clear `running` in the gate's `else`) is
  invisible: nothing on either tab draws `running`, and both surfaces' controls already call
  `halt()` before they latch (`controls.ts:96`, `:104-107`; `session.turn`), so a stale latch
  cannot cause a surprise start either — it would have changed no pixel. The audit's third
  candidate (`startKey()` calls `machine.setMode('run')` first, making the dial authoritative) buys
  the mirror case one keystroke and costs this file's own invariant: `console/session.ts:14`
  states that the rotary is THE ONE PLACE `machine.setMode` is reachable from the period surface,
  and a START that moves the MODE switch — and types the mode-change `S` a real 1415 would never
  print from that key — is a machine action invented to paper over a two-surface disagreement.
  **What is still true after the fix:** the gate is EXPLAINED, not opened. A START pressed on the
  wrong tab still executes nothing; it now says which control is holding it and where that control
  is. Cross-tab only, as before.
- **The wave-relative prose that survived to HEAD, deliberately.**
  `src/ui/period/reader/deckBoxView.ts:75` still declares
  `const BOOTSTRAP_FROM_WAVE_4 = 'keyed at the 1415 from wave 4'`, and `:169` still writes
  "key the bootstrap is dead this wave". Both are UNREACHABLE at HEAD — `period/mount.ts:105`
  builds the console session first and hands `keyBootstrap` down, so the `undefined` branch never
  runs — and both are retained on purpose: `reader/mount.ts:41-43` says `opts.keyBootstrap` stays
  OPTIONAL because that branch is "the state wave 3 shipped and the state a reader mounted without a
  console would be in". The prose is the price of the optional parameter. Deleting the caption means
  deleting the branch, which means making the parameter required — a Phase-6-or-later decision about
  whether a reader station can exist without a 1415, not a stale-comment cleanup.
- **Four whole-branch-review minors, re-measured at the merge gate — and TWO of the three
  "corrections" made to that review were themselves wrong.** Measured commands and results, so the
  next reader does not have to take anybody's word:
  · **Stale pre-wave-0 self-path on line 1: TWO files, not one.** A line-1 sweep of every `.ts`
  under `src/ui` comparing the path a header names against the path it lives at returns exactly two:
  `src/ui/period/unitrecord/session.ts` names `src/ui/unitrecord/session.ts`, and
  `src/ui/period/autocoder/session.ts` names `src/ui/autocoder/session.ts`. `rpg/session.ts`,
  `period/session.ts` and `console/session.ts` are clean. **The review was right and the correction
  was wrong.** Both are one-word header edits, carried rather than taken here.
  · **`mountConsole` has no `el` PARAMETER — `el` is an unread RETURN value.** The signature is
  `mountConsole(machine, host, hooks)` (`console/mount.ts:46-50`) returning
  `{ el, views, session }` (`:93`); the one caller reads `.session` and `.views` and never `.el`
  (`period/mount.ts:105`, `:113`, `:153`, `:155`). **The correction was right.**
  · **`period.css:224-230`'s first-child rule selects the UNCLASSED WRAPPER, not the `<hr>`.**
  `desk.place` appends the station host into the classed area (`desk.ts:152-154`), and all five
  hosts are bare `make('div')` (`period/mount.ts:97-101`), so `.period-specs > *:first-child` is
  that wrapper — the `<hr>` is a GRANDchild. The comment above the rule ("The first thing inside a
  station is its own heading") is wrong twice over, and the rule is a no-op on a margin-less div.
  **The review was right and the correction was wrong.**
  · **`console/mount.ts:1` claims "seven views" where `:92` builds six.** The array is
  `[log, rotary, keys, lights, keyed.view, inquiry]`, and the file constructs exactly six views at
  `:67-71` and `:80`. The seventh is the SESSION (`:62`), which is not a view. One-word header fix,
  carried.
  **Standing lesson, now with a count: the whole-branch review was corrected three times and was
  right two of those three.** Re-measure the correction as well as the finding.

---

**Gate numbers through the phase**, for anyone reconciling §12.2's per-commit block: `npm test`
94 / 1747 → 100 / 1812 → 101 / 1835 → 102 / 1846 → 105 / 1893 → 109 / 1929 → 110 / 1950, with
**1 skipped throughout**; `npm run smoke` **6 files / 49** at every wave, becoming 7 / 50 when wave
6's `test/tier4-period-storyboard.test.ts` joins it; `npm run cc01` byte-identical at **1241
instructions with the check at 00322** at every commit, including after wave 1's `panel.ts` fold;
the four goldens unmoved at **348 / 2251 / 3688 / 6982 bytes** (plus wave 1's new
`test/golden/card-face-a.svg.txt`, 33,450 bytes, header CONSTRUCTED); `src/ui/internals/controls.ts`
at SHA-256 `a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f`, numstat 0/0, at
every commit. `npm run typecheck` and `npm run build` clean throughout, with
`grep -c 'src="./assets' dist/index.html` = 1 and `requestAnimationFrame(` in `src/ui/main.ts`
alone from wave 3 on.
