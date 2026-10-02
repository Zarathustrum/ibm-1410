**STATUS:** PHASE 2 COMPLETE — five waves committed (last 205b2e9, close-out 5892da4); rebased
onto `main` 21302e4 (Phase 1b merged) and re-verified; awaiting Tom's merge review.

# Phase 2 build log

One entry per wave, newest last. Written by the build orchestrator (Fable) from its own
verification runs, not from worker claims. Plan: `docs/plans/phase-2-unit-record.md` §11.
Phase 1's log (`docs/BUILD-LOG.md`) is closed and is not appended to.

## Arrival — f4039f7 (the plan, on main)

- Baseline (orchestrator, worktree `ibm-1410-p2`, branch `feature/phase-2`): `npm run typecheck`
  clean; `npm test` 42 files, 741 passed, 10 todo, 0 failed; `npm run smoke` 2 files, 5 passed;
  `npm run cc01` PASS — `R CC01A`, `R CC01 COMPLETE`, `E ØØ322 ØØ322 Ø8966 Jb bbb b̲b̲b̲b̲`,
  1241 instructions, 82543.5 µs.

## Wave 1 — the card format — commit d37d624

- Shipped (two Opus workers, core ∥ UI, then one Opus fixer): `types.ts` §6 (`CARD_COLUMNS`,
  `Card`, `Deck` replacing the "NOT in Phase 1" block, in place); `src/formats/card.ts` (204
  lines: punch bijection derived at module load from `bcd.ts`'s `hollerith` column — no second
  table — plus `parseDeck`/`formatDeck` with errors-as-data); `demos/hello-dad.cards` (6 cards:
  §13's card 1 column for column, five 78-col report cards ending `{0-5-8}{12-7-8}`);
  `src/ui/unitrecord/{session,cardView,deckBox,mount,raw-import.d.ts}` (SVG card face per
  console-and-physical.md §10, sample-deck button via `?raw` import, no fetch);
  `src/ui/internals/main.ts` +2; `index.html` three style rules; `test/card.test.ts` (17),
  `test/deck-text.test.ts` (17 after fixes).
- Oracle closed: the bijection proved twice (structural rule of charset.md §3 recomputed in the
  test for all 64 codes; `oracle/collate.json` hollerith column), 64 masks distinct, both
  2-8 ↔ A-bit directions, the blank trap, `parseDeck(formatDeck(d)) === d` cardwise, the demo
  deck parses 6 cards / 0 errors with card 1 asserted against §13.
- Review (Opus, adversarial): 0 blocker, 0 major, 4 minor — dead `void` statements in mount.ts;
  trailing-blank lines mis-reported as >80 columns; no A-chain test on the data cards; one
  table/two namings comment conflict (bcd.ts "A2 print glyph" vs plan "typeball"). All fixed,
  plus one orchestrator finding from the live page: the column-number row under row 0 overlapped
  row 1's holes (geometry recomputed, numbers now sit in the inter-row gaps).
- Verified (orchestrator): `npm run typecheck` clean; `npm test` 44 files, 775 passed, 10 todo,
  0 failed; `npm run smoke` 5 passed; `npm run cc01` PASS — both messages, instruction check at
  00322, 1241 instructions, 82543.5 µs; `npm run build` ok; internals page live in Chrome —
  sample deck → "6 cards, 0 errors", six card faces render, zero console errors.
- Ownership gate: `git diff --name-only main` ∩ do-not-touch = ∅.

## Wave 2 — 1402 reader, Channel.control, K — commit 946ef64

- Shipped (two Opus workers, core ∥ UI, then one Opus fixer): `devices/reader1402.ts` (hopper,
  1414 read buffer, three read stackers as counts, READER START / END OF FILE keys, EOF latch,
  Figure 62 precheck, `K` via `control`); `channel.ts` `control(op,d,at)` — all nine steps
  reusing the existing helpers, `precheck` structurally off the path, `SHORT_FORM_DEVICE`
  routing (`STACKER_DEVICE_X2`/`CARRIAGE_DEVICE_X2`, [likely]); `types.ts` §5 `Channel.control`
  + §8 `reader` block; `exec/io.ts` `selectStacker1` real (two lines), `carriage1` still throws;
  `machine.ts` `loadDeck`/`readerStart`/`readerEndOfFile` + reader snapshot; `oracle/io-status.json`
  (36 rows, Figures 62/63/89/91/45/46, each with its page); UI readerView (five pockets, two
  keys), PUT DECK IN HOPPER, session count→card mapping; tests reader1402 (25), channel-control
  (9), session (node).
- Oracles closed: io.md §3's Figure 5 vector through the real 1402 in both modes with
  BAR = B + LB + 1; software.md §10.5's Bootstrap 1 card typed as deck text, read by the keyed
  `AL%1000012$R` through the real path, asserted 00012-00058 from the transcription as printed
  and 00059-00066 only under the seven-column reading (`BOOTSTRAP_1_J_ROW_IS_SHORT_ONE_COLUMN`);
  Figure 62 sequences (EOF → Condition + NO-OP + BAR = B+1; ≤3 cards Not Ready; latch survives
  a `K`; x3=9/SSF pairing both ways); `$` takes all 80 columns, no WLR.
- Review (Opus, adversarial): 1 blocker (the notes ritual was unwritten — this entry and the
  PHASE-2-NOTES rows are the fix), 2 major (exec-io's "unattached device" test had silently
  started exercising the attached reader — repointed at x2 `D`; the session count→card mapping
  had no consumer and no test — test/session.test.ts added), 7 minor (named OPEN constant for
  the `$` effect added at `decodeD`; rAF loop gated on RUN/dirty; dead branch in `control()`
  straight-lined into a Record table; DEVICE_DEFERRED comment made truthful; the rest logged as
  PHASE-2-NOTES §2 rows 4-9).
- Verified (orchestrator, post-fix): gates green, but **the per-wave summary lines were never
  written down** and cannot be recovered — see "Gate lines" at the foot of this file. Internals
  page live in Chrome — sample deck → PUT DECK IN HOPPER → READER START leaves hopper 5 with
  READ BUFFER ON, END OF FILE sets EOF KEY ON, reader strip tracks the machine per frame.
- Ownership gate: do-not-touch ∩ diff = ∅. One file outside the plan's named list:
  `test/wave7-rejections.test.ts` — the plan predicted the `K` throw-assertion in
  `test/exec-io.test.ts`; it actually lived in wave7-rejections' `['F','K']` loop, narrowed to
  `['F']` (minimal move; wave 3 deletes the `F` row the same way).

## Wave 3 — 1403, carriage, F, THE DEMO — commit 099dc1e

- Shipped (two Opus workers, core ∥ UI, then one Opus fixer): `devices/printer1403.ts` (48-slug
  chain A/H with `chainGlyph`, carriage per Figure 90 — all 30 d-rows off `dmods.CARRIAGE_D_TABLE`,
  next-punch rule from currentLine+1, page increments on the wrap, channel 9/12 per Figure 35,
  deferred auto space, power-on at channel-1 home, `renderGreenBar` to the five-rule contract);
  `oracle/chain48.json`; `types.ts` §7 `PrintLine`/`CarriageState` + §8 `printer` block;
  `carriage1` real (two lines); `machine.ts` printer + `endOfJob()`; `formats/loader.ts`
  bootstrap constants; `tools/run-deck.ts` + the `demo` script; `test/printer1403.test.ts`,
  `test/tier4-demo-deck.test.ts` (GATES), `test/golden/hello-dad.page.txt` (the phase's ONE
  golden, 348 bytes); UI printer view (green-bar, bar shading + plain-white toggle, carriage
  marker, tape punches in the margin) and the key-the-bootstrap button (derives the ^ form from
  `BOOTSTRAP_KEYSTROKES`, fills the ALTER box, never calls `machine.alter`).
- Oracles closed: chain proved against the fixture for all 64 codes × both chains; the 30
  carriage rows as real `F d` instructions; auto space both arms + snapshot purity; §13's demo
  end to end — headless (`npm run demo -- --golden` byte for byte) and LIVE in Chrome (paste →
  hopper → READER START/EOF → DISPLAY/ALTER the keyed bootstrap → COMPUTER RESET → RUN → halt at
  00076, hopper 0, NR 6, five report lines on form 1, carriage ejected to form 2 line 1).
- Review (Opus, adversarial): 1 blocker (an after-print `F` with an armed auto space parked the
  motion for the NEXT write, double-booking a line — the motion now performs immediately, and
  `renderGreenBar` throws on a duplicate (page,line) instead of silently dropping one), 3 major
  (open-questions wave ordering inverted; the carriage tape now rendered from
  `machine.printer.tape`; the unpunched-channel skip bound promoted to
  `SKIP_TO_UNPUNCHED_CHANNEL_ADVANCES_ONE_FORM`), 5 minor (dead branches, WLR-keeps-armed-space
  test, fixture-sharing comment, caret-literal comments derived). All fixed; the golden never
  changed.
- Verified (orchestrator, at commit): gates green; **the per-wave summary lines were never written
  down** and cannot be recovered — see "Gate lines" at the foot of this file. §13's exit criteria
  met.
- Ownership gate: do-not-touch ∩ diff = ∅.

## Wave 4 — punch, inquiry, the four J senses, %21 — commit 5283127

- Shipped (4a devices ∥ wave 3, 4b wiring after, one Opus fixer): `devices/punch1402.ts`
  (Figure 5 output side, both modes, WLR >80, pockets honest); the real console inquiry read
  path (`pendingRequest`/`requestInquiry`/`supply`, io.md §8's six steps, Figure 45 all six
  rows, Figure 44 M-vs-L, Figure 46 Condition-never on writes); `Device.outputCells` hook ahead
  of `translateForOutput` + the 1403's `%21` implementation (`M %21` = 1s-and-blanks, `L %21` =
  a printed blank line behind `L_WRITE_WORD_MARKS_PRINTS_A_BLANK_LINE`); the four channel-1 `J`
  senses real (`9`/`@` off the live carriage, `Q` off the latch without clearing it, `R` always
  false behind `CARRIAGE_NEVER_BUSY`) — dmods flips data-only, channel-2 twins still rejected;
  punch registered + snapshot block; PROGRAM RESET drops the inquiry latch and
  `machine.computerReset()` now inherits it via `machine.programReset()` (the plan's inheritance
  claim was true of RegisterFile, not the façade — a test caught it); UI inquiry view (keyed()
  `^` convention, request indicator) + punch pockets in the reader view.
- Review (Opus, adversarial): no blockers; 2 major (the `d==='R'` precheck gate leaked a
  CANCEL-with-characters message to a `$` read — `read()` is now authoritative for the cancel
  endings; the L-blank-line ruling got its §15-shaped constant), 5 minor (dead `clear()`,
  read-clears-latch recorded as inference, load-mode lengthening descope logged, 4a's
  open-questions rows rode wave 3 — this commit does not claim them). All fixed or logged;
  NOTES §2 items 15–20.
- Verified (orchestrator): inquiry view live in Chrome (request indicator flips, `^` legend,
  tape channels named in the printer heading, zero console errors); gates green, but **the
  per-wave summary lines were never written down** and cannot be recovered — see "Gate lines" at
  the foot of this file.
- Ownership gate: do-not-touch ∩ diff = ∅.

## Wave 5 — object deck and the condensed loader — commit 205b2e9

- Shipped BOTH halves (one Opus worker, then one Opus fixer) — nothing descoped, R1 retired:
  `formats/objectdeck.ts` (C28-0309-1 Figure 2 per software.md §8.1, encode/decode with three
  named rejections, idents stored trimmed and normalized on encode) and the condensed loader in
  `formats/loader.ts` as two hand-assembled listings + `loaderDeck()`. Six-card hopper
  [bootstrap, loader body, 3 condensed, execute]: the body is 8 instructions + 2 constants, 70
  characters in 10 word-marked fields = 80 columns exactly, loading via the INDEX ADDER
  (WORK=00090 puts a card's address in IR14 and count in IR15; the two `D` moves address them
  as tags `00A?0`/`00?!0`) — nothing in the loader modifies itself, so §14 R1's core risk
  (self-modifying code, no assembler) is retired rather than managed. NOTES §2 items 21-23.
- Oracles closed: tier-0 round-trip incl. word marks, doubled separators, count boundaries, the
  three rejections; tier-3 through the real façade (BOOTSTRAP_KEYSTROKES keyed, COMPUTER RESET,
  run) — core equals the records cell for cell INCLUDING word marks, IAR at the entry point,
  workspace boundary swept 0-499, 00281 executes exactly once.
- Review (Opus, adversarial): hand-re-derived the loader column by column and drove it
  independently — verdict CORRECT; brute-forced the format (20k payloads, 10,642
  encoder-accepted, all decoded cell-identical). No blockers; 2 major — the EOF test masked
  only Condition, so a mid-load Not Ready (io.md §6's three-cards-remaining rule) spun the
  loop forever: one d-character (`8`→`9`, Condition ∨ Not Ready) fixes it and the no-EOF run
  now halts at 00349 (test-pinned); and a named-but-undeclared constant
  (`CONDENSED_LOADER_IS_A_RECONSTRUCTION`) now declared. 9 minor (miscites, the 126/142
  derivation shown, trimmed-ident round-trip pinned, ceiling assert, NOTE labels) — all fixed.
- Verified (orchestrator, at commit): gates green; **the per-wave summary lines were never written
  down** and cannot be recovered — see "Gate lines" at the foot of this file.
- Ownership gate: src/core and src/ui have ZERO wave-5 diffs; do-not-touch ∩ diff = ∅.

## Rebase onto Phase 1b, and the gate lines that were promised

**The five wave hashes in this file were rewritten by the rebase.** The branch was built on
`main` 669aabd; Phase 1b merged first (`main` is now 21302e4) and `feature/phase-2` was rebased
onto it, which gave every commit a new hash. The pre-rebase hashes this log carried — fa74cf7,
e48ee50, cf09c2e, 62371ad, e202f6a, and the arrival point 66698d6 — are on no branch and resolve
to nothing useful. The post-rebase commits are:

| Wave | Commit | Subject |
|---|---|---|
| arrival | `f4039f7` | Phase 2 plan — second revision after verification |
| 1 | `d37d624` | wave 1 — Card/Deck types, punch bijection, deck text, card faces |
| 2 | `946ef64` | wave 2 — 1402 reader, Channel.control, K Select Stacker and Feed |
| 3 | `099dc1e` | wave 3 — 1403 Model 2, carriage, F, and the gating demo |
| 4 | `5283127` | wave 4 — 1402 punch, console inquiry, the four J senses, %21 |
| 5 | `205b2e9` | wave 5 — object deck and the condensed loader |
| close-out | `5892da4` | Phase 2 close-out — STATUS entry, build log final |

### Gate lines

Waves 2, 3, 4 and 5 each promised their summary lines "below" or "at commit" and **none of them
were ever written**; those per-wave measurements are gone and this section does not invent them.
What follows is a **post-rebase re-run at the branch tip**, taken after the whole-branch review's
fixes were applied — one measurement, honestly labelled, not five:

```
npm run typecheck   clean (tsc --noEmit, no output)
npm test            Test Files 58 passed (58)   Tests 1099 passed (1099)   0 todo, 0 failed
npm run smoke       Test Files  3 passed (3)    Tests   17 passed (17)
npm run cc01        PASS — B Ø2ØØØ / R CC01A / R CC01 COMPLETE;
                    E ØØ322 ØØ322 Ø8966 Jb bbb b̲b̲b̲b̲; 1241 instructions, 82543.5 µs
npm run demo -- --golden test/golden/hello-dad.page.txt
                    PASS: the page matches test/golden/hello-dad.page.txt byte for byte
                    (348 bytes); stop = halt, IAR = 00076, hopper 0, stacker NR 6,
                    carriage page 2 line 1; 37 instructions, 1467 µs
```

The test count is 1099, not the 1098 the rebase alone produces: the whole-branch review added one
pinning test (a second PUT DECK IN HOPPER resets the reader's EOF condition — `PHASE-2-NOTES.md`
§2 item 25). The golden is quoted at **348 bytes**, its true UTF-8 size; the 346 this log and
`docs/STATUS.md` used to print was `page.length`, a count of JavaScript characters
(`PHASE-2-NOTES.md` §2 item 28).
