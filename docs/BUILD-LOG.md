# Phase 1 build log

One entry per wave, newest last. Written by the build orchestrator (Fable) from its own
verification runs, not from worker claims. Plan: `docs/plans/phase-1-cpu-core.md` §5.

## Scaffold — commit c04cca6

- Shipped: `package.json` (typescript ~5.9.3, vite 8.2.2, vitest 4.1.11 — the three
  dependencies, nothing else), `tsconfig.json` strict + `noUncheckedIndexedAccess` +
  `exactOptionalPropertyTypes`, single `vite.config.ts` carrying the vitest block,
  `index.html`, `tools/fetch-oracles.ts` (cube1us/1410 pinned at commit
  `6f6c8bb5d6b1bc360275541bd5f6feb229a8fa83`, sha256 per file, `oracles/` gitignored),
  `test/core-is-dom-free.test.ts`, `test/oracles.ts` helper.
- Toolchain decision: Vitest 4 no longer ships `vite-node`, so `tools/*.ts` run through
  `tsc -p tsconfig.tools.json` → `build/` under plain Node 20. That forces `module: NodeNext`
  and `.js` extensions on every relative import (Vite resolves them to `.ts`). No
  `@types/node` is available transitively; `tools/node-shims.d.ts` declares the handful of
  Node built-ins the tools use.
- Verified: typecheck clean, 1/1 test, `npm run oracles` fetches four files and is
  idempotent, `npm run dev` serves.

## Wave 0 — decode only — commits 89dbf66, 5be71c9, 6c9ff69

- Shipped (three Opus workers, foundation ∥ ISA table, then decoder): `types.ts` (from
  architecture.md §3 verbatim), `bcd.ts`, `storage.ts`, `address.ts`, `registers.ts`,
  `checks.ts`, `formats/cor.ts`; `isa/table.ts` (35 OpEntry / 46 OpForm, one per
  opcodes.md §2 row — §2 has 42 data rows; `,` and `⌑` get three forms each because §2
  prints three register results per row), `isa/regs.ts`, `isa/dmods.ts`, `cycles.ts`,
  `isa/exec/*.ts` named stubs; `decode.ts`, `cpu.ts` (`step({execute:false})`),
  `trace.ts` (L1/L2 formatters, L3 record type), `machine.ts` façade; fixtures
  `oracle/{collate,lengths,timing,dchar-matrix,jdchars,vdchars,indicators}.json`,
  `oracle/simh-deviations.ts`, `oracle/cc01a-halts.ts` (empty).
- Tests: 176 passing (orchestrator run). Tier 0: 140 (bcd 11, storage 12, address 23,
  registers 4, cor 13, isa-table 17, isa-regs 33, dmods 12, cycles 15, decode 33 —
  includes the named negatives: R/X at 1/6, D/T at 2/7/11, both op-modifier directions,
  N of length 14, 1-char chained J legal). Tier 2: `ilentest.cor` 00100-02100 decodes
  85 instructions, every length in its §5.2 group, AAR/BAR as the form table predicts;
  the decoder's L2 lines reproduce plan §6.2's three sample lines byte for byte.
  Tier 3 (decode): the 15 indexed addresses of `insttest.cor` 02200-02288 match an
  independent hand calculation in the test; three of them (02244 A = 90122,
  02244 B = 101229, 02255 A = 87658) lie beyond 80K and address-check under the plan §10
  fallback — see PHASE-1-NOTES.md.
- Deviations from plan (all logged in PHASE-1-NOTES.md): implemented-check moved after
  the decode-only return; `MachineState.window` → `coreWindow`; `ANY_LENGTH = []`
  sentinel for `N`; `X` carries `feature: 'channel2'`; `J`'s two §2 rows are both
  `[1,7]` and are picked by d-character; `A` has two §2 rows, not the three the plan
  says; `classifyForm` returns `Olong` for `N` at every length.
- Research corrections made in place (commit 68ba52e): charset.md rank 35 C bit (1 → 0),
  group-mark glyph `‡` → `⧧` so glyph ↔ code is a bijection.
- Review: pending (entry updated when the adversarial review lands).

### Wave 0 review — commits 5e2eb8f, a054cce (+ three findings fixed in 629170c)

- Findings: 1 blocker, 3 major, 11 minor. Blocker: `G`'s C-address was run through
  `resolveIndex` (A22-0526-3 pp.11, 22: "cannot be indexed"). Major: `Oad` ignored
  `addressDouble` (J R X load AAR=BAR=CAR=DAR per 223-2589 p.52; G reaches CAR only, AAR
  undisturbed); the tier-2 model had baked the G error in; the group mark was `ǂ` in
  dmods.ts / dchar-matrix.json and `⧧` in bcd.ts, so `bcdOfGlyph(RX_RELEASE_D_GLYPH)` was
  undefined. Minor: stale "research typo" comments after 68ba52e; untagged addresses were
  not range-checked; `clearToHundreds` below 00100 returned −1; the Op register kept the
  WM bit; `Oxxxbd` did not set DAR; dead `timingNotBuilt`; `blankOnly` matched `'none'`;
  inferred `chainable` on `2 4 P Q` uncited; A2 chain hardcoded without an OPEN constant;
  `snapshot()` copied 80K per call. All 15 fixed. Verified correct by the reviewer: the
  64-code table against an independent parity recomputation, all 35 ops / 46 forms and
  every plan §4.2 regs string, the 18 timing formulas, the 40-character address table, and
  that tiers 2/3 are independent of the code under test.

## Wave 1 — flow-chart steps 1-4 — commit 66335bf

- Shipped: `indicators.ts` (seven latches, rule-named methods, computer reset leaves low +
  unequal ON, power-on state asserted), `N` at any length, `.` halt / halt-and-branch
  (halt is a flag read after registers and timing), `J` unconditional + every §6.1
  d-character (the Phase-1-unservable ones raise `UnimplementedOp` with their row's cite),
  `V`, `,`/`⌑` in all six forms. Taken branches: IAR = BI, AAR = BI, BAR = NSIB (C5).
- Tests: 264 total (+88). The cc01.cor run-time word-mark pattern is asserted on the real
  image: `N` at 02180 scans 8 characters over the unmarked `J 02226`; the chained
  `, 02181` at 02188 creates the word mark; IAR lands on 02194. Same at 02233/02241.
- Deviations: `ExecContext.halt` and `ExecContext.indicators` added; `IndicatorLatches`
  structural interface in types.ts; `test/isa-table.test.ts` gained a `BUILT_SO_FAR` list
  (its "every executor is a stub" assertion is false by construction from here on).
- Review: folded into the Wave 2 review (below).

## Wave 2 — flow-chart step 5, "type ident" — commits 9687c4c, 629170c

- Shipped: `channel.ts` (nine-step sequence, interlock, six status bits, CLR derived,
  `decodeX` with overlap → unsupported feature / channel 2 → unimplemented / 7010 x1 →
  instruction check, `decodeD` with the C17 ruling, move/load translation both directions,
  Figure 5 vector through a fake 7-bit device), `devices/console1415.ts` (8-bit, `%T0`,
  `read` stub), `M`/`L %T0 bbbbb W` leaving BAR = B + LB + 1 one past the GM-WM,
  `R (I) d` with the two release rules, `printout.ts` (Figure 42, reproduces
  `S 149ØØ 1bbbb 11622 bb bbb bbbb`), `tools/run-cor.ts` (asserts exactly CC01A,
  CC01 COMPLETE, IAR 08980), `tools/trace-diff.ts`.
- Tests: 361 total (+97). Tier 4 part 1: cc01.cor from 02000 types `CC01A` (22
  instructions, 1368 µs) and stops on the unbuilt `G` at 02258.
- Deviations: `Device.write` takes a fourth `mode: IoMode` argument (WCPW's `b`-for-blank
  cannot be recovered from an 8-bit record with no word marks); `F K U` raise
  `UnimplementedOp` (devices are Phase 2). OPEN: BAR when nothing transfers (LB = 0);
  load-mode output of a word mark over a word separator (unreachable from a 7-bit device);
  undefined I/O d-character → instruction check; a console write never sets WLR.
- Review: pending.

### Wave 1-2 review — commits c4e7553, 394b22e (op parity + B line)

- Findings: 1 blocker, 2 major, 7 minor. Blocker: the Op register kept even parity after
  the WM bit was stripped, so every stop print-out underlined the op character
  (`S Ø2265 … G̲B`). Major: two `ConsoleLine.text` conventions (ID inside `text` in
  printout.ts, bare in console1415.ts) — now one: `text` bare, `id` separate, flags index
  `text` from 0; the `b`-for-blank rule on the stop print-out was asserted as fact where
  A22-0526-3 p.49 states it only for load-mode printing — now `PRINTED_BLANK` with an
  OPEN row in open-questions.md. Minor: ADDRESS SET emitted no `B` line; unused `X2_DEVICE`
  and no x2 validation; dead `X3_SUB_OPERATION` / `RX_INTERLOCK_RULES`; stale `pickForm`
  comment; `V` combined d-characters tested only through the word-mark arm; no chained-`J`
  op-modifier test; `run-cor` had no entry guard; and an I/O transfer is one E-cycle, so
  `stepCycle()` cannot pause inside a record (logged, not fixed — the plan budgets the
  cycle seam against the add only). All others fixed.

## Wave 3 — flow-chart steps 6-11 — commit 394b22e (+ fix commit, see below)

- Shipped (two Opus workers): `alu.ts` — add/subtract on storage through a cursor, right
  to left, as the documented units / body / extension scan phases with the A-complement,
  B-complement, carry, zero-balance and overflow latches, written as a generator yielding
  one latch record per B position so the L3 tracer and `stepCycle()` read the same
  records; `Cpu.stepCycle()` (I-phase, then one E-cycle per call, one shared
  end-of-instruction path) and `machine.stepCycle()`; `oracle/signs.json`; `G` (five decimal
  characters through CAR, AAR undisturbed); `W` (bit-equal, not-taken `B-1`); `/` (clear to
  the hundreds boundary, BAR = bbb00−1; branch at L=11); `oracle/note1410/arith.ts` — 43
  annotated instructions in 02300-02799, 114 per-position latch expectations, verbatim
  quotes, plus `UNMAPPED.md` for what could not be mapped (11 addresses listed there).
- Tier 1: `A 05985 06985` then a bare `S` — AAR 05980 / BAR 06979, two distinct fields;
  `/ 12590` clears 12590-12500 and leaves BAR 12499. `stepCycle` vs `step` produce equal
  snapshots and µs. cc01.cor now runs 104 instructions (5940 µs) past all three `G`s and
  stops on the unbuilt `!` at 03055.
- Tier 3 (arithmetic) at 394b22e: 4 pass / 26 FAIL / 21 todo. The `A` and `S` sub-blocks
  run sequentially to their halts (02300→02391, 02400→02496 — the block is
  halt-terminated sub-blocks, one per START, established from the operand mutation at
  10001-10600 and the chained forms with no address fields), but the per-position
  comparison failed on three alu.ts disagreements with the oracle: trace records carried
  digit values instead of the fetched glyphs (so the zoned cases at 02380/02485 were
  indistinguishable from unzoned adds); the plus zone was rewritten on an unchanged
  positive result (`199` → `19I`) where opcodes.md §4.1 says the sign is written only
  "when the machine develops or changes a sign" — nine oracle cases agree; and the
  B-complement latch / extension naming on scan 3. Fixed in the following commit.
- OPEN: `L3_LATCHES_SAMPLED_AFTER_CYCLE` (plan §6.2's sample line is internally
  inconsistent — latches are recorded at the end of the cycle); `UNDEFINED_G_D_CHAR_IS_
  INSTRUCTION_CHECK` (§2 p.22 names `A B E F` only); `W` has no d-table in §6 — every one
  of the 64 codes is a legal mask, asserted by a 64×64 sweep.
- Deviations: `LatchTraceRecord`/`Latch` moved from trace.ts to types.ts (re-exported);
  `OpForm.exec` may return an iterator; `ExecContext.recomplement`, `traceLatch`;
  `CycleStep` type; `test/tier4-cc01-ident.test.ts`'s stop marker moved to `!` 03055 and a
  separate `tier4-cc01-progress.test.ts` owns it from here.
- Review: pending (folded into the Wave 3-6 review).

### Wave 3 fix — commit 40b19d4

- Tier 3 arithmetic green: 30 pass / 0 fail / 21 todo (`? ! @ %`). Latch records now carry
  the fetched/written character; the B units zone is rewritten only when the result's sign
  differs from B's original sign (`unitsZoneOf`; opcodes.md §4.1 p.16 + Figure 12); the
  last scan-1 cycle of a recomplementing add records `Bc = 1`, `cin = 1`, and scan-3
  positions after the units are the extension (research silent, oracle followed). One
  fixture digit at 02311 corrected from the image (the note says "Fetch 1"; the field is
  `900`; the note's own mirror case at 02411 says "Fetch 0").

## Wave 4 + Compare — commit 57c17db

- Shipped: `compare.ts` (B compared to A by collating rank from the units position,
  terminating on either word mark; HIGH = B collates above; zones are collating value —
  `444444D` vs `444444M` → HIGH; short A → HIGH), `B` Branch if Character Equal (exact
  six-bit equality; sets the compare group by rank whether or not it branches; not-taken
  BAR = B−1), indexing executed end to end. `indicators.ts` needed no change — Wave 1's
  `beginCompare` / `compareDigit` / `endCompare` already makes "once equal is off it cannot
  come back on" structural.
- Tests: 50 new (compare 23, bce 13, tier-1 index 10, tier-3 index-exec 4). Tier 1:
  `009Z6` tagged IR1 = `0001J` executes to 00985 with `INDEX_US` charged per indexed
  address. Tier 3, execution on: insttest.cor 02200-02288 lands the 15 effective addresses
  at the end of the I-phase; 02244 (A → 90122) and 02255 (A → 87658) stop with an address
  check, so 02244's B value 101229 is never computed; the `A`s at 02200 and 02211 add for
  real (`G` + `0` → 7 at 22222).
- Deviation: the tier-3 assertion is taken at the end of the I-phase via `stepCycle()`,
  not after full execution — every instruction in the block is an `A` whose registers
  after are `A−LW / B−LB`, and seven of the nine index into blank fill with no word mark
  for 10-33K positions. Stated in the test header.
- OPEN: `SHORT_A_TURNS_HIGH_ON` — the sources never state the short-A / LOW interaction;
  223-2588-2's "Hi-ind is on" is taken unconditionally.
- Review: pending (folded into the Wave 3-6 review).

## Wave 5 Move/Scan — commit 638989e

- Shipped: `move.ts` — one function over the two structural tables in `dmods.ts` (portion
  from `d & 0x07`, direction/terminator from `d & 0x38`, registers from the eight Figure 20
  rows through `evalReg`), no switch on the d glyph; the terminator is sensed on the
  character as read out and is transferred; the word-mark portion copies A's mark (sets
  and clears); a scan writes nothing. `oracle/note1410/move.ts` (15 cases + corrections).
- Tests: 112 new (move 89, tier-3 move 23). All 64 d-characters driven from
  `dchar-matrix.json` with observable fields. Tier 3: every case in insttest.cor
  02800-02968 matches the note on B contents, word marks, AAR and BAR — sequentially and
  per instruction.
- Research correction (not applied to the research file — recorded here and in the
  fixture's CORRECTIONS): the block holds **fifteen** `D` instructions; the sixteenth line
  of `emulators.md` §5.3's code block is the halt at 02980. The note prints no registers
  for this block, so the fixture's AAR/BAR column is derived from Figure 20, not
  transcribed (UNMAPPED §9).
- OPEN: `MOVE_LENGTHS_ARE_POSITIONS_STEPPED` (Figure 8 defines LA/LB/LW over fields; a
  Move has no field boundary but its terminator — all three = positions stepped, all 15
  cases agree); `MOVE_REGISTERS_FROM_FIGURE_20` (plan §10's fallback, now verified).
- Review: pending (folded into the Wave 3-7 review).

## Wave 7 rejections — commit 4de6b07

- `test/wave7-rejections.test.ts`, 31 tests through the real machine: `Y P Q U 2 4 $ = X`
  and `@ % T Z E` → `unimplementedOp` with the row's cite; `@` x1 → `unsupportedFeature`;
  `⌑`/`*` → channel 2; `? ! $` in x1 and `3`/`1` as ops → instruction check; Phase-2 `J`
  d-characters and `F`/`K` → unimplemented with a cite.
- Observations: `*` (channel 2 + overlap) is rejected as channel 2 before its overlap bit
  is seen — plan §1 phrases it as "an overlap x1 (`@`/`*`) raises an unsupported-feature
  stop"; either rejection is honest, the channel-2 test comes first in `decodeX`. The
  x1 `=` row in `dmods.ts` is unreachable: the 1410 chart prints octal 13 as `#`, so no
  core byte renders as `=`; `#` in x1 still instruction-checks via the generic branch.

## UI wave — the internals page with the real console controls — commit ebf3b87

- Shipped: `machine.ts` façade — `ConsoleMode` (RUN / ADDRESS SET / ALTER / I/E CYCLE;
  the rotary's six positions named in a comment), `setMode` (types the `S` line on an actual
  change, A22-0526-3 p.50), `keyAddress`, `start` (RUN with a 2000-instruction budget per
  call; ADDRESS SET → `B`; I/E CYCLE → one half cycle + `C`), `stop` (`S`, p.52),
  `display` (`D` address line + `D` data line to the next word mark), `alter` (limited to
  the displayed span, word marks only where re-entered — §4, software.md §10.8); neither
  reset key prints; a programmed halt prints nothing (§2's `S` row names only the STOP key
  and a mode change). `src/ui/internals/` — panel, registerView, coreView (overline on
  word-marked positions), controls, main; `index.html`. Vanilla DOM, labelled anachronism.
- Tests: 22 new (machine-console 17, demo 5). Demo 2 headless: DISPLAY/ALTER key the
  three-instruction add; the B field goes `4567 → 4560 → 4590 → 4690` right to left, one
  position per E cycle, in exactly 7 half cycles; the word mark stops it.
- Browser: `npm run dev` driven in Chrome by clicks — `D ØØ5ØØ` / `A 1̌2C`, `D ØØ6ØØ` /
  `A 4̌56G`, `D ØØ7ØØ` / `A ǍØØ5Ø2ØØ6Ø3.̌ ̌`, `B ØØ7ØØ`, then START on I/E CYCLE: core row
  00600 went `456G → 456? → 459? → 469?` with the overline on the `4`; registers
  IAR 00711 / AAR 00502 / BAR 00603 / OP `A` throughout, then IAR 00712 / AAR 00499 /
  BAR 00599 / OP `.` and `stop: halt`; a `C ØØ711 ØØ5Ø2 ØØ6Ø3 Ab bbb b̲b̲b̲b̲` line per
  half cycle; no JS console errors. Keyboard input from the extension did not reach the
  page, so text fields and the MODE select were set by script; every action went through
  real clicks. Demo 1 in the browser was not exercised (LOAD opens a native file dialog);
  the headless demo test covers it. `npm run build` succeeds (80.9 kB / 24.5 kB gzip).
- Over budget: 456 UI lines against the plan's ~310, in per-control citations and
  headers; functional code is at budget.
- OPEN: `CONSOLE_LINE_LENGTH = 80` — §4 and §10.8 terminate on "a word mark or the end of
  line" and no source gives the Selectric's characters per line.
- Review: pending (folded into the Wave 3-7 review).

## Wave 6 — ZA / ZS — commit e249800 (+ 23dbf6a `noUnusedLocals`, zero findings)

- Shipped: `alu.ts` zero mode (one pass, not a second scan): the A field's numeric digits
  move into the B field right to left with body zones cleared, zero-filled to the B word
  mark; the units zone from the A sign (plus always B+A — the `?` row, §4.1) or from the
  Figure 13 map row by row for `!` (§4.4); zero balance per §8, overflow never.
- Tests: 16 new + the 11 `?`/`!` tier-3 entries asserted. Tier 1: `? 00302` over
  `#b&-bn%` → `300004D`, over `ABCD5` → `1234E` (A22-0526-3 p.18). Tier 3 arithmetic:
  44 pass / 0 fail / 10 todo (`@`/`%` are Phase 1b) — every ZA/ZS latch line, glyph and
  result field matched the note on the first run, including the chained pair 02550/02561.
  Suite: 736 pass, 10 todo, 0 fail, 43 files.
- cc01.cor now runs 135 instructions (8561 µs) through CC01A's sign-and-zone chain — every
  `V … K/S/2/B` test at 03207-03393 takes its branch, so the diagnostic itself accepts the
  signs and stripped zones ZA/ZS wrote — and stops with an address check on the `/ 00000`
  at 03436 (`clearToHundreds` on the 00000-00099 block, from the Wave 0 review's finding 7).
  Halt archaeology in progress (plan §9 row 1).
- Review: pending (Wave 3-7 + UI review running).

## cc01 halt archaeology — commit (see `git log`, "[Core]: cc01 halt archaeology")

- Halt 1, IAR 03436, `/ 00000`: CC01A's flow-chart step 10 clears from 00000, then
  `G 09185 B` / `G 09181 A` (overlapping by one) and two zero-balance tests require
  AAR = 00000 and the low four BAR digits = 9999. Clear Storage terminates ON the hundreds
  boundary (A22-0526-3 p.23) and never asks for a position below 00000, so the §4
  "decrementing operation" address check does not apply; `bbb00 − 1` in a five-position
  register is 99999. `CLEAR_STORAGE_BAR_AT_00000 = 99_999`, OPEN, row in
  open-questions.md. The Wave 0 review's finding 7 (address-check at base 0) is thereby
  reversed by the diagnostic's own evidence.
- Halt 2, IAR 00322, instruction check — **the end of the diagnostic on a tape-less
  image**: after `CC01 COMPLETE` (08890) the program runs `J 08959`, relocates its
  read-in (`D 08967 00333 Δ` copies 08967-08987 to 00333-00353 — self-locating: the copied
  `R 00346 ⧧` at 00339 points at the copied `J 01972` at 00346 — then `D 00332 00339 3`)
  and branches to 00322, a ten-character hole where the CE keyed the per-channel tape read
  `M`. Blank here, so: instruction check. The `J 01972` at 08980 is unreferenced anywhere
  in the image (no operand names 08959/08966/08973/08980); `emulators.md` §4.4's
  "reached 08980" was read off the static image. Corrected in place; `run-cor`'s PASS rule
  becomes: `CC01A`, then `CC01 COMPLETE`, then instruction check at 00322.
- Result: `npm run cc01` — 1241 instructions, 82543.5 µs, console `B Ø2ØØØ` /
  `R CC01A` / `R CC01 COMPLETE`, stop `E ØØ322 ØØ322 Ø8966 Jb bbb b̲b̲b̲b̲`. This is the
  first observed clean run of `cc01.cor` under any simulator we know of; it establishes the
  baseline the plan (§7 tier 4, §9) said the first run would.

### Wave 3-7 + UI review — commit eb51aae

- Findings: 0 blocker, 4 major, 10 minor; 13 fixed, 1 logged. Major: the Move word-mark
  portion was coded as a copy (set AND clear) on a sentence that demonstrates set only, with
  a 1401 appeal in the comment — now `MOVE_WORD_MARK_PORTION_IS_A_COPY`, OPEN; I/E CYCLE
  steps one storage cycle per START on the E side while console-and-physical.md §4 says one
  instruction phase — a plan choice (§8 demo 2), now stated as a deviation and no longer
  cited to §4; `CycleStep.record` had no consumer outside tests yet `alu.ts` built a record
  on every arithmetic cycle — records are now built only under a tracer and the headers say
  the UI watches `snapshot().coreWindow`; a programmed halt prints nothing — now
  `HALT_TYPES_NO_PRINTOUT`, OPEN, with §3's PRINT OUT CONTROL / START PRINT OUT
  counter-evidence stated. Minor: `unitsZoneOf` statically determined at both call sites
  (inlined); `L3_LATCHES_SAMPLED_AFTER_CYCLE` contradicted the `unit` latch's A-cycle
  timing (comment corrected, pinned by a test); dead exports; a test title (`1234N`);
  `decodeX` tested channel 2 before overlap so `*` was not the unsupported-feature stop
  plan §1 names (reordered; the unreachable x1 `=` row deleted); DISPLAY wraparound above
  10K not modelled (`DISPLAY_WRAPS_ABOVE_10K = false`, OPEN); the DISPLAY stop reading
  named (`DISPLAY_STOPS_BEFORE_NEXT_WORD_MARK`, OPEN); `step()`/`stepCycle()` equality
  proved only for an add (now also a taken `J`, a halt-and-branch, a not-taken `V`); two UI
  casts narrowed. Logged for Phase 1b: `addToStorage` cannot serve `@`/`%` as shaped.
- Verified correct by the reviewer: the §4.1 sign reading against note1410 02380; all 16
  digit-coding rows; the Figure 13 permutation; compare direction and the short-A rule; all
  58 fixture quotes verbatim against note1410.txt; every `A S ? ! C B D G W /` row's text
  against opcodes.md §2; the UI DOM-only/no-framework/anachronism rules.

## Phase 1 close — 2026-08-30

- Final verification (orchestrator): `npm run typecheck` clean (strict,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`);
  `npm test` 43 files, 745 passed, 10 todo (`@ %` tier-3 entries, Phase 1b), 0 failed;
  `npm run build` ok; `npm run dev` serves `index.html` → `src/ui/internals/main.ts`;
  `npm run cc01` PASS — `B Ø2ØØØ` / `R CC01A` / `R CC01 COMPLETE`, stop
  `E ØØ322 ØØ322 Ø8966 Jb bbb b̲b̲b̲b̲`, 1241 instructions, 82543.5 µs.
- Tiers: 0 (fixtures vs tables, named negatives) green; 1 (manual worked examples: chaining
  05985/06979, `009Z6` → 00985, ZA `300004D` / `1234E`, Compare `444444D`/`444444M`,
  `/ 12590` → BAR 12499, Figure 5 load-mode vector, the `S 149ØØ …` log line) green; 2
  (`ilentest.cor` 85 instructions decode-only) green; 3 (`insttest.cor`: 15 indexed
  addresses decode-only and with execution, 44 arithmetic latch cases, 15 move cases)
  green; 4 (`cc01.cor`) PASS as a smoke test with the corrected exit path.
- Not built (by plan): `@ % T Z E` executors (Phase 1b, rows complete with
  `implemented: false`); `tools/simh-diff.ts` (ledger only); console inquiry/keyboard.
