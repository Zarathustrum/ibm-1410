# PHASE-5-NOTES — the 1410 Card-RPG host-side generator

## 1. [unverified] / [likely] fallbacks hit (each behind a named constant with // OPEN:)

The table is the exact set of `OPEN:` names first depended on through Wave 6: production names
under `src/rpg/**` plus the plan-required golden-provenance declaration in
`test/rpg-generate.test.ts`. Each row is also recorded in `docs/research/open-questions.md`, Phase
5, under the wave that first depended on it. Confidence below follows the Wave-0 primary read
rather than older wording in plan §15.

| Constant | Tag | Where | Fallback taken |
|---|---|---|---|
| `RECORD_POSITION_IS_THREE_DIGITS` | [unverified] for Full-RPG | `layout.ts` publishes `Cnnn`; the shared X24 card-system forms carry three-column positions | Keep the three-column shared-form shape and diagnose card positions above 80. Widen only if C28-1443 or a recovered `RPGIN` disassembly proves it. |
| `INDICATORS_ARE_ONE_CHARACTER_EACH` | [unverified] modelling choice | `layout.ts` sizes the readable indicator file | One core character holding `1` or `0` per indicator. Alternative: bit-pack and test with `BBE`. |
| `ONLY_REFERENCED_INDICATORS_ARE_ALLOCATED` | [unverified] | `layout.ts` allocates `Model.indicators` contiguously | Allocate only conditions the model references. Alternative: a fixed 100 numbered plus nine named cells. |
| `RESERVED_AREAS_SIT_ABOVE_THE_CODE_AND_BELOW_THE_PRINT_GROUP_MARK` | project layout ruling | `layout.ts::layoutOf` and `layoutInvariant` | Keep one slack cell after code, then all reserved areas, then emitted `PLGM`. Alternative: enumerate and justify every assembler warning. |
| `RESERVED_AREAS_ARE_PAIRWISE_DISJOINT_AND_THE_PRINT_AREA_CLEARS_THE_CARD_IMAGE` | project arithmetic ruling | `layout.ts::layoutInvariant` | Require ascending, disjoint extents and round `PLINE` from the end of `CDIN`. No relaxed fallback; an overlapping layout needs a new closed-loop proof. |
| `PRINT_AREA_IS_HUNDREDS_ALIGNED` | [likely], forced by verified 1410 Clear Storage behaviour | `layout.ts` rounds `PLINE` to a hundreds boundary | Use two `CS` instructions over the 132-position area. Alternative: move a 132-blank constant and drop the alignment constraint. |
| `GENERATED_READ_TAKES_THE_BAKED_D` | project source-form ruling | `emitio.ts::ioStmt` | Emit `R1 0,CDIN` / `R1W 0,CDIN`, taking the mnemonic's baked d. Alternative: add an explicit d only if the `CDIN` layout permits an internal GM-WM. |
| `OVERFLOW_IS_LATCHED_IMMEDIATELY_AFTER_THE_PRINT` | [likely] | `emitio.ts::senseOverflowStmts` | Test and latch carriage overflow immediately after a detail or total print. Alternative: maintain and compare a generated line counter. |
| `PAGE_OVERFLOW_IS_CARRIAGE_CHANNEL_12` | [likely] | `emitio.ts::senseOverflowStmts` uses `BCV1` | Treat channel 12 as `OF`; the channel-12 punch at form line 60 remains the project's carriage tape. Alternative: use the same generated line counter. |
| `EDIT_WORD_RIDES_ON_THE_FIELD_ENTRY` | [verified] IBM 1401 sheet semantics; [likely] 1410 processor behaviour | `types.ts::FieldEntry.literal` and the Wave-2 model fixture | Keep an inline edit body or reusable `WORDxx` reference on its F/B entry. Alternative: require a W entry and match by field end. |
| `GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET` | [likely] | `layout.ts` publishes generated/reserved label families; the I/O oracle checks their namespace | Reserve the structural and generated label families in addition to the recovered 1410 names. Alternative: put every internal label on the `Z` plus digits scheme. |
| `F1_TO_F6_ARE_THE_CONTROL_LEVEL_INDICATORS` | [verified] IBM 1401 meaning; [likely] 1410 processor behaviour | `indicators.ts::indicatorLabel` and `cycle.ts`'s break ladder | Keep literal `F1`-`F6` labels. Alternative: replace the label map if recovered 1410 evidence names them differently. |
| `CONTROL_BREAK_AT_LEVEL_N_BREAKS_ALL_MINOR_LEVELS` | [likely] | `cycle.ts::controlBreakStmts` | Use the fall-through ladder so a level-n break sets every less-significant level. Alternative: branch directly to total calculation after setting only the named level. |
| `TOTAL_TIME_PRECEDES_DETAIL_TIME_ON_A_BREAK` | [verified] IBM 1401 order; [likely] 1410 processor behaviour | `CYCLE_ORDER` | Run total calculation/output before level reset and the new record's detail work. Alternative: add a comparator to total output and re-cut the demo. |
| `HEADING_OUTPUT_FOLLOWS_DETAIL_CALCULATION` | [unverified] | `CYCLE_ORDER` | Keep heading output after detail calculation and before detail output. Alternative: move it before detail calculation and provide another route for the first record's amount. |
| `RG_CARD_BODY_IS_NOT_READ` | [verified] 1410 messages; [unverified] RG layout | `sheets/control.ts::parseControlCard` | Read only `RG` in cols 1-2, diagnose nonblank body cols 3-75, ignore cols 76-80. Alternative: replace the parser if C28-1443 recovers the control-card layout. |
| `SPEC_DECK_ORDER_IS_THE_1401_ORDER` | [verified] IBM 1401 deck order; [likely] 1410 Card-RPG | `deck.ts::scan` | Scan RG, Input, Data, Calculation, Format in order and emit recovered boundary messages. Alternative: replace the state table if recovered 1410 evidence differs. |
| `FIFTY_ONE_COLUMN_MODE_IS_OUT` | [verified] IBM 1401 convention; [unverified] 1410 carry-over | `sheets/read.ts::readSpecSource` | Accept only 80-column shared-form cards. Alternative: translate 51-column input by +14 here. |
| `WE_ARE_MODELLING_CARD_RPG` | [verified for absence; unverified for cause] | `deck.ts` and later UI framing | Keep the project card-only and never claim Full-RPG program 1410-RG-910. Alternative: none without changing the settled peripheral scope. |
| `RPG_DIAGNOSTIC_TEXTS_ARE_THE_RECOVERED_ONES` | [verified] for texts; mapping is ours | `messages.ts` exports fourteen processor and two generated messages | Recovered messages carry PR-108 byte offsets; invented diagnostics are `ours`. Alternative: none; provenance is the mitigation. |
| `CONDITION_GROUP_IS_NOT_PLUS_TWO_DIGIT_INDICATOR` | [verified] shared-sheet layout | `model.ts` consumes the split condition fields from `columns.ts` | Treat the first column of each three-column group as Not and the two remaining columns as the indicator. Alternative: move the split and re-cut condition-bearing decks. |
| `THE_LEVEL_ORDERING_RULE_APPLIES_TO_NUMERIC_LEVELS_ONLY` | [verified] IBM 1401 hierarchy; [likely] 1410 runtime | `model.ts` Format ordering diagnostics | Enforce heading/total ordering on numeric hierarchical levels only. Alternative: order alphabetic levels too and re-cut the demo's HA/HB group. |
| `OVERFLOW_HEADING_IS_AN_INDEPENDENT_ALPHABETIC_LEVEL_LINE` | [verified] IBM 1401; [likely] 1410 runtime | `model.ts` enforces the `OF`-in-every-alternative rule | Keep overflow headings as independent `HBx` lines. Alternative: explicitly depart from J24-0215-2 p.38 and re-cut the heading group. |
| `EDIT_WORD_IS_THE_1410_MCE_CONTROL_WORD` | [likely] over verified 1410 MCE rule | `model.ts` preserves W-entry bodies at their declared length | Treat Format edit words as MCE control words. Alternative: diagnose edit words until C28-1443 or processor source confirms the rule. |
| `LEVEL_NUMBER_IS_NOT_THE_CONTROL_FIELD_NUMBER` | [verified] shared-form distinction; settled ruling | `model.ts` allows `T31` to fire on `LC` | Use total-line level for ordering only; fire totals from condition columns. Alternative: map total level to Fn and re-cut the grand total. |
| `CXX_NAMES_THE_RECORD_TYPE_BY_INPUT_COLS_1_TO_3` | [verified] shared-form text | `model.ts::resolveSource` | Resolve `Cxx` sources against Input cols 1-3, e.g. `CAA`. Alternative: resolve by resulting condition and re-cut the Data cards. |
| `SER_AND_RCT_ARE_THE_SERIAL_AND_RECORD_COUNTERS` | [likely], fallback selected | `model.ts::resolveSource` diagnoses both tokens | Diagnose `SER`/`RCT` as unsupported until C28-1443 establishes their storage, increment and reset cadence. The demo does not use either. |
| `HL_STATUSES_NEED_NO_SPECIAL_FEATURE_ON_THE_1410` | [verified] 1410 Compare availability | `model.ts` and vocabulary tests keep H/L accepted | Accept H/L statuses without carrying the 1401 special-feature gate. Alternative: diagnose H/L as unsupported. |
| `SENSE_SWITCH_CONDITIONS_ARE_1401_ONLY` | [verified] 1415 sense-switch mode limit | `model.ts` condition resolution | Diagnose `SB`/`SC`/`SD` with the A22-0526-3 pp.56-58 citation. Alternative: treat them as permanently off. |
| `SEQUENCE_CHECK_IS_THE_SCF_LINE_NOT_MATCHING_FIELDS` | [verified] shared-form SCF layout; [likely] 1410 runtime | `model.ts` exposes `sequenceField` only from an `SCFx` line | Keep SCF as a sequence-check input, not an RPG II construct. Alternative: remove the field if recovered 1410 evidence rejects it. |
| `SEQUENCE_CHECK_IS_GENERATED_ONLY_WITH_AN_SCF_LINE` | [likely] | `model.ts` leaves the sales demo without `sequenceField` | Generate sequence checking only when an SCF line exists. Alternative: always generate it keyed on control field 1. |
| `PUNCH_STACKER_IS_THE_PUNCH_X3_DIGIT_NOT_SSF` | [verified] x3 mapping; punch output out of scope | `model.ts` diagnoses Format col 19 | Refuse stacker selection in Phase 5. Alternative: later implement punch output via the punch instruction's x3 digit. |
| `HALF_ADJUST_IS_ADD_FIVE_AT_THE_NAMED_POSITION` | [likely] | `calc.ts` emits `A FIVE,result-(k-1)` before applying the position adjustment | Add five at the named position. Alternative: diagnose half-adjust as requiring C28-1443 and re-cut the demo commission card. |
| `GENERATED_PROGRAM_IS_OPEN_CODED_NOT_IOCS` | project ruling over [verified] contrary period evidence | `generate.ts` composes macro-free Autocoder | Keep the constructed open-coded program because no IOCS macro library exists. There is no machine-preserving fallback; explicit provenance is the mitigation. |
| `RPG_GOLDENS_ARE_CONSTRUCTED` | provenance, never period truth | `test/rpg-generate.test.ts` and the reviewed print maps | Keep the two independent producer/oracle paths and name the goldens as constructed. No recovered 1410 RPG report exists to substitute. |
| `RPG_LISTING_COLUMN_STOPS` | [unverified] | `listing.ts` formats the constructed specification listing and `sales-summary.lst` freezes it | Keep the one exported 132-position layout from plan §9. Alternative: change that array and regenerate only the constructed listing golden. |

## 2. Plan deviations (minimal, logged, not redesigns) and modelling refusals

- **The §16 Arrival exhibit was backfilled before Wave 5, not in the plan-arrival commit.** The
  missing fenced block was copied verbatim from committed
  `docs/plans/phase-5-target-draft.asm`; no plan, research, source, test, target or page artifact
  changed. This repairs the required durable exhibit but cannot retroactively satisfy §16's
  before-Wave-0 timing.
- **Open-coded output is a modelling refusal, not recovered processor form.** The PR-108 skeleton
  verifies that IBM's 1410 RPG output used IOCS macros and `SBR` linkage. Phase 5 emits macro-free,
  open-coded Autocoder because this project has no macro library; it does not claim that source
  shape as period output (`rpg-sources.md` §4.2, §10.4). The absence of `SBR` / `SFR` / `SER` /
  `SAR` is therefore not a gate: open coding is a design note, not a period invariant.
- **The raw page golden cannot carry its own constructed-provenance header.** The plan also requires
  that file to equal unmodified `renderGreenBar` output byte for byte. The build ruling waives only
  the impossible metadata location; the target, renderer, print map, data and golden stay exact.
- **The Wave-1 draft bounds held.** The committed target retained 39 condensed records, entry
  `00808` and high-water `02833`.
- **Wave 2's third I/O choke-point check is self-activating.** Its producer, `generate.ts`, belongs
  to Wave 5, while Wave 2 permanently owns `test/rpg-emitio.test.ts`. The named `skipIf` is keyed
  only on that file's absence and becomes a required check as soon as the producer exists.
- **Re-cut 1: sparse `Knnn` labels contradicted the frozen monotonic allocator.** The target and
  fixture were mechanically renamed in constants-block order. The object records, entry,
  high-water and frozen page did not move.
- **Re-cut 2: sparse `Znnn` labels contradicted the frozen running counter and could collide.** The
  target and fixture were mechanically renamed by first allocator request. The same object/page
  proof remained exact.
- **The Wave-5 callback seam had to land in Wave 3.** The ownership table forbids Wave 5 from
  editing `cycle.ts`, but the original driver could not interleave deferred sections, share one
  label allocator or replace the demo-only `extract`. `driver(model, layout, emitters = {})` is the
  minimal in-order seam; the two-argument Wave-3 result remains unchanged.
- **The plan assigns Next Line mismatch to two diagnostic buckets.** Plan §11.5 names it among the
  five focused unit cases and again in the chosen malformed-deck list. Wave 4 preserves both
  literal obligations: one focused assertion and one entry in the twenty-case model table, with
  the same one-diagnostic precedence in each.
- **The initial cycle-probe source named `PAG`, not the mandated field `PAGENO`.** Before any probe
  golden or generator existed, Wave 4 corrected that one Data/Calculation referent to `PAGENO`.
  The probe remains an unfrozen source fixture; no target, object deck or page artifact moved.
- **The `SER`/`RCT` fallback required a Wave-4 ownership correction before Wave 5.** Wave 4 had
  accepted both tokens under the default `[likely]` reading, but the recovered sources establish
  neither storage nor increment/reset cadence. The existing §15 fallback is now selected in
  `model.ts`: both diagnose as unsupported until C28-1443 supplies those semantics.
- **The exact `generate(text: string)` API has no source filename.** The first boilerplate comment
  therefore names the deterministic source identity `RPG SPECIFICATION DECK`; the host UTC date,
  pass-2 core-size text and fixed 1410/1402/1403 configuration remain truthful. This is the narrow
  plan/API substitution ruled before Wave-5 code.
- **Re-cut 3: Data col-23 `N` is a source-operation zone strip.** The Wave-1 target had plain `MLC`
  for `QTY` and `AMT`, which preserved card zones and contradicted the frozen emission rule. Both
  instructions are now `ZA`; target, draft and model fixture moved together. Code shrank two
  positions, while 39 records, entry `00808`, `PLINE` `02700`, `PLGM` `02832`, high-water `02833`
  and the frozen sales page remained exact. This is the third and final re-cut inside §11.1's
  expected budget. Plan §10.4's pasted MLC/address listing remains the pre-re-cut arrival exhibit
  and is labelled historical; it was not regenerated to masquerade as the current target.
- **Wave 5 needed two further narrow prior-wave ownership corrections.** Generated arithmetic and
  numeric-sequence state need allocator-owned `Znnn` storage counted by `layoutOf`, and SCF EOF
  needs a route through validation before `LASTCD`; `cycle.ts`/`layout.ts` now publish those seams.
  `model.ts` allocates the cycle's generated `LC`/`OF`/`Fn` cells and rejects conditions on a line
  reached as another line's Next Line. The default Wave-3 driver remains unchanged, and no new
  symbol family or §15 ruling was added.
- **The sequence algorithm is constructed from the shared-form semantics, not recovered processor
  output.** It tracks per-control-group `1`/`N` multiplicity and optional `X`, validates group
  changes and EOF, and emits only the recovered `INPUT REC OUT OF SEQ`. `SEQCHK` reads the current
  card's `Cnnn` field directly because `CNn` is not populated until the later `EXTRCT` section.
- **The cycle-probe source was incomplete when checked against its prepublished map.** It lacked the
  independent `HB1`/`HB2` overflow heading chain required to produce form 2. The unfrozen source
  was corrected before the data deck and raw page golden were accepted; the reviewed map did not
  move.
- **The Wave-5 maps were reviewed and frozen in the working tree before either raw page golden was
  authored, but were not a separate commit.** Two intervening pre-Wave-5 correction commits kept
  the feature tree clean of unrelated map content. The maps and goldens therefore land together;
  the authorial-order proof is the review record rather than the literal §10.5 commit boundary.
- **Wave 6 adds the listing call to Wave-5-owned `generate.ts`.** The Wave-6 ownership row omits
  that file, but §4's frozen `RpgResult.listing` comment explicitly says Wave 6 fills the field by
  adding the call. The edit is additions-only and makes the published result truthful; leaving the
  permanently empty array would violate the API the plan froze.
- **The exact CLI flags provide no data-deck argument.** For `--page`, `tools/rpg.ts` derives the
  deterministic sibling `<name>.data.cards` path from `<name>.rpg`. No extra public flag or
  metadata parameter is invented; a missing sibling fails by the ordinary file-read path.
- **Every Autocoder source/data change must retire stale assembled artifacts.** The exact §3.2
  surface exposes typed `SourceBox.setText`, but changing either textarea while leaving an old
  listing, object deck and enabled PUNCH button visible would punch the wrong program. A narrow
  invalidation callback from `autocoder/mount.ts` extends the frozen two-argument
  `createSourceBox` call and clears those artifacts for direct typing, the sample button and RPG
  handoff alike. No DOM selector or `AutocoderSession` expansion was added.

## 3. Research corrections and [observed] observations

- **Wave 0, IBM 1401/shared X24 forms.** J24-0215-2 established the 1401 meaning of `F1`-`F6`,
  total-before-detail order, `[optional N][two-character indicator]` condition groups, numeric
  hierarchy versus alphabetic independence, independent alphabetic overflow headings, and the
  one-use/reusable edit-word forms. The shared form warrants the column shape, not an upgrade to
  verified 1410 runtime behaviour. The relative order of detail calculation and heading formation
  remained unverified.
- **Wave 0, recovered IBM 1410 PR-108 tape.** The generated-program skeleton verifies IOCS
  `DTF`/`OPEN`/`GET`/`PUT`/`CLOSE`, `SBR` linkage and one-character `LC`/`OF` state cells. This is
  direct evidence against describing this project's open-coded generator as recovered period
  source.
- **Wave 3, constructed character comparison.** The C/Z/D lowering is this project's Boolean
  composition of verified 1410 `BCE` and `BBE` primitives, exhaustively checked through the real
  assembler and Machine. It is not a recovered IBM RPG instruction sequence and adds no §15
  ruling.
- **Pre-Wave 5, recovered IBM 1410 PR-108 tape classification.** A bounded decode placed
  `SEQUENCE ERROR INPUT FILE` at byte 1,109,450 inside processor-phase material, not the generated
  skeleton. The generated runtime corpus is therefore `INPUT REC OUT OF SEQ` and
  `RECORD TYPE NOT FOUND`; the total recovered corpus remains sixteen (fourteen plus two).
- **Wave 5, generated sequence checking.** The state machine is our Boolean/control-flow
  construction over the shared X24 `SCFx`, numeric ordering, `1`/`N` and optional-`X` meanings.
  The evidence fixes those meanings and the recovered error text, not IBM's emitted instruction
  sequence or storage layout.
- **Wave 5, carriage straddle.** The cycle probe's final total moves from form line 59 to line 61
  across the channel-12 punch at line 60 and does not start a third form. That observes the existing
  Phase-2 `CARRIAGE_SENSES_AT_DESTINATION_ONLY` fallback; Phase 5 records the result and does not
  patch the carriage model.

## 4. Open items carried out of Phase 5

- **Phase 4:** the RPG view is deliberately unstyled and presents one specification textarea plus
  the per-sheet ruler. The ruler is the parser-backed specification for the later drawn forms; no
  CSS or separate on-screen Input/Data/Calculation/Format sheets were added here.
- **Phase 6:** the reentry showcase inherits this host-side generator, its seventeen-stage logic
  cycle and the 1410 MCE edit-word path. A trajectory table has no control breaks, so it must prove
  the same generator can omit that machinery rather than carrying sales-report structure forward.
