# Console and Physical Reference — IBM 1415 Console, 1411/1402/1403, Cards, Print

## Implementer summary

1. The 1415 console is a desk: modified Selectric I/O printer center, wide dark indicator-light panel on a stand behind it, upright control-console cabinet at the operator's right; a hinged door on that cabinet hides the CE panel. [verified]
2. The 1410 shows **no register contents in lights** — every stop, display, alter and inquiry goes out on the typewriter as fixed-format lines (`S`/`C`/`E`/`B`/`#`/`D`/`A`/`I`/`R` + fields). Build the console as a teletype-style log, not a lamp-decoded register bank. [verified]
3. Six-position MODE rotary (RUN top; clockwise DISPLAY, ALTER, CE, I/E CYCLE, ADDRESS SET) plus START / STOP / PROGRAM RESET drives all operator interaction; **any** mode-switch change triggers a stop print-out. [verified]
4. Hard numbers for layout: Selectric 64 chars @ ≤932 cpm on 9 7/8 in pin-feed forms at 6 or 3 lpi; 1403 100/132 positions @ 10 cpi, 600 lpm, 48-char chain, 6/8 lpi; 1402 800 cpm read / 250 cpm punch, 3,000-card hopper, five 1,000-card stackers; card 7 3/8 × 3 1/4 × 0.007 in, 80 cols × 12 rows. [verified/likely]
5. Unverified for UI: 1415 lamp/lens color, 1411 and 1415 cabinet dimensions, exact card hole geometry, green-bar usage in 1961-65. Fallbacks are given per item in "Gaps and fallbacks".

---

## 1. IBM 1415 Console — physical arrangement

- The 1415 Console consists of an I/O printer (a modified IBM Selectric), a control section, an indicator-light panel, and desk space. [verified] — A22-0526-3 p.45
- Desk form: light-colored laminate top, dark pedestals; light panel on a stand behind/above the typewriter with an **IBM 1410** nameplate at top-left; the control console is an upright cabinet at the operator's right. Desk reads ~60 in wide in photos (photo-derived, not a spec). [verified for arrangement / unverified for width] — A22-0526-3 Fig.57 p.59; S223-2648 Fig.1 p.5, Fig.3 p.8
- **The 1410 has no address-dial rotary switches** (unlike the 1401). Addresses are typed on the console typewriter. [verified] — A22-0526-3 pp.50-51
- 1963 system-floor photo (Fig.57): 1414 I/O Synchronizer (tall narrow cabinet), 1411 Processing Unit (long, tall, dark cabinet with vertical panel seams), 1402 Card Read Punch (long low unit, file-feed hopper on top), 1415 console desk with chair, 1403 Printer; raised checkered tile floor. [verified] — A22-0526-3 Fig.57 p.59
- 1411 + 1414 stand about the height of a 729 tape drive (~69-70 in) and together about as wide as four 729s. [likely — secondary] — computercollection.net (Jaeger)

## 2. Console I/O printer (modified Selectric)

- Sphere ("golf ball") type element. Prints 64 characters (10 numeric, 26 alpha, 28 special), a word-mark symbol, and an underscore for invalid parity. Max **932 characters per minute**. [verified] — A22-0526-3 p.45
- Of the 64-character set, 44 characters are lower-case shift and 20 upper-case. 128 odd-parity bit patterns can be *entered* (64 chars with and without word mark); 128 even-parity patterns can be *printed* underscored via the error-underscore feature. [verified] — S223-2648 p.6
- Forms: pin-feed platen, feed holes both margins, horizontal pin-hole spacing **9 3/8 in**, vertical hole spacing **1/2 in**, form width **9 7/8 in**. Index selector lever: single space = 6 lines/inch, double = 3 lines/inch. [verified] — S223-2648 p.78 "Form Size"; A22-0526-3 p.48
- Word marks print as an **inverted circumflex over the character** (printer backspaces and overstrikes). In load-mode console printing, blanks print as a small `b`. A character with an error (bad parity) is **underscored**. [verified] — A22-0526-3 p.49; S223-2648 p.6
- Graphic zero is **slashed (Ø)**; letter O is not slashed. [verified] — C28-0351-5 p.2
- Modified key mapping: **INQUIRY REQUEST** = repurposed Carrier Return key lever; **INQUIRY RELEASE** = repurposed Backspace key; **INQ CAN** = repurposed Index key. Tab, margin release, and power on/off keys are locked out. Word-mark and space keys are non-repeating. Carrier return, backspace and index cannot be commanded from the keyboard. [verified] — S223-2648 p.78; A22-0526-3 p.45
- Keyboard (Fig.43): WORD MARK key at far left of the QWERTY row; LOCK and SHIFT keys; INQUIRY RELEASE, INQ CAN, and a tall INQUIRY REQUEST key at right. Number-row key tops: `4`→`:`, `5`→`@`/apostrophe, `6`→square-root, `7`→`>`, `0` printed as slashed Ø with `b` above, next key `ƀ` (blank) over `‡` (group mark), then `=#`. QWERTY row carries IBM specials (`#` over W, `)` over E, `%`, etc.). Which of the two glyphs actually prints depends on the type element. [verified] — A22-0526-3 Fig.43 p.47; S223-2648 Fig.8 p.11
- Two type elements: **arrangement A** (report writing) and **arrangement H** (program language); five characters differ. [verified] — A22-0526-3 p.47; S223-2648 Fig.8

### Print-out format

Stop print-out line: ID char, space, IAR(5), space, AAR(5), space, BAR(5), space, Op code + Op modifier (2), space, A-channel/B-channel/assembly-channel (3), space, CH1 unit-select+unit-number and CH2 unit-select+unit-number.

- CH1/CH2 unit select/number print as **one 4-character group with no space between channels** (Fig.42 shows `XXXX`); channel-2 registers print only on two-channel systems. In the real log the empty group prints as underlined `bbbb` — i.e. **underline any register field whose contents have bad or absent parity**. [verified] — S223-2648 p.6; A22-0526-3 Fig.42 p.46; C28-0326-2 p.55
- Print positions: S / C / E / B / `#` / D (address line) print-outs occupy **matrix position 35**; the Display data line, Alter, Console Inquiry and Console Reply occupy **matrix position 30**. [verified] — S223-2648 Fig.5 p.9

**Table — 1415 console typewriter print-out layout (1410)**

| Operation | Spacing before | ID char | Fields printed (space-separated) | Matrix pos |
|---|---|---|---|---|
| Normal stop (STOP key / mode change) | double | S | IAR(5) AAR(5) BAR(5) Op+OpMod(2) A-ch/B-ch/Asm-ch(3) CH1+CH2 unit-sel/unit-num (4, no inner space) | 35 |
| Half cycle (I/E CYCLE) | double | C | same as S | 35 |
| Error stop | double | E | same as S | 35 |
| Address set | single | B (`#` if addr-entry switch not NORMAL) | 5-digit address typed by operator | 35 |
| Storage scan set | single | # | 5-digit address | 35 |
| Display | single | D / D | line 1: typed address; line 2: storage contents to word mark | 35 / 30 |
| Alter | single | A | operator-typed replacement data | 30 |
| Console inquiry | single | I | operator-typed message | 30 |
| Console reply (program) | single | R | program message, invalid chars underlined | 30 |

Source: A22-0526-3 Fig.42 p.46; S223-2648 Fig.5 p.9. [verified]

### Real console log sample (1410 OS job, Appendix C Exhibit II)

Verbatim, slashed zeros as `Ø`, blanks as `b`, word marks overstruck:

```
# ØØØØØ
S 149ØØ 1bbbb 11622 bb bbb bbbb
D ØØØØØ
D bbbb...
A AC%BØØØØ12$N
R DATE 64Ø15
R SØ1 JOB  SAMPLE
R ASGN MJB,A1
R MODE GO
R ASGN MGO,A6
R EXEQ AUTOCODER
R 1Ø1Ø1 NR1 M@4Ø144ØØW
R EXEQ LINKLOAD
R EXEQ SAMPLE,MJB
R   EOJ
R END
R END SIU
R ENTER B MESSAGES
# ØØØØØ
```

Source: C28-0326-2 Appendix C Exhibit II p.55. [verified]

## 3. Control console — switches, keys, mode positions

- **MODE rotary, six positions.** Physical layout: RUN at top, ADDRESS SET upper-left, DISPLAY upper-right, I/E CYCLE lower-left, ALTER lower-right, C.E. at bottom (clockwise from RUN: DISPLAY, ALTER, CE, I/E CYCLE, ADDRESS SET). [verified] — A22-0526-3 Fig.47 p.49; S223-2648 Fig.2 p.7
- Power/control keys: EMERGENCY OFF (pull, latches, CE reset only), COMPUTER RESET, DC OFF, READY (light), POWER OFF, POWER ON (illuminated key). Control keys START, STOP, PROGRAM RESET on the lower shelf. [verified] — A22-0526-3 Fig.47 p.49, Fig.48 p.52; S223-2648 Fig.2
- Optional priority-feature panel on the shelf above START/STOP: PRIORITY ON key and rotary PRIORITY PROCESSING selector — OFF / CARD READER / PRINTER / CARD PUNCH / PAPER TAPE READER. [verified] — S223-2648 Fig.2 p.7

**Table — Control console switches and keys (1415)**

| Control | Type | Positions / notes |
|---|---|---|
| MODE | rotary | RUN (top), ADDRESS SET (upper-left), DISPLAY (upper-right), I/E CYCLE (lower-left), ALTER (lower-right), C.E. (bottom) |
| EMERGENCY OFF | pull switch | latches; CE reset only |
| POWER ON / POWER OFF / DC OFF | keys | POWER ON illuminates; separate READY light |
| COMPUTER RESET | key | program reset + start reset + clears checks, clocks, machine indicators; IAR→00001 |
| START / STOP / PROGRAM RESET | keys | lower shelf |
| PRIORITY ON + PRIORITY PROCESSING (optional) | key + rotary | OFF / CARD READER / PRINTER / CARD PUNCH / PAPER TAPE READER |
| ADDRESS ENTRY (CE) | rotary | A, B, C, D, E, F, NORMAL |
| STORAGE SCAN (CE) | rotary | LOAD +1, LOAD 0, OFF, REGEN 0, REGEN +1 |
| CYCLE CONTROL (CE) | rotary | LOGIC STEP, OFF, STORAGE CYCLE |
| CHECK CONTROL (CE) | rotary | RESTART, STOP NORMAL, RESET & RESTART |
| COMPATIBILITY | toggle | 1410 / 1401 |
| 1401 I/O CHECK RESET, I/O CHECK STOP | toggles | ON / OFF |
| DISK WR | toggle | OFF / INHIBIT |
| DENSITY CH1 / CH2 | toggles | 200/556 or 556/800 |
| ASTERISK INSERT | toggle | ON / OFF |
| PRINT OUT CONTROL | toggle | INHIBITED / NORMAL |
| START PRINT OUT | push-button | forces a stop print-out |
| SENSE A-G, WM | 8 toggles, vertical column | BIT labels C, B, A, 8, 4, 2, 1, WM |
| CHECK TEST 1,2,3 | jacks | CE only |

Sources: A22-0526-3 Fig.47 p.49, Fig.48 p.52, Fig.56 p.57, p.58; S223-2648 Fig.2 p.7. [verified]

- Sense switches A-G act as 1401-style sense switches **only in 1401 compatibility mode**. [verified] — A22-0526-3 p.58
- The CE panel lives behind a hinged door on the same control cabinet. [verified] — S223-2648 Fig.2 p.7

### Reset semantics (emulator-critical)

- **Computer Reset** = program reset + start reset + reset of check circuits, timing clocks, and all machine indicators (overflow, compare); IAR → 00001. **Remote/other inquiry latches and the tape-density latches are NOT reset; the console inquiry latch IS reset.** Chain of evidence: S223-2648 p.76 item 1 gives Computer Reset as "Program reset and start reset"; A22-0526-3 p.52 gives Program Reset as resetting "the A- and B-data registers, Op register, Op-modifier register, and console inquiry latch"; A22-0526-3 p.49's "The inquiry latches (except the console inquiry latch) and the tape density latch are not reset" carves the console latch **out** of the not-reset set, leaving only the remote/1014 inquiry latches (those tested by `J iiiii Q`) and the tape-density latch surviving. *(Correction: an earlier reading that the console inquiry latch survives Computer Reset is wrong. Caution when reading S223-2648: its p.76 item 5 says bare "Inquiry latches are not reset" with no console exception — that is a condensed restatement of PrincOps p.49; item 1 on the same page plus PrincOps p.52 govern.)* [verified] — A22-0526-3 p.49, p.52; S223-2648 p.76 items 1 and 5
- **Program Reset**: resets check circuits, IAR → 00001, A and B data registers, Op register, Op-modifier register, console inquiry latch. In detail: resets cycle/scan control latches, I- and A-ring triggers; sets Op register, Op-modifier register and A-data register to C-bit only (blank with correct parity); sets the "branch to 00001" latch; resets the storage address register, set-check circuits, 1401 control latches, arithmetic control latches, logic clocks, console control latches; triggers a Start Reset. [verified] — A22-0526-3 p.49, p.52; S223-2648 p.75
- **Start Reset**: clears address-check and address-exit error latches so the operator can proceed after a master error stop. [verified] — S223-2648 p.75
- **Power-On Reset** = program reset + start reset + computer reset, plus a **System Reset** clearing all seven address registers (CAR, BAR, AAR, DAR, IAR, EAR, FAR — all latches off) and the inquiry-request control latch. **Tape density latches are never reset by any reset key.** [verified] — S223-2648 pp.76-77
- **STOP key**: stops after the current instruction and prints the `S` line. [verified] — A22-0526-3 p.52

### Check Control and Asterisk Insert

- STOP NORMAL = immediate stop plus error print-out on any CPU or input-parity error (with asterisk insert OFF).
- RESTART = same stop and print-out, then automatic restart.
- RESET & RESTART = error print-out, computer reset, then restart.
- ASTERISK INSERT ON replaces bad-parity input characters with `*` and continues.
[verified] — A22-0526-3 p.56

## 4. Operator procedures

**Display.** Stop the system → MODE to DISPLAY → press START: machine prints `D`, space, keyboard unlocks → operator types the 5-digit high-order address → keyboard auto-locks, carrier returns, line spaces → machine prints `D`, space, then storage contents until a word mark (the word-marked character prints with its mark). START again displays the adjacent field; holding START gives continuous display. [verified] — A22-0526-3 p.51

**Alter.** Must follow a display. MODE to ALTER → START prints `A`, space, keyboard unlocks → operator types corrections. Ends at a word mark or end of line. [verified] — A22-0526-3 p.51

**Display/alter wraparound.** On 10K machines, display and alter stop at the last storage location. On 20K-80K machines, display continues from 00000 after the last location unless that location carried a word mark; alter wraps to 00000 unless the last character was printed at end of line or has a word mark. [verified] — A22-0526-3 p.51

**Address Set.** Press STOP (produces the normal stop print-out) → MODE to ADDRESS SET → START prints `B`, single space → type the 5-digit address into the IAR → automatic carrier return → MODE to RUN or I/E CYCLE → START. With the CE ADDRESS ENTRY rotary set to A-F, the typed address loads that register instead of the IAR, and the ID prints as `#`; the switch must be returned to NORMAL before pressing START. [verified] — A22-0526-3 p.50, p.57

**I/E Cycle.** Each START executes one instruction phase; the print-out is preceded by `C`, then IAR, AAR, BAR, Op, Op modifier, A-data, B-channel, assembly channel, and unit select/number for channels 1 and 2. [verified] — A22-0526-3 p.50

**Mode-switch side effect.** **Any** change of the mode-switch setting — not only the STOP key — causes a stop print-out once the current instruction completes. [verified] — A22-0526-3 p.50

## 5. Indicator light panel

Left-to-right box order across the panel: **CENTRAL PROCESSING UNIT** (I RING, A RING, CLOCK, SCAN/SUB SCAN, CYCLE, ARITH) | **STATUS** | **I/O CHANNEL CONTROL** (CH1, CH2) | **I/O CHANNEL STATUS** (CH1, CH2) | **SYSTEM CHECK** (PROCESS, PROGRAM) | **POWER** | **SYSTEMS CONTROLS**. *(Correction: STATUS is a labeled column immediately right of ARITH — do not omit it, and do not place I/O CHANNEL CONTROL directly after the CPU box.)* [verified] — S223-2648 Fig.3 p.8

The 1415 lights are decimal/character-oriented, not binary-encoded registers. [likely — secondary] — computercollection.net (Jaeger)

**Table — Indicator light panel groups (1410, left to right)**

| Box | Sub-group | Lights |
|---|---|---|
| CENTRAL PROCESSING UNIT | I RING | OP, 1,2,3,4,5,6,7,8,9,10,11,12 |
| | A RING | 1-6 |
| | CLOCK | A,B,C,D,E,F,G,H,J,K |
| | SCAN / SUB SCAN | N,1,2,3 / U,B,E,MQ |
| | CYCLE | A,B,C,D,E,F,I,X |
| | ARITH | CARRY IN, CARRY OUT, A COMPL, B COMPL |
| STATUS | | B>A, B=A, B<A, OVERFLOW, DIVIDE OVERFLOW, ZERO BALANCE |
| I/O CHANNEL CONTROL | CH1, CH2 | INTERLOCK, RBC INTERLOCK, READ, WRITE, OVERLAP IN PROCESS, NOT OVERLAP IN PROCESS |
| I/O CHANNEL STATUS | CH1, CH2 | NOT READY, BUSY, DATA CHECK, CONDITION, WRONG LENGTH RECORD, NO TRANSFER |
| SYSTEM CHECK | PROCESS | A CHANNEL, B CHANNEL, ASSEMBLY CHANNEL, ADDRESS CHANNEL, ADDRESS EXIT, A REGISTER SET, B REGISTER SET, OP REGISTER SET, OP MODIFIER SET, A CHARACTER SELECT, B CHARACTER SELECT |
| | PROGRAM | I/O INTERLOCK, ADDRESS CHECK, RBC INTERLOCK, INSTRUCTION CHECK |
| POWER | | THERMAL, CB TRIP, I/O OFF LINE, TAPE OFF LINE, DISK OFF LINE |
| SYSTEMS CONTROLS | | 1401 COMPAT, OFF NORMAL, PRIORITY ALERT, STOP |

Sources: A22-0526-3 Figs.49-55 pp.52-55; S223-2648 Fig.3 p.8. [verified]

**The last box is titled `SYSTEMS CONTROLS`, plural — Tom's ruling, 2026-09-03: "go with the photograph."** The two sources above disagree on this one label and both are primary: A22-0526-3 Figure 55 p.55 *prints* `SYSTEM CONTROLS`, while the S223-2648 Figure 3 p.8 *photograph* shows the panel silkscreened `SYSTEMS CONTROLS`. This section followed the printed figure from wave 0 until the ruling reversed it in favour of the physical object. Nothing about the citation changes — both sources still stand above — only which of them the label follows. Recorded here so that a later reader who finds Figure 55 is looking at a decision and not at a typo. [verified] — S223-2648 Fig.3 p.8

**Light semantics worth wiring up:**
- **OFF NORMAL** lights when any of: print-out control INHIBITED; asterisk insert OFF; cycle control not OFF; check control not STOP NORMAL; storage scan not OFF while the mode switch is at CE; or address entry not NORMAL. [verified] — A22-0526-3 p.56
- **STOP** = system stopped needing operator intervention. **1401 COMPAT** follows the compatibility toggle. [verified] — A22-0526-3 p.56

## 6. 1411 Processing Unit — physical

- Tall dark SMS-gate cabinets, long, with vertical panel seams; roughly 70 in high, matching the 1414 and the 729 tape drives. [verified for appearance] — A22-0526-3 Fig.57 p.59
- 1411 + 1414 together about as wide as four 729 tape drives. [likely — secondary] — computercollection.net
- **No IBM dimension figures located for the 1411 or the 1415 cabinet.** The I/O-components planning manual GC22-6681-4 covers only I/O units; the 1410 system physical-planning manual was not found on bitsavers, and the local "Preliminary Installation Instructions for the IBM 1410" (Oct 1962) 1415 section covers cabling only. [unverified]

## 7. 1402 Card Read Punch

- Model 2: reader **800 cpm**, punch **250 cpm**, file feed holds up to **3,000 cards**; five radial stackers of **1,000 cards each**. [verified] — A22-0526-3 pp.59-60, Figs.58-59
- Stacker labels left to right: **0 (NP), 4, 8/2, 1, 0 (NR)**. Reader can select pockets 0(NR), 1, 8/2; punch selects 0(NP), 4, 8/2. Cards with validity or hole-count errors are stacked automatically in NP/NR. [verified] — A22-0526-3 pp.60-61
- Card travel: read feed — face down, **9-edge first, right to left**; punch feed — **12-edge first, left to right**. [verified] — A22-0526-3 p.59
- Reader start feeds three cards; punch start feeds two. [verified] — A22-0526-3 p.60
- Keys/lights strip along the top: keys PUNCH START, PUNCH STOP; lights PUNCH READY, CHIPS, PUNCH CHECK, PUNCH STOP, STACKER, POWER, FUSE, TRANSPORT, VALIDITY, READER READY, READER CHECK, READER STOP; keys END OF FILE, READER STOP, READER START. [verified] — A22-0526-3 Fig.60 p.61
- Dimensions 57-1/2 × 29 × 35 in, 1,400 lb. (The 35 in height reads low against photos showing the hopper on top; it is what IBM's table prints, and no cross-check source exists on bitsavers.) [verified as printed / suspect in fact] — GC22-6681-4 p.14

## 8. 1403 Printer

**Table — 1403 printer numbers**

| Item | Value |
|---|---|
| Print positions | 100 (Model 1) / 132 (Models 2, 3) |
| Character pitch | 10 per inch (13.2 in print line at 132 positions) |
| Line pitch | 6 or 8 lines per inch, selected by the feed clutch |
| Speed | 600 lpm (M1/M2); 1,100 lpm (M3, train); 1,285 lpm numeric-only with the numeric print feature |
| Character set | 48 (26 alpha, 10 numeric, 12 special) |
| Chain | five 48-character sections; magnet-driven hammers at 132 positions |
| Ribbon | 14 in standard, 11 in optional |
| Forms | pin tractors, continuous; up to six-part forms |
| Print density lever | A (darkest) to E (lightest), C normal |
| Cabinet | 47-3/4 W × 28-1/2 D × 53-1/4 H in, 750 lb |
| Green-bar stock | 14 7/8 × 11 in, 1/2 in bars = 3 lines at 6 lpi (4 at 8 lpi), 132 cols at 10 cpi [likely] |

Sources: A22-0526-3 p.67, Fig.68; GA24-3073-8 pp.14-16; GC22-6681-4 p.14; pdp8online greenbar. [verified except green-bar row]

- Front panel (Fig.69) shows two rows: top row PRINT READY, END OF FORMS, FORMS CHECK; second row CARRIAGE RESTORE, CARRIAGE SPACE, SINGLE CYCLE, PRINT CHECK, SYNC CHECK, with CHECK RESET and CARRIAGE STOP. The PRINT START (dark key) / PRINT STOP (light key) pair is repeated on the rear (Fig.70). [verified] — A22-0526-3 pp.68-69
- Manual controls: FEED CLUTCH (neutral / 6 or 8 lines per inch), PAPER-ADVANCE KNOB, VERTICAL-PRINT ADJUSTMENT, LATERAL-PRINT VERNIER, ribbon-width lever. Carriage control tape governs vertical forms control. Rear paper stacker rack. [verified] — A22-0526-3 p.68, Figs.69-71; GA24-3073-8

## 9. Unit dimensions

**Table — Unit dimensions (IBM physical planning, inches)**

| Unit | Front (W) | Side (D) | Height | Weight lb |
|---|---|---|---|---|
| 1402 Card Read/Punch | 57-1/2 | 29 | 35 | 1,400 |
| 1403 Printer | 47-3/4 | 28-1/2 | 53-1/4 | 750 |
| 1414-1,2,7 I/O Sync | 37-1/2 | 31-1/2 | 70 | 500 |
| 1414-4,5,6 I/O Sync | 74 | 32 | 70 | 1,200 |
| 729 Tape | 29-1/8 | 33-7/8 | 69-1/4 | 1,160 |
| 1014 Remote Inquiry | 24 | 29 | 35 | 175 |

Source: GC22-6681-4 p.14. [verified] — the 1411 and 1415 are **not** in this I/O-components table.

## 10. 80-column card

**Table — 80-column card numbers**

| Item | Value | Confidence |
|---|---|---|
| Size | 7 3/8 × 3 1/4 in (187.3 × 82.55 mm) | likely (Wikipedia/Jones; not found in the local 1401 Reference Manual text) |
| Thickness | 0.007 in (~143 cards/inch) | likely |
| Columns | 80 | verified |
| Rows | 12 (12/11 zone + 0-9) | verified |
| Column pitch | 0.087 in (80 cols ≈ 6.96 in) | likely (secondary; ANSI X3.21-1967 not read) |
| Row pitch | 0.250 in (12 rows = 3.0 in) | likely (same) |
| Hole | 0.055 in wide × 0.125 in high, rectangular | likely (same) |
| Corner cut | one upper corner, diagonal; left cut standard on 5081-style layout forms | likely |
| Corners | square until 1964, rounded after | likely |
| Interpretation band | top 3/16 in of the card, printed by printing punches | verified (IBM 22-5526-4 p.8) |
| Printed face | rows 0-9 as digit rows; column numbers 1-80 printed under row 0 and under row 9; R(12) and X(11) zone rows unprinted above row 0; "IBM" printed vertically at the left edge | verified (22-5526-4 Figs.3-5 pp.9,12) |
| Field rules | headings along the top between the zeros and the edge; vertical field-divider lines drawn midway between columns, not extending below the column-number line at the bottom | verified (22-5526-4 p.8, p.11) |
| 5081 | general-purpose layout, no field divisions | verified |

## 11. Period colors and materials

- IBM's Noyes-era "Color for Computers" program offered panels in **Flame Red, Sun Yellow, Sky Blue, Deep Charcoal, Light Gray**. [likely — secondary, esotericsurvey citing paulrand.design] 
- UW Madison's 1410 had **red** skins; the Wisconsin Dept of Administration's 1410 had **blue**. [likely — secondary, Jaeger]
- Period photos: dark (charcoal) cabinets with light top surfaces; light-gray Selectric; dark console front with white legend text and backlit white/clear lens lights. [verified from photos — A22-0526-3 Fig.57; S223-2648 Figs.1-3]
- **1415 lamp/lens color has no primary source.** The CE Fig.2/Fig.3 photos are black and white. The claim that "labels light up red on fault" is from a **1401** page and does **not** transfer to the 1415. [unverified for 1410]
- Best free color reference: Postgirot Stockholm, 4 Jan 1965, 2226×1473, CC0, showing the 1415 console front with 1414 and 1411 behind. [verified] — Wikimedia Commons

## 12. Autocoder listing format (as printed on the 1403)

Page heading: date at left (e.g. `64015`), HEADR text centered (e.g. `SAMPLE PROGRAM USING 1410/7010 AUTOCODER`), `PAGE n`, then the 5-character identification (e.g. `SAMPL`). Normally **55 lines per page** (system symbol `/LIN/`; values below 30 are rejected). [verified] — C28-0326-2 pp.10-11, 56-57

**Table — 1410 OS Autocoder listing columns**

| Column | Content |
|---|---|
| SEQNO | statement sequence number |
| (S/G) | S = out-of-sequence warning, G = macro-generated; printed between SEQNO and PGLIN |
| PGLIN | page/line from card cols 1-5 |
| LABEL | cols 6-15 |
| OPCOD | cols 16-20 |
| OPERAND | cols 21-72 |
| REL | relocation indicator (may use a second line for unprintables) |
| CT | character count |
| ADDRS | relative address (5 digits) |
| INSTRUCTION | assembled machine code, e.g. `J 00054`, `D 00394 00306 L` |
| CARD | object deck card number |
| FLAG | F, M, N, O, R, U, W |

Source: C28-0326-2 Fig.2 pp.10-11. [verified]

- **Listing trailer**: `NUMBER OF FLAGGED STATEMENTS NONE` when there are no flags; with flags, the count followed by a line listing up to 20 flagged sequence numbers. Then `1410/7010 AUTOCODER...SYSTEM /MID/ 0001`. *(Correction: the trailer is not always the literal form "NUMBER OF FLAGGED STATEMENTS n".)* [verified] — C28-0326-2 p.57 Exhibit IV Part B; p.11
- **Coding sheet / card columns** (1410 Autocoder): page 1-2, line 3-5, label 6-15, operation 16-20, operand 21-72, identification 76-80; a comments card carries `*` in column 6. [verified] — C28-0309-1 pp.5-7
- **Error flags**: basic (non-OS) Autocoder F (format), U (undefined label), M (multiply defined), O (invalid op). OS Autocoder: F, M, N, O, R, U, W. [verified] — C28-0309-1 p.20; C28-0326-2 p.11
- The **1401** Autocoder listing heading differs — `SEQ PG LIN LABEL OP OPERANDS SFX CT LOCN INSTRUCTION TYPE CARD` with a title line and `PAGE n`. Do not mix it into a 1410 renderer. [verified] — bitsavers 1401_autocoderListing.pdf p.1

## 13. Gaps and fallbacks

| Item | Status | Blocks | Fallback |
|---|---|---|---|
| 1415 indicator lamp/lens color | unverified | Console UI palette | Warm white/amber incandescent behind a clear-white lens on a charcoal panel with white silkscreen legends; do not copy the 1401 red-fault convention |
| 1411 and 1415 cabinet dimensions | unverified | Scale-accurate machine-room view | 1411 ≈ 70 in high matching the 1414/729; 1415 desk ≈ 60 in wide from photos; treat as approximate and don't label with a spec number |
| 1402 height 35 in vs. photos | contradictory | Machine-room elevation | Use IBM's 57-1/2 × 29 × 35 in as printed; if a rendering looks wrong, treat 35 in as the deck height excluding the file-feed hopper |
| Card hole/pitch geometry (0.087 / 0.250 / 0.055 / 0.125 in) | likely, secondary only | Card renderer / keypunch view | Use these numbers; they reproduce a correct 7 3/8 in card. ANSI X3.21-1967 is the governing standard if exactness matters |
| Card size 7 3/8 × 3 1/4 × 0.007 in provenance | likely (Wikipedia's cited IBM source not confirmed) | Card renderer | Use as-is; the aspect ratio is uncontested across every source |
| Corner cut side (left vs right upper) | likely | Card art | Left upper cut, per the 5081 layout form |
| Green-bar 14 7/8 × 11 with 1/2 in bars | likely, modern vendor specs | 1403 output view | Render green-bar as default with a plain-white toggle |
| Whether 1961-65 1410 sites used green-bar or plain white | unverified | 1403 output view aesthetic | Default to green-bar, make it switchable |
| 1415 lights color-coding by group | unverified | Light panel | Uniform lamp color per panel; distinguish groups by silkscreened box borders, not by lens color |

## Sources

- IBM 1410 Principles of Operation A22-0526-3 (1415 pp.45-58, 1402 pp.59-66, 1403 pp.67-83) — http://bitsavers.org/pdf/ibm/1410/A22-0526-3_1410_princOps.pdf
- IBM 1415 Console Model 1 CE Instruction-Reference S223-2648 — http://bitsavers.org/pdf/ibm/1410/CE_Instruction_Reference_Maintenance/1415_Console/S223-2648_CE_Instruction_1415_Console_Model1.pdf
- IBM 1410/7010 OS Autocoder C28-0326-2 — http://bitsavers.org/pdf/ibm/1410/C28-0326-2_1410_OS_Autocoder.pdf
- IBM 1410 Autocoder C28-0309-1 — http://bitsavers.org/pdf/ibm/1410/C28-0309-1_1410_autocoder.pdf
- IBM 1410/7010 OS Operator's Guide C28-0351-5 — http://bitsavers.org/pdf/ibm/1410/C28-0351-5_1410_operGuide.pdf
- IBM Physical Planning, I/O Components, 7000 Series and 1410, GC22-6681-4 — http://bitsavers.org/pdf/ibm/1410/GC22-6681-4_1410_7000_Series_IO_Components_Physical_Planning.pdf
- IBM 1403 Printer Component Description GA24-3073-8 — http://bitsavers.org/pdf/ibm/1403/
- IBM The Design of IBM Cards 22-5526-4 — http://bitsavers.org/pdf/ibm/punchedCard/Training/22-5526-4_The_Design_of_IBM_Cards_Mar56.pdf
- 1401 Autocoder listing sample — http://bitsavers.org/pdf/ibm/1401/1401_autocoderListing.pdf
- bitsavers 5081 card scan (32 MB TIFF) — http://bitsavers.org/pdf/ibm/punchedCard/Card_Scans/5081_Card.tif
- Jay Jaeger, IBM 1410 Data Processing System — https://www.computercollection.net/index.php/the-ibm-1410-data-processing-system/
- Jay Jaeger, IBM 1410 page — https://www.computercollection.net/ibm1410/ibm1410.htm
- Jay Jaeger, IBM 1410 FPGA console output — https://www.computercollection.net/index.php/2021/02/15/ibm-1410-fpga-console-output/
- cube1us/IBM1410Console (C# console UI) — https://github.com/cube1us/IBM1410Console
- IBM 1410 Data Processing System photo, Postgirot 1965 (CC0) — https://upload.wikimedia.org/wikipedia/commons/6/60/IBM_1410_Data_Processing_System_%28cropped%29.jpg
- Columbia University IBM 1410 page — https://www.columbia.edu/cu/computinghistory/1410.html
- CHM catalog IBM 1400 series photos — https://www.computerhistory.org/collections/catalog/102630536
- Punched card — Wikipedia — https://en.wikipedia.org/wiki/Punched_card
- quadibloc, The Punched Card — http://www.quadibloc.com/comp/cardint.htm
- Douglas Jones, punched card history — https://homepage.cs.uiowa.edu/~jones/cards/history.html
- pdp8online green bar paper — https://www.pdp8online.com/images/greenbar.shtml
- IBM 1403 ON-LINE virtual print server — https://1403.cdox.cc/
- 1403 Vintage Mono Pro font — https://1403.slantedhall.com/
- masswerk Virtual Keypunch — https://www.masswerk.at/keypunch/
- pkimpel retro-1620 web emulator — http://www.phkimpel.us/IBM-1620/
- Ken Shirriff, accounting machines and the 1403 — http://www.righto.com/2019/01/accounting-machines-ibm-1403-and-why.html
- IBM 1401 Mainframe / Design (Noyes colors) — https://esotericsurvey.blogspot.com/2021/09/ibm-1401-mainframe-design.html
- Ken's 1401 console page (1401, not 1410) — https://ibm-1401.info/KensConsole-1.html
