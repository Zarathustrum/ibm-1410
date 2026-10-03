# PHASE-3-NOTES — the standalone Autocoder cross-assembler

## 1. [unverified] / [likely] fallbacks hit (each behind a named constant with // OPEN:)

| Constant | Tag | Where | Fallback taken |
|---|---|---|---|
| `RW_HASH_IS_LOAD_MODE` | [likely] → **[verified] 2026-08-31** | `mnemonics.ts` `IO_FAMILIES` (+ `AMBIGUOUS`, now empty) | `RW#` → `L` (load mode). Confirmed: A22-0526-3 Fig 107 p.104 `R(#)w°` → `M or L`, legend `w` = W if load mode; C28-0309-1 p.47 puts every RW-family form on `L` and none on `M`. The row-207 correction landed (§3 below) |
| `WM_HASH_STAYS_AS_SHIPPED` | [unverified] → **[verified] 2026-08-31** | `mnemonics.ts` `IO_FAMILIES` | `WM#` → `M` exactly as `table.ts` ships it. Confirmed: A22-0526-3 Fig 107 p.105 `WM(#)° b` → `M x¹21 (B) W` — no `w` suffix, no `L` form — and C28-0309-1 p.47 `WM  WRITE WORDMARKS  M %21`. A distinct printer function selected by **x³ = 1** against Write a Line's **x³ = 0** — both the 1403 at **x² = 2**, which is why the fields read `%21` and `%20` (the earlier note here said x2 = 1 vs x2 = 0; the ruling was right, the position name wrong, corrected 2026-08-31). Not a load-mode variant, so the `W`-rule never applied |
| `BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY` | [unverified] | `mnemonics.ts` rxRows | d = `9` (bits 8+1), what the shipped loader executes at 00292 |
| `V_ZONE_WORD_IS_THE_THIRD_OPERAND` | [unverified] | `mnemonics.ts` vRows | zone word as explicit third operand; `BZN`/`BWZ` carry 3 rows, not 9 |
| `T_MNEMONIC_SUFFIX_IS_THE_D_BITS` | [likely] | `mnemonics.ts` tRows | L=1 E=2 H=4 summed; all six §2 rows agree |
| `MOVE_MNEMONIC_IS_DIR_PORTION_TERM` | [likely] | `mnemonics.ts` moveScanRows | 64 derived names; four independent repo hits (MLCB→L, MLC→C, MLCWS→7, MRCWG→Δ) |
| `CARRIAGE_MNEMONIC_TAKES_THE_D_AS_ITS_ONLY_OPERAND` | [likely] | `mnemonics.ts` | `CC1 1` writes the d literally |
| `STACKER_MNEMONIC_TAKES_THE_POCKET_AS_ITS_ONLY_OPERAND` | [likely] | `mnemonics.ts` | `SSF1 1`; pocket d from the op's own inline dModifiers, machine-checked ≠ carriage table |
| `IO_OPERAND_IS_XCONTROL_BADDR_D` | [unverified] → **RETIRED 2026-08-31, settled AGAINST** | was `mnemonics.ts` ioRows | The constant is gone, not flipped — nothing read it. The operand of a unit-record statement is the **stacker pocket and the B-address** (`R1W 0,LINE,$`), or the B-address alone (`W1 LINE`); the mnemonic supplies x1, x2 and the d. A22-0526-3 Fig 107 pp.104-105 + p.62; C28-0309-1 pp.23, 41, 47-48. The x-control-as-operand facility is real and TAPE-only (p.23 method 3; `CU %U2,W`, p.48). See §2's deviation and `DECISIONS.md` 2026-08-31 |
| `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS` | **[unverified], new 2026-08-31** | `operand.ts`, beside `D_FOLLOWS_THE_ADDRESSES` | a d written last still wins over the mnemonic's baked `R`/`W`. C28-0309-1 p.41's D-marker marks no unit-record row and p.23 defines the read operand as two entries, but p.21 says the d is "taken from the operand field if the programmer has supplied it"; no worked example tests the case. Taken because the demo and the loader reconstruction need `d = $` on a 1402 read (C28-0351-5 p.8 Table II). Fallback: a distinct mnemonic in the `RTG`/`RTGW` mould (`RG`/`RWG`) |
| `STANDALONE_HAS_NO_NOP_PSEUDO_OP` | [unverified] | `mnemonics.ts` / `asm-pseudo-ops.test.ts` | NOP/NOPWM pseudo-ops out (`O`); the imperative `NOP` (op `N`) is in. Declines the open-questions default; dated row records the reversal |
| `CONSTANT_MAY_SPAN_CONDENSED_CARDS` | [unverified] | `pack.ts` | a long constant splits across cards; separator+char never split, by construction. REVERSES open-questions' own capped fallback — the closed loop proves the split byte for byte |
| `DA_EMITS_ONLY_ITS_MARKED_POSITIONS` | [unverified] | `emit.ts` | DA emits one marked blank per defined field high-order, clears nothing else; OS clear-first behaviour is the one-switch fallback |
| `ONE_FLAG_PER_LISTING_LINE` | [unverified] | `emit.ts` (FLAG_ORDER/strongest) | one letter, precedence O > F > M > U; fallback widens FLAG to four positions |

| `SOURCE_LOWERCASE_UPCASES` | [likely] | `source.ts` | lowercase up-cases as a typing alias; anything else `bcdOfGlyph` rejects is F with its column, stored blank |
| `SOURCE_PLUS_IS_THE_12_PUNCH` | [likely] | `source.ts` | `+` normalises to `&` (Hollerith 12, BCD 0o60) before the card is stored; chain A prints `&`, chain H `+` |
| `D_FOLLOWS_THE_ADDRESSES` | [likely] | `operand.ts` addressSlots | the explicit d is the operand after the form's addresses; §4 shows only the two-address case |

| `COL7_INDENT_IS_STANDALONE_TOO` | [likely] | `symbols.ts` addrsOf/defineLabel | a column-7 label resolves high-order on the standalone too (C28-0326-2 p.28 wording; Exhibit IV 00396/00402 the evidence); the demo's ` LINE` depends on it |
| `ACTUAL_LABEL_IS_CHECKED_AGAINST_THE_COUNTER` | [unverified] | `symbols.ts` | actual label defines high-order, moves nothing, and a counter mismatch flags F (only the check is open; both §1 sentences [verified]) |
| `MULTIPLY_DEFINED_KEEPS_THE_FIRST_VALUE` | [unverified] | `symbols.ts` define | first value stands; later definitions M; references unflagged |
| `FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS` | [likely] | `symbols.ts` suffix branches | a flagged `DA 1X80,G` still reserves 81, assigns header + sub-entries, advances; only the mark emission drops. Tier-1 asserts 00315/00318/00394 on an F line |
| `EQU_TO_AN_XCONTROL_FIELD_IS_OUT` | scope, [verified] source | `symbols.ts` EQU | the fourth EQU form (tape unit / x-control) flags F; a 3-glyph symbol namespace has no consumer here |

| `LISTING_COLUMN_STOPS` | [unverified] | `listing1403.ts` (one exported array) | §9's stops; console-and-physical.md §12 publishes the OS column SET, not metrics; only our constructed golden depends on them |
| `LISTING_LINES_PER_PAGE` = 55 | [likely] | `listing.ts` | the OS /LIN/ default on the 66-line DEFAULT_CARRIAGE_TAPE |
| `LISTING_TRAILER_FOLLOWS_THE_OS_FORM` | [unverified] | `listing.ts` trailer | flag count + ≤20 flagged SEQNOs (C28-0326-2 p.57); its last line carries the CONSTRUCTED label |
| `JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80` | [likely] | `listing.ts` identOf (heading); punched at the CLI / assemble() | JOB's own cols 76-80 → every condensed card's 76-80 and the heading; fallback = first five of the operand, one edit |
| `LISTING_GOLDEN_IS_CONSTRUCTED` = true | provenance | `test/asm-listing.test.ts` | declared so a reader can grep it; the golden's own last line says so; [observed] at best |

## 2. Plan deviations (minimal, logged, not redesigns) and modelling refusals

- **Wave 1: `#` channel-digit expansion added to `mnemonics.ts`** (review finding, MAJOR).
  §7.4 said "the `#` is a channel digit the mnemonic supplies" but no wave-owned mechanism
  expanded it; no later wave owns the file. `MnemonicRow` gained `channel?: 1|2` and
  `sourceName?: string`; resolver rows 159 → 166. The literal `#` spelling does not resolve.
- **Wave 1: BB1/BB2/BOQ/BOQ1 ruled `OUT_OF_SCOPE`** per §7.4 direction 2b, though §7.3's prose
  says they derive — plan-internal tension, ruled in §7.4's favour (matches the MICR
  precedent). BOL1/BOL2 resolve (`unimplemented`).
- **Wave 1: `mnemonics.ts` ~600 lines vs plan's ~230** — the excess is the OPEN ledger, the
  30-row reasoned OUT_OF_SCOPE list, and citations; derivation code ~180 lines.
- **Wave 1: `D_FOLLOWS_THE_ADDRESSES` deferred to wave 3** (`operand.ts` owns the positional
  ruling; `mnemonics.ts` only records who supplies the d).
- **Wave 2: §8.3's "ADDRESS order" read as EMISSION order across runs** (address order within a
  run). §11.1's backwards-ORG oracle requires it — a global address sort erases the clobber the
  warning exists for. Recorded in `pack.ts`'s header and open-questions; mutation-tested.
- **Wave 2: `pack` fills `sequence` only.** The binding two-argument arity means JOB/RESEQ are
  invisible to it; ident and RESEQ's mid-deck reset are one map over the returned records in
  the caller (wave 5/6). `ObjectRecord.ident` stays undefined in wave 2.
- **Wave 2: the §6.1 shape ladder became an emit-side operand-shape check** (review BLOCKER:
  blank-operand imperatives threw `AssemblerBug` from source). Missing/excess operands flag
  `F`; the op char and whatever was written still emit at pass 1's address — the
  FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS pattern applied to imperatives.
- **Wave 2: a constant whose high-order character is a group mark or word separator flags `F`
  and emits UNMARKED** (the DA `,G` drop-the-mark pattern) — closes the only assembler route
  into `encodeObjectRecord`'s two non-budget rejections without touching `src/formats/**`.
- **Wave 2: `emit.ts`'s `mustCode` throws `AssemblerBug`, a second internal-invariant site**
  (`operand.ts` has a `mustCode` of its own that throws `RangeError`, a construction guard —
  whole-branch review). §4's table
  says "internal invariant violation, e.g. an assembled length…" — the length check is an
  example; §6.3's "exactly one trigger" reads too narrowly and is noted here rather than
  papered over.
- **Wave 2 ruling wave 4 must follow:** a pooled literal resolves through the `SymbolTable`
  under the literal's own text (`@AB@`, `+LABEL`, `#5`); no collision with symbols is possible
  (≤10 chars, alphabetic-first, special-free).
- **Known limit:** the closed-loop comparison cannot see an emitted unmarked blank (identical
  to untouched core). Waves 4/6 programs with blank constants inherit this.

- **Wave 3: the unmatched-`@` F relocated from §5.2 step 1 to rule 3.** `@` is also
  X1_CHANNEL's channel-1-with-overlap glyph ([verified], software.md §10.9), so step 1's
  literal wording would flag what was then the legal `RW1 @10,WORK,$` (no longer a statement any
  source deck can write — see the 2026-08-31 entry below). A lone `@` now locates no span;
  a literal head without a closer still Fs. Reviewer probed the gap shut on four cases.
- **Wave 3: `dModifiers: 'bitmask'` joins `'any'` in the explicit-d exception** — a summed-bit
  d has no enumerable key set (W/X/R forms, table.ts); §5.2 named only 'any'. Test-pinned.
- **Wave 3 judgment calls (all in open-questions):** label trimmed both ends; DA-header /
  unknown-op lines suppress address-rule Fs on §6.3's own O>F reasoning (>3-operand F moved
  under the same rule in review); `&LABEL&10` is rule 5's literal with an adjusted ADDRESS,
  per §3's verbatim sentence; an address-constant literal's `cells` are a five-blank
  placeholder — **wave 4's literals.ts must rebuild the value at the flush** — and `&LABEL`
  pooled-dedup is an extension beyond §3's stated numeric/alphameric dedup sizes.
- **Wave 3: a trailing tab is NOT stripped** — §5.1's "trailing whitespace stripped" and
  "a tab is an F" conflict; the F mandate wins (stripping would hide a mandated flag).

- **POST-MERGE 2026-08-31 — the Autocoder I/O statement is now the manual's own, and the plan's
  is retired.** §5.2 step 3 rule 1 had the programmer WRITE the three-position x-control field
  (`RW1 %10,LINE,$`). A22-0526-3 Figure 107 pp.104-105 and C28-0309-1 pp.23, 41, 47-48 say
  otherwise on four independent readings, so the assembler now SYNTHESISES it: the mnemonic
  supplies x1 (channel + overlap, `X1_CHANNEL`), x2 (device, `X2_DEVICE`) and the baked d
  (`R`/`W`), and the source writes the stacker pocket and the B-address — `R1W 0,LINE,$`,
  `W1 LINE`. The channel digit is INFIXED (p.62, "RW or R1W (Ch 1) / R2W (Ch 2)"); only
  `WM(#)°` suffixes it; the overlapped forms are generated and marked `unimplemented`. Fifty
  I/O mnemonics where the `#`-suffix reading gave eighteen, and the resolver holds **198** rows
  where it held 166. **Logic moved in `mnemonics.ts` and `operand.ts` only** — `emit.ts`,
  `symbols.ts`, `listing.ts`, `pack.ts`, `objectdeck.ts` and `types.ts` are byte-identical,
  because they key on `Operand.kind === 'xcontrol'`, on operand counts and on
  `statement.d ?? row.d`, never on source text. **Zero assembled bytes moved**: the object deck
  is byte-identical, cc01 is byte-identical, the 348-byte page golden is untouched, and only the
  OPCOD and OPERAND columns of two lines moved in the 2251-byte listing golden.
  `IO_OPERAND_IS_XCONTROL_BADDR_D` retired; `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS` is
  the one exception carried, `[unverified]`.
- **POST-MERGE 2026-08-31 — one consequence in `emit.ts` that changed BEHAVIOUR without an edit.**
  A blank-operand `R1W` now emits two characters, not one: the mnemonic bakes the d, so the
  shape flag names the x-control field and the address and no longer names the d.
  `test/asm-emit.test.ts`'s blank-operand block pins the surviving emission per row.
- **POST-MERGE 2026-08-31 — `PB1`/`PB2`/`PB1O`/`PB2O` are deliberately NOT generated.**
  C28-0309-1 p.48 lists punch column binary at `M %80`, `io.md` records column binary as a
  `[verified]` NEGATIVE for the 1410, and `X2_DEVICE` has no `8` row. Recorded as an
  open-questions row, not resolved in code; `test/asm-mnemonics.test.ts` pins the absence.
- **POST-MERGE 2026-08-31, RECORDED NOT ACTED ON — bare `SSF` and bare `CC` still do not
  resolve.** The I/O flip implemented the very "`(#)` = 1 or 2 for Ch, but the 1 may be omitted"
  rule (A22-0526-3 Fig 107 p.105) that now generates bare `R`/`P`/`W`/`WM`, which makes the
  omission conspicuous — but `carriageAndStackerRows()` still emits only `CC1`/`CC2`/`SSF1`/`SSF2`.
  The manuals carry the bare spellings: C28-0309-1 p.47 `SSF 0 SELECT STACKER 0 AND FEED —
  CHANNEL 1  K 0`; p.48 `CC 1 CARRIAGE CONTROL I/O CHANNEL 1  F 1`; A22-0526-3 p.62 prints "SSF
  or SSF1 (Ch 1)" and Fig 107 p.104 spells the three rows `SSF(#) 0/bl`, `SSF(#) 1`, `SSF(#) 2`.
  **Pre-existing and out of scope** — the flip did not cause it and does not depend on it.
- **POST-MERGE 2026-08-31, RECORDED NOT ACTED ON — a FLAGGED pocket still reaches the object
  deck as a machine instruction.** Reproduced on the demo deck: `R1W 3,LINE,$` flags F on the
  pocket and still assembles CT 10 `L %13 00564 $`, the bad glyph carried verbatim into x³;
  `R1W LINE` flags F on the MISSING pocket and assembles CT 5 `L %1␣ R`, which shifts every
  later address (BEF1 lands at 00505, not 00510). Verified against a HEAD worktree as **not a
  regression**: HEAD assembles `RW1 %13,LINE,$` to the same CT 10 `L %13 00564 $` with **zero**
  flagged lines, because there was no pocket for it to validate. This is
  `FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS` (§1) meeting the new pocket validation, and
  `xControlOf` builds the field at three positions precisely so the defect shows in the
  INSTRUCTION column rather than as a downstream length complaint. **No change.**

- **Wave 4: the demo's published numbers all held** — 52/12 records, the 60-column break at
  00551, entry 500, one warning with the plan's verbatim text. No packer-vs-plan correction
  needed.
- **Wave 4: Exhibit IV reconstruction choices** (documented in the tier-1 header, argued from
  research): `@EOJ@,G` CT 6 honoured over the operand text (the [verified] card geometry
  00396+00012 and row 69's `@ERROR@,G` corroborate ,G-reserves-one-position); `/PCH/` → `PCH`
  (only CT/ADDRS are §11.2-bound); SEQNO 40's OS blank-operand forward reference reproduced as
  its published `J 00000`/CT 7. Record 1's close at 00203 is fitted filler, labelled as such.
- **Wave 4 mechanical rulings** (open-questions): pooled-literal SEQNOs continue past the last
  card; `SymbolEntry.duplicate` is set on the STORED entry; an area-defining literal's label
  dies from the POOL but survives in the flat symbol table — the one place a [verified]
  scoping sentence is knowingly not fully honoured, recorded; an empty-pool LTORG moves the
  counter but not the high-water mark.
- **Wave 4 → waves 5/6 task (review finding):** ident and RESEQ renumbering are a caller-side
  map over pack's records — §8.3's pseudocode places them inside pack(), whose frozen
  two-argument arity cannot see JOB/RESEQ. The wave-5 CLI and wave-6 assemble() own it.
- **[observed] flake, pre-existing:** exec-bce/exec-w (Phase-1, untouched) timeout-flake under
  load, 2-of-5 full-suite runs during wave-4 gating; fix is outside Phase 3's boundary (exit
  criterion 10 pins test/ to additions). Left to the main session.

- **Wave 5: `withIdent` (JOB ident + RESEQ reset over pack's records) lives in `tools/asm.ts`**
  — §8.3's sketch put it inside pack(), whose two-argument arity is binding. Wave 6 migrates
  it into `src/asm/assemble.ts` (checkable: 001HDAD1/002HDAD1 through assemble()).
- **Wave 5 ruling — RESEQ card ownership:** a card takes the ident/sequence in force for the
  statement that owns its FIRST cell; a card straddling a RESEQ keeps the old identity and the
  sequence rebases to 001 on the first card the RESEQ governs. software.md §6's [verified]
  sentence says nothing about card boundaries; this is the modelling choice, test-pinned.
- **Wave 5 rendering rulings (open-questions):** no date in the page heading (a golden that
  changes daily cannot gate a commit — the date column is left blank, not invented); a
  constant longer than 18 characters is right-cut in INSTRUCTION (§9 sized the column for
  instructions; console-and-physical.md §12's REL second line is the rejected alternative);
  ADDRS is printed on JOB/CTL/RUN/LOAD as the current counter; the heading prints the ident
  in force at that page, not the final one.
- **Wave 5: the golden's constructed label** rides in the OS trailer's processor-identification
  slot — the artifact labels itself, no separate banner.

- **Wave 6: `withIdent` migrated verbatim into `src/asm/assemble.ts`** (diff empty);
  `tools/asm.ts` re-exports it so wave 5's frozen test keeps importing from `../tools/asm.js`.
  The listing golden is byte-identical across the CLI rewrite (md5 d243bf50…).
- **Wave 6: three frozen-and-unread parameters** — `assemble(text, opts)`'s `opts.chain` (§4
  gives AssemblyResult no rendered page, so the chain goes to `renderListing` at both call
  sites) and `mountAutocoder(machine, deckBox, host, redraw)`'s `machine`/`redraw` (the block
  touches no machine state). §4/§3.1 shapes kept rather than editing a wave-1 type.
- **Wave 6: `npm run smoke` 17 → 39** (tier4-autocoder-demo adds 22); stated in the commit.
- **Wave 6: §11.3 stretch attempted, nothing landed** — loader source made column-exact
  (`RW#`→`RW1`, DS labels to col 7), assembled, diffed: 10/11 fields byte-identical incl.
  `D0035000A?07` and `D0010000?!0Δ`; two correct Fs (`GMWM DCW @⧧@` — a marked group mark;
  `PAYLD DS 0`); the eleventh is `BA1 *+7` (§3 below).
- **Wave 6 (review note, left as is):** an inert `m.endOfJob()` after `snapshot()` in the
  tier-4 golden test — paper is sliced at snapshot; the demo's closing `F 1` makes it moot.
- **Not a Phase-3 edit — the storyboard's wording for the 11b browser check:** the view has
  ONE `sample program` button filling both boxes (§1 step 2), where §13 11b says "two"; and
  listing/deck are stacked, not "side by side" (unstyled by R13 — Phase 4's).

## 3. Research corrections and [observed] observations

| Finding | Status |
|---|---|
| `RW#` appears under both `OP_L` (043) and `OP_M` (044) in `table.ts` AND `opcodes.md` §2 rows 206/207 | Escalated to orchestrator (declared in-plan, §7.2). Resolved to `L` behind `RW_HASH_IS_LOAD_MODE`. **ACCEPTED 2026-08-31** by the main session on a primary read of A22-0526-3 Fig 107 p.104 and C28-0309-1 p.47: `RW#` removed from `opcodes.md` §2 row 207 **and** from `table.ts` `OP_M.autocoder`, constant retagged `[verified]`, `AMBIGUOUS` emptied, open-questions row closed. Cause named: Fig 107 gives each family one combined "M or L" row, and splitting those into two op rows duplicates the load-mode name |
| `WM#` ("Write Word Marks As 1's") sits under `OP_M`; Phase 3 read the `W`-suffix rule as implying load mode | Escalated beside `RW#` (declared in-plan, §7.4). Resolved as shipped behind `WM_HASH_STAYS_AS_SHIPPED`. **CONFIRMED 2026-08-31, research NOT edited** — A22-0526-3 Fig 107 p.105 `WM(#)° b` → `M x¹21 (B) W` (no `w`, no `L` alternative) and p.80 in prose; `WM` is selected by **x³ = 1**, a different printer function from `W` (**x³ = 0**) on the same 1403 at **x² = 2** (position name corrected 2026-08-31), so it never was an exception to the rule. Constant retagged `[verified]`; only comments changed |

| `loader.ts`'s regenerable-source comment writes `BA1 *+7` at 00299 | Wave 6's non-gating stretch assembled the comment: `*+7` → `R 00312 ⧧`; the SHIPPED deck holds `R00306⧧` = 00299 + 7 = its own fall-through = `*+1` under the [verified] asterisk rule (software.md §2). The constant is right, the comment is wrong. Escalated; `src/formats/**` NOT edited; dated open-questions row (Wave 6) **ACCEPTED 2026-08-31** by the main session on Zarathustrum's commissioned sequence: `src/formats/loader.ts:90` now reads `BA1   *+1`. One comment character; `CONDENSED_LOADER_PROGRAM` untouched (it was already right); no gate moved. |
| The `,G` collision (§2.4), narrowed | Exhibit IV's `EOJ DC @EOJ@,G` rode an OS RELOCATABLE deck; `OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK` is right for OUR loader (its `D … 00?!0 Δ` terminates on a GM-WM) and for the standalone absolute format as we model it. Escalated as a dated row (Wave 4); `,G`/`,#` flag F and still reserve; the DA `,G` CARD-column question stays OPEN while we emit nothing for it (§11.2) |
| Two open-questions rows Phase 3 DECLINES rather than takes | `CONSTANT_MAY_SPAN_CONDENSED_CARDS` (the file proposed capping at one card; the closed loop proves the split) and `STANDALONE_HAS_NO_NOP_PSEUDO_OP` (the file proposed accepting both; C28-0309-1's op table is unconfirmed). Both carried as dated rows with the reversal stated |
| [observed] exec-bce / exec-w timeout flake | Phase-1 files, untouched; 2-of-5 full-suite runs under load during wave-4 gating; fix (per-test timeout or worker cap) is outside Phase 3's boundary |

## 4. Open items carried out of Phase 3

**Into Phase 5 (RPG):**
- The generator emits **macro-free, open-coded** Autocoder (`R1W`/`BEF1`/`W1` with the stacker
  pocket and buffer moves; the assembler builds the x-control field, 2026-08-31) — the surviving
  1410 RPG processor's output used IOCS
  macros (DTF/GET/PUT) and an `RG` control card (software.md §12.5); no macro library exists
  here (§2.3). Cite it in the Phase 5 plan, not in Phase 3's code.
- The RPG spec-sheet column layout (B1) is still open — the Phase 5 plan decides it.
- Card record areas: `DA` with `hi,lo` / bare-`lo` sub-entries is in; `,G` / `,#` are F (set a
  group mark at run time with `,` over a group-mark DCW, or read one off a card — §2.4).
- RESEQ card ownership (a card takes the identity of the statement owning its first cell) and
  the pooled address-constant rebuild are settled in `assemble()` / `symbols.ts`; the
  generator need not think about either.

**Into Phase 4 (period UI):**
- The Autocoder view is unstyled: listing and deck are stacked, not side by side; one
  `sample program` button; no CSS edits (R13). Phase 4 restyles and may split the button.
- The `.green-bar` listing and `renderCard` faces are reused as-is; the A/H toggle exists.

**For the main session at merge:**
- Branch is behind `main` by fa1232b (a STATUS.md doc commit) — resolve at merge.
- exec-bce / exec-w timeout flake (Phase-1 tests) — a per-test timeout or worker cap, outside
  Phase 3's diff boundary.
- Three probable research corrections carried out of Phase 3 — **all three closed 2026-08-31** by the
  main session on Zarathustrum's commissioned sequence: `RW#` **corrected** out of `opcodes.md` §2 row 207 and
  `table.ts`; `WM#` **confirmed** on `M`; `loader.ts`'s comment fixed to `BA1 *+1`. None edited by
  Phase 3 itself. A **fourth** finding surfaced from the same pages and was **settled 2026-08-31**
  on Zarathustrum's "do what's best": `IO_OPERAND_IS_XCONTROL_BADDR_D` is retired — the period Autocoder
  wrote `R1 1,B`, not `RW1 %10,LINE,$`. See §1 and §2's post-merge entries.
- EX/XFR's insertion point is named (§2.2) and unbuilt; the `expand()` seam is empty.
