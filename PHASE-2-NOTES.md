# Phase 2 notes — what was hit, what was chosen

Named deliverable from `docs/plans/phase-2-unit-record.md` §16. Four sections: `[unverified]` /
`[likely]` fallbacks actually hit, plan deviations, research corrections and `[observed]`
observations, open items carried out. Appended per wave, in the wave's own commit.

## 1. `[unverified]` / `[likely]` fallbacks hit (each behind a named constant with `// OPEN:`)

| Constant | Where | Fallback taken | Hit by |
|---|---|---|---|
| (wave 1: none — every card-format fact is `[verified]` charset.md §2/§2.1/§3/§7; the card-face geometry is `[likely]`, display-only, tagged at `cardView.ts` header, no constant per plan §15) | | | |
| `READER_TRANSPORT_MODELS_ONE_CARD = true` | `devices/reader1402.ts` | READER START physically feeds three cards; we model the 80-position buffer (all the CPU can observe) and enforce the three-cards-remaining Not Ready rule directly. | Every read. |
| `EOF_KEY_REQUIRED_AT_THREE_CARDS = true` | `devices/reader1402.ts` | "3 cards remaining" counts buffer + hopper (io.md §6 does not say whether the buffered card counts). | Wave-2 tests; the demo procedure (press EOF with a 6-card deck). |
| `UNKNOWN_X3_IS_NOT_READY = true` | `devices/reader1402.ts` | x3 outside 0/1/2/9 → Not Ready, following io.md §9 Figure 99 "no such unit"; not InstructionCheck — a readiness question, not a decode question. | Wave-2 test only. |
| `STACKER_DEVICE_X2 = '1'`, `CARRIAGE_DEVICE_X2 = '2'` | `channel.ts` | `K` routes to the 1402 reader, `F` to the 1403 — physical rather than stated: no figure prints an x2 for an op with no x-field. | Every `K` (and `F` from wave 3). |
| `BOOTSTRAP_1_J_ROW_IS_SHORT_ONE_COLUMN = true` | `test/reader1402.test.ts` | software.md §10.5's row `54-59 / J 00138 / 00059-00065` maps six columns onto seven core positions; read as seven (54-60, blank d present per `J` `lengths: [1,7]`), putting the control field's first character at 00066 — the B-address both reads carry. Assertions from the transcription as printed stop at 00058. | The wave-2 external oracle. |
| `CARD_DOLLAR_SUPPRESSES_GM_WM_TEST = true` | `channel.ts` `decodeD` | [verified] legality (C28-0351-5 p.8 Table II), [likely] effect: suppress the GM-WM test, take all 80 buffer columns, set no WLR. `decodeD` is the one place that moves if overturned. | The keyed bootstrap and every demo `$` read. |
| `PRINT_CHAIN_A_IS_DEFAULT` | `devices/printer1403.ts` | Chain is a constructor option, default `'A'` (A22-0526-3 p.6's footnote is primary); `?` prints `&` on A / `+` on H ([likely], charset.md §5.1); the golden's header names the chain. | Every printed glyph; the golden. |
| `DEFAULT_CARRIAGE_TAPE` (66 lines; ch1@1, ch9@57, ch12@60) | `devices/printer1403.ts` | No manual publishes any site's tape punching; 66 lines from console-and-physical.md §8's [likely] green-bar stock. Constructor option. | Every skip; the demo's F1. |
| `CARRIAGE_POWER_ON_AT_CHANNEL_1_HOME = true` | `devices/printer1403.ts` | Power on at page 1 line 1 POSITIONED ON the channel-1 punch, so the first F1 ejects a form (the next-punch rule) — which is why the demo's skip is at the END (§13). Pinned in both directions by wave-3 tests. | The demo's closing F1. |
| `UNDEFINED_CARRIAGE_D_CHAR_IS_INSTRUCTION_CHECK = true` | `devices/printer1403.ts` | Figure 90 lists 30 rows and states no validity check; InstructionCheck matching the J and I/O d-char rules. | Wave-3 test only. |
| `OVERLONG_RECORD_SETS_WLR = true` | `printer1403.ts` (132) / `punch1402.ts` (80) | Figures 89/63 list WLR with "line/card not printed" but never state the cause on output; overflow sets WLR and prints/punches nothing. | Wave-3/4 tests. |
| `BUFFER_CLEARED_BEFORE_TRANSFER = true` | `printer1403.ts` / `punch1402.ts` | No source says what the buffer holds past a short record; blanks — stale contents would be nondeterministic and unattested. | Every short record. |
| `L_WRITE_WORD_MARKS_PRINTS_A_BLANK_LINE = true` | `devices/printer1403.ts` | "(Thus, if the L Op code is used, no printing results.)" (A22-0526-3 p.80, charset.md §7) is `[verified]` only for NO INK; blank-line-vs-suppressed-cycle is our interpretation — the buffer prints all blanks and the automatic space still arms; no source describes a suppressed cycle. | `L %21` (test-pinned). |
| `WS_PAIR_COUNTS_AS_ONE`, `OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK`, `TRAILING_SEPARATOR_IS_A_DECK_ERROR` | `formats/objectdeck.ts` | C28-0309-1's Figure 2 as rendered in software.md §8.1 pins the column layout but not every edge: doubled word separators in a payload count as one loaded position, a word mark over a group mark is unencodable, and a trailing unpaired separator is a deck error. Each carries its quote and its gap at the point of use. | Object-deck round-trip (tier-0 suite; 20k-payload brute force in review); `WS_PAIR_COUNTS_AS_ONE` pinned by name in `test/objectdeck.test.ts`. |
| `EXECUTE_CARD_IS_E_IN_COLUMN_1` | `formats/loader.ts` (NOT `objectdeck.ts` — the execute card is the loader's, and the constant is declared beside `executeCard()`) | `[verified]` for the IBM **diagnostic** loader (emulators.md §7, `E ~J02000b~`), adopted as the shape of ours; ours is a reconstruction, so the column-1 glyph is a convention we inherit rather than a format IBM published for this loader. | `test/loader.test.ts`'s execute-card block, pinned by name. |
| `LOADER_LOOPS_BACK_PAST_THE_RE_ENTRY_SLOT = true` | `formats/loader.ts` | The loader's loop branches to 00282, past the 00281 re-entry slot — the one choice in the file with no source at all: the slot's semantics (PAT plants a chained `,` there, C28-0309-1 pp.19-20) should not depend on loop-register residue. | Tier-3 loader run (00281 executes exactly once). |
| `CONDENSED_LOADER_IS_A_RECONSTRUCTION = true` | `formats/loader.ts` | No listing of the real condensed loader survives; the program honours the documented fixed points (re-entry 00281, C28-0309-1 pp.19-20; the keyed bootstrap's 00012, C28-0351-5 Table II) and is otherwise ours. | The whole of `test/loader.test.ts`. |
| `SKIP_TO_UNPUNCHED_CHANNEL_ADVANCES_ONE_FORM = true` | `devices/printer1403.ts` | A skip to a channel with no punch on the tape advances exactly one form, same line, rather than searching forever — observable from any hand-typed deck; no manual states the behaviour. Promoted from a comment to a named constant by the wave-3 review. | `F 5` on the default tape (test-pinned). |
| `CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH = true` | `devices/console1415.ts` (cited at `channel.ts` `inquiryRequest`, `machine.ts` `programReset`) | `[unverified]` — io.md §8 contradicts itself. Reading A: the INQUIRY REQUEST key sets the one latch `J (I) Q` (BNQ) tests and Program Reset clears. Reading B: BNQ tests a per-channel *remote* latch the console key never sets. **We take A** — it is the only reading that gives a demonstrable inquiry path on a machine with one console and no remote stations. Under B this configuration needs a second latch and `J (I) Q` answers false forever. | Every `J (I) Q`; the whole inquiry suite (`test/console-inquiry.test.ts`). |
| `INQUIRY_ENTRY_IS_PRE_SUPPLIED = true` | `devices/console1415.ts` | An implementation device, not a hardware claim: on iron the program's `RCP` unlocks the keyboard and the CPU waits while the operator types. Here the entry is supplied before the read runs, because nothing in this emulator blocks. | Every inquiry test; the UI's inquiry view. |
| `CARRIAGE_SENSES_AT_DESTINATION_ONLY = true` | `devices/printer1403.ts` | A **known divergence from a `[verified]` sentence**, recorded not fixed (whole-branch review). io.md §5 Figure 35 line 268 (A22-0526-3 p.36): the channel 9/12 indicators turn on "when their hole **is sensed**" — on iron the brushes read every line the form passes. `space()`/`skipToChannel()` sense once, on the destination line. Observable: `F L` (space 3) from line 55 crosses the channel-9 punch at 57 and lands on 58, leaving channel 9 OFF where hardware leaves it ON. Fix path at the constant: sense inside `advanceOneLine()`. | Nothing in Phase 2 — the demo spaces one line at a time and skips only `F 1`. |
| `LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE = true` | `channel.ts` `read()` | A **known divergence from a `[likely]` line**, recorded not fixed (whole-branch review). io.md §3 line 173 says a load-mode read that assembles a GM-WM is stopped by it on "the next cycle"; the mechanism in the same paragraph and in §3's termination table says the store gate inspects the position's OLD contents, so a mark just written is never re-read. We follow the mechanism, with the SimH oracle agreeing, and `formats/objectdeck.ts` forbids the pattern outright (`OBJECT_DECK_FORBIDS_WM_OVER_GROUP_MARK`) — io.md §3's own second option for a card loader. Fix path at the constant. | Nothing reachable: the encoder and decoder both refuse the pattern. |
| `AUTO_SPACE_IS_DEFERRED = true`, `AUTO_SPACE_IS_CANCELLED_BY_A_CARRIAGE_INSTRUCTION = true` | `devices/printer1403.ts` | The space is performed by the next write, consumed and replaced by the next F, or performed by an explicit flush() at end of job; nothing that only reads state performs it — snapshot() and renderGreenBar stay pure or the golden would depend on animation frames (§7.3). Visible as `CarriageState.autoSpacePending`. | Every print; the demo (the closing F1 consumes it). |

## 2. Plan deviations (minimal, logged, not redesigns) and modelling refusals

1. **`parseDeck` reports one error kind beyond plan §9's enumeration** — a syntactically valid
   punch list that names no card code (`{12-11}`, `{1-2}`): `bcdOfPunches` returns null, so the
   parser reports a `DeckError` and the column parses blank, per the same errors-are-data rule.
2. **Trailing spaces and `\r` are stripped per line before column counting** (wave-1 review
   finding): an 80-column card pasted with trailing whitespace would otherwise report a bogus
   ">80 columns" error. Round-trip-safe — a trailing blank is not a punched column and
   `formatDeck` never emits one.
3. **`formatDeck` decides "typeable" by code point < 0x80**, which selects exactly the eight
   non-ASCII glyphs (⌑ ⧧ Δ ⌒ ⧻ ƀ √ ‡) for `{…}` punch-list form (plan §9's "whichever form the
   code's glyph makes typeable", made concrete).
4. **The `K` throw-assertion was never in `test/exec-io.test.ts`** (plan §3 predicted it there):
   it lived in `test/wave7-rejections.test.ts`'s `['F','K']` rejection loop, narrowed to `['F']`
   — one title, one array element, a pointer comment. That file is outside plan §3's named list;
   this is the justification the rebase needs. Wave 3 removes the `F` element the same way.
5. **Reader `precheck` tests the EOF latch before out-of-cards** (plan §7.1 prints it third):
   the latch can only be on once the transport is empty, so the printed order would let the
   out-of-cards Not Ready swallow every end-of-file report (Figure 62's Not Ready row says
   "reader out of cards (not EOF)"). Argued at the code.
6. **Reader stackers are counts, not `Card[]`** (plan §7.1's sketch): `MachineState.reader`
   needs counts (§5) and the UI session derives which card is where — double bookkeeping would
   be a synchronisation hazard. Stacked cards are not retrievable from the device.
7. **Plan §6.1's "a `K` issued with the latch on reports nothing" is one shade too strong:** it
   reports No Transfer — Figure 62's own row, because the last feeding read left `transferred`
   false. What it never reports is Condition or Data Check, and the latch survives for the read
   that owes the program its end-of-file. The test asserts exactly that sequence.
8. **`carriage1`'s throw message was updated to name wave 3** (wave 2's io.ts grant was
   "selectStacker1 only"); the string is asserted by `test/channel-control.test.ts` so wave 3's
   diff is visible.
9. **Modelling refusal — reader Data Check and Validity** (with `CARRIAGE_NEVER_BUSY` to come in
   wave 4): a hole-count or 1414 parity error cannot be produced by any input this emulator
   accepts, and `precheck` cannot express "set Data Check and still transfer" (io.md §6 Errors,
   [verified]). The two rows are asserted in `oracle/io-status.json` as table rows; the code
   path does not exist. Stated rather than faked (plan §7.1).


10. **A skip to a channel with no punch advances one form** — shipped as a comment-only bound,
   promoted to `SKIP_TO_UNPUNCHED_CHANNEL_ADVANCES_ONE_FORM` (§1) with a pinning test by the
   wave-3 review, which judged it observable rather than defensive.
11. **The automatic single space emits no `PrintEvent`**: `PrintEvent` is what the PROGRAM asked
   for (types.ts §7) and the space is the machine's own motion; the after-print variants' events
   are pushed when the `F` runs, with `afterPrint: true`. The paper and the carriage still move.
12. **Wave 4a's open-questions rows ride the wave-3 commit**: both waves append to the one dated
   section of `open-questions.md`, and 4a's devices were developed beside wave 3 (the plan's one
   sanctioned overlap); splitting the file's hunks between commits was not worth the risk. 4a's
   CODE lands in the wave-4 commit.
13. **The carriage tape is rendered from `machine.printer.tape`, not from the snapshot**: the
   wave-3 review reversed the UI worker's refusal — `Printer1403.tape` is public and the mount
   holds the machine, so the view draws the punches the printer actually holds (margin channel
   numbers) without a new `MachineState` member. `DEFAULT_CARRIAGE_TAPE` is now visible as
   plan §10/§15 require.
14. **`test/channel-control.test.ts` keeps its `F → Not Ready` line** for a bare `Channel1` with
   no 1403 registered (the no-such-unit reading); the real-carriage proof is the machine-level
   test beside it.
15. **Two plan slips in §11's wave-4 column** (wave 4b): `printer1403.ts` is missing from the
   column though §5/§6.3 put `outputCells` there; and §3 names only `dmods`/`exec-branch` tests
   for the four `J` flips when `test/wave7-rejections.test.ts` is a third (it asserted
   `available === false` for `9`/`R` — retargeted to the channel-2 twins `!`/`L`, which prove
   the same rejection on the channel this configuration lacks).
16. **`machine.computerReset()` now calls `machine.programReset()`**: the plan's "computerReset
   already calls programReset" was true of `RegisterFile`, not the façade — the inquiry-latch
   drop was not inherited and a test caught it. Behaviour-neutral otherwise
   (`RegisterFile.computerReset` is itself just `programReset`).
17. **The channel senses the printer/console via registration-time structural refs**
   (`CarriageSensing`/`InquirySensing` set by `machine.ts` beside `register()`): a test that
   re-registers a different device at x2 `2` leaves the channel sensing the original. Cost
   documented at the declaration; registry lookup would have needed a runtime duck-type + cast.
18. **`outputCells` runs before `translateForOutput`, so a load-mode `L %21` record is not
   lengthened**: blanks substituted first mean no marks → no separators inserted. On iron a
   132-position marked field would overflow the buffer → WLR, no line. Unreachable from the
   demo; forced by plan §6.3's ordering. (Wave-4 review, logged not fixed.)
19. **"The completed read clears the inquiry latch" is an inference**: io.md §8 names only
   cancel-before-recognition and Program Reset as clearing points; read-on-release is required
   for a workable request/serve cycle. Sentence recorded in the
   `CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH` block; pinned by test.
20. **The `d === 'R'` precheck gate leaked a cancelled inquiry to a `$` read** (wave-4 review
   MAJOR): `channel.decodeD` puts `$` on the read direction, so `M %T0 … $` skipped the
   Condition precheck and delivered the cancelled message. `read()` is now authoritative for
   the cancel endings; the precheck gate stays for Figure 46's write column. On the `$` path the
   channel reports No Transfer with `condition=false` (not the Condition indicator): Figure 45
   documents only `R` as the console read d-char and `$` is our C17 extension, so the fix keeps
   the half io.md §8 step 6 rules on — nothing transferred, entry consumed, latch dropped —
   without widening the precheck whitelist Figure 46's "never" column leans on.
21. **The loader deck is two cards, not §11 row 5's one** (wave 5): the hand-keyed `R` reads to
   the fixed literal 00012 (C28-0351-5 Table II) while the loader's re-entry point is 00281
   (C28-0309-1 pp.19-20) — one card cannot land in two places. The six-card hopper is
   [bootstrap, loader body, three condensed cards, execute card]; software.md §9's own loader
   sizes are 5 and 9 cards.
22. **The index adder replaced §8.3's self-modifying address setup** (wave 5): WORK = 00090 puts
   a card's load address in IR14 and its count in IR15 with no instruction executed, and the two
   `D` moves address them as tags (`00A?0`, `00?!0`). §8.3's sketched sequence does not fit an
   80-column card; the shipped body is 70 characters in 10 word-marked fields = 80 columns
   exactly. Nothing in the loader modifies itself, so §14 R1's core risk is retired rather than
   managed. Verified character by character in review (tags 15/14; the A-bit `‡` slip caught in
   trace and fixed before review).
23. **The loader's EOF test originally masked only Condition** (wave-5 review MAJOR): a mid-load
   Not Ready — io.md §6's three-cards-remaining rule, the one operator error the phase
   documents — spun the loop forever. One d-character (`8` → `9`, Condition ∨ Not Ready) fixes
   it at zero column cost; with END OF FILE pressed the two runs' full core images differ in
   exactly one cell — 00298, the d-character itself (fixer-diffed, all 10,000 cells with word
   marks). The no-EOF halt at 00349 is test-pinned.

24. **`CARRIAGE_NEVER_BUSY` is filed in this section, not §1** (whole-branch review): plan §16 is
    explicit that "the modelling refusals — `CARRIAGE_NEVER_BUSY`, the reader Data Check gap —
    belong here, not in §1", and plan §15's own row says the same. It was a §1 table row through
    wave 4; it is item 9's twin and now sits beside it. The cause is `[verified]` (io.md §7: the
    1403 "becomes busy after the transfer completes and printing starts"); what is refused is
    modelling it, because this configuration has no overlap feature and the `I/O` term of
    `49.5 µs + I/O` is 0, so no program here can observe device motion. `J (I) R` (BPCB) is always
    false, test-pinned.
25. **The reader's END OF FILE condition survived a new deck** (whole-branch review MAJOR):
    `eofKey` was set by `endOfFile()` and cleared by nothing, and `loadDeck()` emptied only the
    hopper. io.md §6 `[verified]` (A22-0526-3 pp.61, 63): "The Stop key, or processing the last
    card, resets the EOF condition." A second PUT DECK IN HOPPER therefore ran deck 2's last three
    cards through without the operator pressing END OF FILE again — the three-cards-remaining Not
    Ready rule could never re-arm. `loadDeck()` now clears both the key and the latch; pinned in
    `test/reader1402.test.ts` (the test fails against the old code).
26. **Plan §15's constant table does not list four constants the phase shipped** —
    `SKIP_TO_UNPUNCHED_CHANNEL_ADVANCES_ONE_FORM`, `L_WRITE_WORD_MARKS_PRINTS_A_BLANK_LINE`,
    `LOADER_LOOPS_BACK_PAST_THE_RE_ENTRY_SLOT`, `CONDENSED_LOADER_IS_A_RECONSTRUCTION`. All four
    were named during the build (the first promoted from a comment by the wave-3 review, the
    fourth declared by the wave-5 review), and all four carry a `// OPEN:` block, a §1 row above,
    an `open-questions.md` Phase-2 row and — since the whole-branch review — a test that asserts
    the constant by name. **The plan is not edited post-hoc**; this line is the record that §15's
    table is a snapshot of what was foreseen, not of what shipped.
27. **Two divergences are recorded rather than fixed** (whole-branch review), each behind a named
    constant carrying both readings and the fix path: `CARRIAGE_SENSES_AT_DESTINATION_ONLY`
    (`printer1403.ts` — the channel 9/12 indicators sample at the destination line, not at every
    line the form crosses) and `LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE` (`channel.ts` — a
    GM-WM a load-mode read assembles does not stop that same read). Rows in §1 above and in
    `open-questions.md`'s Phase 2 section. Neither is reachable from anything this phase ships.
28. **`tools/run-deck.ts` reported JavaScript characters as "bytes"** (whole-branch review): the
    hello-dad golden is 346 UTF-16 code units and **348 bytes**, and the sentence beside the
    number claims a byte-for-byte match. The tool now prints `Buffer.byteLength(page, 'utf8')`;
    `docs/STATUS.md` and `docs/BUILD-LOG-2.md` quote 348 bytes to match.

## 3. Research corrections and `[observed]` observations

1. **One table, two namings** (wave 1): `src/core/bcd.ts` documents its glyph column as "the
   1410 A2 print glyph" (`PRINT_CHAIN = 'A2'`); plan §7.3/§10 call the same 64 glyphs "the 1415
   typeball's". Same table either way; noted at `cardView.ts` where both names meet. No research
   change.

## 4. Open items carried out of Phase 2

- **`docs/plans/architecture.md`'s three stale places, due at the merge commit** (plan §16
  "Housekeeping at merge, not before"): line ~336's "frozen here because Phase 2 hand-writes decks
  against them"; line ~315's `Card { readonly codes: Uint8Array; readonly ident?: string }`; line
  ~160's boundary-B5 `Card`. `Card` shipped as a bare `Uint8Array` alias (§2 deviation 1). The
  file was do-not-touch for the duration of the parallel build, so no wave could correct it.
- **`CARRIAGE_SENSES_AT_DESTINATION_ONLY`** — the carriage senses channels 9/12 only on the line a
  motion ends on. The fix is to call `senseChannels()` from `advanceOneLine()`; it becomes real
  work the first time a program spaces over a channel punch and then tests `J (I) 9`.
- **`LOAD_MODE_CREATED_GM_WM_DOES_NOT_TERMINATE`** — a load-mode read that assembles a GM-WM runs
  on. Unreachable while `objectdeck.ts` refuses the pattern; it becomes real work if a deck format
  that permits it arrives (a tape read, or a hand-punched card in the UI).
- **Reader Data Check and Validity have no code path** (§2 item 9) — asserted as rows in
  `oracle/io-status.json`, stated rather than faked. A hole-count or 1414 parity model would be
  needed to reach them.
- **A load-mode `L %21` record is not lengthened** (§2 item 18): `outputCells` runs before
  `translateForOutput`, so blanks are substituted before separators would be inserted. On iron a
  132-position marked field would overflow the buffer and set WLR with no line printed.
- **`INQUIRY_ENTRY_IS_PRE_SUPPLIED`** — the console entry is supplied before the read runs, because
  nothing in this emulator blocks. Real interactive typing at the 1415 is UI work for a later
  phase, and the constant is where it starts.
