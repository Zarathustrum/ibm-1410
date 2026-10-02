# IBM 1410 research package

Primary-source research for an IBM 1410 emulator. Every non-trivial claim in these files
carries a source (IBM form number + page, or a URL) and a confidence tag. Read
[METHOD.md](METHOD.md) for how the package was produced and what provenance each tag
implies — this index does not repeat it.

## Confidence legend

| Tag | Meaning | How to use it |
|---|---|---|
| `[verified]` | Read in a primary source — an IBM manual page (form number + page) or emulator source code. | Treat as spec. Encode it. |
| `[likely]` | Consistent secondary sources, or a mechanism-based inference from verified text. No single primary sentence says it. | Fine for design. Confirm before encoding as CPU behavior. |
| `[observed]` | Established by running this emulator, not read in a primary source. Ranks **below** `[likely]`: it is evidence about our own code first and about the 1410 only second. | A primary-source read outranks it, always. Never let it confirm the behaviour it was produced by. |
| `[unverified]` | Memory, a single weak source, or an OCR-mangled figure. | Do not encode. Every one is listed in [open-questions.md](open-questions.md) with a fallback. |

## The files

| File | Contains | Read it when |
|---|---|---|
| [architecture.md](architecture.md) | Storage models and reserved low core; the 8-bit character (BA8421 + WM + odd-parity C); word marks; 5-character addressing and the zone-bit index tags; the 15 index registers at 00025–00099; the full register file (IAR/AAR/BAR/CAR/DAR/EAR/FAR/STAR); the eight legal instruction lengths and the scan-to-next-word-mark length rule; chaining and the op-modifier blanking trap; the arithmetic/sign model; indicator set/reset rules; the Priority feature; 1401 compatibility mode. | First. Before writing the fetch/decode loop, the memory model, or anything that touches addresses or word marks. |
| [opcodes.md](opcodes.md) | The complete instruction set: merged master table (41 ops) with lengths, register effects, indicators and timing; the 64-entry Move/Scan d-character matrix; per-op arithmetic, Table Lookup, Compare, MCS; every modifier table (branch-on-indicator, I/O channel status, carriage control, x-control unit select); Move Characters and Edit in full including the registers-after rule the Principles of Operation omits; optional-feature and 1401/7010-only ops. | Writing the decoder, the execute step, or an assembler's op/length validity table. The largest and most operational file in the package. |
| [io.md](io.md) | Channels E/F and the 1414 synchronizer; I/O instruction formation (op + x1x2x3 + bbbbb + d) with the X-control encoding; move vs load mode and word-separator semantics; overlap; the per-channel interlock, the six status indicators and the R/X tests; 1402 reader/punch, 1403 printer and carriage control, 1415 console in full; 729/7330 tape and 1311 disk in brief. | Implementing any device, the channel model, or the card/print data path. |
| [charset.md](charset.md) | The 64-code chart in collating order with BCD bits, octal, C bit, Hollerith punches and A/H print columns; zone × digit structure; the collating sequence and Compare semantics; sign/zone conventions and the punched-sign-to-printed-letter table; word-separator and load-mode I/O rules; the 1403 A vs H chain dualing (exactly five code points); 1401-vs-1410 differences. | Building the character tables, the card reader/punch translation, the print path, or the collate order Compare depends on. |
| [software.md](software.md) | Autocoder source card layout, address arithmetic and indexing, literals, declaratives and word-mark placement, control/pseudo-ops, macros; both object-deck formats (absolute condensed card and OS relocatable); the loader evidence and the 00281 re-entry point; the hand-keyed console bootstrap; OS/batch context; language availability including the RPG answer; 1401 compatibility from the software side. | Writing the assembler, the object-deck loader, or the IPL path. Also the authority on what software can actually run on a given configuration. |
| [emulators.md](emulators.md) | Survey of every runnable 1410/1401 emulator (SimH i7010, cube1us/1410, IBM1410FPGA), what each does and does not model, the diagnostic corpus, and a concrete validation-oracle workflow built on `cc01.cor` (IBM diagnostic CC01A, pre-assembled, console-only, halt address as verdict) plus `insttest.cor`/`ilentest.cor` against `note1410.txt`. | Setting up validation. Read before writing the first test, not after. |
| [console-and-physical.md](console-and-physical.md) | The 1415 console as a *printing log* (the 1410 shows no register contents in lights); stop print-out format; the MODE rotary and every control key; reset semantics; display/alter wraparound; the Selectric and its repurposed keys; 1403 and 1402 panels and physical numbers; card and green-bar geometry; Autocoder listing layout. | Building the operator console UI, the print-out formatter, or any visual rendering of the machine. |
| [avco-and-reentry.md](avco-and-reentry.md) | The showcase-program research: Avco AERL/RAD history, and — **amended 2026-09-04** — the `[testimony]` finding that an IBM 1410 *was* at Avco against a documentary record that does not list one, with the reasoning for why that silence is weak; the 1410 in its market context; the no-floating-point story and the fixed-point consequences; Allen–Eggers reentry equations with validation checkpoints; the 2-D point-mass ODE set with an RK4 sketch, scaling tables and a cost budget; the antilog-primitive design; period printout columns. | Designing the demo program. Also the best single source on 1410 arithmetic *cost* — the multiply/divide/table-lookup timings that shape any numeric code. |
| [rpg-sources.md](rpg-sources.md) | What survives of 1410 RPG and where: the four 1401/1410 shared spec-sheet forms (layout `[verified]` via N20-1410-27 + J24-0215-2, full column tables), the 1410 RPG processor object code on the PR-108 tape image with decode recipe and recovered messages, the `RG` control card and IOCS emission facts, searches already run for C28-1443. | Designing the RPG front end (Phase 5) — before writing a single spec-sheet parser column. |
| [open-questions.md](open-questions.md) | Every `[unverified]`/contradictory item from all eight files, grouped by file and ranked by what it blocks, each with the fallback to use until it is closed; plus the cross-file contradictions the completeness critic found. | Before implementing any subsystem — check what is still open in it. And whenever you hit behavior the research files disagree about. |
| [METHOD.md](METHOD.md) | Pipeline, models, run history, trust rules, re-verification procedure. | To judge how much to trust a claim, or to re-run the research. |

`raw/` holds the per-topic JSON this package was synthesized from: `find-<topic>.json`
(the researcher's findings), `verify-<topic>.json` (the adversarial fact-checker's
refutations, upgrades and additions), `find-gap-*`/`verify-gap-*` for the follow-up gap
research, and `compact-<topic>.json` (findings minus table bodies, the input to the
completeness critic). When a synthesized file and the raw JSON disagree, the synthesized
file wins — refutations were applied in place during synthesis — but the raw files are
where the reasoning and the rejected claims live.

## Primary sources

Bitsavers unless noted. These are the documents the `[verified]` tags point at.

### IBM 1410 — architecture and CPU

| Form | Title | URL |
|---|---|---|
| A22-0526-3 | 1410 Principles of Operation (the reference edition for this package) | http://bitsavers.org/pdf/ibm/1410/A22-0526-3_1410_princOps.pdf |
| A22-0526-2 | 1410 Principles of Operation (earlier edition) | http://bitsavers.org/pdf/ibm/1410/A22-0526-2_1410_PrincOps.pdf |
| A22-0526 | 1410 Principles of Operation (May 1963 printing, re-paginated) | http://bitsavers.org/pdf/ibm/1410/A22-0526_1410_princOpsMay63.pdf |
| A22-0530-1 | 1410 Priority Feature | http://bitsavers.org/pdf/ibm/1410/A22-0530-1_1410_priorityFea.pdf |
| A22-1407-2 | 1410 Reference (Nov 1961) | http://bitsavers.org/pdf/ibm/1410/A22-1407-2_1410ref_Nov61.pdf |
| 223-2589 | Instruction Reference: 1410 System Fundamentals (Nov 1963) | http://bitsavers.org/pdf/ibm/1410/223-2589_Instruction_Reference_1410_System_Fundamentals_Nov63.pdf |

### IBM 1410 — CE manuals (the deepest source on I/O and console)

| Form | Title | URL |
|---|---|---|
| 223-2588-2 | 1410 CE Handbook (Apr 1964) | http://bitsavers.org/pdf/ibm/1410/CE_Instruction_Reference_Maintenance/223-2588-2_1410_CE_Handbook_196404.pdf |
| S223-2698 | CE Instruction — 1411 Instructions and Special Features (1961) | http://bitsavers.org/pdf/ibm/1410/CE_Instruction_Reference_Maintenance/1411_CPU/S223-2698_CE_Instruction_1411_Instructions_and_Special_Features_1961.pdf |
| 223-2692 | CE Instruction — 1411 Input-Output Operations (1963) | http://bitsavers.org/pdf/ibm/1410/CE_Instruction_Reference_Maintenance/1411_CPU/223-2692_CE_Instruction_1411_Input-Output_Operations_1963.pdf |
| S223-2648 | CE Instruction — 1415 Console Model 1 | http://bitsavers.org/pdf/ibm/1410/CE_Instruction_Reference_Maintenance/1415_Console/S223-2648_CE_Instruction_1415_Console_Model1.pdf |

### IBM 1410 — software

| Form | Title | URL |
|---|---|---|
| C28-0309-1 | 1410 Autocoder (pre-OS, the assembler of record) | http://bitsavers.org/pdf/ibm/1410/C28-0309-1_1410_autocoder.pdf |
| C28-0326-2 | 1410 Operating System: Autocoder | http://bitsavers.org/pdf/ibm/1410/C28-0326-2_1410_OS_Autocoder.pdf |
| C28-0351-5 | 1410/7010 Operator's Guide | http://bitsavers.org/pdf/ibm/1410/C28-0351-5_1410_operGuide.pdf |
| C28-0319-4 | 1410 System Monitor | http://bitsavers.org/pdf/ibm/1410/C28-0319-4_1410_sysMonitor.pdf |
| C28-0318-3 | 1410 Basic Concepts | http://bitsavers.org/pdf/ibm/1410/C28-0318-3_1410_basicConcep.pdf |
| C28-0328-3 | 1410 FORTRAN | http://bitsavers.org/pdf/ibm/1410/C28-0328-3_1410_Fortran.pdf |
| J24-1468-1 | 1410 FORTRAN (specifications) | http://bitsavers.org/pdf/ibm/1410/J24-1468-1_1410fortran.pdf |
| J24-1433-2 | 1410 Autocoder Preliminary Specifications (1961) | http://bitsavers.org/pdf/ibm/1410/J24-1433-2_1410_Autocoder_Preliminary_Specifications_1961.pdf |
| J28-0249 | 1410 Utility Programs Part III (1962) | http://bitsavers.org/pdf/ibm/1410/J28-0249_1410_Utility_Programs_Part_III_1962.pdf |
| J28-0243 | 1410 OS Using Magnetic Tape and 1301 Disk Storage (1962) | http://bitsavers.org/pdf/ibm/1410/J28-0243_1410_Operating_System_Using_Magnetic_Tape_and_1301_Disk_Storage_1962.pdf |
| C20-1602-8 | 1410 Program Catalog (Jun 1968) | http://bitsavers.org/pdf/ibm/1410/C20-1602-8_1410_pgmCatJun68.pdf |

### Peripherals

| Form | Title | URL |
|---|---|---|
| A22-6704 | 1311 Disk Storage for 1410/7010 | http://bitsavers.org/pdf/ibm/1410/A22-6704_1311_Disk_for_1410_7010.pdf |
| A22-6788 | 1301/1302 Disk Storage with 1410/7010 | http://bitsavers.org/pdf/ibm/1410/A22-6788_1301_1302_Disk_with_1410_7010.pdf |
| A24-3070-1 | *filename says 1410 Disk Storage I/O Instructions — the content is 1401/1440/1460. Do not cite it for the 1410.* | http://bitsavers.org/pdf/ibm/1410/A24-3070-1_1410_Disk_Storage_IO_Instructions.pdf |
| GC22-6681-4 | 1410/7000 Series I/O Components Physical Planning | http://bitsavers.org/pdf/ibm/1410/GC22-6681-4_1410_7000_Series_IO_Components_Physical_Planning.pdf |
| GA24-3073 | 1403 Printer (via ibm-1401.info; Preferred Character Set train sequence) | https://ibm-1401.info/IBM-1403_Manual_A24-3073.pdf |
| 22-5526-4 | The Design of IBM Cards (Mar 1956) | http://bitsavers.org/pdf/ibm/punchedCard/Training/22-5526-4_The_Design_of_IBM_Cards_Mar56.pdf |

### Adjacent machines — for cross-checking only

| Form | Title | URL |
|---|---|---|
| A22-6726 | 7010 Principles of Operation (the 1410's superset; use to *separate* 7010-only features, never to add them) | http://bitsavers.org/pdf/ibm/1410/A22-6726_7010_PrincOps.pdf |
| A24-1403-5 | 1401 Reference (Apr 1962) — for 1401-compatibility mode and to identify 1401 contamination | https://bitsavers.org/pdf/ibm/1401/A24-1403-5_1401_Reference_Apr62.pdf |
| J24-0215-2 | 1401 Card/Tape RPG | https://bitsavers.org/pdf/ibm/1401/J24-0215-2_cardTapeRPG.pdf |
| C24-1464-2 | FARGO for the IBM 1401 (Jan 1963) | https://bitsavers.org/pdf/ibm/1401/C24-1464-2_FARGO_for_IBM_1401_Jan63.pdf |

### Diagnostics and bits

| Item | URL |
|---|---|
| CC01A — 1410 Limited CPU Instruction Test (the primary validation oracle's listing) | http://www.bitsavers.org/pdf/ibm/1410/diagnostics/DIAGV100/CC01A_1410_Limited_CPU_Instruction_Test.pdf |
| 1410/7010 Introduction to Diagnostics | http://www.bitsavers.org/pdf/ibm/1410/diagnostics/DIAGV100/1410_7010_Introduction_to_Diagnostics.pdf |
| Diagnostic master-tape record index | http://www.bitsavers.org/pdf/ibm/1410/diagnostics/DIAGV100/listings.pdf |
| Further diagnostic listings (C020B / C021B and others) | http://www.bitsavers.org/pdf/ibm/1410/diagnostics/DIAGV200/ · DIAGV201/ · DIAGV202-K2/ |
| 1410-PR-108 system tape image (the only 1410 bits on bitsavers) | http://bitsavers.org/bits/IBM/1410/1410-PR-108/ |
| Whole 1410 directory | http://bitsavers.org/pdf/ibm/1410/ |

### Code oracles (secondary, but machine-readable)

| Item | Note | URL |
|---|---|---|
| rcornwell/sims `I7000/` | SimH i7010. Emulates 1410 and 7010 on one code path — it cannot reject 7010-only behavior. | https://github.com/rcornwell/sims/tree/master/I7000 |
| cube1us/1410 | Jay Jaeger's Windows simulator; `Core/cc01.cor` is the pre-assembled CC01A diagnostic and `note1410.txt` carries cycle-level expected latch states. | https://github.com/cube1us/1410 |
| cube1us/IBM1410FPGA | VHDL implementation from the ALDs. License unclear — read for understanding, do not copy. | https://github.com/cube1us/IBM1410FPGA |
| Van Snyder's 1401 code chart | Third-party confirmation of the 64-code bit/punch layout. Its op-code footnote ("the 1410 does not interpret `# H P Q Y` or `1-9` as op codes") is 1401-centric and partly wrong for the 1410 — `2` and `4` are the channel-2 Carriage Control and Select Stacker and Feed ops, and `Y` is the Priority Test and Branch op with the Priority feature installed. Do not treat that footnote as authority; see [charset.md](charset.md) §8.4. | https://ibm-1401.info/Van1401-CodeChart.pdf |
