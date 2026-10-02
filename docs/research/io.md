# IBM 1410 Input/Output

**Implementer summary**

1. All I/O goes 1411 CPU -> 1414 Input-Output Synchronizer -> device. The 1414 Model 3 holds the 80-char card-read buffer, the 80-char card-punch buffer and the 100/132-char print buffer; the CPU never touches card/print hardware directly, only buffers. [verified]
2. Every I/O instruction is `op | x1x2x3 | bbbbb | d` (max 10 positions): op = M/L (move/load data transfer), U (tape unit control), K/4 (select stacker ch1/ch2), F/2 (carriage control ch1/ch2); x1 = channel+overlap, x2 = device type, x3 = unit/sub-op; b = 5-digit core address; d = R/W/$/X etc. [verified]
3. Data moves left-to-right from B until a group-mark-with-word-mark (GMWM) is sensed **in core** (or IRG/end-of-data for tape/disk). The GMWM is read out, tested, regenerated, never overwritten, and BAR ends one position past it: `BAR = B + LB + 1`. Suppressed by the `$`/`X` end-of-core d-character, which is decoded at **channel** level and therefore applies to the 1402 as well as to tape (§3, conflict C17). [verified]
4. Hard interlock: each I/O instruction sets a per-channel interlock that only a `R`(ch1)/`X`(ch2) status branch clears — either one that actually branches, or `R/X (I) <group-mark>` which clears without branching. Two I/O instructions on one channel with no intervening R/X = **system stop**. [verified]
5. Load mode (op L) input **replaces the whole target byte including the word-mark bit** — existing word marks in stored positions are erased, not OR-ed. Move mode leaves them alone. This is the single most-missed rule and it is documented only in the CE manual, not the PrincOps. [verified]

---

## 1. Architecture: 1411, 1414, channels E and F

| Item | Detail | Conf |
|---|---|---|
| Channel 1 | Standard. Registers **E-1**, **E-2** (single character each) + 5-char **E-address register**. | [verified] |
| Channel 2 | Special feature; **requires** the processing-overlap feature. Registers **F-1**, **F-2** + 5-char **F-address register**. | [verified] |
| Cycle steal | An overlapped transfer steals one **4.5 µs** cycle per character (4.0 µs with the 1410 Accelerator). Max delay before the CPU yields = 11.25 µs. Channel 1 wins if both request simultaneously. | [verified] |
| Concurrency | **One device per channel active at a time.** All tape units on a channel sit behind one Tape Adapter Unit (TAU); one busy unit blocks the channel except for rewinds already in progress. | [verified] |
| End-of-op address | At completion the E-address register holds the address **two positions right of the last data character** — because the GMWM after the record must be read out and tested. Equivalent to `B + LB + 1`. | [verified] |

Source: A22-0526-3 pp. 40, 92-95.

### 1414 models

| Model | Function |
|---|---|
| 1 | up to ten 729 II/IV/V per channel |
| 2 | up to ten 7330 per channel |
| 7 | as Model 1 plus 729 VI |
| 3 | 80-char card read buffer + 80-char card punch buffer + 100/132-char print buffer (1402/1403 attachment) |
| 8 | as Model 3 without the card buffers |
| 4 / 5 | telecommunications (1011, 1009, up to twenty 1014, telegraph) |

Source: A22-0526-3 p.40, Figure 39. [verified]

### Seven-bit vs eight-bit devices

223-2692 contradicts itself: printed p.8 says "The IBM 1415 Console and the disk storage units (IBM 1301, IBM 1311, and IBM 1405) are eight-bit devices"; printed p.9 says "All I-O units except the disk storage units are seven-bit devices." **Implement the console as eight-bit** — the p.8 version is the one A22-0526-3 Figure 44 supports, since RCPW enters word marks into storage directly from the keyboard. Everything else (1402, 1403, 729/7330, 1011) is seven-bit: a word-mark-over-word-separator character can never be read into the CPU from those. [verified] (223-2692 pp.8-9; A22-0526-3 Figure 44)

---

## 2. I/O instruction formation and unit selection

Instruction form: op code, optional A/I-address or 3-character X-control field, 5-digit B-address, d-character. Valid instruction lengths 1, 2, 5, 6, 7, 10, 11, 12 positions; I/O instructions are max 10 (`O xxx bbbbb d`). [verified] (A22-0526-3 p.11)

### X-control field encoding (Figure 107)

| Position | Char | Meaning |
|---|---|---|
| x1 (hundreds) | % | Channel 1, non-overlap |
| x1 | @ | Channel 1, overlap |
| x1 | lozenge (⌑) | Channel 2, non-overlap |
| x1 | * | Channel 2, overlap |
| x2 (tens) | 1 | Card reader (1402) |
| x2 | 2 | Printer (1403) |
| x2 | 4 | Card punch (1402) |
| x2 | U | Magnetic tape, even parity (BCD) |
| x2 | B | Magnetic tape, odd parity (binary) |
| x2 | T | Console I/O printer (1415) |
| x2 | F | 1311 disk storage (per A22-6704) |
| x3 (units) | 0-9 | Tape unit number |
| x3 | 0,1,2 | 1402 read: stack in pocket NR/1/8-2 |
| x3 | 0,4,8 | 1402 punch: stack in pocket NP/4/8-2 |
| x3 | 9 | 1402 read, no stack / no feed |
| x3 | 0,1 | Printer: 0 = write line, 1 = write word marks as 1s |
| x3 | 0 | Console printer (no meaning) |
| x3 | 0-9,@ | 1311 disk operation (0 seek, 1 sector mode, 3 write disk check, 4 store DCF, 5 sector count overlay, 6 track sectors w/ addr, 2/7/8/9/@ features) |

Source: A22-0526-3 p.105 Figure 107; A22-6704 p.7 Figure 6. [verified]

**Decode on the BCD code, not the ASCII glyph.** Figure 107 carries a "Code Alternate" column: %, @ and lozenge also print as `(`, `'` and `)` on alternate type heads/chains. SimH's i7010 decodes % and `(` (CHR_RPARN), lozenge and `)` (CHR_LPARN), @ and `'` (CHR_QUOT) as the same channel selector. [likely] (A22-0526-3 p.105; SimH i7010_cpu.c)

**SimH caution:** its 7010 CPU decodes four channels (`?`, `!`, `$`, `=` as x1 symbols) and a `K` x2 device (communications). Those are 7010 extensions, **not** 1410 features. [verified]

### I/O instruction summary (channel-1 forms; substitute lozenge for ch2, @/* for overlap)

| Operation | Autocoder | Actual form | Notes |
|---|---|---|---|
| Read a card, stack pocket 0/1/2 | R / R1 / R2 (RW load) | M or L %10/%11/%12 (B) R | 80 chars buffer->core to GMWM, stack, feed |
| Read a card, no stack/no feed | R(#)9 | M or L %19 (B) R | buffer keeps image |
| Read a card, GMWM test suppressed (bootstrap form) | — (no Autocoder mnemonic) | M or L %1x (B) **$** | all 80 columns stored, GM-WMs in the receiving area ignored, no WLR. Undocumented in A22-0526-3's card tables but prescribed by IBM for the hand-keyed boot — see §3, conflict C17 |
| Select stacker 0/1/2 and feed | SSF / SSF1 / SSF2 | K d (ch1) or 4 d (ch2), d=0,1,2 | after a %19 read only |
| Punch a card, pocket 0/4/8 | P / P1 / P2 (PW load) | M or L %40/%44/%48 (B) W | 80 chars core->punch buffer |
| Write a line | W / W1 / W2 | M %20 (B) W | 100/132 chars to print buffer, auto single space if no CC |
| Write a line, WM create blanks | WW | L %20 (B) W | |
| Write word marks as 1s | WM | M %21 (B) W | |
| Carriage control | CC / CC1 / CC2 | F d (ch1) or 2 d (ch2) | see d-char table |
| Read console printer | RCP / RCPW | M or L %T0 (B) R | ch1 only; inquiry |
| Write console printer | WCP / WCPW | M or L %T0 (B) W | ch1 only |
| Read tape | RT / RTW / RTB / RTBW | M or L %Ux or %Bx (B) R | stops at IRG or GMWM |
| Read tape to end of core | RTG / RTGW / RTBG | M or L %Ux (B) $ | if coded for overlap the overlap IS performed, but the instruction degrades to a normal `R` (stops at the first IRG / GM-WM) — appendix x5, see §4 |
| Write tape | WT / WTW / WTB / WTBW | M or L %Ux or %Bx (B) W | stops at GMWM, writes IRG |
| Write tape to end of core | WTE / WTEW / WTBE | M or L %Ux (B) X | if coded for overlap the overlap IS performed, but the instruction degrades to a normal `W` (stops at the first GM-WM) — appendix x5, see §4 |
| Backspace / Skip-erase / Write TM / Rewind / Rewind-unload | BSP / SKP / WTM / RWD / RWU | U %Ux B / E / M / R / U | unit control |
| Seek disk (1311) | - | M or L %F0 (B) R,$,W,X | B -> disk control field or direct seek address |
| Read/write sector mode (1311) | - | M or L %F1 (B) R or W | 1-200 sectors, 100 (M) / 90 (L) chars each |
| Branch if I/O status indicator on | BNR/BCB/BER/BEF/BWL/BNT/BA/BEX (1 or 2) | R (I) d (ch1), X (I) d (ch2) | d: `1`, `2`, `4`, `8`, `-` (B bit, WLR), `ƀ` substitute blank (A bit, octal 20 — no transfer; **not** an ASCII space, which has no bits and tests nothing), group mark = all six |

Source: A22-0526-3 pp.37, 47, 62-63, 80-81, 85-87, 104-105; A22-6704 pp.7-9. [verified]

Autocoder suffix convention: `1`/`2` = channel, `O` = overlap, `W` = load (word-mark) mode. [verified] (A22-0526-3 pp.104-105)

---

## 3. Move mode vs load mode — the data-transmission rules

This is where an emulator most easily goes wrong, because the **PrincOps does not state the load-mode word-mark erase for the card reader**. It states it only in the console-printer row (RCP: "WM in storage are undisturbed"; RCPW: "WM in storage are erased and entered", A22-0526-3 Figure 44 pp.46-47; same wording in A22-1407-2's console table). The CE manual closes the gap in plain prose.

**223-2692 printed p.58, "1411-1402 Reader Operation", verbatim:** "If the op code character is an M, specifying move mode, the data in the reader buffer transfers as is to the CPU. That is, word separator characters are transferred, unchanged, just as any other character. Existing word marks in the input field are undisturbed. If the op code character is an L, specifying load mode, a single word separator character on the channel input lines is converted into a word mark and placed over the next input character. Two successive word separator characters from the reader buffer appear as a single word separator character in the 1411 core storage. **In load mode operation, existing word marks in the input field are removed.**" [verified]

Figure 5 "Word Separator Processing" (223-2692 printed p.8) annotates the two paths of a 1402 read explicitly: move mode = "Existing Word Marks In Core Storage Are Not Disturbed"; load mode = "Existing Word Marks Are Erased". Verified from the rendered page image, not just OCR. [verified]

**Mechanism (why the whole byte is replaced).** 223-2692 printed p.11, LOAD MODE CHARACTER PROCESSING, input Case 2: (a) a word separator in E-1 sets a WS into E-2; (b) the BCD portion of the *following* character is copied from E-1 into E-2; (c) "The E-1 WM and C-bit lines (no WM is present) are inverted and copied into E-2, producing an odd parity WM character in E-2 that is transferred to 1411 core storage." Case 1 (no separator) copies E-1's BCD, WM and C bits into E-2 the same as move mode — and a seven-bit device's E-1 WM bit is always 0. So BCD, WM and C of the stored byte all come from the channel register; the old core byte contributes nothing, and parity is recomputed, not carried. [verified]

### Load vs move mode, input side — authoritative behaviour

| Situation (input, seven-bit device e.g. 1402) | Move mode (op M) | Load mode (op L) |
|---|---|---|
| Ordinary data character | stored; existing WM in that position **retained** | stored; WM bit **forced to 0** (existing WM erased) |
| Single word separator in incoming data | stored as an ordinary data character (C,A,8,4,1); existing WM retained | consumed; **WM set on the NEXT stored character**; record shortened 1 position |
| Two consecutive word separators | two separator characters stored | one separator character stored, **no word mark**; record shortened 1 position |
| WM-over-WS character | not possible from a 7-bit device | not possible from a 7-bit device |
| Core position holding GM-WM | store gate suppressed; GM-WM regenerated unchanged; transfer ends | store gate suppressed; GM-WM regenerated unchanged; transfer ends |
| Positions past the end of the stored record | untouched | untouched (stale WMs there survive) |
| BAR after operation | B + LB + 1 = address(GM-WM) + 1 | B + LB + 1 = address(GM-WM) + 1, with LB = the SHORTENED core length |

Source: 223-2692 pp.8-9, 11, 58-59; A22-0526-3 p.41. [verified]

Output side (move mode): core word separators are written unchanged and core word marks are **not** transferred. Output side (load mode): a core word mark becomes a word separator *preceding* the character, and a core word separator becomes two word separators — the record lengthens. [verified] (A22-0526-3 p.41)

### Figure 5 worked example (223-2692 p.8) — canonical test vector

| Card column | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Card content | WS | A | WS | B | WS | WS | C |
| Move mode -> core position | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| Move mode -> core content | WS | A | WS | B | WS | WS | C |
| Load mode -> core position | 1 | 2 | 3 | 4 | - | - | - |
| Load mode -> core content | A with WM | B with WM | WS, no WM | C, no WM | (untouched) | (untouched) | (untouched) |

Length check: 7 columns − 2 stored word marks − 1 stored word separator = 4 core positions. Output side of the same figure: core `A(wm) B(wm) WS C` punches as `A B WS C` in move mode and `WS A WS B WS WS C` in load mode. [verified]

Record-length rule, stated in the PrincOps: "the input record length is shortened one position in either of these operations: storing one word mark, or storing one word separator." So core length = 80 − (word marks stored) − (word separators stored) for a full-card load-mode read. A fixed GMWM position therefore gives a correct-length read only for cards with exactly the expected separator count; otherwise WLR turns on and the transfer still completes. [verified] (A22-0526-3 p.41)

### Scope of the erase rule

- **[verified]** for a 1402 card read (223-2692 p.58 + Figure 5 p.8) and for the 1415 console printer in load mode (A22-0526-3 Figure 44, RCPW "WM in storage are erased and entered"; A22-1407-2 console table; 223-2588-2 I/O printer row "L-mode: WMs erased and entered. M-mode: WMs in storage undisturbed").
- **[likely]** for 729/7330 read-tape-with-word-marks and 1011 paper tape. No manual sentence says it for those devices. The inference rests on the shared E-1/E-2 store path documented at 223-2692 p.11 (whole eight-bit character assembled in the channel register and stored). 223-2692's device-independent "Data Transmission" section (pp.8-11) never states load-mode erasure — its only "existing word marks" sentence there is the move-mode one, inside a paragraph explicitly about the 1402. Do not cite it as a device-independent statement.

### GMWM termination — what actually happens

Store gating, 223-2692 printed p.59: "If the B-channel is not a GM-WM, 'input cycle load' becomes active to gate the input character from E-2 into 1411 core storage (ALD 12.50.01)." The target core position is read out onto the B-channel *before* the store; a GMWM there suppresses the store gate, so the GMWM survives and terminates the transfer. [verified]

Correct-length path, 223-2692 printed p.42: after the device signals external end of transfer and the last input character is stored, "E-cycle required is generated by a special circuit (Figure 38) forcing an extra E-cycle to test the B-channel for a GM-WM. During this E-cycle, a GM-WM on the B-channel sets both the end of record latch and the internal end of transfer latch. The inverted output of the end of record latch blocks the turn on of the E-channel WLR latch." Item 4 of the last-input-cycle latch: "Conditions the assembly controls to use the B-channel character (to regenerate the character read out on the extra E-cycle)" — i.e. the GMWM is rewritten unchanged. [verified]

**BAR is stepped on that extra cycle.** 223-2692 p.42 does *not* say so (it lists only the four latch functions); the evidence is A22-0526-3 p.99's 1401-compatibility B-address-register chart: for 1401 op 1 (Read) a real 1401 leaves BAR = 081, a 1410 in 1401 mode leaves 082; op 4 (Punch) 181 vs 183; op 2 (Print) 333 vs 335. The 1410 takes exactly one extra address step at the end of a card operation that the 1401 does not. Same chart in 223-2588-2 p.52. Net: GMWM sits at `B + LB`, final `BAR = address(GMWM) + 1`. [verified — upgraded, re-sourced]

### Termination sequence to model for a load-mode 1402 read

| Step | Behaviour |
|---|---|
| 1 | BAR := B. For each character delivered by the 1414 buffer (80 columns), read core[BAR] to the B-channel first. |
| 2 | If core[BAR] is a GM-WM: suppress the store, regenerate the GM-WM, set end-of-record + internal end of transfer, BAR := BAR+1, stop. Remaining buffer columns are discarded. Set WLR if this happened before the buffer was exhausted. **Gated on d = `R`** — a `$` read skips this step entirely (see "`$` IS legal on a card read" below). |
| 3 | Otherwise store the assembled character (BCD + WM-from-separator) into core[BAR], replacing the whole byte including the WM bit; BAR := BAR+1. |
| 4 | Word separator characters do not produce a store of their own; they set the pending-WM flag (or, if the flag is already set, store one separator character with WM=0 and clear the flag). |
| 5 | When the 1402 buffer is exhausted (external end of transfer) and no GM-WM has been seen, take ONE extra cycle: read core[BAR]; if it is a GM-WM set end-of-record and block WLR, else set WLR. Either way regenerate what was read (no store) and BAR := BAR+1. **Gated on d = `R`** — on a `$` read there is no correct-length check to make, so skip the extra cycle and set no WLR. |
| 6 | Final BAR = B + LB + 1 where LB is the number of core positions actually written; on a correct-length read that is address(GM-WM) + 1. |

Source: 223-2692 pp.42, 59; A22-0526-3 pp.62, 99. [verified]

**A load-mode read CAN create a GMWM.** The earlier finding that one is "never written by a load-mode read" is wrong. 223-2692 p.11 Case 2 is unconditional about the character the word mark lands on, and the store gate (p.59) inspects the *old* contents of the target position, not the character being assembled. If the card image holds a word separator immediately followed by a group-mark character (BCD 77), load mode assembles and stores a genuine GMWM; the next cycle senses it and terminates the transfer early with WLR on. A card loader must either guarantee that pattern cannot occur in its deck format or model the early termination. rcornwell/sims does exactly this (`if (cmd[chan] & CHAN_WM && ch != 035) ch |= WM;` — no group-mark exclusion). [likely]

**`$` IS legal on a card read — the GMWM-suppression escape is not tape-only.** (Conflict C17, resolved; the earlier "no GMWM-suppression escape for cards / `$` is a tape facility" finding here is **refuted**.) A22-0526-3 p.62's Read a Card instruction form prints only `R` in its d-CHARACTER column, and the appendix instruction listing (pp.104-105) likewise carries `R` on every card line and `$`/`X` only on tape lines — but neither says `$` is *invalid* on a 1402, and the PrincOps defines no d-character validity check for I/O at all. IBM's own hand-keying template settles it the other way: C28-0351-5 p.8 Table II, "Not using 7010 Load Key", step 2 — "Enter `ALcde00012$r` into location 00000", where the named variables are `c` (channel), `d` (`1` — card reader / `B` — tape), `e` (card reader `0` / tape unit `0`-`9`) and `r` (`R` ch1 / `X` ch2). **`$` is a fixed literal in that template, and `d` = `1` selects the card reader** — the same procedure whose step 1 says "The Bootstrap 1 routine card must be the first card in a card Standard Input Unit". So the keyed channel-1 card boot is `AL%1000012$R`, and IBM prescribes `$` on a 1402 read. [verified — C28-0351-5 p.8 Table II]

The **effect** of `$` on a card read is not stated by any manual and is inferred: `$` is decoded at channel level from the instruction's d-character, before device dispatch, and A22-0526-3 phrases the whole end-of-core class device-independently — p.9 ("in the execution of a read or write 'to end of core' i/o instruction", exempting 59999 from the address check) and p.92 ("Instructions that call for a read or write to end of core cannot be overlapped…") both name an *instruction class*, not a tape feature. Only p.86, which happens to be the Read/Write Tape page, spells out the semantics: "Group-mark—word-marks in core storage have no effect on a read tape to end of core operation (d-character of `$`)". Applied to a 1402, that means: **suppress the GM-WM termination test and store all 80 buffer columns; the buffer, not core, bounds the transfer** — `$` on a card cannot literally run to end of core, and with the GM-WM test suppressed there is no correct-length check left to fail, so set no wrong-length-record. [likely — derived from A22-0526-3 pp.9, 86, 92; no manual states card `$` semantics]

sims corroborates the channel-level decode: `i7010_cpu.c` maps `CHR_DOL` → `(IO_RDS<<8)|0100` in the generic I/O op decode, `chan_cmd()` turns that `0100` bit into `CHAN_NOREC` for **any** device on the channel, and every GMWM test in `i7010_chan.c` (lines 381, 579, 674) is guarded by `(cmd[chan] & CHAN_NOREC) == 0`. Nothing in that path is tape-specific. (Emulator code, not authority — but it agrees with the manual's device-independent phrasing.) [verified — SimH i7010_cpu.c, i7010_chan.c]

### 1401-vs-1410 traps a card loader must not import

- **1401 LOAD KEY does a blanket word-mark wipe; the 1410 has no analogue.** A24-1403-5 p.117: "The I-address register is set to 001, and a word mark is set in address 001. All other word marks in addresses 002 through 080 are removed." That is a 1401 *console key*, not an op-code behaviour. The 1410's load-mode read clears word marks only in the positions it actually stores — fewer than 80 for any card containing separators — and sets no word mark in position 1 unless column 1 is a word separator. **Do not implement a 1410 card loader as "clear WMs across the whole 80-position read-in area."** [verified]
- **Word-separator runs: 1410 pairwise, 1401 greedy.** 223-2588-2 p.52: 1401 — "any number (one or more) of word separator characters read in succession from tape are eliminated and a word mark is placed over the first non-word separator character that follows"; 1410 — "a pair of adjacent word separator characters on tape are read into core storage as one word separator character and no word mark is placed over the next non-word separator character." The pairwise table row above is the 1410 rule. [verified]
- **1401-mode reads:** "When reading in 1401 Mode, if an IRG is encountered before a GMWM is encountered, a GMWM is inserted at that point." [verified] (223-2588-2 p.52)

### Behavioural oracle: rcornwell/sims i7010_chan.c

`chan_write_char()` (channel -> memory): `cmd[chan] &= ~CHAN_WM; if ((cmd[chan] & CHAN_LOAD) == 0) ch |= M[caddr[chan]] & WM; if ((chan_flags[chan] & DEV_REOR) == 0) M[caddr[chan]] = ch; caddr[chan]++;` — the OR-in of the existing word mark is guarded to move mode only; load mode replaces the byte outright; `caddr` steps even when the DEV_REOR guard suppresses the store. It also tests `M[caddr[chan]] == (WM|077)` *before* storing; on a hit it sets `STA_WAIT` and `IO_CHS_WRL`, steps `caddr` without storing, and returns `END_RECORD` — GMWM survives, BAR lands one past it. The DEV_REOR path is a literal transcription of the extra-E-cycle test. [verified]

**Divergence — do NOT copy.** `chan_cmd()` sets `cmd[chan] |= CHAN_WM; /* Force first char to have word mark set */` in the *else* branch of the CHAN_LOAD test, i.e. for MOVE mode, and nothing clears it before the first data character. In `chan_write_char()` the first branch requires `(CHAN_LOAD|CHAN_WM)==CHAN_LOAD` and is skipped, so control falls into `if (cmd[chan] & CHAN_WM && ch != 035) ch |= WM;` — the first character of a move-mode input record is stored with a word mark. That contradicts 223-2692 p.58 and Figure 5. Input-path only (`chan_read_char()` gates CHAN_WM on CHAN_LOAD). **Follow the manual.** [verified]

---

## 4. Overlap

| Rule | Detail | Conf |
|---|---|---|
| Cost | 4.5 µs stolen per character (4.0 µs with the Accelerator, A22-0526-3 p.96). | [verified] |
| End-of-core degrades | Read/write to end of core (`$` or `X` d-char) coded for overlap (x1 = `@` ch1 / `*` ch2): the **processing overlap IS performed** — cycle-steal runs, overlap-in-process indicator on, the CPU is **not** interlocked — but the end-of-core modifier is silently dropped and the instruction becomes a normal read (`R`) / write (`W`), so the transfer honours GM-WMs and stops at the first IRG / first GM-WM instead of filling core. p.87's blunt "cannot be overlapped" means "you cannot obtain an overlapped end-of-core operation", not "the CPU stalls"; p.92 governs, and the appendix flags these x5, not x1. Implementation: run the transfer overlapped and clear the ignore-GMWM / no-record flag. Real divergence from SimH i7010, which sets `CHAN_NOREC` from the d-char alone and never applies the p.92 downgrade. | [verified] (A22-0526-3 pp.87, 92) |
| No processing overlap at all | Short-form I/O — carriage control (`F d` / `2 d`), select stacker and feed (`K d` / `4 d`) — and tape unit control **except** write tape mark. | [verified] |
| Console printer | Overlappable, but channel 1 only. | [verified] |
| No feature | An overlapped instruction on a machine without the overlap feature stops the system. | [verified] |
| R/X during overlap | An R/X status branch issued while an overlapped op is running converts it to non-overlap and suspends processing until the transfer completes. Test `J (I) 1` / `J (I) 2` (overlap in process) first. | [verified] |
| Second I/O too early | An I/O instruction encountered before physical completion of the previous op on that channel = system stop if the status test was omitted, or failure of the second op to execute if it was programmed. | [verified] |

Source: A22-0526-3 pp.38, 92-95.

Timing constants for a channel model: a non-overlap tape read of a 100-character 729 II record at 556 cpi interlocks processing for 13.1 ms (10.5 start + 2.4 data + 0.2 record check). In overlap the first character arrives after 10.5 ms + one character time, each later character steals 4.5 µs with ~19.5 µs average available between characters; tape stop is 2.1 ms with 0.45 ms of that still processing-interlocked. [verified] (A22-0526-3 pp.93-94, Figures 104, 105)

---

## 5. Interlocks, status indicators, branch-on-I/O tests

### The nine-step sequence (Figure 40)

1. Recognize the I/O op.
2. Test the interlock indicator — **on -> system stop**.
3. Reset all six status indicators for that channel.
4. Test whether the device can execute; set indicators if not.
5. Turn on the interlock.
6. If any indicator is on, do **not** execute; skip to step 9.
7. Transfer data.
8. Test for errors; set indicators.
9. Proceed to the next sequential instruction — which can never legally be another I/O on that channel.

Source: A22-0526-3 pp.42-43, Figure 40. [verified]

### Interlock release

The interlock is cleared by exactly two things: (a) any `R`(ch1)/`X`(ch2) status branch that **actually branches**, or (b) `R (I) <group mark>` / `X (I) <group mark>` — the all-bits d-character — which clears without requiring a branch. Testing a status indicator does **not** reset the indicators; only the next I/O operation does (step 3). I/O instructions requiring the intervening test are op codes **M, L, U, F, 2, K, 4**. [verified] (A22-0526-3 pp.37-38, 42; restated in A22-0530-1 p.8)

### I/O channel status indicators and branch d-characters (Figure 36)

| Indicator | d-char | Bit | Generic meaning |
|---|---|---|---|
| Not Ready | 1 | 1 | device/buffer not ready before transfer; op terminated, no data |
| Busy | 2 | 2 | device/buffer busy before transfer; op terminated, no data |
| Data Check | 4 | 4 | parity error detected during transfer |
| Condition | 8 | 8 | device-specific (1402 EOF, tape mark/EOF, foil strip, cancel key) |
| Wrong Length Record | - (minus) | B | record read/written not correct length (GMWM misplaced) |
| No Transfer | `ƀ` substitute blank (A bit only, octal 20 / decimal 16) — **not** an ASCII space | A | no data available to transfer |
| Any | group mark | BA8421 | tests all six; R/X (I) group-mark also clears interlock without branching |

Source: A22-0526-3 p.37 Figure 36. Branch form `R/X iiiii d`, timing 4.5(L+1+C) µs. [verified]

**Blank trap.** Figure 36 prints the No Transfer d-character as the struck-b substitute-blank glyph and annotates it "(A-bit)", exactly as it annotates the WLR row "-(B-bit)". The d-character is the **substitute blank**, octal 20 — a true blank (octal 00, an ASCII space) has no bits set and tests no indicator at all. The appendix instruction summary (p.101) confirms: `Branch if i/o Unit No Transfer … BNT# … R or X (I) ƀ`. [verified]

**WLR and CLR must stay complementary.** 223-2692 p.42: "The two latches, WLR and CLR, must be in agreement at the end of an I-O operation or a subsequent programmed test of the WLR indicator (BWL) results in a mismatch between the branch latch and the no branch latch. An instruction check occurs during a branch operation if the branch and no branch latches do not match." An emulator that models WLR must model CLR as its complement or programmed BWL tests misbehave. [verified]

WLR is a status indicator only — it does not stop the program. [verified] (A22-0526-3 p.62)

### J-op conditional branch d-characters relevant to I/O (Figure 35)

| Condition | Mnemonic | d |
|---|---|---|
| Carriage channel 9 (ch1 / ch2) | BC9 or BC91 / BC92 | 9 / **!** |
| Carriage busy (ch1 / ch2) | **BPCB or BPCB1** / **BPCB2** | R / L |
| Carriage overflow, channel 12 (ch1 / ch2) | BCV / BCV2 | @ / lozenge |
| Inquiry request (ch1 / ch2) | BNQ / BNQ2 | Q / * |
| Overlap in process (ch1 / ch2) | BOL1 / BOL2 | 1 / 2 |
| Tape indicator (CE use) | - | K |

Source: A22-0526-3 p.36 Figure 35. [verified]

**Correction applied:** the channel-2 carriage-9 d-character is `!` (the exclamation point, the zero-and-subtract op-code graphic), **not** `I`. Confirmed from the page image and from SimH i7010_cpu.c (`case CHR_EXPL: /* ! Carriage 9 CH2 */`). Likewise the carriage-busy mnemonics are BPCB/BPCB1/BPCB2, not BCPB/BPCB2. [verified]

Carriage 9 and 12 indicators turn on when their hole is sensed and off when any other carriage-tape channel is sensed. [verified]

### Priority feature (special features 5620/5621) — brief

Interrupt system: branches to fixed location **00101** when a priority request indicator turns on while in priority alert mode. `Y (I) E` enter alert + branch (BEPA); `Y (I) X` exit + branch (BXPA). Per-channel test-and-reset branches: `Y(I)U`/`F` I/O unit request, `Y(I)1`/`2` overlap request, `Y(I)Q`/`*` inquiry request, `Y(I)N`/`‡` outquiry request, `Y(I)S`/`T` seek complete, `Y(I)A`/`B` attention. The priority routine returns via BAR−6 stored at interrupt time. Only unchained ops of the lengths in Figure 1 can be interrupted; **M, L, U, F, K, R, X, G, N and halt cannot.** [verified] (A22-0530-1 pp.3-8)

**I/O NOP** (d = `Q` input status, `V` output status; priority feature only) executes exactly like a read/write on the addressed device — interlock and status sequence included — but transfers no data (a disk file address is still transferred). Used after an interrupt to load the six status indicators. [verified] (A22-0530-1 p.8; A22-6704 p.8)

**Side effect to model:** the overlap priority request indicator turns on at completion of any overlapped read/write/write-check on that channel and is turned **off** by the R/X status branch for that channel — so on priority-equipped systems R/X does more than clear the interlock. If the overlap request arrives too late to interrupt and the next instruction is an R/X, the request is reset and no interrupt occurs. [verified] (A22-0530-1 pp.5-6)

---

## 6. IBM 1402 Card Read-Punch — full

### Mechanics

Reader up to 800 cpm, 3000-card file feed; cards read 9-edge first, face down, past read-check brushes and read brushes into the 80-position read buffer in the 1414. Punch up to 250 cpm, 12-edge first; punch-check brushes perform the hole-count check. Five stackers of 1000 cards each: the reader can direct to 0 (NR), 1 or 8/2; the punch to 0 (NP), 4 or 8/2. Cards with validity errors or hole-count checks go automatically to NP or NR. [verified] (A22-0526-3 pp.59-60)

### How a card lands in storage

1. **Reader Start** (a key, not an instruction) feeds three cards and fills the read buffer with the first card's image. [verified] (A22-0526-3 pp.41-42, 60)
2. **Read a Card** `M or L %1x bbbbb R` (ch2: lozenge 1x), x3 = 0/1/2 selecting pocket NR/1/8-2: (a) transfers the buffer image to core starting at B, left to right, until the first GMWM in core; (b) stacks that card in the selected pocket; (c) reads the next card into the buffer. [verified] (A22-0526-3 p.62, Figure 61)
3. **x3 = 9** transfers the buffer to core with **no stacker select and no feed** — the buffer keeps the image. Follow it with **Select Stacker and Feed** `K d` (ch1) / `4 d` (ch2), d = 0,1,2, which has no X-field and no B-address, to stack and refill. [verified] (A22-0526-3 pp.62-63)
4. The GMWM must sit immediately right of the record; a misplaced GMWM sets WLR. After the op: `IAR = NSI`, `AAR = Ap`, `BAR = B + LB + 1`. Read a Card timing 49.5 µs + I/O. [verified]
5. **Select Stacker and Feed** leaves `BAR = Bp` (unchanged) and "Word marks are not affected." Useful negative control when testing an x3=9 + SSF loader. Timing 13.5 µs + I/O. [verified] (A22-0526-3 p.62)

Word marks: see §3. Move mode leaves core word marks alone; load mode replaces the whole byte and converts word separators to word marks on the following character.

### Punch a Card

`M or L %4x bbbbb W` (ch2 lozenge 4x), x3 = 0/4/8 = pocket NP/4/8-2. Transfers 80 characters core -> punch buffer until GMWM, then punches. Load mode punches a word separator ahead of each word-marked character (the field lengthens). Timing 49.5 µs + I/O. [verified] (A22-0526-3 p.63)

### End-of-file and last card

The End-of-File key signals the last-card condition. The EOF latch turns on following the data transfer of the last card, and the **next card-read instruction is a NO OP**. With 4 or more cards in the hopper all are processed normally; with **3 cards remaining**, a read issued before the EOF key is pressed sets the **Not Ready** indicator — press EOF then Start to let the last three through. The Stop key, or processing the last card, resets the EOF condition. On the read that reports it, the EOF latch is turned **off** as the Condition indicator is turned **on**. [verified] (A22-0526-3 pp.61, 63)

### Errors

- **Validity light:** an invalid character was detected during a feed. During the read instruction **the invalid character is still transferred** from buffer to storage. [verified]
- **Reader Check light:** hole-count, parity or buffer-timing error during a feed. During the read the data are transferred **and** the CPU sets the Data Check indicator. [verified] (A22-0526-3 p.61)

### Reader / punch status (Figures 62, 63)

| Condition | Reader (Read / SSF) | Punch |
|---|---|---|
| Not Ready | card jam, reader out of cards (**not** EOF), not on line, power off, stacker full, cover interlock open, feed clutch failure, joggle switch open, 1414 off line/power off | card jam, out of cards, stacker full, power off, not on line, chip basket full/missing, cover open |
| Busy | read buffer being filled, or card being stacked | previous card still being punched |
| Data Check | hole count check, 1414 parity or timing error, CPU parity error (**never** for select-stacker) | 1414 detects parity error; card not punched |
| Condition | EOF — last card stacked (**never** for select-stacker) | parity error during punching or hole-count check; error card goes to pocket 0 |
| WLR | wrong length record | wrong length record; card not punched |
| No Transfer | image already transferred: two select-stacker-and-feeds with no intervening x3=9 read, or two x3=9 reads with no intervening SSF | never set |

Source: A22-0526-3 p.63, Figures 62 and 63. [verified]

### 1402 timing

| Operation | Time |
|---|---|
| Read (x3 = 0/1/2) | 0-75,000 µs access + 880 µs (80 × 11 µs) buffer transfer + 65,000 µs read cycle |
| Read, x3 = 9 | 880 µs |
| Select stacker and feed | 0-75,000 µs + 65,000 µs |
| Punch | 0-60,000 µs access + 880 µs + 217,000 µs punch cycle |

Source: A22-0526-3 p.64. [verified]

### 51-column read feed feature

Columns 1-51 of a 51-column card map to read-buffer positions **15-65**; positions 1-14 and 66-80 are filled with valid blanks. In **1410 mode** only the 51 active positions transfer, and a **GMWM is required in the 52nd position of the core read-in area**. In **1401-compatibility mode** all 80 buffer positions transfer and no GMWM is needed — which means the valid blanks in 1-14 and 66-80 are **stored as blanks over core**, whereas a real 1401 "leaves the storage locations 1 through 14 and 66 through 80 undisturbed." PrincOps warns: "the program must not place data in those locations, or must move it elsewhere in core storage before a card is read." [verified] (A22-0526-3 pp.64-65, 100)

### Column binary

A22-0526-3's index has no "Column Binary" entry and the 1402 chapter (pp.59-66) describes no column-binary feature; the only 1402 special feature described is the interchangeable 51-column read feed. [verified — negative result] (A22-0526-3 pp.59-66, 106-107)

---

## 7. IBM 1403 Printer and carriage control — full

### Configuration

Model 1 = 100 print positions; Model 2 = 132 (32 positions are a special feature); Model 3 = 132 standard. 600 lpm alphameric; 1285 lpm with the numeric feature (Models 1/2); Model 3 1100 lpm. 48-character set (26 alpha, 10 numeric, 12 special) on a chain of five 48-character sections; 10 characters/inch; 6 or 8 lpi set manually. The print buffer (100 or 132 positions) lives in the 1414. The numeric-print-feature chain carries 15 sets of 16 characters (0-9 and `$ . , * -` lozenge); other characters cause a print check in numeric mode. Interchangeable chain cartridge adapter is a special feature. [verified] (A22-0526-3 pp.67, 82)

### Printing

- **Write a Line:** `M %20 bbbbb W` (ch2 lozenge 20). Transfers 100/132 characters core -> print buffer, left to right, until GMWM; **then** the printer starts. Word marks in storage are not transferred in move mode. Timing 49.5 µs + I/O; after: `IAR = NSI`, `AAR = Ap`, `BAR = B + LB + 1`. [verified]
- **Load-mode write** `L %20 bbbbb W` (Autocoder WW): word marks create blanks in printing — the word mark becomes a word separator, i.e. a blank space ahead of the character. [verified]
- **Write Word Marks as 1s:** `M %21 bbbbb W` (Autocoder WM). Word-marked positions print `1`, all others print blank. [verified]
- **Automatic space:** if no carriage-control instruction follows, an automatic **single space** occurs at the end of the buffer-to-printer transfer. [verified]
- **Busy semantics:** the printer is **not** busy while data are transferred to the print buffer; it becomes busy after the transfer completes and printing starts. Model this — programs rely on it to overlap. [verified] (A22-0526-3 pp.81-82)

Source: A22-0526-3 p.80, Figure 88.

### Carriage control

`F d` (ch1) or `2 d` (ch2), Autocoder CC/CC1/CC2 — **d-character only, no X-field, no B-address**. Timing 13.5 µs. The numeric bits of d give the count/channel number; the zone bits select the variant. Word marks are not affected. [verified] (A22-0526-3 p.81)

| d | Immediate skip to | d | Skip after print to | d | Immediate space | d | Space after print |
|---|---|---|---|---|---|---|---|
| 1 | Channel 1 | A | Channel 1 | J | 1 space | / | 1 space |
| 2 | Channel 2 | B | Channel 2 | K | 2 spaces | S | 2 spaces |
| 3 | Channel 3 | C | Channel 3 | L | 3 spaces | T | 3 spaces |
| 4 | Channel 4 | D | Channel 4 | | | | |
| 5 | Channel 5 | E | Channel 5 | | | | |
| 6 | Channel 6 | F | Channel 6 | | | | |
| 7 | Channel 7 | G | Channel 7 | | | | |
| 8 | Channel 8 | H | Channel 8 | | | | |
| 9 | Channel 9 | I | Channel 9 | | | | |
| 0 | Channel 10 | ? | Channel 10 | | | | |
| # | Channel 11 | . | Channel 11 | | | | |
| @ | Channel 12 | lozenge | Channel 12 | | | | |

Source: A22-0526-3 p.81, Figure 90. [verified]

### Carriage tape

12 channels, all standard; channels 9-12 send special signals to the CPU, and program testing of channels 9 and 12 is standard (see the J-op table). Tape holds a maximum of 132 lines (22 inches); forms up to 22 in at 6 lpi or 16.5 in at 8 lpi. Skips run at 33 in/s; dual-speed carriage runs skips of more than 8 lines at 75 in/s and the last 8 lines at 33 in/s. **A skip to a channel the brushes are already positioned on moves to the next punch of that channel.** Carriage Restore key positions the carriage at channel 1 (home). Print Stop makes a subsequent print set Not Ready. [verified] (A22-0526-3 pp.68, 71-72, 81)

### 1403 status (Figures 89, 91)

| Condition | Write a Line | Carriage Control |
|---|---|---|
| Not Ready | printer not ready, not on line, power off, out of forms | same |
| Busy | previous line still being printed | forms in motion / forms instruction waiting |
| Data Check | print buffer parity error; **line not printed** | never |
| Condition | buffer timing error or hammer-fire check; the line **following** the error line is not printed | never |
| WLR | wrong length record; line not printed | never |
| No Transfer | never | never |

Source: A22-0526-3 pp.80-81, Figures 89 and 91. [verified]

### 1403 timing

Max 100 ms per print + space (82 ms print + 18 ms space, with 3 ms overlap between successive forms movements). Character transfer 11 µs each: 1.1 ms for 100 positions, 1.452 ms for 132. [verified] (A22-0526-3 pp.81-82, Figure 92)

---

## 8. IBM 1415 Console I/O printer — full

### Device

Selectric mechanism, 64 characters (10 numeric, 26 alpha, 28 special) plus a word-mark symbol and an underscore (used to flag invalid parity), max 932 characters/minute. Vertical spacing, backspace and carrier return are **inoperative from the keyboard**. Functions: operator entry, core display, reading records from tape/disk, log of manual operations, display/alter, inquiry, programmed messages. On stops it prints IAR, A- and B-address registers, op register, op modifier, A- and B-channel, assembly channel, and the unit-select/unit-number registers for both channels (Figure 42). Eight-bit device (see §1). [verified] (A22-0526-3 pp.45-46)

### Instructions (Figure 44) — channel 1 only

| Mnemonic | Form | Behaviour |
|---|---|---|
| RCP | `M %T0 bbbbb R` | Read console printer without word marks. **Word marks in storage are undisturbed.** |
| RCPW | `L %T0 bbbbb R` | Read with word marks. **Word marks in storage are erased and entered.** |
| WCP | `M %T0 bbbbb W` | Write; word marks not indicated. Terminating GMWM not printed. |
| WCPW | `L %T0 bbbbb W` | Write with word marks indicated: blanks print as a small `b`, each word mark prints as an inverted circumflex over its character. Terminating GMWM not printed. |

Timing 49.5 µs + I/O; after: `IAR = NSI`, `AAR = Ap`, `BAR = B + LB + 1`. The GMWM is **not** printed with the message — Figure 44 carries the same numbered note 3 ("‡ is not printed with message") on both WCP and WCPW. The GMWM is the transfer terminator only; the printer emits data up to but not including it. [verified] (A22-0526-3 pp.47, 49)

### Inquiry sequence

1. Operator presses **Inquiry Request**, which sets the inquiry status latch in the 1411.
2. The program tests it with `J iiiii Q` (BNQ; ch2 `*`) and branches to a routine containing `M or L %T0 bbbbb R`.
3. The console prints `I`, a space, and unlocks the keyboard.
4. The operator types characters into B, B+1, ... The **Word Mark key** prints a word mark then backspaces; the next key entered enters both the word mark and the character (load-mode read only).
5. **Release** at the correct count completes the record with carrier return / vertical space and locks the keyboard — the next position must hold a previously inserted GMWM. Releasing early sets **WLR** and the program continues. Excess characters are not accepted; pressing Release or Cancel then also sets WLR.
6. **Cancel** during the message sets **Condition**. Cancel before the request is recognized resets the latch. Cancel before any character is entered sets **No Transfer**.

Source: A22-0526-3 pp.46-48. [verified]

### Reply / write behaviour

The console reply routine prints `R`, a space, then data until the GMWM, then carrier return + vertical space. A valid blank in storage spaces the printer. A console printer parity error prints and **underlines** the bad character, sets Data Check, and the reply continues. A CPU processing error during the transfer ends the routine with an error print-out. [verified] (A22-0526-3 pp.48-49)

### Console status (Figures 45, 46)

| Condition | Read | Write |
|---|---|---|
| Not Ready | never | never |
| Busy | never | carriage returning |
| Data Check | input character validity error | output validity error (char printed and underlined, reply continues) |
| Condition | Cancel key during inquiry | never |
| WLR | yes (early Release / excess characters) | never |
| No Transfer | no message request, or Cancel before inquiry | never |

Source: A22-0526-3 pp.47-49. [verified]

**Computer Reset** is a Program Reset plus a Start Reset. It sets IAR to 00001 and resets the check circuits, the timing clocks and all machine indicators; via the included Program Reset it also clears the A- and B-data registers, the op and op-modifier registers, **and the console inquiry latch**. What survives is the *remote* inquiry latches (the per-channel inquiry-request latches tested by `J iiiii Q`) and the tape density latch. The manual's phrasing — "the inquiry latches (except the console inquiry latch) and the tape density latch are not reset" — carves the console inquiry latch **out of** the not-reset set: it IS cleared. Emulator: on Computer Reset drop any pending console inquiry request; leave remote-station inquiry latches and the tape-density latch alone. [verified] (A22-0526-3 p.49)

---

## 9. Magnetic tape (brief)

Up to ten 729 II/IV/V/VI or 7330 per channel behind one TAU. Seven-track code (C check bit + B A 8 4 2 1), even parity for BCD (`U` in x2), odd parity for binary (`B` in x2); records separated by a ~3/4 inch IRG. Densities/speeds: 729 II 200/556 cpi @ 75 ips; 729 IV 200/556 @ 112.5; 729 V 200/556/800 @ 75; 729 VI 200/556/800 @ 112.5; 7330 200/556 @ 36. Figure 95 is the tape code chart. **Gotcha:** on even-parity tape a C+A combination reads into core as C only (a blank on tape is an A bit, in core a C bit), so programs written to tape should use odd parity. [verified] (A22-0526-3 pp.84-85)

**Unit Control** `U %Ux d`: `B` backspace one record (a tape mark counts as a record; not interlocked on the 1410), `A` move one record without reading (CE), `R` rewind (ready at load point), `U` rewind and unload (unit disconnected), `E` skip and blank tape (erase 3.5 in; the next instruction should be a write on the same unit), `M` write tape mark (single-character record; interlocked; overlappable). Timing 0.0045(L+1) + Tm ms. [verified] (A22-0526-3 pp.85-86, Figure 97)

**Read/Write** `M or L %Ux bbbbb R/W` (`B` in x2 for binary). Read stops at IRG or GMWM (the GMWM stops the transfer but the tape moves on to the IRG); write stops at GMWM and writes an IRG. `$` = read to end of core, `X` = write to end of core — both **ignore GMWM**. You cannot obtain an *overlapped* end-of-core operation: if such an instruction is coded for overlap the processing overlap is still performed (the CPU keeps executing the instruction stream — do **not** interlock it), but the end-of-core modifier is dropped and the instruction degrades to a normal `R`/`W` that honours GM-WMs. p.87's "cannot be overlapped" is elaborated by p.92; the appendix flags these x5, not x1. Load mode maps tape word separators to core word marks and vice versa, one tape position per word separator. A tape mark is always written in even parity; read in odd-parity mode it gives Data Check plus EOF and enters storage as 8421 (no C), as an unchanged invalid character, or as `*`, depending on the asterisk-insert switch; in even-parity mode it enters as C8421 with no data check. [verified] (A22-0526-3 pp.86-88, Figures 97, 98)

### Tape status (Figure 99)

| Condition | Read | Write | Unit control |
|---|---|---|---|
| Not Ready | unit not ready / no such unit / not on line / TAU power off | same | same |
| Busy | rewinding / TAU or unit busy | same | same |
| Data Check | CPU received wrong parity, TAU sent wrong parity, tape mark read in odd parity | TAU received wrong parity, unit read-back check error | write tape mark in odd parity |
| Condition | first character of the record was a tape mark (EOF) | foil strip (end of reel) | never (unless a tape mark is read) |
| WLR | usually only when d = `$` | never (unless zero-length record, first char GMWM) | never |
| No Transfer | never | never | never |

Source: A22-0526-3 p.88. [verified]

Character times: 729 II 0.067 ms @200 / 0.024 @556; 729 IV 0.044/0.016; 729 V 0.067/0.024/0.017 @800; 729 VI 0.044/0.016/0.011; 7330 0.139/0.050. Interlock: 729 II/V read 10.7 + CN ms, write 11.7 + CN; 729 IV/VI read 7.1 + CN, write 7.8 + CN; add 40.5 ms (II/V) or 27 ms (IV/VI) at load point when writing. [verified] (A22-0526-3 pp.88-90, Figure 100)

---

## 10. Disk (1311 on 1410/7010) — brief

Instruction: op `M` (7-bit) or `L` (8-bit — word marks stored directly, since disk is an eight-bit device), X-field `[% @ ⌑ *][F][op digit]`, B = high-order address of the disk control field, d = `R`/`$` read, `W`/`X` write, `Q`/`V` I/O no-op (priority feature). Op digits: 0 seek, 1 sector mode, 2 track record (feature), 3 write disk check, 4 store disk control field, 5 sector count overlay, 6 track sectors with addresses, 7/8/9 scan low/equal/high (feature), @ track record with address. Data written with `M` must be read with `M`, `L` with `L`. [verified] (A22-6704 pp.7-9)

**Disk control field:** `*AAAAASSS` — 5-digit sector address 000000-199999 across drives 0-4 at 20 sectors/track, plus a 3-digit sector count — followed by a GMWM, then the data area terminated by a GMWM. 100 chars/sector in move mode, 90 in load mode; short records must be padded or you get WLR + data check. An alternate form replaces the leading `*` with a drive digit 0,2,4,6,8 (= drive 0,1,2,3,4) which **overrides** the drive implied by the sector address — this is how a pack addressed 80000-99999 mounts on any drive. 1311 Model 5 controls up to four Model 2 drives, 14.9 M characters, with odd-bit parity checking that sets Data Check. [verified] (A22-6704 pp.6-9)

**Sector address decomposition:** divide by 20 — first digit of the quotient = drive, next two = cylinder, next = surface (head), remainder = sector 0-19. Worked example: `*27883` = drive 1, cylinder 39, surface 4, sector 3. [verified] (A22-6704 p.6)

**Seek (XF0):** the d-character may be any of R, $, W, X — it exists only to make a valid instruction length and has no effect. A disk control field at B = **return-to-home** seek (moves outward past cylinder 00 first; avg 250 ms, max ~400 ms). A **direct seek** address (`#` in the 5th position) is a relative move (avg 150 ms, max ~250 ms). Seek failure is detected only as a Condition on the *following* read/write. [verified] (A22-6704 pp.8-9)

**Direct seek address encoding — corrected.** The form is `*ncc#xxxx`, and `ncc` is **2 × (100 × drive + cylinders_to_move)** written as three digits, with the direction sign over-punched on the third digit (`+`/none = inward, `−` = outward) and `#` in the fifth position marking a direct seek. The first digit is therefore *twice* the drive number (0,2,4,6,8), not the drive number. Worked examples from A22-6704 p.8: drive 1, 1 cylinder inward = `*202#0000` (2 × 101); drive 1, 53 cylinders outward = `*30O#0000` (306 = 2 × 153, sign carried on the last digit as `O` = −6). With the alternate-code form the leading `*` is replaced by the same doubled drive digit (`0002#0000`, `2002#0000`, ...). [verified — the earlier "n = drive, cc = 2 × cylinders" reading is wrong]

**Sector mode (XF1)** transfers 1 to 200 sectors and terminates on any of: GMWM sensed in storage; sector count register reaching 000; end of cylinder; sector-address compare failure (the 1311 sends end + condition after two index pulses without a match). The 5-digit sector address register increments and the 3-digit sector count register decrements per sector; when the last sector of a track is passed the next head in the cylinder is selected automatically. Both registers are set by every 1311 op except store disk control field; the address register is **not** incremented during track-sectors-with-addresses. [verified] (A22-6704 pp.6, 9)

**Do not use A24-3070-1.** Despite its bitsavers filename it is the 1401/1440/1460 disk manual: different instruction form (`M %F1 bbb R`, unit character F1/F2, no per-channel X field), 6-digit sector address 000000-019999 for 1311, 200/180 chars per sector for 1301. Not the 1410 form. [verified]

---

## 11. Unverified / contradictory items and fallbacks

| Item | Status | Blocks | Fallback |
|---|---|---|---|
| Load-mode WM erase for 729/7330 tape and 1011 paper tape | [likely] — mechanism-based inference from the shared E-1/E-2 store path (223-2692 p.11); no per-device sentence exists | Tape load-mode read into a buffer with stale word marks | Apply the same full-byte replace as the card reader; it follows from the shared channel data path and matches sims |
| 80th card column is a word separator with nothing following | [unverified] — undocumented in every manual read | Load-mode read of a malformed card | Drop the pending WM flag: no store, BAR not stepped (what sims does). Treat as a deck-format error the loader must not emit |
| WS immediately followed by a group-mark character (BCD 77) creating a live GMWM in core | [likely] — mechanism documented, the specific case is not called out | Early truncation + spurious WLR on object decks | Model it: assemble and store WM\|077, then terminate on the next cycle with WLR. Or forbid the pattern in the deck format |
| Whether the 1410 load-mode rule carries into 1401-compatibility mode | [likely, weak] — 223-2588-2 p.52 and A22-0526-3 pp.99-100 list 1401-mode differences and mention no card-read word-mark difference; 223-2597 not read | 1401-compat card reads | Assume the 1410 rule; flag any 1401-mode word-mark divergence as a known unknown |
| Column binary on the 1410 | [unverified] — negative result only; A22-0526-3 documents no such feature | Column-binary deck support | Do not implement. Check A22-6688 (Configurator), A22-6701 (1414 OEM), X22-6740 (Instruction Card) first |
| 1301 disk on the 1410 (A22-6670, A22-6788 not read) | [unverified] | 1301 attachment | Expect the form to parallel the 1311 (`%Fx` + disk control field) but verify sector sizes (200/180) and op digits before coding |
| Card-code -> BCD mapping table (A22-0526-3 Figure 2, p.6) | [unverified] — not captured this pass | Card reader/punch character translation | Use the tape code chart Figure 95 (p.85, BA8421 for all 64 characters) as an interim table; the 1410 special-character/collating set differs slightly from the 1401's |
| 1415 asterisk-insert CE switch behaviour; CE test panel (pp.50-58) | [unverified] — described only in passing at p.88 | Odd-parity tape-mark landing in core | Default to storing 8421 with no C bit; make the switch a config flag |
| Exact 1402 access-time numbers, 1403 chain composition | [likely] — from OCR text, not page images | Cycle-accurate timing only | Use the tabulated values; they are not behaviourally load-bearing |
| 1414 channel-level signal timing (A22-6701 not read) | [unverified] | Cycle-accurate synchronizer model | Use 11 µs/character for card and print buffer transfers |
| Seven- vs eight-bit device list | **contradictory within 223-2692** (p.8 vs p.9) | Console word-mark entry | Implement the 1415 as eight-bit (p.8 version); A22-0526-3 Figure 44 RCPW supports it |
| sims `chan_cmd()` forcing a WM on the first move-mode input character | **contradicts 223-2692 p.58 and Figure 5** | Move-mode card reads if sims is used as the oracle | Follow the manual: move mode adds no word marks at all |
| 1410 Accelerator (p.96) — 4.0 µs overlap cycle instead of 4.5 | [likely] — not read in detail | Timing accuracy under overlap | Use 4.5 µs unless the Accelerator is configured |

---

## Sources

- IBM 1410 Data Processing System, Principles of Operation, Form A22-0526-3 — http://bitsavers.org/pdf/ibm/1410/A22-0526-3_1410_princOps.pdf
- IBM 1411 Input-Output Operations, CE Instruction-Reference Manual, Form 223-2692 (1963) — http://www.bitsavers.org/pdf/ibm/1410/CE_Instruction_Reference_Maintenance/1411_CPU/223-2692_CE_Instruction_1411_Input-Output_Operations_1963.pdf
- IBM 1410 Customer Engineering Handbook, Form 223-2588-2 (April 1964) — http://www.bitsavers.org/pdf/ibm/1410/CE_Instruction_Reference_Maintenance/223-2588-2_1410_CE_Handbook_196404.pdf
- IBM 1410 Data Processing System Reference Manual, Form A22-1407-2 (Nov 1961) — http://www.bitsavers.org/pdf/ibm/1410/A22-1407-2_1410ref_Nov61.pdf
- IBM 1311 Disk Storage Drive Model 5 with IBM 1410 and 7010 Systems, Form A22-6704 — http://bitsavers.org/pdf/ibm/1410/A22-6704_1311_Disk_for_1410_7010.pdf
- IBM 1410 Priority Processing Feature, Form A22-0530-1 — http://bitsavers.org/pdf/ibm/1410/A22-0530-1_1410_priorityFea.pdf
- IBM 7010 Principles of Operation, Form A22-6726 — http://www.bitsavers.org/pdf/ibm/1410/A22-6726_7010_PrincOps.pdf
- IBM 1401 Data Processing System Reference Manual, Form A24-1403-5 — http://www.bitsavers.org/pdf/ibm/1401/A24-1403-5_1401_Reference_Apr62.pdf
- IBM 1401/1440/1460 Disk Storage I/O Instructions, Form A24-3070-1 (misfiled under /1410/; **not** the 1410 form) — http://bitsavers.org/pdf/ibm/1410/A24-3070-1_1410_Disk_Storage_IO_Instructions.pdf
- bitsavers /pdf/ibm/1410/ directory (A22-6701 1414 OEM, A22-6670 / A22-6788 1301, C28-0309-1 Autocoder) — http://bitsavers.org/pdf/ibm/1410/
- bitsavers 1411 CPU CE directory (223-2692, S223-2698) — http://www.bitsavers.org/pdf/ibm/1410/CE_Instruction_Reference_Maintenance/1411_CPU/
- bitsavers /pdf/ibm/1402/ and /pdf/ibm/1403/ component manuals (A24-3072, GA24-3073-8) — http://bitsavers.org/pdf/ibm/1402/
- rcornwell/sims, I7000/i7010_chan.c (channel model; behavioural oracle) — https://github.com/rcornwell/sims/blob/master/I7000/i7010_chan.c
- SimH i7010_cpu.c (X-field and J d-character decode) — https://github.com/rcornwell/sims/blob/master/I7000/i7010_cpu.c
