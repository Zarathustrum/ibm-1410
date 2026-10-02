# IBM 1410 Software: Autocoder, Object Decks, Loaders, Bootstrap, OS, Languages

## Implementer summary

1. Two Autocoders, two object formats: the standalone/pre-OS Autocoder (C28-0309-1, 1410-AU-906) emits an **absolute condensed card** deck (5-digit load address in cols 2-6, count in 11-12, data 13-72, word marks carried as word-separator punches); the 1410/7010 OS Autocoder (C28-0326-2, 1410-AU-968) emits **relocatable** subprograms for the Linkage Loader. Build the condensed loader first — it is the only format a card-only machine can consume.
2. Word-mark rule is uniform: **word mark on the high-order (leftmost) character**, symbolic label resolves to the **low-order** character unless indented to column 7; **actual (numeric) labels always resolve high-order**. DCW sets the mark, DC does not, DS emits nothing at all and does not clear the area.
3. Bootstrap on a 1410 is hand-keyed — there is no Load key (7010-only). Key 12 characters at 00000-00011 (`AL%1000012$R` for a channel-1 1402), word marks on the `L` at 00001 and the branch op at 00011, then COMPUTER RESET + START. The `$` d-character is load-bearing: it suppresses the group-mark-word-mark record test. `$` **is** legal on a 1402 read — IBM prints it as a fixed literal in its own keying template with the device selector as the variable (C28-0351-5 p.8 Table II); A22-0526-3's card tables merely omit it. Conflict C17, ruled for this file.
4. The Autocoder 5-card standard loader's card images do not survive in any published manual. Reconstruct it: implement the published condensed-card format, put the re-entry point at 00281, and shape card 1 like the published Bootstrap 1 card.
5. Language answer: FORTRAN and COBOL existed in four/three variants but **none runs on a card-only 1410** — every pre-OS processor, the historical Autocoder included, needs 4 tape units or a 1301. **RPG was native to the 1410** (1410-RG-910 / 1410-RG-943, a preprocessor emitting Autocoder source); it did **not** require 1401 compatibility mode.

---

## 1. Autocoder source card layout

Identical between the standalone Autocoder (coding sheet X24-1350) and the OS Autocoder (input card form A36199). [verified — C28-0309-1 pp.5-7; C28-0326-1 p.12]

| Columns | Field | Notes |
|---|---|---|
| 1-2 | Page number | any alphameric, collating order |
| 3-5 | Line number | 01-25 prenumbered; third col for inserts (e.g. `021`) |
| 6-15 | Label | ≤10 alphameric, first alphabetic, no specials, left-justified; or an actual address; `*` in col 6 = comments card (text 7-72) |
| 16-20 | Operation | mnemonic |
| 21-72 | Operand | free-form: A-operand, B-operand, d-character separated by commas; adjustment/index immediately follow the address; comment begins after ≥2 blanks |
| 73-75 | (blank) | OS manual: leave blank. Standalone: processor writes an object-deck sequence number here on output cards, not input |
| 76-80 | Identification | punched into the object deck via JOB/RESEQ (standalone) or HEADR/RESEQ (OS) |

Source: C28-0309-1 pp.5-7; C28-0326-1 p.12. [verified]

**Label-field subtlety, easy to get wrong:** "Symbolic labels are written left-justified in the label field except as described in 'dc' or 'dcw.' Actual labels are always written left-justified... This actual address refers to the high-order position of the instruction, constant, or defined field. **Actual labels have no effect on the address assignment counters.**" [verified — C28-0309-1 pp.5-6]

---

## 2. Address syntax, address arithmetic, indexing

Address types: blank (chaining), actual (1-5 digits, leading zeros optional), symbolic (1-10 chars), asterisk, literal, address constant. [verified — C28-0309-1 pp.8-11]

- **Address adjustment:** `+`/`-` followed by 1-5 digits, written after the symbol; multiple adjustment terms are summed.
- **Indexing:** `+X1` … `+X15`, or `+` followed by a symbolic index label, written after the address and its adjustment. With multiple index tags on one address **only the rightmost is effective**. Worked example: `A TOTAL+3+X1-12+X2,ACCUM-5+X2+35` ≡ `A TOTAL-9+X2,ACCUM+30+X2`. [verified — C28-0309-1 pp.8-11]
- Indexing is **not** accepted in DS, ORG, LTORG, or control operations. [verified — C28-0309-1 pp.8-11]
- **Index tagging is encoded as zone bits over the tens position of the 5-digit address** in the assembled instruction: index 2 → B-bit (11 overpunch), so tens digit 4 prints as `M` (`D 03101 001M0 C`); index 1 → zero overpunch, so tens digit 8 prints as `Y` (`D 030Y9 00140 C`). [verified — C28-0309-1 pp.8, 11]

**The asterisk has two distinct meanings — an easy assembler bug.** "If an asterisk (*) appears as an operand in the source program, the processor will replace it with the actual core-storage address of the **last character of the instruction** in which it appears (except in EQU, ORG, or LTORG statements, where the asterisk refers to the **current position of the processor address assignment counter**)." So `EOF EQU *` after a 7-character instruction at 00209 yields 00216 (= 00209+7), while the same `*` as an ordinary operand on that instruction would yield 00215. [verified — C28-0309-1 p.8]

**Origin:** standalone — if no ORG precedes the first entry, assignment starts at **00500** (the loader occupies storage below it). ORG accepts actual, previously-defined symbolic, blank (= high assignment counter + 1), or `*` with adjustment (`*+200`). [verified — C28-0309-1 pp.18-19]
OS — if no ORG, assembly starts at **00000**; the relocation factor is the BASE1 value minus the low origin in the TITLE card; ORG accepts actual, symbolic, blank, `*`, `*+X00`; linkage and system symbols are not allowed in ORG. [verified — C28-0326-1 pp.36-38; C28-0319-4 p.7]

**LTORG:** assigns storage to previously encountered literals and closed library routines beginning at the operand address. Literals and closed routines are assigned at the EX or END statement if no LTORG appears. Literal pool scoping: area-defining-literal labels die at each LTORG/SPEND and must be redefined. [verified — C28-0309-1 pp.9, 18-19; C28-0326-2 p.18]

---

## 3. Literals

[verified — C28-0309-1 pp.8-10; C28-0326-2 pp.18, 28]

- **Numeric literal** requires a leading `+` or `-`; the sign is placed as a zone over the units position. ≤9 digits + sign are pooled once per program section; longer literals are allocated on each occurrence. A program section is bounded by LTORG, END, or EX. To store an unsigned *literal* value, use an alphameric literal. (Note: this restriction is on literals only — a DCW **constant** may be unsigned: "Unsigned constants will be unsigned in storage." [verified — C28-0326-2 p.28])
- **Alphameric literal** is bracketed by `@`; the processor scans from column 72 right-to-left for the closing `@`. 1-9 characters are pooled. The word separator character (0-5-8) must never be the first character of an alphameric literal.
- **Size limits:** a literal may be up to 52 characters including the sign, must be contained on one coding line, and must not extend beyond column 72. A numeric DCW constant may be up to 51 characters if signed, 52 if unsigned; the first blank column terminates a numeric constant.
- **Area-defining literal** `WKAREA#6` (# = 8-3 punch) reserves 6 blank positions; the processor generates a DCW card so the blanks are loaded at object time, with a word mark over the high-order position. The label resolves to the **low-order** position (worked example: `BUFFERTWO` = 00596 for a 10-position area, `MLC AMOUNT,BUFFERTWO#10` → `D0079600596C`). Area limited to 500 positions ("F" flag if exceeded).
- **Address-constant literal** `+LABEL` yields the 5-character machine address of LABEL, emitted via a processor-generated DCW, **unsigned in core storage**. Address adjustment and indexing on an address-constant literal modify **the address of the literal, not the literal's value**; to modify the value, define it with a DCW.
- All pooled literals are emitted as processor-produced DCW cards at the LTORG/EX/END point, in encounter order — not where they were written. [verified — C28-0309-1 p.8; C28-0326-2 p.57]

---

## 4. d-modifier notation

"With a few exceptions, these d-characters are incorporated into Autocoder mnemonics" — e.g. machine op `V` is reachable as BW, BZN, BWZ. When a d-character must be written explicitly it is the **third comma-separated operand**: `BCE ENTRYA,SWITCH,2` assembles to `B 00392 00498 2`. [verified — C28-0309-1 pp.7, 11]

For I/O instructions the d-character is decoded **by the CPU/channel, not by the device**, and it selects the record-termination rule. Do not treat it as decoration. [verified — A22-0526-3 pp.62, 86]

| Op / context | d | Meaning |
|---|---|---|
| `M`/`L` 1402 read | `R` | stop on the first group-mark-word-mark in core; set wrong-length-record if the GMWM is not exactly one past the 80th character |
| `M`/`L` tape or card read | `$` | group-mark-word-marks in core have no effect; read to IRG / end of core. If coded for overlap (x1 = `@` / `*`) the overlap **is** performed and the end-of-core modifier is silently dropped — the instruction is changed to a normal read (`R`) |
| `M`/`L` tape write | `W` | write, stop at GMWM |
| `M`/`L` tape write | `X` | write to end of core, ignoring GM-WMs (WTE / WTEW / WTBE). If coded for overlap (x1 = `@` / `*`) the overlap **is** performed and the modifier is silently dropped — the instruction is changed to a normal write (`W`) |
| `M`/`L` 1402 punch | `W` | punch a card; x3 must be 0, 4 or 8 |
| `R`/`X` status branch | group mark | tests all six channel indicators; clears the I/O interlock **without requiring a branch** |

[verified — A22-0526-3 pp.37, 62-63, 86, 103-104]

---

## 5. Declaratives and word-mark placement

The core rule, stated identically in both manuals: **"Symbolic labels address the low-order position of the constant. Word marks are set in the high-order positions of all constants."** [verified — C28-0309-1 p.12] The OS manual adds the column: "The high-order position will be referenced if the label is indented one column in the label field; that is, if it begins in column 7." [verified — C28-0326-2 p.28] And the inverse for absolute labels: **"Actual labels always refer to the high-order position of the defined constant."** [verified — C28-0309-1 p.12]

Machine-level corroboration: "A word mark must be associated with the first character of each instruction (op code position) and is usually associated with the high-order (leftmost) character in a data field." [verified — A22-0526-3 p.7]

### Declarative behaviour table

| Statement | Word mark set? | Where | Label resolves to | Emits into condensed deck? | Clears the area? |
|---|---|---|---|---|---|
| DCW | Yes | High-order (leftmost) position of the constant | Low-order; high-order if label begins in col 7, or if the label is an actual address | Yes — data chars + word separator before the high-order char | N/A (data is written) |
| DC | No | — | Same rule as DCW | Yes — data chars only, no word separator | Overwrites its own extent; see load-mode note below |
| DS | No ("no word mark is assigned by the processor") | — | Low-order; high-order if label begins in col 7 | **No — nothing is emitted** | No ("the area is not cleared prior to reservation") |
| DA header | (see fields) | — | High-order position of the whole reserved area | Yes — word marks for defined fields, plus record marks / group-mark-word-mark if requested | OS Autocoder: yes, cleared to blanks unless `,N`. C28-0309-1: not documented |
| DA field sub-entry (`hi,lo` form) | Yes | High-order position of that field | Low-order position of the field | Yes (word separator only) | — |
| DA subfield (`lo` only form) | No | — | That low-order position | No word mark emitted | — |
| EQU | No | — | Whatever the operand resolves to | No | No |
| Pooled literal | Yes | High-order position of the literal | Low-order position | Yes — processor-generated DCW at the LTORG/EX/END point | — |
| Area-defining literal (`WKAREA#6`) | Yes | High-order position of the area | Low-order position | Yes — processor-generated DCW of blanks at the LTORG/EX/END point | Loaded as blanks, so effectively yes |
| Address-constant literal (`+LABEL`) | Yes | High-order of the 5-position constant | Low-order position | Yes — processor-generated DCW; value is unsigned | — |

Source: C28-0309-1 pp.7-15, 18-19; C28-0326-2 pp.18, 23-25, 28, 30. [verified]

### Statement detail

- **DCW** — constant with word mark. Numeric ± sign → AB-bits/B-bit over the units position; first blank ends a numeric constant; alphameric `@..@` ≤50 chars; blank constant `#n` "permits the programmer to reserve a field of blanks with a word mark in the high-order position"; address constant `LABEL+10`, optionally signed, sign over the units position. Trailing `,G` after an alphameric constant places a group-mark-word-mark following the last character, and "the associated label, if any, will refer to the last character of the constant, not the group-mark word-mark." [verified — C28-0309-1 pp.12-13]
- **DC** — "the same characteristics as the dcw statement. The only difference is that the processor does not cause a word mark to be set at the high-order position of the constant when the constant is produced in the object deck." [verified — C28-0309-1 p.13; C28-0326-2 p.30]
  **Correction to a plausible-but-wrong inference:** a DC does *not* leave pre-existing word marks in its own positions standing. In load mode the word-mark bit of every stored character is determined by whether a word separator preceded it — "no separator" *is* the encoding for "no word mark here". The reference implementation (SimH `i7010_chan.c`) preserves `M[caddr] & WM` only when `CHAN_LOAD` is clear, i.e. move mode. So under load-mode loading a DC clears the word marks over its own extent; only positions outside any emitted card's extent are guaranteed untouched. [likely — A22-0526-3 p.41 is silent; SimH I7000/i7010_chan.c is explicit]
  Also: CW/CS and a DA clear are not the only ways a word mark disappears — A22-0526-3 p.7 rule 2 allows alteration "by a data move operation that specifies that they should be altered", and Move Characters and Suppress Zeros removes B-field word marks within the specified area including the leftmost position. [verified — A22-0526-3 p.7 and MCS description]
- **DS** — reserve n positions. **"No information is entered into the area, no word mark is assigned by the processor, and the area is not cleared prior to reservation."** A DS contributes nothing to the object deck; the reserved area retains whatever bytes and word marks were in core beforehand. This is the sharpest warm-start hazard in the whole assembler. [verified — C28-0326-2 p.30] The earlier tape Autocoder says only the weaker "no information (constant) is loaded into this area at program load time." [verified — C28-0309-1 p.13]
- **DA** — define area, header operand `b X l` (blocking factor × length) plus optional `,Xn` (index all field labels), `,#` (record mark after each area), `,G` (group-mark-word-mark after the whole area), `,0` (relative-to-zero addressing). Sub-entries have a blank operation field, a label, and `hi,lo` relative positions; a word mark is set on the high-order position of each defined field, and a single number defines a subfield with no word mark. For a word mark in a one-position field, write the relative position number twice separated by a comma. DA does emit load-time action: "Result: At object program load time: 1. Word marks are set for field definition as noted previously. 2. A group mark and record marks are loaded as specified in the heading line." [verified — C28-0309-1 pp.13-15; C28-0326-2 pp.23-24]
  Under the OS Autocoder only: "The area reserved by the da statement is normally cleared to blanks before setting word marks and/or record marks"; `,N` suppresses the clear and "is not effective when the program is loaded from the sof." Not documented for C28-0309-1. [verified — C28-0326-2 p.25]
- **EQU** — assigns a label to an actual/symbolic address with adjustment/indexing, to an index register (`2,X` form or `X2`), or to a tape unit / X-control field. [verified — C28-0309-1 pp.12-16]

### Assembled evidence (C28-0326-2 Appendix C, Exhibit IV, p.57)

ADDRS is low-order for constants, high-order for instructions. Column semantics: CT = length in characters of the assembled imperative, or the number of core positions reserved by a declarative; ADDRS = relative address assigned by the processor; CARD = sequence number of the object-deck card the item appears on. [verified — C28-0326-2 p.11]

| SEQNO | LABEL | OPCOD | OPERAND | CT | ADDRS | INSTRUCTION | CARD | Occupies | ADDRS is |
|---|---|---|---|---|---|---|---|---|---|
| 37 | | BXPA | /PCH/ | 7 | 00192 | Y /PCH/ | 007 | 00192-00198 | high-order (instruction) |
| 38 | | DCW | #5 | 5 | 00203 | | 008 | 00199-00203 | low-order (constant) |
| 39 | | DCW | AREA | 5 | 00208 | 00315 | 009 | 00204-00208 | low-order (address constant) |
| 40 | PCH | B | | 7 | 00209 | J 00000 | 009 | 00209-00215 | high-order (instruction) |
| 43 | EOF | EQU | * | | 00216 | | | — | = 00209+7, confirms the chain |
| 58 | | LTORG | * | | 00302 | | | — | literal pool origin |
| 59 | IDENT | | #0005 | 5 | 00306 | | 012 | 00302-00306 | low-order (area-defining literal) |
| 60 | | | (alpha literal) | 3 | 00309 | | 012 | 00307-00309 | low-order |
| 61 | | | (1-char literal) | 1 | 00310 | | 012 | 00310 | low-order |
| 62 | CNT | | #0004 | 4 | 00314 | | 012 | 00311-00314 | low-order (area-defining literal) |
| 64 | AREA | DA | 1X80,G | 81 | 00315 | | (blank) | 00315-00395 | high-order (DA header) |
| 65 | AR04 | | (subentry) | | 00318 | | | — | 00315+4-1, low-order of field |
| 66 | AR80 | | (subentry) | | 00394 | | | — | 00315+80-1, low-order of field |
| 68 | (col 7) EOJ | DC | @EOJ@,G | 6 | 00396 | | 015 | 00396-00401 | high-order — label indented to col 7 |
| 69 | (col 7) ERR | DC | @ERROR@,G | 6 | 00402 | | 015 | 00402-00407 | high-order — label indented to col 7 |

Stronger proof from the punched deck rather than the listing: one object card has cols 2-6 = `00396` and count `00012`, loading 00396-00407, so the two column-7-indented DCs listed at 00396 and 00402 start at those addresses (ADDRS = high-order). Another card has cols 2-6 = `00204`, count `00036`, loading 00204-00239; the last constant on it, `DCW EOJ` (CT 5), is listed at ADDRS 00239 — the card's final byte (ADDRS = low-order). Also `MLCB AR80,IDENT#5` assembles to `D 00394 00306 L`. [verified — C28-0326-2 pp.56-57]

---

## 6. Pseudo-ops and control statements

| Op | Standalone C28-0309-1 | OS C28-0326-1 | Function |
|---|---|---|---|
| DCW / DC / DS / DA / EQU | yes | yes | declaratives |
| DAV / RSV | — | yes | COMMON area / reserve |
| JOB | yes | — (HEADR) | listing heading + ident punched into cols 76-80 of all condensed cards |
| CTL | yes | — | core-size code col 22 (1=10K, 2=20K, 3=40K, 4=60K, 5=80K), suppress code col 23 (1=punch, 2=print); if CTL is absent both processor and object machine are assumed 20K |
| RUN | yes | — | first card; label `AUTOCODER` = assemble, `SYSTEMS` = library update |
| LOAD | yes | — | "used to signal the processor that a load program should precede the object deck" |
| ORG / LTORG / END | yes | yes | origin / literal origin / end |
| EX / XFR | yes | — | execute during load / transfer (XFR does not incorporate literals, closed routines, address constants) |
| SPEND | — | yes | end subprogram, continue assembly |
| SFX | yes | — | suffix character into position 10 of all subsequent labels shorter than 10 chars; cross-reference via `A$LABEL` or `$LABEL` for unsuffixed; IOCS-prefixed labels and DTF names are never suffixed |
| EJECT / RESEQ / PST | yes | yes | listing/deck control; RESEQ resets object-deck sequence to 001 and changes the ident; PST prints the symbol table |
| TITLE / BASE1 / BASE2 / CALL / DEFIN / PRTCT / DCWF / DCWS | — | yes | Linkage Loader operations |
| NOP / NOPWM | yes* | yes | program switches; NOPWM generates `N` with a word mark followed by an unconditional branch without a word mark |

*The NOP/NOPWM row for the standalone assembler was not confirmed against C28-0309-1's op tables during verification — treat as [unverified] for the standalone Autocoder, [verified] for OS. [C28-0309-1 pp.12-20; C28-0326-1 Fig.21, TNL N28-1126]

Diagnostic flags: `F` format, `U` undefined, `M` multiply defined, `O` invalid op. [verified — C28-0309-1 pp.17-20]

OS Autocoder operation-code groups: assembly control HEADR, RESEQ, EJECT, PST; subprogram control ORG, LTORG, END, SPEND; declaratives DA, DCW, DC, DS, EQU; Linkage Loader ops TITLE, BASE1, BASE2, CALL, DEFIN, PRTCT; subprogram linkage DCWF, DCWS; COMMON declaratives DAV, RSV. END/SPEND with an operand gives the entry point and makes the subprogram *primary*; a blank operand makes it *secondary*. [verified — C28-0326-1 Fig.21 p.21; pp.36-38]

**EX / XFR / END semantics** (standalone): EX incorporates literals, closed library routines and address constants, then assembles a branch that "does not become part of the assembled machine-language program, but it causes the processor-produced loading routine to halt the loading process at the appropriate time and execute the branch instruction. Note: To continue the loading process after the desired portion of the program has been executed, the programmer must provide re-entry to the load routine. **(The IBM standard re-entry point is 00281.)**" XFR is identical minus the literal/closed-routine/address-constant incorporation. END's operand names the first instruction to execute; the processor creates an *execute card* (an unconditional branch, part of the loading data) so execution begins automatically after the load. [verified — C28-0309-1 pp.19-20]

The 1961 preliminary spec J24-1433-2 carries the EX/XFR text verbatim **minus** the "(The IBM standard re-entry point is 00281.)" sentence — 00281 was added in C28-0309-1. J24-1433-2 does state a useful loader behaviour: "A word mark will be set in the operation code position by the loading routine at program load time." [verified — J24-1433-2]

---

## 7. Macros

Library routines of model statements held on the system/library tape, maintained by a Librarian phase (`RUN SYSTEMS`). Macro-instructions take parameters in the operand field. Pseudo-macros MATH, BOOL, COMP, NOTE, MEND plus permanent/temporary switches control generation. CALL and INCLD bring in closed library routines. DELET/INSER maintain the library. IOCS macros (GET/PUT etc.) come from the IOCS package (1410-IO-926 pre-OS; 1410-IO-966/967 under the OS). [verified — C28-0309-1 pp.25-39]

The recovered PR-108 tape image contains this library in readable symbolic form: decoding `jpr108-2024.bcd` through a standard IBM BCD table yields 8,838 lines in Autocoder library-card format (4-digit sequence number + mnemonic), concentrated in the first ~500 KB, with DCW, DC, BOOL, MEND, MATH, NOTE, ORG, LTORG and IOCS macro names (`IOCSDUMP50`, `IOCSLOAD50`, `HOLDNOW IOCTL`), plus the strings `1410 AUTOCODER LIBRARY LISTING` and `AUTOCODER VERSION       LIBRARY LISTING`. [verified — bitsavers /bits/IBM/1410/1410-PR-108/jpr108-2024.bcd]

---

## 8. Object deck formats

### 8.1 Standalone condensed card (absolute) — Figure 2, C28-0309-1 p.7

This is the format the 5-card standard loader consumes. [verified; column numbers read from the page image, which the OCR drops]

| Card columns | Contents |
|---|---|
| 1 | Word separator character (0-5-8 punch) |
| 2-6 | `xxxxx` = high-order position of the area into which the data in cols 13-72 is to be loaded |
| 7 | Word separator character |
| 8-10 | `0 0 0` (zeros) |
| 11-12 | `xx` = number of characters to be loaded from this card (word separators **not** counted) |
| 13-72 | Instructions and/or data, beginning in column 13 |
| 70-72 | Relocation indicators, if required (occupying cols 72, 71, 70) |
| 73-80 | Ignored by the Load Program; may contain anything the user wants. Autocoder puts the card sequence number in 73-75 and the program identification in 76-80 |

NOTE (verbatim): to enter a word mark into storage during loading, punch a word separator character in the column preceding the character with which the word mark is to be associated. The word separator characters are NOT included in the character count in columns 11-12. To enter a word separator character into core storage, punch two adjacent columns with it. Word separator characters cannot be loaded with an associated word mark.

**Correction to a common misreading:** the "ignored by the Load Program" clause belongs to cols 73-80, **not** to the relocation indicators in 70-72. Relocation indicators exist to be consumed by a relocating loader. [verified — Figure 2 read as a page image; the archive.org OCR scrambles the figure's row order]

Mechanism: word marks travel in the deck as word-separator punches because 1410 **load mode** (op code `L`) on input "converts a single word separator character in the incoming data into a word mark over the NEXT incoming character", the separator itself is not stored, and the record shortens by one position; two consecutive word separators store as one word separator. [verified — A22-0526-3 p.41; Figure 61 p.61]

### 8.2 OS (1410-PR-155) relocatable object cards

[verified — C28-0319-4 "Program Patching" pp.64-67, read from scan]

| Card | Columns | Contents |
|---|---|---|
| TITLE | 16-20 / 21-30 / 31-35 / 41-45 / 72 | `TITLE` / subprogram name (≤10) / compiled origin (00000 or blank Autocoder, 00001 FORTRAN, size of IBCOBOL for COBOL) / COMMON size / `5` |
| Load | 1 / 2-6 / 7 / 8-10 / 11-12 / 13-up / 71↓ / 72 | WS / load addr / WS / zeros / count / code+constants / one relocation indicator per instruction or constant, col 71 = first, working downward / **`0` = absolute or linkage-symbol load address, `1` = apply upward relocation, `2` = apply downward relocation** |
| Termination | 1 / 2 / 3-7 / 72 | `E` / WS / entry point (blank if secondary) / `3` primary, `9` secondary |
| DEFIN | 6-15 / 16-20 / 21-30 / 71 / 72 | symbol / `DEFIN` / value / blank=up, `P`=down, `Q`=none / `4` |
| CALL, BASE1, BASE2, PRTCT, ENTRY | 16-20 / 21-30 / 72 | op / symbol or address / `4` |
| Random Load | five 11-col fields (1-11, 12-22, 23-33, 34-44, 45-55) / 67-71 / 72 | WS, addr, 5 chars per field / per-field indicators in cols 71,70,69,68,67 (0-8 code: 0-2 load addr none, 3-5 addr up, 6-8 addr down; within each triple: chars none/up/down) / `Z`. Loads its five characters in **Move mode** (no word marks) |
| Clear Storage | 1 / 2-6 / 7 / 8-12 / 71 / 72 | WS / low addr / WS / high addr / `N`=up, `P`=down / `Y` |
| Set WM or RM | 1 / 2-6 / 7 / 8-12 / 13 / 14-18 / 20 / 71 / 72 | WS / first addr / WS / increment / WS / count / record mark (0-2-8) for RM or blank for WM / `N`/`P` relocation of the first address / `8` |
| Clear WM | as Set card | col 72 = `W` |

**Refuted and corrected:** the Load card's col 72 is the digit **`0`** for an absolute or linkage-symbol load address, not a blank. A loader keyed on blank misclassifies every absolute Load card. [verified — C28-0319-4 p.65, read from scan]

Additional note from the same page: two adjacent word separators load one word separator and "Add only 1 to the count" — the loaded word separator counts as one character. [verified — C28-0319-4 p.65 NOTE 1]

DCWS/DCWF calls are embedded as a word separator + 10-character subprogram name (count 7 / 5). [verified — C28-0319-4 pp.64-65]

### 8.3 OS relocation indicator codes — Figure 13, C28-0319-4 p.65 (corrected from scan)

The OCR-derived version of this table was wrong in two places; this is the scanned reading. [verified]

| Item type | Without d-mod | With d-mod | Length |
|---|---|---|---|
| No address | `9` | `I` (12-9) | 1 / 2 |
| X-control op: B up / B down / B none / no B | `J` (11-1) / `K` (11-2) / `L` (11-3) / `M` (11-4) | — | 10 / 10 / 10 / 5 |
| Single address up / down / none | `@` (4-8) / `:` (5-8) / `>` (6-8) | lozenge (12-4-8) / `[` (12-5-8) / `<` (12-6-8) | 6 / 7 |
| Two addresses, no relocation | `0` | `?` (12-0) | 11 / 12 |
| Two addr, B up | `1` | `A` (12-1) | 11 / 12 |
| Two addr, B down | `2` | `B` (12-2) | 11 / 12 |
| Two addr, A up | `3` | `C` (12-3) | 11 / 12 |
| Two addr, both up | `4` | `D` (12-4) | 11 / 12 |
| Two addr, A up B down | `5` | `E` (12-5) | 11 / 12 |
| Two addr, A down | `6` | `F` (12-6) | 11 / 12 |
| Two addr, A down B up | `7` | `G` (12-7) | 11 / 12 |
| Two addr, both down | `8` | `H` (12-8) | 11 / 12 |
| Address constant up / down / none | `N` (11-5) / `P` (11-7) / `Q` (11-8) | — | 5 |
| DCWS / DCWF | `S` (0-2) / `T` (0-3) | — | 7 / 5 |
| Constant | blank | — | — |

Specifically refuted from the earlier OCR reading: "no address with d-mod" is the letter `I` (12-9), **not** the digit `1`; "two addresses, no relocation" without d-mod is the digit `0`, and `?` (12-0) is its with-d-mod form. The digit `1` is "two addresses, only B-address upward". [verified — C28-0319-4 p.65 scan]

Under PR-155 all compiler output is relocatable; the Linkage Loader applies upward relocation (relocation factor added), downward (COMMON references, assembled relative to 99999) or none, per address, writes absolute programs to the Job file (MJB), and the Resident Monitor's Load routine brings them in. Autocoder EXEQ options: NOPRT, NOPCH, NOMAC, NOFLG. The object program must terminate with `B /EOP/` or `B /UEP/`. [verified — C28-0326-1 pp.8-9]

---

## 9. The load program / loader deck

### What is documented

- C28-0309-1 documents the LOAD control card in **one sentence**: "The load control card is used to signal the processor that a load program should precede the object deck." No manual on bitsavers prints the loader's card images or a listing. [verified — C28-0309-1 p.17]
- **Size, Autocoder-produced: five cards.** J28-0249 p.12: "If the programmer requested a load program from the Autocoder Processor, he should remove the first five cards from the assembled object deck." p.26: "If the new object program was given a load program by the Autocoder Processor, the first five cards of the new deck MUST be discarded." p.35: "the 1410 Standard Load Program (5-card loader)." [verified — J28-0249 pp.12, 26, 35]
- **Size, standalone distribution: nine cards.** C20-1602-8, program 1410-UT-106: "THE STANDARD 1410 LOAD PROGRAM. THIS PROGRAM LOADS UP TO 60 CHARACTERS CONTAINED ON A LOAD CARD INTO SEQUENTIAL CORE STORAGE LOCATIONS. THIS IS A 9 CARD PROGRAM. THE LAST TWO CARDS ARE AS FOLLOWS — A. CLEAR STORAGE — THIS CARD CLEARS ALL STORAGE ABOVE LOCATION 00499 TO BLANKS. B. SET INDEXES — THIS CARD CLEARS ALL INDEX REGISTERS TO BLANKS AND SETS WORD MARKS AT THE HIGH ORDER POSITION." Distributed at the end of the 1410-UT-106 UPOS program deck. 60 characters = condensed-card columns 13-72. [verified — C20-1602-8, 1410-UT-106]
- The 9-card standalone deck and the Autocoder's 5-card loader are **not the same deck**: the last two of the nine are utility cards, leaving a 7-card loader proper versus the Autocoder's 5. Do not assume interchangeability. [verified]
- Placement bound: because the standalone deck's Clear Storage card "clears all storage above location 00499", the load program itself must live at or below 00499 — consistent with the 00281 re-entry point, with PAT keying its own bootstrap at 00201, and with the standalone Autocoder's default 00500 origin. [verified — C20-1602-8; J28-0249 pp.12, 35]

### The only published bytes at 00281

PAT's two Substitution Cards are ordinary standard-format load cards that store one word-marked character into 00281. [verified — J28-0249 p.27]

| Columns | First Substitution Card | Second Substitution Card |
|---|---|---|
| 1 | word separator character | word separator character |
| 2-6 | `00281` | `00281` |
| 7 | word separator character | word separator character |
| 8-12 | `00001` | `00001` |
| 13 | word separator character | word separator character |
| 14 | `N` | `,` (comma) |
| 15-80 | blank | blank |

Deck order (J28-0249 Figure 6, bottom to top as read): first substitution card, new object deck, second substitution card, execute card. `N` = NOP op code, `,` = Set Word Mark op code — so 00281 is a **one-character instruction slot** toggled between disabled and active, not obviously the first byte of a subroutine. [verified]

### Implementer fallback

Write your own 5-card loader implementing C28-0309-1 Figure 2 exactly, put its re-entry point at 00281, and shape card 1 as a self-loading bootstrap card in the Bootstrap 1 form so the keyed `AL%1000012$R` picks it up. EX/XFR then work: the processor-produced branch card halts loading, and user code returns by branching to 00281. If the authentic bytes are wanted, they are recoverable only by execution — assemble any program with a LOAD control card under the recovered PR-108 Autocoder and capture the punch file. Nobody appears to have published that result. [unverified — reconstruction path, not a documented artifact]

Do **not** borrow SimH: `chan_boot()` in `i7010_chan.c` sets `caddr[chan]=1`, `cmd = CHAN_NOREC|CHAN_LOAD` and relies on reset having set IAR=1 — that is 7010 Load-key behaviour, not the 1410 procedure, and `sim_load` returns `SCPE_NOFNC`, so there is no Autocoder-deck loader to copy. [verified — SimH I7000]

---

## 10. Bootstrap: the hand-keyed console IPL

### 10.1 The 1410 has no Load key

The Load key is a **7010-only** console toggle: home position, pushed right to load from tape, left to load from the card reader; only channel-1 devices selectable. Pressing it forces computer reset; sets unoverlap, load mode for channel 1; selects the card reader with normal-read pocket or tape unit 0; simulates I-ring 12-time for a status sample; turns on channel-1-in-process; "Read end of record into storage location 0001"; then "force program reset and auto start at 0001". "The programmer must check for correct data transfer." [verified — A22-6726 p.58]

C28-0351-5 splits every initialization procedure into "Using 7010 Load Key" and "Not using 7010 Load Key", and p.32 states: "The procedures above can be used on both the 1410 and the 7010. On the 7010, the Load key can be used instead of entering the read instruction into locations 00000-00011." A22-0526-3's console section lists start, stop, program reset and computer reset — no load key; both resets "reset the program to 00001". [verified — C28-0351-5 pp.7-8, 32; A22-0526-3 pp.9, 50-51]

A program reset or computer reset automatically loads 00001 into the IAR — which is why the keyed instruction starts at 00001 and 00000 is free for a one-character system status byte. [verified — A22-0526-3 p.9]

### 10.2 The keyed string

**Correction to a common miscount:** this is a **10-character I/O instruction at 00001-00010 plus a 1-character branch op code at 00011** (11 keyed instruction positions, 12 characters counting the status character at 00000) — not an 11-character I/O instruction. Legal 1410 instruction lengths are 1, 2, 5, 6, 7, 10, 11, 12; the I/O form `O xxx bbbbb d` is exactly 10. [verified — A22-0526-3 p.11]

| Address | Char (ch.1 1402) | Word mark | Role |
|---|---|---|---|
| 00000 | `A` | optional | System status character (Monitor: A=init, B=reinit w/ rewind, C=reinit w/o rewind, D=restart from checkpoint, blank=not in init status). NOT part of the instruction; a WM here requests a SOF/SIU reassignment prompt |
| 00001 | `L` | **required** | Op code: Load characters to/from storage (load mode — word separators become word marks). `M` would be move mode |
| 00002 | `%` | | x-control field, hundreds position = channel + overlap. On a 1410: `%` = ch1 non-overlap, `@` = ch1 overlap, lozenge = ch2 non-overlap, `*` = ch2 overlap |
| 00003 | `1` | | x-control tens position = device type. `1` = card reader, `B` = tape (odd/binary parity), `U` = tape (even/BCD parity) |
| 00004 | `0` | | x-control units position. Card reader: stacker (0,1,2 = feed & stack; 9 = transfer buffer, no feed, no stacker select). Tape: unit number 0-9 |
| 00005-00009 | `00012` | | B-address — the record is read into 00012 onward |
| 00010 | `$` | | d-character. Ignore group-mark-word-marks, read to IRG / end of core. **Load-bearing — see below** |
| 00011 | `R` | **required** | Op code of Branch if I/O Channel Status Indicator On. On a 1410: `R` = channel 1, `X` = channel 2. Its I-address (00012-00016) and d-character (00017) come from the card just read |

Whole string, channel 1: **`AL%1000012$R`** (word marks on the `L` and the `R`).
Tape equivalent (Table I): `ALcBu00012$N` → e.g. `AL%B000012$N`.
Procedure: ready the reader, key the 12 characters, press COMPUTER RESET then START. Both tables add: "NOTE: The Asterisk-Insert switch must be set to ON."
[verified — C28-0351-5 Tables I and II pp.7-8; A22-0526-3 pp.9, 11, 24, 36-37, 41-42, 61-62, 86, 92]

**Why both word marks are required** (the rule the tables assume but never state): "Each instruction must have a word mark set over the operation code, and must not contain word marks in any other position. Also, a word mark must be set in the core-storage location immediately to the right of the last character of an instruction. This is normally the word mark associated with the operation code of the next sequential instruction." The word mark on the `R` at 00011 is what terminates read-out of the 10-character `L` instruction at 00001. [verified — A22-0526-3 p.11]

### 10.3 C28-0351-5 Table II variable characters (transcribed from the page image, p.8)

| Position | Symbol | Meaning | 1410 or 7010 |
|---|---|---|---|
| c | `%` | channel 1 | both |
| c | lozenge | channel 2 | both |
| c | `?` | channel 3 | **7010 only** |
| c | `!` | channel 4 | **7010 only** |
| d | `1` | card reader | both |
| d | `B` | tape | both |
| e | `0` | card reader | both |
| e | `0`-`9` | tape unit number | both |
| r | `R` | channel 1 | both |
| r | `X` | channel 2 | both |
| r | `3` | channel 3 | **7010 only** |
| r | `1` | channel 4 | **7010 only** |

The printed "Installation standard for Standard Input Unit" line is `A L̆ __ __ __ 0 0 0 1 2 $ __̆` — IBM left c, d, e and r blank for the site to fill in, with inverted-circumflex word marks printed over the `L` and over the `r` blank. Caption note: `"A" can have a word mark.` [verified — C28-0351-5 p.8 page image; the bitsavers PDF has no text layer and the archive.org OCR interleaves the variable-character columns]

**Refutation applied — 1410 vs 7010 conflation.** C28-0351-5 is a *joint* 1410/7010 manual. A22-0526-3, the 1410 machine manual, documents only **two** I/O channels: "All use the R op code for channel 1 or the X op code for channel 2." There is no channel-3 or channel-4 status-branch op code on a 1410, and only `%` / `@` / lozenge / `*` are valid in the x1 position. The `?` and `!` channel symbols and the `3` and `1` status-branch op codes are 7010-only; a 1410 emulator should never reach them and arguably should raise an instruction check. (SimH's `i7010_cpu.c` does accept `?`/`!` and `$`/`=` — because it also emulates the 7010.) [verified — A22-0526-3 pp.37, 92]

### 10.4 Why `$` and why `R` at 00011

**The d-character is not a template artefact — it is load-bearing.** A22-0526-3 p.86 defines `$` as "read to IRG or end of core", for which "Group-mark—word-marks in core storage have no effect"; `R` stops on the first GMWM. After COMPUTER RESET on a cleared machine there is no GMWM anywhere in the receiving area, so an `R` read runs the full 80 columns and then fails its correct-length check (p.62: "If the ⧧ is incorrectly positioned, the wrong-length-record channel status indicator will turn on") — and, worse, any GMWM that a load-mode read *creates* mid-record (word separator followed by a group-mark character; see io.md §3) would truncate the boot record early. `$` is precisely the modifier that says "ignore GMWM, take the whole record". Decode `d` at **channel level, before device dispatch**. SimH encodes the same split device-independently: `i7010_cpu.c` OP_RD maps `CHR_R` → `(IO_RDS<<8)` and `CHR_DOL` (`$`) → `(IO_RDS<<8)|0100`, and `chan_cmd()` turns that 0100 bit into `CHAN_NOREC` for any device on the channel. [verified — A22-0526-3 pp.62, 86; SimH I7000]

**That `$` is legal on a 1402 read is settled by C28-0351-5 itself, not by inference** (this was conflict C17, ruled here). Table II p.8, "Not using 7010 Load Key", step 2: "Enter `ALcde00012$r` into location 00000", with the variables named as `c` (channel), `d` = `1` card reader / `B` tape, `e` = card-reader `0` / tape unit `0`-`9`, `r` = `R` ch1 / `X` ch2. `$` is a **fixed literal** in that template while the device selector is the variable, and step 1 of the same procedure reads "The Bootstrap 1 routine card must be the first card in a card Standard Input Unit". A22-0526-3's card tables (p.62, appendix pp.104-105) simply omit `$` — they do not forbid it, and the PrincOps defines no d-character validity check for I/O. [verified — C28-0351-5 p.8 Table II] The *effect* on a 1402 is inferred rather than stated: suppress the GMWM test, store all 80 buffer columns, set no WLR; the 80-column buffer bounds the transfer, so a card `$` cannot literally reach end of core. [likely — derived from A22-0526-3 pp.9, 86, 92]

**The 1402 read does not unconditionally transfer 80 characters.** "Read a Card" says the instruction "causes the transfer of 80 characters from the card-read buffer to core storage", *and* "The operation is stopped by the first group-mark - word-mark sensed in core storage", and under Word Marks: "A group-mark-word-mark must appear in the core-storage position to the immediate right of the data record... If the [GMWM] is incorrectly positioned, the wrong-length-record channel status indicator will turn on." 80 is the buffer size, not an unconditional store count. SimH terminates the record when `M[caddr[chan]] == (WM|077)` and sets `IO_CHS_WRL`. An emulator that always writes 80 characters diverges on every normal (`d='R'`) card read. [verified — A22-0526-3 pp.61-62; SimH i7010_chan.c]

**The status branch is mandatory, and per channel.** Each I/O instruction turns on an interlock indicator; "one of these instructions must be given between two i/o instructions **on the same channel**... if it is still on when the next i/o instruction is read out **on the same channel**, the system stops." A global interlock model wrongly halts on legitimate interleaved ch-1/ch-2 I/O. The op codes that arm it are **M, L, U, F, 2, K, 4**. It is cleared by (1) an X- or R(I) instruction with the group-mark d-character given before the next I/O instruction on that channel, no branch required, or (2) any specific X- or R-type status branch that actually branches. [verified — A22-0526-3 p.37, summarized p.42]

Because the `R` at 00011 is 7 characters (`op + iiiii + d`), its I-address occupies 00012-00016 and its d-character 00017 — the first six characters the card just delivered. Card columns 1-5 supply the branch target and column 6 the status d-character, and control reaches 00018 whether the branch is taken or falls through. The tape variant uses `N` (NOP) at 00011 instead, which works because the 1410 NOP has no length limit ("L = 1, 2, 3 No Limit"; the op code "can be substituted for the operation code of any instruction to make that instruction ineffective"), so a word-marked `N` runs to the first word mark inside the just-loaded record — a self-locating entry point a fixed-length 80-column card does not need. [verified — A22-0526-3 pp.24, 36-37]

### 10.5 Bootstrap 1 routine card for the 1410 System (C28-0351-5 p.8)

Full transcription, confirmed at 400 dpi. [verified — upgraded from [likely]]

| Card columns | Punched | Loads to | Function |
|---|---|---|---|
| 1-5 | `00018` | 00012-00016 | I-address of the `R` instruction whose op code the operator keyed at 00011 |
| 6 | group mark | 00017 | d-character of that `R` — tests all channel-1 indicators and clears the I/O interlock without requiring a branch |
| 7 | word separator | (not stored) | sets a word mark on the next character |
| 8-17 | `L x F 0 0 0 0 6 6 R` | 00018-00027 | disk read: x-control `xF0`, B-address 00066, d `R` |
| 18 | word separator | | |
| 19-25 | `y 00035` + group mark | 00028-00034 | status branch, falls through to 00035 |
| 26 | word separator | | |
| 27-36 | `L x F 1 0 0 0 6 6 $` | 00035-00044 | second read |
| 37 | word separator | | |
| 38-44 | `y 00035 2` | 00045-00051 | retry-if-busy branch (d `2`) |
| 45 | word separator | | |
| 46-52 | `y 00059` + group mark | 00052-00058 | status branch |
| 53 | word separator | | |
| 54-59 | `J 00138` | 00059-00065 | branch to the loaded program |
| 60- | WS `a m t t t t h 2` WS group mark | 00066- | 8-character disk control field at 00066 (the B-address both reads carry) followed by a group-mark-word-mark |
| 77-80 | `1410` | — | deck identification |

Legend on the card: `x` = `%` (ch1) or lozenge (ch2) System Operating File; `y` = `R` (ch1) or `X` (ch2); `F` = 1301 disk; `a` = access mechanism, `m` = module, `tttth2` = geometric record address. Every address is self-consistent, which is why the transcription can be trusted. [verified — C28-0351-5 p.8, 400 dpi render]

The glyph in column 6 is the **group mark**, not the record mark: the same glyph reappears after the disk control field where it can only be a group-mark-word-mark, and Figure 36 states "The group mark has all the bits needed to test all of the above six indicators" — the only d-character that clears the I/O interlock without an actual branch. [verified — resolves an earlier open question]

The **7010** Bootstrap 1 card printed alongside is a *different card*, not a relabelled one: `[WS] R 00008 [GM] [WS] L x F 0 0 0 0 5 6 R [WS] y 00025 [GM] [WS] L x F 1 0 0 0 5 6 $ [WS] y 00025 2 [WS] y 00049 [GM] [WS] J 00128 [WS] a m t t t t h 2 [WS] [GM]` with `7010` in cols 77-80. Because the 7010 Load key loads the record at 00001 and auto-starts there, the 7010 card must carry the whole status-branch instruction itself; the 1410 card supplies only the I-address and d-character of the keyed `R`. Every 7010 address is exactly 10 lower than its 1410 counterpart (00008/00018, 00056/00066, 00025/00035, 00049/00059, 00128/00138). [verified — C28-0351-5 p.8]

### 10.6 1402 card read instruction, as documented (A22-0526-3 Figure 61, pp.61-62)

| Mnemonic | Op code | x-control | B-address | d | Operation |
|---|---|---|---|---|---|
| R / R1 (ch1), R2 (ch2) | `M` | `%10` / lozenge`10` | bbbbb | `R` | Initiate feed cycle. Transfer up to 80 characters from read buffer to core storage (stopped by the first GMWM in core). Read card into read buffer. Stack in pocket 0 |
| (same, pocket 1) | `M` | `%11` | bbbbb | `R` | as above, stacked in pocket 1 |
| (same, pocket 2) | `M` | `%12` | bbbbb | `R` | as above, stacked in pocket 2 |
| (buffer only) | `M` | `%19` | bbbbb | `R` | Transfer from read buffer to core storage. NO card feed, NO stacker select |
| RW / R1W (ch1), R2W (ch2) | `L` | `%1x` | bbbbb | `R` | as above, but word separators are read into storage as word marks, each associated with the following character |
| (bootstrap form) | `L` | `%1x` | bbbbb | `$` | GMWMs in core have no effect; take the whole buffer |

Timing T = 49.5 + I/O. Select Stacker and Feed: op `K` (ch1) / `4` (ch2), d = 0, 1 or 2, T = 13.5 + I/O. Punch a Card: `M` or `L`, `%4x`, bbbbb, d = `W`, x3 must be 0, 4 or 8. A branch-if-I/O-channel-status instruction must be given between any 1402 instruction and the next I/O instruction on the same channel. [verified — A22-0526-3 pp.61-63]

### 10.7 Worked console-keying examples from the wild

- **PAT card path** (the only published example of hand-keying a 1402 read on a 1410, and a *simpler* shape than the Monitor's): "2. Place the card deck in the 1402 Card Reader. 3. Press READER START and END-OF-FILE. 4. Mount a scratch tape on channel 1, unit 8... 5. Clear storage from the console. 6. Display location 09247. 7. Set mode switch to ALTER and enter `L%11[0]9257%.` into storage. 8. SET Instruction ADDRESS Register to location 09247. 9. Set mode switch to RUN and press START." The 10-character read instruction sits immediately below its own load address, so execution falls straight through into the card just read. No status branch is needed because this is the first I/O instruction after a reset. [verified — J28-0249, bitsavers PDF p.39 / printed p.41]
- **PAT tape path:** "6. Display location 00201. 7. Set mode switch to ALTER and enter `L%B8 00000 $` into storage. 8. SET Instruction ADDRESS Register to location 00201. 9. Set mode switch to RUN and press START." — a read-to-end-of-core from tape unit 8 starting at 00000, overwriting the keyed instruction. [verified — J28-0249 p.35]
- **PR-108 under SimH:** Richard Cornwell's `a.ini` deposits `dep -c 0 1~l(b000011$~N`. `~` is SimH's word-mark prefix (`i7010_sys.c parse_sym`); `ascii_to_six['(']` = 034 = `CHR_RPARN`, annotated "Also %" in `i7000_defs.h`, so `(` is channel 1. Decoded: status char `1` at 00000; word-marked `L` at 00001; x-control `(b0` = ch1, tape in **odd (binary) parity**, unit 0; B-address 00011; d `$`; word-marked `N` at 00011. The record loads over the `N`, so after the read the IAR points at 00011 = the first character of the tape record. Note PR-108 loads to 00011, the Monitor to 00012. [verified]

### 10.8 Console ALTER mechanics (needed for a faithful keyed boot)

Word marks print in manuals and on the console I/O printer as an inverted circumflex above the character, and can be entered from the console keyboard during a load-read. ALTER requires a completed DISPLAY of the target location first, then rotating the 1415 mode switch to ALTER and pressing START; "Any previously displayed word mark must be re-entered into storage." Termination: "The alter operation continues until a word mark is sensed if one or more fields (but less than one line) were displayed. An alter operation ends when the end-of-line condition is sensed if a multi-line display preceded the alter operation." On a freshly cleared machine there are no word marks, so an ALTER of 00000-00011 runs to the end of the printer line. Also: "If one or more fields (but less than a full line) were previously displayed, only the first displayed field can be altered." [verified — A22-0526-3 pp.5, 49, 51]

### 10.9 x-control field and tape parity

The x-control field is always 3 positions. x1 = channel + overlap (`%`, `@`, lozenge, `*` on a 1410). x2 for tape distinguishes **`U` = even parity (BCD)** from **`B` = odd parity (binary)**: "The odd parity mode is used for writing programs on tape." Carry the parity mode through to the tape device — do not collapse U and B. This is why every tape boot in the surviving literature uses `B`. Maximum-form I/O instruction = 10 positions. Read/write-to-end-of-core (`$`, `X`) cannot be obtained *in overlap*: p.86-87's blunt "cannot be overlapped" is elaborated on p.92 — if such an instruction is coded with an overlap x1 (`@` / `*`), the processing overlap **is** performed and the instruction is automatically changed to a normal read (`R`) or write (`W`), so the transfer honours GMWMs instead of filling to end of core. Do not stall the CPU. (A real divergence from SimH i7010, which sets `CHAN_NOREC` from the d-character alone and never applies the p.92 downgrade.) [verified — A22-0526-3 pp.86-87, 92]

The Asterisk-Insert switch (a 1415 console CE switch) matters on the tape path: on an odd-parity operation a tape mark encountered mid-record produces a data check plus end-of-file, and depending on the switch the tape-mark character is stored as 8421-no-C, left unchanged and invalid, or converted to and stored as an asterisk. Model it, or stub it to the ON behaviour. [verified — A22-0526-3 p.87; C28-0351-5 Tables I/II]

### 10.10 Clear-storage and set-indexes cards

The standalone 9-card load program's last two cards are the utility pair: Clear Storage ("clears all storage above location 00499 to blanks") and Set Indexes ("clears all index registers to blanks and sets word marks at the high order position"). [verified — C20-1602-8, 1410-UT-106] The OS equivalents are loader card types: Clear Storage (col 72 `Y`, low address in 2-6, high in 8-12) and Clear Word Mark (col 72 `W`). [verified — C28-0319-4 pp.65-67]

For contrast, the **1401** convention (do not apply to the 1410): pressing LOAD on the 1402 reads a card into 001-080, sets the I-address register to 001, sets a word mark at 001, removes all other word marks in 002-080, and executes at 001. 1401 object decks come in three loader styles; the "Load Mode" style executes instructions from columns 1-39 that load the image from 40-72, with the bootstrap assembling the main loader starting at location 201. The 1410's standard re-entry point is 00281 and its condensed card puts data in 13-72 behind a 12-column header — analogous, not interchangeable. [verified for the 1401 LOAD key — A24-1403-5; likely for deck styles — ibm-1401.info]

---

## 11. Operating environment and batch context

### Pre-OS: 1410 Processor Operating System

A supervisor that reads control cards, positions the system tape, and calls Autocoder/COBOL/FORTRAN/RPG/IOCS. Two variants:

- Tape: **1410-PR-108**, System Supervisor 1410-SV-907.
- 1301 disk: **1410-PR-134**, System Supervisor 1410-SV-941.

[verified — C20-1602-8 1410 section]

Minimum configurations, from the primary bulletin J28-0243 (1962), which unusually has a real text layer:

- **Tape POS:** 20,000 positions + 4 tape units (729 II/IV/V or 7330, intermixable) + 1402 Model 2 + 1403 Model 2. "NOTE 1: One tape unit each may be substituted for the card reader, the card punch, and the printer" — the "1, 2, or 3 magnetic tape units" trade in C20-1602-8, and it runs **only** in the direction of *more* tape. Figure 3 adds: "The minimum tape requirement for a tape-oriented system is six tape units."
- **Disk POS:** 40,000 positions + Processing Overlap and Priority + 2 tape units + 50 cylinders of 1301 (15 consecutive for the system, 35 working storage across up to three modules). Footnote: **"Users who do not have tape units can substitute an IBM 1402 Card-Read Punch, Model 2, and a 1403 Printer, Model 2, for these two tape units."**
- "The final phase of the FORTRAN, COBOL and RPG processors consists of program assembly and/or macro-expansion handled by the Autocoder Processor"; "intermediate processing takes place on three work tapes."

[verified — J28-0243 pp.6, 9, 10, 11]

**Correction to a tempting generalization:** the tape requirement is *not* architectural. Every 1410 language processor requires **bulk external system residence**, but that residence may be four-plus tape units *or* a 1301 module, and IBM documents a **zero-tape disk configuration** (the catalog's disk Autocoder 1410-AU-942 and disk RPG 1410-RG-943 minimum configurations list no tape units at all: 40K, overlap and priority, 50 cylinders of 1301, one 1402, one 1403). The conclusion for a card-only 1410 is unchanged — it has neither tape nor 1301 — but the reason is "no bulk system-residence device". [verified — J28-0243 p.11; C20-1602-8]

**Even the historical assembler cannot run card-only.** C20-1602-8 for 1410-AU-906: "MACHINE CONFIGURATION 1. 20K STORAGE. 2. FOUR IBM MAGNETIC TAPE UNITS. 3. AN IBM 1402. 4. AN IBM 1403", with the same trade footnote, and the catalog notes "THE 1410 AUTOCODER HAS THE LARGEST MINIMUM REQUIREMENT" of the programs on the PR-108 tape. The System Supervisor SV-907 needs 20K + two tapes + a 1402. This is the strongest single argument for writing a modern TypeScript Autocoder rather than trying to host the historical one. [verified — C20-1602-8 A-1410 004] J24-1433-2 (1961) also says Autocoder "supplements and extends, but does not replace, the basic Autocoder for the IBM 1410" — no manual for that basic Autocoder has been found. [verified for the quote; the referenced product is [unverified]]

### 1410/7010 Operating System (1410-PR-155)

Components: System Monitor = Resident Monitor + Transitional Monitor (1410-SV-962) + Linkage Loader (1410-UT-963); IOCS; Random-Processing Scheduler; System Generation; Tele-processing Supervisor; language processors Autocoder (1410-AU-968), FORTRAN (1410-FO-970), COBOL (1410-CB-969); sorts; utilities (1410-UT-973). [verified — C28-0318-3 pp.6-11; C28-0319-4]

Minimum machine requirements: tape-oriented SOF — 40,000 positions, 5 magnetic tape units, 1 card reader (or an additional tape unit), printer or additional tape recommended for the Standard Print Unit. Disk-oriented SOF — 60,000 positions, one 1301/2302 module, 2 magnetic tape units, 1 card reader. **Processing Overlap and Priority features are required in both cases.** For the disk system the two tapes are needed only for system generation and may then serve other functions (one in place of the card reader, the other in place of the printer) — this does not lower the 60,000-position / one-module floor. [verified — C28-0318-3 p.6]

**Monitor control-card format:** `MON$$` in cols 6-15 (label field), card type in 16-20 (JOB, MODE, EXEQ, COMT, ASGN, END, DATE, SPOOL, PAUSE), operands from col 21 following Autocoder operand rules (comma separated, no blanks). Worked batch (C28-0319-4 Figure 14 / Example 1):

```
MON$$ JOB   ANYNAME
      COMT
      ASGN
MON$$ MODE  GO
MON$$ EXEQ  AUTOCODER      + source deck (TITLE A ... END)
MON$$ EXEQ  AUTOCODER,MR1
MON$$ ASGN  MJB,B2
MON$$ EXEQ  LINKLOAD,,LIB  + PHASE, CALL, TITLE cards and relocatable decks
MON$$ MODE  TEST
MON$$ EXEQ  XYZ,MJB        + data
MON$$ EXEQ  UTILITIES
```

[verified — C28-0319-4 p.43 and p.68]

When `EXEQ AUTOCODER` is processed the Monitor loads a Clear Storage routine that clears storage above the Resident Monitor (except the first 99 positions above it and the top two positions of core), then loads the processor; the processor reads source from the Standard Input Unit, uses three work files, writes relocatable card-image records to the Go file (MODE GO) and also punches a relocatable object deck on the Standard Punch Unit. [verified — C28-0319-4 p.68]

### Program-number map

| Language | Pre-OS tape (1410-PR-108) | Pre-OS disk (1410-PR-134) | 1410/7010 OS (1410-PR-155) | Manual |
|---|---|---|---|---|
| Autocoder | 1410-AU-906 | 1410-AU-942 | 1410-AU-968 | C28-0309, C28-0326 |
| COBOL | 1410-CB-912 | 1410-CB-944 | 1410-CB-969 | C28-0327 |
| FORTRAN | 1410-FO-913 (20K), 1410-FO-950 (40K) | FORTRAN II 1410-FO-945 | 1410-FO-970 | J24-1468, C28-0328 |
| RPG | 1410-RG-910 | 1410/1301 RPG 1410-RG-943 | (not listed) | C28-1443 |
| IOCS | 1410-IO-926 | 1410-IO-926 | 1410-IO-966/967 | C28-0322 / C28-0334 |
| FORTRAN subroutine library | 1410-FO-138 | 1410-FO-138 | (in OS) | — |
| Supervisor / Monitor | 1410-SV-907 | 1410-SV-941 | 1410-SV-962 + Linkage Loader 1410-UT-963 | C28-0319 |
| Standard Load Program | 1410-UT-106 (9-card, distributed with UPOS) | — | — | — |

Source: C20-1602-8 (Jun 1968); A22-6826-4 Bibliography; C28-0318-3. [verified]

---

## 12. Language availability

### 12.1 FORTRAN — four processors, none card-only

| Program no. | Name | Distributed on | Core min | Tape min | Card/print | Compiles to | Manual |
|---|---|---|---|---|---|---|---|
| 1410-FO-913 | 1410 FORTRAN (20K) / FORTRAN II Processor | 1410-PR-108 POS tape | 20,000 | 4 (729 II/IV/V or 7330) | 1402 M2 + 1403 M2 (tradeable only for *more* tape) | Autocoder source, then assembled by 1410-AU-906 | J24-1468-1 |
| 1410-FO-950 | 1410 FORTRAN 40K Processor | 1410-PR-108 POS tape | 40,000 | 4 to compile, +2 to execute object programs (loader/library tape + work tape) | 1402 M2 (or a tape unit) + 1403 M2 (or a tape unit) | relocatable machine language directly | J24-1468-1 |
| 1410-FO-945 | 1410 FORTRAN II Processor (disk) | 1410-PR-134 POS tape | not stated (defers to C26-0287); disk POS needs 40K, overlap+priority, 2 tapes *or* 1402+1403, 50 cylinders of 1301 | ≥2, or zero with the 1402+1403 substitution | 1402; 1403 for library print | Autocoder source, then assembled | C26-0287 |
| 1410-FO-970 | 1410/7010 OS FORTRAN | 1410-PR-155 OS tape | 40,000 (tape SOF) / 60,000 (disk SOF) | 5 (tape SOF) / 2 + one 1301-2302 module (disk SOF) | 1 card reader, or an additional tape unit | OS relocatable format for the Linkage Loader | C28-0328-3 |
| 1410-FO-138 | 1410 FORTRAN Subroutine Library | ordered with FO-913 / FO-945 | — | see note | — | relocation loader + execution subroutines | — |

[verified — J24-1468-1 p.5; C20-1602-8 A-1410 003-006; C28-0318-3 p.6; J28-0243 p.11]

J24-1468-1 p.5, "Machine Requirements", verbatim: "In addition to the core-storage sizes specified above for each version of the FORTRAN processor, execution of either version of the processor requires the following input/output units: 1 IBM 1402 Card Read Punch, Model 2; 1 IBM 1403 Printer, Model 2; 4 magnetic tape units." [verified]

**FO-138 correction:** as of C20-1602-8 (Jun 1968) the FORTRAN Subroutine Library including the relocatable loader is distributed **as a card deck in absolute format**, not on tape: "THE DISTRIBUTION OF THE FORTRAN SUBROUTINE LIBRARY IS IN CARDS IN ABSOLUTE FORMAT. THE AUTOCODER MIXED OUTPUT TAPE FOR 1410-FO-138 CONTAINING THE LIBRARY SUBROUTINE AND THE RELOCATABLE LOADER /TOTAL OF 51 FILES/ IS NO LONGER TO BE INCLUDED IN ANSWER TO REQUESTS... HOWEVER, THE TAPE IS AVAILABLE AS AN OPTIONAL PROGRAM ITEM FOR THOSE WHO REQUEST SYMBOLIC LISTINGS AND PROGRAM DECKS." The catalog also notes "APPENDIX C CONTAINS INSTRUCTIONS FOR CONSTRUCTING AND MAINTAINING A FORTRAN LIBRARY TAPE", so the loader may still need a library tape at load time. [verified for the distribution form; the load-time requirement is [unverified]]

FO-950's execution note in full: the second tape "IS USED AS A WORK FILE BY THE LOADER AT LOAD TIME AND IS THEN AVAILABLE TO THE OBJECT PROGRAM" — the loader/library tape stays permanently occupied. Timing: batches of 4-18 programs took 79-85 min under FORTRAN (20K) vs 12.5-28 min under FORTRAN (40K) on a 40K 1410 with six 729 VI tape units. [verified — C20-1602-8 A-1410 004]

**Dialect:** pre-OS 1410 FORTRAN is FORTRAN II — SENSE LIGHT / IF (SENSE LIGHT) / IF (SENSE SWITCH); READ INPUT TAPE / WRITE OUTPUT TAPE / READ TAPE / WRITE TAPE / END FILE / REWIND / BACKSPACE on symbolic tape units; READ / PUNCH / PRINT / TYPE for card, punch, printer and console; FUNCTION / SUBROUTINE / CALL / RETURN; DEFINE FILE / FETCH / RECORD / FIND for 1301 disk. Card and printer I/O statements do exist, so a FORTRAN *program's* own I/O need not use tape — only the compiler and loader do. OS FORTRAN adds relational and arithmetic IF, symbolic I/O units, and mixing with Autocoder subprograms via the Linkage Loader. [verified — J24-1468-1; C28-0328-3]

### 12.2 FORTRAN numeric storage format (borrowable even though the compiler is unrunnable)

The format is fully specified in the surviving manuals. C28-0328-3 pp.7-8: "Within core storage a real constant is stored in an exponential form occupying f+2 digits (f+2 core-storage positions). The first f digits contain the fraction (a decimal point is understood to precede the high-order digit position). The last two positions hold the exponent." With f=8, +3.14159 is stored as `3141590001`. [verified]

**Corrected layout** — the page was re-read at 1000 dpi and carries **four** over-marks, not one:

| Item | Value | Note |
|---|---|---|
| Real value width | f + 2 core-storage positions | one digit per core position |
| Fraction field | positions 1..f | decimal point understood before position 1 (value = 0.dddd… × 10^exp) |
| Word mark | position 1 | high-order fraction digit |
| Mantissa sign | zone over position **f** (low-order fraction digit) | `+3.14159` and `-3.14159` differ only here |
| Word mark | position **f+1** | the 2-digit exponent is its own word |
| Exponent field | positions f+1, f+2 | plain signed 2-digit power of 10 — **not** excess-50 or biased |
| Exponent sign | zone over position f+2 | this is the low-order position of the whole word |
| Example, f = 8 | `+3.14159` → `3141590001` | fraction 31415900, exponent 01 |
| Real magnitude range | 10^-100 … (1 − 10^-f) × 10^99, or zero | 0.1 × 10^-99 = 10^-100, consistent with plain-signed exponents |
| f default / range | 8 default; 3≤f≤18 (OS FO-970); f≤45 (pre-OS FO-913/FO-950) | set by control card / Monitor card |
| Integer width | k core-storage positions, word mark on the leading digit | `+314` with k=5 → `00314` |
| Integer sign | zone over the units position | zero always stored positive |
| k default / range | 5 default; 3≤k≤20 (OS); k≤99 (pre-OS) | set by control card |
| Integer magnitude range | 1 … (10^k − 1), or zero | OS: "the high-order digits are lost" on overflow; pre-OS: "treated modulo 10^k" |

[verified — C28-0328-3 pp.7-8 at 1000 dpi; J24-1468-1 p.6; word-mark notation A22-0526-3]

Sign-zone convention the format relies on: minus is always a B bit; plus may be B and A bits, no zone bits, or (less commonly) an A bit; machine-developed signs are BA for plus and B for minus. [verified — A22-0526-3, "Sign Change or Development", Figure 11]

Pre-OS extras: a fixed-point constant in an expression "is limited to 45 digits"; when used as a subscript value "only five digits will be used"; f=18 gives "a 20-digit floating-point number, 18 for the mantissa and 2 for the characteristic". [verified — J24-1468-1 p.6]

### 12.3 FORTRAN compiler source: shipped, then lost

IBM sold it. C20-1602-8 optional program material for PR-108: "EIGHT MAGNETIC TAPES — 1410-AU-906 AND 1410-SV-907 ASSEMBLY LISTINGS, /ONE TAPE/… 1410-CB-912 ASSEMBLY LISTINGS, /TWO TAPE/… **1410-FO-913 ASSEMBLY LISTINGS, /THREE TAPES/**… **1410-FO-950 AUTOCODER LANGUAGE, /ONE TAPE/**… 1410-RG-910 ASSEMBLY LISTING, /ONE TAPE/." For PR-134: "**1410-FO-945 ASSEMBLY LISTINGS, /THREE TAPES/**." These are standard Autocoder output tapes and "may also be used to obtain symbolic and condensed decks" — recoverable source, not print images. **None survives in any searched archive.** [verified — C20-1602-8 A-1410 005-006]

| Artifact | Form | Size | Contains compiler source? | Where |
|---|---|---|---|---|
| Autocoder System Tape w/POS (= 1410-PR-108) | BCD tape image, 1 char/byte | 4,616,734 bytes | No — executable system tape (does contain the Autocoder macro/IOCS **library** in symbolic form) | Paul Pierce collection (piercefuller.com/library/kau1401s.html) |
| jpr108-2024.bcd / .zip | BCD tape image (zip has one member, the .bcd) | 1,392,339 bytes | No FORTRAN compiler source; **does** contain ~8,838 lines of readable Autocoder library source | bitsavers.org/bits/IBM/1410/1410-PR-108/ |
| Master PR-155 | BCD tape image | 4,105,480 bytes | No — OS master for sysgen | Paul Pierce (kpr155.html) |
| PR155 from Tulsa | BCD tape image | 4,105,577 bytes | No | Paul Pierce (ktul155.html) |
| 1410/7010 Master Diagnostic Tape | BCD tape image | — | No — diagnostics | Paul Pierce (ktulsa10.html) |
| 1410 & 1401 Diagnostic Master Tape | tape | — | No — diagnostics | Paul Pierce (kd1410.html) |
| 1410-FO-913 ASSEMBLY LISTINGS (3 tapes) | Autocoder listing tapes, IBM optional material 1968 | — | YES — no copy known to survive | not in any archive found |
| 1410-FO-950 AUTOCODER LANGUAGE (1 tape) | Autocoder source tape, IBM optional material 1968 | — | YES — no copy known to survive | not in any archive found |
| 1410-FO-945 ASSEMBLY LISTINGS (3 tapes) | Autocoder listing tapes, IBM optional material 1968 | — | YES — no copy known to survive | not in any archive found |
| github.com/IBM-1401 Fortran-v3m0 / v3m4 | source + listing | — | Yes, but for the IBM **1401** — a different machine and compiler | github.com/IBM-1401 |

[verified — piercefuller.com/library/ibm1410.html; bitsavers /bits and /pdf listings; C20-1602-8; api.github.com/orgs/IBM-1401/repos]

**Correction to the "byte histogram proves it isn't source" argument:** a raw byte histogram cannot tell you whether BCD text is present, because BCD text *is* a 6-bit byte stream. Decoding `jpr108-2024.bcd` through a standard IBM 1401/1410 BCD table yields large runs of readable symbolic Autocoder. What it does *not* contain is the FORTRAN compilers' own source — those are present as object code plus message tables. The headline conclusion (no 1410 FORTRAN compiler source survives) stands; the supporting method does not. [verified]

Both pre-OS compilers are demonstrably present on that image with recoverable version stamps: `* COMPILED BY FORTRAN II, #1410-FO-913, VERSION 05 LEVEL00` and `COMPILED BY FORTRAN40K , 1410-FO-950  VERSION 01 LEVEL 08`, plus the system-tape catalog entry `FORTRAN40K` and the diagnostic message table (`***BAD NAME IN FORTRAN SOURCE STATEMENT`, `INVALID FORTRAN CHARACTER`, `END FORTRAN COMPILATION`, `LAST OBJECT LOCATIONS PROGRAM 00000 COMMON 00000`). [verified]

The two surviving PR-108 images are **not** the same artifact — Pierce's is 4,616,734 bytes, bitsavers' is 1,392,339. Say which one you mean. [verified]

Reproduction targets, if wanted: sky-visions publishes, for PR108, "Fixed to run 20k Fortran", "Job to enable 40k Fortran", "Job to enable 20k Fortran", "Fortran Hello world", "Fortran Prime Numbers", a SimH init file, an Autocoder test job and a sample COBOL program. The author reports being able to compile but not run a FORTRAN program under PR108; the working FORTRAN samples (PI to 10k digits, prime numbers, Laplace transform) all run under PR-155. [verified — sky-visions.com/ibm/ibm7010_soft.shtml]

### 12.4 COBOL

Existed pre-OS (1410-CB-912 tape, 1410-CB-944 disk) and under 1410-PR-155 (1410-CB-969, manual C28-0327 / GC28-0327-5). The disk COBOL processor carries the same "substitute a 1402 + 1403 for these two tape units" footnote as the disk POS. [verified — C20-1602-8; bitsavers /pdf/ibm/1410/]

### 12.5 RPG on the 1410 — stated plainly

**RPG was native to the IBM 1410. It did not require, and did not use, 1401 compatibility mode.**

- Two program numbers: **1410 Report Program Generator 1410-RG-910** (tape POS) and **1410/1301 Report Program Generator 1410-RG-943** (disk POS). [verified — C20-1602-8]
- Mechanism: RPG "accepts report specifications and produces a symbolic program deck (**Autocoder format**) for the desired report program"; generated programs use 1410 IOCS; on the disk system "an Autocoder run will follow automatically to produce the program deck." It is a **preprocessor**, not a compiler — a two-stage flow ending in an ordinary Autocoder assembly. [verified — C20-1602-8 abstracts for 1410-RG-910 / 1410-RG-943]
- Documentation exists under its own form number: the IBM 1410/7010 Bibliography lists "**Report Program Generator for the 1410, C28-1443**" under subject code 28, plus "1401-1410 Report Program Generator — Input Specification Sheet X24-1336..X24-1339". [verified — A22-6826-4]
- Minimums: RPG generation 20K + 1402 + two tapes; the Autocoder assembly of the generated program then needs 20K + 1402 + four tapes + 1403-2 on the tape system; the disk version needs 40K + overlap/priority + 1301. So RPG is no more card-only-runnable than anything else. [verified — C20-1602-8]
- Not listed under the 1410/7010 Operating System (1410-PR-155) in the Jun 1968 catalog. Whether RPG was ever carried into PR-155 is **[unverified]**. [C20-1602-8]

RPG origin dates are contested and not settled here: Wikipedia says RPG was "introduced in 1959 for the IBM 1401" and calls FARGO its predecessor; the primary 1401 RPG manual J24-0215-2 is © 1960, 1961; FARGO C24-1464-2 is © 1961, 1963 (4,000 positions, card input only, a 2-pass interpretive 407 emulator of ~700 cards); a first-hand recollection on ibm-1401.info dates the RPG announcement to January 1961, credits Barbara Wood / Bernie Silkowitz with mirroring 407 panel wiring, and says FARGO "appeared towards the end of 1961 as a Type III program" — i.e. **after** RPG. [likely for the copyrights; unverified for the ordering] The bitsavers 1401 directory holds the full 1401 RPG family: J24-0215-2 card/tape RPG, C24-3166-1 Basic 4K RPG, C24-3267-0 4K RPG operating procedures, C24-3261-0/-1 RPG on Disk, C24-3334-0 RPG on Disk operating procedures, C24-1464-2/-3 FARGO. [verified]

---

**Addendum 2026-08-30 — see `rpg-sources.md` (targeted search beyond bitsavers):**

- The four specification-sheet forms X24-1336..X24-1339 are titled **"1401 - 1410 RPG Input / Data / Calculation / Format Specification Sheet"** in the 1410 publications index N20-1410-27, and A22-6826-4's abstract says they are for the RPG "for IBM 1401/1410 Card Systems". Same physical forms on both machines, so J24-0215-2's column layout **is** the 1410 card-RPG layout — established, not inferred. [verified]
- C28-1443 (not digitised anywhere found; rev -1, 96 pp.) documents **two** 1410 RPGs: **Card-RPG** and **Full-RPG** (cards/tape/1405/1301). A Card-RPG aimed at card installations existed; its minimum configuration is [unverified] and it has no Jun-68 program number. This softens the "RPG is no more card-only-runnable than anything else" line above.
- **The 1410 RPG processor itself survives as object code** on the bitsavers PR-108 tape image (`bits/IBM/1410/1410-PR-108/jpr108-2024.bcd`): phases RPG1–RPG13, RPGIN/RPGDA/RPGCL/RPGFM/RPGED, and its operator messages (`END INPUT SPECS` … `END OF RPG.BEGIN AUTOCODER`) decode cleanly. The 1410 control card is an **`RG` card** (not the 1401 `CNTL`), with separate 1405 and 1301 cards, and generated code uses **1410 IOCS macros** (DTF/GET/PUT). Decode recipe and byte offsets in `rpg-sources.md` §4. [verified]

## 13. 1401 compatibility, from the software side

A **hardware** feature, not an emulator: "The compatibility switch (Figure 56), when at the 1401 setting, makes it possible to run IBM 1401 programs on the 1410. Ordinarily, the switch should be in the 1410 setting." It sits on the 1415 console test panel alongside an I/O Check Stop switch and a 1401 I/O Check-Reset switch, both operative only in 1401 mode; a 1401 Compatibility light shows the switch state; the sense-bit switches "are active as sense switches (A through G) only when operation is in the 1401 mode." [verified — A22-0526-3 pp.56-58]

| Category | Items |
|---|---|
| Memory mapping | 10K 1410 → 8K 1401; all other 1410 sizes → 16K 1401 |
| 1401 features supported | Additional Storage, Multiply-Divide, Expanded Print Edit, Advanced Programming (Indexing, Store Address Register, Move Record), Print Storage, High-Low-Equal Compare, Read-Punch Release, Sense Switches |
| Not supported | Column Binary, Compressed Tape, Punch Feed Read, Serial I/O Adapter devices (1009 / 1011 / 1012 / 1412 / 1418 / 1419), Process Overlap, Selective Tape Listing, Space Suppression |
| Console controls | Compatibility switch (1401/1410), I/O Check Stop switch, 1401 I/O Check-Reset switch, sense-bit switches = sense switches A-G |

[verified — A22-0526-3 p.98]

Documented behavioural differences that a compatibility-mode implementation must reproduce: [verified — A22-0526-3 pp.98-99]

- Invalid-parity input characters become `*` (the 1401 forced valid parity).
- A zero quotient with a blank B-field becomes zeros.
- B-address register after read / print / punch = **082 / 335 / 183** on the 1410 vs **081 / 333 / 181** on the 1401. Refinement: the 1401 value is 333 for a buffered (Print Storage) printer and **335 for an unbuffered printer**; on the 1410 in 1401 mode, op 2 → 335, read/punch families 1/3 → 082 and 4/5/6/7 → 183.
- No set-up character is stored in 000 (`&`) or 100 (`0`) after read/punch.
- MLP-coded cards cause a validity check.
- 1402 end-of-file resets only via Computer Reset.
- Because of the 1414 read buffer the card image lags one card; 1401 read/punch release do not move cards; the stacker-select timing window is 8-82 ms vs ~10 ms on the 1401.
- 51-column reads fill positions 1-14 and 66-80 with blanks.
- **Card character set:** the 1410 punches a core A-bit (blank-A, the "substitute blank") as an 8-2 card combination and reads 8-2 as the A-bit; the 1401 punches an A-bit as a zero and reads 8-2 as an invalid character. No-charge RPQ 898148 makes a 1401 behave like the 1410.
- **Tape load-mode word separators** (matters when running 1401 tape decks in compatibility mode): *writing* in load mode, a word separator in core is written as ONE word separator by the 1401 but TWO by the 1410. *Reading* in load mode, the 1401 eliminates any run of one or more word separators and puts a word mark on the next non-WS character, whereas the 1410 reads a **pair** of adjacent word separators as one word separator with **no** word mark on the following character.
- **Loading tape units:** pressing a tape unit's reset / load-rewind / start keys in rapid succession and then addressing the unit before loading completes — tolerated on a real 1401 — prevents the drive from starting on the 1410; recovery needs Stop, address-set to the tape instruction, Start.

Software consequence: Autocoder source can be written to assemble for either machine, since nearly all 1401 instructions have 1410 equivalents with the same mnemonics — but **object decks are not interchangeable** (3-character vs 5-character addresses). [likely — Wikipedia IBM 1410; consistent with the address formats in A22-0526-3]

SimH's `i7010` implements 1401 compatibility as a CPU model option ("Emulate a 1401"), decoding 1401 3-character zone-tagged addresses (hundreds-position zone ×4000, thousands zone) modulo 16000 with 1401 index registers at 87-99. [verified — rcornwell/sims I7000/i7010_cpu.c]

Whether the 1402 LOAD key functions on a 1410 running in 1401 mode — i.e. whether a 1401 self-loading deck can be booted the 1401 way — is **not** answered by the PrincOps compatibility section or the Operator's Guide. CE document 223-2597 "1410 1401 Compatibility" was not examined. [unverified]

---

## 14. Open items, what each blocks, and the fallback

| Item | Status | Blocks | Fallback |
|---|---|---|---|
| Autocoder 5-card standard load program card images | Not published in any surviving manual; J28-0249 refers to "PART I of this manual" (Parts I/II not on bitsavers); C28-0325-1 is a 4-page fragment | Byte-exact object-deck loader | Write your own 5-card loader to C28-0309-1 Figure 2, re-entry at 00281, card 1 shaped like Bootstrap 1. Recover the real bytes only by running PR-108 Autocoder with a LOAD card and capturing the punch file |
| What the loader actually does at 00281 | Inferable, not documented — PAT toggles it between `N` and `,`, so it is a one-character instruction slot, not obviously a subroutine entry | EX/XFR re-entry fidelity | Model 00281 as a one-character instruction slot in your loader; expose it |
| Does the loader clear core / word marks before loading? | Neither C28-0309-1 nor C28-0326-2 says | Deterministic warm/cold start | Assume it does NOT clear (A22-0526-3 p.7 rule 2), and expose an explicit cold-start option that zeroes storage and word marks so tests are reproducible |
| Does real 1410 hardware clear pre-existing word marks in load mode? | Manuals silent; SimH clears in load mode, preserves in move mode; the 1401's storage-to-storage Load also clears | DC semantics, repeat boots, patch decks | Follow SimH: load mode determines the WM bit entirely from the separator stream; move mode ORs the existing WM back in. Would be worth settling against the 1411 CE manual (223-2692) or ILDs before freezing |
| SimH forces a word mark on the first character of an input record in MOVE mode (`CHAN_WM`) | No matching manual text (A22-0526-3 p.41 mentions only separator passthrough) | Move-mode reads | Treat as a SimH quirk; make it a flag, default off, and revisit if a diagnostic fails |
| Does a real 1402 set any status indicator on a `$` read? | Not documented; A22-0526-3's card tables show only `R`. Legality itself is settled `[verified]` by C28-0351-5 p.8 Table II — see §10.4 and open-questions.md #13 (C17) | Card-read status modelling | Treat `$` as valid and silent on the 1402, per C28-0351-5 prescribing it for the card boot path; no WLR, since the suppressed GMWM test is what would have set it |
| DA punch encoding under OS Autocoder (does the clear-to-blanks emit blank data or a loader directive?) | Effect documented, encoding not | Object-deck fidelity for DA | Model DA as emitting blanks as data plus word separators for the defined fields |
| Does C28-0309-1's DA clear its area? | Not documented for the tape Autocoder | Warm-start behaviour under the standalone assembler | Model tape-Autocoder DA as setting word marks only, leaving data untouched |
| Multi-card constants: is a DCW longer than one card's data field split, and how is the word separator handled at the split? | Not addressed in either Autocoder manual | Long-constant emission | Cap constants at one card's payload and emit an assembler diagnostic if exceeded |
| Appendix C's DA line (CT 81, ADDRS 00315) has a **blank** CARD column despite requesting a group-mark-word-mark | Unexplained | — | Do not conclude DA emits nothing; the GMWM card may be punched elsewhere in the deck |
| Can an FO-913 object deck run on a tapeless 20K 1410? | Unresolved. J24-1468-1 documents no loader; FO-138 supplies "the relocation loader and subroutines necessary for executing FORTRAN object programs" and is card-distributed, but the catalog also documents building a FORTRAN library tape | FORTRAN-on-card-only demo | Assume no. Hand-write the reentry demo in Autocoder |
| NOP / NOPWM as standalone-Autocoder ops | Not found in the C28-0309-1 pages checked | Assembler op table | Accept them (harmless); flag as an OS-only extension if strict standalone fidelity is wanted |
| RPG under 1410-PR-155 | Not listed in the Jun 1968 catalog | RPG-under-OS claims | State RPG as pre-OS only |
| RPG 1959 vs Jan 1961, and FARGO before or after RPG | Contested between Wikipedia and a first-hand account; only the © dates are primary | Nothing in the emulator | Cite J24-0215-2 © 1960,1961 and C24-1464-2 © 1961,1963 and leave the ordering open |
| The "basic Autocoder for the IBM 1410" referenced by J24-1433 (1961) | No manual on bitsavers; not in the 1965 bibliography | Nothing | Ignore; treat C28-0309-1 as the pre-OS assembler of record |
| Whether the 1402 LOAD key works on a 1410 in 1401 mode | CE doc 223-2597 not examined | 1401-deck booting in compatibility mode | Require the keyed console path in all modes |
| C28-0328-1 (earlier edition) and TNL N27-1269 (FORTRAN update) | Not examined | FORTRAN `f`/`k` ranges | Treat 3≤f≤18, 3≤k≤20 as correct for C28-0328-3 as printed, not necessarily as of the last TNL |
| C28-0295 (1410 Utility Program OS) and C28-0244 (card/tape utilities) | Not examined; might describe a card-oriented job flow for small shops | Possible card-only precedent | None needed; the reconstruction path above does not depend on them |
| Whether any FO-913/FO-950/FO-945 listing tape survives outside bitsavers, Pierce, sky-visions and GitHub | Absence claim, not verifiable in the strict sense | Compiler-source recovery | Treat compiler source as lost; a CHM collections query was never exhaustively run |

---

## Sources

- IBM 1410 Autocoder, C28-0309-1 — https://bitsavers.org/pdf/ibm/1410/C28-0309-1_1410_autocoder.pdf (OCR text: https://archive.org/stream/bitsavers_ibm1410C28_4785472/C28-0309-1_1410_autocoder_djvu.txt)
- IBM 1410/7010 OS Autocoder, C28-0326-2 — https://bitsavers.org/pdf/ibm/1410/C28-0326-2_1410_OS_Autocoder.pdf
- IBM 1410/7010 OS Autocoder, C28-0326-1 — https://archive.org/details/bitsavers_ibm1410C28r_7340037
- IBM 1410 Autocoder: Preliminary Specifications, J24-1433-2 (1961) — https://bitsavers.org/pdf/ibm/1410/J24-1433-2_1410_Autocoder_Preliminary_Specifications_1961.pdf
- IBM 1410 Principles of Operation, A22-0526-3 — https://bitsavers.org/pdf/ibm/1410/A22-0526-3_1410_princOps.pdf
- IBM 7010 Principles of Operation, A22-6726 — https://bitsavers.org/pdf/ibm/1410/A22-6726_7010_PrincOps.pdf
- IBM 1410/7010 OS Operator's Guide, C28-0351-5 — http://bitsavers.org/pdf/ibm/1410/C28-0351-5_1410_operGuide.pdf
- IBM 1410/7010 OS System Monitor, C28-0319-4 — https://bitsavers.org/pdf/ibm/1410/C28-0319-4_1410_sysMonitor.pdf
- IBM 1410/7010 OS Basic Concepts, C28-0318-3 — http://bitsavers.org/pdf/ibm/1410/C28-0318-3_1410_basicConcep.pdf
- IBM 1410 Utility Programs Part III (Program Assembly Test System), J28-0249 (1962) — http://bitsavers.org/pdf/ibm/1410/J28-0249_1410_Utility_Programs_Part_III_1962.pdf
- IBM 1410 Operating System Using Magnetic Tape and 1301 Disk Storage, J28-0243 (1962) — http://bitsavers.org/pdf/ibm/1410/J28-0243_1410_Operating_System_Using_Magnetic_Tape_and_1301_Disk_Storage_1962.pdf
- Catalog of Programs for IBM 1410, C20-1602-8 (Jun 1968) — http://bitsavers.org/pdf/ibm/1410/C20-1602-8_1410_pgmCatJun68.pdf
- IBM 1410/7010 Bibliography, A22-6826-4 — https://archive.org/details/bitsavers_ibm1410A22_1893360
- IBM 1410 FORTRAN, J24-1468-1 (1962/63) — http://bitsavers.org/pdf/ibm/1410/J24-1468-1_1410fortran.pdf
- IBM 1410/7010 OS FORTRAN, C28-0328-3 (Dec 1965) — http://bitsavers.org/pdf/ibm/1410/C28-0328-3_1410_Fortran.pdf
- IBM 1401 Reference Manual, A24-1403-5 (Apr 1962) — https://bitsavers.org/pdf/ibm/1401/A24-1403-5_1401_Reference_Apr62.pdf
- Report Program Generator, IBM 1401 Card and Tape Systems, J24-0215-2 — https://bitsavers.org/pdf/ibm/1401/J24-0215-2_cardTapeRPG.pdf
- FARGO for IBM 1401, C24-1464-2 (Jan 1963) — https://bitsavers.org/pdf/ibm/1401/C24-1464-2_FARGO_for_IBM_1401_Jan63.pdf
- bitsavers IBM 1410 PDF directory — http://bitsavers.org/pdf/ibm/1410/
- bitsavers IBM 1401 PDF directory — https://bitsavers.org/pdf/ibm/1401/
- bitsavers 1410 software bits — http://bitsavers.org/bits/IBM/1410/1410-PR-108/
- Paul Pierce Computer Collection Library, IBM 1410 — http://www.piercefuller.com/library/ibm1410.html
- Sky Visions, IBM 7010 Software — http://www.sky-visions.com/ibm/ibm7010_soft.shtml
- Richard Cornwell PR-108 SimH init file — http://sky-visions.com/ibm/7010/pr108/a.ini
- SimH / open-simh I7000 sources (i7010_cpu.c, i7010_chan.c, i7010_sys.c, i7000_defs.h) — https://github.com/open-simh/simh/tree/master/I7000
- rcornwell/sims I7000 — https://raw.githubusercontent.com/rcornwell/sims/master/I7000/i7010_cpu.c
- IBM 1401 Card Deck Formats (1401 analogue only) — https://ibm-1401.info/1401-CardDeckFormats.html
- ibm-1401.info: RPG and FARGO — https://ibm-1401.info/RPG-1401.html
- GitHub organization IBM-1401 (1401, not 1410) — https://api.github.com/orgs/IBM-1401/repos
- Wikipedia: IBM 1410 — https://en.wikipedia.org/wiki/IBM_1410
- Wikipedia: IBM 1401 — https://en.wikipedia.org/wiki/IBM_1401
- Wikipedia: IBM RPG — https://en.wikipedia.org/wiki/IBM_RPG
- Wikipedia: Autocoder — https://en.wikipedia.org/wiki/Autocoder
