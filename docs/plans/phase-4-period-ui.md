# Phase 4 — the period UI: a 1415 desk, a card hopper, and a page of green bar

Companion to [architecture.md](architecture.md) §6 (the two surfaces), §7 row "4 — Period UI"
(consumes `ConsoleLine[]`, `PrintEvent[]`, `Deck` — **no core changes**), §8's Phase 4 oracle (the
Exhibit II job log against the Figure 42 layout), §10 (three dependencies, no framework) and §12
(what is not built). Structural template: [phase-3-autocoder.md](phase-3-autocoder.md) and
[phase-5-rpg.md](phase-5-rpg.md), whose section order, table conventions and level of concreteness
this plan follows. Immediate precedent: Phase 5's host-side RPG block and Phase 3's Autocoder block,
which this phase **restyles and may not re-implement** — every session file those phases shipped
keeps its body, and every golden they froze keeps its bytes.

Single build on `feature/phase-4-period-ui` in the main checkout — no worktree, no parallel phase —
with per-wave file ownership. Every machine claim cites a manual form number and page, or a
`docs/research/` file and section. Every `[unverified]` / `[likely]` item is in §15 with its named
`// OPEN:` constant and its fallback. **1401 ≠ 1410**: four 1401 facts are named in §2 and refused
at their point of use in code — the red fault lamp, the address dials, the 1402 LOAD key and the
1401 Autocoder listing heading — because a period UI is exactly where a 1401 photograph is most
likely to be mistaken for the machine this project models.

The design panel that produced this plan ran in the FULL shape (`wf_b43127ed-583`, 2026-09-01):
three Opus architects (operator-first, paper-first, reuse-first) → three Opus judges (period
fidelity, buildability, testability) → one synthesis, rendered to
[phase-4-panel-dossier.md](phase-4-panel-dossier.md). Aggregate scores **paper-first 480 ·
reuse-first 451 · operator-first 440**. Every judge ranked a different design first, so paper-first
won on having no last place. This plan is built on paper-first with every one of the dossier's
sixteen grafts taken, every one of its eight rulings applied, every one of its twenty factual
corrections carried, and the completeness critic's nine items injected where the section skeleton
would otherwise have let them drop (§3, §6, §7, §8, §9, §10, §12, §13, §16 each name theirs). The review rounds that follow the panel are recorded in `docs/BUILD-LOG-4.md`'s Arrival section;
round 1 narrowed one graft — the dossier drew `PRIORITY ALERT` dark, and §8.2 now omits it with the
two CH1 overlap lamps, because architecture.md §12 refuses the features and not merely their
control panels — and withdrew a backspace key the 1415 never had (§6.5). Three rounds closed at
`ready-with-notes` with zero blockers on 2026-09-02; the residual majors and minors were applied by
the main session, the Phase 3 and Phase 5 precedent.

---

## The seven bullets

1. **The paper is the spine, and the paper is arithmetic.** Every number that matters on this
   page — 132 positions at 10 cpi, 66 line positions, three lines per half-inch bar, 80 columns ×
   12 rows at 0.087 / 0.250 in pitch, matrix 30 and 35, twelve carriage channels, the five dualed
   chain glyphs — lives in a DOM-free module under `src/ui/period/paper/` or
   `src/ui/period/console/`, tested in node beside the core tests. The rule is literal and it is
   what makes hand-drawn art gateable without adding jsdom: **no number is computed in a file that
   touches the DOM.** Every `*View.ts` is an adapter that computes nothing.

2. **Two oracles the phase cannot fake, and one of them is free.** architecture.md §8's named
   Phase-4 oracle is the Exhibit II job log — and the test SLICES it out of
   `docs/research/console-and-physical.md` §2 at run time (the fence at lines 59 and 79, nineteen
   lines, the elided `D bbbb...` row excluded by name), the mechanism
   `test/rpg-columns-vs-research.test.ts` already ships. The free one:
   `renderGreenBar(paper, {chain:'A', formLines:66})` — Phase 2's, frozen, byte-gated by three
   existing page goldens — must equal `header + paginate(paper, carriage, 66).filter((p) =>
   p.printedThrough > 0).map(trimRule3).join('\f\n')`, **§5.1's identity, written the same way
   everywhere it appears in this plan**. Two independent renderers over one paper. A restyle that
   breaks the paper breaks a golden.

3. **Zero core lines, and it is a `git diff` at every commit.**
   `git diff --stat <base>..HEAD -- src/core src/asm src/rpg src/formats` is empty at every wave.
   The three places the period surface is tempted are settled inside the UI with the core change
   costed and refused in §15: the 1403's A/H switch is a five-glyph restrike of the printed page
   (verified exact against `chainGlyph` over all 64 codes, because `Printer1403.chain` is
   `readonly` at `printer1403.ts:366`); the DISPLAY and C.E. detents type their `S` through
   `machine.stop()`, which is literally `{ fieldLine('S'); }` at `machine.ts:380` — the same call
   `setMode` ends on at `:327` — so **any** mode change types exactly one `S` (A22-0526-3 p.50,
   `[verified]`) with no `ConsoleMode` member added; and the inquiry hold lives in Phase 4's own
   animation frame, never in `step()`.

4. **Wave 0 is a move whose oracle is identity, not green.** `git mv` of `unitrecord/`,
   `autocoder/` and `rpg/` into `src/ui/period/` — the destination architecture.md §6 names and
   four shipped file headers promise. Its gate is
   `git diff -M --find-renames <base> -- src/ui/unitrecord src/ui/autocoder src/ui/rpg
   src/ui/period/unitrecord src/ui/period/autocoder src/ui/period/rpg ':!*/raw-import.d.ts' | … |
   grep -v "from '\.\./"` printing NOTHING — **scoped to the moved trees**, because the wave also
   adds `main.ts`, `internals/mount.ts`, `period/dom.ts`, `period/raw-import.d.ts` and the
   `period.css` stub and deletes `internals/main.ts` and three shims, all inside `src/ui`, and those
   are covered by `git diff --stat` matching §3.1's rows exactly — plus the **93 EXISTING files at
   1745 tests / 1 skip**, which wave 0's own `test/ui-controls-verbatim.test.ts` takes to **94 files
   / ≥1,747** at the commit; smoke 6 / 49, cc01 at 1241 instructions with the check at 00322, and
   348 / 2251 / 3688 / 6982 bytes unmoved. The external surface of `src/ui` is exactly five
   references — four functional imports plus `index.html:39`. `src/ui/internals/controls.ts` is
   byte-frozen at SHA-256
   `a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f`, written into both the test
   and §13.

5. **The carriage straddle is drawn, named on the page, and not fixed.** `straddled(from, to,
   tape)` is pure, and its wiring is written into the plan rather than guessed: `from` = the last
   printed position on the form, `to` = the final `snapshot().printer.carriage`. On
   `demos/cycle-probe` that is form 2 line 59 → line 61 across the channel-12 punch at 60, asserted
   alongside `carriage.channel12 === false` on the same frame, with `demos/sales-summary` asserted
   empty. Not a paper-only rule (form 2 prints nothing at 60 or 61), not a per-frame
   `CarriageState` diff (`START_BUDGET` is 2000 instructions), not a `PrintEvent[]` replay (the
   automatic single space emits no event). Recording rather than fixing is the `RW#` / `WM#` /
   `loader.ts:90` precedent.

6. **Typing at the 1415 becomes real; delivery stays queued.** The `^`-prefixed text box goes. In
   its place: a focusable Selectric with the drawn Fig.43 keyboard, a real WORD MARK key at the
   far left of the QWERTY row, INQ CAN as the only correction (the 1415's backspace key IS INQUIRY
   RELEASE and cannot be commanded — console-and-physical.md §2), and a lock the program's read
   does not open —
   the operator's INQUIRY REQUEST does. The run loop is Phase 4's animation frame, so it holds from
   REQUEST to RELEASE, and the latch is the UI's own, never `Console1415.pendingRequest` (the
   device clears that inside `read()` and `precheck()`, so a loop gated on it deadlocks).
   `INQUIRY_ENTRY_IS_PRE_SUPPLIED` stays `true` with its scope narrowed and its wording amended in
   a dated `open-questions.md` section; a blocking `step()` is refused with its cost named. **And
   the keyboard listens on the console region, never on `document`** — the one defect no
   architect designed against and no oracle can see (§6.5).

7. **Seven waves, ~3,900 new source lines in 30 files, ~800 restyled, ~800 deleted, 640 CSS in
   ONE wave, ~2,300 test lines in 17 files, one new golden file, zero new dependencies.**
   DECISIONS.md line 11 closes as **Vite `[settled]`** — `typescript ~5.9`, `vite ^8`,
   `vitest ^4`, unchanged — with exactly one config line added, `base: './'`, because the built
   page currently emits `src="/assets/…"` and will not open from the filesystem. No framework, no
   jsdom, no webfont, no CSS preprocessor, no audio. Five gate numbers move only where the plan
   says they move, and no byte of machine-produced text moves at all. (Two corrections to the
   dossier's own bullet 7, both itemised: §3.9 adds the file rows up to ~3,900 new lines where the
   dossier's wave headlines said ~2,300, and §12.3 counts one golden *file* plus two expectations
   sliced from research files at test time where the dossier said "three new goldens".)

**The standing gate, every commit** (§12.2): `npm run typecheck` clean · `npm test` 93 files /
1745 tests / 1 named skip / 0 fail · `npm run smoke` 6 files / 49 · `npm run cc01` byte-identical
(CC01A, CC01 COMPLETE, instruction check at 00322, 1241 instructions) · page golden 348 B · listing
golden 2251 B · RPG page golden 3688 B · RPG listing golden 6982 B — measured on `voltron` at
`b7c60b3` before a line of this plan was written, and identical to the numbers `main` carried at
`2be10b4`. **Phase 4 renders every one of those bytes and moves none of them**: the test and smoke
counts rise only by the files §12.1 enumerates, and the four goldens and the cc01 transcript never
move, because this phase touches no path that produces them.

**Model policy** (`CLAUDE.md` § Model policy; `DECISIONS.md` 2026-08-30): a Fable build
orchestrator with every worker on Opus or lower — Tom's ruling for this phase, given 2026-09-01,
which also closes the `[open]` build-provenance item `DECISIONS.md` carries under "2026-09-01 —
Phase 5 merged". **Phase gate** (`CLAUDE.md` § Engineering rules): Tom approves the ≤7 bullets
before wave 0; nothing in §11 begins on a plan that is merely committed.

---

## 1. The storyboard, step by step

This is what the owner and a family member do. Every later section exists to make one of these steps true, and
§13 is this list turned into assertions — each step ends by naming the criteria that check it;
criteria 1-5 are the standing gates every step rests on.

1. **Open the page.** `npm run dev`. Two tabs, visually foreign to each other on purpose
   (architecture.md §6): **MACHINE ROOM** and **INTERNALS**. The machine room opens in paper order
   — SPEC SHEET and CODING SHEET at the left, the 1402 below them, the 1415 desk to their right,
   the 1403 filling the right-hand column. The 1403 shows one blank form: 66 line positions, 132
   columns, three lines per half-inch bar, the carriage marker at form 1 line 1, and the carriage
   tape drawn beside the form with its punches at lines 1, 57 and 60 (`DEFAULT_CARRIAGE_TAPE`,
   `printer1403.ts:212`). Nothing on the page is a dimension in inches except the card and the two
   paper stocks, and no cabinet is drawn (§2). *→ §13 criteria 17, 18a.*

2. **SPEC SHEET: press `sample specs`.** `demos/sales-summary.rpg` fills the sheet — the sixty
   80-column cards Phase 5 froze. The per-sheet ruler, computed from `SHEET_COLUMNS`
   (`src/rpg/sheets/columns.ts`), redraws as the caret moves from a `D` Data line to an `L` Format
   line, exactly as `specBox.ts` does it today. A period header band is drawn around the ruled box.
   **No facsimile X24-1336…1339 form is drawn** — §9.2 says why, and §14 R12 carries it to the
   gate. *→ §13 criterion 15 (the session), criterion 19 (the eye).*

3. **GENERATE.** Diagnostics empty. The memory map reads `CONSTANTS 00500 · CODE 00808 ·
   IND 02533 · CDIN 02540 · PLINE 02700 · PLGM 02832 · HIGH 02833 · CTL 1` — Phase 5's numbers, from
   Phase 5's `layoutOf`, restyled and not recomputed. The generated Autocoder source appears.
   **SEND TO AUTOCODER** is a typed `sheetView.setText(source, dataCards)` call across the desk,
   never a DOM reach (DECISIONS.md 2026-08-31). *→ §13 criterion 15.*

4. **CODING SHEET.** The 80-column ruler over the source, its field spans from `SOURCE_FIELDS`
   (`src/asm/types.ts:18` — page 1-2, line 3-5, label 6-15, op 16-20, operand 21-72, ident 76-80;
   C28-0309-1 pp.5-7), with `COMMENT_COLUMN` (6) and `LABEL_INDENT_COLUMN` (7) drawn as marks on
   the sheet because the parser reads them by absolute column. The Phase-3 `FRAMING` paragraph is
   on the page verbatim. **ASSEMBLE**: the listing prints on green bar under the C28-0326-2 §12
   page heading, and the object deck appears as card faces with the decoded load address and count
   under each. *→ §13 criteria 6, 15.*

5. **Press the A/H toggle** on the listing and watch the 12-punch print `&`, then `+` — the same
   `restrike()` the 1403 page uses (§5.3). The 2251-byte listing golden does not move, because the
   restrike is a display transform over `renderListing`'s output and never reaches it.
   *→ §13 criteria 6, 12.*

6. **PUNCH INTO HOPPER.** The deck box fills; the 1402's file feed grows one card edge per card
   against its 3,000-card capacity. Now **edit ONE character of the source**: the listing, the
   deck and PUNCH all retire, and — new in this phase — `session.stale` is what says so, in node,
   not a DOM closure (§9.3). *→ §13 criterion 15.*

7. **The card viewer** shows card 1 at real geometry — 7 3/8 × 3 1/4 in, 80 columns at 0.087 in,
   12 rows at 0.250 in, 0.055 × 0.125 in rectangular holes, the interpretation band across the top 3/16 in printing the 64-glyph set of `glyphOf`, not the 1403's 48 — a ruling, §15
   `INTERPRETATION_BAND_PRINTS_THE_64_GLYPH_SET` — one diagonal cut at the
   upper LEFT corner — from ONE geometry module, `paper/cardGeometry.ts`, at three scales. The
   caption says which deck the face belongs to: the deck in the box, or the deck that was LOADED
   (§7.1, critic item 7). *→ §13 criterion 13.*

8. **PUT DECK IN HOPPER**, then the 1402's own keys: PUNCH START, PUNCH STOP, END OF FILE, READER
   STOP, READER START — the five A22-0526-3 Fig.60 p.61 gives. There is **no LOAD key** on this
   1402 and the plan says why (§2.3; software.md §10.1, §10.10). The punch keys are drawn and inert
   and the punch hopper is empty, with one line saying this machine reads and does not punch
   (§7.1). *→ §13 criterion 18a.*

9. **At the 1415: STOP.** The Selectric types `S` at matrix 35, double-spaced. **Turn MODE to
   DISPLAY** — the turn itself types a second `S`, because ANY change of the mode-switch setting
   does (console-and-physical.md §4; A22-0526-3 p.50). **START**: the machine types `D `, the
   keyboard UNLOCKS, the carrier parks. NOW type `00000`; the keyboard auto-locks on the fifth
   digit, the carrier returns, the line spaces, and the machine types `D ` and storage to the word
   mark at matrix 30 — on cleared core that runs to the end of the 80-position line
   (`CONSOLE_LINE_LENGTH`, `machine.ts:105`; `machine.ts:100`). *→ §13 criteria 10, 11.*

10. **Turn to ALTER** (a third `S`), **START**: `A `, keyboard unlocks. Key `AL%1000012$R` — the
    twelve characters of `BOOTSTRAP_CHANNEL_1` (`src/formats/loader.ts:26`) — pressing the real
    WORD MARK key before the `L` at 00001 and the `R` at 00011, or press `key the bootstrap` and
    watch the same twelve keystrokes go in one at a time through the same keyboard. **COMPUTER
    RESET** commits the entry (§6.4). **Turn to RUN** (a fourth `S`). **START.** *→ §13 criteria
    10, 11, 16.*

11. **Watch the paper move.** The hopper loses one card edge per read, the read station shows the
    card in the 1414's 80-position buffer, the `0 (NR)` pocket grows. The Selectric log scrolls on
    9 7/8 in pin-feed form with feed holes 9 3/8 in apart (S223-2648 p.78), single-spacing at 6 lpi
    and double-spacing the S/C/E lines, word marks as an inverted circumflex, bad parity
    underscored, zeros slashed `Ø` and the letter `O` not (C28-0351-5 p.2). *→ §13 criteria 7, 16.*

12. **The 1403 form fills** 132 positions wide and never wraps; the form scrolls horizontally
    inside its own box and the ruler scrolls with it. There are no word marks on this paper — under
    `L` a word mark becomes a word separator with no chain slug, so a BLANK precedes the marked
    character (charset.md §7; A22-0526-3 p.80 Figure 88) — and one line under the form says so. At
    the channel-1 skip, form 1 slides onto the printed stack in one 200 ms transform and form 2
    starts; the stack scrolls back to form 1, all 66 line positions, blanks included — which is
    what `paginate` exists for (§5.1). *→ §13 criteria 8, 16.*

13. **Load `demos/cycle-probe`** and watch the last total move from form line 59 to 61 across the
    channel-12 punch at 60 without starting a third form. The crossed punch is drawn hatched, the
    channel-12 lamp is visibly off beside it, and one line reads `channel 12 at line 60 passed
    unsensed — CARRIAGE_SENSES_AT_DESTINATION_ONLY (src/core/devices/printer1403.ts:354)`.
    *→ §13 criterion 9.*

14. **Press INQUIRY REQUEST** (the repurposed Carrier Return lever): the lamp lights, the run
    loop HOLDS, the keyboard unlocks at matrix 30. Type a message, mark a character with WORD MARK,
    press INQUIRY RELEASE; the loop resumes and the machine types the `I` line when the program's
    `RCP` executes. Above the keyboard, the §5 light panel's 85 lamps sit under its REDUCED label,
    sixteen of them live (→ §13 criterion 14). Then **END OF JOB** at the paper tray — the operator
    tearing the form off, not
    a 1403 key (§7.2) — and **INTERNALS**: seven registers, seven latches, channel 1's six status
    indicators plus the interlock, the core slice with an overbar where the word mark is set,
    `microsecondsSimulated` as a cycle count and never a clock, a live MODE label reading
    `machine.mode` above the frozen controls, and `controls.ts` exactly as Phase 1 shipped it
    behind its hairline rule and anachronism label. *→ §13 criteria 3, 10, 19.*

Close with the Phase-6 sentence, because it is what this desk is for: a ballistic reentry
trajectory in twelve columns on the 132-position carriage needs **no new station** — one Autocoder
deck, the same hopper, the same form, the same stack (§16 item 8 enumerates the four things it does
need).

---

## 2. Scope

Two lists. Every out-of-scope row carries its citation and its consequence, because a period UI is
the phase in which "we did not draw that" has to be defensible line by line.

### 2.1 In

- **`src/ui/period/`, created by `git mv`** in wave 0 — architecture.md §6 names it in its own
  heading text ("**Period surface** (`src/ui/period/`, Phase 4)"), and four shipped file headers
  promise it: `unitrecord/readerView.ts:11`, `unitrecord/printerView.ts:11`,
  `autocoder/mount.ts:12` and `autocoder/sourceBox.ts:6` ("Phase 4 moves this directory into
  src/ui/period/ and styles it; nothing here is thrown away"). `src/ui/internals/` does **not**
  move — it is the anachronism, and architecture.md §6 keeps it separate on purpose.
- **Five DOM-free modules that own every number on the page** — `paper/page.ts`,
  `paper/carriage.ts`, `paper/chain.ts`, `paper/cardGeometry.ts`, `console/selectric.ts` — plus
  the three DOM-free state modules `console/session.ts`, `console/lamps.ts` and
  `period/session.ts`, which land in waves 4 and 5. All eight reach
  `test/period-is-dom-free.test.ts`'s required-path list, which **the wave that lands each module
  appends to** — and they do not reach it together: **wave 1's eight** are its own five modules plus
  the three MOVED block sessions (`unitrecord/session.ts`, `autocoder/session.ts`,
  `rpg/session.ts`, all of which exist from wave 0), while `console/session.ts`, `console/lamps.ts`
  and `period/session.ts` join in waves 4 and 5 — **eleven at wave 5** (§3.8).
- **The 1403 station**: an accumulating stack of 66-line green-bar forms, 132 positions at 10 cpi,
  three lines per half-inch bar, the plain-white toggle, a 132-position ruler, the drawn
  twelve-channel carriage tape with its punches and brush, the channel-9 and channel-12 lamps, the
  crossed-punch hatching with its banner, and the A22-0526-3 Fig.69 lamp panel drawn dark (§7.2).
- **The 1402 station**: the file feed as a stack of card edges against 3,000; five radial stackers
  labelled `0 (NP) · 4 · 8/2 · 1 · 0 (NR)` with 8/2 summed across both feeds; the Fig.60 key and
  light strip (five keys, twelve lights, only the modelled ones ever lit); the read-buffer card;
  and the 80 × 12 face at three scales from ONE geometry module (§7.1).
- **The 1415 station**: the Selectric log on 9 7/8 in pin-feed paper at 6 / 3 lpi with the slashed
  zero, the word-mark circumflex and the parity underscore; the six-detent MODE rotary at its
  Fig.47 clock positions; START / STOP / PROGRAM RESET / COMPUTER RESET; the drawn Fig.43 keyboard
  with the WORD MARK key and a lock; INQUIRY REQUEST / INQUIRY RELEASE / INQ CAN as the three
  repurposed levers (§6).
- **The §5 indicator panel** in its verified left-to-right box order with STATUS immediately right
  of ARITH, only the drivable lamps ever lit, and the panel labelled as REDUCED (§8).
- **Both authoring stations restyled as period paper** — the rulers kept, the textareas kept, a
  drawn frame and header band around each, the one sample button split in two (§9).
- **Internals as a tab**, with `src/ui/internals/controls.ts` byte-frozen and a live MODE label
  above it in Phase 4's own DOM (§10.4).
- **One stylesheet**, `src/ui/styles/period.css`, owned by one wave (§10.3).
- **`npm run build` producing a filesystem-openable `dist/`** — one line of config (§10.5).
- **A bounded two-attempt primary read**, folded into wave 0, whose findings land in a dated
  Phase 4 section of `docs/research/open-questions.md` and never in `console-and-physical.md`
  (§11 wave 0).

### 2.2 Out — each with its page

- **No scale machine-room elevation and no floor plan.** console-and-physical.md §6: "No IBM
  dimension figures located for the 1411 or the 1415 cabinet" `[unverified]`; §13 rows 2-3: treat
  as approximate and "don't label with a spec number"; and A22-0526-3 Fig.57 p.59, the one floor
  photograph, has 729 tape drives in it that architecture.md §12 forbids depicting (the 1414-3 beside them is part of the modelled machine — §12's own "one machine" line). **No
  dimension in inches is printed anywhere on the page** except the card's and the two paper
  stocks', which are the three things a person can hold. Consequence: the stations are panels,
  not elevations (§15 `NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED`).
- **No tape, disk, channel 2, processing overlap, 1401 compatibility mode, column binary,
  51-column feed, MICR, or Priority feature** (architecture.md §12). Concretely on this desk: no
  COMPATIBILITY toggle, no DENSITY CH1 / CH2, no DISK WR, no PRIORITY ON key, no PRIORITY
  PROCESSING rotary (console-and-physical.md §3: S223-2648 Fig.2 p.7 calls that panel optional),
  no CH2 columns on the light panel, no `PRIORITY ALERT` lamp and no CH1 `OVERLAP IN PROCESS` /
  `NOT OVERLAP IN PROCESS` lamps (§8.2). **The C.E. detent is drawn and refused**: the rotary turns to
  it and types its `S`, and the CE panel behind the hinged door (§3, S223-2648 Fig.2 p.7) is
  drawn CLOSED with one line saying what is documented behind it and that none of it is modelled.
- **The four 1401 facts, named and refused at their point of use in code** (§16 item 2):
  1. **Red fault lamps.** console-and-physical.md §11: "The claim that labels light up red on
     fault is from a **1401** page and does **not** transfer to the 1415" `[unverified for 1410]`.
     The specific temptation in this design is the 1403's END OF FORMS / FORMS CHECK pair, and it
     is refused in `period.css`'s own comment and in `printer/panelView.ts`'s header.
  2. **Address dials.** §1: "The 1410 has **no** address-dial rotary switches (unlike the 1401).
     Addresses are typed on the console typewriter" `[verified]` — A22-0526-3 pp.50-51. This is
     precisely why the keyed dialogue of §6.4 is the design and no dial is drawn.
  3. **The LOAD key.** software.md §10.1 is headed "The 1410 has no Load key", and §10.10 says
     verbatim: "For contrast, the **1401** convention (do not apply to the 1410): pressing LOAD on
     the 1402 reads a card into 001-080, sets the I-address register to 001, sets a word mark at
     001 …". The 1402's Fig.60 p.61 strip is PUNCH START, PUNCH STOP, END OF FILE, READER STOP,
     READER START — five keys, no LOAD — and the 1410 bootstrap stays keyed at the 1415
     (`reader/keysView.ts` asserts the absence as a string, §11 wave 3).
  4. **The 1401 Autocoder listing heading.** §12: `SEQ PG LIN LABEL OP OPERANDS SFX CT LOCN
     INSTRUCTION TYPE CARD` — "Do not mix it into a 1410 renderer" `[verified]`. The coding
     sheet's listing keeps `renderListing`'s C28-0326-2 columns and adds the §12 page heading
     around them, never inside (§9.3).
- **No facsimile X24-1336…1339 specification forms and no facsimile C28-0309-1 coding form.** The
  forms' COLUMN layout is `[verified]` — the column tables are rpg-sources.md §6, and the ruling
  that "the sheets *are* the 1401 sheets" `[verified for the card systems]` is rpg-sources.md §5
  (`:218`), J24-0215-2 — but their ARTWORK is not: no scan of any of the four
  exists (rpg-sources.md §3, a `[verified]` absence), so a drawn form would put invented artwork
  around verified columns, against research/README.md's rule ("Do not encode"). PHASE-5-NOTES.md §4
  calls the parser-backed ruler "the parser-backed specification for the later drawn forms" — later. **This
  is the largest deliberate fidelity gap in the phase**, it is §14 R12, and it is stated at Tom's
  gate rather than discovered at criterion 19 (§9.2, §15 `THE_RULER_IS_THE_FORM`).
- **No sound of any kind** — no source publishes 1402 / 1403 / Selectric acoustics (§15
  `SOUND_IS_OUT`). **No key travel, keycap depression depth or rotary detent torque** — a key gets
  a pressed state and the rotary snaps between six angles (§15 `NO_KEY_TRAVEL_ANIMATION`).
- **No per-line 1403 form-feed simulation at 600 lpm.** 600 lpm is a speed spec, not a motion
  spec; animating paper at it would imply the cycle-accurate timing DECISIONS.md 2026-08-30
  refuses, for the same reason `microsecondsSimulated` is never rendered as a clock. A completed
  form slides onto the stack in one 200 ms transform (§15 `FORM_FEED_IS_A_SLIDE_NOT_A_SIMULATION`).
- **No jsdom and no DOM-rendering test.** The design's own answer is better: no number is
  computed in a file that touches the DOM, so there is nothing a DOM test could assert that a node
  test cannot (§10.6, §12).
- **No editing of the carriage tape from the page.** It needs a core constructor option and this
  shop runs one form (§15 `DEFAULT_CARRIAGE_TAPE`).
- **No second implementation of anything the core does.** The carriage is not re-implemented from
  `PrintEvent[]`; the page model is asserted against `renderGreenBar`, not derived from it (§5.1,
  §14 R10).
- **No fix to `CARRIAGE_SENSES_AT_DESTINATION_ONLY`** and **no flip of
  `INQUIRY_ENTRY_IS_PRE_SUPPLIED`** — both are `src/core` changes; the first would move
  `test/golden/cycle-probe.page.txt`, the second would put an async seam in `step()` (§5.2, §6.6,
  §15).
- **No edit to `docs/research/console-and-physical.md`.** A correction is an escalation with its
  own commit — the `RW#` / `WM#` / `loader.ts:90` precedent (DECISIONS.md 2026-08-31). Wave 0's
  bounded read writes to `open-questions.md` and to `docs/BUILD-LOG-4.md` only.
- **No time unit, elapsed-seconds label or speed slider labelled in seconds anywhere on the period
  surface** (critic item 8). architecture.md §6 keeps `microsecondsSimulated` on the internals tab
  and never as a clock; §13 criterion 18a's refusal grep makes that mechanical.

### 2.3 Settled ground this plan restates and does not re-open

The core/UI split and the DOM-free core (DECISIONS.md 2026-08-29); KISS peripherals — one 1415,
one 1402, one 1403 Model 2, one channel (2026-08-30); the period-accurate UI with a separate,
clearly anachronistic internals view (2026-08-30); functional-but-inspectable with a cycle
counter and no cycle-accurate timing claims (2026-08-30); the build order 3 → 5 → 4 → 6
(2026-08-30); the typed `setText` hand-offs and the refusal of DOM selectors across views
(2026-08-31); the settled I/O statement form and the retired `IO_OPERAND_IS_XCONTROL_BADDR_D`
(2026-08-31); Phase 5's `stale`-shaped invalidation in `src/ui/rpg/session.ts:31` (today;
`src/ui/period/rpg/session.ts` from wave 0); and the
architecture.md §7 sentence this phase exists under — "Consumes `ConsoleLine[]`, `PrintEvent[]`,
`Deck` — **no core changes**". §2.2's rows take no position on any of them.

---

## 3. File list and ownership

One table, grouped by wave: path · action (`new` / `move` / `edit` / `delete` / `reuse-verbatim`)
· lines · what it owns and what it must not touch. **Every path after wave 0 is spelled at its
POST-MOVE location** (`src/ui/period/…`) — RULE 3 of §11 — and a note under each wave's block says
so where a reader could otherwise be misled. Line counts are estimates for new files and measured
today for moved, edited and deleted ones (`wc -l` on `b7c60b3`).

### 3.1 Wave 0 — the move, the shell, the freeze, and the build fix

| Path | Action | Lines | Owns / must not touch |
|---|---|---|---|
| `src/ui/period/unitrecord/{cardView,deckBox,inquiryView,mount,printerView,readerView,session}.ts` | move (7) | 127 · 171 · 83 · 94 · 156 · 97 · 78 | `git mv` from `src/ui/unitrecord/`. The ONLY content change is import SPECIFIERS, under **seven rewrites**: `'../../core/'` → `'../../../core/'`, `'../../formats/'` → `'../../../formats/'`, `'../../asm/'` → `'../../../asm/'`, `'../../rpg/'` → `'../../../rpg/'`, `'../../../demos/'` → `'../../../../demos/'`, `'../internals/'` → `'../../internals/'` (which after the seventh rewrite survives on exactly ONE line, `unitrecord/inquiryView.ts:15`'s `keyed`), and the seventh: **every `import { … } from '../internals/panel.js'` becomes `from '../dom.js'`** — thirteen files, listed in the `dom.ts` row below. No view body moves. |
| `src/ui/period/autocoder/{listingView,mount,objectDeckView,session,sourceBox}.ts` | move (5) | 110 · 85 · 70 · 61 · 161 | Same seven rewrites. Twelve of the `'../../asm/'` / `'../../rpg/'` lines are here and in `rpg/`: `listingView.ts:15-16`, `sourceBox.ts:15-16`, `session.ts:12-13`, `objectDeckView.ts:13`, `rpg/session.ts:6-7`, `rpg/resultView.ts:5`, `rpg/specBox.ts:5-6`. `'../unitrecord/'` stays `'../unitrecord/'` — sibling depth is unchanged by the move. |
| `src/ui/period/rpg/{mount,resultView,session,specBox}.ts` | move (4) | 59 · 70 · 55 · 104 | Same seven rewrites; `rpg/mount.ts` is clean of the `asm` / `rpg` pair. `'../autocoder/'` stays. |
| `src/ui/period/raw-import.d.ts` | new | ~30 | The three shims merged into one — `'*.cards?raw'`, `'*.asm?raw'`, `'*.rpg?raw'` — plus the one line `declare module '*.css';` for wave 0's stylesheet import. ONE file as a SIMPLIFICATION, not as an enforcement: Phase 6's `*.asm?raw` line then goes in one place. **The compiler does not forbid a duplicate** — measured on this toolchain (`tsc` 5.9.3, this `tsconfig.json`): duplicate ambient `declare module '*.cards?raw'` blocks in two files, in one file, and with a live import all exit 0. `autocoder/raw-import.d.ts:4-8`'s shipped header makes the opposite claim; the merged shim's header records the measurement instead, and wave 0 owns that header. |
| `src/ui/unitrecord/raw-import.d.ts` · `src/ui/autocoder/raw-import.d.ts` · `src/ui/rpg/raw-import.d.ts` | delete (3) | 6 · 12 · 4 | Replaced by the merged shim above, in the same commit. |
| `src/ui/period/dom.ts` | new | ~80 | The period surface's OWN `make` / `cell` / `row` / `table` / `box` / `svg` / `text` helpers and its OWN `View` interface, declared here with the SAME signatures `panel.ts` gives them — structurally identical, so the page frame can hold both — so `internals/panel.ts` is never refactored to share them (§3.6 and §14 R9 say why). **Wave 0's seventh rewrite points all thirteen importers here in the same commit**: `unitrecord/{cardView:26, deckBox:11, inquiryView:16, mount:12, printerView:25, readerView:15}`, `autocoder/{listingView:18, mount:15, objectDeckView:16, sourceBox:17}`, `rpg/{mount:5, resultView:6, specBox:7}`. It is an import-specifier change, so wave 0's identity oracle still passes; and it is what makes §3.8's "exactly two cross-surface imports" true FROM WAVE 0 rather than only at wave 5. |
| `src/ui/main.ts` | new | ~95 | The page entry: ONE `createMachine({size:10_000})`, three id lookups at start-up and never again (`#app`, `#machine-room`, `#internals`), the two-tab shell (MACHINE ROOM / INTERNALS) over **the two containers `index.html` carries inside `#app` — `<div id="machine-room">` and `<div id="internals">`** — the ONE animation frame (§10.2), `import './styles/period.css'`. In wave 0 it calls `mountInternals` on the internals container and `mountUnitRecord`, `mountAutocoder`, `mountRpg` on `#machine-room`, from their moved paths; §10.7 gives the mount chain per wave. |
| `src/ui/internals/mount.ts` | new | ~70 | `mountInternals(machine, host, hooks: { run(): void; halt(): void; kick(): void }): { readonly view: View }` — it APPENDS into `host`, which is `main.ts`'s `<div id="internals">`, so the `View` is the whole return. Today's `internals/main.ts` body minus `createMachine`, the `#app` lookup, the RUN loop and the three sibling mount calls, PLUS the adapter that turns `panel.render(s, note)` into a `View` (§10.2's `mountInternals` paragraph): it builds `createControls(machine, { run: hooks.run, halt: hooks.halt, redraw: (message?: string) => { note = message === undefined ? '' : \`   ${message}\`; hooks.kick(); } })` — `controls.ts:39`'s `message?` arrives `undefined` on RUN and STOP, and `internals/main.ts:26`'s three-space separator is kept — and its `view.render(s)` calls `panel.render(s, \`MODE = ${label}${note}\`)`. Keeps the hairline rule, the anachronism note, and `controls.el` + `panel.el` in that order; gains the live MODE label of §10.4 in wave 4. |
| `src/ui/internals/main.ts` | delete | 54 | Its four responsibilities move to `src/ui/main.ts`; its body to `internals/mount.ts`. |
| `src/ui/styles/period.css` | new (stub) | ~5 | A HEADER COMMENT ONLY — `/* Phase 4 — owned by wave 5 (§10.3); created empty in wave 0 so main.ts's import resolves under vite build. */` — so `npm run build` and `npm run dev` resolve `import './styles/period.css'` from wave 0 on. **Wave 5 remains SOLE OWNER OF ITS CONTENT** (§3.4, §10.3). Typecheck does NOT catch the missing file — measured: `tsc` exits 0 with the ambient shim and no file on disk — only `vite build` does, which is one more reason `npm run build` is in the per-commit gate (§12.2). |
| `index.html` | edit | 41 → ~55 | Two-tab shell — `<div id="app">` holding `<div id="machine-room">` and `<div id="internals">` — script `src="/src/ui/main.ts"`. The `<style>` block at lines 6-35 SPLITS: the period rules go to `period.css`; the internals rules stay inline in a block SCOPED under `#internals` (§10.3), so `panel.ts`, `coreView.ts` and `registerView.ts` need no edit and `.wm`, `.on`, `.off`, `.grid`, `.wide`, `#core`, `.anachronism` keep resolving. |
| `vite.config.ts` | edit | +1 | `base: './'` inside `defineConfig` — the phase's one and only build-config change (§10.5). |
| `test/ui-controls-verbatim.test.ts` | new | ~45 | SHA-256 of `src/ui/internals/controls.ts` equals the literal `a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f`; a second case asserts `git diff --numstat` against `main` is empty for `controls.ts`, `coreView.ts` and `registerView.ts`. |
| `test/session.test.ts:27` · `test/tier4-autocoder-demo.test.ts:37` · `test/tier4-rpg-demo.test.ts:17` · `test/rpg-is-dom-free.test.ts:78` | edit | 1 line each | The four functional references to `src/ui` outside `src/ui` (verified: these four plus `index.html:39` are the whole external surface). Plus the eight prose / `describe`-string mentions in the same four files, so a grep for `src/ui/unitrecord` returns nothing outside `docs/`. |
| `docs/BUILD-LOG-4.md` | new (opened) | ~40 at wave 0 | The Arrival section (§16 item 7) and wave 0's section, which carries the bounded primary read's result or its two failed attempts. |
| `docs/research/open-questions.md` | edit (append) | +~30 | A dated `## Phase 4 — 2026-…` section, opened by wave 0 with the primary read's findings and §15's rows as each wave first depends on them. Nothing above it is edited. |
| `docs/screenshots/phase-4/README.md` | new | ~5 | The naming convention for RULE 4's per-wave screenshots — `wave-N-<station>.png` — and the one reason the file exists at all: **git tracks no empty directory**, and §16 item 7 says wave 0 creates the directory (§11.3, §14 R11). |

**Wave 0 changes no view body**, and §11's oracle for it is identity: the moved files differ from
`main` only on import-specifier lines.

### 3.2 Wave 1 — the paper and the console, DOM-free

| Path | Action | Lines | Owns / must not touch |
|---|---|---|---|
| `src/ui/period/paper/page.ts` | new | ~110 | `FormPage`, `paginate`, `trimRule3`, and **`PRINT_POSITIONS = 132`** and **`LINES_PER_BAR = 3`**, moved here from `printerView.ts:28` and `:35` with their comments (§4.1, §5.1, §7.2). Imports `PrintLine`, `CarriageState` from `src/core/types.ts` and NOTHING from `printer1403.ts` — the cross-check is an assertion in a test, never a call (§14 R10). **The period `PRINT_POSITIONS` is a second declaration of a name core already carries (`printer1403.ts:43`), and it is deliberate**: `page.ts` may not import `printer1403.ts` at all, so `test/period-page.test.ts` imports CORE's and asserts the two agree — which is what makes the 132 a check rather than a tautology (§4.1, §15 `PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR`). |
| `src/ui/period/paper/carriage.ts` | new | ~130 | `FormPosition`, `TapePunch`, `traversed`, `straddled`, `STRADDLE_BANNER` (§4.2, §5.2). Imports `CarriageTape` from `printer1403.ts` as a TYPE only. |
| `src/ui/period/paper/chain.ts` | new | ~70 | `CHAIN_DUALS`, `restrike` (§4.3, §5.3). Never imported by anything under `src/asm/**` — a grep in `test/period-chain.test.ts` says so. |
| `src/ui/period/paper/cardGeometry.ts` | new | ~150 | `CARD_GEOMETRY`, `holePath`, `outlinePath`, `bandGlyphs` (§4.4, §5.4) — extracted from `cardView.ts:32-45`, with `punchMask` and `glyphOf` as its only imports. |
| `src/ui/period/console/selectric.ts` | new | ~150 | `SelectricCell`, `SelectricLine`, `SelectricOpts`, `toSelectric`, `renderSelectric` (§4.5, §6.1). Imports `ConsoleLine` as a type; nothing else. |
| `src/ui/internals/panel.ts` | edit | −16 +2 | Delete the private `renderConsoleLine`, its two combining-mark constants AND the four-line comment that exists only to describe them — **lines 61-75**, the blank line at `:75` going with the block so no doubled blank is left behind `:60`, a sixteen-line fold once the rewritten call at line 145 is counted — then import `renderSelectric` from `'../period/console/selectric.js'` and call it with `{ matrix: 'flush', marks: 'render', spacing: 'render' }`, which renders byte-for-byte what the deleted function rendered. **The four-line comment is the only in-code citation for the two combining marks** (research/console-and-physical.md §2, A22-0526-3 p.49; S223-2648 p.6), so it MOVES into `selectric.ts`'s header with the constants rather than being deleted (§16 item 1; §4.5, §6.1). `make` / `cell` / `row` / `table` / `box` / `View` keep their exports and signatures because `controls.ts` imports `make` from here and is frozen. The diff is stated exactly in the commit message and §13 criterion 3 pins it. |
| `test/period-page.test.ts` | new | ~180 | `paginate`'s four rules, including that **every `FormPage.lines` entry is exactly `PRINT_POSITIONS` (132) characters** (§7.2); the `renderGreenBar` identity over the three shipped page goldens re-run through the real machine; the two-lines-at-one-position throw; **a synthetic three-form paper** (critic item 4d — no shipped demo exceeds two forms). |
| `test/period-carriage.test.ts` | new | ~170 | `traversed` over single / 2 / 3-line spaces, in-form skips, form-wrapping skips, the one-form bound; `straddled` returns a punch iff crossed and not landed on; a single-line space never straddles. |
| `test/period-chain.test.ts` | new | ~90 | `restrike(chainGlyph(c,'A'),'H') === chainGlyph(c,'H')` and the reverse for all 64 codes; `CHAIN_DUALS` diffed against charset.md §5's table read from the research file; the no-second-chain-table and no-import-under-`src/asm` greps. |
| `test/period-cardgeometry.test.ts` | new | ~160 | The geometry invariants of §12.1 T0; `holePath` agrees with `punchMask` for every punchable code; `test/golden/card-face-a.svg.txt` byte-identical. |
| `test/period-selectric.test.ts` | new | ~200 | **THE PHASE-4 ORACLE** (§6.1, §12.1 T1): the Exhibit II slice, byte for byte at `{matrix:'flush', marks:'strip', spacing:'ignore'}`; then the marks, spacing, matrix, slashed-zero and blank-versus-`b` cases separately. |
| `test/period-is-dom-free.test.ts` | new | ~95 | `core-is-dom-free.test.ts`'s regex set **EXTENDED** by `/\bSVGElement\b/`, `/\brequestAnimationFrame\(/` and `/\baddEventListener\(/`, over the **eight** required paths this wave can name (§3.8), one case per path, plus the rewritten import case. **This is the one Phase-4 test file a later wave appends to**: wave 4 adds two paths, wave 5 adds one, eleven at the end (§11's ownership note 1). |
| `test/golden/card-face-a.svg.txt` | new golden | ~12 | The two `<path d>` strings and the band text for `demos/hello-dad.cards` card 1, generated by `holePath` / `outlinePath` / `bandGlyphs` and frozen here. Header says CONSTRUCTED. |

**There is NO authored `console-job-log.txt` golden** — the expected text is sliced from
`docs/research/console-and-physical.md` at test time (§12.3).

### 3.3 Waves 2-4 — the three stations

| Path | Action | Wave | Lines | Owns / must not touch |
|---|---|---|---|---|
| `src/ui/period/printer/formView.ts` | new | 2 | ~220 | The current form and the printed stack, from `paginate`; 132 fixed positions per line, `width: max-content`, the ruler, the bar/plain toggle, the 200 ms slide. Computes no number. |
| `src/ui/period/printer/carriageView.ts` | new | 2 | ~180 | The twelve-channel tape strip with `machine.printer.tape`'s punches, the brush at `carriage.line`, the channel-9/12 lamps from the snapshot, hatched crossed punches from `straddled`, the banner. |
| `src/ui/period/printer/panelView.ts` | new | 2 | ~110 | Fig.69's two rows and Fig.70's PRINT START / PRINT STOP, all drawn dark, one lamp colour; **no END OF JOB key**; the END OF JOB control sits at the paper stack labelled as the emulator's (§7.2). |
| `src/ui/period/unitrecord/printerView.ts` | delete | 2 | 156 | `PRINT_POSITIONS` (`:28`) and `LINES_PER_BAR` (`:35`) move to `paper/page.ts` with their comments (wave 1 already took them, §3.2); the bar rule and the `max-content` fix move to `formView.ts`. |
| `src/ui/period/unitrecord/mount.ts` | edit | 2 | ±6 | THE SAME COMMIT as the deletion (RULE 2): stop constructing `createPrinterView`, construct the three printer views, hand them `machine.printer.tape` and add them to the `views` array. |
| `test/period-printer.test.ts` | new | 2 | ~200 | The deck-driven half of §11 wave 2's oracle: cycle-probe through the real machine, `paginate` → 2 forms, `straddled` → `[{line:60, channel:12}]`, `channel12 === false`, the banner verbatim, sales-summary → no straddles, `renderGreenBar` still equals the golden. |
| `src/ui/period/reader/hopperView.ts` | new | 3 | ~150 | The file feed as ≤40 edge slivers plus a count against 3,000; draws `session.hopperCards(reader)` — the LOADED deck, never the parsed one (§7.1). |
| `src/ui/period/reader/stackerView.ts` | new | 3 | ~120 | Five radial pockets, `pocketCounts` carried from `readerView.ts:29-34` with its comment. |
| `src/ui/period/reader/keysView.ts` | new | 3 | ~130 | Fig.60's strip in published order: keys PUNCH START, PUNCH STOP (inert); twelve lights; keys END OF FILE, READER STOP (inert — no façade call exists), READER START. Exports `KEY_LABELS` and `LIGHT_LABELS` so the no-LOAD-key assertion reads the drawn strings, and `LIT_CONSTANTS` — the one light drawn lit because the machine is on, **POWER** (§15 `POWER_AND_READY_ARE_DRAWN_LIT`), captioned on the view as a constant and asserted by `test/period-reader.test.ts`. Creates no node at import time — `cardFaceView.ts`'s rule, and it binds here too because a node test imports this file's label tables. |
| `src/ui/period/reader/cardFaceView.ts` | new | 3 | ~110 | `renderCardFace(card, caption, scale)` over `cardGeometry.ts` — the read-buffer card, the deck-box faces and the object-deck faces are one function at three scales. Captions name the deck (§7.1). **It also exports `CARD_CAPTIONS`, the five caption templates of §7.1's table, as DATA, and creates no node at import time** — that is a rule of this file, not an accident: it is what lets `test/period-reader.test.ts` import the export and assert the five templates in a `node` run without instantiating the view. WHICH template a station passes is criterion 19's eye check. |
| `src/ui/period/reader/deckBoxView.ts` | new | 3 | ~160 | `deckBox.ts` restyled: `LEGEND`, `RECONSTRUCTION`, `refresh`, `setText`, the `put.disabled` rule survive. `findAlterBox()` (`deckBox.ts:45-55`) and the copy-and-paste fallback (`:131-137`) are DELETED; `key the bootstrap` becomes a typed `keyBootstrap(text, marks)` into the console session (§6.4, §9.4). |
| `src/ui/period/reader/mount.ts` | new | 3 | ~100 | `mountReader(machine, host, hooks: { run(): void; halt(): void; kick(): void })`, `unitrecord/mount.ts` rewritten for the new view list. **The `gated: Session` wrapper survives VERBATIM; the `dirty` / `kick` gate does not stay here** — `mount.ts:28-37`'s `let dirty` / `const kick` MOVE to `src/ui/main.ts` (§10.2), and every view that took `kick` now takes `hooks.kick`. **No `requestAnimationFrame` here.** In wave 3 it still constructs `../unitrecord/inquiryView.js` and the wave-2 printer views (§10.7). |
| `src/ui/period/unitrecord/{cardView,readerView,deckBox,mount}.ts` | delete | 3 | 127 · 97 · 171 · 94 | Replaced by the five reader views and `reader/mount.ts`, same commit. `unitrecord/session.ts` and `unitrecord/inquiryView.ts` STAY. |
| `src/ui/period/autocoder/objectDeckView.ts` | edit | 3 | ±3 | **RULE 2, and it is not the mount's**: this file imports the `cardView.ts` the row above deletes. `import { renderCard } from '../unitrecord/cardView.js'` (`:17`) becomes `import { renderCardFace } from '../reader/cardFaceView.js'`, and **there are TWO call sites, not one** — `:53`, the condensed card, takes the caption `object deck, card N`, and `:64`, the execute card, takes `execute card — E in column 1` (§7.1's table). One import plus two three-argument calls = ±3. Same commit as the deletion. |
| `src/ui/period/autocoder/mount.ts` | edit | 3 | ±1 | RULE 2 likewise: `import type { DeckBox } from '../unitrecord/deckBox.js'` becomes `from '../reader/deckBoxView.js'`, which exports the same `DeckBox = { readonly el: HTMLElement; setText(text: string): void }` type name (`deckBox.ts:69`). Same commit as the deletion. |
| `src/ui/main.ts` | edit | 3 | ±8 | `mountUnitRecord` becomes `mountReader`; `reader/mount.ts` now returns `View[]`, so the frame's render loop and the `dirty` / `kick` gate move here from the mount (§10.2's wave table, §10.7). |
| `test/period-reader.test.ts` | new | 3 | ~200 | Hopper depth, read-buffer card and five pocket counts through the UNCHANGED `unitrecord/session.ts` after real reads; the loaded-deck freeze re-proved against `hopperView`'s input; the no-LOAD-key string absence. **It does not instantiate `cardFaceView`** — the golden is wave 1's, asserted through `cardGeometry.ts` alone (§13 criterion 13). |
| `src/ui/period/console/session.ts` | new | 4 | ~140 | `PeriodMode`, `ROTARY_ANGLE`, `RotaryTurn`, `turnTo`, `ConsoleKeyboard`, `ConsoleSession` (§4.6, §4.7, §4.8, §6.2-§6.6). DOM-free; the ONE place `machine.setMode` is reachable from the period surface. |
| `src/ui/period/console/lamps.ts` | new | 4 | ~140 | `Lamp`, `PANEL_BOXES`, `OMITTED_LAMPS`, `lampsOf` (§4.9, §8). DOM-free. |
| `src/ui/period/console/logView.ts` | new | 4 | ~200 | The pin-feed Selectric form: `renderSelectric` at `{matrix:'indent', marks:'render', spacing:'render'}`, the pending row for an entry in progress, the 80-position rule, scroll-to-latest only when the log grew. |
| `src/ui/period/console/rotaryView.ts` | new | 4 | ~190 | The six-detent rotary at `ROTARY_ANGLE`, snapping, its six labels at their Fig.47 clock positions, `turnTo` wired to the façade; the C.E. door drawn closed. |
| `src/ui/period/console/keysView.ts` | new | 4 | ~170 | START / STOP / PROGRAM RESET on the lower shelf and COMPUTER RESET in the power/control cluster (console-and-physical.md §3, A22-0526-3 Fig.47 p.49); **the three power keys console-and-physical.md §3 publishes — POWER ON (illuminated), POWER OFF, DC OFF — plus EMERGENCY OFF, all four drawn INERT** (§3 `[verified]`, never wired), **and the separate READY light**. Exports `CONSOLE_KEYS` / `CONSOLE_LIGHTS` as label arrays and `LIT_CONSTANTS` as the two drawn lit because the machine is on — the POWER ON key and READY (§15 `POWER_AND_READY_ARE_DRAWN_LIT`) — both captioned on the view as constants and asserted as drawn strings by `test/period-console.test.ts`. Creates no node at import time — `cardFaceView.ts`'s rule, and it binds here too because a node test imports this file's label tables. |
| `src/ui/period/console/keyboardView.ts` | new | 4 | ~200 | **The Fig.43 keyboard and the focus region** — the one file in the phase that binds `keydown`, on its own `tabindex="0"` element and never on `document` (§6.5, critic item 1). Draws the key tops Fig.43 gives, with the dual-legend caption; the WORD MARK key; the lock state visible. |
| `src/ui/period/console/inquiryView.ts` | new | 4 | ~90 | The three repurposed levers — INQUIRY REQUEST (tall, right), INQUIRY RELEASE, INQ CAN — and the request lamp, wired to `ConsoleSession.request / release / cancel`. |
| `src/ui/period/console/lightsView.ts` | new | 4 | ~160 | The §5 panel from `PANEL_BOXES`, the REDUCED label, the not-modelled legend, one lens colour; refuses the 1401 red-fault convention in its header. |
| `src/ui/period/console/mount.ts` | new | 4 | ~90 | Builds the desk's console station from the seven views above and one `ConsoleSession`; returns `{ el, views, session }` — `mountConsole(machine, host, hooks: { run(): void; halt(): void; kick(): void })`, the same `hooks` shape `mountReader` takes. **It is the ONE caller of `createConsoleSession(machine, { run: hooks.run, halt: hooks.halt, focus })`**: `run` and `halt` arrive from `src/ui/main.ts` down the mount chain's `hooks`, and `focus` is this mount's own — the `.focus()` on the keyboard wrapper `console/keyboardView.ts` returns (§4.8, §6.5 ruling 5). Transitional caller in wave 4 is `reader/mount.ts`; wave 5's `period/mount.ts` takes it over (§10.7). |
| `src/ui/period/unitrecord/inquiryView.ts` | delete | 4 | 83 | Replaced by `console/keyboardView.ts` + `console/inquiryView.ts`, same commit. |
| `src/ui/period/reader/mount.ts` | edit | 4 | ±8 | Same commit as the deletion (RULE 2): stop constructing `inquiryView`; construct `console/mount.ts`'s station, handing it the same `hooks` bundle `mountReader` took, and return the station's `ConsoleSession` alongside the `View[]`. |
| `src/ui/main.ts` | edit | 4 | ±6 | Takes `consoleSession` from `reader/mount.ts`'s return and adds the `held` and `detent` terms to the frame's execute gate (§10.2's wave table, §10.7). |
| `src/ui/internals/mount.ts` | edit | 4 | +6 | The live MODE label above `controls.el`, reading `machine.mode` on every redraw (§10.4). Phase 4's own DOM; `controls.ts` untouched. |
| `test/period-is-dom-free.test.ts` | edit (append) | 4 | +2 cases | **The phase's ONE sanctioned test-file append** (§11 ownership note 1): required-path cases for `console/session.ts` and `console/lamps.ts`, which land this wave. It adds cases and edits nothing — the Phase-5 `test/rpg-is-dom-free.test.ts` skip-then-required-path shape (`:75-81`). |
| `test/period-console.test.ts` | new | 4 | ~210 | `turnTo` over all 30 ordered pairs on a real machine; the display/alter dialogue keyed one character at a time; `take()` against the frozen `keyed()` on a corpus; the inquiry hold engaging and clearing without a read. |
| `test/period-light-panel-vs-research.test.ts` | new | 4 | ~145 | `PANEL_BOXES` diffed field by field in both directions against console-and-physical.md §5's markdown table modulo `OMITTED_LAMPS`; every non-null `source` names a `MachineState` field; STATUS immediately right of ARITH; the CH1 overlap pair and PRIORITY ALERT absent from `PANEL_BOXES` and present in `OMITTED_LAMPS`. |
| `test/period-keydown-ownership.test.ts` | new | 4 | ~40 | Critic item 1 made mechanical, in TWO cases: under `src/ui/period/**`, `addEventListener('keydown'` and `addEventListener('keypress'` appear ONLY in `console/keyboardView.ts`, and `document.addEventListener(` / `window.addEventListener(` appear nowhere; **and `.press(` appears only under `src/ui/period/console/**`**, which is what makes §6.5 ruling 3's caller set an assertion rather than a claim. |
| `docs/screenshots/phase-4/wave-2-1403.png` | new (binary) | 2 | — | RULE 4's per-wave screenshot: the 1403 station at wave 2's HEAD, committed with the wave and referenced from `docs/BUILD-LOG-4.md` by relative path (§11.3, §16 item 7). |
| `docs/screenshots/phase-4/wave-3-1402.png` | new (binary) | 3 | — | The 1402 station and one card face, same protocol. |
| `docs/screenshots/phase-4/wave-4-1415.png` | new (binary) | 4 | — | The console desk and the light panel, same protocol. |

**Post-move note for waves 2-4.** `unitrecord/session.ts` is read by `reader/mount.ts` at
`'../unitrecord/session.js'`; `autocoder/session.ts` and `rpg/session.ts` are read by the wave-5
stations at `'../autocoder/session.js'` and `'../rpg/session.js'`. The three session files never
move again after wave 0, which is what keeps the four test import lines of §3.1 at one edit each
for the whole phase.

### 3.4 Wave 5 — the desk, the stylesheet, and the two authoring stations

| Path | Action | Lines | Owns / must not touch |
|---|---|---|---|
| `src/ui/period/desk.ts` | new | ~150 | The station layout in paper order — SPEC SHEET, CODING SHEET, 1402, 1415, 1403 — as one function from station elements to the machine-room grid, so the CSS grid areas and the mount order cannot disagree (§10.1). |
| `src/ui/period/mount.ts` | new | ~120 | `mountPeriod(machine, host, hooks: { run(): void; halt(): void; kick(): void })`, `host` being `main.ts`'s `<div id="machine-room">`: constructs every station, hands the `hooks` bundle down to `console/mount.ts` (which adds its own `focus`, §4.8), wires the two typed hand-offs across the desk (`specs → coding` `setText(source, dataCards)`; `coding → reader` `setText(text)`), returns the `View[]` the page frame renders and the `ConsoleSession` the frame holds on. |
| `src/ui/period/session.ts` | new | ~90 | `PeriodViewState` and its pure transitions (§4.10). DOM-free. |
| `src/ui/styles/period.css` | fill (created as a stub in wave 0) | ~5 → ~640 | **SOLE OWNER OF ITS CONTENT.** Wave 0 created the file with a five-line header comment so `main.ts`'s import resolves under `vite build` (§3.1, §10.3); this wave writes all of it. Colour, type, spacing and the two paper textures; the custom properties §15 names; NO number that matters (§10.3). Every rule scoped under `#machine-room` or a `.period-*` class; no bare element selector. |
| `src/ui/period/coding/{sheetView,listingView,objectDeckView,mount}.ts` | move + edit | 161→~190 · 110→~130 · 70→~90 · 85→~90 | `git mv` from `period/autocoder/{sourceBox,listingView,objectDeckView,mount}.ts`, then restyled: `FRAMING`, `PLUS_NOTE`, `ruler()`, `columnLegend()`, both textareas, `setText`, `invalidateArtifacts` and the `punch.disabled` rule ALL survive; the sample button splits in two; the C28-0326-2 §12 heading is added around the `<pre>`; the A/H toggle calls the shared `restrike()`; the mount reads `session.stale` (§9). Their `make` is **already on `dom.ts` since wave 0** — no cross-surface import swap is left for this wave, which is why §3.8's count of two cross-surface imports is true throughout. |
| `src/ui/period/autocoder/session.ts` | edit | +16 | `readonly stale: boolean`, set by `setSource` / `setDataText`, cleared by `assemble()`; `hopperText()` returns `''` while stale (§9.3). The only edit to a Phase-3 session body in the phase, and §14 R8 costs it. |
| `src/ui/period/specs/{sheetView,resultView,mount}.ts` | move + edit | 104→~130 · 70→~90 · 59→~75 | `git mv` from `period/rpg/{specBox,resultView,mount}.ts`, then restyled: the per-sheet ruler, `sheetOf`, `activeLine`, the five listeners and the hand-off survive; a period header band is drawn around the box. Their `make` is **already on `dom.ts` since wave 0** — no cross-surface import swap is left for this wave. **Two intra-wave specifier edits ride in the move commit, both required by typecheck:** `specs/mount.ts` repoints its `type { SourceBox }` import (`rpg/mount.ts:6`) at `'../coding/sheetView.js'`, and `coding/mount.ts` repoints `'./sourceBox.js'` at `'./sheetView.js'`. |
| `src/ui/period/reader/mount.ts` | edit | −12 | Narrowed to the reader station only; the printer and console constructions it carried since waves 2 and 4 move to `period/mount.ts`, same commit. |
| `src/ui/main.ts` | edit | ±10 | The three transitional period mounts become one `mountPeriod(...)` call; `mountInternals(...)` stays. |
| `test/period-is-dom-free.test.ts` | edit (append) | +1 case | The last of the phase's three appends to this ONE file (§11 ownership note 1): the required-path case for `period/session.ts`, which lands this wave. Eleven required paths from here on. |
| `test/period-session.test.ts` | new | ~150 | `PeriodViewState` transitions; the `stale` rule in node; the CSS lint of §10.3 (no `@import`, `@font-face`, `url(http`, pixel width on a form or card selector, bare element selector). |
| `test/period-css-covers-every-class.test.ts` | new | ~85 | Every class literal in `src/ui/**/*.ts` has a rule in `period.css` or in `index.html`'s scoped block, and every rule's class is referenced (§10.3). |
| `test/period-no-second-frame-loop.test.ts` | new | ~45 | `requestAnimationFrame(` appears in exactly ONE file under `src/ui/**`, `src/ui/main.ts`, named (§10.2). |
| `test/period-refusal-grep.test.ts` | new | ~60 | **The carrying file for exit criterion 18a**, tier T0: §12's refusal-token grep over DRAWN LABELS under `src/ui/period/**` — exported label tables, `text()` arguments, `aria-label`s — plus the time-unit tokens, and the whitelist by **file + line + citation**, a whitelist entry with no citation failing the test (§13 criterion 18a). The "defined grep" mechanism `test/rpg-columns-is-the-only-place.test.ts` already ships. |
| `docs/screenshots/phase-4/wave-5-desk-both-tabs.png` | new (binary) | — | RULE 4's last per-wave screenshot: the whole desk **in both tabs**, committed with the wave and referenced from `docs/BUILD-LOG-4.md` by relative path (§11.3, §16 item 7). |

### 3.5 Wave 6 — the storyboard and the documents

| Path | Action | Lines | Owns |
|---|---|---|---|
| `test/tier4-period-storyboard.test.ts` | new | ~240 | §1 headless, end to end, joining `npm run smoke` (§11 wave 6, §13 criterion 16). |
| `PHASE-4-NOTES.md` | new | ~300 | §16 item 8's four sections. |
| `docs/BUILD-LOG-4.md` | edit | closeout | Wave 6's section, the per-wave screenshot record, criterion 19's human walk by name and date. |
| `docs/research/open-questions.md` | edit | dated section completed | Every §15 row present; the `INQUIRY_ENTRY_IS_PRE_SUPPLIED` wording amended (§6.6). |
| `docs/DECISIONS.md` | edit | top block | By the orchestrator at merge, never by a wave's edit (§3.7). Line 11 `[proposed]` → `[settled]` with the dependency list and the one config line; the Phase 4 rulings of §16 item 9; the build-provenance `[open]` item closed with Tom's Fable/Opus answer — about 20 lines, and the orchestrator is who writes them. |
| `docs/STATUS.md` | edit | top entry | By the orchestrator at merge, never by a wave (§3.7). |

### 3.6 Reuse-verbatim rows, each with its reason

| Path | Lines | Why it is not touched |
|---|---|---|
| `src/ui/internals/controls.ts` | 156 | SHA-256 `a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f`, pinned in `test/ui-controls-verbatim.test.ts` and §13 criterion 3. Its exported `keyed()` is imported by `console/session.ts` so there is ONE `^` parser in the project (`ConsoleKeyboard.take()` is asserted against it, §11 wave 4). architecture.md §6: "Phase 4 reuses these controls verbatim". |
| `src/ui/internals/panel.ts` | 165 | Deliberately NOT refactored beyond wave 1's sixteen-line renderer fold: extracting its `make()` into a shared module would edit `controls.ts`'s import line and break verbatim on day one. The period surface gets its own `dom.ts` instead, from wave 0. |
| `src/ui/internals/coreView.ts` · `registerView.ts` | 58 · 41 | Zero lines; criterion 3's `--numstat` covers both. |
| `src/ui/period/unitrecord/session.ts` | 78 | Body frozen for the phase — `test/session.test.ts` passing with one import line changed is the proof. Its loaded-deck freeze (`:40-46`) is what §7.1's hopper draws from. |
| `src/ui/period/rpg/session.ts` | 55 | Body frozen; `test/rpg-is-dom-free.test.ts`'s required path and `test/tier4-rpg-demo.test.ts`'s driver. |
| `tools/run-cor.ts` | — | Its `renderConsoleLine` (lines 43-49) has NO `spacingBefore` clause; folding it into `renderSelectric` would put blank lines into the cc01 transcript, and cc01 byte-identity is a per-commit gate. Explicitly not folded. |
| `src/core/**` · `src/asm/**` · `src/rpg/**` · `src/formats/**` · `tools/**` · `demos/**` · every file under `test/golden/` except the one wave 1 adds | — | §13 criterion 4's `git diff --stat` is empty over all of them at every commit. |

### 3.7 Do not touch

`src/core/**` · `src/asm/**` · `src/rpg/**` · `src/formats/**` · `tools/**` · `demos/**` ·
`test/golden/{hello-dad.page.txt, hello-dad.lst, sales-summary.page.txt, sales-summary.lst,
cycle-probe.page.txt, card-list.page.txt}` · `src/ui/internals/{controls,coreView,registerView}.ts`
· `src/ui/internals/panel.ts` beyond §3.2's stated fold · every existing test file beyond the four
one-line import edits of §3.1 · `docs/research/*.md` outside the dated Phase 4 section of
`open-questions.md` · `docs/plans/*.md` except this one, which the arrival commit adds and no wave
edits · `docs/BUILD-LOG.md`, `-1B`, `-2`, `-3`, `-5` · `PHASE-{1,1B,2,3,5}-NOTES.md` · `CLAUDE.md` ·
`docs/STATUS.md` and `docs/DECISIONS.md`, which are the orchestrator's at merge (the Phase 2 / 3 /
5 precedent) · `package.json` — **no script and no dependency is added in this phase**.

**A research correction discovered mid-build escalates to the orchestrator with its own commit** —
the Phase-1b, Phase-3 and Phase-5 precedent — and never edits `docs/research/console-and-physical.md`
in a build wave. Wave 0's bounded read writes findings to `open-questions.md`'s dated section and to
`docs/BUILD-LOG-4.md`, nowhere else.

### 3.8 The DOM-free guarantee, and the two cross-surface imports

`test/period-is-dom-free.test.ts` applies `test/core-is-dom-free.test.ts`'s regex set
(`:14-20`) — code shapes, not English words, because that file's own header records what banning
words cost — **EXTENDED by three patterns the core set does not match**: `/\bSVGElement\b/` (the
core alternation requires `HTML…`, `Element` or `Node` immediately after the `:`),
`/\brequestAnimationFrame\(/` and `/\baddEventListener\(/`, which are exactly what §10.2's one-frame
rule and §6.5's focus rule need forbidden inside the DOM-free set.

**The required-path list GROWS WITH THE WAVES, and it is the one Phase-4 test file a later wave
appends to** (§11's ownership note 1), each path with its own case so a future move cannot silently
drop one. **Eight at wave 1**: `period/paper/page.ts`, `paper/carriage.ts`, `paper/chain.ts`,
`paper/cardGeometry.ts`, `console/selectric.ts` — the five modules wave 1 lands — plus the three
moved block sessions `unitrecord/session.ts`, `autocoder/session.ts` and `rpg/session.ts`, which
exist from wave 0. **Wave 4 appends two**, `console/session.ts` and `console/lamps.ts`; **wave 5
appends one**, `period/session.ts`: **eleven at wave 5**. A required-path case for a file a later
wave writes would be red from the wave that wrote it until the wave that lands the file, which is
RULE 1 read literally. The three moved sessions keep their existing guarantees as well —
`unitrecord/session.ts` by `test/session.test.ts`, `rpg/session.ts` by
`test/rpg-is-dom-free.test.ts`'s required path, `autocoder/session.ts` by
`test/tier4-autocoder-demo.test.ts` — so the guarantee is stated in one place rather than inferred
from three.

**Exactly two imports cross the surface boundary, both pure functions, both named here and in
§14 R9 — and the count is true FROM WAVE 0, not only at wave 5.** Period → internals: `keyed` from
`internals/controls.ts`, the one sanctioned cross-surface import — **and its importer MOVES**:
`unitrecord/inquiryView.ts:15` from wave 0 until wave 4 deletes that file (§3.3), after which it is
`console/session.ts` (§3.6). The test asserts the MODULE by name, not the importer, so the move
costs it nothing. Internals → period: `renderSelectric` from `period/console/selectric.ts` (wave
1's fold). The
thirteen `make` / `cell` / `row` / `table` / `View` imports the moved files carry today are pointed
at `period/dom.ts` **in the wave-0 commit itself** (§3.1's seventh rewrite) — an import-specifier
change, so wave 0's identity oracle still passes, and without it there would be FOURTEEN
cross-surface imports at wave 0's close and wave 1's own test would fail on the day it was written.
`test/period-is-dom-free.test.ts` carries the import case in this form: every import under
`src/ui/period/**` is relative and resolves inside `src/ui/period`, `src/core`, `src/formats`,
`src/asm`, `src/rpg` **or `demos`**, **with the one exception `src/ui/internals/controls.js`,
asserted by name**; and nothing in `src/ui/internals/**` imports from `src/ui/period/**` except the
fold. **`demos` is one of the allowed roots because the five Vite `?raw` sample imports resolve
there** — `deckBox.ts:14`, `sourceBox.ts:19-20`, `specBox.ts:8-9` (§10.6 item 1) — and a
`demos/*?raw` import is a BUILD INPUT, not a cross-surface reach; none of the eight (later eleven)
required-path files imports from `demos/` at all, so the guarantee loses nothing by naming it. The
two surfaces are "visually foreign to each other on purpose" and a shared DOM helper is how that
stops being true.

### 3.9 Totals, added up rather than estimated separately

New source, waves 0-5 (the file rows above, `src/` only, no tests, no CSS): 275 + 610 + 510 + 770
+ 1,380 + 360 = **~3,905 lines in 30 new files** (wave 0 is 275 rather than 260 because
`internals/mount.ts` is ~70 and not ~55 — it returns a `View`, §10.2's `mountInternals`
paragraph). Restyled (moved then
edited): the seven authoring-station files, 659 lines today → ~795, plus the RULE-2 importer edits
of waves 3 and 4 (§11.2) and `src/ui/main.ts` in waves 3, 4 and 5.
Deleted: 804 lines in ten files (`printerView`
156, `cardView` 127, `readerView` 97, `deckBox` 171, `unitrecord/mount` 94, `inquiryView` 83,
`internals/main` 54, three shims 22). CSS: 640 in wave 5, over wave 0's 5-line stub. Tests: 45 + 895 + 200 + 200 + 395 + 340 + 240 =
**2,315 lines in 17 files**, sixteen in `npm test` and one in `npm run smoke`. Zero new
dependencies. **These totals correct the dossier's bullet 7** ("~2,300 new + ~1,600 restyled"),
whose wave headlines did not sum to its own file list; §14 R1 carries the size as a named risk
and R13 the relief valve.

---

## 4. The load-bearing types

**Placement.** `src/core/types.ts` states the rule: *a boundary type lives in `src/core/types.ts`
only if something inside `src/core` names it.* Nothing in core, `src/asm`, `src/rpg` or
`src/formats` names one type below — §13 criterion 4's `git diff --stat` over those four trees is
empty at every commit — so all ten live under `src/ui/period/`, as **ten type blocks in eight
files** — §4.6, §4.7 and §4.8 are three blocks in one file, `console/session.ts`.
`PrintLine`, `CarriageState`,
`ConsoleLine`, `MachineState`, `Card`, `PrintChain`, `CarriageTape`, `ConsoleMode` and
`InquiryEntry` are **IMPORTED, never redefined, extended or forked** (`architecture.md` §2 B4).

**The DOM-free rule, literal for all eight files.** Every file below is on
`test/period-is-dom-free.test.ts`'s required-path list (§3.8, one case per path), which applies
`test/core-is-dom-free.test.ts`'s regex set (`:14-20`) — code shapes, not English words, because
that file's header records what banning words cost — **EXTENDED by the three patterns that set does
not match**: `SVGElement`, `requestAnimationFrame(` and `addEventListener(`. So the extended set
bans `require(`, `process.`, `window.`, `document.`, `globalThis`, `self.`, the `location`
accessors, `fetch(`, `setTimeout(`, `setInterval(`, `localStorage`, `navigator.`,
`new XMLHttpRequest`, a `: HTMLxxxElement` / `Element` / `Node` annotation, **`SVGElement`,
`requestAnimationFrame(` and `addEventListener(`** — **and no DOM global appears in any of the
eight files**, while every `*View.ts` that consumes them computes nothing: bullet 1 as a
compiler-checkable property, and what makes hand-drawn SVG gateable in node without jsdom
(§10.6, §12). **The same test's import case allows one root beyond the four `src/` trees —
`demos`** — because the five Vite `?raw` sample imports resolve there (§3.8, §10.6 item 1); a
`demos/*?raw` import is a build input rather than a cross-surface reach, and no file below imports
from it, so naming it costs the guarantee nothing.

**Files and waves.** Each block's banner names its post-move path (§3) and the wave that lands it:
the four `paper/` modules and `console/selectric.ts` in wave 1, `console/session.ts` and
`console/lamps.ts` in wave 4, `period/session.ts` in wave 5. **The required-path list is written to
match**: wave 1's eight paths are its own five plus the three moved `session.ts` files, and waves 4
and 5 APPEND their own cases (§3.8, §11's ownership note 1) — a required-path case cannot name a
file a later wave writes.

### 4.1 `FormPage` / `paginate` / `trimRule3` — the form is physical

```ts
// ═══ src/ui/period/paper/page.ts · WAVE 1 ═══ imports PrintLine + CarriageState from types.js and
// NOTHING from printer1403.ts — PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR (§15) is an import-shape
// assertion, and it is what makes §5.1's cross-check an oracle rather than a tautology. Core
// ALREADY declares PRINT_POSITIONS (printer1403.ts:43); this copy is deliberately independent,
// because page.ts may not import that file at all — test/period-page.test.ts imports CORE's and
// asserts the two agree, which is what makes the 132 a check rather than a restatement.
import type { CarriageState, PrintLine } from '../../../core/types.js';
/** 132 print positions at 10 cpi, Model 2 — moved here from printerView.ts:28 with its comment, so
 *  the one number the form is measured in lives in a file that cannot touch a DOM node (§7.2). */
export const PRINT_POSITIONS = 132;
export interface FormPage {
  readonly form: number;              // 1-based; identical to PrintLine.page
  readonly lines: readonly string[];  // EXACTLY formLines entries, blanks included, in order, and
                                      // each EXACTLY PRINT_POSITIONS characters — padded, never
                                      // sliced: a PrintLine.text is already <= 132 by the device
                                      // (printer1403.ts:498 sets WLR above PRINT_POSITIONS)
  readonly complete: boolean;         // false ONLY for the form the carriage is on
  readonly printedThrough: number;    // highest position a PrintLine occupies here; 0 if none
}
export function paginate(paper: readonly PrintLine[], carriage: CarriageState,
  formLines: number): readonly FormPage[];
/** One form's BODY as renderGreenBar renders it: rule 2's stop at `printedThrough`, rule 3's
 *  per-line trailing-blank trim — which is what makes the 132-character padding invisible to
 *  §5.1's identity — and rule 5's `\n` on every line. */
export function trimRule3(page: FormPage): string;
```

A form is **physical**: 66 line positions whether or not they printed, which is what a stack you
scroll back through is made of. The two renderers answer different questions about one paper and the
plan keeps them apart — **`renderGreenBar` is a diff artefact** (no trailing blanks, stop at the last
ink), **`paginate` is a sheet of paper** (the blanks are where the carriage went). §5.1 states the
identity that ties them; §14 R10 carries the risk of collapsing one into the other. `paginate` throws
on two `PrintLine`s at one `page:line` in `renderGreenBar`'s message shape (`printer1403.ts:726`).

**`printedThrough` is this plan's fourth member beyond the dossier's three**, and it is not redundant: recomputing it inside `trimRule3` by scanning `lines` for a non-blank entry gets `L_WRITE_WORD_MARKS_PRINTS_A_BLANK_LINE` (`printer1403.ts:309-326`) wrong — that rule puts a `PrintLine` of 132 blanks on the paper, which `renderGreenBar` counts as printed and a blank scan would not. Without the field, §5.1's identity cannot be written down.

### 4.2 `FormPosition` / `TapePunch` / `traversed` / `straddled` / `STRADDLE_BANNER`

```ts
// ═══ src/ui/period/paper/carriage.ts · WAVE 1 ═══ CarriageTape is a TYPE-ONLY import: it reads a
// tape's punching and can never reach Printer1403.senseChannels — the divergence it DRAWS (§15).
import type { CarriageTape } from '../../../core/devices/printer1403.js';
export interface FormPosition { readonly form: number; readonly line: number }
export interface TapePunch   { readonly line: number; readonly channel: number }
/** Every position the carriage occupied getting from `from` to `to` — EXCLUSIVE of `from`,
 *  INCLUSIVE of `to`, one entry per `advanceOneLine` (printer1403.ts:632-639's wrap rule). Throws
 *  past `formLines` advances: a motion no Printer1403 can make, since `skipToChannel` is bounded
 *  at one full form (printer1403.ts:655-657). */
export function traversed(from: FormPosition, to: FormPosition,
  formLines: number): readonly FormPosition[];
/** The punches the motion CROSSED and did not end on — `traversed(...)` less its last entry,
 *  matched against `tape.punches` by LINE, because one loop of tape runs past the brushes once per
 *  form. §5.2 writes out how a caller gets `from` and `to`. */
export function straddled(from: FormPosition, to: FormPosition,
  tape: CarriageTape): readonly TapePunch[];
/** Asserted VERBATIM in test/period-printer.test.ts (§13 criterion 9), so a later silent "fix" to
 *  the carriage model fails a test instead of deleting a caption. */
export const STRADDLE_BANNER = (p: TapePunch): string =>
  `channel ${p.channel} at line ${p.line} passed unsensed — `
  + 'CARRIAGE_SENSES_AT_DESTINATION_ONLY (src/core/devices/printer1403.ts:354)';
```

The one thing `MachineState.printer.carriage` cannot tell a view is **where the carriage has been**:
`snapshot().printer` is `{ carriage, paper }` (`machine.ts:496`) — a destination and a paper, never a
motion history. Those two recover enough of it to draw the divergence, with zero core lines.

### 4.3 `CHAIN_DUALS` / `restrike` — the A/H switch with no core change

```ts
// ═══ src/ui/period/paper/chain.ts · WAVE 1 ═══
import type { PrintChain } from '../../../core/devices/printer1403.js';
/** The FIVE dualed code points, and there are exactly five — charset.md §5 [verified]
 *  (A22-0526-3 pp.6-7 Fig.2; GA24-3073 p.27). [A-glyph, H-glyph], in the research table's order;
 *  Hollerith/BCD/octal are 12/BA/60, 12-4-8/BA84/74, 0-4-8/A84/34, 3-8/821/13, 4-8/84/14. */
export const CHAIN_DUALS: readonly (readonly [a: string, h: string])[] =
  [['&', '+'], ['⌑', ')'], ['%', '('], ['#', '='], ['@', "'"]];
/** PRINTED GLYPHS IN, PRINTED GLYPHS OUT — never BCD, so it composes with nothing in src/core and
 *  no second chain table exists under src/ui/** (§13 criterion 12's grep). */
export function restrike(text: string, chain: PrintChain): string;
```

`Printer1403.chain` is `readonly` (`printer1403.ts:366`) and set in the constructor (`:382`), which
is what makes the alternative a **core change**: `MachineOptions.printer?: { chain?; tape? }` into
`new Printer1403(...)`, ~4 lines plus a machine rebuild per toggle. Refused in §15
`H_CHAIN_IS_A_FIVE_GLYPH_RESTRIKE_OF_THE_A_PAGE`; §5.3 carries the proof obligation.

### 4.4 `CardGeometry` / `CARD_GEOMETRY` / `holePath` / `outlinePath` / `bandGlyphs`

```ts
// ═══ src/ui/period/paper/cardGeometry.ts · WAVE 1 ═══ from cardView.ts:32-45 (§3.2) plus the two
// helpers at :47-53, with their comments. Hundredths of an inch throughout, so the viewBox IS the
// card and the face scales with its CSS width. punchMask and glyphOf are the only imports.
import { glyphOf } from '../../../core/bcd.js';
import { CARD_COLUMNS, type Card } from '../../../core/types.js';
import { punchMask } from '../../../formats/card.js';
export interface CardGeometry {
  readonly cardW: number; readonly cardH: number;        // 737.5 × 325 — 7 3/8 × 3 1/4 in
  readonly colPitch: number; readonly rowPitch: number;  // 8.7 · 25
  readonly holeW: number; readonly holeH: number;        // 5.5 × 12.5
  readonly bandH: number; readonly cornerCut: number;    // 18.75 top 3/16 in · 25, upper LEFT
  readonly side: number;                                 // (cardW − 80·colPitch)/2 = 20.75
  readonly columns: 80; readonly rows: 12;
}
export const CARD_GEOMETRY: CardGeometry;
/** `punched === true` gives the holes the card carries, `false` every unpunched position drawn
 *  faint so the pattern reads. DERIVED FROM punchMask — §5.4. */
export function holePath(card: Card, punched: boolean): string;
/** The outline WITH its corner cut — a path, not a border, or the cut is lost (cardView.ts:78). */
export function outlinePath(g?: CardGeometry): string;
/** Every text run on the face: characters plus ONE x per character, because SVG anchors each chunk
 *  on its own coordinate. Four runs — the interpretation band (glyphOf's 64), the column-number row
 *  under card row 0, the row under card row 9, the rotated "IBM" in the left margin. */
export interface FaceText {
  readonly chars: string; readonly x: readonly number[];
  readonly y: number; readonly size: number; readonly rotate?: number;
}
export function bandGlyphs(card: Card): readonly FaceText[];
```

`outlinePath` and the widening of `bandGlyphs` past the band itself are **this plan's own** — the
dossier names both and specifies neither. The widening keeps the DOM-free rule literal: the two
column-number rows sit in the clear gap under their hole row (`cardView.ts:50-53`) and the "IBM"
legend in the left margin, and all three are arithmetic. Left in `cardFaceView.ts` they would put
numbers in a file that touches the DOM and quietly retire bullet 1. §5.4 tags every row of the
table.

### 4.5 `SelectricCell` / `SelectricLine` / `SelectricOpts` / `toSelectric` / `renderSelectric`

```ts
// ═══ src/ui/period/console/selectric.ts · WAVE 1 ═══ imports ConsoleLine as a type, nothing else.
// Consumed by BOTH surfaces — period console/logView.ts and internals/panel.ts — and is one of the
// phase's two cross-surface imports, the other being `keyed` travelling the other way (§3.8).
// The two combining-mark constants arrive from panel.ts:65-66 WITH the four-line comment at
// panel.ts:61-64 that is their only in-code citation (research/console-and-physical.md §2,
// A22-0526-3 p.49; S223-2648 p.6): wave 1's fold MOVES that citation here rather than deleting it
// with the block (§3.2, §6.1, §16 item 1).
import type { ConsoleLine } from '../../../core/types.js';
export interface SelectricCell {
  readonly glyph: string; readonly wordMark: boolean; readonly underline: boolean;
}
export interface SelectricLine {
  readonly id: ConsoleLine['id'];        // 'S'|'C'|'E'|'B'|'#'|'D'|'A'|'I'|'R'|null
  readonly blankBefore: boolean;         // from spacingBefore === 'double'
  readonly column: 30 | 35;              // from matrixPos
  readonly cells: readonly SelectricCell[];
}
/** THE PHASE'S WHOLE ORACLE DISCIPLINE IN ONE SIGNATURE — §6.1 argues each switch. */
export interface SelectricOpts {
  readonly matrix: 'indent' | 'flush';   // 'indent' = matrixPos − 30 leading spaces
  readonly marks: 'render' | 'strip';    // U+030C over a word mark, U+0332 under bad parity
  readonly spacing: 'render' | 'ignore'; // a blank line before a double-spaced line
}
export function toSelectric(lines: readonly ConsoleLine[]): readonly SelectricLine[];
export function renderSelectric(lines: readonly ConsoleLine[], opts: SelectricOpts): string;
```

`ConsoleLine` already carries `matrixPos` and `spacingBefore` (`types.ts:398-399`) and `panel.ts`
ignores the first. Figure 42 / S223-2648 Fig.5 p.9 put S/C/E/B/`#`/D-address at **35** and
D-data/A/I/R at **30**, and that five-column step is the visual signature of a 1410 job log. Its
ORIGIN is `[likely]` — §2 gives two positions with no unit and no left margin — so
`MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT` (§15) renders the DIFFERENCE and the primary-source
comparison runs at `matrix:'flush'`, where the ruling cannot reach it.

### 4.6 `PeriodMode` / `ROTARY_ANGLE` / `RotaryTurn` / `turnTo`

```ts
// ═══ src/ui/period/console/session.ts · WAVE 4 ═══ SIX detents against a FOUR-member ConsoleMode
// (machine.ts:38). DISPLAY and C.E. are the two the façade cannot name; adding them is ~10-15 core
// lines plus a fifth MODES row in the byte-frozen controls.ts:23-25 (§15).
import type { ConsoleMode } from '../../../core/machine.js';
export type PeriodMode = ConsoleMode | 'display' | 'ce';
/** OPEN: ROTARY_DETENTS_ARE_60_DEGREES_APART — [likely] derived from [verified]. §3 line 85 names
 *  six CLOCK positions (RUN top, ADDRESS SET upper-left, DISPLAY upper-right, I/E CYCLE lower-left,
 *  ALTER lower-right, C.E. bottom) = 12/2/4/6/8/10 o'clock; the degree numbers are the natural
 *  reading and are on no page. Fallback: read them off a Fig.47 scan — one table changes.
 *  console-and-physical.md §3 [verified] — A22-0526-3 Fig.47 p.49; S223-2648 Fig.2 p.7. */
export const ROTARY_ANGLE: Readonly<Record<PeriodMode, number>> =
  { run: 0, display: 60, alter: 120, ce: 180, ieCycle: 240, addressSet: 300 };
/** AT MOST ONE FIELD ACTIVE on a real turn; both inert on a turn to the current detent. */
export interface RotaryTurn {
  readonly setMode: ConsoleMode | null;   // machine.setMode — types `S` at machine.ts:327
  readonly stop: boolean;                 // machine.stop()  — IS `{ fieldLine('S'); }` at :380
}
export function turnTo(from: PeriodMode, to: PeriodMode, facadeMode: ConsoleMode): RotaryTurn;
```

**The one place `machine.setMode` is reachable from the period surface**, and why "any change of the
mode-switch setting causes a stop print-out" (console-and-physical.md §4 [verified] — A22-0526-3
p.50) holds across six detents with zero core lines. §6.2 gives the body and the trap at
`machine.ts:325`.

### 4.7 `ConsoleKeyboard` — the lock is UI state

```ts
/** io.md §8 step 3's keyboard lock as UI state. `press` refuses when locked, at the limit, or on any
 *  glyph outside the 1415's 64 — which is why Console1415's Figure 45 Data Check row ("input
 *  character validity error") stays unreachable, as read()'s own header argues. It returns false and
 *  never throws: a key press is not an exception (bcdOfGlyph returns undefined, bcd.ts:148). */
export interface ConsoleKeyboard {
  readonly state: 'locked' | 'address' | 'data';
  readonly typed: string;
  readonly wordMarks: readonly boolean[];
  press(glyph: string): boolean;
  /** SEPARATE and non-repeating: the 1415 has a real WORD MARK key at the far left of the QWERTY
   *  row, and "word-mark and space keys are non-repeating" (S223-2648 p.78; A22-0526-3 Fig.43 p.47,
   *  both [verified]). A `^` inside press() would model a text box, not a keyboard. */
  pressWordMark(): void;
  /** `limit` is 5 in 'address' and the DISPLAYED SPAN in 'data'; `onLimit` is the auto-lock,
   *  "keyboard auto-locks, carrier returns, line spaces" (A22-0526-3 p.51). The three-argument form
   *  completes the dossier's unlock(as): one mechanism, both auto-locks. STAYS DOM-FREE: moving the
   *  browser's focus is the SESSION's job, which calls hooks.focus() beside this (§6.5 ruling 5). */
  unlock(as: 'address' | 'data', limit: number, onLimit: () => void): void;
  lock(): void;
  /** EXACTLY the InquiryEntry the shipped supply() takes (console1415.ts:84-88, :166), so the
   *  delivery path does not move a line. Asserted against the frozen keyed() of controls.ts:123 on a
   *  corpus — IMPORTED, never reimplemented (§3.6). */
  take(ending: 'release' | 'cancel'): InquiryEntry;
}
```

### 4.8 `PendingEntry` / `ConsoleSession` — the plan's own

The dossier names `ConsoleSession` and specifies nothing. **This is the minimum that closes §6.3's
dialogue, §6.4's commit rule and §6.6's hold**, and it is the plan's own — no design panel produced
it.

```ts
/** A line the OPERATOR has typed and the machine has NOT — drawn on the Selectric form in a style
 *  visually distinct from a printed ConsoleLine, because nothing is on the paper yet. */
export interface PendingEntry {
  readonly id: 'D' | 'A' | 'I'; readonly column: 30 | 35;
  readonly text: string; readonly wordMarks: readonly boolean[];
}
/** `hooks.run` / `hooks.halt` are main.ts's `() => { running = true; }` / `() => { running = false;
 *  }` — the SAME PAIR `controls.ts:35-40` already defines, so the period START key and the
 *  internals RUN button drive one latch. Without `run`, nothing on `ConsoleSession` could start the
 *  frame: `running` is module-local to `src/ui/main.ts` (§10.2). `hooks.focus` is
 *  `console/mount.ts`'s `.focus()` on the keyboard wrapper (§6.5 ruling 5). */
export function createConsoleSession(machine: Machine,
  hooks: { run(): void; halt(): void; focus(): void }): ConsoleSession;
export interface ConsoleSession {
  /** WHERE THE ROTARY POINTS — tracked separately from machine.mode, which is what makes §6.2's
   *  RUN→DISPLAY→RUN trap safe and what startKey() dispatches on. */
  readonly detent: PeriodMode;
  readonly keyboard: ConsoleKeyboard;
  /** THE UI'S OWN inquiry latch. Never Console1415.pendingRequest, which the device clears inside
   *  precheck() (:199) and read() (:290, :316) — a loop gated on it deadlocks (§6.6). */
  readonly held: boolean;
  readonly pending: PendingEntry | undefined;
  turn(to: PeriodMode): void;      // the ONLY caller of turnTo; commits a pending ALTER, then
                                   // hooks.halt(): a mode change STOPS the machine, not only
                                   // prints (A22-0526-3 p.50; §6.2)
  startKey(): void;                // dispatches on `detent`, never on machine.mode. In the RUN
                                   // detent it calls hooks.run(); in DISPLAY and ALTER it unlocks
                                   // the keyboard and calls hooks.focus()
  stopKey(): void;                 // machine.stop(), then hooks.halt()
  programReset(): void;            // commits, then machine.programReset()
  computerReset(): void;           // commits, then machine.computerReset()
  request(): void;                 // INQUIRY REQUEST: the device latch AND `held`; unlocks the
                                   // keyboard at matrix 30 and calls hooks.focus()
  release(): void;                 // supply({…, ending:'release'}) and clear `held`
  cancel(): void;                  // supply({…, ending:'cancel'})  and clear `held`
  /** deckBox's "key the bootstrap", typed. Feeds BOOTSTRAP_KEYSTROKES (loader.ts:53-58) through
   *  press() / pressWordMark() ONE AT A TIME and requires keyboard.state === 'data'. */
  keyBootstrap(text: string, marks: readonly boolean[]): void;
}
```

**The commit rule, stated here and argued in §6.4.** An ALTER entry reaches storage — `machine.alter
(text, marks)` runs and pushes the `A` line (`machine.ts:424-442`) — when the displayed span FILLS
(auto-lock) **or** on the next control action: START, a rotary turn, COMPUTER RESET, PROGRAM RESET.
`ALTER_ENTRY_COMMITS_ON_THE_NEXT_CONTROL_ACTION` `[unverified]` (§15): A22-0526-3 p.51 says the entry
ends at a word mark or end of line and nothing about leaving early. Storyboard step 10 exercises the
COMPUTER RESET arm.

### 4.9 `Lamp` / `PANEL_BOXES` / `OMITTED_LAMPS` / `lampsOf`

```ts
// ═══ src/ui/period/console/lamps.ts · WAVE 4 ═══
import type { MachineState } from '../../../core/types.js';
export type PanelBox = 'cpu' | 'status' | 'channelControl' | 'channelStatus' | 'systemCheck'
  | 'power' | 'systemControls';
export interface Lamp {
  readonly box: PanelBox;
  readonly group: string | null;     // §5's Sub-group column: 'I RING', 'PROCESS', … or null
  readonly label: string;            // as silkscreened
  /** null = DRAWN AND NEVER LIT, the honest majority: I RING, A RING, CLOCK, SCAN/SUB SCAN, CYCLE,
   *  ARITH and the whole SYSTEM CHECK box have no modelled state. "Not modelled" as a typed VALUE
   *  stops the panel implying the emulator knows more than it does. */
  readonly source: ((s: MachineState) => boolean) | null;
  readonly cite: string;             // what the both-directions research diff reads
}
export interface PanelBoxSpec {
  readonly box: PanelBox; readonly title: string; readonly lamps: readonly Lamp[];
}
/** SEVEN boxes in the published left-to-right order, STATUS immediately right of ARITH — §5's own
 *  correction note names that omission as the trap, and the research diff has a case for it. */
export const PANEL_BOXES: readonly PanelBoxSpec[];
/** EIGHT entries, each with its architecture.md §12 citation. A darkened lamp reads as an
 *  uninstalled option; §12 forbids implying tape, disk, channel 2 or 1401 mode exist at all. */
export const OMITTED_LAMPS: readonly { readonly box: PanelBox; readonly group: string | null;
  readonly label: string; readonly why: string }[];
export interface LampState { readonly lamp: Lamp; readonly driven: boolean; readonly lit: boolean }
export function lampsOf(s: MachineState): readonly LampState[];
```

**`Lamp.box` is seven-valued, not the dossier's eight**: console-and-physical.md §5 draws SYSTEM CHECK as ONE box with PROCESS and PROGRAM as sub-groups, and the dossier's own §8 reproduces it that way. Seven boxes with `group` carrying the sub-group makes `test/period-light-panel-vs-research.test.ts` a straight Box / Sub-group / Lights read of §5's markdown table instead of a re-shaping.

### 4.10 `PeriodViewState` and its transitions

```ts
// ═══ src/ui/period/session.ts · WAVE 5 ═══ SIX fields — enough for §13's criteria to assert page
// headlessly, small enough that it never becomes a store. Nothing here is MACHINE state: every
// machine read on the period surface is snapshot().
import type { PrintChain } from '../../core/devices/printer1403.js';
export interface PeriodViewState {
  readonly tab: 'machine' | 'internals';
  readonly bars: boolean;          // green bar vs plain white — GREEN_BAR_IS_THE_DEFAULT… (§15)
  readonly reading: PrintChain;    // which chain the PAGE and the LISTING are read through
  readonly ruler: boolean;         // the 132-position ruler over the form
  readonly form: number;           // which form of the printed stack is scrolled to
  readonly card: number;           // 0-based index of the card face on show
}
export type PeriodAction =
  | { readonly kind: 'tab'; readonly tab: PeriodViewState['tab'] }
  | { readonly kind: 'bars' } | { readonly kind: 'ruler' } | { readonly kind: 'chain' }
  | { readonly kind: 'form'; readonly form: number }
  | { readonly kind: 'card'; readonly card: number };
export const INITIAL_VIEW_STATE: PeriodViewState =
  { tab: 'machine', bars: true, reading: 'A', ruler: true, form: 1, card: 0 };
/** PURE. `form` and `card` clamp against bounds the caller passes; everything else is a toggle or a
 *  set. `reduce` returns the SAME object when nothing changed, so a view's joined-key diff (§10.2)
 *  sees no change and touches no DOM. */
export function reduce(s: PeriodViewState, a: PeriodAction,
  bounds: { readonly forms: number; readonly cards: number }): PeriodViewState;
```

`reading` is a VIEW field and not a machine field, and that is the whole of §5.3: the chain the page
is read through changes what is drawn and never what was printed.

---

## 5. The paper model — pages, carriage, and the chain

Four DOM-free modules, all wave 1, all under `src/ui/period/paper/`. Together they own every number
on the 1403 station and on every card face in the phase, and none of the four can see a DOM node.

### 5.1 `page.ts` — `paginate`, and the free oracle

**`paginate`'s rules, numbered the way `renderGreenBar`'s five are** (`printer1403.ts:695-716`):

1. **Exactly `formLines` entries per form**, blanks included, in position order, **each exactly
   `PRINT_POSITIONS` (132) characters** — padded, never sliced, because a `PrintLine.text` is
   already ≤132 by the device (`printer1403.ts:498` sets wrong-length record on anything longer and
   prints nothing above `PRINT_POSITIONS`). A form is
   physical: 66 line positions at 6 lpi is 11 inches of stock, 132 positions at 10 cpi is 13.2
   inches across, and a stack you scroll back through
   must contain the blanks the carriage skipped over. This is where `renderGreenBar` and `paginate`
   part company, and it is deliberate. `trimRule3` still strips the trailing blanks, so the padding
   is invisible to the identity below; `test/period-page.test.ts` asserts the 132 directly, which is
   the assertion that catches a wrap before a person sees it (§7.2).
2. **`complete` is false only for the form the carriage is on** — `form === carriage.page`. Every
   earlier form has been ejected onto the printed stack and cannot gain a line.
3. **A form the paper never reached is not emitted.** The emitted set is the ascending union of the
   forms named in `paper` and `carriage.page` — which is exactly what `printerView.ts:117-121`
   already does (`const forms = new Set<number>([c.page]); … forms.add(l.page);`), carried across
   with its comment. So the blank form 1 of storyboard step 1 is emitted (the carriage is on it) and
   form 3 of a two-form report is not.
4. **Two `PrintLine`s at one `page:line` throw**, with `renderGreenBar`'s own message shape
   (`printer1403.ts:726`). A page model that can lose a line is not a page model; `renderGreenBar`
   made that argument in Phase 2 (§14 R8 of that plan) and `paginate` inherits it rather than
   restating it.

**The identity, committed to here, before the code exists.** For any paper the machine produces:

```ts
renderGreenBar(paper, { chain, formLines })
  === `1403 Model 2 · chain ${chain} · ${formLines}-line form\n\n`
    + paginate(paper, carriage, formLines)
        .filter((p) => p.printedThrough > 0)         // renderGreenBar rule 2: forms with ink only
        .map(trimRule3)                               // rules 2, 3 and 5
        .join('\f\n');                                // rule 4: a lone form feed on its own line
```

Every clause maps to one of `renderGreenBar`'s five rules and nothing is left over: the header line
plus its blank line is rule 1, the filter and `trimRule3`'s `slice(0, printedThrough)` are rule 2,
the per-line `replace(/ +$/, '')` is rule 3, the join is rule 4, and `trimRule3`'s `\n` on every line
is rule 5. **Two independent renderers over one paper**, gated in wave 1 against three page goldens
this phase did not author — `hello-dad.page.txt` 348 B, `sales-summary.page.txt` 3688 B and
`cycle-probe.page.txt` — each re-run through the real machine rather than parsed from the file. A
restyle that breaks the paper breaks a golden (§13 criterion 8).

**The independence requirement is enforced, not promised.** The dossier's fourth residual risk is
that a builder implements `paginate` by calling `renderGreenBar` and splitting on `\f`, at which
point the assertion is a tautology and nothing catches it. §15's new row
`PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR` (ruling, ours) is made mechanical in
`test/period-page.test.ts`: **`src/ui/period/paper/page.ts` contains no import specifier naming
`printer1403`**, so `renderGreenBar`, `chainGlyph` and `DEFAULT_CARRIAGE_TAPE` are all unreachable
from it. The test reads the file, not the module.

**The synthetic three-form case** (completeness critic item 4d). No shipped demo prints past two
forms — `sales-summary` is two, `cycle-probe` is two, `hello-dad` is one — so wave 1 builds a
`PrintLine[]` by hand at forms 1, 2 and 3 and asserts all four rules over
it. **Form 2 carries ONE blank `PrintLine` at line 1** — the
`L_WRITE_WORD_MARKS_PRINTS_A_BLANK_LINE` case (`printer1403.ts:309-326`), which puts 132 blanks on
the paper and is exactly why `printedThrough` is a field and not a scan — so rule 3 emits the form
at all, and its other 65 line positions come back as **132-blank entries in `FormPage.lines`**,
while `trimRule3` stops at line 1. Phase 6's
reentry report is longer than two forms and this is the assertion that says `paginate` is ready for
it (§16 item 8).

### 5.2 `carriage.ts` — `traversed`, `straddled`, and where `from` and `to` come from

**`traversed`, over the motions the device can make.** One step of `traversed` is one
`advanceOneLine`, and the plan quotes `types.ts`'s own statement of the rule rather than restating
it, because the comment is written to stay true for a tape this shop does not run:

> `page` is the FORM count, and it increments on exactly one event: carriage motion that passes the
> last line of the form and wraps to line 1 of the next one. On `DEFAULT_CARRIAGE_TAPE`, which
> punches channel 1 once at line 1, "skip to channel 1" IS that event — but stating the rule as the
> wrap rather than as "a skip to channel 1" keeps it true for any tape.
> — `src/core/types.ts:377-381` [verified against the device at `printer1403.ts:632-639`]

The enumerated motions wave 1 asserts, all in `test/period-carriage.test.ts`: a single-line space; a
2- and a 3-line space (`F` immediate space, `printer1403.ts:627-630`); a skip that stays inside the
form; a skip that WRAPS the form; and the one-form bound of
`SKIP_TO_UNPUNCHED_CHANNEL_ADVANCES_ONE_FORM` (`printer1403.ts:295-306`, `[unverified]`, Phase 2's),
where the carriage ends one form on at the line it started from.

**`straddled` — the punches crossed and not landed on.** `traversed(from, to, tape.formLines)` less
its final entry, matched against `tape.punches` by line. `from` is excluded by `traversed`'s own
contract because the carriage was already positioned there and `senseChannels()` ran on it.

**HOW A CALLER GETS `from` AND `to`, written out** — the part every architect left implicit, and the
reason §13 criterion 9 can be a command instead of a hope. After the deck completes and
`machine.endOfJob()` has performed the last armed space:

- **`to`** is `snapshot().printer.carriage` read as `{ form: page, line }` (`machine.ts:496`).
- **`from`** is the last `PrintLine` on `to.form` in `snapshot().printer.paper` — highest `line`
  among the entries whose `page === to.form`. If that form printed nothing, there is no motion to
  report and `straddled` is called with `from === to`, which returns empty by construction.
- **the tape** is `machine.printer.tape` — the same object the device skips against, handed over at
  construction, never a copy. That is `unitrecord/mount.ts:47`'s existing pattern and it discharges
  §15's `DEFAULT_CARRIAGE_TAPE` fallback in as many words: *"render it in the printer view so it is
  visible rather than assumed"*.

On `demos/cycle-probe` that is `straddled({form:2, line:59}, {form:2, line:61},
DEFAULT_CARRIAGE_TAPE) === [{ line: 60, channel: 12 }]`, asserted on the same frame as
`carriage.channel12 === false`, with `demos/sales-summary` asserted empty (§13 criterion 9).

**Three derivations, named and refused with their reason:**

| refused | why it cannot work here |
|---|---|
| a paper-only rule — punched lines strictly between two consecutive PRINTED lines | On `cycle-probe` form 2 the last printed line is `LAST CARD` at line 59 and **nothing prints at 60 or 61** (`test/golden/cycle-probe.page.txt`). It reports nothing on the one shipped deck that exhibits the divergence. |
| a per-frame `CarriageState` diff | `START_BUDGET = 2000` (`machine.ts:45`) merges motions inside one frame, so the drawn tape and the node test can disagree about the very crossing the view exists to show. |
| a `PrintEvent[]` replay | `PrintEvent` is `{kind:'line'} \| {kind:'space'} \| {kind:'skip'}` with **no positions** (`types.ts:359-362`) and is pushed at exactly five sites (`printer1403.ts:510, 577, 581, 585, 590`). The AUTOMATIC SINGLE SPACE emits none — it is the deferred `autoSpace` latch performed by the next write or `flush()`. The stream is what the PROGRAM asked for, never what the paper did. |

**The invariant that keeps the derivation honest: a single-line space can never straddle.** It falls
out of the definition — `traversed` returns exactly one entry, dropping the destination leaves the
empty list — rather than being a special case, and `test/period-carriage.test.ts` asserts it
directly so that a future `traversed` that becomes inclusive of `from` fails here first.

**The banner, verbatim.** `STRADDLE_BANNER({line: 60, channel: 12})` is exactly:

```
channel 12 at line 60 passed unsensed — CARRIAGE_SENSES_AT_DESTINATION_ONLY (src/core/devices/printer1403.ts:354)
```

asserted character for character in `test/period-printer.test.ts`, including the constant name and
the file and line. The real fix is `printer1403.ts`'s own documented one — call `senseChannels()`
from `advanceOneLine()` and delete the two calls after the loops (`printer1403.ts:347-352`, the
device's own "**The fix path**" paragraph) — and it
is a `src/core` change that would move `test/golden/cycle-probe.page.txt`. Phase 4 escalates and
does not take it; recording rather than fixing is the `RW#` / `WM#` / `loader.ts:90` precedent.

### 5.3 `chain.ts` — the restrike, and the golden it must not reach

**The five duals, with their codes** (charset.md §5 [verified] — A22-0526-3 pp.6-7 Figure 2;
GA24-3073 p.27, *"The four graphics % ⌑ # @ of the AN arrangement are dualed with ( ) = ' of the HN
arrangement"*):

| Hollerith | BCD | octal | A (report writing) | H (program language) |
|---|---|---|---|---|
| 12 | `BA` | 60 | `&` | `+` |
| 12-4-8 | `BA84` | 74 | `⌑` lozenge | `)` |
| 0-4-8 | `A84` | 34 | `%` | `(` |
| 3-8 | `821` | 13 | `#` | `=` |
| 4-8 | `84` | 14 | `@` | `'` |

**`restrike` maps PRINTED GLYPHS and never BCD.** The stated non-goal matters: it takes a string
that already came off a 1403 and returns the string the other chain would have printed, so it
composes with nothing in `src/core`, needs no code table, and cannot be plumbed into an assembler by
accident. `test/period-chain.test.ts` greps for the absence of any import of `paper/chain.js` under
`src/asm/**` and for the absence of a second chain table under `src/ui/**` (§13 criterion 12).

**The proof obligation, over all 64 codes and in both directions:**

```ts
restrike(chainGlyph(c, 'A'), 'H') === chainGlyph(c, 'H')   // for c = 0o00 … 0o77
restrike(chainGlyph(c, 'H'), 'A') === chainGlyph(c, 'A')
```

It holds for three reasons the research states and the test re-derives from the shipped device rather
than from a transcription: none of the five H glyphs appears anywhere on the A set (so the two maps
are disjoint and each is injective); the **twelve** codes on neither chain — `[ < GM ] ; Δ WS \ SM :
> √` — print blank on **both**, one position wide, because the hammer simply does not fire; and
`?` prints `&` on A and `+` on H (§5.1, `[likely]`), i.e. it collides with BCD 60 identically on both
chains, so the map is well defined on printed text. Two chain-independent facts carry across
unchanged: **`!` prints `-`** and **`ƀ` prints the record-mark slug `‡`**, on both chains, because
`-` and the record mark are on both 48-graphic sets (charset.md §5.1 [verified]). (The research
files name that slug differently — charset.md §5 and `printer1403.ts:117` call `‡` the record mark,
console-and-physical.md §2's Fig.43 caption calls the same key top the group mark; the plan uses each
file's own name at its own point of use and records the disagreement here rather than resolving it.) A second, quieter
consequence of the twelve-blank rule: the blank set is chain-invariant, so `renderGreenBar`'s
trailing-blank trim (rule 3) cannot move under a restrike — which is what makes the transform safe
over *rendered* output and not only over raw `PrintLine.text`.

**THE LISTING GOLDEN CONSTRAINS THE RESTRIKE** (completeness critic item 5). `renderListing`'s
output is chain-**A** TEXT: `test/asm-listing.test.ts:136` calls `renderListing(listingOf(DEMO))`
with no options, which takes `PRINT_CHAIN_A_IS_DEFAULT` at `listing1403.ts:205`, and its bytes are
`test/golden/hello-dad.lst` (2251 B) and `test/golden/sales-summary.lst` (6982 B). The coding
station's A/H toggle therefore **calls `renderListing(listing)` once, at the default chain, and
applies `restrike()` to the rendered string for display** — it does not pass `{ chain }` through, as
`listingView.ts:97` does today. The button cannot dirty the listing the goldens pin, because the
only path from the button to the assembler no longer exists. The bijection above is what makes the
two routes identical on the body: `chained()` maps every composed character `bcdOfGlyph → chainGlyph`
(`listing1403.ts:160-172`), so `restrike(renderListing(l), 'H')` and `renderListing(l, {chain:'H'})`
agree glyph for glyph. §9.3 owns the view; §13 criteria 6 and 12 own the gate.

### 5.4 `cardGeometry.ts` — one geometry, three scales

**The table, every row tagged with its source** (console-and-physical.md §10; the [likely] rows are
secondary — Jones / Wikipedia — and ANSI X3.21-1967 was not read):

| quantity | value | confidence · source |
|---|---|---|
| Columns | 80 | [verified] — console-and-physical.md §10 |
| Rows | 12 (12/11 zone + 0-9) | [verified] — §10 |
| Interpretation band | top 3/16 in (`bandH` 18.75) | [verified] — IBM 22-5526-4 p.8 |
| Printed face: column numbers under row 0 and again under row 9, zone rows unprinted, "IBM" vertical at the left edge | as drawn | [verified] — 22-5526-4 Figs.3-5 pp.9, 12 |
| Card size | 7 3/8 × 3 1/4 × 0.007 in (`cardW` 737.5, `cardH` 325) | [likely] — §10; §15 `CARD_SIZE_7_3_8_BY_3_1_4` |
| Column pitch | 0.087 in (`colPitch` 8.7) | [likely] — §10; §15 `CARD_GEOMETRY_IS_SECONDARY` |
| Row pitch | 0.250 in (`rowPitch` 25) | [likely] — §10; same row |
| Hole | 0.055 × 0.125 in rectangular (`holeW` 5.5, `holeH` 12.5) | [likely] — §10; same row |
| Corner cut | one upper **LEFT**, diagonal (`cornerCut` 25) | [likely] — §10; §15 `CORNER_CUT_IS_UPPER_LEFT` |

console-and-physical.md §13 rows 4-6 say to use the [likely] numbers **and say so**, which is what
`CARD_GEOMETRY_IS_SECONDARY`'s ledger row does. Extracting them into one module is what makes a
correction cheap: a re-read of ANSI X3.21-1967 moves `CARD_GEOMETRY` and
`test/golden/card-face-a.svg.txt` and nothing else — no view, no CSS, no second copy.

**`holePath` is derived from `punchMask`, and there is no second punch table in this project.** For
each column the mask comes from `punchMask(card[c])` (`src/formats/card.ts:48`) and the twelve rows
are walked most-significant bit first, exactly as `cardView.ts:62-73` walks them today. Wave 1's
oracle asserts the agreement twice over: `test/golden/card-face-a.svg.txt` is byte-identical, **and**
`holePath(card, true)` contains exactly the rectangles `punchMask` says are punched for every
punchable BCD code — the path string and the punch table must agree for two unrelated reasons
(§13 criterion 13).

**The band prints `glyphOf`'s 64, not the chain's 48.** `bandGlyphs` calls `glyphOf`
(`src/core/bcd.ts:141`), the 64-character set, because **a printing punch types what the punch
knows** — the band is printed by a printing punch (22-5526-4 p.8, `[verified]`), which is neither a
1403 chain nor the 1415's element. **Which graphics that punch's print unit carried is stated by no
source in `docs/research/`**, so this is a ruling with a ledger row — §15
`INTERPRETATION_BAND_PRINTS_THE_64_GLYPH_SET` `[unverified]` — and the card-face golden is a pin on
the ruling, not evidence about IBM's card. A card carrying `⌑` shows `⌑` in the band whichever chain the 1403 is running, which is
also why `restrike` (§5.3) is a *page* transform and never touches a card face. **And the carried
comment drops one clause on the way**: `cardView.ts:14` reads *"the band prints `glyphOf`, the 1415
typeball's 64 characters"*, and the header `paper/cardGeometry.ts` inherits **withdraws the device
attribution** — a printing punch is neither a 1403 chain nor the 1415's element — so §15's
retraction reaches the code this wave writes and not only this plan.

**Two `<path>`s per card, and the reason carries forward verbatim from `cardView.ts:19-21`:**

> The whole card is four SVG nodes: two `<path>`s (the unpunched grid, then the punches) and three
> `<text>`s. One `<rect>` per hole would be 960 nodes per card and deckBox re-renders every card on
> every keystroke; a path costs one node and draws the same rectangles.

That justification is now load-bearing three times rather than once, because `cardFaceView.ts` draws
the read-buffer card, the deck-box faces and the object-deck faces from this one module at three
scales (§7.1, §3.3), and the deck box still re-renders on every keystroke.

---

## 6. The console model — the Selectric, the rotary, the keyboard, the dialogue

The 1415 is a desk, not a lamp-decoded register bank: *"The 1410 shows **no register contents in
lights** — every stop, display, alter and inquiry goes out on the typewriter as fixed-format lines"*
(console-and-physical.md implementer summary item 2, [verified]). So the console station is a piece
of paper, a rotary, twenty-odd keys and a lock, and the whole of it is driven from two DOM-free
modules — `console/selectric.ts` (wave 1) and `console/session.ts` (wave 4).

### 6.1 `selectric.ts` — one renderer, three switches, and the phase's oracle

`toSelectric` maps `ConsoleLine` → `SelectricLine`: `blankBefore` from `spacingBefore === 'double'`,
`column` from `matrixPos`, and one `SelectricCell` per character of `text` zipped with `wordMarks`
and `underline`. `renderSelectric` puts the ID back on — `id === null ? body : id + ' ' + body` —
which is the convention `printout.ts:8-14` documents for every producer of a `ConsoleLine` and which
`panel.ts` and `tools/run-cor.ts` both implement today.

**The three option switches, and why each exists:**

| switch | `'render'` / `'indent'` | the reason it is a switch |
|---|---|---|
| `marks` | combining caron U+030C over a word-marked character, combining low line U+0332 under one with bad parity | The Exhibit II block in the research file contains **zero** combining marks (grepped for U+0300-U+036F, no hits), so a byte comparison against the manual's own text must run with `marks:'strip'`. The marks are then asserted as their own named case. |
| `spacing` | a blank line before a double-spaced line | The fenced block contains **no blank line before the `S` line**, while §2's layout table gives "Normal stop → Spacing before: double". Both are true; they cannot be true in one assertion. |
| `matrix` | `matrixPos − 30` leading spaces | The indent is `[likely]` (§15 `MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT`) — §2 gives positions 30 and 35 with no unit and no origin. The primary-source check runs at `matrix:'flush'` **precisely so it does not depend on our reading**; the browser passes `'indent'`. |

**THE PHASE-4 ORACLE.** `test/period-selectric.test.ts` reads
`docs/research/console-and-physical.md`, slices the fence between lines 59 and 79 (nineteen content
lines, not eighteen), drops the elided `D bbbb...` row **by name in the test header** — it is a
literal elision, not a renderable `ConsoleLine` — builds each remaining line through `formatPrintout`
with the fields §2's layout table gives, and asserts byte equality against
`renderSelectric(lines, { matrix:'flush', marks:'strip', spacing:'ignore' })`. This is
`test/rpg-columns-vs-research.test.ts`'s shipped slice-at-test-time mechanism aimed at
`architecture.md` §8's named Phase-4 oracle, and it means **there is no authored console golden
file** (§12.3).

**§2's layout table, reproduced in full as the renderer's spec** (A22-0526-3 Fig.42 p.46; S223-2648
Fig.5 p.9, both [verified]):

| Operation | Spacing before | ID | Fields printed (space-separated) | Matrix |
|---|---|---|---|---|
| Normal stop (STOP key / mode change) | double | `S` | IAR(5) AAR(5) BAR(5) Op+OpMod(2) A-ch/B-ch/Asm-ch(3) CH1+CH2 unit-sel/unit-num (4, no inner space) | 35 |
| Half cycle (I/E CYCLE) | double | `C` | same as `S` | 35 |
| Error stop | double | `E` | same as `S` | 35 |
| Address set | single | `B` (`#` if the addr-entry switch is not NORMAL) | the 5-digit address the operator typed | 35 |
| Storage scan set | single | `#` | 5-digit address | 35 |
| Display | single | `D` / `D` | line 1: the typed address; line 2: storage contents to a word mark | 35 / 30 |
| Alter | single | `A` | operator-typed replacement data | 30 |
| Console inquiry | single | `I` | operator-typed message | 30 |
| Console reply (program) | single | `R` | program message, invalid characters underlined | 30 |

Two rules of that table are renderer behaviour rather than formatter behaviour and are asserted
separately: **CH1+CH2 unit-select/number print as ONE 4-character group with no inner space** (Fig.42
prints it `XXXX`) with the whole group underlined when its parity is absent — which is why
`formatPrintout` sets all four underline flags when `ch1Unit` is absent — and **the graphic zero is
slashed `Ø` while the letter `O` is not** (`printout.ts:29`; C28-0351-5 p.2). Load-mode `b` and a
real space are two distinct things and the log carries both: `R SØ1 JOB  SAMPLE` has real spaces
(`PRINTED_BLANK` at `printout.ts:40` is a FALLBACK, and its own header says the Exhibit II block is
evidence in both directions).

**The `panel.ts` fold, stated exactly.** In wave 1, `src/ui/internals/panel.ts` **lines 61-75** —
the four-line comment that exists only to describe the two combining-mark constants, the constants
themselves, the private `renderConsoleLine`, and the blank line at `:75`, which goes with the block
so that `:60`'s blank is not left doubled — are deleted; one import is added,
`import { renderSelectric } from '../period/console/selectric.js';`; and the call at `panel.ts:145`
becomes `renderSelectric(s.console, { matrix: 'flush', marks: 'render', spacing: 'render' })`. That
option triple reproduces today's bytes exactly: the deleted function prepends `'\n'` when
`spacingBefore === 'double'`, applies both combining marks in the order caron-then-underscore, and
ignores `matrixPos` — which is `'render'`, `'render'`, `'flush'`. **The four-line comment is the two
marks' only in-code citation** (console-and-physical.md §2, A22-0526-3 p.49; S223-2648 p.6), so it
MOVES into `selectric.ts`'s header with the constants rather than dying with the block (§3.2, §4.5,
§16 item 1). `make` / `cell` / `row` / `table` /
`box` / `View` keep their exports and signatures, because `controls.ts:12` imports `make` from here
and `controls.ts` is byte-frozen. **Sixteen deleted, two added** — the fifteen lines 61-75 plus the
rewritten call, against the import and the new call — and §13 criterion 3 pins exactly that.
**`npm run cc01` byte-identity stops being a gate and becomes
evidence** at this commit: the transcript is the proof that the fold moved no text.

**`tools/run-cor.ts` is NOT folded**, and the plan says why in one sentence: its `renderConsoleLine`
(lines 43-49) has **no `spacingBefore` clause**, so unifying it under one call would put a blank line
before every `S`, `C` and `E` line in the cc01 transcript — and cc01 byte-identity is a per-commit
gate (§12.2). It is listed as reuse-verbatim in §3.6 with exactly that reason.

**The 932 cpm reveal, which is where `SELECTRIC_REVEAL_IS_DISPLAY_ONLY` bites.** Its point of use is
`console/logView.ts` (wave 4) and it is **OPTIONAL**: the drawn log may reveal at the Selectric's
`[verified]` 932 cpm (console-and-physical.md §2; A22-0526-3 p.45) behind an instant toggle, but the
rate is a RENDERING rate over a log that is already final — never a simulation rate and never a
CPU-timing claim (architecture.md §12). It is off the critical path in the literal sense: **if it is
built, `reveal(log, Infinity) === renderSelectric(log, opts)` is asserted as a fixed point**, so no
test ever reads through the reveal and the animation cannot lose a character a golden holds; if it
is not built, nothing else in the phase changes (§15).

### 6.2 The rotary — `turnTo` in full, and the trap at `machine.ts:325`

```ts
const isConsoleMode = (m: PeriodMode): m is ConsoleMode => m !== 'display' && m !== 'ce';

export function turnTo(from: PeriodMode, to: PeriodMode, facadeMode: ConsoleMode): RotaryTurn {
  if (to === from) return { setMode: null, stop: false };        // not a change; types nothing
  return isConsoleMode(to) && to !== facadeMode
    ? { setMode: to,   stop: false }                             // machine.ts:327 types the S
    : { setMode: null, stop: true  };                            // machine.ts:380 IS fieldLine('S')
}
```

**Exactly one `S` per real turn, and zero for a turn to the current detent**, over all 30 ordered
pairs of the six detents — driven on a real `createMachine({size:10_000})` and asserted on
`snapshot().console`, never on "it did not throw" (§13 criterion 10). The two paths are
byte-identical on the paper because `machine.stop()` is literally `{ fieldLine('S'); }`
(`machine.ts:380`) and `setMode` ends on the same `fieldLine('S')` (`:327`) — which is also why §2's
print-out table has ONE row for "Normal stop (STOP key / mode change)", and why §15's
`UI_ONLY_DETENTS_TYPE_S_THROUGH_STOP` is a ruling this file can take with **zero core lines**.
**The drawn rotary snaps between the six `ROTARY_ANGLE` positions and animates nothing between
them** — §15 `NO_KEY_TRAVEL_ANIMATION`, a refusal rather than an open question:
console-and-physical.md §3 publishes detent POSITIONS and no mechanics, and a wrong animation would
be a claim.

**The RUN→DISPLAY→RUN trap.** `machine.ts:325` is `if (next === machine.mode) return;`. A turn to
DISPLAY is a UI-only detent and leaves `machine.mode === 'run'`, so the turn **back** to RUN would be
swallowed by that early return and the log would lose **two** lines, not one. `turnTo` avoids it by
tracking the rotary's position (`from`) separately from the façade's mode (`facadeMode`) and routing
`display → run` through `stop()`. This is the exact case judge 3 named as the bug a naive
implementation ships, and it is why `ConsoleSession.detent` exists as a field in §4.8.

**A mode change STOPS the machine; the print-out is its side effect, not the whole of it.**
console-and-physical.md §4 `[verified]` (A22-0526-3 p.50): *"**Any** change of the mode-switch
setting — not only the STOP key — causes a stop print-out once the current instruction
completes."* A turn to a façade mode stops the frame incidentally, because `machine.mode` leaves
`'run'`; a turn to DISPLAY or C.E. leaves `machine.mode === 'run'` and would not. So
`ConsoleSession.turn()` fires the `halt` hook `main.ts` supplies on every real turn — the same
`() => { running = false; }` that `controls.ts`'s STOP key already calls — and §10.2's frame gate
reads `session.detent === 'run'` **in addition to** `machine.mode === 'run'`, never instead of it,
so the CPU cannot advance while the rotary points anywhere but RUN **and** cannot be dispatched
through the wrong `machine.start()` arm. **Both terms are load-bearing**: the byte-frozen
`controls.ts` `<select>` (`:80-85`, `m.setMode(next)`) can still move `machine.mode` on its own while
the rotary sits at RUN, and `machine.start()` switches on `machine.mode` (`machine.ts:355-374`) —
with `'ieCycle'` it steps a cycle **and types a `C` line per call**, sixty times a second; with
`'alter'` it returns `undefined` without ever clearing `running`. §13 criterion 10 asserts both
halves of the turn: one `S` on the
paper AND the run latch off, through a `halt` spy the test supplies to `createConsoleSession`.

**A second consequence of the same asymmetry, and it is a correctness one:** while the rotary points
at DISPLAY or C.E., `machine.mode` is still whatever it was, so a START dispatched on `machine.mode`
would **run the CPU** from a DISPLAY detent. `ConsoleSession.startKey()` therefore dispatches on
`detent` and never on `machine.mode` (§4.8), and §6.3's dialogue is what DISPLAY's START does.

**C.E. is drawn and refused.** The detent turns and types its `S`, and the hinged cabinet door
S223-2648 Fig.2 p.7 puts in front of the CE panel is drawn **closed**, with one line naming what §3
documents behind it — ADDRESS ENTRY, STORAGE SCAN, CYCLE CONTROL, CHECK CONTROL, ASTERISK INSERT, PRINT OUT CONTROL,
START PRINT OUT, the SENSE A-G/WM toggle column, CHECK TEST jacks — and saying that none of it is
modelled (§2.2, `architecture.md` §12). The closed door is also what keeps PRINT OUT CONTROL and
START PRINT OUT off the desk, which matters because they look like they answer
`HALT_TYPES_NO_PRINTOUT` (§15) and they are exactly the controls Phase 4 must not appear to model.

### 6.3 The display/alter dialogue, in the manual's order

console-and-physical.md §4 [verified], A22-0526-3 p.51, with software.md §10.8's ALTER mechanics.
Each step names the façade call the session makes — and the point of the sequence is that **for the
first five steps it makes none**:

| # | The operator does | `ConsoleSession` does |
|---|---|---|
| 1 | STOP | `machine.stop()` — the first `S`, double-spaced at matrix 35 |
| 2 | turns MODE to DISPLAY | `turnTo('run','display','run')` → `{stop:true}` → `machine.stop()` — the second `S` |
| 3 | presses START | **nothing on the façade.** `keyboard.unlock('address', 5, onFive)`; a pending `D ` row appears at matrix 35 |
| 4 | types `0`,`0`,`0`,`0`,`0` | `keyboard.press` × 5; the pending row grows |
| 5 | (the fifth digit) | auto-lock fires: `machine.keyAddress('00000')` then `machine.display()`, which pushes **BOTH** `D` lines (`machine.ts:392-411`); the pending row is replaced by them |
| 6 | turns MODE to ALTER | commit (§6.4, nothing pending), `turnTo('display','alter','run')` → `{setMode:'alter'}` — the third `S` |
| 7 | presses START | **nothing on the façade.** `keyboard.unlock('data', span, onFull)`; a pending `A ` row appears at matrix 30 |
| 8 | types the line, WORD MARK where the marks go | `keyboard.press` / `pressWordMark`; the pending row echoes |
| 9 | COMPUTER RESET (or the span fills) | commit: `machine.alter(text, marks)` pushes the `A` line (`machine.ts:424-442`), then `machine.computerReset()` |
| 10 | turns MODE to RUN, presses START | `turnTo('alter','run','alter')` → `{setMode:'run'}` — the fourth `S`; then `startKey()` in the RUN detent calls `hooks.run()`, which is `main.ts`'s `() => { running = true; }` — the pair `controls.ts:35-40` already defines, and the reason `ConsoleSession` takes a `run` hook and not only a `halt` one (§4.8) |

**Four refusals, each with its citation, each asserted as a named case in
`test/period-console.test.ts`:**

- **A keystroke before START is refused.** `keyboard.state` is `'locked'` until START unlocks it;
  the manual's order is START → unlock → type (A22-0526-3 p.51). `press()` returns `false` and
  nothing reaches the paper.
- **ALTER before a display is refused and types nothing.** *"Must follow a display"* (§4). The
  session never reaches the façade: `machine.alter` throws at `machine.ts:425` when `displayed` is
  `undefined`, and START in ALTER with no prior display does not unlock, so there is nothing to
  commit. The test asserts on the log's length, not on a caught exception.
- **A sixth digit is refused.** `unlock('address', 5, …)` auto-locks on the fifth — *"keyboard
  auto-locks, carrier returns, line spaces"* — so the sixth press is a press against a locked
  keyboard.
- **A glyph outside the 64 is refused.** `bcdOfGlyph` returns `undefined` (`bcd.ts:148`), so
  `press()` returns `false`. This is what keeps Figure 45's Data Check row ("input character
  validity error") unreachable from any entry this emulator can construct, exactly as
  `console1415.ts:296-302` already argues for the read path.

**The 80-position rule.** `CONSOLE_LINE_LENGTH = 80` (`machine.ts:105`, an OPEN with its own §15 row)
and `machine.ts:100` records the consequence: *"there are no word marks, so an ALTER of 00000-00011
runs to the end of the printer line"*. On a freshly cleared 10K machine a DISPLAY of `00000`
therefore prints **80 positions**, not twelve — twelve is the length of the hand-keyed bootstrap, not
of the display. Phase 4 makes the fallback VISIBLE for the first time: the drawn Selectric form is
ruled at 80 positions, so the number is seen rather than assumed — the same treatment
`DEFAULT_CARRIAGE_TAPE` got in Phase 2.

**The wraparound is left unmodelled and is unreachable.** §4: *"On 10K machines, display and alter
stop at the last storage location. On 20K-80K machines, display continues from 00000 after the last
location…"* This shop runs `createMachine({size:10_000})` (`src/ui/main.ts`, §3.1), so the 20K-80K
rule cannot be entered from the page. It is recorded here and not drawn.

### 6.4 The commit rule, and `keyBootstrap`

**An ALTER entry commits when the displayed span fills, or on the next control action.** The four
control actions are START, a rotary turn, COMPUTER RESET and PROGRAM RESET — every method on
`ConsoleSession` that touches the machine. Commit is `machine.alter(text, wordMarks)`, which writes
`min(glyphs, span, size − base)` positions and pushes the `A` line (`machine.ts:424-442`); the
pending row then disappears because the machine has typed.

This is `[unverified]` and it is §15's `ALTER_ENTRY_COMMITS_ON_THE_NEXT_CONTROL_ACTION`: A22-0526-3
p.51 says the entry ends *"at a word mark or end of line"* and says nothing about what happens when
the operator walks away mid-line. The fallback is the narrower reading — commit only on the auto-lock
— which costs storyboard step 10 its COMPUTER RESET arm and nothing else. What the ruling buys is
that a hand-keyed bootstrap of exactly twelve characters into an 80-position span has a way to reach
storage at all.

**Two rules the manual states and the emulator already implements, restated because the dialogue is
where they become visible.** *"Any previously displayed word mark must be re-entered into storage"*
(software.md §10.8): `machine.alter` calls `storage.setChar` with the CALLER's flag and never with
what core held, so a word mark that was on the paper and is not typed back **is gone**. §13 criterion
11 asserts that on STORAGE, not on the log. And *"only the first displayed field can be altered"*
(§10.8) is already the façade's `displayed` span, cleared after one alter (`machine.ts:427`).

**`keyBootstrap(text, marks)`** replaces `deckBox.ts`'s `findAlterBox()` (`:45-55`, a
`document.querySelectorAll('input[type="text"]')` walk keyed on a label's text node) and its
copy-and-paste fallback (`:131-137`), both DELETED in wave 3. It requires
`keyboard.state === 'data'` — i.e. the operator has actually turned the rotary to ALTER and pressed
START — and feeds `BOOTSTRAP_KEYSTROKES` (`loader.ts:53-58`, derived from `BOOTSTRAP_CHANNEL_1 =
'AL%1000012$R'` at `:26` and the word-mark positions 1 and 11 at `:29`) through `press()` and
`pressWordMark()` **one character at a time**, through the same keyboard a person uses. It saves
typing, not steps. The replacement breaks at `npm run typecheck` rather than silently at run time,
which is the whole of DECISIONS.md 2026-08-31's argument against DOM selectors across views — and
this phase is where that prediction comes true.

### 6.5 The keyboard, and focus ownership

**Drawn from Fig.43 p.47 [verified]** (A22-0526-3; S223-2648 Fig.8 p.11): the WORD MARK key at the
far left of the QWERTY row; LOCK and SHIFT; INQUIRY RELEASE, INQ CAN and a **tall** INQUIRY REQUEST
at the right. Number-row key tops `4`→`:`, `5`→`@`/apostrophe, `6`→square root, `7`→`>`, `0` printed
as slashed `Ø` with `b` above, the next key `ƀ` over `‡`, then `=#`; the QWERTY row carries the IBM
specials (`#` over W, `)` over E, `%`). The key tops are drawn because the figure gives them, with
the dual-legend caption on the view — **"which of the two glyphs actually prints depends on the type
element"**, §2's own words. The uncertainty is about which of a PAIR prints, not about what the keys
are, so refusing to draw them would discard verified period content. **A drawn key gets a pressed
state — inset and colour — and nothing more**: §15 `NO_KEY_TRAVEL_ANIMATION` refuses travel,
keycap depression depth and detent torque, none of which console-and-physical.md §3 publishes.

**There is no backspace on this keyboard, and no `backspace()` on `ConsoleKeyboard`.**
console-and-physical.md §2 `[verified]` — S223-2648 p.78; A22-0526-3 p.45: the physical Backspace
key IS INQUIRY RELEASE, and *"Carrier return, backspace and index cannot be commanded from the
keyboard."* The only backspace in the sources is the machine's own, inside the WORD MARK key's
action (io.md §8 step 4), and the only operator correction is INQ CAN (step 6), which discards the
whole entry — so a mistyped address or alter line is cancelled and retyped, exactly as at the desk.
An earlier draft of this plan put a backspace key on the keyboard; it is withdrawn here.

**The WORD MARK key is a separate, non-repeating method** — `pressWordMark()`, not a `^` inside
`press()`. *"Word-mark and space keys are non-repeating"* (S223-2648 p.78, [verified]), and io.md §8
step 4 describes the real mechanism: *"The Word Mark key prints a word mark then backspaces; the next
key entered enters both the word mark and the character."* The `^` convention survives exactly one
place in the project — `keyed()` in the byte-frozen `controls.ts:123`, which `ConsoleKeyboard.take()`
is asserted against on a corpus — so there is ONE `^` parser and it is on the internals tab where a
text box is honest.

**Focus ownership — completeness critic item 1, in full, and it is the single most likely shipped
defect in the phase.** The period surface puts a keystroke-driven Selectric on the same page as three
`<textarea>`s (the coding sheet, the spec sheet, the deck box) and, on the other tab, two `<input>`s
in `controls.ts`. The ruling:

1. **The console region is a focusable element** — `tabindex="0"` on the wrapper
   `console/keyboardView.ts` returns, with a visible focus ring, so a person can see where the
   keystrokes are going.
2. **`keydown` is bound to THAT element and nowhere else.** `console/keyboardView.ts` is the only
   file in `src/ui/period/**` that calls `addEventListener('keydown'` or
   `addEventListener('keypress'`, and **no file anywhere under `src/ui/**` binds a listener on
   `document` or `window`**.
3. **`ConsoleKeyboard.press` has exactly three callers, all under `src/ui/period/console/`**: the
   `keydown` handler on the console region, the drawn key tops' click handlers, and
   `ConsoleSession.keyBootstrap` — the deck box's `key the bootstrap` button calls
   `session.keyBootstrap`, never `press`. **The invariant is about KEYSTROKES**: a keystroke that
   did not land on the console region cannot reach `press`, whatever the keyboard's lock state is.
4. **The named case: typing in the coding sheet while the MACHINE ROOM tab is visible must not reach
   the carrier.** Both are on screen at once — that is what the desk is — and this is the case a
   `document`-level listener silently breaks by eating the operator's source into the console log.
5. **Unlocking the keyboard MOVES FOCUS to it.** `ConsoleSession` takes a `focus(): void` hook from
   `console/mount.ts` — the keyboard wrapper's own `.focus()` — and calls it **whenever the keyboard
   UNLOCKS**: START in the DISPLAY detent, START in ALTER, and INQUIRY REQUEST. Without it,
   storyboard steps 9-10 and §6.3 steps 3-4 and 7-8 type nothing: START / STOP / PROGRAM RESET /
   COMPUTER RESET are a SIBLING view (`console/keysView.ts`, §3.3), so clicking START moves focus to
   the START button and the next `keydown` bubbles from there and never reaches the wrapper.
   `ConsoleKeyboard.unlock()` is unchanged and stays DOM-free (§4.7); the session calls
   `hooks.focus()` beside it, which is why the hook lives on the session and not on the keyboard.

`test/period-keydown-ownership.test.ts` (~40 lines, wave 4) makes rulings 2 and 3 mechanical in two
cases: over `src/ui/period/**`, `addEventListener('keydown'` and `addEventListener('keypress'` appear
in exactly one named file, and `document.addEventListener(` / `window.addEventListener(` appear in
none; **and `.press(` appears only under `src/ui/period/console/**`**, which is ruling 3's caller set
as an assertion. §15's
new row `KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT` (ruling, ours) carries it,
§13 criterion 18b gates it, criterion 19 carries ruling 5's named observation — after START the next
keystroke lands on the Selectric with no click — and §14 R2′ names it as a risk.

### 6.6 The inquiry hold

**INQUIRY REQUEST does two things.** It calls `machine.console.requestInquiry()` — io.md §8 step 1,
the key that *"sets the inquiry status latch in the 1411"* (`console1415.ts:156`), which lights the
lamp and is what `J iiiii Q` tests — **and** it sets `ConsoleSession.held`. The keyboard unlocks at
matrix 30.

**The frame stops calling `machine.start` while held.** Phase 4's animation frame lives in
`src/ui/main.ts` and is the only one in the project (§10.2,
`test/period-no-second-frame-loop.test.ts`). It calls `machine.start(START_BUDGET)` only when the
`running` flag `controls.ts`'s `run` / `halt` hooks set is on, the tab is visible, and **`held` is
false**. Nothing in `src/core` is involved:
`step()` stays synchronous and promise-free, exactly as `architecture.md` §2 fixes it.

**RELEASE and INQ CAN call `supply()` and clear `held`.** `machine.console.supply({ text, wordMarks,
ending })` (`console1415.ts:166`) queues the line; `held` drops; the loop resumes. The `I` line is
typed when the program's `RCP` executes, inside `read()` (`console1415.ts:311-313`), which is where
it belongs in the log — the operator's characters are already known, but the machine has said nothing
until then. Until it does, the typed line sits on the drawn form as a `PendingEntry` row (§4.8) in a
style visually distinct from a printed `ConsoleLine`, because **nothing is on the paper yet**.

**The latch is the UI's own, and this is not a preference.** `Console1415.pendingRequest` is cleared
by the device inside `precheck()` (`console1415.ts:199`) and inside `read()` (`:290`, `:316`). A run
loop gated on that flag **deadlocks on a program that requests inquiry and never reads**, and it
releases early on one that does. `inquiryView.ts:68` reads the device flag today for a LAMP, which is
correct and stays correct; a hold is a different question and takes a different latch.

**Two divergences from the hardware, stated rather than hidden** (§15
`INTERACTIVE_INQUIRY_HOLDS_THE_UI_RUN_LOOP`, a ruling that narrows a Phase-2 constant):

1. **The keyboard unlock moves from the program's `RCP` to the operator's key press.** On iron,
   io.md §8 step 3 has the console print `I` and unlock the keyboard when the program reads; here the
   operator's INQUIRY REQUEST unlocks it and the `I` line still types at read time.
2. **The wait moves from the CPU to the frame loop.** On iron the CPU waits while the operator types
   (steps 3-5); here the frame stops advancing the CPU.

Neither is observable to a program: core, the six channel indicators and the console log all end in
the same state, and only wall-clock ordering differs — which this emulator does not model.

**`INQUIRY_ENTRY_IS_PRE_SUPPLIED` stays `true`**, with its scope narrowed and its wording amended in
the dated Phase 4 section of `docs/research/open-questions.md` (its existing row is at line 364). The
amendment is one clause: the row's fallback currently reads *"the operator's line is **queued by
RELEASE / CANCEL and consumed when the read executes**"*, and Phase 4 adds — **"and from Phase 4 the
UI additionally HOLDS its own run loop between INQUIRY REQUEST and RELEASE, so the operator types
into a stopped machine; the hold latch is `ConsoleSession.held` in `src/ui/period/console/session.ts`
and is deliberately NOT `Console1415.pendingRequest`, which the device clears inside `precheck()` and
`read()`. The constant's own claim — that the ENTRY is pre-supplied to the device — is unchanged."**
Nothing above that row is edited; a correction to `console-and-physical.md` remains an escalation
with its own commit (§3.7).

**The refused alternative, with its cost.** Making `Console1415.read()` block would be the faithful
model, and it is refused: it puts an **async seam in `step()`**, which `architecture.md` §2 fixes as
synchronous and promise-free and which every tier-1 through tier-4 test drives synchronously — 99
test files, `tools/run-deck.ts`, `tools/run-cor.ts` and the cc01 gate among them. The change is not
three lines in a device; it is a promise in the middle of the instruction loop for no observable
gain. Dropping the hold instead costs three lines in `console/session.ts` and returns the behaviour
Phase 2 shipped: the program's console read returns Figure 45's No Transfer whenever nothing has been
supplied.

---

## 7. The 1402 and 1403 stations

Two stations, both drawn from `MachineState` and both drawn as PANELS rather than elevations (§2.2,
§15 `NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED`, `THE_1402_ELEVATION_IS_NOT_DRAWN`). Every number below
says which machine it belongs to and cites its page. The rule that makes them gateable is §0 bullet
1: **`printer/*View.ts` and `reader/*View.ts` compute nothing** — the numbers live in
`period/paper/page.ts`, `paper/carriage.ts`, `paper/chain.ts` and `paper/cardGeometry.ts`, tested in
node (§3.2, §12.1).

### 7.1 The 1402 — file feed, five pockets, the Fig.60 strip, and a punch that does not punch

**Model 2 numbers, all `[verified]`** (console-and-physical.md §7; A22-0526-3 pp.59-61, Figs.58-60).
Every one of them is a 1402 fact, not a 1401 one.

| Number | Value | Page |
|---|---|---|
| Reader speed | 800 cpm | A22-0526-3 pp.59-60, Figs.58-59 |
| Punch speed | 250 cpm | A22-0526-3 pp.59-60 |
| File feed capacity | 3,000 cards | A22-0526-3 pp.59-60, Figs.58-59 |
| Radial stackers | five, 1,000 cards each | A22-0526-3 pp.59-60 |
| Stacker labels, left to right | `0 (NP) · 4 · 8/2 · 1 · 0 (NR)` | A22-0526-3 pp.60-61 |
| Reader-selectable pockets | 0 (NR), 1, 8/2 | A22-0526-3 pp.60-61 |
| Punch-selectable pockets | 0 (NP), 4, 8/2 | A22-0526-3 pp.60-61 |
| Read-feed travel | face down, 9-edge first, right to left | A22-0526-3 p.59 |
| Punch-feed travel | 12-edge first, left to right | A22-0526-3 p.59 |
| Reader start / punch start | feeds three cards / two cards | A22-0526-3 p.60 |

**Five pockets, not six, and the sum is carried across verbatim.** `8/2` is ONE pocket seen from two
feeds, so `stackerView.ts` moves `readerView.ts:29-34`'s `pocketCounts` unchanged, comment included —
`[p.stackers['0'], p.stackers['4'], r.stackers['8-2'] + p.stackers['8-2'], r.stackers['1'],
r.stackers['0']]` — because that function is the only place in the project that knows the two device
counts are one physical pocket (`types.ts` §8's own note on `MachineState.reader`). It is drawn as
five radial pockets in published left-to-right order with the count under each, and the shared pocket
carries a one-line caption naming both feeds.

**The Fig.60 key and light strip, in its published order** (console-and-physical.md §7 `[verified]`,
A22-0526-3 Fig.60 p.61), reproduced as `KEY_LABELS` and `LIGHT_LABELS` in `reader/keysView.ts`:

```text
keys    PUNCH START · PUNCH STOP
lights  PUNCH READY · CHIPS · PUNCH CHECK · PUNCH STOP · STACKER · POWER · FUSE ·
        TRANSPORT · VALIDITY · READER READY · READER CHECK · READER STOP
keys    END OF FILE · READER STOP · READER START
```

Two legends occur twice — `PUNCH STOP` as both a key and a light, `READER STOP` as both a light and a
key — so `keysView.ts` keys its records by strip position and never by label, and the wave-3 test
asserts seventeen entries — 2 + 12 + 3 — against §7's own line rather than a de-duplicated set. **There is no LOAD key
on this strip** (§2.2 item 3), and the absence is asserted as a string over `KEY_LABELS`, not as a
comment.

**Of the five keys, exactly two are wired**, and the reason is the façade rather than taste:

| Key | Façade call | Drawn |
|---|---|---|
| READER START | `machine.readerStart()` (`machine.ts:135`) | live |
| END OF FILE | `machine.readerEndOfFile()` (`machine.ts:137`) | live |
| PUNCH START | none | inert |
| PUNCH STOP | none | inert |
| READER STOP | none | inert |

`Machine`'s whole unit-record surface is `loadDeck`, `readerStart`, `readerEndOfFile` and `endOfJob`
(`machine.ts:130-148`). **READER STOP is inert because no call exists for it**, and the plan says so
on the page rather than drawing a key that looks live and does nothing — the same honest-absence shape
a dark lamp has.

**The punch feed ruling** (critic item 2; §15 `PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT`). §7 is
`[verified]` on a five-pocket stacker bank whose first two labels are the punch's, on 250 cpm, and on
a key strip whose first two keys are PUNCH START and PUNCH STOP. Omitting the punch feed would misdraw
a verified figure. **So the punch feed is drawn per Fig.59, its hopper is drawn EMPTY, PUNCH START and
PUNCH STOP are drawn inert, and one line under the station reads: *this 1402 reads and does not
punch*.** `MachineState.punch` carries stacker counts only, and nothing in this configuration writes
to the punch, so the two punch-selectable pockets sit at zero and say why.

**Of Fig.60's twelve lights, not one has a `MachineState` field behind it.** `MachineState.reader` is
`{ hopper, buffered, eofKey, eofLatch, stackers }` (`types.ts` §8) and none of those is any of the
twelve published legends. So the light strip is drawn dark under the same not-modelled legend §8 gives
the 1415 panel, with one exception stated rather than smuggled: **POWER is drawn lit as a constant** (§15 `POWER_AND_READY_ARE_DRAWN_LIT`),
the same ruling `console/keysView.ts` makes for the 1415's POWER ON key and its separate READY light
(§3.3). It is an entry of `LIGHT_LABELS` and it is drawn lit because it is named in the same file's
exported `LIT_CONSTANTS` list — **no `Lamp` record and no `source` field are involved**, since
neither lamp is in `PANEL_BOXES` at all — and `test/period-reader.test.ts` asserts the drawn
strings. The view captions it as a constant. The three latches this emulator DOES
model keep `readerView.ts:23`'s own labels — `EOF KEY`, `EOF LATCH`, `READ BUFFER` — on a separate
strip captioned as the emulator's, next to END OF FILE, exactly as END OF JOB is captioned at the 1403
(§7.2).

**The hopper draws the LOADED deck, not the parsed one** (critic item 7; §15
`THE_HOPPER_DRAWS_THE_LOADED_DECK`). `unitrecord/session.ts:40-46` is explicit: "the cards still
waiting are the LAST `reader.hopper` of the deck that was loaded — editing the textarea afterwards
changes `deck` and must not change what the reader is holding." `hopperView.ts` therefore draws
`session.hopperCards(reader)` (`session.ts:68-70`) and **never `session.deck`**, and the wave-3 test
re-proves the freeze against the view's input: load a deck, read two cards, edit the deck box, assert
the drawn hopper is unchanged. The visible bug this refuses — the drawn hopper following the textarea
while the machine holds something else — was live in all three panel designs.

**And every card face says which deck it belongs to.** `cardFaceView.ts` takes
`renderCardFace(card, caption, scale)`, and the caption is not optional:

| Face | Caption | Source |
|---|---|---|
| A card still in the file feed | `loaded deck, card N` | `session.hopperCards(reader)` |
| A card in the deck box below | `deck box, card N` | `session.deck` |
| The card in the 1414 read buffer | `read station, card N` | `session.bufferedCard(reader)` (`session.ts:71-76`) |
| A condensed object card | `object deck, card N` | `objectDeckView.ts`'s `encodeObjectRecord` |
| The execute card | `execute card — E in column 1` | `executeCard(entry)` |

Two of those five can hold different bytes at the same moment, which is precisely why the caption is a
required parameter and not a default. **The five templates are exported as `CARD_CAPTIONS`** — data,
built at import time and never a node, which is a rule of `cardFaceView.ts` and not an accident
(§3.3) — and `test/period-reader.test.ts` imports THAT export and asserts the five in node. WHICH
template a station passes is criterion 19's eye check, since no node test may instantiate the view
(§13 criterion 13).

**The file feed is drawn as edge slivers with a count, never one node per card.** At most **forty**
slivers against the 3,000-card capacity plus the literal count from `MachineState.reader.hopper`; a
3,000-node stack would be redrawn on every frame the machine is running. The sliver count is a
rendering decision with no source behind it, so it is a `paper/`-side constant with a test, not a
number in a view — and not a ledger row, because it is a rendering budget with a test, not an
uncertainty about the machine.

**The card face, at three scales, from ONE geometry module.** `paper/cardGeometry.ts` carries what
`cardView.ts:32-45` carries today — 7 3/8 × 3 1/4 in card, 0.087 in column pitch, 0.250 in row pitch,
0.055 × 0.125 in rectangular holes, the interpretation band across the top 3/16 in, one diagonal cut
at the upper LEFT corner — all `[likely]` from secondary sources (console-and-physical.md §10, §13
rows 4-6; §15 `CARD_GEOMETRY_IS_SECONDARY`, `CARD_SIZE_7_3_8_BY_3_1_4`, `CORNER_CUT_IS_UPPER_LEFT`).
`[verified]` in that table and drawn as such: 80 columns, 12 rows, the band, and the printed face's
arrangement (IBM 22-5526-4 p.8, Figs.3-5 pp.9, 12). The band prints `glyphOf`'s **64** characters, not
the 1403's 48 — the ruling the shipped `cardView.ts:13-17` already makes, carried as §15
`INTERPRETATION_BAND_PRINTS_THE_64_GLYPH_SET` `[unverified]` because no source names the punch's own
print set. Holes are derived from stored BCD by `punchMask` (`src/formats/card.ts:48`);
there is no second punch table, and `test/period-cardgeometry.test.ts` asserts `holePath` agrees with
`punchMask` for every punchable code. Card stock colour is `[unverified]` and is one CSS custom
property (§15 `CARD_STOCK_IS_CREAM`, §10.3).

### 7.2 The 1403 — the form, the stack, the tape, and a panel that stays dark

**Model 2 numbers, all `[verified]`** (console-and-physical.md §8; A22-0526-3 p.67, Fig.68, pp.68-69;
GA24-3073-8 pp.14-16), except the last two rows, which are the reason the plain-white toggle exists.

| Number | Value | Confidence · page |
|---|---|---|
| Print positions | 132 (Model 2) | `[verified]` A22-0526-3 p.67 |
| Character pitch | 10 cpi — a 13.2 in line | `[verified]` A22-0526-3 p.67 |
| Line pitch | 6 or 8 lpi, by the feed clutch | `[verified]` A22-0526-3 p.68 |
| Speed | 600 lpm | `[verified]` A22-0526-3 p.67 |
| Character set | 48 graphics; chain in five 48-slug sections | `[verified]` A22-0526-3 p.67, Fig.68 |
| Green-bar 14 7/8 × 11, 1/2 in bars = 3 lines at 6 lpi | drawn | `[likely]` §13 row 7 — §15 `LINES_PER_BAR_IS_THREE` |
| Whether 1961-65 1410 sites used green bar at all | toggle | `[unverified]` §13 row 8 — §15 `GREEN_BAR_IS_THE_DEFAULT_WITH_A_WHITE_TOGGLE` |

600 lpm is a **speed spec, not a motion spec**, and nothing on this station animates at it (§2.2, §15
`FORM_FEED_IS_A_SLIDE_NOT_A_SIMULATION`). The plain-white toggle is carried across from
`printerView.ts:61-70` as the `[unverified]` row's own fallback, a toggle and not a setting.

**The form.** `formView.ts` draws one line element per line position and **sets `textContent` from
`FormPage.lines`, computing nothing** — the padding to **132 fixed positions** has already happened
in `paper/page.ts`, where `PRINT_POSITIONS = 132` now lives (moved from `printerView.ts:28` with its
comment, §3.2, §4.1). A `FormPage.lines` entry is exactly 132 characters, padded and never sliced —
a `PrintLine.text` is already ≤132 by the device (`printer1403.ts:498`) — so a printed line
**never wraps**, and
`test/period-page.test.ts` asserts the length in node, on the DOM-free module, rather than on a view
a `environment: 'node'` run cannot construct. That is the assertion that catches a wrap before a
person sees it, and it is bullet 1 applied to the one number the form is measured in.
The lines live in a `width: max-content` wrapper and not directly in the `<pre>` —
`printerView.ts:72-78`, comment carried across verbatim: *"a block child of a horizontally scrolled
box paints its background
only to the VISIBLE width, so a shaded bar would stop at the scroll edge instead of running the length
of the form."* The 132-position ruler is inside the same wrapper, so **the ruler scrolls with the
form** rather than sitting above a box that moves under it.

**The printed stack.** `paginate(paper, carriage, 66)` (§4.1, §5.1) returns one `FormPage` per form,
**all 66 line positions including the blanks**, which is the whole reason it exists and is not
`renderGreenBar` — `renderGreenBar`'s rule 2 stops at the highest printed line on the form
(`printer1403.ts:700-706`) because a golden diff wants no trailing blanks, and a stack you scroll back
through wants the paper. A completed form **slides onto the stack in one 200 ms transform** and is
scrollable back to. The relationship between the two renderers is an ASSERTION and never a call: §15
`PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR`, gated by the grep in §12 and by criterion 8.

**The carriage tape strip, drawn beside the form.** A twelve-channel loop strip carrying
`machine.printer.tape`'s punches — handed over at construction, the same object the device skips
against, exactly as `unitrecord/mount.ts:47` does it today, because `MachineState.printer` carries
`CarriageState` and the punch lines are not derivable from it. On `DEFAULT_CARRIAGE_TAPE`
(`printer1403.ts:212`, `[unverified]`, §15) that is channel 1 at line 1, channel 9 at 57, channel 12 at
60 on a 66-line form. The brush is drawn at `CarriageState.line`. The channel-9 and channel-12 lamps
beside it read `carriage.channel9` / `carriage.channel12` straight from the snapshot — and they are
labelled as the EMULATOR'S, because §8's Fig.69 panel has no channel-9 or channel-12 lamp; those two
indicators are CPU-testable machine state (`J (I) 9`, `J (I) @`; io.md §5 Figure 35, A22-0526-3 p.36),
not 1403 front-panel lamps.

**Crossed punches are drawn HATCHED, with the banner asserted verbatim.** `straddled(from, to, tape)`
returns the punches a motion crossed without ending on (§4.2, §5.2), and each one is hatched on the
tape strip under a banner whose text `test/period-printer.test.ts` pins character for character:

```
channel 12 at line 60 passed unsensed — CARRIAGE_SENSES_AT_DESTINATION_ONLY (src/core/devices/printer1403.ts:354)
```

Naming the constant and its line IN the banner is deliberate: a later silent "fix" to the carriage
model fails a test rather than quietly removing a page annotation. The divergence is recorded, not
fixed — §15 `STRADDLE_IS_SHOWN_NOT_FIXED` /
`CROSSED_PUNCH_IS_DERIVED_FROM_THE_LAST_PRINT_AND_THE_FINAL_CARRIAGE` — because the real fix is
`printer1403.ts:347-352`'s own documented one and it would move `test/golden/cycle-probe.page.txt`
(§2.2).

**The front panel, drawn dark, in §8's own wording.** `panelView.ts` reproduces
console-and-physical.md §8's two-row sentence exactly as the research states it (A22-0526-3 pp.68-69,
Figs.69-71) and **does not split it into keys and lights, because §8 does not**:

```text
Fig.69 top row     PRINT READY · END OF FORMS · FORMS CHECK
Fig.69 second row  CARRIAGE RESTORE · CARRIAGE SPACE · SINGLE CYCLE · PRINT CHECK ·
                   SYNC CHECK, with CHECK RESET and CARRIAGE STOP
Fig.70             PRINT START (dark) · PRINT STOP (light) — on the front, REPEATED on the rear
```

All of it is drawn dark, in **one lamp colour** (§15 `LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS`,
`LAMP_GROUPS_ARE_SILKSCREEN_NOT_LENS_COLOUR`, both `[unverified]`, both one CSS custom property).
**The specific 1401 temptation here is END OF FORMS and FORMS CHECK glowing red**, and it is refused
by name in `printer/panelView.ts`'s header, in `period.css`'s own comment and in PHASE-4-NOTES:
console-and-physical.md §11, *"The claim that labels light up red on fault is from a **1401** page and
does **not** transfer to the 1415"* `[unverified for 1410]`. Nothing on this panel is wired; the two
legends the machine could arguably drive (PRINT READY, PRINT CHECK) have no `MachineState` field and
carry `source: null` like the rest.

**There is no END OF JOB key on a 1403.** §8's Fig.69/Fig.70 inventory does not contain one, and
`machine.endOfJob()` is this emulator's own control — `machine.ts:453` is literally
`endOfJob(): void { printer.flush(); }`, framed at `machine.ts:139-148` as *"the operator tearing the
form off … it performs the automatic single space the last print armed and nothing else."* So it is
**placed at the paper stack, not on the panel**, captioned as the emulator's, in the same shape as the
1402's EOF-latch strip (§7.1). Putting it among Fig.69's legends would invent a key the machine did
not have.

**What does not appear on this paper: word marks** (§15 `NO_WORD_MARKS_ON_THE_1403_PAGE`,
`[verified]`). Under the `L` op code a word mark becomes a word-separator character on the way to the
print buffer, and there is no word-separator print slug — so **a BLANK precedes each word-marked
character on the page** (charset.md §7; A22-0526-3 p.80 Figure 88). The form draws no overstrike, and
one line under it says what the blank is. It is recorded rather than left to inference so that nobody
carries the Selectric's inverted circumflex (§6.1) onto the green bar to make the two surfaces agree —
the two surfaces are different machines printing different things, which is the point.

---

## 8. The indicator light panel, and what it refuses

`period/console/lamps.ts` is DOM-free (§3.8), and it is where console-and-physical.md §5's
`[verified]` panel becomes data. `lightsView.ts` draws it and computes nothing.

**The box order, reproduced left to right as §5 publishes it** (`[verified]` — S223-2648 Fig.3 p.8;
lamp inventories A22-0526-3 Figs.49-55 pp.52-55). This is `PANEL_BOXES`'s order and the order on the
page:

```text
CENTRAL PROCESSING UNIT (I RING · A RING · CLOCK · SCAN/SUB SCAN · CYCLE · ARITH)
  | STATUS
  | I/O CHANNEL CONTROL (CH1, CH2)
  | I/O CHANNEL STATUS (CH1, CH2)
  | SYSTEM CHECK (PROCESS, PROGRAM)
  | POWER
  | SYSTEM CONTROLS
```

**§5 carries its own correction note, and it names the exact mistake a builder makes:** *"STATUS is a
labeled column immediately right of ARITH — do not omit it, and do not place I/O CHANNEL CONTROL
directly after the CPU box."* `test/period-light-panel-vs-research.test.ts` has a case for precisely
that — STATUS present and immediately right of ARITH — because the research file went to the trouble
of predicting the error.

**Every lamp inventory, quoted from §5's table**, one row per published lamp position;
`PANEL_BOXES` carries all but `OMITTED_LAMPS`'s eight entries (eighteen positions, §8.2), and each
row it carries has its own `cite`:

| Box · group | Lamps |
|---|---|
| CPU · I RING | OP, 1-12 |
| CPU · A RING | 1-6 |
| CPU · CLOCK | A, B, C, D, E, F, G, H, J, K |
| CPU · SCAN / SUB SCAN | N, 1, 2, 3 / U, B, E, MQ |
| CPU · CYCLE | A, B, C, D, E, F, I, X |
| CPU · ARITH | CARRY IN, CARRY OUT, A COMPL, B COMPL |
| STATUS | B>A, B=A, B<A, OVERFLOW, DIVIDE OVERFLOW, ZERO BALANCE |
| I/O CHANNEL CONTROL · CH1, CH2 | INTERLOCK, RBC INTERLOCK, READ, WRITE, OVERLAP IN PROCESS, NOT OVERLAP IN PROCESS |
| I/O CHANNEL STATUS · CH1, CH2 | NOT READY, BUSY, DATA CHECK, CONDITION, WRONG LENGTH RECORD, NO TRANSFER |
| SYSTEM CHECK · PROCESS | A CHANNEL, B CHANNEL, ASSEMBLY CHANNEL, ADDRESS CHANNEL, ADDRESS EXIT, A REGISTER SET, B REGISTER SET, OP REGISTER SET, OP MODIFIER SET, A CHARACTER SELECT, B CHARACTER SELECT |
| SYSTEM CHECK · PROGRAM | I/O INTERLOCK, ADDRESS CHECK, RBC INTERLOCK, INSTRUCTION CHECK |
| POWER | THERMAL, CB TRIP, I/O OFF LINE, TAPE OFF LINE, DISK OFF LINE |
| SYSTEM CONTROLS | 1401 COMPAT, OFF NORMAL, PRIORITY ALERT, STOP |

**SIX STATUS lamps against SEVEN indicator latches, and the seventh is a recorded absence.** §5's
STATUS box lists exactly six: B>A, B=A, B<A, OVERFLOW, DIVIDE OVERFLOW, ZERO BALANCE. This emulator
carries seven latches (`types.ts:57-59` `IndicatorName`; opcodes.md §8 — three arithmetic, four
compare), the seventh being **compare-unequal**, which A22-0526-3 p.28 gives as an unconditional
branch condition alongside high / equal / low. **UNEQUAL has no lamp on the 1415 panel**, so it
appears on the internals tab only — architecture.md §6 names "the **seven** indicator latches" for
that surface and §5 names six for this one, and the two are not in conflict. §15
`UNEQUAL_HAS_NO_LAMP_ON_THE_1415_PANEL`, `[verified]` absence, so that a later reader does not "fix"
the panel by adding a seventh lens.

**Two semantics worth wiring, quoted from A22-0526-3 p.56** (`[verified]`, console-and-physical.md
§5). **OFF NORMAL** lights when any of six conditions holds: *print-out control INHIBITED; asterisk
insert OFF; cycle control not OFF; check control not STOP NORMAL; storage scan not OFF while the mode
switch is at CE; or address entry not NORMAL.* Not one of those six is modelled — every one is a CE
control behind the door §2.2 draws closed — so OFF NORMAL is `source: null` and its `cite` is that
sentence, which is a more useful artifact than a dark lamp with no explanation. **STOP** = *"system
stopped needing operator intervention"*, which this emulator can drive exactly.

### 8.1 What lights — sixteen lamps, counted

The drivable set is exactly what `MachineState` can answer, and the count is stated so that a
seventeenth lit lamp is a diff:

| Box · group · lamp | `MachineState` source |
|---|---|
| STATUS · B>A | `indicators.compareHigh` — the 1410 compares **B to A, never A to B** (opcodes.md §5.2 line 459, §6.1 line 484; A22-0526-3 p.28) |
| STATUS · B=A | `indicators.compareEqual` |
| STATUS · B<A | `indicators.compareLow` |
| STATUS · OVERFLOW | `indicators.arithOverflow` |
| STATUS · DIVIDE OVERFLOW | `indicators.divideOverflow` |
| STATUS · ZERO BALANCE | `indicators.zeroBalance` |
| I/O CHANNEL STATUS · CH1 · NOT READY | `channel1.notReady` |
| I/O CHANNEL STATUS · CH1 · BUSY | `channel1.busy` |
| I/O CHANNEL STATUS · CH1 · DATA CHECK | `channel1.dataCheck` |
| I/O CHANNEL STATUS · CH1 · CONDITION | `channel1.condition` |
| I/O CHANNEL STATUS · CH1 · WRONG LENGTH RECORD | `channel1.wrongLengthRecord` |
| I/O CHANNEL STATUS · CH1 · NO TRANSFER | `channel1.noTransfer` |
| I/O CHANNEL CONTROL · CH1 · INTERLOCK | `channel1.interlock` |
| SYSTEM CHECK · PROGRAM · ADDRESS CHECK | `stop === 'addressCheck'` |
| SYSTEM CHECK · PROGRAM · INSTRUCTION CHECK | `stop === 'instructionCheck'` |
| SYSTEM CONTROLS · STOP | `stop !== undefined` |

**Sixteen.** Six from `indicators` (`types.ts:57-59`), six from `ChannelStatus` (`types.ts:226-229`),
one from `channel1.interlock` (`machine.ts:479`), two from `StopReason`'s two check members, one from
"stopped at all" — lit while stopped, not latched until a reset (§15
`CHECK_LAMPS_FOLLOW_STOP_REASON_NOT_A_LATCH`). Everything else on the panel is `source: null` — **drawn dark and labelled
not-modelled in a legend**, never omitted, never invented. `test/period-light-panel-vs-research.test.ts`
asserts every non-null `source` names a field that exists on `MachineState`, so a renamed core field
breaks the panel at `npm run typecheck` and again at the test.

### 8.2 What is omitted rather than darkened, and why the distinction is load-bearing

A darkened lamp reads as an *uninstalled option on a machine that has the slot*. architecture.md §12
forbids implying that tape, disk, channel 2, processing overlap, the Priority feature or 1401
compatibility mode exist at all — five refusals in one line plus 1401 mode in the bullet before it.
So eight
entries are **absent from the drawn panel** and present in an EXPORTED exception list the both-directions test
reads (§15 `REFUSED_FEATURE_LAMPS_ARE_OMITTED_NOT_DARKENED`):

| `OMITTED_LAMPS` entry | Citation |
|---|---|
| I/O CHANNEL CONTROL · **CH2** column (six lamps) | architecture.md §12 "No tape, no disk, no channel 2, no processing overlap, no Priority feature" |
| I/O CHANNEL STATUS · **CH2** column (six lamps) | architecture.md §12, same line |
| SYSTEM CONTROLS · **1401 COMPAT** | architecture.md §12 "No 1401 compatibility mode. Settled." |
| POWER · **TAPE OFF LINE** | architecture.md §12 "No tape…" |
| POWER · **DISK OFF LINE** | architecture.md §12 "…no disk…" |
| I/O CHANNEL CONTROL · CH1 · **OVERLAP IN PROCESS** | architecture.md §12 "…no processing overlap…" — and io.md §4: an overlap x1 character stops the system on a machine without the feature |
| I/O CHANNEL CONTROL · CH1 · **NOT OVERLAP IN PROCESS** | architecture.md §12, same line — drawn dark it would also be the WRONG state, since on a machine with no overlap feature it is the permanently true one |
| SYSTEM CONTROLS · **PRIORITY ALERT** | architecture.md §12 "…no Priority feature" — io.md §5 describes it as special features 5620/5621 with their own alert mode; console-and-physical.md §3 calls the PRIORITY ON key and PRIORITY PROCESSING rotary the "Optional priority-feature **panel**", i.e. the feature's controls, so refusing the feature refuses its lamp |

**`PRIORITY ALERT` is among them, and that narrows one dossier graft.** The panel dossier kept the
lamp drawn dark on a panel-versus-feature distinction — §5 lists it in the SYSTEM CONTROLS box, and
what §12 was read as refusing was the PRIORITY ON key and the PRIORITY PROCESSING rotary. Round-1
review found the distinction is the dossier's own, not the research's: architecture.md §12 refuses
"the Priority *feature*", console-and-physical.md §3 names those two controls the "Optional
priority-feature **panel**" — the feature's controls — and nothing in §5 says the alert lamp is
fitted on a machine without the feature. The governing constraint is that the UI depicts nothing §12
refuses, so the lamp is **omitted**, with the two CH1 overlap lamps, and the wave-4 test asserts its
absence from `PANEL_BOXES` rather than its darkness.

**The panel is therefore a REDUCED panel, and it says so on the page** (critic item 3). §5's geometry
is `[verified]` from S223-2648 Fig.3 p.8, and a panel two columns and six lamps short of that figure
is not that figure. Arithmetic over §5's own table: 103 lamp positions published, 18 omitted (6 + 6 + 1 + 1 + 1 + 2 + 1), **85 drawn, 16 driven**. `lightsView.ts` carries a visible `REDUCED PANEL` label naming
what is missing and pointing at §12, and §13 criterion 14 checks the label's presence alongside the
both-directions diff. Without it the most authoritative-looking artifact on the desk is quietly a
fiction.

### 8.3 Colour, and the 1401 refusal in three places

One lamp colour for the whole panel: **warm-white / amber incandescent behind a clear-white lens on a
charcoal panel with white silkscreen legends**, groups separated by silkscreened box borders and
**never by lens colour**. Both are `[unverified]` (console-and-physical.md §13 rows 1 and 9) and both
are one CSS custom property each: §15 `LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS` and
`LAMP_GROUPS_ARE_SILKSCREEN_NOT_LENS_COLOUR` (§10.3). The 1401 red-fault convention is refused by name
in **three** places, because a period UI is where a 1401 photograph is most likely to be mistaken for
this machine: `console/lightsView.ts`'s header, `src/ui/styles/period.css`'s own comment, and
PHASE-4-NOTES.md — quoting console-and-physical.md §11: *"The claim that labels light up red on fault
is from a **1401** page and does **not** transfer to the 1415"* `[unverified for 1410]`. The 1403's
END OF FORMS / FORMS CHECK pair (§7.2) is the same refusal at its other point of use.

### 8.4 What the panel never shows

**No register contents, anywhere.** The `[verified]` negative in console-and-physical.md §2's
implementer summary — the 1410 shows no register contents in lights; every stop, display and alter
goes out on the typewriter — is the reason the internals tab exists at all (architecture.md §6). The
grep that makes it mechanical is over `MachineState` FIELD READS, not over label text, and the reason
is a trap: `OP` is a legitimate I-RING lamp legend and `A REGISTER SET` / `B REGISTER SET` /
`OP REGISTER SET` / `OP MODIFIER SET` are legitimate SYSTEM CHECK PROCESS legends, so a grep for
`REGISTER` would fail on correct data. §13 criterion 14's grep is:

```sh
grep -rnE '\.(iar|aar|bar|car|dar|ear|far|op|opMod|coreWindow)\b' \
     src/ui/period/console/lamps.ts src/ui/period/console/lightsView.ts   # → no matches
```

Zero matches at every wave. The panel renders `ON` / `off` and a legend, and never a value.

---

## 9. The two authoring stations, and Phase 5's invalidation

Two stations that this phase **restyles and may not re-implement**. Every session file Phase 3 and
Phase 5 shipped keeps its body (`autocoder/session.ts` excepted, +16 lines, §9.4), and both listing
goldens keep their bytes. The moves are `git mv` then edit, in wave 5 (§3.4).

### 9.1 The coding sheet — `period/coding/sheetView.ts`, from `autocoder/sourceBox.ts`

`git mv src/ui/period/autocoder/sourceBox.ts src/ui/period/coding/sheetView.ts`, 161 → ~190 lines.
**What survives, by name and by line:**

| Survives | Today | Why it must not be re-derived |
|---|---|---|
| `FRAMING` | `:27-34` | On the page VERBATIM. Phase 3's criterion 11b depends on it being there — "the artefacts are period-correct and the translator is not" |
| `PLUS_NOTE` | `:42-44` | §14 R10's other half: a typed `+` is the 12 punch, stored as `&` |
| `FIELD_NAMES` · `columnLegend()` | `:47-49` · `:52-58` | Derived from `SOURCE_FIELDS`, never hand-typed |
| `ruler()` | `:68-86` | Three lines computed from `SOURCE_FIELDS`, so a ruler that disagrees with the parser is not expressible |
| `codingArea()`, both `<textarea>`s | `:89-97`, `:122`, `:132` | Column-exact typing: monospace, `wrap = 'off'`, `spellcheck = false` |
| `SourceBox` type · `setText(source, dataCards)` | `:99-102` · `:138-144` | The typed hand-off §9.4 protects |

The field spans come from `src/asm/types.ts:18` `SOURCE_FIELDS` — page 1-2, line 3-5, label 6-15, op
16-20, operand 21-72, ident 76-80 — matching C28-0309-1 pp.5-7 `[verified]`. **The frame** is drawn
around the ruled box: a period sheet border and a header band, in CSS only. **The textarea stays a
textarea** (§2.2, §15 `THE_RULER_IS_THE_FORM`).

**The one sample button splits in two** — `sample program` / `sample data` — which PHASE-3-NOTES.md
line 219 invited ("Phase 4 restyles and may split the button"). `setText(sampleSource, sampleData)`
becomes two calls that each set one box and leave the other alone.

**`COMMENT_COLUMN` and `LABEL_INDENT_COLUMN` are drawn as marks on the sheet.** `src/asm/types.ts:24`
is `COMMENT_COLUMN = 6` — a `*` THERE and only there is a comments card; a `*` in column 21 is the
asterisk operand — and `:27` is `LABEL_INDENT_COLUMN = 7`, where a label beginning resolves high-order
even on a constant (software.md §5; C28-0326-2 p.28). **The parser reads both by absolute column**, so
the sheet marks both columns on the ruler rather than leaving a person to count. Two tick marks, no
new constants.

### 9.2 The spec sheet — `period/specs/sheetView.ts`, from `rpg/specBox.ts`

`git mv src/ui/period/rpg/specBox.ts src/ui/period/specs/sheetView.ts`, 104 → ~130 lines. `ruler(kind)`
(`:39-52`), `sheetOf(line)` (`:29-37`), `activeLine(box)` (`:54-57`) and the five listeners
(`:80-84` — four on `specs`: `input`, `click`, `keyup`, `select`; one on `data`: `input`) survive
exactly; the ruler is derived from
`SHEET_COLUMNS` (`src/rpg/sheets/columns.ts:175`, over `CONTROL_COLUMNS`, `INPUT_COLUMNS`,
`DATA_COLUMNS`, `CALC_COLUMNS`, `FORMAT_COLUMNS`) and redraws as the caret crosses from a `D` Data
line to an `L` Format line. A period header band is drawn around the box.

**NO facsimile X24-1336…1339 form is drawn, and this plan says so at Tom's gate rather than at
criterion 19.** PHASE-5-NOTES.md §4, verbatim: *"the RPG view is deliberately unstyled and presents
one specification textarea plus the per-sheet ruler. The ruler is the parser-backed specification for
the later drawn forms; no CSS or separate on-screen Input/Data/Calculation/Format sheets were added
here."* The forms' columns are `[verified]` (rpg-sources.md §6) and their artwork is **not digitised** —
no scan of any of the four exists (rpg-sources.md §3) — so drawing one would encode invented artwork
around verified columns, against `docs/research/README.md`'s "Do not encode" rule; the refusal
stands on the artwork alone. **This is the
largest deliberate fidelity gap in the phase** (§2.2, §14 R12, §15 `THE_RULER_IS_THE_FORM`). A
column-addressable facsimile form is a later phase of roughly **600 lines with its own oracle** — a
drawn form is only worth having if a card column and a form box are the same object, and proving that
needs its own test — not a stretch goal smuggled into wave 6. If Tom's real test of Phase 4 is *"does
the RPG tab look like a 1410 spec sheet"*, this plan does not pass it, and that is better known now.

### 9.3 The listing and the object deck

**`renderListing` is not touched, and that is what freezes the goldens** (critic item 5).
`test/golden/hello-dad.lst` is 2,251 bytes and `test/golden/sales-summary.lst` is 6,982 bytes, both
over `renderListing`'s output, whose first line is literally `1403 Model 2 · chain A · 66-line form`
(`src/asm/listing1403.ts:201-208` → `printer1403.ts:718`). Two consequences the plan states rather
than leaves to a builder:

1. **The C28-0326-2 §12 page heading goes AROUND the `<pre>`, never inside it** — date at left, HEADR
   centred, `PAGE n`, the 5-character identification, 55 lines per page (`/LIN/`), `[verified]`
   C28-0326-2 pp.10-11, 56-57. It is drawn as period furniture in the DOM above the paper. A heading
   rendered *into* `renderListing`'s text would move both goldens on the first commit.
2. **The 1401 Autocoder listing heading is refused by name.** console-and-physical.md §12
   `[verified]`: `SEQ PG LIN LABEL OP OPERANDS SFX CT LOCN INSTRUCTION TYPE CARD` — *"Do not mix it
   into a 1410 renderer."* The refusal lives in `coding/listingView.ts`'s header (§2.2 item 4).

**The A/H toggle now calls the shared `restrike()`.** The toggle already exists at
`listingView.ts:64-78` and repaints from the last rendered result. In Phase 4 it stops being a second
chain path: the view holds `renderListing(last.listing, { chain: PRINT_CHAIN_A_IS_DEFAULT })` once and
paints the H view as `restrike(body, 'H')` from `period/paper/chain.ts` (§4.3, §5.3), so the 1403 page
and the listing switch chains through **one** function and there is no second chain table in the
project. The restrike is exact: five dualed code points, none of the H glyphs on the A set, twelve
codes blank on both, `?` colliding with BCD 60 identically on both chains (charset.md §5 `[verified]`, §5.1 `[likely]` for the `?` cell).

**One wart the restrike has to carry, verified on `b7c60b3`:** `renderListing`'s FIRST line is `renderGreenBar`'s header and it prints the chain letter — `1403 Model 2 · chain A · 66-line form` (`printer1403.ts:734-737`; `test/golden/hello-dad.lst` line 1) — and that line contains none of the five dualed glyphs, so a whole-string restrike would leave the page reading `chain A` over H glyphs. The view therefore restrikes from the first `
` on and renders the header line from its own toggle state — two lines of code — and `test/period-chain.test.ts` asserts the painted string equals `renderListing(last.listing, { chain })` byte for byte for BOTH chains over BOTH shipped listings, which is the assertion that says `restrike` is the renderer's own transform and not a second table. Criterion 12 is unchanged.

**The object deck** draws its faces through `cardFaceView.ts` (§7.1) and keeps `objectDeckView.ts`'s
decode-don't-remember rule: the number under each face is what `decodeObjectRecord` reads back off the
punched card (`:46-52`), never what the packer intended, and the execute card is captioned rather than
decoded because `decodeObjectRecord` would rightly refuse it (`:57-66`).

### 9.4 Constraint 11, made mechanical — the one edit to a Phase-3 session body

`src/ui/period/autocoder/session.ts` gains **+16 lines**: `readonly stale: boolean`, set by
`setSource` and `setDataText`, cleared by `assemble()`, with `hopperText()` returning `''` while
stale. The shape is copied from `src/ui/period/rpg/session.ts:31` — `const invalidate = () => {
result = undefined; };`, called from `setSpecText` and `setDataText` — because Phase 5 already
settled it.

**The defect this fixes, stated against the file.** `autocoder/session.ts:46` is
`setSource(text): void { source = text; }` — **it does not touch `result`**. And `hopperText()`
(`:52-58`) returns `''` iff `result === undefined`. So:

- after an `assemble()`, a one-character edit to the source leaves `result` intact and `hopperText()`
  returns the **STALE object deck**;
- and "`setSource(x)` leaves `hopperText()` empty" is **vacuously true of any fresh session**,
  regardless of `setSource` — which is why that assertion, offered by one panel design as the existing
  node oracle for constraint 11, asserts nothing.

The real invalidation today lives in `autocoder/mount.ts:60-65`'s `invalidateArtifacts` closure — in
the DOM, where no node test reaches it. **`invalidateArtifacts` and the `punch.disabled` rule stay in
the mount and are byte-identical**; the mount additionally reads `session.stale`. §13 criterion 15 is
the node assertion: `assemble()`, then a one-character `setSource`, gives `stale === true` and
`hopperText() === ''`; and `test/tier4-autocoder-demo.test.ts` and `test/tier4-rpg-demo.test.ts` pass
with **only their import line changed** (§3.1), which is what says the session/adapter split survived
the restyle.

**The two typed hand-offs now cross a TAB boundary, and that is the thing the shell could break.**
`specs → coding` is `sheetView.setText(source, dataCards)`; `coding → reader` is
`deckBoxView.setText(text)`. Both are typed methods on exported types, and `docs/DECISIONS.md`
2026-08-31 recorded exactly why: the DOM-selector alternative *"was refused because Phase 4 rewrites
that DOM and a selector breaks silently."*

**This phase is where that prediction comes true.** `findAlterBox()` (`deckBox.ts:45-55`) walks
`document.querySelectorAll('input[type="text"]')` at `:48` looking for a text node whose content
starts `alter`; its call site is `:122` and its copy-and-paste fallback `:131-137`. The `<input>` it
hunts is `controls.ts:50`'s `altered`, whose only handle is the label text at `controls.ts:117`.
**Phase 4 deletes both the walk and the fallback** and replaces `key the bootstrap` with a typed
`keyBootstrap(text, marks)` into the `ConsoleSession` (§6.4), which feeds `BOOTSTRAP_KEYSTROKES`
through `press()` / `pressWordMark()` one character at a time. The replacement breaks at
`npm run typecheck` rather than at run time on a page nobody is watching — which is the whole of
DECISIONS.md's argument, now paid.

---

## 10. The page — shell, tabs, one frame loop, and the stylesheet

### 10.1 The shell — four files, none of which draws anything

| File | Lines | Owns |
|---|---|---|
| `src/ui/main.ts` | ~95 (new, wave 0) | ONE `createMachine({ size: 10_000 })`, three id lookups at start-up (`#app` and the two tab containers `index.html` carries), the two-tab shell, the ONE animation frame (§10.2), `import './styles/period.css'` |
| `src/ui/internals/mount.ts` | ~70 (new, wave 0) | Today's `internals/main.ts` body minus `createMachine`, the `#app` lookup, the RUN loop and the three sibling mount calls, plus the `View` adapter of §10.2's `mountInternals` paragraph: `mountInternals(machine, host, hooks): { readonly view: View }`, appending into `main.ts`'s `<div id="internals">`. Keeps the hairline rule, the anachronism note, and `controls.el` + `panel.el` **in that order**. `internals/main.ts` (54 lines) is deleted in the same commit (§11 RULE 2) |
| `src/ui/period/mount.ts` | ~120 (new, wave 5) | `mountPeriod(machine, host, hooks: { run; halt; kick })`, `host` being `<div id="machine-room">`: constructs every station, hands `hooks` down to `console/mount.ts`, wires the two typed hand-offs, returns the `View[]` and the `ConsoleSession` |
| `src/ui/period/desk.ts` | ~150 (new, wave 5) | The station layout in paper order, as one function from station elements to the machine-room grid |

**Mount ORDER and DISPLAY order are different on purpose, and the plan says so because a restyle
silently breaks it.** Mount order is a **data-dependency** chain — `mountReader` returns `deckBox`,
which `mountCoding` needs; `mountCoding` returns `sheetView`, which `mountSpecs` needs — the chain
`internals/main.ts:50-52` runs today. Display order is the **desk's**, in paper order: SPEC SHEET ·
CODING SHEET · 1402 · 1415 · 1403. `desk.ts` places station elements in named grid areas, so the two
**cannot disagree**: nothing depends on `host.append` order for layout, which is what
`unitrecord/mount.ts:70`, `autocoder/mount.ts:81` and `rpg/mount.ts:57` do today.

### 10.2 ONE animation frame, in `src/ui/main.ts`

The page has **two** rAF loops today — `unitrecord/mount.ts:89` and `:91`, and `internals/main.ts:34`
— three call sites in two files. **After Phase 4 there is exactly one call site in exactly one file.**
The frame gate from `unitrecord/mount.ts:28-37` moves into it unchanged in spirit — the gate that
"already stops an idle page paying for a `snapshot()` sixty times a second" — extended with the run
latch and the console session's inquiry hold. **The block below is the WAVE-5 form**, the end state;
the table under it says what the frame is at each earlier wave, because a builder reading only this
block at wave 0 would reach for four things that do not exist yet:

```ts
// src/ui/main.ts — the page's ONE animation frame, at wave 5. Nothing else under src/ui/** calls rAF.
let running = false;                 // set by controls.ts's `run` hook, cleared by `halt`
let dirty = true;                    // the first frame always renders
const kick = (): void => { dirty = true; };            // every operator action calls this

function frame(): void {
  // 1. EXECUTE. START_BUDGET instructions per frame (machine.ts:45 = 2000), so the console log
  //    and the paper animate instead of freezing until the program halts. `held` is the
  //    ConsoleSession's OWN inquiry latch (§6.6) — never Console1415.pendingRequest, which the
  //    device clears inside read() (:290, :316) and precheck() (:199), so a loop gated on it
  //    deadlocks on a program that requests inquiry and never reads.
  //    BOTH `detent` and `machine.mode`, never one instead of the other: a turn to DISPLAY or
  //    C.E. leaves machine.mode === 'run' (§6.2), while the byte-frozen controls.ts <select>
  //    (:80-85) can still move machine.mode on its own — and machine.start() dispatches on
  //    machine.mode (machine.ts:355-374), where `ieCycle` types a `C` line per call.
  if (running && !consoleSession.held && consoleSession.detent === 'run'
      && machine.mode === 'run') {
    if (machine.start(START_BUDGET) !== undefined) running = false;   // a stop ends the run
    dirty = true;
  }
  // 2. RENDER. ONE snapshot(), handed to every view of the VISIBLE tab; the hidden tab's views
  //    render on the frame after it is shown, because switching tabs calls kick(). `dirty` ALONE:
  //    the execute branch sets it when the CPU advanced, so a held or off-RUN frame renders
  //    nothing, which is the one case this gate exists to avoid.
  if (dirty) {
    dirty = false;
    const s = machine.snapshot();
    for (const v of (tab === 'machine' ? periodViews : internalsViews)) v.render(s);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

**What the frame is at each wave**, so every commit between wave 0 and wave 5 typechecks and runs:

| Wave | The frame, and the rAF count |
|---|---|
| **0** | `main.ts` owns the run loop at its simplest — `running && machine.mode === 'run'` → `machine.start(START_BUDGET)` — and renders `mountInternals`'s single returned `View`. The three transitional period mounts return `{ deckBox }` / `{ sourceBox }` / nothing (`internals/main.ts:50-52`'s shape) and §3.1 forbids changing their bodies, so **`period/unitrecord/mount.ts` keeps its own `requestAnimationFrame(tick)` at `:89` / `:91` UNCHANGED** — it is a moved file. `requestAnimationFrame(` is therefore in **TWO** files from wave 0 through wave 3, and `test/period-no-second-frame-loop.test.ts` is a wave-5 test for exactly that reason. |
| **1-2** | Unchanged. Wave 1 adds DOM-free modules; wave 2 edits `period/unitrecord/mount.ts`'s view list inside the loop it already owns. |
| **3** | `reader/mount.ts` returns `View[]`, and the `dirty` / `kick` gate moves from the mount into `main.ts` (§3.3's `main.ts` ±8 row). **ONE rAF file from here on.** |
| **4** | `consoleSession` arrives from `reader/mount.ts`'s return, and the `held` and `detent` terms join the execute gate (§3.3's `main.ts` ±6 row). |
| **5** | `mountPeriod` returns every `View` and the `ConsoleSession`; the block above is complete, and `test/period-no-second-frame-loop.test.ts` lands. |

**`mountInternals` returns a `View`, and that is what lets the panel live in the frame's render
loop.** `panel.ts:134` is `render(s: MachineState, note: string)` — a REQUIRED string the frame does
not carry — and the panel is created *inside* `internals/mount.ts`, so `main.ts` cannot supply
`internals/main.ts:25-27`'s `redraw` from outside either. The signature is therefore

```ts
mountInternals(machine, host, hooks: { run(): void; halt(): void; kick(): void }):
  { readonly view: View }
```

— `host` is `main.ts`'s `<div id="internals">` and the mount APPENDS into it, so the `View` is the
whole return — and the mount builds `createControls(machine, { run: hooks.run, halt: hooks.halt,
redraw: (message?: string) => { note = message === undefined ? '' : \`   ${message}\`;
hooks.kick(); } })`, keeping `note` as its own module-local string, while `view.render(s)` calls
`panel.render(s, \`MODE = ${label}${note}\`)`. **Both halves of that adapter are load-bearing**:
`controls.ts:39`'s `redraw(message?: string)` arrives with `message === undefined` on RUN and STOP,
so assigning it raw would render the literal `undefined` on the panel, and `internals/main.ts:26`'s
three-space separator is what keeps the note off the MODE label. That adapter is
the +15 lines over the dossier's `~55` (§3.1, §3.9).

`controls.ts` is byte-frozen and is **not** edited for this: its `Hooks` are already
`{ run, halt, redraw }` (`controls.ts:35-40`), so `main.ts` supplies `run: () => { running = true; }`
and `halt: () => { running = false; }` — what `internals/main.ts:31-41` supplies today in a different
shape. **`main.ts` supplies the `run` / `halt` pair, which `console/mount.ts` hands to
`createConsoleSession` beside its own `focus`** (§3.3, §4.8, §6.3 step 10, §6.5 ruling 5): the pair
travels down the `hooks` argument `mountReader` and later `mountPeriod` take, and `console/mount.ts`
is the one caller — so the STOP key, a rotary
turn and the period START key drive one latch through one pair of functions. **No
`document.visibilityState` check is needed**: browsers do not fire `requestAnimationFrame` callbacks
in a background tab, so the visible-tab term above is the PAGE's two-tab shell, not the browser's.
`src/ui/main.ts` is written in wave 0 and edited in waves 3, 4 and 5 (§3.3, §3.4, §10.7).

**The per-view diff key is carried across, and it is the framework, hand-written** — about ten lines
a view, roughly 120 lines in total, already shipped and already proved:

| View | Key | Today |
|---|---|---|
| reader | eight counts and latches joined | `readerView.ts:72-84` |
| printer / form | paper length plus five carriage fields | `printerView.ts:144-155` |
| inquiry | one boolean | `inquiryView.ts:64-74` |
| internals panel log | rebuilt only when `s.console.length` changes | `panel.ts:143-147` |

Phase 4's new surfaces — rotary, keyboard, light panel, form, hopper — are pure functions of
`MachineState` plus one local view-state value and follow the same pattern.
`test/period-no-second-frame-loop.test.ts` (~45 lines, wave 5) asserts `requestAnimationFrame(`
appears in **exactly ONE file** under `src/ui/**` and names it: `src/ui/main.ts`, so a third loop is
a deliberate edit to that test with its reason in the commit.

### 10.3 The stylesheet — `src/ui/styles/period.css`, ~640 lines, ONE wave

**Wave 5 is the sole owner of its CONTENT; wave 0 creates the FILE, empty.** `src/ui/main.ts` lands
in wave 0 carrying `import './styles/period.css'`, and Vite resolves that specifier **on disk**:
with no such file `npm run build` and `npm run dev` both fail, at every commit from wave 0 to wave 5.
**`npm run typecheck` does NOT catch it** — measured: with this `tsconfig.json`'s `compilerOptions`
and the ambient `declare module '*.css';` in the merged shim, `tsc --noEmit` exits **0** whether or
not the file exists — which is one more reason `npm run build` is in the per-commit gate (§12.2,
§14 R3). So wave 0 writes the file with **a five-line header comment and nothing else**
(`/* Phase 4 — owned by wave 5 (§10.3); created empty in wave 0 so main.ts's import resolves under
vite build. */`), and waves 1-4 do not touch it (§11's does-not-touch table). Waves 2-4 use inline
style attributes exactly as `printerView.ts:95`,
`:103-104` and `sourceBox.ts:118-119` do today — not a style preference: a stylesheet edited by five
waves is the one artifact in this phase with no test that judges its content (§14 R11), and
concentrating it makes the overrun visible in one place (§14 R13).

**It carries colour, type, spacing and the two paper textures, and NO number that matters.** 132, 66,
three-lines-per-bar, the card geometry, matrix 30 / 35, the rotary angles and the five duals all live
in TS with tests (§0 bullet 1); the one number that moves INTO it is `printerView.ts:38`'s
`BAR_SHADE = '#ececec'`, a colour.

**The lint, in `test/period-session.test.ts`:** no `@import` and no `url(http` (a second network
request on a static local deliverable); no `@font-face` (§10.4, §15 `NO_WEBFONT`); **no pixel width
on a form or card selector** (the form is 132 characters wide and the card is a `viewBox`, so a pixel
width is a number that matters in the file that must carry none); **no bare element selector**
(critic item 6, below).

**The `index.html` split, and it is two steps** (critic item 6). Its `<style>` block runs lines 6-35
(28 lines of CSS) and sets `body`, `hr`, `fieldset`, `legend`, `table`, `td`, `pre` and
`input, select, button` **globally**, with six shipped views depending on them by element and class
and no compiler in between. A period stylesheet that restyles `body`, `pre` and `table` restyles the
internals tab too, which defeats architecture.md §6's "visually foreign to each other on purpose".

- **Wave 0** scopes the seven selectors that are ALREADY internals-only under `#internals`:
  `.anachronism`, `.grid`, `.wide`, `.wm`, `#core`, `fieldset`, `legend`. `panel.ts`, `coreView.ts`
  and `registerView.ts` need no edit and every one of those keeps resolving.
- **Wave 5** scopes the rest and moves the period classes out, because only then is the last shipped
  view that needed each rule gone or restyled:
  `table` / `td` when `readerView.ts` is deleted (wave 3); `.on` / `.off` when `inquiryView.ts` is
  deleted (wave 4); and `pre`, `hr` and `input, select, button` **scoped under `#internals`** — NOT
  deleted, because **the period stations keep their `<pre>` elements**: `coding/sheetView.ts`'s guide
  (`sourceBox.ts:117`), `coding/listingView.ts`'s paper (`listingView.ts:62`),
  `specs/sheetView.ts`'s box (`specBox.ts:61`) and `specs/resultView.ts`'s three
  (`resultView.ts:46, :49`) all survive the restyle (§9.1's survivor table). The rules move; the
  elements stay, and `period.css` styles them under `#machine-room`. In the same step the four
  period classes leave `index.html:29-34` — `.card-face`, `.deck-box`, `.deck-errors` and
  `.green-bar` — because `period.css` takes them, which is what the stated end state requires.
- **`body` is never scoped** — it is the one selector that cannot be — so its rule stays in
  `index.html` as the page-wide default (`ui-monospace, Menlo, Consolas, monospace`, 13 px, 1 em
  margin) and `period.css` overrides type and colour under `#machine-room`, never on `body`. After
  wave 5, `index.html`'s block holds `body` and rules under `#internals`, and nothing else.

**The class inventory, with its consumers** (verified by grep on `b7c60b3`):

| Class | Consumers today | After Phase 4 |
|---|---|---|
| `.anachronism` | `internals/main.ts:47` | `internals/mount.ts` — `#internals` |
| `.grid` | `panel.ts:118` | `#internals` |
| `.wide` | `panel.ts:125, :127, :129` | `#internals` |
| `.wm` | `coreView.ts:55` | `#internals` |
| `#core` | `coreView.ts:20` | `#internals` |
| `.on` / `.off` | `panel.ts:164`, `readerView.ts:96`, `inquiryView.ts:73` | `#internals` only, after waves 3-4 |
| `.card-face` | `cardView.ts:92` | `reader/cardFaceView.ts`, name kept — `period.css` |
| `.deck-box` | `deckBox.ts:72` | `reader/deckBoxView.ts` — `period.css` |
| `.deck-errors` | `deckBox.ts:141`, `listingView.ts:61`, `resultView.ts:43` | three period views — `period.css` |
| `.green-bar` | `printerView.ts:77`, `listingView.ts:62` | `printer/formView.ts`, `coding/listingView.ts` — `period.css` |
| `.source-box` | `sourceBox.ts:109` | `coding/sheetView.ts` — `period.css` |
| `.rpg-spec-box` | `specBox.ts:60` | `specs/sheetView.ts` — `period.css` |
| `.rpg-result` | `resultView.ts:40` | `specs/resultView.ts` — `period.css` |
| bare `body`, `hr`, `fieldset`, `legend`, `table`, `td`, `pre`, `input/select/button` | `index.html:10-11, 14-17, 25, 28` | `body` global; the rest `#internals` |

**Three of those classes have no rule today.** `.source-box`, `.rpg-spec-box` and `.rpg-result` are
class literals in TS with nothing matching them in `index.html` — verified, and it is why
`test/period-css-covers-every-class.test.ts` (~85 lines, wave 5) is written in **both** directions:
every class literal under `src/ui/**/*.ts` has a rule in `period.css` or in `index.html`'s scoped
block, **and** every rule's class is referenced from a TS file. Direction one fails on this tree for
exactly those three; direction two catches a rule left behind by a rename. The matcher reads class
TOKENS, not whole selectors, because `index.html:31` is `.card-face svg, .deck-box textarea`.

**One custom property per `[unverified]` colour in §15**, so flipping a ruling is one line:

| Property | §15 constant | Confidence |
|---|---|---|
| `--lamp-lit` / `--lamp-lens` / `--lamp-dark` | `LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS` | `[unverified]` |
| `--lamp-group-border` | `LAMP_GROUPS_ARE_SILKSCREEN_NOT_LENS_COLOUR` | `[unverified]` |
| `--ribbon` | `SELECTRIC_RIBBON_IS_BLACK_SINGLE_COLOUR` | `[unverified]` |
| `--card-stock` (`#f7f3e8`) | `CARD_STOCK_IS_CREAM` | `[unverified]` |
| `--desk-top` / `--desk-pedestal` | `DESK_IS_LIGHT_LAMINATE_ON_CHARCOAL_PEDESTALS` | `[verified from photos]` for the look |
| `--bar-shade` (`#ececec`, from `printerView.ts:38`) | `GREEN_BAR_IS_THE_DEFAULT_WITH_A_WHITE_TOGGLE` | `[unverified]` |

### 10.4 Typography, and the internals tab's stale MODE select

**No webfont** (§15 `NO_WEBFONT`). The slashed zero belongs to the FORMATTER, not to a face:
`printout.ts:29` is `SLASHED_ZERO = 'Ø'` (C28-0351-5 p.2 — zeros slashed, the letter `O` not), and
the word mark and the parity underscore are **combining marks**, so
`ui-monospace, Menlo, Consolas, monospace` renders everything the Selectric prints; `⌑` and `‡`
already render from that stack in shipped output. If a platform lacks either, they are drawn as two
SVG paths — **not fetched**, because a downloaded face would put a network request on a site whose
settled deliverable is a static local one (DECISIONS.md 2026-08-30, "Run local, Gitea").

**The internals tab's stale MODE `<select>`, and the fix that is not an edit.** `controls.ts` is
byte-frozen at SHA-256 `a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f` (§13
criterion 3). Its `<select>` (`controls.ts:53-59`, four `MODES` rows at `:23-25`) is set BY the
operator and **never re-read from `machine.mode`**: turn the period rotary to DISPLAY, open INTERNALS,
and it still reads RUN. Behaviour is correct in both directions — both surfaces write through the
façade, and every READ of the mode comes from `machine.mode` — so the defect is display only. **Phase
4's fix is its own DOM: +6 lines in `src/ui/internals/mount.ts` (wave 4), a live label above
`controls.el` reading `machine.mode` on every redraw**, which is `internals/main.ts:16-18, :26`'s
`MODE_LABEL` map moved into the mount and no longer buried in the panel's note string. **A two-line
accessor inside `controls.ts` is refused**: architecture.md §6 says verbatim "Phase 4 reuses these
controls verbatim", criterion 3 pins the hash, and `test/ui-controls-verbatim.test.ts` asserts it.
The residual is stated rather than hidden (§14 R6) — a frozen, stale `<select>` beside a correct live
label is itself confusing, and the only clean fix is the edit criterion 3 forbids.

### 10.5 The build — one line

`vite.config.ts` gains exactly one line, `base: './'`, inside `defineConfig` — the phase's whole
build-config change, verified necessary: `npx vite build` on this tree emits

```html
<script type="module" crossorigin src="/assets/index-DzWn_BmX.js"></script>
```

— `dist/index.html` 2.42 kB, `dist/assets/index-DzWn_BmX.js` 250.29 kB — an **absolute** path that
resolves to nothing under `file://`, and `vite.config.ts` has no `base` key today. §13 **criterion
17**: `npm run build` clean, `base: './'` present, the emitted `src` relative, `dist/index.html` opens
from the filesystem with **no network request**, `dist/` under 400 kB. This is the phase whose
deliverable IS the built page, so it is the phase that has to make it open.

### 10.6 No framework, no jsdom — four checkable reasons

`docs/DECISIONS.md` line 11 — *"**Build tool: Vite, minimal deps** `[proposed]` — from the brief;
confirm at Phase 4"* — closes as `[settled]`. Three devDependencies after Phase 4, unchanged:
`typescript ~5.9.0`, `vite ^8.0.0`, `vitest ^4.0.0`; `package.json` gains no script and no dependency
(§3.7).

1. **`?raw` is already load-bearing.** Every `sample …` button is a Vite raw import of a file under
   `demos/` — `deckBox.ts:14`, `sourceBox.ts:19-20`, `specBox.ts:8-9`: three files, five imports.
   `demos/` sits outside `public/` deliberately: as `deckBox.ts:6-8` records, a fetch works under
   `npm run dev` and 404s in a `vite build` output. Replacing Vite means reimplementing `?raw` or
   moving the demo decks into `public/`, where they would be shipped assets rather than source.
   Wave 0 MERGES the three shims as a **simplification** — one file, so Phase 6's `*.asm?raw` line
   goes in one place — and NOT because the compiler forbids a second copy:
   `autocoder/raw-import.d.ts:4-8`'s shipped header says re-declaring a pattern fails
   `npm run typecheck` on a duplicate `export default`, and that is **wrong on this toolchain**.
   Measured with the repo's own `tsc` 5.9.3 and this `tsconfig.json`'s `compilerOptions`: two
   identical `declare module '*.cards?raw'` blocks in two files → exit 0; the same two blocks in one
   file → exit 0; and with a live `import deck from '…/x.cards?raw'` present → exit 0. The merged
   shim's own header records the measurement instead of repeating the claim (§3.1; wave 0 owns that
   header).
2. **Phase 4 adds exactly one new build capability — a CSS import** — and Vite does it with zero
   config and zero dependencies, for **one line** of `declare module '*.css';` in the merged shim (a
   shorthand ambient declaration takes no body),
   following the `?raw` pattern because this repo carries no `vite/client` types (and
   `tsconfig.json:7-10` records it carries no `@types/node` either).
3. **Vitest shares Vite's transform**, so one config covers 99 test files and the NodeNext
   `.js`-specifier resolution `tsconfig.json:2-5` documents works identically in dev, in tests and in
   the build. A second pipeline is the alternative architecture.md §10 already priced.
4. **The deliverable is a static local site**, and §10.5 is what makes that true.

**No framework, for a reason specific to this codebase.** architecture.md §10 asked for a concrete
reason if Phase 4 turned out to need one; it does not. The part of a framework this page needs is
already written and shipped — `render(s: MachineState)` behind a hand-written diff key, §10.2's table
— and Phase 4's new surfaces follow the same pattern. A component framework would put a virtual-DOM
reconciler on top of a diff that already works, in exactly the case architecture.md §10 names as the
one it helps least: six hand-drawn SVG panels with no shared reactive state and one 132-column `<pre>`
that must not re-render every frame. **Also refused. jsdom**: a fourth dependency and a second vitest
environment, where the design's own answer is better — no number is computed in a file that touches
the DOM, so there is nothing a DOM test could assert that a node test cannot (§2.2, §12). **A CSS
preprocessor**: ~640 hand-written lines with custom properties need no nesting engine. **A webfont**:
§10.4. **An audio library**: sound is out on `[unverified]` grounds (§15 `SOUND_IS_OUT`) and would be
a dependency for a claim we cannot make.

### 10.7 The mount chain, per wave

The deleter owns the importers, in the **same commit** (§11 RULE 2); every path is post-move (§3).

| Wave | Who calls what | Deleted in the same commit |
|---|---|---|
| 0 | `src/ui/main.ts` → `mountInternals(machine, internals, { run, halt, kick })` → `{ view }` (§10.2's `mountInternals` paragraph), then `mountUnitRecord(machine, machineRoom, kick)` → `{ deckBox }` → `mountAutocoder(machine, deckBox, machineRoom, kick)` → `{ sourceBox }` → `mountRpg(sourceBox, machineRoom)`, where `internals` and `machineRoom` are `#app`'s two tab containers (§3.1) and `kick` is `main.ts`'s own, because all three moved mounts take a bare `redraw: () => void` (`unitrecord/mount.ts:22`, `autocoder/mount.ts:32`). All at `src/ui/period/…` and all with their bodies unchanged, so `period/unitrecord/mount.ts` keeps its own rAF at `:89` / `:91` | `src/ui/internals/main.ts` (54); the three `raw-import.d.ts` shims (6 · 12 · 4) |
| 1 | unchanged — wave 1 adds DOM-free modules only. `internals/panel.ts` gains one import of `renderSelectric` from `'../period/console/selectric.js'` | `panel.ts:61-75` (the four-line comment that describes them — carried into `selectric.ts`'s header, not lost — the two combining-mark constants, the private `renderConsoleLine`, and the blank line at `:75`) |
| 2 | `period/unitrecord/mount.ts` constructs `createFormView` / `createCarriageView` / `createPanelView` instead of `createPrinterView`, and hands them `machine.printer.tape` (`mount.ts:47`'s existing argument) | `period/unitrecord/printerView.ts` (156) |
| 3 | `period/reader/mount.ts` replaces `period/unitrecord/mount.ts`: constructs the five reader views, the wave-2 printer views, and still `'../unitrecord/inquiryView.js'`; it returns `View[]` and holds no rAF. `src/ui/main.ts` (±8): its first call becomes `mountReader`, and the `dirty` / `kick` gate and the render loop come up into the frame. **And two importers of the deleted files that are NOT mounts** (RULE 2): `period/autocoder/objectDeckView.ts` (**±3** — the import at `:17`, `renderCard` from `../unitrecord/cardView.js` → `renderCardFace` from `../reader/cardFaceView.js`, plus BOTH call sites: `:53` captioned `object deck, card N` and `:64`, the execute card, captioned `execute card — E in column 1`) and `period/autocoder/mount.ts` (±1 — `DeckBox` from `../reader/deckBoxView.js`) | `period/unitrecord/{cardView, readerView, deckBox, mount}.ts` (127 · 97 · 171 · 94) |
| 4 | `reader/mount.ts` constructs `console/mount.ts`'s station instead of `createInquiryView` (±8 lines) and returns its `ConsoleSession`; `src/ui/main.ts` (±6) takes it and adds the `held` / `detent` terms. `internals/mount.ts` +6 for the live MODE label | `period/unitrecord/inquiryView.ts` (83) |
| 5 | `src/ui/main.ts` (±10) drops the three transitional period mounts for one `mountPeriod(machine, machineRoom, { run, halt, kick })`; `mountInternals(...)` stays as it was in wave 0. `period/mount.ts` + `desk.ts` take over every station; `reader/mount.ts` is narrowed to the reader (−12) | the three transitional period mount calls in `main.ts` |
| 6 | unchanged — wave 6 writes one test and documentation | — |

Deletions sum to **804 lines in ten files** (54 + 22 + 156 + 489 + 83), which is §3.9's figure. The
three `session.ts` files never move again after wave 0, which keeps §3.1's four test import edits at
one line each for the whole phase.

---

## 11. Waves, each closed by its oracle

Build order runs **outward from the DOM-free middle** — the mirror of Phase 5's
backwards-from-the-consumer. Wave 0 moves files and changes no behaviour; wave 1 lands every
number the page will ever draw with not one view in existence; waves 2-5 attach views to numbers
that are already gated. That ordering is what makes an art phase testable at all: by the time a
`*View.ts` exists, everything it renders has a node test and, in three cases, a byte golden. **No
wave's oracle reads a file a later wave writes**, and every row below names the shipped or
earlier-wave artifacts it does read.

`<base>` throughout is `git merge-base main HEAD` — **`6755b1d`** as this plan is written. The
commits on this branch above `<base>` are documentation only — the dossier, the handoff, this plan
and its review revisions, and the orchestrator's `docs/DECISIONS.md` closure at the plan's arrival
(Tom's instruction, not a wave's edit; §3.7 binds waves) — so `<base>..HEAD` and `main..HEAD` are the
same diff over `src/`, `test/` and `demos/`.

**RULE 1 — no wave's oracle reads a file a later wave writes.** Each oracle names its inputs and
asserts that every one of them is on `main` today or was written by an earlier wave. This is why
wave 1 owns the card-face golden (waves 3 and 5 read it), why wave 2's straddle runs on
`demos/cycle-probe.rpg` (Phase 5 froze it) and why wave 6 introduces no fixture at all. A wave
that finds it needs a later wave's artifact has found a wave-boundary defect, not a missing file.

**RULE 2 — the wave that DELETES a file owns every file that imports it, in the same commit.**
**Four** deletions broke `npm run typecheck` at the commit that made them — two in the winning panel
proposal and two more that round-1 review found in this plan — and all four are repaired here by
putting the importer's edit in the deleting wave's own row: wave 2 deleted `printerView.ts` while
`period/unitrecord/mount.ts` still imported it; wave 4 deleted `inquiryView.ts` while
`period/reader/mount.ts` still did; and wave 3's deletion of `cardView.ts` and `deckBox.ts` left
`period/autocoder/objectDeckView.ts` and `period/autocoder/mount.ts` importing them, both of which
this plan had first touched in wave 5. The importer and the deletion land together, so the standing
gate is satisfiable at every commit, not merely at the end of the phase (§11.2).

**RULE 3 — every path after wave 0 is spelled at its POST-MOVE location.** `src/ui/period/…`,
everywhere, including in the rows that delete a file wave 0 has just moved. §3's file table is the
authority and carries the same note. A plan that spelled wave 3's deletions as
`src/ui/unitrecord/cardView.ts` would be describing paths that stopped existing in wave 0.

**RULE 4 — each art wave carries an orchestrator browser screenshot, recorded in
`docs/BUILD-LOG-4.md`.** Waves 2, 3, 4 and 5. NEW discipline in this project, and it exists
because **no oracle in this phase can tell you whether the page looks like a 1415** (§14 R11).
The screenshot is taken with `claude-in-chrome` against `npm run dev` and is recorded in the
wave's own build-log section — protocol in §11.3.

**Commit per wave; Opus adversarial review per wave with the fixes applied BEFORE the commit; one
whole-branch Opus review before merge** — the Phase-3 and Phase-5 precedent, and the model policy
(`CLAUDE.md`) puts every worker on Opus or lower under a Fable build orchestrator. **The standing
gate runs at every commit** (§12.2) with the `npm test` and `npm run smoke` counts stated in the
commit message and never changed silently.

| Wave | Files owned this wave | The oracle that closes it |
|---|---|---|
| **0 — the move, the shell, the freeze, the build fix** | the sixteen `git mv`'d files under `src/ui/period/{unitrecord,autocoder,rpg}/` (§3.1 — the ONLY content change is import depth); `period/raw-import.d.ts` (new, the three shims merged plus `declare module '*.css';`) and the deletion of `src/ui/{unitrecord,autocoder,rpg}/raw-import.d.ts`; `period/dom.ts` (new, and the seventh rewrite that points all thirteen `panel.js` importers at it); `src/ui/main.ts` (new); `src/ui/internals/mount.ts` (new, ~70, returning a `View`); `src/ui/styles/period.css` (new, a ~5-line header-comment STUB — wave 5 owns its content); the deletion of `src/ui/internals/main.ts`; `index.html`; `vite.config.ts` (+1, `base: './'`); `test/ui-controls-verbatim.test.ts`; the four functional test import lines (`session.test.ts:27`, `tier4-autocoder-demo.test.ts:37`, `tier4-rpg-demo.test.ts:17`, `rpg-is-dom-free.test.ts:78`) plus the eight prose / `describe`-string mentions in the same four files; `docs/BUILD-LOG-4.md` opened; `docs/screenshots/phase-4/README.md` (new, ~5 lines — the directory RULE 4's per-wave PNGs land in, which git will not track empty); the dated Phase 4 section of `docs/research/open-questions.md` opened by §11.1's read. *(The dossier's "19 files" counted the three shims this wave replaces; §3.1's sixteen is the move.)* | **IDENTITY, not green — four checks, all commands.** **(a)** `git diff -M --find-renames <base> -- src/ui/unitrecord src/ui/autocoder src/ui/rpg src/ui/period/unitrecord src/ui/period/autocoder src/ui/period/rpg ':!*/raw-import.d.ts' \| grep '^[+-]' \| grep -v '^[+-][+-]' \| grep -v "from '\.\./"` prints **NOTHING**: the only changed lines inside a moved file are import specifiers. **The path spec is scoped to the MOVED TREES on purpose** — the wave's new files (`src/ui/main.ts`, `internals/mount.ts`, `period/dom.ts`, `period/raw-import.d.ts`, the `period.css` stub) and its deletions (`internals/main.ts`, the three shims) are all inside `src/ui` and none of their ~350 lines contains `from '../`, so an unscoped `-- src/ui` cannot print nothing; **those files are covered instead by `git diff --stat` matching §3.1's rows exactly**. **(b)** `shasum -a 256 src/ui/internals/controls.ts` equals `a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f`, and `git diff --numstat <base>..HEAD -- src/ui/internals/{controls,panel,coreView,registerView}.ts` is all zeros — `panel.ts` is untouched in wave 0; its sixteen-line fold is wave 1's. **(c)** The 93 EXISTING files at UNCHANGED counts — `npm test` **1745 passed / 1 skipped / 0 fail** over them — **plus this wave's own `test/ui-controls-verbatim.test.ts`, so the run reports 94 files / ≥1,747** and §12.2's "the new number stated in the commit" applies here as everywhere; `npm run smoke` **6 files / 49**; `npm run cc01` byte-identical (CC01A, CC01 COMPLETE, instruction check at 00322, 1241 instructions); **348 / 2251 / 3688 / 6982** bytes; `cycle-probe.page.txt` (2522 B) and `card-list.page.txt` (120 B) unmoved. **(d)** `npm run build` exits 0 AND `grep -c 'src="\./assets' dist/index.html` is **1** AND `dist/index.html` opened over `file://` renders with no network request. It reads no later wave's output because it creates no behaviour at all: it asserts sameness against a commit that already exists. **Any EXISTING count that moves is a defect in the move, not a Phase 4 finding.** |
| **1 — the paper and the console, DOM-free — and the phase oracle** | `period/paper/{page,carriage,chain,cardGeometry}.ts`; `period/console/selectric.ts`; `src/ui/internals/panel.ts` (the −16 / +2 fold of lines 61-75 plus the call at 145, §3.2); `test/period-{page,carriage,chain,cardgeometry,selectric,is-dom-free}.test.ts`; `test/golden/card-face-a.svg.txt` — **the phase's ONE new golden file** | **Four assertions, every input already on `main` or written by this wave.** **(a) THE PHASE-4 ORACLE** (architecture.md §8): read `docs/research/console-and-physical.md`, slice the fence between lines **59 and 79** (nineteen content lines), drop the elided `D bbbb...` row **BY NAME in the test header**, build each remaining line through `formatPrintout` with the fields §2's layout table gives, and assert `renderSelectric(lines, {matrix:'flush', marks:'strip', spacing:'ignore'})` equals it **BYTE FOR BYTE**. Then, as separate named cases: `spacing:'render'` puts a blank line before every S/C/E line; `marks:'render'` underlines all four characters of the absent CH1+CH2 group and puts the combining caron U+030C (the inverted circumflex) over a word-marked character; `matrix:'indent'` renders the 35-lines five columns right of the 30-lines (`MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT`, `[likely]`); `Ø` is slashed and the letter `O` is not (C28-0351-5 p.2). **(b) THE FREE CROSS-CHECK:** for `hello-dad.page.txt` (348 B), `sales-summary.page.txt` (3688 B) and `cycle-probe.page.txt` (2522 B), the paper obtained by **re-running each shipped deck through the real machine** satisfies **§5.1's identity, written the same way everywhere**: `renderGreenBar(paper, {chain:'A', formLines:66}) === header + paginate(paper, carriage, 66).filter((p) => p.printedThrough > 0).map(trimRule3).join('\f\n')` — the filter is `renderGreenBar`'s rule 2 (forms with ink only) and the separator is `\f\n` because `renderGreenBar` pushes `'\f'` as its own array element and then maps EVERY element to `${line}\n` (`printer1403.ts:743-752`) — plus **a SYNTHETIC THREE-FORM paper** built by hand, whose form 2 carries one blank `PrintLine` at line 1, because no shipped demo exceeds two forms and Phase 6's trajectory report will (§16 item 8, critic item 4d). Every `FormPage.lines` entry is asserted to be exactly `PRINT_POSITIONS` (132) characters, the assertion that catches a wrap in node rather than in a view (§7.2). `paginate` must not reach `renderGreenBar` to satisfy this (`PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR`); the two-lines-at-one-`page:line` throw is asserted with `renderGreenBar`'s own message shape (`printer1403.ts:726`). **(c)** `restrike(chainGlyph(c,'A'),'H') === chainGlyph(c,'H')` and the reverse **for all 64 codes**, `CHAIN_DUALS` diffed against charset.md §5's five-row table **read from the research file**, and the greps: no second chain table under `src/ui/**`, no import of `paper/chain.ts` from anything under `src/asm/**` (`H_CHAIN_IS_A_FIVE_GLYPH_RESTRIKE_OF_THE_A_PAGE`). **(d)** `test/golden/card-face-a.svg.txt` byte-identical AND `holePath(card, true)` contains exactly the rectangles `punchMask` (`src/formats/card.ts:48`) says are punched, for every punchable BCD code — the path string and the punch table must agree for two different reasons (`CARD_GEOMETRY_IS_SECONDARY`, `CARD_SIZE_7_3_8_BY_3_1_4`, `CORNER_CUT_IS_UPPER_LEFT`, all `[likely]`). **`npm run cc01` byte-identical is now load-bearing evidence** that the `panel.ts` fold changed no text, not merely a gate. |
| **2 — the 1403 station: the form, the stack, the tape, the straddle** | `period/printer/{formView,carriageView,panelView}.ts`; the DELETION of `period/unitrecord/printerView.ts` **and**, in the same commit (RULE 2), the `period/unitrecord/mount.ts` edit that stops constructing it and constructs the three printer views; `test/period-printer.test.ts`; `docs/screenshots/phase-4/wave-2-1403.png` (RULE 4) | **`demos/cycle-probe.rpg` — shipped and frozen at Phase 5 — driven through `RpgSession` → `assemble` → `loaderDeck` → the real 1402 → the real `Machine`.** **(a)** `paginate` returns **2 forms of 66 line positions**, blanks included. **(b)** `straddled({form:2,line:59}, {form:2,line:61}, machine.printer.tape)` returns exactly **`[{line:60, channel:12}]`**, where 59 is the last printed position on form 2 taken from `snapshot().printer.paper` and 61 is `snapshot().printer.carriage.line` — **and `snapshot().printer.carriage.channel12 === false` on the SAME frame**, which is the whole point (`printer1403.ts:329-354`, `CARRIAGE_SENSES_AT_DESTINATION_ONLY`, `open-questions.md:411`). **(c)** The straddle banner is asserted **VERBATIM**, including the constant name and `src/core/devices/printer1403.ts:354`, so a later silent "fix" to the carriage model fails this test rather than quietly removing a page annotation (`STRADDLE_IS_SHOWN_NOT_FIXED` / `CROSSED_PUNCH_IS_DERIVED_FROM_THE_LAST_PRINT_AND_THE_FINAL_CARRIAGE`). **(d)** `demos/sales-summary.rpg` through the same path returns **zero** straddles — the negative that stops the derivation reporting everything. **(e)** `renderGreenBar` still equals `test/golden/cycle-probe.page.txt` **byte for byte**. Every deck and every golden it reads exists on `main`; it reads wave 1's pure functions and nothing later. `LINES_PER_BAR_IS_THREE`, `GREEN_BAR_IS_THE_DEFAULT_WITH_A_WHITE_TOGGLE`, `FORM_FEED_IS_A_SLIDE_NOT_A_SIMULATION`, `NO_WORD_MARKS_ON_THE_1403_PAGE` and `DEFAULT_CARRIAGE_TAPE` are the rows this wave first depends on. |
| **3 — the 1402 station: hopper, faces, stackers, keys, deck box** | `period/reader/{hopperView,stackerView,keysView,cardFaceView,deckBoxView,mount}.ts`; the DELETIONS of `period/unitrecord/{cardView,readerView,deckBox,mount}.ts`, same commit as **all three importer edits RULE 2 requires** — `reader/mount.ts` (which replaces the mount), `period/autocoder/objectDeckView.ts` (**±3**, `renderCard` → `renderCardFace` from `../reader/cardFaceView.js` at BOTH call sites, `:53` captioned `object deck, card N` and `:64` captioned `execute card — E in column 1` per §7.1) and `period/autocoder/mount.ts` (±1, `DeckBox` from `../reader/deckBoxView.js`); `src/ui/main.ts` (±8, `mountReader(machine, host, hooks)` plus the `View[]` render loop and the `dirty` / `kick` gate, §10.2); `test/period-reader.test.ts`; `docs/screenshots/phase-4/wave-3-1402.png` (RULE 4) | **(a)** `test/golden/card-face-a.svg.txt` byte-identical **through `cardGeometry.ts`, and no view is instantiated** — `vite.config.ts:8-11` sets `test: { environment: 'node' }` and §2.2 refuses jsdom, so a test that constructed `cardFaceView` would throw on `document`. The three scales are a `viewBox` width set by CSS and the path strings are scale-invariant, so **there is one golden and the view is an adapter**, checked by criterion 19's eye and by the class inventory, not by a node test. **(b)** Hopper depth, the read-buffer card and the five pocket counts (**8/2 summed across both feeds**, `readerView.ts:29-34`'s rule carried across with its comment) derived through the **UNCHANGED** `period/unitrecord/session.ts` after real card reads through `Channel1` and `Reader1402` — the shape `test/session.test.ts` already uses. **(b2) THE LOADED-DECK HOPPER CASE** (critic item 7): load a deck, read three cards, then edit the deck-box text, and assert `hopperView`'s input is still `session.hopperCards(reader)` — the LAST loaded deck, not the re-parsed one (`session.ts:40-46`, `:68-70`) — and, over `cardFaceView.ts`'s exported `CARD_CAPTIONS` (data, no node built at import time, §3.3), that §7.1's **five** caption templates are present verbatim. WHICH template a station passes is criterion 19's eye check and not this test's, because no node run may instantiate the view. `THE_HOPPER_DRAWS_THE_LOADED_DECK`. This is a real visible bug in all three panel designs and it is a node assertion here, not a screenshot. **(c)** `test/session.test.ts` passing **with only its `:27` import line changed** — which is what proves the session body was not touched while its consumers were rewritten. **(d)** A named negative: the Fig.60 p.61 key strip contains **no `LOAD` key**, asserted as a string absence over the exported `KEY_LABELS` — the drawn labels, not a comment (§2.2 fact 3; software.md §10.1, §10.10). Plus `PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT`: the two punch keys are drawn, exported and inert, and the page carries the one line saying this 1402 reads and does not punch. **(e)** `reader/keysView.ts`'s exported `LIT_CONSTANTS` names POWER and nothing else. Reads only wave-0 and wave-1 outputs. |
| **4 — the 1415 station: Selectric paper, rotary, keys, keyboard, light panel** | `period/console/{session,lamps,logView,rotaryView,keysView,keyboardView,inquiryView,lightsView,mount}.ts`; the DELETION of `period/unitrecord/inquiryView.ts` **and**, same commit (RULE 2), the `period/reader/mount.ts` edit that stops constructing it and constructs `console/mount.ts`'s station; `src/ui/main.ts` (±6, `consoleSession` from that mount's return plus the `held` / `detent` terms, §10.2); `src/ui/internals/mount.ts` (+6, the live MODE label of §10.4); `test/period-console.test.ts`; `test/period-light-panel-vs-research.test.ts`; `test/period-keydown-ownership.test.ts`; **and the two appended cases in `test/period-is-dom-free.test.ts`** for `console/session.ts` and `console/lamps.ts` — the phase's one sanctioned test-file append (ownership note 1); `docs/screenshots/phase-4/wave-4-1415.png` (RULE 4) | **Five assertions over DOM-free modules, plus one grep.** **(a)** `turnTo` across **ALL 30 ordered pairs** of the six detents yields **exactly one `S`-line action per turn** and zero for a turn to the current detent; DISPLAY and C.E. route to `machine.stop()` (`machine.ts:380` = `{ fieldLine('S'); }`) and never to `setMode`; and the **RUN→DISPLAY→RUN round trip yields TWO** — the case `machine.ts:325`'s early return breaks. Driven on a real `createMachine({size:10_000})` and asserted on `snapshot().console`, never on "it did not throw"; **and every real turn fires the session's `halt` hook** (a spy in the test), because a mode change STOPS the machine and not only prints (§6.2) (`UI_ONLY_DETENTS_TYPE_S_THROUGH_STOP`, `ROTARY_DETENTS_ARE_60_DEGREES_APART`). **(b)** The dialogue **in the manual's order** (A22-0526-3 p.51): START before any keystroke prints `D ` and unlocks; a keystroke before START is refused; five digits then auto-lock; a sixth refused; the two lines produced are **exactly the two `machine.display()` produces** (`machine.ts:392-411`); ALTER before a display is refused and **types nothing** (`machine.alter` throws at `:425` and the session never reaches it); after a display it writes at most the displayed span; a displayed word mark not re-entered is **gone from STORAGE**, asserted on storage and not on the log; and the entry COMMITS on the next control action (`ALTER_ENTRY_COMMITS_ON_THE_NEXT_CONTROL_ACTION`, `[unverified]`). On a cleared 10K machine a display of `00000` runs to the end of the 80-position line (`CONSOLE_LINE_LENGTH`, `machine.ts:105`, `:100`). The typed echo is a pending row and not a `ConsoleLine` until it commits (`ALTER_ENTRY_COMMITS_ON_THE_NEXT_CONTROL_ACTION`). **(c)** `keyboard.take('release')` agrees with the **frozen** `controls.ts` `keyed()` on a corpus of word-marked lines — `keyed` **IMPORTED, never reimplemented**, which is what keeps one `^` parser in the project; a glyph outside the 64 is refused; `keyBootstrap(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks)` feeds all twelve characters of `AL%1000012$R` through `press()` / `pressWordMark()` one at a time with marks at positions 1 and 11 (`loader.ts:26-32`, `:53-58`). **(d)** The inquiry hold engages on REQUEST and clears on **both** RELEASE and CANCEL, and **the latch is the session's own** — asserted by a case in which the program never reads and the hold still clears, which a latch read off `Console1415.pendingRequest` fails (`console1415.ts:148`, cleared at `:199`, `:290`, `:316`; `INTERACTIVE_INQUIRY_HOLDS_THE_UI_RUN_LOOP`). **(e)** `lampsOf()` diffed **FIELD BY FIELD IN BOTH DIRECTIONS** against console-and-physical.md §5's markdown table modulo the exported exception list, each entry carrying its architecture.md §12 citation; every non-null `source` names a field on `MachineState`; **STATUS present and immediately right of ARITH** (§5's own correction note); the CH1 overlap pair and `PRIORITY ALERT` absent from `PANEL_BOXES` and present in `OMITTED_LAMPS`; no lamp label or value is a register's contents (`UNEQUAL_HAS_NO_LAMP_ON_THE_1415_PANEL`, `REFUSED_FEATURE_LAMPS_ARE_OMITTED_NOT_DARKENED`, `LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS`, `LAMP_GROUPS_ARE_SILKSCREEN_NOT_LENS_COLOUR`). **(f) THE KEYDOWN GREP** (critic item 1, `test/period-keydown-ownership.test.ts`): under `src/ui/period/**`, `addEventListener('keydown'` and `addEventListener('keypress'` appear in **exactly one file, `console/keyboardView.ts`**, and `document.addEventListener(` / `window.addEventListener(` appear **nowhere**; **and `.press(` appears only under `src/ui/period/console/**`**, which is §6.5 ruling 3's three-caller set as an assertion (`KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT`). Plus wave 1's Exhibit II expectation re-rendered by **`renderSelectric` at the browser's option triple `{matrix:'indent', marks:'render', spacing:'render'}` over the same slice, asserted as the exact string `logView` sets as `textContent`** — DOM-free, because `environment: 'node'` cannot construct a view (`vite.config.ts:8-11`), and it is still the assertion that stops the view and the oracle diverging. **(g)** `console/keysView.ts`'s exported `LIT_CONSTANTS` names POWER ON and READY and nothing else. Reads wave 1 and the shipped façade; nothing later. |
| **5 — the desk: layout, the stylesheet, and the two authoring stations** | `period/desk.ts`; `period/mount.ts`; `period/session.ts`; `src/ui/styles/period.css` (**SOLE OWNER OF ITS CONTENT** — wave 0 created the file as a five-line stub so `main.ts`'s import resolved, §3.1); the ONE appended case in `test/period-is-dom-free.test.ts` for `period/session.ts` (ownership note 1); `period/coding/{sheetView,listingView,objectDeckView,mount}.ts` (`git mv` from `period/autocoder/`, then restyled); `period/specs/{sheetView,resultView,mount}.ts` (`git mv` from `period/rpg/`, then restyled); `period/autocoder/session.ts` (+16, `stale`); `period/reader/mount.ts` (−12, narrowed to the reader station); `src/ui/main.ts` (±10); `test/period-session.test.ts`; `test/period-css-covers-every-class.test.ts`; `test/period-no-second-frame-loop.test.ts`; `test/period-refusal-grep.test.ts` (~60, the carrying file for criterion 18a); `docs/screenshots/phase-4/wave-5-desk-both-tabs.png` (RULE 4) | **(a) Constraint 11 made mechanical in node:** `assemble()` then a one-character `setSource` gives `stale === true` and `hopperText() === ''`; the RPG session's `handOff()` returns `{source:'', dataCards:''}` after `setSpecText` (`rpg/session.ts:31,37-40,49-53` — the shape being adopted). **(b)** `test/tier4-autocoder-demo.test.ts` and `test/tier4-rpg-demo.test.ts` pass **with only their import line changed** (`:37`, `:17`), through the restyled mounts' sessions — which is what says the session/adapter split survived the restyle. **(c)** The two listing goldens do not move: `hello-dad.lst` **2251 B**, `sales-summary.lst` **6982 B**, because the C28-0326-2 §12 page heading is added **AROUND** `renderListing`'s output and never inside it, and the A/H toggle is a display transform over that output (critic item 5). **(d)** Every drawn sheet field appears **exactly once at the span its source table gives** — `SOURCE_FIELDS` (`src/asm/types.ts:18`, C28-0309-1 pp.5-7) for the coding sheet, `SHEET_COLUMNS[kind]` (`src/rpg/sheets/columns.ts`) for the four RPG sheets — and a defined grep proves **NO column number is written anywhere under `src/ui/period/**`**, the `rpg-columns-is-the-only-place` mechanism applied to a second consumer (`THE_RULER_IS_THE_FORM`). **(e) THE CSS LINT** (`test/period-session.test.ts`): `period.css` contains no `@import`, no `@font-face`, no `url(http` (`NO_WEBFONT`), no pixel width on a form or card selector, **and no bare element selector** — every rule scoped under `#machine-room` or a `.period-*` class, which is what keeps `index.html`'s `#internals` block from being restyled by the period surface and the two surfaces "visually foreign to each other on purpose" (critic item 6, §14 R9; `DESK_IS_LIGHT_LAMINATE_ON_CHARCOAL_PEDESTALS`, `NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED`). **(f) The two drift guards:** every class literal in `src/ui/**/*.ts` has a rule in `period.css` or in `index.html`'s scoped block **and every rule's class is referenced**, both directions; and `requestAnimationFrame(` appears in **EXACTLY ONE file** under `src/ui/**`, `src/ui/main.ts`, **named in the test** (§10.2). *(The dossier's wave-5 oracle said "at most two NAMED files", following its §10; the spine rules ONE frame and this row is the corrected form — a second loop is a deliberate edit to `test/period-no-second-frame-loop.test.ts` with its reason.)* **(g) THE §12 REFUSAL GREP** (`test/period-refusal-grep.test.ts`, ~60 lines — the file exit criterion 18a is carried by): over DRAWN LABELS under `src/ui/period/**` — exported label tables, `text()` arguments, `aria-label`s — none of `PRIORITY ON`, `PRIORITY PROCESSING`, `COMPATIBILITY`, `DENSITY`, `DISK WR`, `1401 COMPAT`, `TAPE OFF LINE`, `DISK OFF LINE`, `729`, `address dial`, `LOAD` as a 1402 key label or any red-fault colour token appears, **and neither do the time-unit tokens** `µs`, `ms`, `sec`, `seconds`, `clock`, `elapsed`, `speed` (critic item 8); the whitelist is by **file + line + citation** and an entry with no citation fails the test (§13 criterion 18a). Reads wave-0 sessions, shipped demos, and its own and earlier waves' source — RULE 1 holds, because nothing later than wave 5 exists yet. |
| **6 — the storyboard, the docs, and Tom's gate** | `test/tier4-period-storyboard.test.ts`; `PHASE-4-NOTES.md`; `docs/BUILD-LOG-4.md` (closeout); `docs/research/open-questions.md` (the dated Phase 4 section completed); `docs/DECISIONS.md` (**the orchestrator's, at merge, never a wave's edit — §3.7** — carrying line 11 `[proposed]` → `[settled]` plus the Phase 4 rulings and the build-provenance close-out); `docs/STATUS.md` (the orchestrator's, at merge, never a wave's edit — §3.7) | **`test/tier4-period-storyboard.test.ts` joins `npm run smoke` — 6 files / 49 becomes 7 files / 50.** §1's storyboard end to end in node: `demos/sales-summary.rpg` → `RpgSession.generate` (diagnostics empty, the memory map `CONSTANTS 00500 · CODE 00808 · IND 02533 · CDIN 02540 · PLINE 02700 · PLGM 02832 · HIGH 02833 · CTL 1` asserted) → `handOff()` → `AutocoderSession.setSource` / `setDataText` → `assemble()` `ok` with **zero flags and zero warnings** → `hopperText()` → `unitrecord Session.putDeckInHopper` → READER START / END OF FILE → **the twelve bootstrap characters keyed ONE AT A TIME** through `ConsoleKeyboard` with the WORD MARK key at positions 1 and 11 → COMPUTER RESET (which commits the entry) → RUN → START → the real loader and the real 1411 → `paginate` gives **2 forms whose trimmed join equals `test/golden/sales-summary.page.txt` (3688 B)**, `straddled` reports **none**, and `renderSelectric(snapshot().console, {matrix:'indent', marks:'render', spacing:'render'})` contains **the four `S` lines from the STOP key and three detent turns**, the `D` address/data pair, the `A` line carrying its word mark, and the `I` line from a released inquiry. **Every artifact it reads was frozen in Phase 5 or in wave 1.** This wave writes one test and documentation and touches no `src/` file. |

**What each wave does NOT touch, and the gate it adds.** The refusals are per-wave ownership, not
general advice: a wave that edits a file on its own row's right-hand column has broken the
discipline this table exists to enforce, whether or not the gate stays green.

| Wave | Does not touch | The gate it adds to the standing one (§12.2) |
|---|---|---|
| **0** | `src/core/**`, `src/asm/**`, `src/rpg/**`, `src/formats/**`, `tools/**`, `demos/**`, every file under `test/golden/`, `src/ui/internals/{controls,panel,coreView,registerView}.ts`, `docs/research/console-and-physical.md`, **and any view body** — this wave changes paths, imports and the shell only | One commit whose message states all six counts and the SHA. **The browser page must look IDENTICAL to `main`'s except that it now has two tabs**, and the reviewer is told to check exactly that: a deliberate no-op wave. |
| **1** | every `*View.ts`, `index.html`, **the wave-0 stub `src/ui/styles/period.css`, untouched until wave 5**, every `mount.ts`, `src/core/**`, **`tools/run-cor.ts` — explicitly NOT folded** (its renderer at `:43-49` has no `spacingBefore` clause; folding it would put blank lines into the cc01 transcript), every shipped golden | `npm test` up by six files at its stated count; `test/golden/card-face-a.svg.txt` added and no other golden byte moved; **cc01 byte-identity is now evidence about `panel.ts`, not merely a gate**. §15's ledger is FROZEN at the end of this wave (§11.1). |
| **2** | `period/reader/**`, `period/console/**`, `period/coding/**`, `period/specs/**`, `src/ui/styles/period.css` (**wave 5 owns it — this wave uses inline style attributes exactly as `printerView.ts:72-78` does today**), `src/core/devices/printer1403.ts`, every golden | +1 test file; **an orchestrator browser screenshot of the 1403 station** in `docs/BUILD-LOG-4.md` (§11.3). |
| **3** | `period/printer/**`, `period/console/**`, **`period/unitrecord/session.ts` — moved in wave 0, body frozen for the whole phase**, `src/ui/styles/period.css`, `src/formats/card.ts`, every golden except wave 1's card face (READ, never written) | +1 test file; **a screenshot of the 1402 station and one card face**. |
| **4** | **`src/ui/internals/controls.ts` — imported for `keyed()`, never edited**, `period/paper/**`, `period/console/selectric.ts` (wave 1's, read only), `period/printer/**`, `period/reader/**` except the one mount edit, `src/ui/styles/period.css`, `src/core/**` | +3 test files; **a screenshot of the console desk and the light panel**; `git diff --numstat` on `controls.ts` still zero. |
| **5** | `period/paper/**`, `period/console/**`, `period/printer/**`, `period/reader/**` except the one narrowing edit, `period/rpg/session.ts`, `period/unitrecord/session.ts`, `src/asm/**`, `src/rpg/sheets/columns.ts`, `src/ui/internals/**`, every golden | +4 test files; **a screenshot of the whole desk in BOTH tabs** — the one that shows whether §6's "visually foreign on purpose" survived a single stylesheet. |
| **6** | **every `src/` file** — this wave writes one test and documentation; every earlier wave's test and golden; `docs/research/console-and-physical.md` | `npm run smoke` **7 files / 50**; all nineteen exit criteria green; criterion 19 run and recorded by name and date; the four screenshots present; then the ≤7 bullets to Tom. |

**What each wave costs, added up from §3's file rows rather than estimated.** These are the numbers
a wave is reviewed against, and they are the same arithmetic §3.9 performs; a wave that lands more
than about a third over its row is a signal, not a variance.

| Wave | New `src/` | Restyled | Deleted | CSS | Tests | Wave total |
|---|---|---|---|---|---|---|
| **0** | 275 (4 files) | — | 76 (4 files) | 5 (the stub) | 45 (1 file) | ~325 |
| **1** | 610 (5 files) | −16 / +2 in `panel.ts` | — | — | 895 (6 files) + a 12-line golden | ~1,515 |
| **2** | 510 (3 files) | ±6 in one mount | 156 (1 file) | — | 200 (1 file) | ~710 |
| **3** | 770 (6 files) | ±8 in `src/ui/main.ts`, ±3 in `autocoder/objectDeckView.ts`, ±1 in `autocoder/mount.ts` | 489 (4 files) | — | 200 (1 file) | ~970 |
| **4** | 1,380 (9 files) | ±8 in one mount, ±6 in `src/ui/main.ts`, +6 in `internals/mount.ts` | 83 (1 file) | — | 395 (3 files) | ~1,775 |
| **5** | 360 (3 files) | 659 → ~795 (7 files) + 16 in `autocoder/session.ts` | −12 in one mount | **640** | 340 (4 files) | **~2,135** |
| **6** | — | — | — | — | 240 (1 file) | ~240 + ~300 of `PHASE-4-NOTES.md` |
| | **3,905 in 30 files** | **~795** | **804 in 10 files** | **640** (+ wave 0's 5-line stub) | **2,315 in 17 files** | |

**Wave 5 is the largest wave anyone proposed and it is the one to split first** (§14 R13, the
dossier's own residual risk). The split, if it is needed, is stated in advance so it is not
improvised: **5a** = `desk.ts` + `mount.ts` + `session.ts` + `period.css` + the four wave-5 tests (`period-session`, `period-css-covers-every-class`,
`period-no-second-frame-loop`, `period-refusal-grep` — the last asserts an absence and passes on
either half's tree); **5b** = the two authoring stations' `git mv` + restyle and the `stale` edit. The cut is
clean because 5b touches no file 5a owns and 5a's oracle (e) and (f) do not read a restyled sheet.
**A split is recorded in `PHASE-4-NOTES.md` §2 as a deviation**, and the per-wave screenshot
obligation then applies to both halves — **five screenshots, and §13's phase-gate count moves with
it**.

**Three ownership notes, because per-wave file ownership is the discipline these tables exist to
enforce.** (1) **No Phase-4 test file is appended to by a later wave, with ONE named exception:
`test/period-is-dom-free.test.ts`.** Its required-path list is a list of files, and three of those
files land in waves 4 and 5 — `console/session.ts`, `console/lamps.ts` and `period/session.ts` — so
wave 1 writes it with the EIGHT paths that exist by then (its own five plus the three moved
`session.ts` files), **wave 4 APPENDS two cases and wave 5 APPENDS one**, eleven at the end (§3.8).
Each append adds cases and edits nothing, which is the shape `test/rpg-is-dom-free.test.ts:75-81`
already ships from Phase 5 — a skip that names the wave, then the required-path case. A required-path
case written in wave 1 for a wave-4 file would be RED from wave 1 through wave 4, which is RULE 1
broken by the plan's own test; Phase 5 needed three such
carve-outs (§11's own footer) and this phase needs exactly one. (2) **The four existing test
files edited in wave 0 are edited once, on
one line each, and never again** — that is what §3.3's post-move note buys by freezing the three
`session.ts` files at their wave-0 paths. (3) **`test/golden/card-face-a.svg.txt` is written in
wave 1 and READ in waves 3 and 5**; it is the only artifact this phase creates that a later wave
depends on, and RULE 1 is satisfied by its being first.

### 11.1 Wave 0's bounded two-attempt primary read

**Two attempts, then stop** — the Phase-1b MCE-gate and Phase-5 wave-0 precedent. Five targets,
none of them blocking: every one has a fallback already taken in §15, and the read exists to
retire a `[likely]` or to confirm a refusal, never to unblock a wave.

| # | Target | What it would settle | The §15 row it belongs to |
|---|---|---|---|
| a | **S223-2648 Fig.5 p.9** | the **unit and origin** of matrix positions 30 and 35 — whether the five-column offset is columns, tenths of an inch, or a print-matrix index | `MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT` `[likely]` |
| b | **A22-0526-3 Fig.47 p.49** | the rotary's **detent geometry** — whether the six positions are evenly spaced and where RUN sits on the clock | `ROTARY_DETENTS_ARE_60_DEGREES_APART` `[likely]` derived from `[verified]` |
| c | **S223-2648 Fig.3 p.8** | the light panel's **box geometry and lamp count**, which is what makes the drawn panel demonstrably REDUCED rather than approximately wrong | `REFUSED_FEATURE_LAMPS_ARE_OMITTED_NOT_DARKENED` |
| d | **C28-0326-2 p.55** | whether **`D bbbb...` is the manual's own elision** or a transcription artefact — the one judgement call in the phase oracle (§14 residual risk 3) | none; the exclusion is named in `test/period-selectric.test.ts`'s header |
| e | **A22-0526-3 pp.50-58** | whether a **programmed halt prints** — **RECORD ONLY** | `HALT_TYPES_NO_PRINTOUT` (`machine.ts:65`) |

Target (e) is recorded and not acted on, and the reason is a hard boundary: `HALT_TYPES_NO_PRINTOUT`
is a **core** constant, and architecture.md §7's Phase-4 row is "**no core changes**". A read that
overturns it produces an escalation for a later phase, not a Phase-4 edit.

**What counts as an attempt, so "two" is a number and not a mood.** One attempt is one bounded
retrieval of one named document — the bitsavers PDF at its form number, opened at the named figure
or page — and it ends in one of three recorded states: **read** (the figure was legible and says
X), **absent** (the document or the page is not retrievable), or **illegible** (retrieved, but the
scan does not resolve the detail). Two attempts across the five targets, **not two per target**;
the wave stops there and writes down which state each target reached. **A target that was not
reached keeps its `[likely]` / `[unverified]` tag and its fallback unchanged** — the fallback is
already taken in the code, so a failed read costs the phase nothing but the paragraph recording it.
This is the Phase-1b MCE-gate rule verbatim, and it exists because a primary read is the one task
in a build phase with no natural stopping point.

**Where the findings go, and where they do not.** `docs/research/open-questions.md`'s dated
`## Phase 4 — 2026-…` section and `docs/BUILD-LOG-4.md`, and **nowhere else**. Nothing above the
dated section is edited, and `docs/research/console-and-physical.md` is not edited in a build wave
at all — a correction is an escalation with its own commit, the `RW#` / `WM#` / `loader.ts:90`
precedent (`DECISIONS.md` 2026-08-31, §3.7).

**The ledger is FROZEN after wave 1.** §15's thirty-nine rows are seeded in wave 0 from this
plan and completed in wave 1 as each module first depends on one; from wave 2 on, **a new
`// OPEN:` constant is a deviation recorded in `PHASE-4-NOTES.md` §2**, not a quiet addition. That
is what stops an art wave acquiring unverified rulings under schedule pressure, and it is why the
freeze is one wave later than Phase 5's: wave 1 is where the paper and console modules discover
what they actually cannot verify.

### 11.2 The mount chain, wave by wave — and why RULE 2 is not optional

**§10.7 spells the chain and this is its one-paragraph summary**, because the mount chain is the
only thing in the phase that changes in five consecutive waves and is the exact place the winning
panel proposal broke. Wave 0: `src/ui/main.ts` calls `mountInternals` plus `mountUnitRecord` /
`mountAutocoder` / `mountRpg` at their moved paths. Wave 2: `period/unitrecord/mount.ts`
constructs the three printer views instead of `createPrinterView`. Wave 3: `period/reader/mount.ts`
replaces `period/unitrecord/mount.ts` and constructs the reader views, the wave-2 printer views and
the still-shipped `../unitrecord/inquiryView.js`. Wave 4: `reader/mount.ts` constructs
`console/mount.ts`'s station instead of `inquiryView`. Wave 5: `period/mount.ts` and `desk.ts` take
the printer and console constructions over and `reader/mount.ts` narrows to the reader station.

**RULE 2 is what makes each of those five states typecheck, and it caught FOUR deletions, not two.**
Each is paired with its importer's edit **in the same commit**, which is why every one appears on a
row of the wave table rather than in a follow-up:

| Deletion | Wave | The importers that wave therefore owns |
|---|---|---|
| `period/unitrecord/printerView.ts` | 2 | `period/unitrecord/mount.ts` (±6) |
| `period/unitrecord/cardView.ts` | 3 | `period/reader/mount.ts` (the replacement) **and `period/autocoder/objectDeckView.ts` (±3)** — `renderCard` → `renderCardFace` from `../reader/cardFaceView.js`, at both `:53` and `:64` |
| `period/unitrecord/deckBox.ts` | 3 | `period/reader/mount.ts` **and `period/autocoder/mount.ts` (±1)** — `type DeckBox` from `../reader/deckBoxView.js`, the same type name (`deckBox.ts:69`) |
| `period/unitrecord/inquiryView.ts` | 4 | `period/reader/mount.ts` (±8) |

The two in wave 3 are the ones round-1 review found: the plan had first touched both
`period/autocoder/` files in wave 5, which would have left `npm run typecheck` red from wave 3's
commit through wave 4's. `src/ui/main.ts` is a fifth importer, edited in waves 3, 4 and 5 (§3.3,
§10.7). The three `session.ts` files never move after wave 0, which is what
holds the four external test import lines at one edit each for the whole phase (§3.3).

### 11.3 The per-wave screenshot protocol

**RULE 4 exists because §14 R11 is the phase's largest unmitigated risk**: roughly 2,200 lines of
views across waves 2-4 (excluding mounts, sessions and lamps), plus `desk.ts` and ~800 restyled
lines, and 640 lines of CSS, produced by agents that render nothing, and **every gate in
this plan would go green on an ugly page**. A screenshot is not a test and this plan does not
pretend it is one. It is a per-wave deliverable with a stated purpose and a stated reader.

**What the screenshot is FOR — two things, named, because a screenshot with no question attached
is decoration.** (1) **The panel's box order**: the §5 indicator panel drawn left to right with
STATUS immediately right of ARITH, the 1402's Fig.60 strip in published order, the 1403's Fig.69
rows — all three are `[verified]` layouts that a node test proves as DATA and cannot prove as
PIXELS. (2) **The paper's proportions**: the 1403 form reading 132 positions wide without wrapping,
three lines to a half-inch bar, the card face reading as 7 3/8 × 3 1/4 with the cut at the upper
LEFT, the Selectric form reading 9 7/8 in wide. These are the two failure modes an oracle here
structurally cannot see, and they are the two the reviewer is told to look for.

**How it is recorded.** The build orchestrator takes it with `claude-in-chrome` against
`npm run dev` at the wave's HEAD, before the wave's Opus review, and records in that wave's
`docs/BUILD-LOG-4.md` section: the wave number, the commit, the station photographed, **what the
two questions above answered**, and any defect found with its resolution or its deferral to a named
later wave. **The PNG itself is COMMITTED with the wave** at
`docs/screenshots/phase-4/wave-N-<station>.png`, owned by a §3 row of that wave (§3.3, §3.4) over
the directory wave 0 creates with its `README.md` (§3.1), and the build-log section references it
**by relative path** — never as a base64 data URI, which would make the log unreadable in
`git diff` (§16 item 7). Waves 2, 3, 4 and 5 each carry one; wave 5's is the whole desk **in both
tabs**, because the one thing a single-station shot cannot show is whether the period and internals
surfaces have converged into one look (§14 R9). The screenshots' presence is checked at the phase
gate (§13 closing paragraph); their CONTENT is a review judgement and is written down as one,
never as a passing command.

**What happens when the screenshot shows a defect.** Three outcomes, and the wave records which:
**fixed in the wave** (the ordinary case — the wave owns the file); **deferred to a named later
wave** with the reason, which is legitimate only when the fix belongs to a file that wave does not
own (a colour or spacing complaint against `period.css` before wave 5, for instance); or
**escalated**, when the defect is a research question rather than a drawing error — in which case
it goes to `open-questions.md`'s dated section by the §11.1 route and never into
`console-and-physical.md`. A screenshot that raises nothing says so explicitly; a wave section with
no screenshot line is an incomplete wave, and the phase gate checks for the line, not for a
verdict.

---

## 12. Test tiers and gates

### 12.1 Tiers

**Seventeen new test files, counted off the table below rather than estimated.** `test/` already
spells manual-worked-example tests `tier1-*` and its oracle tiers `tier2-` / `tier3-` / `tier4-`;
this phase adds one file at the `tier4-` prefix and gives everything else the `period-` module
prefix, the way `asm-source.test.ts` and `rpg-cycle.test.ts` are named. **The tier table is the
specification and the number is read off it: 9 + 1 + 6 + 1 = 17.** §11's wave rows are the
independent second count and enumerate the same seventeen files — wave 0: 1, wave 1: 6, wave 2: 1,
wave 3: 1, wave 4: 3, wave 5: 4, wave 6: 1 — and §3's per-wave blocks carry the same seventeen rows.
**Sixteen run in `npm test`; one runs in `npm run smoke`.** The T1 file keeps its `period-` prefix
rather than taking a `tier1-` one because §3 names it that way and because `package.json` keys on
**`tier4-` only** (`"test": "vitest run --exclude 'test/tier4-*.test.ts'"`, `"smoke": "vitest run
test/tier4-"`): the tier is a property of this table, and only the `tier4-` prefix is load-bearing.

| Tier | Files | In `npm test`? |
|---|---|---|
| **T0 — table fidelity** (9) | `ui-controls-verbatim` (the SHA-256 literal `a6d9…f318f`, plus `--numstat` zero over `controls.ts`, `coreView.ts`, `registerView.ts`) · `period-is-dom-free` (`core-is-dom-free.test.ts`'s regex set at `:14-20` — **code shapes, not English words**, because that file's own header records what banning words cost — **EXTENDED** by `/\bSVGElement\b/`, `/\brequestAnimationFrame\(/` and `/\baddEventListener\(/`, over §3.8's required-path list, which is **eight paths at wave 1** — the five wave-1 modules plus the three moved block `session.ts` files — and **eleven at wave 5** after wave 4 appends two cases and wave 5 appends one; plus the rewritten import case: every import under `src/ui/period/**` is relative and resolves inside `src/ui/period`, `src/core`, `src/formats`, `src/asm`, `src/rpg` **or `demos`** — `demos` because the five Vite `?raw` sample imports resolve there (`deckBox.ts:14`, `sourceBox.ts:19-20`, `specBox.ts:8-9`; §10.6 item 1), a build input rather than a cross-surface reach, and no required-path file imports from it — with the ONE sanctioned exception `src/ui/internals/controls.js` asserted by name, which holds **from wave 0** because wave 0's seventh rewrite points all thirteen `panel.js` importers at `period/dom.ts`) · `period-chain` (five duals, all 64 codes, both directions, diffed against `chainGlyph` and against charset.md §5's table **read from the research file**) · `period-cardgeometry` (80 × 0.087 in centred in 7.375 in with equal margins; 12 × 0.250 in below a 3/16 in band inside 3.25 in; no hole intersects the band or either column-number row; the cut is upper LEFT; `holePath` agrees with `punchMask` for every punchable BCD code; the golden) · `period-light-panel-vs-research` (both directions against §5's markdown table modulo the exception list, one §12 citation per entry) · `period-css-covers-every-class` · `period-no-second-frame-loop` · `period-keydown-ownership` (two cases: the listener location, and `.press(` only under `src/ui/period/console/**`) · `period-refusal-grep` (**the file exit criterion 18a is carried by**: §12's refusal tokens and the time-unit tokens over DRAWN LABELS under `src/ui/period/**` — exported label tables, `text()` arguments, `aria-label`s — with the whitelist by file + line + citation) | yes |
| **T1 — the manual worked example** (1) | **`period-selectric` — THE PHASE-4 ORACLE.** Reads `docs/research/console-and-physical.md`, slices the fence between lines **59 and 79**, excludes the elided `D bbbb...` row **BY NAME in the test header**, builds each remaining line through `formatPrintout` with the fields §2's layout table names, and asserts byte equality against `renderSelectric(lines, {matrix:'flush', marks:'strip', spacing:'ignore'})`. Then, as separate named cases: the CH1+CH2 group is ONE 4-character run with no inner space carrying `underline[]` true across all four when the unit-select is absent; the S/C/E rows carry `spacingBefore: 'double'`; the 35-lines render five columns right of the 30-lines under `matrix:'indent'`; `Ø` is slashed and the letter `O` is not (C28-0351-5 p.2); load-mode `b` and a real space render as two distinct things (`R SØ1 JOB  SAMPLE` has real spaces) | yes |
| **T2 — module properties** (6) | `period-page` (paginate's four rules; the `renderGreenBar` cross-check over three shipped page goldens; **the synthetic three-form case**; the two-lines-at-one-position throw) · `period-carriage` (`traversed` over single / 2 / 3-line spaces, in-form skips, form-wrapping skips, the one-form bound; `straddled` returns a punch **iff crossed and not landed on**; a single-line space never straddles) · `period-printer` (the deck-driven half of §11 wave 2) · `period-reader` (hopper depth, read-buffer card and the five pocket counts through the **UNCHANGED** `unitrecord/session.ts` after real reads through `Channel1` and `Reader1402`; the loaded-deck case; `reader/keysView.ts`'s `LIT_CONSTANTS` = POWER only) · `period-console` (`turnTo` over all 30 ordered pairs; the keyboard FSM; `take(; `console/keysView.ts`'s `LIT_CONSTANTS` = POWER ON and READY only)` against the frozen `keyed()` on a corpus — **imported, never reimplemented**; the inquiry hold) · `period-session` (`PeriodViewState` transitions; the `stale` rule; the CSS lint) | yes |
| **T4 — the storyboard, and it GATES** (1) | `tier4-period-storyboard.test.ts` (wave 6) | **no — it joins `npm run smoke`** |

**Existing files that must pass UNEDITED except ONE import line each — the session/adapter gate.**
`test/session.test.ts` (`:27`), `test/tier4-autocoder-demo.test.ts` (`:37`),
`test/tier4-rpg-demo.test.ts` (`:17`), `test/rpg-is-dom-free.test.ts` (`:78`) — the four functional
references to `src/ui` outside `src/ui`, verified as the whole external surface alongside
`index.html:39`. **Untouched entirely:** `test/printout.test.ts`, `test/asm-listing.test.ts`,
`test/printer1403.test.ts`, and every other file in `test/`. **If Phase 4's restyle broke the
DOM-free session layer, one of these stops passing** — which is the whole reason the three
`session.ts` bodies are frozen (§3.6).

**Regression, every wave.** `npm test` **93 → 109 files**, **1745 → ≈1,930 tests**, **1 named
skip**, 0 fail; `npm run smoke` **6 → 7 files, 49 → 50**; `npm run cc01` byte-identical at 1241
instructions with the check at 00322; **348 / 2251 / 3688 / 6982** bytes; and
`test/golden/cycle-probe.page.txt` and `test/golden/card-list.page.txt` **unmoved, checked by
`git log --follow`** at close-out. The test-count figure is stated as **≈** and corrected per wave
in `docs/BUILD-LOG-4.md` with the actual; the FILE count is exact, because §3 enumerates the files.
*(These correct the dossier's "93 → ~103 files, 1745 → ~1900 tests", which predated §3's file
table.)*

### 12.2 Gates at every commit

```text
npm run typecheck                                            clean
npm test                                                     93 files / 1745 / 1 skip today;
                                                             109 / ≈1,930 / 1 skip at merge
                                                             — the new number stated in the commit
npm run smoke                                                6 files / 49 today; 7 / 50 from wave 6
                                                             — the new number stated in the commit
npm run cc01                                                 byte-identical: CC01A, CC01 COMPLETE,
                                                             instruction check at 00322,
                                                             1241 instructions — NEVER MOVES
npm run demo -- --golden test/golden/hello-dad.page.txt      PASS, 348 bytes, unchanged
npm run asm -- demos/hello-dad.asm --listing \               PASS, 2251 bytes, unchanged
  --golden test/golden/hello-dad.lst
npm run rpg -- demos/sales-summary.rpg --page \              PASS, 3688 bytes, unchanged
  --golden test/golden/sales-summary.page.txt
npm run rpg -- demos/sales-summary.rpg --listing \           PASS, 6982 bytes, unchanged
  --golden test/golden/sales-summary.lst
npm run build                                                exits 0
grep -c 'src="\./assets' dist/index.html                     1   (0 today — `base: './'` is why)
```

**`npm run build` is in the per-commit gate and that is a Phase-4 addition** (§14 R3), for two
build-time failures `npm run typecheck` cannot see. A `?raw`
shim failure is one. The other is the CSS import: `src/ui/main.ts` lands in wave 0 carrying
`import './styles/period.css'`, Vite resolves that on disk, and `tsc --noEmit` exits **0** with the
ambient shim whether or not the file exists — measured — which is why wave 0 creates the file as a
five-line stub and wave 5 fills it (§3.1, §10.3). The `grep` line is the same check as exit
criterion 17's first half and is cheap enough to run beside it.

**The oracle-count rule — state BOTH counts, and say which you ran.** `npm test` and
`npm run smoke` each run `npm run oracles` first (`"pretest"`, `"presmoke"` in `package.json`),
which builds `tools/` and downloads GPL oracle files into a gitignored `oracles/`. Two measured
facts settle how this phase handles that, and the second corrects the panel's completeness critic:

- **A missing oracle is already a RED test, not a silently lower count.**
  `test/oracles-present.test.ts` fails outright when `oracles/` lacks any of `cc01.cor`,
  `insttest.cor`, `ilentest.cor`, `note1410.txt` — *"This test is the difference between 'the
  oracles agreed' and 'the oracles never ran'"* (its own header). Critic item 9 assumed a green run
  at a lower count; the tree already refuses that.
- **Under `ALLOW_MISSING_ORACLES=1` with `oracles/` absent, measured on `voltron` at `b7c60b3`:**
  `npm test` reports **87 passed / 5 skipped / 1 FAILED file** — `test/tier3-index-exec.test.ts`
  **fails outright rather than skipping** — and **1649 passed / 93 skipped** tests;
  `npm run smoke` reports **4 passed / 2 skipped files** and **44 passed / 5 skipped**.

So: **the plan states both counts, the wave's commit message says WHICH it ran, and a wave gate is
never taken under the flag.** `ALLOW_MISSING_ORACLES=1` is a real path a worker offline will take
and is legitimate for iterating; it is not a gate, because one file is red under it and a red file
in a gate run is indistinguishable from a lost test at the count level. A wave that cannot reach
the network **defers its gate** and says so in `docs/BUILD-LOG-4.md`. Phase 4 touches no oracle
path, so **any movement in the oracle-tier numbers is a Phase-4 defect that escaped its own
boundary** — the same argument cc01 byte-identity rests on.

Then Opus adversarial review, fixes, one commit, push `feature/phase-4-period-ui`. **Never `main`.**

### 12.3 The fixture inventory, checked rather than assumed

**ONE new golden FILE in the whole phase.** `test/golden/card-face-a.svg.txt` (~12 lines): the two
`<path d>` strings and the interpretation-band text for card 1 of `demos/hello-dad.cards`,
generated by `holePath` / `outlinePath` / `bandGlyphs` and frozen in wave 1. **Its header says
CONSTRUCTED**, following `RPG_GOLDENS_ARE_CONSTRUCTED`'s precedent — Phase 5 declared that as a
grepable export in `test/rpg-generate.test.ts:20` precisely so a reader could tell provenance from
period truth, and each golden's own header repeats it (`open-questions.md:851`). The card face is
**`[likely]` geometry from secondary sources** (`CARD_GEOMETRY_IS_SECONDARY`,
`CARD_SIZE_7_3_8_BY_3_1_4`, `CORNER_CUT_IS_UPPER_LEFT`; ANSI X3.21-1967 unread), so the golden is
a **regression pin on one geometry module**, not evidence about IBM's card, and the header says
exactly that.

**TWO expectations sliced from research at test time, and they are NOT files.**

1. **The Exhibit II job log** — `docs/research/console-and-physical.md` §2, the fence between
   lines **59 and 79**, nineteen content lines, with the elided **`D bbbb...`** row excluded **by
   name in `test/period-selectric.test.ts`'s header** (C28-0326-2 Appendix C Exhibit II p.55,
   `[verified]`).
2. **charset.md §5's dual table** — the five-row `| Hollerith | BCD | Octal | A | H |` table
   whose header row is at line 174 (the §5 heading is line 168), diffed against `CHAIN_DUALS` in `test/period-chain.test.ts`.

**Why a slice beats a copy.** A copied expectation is a second transcription of a primary source,
free to drift from the research file that justifies it, and the drift is invisible: both files stay
internally consistent while one of them stops matching the manual. A slice cannot drift — if the
research file is edited, the test moves with it or fails at the slice. The mechanism is already
shipped and proven: `test/rpg-columns-vs-research.test.ts` reads `docs/research/rpg-sources.md`
and expands its published table shapes rather than restating them, *"the plan §7.2 diff, not a
second hand transcription"* (its own header). It also makes §2.2's refusal enforceable: this phase
**cannot edit `console-and-physical.md`**, so a wave that wanted a friendlier expectation would
have to change the manual quote, which is an escalation with its own commit.

**Four shipped goldens this phase READS and never writes.** Three page goldens carry the
`renderGreenBar` / `paginate` identity of §5.1 — `hello-dad.page.txt` (348 B),
`sales-summary.page.txt` (3688 B) and `cycle-probe.page.txt` (2522 B, which also carries the
straddle) — and one listing golden constrains the A/H restrike: `hello-dad.lst` (2251 B), because
`renderListing`'s output is chain-A TEXT and the toggle must be a display transform that never
reaches it (critic item 5). The other two files in `test/golden/` — `card-list.page.txt` (120 B)
and `sales-summary.lst` (6982 B) — are checked by the standing gate and by exit criterion 6 but are
read by no Phase-4 test. **All six are on §3.7's do-not-touch list**, and `git log --follow` at
close-out proves none moved.

---

## 13. Exit criteria — §1's storyboard, mechanically checkable

**Nineteen criteria**, each a command or an assertion, each naming the file that carries it. (The
panel dossier's skeleton said "eighteen" and then listed nineteen; nineteen is the count, and it is
read off this list rather than written down twice — the §12.1 rule.) Criteria 1-18 are machine-run
at close-out; 19 is the human walk, and it is labelled as one rather than pretended to be a gate.

1. **`npm run typecheck` clean.** Run at every commit, not only at close-out — the wave-0 shim
   merge and the wave-3 `findAlterBox` deletion are both designed to fail HERE rather than at run
   time (§9.4, §14 R3, R7).

2. **`npm test` green at 109 files / ≈1,930 tests / 1 named skip / 0 fail, and `npm run smoke`
   green at 7 files / 50** — the file counts exact, the test count as corrected per wave in
   `docs/BUILD-LOG-4.md`, and **the run states whether it had `oracles/`** (§12.2). A gate run
   under `ALLOW_MISSING_ORACLES=1` does not satisfy this criterion.

3. **`shasum -a 256 src/ui/internals/controls.ts` equals
   `a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f`**, and
   `git diff --numstat <base>..HEAD -- src/ui/internals/{controls,coreView,registerView}.ts` shows
   **zero changed lines in all three**; `src/ui/internals/panel.ts` shows **exactly 16 deleted
   / 2 added** — wave 1's **sixteen-line fold**: the private `renderConsoleLine`, its two
   combining-mark constants, the four-line comment that exists only to describe them, and the blank
   line at `:75` that would otherwise double `:60`'s (**lines 61-75**), plus the one rewritten call
   at line 145, against the `renderSelectric` import and the new call. **A builder who leaves the
   orphaned comment behind fails at 12/2; one who leaves the doubled blank fails at 15/2** — which
   is why the number is 16 and the lines are named. **The diff is stated exactly in the
   wave-1 commit message**. Carried by `test/ui-controls-verbatim.test.ts`.

4. **The no-core-change gate, and it is a command:**
   `git diff --stat <base>..HEAD -- src/core src/asm src/rpg src/formats tools demos test/golden`
   is **EMPTY at every commit except for the ONE new golden file this phase adds**,
   `test/golden/card-face-a.svg.txt`. This is architecture.md §7's Phase-4 row — *"Consumes
   `ConsoleLine[]`, `PrintEvent[]`, `Deck` — no core changes"* — turned into a per-commit
   assertion. *(The dossier's crit. 4 said "the three new golden files this phase adds"; §12.3
   counts one file plus two research slices.)*

5. **`npm run cc01` byte-identical:** CC01A, CC01 COMPLETE, instruction check at **00322**,
   **1241 instructions**. Load-bearing twice over from wave 1 on, because `tools/run-cor.ts`'s own
   `renderConsoleLine` (lines 43-49) is deliberately NOT folded into `renderSelectric` — it has no
   `spacingBefore` clause, and folding it would put blank lines into this transcript (§3.6).

6. **The four frozen goldens PASS unmoved at 348 / 2251 / 3688 / 6982 bytes**, and
   `test/golden/cycle-probe.page.txt` (2522 B) and `test/golden/card-list.page.txt` (120 B) show
   **no commit since the wave that froze them**, checked by `git log --follow` over both paths at
   close-out.

7. **The Phase-4 oracle:** `test/period-selectric.test.ts` reproduces the Exhibit II block **sliced
   from `docs/research/console-and-physical.md` §2** (the fence at lines 59 and 79) **byte for
   byte** at `{matrix:'flush', marks:'strip', spacing:'ignore'}`, with the elided `D bbbb...` row
   excluded **by name in the test header**, and the marks / spacing / matrix / slashed-zero /
   blank-versus-`b` rules pass as **separate named cases**. This is architecture.md §8's named
   Phase-4 oracle and it costs no fixture (§12.3).

8. **For all three shipped page goldens** — `hello-dad`, `sales-summary`, `cycle-probe` —
   `renderGreenBar(paper, {chain:'A', formLines:66}) === header + paginate(paper, carriage, 66)
   .filter((p) => p.printedThrough > 0).map(trimRule3).join('\f\n')` — **§5.1's identity,
   instantiated at chain A and 66 lines**. The filter is `renderGreenBar`'s rule 2, ink
   only; and the separator on the paper is `\f\n` because `renderGreenBar` pushes `'\f'` as its own
   array element and then maps every element to `${line}\n` (`printer1403.ts:743-752`), so a `'\f'`
   join fails on `cycle-probe` and `sales-summary` by exactly one byte per form break. **Plus the
   synthetic three-form case**, and every `FormPage.lines` entry exactly 132 characters, in
   `test/period-page.test.ts`. `paginate` imports nothing from `printer1403.ts`
   (`PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR`): the two renderers are independent or the identity is
   a tautology (§14 R10, residual risk 4).

9. **The straddle**, in `test/period-printer.test.ts`: on `demos/cycle-probe`,
   `straddled(lastPrintedOn(form 2), { form: carriage.page, line: carriage.line },
   machine.printer.tape)` is exactly
   **`[{line:60, channel:12}]`** while **`carriage.channel12 === false` on the same frame**, and the
   banner text is asserted **verbatim including the constant name and
   `src/core/devices/printer1403.ts:354`**; on `demos/sales-summary` it is **empty**.

10. **Exactly one `S` line per rotary turn over all 30 ordered detent pairs**, including
    **RUN→DISPLAY→RUN**, and **zero** for a turn to the current detent — asserted on
    `snapshot().console` on a real `createMachine({size:10_000})`, with
    `git diff --stat <base>..HEAD -- src/core/machine.ts` **empty**. Six detents, a four-member
    `ConsoleMode`, zero core lines (`machine.ts:325`, `:327`, `:380`). **And with the run latch on,
    a turn to DISPLAY types one `S` AND halts** — the session's `halt` hook fires, supplied as a spy
    — because the manual's sentence is about a stop, not a print-out (A22-0526-3 p.50). Carried by
    `test/period-console.test.ts`.

11. **The keyed dialogue**, same file: a DISPLAY keyed **one character at a time** produces exactly
    the two `ConsoleLine`s `machine.display()` produces (`machine.ts:392-411`); an ALTER without a
    preceding display is **refused and types nothing**; a displayed word mark not re-entered is
    **gone from STORAGE** after the alter, asserted on storage and not on the log; and the twelve
    `BOOTSTRAP_KEYSTROKES` characters go in through `press()` / `pressWordMark()` with marks at
    positions 1 and 11 (`loader.ts:26-32`).

12. **For all 64 codes `restrike(chainGlyph(c,'A'),'H') === chainGlyph(c,'H')` and the reverse**,
    `CHAIN_DUALS` equal to charset.md §5's table read from the research file, **and a grep proves
    there is no second chain table under `src/ui/**` and no import of `paper/chain.ts` from
    `src/asm/**`**. `test/period-chain.test.ts`. Criterion 6's `hello-dad.lst` at 2251 B is the
    other half: the restrike is a display transform and never reaches `renderListing`.

13. **`test/golden/card-face-a.svg.txt` byte-identical through `cardGeometry.ts`** in
    `test/period-cardgeometry.test.ts` — **and `holePath` agrees with `punchMask` for every punchable
    code**. One geometry module, three scales, no second punch table. **No oracle instantiates
    `cardFaceView`**: the run is `environment: 'node'` (`vite.config.ts:8-11`) and §2.2 refuses
    jsdom, so a view built on `document.createElementNS` throws on construction. It costs nothing —
    the three scales are a `viewBox` width set by CSS and the path strings are scale-invariant, so
    there is **one** golden and the view is an adapter, gated by criterion 19's eye.

14. **`lampsOf()` diffs clean in BOTH directions** against console-and-physical.md §5's markdown
    table modulo the exported exception list, each entry carrying its architecture.md §12 citation;
    **every non-null `source` names a field on `MachineState`**; the drivable set is **exactly the
    one §8 enumerates**, its size read off `lampsOf`'s own non-null entries and stated in the
    commit message rather than written down twice; **STATUS is present and immediately right of
    ARITH**; **`OMITTED_LAMPS` has exactly eight entries and none appears in `PANEL_BOXES`** — the two
    CH2 columns, `1401 COMPAT`, `TAPE OFF LINE`, `DISK OFF LINE`, CH1's `OVERLAP IN PROCESS` and
    `NOT OVERLAP IN PROCESS`, and `PRIORITY ALERT`; a grep finds no
    register name in any lamp label or value; and **the drawn panel carries its REDUCED label**
    (critic item 3). `test/period-light-panel-vs-research.test.ts`.

    (The dossier's criterion said "exactly the fifteen lamps `MachineState` can drive"; §8.1's enumeration sums to sixteen, and the count is read off the module rather than pinned here.)

15. **Constraint 11, in node** (`test/period-session.test.ts`): `assemble()` → a one-character
    `setSource` → **`stale === true` and `hopperText() === ''`**; `setSpecText` → `handOff()`
    returns `{source:'', dataCards:''}`. **And `test/tier4-autocoder-demo.test.ts` and
    `test/tier4-rpg-demo.test.ts` pass with only their import line changed** (`:37`, `:17`) —
    the bound on the one Phase-3 session-body edit the phase makes (§14 R8).

16. **`test/tier4-period-storyboard.test.ts` runs §1 headlessly** from `demos/sales-summary.rpg` to
    two forms whose trimmed `paginate` join equals `test/golden/sales-summary.page.txt` (3688 B),
    with the keyed bootstrap's four `S` lines, the `D` address/data pair, the `A` line carrying its
    word mark and the released inquiry's `I` line present in the rendered Selectric log. **It joins
    `npm run smoke` at 7 files / 50.**

17. **`npm run build` exits 0**; `grep -c 'src="\./assets' dist/index.html` is **1**;
    `vite.config.ts` contains **`base: './'`** and no other Phase-4 config change;
    `dist/index.html` **opens from the filesystem with no network request**; and `dist/` is under
    **400 kB** (2.42 kB HTML + 250.29 kB JS today, measured before this plan was written). This is
    the criterion that closes `DECISIONS.md` line 11 as **Vite `[settled]`**.

18a. **The §12 refusal grep, by explicit token, over DRAWN LABELS under `src/ui/period/**`,
    carried by `test/period-refusal-grep.test.ts`** (~60 lines, wave 5, tier T0 — §3.4, §11 wave 5
    oracle (g), §12.1). The grep is scoped to the string literals that reach the page as text — exported label tables,
    `text()` arguments, `aria-label`s — the same "defined grep" mechanism
    `test/rpg-columns-is-the-only-place.test.ts` uses, so a CSS `200ms` transition and an
    identifier like `loadDeck` are out of scope by construction, not by exception. **The match is
    case-sensitive over whole label tokens**, and comments and file headers are outside it by the
    same construction — so the `[verified]` legends `CLOCK` (§8) and `END OF FORMS` / `FORMS CHECK`
    (§7.2) cannot collide with the lowercase time-unit tokens `clock` and `ms`, and §16 item 2's
    three headers under `src/ui/period/**` may quote the 1401 refusals by name. **The tokens:**
    `PRIORITY ON`, `PRIORITY PROCESSING`, `COMPATIBILITY`, `DENSITY`, `DISK WR`, `1401 COMPAT`,
    `TAPE OFF LINE`, `DISK OFF LINE`, `729`, `address dial`, `LOAD` **as a 1402 key label**, **any
    red-fault colour token**, **and the time-unit tokens `µs`, `ms`, `sec`, `seconds`, `clock`,
    `elapsed`, `speed`** (critic item 8 — `microsecondsSimulated` stays on the internals tab and is
    never a clock, architecture.md §6). **Whitelist mechanism:** each exception is listed by
    **file + line + citation** in the test, and there is one — the phrase `carriage tape` (which contains no refused token but is checked
    because a builder will reach for "tape"). A whitelist entry with no citation fails the test.

18b. **Keydown ownership** (`test/period-keydown-ownership.test.ts`), in TWO cases: under
    `src/ui/period/**`,
    `addEventListener('keydown'` and `addEventListener('keypress'` appear in **exactly one file,
    `console/keyboardView.ts`**, and `document.addEventListener(` / `window.addEventListener(`
    appear **nowhere**; **and `.press(` appears only under `src/ui/period/console/**`** — §6.5
    ruling 3's three-caller set (the `keydown` handler, the drawn key tops' click handlers, and
    `ConsoleSession.keyBootstrap`) as an assertion rather than a claim, since the deck box's `key
    the bootstrap` button calls `session.keyBootstrap` and never `press`.
    `KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT`. Critic item 1
    and §14 R2′ — the one defect no architect designed against, on a page carrying three
    `<textarea>`s: a `document`-level listener silently eats characters typed into the coding
    sheet.

19. **The human walk, recorded by name and date in `docs/BUILD-LOG-4.md`.** Precedent: phase-3
    criterion 11b and phase-5 criterion 13b — the browser check is written down as the one thing a
    person does at a screen, not disguised as a command. Tom runs `npm run dev` and walks §1 end to
    end **in one sitting**, writing down what he saw:

    - the hopper emptying **one card edge at a time**, and the `0 (NR)` pocket filling;
    - the Selectric typing with **circumflexes, underscores and slashed zeros**;
    - the 1403 form filling to **132 positions without wrapping**, the ruler scrolling with it;
    - **form 1 sliding onto the stack** in one 200 ms transform and being **scrollable back to**,
      all 66 line positions including blanks;
    - **plain white and the ruler toggling**;
    - the **straddle line** under the carriage tape, with the channel-12 lamp visibly off;
    - **four `S` lines — the STOP key and three detent turns**;
    - the display/alter dialogue **unlocking BEFORE the address is typed**, and **after START the
      next keystroke landing on the Selectric with no click** — §6.5 ruling 5's focus hook, the one
      thing between a working dialogue and a dead keyboard;
    - **INQUIRY REQUEST holding the run** and RELEASE resuming it;
    - the **C.E. door** saying nothing behind it is modelled;
    - **INTERNALS** showing `controls.ts` unchanged behind its hairline rule and anachronism label,
      the live MODE label above it reading `machine.mode`, and the counter reading a cycle count
      and **never rendered as a clock** — architecture.md §6's own test; the unit is µs
      (`panel.ts:153`) and it is a cycle count.

    A defect found here is a finding for `docs/BUILD-LOG-4.md` and a fix commit, not a reason to
    move a golden.

**The phase gate.** All nineteen green; the four per-wave screenshots present in
`docs/BUILD-LOG-4.md` with their two questions answered (§11.3); criterion 19 run and recorded by
name and date; `PHASE-4-NOTES.md` §1's `// OPEN:` rows a set-equal match for the constants grepped
out of `src/ui/period/**`; then **the ≤7 bullets to Tom** (`CLAUDE.md` § Engineering rules —
approval before the phase, and the close-out summary after it). `docs/STATUS.md` and
`docs/DECISIONS.md` are updated by the orchestrator at merge, never by a wave (§3.7).

---

## 14. Risks

Thirteen numbered risks, R1-R13, plus **R2′** — the completeness critic's item 1, which the
dossier's twelve did not carry and which is the single most likely shipped defect in the phase. It
is primed rather than renumbered so the R-numbers §1-§13 cite stay put. Six of the dossier's
residual-risk bullets are folded into the row each belongs to rather than listed twice: the
`D bbbb...` exclusion into R4, the oracle-count ambiguity into R3, the `paginate` tautology and the
straddle's mid-run under-report into R10, the frozen-`<select>` confusion into R6, the wave-5 size
into R13.

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Size.** §3.9 adds the file rows up: **~3,905 new source lines in 30 files**, ~795 restyled (659 today), 804 deleted in ten files, **640 CSS in ONE wave**, **2,315 test lines in 17 files**. Against Phase 5's ~3,670 + 450 + 170 / 2,420 and Phase 3's ~4,450. | Added up rather than estimated: §3.9 sums the per-file rows and **corrects the dossier's own bullet 7** ("~2,300 new + ~1,600 restyled"), whose wave headlines did not sum to its own file list. The volume is art, not logic — **no number that matters is computed in a file that touches the DOM** (§2.1), so the 640 CSS lines and the ~2,200 lines of views across waves 2-4 carry no arithmetic a test would want. Per-wave file ownership, one commit per wave, and R13's relief valve for the one wave that is genuinely oversized. |
| R2 | **Frame cost.** A 132 × 66 form, a growing printed stack, a 3,000-card hopper and an 80-column Selectric log, redrawn on an animation frame. | **ONE `requestAnimationFrame` in the whole of `src/ui/**`**, in `src/ui/main.ts` (§10.2), asserted by name in `test/period-no-second-frame-loop.test.ts`; the frame gate from `unitrecord/mount.ts:28-37` (`dirty` / `kick`, `machine.mode === 'run'`) moves into it and **keeps both terms** — `session.detent === 'run' && machine.mode === 'run'`, never one instead of the other, because the byte-frozen `controls.ts` `<select>` (`:80-85`) can still move `machine.mode` on its own and `machine.start()` dispatches on it (`machine.ts:355-374`, where `ieCycle` types a `C` line per call) — plus the console session's `held` latch, and it renders on `dirty` alone. Forms are text rows, not per-character nodes; a card face is two `<path>` elements from `holePath` / `outlinePath`; the hopper is ≤40 edge slivers plus a count against 3,000. Every view keeps its shipped diff key — `readerView.ts:72-84` (eight counts joined into one string), `printerView.ts:144-155` (paper length plus five carriage fields), `inquiryView.ts:64-74` (one boolean), `panel.ts:143-147` (log length) — which is the ~120 lines the framework ruling says a framework would replace with a reconciler. |
| R2′ | **Focus and keystroke ownership** (completeness critic item 1). A focusable Selectric shares the page with three `<textarea>`s — the coding sheet, the spec sheet, the deck box — and the two `<input>`s inside the byte-frozen `controls.ts`. A `document`-level `keydown` listener eats characters typed into the coding sheet while MACHINE ROOM is visible. **No oracle in this plan can see it, no architect designed against it, and it is the likeliest defect the phase ships.** | Fixed as a rule, not as care: `console/keyboardView.ts` is **the only file in `src/ui/**` that binds `keydown`**, on its own `tabindex="0"` console region and never on `document` or `window` (§3.3, §6.5); `ConsoleKeyboard.press` has **exactly three callers, all under `src/ui/period/console/`** — that handler, the drawn key tops' click handlers, and `ConsoleSession.keyBootstrap` — so no KEYSTROKE that landed elsewhere can reach it. `test/period-keydown-ownership.test.ts` (~40 lines) makes both halves mechanical — `addEventListener('keydown'` / `('keypress'` appear ONLY in `keyboardView.ts`, `document.addEventListener(` / `window.addEventListener(` appear nowhere under `src/ui/period/**`, and `.press(` appears only under `src/ui/period/console/**`. §13 criterion 18b carries both greps; **criterion 19's human walk carries the named case**: typing in the coding sheet with the machine room tab visible must not reach the carrier. Ledger row `KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT`. |
| R3 | **The wave-0 move breaks an import or a `?raw` shim — and the gate numbers that would catch it are themselves ambiguous.** `?raw` is load-bearing (five imports across `deckBox.ts:14`, `sourceBox.ts:19-20`, `specBox.ts:8-9`), and **the compiler does not catch a duplicate**: `autocoder/raw-import.d.ts:4-8`'s shipped header says re-declaring `*.cards?raw` from a second file merges into a duplicate `export default` and fails typecheck, and that is measurably false on this toolchain (`tsc` 5.9.3, this `tsconfig.json`: two blocks in two files, two in one file, and one with a live import all exit 0). | The three shims **merge into one** `period/raw-import.d.ts` as a SIMPLIFICATION — one place for Phase 6's `*.asm?raw` line — and the merged shim's header records the measurement above instead of repeating the claim; **the structural mitigation is `npm run build` in the per-commit gate**, since a `?raw` failure is build-time and not test-time. Wave 0's oracle is identity, **scoped to the moved trees**: `git diff -M --find-renames <base> -- src/ui/unitrecord src/ui/autocoder src/ui/rpg src/ui/period/unitrecord src/ui/period/autocoder src/ui/period/rpg ':!*/raw-import.d.ts' \| … \| grep -v "from '\.\./"` prints NOTHING, with the wave's new and deleted files covered by `git diff --stat` against §3.1's rows, and the counts are exact (the 93 EXISTING files at 1745 tests / 1 skip, plus this wave's own `ui-controls-verbatim` → 94 / ≥1,747; smoke 6 / 49; cc01 1241 instructions, check at 00322; 348 / 2251 / 3688 / 6982 bytes). `npm run build` earns its place in that gate twice over: a `?raw` failure is build-time, and so is a missing `src/ui/styles/period.css` — which is why wave 0 creates it as a stub (§3.1, §10.3). The count leg: both `npm test` and `npm run smoke` run `npm run oracles` first. Measured at `b7c60b3` with `oracles/` absent and `ALLOW_MISSING_ORACLES=1` — 87 passed / 5 skipped / **1 FAILED file** (`test/tier3-index-exec.test.ts` fails outright, it does not skip), 1,649 passed / 93 skipped; smoke 4 passed / 2 skipped files, 44 / 5 — and without the flag `test/oracles-present.test.ts` fails. **This corrects the dossier's critic item 9: a missing oracle is already a red test, not a silently lower count.** §12.2 still states the count with and without, and the commit message says which it ran, because `ALLOW_MISSING_ORACLES=1` is a real path a worker offline will take. |
| R4 | **The matrix-position reading is `[likely]`, and the Exhibit II slice it is compared against carries a judgement call that can drift.** The 1415's positions 30 and 35 are `[verified]` as POSITIONS (console-and-physical.md §2 — S223-2648 Fig.5 p.9; A22-0526-3 Fig.42 p.46); their unit and origin are not. And the Exhibit II block contains `D bbbb...`, a literal elision the manual never printed. | The primary-source comparison runs at `{matrix:'flush'}` **precisely so it does not depend on the ruling**: an overturn moves one default in `SelectricOpts` and no golden. What is rendered is the difference, `matrixPos - 30`, never an absolute column from the paper's left edge. The expectation is a **slice** of `docs/research/console-and-physical.md` §2 between the fences at lines 59 and 79 (nineteen content lines), taken at test time by the mechanism `test/rpg-columns-vs-research.test.ts` already ships — so the research file is the oracle and cannot be edited to match the code. The `D bbbb...` row is excluded **by name in the test header with its reason** (§16 item 6), so a later reader who "restores" it is contradicting a written sentence rather than filling a silence; §12.3 records that the expectation is a slice and not a file, which is what stops it being quietly re-cut. |
| R5 | **Scope creep into a machine room.** A period UI wants a floor, a cabinet, a wall, and a clock. | §2.2 refuses each with its page: no scale elevation and no floor plan (console-and-physical.md §6, "No IBM dimension figures located for the 1411 or the 1415 cabinet" `[unverified]`; §13 rows 2-3; A22-0526-3 Fig.57 p.59 has 729 tape drives in it that architecture.md §12 forbids depicting (the 1414-3 beside them is part of the modelled machine — §12's own "one machine" line)). **No dimension in inches is printed anywhere** except the card's and the two paper stocks' — the three things a person can hold. §13 criterion 18a's token grep runs at close-out and includes the time-unit tokens (`µs`, `ms`, `sec`, `seconds`, `clock`, `elapsed`, `speed`) so that critic item 8's refusal — `microsecondsSimulated` never reaches the desk — is mechanical rather than remembered. A named review checkpoint every wave. |
| R6 | **The internals MODE `<select>` goes stale against the period rotary**, because `controls.ts` is byte-frozen and its `<select>` never re-reads `machine.mode`. | A live MODE label reading `machine.mode` on every redraw, in **Phase 4's own DOM** above `controls.el` (§10.4; `internals/mount.ts` +6 lines). An edit to `controls.ts` is refused twice over: `test/ui-controls-verbatim.test.ts` pins SHA-256 `a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f` and §13 criterion 3 pins `git diff --numstat` empty for `controls.ts`, `coreView.ts` and `registerView.ts`. **Named residual, not solved:** a frozen `<select>` sitting beside a correct label is itself confusing, and the only clean fix is the edit criterion 3 forbids — so it is recorded in `PHASE-4-NOTES.md` §2 as a known cost rather than lived with silently. |
| R7 | **Deleting `findAlterBox()` breaks the bootstrap the owner and a family member actually run.** `deckBox.ts:45-55` reaches across the DOM for the alter box, is called at `:122`, and falls back to copy-and-paste at `:131-137`; all of it goes in wave 3. | The replacement is **typed**: `keyBootstrap(text, marks)` on `ConsoleSession` feeds `BOOTSTRAP_KEYSTROKES` — the twelve characters of `BOOTSTRAP_CHANNEL_1`, `AL%1000012$R` (`src/formats/loader.ts:26`), with marks at positions 1 and 11 — through `press()` / `pressWordMark()` one at a time, and requires the keyboard's `'data'` state (§6.4). A mistake therefore breaks at `npm run typecheck`, which is DECISIONS.md 2026-08-31's whole argument for the typed hand-off over a DOM selector ("Phase 4 rewrites that DOM and a selector breaks silently"). §13 criterion 11 keys the display/alter dialogue in node; storyboard step 10 is criterion 19's named walk, checked by eye. |
| R8 | **The `stale` edit is a behaviour change to a Phase-3 file during a restyle phase.** `period/autocoder/session.ts` gains `readonly stale: boolean`, set by `setSource` / `setDataText`, cleared by `assemble()`, with `hopperText()` returning `''` while stale — +16 lines. | Bounded and named: it is the **only** edit to a Phase-3 or Phase-5 session body in the whole phase, and it moves an existing rule out of a DOM closure into the session rather than inventing one — today `setSource` (`autocoder/session.ts:46`) does not clear `result`, and `hopperText()` already returns `''` iff `result === undefined`, so the retire-on-edit behaviour lives in the view. §13 criterion 15 gates it by requiring `test/tier4-autocoder-demo.test.ts` and `test/tier4-rpg-demo.test.ts` to pass **unedited**, and `test/period-session.test.ts` asserts the rule in node. |
| R9 | **The period and internals surfaces drift into one look**, defeating architecture.md §6's "visually foreign to each other on purpose". `index.html`'s current `<style>` block styles `body`, `hr`, `fieldset`, `legend`, `table`, `td`, `pre` and `input/select/button` GLOBALLY, and six shipped internals files depend on them by element and class (completeness critic item 6). | Three walls. **No shared stylesheet**: period rules live in `src/ui/styles/period.css` scoped under `#machine-room` or a `.period-*` class with no bare element selector, and the internals rules stay inline in a block scoped under `#internals` (§10.3), so `panel.ts`, `coreView.ts` and `registerView.ts` need no edit. **No shared DOM helper**: the period surface gets its own `period/dom.ts` — with its own `make` / `cell` / `row` / `table` / `box` / `svg` / `text` and its own `View`, structurally identical to `panel.ts`'s so the page frame can hold both — and `internals/panel.ts` is not refactored (§3.6 — extracting its `make()` would edit `controls.ts`'s import line and break verbatim on day one). **Exactly two imports cross the boundary, both pure functions, both named here and in §3.8, and the count is true FROM WAVE 0**: period → internals `keyed` from `internals/controls.ts` (the importer is `unitrecord/inquiryView.ts:15` from wave 0 until wave 4 deletes that file, after which it is `console/session.ts`; the test names the MODULE, so the move costs it nothing), internals → period `renderSelectric` from `period/console/selectric.ts` (wave 1's fold). Wave 0's seventh rewrite points all thirteen `panel.js` importers at `dom.ts` in the move commit itself — an import-specifier change, so the identity oracle still passes — because without it there are FOURTEEN cross-surface imports at wave 0's close and wave 1's own test fails the day it is written. `test/period-is-dom-free.test.ts` carries the import-direction case in both directions, and `test/period-css-covers-every-class.test.ts` keeps the two class inventories separately owned. |
| R10 | **A gate goes green on a wrong page.** Three ways, and only the first is the one anybody names: (a) a golden moves; (b) the free oracle is weakened until it cannot fail — a builder implements `paginate` by calling `renderGreenBar` and splitting, and the identity becomes a tautology; (c) the straddle derivation under-reports mid-run, because a crossing whose destination never printed is invisible to (last printed position, final carriage). | (a) **Five byte gates in the per-commit gate for exactly that reason** — 348 / 2251 / 3688 / 6982 bytes and the cc01 transcript — plus §13 criterion 4's `git diff --stat <base>..HEAD -- src/core src/asm src/rpg src/formats` empty at **every** commit. (b) Independence is a structural rule, not an instruction: `period/paper/page.ts` imports `PrintLine` and `CarriageState` from `src/core/types.ts` and **NOTHING from `printer1403.ts`** (§3.2), so `renderGreenBar(paper, {chain:'A', formLines:66})` and the trimmed `\f\n`-joined `paginate()` are two independent renderers over one paper; the rule has its own ledger row, `PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR`, and §13 criterion 8. (c) Stated at the point of use rather than hidden: the banner on the page names `CARRIAGE_SENSES_AT_DESTINATION_ONLY (src/core/devices/printer1403.ts:354)`, `demos/cycle-probe` is asserted to yield exactly `[{line:60, channel:12}]` with `carriage.channel12 === false` on the same frame, and **`demos/sales-summary` is asserted to yield NO straddles**, so the derivation cannot silently report everything. The real fix — calling `senseChannels()` from `advanceOneLine()` — is a `src/core` change that would move `test/golden/cycle-probe.page.txt`, so Phase 4 records and escalates, the `RW#` / `WM#` / `loader.ts:90` precedent. |
| R11 | **The art is judged by oracles that cannot see it.** Roughly 2,200 lines of views across waves 2-4 (excluding mounts, sessions and lamps), plus `desk.ts` and ~800 restyled lines, and 640 lines of CSS, produced by agents that render nothing. **Every gate in this plan would go green on an ugly page**, and the two things most likely to be wrong — the §5 panel's box order and proportions, and the desk's paper-order layout — are exactly what a table-fidelity test cannot judge. | A **browser screenshot is a per-wave deliverable**, committed with the wave at `docs/screenshots/phase-4/wave-N-<station>.png` and referenced from that wave's `docs/BUILD-LOG-4.md` section (§16 item 7) — a habit through the build rather than one check at the end, which is new discipline for this project and is named as unproven. The two things a screenshot is FOR are written down so the reviewer knows what to look at. §13 criterion 19 is a human walk of §1's fourteen steps, recorded in the build log by name and date — the Phase-3 criterion 11b and Phase-5 criterion 13b precedent. |
| R12 | **The coding sheets and the spec sheets stay `<textarea>`s in a drawn frame.** A drawn frame around a ruled textarea is a coding sheet the way a photocopy is a form. **This is the largest deliberate fidelity gap in the phase.** | Named at Tom's ≤7-bullet gate rather than discovered at criterion 19 — which is the whole point of the row. Refused on PHASE-5-NOTES.md §4's own words (the per-sheet ruler is "the parser-backed specification for the later drawn forms" — later) and on research/README.md's `[unverified]` rule, "Do not encode": X24-1336…1339 and C28-0309-1's coding form are named in `rpg-sources.md`'s index and are **not digitised**, so drawing one would encode invented ARTWORK as period fact — the columns themselves are `[verified]` (rpg-sources.md §6) and stay on the ruler. §9.2 states it, §15's `THE_RULER_IS_THE_FORM` carries the fallback, and the facsimile is costed as a separate phase of roughly 600 lines with its own oracle. If Tom's real test of Phase 4 is "does the Autocoder tab look like a 1410 coding sheet", the answer is known **before** the phase starts. |
| R13 | **Wave 5 overruns.** ~2,135 lines in one wave (§11's cost table) — `desk.ts` 150, `period/mount.ts` 120, `period/session.ts` 90, `period.css` 640, plus both authoring stations restyled from 659 to ~795 — the largest single wave anyone proposed, and the CSS is the one artifact with no test that judges its content. | **The relief valve is written down before it is needed: split wave 5 in two.** 5a = the desk — `desk.ts`, `period/mount.ts`, `period/session.ts`, `period.css`, the narrowing of `reader/mount.ts`, and the four wave-5 tests (`period-session`, `period-css-covers-every-class`, `period-no-second-frame-loop`, `period-refusal-grep`). 5b = the two authoring stations — the `git mv` + restyle of `period/autocoder/*` → `period/coding/*` and `period/rpg/*` → `period/specs/*`, and the `stale` edit of R8. The split costs one extra commit and **no plan change**: §3.4's rows are already disjoint across the two halves, and §10.7's mount chain is unaffected because `reader/mount.ts`'s narrowing belongs with `period/mount.ts` in 5a. If taken, it is logged in `PHASE-4-NOTES.md` §2 as a deviation with its reason. |

**Which risk each exit criterion actually catches**, so a green gate is read for what it is rather
than for reassurance. §13's numbering is §13's; this is the mapping in one place.

| Risk | Caught mechanically by | Caught only by a person |
|---|---|---|
| R1 size | — (§3.9's arithmetic is a plan check, not a gate) | the orchestrator's per-wave line count against §3 |
| R2 frame cost | criterion 17 (build + `dist` < 400 kB); `test/period-no-second-frame-loop.test.ts` | criterion 19 — a page that redraws visibly slowly |
| R2′ focus ownership | criterion 18b (the keydown-ownership grep) | criterion 19's named case — typing in the coding sheet |
| R3 move / shim / counts | criteria 1, 2, 17 and wave 0's rename-identity diff | — |
| R4 matrix reading, Exhibit II slice | criterion 7 (the Phase-4 oracle at `matrix:'flush'`) | the excluded-row header, read by the next reader |
| R5 machine-room creep | criterion 18a (the refusal token grep, time units included) — the FEATURE half only | the per-wave review checkpoint below — the DIMENSION half ("no inch printed") has no token grep and is review-only |
| R6 stale MODE select | criterion 3 (SHA + `--numstat`) | criterion 19 — the label beside the frozen select |
| R7 the deleted `findAlterBox()` | criterion 11 (the keyed dialogue in node) | criterion 19 — keying the bootstrap by hand |
| R8 the `stale` edit | criterion 15 (both `tier4-*` tests unedited) | — |
| R9 the two surfaces converge | `period-is-dom-free`'s import-direction case and `period-css-covers-every-class` | criterion 19 — two tabs that still look foreign |
| R10 a gate goes green on a wrong page | criteria 4, 6, 8, 9 | criterion 19 — the straddle banner in place |
| R11 the art | **nothing** | criterion 19 and the per-wave screenshot |
| R12 textareas, not forms | **nothing** | **Tom's ≤7-bullet gate, before wave 0** |
| R13 wave 5 overruns | **nothing** | the orchestrator, at the wave-5 commit |

**Three risks have no mechanical gate at all — R11, R12, R13 — and half of R2′ does not either.**
That is the whole reason criterion 19 is a named human walk rather than a formality, the reason the
screenshot is a per-wave deliverable rather than a close-out item, and the reason R12 is stated at
Tom's approval gate rather than discovered at the end. A plan that gated everything mechanically
would be lying about a phase whose deliverable is a drawing.

**The per-wave review checkpoint** (R5, and the standing habit for the rest) is four diffs, not a
reading: §2.2's refusal list against what the wave drew; every new hardware claim against its form
number + page or research file + section, with WHICH MACHINE stated; the two cross-surface imports
against §3.8's list of exactly two; and the wave's new class literals against `period.css`. It runs
in the same commit as the wave and its findings go into that wave's `docs/BUILD-LOG-4.md` section
with their resolutions (§16 item 7).

**Three risks the design retires structurally rather than mitigates**, listed because a mitigation
that depends on a builder remembering it is not a mitigation. **The `?raw` merge is NOT one of
them** — it is a simplification, and R3's structural mitigation is `npm run build` in the per-commit
gate, because the compiler does not forbid a duplicate ambient declaration on this toolchain (§10.6
item 1, measured). `period/paper/page.ts` importing nothing from `printer1403.ts` makes the
`paginate` tautology **unwritable**, not merely forbidden (R10). The no-framework ruling removes the
virtual-DOM-over-a-working-diff risk entirely rather than managing it, and its reason is this
codebase's own — ~120 lines of hand-written diff keys already ship (§10, the framework ruling).
And **no number is computed in a file that touches the DOM** (§2.1), which retires the jsdom
question: there is nothing a DOM test could assert here that a node test cannot, so the phase adds
neither a fourth dependency nor a second vitest environment.

---

## 15. `[unverified]` / `[likely]` items — each with its `OPEN:` constant and fallback

Every row below is a named constant with an `// OPEN:` comment at the point of use in the file that
depends on it, and a matching entry in the **dated Phase 4 section of
`docs/research/open-questions.md`**, added in the wave that first depends on it, in that file's own
four-column shape (§16 item 9). **The ledger is FROZEN at the close of wave 1**: the table below is
fixed after the paper and console modules land, and a row invented later is a plan deviation logged
in `PHASE-4-NOTES.md` §2. Wave 1 rather than wave 0 is the freeze point because **wave 0 carries the
bounded two-attempt primary read** (§11 wave 0), whose five targets can retag or retire a row before
it is written down. The freeze governs *this* table; the transcription into `open-questions.md`
happens progressively, one wave at a time.

**Thirty-nine rows. Four are refusals of period CONTENT rather than fallbacks, and say so in the
tag column** — sound, key travel and detent feel, the facsimile specification forms, and the 1401
red-fault convention inside the lamp-colour row — **and two more are refusals in consequence**,
`NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED` and `FORM_FEED_IS_A_SLIDE_NOT_A_SIMULATION`, whose tag
columns say so as well. All six exist because research/README.md's `[unverified]` rule is
*"Do not encode"*, not "guess and label". **Three are rulings of ours over `[verified]` device
behaviour, and each carries the `src/core` change it refuses, costed in lines**, so the refusal is
priced rather than asserted: `H_CHAIN_IS_A_FIVE_GLYPH_RESTRIKE_OF_THE_A_PAGE` (≈4 lines threading
`MachineOptions.printer` into `new Printer1403(…)`, plus a machine rebuild per toggle),
`UI_ONLY_DETENTS_TYPE_S_THROUGH_STOP` (10-15 lines adding `'display' | 'ce'` to `ConsoleMode` and
two `case` arms in `start()`, plus a fifth MODES row in the byte-frozen `controls.ts`), and the
straddle row (calling `senseChannels()` from `advanceOneLine()` — which moves
`test/golden/cycle-probe.page.txt`). **Twenty rows are NEW IN PHASE 4** and are marked; the rest
are `console-and-physical.md` §13's nine gaps carried forward, the four Phase-1/Phase-2 constants
this phase touches without changing, and six rulings the panel seeded that are neither — the desk
materials, the straddle pair, the reveal, sound, key travel, the typeface
(39 − 20 = 19 = 9 + 4 + 6).

| Constant | Tag | The claim | Fallback if overturned |
|---|---|---|---|
| `LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS` | `[unverified]`; the red-fault half is a **REFUSAL** | 1415 indicator lamp / lens colour. console-and-physical.md §13 row 1 and §11: *"The claim that labels light up red on fault is from a **1401** page and does **not** transfer to the 1415"* `[unverified for 1410]`. A22-0526-3 Fig.57 p.59 and S223-2648 Figs.1-3 are black and white. | Warm white/amber incandescent behind a clear-white lens on a charcoal panel with white silkscreen legends — **one CSS custom property**. NEVER the 1401 red-fault convention; the specific temptation in this design is making the 1403's END OF FORMS / FORMS CHECK pair glow red, and it is refused in `period.css`'s own comment and in `printer/panelView.ts`'s header. A colour photograph would settle it. |
| `LAMP_GROUPS_ARE_SILKSCREEN_NOT_LENS_COLOUR` | `[unverified]` | Whether the 1415's lights are colour-coded by group. console-and-physical.md §13 row 9. | Uniform lamp colour per panel; groups distinguished by silkscreened box borders. Reversing it is one CSS rule per box. |
| `NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED` | `[unverified]` source, **REFUSAL** in consequence | 1411 and 1415 cabinet dimensions. console-and-physical.md §6, *"No IBM dimension figures located for the 1411 or the 1415 cabinet"*; §13 row 2 (*"treat as approximate and don't label with a spec number"*); §9 — GC22-6681-4 p.14 tables neither unit. | Draw no scale elevation and print no dimension on the page; the stations are panels, not elevations. Proportions from photographs (1415 desk ≈ 60 in wide, 1411 ≈ 70 in high matching the 1414/729) and never a spec number in text. **This is a refusal, not a placeholder**: if IBM's 1410 physical-planning figures surface, the page still does not change. |
| `THE_1402_ELEVATION_IS_NOT_DRAWN` | contradictory source | 1402 height 35 in versus photographs. console-and-physical.md §7, *"57-1/2 × 29 × 35 in … reads low against photos"* `[verified as printed / suspect in fact]`; §13 row 3; GC22-6681-4 p.14. | Retired by not drawing an elevation at all. Recorded so a later phase does not rediscover it; if one is ever drawn, treat 35 in as the deck height excluding the file-feed hopper the photographs show on top. |
| `CARD_GEOMETRY_IS_SECONDARY` | `[likely]`, secondary only | Card hole and pitch geometry — 0.087 in column pitch, 0.250 in row pitch, 0.055 × 0.125 in rectangular holes. console-and-physical.md §10 and §13 row 4 (Jones / Wikipedia; ANSI X3.21-1967 not read). | Use them; they reproduce a correct 7 3/8 in card and already ship in `cardView.ts:32-45`. ANSI X3.21-1967 governs if exactness ever matters. A correction now moves `CARD_GEOMETRY` and `test/golden/card-face-a.svg.txt` and **nothing else** — which is the whole reason wave 1 extracts them into `paper/cardGeometry.ts`. |
| `CARD_SIZE_7_3_8_BY_3_1_4` | `[likely]` | Card size 7 3/8 × 3 1/4 × 0.007 in. console-and-physical.md §10 and §13 row 5 (Wikipedia's cited IBM source not confirmed). | Use as-is; the aspect ratio is uncontested across every source. The card is drawn at that ratio and scaled by CSS width, so the number appears **once**, in `cardGeometry.ts`. |
| `CORNER_CUT_IS_UPPER_LEFT` | `[likely]` | Which corner the diagonal cut is on. console-and-physical.md §10 and §13 row 6 — upper left, per the 5081 layout form; already drawn that way. | Reversing it is one `M` command in `outlinePath`, plus a re-cut of `test/golden/card-face-a.svg.txt`. |
| `LINES_PER_BAR_IS_THREE` | `[likely]`, modern vendor specs | Green-bar 14 7/8 × 11 stock with 1/2 in bars = three lines per bar at 6 lpi. console-and-physical.md §8's green-bar row and §13 row 7 (pdp8online greenbar). | Already shipped as `LINES_PER_BAR = 3` (`printerView.ts:35`) and carried into `paper/page.ts` with its comment. Four at 8 lpi. **A wrong pitch costs a shade and nothing else.** |
| `GREEN_BAR_IS_THE_DEFAULT_WITH_A_WHITE_TOGGLE` | `[unverified]` | Whether 1961-65 1410 sites ran green-bar or plain white stock. console-and-physical.md §13 row 8; architecture.md §6. | Already shipped as `printerView.ts`'s toggle and carried into `formView.ts`. Green-bar default, plain white one click away — **the toggle IS the fallback**, not a setting buried in a menu. Phase 6 needs the white side (§16 item 8c). |
| `MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT` | `[likely]` — **NEW IN PHASE 4** | The **unit and origin** of the 1415 Selectric's matrix positions 30 and 35. The positions themselves are `[verified]` — console-and-physical.md §2: *"S / C / E / B / `#` / D (address line) print-outs occupy **matrix position 35**; the Display data line, Alter, Console Inquiry and Console Reply occupy **matrix position 30**"* (S223-2648 Fig.5 p.9; A22-0526-3 Fig.42 p.46). The figure gives positions and no left margin. | Render the **difference**, not the absolute column: a line's indent is `matrixPos - 30`, so the 35-group sits five columns right of the 30-group and no absolute column from the paper's left edge is claimed. **The primary-source comparison runs at `{matrix:'flush'}` precisely so it does not depend on this ruling** (§12.1 T1); if the origin is ever settled, one default in `SelectricOpts` changes and no golden moves. Wave 0's bounded read target (a). |
| `ROTARY_DETENTS_ARE_60_DEGREES_APART` | `[likely]` derived from `[verified]` — **NEW IN PHASE 4** | The MODE rotary's detent angles on the 1415. console-and-physical.md §3 `[verified]` names six clock positions — RUN top, ADDRESS SET upper-left, DISPLAY upper-right, I/E CYCLE lower-left, ALTER lower-right, C.E. bottom (A22-0526-3 Fig.47 p.49; S223-2648 Fig.2 p.7) — which are 12/2/4/6/8/10 o'clock. **The degree numbers are the natural reading and are stated on no page.** | RUN 0°, DISPLAY 60°, ALTER 120°, C.E. 180°, I/E CYCLE 240°, ADDRESS SET 300°, snapping only, no intermediate position. If a Fig.47 scan is obtained, read the angles off it — one exported table in `console/session.ts` changes and no behaviour does. Wave 0's bounded read target (b). |
| `SELECTRIC_RIBBON_IS_BLACK_SINGLE_COLOUR` | `[unverified]` — **NEW IN PHASE 4** | The 1415 Selectric's ribbon colour. console-and-physical.md §2 — A22-0526-3 p.45, p.49 and S223-2648 p.6 describe the element, the 64-character set and the underscore feature and **say nothing about ribbon colour**; §11 is about cabinets; every period photograph is black and white. | Black on off-white, one colour, and **NO red shift on error** — §2's error convention is an UNDERSCORE, so a red-on-error ribbon would invent a second signal on top of a documented one. One CSS property. |
| `CARD_STOCK_IS_CREAM` | `[unverified]` — **NEW IN PHASE 4** | The colour of the card stock. **No citation exists**: no file in `docs/research/` gives a stock colour. Recorded per research/README.md's `[unverified]` rule — encoded as a **named fallback**, not passed off as period. | `#f7f3e8`, one named CSS custom property in `period.css`. Reverting to the shipped `#fff` is one line and loses a shade. |
| `DESK_IS_LIGHT_LAMINATE_ON_CHARCOAL_PEDESTALS` | `[verified from photos]` for the look; `[likely]` for the Noyes palette we are not using | Cabinet and desk materials. console-and-physical.md §1 and §11 — *"dark (charcoal) cabinets with light top surfaces; light-gray Selectric; dark console front with white legend text and backlit white/clear lens lights"* (A22-0526-3 Fig.57 p.59; S223-2648 Figs.1-3). IBM's Noyes "Color for Computers" palette and the UW-Madison red / Wisconsin-DOA blue anecdotes are `[likely — secondary]`. | One look, read off the photographs; **no colour chooser**. A red or blue site skin is a one-property change if Tom ever wants a specific machine. The Postgirot Stockholm, 4 Jan 1965 CC0 photograph (2226×1473, Wikimedia Commons) is the free colour reference if the greyscale reading is contradicted. |
| `UNEQUAL_HAS_NO_LAMP_ON_THE_1415_PANEL` | record — `[verified]` absence, no fallback wanted — **NEW IN PHASE 4** | console-and-physical.md §5's STATUS box lists exactly **six** lamps — B>A, B=A, B<A, OVERFLOW, DIVIDE OVERFLOW, ZERO BALANCE (A22-0526-3 Figs.49-55 pp.52-55; S223-2648 Fig.3 p.8) — while this emulator carries **seven** latches, because Compare on the 1410 sets high/equal/low/**unequal** unconditionally (`opcodes.md` §8; A22-0526-3 p.28). architecture.md §6 names "the seven indicator latches" for the internals surface. | None wanted: the seventh latch is real, unlamped, and appears only on the INTERNALS tab. Recorded so that a later reader does not "fix" the panel by adding a seventh lamp. |
| `REFUSED_FEATURE_LAMPS_ARE_OMITTED_NOT_DARKENED` | ruling, ours — **NEW IN PHASE 4** | Eight entries in an exported exception list, each with its architecture.md §12 citation: I/O CHANNEL CONTROL CH2, I/O CHANNEL STATUS CH2, `1401 COMPAT`, `TAPE OFF LINE`, `DISK OFF LINE`, CH1's `OVERLAP IN PROCESS` and `NOT OVERLAP IN PROCESS`, and `PRIORITY ALERT`. **A darkened lamp reads as an uninstalled option**, and §12 forbids implying tape, disk, channel 2, processing overlap, the Priority feature or 1401 mode exist at all. The dossier kept `PRIORITY ALERT` drawn dark as a "fitted" lamp; round-1 review reversed that (§8.2) because §12 refuses the *feature* and console-and-physical.md §3 calls its controls the "Optional priority-feature panel". console-and-physical.md §5 and §3; io.md §5. | Restore any entry by deleting it from `OMITTED_LAMPS` — one line each, and restoring `PRIORITY ALERT` to a drawn-dark lamp is the dossier's original reading, one line plus a whitelist row in criterion 18a; and `test/period-light-panel-vs-research.test.ts` diffs `PANEL_BOXES` against §5's markdown table **modulo that list**, in both directions, so an omission cannot drift. **The drawn panel is LABELLED as a reduced panel** (completeness critic item 3): a panel two columns and six lamps short of S223-2648 Fig.3 p.8 is not that figure, and the most authoritative-looking artifact on the page must not be quietly a fiction. |
| `NO_WORD_MARKS_ON_THE_1403_PAGE` | record — `[verified]`, no fallback wanted — **NEW IN PHASE 4** | Under the `L` op code a word mark becomes a **word separator**, which has no chain slug, so a BLANK precedes each marked character on the printed page. charset.md §7 `[verified]` — A22-0526-3 p.80 Figure 88. | None wanted. The form draws no overstrike and **one line under it says what the blank is**. Recorded so nobody adds circumflexes to the green bar to match the Selectric, which is the one place in the phase where two papers with different conventions sit side by side. |
| `H_CHAIN_IS_A_FIVE_GLYPH_RESTRIKE_OF_THE_A_PAGE` | ruling, ours — mechanically proved over the shipped device, resting on one `[likely]` cell — **NEW IN PHASE 4** | The 1403's A/H switch is a display transform over the printed page, not a second print. charset.md §5 `[verified]` (A22-0526-3 pp.6-7 Fig.2; GA24-3073 p.25, p.27) and §5.1 `[likely]` — no primary source publishes an explicit H-chain "prints as" column, so the `?`-on-H cell rests on the dualing rule, and `printer1403.ts:76` carries the same tag at the point of use. Exact because the five duals (`& ⌑ % # @` → `+ ) ( = '`) are the only differences, none of the H glyphs is on the A set, the twelve codes on neither chain print blank on both, and `?` collides with BCD 0o60 identically on both. `Printer1403.chain` is `readonly` (`printer1403.ts:366`) and set in the constructor (`:382`), **which is what makes the alternative a core change at all**. | **The named core change, costed and refused:** `MachineOptions.printer?: { chain?: PrintChain; tape?: CarriageTape }` forwarded into `new Printer1403(…)` — about 4 lines in `machine.ts` with no default behaviour change — plus a machine rebuild whenever the toggle moves. `test/period-chain.test.ts` proves the restrike over **all 64 codes in both directions** against `chainGlyph`, so if the ruling is ever wrong the test says so before the page does. |
| `UI_ONLY_DETENTS_TYPE_S_THROUGH_STOP` | ruling, ours, over a `[verified]` rule — **NEW IN PHASE 4** | The DISPLAY and C.E. detents are rotary positions the façade cannot name, and they type their `S` through `machine.stop()`. `machine.stop()` **is** `{ fieldLine('S'); }` (`machine.ts:380`) and `setMode` ends on the same `fieldLine('S')` (`:327`), so the paper cannot tell the two paths apart, and console-and-physical.md §2's print-out table has ONE row for *"Normal stop (STOP key / mode change)"* `[verified]` — A22-0526-3 Fig.42 p.46, p.50, p.52; §4 "Mode-switch side effect". | **The named core change, costed and refused:** add `'display' \| 'ce'` to `ConsoleMode` (`machine.ts:38`) plus two `case` arms in `start()` — 10-15 lines — which would also force a fifth MODES row into the byte-frozen `controls.ts` (`:23-25`). **The trap the fallback exists to name:** `setMode` returns early when the target equals `machine.mode` (`:325`), so a UI-only detent followed by a return to RUN loses **two** lines, not one, unless `turnTo` tracks the rotary's own position separately — which is why §13 criterion 10 walks all thirty ordered pairs of the six detents and asserts exactly one `S` per turn. **And the turn HALTS as well as types:** `turn()` fires the session's `halt` hook on every real turn, and the frame gate reads `detent`, because the manual's sentence is about a *stop*, not a print-out (§6.2). |
| `STRADDLE_IS_SHOWN_NOT_FIXED` / `CROSSED_PUNCH_IS_DERIVED_FROM_THE_LAST_PRINT_AND_THE_FINAL_CARRIAGE` | ruling, ours, over a **KNOWN DIVERGENCE** from a `[verified]` sentence | Derive the crossed punch from the last printed position on the form plus the final `snapshot().printer.carriage`; mark only what those two prove; state the under-report at the point of use. Three alternatives are named and refused with their reason: **paper-only** (blind to a motion whose destination never printed — exactly the cycle probe); a **per-frame `CarriageState` diff** (`START_BUDGET = 2000`, `machine.ts:45`, merges motions inside one frame); a **`PrintEvent[]` replay** (`types.ts:359-362` carries no position, and the automatic single space emits no event at all). `printer1403.ts:329-354`; io.md §5 Figure 35 (A22-0526-3 p.36, *"turn on when their hole IS SENSED"*); PHASE-2-NOTES.md §4; open-questions.md line 411. | **The real fix is `printer1403.ts`'s own documented one** — call `senseChannels()` from `advanceOneLine()` and delete the two calls after the loops — and it is a `src/core` change that would move `test/golden/cycle-probe.page.txt`, so **Phase 4 escalates and does not take it**, the `RW#` / `WM#` / `loader.ts:90` precedent. Both constant names are kept because the ruling and its derivation are separately citable at their two points of use (`paper/carriage.ts` and `printer/carriageView.ts`). |
| `INTERACTIVE_INQUIRY_HOLDS_THE_UI_RUN_LOOP` | ruling, ours — **narrows a Phase-2 constant** — **NEW IN PHASE 4** | The operator's INQUIRY REQUEST holds **Phase 4's animation frame** from REQUEST to RELEASE; the latch is the UI's own and is deliberately **not** `Console1415.pendingRequest`, which the device clears inside `read()` and `precheck()` (`console1415.ts:199, :290, :316`), so a loop gated on it deadlocks. Two divergences stated: the KEYBOARD UNLOCK moves from the program's `RCP` to the operator's key press, and the wait moves from the CPU to the frame loop. io.md §8 steps 3-5 (A22-0526-3 pp.46-48); `console1415.ts:91-100`; PHASE-2-NOTES.md §4 (*"Real interactive typing at the 1415 is UI work for a later phase, and the constant is where it starts"*); open-questions.md line 364. | Drop the hold and the behaviour is Phase 2's as shipped — the program's console read returns Figure 45's No Transfer whenever nothing has been supplied. **Three lines in `console/session.ts`.** The alternative that is REFUSED is making `Console1415.read()` block: an async seam in `step()`, which architecture.md §2 fixes as synchronous and promise-free and which every tier-1 through tier-4 test drives synchronously. `INQUIRY_ENTRY_IS_PRE_SUPPLIED` **stays `true`** with its scope narrowed and its wording amended in the dated `open-questions.md` section (§6.6). |
| `CONSOLE_LINE_LENGTH` (`machine.ts:105`) | existing OPEN, unchanged by this phase | 80 positions, display-only. console-and-physical.md §2 gives the form (9 7/8 in wide, pin holes 9 3/8 in apart, S223-2648 p.78) and §4 the display/alter termination rule, and **neither gives a characters-per-line figure**; `machine.ts:100` documents that a display of cleared core "runs to the end of the printer line". | Unchanged. **Phase 4 makes it VISIBLE for the first time**: the drawn Selectric form is ruled at 80 positions so the fallback is seen rather than assumed — the same treatment `DEFAULT_CARRIAGE_TAPE` got in Phase 2. Nothing downstream keys on it. |
| `DEFAULT_CARRIAGE_TAPE` (`printer1403.ts:212`) | `[unverified]`, existing | 66 lines; channel 1 at line 1, channel 9 at 57, channel 12 at 60. The twelve channels and the skip/space rules are `[verified]` (io.md §7; A22-0526-3 pp.68, 71-72, 81), but **no manual publishes any site's tape punching** — a carriage tape is punched for the forms a shop actually runs. `printer1403.ts:200-219`; open-questions.md line 344. | Unchanged. Its own stated fallback — *"render it in the printer view so it is visible rather than assumed"* — **is DISCHARGED by this phase**: the tape is drawn as a twelve-channel loop strip beside the form with its punches, its brush and its two sense lamps (§7.2). Editing it from the page is out of scope (it needs a core constructor option) and this shop runs one form. Phase 6 needs it unparameterised (§16 item 8b). |
| `HALT_TYPES_NO_PRINTOUT` (`machine.ts:65`) | `[unverified]`, existing, inherited from Phase 1 | Whether a programmed halt types a stop print-out. console-and-physical.md §2's print-out table taken literally — only the STOP key, a mode change and the three error stops type — against §3's CE-panel PRINT OUT CONTROL toggle and START PRINT OUT push-button, which only make sense if the print-out is a property of stopping (A22-0526-3 pp.50-58). | Unchanged as shipped. **Phase 4 CANNOT flip it** — it is a `src/core` change, and flipping it would put eleven `S` lines into the cc01 transcript that a per-commit gate pins byte-for-byte — but the period rotary makes the question visible for the first time, so wave 0's bounded read records what it finds (target e, RECORD ONLY) and `PHASE-4-NOTES.md` §3 records what the waves observed for whoever can act on it. **The trap:** the CE PRINT OUT CONTROL rotary and START PRINT OUT button look like they answer it, which is exactly why the C.E. door is drawn CLOSED and neither control appears. |
| `FORM_FEED_IS_A_SLIDE_NOT_A_SIMULATION` | refused as simulation — **NEW IN PHASE 4** | A completed form slides onto the printed stack in one 200 ms CSS transform; lines appear as the device prints them. **600 lpm is a SPEED spec, not a motion spec** (console-and-physical.md §8; A22-0526-3 p.67), and animating paper at it would imply the cycle-accurate timing DECISIONS.md 2026-08-30 refuses — the same reason `microsecondsSimulated` is never rendered as a clock (architecture.md §6, §12). | Change the duration, or drop the transform entirely; nothing computes from it and no test reads it. |
| `SELECTRIC_REVEAL_IS_DISPLAY_ONLY` | ruling, ours — display-only, OPTIONAL | The console log may reveal at 932 cpm (`[verified]` — console-and-physical.md §2, A22-0526-3 p.45) with an instant toggle, but **the rate is a RENDERING rate over a log that is already final**, never a simulation rate and never a CPU-timing claim (architecture.md §12, "no cycle-accurate timing claims"). | Off the critical path, and its point of use is `console/logView.ts` (§6.1): if it is built, `reveal(log, Infinity) === renderSelectric(log, opts)` is asserted as a fixed point so no test ever reads through the reveal and the animation cannot lose a character a golden holds; **if it is not built, nothing else in the phase changes.** |
| `SOUND_IS_OUT` | **REFUSED — not open** | No primary source publishes 1402 / 1403 / Selectric acoustics, and synthesised hammer noise would be `[unverified]` art presented as fact. research/README.md (*"[unverified] — Memory, a single weak source … Do not encode"*); architecture.md §12. | None. If Tom wants it later it is one toggle and one recorded sample, **labelled a reconstruction on the page** the way the demo decks already are. No audio dependency is added in this phase. |
| `NO_KEY_TRAVEL_ANIMATION` | **REFUSED — not open** | Key travel, keycap depression depth and rotary detent torque on the 1415. console-and-physical.md §3 publishes **positions, not mechanics** (A22-0526-3 Fig.47 p.49, Fig.48 p.52), no photograph shows travel, and §9's dimension table does not contain the 1415 at all. | A key gets a pressed state (inset + colour) and nothing more; the rotary snaps between six angles with no intermediate position. **A wrong animation is a claim; a snap is not.** |
| `THE_RULER_IS_THE_FORM` | **REFUSED for this phase** — **NEW IN PHASE 4** | No facsimile X24-1336…1339 specification form and no facsimile C28-0309-1 coding form. The forms are named in `rpg-sources.md`'s index and **are not digitised**; C28-0309-1 pp.5-7 give the COLUMNS, not the artwork (console-and-physical.md §12). PHASE-5-NOTES.md §4 hands Phase 4 the parser-backed ruler as *"the parser-backed specification for the later drawn forms"* — later. | A period header band and the parser-backed ruler around a `<textarea>`, not a column-addressable facsimile. **A facsimile is a separate phase of roughly 600 lines with its own oracle**, and this plan says so at the gate rather than after (§9.2, §14 R12). |
| `NO_WEBFONT` | ruling, ours | `ui-monospace, Menlo, Consolas, monospace`, which **already renders `⌑` and `‡` in shipped output**. The slashed zero is the FORMATTER's (`printout.ts:29`, `SLASHED_ZERO = 'Ø'`, C28-0351-5 p.2), not a typeface's, and the word mark and parity underscore are combining marks. architecture.md §10; DECISIONS.md 2026-08-30 "Run local, Gitea"; charset.md §5. | If a platform lacks either exotic glyph, draw **those two as SVG paths** — two paths, no network. A webfont would be a fourth dependency and a network request in a local-first static site whose deliverable is a `dist/` that opens from the filesystem (§10.5). |
| `KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT` | ruling, ours — **NEW IN PHASE 4** | Not a machine claim: a browser-focus rule the phase adopts because the 1415 keyboard shares a page with three `<textarea>`s and the two `<input>`s in the frozen `controls.ts`. The console region is a `tabindex="0"` element, `console/keyboardView.ts` is **the only file in `src/ui/**` that binds `keydown`**, and `ConsoleKeyboard.press` has exactly three callers, all under `src/ui/period/console/`, so a keystroke that did not land on that region cannot reach it (§6.5, §10.2; completeness critic item 1). The ruling's other half is a **focus contract**: `ConsoleSession` takes a `focus()` hook and fires it whenever the keyboard unlocks — START in DISPLAY or ALTER, and INQUIRY REQUEST — because START is a sibling view's button and would otherwise hold the focus the next keystroke needs (§6.5 ruling 5). Pinned by `test/period-keydown-ownership.test.ts` and §13 criteria 18b and 19. | The alternative is a `document`-level listener with a guard that ignores events whose `target` is a form control — **rejected because the guard is a blacklist**: a new control on the desk silently reopens the defect, and nothing fails. Reversing this ruling is one listener move and the deletion of a test that exists to forbid it. |
| `PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT` | ruling, ours, over `[verified]` figure content — **NEW IN PHASE 4** | The 1402 Model 2 has a punch feed: 250 cpm, stackers `0 (NP)` and `4` with `8/2` shared, and a key strip whose first two keys are PUNCH START and PUNCH STOP (console-and-physical.md §7 `[verified]` — A22-0526-3 pp.59-61, Figs.58-60). `readerView.ts:29-34` already reads both the reader and punch blocks and sums the shared `8/2` pocket. **Drawing the panel is required — omitting it would misdraw a verified figure — but nothing in this UI punches** (completeness critic item 2). | Draw the `[verified]` panel with the **punch hopper empty**, the two punch keys inert, and **one line on the page saying this machine reads and does not punch** — an honest absence, the same shape as a dark lamp. If a later phase punches, no core change is needed: `src/core/devices/punch1402.ts` already ships, `MachineState.punch.stackers` already carries the three pocket counts (`types.ts:438`) and `Punch1402.pockets` already holds the punched `Card[]` per pocket (`punch1402.ts:104`), so the work is a `cardFaceView` over cards that already exist. |
| `THE_HOPPER_DRAWS_THE_LOADED_DECK` | ruling, ours, over a `[verified]`-in-code invariant — **NEW IN PHASE 4** | `src/ui/period/unitrecord/session.ts:40-46` is explicit: *"the cards still waiting are the LAST `reader.hopper` of the deck that was loaded — editing the textarea afterwards changes `deck` and must not change what the reader is holding."* The drawn hopper therefore renders `session.hopperCards(reader)` (`session.ts:68`), never the parsed `deck`, **and the card-face caption names which deck the face belongs to** (§7.1; completeness critic item 7). | Drawing the parsed deck instead is the visible bug this row exists to forbid: load a deck, edit the box, and the hopper would silently change depth mid-run. Reverting is one accessor — which is why it is a named row and not a comment. `test/period-reader.test.ts` re-proves the freeze against `hopperView`'s input through the **unchanged** session (§3.6). |
| `PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR` | ruling, ours — **NEW IN PHASE 4** | The phase's best oracle is free only while the two renderers are independent: `period/paper/page.ts` imports `PrintLine` and `CarriageState` from `src/core/types.ts` and **nothing from `printer1403.ts`** (§3.2), so `renderGreenBar(paper, {chain:'A', formLines:66})` (`printer1403.ts:718`) and the trimmed `\f\n`-joined `paginate()` are two independent computations over one paper, gated against three shipped page goldens (§5.1, §13 criterion 8). Implementing `paginate` by calling `renderGreenBar` and splitting turns the assertion into a tautology and nothing catches it (dossier residual risk 4). **The same import ban is why `PRINT_POSITIONS = 132` is declared a SECOND time in `paper/page.ts`**: core already declares it at `printer1403.ts:43` and `page.ts` may not import that file, so the copy is deliberate and `test/period-page.test.ts` imports CORE's and asserts the two agree — an independent declaration is exactly what makes the 132 a check (§3.2, §4.1). | If the independence is ever given up, the identity stops being an oracle and the phase must buy a replacement: **a hand-authored expected page per demo — three new goldens where zero exist now**, each of which is ours and therefore worth less than the one this rule keeps free. `test/period-page.test.ts` carries the import assertion beside the identity so the two are read together. |
| `ALTER_ENTRY_COMMITS_ON_THE_NEXT_CONTROL_ACTION` | `[unverified]` — **NEW IN PHASE 4** | An ALTER entry commits (`machine.alter(text, marks)`, which pushes the `A` line, `machine.ts:424-442`) when the displayed span fills — the auto-lock — **OR on the next control action**: START, a rotary turn, COMPUTER RESET, PROGRAM RESET. **A22-0526-3 p.51 says the entry ends at a word mark or the end of the line and says nothing about leaving early**, so the second clause is ours; storyboard step 10 uses COMPUTER RESET. | Commit only on the auto-lock, and a short entry is simply lost when the operator turns away — which is defensible on the manual's silence but makes keying `AL%1000012$R` into a twelve-position display unforgiving. Reversing it is one branch in `console/session.ts`; **no `machine.alter` call moves either way**, because the session already refuses to reach it without a prior display (`machine.ts:425` throws). |
| `PRINTED_BLANK` (`printout.ts:40`) | `[unverified]`, existing, inherited from Phase 1 — **the one inherited constant an exit criterion keys on** | How a blank prints inside a fixed-format S/C/E/B/`#` field. `printout.ts:33-38`: §2 states the small `b` only of LOAD-MODE console printing (A22-0526-3 p.49); the Exhibit II block is introduced with "blanks as `b`" as a TRANSCRIPTION convention; and `R SØ1 JOB  SAMPLE` in the same block shows real spaces — so `b` is "the chosen fallback, display-only — nothing downstream may key on it". §13 criterion 7 keys on it: every `b` in `S 149ØØ 1bbbb 11622 bb bbb bbbb` comes from this constant, and the byte comparison passes on this tree (re-derived in round-1 review through `formatPrintout`'s own logic). | Unchanged as shipped, and **named here because the oracle depends on it**. If a primary re-read shows the stop print-out prints real blanks, the fix is a `src/core` escalation — one constant at `printout.ts:40`, and the cc01 transcript moves — and `test/period-selectric.test.ts`'s expectation moves WITH the research file it slices, not against it, which is the argument for slicing rather than copying (§12.3). Phase 4 cannot flip it. |
| `INTERPRETATION_BAND_PRINTS_THE_64_GLYPH_SET` | `[unverified]` — **NEW IN PHASE 4** | The card's interpretation band is printed by a printing punch (22-5526-4 p.8, `[verified]` — console-and-physical.md §10), and **no source in `docs/research/` says which graphics that punch's print unit carried**. The shipped `cardView.ts:13-17` prints `glyphOf`'s 64-character set; this phase carries the ruling into `paper/cardGeometry.ts` and freezes a card face over it. An earlier draft attributed the set to "the 1415 typeball" — a different device — and that attribution is withdrawn. | Print the 1403's 48 graphics instead (five duals and twelve blanks — one call to `chainGlyph`), or leave the band unprinted; either is one line in `bandGlyphs` and a re-cut of `test/golden/card-face-a.svg.txt`. A period card scan with visible interpretation would settle it. |
| `POWER_AND_READY_ARE_DRAWN_LIT` | ruling, ours — **NEW IN PHASE 4** | **Three** legends are drawn lit as constants because the machine is on: the 1402 strip's POWER light (§7.1), the 1415's POWER ON key and the 1415's separate READY light (console-and-physical.md §3 — "POWER ON illuminates; separate READY light", A22-0526-3 Fig.47 p.49). **None of the three is a `Lamp` and none is in `PANEL_BOXES`**, so no `source` field and no both-directions diff is involved: the 1402's POWER is an entry of `LIGHT_LABELS` in `reader/keysView.ts`, drawn lit because it is named in that file's exported `LIT_CONSTANTS` list and asserted as a drawn string by `test/period-reader.test.ts`; the 1415's POWER ON and READY are entries of `console/keysView.ts`'s exported `CONSOLE_KEYS` / `CONSOLE_LIGHTS` label arrays and of its own `LIT_CONSTANTS`, asserted by `test/period-console.test.ts`. Both views caption them as constants. | Draw them dark with the rest — one entry each. Nothing keys on them. |
| `CHECK_LAMPS_FOLLOW_STOP_REASON_NOT_A_LATCH` | ruling, ours — **NEW IN PHASE 4** | SYSTEM CHECK · PROGRAM's ADDRESS CHECK and INSTRUCTION CHECK, and SYSTEM CONTROLS' STOP, are driven from `MachineState.stop` (§8.1): lit while the machine is stopped for that reason, dark once it runs again. On iron the check latches persist until a reset key clears them (console-and-physical.md §3 "Reset semantics"; A22-0526-3 p.52), so the drawn lamp clears one operator action early. `MachineState` carries no check latch (`types.ts:409-438`), and adding one is a core change. | Drive them from a UI-side latch set on `stop` and cleared by the session's PROGRAM RESET / COMPUTER RESET — about ten lines in `console/lamps.ts`, no core change — if the early clearing is ever visible in criterion 19's walk. |

**The shape of an `// OPEN:` comment**, unchanged from Phase 3's and Phase 5's and from the four
core constants this phase inherits: the constant's name, the tag, the sentence or figure it rests
on with its form number and page, **the fallback taken**, and what would settle it — then the
exported declaration, so a reader who greps `OPEN:` under `src/ui/period/**` gets the ledger back
out of the code. Three of this phase's rows additionally carry the `src/core` change they refuse
with its line cost, in the comment and not only here, because a refusal a reader cannot price will
eventually be taken by someone who thinks it is free.

**The four refusals of period content, named by constant** so the tag column is not the only place
they are legible: `SOUND_IS_OUT`, `NO_KEY_TRAVEL_ANIMATION`, `THE_RULER_IS_THE_FORM`, and the
red-fault half of `LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS`. **Two further rows are refusals in
consequence** — `NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED` and
`FORM_FEED_IS_A_SLIDE_NOT_A_SIMULATION` — refusing what an `[unverified]` dimension table or a
speed spec would otherwise let the page imply. A refusal row's fallback column says what would be
built if the refusal were reversed and what it would cost — a toggle and a labelled recording, a
travel animation, ~600 lines and its own oracle, one CSS rule — but the row is **not** a placeholder
waiting on a source: `NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED` says so in as many words, because
IBM's physical-planning figures surfacing would not change the page.

**One row carries two constant names**, deliberately: `STRADDLE_IS_SHOWN_NOT_FIXED` is the ruling —
Phase 4 draws the divergence and does not fix it — and
`CROSSED_PUNCH_IS_DERIVED_FROM_THE_LAST_PRINT_AND_THE_FINAL_CARRIAGE` is the derivation that
implements it. They are separately citable because they sit at two points of use, the DOM-free
`paper/carriage.ts` and the drawn `printer/carriageView.ts`, and a reader at either one needs the
other's name. Both go into `open-questions.md`'s dated section as one entry with both names, the way
the Wave 4a rows there already cross-reference a constant declared in another wave's row.

**Where each row's `open-questions.md` entry lands**, so the dated section is written progressively
and not in one lump at the end (§16 item 9). **Each row lands in the wave §11's own table names as
the first to depend on it**, and the two agree row for row. **Wave 0** opens the section with
the bounded read's findings and touches no row's fallback. **Wave 1 — nine**:
`CARD_GEOMETRY_IS_SECONDARY`, `CARD_SIZE_7_3_8_BY_3_1_4`, `CORNER_CUT_IS_UPPER_LEFT`,
`MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT`, `H_CHAIN_IS_A_FIVE_GLYPH_RESTRIKE_OF_THE_A_PAGE`,
`PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR`, `INTERPRETATION_BAND_PRINTS_THE_64_GLYPH_SET`,
`PRINTED_BLANK`, and **the straddle pair**, whose DOM-free point of use `paper/carriage.ts` declares
`STRADDLE_BANNER` in this wave. **Wave 2 — five**:
`GREEN_BAR_IS_THE_DEFAULT_WITH_A_WHITE_TOGGLE`, `DEFAULT_CARRIAGE_TAPE`,
`FORM_FEED_IS_A_SLIDE_NOT_A_SIMULATION`, `LINES_PER_BAR_IS_THREE`,
`NO_WORD_MARKS_ON_THE_1403_PAGE`. **Wave 3 — five**: `CARD_STOCK_IS_CREAM`,
`THE_1402_ELEVATION_IS_NOT_DRAWN`, `PUNCH_FEED_IS_DRAWN_EMPTY_AND_INERT`,
`THE_HOPPER_DRAWS_THE_LOADED_DECK`, `POWER_AND_READY_ARE_DRAWN_LIT`. **Wave 4 — fifteen**:
`ROTARY_DETENTS_ARE_60_DEGREES_APART`,
`NO_KEY_TRAVEL_ANIMATION`, `SELECTRIC_RIBBON_IS_BLACK_SINGLE_COLOUR`,
`UI_ONLY_DETENTS_TYPE_S_THROUGH_STOP`, `ALTER_ENTRY_COMMITS_ON_THE_NEXT_CONTROL_ACTION`,
`INTERACTIVE_INQUIRY_HOLDS_THE_UI_RUN_LOOP`,
`KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT`,
`UNEQUAL_HAS_NO_LAMP_ON_THE_1415_PANEL`, `REFUSED_FEATURE_LAMPS_ARE_OMITTED_NOT_DARKENED`,
`LAMP_GROUPS_ARE_SILKSCREEN_NOT_LENS_COLOUR`, `LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS`,
`CONSOLE_LINE_LENGTH`, `HALT_TYPES_NO_PRINTOUT` (recorded, not acted on),
`SELECTRIC_REVEAL_IS_DISPLAY_ONLY`, `CHECK_LAMPS_FOLLOW_STOP_REASON_NOT_A_LATCH`.
**Wave 5 — five**: `DESK_IS_LIGHT_LAMINATE_ON_CHARCOAL_PEDESTALS`,
`THE_RULER_IS_THE_FORM`, `SOUND_IS_OUT`, `NO_WEBFONT`,
`NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED` — the last two because wave 5 owns `period.css` and its
lint. **9 + 5 + 5 + 15 + 5 = 39.** Every row is placed by wave 5; wave 6 completes the section
and amends `INQUIRY_ENTRY_IS_PRE_SUPPLIED`'s wording (§6.6) rather than adding a row.

**Facts deliberately given no constant, because they are `[verified]` and pinned by a named test
instead** — listed so nobody re-opens them. The **six STATUS lamps** (B>A, B=A, B<A, OVERFLOW,
DIVIDE OVERFLOW, ZERO BALANCE — console-and-physical.md §5, A22-0526-3 Figs.49-55 pp.52-55) and the
panel's left-to-right box order with STATUS immediately right of ARITH (S223-2648 Fig.3 p.8), both
diffed field by field in both directions by `test/period-light-panel-vs-research.test.ts`; the
**five chain duals** `& ⌑ % # @` → `+ ) ( = '` (charset.md §5, A22-0526-3 pp.6-7 Fig.2), read out of
the research file by `test/period-chain.test.ts` rather than retyped; the **five 1402 keys and
twelve lights** of A22-0526-3 Fig.60 p.61, exported as `KEY_LABELS` from `reader/keysView.ts` and
asserted by `test/period-reader.test.ts` — including the **absence of a LOAD key** as a string
assertion, because software.md §10.1 is headed *"The 1410 has no Load key"* and §10.10 prints the
1401 contrast verbatim; the **Figure 69 lamp rows** of the 1403 panel and Fig.70's PRINT START /
PRINT STOP, drawn dark and asserted as drawn strings; **matrix positions 30 and 35 as POSITIONS**
(console-and-physical.md §2; `types.ts:393-400`'s `matrixPos: 30|35`), whose *unit and origin* alone
carry a row above; the **six rotary positions** at their named clock stations (console-and-physical.md
§3, A22-0526-3 Fig.47 p.49), whose *angles* alone carry a row; the **Exhibit II text**, which is
sliced from console-and-physical.md §2 at test time and is therefore its own oracle rather than a
constant (§12.3); the **`SOURCE_FIELDS` spans** (`src/asm/types.ts:18`, with `COMMENT_COLUMN = 6` at
`:24` and `LABEL_INDENT_COLUMN = 7` at `:27`; C28-0309-1 pp.5-7), pinned by Phase 3's tests; and the
**`SHEET_COLUMNS` spans** (`src/rpg/sheets/columns.ts`), pinned by
`test/rpg-columns-vs-research.test.ts`. And the Phase-1 / Phase-2 constants this phase **IMPORTS and
never re-declares** — `CONSOLE_LINE_LENGTH`, `DEFAULT_CARRIAGE_TAPE`, `HALT_TYPES_NO_PRINTOUT`,
`INQUIRY_ENTRY_IS_PRE_SUPPLIED`, `CARRIAGE_SENSES_AT_DESTINATION_ONLY` and `PRINTED_BLANK`. Four of
the six are treated differently and the difference is stated rather than left to a reader:
`CONSOLE_LINE_LENGTH`, `DEFAULT_CARRIAGE_TAPE`, `HALT_TYPES_NO_PRINTOUT` and `PRINTED_BLANK` **have
rows above**; `CARRIAGE_SENSES_AT_DESTINATION_ONLY` is **cited inside the straddle row** rather than
given one of its own; and `INQUIRY_ENTRY_IS_PRE_SUPPLIED` is **amended in place** in
`open-questions.md`'s dated section (§6.6) rather than given a row at all. Phase 4 is the phase that
makes each of the six **visible**, every row cites the core
declaration, and no Phase-4 file declares a second copy under the same name — **except
`PRINT_POSITIONS`, which is independent by design for the reason the
`PAGINATE_NEVER_CALLS_RENDER_GREEN_BAR` row gives**. Phase 4 draws them; it
does not own them.

---

## 16. Documentation conventions, matching Phase 2's, Phase 3's and Phase 5's

Nine conventions. The first six govern the code the waves write; the last three govern the four
documents the phase leaves behind.

**1. Every file opens with a header** naming its plan section, its research citations by form number
and page, and **what it deliberately does not do** — the shape `readerView.ts:11`,
`printerView.ts:11`, `autocoder/mount.ts:12` and `sourceBox.ts:6` already use, which is how four
shipped files came to promise this phase's destination directory in writing.

**2. Every machine claim in code says WHICH MACHINE** and cites a form number + page or a
`docs/research/` file and section. **1401 ≠ 1410**, and a 1401 fact that could ride across is *named
and refused at its point of use*, not silently omitted — a period UI is exactly where a 1401
photograph is most likely to be mistaken for the machine this project models. The four refusals and
their homes: the **red fault lamp** (console-and-physical.md §11) in `period.css`'s own comment and
in `printer/panelView.ts`'s header; the **address dials** (console-and-physical.md §1, A22-0526-3
pp.50-51, *"The 1410 has **no** address-dial rotary switches (unlike the 1401)"*) in
`console/rotaryView.ts`'s header, which is why §6.4's keyed dialogue is the design; the **1402 LOAD
key** (software.md §10.1, §10.10) as a string assertion over `reader/keysView.ts`'s `KEY_LABELS`;
and the **1401 Autocoder listing heading** (console-and-physical.md §12, *"Do not mix it into a 1410
renderer"*) in `coding/listingView.ts`'s header, where the C28-0326-2 §12 page heading is drawn
**around** `renderListing`'s columns and never inside them.

**3. Every `[unverified]` / `[likely]` decision is an `// OPEN: CONSTANT_NAME`** in the file that
depends on it, carrying its fallback and its citation in the comment, with a matching row in §15 and
an entry in the dated Phase 4 section of `open-questions.md`. The grep in `PHASE-4-NOTES.md` §1 is a
set difference against §15 **in both directions**, the Phase-3 and Phase-5 precedent.

**4. A constant is a fallback, never a claim.** The comment says what would settle it — a colour
photograph, a Fig.47 scan, a re-render of A22-0526-3 pp.50-58 — and what it would cost to flip:
`LINES_PER_BAR_IS_THREE` costs a shade, `CORNER_CUT_IS_UPPER_LEFT` costs one `M` command and a
golden re-cut, `H_CHAIN_IS_A_FIVE_GLYPH_RESTRIKE_OF_THE_A_PAGE` costs four lines of `machine.ts` the
phase refuses to write.

**5. A research correction found mid-build ESCALATES with its own commit** and **never edits
`docs/research/console-and-physical.md` in a build wave** — the `RW#` / `WM#` / `loader.ts:90`
precedent (DECISIONS.md 2026-08-31, where all three were decided on primary source rather than
annotated). The dated Phase 4 section of `docs/research/open-questions.md` is where findings land,
along with `docs/BUILD-LOG-4.md`; nothing above that section is edited by any wave. Wave 0's bounded
two-attempt primary read writes to exactly those two files and nowhere else.

**6. Goldens carry a header saying whether they are IBM's or CONSTRUCTED.** The phase adds **one
golden file**, `test/golden/card-face-a.svg.txt`, whose header says CONSTRUCTED. **The Exhibit II
expectation is not a file at all**: it is a slice of `docs/research/console-and-physical.md` §2
taken at test time between the fences at lines 59 and 79, and `test/period-selectric.test.ts`'s own
header says so **and names the excluded row** — the elided `D bbbb...` line, excluded with its
reason, so that a later reader who restores it is contradicting a written sentence rather than
filling a silence (§14 R4). charset.md §5's dual table is sliced the same way by
`test/period-chain.test.ts`. §12.3 states the count: one golden *file*, two expectations sliced from
research at test time.

**7. `docs/BUILD-LOG-4.md`** — opened by the arrival commit with `## Arrival — <sha> (the plan, on
feature/phase-4-period-ui)` in `docs/BUILD-LOG-5.md`'s shape: the design panel's run id
(`wf_b43127ed-583`) and aggregate scores (**paper-first 480 · reuse-first 451 · operator-first 440**,
every judge ranking a different design first, so paper-first won on having no last place), the review
rounds with what each caught and how it closed, and **the gate baseline measured on `voltron` at
`b7c60b3` before a line of the plan was written** — typecheck clean; 93 files / 1745 tests / 1 skip;
smoke 6 / 49; cc01 1241 instructions with the check at 00322; 348 / 2251 / 3688 / 6982 bytes. Then
one `## Wave N — <what> — commit <sha>` section per wave, in `docs/BUILD-LOG-3.md`'s shape: what
landed, **§12.2's gate lines with their numbers** including the new `npm test` / `npm run smoke`
counts from every wave that moves them and whether the run had `oracles/` present (§14 R3), the
review findings **with their resolutions**, and any number in this plan the build corrected. **Each
wave section carries a browser screenshot** (§14 R11) committed at
`docs/screenshots/phase-4/wave-N-<station>.png` and referenced by relative path — **a committed PNG,
not a base64 data URI**, which would make the build log unreadable in `git diff`; wave 0 creates the
directory, since the repo carries no image anywhere today. Wave 0's section carries the bounded
primary read's findings **or the record that it was attempted twice and failed**; wave 6's carries
criterion 19's human walk by name and date.

**8. `PHASE-4-NOTES.md`** — four sections, matching `PHASE-3-NOTES.md` and `PHASE-5-NOTES.md`:
`## 1. [unverified] / [likely] fallbacks hit (each behind a named constant with // OPEN:)`, §15's
ledger reduced to the constants actually reached with the fallback taken; `## 2. Plan deviations
(minimal, logged, not redesigns) and modelling refusals`, including whether wave 5 was split (§14
R13), the `stale` edit's final line count against the planned +16, and the R6 residual — a frozen
`<select>` beside a correct live label; `## 3. Research corrections and [observed] observations`,
including what wave 0's read settled, what the waves observed about `HALT_TYPES_NO_PRINTOUT` for
whoever can act on it, and the straddle as the drawn page met it; and `## 4. Open items carried out
of Phase 4`, whose Phase-6 hand-off is **enumerated rather than gestured at** (completeness critic
item 4), four lines:

- (a) a **fourth `?raw` declaration** in `period/raw-import.d.ts` for `demos/reentry.asm`, and a
  `sample` button on the coding sheet that can load it — the merged shim is one file precisely so a
  fourth pattern is one line in one place, which is the whole of what the merge buys (the compiler
  does not forbid a second copy on this toolchain — §10.6 item 1, measured);
- (b) the **132-position form and the 66-line `DEFAULT_CARRIAGE_TAPE` left unparameterised** — Phase
  4 must not parameterise away the two numbers the trajectory report depends on;
- (c) the **plain-white toggle kept**, because a twelve-column trajectory table reads better without
  bars — `GREEN_BAR_IS_THE_DEFAULT_WITH_A_WHITE_TOGGLE`'s toggle is a Phase-6 requirement, not a
  preference;
- (d) **`paginate` proved over more than two forms** in wave 1's synthetic three-form case, since no
  shipped demo exceeds two — so a long report needs **no new station**: one Autocoder deck, the same
  hopper, the same form, the same stack.

**9. `docs/DECISIONS.md` gains the Phase 4 rulings at merge**, by the orchestrator, in one dated
`## 2026-… — Phase 4 merged` block: **line 11 `[proposed]` → `[settled]`** — "Build tool: Vite,
minimal deps", with the three devDependencies named and unchanged (`typescript ~5.9`, `vite ^8`,
`vitest ^4`) and the **one** config line added (`base: './'` in `vite.config.ts`, because the built
page emits `src="/assets/…"` today and will not open from the filesystem); **no framework**, with
architecture.md §10's requested concrete reason recorded — every view already implements
`render(s: MachineState)` behind a hand-written diff key, ~120 lines in total; **`controls.ts`
frozen** at its SHA-256; **the H-chain restrike**; **DISPLAY and C.E. as UI-only detents**; **the
inquiry hold**; **the keyboard focus rule** (§6.5); and **sound out**. The `[open]` build-provenance item `DECISIONS.md` carried under "2026-09-01 — Phase 5 merged"
was **already closed at this plan's arrival**, in its own commit, with Tom's 2026-09-01 answer: a
**Fable build orchestrator with every worker on Opus or lower**, which is this phase's own model
policy; the merge block records the rulings above and does not reopen it. **`docs/STATUS.md` is updated by the orchestrator at merge, never by a
wave** — the Phase 2 / 3 / 5 precedent, and §3.7 lists both files as do-not-touch for the duration.
**`docs/research/open-questions.md`** gains a `## Phase 4 — 2026-…` section at the end with
`### Wave N — <title>` subsections and the file's existing four-column table
`| Constant | Question | Where it bites | Fallback taken, and the alternative |`; nothing outside
that section is edited, and `INQUIRY_ENTRY_IS_PRE_SUPPLIED`'s wording is **amended in place within
it** (§6.6) rather than edited at its Phase-2 row.

---
