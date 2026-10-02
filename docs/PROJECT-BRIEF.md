# Project brief — IBM 1410 emulator

Source: Tom's request 2026-08-29, rewritten via `/optimize`. This is the spec.

## Context

A family member was early in the computer industry. At AVCO (reentry vehicle work) they analyzed reentry-trajectory results produced on an IBM 1410 — someone else wrote the programs, they interpreted the output. The business RPG world of the period (RPG for business applications) is in scope too. The project recreates the full workflow that analyst lived: write a program → punch it onto cards → load the deck → run it → read the results.

## Deliverable

A browser-based IBM 1410 emulator in TypeScript with an attractive web interface, covering the end-to-end flow:

1. Editor for source programs (start with 1410 Autocoder; FORTRAN and/or RPG as later phases).
2. Assembler producing an object deck.
3. Visual 80-column punched cards (Hollerith encoding, holes rendered, rows 12/11/0–9, interpretation line across the top). Cards individually inspectable.
4. Card reader (1402) loading the deck into emulated core.
5. Emulated 1410 CPU with a console/front-panel view (registers, storage display, run/stop/single-step, word marks visible).
6. Output on a 1403 line printer (green-bar paper, tear-off listing) and optionally the 1415 console typewriter.
7. Showcase program: a simple ballistic reentry trajectory integration (drag, deceleration, altitude vs. time) whose printout resembles what a period analyst would have read.

## Phases

- Phase 1: CPU core + memory + instruction tests (+ the internals page, DECISIONS 2026-08-30). Phase 1b: the arithmetic/edit tail (`@ % T Z E`).
- Phase 2: Card model + Hollerith encoding + 1402 reader + 1403 printer + condensed loader.
- Phase 3: Autocoder assembler → object deck.
- Phase 5: RPG (spec sheets → Autocoder, on the host) — builds before Phase 4; candidate first showcase.
- Phase 4: Period web UI: editor, card punch/deck viewer, console/front panel, printer.
- Phase 6: Reentry trajectory showcase program + walkthrough. FORTRAN/tape/disk: out (architecture §12).

(Build order revised by Tom 2026-08-30: 3 → 5 → 4 → 6. Phase numbers stay as stable names; see docs/plans/architecture.md §7 and docs/DECISIONS.md.)

Approval before each phase.

## Constraints

- TypeScript, strict mode. Vite + minimal dependencies; no heavy framework unless justified.
- Core is a DOM-free library; UI consumes it. Core unit-tested.
- Simplicity first. Surgical, readable code — this is a project to be read together.
- State assumptions explicitly. Flag any 1410 behavior that could not be verified rather than guessing.
- Verify before claiming done: tests pass, typecheck clean, dev server serves the UI.

## Step 0 questions — answered 2026-08-30

| # | Question | Answer |
|---|---|---|
| 1 | Source language priority: Autocoder only for v1, or FORTRAN/RPG in scope from the start? | **RPG from the start** (2026-08-30). Pipeline is RPG spec sheets → Autocoder source → object deck; Autocoder is the substrate, RPG a first-class front end. FORTRAN out. |
| 2 | Fidelity: functional emulation vs. cycle/timing-accurate? Want the 1401 compatibility mode? | **Functional but inspectable** — instruction-accurate with a cycle counter; an internals view (registers, core, word marks) the real machine never showed. No 1401 compat mode. |
| 3 | Peripheral scope: 1402 + 1403 + 1415 minimum. Tape (729) or disk (1301/1311) needed? | **KISS** — 1415 console + 1402 reader/punch + 1403 Model 2, one channel. No tape, no disk. |
| 4 | UI direction: period-accurate console aesthetic vs. clean modern dashboard with period-accurate artifacts? | **Period accurate** — Selectric console log, MODE rotary and keys, punched cards, green-bar 1403 output. The inspectable internals view is a deliberate anachronism, kept visually separate. |
| 5 | Does the family member have surviving listings, decks, manuals, or memories of specific programs/outputs to reproduce? | **No.** Their recollection is the only source; the demos are reconstructions. |
| 6 | Should the RPG business work become a second showcase program? | **Maybe the first showcase** ("oddly"). An RPG business report may ship before the reentry trajectory program. |
| 7 | Runtime target: fully static site, run locally? Repo on Gitea? | **Run local; repo on Gitea** (vaultwest). Static Vite site. |
