// oracle/simh-deviations.ts — the SimH `i7010` deviation ledger.
//
// The tier-5 differential RUNNER is deferred out of Phase 1 (plan §6.3); this data file
// is what ships. It exists so that a future diff against SimH can never be resolved in
// the wrong direction — every entry is a place where SimH's 7010 and the documented 1410
// disagree, with the ruling and the citation that settles it. When the runner arrives
// (plan §6.3 records the recipe: `set cpu 7010 80k nofloat nopri noprot`, inject with
// generated `d <addr> <val>` lines, never `boot`, compare halt addresses and memory
// dumps rather than console text), a mismatch listed here is EXPECTED, not a bug in us.

export interface SimhDeviation {
  readonly id: string;
  readonly what: string;
  readonly ruling: string;
  readonly cite: string;
}

export const SIMH_DEVIATIONS: readonly SimhDeviation[] = [
  {
    id: 'glyph-6',
    what: '6 of the 64 BCD code points render differently in SimH than in the 1410 sources: the radical (tape mark), record mark, word separator, segment mark, delta and group mark.',
    ruling: 'Display only — the code points are identical, the glyphs are not. Compare memory dumps and halt addresses, never rendered console text.',
    cite: 'emulators.md §6; plan/architecture.md §8 tier 5',
  },
  {
    id: 'move-first-wm',
    what: 'SimH forces a word mark onto the first character of a MOVE-mode input record.',
    ruling: 'Follow the manual: move-mode input adds no word marks at all. 223-2692 p.58 and Figure 5 both say so.',
    cite: 'io.md §3; plan §10',
  },
  {
    id: 'dt-lengths',
    what: "SimH's 7010 accepts ops D and T at lengths 2, 7 and 11 as well as 1, 6 and 12.",
    ruling: 'Enforce the 223-2589 p.53 table on every fetch: D and T are 1, 6, 12 ONLY. Treat 2/7/11 as 7010 latitude, not 1410 behaviour.',
    cite: 'opcodes.md §3.3, §1.1',
  },
  {
    id: 'rx-chainable',
    what: 'SimH marks R and X as address-double/chainable (O_DBL), which lets a 1-character chained R/X execute.',
    ruling: 'R and X are length 7 ONLY. They ARE in the address-double set, but they have no 1-character form: three independent sources agree (A22-0526-3 p.96, A22-0530-1 Figure 1 p.4, 223-2589 p.53). A chained R/X executes an instruction the real 1411 rejects on the length check.',
    cite: 'opcodes.md §1.1, §1.4',
  },
  {
    id: 'chan-norec',
    what: 'SimH never applies the A22-0526-3 p.92 overlap downgrade for end-of-core transfers.',
    ruling: "Read the manual's actual wording, which is the opposite of the obvious paraphrase: if $/X are written for overlap, the processing overlap IS performed but the end-of-core instruction is automatically changed to a normal read or write, so the end-of-core result is not obtained.",
    cite: 'io.md §4; opcodes.md §6.5 overlap rules',
  },
  {
    id: '7010-channels',
    what: 'SimH decodes `?`, `!`, `$` and `=` as x1 channel selectors (channels 3 and 4) and a `K` x2 device (communications).',
    ruling: 'Those are 7010 extensions, not 1410 features. The 1410 x1 set is exactly `%` (ch1), `@` (ch1 overlap), lozenge (ch2), `*` (ch2 overlap); anything else is an Instruction Check.',
    cite: 'io.md §2; opcodes.md §6.5',
  },
  {
    id: 'edit-op-e',
    what: "SimH's OP_E has three deviations: it decides the single-scan case by reading a byte at the already-decremented BAR (outside the control word) and testing it for `0`; the scan-2→3 skid storage reference is absent entirely; and C short-circuit evaluation means the scan-1→2 skid read happens only when the zero-suppress latch is off — precisely the case in which scan 2 does not run.",
    ruling: 'Condition the single-scan case on the zero-suppress LATCH only, with no storage read (S223-2698 p.50, and cube1us agrees). Perform both skid cycles as real read-and-rewrite storage references, preserving any word mark they find. Items 2 and 3 are storage-reference and cycle-count deviations only; final register state is unaffected.',
    cite: 'opcodes.md §7.6, §7.5',
  },
];
