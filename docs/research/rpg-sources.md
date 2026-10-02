# IBM 1410 RPG: what survives, what does not, and what to build from

Scope: sources for implementing "RPG specification sheets → Autocoder source" in the 1410 emulator.
Companion to `software.md` §12.5, which this file corrects and extends in three places (see §7).

Confidence tags on every claim: `[verified]` = read in a primary document or artifact I opened;
`[likely]` = strong inference from primary evidence; `[unverified]` = plausible, unchecked.

---

## 1. Implementer summary

1. **The 1410 RPG manual C28-1443 is not digitised anywhere I can find.** Not on bitsavers (whole-site
   index checked, 93,668 files), not on archive.org, not in the CHM catalog, not on ibm-1401.info,
   not indexed by Google/Google Books. `[verified]`
2. **The four specification sheets are shared 1401/1410 forms, and that is documented twice.** The
   IBM 1410/7010 Bibliography and the 1410 publications index both title X24-1336/1337/1338/1339 as
   **"1401-1410 Report Program Generator — Input / Data / Calculation / Format Specification Sheet"**,
   and the bibliography's abstract says they are "for use with the Report Program Generator for IBM
   **1401/1410 Card Systems**". `[verified]` So the 1401 sheet layout in J24-0215-2 is not a guess-proxy —
   it is the same physical form, at least for the card-oriented variant.
3. **The 1410 RPG processor itself survives, in object form, on the bitsavers 1410-PR-108 system-tape
   image.** Phases `RPG1`–`RPG13`, `RPGIN`, `RPGDA`, `RPGCL`, `RPGFM`, `RPGED` are present, with
   readable Autocoder skeleton text and operator messages including `END INPUT SPECS`, `END DATA SPECS`,
   `END CALC SPECS`, `CARD MISSING BEFORE FORMAT SPECS`, `OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC`,
   and `END OF RPG.BEGIN AUTOCODER`. `[verified]` — see §4 for offsets and the decode recipe.
4. **C28-1443 documents *two* 1410 RPGs: Card-RPG and Full-RPG.** Card-RPG for card-oriented
   installations; Full-RPG for input on cards, tape, **1405** or 1301 disk. Only Full-RPG (1410-RG-910)
   and the 1301 version (1410-RG-943) carry program numbers in the Jun-68 catalog. `[verified]`
5. **Recommendation:** implement the 1401 layout from J24-0215-2 verbatim (§6), label it in code as the
   1401/1410 shared card layout, and gate the 1410-specific deltas (§5) behind the recovered evidence.
   Do not invent columns. Defer any 1410-only widening (record positions > 999, 5-digit addressing)
   until either C28-1443 surfaces or someone disassembles `RPGIN` off the PR-108 image.

---

## 2. What survives, and where

### 2.1 The 1410 RPG processor, as executable object code

| Item | Location | Note |
|---|---|---|
| 1410-PR-108 system tape image (Jaeger 2024 scan) | `http://bitsavers.org/bits/IBM/1410/1410-PR-108/jpr108-2024.bcd` (1,392,339 bytes) and `.zip` | Contains Autocoder, IOCS, two FORTRANs, COBOL **and RPG** `[verified]` |
| Same, second surviving image (Pierce) | via `sky-visions.com/ibm/ibm7010_soft.shtml` — 4,616,734 bytes | Different artifact; not examined here `[verified — sizes per software.md]` |

sky-visions states for PR108: *"The tape includes Autocode, IOCS, 2 Fortran compilers, Cobol and RPG."* `[verified]`

### 2.2 Metadata about C28-1443 (the manual itself is missing, its abstract is not)

- **IBM 1410/7010 Bibliography, A22-6826-4** — `http://bitsavers.org/pdf/ibm/1410/A22-6826-4_1410_biblio.pdf`
  (OCR text: `https://archive.org/download/bitsavers_ibm1410A22_1893360/A22-6826-4_1410_biblio_djvu.txt`)
  - Part 1, subject code 28: *"Report Program Generator for the 1410 — C28-1443"* (≈ p. 4-5) `[verified]`
  - Part 3 abstract (≈ pp. 12-13), quoted in full below `[verified]`
  - Part 1 supplies list (≈ p. 6) and Part 3 abstract (≈ p. 14) for the X24 forms `[verified]`
- **IBM 1410 Publications Index, N20-1410-27 (Aug 1968)** — `http://bitsavers.org/pdf/ibm/1410/N20-1410-27_pubIndex_Aug68.pdf`
  (no text layer in the PDF; OCR at `https://archive.org/download/bitsavers_ibm1410N20_681067/N20-1410-27_pubIndex_Aug68_djvu.txt`)
  - Subject code 28 lists exactly one item: **`C28-1443-1`** — i.e. at least one revision exists `[verified]`
- **Catalog of Programs, C20-1602-8 (Jun 1968)** — `http://bitsavers.org/pdf/ibm/1410/C20-1602-8_1410_pgmCatJun68.pdf`
  (OCR at `https://archive.org/download/bitsavers_ibm1410C208_4456778/C20-1602-8_1410_pgmCatJun68_djvu.txt`)
  - `1410-RG-910` version 4 mod 3, last modified **02/10/64**; `1410-RG-943` version 1 mod 3, **03/17/64** `[verified]`

**C28-1443 abstract, verbatim from A22-6826-4** (OCR, IBM's lowercase-smallcaps mangled):

> **C28-1443 Report Program Generator for the 1410** — This publication describes the two versions of the
> IBM 1410 RPG that are available: Card-RPG and Full-RPG. The former is designed for use by card-oriented
> installations; the latter is designed for use by 1410 installations that want to write reports from files
> contained on cards, tape, and 1405 or 1301 Disk Storage. The Report Program Generator is a programming
> system designed to create object programs that write reports from input data files that are on cards, tape,
> 1405 Disk Storage, and 1301 Disk Storage. The programmer uses the RPG language to give control
> specifications to the RPG processor, and the processor produces an object program that reads the input
> data file and writes the report. **(96 pages)** `[verified]`

### 2.3 The specification-sheet forms (not scanned; titles confirmed twice)

**A22-6826-4, Part 3 abstract** (≈ p. 14), verbatim:

> **X24-1336, X24-1337, X24-1338, X24-1339 — IBM 1401-1410 Report Program Generator Input Specification
> Sheet.** These forms are provided by Programming Systems for use with the Report Program Generator for
> IBM **1401/1410 Card Systems**. (25 per pad, 11 x 8½). The electro cards are to be ordered through the
> card plants. Form X24-1336 Electro Card N 12836 / Form X24-1337 Electro Card N 12837 /
> Form X24-1338 Electro Card N 12835 / Form X24-1339 Electro Card N 12834 `[verified]`

(The abstract's *title* collapses all four under "Input Specification Sheet"; that is IBM's own sloppiness,
not a claim that all four are input sheets. `[likely]`)

**N20-1410-27 (Aug 1968), section 80 Installation Supplies** — the four are individually titled: `[verified]`

| Form | Title in the 1410 publications index | Revision level (Aug 68) |
|---|---|---|
| X24-1336 | 1401 - 1410 Report Program Generator **Input** Specification Sheet | -1 |
| X24-1337 | 1401 - 1410 Report Program Generator **Data** Specification Sheet | -2 |
| X24-1338 | 1401 - 1410 Report Program Generator **Calculation** Specification Sheet | -3 |
| X24-1339 | 1401 - 1410 Report Program Generator **Format** Specification Sheet | -1 |
| X24-1350 | 1240 - 1401/60 - 1410/7010 - 1440 Autocoder Coding Sheet | -5 |

**Cross-check against the 1401 side.** N20-1401-42 (1401/1460 Accumulative Index, May 1967,
`http://bitsavers.org/pdf/ibm/1401/N20-1401-42_1401_1460_Accumulative_Index_of_Publications_and_Programs_May67.pdf`)
lists the *same revision levels* but titles only X24-1336 and X24-1339 as "1401/1410"; X24-1337 and
X24-1338 are titled "1401" there. `[verified]` The 1410's own index calls all four 1401-1410. Treat the
1410 index as authoritative for the 1410 and the discrepancy as an indexing artifact. `[likely]`

Note also `X24-6591-0/-1  1401/40/60 Report Program Generator Data Specifications` in the 1401 index — a
later, **1401-only** replacement Data sheet. `[verified]` If the 1410 kept X24-1337 while the 1401 moved to
X24-6591, the sheets diverged after ~1964. `[unverified]`

### 2.4 The 1401 RPG family on bitsavers (the usable proxies)

| Form | Title | URL |
|---|---|---|
| **J24-0215-2** | Report Program Generator, IBM 1401 **Card and Tape** Systems (© 1960, 1961; Feb 1965 reprint; 76 pp.) | `https://bitsavers.org/pdf/ibm/1401/J24-0215-2_cardTapeRPG.pdf` |
| C24-3166-1 | 1401/60 Basic 4K RPG Specifications | `https://bitsavers.org/pdf/ibm/1401/C24-3166-1_1401_basic4kRPG.pdf` |
| C24-3267-0 | Basic 4K RPG Operating Procedures | `https://bitsavers.org/pdf/ibm/1401/C24-3267-0_4K_RPG_operProcd.pdf` |
| C24-3261-0 / -1 | RPG on Disk, Specifications | `https://bitsavers.org/pdf/ibm/1401/C24-3261-0_RPG_on_Disk_Specifications_Sep64.pdf` |
| C24-3334-0 | RPG on Disk, Operating Procedures | `https://bitsavers.org/pdf/ibm/1401/C24-3334-0_1401_Report_Program_Generator_on_Disk_Operating_Procedures_1964.pdf` |
| C24-1464-2 / -3 | FARGO for the IBM 1401 | `https://bitsavers.org/pdf/ibm/1401/C24-1464-3_1401_fargo.pdf` |

**J24-0215-2 is the right proxy**, not the 4K or Disk manuals: it is the card-**and-tape** RPG, matching the
1410's Full-RPG feature envelope more closely than the 4K subset. Its own text confirms the second phase
emits **1401 SPS or Autocoder symbolic** source — the same preprocessor shape as the 1410. `[verified — J24-0215-2 p.3]`

---

## 3. What does not survive — searches already run, do not repeat

| Target | Where searched | Result |
|---|---|---|
| `C28-1443` PDF | bitsavers `/pdf/ibm/1410/`, `/pdf/ibm/1401/`, `/pdf/ibm/140x/` (404), `/pdf/ibm/rpg/` (404), and the **whole-archive `pdf/IndexByDate.txt` (93,668 entries)** — zero hits for `C28-14xx` anywhere in the archive | **not present** `[verified]` |
| `C28-1443` | archive.org advancedsearch: `C28-1443`, `1410 report program generator`, `title:(1410) AND title:(report program generator)`, `"1410-RG-910"`, `X24-1336` | 0 relevant hits `[verified]` |
| `C28-1443` | Google Books API (`"C28-1443"`, `"Report Program Generator for the 1410"`) — quota-limited on the second pass; first pass empty | nothing `[verified for pass 1]` |
| `C28-1443` | HathiTrust full-text (`babel.hathitrust.org/cgi/ls`) | no result rows returned `[verified]` |
| `C28-1443` / 1410 RPG | Computer History Museum collections search (web + fetch) | catalog is JS-driven; no 1410 RPG item surfaced. **CHM holds 1401/1440/360 RPG items but nothing 1410-RPG.** `[likely]` |
| `C28-1443` | WorldCat (via search engine) | nothing `[unverified — WorldCat itself not queried directly]` |
| X24-1336…1339 sheet scans | bitsavers whole-archive index (`X24-133x`), archive.org, ibm-1401.info `docss.html` document inventory, ed-thelen.org, ibm-1401.info RPG page | **no scan of any of the four forms exists** `[verified]` |
| 1410 RPG pages | ibm-1401.info `RPG-1401.html` (the 1401 RPG/FARGO oral-history page) | the 1410 is **not mentioned at all** on that page `[verified]` |
| 1410 RPG docs | Jay Jaeger's `computercollection.net/ibm1410/` | no RPG material surfaced in search `[likely]` |
| Card-RPG program number | C20-1602-8 (Jun 68) and N20-1410-27 (Aug 68) program lists | only `1410-RG-910` ("Full RPG C/T 1405 Disk", under PR-108) and `1410-RG-943` ("Report Program Generator", under PR-134). **Card-RPG has no 1968 program number** — withdrawn, or Type III. `[verified for absence; unverified for cause]` |

**Do not** re-run: the bitsavers full index, the archive.org metadata queries, or the ibm-1401.info sweeps.
**Worth trying if someone is determined:** WorldCat directly; the CHM's non-public catalog API; the
Charles Babbage Institute; the University of Manchester "History of Computing: Technical Manuals" collection
(which does hold 1400-series manuals); eBay/`IBM manuals DVD` aggregators.

---

## 4. Primary artifact: the 1410 RPG processor on the PR-108 tape image

This is the most load-bearing new finding. The 1410 RPG object program survives and is readable.

### 4.1 Decode recipe (reproducible)

The `.bcd` file is one byte per 1410 character. `byte & 0x3F` is the BCD code (B A 8 4 2 1);
`0x40` is the parity/C bit; `0x80` is the word mark. Map `byte & 0x3F` through the standard 1401/1410
internal-code table (`0o00`=blank, `0o01–0o11`=1–9, `0o12`=0, zone `0o20`=A-zone S–Z, `0o40`=B-zone J–R,
`0o60`=BA-zone A–I) and the text falls out. Verified by the appearance of `FORTRAN`, `AUTOCODER`, `COBOL`,
`RPG` and the known version stamp `* COMPILED BY FORTRAN II, #1410-FO-913, VERSION 05 LEVEL00`. `[verified]`
Letters and digits decode correctly; several special characters in my table are guesses and print as `=`,
`?`, `\x1f` — irrelevant for string mining, relevant if you decode instruction operands. `[verified]`

### 4.2 Where RPG lives in `jpr108-2024.bcd` (byte offsets, 1:1 with the decoded stream)

| Offset | Content |
|---|---|
| 501,525 – 539,427 | RPG skeleton in **symbolic Autocoder card-image form** — `080 DTF READER0 R`, `FILETYPE READER R`, `IOAREA REC1N R`, `RDCD1 SBR BCCK1`, `ME5G1 DCW @INPUT REC OUT OF SEQ@`, `ME5G2 DCW @RECORD TYPE NOT FOUND@`, terminated by `LAST CARD  1410  RPG` |
| 1,107,574 – 1,254,470 | The RPG **processor phases**, condensed: `RPG1` … `RPG13`, `RPGIN`, `RPGDA`, `RPGCL`, `RPGFM`, `RPGED`, `RPGCL`; ends `END OF RPG` / `END OF RPG.BEGIN AUTOCODER` at 1,247,985 |

`[verified — all offsets read directly out of the decoded image]`

### 4.3 Phase names decode the sheet set

`RPGIN` / `RPGDA` / `RPGCL` / `RPGFM` / `RPGED` = **In**put, **Da**ta, **C**a**l**culation, **F**or**m**at, **Ed**it.
Independent confirmation that 1410 RPG uses the identical four-sheet vocabulary as 1401 RPG — not RPG II's
File-Description / Input / Calculation / Output-Format. `[verified]`

### 4.4 Recovered operator/diagnostic messages (1410 RPG, not 1401)

```
10802  EOJ-NO RG CONTROL CARD
10803  EOJ-NO 1405 CONTROL CARD
10804  EOJ-NO 1301 CONTROL CARD
10805  EOJ-ERRONEOUS RG CARD
10806  EOJ-ERRONEOUS 1301 CARD
TERMINATE RUN. * CARD MISSING BEFORE FORMAT SPECS
OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC
NO OUTPUT SPECIFIED  CD
END INPUT SPECS
END DATA SPECS
END CALC SPECS
END OF RPG
END OF RPG.BEGIN AUTOCODER
SEQUENCE ERROR INPUT FILE
```
`SEQUENCE ERROR INPUT FILE` is a **processor-phase diagnostic**, decoded at zero-based byte
1,109,450 inside the processor range 1,107,574-1,254,470. It is not in the generated skeleton.
`[verified]` Messages in the **generated** program's skeleton (not the processor):
`INPUT REC OUT OF SEQ` at byte 532,377 and `RECORD TYPE NOT FOUND` at byte 526,959. `[verified]`

Ignore `DIAGNOSTIC ERRORS PRESENT IN SOURCE STATEMENTS` and `COMMON CARD ERROR` — those sit at offsets
1,101,004 / 1,101,123, inside the **FORTRAN/Autocoder** region, not RPG. `[verified]`

### 4.5 Reserved names visible in the 1410 skeleton

`PAGENO`, `SER`, `WORD`, `LC`, `OF` all appear as literals in the RPG phase region — the same reserved
vocabulary as 1401 RPG. `[verified]` `SCF`, `RCT` and `CNTL` did not appear as plaintext literals; absence
here is weak evidence (they may be built from pieces or table-encoded). `[verified for absence; no conclusion]`

---

## 5. 1401 RPG vs 1410 RPG — what can actually be established

### Established as the same

| Item | Evidence |
|---|---|
| The four sheets: **Input, Data, Calculation, Format** | Shared X24-1336/1337/1338/1339 forms `[verified]`; `RPGIN/RPGDA/RPGCL/RPGFM` phase names on the PR-108 tape `[verified]`; `END INPUT/DATA/CALC SPECS` and `LINE FORMAT SPEC` messages `[verified]` |
| Deck order (control card, then input, data, calculation, format) | 1401: J24-0215-2 p.44 `[verified]`. 1410: `CARD MISSING BEFORE FORMAT SPECS` implies the same ordered scan `[likely]` |
| Preprocessor shape: specs → **symbolic Autocoder source** → assembly | 1401: J24-0215-2 p.3 `[verified]`. 1410: C20-1602-8 abstracts + `END OF RPG.BEGIN AUTOCODER` on tape `[verified]` |
| Reserved names `PAGENO`, `SER`, `WORDxx`, conditions `OF`/`LC` | 1401 manual `[verified]`; literals on the 1410 tape `[verified]` |
| Physical form layout (columns per field) | Same X24 form numbers, same revision levels, same pads — the sheets *are* the 1401 sheets `[verified for the card systems]` |

### Established as different

| Item | 1401 | 1410 | Evidence |
|---|---|---|---|
| Control card | one card, `CNTL` in cols 1-4 | an **`RG` card**, plus a **1405 control card** and/or a **1301 control card** when disk input is used | 1401: J24-0215-2 p.44 `[verified]`. 1410: `EOJ-NO RG CONTROL CARD` / `EOJ-NO 1405 CONTROL CARD` / `EOJ-NO 1301 CONTROL CARD` / `EOJ-ERRONEOUS RG CARD` / `EOJ-ERRONEOUS 1301 CARD` `[verified]` |
| Product structure | one RPG per configuration | **two documented versions**, Card-RPG and Full-RPG | A22-6826-4 abstract `[verified]` |
| Input device set | cards, tape (J24-0215-2); disk in a separate manual | cards, tape, **1405** and 1301 disk in one manual | A22-6826-4 abstract `[verified]` |
| Generated-program I/O | 1401 inline / hand-coded | **1410 IOCS** (`DTF`, `FILETYPE`, `GET`, `PUT`, `OPEN`, `CLOSE` macros visible on tape) | C20-1602-8 `[verified]`; tape skeleton `[verified]` |
| Object-program addressing | 3-char addresses | 5-char addresses; skeleton allocates `CDRD1 DA 1X1000` (1000-char input area) | tape `[verified]` |
| Control-card machine-size field | 1401 core codes 1-6 (1400…16000) | must encode 10K-80K; encoding unknown | `[unverified]` |

### The one genuinely open layout question

The 1401 sheets use **3-column record-position fields** (Input cols 6-8 position, 24-26 field end,
44-46 control-field end; Format 35-37 field end) — max position 999. The 1410 Full-RPG skeleton allocates a
1000-character input area and supports blocked tape and disk records. Either (a) the shared X24 forms are
literally the Card-RPG forms and Full-RPG used something wider, or (b) Full-RPG accepted 3-digit positions
and capped record addressing at 999, or (c) a column was redefined. The bibliography's own wording —
"for use with the Report Program Generator for IBM **1401/1410 Card Systems**" — points at (a). `[unverified]`
**This is the single question that C28-1443 or an `RPGIN` disassembly would settle.**

---

## 6. The 1401 spec-sheet column layout, from J24-0215-2

All page references are printed page numbers, which match PDF page numbers in the bitsavers scan.
Card layout is 80 columns throughout; columns 76-77 = page number, 78-80 = card number on all four sheets.
`[verified — J24-0215-2 pp. 21-22, 26-28, 33-34, 43-44]`

**Sheet-identifying character in column 1:** `C` = Input, `D` = Data, `A` = Calculation,
`L`/`F`/`B`/`K`/`W` = Format. `[verified]`

### 6.1 Input Specifications — form X24-1336 (summary, pp. 21-22)

| Cols | Name | Content |
|---|---|---|
| 1 | C | `C` for every line-entry that specifies a record type. |
| 2-3 | Seq | Two-digit numerical sequence order (ascending) if a fixed record-sequence within a control group is required; two alphabetic letters if not required, or if only one record-type per control group. Max 20 unique two-character sequence specs. |
| 4 | Number | `1` if only one such sequential record per control group; `N` if more than one; blank for non-sequential. (On an `SCF` line this column instead holds the control-field number.) |
| 5 | Option | `X` if presence of this sequential record-type is optional; blank if required; blank for non-sequential. |
| 6-8 | Position | Record position (card column / tape-record position) of the record-code character. |
| 9 | Not | `N` if the **absence** of the code character identifies this record-type; blank if presence does. |
| 10 | Z/D/C | `Z`, `D`, or `C` — compare zone portion, digit portion, or full character. |
| 11 | Code | The record-code character. Any valid alphameric including blank. |
| 12-17, 18-23, 24-29, 30-35, 36-41 | Record codes 2-6 | Five more codes, each a 6-column group with the same Position / Not / Z-D-C / Code sub-layout as 6-11. All codes for one record type are in an **and** relation. |
| 42-43 | Resulting Condition | Unique two-digit number (00-99) representing the presence of this record-type in the input area. Present only on the **last** line-entry for a record type. |
| 44-46 | Field End | Position of the **units** (rightmost) position of control field 1 — the **most minor** control field. |
| 47-48 | Field Length | Length of control field 1. |
| 49-53, 54-58, 59-63, 64-68, 69-73 | Control fields 2-6 | Same End(3)/Length(2) sub-layout, in **ascending order of significance** left-to-right. Max six control fields. |
| 74-75 | — | Not used. |
| 76-77 | Page | Page number (from the sheet's upper-right corner). Spacing chart is page 01. |
| 78-80 | Card Number | First 20 lines prenumbered 010-200; six unnumbered lines at the bottom; insertions get units digits 1-9 (up to nine between consecutive prenumbered statements). |

**Special `SCF` entry** (p. 21): when numerically-sequenced record types are used, a line with **`SCFx` in
columns 1-4** must follow the last record specification, where `x` is the number of the control field that
governs the sequence. Every application with sequential-record specs needs one. `[verified]`

**Multi-line record types** (p. 20): >6 record codes ⇒ continuation lines each with `C` in column 1 and no
resulting-condition; only the last line carries cols 42-43 and the control-field entries. `[verified]`

### 6.2 Data Specifications — form X24-1337 (summary, pp. 26, 28)

| Cols | Name | Content |
|---|---|---|
| 1 | D | Always `D`. |
| 2-7 | Field Name | Unique alphabetic data-field name, ≤6 chars, left-justified. No digits or specials. |
| 8-10 | Field Length | Unedited data-field length (length excluding punctuation inserted by program editing). |
| 11, 14, 17 | Status | `B` (blank), `Z` (zero), `N` (negative, incl. minus zero), `P` (positive, incl. plus zero) — one, two, or all three columns; else blank. |
| 12-13, 15-16, 18-19 | Resulting Condition | Two-digit number (00-99) paired with the status in 11/14/17. Must not collide with resulting-conditions defined on the input or calculation sheets. Status is evaluated **after** the source operation completes. |
| **20-36** | **First field source** | See sub-layout below. |
| 20-22 | Field Source | `Cxx` (a record type from input cols 1-3), `PAG`, `SER`, or `RCT`. |
| 23 | Numeric | `N` = strip zones from all positions except units (creates a 12-zone in units if none present); `M` = month-field conversion; else blank. |
| 24-26 | Field End | Units position of the field in the **source** record. Blank for PAG/SER/RCT. |
| 27-29 | Field Length | Source field length, only if different from cols 8-10. For an `M` entry, holds the three single characters representing October, November, December. Blank for PAG/SER/RCT. |
| 30 | Operation | blank = move; `A` = add; `S` = subtract; `0+` (punch 12,0) = reset-add; `0-` (punch 11,0) = reset-subtract; `D` = move numerical portion of a single character to the units position; `Y` = move zone portion of a single character to the units position. `D`/`Y` take no field length and must follow any other operation on the same line. |
| 31-33 | Cond. | First condition governing the operation: `SB`,`SC`,`SD`, `F1`-`F6`, a resulting-condition number from the input sheet or another data line; `N` in col 31 negates. |
| 34-36 | Cond. | Second condition; the two are in an **and** relation. |
| 37-53 | Second source | Same sub-layout as 20-36. |
| 54-70 | Third source | Same sub-layout as 20-36. |
| 71-75 | — | Not used. |
| 76-77 | Page | Page number. |
| 78-80 | Card Number | Card number. |

**>3 sources for a field** (p. 24): continuation line with `D` in column 1, columns 2-19 blank,
columns 20-70 carrying the remaining sources. `[verified]`
**Ordering matters** — the object program applies sources left-to-right in sheet order, so the
reset-add / reset-subtract source must be written first. `[verified — p. 24]`
**PAGENO** is the one mandated name: the page counter's field name must be `PAGENO`, and only one may
exist per application. `[verified — p. 26]`

### 6.3 Calculation Specifications — form X24-1338 (summary, pp. 33-34)

| Cols | Name | Content |
|---|---|---|
| 1 | A | Always `A`. |
| 2-7 | Field Name | Name of the data field receiving the result. **Blank** if this is a comparison (`C` in col 29), or if the result goes into the same data field as a preceding line-entry. |
| 8-10 | Field Length | Unedited data-field length. For **multiply**: ≥ (digits in multiplier + digits in multiplicand − position-adjust). For **divide**: ≥ (digits in dividend − position-adjust). |
| 11, 14, 17 | Status | `B`, `Z`, `N`, `P`, `U`, `E`, `H`, `L` in one, two, or all three columns. `H` and `L` require the 1401 **High-Low-Equal Compare** special feature. |
| 12-13, 15-16, 18-19 | Resulting Condition | Unique two-digit number per status specified. |
| 20-25 | Factor 1 | Field name or literal. A field name must already exist in data cols 2-7, an earlier calculation line, or a format-sheet `W`-entry. |
| 26-28 | Length | Factor 1 unedited field length. |
| 29 | OP | `+`, `-`, `X`, `/`, `C` (add, subtract, multiply, divide, compare). |
| 30-35 | Factor 2 | Field name or literal. |
| 36-38 | Length | Factor 2 unedited field length. |
| 39 | A/S/0+/0- | `A`, `S`, `0+`, `0-` — whether the two-factor result (or, if only factor 2 is given, factor 2 itself) is added, subtracted, reset-added, or reset-subtracted into the field named in cols 2-7. |
| 40-42, 43-45, 46-48 | Condition | Up to three conditions (and relation). Permitted: any resulting-condition from the input, data, or earlier calculation lines, plus `LC`, `F1`-`F6`, `SB`-`SD`, and negations. Blank = unconditional. |
| 49 | Total/Detail | `T` = perform at total time, `D` = at detail time. **Must not be blank.** |
| 50-51 | Half Adjust | Position number to be half-adjusted in the result. |
| 52-53 | Position Adjust | Highest-order position to be dropped from the result; that position and everything to its right is dropped. |
| 54-75 | — | Not used. |
| 76-77 | Page | Page number. |
| 78-80 | Card Number | Card number. |

### 6.4 Format Specifications — form X24-1339 (summary, pp. 43-44)

Column 1 selects which half of the sheet is in play: `L` ⇒ line entry (cols 2-28 used, 29-75 blank);
`F`/`B`/`K`/`W` ⇒ field entry (cols 2-28 blank, 29-75 used). Cols 76-80 apply to both. `[verified — p. 38]`

| Cols | Name | Content |
|---|---|---|
| 1 | Format | `L` = line spec. `F` = field spec, field **not** blanked after output. `B` = field spec, field **blanked** after output (readout-and-reset, as on an accounting machine). `K` = field spec that **uses** a constant (field-name columns must be blank). `W` = field spec that **defines** a constant or edit control-word (field name must be `WORDxx`, xx = 00-99). |
| **2-28** | **Line specification** | |
| 2-4 | Line | Line-identification code from the spacing chart: col 2 = type (`H` heading, `D` detail, `T` total), col 3 = level (numeric hierarchy 1-8, or alphabetic for independent lines), col 4 = line number within level (numeric, or a letter if the level is alphabetic and unique). |
| 5 | Print | `X` if this line is printed. |
| 6 | Punch | `X` if this line is punched. |
| 7 | Reserved | `X` if this line is written on magnetic tape. (Any combination of 5/6/7 is allowed.) |
| 8-10 | Next Line | Line-identification code of the line that unconditionally follows. Must be the same type and level — i.e. cols 8-9 must equal cols 2-3. Blank if none. |
| 11-12 | Space Before | `01`, `02`, `03` = single/double/triple space before printing. |
| 13-14 | Space After | Same, after printing. |
| 15-16 | Skip Before | `01`-`12` = skip to carriage-tape channel 1-12 before printing. |
| 17-18 | Skip After | Same, after printing. |
| 19 | Stacker | `4` or `8` to select the punched card into 1402 stacker 4 or 8; blank = no selection. |
| 20-22 | Line Output Condition | Any resulting-condition number from the input/data/calculation sheets, plus `OF` (overflow), `LC` (last card), `1P` (first page), `F1`-`F6`, `SB`-`SD`, and negations. |
| 23-25, 26-28 | Conditions 2, 3 | Two more, in an **and** relation. Left blank if this line is reached as another line's Next Line. |
| **29-75** | **Field specification** | |
| 29-34 | Field Name | For `B`: a name from data or calculation cols 2-7. For `F`: the same, or a `WORDxx` defined by a `W`-entry. For `K`: **blank**. For `W`: `WORDxx`. Left-justified. |
| 35-37 | Field End | Print position of the field's rightmost position, from the spacing chart. Blank for a `W`-entry. |
| 38-40 | Field Output Condition | Same condition vocabulary as cols 20-22. |
| 41-43, 44-46 | Conditions 2, 3 | And relation. All of 38-46 blank ⇒ unconditional. |
| 47 | Zero Suppress | `Z` to zero-suppress without an edit control-word (suppresses high-order zeros and strips the units-position zone). |
| 48-50 | Field Length | Length of the edit control-word or constant defined in cols 51-75. |
| 51-75 | Constant or Edit Control Word | The literal itself (numeric or alphameric) or the edit word, **left-justified in column 51**. Editing follows the 1401 program-editing rules in A24-1403. |
| 76-77 | Page | Page number. |
| 78-80 | Card Number | Card number; first 20 lines prenumbered. |

**Ordering rules** (p. 43): the first entry on the sheet must be a line (`L`) spec; every line spec is
followed by the field entries for that line (fields may be in any order among themselves); lines appear in
output order — **descending level for heading lines, ascending level for total lines**.
`W`-entries may appear anywhere except the first line. `[verified]`

**Or-conditions**: repeat the entry. A second `L` line with the same identification and a different
condition set expresses an *or*; likewise a repeated field entry. `OF` may participate in an *or* group only
if it is part of **every** alternative. `[verified — p. 38]`

**Line classification (spacing chart, pp. 12-16)**: line id = type + level + number. Type ∈ {H, D, T}.
Numeric levels are hierarchical (up to 8 per type); alphabetic levels mark independent lines (e.g. page-overflow
headings `HBx`, standalone detail `DAA`). Level number ≠ control-field number. `[verified]`

### 6.5 RPG Control Card — 1401 (p. 44, Figure 42)

**Superseded on the 1410** — see §5. Recorded for the proxy path and for shape.

| Cols | Punches | Meaning |
|---|---|---|
| 1-4 | `CNTL` | Identifies the card. |
| 5 | 3-6 | Core capacity of the 1401 used to **generate** the object program (Note 1). |
| 6 | 1-6 | Core capacity of the 1401 used to **execute** the object program (Note 1). |
| 7 | `1` or blank | `1` if sense switches B-G are used. |
| 8 | `1` or `2` | 1403 Model 1 (100 print positions) or Model 2 (132). |
| 9 | `M` or blank | `M` if multiply-divide special feature is installed on the object machine. |
| 10-12 | length or `VVV` | Tape input record length; `VVV` for variable-length records. |
| 13-14 | number or blank | Input blocking factor (data records per tape block) for fixed-length blocked input; blank for variable-length. |
| 15 | `1` or blank | `1` if the tape header label is to be bypassed. |
| 16 | 2-9 or blank | Number of tape data files to process; blank if only one. |
| 17-19 | length or blank | Output tape record length; blank if 132 characters. |
| 20-75 | blank | Not used. |
| 76-80 | identification | Program identification punched into the symbolic object deck; blank otherwise. |

**Note 1** — 1401 core-capacity codes: `1`=1400, `2`=2000, `3`=4000, `4`=8000, `5`=12000, `6`=16000. `[verified]`

### 6.6 Source-deck order (p. 44)

1. control card
2. input specifications cards
3. data specifications cards
4. calculation specifications cards
5. format specifications cards

One card per line-entry on the sheets. `[verified]`

### 6.7 51-column card mode (p. 44, "Special Feature Specifications")

On a 1401 with the 51-column card feature, columns 1-51 of a 51-column card correspond to columns 15-65 of
an 80-column card. **Every specified card-column number must therefore be the physical column plus 14.**
E.g. a control field in 51-column columns 2-7 is entered as `021` in input cols 44-46. `[verified]`
Whether the 1410 carried this quirk is `[unverified]`.

---

## 7. Corrections and additions to `software.md` §12.5

1. §12.5 says the bibliography lists "1401-1410 Report Program Generator — **Input** Specification Sheet
   X24-1336..X24-1339". That is the bibliography's abbreviated Part-3 heading. The **1410 publications
   index N20-1410-27** titles them individually as **Input / Data / Calculation / Format**, all four
   labelled "1401 - 1410". `[verified]` The four-sheet identity of 1410 RPG is therefore established, not
   inferred from the 1401.
2. §12.5 does not mention that C28-1443 documents **two** 1410 RPGs — **Card-RPG** and **Full-RPG** — and
   that Full-RPG reads **1405** disk as well as 1301. Card-RPG has no 1968 program number. `[verified]`
   This also softens §12.5's "RPG is no more card-only-runnable than anything else": a *Card-RPG* existed
   and was aimed at card-oriented installations. Its minimum configuration is unknown `[unverified]` —
   it may predate the Jun-68 catalog entirely.
3. §12.5 does not record that **the 1410 RPG processor itself survives** on the bitsavers PR-108 tape image
   (§4). That is the strongest primary source now available and it is already in hand.
4. Minor: C28-1443 reached at least revision **-1** (per N20-1410-27, Aug 68) and runs **96 pages**. `[verified]`

---

## 8. Recommendation

**Build the 1401 layout from §6, verbatim, and label it honestly.**

- Implement the four sheets exactly as §6 specifies, sourced from J24-0215-2. In code and in docs, call it
  *"1401/1410 shared card-system RPG spec-sheet layout, forms X24-1336…1339, per J24-0215-2"* — not "1401
  RPG" and not "1410 RPG". The shared form numbers make this the real layout, not a substitute, for the
  card case. `[verified]`
- **Use the 1410 control-card vocabulary, not the 1401's.** The `RG` card (plus `1405` / `1301` cards) is
  the only 1410-specific fact about the deck we actually have. Emit `EOJ-NO RG CONTROL CARD` etc. by their
  recovered message numbers (10802-10806) if you want fidelity in diagnostics. `[verified]`
- **Emit 1410 Autocoder with IOCS macros**, matching the skeleton on the tape (`DTF`, `FILETYPE READER/PRINTER/PUNCH`,
  `CARDPOC`, `IOAREA`, `EOFADD`, `OPEN`/`GET`/`PUT`/`CLOSE`), not 1401 SPS. `[verified — tape skeleton]`
- **Defer** anything that requires knowing whether 1410 Full-RPG widened the 3-digit position fields.
  Cap record positions at 999 and emit a clear "unsupported: requires C28-1443" error above that, rather
  than inventing a 4- or 5-digit field. `[recommendation]`
- **The recovery path, if fidelity ever matters more than schedule:** disassemble `RPGIN` (offset ≈
  1,217,474 in `jpr108-2024.bcd`) — it is the phase that parses the Input specification cards, so its
  column tests *are* the column layout. That is the only route to a fully verified 1410 layout short of
  C28-1443 turning up. `[recommendation]`

---

## 9. Sources

**Primary, 1410**
- IBM 1410/7010 Bibliography, A22-6826-4 — https://bitsavers.org/pdf/ibm/1410/A22-6826-4_1410_biblio.pdf
  (OCR: https://archive.org/download/bitsavers_ibm1410A22_1893360/A22-6826-4_1410_biblio_djvu.txt)
- IBM 1410 Publications Index, N20-1410-27, Aug 1968 — https://bitsavers.org/pdf/ibm/1410/N20-1410-27_pubIndex_Aug68.pdf
  (OCR: https://archive.org/download/bitsavers_ibm1410N20_681067/N20-1410-27_pubIndex_Aug68_djvu.txt)
- Catalog of Programs, C20-1602-8, Jun 1968 — https://bitsavers.org/pdf/ibm/1410/C20-1602-8_1410_pgmCatJun68.pdf
  (OCR: https://archive.org/download/bitsavers_ibm1410C208_4456778/C20-1602-8_1410_pgmCatJun68_djvu.txt)
- 1410-PR-108 system tape image — http://bitsavers.org/bits/IBM/1410/1410-PR-108/jpr108-2024.bcd
- sky-visions 1410/7010 software page — http://sky-visions.com/ibm/ibm7010_soft.shtml

**Primary, 1401 (the proxy)**
- Report Program Generator, IBM 1401 Card and Tape Systems, J24-0215-2 — https://bitsavers.org/pdf/ibm/1401/J24-0215-2_cardTapeRPG.pdf
- 1401/1460 Accumulative Index of Publications and Programs, N20-1401-42, May 1967 — https://bitsavers.org/pdf/ibm/1401/N20-1401-42_1401_1460_Accumulative_Index_of_Publications_and_Programs_May67.pdf
- 1401/1460 Accumulative Index, N20-1401-48, Aug 1969 — https://bitsavers.org/pdf/ibm/1401/N20-1401-48_1401_1460_Accumulative_Index_of_Publications_and_Programs_Aug69.pdf
- RPG on Disk C24-3261-0 — https://bitsavers.org/pdf/ibm/1401/C24-3261-0_RPG_on_Disk_Specifications_Sep64.pdf
- Basic 4K RPG C24-3166-1 — https://bitsavers.org/pdf/ibm/1401/C24-3166-1_1401_basic4kRPG.pdf
- FARGO C24-1464-3 — https://bitsavers.org/pdf/ibm/1401/C24-1464-3_1401_fargo.pdf

**Secondary**
- ibm-1401.info, RPG and FARGO (oral history; no 1410 content) — https://ibm-1401.info/RPG-1401.html
- Jay Jaeger, The Computer Collection, IBM 1410 — https://www.computercollection.net/ibm1410/ibm1410.htm
- Jaeger's 1410 simulator source — https://github.com/cube1us/1410

**Missing (searched, not found)** — C28-1443 *Report Program Generator for the 1410* (96 pp., rev -1);
forms X24-1336-1, X24-1337-2, X24-1338-3, X24-1339-1.

---

## 10. Phase 5 wave-0 primary read — 2026-09-01

This is the bounded read required by the Phase 5 plan. It adds evidence; it does not silently
rewrite §§1-9. The two artifacts were read as different kinds of authority:

- **IBM 1401**: *Report Program Generator, IBM 1401 Card and Tape Systems*, J24-0215-2,
  pp.10-44. The cited pages were rendered at 200 dpi and read from the page images; OCR was used
  only for navigation. The PDF was 5,783,772 bytes, SHA-256
  `46907c8953f3ceaa889b0d31b4044e76aaee1376185267bd1d075420c1c9360d`.
- **IBM 1410**: the recovered 1410-PR-108 tape image, `jpr108-2024.bcd`, bytes
  501,525-539,427 decoded one byte to one character through `src/core/bcd.ts`, as specified in
  §4.1. The image was 1,392,339 bytes, SHA-256
  `f4926ec7104c1cb969c0968f4a5331ec4791d49b172a0c73f904b9e4223c6668`.

J24-0215-2 is a 1401 manual. A fact below is not a verified 1410 runtime fact merely because the
physical X24-1336 through X24-1339 forms are shared. The 1410 manual C28-1443 remains missing.

### 10.1 `F1`-`F6` and the three-column condition shape

J24-0215-2 p.24 defines `F3` as a change in control field 3 and `NF3` as no change in that field;
p.36 defines `F1`-`F6` collectively as changes in control fields 1 through 6. Pages 20 and 22 make
field 1 the most minor control field and increase significance left to right. This settles the
condition vocabulary for the **1401**: `Fn` means that control field *n* changed, and `NFn` means it
did not. `[verified for the 1401; likely for the 1410 runtime]`

The negation position is no longer an analogy. The Data summary says explicitly that an `N` in
column 31 or 34 negates the condition in that three-column group (p.28). The Calculation example
places `NF3` in columns 40-42 (p.31), and the Format example visibly places `N05` in its first
three-column condition group (p.38, Figure 36). Therefore every three-column condition group is
`[optional N][two-character indicator]`: negation occupies the first column and the indicator is
right-justified in the remaining two. Because the same physical forms are documented for the
1401/1410 card systems (§1 item 2), this is `[verified]` for the shared sheet layout; it does not by
itself verify the 1410 processor's runtime implementation.

### 10.2 Cycle evidence: total, detail, `1P`, `LC`, and `OF`

The 1401 manual draws a firm boundary around extraction of the current input record:

- A total-time calculation occurs after the control-field-change test but before information is
  removed from the record in the input area; the record that caused the break cannot contribute to
  the preceding group's total (J24-0215-2 p.31). Total-line formation is on that same side of the
  boundary (p.35).
- Detail-time calculations occur after that extraction, so the current record can contribute
  (p.31). Heading lines and detail lines are also on the post-extraction side (p.35).
- Numeric levels express a hierarchy. A higher total level forces lower totals first, totals print
  in ascending level order, and headings in descending level order (pp.15, 37). Alphabetic levels
  express independent lines; when independent conditions coincide, those lines appear in Format
  sheet order rather than by an alphabetic-label sort (pp.15-16, 37).

Thus `TOTAL_TIME_PRECEDES_DETAIL_TIME_ON_A_BREAK` is `[verified]` for the 1401 and remains
`[likely]` for the 1410. `THE_LEVEL_ORDERING_RULE_APPLIES_TO_NUMERIC_LEVELS_ONLY` is likewise
`[verified]` for the 1401 hierarchy and `[likely]` for the 1410 runtime.

`1P` is fulfilled before any input record has been read and is intended for first-sheet constants
and headings (p.38). `OF` is overflow and `LC` is last card (p.36). Page-overflow output lines must
use an alphabetic level to mark their independence from a hierarchy (p.35); the worked report's
overflow headings are `HBx` (pp.15-16). `OVERFLOW_HEADING_IS_AN_INDEPENDENT_ALPHABETIC_LEVEL_LINE`
is therefore `[verified]` for the 1401 and `[likely]` for the 1410 runtime.

The bounded pages do **not** state the relative order among detail calculation, heading formation,
and detail-line formation. Page 35 lists all three after extraction and points to block diagrams in
Figures 48-49, outside the bounded pp.10-44 read. It therefore supports, but does not verify,
`HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION`; that row remains `[unverified]` for the 1410 and keeps
the Phase 5 plan's existing default and fallback. The pages likewise define `LC` but do not give it
the detailed timing treatment given to total/detail time or `1P`.

### 10.3 Format edit control words

J24-0215-2 p.39 says explicitly that RPG uses the program-editing rules in the *IBM 1401 Data
Processing System Reference Manual*, Form A24-1403. A one-use edit control word is entered beside
the field it edits; a reused word is defined by a `W` entry named `WORDxx` and referenced by that
name (pp.38-39). Columns 48-50 carry its length and columns 51-75 the word or its name (pp.39, 44).
`EDIT_WORD_RIDES_ON_THE_FIELD_ENTRY` is therefore `[verified]` for the 1401 sheet semantics and
`[likely]` for the 1410 processor.

A24-1403 is a **1401** authority, not a 1410 one. The emulator's 1410 editing semantics remain
those of MCE in A22-0526-3 pp.31-33, as already recorded in the plan. The matching worked example
supports but does not prove that the 1410 RPG processor used that control word unchanged, so
`EDIT_WORD_IS_THE_1410_MCE_CONTROL_WORD` remains `[likely]`; the zero-suppress-only fallback remains
the frozen alternative.

### 10.4 The recovered 1410 generated-program skeleton

The bounded PR-108 slice is the direct 1410 evidence. Selected decoded records, at the byte offsets
used by §4.2:

| Offset | Decoded evidence | What it establishes |
|---:|---|---|
| 501,540-502,522 | `DTF READER0`, `FILETYPE READER`, `CARDPOC`, `IOAREA`, `EOFADD`, followed by analogous punch and printer definitions | IOCS file definitions in real generated output `[verified]` |
| 502,523 | `RDCD1 SBR BCCK1&5` | Generated subroutine linkage `[verified]` |
| 502,626; 529,487-530,309 | `GET` and the `OPEN` block for named files/devices | IOCS flow, not open-coded unit-record instructions `[verified]` |
| 526,938; 532,356 | `RECORD TYPE NOT FOUND`; `INPUT REC OUT OF SEQ` | Two recovered generated-program messages in this slice `[verified]` |
| 532,676-533,075 | `DA` areas for the card/input and punch buffers | Generated storage areas `[verified]` |
| 536,208; 536,688 | `PUT PR1NTER0`; `PUT PUNCHF1LE` | IOCS output `[verified]` |
| 536,928; 537,911; 538,997-539,156 | a test of `CONLC`; `CONOF DCW @0@`; `C0NLC` and `CONLC` cells | `LC`/`OF` are represented by one-character generated state cells; detailed timing is not established `[verified for shape]` |
| 539,237; 539,397-539,427 | `END START1`; `LAST CARD  1410  RPG` | End and identity of the skeleton `[verified]` |

This confirms that IBM's generated 1410 program used IOCS macros and `SBR` linkage. Phase 5's
macro-free, open-coded Autocoder is therefore a documented project construction under
`GENERATED_PROGRAM_IS_OPEN_CODED_NOT_IOCS`, not a claim of byte- or source-faithful period output.
The slice does not establish `F1`-`F6`, `1P`, total/detail or heading relative order, edit-word
semantics, or a sheet condition's negation column; compiled skeleton shape cannot answer those
sheet-level questions.

### 10.5 Frozen Phase 5 uncertainty ledger

The set of ruling names in plan §15 is now **frozen** for Phase 5. Wave 0 adds no constant and no
fallback. Its evidence changes only the confidence annotations summarized here:

| §15 ruling | After the bounded read |
|---|---|
| `F1_TO_F6_ARE_THE_CONTROL_LEVEL_INDICATORS` | `[verified]` 1401 meaning; `[likely]` 1410 runtime; default retained |
| `TOTAL_TIME_PRECEDES_DETAIL_TIME_ON_A_BREAK` | `[verified]` 1401 order; `[likely]` 1410 runtime; default retained |
| `EDIT_WORD_IS_THE_1410_MCE_CONTROL_WORD` | `[likely]`; default and fallback unchanged |
| `EDIT_WORD_RIDES_ON_THE_FIELD_ENTRY` | `[verified]` 1401 sheet semantics; `[likely]` 1410 processor; default retained |
| `CONDITION_GROUP_IS_NOT_PLUS_TWO_DIGIT_INDICATOR` | `[verified]` shared sheet layout; default retained |
| `THE_LEVEL_ORDERING_RULE_APPLIES_TO_NUMERIC_LEVELS_ONLY` | `[verified]` 1401 hierarchy; `[likely]` 1410 runtime; default retained |
| `OVERFLOW_HEADING_IS_AN_INDEPENDENT_ALPHABETIC_LEVEL_LINE` | `[verified]` 1401; `[likely]` 1410 runtime; default retained |
| `HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION` | `[unverified]`; existing default and fallback frozen |
| `GENERATED_PROGRAM_IS_OPEN_CODED_NOT_IOCS` | Named departure reaffirmed by `[verified]` 1410 evidence |

Any later wave that needs a ruling name outside plan §15, or needs to change one of these defaults,
must stop and escalate rather than adding it silently.
