# Existing 1410 / 1401 Emulators, Diagnostics and Sample Programs

## Implementer summary

1. There is no browser/JS/TS 1401 or 1410 emulator anywhere public [likely]; the only runnable 1410 is Richard Cornwell's SimH `i7010` (C, MIT-style, inside `I7000/`), and the only cycle-level 1410 is Jay Jaeger's Windows/Borland C++ `cube1us/1410` (GPL-3.0) plus his `IBM1410FPGA` VHDL generated from the ALDs.
2. `i7010` has **no 1410 CPU model** — `set cpu 7010` covers both machines on one code path — so it can be *configured* toward a strict 1410 (`set cpu 7010 80k nofloat nopri noprot`) but can never be made to *reject* 7010-only behaviour, and its channel count is a compile-time 4 [verified].
3. The practical validation oracle is not a printer diff: it is `cube1us/1410 Core/cc01.cor`, which is IBM diagnostic **CC01A** (Limited CPU Instruction Test) already assembled into a 10,000-position core image, verified byte-for-byte against the bitsavers listing, needing no tape and no cards — only the console printer [verified].
4. Load `cc01.cor` at IAR 02000 and treat the **halt address** as the verdict (all stops are error stops; two normal typeouts only); then run `insttest.cor` / `ilentest.cor` against `note1410.txt`'s documented address map, which carries cycle-by-cycle expected latch states for add/subtract/ZA/ZS/move — but **for multiply (02600-02644) and divide (02700-02766) it carries the field addresses and contents only, with no latch lines and no result line** (§5.2) [verified].
5. Two op-code traps inherited from the 1401 literature: on the 1410 **Multiply is `@`, Divide is `%`, and `M`/`L` are I/O only** — `note1410.txt`'s "(M)" for Multiply is a slip [verified]; and both emulators render BCD 12 as an ASCII apostrophe, not `@`, so disassembly diffs will disagree with the manual [verified].

---

## 1. Survey — projects and oracle suitability

| Project | URL | Machine | Language / platform | License | Test material shipped | Oracle usefulness for a TS 1410 |
|---|---|---|---|---|---|---|
| Cornwell SimH `i7010` (in `I7000/`) | https://github.com/rcornwell/sims/tree/master/I7000 | 1410/7010 + 1401 compat mode (`set CPU 1401` / `7010`) | C, SimH; builds on macOS/Linux | MIT-style per-file notice, © 2006 R. Cornwell; **no top-level LICENSE** (GitHub API: `license: null`) | `tests/i7010_test.ini` + `tests/i7010/diag.bin` (2,930,826 B) + `st02.txt` card deck (494,247 B) | **Best runnable peer.** Differential testing only — `STATUS.txt` lists open defects. No 1410-vs-7010 distinction. |
| sky-visions 1410/7010 software | https://sky-visions.com/ibm/ibm7010_soft.shtml | 1410/7010 | tape images (`.bcd`/`.tp`/`.bin`), `.job` decks, SimH `.ini` | not stated | PR-155 master (`pr155_mst.bcd`, 4,105,577 B) + `sof.tp`; PR-108 (`pr108.bcd`, 4,616,734 B); `d90_1410.bin` diagnostics (2,930,826 B) | The corpus to feed both emulators. `d90_1410.bin` is byte-size-identical to SimH's `diag.bin`. |
| `cube1us/1410` (Jaeger) | https://github.com/cube1us/1410 | 1410, cycle level | C++ / Borland C++ Builder + VCL, Windows only | GPL-3.0 (`COPYING`, `Copyright.txt`, 1998-2000, 2019) | `Core/*.cor` (cc01, ilentest, ilentst2, insttest) + `note1410.txt` | **The core images are the deliverable.** Simulator itself is unbuildable off Windows; the C++ instruction code and `ubcd.*` tables are readable reference. |
| `cube1us/IBM1410FPGA` (+ `IBM1410Console`, `IBM1410SMS`) | https://github.com/cube1us/IBM1410FPGA | 1410 synthesised from the ALDs | VHDL (~1000+ `ALD_*.vhdl` + `_tb` testbenches; 10,596 logic blocks, 14,021 signals) + C# console | **Author's site says GPL; repo has no LICENSE file** (GitHub API `license: null`). `IBM1410SMS` is GPL-3.0; `IBM1410Console` unlicensed. | Passes CU01 (1410 mode) and M011A (1401 mode); boots PR-108 and full PR-155 incl. sysgen | Ground truth for cycle-level questions, but needs a Digilent Nexys 4. Not a diff oracle. |
| SimH `I1401` (Supnik) | https://github.com/simh/simh/tree/master/I1401 | 1401 only | C | MIT-style | `ceo1401.zip` (diagnostics + SPS), `1401_fortran_autocoder.tgz`, `1401koans.zip` | Oracle for **1401-compatibility mode only**. Native 1401 decks are not valid 1410 programs. |
| ROPE | https://github.com/lucaseverini/ROPE | 1401 | Java IDE wrapping Van Snyder's Fortran-90 Autocoder v3.13 + SimH | GPL-2.0 | `lincoln.s` | Assembler for hand-written 1401-compat test programs. Autocoder binaries are 32-bit. |
| Browser / JS / TS 1401 or 1410 | — | — | — | — | — | **None exists.** |

Source: GitHub API queries; https://sky-visions.com/ibm/ibm7010_soft.shtml; https://simh.trailing-edge.com/software.html; https://www.computercollection.net/index.php/ibm-1410-fpga-implementation/ [verified except FPGA status, which is author-reported — see §3].

Absence of a browser emulator was checked via GitHub search (`1401 ibm language:javascript` → only `aarjavchauhan/IBM1401_generative`, not an emulator; `language:typescript` → nothing), PCjs (no 1401/1410 machine), and the retrocomputingforum emulator thread, which lists only SimH, ROPE, `moshix/IBM1401` (S/360 BAL for MVS 3.8), `sanzaru/ibm-1401` (Swift, incomplete), `ApoorvaJ/IBM-1401` (C++, incomplete), Rob Storey's 2002 Windows emulator, and the Unreal "VDC" 3D datacenter [likely] — https://retrocomputingforum.com/t/ibm-1401-emulators/3143.

---

## 2. SimH `i7010` — what it is, and how far it can be pinned to a strict 1410

The 1410 is **not** a separate SimH simulator. There is no `I1410/` directory; the machine lives in `I7000/` as `i7010_cpu.c`, `i7010_chan.c`, `i7010_sys.c`, `i7010_defs.h`, sharing `i7000_cdr.c`, `i7000_cdp.c`, `i7000_lpr.c`, `i7000_con.c`, `i7000_mt.c`, `i7000_dsk.c`, `i7000_chan.c`, `i7000_com.c`, `i7000_chron.c`, `i7000_ht.c` [verified — https://api.github.com/repos/rcornwell/sims/contents/I7000].

### 2.1 Configuration matrix

| Strict-1410 requirement | SimH command | Compiled default | Achievable? | Notes |
|---|---|---|---|---|
| 1410 instruction set | `set cpu 7010` | `MODEL(2)` = 7010 | **Partly** | No `1410` keyword exists. `cpu_mod` offers exactly `"1401"` (MODEL(1)) and `"7010"` (MODEL(2)); `cpu_help` prints `set CPU 7010  sets IBM 1410/7010 emulation`. |
| ≤ 80,000 positions | `set cpu 80k` | 100K (`MEMAMOUNT(9)`) | Yes | `cpu_set_size` computes `((val>>UNIT_V_MSIZE)+1)*10000`; exactly 80000. Set it **before** injecting anything — `cpu_set_size` zeroes `M[]` above the new size and prompts *"Really truncate memory [N]?"*. |
| No floating point | `set cpu nofloat` | FLOAT **on** | Yes | `OPTION_FLOAT` gates the FP ops (i7010_cpu.c:1950-1956, 2425). |
| No priority interrupts | `set cpu nopri` | PRIORITY **on** | Yes | Prefix-matches `NOPRIORITY`. |
| No storage protection | `set cpu noprot` | PROT off | Yes | Already off; set it anyway. `STATUS.txt` says protection mode is buggy regardless. |
| Only 2 data channels | *(none)* | CH1-CH4 always present | **No** | `NUM_CHAN 5` is compile-time (a disabled placeholder ch0 + CH1-CH4). `chan_unit[1..4]` lack `UNIT_DISABLE` — the `CHAN_DEF` macro that carries it is defined at i7010_chan.c:43 and never used — so `SET CH3 DISABLED` is refused (`set_unit_enbdis` returns `SCPE_NOFNC`). Best approximation: attach no devices to CH3/CH4. |
| Printer output for diffing | `att lp out.lst` + `set ch1 urec=lp` | LP detached | Yes | Exactly what `tests/i7010_test.ini` does. `urec` accepts CR / LP / CP / NONE. |
| Console log for diffing | `set console -n -q log=test.log` | off | Yes | Required for CC01A, whose output is console, not printer. |
| Load a core image | *(none)* | — | No | `sim_load()` is a stub returning `SCPE_NOFNC` (i7010_sys.c:220-223). Use generated `d <addr> <val>` lines. |

One-liner: `set cpu 7010 80k nofloat nopri noprot`

Sources: https://raw.githubusercontent.com/rcornwell/sims/master/I7000/i7010_cpu.c (cpu_unit line 182, cpu_mod 207-236, cpu_set_size 3885-3907, cpu_dep 3877-3883, cpu_help 3997-4014); `i7000_defs.h` 46-58; `i7010_chan.c` 43, 91-96, 106-111, 138-148, 217-233; `i7010_sys.c` 44-87, 220-223; `scp.c` `set_unit_enbdis` 6123-6137, `MATCH_CMD` 463 and 5989-5997 [verified].

### 2.2 Facts that constrain how far you can trust it

- **1410 and 7010 share one code path.** `i7010_cpu.c` contains 25 `CPU_MODEL` tokens (one is the `#define` at line 54), leaving 24 comparisons: 22 `== 1` and 2 `!= 1`. Nothing compares against 2 or 0 [verified — grep on https://raw.githubusercontent.com/rcornwell/sims/master/I7000/i7010_cpu.c]. Correction to an earlier count of "26": it is 24.
- **`MAXMEMSIZE 100000` is a 7010 number, not a 1410 number.** 7010 storage is 40/60/80/100K; 1410 is 10/20/40/60/80K — disjoint above 80K [verified — http://bitsavers.org/pdf/ibm/7010/A22-6726_7010_PrincOps.pdf].
- **SimH's memory menu offers 30K / 50K / 70K / 90K, which are invalid on either machine.** A validation harness should refuse them rather than treat the menu as authoritative [verified].
- **`STATUS.txt` (verbatim):** *"Protection mode has some errors left. Protection mode does not handle setting H or L to 0. T020 tape diags fail. Disks may work. PR108 not tested."* `i7010_test.ini` additionally echoes *"CU26 not working yet"* and *"Expect error 17 on T020C test"* [verified].
- **`boot cdr0` is a 7010 feature, not a 1410 one.** `cdr_boot` → `chan_boot` sets `caddr[chan]=1`, `cmd = CHAN_NOREC|CHAN_LOAD`, IAR=1 — i.e. the **7010 Load key**. C28-0351-5 states it plainly: *"Use of the IBM 7010 Load Key: The procedures above can be used on both the 1410 and the 7010. On the 7010, the Load key can be used instead of entering the read instruction into locations 00000-00011."* Every initialization table in that manual is split "Using 7010 Load Key" / "Not using 7010 Load Key"; the latter is the 1410 path and requires hand-keying a 12-character read instruction into 00000-00011 then computer reset + start. CC01A's own load procedure does exactly that (`RL%B000011$.`). Calling it "the 1402 Load key" is 1401 vocabulary [verified — http://bitsavers.org/pdf/ibm/1410/C28-0351-5_1410_operGuide.pdf pp.7, 32]. **For a strict-1410 harness, `boot` is out of scope**; the equivalent is scripted DEPOSITs into 00000-00011 and run from 00000.
- **`cpu_dep` masks deposits to `val & (077 | WM)`**, so a raw 4-byte little-endian `.cor` value can be fed straight into `d <addr> <val>` without pre-stripping the 0x40 parity bit [verified].
- **`i7010_test.ini` is not purely tape-driven.** The boot is (`bo mta0` against `diag.bin`), but the script's tail does `att cdr0 st02.txt` / `att cdp0 -n st02.out` with `expect "OPTION?" send "ST02\r"`, and toggles `set ch1 urec=lp` / `urec=NONE`. Correct statement: *the only shipped regression entry point is a tape boot*; the card path demonstrably works and card files are plain text [verified].

### 2.3 1401-compatibility mode in `i7010`

`i7010_cpu.c` carries `op_1401[64]` and translates 1401 instructions into 1410 internal form (comments *"Handle 1401 emulation mode"*, *"Translate instruction from 1401 to 1410"*, *"Handle 1401 I/O opcodes"*, lines ~317, 797, 941-1000). The mapping: `B` at various lengths → `OP_BCE` or `OP_B`; `U`/`W`/`V` keep their modifier; `K`/`F` are issued as immediate channel-control commands then become NOP; `M`/`L` without an X-control become `OP_MOV` with modifier `C` / `X`; `D` → `OP_MOV` mod `1`; `P` → `OP_MOV` mod `.`; `Y` → `OP_MOV` mod `2` [verified]. Useful as a template for reusing a 1410 Move engine to service 1401-mode decode.

---

## 3. Jaeger's projects

**`cube1us/1410`** — cycle-level 1410 in Borland C++ Builder/VCL, GPL-3.0, © 1998-2000, 2019 Jay R. Jaeger, last updated 2026-08-08 [verified — https://api.github.com/repos/cube1us/1410]. Units cover the 1415 console (`UI1415L`, `UI1415IO`, `UI1415CE`), 1402 reader/punch/stacker, 1403 printer (`UI1403`, `UIPRINTER`), 729 tape (`UI729TAPE`, `UITAPETAU`, `UITAPEUNIT`), channel, arithmetic, branch, edit/data, debug window, power panel, the BCD table (`ubcd.cpp`/`.txt`), and a `fontlib` of 1415 console and 1403 printer fonts (`.FON`/`.FNT`). README TODO: no disk support (1301/1311), so PR-155 cannot reside on a 1311 [verified].

**`cube1us/IBM1410FPGA`** — VHDL synthesised from the machine's ALDs (`VHDL/ALD_<sheet>_*.vhdl` plus `*_tb.vhdl` testbenches; `dbModel/`), last updated 2026-08-21. **Licensing correction:** the earlier survey recorded the license as unknown; the author's status page states the application source is GPL, though GitHub still detects no LICENSE file in the repo (`license: null`). Intent is documented; confirm with Jaeger before deriving tables [verified — https://www.computercollection.net/index.php/ibm-1410-fpga-implementation/ and https://api.github.com/repos/cube1us/IBM1410FPGA].

FPGA status, author-reported: CPU diagnostics CU01 (1410 mode) and M011A (1401 mode) pass (early Aug 2023); as of mid-2026 it passes 1410 and 1401 I/O diagnostics, runs PR-108 and full PR-155 including Autocoder/compilers and PR-155 sysgen; tape via 1414 TAU logic in the FPGA with a PC-side program over UDP (late 2025); blog #42 "IBM 1414 Unit Record I/O Synchronizer" dated 2026-08-21; board is a Digilent Nexys 4 ("might have even fit on a Nexys 2") [likely — single source, the author's own site].

The 1410's 1401-compatibility mode is a **console switch over hardwired logic**, not microcode: PrincOps — *"Compatibility Switch (Figure 56), when at the 1401 setting, makes it possible to run IBM 1401 programs on the 1410. Ordinarily, the switch should be in the 1410 setting."* A 1401 COMPAT light shows the mode; the index lists "Compatibility Switch, 1415 Test Panel" [verified — A22-0526-3, 1415 Console chapter, "Compatibility Controls"].

---

## 4. The validation oracle: `cc01.cor` = IBM CC01A

### 4.1 What CC01A is

IBM Poughkeepsie *Diagnostic Engineering Publication*, 1410/7010, subject **"Diagnostic Program CC01A — 1410/7010 Limited CPU Instruction Test"**, Sequence Number 001, "Replaces: New Program", dated **11/15/63**, distribution marked for both 1410 and 7010 [verified — CC01A PDF cover page, PDF p.1].

Page 003: *"CC01 was taken directly from C021 to test enough of the basic instruction set to read in and operate the Tape Control Program. It does not contain any Error Typeouts, Loops, Tad Controls or Options to repeat, it is strictly a special purpose test that runs prior to the Tape Control Program and halts for any error."* Equipment required: minimum storage, one tape unit on any channel, console printer. Also: *"CC01 will operate on any 1410/7010 system unless an Engineering Change modifies the operations of the standard Instruction set"* [verified].

Page 005: **PROGRAM STOPS: All stops are Error Stops.** TYPEOUTS — NORMAL: `"CC01A"` (test ident) and `"CC01 COMPLETE"`. **ERROR: None.** Page 004: *"If there is an error the program will stop. The CE must then consult the listing to find out which instruction failed... It is possible to continue to the next instruction by pushing the Start Key."* Locations 01000-01100 hold a character pattern for the CE to inspect for TAU/CPU information-transfer errors [verified].

Page 006 flow chart — the exact list of what it exercises, and it maps almost one-to-one onto the ambiguous areas of a fresh 1410 implementation: NO-OP; unconditional branch; branch on word mark; clear and set word mark; type ident; store A and B address registers; branch bit equal; branch zone and WM/zone; add and subtract; clear storage; clear storage and branch; indexing; branch character equal; the MLNS/MLZS/MLCS scans; compare; data moves; type "CC01 complete"; read in tape control [verified].

Page 003 also names the minimum instruction subset the loader itself needs — a useful minimum-viable-CPU target: **BCE, MRCW, MLCS, BA1, RT, BEX1, MLCWA and a Branch instruction** [verified].

CC01A's tape-loading procedure gives **1410 forms for two channels only (E, F)** and **7010 forms for four (E, F, G, H)** — independent confirmation in IBM's own diagnostic documentation of the 1410's two-channel ceiling [verified — CC01A p.004 §2.xx.01.1 / §2.xx.01.2].

### 4.2 `cc01.cor` is CC01A, already assembled

`cube1us/1410 Core/cc01.cor` is the CC01A object program in core, verified byte-for-byte against listing PAGE 3 (PDF p.11) over 02180-02319:

```
02180 N                     02226 J 02233
02181 J 02226               02233 N
02188 , 02181   (Set WM)    02234 J 02286
02194 M %T0 01250 W         02241 , 02234
02204 R 02194 2             02247 ◊ 00001 02288
02211 R 02218 (group mark)  02258 G 02231 B
02218 N                     02265 G 02231 A
02219 J 02226               02272 G 02231 B
                            02279 J 02226
                            02286 .
                            02287 ◊ 02327 00002
                            02298 G 02231 A
                            02305 G 02231 B
                            02312 G 02231 A
```

Every ADDRS/CT/INSTRUCTION row matches, including the `ROUTINE 05.00` / `ROUTINE 06.00` headings and the in-line notes *"BR TO 00000 INDICATES SBR FAILURE"* / *"BR TO 00001 INDICATES SAR FAILURE"*. Independently, 01000-01100 holds the CE character pattern the write-up describes [verified].

**Correction:** an earlier transcription read 02188 as `. 02181` (Halt). The character there is a **comma** — a 6-character chained **Set Word Mark**. The listing's OPCOD column reads `SW`, OPERAND `*-12`, CT 6, PGLIN 1083, and the core image holds BCD 27 with a word mark. Reading it as `.` would contradict both the listing and the program's logic [verified].

### 4.3 It needs no tape and no cards

The entire 10,000-position image contains exactly five I/O instructions, all to `%T0` — the **console printer**, not tape:

| Address | Instruction | Device | Purpose |
|---|---|---|---|
| 01807 | `M %T0 00000 W` | console printer | loader/monitor block at 01800-01912 |
| 01852 | `M %T0 01887 R` | console printer | read console |
| 01883 | `L %T0 00000 R` | console printer | read console with word marks |
| 02194 | `M %T0 01250 W` | console printer | types the `CC01A` ident (= listing ADDRS 02194) |
| 08890 | `M %T0 08921 W` | console printer | types `CC01 COMPLETE` |

No `%Ux` / `%Bx` (tape), no `%10`/`%11`/`%12` (card reader), no `%20`/`%21` (printer) appears anywhere in the image. `CC01A` is word-marked at 01250 and `CC01 COMPLETE` at 08921, both group-mark terminated [verified — exhaustive decode of `cc01.cor`; device codes per A22-0526-3 Figure 44 p.46 and pp.88-91].

### 4.4 Entry point and exit paths

**IAR = 02000**, confirmed three ways: (1) the *Introduction to Diagnostics* states the final execute card *"causes a Branch Out of the load routine to the first instruction of the actual diagnostic program. (Address 02000)"*; (2) `cc01.cor` holds a word-marked `N` (No-Op) at exactly 02000 and the flow chart begins with "NO-OP instruction"; (3) the image contains an explicit `J 02000` at 08994 followed immediately by a halt, as the restart path [verified].

Normal completion: the `CC01 COMPLETE` write at 08890 falls through to `J 08959`, which relocates CC01A's own tape read-in to low core — `D 08967 00333 Δ` (MRCWG) copies 08967-08987 to 00333-00353, `D 00332 00339 3` plants the copy's op character, and `J 00322` branches into the result. **00322-00331 is a ten-character hole for the per-channel tape read-in `M` the CE keys** (CC01A p.004 gives 1410 forms for channels E and F); blank in this image, since no tape instruction was ever keyed. So a clean run ends with an instruction check at 00322 having typed both messages — treat that as PASS and stop there. The `J 01972` at 08980 is **not** on the executed path, and two separate facts say so. Static, and independent of any emulator: a full-image operand scan of `cc01.cor` finds no reference anywhere to 08980, 08966, 08973 or 08959 among the addresses that lead there, so nothing in the image branches to that `J` [verified — full-image operand scan]. Dynamic: 08980 is reached only as the relocated copy landing at 00346, after the missing read at 00322 has run [observed — executed under this emulator 2026-08-30, 1241 instructions; not a primary-source read, and it cannot confirm the emulator that produced it]. An earlier pass of this note read 08980 straight off the static image and mistook the read-in's static location for its exit branch.

### 4.5 Word marks are load-bearing — do not "fix" them

`cc01.cor`'s branch-on-word-mark test works by storing op codes **without** word marks and setting them at run time. 02181 holds `J 02226` with no word mark; 02188 is the chained `, 02181` that creates it. Same pattern at 02234/02241. Listing source lines: OPCOD `B` / OPERAND `AJ` under *"THIS BR NOT TAKEN FIRST TIME THRU"*, and OPCOD `SW` / OPERAND `*-12` under *"TEST AC FOR WORD MARK"*. **A `.cor` loader must copy the WM bit verbatim and must never infer word marks from instruction boundaries** [verified].

### 4.6 The card-only deck exists on paper only

| Group | Count | Purpose |
|---|---|---|
| L1 Loader | 7 cards | Seven-card bootstrap; reads from E channel, F channel, or E channel with the load-button feature |
| Core Clear | 1 card | Diagnostic core-clear execute card |
| Program cards | 160 | Numbered 001-160 in cols 78-80 |
| Execute card | 1 | Branch to 01972 to operate TC50 |
| **Total** | **169** | Cover-page phrasing: *"Card Deck for CARD ONLY SYSTEMS (as punched by UP51)"* |

The cover page simultaneously says *"This Program uses no System or Channel Control Cards"* and *"This Program should be run only from tape."* [verified].

**No card image survives.** `bitsavers /bits/IBM/1410/` holds exactly one subdirectory, `1410-PR-108/`, containing `jpr108-2024.bcd` (1.3 MB tape image), `jpr108-2024.zip` (308 KB) and four JPEGs, dated 2024-03-24; a plain `curl` of the zip returns HTTP 403 (needs a browser/referrer). The `DIAGV100/` directory holds only PDFs. The CC01A PDF is 48 scanned pages, PDF 1.3, Acrobat 4.0 import 2002-01-05, **with no OCR text layer** (`pdftotext` yields 48 bytes of whitespace); ~38 of those pages are the Autocoder listing [verified — directory listings retrieved 2026-08-29].

Since `cc01.cor` is the same program already loaded, re-punching the deck is unnecessary for validation. The remaining value of the listing is the **halt-address → failing-routine lookup table**, which still requires manual transcription.

---

## 5. Jaeger's own test images and `note1410.txt`

### 5.1 Inventory

| File | Bytes | Header (coresize) | Word size | Occupied range | Non-blank positions | What it is |
|---|---|---|---|---|---|---|
| `cc01.cor` | 40,005 | 10000 | 4 | 01000-09618 | 7,671 | **CC01A**, loaded and ready to run. |
| `insttest.cor` | 320,005 | 80000 | 4 | 00000-79998 | 2,755 | Length/decode block 00100-02100, index-register block 02200-02288, annotated arithmetic/move block 02300-02968. |
| `ilentest.cor` | 320,005 | 80000 | 4 | 00000-33335 | 1,061 | Instruction length/decode test, same layout, smaller. |
| `ilentst2.cor` | 320,005 | 80000 | 4 | — | — | Backup of `ilentest.cor` per `note1410.txt` (*"Both should ordinarily be the same or very similar"*) [likely — size from the GitHub tree API only; file not independently decoded]. |

**Correction to an earlier claim that `insttest.cor` "needs a full 80K machine":** the bytes at 79990-79998 decode to the literal string `THE END!!` — data, never executed, never referenced. Excluding it, the highest non-blank position is **11,641**; `ilentest.cor`'s 33,335 is likewise a literal address constant (11111/22222/33333), not code. Executable content lives in 00000-02968 with operand fields in 10001-10600. **The tests fit in ~12K.** What forces 80K is the file's own 5-digit header plus `LoadCore`, which warns and clamps if the declared core size exceeds the simulator's. Under SimH still do `set cpu 80k` before injection — but do not report 80K as a property of the tests [verified].

**Correction on fill value:** the `.cor` blank fill is **per-file, not a format constant**. `cc01.cor` fills unused storage with `0x00000040` (space + parity C bit — a valid character; most common raw value 64, 2,329 positions). `insttest.cor` and `ilentest.cor` fill with `0x00000000` — **no C bit**, i.e. parity-invalid in Jaeger's own encoding, since `BCD_SPACE` is `0 | BITC` (most common value 0: 77,191 and 78,936 positions respectively). An emulator that validates parity on fetch or B-cycle read will process-check on those two images the moment it touches untouched storage. **Normalise `0x00` → `0x40` on load** for those files; `cc01.cor` needs no normalisation [verified].

### 5.2 Address map (with corrections applied)

| Address | Test | Op character in the file | `note1410.txt` says |
|---|---|---|---|
| 00000 | Tape load instruction (boot) | — | — |
| 00100 | Add | `A` | (A) — correct |
| 00200 | Subtract | `S` | (S) — correct |
| 00300 | Zero and Add | `?` | (?) — correct |
| 00400 | Zero and Subtract | `!` | (!) — correct |
| 00500 | Multiply | **`@`** (BCD 12, bits 8-4) | **(M) — WRONG.** `M` is the Autocoder mnemonic, not the op char. |
| 00600 | Divide | `%` | (%) — correct |
| 00700 | Move | `D` | (D) — correct |
| 00800 | Move Chars and Suppress Zeros | `Z` | (Z) |
| 00900 | Edit | `E` | (E) |
| 01000 | Compare | `C` | (C) |
| 01100 | Table Lookup | `T` | (T) |
| 01200 | Branches | `J`, `X`, `R` | (J, X, R) — decoded as `J 11111 A`, `X 22222 B`, `R 33333 D` |
| 01300 | Branch Character Equal | `B` | (B) |
| 01400 | Branch if Bit Equal | `W` | (W) |
| 01500 | Branch on Word Mark or Zone Equal | `V` | (V) |
| 01600 | Store Address Register | `G` | (G) |
| 01700 | Set Word Mark | `,` | (,) |
| 01800 | Clear Word Mark | lozenge | (Lozenge) |
| 01900 | Clear Storage | `/` | (/) |
| 02000 | Halt | `.` | (.) |
| 02100 | I/O instructions | `M`, `L`, `U`, `K`, `F`, `4`, `2` | correct — and here `M` genuinely **is** an op character (`M %B0 11111 D`). Includes a channel-2 lozenge form. |
| 02200-02288 | Index register tests, all 15 registers | `A` | 02200 unindexed, then 02211/02222/…/02288 with X1..X15 |
| 02300-02968 | Annotated add / subtract / ZA / ZS / multiply / divide / move | various | cycle-by-cycle expected latch states for add / subtract / ZA / ZS / move; **operand fields only for multiply 02600-02644 and divide 02700-02766** |

**Correction — the length blocks do not use a uniform 11/6/1 pattern.** An earlier reading claimed every entry is `op 11111 22222 / op 33333 / op`. Direct decode of `ilentest.cor` shows the lengths track what is legal for that op:

| Length group | Ops | Decoded example |
|---|---|---|
| 11 / 6 / 1 | `A S ? ! @ % Z E C , ◊ /` | `00100: _A1111122222  _A33333  _A` |
| 12 / 6 / 1 (ops with a d-character) | `D B W V T` | `00700: _D1111122222+  _D33333  _D` ; `01300: _B1111122222D …` |
| 7 only | `J X R` (branches), `G` (SAR) | `01200: _J11111A  _X22222B  _R33333D` ; `01600: _G11111A` |
| 6 / 1 | `.` (Halt) | `02000: _.11111  _.  _.` |

This matches the manual's per-op "L =" lines: Add/Subtract/ZA/ZS L = 1 or 11 plus the L = 6 one-field form; Multiply/Divide L = 1, 6, or 11; Move `D` L = 1, 6 or 12; BCE `B` L = 1, 6 or 12; Branch `J` L = 1 or 7. **Key expected instruction length off the op, never off a constant** [verified — decode of `ilentest.cor` against A22-0526-3 pp.19-26, 45].

`note1410.txt` also warns that the length and index blocks are **decode tests only**: *"Before using them, it is convenient to go into `T1410CPU::DoStartClick()` and change it so that the instructions don't actually try to execute"* (and likewise *"it is good to disable the actual execution of these Add instructions"* for the index tests). The oracle for those blocks is the post-decode AAR/BAR/IAR, not any arithmetic result [verified].

### 5.3 The Move d-character matrix — the single most valuable block

`insttest.cor` 02800-02968 holds 16 Move instructions covering the full d-character control matrix, with expected results annotated in `note1410.txt`:

```
D 10501 10503 J    D 10505 10507 K    D 10509 10511 L    D 10513 10515 P
D 10517 10519 -    D 10521 10523 3    D 10526 10528 L    D 10530 10533 T
D 10535 10538 C    D 10541 10543 C    D 10544 10548 ,    D 10554 10558 $
D 10564 10568 .    D 10574 10577 =    D 10582 10586 =    .
```

The rule set (A22-0526-3 Figure 19, p.25): bit 1 = transfer numeric portion; bit 2 = transfer zone portion; bit 4 = transfer word marks A→B; no 1/2/4 bit = scan only, no data transferred. With the **8 bit ON** (left-to-right): neither B nor A = stop at the first word mark in either field; A only = stop at A-field record mark; B only = stop at A-field group-mark-word-mark; B and A = stop at A-field record mark or GMWM. With the **8 bit OFF** (right-to-left): neither = transfer or scan exactly one position; A only = stop at A-field word mark; B only = stop at B-field word mark; B and A = stop at the first word mark in either field. All 16 d-characters check out against this table [verified].

**Second `note1410.txt` label error, and this one changes what the test means.** The line *"02848  Move D=T (RL, SCAN, Stop on BWM)"* names the wrong d-character: the image at 02848 holds `D 10517 10519 -`, d = hyphen (BCD 32, B bit only, no 8/4/2/1). Per Figure 19 that is *"Blank (No 1, 2, or 4 Bit) = Scan for word marks, record marks, or group-mark-word-marks"* with *"NO 8-BIT (RIGHT TO LEFT) B-Bit Only = Stop transfer or scan at B-field word mark"*. Jaeger's prose description is right; his d-character label is wrong. `T` (BCD 19) would be a right-to-left character move stopping at the A-field word mark — that is the separate test at 02884 [verified].

The arithmetic block's annotations are **cycle-level expected traces** for add, subtract, zero-and-add and zero-and-subtract (02300-02596), not just results: each of those cases lists the A-cycle/B-cycle fetch and store characters plus latch states (Scan 1 / Scan 3, Units / Body / Extension, Zero Balance, A Complement, B Complement, Carry In/Out, Overflow), and explicitly documents the chained-instruction pairs (02368/02379 add, 02473/02484 subtract, 02550/02561 zero-and-add) with their D-cycle behaviour, plus the zones-in-A-and-B cases at 02380 and 02485 [verified].

**Correction — the multiply and divide sub-blocks are NOT cycle-level.** An earlier reading extended the sentence above to the whole 02300-02799 range. The ten cases at 02600-02644 (`@`) and 02700-02766 (`%`) carry **two printed lines each — the heading and the A/B operand fields — and nothing else**: no `A:` / `B:` fetch-and-store lines, no latch names, and not even the `Result:` line the Move block at 02800 prints. The note's own text settles it, transcribed verbatim in `oracle/note1410/arith.ts` (e.g. `02600 Multiply 2 fields` / `A (10308): 18J   B (10305): 8Bxxxx`, the whole case). Those ten expected products and quotients therefore have to be **derived from the manual** — A22-0526-3 pp.19-21, `opcodes.md` §4.5 / §4.6 — and the fixture carries the derivation and the citation beside each value [verified — `oracles/note1410.txt` 02600-02766 read in full].

---

## 6. The `.cor` file format and its relationship to SimH memory

| Offset | Size | Content |
|---|---|---|
| 0 | 5 bytes | Core size, ASCII decimal, zero-padded (`%05d`) — e.g. `10000`, `80000` |
| 5 | coresize × W | One little-endian integer per storage position. W = (filesize − 5) / coresize, and must be 2 or 4; `LoadCore` warns otherwise. All four committed files use W = 4; current `DumpCore` writes W = 2. |

Bit layout of each value (`BCD::c`; the `ubcd.h` comment reads `WM C B A 8 4 2 1`):

| Bit | Mask | Meaning |
|---|---|---|
| 7 | 0x80 | `BITWM` — word mark |
| 6 | 0x40 | `BITC` — odd-parity check bit |
| 5 | 0x20 | `BITB` — B zone |
| 4 | 0x10 | `BITA` — A zone |
| 3-0 | 0x0F | numeric bits 8 4 2 1 |

Jaeger's `bcd_ascii[64]` and SimH's `mem_to_ascii[64]` / `CHR_*` octal codes occupy the same 64 positions in the same order (0 = blank, 1-9, 10 = `0`, 11 = `=`, 12 = `@`, 13 = `:`, 14 = `>`, 15 = radical, 16 = substitute blank, 17 = `/`, 18-25 = S..Z, 26 = record mark, 27 = `,`, 28 = `%`, 29 = word separator, 30 = `\`, 31 = segment mark, 32 = `-`, 33-41 = J..R, 42 = `!`, 43 = `$`, 44 = `*`, 45 = `]`, 46 = `;`, 47 = delta, 48 = `+`, 49-57 = A..I, 58 = `?`, 59 = `.`, 60 = lozenge, 61 = `[`, 62 = `<`, 63 = group mark), and both use 0x80 for the word mark (SimH `i7010_defs.h`: `#define WM 0200`). **Conversion: `simh_byte = (v & 0x3F) | (v & 0x80)`** — drop the parity bit [verified].

**Rendering diverges in 6 of 64 positions**, which will produce spurious diffs in any console/printer text comparison between the two simulators:

| BCD | Character | Jaeger ASCII | SimH ASCII |
|---|---|---|---|
| 15 | radical | `{` | `s` |
| 26 | record mark | `\|` | `x` |
| 29 | word separator | `~` | `` ` `` |
| 31 | segment mark | `"` | `_` |
| 47 | delta | `_` | `^` |
| 63 | group mark | `}` | `\|` |

The other 58 agree exactly — **including position 12, which both render as an ASCII apostrophe even though IBM prints `@`**, and position 28, which both render as `(` where IBM prints `%`. Blanks are settled: both put a real space at code 000 and the letter `b` substitute blank at code 020, so SimH's `CHR_ABLANK` is the printable blank and `CHR_BLANK` the substitute [verified — position-by-position comparison of `ubcd.cpp` vs `i7010_sys.c`].

---

## 7. Card-deck formats (for synthesising decks, if you go that way)

Standard IBM 1410/7010 diagnostic program card:

| Columns | Field | Content |
|---|---|---|
| 1 | 1st | Word separator character |
| 2-6 | 1st | Initial (leftmost) address of data to be stored |
| 7 | 2nd | Word separator character |
| 8-12 | 2nd | Number of storage positions required |
| 13-72 | 3rd | Instructions / data |
| 73-77 | 4th | Test title (5-char diagnostic id, e.g. `CC01A`) |
| 78-80 | 4th | Card number within the deck |

A complete card-form test = 7-card L1 loader + 1 diagnostic core-clear execute card + data cards numbered from 001 + a final execute card branching to the diagnostic's first instruction (address 02000). Execute card: column 1 = `E`, instruction starts in column 2, last instruction must branch to an existing instruction in memory; the L1 loader detects the `E` and transfers control to column 2. Example given: `E ~J02000b~`. The loader reads from the E channel, the F channel, or the E channel using the load-button feature, and successive diagnostic decks can be stacked without removing the loader or core-clear cards [verified — http://www.bitsavers.org/pdf/ibm/1410/diagnostics/DIAGV100/1410_7010_Introduction_to_Diagnostics.pdf (4/15/64) pp.003-005].

For 1401-side reference, `ibm-1401.info/1401-CardDeckFormats.html` documents three object-deck loader styles and the word-separator convention (sets a word mark on the next character) [verified].

---

## 8. Op-code and character-code traps (1401 ↔ 1410)

**Native 1401 object decks are not 1410 programs.** Van Snyder's chart: *"D, T and X have different meanings in 1401, 1460 and 1410. 1410 does not interpret #, H, P, Q, Y or 1-9. G, J and R are 1410 only. M and L on 1410 are only for I/O."* Also *"% and @ are standard on 1410. 7010 and 1410 are compatible."* [quotation verified — https://ibm-1401.info/Van1401-CodeChart.pdf; **the "does not interpret" list is partly refuted — see the correction below**].

**Correction to that note — `2`, `4` and `Y` *are* 1410 op codes.** Van Snyder's exclusion list is too broad in three places [verified — A22-0526-3]:

- `2` = Carriage Control, channel 2 (channel 1 is `F`), p.81.
- `4` = Select Stacker and Feed, channel 2 (channel 1 is `K`), p.62. Both digit ops require the second data channel to be installed.
- `Y` = Priority Test and Branch, form `Y (I) d`, present only with the Priority feature installed.

The rest of the list holds: `#`, `H`, `P`, `Q` and the digits `1`, `3`, `5`, `6`, `7`, `8`, `9` are not 1410 op codes. `1` and `3` are 7010-only (the channel-4 and channel-3 status-branch ops — SimH `OP_IO4 CHR_1`, `OP_IO3 CHR_3`), which is what the channel-discriminator paragraph below already says. Any `P`/`Q` op code belongs to the optional 1412/1419 MICR feature and is not documented in A22-0526-3.

The note is about **op codes only** and says nothing about d-characters: `H`, `Q` and `Y` are all legal `D` (Move/Scan) d-characters (SCNRM, SCNRG, SCNRR), and `1`, `2`, `9` and `Q` are legal `J` d-characters (BOL1, BOL2, BC9, BNQ1). A dispatch table must accept `2`, `4` (channel 2 installed) and `Y` (Priority installed) as op codes, reject `#`, `H`, `P`, `Q`, `1`, `3`, `5`-`9` as op codes, and still accept `H`, `Q`, `Y`, `1`, `2`, `9` in the d-character position.

**1410 native op codes** [verified — A22-0526-3 instruction forms]: Multiply = `@` (mnemonic M, form `M @ aaaaa bbbbb`, p.26); Divide = `%` (p.27); Zero and Add = `?`; Zero and Subtract = `!`; Move = `D` (`D aaaaa bbbbb x`, p.24); MCS = `Z`; Store Address Register = `G` (SAR/SBR/SER/SFR all generate `G`, differentiated by d-character, p.30); Clear Word Mark = lozenge (p.32); Halt = `.` (p.34); Branch Conditionally = `J` with d-character; BCE = `B` (`B iiiii bbbbb x`, p.45). Cross-checked against `i7010_defs.h`: `OP_M = CHR_QUOT`, `OP_D = CHR_RPARN`, `OP_CWM = CHR_LPARN`, `OP_SAR = CHR_G`.

**Channel discriminator — the cleanest strict-1410 check at the instruction level.** The channel prefix in an I/O instruction's x-control field is `%` = ch1, lozenge = ch2, `?` = ch3, `!` = ch4; the matching branch-on-I/O-channel-status op codes are `R` (ch1), `X` (ch2), `3` (ch3), `1` (ch4). **A strict 1410 must reject `?` and `!` prefixes and the `3` and `1` branch ops outright, and reject the lozenge prefix and `X` unless channel 2 (and therefore processing overlap) is installed** [verified — C28-0351-5 p.7; CC01A p.004 load instructions `RL%B…`, `XL◊B…`, `3L?B…`, `1L!B…`; A22-0526-3 p.36 *"All use the R op code for channel 1 or the X op code for channel 2"*; `i7010_defs.h` `OP_IO1 CHR_R`, `OP_IO2 CHR_X`, `OP_IO3 CHR_3`, `OP_IO4 CHR_1`].

**Console I/O:** `%T0` is the console-I/O printer, addressed by `M` or `L` with d-character `R` (read) or `W` (write): RCP = `M %T0 bbbbb R`, RCPW = `L %T0 bbbbb R`, WCP = `M %T0 bbbbb W`, WCPW = `L %T0 bbbbb W`. Tape is `%Ux` (odd parity/BCD) and `%Bx` (even parity/binary); card reader is `%10`/`%11`/`%12`/`%19` and printer `%20`/`%21` on channel 1 [verified — A22-0526-3 Figure 44 p.46; tape pp.88-91; card/printer tables pp.71, 86].

### 1410-relevant BCD/card codes for control characters

| IBM character | Card code | BCD bits | Notes |
|---|---|---|---|
| Record Mark (‡) | 0-2-8 | A82 | SimH ASCII `'` or `\|\|` |
| Group Mark | 12-7-8 | CBA8421 | SimH ASCII `"` or `}` |
| Word Separator (=) | 0-5-8 | CA841 | On tape, indicates the next character carries a word mark |
| Tape Segment (") | 0-7-8 | **A8421** (no C bit) | **Corrected** — an earlier reading added a C. A8421 has 4 bits set; with even parity on 7-track BCD tape the check bit is absent. |
| Mode Change (Δ) | 11-7-8 | B8421 | |
| ƀ Substitute Blank (`¢` cent in the previous code) | 2-8 | A | **Corrected — the attribution was inverted.** `ƀ` substitute blank is the *1410* Standard BCD Interchange Code glyph; `¢` cent is the *previous* (pre-MES / 1401 Fig 267) glyph for the same code point [A22-0526-3 Fig 3, p.7]. It is **not** the lozenge — `⌑` is 12-4-8 (CBA84) [Fig 2, p.6]. Card behaviour: the 1410 punches a core A-bit as 2-8 and reads 2-8 back as an A-bit; a base 1401 punches it as `0` and reads 2-8 as invalid, which no-charge RPQ 898148 fixes [A22-0526-3 p.100]. |
| Blank | none | C | |
| ! (minus zero) | 11-0 | B82 | |
| ? (plus zero) | 12-0 | CBA82 | |

Source: https://ibm-1401.info/Van1401-CodeChart.pdf, pages 1-2 [verified]. The chart's 1410-specific glyph column also marks 0-7 (CA421) as the 1410 `*` op-code marker, 12-7 (BA421) as `S?R` flagged 1410, and 0-3 `T` as 1460/1410 [verified].

### 1401-compatibility-mode semantics a 1410 must get right

- **Storage aliasing:** in 1401 mode a 10K 1410 behaves as an 8K 1401; every larger 1410 behaves as a 16K 1401 [verified — A22-0526-3 "1401 Compatibility"].
- **Supported 1401 features in the mode:** additional storage, multiply-divide, expanded print edit, advanced programming (indexing, SAR, move record), print storage, high-low-equal compare, read-punch release, sense switches. **Not supported:** column binary, compressed tape, punch-feed read, serial I/O adapter (1009/1011/1012/1412/1418/1419), process overlap, selective tape listing, space suppression [verified].
- **Three behavioural divergences from a true 1401** [verified — A22-0526-3, "Differences in 1401 and 1410 system operation", "Compatibility Controls"]:
  1. Input characters with bad parity — the 1401 forces validity by flipping C; the **1410 stores an asterisk (`*`)**. SimH `i7010` carries an `ASTRISK`/`astmode` CPU register, and C28-0351-5's initialization tables all note *"The Asterisk-Insert switch must be set to ON."*
  2. Divide with an initially blank B field and a zero quotient — the 1401 leaves blanks; the 1410-in-1401-mode converts them to zeros.
  3. 1401-mode I/O errors are governed by the console I/O Check Stop switch and 1401 I/O Check-Reset switch, both inoperative in 1410 mode.

The real diagnostic for the mode is IBM **M014B** *"1410/7010 1401 Compatibility"* (5,642,919 B PDF listing, DIAGV100) [verified].

---

## 9. Recommended validation workflow

1. **Write a `.cor` loader** (~40 lines): read the 5-digit ASCII header, then `coresize` little-endian ints of width `(filesize-5)/coresize`; store `(v & 0x3F) | (v & 0x80)` per position; **copy the WM bit verbatim**; for `insttest.cor` / `ilentest.cor` normalise `0x00` fill to `0x40` if you parity-check storage.
2. **Run `cc01.cor` first.** 80K machine (or 10K — the image declares 10000), IAR = 02000, console printer attached. Expected: `CC01A`, then `CC01 COMPLETE`, then the relocation moves and `J 00322` into the blank tape read-in hole — an instruction check at 00322 is the normal end on a tape-less image (§4.4). **Any other halt is an error stop**; look the address up in the CC01A listing (the `ROUTINE nn.mm` headings plus the ADDRS column). Do not attempt a printer diff — CC01A produces no printer output and no error typeouts.
3. **Then `ilentest.cor`** (decode/length only — disable execution, check post-decode AAR/BAR/IAR against the per-op length groups in §5.2), **then the index block** 02200-02288 (7 × 11-char two-address instructions at 02211…02277 = 14 indexed addresses, plus one 6-char one-address at 02288 = 15, preceded by an unindexed `A 11111 22222` at 02200).
4. **Then `insttest.cor` 02300-02968** against `note1410.txt`'s annotations — the add/subtract/ZA/ZS latch states (02300-02596) and the 16-case Move d-character matrix (02800-02968) at cycle level, and the multiply and divide blocks (02600-02766) on their operand fields plus manual-derived results, which is all the note gives there (§5.2). This is where a fresh implementation actually gets caught.
5. **Use `i7010` as a second opinion, not the arbiter.** `set cpu 7010 80k nofloat nopri noprot`, inject via generated `d <addr> <val>` lines (no `sim_load`), avoid `boot` (it is the 7010 Load key), and log the console. Expect the 6 character-rendering divergences of §6 in any text diff.
6. **Feed both with the sky-visions corpus for I/O-level work** — `d90_1410.bin` diagnostics, PR-108 and PR-155 tapes, and the `.job` decks (`a.job` Autocoder, `c.job` COBOL, `f.job` Fortran hello world, `f108.job` primes, `pi.job`, `prime.job`, `laplace.job`, `s.job`, `s20k.job`).

---

## 10. Unverified, contradictory, and blocking items

| Item | Status | Blocks | Fallback |
|---|---|---|---|
| Nobody has published a pass/fail transcript of `cc01.cor` under any simulator. The repo ships the image with no expected-output file, and `README`/`note1410.txt` never mention `cc01.cor` at all. | [unverified] | The whole halt-address oracle for the CPU. Entry point and completion path are confirmed, but the program has not been observed to run. | Bootstrap it: run to the first halt, and if it is not the instruction check at 00322 (the relocated tape read-in hole — §4.4) use `insttest.cor`/`note1410.txt` (which *does* carry expected values) to localise the bug, then re-run. Treat CC01A as a smoke test until a first clean pass establishes the baseline. |
| The 38-page CC01A listing has **no OCR text layer**; no halt-address → routine table exists in machine-readable form. `DIAGV100/listings.pdf` (248 KB, 3 pages) is not it — it is the diagnostic **master tape index** (`NEW-0002 / E2-NEW MASTER TAPE`, hand-dated 3-8-65): R 001 CC01A, R 005 TC50C, R 011-014 C020B, R 021 C021B, R 025 C022D, R 051 CU01C, R 055 CU06B, R 073 CU02C, R 080 CU50A, R 090-099 CS30A-CS39A, R 151 ST02D, R 171/172 ST81A, R 201-209 T020C/T021C/T022D, R 251 MP01C, R 259 M003E, R 279 M011A, R 283 M012A, R 287 M013B, R 291 M014B, … R 951 UP51B. | [verified that it is missing] | Diagnosing *which* test failed from a halt address. | Transcribe the ADDRS column and `ROUTINE nn.mm` headings by hand (~38 pages), or diff against `i7010` to narrow the failing instruction first and only then consult the specific listing page. |
| `ilentst2.cor` size and backup status rest on the GitHub tree API alone; the file was not decoded. | [likely] | Nothing — it is a duplicate. | Ignore it; use `ilentest.cor`. |
| Whether `i7010` accepts a synthesised 169-card L1-format deck. `cdr_boot` exists but the L1 loader's word-separator / load-mode handling and E-channel dependence were never tested. | [unverified] | Any plan that routes validation through synthesised card decks. | Don't route through cards. `cc01.cor` makes the deck unnecessary, and `boot` is a 7010 feature anyway. |
| Whether `i7010`'s console/inquiry model is faithful enough for CC01A's two typeouts to land where expected — the two simulators must agree on `%T0` semantics for a console-log diff to mean anything. | [unverified] | Cross-simulator console diffing. | Compare halt addresses and memory state rather than console text. |
| Which diagnostics on `d90_1410.bin` correspond to which bitsavers listings, and which fail under SimH (T020C per `STATUS.txt` / `test.ini`). | [unverified] | Interpreting a diag-tape run. | Run `i7010_test.ini` locally and read `diag.lst`; the master-tape index above maps IDs to record numbers. |
| Contents of `bitsavers jpr108-2024.zip` (403 to plain curl) and how it differs from sky-visions `pr108.bcd`. | [unverified] | Nothing on the CPU path; PR-108 OS work only. | Use sky-visions `pr108.bcd`, which is directly fetchable. |
| Exact license of `cube1us/IBM1410FPGA` and `IBM1410Console`. Author's site says GPL; neither repo has a LICENSE file. | [likely] | Reusing VHDL-derived truth tables or the console layout in a shipped product. | Ask Jaeger. Read the VHDL for understanding; re-derive tables from A22-0526-3 rather than copying. |
| Byte sizes of `diag.bin` / `d90_1410.bin` / `pr155_mst.bcd` / `pr108.bcd` come from HEAD requests only, not content hashes; "byte-identical in size" is not "byte-identical". | [likely] | Nothing load-bearing. | Hash both if it matters. |
| 1410-mode 1415 console character set and print behaviour; 1403 chain set on the 1410 (A chain vs H chain; the 1410 also supported 1403 model 2/3). | [unverified] | Console and printer rendering fidelity. | Read A22-0526-3's console chapter and the 1403 component description before implementing glyph output. |
| Whether C020B / C021B ship card-only decks. The full CPU tests CC01 was cut down from **are** on bitsavers — `C020B_1410_CPU_Error_Detection.pdf` (6.4 MB) in `DIAGV202-K2/`, `C021B_1410_7010_CPU_Error_Detection.pdf` in `DIAGV201/`, `C022D_1410_Alarm_Program.pdf` in `DIAGV200/` — but only as scanned listings. | [verified that they exist; deck status unverified] | A deeper CPU test than CC01A. | CC01A covers the ambiguous instruction areas; escalate to C021B only if CC01A passes and bugs persist. |

Contradiction worth flagging explicitly: **CC01A's cover page says the program "should be run only from tape" while simultaneously enumerating a 169-card card-only deck.** Both statements are in the document. The resolution for this project is that neither matters — `cc01.cor` is the assembled program in core, and its five I/O instructions all target the console printer.

---

## Sources

**Emulator source**
- https://github.com/rcornwell/sims/tree/master/I7000
- https://raw.githubusercontent.com/rcornwell/sims/master/I7000/i7010_cpu.c
- https://raw.githubusercontent.com/rcornwell/sims/master/I7000/i7010_chan.c
- https://raw.githubusercontent.com/rcornwell/sims/master/I7000/i7010_sys.c
- https://raw.githubusercontent.com/rcornwell/sims/master/I7000/i7010_defs.h
- https://raw.githubusercontent.com/rcornwell/sims/master/I7000/i7000_defs.h
- https://raw.githubusercontent.com/rcornwell/sims/master/I7000/STATUS.txt
- https://raw.githubusercontent.com/rcornwell/sims/master/I7000/tests/i7010_test.ini
- https://raw.githubusercontent.com/rcornwell/sims/master/scp.c
- https://api.github.com/repos/rcornwell/sims/contents/I7000
- https://github.com/simh/simh/tree/master/I1401
- https://simh.trailing-edge.com/software.html
- https://simh.trailing-edge.com/pdf/i1401_doc.pdf
- https://github.com/lucaseverini/ROPE

**Jaeger**
- https://github.com/cube1us/1410
- https://github.com/cube1us/1410/tree/master/Core
- https://raw.githubusercontent.com/cube1us/1410/master/Core/cc01.cor
- https://raw.githubusercontent.com/cube1us/1410/master/Core/insttest.cor
- https://raw.githubusercontent.com/cube1us/1410/master/Core/ilentest.cor
- https://raw.githubusercontent.com/cube1us/1410/master/note1410.txt
- https://raw.githubusercontent.com/cube1us/1410/master/UI1410CPUT.cpp
- https://raw.githubusercontent.com/cube1us/1410/master/ubcd.h
- https://raw.githubusercontent.com/cube1us/1410/master/ubcd.cpp
- https://github.com/cube1us/IBM1410FPGA
- https://github.com/cube1us/IBM1410SMS
- https://github.com/cube1us/IBM1410Console
- https://www.computercollection.net/index.php/ibm-1410-fpga-implementation/
- https://www.computercollection.net/index.php/ibm-1410-simulator/
- https://www.computercollection.net/index.php/the-ibm-1410-data-processing-system/
- https://www.computercollection.net/index.php/2021/05/02/ibm-1410-fpga-posted-to-github/
- https://ibm-1401.info/IBM1410FPGA.html

**Software / tape corpus**
- https://sky-visions.com/ibm/ibm7010_soft.shtml
- https://sky-visions.com/ibm/ibm1410.shtml
- https://sky-visions.com/ibm/ibm7010_instr.shtml
- http://bitsavers.org/bits/IBM/1410/
- http://bitsavers.org/bits/IBM/1410/1410-PR-108/

**IBM documentation**
- http://bitsavers.org/pdf/ibm/1410/A22-0526-3_1410_princOps.pdf
- http://bitsavers.org/pdf/ibm/1410/C28-0351-5_1410_operGuide.pdf
- http://bitsavers.org/pdf/ibm/7010/A22-6726_7010_PrincOps.pdf
- http://bitsavers.org/pdf/ibm/1410/
- http://bitsavers.org/pdf/ibm/1410/diagnostics/
- http://www.bitsavers.org/pdf/ibm/1410/diagnostics/DIAGV100/
- http://www.bitsavers.org/pdf/ibm/1410/diagnostics/DIAGV100/CC01A_1410_Limited_CPU_Instruction_Test.pdf
- http://www.bitsavers.org/pdf/ibm/1410/diagnostics/DIAGV100/1410_7010_Introduction_to_Diagnostics.pdf
- http://www.bitsavers.org/pdf/ibm/1410/diagnostics/DIAGV100/listings.pdf
- http://www.bitsavers.org/pdf/ibm/1410/diagnostics/DIAGV200/
- http://www.bitsavers.org/pdf/ibm/1410/diagnostics/DIAGV201/
- http://www.bitsavers.org/pdf/ibm/1410/diagnostics/DIAGV202-K2/

**1401-side reference**
- https://ibm-1401.info/
- https://ibm-1401.info/Van1401-CodeChart.pdf
- https://ibm-1401.info/1401-CardDeckFormats.html
- https://ibm-1401.info/1401SoftwDevel.html
- https://ibm-1401.info/TricksForSimulation.html
- https://github.com/IBM-1401
- https://retrocomputingforum.com/t/ibm-1401-emulators/3143
- https://github.com/moshix/IBM1401
- https://www.pcjs.org/

**Peripheral / physical background (1401-specific, shared hardware)**
- https://www.righto.com/2015/08/examining-core-memory-module-inside.html
- https://www.righto.com/2021/02/an-ibm-1401-mainframe-computer-at.html
- https://www.righto.com/2019/01/accounting-machines-ibm-1403-and-why.html
- http://www.righto.com/2018/12/hammer-time-fixing-printer-on-vintage.html
- https://static.righto.com/ibm1401/printchain.html
- http://www.righto.com/search/label/ibm1401
