# BUILD-LOG-5 — Phase 5, RPG

**STATUS:** BUILD COMPLETE — Tom approved the seven plan defaults; waves 0 through 6 and the
whole-branch review are complete on `feature/phase-5-rpg`; the branch is awaiting merge.

## Arrival — c80c668 (the plan, on feature/phase-5-rpg)

The plan is `docs/plans/phase-5-rpg.md` (3,170 lines, corrected by Wave 0; sixteen sections mirroring
`phase-3-autocoder.md`). It arrived through a design panel and four review rounds, all Opus workers
under the model policy, the main session integrating and ruling.

**Design panel** (`wf_9c3935b5-c79`) — three architects proposed independently from distinct angles
(sheet-first, cycle-first, report-first); three judges scored them on period fidelity, buildability
and testability. **cycle-first won 484 / 422 / 411**, on the argument that the generated Autocoder is
the risky half; the fidelity judge checked its emitted code against the shipped ISA line by line.
Grafted from the losers: sheet-first's `columns.ts` as the single place a column number is written
and its bounded two-attempt primary read as wave 0; report-first's two-producer golden discipline and
provenance-tagged diagnostics. The panel's synthesis agent died on an API error; the dossier was
recovered from `journal.jsonl` and the plan written from it (`wf_1be82733-257`).

**Review** — round 1: two skeptics, 4 blockers / 11 majors, needs-revision. Round 2: revision, then
three verifiers — every round-1 item closed, 5 new blockers / 16 majors found. Round 3: consolidated
fix, then re-verify — every round-2 item verified closed, 2 new blockers (one issue, two lenses
independently) / 17 majors found. Round 4 (`wf_07dcae8d-c3f`): fix and closure check — **verdict
`ready-with-notes`, gate-ready, zero blockers**; three residual majors applied directly by the main
session, per the Phase 3 precedent.

What the review caught, in order: a section claiming real assembler output for a target program that
did not exist; the demo's seven Calculation cards punched nine columns right of the layout the plan
itself specifies; a choke-point lint that would fire on the generator's own indicator label; a claim
that `?` prints `?` on chain A when it prints `&`; the PR-108 processor-message block miscounted at
eleven when it then held thirteen (the sequence-message correction below makes it fourteen), wired
into an exit criterion; and a frozen memory map whose print area sat 22
positions inside the card input area with `ok`, `flagged` and `warnings` all green — because `DA` and
`DS` emit nothing, so no assembler gate can see an overlap. That last one is why
`RESERVED_AREAS_ARE_PAIRWISE_DISJOINT_AND_THE_PRINT_AREA_CLEARS_THE_CARD_IMAGE` exists as a named
invariant with a wave-2 test over the `Layout` value.

## The target draft

`docs/plans/phase-5-target-draft.asm` — 270 source cards, the whole RPG logic cycle hand-written in
open-coded Autocoder. It is **plan evidence, not a build artifact**: wave 1 writes the committed
`demos/sales-summary.asm`, and this draft is what §10.4's listing columns were pasted from. First
assembled 2026-08-31; the transcript below is refreshed after Wave 5's numeric-`N` re-cut with
`node build/tools/asm.js docs/plans/phase-5-target-draft.asm --listing`:

```text
01010AUTOCODER RUN
01020          JOB  SALES SUMMARY BY DISTRICT
01030          CTL   1
01040*  MONTHLY SALES SUMMARY BY DISTRICT -- THE PHASE 5 TARGET.
01050*  HAND-WRITTEN. THE GENERATOR MUST REPRODUCE THIS MACHINE.
01060*  10K, ONE CHANNEL, A 1402 AND A 1403 MODEL 2, CHAIN A.
01070          LOAD
01080          ORG  00500
01090* -- 0. CONSTANTS AND WORK AREAS ----------------------------------
01100ONE       DCW  @1@                INDICATOR ON
01110ZERO      DCW  @0@                INDICATOR OFF
01120FIVE      DCW  @5@                HALF ADJUST
01130K001      DCW  @1@                PAGE INCREMENT
01140K002      DCW  @00005@            A CALCULATION LITERAL
01150IZERO     DCW  @0000000@          CLEARS THE INDICATOR FILE
01160ZEROS     DCW  @00000000000000@   MLCB RESET SOURCE, 14
01170DTOT      DCW  @0000000000@
01180DCOM      DCW  @0000000000@
01190RTOT      DCW  @0000000000@
01200RCOM      DCW  @0000000000@
01210GTOT      DCW  @000000000000@
01220GCOM      DCW  @000000000000@
01230PAGENO    DCW  @000@              THE ONE MANDATED NAME
01240DEPT      DCW  #3                 ALPHAMERIC -- SEC 8.2
01250PART      DCW  #8                 ALPHAMERIC -- SEC 8.2
01260QTY       DCW  @00000@
01270AMT       DCW  @00000000@
01280COMM      DCW  @00000000000000@   5 PLUS 8 PLUS 1, ROW 014
01290CN1       DCW  @000@              CONTROL FIELD 1 THIS CARD
01300CN2       DCW  @00@               CONTROL FIELD 2 THIS CARD
01310CO1       DCW  @000@              CONTROL FIELD 1 PREV CARD
01320CO2       DCW  @00@               CONTROL FIELD 2 PREV CARD
01330WORD01    DCW  @   ,   .  @       10 OVER 8
01340WORD02    DCW  @  ,   ,   .  @    13 OVER 10
01350WORD03    DCW  @    ,   ,   .  @  15 OVER 12
01360K010      DCW  @DEPT TOTAL@
01370K020      DCW  @DISTRICT TOTAL@
01380K030      DCW  @GRAND TOTAL@
01390K040      DCW  @MONTHLY SALES SUMMARY@
01400K041      DCW  @BY DISTRICT@
01410K050      DCW  @PAGE@
01420K060      DCW  @DEPT@
01430K061      DCW  @PART@
01440K062      DCW  @QTY@
01450K063      DCW  @AMOUNT@
01460K064      DCW  @COMMISSION@
01470K080      DCW  @*@
01480K081      DCW  @**@
01490K082      DCW  @***@
01500K090      DCW  @RECORD TYPE NOT FOUND@
01510* -- 1. INITIALISE ------------------------------------------------
01520START     MLCA IZERO,PRIME        ALL INDICATORS OFF
01530          SW   PLGM               THE GM-WM THAT ENDS W1
01540          MLCS ONE,FSTPG          1P ON -- FIRST PAGE
01550* -- 2. READ ------------------------------------------------------
01560RDCARD    R1   0,CDIN             MOVE MODE, BAKED D
01570          BEF1 LASTCD
01580          BA1  *+1                RELEASE THE INTERLOCK
01590* -- 3. IDENTIFY THE RECORD TYPE ----------------------------------
01600IDENT     BCE  Z010,C001,S        INPUT COLS 6-11
01610          B    NOTFND
01620Z010      MLCS ONE,RC01           RESULTING CONDITION 01
01630* -- 4. NO SEQUENCE CHECK. THE DEMO CARRIES NO SCF LINE -- SEC 15.
01640* -- 5. EXTRACT THE CONTROL AND DATA FIELDS -----------------------
01650EXTRCT    MLC  C003,CN2           CONTROL FIELD 2 -- MAJOR
01660          MLC  C006,CN1           CONTROL FIELD 1 -- MINOR
01670          MLC  C006,DEPT          DATA SHEET FIELD SOURCES
01680          MLC  C014,PART
01690          ZA   C019,QTY            NUMERIC SOURCE -- STRIP ZONES
01700          ZA   C027,AMT
01710* -- 6. CONTROL BREAK -- COMPARE MAJOR FIRST ----------------------
01720CTLBRK    BCE  Z020,PRIME,1       NOT THE FIRST RECORD
01730          MLCS ONE,PRIME          FIRST RECORD -- NO BREAK
01740          MLC  CN2,CO2
01750          MLC  CN1,CO1
01760          B    DTLCAL             STRAIGHT TO DETAIL TIME
01770Z020      C    CO2,CN2            COMPARE THE MAJOR FIRST
01780          BU   Z030
01790          C    CO1,CN1
01800          BU   Z031
01810          B    DTLCAL             NOTHING BROKE
01820Z030      MLCS ONE,F2             A BREAK AT LEVEL 2 ...
01830Z031      MLCS ONE,F1             ... BREAKS EVERY MINOR
01840* -- 7. TOTAL TIME CALCULATIONS -----------------------------------
01850TOTCAL    BCE  Z036,F1,0
01860          A    DTOT,RTOT          CALC COL 49 IS T, COND F1
01870          A    DCOM,RCOM
01880Z036      BCE  Z037,F2,0
01890          A    RTOT,GTOT          CALC COL 49 IS T, COND F2
01900          A    RCOM,GCOM
01910Z037      B    TOTOUT
01920* -- 8. TOTAL OUTPUT, ASCENDING BY LEVEL --------------------------
01930TOTOUT    BCE  Z042,F1,0          T11 -- DEPT TOTAL, LVL 1
01940          CS   PLINE+131
01950          CS   PLINE+99
01960          MLCA K010,PLINE+14      FIELD END 015
01970          MLCWA WORD02,PLINE+41   EDIT WORD AND ITS WM
01980          MCE  DTOT,PLINE+41      FIELD END 042
01990          MLCWA WORD02,PLINE+56
02010          MCE  DCOM,PLINE+56      FIELD END 057
02020          MLCA K080,PLINE+59      THE TOTAL MARK
02030          W1   PLINE
02040          BA1  *+1
02050          BCV1 Z038               LATCH OF BEFORE MOTION
02060          B    Z039
02070Z038      MLCS ONE,OF
02080Z039      CC1  S                  SPACE 2 AFTER PRINT
02090          BA1  *+1
02100          MLCB ZEROS,DTOT         FORMAT COL 1 IS B
02110          MLCB ZEROS,DCOM
02120Z042      BCE  Z052,F2,0          T21 -- DISTRICT TOTAL, 2
02130          CS   PLINE+131
02140          CS   PLINE+99
02150          MLCA K020,PLINE+14      FIELD END 015
02160          MLCWA WORD02,PLINE+41   EDIT WORD AND ITS WM
02170          MCE  RTOT,PLINE+41      FIELD END 042
02180          MLCWA WORD02,PLINE+56
02190          MCE  RCOM,PLINE+56      FIELD END 057
02200          MLCA K081,PLINE+60      THE TOTAL MARK
02210          W1   PLINE
02220          BA1  *+1
02230          BCV1 Z043               LATCH OF BEFORE MOTION
02240          B    Z044
02250Z043      MLCS ONE,OF
02260Z044      CC1  S                  SPACE 2 AFTER PRINT
02270          BA1  *+1
02280          MLCB ZEROS,RTOT         FORMAT COL 1 IS B
02290          MLCB ZEROS,RCOM
02300Z052      BCE  LVLRST,LC,0        T31 -- GRAND TOTAL, LC
02310          CS   PLINE+131
02320          CS   PLINE+99
02330          MLCA K030,PLINE+14      FIELD END 015
02340          MLCWA WORD03,PLINE+41   EDIT WORD AND ITS WM
02350          MCE  GTOT,PLINE+41      FIELD END 042
02360          MLCWA WORD03,PLINE+56
02370          MCE  GCOM,PLINE+56      FIELD END 057
02380          MLCA K082,PLINE+61      THE TOTAL MARK
02390          W1   PLINE
02400          BA1  *+1
02410          BCV1 Z053               LATCH OF BEFORE MOTION
02420          B    Z054
02430Z053      MLCS ONE,OF
02440Z054      CC1  S                  SPACE 2 AFTER PRINT
02450          BA1  *+1
02460          MLCB ZEROS,GTOT         FORMAT COL 1 IS B
02470          MLCB ZEROS,GCOM
02480* -- 9. LEVEL RESET AND CONTROL FIELD ROLL FORWARD ----------------
02490LVLRST    MLC  CN2,CO2
02500          MLC  CN1,CO1
02510          MLCS ZERO,F1
02520          MLCS ZERO,F2
02530          BCE  EOJ,LC,1           LAST CARD -- NO DETAIL
02540* -- 10. DETAIL TIME CALCULATIONS ---------------------------------
02550DTLCAL    ZA   AMT,COMM-6         MULTIPLIER IMAGE, HIGH
02560          M    K002,COMM          AUTOCODER M IS MACHINE @
02570          A    FIVE,COMM-1        HALF ADJUST AT POSN 02
02580          A    AMT,DTOT           CALC COL 49 IS D
02590          A    COMM-2,DCOM        POSITION ADJUST 02
02600* -- 11. HEADING OUTPUT. HA ON 1P, HB ON OF -- SEC 6.4 P.38 -------
02610HDGOUT    BCE  Z062,FSTPG,0       HA1 AND HA2 -- FIRST PAGE
02620          CS   PLINE+131
02630          CS   PLINE+99
02640          A    K001,PAGENO        ADVANCE THE PAGE NUMBER
02650          MLCA K040,PLINE+20      FIELD END 021
02660          MLCA K041,PLINE+32      FIELD END 033
02670          MLCA K050,PLINE+62      FIELD END 063
02680          MCS  PAGENO,PLINE+66    FIELD END 067, COL 47 Z
02690          CC1  1                  SKIP BEFORE TO CHANNEL 1
02700          BA1  *+1
02710          W1   PLINE
02720          BA1  *+1
02730          CC1  /
02740          BA1  *+1
02750          CS   PLINE+131          NEXT LINE, COLUMN TITLES
02760          CS   PLINE+99
02770          MLCA K060,PLINE+3
02780          MLCA K061,PLINE+15
02790          MLCA K062,PLINE+25
02800          MLCA K063,PLINE+41
02810          MLCA K064,PLINE+56
02820          W1   PLINE
02830          BA1  *+1
02840          CC1  S                  SPACE 2 AFTER PRINT
02850          BA1  *+1
02860          MLCS ZERO,FSTPG
02870          B    DTLOUT
02880Z062      BCE  DTLOUT,OF,0        HB1 AND HB2 -- ON OF
02890          CS   PLINE+131
02900          CS   PLINE+99
02910          A    K001,PAGENO        ADVANCE THE PAGE NUMBER
02920          MLCA K040,PLINE+20      FIELD END 021
02930          MLCA K041,PLINE+32      FIELD END 033
02940          MLCA K050,PLINE+62      FIELD END 063
02950          MCS  PAGENO,PLINE+66    FIELD END 067, COL 47 Z
02960          CC1  1                  SKIP BEFORE TO CHANNEL 1
02970          BA1  *+1
02980          W1   PLINE
02990          BA1  *+1
03010          CC1  /
03020          BA1  *+1
03030          CS   PLINE+131          NEXT LINE, COLUMN TITLES
03040          CS   PLINE+99
03050          MLCA K060,PLINE+3
03060          MLCA K061,PLINE+15
03070          MLCA K062,PLINE+25
03080          MLCA K063,PLINE+41
03090          MLCA K064,PLINE+56
03100          W1   PLINE
03110          BA1  *+1
03120          CC1  S                  SPACE 2 AFTER PRINT
03130          BA1  *+1
03140          MLCS ZERO,OF
03150* -- 12. DETAIL OUTPUT --------------------------------------------
03160DTLOUT    CS   PLINE+131
03170          CS   PLINE+99
03180          MLCA DEPT,PLINE+3       DEPT, FIELD END 004
03190          MLCA PART,PLINE+15      PART, FIELD END 016
03200          MCS  QTY,PLINE+25       QTY, FIELD END 026
03210          MLCWA WORD01,PLINE+41
03220          MCE  AMT,PLINE+41       AMT, FIELD END 042
03230          MLCWA WORD03,PLINE+56
03240          MCE  COMM-2,PLINE+56    COMM, FIELD END 057
03250          W1   PLINE
03260          BA1  *+1
03270          BCV1 Z080               LATCH OF BEFORE MOTION
03280          B    Z081
03290Z080      MLCS ONE,OF
03300Z081      CC1  /                  SPACE 1 AFTER PRINT
03310          BA1  *+1
03320          MLCB ZEROS,COMM         FORMAT COL 1 IS B
03330          MLCS ZERO,RC01
03340          B    RDCARD
03350* -- 13. LAST CARD AND THE NOT-FOUND PATH -------------------------
03360LASTCD    MLCS ONE,LC
03370          MLCS ONE,F1
03380          MLCS ONE,F2
03390          B    TOTCAL             THE FINAL TOTAL CYCLE
03400NOTFND    CS   PLINE+131          RECOVERED RUNTIME MESSAGE
03410          CS   PLINE+99
03420          MLCA K090,PLINE+20
03430          W1   PLINE
03440          BA1  *+1
03450          CC1  /
03460          BA1  *+1
03470          B    RDCARD
03480* -- 14. END OF JOB -----------------------------------------------
03490EOJ       CC1  1                  EJECT THE LAST PAGE
03500          BA1  *+1
03510          H
03520* -- 15. RESERVED AREAS, ABOVE THE CODE -- SEC 8.1 ----------------
03530          ORG  *+1                THE SLACK THE GM-WM HITS
03540IND       DA   1X7                THE INDICATOR FILE
03550RC01           1
03560F1             2
03570F2             3
03580OF             4
03590LC             5
03600FSTPG          6
03610PRIME          7
03620CDIN      DA   1X80               THE 1402 CARD IMAGE
03630C001           1
03640C003           3
03650C006           6
03660C014           14
03670C019           19
03680C027           27
03690          ORG  02700              HUNDREDS BOUNDARY FOR CS
03700 PLINE    DS   132
03710PLGM      DC   @⧧@                MARKED AT RUN TIME BY SW
03720          END  START
```

```
ok true · flagged 0 · warnings 0 · 270 source cards · 39 condensed records · entry START 00808
code -> 02531 · slack 02532 · IND 02533 · CDIN 02540-02619 · NOTFND 02465
PLINE 02700-02831 · PLGM 02832 · GM-WM 02833 · core-size code 1
9 W1 PLINE · 4 BCV1 · 0 glyph rejects over all 270 cards
```

Section labels after Wave 5's numeric-`N` re-cut, strictly ascending: `ONE` 00500 · `START` 00808 ·
`RDCARD` 00838 · `IDENT` 00862 · `EXTRCT` 00893 · `CTLBRK` 00963 · `TOTCAL` 01085 ·
`TOTOUT` 01160 · `LVLRST` 01670 · `DTLCAL` 01730 · `HDGOUT` 01785 · `DTLOUT` 02246 ·
`LASTCD` 02422 · `EOJ` 02522 · `IND` 02533.

## Open, carried into the build

- `EXPLICIT_D_ON_A_UNIT_RECORD_STATEMENT_IS_OURS` `[unverified]` — Phase 3.1's one exception; see
  `DECISIONS.md` 2026-08-31. Not a Phase 5 question, but Phase 5's generated reads inherit it.
- Two `§8.2` emission rows the closure check asked for and the main session did not add: a plain
  `F`/`B` field entry carrying neither `Z` nor an edit word (the shape `DEPT` and `PART` use), and a
  `PAG` field source's runtime behaviour (the target emits `A K001,PAGENO` at the top of *each*
  heading block). Both are visible in §10.4's target; wave 5 must generalise from it rather than
  transcribe it.

## Wave 0 — bounded primary read — commit 3fd06fb

**Read and recorded.** No code changed. The branch began clean at `c80c668`; `main` and
`origin/main` were at `5e26954`. The Phase 5 plan was read in full. A raw `wc -l` reports 3,170
lines, correcting the 3,168 count in `## Arrival`; the section count and all plan decisions are
unchanged.

Two bounded source reads were completed on 2026-09-01:

- IBM **1401** J24-0215-2 pp.10-44, rendered at 200 dpi and visually inspected. PDF SHA-256:
  `46907c8953f3ceaa889b0d31b4044e76aaee1376185267bd1d075420c1c9360d`.
- IBM **1410** PR-108 `jpr108-2024.bcd`, bytes 501,525-539,427, decoded through the repository's
  BCD table. Tape-image SHA-256:
  `f4926ec7104c1cb969c0968f4a5331ec4791d49b172a0c73f904b9e4223c6668`.

The full evidence and page/offset citations are appended as `rpg-sources.md` §10. The 1401 manual
settled `F1`-`F6`, total-before-detail time, the first-column `N` in every three-column condition
group, numeric hierarchy versus alphabetic independence, overflow-heading classification, and the
one-use/reusable edit-word forms. The result is split explicitly between verified 1401/shared-form
facts and likely 1410 runtime carry-over. The exact relative order of detail calculation and heading
formation remains unverified; the existing `HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION` default and
fallback are frozen.

The 1410 tape slice confirmed IOCS `DTF`/`OPEN`/`GET`/`PUT`/`CLOSE`, `SBR` linkage, the two generated
messages in this range, and one-character `LC`/`OF` cells. It reaffirmed that Phase 5's open-coded,
macro-free generator is a named construction rather than period source output. It did not establish
the sheet-level or cycle-order questions the 1401 manual was used to bound.

The plan §15 ruling-name set is now frozen for the rest of Phase 5. No ruling, default, or fallback
was added or changed. A later wave that needs one must stop and escalate.

**Review (lower-tier, adversarial): APPROVE — no findings.** The reviewer independently checked the
append-only diff, all five wave-0 targets, the 1401/1410 confidence split, the named page and byte
citations, both artifact hashes and sizes, the corrected plan line count, and the frozen §15 set.

**Preflight gates (feature branch before the read, all green):**

```
npm run typecheck                                          clean
npm test                                                   71 files, 1494 passed, 0 failed
npm run smoke                                              4 files, 39 passed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing \
  --golden test/golden/hello-dad.lst                       PASS, 2251 bytes
```

## Wave 1 — hand-written target — commit 086313c

### Frozen print-position map — map commit 6a21291

This map is the report design, copied from plan §10.2 and committed **before** either the target's
data deck or `test/golden/sales-summary.page.txt` exists. The page golden must be authored from this
map, not transcribed from a run.

1403 Model 2, 132 print positions, chain A, 66-line `DEFAULT_CARRIAGE_TAPE` (channel 1 at line 1,
channel 12 at line 60):

| Line | Print positions | Content | Width | Placement |
|---|---|---|---:|---|
| `HA1` heading | 001-021 | `MONTHLY SALES SUMMARY` | 21 | `K` constant, `MLCA` |
| | 023-033 | `BY DISTRICT` | 11 | `K` constant, `MLCA` |
| | 060-063 | `PAGE` | 4 | `K` constant, `MLCA` |
| | 065-067 | `PAGENO` | 3 | `MCS` zero-suppress |
| `HA2`, `HA1` Next Line | 001-004 | `DEPT` | 4 | `K` constant |
| | 013-016 | `PART` | 4 | `K` constant |
| | 024-026 | `QTY` | 3 | `K` constant |
| | 037-042 | `AMOUNT` | 6 | `K` constant |
| | 048-057 | `COMMISSION` | 10 | `K` constant |
| `HB1` overflow heading, on `OF` | - | identical to `HA1`, position for position | - | independent alphabetic-level line, not an or-group |
| `HB2`, `HB1` Next Line | - | identical to `HA2` | - | same |
| `D11` detail | 002-004 | `DEPT` | 3 | `MLCA` |
| | 009-016 | `PART` | 8 | `MLCA` |
| | 022-026 | `QTY` | 5 | `MCS` zero-suppress |
| | 033-042 | `AMT` | 10 | `MLCWA` + `MCE`, `WORD01` |
| | 043-057 | position-adjusted `COMM` | 15 | `MLCWA` + `MCE`, `WORD03`, then `B` blank-after |
| `T11` total, level 1, on `F1` | 006-015 | `DEPT TOTAL` | 10 | `K` constant |
| | 030-042 | `DTOT` | 13 | `MLCWA` + `MCE`, `WORD02`, then `B` |
| | 045-057 | `DCOM` | 13 | `MLCWA` + `MCE`, `WORD02`, then `B` |
| | 060 | `*` | 1 | `K080`; Field End 060 -> `PLINE+59` |
| `T21` total, level 2, on `F2` | 002-015 | `DISTRICT TOTAL` | 14 | `K` constant |
| | 030-042 | `RTOT` | 13 | `MLCWA` + `MCE`, `WORD02`, then `B` |
| | 045-057 | `RCOM` | 13 | `MLCWA` + `MCE`, `WORD02`, then `B` |
| | 060-061 | `**` | 2 | `K081`; Field End 061 -> `PLINE+60` |
| `T31` total, level 3, on `LC` | 005-015 | `GRAND TOTAL` | 11 | `K` constant |
| | 028-042 | `GTOT` | 15 | `MLCWA` + `MCE`, `WORD03`, then `B` |
| | 043-057 | `GCOM` | 15 | `MLCWA` + `MCE`, `WORD03`, then `B` |
| | 060-062 | `***` | 3 | `K082`; Field End 062 -> `PLINE+61` |

The line identifiers are exactly `HA1`, `HA2`, `HB1`, `HB2`, `D11`, `T11`, `T21`, and `T31`.
The edit words are fixed by their MCE body widths: `WORD01` is 10 characters over 8 digit
positions, `WORD02` is 13 over 10, and `WORD03` is 15 over 12. The detail commission presents the
12-position A field ending at `COMM-2`, so it uses `WORD03`; `WORD01` would truncate it.

**Map-commit gates (fixed tree, all green):**

```
npm run typecheck                                          clean
npm test                                                   71 files, 1494 passed, 0 failed
npm run smoke                                              4 files, 39 passed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing \
  --golden test/golden/hello-dad.lst                       PASS, 2251 bytes
```

### Target, reconstructed input, and frozen page

`demos/sales-summary.asm` is the Wave-1 hand-written target. At the Wave-1 implementation commit it
was materialised only after the map commit above and was byte-identical to
`docs/plans/phase-5-target-draft.asm`; the draft was the reviewed human-authored exhibit, not output
from an RPG generator. Later K/Z source-label re-cuts deliberately leave that draft label-sparse,
and Wave 5's numeric-`N` re-cut changes the two operations in both files. Their current identity is
the assembled object deck, not source bytes; the Wave-3 and Wave-5 sections record both proofs. No
`src/rpg/**` existed in Wave 1.

The reconstructed input deck has 52 cards. Columns 1-27 are the program's record layout; every
card carries ` RECONSTRUCTED SAMPLE` in otherwise-unused columns 28-48, so the provenance label is
on the physical card rather than in a comment syntax the 1402 deck format does not have. The deck
was designed without running the target:

- records 1-20: district `01`, department `AAA`;
- records 21-30: district `01`, department `AAB`, forcing the first minor break;
- records 31-52: district `02`, department `BAA`, forcing the first major break;
- every record is quantity 1, amount 100 cents, and therefore commission 5 cents;
- the two earlier break groups add six carriage positions, so detail 51 lands on form line 60,
  channel 12; detail 52 then forces the independent `HB1`/`HB2` overflow heading and `PAGE   2`.

The hand totals are `AAA` 20.00 / 1.00, `AAB` 10.00 / 0.50, district 01 30.00 / 1.50,
`BAA` and district 02 22.00 / 1.10, and grand total 52.00 / 2.60. The frozen page was authored
from the committed map and those figures **before the first machine run**. That first run halted
and matched it byte for byte; the golden was not edited afterward.

#### Plan conflict — constructed provenance cannot live in the raw page header

Plan §12.1, §15's `RPG_GOLDENS_ARE_CONSTRUCTED` row, and exit criterion 6 require each RPG page
golden's own header to say it is constructed and name this map section. Exit criterion 5 also
requires the file to equal the unmodified `renderGreenBar(...)` result byte for byte. Those two
requirements cannot both hold: `renderGreenBar` owns the fixed header
`1403 Model 2 · chain A · 66-line form`, while the already-committed map fixes every report-header
position and carries no provenance line. Adding file metadata breaks the runtime oracle; printing
metadata breaks the map and target.

The 2026-09-01 build-session ruling waives only that impossible **location** requirement. The
byte-for-byte renderer oracle and precommitted map win. That waiver itself changed no target, data,
renderer, map or raw golden; no sidecar was added. The provenance remains grepable and executable as the used
`RPG_GOLDENS_ARE_CONSTRUCTED = true` assertion in `test/tier4-rpg-target.test.ts`, and this build-log
section names the map. The data cards separately carry `RECONSTRUCTED SAMPLE` in unused columns.
This is a documented plan conflict, not a new §15 machine ruling; wave 5 still adds the declaration
its own row assigns to `test/rpg-generate.test.ts`.

Artifact checksums and exact sizes at the Wave-1 implementation commit — historical evidence;
the later re-cut sections carry the current target source identity and bounds:

```
demos/sales-summary.asm
  11629 bytes · SHA-256 114fb5e2f0fe1c162027a9941a173d1002a5088fd036bb84446a2970090658a2
demos/sales-summary.data.cards
  2548 bytes · SHA-256 ad98e1bc107757867db9372096e92b6a7595c046a921443466aeb4129638a4a5
test/golden/sales-summary.page.txt
  3688 bytes · SHA-256 7855909223861f331fb4039f5724e206dfe7bb7bbcc983f66e8065bdd4c38ccb
```

At that Wave-1 commit, the assembled target retained every published bound: 270 source cards, 39 condensed records,
`ok: true`, zero flags, zero warnings, `START` 00808, code end 02533, slack/loader GM-WM 02534,
`IND` 02535, `CDIN` 02542-02621, `PLINE` 02700-02831, `PLGM` 02832, final loader GM-WM/high-water
02833, core-size code 1, nine `W1 PLINE` statements and four `BCV1` statements.

The Wave-1 oracles are independent at three levels:

- `test/tier4-rpg-target.test.ts` assembles the source, loads the 39 object records through the
  condensed loader and real 1402, runs the real 1411 over all 52 data cards, and compares
  `renderGreenBar` with the frozen two-form page. It also reads the indicator file directly from
  core at the halt: `LC=1`, `F1=0`, `F2=0`, `OF=0`, `PRIME=1`.
- `test/rpg-printarea.test.ts` captures all 132 positions immediately before the first execution
  of each of the eight report-format `W1` sites (`T11`, `T21`, `T31`, `HA1`, `HA2`, `HB1`, `HB2`,
  `D11`). It compares them with the hand-written map table and separately requires `PLGM` to hold
  a marked group mark. The runtime-message `W1` is the ninth source site and is outside the Format
  map by design.
- The append-only Phase-3 closed-loop case loads without an execute card and compares real-loader
  core with `applyToStorage` over one contiguous 00497-02836 window: all emitted extents, the
  reserved `IND`/`CDIN`/`PLINE` gap, both surviving marks, and a three-position margin. Its only
  extra bytes are the independently computed surviving GM-WMs at 02534 and 02833.

Focused verification was 98 tests across the print-area and closed-loop files, then the complete
43-test smoke set including the target. The first focused smoke run found two test-harness defects
only: thirteen `DA` subentry cards had been omitted from the listing-kind count, and a redundant
raw-paper assertion had not trimmed the 1403 buffer's trailing blanks. The page comparison itself
already passed. Both harness defects were corrected without changing the target, data, map, or
golden; the next run passed.

**Target-tree gates before adversarial review (all green):**

```
npm run typecheck                                          clean
npm test                                                   72 files, 1514 passed, 0 failed
npm run smoke                                              5 files, 43 passed, 0 failed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing \
  --golden test/golden/hello-dad.lst                       PASS, 2251 bytes
```

**Adversarial review (lower-tier): first verdict BLOCKER, re-review APPROVE.** The first pass found
that the appended closed-loop compared only emitted addresses plus the two expected GM-WMs. That
proved those cells but did not inspect 02535-02831, so a stray character or word mark in the
reserved indicator/card/print area could escape the one test §11.3 says must catch it. The case was
changed to scan every occupied cell across the contiguous window and margin described above. The
98 focused tests passed; re-review confirmed the original finding closed, found no new issue, and
returned APPROVE. The reviewer separately verified the draft/target byte comparison, artifact
hashes and sizes, assembly result, data schedule, scope boundary, and all six gates.

The same review confirmed the golden-header conflict was real under the literal plan and that the
documented build-session ruling is implemented narrowly: the raw artifacts did not move, and the
used provenance assertion is live. It is not carried as an open finding.

**Post-review gates (final Wave-1 tree, all green):**

```
npm run typecheck                                          clean
npm test                                                   72 files, 1514 passed, 0 failed
npm run smoke                                              5 files, 44 passed, 0 failed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing \
  --golden test/golden/hello-dad.lst                       PASS, 2251 bytes
```

## Wave 2 — cards, layout, and the I/O choke point — commit 9b8ae97

Wave 2 added the DOM-free generator substrate and no parser, generator composer, UI, demo, or
runtime dependency: `types.ts`, `card.ts`, `layout.ts`, `emitio.ts`, the hand-built shared model,
and the four named test files. The card oracle holds all 270 hand-written target statements and
re-emits `demos/sales-summary.asm` exactly as `readSource` sees it, including the source-card
`+`-to-stored-card `&` boundary. Every card is exactly 80 encodable glyphs and round-trips through
`cardFields`.

The J24-0215-2 p.39 transcription is frozen in the shared fixture without duplicate Format cards:
35 non-W fields, eight F/B entries whose existing `literal` carries `WORD01`/`WORD02`/`WORD03`,
and three W definitions. HA1/HB1 each have four fields, HA2/HB2 five, D11 five, and T11/T21/T31
four each: 46 Format cards and 60 specification cards in all.

`measure` is checked statement by statement against the real assembler. At the Wave-2 commit,
before the later numeric-`N` re-cut, the target's measured code length let `layoutOf` independently
reproduce `IND` 02535, `CDIN` 02542, `PLINE` 02700, `PLGM` 02832, high-water 02833 and core-size
code 1. Re-cut 3's current bounds are recorded in the Wave-5 section below. The layout-value
invariant is exercised both on the target and across a hundreds boundary, and the fixed-point
check holds. Eleven §15 defaults first
depended on here are exported with their `OPEN:` comments and appended, with dated rows, to
`docs/research/open-questions.md`; no new ruling was added to the frozen set.

The I/O choke point emits source-form `BA1 *+1`; `readBlockStmts` composes the frozen
`R1 -> BEF1 -> BA1` order through the settled helpers. Its request and carriage-motion types make
reader/printer direction, stacker pocket, space count and skip channel invalid states
unrepresentable. The overflow latch is `BCV1 *&8`: under the verified last-character asterisk rule,
BCV1's `*` is at A+6 and the adjustment reaches the third statement at A+14, after the intervening
seven-position B. An AST gate enumerates every explicit `throw` under `src/rpg/**`; the complete set
is the two plan-authorised `RpgBug` sites, missing named model storage and unknown I/O unit.

**Plan staging deviation — self-activating §8.3 check 3.** Wave 2 owns
`test/rpg-emitio.test.ts`, and the plan forbids a later edit to that test, but the check's producer
`src/rpg/generate.ts` does not exist until wave 5. The approved test uses a named `skipIf` keyed
only on that file's absence and a non-literal dynamic import so wave 2 typechecks. Once
`generate.ts` exists, the test must run; a missing demo or probe deck then fails instead of
preserving the skip. The final Wave-2 `npm test` has exactly two named staging skips: this wave-5
producer and the future `src/ui/rpg/session.ts` path owned by wave 6.

**Adversarial review (lower-tier): first verdict findings, re-review APPROVE.** The first pass found
five concrete defects: reader status could be placed after the release, the shared release used
stored-card `&` rather than source `+`, carriage counts were not type-bounded, the DOM-free path
check accepted same-prefix sibling directories, and the new ledger table header drifted from §16.
All five were fixed and pinned. Re-review confirmed the fixes, the two-throw contract and the
`*&8` overflow arithmetic. The independent main-session review then returned **APPROVE**, with no
findings or open questions.

**Post-review gates (final Wave-2 implementation tree, all green):**

```
npm run typecheck                                          clean
npm test                                                   76 files, 1538 passed, 2 skipped
npm run smoke                                              5 files, 44 passed, 0 failed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing \
  --golden test/golden/hello-dad.lst                       PASS, 2251 bytes
```

**Post-ledger Wave-2 review correction — commit d5d3d70.** After ledger commit `01e8829`, a final
source/stored-card consistency pass found that the verified overflow offset had been written in a
`Stmt` as stored-card `*&8`. The Wave-2 implementation is commit `9b8ae97` plus this correction:
`senseOverflowStmts` now emits source-form `*+8`, and its focused oracle proves `toCard` punches
`*&8`. The offset and target are unchanged. The same six gates and exact counts above passed on
the correction commit; lower-tier re-review returned **APPROVE** with no scope drift.

## Wave 1 review correction — commit 85bff99

A final §6.3/R6 audit found one redundant `expect(() => assemble(SOURCE)).not.toThrow()` in
`test/tier4-rpg-target.test.ts`. The plan expressly forbids that assertion form. The one assertion
was removed without changing the target, data, map, golden, or the test's substantive checks of
`ok`, flagged lines, warnings, source-card count, object-record count and entry address. All six
gates remained green: `npm test` 76 files / 1538 passed / 2 skipped; `npm run smoke` 5 files / 44
passed; CC01 1241 instructions at 00322; demo 348 bytes; listing 2251 bytes.

## Wave 3 — cycle driver and indicator file — commit 311f23e

Wave 3 added `indicators.ts` and `cycle.ts` and no sheet parser, generated RPG deck, corpus,
page golden, UI, or runtime dependency. The two-argument `driver(model, layout)` returns all
seventeen `CYCLE_ORDER` sections. Its ten owned sections reproduce the hand-written target over
exactly `{kind, label, indent, op, operands}`; the seven calc/output-owned sections remain empty.
The length measured from the sixteen non-area sections reaches the Wave-3 fixed point when fed
back through `layoutOf`. Indicator allocation, clearing and condition polarity match the Wave-1
symbols, and the Wave-2 layout map and Wave-3 emitter map are pinned over the complete valid
indicator vocabulary.

Four frozen §15 defaults first become production dependencies here. Their exported point-of-use
comments and dated rows were added together: `F1_TO_F6_ARE_THE_CONTROL_LEVEL_INDICATORS`,
`CONTROL_BREAK_AT_LEVEL_N_BREAKS_ALL_MINOR_LEVELS`,
`TOTAL_TIME_PRECEDES_DETAIL_TIME_ON_A_BREAK`, and
`HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION`. The Wave-0 primary read controls the confidence:
F1-F6 and total-before-detail are `[verified]` IBM 1401 meanings/order and `[likely]` 1410
processor behaviour; the control-break ladder stays `[likely]`; heading after detail calculation
stays `[unverified]`.

### Re-cut 1 — the sparse Knnn target labels contradicted the frozen allocator rule

Plan §8.4 requires one monotonic `Knnn` emission counter with distinct-text interning. The Wave-1
target instead assigned semantic sparse buckets (`K010`, `K020`, ... `K090`) even though no such
bucket rule exists and a general report can exceed a bucket. The target and shared model fixture
were mechanically renamed in deterministic constants-block order; `K001` and `K002` remain the
page increment and calculation literal, and the remaining distinct texts are now contiguous
`K003` through `K017`:

```
K010→K003  K020→K004  K030→K005  K040→K006  K041→K007
K050→K008  K060→K009  K061→K010  K062→K011  K063→K012
K064→K013  K080→K014  K081→K015  K082→K016  K090→K017
```

`docs/plans/phase-5-target-draft.asm` remains the label-sparse source oracle for these two re-cuts.
Wave 5's later numeric-`N` machine re-cut changes the same two operations in both sources. This is a
source-label correction, not a machine change: assembling that draft and the current demo yields
deep-equal 39-record object decks, entry 00808, emitted payload through 02832 and loader/layout
high-water 02833. The existing real
loader/1402/1411 target gate still prints the same frozen two-form page byte for byte.

### Re-cut 2 — the sparse Znnn target labels contradicted the running counter

The same conflict existed in cycle/branch labels. The target used semantic ranges and the first
implementation copied them, which both contradicted §8.4's running counter and allowed a valid
record with enough code tests to collide with the next range. Target and fixture were renamed by
first allocator request/appearance:

```
Z010→Z001  Z020→Z002  Z030→Z003  Z031→Z004  Z036→Z005  Z037→Z006
Z042→Z007  Z038→Z008  Z039→Z009  Z052→Z010  Z043→Z011  Z044→Z012
Z053→Z013  Z054→Z014  Z062→Z015  Z080→Z016  Z081→Z017
```

The same old-draft/current-demo object, entry and high-water comparison proves this second re-cut
is also source-only. The driver owns one allocator, uses semantic keys only for interning, and
publishes contiguous `Z001` onward. A two-record case whose first record has eight code tests
assembles without duplicate labels; real execution covers first-fail/second-match and no-match.

### Plan deviation — the Wave-5 in-order emitter seam had to land in Wave 3

The ownership table forbids Wave 5 from editing `cycle.ts`, but the plan's original two-argument
driver offered no way for Wave 5 to interleave its seven deferred sections in `CYCLE_ORDER`, share
the running Z allocator, or replace Wave 3's demo-only `extract` with every Data-sheet source
operation owned by `calc.ts`. `driver(model, layout, emitters = {})` is the minimal necessary
seam. Each optional callback receives the model, layout and same allocator at its exact cycle
position; `extract` overrides the move-only base emitter. The default two-argument call remains
the frozen Wave-3 oracle.

The seam also carries an explicit Wave-5 obligation rather than a fake Wave-3 implementation:
`detailOutput` must clear every record-type RC indicator exactly once on the common exit before
`RDCARD`. The target already clears `RC01` at the tail of `DTLOUT`; clearing in `IDENT` would alter
that program and the historical cycle. Wave-5 output tests must cover successive cards in a
multi-record model and pin that common-exit clear. Similarly, an empty record set and every failed
record test branch to deferred `NOTFND`; final generation accepts only validated models and Wave 5
supplies that section's runtime-message block.

### Derived comparator closure — no new §15 ruling

The plan lists Input-sheet `C`, `Z`, `D`, positive/NOT and multi-code AND but does not spell their
Autocoder lowering. Ordinary full-character `C` uses `[verified]` 1410 `BCE` (A22-0526-3 p.37).
Blank and comma cannot survive as an explicit free-form d-character, so they use the same exact
bit composition as the partial comparisons. `Z` tests BA zone masks and `D` tests 8421 masks with
full-form `BBE`, repeating the explicit `Cnnn` B-address because a miss leaves BAR at B-1
(A22-0526-3 pp.37-38; `opcodes.md` §2 W). Expected-one branches through a continuation before the
mismatch branch; expected-zero branches directly on a set bit; surviving every selected bit is
equality. This is our Boolean composition of verified machine primitives, not a claim about the
recovered IBM RPG processor's instruction sequence, so it adds no OPEN constant or ledger row.

The durable oracle assembles source cards through the real assembler and executes on the real
Machine across the complete 64-by-64 truth table for each of C, Z and D in both polarities. It
also covers an eight-code mixed AND, all 64 glyphs, blank/comma fallback, ordinary BCE including
`ƀ`, source-card round-trip, unique continuation labels, and exact RC results.

Focused pre-review verification is clean: `npm run typecheck`; then 7 files / 53 passed /
2 planned Wave-5/Wave-6 staging skips across cycle, indicators, card, layout, I/O, DOM-free and
the live target runtime/page gate.

**Adversarial review (lower-tier): one P2, fixed; re-review APPROVE.** The implementation review
found no P0/P1 issue and independently checked the ten owned/seven deferred sections, fixed point,
more-than-six-code allocator case, sequence routing, exhaustive comparator, source-only re-cuts,
two-throw contract and deferred Wave-5 RC clear. Its one finding was documentation provenance:
the Phase-5 open-question preamble still said every default was pinned in Wave-2 tests after this
wave appended four defaults pinned in Wave-3 tests. The preamble now says each is pinned in the
tests for the wave that first depends on it. Narrow re-review returned **APPROVE**, with no
remaining drift or open question.

**Post-review gates (Wave-3 implementation commit `311f23e`, all green):**

```
npm run typecheck                                          clean
npm test                                                   78 files, 1562 passed, 2 skipped
npm run smoke                                              5 files, 44 passed, 0 failed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing \
  --golden test/golden/hello-dad.lst                       PASS, 2251 bytes
```

## Pre-Wave 4 documentation correction — Phase 5 notes ledger

`PHASE-5-NOTES.md`, required phase-wide output by plan §13 criterion 14 and §16, had no
wave owner and was still absent after Wave 3. Before any Wave-4 code, this correction creates it
and backfills the exact fifteen `OPEN:` names already present under `src/rpg/**`: eleven first used
in Wave 2 and four first used in Wave 3, each matched to its existing Phase-5 open-question row and
fallback. It also records the seven deviations/refusals and three research/observation groups that
Waves 0-3 had already documented here. The Phase-5 carry-out section remains explicitly empty
while the phase is in progress.

The same correction updates this log's stale status from Wave 3 to Wave 4 and applies Wave 0's
already-recorded raw plan count of 3,170 to the Arrival paragraph. No plan, research source, code,
test, demo or golden changed.

## Wave 4 — sheets, deck scan, diagnostics, vocabulary and model — commit ed7f915

Wave 4 adds the shared X24 sheet column tables and raw parsers, the RG/card-deck state machine,
the recovered diagnostic vocabulary, `demos/sales-summary.rpg`, `demos/cycle-probe.rpg`, and the
cross-sheet model resolver. The sales-summary spec deck is 60 cards: `RG`, one Input, five Data,
seven Calculation, and forty-six Format cards across pages 06-07. `model(parse(...))` deep-equals
the Wave-2 hand-built model after recursively dropping `at`, so the deck identity is tested in
`test/rpg-demo-source.test.ts` and the semantics are tested in `test/rpg-model.test.ts`.

The Wave-4 wrong-column corpus contains fifteen one-column mutations, independently enumerated as
four Input, three Data, four Calculation and four Format cases. Every case produces exactly one
diagnostic naming the affected column and none throws.

The chosen malformed-deck enumeration is explicit rather than inferred from the resolver's whole
vocabulary. `test/rpg-model.test.ts` carries twenty list cases: undefined field; cross-sheet
condition collision; named `K`; bad `WORDxx`; field before line; first Format entry not `L`;
ascending numeric headings; Next Line mismatch; `SB`; stacker; position above 80; nonnumeric
position; blank Calculation time; unconditional total; reserved `EOJ`; duplicate `PAGENO`; digit
in a Data name; partial-`OF` alternatives; unresolved `Cxx`; undersized multiply. The six
deck/source cases are blank column 1, missing `RG`, present 1405, Format before Calculation, no
printed output, and a source line beyond column 80. The five cases §11.5 assigns to focused units
are `W` first, Next Line mismatch, a card from a closed section, malformed 1301, and nonblank `RG`
body. Next Line is literally present in both plan lists; Wave 4 keeps both the focused assertion and
the model-table case rather than silently dropping either clause. Review-added unit coverage also
pins duplicate/late `RG`, a valid 1301 card carrying page/card identity, mixed Input sequence
characters, undefined and forward numeric conditions, compare-result non-inheritance, the safe
Format-type fallback, and the diagnosed Data `M` refusal.

The vocabulary oracle derives statuses, operations, sources, conditions, format kinds and reserved
names from `rpg-sources.md` §6 in both directions. Its form-layout and PR-108 tape evidence remain
two independent axes. The deck API publishes `readSpecSource` → `scan` → `parseScanned` → `model`
for Wave 5 without reopening Wave-4 files.

Wave 4 first depends on seventeen named `OPEN:` constants. A bidirectional extraction over
`src/rpg/**`, `PHASE-5-NOTES.md` §1 and the dated Phase-5 rows in
`docs/research/open-questions.md` finds the same thirty-two phase-to-date names in all three places:
the fifteen from Waves 2-3 plus these seventeen, with no missing or extra row.

The first cycle-probe draft used `PAG` as a Calculation factor even though the Data sheet mandates
the field name `PAGENO`; Wave 4 corrected that one source referent before the probe had a golden or
generated object deck. This is not a frozen-artifact re-cut.

Precommit source review found and fixed five resolver/scan defects: a duplicate or late `RG`
silently replaced the first card; mixed alphabetic/numeric Input sequence pairs were accepted;
numeric conditions could name no earlier resulting condition or forward-reference a later
Calculation condition; a blank-result compare inherited the preceding result field; and an invalid
Format line type entered the runtime `Model` union after its diagnostic. A lower-tier audit also
found that a valid `1301` card with page/card identity was misclassified as malformed; the narrow
token-body fix and its test remain. That audit also rewrote the parser row shapes beyond its
read-only remit; those changes were discarded, the reviewed raw `option`/`notMarker`/ordinal fields
were restored, and the full focused slice below passed on the recovered tree.

A final source audit closed the record-source boundary: `Cxx` now requires a field-end position,
while `PAG`, `SER` and `RCT` require both field-end and source-length blank. Before that check, a
blank-ended `Cxx` reached Wave 3 as a valid model and its extract operation silently disappeared.

The final lower-tier adversarial review confirmed one remaining Input-sheet defect against
J24-0215-2 pp.20-21: numeric sequence specifications could be non-ascending or omit their trailing
`SCFx` line, a later or duplicate `SCF` silently replaced the first, and Number/Option were not
coupled to numeric versus alphabetic sequencing. `resolveInput` now requires unique ascending
numeric sequences, exactly one `SCF` after the final record specification, Number `1`/`N` only for
numeric sequences, and Option blank for alphabetic sequences. Focused cases pin missing,
duplicate, misplaced and unneeded `SCF` lines plus both Number/Option directions.

Re-review returned **APPROVE**, with no remaining finding or open question, after independently
running typecheck, the 32-test model file and the full 105-test Wave-4 slice from an isolated
snapshot. A separate lower-tier documentation/scope review also returned **APPROVE**: it matched
the fifteen wrong-column cases, the twenty plus six malformed-deck cases and five focused units,
the demo/model claims, and the exact seventeen Wave-4 / thirty-two phase-to-date `OPEN:` sets.

Focused pre-review verification:

```
npm run typecheck
npx vitest run test/rpg-columns-vs-research.test.ts test/tier1-rpg-sheet-columns.test.ts \
  test/rpg-columns-is-the-only-place.test.ts test/rpg-sheets.test.ts test/rpg-deck.test.ts \
  test/rpg-messages.test.ts test/rpg-vocabulary.test.ts test/rpg-model.test.ts \
  test/rpg-demo-source.test.ts
```

Result: typecheck clean; Wave-4 slice green at 9 files / 105 tests.

**Post-review gates (Wave-4 implementation commit `ed7f915`, all green):**

```
npm run typecheck                                          clean
npm test                                                   87 files, 1667 passed, 2 skipped
npm run smoke                                              5 files, 44 passed, 0 failed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing \
  --golden test/golden/hello-dad.lst                       PASS, 2251 bytes
```

## Pre-Wave-5 correction — `SER` / `RCT` fallback

The Wave-5 calculation preflight exposed a Wave-4 ownership defect before any calculation emitter
landed: the model accepted `SER` and `RCT`, but the shared sheet establishes only their tokens and
field shape. Neither J24-0215-2 p.26 nor the recovered PR-108 evidence establishes storage,
initial value, increment point, reset scope or the distinction needed to generate executable
counters. Emitting either name would have produced unresolved symbols; inventing cadence would
have silently added a machine ruling after Wave 0 froze the ledger.

The existing §15 fallback was therefore taken without adding a constant:
`SER_AND_RCT_ARE_THE_SERIAL_AND_RECORD_COUNTERS = false`. `model.ts` now diagnoses either token as
`unsupported: SER / RCT semantics require C28-1443`; focused cases pin both directions. This is a
narrow Wave-4 ownership correction made at the first Wave-5 dependency. `PAG` / `PAGENO` remains
implemented under its separately verified sheet meaning.

Pre-change gates on the clean `5eda863` code and test tree were all green: typecheck clean;
`npm test` 87 files / 1667 passed / 2 skipped; smoke 5 files / 44 passed; CC01 completed at the
00322 instruction check after 1241 instructions; the 348-byte page and 2251-byte listing goldens
were unchanged.

The correction tree then passed all six gates: typecheck clean; `npm test` 87 files / 1669 passed /
2 skipped; smoke 5 files / 44 passed; CC01 completed at the 00322 instruction check after 1241
instructions; the 348-byte page and 2251-byte listing goldens remained unchanged.

## Pre-Wave-5 research correction — sequence-message provenance

A bounded read-only audit found that `rpg-sources.md` §4.4 had grouped
`SEQUENCE ERROR INPUT FILE` with the generated-program skeleton even though its own zero-based byte
offset, 1,109,450, is outside the skeleton range 501,525-539,427 and inside the RPG processor-phase
range 1,107,574-1,254,470. The preserved primary artifact is
`/private/tmp/ibm1410-phase5-wave0/jpr108-2024.bcd`, 1,392,339 bytes, SHA-256
`f4926ec7104c1cb969c0968f4a5331ec4791d49b172a0c73f904b9e4223c6668`.

The audit decoded `byte & 0x3f` through the repository's `glyphOf` table. Bounded context
1,109,330-1,109,609 contains the diagnostic beside processor instructions `BA1 *-16` and
`H READ1`. Independent contexts 532,257-532,536 and 526,839-527,118 place
`INPUT REC OUT OF SEQ` and `RECORD TYPE NOT FOUND` on symbolic Autocoder `DCW` cards in the
generated skeleton. The research correction therefore moves only `SEQUENCE ERROR INPUT FILE` into
the processor list and leaves those two as the verified generated-program strings. No PDF text was
read; the audit's second evidence attempt returned a 279-byte non-PDF response and was not used.

The research table drives `messages.ts` and its conformance test directly, so a documentation-only
commit would leave the tree red. This atomic research correction therefore updates the directly
forced code, test, frozen-plan, Phase-notes and open-question references together, with no Wave-5
feature work or page-map content mixed into it.

An isolated lower-tier adversarial review found one stale Arrival sentence: it still described the
processor-message block as thirteen without making that count historical. The sentence now says
that the earlier review saw thirteen and points to this correction's fourteenth processor message.
The reviewer found no other issue or open question and independently confirmed the nine-file scope,
the 3,170-line plan, the absence of the processor diagnostic from runtime literal allocation, and
the focused message oracle (1 file / 5 tests).

The exact final correction tree passed all six gates: typecheck clean; `npm test` 87 files / 1669
passed / 2 skipped; smoke 5 files / 44 passed; CC01 completed at the 00322 instruction check after
1241 instructions; the 348-byte page and 2251-byte listing goldens remained byte-identical.

## Wave 5 — calculations, output, convergence and corpus — commit 0a1b0c6

### Frozen print-position maps — published before the page goldens

These two maps are the authorial source for Wave 5's constructed page goldens. They are recorded
before either data deck or page file is authored; the later renderer result must conform to them.
The raw rendered bytes cannot carry a provenance header without ceasing to be the byte-for-byte
`renderGreenBar` oracle, so the named `RPG_GOLDENS_ARE_CONSTRUCTED` assertion and this precommitted
map carry that provenance under the Wave-1 location waiver.

#### Cycle probe

The input is exactly 112 short data cards, numbered `SAA001` through `SAA112`. The 1403 uses the
66-line default carriage tape, with channel 12 at line 60. The report is two forms:

| Form | Line(s) | Print positions | Content |
|---|---:|---:|---|
| 1 | 1 | 010-020 | `CYCLE PROBE` |
| 1 | 1 | 030 | page number `1` |
| 1 | 2 | 011-020 | `DETAIL RUN` |
| 1 | 3 | — | blank |
| 1 | 4-60 | 008-010 | `DEPT` values `001` through `057`, one per line |
| 1 | 4-60 | 020 | page number `1` |
| 2 | 1 | 010-020 | `CYCLE PROBE` |
| 2 | 1 | 030 | page number `2` |
| 2 | 2 | 011-020 | `DETAIL RUN` |
| 2 | 3 | — | blank |
| 2 | 4-58 | 008-010 | `DEPT` values `058` through `112`, one per line |
| 2 | 4-58 | 020 | page number `2` |
| 2 | 59 | 012-020 | `LAST CARD` |

The detail line is single-spaced. The `LAST CARD` total is space-2 after print: its destination
motion goes from line 59 to line 61 and therefore passes the channel-12 punch at line 60 without
sensing it under `CARRIAGE_SENSES_AT_DESTINATION_ONLY`. That is the probe's required straddle; it
must not produce a third form.

#### Card list

The input is exactly these three 17-column cards:

```text
CAPPLE   00500125
CBANANA  01200099
CWIDGET  00101234
```

The Input/Data mapping is `ITEM` in card columns 2-9, `QTY` in 10-12 and `PRICE` in 13-17. The
report has one heading, one deliberate blank line, and three detail lines:

| Line | Print positions | Content |
|---:|---:|---|
| 1 | 012-020 | `CARD LIST` |
| 2 | — | blank |
| 3 | 001-005 | `APPLE` |
| 3 | 012 | zero-suppressed quantity `5` |
| 3 | 016-018 | zero-suppressed price `125` |
| 4 | 001-006 | `BANANA` |
| 4 | 011-012 | zero-suppressed quantity `12` |
| 4 | 017-018 | zero-suppressed price `99` |
| 5 | 001-006 | `WIDGET` |
| 5 | 012 | zero-suppressed quantity `1` |
| 5 | 015-018 | zero-suppressed price `1234` |

The fixed field destinations behind those nonblank spans are `ITEM` ending at print position 8,
`QTY` ending at 12 and `PRICE` ending at 18. This deck has one record type, no control fields and
no edit word; its independent purpose is to reject a generator specialized to sales-summary.

### Calculation, output and composition

`calc.ts` supplies the Wave-3 driver's `extract`, `totalCalc` and `detailCalc` callbacks and plans
the mutable work fields they consume. Data-sheet `N` uses `ZA`; `D` / `Y` use the single-position
`MLNS` / `MLZS` instructions; short record sources stage into a marked field before the requested
move; the B/Z/N/P value statuses compare against generated blank/zero fields; and E/H/L/U consume
the 1410 arithmetic comparison latches before any later compare replaces them. Addition,
subtraction, reset-add/reset-subtract, multiply, divide, position adjustment and the named
half-adjust all have real-Machine arithmetic oracles. The `SER` / `RCT` arms are unreachable
because the preceding `5d94b17` correction selected their frozen unsupported fallback.

`output.ts` supplies `sequence`, `totalOutput`, `headingOutput`, `detailOutput` and `notFound`.
It emits only the existing print and carriage choke points; detail and total prints call
`senseOverflowStmts`, while heading and runtime-message prints do not latch overflow. Field and
line conditions preserve AND within a group and OR across repeated entries; repeated `B` entries
for one field are OR-combined into one `MLCB` reset. Reusable and inline edit controls both lower
to `MLCWA` followed by `MCE`; heading chains increment `PAGENO` once at their root; the common
detail exit clears every record-type indicator once before `RDCARD`; and the two recovered runtime
messages end at `PLINE+20` and `PLINE+19`, derived from their respective 21- and 20-character
texts.

The numeric-sequence path is a constructed state machine over the shared-form `SCFx`, numeric
ordering, `1` / `N` multiplicity and optional `X` semantics. It compares the current card's
control field from `Cnnn` because `SEQCHK` precedes `EXTRCT`; tracks current/previous group, seen
and repeated state in allocator-owned `Znnn` cells; validates required, intermediate and trailing
record types at group changes and EOF; prints only the recovered `INPUT REC OUT OF SEQ`; returns a
bad card to `RDCARD`; and routes an EOF failure to `LASTCD` only after printing. Runtime tests cover
repeat, optional omission, missing required, duplicate `1`, insufficient `N`, group reset and EOF.
This is executable support for the settled sheet semantics, not a recovered IBM emission sequence
or storage layout.

`generate(text)` is the exact published entry point. It composes
read -> scan -> parse -> model -> two-pass drive -> cards without throwing on specification
content. A terminating diagnostic returns no source; a nonfatal flag returns inspectable,
assembleable source with `ok: false`. Its three boilerplate comment cards truthfully name the
deterministic source identity `RPG SPECIFICATION DECK`, the host's UTC date, the pass-2 core size
and the fixed 1410/1402/1403 configuration. The missing-filename substitution is the only API
departure; the macro-free source is explicitly named by
`GENERATED_PROGRAM_IS_OPEN_CODED_NOT_IOCS` rather than presented as recovered IOCS output.

### Re-cut 3 and the relaxed convergence gate

The first generated arithmetic exposed that the two sales Data cards marked `N` must strip zones.
The Wave-1 target's plain `MLC C019,QTY` and `MLC C027,AMT` were therefore wrong under the already
frozen source-operation rule. Re-cut 3 changes both to `ZA` in the target, its plan exhibit and the
Wave-2 fixture; the generator follows the sheet semantics rather than preserving the older object
bytes. The program shortens from 2,034 to 2,032 code positions: slack is 02532, `IND` 02533,
`CDIN` 02540, `PLINE` 02700 and `PLGM` 02832. The assembled payload ends at 02832 and the final
loader-planted GM-WM/layout high-water is 02833. `TOTOUT` is 01160, `HDGOUT` 01785, `DTLOUT`
02246 and `EOJ` 02522. Both target sources and the Arrival exhibit carry the same two `ZA`s.

The generated and hand-written programs both assemble with zero flags and zero warnings to 39
object records, entry 00808 and the same emitted high-water. Their `ObjectRecord[]` values are
deep-equal in address, payload and order, and both real-loader/1402/1411 runs reproduce the frozen
two-form sales page byte for byte. The source diff remains deliberately non-gating: generated
source has 254 cards versus the target's 270, and every aligned source-card position differs.
Generated cards use the generic job name and three truthful boilerplate comments, omit the
target's hand section/comment prose, carry no hand-written operand comments, and therefore assign
their own sequential PGLIN values. Those source-only differences change no object record.

The generated closed-loop append independently compares the real loader's core with
`applyToStorage(items)` plus the surviving GM-WMs at 02532 and 02833. The generated print-area
append reaches the same eight `W1` sites and compares every one of the 132 positions, plus the
separate marked `PLGM`, against the Wave-1 hand map.

### Eight-deck corpus and constructed pages

The §11.2 corpus is exactly sales-summary, cycle-probe, card-list and the five stress decks:
or-conditions, edit-sign, page-boundary, sequence-error and record-not-found. Every deck generates
and assembles cleanly, reaches the complete-driver layout fixed point, and runs through the real
loader, 1402 and Machine. Across the corpus, the union of generated symbols covers all seventeen
`CYCLE_ORDER` sections and every present section head is in strict cycle order.

The two raw page files match the maps above byte for byte. Card-list supplies the deliberately
different one-record/no-control/no-edit shape. Cycle-probe prints 57 details on form 1 and 55 on
form 2, then `LAST CARD` on line 59; its line-59-to-61 destination motion crosses channel 12
without producing a third form. The stress decks exercise the legal three-alternative `OF`
or-group and repeated field entry, negative edit sign, the channel-12 boundary, and the two
recovered generated-program messages. The corpus tests also pin the named model shapes, while the
generator/card boundary separately pins 80-column machine-glyph source cards.

The maps were written, independently reviewed and frozen in the working tree before either data
deck or raw page golden was authored. Two required pre-Wave-5 correction commits kept the map out
of unrelated history, so map and golden land together rather than satisfying §10.5's literal
separate-commit wording. This is the named authoring-versus-commit-boundary deviation in
`PHASE-5-NOTES.md`; neither map moved after its page was accepted, and the existing raw-golden
metadata-location waiver remains unchanged.

### Review record before the implementation commit

Early integration review rejected rather than normalized three unsafe draft areas: unresolved OR
labels and a direct `BCV1` duplicated the output choke point; a shape-only calculation draft used
wrong D/Y instructions, ignored N normalization and accumulation cases, and invented invalid
value-status tests; and SER/RCT had no recovered cadence. Their replacements are the tested paths
above, with SER/RCT isolated in `5d94b17` and the sequence-message provenance correction isolated
in `c995ac4`.

One corpus worker modified the shared tree despite an explicit isolated/read-only assignment. It
was interrupted; every touched line was reviewed before retention, and the malformed OF group,
page-boundary positions and incomplete cycle-probe overflow-heading source were corrected before
their goldens were accepted.

Two final isolated lower-tier adversarial reviews split calculations/composition from
output/sequence. They found four load-bearing defects, all fixed test-first: `SEQCHK` read stale
`CNn` state instead of the current `Cnnn` field; repeated conditional `B` entries could lose a
later reset alternative; a nonfatal model flag incorrectly suppressed inspectable generated
source; and a Next Line target could retain conditions that were never evaluated. The focused
runtime tests now cover each correction. No new §15 name was added: Wave 5 first depends on exactly
`HALF_ADJUST_IS_ADD_FIVE_AT_THE_NAMED_POSITION`,
`GENERATED_PROGRAM_IS_OPEN_CODED_NOT_IOCS` and `RPG_GOLDENS_ARE_CONSTRUCTED`.

After those fixes, `npm run typecheck` was clean, the complete focused Wave-5/cross-wave slice
passed at 12 files / 240 tests, and the pre-review `npm test` gate passed at 92 files / 1731 tests /
1 named Wave-6 UI skip. The exact 35 first-dependency `OPEN:` names reconcile
bidirectionally across source/test declarations, `PHASE-5-NOTES.md` §1 and this phase's
`open-questions.md` rows. The implementation landed as `0a1b0c6` after final scope approval.

A fresh isolated lower-tier code review then returned **APPROVE with no findings** and
independently reran typecheck, the focused runtime slices, all six gates and the model/vocabulary/
message checks. Its exact gate results were 92 files / 1731 passed / 1 skipped for `npm test`,
5 files / 44 passed for smoke, CC01 at 00322 after 1241 instructions, and unchanged 348-byte page
and 2251-byte listing goldens. A separate provenance review found that the Wave-1 and Wave-2
identity/checksum/address paragraphs and four frozen-plan references could be mistaken for current
state after Re-cut 3. Those paragraphs now say historical-at-commit; plan §10.4 labels its pasted
MLC/address listing as the pre-re-cut arrival exhibit and points here without regenerating one byte.
The first review's claimed 244-test mismatch was withdrawn after it reproduced the exact 12-file
command at 240; the final narrow documentation re-review returned **APPROVE with no findings or
open questions**.

**Pre-commit gates on the review-approved Wave-5 tree (all green):**

```text
npm run typecheck                                          clean
npm test                                                   92 files, 1731 passed, 1 skipped
npm run smoke                                              5 files, 44 passed, 0 failed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing \
  --golden test/golden/hello-dad.lst                       PASS, 2251 bytes
```

The commit was pushed to private Gitea, and an independent live `ls-remote` read returned
`0a1b0c669ce30034358f457ca7180bf03664a1c1` for
`refs/heads/feature/phase-5-rpg`. The commit tree is the review-approved tree above; the following
documentation-only evidence commit records its SHA and remote verification without changing a
source, target, specification deck, data deck, map, page golden or test.

## Wave 6 — listing, CLI, view and storyboard — commit 9305a06

### Constructed specification listing and CLI

`listing.ts` walks the scanned specification deck in deck order and produces a heading for each
source page, one 80-column card-image line per specification, the recovered Input/Data/Calculation
section separators, a full-width line below each diagnosed card, and the recovered trailer. The
single exported `RPG_LISTING_COLUMN_STOPS` array fixes plan §9's constructed 1403 positions:
SEQNO 1-5, SHEET 7-12, PGCARD 14-18, CARD IMAGE 21-100, FLAG 103, with diagnostic lines spanning
1-132. Rendering uses the shipped chain mapping and `renderGreenBar`; all 64 BCD glyphs are pinned,
including chain-A `?` -> `&`, `!` -> `-` and substitute blank `ƀ` -> `‡`. The sanctioned update
command authored `test/golden/sales-summary.lst` at 6,982 bytes.

`tools/rpg.ts` publishes exactly `--source`, `--page`, `--map`, `--listing`, `--golden`, `--update`
and `--diff`. The frozen CLI has no data-deck argument, so `--page` derives the deterministic
sibling `<name>.data.cards` path. The page path assembles the generated Autocoder, loads its real
condensed object deck through the 1402/loader/Machine, and renders the 1403 paper. The source diff
is deliberately informational: the generator emits 254 source cards versus the hand target's 270,
reports the first difference and exits zero. The three Wave-6 command gates currently produce the
6,982-byte listing, the unchanged 3,688-byte sales page and the expected non-gating source report.

Wave 6 makes one additions-only call in Wave-5-owned `generate.ts`. The Wave-6 ownership row omits
the file, while §4's frozen `RpgResult.listing` declaration explicitly says Wave 6 fills the field
by adding that call. Leaving the field permanently empty would violate the published result. This
ownership seam and the sibling-data CLI inference are named in `PHASE-5-NOTES.md` rather than
hidden as incidental implementation choices.

### DOM-free session and the browser storyboard

`RpgSession` owns specification/data text, invalidates stale results on either edit, composes
`generate`, and exposes a typed handoff only after a successful generation. The headless Tier-4
test drives sales-summary, cycle-probe and card-list through the session, the assembler, real
loader, 1402, Machine and green-bar renderer. It also pins disabled handoff for the recovered
`OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC` case and rejects either kind of stale edit. The
required DOM-free path is appended beside Wave 2's untouched staging skip.

The view is the deliberately unstyled Phase-5 block: one specification box, one data box, a ruler
derived from `SHEET_COLUMNS`, diagnostics with provenance/cites, memory map, generated source and a
typed SEND TO AUTOCODER action. Because replacing source while retaining an older Autocoder
listing/object deck would leave PUNCH enabled for the wrong program, `createSourceBox` takes a
narrow invalidation callback from its mount. Direct source/data typing, the sample-program button
and RPG handoff all retire stale artifacts before another PUNCH can occur. This extension of
§3.2's frozen two-argument call is the third narrow Wave-6 seam recorded in
`PHASE-5-NOTES.md`.

**Criterion 13b browser check — PASS, Chrome on `npm run dev`, 2026-09-01.** The RPG framing block
was visible below Autocoder. `sample specs` loaded the exact 60-card specification deck and the
52-card data deck; moving the active line between a `C` and an `L` card redrew the Input and Format
rulers from the shared table. Valid GENERATE showed no diagnostics, the map and 254 generated
cards, and enabled SEND. Blanking Format page 06 card 230 columns 5-7 produced exactly
`OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC` with recovered-1410 provenance and disabled SEND.
After restoring the sample, SEND filled both Autocoder boxes and retired stale artifacts;
ASSEMBLE showed zero flagged lines and enabled PUNCH; PUNCH filled the unit-record deck box with
94 cards and no parse errors. The full operator sequence — PUT DECK, READER START, END OF FILE,
key bootstrap, DISPLAY 00000, ALTER/START, COMPUTER RESET, RUN/START — halted after 2,667
instructions with hopper zero. The green bar carried `PAGE 1` on form 2, the channel-12 break,
`PAGE 2` on form 3 and the final `GRAND TOTAL ... ***`; the last channel-1 skip left the carriage
at form 4.

Final focused verification is green: typecheck and the Vite build are clean; the complete
Wave-6/cross-wave slice passes 10 files / 103 tests with Wave 2's one named staging skip; and all
three RPG CLI gates pass. The exact 36 first-dependency `OPEN:` names reconcile bidirectionally
across source/test declarations, `PHASE-5-NOTES.md` section 1 and this phase's
`open-questions.md` rows.

Two isolated lower-tier adversarial reviews split the listing/CLI surface from the session/UI
surface. They found four defects, all fixed before this record: invalid `--listing` stopped before
printing the constructed flagged listing, source diff treated card-padding as its first difference,
the page runner accepted a non-halt stop, and direct/sample Autocoder edits could leave an older
object deck punchable. The corrected CLI always prints an inspectable listing before a diagnostic
exit, normalises both source decks through `readSource`, requires the exact `halt` stop, and routes
every source/data change through the mount-owned invalidation callback. Both reviewers returned
**APPROVE with no new findings** after rerunning typecheck, the 3-file 16-test slice with one skip,
the Vite build, all three RPG CLI gates and the relevant Autocoder/RPG smoke path; one also reran
the full non-Tier-4 suite at 1,740 passed / 1 skipped and smoke at 49 passed.

A final manual Chrome check on the corrected callback path proved all three entry routes: direct
Autocoder source typing, the sample-program button after a successful assembly, and RPG SEND TO
AUTOCODER each removed the prior listing/object deck and disabled PUNCH. The full gate record below
was appended only after the review-approved tree passed root scope review.

Root scope review approved the exact 20-path Wave-6 tree: every path is in the planned ownership
row except the three seams named above, and each seam has the narrow documented reason already
reviewed. `git diff --check` is clean. The final pre-commit gates on that tree are:

```text
npm run typecheck                                          clean
npm test                                                   93 files, 1740 passed, 1 skipped
npm run smoke                                              6 files, 49 passed, 0 failed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing \
  --golden test/golden/hello-dad.lst                       PASS, 2251 bytes
npm run rpg -- demos/sales-summary.rpg --page \
  --golden test/golden/sales-summary.page.txt              PASS, 3688 bytes
npm run rpg -- demos/sales-summary.rpg --listing \
  --golden test/golden/sales-summary.lst                   PASS, 6982 bytes
npm run rpg -- demos/sales-summary.rpg --source --diff     PASS, report-only; 254 vs 270 cards;
                                                           first real difference at card 2
```

The exact committed Wave-6 tree then passed the same nine gates with the same results. The private
Gitea endpoint became unreachable before `9305a06` could be published: repeated pushes produced no
response and the live remote ref remained at the Wave-5 evidence commit. No alternate hosting or
force operation was used; publication remains an external-state requirement, not a green gate.

## Whole-branch review — fixes commit 32c1b88

Two isolated lower-tier reviewers audited the entire branch against current `main`, one against the
plan/documentation contract and one against the generator/runtime path. The plan reviewer verified
the 24-test-file inventory, exact 36-name OPEN reconciliation, golden histories and all nine gates,
then found the stale top status and the round-3 review-input JSON that its own landing commit said to
delete at Tom's gate. This closeout updates the status and removes that recoverable review input;
the 270-card target draft remains because the cycle oracle and re-cut proof still consume it.

The runtime reviewer found four valid decks that Wave 4 accepted but Wave 5 could miscompile:

- a code character punched without its position/comparison companions was dropped, turning the
  record test into match-all;
- a record source could declare a zero width or extend left of card column 1;
- a numeric Calculation literal shorter than its declared factor length was not left-padded, so a
  literal `5` with length `005` generated a one-position constant rather than `00005`;
- divide lacked the shared sheet's minimum result-width check.

Commit `32c1b88` closes all four at the model boundary and adds focused regression cases. Its own
isolated re-review found one further zero-width factor-length path; that was diagnosed with explicit
precedence for the existing one-column-shift corpus, then the reviewer returned **APPROVE with no
findings**. The corrected focused runs were 3 files / 67 tests and the full RPG slice was 20 files /
238 passed / 1 named Wave-2 staging skip. No target, specification deck, data deck, memory map or
golden moved, and no new OPEN ruling was introduced.

Current `main` contains two post-branch `docs/STATUS.md` commits. The closeout restores that complete
authoritative file rather than retaining the feature branch's older copy; it therefore produces no
`docs/STATUS.md` difference against current `main`. This resolves the ancestry divergence without
discarding either main entry. The obsolete `phase-5-review-findings-r3.json` is deleted exactly as
its commit prescribed; Git history retains it.

The final review-fix pre-commit and exact post-commit trees passed all nine gates:

```text
npm run typecheck                                          clean
npm test                                                   93 files, 1745 passed, 1 skipped
npm run smoke                                              6 files, 49 passed, 0 failed
npm run cc01                                               CC01A · CC01 COMPLETE · instruction check
                                                           at 00322 · 1241 instructions
npm run demo -- --golden test/golden/hello-dad.page.txt    PASS, 348 bytes
npm run asm -- demos/hello-dad.asm --listing \
  --golden test/golden/hello-dad.lst                       PASS, 2251 bytes
npm run rpg -- demos/sales-summary.rpg --page \
  --golden test/golden/sales-summary.page.txt              PASS, 3688 bytes
npm run rpg -- demos/sales-summary.rpg --listing \
  --golden test/golden/sales-summary.lst                   PASS, 6982 bytes
npm run rpg -- demos/sales-summary.rpg --source --diff     PASS, report-only; 254 vs 270 cards;
                                                           first real difference at card 2
```
