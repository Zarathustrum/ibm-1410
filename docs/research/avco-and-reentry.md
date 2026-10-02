# AVCO, the IBM 1410, and 1960-era ballistic reentry analysis

## Implementer summary

1. **AMENDED 2026-09-04.** An **IBM 1410 *was* at Avco** — a family member analysed reentry-trajectory output there and recalls being in the room with it and using it [**testimony** — see §2, and §2's note on why the documentary silence is weak]. This bullet previously read "there is no evidence any IBM 1410 was ever installed at AVCO … treat it as period-plausible fiction"; that flat negative is **withdrawn**. What the documents show is narrower: no consulted survey *records* a 1410 there. Avco RAD Wilmington ran an IBM 704 (1958-61) [verified — BRL61 704 page], planned a Philco Transac S-2000, and by 1965 ran a 7090 with a 1401 print satellite [likely — Wikipedia Operation Match; Harvard Crimson]. BRL61/BRL64 and the C&A census are **response-based, not censuses**, and the 1410 shipped from 1961 [likely — `avco-and-reentry.md` §9], so a machine arriving 1962-63 misses all of them. What is open is **which site and which years**, not whether (§10).
2. The 1410 has **no floating-point hardware**; decimal float exists only as the FORTRAN software package (f+2 digit format, f=3..18, default 8) reachable from Autocoder via FRA/FST/FA/FS/FM/FD [verified — A22-0526-3; C28-0328-3 pp.7-8; C28-0309-1 appendix].
3. The demo should be **fixed-point decimal with a constant, documented implied point per variable**, rescaled by Move-between-offset-addresses (the machine has no shift instruction) [verified — A22-0526-3; pi.job].
4. The only transcendental needed is a **decimal antilog 10^F**; under the Allen-Eggers exponential atmosphere both `exp(-beta*y)` and `sqrt(rho/rho_SL)` are the same primitive with coefficients differing by a factor of two. **Fetch tables by computed index (indexed MLC, ~138 us), not by Table Lookup op T (~25 ms on a 1000-entry table)** [verified — A22-0526-3 pp.14, 29-30; cost arithmetic derived].
5. Budget ~2.37 ms per 8x8 multiply, ~5.44 ms per divide, ~144 us per add on an unaccelerated 1411 — so an RK4 step of the 4-state reentry ODE costs roughly 185 ms and a 600-step trajectory roughly two minutes of CPU [verified formulas — A22-0526-3 pp.17-20; substituted figures derived].

---

## 1. AVCO: divisions, sites, reentry-vehicle programs

Two Massachusetts organizations, distinct and frequently conflated:

- **Avco Everett Research Laboratory (AERL)**, Everett MA — founded by Arthur Kantrowitz in 1955 (NAE memorial says "established 1956" following a 1954 crash program on the ICBM nose-cone heating problem); Kantrowitz was an Avco VP 1956-1978. Shock-tube physics; source of the Detra-Kemp-Riddell stagnation-heating correlation [likely — Wikipedia Kantrowitz; NAE Memorial Tributes v.16]. Note the NAE text gives no founding year; 1955 is Wikipedia-only.
- **Avco Research and Advanced Development Division (RAD)**, 201 Lowell St., Wilmington MA — the engineering/production arm. Plant construction began 18 Feb 1957; dedicated 14 May 1959 (Gov. Foster Furcolo, Rep. Edith Nourse Rogers). Avco was bought by Textron in 1984 [likely — Wilmington Town Crier, local press; sentences confirmed verbatim, article misspells the governor "Farcolo"].

NASA SP-4201 records Avco by November 1956 "trying to develop serviceable nose cones for the Thor and Atlas missiles" and submitting a ballistic manned-capsule study to ARDC; "Minimum Manned Satellite" followed 20 Nov 1957 [verified — SP-4201 ch.3]. Avco also proposed Titan I as the booster for USAF Project 7969 "Man in Space Soonest" [likely — Encyclopedia Astronautica via Wikipedia].

### Avco reentry-vehicle programs

| Vehicle | Missile | Maker | Type | Key dates | Confidence / source |
|---|---|---|---|---|---|
| Mark 2 | Atlas D, Thor, Jupiter | **General Electric — not Avco** | Copper heat sink, stainless body | First flight on Atlas 10 Jan 1958; ~35 flights | verified — ccspacemuseum.org. **Correction:** the source does *not* say it was the only operational US heat-sink RV; drop that qualifier |
| RVX-1 / RVX-2 | Thor-Able / Atlas tests | GE (RVX-1); ablative coatings incl. Avco on RVX-2 | Ablative test articles | 1959 | likely — search summary only |
| Mark 4 | Titan I, Atlas E/F | Avco | Ablative over aluminum inner frame | Late-1950s development, deployed early 1960s; W-38 (~3.75 Mt); NASM article 10 ft 8 in x 4 ft, 3,465 lb | verified — NASM A19660029000 (page says "unknown ablative material") |
| Mark 5 | Minuteman I (W59) | Avco | Ablative | "In May 1961 it was noted that the weapon's RV and fuzing system would be developed by Avco"; warheads produced June 1962 - July 1963; retired 1969 | likely — Wikipedia W59 |
| Mark 11 / 11A | Minuteman I/II (W56) | Avco | Ablative | "AVCO Manufacturing were assigned development of the reentry vehicle" Aug 1959; Mod 1 production from Mar 1963; in service 1963-1993 | likely — Wikipedia W56 |
| Avcoat 5026-22 | Apollo CM heat shield | Avco | Ablator in fiberglass honeycomb, 66 lb/ft3 | **Selected April 1962** | verified — NASA Ames "Ablators - From Apollo to Future Missions" |
| Avcoat 5026-39 / 39G | Apollo CM heat shield (flight) | Avco | Epoxy-novolac + quartz fibers + phenolic microballoons, ~31 lb/ft3 | Later density-reduction successor, **not** the April 1962 selection | verified — same NASA Ames review |

**Refuted and corrected:** the frequently repeated claim that *Avcoat 5026-39* was selected in April 1962 is wrong. The April 1962 selection was **5026-22** at 66 lb/ft3; 5026-39/39G came out of later lightweighting work [verified — NTRS 20190032222].

**Refuted and corrected:** Titan I "operational 1962-1965, retired 1965" is drawn from an internally inconsistent Wikipedia article whose lede says "in use from 1959 until 1962" while the body says first operational-spec launch 21 Jan 1962 and retirement in early 1965. Use the body reading (squadrons on alert from 1962, McNamara phase-out early 1965) and cite Spires, *On Alert* (2012) or Stumpf if a hard date is load-bearing [likely, with a flagged source conflict].

Secondary literature: David K. Stumpf, "Reentry Vehicle Development Leading to the Minuteman Avco Mark 5 and 11," *Air Power History*, Fall 2017, pp.13-32 — covers the heat-sink-to-ablative transition; notes a 5 Feb 1958 letter to Avco requesting an advanced RV design study, competitively rather than sole-source [likely — bibliographic record only; full text paywalled/403].

---

## 2. Documented computer use at AVCO

The BRL 1961 survey (Report 1115, "A Third Survey of Domestic Electronic Digital Computing Systems") is the primary source and it is unusually explicit about the workload.

| Site | Machine | Date | Use | Confidence |
|---|---|---|---|---|
| Avco RAD, 201 Lowell St., Wilmington MA | IBM 704, 32,768 words core, magnetic tape | Customer acceptance Aug 1958; in service through the 1961 survey | "systems of ordinary and partial differential equations (trajectories, aerodynamic flow, heat transfer, stress analysis, variational problems (optimization of trajectories), data processing, etc.)" | verified — BRL61 |
| Avco RAD, Wilmington | Philco Transac S-2000 | Planned ~1961: "This system is being replaced in the next six months by a PHILCO Transac System." | Scientific | verified as a stated plan; whether it happened is unknown |
| Avco service bureau, Wilmington | IBM 7090 + IBM 1401 (printing) | 1965 | Service bureau; Operation Match ran punched-card questionnaires on it and mailed 1401 printouts | likely — Wikipedia Operation Match; Harvard Crimson 3 Nov 1965 renders it "Avco 1790 computer ... on a quiet street in Wilmington", an apparent typo for 7090 |
| Avco Crosley Division, 1329 Arlington St., Cincinnati | IBM 1401, IBM 7070 | "(Proposed)", 1961 | Commercial | verified — BRL61 |
| **Avco (site not yet fixed)** | **IBM 1410** | — | Not established from the documents | **`[testimony]` — a family member recalls BEING IN THE ROOM WITH IT AND USING IT. Not found in BRL61, BRL64, the Computers and Automation census, or the open web; see the note below on why that silence is weak.** |

Additional BRL61 detail on the Wilmington 704 installation [verified]: three 8-hour shifts staffed by 1 supervisor, 18 programmers, 2 clerks, 1 librarian, 5 operators, 3 engineers; reliability Jan 1960 to survey date of 110 good hours/week out of 120 attempted (ratio 0.92); total system rental $54,000/month prime shift (704, 738 32K core, 711, 716, 721, 753, nine 727 tapes, plus 717, 407, 519, 714); 50 x 50 ft computer room prepared under IBM supervision during laboratory construction; machine time was available for rent to outside organizations.

**AMENDED 2026-09-04 — an IBM 1410 WAS at Avco, on first-hand testimony, and the documentary silence is weak evidence against it.**
The project owner reports that a family member — who analysed reentry-trajectory output at Avco and is the reason this
project exists — remembers **being in the room with the 1410 and using it**. That is a participant's direct
recollection of operating the machine, which for an installation question outranks four sources that do not
mention it, for three reasons that are documentary rather than deferential:

1. **The BRL surveys are not a census of what existed.** They record the sites that *responded*. A machine at
   a division office that did not file a return is invisible to them.
2. **The dates barely overlap.** The 1410 was announced 12 September 1960 and first shipped in 1961; BRL
   Report 1115 was compiled in 1961 and BRL64 next. An installation arriving 1962-63 misses both surveys
   without either being wrong.
3. **1400-series iron is independently documented on site.** The Wilmington service bureau ran an IBM 1401
   beside a 7090 by 1965 (row above), which is precisely the lineage a 1410 sits in.

So the honest statement is **not** "no 1410 is documented at any Avco site", which this file's earlier row
invited and which the Phase 6 plan hardened into a line the showcase printed. It is: a 1410 was there on
first-hand testimony; the surveys consulted here do not record it; and which site, which years and what it was
used for are **still open**. What remains genuinely unverified is *which Avco site* and *when* — not whether.

`[testimony]` is a **provenance label, not one of METHOD.md's research tags**, introduced here on the
precedent of `[derived]` (DECISIONS.md 2026-08-30, defined once outside METHOD.md's set). It means: a
first-hand account from an identified participant, recorded as such. It does not rank against `[verified]`, which is
reserved for a primary document; it records a different *kind* of source. `PROJECT-BRIEF.md`'s step-0 answer 5
already establishes that this recollection is the project's only source for the original workflow —
this row is that same source, on a narrower question.

**What would settle the open half:** Textron corporate archives, an Avco RAD or AERL internal directory, a
Datamation or Computers and Automation new-installations column for 1962-64, or a site-level equipment
inventory.

**Interpretation for the demo — AMENDED 2026-09-04, and the previous reading is withdrawn.** The
heavy ODE integration at Avco ran on the 704 / Philco / 7090 class of machine, and that is unchanged:
the 704 at Wilmington is `[verified]` with its workload spelled out. What is withdrawn is the
sentence that followed it — *"a 1410 running a reentry trajectory is therefore a plausible-in-kind
but undocumented scenario — good enough for a demo, not defensible as history."* **A 1410 was there**
(§2's `[testimony]` row). What remains open is which site, which years, and what it was used for —
in particular whether it ran trajectory work itself or, like the 1965 print satellite, served the
larger machines. The demo does not need that question settled and does not answer it: the showcase
page claims nothing in either direction about which machines were installed where, and says only
that no printout of an actual run survives.

---

## 3. The IBM 1410 in context

**Announcement 12 September 1960, withdrawn 30 March 1970** [likely — Wikipedia only; the IBM history page returns 403]. IBM's own Nov-1961 reference manual positions it in "the intermediate data-processing area": a 1401-lineage variable-word-length decimal character machine with 5-character addresses, independent I/O synchronizer areas, hardware Table Lookup, fifteen index registers, and a compatibility switch that runs "many 1401 programs on the 1410 without altering the 1401 program" [verified — A22-1407-2 pp.5-8].

### Configuration and speed

| Item | Value | Confidence / source |
|---|---|---|
| 1411 models and core capacity | Models 1/1A = 10,000; 2/2A = 20,000; 3/3A = 40,000; **4/4A = 60,000**; 5/5A = 80,000 storage positions. "A"-suffix models have a fifth (E) frame. | verified — A22-0526-3 p.5; the "Indexing" section repeats the same five: "10K, 20K, 40K, 60K, and 80K systems" (p.14). **Correction:** an earlier four-way list (10/20/40/80K) omitted the 60K model. |
| Core cycle | 4.5 us per character; optional **1410 Accelerator** cuts it to 4.0 us and shortens data-operation cycles, ~23% internal speedup, 15-23% throughput gain | verified — A22-0526-3 pp.5, 96-97 |
| Index registers | 15, in core positions 00025-00099, five positions each (reg 1 = 00025-00029 ... reg 15 = 00095-00099); selected by zone bits over the tens and hundreds address positions; the index factor is a *number*, added if its sign is plus, subtracted if minus; overflow during indexing does not set the arithmetic overflow latch; word marks in the index area are ignored; unused positions 00025-00099 may serve as general storage. Indexing costs T = 34.5 us per single address indexed (30.67 us accelerated). Not indexable: the X-control field of M, L or U, and the G (Store Address Register) instruction. On a 10K system the high-order position of an indexed address must be zero. | verified — A22-0526-3 pp.14-15, Fig.9, p.96 |
| Peripherals | 1402 reader/punch (800 cpm read, 250 cpm punch); 1403 printer (100 positions Model 1, 132 Model 2); 729/7330 tapes; 1405 disk; 1415 console | verified — A22-1407-2 pp.5-8 |
| 1401 compatibility mode | A 10K 1410 runs as an 8K 1401; all larger 1410s run as a 16K 1401. Supported: Multiply-Divide, Expanded Print Edit, Advanced Programming (indexing, store address register, move record), Print Storage, High-Low-Equal Compare, Read-Punch Release, Sense Switches. **Not** supported: Column Binary, Compressed Tape, Punch Feed Read, Serial I/O Adapter. | verified — A22-0526-3 p.98. Emulator-relevant: 1401 mode is not a full 1401. |
| IBM 7010 (1962) | Same architecture in 7000-series technology; 7114 Models 1-4 = 40/60/80/100K characters; 2.4 us read-write cycle, two adjacent characters per access; "complete instruction compatibility with the 1410" | verified — A22-6726 p.5 |

### Price and installed base

Computers and Automation Monthly Computer Census, all rows read from the scan [verified — archive.org bitsavers census scan]:

| Census issue | Avg monthly rental | First installation | Installed | On order |
|---|---|---|---|---|
| Diebold, end of 1961 (reprinted C&A Apr 1962) | — | — | 3 delivered | 475 |
| Jan 1963 | $10,000 | 11/61 | 78 | 430 |
| Feb 1963 | $10,000 | 11/61 | 140 | 400 |
| Jul 1963 | **$12,000** | 11/61 | — | — |
| Oct 1964 | $12,000 | 11/61 | 430 | 150 |
| Jul 1965 | $14,200 (from Aug 1965 issue) | 11/61 | 800 | 80 |
| Aug 1967 | $14,200 | 11/61 | **822 (peak)** | 44 |
| Feb 1969 (data 30 Sep 1968) | $17,000 (from Dec 1967 issue) | 11/61 | 156 US + 116 non-US = 272 | — |

**Refuted and corrected:** the statement "by the October 1964 census the rental was $12,000" is true but misleading — the $10,000 -> $12,000 change had already appeared by the **July 1963** issue, fifteen months earlier. Later steps: $14,200 from the Aug 1965 issue, $17,000 from the Dec 1967 issue [verified — census scan pp.13, 15, 41, 59, 110].

For scale, the same Jan 1963 census gives the 1401 at $2,500/month, first installation 9/60, 4,390 installed, 4,200 on order [verified]. The 1410 was a low-volume machine an order of magnitude more expensive than its parent. 1400-family machines were nearly half of the ~26,000 computers worldwide by 1965 and peaked at 14,600 in 1967 — all models, not the 1410 alone [likely — ETHW, secondary].

### The "float capability"

There is none in hardware. In both A22-0526-3 (1410) and A22-6726 (7010) the string "floating" occurs **only** as "floating dollar sign" in the Move-and-Edit section (index entries: 1410 p.32, 7010 p.27) [verified]. The sky-visions.com claim that the 7010 had "optional decimal floating point instructions" is unsupported by the primary manual and should not be relied on [verified — A22-6726 index pp.72-73].

Floating point on this machine is a **software package**, and it is documented three ways:

| Path | What it is | Confidence / source |
|---|---|---|
| 1410 FORTRAN, J24-1468-1 (1962, rev. May 1963) | 20K version (compiles via Autocoder) and 40K version (direct to machine language); requires 1402, 1403 Mod 2, four tapes. Precision by control card: f default 8, "cannot exceed 45"; k default 5, "cannot exceed 99". With f=18 a number occupies 20 digits (18 mantissa + 2 characteristic). Fixed-point constants in an expression limited to 45 digits; fixed values exceeding k digits treated modulo 10^k. Source uses character set H, up to 9 continuation cards (660 chars). | verified — J24-1468-1 pp.1-7 |
| 1410/7010 OS FORTRAN, processor 1410-FO-970, C28-0328-3 (Dec 1965) | k = 3..20 (default 5); f = 3..18 plus 2 exponent digits (default 8). Magnitude 10^-100 to (1 - 10^-f) x 10^99. | verified — C28-0328-3 pp.7-8 |
| Autocoder floating pseudo-ops | **C28-0309-1: six** — FRA, FST, FA, FS, FM, FD, under the heading "FLOATING POINT ARITHMETIC INSTRUCTIONS INTERPRETED BY THE FORTRAN ARITHMETIC ROUTINES". **C28-0326-x OS Autocoder: eight** — the same six plus **BXO** (Branch if Exponent Overflow) and **BXU** (Branch if Exponent Underflow), the only documented way to test the software package's exponent overflow/underflow from Autocoder. | verified. **Correction:** an earlier claim that the OS Autocoder lists "the same six" is wrong; it lists eight. |

#### Real-number storage format (the one documented IBM numeric format for this machine)

| Field | Positions | Content |
|---|---|---|
| Fraction | first f | Normalized to [0.1, 1) — decimal point understood **before** the high-order digit |
| Exponent | last 2 | Plain decimal exponent |
| Total | f + 2 | |

Worked example from the manual at f = 8: `+3.14159` is stored `31415900` `01`, i.e. 0.31415900 x 10^1; `-3.14159` is the same digits with sign overpunches [verified — C28-0328-3 pp.7-8].

| Parameter | C28-0328-3 (OS FORTRAN) | J24-1468-1 (1961/62 preliminary) |
|---|---|---|
| f (real mantissa digits) | default 8, 3 <= f <= 18 | default 8, max 45 |
| k (integer digits) | default 5, 3 <= k <= 20 | default 5, max 99 |
| Real magnitude range | 10^-100 .. (1 - 10^-f) x 10^99 | **not readable in the scan — do not quote** |
| Integer magnitude | 1 .. (10^k - 1) | < 10^k, modulo 10^k on overflow |

**Refuted and corrected:** a magnitude range of "10^-99" attributed to J24-1468-1 is unsupported — the OCR of both magnitude statements in that manual is garbage, and with a normalized fraction in [0.1,1) plus a two-digit exponent the smallest representable magnitude is 0.1 x 10^-99 = **10^-100**, exactly what C28-0328-3 states in plain text [verified]. The f<=45 / k<=99 limits from J24-1468-1 *are* readable and stand.

Sign placement inside the f+2 format is **not** resolvable from the available scans — overpunch marks appear over the high-order fraction digit and over the exponent, consistent with the 1410 zone-bit convention, but the text layer renders the examples as `5l4159005i` / `3141590651` and C28-0328-1 has no text layer at all [unverified].

Documented library-function limits [verified — C28-0328-3 p.23 Fig.5]: EXP argument must be less than 225; SQRT of a negative argument returns the root of the absolute value *and prints an error message* (write `SQRT(ABS(A))` to suppress it); ALOG argument must be > 0; SIN/COS argument < 10000. radians in absolute value.

The one algorithmic statement IBM publishes: `A**B is computed from EXP(B*ALOG(A))`; where B is integral use `A**IFIX(B)`; for integer exponents 0-5 the expanded form (`A*A*A`) is most efficient, for exponent 6 or greater the exponential form is [verified — C28-0328-3 p.10]. That is the period-authentic route for V^3.15.

**The routine bodies do not survive publicly.** EXP/ALOG/SQRT lived in IBM Program Library item **1410-FO-138 "FORTRAN Subroutine Library"**, distributed "in cards in absolute format"; the 51-file Autocoder mixed-output tape was "no longer to be included in answer to requests", remaining an optional item "for those who request symbolic listings and program decks". The compiler itself is **1410-FO-945**, whose users "must order 1410-FO-138", which "includes the relocation loader and subroutines necessary for executing FORTRAN object programs"; descriptive material is in the 1410-PR-108 addendum and 1410-PR-134 [verified — C20-1602-8]. No listing is on bitsavers.

One lead against the "unrecoverable" verdict: the surviving PR-108 processor tape image contains the FORTRAN built-in-function linkage table — the strings `SIN 0~COS 0~LOG 0~EXP 0~SQRT 0~ATAN 0~ABS 2~XABS 2~INT 1~...` and a parallel table pairing them with five-digit core addresses (FLOAT 13097, XFIX 13186, ABS 13165, XABS 13149, and SIN/COS/LOG/EXP/SQRT/ATAN all at 13123, a common dispatch entry). That is the compiler's name/address table, not the routine bodies, so it does not settle the algorithms — but the object-time package is worth disassembling from the tape image before declaring the methods lost. Note this release names the log function **LOG**, not the **ALOG** of the later OS FORTRAN — a within-1410 release difference [likely — sky-visions PR-108 tape image; the compiler-vs-library reading is inference].

House precedent for a fixed-point transcendental in this machine family: Program Library **7080-08.3.001 "Square Root Macro and Subroutine"** — "THE MACRO CALLS UPON A CLASS B SUBROUTINE WHICH USES NEWTONS ITERATION METHOD TO DETERMINE THE SQUARE ROOT OF A NUMBER FROM ONE TO FIFTEEN SIGNIFICANT DIGITS. FORTRAN FLOATING POINT CODING AND SUBROUTINES ARE NOT REQUIRED. ROOT PRECISION IS CONTROLLED BY DECIMAL DEFINITION OF THE AUTOCODER RCD." 400 storage positions plus 35 in line per macro entry; 7080 Autocoder; author F. U. Voss, IBM DPD HQ; available Q4 1963 [verified — C20-1602-8]. This is a **7080** item, not a 1410 one — family evidence that IBM's own answer on a variable-length decimal machine was fixed-point Newton with programmer-chosen decimal precision, not a call into the float package.

The 1410 Autocoder manual's `SQART01`/`SQART02` square-root reference is a **CALL-macro naming illustration only** (Figure 84) and contains no algorithm [verified — C28-0309-1].

**Other business-side context:** RPG originated on the 1401 — announced 1959, but the 1401 RPG manual J24-0215-2 is copyright 1960, 1961 (minor revision Feb 1965), so treat 1959 as announcement rather than availability; RPG II arrived ~1969 with System/3 [verified for the manual dates; likely for the rest].

---

## 4. Reentry analysis of the era

The governing paper is **Allen & Eggers, NACA Report 1381** (work dated 1953, superseding TN 4047, published 1958). Its assumptions define what a 1960 trajectory program actually did: point mass, constant C_D, exponential atmosphere, gravity neglected against drag during the pulse (so a straight-line path at the entry angle), non-rotating flat Earth [verified].

- Atmosphere, eq.(7): **rho = 0.0034 e^(-y/22,000) slug/ft3** — i.e. rho0 = 0.0034 slug/ft3, beta = 1/22,000 ft^-1 [verified].
- Velocity, eq.(13): **V = V_E exp[ -(C_D rho0 A / (2 beta m sin theta_E)) e^(-beta y) ]** [verified].
- Altitude of peak deceleration, eq.(15): **y1 = (1/beta) ln[ C_D rho0 A / (beta m sin theta_E) ]** [verified].
- Speed there, eq.(16): **V1 = V_E e^(-1/2) ~= 0.6065 V_E** [verified].
- Peak deceleration, eq.(17): **max (dV/dt)/g = beta V_E^2 sin theta_E / (2 g e)** — independent of mass, size and C_D [verified].
- The report explicitly warns that eqs.(16)-(17) apply **only if y1 from eq.(15) is positive** [verified].

**Ballistic coefficient.** beta_B = m / (C_D A) in slug/ft2, or W/(C_D A) in lb/ft2 — the single dominant design parameter, and the only place vehicle identity enters the drag equation. Note that eq.(17) says peak *deceleration* does not depend on it; where it dominates is altitude of the pulse (eq.15) and therefore heating. Representative Mark-4/Mark-11-class values are **not** documented in any source consulted here — do not invent them; drive the demo from a user-supplied beta_B [unverified].

**Stagnation heating, Detra-Kemp-Riddell (Avco Research Laboratory, Everett, 1957).** Published as "Addendum to Heat Transfer to Satellite Vehicles Re-entering the Atmosphere," *Jet Propulsion* 27(12), pp.1256-1257. Modern SI restatement: q = 1.99876e8 * sqrt(0.3048/r_n) * sqrt(rho/rho_SL) * (V/7924.8)^3.15 * (h_s-h_w)/(h_s-h_w300) W/m2. Unit-checked equivalent in period units:

**q_s = 17,600 * sqrt(rho/rho_SL) * (V/26,000)^3.15 / sqrt(R_N)  BTU/ft2-s, R_N in feet**

[verified — arXiv 1910.06397 eq.19; conversion confirmed by arithmetic: 1.99876e8 W/m2 * 8.811e-5 = 17,611 BTU/ft2-s at r_n = 1 ft, and 7924.8 m/s = 26,000 ft/s]. The correlation's own accuracy is roughly +/-10-20%, which sets the precision target for everything downstream.

---

## 5. The 2-D point-mass equations, as programmed

Planar, non-rotating spherical Earth. State: h (altitude, ft), V (speed, ft/s), gamma (flight-path angle, positive up, negative on descent), s (downrange, ft), t (s).

| Quantity | Equation | Notes |
|---|---|---|
| Density | rho = rho0 * exp(-h/H), H = 22,000 ft, rho0 = 0.0034 slug/ft3 | Allen-Eggers constants; evaluate by decimal antilog, section 7 |
| Gravity | g = g0 * (R_E/(R_E+h))^2 | g0 = 32.174 ft/s2, R_E = 20.9e6 ft; constant g is acceptable for a short pulse |
| Ballistic coefficient | beta_B = m/(C_D A) [slug/ft2] | dominant design parameter |
| Drag acceleration | a_D = rho V^2 / (2 beta_B) | = C_D rho V^2 A / (2m) |
| dV/dt | -a_D - g sin(gamma) | |
| dgamma/dt | (V/(R_E+h) - g/V) cos(gamma) | add L/(mV) if lifting; ballistic L = 0 |
| dh/dt | V sin(gamma) | |
| ds/dt | V cos(gamma) * R_E/(R_E+h) | ground range |
| Deceleration | n = a_D / g0 [g] | printed |
| Dynamic pressure | q_bar = rho V^2 / 2 [lb/ft2] | printed |
| Stagnation heating | q_s = 17,600 sqrt(rho/rho_SL) (V/26,000)^3.15 / sqrt(R_N) [BTU/ft2-s] | rho_SL = 0.0023769 slug/ft3 |
| Heat load | Q = integral q_s dt | printed running total |

The ODE set itself is standard flight mechanics, **not** verified against a period Avco program listing [unverified for provenance; the physics is not in doubt].

### RK4, in a form a fixed-point decimal machine can execute

Period trajectory programs on 704/7090-class machines used fourth-order Runge-Kutta (self-starting) or Adams-type predictor-corrector (cheaper per step, needs a starter) [unverified — no period Avco source; asserted from general practice].

With y = (V, gamma, h, s) and f the derivative vector above:

```
k1 = f(t,        y)
k2 = f(t + dt/2, y + (dt/2) k1)
k3 = f(t + dt/2, y + (dt/2) k2)
k4 = f(t + dt,   y +  dt    k3)
y  = y + (dt/6)(k1 + 2 k2 + 2 k3 + k4)
```

Fixed-point notes that matter on the 1410:

- Hold `dt/2` and `dt/6` as **pre-scaled constants**, never divide at run time (a divide is ~2.3x a multiply and ~38x an add).
- Every stage product changes scale by S_a + S_b; the rescale back to the target scale is a Move from a fixed offset, and because all scales are constants the offset is an **assembly-time constant**. This is the entire argument for fixed point over the software float package here.
- Round before truncating: add a 5 one position right of the target units (`A +5,WORK-n+1`) before the truncating move.
- The k-stage sum `k1 + 2k2 + 2k3 + k4` is adds and one doubling each — 144 us per 8-digit add, so the combination step is nearly free next to the derivative evaluations.
- dt ~ 0.1-1 s is the period-plausible band; the pulse itself lasts tens of seconds.

**Cost budget** (derived arithmetic on verified formulas; unaccelerated 1411, 8-digit fields): one derivative evaluation needs roughly 13 multiplies and 1 divide -> ~36 ms. RK4 = 4 evaluations + the state combination (~16 constant multiplies, ~38 ms) -> **~185 ms per step**. A 600-step trajectory (300 s at dt = 0.5) is **~2 minutes of CPU**, or ~75 s with the Accelerator. Re-derive against the emulator's cycle counts before publishing any performance claim [unverified — the substituted figures are arithmetic, the formulas are primary].

---

## 6. Fixed-point decimal on the 1410: the working conventions

There is **no published IBM 1410 fixed-point scaling standard** — IBM never issued a 1410 numeric-conventions manual, and A22-0526-3 deliberately has no fixed decimal point: the machine is variable-field-length and the programmer owns the point [verified by absence].

The only surviving hand-written multi-digit fixed-point 1410/7010 Autocoder program, `pi.job` (PI to 5000 digits, Machin's formula, three 5051-position work areas BASE1/INTER1/ACCUM1 with BASET = BASE1+5050), states the convention in its own comments [verified — every cited line confirmed in the source]:

```
* FIGURE WHERE THE DECIMAL POINT WILL BE
* (SAME RELATIVE PLACE IN EACH AREA)
* (SEVERAL CHARACTERS OR WORDS TO THE RIGHT OF THE TOP SIGNIFICANCE.)
```

and its working idioms:

```
ZA    +0,ACCUM        * ZERO ACCUMULATOR, FORCE POSITIVE
MLZS  +0,BASET        * SET POSITIVE SIGN
MLC   BASET-7,BASET   * SHIFT QUOTIENT   (rescale = move from an offset)
MLC   LC0L9,BASE6     * REMOVE UNSHIFTED (LC0L9 DCW 000000000)
D     DIVBAS,BASE6
```

### Machine rules the scaling design rests on

| Rule | Statement | Source |
|---|---|---|
| Sign | "The sign of a factor in a field is determined by the combination of zone bits in its units position. A minus sign is always indicated with a B bit. A plus sign may be indicated in any of three ways: by B and A bits, no zone bits, or (less commonly) by an A bit." Machine-developed signs are B+A for plus and B for minus, so "The test for a minus result from an operation can thus be made with a branch if zone equal B instruction, V (I)(B) K". | verified — A22-0526-3 **p.16** ("Sign Change or Development" and Fig.11 "Bit Equivalents for Signs"). **Correction:** this is p.16, not p.15; p.15 is still in the Indexing section. |
| Sign test in Autocoder | Not a distinct mnemonic — `BZN` with a d-operand. Minus: `V(I)(B)K` = `BZN(I)(B)B` or `BZN(I)(B)-`. Machine-developed plus: `V(I)(B)B` = `BZN(I)(B)AB` or `BZN(I)(B)+`. Also `V(I)(B)S` = `BZN(I)(B)A` (A bit, no B) and `V(I)(B)2` = `BZN(I)(B)` (no zones, the unsigned-plus case). After arithmetic the minus test alone suffices; card data can carry any of the three plus encodings. | verified — A22-0526-3 pp.38-39, Fig.11 p.16 |
| No shift instruction | Scaling by a power of ten is a Move between offset addresses. "shift" occurs in A22-0526-3 only inside the multiply/divide algorithm narrative (pp.19-20) and in the console keyboard description (p.53). | verified |
| Move d-characters | **Figure 22, "Data Move d-Characters and Mnemonics", p.26.** Through-first-word-mark-in-**either**-field: MLN=A, MLZ=B, MLC=C, MLW=D (plus MLNW=E, MLZW=F, MLCW=G, SCNL='&'). Single-position: MLNS=1, MLZS=2, MLCS=3, MLWS=4 (SCNLS=blank). A-field-word-mark-only: MLNA='/', MLZA=S, MLCA=T, MLWA=U. B-field-word-mark-only: MLNB=J, MLZB=K, MLCB=L, MLWB=M. Move/Scan family op-code character is **D**; note the Autocoder mnemonic `D` is **Divide** (op code `%`). MLZS's full name is "Move Left Zones, Single Position" — zone bits only, one position, which is what makes it a sign stamp. Move data timing T = 4.5(L + 1 + A + B). | verified. **Correction:** an earlier citation pointed at "Move Characters and Suppress Zeros" (MCS, p.27) — a separate single instruction, not the d-character table. |
| Multiply | Product develops in the B-field, which must hold multiplicand digits + multiplier digits + 1 positions. The multiplier image goes in the high-order positions of the product field before the M and is destroyed by it. Word marks must define the high-order position of both multiplicand and multiplier image. Like signs -> plus, unlike -> minus, written to the B-field units position. | verified — A22-0526-3 pp.18-19 |
| Divide | A-address = units position of the divisor; B-address = **leftmost** position of the dividend field; the dividend sits in the rightmost positions of the quotient-dividend B-field, which must be divisor digits + dividend digits + 1 wide. Quotient develops leftmost, remainder stays rightmost. Quotient positions must start as zeros and the dividend must carry a sign — "Moving the dividend into the B-field by means of a zero and add instruction ensures both." After the operation the B-address register holds the **tens** position of the quotient. | verified — A22-0526-3 p.20 |

### Instruction timing (the numbers that decide algorithm shape)

Timing symbols: A = A-field length, B = B-field length, L = instruction length, M = multiplier length, N = fields actually compared on a table search, Q = quotient length, RB = recomplement pass; E = 2 on a single-character multiply/divide, 1 on a single-character add/subtract/ZA/ZS/table-lookup or a 6-character multiply/divide, else 0 [verified — A22-0526-3 Fig.7 p.9].

| Operation | Unaccelerated | Accelerated | 8-digit case |
|---|---|---|---|
| Add / Subtract (two fields) | T = 4.5(L + 1 + E + A + 1.5B + 1.5RB) | — | **144 us** (A=B=8, L=11, no recomplement) |
| Zero and Add (two fields) | T = 4.5(L + 1 + E + A + 1.5B) | — | ~144 us |
| Multiply | T = 4.5[L + 1 + E + 2.5M + (2.5M + 1.5)(2.5A + 3)] | T = 4[L + 1 + E + 2M + (2.5M + 1)(2A + 2)] | **2369 us** / 1620 us |
| Divide | T = 4.5{L + 1 + E + 6.5Q[A + 1.5(A + 2)]} | T = 4[L + 1 + E + 6.5Q(2A + 2)] | **5436 us** / 3790 us |
| Move (data) | T = 4.5(L + 1 + A + B) | — | ~113 us |
| Indexed address | +34.5 us per address indexed | +30.67 us | |
| Compare | T = 4.5(L + 1 + A + B) | — | |
| Table Lookup | T = 4.5(L + 1 + B + NA) | — | see below |
| Store Address Register (G) | — | T = 4(L + 8.5) = 62 us | not indexable |

Ratios that drive design: **multiply ~16x an add; divide ~2.3x a multiply.** So one table fetch plus a *single* interpolation multiply is the right shape for a transcendental, and a series evaluation costing several multiplies per call is not [verified formulas; substituted figures recomputed]. Any performance claim must state whether it assumes the Accelerator.

L values confirmed: Multiply and Divide L = 1, 6 or 11; Table Lookup L = 1, 6 or 12. Op codes spot-checked against the manual: Add = `A`, Subtract = `S`, Zero and Add = `?`, Zero and Subtract = `!`, Multiply = `@`, Divide = `%`, Move/Scan = `D`, Compare = `C`, Branch-on-condition = `V`, Store Address Register = `G`, Table Lookup = `T` [verified — A22-0526-3 pp.17-22, 25-30, 36-39, appendix pp.101ff].

### Table Lookup (op T) — semantics, and why not to use it here

Semantics [verified — A22-0526-3 pp.29-30, Figs.25-26; independently cross-checked against the SimH 7010 CPU `i7010_cpu.c` case `OP_T`, which reproduces every behaviour]:

- A-address = rightmost position of the search argument; B-address = rightmost character of the **entire** table; the table is searched **right to left**.
- Each table field is an implicit B-field: table argument in its rightmost positions, function in its leftmost. Every table field needs a word mark in its leftmost position; so does the search argument.
- The table argument must be the **same length** as the search argument; a shorter one signals end-of-table and turns on the high-compare indicator.
- The operation stops one position to the **left** of the first satisfying table argument, so the B-address register ends holding the rightmost character of the function. The A-address register is left at A-LW (the leftmost, word-marked position of the search argument), and during the search the C-address register holds the A-address so it can be reloaded per table field.
- L = 1, 6 or 12; the L=6 form chains the B-address and reuses the previous d-modifier.

| Mnemonic | d-char | Stops on a table argument that is |
|---|---|---|
| LL | 1 | Lower than search argument |
| LE | 2 | Equal to search argument |
| LLE | 3 | Equal to or lower than search argument |
| LH | 4 | Higher than search argument |
| LLH | 5 | Lower than or higher than search argument |
| LEH | 6 | Equal to or higher than search argument |
| (none) | 7 | Stop on any |
| (none) | blank | Search to end of table |

The d-characters are a **three-bit mask**, not an arbitrary code: bit 1 = low, bit 2 = equal, bit 4 = high, OR'd. That is why 3 = low-or-equal, 5 = low-or-high, 6 = equal-or-high, 7 = any, and blank (0) never matches so the search runs to the end of the table. SimH implements exactly this (`if (cind & op_mod) break;` with cind set to 1/2/4 by the comparison), rejects d with bits above 7 as an invalid opcode, and sets cind = 4 on hitting the end-of-table word mark. Knowing it is a mask makes interpolation bracketing deducible rather than guesswork [verified].

Table layout guidance from the manual: "If the desired factor is five positions or less, it is often practical to store the factor itself in this place" — otherwise store the five-character address of the factor. Fixed-separation alternative: "Function values may also be stored a fixed number of core-storage positions from their arguments. Thus, having found the location N of the argument, the function is located at N + C." [verified — A22-0526-3 p.29].

**Refuted and corrected — do not search a uniform-grid transcendental table with op T.** Op T is a linear right-to-left scan whose cost grows with table size; the manual says so ("Because the timing of the table lookup operation is determined by the number of characters in the table that are read before a table argument is found, it is desirable to have the least possible number of characters in the function"), and Fig.7 makes it quantitative (N = fields actually compared; B on a table search "includes only those argument fields actually compared and the intervening function values"). For a 1000-entry table with a 3-digit argument and a 5-digit inline function, an average hit at entry 500 gives N = 500, B = 500*3 + 499*5 = 3995, so **T = 4.5(12 + 1 + 3995 + 1500) = 24.8 ms average, 49.5 ms worst case** — ten times an 8x8 multiply and enough to dominate the whole integration step. A 100-entry version is ~2.5 ms average, still no cheaper than a multiply.

**Instead:** the grid is uniform and the argument digits *are* the index, so compute the entry address arithmetically and fetch with an **indexed MLC**. Cost ~4.5(12 + 1 + 5 + 5) + 34.5 = **~138 us** — about 180x cheaper than the 1000-entry T search and ~17x cheaper than a multiply. Reserve op T for genuinely non-uniform or unordered tables [verified sources; cost arithmetic derived].

### Proposed scaling table for the demo (design recommendation, not an IBM convention)

Signed fixed-point decimal, one digit per core position, sign in the zone bits of the units position (B = minus, BA = plus). S = implied fractional digits, constant for the life of the run, recorded in the DS/DCW comment. Units: feet, ft/s, seconds, slug/ft3.

| Symbol | Meaning | Digits | S | Represents |
|---|---|---|---|---|
| T | elapsed time (s) | 6 | 2 | 0 .. 9999.99 |
| DT | integration step (s) | 4 | 3 | e.g. 0100 = 0.100 s |
| Y | altitude (ft) | 8 | 1 | 0 .. 9,999,999.9 |
| VEL | speed (ft/s) | 8 | 2 | 0 .. 999,999.99 |
| GAM | flight-path angle (rad) | 8 | 7 | +/- 9.9999999 |
| L10R | log10(rho/rho_SL) | 8 | 6 | -99.999999 .. +9.999999 |
| ANTI | 10^F for F in [0,1) | 8 | 7 | 1.0000000 .. 9.9999999 |
| RHOR | rho/rho_SL | 8 | 7 | mantissa; decade in a 2-digit companion |
| SQR | sqrt(rho/rho_SL) | 8 | 7 | as above |
| U | V / 26,000 | 8 | 7 | 0 .. ~1.1 |
| U315 | U^3.15 | 8 | 7 | 0 .. ~1.35 |
| QDOT | heat rate (BTU/ft2-s) | 8 | 2 | 0 .. 999,999.99 |

| Operation | Rule |
|---|---|
| Multiply a x b | Product scale = Sa + Sb; B-field must be (a digits + b digits + 1) wide with the multiplier image pre-loaded high-order. Rescale with one `MLC SRC-n,DEST` where n = Sa + Sb - S_target (an assembly-time constant), then blank the residue with an `MLC` of a zeros literal. |
| Round before truncating | `A +5,WORK-n+1` before the truncating move. |
| Divide a / b | Pre-scale the dividend left by (S_target + Sb - Sa) into a zeroed field. B-field = divisor digits + dividend digits + 1; load the dividend with `ZA` to guarantee leading zeros and a proper sign. Quotient develops leftmost, remainder rightmost; B-address register ends at the quotient's tens position. |
| Split an antilog argument into decade + fraction | With L10R at S=6: decades = `MLN L10R-6,DEC`, fraction = `MLN L10R,FRAC`. A field slice, not arithmetic. |

---

## 7. The three non-elementary operations

Because the Allen-Eggers atmosphere is *exactly* exponential, log10(rho) is exactly linear in altitude — so `exp(-beta*y)` and `sqrt(rho/rho_SL)` are the **same primitive**, a decimal antilog 10^x, at two coefficients differing by a factor of two. On a decimal machine the antilog's decade/fraction split is a field slice, which is the strongest argument for base 10 over base e here [unverified — engineering judgment built on verified facts].

**Scaling trap.** Allen-Eggers rho0 = 0.0034 slug/ft3 is a curve-fit constant, **not** standard sea-level density (0.0023769 slug/ft3), while DKR normalizes by true rho_SL. The 1.4304346 factor is real and easy to drop.

Corrected constants [the earlier figures 0.155414 / 0.077707 / 0.0777085 were arithmetically wrong and mutually inconsistent; recomputed]:

```
rho0 / rho_SL              = 0.0034 / 0.0023769 = 1.43043460
log10(rho0/rho_SL)         = 0.15546801
log10(e)                   = 0.4342944819
beta * log10(e)            = 0.4342944819 / 22000 = 1.97406583e-5  per ft

log10(rho/rho_SL)          = 0.15546801 - 1.97406583e-5 * y        (y in ft)
sqrt(rho/rho_SL)           = 10^(0.07773400 - 9.87032913e-6 * y)
```

| Needed | Recommended method | Cost per call | Period-authentic alternative |
|---|---|---|---|
| exp(-beta*y) | L = 0.15546801 - 1.97406583e-5 y; slice L into decade D and fraction F; **indexed MLC** fetch of 10^F from a 1000-entry uniform table + one linear interpolation; apply D as an indexed offset (X-register) | 1 multiply, 1 indexed fetch, 1 interpolation multiply, 1 indexed move | `FRA`/`FM`/`FST` into the FORTRAN arithmetic routines (C28-0309-1) |
| sqrt(rho/rho_SL) | Same routine, half the coefficient: 10^(0.07773400 - 9.87032913e-6 y). **No square root is computed.** | 1 multiply + one more antilog | Newton x <- (x + a/x)/2 (family precedent 7080-08.3.001) |
| V^3.15 | Direct table of u^3.15 on u = V/26,000, du = 0.01, 111 entries, 5-digit function values inline in the field, linear interpolation | 1 reciprocal multiply, 1 indexed fetch, 1 interpolation multiply | `antilog(3.15 * log10 V)` — exactly IBM's rule "A**B is computed from EXP(B*ALOG(A))" (C28-0328-3 p.10) |
| general sqrt (only if a nose-radius sweep is added) | Newton x <- (x + a/x)/2, seeded by halving the decimal exponent; 2-3 iterations from a 2-digit seed reaches 8-16 digits | 1 divide + 1 add + 1 halving per iteration | as above |

### Table sizes and interpolation error [derived; standard |f''| h^2 / 8 bound]

| Table | Grid | Max linear-interpolation error | Effective digits |
|---|---|---|---|
| 10^F, F in [0,1) | 1000 entries, dF = 0.001 | (ln10)^2 * 10^F * dF^2 / 8 = **6.63e-6** absolute on a value up to 10 | ~7 significant |
| 10^F, F in [0,1) | 100 entries, dF = 0.01 | **6.63e-4** absolute | ~4-5 significant |
| u^3.15, u in [0,1.1] | 111 entries, du = 0.01 | max of `abs(g'')` = 3.15*2.15*u^1.15 evaluated at **u = 1.1** = 7.5570 -> 7.5570 * (0.01)^2 / 8 = **9.45e-5** absolute | ~4 significant |

**Correction:** the u^3.15 bound is 9.45e-5, not 8.5e-5 — the earlier figure evaluated g'' at u = 1 rather than at the top of the interval. The conclusion is unchanged: every one of these is far inside DKR's own +/-10-20% correlation error, and every function value fits in the 5 digits A22-0526-3 p.29 says to store inline in the table field.

If op T *is* used somewhere (a non-uniform table), note the ordering trap: the manual shows table arguments "stored in table in ascending order, right to left" with the table "always searched from right to left," stopping at the first argument satisfying the d-character. With that ordering, `LEH` (d=6) yields the smallest table argument >= x — the upper bracket — and the lower bracket is the adjacent field a fixed number of positions to the right (the "function at N + C" convention). Reversing the ordering and using `LLE` (d=3) gives the lower bracket instead. Verify against the emulator before trusting it; this is the easiest thing to get backwards [verified rules, unverified as applied].

---

## 8. Validation checkpoints

All free, all read directly from NACA 1381 [verified]:

| Check | Expression | Why it is cheap |
|---|---|---|
| Per-step exact solution | V = V_E exp[-(C_D rho0 A / (2 beta m sin theta_E)) e^(-beta y)] (eq.13) | Closed-form solution of the very ODE being integrated. Print it in an adjacent column and difference it — a free per-step error column, and it reuses the antilog routine already written. |
| Speed at peak deceleration | V1 = V_E e^(-1/2) ~= 0.6065 V_E (eq.16) | Depends on nothing but V_E. If the minimum-of-dV/dt row is not at 0.61 V_E, the integration is wrong. |
| Altitude of peak deceleration | y1 = (1/beta) ln[C_D rho0 A / (beta m sin theta_E)] (eq.15) | Closed form; also the guard — eqs.16-17 are valid only when y1 > 0. |
| Peak deceleration | max (dV/dt)/g = beta V_E^2 sin theta_E / (2 g e) (eq.17) | Independent of m, A and C_D. Regression test: re-run with C_D doubled; the peak-g figure must not move. |
| Atmosphere | rho = 0.0034 e^(-y/22,000) slug/ft3 (eq.7) | Beware the 1.4304346 normalization factor above. |

**Caveat the checks depend on:** eq.(13) is the closed-form solution only for the non-rotating, flat-Earth, constant-gamma, **drag-only** problem Allen and Eggers set up, and only with their exponential atmosphere. If the demo integrates gravity or a varying flight-path angle, eq.(13) will diverge from the numeric answer by a real physical amount, not by integration error. Use it as a per-step check only in the drag-only configuration, and turn gravity off in the regression run [verified — NACA 1381 assumptions pp.5-6].

---

## 9. What a period trajectory printout would carry

Column layout is **period-plausible, not documented** — no Avco listing surfaced [unverified]. Every quantity in it is, however, either a state variable or a one-line function of one, so the column set is constrained by the physics rather than by taste.

| Column | Units | Derived from |
|---|---|---|
| TIME | s | integration step |
| ALT | ft | h |
| VEL | ft/s | V |
| GAMMA | deg | flight-path angle (converted from radians for print) |
| RANGE | n.mi. | s / 6076.1 |
| MACH | - | V / a(h) — requires a speed-of-sound table, an extra tabulated function |
| DECEL | g | rho V^2 / (2 beta_B g0) |
| Q (dyn press) | lb/ft2 | rho V^2 / 2 |
| QDOT (stag) | BTU/ft2-s | DKR |
| Q TOTAL | BTU/ft2 | running integral of QDOT |
| RHO | slug/ft3 | atmosphere |
| V (A-E) | ft/s | eq.13 closed form, adjacent to VEL, for the free error column |

Printing is on a 1403 with 100 (Model 1) or 132 (Model 2) print positions [verified — A22-1407-2]; twelve columns at ~10 positions each fits a 132-position carriage and not a 100-position one. Fixed-time-step printing (every step, or every Nth step) is the period norm.

---

## 10. Open questions, and what each one blocks

| Question | Blocks | Fallback |
|---|---|---|
| **AMENDED 2026-09-04.** WHICH Avco site had the 1410, and when? **That one was there is `[testimony]`** — a family member recalls being in the room with it and using it (§2). Nothing in BRL61, BRL64, the C&A census or the web records it, but those are response-based surveys that barely overlap the 1410's 1961+ ship dates. | The showcase framing, which must now claim nothing in EITHER direction about which machines were installed where. | The page says it is a reconstruction and not a record of an actual run, and stops there. It no longer prints the "no 1410 is documented" sentence, which read as a denial. |
| 1410 FORTRAN library source (1410-FO-138) is not on bitsavers; only the compiler's name/address linkage table survives in the PR-108 tape image. | Historical fidelity of the EXP/ALOG/SQRT *method*, nothing functional. | Use the table-plus-interpolation design above; cite IBM's `EXP(B*ALOG(A))` rule and the 7080 Newton precedent in comments. Chase 1410-FO-138 / 1410-FO-945 / 1410-PR-108 / 1410-PR-134 at CHM before claiming fidelity. |
| Sign placement inside the C28-0328-3 f+2 real format is unreadable in every available scan; C28-0328-1 has no text layer at all. | Only a *software-float* path in the emulator (reading/writing FORTRAN real constants). | Do not implement the float format; the demo is fixed point. If needed, choose the zone-bit convention on the fraction's high-order digit and the exponent's low-order digit and flag it as a guess. |
| Whether FRA/FST/FA/FS/FM/FD are usable from standalone Autocoder without linking the whole FORTRAN object-time package is undocumented beyond the appendix heading. | The software-float escape hatch only. | Stay in fixed point. If the float path is wanted, work the linkage out from the PR155/PR108 system tapes on sky-visions. |
| Table Lookup ordering x d-character bracketing direction — the manual states the rule but Figure 26's OCR is mangled. | An op-T interpolation routine, if one is written. | The indexed-MLC design avoids op T entirely. If op T is used, run the emulator experiment first. |
| Multiply/divide timings were OCR'd from a scan (formulas now read cleanly and recompute consistently, but the millisecond figures are derived). | Any published performance claim. | Treat 2.37 ms / 5.44 ms / 144 us as an order-of-magnitude budget until the emulator gives cycle-accurate counts. State whether the Accelerator is assumed. |
| The RK4-vs-Adams claim for period trajectory programs has no Avco source. | Nothing functional; only the "this is what they did" narrative. | Say "standard practice of the era" and cite it as such, or drop the claim. |
| Ballistic coefficients for Mark 4 / Mark 5 / Mark 11 are not in any source consulted. | A demo preloaded with "real" vehicle numbers. | Drive beta_B from user input with a generic default; do not invent vehicle-specific values. |
| BRL64 has no Avco listing — asserted by the finder, not re-checked (the BRL64 index page's link structure did not yield sub-pages to grep). | Nothing; it is a negative result either way. | Treat "no Avco in BRL64" as unverified. |
| Total 1410 units shipped over its life; only census snapshots were extracted (peak 822 installed, Aug 1967 issue). | Nothing functional. | Quote the census rows above with their issue dates. |
| No 1410/1401 Autocoder source implementing a transcendental survives — pi.job (hand fixed-point Autocoder), prime.job / f108.job (FORTRAN II), laplace.job (FORTRAN, uses SQRT and `**`) are the whole corpus at sky-visions. | Style fidelity only. | pi.job is the single available model for hand-written fixed-point style. Follow its commenting and scaling conventions. |

---

## Sources

- IBM 1410 Principles of Operation, A22-0526-3 — http://bitsavers.trailing-edge.com/pdf/ibm/1410/A22-0526-3_1410_princOps.pdf
- IBM 1410 Data Processing System Reference Manual, A22-1407-2 (Nov 1961) — http://bitsavers.trailing-edge.com/pdf/ibm/1410/A22-1407-2_1410ref_Nov61.pdf
- IBM 7010 Principles of Operation, A22-6726 — http://bitsavers.trailing-edge.com/pdf/ibm/1410/A22-6726_7010_PrincOps.pdf
- IBM 1410/7010 Operating System FORTRAN, C28-0328-3 (Dec 1965) — http://bitsavers.trailing-edge.com/pdf/ibm/1410/C28-0328-3_1410_Fortran.pdf
- IBM 1410 FORTRAN Preliminary Specifications, J24-1468-1 (1962, rev. May 1963) — http://bitsavers.trailing-edge.com/pdf/ibm/1410/J24-1468-1_1410fortran.pdf
- IBM 1410 Autocoder, C28-0309-1 — http://bitsavers.trailing-edge.com/pdf/ibm/1410/C28-0309-1_1410_autocoder.pdf
- IBM 1410 Operating System Autocoder, C28-0326-1 — http://bitsavers.trailing-edge.com/pdf/ibm/1410/C28-0326-1_1410_OS_Autocoder.pdf
- IBM 1410/7010 Programming Systems Catalog, C20-1602-8 (June 1968) — http://bitsavers.trailing-edge.com/pdf/ibm/1410/C20-1602-8_1410_pgmCatJun68.pdf
- bitsavers IBM 1410 directory — http://bitsavers.trailing-edge.com/pdf/ibm/1410/  (note: bitsavers.org returns 403 to curl; the trailing-edge mirror serves the same tree)
- bitsavers IBM 1401 directory (RPG manual J24-0215-2) — https://bitsavers.org/pdf/ibm/1401/
- 1410/7010 Autocoder sample job pi.job (PR155) — http://www.sky-visions.com/ibm/7010/pr155/pi.job
- sky-visions 1410/7010 software index (PR-108 tape image, sample jobs) — http://www.sky-visions.com/ibm/ibm7010_soft.shtml
- sky-visions IBM 1410 page (contains the unsupported 7010 "decimal floating point" claim) — https://sky-visions.com/ibm/ibm1410.shtml
- SimH simulator sources (i7010_cpu.c, 7000-series) — https://github.com/simh/simh
- BRL Report 1115 (1961), IBM 704 installations incl. Avco RAD Wilmington — https://ed-thelen.org/comp-hist/BRL61-ibm0704.html
- BRL Report 1115 (1961), IBM 1401 page — https://ed-thelen.org/comp-hist/BRL61-ibm1401.html
- BRL Report 1115 (1961), IBM 7070 page — https://ed-thelen.org/comp-hist/BRL61-ibm7070.html
- BRL 1964 survey index — https://ed-thelen.org/comp-hist/BRL64.html
- Computers and Automation, Computer Census 1962-74 (scan) — https://archive.org/details/bitsavers_computersArCensus196274_16451676  (direct PDF: https://archive.org/download/bitsavers_computersArCensus196274_16451676/_Computer_Census_1962-74.pdf)
- Allen & Eggers, NACA Report 1381 — http://hpp.education/Lessons/MecaSpace/Files/AllenEggers.pdf
- Trisolini et al., arXiv 1910.06397 (DKR correlation, eq.19) — https://arxiv.org/pdf/1910.06397
- Kemp & Riddell, Jet Propulsion 1957 — https://arc.aiaa.org/doi/10.2514/8.12603
- Venkatapathy et al., "Ablators - From Apollo to Future Missions" (NASA Ames) — https://ntrs.nasa.gov/api/citations/20190032222/downloads/20190032222.pdf
- NASA SP-4201, *This New Ocean* — https://www.nasa.gov/wp-content/uploads/2023/02/sp-4201.pdf
- NASM, Mark 4 reentry vehicle A19660029000 — https://airandspace.si.edu/collection-objects/missile-reentry-vehicle-mark-4/nasm_A19660029000
- Cape Canaveral Space Force Museum, heat-sink (Mark 2) nose cone — https://ccspacemuseum.org/artifacts/heatsink-nose-cone/
- Wikipedia, HGM-25A Titan I (lede/body conflict) — https://en.wikipedia.org/wiki/HGM-25A_Titan_I
- Wikipedia, W59 — https://en.wikipedia.org/wiki/W59
- Wikipedia, W56 — https://en.wikipedia.org/wiki/W56
- Wikipedia, AVCOAT — https://en.wikipedia.org/wiki/AVCOAT
- Wikipedia, Arthur Kantrowitz — https://en.wikipedia.org/wiki/Arthur_Kantrowitz
- NAE Memorial Tributes vol.16, Arthur R. Kantrowitz — https://www.nationalacademies.org/read/13338/chapter/26
- Wilmington Town Crier, "Original Avco buildings retired at 65" — https://homenewshere.com/wilmington_town_crier/news/article_caef142a-cbfc-11ec-8ae1-1317a8e0b183.html
- Wikipedia, Operation Match — https://en.wikipedia.org/wiki/Operation_Match
- Harvard Crimson, 3 Nov 1965, Operation Match — https://www.thecrimson.com/article/1965/11/3/operation-match-pif-you-stop-to/
- Stumpf, "Reentry Vehicle Development Leading to the Minuteman Avco Mark 5 and 11," Air Power History Fall 2017 (Gale record; full text 403) — https://go.gale.com/ps/i.do?id=GALE%7CA519403680
- Wikipedia, IBM 1410 — https://en.wikipedia.org/wiki/IBM_1410
- Wikipedia, IBM 1400 series — https://en.wikipedia.org/wiki/IBM_1400_series
- Wikipedia, IBM RPG — https://en.wikipedia.org/wiki/IBM_RPG
- Wikipedia, Runge-Kutta methods — https://en.wikipedia.org/wiki/Runge%E2%80%93Kutta_methods
- ETHW, Early Popular Computers 1950-1970 — https://ethw.org/Early_Popular_Computers,_1950_-_1970
