// oracle/cc01a-halts.ts — the CC01A halt-address → routine table, grown one entry at a time.
//
// Empty at the end of Wave 0, and that was the design (plan §6.4): the 38-page CC01A listing has
// no OCR text layer and no machine-readable halt-address → routine table exists anywhere
// (emulators.md §10). Transcribing it speculatively is the wrong trade for a two-person project;
// transcribing what a real halt needs, when a real halt lands there, is a few minutes.
//
// Tier 4 (`cc01.cor` end to end) is a SMOKE TEST, not a gate: the diagnostic has never been
// observed to run under any simulator, so the first clean pass establishes a baseline rather
// than confirming one (plan §5, §7).
//
// `routine` is the FLOW-CHART step (emulators.md §4.1 p.006, `[verified]`), not the listing's
// `ROUTINE nn.mm` heading — the PDF has no text layer and those headings are only readable by
// eye off a scan. Each entry says what the code around the address is doing, read out of the core
// image itself, and what ruling let the run continue.
export const CC01A_HALTS: ReadonlyArray<{ addr: number; routine: string; note: string }> = [
  {
    addr: 3436,
    routine: 'flow-chart step "clear storage"',
    note:
      '`/ 00000` (6-char Clear Storage, B = 00000 untagged), reached from the `V 03436 09175 K` '
      + 'at 03423 which branches over the `.` halt at 03435. It clears exactly position 00000 — '
      + 'B is already on its hundreds boundary — and the routine then READS THE REGISTERS BACK: '
      + '`G 09185 B` at 03442 and `G 09181 A` at 03449 store BAR and AAR into two deliberately '
      + 'overlapping fields, so 09177-09181 holds all five digits of AAR and 09182-09185 (word '
      + 'mark at 09182) holds only the LOW FOUR digits of BAR. `A 09570 09181` adds the `+0` at '
      + '09570 and `S 09253 09185` subtracts the `+99999` at 09249-09253, each followed by a '
      + '`J … V` (BZ, zero balance); the run continues only if AAR reads back 00000 and the low '
      + 'four digits of BAR read back 9999, otherwise it falls into the halts at 03474 / 03499. '
      + 'RULING: `/` at the 000 block is not an address check and BAR takes the five-digit '
      + 'register wrap 00000−1 = 99999 (`CLEAR_STORAGE_BAR_AT_00000` in src/core/storage.ts; '
      + 'open-questions.md `## architecture.md`, `[unverified]`). Wave 6 stopped here with '
      + '`addressCheck`; with the ruling the run reaches 00322, 1106 instructions further on.',
  },
  {
    addr: 322,
    routine: 'flow-chart step "read in tape control" — the terminus of a from-02000 run',
    note:
      'NOT a CC01A error stop and not an emulator fault: `instructionCheck` on blank storage, '
      + 'after both type-outs. CC01A ends by relocating its tape read-in to low core — '
      + '`D 08967 00333 Δ` (MRCWG, left to right to the group-mark-with-word-mark at 08987) '
      + 'copies 08967-08987 to 00333-00353, `D 00332 00339 3` plants the one op character held '
      + 'at 00332 over the copied `R` at 00339, and `J 00322` at 08959 branches into the result. '
      + 'The copy is self-locating: its own `R 00322 2` operand lands at 00333-00338 (op char at '
      + '00332) and its `R 00346 ⧧` at 00339 points at the copied `J 01972` that lands exactly '
      + 'at 00346 — so 00322-00331 is a TEN-CHARACTER hole for the tape read `M`, which the CE '
      + 'keys per channel (CC01A p.004 gives 1410 forms for channels E and F) or the tape load '
      + 'supplies. `cc01.cor` entered at 02000 never fills it: the image holds no tape '
      + 'instruction at all, only five writes to `%T0` (emulators.md §4.3). '
      + 'CONSEQUENCE for the tier-4 PASS rule: `J 01972` at 08980 is NOT on the executed path. '
      + 'It is reached only as the relocated copy at 00346, and only after the missing read at '
      + '00322 runs. emulators.md §4.4 read 08980 off the static image; the trace disproves it.',
  },
];
