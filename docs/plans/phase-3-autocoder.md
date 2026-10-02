# Phase 3 — the standalone Autocoder cross-assembler

Companion to [architecture.md](architecture.md) §2 (B2/B3/B4), §3 item 8, §5 step 0 and step 2, §7,
§8, §12. Structural template: [phase-1-cpu-core.md](phase-1-cpu-core.md). Immediate precedent:
[phase-2-unit-record.md](phase-2-unit-record.md), whose object deck and loader this phase emits into
**exactly as shipped**.

Single build on `feature/phase-3` in the main checkout — no worktree, no parallel phase — with
per-wave file ownership. Every language and format behaviour cites a file and section in
`docs/research/`; every `[unverified]` / `[likely]` item is in §15 with its named `// OPEN:` constant
and its fallback.

---

## The seven bullets

1. **The demo is the design.** Phase 2 hand-punched `demos/hello-dad.cards` card 1 — a ten-field
   1410 program (ten word-marked fields, §10) that reads five report cards and prints a reentry
   table. Phase 3 writes that program in real Autocoder at ORG 00500, assembles it, loads the object
   deck through the **real** condensed
   loader and the **real** 1402, and prints the same page. The gate is
   `renderGreenBar(paper) === test/golden/hello-dad.page.txt`, byte for byte, 348 bytes — a golden
   Phase 3 does not own, does not touch, and had no hand in making.
2. **`SourceCard[] → { ListingLine[], ObjectDeck }`, two passes, host-side.** `SourceCard` and
   `ListingLine` land in `src/asm/types.ts` **with their producer**: nothing inside `src/core` names
   either, which is the placement rule `src/core/types.ts` and `src/formats/objectdeck.ts` both state
   and `architecture.md` §3 item 8 schedules. `ObjectRecord` / `ObjectDeck` are **imported** from
   `src/formats/objectdeck.ts` and never redefined, extended or forked (B4).
3. **Mnemonics derive from `src/core/isa/table.ts` + `isa/dmods.ts`; a Phase-3 table carries only
   what those cannot supply**, keyed to `OPS` and diffed against it in both directions — plus a
   tier-0 test that reads `opcodes.md` §2's Autocoder column directly, the one column
   `test/isa-table-vs-research.test.ts` says in its own header it does not check.
4. **In:** DCW · DC · DS · DA (`hi,lo` and bare-`lo` sub-entries only) · EQU (three of its four
   forms) · ORG · LTORG · END · JOB · CTL · RUN · LOAD · EJECT · RESEQ · PST, all four literal kinds,
   the three-position I/O **x-control field** as its own operand kind, summed address adjustment,
   15-register indexing, both meanings of the asterisk, F/U/M/O as **data**.
   **Out:** all macros and IOCS, EX/XFR, SFX, NOP/NOPWM, `,G` `,#` `,0` `,N`, EQU to a tape unit /
   x-control field, every OS-only operation — each with its citation, its consequence, and (where one
   exists) its insertion point.
5. **A vanilla-DOM view at `src/ui/autocoder/`, following `unitrecord`'s pattern exactly**: source
   textarea with an 80-column ruler, ASSEMBLE, the 1403-format listing in a `<pre class="green-bar">`,
   the object deck as card faces through `unitrecord/cardView.renderCard`, and PUNCH INTO HOPPER,
   which fills the existing deck box through a named `setText` the deck box does not have today.
   **Three edits, ~10 lines, across three files Phase 3 does not own** — all named in §3.2, none
   discovered mid-build.
6. **The honest framing is on the page, not in a footnote.** 1410-AU-906 needed 20K, four tape units,
   a 1402 and a 1403-2 (`software.md` §11, C20-1602-8) — this configuration has no tape, so it could
   not have assembled its own programs. Pipeline shape and artifacts are period-correct; the
   execution model is not (`architecture.md` §5 step 0).
7. **~2,080 source + ~536 UI + ~140 CLI + ~1,700 test lines, no new dependency**, six waves each
   closed by a named oracle — the closed loop is engineered so it **cannot** be a tautology — plus
   `PHASE-3-NOTES.md`, `docs/BUILD-LOG-3.md`, and a dated Phase 3 section in
   `docs/research/open-questions.md`.

---

## 1. The storyboard, step by step

This is what the owner and a family member do. Every later section exists to make one of these steps true, and §13
is this list turned into assertions.

1. Open the page. Below the internals panel and the unit-record block there is a new block headed
   **Autocoder — 1410-AU-906 (host-side)**, with §2.5's framing paragraph under it.
2. Press **sample program**. The source textarea fills with `demos/hello-dad.asm` — nineteen
   80-column source cards, with a column ruler above them marking 1-2 · 3-5 · 6-15 · 16-20 · 21-72 ·
   76-80. A second, smaller box fills with `demos/hello-dad.data.cards`, the five report cards.
3. Press **ASSEMBLE**. Nothing throws. Below the box, side by side:
   - the **listing**, rendered as a 1403 Model 2 printed it — heading from the JOB card, column
     titles, one line per source card carrying SEQNO / PGLIN / LABEL / OPCOD / OPERAND / CT / ADDRS /
     INSTRUCTION / CARD / FLAG, page-broken on the 66-line form;
   - the **object deck**, three card faces — two condensed cards and the execute card — drawn by the
     same `renderCard` that draws the hand deck, with the decoded load address and count under each.
4. Read the listing. `LOOP` at ADDRS **00500**. `ID DCW @HELLO1@` at ADDRS **00563** — low-order,
   because that is where a symbolic label on a constant resolves — while the word mark it sets is at
   00558, the position immediately right of the halt. ` LINE DS 80`, indented to column 7, at ADDRS
   **00564** — high-order, because it is indented; un-indented it would read 00643 and every read
   would land past the end of its own buffer. CARD says which of the two object cards each item rode
   in on.
5. Break it on purpose. Change `EOJ` to `EOG` in one operand and press ASSEMBLE again: that line now
   carries **U** in the FLAG column, the status line says `1 flagged line`, the modern error block
   under the listing says `page 01 line 090, column 21: EOG is not defined`, and PUNCH INTO HOPPER
   is disabled. Nothing threw; the listing still rendered; the deck still exists and is still wrong.
   Fix it and reassemble.
6. Press **PUNCH INTO HOPPER**. The existing deck textarea fills with the whole hopper in `.cards`
   text — `formatDeck([...loaderDeck(deck), ...dataCards])` (`src/formats/card.ts:181`;
   bootstrap card, loader body card, the two condensed cards, the execute card, then the five data
   cards) — the card faces below it repaint, and PUT DECK IN HOPPER runs. **Ten cards.**
   **The mechanism, named now because it does not exist yet:** `createDeckBox` returns `{ el }` and
   keeps its textarea, its `refresh()` and `put.disabled` closure-private, so `session.setDeckText()`
   alone would leave the box stale and the next keystroke would overwrite the deck from it. §3.2's
   first edit adds `setText(text)` to what `createDeckBox` returns; the text itself comes from the
   Autocoder session's own DOM-free `hopperText()`, which is what wave 6 asserts (§13 criterion 11a).
7. Press **READER START**, then **END OF FILE**.
8. Press **key the bootstrap** (Phase 2's button, unchanged), then address 00000 → DISPLAY, MODE =
   ALTER → START, **COMPUTER RESET**, MODE = **RUN**, **START**.
9. The hopper empties one card at a time and the green bar fills with the five lines a period analyst used to
   read off an IBM 1410. Same page, same 348 bytes — but this time the deck came out of an assembler.

That last sentence is the whole phase. It is also `test/tier4-autocoder-demo.test.ts`.

---

## 2. Scope

### 2.1 In

- The **standalone C28-0309-1 Autocoder (1410-AU-906)** language: the fixed-column source card, the
  operand grammar, summed address adjustment, 15-register indexing, both meanings of the asterisk,
  the four literal kinds, the declaratives and the standalone control statements listed in §2.2
  (`software.md` §1-§6).
- **Absolute condensed object deck** exactly as `src/formats/objectdeck.ts` defines it, ORG default
  **00500** because the loader occupies storage below it (`software.md` §2, §9; `LOADER_CEILING` =
  00499 in `src/formats/loader.ts`).
- **Flag set F / U / M / O**, carried as data on `ListingLine`, never thrown (`software.md` §6,
  C28-0309-1 pp.17-20).
- The **1403-format listing** with the standalone column set only (`architecture.md` §2 B3).
- A **browser view** and a **CLI** (`tools/asm.ts`), because a golden that only a browser can produce
  cannot gate a commit — Phase 2's `run-deck --golden` precedent.

### 2.2 Pseudo-operation in / out table

Every **operation** in `software.md` §6's table appears here exactly once.
`test/asm-pseudo-ops.test.ts` slices §6's own markdown table and asserts that partition, so the scope
decision itself is machine-checked and mid-build creep fails a gate instead of surviving a review.

**The splitting rule the test applies, because "row" and "operation" are not the same unit.** §6's Op
cells are slash-joined (`DCW / DC / DS / DA / EQU`, `ORG / LTORG / END`, `EJECT / RESEQ / PST`,
`TITLE / BASE1 / BASE2 / CALL / DEFIN / PRTCT / DCWF / DCWS`, `DAV / RSV`, `EX / XFR`, `NOP / NOPWM`),
so the test splits each Op cell on `/` and trims — the OS column is never read, which is why **`HEADR` is not a row at all**: it is a cell in the OS column of the JOB row, and it
appears in the out-of-scope list below as an OS operation, not as a §6 row.

**The counts, taken off `software.md` §6's table by splitting every Op cell — header at
`software.md:145`, the thirteen body rows at 147-159 — not remembered.** Those thirteen rows yield **31 operation names, all distinct**. **Fifteen are in** — DCW · DC ·
DS · DA · EQU · ORG · LTORG · END · JOB · CTL · RUN · LOAD · EJECT · RESEQ · PST. **Sixteen are out** —
EX · XFR · SFX · NOP · NOPWM and the eleven OS / Linkage-Loader names DAV · RSV · SPEND · TITLE ·
BASE1 · BASE2 · **CALL** · DEFIN · PRTCT · DCWF · DCWS. 15 + 16 = 31, and that is the assertion:
**every one of the 31 names matched by exactly one row of the table below, plus two named allowances,
and nothing else.**

- **`EXTRA_ROWS`** — two families that are **not** in §6 at all, carried with their citation: the
  **macros** MATH / BOOL / COMP / NOTE / MEND, INCLD, DELET / INSER and **IOCS**
  GET / PUT / DTF / OPEN / CLOSE, both from `software.md` §7's prose rather than §6's table.
  **`CALL` is deliberately not on this list.** It is a §6 Op-cell name — the Linkage-Loader row,
  `software.md:158` — *and* a §7 macro-library call, so filing it under a "not a §6 row" allowance
  would make the partition assertion false on its first run. The **OS out row owns it**; §2.3 names
  it in prose without claiming it.
- **`SUFFIX_RULINGS`** — the three rows below keyed on an operand **suffix** rather than on an
  operation: `DA ,G` / `,#`, `DA ,0` / `,N`, and `DCW/DC ,G`. They are sub-rulings of the DCW / DC /
  DA rows, which already match those names, so the partition excludes them by name. Without this
  list the test counts them as three unmatched rows and fails.

| Op | In | Ruling, with the citation and the consequence |
|---|---|---|
| DCW | ✅ | Constant with a word mark on the **high-order** position. Numeric ± sign as a zone over the units position; alphameric `@…@` ≤50; blank constant `#n`; address constant `LABEL±n`. `software.md` §5. The demo's `ID DCW @HELLO1@` is what bounds the halt's read-out (`opcodes.md` §2 `.` row). |
| DC | ✅ | Same, no word mark. Under load-mode loading a DC *clears* word marks over its own extent (`software.md` §5 correction, `[likely]` — SimH is explicit, A22-0526-3 p.41 is silent). Nothing of ours depends on it; it is a cited comment in `emit.ts`, not a behaviour. |
| DS | ✅ | Reserves positions, **emits nothing**, and **does not clear the area** — "no information is entered into the area, no word mark is assigned by the processor, and the area is not cleared prior to reservation" (`software.md` §5, verbatim, C28-0326-2 p.30). The sharpest warm-start hazard in the language; quoted verbatim in `symbols.ts`'s header, and deliberately on the demo page. |
| DA | ✅ **minimal** | Header `b X l`; sub-entries in the `hi,lo` form (word mark on the field's high-order, label resolves **low-order**) and the bare-`lo` form (subfield, no mark). Header label resolves **high-order of the whole area** (`software.md` §5). Kept because Exhibit IV's `DA 1X80,G` at 00315 with sub-entries at 00318 and 00394 is already a named tier-1 oracle, and because Phase 5 has to define a card record area with no macro library to do it for it. |
| **DA `,G` / `,#`** (a `SUFFIX_RULINGS` row) | ❌ (`F`) | `,G` emits a word-marked group mark, which `encodeObjectRecord` refuses by design (`OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK`). See §2.4 — this is a real cost of a Phase-2 open constant, ruled and recorded, not patched. **`,#` is out on scope, not on format** — the two halves of this row do not share a reason. `software.md` §5 is explicit that record marks *are* loaded at object time (verbatim, C28-0309-1 pp.13-15: *"At object program load time: … 2. A group mark and record marks are loaded as specified in the heading line"*), and a record mark is an ordinary stored character `encodeObjectRecord` encodes without complaint — only a word mark **over a group mark** is refused. `,#` is out because nothing in Phases 3, 5 or 6 defines a blocked area that needs an inter-area record mark, and carrying it would mean carrying the blocking semantics with it. **The flag does not un-reserve the area:** a flagged `,G` / `,#` still reserves `b × l` positions, still assigns the header and every sub-entry address, and still advances the counter — only the group-mark / record-mark emission is dropped. That is what lets the tier-1 oracle assert `DA 1X80,G` at 00315 with sub-entries at 00318 and 00394 **on a line that carries an `F`**, which `test/tier1-exhibit-iv.test.ts` says in words (`FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS`, §15). |
| **DA `,0` / `,N`** (a `SUFFIX_RULINGS` row) | ❌ (`F`) | `,N` is OS-only (`software.md` §5, C28-0326-2 p.25, not documented for C28-0309-1). `,0` relative-to-zero addressing changes what every sub-entry label means and has no consumer in Phases 3, 5 or 6. |
| **DCW/DC `,G`** (a `SUFFIX_RULINGS` row) | ❌ (`F`) | Same encoder rejection. See §2.4. |
| EQU | ✅ **three of four forms** | Emits nothing, moves nothing. Carries the second meaning of the asterisk. **In:** actual, previously-defined symbolic with adjustment, and the index-register form (`X2` / `2,X`). **Out (`F`):** the fourth documented form, "to a **tape unit / X-control field**" (`software.md` §5, C28-0309-1 pp.12-16) — it makes a symbol whose value is three glyphs rather than an address, a second namespace with no consumer in Phases 3, 5 or 6 (no tape, and the demo and the RPG generator both write the x-control field literally, §5.2 step 3 rule 1). `EQU_TO_AN_XCONTROL_FIELD_IS_OUT`, §15. |
| ORG | ✅ | Actual, previously-defined symbolic, blank (= high counter + 1), or `*` with adjustment. Default origin 00500. Indexing not accepted (`software.md` §2). |
| LTORG | ✅ | Assigns the literals collected since the last flush, at the operand address, **in encounter order**. Area-defining-literal labels die at the flush and must be redefined. Indexing not accepted. |
| END | ✅ | Operand names the entry point → `ObjectDeck.entry` → `executeCard(entry)`. Also flushes the pool if no LTORG did. `software.md` §6. |
| JOB | ✅ | Listing heading from the operand; the card's **own** columns 76-80 become the ident punched into cols 76-80 of every condensed card (`JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80`, §15). |
| CTL | ✅ | Core-size code read from card **column 22** (1 = 10K … 5 = 80K), suppress code from **column 23**; **absent = 20K** (`software.md` §6, `[verified]`). The one operand read by absolute column, which is why `Statement` keeps the raw card. Used to range-check every assigned address → `F`. |
| RUN | ✅ | First card. **The mode word is in the LABEL field, not the operand**, and a worker who looks for an operand will not find one: `software.md` §6 reads "first card; label `AUTOCODER` = assemble, `SYSTEMS` = library update", and §10's card 1 holds `AUTOCODER` in columns **6-14** with a blank operand. `AUTOCODER` assembles. A label of `SYSTEMS` → **`F` on the label field**, not `O`: `O` is the *invalid-operation-code* flag (`software.md` §6, C28-0309-1 pp.17-20) and RUN is a valid operation with a valid documented mode word — it is the library behind `SYSTEMS` that does not exist here. `why` = "RUN SYSTEMS: no library — this configuration has no tape (`software.md` §7, `DECISIONS.md` 2026-08-30)". Overloading `O` to mean "unsupported mode" would make the FLAG column mean two things and corrupt the `O > F > M > U` precedence. **RUN's label defines no symbol** — it is a mode word consumed by RUN, never entered in the symbol table (so a program may still label something `AUTOCODER`), and RUN's operand must be blank; anything written there is `F`. |
| LOAD | ✅ | "A load program should precede the object deck" (`software.md` §6, C28-0309-1 p.17) — which is precisely `loaderDeck()`. Sets `AssemblyResult.wantsLoader`; the view and the CLI honour it. Phase 3 builds no loader: Phase 2 shipped one. |
| EJECT | ✅ | Skip to channel 1 in the listing; the renderer turns it into a form feed. Two lines, visible, period. |
| RESEQ | ✅ | Resets the object-deck sequence to `001` and changes the ident — directly visible in cols 73-80 and in the listing's CARD column. `software.md` §6, `[verified]`. |
| PST | ✅ | Prints the symbol table at the end of the listing. The table already exists; ~15 lines for an artifact worth looking at. |
| **EX / XFR** | ❌ (`O`) | Execute-during-load. The *machinery* exists and could be composed without touching `src/formats` — `executeCard(entry)` and `encodeObjectRecord` are both exported, so a Phase-3-owned hopper builder could interleave an `E` card. It is out because (a) nothing in the storyboard or in Phase 5 needs it, and (b) the re-entry contract it depends on is `LOADER_LOOPS_BACK_PAST_THE_RE_ENTRY_SLOT`, an `[unverified]` Phase-2 constant with no source at all. **Insertion point named:** `pack.ts` would close the record at the EX point, flush the literal pool there, and emit `executeCard(target)` into the card stream; `assemble()` would return `cards` beside `deck`. |
| **SFX** | ❌ (`O`) | Label suffixing exists to keep macro-library routine labels distinct (`software.md` §6). No macros, no library, no need — dead machinery. |
| **NOP / NOPWM** | ❌ (`O`) | `software.md` §6's own footnote: the row was not confirmed against C28-0309-1's op tables. `[unverified]` → `STANDALONE_HAS_NO_NOP_PSEUDO_OP`, §15. **The imperative `NOP` (machine op `N`) is IN** — it is `OPS` row 045's Autocoder mnemonic and needs no pseudo-op ruling at all. Only the program-switch pseudo-op is out. |
| **Macros** — MATH BOOL COMP NOTE MEND, INCLD, DELET, INSER | ❌ (`O`) | §2.3. **Not a §6 row** — `software.md` §7 prose; carried in the partition test as an `EXTRA_ROWS` allowance. **`CALL` is a macro-library call too and is deliberately absent from this row**: it is also a §6 Op-cell name, so the OS row below owns it and the partition counts it exactly once (§2.2 preamble). |
| **IOCS** — GET PUT DTF OPEN CLOSE | ❌ (`O`) | §2.3. **Not a §6 row** — `software.md` §7 (1410-IO-926); same allowance. |
| DAV · RSV · SPEND · TITLE · BASE1 · BASE2 · **CALL** · DEFIN · PRTCT · DCWF · DCWS | ❌ (`O`) | The eleven OS Autocoder / Linkage Loader names, `software.md` §6's own rows — row 12's Op cell written out in full (`TITLE / BASE1 / BASE2 / CALL / DEFIN / PRTCT / DCWF / DCWS`, `software.md:158`) rather than elided, because the partition test splits that cell and every name in it must land somewhere. **`CALL` is here, not with the macros:** it is simultaneously a Linkage-Loader operation in §6 and a macro-library call in §7, and this row is the one that owns it (§2.2 preamble; §2.3 names it in prose only). `HEADR` is **not** in this list as a §6 name — it is a **cell** in the OS column of the JOB row, dropped by the splitting rule — but it is out of scope for the same reason and is named here so nobody looks for it. `architecture.md` §12's standing refusal: the OS emits **relocatable** cards needing a relocating loader we have no reason to build (`software.md` §8.2). |

An unrecognised operation gets `O`, CT 0, ADDRS = the current counter and no emission — so a macro
call in a source deck produces a flagged listing line, not a crash. That is the graceful degradation,
and it is the Phase-2 `DeckError` pattern one level up.

### 2.3 The macro ruling

**No macro processor. No library. Not partially, not stubbed.**

`software.md` §7: macros are model statements held on the **system/library tape**, maintained by a
Librarian phase under `RUN SYSTEMS`; MATH / BOOL / COMP / NOTE / MEND are its generation-time
pseudo-ops; CALL and INCLD pull closed library routines; IOCS macros come from the 1410-IO-926
package. **`CALL` appears in this paragraph as prose and nowhere else in the scope machinery**: it is
also a §6 Linkage-Loader Op-cell name, so §2.2's OS out row owns it and the partition counts it once. This configuration has no tape (`DECISIONS.md` 2026-08-30, KISS peripherals), so it has no
library, so a macro call has nothing to expand from. The library survives only as ~8,838 decoded
lines inside `jpr108-2024.bcd` — an artifact to read, not a runtime.

**Consequence for Phase 5, written down now so Phase 5 does not discover it.** `software.md` §12.5's
2026-08-30 addendum is explicit and `[verified]`: the surviving 1410 RPG processor's generated code
uses **1410 IOCS macros (DTF / GET / PUT)**, and its control card is an `RG` card. Our Phase-5
generator is ours, so it emits **macro-free, open-coded** Autocoder — the same `RW1` / `BEF1` / `W1`
sequence the demo uses, with explicit x-control fields and explicit buffer moves. The generator plays
the part the macro library played. That deviation from the historical mechanism belongs in the Phase 5
plan, cited to §12.5, not hidden in Phase 3's code. **The seam is left and nothing is built in it:**
`assemble.ts` calls `parse()` then `pass1()`, and a source-to-source `expand()` would go between them.

### 2.4 The `,G` collision — a real finding, escalated, not patched

`software.md` §5's Exhibit IV table lists `EOJ DC @EOJ@,G` at ADDRS 00396 riding on object card 015,
so a marked group mark travelled in **an OS relocatable deck**. `encodeObjectRecord` refuses one
(`OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK`, Phase-2 `[likely]`), and it is right to for **our** loader:
`CONDENSED_LOADER_PROGRAM`'s `D 00100 00?!0 Δ` at 00330 terminates on an A-field GM-WM, so a payload
carrying one would truncate the load as well as the read.

The honest statement of the finding is narrower than "IBM did it in a condensed deck", because
Exhibit IV is not a condensed deck: **the Phase-2 constant is correct about our loader and about the
standalone absolute format as we model it, and the OS relocatable format demonstrably permitted the
pattern.** Phase 3 records that as a dated row in `open-questions.md` and escalates it to the
orchestrator; it does not edit `src/formats/**`. Consequence for a program: set the group mark at run
time (`,` Set Word Mark over a group-mark DCW — one extra instruction) or read one off a card, which
is what the demo's data cards do.

### 2.5 What the assembler does *not* know

**The assembler assembles the machine, not the configuration.** Every row in `OPS` resolves,
including the `implemented: false` rows — read off `table.ts` rather than from memory, they are
`Y` Priority, `U` tape unit control, `X` (0o27, the **channel-2** R/X status branch carrying
`BNR2`…`BA2`), `2` (0o2, **carriage** control channel 2, `CC2`), `4` (0o4, **select stacker and
feed** channel 2, `SSF2`), `P` and `Q` (0o47 / 0o50, MICR), and the two rows with an empty
`autocoder` array and so nothing to resolve, `=` (0o13, 7010-only) and `$` (0o53).
`BXPA /PCH/` assembles to `Y /PCH/` and the *machine* rejects it at run time with `UnimplementedOp` —
which is exactly why `architecture.md` §8 makes Exhibit IV an **assembly-only** oracle with no
execute-the-deck test. `test/tier1-exhibit-iv.test.ts` pins this rather than leaving it to be discovered.

And the framing paragraph, which is on the page above the source box and not only in this plan
(`architecture.md` §5 step 0):

> This assembler is modern host code. The real 1410-AU-906 needed 20K, four magnetic tape units, an
> IBM 1402 and an IBM 1403 (C20-1602-8; `software.md` §11) — "THE 1410 AUTOCODER HAS THE LARGEST
> MINIMUM REQUIREMENT" of the programs on the PR-108 tape — and could not have run on this machine,
> which has 10K, one channel, a 1402 and a 1403 and no tape at all. The pipeline and every artifact
> — 80-column source cards, the F/U/M/O listing, the condensed absolute deck, the hand-keyed
> bootstrap, the 1402 load — are period-correct. The translator is not.

---

## 3. File list and ownership

### 3.1 Owned, all new

```
src/asm/                                                                            OWNED
  types.ts        SourceCard · ListingLine · Statement · Operand · Literal ·
                  SymbolEntry · EmittedItem · AssemblyResult · the column constants   ~200
  source.ts       text -> SourceCard[] -> Statement[]; software.md §1's columns       ~150
  operand.ts      the operand grammar: literal span, comment cut, comma split,
                  address kind, summed adjustment, index tag, explicit d.
                  READS mnemonics.ts: §5.2 step 3 rule 1 keys on the resolved
                  form's `lengths` ([10] = the x-control form) and the
                  explicit-d rulings on that form's `dModifiers`                       ~300
  mnemonics.ts    mnemonic -> { opChar, d, shape }; DERIVED from OPS + dmods where
                  derivable, Phase-3 rows only where they are not (§7)                ~230
  symbols.ts      pass 1: the assignment counter, lengths, the symbol table, ADDRS,
                  and the DS / DA reserved-extent list pack() needs (§8.3)    ~270
  literals.ts     the four literal kinds; pooling; the LTORG / END flush              ~170
  emit.ts         pass 2: resolve, encodeAddress, build cells, EmittedItem[]          ~260
  pack.ts         pack(items, reserved) -> ObjectRecord[] on the 60-COLUMN budget;
                  `reserved` is the DS / DA extent list §8.3's GM-WM tail rule
                  cannot otherwise see — TWO arguments, from wave 2 onward            ~130
  listing.ts      ListingLine[] from the two passes, CARD back-filled from pack       ~140
  listing1403.ts  ListingLine[] -> PrintLine[] -> renderGreenBar                      ~140
  assemble.ts     assemble(text, opts) -> AssemblyResult — the one entry point         ~90
                                                                                    ~2,080

src/ui/autocoder/                                                                   OWNED
  mount.ts          mountAutocoder(machine, deckBox, host, redraw) — mountUnitRecord's shape  ~90
  session.ts        DOM-free: source text, data-card text, last result, hopperText()          ~100
  sourceBox.ts      textarea + 80-column ruler + sample buttons + ASSEMBLE + the framing note ~140
  listingView.ts    <pre class="green-bar"> listing + the flagged-line block                  ~110
  objectDeckView.ts card faces via unitrecord/cardView.renderCard + decoded header per card    ~90
  raw-import.d.ts   declares '*.asm?raw' ONLY — see the note below                              ~6
                                                                                             ~536

demos/hello-dad.asm          the demo program, 19 source cards (§10)                OWNED
demos/hello-dad.data.cards   the five report cards, drift-tested against the P2 deck OWNED
                  BOTH LAND IN WAVE 4 — the wave that first assembles the demo from
                  source (§11.1). Wave 5's listing golden and wave 6's view read them;
                  neither owns them, and no wave reaches forward.

tools/asm.ts      CLI: assemble, print the listing, write the deck, --golden [--update]  OWNED ~140
                  LANDS IN WAVE 5, not wave 2 — §3.3, §11; re-edited in wave 6
test/             14 new files (§12.1)                                                   OWNED ~1,700
test/golden/hello-dad.lst   CONSTRUCTED listing golden, labelled in its own header       OWNED
docs/BUILD-LOG-3.md · PHASE-3-NOTES.md                                                   OWNED
docs/research/open-questions.md — a dated "Phase 3 — 2026-…" section only          OWNED (section only)
```

≈ 2,080 source + 536 UI + 140 CLI + 1,700 test lines — the two block subtotals added up, not
estimated separately. **Zero new dependencies.**

**The `?raw` shim, stated precisely because ambient declarations are project-global.**
`src/ui/unitrecord/raw-import.d.ts` declares `module '*.cards?raw'`, and an ambient module
declaration is visible across the whole program — so a second `.d.ts` re-declaring `'*.cards?raw'`
merges into a duplicate `export default` and fails `npm run typecheck`. The Autocoder view needs two
raw imports: `demos/hello-dad.asm?raw`, whose extension is **undeclared today**, and
`demos/hello-dad.data.cards?raw`, which the existing declaration **already covers**. So
`src/ui/autocoder/raw-import.d.ts` declares `'*.asm?raw'` and nothing else. Nothing is imported
across directories and nothing is re-declared.

### 3.2 Edits to files Phase 3 does not own — three files, ~10 lines, each named here

The first edit is the one an earlier draft of this plan missed, and it is exactly the mid-build
discovery R12 exists to prevent. `createDeckBox(session)` (`src/ui/unitrecord/deckBox.ts`) returns
`{ el }`: its `<textarea>` (`box`), its `refresh()`, its `put.disabled` state and its card-face
repaint are **all closure-private**, and `Session` has no channel to any of them. Calling
`session.setDeckText(text)` from the Autocoder view would update the session's parsed deck and leave
the box's text, its card faces and PUT DECK IN HOPPER stale — and then `box.addEventListener('input',
refresh)` would overwrite the session's deck from the stale textarea on the operator's next keystroke.
So the deck box needs a way in, and it is named here.

| File | Edit | Why |
|---|---|---|
| `src/ui/unitrecord/deckBox.ts` | Export the return type by name — `export type DeckBox = { readonly el: HTMLElement; setText(text: string): void };` — because `createDeckBox` today returns an **anonymous** `{ readonly el: HTMLElement }` (line 68) and `mount.ts`'s new return type below cannot name a type the module does not export; then `createDeckBox(session): DeckBox`, `return { el, setText };` with `function setText(text: string): void { box.value = text; refresh(); }`. **~5 lines: one exported type at the top, the annotation, and the function at the bottom.** Nothing else in the file moves. | `box.value` and `refresh()` are the two private things PUNCH INTO HOPPER has to touch, and `refresh()` already does the whole job: re-parse, repaint the card faces, re-enable PUT DECK IN HOPPER, clear the stale hopper note. The `sample deck` button in the same file does precisely this pair of statements today, so `setText` is that button's body, named. |
| `src/ui/unitrecord/mount.ts` | Return type `void` → `{ readonly deckBox: DeckBox }` (importing `DeckBox` from the row above); hoist `createDeckBox(gated)` out of the `host.append(...)` call into a `const deckBox`, and `return { deckBox };`. **~3 lines.** | The deck box is the one thing the Autocoder view needs back. **The `Session` is deliberately not returned**: `mountAutocoder(machine, deckBox, host, redraw)` (§3.1) takes the `Machine`, not a `Session`, so a returned `session` would have no reader — the speculative typing this plan refuses everywhere else. |
| `src/ui/internals/main.ts` | `+1` import of `mountAutocoder`; `mountUnitRecord(machine, app, redraw)` becomes `const { deckBox } = mountUnitRecord(...)` and `mountAutocoder(machine, deckBox, app, redraw)` follows it. **2 lines** (the capture is an edit to an existing line). | The same one-import-one-call cost `mountUnitRecord` itself carries, and `main.ts` owns the page's only machine and only `#app` lookup. |

**Why the typed method and not the `findAlterBox` trick.** `deckBox.ts` already contains the
alternative — `findAlterBox()` queries the ALTER `<input>` by DOM shape, with a visible copy-and-paste
fallback when it misses — so a selector-and-synthetic-`input`-event route (`.deck-box textarea`,
`dispatchEvent(new Event('input'))`) is precedented and needs **zero** edits outside `main.ts`. It is
refused anyway: a selector over another module's DOM shape is exactly what **Phase 4 rewrites**, and it
would break silently and at run time when it does, where `setText` breaks loudly at `npm run
typecheck`. The `findAlterBox` precedent earns its shape from having a *visible fallback for a human*;
this hand-off has none.

**And the hand-off is asserted without a DOM.** The text PUNCH INTO HOPPER hands over comes from the
Autocoder session's DOM-free `hopperText(): string` =
`formatDeck([...loaderDeck(result.deck), ...dataCards])` (`formatDeck` at `src/formats/card.ts:181`),
so wave 6 asserts `parseDeck(session.hopperText())` yields ten error-free cards in node (§13 criterion
11a). Only the two lines of DOM plumbing are left to the browser check (§13 criterion 11b).

`src/ui/unitrecord/cardView.ts` (`renderCard`), `src/ui/unitrecord/session.ts` (`Session`) and
`src/formats/card.ts` (`formatDeck`) are **imported, not edited** — importing is read-only use and is not a touch. `index.html` is **not**
edited: `.green-bar { white-space: pre; overflow-x: auto; }` already exists at line 34 and is reused,
and the source box's own styling lives inline in `sourceBox.ts` the way `deckBox.ts` does it.

### 3.3 Two justified one-liners outside `src/`

- **`tsconfig.tools.json`** — add `"src/asm/**/*.ts"` to `include`; `tools/asm.ts` cannot compile
  otherwise. **Both this and the `package.json` line land in wave 5, with `tools/asm.ts` itself.**
  An earlier draft put them in wave 2 on the ground that "the CLI is what lets waves 2-5 gate
  headlessly before any UI exists" — which is false: Vitest already gates headlessly in node, and
  every wave-2 oracle is a test file. The CLI earns its place in wave 5 and not before, as the single
  sanctioned `--update` path for the constructed listing golden (R4) and as the period-shaped
  `source → listing + deck` command a person can run outside a browser.

  **What `tools/asm.ts` calls in wave 5, since `assemble()` does not exist yet.** `src/asm/assemble.ts`
  is wave 6, so the wave-5 CLI **composes `parse → pass1 → pass2 → pack → listing → listing1403`
  itself**, module by module, exactly as the wave-4 tests do (§11 wave 4) — every one of those modules
  landed in waves 1-5 and the demo source landed in wave 4, so nothing in wave 5 reaches forward. In
  **wave 6** that composition is replaced by a single `assemble(text, opts)` call: **the CLI's
  main-function body is rewritten onto `assemble()`, ~15 lines, and that re-edit is named in the wave-6
  row of §11** so it is a planned edit to a Phase-3-owned file rather than a discovery. Its argument
  handling, its `--golden` / `--update` behaviour and its output files do not change, so
  `test/golden/hello-dad.lst` is byte-identical across the rewrite — which is the wave-6 check on it.
- **`package.json`** — add `"asm": "npm run build:tools && node build/tools/asm.js"`; a golden that
  only a browser can produce cannot gate a commit, and `--golden … --update` must be the single
  sanctioned regeneration path, exactly as `run-deck` does it.

### 3.4 Do not touch

`src/core/**` (read-only consumer — imports from `types.ts`, `bcd.ts`, `address.ts`, `isa/table.ts`,
`isa/dmods.ts`, `devices/printer1403.ts`, `machine.ts` are expected and fine) · `src/formats/**`
(emit into them exactly as shipped) · the rest of `src/ui/internals/**` and `src/ui/unitrecord/**` ·
`index.html` · any existing test or golden · `docs/plans/*.md` · `docs/research/*.md` outside the
dated Phase 3 open-questions section · `docs/BUILD-LOG.md` · `docs/BUILD-LOG-2.md` ·
`PHASE-1-NOTES.md` · `PHASE-1B-NOTES.md` · `PHASE-2-NOTES.md` · `CLAUDE.md` · `STATUS.md` ·
`DECISIONS.md`.

**`docs/STATUS.md` and `docs/DECISIONS.md` are the orchestrator's, updated at merge — never by a
wave.** `CLAUDE.md` requires STATUS.md current before a session ends, and the Phase 2 precedent is that
the merging orchestrator writes both while the build waves write only `BUILD-LOG-3.md`,
`PHASE-3-NOTES.md` and the dated `open-questions.md` section. That is why both files sit on this
do-not-touch list and stay there.

**A research correction discovered mid-build escalates to the orchestrator** and is never silently
edited — Phase 1b precedent, two real `opcodes.md` corrections. §7's `RW#` finding is already one such
escalation, declared here rather than found in wave 1.

### 3.5 The DOM-free guarantee — decision stated either way

`test/core-is-dom-free.test.ts` is an existing test on the do-not-touch list and is **not** edited. It
greps `src/core` only and forbids any import leaving `src/core`, so `src/formats` is already outside
it and `src/asm` cannot be folded in without editing it.

**Ruling: extend the guarantee with a Phase-3-owned file.** `test/asm-is-dom-free.test.ts` applies the
same banned code shapes to `src/asm/**`, with the import rule relaxed to "relative, and resolving
inside `src/asm`, `src/core` or `src/formats`". ~45 duplicated lines, zero edits to a Phase-1 file —
the right trade. `src/ui/autocoder/session.ts` is DOM-free too, by `unitrecord/session.ts`'s
precedent, so the node tests can drive the whole demo headlessly.

---

## 4. The load-bearing types

**Placement, and its citation.** `src/core/types.ts` and `src/formats/objectdeck.ts` both state the
rule: *a boundary type lives in `src/core/types.ts` only if something inside `src/core` names it.*
Nothing in `src/core` names `SourceCard` or `ListingLine`; `architecture.md` §3 item 8 says they "land
in Phase 3 with their producer" and that freezing them earlier "would be exactly the speculative
typing §12 disclaims." They live in **`src/asm/types.ts`** — one file rather than scattered beside
each producer, because `assemble.ts`, `pack.ts` and `listing.ts` all name `EmittedItem` and
`ListingLine` and a cycle among four modules is worse than one shared type file.

**`ObjectRecord` and `ObjectDeck` are imported from `src/formats/objectdeck.ts` and never redefined,
extended or forked.** Phase 2's hand-written decks against them are the reason
(`architecture.md` §5, "the one refactor this ordering deliberately avoids").

```ts
// ═══ src/asm/types.ts ══════════════════════════════════════════════════════════════════════
// PLACEMENT, and its citation: src/core/types.ts and src/formats/objectdeck.ts both state the
// rule — a boundary type lives in src/core/types.ts only if something inside src/core names it.
// Nothing in src/core names SourceCard or ListingLine; architecture.md §3 item 8 and §12 put
// them in Phase 3 WITH THEIR PRODUCER. ObjectRecord / ObjectDeck are IMPORTED below and are
// never redefined, extended or forked (architecture.md §2 B4).

// PrintChain is NOT in core/types.ts — it is `export type PrintChain = 'A' | 'H'` at
// src/core/devices/printer1403.ts:47, the same §3.4-sanctioned module §9 takes renderGreenBar,
// chainGlyph and PRINT_CHAIN_A_IS_DEFAULT from. Importing it from core/types.js would fail
// wave 1's first typecheck.
import type { Addr } from '../core/types.js';
import type { PrintChain } from '../core/devices/printer1403.js';
import type { ObjectDeck } from '../formats/objectdeck.js';

// ─── 1. The source card — software.md §1 (C28-0309-1 pp.5-7), 1-based, inclusive ───────────
export const SOURCE_COLUMNS = 80;
export const SOURCE_FIELDS = {
  page: [1, 2], line: [3, 5], label: [6, 15],
  op:   [16, 20], operand: [21, 72], ident: [76, 80],
} as const;
/** '*' HERE — and only here — is a comments card, text 7-72. A '*' in column 21 is the
 *  asterisk OPERAND. Two different asterisks; the COLUMN decides and nothing else does. */
export const COMMENT_COLUMN = 6;
/** A label BEGINNING here resolves HIGH-order even on a constant (software.md §5, C28-0326-2
 *  p.28). [likely] for the standalone — COL7_INDENT_IS_STANDALONE_TOO, §15. */
export const LABEL_INDENT_COLUMN = 7;
/** CTL's core-size and suppress codes are read by ABSOLUTE column, which is why Statement
 *  keeps the raw card (software.md §6). */
export const CTL_CORE_SIZE_COLUMN = 22, CTL_SUPPRESS_COLUMN = 23;
/** Standalone default origin — the loader occupies storage below it, and LOADER_CEILING in
 *  src/formats/loader.ts is 00499 (software.md §2, §9). */
export const ORG_DEFAULT: Addr = 500;
/** CTL absent = 20K (software.md §6, [verified]). */
export const CORE_SIZE_DEFAULT = 20_000;

/** EXACTLY 80 characters, in the project's 64-glyph alphabet — the one bcdOfGlyph accepts.
 *  A bare alias, per architecture.md §3 item 8. Not a `Card`: the assembler reads TEXT; the
 *  card face is a rendering. */
export type SourceCard = string;

/** software.md §6, C28-0309-1 pp.17-20 — the STANDALONE set. The OS F/M/N/O/R/U/W set is not
 *  carried. DATA on a listing line, NEVER a throw. */
export type AsmFlag = 'F' | 'U' | 'M' | 'O';

// ─── 2. The parsed statement ───────────────────────────────────────────────────────────────
export type AddressKind =
  | 'blank' | 'actual' | 'symbolic' | 'asterisk' | 'literal' | 'addressConstant'
  /** The three-position I/O x-control field — `%10` in `RW1 %10,LINE,$`. NOT an address: never
   *  index-tagged, never adjusted, never resolved. It is operand 1 of the ONLY form whose
   *  `lengths` is `[10]` (ops `L` and `M`), and §5.2 step 3 rule 1 decides it BEFORE any head test,
   *  because `%10` matches none of the address heads and would otherwise fall through to
   *  'symbolic' and flag F — which is the demo's first instruction. */
  | 'xcontrol';

export type LiteralKind = 'numeric' | 'alphameric' | 'areaDefining' | 'addressConstant';

export interface Literal {
  readonly kind: LiteralKind;
  readonly text: string;            // as written, sign and @…@ included
  readonly cells: Uint8Array;       // what the processor-generated DCW will hold, WM high-order
  /** ≤9 digits + sign, or 1-9 alphameric characters: pooled ONCE per program section. Longer
   *  literals are allocated on each occurrence (software.md §3). */
  readonly pooled: boolean;
}

export interface Operand {
  readonly kind: AddressKind;
  readonly text: string;            // as written, for the OPERAND column
  readonly symbol?: string;
  readonly actual?: number;
  /** The SUM of every ±ddddd term written after the address (software.md §2). */
  readonly adjust: number;
  /** 0..15. With several +Xn tags only the RIGHTMOST is effective (software.md §2). */
  readonly tag: number;
  /** A tail `+NAME`, resolved in pass 2 against an index EQU — which is precisely why parse
   *  and resolve are separate passes. */
  readonly tagSymbol?: string;
  /** Any index term at all. DS / ORG / LTORG / control operations reject it -> F. Also
   *  rejected on an x-control field and on G (architecture.md §5, A22-0526-3 pp.11, 22). */
  readonly tagWritten: boolean;
  /** ADJUSTMENT AND INDEXING MODIFY THE LITERAL'S ADDRESS, NOT ITS VALUE (software.md §3):
   *  `adjust` and `tag` live here, `literal.cells` is untouched. An implementation that folds
   *  them into the constant is subtly and silently wrong. */
  readonly literal?: Literal;
}

export interface Statement {
  readonly seqno: number;           // 1-based over all cards; the listing's SEQNO
  readonly card: SourceCard;        // the raw 80 columns — CTL reads 22-23 by position
  readonly pglin: string;           // cols 1-5 verbatim
  readonly comment: boolean;        // '*' in column 6
  readonly label: string;           // cols 6-15, trailing blanks trimmed
  /** Column 6 blank, column 7 not — resolves HIGH-order (software.md §5). */
  readonly labelIndented: boolean;
  /** All digits: refers to the HIGH-order position, creates a symbol, and NEVER moves the
   *  assignment counter (software.md §1, [verified], both sentences). */
  readonly labelIsActual: boolean;
  readonly op: string;              // cols 16-20, trimmed
  readonly operands: readonly Operand[];
  readonly d?: string;              // the explicit d, when the mnemonic does not bake one in
  readonly comment_text: string;    // everything after the first double blank OUTSIDE a literal
  readonly format?: string;         // the F-flag message, if the line would not parse
}

// ─── 3. The symbol table ───────────────────────────────────────────────────────────────────
export interface SymbolEntry {
  readonly name: string;
  readonly value: Addr;
  readonly kind: 'instruction' | 'constant' | 'area' | 'equate' | 'literal' | 'actual';
  /** software.md §5: LOW-order for a constant with an ordinary label; HIGH-order for an
   *  instruction, a DA header, a column-7 label or an actual label. */
  readonly resolvedTo: 'lowOrder' | 'highOrder';
  readonly indexRegister?: number;  // EQU's `X2` / `2,X` form
  readonly definedAt: number;       // seqno of the FIRST definition; that value stands
  /** A later definition sets this on ITSELF and flags M (software.md §6). */
  readonly duplicate: boolean;
}
export type SymbolTable = ReadonlyMap<string, SymbolEntry>;

// ─── 4. What pass 2 produced, before it is cut into cards ──────────────────────────────────
/**
 * `cells` is the SAME convention ObjectRecord.payload uses: word mark in bit 7, NO C bit — the
 * deck has no parity because a load-mode read replaces the whole target byte and recomputes it
 * (objectdeck.ts header, io.md §3).
 *
 * THERE IS NO `present` BITMAP. Absence IS the gap between items: a DS emits no item, so the
 * addresses it reserves are simply not covered, and pack.ts's record-break rule reads the gap
 * directly (§8.2). That is what keeps "DS emits nothing and does not clear the area" a property
 * of the data rather than a flag someone has to remember to set.
 *
 * `items` is also the LEFT-HAND SIDE of the closed-loop oracle (§11 wave 2).
 */
export interface EmittedItem {
  readonly at: Addr;
  readonly cells: Uint8Array;
  readonly seqno: number;
}

// ─── 5. The listing line — architecture.md §2 B3, the STANDALONE column set ────────────────
// The OS-only columns (S/G, REL, the wider F/M/N/O/R/U/W flag set) are NOT carried: they belong
// to the relocatable assembler whose object format we deliberately do not implement
// (software.md §8.2, architecture.md §12).
export interface ListingLine {
  readonly seqno: number;
  readonly pglin: string;                 // source cols 1-5, as punched
  readonly label: string;
  readonly opcod: string;
  readonly operand: string;
  /** CT — assembled length of an imperative, or positions reserved by a declarative
   *  (C28-0326-2 p.11 semantics, adopted). */
  readonly ct?: number;
  /**
   * ADDRS — ONE RULE, not two: **the address a label on this statement WOULD resolve to** —
   * the resolution rule applied to the statement's kind and to the column its label field
   * begins in, whether or not a label is actually written. Phrased as "this statement's own
   * label" the rule is undefined for the majority of lines: Exhibit IV's SEQNO 37 (`BXPA`,
   * 00192, high-order) and SEQNO 38 (`DCW #5`, 00203, low-order) are both UNLABELLED.
   * Low-order for a constant in an un-indented label field; HIGH-order for an instruction, a DA
   * header, a column-7-indented label field or an actual label. That single rule explains every row
   * of software.md §5's Exhibit IV evidence table — the constants at 00203 / 00208 / 00239 AND
   * the column-7 DCs at 00396 / 00402 AND the DA header at 00315 — where B3's two-rule phrasing
   * has to special-case the last two.
   */
  readonly addrs?: Addr;
  /** INSTRUCTION — the manual's own spacing: `D 00394 00306 L`. A zone-tagged digit renders as
   *  its glyph, which is what the manual prints (`D 030Y9 00140 C`). Blank for a declarative
   *  that emits nothing. */
  readonly instruction?: string;
  /** CARD — the object-deck card sequence number this item rode in on. Back-filled from pack(),
   *  which is why the listing is built AFTER emission and packing (C28-0326-2 p.11). */
  readonly card?: number;
  /** ONE flag, precedence O > F > M > U — ONE_FLAG_PER_LISTING_LINE, §15. */
  readonly flag?: AsmFlag;
  /** The flag's message and column, for the view's modern error block. The FLAG column prints
   *  only the period letter. */
  readonly why?: string;
  readonly kind:
    | 'heading' | 'comment' | 'imperative' | 'declarative'
    | 'control' | 'literal' | 'daSubEntry' | 'symbolTable' | 'trailer';
}

// ─── 6. Options and result ─────────────────────────────────────────────────────────────────
export interface AssemblyOptions {
  /** The listing's print chain, default 'A'. The ONE option, with one caller each: the view's
   *  A/H toggle and the CLI's --chain. `origin` and `coreSize` are deliberately NOT here —
   *  the origin comes from ORG (default ORG_DEFAULT) and the core size from CTL column 22
   *  (absent = CORE_SIZE_DEFAULT), both read from the source, and an override with no caller
   *  is the speculative typing ARCHITECTURE.MD §12 disclaims — not this plan's §12, which is
   *  Test tiers. */
  readonly chain?: PrintChain;
}

export interface AssemblyResult {
  /** false if ANY line carries a flag. The deck is STILL returned; it is just wrong — the
   *  view refuses to hopper it, the precedent deckBox.putDeckInHopper set in Phase 2. */
  readonly ok: boolean;
  readonly listing: readonly ListingLine[];
  /** src/formats/objectdeck.ts's type, unmodified. `entry` comes from END's operand, and
   *  loaderDeck() turns it into the execute card. */
  readonly deck: ObjectDeck;
  readonly items: readonly EmittedItem[];
  readonly symbols: SymbolTable;
  /** The flagged subset, so the view does not re-filter the listing. */
  readonly flagged: readonly ListingLine[];
  /** Deck-level facts that are NOT one of F/U/M/O, because that flag set is CLOSED and
   *  published (software.md §6): the last record's terminating GM-WM landing inside the
   *  program after a backwards ORG (§8.3), an object core size larger than the machine's. */
  readonly warnings: readonly string[];
  /** The LOAD control card: "a load program should precede the object deck" = loaderDeck(). */
  readonly wantsLoader: boolean;
  /** JOB / RESEQ -> cols 76-80 of every condensed card. */
  readonly ident: string;
  readonly heading: string;               // JOB -> the listing heading
  readonly coreSize: number;              // CTL col 22, or 20_000
  /** CTL column 23 AS PUNCHED — a single character, `'1'` = suppress punch, `'2'` = suppress
   *  print, blank = neither (software.md §6). One character, not an independent pair: the
   *  card holds one code and modelling it as two booleans invents a state the card cannot
   *  express. Its ONE consumer is `tools/asm.ts`: `'1'` writes no deck file, `'2'` prints no
   *  listing. The view ignores it — a person who pressed ASSEMBLE wants to see both. */
  readonly suppress: string;
}

```

**Three signatures, defined by their owning module — NOT content of `types.ts`.** They are written
here as `declare` so the shapes are settled before wave 1, but a worker who pastes them into
`types.ts` gets ambient declarations whose implementations live somewhere else and an `AssemblerBug`
that cannot be thrown. Each is a real export of the module named beside it:

| Signature | Owner | Wave |
|---|---|---|
| `function assemble(text: string, opts?: AssemblyOptions): AssemblyResult` — THE one entry point; NEVER throws on source content, every defect is a flag on a line | `src/asm/assemble.ts` | 6 |
| `function applyToStorage(items: readonly EmittedItem[], st: { setChar(a: Addr, bcd6: number, wm: boolean): void }): void` — the closed-loop oracle's left-hand side | `src/asm/emit.ts` | 2 |
| `class AssemblerBug extends Error {}` — a **real throwable class**, not a declaration. Thrown ONLY for an assembler-internal invariant violation, e.g. an assembled length not in `OPS[octal].forms[].lengths`; source errors never reach it (§6.3). NOTE the sentinel: `ANY_LENGTH` is the EMPTY ARRAY (`table.ts:88`) and it is what `N` (NOP) carries, so the check must read `lengths.length === 0 \|\| lengths.includes(n)` — a naive `includes` throws on every NOP in a source deck | `src/asm/emit.ts` | 2 |

`types.ts` itself carries only types, interfaces and the column constants above — nothing executable,
which is what keeps wave 1's first `npm run typecheck` honest.

---

## 5. The parsers

### 5.1 Source cards — `source.ts`

One line of pasted text = one source card, right-padded to exactly 80 characters; a line longer than
80 is an `F`; `\r` and trailing whitespace are stripped before columns are counted, the `parseDeck`
precedent (`PHASE-2-NOTES` §2 deviation 2). A tab is an `F` — the UI carries a **column ruler** above
the textarea instead, which is what the X24-1350 coding sheet was. No convenience padding of the
label field: that would be a second source language.

Fields sliced by the `software.md` §1 column table (`[verified]`, C28-0309-1 pp.5-7): page 1-2,
line 3-5, label 6-15, operation 16-20, operand 21-72, ident 76-80. Columns 73-75 are ignored on
input — the processor *writes* the object-deck sequence number there on **output** cards, it does not
read it (§1's own note).

Three rules that bite, all `software.md` §1 and §5:

- **`*` in column 6 is a comments card**, text 7-72, no assembly, one `ListingLine` with no CT and no
  ADDRS. A `*` in column 21 is the asterisk **operand**. The column decides.
- **The column-7 indent.** `labelIndented` is true when column 6 is blank and column 7 is not. On a
  constant this makes the label resolve **high-order** instead of low-order. The sentence is
  C28-0326-2 p.28's; C28-0309-1 says only "except as described in dc or dcw", so this is `[likely]`
  for the standalone → `COL7_INDENT_IS_STANDALONE_TOO` (§15). Exhibit IV's rows at 00396 and 00402,
  corroborated by the punched card whose cols 2-6 read `00396` with count `00012`, are the evidence
  that it is real.
- **A character outside the 64 glyphs.** The single most likely thing a person typing into a
  textarea produces — lowercase, `~`, `[`, a smart quote pasted out of a PDF — and the contract says
  the stored card is in the alphabet `bcdOfGlyph` accepts, so it needs a stated rule rather than an
  implementation's accident. **Lowercase up-cases**, a typing alias exactly like `+` and with a
  constant of its own (`SOURCE_LOWERCASE_UPCASES`, §15): the 1410 has no lowercase and the coding
  sheet was written in capitals, so up-casing costs nothing and refusing it would fail a deck that
  is unambiguously right. **Anything else `bcdOfGlyph` rejects is an `F` on that line**, with its
  1-based column in `why`; the position stores as a blank so the card is still 80 valid glyphs and
  the listing still renders that line. One `F` per line (§6.3) reports the leftmost offender and the
  message says how many more there were.
- **An actual (numeric) label.** `software.md` §1, verbatim and `[verified]`: it "refers to the
  high-order position of the instruction, constant, or defined field" and "**Actual labels have no
  effect on the address assignment counters.**" So it defines a symbol at that address, resolves
  high-order, and moves nothing. It is not an origin, and the fallback if that reading is ever
  overturned is **not** "treat it as an implicit ORG" — that would contradict the second `[verified]`
  sentence — but "define the symbol and do not cross-check the counter"
  (`ACTUAL_LABEL_IS_CHECKED_AGAINST_THE_COUNTER`, §15).

**The plus sign is the 12-punch.** Autocoder writes `+` for adjustment, for index tags, for
numeric-literal signs and for address constants — and there is no `+` among the 64 machine glyphs.
Hollerith **12** is BCD `0o60`, which `bcd.ts` names `&` and a chain-A 1403 prints as `&`
(`charset.md` §5, `src/core/bcd.ts` rank 6). So `source.ts` accepts `+` as a **typing alias** that
normalises to `&` before the card is stored, exactly as `parseDeck` accepts `{12}`; the stored
`SourceCard` is in the 64-glyph alphabet, and the listing, printed through chain A, shows `A&3` where
the manual prints `A+3`. One line of UI text says so. `SOURCE_PLUS_IS_THE_12_PUNCH` (§15).

**Which representation `operand.ts` sees, stated once so it cannot be got wrong silently.**
`operand.ts` scans the **stored 64-glyph card**, never the typed text. So its term introducers are
**`&` and `-`**, not `+` and `-`: `+` exists only in the typing layer inside `source.ts` and is gone
before a `Statement` is built. Getting this backwards breaks every address adjustment, every index
tag, every numeric-literal sign and every address constant at once, and breaks them quietly. §5.2 is
written in `+` because the manual is, and every rule there is to be read with `+` meaning the stored
`&`. The wave-3 worked-equivalence gate is therefore, in the stored alphabet:

```
A TOTAL&3&X1-12&X2,ACCUM-5&X2&35     ≡     A TOTAL-9&X2,ACCUM&30&X2
```

### 5.2 Operands — `operand.ts`

One pipeline over the 52 columns of the operand field. **The order is the manual's own, and it
matters.**

**Step 1 — locate the alphameric literal span, THEN cut the comment.** `software.md` §3: the processor
"scans from column 72 right-to-left for the closing `@`". `software.md` §1: the comment "begins after
≥2 blanks". Those two rules interact, and the interaction is the most attractive bug in this file:
`MLC @AB  CD@,FIELD` contains two blanks **inside** a literal. The right-to-left scan exists precisely
so the literal's extent is known before any blank scan runs. So: find the first `@`; scan leftward from
column 72 for the closing `@`; then cut the comment at the first double blank **outside** that span.
An unmatched `@` is `F`. A trailing comment that itself contains an `@` breaks the statement, and that
is the documented behaviour, tested by name.

**Step 2 — split on commas outside the literal span.** At most three operands: A, B, d. An **empty**
operand is a blank address (chaining), which is meaningful, not missing — and §6.1's length rule reads
`operands.length` **and** which of them are empty, never "operands present": `B` (nothing written),
`B ,LOOP` (A written empty, B written) and `B LOOP` are three different statements and, on a chainable
op, three different lengths.

**Step 3 — classify each operand. An ORDERED, exhaustive decision list, keyed on position first and
first character second** (`software.md` §2, §3). Order is the whole content of this step: several of
these tests overlap, and the first match wins. The list classifies **address** operands only: the
explicit d (below) is a single glyph checked against the resolved form's `dModifiers` and never enters
this list, which is why `EOJ CC1 1`, `W1 %20,LINE,W` and `RW1 %10,LINE,$` have nothing here to say
about their last operand.

0. **Control operations whose operand is not an address at all — tested FIRST, before the x-control
   test, because each of the three would otherwise fall through to rule 9 and flag `F` on a perfectly
   good card.** The forcing case is the demo's own JOB card (§10):
   `JOB  HELLO DAD - REENTRY TABLE` is a 25-character operand with blanks and a hyphen, and the
   symbolic rule would flag it.
   - **JOB** — the operand is **free text**, taken verbatim from **columns 21-72** of the raw card. It
     is never classified, never comma-split, and never comment-cut (a JOB heading may contain double
     blanks); it becomes `AssemblyResult.heading` as punched, trailing blanks trimmed. The ident comes
     from the same card's columns 76-80, not from this field (`JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80`).
   - **CTL** — the operand field is read **only by absolute column**: core size at column 22, suppress
     code at column 23, off the raw `SourceCard` (`CTL_CORE_SIZE_COLUMN` / `CTL_SUPPRESS_COLUMN`, §4).
     The demo's card 3 has column 21 **blank** and column 22 = `1`, so any rule that keyed on the
     operand's first character would read a blank operand. Nothing here is classified.
   - **RUN** — the mode word is in the **label field** (`AUTOCODER` / `SYSTEMS`, §2.2's RUN row), and
     the operand must be **blank**; a non-blank RUN operand is `F`. Nothing is classified either way.
   - **Comment cards** (`*` in column 6) never reach step 3 at all — §5.1 ends them at parse.
1. **Position 1 of an I/O form** (the resolved mnemonic's form has `lengths: [10]` — ops `L` and `M`,
   and nothing else in `OPS` does) → **`xcontrol`**, before any head test. Three positions exactly
   (`software.md` §10.9, "the x-control field is always 3 positions"), validated glyph by glyph
   against `src/core/isa/dmods.ts`: **x1** must be a `X1_CHANNEL` row with `onThe1410: true` — `%`
   `@` `⌑` `*` — and an `onThe1410: false` row (`?` `!` `$`, the 7010's channels 3 and 4) is `F`;
   **x2** must be an `X2_DEVICE` glyph; **x3** is the device-dependent selector (pocket, unit) and is
   checked only for being one of the 64 glyphs, because `X2_DEVICE` carries no x3 column. Channel-2
   glyphs assemble — §2.5, the assembler assembles the machine, not the configuration. It is
   **never** index-tagged (step 5), **never** adjusted, and never resolved against the symbol table:
   an `&` or `-` anywhere in it is `F`. `%10` matches none of the address heads below and would
   otherwise fall through to `symbolic` and flag `F` — on the demo's **first instruction**.
2. **Empty** → `blank` (chaining). Not "missing", not `F`.
3. **`@` first** → **alphameric literal** (closing `@` already located in step 1; the word separator
   0-5-8 may never be its first character — `F`; ≤52 characters, must not extend past column 72).
   **It is a literal only in an imperative.** Written as the operand of a **declarative** — `DCW` /
   `DC` / `DA` / `DS` — the same `@…@` is that statement's own **constant**, emitted at that
   statement's address, and it does **not** enter the literal pool (§6.1). `ID DCW @HELLO1@` is the
   demo's case and the reason its deck is two records rather than three.
4. **`+`/`-` first, then digits only** → **numeric literal**; the sign is **required** and is placed
   as a zone over the units position.
5. **`+` first, then a letter, and the `+`-term is the WHOLE operand** → **address-constant literal**
   `+LABEL`: five characters, **unsigned in storage**. If anything follows the name, it is not this
   (rule 8 takes it).
6. **First character `#`, or a `#` reached while scanning the head and every character before it is a
   legal symbol character** → **area-defining literal** `WKAREA#6` / `#0005`: n blank positions via a
   processor-generated DCW, word mark on the high-order position, **label resolves low-order**. Over
   500 positions → `F`. This is a **head-then-scan** test, not "contains `#`", which is what settles
   the three collisions an unordered rule leaves open: a `#` inside an `@…@` span is data (rule 3
   already consumed it, so `@A#B@` is an alphameric literal), a `#` after an adjustment or index term
   is `F` (nothing may follow the term tail), and `DCW #5`'s operand is this rule, matched at its
   first character — though as a **declarative's** operand it is that DCW's own blank constant and
   does **not** pool, exactly as in rule 3 (§6.1).
7. **`*` first** → **asterisk** (and see the two meanings, below).
8. **1-5 digits, then a term tail or end** → **actual** (leading zeros optional).
9. **Otherwise** → **symbolic**: ≤10 characters, first alphabetic, no specials; else `F`. A DCW's
   **address constant** `LABEL+10` is this rule plus step 4's tail — it is an *operand of a
   declarative*, resolved to a 5-position value at emission, and is a different thing from the
   address-constant **literal** `+LABEL` of rule 5, which is a pooled constant with an address of its
   own. Both appear in `software.md` §5; the `+` is leading on one and trailing on the other, which
   is exactly what rules 5 and 9 key on.

**Step 4 — the term tail**, repeated `+`/`-` groups after the head (never after an `xcontrol`):

- `±ddddd` → an **adjustment** term. **All adjustment terms are summed.**
- `+X1` … `+X15`, or `+` followed by a symbol EQU'd to an index register → an **index** term. With
  several on one address **only the rightmost is effective**. `+X0` / `+X16` → `F`.
- Position disambiguates `+NAME`: as the whole operand it is an address-constant literal (rule 5); in
  the tail it is an index term recorded as `tagSymbol` and resolved in pass 2.

The manual's own worked equivalence is the wave-3 gate, asserted structurally:
`A TOTAL+3+X1-12+X2,ACCUM-5+X2+35` ≡ `A TOTAL-9+X2,ACCUM+30+X2` (`software.md` §2, `[verified]`) —
scanned in the stored alphabet, where every `+` above is an `&` (§5.1).

**Step 5 — where indexing is rejected.** Not accepted in **DS, ORG, LTORG or control operations**
(`software.md` §2, `[verified]`), and additionally not on an **x-control field** or a **`G` Store
Address Register** instruction (`architecture.md` §5; A22-0526-3 pp.11, 22). `tagWritten` on any of
those → `F`, and the tag is ignored. The demo and the loader-source oracle both emit I/O instructions,
so the x-control exclusion is not academic.

**The explicit d** is the operand after the addresses the op's form takes:
`BCE ENTRYA,SWITCH,2` → `B 00392 00498 2` (`software.md` §4, `[verified]` for the two-address case;
`D_FOLLOWS_THE_ADDRESSES` generalises it, §15). One glyph. Three rulings, so no worker has to guess:

- the resolved form takes **no** d (`dModifiers: 'none'`) → `F`, "this operation takes no d-modifier";
- the form takes a d and the written glyph **is not a key of that form's `dModifiers`** → `F`,
  "d-modifier `x` is not defined for this operation", listing the keys. The one exception is
  `dModifiers: 'any'` (BCE), where the d **is** the compared character and every glyph is legal;
- the mnemonic already bakes a d and an explicit one is written → **the explicit one wins**, and the
  line carries no flag. That is what makes `BZN LOOP,SWITCH,AB` writable at all
  (`V_ZONE_WORD_IS_THE_THIRD_OPERAND`, §15) and what lets a person reach a d the mnemonic table has
  no name for. The listing's INSTRUCTION column shows what was assembled, which is where a reader
  sees the override.

**Two asterisks, again, and they differ by seven.** As an ordinary operand `*` is the address of the
**last character of the instruction it appears in**; in EQU / ORG / LTORG it is the **current
assignment counter**. `EOF EQU *` after a 7-character instruction at 00209 is **00216**, not 00215
(`software.md` §2, `[verified]`). The two readings live at two call sites and never share a helper.

Everything the parser cannot make sense of is an `F` on that line, with a column number and a message.
**Errors are data.**

---

## 6. Two passes

```
parse   text -> SourceCard[] -> Statement[]              source.ts + operand.ts + mnemonics.ts
                                                         (operand.ts READS the resolved form:
                                                          step 3 rule 1 keys on lengths [10],
                                                          the explicit-d rulings on dModifiers)
pass1   Statement[] -> { SymbolTable, sized[], reserved[] }  symbols.ts + literals.ts
pass2   sized[] -> EmittedItem[]                         emit.ts
pack    (EmittedItem[], reserved[]) -> ObjectRecord[] -> ObjectDeck
                                                         pack.ts   (returns cardOf: seqno -> card;
                                                          `reserved` = the DS / DA extents §8.3's
                                                          GM-WM tail rule needs — TWO arguments)
listing sized[] + cardOf -> ListingLine[]                listing.ts
render  ListingLine[] -> PrintLine[] -> string           listing1403.ts
```

### 6.1 Pass 1 — the assignment-counter walk

**Pass 1 needs no symbol values, and that is what makes one pass enough.** An instruction's length is
a function of the **shape** — `(opChar, address-operand count, which of them are empty, x-control
present, d present)` — and never of what a symbol resolves to. `mnemonics.ts` returns the shape;
`symbols.ts` advances the counter; **`OPS[octal].forms[].lengths` VALIDATES the result and never
drives it** — Phase 1's own rule, unchanged.

**The shape ladder, enumerated off `table.ts` rather than from memory,** because an earlier draft's
"one address = 6, two = 11, two plus a d = 12, `J` = 7, `G` = 7" is wrong for ops the demo itself
uses — `R` and `X` carry `lengths: [7]` and **7 only** (`table.ts`: *"7 ONLY — no chained
1-character form"*; `opcodes.md` §2 row 211 says it verbatim), so `BEF1 EOJ` and `BA1 *+1` would each
advance the counter by 6 and the whole ladder below 00510 would slide by one per branch:

| Length | Layout | Ops carrying it |
|---|---|---|
| 1 | op alone, everything chained | every `chainable: true` op |
| 2 | op + d | `F` / `2` carriage, `K` / `4` stacker, `P` / `Q` **MICR short-form control** (`table.ts`: `feature: 'micr'`, *"MICR short-form control, channel 1 / 2"* — **not** unit control, which is `U`, the next row) |
| 5 | op + unit + d | `U` tape unit control (out of scope; resolves) |
| 6 | op + one 5-digit address | `A S C @ % Z E / ! ? , ⌑ .` and `B T V W D`'s chained form (which reuses the previous d — `table.ts`'s own BCE note — so 6 is *not* "one address + d") |
| 7 | op + one address + d | `J` `R` `X` `G` `Y` `$` |
| 10 | op + 3-position x-control + address + d | `L` and `M`, the I/O form, and nothing else |
| 11 | op + two addresses | `A S C @ % Z E / ! ? , ⌑` |
| 12 | op + two addresses + d | `B T V W D` |
| any | `N` — `lengths` is `ANY_LENGTH`, the **empty array** (`table.ts:88`) | `N` |

The shape function picks the form by matching `(address count, d present)` to those layouts, and
§6.3's `AssemblerBug` check reads `lengths.length === 0 || lengths.includes(n)` — the empty array is
the ANY sentinel, not an empty set, and a naive `includes` would throw on every `NOP`.

Rules, all `[verified]` in `software.md` §5 unless marked:

- Counter starts at **00500** with no ORG (`ORG_DEFAULT`).
- **Comment cards** and **non-allocating controls** (JOB CTL RUN LOAD EJECT RESEQ PST END): a listing
  line, counter untouched.
- **ORG**: actual, previously-defined symbolic, blank (= high-water + 1), or `*` with adjustment.
- **LTORG**: flush the pool at the operand address (or the counter for `*`), assigning each pooled
  literal **in encounter order**; the counter advances past the pool; area-defining-literal labels die.
- **EQU**: value = the resolved operand, `*` = the counter. No emission, no movement.
- **DCW / DC**: counter advances by the constant's length. DCW marks the high-order cell; DC does not.
- **DS n**: counter advances by n, **nothing is emitted**, the area is **not** cleared.
- **DA**: total = `b × l`; header label high-order of the whole area; `hi,lo` sub-entries mark the
  field's high-order and resolve low-order; a bare `lo` defines a subfield with no mark.
- **Actual label**: defines the symbol at that address, resolves high-order, **moves nothing**, and is
  cross-checked against the counter (mismatch → `F`, §15).
- **Duplicate definition**: `M` on every later definition; the **first value stands**; references to a
  multiply-defined name assemble against the first value and are **not** flagged
  (`MULTIPLY_DEFINED_KEEPS_THE_FIRST_VALUE`, §15).
- **Literals** in any operand are appended to the pool in **encounter order** — deduplicated for the
  poolable kinds (≤9-digit numerics, 1-9-character alphamerics), appended per occurrence for longer
  ones (`software.md` §3). **A constant written as the operand of a declarative — DCW, DC, DA, DS —
  is that statement's constant and NEVER enters the literal pool**; only operands of **imperatives**
  and of ORG / LTORG / END pool. A literal *is* a request for a processor-generated DCW
  (`software.md` §5's pooled-literal rows), so pooling a DCW's own operand would generate a second
  copy of the constant at the flush point — and on the demo that second DCW lands past 00643 at the
  END flush, adds a **third** object record, and breaks §13 criteria 3 and 5 (`records.length === 2`)
  while the assembler still reports `ok: true`. **The demo has no literal pool at all**, which is
  exactly why it packs into two records; `ID DCW @HELLO1@` is a constant, not a literal
  (§5.2 step 3 rule 3).

**ADDRS is one rule, stated once and implemented once:** *the address a label on this statement
**would** resolve to* — the rule applied to the statement's kind and to the column its label field
begins in, whether or not a label is written (Exhibit IV's SEQNO 37 and 38 are both unlabelled and
both carry an ADDRS). See the `ListingLine.addrs` comment in §4 for why that formulation and not
B3's two-rule phrasing.

### 6.2 Pass 2 — resolution and emission

For each statement in source order:

1. Resolve each operand: symbol lookup (undefined → `U`, value 0, so every later address stays right),
   plus the summed adjustment, plus the rightmost index tag (symbolic tags resolved here).
2. Range-check against `coreSize` (CTL col 22, default 20K) → `F`.
3. **`encodeAddress(value, tag)`** — §8.1.
4. Emit cells: the op character **with a word mark** (A22-0526-3 p.11 — the assembler is what sets it;
   J24-1433-2 adds that the loading routine also sets one at load time), then the fields the form
   takes. No interior word marks.
5. Declaratives emit under the §8.2 table; pooled literals emit DCW-style at their assigned addresses.
6. Build the INSTRUCTION column text in the manual's own spacing: `D 00394 00306 L`.

### 6.3 The error model, in one paragraph

`F` / `U` / `M` / `O` are **fields on `ListingLine`**, never exceptions (`software.md` §6). An errored
assembly still returns a deck of everything it could emit, `ok` is false, and the view refuses to
hopper it. **One flag per line**, because the listing has one FLAG column and no source says whether a
line can print several: precedence **O > F > M > U** — you cannot judge an operand before you know the
op, or a label before you can parse the line (`ONE_FLAG_PER_LISTING_LINE`, §15).

The only throw in `src/asm` is `AssemblerBug`, and it has exactly one trigger: an assembled length
that is not in `OPS[octal].forms[].lengths` — where **`ANY_LENGTH` is the empty array and matches
every length** (§6.1), so the check is `lengths.length === 0 || lengths.includes(n)`. Every path that
produces a length is our own code, so source content cannot reach it. Deck-level facts that are not one of the four flags — the GM-WM tail
of §8.3, an object core size larger than the machine's — go to `AssemblyResult.warnings`, because the
flag set is closed and published and inventing a fifth letter would corrupt the listing.

---

## 7. Mnemonic resolution against `src/core/isa/table.ts`

### 7.1 What the shipped table actually holds — read before designing

`OPS[].autocoder` is a **flat list of mnemonic strings per op character**, mirrored from
`opcodes.md` §2's Autocoder column and machine-checked against the research row-for-row by
`test/isa-table-vs-research.test.ts` — whose own header says: *"Autocoder, Timing and Cite are
prose/provenance columns with no machine-checkable counterpart in `OpForm`."* **Read as shipped it is
sufficient for validation and insufficient for resolution**, for four reasons, each verified in the
file:

1. **No mnemonic → d map.** `OP_V.autocoder` is `['BW','BZN','BWZ']`; the nine d-characters live in
   `V_D_TABLE`. `OP_R.autocoder` is `['BNR1','BCB1','BER1','BEF1','BWL1','BNT1','BEX1','BA1']` with no
   d at all.
2. **Two entries are patterns, not names.** `OP_D.autocoder` is
   `['M{L,R}{N,Z,C,W,NW,ZW,CW}{S,A,B,␣,R,G,M}', 'SCN{L,R}{…}']`.
3. **The lists are incomplete.** `opcodes.md` §2's `J`, `L` and `M` rows end in a literal `…`; the
   ellipsis is *not* carried into `table.ts`'s arrays, which are plain strings — so the incompleteness
   is invisible from the code side and visible only in the research.
4. **`'RW#'` appears under BOTH `OP_L` (043) and `OP_M` (044)** — in `table.ts` and in `opcodes.md`
   §2's own rows 206 and 207. So `mnemonic → opChar` is **not a function**.

**Adding a column to `table.ts` would be a do-not-touch violation.** So Phase 3 owns
`src/asm/mnemonics.ts` — **keyed to** the core tables and **diffable against** them — and most of it is
*generated*, not typed.

### 7.2 The `RW#` collision — the ruling and the escalation

`RW#` = "Read **with Word marks**" = **load mode** = machine op `L` (043), which is what
`software.md` §10.6 describes and what `src/formats/loader.ts`'s own regenerable source uses
(`RW# %10,WORK,$` at 00282, assembled as `L%1000090$`). `OP_M`'s copy is very probably a transcription
artifact in `opcodes.md` §2's `M` row.

**Ruling: `RW#` resolves to `L` — `RW_HASH_IS_LOAD_MODE` (§15), the `// OPEN:` constant at the row,
`[likely]`.** The collision and its reasoning sit in a comment at the row, the
both-directions test (§7.4) carries `RW#` on a named `AMBIGUOUS` list so it satisfies containment from
both `OP_L` and `OP_M`, and **the finding escalates to the orchestrator as a probable `opcodes.md`
correction** — never a silent edit (Phase 1b precedent: two real corrections). The demo's very first
instruction is `RW1`, so this is ruled in the plan rather than discovered in wave 1.

### 7.3 Four families derive with no new data at all

| Family | Derivation from `isa/dmods.ts` | Proof, all re-derivable in this repo |
|---|---|---|
| `D` Move/Scan — **64** mnemonics (8 `MOVE_PORTION` rows × 8 `MOVE_DIRECTION` rows), behind `MOVE_MNEMONIC_IS_DIR_PORTION_TERM` (§15) | `('M' \| 'SCN') + direction.dirLetter + portion.letters + direction.termLetter`; `d = direction.key \| portion.key` | `MLCB` → 0x20\|3 = 0x23 = octal 43 = **`L`** → `D 00394 00306 L`, Exhibit IV. `MLC` → 0x30\|3 = 0x33 = octal 63 = `C` → `D0079600596C` (`software.md` §3). `MLCWS` → 0x00\|7 = `7` and `MRCWG` → 0x28\|7 = 0x2F = octal 57 = `Δ` — the two `D` instructions in the **shipped loader**, at 00318 and 00330. Four hits, zero misses. |
| `J` conditional branches — **every name in every row**, not twelve | `J_D_TABLE[].autocoder × .d`, over all rows including `available: false` ones (§2.5) | `B` → blank; `BAV` → `Z`; `BZ` → `V`; `BE` → `S`; `BH` → `U`; `BL` → `T`; `BU` → `/`; `BDV` → `W`; `BC9`/`BC91` → `9`; `BCV`/`BCV1` → `@`; `BPCB`/`BPCB1` → `R`; `BNQ`/`BNQ1` → `Q`. **And the rest of the table, which an earlier draft's "a complete per-d list" of twelve wrongly closed off:** the channel-2 twins `BC92` → `!`, `BCV2` → `⌑`, `BPCB2` → `L`, `BNQ2` → `*`; the overlap pair **`BOL1` → `1`, `BOL2` → `2`, which are in `OP_J.autocoder` and so must resolve or be excluded by name** (§7.4 direction 2); `BOQ`/`BOQ1` → `N`; `BB1` → `H`, `BB2` → `%`; `BSS A`-`BSS G` → `A`-`G`. All derive; the ones this configuration cannot execute are marked `unimplemented` for the listing (§2.5), and the `BSS x` family — the only names carrying an embedded blank, whose placement inside the 5-column operation field is unattested — is excluded by name in §7.4. |
| `R` / `X` status branches — **six** of eight | `RX_STATUS_BITS[].autocoder[0]/[1]` → `dAlone`; `BA1`/`BA2` → `RX_RELEASE_D_GLYPH` = `⧧` | `BEF1` → `8`, which is the hand deck's `R000668` at 00028. `BA1` → `⧧`, which is its `R00042⧧` at 00035. **`BNT1`'s d is the substitute blank `ƀ` (octal 20), not a space** — dmods.ts's own SUBSTITUTE-BLANK TRAP note. |
| `T` compare-branch and `G` Store Address Register | `T`: the suffix letters after `L` are the d bits, `L`=1 `E`=2 `H`=4 summed → `LL` 1, `LE` 2, `LLE` 3, `LH` 4, `LLH` 5, `LEH` 6 — all six of `opcodes.md` §2's `T` d-list agree. `G`: `SAR`/`SBR`/`SER`/`SFR` → d `A`/`B`/`E`/`F`, the second letter. | `T_MNEMONIC_SUFFIX_IS_THE_D_BITS`, §15 — `[likely]`, fallback is a 6-row hand table with identical values, so the fallback is free. |

### 7.4 What `mnemonics.ts` owns, and how the two stay honest

Phase-3 rows, each citing `opcodes.md` §2 and (for I/O) `io.md` §2:

- **`V`'s nine.** `V_D_TABLE.autocoder` prints the manual's space-separated form —
  `'BZN (I)(B) AB'` — with **four** rows sharing `BZN` (d `2 B K S`) and **four** sharing `BWZ`
  (d `3 C L T`). Ruling: the zone word is the **explicit third operand**, `BZN LOOP,SWITCH,AB`
  (`V_ZONE_WORD_IS_THE_THIRD_OPERAND`, §15). The two readings diverge on a real case and the ledger
  spells it out: `BZN a,b,B` is d = `K` under the zone-word reading and d = `B` under the raw-d one.
- **`BEX1` / `BEX2`.** In `OP_R`/`OP_X`'s lists and pinned by nothing: `RX_STATUS_BITS` has six rows
  and `dmods.ts` deliberately omits `BRC1`/`BRC2` for the same reason. Ruling: d = `9` = bits 8+1 =
  Condition OR Not Ready, which is what the shipped loader executes at 00292
  (`BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY`, §15).
- **The `L` / `M` I/O family, per mnemonic** — because "the family" is not one thing: `L` (0o43) is
  **load mode** and `M` (0o44) is **move mode**, and the demo depends on landing `RW1` on one and
  `W1` on the other. The rule under all of it: *the `W` that means "with word marks" selects `L`;
  its absence selects `M`* (`opcodes.md` §2 rows 206/207; `software.md` §10.6's `L %1x bbbbb R`
  row is "word separators are read into storage as word marks"). The `#` is a **channel digit** the
  mnemonic supplies and nothing more.

  | Mnemonic | Op | Why |
  |---|---|---|
  | `R#` | `M` | read, move mode — `OP_M.autocoder` |
  | `RW#` | `L` | read **w**ith word marks = load. Also in `OP_M` — the `AMBIGUOUS` ruling, §7.2 |
  | `P#` | `M` | punch, move mode |
  | `PW#` | `L` | punch **w**ith word marks. In `OP_L.autocoder`; the 1402 punch exists on this configuration, so it is IN, not out |
  | `W#` | `M` | write / print, move mode |
  | `WW#` | `L` | write **w**ith word marks |
  | `WM#` | `M` **as shipped** | The one that does not fit the rule: "write with word **m**arks" is a load-mode operation, yet `WM#` sits under `OP_M` in `table.ts` **and** in `opcodes.md` §2 row 207 — the same shape of probable transcription artifact as `RW#`. Nothing in scope uses it, so Phase 3 resolves it **exactly as shipped** and does not quietly re-home it: `WM_HASH_STAYS_AS_SHIPPED` (§15), escalated to the orchestrator as a probable `opcodes.md` §2 correction beside `RW#`, never a silent edit |
  | `RCP` / `WCP` | `M` | console printer, move mode |
  | `RCPW` / `WCPW` | `L` | console printer with word marks |
  | `RT RTB WT WTB RTW WTW` | — | tape. `OUT_OF_SCOPE`, no device |
  | `SD` | — | Seek Disk (`OP_M.autocoder`). `OUT_OF_SCOPE`, no disk — KISS peripherals, `DECISIONS.md` 2026-08-30 |

  `RW1 %10,LINE,$` assembles `L %10 00564 $`: the operand carries the x-control field, the B-address
  and the d (`IO_OPERAND_IS_XCONTROL_BADDR_D`, §15; the field itself is parsed by §5.2 step 3
  rule 1).
  Inherited from `loader.ts`'s Phase-2 comment rather than invented, and it is the **inspectable**
  form — the x-control field a person reads in the source is the one that lands in core. Note the
  spelling: `software.md` §10.6 prints the machine manual's `R1W` / `R2W`, while `table.ts` and the
  loader's own source use the `#`-suffix form that renders `RW1`. Same instruction, two spellings;
  the `#` form is ours because it is the one already in the repo, and the divergence rides on
  `IO_OPERAND_IS_XCONTROL_BADDR_D`.
- **Carriage `F` / `2`.** `CC1` / `CC2`, d from `CARRIAGE_D_TABLE`'s 30 rows, which carry no per-d
  Autocoder mnemonics — so `CC1 1` writes the d literally as its only operand
  (`CARRIAGE_MNEMONIC_TAKES_THE_D_AS_ITS_ONLY_OPERAND`, §15).
- **Select Stacker and Feed `K` / `4` — a different family, not the carriage one.** `OP_K` (0o42) is
  `SSF1` and opChar `4` (0o4) is `SSF2` (`table.ts`; `opcodes.md` §2, A22-0526-3 pp.62-63): *Select
  Stacker and Feed*, nothing to do with the carriage. Their d comes from the op's **own inline**
  `dModifiers` — `{ '0': 'pocket NR', '1': 'pocket 1', '2': 'pocket 8-2' }` — not from
  `CARRIAGE_D_TABLE`, and like the carriage ops they take the d as their only operand: `SSF1 1`.
  Same 2-character shape, different table, and both names are in `OPS[].autocoder`, so both must
  resolve or §7.4's direction-2 test fails on them. `STACKER_MNEMONIC_TAKES_THE_POCKET_AS_ITS_ONLY_OPERAND`
  (§15).
- **`Y` Priority's fourteen.** They derive with no new data, from `OPS[0o30].forms[0].dModifiers`
  (`Y_DMODS` in `table.ts`, reachable through the form even though the const itself is
  module-private): each value reads `'BUPR1 — channel 1 I-O unit priority request'`, so the mnemonic
  is the token before the em dash and the key is its d — `BUPR1` → `U`, `BXPA` → `X`, and eleven
  more. That is thirteen of the fourteen names in `OP_Y.autocoder`; the fourteenth, **`BQPR2`**, is
  deliberately absent from `Y_DMODS` because its d is unknown (`Y_BQPR2_D_UNVERIFIED = null`,
  exported from `table.ts` and commented there). `BQPR2` goes on `OUT_OF_SCOPE` citing that exported
  constant — the one name whose exclusion the core table itself justifies.
- Everything else (`A S C ? ! , ⌑ / @ % Z E . N W B` …) is one mnemonic, no baked d, shape from
  `lengths` and `addressDouble`.
- Rows for features this machine cannot execute (`Y` `U` `2` `4` `P` `Q`) **resolve normally** and are
  marked `unimplemented` for the listing only. §2.5.

**The Autocoder-vs-machine collision** is stated at the head of the file with its citation
(`opcodes.md` §1.6): Autocoder `M` = Multiply but machine `M` = move-mode I/O; Autocoder `D` = Divide
but machine `D` = Move. Resolution keys on the *mnemonic*, so it cannot bite the resolver — only a
reader.

**`test/asm-mnemonics.test.ts`, tier 0, five assertions:**

1. Every `MnemonicRow.opChar` resolves through `opByChar()`, and its `d` is a key of that op's
   `dModifiers` (or the op takes none).
2. **Containment, direction 1:** every mnemonic the resolver knows appears in some `OPS[].autocoder`
   **or in a per-op d-table** (`J_D_TABLE`, `RX_STATUS_BITS`, `V_D_TABLE`), with the two generative
   `D` rows expanded through `MOVE_PORTION` × `MOVE_DIRECTION` first. The two sources hold **different
   name sets** and each direction says which one it reads — that is the flaw an earlier draft had, and
   it is why direction 2 is split in two below.
3. **Containment, direction 2a — over `OPS[].autocoder`,** which holds **108 unique names** in **33
   rows that carry names** (109 entries, `RW#` the one duplicate; 35 `OPS` rows in all — `=` and `$`
   carry an empty array and so contribute no name, §2.5). Counted off `table.ts`, not remembered.
   **The two generative `D` entries are expanded through `MOVE_PORTION` × `MOVE_DIRECTION` first, as
   in direction 1** — `M{L,R}{N,Z,C,W,NW,ZW,CW}{S,A,B,␣,R,G,M}` and `SCN{L,R}{…}` are patterns, not
   names, and 2a would otherwise fail on two of its 108 by testing strings no resolver can be asked
   for. After that expansion, every name either resolves, or is on the `AMBIGUOUS` list (`RW#`, §7.2),
   or is on a named `OUT_OF_SCOPE` list with a reason. The list, in full, so the test is writable
   before wave 1 rather than discovered in it: the **tape** families
   `BSP SKP RWD RWU WTM RT RTB WT WTB RTW WTW` (no device), **`SD`** (no disk), the **MICR**
   families `ECR1 DCR1 SS1 ECR2 DCR2 SS2` (no 1412/1419), and **`BQPR2`** (`Y_BQPR2_D_UNVERIFIED`,
   above). Everything else resolves, including the **thirteen resolvable `Y` names** — `OP_Y.autocoder`
   holds fourteen and `BQPR2` is the one excluded on the line above — plus `BOL1`/`BOL2`, `PW#`,
   `SSF1`, `SSF2`, `CC2` and the whole `X` channel-2 status family.
4. **Containment, direction 2b — over the per-op d-tables.** `J_D_TABLE[].autocoder`,
   `RX_STATUS_BITS[].autocoder` and `V_D_TABLE[].autocoder` carry names that appear in **no**
   `OPS[].autocoder` at all: `BC91 BC92 BCV1 BCV2 BPCB1 BPCB2 BNQ1 BNQ2 BOQ BOQ1 BB1 BB2` and
   `BSS A`-`BSS G`. Every one either resolves through §7.3's J derivation or is on `OUT_OF_SCOPE`
   with a reason — `BSS A`-`BSS G` (1401-compatibility sense switches, and the only names with an
   embedded blank, whose placement in the 5-column operation field is unattested), `BB1`/`BB2`
   (column binary), `BOQ`/`BOQ1` (1414 model 4/5 outquiry). An earlier draft aimed exactly this
   exclusion list at `OPS[].autocoder`, where **none of those three names appears** — the test would
   have passed while checking nothing.

   A future research correction that adds a mnemonic to either source fails these tests until
   Phase 3 catches up.
5. **The research column directly.** The test reads `docs/research/opcodes.md` §2's Autocoder column
   and asserts every non-pattern, non-ellipsis token resolves or is listed. That column is
   **unguarded today** — `isa-table-vs-research.test.ts` says so in its own header — so this is a
   strictly new guarantee Phase 3 adds without touching a single existing file. Chained transitively,
   `opcodes.md` §2 → `table.ts` → `mnemonics.ts` then has a machine at every arrow.

---

## 8. Emission and condensed-card packing

### 8.1 Address encoding — Phase 3 owns the encoder, verified by round trip

The 5-digit address is BCD digits with the index tag as zone bits over the **tens and hundreds**
positions: **A-over-tens = 1, B-over-tens = 2, A-over-hundreds = 4, B-over-hundreds = 8**
— `docs/research/architecture.md`'s index-tag table and its weights line, `[verified — A22-0526-3
p.14 Fig. 10]`, which is also what `src/core/address.ts`'s module-private `TAG_A_TENS` …
`TAG_B_HUND` and `docs/plans/architecture.md` §4.2's `decodeAddress` sketch encode. **Do not cite the
plan's §5 step 2 for this**: that sentence reads "indexing writes zone bits over the tens position",
which describes `software.md` §2's printed examples — tags 1 and 2, where only a tens zone is
present (index 2 → B-bit, so tens digit 4 prints `M`; index 1 → A-bit, so tens digit 8 prints `Y`) —
and not the full 15-register scheme, which is the machine's.

**`src/core/address.ts` exports `addressDigit`, `decodeAddress`, `resolveIndex` and `checkAddress` —
and no encoder.** `TAG_A_TENS` / `TAG_B_TENS` / `TAG_A_HUND` / `TAG_B_HUND` are module-private consts.
So `encodeAddress(value, tag)` is **Phase-3-owned**, and the way it is kept from being a second
transcription of the weights is that it is verified **only** by round-tripping through the shipped
`decodeAddress` — every tag 0-15 across a boundary-plus-sample sweep of values — plus the two tagged
addresses already sitting in the shipped loader:

- `00A?0` = 00100 tag 15 (hundreds `1` + BA = 4+8, tens `0` + BA = 1+2) — `loader.ts` @00318;
- `00?!0` = 00000 tag 14 (hundreds `0` + BA, tens `0` + B) — `loader.ts` @00330.

If the weights ever move, one test fails, not two tables.

### 8.2 What each statement emits

| Statement | Emits | Word mark |
|---|---|---|
| imperative | op char + the fields the form takes | on the op character |
| DCW | the constant's cells | high-order |
| DC | the constant's cells | none (and load mode clears marks over the extent) |
| DS | **nothing** | none — and the area is not cleared |
| DA | one marked blank per defined field high-order, and nothing else | per sub-entry |
| EQU | nothing | — |
| pooled literal | a processor-generated DCW at the pool origin | high-order |

`DA` emission is `DA_EMITS_ONLY_ITS_MARKED_POSITIONS` (§15): the condensed format **cannot set a word
mark without storing a character** — a separator marks the *next* stored character — so DA emits one
marked blank per defined field and clears nothing else. That is as close to C28-0309-1's silence and
DS's "not cleared" as the format permits; the OS behaviour (clear the whole area to blanks first,
C28-0326-2 p.25) is one switch away.

### 8.3 Card packing — a 60-**column** budget, not a 60-character one

`encodeObjectRecord` enforces the budget and **throws**; the packer must never hand it a record it will
reject. The three costs, from `software.md` §8.1's verbatim NOTE and the shipped encoder's own payload
loop:

- an ordinary cell → **1 column**;
- a **word-marked** cell → **2 columns** (a 0-5-8 word separator, then the character);
- a cell that **is** a word separator → **2 columns** (the doubled pair), it may **not** be marked
  (`ObjectDeckError`), and it counts **1** toward the count field (`WS_PAIR_COUNTS_AS_ONE`).

`PAYLOAD_FIELD_COLUMNS` = 60 is the binding bound; `payload.length` is the count in columns 11-12,
whose two digits are a second, never-binding one. **A fully marked payload holds thirty characters,
not sixty** — this is where a naive packer is wrong, and `test/asm-pack.test.ts` drives an all-marked
payload through it.

```
pack(items, reserved):          # `reserved` = the DS / DA extents; see the GM-WM tail rule below
  for each (addr, cell) in ADDRESS order:
     if no open record            -> open at addr
     else if addr != prevAddr + 1 -> close, open at addr    # a DS gap, an ORG jump, a pool origin
     else if columns + cost > 60  -> close, open at addr    # the budget
     append cell; columns += cost; prevAddr = addr
  close; sequence '001'.. per record (RESEQ resets to 001); ident from JOB/RESEQ
  return { records, cardOf: Map<seqno, cardNumber> }
```

**A record breaks in exactly three ways**: a non-contiguous address, the 60-column budget, or the end
of emission. Nothing else. A separator and its character are pushed in the same step, so the packer can
never leave a separator in column 72 with its character in 73 —
`TRAILING_SEPARATOR_IS_A_DECK_ERROR` is avoided **by construction**, not by check.

**A constant longer than one card's payload splits across cards.** `open-questions.md`'s software row
(line 109) records the question and proposes the *opposite* fallback — "cap constants at one card's
payload and emit an assembler diagnostic if exceeded". We take splitting behind
`CONSTANT_MAY_SPAN_CONDENSED_CARDS` (§15), because the closed loop **proves** the split byte for byte
through the real loader, and the capped version would refuse a legal program.

**The GM-WM tail — the hazard the packer is the only place to catch.** The shipped loader's
`D 00100 00?!0 Δ` at 00330 terminates on the A-field group-mark-with-word-mark and, per
`opcodes.md` §3.1 (quoted in `loader.ts`'s own NOTE), **moves the terminating position too** — so
**every loaded record leaves a GM-WM at `loadAddress + count`**. In an ascending contiguous deck each
is overwritten by the next and the last one marks the end of the program, which is where a 1410 program
wants one. Two ways that goes wrong, and **the packer is the only place that can see either**:

- an `ORG` sends the last record backwards, so the final GM-WM lands *inside* the program and
  clobbers one character;
- the tail lands inside **reserved-but-unemitted** storage — a DS or DA extent. No record covers it,
  so a rule that only asks "does an earlier record cover this address?" fires **nothing**, and this
  is the demo's own case: the tail is at 00564, the first position of `LINE`. The program is correct
  only because a person wrote `$` on the read (§10 trap 3). That is the general hazard, not the
  exception.

So the rule is §11.1's own computation, run in one loop: the **surviving** marks are those at
`record[i].loadAddress + record[i].payload.length` for every record no later record covers, and
`pack.ts` warns when a surviving mark falls inside **another record's extent** *or* **any DS / DA
extent** — which means `pack()` is
handed the reserved-area list beside the items, one extra argument for the one thing it cannot
otherwise know. The warning names the case: *"the last record's GM-WM lands at 00564, inside LINE — a
read with d = `R` will transfer nothing; use `$`"*. A warning, not a flag (§6.3).
`test/asm-pack.test.ts` asserts **both** cases, not just the backwards-ORG one. The closed loop
catches the first as a one-byte diff anyway; nothing but this catches the second.

`END` yields `ObjectDeck.entry`; `loaderDeck()` turns it into the execute card. Phase 3 builds no
loader and no bootstrap.

---

## 9. Listing generation and the 1403 rendering

`listing.ts` builds `ListingLine[]`: a heading per page from JOB (re-emitted at each page break and at
EJECT); one line per source statement in source order; one line per pooled literal at the flush point
with a blank OPCOD and the literal's text in OPERAND (Exhibit IV rows 59-62 print exactly that shape);
one line per DA sub-entry with a blank OPCOD (rows 65-66); the symbol table if PST; and a trailer
carrying the flagged count and up to twenty flagged SEQNOs — the trailer's shape is
`LISTING_TRAILER_FOLLOWS_THE_OS_FORM` (§15, `[unverified]`, C28-0326-2 p.57; fallback: drop the
trailer), and this sentence is its point of use.

`listing1403.ts` is a **formatter over `ListingLine[]`, not a second code path** (`architecture.md` §2
B3, taken literally). It formats each line into 132 positions, returns `PrintLine[]` — the same
`{ page, line, text }` type the paper is made of, in `src/core/types.ts` — and hands that to the
**already-tested** `renderGreenBar` from `src/core/devices/printer1403.ts`. That buys page breaks,
trailing-blank trimming, form feeds and a header line from the same function that renders the demo
page, and leaves exactly one page renderer in the repo.

**The listing must apply the chain itself.** `renderGreenBar` prints the chain name in its header and
otherwise renders `PrintLine.text` verbatim — `chainGlyph` is applied in the *device* write path
(`printer1403.ts` line 508), which the listing does not go through. So `listing1403.ts` maps every
character `bcdOfGlyph → chainGlyph(bcd, chain)` before building the `PrintLine`, default chain `'A'`
(`PRINT_CHAIN_A_IS_DEFAULT`). The visible consequence is period-real and worth showing a period reader: on the
commercial A arrangement the 12-zone code prints `&`, so `MLC A+3,B` — stored as `A&3` per §5.1 —
comes out `MLC A&3,B`; the view carries an A/H toggle, mirroring `printerView`'s plain-white toggle,
and on H it reads `+`. Neither 48-character chain can print the group mark, `Δ`, `√`, `⧻`, `⌒` (the
word separator) or `[ < ] ; \ : >` — those print blank (`charset.md` §5, `[verified]` A22-0526-3 p.6
footnotes). **`ƀ` is not among them**: the substitute blank prints the **record-mark slug `‡`** on
both chains, and `!` prints `-` on both. That matters here rather than being trivia, because
`BNT1`'s d **is** `ƀ` (`dmods.ts`'s SUBSTITUTE-BLANK TRAP), so the INSTRUCTION column of a `BNT1`
line prints `‡` and not a blank — and a listing that blanked it would look right and be wrong. A real
limitation the period listing had too, stated rather than hidden behind a substitution.

Column stops, within the 132 print positions of a 1403 Model 2, in one exported array in one place:

```
SEQNO 1-5 · PGLIN 7-11 · LABEL 13-22 · OPCOD 24-28 · OPERAND 30-81 ·
CT 84-86 · ADDRS 88-92 · INSTRUCTION 95-112 · CARD 115-117 · FLAG 120
```

OPERAND is 52 wide because card columns 21-72 are; INSTRUCTION is 18 because `D 00394 00306 L` is 15.
Everything fits inside 132. `console-and-physical.md` §12 publishes the OS listing's column *set*, not
its metrics, so the stops are ours: `LISTING_COLUMN_STOPS`, `[unverified]`, §15 — and only our own
constructed golden depends on them, regenerable in one command. `LISTING_LINES_PER_PAGE = 55` on the
66-line `DEFAULT_CARRIAGE_TAPE` is the OS `/LIN/` default (`console-and-physical.md` §12,
`PHASE-2-NOTES` §1), `[likely]`, §15.

---

## 10. The demo program

`demos/hello-dad.asm`. **Extension chosen deliberately:** `.cards` means "punched card images with
`{punch-list}` escapes for the eight unkeyable glyphs" and is what `parseDeck` reads; an Autocoder
source deck needs no escapes, and a different extension keeps `parseDeck` and `parseSourceDeck` from
ever being handed each other's files.

The file is **column-exact**: page 1-2, line 3-5, label 6-15, operation 16-20, operand 21-72,
ident 76-80. "Column-exact" is a claim about a file this phase owns, so it is **checked, not
asserted**: `test/asm-demo-source.test.ts` (wave 6) reads
`demos/hello-dad.asm` and asserts that no line exceeds 80 columns, that the JOB card is exactly 80
with columns 76-80 equal to `HDAD1`, and that `assemble(...).ident === 'HDAD1'`. That check exists
because the JOB card in an earlier draft of this plan was **79** characters, which put `HDAD1` in
75-79 and would have punched `DAD1` into columns 76-80 of every condensed card — a wrong artifact
that both `JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80` (§15) and storyboard step 6 rest on, and that
nothing else in the plan would have caught. The same file carries the data-card drift assertion at
the end of this section.

```
....+....1....+....2....+....3....+....4....+....5....+....6....+....7....+....8
01010AUTOCODER RUN
01020          JOB  HELLO DAD - REENTRY TABLE                              HDAD1
01030          CTL   1
01040*  THIS MACHINE HAS 10K, ONE CHANNEL, A 1402 AND A 1403.
01050*  THE ASSEMBLER THAT BUILT THIS DECK DID NOT RUN ON IT.
01060          LOAD
01070          ORG  00500
01080LOOP      RW1  %10,LINE,$
01090          BEF1 EOJ
01100          BA1  *+1
01110          W1   %20,LINE,W
01120          BA1  *+1
01130          B    LOOP
01140EOJ       CC1  1
01150          BA1  *+1
01160          H
01170ID        DCW  @HELLO1@
01180 LINE     DS   80
01190          END  LOOP
```

**The first line in that block is the column ruler, not a source card.** `demos/hello-dad.asm` holds
the **nineteen** lines beginning `01010` … `01190` and nothing else; the `....+....1…` line is here so
a reader can count columns, and a worker who copies the fence verbatim must drop it or the file has a
bogus card 1 and twenty cards. (The ruler is drawn again above the source textarea in the view,
§1 step 2 — there it is UI, here it is a note.)

Card 1's label field holds `AUTOCODER` in 6-14 with 15 blank, so `RUN` starts in column 16. Card 3's
operand column 21 is blank and column 22 holds the core-size code `1` = 10K, read by absolute position.
Card 18's label begins in **column 7**.

**The assembled ladder**, every address checkable against `OPS`' lengths:

| ADDRS | Occupies | Statement | Assembled |
|---|---|---|---|
| 00500 | 00500-00509 | `LOOP RW1 %10,LINE,$` | `L %10 00564 $` (10) |
| 00510 | 00510-00516 | `BEF1 EOJ` | `R 00548 8` (7) |
| 00517 | 00517-00523 | `BA1 *+1` | `R 00524 ⧧` (7) |
| 00524 | 00524-00533 | `W1 %20,LINE,W` | `M %20 00564 W` (10) |
| 00534 | 00534-00540 | `BA1 *+1` | `R 00541 ⧧` (7) |
| 00541 | 00541-00547 | `B LOOP` | `J 00500 ␣` (7) |
| 00548 | 00548-00549 | `EOJ CC1 1` | `F 1` (2) |
| 00550 | 00550-00556 | `BA1 *+1` | `R 00557 ⧧` (7) |
| 00557 | 00557 | `H` | `.` (1) |
| **00563** | 00558-00563 | `ID DCW @HELLO1@` | 6 characters, **word mark at 00558**, label **low-order** |
| **00564** | 00564-00643 | ` LINE DS 80` | **nothing emitted**, label **high-order** (col-7 indent) |

Sixty-four emitted cells, ten word-marked fields. Packing (§8.3): the running column count reaches
exactly **60** at 00551, so record 1 is **00500-00551, 52 cells / 60 columns**, and record 2 is
**00552-00563, 12 cells / 14 columns** (marks at 00557 and 00558). `END LOOP` gives `entry: 500`, and
`loaderDeck()` prepends the bootstrap and loader-body cards and appends the execute card: **5 cards**,
plus the 5 data cards = **10 in the hopper.** If the packer's arithmetic ever disagrees with those
numbers, the packer is the spec and `BUILD-LOG-3.md` records the correction.

**Four details on that page are traps, not decoration, and each is a named test:**

1. **`ID DCW @HELLO1@` is load-bearing.** A one-character halt's read-out is a scan to the next word
   mark, so `opcodes.md` §2's `.` row requires a word mark in the position immediately to its right.
   DCW puts one on the high-order position at 00558, while its *label* resolves low-order to 00563.
   The hand-punched deck does the same thing with `{0-5-8}HELLO1` at 00076.
2. **` LINE` is indented to column 7 on purpose.** A DS label resolves **low-order** by default
   (`software.md` §5). Un-indented, `LINE` would be 00643 and every read would land past the end of
   its own buffer. Indented, it is 00564. Both values are asserted.
3. **The read must carry `$`.** The condensed loader plants a GM-WM at `loadAddress + count` after each
   record; the last one lands at **00564** — the first position of LINE. A `d = R` read stops at the
   first GM-WM in core and would transfer nothing; `$` suppresses that test
   (`CARD_DOLLAR_SUPPRESSES_GM_WM_TEST`, `software.md` §10.4). The first read then overwrites it. This
   is *derived*, not copied: it falls out of §8.3's tail rule landing exactly on 00564.
4. **`BA1 *+1`, not `*+7`.** The asterisk is the **last character of its own instruction**, so a
   7-character `R` at 00517 ends at 00523 and its fall-through is `*+1` = 00524. The hand deck's
   `R00042⧧` at 00035, `R00059⧧` at 00052 and `R00075⧧` at 00068 are the published check.

**The nineteen cards walked through §5.2 step 3, because §13's criteria 2, 3 and 5 all rest on the
answer.** Cards 4 and 5 are comments (`*` in column 6) and never reach step 3. Cards 1, 2 and 3 —
`RUN`, `JOB`, `CTL` — are **rule 0**: RUN's mode word is in the label field with a blank operand,
JOB's operand is free text taken verbatim from columns 21-72 (25 characters with blanks and a hyphen —
the case that flags `F` under any list without rule 0), CTL is read at columns 22-23 with column 21
blank. Card 6 (`LOAD`) has an empty operand → rule 2. Cards 7 (`ORG 00500`) and 18 (`DS 80`) are rule
8, actual. Cards 8 and 11 open with `%10` / `%20` on a `lengths: [10]` form → rule 1, x-control, and
their second operand `LINE` is rule 9; their third is the explicit d and is not classified. Cards 9,
13 and 19 (`BEF1 EOJ`, `B LOOP`, `END LOOP`) are rule 9. Cards 10, 12 and 15 (`BA1 *+1`) are rule 7
plus step 4's `+1` adjustment. Card 14 (`CC1 1`) writes the carriage d as its only operand — a d, not
an address, so step 3 has nothing to say. Card 16 (`H`) has no operand. Card 17 (`ID DCW @HELLO1@`) is
rule 3 as a **declarative's constant**, not a pooled literal. **Zero flags on all nineteen; `ok: true`;
no literal pool, so the emission is the sixty-four cells above and the deck is exactly two records
(52 / 12); and exactly one warning** — §8.3's GM-WM tail at `00552 + 12 = 00564`, inside `LINE`'s DS
extent, which is trap 3 below and is the designed outcome, not a defect.

**`demos/hello-dad.data.cards`** holds the five report cards. They are a copy of lines 2-6 of
`demos/hello-dad.cards`, a Phase-2 artifact Phase 3 may not modify. The duplication is **guarded, not
commented**: `test/asm-demo-source.test.ts` — the same wave-6 file — reads both and
asserts the five lines are identical, so the copy cannot drift.

---

## 11. Waves, each closed by its oracle

Build order is deliberately **backwards from the consumer**: waves 1 and 2 land mnemonic resolution,
emission, packing and the closed loop — against the real 1402 and the real loader — before a single
source card is parsed. That proves the hardest thing earliest and stops the assembler from quietly
emitting whatever its own front end happens to produce.

| Wave | Files owned this wave | The oracle that closes it |
|---|---|---|
| **1 — resolve** | `types.ts`, `mnemonics.ts`; `test/asm-mnemonics.test.ts`, `test/asm-pseudo-ops.test.ts`, `test/asm-is-dom-free.test.ts` | §7.4's five assertions, including the direct read of `opcodes.md` §2's Autocoder column. Plus the four independent `d` derivations already in the repo: `MLCB` → `L` (Exhibit IV), `MLC` → `C` (`software.md` §3), `MLCWS` → `7` and `MRCWG` → `Δ` (the shipped loader). **And §2.2's partition, asserted by `asm-pseudo-ops.test.ts`:** `software.md` §6's Op cells split on `/` give **31 distinct names**; **15 match an in row, 16 match an out row**, each exactly once, plus the two named allowances `EXTRA_ROWS` and `SUFFIX_RULINGS` and nothing else. It lands in wave 1 because it needs only `software.md` §6 and the §2.2 table — no `src/asm` module at all — so R3's scope gate is live from the first commit. |
| **2 — emit, pack, and the closed loop opens** | `emit.ts`, `pack.ts`; `test/asm-emit`, `asm-pack`, `tier3-asm-load-equals-memory` (**owned here, the three source-free programs only; waves 4 and 6 APPEND cases to it and never rewrite these**) | Driven from **hand-built `EmittedItem[]` fixtures** — including the **`reserved` list**, hand-built beside them, since `pack(items, reserved)` takes two arguments (§6, §8.3) and wave 2 has no `symbols.ts` to compute DS / DA extents. No parser yet — and `tools/asm.ts` is **not** here, it is wave 5 (§3.3). (a) `encodeAddress` ↔ the shipped `decodeAddress` for all 16 tags, plus `00A?0` = 00100 tag 15 and `00?!0` = 00000 tag 14 from `loader.ts`. (b) The packer property test: random emission runs re-decoded through the **shipped** `decodeObjectRecord` and concatenated back to the input cells; plus the all-marked payload packing at 30 characters; plus **both** GM-WM-tail warnings (§8.3). (c) **The closed loop over the three programs that need no front end** — §11.1. |
| **3 — read** | `source.ts`, `operand.ts`; `test/asm-source`, `asm-operand` | `software.md` §1's column table asserted field by field on hand-built 80-character cards; the col-6 `*` rule; the col-7 indent flag; `+` → `&` normalisation; §2's published worked example `A TOTAL+3+X1-12+X2,ACCUM-5+X2+35` ≡ `A TOTAL-9+X2,ACCUM+30+X2` asserted structurally; the right-to-left `@` scan on `MLC @AB  CD@,FIELD`; the four literal kinds; the explicit d; indexing rejected on DS/ORG/LTORG/control/x-control/`G`. |
| **4 — pass 1, and the loop closes from source** | `symbols.ts`, `literals.ts`, **`demos/hello-dad.asm`, `demos/hello-dad.data.cards`**; `test/asm-symbols`, `asm-literals`, `tier1-exhibit-iv` (+ the remaining three programs **appended** to wave 2's `tier3-asm-load-equals-memory`) | **Exhibit IV's address ladder**, the assembler-independent part (§11.2): SEQNO 37-40 at 00192 / 00203 / 00208 / 00209 with CT 7 / 5 / 5 / 7; **`EOF EQU *` = 00216 = 00209 + 7**; the DA header at 00315 with sub-entries at 00318 and 00394; the col-7 DCs at 00396 / 00402 (as OS corroboration, §11.2); the literal pool 00302-00314 in encounter order. Then **the closed loop's other three programs, driven from source** — wave 4 composes `parse → pass1 → pass2 → pack` directly in the test, because `assemble()` is wave 6. Plus a deck carrying all four defects that returns F/U/M/O and never throws. |
| **5 — listing and the CLI** | `listing.ts`, `listing1403.ts`, `tools/asm.ts`, `tsconfig.tools.json`, `package.json`; `test/asm-listing`, `test/golden/hello-dad.lst` | The **constructed** listing golden, labelled in its own header, generated by `npm run asm -- demos/hello-dad.asm --listing --golden … --update` — which works in wave 5 because the demo source is **wave 4's** and `tools/asm.ts` composes `parse → pass1 → pass2 → pack → listing → listing1403` itself, exactly as the wave-4 tests do, `assemble()` being wave 6 (§3.3). Plus properties: every rendered line ≤132 positions; every rendered character present in `bcd.ts`'s 64 and printable on the selected chain; page breaks on the 66-line form; the FLAG column populated for a deliberately broken source; a column-position test asserting each field's start column against the B3 column set. |
| **6 — the view and the demo** | `src/asm/assemble.ts`, `src/ui/autocoder/**`, §3.2's three wiring edits, **the `tools/asm.ts` re-edit** (its main-function body rewritten onto `assemble()`, ~15 lines, §3.3); `test/tier4-autocoder-demo.test.ts`, `test/asm-demo-source.test.ts` (+ the six programs re-run through `assemble()`, **appended** to `tier3-asm-load-equals-memory`). **`demos/*` are wave 4's** — read here, not owned. | §1's storyboard, headless, with all six closed-loop programs re-run through `assemble()`, ending on `renderGreenBar(paper) === test/golden/hello-dad.page.txt`, byte for byte. `test/golden/hello-dad.lst` must come out **byte-identical across the CLI re-edit** — the check that the rewrite changed only the composition. **Non-gating stretch**: §11.3. |

Commit per wave; Opus adversarial review per wave; then the whole-branch review before merge.
**Gates at every commit**, every time (§12.2): four lines through wave 4, and **five from wave 5 on**,
once `npm run asm … --golden` exists to check the listing golden.

**Two ownership notes, because per-wave file ownership is the discipline this table exists to
enforce.** (1) The six rows enumerate all **fourteen** test files of §12.1 — an earlier draft's rows
named thirteen and left `asm-pseudo-ops` owned by no wave at all, which is why it is written into
wave 1 above. (2) **`test/tier3-asm-load-equals-memory.test.ts`
is the one file that spans waves**, and it is marked here rather than left to be discovered: **wave 2
owns it**, waves 4 and 6 **append** cases (three source-driven programs in wave 4, the six re-run
through `assemble()` in wave 6) and **never rewrite an earlier wave's case**. Every other file has
exactly one owning wave, and no wave's oracle reads a file a later wave writes.

### 11.1 The closed loop — designed so it cannot be a tautology

```
assemble(source) -> AssemblyResult
   ├─ direct:   applyToStorage(result.items) into a fresh Storage           (the INTENT)
   └─ machine:  loaderDeck(result.deck) -> 1402 hopper -> keyed bootstrap
                -> COMPUTER RESET -> RUN, on the real Machine                (the RESULT)

compare over the union of emitted addresses           -> must be IDENTICAL, word marks included
assert the RESULT's EXTRA bytes are EXACTLY the SURVIVING GM-WMs, computed from the record
  list: the mark at record[i].loadAddress + count for every i NO LATER RECORD COVERS
```

**"One per record" would fail on the demo.** §8.3 already says each planted GM-WM is overwritten by
the next record's payload in an ascending contiguous deck — and that is exactly the demo: record 1's
mark at 00552 is inside record 2's extent and is gone. So the assertion is computed from the record
list rather than stated as a blanket rule, which also makes the backwards-ORG program in the list
below assert **the clobber** (a surviving mark landing inside an earlier record's extent) instead of
tripping over a rule that does not describe it.

The two sides are deliberately **not** the same model. The direct path writes payload cells and
nothing else, so the loader's terminating GM-WM shows up as a **named, asserted difference** instead of
being mirrored on both sides. That is what makes it an oracle rather than a restatement, and it is why
a plan that says only "core dump equals the assembler's image" would fail on the first run.

It runs over **six programs, and they do not all arrive in the same wave.** The wave-2 row owns the
loop but wave 2 has no front end, so only the three programs expressible as hand-built
`EmittedItem[]` run there; the three that are described as *source* need `operand.ts` (wave 3) and
`symbols.ts` / `literals.ts` (wave 4) and run in wave 4, composed module by module; all six re-run
through `assemble()` in wave 6.

| Program | Wave | Driven from |
|---|---|---|
| a DS gap (two runs with a hole between them) | 2 | hand-built `EmittedItem[]` |
| a **backwards ORG** whose surviving GM-WM lands inside an earlier record (asserting the §8.3 warning *and* the one-byte clobber) | 2 | hand-built `EmittedItem[]` |
| an all-marked run that forces a 30-character card | 2 | hand-built `EmittedItem[]` |
| a 200-character DCW that splits across four cards | 4 | source |
| a literal pool | 4 | source |
| the demo | 4 (source), 6 (through `assemble()`) | `demos/hello-dad.asm` — **wave 4's file** (§11 wave-4 row), so the loop does not reach forward |

**How a hand-built fixture avoids being a transcription of `pack.ts`'s own output** — the tautology
this whole section is engineered against. A wave-2 fixture is written as `{ at, cells }` literals
chosen for the property under test (a gap at a stated address, a marked cell at every position, a
record that starts below one already emitted), and its **expected core image is written
independently**, as an `address → (character, word mark)` table computed by hand from the addresses in
the fixture. Neither side is captured from a run. If a fixture is ever produced by printing what
`pack()` returned, the test has stopped being an oracle, and `BUILD-LOG-3.md` records it as a
deviation rather than letting it pass as a green wave.

### 11.2 Exhibit IV — assembly-only, assembler-independent facts only

C28-0326-2 Appendix C Exhibit IV is the one 1410 Autocoder listing with **published assembled output**,
and it is an **OS** listing while we build the standalone assembler. Assert only what does not depend
on which assembler produced it (`architecture.md` §8, `software.md` §5):

- `MLCB AR80,IDENT#5` → `D 00394 00306 L` — and note the `L` falls out of the **derived** Move table,
  so this row tests the derivation, not a transcription;
- `EOF EQU *` = **00216** = 00209 + 7;
- ADDRS low-order for constants / high-order for instructions, **proven from the punched deck by the
  one card that owes nothing to the col-7 rule**: cols 2-6 = `00204`, count `00036`, loading
  00204-00239, whose last constant (`DCW EOJ`, CT 5) is listed at ADDRS **00239** — the card's final
  byte, so ADDRS is the constant's low-order position. Nothing about that depends on which assembler
  punched the card;
- `DA 1X80,G` at 00315 with sub-entries at 00318 (= 00315+4−1) and 00394 (= 00315+80−1). **Assert the
  three addresses and nothing about emission.** An earlier draft asserted here as an Exhibit-IV
  *fact* that "the header's `,G` is not assembled", which reverses `open-questions.md`'s own software
  row for this exact line: *"Appendix C's DA line (CT 81, ADDRS 00315) shows a blank CARD column
  despite requesting a group-mark-word-mark. Fallback: **Do not conclude DA emits nothing**; assume
  the GMWM card is punched elsewhere in the deck."* The correct statement is about **us**, not about
  IBM: **we do not emit it** (§2.2's `,G` row flags `F`, §8.2's `DA_EMITS_ONLY_ITS_MARKED_POSITIONS`),
  the historical question stays open on that row, and the row is repeated in the dated Phase 3 section
  of `open-questions.md`. The tier-1 test asserts the addresses **on a line that carries an `F`** and
  says so in its own name (`FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS`, §15).

**Separately, and labelled as what it is — corroboration of an OS rule, not an assembler-independent
fact.** Exhibit IV's card with cols 2-6 = `00396`, count `00012`, loading 00396-00407 against the two
DCs listed at 00396 and 00402 is evidence for **`COL7_INDENT_IS_STANDALONE_TOO`** (§5.1, §15), and for
nothing else. Those two rows are high-order *because they are indented to column 7*, and the col-7
rule is documented in **C28-0326-2 p.28 — the OS manual** — and is `[likely]`, not `[verified]`, for
the standalone. Using them to prove the low-order/high-order rule would be circular, and it is exactly
the OS/standalone conflation `architecture.md` §8 and R8 exist to prevent. So the test carries them in
a separately named block, `COL7_CORROBORATION_IS_OS_EVIDENCE`, whose comment says: OS evidence for a
`[likely]` standalone rule.

**There is no execute-the-deck test.** SEQNO 37 assembles `BXPA /PCH/` → `Y /PCH/`, and `Y` is the
Priority feature (`opcodes.md` §9.1), which this machine rejects with `UnimplementedOp`.

### 11.3 The loader's own source — stretch, non-gating

`src/formats/loader.ts` carries the condensed loader's Autocoder source in a comment "so Phase 3 can
regenerate this deck instead of transcribing it". Assembling it and diffing against
`CONDENSED_LOADER_PROGRAM` would be a superb oracle. It **does not gate**, for two reasons stated in
advance rather than found mid-wave:

- The comment says the `R` mnemonic spellings are labels, not pinned rows — hence
  `BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY` (§15). Assert **addresses and d-characters**, never
  spellings.
- **The comment's `BA1 *+7` is wrong.** The instruction at 00299 is `R00306⧧`, and 00306 = 00299 + 7 =
  its own fall-through — which under `software.md` §2's `[verified]` asterisk rule (last character of
  the instruction, 00305) is `*+1`. A mismatch here is a row in `open-questions.md` and an escalation,
  never a build failure.

---

## 12. Test tiers and gates

### 12.1 Tiers

**Fourteen files, named to the repo's own convention rather than to this plan's labels.** `test/`
already spells manual-worked-example tests `tier1-*` (`tier1-mce`, `tier1-mcs`, `tier1-muldiv`,
`tier1-index-example`, `tier1-tablelookup`) and its oracle tiers `tier2-` / `tier3-`, so the Exhibit
IV file and the closed loop take those prefixes. Everything else keeps the `asm-` module prefix, the
way `address.test.ts` and `move.test.ts` do: T0 and T2 are module tests, not oracles.

| Tier | Files | In `npm test`? |
|---|---|---|
| **T0 — table fidelity** | `asm-mnemonics.test.ts` (asm ⟷ `OPS`/`dmods`/`opcodes.md` §2, §7.4's five assertions); `asm-pseudo-ops.test.ts` (slices `software.md` §6's markdown on `/` and asserts §2.2's partition); `asm-is-dom-free.test.ts` | yes |
| **T1 — manual worked examples** | `tier1-exhibit-iv.test.ts` — the assembler-independent facts `architecture.md` §8 authorises plus the separately-named OS corroboration block, and nothing else. Assembly-only. | yes |
| **T2 — module properties** | `asm-source`, `asm-operand`, `asm-symbols`, `asm-literals`, `asm-emit`, `asm-pack`, `asm-listing`, `asm-demo-source` (the demo's column-exactness, the JOB ident, and the data-card drift guard — §10) | yes |
| **T3 — the closed loop** | `tier3-asm-load-equals-memory.test.ts`, over §11.1's six programs (three from wave 2, three added in wave 4) | yes |
| **T4 — the storyboard, and it GATES** | `tier4-autocoder-demo.test.ts` | **no — it joins `npm run smoke`** |

The `tier4-` prefix is not cosmetic and is the one `package.json` keys on: `"test": "vitest run
--exclude 'test/tier4-*.test.ts'"` and `"smoke": "vitest run test/tier4-"`. The demo tier follows
`tier4-demo-deck.test.ts`'s precedent exactly — *"unlike cc01 this one GATES — we wrote the deck and
we know what it prints."*

**Gate-line change, flagged in advance.** `npm run smoke` is currently **17** tests. Wave 6 adds a
tier-4 file, so the count rises. **The wave-6 commit message states the new number**; it is not allowed
to change silently, and `BUILD-LOG-3.md` records it per wave. `npm test` (1099 now) grows by T0-T3.

Every constructed fixture is labelled constructed and tagged `[observed]` at best.

### 12.2 Gates at every commit

```
npm run typecheck                                            clean
npm test                                                     1099 existing + the new tiers, 0 fail
npm run smoke                                                cc01 byte-identical: CC01A, CC01 COMPLETE,
                                                             instruction check at 00322, 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt      PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing \               PASS  (FROM WAVE 5 ON — the command
  --golden test/golden/hello-dad.lst                          does not exist before it)
```

The fifth line is the listing golden's only per-commit gate, and R4 rests on it: a golden this phase
owns has to be *checked* every commit, not only regenerated. `--update` is never part of a gate run.

Then Opus adversarial review, fixes, one commit, push `feature/phase-3`. **Never `main`.**

### 12.3 The fixture inventory, checked rather than assumed

`emulators.md` §5.1's inventory is `cc01.cor`, `insttest.cor`, `ilentest.cor`, `ilentst2.cor`,
`note1410.txt`, and the PR-108 / PR-155 tape images — assembled core images with no source. §7's only
card-deck format is the IBM **diagnostic** loader's, already consumed by
`EXECUTE_CARD_IS_E_IN_COLUMN_1`. Two things exist and neither is usable, and the honest wording is
"nothing machine-readable", not "nothing":

- **The CC01A PDF is ~38 scanned pages of Autocoder listing with no OCR text layer** (`emulators.md`
  §4; `pdftotext` yields 48 bytes of whitespace). It is a future **manual-transcription** oracle and is
  worth a line in `PHASE-3-NOTES.md`, not a wave.
- **`a.job`** in the sky-visions corpus is what `emulators.md` §9 item 6 says it is and no more: "the
  `.job` decks (`a.job` Autocoder, …)", in a corpus that carries **both** the pre-OS PR-108 and the
  OS PR-155 tapes. Its provenance is therefore **unestablished** — an earlier draft called it "OS-era,
  not a standalone assembly", which the research does not say — and it was **not retrieved here**.
  Unused for that reason, and kept as a named future **source-language** fixture: if it is ever
  retrieved and shown to be a PR-108 assembly, it is the only surviving standalone Autocoder source
  we know of.

**No standalone 1410 Autocoder listing with published output survives**, so `test/golden/hello-dad.lst`
is **constructed**: its header line says so, `test/asm-listing.test.ts` declares
`LISTING_GOLDEN_IS_CONSTRUCTED = true` so a reader can grep it, and it is regenerable only through
`npm run asm -- … --update`.

---

## 13. Exit criteria — §1's storyboard, mechanically checkable

1. `npm run typecheck` clean; `npm test` green; `npm run smoke` green at its stated new count;
   `npm run demo -- --golden test/golden/hello-dad.page.txt` PASS, **348 bytes, unchanged** — Phase 3
   does not touch the hand-deck path.
2. `assemble(readFileSync('demos/hello-dad.asm'))` returns `ok: true`, **zero flagged lines, and
   EXACTLY ONE warning** — not zero. The warning is §8.3's GM-WM tail: the last record loads 12 cells
   at 00552, so the loader plants a group-mark-word-mark at **00564**, the first position of `LINE`'s
   DS extent (00564-00643), and §8.3's rule warns on a tail landing inside **any DS / DA extent**.
   Its text is asserted, not just its count: *"the last record's GM-WM lands at 00564, inside LINE — a
   read with d = `R` will transfer nothing; use `$`"*. **This is the designed outcome, not a defect** —
   it is §10 trap 3 stated by the packer, and the demo is correct precisely because the read carries
   `$` (`CARD_DOLLAR_SUPPRESSES_GM_WM_TEST`). A demo that produced no warning here would mean §8.3's
   second case had been dropped. `warnings.length === 1` is the assertion, so a second, unexpected
   warning fails the gate.
3. The listing carries **nineteen lines of kind `comment` | `imperative` | `declarative` | `control`,
   one per source card**, plus §9's own heading line per page and its trailer line — the rendered
   listing is therefore longer than nineteen lines, and asserting "19 lines" would fail on a correct
   listing. `LOOP` ADDRS 00500; `EOJ` ADDRS 00548; `ID` CT 6 ADDRS
   **00563** with the emitted word mark at 00558; ` LINE` CT 80 ADDRS **00564**, and the same source
   with the label un-indented gives **00643**.
4. `BA1 *+1` at 00517 assembles to `R 00524 ⧧`; `BEF1 EOJ` at 00510 assembles to `R 00548 8`;
   `RW1 %10,LINE,$` at 00500 assembles to `L %10 00564 $`.
5. `result.deck.records.length === 2`, counts **52** and **12**; every record survives
   `decodeObjectRecord(encodeObjectRecord(r))`; `result.deck.entry === 500`.
6. `loaderDeck(result.deck)` plus the five data cards = **10 cards**. Run headless through the Phase-2
   operator sequence → `renderGreenBar(state.printer.paper, { chain: 'A', formLines: 66 })` equals
   `test/golden/hello-dad.page.txt` **byte for byte**.
7. Core over **00500-00564** after that load — the union of the emitted addresses (00500-00563) **and
   every surviving GM-WM address**, which is what puts 00564 inside the compared range instead of one
   position past its end — characters and word marks — equals
   `applyToStorage(result.items)`, and the only extra bytes in core are the **surviving** GM-WMs,
   computed from the record list as §11.1 defines them: the mark at `loadAddress + count` of each
   record no later record covers. On the demo that is **one** mark, at 00564 — record 1's at 00552 is
   inside record 2's payload and is gone.
8. A deliberately broken source (undefined symbol, duplicate label, unknown op, unparseable operand)
   produces exactly four flagged lines carrying **U / M / O / F**, `ok: false`, a rendered listing, and
   **nothing thrown**.
9. `npm run asm -- demos/hello-dad.asm --listing --golden test/golden/hello-dad.lst` PASS.
10. `git diff --stat main` touches nothing on §3.4's list; `git diff --stat main -- test/` shows only
    additions; the only non-owned files changed are `src/ui/unitrecord/deckBox.ts` (+~5, the exported
    `DeckBox` type included), `src/ui/unitrecord/mount.ts` (+~3), `src/ui/internals/main.ts` (+2),
    `tsconfig.tools.json` (+1) and `package.json` (+1) — §3.2 and §3.3 — **plus
    `docs/research/open-questions.md`, whose diff is confined to the appended dated Phase 3 section**
    (criterion 12 requires that edit; §3.1 owns the section and §3.4 forbids everything outside it).
    Nothing else.
11a. **Automated, and it is the hopper hand-off:** `parseDeck(session.hopperText())` yields **ten**
    cards and zero `DeckError`s, and its first two cards are byte-identical to
    `LOADER_BOOTSTRAP_CARD` and `LOADER_BODY_CARD`. That is everything PUNCH INTO HOPPER does except
    the two lines of DOM plumbing.
11b. **The browser check — the only one that needs a human at a screen.** (Criterion 12 below is not
    mechanically checkable either, but it is a **review item**, not a thing anyone looks at in a
    browser; the two are different kinds of not-automated and this plan no longer calls 11b "the one
    manual check".) In the
    browser (`npm run dev`): §1's nine steps produce the five lines on the green bar; PUNCH INTO
    HOPPER fills the deck textarea and re-enables PUT DECK IN HOPPER; the two sample-program buttons
    fill their boxes; the A/H chain toggle switches `&` to `+` in the listing; and §2.5's framing
    paragraph is visible above the source box. `BUILD-LOG-3.md`'s wave-6 section records it as run,
    by name.
12. **Mechanical half, and it is a command:** a dated `## Phase 3 — 2026-…` section exists in
    `docs/research/open-questions.md`, and **every `// OPEN:` constant name grepped out of
    `src/asm/**` and `src/ui/autocoder/**` has a matching row in `PHASE-3-NOTES.md` §1** — a grep, a
    sort and a set difference that must be empty in both directions. **Review half:** whether each of
    those rows says the right thing — the fallback actually taken, the consequence, the escalation —
    is judged in the **whole-branch review before merge**, not by a command, and is listed there
    rather than pretended to be a gate.

---

## 14. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | The I/O operand convention is `[unverified]` and the demo's first instruction rests on it. | Inherited from `loader.ts`'s Phase-2 comment, not invented; behind `IO_OPERAND_IS_XCONTROL_BADDR_D`; and the gate is the printed page, which does not depend on the spelling. |
| R2 | `RW#` resolves to two op characters and the resolver is a function. | Ruled in §7.2 before wave 1, carried on a named `AMBIGUOUS` list in the both-directions test, escalated as a probable research correction. |
| R3 | Scope creep into macros, `,G`, EX/XFR or the OS assembler. | §2.2's table is machine-checked by `asm-pseudo-ops.test.ts` against `software.md` §6's own markdown; the reviewer diffs against it. |
| R4 | The listing golden is ours, so it can be "fixed" to match a bug. | The **gating** artifact is Phase 2's 348-byte page golden, which Phase 3 does not own. The listing golden is labelled constructed, declared as a constant in its test, and regenerable only through `tools/asm.ts --update`. |
| R5 | The label-resolution rules produce a *wrong deck that still loads* — silent. | The closed loop catches an address error before the demo does; ADDRS is one rule (§4), and both the col-7 and low-order cases are pinned by name against `ID` and `LINE`. |
| R6 | The 60-column budget read as a character budget. | Per-cell column cost in `pack.ts`, the all-marked property test, the shipped-decoder round-trip property test, and `encodeObjectRecord`'s independent re-check — which throws rather than truncating. |
| R7 | Over-fitting the assembler to its own loader — `architecture.md` §5's named hazard. | The closed loop loads through the **real** Phase-2 loader and the **real** 1402, neither written by this phase, and asserts the residue delta rather than mirroring it. |
| R8 | Exhibit IV is an **OS** listing used to test a **standalone** assembler. | Only §11.2's assembler-independent facts; no relocation, no OS columns, no execute-the-deck test. |
| R9 | The `,G` / `OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK` collision tempts a "small fix" in `src/formats/`. | `,G` is out of scope with an `F`; the finding is escalated with a dated `open-questions.md` row; `src/formats/**` is untouched. |
| R10 | `+` prints as `&` on chain A and will look like a bug to a reader with the manual open. | The typing alias, one line of UI text, an A/H chain toggle, and `SOURCE_PLUS_IS_THE_12_PUNCH` in the ledger. |
| R11 | Column discipline in a textarea frustrates a human typing the demo. | A column ruler and a monospace grid — the coding sheet's own answer. Convenience padding is explicitly **refused**: it would be a second source language. |
| R12 | UI wiring discovered mid-build instead of planned. | Three edits across three files, enumerated in §3.2 with their bodies, and nothing else outside `src/asm/**` and new files may be touched. **This risk already fired once, in review of this plan**: the earlier "four lines, two files" count could not fill the deck box at all, because `createDeckBox` returns `{ el }` and keeps its textarea and `refresh()` private — the third edit is that finding, costed rather than deferred. Exit criterion 10 pins the diff to those files and those line counts. |
| R13 | Scope creep into the period UI. | The Phase-3 view is unstyled, reuses `.green-bar` and `renderCard`, and edits no CSS. Phase 4 restyles; nothing here is thrown away. |

---

## 15. `[unverified]` / `[likely]` items — each with its `OPEN:` constant and fallback

Every row is a named exported constant with an `// OPEN:` comment at the point of use and a row in the
dated Phase 3 section of `docs/research/open-questions.md`, added in the wave that first depends on it.

| Constant | Tag | The claim | Fallback if overturned |
|---|---|---|---|
| `IO_OPERAND_IS_XCONTROL_BADDR_D` | `[unverified]` | `RW1 %10,LINE,$` → `L %10 00564 $`; the mnemonic supplies only the op char and the channel digit. Inherited from `loader.ts`'s regenerable source. The doubt: `RW1`'s `1` is the *channel* and `%10`'s `1` is the *device*, so the two overlap — the strongest evidence the convention is not IBM's; and `software.md` §10.6 prints the machine manual's spelling `R1W` / `R2W` where `table.ts` and the loader use the `#`-suffix form. The **field itself** is not open: three positions, x1 from `X1_CHANNEL`, x2 from `X2_DEVICE` (`software.md` §10.9, `[verified]`) — only the operand *convention* is. | The mnemonic supplies x1 and x2; the operand becomes `LINE,$`. `demos/hello-dad.asm` and `loader.ts`'s comment would move together. |
| `RW_HASH_IS_LOAD_MODE` | `[likely]` | `RW#` appears in both `OP_L` and `OP_M` (`table.ts` and `opcodes.md` §2 rows 206/207); it resolves to `L`, read **with word marks** = load mode. §7.2. | Resolve to `M` and rename the load-mode form. Escalated as a probable research correction either way. |
| `BEX_MNEMONIC_IS_CONDITION_OR_NOT_READY = '9'` | `[unverified]` | `BEX1`/`BEX2` → d `9` (bits 8+1), which is what the shipped loader executes at 00292. `RX_STATUS_BITS` pins six; this eighth is not pinned row-by-row (`opcodes.md` §6.2, and `loader.ts` says so itself). | Drop `BEX1`/`BEX2` and flag `O`; §11.3's stretch oracle is dropped with them. |
| `V_ZONE_WORD_IS_THE_THIRD_OPERAND` | `[unverified]` | `V_D_TABLE.autocoder` prints `'BZN (I)(B) AB'`, so the third operand is a zone **word**, not a raw d. **The two readings diverge**: `BZN a,b,B` is d = `K` under this reading and d = `B` under the raw one. | Accept the concatenated mnemonics `BZNAB` / `BWZA` / … instead, or take the third operand as the literal d. |
| `T_MNEMONIC_SUFFIX_IS_THE_D_BITS` | `[likely]` | `L`=1, `E`=2, `H`=4 summed; all six of `opcodes.md` §2's `T` mnemonics agree. | A hand-written 6-row table — identical values, so the fallback is free. |
| `MOVE_MNEMONIC_IS_DIR_PORTION_TERM` | `[likely]`, corroborated four ways | `('M'\|'SCN') + dirLetter + portion.letters + termLetter`, `d = direction.key \| portion.key`; 64 names. | A hand-transcribed 64-row table from A22-0526-3 Figure 21. |
| `CARRIAGE_MNEMONIC_TAKES_THE_D_AS_ITS_ONLY_OPERAND` | `[likely]` | **Carriage only** — `F` → `CC1`, `2` → `CC2`. `CC1 1` writes the d literally; `CARRIAGE_D_TABLE` / `opcodes.md` §6.4 give 30 rows and no per-d mnemonics. | Per-d mnemonics if a C28-0309-1 page ever surfaces. |
| `STACKER_MNEMONIC_TAKES_THE_POCKET_AS_ITS_ONLY_OPERAND` | `[likely]` | `K` (0o42) → `SSF1` and `4` (0o4) → `SSF2` are **Select Stacker and Feed**, not carriage: `SSF1 1` writes the pocket digit as its only operand, from the op's own inline `dModifiers` (`0` pocket NR, `1` pocket 1, `2` pocket 8-2 — `table.ts`; A22-0526-3 pp.62-63). Recorded because an earlier draft folded `K`/`4` under the carriage rule and left `SSF1`/`SSF2` unresolvable by §7.4's direction-2 test. | Per-d mnemonics, as for the carriage. |
| `WM_HASH_STAYS_AS_SHIPPED` | `[unverified]` | `WM#` — "write with word **m**arks", which by the `W` = load-mode rule should be `L` — sits under `OP_M` in `table.ts` **and** in `opcodes.md` §2 row 207. Nothing in scope uses it, so it resolves **as shipped** (`M`) rather than being silently re-homed, and the finding escalates as a probable §2 correction beside `RW#`. | Resolve to `L` if the correction is accepted; one row, no other consequence. |
| `EQU_TO_AN_XCONTROL_FIELD_IS_OUT` | scope, `[verified]` source | `software.md` §5 lists a fourth EQU form: a label for "a tape unit / X-control field" (C28-0309-1 pp.12-16). Out with an `F`: it makes a symbol whose value is three glyphs rather than an address — a second namespace with no consumer here (no tape; the demo and Phase 5 write the field literally). | Add a `kind: 'xcontrol'` `SymbolEntry` carrying a 3-glyph string, and let §5.2 step 3 rule 1 accept a symbol. ~15 lines, no other rule moves. |
| `FLAGGED_LINE_STILL_RESERVES_AND_ASSIGNS` | `[likely]` | An `F` on an operand does not un-reserve a declarative's storage: a flagged `DA 1X80,G` still reserves 81 positions and still assigns the header and sub-entry addresses, only dropping the group-mark emission. It is what lets the tier-1 oracle assert Exhibit IV's 00315 / 00318 / 00394 on a line we flag. | Reserve nothing on a flagged declarative — which would make every later address in the listing wrong and is why this is the default. |
| `SOURCE_LOWERCASE_UPCASES` | `[likely]` | A lowercase letter typed into the source box up-cases to its 64-glyph equivalent, a typing alias like `+` → `&`; any other character `bcdOfGlyph` rejects is an `F` with its column, stored as a blank (§5.1). The 1410 has no lowercase and the coding sheet was capitals. | Flag lowercase as well; one branch, and a worse first five minutes for a person typing the demo. |
| `D_FOLLOWS_THE_ADDRESSES` | `[likely]` | The d is the operand after the form's addresses. `software.md` §4 shows only the two-address case (`BCE ENTRYA,SWITCH,2`). | Accept a trailing d in any slot, including `B EOJ,,8`. |
| `COL7_INDENT_IS_STANDALONE_TOO` | `[likely]` | A label beginning in column 7 resolves high-order on C28-0309-1 too; the sentence is C28-0326-2 p.28's (`software.md` §5). Exhibit IV's 00396 / 00402 are the evidence it is real. | Drop the rule; every constant label is low-order. One branch — but `demos/hello-dad.asm` would need `LINE` moved above the DCW or an explicit EQU. |
| `ACTUAL_LABEL_IS_CHECKED_AGAINST_THE_COUNTER` | `[unverified]` | An actual label defines a symbol, resolves high-order, moves no counter, and a mismatch against the counter's own high-order address flags `F`. Only the **check** is open; both `software.md` §1 sentences are `[verified]`. | Define the symbol and do **not** check. **Not** "treat it as an implicit ORG" — that would contradict a `[verified]` sentence. |
| `MULTIPLY_DEFINED_KEEPS_THE_FIRST_VALUE` | `[unverified]` | First definition wins; later ones flag `M`; references are not flagged (`software.md` §6 names the flag and nothing else). | Keep the last value and flag references too. |
| `ONE_FLAG_PER_LISTING_LINE` | `[unverified]` | One FLAG column, one letter, precedence O > F > M > U. | Widen FLAG to four positions and print every flag the line earned. |
| `STANDALONE_HAS_NO_NOP_PSEUDO_OP` | `[unverified]` | `software.md` §6's footnote: the NOP/NOPWM row was not confirmed against C28-0309-1's op tables. The **imperative** `NOP` (op `N`) is unaffected either way. **This reverses a recorded research default, and says so:** `open-questions.md`'s own row reads *"Fallback: **Accept both mnemonics in the assembler**; mark NOPWM as an OS-era extension if strict pre-OS fidelity is wanted"* — the opposite default, offered here as the fallback. Phase 3 declines it because the standalone op table is unconfirmed and the whole phase is scoped to C28-0309-1, and carries the reversal as a dated row in the Phase 3 section of `open-questions.md`. | The research's default: accept both, NOP = word-marked `N`, NOPWM = word-marked `N` followed by an unmarked unconditional branch, both marked OS-era. |
| `DA_EMITS_ONLY_ITS_MARKED_POSITIONS` | `[unverified]` for the standalone | The condensed format cannot set a word mark without storing a character, so DA emits one marked blank per defined field high-order and clears nothing else — as close to C28-0309-1's silence and DS's "not cleared" as the format permits. | The OS behaviour: clear the whole reserved area to blanks before setting marks (`software.md` §5, C28-0326-2 p.25). One switch. |
| `CONSTANT_MAY_SPAN_CONDENSED_CARDS` | `[unverified]` | A constant longer than 60 columns splits across cards; a separator and its character never split, by construction. **`open-questions.md`'s own software row proposes the opposite**, and this ruling declines it because the closed loop proves the split byte for byte. | That row's fallback: cap constants at one card's payload (cols 13-72) and flag `F`. |
| `SOURCE_PLUS_IS_THE_12_PUNCH` | `[likely]` | Autocoder's `+` is Hollerith 12 = BCD `0o60`, printed `&` on chain A and `+` on chain H (`charset.md` §5; `bcd.ts` rank 6 — there is no `+` among the 64 glyphs). | Require `&` in the source file and drop the alias — a worse read next to the manual, and the only alternative available. |
| `JOB_IDENT_COMES_FROM_ITS_OWN_COLUMNS_76_80` | `[likely]` | `software.md` §1 says the ident is "punched into the object deck via JOB/RESEQ"; which field supplies it is unstated. | Take the first five characters of the JOB operand instead. |
| `LISTING_COLUMN_STOPS` | `[unverified]` | §9's stops and the heading shape. `console-and-physical.md` §12 publishes the OS column *set*, not its metrics. | Any other stops; one array, one place, and only our own constructed golden depends on them. |
| `LISTING_LINES_PER_PAGE = 55` | `[likely]` | The OS `/LIN/` default on the 66-line `DEFAULT_CARRIAGE_TAPE` (`console-and-physical.md` §12, `PHASE-2-NOTES` §1). | Change the number. |
| `LISTING_TRAILER_FOLLOWS_THE_OS_FORM` | `[unverified]` | Flag count plus up to twenty flagged SEQNOs, per C28-0326-2 p.57's corrected description. | Drop the trailer. |
| `LISTING_GOLDEN_IS_CONSTRUCTED = true` | provenance | Declared in the test file so a reader can grep it. `[observed]` at best, never period truth (`research/METHOD.md`). | — |

**Facts deliberately given no constant, because they are `[verified]` and pinned by a named test
instead** — listed so nobody re-opens them: the 00500 default origin; the low-order / high-order /
column-7 / actual-label rules; DS emitting nothing and not clearing; the literal pooling rules and the
encounter-order flush; the right-to-left `@` scan; the rightmost-index-tag rule; indexing rejected in
DS / ORG / LTORG / control operations; the asterisk's two meanings; CTL absent = 20K; RESEQ resetting
the sequence to 001; and **`CARD_DOLLAR_SUPPRESSES_GM_WM_TEST`** — §10 trap 3 and §13 criterion 2 both
name it, and it needs **no new Phase-3 constant** because it already ships as an exported `[verified]`
constant in **`src/core/channel.ts:87`**, read by `decodeD` and cited in `loader.ts`'s own header.
Phase 3 consumes it; it does not re-declare it.

---

## 16. Documentation conventions, matching Phase 2's

Three files, three jobs, none of them a redesign after the fact.

**`docs/BUILD-LOG-3.md`** — one `## Wave N — <what> — commit <sha>` section per wave, in the shape
`docs/BUILD-LOG-2.md` uses: what landed, what the review found and what was done about it, §12.2's
gate lines with their numbers — four through wave 4, **five from wave 5 on** once `npm run asm
--golden` exists, and the new `npm run smoke` count from wave 6 on — and any number
in this plan that the build corrected. Opens with `## Arrival — <sha> (the plan, on feature/phase-3)`.

**`PHASE-3-NOTES.md`** — four sections, matching `PHASE-2-NOTES.md`:

1. `## 1. [unverified] / [likely] fallbacks hit (each behind a named constant with // OPEN:)` — the
   §15 ledger, reduced to the constants actually reached, each with the fallback taken.
2. `## 2. Plan deviations (minimal, logged, not redesigns) and modelling refusals` — including the
   `IO_OPERAND_IS_XCONTROL_BADDR_D` outcome, whether the demo's 52/12 packing split held, and the
   Phase-5 macro-free consequence of §2.3 restated where Phase 5 will look for it.
3. `## 3. Research corrections and [observed] observations` — the `RW#` collision, the `WM#` mode
   mismatch (`WM_HASH_STAYS_AS_SHIPPED`), the `BA1 *+7` in `loader.ts`'s comment, and the `,G`
   narrowing of §2.4, each as an escalation with its resolution. Plus the two rows Phase 3 **declines**
   in `open-questions.md` rather than takes — `CONSTANT_MAY_SPAN_CONDENSED_CARDS` and
   `STANDALONE_HAS_NO_NOP_PSEUDO_OP` — and the one it leaves open while emitting nothing for it, the
   DA `,G` CARD-column row (§11.2).
4. `## 4. Open items carried out of Phase 3` — into Phase 5 (RPG source shape, the IOCS deviation) and
   Phase 4 (the listing view's restyling).

**`docs/research/open-questions.md`** — a new `## Phase 3 — 2026-…` section at the end, with
`### Wave N — <title>` subsections and the file's existing four-column table:
`| Constant | Question | Where it bites | Fallback taken, and the alternative |`. Nothing outside that
section is edited. The three escalations of §16.2 item 3 get rows there as well as in the notes,
because a divergence that is written down is a known cost and one that is not is a bug.
