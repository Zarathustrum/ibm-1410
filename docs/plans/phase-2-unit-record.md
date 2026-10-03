# Phase 2 — Unit record: cards, the 1402, the 1403, the 1415 keyboard, and the loader

Companion to [architecture.md](architecture.md) and [phase-1-cpu-core.md](phase-1-cpu-core.md).
Every hardware behaviour cites a file in `docs/research/`; every `[unverified]` / `[likely]` item
this phase touches is in §15 with a named `// OPEN:` constant and the fallback taken.

Built on `feature/phase-2` at 669aabd, in the worktree `ibm-1410-p2`. **Phase 1b merges first and
Phase 2 rebases onto main** — see §3.

---

## The seven bullets

1. **Three devices behind the seam Phase 1 already built.** `channel.ts`'s nine steps, move/load
   translation, the GM-WM store gate, the extra-E-cycle WLR and `decodeD('$')` are correct for the
   1402, the 1403 and the 1415 keyboard **as written** and do not change. The channel gains exactly
   two things — `control()` for the short-form `F`/`K` ops, and four Figure-35 sense getters — plus
   one optional `Device.outputCells` hook without which the `[verified]` `M %21` cannot exist.
2. **`Card` and `Deck` come back to `src/core/types.ts`; `Column` and `ObjectRecord` do not.** The
   rule, stated once and applied everywhere: a boundary type lives in `types.ts` only if something
   inside `src/core` names it (`test/core-is-dom-free.test.ts` forbids `src/core` importing
   `src/formats`). `architecture.md`'s "frozen here" line is wrong; Phase 2 does not edit that file
   — it is corrected in the merge commit (§16).
3. **A person types the deck.** One line per card; a column is a machine glyph, `{12-7-8}` a punch
   list, or `{}` a blank. `{` and `}` are outside the 64-character set, so a punch list can never
   collide with data. Punch masks are **derived at module load from the `hollerith` column
   `src/core/bcd.ts` already carries** — no second table — and the tier-0 test proves that
   derivation against `charset.md` §3's structural rule computed independently.
4. **`isa/table.ts` needs zero edits.** Both the `F` row (:1028) and the `K` row (:640) are already
   `implemented: true` with the right lengths, d-tables, `regs` and timing, already pointing at
   `io.carriage1` / `io.selectStacker1`. Only the two executors change, and `isa/exec/io.ts` is
   owned outright — which deletes the largest predicted Phase-1b rebase conflict.
5. **The demo is a checked-in six-card deck, and it gates.** `demos/hello-dad.cards`: card 1 is a
   self-loading program in IBM's own Bootstrap-1 shape, five data cards print a five-line report on
   page 1 of the green bar, and the program's closing `F1` ejects the finished page — the skip goes
   at the **end**, because from carriage home a skip to channel 1 advances a form (§13).
   `npm run demo -- --golden test/golden/hello-dad.page.txt` reproduces the one golden in the phase
   byte for byte. Unlike `cc01`, this one gates — we wrote the deck and we know what it prints.
6. **Order runs demo-first, strictly in sequence: card format → 1402 reader + `K` → 1403 + `F` +
   THE DEMO → inquiry, punch, `%21`, the four `J` I/O branches → object deck + loader.** No two
   waves are in flight in the same file. The exit criteria are met at the end of wave 3 of 5;
   waves 4 and 5 are additive and wave 5 is explicitly descopeable to Phase 3.
7. **~1,900 source + ~2,300 test lines, no new dependency.** `npm test` green and `npm run smoke`
   PASS (cc01 output unchanged: 1241 instructions, both messages, instruction check at 00322) at
   every commit. `PHASE-2-NOTES.md`, `docs/BUILD-LOG-2.md` and the dated Phase-2 section of
   `open-questions.md` are written **per wave, in the wave's own commit** — which is what makes
   dropping wave 5 safe.

---

## 1. Scope

**In.**

- `Card` / `Deck`, the Hollerith ↔ BCD bijection, and the pasted text deck format
  (`charset.md` §2, §2.1, §3).
- **1402 reader**, x2 `1`, on channel 1: the 1414 Model 3 80-position read buffer, the hopper, the
  three reader stackers, READER START, END OF FILE, x3 = 0/1/2/9, d = `R` and d = `$`, and every row
  of `io.md` §6 Figure 62 (A22-0526-3 pp.59-64).
- **`K d` Select Stacker and Feed**, through a new `Channel.control()` — the `K` row's executor
  stops throwing (`io.md` §6 items 3 and 5, A22-0526-3 pp.62-63).
- **1402 punch**, x2 `4`: x3 = 0/4/8, move and load output, Figure 63's status rows
  (`io.md` §6 "Punch a Card").
- **1403 Model 2**, x2 `2`, 132 positions: Write a Line (`%20`), Write Word Marks as 1s (`%21`),
  the 48-graphic A2 chain map, load-mode blank-ahead, the automatic single space, the carriage tape,
  all 30 `F d` carriage operations, the paper (`io.md` §7, `charset.md` §5, §7).
- **`F d` Carriage Control**, same route as `K` — the `F` row's executor stops throwing.
- **1415 read/inquiry** replacing `Console1415.read()`'s stub: the inquiry request latch, the
  keyboard, the WORD MARK key, RELEASE, CANCEL, and Figure 45's four status outcomes
  (`io.md` §8, A22-0526-3 pp.46-49).
- **The four `J` I/O branches on channel 1** — `9` BC9, `@` BCV, `R` BPCB, `Q` BNQ — flipped to
  `available: true` and answered by the channel (`io.md` §5 Figure 35). `Q` is io.md §8 step 2, the
  documented way a program learns an inquiry request is pending; `@` is the carriage-overflow sense
  Phase 5's RPG `OF` line condition needs (`rpg-sources.md`, Output sheet cols 15-16 and OF).
- **The loader path**: the hand-keyed `AL%1000012$R` (`software.md` §10.2); our own single-card
  self-loading bootstrap in the C28-0351-5 p.8 Bootstrap-1 shape (§10.5); `ObjectRecord` ↔ condensed
  cards in the C28-0309-1 Figure 2 layout (§8.1); a multi-card condensed loader and its execute card.
- **The browser views**: deck box, card face, hopper and stackers, green-bar paper, inquiry keyboard.

**Out, and why.**

- **Channel 2, tape, disk, overlap, priority, MICR, column binary, the 51-column read feed, 1401
  mode.** Unchanged from `architecture.md` §12. `U`, `2`, `4`, `P`, `Q` stay `implemented: false`;
  the channel-2 `J` rows (`!`, `⌑`, `L`, `*`) stay `available: false` with their citations.
- **Printer / carriage Busy as a real condition.** `io.md` §7 says "the printer becomes busy after
  the transfer completes and printing starts. Model this — programs rely on it to overlap"
  `[verified]`. This configuration has no overlap feature and `cycles.ts`'s I/O term is 0, so no
  program here can observe device motion: `J (I) R` (BPCB) is wired and always answers false.
  Named, not silently dropped — `CARRIAGE_NEVER_BUSY`, §15.
- **Period cabinet art.** Phase 4 owns the machine room (`architecture.md` §6, §7). Phase 2's views
  render period-shaped *artifacts* — a card with rectangular holes and an interpretation band,
  green-bar paper, the Selectric log — with no cabinet, no rotary art, no colour, no photography.
  Phase 4 moves them and styles them; nothing here is thrown away.
- **The assembler.** Phase 3. The Phase-2 object decks are hand-written from a test helper, which is
  the ordering `architecture.md` §5 asks for.
- **Reader Data Check and Validity as reachable paths.** A hole-count or 1414 parity error cannot be
  produced by any input this emulator accepts, so the two rows of `io.md` §6 "Errors" are asserted
  as table rows and left unreachable. Stated rather than faked (§7.1).

---

## 2. The truth about `Card`, `Deck` and `ObjectRecord`

`PHASE-1-NOTES.md` §2 entry 26 is the authority: `Card`, `Deck`, `Column`, `PunchMask`,
`BcdOfPunches`, `ObjectRecord` and `ObjectDeck` were **removed** from `src/core/types.ts` in the
final Phase-1 review because they had zero importers, and they "return in Phase 2 with their first
consumer and their first test". The surviving `types.ts` §6 note says the same.
`docs/plans/architecture.md` §3 keeps their sketches as the reference shape and its line ~336 still
says `ObjectRecord` and `Card` are "frozen here **because Phase 2 hand-writes decks against them**".
**That line is wrong today.** Phase 2 does not edit `architecture.md`; it is corrected in the merge
commit (§16).

They come back here, **split**, and the split is forced by a test that already exists:

- **`Card` and `Deck` go into `src/core/types.ts`**, because their first consumer is
  `src/core/devices/reader1402.ts`, and `test/core-is-dom-free.test.ts` fails any `src/core` file
  that imports outside `src/core`. A reader holding a hopper of cards cannot import `Card` from
  `src/formats`.
- **`Column`, `punchMask`, `bcdOfPunches` and the deck text live in `src/formats/card.ts`.** The
  1414 read buffer holds BCD, not punch masks (`io.md` §1); a mask is a *rendering* and an
  interchange form, and on the 1410 it is a bijection derivable from `charset.md` §3. The machine
  never needs one.
- **`ObjectRecord` and `ObjectDeck` live in `src/formats/objectdeck.ts`.** No `src/core` module ever
  sees an object record: an object deck becomes `Card`s before it reaches a device, and the loader
  that consumes them is a 1410 program, not TypeScript.

**The rule, stated once:** a boundary type lives in `types.ts` only if something inside `src/core`
names it. That is the same rule that took these types out of Phase 1, applied in the other
direction.

Three deliberate corrections to the `architecture.md` §3 sketch, made because the consumers now
exist:

1. **`Card` is a bare alias for `Uint8Array`, not `{ codes, ident? }`.** `ident` is columns 76-80 of
   the codes — derivable, with no Phase-2 consumer, and exactly the speculative typing §12
   disclaims; a second copy of five card columns is a synchronisation hazard. A bare alias is house
   style (`types.ts` §6 plans `SourceCard` as an alias for `string`) and it makes the hopper
   literally an array of 80-byte buffers. `ObjectRecord` **keeps** `ident` and `sequence`, because
   there the writer needs them as inputs.
2. **`ObjectRecord.payload` is cell bytes — `WM | bcd6`, and never a C bit.** The deck has no
   parity: a condensed card is loaded by a load-mode read, which "replace[s] the whole target byte
   including the word-mark bit" and recomputes parity (`io.md` §3, 223-2692 p.11 Case 2 — which is
   what `storage.writeWhole` already does). Carrying a C bit through the deck would invent a fact
   the format does not have.
3. **`PrintLine` is added beside `PrintEvent`, not instead of it.** `PrintEvent` was frozen in
   Phase 1 (`types.ts` §7) with exactly the three shapes `io.md` §7 needs, `afterPrint` flag
   included, and survives verbatim as the device's raw stream. `PrintLine` is the page as it comes
   off the printer, and the 1403 builds it *as the carriage moves*, because the carriage position is
   live device state that `J (I) 9` / `J (I) @` read during the run — deriving the paper afterwards
   would implement the carriage twice.

Shaped for what comes next: Phase 3's assembler emits `ObjectRecord[]`; Phase 5's RPG emits
Autocoder source that becomes `ObjectRecord[]`. Neither needs a new format, and neither needs the
loader rewritten.

---

## 3. Parallel with Phase 1b — ownership, do-not-touch, rebase points

Phase 1b (the `@ % T Z E` executors and an `alu.ts` reshape) is being built concurrently in another
worktree. **Merge order: 1b first, then Phase 2 rebases onto main.** The orchestrator rebases
`feature/phase-2` onto main at the **start** of the first wave after 1b merges, never at the end, so
a conflict is resolved once against a small diff instead of five times against a large one.

**Phase 2 owns** (create or edit freely):

`src/core/channel.ts` device dispatch · `src/core/devices/*` · `src/formats/*` ·
`src/core/machine.ts` LOAD-from-deck · `src/core/isa/exec/io.ts` · the `F`/`K` rows of
`src/core/isa/table.ts` **and nothing else in that file** · `src/ui/*` card/deck/printer/inquiry
views · their tests · `test/isa-table.test.ts` `BUILT_SO_FAR` (only to add `F`/`K`) ·
`docs/BUILD-LOG-2.md` · `PHASE-2-NOTES.md` · a dated "Phase 2" section in
`docs/research/open-questions.md`.

**Phase 2 must NOT touch** (verbatim from the phase brief, one line each on why):

| File | Why it is off limits |
|---|---|
| `src/core/alu.ts` | Phase 1b reshapes `addToStorage` into a `{ bUnits, positions, writeSign }` primitive (`PHASE-1-NOTES.md` §4) — the single largest 1b diff. |
| `src/core/isa/exec/arith.ts` | 1b's `@` / `%` executors land here. |
| the `@ % T Z E` rows of `src/core/isa/table.ts` | 1b flips these five rows to `implemented: true` and points them at new executors. Phase 2 touches only `F` and `K`, 380 lines away. |
| new `src/core/{muldiv,tablelookup,mcs,edit}.ts` | 1b's new files. Phase 2 creates nothing with those names. |
| `oracle/note1410/*` | 1b's latch-trace fixtures for the multiply/divide/MCE blocks. |
| tier-3 arithmetic tests (`test/tier3-arith.test.ts`, `test/alu.test.ts`, `test/exec-arith.test.ts`, `test/exec-za.test.ts`) | The oracles 1b is being built against; a Phase-2 edit there is a merge hazard for zero benefit. |
| `docs/BUILD-LOG.md` | Phase 1's log, append-only and finished. Phase 2 logs to `BUILD-LOG-2.md`. |
| `PHASE-1-NOTES.md` | Phase 1's deviation record, closed. Phase 2 records to `PHASE-2-NOTES.md`. |
| `docs/plans/architecture.md` | The reference doc both phases cite; its one wrong line is corrected in the merge commit (§16), not in a working branch. |

**Files outside the ownership list, with the one-line justification each:**

| File | Justification |
|---|---|
| `src/core/types.ts` | `Card`, `Deck`, `PrintLine` and `CarriageState` are named inside `src/core/devices/*`, which cannot import `src/formats`; and `Device` / `Channel` are declared here, not in `channel.ts`. Four localised regions — §6, §5, §7, §8 — one wave each, no new section and no EOF append (§5, §11). |
| `src/core/isa/dmods.ts` | Four `available: false → true` flips on the `J_D_TABLE` rows `9`, `@`, `R`, `Q` (channel 1), now that the 1403 and the inquiry latch exist. Data only; `CARRIAGE_D_TABLE` and `X2_DEVICE` are read, not edited. |
| `src/core/isa/exec/branch.ts` | The `J` executor must reach the four new channel senses: ~10 lines in one lookup. 1b touches `exec/arith.ts`, not this file. |
| `test/dmods.test.ts` | Two assertions, both in wave 4. `:169-175` — the available `J`-d set is exactly `[' ','Z','W','V','S','U','T','/']`; it gains `9 @ R Q`. `:177-183` — the loop over `['9','!','@','⌑']` asserting each is unavailable; only `!` and `⌑` may remain (channel 2). |
| `test/exec-branch.test.ts` | Two blocks, both in wave 4. `:155-157` — `J_DMODS_NOT_IN_PHASE_1` contains `9`, `@`, `Q`; those three lines go. `:167-173` — the whole test "`J (I) 9` (BC9, the 1403 in Phase 2) stops with `unimplementedOp` and its citation", which asserts `m.step() === 'unimplementedOp'`, the message text and `iar === 107`. It is **rewritten**, not edited: `J (I) 9` branches when the carriage is on a channel-9 punch and falls through when it is not. Budgeted in wave 4. |
| `test/channel.test.ts` | Its `FakeDevice` (:25) implements `Device`; `Device` gains one optional member (`outputCells`), so the file is compiled against the widened interface. No signature it uses changes. |
| `test/console1415.test.ts` | The read stub becomes real (:124-129 asserts `read()` returns null with no request — still true, but the describe block's title and the surrounding context change). |
| `test/exec-io.test.ts` | `K` no longer throws `UnimplementedOp` (wave 2); `F` no longer throws (wave 3). Two edits, one per wave — the 1403 does not exist until wave 3. |
| `src/ui/internals/main.ts` | **The page's only `Machine` lives here** (`const machine = createMachine({ size: 10_000 })`, not exported) and it is the only code that reads `#app`. Two lines: one import and one `mountUnitRecord(machine, app, redraw)` call, so the unit-record views drive the same machine the console controls do. Without it `mount.ts` would have to call `createMachine()` itself and the page would hold two machines — the deck in one, the keyed bootstrap in the other. |
| `index.html` | Three style rules for the card face and the green bar. |
| `package.json` | One script: `"demo": "npm run build:tools && node build/tools/run-deck.js"`. `run-deck.ts` **defaults its deck argument to `demos/hello-dad.cards`**, so the bare `npm run demo` runs the demo; a positional path does reach the last command of the `&&` chain (verified against npm 10.8), but any **flag** must follow `--` or npm eats it — hence `npm run demo -- --update`. `tsconfig.tools.json` needs nothing: its `tools/**/*.ts` glob already covers `run-deck.ts`, and the bootstrap keystrokes it needs live in `src/formats/loader.ts`, inside that glob (§8.1). |

**Expected rebase points, and how each is kept mechanical:**

- **`src/core/types.ts`** — the only file both phases plausibly edit. **Nothing is appended at the
  end of the file.** That file has sections 1-8 plus §3a and no §9, §10 or §11, and Phase 2 creates
  none: every new type goes into the numbered section that already owns its kind, which is what
  keeps each wave's diff a small hunk in a known place. Four regions, in four separate waves:
  **§6** — the "NOT in Phase 1" comment block is **replaced in place** by `Card` and `Deck` (wave 1);
  **§5** — `Channel.control` (wave 2), then `Device.outputCells` and the four sense getters (wave 4);
  **§7** — `PrintLine` and `CarriageState` beside `PrintEvent`, which does not move (wave 3);
  **§8** — `MachineState` gains one block per wave, `reader` in 2, `printer` in 3, `punch` in 4.
  **1b's only edit to this file is a `terms` field inside `ExecContext`, which is §4, at ~:196** —
  a fifth region, touched by neither §5 nor §8 nor §3/§3a. Different regions, no reflow.
- **`src/core/isa/table.ts`** — **zero Phase-2 edits.** Verified in the code: `:640` `K` and `:1028`
  `F` already carry `implemented: true`, `lengths: [2]`, their d-tables, `regs: NSI_AP_BP`,
  `T_SELECT_STACKER_US` / `T_CARRIAGE_US`, their citations, and `exec: io.selectStacker1` /
  `exec: io.carriage1`. Nothing in that file changes. (If a wave reviewer wants the two "arrives in
  Phase 2" comments updated, that is comment text only and stays inside those two rows.)
- **`test/isa-table.test.ts`** — two array literals, **touched twice, one line each time**. Wave 2:
  `BUILT_SO_FAR` gains `'K'`. Wave 3: it gains `'F'` and `DEVICE_DEFERRED` shrinks to `['U']`. The
  loop at :227 does `if (BUILT_SO_FAR.includes(entry.opChar)) continue;` *before* consulting
  `DEVICE_DEFERRED`, so **`BUILT_SO_FAR` alone satisfies the assertion**; `DEVICE_DEFERRED` shrinks
  to keep the list truthful, not because the assertion needs it. (The reverse edit — shrinking
  `DEVICE_DEFERRED` alone — is the one that fails.)
- **Doc appends** — `open-questions.md` gains one dated section at the end; `BUILD-LOG-2.md` and
  `PHASE-2-NOTES.md` are new files. No interleaving with 1b's appends.

**Wave gate, mechanical:** every wave runs `git diff --name-only main` and **fails if any path
intersects the do-not-touch table**. Any file outside the ownership list and outside the
justification table above fails the same gate.

---

## 4. File list

```
NEW — src/core
  devices/reader1402.ts     hopper, 80-col buffer, 3 stackers, EOF, K d           ~200
  devices/punch1402.ts      three pockets, WLR on >80                              ~90
  devices/printer1403.ts    132 positions, 48-slug chain, carriage tape, paper    ~260

EDIT — src/core
  devices/console1415.ts    read() becomes the real inquiry dialogue              +~90
  channel.ts                control(); four Figure-35 getters; one outputCells    +~75
                            line in write(). NOTHING ELSE MOVES.
  isa/exec/io.ts            carriage1 / selectStacker1 call channel.control  +~25 −~20
  machine.ts                register each device in ITS OWN wave; loadDeck();     +~95
                            one reader/printer/punch snapshot block per wave (w2/w3/w4);
                            programReset drops the inquiry latch;
                            endOfJob() — one line, calls Printer1403.flush() (§7.3)
  types.ts                  §6 Card/Deck (w1); §5 Channel.control (w2);           +~70
                            §7 PrintLine + CarriageState (w3);
                            §5 outputCells + 4 getters (w4);
                            §8 MachineState — reader w2, printer w3, punch w4
                            NO new section, nothing appended at EOF  [justified, §3]
  isa/dmods.ts              four `available` flips                 [justified, §3]  4 words
  isa/exec/branch.ts        the four channel senses                [justified, §3]  ~10

EDIT — src/ui
  internals/main.ts         one import + mountUnitRecord(machine, app, redraw) —
                            the page's ONLY Machine lives here     [justified, §3]  2

NEW — src/formats
  card.ts                   punch bijection, deck text parse/format               ~150
  objectdeck.ts             ObjectRecord <-> Card, C28-0309-1 Figure 2            ~150
  loader.ts                 bootstrap constants, the bootstrap card, loader deck  ~200

NEW — src/ui/unitrecord    (Phase 4 relocates this directory into src/ui/period/ and styles it)
  session.ts                Deck + machine + which card is where — DOM-free        ~90
  cardView.ts               one card face: 12x80 holes, interpretation band        ~90
  deckBox.ts                textarea, parse errors, PUT DECK IN HOPPER             ~70
  readerView.ts             hopper, five stackers, READER START, END OF FILE       ~80
  printerView.ts            green-bar paper, 132 cols, carriage position          ~100
  inquiryView.ts            INQUIRY REQUEST / WORD MARK / RELEASE / CANCEL         ~70
  mount.ts                  mountUnitRecord(machine, host, redraw) — the views     ~40
                            under the internals page, on the page's OWN Machine.
                            It never calls createMachine. ONE mount call per view,
                            added in the wave that builds it: cardView + deckBox in
                            w1, readerView w2, printerView w3, inquiryView w4 (§11)
  raw-import.d.ts           `declare module '*.cards?raw'` — 3 lines, so the         3
                            sample-deck import typechecks (§10)

NEW — oracle
  io-status.json            Figures 62, 63, 89, 91, 45, 46 as ONE fixture:          —
                            device x condition x when-set, each row with its page
  chain48.json              the 48 A2 graphics, the 12 blank-printing codes,        —
                            and the three special renderings (charset.md §5)

NEW — demos / tools / golden
  demos/hello-dad.cards     the six-card demo deck, checked in                      —
  tools/run-deck.ts         CLI: load a .cards deck, run, print the page;          ~120
                            --golden <file> / --update (§13 check 3)
  test/golden/hello-dad.page.txt   the gating golden — the ONLY one                 —

NEW — test                                                                        ~2,300
  card.test.ts              tier 0: the bijection, proved twice
  deck-text.test.ts         tier 0: round trip, error cases
  reader1402.test.ts        tier 1: Figure 5 through the real 1402; Figure 62
  punch1402.test.ts         tier 1: Figure 5 output side; the punch->read identity
  printer1403.test.ts       tier 0 chain + carriage; tier 1 %21 and the auto-space
  console-inquiry.test.ts   tier 1: io.md §8's six steps, Figure 45 row for row
  channel-control.test.ts   tier 1: F/K interlock, SSF's BAR = Bp
  objectdeck.test.ts        tier 0: encode/decode round trip, three rejections
  loader.test.ts            tier 3: core cell for cell after a 3-record deck
  tier4-demo-deck.test.ts   tier 4, GATING: the six-card deck end to end

EDIT — test                                              [each justified in §3]
  isa-table.test.ts · dmods.test.ts · exec-branch.test.ts · channel.test.ts
  console1415.test.ts · exec-io.test.ts

EDIT — root                                              [each justified in §3]
  index.html · package.json

NEW — docs
  docs/BUILD-LOG-2.md · PHASE-2-NOTES.md
EDIT — docs/research/open-questions.md   (one dated "Phase 2" section, appended)
```

---

## 5. The load-bearing types

```ts
// ═══ src/core/types.ts §6 — REPLACES the "NOT in Phase 1" comment block — WAVE 1 ══════
// charset.md §2, §2.1, §3. Only the 6-bit BCD is stored; punches are DERIVED on render,
// because on the 1410 the mapping is a bijection in BOTH directions including 2-8 <-> A-bit.
// A card carries NO word mark and NO check bit — charset.md §7: "word marks exist only in
// core — they are not on cards or tape". Marks travel in a deck as 0-5-8 word separators.
//
// These live HERE and not in src/formats because their first consumer is
// devices/reader1402.ts, and src/core imports nothing outside src/core
// (test/core-is-dom-free.test.ts). `Column`, `punchMask` and `bcdOfPunches` stay in
// src/formats/card.ts: the 1414 read buffer holds BCD, and the machine never sees a punch.

export const CARD_COLUMNS = 80;

/** Exactly CARD_COLUMNS six-bit BCD codes, 0o00..0o77. Built only by `makeCard`. */
export type Card = Uint8Array;
export type Deck = readonly Card[];

// ═══ src/core/types.ts §7 — BESIDE the existing PrintEvent, which does not move — WAVE 3 ══
// Wave 3, with `Printer1403` and with §8's `printer` block, because nothing before wave 3 names
// either type: `PrintLine` is the printer's paper and `CarriageState` is its carriage.
// PrintEvent (frozen in Phase 1) is what the PROGRAM asked for, and its `afterPrint` flag is
// already exactly what io.md §7's deferred carriage d-characters need. PrintLine is what a
// human reads. The 1403 keeps BOTH: the carriage position is live device state during the run
// (J (I) 9 and J (I) @ read it), so deriving the paper afterwards would implement the carriage
// twice. `renderGreenBar(paper)` is the pure function the golden file and the UI share.

export interface PrintLine {
  readonly page: number;      // 1-based FORM number — see the increment rule on CarriageState
  readonly line: number;      // 1-based within the form
  readonly text: string;      // <= 132 chain glyphs, trailing blanks preserved
}

export interface CarriageState {
  // `page` is the FORM count, and it increments on exactly one event: carriage motion that passes
  // the last line of the form and wraps to line 1 of the next one. On DEFAULT_CARRIAGE_TAPE, which
  // punches channel 1 once at line 1, "skip to channel 1" IS that event — but stating the rule as
  // the wrap rather than as "a skip to channel 1" keeps it true for any tape.
  readonly page: number;
  readonly line: number;                    // 1..tape.formLines
  readonly channel9: boolean;               // io.md §5 Figure 35 — on when the hole is sensed,
  readonly channel12: boolean;              // off when any other channel is sensed
  // The automatic single space the last print armed, NOT yet performed. Exposed rather than
  // hidden so that `snapshot()` stays a pure read (§7.3): the space is performed only by the next
  // write, the next `F`, or an explicit `flush()` — never by looking at the paper.
  readonly autoSpacePending: boolean;
}

// ═══ src/core/types.ts §5 — the TWO seam edits, in TWO different waves ═══════════════
// `Channel.control` is wave 2 (it is what `K` needs). `Device.outputCells` and the four sense
// getters are wave 4 (the 1403 and the four `J` branches). Wave 3 does not touch §5 at all.
export interface Device {
  readonly x2: string;
  readonly bits: 7 | 8;
  precheck(x3: string, d: string): Partial<ChannelStatus>;
  read?(x3: string, d: string): Uint8Array | null;            // UNCHANGED. null = No Transfer
  write?(x3: string, d: string, data: Uint8Array, mode: IoMode): Partial<ChannelStatus>;
  // UNCHANGED — this member already exists in types.ts §5 with this exact signature and the
  // comment "K/4 stacker, F/2 carriage". Phase 2 gives it its first implementers and its first
  // caller (`Channel.control`, §6.1) and adds NO line here: wave 2's whole §5 diff is
  // `Channel.control` below, and wave 4's is `outputCells` plus the four getters.
  control?(op: string, d: string): Partial<ChannelStatus>;    // K stacker, F carriage
  /**
   * ADDED IN PHASE 2. An x3 OUTPUT SUB-OPERATION that must see core word marks, applied by the
   * channel to the cells BEFORE `translateForOutput` runs. Exactly one implementer: the 1403's
   * `%21` Write Word Marks as 1s (io.md §7; charset.md §7, both [verified]).
   *
   * It cannot be device-side work after the fact — `translateForOutput`'s `dropWordMark` masks
   * bit 7 (and flips C) for every 7-bit device before `write()` is called, so the marks are
   * already gone — and it cannot be channel-side work either, because Figure 107's x3 column is
   * keyed on x2 and channel.ts's own decodeX comment says x3 "belongs to the device, not the
   * channel". The device declares the substitution; the channel applies it.
   *
   * DESCOPE (§14 R3): if a reviewer judges this speculative, drop `%21`, have
   * Printer1403.precheck return Not Ready for x3 = '1', and delete the member. Nothing else
   * in the phase uses it.
   */
  outputCells?(x3: string, cells: readonly Cell[], mode: IoMode): readonly Cell[];
}

export interface Channel {
  readonly status: Readonly<ChannelStatus>;
  readonly interlock: boolean;
  readonly correctLengthRecord: boolean;
  decodeX(x1: string, x2: string, x3: string, at: Addr): XControl;
  io(mode: IoMode, storage: Storage, x: XControl, start: Addr, d: string, at: Addr): number;
  testStatus(dBits: number): boolean;
  release(): void;
  /**
   * ADDED IN PHASE 2. `F d` and `K d` are form `Od` — no x-control field, no B-address, no data
   * (io.md §2's instruction summary; isa/table.ts `lengths: [2]`) — so they cannot go through
   * `io()`. But they ARE I/O instructions on the interlock's own op list — io.md §5:
   * "I/O instructions requiring the intervening test are op codes M, L, U, F, 2, K, 4" — and
   * Figures 62 and 91 give both a status column. So ALL NINE STEPS run, reusing the same
   * clearStatus / applyStatus / anyStatusOn / interlock code; what changes is that step 7
   * transfers no data — it is the device's mechanical action (stack-and-feed, carriage motion) —
   * and step 4's readiness test, step 7 and step 8's error test are the ONE call
   * `device.control(op, d)`, whose returned `Partial<ChannelStatus>` is step 8. The device checks
   * its own readiness first and returns Not Ready without acting.
   *
   * `Device.precheck` is deliberately NOT on this path, and that is load-bearing: Figure 62 says
   * the reader's Condition is "EOF — last card stacked (**NEVER** for select-stacker)" and its
   * Data Check "…(**never** for select-stacker)". Routing `K` through `precheck` would report
   * Condition and clear the EOF latch, stealing the end-of-file report the next card-read
   * instruction owes the program. Structural, not conditional (io.md §6, A22-0526-3 pp.61, 63).
   * There is no `io()` record and no B-address either way.
   * Routing is by the OP character, because the instruction carries no x2:
   * CARRIAGE_DEVICE_X2 = '2', STACKER_DEVICE_X2 = '1'.  [likely] — see §15.
   */
  control(op: 'F' | 'K', d: string, at: Addr): void;
  /**
   * ADDED IN PHASE 2. The four conditions op `J` tests, io.md §5 Figure 35 [verified]:
   * BC9 `9`, BCV `@`, BPCB `R`, BNQ `Q`. They are NOT among the seven IndicatorName latches —
   * types.ts §3 says so explicitly ("'six' in this project always means ChannelStatus") — they
   * are device state, and the channel is the only thing that holds devices. Figure 35 lists
   * them PER CHANNEL, which is what makes the channel the right owner. Four named booleans
   * rather than a `sense(d)` string switch, because four names read better to two people
   * reading this file together.
   */
  readonly carriageChannel9: boolean;
  readonly carriageChannel12: boolean;
  readonly carriageBusy: boolean;      // OPEN: CARRIAGE_NEVER_BUSY — always false, §15
  // OPEN: CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH — io.md §8 contradicts itself about whether the
  // latch the INQUIRY REQUEST key sets is the latch BNQ tests. One latch here; §15.
  readonly inquiryRequest: boolean;
}

// ═══ src/core/types.ts §8 — MachineState gains three blocks, ONE PER WAVE ════════════
// Each block is a REQUIRED member added in the wave that builds the device populating it —
// `reader` in wave 2, `printer` in wave 3, `punch` in wave 4 — and never a wave earlier. That
// is the simpler of the two orderings (the other: declare all three optional in wave 2 and
// tighten them later, which costs a `?.` at every use site and a second edit per block), and it
// is the one that keeps `npm run typecheck` — a gate at EVERY commit, §12 — green:
//   · `machine.ts`'s `snapshot()` (:396, `const state: MachineState = {…}`) is the ONLY place in
//     the repo that CONSTRUCTS a MachineState, so a required member is a compile error for
//     exactly one file, and that file is owned by the same wave that adds the member;
//   · the internals page never constructs one. `panel.ts`, `registerView.ts` and `coreView.ts`
//     take `MachineState` as a `render(s)` parameter and read named fields, so a new block is
//     invisible to them until a Phase-2 view reads it. Adding all three in wave 2 is what would
//     break the typecheck: wave 2 has no Printer1403 and no Punch1402 to populate two of them.
export interface MachineState {
  /* … every Phase 1 field unchanged … */
  // WAVE 2, with Reader1402 and machine.loadDeck()
  reader: {
    hopper: number; buffered: boolean; eofKey: boolean; eofLatch: boolean;
    stackers: { readonly '0': number; readonly '1': number; readonly '8-2': number };
  };
  // WAVE 3, with Printer1403 — and it is why §7's PrintLine / CarriageState are wave 3 too
  printer: { carriage: CarriageState; paper: readonly PrintLine[] };
  // WAVE 4, with Punch1402
  punch: { stackers: { readonly '0': number; readonly '4': number; readonly '8-2': number } };
}
// The 1402 has FIVE pockets, not six: 8/2 is shared between the read feed and the punch feed
// (console-and-physical.md §7 "0 (NP), 4, 8/2, 1, 0 (NR)"; io.md §6). Each device counts what IT
// stacked — that is what the session needs to map counts back to cards — and `readerView.ts`
// renders the shared cell as `reader['8-2'] + punch['8-2']` (§10). Stated here so the two counts
// are never read as two pockets. Because `punch` arrives in wave 4, wave 2's `readerView.ts`
// draws all five pockets in machine order but reads only the `reader` block: `0 (NR)`, `1` and the
// shared cell from `reader.stackers`, and the two punch-only pockets — `0 (NP)` and `4` — as a
// literal `0`, so the strip never changes shape between waves. Wave 4 swaps those two literals for
// `punch.stackers['0']` and `['4']` and adds `+ punch.stackers['8-2']` to the shared cell — three
// lines, and `readerView.ts` is listed in wave 4 for them (§11).
// COUNTS, not cards. The session (src/ui/unitrecord/session.ts) holds the Deck and derives
// which card is in the read station and which are in each pocket, so the animation frame never
// copies 80-byte arrays and MachineState stays structured-cloneable — the property
// architecture.md §2 B11 protects so the machine can still move into a Worker.

// ═══ src/formats/card.ts ═════════════════════════════════════════════════════════════
// The punch tables are DERIVED AT MODULE LOAD from the `hollerith` column already in
// src/core/bcd.ts ('12-7-8', '2-8', '0', 'none'). There is no second punch table anywhere in
// this project, and the tier-0 test proves the derivation against charset.md §3's INDEPENDENT
// structural rule (zone 12->BA, 11->B, 0->A; digits direct; a lone 0 punch is 8-2 with no zone;
// 2-8 alone is the A bit) recomputed inside the test. A transcription slip in either fails.

export type Column = number;   // 12-bit mask, bit11 = row 12, bit10 = row 11, bit9 = row 0 … bit0 = row 9

export function makeCard(codes?: ArrayLike<number>): Card;   // the ONLY Card constructor
export function punchMask(bcd6: number): Column;
export function bcdOfPunches(mask: Column): number | null;   // null = invalid column

export interface DeckError {
  readonly line: number;      // 1-based line in the pasted text
  readonly column: number;    // 1-based card column the token would have produced
  readonly message: string;
}

/**
 * One line = one card. A COLUMN TOKEN is one of:
 *   - any of the 64 machine glyphs (bcd.ts's `glyph` column) — one column;
 *   - `{12-7-8}` — a punch list naming rows 12, 11, 0..9 in any order;
 *   - `{}` — an unpunched column, for legibility.
 * `{` and `}` are NOT among the 64 characters, so a punch list can never collide with data —
 * the same argument controls.ts already makes for `^` as the WORD MARK key. Short lines are
 * blank-padded to 80; a longer line is an error naming line and column; a whitespace-only line
 * is skipped (a genuinely blank card is `{}`).
 *
 * THERE IS NO WORD-MARK NOTATION IN A DECK, AND THAT IS THE POINT. A card carries no word mark
 * (charset.md §7); a mark travels as a `{0-5-8}` word separator that load mode converts on the
 * way in (io.md §3, software.md §8.1). A `^` here would let someone punch a card the 1402
 * cannot punch.
 *
 * Errors are DATA, not throws: the paste box has to show WHERE, and a bad column parses as
 * blank so the whole deck still renders.
 */
export function parseDeck(text: string): { deck: Deck; errors: readonly DeckError[] };

/** Canonical form: the glyph where a person can type one, `{…}` otherwise. */
export function formatDeck(deck: Deck): string;

// ═══ src/formats/objectdeck.ts — software.md §8.1 / C28-0309-1 Figure 2 ══════════════
// NOT in types.ts: nothing inside src/core names these. An object deck becomes Cards before it
// reaches a device, and the loader that consumes them is a 1410 program, not TypeScript.

export interface ObjectRecord {
  readonly loadAddress: Addr;      // cols 2-6: high-order position of the area
  /**
   * Cell bytes, `WM | bcd6` — and NEVER a C bit. The deck has no parity: a condensed card is
   * loaded by a load-mode read, which "replaces the whole target byte including the word-mark
   * bit" and RECOMPUTES parity (io.md §3, 223-2692 p.11 Case 2 = storage.writeWhole).
   * `payload.length` IS the count in cols 11-12; word separators are not counted (§8.1).
   */
  readonly payload: Uint8Array;
  readonly sequence?: string;      // cols 73-75
  readonly ident?: string;         // cols 76-80
}

export interface ObjectDeck {
  readonly records: readonly ObjectRecord[];
  /** The execute card's entry point. Col 1 = `E`, instruction from col 2 (emulators.md §7). */
  readonly entry?: Addr;
}

/**
 * Rejects three shapes BY NAME, each with its research row:
 *  1. payload + separators past column 72 — "up to 60 characters" (C20-1602-8; software.md §9);
 *  2. a word-marked GROUP MARK in the payload: a load-mode read would assemble a live GM-WM in
 *     core and truncate the record early with a spurious WLR (io.md §3 "a load-mode read CAN
 *     create a GMWM" [likely]; open-questions.md io row offers exactly two options and we take
 *     the second, "forbid the pattern in the deck format");
 *  3. a word separator in column 72 with its character in 73 — the undocumented "80th column is
 *     a word separator with nothing following" case (open-questions.md io row). The encoder can
 *     never emit it and the decoder rejects it.
 * Also forbidden by NOTE 1 of §8.1, verbatim: "Word separator characters cannot be loaded with
 * an associated word mark."
 */
export function encodeObjectRecord(r: ObjectRecord): Card;
export function decodeObjectRecord(card: Card): ObjectRecord;

// ═══ src/core/devices/printer1403.ts ═════════════════════════════════════════════════
// The 48-slug chain map lives HERE, not in bcd.ts, and the distinction is load-bearing:
// bcd.ts's `glyph` column is the 1415 TYPEBALL's 64 characters, this is the 1403 CHAIN's 48.
// charset.md §5 [verified]: `[ < ⧧ ] ; Δ ⌒ \ ⧻ : > √` are on NEITHER arrangement and print
// BLANK; `ƀ` prints the record-mark slug; `?` prints `&` on A (`+` on H, §5.1 [likely]);
// `!` prints `-`. §5.3's caution — copying SimH's mem_to_ascii silently selects the H
// arrangement — is quoted at the table. The chain is a constructor option, default 'A', and
// `renderGreenBar`'s header line names it (rule 1 below).
export type PrintChain = 'A' | 'H';
export function chainGlyph(bcd6: number, chain: PrintChain): string;

export interface CarriageTape {
  readonly formLines: number;                          // <= 132 (io.md §7). OPEN: 66 — §15
  readonly punches: readonly { line: number; channel: number }[];
}

export declare class Printer1403 implements Device {
  readonly x2: '2';
  readonly bits: 7;
  constructor(opts?: { chain?: PrintChain; tape?: CarriageTape });
  readonly events: readonly PrintEvent[];    // the raw stream, frozen in Phase 1
  readonly paper: readonly PrintLine[];      // the page, built as the carriage moves
  readonly carriage: CarriageState;
  precheck(x3: string, d: string): Partial<ChannelStatus>;
  write(x3: string, d: string, data: Uint8Array, mode: IoMode): Partial<ChannelStatus>;
  /** `%21` only: '1' where the cell carries a word mark, blank elsewhere. */
  outputCells(x3: string, cells: readonly Cell[], mode: IoMode): readonly Cell[];
  control(op: string, d: string): Partial<ChannelStatus>;   // `F d`, io.md §7 Figure 90
  /** Performs a pending automatic single space. End of job only — §7.3. Never called by a getter. */
  flush(): void;
}

/**
 * The pure renderer the golden page and the green-bar view both consume. A byte-for-byte gate
 * cannot be built against an unspecified renderer, so the contract is five rules and no more:
 *
 *  1. One header line — `1403 Model 2 · chain A · 66-line form` — then one blank line. The chain
 *     and the form length are not derivable from the text and both change every glyph or break.
 *  2. Body: each form in order; within a form, every line position from 1 to the highest line
 *     that printed on it. A position that printed nothing renders as an empty line, which is how
 *     carriage motion becomes visible in a diff.
 *  3. A printed line renders `text` with **trailing blanks trimmed**. Never padded to 132, never
 *     left-padded: position 1 is the first character. (`PrintLine.text` itself keeps its trailing
 *     blanks — that is device truth; the trim is a rendering.)
 *  4. Every form after the first is preceded by a lone form-feed character `\f` on its own line —
 *     one byte, a real printer artefact, visible in a diff as `^L`.
 *  5. Every line ends `\n`, the last one included. Bar shading, column rules, the carriage-position
 *     marker and the tape punches are `printerView.ts`'s and never appear in the text.
 */
export function renderGreenBar(paper: readonly PrintLine[], opts: {
  chain: PrintChain; formLines: number;
}): string;

// ═══ src/core/devices/console1415.ts — the inquiry request ═══════════════════════════
export interface InquiryEntry {
  readonly text: string;                    // glyphs from the 64-character set only
  readonly wordMarks: readonly boolean[];   // the WORD MARK key, per position (io.md §8 step 4)
  readonly ending: 'release' | 'cancel';
}
// OPEN: INQUIRY_ENTRY_IS_PRE_SUPPLIED — the operator's line is queued by RELEASE / CANCEL and
// consumed when the program's read executes, rather than typed while a synchronous step()
// blocks. An emulator device, not a hardware claim: core, the six latches and the console log
// are identical either way, and this emulator has no wall clock. §15.
```

---

## 6. The device-channel seam, as it attaches to the channel that exists

**Read `src/core/channel.ts` before this section. Phase 2 does not redesign it.** What Phase 1 built
is already correct for all three new devices, and the evidence is worth stating because it is the
strongest argument that the Phase-1 seam was right:

- **The 1402 read.** The reader hands back its 80-column buffer as bare BCD. `channel.read()`
  already implements every rule: move mode preserves existing word marks
  (`setChar(a, byte, storage.wm(a))`, 223-2692 p.58); load mode consumes a single separator into a
  pending word mark, collapses a pair into one stored separator with no mark, and replaces the whole
  byte (`writeWhole`, p.11 Case 2, Figure 5); a GM-WM in core suppresses the store gate, survives and
  ends the transfer; the extra E-cycle sets or blocks WLR; `$` skips both, gated on
  `suppressGroupMarkTest` (io.md §3 steps 2 and 5). **Zero lines change.**
- **The 1403 and the punch write.** `translateForOutput('load', 7, cells)` already emits a word
  separator ahead of each marked character and doubles a stored separator (A22-0526-3 pp.40-41). The
  1403 printing a blank ahead of a marked character is then not a printer rule at all — it is the
  *chain* map, because the word separator is on neither 48-character arrangement (`charset.md` §5,
  §7). The punch punching 0-5-8 is the same separator. Rendering is device work. **Zero lines
  change.**
- **The 1415 read.** The console is the one 8-bit device (io.md §1). `channel.read()` already does
  `wm = pendingWordMark || (device.bits === 8 && (byte & WM) !== 0)` → the WORD MARK key's mark
  enters storage in load mode; and `writeWhole` erases what was there. In move mode it does
  `setChar(a, byte & BCD6, storage.wm(a))` → marks undisturbed. **That is Figure 44's RCPW and RCP
  rows, already built.** Better: all three of io.md §8's WLR sentences fall out for free — RELEASE at
  the correct count leaves core[BAR] holding the pre-placed GM-WM, so the extra E-cycle blocks WLR;
  an early RELEASE leaves something else there, so WLR sets; excess characters run into the GM-WM, so
  the store gate ends the transfer and WLR sets. **No console code.**

Three things the seam genuinely lacks, each forced by a documented behaviour that is otherwise
unreachable.

### 6.1 `Channel.control(op, d, at)` — the short-form ops

`F d` and `K d` carry no x-control field and no B-address, so `DeviceRegistry.lookup` has nothing to
look up on and `io()` cannot carry them. But io.md §5 puts both on the interlock's op list —
"**M, L, U, F, 2, K, 4**" — and Figures 62 and 91 give each a status column. So `control()` runs
**all nine steps**, reusing `clearStatus`, `applyStatus`, `anyStatusOn` and the same interlock
rules; what differs is that step 7 moves no data — it is the device's mechanical action — and that
steps 4, 7 and 8 are the one `device.control(op, d)` call. There is no `io()` record and no
B-address, and `Device.precheck` is not on this path (see the doc comment in §5: that is what makes
Figure 62's two "never for select-stacker" rows structural). Routing is a two-row data table, not a
mechanism:

```ts
// io.md §2's instruction summary: `F d` is the 1403 carriage (A22-0526-3 pp.80-81) and `K d` is
// the 1402 reader's stacker-and-feed (pp.62-63). No figure prints an x2 for an op that HAS NO
// X-FIELD — Figure 107's x2 column is keyed on the instruction's x-control field — so this
// mapping is physical rather than stated. Named constants, tagged, recorded in §15.
const SHORT_FORM_DEVICE = [
  { op: 'K', x2: STACKER_DEVICE_X2,  cite: 'io.md §6 / A22-0526-3 pp.62-63' },   // '1'
  { op: 'F', x2: CARRIAGE_DEVICE_X2, cite: 'io.md §7 / A22-0526-3 pp.80-81' },   // '2'
] as const;
```

A device with no `control` method gets Not Ready, exactly as a device with no `write` does today
(io.md §9 Figure 99, "no such unit"). `isa/exec/io.ts`'s `carriage1` and `selectStacker1` become two
lines each — pull the d-glyph out of `ctx.regs.opMod`, call `ctx.channel1.control('F' | 'K', d, at)`
— and neither executor learns what a 1403 is.

### 6.2 Four sense getters — `J (I) 9 / @ / R / Q`

io.md §5 Figure 35 makes carriage channel 9, carriage overflow (channel 12), printer carriage busy
and inquiry request **per-channel** conditions, and `types.ts` §3 states explicitly that they are not
among the seven `IndicatorName` latches. `ExecContext` holds no device; the channel is the only thing
that does. So:

```ts
get carriageChannel9(): boolean  { return this.printer?.carriage.channel9  ?? false; }
get carriageChannel12(): boolean { return this.printer?.carriage.channel12 ?? false; }
get carriageBusy(): boolean      { return false; }   // OPEN: CARRIAGE_NEVER_BUSY — §15
get inquiryRequest(): boolean    { return this.console?.pendingRequest ?? false; }
```

`branch.ts` gains a four-entry map from those d-glyphs to those getters; `dmods.ts` flips the four
channel-1 rows to `available: true`. The channel-2 rows (`!`, `⌑`, `L`, `*`) stay false and keep
raising `UnimplementedOp` with their citations.

**What it costs and what it buys, stated plainly:** four data flips, ~10 lines in `branch.ts`, and
edits to two Phase-1 test files (`test/dmods.test.ts`, `test/exec-branch.test.ts` — both named in
§3, neither touched by 1b). It buys io.md §8 step 2, which is the *only* documented way a program
learns an inquiry request is pending, and carriage-channel-12 sensing, which Phase 5's RPG needs for
the `OF` overflow line condition (`rpg-sources.md`). Leaving them off would make the 1415 inquiry
path undemonstrable from a program and push a second `dmods.ts`/`branch.ts` edit into Phase 3 or 5.

### 6.3 `Device.outputCells` — the one hook

This is the only genuinely awkward thing in the phase and it is worth saying so.

`M %21` Write Word Marks as 1s prints `1` in every word-marked position and blank elsewhere
(`io.md` §7, `charset.md` §7, both `[verified]`). The printer cannot compute it from what `write()`
receives: `translateForOutput`'s `dropWordMark` masks bit 7 (and flips C) for every 7-bit device, so
the marks are gone before `write()` runs. The channel cannot compute it either: Figure 107's x3
column is keyed on x2 — `1` means "pocket 1" on the reader and "word marks as 1s" on the printer —
and `channel.ts`'s own `decodeX` comment states that x3 belongs to the device.

So the device declares the substitution and the channel applies it — one line inside `Channel1.write`,
ahead of the translation:

```ts
const out = device.outputCells?.(x3, cells, mode) ?? cells;
this.applyStatus(device.write(x3, d.d, translateForOutput(mode, device.bits, out), mode));
```

and the 1403's implementation is two manual rows written as two rows:

```ts
outputCells(x3, cells, mode) {
  if (x3 !== '1') return cells;
  // The hook runs BEFORE translateForOutput, so these cells still carry their WM bits in BOTH
  // modes — the load-mode answer is NOT derived from the separators, which do not exist yet.
  // Move mode: "word-marked positions print 1, all others print blank" (io.md §7 [verified]).
  // Load mode: A22-0526-3 p.80 / charset.md §7, verbatim — "(Thus, if the L Op code is used, no
  // printing results.)" That is stated on the manual's authority, and the `mode` test is where
  // it is stated. Two rows, encoded as two rows.
  return cells.map((c) => cell(mode === 'move' && (c & WM) !== 0 ? ONE : BLANK));
}
```

Wave 4 feeds the **same marked field** through `M %21` and `L %21` and asserts both rows, because
the two orderings of hook and translation give different answers over marked data and a comment
cannot be trusted to keep them apart.

**What the seam does NOT get, and why it does not need it.** No widening of `Device.read`. The two
cases that would seem to force one both fit `precheck`, which is step 4 of the nine and runs before
step 6 skips execution:

- **1402 End of File.** io.md §6: the EOF latch turns on after the last card's data transfer, "the
  next card-read instruction is a **NO OP**", and "on the read that reports it, the EOF latch is
  turned off as the Condition indicator is turned on". Set Condition in `precheck`, clear the latch
  there, and step 6 makes the NO OP literally true — **with zero channel change**. `precheck` is on
  the **read** path only; `control` does not call it (§6.1), which is what makes Figure 62's
  "never for select-stacker" rows structural: a `K` issued while the latch is on reports nothing
  and leaves the latch for the read that owes the program its end-of-file.
- **1415 CANCEL during a message.** Because the operator's entry is pre-supplied (§5,
  `INQUIRY_ENTRY_IS_PRE_SUPPLIED`), `precheck` can see it and report Condition before the transfer.
- **Reader Data Check with the data still transferred** is the one case `precheck` cannot express —
  and it is unreachable from any deck this emulator accepts (§7.1). Widening a Phase-1 interface for
  an unreachable path is the speculative typing `architecture.md` §12 disclaims. The row is asserted
  in `oracle/io-status.json` and the gap is stated in `PHASE-2-NOTES.md`.

---

## 7. Per-device design

### 7.1 `Reader1402` — x2 `1`, 7-bit

State: `hopper: Card[]`, `buffer: Card | null` (the 1414 Model 3's 80-position read buffer),
`stackers: { '0': Card[]; '1': Card[]; '8-2': Card[] }`, `started`, `transferred`, `eofKey`,
`eofLatch`.

- **READER START** is a key, not an instruction: it "feeds three cards and fills the read buffer with
  the first card's image" (io.md §6 step 1, A22-0526-3 pp.41-42, 60). We model the buffer, which is
  all the CPU can observe, and the three-card pre-feed shows up only in the Not Ready rule below —
  `READER_TRANSPORT_MODELS_ONE_CARD`, §15.
- **END OF FILE** is the other key. It matters: io.md §6 `[verified]` — "with **3 cards remaining**,
  a read issued before the EOF key is pressed sets the **Not Ready** indicator — press EOF then
  Start to let the last three through", which is why `software.md` §10.7's PAT procedure says
  "Press READER START and END-OF-FILE". Modelled, so the key on the screen does something.
  `EOF_KEY_REQUIRED_AT_THREE_CARDS` names the one ambiguity: whether the buffered card counts
  toward the three (§15).
- **`precheck(x3, d)`**, io.md §6 Figure 62 as a table. **Read path only** — `control('K', d)` does
  not go through it (§6.1), which is the whole reason Figure 62's "never for select-stacker" holds:

  | Condition | Rule |
  |---|---|
  | not started, or `buffer === null` with an empty hopper | Not Ready |
  | cards remaining ≤ 3 and `!eofKey`, on a feeding read | Not Ready |
  | `eofLatch` on | **Condition** on, latch off, and step 6 then makes the read a NO OP |
  | x3 = `9` and `transferred` with no intervening SSF | No Transfer |
  | x3 outside `0 1 2 9` | Not Ready — `UNKNOWN_X3_IS_NOT_READY`, §15 |
- **`read(x3, d)`** returns all 80 buffer columns as cell bytes (`parity(bcd,false) | bcd`; a 7-bit
  device has no WM bit and a card carries none). **How many reach core is the channel's business** —
  `software.md` §10.4 is blunt about it: "80 is the buffer size, not an unconditional store count."
  Then the post-transfer motion: x3 = 0/1/2 stacks the buffered card in pocket NR/1/8-2 and feeds the
  next into the buffer; x3 = `9` does neither and sets `transferred`. If the feed empties the hopper,
  `eofLatch = eofKey`.
- **`control('K', d)`**, d = 0/1/2 — Select Stacker and Feed: stack, feed, clear `transferred`. No
  Transfer if `!transferred` ("two select-stacker-and-feeds with no intervening x3=9 read"). Never
  Data Check and **never Condition** — Figure 62 prints "never for select-stacker" on both rows, so
  a `K` issued with the EOF latch on reports nothing and leaves the latch alone; both rows go into
  `oracle/io-status.json` and wave 2 asserts the sequence (latch on → `K 0` → no Condition → the
  following read reports Condition and NO-OPs). And the named negative control: **`BAR = Bp`,
  unchanged, and "Word marks are not affected"** (io.md §6 item 5, A22-0526-3 p.62) — which the
  table row's `regs: NSI_AP_BP` already encodes, so the test asserts it rather than the code
  arranging it.
- **Errors, stated not faked.** A reader check transfers the data *and* sets Data Check; a validity
  error transfers the invalid character unchanged (io.md §6 "Errors", `[verified]`). Neither is
  producible by any deck this emulator accepts, and `precheck` cannot express "set Data Check and
  still transfer" (§6). Both rows live in `oracle/io-status.json` and are asserted as table rows; the
  behaviour is a documented coverage gap in `PHASE-2-NOTES.md`, not a fabricated code path.

### 7.2 `Punch1402` — x2 `4`, 7-bit

`write(x3, d, data, mode)`, x3 ∈ `0`/`4`/`8` = pocket NP/4/8-2. The record arrives already
translated: in load mode the channel has put a 0-5-8 separator ahead of every marked character and
doubled every core separator, so the punch's only job is `byte & BCD6` into a `Card` and stack it.
Two rules of its own: more than 80 characters sets **WLR and the card is not punched**
(io.md §6 Figure 63 — `OVERLONG_RECORD_SETS_WLR`, §15); columns past the record are blank
(`BUFFER_CLEARED_BEFORE_TRANSFER`, §15). WLR is never No Transfer here — Figure 63 prints "never".

~90 lines, and it buys the phase's cheapest oracle: **core → punch → card → reader → core is the
identity in both modes**, which also exercises the output half of io.md §3's Figure 5 vector
(`A(wm) B(wm) WS C` punches as `A B WS C` in move mode and `WS A WS B WS WS C` in load mode).

### 7.3 `Printer1403` — x2 `2`, 7-bit, Model 2, 132 positions

- **Write a Line, x3 = `0`, d = `W`.** Core → the 1414 print buffer up to the GM-WM, then the printer
  starts; more than 132 characters sets WLR and the line is not printed (io.md §7 Figure 89). Each
  cell becomes a **chain glyph**, which is *not* `glyphOf`: `glyphOf` is the 1415 typeball's 64
  characters, and the 1403 carries 48 (`charset.md` §5). The 12 codes on neither arrangement print
  blank, `ƀ` prints the record-mark slug, `?` prints `&`, `!` prints `-`. The table lives in
  `printer1403.ts` — it is a property of the printer, not of the code point, which is exactly why it
  does not go in `bcd.ts` — and is asserted against `oracle/chain48.json` for all 64 codes. Chain is
  a constructor option defaulting to `'A'`, with §5.3's SimH caution quoted at the table.
  **Load-mode `%20` needs no code at all:** the channel already emitted the separator, and the
  separator's chain glyph is blank — which *is* io.md §7's "a blank precedes each word-marked
  character".
- **Write Word Marks as 1s, x3 = `1`.** §6.3. `M` prints 1s and blanks; `L` prints nothing at all,
  and that verbatim sentence falls out of the same expression rather than being special-cased.
- **Automatic single space.** "If no carriage-control instruction follows, an automatic single space
  occurs at the end of the buffer-to-printer transfer" (io.md §7). A device cannot see the future, so
  the space is **deferred**: a print arms `autoSpacePending`, and it is performed by exactly three
  things — the **next write** (before it prints), the **next `F`** (which consumes and replaces it),
  and an explicit **`flush()`**, reached through a one-line `machine.endOfJob()` that
  `tools/run-deck.ts` and `test/tier4-demo-deck.test.ts` call after the halt (the devices stay
  private to the façade). **Nothing that merely observes state performs it.** `snapshot()` runs on every
  animation frame and in every test; a getter that moved the carriage would make
  `snapshot().printer.paper` depend on how many times the UI redrew, make the byte-for-byte golden
  differ between one `npm run demo` read and hundreds of browser frames, and break
  `architecture.md` §2's "devices produce values, never side effects". The pending space is instead
  *visible* — `CarriageState.autoSpacePending` (§5) — so the printer view can show the paper as it
  will be. Wave 3 asserts both arms: a print then `F` (space consumed, one motion), and a print then
  `flush()` (space performed, carriage one line down, paper unchanged).
  `AUTO_SPACE_IS_DEFERRED` and `AUTO_SPACE_IS_CANCELLED_BY_A_CARRIAGE_INSTRUCTION`, §15.
- **`F d` Carriage Control** — all 30 rows of `dmods.ts`'s existing `CARRIAGE_D_TABLE`
  (io.md §7 Figure 90; numeric bits give the channel or space count, zone bits the variant).
  `afterPrint` variants store a pending motion the next write applies — which is exactly the
  `afterPrint` flag Phase 1 already put on `PrintEvent`. **"A skip to a channel the brushes are
  already positioned on moves to the next punch of that channel"** (io.md §7) is encoded, and it is
  the one carriage rule implementers get wrong: the search starts at `currentLine + 1`. An undefined
  d raises `InstructionCheck`, matching `UNDEFINED_J_D_CHAR_…` and `UNDEFINED_IO_D_CHAR_…` already in
  the codebase (§15).
- **Power-on position.** Home: page 1, line 1, and **positioned on** the channel-1 punch, which is
  the state the Carriage Restore key produces ("positions the carriage at channel 1 (home)",
  io.md §7). It matters because of the next-punch rule above: from home, `F1` ejects to line 1 of
  the *next* form, which is why the demo's skip is at the end of the program and not the start
  (§13). `CARRIAGE_POWER_ON_AT_CHANNEL_1_HOME`, §15, with a wave-3 test in both directions —
  `F1` from home advances a form; `F1` from mid-form advances to the same place.
- **Carriage tape.** 12 channels, at most 132 lines, channel 1 = home (io.md §7, A22-0526-3 pp.68,
  71-72). No manual publishes any site's tape punching. Default: 66 lines (11 in at 6 lpi, from
  `console-and-physical.md` §8's `[likely]` green-bar stock), channel 1 at line 1, channel 9 at 57,
  channel 12 at 60. `DEFAULT_CARRIAGE_TAPE` `[unverified]`, a constructor option, and *rendered in
  the printer view* so it is visible rather than assumed.
- **`channel9` / `channel12`** are true when the current line carries that punch and go false when
  any other punched line is reached — Figure 35's on/off rule — and are read by the channel's
  getters (§6.2).
- **Status** (io.md §7 Figure 89): Data Check → line not printed; Condition → the line *following*
  the error line is not printed; WLR → line not printed; No Transfer → never. Table rows in
  `oracle/io-status.json`; only WLR is reachable from a deck.

### 7.4 `Console1415` — the read path replaces the stub

The write path is untouched. `read()` becomes real, and it is small because the channel already
implements most of Figure 45.

New state: `pendingRequest: boolean` (the inquiry latch) and `entry: InquiryEntry | undefined`.

- `requestInquiry()` sets the latch — the INQUIRY REQUEST key lever
  (`console-and-physical.md` §2). `J (I) Q` reads it through the channel (§6.2).
  **One latch, and the research contradicts itself about that.** io.md §8 "Inquiry sequence"
  steps 1-2 say the key "sets the inquiry status latch in the 1411" and "the program tests it with
  `J iiiii Q` (BNQ)"; io.md §8 "Console status" then glosses the latches that survive Computer
  Reset as "the *remote* inquiry latches (the per-channel inquiry-request latches tested by
  `J iiiii Q`)" — i.e. BNQ tests something the console key does not set. Both cannot hold on a
  machine with one console and no remote stations. We take step 2's reading (one latch), because
  it is the only one that gives a demonstrable inquiry path, and name it:
  `CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH`, §15, cited at `Console1415.pendingRequest`, at
  `Channel.inquiryRequest` and at the `machine.programReset` line below.
- `supply(entry)` is RELEASE or CANCEL: the typed line, its per-position word marks, and how it
  ended. `INQUIRY_ENTRY_IS_PRE_SUPPLIED`, §15 — this keeps `step()` synchronous and promise-free.
- `precheck` reports **Condition** when the queued entry ended in CANCEL with characters typed
  (io.md §8 step 6, Figure 45).
- `read(x3, d)` with no entry, or CANCEL before any character, returns `null` → No Transfer, which is
  the Phase-1 stub's documented behaviour and stays correct for the right reason. Otherwise it prints
  the `I` line — `formatPrintout('I', …)`, single spacing, matrix 30, the row `printout.ts` already
  formats — and returns cells `parity(bcd,wm) | (wm ? WM : 0) | bcd`. **The word-mark gating is the
  channel's and it already does it** ("load-mode read only", io.md §8 step 4 = Figure 44's RCP/RCPW
  pair).
- **PROGRAM RESET drops a pending console inquiry request.** io.md §8 reads A22-0526-3 p.49's "the
  inquiry latches (except the console inquiry latch) … are not reset" as carving the console latch
  **out of** the not-reset set, and `machine.ts`'s own `programReset` comment already lists "the
  console inquiry latch" among what p.52 resets. One line in `machine.programReset()`, which
  `computerReset()` calls — and it carries `CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH`, because under
  the *other* reading of io.md §8 the latch BNQ tests would survive this reset.

### 7.5 What the console log shows — nothing new

The demo's Selectric transcript is entirely Phase-1 machinery: `D` address + `D` contents from the
DISPLAY, `A` from the ALTER, `S` from each mode change, `E` from any error stop, `I` from an inquiry,
`R` from any program `WCP`. **Phase 2 adds no console line formats.** The 1415 log is a Phase-1
deliverable; Phase 2 only gives it more to say.

---

## 8. The loader path

Three layers, smallest first. The phase's exit criterion needs only the first two.

### 8.1 The hand-keyed bootstrap — no new machine API

Twelve characters into 00000-00011, word marks on the `L` at 00001 and the `R` at 00011
(`software.md` §10.2, C28-0351-5 p.8 Table II): a status character at 00000, a 10-character
`L %10 00012 $` at 00001, and a 1-character `R` at 00011 whose I-address (00012-00016) and
d-character (00017) arrive on the card it is about to read.

**This works today through Phase 1's console controls, unchanged.** `machine.display(0)` on
untouched core finds no word mark to stop it and captures the whole 80-position line
(`software.md` §10.8 says so in as many words; ALTER must follow a DISPLAY, and `machine.alter`
throws if it does not), then:

```ts
machine.display(0);
machine.alter(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks);   // returns 12
```

writes `A L % 1 0 0 0 0 1 2 $ R` with marks at 00001 and 00011 and nowhere else.
`computerReset()` puts IAR at 00001; START executes the word-marked `L`.

**Two paths, and they must not be confused — this is the one place the plan is easy to get wrong.**
`machine.alter(text, wordMarks)` (`src/core/machine.ts`) is the **core** façade: it calls
`bcdOfGlyph` on every character and throws `"^" is not one of the 64 console characters` on the
first caret. The `^` WORD MARK convention is **UI-only** — `WORD_MARK_KEY` and `keyed()` in
`src/ui/internals/controls.ts` split the typed line into glyphs plus a boolean-per-position array
*before* calling `alter`. So: the headless paths (`tools/run-deck.ts`, `test/tier4-demo-deck.test.ts`)
pass the pre-split pair and never see a `^`; the browser path types `A^L%1000012$^R` into the ALTER
box and `controls.ts`'s existing parser splits it. `alter()` refuses any glyph outside the 64 either
way, so a typo is caught at the keyboard — which is what a 1415 does.

`src/formats/loader.ts` exports both forms as data, from one source of truth — and it is
`src/formats`, not `src/ui`, precisely so `tools/run-deck.ts` can reach it: `tsconfig.tools.json`
compiles `src/core/**`, `src/formats/**`, `tools/**` and `oracle/**` only, and reaching `keyed()` in
`controls.ts` would drag a DOM module into the node tools build.

```ts
export const BOOTSTRAP_CHANNEL_1 = 'AL%1000012$R';   // software.md §10.2, C28-0351-5 Table II
export const BOOTSTRAP_WORD_MARK_POSITIONS = [1, 11] as const;   // the `L` and the `R`
export const BOOTSTRAP_ORIGIN = 0;

/** The pre-split pair `machine.alter` actually takes. Derived, so there is one truth. */
export const BOOTSTRAP_KEYSTROKES: { readonly text: string; readonly wordMarks: readonly boolean[] };
```

`deckBox.ts`'s "key the bootstrap" button renders the `^` form from `BOOTSTRAP_KEYSTROKES` in three
lines and drops it in the ALTER box; it does not carry a second copy of the string.

**The `$` is load-bearing and it is the C17 ruling paying for itself.** On a cleared machine there is
no GM-WM to stop an `R` read, so an `R` would run all 80 columns and then fail its correct-length
check; worse, a load-mode read that *creates* a GM-WM mid-record would truncate the boot record
(io.md §3, `[likely]`). `$` suppresses the test. `channel.decodeD` already carries the ruling and
both citations, and it stays "the one place that moves if the ruling is overturned".

### 8.2 The single-card self-loading bootstrap — this is the demo

`software.md` §10.5 transcribes IBM's own Bootstrap 1 card at 400 dpi. It is a **disk** boot
(`L xF0 00066 R`) and this configuration has no disk, so we write our own in exactly that shape,
reading from the 1402. That shape is the point: the keyed `R` at 00011 finds its own I-address and
d-character in the card it just read, `R (I) ⧧` tests all six indicators and clears the interlock
without requiring a branch (io.md §5), and because the branch target *is* the fall-through address,
control reaches the next instruction either way. It is not a trick we invented; it is the one IBM
printed. `loader.ts` holds it as a table of `{ column, punch, comment }` rows, not an opaque string.

The demo card is written out column by column in §13. **The exit criterion needs nothing beyond it:
one card of ~70 payload columns is a program.**

### 8.3 The condensed-card loader — ours, and labelled ours

For multi-card programs, which is what Phase 3's assembler produces. `software.md` §9 is explicit
that no loader's card images survive and that the implementer fallback is "write your own 5-card
loader implementing C28-0309-1 Figure 2 exactly, put its re-entry point at 00281". Its contract:

- lives at or below **00499** (the standalone deck's Clear Storage card clears above 00499);
- re-entry point **00281** — the address user code branches back to when it wants the load to
  continue (C28-0309-1 pp.19-20, "The IBM standard re-entry point is 00281"), and the one address
  the published PAT substitution cards touch: each stores **one word-marked character** into 00281,
  toggling it between `N` (NOP) and `,` (Set Word Mark), so 00281 is a **live one-character
  instruction slot inside the loader**, not a byte to route around (`software.md` §9, J28-0249 p.27
  `[verified]`). Our loader is positioned so that byte is the first instruction of its re-entry
  sequence, and the slot is exposed rather than hidden. What that instruction *did* in IBM's loader
  is inferable, not documented — labelled a reconstruction in `PHASE-2-NOTES.md`;
- **one load-mode read per card** into a fixed work area — `L %10 WORK $`. Because load mode consumes
  the two header separators (cols 1 and 7), the payload lands at a **fixed offset**: cols 2-6 at
  `WORK+0..4`, cols 8-10 at `WORK+5..7`, the count at `WORK+8..9`, and the **payload at `WORK+10`
  with its word marks already set and its length exactly the count**. That is the whole reason the
  count sits in columns 11-12. Reading the card once, into a work area, is also what keeps the loader
  clear of io.md §6 Figure 62's No-Transfer trap (two x3=9 reads with no intervening SSF) and of
  writing the 10-character header into the ten core positions below every load address;
- plant a group-mark-with-word-mark at `WORK+10+count` (a 5-digit add of the 2-digit count to a
  constant base), patch the move instruction's B-address from `WORK+0..4`, then move the payload with
  one instruction: **`D WORK+10 (target) Δ`**. `Δ` is octal 57: `d & 0x38 = 0x28` is
  `MOVE_DIRECTION`'s left-to-right / terminate-on-the-A-field-GM-WM row and `d & 0x07 = 7` is
  `MOVE_PORTION`'s zone + numeric + **word mark** (`dmods.ts` §3.1). `cc01.cor` itself uses
  `D 08967 00333 Δ` to relocate marked code (`docs/BUILD-LOG.md`, "cc01 halt archaeology";
  `test/tier4-cc01-progress.test.ts`) — `[observed]` corroboration that the idiom is period-real;
- the **execute card** ends the deck: column 1 = `E`, the instruction from column 2, the loader
  detects the `E` and transfers control to it (`emulators.md` §7 `[verified]`, e.g. `E ~J02000b~`).
  We adopt that shape rather than `software.md` §8.2's Termination card, because §8.2 is the **OS
  relocatable** deck and we are building the **standalone absolute** one (`architecture.md` §5 step
  2). Labelled a reconstruction in `PHASE-2-NOTES.md`.

The loader is a real 1410 program of roughly fifteen instructions, specified here by contract and
idiom. The wave that builds it develops it against `test/loader.test.ts`, which asserts **core
contents cell for cell, word marks included, after loading a three-record deck**. Its Autocoder
source goes in a comment block above the byte table so Phase 3 can regenerate it.

---

## 9. The deck text a person types

One line per card. Column tokens: a machine glyph, `{12-7-8}`, or `{}` (§5). Example — the first
thirty-three columns of the demo's card 1, and the two forms a person can choose between:

```
00018{12-7-8}{0-5-8}L%1000100${0-5-8}R000668{0-5-8}R00042{12-7-8}…
00018⧧⌒L%1000100$⌒R000668⌒R00042⧧…
```

Both parse to the same 80 codes. The glyphs `⧧` and `⌒` are in the 64-character set so they are
legal input, but they are not on a keyboard — the punch list is what a person actually types, and
`formatDeck` emits whichever form the code's glyph makes typeable.

Parse rules, all tested: short lines blank-pad to 80; a longer line is a `DeckError` naming line and
column; a whitespace-only line is skipped; an unclosed `{`, an unknown row name, or a glyph outside
the 64 is a `DeckError` and that column parses as blank so the rest of the deck still renders. The
round-trip property is stated on the **card**, not the text: `parseDeck(formatDeck(d)).deck` equals
`d`, cardwise and columnwise.

---

## 10. The UI

**`src/ui/unitrecord/`, mounted as its own section on the internals page, plain.** The prompt's
requirement — the unit-record views are *separate from the internals panel* — and
`architecture.md` §6-7's gate (the machine room is Phase 4) are both honoured this way: the Phase-2
views render period-shaped **artifacts** (a card with rectangular holes, green-bar paper, the
Selectric log) with **no cabinet, no rotary art, no colour, no photography**. Phase 4 moves the
directory into `src/ui/period/` and styles it; nothing here is thrown away.

- **`mount.ts`** — `mountUnitRecord(machine: Machine, host: HTMLElement, redraw: () => void): void`.
  It takes the machine; it never constructs one. `src/ui/internals/main.ts` owns the page's only
  `Machine` and its only `#app` lookup, so mounting is one import and one call there (§3) — anything
  else puts two machines on the page and the browser demo cannot work at all.
- **`session.ts`** (DOM-free, unit-tested in node) holds the pasted `Deck`, the `Machine`, and the
  mapping from snapshot counts back to cards. `MachineState` carries hopper and stacker **counts**,
  so the frame loop never copies 80-byte arrays.
- **`deckBox.ts`** — a `<textarea>`, a parse-error list with line and column, **PUT DECK IN HOPPER**,
  and a **sample deck** button. The sample deck is `import sampleDeck from
  '../../../demos/hello-dad.cards?raw'` — not a `fetch`: `demos/` sits outside `public/`, so a fetch
  works under `npm run dev` and 404s in a `vite build` output. `?raw` needs no dependency and costs
  the three-line `raw-import.d.ts` beside it (§4), because this project carries no `vite/client`
  types. The column-token legend sits above the box.
- **`cardView.ts`** — one card face, inline SVG: 80 columns × 12 rows of rectangular holes, an
  interpretation band across the top 3/16 in printed with `glyphOf` (a printing punch types the
  typeball's characters, not the 1403's chain), `IBM` vertical at the left edge, column numbers under
  row 0 and row 9, left upper corner cut. Geometry from `console-and-physical.md` §10 — 7 3/8 × 3 1/4
  in, 0.087 in column pitch, 0.250 in row pitch, 0.055 × 0.125 in holes, all `[likely]` from
  secondary sources, which §13 of that file says to use. **One size.** No magnifier, no three
  renderings — that is the flourish that eats a wave.
- **`readerView.ts`** — the hopper with a count, the five stackers in the machine's own left-to-right
  order `0(NP) 4 8/2 1 0(NR)`, and the two keys the demo needs: **READER START** and **END OF FILE**.
  Both are keys the 1402 actually had (`console-and-physical.md` §7's key strip). There are **five**
  pockets, not six, and 8/2 is **shared** between the read feed and the punch feed
  (`console-and-physical.md` §7; io.md §6 Mechanics), so that cell renders
  `reader.stackers['8-2'] + punch.stackers['8-2']` — the two device counts are the machine's one
  pocket seen from two feeds, and the view is where they are added (§5). That is the end state.
  Wave 2 has only the `reader` block, so it draws the same five-pocket strip with the reader's three
  counts live — `0 (NR)`, `1`, and the shared cell as `reader.stackers['8-2']` alone — and the two
  punch-only pockets, `0 (NP)` and `4`, as a literal `0`. Showing them at zero is the simpler of the
  two choices: the strip never changes shape. Wave 4 gives those two their `punch.stackers` reads
  and adds the punch term to the shared cell — three lines (§5, §11).
- **`printerView.ts`** — a `<pre>`, 132 monospace columns at 10 cpi / 6 lpi, green-bar stock
  14 7/8 × 11 with 1/2 in bars = **three lines per bar** (`console-and-physical.md` §8, `[likely]`),
  a plain-white toggle per §13's fallback, a page rule where the carriage skipped to channel 1, the
  carriage position marked on the current line, and the carriage tape's punches shown in the margin
  so `DEFAULT_CARRIAGE_TAPE` is visible rather than assumed.
- **`inquiryView.ts`** — **INQUIRY REQUEST**, a text input using `controls.ts`'s existing `^`
  word-mark prefix verbatim (one convention for a period reader to learn, not two), **RELEASE**, **INQ CANCEL**.
  The typed message and the machine's reply both land in the existing console log, because both are
  `ConsoleLine`s.
- **`controls.ts` is not edited.** LOAD keeps its `.cor` input; the deck box sits beside it. A
  "key the bootstrap" convenience button lives in `deckBox.ts` and only fills the existing ALTER box
  with `A^L%1000012$^R`, rendered from `BOOTSTRAP_KEYSTROKES` so there is no second copy of the
  string (§8.1). That `^` text goes to `controls.ts`'s own `keyed()` parser, **never** to
  `machine.alter`, which knows only the 64 machine characters. It saves typing, not steps: the
  operator still presses DISPLAY, ALTER, COMPUTER RESET, START.

---

## 11. Waves, ownership, and the oracle that closes each

Per wave: file ownership → `npm run typecheck` + `npm test` + `npm run smoke` → `git diff
--name-only main` ∩ do-not-touch = ∅ → **the notes ritual** → Opus adversarial review → fix →
**one commit** `[Scope]: description` with the footer `(anthropic claude-code <model> / host-a)` →
push `feature/phase-2`. Never main.

**The notes ritual is per wave, not a wave.** Every wave appends its own rows to `PHASE-2-NOTES.md`
§1-§4, its own dated section to `docs/BUILD-LOG-2.md`, and its own `// OPEN:` rows to the dated
Phase-2 section of `docs/research/open-questions.md`, **in the same commit as the code that
introduced them**. Those three files therefore belong to no single wave — which is what makes
R1's "wave 5 is descopeable" true: §15's constants land in waves 2, 3 and 4, so parking them in
wave 5 would have made exit criterion 7 fail the moment wave 5 was dropped.

| # | Wave | Files it owns | The oracle that closes it |
|---|---|---|---|
| **1** | **The card format** — parse and render only, **no machine** | `types.ts` §6 (`Card`, `Deck` — replaces the comment block), `formats/card.ts`, `ui/unitrecord/{session,cardView,deckBox,raw-import.d.ts}`, `mount.ts` (+`cardView`, +`deckBox`), `src/ui/internals/main.ts` (two lines), `demos/hello-dad.cards`, `index.html`, `test/card.test.ts`, `test/deck-text.test.ts` | **Tier 0.** The punch bijection proved **twice**: `bcd.ts`'s `hollerith`-derived mask against `charset.md` §3's structural rule recomputed inside the test, for all 64 codes; plus all-64-masks-distinct and `bcdOfPunches(punchMask(c)) === c`. The named `2-8` ↔ A-bit case, round-tripping **both** ways (`charset.md` §2.1 — the 1401 rule is not imported). The blank trap: octal 00 and octal 20 are two different codes. Then `parseDeck(formatDeck(d)) === d` over a deck containing every code, and the error cases. **Visible:** paste text into the deck box — or press **sample deck** — and see six card faces with their holes and interpretation bands. **Nothing here touches the machine:** `MachineState.reader/printer/punch` do not exist yet — each block arrives with its own device, reader in wave 2, printer in wave 3, punch in wave 4 (§5) — so `session.ts` holds the `Deck` and nothing else, and **PUT DECK IN HOPPER arrives in wave 2** with `machine.loadDeck()` and `Reader1402`. `demos/hello-dad.cards` is checked in here, typed from §13's column table, so the sample button has a deck; wave 3 is what makes it *run*. |
| **2** | **1402 reader, `Channel.control`, `K`** — `selectStacker1` stops throwing; **`carriage1` still does** | `devices/reader1402.ts`, `channel.ts` (+`control`), `types.ts` §5 (`Channel.control` — that member ONLY) and §8 (the `reader` block ONLY; `printer` is wave 3 and `punch` is wave 4, §5), `isa/exec/io.ts` (`selectStacker1` only), `machine.ts`, `ui/unitrecord/{readerView,session,deckBox}.ts` (the count→card mapping and PUT DECK IN HOPPER), `mount.ts` (+`readerView`), `oracle/io-status.json`, `test/reader1402.test.ts`, `test/channel-control.test.ts`, `test/isa-table.test.ts` (`BUILT_SO_FAR` gains `'K'`), `test/exec-io.test.ts` (`K`), `test/channel.test.ts` | **Tier 1, twice, and one of them is a published external oracle.** (a) io.md §3's Figure 5 vector through the **real** 1402: card `WS A WS B WS WS C` gives move-mode core `WS A WS B WS WS C` (7 positions) and load-mode core `A(wm) B(wm) WS C` (4 positions), `BAR = B + LB + 1` in both. (b) **`software.md` §10.5's Bootstrap 1 card, parsed from IBM's own published column transcription and read into 00012 by a `$` load-mode read, must land every character at the address IBM printed** — `00018` at 00012-00016, the group mark at 00017, the ten-character read at 00018-00027, on through the last row the transcription closes: **columns 1-53 → 00012-00058**, which is 47 stored characters plus the six word separators at columns 7, 18, 26, 37, 45 and 53. **The assertion stops at 00058, and the test comment says why.** Carrying it further does not close: columns 54-59 are six columns, so the eight rows of columns 1-59 hold 53 stored characters and end at **00064**, one short of the 00059-**00065** §10.5 itself prints for that row — and one short of putting the disk control field's first character at **00066**, the B-address both reads carry. The card is right and the transcription is one column short: `J 00138` is an unconditional branch, `table.ts`'s `J` row carries `lengths: [1, 7]` and the semantics line "the blank d-character position must be present", so the instruction occupies **columns 54-60 → 00059-00065**, the separator is at column 61, and the control field starts at column 62 → **00066**. §13's demo card is punched in exactly that shape at exactly those columns (`J00018␣`, 54-60 → 00059-00065). So the oracle asserts 00012-00058 mechanically from the transcription as printed, and asserts the `J` at 00059-00065 and the control field at 00066 **only against the reconstructed seven-column form**, with `BOOTSTRAP_1_J_ROW_IS_SHORT_ONE_COLUMN` (§15) named in the test and recorded in the dated Phase-2 section of `open-questions.md` in the same commit. **Columns 62-80 are otherwise left unasserted:** §10.5 enumerates cols 1-59 and 77-80 only, printing 60- as an open range (`WS amtttth2 WS group mark`, "00066-"), so there is no published address past the control field's first character to check against. One test exercising the deck parser, the punch bijection, `decodeD('$')`, the separator→word-mark rule and the address arithmetic at once; we never execute it (it is a disk boot). **Tier 0:** `oracle/io-status.json` against Figures 62/63, **including the two "never for select-stacker" rows**. Plus `K 0` leaving **BAR = Bp** with word marks untouched; two `K`s with no intervening `R` → `IoInterlockStop`; two x3=9 reads with no intervening SSF → No Transfer; EOF → Condition and the next read is a NO OP; ≤3 cards without EOF → Not Ready; and **EOF latch on → `K 0` reports no Condition and does not clear it → the following read still reports Condition and NO-OPs** (§6.1). |
| **3** | **1403, carriage, `F`, AND THE DEMO** — `carriage1` stops throwing | `devices/printer1403.ts`, `oracle/chain48.json`, `types.ts` §7 (`PrintLine`, `CarriageState`, beside `PrintEvent`) and §8 (the `printer` block), `isa/exec/io.ts` (`carriage1`), `machine.ts` snapshot, `formats/loader.ts` (**the bootstrap constants only** — wave 5 extends the same file with the condensed loader), `ui/unitrecord/{printerView,deckBox}.ts` (the key-the-bootstrap button), `mount.ts` (+`printerView`), `tools/run-deck.ts`, `package.json`, `test/printer1403.test.ts`, `test/isa-table.test.ts` (`BUILT_SO_FAR` gains `'F'`; `DEVICE_DEFERRED` → `['U']`), `test/exec-io.test.ts` (`F`), `test/tier4-demo-deck.test.ts`, `test/golden/hello-dad.page.txt` | **Tier 0 + tier 1 + a gating tier 4.** All 30 rows of the existing `CARRIAGE_D_TABLE` driven one d at a time, each asserting the `PrintEvent` and the resulting carriage position — including "a skip to the channel you are on moves to the next punch of that channel" **from the power-on home position in both directions** (`CARRIAGE_POWER_ON_AT_CHANNEL_1_HOME`, §15). The 48-graphic chain against `oracle/chain48.json` for all 64 codes, with the three special renderings and the twelve blanks named. Load-mode `%20`'s blank ahead of a marked character. The automatic single space, **both arms**: print then `F` (consumed and replaced) and print then `flush()` (performed), with `snapshot()` proved not to move the carriage. A 133-character record sets WLR and prints nothing. Then **`npm run demo -- --golden test/golden/hello-dad.page.txt` reproduces the golden byte for byte** and `test/tier4-demo-deck.test.ts` asserts the same page plus the stacker counts, the stop reason and IAR, and the channel-1 status at the two points where it means something (the EOF read, and the halt). **§13's exit criteria are met at the end of this wave.** |
| **4** | **Inquiry, punch, `%21`, the four `J` branches.** Splits if a spare worker exists: **4a** = `devices/punch1402.ts`, `devices/console1415.ts` and their tests, which touch no file another wave owns and can start once wave 1's `types.ts` §6 has landed; **4b** = everything else, **strictly after wave 3**, because the `J (I) 9` / `@` tests read `Printer1403.carriage` | `devices/console1415.ts`, `devices/punch1402.ts`, `channel.ts` (`outputCells` line + four getters), `types.ts` §5 (`Device.outputCells` + the four `Channel` getters) and §8 (the `punch` block), `isa/dmods.ts`, `isa/exec/branch.ts`, `machine.ts`, `ui/unitrecord/{inquiryView,readerView}.ts` (`readerView` only to give the two punch-only pockets their `punch.stackers` reads and add the punch term to the shared 8/2 cell, §5), `mount.ts` (+`inquiryView`), `test/console-inquiry.test.ts`, `test/punch1402.test.ts`, `test/console1415.test.ts`, `test/dmods.test.ts` (both assertions, §3), `test/exec-branch.test.ts` (the three `.toContain` lines **and** the rewritten BC9 test, §3) | **Tier 1.** io.md §8's six numbered inquiry steps as six named tests, and Figure 45 row for row: RELEASE at count → no WLR; early RELEASE → WLR; excess characters → WLR; CANCEL during → Condition; CANCEL before any character → No Transfer; no request → No Transfer. Figure 44's RCP/RCPW pair: the same typed message gives undisturbed marks under `M` and erased-and-entered marks under `L`. PROGRAM RESET drops the pending request. `J (I) Q` branches iff the latch is set; `J (I) 9` / `@` follow the carriage (this is what replaces `exec-branch.test.ts`'s `unimplementedOp` test); `J (I) R` always answers false. The **same marked field** through `M %21` and `L %21`: 1s and blanks under `M`, **nothing at all** under `L` (`charset.md` §7, verbatim). Punch: Figure 5's output side, then the identity loop core → punch → card → reader → core in both modes. |
| **5** | **Object deck and the loader** *(descopeable — see R1)* | `formats/objectdeck.ts`, `formats/loader.ts` (extended with the condensed loader), the loader deck, `test/objectdeck.test.ts`, `test/loader.test.ts` | **Tier 0 + tier 3.** `decodeObjectRecord(encodeObjectRecord(r)) === r` over generated records including word marks, doubled payload separators, count boundaries, and the three named rejections. Then the machine-level test: hopper = [bootstrap card, three condensed cards, execute card]; key the twelve characters; COMPUTER RESET; run; **core equals the records cell for cell including word marks**, and IAR reached the entry point. |

**Which wave declares which `types.ts` block, in one sentence:** `Card` / `Deck` into §6 in wave 1;
`Channel.control` into §5 and the `reader` block into §8 in wave 2; `PrintLine` / `CarriageState`
into §7 and the `printer` block into §8 in wave 3; `Device.outputCells` and the four sense getters
into §5 and the `punch` block into §8 in wave 4. No wave declares a `MachineState` member it cannot
populate, which is what keeps `npm run typecheck` green at every commit (§5, §12).

**The waves land in order, 1 → 5, and no two are ever in flight in the same file.** That is not
caution, it is the ownership rule: all four of waves 1-4 edit `src/core/types.ts` (§6; §5+§8; §7+§8;
§5+§8), all four edit `ui/unitrecord/mount.ts` (one added mount call each, §4) and
waves 2 and 4 both edit `channel.ts`, so starting any two of them together puts two Phase-2 writers
in the file whose rebase against Phase 1b the whole of §3 exists to keep mechanical. The one
sanctioned overlap is **wave 4a** — `devices/punch1402.ts` and `devices/console1415.ts` with their
tests — which touches nothing another wave owns and can be developed beside waves 2-3 once wave 1's
`types.ts` §6 has landed; it still *commits* after wave 3. Waves 2 and 3 are the critical path;
wave 5 needs everything before it.

---

## 12. Test tiers and gates

Phase 1's tier language, extended, not replaced (`phase-1-cpu-core.md` §7).

- **Tier 0 — table fidelity.** Two new fixtures and no more: `oracle/io-status.json` (Figures 62, 63,
  89, 91, 45, 46 as one file — device × condition × when-set, every row carrying its page, so every
  status rule in the phase can be diffed against io.md §§6-8 by eye) and `oracle/chain48.json`
  (`charset.md` §5). **`CARRIAGE_D_TABLE` gets no fixture**: `dmods.ts` already carries all 30 rows
  with their Figure 90 cite, so the test asserts the *printer's interpretation* against that table —
  a second transcription would be a second thing to drift. `oracle/collate.json`'s existing
  `hollerith` column is what wave 1's derivation is checked against, alongside the structural rule.
- **Tier 1 — manual worked examples**, each a named test citing a page: the list in §11's wave table.
- **Tier 2 — `ilentest.cor` decode-only.** Untouched. Phase 2 adds nothing and must break nothing.
- **Tier 3 — `insttest.cor` and the machine-level tests.** The Phase-1 blocks are untouched; Phase 2
  adds the loader test (core cell for cell after a three-record deck).
- **Tier 4 — smoke and the demo.** `npm run smoke` still runs cc01 and must still PASS with the
  established baseline **unchanged**: 1241 instructions, `CC01A` then `CC01 COMPLETE`, instruction
  check at 00322 (`PHASE-1-NOTES.md` §4, `oracle/cc01a-halts.ts`). New sibling
  `test/tier4-demo-deck.test.ts`, and **unlike cc01 this one GATES** — we wrote the deck and we know
  what it prints.
- **Always green:** `test/core-is-dom-free.test.ts`. The three new device files live in `src/core`
  and import nothing outside it; `session.ts` is `src/ui`, so its node test proves the session logic
  without a DOM by construction.

**The gate at every commit, not just at the end:** `npm run typecheck` clean, `npm test` green
(tiers 0-3), `npm run smoke` PASS with cc01's output unchanged.

---

## 13. Exit criteria — the demo, mechanically checkable

### Card 1 of `demos/hello-dad.cards`

`⌒` = word separator (0-5-8), `⧧` = group mark (12-7-8). Read by the keyed `L %10 00012 $`, load
mode, so the ten separators are consumed and 70 characters are stored at 00012-00081.

| Cols | Punched | Lands at | Why |
|---|---|---|---|
| 1-5 | `00018` | 00012-00016 | I-address of the keyed `R` at 00011 |
| 6 | `⧧` | 00017 | its d-character: tests all six, clears the interlock, branch target = fall-through |
| 7 | `⌒` | — | word mark on the next character |
| 8-17 | `L%1000100$` | 00018-00027 | **LOOP:** read a data card into 00100, load mode, pocket NR, `$` |
| 18 | `⌒` | — | |
| 19-25 | `R000668` | 00028-00034 | d = `8` = Condition → EOF → the end routine at 00066 |
| 26 | `⌒` | — | |
| 27-33 | `R00042⧧` | 00035-00041 | release, fall through to 00042 |
| 34 | `⌒` | — | |
| 35-44 | `M%2000100W` | 00042-00051 | print the card just read |
| 45 | `⌒` | — | |
| 46-52 | `R00059⧧` | 00052-00058 | release, fall through to 00059 |
| 53 | `⌒` | — | |
| 54-60 | `J00018␣` | 00059-00065 | unconditional branch back to LOOP (the blank d must be present) |
| 61 | `⌒` | — | |
| 62-63 | `F1` | 00066-00067 | **END:** skip the carriage to channel 1 — eject the finished page |
| 64 | `⌒` | — | |
| 65-71 | `R00075⧧` | 00068-00074 | release the `F`'s interlock, fall through to 00075 |
| 72 | `⌒` | — | |
| 73 | `.` | 00075 | halt |
| 74 | `⌒` | — | **required**: it word-marks 00076 so read-out of the 1-character `.` terminates |
| 75-80 | `HELLO1` | 00076-00081 | deck identification, stored and harmless |

Ten separators, seventy stored positions, 00012 + 70 − 1 = 00081. Every instruction length is legal;
every branch target except the EOF one is its own fall-through address, so control reaches 00035,
00059, 00075 whether or not the status branch is taken; and each separator marks exactly the op code
of the instruction it precedes, which is the rule `software.md` §10.2 quotes from A22-0526-3 p.11.

**The skip to channel 1 is at the END of the program, not the start, and that is a `[verified]`
carriage rule paying its way.** The carriage powers on at home — the Carriage Restore key "positions
the carriage at channel 1 (home)" — and **"a skip to a channel the brushes are already positioned on
moves to the next punch of that channel"** (io.md §7, A22-0526-3 pp.68, 71-72). `DEFAULT_CARRIAGE_TAPE`
punches channel 1 exactly once, at line 1, so an `F1` issued *first* would find no further channel-1
punch on this form and eject to line 1 of the **next** form: the five report lines would land on
page 2 behind a blank page. Issued *after* the loop it prints the report on page 1, lines 1-5, and
then ejects the finished page for the operator to tear off — which is what the machine is for. It
also consumes the automatic single space the last print armed
(`AUTO_SPACE_IS_CANCELLED_BY_A_CARRIAGE_INSTRUCTION`, §15), so the golden page has no trailing blank
line to argue about. The power-on position is pinned as `CARRIAGE_POWER_ON_AT_CHANNEL_1_HOME` (§15)
and wave 3 tests it in both directions.

**Data cards** carry 78 columns of report text, then `⌒` in column 79 and `⧧` in column 80 — so each
card **plants its own group-mark-with-word-mark at 00178** as it is read, which is what terminates
the print. That is not a hack: it is the documented consequence of load mode assembling a GM-WM from
a separator followed by a group mark (io.md §3, `[likely]`), and it removes the only setup
instruction the program would otherwise need. **The reads use `$`, not `R`**, so the GM-WM the
previous card left at 00178 does not terminate the next read and no wrong-length-record is ever set
(io.md §3 steps 2 and 5 are gated on d = `R`). The print `M %20 00100 W` then gathers 00100-00177 and
stops at the GM-WM, printing 78 columns.

The five data cards print a reconstructed report, labelled in the UI as a reconstruction: no IBM 1410
is documented at any Avco site (`avco-and-reentry.md` §1-2) and the demo says so.

### The mechanical checks

1. `npm run typecheck` clean; `npm test` green (tiers 0-3); `npm run smoke` PASS with cc01's
   baseline **unchanged** — 1241 instructions, both messages, instruction check at 00322.
2. `parseDeck(readFileSync('demos/hello-dad.cards'))` returns **6 cards and zero errors**.
3. `npm run demo` (the deck path defaults to `demos/hello-dad.cards`) exits 0 and prints two
   artefacts: the Selectric transcript (the `D` address and contents lines, the `A` line, the
   mode-change `S` lines) and the green-bar page. `npm run demo -- --golden
   test/golden/hello-dad.page.txt` compares and exits **non-zero on any byte of mismatch**;
   `npm run demo -- --golden test/golden/hello-dad.page.txt --update` rewrites it, which is the
   only sanctioned way the golden is regenerated (R8). The `--` is required: npm swallows flags
   without it.
4. `test/tier4-demo-deck.test.ts`, headless, driving the same **core** façade calls the browser's
   controls make — the pre-split keystrokes, never the UI's `^` string (§8.1):
   - `machine.display(0)` then `machine.alter(BOOTSTRAP_KEYSTROKES.text,
     BOOTSTRAP_KEYSTROKES.wordMarks)` returns **12** and leaves word marks at 00001 and 00011 and
     nowhere else in 00000-00011;
   - after the run: 00012-00016 hold `00018`, 00017 holds a group mark, 00018 carries a word mark;
   - `snapshot().printer.paper` has **5 lines, all on page 1**, lines 1-5, and the first line's text
     equals the first data card's 78 columns rendered through the A chain;
   - the carriage ends at page 2 line 1 with no pending auto-space — the closing `F1` ejected the
     page and consumed the space (§7.3);
   - `renderGreenBar(snapshot().printer.paper, { chain: 'A', formLines: 66 })` equals the golden
     **byte for byte**, header line included;
   - `snapshot().channel1` shows **all six status indicators clear** and `interlock: false` — the
     closing `F1` reset them at step 3 of the nine and set none, and its `R (I) ⧧` released the
     interlock. The EOF `condition` is asserted where it actually exists: on the read that reports
     it, one step before the `R 00066 8` branches;
   - `snapshot().reader` shows hopper 0, stacker NR 6;
   - `snapshot().console` contains **no `E` line**; `snapshot().stop === 'halt'` and
     `snapshot().iar === 76` — `MachineState` carries no stop *address*, and after the one-character
     `.` at 00075 the IAR is already at the next sequential instruction.
5. `npm run dev`, open `/` (there is one HTML file, `index.html`, and it loads
   `/src/ui/internals/main.ts`): the Phase-1 demo is **not regressed** — LOAD `cc01.cor`,
   MODE = RUN, START, both messages type, and the register grid, core window and console log render
   as before.
6. `git diff --name-only main` intersects the do-not-touch table in **zero** files.
7. `PHASE-2-NOTES.md` exists and lists every `[unverified]`/`[likely]` item actually hit with its
   named constant; `open-questions.md` carries a dated Phase 2 section.

### What the owner and a family member see

In `npm run dev`: paste six lines into the deck box, press **PUT DECK IN HOPPER** — six card faces
appear, holes and all, the first one visibly a program in its interpretation band. Press **READER
START**, then **END OF FILE**, because with fewer than four cards behind the last one the machine
would otherwise stop Not Ready — IBM's own procedure. On the console: MODE = DISPLAY, key 00000,
START; MODE = ALTER, type `A^L%1000012$^R`, START; **COMPUTER RESET**; MODE = RUN; **START**. The
hopper empties one card at a time, the stacker fills, and five report lines walk onto green-bar. A period
reader reads the report off the paper. Nobody typed a number into a text box.

---

## 14. Risks

| # | Risk | Mitigation |
|---|---|---|
| **R1** | **The condensed loader is a real 1410 program** with self-modifying address setup and no assembler — the one place in the phase where a bug is a bug in machine code with no symbolic listing. | It is wave 5 and the demo does not use it. If it slips, the phase still exits on wave 3 and the loader moves to Phase 3 beside the assembler that feeds it — with `objectdeck.ts` and its round-trip test already shipped, which is the part Phase 3 cannot proceed without. Descoping is only safe because `PHASE-2-NOTES.md`, `docs/BUILD-LOG-2.md` and the `open-questions.md` section are written **per wave** (§11), not owned by wave 5 — otherwise dropping wave 5 would fail exit criterion 7. Decide at the wave-5 review, not at the end. |
| **R2** | **Rebase collision with Phase 1b.** | `isa/table.ts` needs zero edits; `test/isa-table.test.ts` needs two lines; `types.ts` edits are confined to §5/§6/§7/§8, one small hunk per wave, with nothing appended at the end of the file — and 1b's only edit to that file is a `terms` field inside `ExecContext`, which is §4 at ~:196 (§3). Rebase at the **start** of the first wave after 1b merges, never at the end. If a conflict is not mechanical, the Phase-2 edit loses and is re-applied by hand — the edits are small enough for that to be cheap. |
| **R3** | **`Device.outputCells` judged speculative** — one optional member with one implementer. | Drop `M %21` from scope; `Printer1403.precheck` returns Not Ready for x3 = `1` carrying A22-0526-3 p.80; delete the member. Costs one `[verified]` instruction and the "no printing results" test, nothing else. |
| **R4** | **The four `J` flips touch two Phase-1 test files** that assert those rows are unavailable. | Both are named in §3 with their line numbers and neither is on 1b's path. The flips are data; the executor change is one lookup. |
| **R5** | **EOF and Not Ready are fiddly and interact** — the three-card rule, latch-off-as-Condition-on, next-read-is-a-NO-OP. | Every row of Figure 62 is a separately named test written **before** the reader, in wave 2, and the EOF path goes through `precheck` so "NO OP" is step 6 rather than special-case code. |
| **R6** | **Scope creep into Phase 4's period art.** Green-bar and card faces are exactly what tempts styling. | `controls.ts` is not edited. No cabinet, no rotary art, no colour, no fonts beyond a monospace stack, one card size. Any `src/ui/period/` file in a diff fails the wave gate. |
| **R7** | **`snapshot()` grows heavy** once paper and cards are in it. | Counts, not cards; the paper is sliced the way the console log already is; views rebuild only when a length changes, the pattern `panel.ts` already uses. `MachineState` stays structured-cloneable. |
| **R8** | **Golden files rot into an unreviewable blob.** | **One golden in the whole phase** — `test/golden/hello-dad.page.txt`, ≤20 lines, produced by the deck in §13 with that program written out column by column, and regenerated by exactly one command: `npm run demo -- --golden test/golden/hello-dad.page.txt --update`. `renderGreenBar`'s five-rule contract is in §5, because a byte-for-byte gate against an unspecified renderer is not a gate. A golden nobody can regenerate is worse than no golden — and there is no second golden to rot: the punch is proved by an in-memory core → punch → card → reader → core identity in wave 4, which needs no checked-in file. |
| **R9** | **The demo's column arithmetic is easy to get wrong by one.** | Card 1's table is in §13 and the resulting core image is asserted address by address in the wave-3 test; the arithmetic is derived once, in `loader.ts`, from that table. |

---

## 15. `[unverified]` / `[likely]` items, the OPEN constant, and the fallback

Every row gets an `// OPEN:` comment naming its research row, a named constant, a row in the dated
**"Phase 2"** section of `docs/research/open-questions.md`, and a row in `PHASE-2-NOTES.md` §1 if it
was actually hit.

| Constant | Where | Tag | Fallback taken, and the alternative |
|---|---|---|---|
| `CARD_DOLLAR_SUPPRESSES_GM_WM_TEST = true` (already decoded in `channel.decodeD`) | `channel.ts` / `reader1402.ts` | `[verified]` legality (C28-0351-5 p.8 Table II), `[likely]` effect (`open-questions.md` #13 rider) | Suppress the GM-WM test, supply all 80 buffer columns, set **no** status indicator and no WLR. Already what `decodeD`/`read` do; the 1402 adds nothing. If overturned, `decodeD` is still the one place that moves — the demo would bootstrap with `R` and a pre-planted GM-WM, and the keyed string changes. |
| `BOOTSTRAP_1_J_ROW_IS_SHORT_ONE_COLUMN = true` | `test/reader1402.test.ts` (the wave-2 external oracle) | `[likely]` — a research **transcription** gap, not a hardware claim: `software.md` §10.5's row `54-59 \| J 00138 \| 00059-00065` maps six columns onto seven core positions | Read the row as seven columns, 54-60, the seventh being the blank d-character position `table.ts`'s `J` row requires (`lengths: [1, 7]`, "the blank d-character position must be present"). Only that reading closes the card: it puts the separator at 61 and the disk control field's first character at 00066, the B-address both `L` instructions carry, and it is the shape §13's demo card is punched in. The oracle asserts 00012-00058 from the transcription as printed and the rest against this reconstruction. Alternative: assert nothing past 00058 — available at any time, costs the 00066 check. Recorded in the dated Phase-2 section of `open-questions.md`; a re-render of C28-0351-5 p.8 settles it. |
| `EOF_KEY_REQUIRED_AT_THREE_CARDS = true` | `reader1402.ts` | `[verified]` behaviour, `[likely]` boundary — io.md §6 says "3 cards remaining" without saying whether the buffered card counts | Count buffer + hopper. Alternative: hopper alone; observable only on a 3- or 4-card deck, and the wave-2 test pins the choice. |
| `READER_TRANSPORT_MODELS_ONE_CARD = true` | `reader1402.ts` | simplification, not a hardware claim | READER START physically feeds three cards; we model the 80-position buffer, which is all the CPU can observe, and enforce the three-cards-remaining Not Ready rule directly. |
| `UNKNOWN_X3_IS_NOT_READY = true` | all three devices | `[unverified]` — io.md §2/§5 state no x3 validity check | Not Ready, following io.md §9 Figure 99's "no such unit". Alternative: `InstructionCheck`, the rule `channel.ts` takes for an unknown x1/x2 glyph — rejected because a *selectable* device with an unselectable sub-unit is a readiness question, not a decode question. |
| `CARRIAGE_DEVICE_X2 = '2'`, `STACKER_DEVICE_X2 = '1'` | `channel.ts` | `[likely]` — no figure prints an x2 for an op that has no x-field | `F` routes to the 1403, `K` to the 1402 reader, from io.md §2's instruction summary and §§6-7's device chapters. Alternative: none plausible; the tag records that the mapping is physical rather than stated. |
| `OVERLONG_RECORD_SETS_WLR = true` | `printer1403.ts`, `punch1402.ts` | `[likely]` — Figures 89 and 63 list WLR with "line/card not printed" but never state its cause on output | > 132 (or > 80) sets WLR and prints/punches nothing. Alternative: truncate at the buffer and print. |
| `BUFFER_CLEARED_BEFORE_TRANSFER = true` | `printer1403.ts`, `punch1402.ts` | `[unverified]` — no source says what the buffer holds past a short record | Blanks. The alternative — stale buffer contents printing — is unattested, makes output nondeterministic, and no program could rely on it. |
| `AUTO_SPACE_IS_DEFERRED = true`, `AUTO_SPACE_IS_CANCELLED_BY_A_CARRIAGE_INSTRUCTION = true` | `printer1403.ts` | `[likely]` — io.md §7 says the space happens "if no carriage-control instruction follows" **and** "at the end of the buffer-to-printer transfer" | Defer the space to the next **operation**: the next write performs it first, the next `F` consumes and replaces it, and an explicit `flush()` performs it at end of job. Nothing that only *reads* state performs it — `snapshot()` and `renderGreenBar` stay pure, or the golden would depend on how many animation frames ran (§7.3, `architecture.md` §2). The pending space is visible as `CarriageState.autoSpacePending`. Flipping the second constant makes the space unconditional and adds to it; the golden page changes by one blank line and nothing else. |
| `CARRIAGE_POWER_ON_AT_CHANNEL_1_HOME = true` | `printer1403.ts` | `[verified]` state, `[likely]` consequence — the Carriage Restore key "positions the carriage at channel 1 (home)" (io.md §7, A22-0526-3 pp.68, 71-72); no source says whether the brushes then count as "positioned on" that punch for the next-punch rule | Power on at page 1, line 1, **positioned on** the channel-1 punch — so the first `F1` ejects to line 1 of the next form, exactly as it would after a Carriage Restore. That is why the demo's skip is at the end of the program (§13). Alternative: "home but unsensed", which would make the first skip-to-1 a no-op and hide the rule; rejected because it invents a state the manual does not describe. Wave 3 pins the choice in both directions. |
| `CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH = true` | `console1415.ts` `pendingRequest` · `channel.ts` `inquiryRequest` · `machine.ts` `programReset` | `[unverified]` — **io.md §8 contradicts itself** | Reading A: §8 "Inquiry sequence" steps 1-2 — INQUIRY REQUEST "sets the inquiry status latch in the 1411" and "the program tests it with `J iiiii Q` (BNQ)" — one latch, set by the key, tested by BNQ, cleared by Program Reset. Reading B: §8 "Console status" glosses the latches that survive Computer Reset as "the *remote* inquiry latches (the per-channel inquiry-request latches tested by `J iiiii Q`)", which makes BNQ test a latch the console key never sets and Program Reset never clears. **We take A**, because it is the only one that gives a demonstrable inquiry path on a machine with one console and no remote stations, and because io.md §5 Figure 35 lists inquiry request per channel — which channel 1's console is. If B is right, this configuration needs a second latch and `J (I) Q` answers false forever. Recorded in the dated Phase-2 section of `open-questions.md`. |
| `DEFAULT_CARRIAGE_TAPE` (66 lines; ch1@1, ch9@57, ch12@60) | `printer1403.ts` | `[unverified]` — no manual publishes any site's tape punching; 66 lines is 11 in at 6 lpi from `console-and-physical.md` §8's `[likely]` green-bar stock | Use it, expose it as a constructor option, and **render it in the printer view** so it is visible rather than assumed. Skip and space behaviour is `[verified]`; only the punch positions are ours. A wrong guess costs a page break in the wrong place. |
| `UNDEFINED_CARRIAGE_D_CHAR_IS_INSTRUCTION_CHECK = true` | `printer1403.ts` | `[unverified]` — Figure 90 lists 30 rows and states no validity check | `InstructionCheck`, matching `UNDEFINED_J_D_CHAR_…` and `UNDEFINED_IO_D_CHAR_…` already in the codebase. The alternative — silently no motion — hides the fault. |
| `CARRIAGE_NEVER_BUSY = true` | `channel.ts` | `[verified]` cause, deliberately not modelled | `J (I) R` (BPCB) always false. io.md §7 says "Model this — programs rely on it to overlap"; this configuration has **no overlap feature** and `cycles.ts`'s I/O term is 0, so no program here can observe device motion. A polling program sees "ready" and proceeds correctly. Recorded as a **modelling refusal** in `PHASE-2-NOTES.md` §2, not as an unknown. |
| `PRINT_CHAIN_A_IS_DEFAULT` (constructor option) | `printer1403.ts` | `[likely]` for `?` printing `+` on an H chain (`charset.md` §5.1) | Default `'A'`, where A22-0526-3 p.6's footnote is primary; `'H'` available; the golden names its chain in a header comment; `charset.md` §5.3's SimH caution is quoted at the table. |
| `OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK = true` | `objectdeck.ts` | `[likely]` — the mechanism is documented (io.md §3), the case is not called out | Reject at encode, which is the research's own second option ("or forbid the pattern in the deck format", `open-questions.md` io row). The alternative — model the early truncation with WLR — stays available and is what `channel.read()` would already do if such a card arrived from outside. |
| `TRAILING_SEPARATOR_IS_A_DECK_ERROR = true` | `objectdeck.ts` | `[unverified]` — "80th card column is a word separator with nothing following" is undocumented everywhere | The encoder can never emit it and the decoder rejects it. If one arrived from outside, the channel drops the pending mark without storing (what SimH does), but our format guarantees it cannot. |
| `WS_PAIR_COUNTS_AS_ONE = true` | `objectdeck.ts` | `[likely]` — stated for the OS loader (C28-0319-4 p.65 NOTE 1), not for the standalone (C28-0309-1) | Two adjacent separators are one payload character and add 1 to the count. Alternative: 0 — but then the count could not describe a payload containing a separator at all. |
| `EXECUTE_CARD_IS_E_IN_COLUMN_1 = true` | `loader.ts` | `[verified]` for the IBM diagnostic loader (`emulators.md` §7), adopted as the shape of ours — our loader is a reconstruction | Column 1 = `E`, instruction from column 2, the loader detects the `E` and branches to it. Not `software.md` §8.2's Termination card, which is the **OS relocatable** format; we build the standalone absolute deck (`architecture.md` §5 step 2). |
| `INQUIRY_ENTRY_IS_PRE_SUPPLIED = true` | `console1415.ts` | implementation device, not a hardware claim | The operator's line is queued by RELEASE/CANCEL and consumed when the read executes; the `I` line types at read time. Core, the six latches and the console log are identical to the interactive machine; only wall-clock ordering differs, and this emulator has no wall clock. Keeps `step()` synchronous and promise-free. |
| Reader Data Check / Validity | `reader1402.ts` | `[verified]` behaviour, unreachable | Not implemented: `precheck` cannot express "set Data Check and still transfer", and no input this emulator accepts can produce a hole-count or 1414 parity error. The rows are asserted in `oracle/io-status.json`; the gap is stated in `PHASE-2-NOTES.md` §2. Stated rather than faked. |

Carried forward from `PHASE-1-NOTES.md` §1 and now reachable: **"BAR after an I/O that transfers
nothing"** (`LB = 0 → B + 1`) is exercised by every EOF read and every Not Ready, and is asserted
rather than assumed. The tape zero-length-record write exception stays unreachable — no tape.

---

## 16. Notes, log, and housekeeping conventions

- **`docs/BUILD-LOG-2.md`** — new file, Phase 2's own log, same shape as `docs/BUILD-LOG.md`
  (which is do-not-touch). One dated section per wave: what was built, what the review found, what
  changed, the commit. Archaeology of anything surprising goes here in full, not in the plan.
- **`PHASE-2-NOTES.md`** — new file, same four sections as `PHASE-1-NOTES.md`:
  §1 `[unverified]` fallbacks hit, as a table of *constant · where · fallback taken · hit by*;
  §2 deviations from the plan and from `architecture.md`, numbered, continuing that file's habit of
  saying which reading was taken and why (the modelling refusals — `CARRIAGE_NEVER_BUSY`, the
  reader Data Check gap — belong here, not in §1);
  §3 research corrections and `[observed]` observations;
  §4 open items carried out of Phase 2.
- **`docs/research/open-questions.md`** — **appended only**, one section headed
  `## Phase 2 — 2026-<MM>-<DD>`, one row per `// OPEN:` constant in §15: question, where it bites,
  fallback taken. No existing row is edited; the io rows this phase consumes (#13's rider, the
  GM-WM-created-by-load-mode row, the 80th-column row) are cited from the new section, not rewritten.
- **Housekeeping at merge, not before:** `docs/plans/architecture.md` goes stale in **three** places
  when this phase lands, and all three are corrected in the Phase-2 merge commit — the same commit
  that lands this branch on main — and by no wave, because `architecture.md` is on the do-not-touch
  list for the duration of the parallel build:
  - **line ~336**, "frozen here **because Phase 2 hand-writes decks against them**" — they were
    removed in the final Phase-1 review (`PHASE-1-NOTES.md` §2 entry 26) and are reintroduced by
    this phase in two different files (§2);
  - **line ~315**, `export interface Card { readonly codes: Uint8Array; readonly ident?: string }` —
    `Card` is a bare `Uint8Array` alias here (§2 deviation 1);
  - **line ~160**, boundary B5's `Card = { codes: Uint8Array(80) }` — same deviation.
  If the merge commit is not the place for it, the fallback is explicit: `PHASE-2-NOTES.md` §2
  becomes the sole record and `architecture.md` keeps the superseded shape by design. What is not
  allowed is leaving all three unlisted.
