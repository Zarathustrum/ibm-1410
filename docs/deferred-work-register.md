# Deferred Work Register

> Tracks features and changes deliberately deferred from a shipping milestone, with named **trigger conditions** that say *when* each one is ready to revisit.
>
> Run `npm run check:deferred` (or `bash scripts/check-deferred.sh`) to evaluate auto-trigger conditions and surface tripped entries. Manual-trigger entries print a "review me" line so they don't fade from view.

## How to add an entry

Use `/tripwire add` (preferred) or follow the schema by hand. Status legend:
- **WATCHING** — auto-trigger configured; not yet tripped.
- **TRIPPED** — auto-trigger fired (set by checker output; commit when noticed).
- **MANUAL** — no machine check possible; surface in periodic review.
- **RESOLVED** — work shipped. Kept as audit trail; checker skips.

The checker treats the first ```bash``` code block inside an entry as the trigger.

---

## Register

### DEFERRED-01: `HALT_TYPES_NO_PRINTOUT` contradicted by S223-2648 p.6

- **Status:** RESOLVED
- **Tripped:** 2026-09-04 — by `docs/plans/phase-6-reentry.md` (and its panel dossier) arriving on `feature/phase-6-reentry`; discharge scheduled as Phase 6 wave 0 (plan §9), the first build commit after Tom's go
- **Source:** `docs/research/open-questions.md` Phase 4 section (§11.1 primary read, wave 0); `src/core/machine.ts:65`
- **Target:** before Phase 6 (the reentry showcase)
- **Added:** 2026-09-02
- **Resolved:** 2026-09-04 — Phase 6 wave 0, on `feature/phase-6-reentry` (`git log -S PROGRAM_STOP_TYPES_S`)

Phase 4's bounded primary read (§11.1 target e, RECORD ONLY) found S223-2648 p.6: "a program stop
… will initiate a stop print-out." `src/core/machine.ts:65` declared `HALT_TYPES_NO_PRINTOUT = true`
— a programmed halt typed nothing. The two disagreed, and the manual is the primary source.

**The cost claim above was wrong, and the correction is recorded here rather than deleted.** This
entry said flipping the constant "would put eleven of them inside the `cc01.cor` demo log and move
`npm run cc01`'s byte-identical gate." Measured on 2026-09-03 at `53b46d4`:

    node build/tools/run-cor.js oracles/cc01.cor --iar 02000 --trace 1 | grep -c "OP \. "   ->  0

The trace holds **1241 level-1 instruction lines and not one op `.`**; the executed-op histogram is
J 325, D 153, `,` 138, W 133, S 131, ⌑ 115, V 75, C 47, B 36, G 33, ? 24, / 10, A 7, N 5, R 4, ! 3,
M 2, summing to 1241. It is also provable without the trace: `tools/run-cor.ts` breaks on the first
defined `StopReason`, and PASS requires that stop to be `instructionCheck` at 00322, so no `halt` can
precede it. The eleven was a static count of `.` sites in the core image — CC01A's error-halt sites,
reachable only on a failed check. **The change moved zero bytes of the cc01 transcript.**

Resolved by renaming the constant `PROGRAM_STOP_TYPES_S = true`, `[verified]` against S223-2648 p.6,
with a halt under MODE = I/E CYCLE typing the `C` line alone and the interlock and the two
emulator-side stops staying silent as one category ruling. See `docs/plans/phase-6-reentry.md` §9 and
`docs/BUILD-LOG-6.md` wave 0.

**Trigger (auto):** a Phase 6 plan document appears under `docs/plans/`.

```bash
ls docs/plans/phase-6-*.md >/dev/null 2>&1
```

### DEFERRED-02: `DISPLAY_WRAPS_ABOVE_10K` armed by the 20K desk

- **Status:** RESOLVED
- **Tripped:** 2026-09-04 — Phase 6 wave 4 moved the desk (`src/ui/main.ts`) from 10,000 to 20,000 positions, which made a DISPLAY near 19,999 reachable; drafted in `PHASE-6-NOTES.md` §4 item 9 and registered at the merge
- **Source:** `src/core/machine.ts` (`DISPLAY_WRAPS_ABOVE_10K`), `docs/research/open-questions.md` console-and-physical row, `docs/BUILD-LOG-6.md` wave 4
- **Target:** before any UI or test displays core above 10,000 on the 20K desk
- **Added:** 2026-10-02
- **Resolved:** 2026-10-02 — `f5dd292`, on `feature/phase-6-reentry` before the merge

`display()` stopped at the top of installed storage on every machine size — the 10K rule.
A22-0526-3 p.51 §4: on a 20K-80K machine display continues from 00000 after the last location
unless it carried a word mark, and alter wraps with it. The draft offered two discharges, ~15 lines
plus two cases or a dated accepted-divergence ruling; **Tom chose the implementation** (2026-10-02).
`DISPLAY_WRAPS_ABOVE_10K = true`, `[verified]`; six cases in `test/machine-console.test.ts`; 10K
byte-for-byte unchanged.

**Trigger (auto), as drafted** — it can no longer fire, because the constant is no longer `false`:

```bash
grep -q 'size: 20_000' src/ui/main.ts && grep -q 'DISPLAY_WRAPS_ABOVE_10K = false' src/core/machine.ts
```

### DEFERRED-03: `period-refusal-grep` blind to `line(CONST)` captions

- **Status:** WATCHING
- **Source:** `test/period-refusal-grep.test.ts:71-90` (`drawnLabels`), `docs/BUILD-LOG-6.md` wave 5, `PHASE-6-NOTES.md` §4 item 10
- **Target:** the next phase that edits drawn prose under `src/ui/period/`
- **Added:** 2026-10-02

Phase 4's standing gate on drawn labels matches `text(…)`, `.textContent` / `.title`,
`setAttribute('aria-label'|'title')` and `const|let|var NAME = [ … ]|{ … }` table initializers. A
`line(CONST)` caption whose constant is a plain string is matched by none of them. Measured at
wave 5: 37 `line(…)` call sites across 9 files, every string constant swept by hand, **none carries
a refused token** — so the blind spot has never been exploited, but the gate is green on prose it
never read. Discharge is ~10 lines: teach `drawnLabels` the `line(IDENT)` shape and resolve the
identifier against the file's own `const NAME = '…'` declarations.

**Trigger (auto)** — fires when a refused token reaches a top-level string constant under
`src/ui/period`. *Corrected at registration:* the draft in `PHASE-6-NOTES.md` §4 item 10 began with
`! `, which inverts it under `scripts/check-deferred.sh` (exit 0 = TRIPPED) and would have tripped on
a clean tree; the `!` is dropped here.

```bash
grep -rlE "^(export )?const [A-Z_]+ = ('|\`)[^'\`]*(LOAD|MEMORY|CPU| sec|SPEED)" --include='*.ts' src/ui/period >/dev/null
```

### DEFERRED-04: the trajectory page's column layout is undocumented

- **Status:** MANUAL
- **Source:** `docs/research/avco-and-reentry.md` §9, `docs/plans/phase-6-reentry.md` §15 row 1, `demos/reentry.asm` card `10830`, `PHASE-6-NOTES.md` §4 item 11
- **Target:** if a period 1410 or 704/7090 trajectory listing surfaces
- **Added:** 2026-10-02

No Avco trajectory listing has surfaced, so the twelve columns on 132 positions are
period-plausible and the layout is the project's. The set of quantities is constrained by the
physics; only the arrangement is ours. Discharge, if a listing turns up: one commit — re-cut
`test/golden/reentry.page.txt` and the position table in `test/reentry-page-parse.test.ts`,
regenerate `test/golden/reentry-summary.page.txt` if the punched contract moves with it, and change
nothing arithmetic. Review at each pass over the register.

**Trigger (manual):** no machine can check for a document that has not been found.
