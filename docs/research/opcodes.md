# IBM 1410 — Complete Instruction Set

Spec source for the CPU emulator. Every non-trivial fact carries a source (form number + page, or URL) and a confidence tag: `[verified]` (read in a primary source), `[likely]` (secondary sources agree; confirm before encoding), `[unverified]` (single weak source; do not encode).

Primary edition used throughout: **IBM 1410 Principles of Operation, A22-0526-3** (last edition). Page numbers are the manual's own printed page numbers, not PDF offsets. Editions -0, -1, -2 and the Nov-61 Reference Manual A22-1407-2 were spot-checked against -3 on ~25 instruction descriptions and found byte-identical in wording on every point checked, including all timing formulas and register results `[verified]` (verifier pass over A22-0526-3 vs A22-0526-2).

---

## Implementer summary

1. Variable-word-length character machine: 5-digit decimal addresses, word marks delimit fields, arithmetic is add-to-storage in the B field. Instruction lengths are exactly 1, 2, 5, 6, 7, 10, 11 or 12 characters, and instruction-length validity is a hardware check — no op code has two valid lengths differing by one.
2. Omitted addresses **chain**: AAR and BAR keep whatever the previous instruction left. Every op's "registers after" row is therefore load-bearing, not documentation. A 1-character chained arithmetic op is the **two-field** form (A at AAR, B at BAR) — never the one-field form.
3. All data movement is one op code `D` with a 6-bit d-character: bits 4/2/1 pick the portion (WM/zone/numeric; none = scan), bits B/A/8 pick direction and terminator. All 64 d-characters are legal. There is no Load, no Move-and-Insert-Zeros, no Translate.
4. Only **Add** and **Subtract** can set arithmetic overflow. ZA, ZS and Multiply never do. Divide sets only divide overflow. Compare/Table-Lookup/BCE share one set of four latches, reset as a group by the next of those three.
5. Branch ops: `J` (internal indicators, L=1 or 7), `R`/`X` (channel 1/2 I/O status, **L=7 only**), `B`/`W`/`V` (L=1, 6 or 12), plus `/` and `.` unconditional forms. Subroutine return is `G ccccc B` storing NSIB out of BAR — there is no branch-and-link.

---

## 1. Notation and machine conventions

### 1.1 Instruction formats and valid lengths

| Form | Chars | Fields |
|---|---|---|
| `O` | 1 | op code alone (fully chained) |
| `O d` | 2 | op + modifier |
| `O xxx d` | 5 | op + 3-char X-control + modifier |
| `O aaaaa` | 6 | op + A-address |
| `O aaaaa d` | 7 | op + A/I/C-address + modifier |
| `O xxx bbbbb d` | 10 | op + X-control + B-address + modifier |
| `O aaaaa bbbbb` | 11 | op + A-address + B-address |
| `O aaaaa bbbbb d` | 12 | op + A + B + modifier |

`a` = 5-char A address, `b` = 5-char B address, `i` = 5-char branch (I) address, `c` = 5-char C address, `xxx` = 3-char X-control field (I/O), `d` = 1-char op modifier. Source: A22-0526-3 p.11 `[verified]`.

Every instruction must carry a word mark over its op code. "No operation code has two valid lengths that differ by only one character. Instruction-length checking insures that the instruction length as read out of storage is one of the valid lengths for the particular operation code. The add op code, for example, has three valid lengths: 1, 6, or 11 characters." — 223-2589 p.13 `[verified]`.

**Acceptable-length table** (223-2589 p.53, `OP CODE / FUNCTION / ACCEPTABLE LENGTHS`) `[verified]`. This is the only 1410 op-code length table that includes the 1-character chained form; the CE Handbook 223-2588-2 p.16 chart omits it.

| Op | Lengths | Op | Lengths |
|---|---|---|---|
| `A` `S` `?` `!` `@` `%` | 1, 6, 11 | `J` | 1, 7 |
| `Z` `E` `C` `,` `⌑` `/` | 1, 6, 11 | `R` `X` | **7 only** |
| `D` `T` `B` `W` `V` | 1, 6, 12 | `M` `L` | 10 |
| `G` | 7 | `U` | 5 |
| `.` | 1, 6 | `N` | any (no operands) |
| `F` `2` `K` `4` | 2 | | |

> `R` and `X` have **no chained 1-character form** — corrected from an earlier reading. Three independent sources agree: A22-0526-3 p.96 ("BRANCH IF I/O CHANNEL STATUS INDICATOR ON … L = 7", directly above "BRANCH UNCONDITIONALLY … L = 1 or 7"); A22-0530-1 Figure 1 (p.4) gives R and X interruptible length 7 with a dash in the non-interruptible column; 223-2589 p.53. An emulator that accepts a chained `R`/`X` executes instructions the real 1411 rejects on the length check. `[verified]`

### 1.2 Chaining

Chaining reuses AAR/BAR from the previous instruction. A22-0526-3 p.12 worked example `[verified]`: `A 05985 06985` with a 5-char A field and 6-char B field leaves AAR = 05980, BAR = 06979; the following 1-character `S` "causes the data at location 05980 to be subtracted from the data at 06979" — i.e. two distinct fields.

Two rules with direct emulator impact:

- **Op-modifier blanking**: "if a two-address instruction does not require a d-character (11-position instruction), the op-modifier register is blanked; thus, any chained instructions then directly following will be automatically assigned a blank d-character." A22-0526-3 p.12 `[verified]`.
- **Chaining legality**: only not-percent-type op codes can be chained, and even then not `R` or `X`. Percent-type op codes (which cannot be chained) are `U`, `M`, `L`, `F`, `K`, `G`, `N`. — 223-2589 p.50 `[verified]`.

Restriction stated by the manual and nothing more: "The only restriction is that the fields remain in sequence and that the address registers contain valid addresses." Behaviour with a stale register after an intervening branch or I/O op is **undocumented** `[unverified]`.

### 1.3 Address-register symbols (A22-0526-3 Figure 8, p.13) `[verified]`

| Symbol | Meaning |
|---|---|
| `NSI` | address of the next sequential instruction |
| `BI` | branch-to address (the next instruction address when a branch is taken) |
| `NSIB` | address of the instruction following a taken branch (not executed) |
| `LA` / `LB` | number of characters in the A- / B-field |
| `LW` | number of characters in the A- or B-field, **whichever is shorter** |
| `Ap` / `Bp` | previous contents of AAR / BAR |

On a taken branch the next instruction is read **from the A-address register**: the op-code address is taken from AAR, placed in STAR, incremented and placed in IAR for read-out of the rest of the branched-to instruction. A22-0526-3 p.12 `[verified]`.

### 1.4 Address-double op codes, CAR and DAR

This is the mechanism behind the one-field arithmetic forms and it removes the apparent ambiguity in the length tables.

- The A address of a **not-percent-type** op code is read into **AAR and CAR**. For an **address-double-type** op code it is read into **AAR, BAR, CAR and DAR** simultaneously, "so that if a WM is read out at I ring 6 time, the single address is used as both the A and B field addresses." — 223-2589 p.52 `[verified]`.
- The B address of an 11/12-character instruction "is read into the BAR and DAR in the same way the A-field address is read in." — 223-2589 p.52 `[verified]`.
- "Not address double-type op codes use the contents remaining in the BAR at the completion of the previous E phase for the B field address." — 223-2589 p.52 `[verified]`.
- Chained arithmetic: "If an arithmetic op code is chained at I ring 1 time, the CPU takes a D cycle during which the address in the BAR is set into STAR, modified by zero, and read into the DAR (the BAR's and DAR's must contain the same address). Chaining multiply, divide, and table look-up op codes at I ring 1 time initiates a C cycle to update the CAR." — 223-2589 p.52 `[verified]`.

Every D cycle exists for one purpose: restore the invariant `DAR == BAR` when the instruction did not supply a B address. An emulator that models only AAR/BAR can ignore D and C cycles except for cycle counting `[verified]` (derived from 223-2589 p.52 + CE Handbook ALD grouping-line objectives).

**Address-double op-code set** (from CE Handbook 223-2588-2 ALD grouping objectives, all gated `if not 1401`, cross-checked against rcornwell/sims `op_args[64]` O_DBL flags) `[verified]`:
`A`, `S`, `?` (ZA), `!` (ZS), `,` (SW), `⌑` (CW), `/` (CS), `J`, `R`, `X`.
**Not** address-double: `@` (Multiply), `%` (Divide), `C` (Compare), `T`, `D`, `B`, `W`, `V`.

Consequences per length:

| Length | `A` `S` `?` `!` (address-double) | `@` `%` (not address-double) |
|---|---|---|
| 11 | AAR←A, CAR←A, BAR←B, DAR←B. No D cycle. E=0 | same |
| 6 | AAR=BAR=CAR=DAR←A. No D cycle. E=0. Field operates on itself | AAR←A, CAR←A, **BAR chained**; D cycle sets DAR←BAR. E=1 |
| 1 | AAR, BAR untouched; D cycle copies BAR→DAR. E=1. **Two-field** | AAR, BAR untouched; D cycle **and then** C cycle. E=2. Two-field |

> The "One Field" instruction descriptions print `L = 1 or 6.` and a formula `T = 4.5(L + 1 + A + 1.5A)` with **no E term**. That formula is one cycle short at L=1: Figure 7 defines E as 1 on a single-character add/subtract/ZA/ZS, and the hardware does take the extra D cycle. Use the **Two-Fields formula with L=1, E=1** for any chained arithmetic op. The `or 1` on the One-Field line is editorial carryover (identical in A22-1407-2, so not an OCR or edition artifact). Semantics are unaffected — only cycle timing. `[verified]`

1410 Autocoder **does** emit the 6-character one-address form: the A22-0526-3 appendix lists `Add (One Field)  A a → A (A)` beside `Add (Two Fields)  A a,b → A (A) (B)`, likewise `S a`, `ZA a`, `ZS a`. The address-double path is exercised by ordinary compiled programs, not just diagnostics `[verified]`.

> **1401-compatibility trap.** On the 1401, address doubling is the **default** for single-address instructions and is excluded only for `M`, `L`, `Q`, `H` (A24-1403-5 pp.20-22). On the 1410 it is an opt-in group that **excludes** `@` and `%`. Keep two separate tables; do not make 1401-mode multiply/divide chain their B address the way 1410-mode does. The 1-character chained rule is the same on both machines ("All no-address instructions (Op code only) use the previous contents of the A- and B-address registers", A24-1403-5 p.22). `[verified]`

### 1.5 Timing symbols (A22-0526-3 Figure 7, p.12) `[verified]`

| Symbol | Meaning |
|---|---|
| `A` / `B` | A-field / B-field length |
| `C` | 1 if the branch is taken, else 0 |
| `D` | chars in the B field from the start of zero suppression to the `$` insert point; 0 if none |
| `E` | **2** on a single-character multiply or divide; **1** on a single-character add, subtract, zero-and-add, zero-and-subtract or table lookup, or on a 6-character multiply or divide; **0** otherwise |
| `I/O` | time used by the I/O device plus 1414 synchronizer access time |
| `L` | instruction length in characters |
| `M` | multiplier length |
| `N` | number of fields actually compared on a table search |
| `Q` | quotient length |
| `R` | 1 if a recomplement is taken on an add or subtract, else 0 |
| `Z` | chars in the B field from the start of zero suppression to the left end of the B field |

Basic core-storage cycle **4.5 µs** per character; all formulas give microseconds.

> **Accelerator trap.** The alphabetic timing appendix at A22-0526-3 **pp.96-98 is the 1410 Accelerator timing set, not the base machine's.** The Accelerator reduces the memory cycle from 4.5 µs to 4.0 µs (~23% internal speed-up, 15-23% throughput), so that appendix prints `T = 4(L+1+C)` for conditional branches, `T = 4(L+2.5+C)` for BCE/BBE/BWZ and `T = 44 + I/O` for write-a-line, against the base machine's `4.5(L+1+C)`, `4.5(L+2.5+C)` and `49.5 + I/O` given in the instruction descriptions. Mixing the two sets is an easy and silent error. "The accelerated system is otherwise identical to the unchanged system." A22-0526-3 pp.96-97 `[verified]`.

### 1.6 BCD code points for op codes and d-characters

Bit weights B=32, A=16, 8=8, 4=4, 2=2, 1=1; a C (check) bit gives odd parity, and the word-mark bit is counted before parity is computed. 64 code points, collating from blank upward. A22-0526-3 Figure 2 p.6; octal values cross-checked against SimH `I7000/i7000_defs.h` `[verified]`.

| Oct | Bits | Glyph | Op code |
|---|---|---|---|
| 002 | 2 | `2` | Carriage Control, channel 2 |
| 004 | 4 | `4` | Select Stacker and Feed, channel 2 |
| 013 | 821 | `=` | *(7010 only)* Floating Point |
| 014 | 84 | `@` | Multiply |
| 021 | A1 | `/` | Clear Storage / Clear Storage and Branch |
| 022 | A2 | `S` | Subtract |
| 023 | A21 | `T` | Table Lookup |
| 024 | A4 | `U` | Unit Control (tape) |
| 025 | A41 | `V` | Branch if WM Present, or Zone Equal |
| 026 | A42 | `W` | Branch if Bit Equal |
| 027 | A421 | `X` | Branch if Channel 2 I/O Status Indicator On |
| 030 | A8 | `Y` | *(Priority feature)* Priority Test and Branch |
| 031 | A81 | `Z` | Move Characters and Suppress Zeros |
| 032 | A82 | `‡` | record mark (data character, not an op) |
| 033 | A821 | `,` | Set Word Mark |
| 034 | A84 | `%` | Divide |
| 041 | B1 | `J` | Branch (unconditional / on indicator) |
| 042 | B2 | `K` | Select Stacker and Feed, channel 1 |
| 043 | B21 | `L` | I/O, load mode |
| 044 | B4 | `M` | I/O, move mode |
| 045 | B41 | `N` | No Operation |
| 047 | B421 | `P` | *(1412/1419 MICR feature)* channel 1 — `[likely]` |
| 050 | B8 | `Q` | *(1412/1419 MICR feature)* channel 2 — `[likely]` |
| 051 | B81 | `R` | Branch if Channel 1 I/O Status Indicator On |
| 052 | B82 | `!` | Zero and Subtract |
| 053 | B821 | `$` | *(7010 only)* Store and Restore Status |
| 061 | BA1 | `A` | Add |
| 062 | BA2 | `B` | Branch if Character Equal |
| 063 | BA21 | `C` | Compare |
| 064 | BA4 | `D` | Move / Scan |
| 065 | BA41 | `E` | Move Characters and Edit |
| 066 | BA42 | `F` | Carriage Control, channel 1 |
| 067 | BA421 | `G` | Store Address Register |
| 072 | BA82 | `?` | Zero and Add |
| 073 | BA821 | `.` | Halt / Halt and Branch |
| 074 | BA84 | `⌑` (lozenge, card 12-8-4) | Clear Word Mark |
| 077 | BA8421 | `⧧` | group mark (with WM = GM-WM terminator) |

Two op-code characters were previously known only from SimH constants and are now confirmed in primary text-layer sources `[verified]`:
- **Set Word Mark = comma**: 223-2588-2 p.16 op-code-lengths chart row `, (A)(B)  Set Word Mark  6  11*`; 223-2589 p.53 row `,(A)(B) Set Word Mark  1  6  11`.
- **Clear Word Mark = lozenge (BA84)**: A22-0526-3 alphabetic appendix row `Clear Word Mark (Two Addresses)  CW a,b  ⌑(A)(B)`; 223-2589 op-code chart.

> There is **no apostrophe op code** on the 1410. A22-0530-1 Figure 1's op between `/` and the lozenge is Set Word Mark, i.e. the comma; readings of an apostrophe there are an OCR artifact. `[verified]`

> **Autocoder-vs-machine mnemonic collision**: Autocoder mnemonic `M` = Multiply but machine op-code character `M` = move-mode I/O; Autocoder `D` = Divide but machine `D` = Move. `[verified]`

---

## 2. Complete instruction table

Parts A (data movement, arithmetic, compare, edit, word-mark/storage) and B (branch, I/O, console, status, feature) merged into one table, **sorted by op-code character in BCD collating order** (the machine's own order; octal value ascending). Feature-dependent and 7010-only ops are marked in the Op column and detailed in §9.

Register column format is `IAR / AAR / BAR`. Sources are A22-0526-3 unless noted; lengths cross-checked against 223-2589 p.53 and 223-2588-2 pp.16-17.

| Op char (oct) | Autocoder | Lengths | d-modifiers | Semantics | Indicators | Terminates on | IAR / AAR / BAR after | Timing (µs) | Cite |
|---|---|---|---|---|---|---|---|---|---|
| `2` (002) | CC2 | 2 | see §6 carriage table | Carriage Control, channel 2. Numeric part of d = channel number or space count; zone part = mode | not ready, busy only | n/a | NSI / Ap / Bp | `13.5` | p.80-81 |
| `4` (004) | SSF2 | 2 | `0` `1` `2` | Select Stacker and Feed, channel 2 | not ready, busy, no transfer | n/a | NSI / Ap / Bp | `13.5 + I/O` | p.62-63 |
| `=` (013) | *(7010 only)* | — | — | Floating point against the FP register at 280-299. **Not a 1410 instruction.** Does not collide with any 1410 op char | exponent overflow / underflow | n/a | BAR forced to 299 | — | SimH |
| `@` (014) | M | 1, 6, 11 | none | **Multiply.** A = multiplicand at its **units** position. B = product field at its **units** position, with the multiplier image pre-placed in the **high-order** positions of B. `len(B) = digits(multiplicand) + digits(multiplier) + 1`. First scan zeros product positions right of the multiplier; repetitive true-add (multiplier digit 1-4) or tens-complement complement-add + shift + true-add (5-9); multiplier image is destroyed | **zero balance only** — multiply never sets arithmetic overflow | word marks over high-order multiplicand and over high-order multiplier image in B; ends when the multiplier image is exhausted | NSI / A−LA / B−LB | `≈4.5[L+1+E+2.5M+(2.5M+1.5)(2.5A+3)]` | p.19-20 |
| `/` (021) | CS | 1, 6 | none | **Clear Storage.** Clears data **and** word marks right-to-left from the B address down to and including the nearest hundreds position. `/ 12590` clears 12590-12500. Chained form uses current BAR; AAR is not loaded and is undisturbed | none | the hundreds boundary (address ending `00`) | NSI / B / `bbb00`−1 | `4.5(L+1+B)` | p.23 |
| `/` (021) | CS | 11 | none | **Clear Storage and Branch** (`/ iiiii bbbbb`). Same clearing action, then unconditional branch to the I-address | none | the hundreds boundary | NSIB / BI / NSIB | `4.5(L+2+B)` | p.23 |
| `S` (022) | S | 1, 11 | none | **Subtract (two fields).** A subtracted from B, remainder in B, right-to-left from units. A-field sign is inverted first, then the add-cycle table (§4.3) applies. Same zone/word-mark rules as Add | arithmetic overflow; zero balance | B-field word mark (required); A-field WM needed only if A is shorter than B | NSI / A−LW / B−LB | `4.5(L+1+E+A+1.5B+1.5RB)`; E=1 at L=1, E=0 at L=11 | p.17 |
| `S` (022) | S | 6 | none | **Subtract (one field)** — address-double: A field subtracted from itself, leaving a zeroed result in A. Zone bits and sign configuration unchanged (example: A-field `ABQ` becomes `??!`) | zero balance | A-field word mark | NSI / A−LA / A−LA | `4.5(L+1+A+1.5A)` (see §1.4 caveat) | p.18 |
| `T` (023) | LL LE LLE LH LLH LEH | 1, 6, 12 | `1`=lower, `2`=equal, `3`=equal or lower, `4`=higher, `5`=lower or higher (unequal), `6`=equal or higher, `7`=stop on any, blank=search to end of table | **Table Lookup.** Searches **right-to-left** through the table for a table argument satisfying d. A = rightmost position of the search argument; B = rightmost character of the whole table. Each table field is an implicit B field: argument rightmost, function leftmost. At the start of each search cycle the **C-address register** receives the A-address and, on a miss, replaces it in AAR so the search restarts one position left of the table field's word mark | high / equal / low / unequal, from the last argument comparison | A-field word mark ends each argument comparison; the search ends on a hit, or on a table field **shorter** than the search argument (which sets HIGH) | NSI / A−LW / address of the function immediately left of the stopping table argument | `4.5(L+1+B+NA)` | p.29-30 |
| `U` (024) | BSP SKP RWD RWU WTM | **5** (`U x1x2x3 d`) | `B` backspace, `A` move one record (CE), `R` rewind, `U` rewind+unload, `E` erase forward, `M` write tape mark | **Unit Control** (tape). Backspace moves over one complete record (a tape mark counts as a record) and does **not** interlock the 1410; write tape mark writes a single-character record and **does** interlock. Erase forward blanks ~3.5 in. before the next write and is cancelled by a read or backspace. Only write-tape-mark can be overlapped | channel status | one record (backspace); tape mark = 1-char record | NSI / Ap / Bp | `.0045(L+1) + Tm` ms | p.85-86, Fig 97 |
| `V` (025) | BW BZN BWZ | 1, 6, 12 | `1 2 3 B K S C L T` — see §6 | **Branch if Word Mark Present, or Zone Equal.** d bit 1 enables the word-mark test; d bit 2 enables the zone test, which compares the **B and A bits only** of the B-address character against the B and A bits of d. Both bits set = branch on either condition. Always a one-character test; no B-field word mark needed. Length 6 chains the B-address and reuses the previous modifier | none | one character | taken: NSIB / BI / NSIB · not taken: NSI / BI / **B−1** | `4.5(L+2.5+C)` | p.38-39, Fig 37 |
| `W` (026) | BBE | 1, 6, 12 | bit mask | **Branch if Bit Equal.** Branches if **any** bit of the B-address character matches **any** bit of d. Word-mark and C (parity) bits are not compared and word marks cannot be tested | none | one character | taken: NSIB / BI / NSIB · not taken: NSI / BI / **B−1** | `4.5(L+2.5+C)` | p.37-38 |
| `X` (027) | BNR2 BCB2 BER2 BEF2 BWL2 BNT2 BEX2 BA2 | **7 only** | bit-coded, §6 | **Branch if Channel 2 I/O Status Indicator On.** Also releases the channel 2 I/O interlock — unconditionally if d = group mark, otherwise only if the branch is actually taken | does **not** reset the status indicators; they reset at the next I/O read-out | n/a | taken: NSIB / BI / NSIB · not taken: NSI / BI / BI | `4.5(L+1+C)` | p.36-37, Fig 36 |
| `Y` (030) | *(Priority feature)* BUPR1/2 BOPR1/2 BIPR1/2 BQPR1/2 BSPR1/2 BXPR1/2 BEPA BXPA | 7 (interruptible), 1 (non-interruptible) | `U F 1 2 Q * N ‡ S T A B E X` — see §9.1 | **Priority Test and Branch.** Tests (and usually resets) one of six per-channel priority request indicators; `E`/`X` are unconditional branch-and-enter / branch-and-exit priority alert mode | priority request indicators; an interrupt forces a branch to **00101** and drops priority alert mode | n/a | taken: NSIB / BI / NSIB. Return address = BAR **minus six** | **not stated in A22-0530-1** `[unverified]` | A22-0530-1 pp.4-8 |
| `Z` (031) | MCS | 1, 6, 11 | none | **Move Characters and Suppress Zeros.** Moves A to B (A unchanged), then blanks high-order zeros and commas in B and strips the zone bits from the units (sign) position of B. Alphabetic and most special characters (e.g. `@`) count as non-significant, so suppression can restart to their right | none | A-field word mark defines the length moved; B-field word marks **inside the moved area, including its leftmost position, are removed** | NSI / A−LA / **B+1** | `4.5(L+1+4A)` | p.27-28, Figs 23-24 |
| `,` (033) | SW | 1, 6, 11 | none | **Set Word Mark** at the A and B locations, or at A only, or (chained) at the addresses currently in AAR/BAR. Data characters undisturbed | none | fixed — one or two positions | 2 addr: NSI / A−1 / B−1 · 1 addr: NSI / A−1 / A−1 · chained: NSI / Ap−1 / Bp−1 | `4.5(L+4)` | p.22 |
| `%` (034) | D | 1, 6, 11 | none | **Divide.** A = **units** position of the divisor. B = **leftmost position of the DIVIDEND**, which sits `len(divisor)+1` positions in from the left end of the quotient/dividend field (see §4.6). `len(B) = digits(divisor) + digits(dividend) + 1`. Quotient positions must be pre-zeroed and the **dividend** must carry a sign (BA plus / B minus) — the sign stops the division. Divisor may be unsigned (assumed positive). Repeated complement-add with true-add correction and shift; quotient left, remainder right | **divide overflow only** — divide never sets arithmetic overflow or zero balance | word mark over the leftmost position of the **divisor**; the division is stopped by the **sign** in the units position of the dividend. A B-field word mark left by a preceding ZA is ignored but retained | NSI / A−LA / tens position of the quotient field | `≈4.5{L+1+E+6.5Q[A+1.5(A+2)]}` | p.20-21 |
| `J` (041) | B | 1, 7 | blank | **Branch Unconditionally** to the I-address. The blank d-character position must be present | none | n/a | NSIB / BI / NSIB | `4.5(L+2)` | p.36 |
| `J` (041) | BAV BZ BE BH BL BU BDV BNQ BC9 BCV BPCB BOL1 BOL2 … | 1, 7 | see §6 J-table | **Branch Conditionally (one address).** Test one internal indicator; branch to the I-address if on | the overflow indicators are **reset by the test that reads them** | n/a | taken: NSIB / BI / NSIB · not taken: NSI / BI / **BI** (both A and B registers hold the branch-to address) | `4.5(L+1+C)` | p.36, Fig 35 |
| `K` (042) | SSF1 | 2 | `0` `1` `2` | **Select Stacker and Feed**, channel 1. Used after a Read a Card that had `9` in x3; sends the already-read card to pocket NR / 1 / 8-2 and feeds the next card | not ready, busy, **no transfer**; data check, condition and WLR are never set | n/a | NSI / Ap / Bp | `13.5 + I/O` | p.62-63, Fig 62 |
| `L` (043) | RW# PW# WW# RTW WTW RCPW WCPW … | 10 | `R` `W` `$` `X` (+ `Q` `V` with Priority) | **I/O, load mode.** Input: a single incoming word separator becomes a word mark over the **next** incoming character (the record shortens by one); two consecutive separators become one stored separator. Output: each core word mark becomes a word separator written one position **ahead** of its character; a stored separator becomes two on output | six channel status indicators | group-mark-with-word-mark in core; tape read also on inter-record gap; `$`/`X` only at the highest-numbered core position | NSI / Ap / **B + LB + 1** | card/print/console `49.5 + I/O`; tape `.0045(L+1) + Tm` ms | p.40-41; Autocoder names Fig 107 pp.104-105 · C28-0309-1 pp.47-49 |
| `M` (044) | R# P# W# WM# RT RTB WT WTB RCP WCP SD … | 10 | `R` `W` `$` `X` (+ `Q` `V`) | **I/O, move mode.** Word separators pass through unchanged in both directions; core word marks are **not** sent to the medium | six channel status indicators | as `L` | NSI / Ap / **B + LB + 1** | as `L` | p.40-41, 62-63, 80, 86-87, 46-47; Autocoder names Fig 107 pp.104-105 · C28-0309-1 pp.47-49 |
| `N` (045) | NOP | any (1, 2, 3, …) | ignored | **No Operation.** Written over any instruction's op code to make that whole instruction ineffective; the remaining characters are skipped. Word marks unaffected | none | the word mark on the next instruction's op code | NSI / Ap / Bp | `4.5(L+1)` | p.24 |
| `P` (047) | *(1412/1419 MICR)* ECR1 DCR1 SS1 | 2 | `E` engage, `D` disengage, `R` stacker select | MICR short-form control, channel 1 `[likely]` | MICR channel indicators | n/a | NSI / Ap / Bp `[unverified]` | — | C28-0309-1 |
| `Q` (050) | *(1412/1419 MICR)* ECR2 DCR2 SS2 | 2 | `E` engage, `D` disengage, `3` stacker select | MICR short-form control, channel 2 `[likely]` | MICR channel indicators | n/a | NSI / Ap / Bp `[unverified]` | — | C28-0309-1 |
| `R` (051) | BNR1 BCB1 BER1 BEF1 BWL1 BNT1 BEX1 BA1 | **7 only** | bit-coded, §6 | **Branch if Channel 1 I/O Status Indicator On.** Also releases the channel 1 I/O interlock — unconditionally if d = group mark, otherwise only if the branch is taken. Also the instruction that resets the channel 1 **overlap** priority request indicator | does not reset the status indicators | n/a | taken: NSIB / BI / NSIB · not taken: NSI / BI / BI | `4.5(L+1+C)` | p.36-37, Fig 36 |
| `!` (052) | ZS | 1, 11 | none | **Zero and Subtract (two fields).** Numeric A stored into B with the **opposite** sign (see §4.4 sign map); zone bits stripped from all B positions except the sign. Short A zero-fills high-order B up to and including its word mark | **zero balance only** | B-field word mark | NSI / A−LW / B−LB | `4.5(L+1+E+A+1.5B)` | p.18 |
| `!` (052) | ZS | 6 | none | **Zero and Subtract (one field)** — address-double: zones stripped except the sign, numeric data unchanged, sign polarity reversed (minus→plus becomes BA) | zero balance | A-field word mark | NSI / A−LA / A−LA | `4.5(L+1+A+1.5A)` | p.19 |
| `$` (053) | *(7010 only)* | `$ bbbbb d` | `S R E F 1 2` | **Store and Restore Status** — 7010 only, **not a 1410 instruction.** See §9.3 | packs the compare/zero/overflow/divide-overflow indicators into one character | 1 character at the B-address | — | — | A22-6726 p.33 |
| `A` (061) | A | 1, 11 | none | **Add (two fields).** Algebraic add of A into B, right-to-left from units. Sum in B. B zone bits unchanged except the sign; A zone bits ignored except the sign. Short A zero-fills high-order B up to and including the B word mark; A positions beyond the B word mark are not processed | **arithmetic overflow**; zero balance | B-field word mark (required); A-field WM needed only if A is shorter than B | NSI / A−LW / B−LB | `4.5(L+1+E+A+1.5B+1.5RB)`; E=1 at L=1, E=0 at L=11 | p.17 |
| `A` (061) | A | 6 | none | **Add (one field)** — address-double: the A field is image-added to itself (doubled) in place. Zones and sign configuration unchanged | zero balance; arithmetic overflow | A-field word mark | NSI / A−LA / A−LA | `4.5(L+1+A+1.5A)` (see §1.4 caveat) | p.17-18 |
| `B` (062) | BCE | 1, 6, 12 | any character | **Branch if Character Equal.** The BA8421 bits of the character at the B-address are compared with d; exactly equal causes the branch. Also sets the high/low/equal compare latches (high if the B character collates above d). Word marks do not affect it — always a one-character test. Length 6 chains the B-address and reuses the previous modifier | sets high / equal / low / unequal (shared with Compare and Table Lookup) | one character | taken: NSIB / BI / NSIB · not taken: NSI / BI / **B−1** | `4.5(L+2.5+C)` | p.37 |
| `C` (063) | C | 1, 6, 11 | none | **Compare** B to A, never A to B, right-to-left. All BA8421 bits compared; the C (check) bit and word marks are not. Neither field is modified | high (B>A) / equal / low (B<A) / unequal | **either** an A-field or a B-field word mark. If the A field is shorter than the B field it **must** have a word mark, and that case turns HIGH on. If B is shorter than or equal to A the indicators are set correctly for the portion compared | NSI / A−LW / B−LW | `4.5(L+1+A+B)` | p.28; short-A WM requirement from 223-2588-2 |
| `D` (064) | 64 mnemonics `M{L,R}{N,Z,C,W,NW,ZW,CW}{S,A,B,␣,R,G,M}` and `SCN{L,R}{…}` | 1, 6, 12 | **all 64 valid** — see §3 | **Move / Scan.** Bit 1 = move numeric portion, bit 2 = move zone portion, bit 4 = move word mark; none of 1/2/4 = **scan only** (registers stepped, no data transferred). Bit 8 set = **left-to-right** (addresses are the leftmost positions); bit 8 clear = **right-to-left** (addresses are the rightmost positions). Only the selected portion of each A character replaces the corresponding portion of the B character; the rest of the B character is unchanged. The terminating position is itself moved/replaced. Length 6 chains the B-address and reuses the previous modifier | none | per d: first WM in either field / A-field WM / B-field WM / one position / A-field record mark / A-field GM-WM / A-field RM or GM-WM | NSI / see §3.2 | `4.5(L+1+A+1.5B)` | p.25-27, Figs 19-22 |
| `E` (065) | MCE | 1, 6, 11 | none | **Move Characters and Edit.** The A field (data) is edited under control of the B field (edit control word) and the result left in B. The two fields are read alternately, character by character. Any sign in the units position of the data is removed from the character moved into B (the A field itself is never written). One to three scans — see §7 | none | a word mark in the **high-order** position of B controls the operation (and is removed on scan 1); the **A-field** word mark ends the body. Remaining commas in B are blanked while the extension latch is set. The B-field word mark hard-stops the forward scan: any A data not yet moved is dropped | NSI / A−LA / **varies — see §7.3** | `4.5(L+1+A+1.5B+1.5Z+1.5D)` | p.31-33, Figs 27-34 |
| `F` (066) | CC1 | 2 | see §6 carriage table | **Carriage Control**, channel 1. Numeric (8421) part of d = channel number or space count; zone part = mode (no zone = immediate skip, BA = skip after print, B = immediate space, A = space after print). A skip to a channel the tape is already at moves to the **next** punch of that channel | not ready, busy only; data check, condition, WLR and no transfer are never set | n/a | NSI / Ap / Bp | `13.5` | p.80-81, Figs 90-91 |
| `G` (067) | SAR SBR SER SFR | 7 (`G ccccc d`) | `A` AAR, `B` BAR, `E` E-reg, `F` F-reg; `T` = clock *(feature)* | **Store Address Register.** Stores the named register's 5 characters into the C field; the C-address is the **rightmost** position of the destination. Uses the C-address register, so **AAR is not disturbed**. Cannot be indexed. Word marks in the C field have no effect; zones in the C field are not disturbed. E and F hold tape addresses in overlap mode. `G ccccc B` after a taken branch is the 1410's subroutine-return mechanism | none | fixed 5-character store | NSI / Ap / Bp | `T = 69.75` | p.22 |
| `?` (072) | ZA | 1, 11 | none | **Zero and Add (two fields).** Numeric data of A stored into B with A's sign; zone bits stripped from all B positions except the sign; a plus sign not already B+A is rewritten as B+A. Short A zero-fills high-order B up to and including its word mark | **zero balance only** | B-field word mark | NSI / A−LW / B−LB | `4.5(L+1+E+A+1.5B)` | p.18 |
| `?` (072) | ZA | 6 | none | **Zero and Add (one field)** — address-double: strips zones from all A positions except the sign, sign polarity kept (plus normalised to BA), numeric data unchanged. Also normalises blank / 8-3 / 8-4 etc. to their numeric equivalents | zero balance | A-field word mark | NSI / A−LA / A−LA | `4.5(L+1+A+1.5A)` | p.18 |
| `.` (073) | H | 1 | none | **Halt.** System stops; START resumes with the next sequential instruction. If it is the last instruction in the program a word mark must be preset in the position immediately to its right | none | n/a | NSI / Ap / Bp | `T = 4.5` | p.23 |
| `.` (073) | H | 6 (`. iiiii`) | none | **Halt and Branch.** System stops; START resumes at the I-address (unconditional branch). The last-instruction word-mark rule applies here too | none | n/a | NSIB / BI / NSIB | `T = 36` | p.23 |
| `⌑` (074) | CW | 1, 6, 11 | none | **Clear Word Mark.** Same three forms and same register results as Set Word Mark; clears the word mark if present, data undisturbed | none | fixed — one or two positions | 2 addr: NSI / A−1 / B−1 · 1 addr: NSI / A−1 / A−1 · chained: NSI / Ap−1 / Bp−1 | `4.5(L+4)` | p.22 |

> **The `L` / `M` I/O mnemonic split, and one correction to row 207 (2026-08-31).** Figure 107, the appendix's alphabetic Autocoder list, gives each I/O family **one** row whose mnemonic carries generative suffixes and whose op cell reads **"M or L"**: `R(#)w° 0,b` -> `M or L x¹10 (B) R`, `P(#)w° 0,b` -> `M or L x¹40 (B) W`, `RCPw° b`, `RTw° cu,b` likewise. Its own legend: `#` = 1 or 2 for Ch, `(#)` = the same but the 1 may be omitted, **`w` = W if WM (load mode)**, `°` = O if overlap. So the `W` is what selects `L`; without it the op is `M`. Splitting those combined rows into this table's separate `L` and `M` rows is what put **`RW#` under `M` as well as `L`** — a transcription artifact, now removed from row 207. `[verified]` (A22-0526-3 Fig 107 pp.104-105, and C28-0309-1 pp.47-49, which lists the families expanded: `R`/`R1`/`R2` and `RO`/`R1O`/`R2O` on `M`, `RW`/`R1W`/`R2W` and `RWO`/`R1WO`/`R2WO` on `L`, with no RW-family form on `M` anywhere.)

> **`WM#` is not an exception to that rule and stays on row 207.** Figure 107 lists **Write Word Marks As 1's** as `WM(#)° b` -> **`M x¹21 (B) W`** — no `w` suffix, and no `L` alternative, unlike the `W(#)w°` printer row directly above it. `WM` is a distinct printer function selected by **x³ = 1** (print the word marks) rather than a load-mode variant of `W` (**x³ = 0**), which is why it is `M`-only. Both are the 1403 at **x² = 2** — Figure 107 p.105's field diagram reads `M or L x¹x²x³ (B) x`, with x² "Type of I/O Unit" (`1` 1402 reader, `2` 1403 printer, `4` 1402 punch, `T` console) and x³ "I/O Unit No. or Specific Operation" — which is exactly why the two fields print as `%21` and `%20` and differ only in their last position. (Corrected 2026-08-31: this paragraph said x2 = 1 against x2 = 0. The ruling was right; the position name was wrong.) `[verified]` (A22-0526-3 p.80 and Fig 107 p.105; C28-0309-1 p.47 `WM B WRITE WORDMARKS - CHANNEL 1  M %21 34567 W`, with `WM1`/`WM2` and overlapped `WMO` the same.)

> **Both rows' Autocoder cells are an editorial rendering, not a quotation — and the assembler no longer renders them that way.** The cells flatten Figure 107's `R(#)w°` notation to a `#`-suffix form where the manual **infixes** the channel digit (`R1W`, `R2W`, and per Fig 107's own example `P(#)w° 0,b` "is written as **P2WO** 0,b"). `WM(#)°` is the one family the suffix form renders faithfully. **Settled 2026-08-31, in code and not in this table**: `src/asm/mnemonics.ts` now generates the manual's spelling — `R R1 R2 RW R1W R2W RO R1O R2O RWO R1WO R2WO`, and `WM WM1 WM2 WMO WM1O WM2O` for the one suffixing family — off C28-0309-1 pp.47-48's expanded listing and A22-0526-3 p.62 ("RW or R1W (Ch 1) / R2W (Ch 2)"). The cells here stay as they are because they are the **family** names, `table.ts` mirrors them row for row, and every generated row carries the cell's string as its `sourceName` — which is what `test/asm-mnemonics.test.ts`'s containment reads. The operand convention went with the spelling: `IO_OPERAND_IS_XCONTROL_BADDR_D` is **retired**, settled against, and a source deck now writes `R1W 0,LINE,$` and `W1 LINE`. This was never what row 207's correction was about; it is a fourth, separate finding from the same pages.

### 2.1 Negative results — instructions the 1410 does **not** have

- **No Load instruction.** The 1401's "Load Characters to A/B word mark" is expressed as `D` with the word-mark bit set (`MLCWA` / `MLCWB`). On the 1410, op-code characters `L` and `M` are the I/O read/write instructions. `[verified]` (A22-0526-3 appendix pp.101-105 complete alphabetic list; both CE op-code charts)
- **No Move-and-Insert-Zeros, no Translate/Convert.** `[verified]` (same negative sweep, done independently twice)
- **No branch-and-link.** Subroutine linkage is BAR = NSIB after a taken branch, stored with `G ccccc B` into the I-address of a trailing `J iiiii ␣`. `[verified]` (p.12, p.22)
- **No sense-switch branch in native mode.** Sense switches A-G exist only in **1401 mode** under the 1401 Compatibility feature. `[verified]`
- **No storage-protection instruction, no store/restore-status instruction.** A22-0530-1 Figure 1 enumerates the complete 1410 op-code set for interruptibility purposes — `? ! A S @ % E Z C / , ⌑ W V D B T J R X Y N M L G . U F K` — and contains no `$` and no `=`. A22-0530-1 p.7 makes saving and restoring the arithmetic/logic indicators around a priority routine the **programmer's** job. `[verified]`

### 2.2 Interruptibility (Priority feature)

A22-0530-1 Figure 1 marks, per op code, the instruction length at which it is interruptible `[verified]`:

- Interruptible at length **11**: `?` `!` `A` `S` `@` `%` `E` `Z` `C` `/` `,` `⌑`
- Interruptible at length **12**: `W` `V` `D` `B` `T`
- Interruptible at length **7**: `J` `R` `X`
- Non-interruptible: arithmetic/logic at length 1 or 6; `J` at 1; `Y` at 1 or 7; `N` any; `M` and `L` at 10; `G` at 7; `.` at 1 or 6; `U`; `F`; `K`

> The interruptible-column length values for the arithmetic ops are **unconfirmed** — 11 is the right instruction length for those ops, but that column is blank in both OCR passes of A22-0530-1 Figure 1. `[likely]`

---

## 3. Move / Scan (op `D`) — complete 64 d-character matrix

### 3.1 Encoding

**Bits 4 / 2 / 1 select the portion moved:** `1` = numeric portion, `2` = zone portion, `4` = word mark (A→B). None of 4/2/1 set = **scan** — address registers are stepped, no data is transferred.

**Bits B / A / 8 select direction and terminator:**

| Bits | Direction | Terminator |
|---|---|---|
| — (no B, no A, no 8) | right-to-left | after **one** storage position |
| A | right-to-left | A-field word mark |
| B | right-to-left | B-field word mark |
| B A | right-to-left | first word mark sensed in **either** field |
| 8 | left-to-right | first word mark sensed in **either** field |
| A 8 | left-to-right | A-field **record mark** |
| B 8 | left-to-right | A-field **group-mark-with-word-mark** |
| B A 8 | left-to-right | A-field record mark **or** GM-WM |

A22-0526-3 Figure 19 p.25, cross-checked against 223-2588-2 p.23 and SimH `i7010_cpu.c` `case OP_MOV` (switch on `op_mod & 070`) `[verified]`.

**Addressing follows direction**: for a left-to-right move the A- and B-addresses are the **leftmost** positions of their fields; for right-to-left they are the **rightmost**. Only the selected portion of the A character replaces the corresponding portion of the B character; the rest of the B character is untouched. The position holding the terminating character is moved/replaced like every other position. A22-0526-3 pp.25-26 `[verified]`.

**Mnemonic construction** (A22-0526-3 Figure 21, p.26) `[verified]` — note the direction letters are counter-intuitive but correct:

`M` + direction (`L` = right-to-**L**eft, `R` = left-to-**R**ight) + portion (`N` numeric, `Z` zone, `C` character = zone+numeric, `W` word mark, or the pairs `NW`/`ZW`/`CW`) + terminator (`A` = A-field WM, `B` = B-field WM, blank = first WM either field, `S` = one position, `R` = A-field record mark, `G` = A-field GM-WM, `M` = A-field RM or GM-WM). Scan mnemonics are `SCN` + direction + terminator.

### 3.2 The 64 d-characters

| Bits (B A 8 4 2 1) | Dec | Glyph | Mnemonic | Direction | Portion | Terminates on |
|---|---|---|---|---|---|---|
| — | 0 | true blank (`000000`, octal 00 — the ASCII space) | SCNLS | R→L | scan | after one position |
| 1 | 1 | `1` | MLNS | R→L | numeric | after one position |
| 2 | 2 | `2` | MLZS | R→L | zone | after one position |
| 2 1 | 3 | `3` | MLCS | R→L | zone+numeric | after one position |
| 4 | 4 | `4` | MLWS | R→L | word mark | after one position |
| 4 1 | 5 | `5` | MLNWS | R→L | numeric+WM | after one position |
| 4 2 | 6 | `6` | MLZWS | R→L | zone+WM | after one position |
| 4 2 1 | 7 | `7` | MLCWS | R→L | all | after one position |
| 8 | 8 | `8` | SCNR | L→R | scan | first WM in either field |
| 8 1 | 9 | `9` | MRN | L→R | numeric | first WM in either field |
| 8 2 | 10 | `0` | MRZ | L→R | zone | first WM in either field |
| 8 2 1 | 11 | `#` | MRC | L→R | zone+numeric | first WM in either field |
| 8 4 | 12 | `@` | MRW | L→R | word mark | first WM in either field |
| 8 4 1 | 13 | `:` | MRNW | L→R | numeric+WM | first WM in either field |
| 8 4 2 | 14 | `>` | MRZW | L→R | zone+WM | first WM in either field |
| 8 4 2 1 | 15 | `√` (tape mark) | MRCW | L→R | all | first WM in either field |
| A | 16 | **substitute blank** | SCNLA | R→L | scan | A-field word mark |
| A 1 | 17 | `/` | MLNA | R→L | numeric | A-field word mark |
| A 2 | 18 | `S` | MLZA | R→L | zone | A-field word mark |
| A 2 1 | 19 | `T` | MLCA | R→L | zone+numeric | A-field word mark |
| A 4 | 20 | `U` | MLWA | R→L | word mark | A-field word mark |
| A 4 1 | 21 | `V` | MLNWA | R→L | numeric+WM | A-field word mark |
| A 4 2 | 22 | `W` | MLZWA | R→L | zone+WM | A-field word mark |
| A 4 2 1 | 23 | `X` | MLCWA | R→L | all | A-field word mark |
| A 8 | 24 | `Y` | SCNRR | L→R | scan | A-field record mark |
| A 8 1 | 25 | `Z` | MRNR | L→R | numeric | A-field record mark |
| A 8 2 | 26 | `‡` (record mark) | MRZR | L→R | zone | A-field record mark |
| A 8 2 1 | 27 | `,` | MRCR | L→R | zone+numeric | A-field record mark |
| A 8 4 | 28 | `%` | MRWR | L→R | word mark | A-field record mark |
| A 8 4 1 | 29 | word separator | MRNWR | L→R | numeric+WM | A-field record mark |
| A 8 4 2 | 30 | `\` | MRZWR | L→R | zone+WM | A-field record mark |
| A 8 4 2 1 | 31 | segment mark | MRCWR | L→R | all | A-field record mark |
| B | 32 | `-` | SCNLB | R→L | scan | B-field word mark |
| B 1 | 33 | `J` | MLNB | R→L | numeric | B-field word mark |
| B 2 | 34 | `K` | MLZB | R→L | zone | B-field word mark |
| B 2 1 | 35 | `L` | MLCB | R→L | zone+numeric | B-field word mark |
| B 4 | 36 | `M` | MLWB | R→L | word mark | B-field word mark |
| B 4 1 | 37 | `N` | MLNWB | R→L | numeric+WM | B-field word mark |
| B 4 2 | 38 | `O` | MLZWB | R→L | zone+WM | B-field word mark |
| B 4 2 1 | 39 | `P` | MLCWB | R→L | all | B-field word mark |
| B 8 | 40 | `Q` | SCNRG | L→R | scan | A-field GM-WM |
| B 8 1 | 41 | `R` | MRNG | L→R | numeric | A-field GM-WM |
| B 8 2 | 42 | `!` | MRZG | L→R | zone | A-field GM-WM |
| B 8 2 1 | 43 | `$` | MRCG | L→R | zone+numeric | A-field GM-WM |
| B 8 4 | 44 | `*` | MRWG | L→R | word mark | A-field GM-WM |
| B 8 4 1 | 45 | `]` | MRNWG | L→R | numeric+WM | A-field GM-WM |
| B 8 4 2 | 46 | `;` | MRZWG | L→R | zone+WM | A-field GM-WM |
| B 8 4 2 1 | 47 | `Δ` | MRCWG | L→R | all | A-field GM-WM |
| B A | 48 | `&` | SCNL | R→L | scan | first WM in either field |
| B A 1 | 49 | `A` | MLN | R→L | numeric | first WM in either field |
| B A 2 | 50 | `B` | MLZ | R→L | zone | first WM in either field |
| B A 2 1 | 51 | `C` | MLC | R→L | zone+numeric | first WM in either field |
| B A 4 | 52 | `D` | MLW | R→L | word mark | first WM in either field |
| B A 4 1 | 53 | `E` | MLNW | R→L | numeric+WM | first WM in either field |
| B A 4 2 | 54 | `F` | MLZW | R→L | zone+WM | first WM in either field |
| B A 4 2 1 | 55 | `G` | MLCW | R→L | all | first WM in either field |
| B A 8 | 56 | `H` | SCNRM | L→R | scan | A-field RM or GM-WM |
| B A 8 1 | 57 | `I` | MRNM | L→R | numeric | A-field RM or GM-WM |
| B A 8 2 | 58 | `?` | MRZM | L→R | zone | A-field RM or GM-WM |
| B A 8 2 1 | 59 | `.` | MRCM | L→R | zone+numeric | A-field RM or GM-WM |
| B A 8 4 | 60 | `⌑` (lozenge) | MRWM | L→R | word mark | A-field RM or GM-WM |
| B A 8 4 1 | 61 | `[` | MRNWM | L→R | numeric+WM | A-field RM or GM-WM |
| B A 8 4 2 | 62 | `<` | MRZWM | L→R | zone+WM | A-field RM or GM-WM |
| B A 8 4 2 1 | 63 | `⧧` (group mark) | MRCWM | L→R | all | A-field RM or GM-WM |

> BCD 16 / octal 20 (A bit only) is the **substitute blank**, a distinct 1410 graphic named in A22-0526-3 **Figure 4 "Symbol Names", p.7** (rendered as a struck `b`, `ƀ`, listed one line below plain `b` Blank), carried in the Figure 22 move matrix and in the appendix rows `Scan Left Single Position  SCNLS a,b  D (A)(B) blank` (true blank, octal 00) versus `Scan Left thru 1st A-Field wm  SCNLA a,b  D (A)(B) ƀ` (substitute blank, octal 20) — the two appear on adjacent lines, which is what makes the distinction unambiguous. Corroborated by SimH `CHR_BLANK 020` (A bit only) being distinct from `CHR_ABLANK 000`. **An assembler must not emit an ASCII space for SCNLA or for BNT1/BNT2.** `[verified]`

### 3.3 Move — address registers after operation (A22-0526-3 Figure 20, p.26) `[verified]`

| Terminating control | Direction | IAR | AAR | BAR |
|---|---|---|---|---|
| First word mark in either field | L→R | NSI | A + LW | B + LW |
| A-field record mark | L→R | NSI | A + LA | B + LA |
| A-field group-mark-with-word-mark | L→R | NSI | A + LA | B + LA |
| A-field record mark **or** GM-WM | L→R | NSI | A + LA | B + LA |
| After one storage position | R→L | NSI | A − 1 | B − 1 |
| A-field word mark | R→L | NSI | A − LA | B − LA |
| B-field word mark | R→L | NSI | A − LB | B − LB |
| First word mark in either field | R→L | NSI | A − LW | B − LW |

> SimH's 7010 accepts `D` and `T` in lengths 1, 2, 6, 7, 11 and 12. The 1410 documents **1, 6, 12 only**. Treat 2/7/11 as 7010 latitude, not 1410 behaviour. `[verified]`

---

## 4. Per-op notes — arithmetic

### 4.1 Sign convention

The sign of a field is the **zone bits of its units position**. A22-0526-3 Figure 11 and text, p.16 `[verified]`:

| Sign | BCD bits | Card zone |
|---|---|---|
| Plus | no B, no A | none |
| Plus | B and A | 12 |
| **Minus** | **B only** | 11 |
| Plus | A only | 0 |

Minus is **always** a B bit. When the machine develops or changes a sign, plus is **always** written as B+A and minus as a B bit alone. Testing a result's sign is therefore done with `V (I) (B) K` (branch if zone equal B): no branch ⇒ the sign is BA, A, or none — all positive.

### 4.2 Digit coding in arithmetic (A22-0526-3 p.16) `[verified]`

Characters whose numeric bits total 0-9 (all numerals, all letters, `/ ? !` and the group mark) participate normally. All others are coerced: **blank becomes zero** (8 and 2 bits), and characters whose numeric bits sum above 9 have the **8 bit dropped**. Examples: the group mark (CBA8421) added to zero becomes `G` (BA421) if zones are retained, or `7` (421) if zones are stripped; `#` (821) becomes `3`.

Data-validity behaviour worth modelling as machine checks: "The BCD characters to be added are checked for valid BCD coding, and an invalid bit combination causes an A or B channel error. The characters are then translated to qui-binary code and fed to the adder. The adder's output is retranslated to BCD; an invalid combination of bits at this point causes an assembly channel error." A22-0526-3 p.16 `[verified]`.

### 4.3 Add-cycle selection and result sign (A22-0526-3 Figure 12, p.16) `[verified]`

| Operation | A sign | B sign | Add cycle | Result sign |
|---|---|---|---|---|
| Add | + | + | true-add | + |
| Add | + | − | complement-add | sign of the greater value |
| Add | − | + | complement-add | sign of the greater value |
| Add | − | − | true-add | − |
| Subtract | + | + | complement-add | sign of the greater value |
| Subtract | + | − | true-add | − |
| Subtract | − | + | true-add | + |
| Subtract | − | − | complement-add | sign of the greater value |

Subtract inverts the A-field sign first, then the Add rule applies. When a complement-add underflows, a **recomplement** pass is taken; the timing term `R` is 1 when a recomplement occurs (`+1.5RB` in the formula).

### 4.4 Zero and Subtract sign map (A22-0526-3 Figure 13, p.18-19) `[verified]`

| A-field sign bits | B-field sign at end |
|---|---|
| no B, no A (plus) | B (minus) |
| B (minus) | B and A (plus) |
| B and A (plus) | B (minus) |
| A (plus) | B (minus) |

### 4.5 Multiply

- Zones in the **multiplicand** are undisturbed. Zones anywhere in the assigned **product area** are eliminated before product development. Zones in the **multiplier** are eliminated during development. `[verified]` (p.19)
- Signs of the units positions of the multiplicand and of the multiplier are sampled first: **like signs → plus product, unlike → minus**, written into the units (sign) position of B at the end. `[verified]`
- Algorithm: a multiplier digit **1-4** causes that many true-adds of the multiplicand (the digit is decremented each cycle; zero ends the group and shifts left one position). A digit **5-9** causes tens-complement complement-adds in the low-order positions followed by a left shift and a true-add starting in the tens position — so multiplier digit 8 costs three cycles, not eight. `[verified]` (p.19-20, Figure 14)
- **Multiply never sets arithmetic overflow**, even when high-order A-field digits are cut off by the B-field word mark. See §8.

### 4.6 Divide — field layout

This is the easiest thing on the machine to get wrong.

```
        |<-- quotient area -->|<-- dividend -->|
B field: [ 0 ][ 0 ][ 0 ]      [ 1  4  7  0  0 ]
          ^                    ^
          leftmost of the      B-ADDRESS of the
          quotient/dividend    DIVIDE instruction
          field                (leftmost of the DIVIDEND)
```

- `len(B) = digits(divisor) + digits(dividend) + 1`. The dividend sits in the **rightmost** positions of the quotient-dividend field; the B-address is `len(divisor) + 1` positions in from the left end, **not** the left end of the whole field. Worked example (A22-0526-3 Figure 17): divisor `12` (2 digits), dividend `14700` (5 digits) ⇒ 8-position B field holding `00014700`; the three leading zeros are the quotient area and the B-address is the `1` of `14700`. `[verified]` (A22-0526-3 pp.20-21, Figures 15-17)
- Note 1 on p.21: "it is important to address the leftmost position of the dividend (B-address of the divide instruction). This ensures that the first divide operation results in a single high-order quotient digit. An improperly addressed dividend can cause a divide overflow condition if the result of the first divide operation is greater than 9." An emulator that starts at the left end of the whole B field produces wrong quotients **and** spurious divide overflows. `[verified]`
- The quotient area must be **pre-zeroed** and the **dividend** must be signed. The recommended setup is a Zero and Add of the dividend into the B field, which supplies both the zeros and the BA/B sign; the B-field word mark that ZA leaves is ignored by Divide but retained. `[verified]`
- The **divisor may be unsigned**: "If no bits are in the units position of the divisor, the system assumes that the divisor is positive." Only the dividend must carry a sign, and it is that sign that stops the division. The dividend is destroyed except for the remainder. `[verified]` (p.20)
- Results: quotient in the leftmost positions of B — units position of quotient = (address of units of dividend) − (length of divisor) − 1. Remainder in the rightmost positions. Quotient sign by algebraic rule (+/+ → +, +/− → −, −/+ → −, −/− → +); **remainder takes the sign of the original dividend**. `[verified]` (pp.20-21, Figure 16)
- To get more quotient digits, append zeros to the **right** of the dividend — one zero per extra quotient digit. `[verified]` (p.21, Note 4, Figure 17)
- **Divide overflow**: a quotient field **one** position too small does **not** raise overflow — it silently corrupts the adjacent field. Two or more positions short usually does. **Division by zero always raises divide overflow.** A too-small quotient field is a programming error and is not checked. `[verified]` (p.21)
- Cross-check: SimH `i7010_cpu.c` `do_divide()` sets `DAR = BAR` and walks DAR rightward one position per quotient digit, complement-adding leftward from each window — consistent with the layout above. `[verified]`

---

## 5. Per-op notes — Table Lookup, Compare, MCS

### 5.1 Table Lookup (`T`)

- Search argument (A field) must have a word mark at its **leftmost** position; each table field must have a defining word mark at its leftmost position. Each table argument must be **exactly as long** as the search argument for the search to continue. `[verified]` (pp.29-30)
- The A-field word mark stops each individual argument comparison. On a miss, comparison restarts one position to the left of the table field's word mark.
- **C-address register reload**: "At the start of each search cycle, the C-address register automatically receives this address [the A-address] and, if no hit is made, replaces it in the A-address register so the search can be repeated at the next table argument to the left." An emulator must **reload AAR from a saved copy** at the start of every table-field comparison, not merely decrement it. `[verified]` (p.30)
- **End of table**: a table field **shorter** than the search argument ends the operation and turns on the **HIGH** compare indicator; BAR then holds the address of the position immediately left of that short table field. `[verified]`
- d-modifiers: `1` LL (lower), `2` LE (equal), `3` LLE (equal or lower), `4` LH (higher), `5` LLH (lower or higher = unequal), `6` LEH (equal or higher), `7` stop on any (Lookup to Any), blank = search to end of table (Lookup to End). A22-0526-3 Figure 25, p.30 `[verified]`.

### 5.2 Compare (`C`)

Compares **B to A**, never A to B. All BA8421 bits are compared; the C (check) bit and word marks are not. Neither field is changed. Terminates on **either** an A-field or a B-field word mark. If the A field is shorter than the B field it **must** carry a word mark (otherwise there is no stopping condition on that side), and that case turns the **high** indicator on — 223-2588-2 "Brief Op Code Descriptions", Comparing row: "Operation is terminated by either an A-fd or B-fd word mark. If A-fd is shorter than B-fd, A-fd must have WM. In this case Hi-ind is on." `[verified]`. If B is shorter than or equal in length to A the indicators are set correctly for the portions actually compared. `[verified]` (A22-0526-3 p.28)

Once the B=A indicator is turned **off** during an operation it cannot be turned on again for the rest of that operation. 223-2588-2 p.24 `[verified]`.

### 5.3 Move Characters and Suppress Zeros (`Z`)

The manual states the register results and the suppression rules but never says in words that the A- and B-addresses are the **units** positions and that the copy pass runs right-to-left. The documented result `AAR = A − LA` forces the reading: a **decreasing** A-address register is only consistent with a right-to-left pass; a left-to-right move leaves `A + LA` for every terminator in Figure 20. Behavioural confirmation only from SimH `i7010_cpu.c` `case OP_MSZ`, which does `DownReg(AAR)`/`DownReg(BAR)` on the copy pass, then `UpReg(BAR)` and scans forward suppressing zeros, blanks and commas, stopping suppression at a significant digit and treating `-` and `.` as pass-through. `[likely]` — no edition of the PoO, the Nov-61 Reference Manual, or the CE Handbook states it.

Implementer's reading: **right-to-left copy from the units position, then a left-to-right suppression pass over the B field**, leaving `BAR = B + 1`.

---

## 6. d-character and modifier tables

### 6.1 Branch on Indicator — op `J`, complete d-character table

A22-0526-3 p.36 Figure 35 and appendix p.101; cross-checked against 223-2588-2 p.20 and SimH `i7010_cpu.c` `case OP_B`.

| d | Autocoder | Indicator tested | Notes | Tag |
|---|---|---|---|---|
| blank | `B` | *(none — unconditional)* | Branch Unconditionally. The blank d position must be present | `[verified]` |
| `Z` | BAV | Arithmetic overflow | Turned **off** by this test, or by computer reset | `[verified]` |
| `W` | BDV | Divide overflow | Turned **off** by this test, or by computer reset | `[verified]` |
| `V` | BZ | Zero balance | Turned off by computer reset and by power-on reset | `[verified]` |
| `S` | BE | Compare equal (B = A) | Reset as a group by the next Compare / Table Lookup / BCE | `[verified]` |
| `U` | BH | Compare high (B > A) | | `[verified]` |
| `T` | BL | Compare low (B < A) | Computer reset turns this **ON** | `[verified]` |
| `/` | BU | Compare unequal | Computer reset turns this **ON** | `[verified]` |
| `9` | BC9 / BC91 | Carriage channel 9, channel 1 (1403) | On when the channel-9 hole is sensed; off when any other carriage-tape channel is sensed | `[verified]` |
| `!` | BC92 | Carriage channel 9, channel 2 | | `[verified]` |
| `@` | BCV / BCV1 | Carriage overflow (channel 12), channel 1 | Same on/off rule as channel 9 | `[verified]` |
| `⌑` | BCV2 | Carriage overflow (channel 12), channel 2 | | `[verified]` |
| `R` | BPCB / BPCB1 | Printer carriage busy, channel 1 | | `[verified]` |
| `L` | BPCB2 | Printer carriage busy, channel 2 | | `[verified]` |
| `Q` | BNQ / BNQ1 | Inquiry request, channel 1 | Set by the 1415 console INQUIRY REQUEST key | `[verified]` |
| `*` | BNQ2 | Inquiry request, channel 2 | | `[verified]` |
| `1` | BOL1 | Overlap in process, channel 1 | **Must be tested before any `R`/`X` status branch** when Processing Overlap is installed, or the overlapped operation reverts to non-overlap | `[verified]` |
| `2` | BOL2 | Overlap in process, channel 2 | | `[verified]` |
| `K` | *(none)* | Tape indicator | Documented "for CE use" in A22-0526-3 | `[verified]` |
| `N` | BOQ / BOQ1 | Outquiry, channel 1 | **Not in Figure 35** — feature-dependent (1414 model 4/5 serial adapter). Autocoder C28-0309-1 p.46: `BOQ  BRANCH OUTQUIRY - CHANNEL 1  J 56789 N`. Distinct from `BQPR1 = Y 56789 N` | `[verified]` |
| `H` | BB1 | Binary card, channel 1 | **Not in Figure 35** — requires the column-binary card feature. C28-0309-1 p.46: `BB1 … J 56789 H` | `[verified]` |
| `%` | BB2 | Binary card, channel 2 | C28-0309-1 p.46: `BB2 - CHANNEL 2  J 56789 %` | `[verified]` |
| `4` | — | Overlap in process, channel 3 | **7010 only** | `[likely]` |
| `)` | — | Overlap in process, channel 4 | **7010 only** | `[likely]` |
| `X` | — | Floating-point exponent underflow | **7010 only**, optional FP feature; reset by the test | `[likely]` |
| `Y` | — | Floating-point exponent overflow | **7010 only**, optional FP feature; reset by the test | `[likely]` |
| `A`-`G` | BSS A … BSS G | Sense switches A-G | **1401 mode only** (Compatibility feature). Not valid in native 1410 | `[verified]` |
| `?` | — | Reader error | 1401 mode only | `[verified]` |
| `‡` (record mark) | — | Printer error | 1401 mode only | `[verified]` |
| `I` | — | Punch error | 1401 mode only | `[verified]` |
| `K` | — | End of reel | 1401 mode only — **different meaning** from the 1410 tape indicator on the same character | `[verified]` |

A22-0526-3 Figure 35 lists **18** J d-characters. The `N`, `H` and `%` rows above come from the Autocoder mnemonic table and are feature-dependent additions, not base-machine.

### 6.2 Branch if I/O Channel Status Indicator On — ops `R` (ch 1) and `X` (ch 2)

The d-character's **bit configuration** selects which indicators to test; one to six may be tested by a single instruction. A22-0530-1 p.8; A22-0526-3 p.37 Figure 36 `[verified]`.

| Bit | d alone | Autocoder | Indicator | When set |
|---|---|---|---|---|
| 1 | `1` | BNR1 / BNR2 | **Not Ready** | **Before** any transfer, if the device or its buffer is not ready. Operation terminated, no data transferred, machine does **not** stop |
| 2 | `2` | BCB1 / BCB2 | **Busy** | **Before** any transfer. Operation terminated, no data transferred |
| 4 | `4` | BER1 / BER2 | **Data Check** | **After** the transfer — parity error in the device, its buffer, or the processing unit |
| 8 | `8` | BEF1 / BEF2 | **Condition** | Normally **before** any transfer (e.g. card-reader end-of-file). Operation terminated, no data transferred |
| B | `-` (B only, octal 40) | BWL1 / BWL2 | **Wrong Length Record** | The record written from or into storage is not the correct length (GM-WM mispositioned) |
| A | substitute blank (A only, octal 20) | BNT1 / BNT2 | **No Transfer** | Normally **before** any transfer; no data was available to transfer |
| BA8421 | group mark (octal 77) | BA1 / BA2 | **all six** | "Branch if any I/O channel status indicator on". Also the **only** form that releases the channel interlock without an actual branch |
| any combination | `3` = bits 1+2, `7` = 1+2+4, … | BEX1 / BEX2 | plural indicator test | "Branch if any on in plural indicator test" |

**Interlock semantics** (A22-0526-3 pp.37, 41) `[verified]`:
- An interlock indicator is set at read-out of **every** I/O instruction (`M`, `L`, `U`, `F`, `2`, `K`, `4`). If it is still set when the next I/O instruction on the same channel is read out, **the system stops.**
- Only two things clear it: any `R`/`X` branch that **actually branches**, or an `R (I) ⧧` / `X (I) ⧧` (group-mark d), with no requirement that a branch occur.
- Interrogating the status indicators does **not** reset them. They are reset as the **next** I/O instruction is read out.
- Status is checked **twice** per I/O instruction: the pre-transfer test covers not-ready, busy and condition (any one ⇒ the instruction is ignored, no data transferred, next sequential instruction is read out, no stop); the post-transfer test covers data check, wrong-length record and no transfer.

> `BRC1` / `BRC2` "Branch Read Back Check", channel 1 / channel 2, appear in the C28-0309-1 Autocoder mnemonic table immediately after BER1/BER2, assembling as `R iiiii <d>` / `X iiiii <d>`. If real this is a **seventh** channel status condition beyond Figure 36's six. The d-character does not OCR reliably. `[unverified]` — do not encode.

### 6.3 Branch if Word Mark Present, or Zone Equal — op `V`

A22-0526-3 p.39 Figure 37 `[verified]`.

| Instruction | d | Autocoder | Branch condition |
|---|---|---|---|
| Branch if Word Mark Present | `1` | `BW (I)(B)` | B-address character has a word-mark bit |
| Branch if Zone Bits Absent | `2` | `BZN (I)(B)` | B character has **neither** a B nor an A bit |
| Branch if Zone Equal AB | `B` | `BZN (I)(B) AB` or `+` | B character has **both** B and A bits (plus test) |
| Branch if Zone Equal B | `K` | `BZN (I)(B) B` or `-` | B character has a B bit but no A bit (minus test) |
| Branch if Zone Equal A | `S` | `BZN (I)(B) A` or `b` | B character has an A bit but no B bit |
| Branch if WM, or Zone Bits Absent | `3` | `BWZ (I)(B)` | word mark **or** no B and no A |
| Branch if WM, or Zone Equal AB | `C` | `BWZ (I)(B) AB` or `+` | word mark **or** both B and A |
| Branch if WM, or Zone Equal B | `L` | `BWZ (I)(B) B` or `-` | word mark **or** B but no A |
| Branch if WM, or Zone Equal A | `T` | `BWZ (I)(B) A` or `b` | word mark **or** A but no B |

Directly implementable rule: **d bit 1 enables the word-mark test; d bit 2 enables the zone test, comparing the B and A bits of the B-address character against the B and A bits of d.** Octal BA8421: `1`=001, `2`=002, `3`=003, `S`=022, `T`=023, `K`=042, `L`=043, `B`=062, `C`=063. SimH implements exactly `((d & 01) && char has WM) || ((d & 02) && (char & 060) == (d & 060))` `[verified]`.

### 6.4 Carriage Control — ops `F` (ch 1) and `2` (ch 2)

A22-0526-3 p.81 Figure 90 `[verified]`.

| d | Immediate skip to | d | Skip after print to | d | Immediate space | d | Space after print |
|---|---|---|---|---|---|---|---|
| `1` | Channel 1 | `A` | Channel 1 | `J` | 1 space | `/` | 1 space |
| `2` | Channel 2 | `B` | Channel 2 | `K` | 2 spaces | `S` | 2 spaces |
| `3` | Channel 3 | `C` | Channel 3 | `L` | 3 spaces | `T` | 3 spaces |
| `4` | Channel 4 | `D` | Channel 4 | | | | |
| `5` | Channel 5 | `E` | Channel 5 | | | | |
| `6` | Channel 6 | `F` | Channel 6 | | | | |
| `7` | Channel 7 | `G` | Channel 7 | | | | |
| `8` | Channel 8 | `H` | Channel 8 | | | | |
| `9` | Channel 9 | `I` | Channel 9 | | | | |
| `0` | Channel 10 | `?` | Channel 10 | | | | |
| `#` | Channel 11 | `.` | Channel 11 | | | | |
| `@` | Channel 12 | `⌑` | Channel 12 | | | | |

Encoding rule: the **numeric (8421)** portion of d is the channel number or space count; the **zone** portion selects the mode — no zone = immediate skip, BA = skip after print, B = immediate space, A = space after print. d-characters `3`, `C`, `L`, `T` all have numeric value 3 and give four different 3-factor operations.

After a line is printed the form must be moved before the next line prints. If no carriage-control instruction (or manual carriage key) does it, an automatic single space occurs **at the end of the data transfer from the core print buffer to the printer** — i.e. when the buffer is transferred to the printing mechanism, not when core is transferred into the buffer. A22-0526-3 p.81 `[verified]`.

### 6.5 I/O X-control field — channel/overlap (x1), unit select (x2), sub-operation (x3)

The maximum-form I/O instruction is 10 positions: op (`M` or `L`), a 3-position x-control field, a 5-position B-address, and a d-character. A22-0526-3 pp.11, 92; A22-0530-1 p.9 Figure 3.

**x1 — channel and overlap:**

| x1 | Meaning | Tag |
|---|---|---|
| `%` | Channel 1, non-overlap | `[verified]` |
| `@` | Channel 1, overlap | `[verified]` |
| `⌑` (lozenge) | Channel 2, non-overlap | `[verified]` |
| `*` | Channel 2, overlap | `[verified]` |
| `?` `!` `$` `=` | Channels 3/4 non-overlap / overlap — **7010 only** (SimH decode) | `[likely]` |

**x2 — unit select (device class):**

| x2 | Device | Tag |
|---|---|---|
| `1` | Card reader, IBM 1402 | `[verified]` |
| `2` | Printer, IBM 1403 | `[verified]` |
| `4` | Card punch, IBM 1402 | `[verified]` |
| `D` | Data transmission unit, IBM 1009 | `[verified]` |
| `F` | Disk storage, IBM 1405 / 1301 (via 7631 File Control) | `[verified]` |
| `K` | Programmed transmission control, IBM 7750 | `[verified]` |
| `L` | Teletype | `[verified]` |
| `P` | Paper tape reader, IBM 1011 | `[verified]` |
| `Q` | Remote inquiry unit, IBM 1014 | `[verified]` |
| `S` | Magnetic character reader, IBM 1412 / 1419 | `[verified]` — glyph confirmed from C28-0309-1 (`RCR 1,B → M %S1 34567 R`); A22-0530-1 Figure 3 OCRs it ambiguously as `5` |
| `T` | Console I/O printer (1415) | `[verified]` |
| `U` | Magnetic tape unit, **even** parity (BCD) | `[verified]` |
| `B` | Magnetic tape unit, **odd** parity (binary) | `[verified]` |

**x3 — unit number or sub-operation:**

| x2 | x3 | Meaning | Tag |
|---|---|---|---|
| `1` | `0` / `1` / `2` | Read a card and stack in pocket NR / 1 / 8-2, feeding the next card | `[verified]` |
| `1` | `9` | Read a card with **no** stacker select and **no** feed; the buffer retains the image | `[verified]` |
| `4` | `0` / `4` / `8` | Punch a card and stack in pocket NP / 4 / 8-2 | `[verified]` |
| `2` | `0` | Write a line | `[verified]` |
| `2` | `1` | **Write word marks as 1's** — word marks transfer to the print buffer as the digit `1`, all other positions as blanks. Using op `L` here produces no printing | `[verified]` |
| `T` | `0` | Console I/O printer. Overlap allowed but **channel 1 only** (channel 2 is inapplicable — appendix marker `x4`) | `[verified]` |
| `U` / `B` | `0`-`9` | Magnetic tape unit number | `[verified]` |
| `F` | `0` | Seek disk (Autocoder `SD` = `M %F0 34567 R`; `SDO` overlapped = `M @F0 …`) | `[verified]` |
| `F` | `1` | Single-record sector operation | `[likely]` |
| `F` | `2` | Full-track operation (e.g. `RDT` = `M %F2 34567 R`) | `[likely]` |
| `F` | `3` | Write check (1405) | `[likely]` |

**d-modifiers for `M` / `L`:**

| d | Meaning | Tag |
|---|---|---|
| `R` | Read into core storage. Tape read stops at the first inter-record gap **or** the first GM-WM in core; if the GM-WM is sensed first, data transfer stops but **tape movement continues** to the inter-record gap | `[verified]` |
| `W` | Write from core storage. Stops at the first GM-WM in core, then produces an inter-record gap | `[verified]` |
| `$` | Read to inter-record gap or end of core, **ignoring** GM-WMs. Stops at the highest-numbered core position | `[verified]` |
| `X` | Write to end of core, ignoring GM-WMs. Stops only at the highest-numbered core position | `[verified]` |

**`$`/`X` are not tape-only** (conflict C17). A22-0526-3 spells the semantics out only on p.86, the Read/Write Tape page, and prints just `R` in the d-CHARACTER column of Read a Card (p.62) and on every card line of the appendix listing (pp.104-105) — but it never declares `$` invalid on a 1402, defines no d-character validity check for I/O, and phrases the class device-independently everywhere else (p.9 "a read or write 'to end of core' i/o instruction"; p.92 "Instructions that call for a read or write to end of core cannot be overlapped"). IBM prescribes `$` on a 1402 read in its own hand-keying template: C28-0351-5 p.8 Table II step 2, "Enter `ALcde00012$r` into location 00000", with `d` = `1` for card reader or `B` for tape and `$` a fixed literal — i.e. `AL%1000012$R` for a channel-1 card boot `[verified — C28-0351-5 p.8]`. **Decode `$`/`X` at channel level, before device dispatch.** On a 1402 the effect is to suppress the GM-WM termination test and store all 80 buffer columns with no wrong-length-record; the 80-column buffer, not core, bounds the transfer, so a card `$` cannot literally reach end of core `[likely — derived; no manual states card `$` semantics]`.
| `Q` | I-O NOP, **input** status — **Priority feature only.** Identical to a read except no data transfer occurs (file addresses in file-address tests are still transferred) | `[verified]` |
| `V` | I-O NOP, **output** status — Priority feature only | `[verified]` |
| `S` / `C` | sense / control — SimH decode, not in the 1410 manuals | `[unverified]` |

**Overlap rules** `[verified]` (A22-0526-3 pp.92, 95):
- `$` and `X` cannot be overlapped — but read the manual's actual wording, which is the opposite of the obvious paraphrase: "If they are written for overlap, **the processing overlap is performed**, but the end-of-core instruction is automatically changed to a normal read or write; thus the end-of-core results expected are not obtained. (Indicated by x5.)" So the overlap **happens**; the `$`/`X` transfer degrades to `R`/`W` and terminates on the GM-WM (or inter-record gap) instead of at the top of core.
- Processing overlap does not apply to the short-form I/O instructions (carriage control, select stacker) nor to tape unit control **except** write-tape-mark.
- If an `R`/`X` status branch is encountered while an overlap operation is in progress, processing is **suspended** until the transfer completes (the remainder of the operation converts to non-overlap). Test `J (I) 1` / `J (I) 2` (Branch if Overlap in Process) first.
- **Machine-wide constraint**: "Both channels can operate in overlap mode, or both can operate in non-overlap mode, but one channel can not operate in overlap mode while the other is operating in non-overlap mode. If a non-overlap operation is initiated on one channel while the other channel is busy with an overlapped operation, the remainder of the overlapped operation is automatically converted to non-overlap mode. If an overlap operation is initiated while the other channel is busy with a non-overlapped operation, both operations are performed in non-overlap mode." A22-0526-3 p.95.

### 6.6 Tape parity note

A tape mark is always written in **even** parity. Encountered during an **odd**-parity (`x2 = B`) operation it produces both a data check and an end-of-file (condition) indication, and is stored as `8421` with no C bit (an invalid character) or converted to an asterisk depending on the console asterisk-insert switch. In **even**-parity mode (`x2 = U`) the tape mark enters storage as `C8421` with no data check accompanying the end-of-file indication. A22-0526-3 p.87 `[verified]`.

---

## 7. Move Characters and Edit (op `E`) — full semantics

### 7.1 Control-field structure and control characters

The control field is split into a **body** (which punctuates the A field) and **status** portions. The body begins at the **rightmost blank or zero** and runs left until the A-field word mark is sensed; everything else is status. An edit normally takes two instructions: a move to place the control word (and its word mark) into the output area, then the `E` instruction. The data field may contain **fewer**, but must not contain more, positions than the number of blanks and zeros in the body of the control word. A22-0526-3 p.31 `[verified]`.

| Control char | Function | Tag |
|---|---|---|
| `b` (blank) | Replaced by the character from the corresponding A-field position | `[verified]` |
| `0` (zero) | Zero-suppression code. Replaced by the corresponding A character. The **rightmost** `0` in the control field marks the rightmost limit of suppression | `[verified]` |
| `.` (point) | Remains where written, unless decimal control is in effect and the data field had no significant digit | `[verified]` |
| `,` (comma) | Undisturbed where written, unless zero suppression reaches it with no significant numeric character to its left | `[verified]` |
| `CR` | Body: undisturbed. Status: blanked (both positions) if the A-field sign is plus; undisturbed if minus | `[verified]` |
| `-` (minus) | Same as `CR` | `[verified]` |
| `&` | Produces a blank in the output field. May be used in multiples | `[verified]` |
| `*` | Status: undisturbed. Body: **asterisk protection**; an `*` in the body to the **right** of the suppression code is treated as a blank. The enable is the zero-suppress **latch**, not the position (rule 4 below): an `*` read while that latch is set sets the `*` fill latch **and** takes the A-channel character in its place | `[verified]` |
| `$` | Status: undisturbed. Body: **floating dollar sign**; a `$` in the body to the right of the suppression code is treated as a blank. Same latch enable as `*` (rule 4 below): a `$` read while the zero-suppress latch is set sets the floating dollar latch **and** takes the A-channel character in its place | `[verified]` |

A22-0526-3 Figure 28, p.32.

**Scan-1 body rules, verbatim (S223-2698 p.50).** "With the first scan and body latches set, the CPU: 1. Returns the B-channel character to the B-field if the character is not 0, blank, `*`, `$`, or `&`. 2. Writes a blank in the B-field if the B-channel character is an `&` sign. 3. Stores the A-channel character if the B-channel character is a blank or 0. 4. Sets the `*` fill or floating dollar latch if the B-channel character is an `*` or `$` and the zero suppress latch is set. The A-channel character is stored in the B-field." `[verified]`

Two consequences the PoO's prose hides. **Rule 4 is the enable for both latches**, and it is conditioned on the zero-suppress **latch**, not on a position — which on a right-to-left scan 1 is the same thing as "left of the suppression code", since the latch is set when the rightmost `0` is sensed. So an enabling `*` **consumes an A character** exactly as an enabling `$` does; the two control characters are symmetric in every respect but which latch they set. And **these rules apply only while the body latch is set**: once the A-field word mark resets it and sets the extension latch, "either the same characters read or blanks are returned to the B-field" (S223-2698 p.50) — which is why Figure 34's word-marked `$` at 04669 is returned intact at step 37 instead of being read as a floating-dollar enable.

### 7.2 Scan behaviour

**Plain zero suppression (2 scans).** Forward: positions right of the `0` take A digits; the `0` itself takes its A digit and **a word mark is automatically set there**; the scan runs to the B-field word mark, which is sensed and **removed**. Reverse: all zeros and punctuation left of the first significant character, up to and including the suppression-code position, become blanks; the auto-set word mark is sensed, **erased**, and the operation ends. `[verified]`

**Asterisk protection (2 scans).** As above except the reverse scan writes asterisks instead of blanks. An `*` in the body **left** of the suppression code enables it. Asterisk protection and floating dollar sign cannot be used in the same control field. `[verified]`

**Floating dollar sign (3 scans).** Forward scan replaces the `$` with the corresponding A digit and continues to the B word mark. Reverse scan blanks zeros and punctuation left of the first significant digit until the auto-set word mark. Second forward scan erases that word mark, runs to the first blank position, writes `$` there and stops. The floating `$` cannot be used right of the decimal point; with decimal control also active, control field `bb$.bO` edits `00025` to `.25`, **not** `$.25` (put the suppression code left of the point — `b$0.bb` — to avoid this). `[verified]`

**Sign control left (2 scans).** `CR` or `-` in the high-order status position stays if the A sign is minus, is blanked if plus. `[verified]`

**Decimal control (2 scans, 3 if the field has no significant digits).** A point in the body left of the suppression code makes the point print only when the field has significant digits. If there are **no** significant digits a second forward scan blanks the zeros right of the point and the point itself, stopping at the decimal column — the field edits to all blanks. `[verified]`

The decimal control latch is set **during scan 2**, not scan 1 — it is a reverse-scan reaction to the point, taken only if the first significant digit has not already turned zero suppression off: "If the zero suppress latch is not reset when a decimal is sensed, the decimal control latch is set, canceling the blanking effect of the zero suppress latch. When either the zero suppress latch is reset or the decimal control latch is set, zeros and commas in the B-field are not replaced with blanks or asterisks; for example, a B-field containing 000.01 at the end of the first scan becomes bbb.01 during the second scan rather than bbb.b1." S223-2698 p.50 `[verified]`. This is what makes §7.6's termination clause 1 work as written: the latch state tested when the B-field word mark is sensed is the state scan 2 itself produced.

**Re-arming zero suppression inside scan 2.** Zero suppression is not a one-shot latch that stays off once the first significant digit clears it — a non-numeric body character re-arms it, so a single edit can suppress leading zeros in several independent number groups: "If a character that is not a significant digit (1-9), blank, comma, 0, minus sign or decimal is encountered after the zero suppress latch is reset and before the decimal control latch is set, the zero suppress latch is set again. Zeros and commas sensed before the next significant digit are replaced with `*` or blanks; for example, a B-field containing 000100bCARSbb00200,000.75 after the first scan becomes 100 CARS 200,000.75 during the second scan if the asterisk fill latch is off." S223-2698 pp.50-51 `[verified]`. Two limits worth encoding: only **zeros and commas** are replaced (blanks already in the field are left as they are — the example's `bb` between `CARS` and `00200` survives), and the re-arm window closes once the decimal control latch is set.

**Truncation rule.** "The edited output field does not contain any A-field data that have not been moved before the word mark for the control field is sensed" — the B-field word mark hard-stops the forward scan and remaining A data is dropped. A22-0526-3 p.31 `[verified]`.

**Extension latch.** When the A-field word mark is sensed the body latch is reset and the **extension latch** is set. While the extension latch is set, a comma read from the B field is replaced with a blank ("When the A-field word mark is sensed, the remaining commas in the B-field are set to blanks", A22-0526-3 p.31). Important nuance: the A character **already sitting in the A-data register** when the word mark is sensed **is still stored** into the B field on the following B-cycle — only further A-**cycles** stop. S223-2698 p.50: "an A-field character stored in the A-data register on an A-cycle might remain in the register until the CPU executes several B-cycles." `[verified]`

**The A field is never written.** A22-0526-3 Figure 27 prints the A field as `00257426` both before and after. "Any sign in the units position of the data field is removed during the operation" refers to the zone being stripped from the character **moved into the B field**, not from the A field itself. All A-cycles are read-only. `[verified]`

### 7.3 Registers after MCE — the rule the Principles of Operation omits

`IAR = NSI` and `AAR = A − LA` always. `BAR` is printed as "Varies with result of edit" in **every** edition (A22-0526 -0/-2/-3, the May-63 reprint, A22-1407-2 Figure 41, and the 7010 A22-6726) — it is not an omission fixed later. The rule survives in two places `[verified]`:

- **A22-0526-3 Figure 34 (pp.34-35)** is a 46-step cycle-by-cycle trace with all three address registers printed at every cycle (reprinted as S223-2698 Figures 23A/23B, pp.52-53). This pins the two-scan case numerically.
- **S223-2698 pp.50-51** states the mechanism: BAR is modified by **−1 on every B-cycle of scans 1 and 3** and by **+1 on every B-cycle of scan 2**, *including the terminating cycle*, and names the character each scan terminates on.

| Termination case | Scans | IAR | AAR | BAR after | Tag |
|---|---|---|---|---|---|
| No `0` (suppression code) anywhere in the control word | 1 | NSI | A − LA | `addr(B-field high-order word mark) − 1` | `[verified]` |
| Plain zero suppression | 2 | NSI | A − LA | `addr(suppression code in B) + 1` | `[verified]` |
| Asterisk protection | 2 | NSI | A − LA | `addr(suppression code in B) + 1` | `[verified]` |
| Sign control left | 2 | NSI | A − LA | `addr(suppression code in B) + 1` | `[verified]` |
| Decimal control, field **has** a significant digit | 2 | NSI | A − LA | `addr(suppression code in B) + 1` | `[verified]` |
| Decimal control, **no** significant digit (all-blank result) | 3 | NSI | A − LA | `addr(decimal point in B) − 1` | `[verified]` |
| Floating dollar sign | 3 | NSI | A − LA | `addr($ store position) − 1` (where the `$` was written) | `[verified]` |
| Floating dollar **and** decimal control both on | 3 | NSI | A − LA | `addr(first blank-or-decimal read in scan 3) − 1` | `[verified]` |

The three-scan rows were derived from S223-2698 p.51's termination wording plus the verified ±1 convention, and then **confirmed** in cube1us/1410, the ALD-derived cycle-level simulator: `UI1410CPUT.cpp` line 102 `long scan_mod[] = { 0, -1, +1, -1 };` indexed by the scan ring and applied in `STARScan()` via `Cycle()` on every `CYCLE_B`; in `InstructionEdit`'s third-scan block every terminating path sets `IRingControl = true` and then **falls through** to `Store(...)` followed by `Cycle()`, so the −1 lands on the terminating cycle.

#### Worked example — A22-0526-3 Figure 34 / S223-2698 Figures 23A-23B (key steps)

Setup: `E 12163 04685` at 00001-00011 (NSI = 00012). A field `00257426` at 12156-12163, word mark at 12156. Control word `$bbb,bb0.bb&CR&**` at 04669-04685, word mark at 04669. Zero-suppression code `0` at 04676. Result `$  2,574.26    **`.

| Step | Cycle | IAR | AAR | BAR | Data reg B | Put back | B field at end of cycle | Remark |
|---|---|---|---|---|---|---|---|---|
| 12 | I-11 | 00012 | 12163 | 04685 | op | op | `$bbb,bb0.bb&CR&**` | op code and next instruction |
| 13 | A | 00012 | 12162 | 04685 | 6 | 6 | same | execute EDIT |
| 14 | B | 00012 | 12162 | 04684 | `*` | `*` | same | status portion, `*` undisturbed |
| 16 | B | 00012 | 12162 | 04682 | `&` | blank | `$bbb,bb0.bb&CRb**` | `&` → blank |
| 20 | B | 00012 | 12162 | 04678 | b | 6 | `$bbb,bb0.b6bbbb**` | first blank: body starts |
| 25 | B | 00012 | 12160 | 04675 | 0 | 4 | `$bbb,bb4.26bbbb**` | **zero suppress**: `0` at 04676 replaced by its A digit, word mark auto-set here |
| 35 | A | 00012 | 12155 | 04670 | 0 (WM) | 0 | same | A-field word mark sensed; AAR stops at 12155 |
| 36 | B | 00012 | 12155 | 04669 | b | 0 | `$002,574.26bbbb**` | the A char already in the A-data register **is still stored**; two word marks still in B (`$` and `4`) |
| 37 | B | 00012 | 12155 | 04668 | `$` (WM) | `$` (no WM) | `$002,574.26bbbb**` | sense word mark, reverse scan; **high-order B word mark removed** |
| 38 | **Skid B** | 00012 | 12155 | 04669 | — | — | unchanged | "Units Position of next Field" — reads/rewrites 04668, **outside** the B field |
| 40 | B | 00012 | 12155 | 04671 | 0 | blank | `$b02,574.26bbbb**` | reverse scan blanking |
| 42 | B | 00012 | 12155 | 04673 | 2 | 2 | same | first significant digit: suppression off |
| 43 | B | 00012 | 12155 | 04674 | `,` | `,` | same | comma returned unchanged — the latch was already reset |
| 46 | B | 00012 | 12155 | 04677 | 4 (WM) | 4 (no WM) | `$bb2,574.26bbbb**` | **last step** — auto word mark erased, operation ends. Final: IAR 00012, AAR 12155, **BAR 04677** |

`AAR = 12163 − 8 = 12155` confirms `A − LA`. `BAR = 04676 + 1 = 04677` confirms `suppression code + 1`.

**Correction (Wave D confirmation read).** The figure prints each address register **after** that cycle's modification, not the address the cycle read. Step 13 is an A-cycle and leaves BAR at 04685; the step-14 B-cycle *reads* 04685 (the low-order `*`) and decrements, so its BAR cell is **04684**, not the 04685 that steps 12 and 13 both print. S223-2698 Figure 23A p.52. This is the one cell in the table easy to copy down wrong, and the reason to state the convention explicitly; every other step transcribed above re-reads correctly. Provenance: A22-0526-3's own bitsavers scan has **no text layer**, so this read landed via **S223-2698 Figures 23A/23B (pp.52-53)**, the verbatim CE-manual reprint of Figure 34; all 46 steps are transcribed in `oracle/mce-figure34.ts`. The figure also carries an **A-data-register** column that this table omits: it holds the word-marked `0` from step 35 straight through step 46 — direct evidence for §7.2's "might remain in the register".

**`A − LA` holds only for legal usage.** If the A field is longer than the number of blanks and zeros in the control-word body, the first scan is terminated early by the B-field word mark and AAR stops wherever it got to: "Other A-field characters are not processed after the B-channel word mark is detected." S223-2698 p.50 `[verified]`.

### 7.4 Word marks — both answers are unconditional yes

- **The high-order B-field word mark is always removed**, during scan 1, in every variant *including the single-scan no-suppression case that no manual traces.* S223-2698 p.50 states it as a hardware invariant: "A word mark is gated to the B-field only when the low-order 0 in the control word is sensed." Figure 34 step 37 shows the word-marked `$` at 04669 read out and put back **without** its word mark. cube1us confirms: every first-scan store uses `AsmChannelWMNone` unless `FirstBFieldZero`. `[verified]`
- **The automatically set word mark at the suppression-code position is always erased** before the operation ends. Figure 34 step 46 — the last step — shows the word-marked `4` at 04676 read out and put back plain. `[verified]`
- Timing of the erasure differs between sources with **no behavioural difference**: the PoO attributes it to the second forward scan in the floating-dollar case and to the end of the reverse scan elsewhere; S223-2698 (and cube1us) put it on the scan-2 terminating B-cycle in all cases. End state is identical; only an intra-instruction observer could tell.

### 7.5 Skid cycles — MCE touches storage outside the B field

At each scan boundary the CPU performs a **skid B-cycle** that reads and rewrites one byte unchanged:

| Boundary | Address touched | Note |
|---|---|---|
| scan 1 → scan 2 | `B_high − 1` | one position **outside** the control word — the units position of the field to the left. Figure 34 step 38, labelled "Skid B" in the CE printing, BAR 04669, remark "Units Position of next Field" |
| scan 2 → scan 3 | `suppression code + 1` | |

Both are real storage references: they cost cycles and they touch memory outside the declared B field, which matters for address wrap and for any storage-protection modelling. The skid **preserves a word mark** at the byte it touches — cube1us stores it with `AsmChannelWMB` (word mark regenerated from the B channel), in contrast to every other MCE store, which uses `AsmChannelWMNone`. An emulator that routes the skid through its normal MCE write path will silently erase a word mark belonging to the neighbouring field. The extension latch is also set during the skid cycle — **at both boundaries**, scan 2→3 as well as scan 1→2; S223-2698 states the two skids in identical language on pp.50 and 51. What identifies a cycle as the skid is the **MQ latch**: it is set at the end of the preceding scan and, together with the new scan's own latch, marks that scan's first B-cycle as the skid, then is **not regenerated** when the skid completes. `[verified]` (S223-2698 pp.50-51; cube1us `UI1410DATA.cpp`)

### 7.6 MCE implementation recipe

| Phase | Direction | BAR delta / B-cycle | Starts at | Ends when | Word-mark action |
|---|---|---|---|---|---|
| Scan 1 (forward) | right → left | −1 | B-address (units of control word) | B-field high-order word mark is read | writes the char back **without** the word mark |
| Skid 1→2 | — | +1 | `B_high − 1` | one cycle | reads and rewrites unchanged, **preserving** any word mark |
| Scan 2 (reverse) | left → right | +1 | `B_high` | auto word mark at the `0` code is read | writes the char back **without** the word mark |
| *stop here* if no floating-`$` latch **and** (zero-suppress or decimal-control latch off **or** the word-marked char is 1-9) | | | | | `BAR = suppression code + 1` |
| Skid 2→3 | — | −1 | `suppression code + 1` | one cycle | reads and rewrites unchanged |
| Scan 3 (forward) | right → left | −1 | suppression code position | `$` stored into first blank, **or** decimal point read out | `BAR = terminating address − 1` |

A-cycles run only during scan 1, decrementing AAR, and stop at the A-field word mark.

**Scan-2 termination condition, stated (S223-2698 p.51):** "The edit operation is terminated at the end of the second scan if the floating dollar latch is off and either: 1. The decimal control or zero suppress latches are off when the B-field word mark is sensed, or 2. The character read out of storage with the word mark is a significant digit. If the floating dollar latch was set during first scan, a third scan is required regardless of conditions established during second scan." Asterisk fill is done inside scan 2, so asterisk protection is a two-scan operation.

**Cycle interleave.** Scan 1 is not a fixed A-then-B alternation — whether an A-cycle runs is decided by what the *previous* B-cycle did with its character: "If the B-channel character is returned to the B-field on a B-cycle, the CPU executes another B-cycle to read out the next B-field character immediately. If the A-channel character is stored in the B-field on a B-cycle, the CPU executes another A-cycle, then another B-cycle… A B-cycle always follows an A-cycle." S223-2698 p.50 `[verified]`. Figure 34 steps 31→32 show it: step 31 returns the comma at 04672 unchanged, so no A-cycle intervenes and step 32 is another B-cycle with AAR still holding 12157; only when step 32 stores an A character does step 33's A-cycle follow. This is the cycle-count model an emulator must reproduce if it charges MCE by cycles rather than by characters — the A-cycle count equals the number of A characters consumed, not the number of B positions scanned.

**Do not copy these SimH deviations** (`rcornwell/sims` `i7010_cpu.c` `case OP_E`) `[verified]`:
1. It decides the single-scan case with `if ((cy & 0x1) == 0 && (ReadP(BAR) & 077) != CHR_0) break;` — reading a byte at the already-decremented BAR, i.e. **outside** the control word, and testing it for `0`. S223-2698 p.50 conditions this only on the zero-suppress **latch**: "If the zero suppress latch is not set when the B-field word mark is sensed, the first scan and the edit operation end." cube1us agrees with the manual (latch only, no storage read).
2. The scan-2→3 skid storage reference is **absent entirely** — a bare `DownReg(BAR)` with no read/rewrite.
3. C short-circuit evaluation means the scan-1→2 skid read happens only when the zero-suppress latch is **off** — precisely the case in which scan 2 does not run.

Items 2 and 3 are storage-reference and cycle-count deviations only; final register state is unaffected.

> **1401-vs-1410 trap.** The 1401 Reference Manual A24-1403-5 has its own step-by-step editing trace, Figure 58, using the **identical** example — control word `$bbb,bb0.bb&CR&**`, A field `00257426`, with I/A/B register columns. It is 41 steps against the 1410's 46, uses 3-digit addresses (A-address 0789, B-address 0300, control word at 0284-0300, suppression code at 0291), and has **no skid-cycle row**. Anyone quoting per-step register values for this example must check which manual they are in. `[verified]`
>
> Also 1401-vs-1410: "**Single Character Edit** — If the specified A-field in an edit operation contains a word mark in the units position (a single character field), the 1401 system will **not** transfer this single-character field to the B-field. The **1410 will** transfer and edit this single-character field." 223-2588-2 p.53 `[verified]`.
>
> Wording error not to encode: A22-0526-3 p.33, Sign Control Left, forward scan step 4 says "The scan proceeds until the B-field word mark is sensed, indicating the end of the **body** of the control word." It is the **A-field** word mark that ends the body; the B-field word mark ends scan 1. S223-2698 p.50 states it correctly. The same erroneous sentence is carried into S223-2698's own reprint on p.49. `[verified]`

---

## 8. Indicators

| Indicator | Set by | Tested by | Reset by | Tag |
|---|---|---|---|---|
| **Arithmetic overflow** | **Add and Subtract only** (one-field or two-field), when the result exceeds the limit set by the B-field word mark — the carry is lost | `J (I) Z` (BAV) | the test that reads it, or computer reset | `[verified]` |
| **Zero balance** | Add, Subtract, Multiply, Zero and Add, Zero and Subtract producing a zero balance | `J (I) V` (BZ) | the next arithmetic op (any except Divide) that does **not** give a zero balance; computer reset; power-on reset | `[verified]` |
| **Divide overflow** | Divide — quotient field **two or more** positions too small, an improperly addressed dividend, or division by zero (always) | `J (I) W` (BDV) | the test that reads it, or computer reset | `[verified]` |
| **Compare high** (B > A) | Compare, Table Lookup, Branch if Character Equal | `J (I) U` (BH) | the next Compare / Table Lookup / BCE | `[verified]` |
| **Compare equal** (B = A) | same three | `J (I) S` (BE) | same | `[verified]` |
| **Compare low** (B < A) | same three | `J (I) T` (BL) | same; computer reset turns this **ON** | `[verified]` |
| **Compare unequal** | accompanies high or low | `J (I) /` (BU) | same; computer reset turns this **ON** | `[verified]` |

**Critical correction — arithmetic overflow is Add/Subtract only.** A22-0526-3 p.53 (1415 Console, "Overflow" light description), in identical wording in editions 2 and 3: *"This light shows that an arithmetic-overflow condition has been detected. The overflow condition can be detected only during an add or subtract operation, and not during a zero and add, zero and subtract, multiply or divide operation."* An emulator that raises arithmetic overflow on a ZA/ZS/Multiply whose A field is longer than the B field diverges from the machine, and a program doing `ZA` followed by `BAV` will branch when it should not. `[verified]`

**Divide never affects zero balance.** The p.53 "Zero Balance" console-light text enumerates the setting ops as "any add, subtract, zero and add, zero and subtract, or multiply operation" — divide is absent from both the set and the reset lists, matching the p.16 rule. `[verified]`

**Indexing does not set arithmetic overflow** even if the index addition overflows. A22-0526-3 p.15 `[verified]`.

**Computer reset** turns off the overflow indicators and the zero-result indicator, and turns **ON** the low-compare and unequal-compare indicators. A22-0526-3 p.36 `[verified]`.

**Carriage channel 9 / channel 12** indicators turn on when the corresponding carriage-tape hole is sensed and turn off when any **other** carriage-tape channel is sensed. `[verified]`

Per-device I/O status conditions (which of the six channel indicators each device can set, and why) are in `io.md`; the encoding is §6.2 above.

---

## 9. Ops that exist only with optional features, or only on other machines

### 9.1 Priority feature (Special Feature) — op `Y`

Standard on the 7010, a **special feature** on the 1410. Channel-2 I/O-unit, inquiry and outquiry priority requests additionally require the I-O Adapter (Special Feature 4660) and Priority Feature Extension (Special Feature 5621) — marked `*` below. Source: A22-0530-1 pp.4-9 `[verified]`.

| Instruction | Mnemonic | Meaning | Set by | Reset by |
|---|---|---|---|---|
| `Y (I) U` | BUPR1 | Channel 1 I-O unit priority request | The device selected by the 1415 5-position priority select switch (off / card reader / card punch / printer / paper tape reader) finishing an operation; also automatically whenever the priority select on-off key is turned on (used to enter the interrupt routine initially) | the `Y (I) U` test itself |
| `Y (I) F` | BUPR2 | Channel 2 I-O unit priority request `*` | as above | the test itself |
| `Y (I) 1` | BOPR1 | Channel 1 overlap priority request | Completion of any overlapped read, write or write-check on that channel; also a 7631/1301 seek issued in overlap mode (at completion of the **address transfer** to the 7631, before the access mechanism moves) | the **`R (I) d`** branch-on-channel-status instruction — **not** the `Y` instruction |
| `Y (I) 2` | BOPR2 | Channel 2 overlap priority request | as above | the `X (I) d` instruction |
| `Y (I) Q` | BIPR1 | Channel 1 inquiry priority request | Console inquiry request key (channel 1 only); completion of a data transfer to a 1414 model 4/5 serial input buffer from an unsolicited device (Teletype, 1009, 1014); EOR-1009 and misread message | automatically when all inquiry requests are serviced by a read directed to the causing unit; the 1415 RELEASE key resets console-generated inquiry status |
| `Y (I) *` | BIPR2 | Channel 2 inquiry priority request `*` | as above | as above |
| `Y (I) N` | BQPR1 | Channel 1 outquiry priority request | Completion of a data transfer **from** a 1414 model 4/5 serial output buffer | the test itself |
| `Y (I)` *(glyph ambiguous — see below)* | BQPR2 | Channel 2 outquiry priority request `*` | as above | the test itself |
| `Y (I) S` | BSPR1 | Channel 1 seek priority request | Any access mechanism on that channel entering seek-complete status | automatically when seek-complete status of **all** access mechanisms is reset off; seek-complete is reset by directing a read, write or I-O NOP to the causing unit |
| `Y (I) T` | BSPR2 | Channel 2 seek priority request | as above | as above |
| `Y (I) A` | BXPR1 | Channel 1 attention | Attention signal from the device on the channel control adapter | the test; also temporarily by program or computer reset, but it turns on again at the next instruction read-out |
| `Y (I) B` | BXPR2 | Channel 2 attention | as above | the test |
| `Y (I) E` | BEPA | Branch unconditionally and **enter** priority alert mode | — | the alert-mode indicator is turned off by `Y (I) X` and by any interrupt |
| `Y (I) X` | BXPA | Branch unconditionally and **exit** priority alert mode | — | — |

**Interrupt mechanics** `[verified]`:
- A priority request indicator turning on turns **off** the priority alert mode indicator, removes the system from priority alert mode, and causes a branch to storage location **00101**.
- Return linkage: the priority routine must store the address in BAR and **decrement it by six**; that value goes into the I-address of the trailing `Y (I) E`.
- **No hardware saving of arithmetic/logic indicators.** A22-0530-1 p.7: "If the status of arithmetic and logic indicators will be changed by operations in the priority routine, their status must be saved. If the status is saved, it must be restored before branching back to the main routine program."
- Late-request edge case: "When an overlap priority request occurs too late to interrupt and the next instruction is a Branch if I/O Status Indicator On, the priority request indicator previously turned on is **reset and no interrupt occurs**." A late request otherwise interrupts at read-out of the next interruptible instruction.
- Console-vs-1414 inquiry disambiguation, the documented use of the I-O NOP: "1. An I-O NOP instruction is issued to the console. 2. If the inquiry request was not caused by the console, the **no transfer** indicator will be set. 3. If the inquiry was caused by the console, no indicator will be set."

> **`BQPR2` d-character is not safely determined.** A22-0530-1 p.8 prints it as a double-dagger glyph — but in that manual's typewriter face the **group mark** is also typed as a double dagger (the interlock-clearing instruction is written `R(I)‡` / `X(I)‡`), so the glyph alone does not distinguish record mark (A82, octal 032) from group mark (BA8421, octal 077). SimH's comment calls it "rm" but the constant it uses is `CHR_TRM = 017` (the 8421 tape-mark character) — a **third** character again. Do not encode this from any of the three without a 1414 model 4/5 feature bulletin. `[unverified]`

**I-O NOP** (Priority feature only): `M`/`L` `x1x2x3 bbbbb d` with `d = Q` (input status) or `V` (output status). Identical to a normal read or write except no data transfer occurs (file addresses in file-address tests **are** still transferred). Used after an interrupt to set the I/O channel status indicators so the causing device's status can be determined with `R (I) d` / `X (I) d`. For a **disk** I-O NOP the B-address must address the storage data used to address the desired disk module. `[verified]`

### 9.2 1412/1419 Magnetic Character Reader feature

Adds two more op-plus-d-only (2-character) I/O op codes that sit alongside `F`/`2` and `K`/`4` `[likely]` — sourced from the C28-0309-1 Autocoder mnemonic table only (it appears twice in the manual, once per Autocoder version; both renderings agree), not from a Principles of Operation:

| Op | d | Autocoder | Meaning |
|---|---|---|---|
| `P` | `E` | ECR1 | Engage magnetic character reader, channel 1 |
| `P` | `D` | DCR1 | Disengage, channel 1 |
| `P` | `R` | SS1 | MICR stacker select, pocket R, channel 1 |
| `Q` | `E` | ECR2 | Engage, channel 2 |
| `Q` | `D` | DCR2 | Disengage, channel 2 |
| `Q` | `3` | SS2 | MICR stacker select, pocket 3, channel 2 |

The feature also adds further conditional branches on channel-1/channel-2 MICR indicators: Autocoder `BCLR` / `BCNR` / `BCRC` / `BCAF` / `BCPC` / `BCAN` / `BCTR`, d = `1` through `7` `[likely]`.

### 9.3 IBM 7010 only — `$` and `=`

Neither is a 1410 instruction. Included so an emulator's decode table can reject them explicitly.

**`$` — Store and Restore Status**, form `$ (B) d`. A22-6726 p.33 `[verified]`:

| d | Meaning |
|---|---|
| `S` | Store internal machine status as one character: bit 1 Equal, 2 High, 4 Low, 8 Zero Balance, A Arithmetic Overflow, B Divide Overflow |
| `R` | Restore internal machine status |
| `E` | Store channel 1 status: bit 1 Not Ready, 2 Busy, 4 Data Check, 8 External Condition, A No Transfer, B Wrong Length Record, **WM** Channel Interlock |
| `F` | Store channel 2 status |
| `1` | Restore channel 1 status |
| `2` | Restore channel 2 status |

Storing does **not** reset the indicators; word marks in the B field are eliminated when machine status is stored.

> **7010 storage protection and relocation are NOT documented in A22-6726.** SimH decodes `$ P` / `$ ?` as protection-bound setters and `Y ?` / `Y 9` / `Y P` / `Y H` as protection-mode ops, gated behind its own `OPTION_PROT` flag. None of that appears in the 7010 Principles of Operation, whose Priority Test and Branch table (p.38) lists exactly the same fourteen d-modifiers as the 1410 Priority feature. Treat SimH's protection support as a simulator-only or later-feature construct. `[unverified]`

**`=` — Floating Point** (7010 optional feature). Op-code character `=` is BCD 8-2-1 (octal 013), **unused** by every 1410 op, so the feature does not overload a 1410 op-code character. Its indicators are tested by `J iiiii Y` (exponent overflow) and `J iiiii X` (underflow), also 7010-only. `[likely]` — SimH `i7010_defs.h` `#define OP_FP CHR_EQ`.

### 9.4 Program Addressable Clock (Special Feature)

`G ccccc T` stores the real-time clock instead of an address register: high-order digit `0` or `9`, hours in continental time, minutes as **hundredths of an hour** (1:30 pm = `01350`). Feature manual G22-6654; documented in 223-2588-2 p.25 `[verified]`. Not base 1410.

### 9.5 1401 Compatibility feature

The 1401 Compatibility feature **adds no instructions to the 1410 instruction set** — it makes the machine execute the native 1401 instruction set in "1401 mode". A 10K 1410 runs as an 8K 1401; all larger 1410s run as a 16K 1401. A22-0526-3 p.98 `[verified]`.

- **Supported** in 1401 mode: Multiply-Divide, Expanded Print Edit, Advanced Programming (indexing, store address register, move record), Print Storage, High-Low-Equal Compare, Read-Punch Release, **Sense Switches**.
- **Not supported**: Column Binary, Compressed Tape, Punch Feed Read, Serial I/O Adapter (1009/1011/1012/1412/1418/1419), Process Overlap, Selective Tape Listing, Space Suppression.

Behavioural differences that matter to an emulator `[verified]` (A22-0526-3 p.98):
- Load-mode tape **write** of a stored word separator: 1401 writes **one** separator; 1410 writes **two**.
- Load-mode tape **read**: the 1401 collapses any number of consecutive word separators and puts a word mark over the following character; on the 1410 a **pair** of adjacent tape word separators reads in as one stored word separator and **no** word mark is set over the next character.
- Invalid parity on input: the 1401 forces the character valid by adding/removing the C bit; the **1410 stores an asterisk** in place of any input character with incorrect parity.
- Address doubling on single-address instructions: see the trap in §1.4.
- Single-character A-field edit: see the trap in §7.6.

All 1410 ALD address-double grouping lines are gated `if not 1401`; in 1401 mode the 1410's address-double op-code group is not driven at all, and doubling comes from the 1401 I-cycle logic instead. `[verified]`

---

## 10. Unverified and contradictory items

Everything below is either `[likely]`, `[unverified]`, or a live contradiction between sources. Each row names what it blocks and the fallback to implement.

| Item | Status | Blocks | Fallback |
|---|---|---|---|
| **MCS (`Z`) scan direction and units addressing** — no edition of the PoO, A22-1407-2, or the CE Handbook states it in words | `[likely]` (forced by `AAR = A − LA`, confirmed only by SimH `OP_MSZ`) | CPU | Implement right-to-left copy from the units position, then a left-to-right suppression pass; leave `BAR = B + 1`. This is the only reading consistent with the printed register result |
| **`BQPR2` (channel 2 outquiry) `Y` d-character** — A22-0530-1's double-dagger glyph is also how it prints the group mark; SimH uses a third character (`CHR_TRM` 017) | `[unverified]` | I/O (priority) | Use record mark (A82, octal 032) and make the constant configurable; the whole row is channel-2-with-feature-5621 and unreachable in a base machine |
| **`BRC1`/`BRC2` "Branch Read Back Check"** in the Autocoder mnemonic table — would be a 7th channel status condition beyond Figure 36's six; d-character does not OCR | `[unverified]` | I/O | Do not implement. Decode the six documented status bits only; treat any other `R`/`X` d bit as testing nothing |
| **Disk sub-operation digits (x3 with x2=`F`) and the disk-control-field layout** — only known from C28-0309-1's assembled examples | `[likely]` for `%F0` seek, `%F1` single record, `%F2` full track, `%F3` write check | I/O | Implement `%F0` seek and treat other x3 values as unimplemented device operations that set the condition indicator. A22-6704, A22-6670 and C28-0405-2 are image-only on bitsavers and unmined |
| **`P`/`Q` MICR op codes and their d-characters** — Autocoder table only, no Principles of Operation | `[likely]` | I/O | Decode them as 2-character no-ops that set no indicator unless a 1412/1419 is modelled |
| **`Y` (priority) instruction timing formula** — A22-0530-1 gives interruptible/non-interruptible lengths but no `T` | `[unverified]` | CPU (timing only) | Use `4.5(L+1+C)`, the same as the other one-address conditional branches |
| **Op `U` (Unit Control) length: A22-0530-1 Figure 1 prints 2, A22-0526-3 p.85 and 223-2589 p.53 say 5** | contradiction, **resolved** | I/O | Use **5** (`U x1x2x3 d`). The `2` in the priority bulletin is a printing error — two independent OCR passes of the same scan both read `2`, so it is not a scanning artifact. `O xxx d = 5 positions` is a documented valid form |
| **A22-0530-1 Figure 1 interruptible-length column for the arithmetic ops** — blank in both OCR passes | `[likely]` (11 is the right instruction length) | CPU (priority) | Use 11 for `? ! A S @ % E Z C / , ⌑` and 12 for `W V D B T` |
| **One-Field arithmetic timing formula at L=1** — prints `L = 1 or 6` with no `E` term, contradicting Figure 7's `E = 1 on a single-character add…` and the hardware's chained D cycle | contradiction, **resolved** | CPU (timing only) | Use the **Two-Fields formula with L=1, E=1** for any chained arithmetic op. Semantics unaffected |
| **7010 `$ P` / `$ ?` protection bounds and `Y ? / 9 / P / H` protection modes** — SimH only; absent from A22-6726 | `[unverified]` | none (7010-only) | Do not implement; the 1410 has no storage protection at all |
| **7010 `J` d-characters `4` `)` `X` `Y`** (channel 3/4 overlap, FP exponent) — SimH only, absent from A22-0526-3 Figure 35 | `[likely]` 7010-only | none | Reject in 1410 mode |
| **Address wrap during the MCE `−1` modification**, and storage-protection interaction with the two skid cycles that touch bytes outside the declared B field | `[unverified]` (undocumented in every manual) | CPU (edge case) | cube1us models the scan-modify circuit as wrapping both ways and raising a latch (`temp = 0` + `StorageWrapLatch` at coresize; `temp = 99999` below 0). Follow that, or trap |
| **Chained op with a stale AAR/BAR** after an intervening branch or I/O that clobbered one register | `[unverified]` | CPU (edge case) | The manual gives only "the address registers contain valid addresses". Run the normal address-validity check and otherwise execute with whatever is in the registers |
| **Per-scan cycle counts inside the MCE timing formula** — whether the two skid cycles are counted inside `B`/`Z`/`D` | `[unverified]` | CPU (timing only) | Ignore unless cycle-accurate; S223-2698 Figure 25 "Edit Operation Timings" is an image and was not extracted |
| **1401 A24-1403-5 Figure 58 step 33** shows no BAR decrement on the first-scan word-mark cycle, contradicting the same manual's own `B−Ln` rule | contradiction, unresolved | none (1401 only) | Does not affect the 1410 answer — A22-0526-3 Figure 34 is unambiguous. Flagged because both manuals trace the same example |
| **SimH `D`/`T` lengths 2, 7, 11** accepted; 1410 documents 1, 6, 12 only | 7010 latitude | CPU | Reject 2/7/11 for `D` and `T` on the length-validity check |
| **SimH marks `R`/`X` as `O_DBL` (chainable)** in `op_args[]`; the hardware is not | simulator permissiveness | CPU | `R` and `X` are length **7 only**. Confidence labels on anything sourced from SimH alone should be treated as one tier lower than stated |

---

## 11. Sources

Primary, in order of authority for this file:

- IBM 1410 Principles of Operation, **A22-0526-3** (last edition) — http://bitsavers.org/pdf/ibm/1410/A22-0526-3_1410_princOps.pdf · OCR: https://archive.org/download/bitsavers_ibm1410A22_14511698/A22-0526-3_1410_princOps_djvu.txt
- IBM 1410 Principles of Operation, **A22-0526-2** — http://bitsavers.org/pdf/ibm/1410/A22-0526-2_1410_PrincOps.pdf · OCR: https://archive.org/download/bitsavers_ibm1410A22_13458542/A22-0526-2_1410_PrincOps_djvu.txt
- IBM 1410 Principles of Operation, A22-0526 (original) — http://bitsavers.org/pdf/ibm/1410/A22-0526_1410_princOps.pdf
- IBM 1410 Principles of Operation, May-63 reprint — http://bitsavers.org/pdf/ibm/1410/A22-0526_1410_princOpsMay63.pdf
- IBM **1411 Processing Unit — Instructions and Special Features**, CE Instruction manual **S223-2698** (1961) — http://bitsavers.org/pdf/ibm/1410/CE_Instruction_Reference_Maintenance/1411_CPU/S223-2698_CE_Instruction_1411_Instructions_and_Special_Features_1961.pdf — *the decisive source for MCE register-after behaviour, the ±1 scan convention, and the skid cycles (pp.47-56)*
- IBM 1410 CE Instruction Reference: **System Fundamentals, 223-2589** (Nov 1963) — http://bitsavers.org/pdf/ibm/1410/223-2589_Instruction_Reference_1410_System_Fundamentals_Nov63.pdf — *op-code/length table p.53; address-double, chaining and D/C-cycle mechanism p.52; percent-type chaining p.50*
- IBM 1410 Customer Engineering Handbook, **223-2588-2** (Apr 1964) — http://bitsavers.org/pdf/ibm/1410/CE_Instruction_Reference_Maintenance/223-2588-2_1410_CE_Handbook_196404.pdf
- IBM **1410 Priority Feature, A22-0530-1** — http://bitsavers.org/pdf/ibm/1410/A22-0530-1_1410_priorityFea.pdf · OCR: https://archive.org/download/bitsavers_ibm1410A22a_813869/A22-0530-1_1410_priorityFea_djvu.txt
- IBM 1410 Data Processing System Reference Manual, **A22-1407-2** (Nov 1961) — http://bitsavers.org/pdf/ibm/1410/A22-1407-2_1410ref_Nov61.pdf · OCR: https://archive.org/download/bitsavers_ibm1410A22_17811376/A22-1407-2_1410ref_Nov61_djvu.txt
- IBM **1410 Autocoder, C28-0309-1** — http://bitsavers.org/pdf/ibm/1410/C28-0309-1_1410_autocoder.pdf · layout-preserving OCR: https://archive.org/download/bitsavers_ibm1410C28_4785472/C28-0309-1_1410_autocoder_text.pdf — *"Mnemonic Operation Codes" appendix pp.41-58 read 2026-08-31 (`pdftotext -layout` on the OCR edition, cross-checked against 200 dpi renders of the bitsavers page images); pp.47-49 carry the unit-record, printer, punch, console and tape mnemonic families and settle §2 rows 206/207. The PDF also carries **TNL N28-1156** (1 July 1964) at its end, replacing printed pp.23, 24, 55-58 — cite a revised page as such.*
- IBM **7010 Principles of Operation, A22-6726** — http://bitsavers.org/pdf/ibm/1410/A22-6726_7010_PrincOps.pdf · OCR: https://archive.org/download/bitsavers_ibm1410A22_11872961/A22-6726_7010_PrincOps_djvu.txt
- IBM **1401 Reference Manual, A24-1403-5** (Apr 1962) — https://www.bitsavers.org/pdf/ibm/1401/A24-1403-5_1401_Reference_Apr62.pdf — *corroboration only; never cite as a 1410 fact*
- IBM 1301/1302 Disk Storage with 1410 and 7010, A22-6788 — http://bitsavers.org/pdf/ibm/1410/A22-6788_1301_1302_Disk_with_1410_7010.pdf — *component description; contains no instruction set*
- bitsavers 1410 directory — http://bitsavers.org/pdf/ibm/1410/

Emulator oracles:

- rcornwell/sims, IBM 7010/1410/1401 CPU — https://github.com/rcornwell/sims/blob/master/I7000/i7010_cpu.c
- rcornwell/sims, op-code character constants — https://github.com/rcornwell/sims/blob/master/I7000/i7010_defs.h
- rcornwell/sims, shared 7000-series BCD table — https://github.com/rcornwell/sims/blob/master/I7000/i7000_defs.h
- cube1us/1410 — ALD-derived cycle-level 1410 simulator (GPL-3.0) — https://github.com/cube1us/1410 · `UI1410DATA.cpp` (`InstructionEdit`), `UI1410CPUT.cpp` (`scan_mod`, `STARScan`, `Cycle`), `note1410.txt` (instruction-decode test notes)

**Do not cite** — mislabelled or non-applicable:

- http://bitsavers.org/pdf/ibm/1410/A24-3070-1_1410_Disk_Storage_IO_Instructions.pdf — despite the bitsavers filename, the content is **1401/1440/1460**, not 1410: 3-character B-addresses and seek timing constant `N = .0115` (1401) / `.0111` (1440) / `.006` (1460). Useful only as the closest published description of the 1405/1311/1301 x-position sub-operation scheme.

**Access notes.** bitsavers rejects a bare `curl` with HTTP 403 — send a browser User-Agent. The A22-0526-*, A22-0530-1, C28-0309-1 and A22-6726 PDFs have **no text layer** (`pdftotext` yields ~100 bytes); full OCR is on archive.org as `<name>_djvu.txt`, and a layout-preserving version is available by downloading `<name>_text.pdf` and running `pdftotext -layout` — that is what un-scrambles the Autocoder's two-column mnemonic tables. A22-0526-3, A22-1407-2, 223-2588-2 and 223-2589 all yield usable text this way. **Confirmed 2026-08-31 on C28-0309-1 pp.41-58 and A22-0526-3 pp.101-105**, with one caveat worth the trouble it saves: the OCR is reliable for the **op-code letter** column (`L` vs `M` vs `U`, no mis-transcription found on any page checked against the image) but systematically mangles the **x-control glyph** — `%` comes back as `«`, `X`, `S` or `x` and the lozenge as `n`, `D`, `o` or `•`, non-deterministically across pages — and it misreads `D` as `O` in mnemonics (`RWD` -> `RWO`), which manufactures phantom contradictions. Read any claim that rests on an x-control glyph or digit pair off a `pdftoppm -r 200 -png` render of the bitsavers page image, not off the text layer. The OCR text layer of the two-column "Common Op Code Grouping Chart" (223-2589 p.49; CE Handbook) is column-misaligned and cannot be parsed row-to-op-code reliably — use the prose and the ALD grouping-line objectives instead.

Archive.org item ids: A22-0526-3 = `bitsavers_ibm1410A22_14511698`; A22-0526-2 = `bitsavers_ibm1410A22_13458542`; A22-0530-1 = `bitsavers_ibm1410A22a_813869`; C28-0309-1 = `bitsavers_ibm1410C28_4785472`; A22-6726 = `bitsavers_ibm1410A22_11872961`; A22-1407-2 = `bitsavers_ibm1410A22_17811376`.
