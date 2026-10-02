# A ballistic reentry, computed on an IBM 1410

This is a walkthrough of the last thing this project built: a program that integrates a reentry
trajectory on an emulated IBM 1410, prints it on an emulated IBM 1403 line printer, punches it onto
92 emulated cards, and then reads those cards back through an emulated RPG job to print a second,
narrower report. It is meant to be read by someone who does not write software. Where the machine
needs explaining, it is explained; there is no TypeScript in here at all.

You can walk it two ways, and both are described below because they are genuinely different
experiences. **At the desk** you get the period machine on screen — a coding sheet, a card reader
with a hopper you watch empty, a console typewriter that types a line every time you turn a knob,
and a printer laying down green-bar paper. **At the command line** you get the same machine with the
furniture taken away, which is faster and prints exactly the same page.

Everything here is a reconstruction. Nothing on the page is flight data, nothing on it came from a
surviving listing, and the page says so on every one of its three sheets. What is *not* invented is
the arithmetic: the machine really does the integration, in fixed-point decimal, one digit at a time,
the way a 1961 program would have.

---

## 1. The short version

The program is `demos/reentry.asm` — **1,195 punched cards** of IBM 1410 Autocoder, which is the
assembly language for that machine. It reads one **case card** carrying the entry conditions, then
integrates the Allen-Eggers ballistic-reentry equations from 150,000 feet down to the ground with a
fourth-order Runge-Kutta method at a quarter-second step. That takes **92 steps**. For each step it
prints one line of twelve columns, and punches one card carrying the same numbers at full precision.

It ends on a programmed halt, and the console typewriter types a line saying so.

The whole run is **52,406 machine instructions** and **19.14 seconds** of 1411 time. It is
compute-bound: the printer would only need about 11.7 seconds for the same paper (600 lines/min,
A22-0526-3 p.67 — 11.6 s at the 116 lines actually printed; 11.7 is the round figure the plan and
the build log both carry).

---

## 2. At the desk

Start the web page with `npm run dev` and open it. The period desk is on the first tab.

### 2.1 What is on the desk before you press anything

- **The coding sheet** — a plain text box where an Autocoder program goes, with a ruler above it
  showing which card columns mean what. Beside it a second box for data cards.
- **The 1402 card reader and punch.** Two feeds. The read feed on the left, drawn as a stack of card
  edges — that is the hopper, and it empties as the machine reads. The punch feed on the right,
  drawn as an outline because the blank-card hopper it draws from is not modelled. Both feeds share
  a strip of keys along the top: READER START, READER STOP, END OF FILE, PUNCH START, PUNCH STOP,
  and a row of lights.
- **The 1415 console** — a Selectric typewriter and a six-position MODE knob: RUN, DISPLAY, ALTER,
  C.E., I/E CYCLE, ADDRESS SET. The typewriter is the operator's log: every knob turn and every key
  press puts a line on the roll.
- **The 1403 printer** with green-bar continuous stock and a toggle that swaps it for plain white.

The punch feed's own caption used to say *"This 1402 reads and does not punch."* As of this program
it does, and the caption now says so — it names the program, the instruction that writes the card
(`P1 0,PAREA`), and the pocket the cards land in.

### 2.2 Load the program

On the coding sheet there are three buttons: `sample program`, `sample data`, and **`sample reentry`**.
Press `sample reentry`. The program box fills with all 1,195 cards of `demos/reentry.asm` and the
data box fills with `demos/reentry.case.cards` — **one card**.

That one card is the whole run's input, and it is worth reading before you press anything else,
because it is the most period-authentic thing on the desk. It carries, in fixed columns:

| what | value | why it is punched rather than computed |
|---|---|---|
| record code | `C` | tells the program this is a case card |
| entry velocity | 23,000 ft/sec | |
| entry angle | `-30.00` degrees | printed on the page exactly as punched |
| entry altitude | 400,000 ft | the table starts lower; see §5.2 |
| sin γ, cot γ | | **this machine has no trigonometry.** An analyst looked them up in a book of tables and punched them. |
| log₁₀ of the entry velocity | | the machine can raise 10 to a power but cannot take a logarithm; punching it is cheaper and exact |
| log₁₀ of the nose radius | | same reason |
| ballistic coefficient W/(C_D A) | 1,000.0 lb/ft² | a **generic** number — see §7.1 |
| nose radius | 1.00 ft | |

The program does not trust the card. Before it integrates anything it proves
**sin²γ (1 + cot²γ) = 1** to the last digit, and it takes each punched logarithm, raises 10 to it,
and checks the answer against the field the logarithm was supposed to describe. If either check
fails it halts and prints a diagnostic rather than integrating a corrupt case.

### 2.3 Assemble it

Press **ASSEMBLE**. The assembler turns 1,195 source cards into **185 object cards** — the machine's
own binary, punched in a condensed format — plus a listing in 1403 format, which appears with the
card faces beside it.

Two numbers on that result matter and are checked by the project's tests: **zero flagged lines** and
**zero warnings**. Zero warnings is not decoration. It is what says the reserved storage areas in
this program sit where the loader's own end-of-deck marker cannot land inside them. If one did, the
program would still assemble, still say `ok`, and then quietly corrupt itself at load time. Only the
warning count sees that, and this project measured the trap: with the print area placed 30 positions
lower, the loader's marker lands inside it, and every other signal stays green.

### 2.4 Punch it into the hopper

Press **PUNCH INTO HOPPER**. **189 cards** fill the 1402's deck box:

    1 bootstrap card
    1 loader body card
  185 object cards
    1 execute card
    1 case card
  ---
  189

Then **PUT DECK IN HOPPER** moves them into the read feed, and the 1402's own two keys ready it:
**READER START**, then **END OF FILE** — with fewer than four cards behind the last one the reader
would otherwise stop Not Ready. Miss PUT DECK IN HOPPER and the bootstrap's first read stops the
machine with an `E` line on the console.

You can watch the hopper: it is drawn as a stack of card edges and it empties one card at a time as
the machine reads.

### 2.5 Key the bootstrap by hand

This is the part that surprises people. The machine does not start itself. At the 1415 console:

1. Press **STOP**.
2. Turn MODE to **DISPLAY**, type `00000`, press **START**.
3. Turn MODE to **ALTER**, key `AL%1000012$R`.
4. Press **COMPUTER RESET**.
5. Turn MODE to **RUN**.
6. Press **START**.

That keyed string is the bootstrap. The `L %10 00012 $` sitting at **00001** reads one card from the
1402 into address **00012** in load mode; the one-character `R` at **00011** then runs with the
I-address (00012-00016) and d-character (00017) that arrived on that very card
(`src/formats/loader.ts:13-17`, C28-0351-5 p.8 Table II). 00001 is where the keyed instruction sits,
not where the card lands. Everything else follows from that card.

The Selectric types a line for each of those actions. Here is the whole roll from the run, which the
project keeps as a fixed file so it cannot drift:

```
S ØØØØ1 ØØØØØ ØØØØØ bb bbb b̲b̲b̲b̲

S ØØØØ1 ØØØØØ ØØØØØ bb bbb b̲b̲b̲b̲
D ØØØØØ
D                                                                                 

S ØØØØ1 ØØØØØ ØØØØØ bb bbb b̲b̲b̲b̲
A AĽ%1ØØØØ12$Ř

S ØØØØ1 ØØØØØ ØØØØØ bb bbb b̲b̲b̲b̲

S Ø7557 Ø7556 Ø6438 .b bbb b̲b̲b̲b̲
```

Each `S` line is the machine reporting where it stopped: the instruction address, the address
registers, and the operation code it stopped on. The first four `S` lines have a **blank** operation
group — they are the STOP key and the knob turns. **The last one has a `.`**, and that is the whole
point of the last thing this project changed: `.` is the 1410's programmed-halt instruction, so the
final line is the machine saying *the program finished*, not *someone stopped me*. Before this phase
the emulator typed nothing on a programmed halt, and there was no way to tell a finished job from a
jammed one by looking at the paper.

The `D` lines are the DISPLAY, the `A` line is the ALTER — the bootstrap you keyed, echoed back.

### 2.6 Watch the paper

The 1402 pulls the whole hopper, the loader lays the program into core, and the 1403 starts printing:
a heading block, three lines of column headings, and then a row for every quarter-second of flight.

At the desk this takes about as long as the 1411 did: roughly **19 seconds**, the machine's own
19.14. The page paces itself by the clock — each animation frame runs only as many instructions as
the 1411 would have run in the time since the last frame, about 46 of them at 60 frames a second —
so the paper feeds out a row every dozen frames or so for the whole run, a little over a thousand frames. The
checkbox labelled `1411 SPEED`, at the right of the tab bar and checked by default, turns that off:
unchecked, the run goes back to a flat 2,000 instructions a frame and is over in 27 frames, a
fraction of a second. There is a note about the time in §8.

### 2.7 Look at the punch feed

92 cards in pocket 0, one per printed row. These are not a copy of the page — they carry the numbers
at full punched precision, unedited, with a record code and a sequence number. They are the
machine-readable intermediate a period shop would have carried down the hall to the next job.

### 2.8 Tear off the paper and read it

Three sheets. §5 reproduces them.

Then **press the plain-white toggle on the 1403** and read the page again on plain stock. Green bar
is right for a five-column report; a twelve-column table is markedly easier to follow on white, and
that is a real finding from this project rather than a preference — it is the question the printer's
white side was built to answer.

### 2.9 The second job — read the punched cards back

Switch to the **RPG sheet**. RPG is the other language this emulator speaks: instead of writing
instructions you fill in specification sheets saying what the input records look like and what the
report should look like, and a generator writes the Autocoder program for you.

Press **`sample reentry summary`**. The spec box fills with `demos/reentry-summary.rpg` — **54
specification cards** — and the data box fills with `demos/reentry-summary.data.cards`, which is
**the deck the 1402 just punched, byte for byte**. No number in that file was typed by a person; it
was produced by decoding the punch pocket, and a test asserts that equality on every one of the
92 × 80 card columns.

Then **GENERATE** (54 spec cards become 196 Autocoder cards), **SEND TO AUTOCODER**, **ASSEMBLE**,
**PUNCH INTO HOPPER**, **PUT DECK IN HOPPER**, READER START and END OF FILE as before.

**Do not key the bootstrap again** — it is still in core. Nothing clears storage between jobs, on
this machine or the real one, so the twelve characters you keyed for the first job are still at
00000-00011. If you try, the machine tells you so: the word mark the bootstrap left at 00001 stops a
DISPLAY of 00000 after one character, and the ALTER that follows opens a field one position wide.
Press **STOP**, **COMPUTER RESET**, turn MODE to **RUN**, press **START**.

Everything else the first job left in core is still there too, word marks included, and that is
not harmless. Before 2026-10-02 the generated program read its cards over a stale word mark the
reentry run had left at 01963, and printed the wrong time on 52 lines of this extract. It now
clears its own card and indicator areas with Clear Storage before reading anything. A period
program had to do the same, or its operator put a Clear Storage card in front of the deck.

This job exists to prove one specific thing. The RPG generator was built in the previous phase
against a sales report with **control breaks** — subtotals when a district or salesman changes. A
trajectory table has no control breaks at all, and the question was whether the generator could omit
that machinery rather than carrying sales-report structure into every program it writes. It can: the
generated program has no control-level indicator, no save area for comparing one record against the
next, and one statement in each of the three control-break sections instead of a ladder. What it
*does* have is a 16-card total-output block for the last-record total, which the earlier demonstration
had nothing of. Both directions are checked — the same test runs over the sales report and requires
the opposite answer.

The extract prints five columns and the cards' **full** precision, which is the argument for having
a second artifact at all: where the trajectory page prints `22,939`, the extract prints `22,939.51`.
The page is edited for a reader; the card is not.

---

## 3. At the command line

Three commands do the same walk with no furniture. Each ends by comparing its output against a
stored copy, so a difference of one byte fails.

```
npm run asm  -- demos/reentry.asm --listing
npm run demo -- demos/reentry.cards --golden test/golden/reentry.page.txt
npm run rpg  -- demos/reentry-summary.rpg --page --golden test/golden/reentry-summary.page.txt
```

The first assembles and prints the listing. The second loads the object deck into a fresh machine,
runs it, and byte-compares the printed page. The third generates the RPG program, assembles it, runs
it over the punched deck, and byte-compares the extract.

Both `npm run demo` and `npm run rpg` drive the machine the same way the desk does, so the console
log they print carries the same final line the Selectric types — the `S` with a `.` operation group.
Until this phase they used a different entry point which skipped the stop print-out entirely, so the
command line ended where the operator's paper does not.

---

## 4. What the machine is actually doing

Worth knowing before you read the page, because it explains the columns.

### 4.1 The physics

The model is **Allen and Eggers, NACA Report 1381** (1958) — the standard closed-form treatment of
ballistic reentry. A body enters a exponential atmosphere at a constant flight-path angle, drag
builds as the air thickens, the body decelerates violently through a short pulse and then falls the
rest of the way slowly. Gravity is neglected against drag through the pulse, which is Allen and
Eggers's own assumption and the reason their closed form exists at all.

The state is velocity and altitude. The program integrates them with **fourth-order Runge-Kutta** at
dt = 0.25 s, which means four evaluations of the derivatives per step, combined with the classical
weights.

The heating columns use the **Detra-Kemp-Riddell** stagnation-point correlation, which came out of
Avco's own Everett laboratory.

### 4.2 The arithmetic

The 1410 has **no floating point** and **no shift instruction**. Every number is decimal digits in a
field of chosen length, with an implied decimal point the *programmer* keeps track of — the machine
does not know where it is. Rescaling is done by moving a field to an address offset by the number of
places you want to shift. Rounding is done by adding 5 at the right position and truncating.

There is exactly **one divide** in the whole program, at start-up, forming a constant. Every other
reciprocal is either punched on the case card or formed by multiplying. Divides cost 5,436
microseconds each on this machine, which is why.

The only function the machine cannot do directly is raising 10 to a power, which the atmosphere,
the closed-form velocity and both heating columns all need. That is done with a **100-entry table**
of 10^(i/100) at a ten-position stride, plus a small quadratic correction for the remainder. It is
accurate to about 2 parts in a million, and the project proved it digit for digit against 100
arguments before anything called it.

---

## 5. The page

Three sheets. The break between sheet 1 and sheet 2 is made by the printer's own carriage tape
punching channel 12 at form line 60 — a physical mechanism, not a line count. The break between
sheet 2 and sheet 3 is a programmed skip.

### 5.1 Sheet 1, as it comes off the printer

The paper is 132 characters wide. Here is the heading block, the column headings and the first five
rows, exactly as the file has them:

```
             BALLISTIC REENTRY TRAJECTORY                               PAGE   1

             ENTRY        VELOCITY  23,000. FT/SEC     ANGLE  -30.00 DEG     ALTITUDE  400,000. FT
             VEHICLE      W/CD A  1,000.0 LB/FT2      BETA SUB B  31.080 SLUG/FT2      NOSE RADIUS  1.00 FT      GENERIC
             ATMOSPHERE   RHO ZERO  .0034000 SLUG/FT3      SCALE HEIGHT  22,000. FT      NACA REPORT 1381 EQ 7
             INTEGRATION  RUNGE KUTTA 4TH ORDER      DT  .25 SEC      TABULATED FROM  150,000. FT

             V A-E IS ALLEN AND EGGERS NACA 1381 EQ 13, TRACKED TO THE LAST PRINTED DIGIT - A REAL REENTRY TO A FEW PCT.
             RECONSTRUCTION - NOT FLIGHT DATA.  GRAVITY IS NOT MODELLED.  NOT A RECORD OF AN ACTUAL RUN.

               TIME  ALTITUDE VELOCITY    V A-E      DIFF    GAMMA   DECEL      DYN    LOG10      HEAT     HEAT   RANGE
                                                                              PRESS    RHO-R      RATE     LOAD
                SEC        FT   FT/SEC   FT/SEC    FT/SEC      DEG       G   LB/FT2        BTU/FT2-SEC  BTU/FT2    N MI

               0.00   150,000   22,939   22,939     0.00    -30.00     1.0      978   -2.805     469.2        0     0.0
               0.25   147,133   22,931   22,931     0.00    -30.00     1.1    1,113   -2.749     500.2      121     0.8
               0.50   144,267   22,921   22,921     0.00    -30.00     1.3    1,267   -2.692     533.1      250     1.6
               0.75   141,402   22,910   22,910     0.00    -30.00     1.4    1,442   -2.635     568.2      388     2.4
               1.00   138,539   22,898   22,898     0.01-   -30.00     1.6    1,641   -2.579     605.3      534     3.2
```

### 5.2 The heading block, line by line

- **ENTRY** — the case card's own numbers, decoded off the page. Entry velocity 23,000 ft/sec, angle
  −30.00°, altitude 400,000 ft.
- **VEHICLE** — the ballistic coefficient and its derived form, the nose radius, and the word
  **GENERIC** at the end. That word is doing real work; see §7.1.
- **ATMOSPHERE** — sea-level density and scale height, the two constants of the exponential
  atmosphere, cited to NACA 1381's equation 7.
- **INTEGRATION** — the method, the step, and where the table starts.

Note the last one. The case card says the vehicle **enters** at 400,000 feet; the table is
**tabulated from 150,000 feet**. Above about 150,000 feet there is effectively no air, so there is
no drag, so nothing changes — a table started at 400,000 would spend a quarter of its rows printing
the same velocity. The program starts the table at 150,000 ft and starts it on the closed-form
curve, at 22,939.51 ft/sec rather than the card's 23,000, because that is where a body that entered
at 23,000 actually *is* by the time it reaches 150,000. Starting at 23,000 instead would put every
row 60 ft/sec off the closed form — 121 times the **published 0.50 ft/s DIFF bound** of plan §4.5
(60.46 / 0.50), which is the comparison `docs/plans/phase-6-reentry.md:677` draws. Against what the
page's DIFF column actually reaches, 0.06 ft/sec, it is nearer a thousand times.

The two framing lines below the block are the disclaimers. They appear on **every** sheet.

### 5.3 The twelve columns

| # | column | what it is |
|---|---|---|
| 1 | TIME | seconds since the table started |
| 2 | ALTITUDE | feet |
| 3 | VELOCITY | ft/sec, from the integration |
| 4 | V A-E | ft/sec, from Allen and Eggers's **closed form** — the same instant computed a completely different way |
| 5 | DIFF | column 3 minus column 4. See §6. |
| 6 | GAMMA | flight-path angle, constant by assumption, printed exactly as punched |
| 7 | DECEL | deceleration in g |
| 8 | DYN PRESS | dynamic pressure, lb/ft² |
| 9 | LOG10 RHO-R | log₁₀ of density ratio — the atmosphere the row was computed in |
| 10 | HEAT RATE | stagnation-point heating, BTU/ft²-sec (Detra-Kemp-Riddell) |
| 11 | HEAT LOAD | the running integral of column 10, BTU/ft² |
| 12 | RANGE | nautical miles down-range |

### 5.4 The peak

The interesting rows are in the middle of sheet 1, where the deceleration pulse peaks:

```
              10.25    41,078   15,855   15,855     0.00    -30.00    66.1   66,055   -0.655   1,742.7   15,123    31.0
              10.50    39,130   15,318   15,319     0.03-   -30.00    67.4   67,368   -0.616   1,634.3   15,545    31.6
              10.75    37,249   14,773   14,773     0.02-   -30.00    68.2   68,246   -0.579   1,521.5   15,939    32.1
              11.00    35,437   14,222   14,222     0.02-   -30.00    68.7   68,681   -0.544   1,406.5   16,305    32.6
              11.25    33,693   13,669   13,669     0.03-   -30.00    68.7   68,678   -0.509   1,291.6   16,643    33.1
```

68.7 g at 35,437 feet, 11 seconds in. Dynamic pressure peaks in the same neighbourhood at
68,681 lb/ft². Heat rate peaked earlier, at 8.25 s, because heating goes as velocity cubed and by
the time the air is thick the vehicle has already slowed.

### 5.5 The last rows, and where it stops

```
              21.75     1,322    2,385    2,385     0.03    -30.00     9.1    9,107    0.129      11.0   19,479    42.3
              22.00     1,028    2,313    2,313     0.00    -30.00     8.7    8,684    0.135      10.0   19,482    42.4
              22.25       743    2,245    2,245     0.01    -30.00     8.3    8,286    0.140       9.2   19,484    42.5
              22.50       467    2,180    2,180     0.01    -30.00     7.9    7,911    0.146       8.4   19,487    42.6
              22.75       198    2,118    2,118     0.00    -30.00     7.6    7,558    0.151       7.7   19,489    42.7
```

The program stops there because the next step would put it at −62.3 feet. There is a guard for
exactly that: it computes the candidate step, sees the altitude go negative, refuses it, and prints
the summary instead of a 93rd row.

### 5.6 Sheet 3 — the summary block

```
             BALLISTIC REENTRY TRAJECTORY                               PAGE   3
             RECONSTRUCTION - NOT FLIGHT DATA.  GRAVITY IS NOT MODELLED.  NOT A RECORD OF AN ACTUAL RUN.

             SUMMARY

             MAXIMUM DECELERATION       68.7 G    ALTITUDE  35,437 FT   TIME  11.00 SEC   VELOCITY  14,222 FT/SEC
               NACA 1381  EQ 17         68.7 G     EQ 15 IS IN THE WALKTHROUGH      EQ 16 VELOCITY  13,950 FT/SEC
             MAXIMUM HEAT RATE       2,227.4 BTU/FT2-SEC    ALTITUDE  58,869 FT   TIME   8.25 SEC
             TOTAL HEAT LOAD          19,489 BTU/FT2      DKR IS PLUS OR MINUS 10 TO 20 PCT
             MAXIMUM DIFFERENCE VELOCITY MINUS V A-E       0.06 FT/SEC

             END OF RUN.   92 STEPS.  RECONSTRUCTION - NOT FLIGHT DATA.
```

Everything on that sheet has to be carried in working storage as the run proceeds, because the 1403
prints **forward** and the deck makes exactly **one pass** over the trajectory. The peak
deceleration row cannot be known when the heading prints. That is why the summary is on the last
sheet and not the first — not a layout preference, an arithmetic constraint.

The `NACA 1381 EQ 17` line is the closed form's own prediction of the peak deceleration, printed
beside the number the integration produced: **68.7 against 68.7**. `EQ 16 VELOCITY 13,950` is the
closed form's prediction of the velocity at that peak, against the integration's 14,222 — a
difference of 272 ft/sec, which is less than one integration step's worth of deceleration, so the
two agree to within the resolution of the grid.

`EQ 15 IS IN THE WALKTHROUGH` is not a joke, and §7.5 explains it.

### 5.7 The RPG extract

The second job's report, first rows and last:

```
                          BALLISTIC REENTRY TRAJECTORY SUMMARY          PAGE   1
                             RECONSTRUCTION - NOT FLIGHT DATA

                TIME             ALTITUDE           VELOCITY             DECEL          HEAT LOAD

                0.00            150,000.0          22,939.51               1.0               0.00
                0.25            147,133.1          22,931.11               1.1             121.18
                0.50            144,267.3          22,921.55               1.3             250.36
                0.75            141,402.8          22,910.66               1.4             388.04
                1.00            138,539.7          22,898.27               1.6             534.74
```

```
               22.25                743.9           2,245.43               8.3          19,484.89
               22.50                467.3           2,180.30               7.9          19,487.10
               22.75                198.7           2,118.10               7.6          19,489.13
                    ROWS TABULATED     92                      FINAL HEAT LOAD          19,489.13  ***
```

Five columns, 92 rows, full punched precision, and the reconstruction line on both of its sheets.

---

## 6. Column 5, and why it is the point of the whole exercise

Column 4 is not a copy of column 3. It is the same instant of the same trajectory computed a
completely different way: column 3 comes from stepping the differential equations forward 92 times
in fixed-point decimal, and column 4 comes from evaluating Allen and Eggers's closed-form expression
for velocity at that altitude directly.

Column 5 is the difference, printed on every row.

**Worst value over the whole run: 0.06 ft/sec.** The vehicle decelerates through 20,821 ft/sec. So
the machine's own accumulated arithmetic error — 92 steps of four-stage Runge-Kutta, every one of
them done in decimal digits with hand-managed decimal points and a table-driven exponential — comes
to about three parts in a million of the quantity being computed.

That is the number a 1961 analyst would have looked at first, and it is why the column is on the
page. A program that showed you its answer and not its error was a program you had to trust. This
one shows its work.

Two smaller honesty checks ride on the same column. The signed values are genuinely signed — the
minus sign trails the number, which is how this printer's edit words place it, so `0.01-` on row 5
means the integration is one hundredth of a foot per second **below** the closed form. And the
project's tests require that the printed DIFF equals the printed VELOCITY minus the printed V A-E on
every row, to the rounding of the printed fields — so the column cannot be a separately computed
number that happens to look plausible.

---

## 7. Everything about this that is a reconstruction

This section is the point of the document. The artifacts carry what they can carry; three things
they cannot, and they are stated here.

### 7.1 The column layout is period-plausible and undocumented

**No Avco trajectory listing has surfaced.** The twelve *quantities* in the table are constrained by
the physics — every one is a state variable or a one-line function of one, and the set comes from
the research file's own list. But the **arrangement** — which column sits at which of the 132 print
positions, what the headings say, how many digits each field prints — is this project's design and
nothing more. It is period-plausible. It is not documented.

If a period 1410 or 704/7090 trajectory listing ever surfaces, the fix is one commit: re-cut the two
page files and one table of print positions. No arithmetic changes, because none of the physics
knows or cares where a column sits.

The same applies to the punched card's 80-column layout, and to the case card's. No period
trajectory summary card and no period case-card layout survive.

### 7.2 RK4 as period practice at Avco is unverified — and was chosen by measurement instead

An earlier draft of this project's research said that fourth-order Runge-Kutta was standard practice
for period trajectory programs. **That claim has no Avco source and has been dropped.** It is not
asserted anywhere on the page or in this document.

RK4 is in the program for a different and checkable reason: it was chosen because of the **measured**
worst-case difference between the integrated velocity and the closed form, across candidate
integrators. That is column 5, and it is on the page. The heading prints the method so the reader
knows what produced the numbers; it does not claim the method is what Avco used.

### 7.3 Detra-Kemp-Riddell is itself accurate only to ±10-20 %

Columns 10 and 11 are a **correlation**, not a solution. Detra, Kemp and Riddell's stagnation-point
heating expression is an engineering fit, and its own stated accuracy is **plus or minus 10 to 20
per cent**. That sits on the page, beside the heat columns, in the summary block:
`DKR IS PLUS OR MINUS 10 TO 20 PCT`.

So the four significant digits in HEAT RATE are not four significant digits of physical truth. They
are four digits of *this correlation, evaluated exactly*. The precision in the column is the
machine's; the accuracy is the correlation's, and the correlation's is much worse. Both are stated
so neither can be mistaken for the other.

A second, smaller caveat rides on the same columns: this project tags the correlation `[likely]`
rather than `[verified]`, one step below its own research file, deliberately. The source actually
read is a modern paper restating Detra, Kemp and Riddell; the 1957 *Jet Propulsion* original has not
been read, and this project reserves `[verified]` for a document someone actually opened.

### 7.4 Three facts the page and the deck both carry, stated here as well

These three appear in the program's own comment block, on the printed artifact, and here, because
each is a claim about the machine that a reader could otherwise get wrong:

1. **There is no published IBM 1410 fixed-point scaling standard.** IBM never issued a 1410 numeric
   conventions manual, and the Principles of Operation manual deliberately has no fixed decimal
   point: the machine is variable-field-length and the programmer owns the point. So the table of
   scale factors this program uses is **the project's own design**, and there is no authority to
   check it against. That absence *is* the disclosure — this document and the program's comment
   block are the first two places it has ever been written down in this project.
2. **The 132 print positions are the IBM 1403 Model 2's**, cited to IBM form **A22-1407-2, pages
   5-8** — the manual, not the emulator's own constant. That distinction matters: the emulator
   agreeing with itself is not evidence.
3. **Detra-Kemp-Riddell is ±10-20 %**, above, and it prints beside the heating columns.

### 7.5 Two things the artifacts cannot say, and this document must

**Equation 15's number is not on the page, and it never can be.** NACA 1381's equation 15 gives the
altitude of peak deceleration in closed form: y₁ = ln(2K)/β. It needs a **natural** logarithm. This
machine has a decimal antilog table and the case card carries base-10 logarithms; there is no way to
compute a base-e logarithm in this deck, and adding one would cost a table the memory map does not
have for a single printed figure. So the summary prints `EQ 15 IS IN THE WALKTHROUGH`, and here it
is:

> **Equation 15 predicts peak deceleration at 34,570.1 feet.** The page's peak-deceleration row is
> at **35,437 feet**. The difference is 867 feet, and one integration step at that point covers
> 1,778 feet — so the closed form and the integration agree to within the resolution of the grid,
> which is the best agreement that is meaningful.

**The sequence number on the punched cards wraps.** Each punched card carries a two-digit sequence in
its last columns, and that number is the step counter **modulo 100**. This run has 92 steps, so it is
correct here. A case card that produced more than 99 rows would wrap the sequence while the step
counter kept going, and two cards would carry the same sequence. The card contract has no free column
for a third digit and the deck is frozen, so this is a documented limit of this case rather than a
defect — but anyone who changes the case card should know it.

### 7.6 And the thing that is not a caveat: the arithmetic is real

Everything above is about provenance. None of it is about the numbers. The machine really executes
52,406 instructions; the multiply really takes 2.37 milliseconds; the antilog table is really fetched
by computed index; the 92 rows really come out of 92 Runge-Kutta steps. Six independent checks stand
behind the page, including the closed form on every row, four NACA checkpoints, and a
double-precision reference implementation that shares no code with the emulator at all.

---

## 8. How long it took the machine, and what that means

The 1411 in this configuration runs unaccelerated at 4.5 microseconds per character cycle. The
optional Accelerator is **not** assumed.

```
instructions executed          52,406
emulated 1411 time             19,143,154.5 us   =  19.14 s
1403 printing, 600 lines/min (A22-0526-3 p.67)      11.7  s
```

So this job is **compute-bound by about a third**: the machine spends more time thinking than the
printer spends printing.

That is worth stating plainly because this project inherited the opposite claim. An earlier design
sketch — with far fewer multiplies per row — concluded the job would be printer-bound, and that
conclusion was carried forward in the project's own documents. It does not survive the program that
was actually built. Twelve columns, six antilog calls per row and four Runge-Kutta stages cost more
than 92 lines of paper.

At the desk the run takes about that long. The page paces the frame by the real clock at one
emulated microsecond per real one: each frame runs the instructions the 1411 would have run since
the previous frame (the run's average is 365 microseconds an instruction, 19,143,154.5 over 52,406,
so about 46 per frame at 60 Hz, and the same wall-clock time on a 120 Hz display at half the budget).
Two guards keep it honest: a frame never runs more than 2,000 instructions, and a frame delta is
capped at 100 ms so a backgrounded tab does not dump seconds of flight onto the paper when you come
back. Pausing the desk banks no time either.

Uncheck `1411 SPEED` and the pacing is gone: 2,000 instructions a frame, 27 frames, a fraction of a
second. That was the desk's only behaviour before the pacing went in. The
pacing is a ruling of this project's, not a 1411 fact — the 1411 did not have a frame rate — and it
is tested by a text scan over the source, which proves the clamp and the single call site are there,
not that the paper takes 19 seconds; time it with a stopwatch.

---

## 9. `demos/hello-dad.asm`, and what it is not

The **first** sample button on the coding sheet is still `sample program`, and it still loads
`demos/hello-dad.asm`. That was the first thing this project ever printed, and it is worth being
precise about what it is, because its title is `HELLO DAD - REENTRY TABLE` and a reader could
reasonably mistake it for computed output.

**It computes nothing.** It is a nineteen-card program whose entire job is: read a card, print it,
read the next card, print it, stop. Five data cards go in and five printed lines come out — a title,
a column heading, and three rows. The rows are:

```
0.0        400000        23100          0.1       0.0
20.0       248500        22850          2.4       45.0
40.0       152300        19640          28.7      610.0
```

**Those numbers are invented illustrative values.** They were typed by hand to look like a trajectory.
They are not a trajectory. Compare the third row against the real integration: hello-dad says that at
t = 40.0 s the vehicle is at 152,300 feet doing 19,640 ft/sec. The actual integration, at the
essentially identical altitude of 150,000 feet, gives **22,939.51 ft/sec** — and gets there at t = 0
of its own table, not at t = 40.

This is said here explicitly because it is the one place this project could tell a lie by omission.
A file called `HELLO DAD - REENTRY TABLE` sitting on the same desk as a real reentry table, with five
printed lines under a title that promises the same thing, is exactly the artifact a reader would
misread. **Five hand-typed lines beside the ninety-two the machine computes** — and the difference
between them is the whole project.

---

## 10. The Avco question

This project exists because a family member, early in the computer industry, worked at Avco on reentry
vehicles and analysed trajectory output produced on an IBM 1410. That analyst did not write the
programs, only read what they printed. The showcase is an attempt to put a page in front of that
reader that looks like the pages they read.

For most of this project's life its own research file said, flatly, that **no IBM 1410 was ever
installed at Avco** — and the Phase 6 plan hardened that into a line the showcase printed on every
sheet. That statement has been **withdrawn**, and the withdrawal is worth recording properly because
it is the single most important correction in the project.

**What the documents say.** The BRL 1961 survey of American computer installations records Avco RAD
at 201 Lowell St., Wilmington, Massachusetts running an **IBM 704** from August 1958 with a workload
spelled out in unusual detail — *"systems of ordinary and partial differential equations
(trajectories, aerodynamic flow, heat transfer, stress analysis, variational problems (optimization
of trajectories), data processing, etc.)"* — three shifts, eighteen programmers, $54,000 a month.
The same survey records a planned Philco Transac. By 1965 an Avco service bureau in Wilmington ran a
7090 with an **IBM 1401** print satellite beside it — `[likely]`, from Wikipedia's Operation Match
and the *Harvard Crimson* (`avco-and-reentry.md:50`), not a primary source. Neither BRL survey, nor the *Computers and
Automation* census, nor the open web records a 1410 at any Avco site.

**What the participant says.** A family member remembers **being in the room with the 1410 and using
it.**

**How this project weighs those.** The testimony wins, and the reasoning is documentary rather than
deferential:

1. **The BRL surveys are not a census of what existed.** They record the sites that *responded*. A
   machine at a division office that filed no return is invisible to them.
2. **The dates barely overlap.** The 1410 was announced 12 September 1960 and first shipped in 1961
   — `[likely]`, not `[verified]`: `avco-and-reentry.md:101` has this from Wikipedia alone, because
   the IBM history page returns 403.
   BRL Report 1115 was compiled in 1961. An installation arriving in 1962-63 misses both surveys
   without either being wrong.
3. **1400-series iron is independently documented on site** — the Wilmington 1401 above is precisely
   the lineage a 1410 sits in.

So the honest statement is **not** "no 1410 is documented at any Avco site". It is: **a 1410 was
there, on first-hand testimony; the surveys consulted do not record it; and which site, which years,
and what it was used for are still open** — in particular whether it ran trajectory work itself or,
like the 1965 print satellite, served the larger machines.

**`[testimony]`** was introduced as a provenance label for this, and it is worth understanding what
it does and does not mean. It is not one of this project's research confidence tags. It does not
outrank `[verified]`, which is reserved for a primary document someone opened. It records a
different *kind* of source: a first-hand account from an identified participant, recorded as such. The
project's brief already established that this recollection is the only source for the
original workflow at all; this is that same source, on a narrower question.

**What the page claims.** Nothing, in either direction, about which machines were installed where.
The framing lines say only that this is a reconstruction, that gravity is not modelled, and that
**no printout of an actual run survives** — which is the half that was always doing the work and is
still true.

**What would settle the open half:** Textron corporate archives, an Avco RAD or AERL internal
directory, a *Datamation* or *Computers and Automation* new-installations column for 1962-64, or a
site-level equipment inventory.

---

## 11. Where everything lives

| what | file |
|---|---|
| the trajectory program | `demos/reentry.asm` — 1,195 Autocoder cards |
| the case card | `demos/reentry.case.cards` — one card |
| the object deck as punched | `demos/reentry.cards` — 189 cards |
| the antilog probe | `demos/probe-antilog.asm` — the table proved on its own before anything used it |
| the punched output | `demos/reentry-summary.data.cards` — 92 cards, decoded from the punch pocket |
| the RPG specification deck | `demos/reentry-summary.rpg` — 54 cards |
| the printed page | `test/golden/reentry.page.txt` — 13,488 bytes, three sheets |
| the extract | `test/golden/reentry-summary.page.txt` — 9,648 bytes, two sheets |
| the console roll | `test/golden/reentry-console.txt` — 382 bytes |
| the double-precision reference | `test/fixtures/reentry-reference.ts` — imports nothing from the emulator, on purpose |
| the build record | `docs/BUILD-LOG-6.md` |
| what was left open | `PHASE-6-NOTES.md` §4 |
| the research behind the physics | `docs/research/avco-and-reentry.md` |

Every one of the three stored pages is **constructed by this project**. None is a scan or a
transcription of an IBM document, because no Avco trajectory listing survives and none is documented.
That is stated in the build record, in the tests, and on the artifacts themselves.
