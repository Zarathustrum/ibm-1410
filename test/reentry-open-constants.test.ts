// The `// OPEN:` set difference, mechanically, in BOTH directions — plan §13 criterion 20, §16
// item 3, §12.1's T2 row, wave 7. Phase 4's §16 item 3 CLAIMED this sweep and never wrote it
// (`test/period-refusal-grep.test.ts` is a drawn-label grep over string literals); this file is it.
//
// WHAT IT DOES NOT DO: it does not judge whether a row in `PHASE-6-NOTES.md` §1 says the right
// thing. That is the whole-branch review's job and criterion 20 says so. This asserts only that the
// SET of constants named in §1 equals the SET grepped out of the four source domains.
//
// THE FOUR DOMAINS are §16 item 3's, and the narrowing is deliberate: a grep over all of `src/`
// would sweep in every Phase 1-5 constant and make the difference meaningless.
//
// TWO TRAPS, both handled here rather than in the notes:
//
//  1. `demos/reentry.asm` cannot spell a constant name in its documented form. `_` is not one of
//     the 64 machine glyphs and the assembler flags it EVEN ON A COMMENT CARD
//     (`src/asm/source.ts:139`), so the deck's four cards read `*  OPEN- NAME-WITH-HYPHENS` from
//     column 6 (cards 04901, 04906, 10830, 10840, with the constraint stated beside them).
//     `NAME_RE` therefore accepts `-` as a separator and `normalise()` folds it to `_`. Without
//     that the deck drops out of the domain set silently.
//
//  2. Two `// OPEN:` comments in `src/core/machine.ts` are PROSE, not constants — `:112`
//     "OPEN: DISPLAY and ALTER wraparound above 10K is not modelled" and `:125` "OPEN: WHICH word
//     mark stops a DISPLAY". A bare /OPEN:\s*([A-Z0-9_]+)/ harvests the "names" DISPLAY and WHICH.
//     They are excluded by a SHAPE RULE — a name must contain at least one `_` or `-` separator —
//     and NOT by a two-entry exclusion list. The shape rule is the better instrument for three
//     reasons: every constant in this project is SCREAMING_SNAKE, so the rule is a property of the
//     namespace rather than a fact about two lines; it needs no maintenance when someone writes a
//     third prose `OPEN:`; and an exclusion list is a hole a real single-word constant could be
//     pushed through. The cost is stated plainly: a genuine one-word `OPEN:` constant would be
//     invisible to this sweep. None exists in any domain, and one would be a naming defect anyway.
//
//     Consequence worth knowing: `DISPLAY_WRAPS_ABOVE_10K` (`:122`) and
//     `DISPLAY_STOPS_BEFORE_NEXT_WORD_MARK` (`:137`) are declared under those two prose blocks and
//     carry their own trailing `// OPEN: open-questions.md …` markers, which name a DOCUMENT and
//     not a constant, so the sweep yields no name for them either. That is correct — they are
//     Phase 1's rulings, not Phase 6's — and `DISPLAY_WRAPS_ABOVE_10K` is carried as an open item
//     in `PHASE-6-NOTES.md` §4 instead, because the 20K desk arms it.
//
//     2026-10-02: the wrap is built, `DISPLAY_WRAPS_ABOVE_10K` is `true` and `[verified]`, and the
//     `:112` prose `OPEN:` and the constant's trailing marker are gone. The swept set is unchanged —
//     neither ever yielded a name — so only the prose-site assertion below changed.
//
// INHERITED CONSTANTS: eleven of the twenty-nine names live in files this phase edits but belong
// to Phases 1, 2 and 4. There is NO allowlist here. §1 carries a row for each, marked inherited —
// an allowlist would be a hole a real Phase 6 constant could fall through, and would need
// maintaining by hand for ever. See `PHASE-6-NOTES.md` §1's header for the reasoning.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/** §16 item 3 domain 1 — the `src/` files this phase edits, and ONLY those. */
const SRC_DOMAIN = [
  'src/core/machine.ts',
  'src/ui/main.ts',
  'src/ui/period/coding/sheetView.ts',
  'src/ui/period/console/rotaryView.ts',
  'src/ui/period/console/session.ts',
  'src/ui/period/reader/deckBoxView.ts',
  'src/ui/period/reader/hopperView.ts',
  'src/ui/period/reader/keysView.ts',
  'src/ui/period/reader/stackerView.ts',
  'src/ui/period/specs/sheetView.ts',
];

/** Domains 2, 3 and 4. Both `demos/probe-antilog.asm` and the RPG deck carry no name; that is a
 *  fact about them and they stay in the list so the domain set matches §16 item 3 exactly. */
const OTHER_DOMAINS = [
  'demos/reentry.asm',
  'demos/probe-antilog.asm',
  'demos/reentry-summary.rpg',
  'test/fixtures/reentry-reference.ts',
];

const DOMAINS = [...SRC_DOMAIN, ...OTHER_DOMAINS];

// `OPEN:` in TypeScript, `OPEN-` on an Autocoder comment card. An optional backtick because several
// blocks write the name as `` `NAME` ``. The name itself must carry a separator — trap 2.
const NAME_RE = /OPEN[:-]\s*`?([A-Z][A-Z0-9]*(?:[_-][A-Z0-9]+)+)/g;

const normalise = (name: string): string => name.replace(/-/g, '_');

function sweep(files: readonly string[]): Set<string> {
  const found = new Set<string>();
  for (const file of files) {
    for (const m of readFileSync(file, 'utf8').matchAll(NAME_RE)) found.add(normalise(m[1]!));
  }
  return found;
}

/** The first cell of every table row in `PHASE-6-NOTES.md` §1, which is where the names live.
 *  Reading only the first cell is what keeps a constant NAMED IN PROSE in another column from
 *  counting as a row — the difference has to be about rows, not about mentions. */
function notesSectionOne(): Set<string> {
  const text = readFileSync('PHASE-6-NOTES.md', 'utf8');
  const start = text.indexOf('\n## 1. ');
  const end = text.indexOf('\n## 2. ');
  expect(start, 'PHASE-6-NOTES.md must carry a `## 1.` section').toBeGreaterThan(-1);
  expect(end, 'PHASE-6-NOTES.md must carry a `## 2.` section after it').toBeGreaterThan(start);

  const names = new Set<string>();
  for (const line of text.slice(start, end).split('\n')) {
    if (!line.startsWith('|')) continue;
    const firstCell = line.split('|')[1] ?? '';
    const m = /^\s*`([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)`\s*$/.exec(firstCell);
    if (m) names.add(m[1]!);
  }
  return names;
}

const sorted = (s: Set<string>): string[] => [...s].sort();

describe('the // OPEN: set difference — criterion 20, both directions', () => {
  it('every constant grepped out of the four source domains has a row in PHASE-6-NOTES.md §1', () => {
    const inTree = sweep(DOMAINS);
    const inNotes = notesSectionOne();
    const missing = sorted(inTree).filter((n) => !inNotes.has(n));
    expect(missing, `in the tree, no §1 row: ${missing.join(', ')}`).toEqual([]);
  });

  it('every row in PHASE-6-NOTES.md §1 names a constant that is in one of the four domains', () => {
    const inTree = sweep(DOMAINS);
    const inNotes = notesSectionOne();
    const orphans = sorted(inNotes).filter((n) => !inTree.has(n));
    expect(orphans, `a §1 row for a constant in no domain: ${orphans.join(', ')}`).toEqual([]);
  });

  it('the two sets are equal — the assertion the phase closes on', () => {
    expect(sorted(notesSectionOne())).toEqual(sorted(sweep(DOMAINS)));
  });
});

describe('the sweep itself, so a green difference is not green for the wrong reason', () => {
  it('rejects the two prose OPEN: comments in machine.ts by shape, not by exception', () => {
    const machine = readFileSync('src/core/machine.ts', 'utf8');
    // The wraparound prose site was retired when the wrap was built (2026-10-02); the other
    // prose site is still present...
    expect(machine).not.toContain('OPEN: DISPLAY and ALTER wraparound above 10K is not modelled');
    expect(machine).toContain('OPEN: WHICH word mark stops a DISPLAY');
    // ...and neither yields a name.
    const names = sweep(['src/core/machine.ts']);
    expect(names.has('DISPLAY')).toBe(false);
    expect(names.has('WHICH')).toBe(false);
    expect(sorted(names)).toEqual([
      'CONSOLE_INQUIRY_LATCH_IS_THE_BNQ_LATCH',
      'EMULATOR_STOPS_ARE_NOT_MACHINE_STOPS',
      'IE_CYCLE_HALT_TYPES_C_ALONE',
      'INTERLOCK_STOP_STAYS_SILENT',
    ]);
  });

  it('normalises the Autocoder deck\'s hyphens, which is the only spelling that assembles', () => {
    const deck = readFileSync('demos/reentry.asm', 'utf8');
    expect(deck).not.toContain('OPEN_');
    expect(deck).toContain('OPEN- PUNCH-CARD-FORMAT-IS-OURS');
    expect(sorted(sweep(['demos/reentry.asm']))).toEqual([
      'COLUMN_LAYOUT_IS_PERIOD_PLAUSIBLE_NOT_DOCUMENTED',
      'MCE_LEADING_SIGN_COLUMN_TAKES_AN_EXACT_LENGTH_A_FIELD',
      'PUNCH_CARD_FORMAT_IS_OURS',
      'THE_PUNCH_AREA_NEEDS_ITS_OWN_GM_WM',
    ]);
  });

  it('finds this phase\'s three new src/ constants and the fixture\'s ten', () => {
    const src = sweep(['src/core/machine.ts']);
    for (const n of ['IE_CYCLE_HALT_TYPES_C_ALONE', 'INTERLOCK_STOP_STAYS_SILENT', 'EMULATOR_STOPS_ARE_NOT_MACHINE_STOPS']) {
      expect(src.has(n)).toBe(true);
    }
    expect(sweep(['test/fixtures/reentry-reference.ts']).size).toBe(10);
    // The ruling that arrived after §15 froze, and therefore has a §1 row and no §15 row.
    expect(sweep(['test/fixtures/reentry-reference.ts']).has('HALF_ADJUST_IS_ON_THE_MAGNITUDE')).toBe(true);
  });

  it('reads all four domains, including the two that carry no name', () => {
    expect(DOMAINS.length).toBe(14);
    expect(sweep(['demos/probe-antilog.asm']).size).toBe(0);
    expect(sweep(['demos/reentry-summary.rpg']).size).toBe(0);
    expect(sweep(DOMAINS).size).toBe(29);
  });
});
