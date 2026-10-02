# IBM 1410 emulator — project instructions

Global rules in `~/.claude/CLAUDE.md` apply. This file carries project-specific context for any LLM session.

## What this is

A family project. A family member worked at AVCO in the early computer era analyzing reentry-trajectory output from an IBM 1410 (someone else programmed it; the analyst interpreted results). The business RPG world of the period is in scope too. We are building a browser IBM 1410 emulator in TypeScript that recreates the whole period workflow: write program → punch cards → load deck (1402) → run (1411 CPU + 1415 console) → read results (1403 printer). Showcase program: a ballistic reentry trajectory whose printout resembles what a period analyst read.

## Read these first

- `docs/PROJECT-BRIEF.md` — the spec (optimized prompt), open questions and their answers.
- `docs/DECISIONS.md` — settled choices. Don't re-litigate without new info.
- `docs/STATUS.md` — forward-looking state: what's done, what's next. Update before ending a session.
- `docs/research/` — verified IBM 1410 facts. `opcodes.md` is the spec the CPU is written from. `open-questions.md` lists what's still unverified. `METHOD.md` explains how the research was produced and how to re-verify.

## Model policy (Tom, 2026-08-29)

- The main-session orchestrator runs on Fable. A **build orchestrator** for a phase may also be a Fable subagent (Tom, 2026-08-30: "assign the orchestration of the build to a new fable subagent … you report and review"). Those are the only Fable seats.
- **Every worker agent runs on Opus or lower.** Workflow `agent()` calls must pass `model: 'opus'` (or `'sonnet'` for mechanical work: boilerplate, fixtures, test scaffolding). Same for the Agent tool.
- Heavy implementation goes to Opus subagents; the main loop plans, gates phases, integrates, reviews.
- **If the operator starts orchestration on Opus instead of Fable, ask whether that is intentional before doing phase work.** If it is, substitute Opus for Fable everywhere this file names a Fable seat — the main-session orchestrator and the phase build orchestrator both — and say so once. Worker seats are unaffected: they stay Opus or lower.

## Engineering rules

- Emulator core is a pure TypeScript library with no DOM dependency; the UI consumes it. Core is unit-tested (instruction semantics, word marks, address arithmetic, card encode/decode round-trip).
- Phases are gated: CPU core (1, 1b) → cards/reader/printer/loader (2) → Autocoder assembler (3) → RPG (5) → period web UI (4) → reentry showcase (6). Build order 3 → 5 → 4 → 6 settled by Tom 2026-08-30; phase numbers are stable names, not the sequence. FORTRAN/tape/disk are out. Get approval before starting a phase.
- 1401 ≠ 1410. When adding a hardware fact, say which machine it applies to and cite the manual form number + page. Confidence tags: [verified] read in a primary source, [likely] consistent secondaries, [unverified] memory/single weak source.
- Simplicity first; surgical edits; match local style.
- Git: Gitea is source of truth; commit format per global rules.
