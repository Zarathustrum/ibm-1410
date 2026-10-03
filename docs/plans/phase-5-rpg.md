# Phase 5 — RPG: specification sheets to a printed report

Companion to [architecture.md](architecture.md) §2, §3 item 8, §5 step 0, §8, §12. Structural
template: [phase-3-autocoder.md](phase-3-autocoder.md), whose section order, table conventions and
level of concreteness this plan follows. Immediate precedent: Phase 3's standalone Autocoder
cross-assembler, which this phase **consumes exactly as shipped** and may not edit.

Single build on `feature/phase-5-rpg` in the main checkout — no worktree, no parallel phase — with
per-wave file ownership. Every machine claim cites a manual form number and page, or a
`docs/research/` file and section. Every `[unverified]` / `[likely]` item is in §15 with its named
`// OPEN:` constant and its fallback. **1401 ≠ 1410**: the sheet layout is a 1401 manual's,
legitimately (shared X24 forms, `[verified]`), which makes carrying a 1401 *machine* fact across
with it the sharpest hazard in the phase — §2.4 is the list of the ones already caught.

The design panel that produced this plan ran in the full Phase-3 shape: three Opus architects
(sheet-first, cycle-first, report-first), three Opus judges (testability, buildability,
period-fidelity), two Opus skeptics (engineering, research). Aggregate scores **cycle-first 484 ·
sheet-first 422 · report-first 411**. This plan is built on cycle-first with every required graft
taken, every named fatal flaw fixed, and a ruling stated wherever the judges disagreed.

---

## The seven bullets

1. **Wave 1 writes the program, not the generator.** A person hand-writes `demos/sales-summary.asm`
   — the whole RPG logic cycle in real open-coded Autocoder — assembles it with the **shipped**
   `assemble()`, loads it through the **real** condensed loader and the **real** 1402, prints it on
   the **real** 1403, and freezes the page. Zero generator code. Waves 2-6 are then judged by
   re-deriving a human artifact rather than by agreeing with themselves. This plan's own draft of
   that program already assembles: **`ok: true`, 0 flagged lines, 0 warnings, 270 source cards, 39
   condensed cards, entry `START` at 00808, high-water 02833, core-size code 1** (`node
   build/tools/asm.js`, 2026-08-31 — §10.4, which pastes the run's own listing columns).
2. **Wave 0 is a bounded primary read and the only wave that writes no code.** Two attempts, then
   stop — the Phase-1b MCE-gate precedent — over J24-0215-2 pp.10-44 for what `F1`-`F6` are, for
   total-time versus detail-time on a level break, for the edit control word, and for **which
   column of a three-column condition group carries the negation**; **and over the
   PR-108 tape's own generated-program skeleton at bytes 501,525-539,427**, which is the only
   primary evidence in existence about the shape of the program this phase generates and which all
   three architects missed. It closes by appending a dated `## 10.` to `rpg-sources.md` and
   **freezing §15's ledger**, so the build cannot quietly acquire new unverified rulings.
3. **`src/rpg/sheets/columns.ts` is the single place a column number is written in the whole phase**
   — one cited `SheetField[]` per sheet, diffed **field by field in both directions** against
   `rpg-sources.md` §6.1-§6.4's own markdown tables under a published five-shape expansion rule
   (§6.5 is the refused 1401 `CNTL` table and is exempt, §7.2). That is
   `test/asm-pseudo-ops.test.ts`'s mechanism aimed at the one artifact in this phase with a
   `[verified]` layout, and it makes a wrong column fail a test that reads the research file rather
   than one that reads the code.
4. **We obey the research where it is verified and name every place we do not.** §6.4's `[verified]`
   *"Level number ≠ control-field number"* is obeyed: a total line's level only **orders** it, its
   `Fn` indicator **fires** it. The 1401 High-Low-Equal Compare gate on the `H`/`L` statuses does
   **not** cross to the 1410 (A22-0526-3 p.28). The `RG` card is read as `RG` in columns 1-2 and
   nothing else — body 3-75 diagnosed, 76-80 neither read nor diagnosed because its two candidate
   readings disagree (the sheets' page-and-card identification, the 1401 `CNTL`'s program
   identification) — because `rpg-sources.md` §1 item 5 says *do not invent columns*. §6.4 p.38's `OF` rule is
   obeyed too, so the demo's overflow heading is an independent `HBx` line rather than an
   `1P`-or-`OF` group; §6.2's `Cxx` names the record type from Input cols 1-3; and §6.3's multiply
   length rule sets the commission field at 14 positions. And the plan says
   in its own words that the real 1410 RPG emitted **IOCS macros** (§8, `[verified]` off the tape)
   and that ours is open-coded because no macro library exists here.
5. **Nothing throws, so no gate may be phrased as "it did not throw."** `generate()` returns
   diagnostics; `assemble()` never throws on source content. Every wave gate therefore reads
   `ok === true` **and** `flagged` empty **and** `warnings` empty. The storage-layout rule that
   keeps `warnings` empty is named and load-bearing: **every reserved area sits above the code and
   below the print-area group mark, with one slack position between the code and the first reserved
   area**, so the loader's terminating group-mark-with-word-mark lands on nothing (§8.1). The
   constant is `RESERVED_AREAS_SIT_ABOVE_THE_CODE_AND_BELOW_THE_PRINT_GROUP_MARK`, and it is named
   that way because `PLGM` is an emitted cell that sits **above** the reserved areas by necessity
   (§8.1, §15). **And it has a companion the assembler cannot check at all**, because `DA` and `DS`
   emit nothing:
   `RESERVED_AREAS_ARE_PAIRWISE_DISJOINT_AND_THE_PRINT_AREA_CLEARS_THE_CARD_IMAGE` — the extents are
   pairwise disjoint and ascending and `printLine = ceil((cardIn + 80) / 100) * 100`, asserted over
   the `Layout` value in `test/rpg-layout.test.ts` because an earlier draft of §10.4 rounded the
   boundary off the card image's **start** and put 22 positions of the print line inside it with
   `ok`, `flagged` and `warnings` all green (§8.1 item 4).
6. **One choke point for I/O source, enforced three ways.** The period form is settled and shipped
   (`R1 0,CDIN`, `W1 PLINE`, `CC1 /` — the mnemonic supplies channel, device, mode and d; the
   programmer writes the pocket and the B-address), so the choke point is now a **lint against
   drift**: an import test, a string-literal lint whose target set is computed from the shipped
   resolver, and a runtime check that the generated deck's I/O op fields are a subset of what
   `emitio.ts` can produce. **That computed set has 47 members and `P1` is one of them**, so the
   `1P` indicator's label is `FSTPG`: the lint is not weakened to admit a generated label, the label
   moves. The generated read deliberately takes the family's **baked** `d`, so
   this phase never leans on `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS`, which is still open
   for Zarathustrum.
7. **Seven waves, ~3,670 source + ~450 UI + ~170 CLI + ~2,420 test lines, zero new dependencies** —
   larger than Phase 3's ~4,450 because four specification sheets are four parsers, and honestly
   costed in R1. **Eight spec decks in four groups** (the demo, a cycle probe, an
   anti-transcription card list, five stress decks), **three** 1403 page goldens, each authored by hand from a **published
   print-position column map committed before it** — `sales-summary` frozen at wave 1, `cycle-probe`
   and `card-list` at wave 5, because wave 3 has no producer for a printed page (§11 wave 3) — plus
   `PHASE-5-NOTES.md`, `docs/BUILD-LOG-5.md` and a dated Phase 5 section in
   `docs/research/open-questions.md`.

---

## 1. The storyboard, step by step

This is what the owner and a family member do. Every later section exists to make one of these steps true, and
§13 is this list turned into assertions.

1. Open the page. Below the internals panel, the unit-record block and the Phase-3 Autocoder block
   there is a new block headed **RPG — 1410 Report Program Generator (host-side)**, carrying §2.5's
   framing paragraph: C28-1443 is not digitised anywhere (`rpg-sources.md` §1 item 1, §3); the
   sheet layout is the shared X24-1336…1339 card-system forms read out of J24-0215-2 (§2.3, §6);
   the real 1410 RPG needed 20K, a 1402 and **two** tape units to generate, and 20K, a 1402, **four**
   tape units and a 1403-2 to assemble its output (`software.md` §12.5 — four in total, not four in
   addition), so this configuration could never have run it; and the real processor emitted
   **IOCS macros** where ours emits open code.
2. Press **sample specs**. The spec textarea fills with `demos/sales-summary.rpg` — **60
   80-column cards** in the `[verified]` §6.6 order: the `RG` control card, one `C` Input card,
   **five** `D` Data cards, seven `A` Calculation cards, and **forty-six** `L`/`F`/`B`/`K`/`W`
   Format cards on two sheets,
   column 1 identifying the sheet. A second box fills with `demos/sales-summary.data.cards`. Above
   the spec box a **column ruler redraws from the character in column 1 of the line the caret is
   on** — `C` gives the Input sheet's stops, `L`/`F`/`B`/`K`/`W` the Format sheet's — sourced from
   `src/rpg/sheets/columns.ts`, so the ruler a person types against and the parser's table are the
   same data.
3. Press **GENERATE**. Nothing throws. Three panels appear:
   - the **diagnostics** block, empty here, and using the 1410 processor's own recovered vocabulary
     — `END INPUT SPECS`, `END DATA SPECS`, `END CALC SPECS`, `END OF RPG.BEGIN AUTOCODER`, the
     message numbers 10802-10806 for the `RG` card — each tagged `recovered-1410` or `ours`;
   - the **memory map**: the constants at 00500, the code, the slack position, the indicator file,
     `CDIN` with its six named card-field sub-entries, `PLINE` on its hundreds boundary, `PLGM`, the
     high-water mark, and the `CTL` core-size code that covers it;
   - the **generated Autocoder source**, ~270 80-column cards, the deck a period analyst would have carried down
     the hall to the assembler.
4. Press **SEND TO AUTOCODER**. The Phase-3 source box and its data-card box fill through a new
   typed `setText()` — the one pair of edits into a Phase-3 UI file, and exactly the
   `deckBox.setText` precedent Phase 3 set and `DECISIONS.md` 2026-08-31 records.
5. Press **ASSEMBLE** in the Autocoder block. Phase 3's shipped path: the 1403-format listing
   renders with **0 flagged lines**, `ok === true`, **0 warnings**, and the object deck appears as
   39 condensed card faces plus the execute card.
6. Press **PUNCH INTO HOPPER**: bootstrap card, loader body card, the condensed cards, the execute
   card, then the sales data cards.
7. **READER START**, **END OF FILE**, **key the bootstrap**, 00000 → DISPLAY, MODE = ALTER → START,
   **COMPUTER RESET**, MODE = **RUN**, **START**.
8. The green bar fills with a report that has a *shape*: a page heading with an edited page number,
   a column-title line that is the heading's **Next Line**, detail lines with a zero-suppressed
   quantity and two edited money columns, a `DEPT TOTAL` marked `*` when the minor control field
   breaks, a `DISTRICT TOTAL` marked `**` when the major one breaks — and the minor one breaks with
   it — the heading group reprinted after a channel-12 overflow, and a `GRAND TOTAL` marked `***`
   on the last card. That is the RPG logic cycle, printed.
9. Break it on purpose. Blank **columns 5-7** of a Format `L` card — Print / Punch / Reserved, so
   the line has no output type: GENERATE still runs, the diagnostics block says
   `OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC` against page 06 card 230, SEND TO AUTOCODER
   is disabled, nothing threw. (Blanking **column 1** is a different defect and a different
   message: column 1 is the sheet-identifying character, so `sheets/read.ts` cannot classify the
   card at all — that case is its own row in §11.5's corpus.) Delete the `RG` card:
   `10802 EOJ-NO RG CONTROL CARD`. Move the Format cards ahead of the Calculation cards:
   `TERMINATE RUN. * CARD MISSING BEFORE FORMAT SPECS`.
10. Load `demos/cycle-probe.rpg` instead — a spec deck engineered so **every stage of the cycle
    prints one labelled line**. Its printed page is a transcript of the RPG logic cycle, and it is
    the phase's second frozen golden. Then load `demos/card-list.rpg` — one record type, no control
    fields, no editing, detail lines only — and watch the same generator produce something that is
    not this report.

That eighth step is the whole phase. It is also `test/tier4-rpg-demo.test.ts`.

---

## 2. Scope

### 2.1 In

- **The four 1401/1410 card-system specification sheets**, columns verbatim from J24-0215-2 as
  transcribed in `rpg-sources.md` §6.1-§6.4: Input (`C`), Data (`D`), Calculation (`A`), Format
  (`L`/`F`/`B`/`K`/`W`), plus columns 76-77 page and 78-80 card number on all four, the `SCFx`
  sequence line (§6.1 p.21) and the multi-line continuation rules (§6.1 p.20, §6.2 p.24).
  **Labelled in code and in docs exactly as `rpg-sources.md` §8 words it** — *"1401/1410 shared
  card-system RPG spec-sheet layout, forms X24-1336…1339, per J24-0215-2"* — not "1401 RPG" and not
  "1410 RPG".
- **The 1410 `RG` control card**, recognised by `RG` in columns 1-2 and diagnosed with the recovered
  message numbers 10802 / 10805. **Its body is not read** (§2.4 item 3).
- **The full RPG logic cycle as generated Autocoder**: read → identify the record type → sequence
  check → extract data fields → control-level compare, most significant first, with a fall-through
  ladder so a major break breaks every minor level → total calculations → total output ascending by
  level → level reset and control-field roll-forward → detail calculations → heading output →
  detail output → overflow latch → loop; plus the last-card final total cycle and end of job.
- **Indicators**: resulting conditions 00-99, control levels `F1`-`F6`, `OF`, `LC`, `1P`, and the
  negated forms — one core position each, `1`/`0`, so every RPG condition compiles to exactly one
  `BCE`.
- **Calculation operations `+ - X / C`** (Autocoder `A`, `S`, `M` on machine op `@`, `D` on machine
  op `%`, `C`) with `A` / `S` / `0+` / `0-` result accumulation (`A`, `S`, `ZA`, `ZS`), half-adjust
  (cols 50-51), position-adjust (cols 52-53), and the status / resulting-condition columns 11-19 —
  **including `H` and `L`, with no special feature** (§2.4 item 1).
- **Data-sheet field extraction** with the `N` zone-strip, the `D` / `Y` numeric- and zone-portion
  single-character moves, the three-source-per-line layout with continuation, and the reserved
  counters `PAGENO` (mandated, §6.2 p.26), `SER` and `RCT` (§2.4 item 5). A `Cxx` field source
  names **the record type by the Input sheet's columns 1-3** — §6.2 cols 20-22 verbatim,
  `[verified]` — **not** the resulting condition of cols 42-43
  (`CXX_NAMES_THE_RECORD_TYPE_BY_INPUT_COLS_1_TO_3`, §15).
- **Format-sheet output**: line entries with type / level / number, **Next Line (cols 8-10, with
  the cols 8-9 = cols 2-3 constraint)**, Space Before / After, Skip Before / After, up to three
  or-able output conditions — **with §6.4 p.38's `[verified]` restriction enforced: `OF` may
  participate in an or-group only if it is in *every* alternative**, which is why the demo's
  overflow heading is an independent alphabetic-level line rather than an `1P`-or-`OF` group
  (§10.1, `OVERFLOW_HEADING_IS_AN_INDEPENDENT_ALPHABETIC_LEVEL_LINE`, §15); field entries
  `F` / `B` / `K` / `W`; `Z` zero-suppress via `MCS`;
  `WORDxx` edit control words via `MLCWA` + `MCE`; **and §6.4's `[verified]` ordering rules** — the
  first entry on the sheet must be an `L`, field entries follow their line, heading lines appear in
  descending level and total lines in ascending level, `W`-entries anywhere but first.
- **1403 printing only, through one channel**: `W1` in move mode into a hundreds-aligned
  132-position area terminated by a run-time group mark, `CC1` carriage motion resolved from
  `CARRIAGE_D_TABLE`, and `BCV1` overflow latched immediately after the print on a **detail or
  total** output line — **and not after a heading line or a runtime-message line**, because a
  heading block skips to channel 1 itself and sensing overflow across it is meaningless
  (§6.2, §8.2; §10.4 trap 4 asserts the absence as well as the presence).
- **The recovered diagnostic vocabulary** taken verbatim from the PR-108 strings
  (`rpg-sources.md` §4.4) with their message numbers where recovered, and the reserved-name set from
  §4.5, every message carrying a `provenance` field (§2.4 item 6).
- **A spec listing rendered on the 1403** through the shipped `renderGreenBar`, one line per spec
  card, with the recovered `END … SPECS` separators and the `END OF RPG.BEGIN AUTOCODER` trailer.
- **An unstyled browser block** at `src/ui/rpg/**` following `unitrecord`'s and `autocoder`'s
  pattern exactly, and a CLI `tools/rpg.ts` + `npm run rpg`, because a golden only a browser can
  produce cannot gate a commit (the Phase 2 / Phase 3 precedent).

### 2.2 Out — every row with its reason, its insertion point and its line count

`report-first`'s discipline, applied to the whole list: a cut that does not name the file, the
function and the cost is a hole somebody has to re-derive.

| Cut | Why | Insertion point, and what it costs to restore |
|---|---|---|
| **IOCS macros** — `DTF` / `FILETYPE` / `IOAREA` / `EOFADD` / `OPEN` / `GET` / `PUT` / `CLOSE` | Settled: `PHASE-3-NOTES.md` §4 and `DECISIONS.md` 2026-08-31. Macros lived on the library tape (`software.md` §7) and this configuration has no tape, so there is nothing to expand from. **This is a departure from `rpg-sources.md` §8's own recommendation — §2.3 states it in full rather than implying the real processor emitted open code.** | `src/asm/assemble.ts`'s `expand()` seam, deliberately empty. Out of Phase 5's reach entirely: it is a Phase-3 file. |
| **Tape and disk input; the 1405 and 1301 control cards** | KISS peripherals (`DECISIONS.md` 2026-08-30). The two cards are **recognised** and refused, but **not with 10803 / 10804**: those texts read `EOJ-NO 1405 CONTROL CARD` / `EOJ-NO 1301 CONTROL CARD` and are **absence** diagnostics from a processor that wanted the card and did not find it, so firing them on a card that *is* in the deck inverts what the tape's own processor meant (§2.4 item 6). A 1405 or 1301 card present raises a `provenance: 'ours'` message — *"unsupported: 1405 / 1301 disk input is out of scope (DECISIONS.md 2026-08-30)"* — and **10806 `EOJ-ERRONEOUS 1301 CARD`** is available for a malformed 1301 card, which is the condition its text actually describes. 10803 / 10804 stay reserved for the absence case and are asserted verbatim by `rpg-messages.test.ts` without ever being raised. This makes us **Card-RPG**, which is the version C28-1443's abstract calls *"designed for use by card-oriented installations"* (§2.4 item 7). | `src/rpg/sheets/control.ts` — one recognised-card branch each, ~15 lines; plus a whole file-description model that does not exist here. |
| **Punch output (Format col 6 `X`) and stacker select (col 19)** | No consumer in Phase 5 or Phase 6, and an emission path with no golden is worse than an absent one. **The mapping is recorded so a later phase does not get it wrong:** col 19's `4` / `8` are the **punch instruction's x³ digit** (`0` NP / `4` / `8-2`, io.md §6, A22-0526-3 p.63, `[verified]`), **not** Select Stacker and Feed — `SSF`'s d is `0`/`1`/`2` only, and **two `SSF`s with no intervening x³ = 9 read, or two x³ = 9 reads with no intervening `SSF`, set No Transfer** (io.md §6, the reader/punch status table, A22-0526-3 p.63, Figures 62-63): executable, not illegal. That is the table's own sentence, quoted; an earlier draft of this row said *one* `SSF`, which is a notch stronger than the source. A generator that routed col 19 through `SSF1 4` **would be FLAGGED by the shipped assembler** — `SSF1`'s d is `0`/`1`/`2` only, and the run reports *"d-modifier 4 is not defined for SSF1 — the defined ones are 0 1 2"* (verified 2026-08-31), so under §6.3's gate it fails at the first commit. The mapping is recorded not because the mistake would be silent but because the CORRECT emission — the punch statement's x³ digit — is the one a later phase has to get right from a table it will not otherwise read. | `src/rpg/emitio.ts` — one `unit: 'punch'` arm, ~30 lines; `src/rpg/output.ts` — one Punch-column branch per line, ~15 lines; `src/rpg/layout.ts` — one 80-position punch area, ~10 lines. |
| **Tape output (Format col 7 `X`)** | KISS peripherals; no device. | Same shape as the punch, plus a device that does not exist. Stays out. |
| **`SB` / `SC` / `SD` sense-switch conditions** | Not a scope choice, a **machine fact**: A22-0526-3 **pp.56-58** (`software.md` §13, `[verified]`) — the 1415's sense-bit switches *"are active as sense switches (A through G) only when operation is in the 1401 mode"* — and there is no 1401 compatibility mode here (`DECISIONS.md` 2026-08-29). p.98 is the citation on the *compatibility-feature table* that follows that sentence, not on the sentence, and the diagnostic prints the page it is actually quoting. A spec deck using them gets a diagnostic naming pp.56-58. | `src/rpg/indicators.ts` — three condition codes and one `BCE` shape, ~12 lines, if a 1401 mode ever appears. |
| **51-column card mode** (`rpg-sources.md` §6.7) | The **+14 spec-sheet convention** is J24-0215-2's and is `[verified]` **for the 1401**; whether 1410 RPG carried it is `[unverified]` (§6.7's own closing sentence). The **1410 has its own 51-column read feed** — `io.md` §6, `[verified]` (A22-0526-3 pp.64-65, 100): *"Columns 1-51 of a 51-column card map to read-buffer positions 15-65 … in 1410 mode only the 51 active positions transfer, and a GMWM is required in the 52nd position"* — and `architecture.md` §12 refuses **that** separately. The two are different facts and this row refuses both. | One diagnostic, no code. Restoring it is one `+14` in `src/rpg/sheets/read.ts`, ~8 lines. |
| **Data-sheet `M` month conversion** (col 23, with cols 27-29 holding the Oct/Nov/Dec characters) | One column; a 1401 print-edit subtlety with no demo consumer. Diagnosed, not implemented. | `src/rpg/calc.ts` — one source-operation arm and a three-character table, ~25 lines. |
| **Anything from RPG II** — no File Description sheet, no matching fields `M1`-`M3`, no `L0`-`L9` level indicators, no `*IN` array | `rpg-sources.md` §4.3, `[verified]`: the surviving phase names `RPGIN` / `RPGDA` / `RPGCL` / `RPGFM` / `RPGED` are Input / Data / Calculation / Format / Edit — *"not RPG II's File-Description / Input / Calculation / Output-Format"*. This is the likeliest anachronism in the whole phase, so it gets a **partition test**, not a comment (§7.2). | None. It is an anachronism, not a feature. |
| **Multiple input files, matching records, file-to-file merging** | One card file. Multiple record **types** within that file are IN (the Input sheet's six codes and the `SCFx` line); multiple *files* need a file-description model the four sheets do not carry. | `src/rpg/model.ts` — a second `RecordType` dispatch already exists; a second *file* needs a device and does not. |
| **Record positions above 999, and Full-RPG's blocked 1000-character areas** | Designed around, **not resolved** — §15's `RECORD_POSITION_IS_THREE_DIGITS`. An 80-column card cannot address past position 80, so the Card-RPG / Full-RPG divergence cannot bind us; positions 81-999 diagnose *"no such card column"* and the historical question stays open on its own row. | `src/rpg/sheets/columns.ts` — one span per sheet, ~6 numbers, **and nothing else in the phase reads a column number**. |
| **A second, non-1403 output device of any kind** | 1403 Model 2, chain A, the 66-line `DEFAULT_CARRIAGE_TAPE` with channel 1 at line 1 and channel 12 at line 60, all as Phase 2 shipped them. | — |
| **Four separate on-screen specification forms** | The deck is ONE deck in the `[verified]` §6.6 order and the view shows it as one; splitting it into four drawn forms is Phase 4's restyle, exactly as Phase 3 left listing and deck stacked rather than side by side (`PHASE-3-NOTES.md` §4). The per-sheet ruler is the one visual invention, and it is thirty lines. | `src/ui/rpg/specBox.ts` — Phase 4 replaces the textarea with the drawn form the ruler already describes. |
| **Any edit to `src/asm/**`, `src/core/**` or `src/formats/**`** | Phase 5 is a **consumer** of the shipped assembler and machine, and `src/asm` is this phase's **oracle** — a generator defect that could be hidden by an assembler edit is the one failure mode the phase cannot detect. If the generator wants something the assembler cannot express, that is a finding to escalate, the way Phase 3 escalated `RW#`. | §3.4. An escalation is a dated `open-questions.md` row plus a note to the orchestrator, never a quiet edit. |
| **Simulating the RPG processor ON the emulated machine** | Host-side TypeScript, `architecture.md` §5 step 0. The real processor needed 20K and two tapes. | — |

### 2.3 The macro ruling, and the departure it is

**No macro processor. No library. Not partially, not stubbed.** Phase 3 settled it
(`PHASE-3-NOTES.md` §4, `DECISIONS.md` 2026-08-31): macros are model statements held on the
system/library tape, maintained by a Librarian phase under `RUN SYSTEMS`; this configuration has no
tape, so a macro call has nothing to expand from. Phase 5 does not re-litigate it.

**But it is a departure from a `[verified]` historical artifact, and this plan is the only place
that can say so honestly.** `rpg-sources.md` §8 recommends the opposite of what we build, verbatim:

> **Emit 1410 Autocoder with IOCS macros**, matching the skeleton on the tape (`DTF`,
> `FILETYPE READER/PRINTER/PUNCH`, `CARDPOC`, `IOAREA`, `EOFADD`, `OPEN`/`GET`/`PUT`/`CLOSE`), not
> 1401 SPS. `[verified — tape skeleton]`

and §5's "Established as different" table records the generated program's I/O as **1410 IOCS**,
`[verified]` off the tape. The skeleton text is sitting at bytes 501,525-539,427 of
`jpr108-2024.bcd` and reads `080 DTF READER0 R` / `FILETYPE READER R` / `IOAREA REC1N R` /
`RDCD1 SBR BCCK1` (§4.2).

So, stated once and cited wherever it matters:

- **What the real 1410 RPG emitted:** Autocoder with IOCS macros, an `RG` control card, and
  subroutine linkage (`SBR`). `[verified]` — `rpg-sources.md` §4.2, §5, §8.
- **What we emit:** macro-free, open-coded Autocoder — `R1` / `BEF1` / `W1` / `CC1` written out,
  explicit buffer moves, no `SBR`. **A project construction, not `[verified]` period output.**
- **Why:** no macro library exists here (`software.md` §7; `PHASE-3-NOTES.md` §2.3, §4). The
  generator plays the part the macro library played.

The same rule governs generated runtime messages: `INPUT REC OUT OF SEQ` and `RECORD TYPE NOT FOUND`
are `[verified]` off the tape and reproduced **exactly**. `SEQUENCE ERROR INPUT FILE` is a `[verified]`
processor-phase diagnostic, not generated runtime output; anything else the program prints is ours (§2.4 item 6).

**RULING, where the panel disagreed.** `cycle-first` made *"the generated source contains no
`SBR`/`SFR`/`SER`/`SAR` at all"* a hard test invariant; the testability judge required it dropped
because the recovered skeleton literally prints `RDCD1 SBR BCCK1`, and the period-fidelity judge
praised it as period-shaped. **Open-coding stays as the design; the no-subroutine-linkage *gate*
does not.** It becomes a design note in `PHASE-5-NOTES.md` §2 carrying the §4.2 citation — because
asserting the absence of subroutine linkage as an invariant is asserting against the one primary
artifact that speaks to the question, and the whole phase's discipline is that verified text wins.

### 2.4 The 1401-vs-1410 rulings, each with both citations

The sheet layout is a 1401 manual's and is legitimately ours (shared X24 forms, `[verified]`), which
is exactly what makes it easy to carry a 1401 *machine* fact across with it. **Eight items are
caught here rather than in a wave: seven 1401-vs-1410 machine-fact rulings, plus item 6, which is
the provenance rule they all rely on.** R8 names the same eight.

1. **The `H` and `L` calculation statuses need no special feature on the 1410.** J24-0215-2 pp.33-34
   record, for Calculation cols 11 / 14 / 17: *"`H` and `L` require the 1401 **High-Low-Equal
   Compare** special feature."* That is a **1401** fact. On the 1410, Compare (op `C`, 0o63) is in
   the base instruction set and sets high / equal / low / unequal **unconditionally** — `opcodes.md`
   §2 row 063 and §5.2, cited to A22-0526-3 p.28 — with `BE` / `BH` / `BL` / `BU` on the `J`
   d-table (`dmods.ts` `J_D_TABLE`, all four `available: true`, `[verified]`). `opcodes.md` §9, the
   list of operations that exist only with optional features, names the Priority feature, the
   1412/1419 MICR feature, the 7010-only ops, the Program Addressable Clock and 1401 Compatibility —
   **Compare is not there.** High-Low-Equal Compare appears in this repo only inside the
   1401-compatibility supported-features list. So `H`, `L` and `E` are **in**, with no feature gate.
   `HL_STATUSES_NEED_NO_SPECIAL_FEATURE_ON_THE_1410`, §15, `[verified]`.
2. **The same treatment for the 1401 control card's column 9 `M`** (multiply-divide special
   feature, `rpg-sources.md` §6.5): `@` Multiply and `%` Divide are base-table ops on the 1410
   (`opcodes.md` §2, absent from §9), so there is no feature column to carry. The `RG` card carries
   none of it anyway (item 3).
3. **The `RG` control card's body is not read.** `rpg-sources.md` §5 establishes exactly one 1410
   control-card fact — it is an `RG` card, not the 1401's `CNTL`, with separate 1405 and 1301 cards
   for disk input — evidenced only by the recovered messages `EOJ-NO RG CONTROL CARD` /
   `EOJ-ERRONEOUS RG CARD` (§4.4, `[verified]`). **No column layout for the `RG` card survives.**
   §5 says the machine-size field *"must encode 10K-80K; encoding unknown"*, `[unverified]`, and
   §6.5's 1401 `CNTL` layout is explicitly headed *"Superseded on the 1410 — see §5"* with core
   codes (1=1400 … 6=16000) that cannot express a 1410 configuration at all.
   **RULING, where the panel disagreed:** `cycle-first` and `sheet-first` both invented `RG` columns
   (a core-size code, a 1403 model) and marked the rest reserved; the research skeptic offered a
   named `RG_CARD_LAYOUT_IS_INVENTED` constant instead; the period-fidelity judge required
   `report-first`'s `RG_CARD_BODY_IS_NOT_READ`. **We take `report-first`'s**, because
   `rpg-sources.md` §1 item 5 says *do not invent columns* and §8 repeats it — declaring an
   invention is not the same as not inventing. `RG` in columns 1-2 identifies the card; **the body
   is columns 3-75**, and a non-blank body is diagnosed *"unsupported: the RG card's column layout
   does not survive (rpg-sources.md §1 item 5, §5)"*. **Columns 76-80 are NOT read and NOT
   diagnosed, and the reason is that the two candidate readings of that span disagree**: on the four
   sheets it is the page-and-card identification (§6), and on the 1401 `CNTL` proxy it is *"program
   identification punched into the symbolic object deck"* (§6.5). Those are not the same job, and a
   span whose only two witnesses contradict each other is one to refuse rather than to read — which
   is a better argument than the earlier draft's claim that they were the same job. **And the demo's
   own `RG` card is numbered page 02, not page 01**: §6.1 and §6.4 both record, `[verified]`,
   *"Spacing chart is page 01"*, so page 01 is a sheet the programmer draws on and never punches
   (§10.3 renumbers the whole deck behind it). 10802 and 10805 still fire on absence and on a malformed card; and **the object
   program's core-size code comes from `layout.ts`'s own high-water mark**, not from the card, keyed
   to Autocoder `CTL`'s `[verified]` 1 = 10K … 5 = 80K encoding (`software.md` §6).
4. **Format column 19's stacker digits are the punch instruction's x³, not `SSF`.** §2.2's row
   carries the citations. Recorded even though the column is out of scope — **not** because the
   mistake would be silent, which it is not (`SSF1 4` is **flagged** by the shipped assembler, its d
   being `0`/`1`/`2` only; verified 2026-08-31), but because the correct emission is the one a later
   phase has to get right from a table it will not otherwise read.
5. **`SCF` and `RCT` are implemented, and the tape's silence is not a negative ruling.**
   `rpg-sources.md` §4.5 is precise about the evidence tiers and both directions are easy to
   overstate. **The provenance table carries TWO ORTHOGONAL COLUMNS, not one tier column**, because
   a name can legitimately have both kinds of evidence and an earlier draft's single-tier table put
   `SCF` and `RCT` in two tiers at once — which is a table §7.3 could not have been written
   against. The two questions are *"does a form pin its column layout?"* and *"does the tape carry
   it as a plaintext literal?"*, and they are answered independently:

   | Name | Form-layout evidence (J24-0215-2 on X24-1336…1339) | Tape evidence (PR-108, §4.5) |
   |---|---|---|
   | `PAGENO`, `WORD`, `LC`, `OF` | `[verified]` — column spans in §6.1-§6.4 | `[verified]` — plaintext literals in the RPG phase region |
   | `SER` | `[verified]` layout (§6.2 cols 20-22); its **meaning** is a ruling, §15 | `[verified]` — appears as a literal |
   | `PAG`, `WORDxx` 00-99, `SB`/`SC`/`SD`, `F1`-`F6`, `1P` | `[verified]` layout | not searched for / not recovered |
   | `RCT` | `[verified]` layout (§6.2 cols 20-22); its **meaning** is a ruling, §15 | `[verified for absence; no conclusion]` |
   | `SCF` (the `SCFx` line, Input cols 1-4) | `[verified]` layout (§6.1 p.21) | `[verified for absence; no conclusion]` |
   | `CNTL` | `[verified]` layout **for the 1401** (§6.5), superseded on the 1410 (§5) | `[verified for absence; no conclusion]` |

   **The rule `rpg-vocabulary.test.ts` enforces, stated so the test can be written**: a name may
   carry a form-layout tag *and* a tape tag, and the two never merge; **no name is ever tagged
   `[verified]`-for-the-1410 on evidence it does not have in the tape column**, and an absence in
   the tape column is `[verified for absence; no conclusion]` — never a negative ruling, because
   §4.5's own words are *"absence here is weak evidence (they may be built from pieces or
   table-encoded)"*.

   So `SCF` is implemented — §6.1 p.21 says every application with sequential-record specs **needs**
   one — and `RCT` is implemented as a Data-sheet field source. Neither is dropped on the strength
   of a tape absence, and the shared X24 forms establish the **column layout**, not every token's
   meaning: a form-layout `[verified]` is never upgraded to `[verified]`-for-the-1410.

   **And the layout establishing a token does not establish its runtime semantics.** §6.2 cols
   20-22 lists `SER` and `RCT` and defines neither; §4.5 records only that `SER` appears as a
   literal in the PR-108 phase region and that `RCT` does not. Reading them as a **serial counter**
   and a **record counter** is therefore a ruling, not a transcription, and it has its own §15 row
   (`SER_AND_RCT_ARE_THE_SERIAL_AND_RECORD_COUNTERS`, `[likely]`). `PAG` / `PAGENO` is the one
   source in that column whose meaning §6.2 actually pins (p.26).
6. **Every diagnostic carries its provenance.** `RpgMessage` is
   `{ text, provenance: 'recovered-1410' | 'ours', cite }`, and a `recovered-1410` message carries
   its `rpg-sources.md` §4.4 byte offset. The **texts** are `[verified]`; **which condition raises
   which message is ours**, and the field is what stops an invented message reading as tape
   authority later. `test/rpg-messages.test.ts` asserts the recovered corpus **by construction, not
   by count** — every string in `rpg-sources.md` §4.4's code block (**14**) plus the two
   generated-program messages named in the same section, `INPUT REC OUT OF SEQ` and
   `RECORD TYPE NOT FOUND` (**16 in all**), plus the five reserved
   names of §4.5 — and asserts that every `recovered-1410` row's text is one of the sixteen. The
   test **slices §4.4 out of the research file** the way `rpg-columns-vs-research` slices §6, so the
   corpus cannot drift in either direction and a correctly recovered message can never be rejected
   as invented.

   **The mapping is ours, but a recovered text keeps its meaning.** 10803 and 10804 read
   `EOJ-NO 1405 / 1301 CONTROL CARD` — absence diagnostics — so they are **not** raised when such a
   card is present; §2.2's row states what is raised instead. Naming a mapping "ours" licenses
   choosing *which* condition fires a message; it does not license firing one on the inverse of what
   it says.
7. **We are building Card-RPG, and Card-RPG has no 1968 program number.** `rpg-sources.md` §2 item 4
   and §7 item 2: C28-1443 documents two 1410 RPGs; only Full-RPG (1410-RG-910) and the 1301 version
   (1410-RG-943) carry program numbers, and Card-RPG's minimum configuration is `[unverified]`
   (`[verified for absence; unverified for cause]`, §3). This project is card-only by constraint, so
   it is Card-RPG that we model, and **nothing in this phase may print or claim `1410-RG-910`.**
8. **Spec-deck order is `[likely]` for the 1410, not `[verified]`.** The order — control card, input,
   data, calculation, format — is `[verified]` for the 1401 (J24-0215-2 p.44, §6.6); for the 1410 it
   is inferred from the recovered `CARD MISSING BEFORE FORMAT SPECS`, which implies the same ordered
   scan (§5, `[likely]`). Carried with the tag intact (`SPEC_DECK_ORDER_IS_THE_1401_ORDER`, §15).

### 2.5 What the generator does not know, and the framing paragraph

**The generator generates a program for the machine, not for this configuration** — the same rule
`src/asm/mnemonics.ts` states for the assembler. It emits channel-1, non-overlapped, 1402-and-1403
statements because that is what the sheets in scope describe; it does not consult the machine's
feature set, and there is no configuration object anywhere in `src/rpg/**`. What it *does* check is
storage: `layout.ts` computes the high-water mark and picks the `CTL` core-size code from it, and
`assemble()` independently flags any assigned address above that size.

And the framing paragraph, which is on the page above the spec box and not only in this plan
(`architecture.md` §5 step 0):

> This report program generator is modern host code. The real thing — C28-1443's Card-RPG and
> Full-RPG — is not digitised anywhere we can find (`rpg-sources.md` §1, §3); what survives is the
> processor's own object code on the PR-108 tape, its operator messages, and the four specification
> sheets, which are the shared 1401/1410 forms X24-1336…1339. Generating a report program needed
> 20K, a 1402 and two tape units, and assembling its output needed 20K, a 1402, four tape units and
> a 1403-2 (`software.md` §12.5),
> so this 10K one-channel machine could never have run it. The sheets, the deck order, the
> diagnostics and every artifact are period-correct. The translator is not — and where the real
> processor emitted IOCS macros, this one emits open code, because no macro library exists here.

---

## 3. File list and ownership

### 3.1 Owned, all new

```text
src/rpg/                                                                            OWNED
  types.ts          SpecCard · SheetKind · SpecRef · the four sheet-row types ·
                    Stmt · Condition · Layout · RpgMessage · RpgDiagnostic ·
                    Model · RpgResult · class RpgBug (§4 — it lives HERE, with
                    both its throwers' wave, not in generate.ts)                      ~230
  sheets/columns.ts THE COLUMN TABLES — one readonly SheetField[] per sheet, every
                    span carrying its rpg-sources.md §6.n cite. THE SINGLE PLACE A
                    COLUMN NUMBER IS WRITTEN IN THE PHASE (§7)                        ~260
  sheets/read.ts    text -> SpecCard[]: the 80-column discipline, lowercase
                    up-casing and `+` -> `&`, column-1 sheet identity, page/card
                    number from 76-80. Rejects nothing; reports                       ~140
  sheets/input.ts   X24-1336 rows: Seq / Number / Option, six record codes,
                    resulting condition, six control fields, the SCFx line,
                    multi-line continuation                                           ~150
  sheets/data.ts    X24-1337 rows: field name, length, three status/condition
                    pairs, three 17-column source groups with continuation,
                    PAGENO's mandate                                                  ~170
  sheets/calc.ts    X24-1338 rows: result field, factors, OP, A/S/0+/0-, three
                    conditions, T/D, half adjust, position adjust, the status set     ~160
  sheets/format.ts  X24-1339 rows: the L line entry and the F/B/K/W field entries
                    as a discriminated union on column 1, Next Line, and §6.4's
                    ordering rules                                                    ~200
  sheets/control.ts The RG card: `RG` in cols 1-2, body-must-be-blank (§2.4 item 3)     ~70
  deck.ts           THE SECTION SCAN, an explicit state machine over §6.6's five
                    sections, emitting the recovered period message at each
                    boundary                                                          ~130
  messages.ts       The diagnostic vocabulary with provenance and byte offsets        ~120
  model.ts          rows -> Model: record types and their code tests, control
                    fields in significance order, the field dictionary, calculation
                    steps, output lines and their field entries, the
                    referenced-indicator set, reserved-name collisions, and every
                    cross-sheet validation with its citation                          ~330
  layout.ts         THE MEMORY MAP — `layoutOf(model, codeLength)`, a pure function of
                    the Model and of ONE MEASURED NUMBER (§6, §8.1), plus `measure`,
                    which produces that number from a Stmt[] and lives beside its only
                    consumer. §8.1 item 4's disjointness invariant is computed here      ~270
  indicators.ts     indicator -> Autocoder label; setOn/setOff as single-character
                    moves; the condition compiler (an AND-triple -> one BCE each)     ~120
  emitio.ts         THE I/O CHOKE POINT — the only module that may import
                    X1_CHANNEL / X2_DEVICE / ML_D_TABLE / CARRIAGE_D_TABLE. It
                    consumes only CARRIAGE_D_TABLE under the settled I/O form; the
                    other three are FORBIDDEN EVERYWHERE, not required here (§8.3)   ~150
  card.ts           Stmt -> SpecCard-shaped SourceCard: the 80-column formatter, over
                    the imported SOURCE_FIELDS and its SIBLING EXPORT COMMENT_COLUMN
                    (src/asm/types.ts:18-24 — two imports, not one). THREE COLUMN RULES
                    IT OWNS, all read off src/asm: a Stmt with kind 'comment' puts `*`
                    in COMMENT_COLUMN (6) with its text in 7-72; the operand BEGINS AT
                    COLUMN 21, at most one blank before it and NO interior double blank
                    before the comment, because two blanks end the operand field
                    (operand.ts's commentCut); and address adjustment is written `&`,
                    NEVER `+`, because `+` is not among the 64 glyphs and readSource
                    normalises it (SOURCE_PLUS_IS_THE_12_PUNCH) — which is what makes
                    §5.1's round trip field-for-field identity                         ~115
  cycle.ts          CYCLE_ORDER and driver(model, layout) -> Map<CycleSection,Stmt[]> ~330
  calc.ts           Data-sheet sources and Calculation-sheet steps -> Stmt[]          ~230
  output.ts         Format-sheet line and field entries -> the inline print blocks,
                    AND the RUNTIME-MESSAGE LINE: a generator-authored print block
                    whose only field is a Knnn message constant, which is what the
                    `notFound` and `sequence` sections are made of (§6.2, §8.2)       ~285
  listing.ts        RpgListingLine[] over the SpecCard deck and the diagnostics,
                    rendered through the shipped renderGreenBar (§9)  LANDS IN WAVE 6 ~120
  generate.ts       generate(text) -> RpgResult. Composes §6's ten calls, RUNS THE
                    LAYOUT PASS TWICE (§8.1), and OWNS THE DECK'S HEADER AND TRAILER
                    — the eight header cards THROUGH `ORG` and the END card, which
                    belong to no CYCLE_ORDER section (§8.1). It does NOT measure:
                    `measure` is layout.ts's (§6)                                      ~90
                                                                                    ~3,670

src/ui/rpg/                                                                         OWNED
  mount.ts          mountRpg(sourceBox, host) — mountAutocoder's shape               ~120
  session.ts        DOM-free: spec text, data text, last RpgResult, handOff()         ~90
  specBox.ts        textarea + THE PER-SHEET RULER + sample specs + GENERATE         ~150
  resultView.ts     diagnostics block, memory map, generated source                   ~85
  raw-import.d.ts   declares '*.rpg?raw' ONLY — see the note below                      ~6
                                                                                      ~451

tools/rpg.ts        CLI: --source / --page / --map / --listing / --golden / --update
                    / --diff (the reported, exit-zero source diff — §12.2)            ~170
                    LANDS IN WAVE 6

demos/sales-summary.asm         WAVE 1'S HAND-WRITTEN TARGET PROGRAM                OWNED
demos/sales-summary.data.cards  the sales detail cards, labelled reconstructed       OWNED
demos/sales-summary.rpg         the demo spec deck, 60 cards on six sheets (§10.3)   OWNED (wave 4)
demos/cycle-probe.rpg           the probe spec deck                                  OWNED (wave 4)
demos/cycle-probe.data.cards    the probe's input — WAVE 5, WITH ITS PAGE GOLDEN     OWNED (wave 5)
demos/card-list.rpg             THE ANTI-TRANSCRIPTION DECK, ~12 cards               OWNED (wave 5)
demos/card-list.data.cards      its input                                            OWNED (wave 5)
demos/stress/*.rpg              the five stress decks (§11.2)                        OWNED (wave 5)

test/golden/sales-summary.page.txt   FROZEN at wave 1, never edited again            OWNED
test/golden/cycle-probe.page.txt     FROZEN at wave 5, never edited again            OWNED (wave 5)
test/golden/card-list.page.txt       hand-authored at wave 5, frozen there           OWNED (wave 5)
test/golden/sales-summary.lst        the CONSTRUCTED spec listing golden             OWNED (wave 6)

THERE IS NO test/golden/sales-summary.asm. §11.1 retired the byte-for-byte source
comparison; the source diff is REPORTED, never gated (§12.2).

test/           24 new TEST files (§12.1's tier table enumerates every one, and §11's
                six wave rows enumerate the same 24)                        OWNED ~2,300
test/fixtures/sales-summary.model.ts   THE HAND-BUILT Model — written by wave 2,
                READ by waves 2, 3 and 4; not a test file and not counted in the 24
                                                                    OWNED (wave 2)  ~120
PHASE-5-NOTES.md · docs/BUILD-LOG-5.md                                              OWNED
docs/research/open-questions.md — a dated "Phase 5 — 2026-…" section only     OWNED (section only)
docs/research/rpg-sources.md    — a dated "## 10." section only, wave 0 only  OWNED (section only)
```

≈ 3,670 source + 451 UI + 170 CLI + 2,420 test lines (2,300 in the 24 test files, 120 in the one
fixture) — the block subtotals added up, not estimated separately. **The `src/rpg/` block's twenty
rows sum to exactly 3,670**, and the +30 against the earlier 3,640 is itemised so a reviewer can
check it: `layout.ts` 230 → **270** (`measure` and §8.1 item 4's invariant move in),
`generate.ts` 130 → **90** (`measure` moves out), `output.ts` 260 → **285** (the runtime-message
line, §8.2), `card.ts` 110 → **115** (the `+` → `&` rule, §5.1). **Zero new dependencies.**

**The `?raw` shim, stated precisely because ambient declarations are project-global.** An ambient
module declaration is visible across the whole program, so a second `.d.ts` re-declaring an existing
pattern merges into a duplicate `export default` and fails `npm run typecheck` — Phase 3's own note.
`src/ui/unitrecord/raw-import.d.ts` already declares `'*.cards?raw'` and
`src/ui/autocoder/raw-import.d.ts` already declares `'*.asm?raw'`. The RPG view needs
`demos/sales-summary.rpg?raw`, whose extension is **undeclared today**, and
`demos/sales-summary.data.cards?raw`, which the existing declaration **already covers**. So
`src/ui/rpg/raw-import.d.ts` declares `'*.rpg?raw'` and nothing else.

### 3.2 Edits to files Phase 5 does not own — three files, ~11 lines, each named here

R12 exists because Phase 3 discovered a UI hand-off mid-build. The same discovery is pre-empted
here, with the bodies written out.

`createSourceBox(session, onAssemble)` (`src/ui/autocoder/sourceBox.ts:99`) returns
`{ el }` at line 143: its two `<textarea>`s (`source` and `data`) are **closure-private**, and
`AutocoderSession` has no channel to either. Calling `session.setSource(text)` from the RPG view
would update the session's source and leave the box's text stale, and the box's own
`source.addEventListener('input', …)` would overwrite the session from the stale textarea on the
operator's next keystroke. The box needs a way in, and it is named here.

| File | Edit | Why |
|---|---|---|
| `src/ui/autocoder/sourceBox.ts` | Export the return type by name — `export type SourceBox = { readonly el: HTMLElement; setText(source: string, dataCards: string): void };` — because `createSourceBox` today returns an **anonymous** `{ readonly el: HTMLElement }` (line 102) and `mount.ts`'s new return type below cannot name a type the module does not export; then `createSourceBox(session, onAssemble): SourceBox`, `return { el, setText };` with `function setText(src: string, dataCards: string): void { source.value = src; data.value = dataCards; session.setSource(src); session.setDataText(dataCards); }`. **~6 lines: one exported type, the annotation, and the function.** Nothing else in the file moves. | Those four statements are **exactly the body of the `sample program` button** already in the same file (lines 126-133). `setText` is that button's body, named — the identical argument Phase 3 made for `deckBox.setText`, and the reason it takes *both* texts is that `hopperText()` is `formatDeck([...loaderDeck(deck), ...dataCards])`: handing over the source without the data cards would produce a hopper that loads and reads nothing. |
| `src/ui/autocoder/mount.ts` | Return type `void` → `{ readonly sourceBox: SourceBox }`, importing `SourceBox` from the row above; `return { sourceBox };` at the end. `sourceBox` is **already a `const` at line 60**, so there is no hoist. **~2 lines.** | The source box is the one thing the RPG view needs back. The `AutocoderSession` is deliberately **not** returned: `mountRpg(sourceBox, host)` takes the box, not a session, so a returned session would have no reader — the speculative typing this plan refuses everywhere else. |
| `src/ui/internals/main.ts` | `+1` import of `mountRpg`; `mountAutocoder(machine, deckBox, app, redraw)` (line 50) becomes `const { sourceBox } = mountAutocoder(...)`; `mountRpg(sourceBox, app)` follows it. **3 lines**, one of which is an edit to an existing line. | `main.ts` owns the page's only `Machine` and its only `#app` lookup, and it already carries the identical two-line shape for `mountUnitRecord` → `mountAutocoder`. This is the third mount, and Phase 3's exit criterion 10 pinned that call, so it is declared rather than discovered. |

**Why the typed method and not a DOM selector.** Phase 3 argued it and `DECISIONS.md` 2026-08-31
settled it: a selector over another module's DOM shape is exactly what **Phase 4 rewrites**, and it
breaks silently and at run time when it does, where `setText` breaks loudly at `npm run typecheck`.

**And the hand-off is asserted without a DOM.** The two strings the RPG view hands over come from
its own DOM-free `session.handOff(): { source: string; dataCards: string }`, so wave 6 asserts in
node that `assemble(handOff().source)` returns `ok: true` with zero flags and that
`parseDeck(...)` accepts the data cards (§13 criterion 13a). Only the two lines of DOM plumbing are
left to the browser check (§13 criterion 13b).

`src/ui/autocoder/session.ts`, `src/ui/unitrecord/**`, `src/formats/card.ts` and every module under
`src/asm/**` are **imported, not edited** — importing is read-only use and is not a touch.
`index.html` is **not** edited: `.green-bar { white-space: pre; overflow-x: auto; }` already exists
at line 34 and is reused, and the spec box's own styling lives inline in `specBox.ts` the way
`sourceBox.ts` does it. `mountAutocoder(machine, deckBox, app, redraw)` already appends into `#app`,
so no container element is needed.

### 3.3 Two justified one-liners outside `src/`

- **`tsconfig.tools.json`** — add `"src/rpg/**/*.ts"` to `include`; `tools/rpg.ts` cannot compile
  otherwise. **Lands in wave 6, with `tools/rpg.ts` itself.** It is not needed earlier: Vitest gates
  headlessly in node from wave 1, and every wave-1-to-5 oracle is a test file.
- **`package.json`** — add `"rpg": "npm run build:tools && node build/tools/rpg.js"`, exactly as
  `asm` and `demo` are declared. A golden that only a browser can produce cannot gate a commit, and
  `--golden … --update` must be the single sanctioned regeneration path.

### 3.4 Do not touch

`src/asm/**` · `src/core/**` · `src/formats/**` · `src/ui/unitrecord/**` · the rest of
`src/ui/autocoder/**` and `src/ui/internals/**` beyond §3.2's three edits · `index.html` ·
`demos/hello-dad.*` · `test/golden/hello-dad.page.txt` (348 bytes) · `test/golden/hello-dad.lst`
(2251 bytes) · every other existing test and golden · `docs/plans/*.md` — **every plan except this one, which
the arrival commit adds (§16) and which no wave edits** · `docs/research/*.md`
outside the two dated sections §3.1 names · `docs/BUILD-LOG.md` · `docs/BUILD-LOG-2.md` ·
`docs/BUILD-LOG-3.md` · `PHASE-1-NOTES.md` · `PHASE-1B-NOTES.md` · `PHASE-2-NOTES.md` ·
`PHASE-3-NOTES.md` · `CLAUDE.md` · `docs/STATUS.md` · `docs/DECISIONS.md`.

**One exception, stated here because this is the list a wave worker reads before touching
anything:** `test/tier3-asm-load-equals-memory.test.ts` is on the "every other existing test"
list, and wave 1 **appends one case to it and rewrites nothing of it** (§11.3, and §11's first
ownership note). That append is sanctioned; every other edit to an existing test or golden is not.

**`src/asm/**` is on this list because it is the phase's oracle.** A generator defect that could be
hidden by an assembler edit is the one failure mode this phase cannot detect. The exception Phase 3
would have needed — a flip of the I/O source form — **no longer exists**: the period form was ruled
and shipped on 2026-08-31 (commit `303cb64`), and Phase 5 consumes it.

**`docs/STATUS.md` and `docs/DECISIONS.md` are the orchestrator's, updated at merge — never by a
wave.** `CLAUDE.md` requires STATUS.md current before a session ends, and the Phase 2 / Phase 3
precedent is that the merging orchestrator writes both while the build waves write only
`BUILD-LOG-5.md`, `PHASE-5-NOTES.md` and the two dated research sections.

**A research correction discovered mid-build escalates to the orchestrator** and is never silently
edited — the Phase-1b and Phase-3 precedent, four real corrections between them. Wave 0's append to
`rpg-sources.md` is a **new dated section only**; nothing above it is edited, and a correction to
anything above it is an escalation with its own commit.

### 3.5 The DOM-free guarantee

`test/core-is-dom-free.test.ts` and `test/asm-is-dom-free.test.ts` are existing tests on the
do-not-touch list and are **not** edited. `test/rpg-is-dom-free.test.ts` applies the same banned
code shapes to `src/rpg/**`, with the import rule relaxed to "relative, and resolving inside
`src/rpg`, `src/asm`, `src/core` or `src/formats`" — ~45 duplicated lines, zero edits to an
existing file, exactly the trade Phase 3 made.

**`src/ui/rpg/session.ts` is DOM-free too, and the file that says so is the same one.** Its glob is
`src/rpg/**` **plus the single path `src/ui/rpg/session.ts`**, stated as a two-entry list in the
test's header rather than as a claim in prose — because `autocoder/session.ts`'s "precedent" is a
convention no test enforces, and a guarantee nothing checks is not a guarantee. With that one path
added, the node tests drive the whole storyboard headlessly and the claim is mechanical.

**And the second entry does not exist until wave 6, so the test says which it is rather than
leaving it to be discovered — and wave 6 ADDS a case rather than editing one.** `src/ui/rpg/**`
lands in wave 6; the file is owned by wave 2. Wave 2 writes
`it.skip('src/ui/rpg/session.ts is DOM-free — the file lands in wave 6')` and **never touches it
again**: it stays in place as the record of when the check began. **Wave 6 adds its own, separate,
required-path case** — `it('src/ui/rpg/session.ts exists and is DOM-free')`, which fails if the path
is missing as loudly as if it holds DOM — so a silently-passing empty check is impossible in either
direction and §11's ownership rule (*"an append adds cases; it never edits an existing one"*) is
obeyed literally. An earlier draft had wave 6 *turn* the skip into the assertion, which is an edit
dressed as an append and which a worker reading §11's rule literally would have stopped over.
Wave 6's owned-file row records that the entry began to be checked, and §12.1's T0 row carries the
same note.

---

## 4. The load-bearing types

**Placement, and its citation.** `src/core/types.ts` and `src/formats/objectdeck.ts` both state the
rule: *a boundary type lives in `src/core/types.ts` only if something inside `src/core` names it.*
Nothing in `src/core` or `src/asm` names `SpecCard`, `Model` or `Stmt`, so they live in
`src/rpg/types.ts` — one file rather than scattered beside each producer, for the reason Phase 3
gave: `cycle.ts`, `calc.ts`, `output.ts` and `card.ts` all name `Stmt`, and a cycle among four
modules is worse than one shared type file.

**`SourceCard`, `Addr`, `PrintLine`, `PrintChain`, `AssemblyResult`, `Card` and `ObjectDeck` are
IMPORTED and never redefined, extended or forked** (`architecture.md` §2 B4 — the rule Phase 3
followed for `ObjectDeck`). `SOURCE_FIELDS` is imported from `src/asm/types.js` rather than
restated, so the generated card's columns and the assembler's columns are the same numbers.

```ts
// ═══ src/rpg/types.ts ══════════════════════════════════════════════════════════════════════
// PLACEMENT: architecture.md §3 item 8's rule, applied a second time. Nothing in src/core or
// src/asm names any type below, so they live with their producer. SourceCard and SOURCE_FIELDS
// are IMPORTED from src/asm — the generated card IS an Autocoder source card, and defining a
// second 80-column type would be the fork architecture.md §2 B4 forbids.
import type { Addr } from '../core/types.js';
import type { SourceCard } from '../asm/types.js';

// ─── 1. The specification card — rpg-sources.md §6, 1-based, inclusive ─────────────────────
/** EXACTLY 80 characters, in the project's 64-glyph alphabet — the one `bcdOfGlyph` accepts.
 *  A bare alias, exactly as `SourceCard` is. Not a `Card`: the parser reads TEXT; the card face
 *  is a rendering. */
export type SpecCard = string;

/** The sheet-identifying character in column 1 (rpg-sources.md §6, [verified]): `C` Input,
 *  `D` Data, `A` Calculation, `L`/`F`/`B`/`K`/`W` Format. The RG card is identified by `RG` in
 *  columns 1-2 and is NOT a column-1 code (§2.4 item 3). */
export type SheetKind = 'control' | 'input' | 'data' | 'calculation' | 'format';

/** One field of one sheet. `cols` is the ONLY place a column number is written in the phase,
 *  and `cite` is the rpg-sources.md §6.n row it came from (§7). */
export interface SheetField {
  readonly name: string;
  readonly cols: readonly [number, number];
  readonly cite: string;
  /** false ⇒ parsed and DIAGNOSED, never silently ignored; `why` says which §2.2 row cut it. */
  readonly inScope: boolean;
  readonly why?: string;
}

/** Where a diagnostic or a generated statement came from, for the listing and the comments. */
export interface SpecRef {
  readonly seqno: number;        // 1-based over the whole spec deck
  readonly sheet: SheetKind;
  readonly page: string;         // cols 76-77 as punched
  readonly cardNo: string;       // cols 78-80 as punched
}

// ─── 2. Diagnostics — never thrown, always data (§6.3) ─────────────────────────────────────
/**
 * PROVENANCE IS A FIELD, not a convention (§2.4 item 6). A message we invented can never read as
 * recovered authority: `recovered-1410` requires `cite` to be an rpg-sources.md §4.4 byte offset,
 * and test/rpg-messages.test.ts asserts the text is one of the SIXTEEN recovered strings — the 14
 * in §4.4's code block plus the two generated-program messages named in the same section. The
 * test slices them out of the research file, so the corpus is stated by construction, not by count.
 */
export interface RpgMessage {
  readonly text: string;
  readonly provenance: 'recovered-1410' | 'ours';
  readonly cite: string;
  /** 10802-10806 where the tape recovered one. */
  readonly messageNo?: number;
}

export interface RpgDiagnostic {
  readonly at: SpecRef;
  /** 1-based column on the spec card, when the defect has one. */
  readonly column?: number;
  readonly message: RpgMessage;
  /** `terminate` stops generation (the RG card is missing, a section is out of order);
   *  `flag` marks the line and generation continues, so one deck reports every defect it has. */
  readonly severity: 'terminate' | 'flag';
}

// ─── 3. The model — sheets resolved, nothing generated ─────────────────────────────────────
/** n = 1 is the MOST MINOR control field (rpg-sources.md §6.1 cols 44-46, [verified]); fields
 *  2-6 run in ASCENDING order of significance left to right. */
export interface ControlField { readonly n: 1|2|3|4|5|6; readonly end: number; readonly length: number; }

export interface RecordType {
  readonly condition: string;          // the two-digit resulting condition, Input cols 42-43
  readonly codes: readonly { readonly position: number; readonly not: boolean;
                             readonly compare: 'Z'|'D'|'C'; readonly code: string }[];
  readonly seq?: string;               // Input cols 2-3
  readonly number?: '1'|'N';           // col 4
  readonly optional: boolean;          // col 5 `X`
  readonly at: SpecRef;
}

export interface FieldSource {
  /** `serial` and `recordCount` are READINGS of `SER` / `RCT`, not transcriptions — §6.2 lists the
   *  tokens and defines neither. SER_AND_RCT_ARE_THE_SERIAL_AND_RECORD_COUNTERS, §15. */
  readonly kind: 'record' | 'page' | 'serial' | 'recordCount';
  /** `Cxx` -> the record type as identified by the INPUT SHEET'S COLUMNS 1-3 — `rpg-sources.md`
   *  §6.2 cols 20-22, verbatim and [verified]: "`Cxx` (a record type from input cols 1-3)". That is
   *  the `C` plus the two-column Seq field, NOT the resulting condition of Input cols 42-43.
   *  CXX_NAMES_THE_RECORD_TYPE_BY_INPUT_COLS_1_TO_3, §15. */
  readonly recordType?: string;
  readonly end?: number;               // Data cols 24-26, the units position in the record
  readonly sourceLength?: number;      // cols 27-29, only when it differs from cols 8-10
  readonly numeric: boolean;           // col 23 `N`
  readonly operation: 'move'|'add'|'subtract'|'resetAdd'|'resetSubtract'|'digit'|'zone';
  readonly conditions: readonly Condition[];
}

export interface DataField {
  readonly name: string;               // ≤6, alphabetic, no digits or specials (§6.2, [verified])
  readonly length: number;
  readonly sources: readonly FieldSource[];   // left-to-right in SHEET ORDER — §6.2 p.24
  readonly statuses: readonly { readonly status: string; readonly condition: string }[];
  readonly at: SpecRef;
}

export interface CalcStep {
  readonly result?: string;            // blank for a compare, or when it continues the line above
  readonly length?: number;
  readonly factor1?: { readonly text: string; readonly length: number };
  readonly op?: '+'|'-'|'X'|'/'|'C';
  readonly factor2?: { readonly text: string; readonly length: number };
  readonly accumulate?: 'A'|'S'|'resetAdd'|'resetSubtract';
  readonly conditions: readonly Condition[];
  /** Calc col 49. `[verified]` MUST NOT BE BLANK (rpg-sources.md §6.3) — a blank is a diagnostic,
   *  never a default. */
  readonly time: 'total' | 'detail';
  readonly halfAdjust?: number;        // cols 50-51
  readonly positionAdjust?: number;    // cols 52-53
  readonly statuses: readonly { readonly status: string; readonly condition: string }[];
  readonly at: SpecRef;
}

/** A Format LINE entry. `level` ORDERS the line and NOTHING ELSE — rpg-sources.md §6.4's
 *  [verified] "Level number ≠ control-field number" (§6.2 of this plan, and §15). What FIRES a
 *  total line is the `Fn` indicator written in its own condition columns 20-28. */
export interface OutputLine {
  readonly id: string;                 // cols 2-4 as punched
  readonly type: 'H'|'D'|'T';
  readonly level: string;              // col 3 — numeric 1-8 (hierarchical) or alphabetic
  readonly number: string;             // col 4
  readonly print: boolean;             // col 5
  readonly nextLine?: string;          // cols 8-10 — MUST match cols 2-3 (§6.4, [verified])
  readonly spaceBefore?: 1|2|3;        // cols 11-12
  readonly spaceAfter?: 1|2|3;         // cols 13-14
  readonly skipBefore?: number;        // cols 15-16, channel 1-12
  readonly skipAfter?: number;         // cols 17-18
  /** OR is expressed by REPEATING the entry (§6.4 p.38, [verified]); each repeat is one AND-group.
   *  THE SAME SENTENCE CARRIES A RESTRICTION AND `model.ts` ENFORCES IT: "`OF` may participate in
   *  an *or* group only if it is part of EVERY alternative." An `OF` in some but not all groups is
   *  a named diagnostic, and §11.5's corpus carries the deck that fires it. */
  readonly conditionGroups: readonly (readonly Condition[])[];
  readonly fields: readonly FieldEntry[];
  readonly at: SpecRef;
}

export interface FieldEntry {
  readonly kind: 'F'|'B'|'K'|'W';
  readonly name?: string;              // cols 29-34; blank for K, `WORDxx` for W
  readonly end?: number;               // cols 35-37, the print position of the RIGHTMOST position
  readonly conditionGroups: readonly (readonly Condition[])[];
  readonly zeroSuppress: boolean;      // col 47 `Z`
  readonly length?: number;            // cols 48-50
  readonly literal?: string;           // cols 51-75, left-justified in column 51
  readonly at: SpecRef;
}

export interface Condition { readonly indicator: string; readonly negated: boolean; }

export interface Model {
  readonly control: { readonly present: boolean; readonly at?: SpecRef };
  readonly records: readonly RecordType[];
  readonly sequenceField?: 1|2|3|4|5|6;      // the SCFx line, Input cols 1-4
  readonly controlFields: readonly ControlField[];
  readonly fields: readonly DataField[];
  readonly calcs: readonly CalcStep[];
  readonly lines: readonly OutputLine[];
  /** Every indicator the deck actually names — ONLY_REFERENCED_INDICATORS_ARE_ALLOCATED, §15. */
  readonly indicators: readonly string[];
}

// ─── 4. The generated statement ────────────────────────────────────────────────────────────
/**
 * ONE Autocoder statement, before it is a card. `operands` is a list of STRINGS because the
 * assembler is the thing that parses operands — this phase writes source, it does not resolve
 * addresses. `from` carries the spec card that caused it, which is what puts a readable
 * "* FROM PAGE 05 CARD 010" comment card in the generated deck.
 */
export interface Stmt {
  /**
   * THE DISCRIMINATOR, and it is not optional in spirit even though it defaults.
   * `src/asm/types.ts` exports `COMMENT_COLUMN = 6` BESIDE `SOURCE_FIELDS` (lines 18-24) — it is a
   * sibling export, not a member, so `card.ts` imports both names: a comments card is `*` in
   * column 6 with text in 7-72, and §10.4's
   * target is full of them. Without this field `{op:'', comment:'…'}` is indistinguishable from a
   * DA sub-entry, which is ALSO a blank operation field with a label and an operand — so wave 2's
   * "re-emit the whole of wave 1's program" oracle could not be met. `card.ts` switches on it.
   */
  readonly kind?: 'statement' | 'comment';   // default 'statement'
  readonly label?: string;
  /** Column-7 indent: a label on a `DS` that must resolve HIGH-order
   *  (COL7_INDENT_IS_STANDALONE_TOO, Phase 3 §15; the demo's ` PLINE DS 132` depends on it —
   *  verified: `PLINE` resolves high-order, to the start of the 132 positions, with the indent).
   *  A DA SUB-ENTRY'S LABEL ALWAYS RESOLVES LOW-ORDER REGARDLESS OF COLUMN: `src/asm/symbols.ts`'s
   *  sub-entry branch calls `defineLabel(statement, addrs, addrs, 'area', 'lowOrder')` for BOTH
   *  sub-entry forms, unconditionally, and never consults the indent column. Only the DA *header*
   *  resolves high-order. §8.1 item 2's design depends on the low-order rule, so the mental model
   *  matters even though the addresses come out the same either way. */
  readonly indent?: boolean;
  readonly op: string;
  readonly operands: readonly string[];
  readonly comment?: string;
  readonly from?: SpecRef;
}

// ─── 5. The memory map ─────────────────────────────────────────────────────────────────────
/**
 * TWO PASSES, AND THE TYPE SAYS SO. Everything from `slack` down is a function of where the CODE
 * ENDS, and the code's length is not known until `driver()` has produced the `Stmt[]`. So
 * `layoutOf(model, codeLength)` is called TWICE (§6, §8.1): once with `codeLength: 0` to drive
 * with, and again with `measure(stmts)` to emit with. `measure` lives in `layout.ts` beside its
 * only consumer and is wave 2's, not `generate.ts`'s (§6). `codeLength` is the ONLY input that
 * changes between the two calls, which is what makes the second pass idempotent — see §8.1.
 */
export interface Layout {
  readonly org: Addr;                  // 00500 — the loader occupies storage below it
  readonly constants: Addr;            // where the emitted block starts
  readonly code: Addr;
  /** The measured length of the emitted constants-and-code run, in positions. 0 on pass 1. */
  readonly codeLength: number;
  /** The one UNRESERVED, UNEMITTED position the loader's terminating GM-WM lands on (§8.1). */
  readonly slack: Addr;
  readonly indicatorFile: Addr;
  readonly cardIn: Addr;
  /** THE FIRST HUNDREDS BOUNDARY AT OR ABOVE `cardIn + 80` — `ceil((cardIn + cardInLength) /
   *  100) * 100`, rounded off the card image's END and never off its start. `PRINT_AREA_IS_
   *  HUNDREDS_ALIGNED` is why it is a boundary at all; `RESERVED_AREAS_ARE_PAIRWISE_DISJOINT_
   *  AND_THE_PRINT_AREA_CLEARS_THE_CARD_IMAGE` (§8.1 item 4, §15) is why it is THAT boundary.
   *  Nothing the assembler checks can catch a violation — `DA` and `DS` emit nothing. */
  readonly printLine: Addr;
  readonly printGroupMark: Addr;       // printLine + 132
  readonly highWater: Addr;
  readonly coreSizeCode: 1|2|3|4|5;    // CTL col 22: 1 = 10K … 5 = 80K (software.md §6, [verified])
  areaOf(name: string): Addr | undefined;
}

// ─── 6. The result ─────────────────────────────────────────────────────────────────────────
export interface RpgResult {
  /** false if ANY diagnostic was raised. The source is STILL returned when generation reached
   *  the end; it is just wrong — the view refuses to hand it off, the precedent Phase 3's
   *  PUNCH INTO HOPPER set. `undefined` source means a `terminate` diagnostic stopped it. */
  readonly ok: boolean;
  readonly cards: readonly SourceCard[];
  readonly source: string;             // cards.join('\n') — what SEND TO AUTOCODER hands over
  /** OPTIONAL, because `listing.ts` lands in wave 6 and `generate.ts` in wave 5, and a wave never
   *  returns `[]` from a field whose type says it is populated. Wave 6 fills it by ADDING the call
   *  — it does not change `generate.ts`'s contract, which is what keeps §11's file ownership
   *  intact. `undefined` means "no listing was built", never "the deck had no lines". */
  readonly listing?: readonly RpgListingLine[];
  readonly diagnostics: readonly RpgDiagnostic[];
  readonly model?: Model;
  readonly layout?: Layout;
}

export interface RpgListingLine {
  readonly at: SpecRef;
  readonly card: SpecCard;             // the eighty columns as punched
  readonly flag?: 'E' | 'W';
  readonly message?: RpgMessage;
  /** `separator` carries the recovered END … SPECS lines and the END OF RPG trailer. */
  readonly kind: 'heading' | 'spec' | 'separator' | 'diagnostic' | 'trailer';
}
```

**Three signatures, defined by their owning module — NOT content of `types.ts`.** They are written
here as declarations so the shapes are settled before wave 1, but a worker who pastes them into
`types.ts` gets ambient declarations whose implementations live somewhere else.

| Signature | Owner | Wave |
|---|---|---|
| `function generate(text: string): RpgResult` — THE one entry point; **NEVER throws on spec content**, every defect is a diagnostic and `ok` is false | `src/rpg/generate.ts` | 5 |
| `function toCard(stmt: Stmt, pglin: string, ident: string): SourceCard` — the ONE place a generated card's 80 columns are decided, over the imported `SOURCE_FIELDS`. **`generate.ts` assigns `pglin`** — sequentially over the emitted deck, page `01` line `010` upward, ten to a line and ninety-nine to a page — and `ident` from `SpecRef` | `src/rpg/card.ts` | 2 |
| `class RpgBug extends Error {}` — a **real throwable class**. Thrown ONLY for a generator-internal invariant violation (a layout address outside the model, an `IoRequest` for a unit the choke point has no arm for). Spec content never reaches it (§6.3). **It lives in `types.ts`, not in `generate.ts`**: both throwers — `layout.ts` and `emitio.ts` — are wave 2's, `generate.ts` is wave 5's, and a wave never creates a file another wave owns | `src/rpg/types.ts` | 2 |

---

## 5. The parsers

### 5.1 Specification cards — `sheets/read.ts`

One line of pasted text = one spec card, right-padded to exactly 80 characters; a line longer than
80 is a diagnostic; `\r` and trailing whitespace are stripped before columns are counted — the
`parseDeck` and `readSource` precedent, reused rather than re-argued. A tab is a diagnostic: the UI
carries the **per-sheet column ruler** above the textarea instead, which is what the X24 forms
were.

Three rules inherited verbatim from `src/asm/source.ts`, because a person types into both boxes and
two different answers to the same keystroke would be a second source language:

- **Lowercase up-cases** (`SOURCE_LOWERCASE_UPCASES`, Phase 3 §15) — the 1410 has no lowercase and
  the specification sheets were filled in capitals.
- **`+` normalises to `&`** before the card is stored (`SOURCE_PLUS_IS_THE_12_PUNCH`) — there is no
  `+` among the 64 glyphs; Hollerith 12 is BCD `0o60`, which chain A prints as `&`.
- **Anything else `bcdOfGlyph` rejects is a diagnostic** with its 1-based column, and the position
  stores as a blank so the card is still 80 valid glyphs and the listing still renders that line.

**The finding this plan already made against itself, and it belongs here.** An early draft of
`demos/sales-summary.asm` assembled with `F` flags **every one of them in a comment card**, and the
characters were `(`, `)`, `=` and the em-dash `─` — not, as an earlier version of this paragraph
said, `=` and `:`. **`:` IS among the 64 glyphs**: `bcdOfGlyph(':')` returns 13 (`src/core/bcd.ts`
rank 22, BCD `0o15`) and it earns no flag. What is true of the colon is a *printing* fact, not a
storage one — it is one of the twelve codes **neither** 48-character chain can print, so it stores
cleanly and prints blank (§9, `charset.md` §5). `bcdOfGlyph('=')`, `bcdOfGlyph('(')` and
`bcdOfGlyph('─')` are all `undefined`, and those are the flags.

So the rule is stated for the generator as well as for the parser — **`card.ts` writes comments,
labels, operands and constants in the 64-glyph alphabet, and `test/rpg-card.test.ts` round-trips
every generated card back through the shipped `readSource` + `cardFields` and asserts the fields
come out unchanged.** **That makes the round trip field-for-field IDENTITY, and it is only identity
because `card.ts` writes address adjustment as `&` and never as `+`** — `+` is not one of the 64
glyphs, `readSource` rewrites it to `&` before the card is stored, and a generator emitting
`BA1 *+1` or `CS PLINE+131` would get `*&1` and `PLINE&131` back and fail its own assertion. This
is a rule about the GENERATOR, not about people: a person may type `+` into either box and the
normalisation is there for exactly that, which is why the hand-written target of §10.4 and the
shipped `demos/hello-dad.asm` both carry `+` (§10.4's item 4). **Wave 2's re-emit oracle therefore
compares `toCard(...)` against `demos/sales-summary.asm` AS READ THROUGH `readSource`**, where the
normalisation has already happened, and not against the file's raw bytes. No `=`, `(`, `)`, `'` or `─` anywhere in generated text; a `:` would round-trip but is
avoided in comments because it prints blank, which reads as a typo on the page. The current draft
of the target is clean under a `bcdOfGlyph` sweep of all 270 cards (§10.4 records the run).

**And one column rule `card.ts` owns, read off `src/asm/operand.ts` rather than assumed.** The
operand field is columns 21-72 (`SOURCE_FIELDS.operand`), and **the first double blank ends it** —
`operand.ts`'s `commentCut`, `software.md` §1: everything after two blanks is comment. So a
generated card's operand **begins at column 21, with at most one blank before it, and carries no
interior double blank before the comment**. This bites exactly where a formatter would want to
align: a DA sub-entry written as `RC01` + spaces + `1` with the `1` at column 23 parses as
`operands: []` and flags *"a DA sub-entry is `hi,lo` or a single relative position"*. Because
`FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS`, the addresses stay plausible and the failure surfaces
later as golden drift. `test/rpg-card.test.ts` carries this as an explicit round-trip case.

**Sheet identity is column 1** (`rpg-sources.md` §6, `[verified]`): `C` Input, `D` Data, `A`
Calculation, `L`/`F`/`B`/`K`/`W` Format. **The `RG` card is the exception** and is identified by
columns 1-2, which is why `deck.ts`'s state machine and not the column-1 dispatch decides what the
first card of the deck is (§5.3). Columns 76-77 are the page and 78-80 the card number, on all four
sheets (`[verified]`, §6).

### 5.2 The four sheets — `sheets/{input,data,calc,format}.ts`

Each module turns `SpecCard` into its sheet's row type by slicing `columns.ts`'s spans and nothing
else. **No module contains a column number.** The rules that bite, each with its citation:

**Input (X24-1336, §6.1).** Cols 2-3 are two digits for a fixed record sequence within a control
group or two alphabetic letters for none, max 20 unique specs; col 4 is `1` / `N` / blank, **except
on an `SCF` line, where it holds the control-field number**; col 5's `X` marks the record type
optional. Cols 6-11 are the first record code as Position / Not / Z-D-C / Code, and cols 12-41 are
five more in the same 6-column shape, **all in an `and` relation**. Cols 42-43 carry the
two-digit resulting condition and appear only on the **last** line-entry for a record type;
continuation lines repeat `C` in column 1 with no resulting condition (§6.1 p.20). Cols 44-73 are up
to six control fields as End(3) / Length(2) pairs, **field 1 the most minor, ascending in
significance left to right**. A line with `SCFx` in **columns 1-4** names the control field
governing the sequence, and every application with sequential-record specs needs one (p.21).

**Data (X24-1337, §6.2).** Cols 2-7 are a unique alphabetic field name ≤6 characters, left
justified, no digits and no specials — which is what makes the generator's own `Z`+digits labels
collision-proof (§8.4). Cols 8-10 are the unedited length. Cols 11 / 14 / 17 carry `B` / `Z` / `N` /
`P` statuses paired with two-digit resulting conditions in 12-13 / 15-16 / 18-19, evaluated **after**
the source operation completes, and not colliding with any condition defined on the Input or
Calculation sheets. Cols 20-36, 37-53 and 54-70 are three identical 17-column source groups —
source (`Cxx` / `PAG` / `SER` / `RCT`), `N` or `M` in col 23, field end, source length, operation in
col 30, and two and-related conditions. **`Cxx` names the record type by the Input sheet's columns
1-3**, i.e. the `C` plus the two-column Seq field — §6.2 cols 20-22 verbatim, `[verified]` — and
**not** by the two-digit resulting condition of Input cols 42-43; `model.ts` resolves it against the
`RecordType.seq` values and a `Cxx` naming no declared record type is a named diagnostic
(`CXX_NAMES_THE_RECORD_TYPE_BY_INPUT_COLS_1_TO_3`, §15, and `rpg-vocabulary.test.ts` asserts the
**referent**, not just the token). **Order matters**: the object program applies sources
left to right in sheet order, so a reset-add source must be written first (§6.2 p.24, `[verified]`),
and a continuation line repeats `D` in column 1 with columns 2-19 blank. **`PAGENO` is the one
mandated name** and only one may exist per application (p.26).

**The three-column condition group, and it is ruled here because the research does not rule it.**
Every condition on every sheet is a **three-column group** — Data 31-33 / 34-36, Calculation 40-42 /
43-45 / 46-48, Format 20-22 / 23-25 / 26-28 and 38-40 / 41-43 / 44-46 — holding a two-character
indicator plus a negation, and **only the Data sheet says which column carries the negation**:
§6.2 cols 31-33, `[verified]`, *"`N` in col 31 negates."* Every other group is silent. Ruled by the
cross-sheet analogy: **the group is `[N or blank][indicator, two characters]`** — the *first*
column is the Not column and the indicator is right-justified in the remaining two.
`CONDITION_GROUP_IS_NOT_PLUS_TWO_DIGIT_INDICATOR`, §15, `[likely]`, **wave-0 target**; the fallback
is indicator-left-justified with the negation elsewhere, which is one slice per group in
`columns.ts` and a re-cut of every demo card that carries a condition. `columns.ts` therefore
decomposes each group into a one-column `notN` field and a two-column `indicatorN` field, and
`test/rpg-columns-vs-research.test.ts`'s **condition-group shape — the FOURTH of §7.2's five, not
the aggregate rule** — makes them tile it exactly. The distinction is load-bearing: the aggregate
rule needs a **bold** row with decomposing children and a `SheetField` name ending `Group`, and the
research file carries every condition row as an ordinary non-bold row with no children, so a diff
written to the aggregate rule fails on the correct `columns.ts` in both directions at once.

**Calculation (X24-1338, §6.3).** Cols 2-7 name the result field and are **blank** for a compare
(`C` in col 29) or when the result goes into the same field as the preceding line. Cols 11 / 14 / 17
carry `B` `Z` `N` `P` `U` `E` `H` `L` — **`H` and `L` included, with no special feature** (§2.4
item 1). Cols 20-25 / 26-28 are factor 1 and its length, col 29 the operation, cols 30-35 / 36-38
factor 2 and its length. **Col 39 is how the result reaches the field named in 2-7** — `A`, `S`,
`0+`, `0-` — and *"if only factor 2 is given, factor 2 itself"* is added, which is the single-factor
accumulate form the demo's `DTOT` / `RTOT` / `GTOT` cards use. **`0+` is a single column holding the
12-0 punch and `0-` the 11-0 punch** (§6.2 col 30 / §6.3 col 39, `[verified]`), which in this
project's alphabet are the glyphs `?` (rank 25, `0o72`, "plus zero") and `!` (rank 35, `0o52`,
"minus zero") — read off `src/core/bcd.ts`, not guessed. Cols 40-48 are up to three and-related
conditions from the input / data / earlier-calculation namespace plus `LC`, `F1`-`F6`, `SB`-`SD` and
negations. **Col 49 is `T` or `D` and `[verified]` MUST NOT BE BLANK** — a blank is a diagnostic,
never a default, and this is the column the panel's third proposal amputated. Cols 50-51 half adjust
and 52-53 position adjust.

**Format (X24-1339, §6.4).** Column 1 selects which half of the sheet is in play: `L` ⇒ a line entry
using cols 2-28 with 29-75 blank; `F` / `B` / `K` / `W` ⇒ a field entry using cols 29-75 with 2-28
blank (p.38, `[verified]`). `F` prints a field and leaves it; **`B` prints it and blanks it —
readout-and-reset, exactly as on an accounting machine**; `K` prints a constant with the field-name
columns blank; `W` defines a `WORDxx` constant or edit control word. Cols 2-4 are the line
identification from the spacing chart — type `H`/`D`/`T`, level, number. **Cols 8-10 are Next Line,
and cols 8-9 must equal cols 2-3** — the entry `cycle-first` omitted, and the reason its own sample
page had no column-title line. Cols 11-18 are Space Before / After and Skip Before / After;
col 19 is the punch stacker (out, §2.2); cols 20-28 are three and-related line conditions with
**OR expressed by repeating the whole entry** (p.38, `[verified]`) — **and the same sentence's
second half is enforced, not quoted and dropped: *"`OF` may participate in an *or* group only if it
is part of every alternative"***, so an `OF` in some alternatives and not others is a named
diagnostic in `model.ts` carrying that sentence, and §11.5's corpus has the deck that fires it. A
line reached as another line's Next Line leaves the conditions blank. Cols 29-34 name the field, 35-37 its print position (rightmost),
38-46 three field conditions, col 47 `Z` zero-suppress, cols 48-50 the length of the constant or
edit word in **cols 51-75, left-justified in column 51 — twenty-five characters, which is a real
constraint and the demo obeys it** (§10.2).

**§6.4's ordering rules are `[verified]` and are enforced, not assumed** (p.43): the first entry on
the sheet must be an `L`; every line spec is followed by the field entries for that line, in any
order among themselves; lines appear in output order, **descending level for heading lines and
ascending level for total lines**; `W`-entries may appear anywhere except first. Each is a named
diagnostic in `model.ts` carrying that sentence.

**And the level-ordering half is scoped to NUMERIC levels, which is a ruling and gets a constant.**
§6.4's line classification (spacing chart, pp.12-16, `[verified]`) says *"numeric levels are
hierarchical (up to 8 per type); **alphabetic levels mark independent lines** (e.g. page-overflow
headings `HBx`, standalone detail `DAA`)"*. An independent line is by definition not in the
hierarchy the descending/ascending rule orders, so the rule cannot bind it — and it must not,
because the demo's own heading lines are `HA1`, `HA2`, `HB1`, `HB2`, level `A` then level `B`,
which on a literal reading of "descending level for heading lines" is **ascending** and would fire
the demo's own diagnostic. `THE_LEVEL_ORDERING_RULE_APPLIES_TO_NUMERIC_LEVELS_ONLY`, §15,
`[likely]`; §11.5's *"heading lines in ascending level"* malformed deck therefore uses **numeric**
levels, and §11.2's demo row exercises the alphabetic case beside it.

### 5.3 Deck order — `deck.ts`, an explicit state machine

**RULING, from a required graft:** `cycle-first` folded deck-order checking into the column-1
dispatch; the buildability judge required `sheet-first`'s separate scan. **Separate scan**, because
the recovered messages are *boundary events* and a state machine is what makes them testable one at
a time — and it is what makes `SPEC_DECK_ORDER_IS_THE_1401_ORDER` a single reversible module if the
ordering ruling ever moves.

Five states over §6.6's `[verified]` order, each transition emitting its message:

| From → to | Emitted | Provenance |
|---|---|---|
| start → control | — (the `RG` card must be first) | — |
| control absent | `10802 EOJ-NO RG CONTROL CARD`, severity `terminate` | `recovered-1410`, §4.4 |
| control malformed | `10805 EOJ-ERRONEOUS RG CARD`, `terminate` | `recovered-1410`, §4.4 |
| a `1405` / `1301` card present | *"unsupported: 1405 / 1301 disk input is out of scope (DECISIONS.md 2026-08-30)"*, `terminate` — **not** 10803 / 10804, whose recovered texts are `EOJ-NO 1405 / 1301 CONTROL CARD` and describe the card's **absence** (§2.2, §2.4 item 6) | `ours` |
| a `1301` card present **and malformed** | `10806 EOJ-ERRONEOUS 1301 CARD`, `terminate` — the one 1405/1301 message whose text fits a card that is actually there | `recovered-1410`, §4.4 |
| 10803 / 10804 | **never raised.** Reserved for the absence case they name, asserted verbatim by `rpg-messages.test.ts`, and listed here so the omission is deliberate rather than lost | `recovered-1410`, §4.4 |
| input → data | `END INPUT SPECS` | `recovered-1410`, §4.4 |
| data → calculation | `END DATA SPECS` | `recovered-1410`, §4.4 |
| calculation → format | `END CALC SPECS` | `recovered-1410`, §4.4 |
| format missing at end of deck | `TERMINATE RUN. * CARD MISSING BEFORE FORMAT SPECS`, `terminate` | `recovered-1410`, §4.4 |
| a Format `L` line with no output type | `OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC`, `flag` | `recovered-1410`, §4.4 |
| a deck with no output at all | `NO OUTPUT SPECIFIED  CD`, `terminate` | `recovered-1410`, §4.4 |
| end of deck | `END OF RPG.BEGIN AUTOCODER` — the listing's trailer | `recovered-1410`, §4.4 |

A card whose column-1 code belongs to an already-closed section is a diagnostic naming both
sections; the scan never reorders the deck, and it never throws.

---

## 6. Resolve — the model, the cycle, and the error model

```text
read    text  -> SpecCard[]                              sheets/read.ts
scan    cards -> sections + boundary messages            deck.ts
parse   cards -> SheetRows                               sheets/{input,data,calc,format,control}.ts
model   rows  -> Model                                   model.ts     (every cross-sheet rule)
layout1 Model, codeLength 0 -> Layout                    layout.ts    (pure; no assembler)
drive1  Model + Layout -> Map<CycleSection, Stmt[]>      cycle.ts + calc.ts + output.ts
measure Stmt[] -> codeLength                             layout.ts    (§6's sizing rule)
layout2 Model, codeLength -> Layout                      layout.ts    (the SAME function)
drive2  Model + Layout -> Map<CycleSection, Stmt[]>      cycle.ts + calc.ts + output.ts
cards   Stmt[] + header/trailer -> SourceCard[]          generate.ts + card.ts
```

`generate.ts` composes those calls and does nothing else — plus the one thing nothing else owns:
it emits the deck's **header and trailer** (the `AUTOCODER RUN` / `JOB` /
`CTL` / three comment cards / `LOAD` / `ORG` block and the closing `END START`, none of which
belongs to a `CYCLE_ORDER` section, §8.1).

**Why two passes, and it is a correction.** An earlier draft of this section ran `layout` **before**
`drive` and once only, while §4's `Layout` declared `slack`, `indicatorFile`, `cardIn`, `printLine`
(*"forced to a hundreds boundary"*), `printGroupMark`, `highWater` and `coreSizeCode` — every one
of which is a function of **where the code ends**, which is not known until the statements exist.
That layout was not computable in the position the pipeline put it. So:

- **pass 1** calls `layoutOf(model, 0)`. Everything above the code — `org`, `constants`, `code` —
  is already final, because the constants block is a function of the `Model` alone; everything
  below it is provisional. The property that makes that safe is narrower than "a `Stmt` carries
  only symbols", which is **false in this deck**: `generate.ts`'s header punches `ORG 00500` and
  `CTL <coreSizeCode>`, and the `areas` section — `driver()`'s — emits `ORG <printLine>`, a
  pass-2-only number, on pass 1. The true and load-bearing property is that **no statement's
  LENGTH depends on a layout address**: the only layout-derived operand any emitter writes is that
  `ORG`, whose assembled length is **zero**, so a provisional `printLine` cannot move `measure`.
  That is exactly what the fixed-point test pins;
- **`measure`** sums the emitted length of the `Stmt[]`. **It lives in `layout.ts`, not in
  `generate.ts`** — it is a function of the `Stmt[]` alone, its only consumer is `layoutOf`, and
  putting it beside its consumer is what lets wave 2 close its own oracle (§11 wave 2). **And it
  is a STATED SIZING RULE, not a borrowed table**, because there is no table to borrow: `card.ts`
  formats 80 columns and knows no instruction lengths, the emitters produce operand *strings*, and
  `MnemonicRow.lengths` is a **set of legal lengths** whose own doc comment
  (`src/asm/mnemonics.ts:242`) says it *"VALIDATES an assembled length and never drives it"*. The
  one thing that drives a length is `lengthOf`, a closure private to `pass1`
  (`src/asm/symbols.ts:334`) over the assembler's `Statement`, not over this phase's `Stmt`. So
  `measure` states the rule itself, in five lines:
  **`1` for the operation character, `+3` when the statement is an I/O form (`R`/`P`/`W`/`RCP`/`WCP`/`WM`
  — the x-control the mnemonic supplies, which is why `R1 0,CDIN` is 10 positions and not 11),
  `+5` per ADDRESS operand (a stacker pocket is not one), `+1` for a `d`;** plus the four
  declarative rules — a `DCW`/`DC` is its literal's length, a `DA` is `blocking × fieldLength`, a
  `DS` is its operand, an `ORG` is **zero**. **`measure` sums the `constants` and code sections and
  EXCLUDES `areas`**, because `Layout.codeLength` is *"the constants-and-code run"* and `areas` is
  what the layout is being computed for.
  **And it is cross-checked rather than trusted:** `test/rpg-layout.test.ts` asserts, statement for
  statement over the statements `measure` actually sums — the `constants` and code sections,
where every line carries a `ct`, comment cards and the reserved areas excluded because `measure`
never sees them — that `measure`'s length for each `Stmt` equals the
  `ct` column `assemble()` itself printed (`ListingLine.ct`, which the shipped listing carries for
  every non-comment line). That is free, mechanical, and it is the only thing that makes *"no
  assembler is consulted at generate time"* safe rather than merely true;
- **pass 2** calls `layoutOf(model, codeLength)` and re-drives. The re-drive changes nothing that
  can change the length: `PRINT_AREA_IS_HUNDREDS_ALIGNED` moves `PLINE` but not the number of
  statements, and no emitter branches on a layout address.

**The second pass is idempotent, and that is a test rather than a claim — in two halves, because
one wave cannot run both.** The property is
`measure(drive(model, layoutOf(model, n))) === n`: a fixed point reached in one step, which fails
loudly if a third pass would have moved anything. **Wave 2 owns `measure`, `layoutOf` and
`test/rpg-layout.test.ts`, and it asserts the half it can run** — over the hand-built `Stmt[]`,
with no `drive()` in existence: `measure(handBuilt) === n` and `layoutOf(model, n)` unchanged by a
further pass. **The corpus-wide half — `drive()` in the middle and §11.2's eight decks underneath —
belongs to wave 5 and lives in `test/rpg-cycle-corpus.test.ts`, which wave 5 already owns**, so no
wave appends to `test/rpg-layout.test.ts` and §11's three declared cross-wave appends stay three.
`drive()` is wave 3's, `calc.ts`/`output.ts` are wave 5's and every deck in the corpus is wave 4's
or wave 5's, so assigning the corpus half to a wave-2 file would have been unrunnable in the wave
that owned it.

### 6.1 The indicator namespace, and why it is one core position each

Every RPG condition — a two-digit resulting condition 00-99, a control level `F1`-`F6`, `OF`, `LC`,
`1P` — is **one core position holding `1` or `0`**. That makes a condition exactly one instruction
in **either** polarity: `BCE skip,F1,0` for "F1 is off", `BCE skip,F1,1` for "F1 is on". Conditions
appear on every calculation line and on every output line and field, so the polarity symmetry
roughly halves the generated code, and the area is legible in the internals core view.
`INDICATORS_ARE_ONE_CHARACTER_EACH`, §15; the fallback is a bit-packed file tested with `BBE` and a
mask, which costs `indicators.ts` only and nothing else knows.

**Only the indicators a deck actually names are allocated** (`ONLY_REFERENCED_INDICATORS_ARE_ALLOCATED`,
§15), contiguously, as one `DA` header with a **bare-`lo` sub-entry** each — so `RC01`, `F1`, `OF`,
`LC`, `FSTPG` and `PRIME` are symbols in the assembler's own symbol table and in the listing, and the
whole file is cleared by one `MLCA` from a zeros constant at initialisation. The fallback is a fixed
100+9 file and a 109-character zeros constant: about two more condensed cards and nothing else.

**The `1P` indicator's Autocoder label is `FSTPG`, and it is `FSTPG` because `P1` is a real
mnemonic.** `resolve('P1')` returns the 1402 punch on channel 1 —
`io: { prefix: '%4', pockets: ['0','4','8'] }` — and `P1` is therefore a member of the shipped
resolver's I/O mnemonic set, which is exactly the set §8.3 check 2's lint fails a string literal
for. Labelling the first-page indicator `P1` would put the string `'P1'` in `indicators.ts` and turn
the phase's own drift defence red on a file wave 3 legitimately owns. The set was enumerated from
`src/asm/mnemonics.ts`'s rows with `io !== undefined` on 2026-08-31 — **47 distinct names of length
≥ 2**: `P1 P1O P1W P1WO P2 P2O P2W P2WO PO PW PWO R1 R1O R1W R1WO R2 R2O R2W R2WO RCP RCPO RCPW
RCPWO RO RW RWO W1 W1O W1W W1WO W2 W2O W2W W2WO WCP WCPO WCPW WCPWO WM WM1 WM1O WM2 WM2O WMO WO WW
WWO` — and **every other label this plan names was checked against it in the same run: `P1` is the
only collision**. `FSTPG` is in neither the set nor its neighbourhood, and it joins §8.4's published
reserved area-name set beside `PRIME` (it carries no digit, so it does not get the `Znnn` family's
free defence and must be reserved by name).

`PRIME` is ours and is not an RPG indicator: it records that the first record has been read, so the
first card takes no control break. It is named in the generated deck's own comment and in §8.4's
reserved-label set.

### 6.2 The cycle — and the one place §6.4's verified sentence decides the design

`CYCLE_ORDER` is an **exported constant**, and it is the specification of the RPG logic cycle:

```ts
export const CYCLE_ORDER = [
  'constants', 'init', 'read', 'identify', 'sequence', 'extract',
  'controlBreak', 'totalCalc', 'totalOutput', 'levelReset',
  'detailCalc', 'headingOutput', 'detailOutput', 'lastCard', 'notFound', 'endOfJob', 'areas',
] as const;
```

**Each section has a LABEL, because "appears in `AssemblyResult.symbols`" needs one.** `cycle.ts`
exports `CYCLE_SECTION_LABEL`, a total map from `CycleSection` to the Autocoder label the section's
**first statement carries**; the driver guarantees that first statement is labelled. For the demo:

```ts
export const CYCLE_SECTION_LABEL: Readonly<Record<CycleSection, string>> = {
  constants: 'ONE',      init: 'START',    read: 'RDCARD',    identify: 'IDENT',
  sequence: 'SEQCHK',    extract: 'EXTRCT', controlBreak: 'CTLBRK', totalCalc: 'TOTCAL',
  totalOutput: 'TOTOUT', levelReset: 'LVLRST', detailCalc: 'DTLCAL', headingOutput: 'HDGOUT',
  detailOutput: 'DTLOUT', lastCard: 'LASTCD', notFound: 'NOTFND', endOfJob: 'EOJ',
  areas: 'IND',
};
```

`constants` is headed by the first constant and `areas` by the first reserved area, because neither
gets an anchor of its own: the slack position between them is deliberately **unreserved and
unlabelled** (§8.1 — a `DS 1` there would reserve it and re-create the very warning the slack
exists to prevent). All seventeen were checked against §6.1's 47-name I/O mnemonic set on
2026-08-31; none collides. The whole set joins §8.4's reserved-label set.

**`notFound` is a section of its own, and an earlier draft left it inside `lastCard`.** The
record-type-not-found path is a **full print block** — `CS PLINE+131` / `CS PLINE+99` /
`MLCA K090,PLINE+20` / `W1 PLINE` / `BA1 *+1` / `CC1 /` / `BA1 *+1` / `B RDCARD` — and in §10.4 it
sits at 02467-02523, physically between `LASTCD` (02424) and `EOJ` (02524). Under a contiguous
section model that made it part of `lastCard`, which put a print block inside a section §11 wave 3
must reproduce statement for statement while its producer, `output.ts`, is **wave 5's**. Naming it
`notFound` fixes both ends at once: `lastCard` becomes four `driver()` statements and stays in wave
3's oracle (a), and `notFound` joins the six sections wave 3 asserts as *empty in the right
position* — seven now — for exactly the reason the other six are excluded. The same hole covered
`stress/sequence-error.rpg`'s `INPUT REC OUT OF SEQ` block, which §11.2 requires verbatim; it is
`sequence`'s, whose producer is `output.ts` too. The similar processor diagnostic is not runtime output.

`test/rpg-cycle.test.ts` asserts that **every section this model generates** appears in
`AssemblyResult.symbols` at **strictly ascending addresses** in `CYCLE_ORDER` order — the cycle is
not a comment, it is a checkable property of the object program. The invariant is **conditional on
generation** because it has to be: `SEQUENCE_CHECK_IS_GENERATED_ONLY_WITH_AN_SCF_LINE` (§15) means a
deck with no `SCF` line — the demo, whose Input card is `CAA` — generates no `sequence` section at
all, so a flat "all seventeen" invariant is unsatisfiable for the artifact the phase is built
around.
Conditionality is not a hole: §13 criterion 9b requires that the test corpus **as a whole** exercise
every one of the seventeen at least once, and `stress/sequence-error.rpg` is the deck that carries
`sequence`.

Three semantic rulings live here, each with its constant and its evidence:

- **A break at control field *n* breaks every minor level** — universal RPG semantics, expressed as
  a **fall-through ladder** (`Z030 MLCS ONE,F2` falling straight into `Z031 MLCS ONE,F1` with no
  branch between them) so the semantic is legible in the generated listing rather than hidden in
  the generator. `CONTROL_BREAK_AT_LEVEL_N_BREAKS_ALL_MINOR_LEVELS`, §15; if it is wrong, each
  `Znn` gains a branch to the total section: six lines.
- **Total time precedes detail time on a break**, and total lines print **ascending by level**,
  minor first — implied by the Calculation sheet's `T`/`D` column and by §6.4's `[verified]`
  ordering rule, and it is the only ordering under which a level-2 total can include the level-1
  totals that just printed, which is exactly what the demo's `DISTRICT TOTAL` requires.
  `TOTAL_TIME_PRECEDES_DETAIL_TIME_ON_A_BREAK`, §15, and **wave 0's second target**.
- **`F1`-`F6` are the control-level indicators.** J24-0215-2 lists them in the condition vocabulary
  of both the Calculation and the Format sheets and never defines them; the Input sheet defines
  exactly six control fields in ascending significance. The generated labels are literally
  `F1`…`F6`, so the reading is visible in the listing and in core.
  `F1_TO_F6_ARE_THE_CONTROL_LEVEL_INDICATORS`, §15, and **wave 0's first target**.
- **`headingOutput` sits AFTER `detailCalc` and BEFORE `detailOutput`** — the ordering §10.4 trap 1
  is entirely about, and the one that lets the first card both accumulate and print its heading. No
  source is cited for it anywhere in this plan because none exists, so it gets a constant rather
  than silence: `HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION`, §15, `[unverified]`, and it joins
  **wave 0's target (b)**, which already names `1P`.

**And the sentence that is obeyed rather than argued around.** `rpg-sources.md` §6.4 records,
`[verified]`, from the spacing chart on pp.12-16: **"Level number ≠ control-field number."** One of
the panel's proposals ruled the identity `TOTAL_LEVEL_N_IS_CONTROL_FIELD_N` while quoting that
sentence and re-reading it as "the concepts are distinct, not that the indices differ", and all
three judges called it the worst move in the panel — a ruling **against** verified primary text
rather than in its absence. **This plan does not make it.** In the model:

- a Format total line's **level** column carries **one job only: it orders the line** among the
  other total lines (§6.4's ascending rule);
- what **fires** a total line is the condition written in its own columns 20-28 — **an `Fn`, or
  `LC`**, exactly like any other condition. `LC` is in the sheet's own condition vocabulary
  (§6.4 cols 20-22, `[verified]`) and the demo's `T31` grand total is fired by it, so a rule
  phrased as *"an `Fn`"* alone would flag the demo's own line. §11.5's malformed deck is therefore
  *"a `T` line with no condition at all in cols 20-28"*, not *"no `Fn`"*;
- `model.ts` therefore never maps a level to a control field, and there is no table to get wrong.

`LEVEL_NUMBER_IS_NOT_THE_CONTROL_FIELD_NUMBER` is in §15 as a **settled** row rather than an open
one, so that nobody later "improves" it into an identity map.

**Overflow is latched immediately after the print and before any carriage motion.** `BCV` reads a
**live** carriage state, not a latch. The sentence that says so covers **both** channels together
and is quoted from the research rather than from one `J_D_TABLE` row: `io.md` §5 (Figure 35,
A22-0526-3 p.36), `[verified]` — *"Carriage 9 and 12 indicators turn on when their hole is sensed
and off when any other carriage-tape channel is sensed."* (The `J_D_TABLE` row for `BCV`/`BCV1`
carries only the shorthand *"Same on/off rule as channel 9"*, `dmods.ts:78`; the longer wording sits
on the **BC9** row, `dmods.ts:74`, so quoting it as `BCV`'s own note was a mis-attribution.) A
space-after motion therefore moves the brushes off channel 12 and the signal is gone. The generated
shape is therefore
`W1 PLINE` / `BA1 *+1` / `BCV1 <latch>` / `B <done>` / `<latch> MLCS ONE,OF` / `<done> CC1 <d>`.
`OVERFLOW_IS_LATCHED_IMMEDIATELY_AFTER_THE_PRINT`, §15.

**The latch is emitted after a DETAIL or TOTAL output line and after nothing else, and that is
stated here because an earlier draft said "after each print" universally while the target program
did the other thing.** The target's nine `W1 PLINE`s carry exactly **four** `BCV1`s — the three
total-output prints and the detail print. The two heading prints in `HDGOUT`, the two in the `HB`
block and the `NOTFND` runtime-message print run `BA1 *+1` straight into their `CC1` with no latch
(§10.4). The reason is not economy: a heading block **skips to channel 1 itself** before it prints,
so it is at the top of a new form and sensing overflow across it says nothing; and the
runtime-message line is not part of the report body at all. So the shape above is emitted for
`detailOutput` and `totalOutput` and the plain `W1 PLINE` / `BA1 *+1` pair for `headingOutput` and
for `NOTFND`. §8.2's *"the print itself"* row says the same, §2.1 says the same, and §10.4 trap 4
asserts **both** — the four latches by position and the five absences by count.

**And it interacts with a live Phase-2 divergence, which is recorded and not fixed.**
`CARRIAGE_SENSES_AT_DESTINATION_ONLY` (`printer1403.ts:329`, an OPEN divergence from a `[verified]`
sentence, recorded by Phase 2 rather than patched) means this carriage senses a channel only on the
line it lands on. With `DEFAULT_CARRIAGE_TAPE`'s channel 12 at form line 60, a **double-spacing**
line can step 59 → 61 and never see it. So: **the demo single-spaces its detail lines**, which is
what makes its overflow land on the punch; **`demos/cycle-probe.rpg` exercises the double-space
straddle explicitly**; and the result is asserted as a named test and **recorded against the Phase-2
constant** in `open-questions.md`, never patched in `src/core/**`. That is the `RW#` / `WM#` /
`loader.ts` precedent applied a fourth time.

### 6.3 The error model, in one paragraph

**Diagnostics are data, never exceptions.** `generate()` returns `RpgResult` with `ok: false` and a
`RpgDiagnostic[]`; a `flag` diagnostic marks its line and generation continues, so one pass over a
bad deck reports every defect it has, and a `terminate` diagnostic stops generation and returns no
source. The only throw in `src/rpg/**` is `RpgBug`, and it has exactly two triggers, both
generator-internal: a layout address that is not in the model, and an `IoRequest` naming a unit the
choke point has no arm for. **Spec content cannot reach either.**

**Which is precisely why no wave gate may be phrased as "it did not throw."** The engineering
skeptic verified both halves of this against the shipped code:

- `AssemblyResult.ok` is `flagged.length === 0` **over listing lines only**; `warnings` is a
  separate array that `ok` never consults. `src/asm/pack.ts`'s `tailWarnings()` emits two, and one
  of them — *"the last record's GM-WM lands at NNNNN, inside the record loaded at MMMMM — it
  overwrites one character of the program"* — is a **silently corrupt object deck with
  `ok === true`**. Confirmed live on `demos/hello-dad.asm`: one warning, `0 flagged line(s)`, exit 0.
- The assembler **never throws on source content** (`emit.ts`'s own header, `assemble.ts`). A probe
  deck's `CARD DA 1X80,1,5,G` assembles, flags `F`, **still reserves 80 positions** so the following
  statement's address is plausible, and still returns a deck — and because pass 1 keeps assigning
  addresses through a flagged line (`FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS`), a later golden
  comparison **drifts** rather than failing at the cause.

So, stated once and applied in every wave row of §11 and every criterion of §13:

> **The assembler gate is `result.ok === true` AND `result.flagged.length === 0` AND
> `result.warnings.length === 0`.** Where a warning is expected it is enumerated and justified by
> name in the test, never whitelisted wholesale. And every generator test additionally asserts the
> `ListingLine.instruction` strings for the statements the wave owns, so a wave proves what it
> emitted rather than that something came back.

§8.1's layout rule is what makes `warnings.length === 0` achievable rather than aspirational.

---

## 7. The column tables, and how they stay honest

### 7.1 `sheets/columns.ts` — the single place a column number is written

**REQUIRED GRAFT, taken from `sheet-first` and demanded by two judges.** One
`readonly SheetField[]` per sheet — `CONTROL_COLUMNS`, `INPUT_COLUMNS`, `DATA_COLUMNS`,
`CALC_COLUMNS`, `FORMAT_COLUMNS` — every span carrying the `rpg-sources.md` §6.n row it came from
and an `inScope` flag with a `why` for the ones §2.2 cut. **No other file in `src/rpg/**` contains
a numeric column literal**, and `test/rpg-columns-is-the-only-place.test.ts` greps for one.

**The grep is defined here, tightly, because an undefined gate either fires on legitimate arithmetic
or gets quietly weakened until it passes.** The target is: **a decimal integer in 1..80 appearing as
an argument to `.slice(`, `.substring(` or `.substr(`, or as an element of an array literal of
exactly two such integers** — that is, a column or a span, and nothing else. Everything else is out
of scope by construction, and the three shapes that would otherwise trip it are named in the test's
own header the way §7.2's expansion rule is published: `layout.ts` legitimately writes `132`, `80`
as an **area length** and a hundreds boundary; `output.ts` writes `end - 1` to turn a field end into
an offset; and `card.ts` works over the imported `SOURCE_FIELDS`. Numbers outside 1..80, arithmetic
on a value read from `columns.ts`, and array literals of other arities never match.

That single-source property is what makes `RECORD_POSITION_IS_THREE_DIGITS` (§15) a one-table
change, and it is what makes the per-sheet UI ruler and the parser the same data (§1 step 2).

### 7.2 The both-directions diff against the research file, with a published expansion rule

`test/rpg-columns-vs-research.test.ts` slices the `| Cols | Name | Content |` tables out of
`docs/research/rpg-sources.md` **§6.1-§6.4** and asserts, **in both directions**, that every span in
`columns.ts` has a research row and every research row is implemented or on the named out-of-scope
list, **exactly once**. **§6.5 is excluded, and that is a ruling rather than an omission**: §6.5 is
the **1401** `CNTL` card, headed *"Superseded on the 1410 — see §5"*, and §2.4 item 3 refuses its
layout outright. `CONTROL_COLUMNS` therefore carries exactly two spans — `RG` at cols 1-2 and body
at 3-75 — both cited to **§5**, not to §6.5, and both **exempt from the diff**; `test/rpg-vocabulary.test.ts`
asserts separately that cols 76-80 of the `RG` card are neither read nor diagnosed. Including §6.5
would fail the diff in both directions at once: `RG` at 1-2 has no §6.5 row (§6.5's is `1-4 | CNTL`),
and every §6.5 row — 5, 6, 7, 8, 9, 10-12, 13-14, 15, 16, 17-19, 20-75, 76-80 — would need an
out-of-scope entry naming a card this phase does not read. This is `test/asm-pseudo-ops.test.ts`'s mechanism applied to the one
artifact in the phase with a `[verified]` layout: a wrong column then fails a test that reads the
**research file**, not one that reads the code.

**The expansion rule is published in the test's own header, because §6's tables contain FIVE shapes
a naive slicer gets wrong.** Stated here so the wave-4 worker does not have to discover them. An
earlier draft published three, and the two it was missing are the two the parsers need most: the
condition groups §5.2 decomposes, and the rows whose whole content is *"same sub-layout as N-M"*.
Between them they account for **70 `SheetField`s across eleven research rows** — 22 from the eleven
condition spans, 48 from the four repeat-by-reference rows — and under the three-shape rule **47 of
those 70 had no matching research row at all** (11 of the 22 condition fields, 15 of the record-code
20, 5 of the control-field 10, 16 of the source-group 18), so the both-directions diff could not
have been satisfied by a correct `columns.ts`.

| Shape | Example row in `rpg-sources.md` §6 | Rule |
|---|---|---|
| **Multi-span** — one row naming several repeats **that are one field each** | §6.2 and §6.3's `12-13, 15-16, 18-19 \| Resulting Condition`. **Those two rows are the whole of it.** An earlier draft listed four more here and every one belonged to another shape: `12-17, …\| Record codes 2-6` and `49-53, …\| Control fields 2-6` are repeats of a *sub-layout*, not of a field (shape 5); the Format condition rows are shape 4; and `37-53, 54-70 \| Second / Third source` **is not a row in the file at all** — §6.2 carries two separate rows, `\| 37-53 \| Second source \| Same sub-layout as 20-36. \|` and `\| 54-70 \| Third source \| Same sub-layout as 20-36. \|` | Split on `,`, trim, and expect **one `SheetField` per span**, named `<base><n>` (`resultingCondition1` … `resultingCondition3`). The count must match the row's own trailing digit range where it states one. |
| **Comma-list of single columns** — one row naming several non-adjacent single columns | `11, 14, 17 \| Status` | Split on `,`; each becomes a one-column `SheetField` (`status1`, `status2`, `status3`), paired with the matching `12-13, 15-16, 18-19 \| Resulting Condition`. |
| **Aggregate that overlaps its own sub-layout** — a bold row followed by the rows that decompose it | `**20-36** \| **First field source** \| See sub-layout below`, then `20-22`, `23`, `24-26`, `27-29`, `30`, `31-33`, `34-36`; `**2-28** \| **Line specification**`; `**29-75** \| **Field specification**` | The aggregate row is matched by a `SheetField` whose `cols` equal it **and whose name ends `Group`**, and its children must **exactly tile** it with no gap and no overlap. The tiling assertion is the part that catches an off-by-one that both halves share. |
| **Condition group** — a one-, two- or three-span row whose Content names a **condition** | §6.2 `31-33 \| Cond.` and `34-36 \| Cond.`; §6.3 `40-42, 43-45, 46-48 \| Condition`; §6.4 `20-22 \| Line Output Condition`, `23-25, 26-28 \| Conditions 2, 3`, `38-40 \| Field Output Condition`, `41-43, 44-46 \| Conditions 2, 3` — **eleven spans in all** | Split on `,` if the row is a comma list, then expand **each span into TWO `SheetField`s** — `notN` (1 column) and `indicatorN` (2 columns) — which must **exactly tile** the span. That is `CONDITION_GROUP_IS_NOT_PLUS_TWO_DIGIT_INDICATOR` (§5.2, §15) expressed as a diff rule. **This is a shape of its own and NOT the aggregate rule**, because the aggregate rule needs a bold row plus decomposing child rows and a name ending `Group`, and `rpg-sources.md` carries every condition row as an ordinary non-bold row with no children. |
| **Repeat-by-reference** — a row whose Content is *"same sub-layout as N-M"* rather than a field | §6.1 `12-17, 18-23, 24-29, 30-35, 36-41 \| Record codes 2-6` (*"the same Position / Not / Z-D-C / Code sub-layout as 6-11"*, 5 × 4 = **20** fields) and `49-53, 54-58, 59-63, 64-68, 69-73 \| Control fields 2-6` (*"Same End(3)/Length(2) sub-layout"*, 5 × 2 = **10**); §6.2 `37-53 \| Second source` and `54-70 \| Third source` (*"Same sub-layout as 20-36"*, **9** each = **18** — five plain fields plus two condition groups of two, because a re-based child of shape 4 is still shape 4) | The row's `SheetField`s are the **referenced group's children re-based by the span offset**, named `<base><n>`, and they are matched against the **referenced rows** rather than against rows of their own; the tiling assertion runs on the re-based copies. The referenced rows are consumed once by the referent and once per repeat, and the diff counts that as satisfied rather than as a duplicate — which is the one place "exactly once" is stated as "once per declared repeat". |

Rows the diff must also account for and that are neither fields nor sub-layouts: `74-75 \| — \| Not
used`, `71-75`, `54-75` and the like are matched by an explicit `unused` `SheetField` with
`inScope: false`, so "not used" is a stated fact rather than a gap.

**And the shape of every row is assigned here, so the diff's coverage is checkable before the test
is written.** Everything not named below is a plain single-span field row.
**§6.1** — multi-span: none; comma-list: none; aggregate: none; condition group: none;
repeat-by-reference: `12-17, …` and `49-53, …`; `unused`: `74-75`.
**§6.2** — comma-list: `11, 14, 17`; multi-span: `12-13, 15-16, 18-19`; aggregate: `**20-36**`;
condition group: `31-33`, `34-36`; repeat-by-reference: `37-53`, `54-70`; `unused`: `71-75`.
**§6.3** — comma-list: `11, 14, 17`; multi-span: `12-13, 15-16, 18-19`; condition group:
`40-42, 43-45, 46-48`; `unused`: `54-75`.
**§6.4** — aggregate: `**2-28**`, `**29-75**`; condition group: `20-22`, `23-25, 26-28`, `38-40`,
`41-43, 44-46`; multi-span, comma-list, repeat-by-reference and `unused`: none. Column 1's `Format`
row is a single-span field.
**§6.5** — exempt in full (above).

**Keep the hand-built cards too.** `test/tier1-rpg-sheet-columns.test.ts` asserts every field of
every sheet **on hand-built 80-column spec cards**, each test naming its J24-0215-2 page — the
`asm-source.test.ts` treatment of `software.md` §1. The two tests do different jobs: the hand-built
cards test the **parser**, the diff tests the **table**, and neither catches the other's failure.

### 7.3 The vocabulary partition — the guard against RPG II

`test/rpg-vocabulary.test.ts` is a partition test in `asm-pseudo-ops.test.ts`'s mould, aimed at the
likeliest anachronism in the phase. **Every** operation, status, field-source, condition and
reserved name the parser accepts is either in `rpg-sources.md` §6's own tables or on a named
out-of-scope list with a reason — checked in **both directions**, so a name the code silently never
implements fails as loudly as a name it invents. `L0`-`L9`, `M1`-`M3`, `*IN`, a File Description
sheet and every other RPG II construct fail by construction, and §4.3's `[verified]` phase-name
reading is quoted in the test's header as the reason.

The same file asserts §2.4 item 5's **two-column provenance table** for the reserved vocabulary —
form-layout evidence and tape evidence, answered independently, because `SCF` and `RCT` legitimately
carry one of each and an earlier single-tier table put them in two tiers at once, which is not a
partition and could not have been written as a test. The rule the test enforces is the one §2.4
item 5 states: **a name may carry a layout tag and a tape tag, and no name is ever tagged
`[verified]`-for-the-1410 on evidence its tape column does not have.** An upgrade of a
J24-0215-2-only name fails.

`test/rpg-messages.test.ts` asserts the recovered PR-108 corpus **by construction rather than by
count**, and the distinction is load-bearing: an earlier draft of this plan said *"eleven"*, and
`rpg-sources.md` §4.4's code block holds **fourteen** (`10802`-`10806` = five, then
`TERMINATE RUN. * CARD MISSING BEFORE FORMAT SPECS`, `OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC`,
`NO OUTPUT SPECIFIED  CD`, `END INPUT SPECS`, `END DATA SPECS`, `END CALC SPECS`, `END OF RPG`,
`END OF RPG.BEGIN AUTOCODER`, `SEQUENCE ERROR INPUT FILE`), and the same section adds two
**generated-program** messages — `INPUT REC OUT OF SEQ`, `RECORD TYPE NOT FOUND` — which §11.2's two
stress decks assert verbatim. **Sixteen.** A test written to eleven would pick eleven of fourteen and
then, through the `provenance: 'recovered-1410'` guard, **reject a correctly recovered message as
invented** — the failure mode the guard exists to prevent, pointed the wrong way.

So the test **slices §4.4 out of `docs/research/rpg-sources.md`** the way
`rpg-columns-vs-research.test.ts` slices §6: the fourteen from the code block, the two named in the
prose beneath it, and the five reserved names of §4.5 (`PAGENO`, `SER`, `WORD`, `LC`, `OF`). It then
asserts that every message whose `provenance` is `recovered-1410` has one of those texts and a §4.4
byte-offset `cite`. The count cannot drift in either direction because no count is written down. It
is the only conformance signal against the real 1410 processor that exists, and it is free.

---

## 8. Storage layout and code generation

### 8.1 The layout rule that keeps `warnings` empty

`layout.ts` is a **pure function of the `Model` and of one measured number — the emitted length of
the constants-and-code run** (`layoutOf(model, codeLength)`, §6). **No assembler is ever
consulted**, which is what lets wave 2 cross-check the map against the addresses `assemble()`
actually assigned in wave 1 rather than borrowing them. It is a pure function of two arguments and
not of one, because `slack`, `indicatorFile`, `cardIn`, `printLine`, `printGroupMark`, `highWater`
and `coreSizeCode` are all functions of **where the code ends**, and nothing knows that until the
statements exist. §6 states the two-pass shape, its idempotence and the test that pins it; this
section states the order the two passes produce.

The whole deck, header and trailer included — and the order is forced, the reason being the loader:

```text
AUTOCODER RUN                      generate.ts owns these eight header cards and the END card
        JOB  <the job name>        — they belong to no CYCLE_ORDER section (§3.1, §6);
                                   the job name is a FIXED generator string (§8.2)
        CTL  <core-size code>      from layout.coreSizeCode, which needs pass 2
*       <three comment cards>
        LOAD                       what makes it a condensed deck
        ORG  00500                 the loader occupies storage below it (LOADER_CEILING = 00499)
        <constants, edit control words, K constants>      ─┐ ONE contiguous emitted run
        <every cycle section that carries code>            ─┘
        ORG  *+1                   THE SLACK POSITION — unreserved AND unlabelled
IND     DA   1X7                   the indicator file, bare-lo sub-entries — emits nothing
CDIN    DA   1X80                  the card image, bare-lo sub-entries    — emits nothing
        ORG  <ceil((cardIn + cardInLength) / 100) * 100>   THE FIRST HUNDREDS BOUNDARY
                                   AT OR ABOVE THE CARD IMAGE'S END — not above its START
 PLINE  DS   132                   emits nothing; the col-7 indent makes the label HIGH-order
PLGM    DC   @⧧@                   ONE emitted cell, unmarked, ABOVE the reserved areas
        END  START                 generate.ts's trailer card; the entry point
```

**The slack position takes no label**, and that is a rule rather than an omission: a `DS 1` there
would give `areas` a tidy anchor and simultaneously **reserve** the position, which is precisely
what makes `pack.ts` warn. `CYCLE_SECTION_LABEL.areas` is therefore `IND` (§6.2).

**Why the slack position exists, in one paragraph.** The shipped condensed loader's
`D 00100 00?!0 Δ` at 00330 moves the terminating position too, so **every loaded record leaves a
group-mark-with-word-mark at `loadAddress + count`**. In an ascending contiguous deck each is
overwritten by the next record, so the marks that **survive** sit at the end of each maximal
contiguous run of emitted cells. `pack.ts` warns when a surviving mark lands inside another
record's extent **or inside any DS / DA reserved extent**. With the layout above there are exactly
two runs — the constants-and-code block and `PLGM` — and their tails land on the slack position and
on untouched core above `PLGM`. **Neither is inside a reserved area, so `warnings` is empty.**
Measured on the pre-re-cut arrival draft preserved in §10.4's historical listing: the code ends at
02533, the slack is 02534, `IND` starts at 02535, `CDIN` 02542 (running to 02621), `PLINE` 02700,
and `PLGM` is 02832. Arrival `warnings.length` was zero; BUILD-LOG-5's Re-cut 3 is current.

**Four** consequences, each of which is a rule the generator obeys and a test asserts — and the
fourth is the one no assembler gate can reach:

1. **Every reserved area sits above the code and below the print-area group mark — with exactly one
   exception above them, and the constant is named for it.** A reserved area placed between two
   emitted runs plants a GM-WM inside itself, which is the whole rule; but `PLGM` **is** an emitted
   cell and it **does** sit above `IND`, `CDIN` and `PLINE`, because the group mark must land at
   `PLINE+132` and nothing may be reserved above it. So the constant is
   `RESERVED_AREAS_SIT_ABOVE_THE_CODE_AND_BELOW_THE_PRINT_GROUP_MARK`, §15 — not "above every
   emitted cell", which is false as written and which a test written to the literal wording would
   fail on the correct layout. `PLGM`'s own tail lands in untouched core, which is why the exception
   is safe; the doc comment at the point of use says exactly that.
2. **The card image is a `DA` with bare-`lo` sub-entries, and it emits nothing.** A `hi,lo`
   sub-entry emits a marked blank at each field's high-order (`DA_EMITS_ONLY_ITS_MARKED_POSITIONS`,
   Phase 3 §15), which for six scattered card fields would produce **six one-cell runs and six
   surviving GM-WMs planted inside the card area** — and a spurious word mark inside `CDIN` survives
   every move-mode read and truncates every later `MLC`. The bare-`lo` form defines a subfield with
   **no mark** at exactly the field-end position the Data sheet names, so it gives every card field
   a symbol, costs no emission and plants no mark.
   **This retires `cycle-first`'s R7 outright**, and it is why the read is move mode without needing
   the card area to carry word marks at all. **The sub-entry names are `C` plus the three-digit
   record position** — `C001`, `C003`, `C006`, `C014`, `C019`, `C027` for the demo — which is
   derived from the Input sheet's Field End and the Data sheet's Field End columns rather than
   invented, carries digits and so gets the `Znnn` family's free defence, and above all leaves a
   Data-sheet field free to keep **its own name** (§8.4).
3. **The print area is on a hundreds boundary.** `CS` clears data **and word marks** right-to-left
   down to the nearest hundreds position (`table.ts` op `/`, A22-0526-3 p.23, `[verified]`), so
   `CS PLINE+131` then `CS PLINE+99` clears exactly 132 positions and leaves the group mark at
   `PLINE+132` alone. `PRINT_AREA_IS_HUNDREDS_ALIGNED`, §15; the fallback is `MLCA BLANKS,PLINE+131`
   from a 132-blank constant, which costs three more condensed cards and deletes the alignment
   constraint from `layout.ts`.

4. **The reserved areas are PAIRWISE DISJOINT, each is long enough for what it holds, and the print
   area starts at or above the card image's END.** In arithmetic a reader can check:
   `printLine = ceil((cardIn + cardInLength) / 100) * 100`, and the extents
   `[code, slack, indicatorFile, cardIn, printLine, printGroupMark]` are ascending and non-
   overlapping, with `indicatorFile` at least as long as the deck's indicator count, `cardIn`
   exactly 80, `printLine` exactly 132 and `printGroupMark` exactly 1.
   `RESERVED_AREAS_ARE_PAIRWISE_DISJOINT_AND_THE_PRINT_AREA_CLEARS_THE_CARD_IMAGE`, §15.

   **This is the one rule in §8.1 that NO SHIPPED GATE CAN CATCH, and it is stated because an
   earlier draft of §10.4 broke it.** That draft rounded the boundary off `CDIN`'s **start**
   (02542) rather than its **end**, and punched `ORG 02600` while `CDIN DA 1X80` at 02542 runs to
   02621 — so `PLINE` overlapped the card image by 22 positions and every `R1 0,CDIN` wrote card
   columns 59-80 into print positions 001-022. `assemble()` returned `ok: true`, **zero flagged
   lines and zero warnings**, because `DA` and `DS` emit nothing: `pack.ts`'s tail warning only
   sees emitted runs, §11.3's closed loop compares only emitted addresses, and §11.4's snapshot is
   taken after each block's `CS` pair has already wiped the residue. The demo's page survived by
   luck — its card uses columns 1-27 and every print block `CS`-clears first. The correct boundary
   is `ORG 02700`: `PLINE` 02700, `PLGM` 02832, high-water 02833, core-size code 1, 39 condensed
   records unchanged (re-run 2026-08-31, §10.4).

   **So the invariant is a wave-2 test rather than a paragraph.** `test/rpg-layout.test.ts` asserts
   it over the `Layout` value itself — every pair of extents disjoint, the sequence ascending, each
   extent at least its content length, and `printLine` equal to the ceiling expression above — for
   the hand-built model AND for a generated `Layout` whose `cardIn` is deliberately pushed across a
   hundreds boundary, which is the case a fixed demo can never reach. Nothing downstream can catch
   it: that is why it is asserted on the map and not on the page.

**The print-area group mark is set at run time.** `PLGM DC @⧧@` is emitted **unmarked** — a `DCW`
with a group mark in the high-order position flags `F` and is emitted unmarked anyway
(`OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK`, `emit.ts`'s `constantCells`), so the generator writes a
`DC` and sets the mark with `SW PLGM` in the initialise section. That is `PHASE-3-NOTES.md` §2.4's
own named remedy, used exactly as written, and it assembles with **no flag**.

`layout.ts` computes the high-water mark on **pass 2**, from the model and the measured code
length, and picks the `CTL` core-size code from it (1 = 10K … 5 = 80K, `software.md` §6,
`[verified]`); `generate.ts` then punches that code into the `CTL` header card, which is why the
header belongs to the composer and not to a cycle section. `assemble()` independently flags any
assigned address above that size, so a program that outgrows the machine fails a gate rather than a
run. The demo's high-water is **02833** against 10K, measured (§10.4).

### 8.2 What each spec construct emits

| Construct | Generated Autocoder | Note |
|---|---|---|
| a Data-sheet field | `<name> DCW #n` for alphameric, `DCW @00…0@` for numeric — **under the sheet's OWN name**, never prefixed (§8.4) | the label resolves **low-order**, which is what right-to-left addressing wants. **THE DETERMINANT, because the rule has two arms and the sheets carry no type column:** a Data-sheet field is **numeric** iff any of its sources names `N` in Data col 23, **or** a Calculation line names it in cols 2-7, **or** it is one of the reserved counters `PAGENO` / `SER` / `RCT`; otherwise it is **alphameric**. Col 23's `N` is a **zone-strip on the source operation**, not a field type (§5.2) — it is used as the determinant because it is the only signal the sheets carry, and that is a ruling rather than a transcription. For the demo: `QTY` and `AMT` numeric (col 23 `N`), `PAGENO` numeric (reserved counter), `COMM`/`DTOT`/`DCOM`/`RTOT`/`RCOM`/`GTOT`/`GCOM` numeric (Calculation results), **`DEPT` and `PART` alphameric** — `DCW #3` and `DCW #8`, which §10.4 emits. The two arms emit **different bytes** (blanks versus zeros) into the same addresses, and §11.1 gate 1 deep-equals object records, so a generator taking the wrong arm fails a gate rather than drifting. The check is an emission assertion in `test/rpg-generate.test.ts` naming both arms, **not** a §11.5 malformed deck: a wrong arm raises no diagnostic, and §11.5's corpus is one deck per named diagnostic |
| a Calculation result field | `<name> DCW @00…0@` — the sheet's own name again | same namespace as a Data field, and §6.2/§6.3 make the two disjoint from every generated family |
| a Calculation **literal** factor (cols 20-25 or 30-35 holding a literal, not a name) | `Knnn DCW @<literal>@` | it is a constant like any other, so it joins the **`Knnn`** family and gets the digit-bearing free defence. The demo's `00005` commission rate is `K002` — an earlier draft called it `RATE`, a demo-specific name sitting in a *published reserved set*, which is exactly the transcription shape `card-list.rpg` exists to catch |
| field extraction from the card | `MLC <Cnnn>,<field>` | terminates on the **destination's** word mark; the card area has none. `Cnnn` is the card sub-entry (§8.1 item 2) |
| reset a marked field (a `B` entry's blank-after, `0+`) | `MLCB ZEROS,<field>` | **`MLCB`, not `MLCA`** — the destination's own word mark governs the length, so one shared `ZEROS` constant serves every accumulator. `MLCA` would move the *source's* length and overrun a shorter field. **`ZEROS` is therefore cut to the length of the LONGEST field the deck resets**, because `MLCB` reads A until B's mark and a short source would read whatever sits below it: for the demo that is the 14-position `COMM`, so `ZEROS` is 14 and not the 12 an earlier draft carried |
| clear an **unmarked** area (the indicator file) | `MLCA <zeros>,<area>+n-1` | the mirror rule: into an unmarked area the **source** must terminate the move |
| set / clear an indicator | `MLCS ONE,<ind>` / `MLCS ZERO,<ind>` | one character, `d = 3` |
| test a condition | `BCE <skip>,<ind>,1` (or `,0` negated) | one instruction per condition, falling through when all hold |
| a Calculation `+` or `-` | `A` / `S` | into the result field's own word mark |
| a Calculation `X` multiply | `ZA <factor1>,<work>-(d2+1)` then `M <factor2>,<work>` | **written out below — the setup is not obvious and the plan's first draft got it wrong** |
| a Calculation `/` divide | `D <divisor>,<work>` with the dividend pre-placed | Autocoder `M` is machine `@` and Autocoder `D` is machine `%` — `opcodes.md` §1.6's collision, and the generator writes the **mnemonic** |
| a Calculation `C` compare | `C <f2>,<f1>` then `BE`/`BH`/`BL`/`BU` | statuses `E`/`H`/`L`/`U`, no special feature (§2.4 item 1) |
| half adjust at position *k* | `A FIVE,<result>-(k-1)` | `HALF_ADJUST_IS_ADD_FIVE_AT_THE_NAMED_POSITION`, §15. **Cols 50-51 name the position the five is ADDED AT**, so for a plain rounding half-adjust that position is the **highest dropped** one and cols 50-51 and 52-53 carry the same number. Worked through below |
| position adjust *k* | address the result at `<result>-k` thereafter | drops position *k* and everything right of it (§6.3). **A later card referring to the field addresses `<field>-k` too, and the factor length it declares in cols 26-28 / 36-38 is the field's UNADJUSTED length** — those columns are the sheet's *declared* length, not a re-derivation of the surviving width, which is why the demo's `ADCOM` card declares factor-2 `COMM` as `014` and §10.4 nonetheless emits `A COMM-2,DCOM`. The model remembers the adjust; the card states the field. Without that sentence a wave-5 generator reading the card literally emits `A COMM,DCOM` and §11.1 gate 1 fails |
| a `K` constant on an output line | `MLCA <Knn>,PLINE+<end-1>` | **`MLCA`, never bare `MLC`** — see the lint below |
| a field with `Z` zero-suppress | `MCS <field>,PLINE+<end-1>` | machine op `Z` |
| a field with an edit control word | `MLCWA <WORDnn>,PLINE+<end-1>` then `MCE <field>,PLINE+<end-1>` | `MLCWA` carries the control word **and its word mark**; `MCE` removes that mark on scan 1 |
| a **runtime-message line** — the `notFound` and `sequence` sections' print blocks | `CS PLINE+131` / `CS PLINE+99` / `MLCA <Knnn>,PLINE+<end-1>` / `W1 PLINE` / `BA1 *+1` / `CC1 /` / `BA1 *+1` | **`output.ts`'s second, explicitly-scoped responsibility** — a print block that comes from **no Format sheet**: its only field is a `Knnn` message constant, its message text is one of the two `[verified]` generated-program strings (§2.4 item 6), and it carries **no overflow latch** because it is not part of the report body (§6.2). `K090 DCW @RECORD TYPE NOT FOUND@` in §10.4 is one |
| the print itself | `W1 PLINE` then `BA1 *+1` | `M %20 <PLINE> W` — the mnemonic supplies channel, device, mode and the `W` |
| the overflow latch **after a detail or total print only** | `BCV1 <latch>` / `B <done>` / `<latch> MLCS ONE,OF` / `<done>` — between the print's `BA1 *+1` and the `CC1` | **not emitted after a heading line or a runtime-message line** (§2.1, §6.2): a heading block skips to channel 1 itself, so sensing overflow across it is meaningless. The demo's nine `W1 PLINE`s carry exactly four latches, and §10.4 trap 4 asserts the five absences as well as the four presences |
| carriage motion | `CC1 <d>` then `BA1 *+1` | d **resolved from `CARRIAGE_D_TABLE`, never typed**. The table is four quadrants — immediate / after-print × skip / space — and `carriageStmt`'s signature already covers all four. Enumerated only because a reader checking §5.2's Format columns must be able to find the d for **Space Before**: immediate space 1/2/3 = `J` `K` `L`; space-after-print 1/2/3 = `/` `S` `T`; immediate skip to channels 1-12 = `1`-`9` then `0` `#` `@`; skip-after-print to channels 1-12 = `A`-`I` then `?` `.` `⌑`. **Neither skip row is a contiguous range**, and `J`/`K`/`L` are not optional — Format cols 11-12 Space Before resolve to them |
| the read | `R1 0,CDIN` then `BEF1 <eof>` then `BA1 *+1` | `M %10 <CDIN> R` — pocket 0, **the family's baked `d`** (§8.3) |
| the deck's header and trailer | `AUTOCODER RUN` · `JOB <name>` · `CTL <coreSizeCode>` · three comment cards · `LOAD` · `ORG 00500` · … · `END START` | **`generate.ts`'s, not any section's** (§3.1, §6, §8.1). The `CTL` code comes from `layout.coreSizeCode` and therefore from pass 2; `LOAD` is what makes it a condensed deck; `END START` is the entry point §10.4 reports as 00808. **Two of the eight have no `Model` input and their derivation is stated here rather than discovered in wave 5**: nothing in the four sheets carries a job name (the `RG` card's body is not read, §2.4 item 3), so the `JOB` card is the **fixed generator string `RPG GENERATED PROGRAM`**, and the three comment cards are **generated boilerplate** naming the spec deck's file name, the generation date and the target configuration. Both are on §8.4's reserved-text list. Neither affects `ObjectRecord[]`, so §11.1 gate 1 is untouched by them: `pack.ts` derives `sequence` from the record ordinal and never from source text, and `ident` is unset on both decks. **If wave 0's read of the `RG` card settles a job-name field, the fixed string becomes that field** — one line in `generate.ts`, and the §15 row that would move is `RG_CARD_BODY_IS_NOT_READ` |

**The multiply, written out, because the plan's first draft emitted a sequence that would have
printed a zero commission on every line and the frozen page golden would have enshrined it.**
`opcodes.md` §2 row 014 (A22-0526-3 pp.19-20, `[verified]`), and `src/core/muldiv.ts` states the
same shape: for `M A,B`, **A is the multiplicand at its units position**, **B is the product field
at its units position with the multiplier image pre-placed in the HIGH-ORDER positions of B**, and
`len(B) = digits(multiplicand) + digits(multiplier) + 1`. So the B field is
`[ multiplier image | product area ]`. The generator therefore:

1. allocates the result field at **`digits(multiplicand) + digits(multiplier) + 1`** positions —
   which also satisfies §6.3's own `[verified]` sheet rule for cols 8-10, *"for multiply:
   ≥ (digits in multiplier + digits in multiplicand − position-adjust)"* — for the demo that
   minimum is 8 + 5 − 2 = **11** and the machine's rule gives **14**, so there are **three**
   positions to spare, because the machine's rule ignores the position-adjust — and `model.ts`
   **diagnoses a declared length below the §6.3 minimum** rather than silently widening it
   (§11.5 carries the deck);
2. places the **multiplier image at the field's high-order end** with
   `ZA <multiplier>,<result>-(digits(multiplicand) + 1)` — equivalently
   `<result>-(len(B) - digits(multiplier))`, which is the same number read straight off the B-field
   rule and is the form the table row above states as `<work>-(d2+1)`. `ZA` stores A right-justified
   into B and zero-fills high-order B up to and including B's word mark (`opcodes.md` §2 row 072),
   so addressing it that many positions in from the units end lands the image exactly on the
   high-order run. (An earlier draft of this step said `-(digits(multiplicand))`, one short, while
   the table row said `-(d2+1)`. The table row was right; the two now say one thing, and §10.4's
   assembled `ZA AMT,COMM-6` → `& 00620 00628` against `COMM` at 00634 is the arithmetic;)
3. issues `M <multiplicand>,<result>`. The first scan zeros the product positions right of the
   multiplier, so no pre-zeroing is emitted;
4. half-adjusts with `A FIVE,<result>-(k-1)` and thereafter addresses the truncated field at
   `<result>-p` for a position-adjust of *p*.

For the demo's `ACOMM` — factor 1 `AMT` 8 digits, factor 2 the literal `00005` 5 digits — that is a
**14-position** field, and the sequence is `ZA AMT,COMM-6` then `M K002,COMM`. The earlier draft's
`ZA AMT,COMM` put the multiplier image in the *product* area and left the high-order positions
the multiply reads as zeros. §10.4's exhibit is the corrected sequence, assembled.

**And the half adjust is worked through the same way, because the two adjust columns interact and no
source covers the interaction.** §6.3 gives cols 50-51 as *"position number to be half-adjusted in
the result"* and cols 52-53 as *"highest-order position to be dropped"* — position numbers counted
from the **units** end, position 1 being the units. §8.2's rule adds the five **at** the position
cols 50-51 name (`A FIVE,<result>-(k-1)`), and §8.2's position-adjust rule then drops position *p*
and everything right of it. So rounding is correct **iff `k = p`**: the five goes into the highest
position that is about to be dropped and carries left into the first surviving one. For `ACOMM`,
`p = 02`, so `k = 02` and the emission is `A FIVE,COMM-1` — position 2 — followed thereafter by
`COMM-2`. **`k = 03` would put the five on `COMM-2`, which is position 3 and SURVIVES the drop**:
every commission on the page would be five cents high, in a page golden wave 1 freezes. An earlier
draft of §10.3 punched `03`. `k ≠ p` is legal on the sheet and is not diagnosed — it means "round at
a position other than the one you are dropping to", which a report could legitimately want — so this
is a property of the demo's cards, not a rule the generator enforces, and §15's
`HALF_ADJUST_IS_ADD_FIVE_AT_THE_NAMED_POSITION` row carries the interaction as the `[likely]` part.

**The word-mark lint, and it is a real hazard.** `MLCWA` plants an edit word's word mark in the
print area; a later bare `MLC` (which terminates on the first word mark in **either** field) would
stop there and truncate. So **the generator emits only `MLCA` and `MLCWA` into print-area symbols**,
and `test/rpg-output.test.ts` carries a lint that says so over the generated source of every demo
deck. The two `CS` instructions clear data *and* marks at the top of every line, so the area is
clean each cycle.

### 8.3 The I/O choke point — `emitio.ts`, and what it is for now

The Autocoder I/O statement form is **settled and shipped** (`DECISIONS.md` 2026-08-31, commit
`303cb64`). The mnemonic supplies the channel — **infixed** for `R`/`P`/`W`/`RCP`/`WCP`
(`R1W`, `P2WO`), **suffixed** for `WM` alone (`WM1`) — the device, the load/move mode, the overlap
and the d; the programmer writes the **stacker pocket** and the **B-address**, or a bare B-address
for the printer and the console. Read pockets are `0 1 2 9`; punch pockets `0 4 8`.

So the choke point is **not** a hedge between two worlds any more. It is a **lint against drift**,
and it keeps its shape for three reasons that survive the ruling: an I/O statement's spelling should
be derived from the machine tables rather than typed; the `BA1 *+1` interlock release must travel
with the operation that needs it; and a generator that spells `%10` by hand in `cycle.ts` has
started a second, unreviewed copy of `mnemonics.ts`.

```ts
// src/rpg/emitio.ts — THE ONLY module under src/rpg/** that may import X1_CHANNEL, X2_DEVICE,
// ML_D_TABLE or CARRIAGE_D_TABLE.
export type IoUnit = 'reader' | 'printer';           // 'punch' is the named §2.2 insertion point
export interface IoRequest {
  readonly unit: IoUnit;
  readonly direction: 'read' | 'write';
  readonly mode: 'move' | 'load';
  readonly area: string;
  readonly pocket?: '0' | '1' | '2' | '9';           // readers only; C28-0309-1 p.23
}
/** Returns the operation AND its `BA1 *+1` interlock release, because separating them is how you
 *  hang a channel — every I/O op in demos/hello-dad.asm carries one. */
export function ioStmt(req: IoRequest): readonly Stmt[];
/** d resolved from CARRIAGE_D_TABLE, never typed. NOT an I/O statement and never was in dispute. */
export function carriageStmt(m: { kind: 'skip'|'space'; when: 'immediate'|'afterPrint'; n: number }): readonly Stmt[];
/** BCV1 + the latch, emitted immediately after the print's release and BEFORE any motion (§6.2). */
export function senseOverflowStmts(indicator: string, done: string): readonly Stmt[];
/** BEF1 — a J-family status branch, not an I/O statement. Housed here for locality only. */
export function branchOnEndOfFile(to: string): Stmt;
```

**REQUIRED GRAFT, taken from `report-first` and demanded by the buildability judge:** the module's
header states explicitly **which of its exports the I/O form governs and which it does not** —
`ioStmt` is the only one; `carriageStmt`, `senseOverflowStmts` and `branchOnEndOfFile` emit `CC1`,
`BCV1` and `BEF1`, which are carriage and `J`-family branches and were never in dispute. A reviewer
can check that claim in one read.

**RULING, where the panel disagreed on enforcement.** The testability judge required
`sheet-first`'s string grep **in addition to** `cycle-first`'s import test; the buildability judge
demonstrated that a naive grep will not hold, because the d-characters in play (`$`, `W`, `/`, `S`)
and the channel digits (`1`, `2`) are ubiquitous in ordinary source — and `W` is also a Format
column-1 code and `@` opens every Autocoder alphameric literal. **Both are right, so the
enforcement is three checks and each one names its own gap:**

1. **The import test** (`test/rpg-emitio.test.ts`, the `asm-is-dom-free.test.ts` pattern), **in two
   halves, because only one of the four tables has a consumer.** The **negative** half is
   unconditional and is the real check: *no module under `src/rpg/** ` other than `emitio.ts`
   imports `X1_CHANNEL`, `X2_DEVICE`, `ML_D_TABLE` or `CARRIAGE_D_TABLE`.* The **positive** half is
   asserted only for the one table `emitio.ts` actually consumes, **`CARRIAGE_D_TABLE`**, which
   `carriageStmt` resolves its d from. `X1_CHANNEL` (channel-plus-overlap glyph), `X2_DEVICE` (unit
   glyph) and `ML_D_TABLE` (the M/L **I/O** d-table at `dmods.ts:368` — *not* the Move d-table that
   supplies `MLCA`/`MLCB`/`MLCS`/`MLCWA`) have **no consumer under the 2026-08-31 I/O ruling**:
   `ioStmt` writes `R1 0,CDIN` and `W1 PLINE`, and the mnemonic supplies channel, device, mode and
   d. Requiring `emitio.ts` to import them would require a **dead import**, which
   `npm run typecheck` fails outright — `tsconfig.json` sets `noUnusedLocals: true`. So the three
   are named as **forbidden everywhere** rather than as required here, which is the same sentence
   that demoted this whole choke point to a lint. Gap: it does not stop a literal.
2. **The string-literal lint**, whose target set is **computed, not typed**: the test extracts every
   quoted string literal from every file under `src/rpg/**` except `emitio.ts`, and fails on any
   that is (a) a member of the shipped resolver's I/O mnemonic set **of length ≥ 2** — taken from
   `src/asm/mnemonics.ts`'s own rows with `io !== undefined`, so it tracks the assembler rather than
   a transcription — or (b) the glyph `%` or `⌑`. Stated gaps, and they are why check 3 exists: the
   bare one-character stems `R`, `P`, `W` are excluded because `W` is a Format column-1 code, and
   `@` and `*` are excluded because they are the literal delimiter and the asterisk operand.
   **There is no by-name exclusion, and the plan owes the lint that.** The set is 47 names long
   (§6.1 lists it as enumerated on 2026-08-31) and `P1` is in it, so **no generated label may be
   `P1`** — which is why the `1P` indicator is labelled `FSTPG` (§6.1) rather than the lint being
   weakened to let `P1` through. Every label this plan names was checked against the set in that
   same run; `P1` was the only collision, and it is gone. **When the reserved-name set changes, the
   enumeration is re-run** — it is four lines against `ALL_MNEMONICS`, and the check belongs in
   `test/rpg-emitio.test.ts` beside the lint it protects.
3. **The runtime subset check**, which closes the gap the other two leave: `generate()` the demo and
   the probe, slice columns 16-20 of every emitted card, resolve each through the shipped
   `resolve()`, and assert that the set of distinct op fields that resolve to an I/O or
   d-only-operand row is a **subset of what `emitio.ts` can produce** — which is enumerable from its
   own tables. No other spelling can have leaked into a generated deck without failing this.

**And one design ruling that de-risks the phase against a decision Zarathustrum has not made.** The generated
read is `R1 0,CDIN` and takes the **family's baked `d`** (`R`), not an explicit `$`. It can, because
§8.1's layout guarantees no group-mark-with-word-mark inside `CDIN` for a `d = R` read to stop on.
The consequence is that **nothing in Phase 5 depends on
`EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS`**, which is `[unverified]`, is open for Zarathustrum
(`STATUS.md` 2026-08-31 item b), and is the one exception the I/O flip carried.
`GENERATED_READ_TAKES_THE_BAKED_D`, §15; the fallback is `R1 0,CDIN,$`, one `pocket`-adjacent field
in `IoRequest` and nothing else — and it becomes necessary only if the layout rule is ever relaxed.

### 8.4 Generated labels cannot collide, and it is derived rather than defended

`rpg-sources.md` §6.2 is `[verified]`: a **Data-sheet** field name is **at most six characters,
alphabetic, with no digits and no specials**, and §6.3 cols 2-7 names the same namespace for
Calculation results. **That one sentence is the whole defence, and the design is arranged so it
carries all the weight** — every label the generator invents either contains a digit or is on a
published list, and **no user symbol is ever renamed.**

**The six generated families, each with its derivation:**

| Family | Shape | Where the digits come from | Example |
|---|---|---|---|
| `Znnn` | cycle points and branch targets | a running counter | `Z010`, `Z042` |
| `Knnn` | **every literal in the deck** — a Format `K` entry's constant, the generator's own numeric constants, **a Calculation literal factor from cols 20-25 or 30-35**, and **a runtime-message constant, which comes from no sheet at all** (`K090 DCW @RECORD TYPE NOT FOUND@`; §6.2, §8.2's runtime-message row) — emitted in constants-block order. **One `Knnn` per DISTINCT literal text** — two Format `K` entries carrying the same characters address the same constant, which is what lets `HB1`/`HB2` repeat `HA1`/`HA2`'s headings without doubling the constants block, and what §10.4's frozen target already does | the emission counter | `K001` the page increment, `K002` the demo's `00005` commission rate, `K010`…`K090` the Format constants |
| `RCnn` | the resulting-condition indicators | **the two-digit condition itself**, Input cols 42-43 / Data 12-13, 15-16, 18-19 / Calculation 12-13, 15-16, 18-19 | `RC01` |
| `Cnnn` | the `CDIN` card sub-entries, one per card field the deck names | **the record position itself** — Input cols 6-8 / 44-46 and Data cols 24-26, which are three digits by construction (§15 `RECORD_POSITION_IS_THREE_DIGITS`) | `C001`, `C003`, `C006`, `C014`, `C019`, `C027` |
| `CN1`/`CN2`/`CO1`/`CO2` … `CNn`/`COn` | the control-field save areas, this card and the previous one | the control-field number, 1-6 | `CN1`, `CO2` |
| `WORDnn` | the sheet's own edit-control-word name | §6.4 col 1, `[verified]` — **this one is a USER-written name that carries digits**, which is why it is on the published list below rather than relying on the digit rule | `WORD01` |

**A Data- or Calculation-sheet field keeps its own name, unprefixed.** `PART`, `QTY`, `AMT`, `DEPT`
and `COMM` in §10.4 are the demo's own sheet names, and the card sub-entries they are extracted
from are `C014`, `C019`, `C027`, `C006` — not the other way round. An earlier draft did it
backwards: it gave the sub-entries the sheet names (`PART`, `QTY`, `AMT`) and renamed the user's
fields `WPART`, `WQTY`, `WAMT`. That is three defects in one. It **multiply-defines** every name
the two sets share, which the shipped assembler flags `M` on the second definition, so `ok` is
false and criteria 2 and 3 fail. It **silently renames a user symbol** — the person wrote `AMT` on
a Data sheet and it is not in the listing. And the prefix cannot be
stated as a safe rule: `W` + `ORD` is `WORD`, one of §4.5's five `[verified]` reserved names, and
`W` + a legal six-character Data name is a **seven**-character label — which the shipped assembler
does accept (`SOURCE_FIELDS.label` is columns 6-15, and a seven-character label assembles clean;
verified 2026-08-31), so the objection is not width but that the family has no collision rule at
all and quietly leaves the six-character namespace the sheets are cut for. The `Cnnn` family removes all three at once, and it is **derived from
the sheet** — the record position is the one thing a card field always has.

**A label containing a digit cannot be a *Data- or Calculation-sheet* field name**, which is what
gives `Znnn`, `Knnn`, `RCnn`, `Cnnn` and `CNn`/`COn` a free defence — no escaping, prefixing or reservation
list, and **no malformed deck is needed for a collision that cannot be written**. `F1`-`F6` are covered by the same rule, and `OF` and `LC` by §4.5's reserved set. The sentence has
to carry that restriction, because it is **not** true of user names in general: Format cols 29-34
require a `W` entry's field name to be `WORDxx`, xx = 00-99 (§6.4 col 1, `[verified]`), which is a
user-written name with digits in it. `WORDnn` is on the published list for exactly that reason, so
the conclusion survives; only the premise needed narrowing.

**The published list is the short digit-free names, and only those.** They are the section heads
and the areas: `START`, `RDCARD`, `IDENT`, `SEQCHK`, `EXTRCT`, `CTLBRK`, `TOTCAL`, `TOTOUT`,
`LVLRST`, `DTLCAL`, `HDGOUT`, `DTLOUT`, `LASTCD`, `NOTFND`, `EOJ`, `IND`, `CDIN`, `PLINE`, `PLGM`,
`PRIME`, `FSTPG`, `ZEROS`, `IZERO`, `ONE`, `ZERO`, `FIVE`, plus `WORDnn`. **`RATE` is gone from it**
— it was the demo's own commission-rate name, and a *published reserved set* holding a name from
one report is the transcription shape `demos/card-list.rpg` exists to catch. The list is
**published in the diagnostics block** and a user field colliding with one of them is a named
diagnostic; §11.5 carries the deck that fires it (a Data field named `EOJ`).
`GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET`, §15; the fallback puts every internal label on the
`Z`+digits scheme and moves the readable names into the comment field, which costs readability and
nothing else. **Every name on the list is also checked against §6.1's 47-name I/O mnemonic set**,
and `test/rpg-emitio.test.ts` re-runs that check (§8.3).

---

## 9. The specification listing and the 1403 rendering

**RULING, where the panel disagreed.** `cycle-first` scoped the RPG listing out (diagnostics as a
plain block, on the ground that the historically load-bearing printed artifact is the *assembler*
listing, which Phase 3 already ships with a golden); `report-first` cut its golden; the
period-fidelity judge **required** it as a graft. **The listing is in, with a constructed golden** —
because the processor's own printout is a period artifact, Phase 3 already ships the renderer, and
a golden is the only thing that pins the exact recovered strings in their exact places. The cost is
~120 lines and one `--golden` line at the CLI.

`listing.ts` builds `RpgListingLine[]`: a heading per page; one line per spec card in deck order
carrying **SEQNO / SHEET / the eighty columns as punched / FLAG**; the recovered `END INPUT SPECS`,
`END DATA SPECS` and `END CALC SPECS` separators at their section boundaries; a diagnostic line
under any card that raised one, with its message and its provenance; and the recovered
`END OF RPG.BEGIN AUTOCODER` trailer.

It renders through the **already-tested** `renderGreenBar` from
`src/core/devices/printer1403.ts` — the same function that renders the demo page and the Phase-3
listing — by formatting each line into 132 positions, returning `PrintLine[]`, and handing that
over. That buys page breaks, trailing-blank trimming, form feeds and the header line for free and
leaves exactly one page renderer in the repo. Like `listing1403.ts`, it applies the chain itself
(`bcdOfGlyph` → `chainGlyph`, default `'A'`), because `renderGreenBar` renders `PrintLine.text`
verbatim and `chainGlyph` lives in the *device* write path.

Column stops, within the 132 print positions of a 1403 Model 2, **in one exported array in one
place**:

```text
spec line        SEQNO 1-5 · SHEET 7-12 · PGCARD 14-18 · CARD IMAGE 21-100 · FLAG 103
diagnostic line  1-132, its own full-width line beneath the card it belongs to
```

**The diagnostic gets its own line, and the reason is arithmetic.** A `MESSAGE` column at 106-132 is
**27 print positions**, and the recovered strings §7.3 asserts verbatim are longer than that:
`TERMINATE RUN. * CARD MISSING BEFORE FORMAT SPECS` is **49** characters,
`OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC` is 45, `10802 EOJ-NO RG CONTROL CARD` is 28. Only
`END OF RPG.BEGIN AUTOCODER` (26) would have fitted. A golden that truncated them at 27 would
disagree with `rpg-messages.test.ts` about the same artifact — two tests, one page, opposite claims
— and would make the phase's one conformance signal unreadable on the paper. §4 already declares a
`kind: 'diagnostic'` listing line; it spans **positions 1-132** and carries the message, its
provenance and its message number in full. The longest string the listing must hold is 49
characters, and `test/rpg-listing.test.ts` asserts that no recovered text exceeds the line width.

CARD IMAGE is 80 wide because a spec card is; everything fits inside 132. No 1410 RPG listing
survives, so the stops are ours — `RPG_LISTING_COLUMN_STOPS`, §15 — and only our own constructed
golden depends on them, regenerable in one command.

**The glyphs the chain cannot print are stated rather than hidden, and they are DERIVED from
`CHAIN_SLUGS` rather than restated.** The twelve codes neither 48-character chain can print are the
`a: ''` rows of `src/core/devices/printer1403.ts` — left bracket, less than, group mark, right
bracket, semicolon, delta, word separator, backslash, segment mark, colon, greater than, tape mark,
i.e. `[ < ⧧ ] ; Δ ⌒ \ ⧻ : > √` (`charset.md` §5, `[verified]`). Two more print as **substitutes**,
and this is where an earlier draft of this paragraph was wrong: the substitute blank `ƀ` prints the
record-mark slug `‡`, **`!` prints `-`, and `?` prints `&` on chain A** — `charset.md` §5 verbatim,
and `printer1403.ts:123` in the shipped code: `{ octal: '72', name: 'plus zero', a: '&', h: '+' }`.
So a spec card holding `?` or `!` in Calculation column 39 — the `0+` and `0-` punches (§5.2) —
prints **`&` and `-`** in the CARD IMAGE column, not `?` and `-`, and the CARD IMAGE column
therefore does **not** round-trip the 12-0 and 11-0 punches. The listing test says so by name.
(The same substitution is why §10.4's own assembled listing shows `ZA` with an op character of `&`:
`resolve('ZA').opChar` is `?`, and the 1403 prints `?` as `&`. That is the renderer being correct,
not the exhibit being wrong.)

---

## 10. The demo

### 10.1 The job, and why it is this job

**`demos/sales-summary.rpg` — MONTHLY SALES SUMMARY BY DISTRICT.** A two-level control-break report:
the business RPG world of the period, and the smallest job that exercises every stage of the cycle. A trajectory
table has no control breaks and would exercise none of it; the reentry showcase stays Phase 6's, on
the finished period UI.

The input card, 80 columns, labelled **reconstructed** exactly as `demos/hello-dad.data.cards` is:

```text
col  1     S        record code                      Input cols 6-11
cols 2-3   —        district — control field 2, the MAJOR break, End 003 Length 02
cols 4-6   DEPT     department — control field 1, the MINOR break, End 006 Length 03
                    AND a Data-sheet field, because the detail line prints it (§10.3).
                    ALPHAMERIC by the same determinant: `DEPT DCW #3`
cols 7-14  PART     part number, 8 ALPHAMERIC        a Data-sheet field: no col-23 `N`,
                    no Calculation line writes it, so §8.2's determinant makes it
                    alphameric and the target emits `PART DCW #8` -- eight BLANKS
cols 15-19 QTY      5 digits                         a Data-sheet field
cols 20-27 AMT      8 digits, in cents               a Data-sheet field
```

**A control field carries no name on the Input sheet** — cols 44-73 are End(3)/Length(2) pairs and
nothing else (§6.1, `[verified]`) — so the district column above is deliberately nameless, and
`DEPT` has a name only because the demo declares it on the **Data** sheet. That is the whole of
§10.3's **third** re-cut — the one that adds the **fifth `D` card**, `DDEPT` — and it is why the
generator's card sub-entries are `Cnnn` rather than words (§8.4).

**What it exercises that a simpler report would not:** a two-level break with the minor breaking
under the major; total-time calculations rolling a level-1 accumulator into level 2 (Calculation
col 49 = `T`, the column one panel proposal amputated); `B` blank-after totals as readout-and-reset;
a **multiply with half-adjust and position-adjust** — a 5% commission, which is the one thing that
puts Phase 1b's `@` on a period reader's printed page, and whose result field is **14 positions**, not 10, for
the reason §8.2 works out; three edit control words through the 1410 `E` instruction;
a zero-suppressed quantity through `MCS`; a heading **group** expressed with Next Line; **a
page-overflow heading as an independent alphabetic-level line**; page overflow at carriage channel
12 with the heading group reprinted and the page number advanced; and a `GRAND TOTAL` on `LC`.

**The overflow heading is `HB1`/`HB2` on `OF`, and it is not an `1P`-or-`OF` group.** The obvious
RPG idiom — repeat the `HA1` line entry with `OF` in the second alternative — is forbidden by the
same `[verified]` sentence that grants or-by-repetition: `rpg-sources.md` §6.4 p.38, *"`OF` may
participate in an *or* group only if it is part of **every** alternative."* An earlier draft of this
plan quoted the first half of that sentence three times and dropped the second half every time,
and then built the demo's heading on exactly the construct it forbids — in the artifact §10.2
freezes first and §11.1 makes hardest to undo. The period-correct alternative is in the research
itself: §6.4's line classification (spacing chart, pp.12-16) says *"alphabetic levels mark
independent lines (e.g. page-overflow headings `HBx`, standalone detail `DAA`)"*. So the demo
carries **two** heading groups — `HA1`/`HA2` conditioned on `1P`, `HB1`/`HB2` conditioned on `OF`,
identical in content — and no or-group at all. It **adds** eleven Format cards and **drops** the
or-group's duplicate `L HA1`, so the Format half goes 36 → 46, a net ten (§10.3), and it costs one
more print block in `headingOutput`; it obeys verified text, which §2.3's ruling paragraph says is the tie-break.

**And it lands on a second `[verified]` sentence, which is ruled rather than stepped over.** §6.4
p.43's ordering rule reads *"descending level for heading lines"*, and `HA` before `HB` is
ascending. The rule is scoped to **numeric** levels — §5.2 states the ruling, `THE_LEVEL_ORDERING_RULE_APPLIES_TO_NUMERIC_LEVELS_ONLY` (§15) carries it, and the warrant is the
same spacing-chart sentence: an *independent* line is not in the hierarchy the rule orders. Without
that scoping the demo's own heading group fires the diagnostic §11.5's corpus exists to fire, so
the ruling is load-bearing rather than tidy.
`OVERFLOW_HEADING_IS_AN_INDEPENDENT_ALPHABETIC_LEVEL_LINE`, §15, `[likely]` — the parenthetical is
illustrative, not a rule — with the departure as its stated fallback. Or-groups are still exercised:
`stress/or-conditions.rpg` repeats a line entry three times, and §11.5 carries the malformed deck
that **rejects** an `OF` present in fewer than all alternatives.

### 10.2 The print-position column map — published BEFORE the golden is authored

**REQUIRED GRAFT, from `report-first` via the period-fidelity judge.** The column map is the design
document; the page golden is authored *from it* in wave 1, which is what makes the page a design
rather than a transcript of whatever the program happened to print.

1403 Model 2, 132 positions, chain A, the 66-line `DEFAULT_CARRIAGE_TAPE` (channel 1 at line 1,
channel 12 at line 60).

| Line | Print positions | Content | Width | How it is placed |
|---|---|---|---|---|
| `HA1` heading | 001-021 | `MONTHLY SALES SUMMARY` | 21 | `K` constant, `MLCA` |
| | 023-033 | `BY DISTRICT` | 11 | `K` constant, `MLCA` |
| | 060-063 | `PAGE` | 4 | `K` constant, `MLCA` |
| | 065-067 | `PAGENO` | 3 | `MCS` zero-suppress (col 47 `Z`) |
| `HA2` = `HA1`'s **Next Line** | 001-004 | `DEPT` | 4 | `K` constant |
| | 013-016 | `PART` | 4 | `K` constant |
| | 024-026 | `QTY` | 3 | `K` constant |
| | 037-042 | `AMOUNT` | 6 | `K` constant |
| | 048-057 | `COMMISSION` | 10 | `K` constant |
| `HB1` overflow heading, on `OF` | — | **identical to `HA1`, print position for print position** | — | an independent alphabetic-level line (§10.1), not an or-group |
| `HB2` = `HB1`'s **Next Line** | — | **identical to `HA2`** | — | same |
| `D11` detail | 002-004 | `DEPT` | 3 | `MLCA` |
| | 009-016 | `PART` | 8 | `MLCA` |
| | 022-026 | `QTY` | 5 | `MCS` zero-suppress |
| | 033-042 | `AMT` | 10 | `MLCWA` + `MCE`, `WORD01` |
| | 043-057 | `COMM` | 15 | `MLCWA` + `MCE`, **`WORD03`**, `B` blank-after. The **field** is 14 positions (§8.2's multiply rule) and position-adjust 02 means the print addresses `COMM-2`, so the A field `MCE` is handed runs from `COMM-2` down to `COMM`'s word mark — **twelve positions**. `WORD01` has **eight** digit positions, and A22-0526-3 p.31 is `[verified]`: *"the data field may contain **fewer**, but must not contain more, positions than the number of blanks and zeros in the body of the control word"*, with the truncation rule dropping the excess. So the detail commission edits through **`WORD03`, 15 characters over 12 digit positions** — an exact fit — and its print span widens to 043-057, aligning it with `T31`'s `GCOM`. An earlier draft printed it through `WORD01` and would have silently dropped the four high-order positions into the frozen page golden. The `B` blank-after emits `MLCB ZEROS,COMM` after the carriage motion (§8.2, §10.4) |
| `T11` total, level 1, on `F1` | 006-015 | `DEPT TOTAL` | 10 | `K` constant |
| | 030-042 | `DTOT` | 13 | `MLCWA` + `MCE`, `WORD02`, `B` |
| | 045-057 | `DCOM` | 13 | `MLCWA` + `MCE`, `WORD02`, `B` |
| | 060 | `*` | 1 | `K` constant, Field End **060** ⇒ `MLCA K080,PLINE+59` |
| `T21` total, level 2, on `F2` | 002-015 | `DISTRICT TOTAL` | 14 | `K` constant |
| | 030-042 | `RTOT` | 13 | `WORD02`, `B` |
| | 045-057 | `RCOM` | 13 | `WORD02`, `B` |
| | 060-061 | `**` | 2 | `K` constant, Field End **061** ⇒ `MLCA K081,PLINE+60` |
| `T31` total, level 3, on `LC` | 005-015 | `GRAND TOTAL` | 11 | `K` constant |
| | 028-042 | `GTOT` | 15 | `WORD03`, `B` |
| | 043-057 | `GCOM` | 15 | `WORD03`, `B` |
| | 060-062 | `***` | 3 | `K` constant, Field End **062** ⇒ `MLCA K082,PLINE+61` |

**Every line identification in that column is three characters, and that is §6.4 cols 2-4 rather
than a style.** Col 2 is the type, col 3 is the **one-column** level (numeric 1-8, or alphabetic),
col 4 is the line number within the level — *"numeric, or a letter if the level is alphabetic and
unique"*, `[verified]`, and **nothing grants a blank col 4**. An earlier draft of this map wrote
`D1`, `T1`, `T2`, `T3` two characters wide beside a three-character `HA1`, and called `T1`
*"level 01"* — two digits into a one-column field. The ids are therefore `HA1`, `HA2`, `HB1`,
`HB2`, `D11`, `T11`, `T21`, `T31`, and §4's `OutputLine.number` stays non-optional. **The field
names in the Content column are the SHEET's names and they are also the target program's cell
names** — `AMT` is `AMT`, `COMM` is `COMM` — because §8.4's namespace rule leaves a user symbol
alone and gives the card sub-entries the `Cnnn` family instead. An earlier draft printed from
`WAMT` and `WCOMM`, and this map and §10.4 disagreed about the same two cells.

The three edit control words — `WORD01` 10 characters over 8 digit positions, `WORD02` 13 over 10,
`WORD03` 15 over 12 — are defined by `W` entries and named from the lines' `F` and `B` entries.
**The width rule is a machine rule, not a style, and every one of the demo's eight edits obeys it**:
the A field `MCE` is handed — from the addressed units position down to the field's word mark — must
be **no longer** than the count of blanks and zeros in the control word's body (A22-0526-3 p.31,
`[verified]`, `opcodes.md` §7). `AMT` 8 into `WORD01`'s 8; `DTOT`/`DCOM`/`RTOT`/`RCOM` 10 into
`WORD02`'s 10; `GTOT`/`GCOM` 12 and the position-adjusted `COMM-2`'s **12** into `WORD03`'s 12.
`model.ts` diagnoses an edit word whose body is too narrow for the field it edits, and
`test/rpg-output.test.ts` asserts the A-length against the body count for every `MCE` the generator
emits — the companion to §10.4 trap 7, and necessary because the shipped assembler cannot see it:
the overrun assembles clean.
**Their exact glyph strings are settled in wave 1 against the shipped `MCE`**, not asserted here:
edit semantics come from `opcodes.md` §7 and A22-0526-3 pp.31-33 Figures 27-34, **not from
A24-1403**, which is a 1401 manual nobody in this project has read (§15,
`EDIT_WORD_IS_THE_1410_MCE_CONTROL_WORD`). J24-0215-2 p.43's *"editing follows the 1401
program-editing rules in A24-1403"* supplies the **sheet layout** — where the word sits on the card
— and nothing else. `opcodes.md` §7's own 1401-vs-1410 trap note records that A24-1403-5 Figure 58
and A22-0526-3 Figure 34 trace the **identical** example — control word `$bbb,bb0.bb&CR&**` over A
field `00257426` — differing only in step count and address width, which is what makes the
control-word *language* the same; and it records one behavioural divergence that must be noted
rather than inherited: *"Single Character Edit — … the 1401 system will NOT transfer this
single-character field to the B-field. The 1410 WILL"* (223-2588-2 p.53, `[verified]`).

**Twenty-five characters is a real constraint, and the demo obeys it.** Format cols 51-75 hold the
constant or edit word, so no `K` constant may exceed 25 characters — which is why the report's title
is two `K` entries and its column-title line is five, rather than one long string. The first draft
of this plan's spec deck lost eight characters off the title to that limit before the deck was built
column-exact; it is recorded here so wave 4 does not rediscover it.

### 10.3 The specification deck, column-exact

`demos/sales-summary.rpg` is **60 cards** in the `[verified]` §6.6 order: one `RG` control card, one
`C` Input card, **five** `D` Data cards, seven `A` Calculation cards and **forty-six** Format cards.
The Format half **adds eleven** cards when the heading or-group becomes the independent `HB1`/`HB2`
group and **drops** the or-group's duplicate `L HA1` — a net ten, 36 → 46 (§10.1). It is
built from §7.1's column table, and **its column-exactness is checked, not asserted** —
`test/rpg-demo-source.test.ts` reads the file, asserts every line is exactly 80 characters, asserts
every field lands in its `columns.ts` span, asserts every card's cols 76-80 match the prenumbering
below, and asserts **`model(parse(...))` returns zero diagnostics**. That check exists because
Phase 3's JOB card was 79 characters in an earlier draft of *its* plan and nothing else would have
caught it.

**Every one of those assertions is WAVE 4's, and that is stated because an earlier draft of this
paragraph said `generate()`.** `test/rpg-demo-source.test.ts` is wave 4's file and `generate.ts` is
**wave 5's**, so a wave-4 worker writing the assertion as `generate()` would import a module that
does not exist, the test file would fail to load, and wave 4 could not go green — and
`rpg-demo-source` is not one of §11's three declared cross-wave appends, so wave 5 would have had
no sanctioned way to add it later. Wave 4 asserts through `model(parse(...))`, which is exactly
what its own oracle row already uses. **The `generate()` half lives in
`test/rpg-generate.test.ts`, which wave 5 already owns**, and is named in wave 5's row: `generate(readFileSync('demos/sales-summary.rpg'))`
returns `ok: true` with zero diagnostics. Two files, two waves, no append.

**How the cards below were produced, because two successive drafts of this section were punched in
the wrong columns.** They were **not** hand-typed. A script holding the four sheet layouts as
`(name, startCol, endCol)` tuples — transcribed field by field from `rpg-sources.md` §6.1-§6.4, and
self-checked to tile columns 1-80 exactly once per sheet — **rendered** each card by placing every
value at its own columns in an 80-blank buffer, **parsed** it back into named fields, and asserted
the round trip. The strings below are that script's output, generated on **2026-08-31**, pasted
whole. Nothing here is a hand-edited variant of them, and `test/rpg-demo-source.test.ts`'s span
assertion — a **wave-4 gate on the committed file** — is what makes it permanent: a later hand-edit
that shifts a field fails a test rather than reaching a reviewer.

The first fourteen cards, as punched (the ruler is a reading aid, not a card):

```text
....+....1....+....2....+....3....+....4....+....5....+....6....+....7....+....8
RG                                                                         02010
CAA  001 CS                              010060300302                      03010
DDEPT  003         CAA 006                                                 04010
DPART  008         CAA 014                                                 04020
DQTY   005         CAAN019                                                 04030
DAMT   008         CAAN027                                                 04040
DPAGENO003         PAG                                                     04050
ACOMM  014         AMT   008X00005 005?         D0202                      05010
ADTOT  010                   AMT   008A         D                          05020
ADCOM  010                   COMM  014A         D                          05030
ARTOT  010                   DTOT  010A F1      T                          05040
ARCOM  010                   DCOM  010A F1      T                          05050
AGTOT  012                   RTOT  010A F2      T                          05060
AGCOM  012                   RCOM  010A F2      T                          05070
```

and three of the forty-six Format cards, so the wave-4 worker has a worked example on that sheet
too — an `L` line entry, a `K` constant and an `F` field entry, from the same script:

```text
....+....1....+....2....+....3....+....4....+....5....+....6....+....7....+....8
LHA1X  HA2    01    1P                                                     06010
K                                 021          021MONTHLY SALES SUMMARY    06020
F                           PAGENO067         Z                            06050
```

**Seven re-cuts against the earlier draft of this deck, each forced by a `[verified]` sentence or
by a machine rule this plan already states:**

- the `D` cards read **`CAA`**, not `C01`. §6.2 cols 20-22 is verbatim and `[verified]`:
  *"`Cxx` (a record type from **input cols 1-3**)"* — the Input card's cols 1-3 are `CAA`, and `01`
  is its **resulting condition** from cols 42-43, which is a different thing in a different column
  span. `CXX_NAMES_THE_RECORD_TYPE_BY_INPUT_COLS_1_TO_3`, §15;
- `ACOMM`'s length in cols 8-10 is **`014`**, not `010`. §6.3 cols 8-10, `[verified]`: *"for
  **multiply**: ≥ (digits in multiplier + digits in multiplicand − position-adjust)"* = 8 + 5 − 2 =
  **11** minimum, and the machine's own B-field rule (`opcodes.md` §2 row 014,
  `digits(multiplicand) + digits(multiplier) + 1`) wants **14**. 14 satisfies both, so it is one
  number rather than two. `ADCOM`'s factor-2 length follows it — **and it declares `COMM`'s UNADJUSTED 014**, which is the
  sheet's declared length, while §10.4 addresses the position-adjusted field as `COMM-2` (§8.2's
  position-adjust row says so, because the card and the instruction would otherwise disagree);
- **there is a fifth `D` card, `DDEPT`, and it is a ruling rather than a convenience.** §10.2's
  detail line prints `DEPT` at 002-004 and a Format `F` entry's cols 29-34 must name *"a name from
  data or calculation, or a `WORDxx`"* (§6.4, `[verified]`). `DEPT` was a **control field** and
  nothing else — Input cols 44-46 / 47-48, End(3)/Length(2), **which carry no name anywhere on the
  sheet** (§7.2's own expansion row: *"49-53, 54-58, … | Control fields 2-6"*, five columns each).
  So the demo printed a field no sheet in the demo defined, and `model.ts`'s *"undefined field
  name"* diagnostic — the one §11.5's corpus exists to fire — would have fired on the demo itself.
  **The rule is not weakened: a control field stays nameless, and the demo declares `DEPT` on the
  Data sheet like any other field it wants to print.** `DDEPT  003         CAA 006` sources it from
  record position 006, the same position control field 1 ends at, and §10.4 gains one
  `MLC C006,DEPT` in `extract` and prints from `DEPT` rather than from the save area `CN1`;
- the conditions sit in cols **41-42** with col 40 blank — the Not column — under
  `CONDITION_GROUP_IS_NOT_PLUS_TWO_DIGIT_INDICATOR` (§5.2, §15). The earlier draft wrote `F1` at
  40-41, which put `F` in the negation position; the draft after **that** wrote it at 50-51, nine
  columns further right, which blanked all three condition groups, blanked col 49, and parsed the
  indicator as a half-adjust position. **Every group on every sheet is cut the same way**, and the
  Format sheet's groups are not an exception: line conditions at cols 20-22 / 23-25 / 26-28 and
  field conditions at 38-40 / 41-43 / 44-46 each carry a blank in their **first** column and the
  indicator right-justified in the following two — which is why `LHA1`'s `1P` above sits at 21-22
  with col 20 blank, where the earlier deck had it at 20-21;
- **the three DETAIL-time Calculation cards are unconditional**: cols 40-48 blank on `ACOMM`,
  `ADTOT` and `ADCOM`. A previous revision put `F1` on all seven, which is semantically wrong.
  `F1` is the **level-1 control-break indicator** (§15 `F1_TO_F6_ARE_THE_CONTROL_LEVEL_INDICATORS`),
  set at `CTLBRK` and cleared at `LVLRST`, so a col-49 `D` step conditioned on it would fire only
  on the card *after* a break — the commission computed, and `DTOT`/`DCOM` accumulated, on roughly
  one card per department. §10.4's `DTLCAL` emits its five steps with no `BCE` on `F1` anywhere,
  and §11.1 gate 1 compares object records, so the spec deck and the target must agree. `F1` and
  `F2` stay on the four **total**-time cards, where they are the whole point;
- **`ACOMM`'s half adjust in cols 50-51 is `02`, not `03`.** §8.2's rule emits
  `A FIVE,<result>-(k-1)`, so `k = 03` puts the five on `COMM-2` — **position 3, which survives a
  position-adjust of `02`** — and every commission on the page prints five cents high, in a page
  golden wave 1 freezes. `k = p = 02` puts it on `COMM-1`, the highest dropped position, where it
  carries. §10.4 emits `A FIVE,COMM-1`; §8.2 works the arithmetic through and §15's
  `HALF_ADJUST_IS_ADD_FIVE_AT_THE_NAMED_POSITION` row carries the interaction;
- **`D11`'s commission field entry names `WORD03`, not `WORD01`.** The A field `MCE` is handed runs
  from `COMM-2` down to `COMM`'s word mark — **twelve positions** — and A22-0526-3 p.31 is
  `[verified]` that the data field *"must not contain more positions than the number of blanks and
  zeros in the body of the control word"*. `WORD01` has eight; `WORD03` has twelve, an exact fit.
  §10.2's map moves the detail commission to print positions 043-057 accordingly, and it is a
  **pre-wave-1** change for exactly that reason.

**Page numbering, and the `RG` card is page 02.** §6.1 and §6.4 both record, `[verified]`,
*"Spacing chart is page 01"* — page 01 is the sheet the report is drawn on and it is never punched.
So the deck runs `RG` page **02**, Input **03**, Data **04**, Calculation **05**, and the Format
half **06 and 07**, because forty-six entries do not fit one X24-1339: §6.1's card-number note is
`[verified]` — *"First 20 lines prenumbered 010-200; six unnumbered lines at the bottom"* — so a
sheet holds **26**. Page 06 carries cards 010-260 (the `HA` group, the `HB` group and `LD11` with
its first three field entries) and page 07 carries 010-200 (the rest of `D11`, the three total
lines and the three `W` entries). Wave 4 checks the card numbers against that prenumbering when it
cuts the deck, and the page-and-card identification is what every diagnostic and the §9 listing
golden print.

Read across the Input card: `C` an Input line-entry · `AA` two alphabetic characters, so no record
sequencing — **and therefore no `SCF` line anywhere in the deck, which is why the demo generates no
`sequence` section** (§6.2, §15) · position `001` holds the record code · compare the full character
(`C` in col 10) · the code is `S` · resulting condition `01` in cols 42-43, which is what the
*condition* columns on the other sheets name · control field 1 ends at position `006`, length `03`
(the department, the **minor**) · control field 2 ends at `003`, length `02` (the district, the
**major**), ascending in significance left to right. **Neither control field carries a name**, and
that is the sheet, not an omission. Cols 1-3 — `CAA` — are the record type's **identity**, and that
is what the Data sheet's field-source columns name.

Read across `ACOMM`: result field `COMM`, **14** positions · factor 1 `AMT` length `008` · OP `X` ·
factor 2 the literal `00005` length `005` · col 39 `?` — the 12-0 punch, i.e. `0+` reset-add
(§5.2) · cols 40-48 blank, **unconditional** · col 49 `D`, detail time · half adjust **`02`** in
cols 50-51 · position adjust `02` in 52-53 — **the two carry the same number and that is the
correct reading, not a typo**: §8.2 works it through, and an earlier draft wrote `03` there, which
under §8.2's own `A FIVE,<result>-(k-1)` rule adds the five to the SURVIVING units digit instead of
to the highest dropped one and prints every commission on the page five cents high. `ADTOT` is the single-factor accumulate form §6.3 describes:
no factor 1, factor 2 `AMT`, col 39 `A`, col 49 `D`, unconditional. `ARTOT` is the same shape at
**total** time with col 40 blank and `F1` at 41-42, and `AGTOT` at total time under `F2` — which is
the total-time cycle, in the sheets, where it belongs.

The Format deck's forty-six cards carry eight `L` line entries, thirty-five field entries and three
`W` entries: the `L HA1` and `L HA2` heading entries on `1P`, the
`L HB1` and `L HB2` **overflow** heading entries on `OF` (§10.1 — independent alphabetic-level
lines, not an or-group), `HA2` as `HA1`'s Next Line and `HB2` as `HB1`'s, `D11`, `T11` on `F1`,
`T21` on `F2`, `T31` on `LC` — **space-2-after-print like every other total line, cols 17-18
blank**; an earlier draft of this sentence said *"with a skip-after to channel 12"*, which resolves
to `CC1 ⌑` and appears nowhere in §10.4 (the `Z052` block ends `CC1 S`, at 01639), would fail §11.1
gate 1, and would park the paper on the overflow line when `EOJ`'s `CC1 1` already ejects it. §10.2's
map has no Space/Skip column, which is why this is the only site that states it — their `K` / `F` /
`B` field entries in
the §10.2 map's order (4 + 5 + 4 + 5 + 5 + 4 + 4 + 4 = 35), and the three `W` entries defining
`WORD01` / `WORD02` / `WORD03`. 8 + 35 + 3 = **46**, and 1 + 1 + 5 + 7 + 46 = **60**.

### 10.4 The target program — and it already assembles

`demos/sales-summary.asm` is **wave 1's hand-written target**: the program the demo spec deck must
compile to, written by a person in the house style the generator will later reproduce.

**Provenance of everything below, stated before the numbers, and it is a durable path rather than a
session's.** The file is **not in the repository yet** — wave 1 writes the committed version, and a
plan branch does not commit build artifacts. The draft it was produced from was assembled on
**2026-08-31** with the shipped tool, and **the draft itself is pasted verbatim into
`docs/BUILD-LOG-5.md`'s `## Arrival` section** (§16), which the plan's own arrival commit creates —
because an exhibit whose only provenance is a scratch path under `/private/tmp/…` stops being
checkable the moment that session ends, and §11 wave 1's oracle is judged against it. Read the
draft there, paste it into a file, and re-run it:

```text
$ node build/tools/asm.js <the draft> --listing
assembled <the draft> — 39 condensed cards, 0 flagged line(s), chain A
…
NUMBER OF FLAGGED STATEMENTS NONE
```

and probed directly through `assemble()` in node:

```text
ok true | flagged 0 | warnings 0 | warnings: []
source cards 270 | condensed records 39 | entry 808
```

**Historical arrival result: 270 source cards · 39 condensed cards · `ok: true` · 0 flagged lines · 0 warnings · entry `START`
at 00808 · code ending at 02533 · slack 02534 · `IND` 02535 · `CDIN` 02542 · `PLINE` 02700 ·
`PLGM` at 02832 · high-water 02833 · core-size code 1 (10K).** Historical values from the
pre-re-cut draft; the ADDRS and INSTRUCTION columns below are **pasted out of that listing**,
not composed. The one exception is `DEPT` and `PART`, whose `DCW #n` emits blanks: the listing's
data column is literally empty there, so the exhibit writes `(three blanks)` / `(eight blanks)`
rather than showing nothing and reading as an error. Wave 1's committed program will differ in comment text and in card sequence; if any of
these numbers moves, `BUILD-LOG-5.md` records the new one — which is what §16 already requires of
the condensed-card count and the high-water.

**The section heads are labelled, and that is a design requirement rather than a stylistic one.**
Exit criterion 9 asserts `CYCLE_SECTION_LABEL`'s labels appear in `AssemblyResult.symbols` at
strictly ascending addresses, so every generated section has to carry one (§6.2). Measured on that
pre-re-cut arrival draft, in `CYCLE_ORDER` order:

```text
ONE     00500     CTLBRK  00965     DTLCAL  01732
START   00808     TOTCAL  01087     HDGOUT  01787
RDCARD  00838     TOTOUT  01162     DTLOUT  02248
IDENT   00862     LVLRST  01672     LASTCD  02424
EXTRCT  00893                       NOTFND  02467
                                    EOJ     02524
                                    IND     02535
```

Strictly ascending, all sixteen — sixteen of `CYCLE_ORDER`'s **seventeen**. `SEQCHK` is the one
absent, because the demo has no `SCF` line and the `sequence` section is not generated (§6.2, §15) —
which is exactly why criterion 9a is conditional on generation and criterion 9b exists.

The historical pre-re-cut arrival listing, section by section — label, op, operand and comment as
punched, then the assembler's **ADDRS** and **INSTRUCTION**. Not regenerated; `…` is an elision, and BUILD-LOG-5's Re-cut 3 is current:

```text
AUTOCODER RUN                                               00500
          JOB  SALES SUMMARY BY DISTRICT
          CTL   1
*  MONTHLY SALES SUMMARY BY DISTRICT -- THE PHASE 5 TARGET.
*  HAND-WRITTEN. THE GENERATOR MUST REPRODUCE THIS MACHINE.
*  10K, ONE CHANNEL, A 1402 AND A 1403 MODEL 2, CHAIN A.
          LOAD                                              00500
          ORG  00500                                        00500
* -- 0. CONSTANTS AND WORK AREAS ----------------------------------
ONE       DCW  @1@                INDICATOR ON              00500  1
ZERO      DCW  @0@                INDICATOR OFF             00501  0
FIVE      DCW  @5@                HALF ADJUST               00502  5
K001      DCW  @1@                PAGE INCREMENT            00503  1
K002      DCW  @00005@            A CALCULATION LITERAL     00508  00005
IZERO     DCW  @0000000@          CLEARS THE INDICATOR FILE 00515  0000000
ZEROS     DCW  @00000000000000@   MLCB RESET SOURCE, 14     00529  00000000000000
DTOT      DCW  @0000000000@                                 00539  0000000000
DCOM      DCW  @0000000000@                                 00549  0000000000
RTOT      DCW  @0000000000@                                 00559  0000000000
RCOM      DCW  @0000000000@                                 00569  0000000000
GTOT      DCW  @000000000000@                               00581  000000000000
GCOM      DCW  @000000000000@                               00593  000000000000
PAGENO    DCW  @000@              THE ONE MANDATED NAME     00596  000
DEPT      DCW  #3                 ALPHAMERIC -- SEC 8.2     00599  (three blanks)
PART      DCW  #8                 ALPHAMERIC -- SEC 8.2     00607  (eight blanks)
QTY       DCW  @00000@                                      00612  00000
AMT       DCW  @00000000@                                   00620  00000000
COMM      DCW  @00000000000000@   5 PLUS 8 PLUS 1, ROW 014  00634  00000000000000
CN1       DCW  @000@              CONTROL FIELD 1 THIS CARD 00637  000
CN2       DCW  @00@               CONTROL FIELD 2 THIS CARD 00639  00
CO1       DCW  @000@              CONTROL FIELD 1 PREV CARD 00642  000
CO2       DCW  @00@               CONTROL FIELD 2 PREV CARD 00644  00
WORD01    DCW  @   ,   .  @       10 OVER 8                 00654     ,   .
WORD02    DCW  @  ,   ,   .  @    13 OVER 10                00667    ,   ,   .
WORD03    DCW  @    ,   ,   .  @  15 OVER 12                00682      ,   ,   .
K010      DCW  @DEPT TOTAL@                                 00692  DEPT TOTAL
K020      DCW  @DISTRICT TOTAL@                             00706  DISTRICT TOTAL
K030      DCW  @GRAND TOTAL@                                00717  GRAND TOTAL
K040      DCW  @MONTHLY SALES SUMMARY@                      00738  MONTHLY SALES SUMM…
K041      DCW  @BY DISTRICT@                                00749  BY DISTRICT
K050      DCW  @PAGE@                                       00753  PAGE
K060-K064 DCW  @DEPT@ @PART@ @QTY@ @AMOUNT@ @COMMISSION@    00757-00780
K080      DCW  @*@                                          00781  *
K081      DCW  @**@                                         00783  **
K082      DCW  @***@                                        00786  ***
K090      DCW  @RECORD TYPE NOT FOUND@                      00807  RECORD TYPE NOT FO…
* -- 1. INITIALISE ------------------------------------------------
START     MLCA IZERO,PRIME        ALL INDICATORS OFF        00808  D 00515 02541 T
          SW   PLGM               THE GM-WM THAT ENDS W1    00820  , 02832
          MLCS ONE,FSTPG          1P ON -- FIRST PAGE       00826  D 00500 02540 3
* -- 2. READ ------------------------------------------------------
RDCARD    R1   0,CDIN             MOVE MODE, BAKED D        00838  M %10 02542 R
          BEF1 LASTCD                                       00848  R 02424 8
          BA1  *+1                RELEASE THE INTERLOCK     00855  R 00862
* -- 3. IDENTIFY THE RECORD TYPE ----------------------------------
IDENT     BCE  Z010,C001,S        INPUT COLS 6-11           00862  B 00881 02542 S
          B    NOTFND                                       00874  J 02467
Z010      MLCS ONE,RC01           RESULTING CONDITION 01    00881  D 00500 02535 3
* -- 4. NO SEQUENCE CHECK. THE DEMO CARRIES NO SCF LINE -- SEC 15.
* -- 5. EXTRACT THE CONTROL AND DATA FIELDS -----------------------
EXTRCT    MLC  C003,CN2           CONTROL FIELD 2 -- MAJOR  00893  D 02544 00639 C
          MLC  C006,CN1           CONTROL FIELD 1 -- MINOR  00905  D 02547 00637 C
          MLC  C006,DEPT          DATA SHEET FIELD SOURCES  00917  D 02547 00599 C
          MLC  C014,PART                                    00929  D 02555 00607 C
          MLC  C019,QTY                                     00941  D 02560 00612 C
          MLC  C027,AMT                                     00953  D 02568 00620 C
* -- 6. CONTROL BREAK -- COMPARE MAJOR FIRST ----------------------
CTLBRK    BCE  Z020,PRIME,1       NOT THE FIRST RECORD      00965  B 01020 02541 1
          MLCS ONE,PRIME          FIRST RECORD -- NO BREAK  00977  D 00500 02541 3
          MLC  CN2,CO2                                      00989  D 00639 00644 C
          MLC  CN1,CO1                                      01001  D 00637 00642 C
          B    DTLCAL             STRAIGHT TO DETAIL TIME   01013  J 01732
Z020      C    CO2,CN2            COMPARE THE MAJOR FIRST   01020  C 00644 00639
          BU   Z030                                         01031  J 01063 /
          C    CO1,CN1                                      01038  C 00642 00637
          BU   Z031                                         01049  J 01075 /
          B    DTLCAL             NOTHING BROKE             01056  J 01732
Z030      MLCS ONE,F2             A BREAK AT LEVEL 2 ...    01063  D 00500 02537 3
Z031      MLCS ONE,F1             ... BREAKS EVERY MINOR    01075  D 00500 02536 3
* -- 7. TOTAL TIME CALCULATIONS -----------------------------------
TOTCAL    BCE  Z036,F1,0                                    01087  B 01121 02536 0
          A    DTOT,RTOT          CALC COL 49 IS T, COND F1 01099  A 00539 00559
          A    DCOM,RCOM                                    01110  A 00549 00569
Z036      BCE  Z037,F2,0                                    01121  B 01155 02537 0
          A    RTOT,GTOT          CALC COL 49 IS T, COND F2 01133  A 00559 00581
          A    RCOM,GCOM                                    01144  A 00569 00593
Z037      B    TOTOUT                                       01155  J 01162
* -- 8. TOTAL OUTPUT, ASCENDING BY LEVEL --------------------------
TOTOUT    BCE  Z042,F1,0          T11 -- DEPT TOTAL, LVL 1  01162  B 01332 02536 0
          CS   PLINE+131                                    01174  / 02831
          CS   PLINE+99                                     01180  / 02799
          MLCA K010,PLINE+14      FIELD END 015             01186  D 00692 02714 T
          MLCWA WORD02,PLINE+41   EDIT WORD AND ITS WM      01198  D 00667 02741 X
          MCE  DTOT,PLINE+41      FIELD END 042             01210  E 00539 02741
          MLCWA WORD02,PLINE+56                             01221  D 00667 02756 X
          MCE  DCOM,PLINE+56      FIELD END 057             01233  E 00549 02756
          MLCA K080,PLINE+59      THE TOTAL MARK            01244  D 00781 02759 T
          W1   PLINE                                        01256  M %20 02700 W
          BA1  *+1                                          01266  R 01273
          BCV1 Z038               LATCH OF BEFORE MOTION    01273  J 01287 @
          B    Z039                                         01280  J 01299
Z038      MLCS ONE,OF                                       01287  D 00500 02538 3
Z039      CC1  S                  SPACE 2 AFTER PRINT       01299  F S
          BA1  *+1                                          01301  R 01308
          MLCB ZEROS,DTOT         FORMAT COL 1 IS B         01308  D 00529 00539 L
          MLCB ZEROS,DCOM                                   01320  D 00529 00549 L
Z042      …  T21 ON F2, K020, RTOT, RCOM, WORD02           01332-01490  the same shape
          …  BUT MLCA K081,PLINE&60 -- FIELD END 061        01414  D 00783 02760 T
Z052      …  T31 ON LC, K030, GTOT, GCOM, WORD03           01502-01660  the same shape
          …  BUT MLCA K082,PLINE&61 -- FIELD END 062        01584  D 00786 02761 T
* -- 9. LEVEL RESET AND CONTROL FIELD ROLL FORWARD ----------------
LVLRST    MLC  CN2,CO2                                      01672  D 00639 00644 C
          MLC  CN1,CO1                                      01684  D 00637 00642 C
          MLCS ZERO,F1                                      01696  D 00501 02536 3
          MLCS ZERO,F2                                      01708  D 00501 02537 3
          BCE  EOJ,LC,1           LAST CARD -- NO DETAIL    01720  B 02524 02539 1
* -- 10. DETAIL TIME CALCULATIONS ---------------------------------
DTLCAL    ZA   AMT,COMM-6         MULTIPLIER IMAGE, HIGH    01732  & 00620 00628
          M    K002,COMM          AUTOCODER M IS MACHINE @  01743  @ 00508 00634
          A    FIVE,COMM-1        HALF ADJUST AT POSN 02    01754  A 00502 00633
          A    AMT,DTOT           CALC COL 49 IS D          01765  A 00620 00539
          A    COMM-2,DCOM        POSITION ADJUST 02        01776  A 00632 00549
* -- 11. HEADING OUTPUT. HA ON 1P, HB ON OF -- SEC 6.4 P.38 -------
HDGOUT    BCE  Z062,FSTPG,0       HA1 AND HA2 -- FIRST PAGE 01787  B 02021 02540 0
          CS   PLINE+131                                    01799  / 02831
          CS   PLINE+99                                     01805  / 02799
          A    K001,PAGENO        ADVANCE THE PAGE NUMBER   01811  A 00503 00596
          MLCA K040,PLINE+20      FIELD END 021             01822  D 00738 02720 T
          MLCA K041,PLINE+32      FIELD END 033             01834  D 00749 02732 T
          MLCA K050,PLINE+62      FIELD END 063             01846  D 00753 02762 T
          MCS  PAGENO,PLINE+66    FIELD END 067, COL 47 Z   01858  Z 00596 02766
          CC1  1                  SKIP BEFORE TO CHANNEL 1  01869  F 1
          BA1  *+1                                          01871  R 01878
          W1   PLINE                                        01878  M %20 02700 W
          BA1  *+1                                          01888  R 01895
          CC1  /                                            01895  F /
          BA1  *+1                                          01897  R 01904
          CS   PLINE+131          NEXT LINE, COLUMN TITLES  01904  / 02831
          CS   PLINE+99                                     01910  / 02799
          MLCA K060,PLINE+3                                 01916  D 00757 02703 T
          MLCA K061,PLINE+15                                01928  D 00761 02715 T
          MLCA K062,PLINE+25                                01940  D 00764 02725 T
          MLCA K063,PLINE+41                                01952  D 00770 02741 T
          MLCA K064,PLINE+56                                01964  D 00780 02756 T
          W1   PLINE                                        01976  M %20 02700 W
          BA1  *+1                                          01986  R 01993
          CC1  S                  SPACE 2 AFTER PRINT       01993  F S
          BA1  *+1                                          01995  R 02002
          MLCS ZERO,FSTPG                                   02002  D 00501 02540 3
          B    DTLOUT                                       02014  J 02248
Z062      BCE  DTLOUT,OF,0        HB1 AND HB2 -- ON OF      02021  B 02248 02538 0
          …  the same block, then MLCS ZERO,OF              02033-02236
* -- 12. DETAIL OUTPUT -------------------------------------------
DTLOUT    CS   PLINE+131                                    02248  / 02831
          CS   PLINE+99                                     02254  / 02799
          MLCA DEPT,PLINE+3       DEPT, FIELD END 004       02260  D 00599 02703 T
          MLCA PART,PLINE+15      PART, FIELD END 016       02272  D 00607 02715 T
          MCS  QTY,PLINE+25       QTY, FIELD END 026        02284  Z 00612 02725
          MLCWA WORD01,PLINE+41                             02295  D 00654 02741 X
          MCE  AMT,PLINE+41       AMT, FIELD END 042        02307  E 00620 02741
          MLCWA WORD03,PLINE+56   12 DIGIT POSNS FOR COMM   02318  D 00682 02756 X
          MCE  COMM-2,PLINE+56    COMM, FIELD END 057       02330  E 00632 02756
          W1   PLINE                                        02341  M %20 02700 W
          BA1  *+1                                          02351  R 02358
          BCV1 Z080               LATCH OF BEFORE MOTION    02358  J 02372 @
          B    Z081                                         02365  J 02384
Z080      MLCS ONE,OF                                       02372  D 00500 02538 3
Z081      CC1  /                  SPACE 1 AFTER PRINT       02384  F /
          BA1  *+1                                          02386  R 02393
          MLCB ZEROS,COMM         FORMAT COL 1 IS B         02393  D 00529 00634 L
          MLCS ZERO,RC01                                    02405  D 00501 02535 3
          B    RDCARD                                       02417  J 00838
* -- 13. LAST CARD AND THE NOT-FOUND PATH ------------------------
LASTCD    MLCS ONE,LC                                       02424  D 00500 02539 3
          MLCS ONE,F1                                       02436  D 00500 02536 3
          MLCS ONE,F2                                       02448  D 00500 02537 3
          B    TOTCAL             THE FINAL TOTAL CYCLE     02460  J 01087
NOTFND    CS   PLINE+131          RECOVERED RUNTIME MESSAGE 02467  / 02831
          CS   PLINE+99                                     02473  / 02799
          MLCA K090,PLINE+20                                02479  D 00807 02720 T
          W1   PLINE                                        02491  M %20 02700 W
          BA1  *+1                                          02501  R 02508
          CC1  /                                            02508  F /
          BA1  *+1                                          02510  R 02517
          B    RDCARD                                       02517  J 00838
* -- 14. END OF JOB ----------------------------------------------
EOJ       CC1  1                  EJECT THE LAST PAGE       02524  F 1
          BA1  *+1                                          02526  R 02533
          H                                                 02533  .
* -- 15. RESERVED AREAS, ABOVE THE CODE -- SEC 8.1 ---------------
          ORG  *+1                THE SLACK THE GM-WM HITS  02535  (slack = 02534)
IND       DA   1X7                THE INDICATOR FILE        02535
RC01           1                                            02535
F1             2                                            02536
F2             3                                            02537
OF             4                                            02538
LC             5                                            02539
FSTPG          6                                            02540
PRIME          7                                            02541
CDIN      DA   1X80               THE 1402 CARD IMAGE       02542
C001           1                                            02542
C003           3                                            02544
C006           6                                            02547
C014           14                                           02555
C019           19                                           02560
C027           27                                           02568
          ORG  02700              HUNDREDS BOUNDARY FOR CS  02700
 PLINE    DS   132                                          02700
PLGM      DC   @⧧@                MARKED AT RUN TIME BY SW  02832
          END  START                                        02833
```

**Four things in that listing that read as errors and are not.** Each was raised against an earlier
draft of this section and each is answered by the run rather than by argument.

1. **`ZA AMT,COMM-6` shows an op character of `&`, and that is correct.** `resolve('ZA').opChar`
   is `?` (`opcodes.md` §2 row 072, `src/core/isa/table.ts`), and **the 1403 prints `?` as `&` on
   chain A** (`charset.md` §5, `printer1403.ts:123`). The listing is rendered through the chain, so
   `&` is what a period listing would show. §9 now says this in the paragraph whose job it is. The
   same rendering is why every `BA1 *+1` shows a bare `R <addr>` with no d: `BA1`'s d is
   `RX_RELEASE_D_GLYPH`, the group mark (`dmods.ts:436`), and the group mark is one of the twelve
   codes **neither** 48-character chain can print, so it prints blank (§9).
2. **The DA sub-entry addresses and the instruction B-addresses agree exactly**: `RC01` 02535 and
   `MLCS ONE,RC01` → `D 00500 02535 3`; `PRIME` 02541 and `MLCA IZERO,PRIME` → `D 00515 02541 T`;
   `FSTPG` 02540 and `MLCS ONE,FSTPG` → `D 00500 02540 3`; `C006` 02547 and `MLC C006,DEPT` →
   `D 02547 00599 C`. An earlier draft of this exhibit was
   internally inconsistent by two positions, because it put the slack position and `IND` at the same
   address. The run does not.
3. **The DA sub-entry operands start in column 21**, not aligned under the header's operand. Two
   blanks end the operand field (§5.1), so a "tidier" alignment would parse the relative position as
   a comment and flag every sub-entry.
4. **Every card is inside the 64-glyph alphabet.** A `bcdOfGlyph` sweep of all 270 cards reports
   zero rejects. No `=`, `(`, `)`, `'` or `─` in any comment; `+` appears in `*+1` and `PLINE+131`
   and is normalised to `&` by `SOURCE_PLUS_IS_THE_12_PUNCH` before the card is stored.

**Seven details on that program are traps, not decoration, and each is a named test:**

1. **The first record branches to `DTLCAL`, not to the heading section.** `cycle-first`'s
   illustrative cycle branched past the detail-time calculations on the first card, so the first
   invoice never entered the accumulator and every `DEPT TOTAL` was short by one — the buildability
   judge found it and required the plan not ship the sketch uncorrected. It is corrected: the first
   record sets `PRIME`, rolls the save areas forward, and branches to **`DTLCAL`** (01013 →
   `J 01732` in the listing above), which falls through detail-calc → heading → detail-output, so
   `1P` still prints its heading before the first detail line. `test/rpg-cycle.test.ts` asserts the
   first card's amount reaches `DTOT`. The ordering it depends on —
   `HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION` — has no source and therefore has a §15 row.
2. **`MLCB` for a reset, `MLCA` for a clear, and `ZEROS` is cut to the longest field it resets.**
   `MLCB ZEROS,DTOT` terminates on the **destination's** word mark, so one shared `ZEROS` serves a
   10-position accumulator; `MLCA` would move the *source's* characters and overrun. But the mirror
   hazard is real too: `MLCB` reads the **source** until B's mark, so `ZEROS` must be at least as
   long as the longest marked field the deck resets. The demo's `B` entries reset `DTOT`/`DCOM`
   (10), `RTOT`/`RCOM` (10), `GTOT`/`GCOM` (12) **and `COMM` (14)**, so `ZEROS` is **14** — an
   earlier draft carried 12 and would have read two characters below it. The other mirror case is
   the indicator file, which has **no** marks at all (bare-`lo` sub-entries), so it is
   cleared with `MLCA IZERO,PRIME` and the **source** terminates the move. All three are asserted.
3. **The card image carries no word marks.** `CDIN DA 1X80` with bare-`lo` sub-entries emits nothing
   and marks nothing; extraction is `MLC <Cnnn>,<field>` into a word-marked destination. §8.1
   item 2 is why, and `test/rpg-layout.test.ts` asserts the DA emits no cells.
4. **`BCV1` sits between the print's `BA1 *+1` and the `CC1` — and only after a detail or total
   print.** Move it after the carriage instruction and the overflow signal is gone — §6.2's
   citation, which is `io.md` §5 Figure 35 (A22-0526-3 p.36), the sentence that covers channels 9
   and 12 together. Asserted by position in the generated source:
   `01266 R 01273` / `01273 J 01287 @` / `01299 F S`. **And asserted by absence**: the program has
   nine `W1 PLINE`s and exactly **four** `BCV1`s — the three total prints and the detail print. The
   two heading prints in `HDGOUT`, the two in the `HB` block and the `NOTFND` message print carry
   no latch, because a heading block skips to channel 1 itself (§2.1, §6.2, §8.2). A generator that
   emitted the latch after every print would add five blocks and fail §11.1 gate 1.
5. **The reserved areas sit above the code and below `PLGM`, with one slack position — AND they do
   not overlap each other.** Move `CDIN` below the constants and `assemble()` returns a **warning**
   and `ok: true`, a silently corrupt deck; §8.1, and §13 criterion 2 asserts
   `warnings.length === 0` for exactly that reason. **The second half is the one no gate can see,
   and this draft got it wrong once**: `ORG 02600` above a `CDIN` running to 02621 put 22 positions
   of `PLINE` inside the card image, and `ok`, `flagged` and `warnings` were all green because `DA`
   and `DS` emit nothing. `ORG 02700` is the boundary the rule gives —
   `ceil((cardIn + 80) / 100) * 100` — and `test/rpg-layout.test.ts` asserts it over the `Layout`
   value (§8.1 item 4,
   `RESERVED_AREAS_ARE_PAIRWISE_DISJOINT_AND_THE_PRINT_AREA_CLEARS_THE_CARD_IMAGE`). The measured
   historical arrival layout is code to 02533, slack 02534, `IND` 02535, `CDIN` 02542-02621,
   `PLINE` 02700-02831, `PLGM` 02832, GM-WM 02833; BUILD-LOG-5's Re-cut 3 is current.
6. **`=` is not in the 64-glyph alphabet; `:` is.** An early draft of this program assembled with
   `F` flags every one of which was in a comment card, and the characters were `(`, `)`, `=` and the
   em-dash — not `=` and `:`. `bcdOfGlyph(':')` returns 13; the colon stores cleanly and prints
   blank (§9). §5.1 has the corrected statement, and `test/rpg-card.test.ts` round-trips every
   generated card through the shipped `readSource`.
7. **The multiply's B field is `[ multiplier image | product area ]`.** `ZA AMT,COMM-6` puts the
   8-digit multiplier at the high-order end of a 14-position field and `M K002,COMM` runs against
   it. `ZA AMT,COMM` — the obvious spelling, and the one an earlier draft carried — would put the
   image in the product area and leave the positions the multiply reads as zeros, printing a zero
   commission on every line into a **frozen** page golden. §8.2 writes the sequence out;
   `test/rpg-calc.test.ts` asserts the two instructions' B-addresses, not just their presence.
   **Two companions travel with it, both of which the assembler cannot see.** The half adjust is
   `A FIVE,COMM-1` — position 02, the highest position the position-adjust drops; `COMM-2` would
   land on a surviving digit and print every commission five cents high (§8.2, §10.3's sixth
   re-cut). And the detail commission edits through **`WORD03`**: `MCE COMM-2,PLINE+56` presents a
   **twelve**-position A field, and A22-0526-3 p.31 forbids a data field longer than the control
   word's blank-and-zero body — `WORD01`'s eight would have silently truncated it.
   `test/rpg-output.test.ts` asserts the A-length against the body count for **every** `MCE` the
   generator emits (§10.2).

### 10.5 The other three decks

- **`demos/cycle-probe.rpg`** (**wave 4's spec deck, wave 5's data cards and page golden**) —
  engineered so **every stage of the cycle prints one labelled line**: total output, heading output
  on `1P`, detail output, the overflow reprint and the last-card grand total. Its printed page reads
  as a **transcript of the RPG logic cycle**, which turns the phase's hardest invariant into a
  diffable artifact. It also exercises the **double-space straddle** of §6.2 explicitly, and records
  the result against `CARRIAGE_SENSES_AT_DESTINATION_ONLY` rather than patching `src/core/**`.
  **Its page golden lands in wave 5, not wave 3, and the reason is that wave 3 has no producer for
  a page.** `driver()` returns `Map<CycleSection, Stmt[]>`; every section that carries a print block
  or an arithmetic step comes from `output.ts` and `calc.ts`, which are wave 5's, and a runnable
  object deck for the probe can only come from `generate()`, also wave 5's. A golden frozen in wave
  3 would be a golden nothing in wave 3 produced. It keeps its anti-tautology weight the same way
  `sales-summary`'s does: **wave 5 commits the probe's own print-position column map to
  `BUILD-LOG-5.md` before it authors the page**, exactly as §10.2 requires of wave 1, so the page is
  still a design rather than a transcript of whatever the generator emitted.
- **`demos/card-list.rpg`** (wave 5) — **REQUIRED GRAFT from `report-first`, demanded by two
  judges.** One record type, no control fields, no editing, three detail fields, one heading line,
  ~12 spec cards, with its own small hand-authored page golden. The probe proves **coverage**;
  card-list proves **generality** — it is the only structural defence against a generator that is
  really a transcription of the one report it was written for.
- **`demos/stress/*.rpg`** (wave 5) — the five stress decks of §11.2.

---

## 11. Waves, each closed by its oracle

Build order is deliberately **backwards from the consumer**, exactly as Phase 3's was: wave 1 lands
the finished object program — hand-written, assembled, loaded and printed — before a single
specification card is parsed. That proves the hardest thing earliest and stops the generator from
being judged against whatever its own front end happens to produce. Every later wave converges on an
artifact an earlier wave produced by hand, and **no wave's oracle reads a file a later wave writes.**

| Wave | Files owned this wave | The oracle that closes it |
|---|---|---|
| **0 — the bounded primary read** (no code) | a dated `## 10. Phase 5 wave-0 primary read` section appended to `docs/research/rpg-sources.md`, plus its own `## Wave 0` section in `docs/BUILD-LOG-5.md` (§16), and nothing else | **Two attempts, then stop** — the Phase-1b MCE-gate precedent. **Five targets**, four of them things the column tables do not carry: (a) what `F1`-`F6` are; (b) the cycle ordering — total time versus detail time on a level break, `1P`, `LC`, `OF`, and `HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION`; (c) whether the Format sheet's edit control word is A24-1403's, over J24-0215-2 pp.10-44, whose PDF is on bitsavers and whose §6 columns were already read from it; (d) **the PR-108 generated-program skeleton at bytes 501,525-539,427**, decoded by `rpg-sources.md` §4.1's proven recipe — the only primary evidence in existence about the shape of the program this phase generates, which all three architects missed; and (e) **which column of a three-column condition group carries the negation**, over the same pp.10-44 — `CONDITION_GROUP_IS_NOT_PLUS_TWO_DIGIT_INDICATOR`, which §5.2 and §15 both call a wave-0 target and which an earlier draft of this row left off the list, so the one thing that is cheap now and *"not cheap after wave 4 freezes the demo"* would never have been read. **Closes by recording what was read (or that the read was attempted and failed) and by FREEZING §15's ledger for the rest of the phase**, so the build cannot quietly acquire new unverified rulings. Nothing above the new section is edited; a correction to anything above it is an escalation with its own commit. |
| **1 — the target program, hand-written and run** | `demos/sales-summary.asm`, `demos/sales-summary.data.cards`, `test/golden/sales-summary.page.txt`, `test/tier4-rpg-target.test.ts`, `test/rpg-printarea.test.ts`; the §10.2 column map committed to `docs/BUILD-LOG-5.md` **before** the golden. **Zero `src/rpg/**`.** | The whole machine, and it retires the ambiguities the manuals leave: `MCS`'s and `MCE`'s B-addressing, the GM-WM that terminates `W1`, `CS`'s hundreds boundary, and whether the layout rule really yields zero warnings. **(a)** `assemble(demos/sales-summary.asm)` → `ok === true`, `flagged` empty, **`warnings` empty** (§6.3). **(b)** `loaderDeck()` + the real 1402 + the real condensed loader + the real 1411 → `renderGreenBar(paper, { chain: 'A', formLines: 66 })` equals `test/golden/sales-summary.page.txt` **byte for byte**, over two forms so the `\f` shows. **(c)** Phase 3's §11.1 closed loop **appended** as a new case (§11.3). **(d)** the indicator file read out of core at the halt equals a hand-written state table (`LC` on, `F1`/`F2` off after reset, `OF` off, `PRIME` on). **(e)** the per-line print-area snapshot of §11.4. |
| **2 — `Stmt` → card, the memory map, the choke point** | `src/rpg/types.ts` (**including `RpgBug`**, §4), `card.ts`, `layout.ts` (**including `measure`**, §6), `emitio.ts`; `test/rpg-card`, `rpg-layout`, `rpg-emitio`, `rpg-is-dom-free`; **and `test/fixtures/sales-summary.model.ts`, the hand-built `Model` that waves 2, 3 and 4 all read** | **A hand-built `Stmt[]` for the WHOLE of wave 1's program — header and trailer cards included — re-emits `demos/sales-summary.asm`** through `toCard` — **compared against the file AS READ THROUGH `readSource`**, where `+` has already become `&` (§5.1), because `card.ts` writes `&` and a person writes `+` — genuinely non-tautological, because the `.asm` was authored in a wave with no generator in existence. Then `layout.ts`, in the two halves it can actually close (§6): **(a)** `layoutOf(handBuiltModel, n)` for the `n` **measured off that same hand-built `Stmt[]`** matches the addresses `assemble()` actually assigned in wave 1, read out of `AssemblyResult.symbols` and not out of a fixture — `IND` 02535, `CDIN` 02542, `PLINE` 02700, `PLGM` 02832, high-water 02833, core-size code 1; **(a2)** §8.1 item 4's layout invariant asserted over the `Layout` VALUE — the extents `[code, slack, indicatorFile, cardIn, printLine, printGroupMark]` pairwise disjoint and ascending, each at least its content length, and `printLine === ceil((cardIn + 80) / 100) * 100` — run on the hand-built model and on a model whose `cardIn` is pushed across a hundreds boundary, because no assembler gate can see it (`RESERVED_AREAS_ARE_PAIRWISE_DISJOINT_AND_THE_PRINT_AREA_CLEARS_THE_CARD_IMAGE`); **(b)** the fixed-point property, `measure(handBuilt) === n` ⇒ `layoutOf(model, n)` is unchanged by a further pass. **Wave 2 supplies `n` by hand because it owns no emitter**; the wave that owns the emitters closes the loop by supplying it from `driver()` (wave 3 for the ten sections it owns, wave 5 for all seventeen). Plus: every emitted card round-trips through the shipped `readSource` + `cardFields` unchanged (§5.1); and §8.3's three choke-point checks. |
| **3 — the cycle driver and the indicator file** | `indicators.ts`, `cycle.ts` (`CYCLE_ORDER`, `CYCLE_SECTION_LABEL`, `driver`); `test/rpg-indicators`, `rpg-cycle`. **It READS wave 2's `test/fixtures/sales-summary.model.ts` and writes no fixture of its own.** **No demo deck and no golden: wave 3 owns neither `demos/cycle-probe.data.cards` nor `test/golden/cycle-probe.page.txt`, which moved to wave 5.** | Wave 3 closes on what it can actually produce, and the list is exhaustive rather than illustrative. **(a)** `driver(handBuiltModel, layout)` reproduces wave 1's target **over the `Stmt` fields the generator decides** — `{kind, label, indent, op, operands}`, in order, for the sections `driver()` itself owns: `constants`, `init`, `read`, `identify`, `extract`, `controlBreak`, `levelReset`, `lastCard`, `endOfJob`, `areas` — compared against a hand-built expected `Stmt[]` derived from wave 1's target. **`comment` and the `pglin` card sequence are excluded, and the reason is §11.1**: comparing generated source to a person's comment text and card numbering is the byte-for-byte gate §11.1 retired as over-constrained, and it cannot be met by construction anyway — the generator's comment cards read `* FROM PAGE 05 CARD 010` (§4) while the target's read `COMMISSION MULTIPLICAND`. `pglin` is assigned by `generate.ts` (§4's `toCard` row), not by `driver()`, so it is not wave 3's to reproduce. The **seven** sections `driver()` cannot own — `sequence`, `totalCalc`, `totalOutput`, `detailCalc`, `headingOutput`, `detailOutput` and **`notFound`** — carry print blocks and arithmetic steps emitted by `output.ts` and `calc.ts`, which are **wave 5's**; wave 3 asserts that `driver()` returns each of them as an **empty section in the right position**, so the ordering is proved without the contents. **`notFound` is a section precisely so that `lastCard` is not one of them** (§6.2): its four `MLCS`/`B` statements are `driver()`'s and wave 3 reproduces them, while the runtime-message print block that follows is `output.ts`'s. **(b)** the `CYCLE_ORDER` ascending-address property over wave 1's `AssemblyResult.symbols`, using `CYCLE_SECTION_LABEL` (§6.2) — **the hand-written-target half of criterion 9a, and only that half**: 9a also asks it of the generated program and of every deck in §11.2's corpus, and wave 3 has neither a generator nor a corpus. The other half, and the whole of criterion 9b, are wave 5's, in `test/rpg-cycle-corpus.test.ts`. **(c)** the indicator file's allocation, clearing and polarity against wave 1's addresses. **A page golden is NOT in this wave's oracle**, because `driver()` returns statements and printing one needs an object deck. |
| **4 — the four sheets, the RG card, the vocabulary, the diagnostics** | `sheets/columns.ts`, `sheets/read.ts`, `sheets/{input,data,calc,format,control}.ts`, `deck.ts`, `messages.ts`, `model.ts`, `demos/sales-summary.rpg`, `demos/cycle-probe.rpg`; `test/rpg-columns-vs-research`, `tier1-rpg-sheet-columns`, `rpg-columns-is-the-only-place`, `rpg-sheets`, `rpg-deck`, `rpg-messages`, `rpg-vocabulary`, `rpg-model`, `rpg-demo-source` | §7's four table oracles: the **both-directions markdown diff** under its published expansion rule; the hand-built 80-column cards, each test naming its J24-0215-2 page; the **vocabulary partition** in both directions **and on the `Cxx` referent**; the recovered corpus **sliced out of §4.4** — 14 processor strings plus 2 generated-program messages plus §4.5's 5 reserved names, verbatim, with their provenance. Plus **the wrong-column corpus** and **the malformed-deck corpus** (§11.5). Plus `model(parse(demos/sales-summary.rpg))` **deep-equal to WAVE 2's hand-built `Model`** — `test/fixtures/sales-summary.model.ts` (§3.1), which wave 2 writes and waves 2, 3 and 4 read, so no wave's oracle reads a file a later wave writes. That is what makes waves 3 and 4 meet in the middle. **The comparison is over the model MODULO `at`**: §4 hangs a `readonly at: SpecRef` on `control` and on every `RecordType`, `DataField`, `CalcStep`, `OutputLine` and `FieldEntry`, and a `SpecRef` is `{ seqno, sheet, page, cardNo }` — the DECK's identity, not the model's semantics, and wave 4 is the wave that cuts the deck. A named recursive comparator, `equalIgnoringAt(a, b)`, drops every `at` key at every depth and is asserted on itself in `test/rpg-model.test.ts`; **a mismatch anywhere else is a wave-4 deck defect, never a licence to edit wave 2's fixture.** The `at` fields are not left untested — `test/rpg-demo-source.test.ts` asserts every card's cols 76-80 against §10.3's prenumbering, which is where the page-and-card numbers belong. |
| **5 — calculations, output, convergence, and the cross-check** | `calc.ts`, `output.ts`, `generate.ts`, `demos/card-list.rpg`, `demos/card-list.data.cards`, `demos/stress/*.rpg`, **`demos/cycle-probe.data.cards`, `test/golden/cycle-probe.page.txt`**, `test/golden/card-list.page.txt`; `test/rpg-calc`, `rpg-output`, `rpg-generate`, `rpg-cycle-corpus`, `tier3-rpg-generated-equals-target`; **and two declared cross-wave appends — cases added to `test/rpg-printarea.test.ts` (wave 1) and `test/rpg-cycle.test.ts` (wave 3), rewriting nothing of either** | **THE CONVERGENCE GATE, in its relaxed form** (§11.1) — identical object records, identical printed page, and the closed loop; the source diff reported as a warning a wave must explain. Plus the **eight-deck cross-check** (§11.2); plus the **cycle-probe page golden**, authored from a print-position column map committed to `BUILD-LOG-5.md` **before** the page (§10.5) and frozen here; plus `demos/card-list.rpg` printing its own golden, frozen here; plus §8.2's `MLCA`/`MLCWA`-only print-area lint; plus, in `test/rpg-generate.test.ts`, **the `generate()` half of §10.3's demo-deck check** — `generate(demos/sales-summary.rpg)` returns `ok: true` with zero diagnostics — which is wave 5's because `generate.ts` is (§10.3); plus **the generated-program half of criterion 9a and the whole of criterion 9b** in `test/rpg-cycle-corpus.test.ts` — that the corpus as a whole exercises all **seventeen** `CYCLE_ORDER` sections, `sequence` included, via `stress/sequence-error.rpg`; plus the layout fixed point of §6 re-checked with `n` supplied by `driver()` rather than by hand. |
| **6 — the listing, the CLI, the view, the storyboard** | `listing.ts`, `tools/rpg.ts`, `tsconfig.tools.json`, `package.json`, `src/ui/rpg/**`, §3.2's three wiring edits, `test/golden/sales-summary.lst`; `test/rpg-listing`, `test/tier4-rpg-demo.test.ts`; **and the one declared append to `test/rpg-is-dom-free.test.ts` (wave 2) — a NEW required-path case for `src/ui/rpg/session.ts`, now that the file exists, added beside wave 2's skip-with-reason and editing nothing (§3.5)** | §1's storyboard, **headless**, from the spec deck through `RpgSession` to `renderGreenBar(paper)` equal to `test/golden/sales-summary.page.txt` byte for byte — the golden **wave 1 already froze**. Plus the **two** `npm run rpg … --golden` lines — `--page` and `--listing`; **there is no `--source --golden` line, because §11.1 retired the byte-for-byte source comparison and a gate that runs on every commit outranks a prose ruling.** The source diff runs as `npm run rpg -- demos/sales-summary.rpg --source --diff`, which **reports and exits zero**. Plus `assemble(session.handOff().source)` returning `ok: true` with zero flags in node (criterion 13a); plus the browser check (13b) run and recorded by name. |

Commit per wave; Opus adversarial review per wave with fixes applied **before** the commit; then a
whole-branch Opus review before merge. **Gates at every commit** (§12.2), every time, with the
`npm test` and `npm run smoke` counts stated in the commit message and never changed silently.

**Three ownership notes, because per-wave file ownership is the discipline this table exists to
enforce.** (1) `test/tier3-asm-load-equals-memory.test.ts` is a **Phase-3 file**: Phase 5 **appends**
one case in wave 1 (§11.3) and rewrites none, which is the wave-spanning rule Phase 3 wrote into its
own §11 and the one sanctioned edit to an existing test file. (2) `demos/sales-summary.asm` is wave
1's and is **read** by waves 2, 3 and 5; the re-cut protocol below is what stops it becoming a
moving target. (3) **Three Phase-5 test files are APPENDED to by a later wave and rewritten by
none**, and each append is named in both the appending wave's row and here, the way (1) is:
**wave 5** appends cases to `test/rpg-printarea.test.ts` (wave 1's — §11.4 runs it against the
hand-written target in wave 1 and against the generated program in wave 5) and to
`test/rpg-cycle.test.ts` (wave 3's); **wave 6** appends a new required-path case for the second glob entry of
`test/rpg-is-dom-free.test.ts` (wave 2's — §3.5), leaving wave 2's skip-with-reason in place. An
append adds cases; it never edits an existing one, and §3.5 is written so that this one does not.

### 11.1 The convergence gate, relaxed — and the re-cut protocol

**RULING, and it is a correction the testability judge required and the buildability judge
seconded.** `cycle-first`'s gate was `generate(demos/sales-summary.rpg).source === readFile(demos/sales-summary.asm)`,
byte for byte over ~270 human-authored cards. That is **over-constrained**: it gates the generator
on a person's comment text, label spelling and instruction ordering, guaranteeing wave-5 churn and
creating standing pressure to edit the target. **The gate is therefore three properties, not a byte
diff:**

1. **Identical object records.** `assemble(generate(demo).source).deck.records` deep-equals
   `assemble(readFile(demos/sales-summary.asm)).deck.records` — same `loadAddress`, same `payload`,
   same count, in the same order. This is stronger than it sounds: it says the two programs are the
   same *machine*, not merely the same *page*.
2. **Identical printed page.** Both decks, through `loaderDeck()` → the real 1402 → the real
   `Machine` → `renderGreenBar`, equal `test/golden/sales-summary.page.txt`.
3. **The closed loop** (§11.3) over the generated deck.

The **source diff is still computed and still reported** — as a named warning the wave must explain
in `docs/BUILD-LOG-5.md`, not as a failure. And the target may be re-cut, under a stated protocol:

- a re-cut lands in the **same commit** as the change that needed it, with its reason in
  `BUILD-LOG-5.md`;
- a re-cut that moves **any page golden is a defect, not a re-cut** — `sales-summary` is frozen at
  wave 1, `cycle-probe` and `card-list` at wave 5 (§10.5), and it is `sales-summary`'s that carries
  the anti-tautology weight, because it is the only one frozen before a generator exists. The other
  two are each authored from a print-position column map committed **before** the page, which is the
  same discipline applied one wave later and is what stops a wave-5 golden being a transcript of
  wave 5's own output;
- three or fewer re-cuts across waves 2-5 is expected and budgeted; a fourth is a signal that the
  house style in wave 1 was wrong and is reviewed as such.

### 11.2 The cross-check corpus — eight decks, not one

**REQUIRED GRAFT from `sheet-first`, demanded by the testability judge**, because `cycle-first`
shipped two decks and the probe exercises the *same* cycle as the demo, so generality was untested.
Every deck runs the full path — `generate()` → `assemble()` (`ok`, zero flags, zero warnings) →
`loaderDeck()` → the real 1402 → the real `Machine` → `renderGreenBar` — and is asserted against a
hand-authored page or, where a page is not the point, against a named property:

| Deck | What it forces |
|---|---|
| `sales-summary.rpg` | the demo: two levels, total time, multiply with half-adjust, three edit words, overflow, `1P`/`OF`/`LC`, the independent `HB` overflow heading (§10.1) — and the two **legal** forms §11.5's corpus refuses the illegal twin of: a `T` line fired by `LC` rather than by an `Fn` (`T31`), and heading lines on **alphabetic** levels in `HA`-then-`HB` order (§5.2's numeric-only scoping) |
| `cycle-probe.rpg` | one labelled line per cycle stage; the **double-space straddle** of §6.2 |
| `card-list.rpg` | one record type, no control fields, no editing — **generality** |
| `stress/or-conditions.rpg` | a line entry repeated three times with three different condition sets, and a **repeated field entry**; plus **`OF` present in every alternative**, so the *legal* form of §6.4 p.38's rule is exercised here and the illegal form is refused by a §11.5 malformed deck |
| `stress/edit-sign.rpg` | an edit control word with sign control over a negative accumulator — the `MCE` path the demo's all-positive figures never reach |
| `stress/page-boundary.rpg` | overflow landing **exactly** on the channel-12 line, and again one line before and one after |
| `stress/sequence-error.rpg` | an out-of-sequence record under an `SCFx` line, producing the recovered `INPUT REC OUT OF SEQ` at run time. **It is also the only deck that generates the `sequence` section**, which is what makes criterion 9b satisfiable (§6.2) |
| `stress/record-not-found.rpg` | a card whose code matches no record type, producing the recovered `RECORD TYPE NOT FOUND` |

The last two are the only place the **generated program's own recovered runtime messages** are
exercised, and they are asserted verbatim off `rpg-sources.md` §4.4.

### 11.3 Phase 3's closed loop, appended — free, unowned, and it catches word marks

`test/tier3-asm-load-equals-memory.test.ts` already compares, for a program, `applyToStorage(items)`
against the real machine's core after the real loader, over the union of emitted addresses, **word
marks included**, with the surviving GM-WMs computed from the record list. Phase 3 engineered it so
it cannot be a tautology (its §11.1). Phase 5 **appends** the generated program as a further case
and rewrites none — it costs a fixture and nothing else, it is a mechanism-versus-mechanism oracle
so it needs no hand table, and it is the only check in the phase that would catch a stray word mark
in a storage area that the printed page happens not to reveal. `cycle-first` was the only proposal
that took it; both rivals left it on the table.

### 11.4 The per-line print-area snapshot — the missing rung

**REQUIRED GRAFT from `report-first`, demanded by all three judges.** `test/rpg-printarea.test.ts`
snapshots the 132-position print area **immediately before each of the first eight `W1`s** and
compares against a hand-written table. It runs in **wave 1** against the hand-written target and
again in **wave 5** against the generated program — **wave 1 owns the file and wave 5 APPENDS the
second set of cases**, which is ownership note (3) above and is named in wave 5's row.

This is the rung between "the program runs" and "the page matches". Without it, a one-byte
difference in a two-page report is a hunt across ~270 generated statements; with it, it is
"line 6, column 84". It is the cheapest thing in the whole panel.

### 11.5 The diagnostic corpora — because diagnostics are half of what a processor is

**REQUIRED GRAFT from `sheet-first`, demanded by the testability judge**, whose finding was that
`cycle-first`'s diagnostic coverage was the thinnest part of an otherwise strong plan.

- **The wrong-column corpus, ~15 decks.** Each is `demos/sales-summary.rpg` with **exactly one field
  shifted one column** — the Data sheet's field end moved from 24-26 to 23-25, the Input sheet's
  control-field length moved by one, a Format field end one column left. Each must produce
  **exactly one diagnostic naming that column**, and never throw. This is the corpus that proves the
  column table is load-bearing rather than decorative.
- **The malformed-deck corpus: ONE DECK PER DIAGNOSTIC IN THE LIST BELOW, which is twenty-six as
  this plan stands.** A count and a list that disagree is the defect §7.3 exists to prevent, so the
  list is the specification and the number is read off it. **The list is a chosen set, not the whole
  of `model.ts`'s vocabulary, and saying which is the point**: five diagnostics this plan names
  elsewhere are deliberately **not** decks and are asserted as unit cases instead — a `W` entry
  appearing first (§5.2's fourth §6.4 ordering rule) and a Next Line whose type/level disagree are
  `test/rpg-model.test.ts`'s; a card whose column-1 code belongs to an already-closed section and a
  malformed `1301` card raising 10806 are `test/rpg-deck.test.ts`'s; a non-blank `RG` body in
  columns 3-75 (§2.4 item 3) is `test/rpg-sheets.test.ts`'s. A whole deck buys nothing where a
  single card does, and the distinction §7.3 makes load-bearing is that the corpus **states which
  it covers** rather than implying it covers everything. Each deck
  produces exactly one named diagnostic and never
  throws: an undefined field name; a resulting condition colliding across sheets; a `K` entry with a
  field name in cols 29-34; a `W` entry not named `WORDxx`; a field entry before its line; a line
  entry that is not the first entry on the sheet; **heading lines in ascending NUMERIC level**
  — numeric because §6.4's ordering rule is scoped to the hierarchy and the demo's own `HA`/`HB`
  alphabetic pair is legal (§5.2, §15
  `THE_LEVEL_ORDERING_RULE_APPLIES_TO_NUMERIC_LEVELS_ONLY`); a Next Line
  whose cols 8-9 differ from its cols 2-3; an `SB` condition (the 1410 sense-switch refusal, with
  its **A22-0526-3 pp.56-58** citation as the message — the page the sentence is on, not p.98's
  feature table); a Format col-19 stacker digit; a record position above 80; **a non-numeric
  character in a position field** — which is what a deck aiming past 999 would actually punch, and
  which replaces the "record position above 999" case an earlier draft listed: the position fields
  are three columns wide throughout (Input 6-8 and 44-46, Data 24-26, Format 35-37), so 999 is the
  largest value a card can carry and a deck above it **cannot be written**, as §15's own row says;
  a blank Calculation col 49; **a `T` line with no condition at all in cols 20-28** — *not* "no
  `Fn`", because `LC` is in the same `[verified]` condition vocabulary (§6.4 cols 20-22) and the
  demo's own `T31` grand total is fired by it, so the narrower wording would have flagged the
  phase's central artifact (§6.2); a Data field colliding with a published reserved name (a field
  named `EOJ`, §8.4) — **and no deck for a collision with `Znnn`, `Knnn`, `RCnn`, `Cnnn` or `CNn`/`COn`,
  because §6.2's `[verified]` no-digits rule makes one unwritable, which is the whole point of
  §8.4's "derived rather than defended"**; two `PAGENO` fields; a Data field
  name with a digit in it; **an `OF` in some but not all alternatives of an or-group** (§6.4 p.38,
  the rule §10.1 re-cut the demo to obey); **a `Cxx` field source naming no declared record type**
  (§6.2 cols 20-22 — the referent, not just the token); **a multiply whose result length in cols
  8-10 is below §6.3's `≥ multiplier + multiplicand − position-adjust` minimum**; **a blank column 1
  on a spec card**, which `sheets/read.ts` cannot classify as any sheet at all and which is a
  different defect from §1 step 9's blank Print/Punch/Reserved columns; a missing `RG` card; a
  `1405` card; Format cards before Calculation cards; a deck with no output at all; and a spec card
  longer than 80 columns.

---

## 12. Test tiers and gates

### 12.1 Tiers

**Twenty-four files, counted off the table below rather than estimated, and named to the repo's own
convention rather than to this plan's labels.** `test/`
already spells manual-worked-example tests `tier1-*` and its oracle tiers `tier2-` / `tier3-` /
`tier4-`, so the sheet-column file and the convergence loop take those prefixes; everything else
keeps the `rpg-` module prefix, the way `asm-source.test.ts` does. **The tier table below is the
specification and the number is read off it: 6 + 1 + 14 + 1 + 2 = 24.** §11's six wave rows are the
independent second count and they enumerate the same twenty-four distinct files — wave 1: 2,
wave 2: 4, wave 3: 2, wave 4: 9, wave 5: 5, wave 6: 2 — and §3.1's `test/` row carries 24 as well.
`test/fixtures/sales-summary.model.ts` (§3.1, wave 2) is a fixture rather than a test file and is
in none of the three counts. **This count has been wrong in three successive drafts** — "eighteen"
beside a table enumerating twenty-two, then "twenty-three" beside a table enumerating twenty-four —
in a plan whose §7.3 argues that a count disagreeing with its own list is the defect to design
against, so the three-way agreement above is stated rather than assumed.

| Tier | Files | In `npm test`? |
|---|---|---|
| **T0 — table fidelity** (6) | `rpg-columns-vs-research` (§7.2's both-directions diff) · `rpg-columns-is-the-only-place` (§7.1's defined grep) · `rpg-vocabulary` (§7.3's partition, both directions, **and the `Cxx` referent**) · `rpg-messages` (the recovered corpus **sliced out of §4.4**, five reserved names, provenance) · `rpg-emitio` (§8.3's three checks **plus the label-vs-I/O-mnemonic enumeration**) · `rpg-is-dom-free` (`src/rpg/**` **plus `src/ui/rpg/session.ts`** — skipped-with-reason until wave 6 creates it, then a required path, §3.5) | yes |
| **T1 — manual worked examples** (1) | `tier1-rpg-sheet-columns` — every field of every sheet asserted on hand-built 80-column cards, each test naming its J24-0215-2 page | yes |
| **T2 — module properties** (14) | `rpg-sheets` · `rpg-deck` · `rpg-model` · `rpg-layout` (**including §8.1 item 4's disjointness invariant, which no assembler gate can see, and `measure`'s per-statement cross-check against `ListingLine.ct`**) · `rpg-indicators` · `rpg-card` · `rpg-cycle` · `rpg-cycle-corpus` (criterion 9a's generated half and the whole of 9b, wave 5 — §11 wave 3) · `rpg-calc` · `rpg-output` · `rpg-printarea` · `rpg-generate` · `rpg-demo-source` · **`rpg-listing`** (wave 6 — §9's *"no recovered text exceeds the line width"*, and the listing golden's shape) | yes |
| **T3 — the convergence loop** (1) | `tier3-rpg-generated-equals-target` (§11.1) — and the one **appended** case in Phase 3's `tier3-asm-load-equals-memory` (§11.3), which is a Phase-3 file and is not counted here | yes |
| **T4 — the storyboard, and it GATES** (2) | `tier4-rpg-target.test.ts` (wave 1) · `tier4-rpg-demo.test.ts` (wave 6) | **no — they join `npm run smoke`** |

The `tier4-` prefix is not cosmetic and is the one `package.json` keys on: `"test": "vitest run
--exclude 'test/tier4-*.test.ts'"` and `"smoke": "vitest run test/tier4-"`. **A plan that said
"`npm test` covers the RPG demo" would be simply wrong about which command runs it** — the
engineering skeptic's own note — so both tier-4 files are declared as smoke here and in every wave
row.

Every constructed fixture is labelled constructed and tagged `[observed]` at best
(`research/METHOD.md`). All three page goldens and the listing golden are **ours** — no 1410 RPG
listing or report with published output survives (`rpg-sources.md` §3, whole-archive index checked)
— so `RPG_GOLDENS_ARE_CONSTRUCTED` is declared in `test/rpg-generate.test.ts` so a reader can grep
it, each golden's own header says so, and the mitigation is the oracles, not a better golden.

### 12.2 Gates at every commit

```text
npm run typecheck                                            clean
npm test                                                     1494 today + the new tiers, 0 fail
                                                             — the new number stated in the commit
npm run smoke                                                39 today; +tier4-rpg-target from wave 1,
                                                             +tier4-rpg-demo from wave 6
                                                             — the new number stated in the commit
npm run cc01                                                 byte-identical: CC01A, CC01 COMPLETE,
                                                             instruction check at 00322,
                                                             1241 instructions — NEVER MOVES
npm run demo -- --golden test/golden/hello-dad.page.txt      PASS, 348 bytes, unchanged
npm run asm -- demos/hello-dad.asm --listing \               PASS, 2251 bytes, unchanged
  --golden test/golden/hello-dad.lst

# from wave 6, once tools/rpg.ts exists:
npm run rpg -- demos/sales-summary.rpg --page \              PASS
  --golden test/golden/sales-summary.page.txt
npm run rpg -- demos/sales-summary.rpg --listing \           PASS
  --golden test/golden/sales-summary.lst
npm run rpg -- demos/sales-summary.rpg --source --diff       REPORTS, EXITS ZERO
```

**There is no `--source --golden` line, and its absence is a ruling.** §11.1 retired
`generate(...).source === readFile(demos/sales-summary.asm)` as **over-constrained** — it gates the
generator on a person's comment text, label spelling and instruction ordering — and a gate that runs
on every commit outranks a prose ruling, so leaving one here would have reinstated exactly the
target-editing pressure §11.1 exists to remove, against a golden `test/golden/sales-summary.asm`
that §3.1 never created and criterion 12 never listed. `--source --diff` computes and prints the
same diff and **exits zero**; the wave explains it in `docs/BUILD-LOG-5.md` (§11.1). `--source`
alone still writes the generated deck for a human to read.

**What each number becomes.** `typecheck` stays clean. `npm test` is **1494** on `main` today and
grows only by additions — expected ≈1,820 at merge, an estimate `BUILD-LOG-5.md` corrects per wave
with the actual. `npm run smoke` is **39** today and rises twice: wave 1's `tier4-rpg-target` and
wave 6's `tier4-rpg-demo`, expected ≈64 at merge, and **the wave commit message states the new
number** — it is not allowed to change silently, the Phase-3 rule. `npm run cc01` is
byte-identical and never moves: Phase 5 touches no core path, so any movement is a Phase-5 defect
that escaped its own boundary. The two `hello-dad` goldens are **348** and **2251** bytes and must
not move for the same reason — they are in the per-commit gate precisely so an escape fails a gate
rather than a review.

From wave 1 the **`sales-summary` page golden** is checked inside `npm run smoke` — `tier4-rpg-target`
is the file, and `package.json` keys smoke on the `tier4-` prefix. The **`cycle-probe` and
`card-list` page goldens are checked in `npm test`**, by the wave-5 T2/T3 tests that own them, not
by smoke: §12.1's T4 row holds exactly two files and neither is theirs. **Both commands gate every
commit**, so nothing is unguarded; the earlier wording put all three goldens inside smoke, which
was wrong about two of them. The two `npm run rpg … --golden` lines join at wave 6 as the CLI's own
check and as the single sanctioned regeneration path. **`--update` is never part of a gate run.**

Then Opus adversarial review, fixes, one commit, push `feature/phase-5-rpg`. **Never `main`.**

### 12.3 The fixture inventory, checked rather than assumed

There is **no machine-readable 1410 RPG artifact to test against**, and the honest wording is that
rather than "nothing":

- **C28-1443 does not survive**, and `rpg-sources.md` §3 lists every search already run — the
  bitsavers whole-archive index (93,668 entries), archive.org, Google Books, HathiTrust, CHM,
  ibm-1401.info, ed-thelen. **Do not re-run them.** The routes still worth trying, if fidelity ever
  matters more than schedule, are named there: WorldCat directly, the CHM's non-public catalog API,
  the Charles Babbage Institute, Manchester's technical-manuals collection.
- **No scan of X24-1336…1339 exists.** The layout comes from J24-0215-2, on the same form numbers.
- **What does survive and is used**: the four sheets' columns (§7), the **sixteen** recovered
  operator and generated-program messages — 14 in §4.4's code block plus 2 named in its prose — and
  the five reserved names (§4.4, §4.5), and — **wave 0's fourth
  target** — the generated-program skeleton in symbolic Autocoder card-image form at bytes
  501,525-539,427 of `jpr108-2024.bcd`, with the decode recipe proven in §4.1.
- **The named recovery path, unbuilt:** disassembling `RPGIN` (offset ≈ 1,217,474) is the only route
  to a fully verified 1410 column layout short of C28-1443 turning up. It is out of scope for this
  phase and is recorded in §15 as the fallback trigger for
  `RECORD_POSITION_IS_THREE_DIGITS`.

---

## 13. Exit criteria — §1's storyboard, mechanically checkable

1. `npm run typecheck` clean; `npm test` green at its stated new count; `npm run smoke` green at its
   stated new count; `npm run cc01` byte-identical (CC01A, CC01 COMPLETE, check at 00322, 1241
   instructions); `npm run demo -- --golden test/golden/hello-dad.page.txt` PASS at **348 bytes,
   unchanged**; `npm run asm -- demos/hello-dad.asm --listing --golden test/golden/hello-dad.lst`
   PASS at **2251 bytes, unchanged**.
2. `assemble(readFileSync('demos/sales-summary.asm'))` returns **`ok: true`, `flagged` empty and
   `warnings` empty** — all three, because `ok` alone is green on a deck whose loader-planted GM-WM
   sits inside the input area (§6.3). Zero warnings is §8.1's layout rule working, and a warning
   here is a defect, not a note. **And zero warnings is NOT sufficient**: §8.1 item 4's
   disjointness invariant is invisible to `assemble()` because `DA` and `DS` emit nothing, so
   `test/rpg-layout.test.ts`'s assertion over the `Layout` value is the criterion's second half.
   The plan's own draft already meets both (§10.4).
3. `generate(readFileSync('demos/sales-summary.rpg'))` returns `ok: true` with **zero diagnostics**,
   and `assemble(result.source)` returns `ok: true`, `flagged` empty, `warnings` empty.
4. **The convergence gate (§11.1):** the generated deck's `ObjectRecord[]` deep-equals the
   hand-written target's — same load addresses, same payloads, same order; the source diff is
   reported and explained in `BUILD-LOG-5.md`, not asserted.
5. Both decks, through `loaderDeck()` + the real 1402 + the real condensed loader + the real
   `Machine`, render `renderGreenBar(paper, { chain: 'A', formLines: 66 })` equal to
   `test/golden/sales-summary.page.txt` **byte for byte**, across **two forms separated by `\f`**,
   with a `DEPT TOTAL … *`, a `DISTRICT TOTAL … **`, a repeated heading group carrying `PAGE   2`,
   and a `GRAND TOTAL … ***`.
6. `demos/cycle-probe.rpg` prints `test/golden/cycle-probe.page.txt` byte for byte, and
   `demos/card-list.rpg` prints `test/golden/card-list.page.txt` byte for byte. **No golden has
   been edited since the wave that froze it** — `sales-summary` at wave 1, the other two at wave 5
   (§10.5) — checked by `git log --follow` at close-out. Each page golden's own header names the
   `BUILD-LOG-5.md` section carrying the print-position column map it was authored from; **that
   section exists in the golden's own commit or in an earlier one, and it has not been edited in
   any commit AFTER the golden's** — `git log --follow` over both paths, in that order.

   **The earlier wording said the map's commit is *earlier* than the golden's, and that is
   unsatisfiable on a correct build.** §11 commits **once per wave** (§11's footer, §12.2's closing
   line), wave 1 owns both §10.2's column map and `sales-summary.page.txt`, and wave 5 owns both the
   probe/card-list maps and their two pages — so for all three goldens the map and the page land in
   the **same** commit and "earlier" is false every time. §11.1's re-cut protocol pushes the same
   way (*"a re-cut lands in the same commit as the change that needed it"*). The map-before-page
   discipline is R4's whole answer to *"the goldens are ours"*, so the criterion is restated to
   what a single commit can actually prove — the map is present and has not moved since — rather
   than relaxed into nothing or bought with a second commit per wave that §11 would then have to
   carve out. **The ordering that matters is authorial, and it is enforced by §11's wave rows
   ("the §10.2 column map committed to `docs/BUILD-LOG-5.md` **before** the golden"), reviewed in
   the wave's own Opus review, not by a timestamp.**
7. The eight cross-check decks of §11.2 all pass their stated assertion; the ~15 wrong-column decks
   each produce **exactly one** diagnostic naming their column; the malformed corpus carries **one
   deck per diagnostic in §11.5's list — twenty-six as this plan stands, with the five diagnostics
   that are unit cases rather than decks named there too** — and each produces
   exactly one; **nothing throws** in a single deck of any of the three corpora. The malformed
   count is read off §11.5's list rather than written down twice, for the reason §7.3 gives.
8. Phase 3's `tier3-asm-load-equals-memory` passes with the appended case: core over the union of
   emitted addresses — characters **and word marks** — equals `applyToStorage(items)`, and the only
   extra bytes are the surviving GM-WMs computed from the record list.
9a. **Every section `CYCLE_ORDER` names THAT THE MODEL GENERATES** appears in
   `AssemblyResult.symbols`, under the label `CYCLE_SECTION_LABEL` gives it (§6.2), at **strictly
   ascending addresses in `CYCLE_ORDER` order** — for both the hand-written target and the generated
   program, and for every deck in §11.2's corpus. It is conditional on generation because it has to
   be: the demo has no `SCF` line, so `SEQUENCE_CHECK_IS_GENERATED_ONLY_WITH_AN_SCF_LINE` (§15)
   makes its `sequence` section empty, and a flat "all seventeen" invariant would be unsatisfiable for
   the phase's central artifact. Measured on the current draft: sixteen of the seventeen sections,
   00500 → 02535, strictly ascending (§10.4). **Wave 3 delivers the hand-written-target half only**
   — it has no generator and no corpus — and `test/rpg-cycle-corpus.test.ts` (wave 5) delivers the
   generated-program half and every deck in the corpus (§11 waves 3 and 5).
9b. **And conditionality is not a hole.** Across §11.2's eight decks, **each of the seventeen sections
   is generated by at least one deck** — the union is checked, not each deck. `sequence` is carried
   by `stress/sequence-error.rpg`, which is the only deck with an `SCFx` line; the test names, for
   every section, the deck that covers it, so a section that quietly stops being generated anywhere
   fails a gate rather than disappearing. It lives in `test/rpg-cycle-corpus.test.ts`, wave 5's, so
   the criterion has an owning file in the wave that must satisfy it.
10. §7's four table oracles pass: the both-directions markdown diff with its published expansion
    rule; §7.1's defined "no column literal outside `columns.ts`" grep; the vocabulary partition in
    both directions **including the `Cxx` referent**; and the recovered corpus **sliced out of
    `rpg-sources.md` §4.4 rather than counted** — 14 processor strings plus the 2 generated-program
    messages plus §4.5's 5 reserved names — with every `recovered-1410` message carrying a §4.4
    byte-offset cite.
11. §8.3's three choke-point checks pass: the import test **in both halves — the negative one over
    all four tables, the positive one over `CARRIAGE_D_TABLE` alone**, the computed string-literal
    lint, and the runtime subset check over both demo decks.
12. `git diff --stat main` touches nothing on §3.4's list. The only non-owned files changed are
    `src/ui/autocoder/sourceBox.ts` (+~6), `src/ui/autocoder/mount.ts` (+~2),
    `src/ui/internals/main.ts` (+3), `tsconfig.tools.json` (+1), `package.json` (+1),
    `test/tier3-asm-load-equals-memory.test.ts` (**additions only**, §11.3 — the one carve-out from
    §3.4, stated in both places), and **`docs/plans/phase-5-rpg.md` itself, added by the arrival
    commit** (§16) and edited by no wave — it is untracked on `main`, so `git diff --stat main`
    shows it as an addition and §3.4 carves it out by name. Every file §3.1's owned list names may of course change, and
    §3.1's list is the one that must contain **`src/rpg/listing.ts`** — a wave-6 worker creating a
    module §3.1 never sanctioned is exactly what this criterion catches. **Plus
    `docs/research/open-questions.md` and `docs/research/rpg-sources.md`, whose diffs are confined
    to their appended dated sections** (criterion 14 requires the first; wave 0 owns the second).
    Nothing else.
13a. **Automated, and it is the hand-off:** `assemble(session.handOff().source)` returns `ok: true`
    with zero flags and zero warnings in node, and `parseDeck(session.handOff().dataCards)` yields
    the expected card count with zero `DeckError`s. That is everything SEND TO AUTOCODER does except
    the two lines of DOM plumbing.
13b. **The browser check — the only one that needs a human at a screen.** In `npm run dev`: §1's ten
    steps produce the sales register on the green bar; the per-sheet ruler redraws when the caret
    moves from a `C` card to an `L` card; GENERATE on a broken deck shows the recovered message and
    disables SEND TO AUTOCODER; SEND TO AUTOCODER fills both Autocoder boxes; ASSEMBLE reports zero
    flags; PUNCH INTO HOPPER fills the deck box; and the page break appears on the green bar with
    `PAGE   2`. `BUILD-LOG-5.md`'s wave-6 section records it as run, by name.
14. **Mechanical half, and it is a command:** a dated `## Phase 5 — 2026-…` section exists in
    `docs/research/open-questions.md`, and **every `// OPEN:` constant name grepped out of
    `src/rpg/**` and `src/ui/rpg/**` has a matching row in `PHASE-5-NOTES.md` §1** — a grep, a sort
    and a set difference that must be empty in both directions. **Review half:** whether each of
    those rows says the right thing — the fallback actually taken, the consequence, the escalation —
    is judged in the whole-branch review before merge, not by a command, and is listed there rather
    than pretended to be a gate.
15. `docs/research/rpg-sources.md` carries a dated `## 10. Phase 5 wave-0 primary read` section
    recording what wave 0 read **or that the read was attempted and failed**, and nothing above it
    is edited. If wave 0 settled a §15 row, that row says so and carries the new tag.

---

## 14. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Size.** ~3,670 source + ~450 UI + ~170 CLI + ~2,420 test lines (24 test files plus one shared fixture) and seven waves, against Phase 3's ~4,450 and six. | Named rather than hidden. The overrun is the **sheets**: four specification sheets are four parsers plus a column table plus a deck scan, and none of them can be shared. There is **no second implementation of the RPG cycle** — the panel's largest proposal shipped one and was penalised for it — and wave 0 carries no code at all. Per-wave file ownership and a per-wave commit keep the review surface Phase-3-sized even though the phase is not. |
| R2 | **The generated program's shape is wrong and nobody finds out until wave 6.** | The whole reason for the ordering. Wave 1 hand-writes the target and **runs it on the real machine** before a line of generator exists; if the cycle is wrong it is wrong in wave 1, in a file a person wrote, with the printed page in front of them. This plan's own draft already assembles clean — `ok: true`, 0 flagged, 0 warnings, 39 condensed cards, entry 00808 (§10.4, which pastes the run's own listing columns and names the durable path the draft is committed at). |
| R3 | **The target gets edited to match the generator.** | The three page goldens are **frozen** at wave 1 (`sales-summary`) and wave 5 (`cycle-probe`, `card-list`) and never edited; §11.1's re-cut protocol requires the same commit, a stated reason, and an unchanged page; a re-cut that moves a golden is a defect. Criterion 6 checks the freeze with `git log --follow`. |
| R4 | **The page goldens are ours, so one could be "fixed" to match a bug.** Phase 3 sidestepped this by gating on a golden it did not own; Phase 5 cannot. | Four independent legs, not one: every page is authored **from a print-position column map committed before it** — §10.2's for the demo in wave 1, before either producer exists, and the probe's and card-list's in wave 5 before the generator runs them (§10.5); the hand-written target and the generator are written four waves apart; the closed loop (§11.3) compares storage rather than paper; and the cross-check corpus (§11.2) makes over-fitting to one report fail on seven other decks. **The honest cost of moving the probe's golden out of wave 3 is stated rather than hidden**: only `sales-summary`'s page is frozen before a generator exists, so it alone carries the full anti-tautology weight, and the column-map-first rule is what the other two substitute for it. |
| R5 | **`assemble()` returns `ok: true` on a silently corrupt deck.** Verified live: `warnings` is a separate array `ok` never consults, and a GM-WM landing inside a reserved area or inside program text is exactly that case. | The gate is `ok` **and** `flagged` empty **and** `warnings` empty, in every wave row and every exit criterion; §8.1's layout rule is what makes zero warnings achievable; §10.4 trap 5 is the test that fires if the layout is ever reordered. |
| R6 | **A wave test that asserts "it did not throw."** The assembler never throws on source content and neither does the generator, so such a test passes on garbage — and because pass 1 keeps assigning addresses through a flagged line, downstream addresses stay plausible and a later golden **drifts** instead of failing at the cause. | §6.3 states the rule once; every wave row and every criterion asserts on `ok`, on `flagged`, on `warnings`, and on the `ListingLine.instruction` strings the wave owns. |
| R7 | **RPG II creeps in.** Every modern reader knows RPG II's vocabulary and half of it is wrong for 1961. | §7.3's both-directions partition test, built on §4.3's `[verified]` phase-name reading, which is the `asm-pseudo-ops.test.ts` mechanism that made Phase 3's scope gate live from its first commit. |
| R8 | **A 1401 machine fact rides in with the 1401 sheet layout.** | §2.4's **eight** items, each with both citations: the H/L special feature (1), the multiply-divide feature (2), the `RG` card (3), Format col 19's stacker (4), the reserved-name evidence table (5), **the provenance rule every one of them relies on (6)**, Card-RPG's identity (7), and the deck-order tag (8). §2.4's preamble names the same eight, so the section states its own contents by a number that is right. Every claim in the plan says which machine and cites a form number and page; the reviewer diffs against §2.4. |
| R9 | **The generated program outgrows 10K.** A generated program is fatter than a hand deck. | `layout.ts` computes the high-water mark on pass 2, from the model and the measured code length (§6), and picks the `CTL` core-size code from it; `assemble()` independently flags any assigned address above that size. The draft target's high-water is **02833** against 10,000, measured (§10.4), so the headroom is real and not assumed. |
| R10 | **Word-mark pollution in the print line.** `MLCWA` plants an edit word's mark; a later bare `MLC` terminating on the first mark in either field would truncate a field. | The generator emits only `MLCA` / `MLCWA` into print-area symbols and wave 5 carries a lint that says so; `MCE` removes the control word's mark on scan 1 (A22-0526-3 pp.31-33); the two `CS` clear data **and** marks at the top of every line. |
| R11 | **Overflow silently never fires.** `CARRIAGE_SENSES_AT_DESTINATION_ONLY` means the carriage senses only at the destination line, so a double-spacing line can step 59 → 61 past the channel-12 punch at 60. | The demo single-spaces its detail lines so its overflow lands on the punch; `demos/cycle-probe.rpg` exercises the straddle **explicitly**; the result is recorded against the Phase-2 constant in `open-questions.md` and **escalated**, never patched in `src/core/**` — the `RW#` / `WM#` / `loader.ts` precedent. |
| R12 | **Generated Autocoder trips a Phase-3 open constant, and the temptation is a small fix in `src/asm`.** | Named in advance: `DA ,G` and `,#` flag `F`; `DA` emits only its marked positions; a marked group mark in a `DCW` flags `F`; `EQU` to an x-control field is out; **a label defined twice flags `M` on the second definition**, which is why §8.4's namespace rule keeps the card sub-entries (`Cnnn`) disjoint from the sheet's own field names; **two blanks end the operand field**, so a generated card's operand starts at column 21 with no interior double blank (§5.1). `layout.ts` uses only `DCW` / `DC` / `DS` / `DA` with bare-`lo` sub-entries and never a `,G`; the group mark is a `DC` plus a run-time `SW`, Phase 3 §2.4's own remedy, which §10.4 confirms assembles with no flag. `src/asm/**` is do-not-touch **because it is the oracle**. |
| R13 | **UI wiring discovered mid-build.** | §3.2's three edits across three files, enumerated with their bodies and their line counts, and nothing else outside `src/rpg/**`, `src/ui/rpg/**` and new files may be touched. Exit criterion 12 pins the diff to those files. This risk fired once in Phase 3 and the cost was found in review of the plan, not in the build. |
| R14 | **Scope creep into the period UI.** | The RPG view is unstyled, reuses `.green-bar`, edits no CSS, and hands off through a typed method to a box Phase 3 owns. The per-sheet ruler is the only visual invention and it is thirty lines; Phase 4 draws the actual form the ruler already describes. |
| R15 | **The Phase-2 and Phase-3 goldens move.** They must not: Phase 5 touches neither path. | They are in the per-commit gate for exactly that reason (348 bytes, 2251 bytes, cc01 byte-identical), so an escape from the phase boundary fails a gate rather than a review. |
| R16 | **The phase quietly re-litigates settled ground.** | Macro-free open-coded output, KISS peripherals, `DA hi,lo` only, host-side generation, the core/UI split, the build order and the settled I/O statement form are all settled; §2 restates each with its `DECISIONS.md` or `PHASE-3-NOTES.md` citation and takes no position on any of them. |

---

## 15. `[unverified]` / `[likely]` items — each with its `OPEN:` constant and fallback

Every row is a named exported constant with an `// OPEN:` comment at the point of use and a row in
the dated Phase 5 section of `docs/research/open-questions.md`, added in the wave that first depends
on it. **The ledger is FROZEN at the close of wave 0** (§11): a ruling that is not in this table
after wave 0 is a plan deviation and is logged as one in `PHASE-5-NOTES.md` §2.

| Constant | Tag | The claim | Fallback if overturned |
|---|---|---|---|
| `RECORD_POSITION_IS_THREE_DIGITS` | `[unverified]` | `rpg-sources.md` §5 is the source and it poses **three** alternatives, not one, and the plan quotes them rather than paraphrasing: *"Either (a) the shared X24 forms are literally the Card-RPG forms and Full-RPG used something wider, or (b) Full-RPG accepted 3-digit positions and capped record addressing at 999, or (c) a column was redefined."* The evidence pointing at (a) is the bibliography's own wording, *"for use with the Report Program Generator for IBM 1401/1410 Card Systems"* (A22-6826-4 Part 3, ≈p.14, `[verified]`). **We build the `[verified]` shared-form 3-digit spans, which is compatible with (a) and (b) and INCONSISTENT with (c); we take no position between (a) and (b), and (c) would be a research correction rather than a plan change.** Claiming neutrality on all three would be the same class of error §2.4 item 3 calls out — implementing the transcribed spans verbatim *is* a decision against "a column was redefined", and §2.2's actual argument (an 80-column card cannot address past position 80) disposes of the Full-RPG *width* question (a) and (b) raise while saying nothing about (c). Positions above 80 diagnose *"no such card column"* on an 80-column 1402; positions above 999 **do not fit the field**, which is why §11.5 has no deck for them (a deck aiming past 999 punches a non-numeric, and that is the case in the corpus). | §8's own `[recommendation]`, verbatim: cap at 999 and emit *"unsupported: requires C28-1443"* above it, *"rather than inventing a 4- or 5-digit field"*. **The real alternative, and it is a different behaviour rather than a restatement:** widen the spans in `sheets/columns.ts` — one table, one place, six numbers — **if and only if** C28-1443 surfaces or someone disassembles `RPGIN` (offset ≈ 1,217,474 in `jpr108-2024.bcd`, §8's named recovery path) and shows Full-RPG did. |
| `RG_CARD_BODY_IS_NOT_READ` | ruling, on `[verified]` absence | The card's **existence** and its five failure messages are `[verified]` off the PR-108 tape (§4.4, §5); **no column layout survives**, §5 tags the machine-size encoding `[unverified]`, and §6.5's 1401 `CNTL` layout is headed *"Superseded on the 1410"* with core codes that cannot express a 1410. So `RG` in columns 1-2 identifies the card and **nothing else is read**. **The body is columns 3-75, and columns 76-80 are NOT body**: **the two candidate readings of that span disagree** — on the four sheets it is the page-and-card identification (§6), and on the 1401 `CNTL` proxy it is *"program identification punched into the symbolic object deck"* (§6.5). Those are not the same job, and a span whose only two witnesses contradict each other is one to refuse rather than to read. (An earlier draft of this row said they were *"the same span doing the same job"*, which is a stronger claim than either source supports and a weaker argument than the disagreement itself.) Saying so is not inventing a column — it is refusing to read one — and without it the demo's own `RG` card, which carries `02010` in 76-80, would fire the very diagnostic criterion 3 requires it not to. **The demo's card is page 02, not page 01**: §6.1 and §6.4 both record `[verified]` that *"Spacing chart is page 01"*, so page 01 is a sheet the programmer draws on and never punches, and §10.3 numbers the whole deck 02-07 behind it. A non-blank body in 3-75 is diagnosed; 10802 and 10805 fire on absence and on a malformed card; and the object core-size code comes from `layout.ts`'s high-water mark against Autocoder `CTL`'s `[verified]` 1 = 10K … 5 = 80K. `rpg-sources.md` §1 item 5 and §8: **do not invent columns.** | If C28-1443 surfaces, adopt its layout wholesale in `sheets/control.ts` — one module, ~70 lines. The rejected alternative is naming an invented layout as invented, which two of the three proposals chose and which is not the same as not inventing. |
| `F1_TO_F6_ARE_THE_CONTROL_LEVEL_INDICATORS` | `[unverified]`, **wave-0 target** | §6.3 and §6.4 list `F1`-`F6` in the condition vocabulary of both the Calculation and Format sheets and never define them; §6.1 defines exactly six control fields in ascending significance. Ruled: `Fn` = "control field *n* broke", and the generated labels are literally `F1`…`F6` so the reading is visible in the listing and in core. | One map in `indicators.ts` plus the six labels. The cycle's fall-through ladder does not move, because the **semantics** of a control break do not depend on what the sheet calls it. The alternative reading — six external switches beside the sense switches — would flag them `F` beside `SB`-`SD` and cost the phase its named level conditions. |
| `CONTROL_BREAK_AT_LEVEL_N_BREAKS_ALL_MINOR_LEVELS` | `[likely]` | Universal RPG semantics, but J24-0215-2 is not quoted for it in `rpg-sources.md`. Expressed as a **fall-through ladder** so the semantic is legible in the generated listing. | Each `Znn` gains a branch to the total section: six lines in `cycle.ts`. |
| `TOTAL_TIME_PRECEDES_DETAIL_TIME_ON_A_BREAK` | `[likely]`, **wave-0 target** | Total-time calculations and total lines for every level from most minor up, then the new record's detail time. Implied by the Calculation sheet's `T`/`D` column and by §6.4's `[verified]` *"ascending level for total lines"*, but not stated as a cycle anywhere we have read. | The stated ordering is the only one under which a level-2 total can include the level-1 totals that just printed, which the demo's `DISTRICT TOTAL` requires — so the fallback is a comparator in `cycle.ts::totalOutput()` and a re-cut demo, not a different cycle. |
| `LEVEL_NUMBER_IS_NOT_THE_CONTROL_FIELD_NUMBER` | **`[verified]`, settled — recorded so it is not re-opened** | §6.4, verbatim, from the spacing chart pp.12-16: *"Level number ≠ control-field number."* A Format total line's **level** orders it among the other total lines (§6.4's ascending rule) and does nothing else; what **fires** it is the `Fn` indicator in its own condition columns 20-28. `model.ts` never maps a level to a control field and there is no table to get wrong. | **None wanted.** One panel proposal ruled the identity while quoting this sentence and re-reading it, and all three judges called it the worst move in the panel. If a source ever *does* define a mapping, it is a research correction with its own commit, not a plan change. |
| `INDICATORS_ARE_ONE_CHARACTER_EACH` | `[unverified]` | A modelling choice, not a machine fact: one core position per indicator holding `1` / `0`, so `BCE skip,F1,1` and `BCE skip,F1,0` test either polarity in one instruction. Conditions appear on every calculation line and every output line and field, so the symmetry roughly halves the generated code, and the file is readable in the internals core view. | Bit-pack with `BBE` and a mask — costs `indicators.ts` only; nothing else knows. |
| `ONLY_REFERENCED_INDICATORS_ARE_ALLOCATED` | `[unverified]` | Did the real processor allocate a fixed 00-99 file, or only the conditions the deck names? Ruled: only the referenced ones, contiguous, one `DA` header with a named bare-`lo` sub-entry each, so every indicator is a symbol in the assembler's symbol table and in the listing. | A fixed 100 + 9 file and a 109-character zeros constant — about two more condensed cards and nothing else. |
| `RESERVED_AREAS_SIT_ABOVE_THE_CODE_AND_BELOW_THE_PRINT_GROUP_MARK` | ruling, ours | The layout rule that keeps `warnings` empty (§8.1): constants and code form one contiguous emitted run; one `ORG *+1` slack position follows, **unreserved and unlabelled**; every `DS` / `DA` reserved area sits above it; and **`PLGM`, an emitted cell, sits above them all** because the group mark must land at `PLINE+132` and nothing may be reserved above it — its own tail lands in untouched core. **The constant is named for that exception rather than against it.** The earlier name, `RESERVED_AREAS_SIT_ABOVE_EVERY_EMITTED_CELL`, is **false as written**: a test asserting its literal wording fails on the correct layout, and a reviewer diffing §15 against the code finds a mismatch either way. Named because a wave gate depends on it; the doc comment at the point of use states the `PLGM` exception and its reason. | Enumerate and justify the expected warnings by name in each test instead. That is strictly worse — it makes a silently corrupt deck a matter of judgement — and is the fallback only if a future layout requirement makes the rule impossible. |
| `RESERVED_AREAS_ARE_PAIRWISE_DISJOINT_AND_THE_PRINT_AREA_CLEARS_THE_CARD_IMAGE` | ruling, ours | The companion rule, and the one **no shipped gate can catch**. The extents `[code, slack, indicatorFile, cardIn, printLine, printGroupMark]` are ascending and **pairwise disjoint**, each is at least as long as what it holds (`cardIn` 80, `printLine` 132, `printGroupMark` 1, `indicatorFile` ≥ the deck's indicator count), and `printLine = ceil((cardIn + cardInLength) / 100) * 100` — the first hundreds boundary at or above the card image's **end**, never above its start. Named because an earlier draft of §10.4 rounded off the start and put 22 positions of `PLINE` inside `CDIN` while `assemble()` returned `ok: true`, zero flags and zero warnings: `DA` and `DS` emit nothing, so `pack.ts`'s tail warning, §11.3's closed loop and §11.4's post-`CS` snapshot are all blind to it (§8.1 item 4). | None wanted — it is arithmetic, not a reading of a source. If a future layout ever needs overlapping areas, that is a design change with its own §11.4 snapshot, not a relaxation: the assertion in `test/rpg-layout.test.ts` is the only thing between a wrong boundary and a silently corrupt print line. |
| `PRINT_AREA_IS_HUNDREDS_ALIGNED` | `[likely]` | A modelling choice forced by a `[verified]` machine rule: `CS` clears data **and** word marks right-to-left down to the nearest hundreds position (`table.ts` op `/`, A22-0526-3 p.23), so a 132-position area on a hundreds boundary is cleared by `CS PLINE+131` then `CS PLINE+99` and the group mark at `PLINE+132` is untouched. | `MLCA BLANKS,PLINE+131` from a 132-blank constant — three more condensed cards, and the alignment constraint disappears from `layout.ts`. |
| `GENERATED_READ_TAKES_THE_BAKED_D` | ruling, ours | The generated read is `R1 0,CDIN` — pocket 0, the `R` family's **baked** `d` — and never writes an explicit `$`, because §8.1's layout guarantees no group-mark-with-word-mark inside `CDIN` for a `d = R` read to stop on. The point is that **nothing in Phase 5 then depends on `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS`**, which is `[unverified]` and is open for Zarathustrum (`STATUS.md` 2026-08-31 item b). | `R1 0,CDIN,$` — one field on `IoRequest`, inside the choke point, and nothing else. It becomes necessary only if the layout rule is relaxed. |
| `OVERFLOW_IS_LATCHED_IMMEDIATELY_AFTER_THE_PRINT` | `[likely]` | `BCV` reads a **live** carriage state, not a latch. The supporting sentence is `io.md` §5 (Figure 35, A22-0526-3 p.36), `[verified]`, and it covers **both** channels together: *"Carriage 9 and 12 indicators turn on when their hole is sensed and off when any other carriage-tape channel is sensed."* (`J_D_TABLE`'s `BCV`/`BCV1` row carries only *"Same on/off rule as channel 9"*, `dmods.ts:78`; the longer note quoted in earlier drafts belongs to the **BC9** row, `dmods.ts:74`.) So the test must sit between the print's `BA1 *+1` and any `CC1`. **And it is emitted after a DETAIL or TOTAL output line only** — not after a heading line or a runtime-message line, because a heading block skips to channel 1 itself and sensing overflow across it says nothing. That scoping is not a saving: the target has nine `W1 PLINE`s and four `BCV1`s, and a generator emitting the latch universally would add five blocks and fail §11.1 gate 1 against a frozen target (§2.1, §6.2, §8.2, §10.4 trap 4, which asserts the absences as well as the presences). Interacts with the Phase-2 divergence `CARRIAGE_SENSES_AT_DESTINATION_ONLY`; the demo single-spaces, the probe straddles, the result is recorded not patched. | A generated line counter in core compared against a forms-depth constant: one field in `layout.ts`, one compare in `cycle.ts`. |
| `PAGE_OVERFLOW_IS_CARRIAGE_CHANNEL_12` | `[likely]` | `OF` is the overflow condition; on the 1410 `BCV1` tests carriage overflow, channel 12, answered by `Channel.carriageChannel12` — `J_D_TABLE`, `[verified]`, cited **A22-0526-3 p.36 Figure 35** (`opcodes.md` §6.1, and `dmods.ts`'s own `J_CITE`). **Not Figure 90**, which an earlier draft of this row named: Figure 90 (p.81) is the carriage-control `F` d-table, a different family. **But the carriage tape's channel-12 punch at form line 60 is ours, not the manual's** — `printer1403.ts:205` says so in its own comment, and `DEFAULT_CARRIAGE_TAPE` is itself an `[unverified]` Phase-2 constant. | Same as the row above: a line counter against a forms-depth constant. The sheet layout does not move either way. |
| `EDIT_WORD_IS_THE_1410_MCE_CONTROL_WORD` | `[likely]`, **wave-0 target** | §6.4's cols 48-50 / 51-75 give the **sheet layout** — where the word sits on the card — and J24-0215-2 p.43 says *"editing follows the 1401 program-editing rules in A24-1403"*. **A24-1403 is a 1401 manual nobody in this project has read, so it is not the authority for what the emulator does:** the semantics come from `opcodes.md` §7 and A22-0526-3 pp.31-33 Figures 27-34, and §7's own trap note records that A24-1403-5 Figure 58 and A22-0526-3 Figure 34 trace the **identical** `$bbb,bb0.bb&CR&**` / `00257426` example, differing only in step count and address width. One divergence is noted rather than inherited: single-character edit — the 1401 will not transfer a single-character A field, **the 1410 will** (223-2588-2 p.53, `[verified]`). | Zero-suppress only: Format col 47's `Z` is implemented and cols 48-75 flag a diagnostic. The demo loses its edited money columns and reads worse; nothing else moves. |
| `EDIT_WORD_RIDES_ON_THE_FIELD_ENTRY` | `[unverified]` | §6.4 says a `W` entry **defines** a `WORDxx`, a `K` entry **uses** a constant with the name columns blank, and an `F` entry names *"a name from data or calculation, or a `WORDxx`"*. Ruled: cols 48-50 + 51-75 on an `F` / `B` entry carry that field's edit control word directly, and an entry whose cols 51-75 hold exactly a `WORDxx` name uses that `W` entry's definition instead of a literal word. | Require a `W` entry for every edit and match it to its field by field end — one branch in `sheets/format.ts` and one in `output.ts`. |
| `HALF_ADJUST_IS_ADD_FIVE_AT_THE_NAMED_POSITION` | `[likely]` | §6.3 gives cols 50-51 as *"position number to be half-adjusted in the result"* and 52-53 as *"highest-order position to be dropped"*; the arithmetic recipe is not spelled out. Ruled: `A FIVE,RESULT-(k-1)` before the drop, then address the truncated field at `RESULT-p`, with position 1 the units. **The part no source covers is the INTERACTION of the two columns**, and it is `[likely]` on its own: rounding is correct only when `k = p` — the five must land on the highest position about to be dropped — so the demo's `ACOMM` carries `02` in both, and `k = 03` beside `p = 02` (an earlier draft) would have put the five on a surviving digit and printed every commission five cents high. `k ≠ p` is legal on the sheet and is **not** diagnosed; §8.2 works the demo's case through. | Ignore cols 50-53 and diagnose *"half-adjust requires C28-1443"*. The demo's edit words do not need it, so this cannot block the phase — but the demo's commission does, so the fallback re-cuts one Calculation card. |
| `HL_STATUSES_NEED_NO_SPECIAL_FEATURE_ON_THE_1410` | **`[verified]`** | J24-0215-2 pp.33-34's *"`H` and `L` require the 1401 High-Low-Equal Compare special feature"* is a **1401** fact. On the 1410, Compare (op `C`, 0o63) is base — `opcodes.md` §2 row 063 and §5.2, A22-0526-3 p.28 — sets high/equal/low/unequal unconditionally, with `BE`/`BH`/`BL`/`BU` `available: true` on the `J` d-table; `opcodes.md` §9's optional-feature list does not contain it, and High-Low-Equal Compare appears in this repo only inside the 1401-compatibility feature list. Same for `CNTL` col 9's multiply-divide `M`: `@` and `%` are base ops. | None wanted. Recorded so the 1401 gate is not carried forward by a later reader, and so the mirror error — dropping the sentence silently — is impossible. |
| `SENSE_SWITCH_CONDITIONS_ARE_1401_ONLY` | **`[verified]`** | The sheets allow `SB`/`SC`/`SD` (§6.2 cols 31-36, §6.3 cols 40-48). **A22-0526-3 pp.56-58** (`software.md` §13): the 1415's sense-bit switches *"are active as sense switches (A through G) only when operation is in the 1401 mode"*, and there is no compatibility mode here (`DECISIONS.md` 2026-08-29). **p.98 is the citation on the compatibility-feature table that follows that sentence, not on the sentence** — and since §11.5 makes this page number a **user-visible string in an emitted diagnostic**, the wrong page would have outlived the phase. Corrected in all three places it appears (§2.2, §11.5, here). A deck using them gets a diagnostic naming pp.56-58. | Treat them as permanently off, which is what the hardware would report — one branch in `indicators.ts`. |
| `SEQUENCE_CHECK_IS_THE_SCF_LINE_NOT_MATCHING_FIELDS` | **`[verified]` for the shared card layout and for the not-RPG-II reading; `[likely]` for the 1410 runtime** | Two pieces of evidence, and **neither reaches the 1410 runtime**, so the tag is split rather than rounded up. §4.3 reads the surviving phase names as Input/Data/Calculation/Format/Edit, *"not RPG II's File-Description / Input / Calculation / Output-Format"* — `[verified]`, and it settles what the sheet set is **not**. §6.1 p.21 documents `SCFx` in cols 1-4 on the shared X24-1336 form — `[verified]` **for the column layout**. But §4.5 records `SCF` as **absent** from the PR-108 tape, `[verified for absence; no conclusion]`, and §2.4 item 5's own rule is that a form-layout `[verified]` is never upgraded to `[verified]`-for-the-1410 — which is exactly the upgrade §7.3's partition test is written to fail, so an unqualified tag here would have made the plan contradict its own test. Corroborated, not established, by the recovered generated-program message `INPUT REC OUT OF SEQ`, emitted verbatim. **No behaviour changes with the tag**: `SEQUENCE_CHECK_IS_GENERATED_ONLY_WITH_AN_SCF_LINE` already carries `[likely]`. | None. An RPG II construct in a 1410 program is an anachronism, and §7.3's partition test is what keeps it out. |
| `SEQUENCE_CHECK_IS_GENERATED_ONLY_WITH_AN_SCF_LINE` | `[likely]` | §6.1 p.21 says every application using numerically-sequenced record types **needs** an `SCFx` line naming the governing control field (`[verified]`); it does not say what a program without one does. We generate the check and the recovered generated-program message only when an `SCF` line is present. **This is the row exit criterion 9a is conditional for**: the demo's Input card is `CAA`, so it has no `SCF` line and generates no `sequence` section, and an unconditional "all seventeen `CYCLE_ORDER` sections" invariant would be unsatisfiable for the phase's central artifact (§6.2, §13 9a/9b). | Always generate it, keyed on control field 1 — criterion 9a becomes unconditional. |
| `SPEC_DECK_ORDER_IS_THE_1401_ORDER` | `[likely]` for the 1410 | Control card, input, data, calculation, format is `[verified]` for the 1401 (J24-0215-2 p.44, §6.6); for the 1410 it is inferred from `CARD MISSING BEFORE FORMAT SPECS`, which implies the same ordered scan (§5). Carried with the tag intact. | Accept the sheets in any order, keyed only on the column-1 identifier — one loop in `deck.ts`; the deck-order diagnostics are what would be lost, which is why `deck.ts` is a separate module (§5.3). |
| `GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET` | `[likely]` | `PAGENO`, `SER`, `WORD`, `LC`, `OF` are `[verified]` as literals in the 1410 skeleton (§4.5); we **extend** that set with the generator's own structural labels and section heads (§8.4), publish the whole set in the diagnostics block, and flag a collision. §6.2's `[verified]` rule that **Data- and Calculation-sheet** field names carry no digits and no specials gives a free second line of defence to **five** generated families, not one: `Znnn` cycle points, `Knnn` constants — **which now include a Calculation literal factor, so the demo's `00005` is `K002` and the hard-coded, demo-specific `RATE` is gone from the published set** — `RCnn` resulting-condition indicators, `Cnnn` card sub-entries keyed to the record position, and `CNn`/`COn` control-field save areas. (An earlier draft of this row said five and named four; §8.4's body has always named the five.) The restriction is to those two sheets, because Format cols 29-34's `WORDxx` is a user-written name that *does* carry digits, so `WORDnn` is on the published list instead (§8.4). **A user's own Data- or Calculation-sheet field keeps its own name, unprefixed**: an earlier draft gave the card sub-entries the sheet names and renamed the user's fields `WPART`/`WQTY`/`WAMT`, which multiply-defines every shared name (the shipped assembler flags `M`), silently renames a user symbol, and cannot be stated as a safe rule (`W` + `ORD` is `WORD`, one of the five `[verified]` reserved names; and `W` + a legal six-character Data name is a seven-character label — legal to the shipped assembler, whose label field is columns 6-15, but outside the namespace the sheets are cut for and with no collision rule of its own). **The set is also checked against the shipped resolver's 47-name I/O mnemonic set** (§6.1, §8.3): `P1` collided, which is why the `1P` indicator's label is `FSTPG`. | Put every internal label on the `Z`+digits scheme and move the readable names into the comment field — costs readability, nothing else. |
| `FIFTY_ONE_COLUMN_MODE_IS_OUT` | `[unverified]` for the 1410 | §6.7 gives the 1401 rule (51-column cols 1-51 map to 80-column cols 15-65, every specified column number = physical + 14, J24-0215-2 p.44, `[verified]` **for the 1401**) and closes *"Whether the 1410 carried this quirk is `[unverified]`"*. `architecture.md` §12 already refuses the 51-column read feed. | One `+14` in `sheets/read.ts`, ~8 lines, if it is ever wanted. |
| `WE_ARE_MODELLING_CARD_RPG` | `[verified for absence; unverified for cause]` | C28-1443 documents two 1410 RPGs; only Full-RPG (1410-RG-910) and the 1301 version (1410-RG-943) carry Jun-68 program numbers, and **Card-RPG has none** — withdrawn, or Type III (§2 item 4, §3, §7 item 2). This project is card-only by constraint, so it models Card-RPG, whose minimum configuration is unknown. **Nothing in this phase prints or claims `1410-RG-910`.** | None. Recorded so a later session does not inherit a program number we have no right to. |
| `GENERATED_PROGRAM_IS_OPEN_CODED_NOT_IOCS` | ruling, over `[verified]` evidence | §8's recommendation and §5's difference table both record, `[verified]` off the tape, that the real 1410 RPG emitted **IOCS macros** and used subroutine linkage (`RDCD1 SBR BCCK1`, §4.2). We emit macro-free open code because no macro library exists here (`software.md` §7; `PHASE-3-NOTES.md` §4). **Our form is a project construction, not `[verified]` period output**, and §2.3 says so in the plan rather than implying otherwise. | None available — the constraint is the machine. The mitigation is the honest paragraph and the `provenance` field on every message. |
| `PUNCH_STACKER_IS_THE_PUNCH_X3_DIGIT_NOT_SSF` | `[verified]` for the x³ claim; the SSF clause restated | Format col 19's `4` / `8` map to the **punch instruction's x³** (`0` NP / `4` / `8-2`, io.md §6, A22-0526-3 p.63) — that half is `[verified]` and is the load-bearing half. **The attached SSF clause is quoted rather than paraphrased**: `SSF`'s d is `0`/`1`/`2` only, and the reader/punch status table sets No Transfer on **"two select-stacker-and-feeds with no intervening x³ = 9 read, or two x³ = 9 reads with no intervening `SSF`"** (io.md §6, A22-0526-3 p.63, Figures 62-63) — executable, not illegal. **Two, not one**: a revision of this row said *"an `SSF` with no intervening x³ = 9 read"*, which is still one notch stronger than the table, and the row before that said *"legal only after an x³ = 9 read (io.md §6 items 3 and 5)"*, which is **not in the cited items**: item 3 says only *"Follow it with Select Stacker and Feed"*, item 5 is about `BAR` and word marks, and Figures 62/63 show the un-preceded `SSF` as a defined condition rather than a rejected one. A `[verified]` tag over an unsupported clause is the confidence inflation §2.4 exists to catch. Recorded even though the column is out of scope — and the hazard is stated correctly: `SSF1 4` is **flagged** by the shipped assembler (d is `0`/`1`/`2` only, verified 2026-08-31), so the mistake is caught at the first commit rather than printed. The mapping is recorded because the CORRECT emission, the punch statement's x³ digit, is what a later phase has to get right from a table it will not otherwise read. | — |
| `RPG_LISTING_COLUMN_STOPS` | `[unverified]` | §9's stops and heading shape. No 1410 RPG listing survives, so they are ours. | Any other stops; one array, one place, and only our own constructed golden depends on them. |
| `CXX_NAMES_THE_RECORD_TYPE_BY_INPUT_COLS_1_TO_3` | **`[verified]`** | `rpg-sources.md` §6.2 cols 20-22, verbatim: *"`Cxx` (a record type from **input cols 1-3**), `PAG`, `SER`, or `RCT`."* Input cols 1-3 are the `C` plus the two-column Seq field — for the demo, `CAA`. That is **not** the two-digit resulting condition of Input cols 42-43, which an earlier draft of §4 and of the demo deck read it as; the demo's five `D` cards therefore read `CAA`, not `C01` (§10.3). `model.ts` resolves a `Cxx` against `RecordType.seq`, and an unresolvable one is a named diagnostic. `rpg-vocabulary.test.ts` asserts the **referent**, not just the token — neither `rpg-columns-vs-research` (which diffs spans) nor a name partition can catch a right token pointing at the wrong thing. | The resulting-condition reading: one field on `FieldSource`, one lookup in `model.ts`, and a re-cut of the demo's five Data cards to `C01` plus a two-digit Seq on the Input card. If §6.2's parenthetical ever turns out to be a transcription slip, that is a **research correction with its own commit** (§3.4's escalation rule), not a plan change. |
| `CONDITION_GROUP_IS_NOT_PLUS_TWO_DIGIT_INDICATOR` | `[likely]`, **wave-0 target** | Every condition on every sheet is a three-column group and **only the Data sheet says which column negates**: §6.2 cols 31-33, `[verified]`, *"`N` in col 31 negates."* Calculation cols 40-42 / 43-45 / 46-48 and Format cols 20-22 / 23-25 / 26-28 and 38-40 / 41-43 / 44-46 are identically shaped and silent. Ruled by that cross-sheet analogy: **col 1 of the group is the Not column, the indicator is right-justified in cols 2-3**. `columns.ts` decomposes each group into a one-column `notN` and a two-column `indicatorN`, and **§7.2's CONDITION-GROUP shape — the fourth of its five, not the aggregate rule** — makes them tile it exactly across all **eleven** condition spans (§6.2 two, §6.3 three, §6.4 six). **Every card in the demo is cut to it, on every sheet**: the four total-time Calculation cards carry ` F1` / ` F2` at 40-42 (col 40 blank, indicator at 41-42); the three detail-time cards are unconditional with 40-48 blank; and the Format cards' line conditions at 20-22 / 23-25 / 26-28 and field conditions at 38-40 / 41-43 / 44-46 are cut the same way, so `LHA1`'s `1P` is at 21-22 with col 20 blank. **This row has been mis-cut twice and both mis-cuts are recorded**: an early draft wrote `F1` at 40-41, putting `F` in the negation position; the correction after it wrote `F1` at 50-51, nine columns right, which blanked all three condition groups, blanked the `[verified]` must-not-be-blank col 49, and parsed the indicator as a half-adjust position. §10.3's cards are now **generated from §6's layout by a render-and-parse script and pasted**, never hand-spaced, and `test/rpg-demo-source.test.ts`'s span assertion is a wave-4 gate on the committed file. | Indicator left-justified with the negation elsewhere: one slice pair per group in `columns.ts`, and a re-cut of every demo and stress card that carries a condition. Cheap because the spans live in one table **and the cards are generated from it**; **not** cheap after wave 4 freezes the demo, which is why it is a wave-0 target rather than a discovery — and why it is **§11 wave 0's target (e)** and not only a sentence here. |
| `THE_LEVEL_ORDERING_RULE_APPLIES_TO_NUMERIC_LEVELS_ONLY` | `[likely]` | §6.4 p.43 is `[verified]` and says lines appear *"in output order — **descending level for heading lines, ascending level for total lines**"*, and `model.ts` enforces it as a named diagnostic with §11.5's deck behind it. But §6.4's own line classification (spacing chart, pp.12-16, `[verified]`) says *"numeric levels are hierarchical (up to 8 per type); **alphabetic levels mark independent lines** (e.g. page-overflow headings `HBx`, standalone detail `DAA`)"* — and an independent line is by definition not in the hierarchy an ordering rule orders. Ruled: **the ordering rule binds numeric levels and says nothing about alphabetic ones.** This is load-bearing rather than tidy: the demo's heading lines are `HA1`, `HA2`, `HB1`, `HB2` — level `A` then level `B` — which on a literal reading of the p.43 sentence is *ascending* and would fire the demo's own diagnostic, failing criterion 3 on the phase's central artifact. Without the ruling the plan would be silently exempting the demo from a `[verified]` sentence it says it enforces. §11.5's malformed deck therefore uses **numeric** levels and §11.2's demo row exercises the alphabetic case. **Wave 0's target (b)** is the natural place to settle it. | Order alphabetic heading levels descending too, which puts the `HB` group **before** the `HA` group in the Format deck and re-cuts the page-06 card numbers — no code moves, because `headingOutput` emits on the indicator, not on the sheet order. |
| `OVERFLOW_HEADING_IS_AN_INDEPENDENT_ALPHABETIC_LEVEL_LINE` | `[likely]` | §6.4 p.38 is `[verified]` and grants or-by-repetition **and restricts it in the same sentence**: *"`OF` may participate in an *or* group only if it is part of **every** alternative."* So the obvious `1P`-or-`OF` heading group is illegal, and an earlier draft of this plan built the demo on it while quoting the sentence's first half three times. §6.4's line classification (spacing chart, pp.12-16) names the alternative in the research's own words — *"alphabetic levels mark independent lines (e.g. page-overflow headings `HBx`, standalone detail `DAA`)"* — so the demo carries `HA1`/`HA2` on `1P` and `HB1`/`HB2` on `OF`, and no or-group at all. `[likely]` rather than `[verified]` because the `HBx` mention is illustrative: it shows the construct exists, not that it is the only lawful spelling. | The departure: an `1P`-or-`OF` group with p.38's sentence quoted at the point of departure, in §2.3's shape. It gives back eleven Format cards and re-introduces the or-group's duplicate `L HA1` — net ten, 46 to 36 — and one print block in `headingOutput`, and it costs the plan its rule that verified text wins — which is why it is the fallback and not the design. Either way `model.ts` **enforces** the p.38 restriction and §11.5 carries the deck that fires it. |
| `HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION` | `[unverified]` | `CYCLE_ORDER` places `headingOutput` **after** `detailCalc` and **before** `detailOutput`. That is the ruling §10.4 trap 1 is entirely about — it is what lets the first card both enter the accumulator and print its heading before its detail line — and **no source is cited for it anywhere in this plan, because none was found**. Three of `CYCLE_ORDER`'s seventeen orderings carried constants before this row existed; this is the fourth and the one a wave would otherwise have discovered it needed to change after the ledger froze. **Wave 0's target (b)**, alongside `1P`, `LC`, `OF` and total-vs-detail time. | Heading before detail calculation: one section move in `cycle.ts` and a demo re-cut, because the first card's amount would then have to reach `DTOT` by another route. The `test/rpg-cycle.test.ts` assertion (*"the first card's amount reaches `DTOT`"*) is written against the behaviour, not the ordering, so it survives the move. |
| `SER_AND_RCT_ARE_THE_SERIAL_AND_RECORD_COUNTERS` | `[likely]` | §6.2 cols 20-22 lists `Cxx`, `PAG`, `SER` and `RCT` and **defines only `PAG`** (p.26, `PAGENO`); §4.5 records that `SER` appears as a literal in the PR-108 phase region and that `RCT` does not. Reading `SER` as a serial counter and `RCT` as a record counter therefore fixes **runtime semantics** — two counters the generated program maintains and prints — on a token list. §15's own preamble says a ruling under uncertainty gets a constant with a fallback, so it gets one rather than riding in as a transcription. | Diagnose both as unsupported — *"unsupported: `SER` / `RCT` semantics require C28-1443"* — which costs the demo nothing, because it uses neither. `PAGENO` is unaffected: its meaning is `[verified]` at §6.2 p.26. |
| `RPG_GOLDENS_ARE_CONSTRUCTED` | provenance | Declared in `test/rpg-generate.test.ts` so a reader can grep it, and in each golden's own header. `[observed]` at best, never period truth (`research/METHOD.md`). No 1410 RPG listing or report with published output survives (§3, whole-archive index checked). | None available. The mitigation is §11's oracles, not a better golden. |
| `RPG_DIAGNOSTIC_TEXTS_ARE_THE_RECOVERED_ONES` | `[verified]` for the texts; the mapping is ours | The **sixteen** message texts — 14 in §4.4's code block plus the 2 generated-program messages named in the same section — are `[verified]` off `jpr108-2024.bcd` with byte offsets. **The corpus is stated by construction, never by count**: `rpg-messages.test.ts` slices §4.4 out of the research file, because an earlier draft said "eleven" and a test written to eleven would drop two and then *reject* a correctly recovered message as invented. **Which condition raises which message is ours**, and every `RpgMessage` carries `provenance: 'recovered-1410' \| 'ours'` with its cite — **but "ours" licenses choosing the condition, not inverting the text**: 10803 / 10804 (`EOJ-NO 1405 / 1301 CONTROL CARD`) are absence diagnostics and are never fired on a card that is present (§2.2, §2.4 item 6, §5.3). | None needed — the labelling **is** the mitigation. A message we invented can never claim tape provenance, and `rpg-messages.test.ts` enforces it in both directions. |

**Facts deliberately given no constant, because they are `[verified]` and pinned by a named test
instead** — listed so nobody re-opens them: the four-sheet identity and the shared X24 form numbers;
every column span in §6.1-§6.4; the column-1 sheet-identifying character; `SCFx` in Input cols 1-4;
`PAGENO` as the one mandated name and one per application; sources applied left-to-right in sheet
order; Calculation col 49 must not be blank; `0+` and `0-` as the 12-0 and 11-0 punches (`bcd.ts`
ranks 25 and 35); the Format ordering rules (p.43 — enforced in `model.ts`, with the level half
scoped by `THE_LEVEL_ORDERING_RULE_APPLIES_TO_NUMERIC_LEVELS_ONLY`, which has its own row above
because the scoping is a ruling and the sentence is not); or-by-repetition **and its
`OF`-in-every-alternative restriction** (p.38 — both halves of the sentence, enforced in `model.ts`
and exercised in §11.5); the line-identification shape, cols 2-4 = type + one-column level + number
with **no blank col 4** (§6.4 — pinned by §10.2's map and by `test/rpg-demo-source.test.ts`);
`Cxx` naming the record type by Input cols 1-3 (§6.2 — pinned by `rpg-vocabulary.test.ts`'s
referent assertion **and** by its own §15 row, because the divergence was live); the multiply's
cols 8-10 minimum length (§6.3 — pinned by a §11.5 malformed deck); Next Line's cols 8-9 = cols 2-3
constraint; the 25-character limit on cols 51-75; the §6.6 deck order **for the 1401**; and every
Phase-3 constant this phase consumes without re-declaring —
`FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS`, `DA_EMITS_ONLY_ITS_MARKED_POSITIONS`,
`OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK`, `COL7_INDENT_IS_STANDALONE_TOO`,
`SOURCE_LOWERCASE_UPCASES` and `SOURCE_PLUS_IS_THE_12_PUNCH`. Phase 5 **imports** them; it never
re-declares a second copy under the same name.
`CARD_DOLLAR_SUPPRESSES_GM_WM_TEST` is deliberately **not** on that list, and an earlier draft had
it there: nothing in Phase 5 consumes it, because `GENERATED_READ_TAKES_THE_BAKED_D` rules that the
generated read is `R1 0,CDIN` and never writes an explicit `$`. It is named in that row's fallback
column instead, where `R1 0,CDIN,$` would actually reach it.

---

## 16. Documentation conventions, matching Phase 2's and Phase 3's

Three files, three jobs, none of them a redesign after the fact.

**`docs/BUILD-LOG-5.md`** — one `## Wave N — <what> — commit <sha>` section per wave, in the shape
`docs/BUILD-LOG-3.md` uses: what landed, what the review found and what was done about it, §12.2's
gate lines **with their numbers** — six through wave 5, nine from wave 6 once `npm run rpg` exists
(two `--golden` lines plus the `--source --diff` report), and the new `npm test` / `npm run smoke`
counts from every wave that moves them — and any number in this plan that the build corrected.
Opens with `## Arrival — <sha> (the plan, on feature/phase-5-rpg)`, and **that Arrival section
carries the §10.4 draft target program verbatim, all 270 cards, in a fenced block, with the
`assemble()` transcript beside it.** It is written in the commit that lands the plan, before wave 0.
The reason is that §10.4 is the plan's strongest de-risking claim and §11 wave 1's oracle is judged
against it: a draft whose only home is a scratch path under `/private/tmp/…` stops being openable
the moment that session ends, and the numbers revert to unverifiable. It is the **plan's exhibit**,
not a build artifact — `demos/sales-summary.asm` is still wave 1's to write and to commit — which
is why it lives in the build log rather than in `demos/`. **Wave 1's section carries the
§10.2 print-position column map, committed before the page golden**; **wave 5's carries the
`cycle-probe` and `card-list` column maps, likewise committed before their pages** (§10.5); and wave
0's carries what the primary read found or that it was attempted and failed.

**`PHASE-5-NOTES.md`** — four sections, matching `PHASE-3-NOTES.md`:

1. `## 1. [unverified] / [likely] fallbacks hit (each behind a named constant with // OPEN:)` —
   §15's ledger reduced to the constants actually reached, each with the fallback taken. Exit
   criterion 14's grep is a set difference against this section, in both directions.
2. `## 2. Plan deviations (minimal, logged, not redesigns) and modelling refusals` — including how
   many target re-cuts §11.1's protocol actually took and why; whether the draft target's **39
   condensed cards, entry 00808 and 02833 high-water** held once wave 1 committed the real file
   (§10.4 names them as a draft's numbers, so a difference is a fact to record, not a defect); the
   **no-subroutine-linkage design note with its §4.2 citation** (§2.3's ruling); and the
   `CARRIAGE_SENSES_AT_DESTINATION_ONLY` straddle result from the probe deck.
3. `## 3. Research corrections and [observed] observations` — anything wave 0's read overturned,
   escalated rather than silently edited; the Phase-2 carriage divergence as met by this phase; and
   any Phase-3 open constant the generator's output pressed on.
4. `## 4. Open items carried out of Phase 5` — into Phase 4 (the RPG view is unstyled, one spec box
   plus the per-sheet ruler, which is the drawn form's specification) and into Phase 6 (what the
   reentry showcase inherits: the generator, the cycle, the edit words, and the fact that a
   trajectory table has no control breaks).

**`docs/research/open-questions.md`** — a new `## Phase 5 — 2026-…` section at the end, with
`### Wave N — <title>` subsections and the file's existing four-column table:
`| Constant | Question | Where it bites | Fallback taken, and the alternative |`. Nothing outside
that section is edited.

**`docs/research/rpg-sources.md`** — a new `## 10. Phase 5 wave-0 primary read` section at the end,
appended by **wave 0 only**, recording what was read and what it settled, **or that the read was
attempted twice and failed**. Nothing above it is edited; a correction to anything above it is an
escalation to the orchestrator with its own commit, the Phase-1b and Phase-3 precedent.
