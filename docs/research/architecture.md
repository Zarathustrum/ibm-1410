# IBM 1410 — Core Architecture (implementer reference)

## Implementer summary

1. The 1411 CPU is a variable-word-length, character-addressed decimal machine: each storage position = 6 BCD bits (B A 8 4 2 1) + word-mark bit + odd-parity check bit over BA8421+WM; 64 code points, collating blank(00) → 9(63). [verified]
2. Storage is 10K/20K/40K/60K/80K positions (Models 1–5); addresses are always 5 decimal characters, 00000..N-1, with **no** zone encoding of magnitude — zones over the tens and hundreds positions instead tag one of 15 index registers held in core at 00025–00099. [verified]
3. Instructions are 1/2/5/6/7/10/11/12 characters; length is determined not by the op code but by scanning until the word mark on the **next** instruction's op code; the op char must carry a WM and no other character in the instruction may. Short forms chain (reuse AAR/BAR/op-modifier from the previous op). [verified]
4. Arithmetic is add-to-storage, right-to-left from the units position, length governed by the **B-field** word mark; sign lives in the units-position zone bits (B-only = minus; none/BA/A-only = plus; machine writes BA for plus, B for minus). [verified]
5. Indicators (overflow, divide overflow, zero balance, high/equal/low/unequal) are sticky latches with op-specific reset rules; the optional Priority feature interrupts to 00101 between instructions. There is **no** storage protection on the 1410. [verified]

---

## 1. Storage

| Model | Positions | Notes |
|---|---|---|
| 1 / 1A | 10,000 | |
| 2 / 2A | 20,000 | |
| 3 / 3A | 40,000 | |
| 4 / 4A | 60,000 | |
| 5 / 5A | 80,000 | |

"A" suffix = fifth (E) frame. Core cycle 4.5 µs per character; 4.0 µs with the 1410 Accelerator feature (timing only, no semantic change). [verified — A22-0526-3 p.5, p.96]

Address space is flat and byte- (character-) addressed; there is no segmentation, no relocation, and **no storage protection** on the 1410. The 1410 PrincOps (both A22-0526-3 and the May-63 A22-0526) have no storage-protection section. The base 7010 PrincOps (A22-6726) has none either — the only source treating storage protect as a 7010 feature is Cornwell's SimH `i7010` (`SET CPU PROT`, low/high bounds + reloc flag in `i7010_cpu.c`), a secondary source with no IBM primary located. For a 1410 emulator: implement no protection at all. [verified for the 1410; 7010 protect = likely, secondary-source only]

Reserved low core:

| Range | Use |
|---|---|
| 00000 | valid only for incrementing operations |
| 00025–00099 | index registers IR1..IR15 (5 chars each) |
| 00101 | Priority-feature interrupt entry point |
| 00001 | IAR value after program reset / computer reset |

[verified — A22-0526-3 p.8, p.14; A22-0530-1 p.3]

## 2. Character format

Bits per position: **B A 8 4 2 1** (BCD), plus **WM** (word mark) and **C** (check). Parity is odd, computed over BA8421 **plus the WM bit** — so setting or clearing a word mark flips the check bit. [verified — A22-0526-3 p.5]

Examples from p.5: `A` (BA1) no WM → no C bit (3 bits, odd); `A` with WM → C added (WM+B+A+1 = 4 bits, even → C); `C` (BA21) no WM → C added; `X` (A421) with WM → no C. [verified]

64 code points. Collating sequence ascends blank (00) → 9 (63); Figure 2 (p.6) gives every character, card code and bit pattern. Control characters an emulator must special-case: [verified — A22-0526-3 p.6]

| Char | BCD bits | Card code | Role |
|---|---|---|---|
| blank | (none) | (none) | collates lowest; digit value 0 in arithmetic |
| record mark ‡ | A 8 2 | 0-2-8 | record delimiter for left-to-right moves |
| group mark ⧧ | B A 8 4 2 1 | 12-7-8 | with WM (GM-WM) terminates I/O records |
| word separator ~ | C A 8 4 1 | 0-5-8 | tape WM representation in load mode |
| substitute blank | C A | 2-8 | digit value 0; punches to and reads back from a card as 8-2 on the 1410 (see §13) |
| & | C B A | 12 | digit value 0 |
| - | B | 11 | digit value 0; also the minus sign zone |

## 3. Word marks

Three functions: (1) mark the first character (op code) of an instruction, (2) define the size of a data field, (3) signal the end of an instruction (the WM on the following op code stops instruction read-out). [verified — A22-0526-3 pp.7–8]

Word marks persist until changed by clear storage, Clear Word Mark, Set Word Mark, or a data move whose d-character specifies WM transfer. The WM bit is never seen by compare (C) or by branch-if-character-equal (B); those use BA8421 only. [verified — pp.7–8, p.28, p.38]

## 4. Addressing

Addresses are 5 characters. Valid magnitudes 00000 through 79999 (80K system). Unlike the 1401, **no zone bits encode address magnitude** — five decimal digits reach the whole space directly. [verified — A22-0526-3 p.8]

Validity rules an emulator must enforce (address check stop otherwise):

- Zone bits are legal **only** in the tens and hundreds positions, where they are index tags. Zone bits in the units, thousands or ten-thousands positions make the address invalid. [verified]
- Every position must have a numeric total of 0–9. Characters like `&`, `$`, `#` cause an address check. Legal tens/hundreds characters: numerals, letters, and `/ ? ! ‡`. [verified]
- 00000 is always valid for incrementing operations; addressing 00000 in a **decrementing** operation stops with an address check — no exceptions. [verified]
- For incrementing operations the highest usable position is (top − 1), e.g. 59998 on 60K; the top address itself (59999) causes an address check **except** for console display/alter and read/write "to end of core" I/O. The top address is valid for decrementing operations. [verified — p.8]
- On a 10K system the high-order position of an address being indexed must contain zero. [verified — p.15]

## 5. Index registers and tagging

Fifteen index registers, five characters each, living in ordinary core: IRn occupies **00020+5n through 00024+5n** (IR1 = 00025–00029 … IR15 = 00095–00099). They are plain storage — programs can read/write them with any instruction. [verified — A22-0526-3 p.14 Fig. 9]

Tag = zone bits over the address's tens and hundreds positions:

| B over hundreds | A over hundreds | B over tens | A over tens | Index register |
|---|---|---|---|---|
| | | | | none |
| | | | A | 1 |
| | | B | | 2 |
| | | B | A | 3 |
| | A | | | 4 |
| | A | | A | 5 |
| | A | B | | 6 |
| | A | B | A | 7 |
| B | | | | 8 |
| B | | | A | 9 |
| B | | B | | 10 |
| B | | B | A | 11 |
| B | A | | | 12 |
| B | A | | A | 13 |
| B | A | B | | 14 |
| B | A | B | A | 15 |

Weights: A-over-tens = 1, B-over-tens = 2, A-over-hundreds = 4, B-over-hundreds = 8. [verified — A22-0526-3 p.14 Fig. 10]

Indexing semantics: [verified — A22-0526-3 pp.14–15]

- The A-, B- and I-addresses of an instruction can each be tagged independently.
- The 5-digit index factor is added **algebraically** to the address *after* the address enters the address register and before execution. The instruction image in storage is never modified.
- The factor's sign comes from the zone bits of its own units position (B = minus; none or BA = plus).
- Word marks anywhere in 00025–00099 are ignored during indexing.
- Zone bits in the index register are left undisturbed and ignored except in the units (sign) position.
- Overflow during index addition does **not** set the arithmetic overflow latch.
- The result must be a valid address; otherwise the machine stops on an address check. Whether an out-of-range indexed result wraps or hard-stops on 20K/40K/60K systems is not spelled out beyond "the system will stop on an error". [unverified]
- x-control fields (I/O) and G (Store Address Register) instructions cannot be indexed. [verified — p.11, p.22]
- Cost: 34.5 µs per address indexed (30.67 µs with the Accelerator). [verified — p.15]

Worked example from p.15: A-address `009Z6` = 00996 tagged IR1; IR1 contains `0001J` = −00011; effective address = 00985. [verified]

## 6. Registers

| Register | Width | Purpose |
|---|---|---|
| IAR | 5 | instruction address; steps +1 per character read during read-out |
| AAR | 5 | A-address / operand pointer |
| BAR | 5 | B-address / operand pointer; also holds the I/O address in non-overlapped I/O |
| CAR | 5 | used by Store Address Register (G), multiply, divide, table lookup; not programmer-visible except via G |
| DAR | 5 | multiply / divide / recomplement scratch |
| EAR / FAR | 5 | channel 1 / channel 2 I/O address registers (overlap feature) |
| STAR | 5 | storage address register — every core access goes through it |
| A-data | 8 | BCD + C + WM; loaded from B-data register when needed |
| B-data | 8 | BCD + C + WM; loaded on every read-out, written back on regeneration |
| Op | 7 | op code, WM bit dropped |
| Op-modifier | 7 | d-character |
| Channel select | 1 | from the hundreds position of the x-control field |
| Unit select / Unit number | 1 each | per channel, from tens / units of x-control |
| E1, E2 / F1, F2 | 1 each | channel 1 / channel 2 data registers |

[verified — A22-0526-3 pp.8–10, Fig. 5; p.92]

Address characters are translated to **two-out-of-five code** on entry to an address register (more or fewer than two bits set = address channel error) and retranslated to BCD when stored out by G. An emulator holding addresses as JS numbers should still model the "invalid character" error path from §4. [verified — pp.8–9]

IAR detail: at the start of read-out IAR holds the op-code address; it increments once per storage cycle during read-out; at the end of read-out it holds the address of the next sequential instruction (NSI). It changes by (1) console load, (2) normal stepping, (3) a successful branch — the branch address **plus one** replaces IAR during read of the branched-to instruction, (4) program/computer reset → 00001. [verified — p.8]

AAR/BAR detail: hold the units (rightmost) position of a data field normally. After each character is processed the register decrements by one (field addressed at its low-order end) or increments by one (addressed at its high-order end — left-to-right record moves and I/O). [verified — p.8]

## 7. Instruction format and length

| Form | Characters |
|---|---|
| O | 1 |
| O d | 2 |
| O xxx d | 5 |
| O aaaaa | 6 |
| O aaaaa d | 7 |
| O xxx bbbbb d | 10 |
| O aaaaa bbbbb | 11 |
| O aaaaa bbbbb d | 12 |

[verified — A22-0526-3 p.11]

Fields: op (1 char), A-address or I-address (5) or x-control field (3), B-address (5), d-character (1).

**How length is determined:** read-out starts at the op code (which must carry a WM) and continues character by character until a word mark is encountered — that WM belongs to the next instruction's op code. The instruction itself must contain no interior word marks. The resulting length is then validity-checked against the op code; an illegal length lights Instruction Check. [verified — p.11]

x-control field (I/O ops M, L, U, F, …): hundreds char selects channel and overlap mode (`%` = ch1 non-overlap, `@` = ch1 overlap, `⌑` lozenge = ch2 non-overlap, `*` = ch2 overlap); tens = device type (1 reader, 2 printer, 4 punch, U tape, T console printer, B tape odd-parity, F disk); units = unit number or specific operation. [verified — pp.11, 14, 92, 105 Fig. 107]

## 8. Chaining

- A **1-character** instruction reuses AAR and BAR exactly as the previous operation left them. Example (p.12): `A 05985 06985` with LA=5, LB=6 leaves AAR=05980, BAR=06979; a following bare `S` subtracts the field at 05980 from the field at 06979. [verified]
- For two-address ops that take a d-character (D, W, B, V, T), a **6-character** form supplies only the A/I-address, chains the B-address, and reuses the **last previous operation modifier**. [verified — pp.12, 25, 30, 38]
- An **11-character** instruction (two addresses, no d) **blanks the op-modifier register** — so a chained instruction after it gets a blank d. This is a real trap for chained move/branch sequences. [verified — p.12]
- Under the Priority feature, chained (short-form) instructions are **not** interruptible; see §11. [verified — A22-0530-1 p.4]

## 9. Instruction set: register effects and op characters

| Op char | Form | Function | IAR / AAR / BAR after | Page |
|---|---|---|---|---|
| A | A (A)(B) / A (A) | Add two fields / one field | NSI / A−LW / B−LB ; NSI / A−LA / A−LA | 17 |
| S | S (A)(B) / S (A) | Subtract | as Add | 17–18 |
| ? | ZA (A)(B) / (A) | Zero and add | NSI / A−LW / B−LB | 18 |
| ! | ZS (A)(B) / (A) | Zero and subtract | NSI / A−LW / B−LB | 18–19 |
| @ | M (A)(B) | Multiply | NSI / A−LA / B−LB | 19 |
| % | D (A)(B) | Divide | NSI / A−LA / tens pos of quotient | 20 |
| G | SAR/SBR/SER/SFR (C) d | Store address register (d = A,B,E,F); not indexable | NSI / Ap / Bp | 22 |
| , | SW (A)(B) | Set word mark | NSI / A−1 / B−1 | 22 |
| ⌑ | CW (A)(B) | Clear word mark | NSI / A−1 / B−1 | 22 |
| / | CS (B) ; CS (I)(B) | Clear storage to hundreds boundary ; and branch | NSI / B / bbb00−1 ; NSIB / BI / NSIB | 23 |
| . | H ; H (I) | Halt ; halt and branch | NSI/Ap/Bp ; NSIB/BI/NSIB | 23 |
| N | NOP | No operation, any length | NSI / Ap / Bp | 24 |
| D | Mxxx (A)(B) d | Move / scan (64 d variants) | per Fig. 20 | 25 |
| Z | MCS (A)(B) | Move characters and suppress zeros | NSI / A−LA / B+1 | 27 |
| C | C (A)(B) | Compare B to A | NSI / A−LW / B−LW | 28 |
| T | Lxx (A)(B) d | Table lookup | NSI / A−LW / function addr | 30 |
| E | MCE (A)(B) | Move characters and edit | — (rules not captured) | 31 |
| J | B (I) ; Bxx (I) d | Branch unconditional / conditional | NSIB/BI/NSIB ; no branch NSI/BI/BI | 36 |
| R / X | Bxx (I) d | Branch if I/O channel status, ch1 / ch2 | as J | 37 |
| B | BCE (I)(B) d | Branch if character equal | NSIB/BI/NSIB ; no branch NSI/BI/B−1 | 38 |
| W | BBE (I)(B) d | Branch if bit equal | as B | 38 |
| V | BW/BZN/BWZ (I)(B) d | Branch if word mark and/or zone | as B | 38–39 |
| M / L | M or L xxx (B) d | Move-mode / Load-mode I/O | — | 40+ |
| U | U xxx d | Unit control (tape etc.) | — | 85 |
| F / 2 | F d / 2 d | Carriage control ch1 / ch2 | — | 81 |
| K / 4 | K d / 4 d | Select stacker and feed ch1 / ch2 | — | 62 |
| Y | Y (I) d | Priority test and branch (Priority feature) | — | A22-0530-1 pp.7–8 |

[verified — A22-0526-3 pp.17–39, 101–105; A22-0530-1 pp.7–8]
LW = length of the shorter field; LA/LB = length of the A/B field; Ap/Bp = previous contents; NSIB = address of the next sequential instruction had the branch not been taken.

**Branch register mechanics** [verified — pp.12–13, 36]:
- Branch taken: after read-out IAR has stepped to NSIB; that NSIB is transferred to **BAR**; AAR holds the branch address, which moves into STAR to read the branched-to instruction; IAR becomes branch address + 1. Consequence: a `G (C) B` at the head of a subroutine captures the return address.
- One-address conditional branch not taken: IAR = NSI, AAR = BAR = BI.
- Two-address branch (B/W/V) not taken: IAR = NSI, AAR = BI, BAR = B−1 — deliberately positioned so a chained retest walks the next lower position.
- Unconditional `J (I)` with blank d: IAR = NSIB, AAR = BI, BAR = NSIB.

## 10. Arithmetic, signs and indicators

Model: **add to storage**, no accumulator. Fields are addressed at their units (rightmost) position and processed right to left.

**Field length governance** (A, S, ZA, ZS, two-field forms) [verified — pp.17–18]:
- The **B-field word mark** ends the operation and defines the length.
- The A-field needs a word mark only if it is shorter than B; then zeros are added/subtracted (or zeroed, for ZA/ZS) into B's remaining high-order positions up to and including B's WM position.
- If A is longer than B, the excess high-order A positions are simply not processed — not an error.
- B-field zone bits are preserved except in the sign (units) position. A-field zone bits are ignored except in the units position.

**Sign encoding** (units-position zone bits) [verified — p.16 Fig. 11]:

| Sign | BCD zone bits | Card zone |
|---|---|---|
| Plus | none | no zone |
| Plus | B and A | 12 |
| Minus | B only | 11 |
| Plus | A only | 0 |

When the machine generates or changes a sign it writes **B+A for plus, B for minus**.

**Add/subtract cycle type and result sign** [verified — p.16 Fig. 12]:

| Op | A sign | B sign | Cycle | Result sign |
|---|---|---|---|---|
| Add | + | + | True add | + |
| Add | + | − | Complement add | sign of greater value |
| Add | − | + | Complement add | sign of greater value |
| Add | − | − | True add | − |
| Subtract | + | − | True add | − |
| Subtract | + | + | Complement add | sign of greater (after A sign inverted) |
| Subtract | − | − | Complement add | sign of greater (after A sign inverted) |
| Subtract | − | + | True add | + |

Subtract inverts the A-field sign first, then follows the add rules.

**Digit coding of non-numeric characters** [verified — p.16]:
- Characters whose numeric bits total 0–9 (numerals, letters, `/ ? ! ‡`) are used at face value.
- blank, `&`, `-`, substitute blank → 0.
- Other specials drop the 8 bit: `#` (8-2-1) → 3; group mark (BA8421) → 7 (or "G" if zones are retained).

**One-field forms** [verified — pp.17–19]:
- `A (A)` image-adds the field to itself (doubling).
- `S (A)` subtracts the field from itself (numerics → zero, zones unchanged).
- `ZA (A)` strips zones from all but the sign position, leaves numeric data and sign polarity intact, and rewrites a plus sign that is not B+A (i.e. no-zone or A-only) as B+A. Examples: `#b&-bn%` → `300004D`; `ABCD5` → `1234E`.
- `ZS (A)` strips zones except the sign and reverses the sign.
- Registers after any one-field form: NSI / A−LA / A−LA.

**Zero and Subtract, two-field sign table** [verified — p.18 Fig. 13]:

| A-field sign bits | A sign | Resulting B sign |
|---|---|---|
| none | + | minus (B) |
| B | − | plus (B and A) |
| B and A | + | minus (B) |
| A only | + | minus (B) |

**Multiply `@ (A)(B)`** [verified — p.19]: A = multiplicand, units-addressed; B = product field whose high-order positions initially hold the multiplier image; required B length = LA + L(multiplier) + 1; the product replaces the multiplier; sign = algebraic product of signs, written into the units of B; multiplicand zones undisturbed.

**Divide `% (A)(B)`** [verified — pp.19–21]:
- A = divisor, units-addressed. A divisor with no zone bits in its units is assumed positive.
- **B-address = leftmost position of the dividend** (not the units — this is the one address that breaks the units-addressing rule).
- Required field length = L(divisor) + L(dividend) + 1.
- Quotient develops in the leftmost positions, remainder in the rightmost. Units position of the quotient = (address of dividend units) − L(divisor) − 1. Quotient positions must be zero at the start.
- The dividend **must** carry a B+A or B sign in its units — the sign stops the division. Remainder sign = sign of the original dividend; quotient sign per algebraic rules, placed over the quotient units.
- Divide overflow indicator (tested by `J (I) W`) is set by divide by zero or an improperly addressed dividend.
- Registers after: NSI / A−LA / tens position of the quotient field.

**Indicators** [verified — pp.17, 36, 53]:

| Indicator | Set by | Reset by |
|---|---|---|
| Arithmetic overflow | carry out of the high-order B position in **add or subtract only** (carry is lost); never by ZA, ZS, multiply, divide, or indexing | `J (I) Z` (the test resets it), computer reset, power-on reset |
| Divide overflow | divide by zero, improperly addressed dividend | `J (I) W`, computer reset, power-on reset |
| Zero balance | zero result of A, S, ZA, ZS, or multiply (`@`) — **never** divide | next such arithmetic op with a non-zero result; computer reset turns it **off** |
| High / Equal / Low / Unequal | compare (C), table lookup (T), branch-if-character-equal (B) | the next C, T or B; computer reset turns **low** and **unequal** ON |

**Compare `C (A)(B)`** [verified — pp.28–29, 37, 53]:
- Compares B to A character by character from the units end, using **BA8421 bits only** — check and word-mark bits are excluded — against the Figure 2 collating sequence.
- Ends at the **first word mark in either field**.
- Sets high (B>A), equal (B=A), low (B<A), and unequal (on whenever high or low is on).
- If the A-field is **shorter** than B, the **high** indicator is turned on — even when the compared portions are equal (p.29 example 5).
- If the B-field is shorter than or equal to A, the indicators correctly reflect the compared portion.
- Negative fields compare as ordinary characters: `4444444D` vs `4444444M` → B high (example 6).
- Registers after: NSI / A−LW / B−LW.

**Table lookup `T (A)(B) d`** [verified — p.30 Fig. 25]: A = search argument, units-addressed with a WM at its leftmost; B = rightmost character of the table; each table field is function (leftmost) + argument (rightmost) with a WM at the field's leftmost. d: 1 low, 2 equal, 3 low/equal, 4 high, 5 low/high, 6 equal/high, 7 any, blank = search to end. Stops one position left of the matching argument; BAR = address of the rightmost function character; AAR = A−LW. Sets the compare indicators. A short table field ends the search with high on.

**Move `D (A)(B) d`** [verified — pp.25–27 Figs. 19, 20, 22]: 64 d-variants. d bits 1 = transfer numeric portion, 2 = zone portion, 4 = word marks; none of 1/2/4 = scan only. d bit 8 set = left-to-right (record) move, terminating on an A-field record mark (A-bit in d), an A-field GM-WM (B-bit), either (A and B bits), or the first WM in either field (neither). d bit 8 off = right-to-left field move terminating after one position (neither A nor B), at the A-field WM (A-bit), the B-field WM (B-bit), or the first WM in either (A and B). Register effects per Figure 20 (e.g. R-to-L stop at either WM → A−LW, B−LW; L-to-R stop at record mark → A+LA, B+LA).

**Move and suppress zeros `Z (A)(B)`** [verified — pp.27–28]: A-field WM defines the length; high-order zeros and commas in B become blanks; sign zone bits are removed from B's units; B-field WMs in the affected area including the leftmost are removed. Registers after: NSI / A−LA / B+1.

**Branch d-characters, one-address `J (I) d`** (length 1 or 7) [verified — p.36 Fig. 35]:

| d | Condition | Mnemonic |
|---|---|---|
| blank | unconditional | B |
| Z | arithmetic overflow (test resets it) | BAV |
| 9 / ! | carriage channel 9, ch1 / ch2 | BC9 / BC92 |
| R / L | carriage busy, ch1 / ch2 | BPCB / BPCB2 |
| @ / ⌑ | carriage overflow (12), ch1 / ch2 | BCV / BCV2 |
| S | compare equal (B=A) | BE |
| U | compare high (B>A) | BH |
| T | compare low (B<A) | BL |
| / | compare unequal | BU |
| W | divide overflow | BDV |
| Q / * | inquiry request, ch1 / ch2 | BNQ / BNQ2 |
| 1 / 2 | overlap in process, ch1 / ch2 | BOL1 / BOL2 |
| K | tape indicator (CE) | — |
| V | zero balance | BZ |

**Two-address branches** [verified — pp.38–39 Fig. 37]: `B (I)(B) d` branches if the character at B equals d (BA8421 only; also sets high/low/equal). `W (I)(B) d` branches if any bit of the B character matches any bit of d. `V (I)(B) d` tests word mark and/or zones: d = 1 WM, 2 zones absent, B zones = BA, K zones = B, S zones = A, 3 WM or no zones, C WM or BA, L WM or B, T WM or A. Lengths 1, 6, 12; the 6-char form chains the B-address and the prior d.

**Branch on I/O channel status** `R (I) d` (ch1) / `X (I) d` (ch2) [verified — pp.37–38 Fig. 36; A22-0530-1 p.8]: d bits — 1 not ready, 2 busy, 4 data check, 8 condition, B-bit (`-`) wrong-length record, A-bit (substitute blank) no transfer; group mark (all bits) tests all six. Branch if any bit in d matches. A status test must follow each I/O instruction on a channel before the next one, else the channel interlock stops the system. Indicators reset at the start of the next I/O operation on that channel. **Interlock removal rule:** the channel-1 interlock is removed by `R (I) ‡` (group-mark d) **or** by any `R (I) d` that actually branches; a non-branching, non-group-mark test does **not** release it. Same for `X` on channel 2. [verified — A22-0530-1 p.8]

**Processing-control ops** [verified — pp.22–24]: `G (C) d` stores the named address register (d = A, B, E, F) at the C-address (rightmost position) without disturbing AAR; not indexable; 69.75 µs. `,` set word mark and `⌑` clear word mark take one or two addresses or chain; registers after A−1 / B−1. `/ (B)` clears data and word marks from B down to the nearest hundreds boundary, leaving BAR = bbb00−1 (e.g. `/ 12590` clears 12590–12500 and leaves BAR = 12499); with an I-address it also branches. `.` halt (length 1) or halt-and-branch `. (I)`. `N` NOP accepts any length.

**Resets** [verified — pp.49, 52]: *Computer reset* clears check circuits, sets IAR = 00001, resets timing clocks and all machine indicators (overflow latches, compare triggers — note it leaves **low** and **unequal** ON and zero balance OFF). *Program reset* clears check circuits, sets IAR = 00001, and clears the A/B data registers, Op register, Op-modifier register and the console inquiry latch. The **Computer Reset key initiates a program reset plus a start reset** [verified — S223-2648 p.76 item 1], so computer reset also clears the console inquiry latch (a pending `J iiiii Q` console inquiry request does **not** survive it); the remote/1014 per-channel inquiry latches and the tape-density latch are the ones left set.

## 11. Priority feature (Special Feature 5620; Extension 5621)

Interrupt system. On interrupt the machine branches automatically to **00101**. [verified — A22-0530-1 pp.3–5]

Preconditions — **all four** must hold for a main-routine interrupt: [verified — A22-0530-1 pp.3–4]
1. The op code currently being read out is an interruptible op at an interruptible length (table below) and is **not** a chained short form.
2. The channel to be used is **not busy**.
3. The system is in priority alert mode.
4. A priority request indicator is on.

Alert mode is entered by `Y (I) E` (BEPA), which also branches; exited by `Y (I) X` (BXPA) **or** by the interrupt itself — a request indicator turning on turns alert mode off and causes the branch to 00101. The interrupt is taken during instruction read-out, before execution. [verified — A22-0530-1 pp.3–5]

| Op | Interruptible length | Non-interruptible length |
|---|---|---|
| ? ! A S @ % E Z C / , ⌑ | 11 | 1, 6 |
| W V D B T | 12 | 1, 6 |
| J | 7 | 1 |
| R X | 7 | — |
| Y | — | 1, 7 |
| N | — | any |
| M L | — | 10 |
| G | — | 7 |
| . | — | 1, 6 |
| U F K | — | 2 |

[verified — A22-0530-1 p.4 Fig. 1]

Race rule: if an overlap priority request arrives too late during read-out of an interruptible instruction and the **next** instruction is a branch-if-I/O-channel-status (`R`/`X`), that R/X resets the request indicator and **no interrupt occurs**. Otherwise the interrupt fires at the read-out of the next interruptible instruction. [verified — A22-0530-1 pp.4, 6]

Request indicators and their `Y (I) d` test characters (ch1 / ch2): overlap `1` / `2`; I/O unit `U` / `F`; inquiry `Q` / `*`; outquiry `N` / `‡`; seek `S` / `T`; attention `A` / `B`. [verified — A22-0530-1 pp.4–5 Fig. 2, pp.7–8]

Indicator reset behaviour: overlap requests are set at completion of an overlapped read/write/write-check and reset by `R (I) d` / `X (I) d`; I/O-unit requests are set by a priority-select-switch device finishing or by the priority-select on-off key; the inquiry request indicator turns off automatically when all inquiry requests are serviced by a read directed to the causing unit (the console release key clears console-caused ones); the seek request turns off when seek-complete status of all access mechanisms is reset by a read/write/I-O NOP to those units; the **attention** request indicator is only *temporarily* reset by program or computer reset and re-asserts at the next instruction read-out. [verified — A22-0530-1 pp.4–5, 7]

Return from a priority routine: store BAR (which holds the interrupted instruction's address plus the read-out steps), **subtract 6**, and use the result as the I-address of the `Y (I) E` that ends the routine (which both re-enters alert mode and branches back). Arithmetic and compare indicators are **not** saved automatically — the routine must preserve them itself. The exact per-op-length register snapshot at the moment of interrupt is not documented in the bulletin beyond this rule. [verified for the rule; the precise snapshot is unverified]

**I/O NOP** (Priority feature only): `M`/`L` x x x BBBBB d with d = `Q` (input status) or `V` (output status). Identical to a read/write but transfers no data; used to set the channel status indicators for the device that interrupted. [verified — A22-0530-1 pp.8–9 Fig. 3]

## 12. Processing overlap and Data Channel 2 (context for the register model)

Special features. Channel 1 uses E1/E2 data registers and EAR; channel 2 uses F1/F2 and FAR. The x-control hundreds character selects channel and overlap. Only `M` and `L` ops with x1 (or x4 console) overlap. At the end of an overlapped read, EAR sits **two** positions to the right of the last stored character (the GM-WM check). Both channels can overlap simultaneously; a non-overlap operation on one channel converts the other's overlap to non-overlap; channel 1 wins simultaneous requests. [verified — A22-0526-3 pp.92–96]

`Write Tape Mark` (`U x T x M`) is the **only** short-form (2-character) I/O instruction that can actually overlap — a following `J (I) 1`/`2` reports overlap in process because it uses the same circuits as an M/L with a zero-length field. Any other short-form I/O instruction coded in overlap mode runs as non-overlap. No two I/O devices operate simultaneously on the same channel. [verified — A22-0526-3 p.94]

## 13. 1401 compatibility feature

A **COMPATIBILITY** toggle on the 1415 console CE panel (1410 / 1401) puts the machine in 1401 mode; a 1401 COMPAT light indicates it. A 10K 1410 emulates an 8K 1401; every larger 1410 emulates a 16K 1401. [verified — A22-0526-3 p.98]

Supported 1401 features: additional storage, multiply-divide, expanded print edit, advanced programming (indexing, store address register, move record), print storage, high-low-equal compare, read-punch release, sense switches. Not supported: column binary, compressed tape, punch feed read, serial I/O adapter units, process overlap, selective tape listing, space suppression. [verified — pp.98, 56–58]

The 1415 sense-bit switches A–G act as program-testable sense switches **only in 1401 mode**; 1410 mode has no sense switches. [verified — p.58]

Documented behavioural differences (1401 vs 1410-in-1401-mode) [verified — pp.98–100]:

| Area | 1401 | 1410 in 1401 mode |
|---|---|---|
| Bad-parity input character | corrected | becomes `*` |
| Blank quotient positions | left blank | converted to zeros |
| Set-up character in 000/100 after read/punch | placed | not placed |
| BAR after card read | 081 | 082 |
| BAR after print | 333 (buffered / print storage) or 335 (unbuffered printer) | 335 always |
| BAR after punch | 181 | 183 |
| BAR after ops 5/6/7 | 181 | 183 |
| 1402 EOF | reset by new deck | reset only by computer reset |
| 8-2 card column | read as invalid | read as A-bit (substitute blank) |
| A-bit-only core char punched | punched as 0 | punched as 8-2 |
| Load-mode tape word marks | one word separator per WM | writes two word separators per WM; reads a pair as one separator without setting a WM |
| Single-character edit | not transferred | transferred |
| 1311 BAR | — | at least one greater |
| 51-column read | — | positions 1–14 and 66–80 filled with blanks |

RPQ 898148 (no charge) makes a 1401 handle the 8-2 / A-bit case the 1410 way. MLP-coded cards cause a 1402 validity check on the 1410: in 1401 mode it is a reader check in the 1411; in 1410 mode it sets the data-check channel status indicator. [verified — p.99]

**Gap:** the compatibility section does **not** describe how 1401 3-character addresses (with zone bits encoding thousands) are decoded, nor how 16K-1401 addresses map onto 1410 core. Needs TNL N22-0030 or the 1410 CE manual. [unverified]

## 14. Editions and provenance

- A22-0526-3 — reprint of A22-0526-2 incorporating TNL N22-0169-0, ©1960/1961, 111 pages. Primary source here.
- A22-0526 — "Major Revision October 1962", pages revised 1/15/63 (TNL N22-0070) and 5/1/63 (TNL N22-0083); obsoletes Reference Manual A24-1407-1/-2 and TNLs N22-0030 (1401/1410 compatibility), N22-0032 (overlap), N22-0045 (accelerator), N22-0054, N22-0059. Re-paginated (Indexing p.19, Compatibility p.95); a section-by-section diff against A22-0526-3 was **not** performed. [unverified whether it changes any addressing/indexing/chaining rule]
- A22-0530-1 — 1410 Priority Feature bulletin, ©1962, 16 pages, obsoletes A22-0530-0.
- In both PrincOps PDFs, PDF page N = printed page N. [verified]

Cross-check implementation: Cornwell's SimH `i7010` is the only open-source 1410/7010 CPU emulator located — a combined 1401/1410/7010 model (`SET CPU 1401 | 7010`), memory 10K–100K in 10K steps, options PRIORITY, FLOAT (7010 decimal floating point), PROT (7010 memory protection). Useful as a behavioural oracle for compare/arithmetic edge cases, but its 1410-vs-7010 distinctions are not always explicit in the code. [verified that it exists and what it claims; its 1410 fidelity is unverified]

## 15. Open items an implementer will hit

| Item | Blocks | Fallback |
|---|---|---|
| Exact IAR/BAR snapshot at a priority interrupt per interruptible length | CPU (priority) | Implement literally: BAR = interrupted instruction address + read-out steps such that BAR − 6 is the resume I-address; that is the only contract programs use. |
| 1401-mode 3-character address decoding and 16K mapping | 1401 compatibility mode | Do not implement 1401 mode; or implement the standard 1401 zone-thousands scheme (hundreds-position zones add 1000/2000/3000) and flag it as guessed. |
| Move Characters and Edit (`E`) rules, pp.31–35 | CPU (edit op) | Read A22-0526-3 pp.31–35 before implementing; do not guess from the 1401 edit. |
| Indexed-address overflow on 20K/40K/60K: wrap vs address-check | CPU (indexing) | Treat any indexed result outside installed storage as an address check stop. |
| Whether the May-63 edition changes addressing/indexing/chaining | all | Implement A22-0526-3 semantics; diff later. |
| 7010 storage protection | (out of scope) | 1410 has none; do not implement. |
| Op-code character set completeness (Appendix Fig. 107 partially transcribed) | assembler, CPU dispatch | Use the table in §9 as the working set; re-read pp.101–105 before claiming full coverage. |

## Sources

- https://bitsavers.org/pdf/ibm/1410/A22-0526-3_1410_princOps.pdf — IBM 1410 Principles of Operation, A22-0526-3. Pages read: 1–30, 36–39, 49–58, 92–105. Image-only PDF; printed page N = PDF page N.
- https://bitsavers.org/pdf/ibm/1410/A22-0526_1410_princOpsMay63.pdf — IBM 1410 Principles of Operation, A22-0526, Major Revision Oct 1962 / rev 5-1-63. Only cover, revision history and contents read.
- https://bitsavers.org/pdf/ibm/1410/A22-0530-1_1410_priorityFea.pdf — IBM 1410 Priority Feature, A22-0530-1. Fully read.
- https://bitsavers.org/pdf/ibm/1410/A22-6726_7010_PrincOps.pdf — IBM 7010 Principles of Operation. TOC read; no storage-protection section.
- https://bitsavers.org/pdf/ibm/1410/ — bitsavers 1410 directory (also holds 1410_CE_Manual_Oct61.pdf, 223-2589 System Fundamentals Nov63, A22-1407-2 1410 Reference Manual Nov61 — not read).
- https://raw.githubusercontent.com/rcornwell/sims/master/I7000/i7010_cpu.c — SimH i7010 CPU source (secondary; cross-check only).

Fetch note: direct bitsavers HTTPS fetches return 403 without a browser User-Agent; use `curl -A` with a Mozilla UA over http.
