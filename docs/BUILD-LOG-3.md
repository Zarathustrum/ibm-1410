**STATUS:** MERGED — whole-branch review MERGE (3 minors applied), 11b PASS — 2026-08-31

# BUILD-LOG-3 — Phase 3, the standalone Autocoder cross-assembler

## Arrival — a5e9be1 (the plan, on feature/phase-3)

Baseline gates before wave 1, all green (2026-08-31 00:16):

```
npm run typecheck                                          clean
npm test                                                   58 files, 1099 passed, 0 failed
npm run smoke                                              3 files, 17 passed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction
                                                           check at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
```

Plan read in full (1,770 lines); architecture.md §2, §3, §5, §7, §8, §12 skimmed for the
boundary contracts. Build order: six waves per plan §11, one commit per wave, Opus workers,
Opus adversarial review per wave, gates run by the orchestrator at every commit.

## Wave 1 — resolve — commit 4606618

**Landed.** `src/asm/types.ts` (222 — plan §4's block, byte-faithful, nothing executable),
`src/asm/mnemonics.ts` (~600 — resolver derived from `OPS` + `dmods`, 166 rows after the `#`
channel expansion: 64 D move/scan, 22 J, 16 R/X, 6 T, 4 G, 3 V, 18 I/O incl. the seven `#`
families expanded to channel 1/2, 4 carriage+stacker, 13 Y, 16 remainder; named `AMBIGUOUS`
(`RW#`) and 30-row `OUT_OF_SCOPE` lists), `test/asm-mnemonics.test.ts` (§7.4's five assertions
plus the four repo-derivable d spot-checks), `test/asm-pseudo-ops.test.ts` (§2.2's 31-name
partition sliced live from `software.md` §6: 15 in / 16 out + `EXTRA_ROWS` + `SUFFIX_RULINGS`),
`test/asm-is-dom-free.test.ts`. `docs/research/open-questions.md` gained the dated Phase 3
section (pure EOF append), ten four-column rows for wave 1's OPEN constants.

**Review (Opus, adversarial): APPROVE WITH FIXES — 4 findings fixed, 5 notes.**
1. MAJOR: the `#` channel families didn't resolve (`resolve('RW1')` → undefined — the demo's
   first instruction). Fixed in-wave: build-time expansion `#`→1/2 with `channel` and
   `sourceName` on the row; literal `RW#` deliberately does not resolve; containment tests
   check `sourceName ?? name`. Fixed here because no later wave owns `mnemonics.ts`.
2. MINOR: the added §2↔`table.ts` set-equality implied the research column is complete; now
   caveated, and the `…` continuation marker is asserted to sit in exactly the J/L/M Autocoder
   cells (D's is inside a `{…}` pattern, asserted as such).
3. MINOR: `D_FOLLOWS_THE_ADDRESSES` cited but undeclared → JSDoc reworded: wave 3's
   `operand.ts` owns the ruling and its constant.
4. MINOR: stacker/carriage split now machine-checked (K/0o4 inline pocket dModifiers ≠
   `CARRIAGE_D_TABLE`, 3 vs 30 keys).
Notes accepted without code change: the plan's own §7.3/§7.4 tension on BB1/BB2/BOQ/BOQ1 —
ruled: follow §7.4, they are `OUT_OF_SCOPE`; BQPR2 tripwire is the `yResolved.length === 13`
assertion; `buildRows()` throws bare `RangeError` on internal invariants — **carried to wave 2**:
decide whether these become `AssemblerBug`; `startsWith(dir)` weakness matches core precedent.

**Gates (run by the orchestrator, wave-1 tree):**
```
npm run typecheck                                          clean
npm test                                                   61 files, 1152 passed (1099 + 53), 0 failed
npm run smoke                                              17 passed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
```

## Wave 2 — emit, pack, closed loop — commit 85e177d

**Landed.** `src/asm/emit.ts` (~530 after fixes — `encodeAddress` verified only by round-trip
through the shipped `decodeAddress` + the two loader pins `00A?0`/`00?!0`; `applyToStorage`;
`AssemblerBug`; pass 2 per §6.2/§8.2 incl. the §6.1 shape ladder as an operand-shape check),
`src/asm/pack.ts` (208 — 60-COLUMN budget, three break conditions, both §8.3 GM-WM tail
warnings, `{records, cardOf, warnings}`), `test/asm-emit.test.ts` (44), `test/asm-pack.test.ts`
(18 incl. the random pack→encode→decode round-trip property), `test/tier3-asm-load-equals-memory.test.ts`
(19 — the three source-free closed-loop programs through the REAL loader + 1402 + bootstrap;
hand tables independently recomputed by the reviewer). open-questions.md: Wave 2 subsection.

**Review (Opus, adversarial): APPROVE WITH FIXES — 6 findings fixed, 1 note.**
1. BLOCKER: blank-operand imperatives (`CC1`/`RW1`/`SSF1`, and too-many `H a,b`) reached
   `AssemblerBug` from source. Fixed: §6.1-shape check flags `F` before the length check;
   op char + written operands still emit at pass 1's address (FLAGGED_LINE_STILL_RESERVES
   applied to imperatives).
2. MAJOR: marked-group-mark / marked-word-separator constants would make `encodeObjectRecord`
   throw. Fixed emit-side: `F`, character emitted UNMARKED (the DA `,G` drop-the-mark pattern);
   overstated generator comment in asm-pack corrected.
3. MAJOR: `ONE_FLAG_PER_LISTING_LINE` implemented but undeclared → declared at emit.ts's
   precedence code with its open-questions row.
4. MINOR: length-check stand-down narrowed to character-dropping flags only (`Flagged.drops`);
   a U-only line still passes the invariant.
5. MINOR: INSTRUCTION column now rendered for EMITTING declaratives (Exhibit IV SEQNO 39
   `DCW AREA` prints `00315`); DA stays blank (its own Exhibit IV row prints none). Pinned
   test corrected in-wave, not left for wave 5 to rewrite.
6. MINOR: `mustCode` RangeError → `AssemblerBug`. Ruling: §4's "e.g." governs — AssemblerBug
   covers internal invariants; §6.3's "exactly one trigger" tension logged in NOTES.
Note accepted: the closed-loop comparison cannot distinguish an emitted unmarked blank from
untouched core — inherent; known limit for the wave-4/6 appended programs (demo `#n` blanks).

**Rulings recorded (NOTES §2):** pack iterates in EMISSION order (§8.3's "ADDRESS order" =
within-run; the backwards-ORG oracle requires it — reviewer confirmed global sort kills the
clobber); `pack` fills `sequence` only, ident/RESEQ belong to the caller that can see those
cards; a pooled literal resolves through the SymbolTable under the literal's own text (wave 4
must follow).

**Gates (run by the orchestrator, fixed tree):**
```
npm run typecheck                                          clean
npm test                                                   64 files, 1233 passed (1099 + 134), 0 failed
npm run smoke                                              17 passed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
```

## Wave 3 — read: source and operand — commit 1e5c1ad

**Landed.** `src/asm/source.ts` (193 — §5.1: 80-col cards, `+`→`&`, lowercase up-case, invalid
glyph F with leftmost column, col-6 `*`, labelIndented/labelIsActual), `src/asm/operand.ts`
(~750 — the §5.2 pipeline over the STORED alphabet: literal span before comment cut, ordered
rules 0-9, summed term tails, rightmost tag, explicit-d rulings, the five indexing rejections;
exports `parse(text): Statement[]`, the whole §6 parse row), `test/asm-source.test.ts` (23),
`test/asm-operand.test.ts` (61). Integration proven in review: parse→pass2 on hand cards gives
`L %10 00600 $`, `^HELLO1`, Exhibit IV's `D 00394 00311 L`, and O-degradation on `GET`.

**Review (Opus, adversarial): APPROVE WITH FIXES — 1 MAJOR + 4 fixed, 6 notes.**
1. MAJOR: term-tail F columns were 0-based operand offsets (off by 21), inverting the
   leftmost-offender sort. Fixed at the sole call site + three exact-column regression tests.
2. `dModifiers: 'bitmask'` (W/X/R forms) joins 'any' in the explicit-d check — §5.2's
   exception list was incomplete; departure recorded in open-questions + pinned by test.
3. The fourth judgment call (address-constant literal `cells` = five-blank placeholder wave 4
   must rebuild at the flush) recorded beside the other three; `&LABEL` pooled-dedup extension
   noted.
4. The >3-operand F moved under the same O>F suppression as the other address rules.
5. Op `J`'s blank d key now renders `␣` in the d-key error message (wave 5 prints it).
Notes accepted: trailing tab not stripped (the F mandate wins over the strip sentence — both
§5.1 sentences conflict, resolution in code comment); explicitD last-piece keep (line flags F
anyway); 52-char literal limit counts the brackets; no column asserted on tail errors was the
gap that let the MAJOR survive — now covered.

**The wave's real finding (accepted ruling):** `@` is BOTH the alphameric-literal bracket and
X1_CHANNEL's channel-1-with-overlap glyph, so §5.2 step 1's literal "unmatched `@` is F" would
flag the legal `RW1 @10,WORK,$`. The unmatched-@ F moved from step 1 to rule 3 (a lone `@`
locates no span; a literal HEAD without a closer still Fs at its column). Reviewer probed the
gap shut: `MLC @ABC,FIELD` F at 21, `MLC FIELD,@ABC` F at 27, `A B@C,D` F under rule 9, and a
lone `@` in a trailing comment now parses clean where the plan's wording rejected a legal card.

**Gates (run by the orchestrator, fixed tree):**
```
npm run typecheck                                          clean
npm test                                                   66 files, 1317 passed (1099 + 218), 0 failed
npm run smoke                                              17 passed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
```

## Wave 4 — pass 1 and the demo — commit e5903c1

**Landed.** `src/asm/symbols.ts` (~700 — the §6.1 assignment-counter walk, symbol table, ADDRS
one-rule, reserved extents, deck-level fields), `src/asm/literals.ts` (165 — pooling, flush,
address-constant rebuild), `demos/hello-dad.asm` (19 cards, column-exact, script-verified),
`demos/hello-dad.data.cards` (byte-exact copy of hello-dad.cards lines 2-6, md5-checked),
`test/asm-symbols.test.ts` (44), `test/asm-literals.test.ts` (17), `test/tier1-exhibit-iv.test.ts`
(18 — assembly-only, transcribed from software.md §5, COL7 corroboration quarantined),
tier-3 +22 (append-only; the three source-driven programs incl. THE DEMO through the real
loader). open-questions.md: Wave 4 subsection incl. both `,G` rows.

**The demo hit every §10 number on the first run, reviewer-recomputed independently:**
records 52/12, break at exactly 60 columns → 00551, entry 500, 64 cells, ten marks, zero
flags, NO pool, reserved [00564..00643], exactly one warning with §13 criterion 2's verbatim
text; ID's WM at 00558 / label 00563; LINE 00564 (un-indented counterfactual 00643).

**Review (Opus, adversarial): APPROVE WITH FIXES — 3 must + 3 should fixed, 12 findings total.**
Must: DA sub-entry `resolvedTo` corrected to lowOrder (software.md §5 verbatim; PST prints it);
tier-1 header FOURTEEN→FIFTEEN rows; the `,G` it-title retitled to match its (correct) body.
Should: dead `lowOrder` param dropped; the two post-walk U back-patches routed through
O>F>M>U precedence (new `raise()`, test-pinned); empty-LTORG high-water choice documented.
Notes accepted incl.: Exhibit IV's three reconstruction choices argued from research (CT-6
resolved in favour of the [verified] card geometry; /PCH/→PCH with only CT/ADDRS bound;
SEQNO 40 blank-operand filler), record-1-closes-at-00203 geometry labelled constructed,
actual labels enter the table under their digit string (dead entry, literal reading).
**Forward risk logged for waves 5/6 (reviewer finding 7):** RESEQ's sequence reset and JOB's
ident are applied to records by the CALLER (§8.3's pseudocode places them in pack(), whose
frozen two-argument signature cannot see those cards) — the wave-5 CLI and wave-6 assemble()
must map ident/RESEQ over pack's records; neither may touch pack.ts.

**Gates (run by the orchestrator, fixed tree):**
```
npm run typecheck                                          clean
npm test                                                   69 files, 1418 passed (1099 + 319), 0 failed
npm run smoke                                              17 passed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
```

**[observed] pre-existing flake surfaced during gating, NOT a Phase-3 defect:** on 2 of 5
back-to-back full-suite runs, `test/exec-bce.test.ts` and `test/exec-w.test.ts` (Phase-1
files, byte-identical to main, do-not-touch) failed by 5000ms TIMEOUT on their exhaustive
64×64 sweeps — only on runs whose total duration ballooned ~50x (50.4s vs ~1s test time;
transform 119s, import 263s) under machine load; the suite growing 58→69 files raises worker
contention. No assertion ever failed. Phase 3 may not edit those files (§3.4; exit criterion
10 pins `git diff main -- test/` to additions), so the fix (a per-test timeout bump or a
worker cap) is left to the main session. Gate ruling: a commit gates on a fully green run;
a timeout-only flake in these two files triggers one recorded re-run.

## Resume — 95d878d, 2026-08-31 08:46, after an API authentication death mid-wave-5

The orchestrator and its wave-5 worker were killed by "Login expired" (authentication_failed),
not by a build event; the worker had produced nothing on disk. Re-verified from raw git before
acting: branch `feature/phase-3` in sync with origin, HEAD 95d878d, working tree clean apart
from this file's STATUS line; `src/asm/` holds exactly the eight wave-1..4 modules; no
`listing.ts`, `listing1403.ts`, `tools/asm.ts`, `test/asm-listing.test.ts` or
`test/golden/hello-dad.lst`. Gates re-run on HEAD:

```
npm run typecheck                                          clean
npm test                                                   69 files, 1418 passed, 0 failed
npm run smoke                                              17 passed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
```

Wave 5 respawned fresh from this state with the same brief.

## Wave 5 — listing, 1403 rendering, the CLI — commit f6dd15f

**Landed.** `src/asm/listing.ts` (~250 — ListingLine[] from both passes + cardOf; heading per
page with the ident IN FORCE; pooled-literal / DA-sub-entry / PST / trailer shapes),
`src/asm/listing1403.ts` (~200 — the formatter over ListingLine[] → PrintLine[] → the shipped
`renderGreenBar`; applies `chainGlyph` itself; `LISTING_COLUMN_STOPS` one exported array),
`tools/asm.ts` (~220 — composes parse→pass1→pass2→pack→listing→listing1403; `--listing`
`--deck` `--chain` `--golden [--update]`; honours CTL suppress; `withIdent` exported),
`test/asm-listing.test.ts` (26), `test/golden/hello-dad.lst` (24 lines, 2251 bytes, generated
once via `--update`, last line `1410 AUTOCODER - IBM 1410 EMULATOR - CONSTRUCTED LISTING, NOT
PERIOD OUTPUT`), `tsconfig.tools.json` +1, `package.json` +1 (`asm`). open-questions: Wave 5.
The golden audited line by line in review against §10's ladder; CARD column recomputed from
the 52/12 split (SEQNOs 8-15 card 1, 16-17 card 2); `⧧` correctly prints BLANK on chain A.

**Review (Opus, adversarial): APPROVE WITH FIXES — 3 MAJOR + 3 fixed, 3 notes.**
1. MAJOR: RESEQ card-selection relabelled cards carrying pre-RESEQ cells (cardOf marks where a
   statement BEGINS; a post-RESEQ statement routinely begins on a card holding earlier cells).
   Ruled + fixed: a card takes the ident/sequence in force for the statement that OWNS ITS
   FIRST CELL; straddling cards keep the old identity; test-pinned on the straddling repro
   (001AAAA1 / 001BBBB2 / 002BBBB2) and on a record-boundary RESEQ.
2. MAJOR: assembler semantics (`withIdent`) live in `tools/` because `pack(items, reserved)`'s
   arity is frozen — recorded; **WAVE 6 MIGRATES IT INTO `src/asm/assemble.ts`** with a
   deck-level `001HDAD1`/`002HDAD1` assertion through `assemble()`.
3. MAJOR: `JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80` was the ONLY §15 row declared nowhere —
   declared in `listing.ts` at the heading's point of use, imported at the CLI's punch site,
   open-questions row added.
4. Page heading printed the FINAL ident on every page → now the ident in force per page.
5. Constants >18 chars are right-cut in INSTRUCTION — kept as a stated rule (§9 sized the
   column for instructions), documented + tested.
6. Unreachable-guard comment reworded. Notes: ADDRS on JOB/CTL/RUN/LOAD = current counter;
   FLAG_ORDER in three files (listing's merge is a two-way op); no date in the heading (a
   daily-changing golden cannot gate — recorded).

**Gates (run by the orchestrator, fixed tree) — SIX lines from this wave on:**
```
npm run typecheck                                                    clean
npm test                                                             70 files, 1444 passed (1099 + 345), 0 failed
npm run smoke                                                        17 passed
npm run cc01                                                         CC01A · CC01 COMPLETE · instruction check
                                                                     at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt              PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing --golden test/golden/hello-dad.lst   PASS, 2251 bytes
```

## Wave 6 — the view and the demo — commit 1ab7ac9

**Landed.** `src/asm/assemble.ts` (159 — THE entry point; never throws on source content —
reviewer fuzzed 17 hostile inputs, zero throws; `withIdent` migrated in VERBATIM from
tools/asm.ts, diff empty; the `expand()` seam empty), `src/ui/autocoder/` six files (473 lines
vs ~536 — session.ts DOM-free with `hopperText()`; the ruler derived from SOURCE_FIELDS; §2.5's
framing paragraph verbatim; A/H toggle; the modern error block gives `page 01 line 090, column
21: EOG is not defined`; PUNCH INTO HOPPER disabled unless ok), §3.2's three edits (code lines
exactly 5 / 3 / 2 — raw +12/−2, +10/−3, +3/−1, the rest comments, blanks and a signature
reflow; nothing else in those files moves), `tools/asm.ts` re-edited onto one `assemble()` call
(parseArgs byte-identical; **listing golden md5 unchanged across the rewrite**),
`test/tier4-autocoder-demo.test.ts` (22 — §1's storyboard headless through the real
operator sequence, ending on the 348-byte page byte for byte), `test/asm-demo-source.test.ts`
(5), tier-3 +37 (append-only, 0 deletions — all six §11.1 programs through `assemble()`).
§11.3 stretch ATTEMPTED, nothing landed: 10 of 11 loader fields byte-identical incl. both
indexed `D` instructions; the eleventh is the predicted `BA1 *+7` → `R 00312 ⧧` vs the shipped
`R00306⧧` = `*+1` — the comment is wrong, the constant is right; escalated (NOTES §3).

**Review (Opus, adversarial): APPROVE WITH FIXES — 2 must (both docs/process), 5 notes.**
1. MAJOR: PHASE-3-NOTES.md ended at wave 5 → §2/§3/§4 completed in this commit.
2. MINOR/process: `git diff main` reports `docs/STATUS.md −6` — branch staleness (main gained
   fa1232b after the merge-base 14bb6a2; `git log main..HEAD -- docs/STATUS.md` is empty).
   Ruling: NOT merged here; criterion 10 is measured against the merge-base; the main session
   resolves at merge.
3. Wiring diffs judged line by line: within exit criterion 10's spirit (above).
4. An inert `m.endOfJob()` after `snapshot()` in the tier-4 golden test (paper is sliced at
   snapshot; the demo's closing `F 1` makes the flush moot) — harmless, left, recorded.
5. §13 11b says "the two sample-program buttons"; the view has ONE `sample program` button
   that fills both boxes (§1 step 2's wording). **For the 11b performer.**
6. §1 step 3's "side by side" is stacked — unstyled by R13; Phase 4's. **For the 11b performer.**
7. Three frozen-and-unread parameters (`assemble`'s `opts`, `mountAutocoder`'s `machine` /
   `redraw`) — §4/§3.1 shapes kept rather than editing a wave-1 type; recorded (NOTES §2).

**Gates (run by the orchestrator, wave-6 tree) — smoke count RISES: 17 → 39:**
```
npm run typecheck                                                    clean
npm test                                                             71 files, 1486 passed (1099 + 387), 0 failed
npm run smoke                                                        4 files, 39 passed (was 3 files, 17)
npm run cc01                                                         CC01A · CC01 COMPLETE · instruction check
                                                                     at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt              PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing --golden test/golden/hello-dad.lst   PASS, 2251 bytes (md5 d243bf50… unchanged)
npm run build                                                        ✓ (vite)
```

## Close-out — 5be425e — exit criteria (plan §13), checked by the orchestrator

| # | Criterion | Status |
|---|---|---|
| 1 | typecheck clean; test green; smoke green at its stated new count; demo golden 348 bytes unchanged | **PASS** — 1486/1486 · smoke **39** (was 17) · 348 bytes |
| 2 | `assemble(demo)`: ok, zero flagged, EXACTLY ONE warning, text asserted | **PASS** (tier4-autocoder-demo, text asserted verbatim) |
| 3 | 19 body lines by kind; LOOP 00500; EOJ 00548; ID CT 6 / 00563 / WM 00558; LINE CT 80 / 00564; un-indented 00643 | **PASS** (tier 4) |
| 4 | `R 00524 ⧧` · `R 00548 8` · `L %10 00564 $` | **PASS** (tier 4) |
| 5 | 2 records, 52/12, encode/decode round trip, entry 500 | **PASS** (tier 4; idents 001HDAD1/002HDAD1 deck-level) |
| 6 | loaderDeck + 5 data cards = 10; headless operator sequence → page golden byte for byte | **PASS** (tier 4, real loader/1402/bootstrap) |
| 7 | core 00500-00564 = applyToStorage + the ONE surviving GM-WM at 00564 (00552's gone) | **PASS** (tier 4, both halves asserted) |
| 8 | four-defect source → exactly U/M/O/F, ok false, listing renders, nothing thrown | **PASS** (tier 4) |
| 9 | `npm run asm -- demos/hello-dad.asm --listing --golden test/golden/hello-dad.lst` | **PASS**, 2251 bytes, md5 d243bf50… stable across the wave-6 CLI rewrite |
| 10 | diff vs MERGE-BASE 14bb6a2: `test/` additions only (15 files, +5979 −0); non-owned changes = deckBox +12/−2 (5 code lines), mount +10/−3 (3), main +3/−1 (2), tsconfig.tools.json +1, package.json +1, open-questions +356/−0 (appended section only); src/core, src/formats, index.html, rest of src/ui, prior docs: untouched | **PASS** against the merge-base. NOTE: `git diff main` additionally shows `docs/STATUS.md −6` — main gained fa1232b after the merge-base; the branch never touched the file. Resolve at merge (not merged here). |
| 11a | `parseDeck(session.hopperText())` → 10 cards, 0 DeckErrors, cards 1-2 ≡ LOADER_BOOTSTRAP_CARD / LOADER_BODY_CARD | **PASS** (tier 4, through the DOM-free session) |
| 11b | **Browser check — run by the main session at merge, 2026-08-31 ~10:00, Chrome on `npm run dev`.** `sample program` fills both boxes; ASSEMBLE → `0 flagged lines`, exactly the one §8.3 warning (00564 inside LINE), listing headed `1403 Model 2 · chain A · 66-line form` / `HELLO DAD — REENTRY TABLE` / `PAGE 1 HDAD1`, ladder as §10; chain toggle flips `*&1`↔`*+1` (and `%10`↔`(10` — the H chain's parenthesis for 0-4-8); three card faces (00500/52, 00552/12, `E⌒J00500`); PUNCH INTO HOPPER → deck box `10 cards, 0 errors`, PUT DECK IN HOPPER re-enabled; PUT DECK → READER START → END OF FILE → key the bootstrap → 00000 DISPLAY → ALTER/START → COMPUTER RESET → RUN/START → **five lines on the green bar**, hopper 0, carriage on form 2. §2.5's paragraph visible above the source box. Listing and deck STACKED, not side by side (unstyled, R13). | **PASS** |
| 12 | Mechanical: dated `## Phase 3 — 2026-08-31` section exists (Wave 1-6 subsections); `// OPEN:` constants in src/asm/** + src/ui/autocoder/** vs NOTES §1: A (declared, no row) = ∅; B (row, no declaration) = { `LISTING_GOLDEN_IS_CONSTRUCTED` } — §15's own provenance row places it in `test/asm-listing.test.ts:42`, the one sanctioned exception; all 26 §15 rows declared. Review half → whole-branch review. | **PASS** (with the one stated exception) |

**Totals.** Six waves, six `[Asm]` commits (4606618 · 85e177d · 1e5c1ad · e5903c1 · f6dd15f ·
1ab7ac9) each followed by a one-line `[Docs]` sha-record commit; one resume after an API
authentication death mid-wave-5 (nothing lost). Deviations logged in PHASE-3-NOTES §2: 24.
Escalations to the main session: 0 mid-build (none met the bar); 4 items carried for merge
(NOTES §4: branch staleness, the exec-bce/exec-w flake, three research corrections, 11b).
Adversarial reviews: 6, every verdict APPROVE WITH FIXES, 5 MAJOR/BLOCKER findings fixed
in-wave before commit (the `#` channel expansion; blank-operand AssemblerBug; term-tail
columns; RESEQ card ownership; JOB_IDENT declaration). Not merged.
