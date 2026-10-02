// Tier 1 — `Z` Move Characters and Suppress Zeros, the Phase 1b Wave C executor
// (`src/core/mcs.ts`). docs/plans/phase-1b.md §3.5 (the design), §4 Wave C (this vector list),
// §9 (the two named readings).
// Machine facts: research/opcodes.md §2 pp.27-28 and Figures 23-24 (the `Z` row — the move, the
// suppression rules, the word-mark rule and the register triple), §5.3 (the per-op note, what no
// manual states, and the SimH corroboration), §1.3 (Figure 8's LA/LB/LW);
// research/charset.md §1-§2 (the code points).
//
// EVERY EXPECTED VALUE HERE IS HAND-DERIVED FROM THE PRINCIPLES OF OPERATION; NO FIXTURE
// EXERCISES THIS OP SEMANTICALLY. `insttest.cor` 00800 is the `Z` LENGTH/DECODE block —
// `emulators.md` §5.2 calls those blocks "decode tests only", their oracle being the post-decode
// AAR/BAR/IAR — and PHASE-1-NOTES §3 records that `ilentest.cor` and `insttest.cor` are
// byte-identical over 00000-02599, so tier 2 already walks exactly those bytes. `note1410.txt`
// names the block and annotates nothing in it.
//
// AND THE WALK ITSELF IS `[likely]`, NOT `[verified]`: `MCS_RIGHT_TO_LEFT_THEN_SUPPRESS` is the
// only reading consistent with the printed `AAR = A − LA` (§5.3), corroborated by SimH
// `i7010_cpu.c` `case OP_MSZ` alone. The `-` / `.` pass-through under `MCS_PASSTHROUGH_CHARS` and
// the blank's membership of the suppressed class under `MCS_BLANK_IS_SUPPRESSED` are
// `[unverified]` — SimH and nothing else. All three are named constants and each has a row in
// `open-questions.md`; these cases pin the behaviour shipped, not a fact of the machine.

import { describe, it, expect } from 'vitest';
import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { tMoveSuppressZeros } from '../src/core/cycles.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import {
  MCS_BLANK_IS_SUPPRESSED, MCS_PASSTHROUGH_CHARS, MCS_RIGHT_TO_LEFT_THEN_SUPPRESS,
} from '../src/core/mcs.js';
import { BCD6, ZA, ZB, type Addr } from '../src/core/types.js';

const ZONES = ZB | ZA;

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

// ═══ The layout every vector shares ═══════════════════════════════════════
//
// A field at 00300 upward, word-marked on its LEFTMOST position — "A-field word mark defines the
// length moved" (§2). B field at 00400 upward, the same length. So A is the A field's UNITS
// position and B the B field's, per MCS_RIGHT_TO_LEFT_THEN_SUPPRESS.
const A_LEFT: Addr = 300;
const B_LEFT: Addr = 400;

/**
 * `Z aaaaa bbbbb` over an A field written as its literal core image. The B field is pre-filled
 * with `#` — a character MCS never produces — so a position the copy pass failed to reach shows
 * up as `#` rather than as an accidentally correct blank.
 */
function mcs(aImage: string, opts: { bWordMarkAt?: number } = {}): Machine {
  const m = createMachine({ size: 10_000 });
  const n = aImage.length;
  const aUnits = A_LEFT + n - 1;
  const bUnits = B_LEFT + n - 1;

  const text = `Z00${aUnits.toString().padStart(3, '0')}00${bUnits.toString().padStart(3, '0')}`;
  [...text].forEach((glyph, i) => m.storage.setChar(100 + i, code(glyph), i === 0));
  m.storage.setWm(100 + text.length, true);

  [...aImage].forEach((glyph, i) => m.storage.setChar(A_LEFT + i, code(glyph), i === 0));
  for (let i = 0; i < n; i++) m.storage.setChar(B_LEFT + i, code('#'), false);
  if (opts.bWordMarkAt !== undefined) m.storage.setWm(B_LEFT + opts.bWordMarkAt, true);

  m.addressSet(100);
  return m;
}

/** The B field as it prints — `n` characters from 00400. */
function bField(m: Machine, n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += glyphOf(m.storage.read(B_LEFT + i));
  return out;
}

/** The A field as it prints, to prove `Z` leaves it alone. */
function aField(m: Machine, n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += glyphOf(m.storage.read(A_LEFT + i));
  return out;
}

describe('`Z` — the suppression pass (opcodes.md §2 pp.27-28, Figures 23-24, §5.3)', () => {
  it('blanks high-order zeros AND commas, and stops at the first significant digit', () => {
    // `000,012` -> the three leading zeros, the comma and the fourth zero are all reached with
    // suppression still on and are blanked; `1` is a significant digit and turns suppression
    // off; `2` is then left alone. Seven positions in, seven out.
    const m = mcs('000,012');
    expect(m.step()).toBeUndefined();
    expect(bField(m, 7)).toBe('     12');
  });

  it('leaves a comma and a zero that are PAST a significant digit', () => {
    // §2 names zeros and commas as what suppression blanks; the "alphabetic and most special
    // characters" clause that RESTARTS suppression is the exception to that rule, not a superset
    // of it. So `01,000` blanks only the leading zero and prints an amount, not `1,   `.
    expect(bField(mcsRun('01,000'), 6)).toBe(' 1,000');
  });

  it('restarts suppression to the right of an alphabetic character', () => {
    // THE SENTENCE THAT MAKES THIS MORE THAN A LEADING-ZERO LOOP (§2, verbatim): "Alphabetic and
    // most special characters (e.g. @) count as non-significant, so suppression can restart to
    // their right." `10A05`: `1` turns suppression off, `0` is past it and stays, `A` is
    // non-significant and turns suppression back ON, so the `0` right of it is a high-order zero
    // again and is blanked, and `5` turns suppression off once more.
    expect(bField(mcsRun('10A05'), 5)).toBe('10A 5');
    // The `@` §2 names by name behaves the same way.
    expect(bField(mcsRun('10@05'), 5)).toBe('10@ 5');
  });

  it('`-` and `.` pass through and do not restart suppression (MCS_PASSTHROUGH_CHARS)', () => {
    expect(MCS_PASSTHROUGH_CHARS).toBe(true);
    // SimH `OP_MSZ` alone, so `[unverified]` (§5.3): both characters are left in place and the
    // suppression latch is untouched across them. `123.45` keeps its cents — which is what the
    // alternative reading (treat them as ordinary non-significant specials) would blank.
    expect(bField(mcsRun('123.45'), 6)).toBe('123.45');
    // And a period reached while suppression is still on neither blanks nor stops it: the two
    // zeros after it are still high-order zeros.
    expect(bField(mcsRun('00.007'), 6)).toBe('  .  7');
    // And a leading `-`: six positions in, six out. The `-` passes through with suppression
    // still ON, so the three zeros behind it are blanked and `1` stops the pass — `-`, three
    // blanks, `12`. (Under the alternative reading the `-` would be an ordinary non-significant
    // special, which prints the same here; the `123.45` and `00.007` cases above are the two
    // that separate the readings.)
    expect(bField(mcsRun('-00012'), 6)).toBe('-   12');
  });

  it('a BLANK is suppressed, not non-significant (MCS_BLANK_IS_SUPPRESSED)', () => {
    expect(MCS_BLANK_IS_SUPPRESSED).toBe(true);
    // §5.3's SimH description — "scans forward suppressing zeros, blanks and commas" — puts the
    // blank in the same class as the zero and the comma, so it neither stops suppression nor
    // restarts it. `1 05`: `1` turns suppression off, the blank leaves the latch alone, and the
    // `0` behind it is therefore PAST a significant digit and stays.
    // THE DIFFERENCE THIS PINS: read the other way — blank as an ordinary non-significant
    // special, the way `A` and `@` are read above — the blank restarts suppression and the `0`
    // behind it is blanked, printing `1  5`. `[unverified]` either way; SimH is the only source.
    expect(bField(mcsRun('1 05'), 4)).toBe('1 05');
    // With suppression still ON the blank changes nothing either: leading zero blanked, blank
    // passed, `1` stops the pass.
    expect(bField(mcsRun('0 12'), 4)).toBe('  12');
  });

  it('strips the zone bits from the units (sign) position of B', () => {
    // §2, verbatim: "strips the zone bits from the units (sign) position of B". `18J` is 181
    // MINUS — the sign lives in the units character's own zone bits, `J` being 11-1
    // (opcodes.md §4.1, charset.md §2) — and MCS prints it as an unsigned `181`.
    const m = mcsRun('018J');
    expect(bField(m, 4)).toBe(' 181');
    expect(m.storage.read(403) & ZONES, 'no zone bits left in the units position').toBe(0);
    // The A field keeps its sign: `Z` writes nothing there.
    expect(m.storage.read(303) & ZONES).not.toBe(0);
  });

  it('a units `-` is stripped to a BLANK — the pass-through / zone-strip interaction', () => {
    // PINS THE OPEN READING, NOT A `[verified]` FACT: both halves are unstated. `-` passes
    // through the suppression pass under MCS_PASSTHROUGH_CHARS, but the zone strip is written
    // over the POSITION, not over a class of character, so it runs on the `-` too — and `-` is
    // octal 40, zone bits and nothing else, so `40 & ~ZONES` is octal 00, the BLANK. `0012-`:
    // the two leading zeros are blanked, `1` stops the pass, `2` is left alone, the `-` passes
    // through, and the strip then erases it. (A units `.`, octal 73, becomes octal 13 the same
    // way.) Flipping either constant changes this line.
    expect(MCS_PASSTHROUGH_CHARS).toBe(true);
    const m = mcsRun('0012-');
    expect(bField(m, 5)).toBe('  12 ');
    expect(m.storage.read(404) & BCD6, 'the units position is octal 00, the BLANK').toBe(0);
  });

  it('an all-zero SIGNED field leaves a bare `0` in the units — the printed clause order', () => {
    // JUDGEMENT CALL, commented in mcs.ts: §2 prints "blanks high-order zeros and commas … and
    // strips the zone bits from the units position", in that order. `00?` (000 plus, `?` being
    // 12-0) is `  ?` after suppression — a plus zero is not the digit zero, so it is a
    // non-significant special and is left alone — and `  0` after the strip. Stripping first
    // would have made it a zero under active suppression and blanked it.
    expect(bField(mcsRun('00?'), 3)).toBe('  0');
  });
});

describe('`Z` — the move itself (opcodes.md §2 pp.27-28, §5.3)', () => {
  it('moves A to B with A unchanged, the A-field word mark defining the length', () => {
    expect(MCS_RIGHT_TO_LEFT_THEN_SUPPRESS).toBe(true);
    const m = mcsRun('012345');
    expect(bField(m, 6)).toBe(' 12345');
    expect(aField(m, 6), 'A is unchanged — §2’s own words').toBe('012345');
    // The A-field word mark is a terminator, not data: it is not carried into B.
    expect(m.storage.wm(300), 'the A field keeps its own word mark').toBe(true);
    expect(m.storage.wm(400), 'and B does not gain one').toBe(false);
  });

  it('removes B-field word marks inside the moved area, INCLUDING its leftmost position', () => {
    // §2's `terminatesOn`, verbatim: "B-field word marks inside the moved area, including its
    // leftmost position, are removed." Both marks below are inside the six positions moved.
    const m = mcs('012345', { bWordMarkAt: 0 });
    m.storage.setWm(B_LEFT + 3, true);
    expect(m.storage.wm(400), 'set before the operation').toBe(true);
    m.step();
    expect(m.storage.wm(400), 'the leftmost position of the moved area').toBe(false);
    expect(m.storage.wm(403), 'and one in the middle of it').toBe(false);
    expect(bField(m, 6)).toBe(' 12345');
  });
});

describe('`Z aaaaa bbbbb` — the row’s register triple and timing (opcodes.md §2, §1.3, §1.5)', () => {
  it('leaves NSI / A−LA / B+1, both evaluated by isa/regs.ts', () => {
    const m = mcsRun('000,012');           // seven characters: A = 00306, B = 00406
    expect(m.regs.iar, 'NSI — 11 characters from 00100').toBe(111);
    // AAR = A − LA with LA = 7, the length the A-field word mark defined: 00306 − 7 = 00299, one
    // position left of the A field's high-order character at 00300. It is the register result
    // §5.3 says FORCES the right-to-left reading.
    expect(m.regs.aar).toBe(299);
    // BAR = B + 1, the row's own column — one position RIGHT of the B field's units, which is
    // where the left-to-right suppression pass ends.
    expect(m.regs.bar).toBe(407);
  });

  it('sets no indicator — §2’s row prints none', () => {
    const before = createMachine({ size: 10_000 }).indicators.snapshot();
    const m = mcsRun('000,012');
    expect(m.indicators.snapshot()).toEqual(before);
  });

  it('charges `4.5(L + 1 + 4A)` with A = the length moved (cycles.ts tMoveSuppressZeros)', () => {
    const m = mcsRun('000,012');
    // L = 11, A = LA = 7: 4.5 x (11 + 1 + 28) = 180 µs.
    expect(m.cpu.microsecondsSimulated).toBe(tMoveSuppressZeros(11, 7));
    expect(m.cpu.microsecondsSimulated).toBe(180);
  });
});

/** Build and run one `Z` in a single call — every case above but the word-mark one. */
function mcsRun(aImage: string): Machine {
  const m = mcs(aImage);
  m.step();
  return m;
}
