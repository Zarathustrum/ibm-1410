# IBM 1410 Character Set, Card Codes, Collating Sequence and Print Arrangements

## Implementer summary

1. A 1410 character in core is 8 bits: `B A 8 4 2 1` data + `C` check + `WM` word mark; parity is **odd over all eight bits**, so the C bit flips when a word mark is set on the same character.
2. Card zones map mechanically: 12→BA, 11→B, 0→A, no zone→none; digits 1-9→their BCD value; a lone `0` punch is `8-2` (bits 82), blank is all-zero, and the `8-x` specials (x=3..7) are `8` plus x's bits.
3. The collating sequence used by Compare is **not** the numeric order of the 6-bit code — build a 64-entry `collate[bcd6]` rank table (blank=0 … 9=63) exactly as tabulated below; Compare tests BA8421 only, never C or WM.
4. Field sign lives in the **zone of the units digit**: minus = B only (11 zone); plus = BA (12), no zone, or A (0 zone); the machine generates BA for plus, B for minus, so a signed units digit prints as a letter (`-1`→`J`, `+1`→`A`, `-0`→`!`→prints `-`, `+0`→`?`→prints `&` on an A chain).
5. Only five code points differ between the 1403 A (commercial) and H (FORTRAN/COBOL) 48-character arrangements: `12`, `12-4-8`, `0-4-8`, `3-8`, `4-8`. Bits and punches are identical between the 1401 and the 1410 for all 64 codes; six glyph *names* were renamed by the 1410's "Standard BCD Interchange Code".

---

## 1. Character representation and parity

A 1410 character occupies eight bit planes: the six data bits `B A 8 4 2 1`, a check bit `C`, and a word-mark bit `WM`. Every character in storage must carry an **odd** total bit count including C and WM; the word mark is counted *before* C is determined, so setting a word mark inverts C. [verified — A22-0526-3 p.5 "Character Coding"]

| Character | Bits without word mark | Bits with word mark |
|---|---|---|
| `A` (BA1) | `BA1` (3 bits, odd — C=0) | `WM C BA1` (C added to restore odd) |
| `C` (BA21) | `C BA21` (C added) | `WM BA21` (C dropped) |

Emulator representation: pack as one byte per character with WM in bit 7 (or a parallel word-mark array); C is derivable and only matters if you model parity errors. [verified — A22-0526-3 p.5]

Octal notation used throughout: `B=40, A=20, 8=10, 4=4, 2=2, 1=1`.

---

## 2. Complete 64-character code chart, in collating order

Source of record: **IBM 1410 Principles of Operation, A22-0526-3, Figure 2 "Standard BCD Interchange Code", p.6**, printed in ascending collating sequence with blank lowest (rank 00) and `9` highest (rank 63). Cross-checked against IBM 1401 Reference Manual A24-1403-5 Figure 267 p.170, Van Snyder's consolidated chart, and SimH's `i7010_cpu.c` / `i7010_sys.c` tables. [verified]

The `C (no WM)` column gives the check bit for a character **without** a word mark; invert it when a word mark is present.

| Rank | 1410 A2 glyph / name | H2 glyph | 1401 (older code) name | BA8421 | Octal | C (no WM) | Hollerith | Prints A | Prints H |
|---|---|---|---|---|---|---|---|---|---|
| 00 | blank | blank | blank | `000000` | 00 | 1 | none | space | space |
| 01 | `.` period | `.` | `.` | `BA 821` | 73 | 0 | 12-3-8 | `.` | `.` |
| 02 | `⌑` lozenge | `)` | `⌑` | `BA 84` | 74 | 1 | 12-4-8 | `⌑` | `)` |
| 03 | `[` left bracket | `[` | `(` | `BA 841` | 75 | 0 | 12-5-8 | blank | blank |
| 04 | `<` less than | `<` | `<` | `BA 842` | 76 | 0 | 12-6-8 | blank | blank |
| 05 | `⧧` group mark (GM) | `⧧` | group mark | `BA 8421` | 77 | 1 | 12-7-8 | blank | blank |
| 06 | `&` ampersand | `+` | `&` | `BA` | 60 | 1 | 12 | `&` | `+` |
| 07 | `$` | `$` | `$` | `B 821` | 53 | 1 | 11-3-8 | `$` | `$` |
| 08 | `*` | `*` | `*` | `B 84` | 54 | 0 | 11-4-8 | `*` | `*` |
| 09 | `]` right bracket | `]` | `)` | `B 841` | 55 | 1 | 11-5-8 | blank | blank |
| 10 | `;` semicolon | `;` | `;` | `B 842` | 56 | 1 | 11-6-8 | blank | blank |
| 11 | `Δ` delta (mode change) | `Δ` | `Δ` | `B 8421` | 57 | 0 | 11-7-8 | blank | blank |
| 12 | `-` minus / hyphen | `-` | `-` | `B` | 40 | 0 | 11 | `-` | `-` |
| 13 | `/` slash | `/` | `/` | `A 1` | 21 | 1 | 0-1 | `/` | `/` |
| 14 | `,` comma | `,` | `,` | `A 821` | 33 | 1 | 0-3-8 | `,` | `,` |
| 15 | `%` percent | `(` | `%` | `A 84` | 34 | 0 | 0-4-8 | `%` | `(` |
| 16 | `⌒` word separator (WS) | `⌒` | `=` word separator | `A 841` | 35 | 1 | 0-5-8 | blank | blank |
| 17 | `\` backslash | `\` | `'` apostrophe | `A 842` | 36 | 1 | 0-6-8 | blank | blank |
| 18 | `⧻` segment mark (SM) | `⧻` | `"` tape segment mark | `A 8421` | 37 | 0 | 0-7-8 | blank | blank |
| 19 | `ƀ` substitute blank | `ƀ` | `¢` cent | `A` | 20 | 0 | 2-8 (see §2.1) | `‡` (record-mark slug) | `‡` |
| 20 | `#` number sign | `=` | `#` | `821` | 13 | 0 | 3-8 | `#` | `=` |
| 21 | `@` at sign | `'` | `@` | `84` | 14 | 1 | 4-8 | `@` | `'` |
| 22 | `:` colon | `:` | `:` | `841` | 15 | 0 | 5-8 | blank | blank |
| 23 | `>` greater than | `>` | `>` | `842` | 16 | 0 | 6-8 | blank | blank |
| 24 | `√` tape mark | `√` | `√` tape mark | `8421` | 17 | 1 | 7-8 | blank | blank |
| 25 | `?` plus zero | `?` | `?` plus zero | `BA 82` | 72 | 1 | 12-0 | `&` | `+` (see §5.1) |
| 26 | `A` | `A` | `A` | `BA 1` | 61 | 0 | 12-1 | `A` | `A` |
| 27 | `B` | `B` | `B` | `BA 2` | 62 | 0 | 12-2 | `B` | `B` |
| 28 | `C` | `C` | `C` | `BA 21` | 63 | 1 | 12-3 | `C` | `C` |
| 29 | `D` | `D` | `D` | `BA 4` | 64 | 0 | 12-4 | `D` | `D` |
| 30 | `E` | `E` | `E` | `BA 41` | 65 | 1 | 12-5 | `E` | `E` |
| 31 | `F` | `F` | `F` | `BA 42` | 66 | 1 | 12-6 | `F` | `F` |
| 32 | `G` | `G` | `G` | `BA 421` | 67 | 0 | 12-7 | `G` | `G` |
| 33 | `H` | `H` | `H` | `BA 8` | 70 | 0 | 12-8 | `H` | `H` |
| 34 | `I` | `I` | `I` | `BA 81` | 71 | 1 | 12-9 | `I` | `I` |
| 35 | `!` minus zero | `!` | `!` minus zero | `B 82` | 52 | 0 | 11-0 | `-` | `-` |
| 36 | `J` | `J` | `J` | `B 1` | 41 | 1 | 11-1 | `J` | `J` |
| 37 | `K` | `K` | `K` | `B 2` | 42 | 1 | 11-2 | `K` | `K` |
| 38 | `L` | `L` | `L` | `B 21` | 43 | 0 | 11-3 | `L` | `L` |
| 39 | `M` | `M` | `M` | `B 4` | 44 | 1 | 11-4 | `M` | `M` |
| 40 | `N` | `N` | `N` | `B 41` | 45 | 0 | 11-5 | `N` | `N` |
| 41 | `O` | `O` | `O` | `B 42` | 46 | 0 | 11-6 | `O` | `O` |
| 42 | `P` | `P` | `P` | `B 421` | 47 | 1 | 11-7 | `P` | `P` |
| 43 | `Q` | `Q` | `Q` | `B 8` | 50 | 1 | 11-8 | `Q` | `Q` |
| 44 | `R` | `R` | `R` | `B 81` | 51 | 0 | 11-9 | `R` | `R` |
| 45 | `‡` record mark (RM) | `‡` | `‡` record mark | `A 82` | 32 | 0 | 0-2-8 | `‡` | `‡` |
| 46 | `S` | `S` | `S` | `A 2` | 22 | 1 | 0-2 | `S` | `S` |
| 47 | `T` | `T` | `T` | `A 21` | 23 | 0 | 0-3 | `T` | `T` |
| 48 | `U` | `U` | `U` | `A 4` | 24 | 1 | 0-4 | `U` | `U` |
| 49 | `V` | `V` | `V` | `A 41` | 25 | 0 | 0-5 | `V` | `V` |
| 50 | `W` | `W` | `W` | `A 42` | 26 | 0 | 0-6 | `W` | `W` |
| 51 | `X` | `X` | `X` | `A 421` | 27 | 1 | 0-7 | `X` | `X` |
| 52 | `Y` | `Y` | `Y` | `A 8` | 30 | 1 | 0-8 | `Y` | `Y` |
| 53 | `Z` | `Z` | `Z` | `A 81` | 31 | 0 | 0-9 | `Z` | `Z` |
| 54 | `0` | `0` | `0` | `82` | 12 | 1 | 0 | `0` | `0` |
| 55 | `1` | `1` | `1` | `1` | 01 | 0 | 1 | `1` | `1` |
| 56 | `2` | `2` | `2` | `2` | 02 | 0 | 2 | `2` | `2` |
| 57 | `3` | `3` | `3` | `21` | 03 | 1 | 3 | `3` | `3` |
| 58 | `4` | `4` | `4` | `4` | 04 | 0 | 4 | `4` | `4` |
| 59 | `5` | `5` | `5` | `41` | 05 | 1 | 5 | `5` | `5` |
| 60 | `6` | `6` | `6` | `42` | 06 | 1 | 6 | `6` | `6` |
| 61 | `7` | `7` | `7` | `421` | 07 | 0 | 7 | `7` | `7` |
| 62 | `8` | `8` | `8` | `8` | 10 | 0 | 8 | `8` | `8` |
| 63 | `9` | `9` | `9` | `81` | 11 | 1 | 9 | `9` | `9` |

Table notes:
- The "Prints A / Prints H" columns for the 16 non-graphic codes follow the 1410 PoO Figure 2 footnotes, which describe a "typical printing chain" (i.e. the A2 arrangement the manual assumes). The same "prints as" assignments appear in 1401 Figure 267. [verified — A22-0526-3 p.6 footnotes (1)-(4); A24-1403-5 p.170]
- 1410 A2 names differ from the 1401 names only at ranks 03, 09, 16, 17, 18, 19. [verified — A22-0526-3 p.7 Figure 3]
- The bit/punch assignments in this table are corroborated by three independent sources: Van Snyder's chart (citing 1401 Fig 267), SimH's `mem_to_ascii[64]` in `i7010_sys.c`, and the ibm-1401.info card-code page. [verified — upgraded from "likely" by cross-source agreement on all 64 code points]

### 2.1 Substitute blank (A-bit only) card behaviour — 1410 vs 1401

The 1410 and the 1401 differ here, and the difference is real emulator behaviour:

> "The 1410 system punches an A bit in core storage (substitute blank, formerly cent) as an 8-2 combination in a card column and reads an 8-2 combination in a card column as an A bit. The 1401 system punches an A bit in core storage as a zero in a card column and reads an 8-2 combination in a card column as an invalid character. A no-charge RPQ (898148) makes the 1401 operate as described for the 1410."

[verified — A22-0526-3 "IBM 1401-1410 Compatibility", "Card Read-Punch Character Set", p.100; RPQ number corroborated in the Van Snyder chart footnote]

Implementation: on the 1410, `2-8` ↔ A-bit is a **valid, round-tripping card code in both directions**. Do not carry the 1401 rule ("punches as 0, invalid on read") into 1410 card I/O. Apply the 1401 rule only when emulating an un-RPQ'd 1401.

---

## 3. Structural view: zone × digit → code and punch

Use this as the derivation rule rather than a literal table if you prefer generating the mapping. [verified — derived from A22-0526-3 Fig 2 / A24-1403-5 Fig 267]

| Numeric bits → | none (0) | 1 | 2 | 21 (3) | 4 | 41 (5) | 42 (6) | 421 (7) | 8 | 81 (9) | 82 (10) | 821 (11) | 84 (12) | 841 (13) | 842 (14) | 8421 (15) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Digit punch → | none | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 0 (or 2-8) | 3-8 | 4-8 | 5-8 | 6-8 | 7-8 |
| zone none | blank | `1` | `2` | `3` | `4` | `5` | `6` | `7` | `8` | `9` | `0` (punch 0) | `#` / `=` | `@` / `'` | `:` | `>` | `√` tape mark |
| zone A (0 punch) | `ƀ` subst. blank / `¢` (2-8) | `/` (0-1) | `S` | `T` | `U` | `V` | `W` | `X` | `Y` | `Z` | `‡` record mark (0-2-8) | `,` (0-3-8) | `%` / `(` | word sep (0-5-8) | `\` / `'` | segment mark (0-7-8) |
| zone B (11 punch) | `-` (11) | `J` | `K` | `L` | `M` | `N` | `O` | `P` | `Q` | `R` | `!` minus zero (11-0) | `$` (11-3-8) | `*` (11-4-8) | `]` / `)` | `;` (11-6-8) | `Δ` (11-7-8) |
| zone BA (12 punch) | `&` / `+` (12) | `A` | `B` | `C` | `D` | `E` | `F` | `G` | `H` | `I` | `?` plus zero (12-0) | `.` (12-3-8) | `⌑` / `)` | `[` / `(` | `<` (12-6-8) | `⧧` group mark (12-7-8) |

Rules: zone punch 12→BA, 11→B, 0→A. A lone `0` punch with no other digit punch is numeric `8-2` with **no** zone; a `0` punch combined with 1-9 is the A zone. `11-0`→`B82`, `12-0`→`BA82`. `2-8` alone is the A bit only. [verified]

The 1401 read feed ignores 8-9 (MLP) punches in a column. [verified — A24-1403-5 p.170 notes]

---

## 4. Collating sequence and Compare

Figure 2 is printed in ascending collating order; that order **is** the 1410 collating sequence. It is not the numeric order of the 6-bit code. [verified — A22-0526-3 p.5-6]

| Rank range | Characters (low → high) |
|---|---|
| 00-05 | blank `.` `⌑` `[` `<` GM |
| 06-12 | `&` `$` `*` `]` `;` `Δ` `-` |
| 13-19 | `/` `,` `%` WS `\` SM `ƀ` |
| 20-25 | `#` `@` `:` `>` `√` `?` |
| 26-35 | `A B C D E F G H I` `!` |
| 36-45 | `J K L M N O P Q R` RM |
| 46-53 | `S T U V W X Y Z` |
| 54-63 | `0 1 2 3 4 5 6 7 8 9` |

Notable placements: `?` (plus zero) sorts immediately **before** `A`; `!` (minus zero) between `I` and `J`; record mark between `R` and `S`. [verified]

The 64-entry rank table was independently confirmed entry-for-entry against SimH's `cmp_order[0100]` in `I7000/i7010_cpu.c`, which the Compare and BCE paths use as `sign = cmp_order[br & 077] - cmp_order[ar & 077]`. Every value matches. [verified — upgraded from "likely"; https://github.com/simh/simh/blob/master/I7000/i7010_cpu.c]

### 4.1 Compare (`C`) semantics

- Compares the **B field to the A field**, never A to B. [verified — A22-0526-3 p.28]
- "All BA8421 bits are compared, but not C bits or word marks." [verified — A22-0526-3 p.28, verbatim]
- Sets High (B>A), Equal, Low (B<A); Unequal is also set on a mismatch. [verified]
- Terminated by an A-field or B-field word mark. [verified]
- **Unequal lengths:** if the A field is shorter than the B field, the HIGH indicator is turned on. If the B field is shorter than or equal in length to the A field, indicators are set correctly for the portions actually compared. [verified — A22-0526-3 p.28 "Word Marks" paragraph under Compare]
- Signs do not participate specially: PoO example 6 shows B-field `444444M` comparing HIGH against A-field `444444D`, even though `M` carries a minus zone (`M` rank 39 > `D` rank 29). [verified — A22-0526-3 p.29]

Implementation: `collate[64]` byte table; walk both fields comparing 6-bit codes only.

---

## 5. Print arrangements: 1403 A vs H

The 1410 PoO names the two 1403 chain arrangements **A2** (commerce / report writing) and **H2** (program languages: COBOL / FORTRAN); the 1403 Component Description calls them arrangement **A** / **H** (**AN** / **HN** as trains). Each prints 48 graphics: 26 alphabetic, 10 numeric, 12 special. A chain is five 48-character sections (240 slugs). [verified — A22-0526-3 p.6-7, p.67; GA24-3073 p.5-6]

Exactly five code points are dualed:

| Hollerith | BCD | Octal | A (AN / A2, commercial) | H (HN / H2, FORTRAN-COBOL) |
|---|---|---|---|---|
| 12 | `BA` | 60 | `&` | `+` |
| 12-4-8 | `BA84` | 74 | `⌑` lozenge | `)` |
| 0-4-8 | `A84` | 34 | `%` | `(` |
| 3-8 | `821` | 13 | `#` | `=` |
| 4-8 | `84` | 14 | `@` | `'` |

[verified — A22-0526-3 p.6-7 Figure 2 Commerce/Science columns; GA24-3073 p.27: "The four graphics % ⌑ # @ of the AN arrangement are dualed with ( ) = ' of the HN arrangement"]

| Set | 48 graphics |
|---|---|
| A | `A-Z`, `0-9`, `& . ⌑ - $ * / , % # @ ‡`(record mark) |
| H | `A-Z`, `0-9`, `+ . ) - $ * / , ( = ' ‡`(record mark) |

[verified — derived from GA24-3073 p.25 train listing + p.27 dualing statement + A22-0526-3 Fig 2]

Codes on **neither** 48-character chain: `[ < GM ] ; Δ WS \ SM : > √` — these print blank. `ƀ` (substitute blank) prints the record-mark slug; `?` prints `&` on A; `!` prints `-`. [verified — A22-0526-3 p.6 footnotes]

### 5.1 Correction: `?` on an H chain

The finder's chart listed `?` (12-0) as printing `&` on **both** chains. That is wrong and internally inconsistent with the dualing rule. The 1403 prints whatever slug is assigned to the 12-zone (`BA`) code; on an H arrangement that slug is `+`. So **`?` prints `+` on an H chain**. [likely — derived from A22-0526-3 Fig 2 footnote (which is explicitly for the "typical", i.e. A2, chain) + GA24-3073 p.27 dualing of `&` with `+`. No primary source publishes an explicit H-chain "prints as" column.]

`!` printing `-` and `ƀ` printing the record-mark glyph **are** chain-independent, because `-` and record mark exist on both 48-character sets. [verified]

### 5.2 Other 1403 character-set features

- **Numerical Print** (Models 1, 2): 15 × 16-character sets, 1285 lpm, numeric only. [verified — A22-0526-3 p.67]
- **Preferred Character Set** (Model 3 train, up to 1400 lpm): same 48 graphics, weighted so `0-9 , - . *` appear 8×, `A-Z $ / % & ` 4×, `# @ ⌑ ‡` 2×. Published train sequence (GA24-3073 Figs 30/32): `*.& IHG FED CBA ONM LKJ -,0 987 654 321 *.% ZYX WVU TS/ @$# RQP -,0 987 654 321`, with the second half alternating `@$#` against `⌑ $ ‡`. [verified — GA24-3073 p.25]
- **UCS** (120 graphics on System/3, 240 on S/360 and S/370) requires a 2020 or 2821 and is **not** a 1401/1410 feature. [verified — GA24-3073 p.26-27]
- 1410-attached 1403 models: Model 1 = 100 print positions / 600 lpm; Model 2 = 132 / 600; Model 3 = 132 / 1100 alphameric. [verified — A22-0526-3 p.67]

### 5.3 SimH glyph-table caveat

SimH's `mem_to_ascii[64]` in `i7010_sys.c` renders 12 (`BA`) as `+`, 12-4-8 as `)`, 0-4-8 as `(`, 4-8 as `'` and 3-8 as `=` — i.e. **the H-chain glyphs**. An emulator that copies SimH's table inherits the H arrangement, not the A2 arrangement the 1410 PoO assumes. Choose deliberately and make the chain a configuration switch. [verified — https://github.com/simh/simh/blob/master/I7000/i7010_sys.c lines 204-214]

---

## 6. Signs, zones and printed representation

The sign of a numeric field is carried in the **zone bits of its units position**. [verified — A22-0526-3 p.16 "Sign Change or Development" and Figure 11]

- Minus: **always** B bit only (11 zone).
- Plus: B and A (12 zone), no zone bits, or — less commonly — A bit only (0 zone).
- Machine-generated results: **BA** for plus, **B** for minus.
- Sign test idiom from the PoO: branch-if-zone-equal-B, `V (I) (B) K`, catches minus; no branch means the zone is BA, A, or none — all positive. [verified — A22-0526-3 p.16]
- Identical convention on the 1401: "A negative sign is indicated by a B-bit in the units position"; either A&B or no-zone should be used for signing positive; the machine produces A&B for plus, B for minus. [verified — A24-1403-5 p.28-30]

### 6.1 Punched sign over the units digit → BCD → print

| Units digit | Positive (12 zone, BA) punch | BCD | Prints (A chain) | Negative (11 zone, B) punch | BCD | Prints |
|---|---|---|---|---|---|---|
| 0 | 12-0 | `BA82` (`?`) | `&` (`+` on H) | 11-0 | `B82` (`!`) | `-` |
| 1 | 12-1 | `BA1` | `A` | 11-1 | `B1` | `J` |
| 2 | 12-2 | `BA2` | `B` | 11-2 | `B2` | `K` |
| 3 | 12-3 | `BA21` | `C` | 11-3 | `B21` | `L` |
| 4 | 12-4 | `BA4` | `D` | 11-4 | `B4` | `M` |
| 5 | 12-5 | `BA41` | `E` | 11-5 | `B41` | `N` |
| 6 | 12-6 | `BA42` | `F` | 11-6 | `B42` | `O` |
| 7 | 12-7 | `BA421` | `G` | 11-7 | `B421` | `P` |
| 8 | 12-8 | `BA8` | `H` | 11-8 | `B8` | `Q` |
| 9 | 12-9 | `BA81` | `I` | 11-9 | `B81` | `R` |

An unsigned/positive field with no zone punches the plain digit and prints the digit. An A-only zone (0 punch over a digit, i.e. `/` and `S`-`Z`) is also treated as plus by arithmetic but is the uncommon form. [verified — A22-0526-3 p.16 Fig 11 + Fig 2; A24-1403-5 arithmetic section]

### 6.2 Digit coding in arithmetic

Numerals, letters, and `/ ? !` and record mark all have numeric bits summing to 0-9 and are used directly. All other characters — blank, `&`, `-`, substitute blank, or any code whose numeric sum exceeds 9 — are converted: blank becomes zero (`82`), and the 8 bit is dropped for out-of-range codes. Examples: group mark `CBA8421` becomes `G` (`BA421`) if zones are retained, or `7` if zones are stripped; `#` (`821`) becomes `3`. [verified — A22-0526-3 p.16 "Digit Coding"]

### 6.3 Removing the sign zone for printing

- **Move Characters and Suppress Zeros (`Z`)**: replaces high-order zeros and commas with blanks **and removes the zone bits from the units (sign) position of the B field**, so the units digit prints as a digit. [verified — A22-0526-3 p.27-28]
- **Edit (`E`)**: removes any sign in the units position of the data field. A `CR` or `-` in the control-status portion of the edit word is blanked when the A-field sign is plus and left undisturbed when it is minus. [verified — A22-0526-3 p.31-33]

---

## 7. Word marks in I/O: word separators, load mode, printing

Word marks exist only in core — they are not on cards or tape. On tape and in card load mode they are represented by the **word-separator** character (`0-5-8`, `A841`, octal 35). [verified — A22-0526-3 p.6, p.80; Van Snyder chart]

**Move mode:** word separators in input are stored unchanged; output writes core word separators unchanged and never transfers word marks. [verified — A22-0526-3 "Move Mode / Load Mode"]

**Load mode, input:** a single word separator sets a word mark over the **next** incoming character; **two consecutive** word separators enter core as **one** word separator. Either way the record shortens by one position. [verified — A22-0526-3 "Move Mode / Load Mode"]

**Load mode, output:** each word mark is written as a word separator **before** the character; a word separator in core is written as **two** word separators. [verified — same]

**Disk:** disk storage units handle word marks directly in eight-bit mode, with no word-separator translation. [verified — same]

**Printing word marks:**
- Writing to the 1403 with the `L` (load) op code translates word marks to word-separator characters going to the print buffer. There is no word-separator print slug, so a **blank precedes each word-marked character** on the page. [verified — A22-0526-3 p.80 Figure 88]
- **Write Word Marks As 1s** (`M %21` / `⌑21`): prints a `1` in every word-marked position and blanks elsewhere. [verified — A22-0526-3 p.80]
- If the `L` op code is used for write-word-marks-as-1s, **no printing results at all** — load mode converts the word marks to word separators before the buffer, and every non-word-mark position is blank. PoO, verbatim: "(Thus, if the L Op code is used, no printing results.)" [verified — A22-0526-3 p.80]
- A print data record must be terminated by a group-mark-with-word-mark. [verified — A22-0526-3 p.80]

---

## 8. 1401 vs 1410 differences

**Bits and punches are identical for all 64 codes.** 1401 Figure 267 "Character Code Chart in Collating Sequence" (A24-1403-5 p.170) has the same bit assignments, the same Hollerith punches, and the same collating order as 1410 Figure 2. Only glyph names and print arrangements differ. [verified]

### 8.1 The six renamed code points (1410 Figure 3)

| Hollerith | BCD | 1401 (previous code) | 1410 Standard BCD Interchange Code |
|---|---|---|---|
| 12-5-8 | `BA841` | `(` | `[` |
| 11-5-8 | `B841` | `)` | `]` |
| 0-5-8 | `A841` | `=` (word separator) | word-separator hook glyph |
| 0-6-8 | `A842` | `'` apostrophe | `\` backslash |
| 0-7-8 | `A8421` | `"` (tape segment mark) | segment mark (triple bar) |
| 2-8 | `A` | `¢` cent | substitute blank |

A no-charge MES converted older systems and supplied the 1415 console with type heads matching A2 and H2. [verified — A22-0526-3 p.7 Figure 3 and text]

### 8.2 Substitute blank card handling

See §2.1 — the one behavioural difference in the code chart itself. The 1410 reads/punches `8-2` ↔ A-bit; the base 1401 punches the A bit as `0` and treats `8-2` on read as invalid; RPQ 898148 gives the 1401 the 1410 behaviour. [verified — A22-0526-3 p.100]

### 8.3 1401 Figure 267 notes

- Note 1: the group mark `12-7-8` can optionally be made compatible with the 705 group-mark code `12-5-8`. [verified]
- Note 2: A-bit-only (cent) coding must be program-generated on the 1401 and is used with the C bit to indicate a blank on even-parity tape. [verified]
- Note 3: other special-character printing arrangements can be obtained. [verified]

### 8.4 Op-code interpretation — correction to a widely repeated claim

Van Snyder's chart note says "the 1410 does not interpret `# H P Q Y` or `1-9` as op codes." **The note is wrong only about `Y`, `2` and `4`; it is correct about `#`, `H`, `P`, `Q`, `1`, `3`, and `5`-`9`.** [refuted in part]

Correction: exactly **two** digit characters are 1410 op codes, and both require the second data channel — **`2`** = Carriage Control channel 2 (channel 1 is `F`) and **`4`** = Select Stacker and Feed channel 2 (channel 1 is `K`). With the Priority feature installed, **`Y`** is a third: Priority Test and Branch, form `Y (I) d`. The channel-2 counterpart of the branch-on-I/O-channel-status op `R` is **`X`**, not a digit. `1` and `3` are 7010-only — the channel-4 and channel-3 status branches (SimH `OP_IO4=CHR_1`, `OP_IO3=CHR_3`) — and a strict 1410 must **reject** them, along with `#`, `H`, `P`, `Q`, and `5`-`9`. So an op-code dispatch table accepts `2` and `4` (channel 2 installed) and `Y` (Priority installed), and rejects the rest of Van Snyder's list. [verified — A22-0526-3 p.62 (Select Stacker and Feed), p.80-81 instruction form "CC or CC1 F(Ch1), CC2 2(Ch2)"; SimH `i7010_defs.h`: `OP_CC2=CHR_2`, `OP_SSF2=CHR_4`, `OP_PRI=CHR_Y`]

Van Snyder's note is about **op codes only** and is silent about d-characters. `H`, `Q` and `Y` are all legal `D` (Move/Scan) d-characters (SCNRM, SCNRG, SCNRR), and `1`, `2`, `9`, `Q` are legal `J` d-characters (BOL1, BOL2, BC9, BNQ1) — a decoder that rejects these as op codes must still accept them in the d-character position. [verified — A22-0526-3 instruction appendix]

### 8.5 1401 SPS/Autocoder mnemonic ↔ machine op-code characters

| Mnemonic | Op-code character | Prints as (A chain) |
|---|---|---|
| ZA | `?` | `&` |
| ZS | `!` | `-` |
| CW | `⌑` lozenge | `⌑` |
| D | `%` | `%` |
| M | `@` | `@` |
| SW | `,` | `,` |
| CS | `/` | `/` |
| MA | `#` | `#` |

[verified — A24-1403-5 Figure 19 p.24]

### 8.6 1401 compatibility mode card handling

In 1401-compatibility mode the 1410 fills read-buffer positions 1-14 and 66-80 with valid blanks for 51-column cards; a group-mark-with-word-mark is needed in position 52 in **1410 mode only**. [verified — A22-0526-3 p.64, p.100]

---

## 9. Open questions / residual uncertainty

| Item | Confidence | What it blocks | Fallback |
|---|---|---|---|
| Exact slug order of the standard (non-preferred) 240-slug A and H chains | unverified — not in the 1410 PoO; GA24-3073 gives only the Preferred Character Set train | Cycle-accurate print timing only; nothing in glyph mapping | Treat print as instantaneous; model line rate from the model's lpm figure |
| 1415 console I/O printer typeball glyphs for the 16 non-1403-printable codes (the console can type all 64 per PoO p.6) | unverified — Figure 4 gives symbol names only | Console/typewriter output fidelity | Use the Unicode substitutes in §2 and make them configurable |
| Unicode rendering of the word separator and segment mark (PoO draws WS as a hooked tilde, SM as a triple vertical bar; Van Snyder uses `=`-style names) | unverified — an emulator choice | Nothing functional; display only | Pick `⌒` / `⧻` (or SimH's `` ` `` / `_`) and document it |
| `?` (12-0) printing `+` on an H chain | likely — derived, no primary "prints as" column for H | 1403 output fidelity when an H chain is configured | Default to the A chain, where the PoO footnote is primary |
| Whether any 1410 site ran a 63- or 120-character chain | unverified — no primary evidence; UCS is S/360-only | Nothing; 48 is documented for 1401/1410 attachment | Implement 48 graphics only |
| Glyph-cell contents of Figures 2/3/4 and the GA24-3073 Preferred Character Set train order were read from scanned images; the PDFs' OCR layer does not carry figure cells | likely for glyph names, verified for bits/punches (corroborated by SimH and Van Snyder) | Glyph naming only, not code assignment | Trust the bit/punch columns fully; treat glyph names as re-checkable against a clean scan |

Closed by verification: the 1402's behaviour when punching the A-bit-only code on a 1410 — see §2.1, the PoO answers it explicitly.

---

## Sources

- IBM 1410 Principles of Operation, A22-0526-3 (primary; Figures 2, 3, 4 p.6-7; sign Figure 11 p.16; Digit Coding p.16; MCS zone removal p.27; Compare p.28-29; Edit p.31-33; 1403 p.67; word marks / print p.80-81; 1401 compatibility p.100) — https://bitsavers.org/pdf/ibm/1410/A22-0526-3_1410_princOps.pdf
- IBM 1401 Data Processing System Reference Manual, A24-1403-5 (Apr 1962) — Figure 267 "Character Code Chart in Collating Sequence" p.170; Figure 266 op codes p.169; Figure 19 SPS mnemonics p.24; arithmetic/sign p.28-30 — http://bitsavers.informatik.uni-stuttgart.de/pdf/ibm/1401/A24-1403-5_1401_Reference_Apr62.pdf (bitsavers.org main host returns 403 to curl; the Stuttgart mirror works)
- IBM 1403 Printer Component Description, GA24-3073-8 — p.5 arrangements A/H, p.25 Preferred Character Set train sequence, p.26-27 UCS and AN/HN dualing — https://ibm-1401.info/IBM-1403_Manual_A24-3073.pdf
- Van Snyder, IBM 1401/1440/1460/1410/7010 Character Code Chart in BCD Order and in Collating Sequence — https://ibm-1401.info/Van1401-CodeChart.pdf
- SimH I7000 1410/7010 emulator — `cmp_order[0100]` collate table and op-code decode — https://github.com/simh/simh/blob/master/I7000/i7010_cpu.c
- SimH I7000 — `mem_to_ascii[64]` BCD→ASCII table — https://github.com/simh/simh/blob/master/I7000/i7010_sys.c
- SimH I7000 — op-code character definitions (`OP_CC2`, `OP_SSF2`, `OP_PRI` are 1410; `OP_IO3`, `OP_IO4` are 7010-only) — https://github.com/simh/simh/blob/master/I7000/i7010_defs.h
- ibm-1401.info 1401 Card Code chart (BCD/octal order) — https://ibm-1401.info/1401CardCode1.html
- Doug Jones, punched card codes (1401 section) — https://landley.net/history/mirror/pre/punchedcards/codes.html
- ibm-1401.info, Print Character Wars (A vs H chain practice) — https://ibm-1401.info/PrintCharacterWars.html
- ibm-1401.info, 1403 Fonts, Slugs and Chains — https://ibm-1401.info/1403Fonts.html
- Wikipedia, BCD (character encoding) — https://en.wikipedia.org/wiki/BCD_(character_encoding)
- Wikipedia, IBM 1401 — https://en.wikipedia.org/wiki/IBM_1401
- bitsavers IBM 1410 directory (other editions: A22-0526 1961, -2 May 63; A22-1407-2 1410 reference; Autocoder C28-0309/-0326) — http://bitsavers.org/pdf/ibm/1410/
