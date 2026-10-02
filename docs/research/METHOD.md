# How the research package was produced

Written 2026-08-29 so later sessions know what to trust and how to re-verify.

## Pipeline

Claude Code `Workflow` run `wf_4b180f0c-fce` (script persisted under the session's `workflows/scripts/`; transcripts under `subagents/workflows/wf_4b180f0c-fce/`, one `agent-<id>.jsonl` per agent, `journal.jsonl` records each agent's return value).

1. **Find** — 8 topic finders with web access, told to prefer primary sources on bitsavers (IBM 1410 Principles of Operation, Autocoder manuals, 1402/1403/1415 component descriptions), to download PDFs and read pages directly, and to tag every claim `verified` / `likely` / `unverified` with a source URL. Topics: `arch`, `opcodes`, `io`, `software`, `emulators`, `charset`, `avco`, `console`.
2. **Verify** — one adversarial fact-checker per topic, prompted to refute, specifically hunting 1401-vs-1410 confusion. Output: refuted claims with corrections, upgraded claims, missed facts.
3. **Gaps** — a completeness critic reads all verified findings and lists ≤8 blocking gaps + contradictions; each gap gets its own finder + verifier.
4. **Synthesize** — one agent applies refutations and writes `README.md`, `architecture.md`, `opcodes.md`, `io.md`, `charset.md`, `software.md`, `emulators.md`, `avco-and-reentry.md`, `console-and-physical.md`, `open-questions.md`.

## Models and run history

- Run 1 (`wf_4b180f0c-fce`, Fable subagents, 2026-08-29 15:19–15:44 EDT): 7 of 8 topics finished find+verify. `find:opcodes` (195 MB transcript — it read PoO pages as images), the gap critic, and the synthesizer died on a session-limit error. Nothing was written to `docs/research/` by this run.
- The 14 completed results were extracted from the run's `journal.jsonl` straight to `raw/find-<topic>.json` and `raw/verify-<topic>.json` (no LLM in the loop; byte-faithful). `raw/compact-<topic>.json` is the same minus table bodies, for the critic.
- A `resumeFromRunId` attempt with Opus pinned on the remaining agents missed the cache on all 14 (the cache key is not just prompt+opts) and started re-spawning the finders on Fable; it was killed within a minute.
- Run 2 (fresh workflow, every agent `model: 'opus'`): opcode table as two parts (A: data/arithmetic/edit; B: branch/I/O/console/priority) with `pdftotext` instead of page images, each adversarially verified; critic reads the 7 compact files + inline opcode data; ≤8 gaps researched + verified; one Opus writer per research file reading the raw JSON; one index agent writes `README.md` + `open-questions.md`. New agents also save their own JSON to `raw/`.

Only the orchestrator (main loop) ran on Fable after the policy change.

## Consistency pass (2026-08-29, run `wf_0756361c-3c0`, all Opus, 28 agents, ~13 min)

The gap critic had listed 12 cross-file contradictions in `open-questions.md`. A second workflow ruled on each from primary sources (one judge per contradiction; 11 verified, 1 likely — the plus-zero H-chain glyph), then a single editor per file applied the rulings, then a verifier grepped for residue (21 found, mostly the same claim repeated in a table, a summary and a body paragraph) and a second apply pass fixed them. Rulings and their evidence are recorded in `open-questions.md` under the contradictions section.

Lesson recorded: the second pass also edited `raw/find-io.json` and `raw/compact-io.json`. Those were restored from the original journal; `raw/README.md` now states the do-not-edit rule. Future fix passes must exclude `raw/`.

## Trust

- `[verified]` = the agent read it in a primary source (manual form number + page, or emulator source code). Treat as spec.
- `[likely]` = secondary sources agree. Fine for design; confirm before encoding as CPU behavior.
- `[observed]` = established by running this emulator, not read in a primary source; a primary-source read outranks it. Our own output is evidence about our own code first and about the 1410 only second, so it can confirm nothing it was derived from. Ranks below `[likely]`.
- `[unverified]` = memory or a single weak source. Do not encode without checking. Listed in `open-questions.md`.
- Refuted claims are not carried forward except in `open-questions.md` with the correction.

## Re-verifying

Open the cited manual on bitsavers (`/pdf/ibm/1410/`), read the page. For instruction semantics, SimH's 1410 simulator source is the second oracle. When a fact changes, edit the research file, keep the confidence tag honest, and note the change in `open-questions.md`.
