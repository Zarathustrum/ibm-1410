# `note1410.txt` — what could not be mapped onto a named latch

Everything in `oracles/note1410.txt`'s arithmetic block (`insttest.cor` **02300-02799**) that
`arith.ts` could not confidently turn into a field of `LatchTraceRecord` (`src/core/trace.ts`),
kept with its address and its line numbers in `note1410.txt`, and what it says restated in our
own words — the note is GPL-3.0-or-later and is cited, never copied (`ref.ts` beside this file).
Silently discarding the unmappable half is how oracle coverage quietly rots
(`docs/plans/architecture.md` §8 tier 3; `phase-1-cpu-core.md` §6.2).

Nothing here is asserted by `test/tier3-arith.test.ts`. Each entry says why.

---

## 1. Preamble — the running-lights rule, deliberately not applied

`note1410.txt` lines 67-71. The tests come from the CE instruction materials or the principles of
operation; Jaeger warns he may have missed some lights; and a light should be read as staying on
until a later NOT, or a complementary Unit/Body/Extension light, turns it off.

**Not applied.** The two halves of this paragraph contradict each other as an oracle: carrying a
light forward turns "I might have missed some lights" into an assertion the machine must satisfy.
`arith.ts` therefore asserts a latch only on the position whose own `A:`/`B:` lines name it. The
visible cost is real — at 02300, for example, the Body latch is never mentioned at all, so
positions 1 and 2 carry no `phase` — and it is the honest cost.

---

## 2. `D:` cycle lines — not a B-field position

Our L3 record is one per **B-field position** (plan §6.2). A D cycle is neither, and "Scan N" is
not one of the two scan states the record type carries (`scan1` / `scan3`).

**02379** (add, chained) — line 183

A `D:` line naming Extension and Scan N, with a question mark on "D cycle" and a parenthetical
that it may fall at the end of the fetch phase.

Jaeger's own question mark. The line is a guess about his simulator's phase boundary, not an
observation.

**02484** (subtract, chained) — line 319

A `D:` line naming Carry In/Out, A Complement and Extension, each in square brackets, then Scan N.

The square brackets are unexplained — most plausibly "still on from the previous instruction",
which is the leftover-latch effect he says at 02422 he later fixed (see §4 below). Not asserted.

**02561** (zero-and-add, chained) — line 421

A `D:` line giving AAR 10231 and BAR 10236, then Scan N and Extension, the last attributed to the
previous instruction.

**Half-mapped.** The `AAR=10231, BAR=10236` half is a hard, checkable register expectation and is
carried as `chainedRegisters` on the case. The `Scan N, Extension` half is unmapped, as above.

---

## 3. Stated results that do not reconcile with the field in the image

**02311** (add, positive larger than negative) — a stated *fetch*, line 95

Cycle 1's `B:` line says the B cycle fetched `1`, added, and stored 8, in Extension.

The B field is `900` (the note's own line 89, and the image agrees), so the position this cycle
fetches holds `0`. The same line's `result 8` proves it: the A digit is 1, this is a complement
add, 9 − 1 = 8 plus a B digit of **0**; a B digit of 1 would give 9 and the heading's stated
result of 883 would read 893. The mirror case at 02411 — which the note itself calls the same as
the add at 2311 — fetches `0` at that position (line 228). The `1` is the preceding `A:` line's
`WM/1` bleeding into the B line. `arith.ts` carries `b: '0'`, cites the line as written, and
records the correction in `CORRECTIONS`.

**02333** (add, recomplement) — line 115

The heading states the result as the two characters `1O`, glossed as −6.

The B field at 10020 is **three** characters (`012`, 10018-10020) and 012 + (−18) = −6, which in
three characters is `00O`. The heading's two characters cannot be the field. The three store
lines of the same annotation — `O` (−6), then `0`, then `0` under a word mark — do give the field
unambiguously, and *those* are what `resultField` carries. The heading itself is not asserted.

**02485** (subtract, zones) — line 326

The heading names the B field as 10147, holding `00|!?1`, and points back at the corresponding Add.

The image's instruction at 02485 is `S 10144 10150`, and the six-character field runs
10145-10150. 10147 is *inside* the field, not its address. The corresponding Add at 02380
(`A 10041 10047`) names its B field correctly, so this is a slip. `arith.ts` carries the
corrected 10150 and records the correction in `CORRECTIONS`.

**02485** (subtract, zones) — the intermediate value, line 340

A continuation line saying the field reads `98XOE6` on entry to the recomplement cycle.

A state *between* two records: the B field as scan 1 left it, before the scan-3 pass rewrites it.
Our record type has no "field so far" member, and the L3 `end` record carries only the final
result. Recorded, not asserted. (It is derivable from the six scan-1 `r` values, which *are*
asserted: 9, 8, X, O, E, 6 read high-order first.)

**02633** (multiply) — line 486

The operand line gives the A field at 10340 as `1625` and the B field at 10337 as `7xxxxx`.

10337 is the word mark of the *next* field (`1625`, 10337-10340). The image's instruction is
`@ 10340 10336` and the B field is 10331-10336. Corrected in `arith.ts`; multiply is Phase 1b, so
nothing here is asserted either way.

---

## 4. Simulator asides — statements about Jaeger's code, not about the 1410

These describe behaviour he later changed, or a convenience he added. Carrying them as
expectations would encode *his bug* as *our contract*.

**02362** (add, single field) — lines 168-169

From this point on his simulator resets the Carry In/Out latches before the first A cycle, to
make the trace less confusing.

**02422** (subtract) — lines 243-246

The A Complement light here is left over from the previous subtract: his simulator did not clear
it in the A cycle, so it shows there. He later changed the code to clear both complement latches
before the first A cycle.

**02444** (subtract) — line 277

The B Complement light here is likewise a leftover from the instruction before.

The last two describe the *pre-fix* simulator. The annotations at 02422 and 02444 were written
against it, so their own latch lines may still show the leftover. `arith.ts` transcribes only the
latches those lines actually name, and the tier-3 test reports any mismatch rather than papering
over it — a disagreement here is evidence about the leftover, not necessarily about our adder.

---

## 5. Cross-references and standing notes

**02322 / 02356 / 02362** (add) — the overflow note, lines 109-110, referred back to at lines 156
and 166

Overflow stays on until something clears it; a computer reset clears it and a program reset does
not.

True and already implemented, but it is an **indicator** fact, not a latch-record field:
arithmetic overflow is reset by the `J (I) Z` test that reads it or by computer reset
(`opcodes.md` §6.1, §8; `src/core/indicators.ts`). Asserted in `test/indicators.test.ts`.

**02400 / 02411 / 02422** (subtract) — "same as the add at 23xx", lines 218-219, 231-232, 248-249

Each subtract negates the A field of the matching add, so each says its result is that add's
(02300, 02311, 02322).

A reading aid. The subtract cases carry their own `resultField`, so the cross-reference asserts
nothing extra.

**02544** (zero-and-add, single field) — lines 404-405

The cycle sequence is 02533's: the B field's value does not matter, and the A and B addresses are
the same.

The per-cycle expectations are 02533's *by reference*. Rather than duplicate them under a second
address — where a future correction would have to be made twice — 02544 carries its fields and
its result and an **empty** `expected`. Wave 6 may choose to expand it.

---

## 6. Glyphs and field-extent prose

**Jaeger's glyph set is not the 1410 A2 chain.** Two characters differ, and his own bit
annotations disambiguate both, so `arith.ts` substitutes ours (`GLYPH_SUBSTITUTIONS`) rather than
leaving the text ambiguous:

| Note | Ours | BCD (octal) | His own annotation |
|---|---|---|---|
| `\|` | `‡` | 32 | "(RM=A0)" — record mark |
| `=` | `#` | 13 | "(821)" — 02533 |

He also writes `b` for the blank (the 02533 A field at line 384, which he spells out as a blank
at line 398), which is unambiguous, and `xxxx` for don't-care product/quotient positions in the
multiply and divide cases — the image holds `7`s there.

**Field-extent parentheticals**, mapped as commentary rather than data:

- 02300, line 74: the A field at 10003 is `099`, with no word mark over it, and the `1` of `1099`
  is not used.
- 02400, line 208: the A field at 10103 is `109R`, the `1` is not used, and the field is
  effectively −99.

Both say the same thing: the A field carries no word mark, so its length is governed by the B
field's, and the high-order `1` at 10000 / 10100 is never processed (`opcodes.md` §2 p.17). The
`aField` entries carry the run the note prints; the *processed* length is the B field's.

---

## 7. Outside 02300-02799, recorded because the notes carry them

**00500** — the instruction-decode list, `note1410.txt` line 21: the entry names multiply `M`.

Wrong: `M` is the Autocoder mnemonic. The op character in the image is `@` (BCD 14, the 8 and 4
bits) — `emulators.md` §5.2, `opcodes.md` §1.6. Carried in `arith.ts`'s `CORRECTIONS`.

**02848** — the Move matrix, **Wave 5's block**, mentioned only: line 519's heading labels the
d-character `T` and glosses it as a right-to-left scan stopping at the B-field word mark.

The image holds `D 10517 10519 -`, d = hyphen (B bit only). Jaeger's prose is right, his
d-character label is wrong (`emulators.md` §5.3). Wave 5 owns the fixture that corrects it.

---

## 8. The carry light — one light in the notes, two fields in the record

`LatchTraceRecord` carries `cin` and `cout` separately. `note1410.txt` writes **"Carry In/Out"**
as a single phrase throughout, and the arithmetic proves it is one light rather than two latches
both happening to be on:

- **02344** (`A 10023`, single field, 015 + 015, a TRUE add). Units: `5 + 5 = 10`. The note prints
  "Carry In/Out" — but nothing can have carried *in* to the units position of a true add.
- The next position, `1 + 1 + carry = 3`, certainly *did* take a carry in, and the note prints
  **"NOT Carry In/Out"**.
- The same pattern at **02350**, **02356** and **02362**, all true adds.

So `arith.ts` maps the combined phrase — in both polarities — onto **`cout` alone**, and asserts
`cin` only where the note writes "Carry In" by itself (02333, 02433, 02485, always at the start of
a recomplement, where the tens-complement's forced carry really is an input). The `cin` values on
"Carry In/Out" positions are **not asserted** and are recorded as unmapped here.

Two singular readings, recorded because the text does not spell them out:

**02333** (add) — line 120, the cycle-1 `B:` line, which ends "No Carry"

"No Carry" is the only carry phrase in the file that says neither In nor Out. Read as **`cout: 0`**:
a carry *out* is what the next position would consume, and it is the only carry the sentence can
be about at a position whose sum is already stated.

**02433** (subtract) — the run-on recomplement line, lines 261-262

One `B:` line runs onto a second: the fetch, add and sum, then SCAN 3, A Complement,
B Complement, CarryIn and UNITS, closed by a parenthetical saying the recomplement cycle begins.

`SCAN 3` and `UNITS` plainly belong to the *next* cycle — the parenthetical says so. `A Complement`,
`B Complement` and `CarryIn` are read as belonging to *this* one, by analogy with 02333, where the
identical latches sit on the main line and the phase words sit on a separate `Start of recomplement
cycle:` continuation. The punctuation here does not settle it; the analogy does, and it is recorded
because a reader could take the whole list as next-cycle state.

---

# The Move block — `insttest.cor` 02800-02979

Added by Wave 5 (`oracle/note1410/move.ts`, `test/tier3-move.test.ts`). Everything below is
`note1410.txt`'s Move annotation that the fixture could **not** turn into an assertion, cited by
line and restated. Nothing here is asserted; each entry says why.

---

## 9. The block prints no registers at all — the Figure 20 half has no oracle

The fifteen Move annotations give an A field, a B field and a `Result:` line, and **nothing
else**. There is no AAR, no BAR, no cycle trace, no latch state — unlike the arithmetic block,
which prints per-cycle latches, and unlike 02561, which states `AAR=10231, BAR=10236` outright.

So `expectedAfter.aar` and `expectedAfter.bar` in `move.ts` are **derived**, not transcribed:
computed from the eight-row Figure 20 table (`opcodes.md` §3.3) with `LA = LB = LW` set to the
number of storage positions the `Result:` line implies. That is exactly the fallback
`phase-1-cpu-core.md` §10 chose for the `[unverified]` per-d register effects, and running it
against fifteen independently-transcribed result fields is the verification it asked for — but
it is a *consistency* check, not an oracle for the registers themselves. Recorded here so that a
later reader does not mistake the register column for something Jaeger observed.

The behavioural half of the block **is** an oracle, and it is strong: fifteen `Result:` lines
covering all eight `d & 0x38` groups and five of the eight `d & 0x07` portions.

---

## 10. The `Result:` line changes which end of the field it names, by direction

The eleven right-to-left cases print the address **after** the word `Result:`, and it is the
field's **rightmost** position — the same position the instruction addresses. 02800, line 508,
is the pattern: operands and result on one line, the result spelled `Result: (10503)`.

The four left-to-right cases print the address **before** the colon, on its own line, and it is
the field's **leftmost** position. 02920, lines 538-539, is the pattern: the operands on one line,
then the result on the next, spelled `Result (10548):`.

Both are internally consistent — the address is always the one the instruction carries, and
`opcodes.md` §3.1 says which end that is per direction — but the two spellings look identical at
a glance and mean opposite things. `move.ts` therefore carries an explicit `from` (leftmost) on
every field beside the `addr` the instruction uses, so no reader has to re-derive the direction
to place the text. Not an unmappable statement; a transcription hazard, recorded as one.

---

## 11. Jaeger's parenthetical headings are Figure 19 restated, not observations

Every heading carries a gloss — `(RL, Numerics, Stop on BWM)`, `(LR, Char, Stop on A GMWM)` —
which is A22-0526-3 Figure 19 p.25 read back off the d-character, not something his simulator
produced. They are cited, not copied, by each case's `lines`, and are **not** asserted against
the decode: doing so would test our reading of his abbreviations rather than the machine. Where a
heading and the image disagree the image wins, which is the whole of the 02848 correction
(§7 above, and `CORRECTIONS` in `move.ts`).

The one thing the glosses are used for: they are the reason the 02848 label error is *known* to
be a label error and not a different instruction. His gloss there says `(RL, SCAN, Stop on BWM)`,
which is the hyphen the image holds, not the `T` his label names.

---

## 12. "Move D==" — a glyph, not a d-character

**02956** and **02968** — lines 549 and 553

Both headings label the d-character `=`, glossed as a left-to-right character move stopping on
either word mark.

`=` is not a 1410 graphic in this project's A2 rendering. The image holds BCD 11 (the 8, 2 and 1
bits) at 02967 and 02979, which `charset.md` §2 rank 20 prints as `#` — `=` is the alternate
type-head rendering of the same 8-3 code (`io.md` §2, the "Code Alternate" column). The same
substitution `arith.ts` already records in `GLYPH_SUBSTITUTIONS`. The fixture stores `#`;
the cited lines keep `==`.

---

## 13. The count: fifteen `D` instructions, not sixteen

`emulators.md` §5.3 and `phase-1-cpu-core.md` §5 and §7 all say "the 16-case Move matrix". The
image holds **fifteen** 12-character `D` instructions — 02800, 02812 … 02968 — followed by a
1-character `.` Halt at 02980 and the word mark that ends its read-out at 02981. §5.3's own
printed code block lists sixteen entries, the sixteenth being that trailing `.`, which is where
the count comes from. The named range "02800-02968" is the address of the **last instruction**,
not the end of the block; the moves occupy 02800-02979.

Not an unmappable annotation — `note1410.txt` itself heads exactly fifteen Move cases — but
recorded here because three planning documents say sixteen and a reader counting them will
otherwise conclude one is missing.
