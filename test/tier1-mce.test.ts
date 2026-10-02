// Tier 1 — `E` Move Characters and Edit, the Phase 1b Wave D executor (`src/core/edit.ts`).
// docs/plans/phase-1b.md §3.6 (the design, the latch table and the eight-case BAR table),
// §4 Wave D (the yield convention and this vector list), §7 (the per-storage-cycle iterator),
// §9 (the one `[unverified]` item MCE touches).
// Machine facts: research/opcodes.md §2 pp.31-33 (the `E` row), §7.1 (Figure 28's control
// characters), §7.2 (the five scan variants, the extension latch, truncation, "the A field is
// never written"), §7.3 (the eight rows and the Figure 34 worked example), §7.4 (both word-mark
// answers), §7.5 (the skid cycles), §7.6 (the recipe, the scan-2 termination quote and the two
// 1401 traps), §1.5 (Figure 7's `Z` and `D`); research/charset.md §1-§2 (the code points).
//
// THE FIRST CASE IS A REAL PUBLISHED TRACE; EVERY OTHER CASE IS HAND-DERIVED.
// `oracle/mce-figure34.ts` is A22-0526-3 Figure 34 / S223-2698 Figures 23A-23B, all 46 steps,
// mapped onto B-cycle ordinals because the manual's step numbers are not addressable through
// `stepCycle()` (phase-1b.md §4 Wave D). Everything below it is hand-derived from §7 with the
// arithmetic written out in the comment, because NO IMAGE EXERCISES MCE SEMANTICALLY:
// `insttest.cor` 00900 holds an `E` block, but it decodes `_E1111122222 _E33333 _E` against
// BLANK operands — a length/decode block, tier 2's already (`emulators.md` §5.2, PHASE-1-NOTES
// §3's byte-identity finding) — and `note1410.txt` names it while annotating nothing.

import { describe, it, expect } from 'vitest';
import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import { tEdit } from '../src/core/cycles.js';
import { MCE_EARLY_A_WM_ENDS_AT_SCAN_1 } from '../src/core/edit.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { ZB, type Addr } from '../src/core/types.js';
import {
  MCE_FIGURE34_END, MCE_FIGURE34_SETUP, MCE_FIGURE34_TRACE,
} from '../oracle/mce-figure34.js';

function code(glyph: string): number {
  const c = bcdOfGlyph(glyph);
  if (c === undefined) throw new Error(`no BCD for glyph "${glyph}"`);
  return c;
}

const pad5 = (a: Addr): string => a.toString().padStart(5, '0');

/** Write `text` from `at` with a word mark on its first position, and one just past its end. */
function program(m: Machine, at: Addr, text: string): void {
  [...text].forEach((glyph, i) => m.storage.setChar(at + i, code(glyph), i === 0));
  m.storage.setWm(at + text.length, true);
}

/** Storage as it prints, `n` characters from `from`. */
function chars(m: Machine, from: Addr, n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += glyphOf(m.storage.read(from + i));
  return out;
}

// ═══ 1. The Figure 34 trace ═══════════════════════════════════════════════════════════════
//
// `E 12163 04685` at 00001-00011 (NSI 00012), A field `00257426` at 12156-12163 word-marked at
// 12156, control word `$bbb,bb0.bb&CR&**` at 04669-04685 word-marked at 04669. Two scans, one
// skid, 26 B-cycles, ending IAR 00012 / AAR 12155 / BAR 04677 over `$  2,574.26    **`.

function figure34Machine(): Machine {
  const s = MCE_FIGURE34_SETUP;
  const m = createMachine({ size: 20_000 });
  program(m, s.instructionAddr, s.instruction);
  [...s.aField].forEach((g, i) => m.storage.setChar(s.aFieldHighOrder + i, code(g), false));
  m.storage.setWm(s.aFieldWm, true);
  [...s.controlWord].forEach((g, i) => m.storage.setChar(s.controlWordHighOrder + i, code(g), false));
  m.storage.setWm(s.controlWordWm, true);
  m.addressSet(s.instructionAddr);
  return m;
}

/**
 * Which storage position the cycle at entry `index` read out. The figure prints each address
 * register AFTER that cycle's modification (`oracle/mce-figure34.ts`, "Reading the address
 * columns"), so a scan-1 cycle read `bar + 1` and a scan-2 cycle — and the skid, whose modifier
 * is already `+1` — read `bar − 1`. §7.5 states it for the skid outright: it touches 04668 while
 * the BAR column prints 04669.
 */
function readAddressOf(index: number, bar: Addr, skidIndex: number): Addr {
  return index < skidIndex ? bar + 1 : bar - 1;
}

describe('`E` — A22-0526-3 Figure 34, step by step (opcodes.md §7.3; oracle/mce-figure34.ts)', () => {
  it('reproduces all 26 B-cycles: IAR, AAR, BAR, the character put back, and the B field', () => {
    const m = figure34Machine();
    const s = MCE_FIGURE34_SETUP;
    const skidIndex = MCE_FIGURE34_TRACE.findIndex((e) => e.kind === 'skid');
    expect(skidIndex, 'the fixture carries exactly one skid entry').toBeGreaterThan(0);

    // Steps 1-12 are the I phase and collapse into ONE call: `stepCycle()` runs read-out,
    // decode and field assignment together (cpu.ts, phase-1b.md §4 Wave D). The figure's first
    // twelve rows therefore go by in one press, which the plan says outright.
    const iPhase = m.stepCycle();
    expect(iPhase.phase).toBe('I');
    expect(m.regs.iar, 'IAR = NSI for the whole of the E execution').toBe(s.nsi);
    expect(m.regs.aar).toBe(s.aAddr);
    expect(m.regs.bar).toBe(s.bAddr);

    MCE_FIGURE34_TRACE.forEach((entry, i) => {
      const cycle = m.stepCycle();
      const at = `step ${entry.step}${entry.folds === undefined ? '' : ` (folds ${entry.folds})`}`;
      expect(cycle.phase, at).toBe('E');
      expect(cycle.complete, `${at} is not the last cycle`).toBe(false);
      expect(m.regs.iar, `${at} IAR`).toBe(entry.iar);
      expect(m.regs.aar, `${at} AAR`).toBe(entry.aar);
      expect(m.regs.bar, `${at} BAR`).toBe(entry.bar);

      // The skid's `data` / `putBack` cells are the figure's own `?` — the example never says
      // what lives at 04668 — so the fixture header forbids asserting them against storage. The
      // byte itself is asserted by the dedicated skid case further down.
      if (entry.kind !== 'skid') {
        const readAt = readAddressOf(i, entry.bar, skidIndex);
        expect(glyphOf(m.storage.read(readAt)), `${at} put back at ${readAt}`).toBe(entry.putBack);
        expect(m.storage.wm(readAt), `${at} word mark at ${readAt}`).toBe(entry.putBackWm ?? false);
      }
      if (entry.bField !== undefined) {
        expect(chars(m, s.controlWordHighOrder, 17), `${at} B field`).toBe(entry.bField);
      }
    });

    // One more cycle retires the instruction: the generator is exhausted, so `endInstruction`
    // applies the register triple and the timing (cpu.ts `executeCycle`).
    const last = m.stepCycle();
    expect(last.complete, 'the 27th E cycle retires the instruction').toBe(true);
    expect(last.stop).toBeUndefined();
  });

  it('ends at IAR 00012 / AAR 12155 / BAR 04677 over `$  2,574.26    **`', () => {
    const m = figure34Machine();
    expect(m.step()).toBeUndefined();
    // `AAR = 12163 − 8` confirms `A − LA` (eight A-cycles for an eight-character A field);
    // `BAR = 04676 + 1` confirms §7.3's "plain zero suppression" row. Both `[verified]`.
    expect(m.regs.iar).toBe(MCE_FIGURE34_END.iar);
    expect(m.regs.aar).toBe(MCE_FIGURE34_END.aar);
    expect(m.regs.bar).toBe(MCE_FIGURE34_END.bar);
    expect(chars(m, MCE_FIGURE34_SETUP.controlWordHighOrder, 17)).toBe(MCE_FIGURE34_END.bField);
  });

  it('leaves the A field exactly as Figure 27 prints it, before and after', () => {
    // §7.2 verbatim: "The A field is never written… All A-cycles are read-only." The sign clause
    // in §2's row — "any sign in the units position of the data is removed" — is about the
    // character MOVED INTO B, not about the A field.
    const m = figure34Machine();
    expect(m.step()).toBeUndefined();
    expect(chars(m, MCE_FIGURE34_SETUP.aFieldHighOrder, 8)).toBe(MCE_FIGURE34_SETUP.aField);
    expect(m.storage.wm(MCE_FIGURE34_SETUP.aFieldWm), 'the A word mark survives').toBe(true);
  });

  it('removes the high-order B word mark and erases the auto-set one (§7.4, both unconditional)', () => {
    const m = figure34Machine();
    expect(m.step()).toBeUndefined();
    // Step 37 reads the word-marked `$` at 04669 and puts it back plain: "a word mark is gated
    // to the B-field only when the low-order 0 in the control word is sensed" (S223-2698 p.50).
    expect(m.storage.wm(MCE_FIGURE34_SETUP.controlWordWm), 'high-order B WM').toBe(false);
    // Step 46, the last step, reads the `4` carrying the word mark step 25 auto-set at 04676 and
    // puts it back plain.
    expect(m.storage.wm(MCE_FIGURE34_SETUP.suppressionCode), 'the auto-set WM').toBe(false);
  });
});

// ═══ 2. The generic layout every hand-derived vector below shares ═════════════════════════
//
// `E aaaaa bbbbb` at 00100. The A field runs to 00300 + n − 1 with its word mark on the LEFTMOST
// position; the control word runs from 00500 with its word mark on the leftmost position, so the
// B address handed to the instruction is the control word's rightmost position — Figure 34's own
// geometry (`E 12163 04685` over 12156-12163 and 04669-04685), one order of magnitude down.
// 00499 — the neighbouring field's units position, Figure 34's 04668 — is pre-filled with `#`,
// a character no edit produces, so the skid's read/rewrite is observable.

const A_LEFT: Addr = 300;
const B_LEFT: Addr = 500;
const NEIGHBOUR: Addr = B_LEFT - 1;

function mce(
  aImage: string, controlWord: string, opts: { neighbourWm?: boolean } = {},
): Machine {
  const m = createMachine({ size: 10_000 });
  const aUnits = A_LEFT + aImage.length - 1;
  const bUnits = B_LEFT + controlWord.length - 1;
  program(m, 100, `E${pad5(aUnits)}${pad5(bUnits)}`);
  [...aImage].forEach((g, i) => m.storage.setChar(A_LEFT + i, code(g), i === 0));
  [...controlWord].forEach((g, i) => m.storage.setChar(B_LEFT + i, code(g), i === 0));
  m.storage.setChar(NEIGHBOUR, code('#'), opts.neighbourWm === true);
  m.addressSet(100);
  return m;
}

/** Run one edit and hand back the machine plus the edited control-word span. */
function edited(aImage: string, controlWord: string): { m: Machine; b: string } {
  const m = mce(aImage, controlWord);
  expect(m.step(), 'the edit runs to completion').toBeUndefined();
  return { m, b: chars(m, B_LEFT, controlWord.length) };
}

// ═══ 3. One vector per row of §7.3's eight-case BAR table ═════════════════════════════════
//
// The table is `[verified]` on its own — the Principles of Operation print "Varies with result
// of edit" for BAR in every edition — so BAR is tested case by case rather than through one
// example. `IAR = NSI` and `AAR = A − LA` hold in all eight.

describe('`E` — §7.3\'s eight-case BAR table, one vector per row', () => {
  it('row 1 — no `0` anywhere in the control word: ONE scan, BAR = addr(B high-order WM) − 1', () => {
    // Control word `bbbb` at 00500-00503, A field `1234` at 00300-00303. Every position is a
    // blank taking its A character, and no `0` is ever sensed, so the zero-suppress latch is
    // still off when the B word mark is read: "If the zero suppress latch is not set when the
    // B-field word mark is sensed, the first scan and the edit operation end" (§7.6, S223-2698
    // p.50). The single scan is decided by THE LATCH — no storage read at the decremented BAR,
    // which is SimH deviation 1. BAR = 00500 − 1 = 00499, AAR = 00303 − 4 = 00299.
    const { m, b } = edited('1234', '    ');
    expect(b).toBe('1234');
    expect(m.regs.bar).toBe(499);
    expect(m.regs.aar).toBe(299);
    expect(m.regs.iar, 'NSI — 00100 + 11').toBe(111);
    // §7.4's first unconditional answer holds here too — the single-scan case is exactly the
    // variant no manual traces, and the high-order word mark still comes off.
    expect(m.storage.wm(B_LEFT), 'the high-order B word mark is removed anyway').toBe(false);
  });

  it('row 2 — plain zero suppression: TWO scans, BAR = addr(suppression code) + 1', () => {
    // Control `bbb0.bb` at 00500-00506, code at 00503; A field `002574` at 00300-00305.
    // Scan 1 right to left: 506←4, 505←7, 504 `.` stays (RIGHT of the code, so no decimal
    // control — §7.2 needs the point LEFT of it), 503←5 + auto WM, 502←2, 501←0, 500←0 and the
    // B word mark ends it. Field `0025.74`. Scan 2 left to right from 00500: the two `0`s blank,
    // the `2` is significant, the code's `5` is put back plain and the operation ends.
    // BAR = 00503 + 1 = 00504; AAR = 00305 − 6 = 00299.
    const { m, b } = edited('002574', '   0.  ');
    expect(b).toBe('  25.74');
    expect(m.regs.bar).toBe(504);
    expect(m.regs.aar).toBe(299);
  });

  it('row 3 — asterisk protection: TWO scans, BAR = addr(suppression code) + 1', () => {
    // Control `bb*b0.bb` at 00500-00507, code at 00504, the enabling `*` at 00502; A field
    // `0002574` at 00300-00306. The `*` is read while the body latch is still up — it has two
    // data-taking positions (00501, 00500) to its left, and §7.2's body latch does not reset
    // until the A-field word mark is sensed, which happens on the A-cycle folded into 00500.
    //
    // THE ENABLING `*` TAKES AN A CHARACTER, so the body's data-taking positions are SEVEN, not
    // six: 00507, 00506, 00504 (the code), 00503, 00502 (the `*`), 00501, 00500. S223-2698 p.50
    // body rule 4: "Sets the `*` fill or floating dollar latch if the B-channel character is an
    // `*` or `$` and the zero suppress latch is set. The A-channel character is stored in the
    // B-field." The A field is seven digits to match — p.50's own sizing rule, "the A-field
    // should not contain more characters than the number of blanks and zeros in the body of the
    // control word", read from the other side. Scan 1 leaves `00025.74`; scan 2's fill is `*`
    // instead of blank — "asterisk fill is done inside scan 2, so asterisk protection is a
    // two-scan operation" (§7.6) — so the three leading zeros become `***`.
    // BAR = 00504 + 1 = 00505; AAR = 00306 − 7 = 00299, and the AAR is what fails (00300) if the
    // `*` stores nothing.
    const { m, b } = edited('0002574', '  * 0.  ');
    expect(b).toBe('***25.74');
    expect(m.regs.bar).toBe(505);
    expect(m.regs.aar).toBe(299);
  });

  it('row 4 — sign control left: TWO scans, BAR = addr(suppression code) + 1', () => {
    // Control `-bbb0.bb` at 00500-00507, code at 00504, the `-` in the HIGH-ORDER status
    // position; A field `002574` at 00300-00305, units `4` unzoned, so the sign is PLUS
    // (§4.1: minus is always a B bit alone). §7.2's "Sign control left": the `-` "stays if the
    // A sign is minus, is blanked if plus". It is read after the A-field word mark, in the
    // extension, which is what makes this the LEFT variant rather than Figure 34's trailing
    // `CR`. BAR = 00504 + 1 = 00505.
    const { m, b } = edited('002574', '-   0.  ');
    expect(b).toBe('   25.74');
    expect(m.regs.bar).toBe(505);
  });

  it('row 5 — decimal control WITH a significant digit: TWO scans, BAR = code + 1', () => {
    // Control `bbb.b0` at 00500-00505, code at 00505 (the rightmost `0` — and here the units
    // position), the point at 00503 LEFT of it, which is what §7.2 requires to enable decimal
    // control. A field `00105` at 00300-00304. Scan 1: 505←5 + auto WM, 504←0, 503 `.` sets the
    // decimal-control latch, 502←1, 501←0, 500←0 → `001.05`. Scan 2 blanks 00500-00501, meets
    // the significant `1`, and the point prints because the field HAS a significant digit.
    // BAR = 00505 + 1 = 00506; AAR = 00304 − 5 = 00299.
    const { m, b } = edited('00105', '   . 0');
    expect(b).toBe('  1.05');
    expect(m.regs.bar).toBe(506);
    expect(m.regs.aar).toBe(299);
  });

  it('row 6 — decimal control, NO significant digit: THREE scans, BAR = addr(point) − 1', () => {
    // Same control word, A field `00000`. Scan 1 leaves `000.00`; scan 2 blanks 00500-00502 and
    // stops suppressing at the point, so the zeros right of it SURVIVE scan 2 — which is what
    // gives §7.2's third scan something to blank: "If there are no significant digits a second
    // forward scan blanks the zeros right of the point AND THE POINT ITSELF, stopping at the
    // decimal column — the field edits to all blanks." Scan 3 runs right to left from the code:
    // 00505 `0`→blank, 00504 `0`→blank, 00503 `.`→blank and stop.
    // BAR = 00503 − 1 = 00502.
    const { m, b } = edited('00000', '   . 0');
    expect(b).toBe('      ');
    expect(m.regs.bar).toBe(502);
  });

  it('row 7 — floating dollar sign: THREE scans, BAR = addr($ store position) − 1', () => {
    // §7.2's own recommended control field, `b$0.bb` at 00500-00505 with the code at 00502 LEFT
    // of the point, over `00025` at 00300-00304. The `$` at 00501 is in the body left of the
    // code, so it sets the floating-dollar latch AND takes an A digit — "forward scan replaces
    // the `$` with the corresponding A digit and continues to the B word mark" (§7.2), which is
    // the one way the `$` rule differs from the `*` rule. Scan 1 leaves `000.25`; scan 2 blanks
    // 00500-00502 (the code included) and the floating-dollar latch forces a third scan
    // regardless; scan 3 starts at the code, finds a blank at once, writes `$` there and stops.
    // BAR = 00502 − 1 = 00501; AAR = 00304 − 5 = 00299.
    const { m, b } = edited('00025', ' $0.  ');
    expect(b).toBe('  $.25');
    expect(m.regs.bar).toBe(501);
    expect(m.regs.aar).toBe(299);
  });

  it('row 8 — floating dollar AND decimal control: THREE scans, BAR = first blank-or-decimal − 1', () => {
    // §7.2's WARNING case, verbatim: "The floating `$` cannot be used right of the decimal
    // point; with decimal control also active, control field `bb$.bO` edits `00025` to `.25`,
    // NOT `$.25`." Control `bb$.b0` at 00500-00505: the code is the units position 00505, the
    // point at 00503 is left of it (decimal control), and the `$` at 00502 is left of it too
    // (floating dollar). Scan 1 leaves `000.25`; scan 2 blanks 00500-00502 and stops suppressing
    // at the point, and the floating-dollar latch forces scan 3. Scan 3 walks 00505 `5`, 00504
    // `2`, then reads the point at 00503 BEFORE it ever meets a blank — so no `$` is placed and
    // the point is left alone. BAR = 00503 − 1 = 00502, and `D` is 0 because no `$` was stored.
    const { m, b } = edited('00025', '  $. 0');
    expect(b).toBe('   .25');
    expect(m.regs.bar).toBe(502);
  });
});

// ═══ 4. The two skid B-cycles — §7.5 ══════════════════════════════════════════════════════

describe('`E` — the skid cycles touch storage OUTSIDE the B field (opcodes.md §7.5)', () => {
  it('the scan-1 → scan-2 skid PRESERVES a word mark on the neighbouring field', () => {
    // Figure 34's geometry, one order of magnitude down: the skid reads and rewrites 00499 —
    // `B_high − 1`, the units position of whatever field sits to the left, Figure 34 step 38's
    // 04668, remark "Units Position of next Field". cube1us stores it with `AsmChannelWMB` where
    // every other MCE store uses `AsmChannelWMNone`, so an emulator that routes the skid through
    // its normal MCE write path SILENTLY ERASES a word mark belonging to the neighbour. This is
    // the case that fails if it does.
    const m = mce('002574', '   0.  ', { neighbourWm: true });
    expect(m.step()).toBeUndefined();
    expect(glyphOf(m.storage.read(NEIGHBOUR)), 'the byte is rewritten unchanged').toBe('#');
    expect(m.storage.wm(NEIGHBOUR), "the neighbour's word mark survives").toBe(true);
  });

  it('and leaves an unmarked neighbour unmarked', () => {
    const m = mce('002574', '   0.  ');
    expect(m.step()).toBeUndefined();
    expect(glyphOf(m.storage.read(NEIGHBOUR))).toBe('#');
    expect(m.storage.wm(NEIGHBOUR)).toBe(false);
  });

  it('both skids are REAL storage references, one storage cycle each (SimH deviations 2 and 3)', () => {
    // §7.6: SimH's scan-2→3 skid is "absent entirely — a bare `DownReg(BAR)` with no
    // read/rewrite", and its scan-1→2 skid read happens only when the zero-suppress latch is
    // OFF, which is precisely the case in which scan 2 does not run. Both are cycles here, so
    // the three-scan edit of row 7 costs its scan-1 (6) + skid (1) + scan-2 (3) + skid (1) +
    // scan-3 (1) = 12 B-cycles, and a two-scan edit of row 2 costs 7 + 1 + 4 = 12 likewise.
    const count = (a: string, control: string): number => {
      const m = mce(a, control);
      let n = 0;
      for (let guard = 0; guard < 200; guard++) {
        const cycle = m.stepCycle();
        if (cycle.complete) return n;
        if (cycle.phase === 'E') n++;
      }
      throw new Error('stepCycle never completed');
    };
    // Row 7, the floating dollar: scan 1 over 00500-00505 is 6 cycles; skid 1→2 is 1; scan 2
    // over 00500-00502 is 3; skid 2→3 is 1; scan 3 is 1. Twelve.
    expect(count('00025', ' $0.  ')).toBe(12);
    // Row 2, plain zero suppression: scan 1 over 00500-00506 is 7; skid 1→2 is 1; scan 2 over
    // 00500-00503 is 4. Twelve, and no second skid because there is no third scan.
    expect(count('002574', '   0.  ')).toBe(12);
  });
});

// ═══ 5. The rules §7.1 / §7.2 state one at a time ═════════════════════════════════════════

describe('`E` — the control characters and the latches (opcodes.md §7.1, §7.2)', () => {
  it('SINGLE CHARACTER EDIT — the 1410 transfers and edits a one-character A field', () => {
    // 223-2588-2 p.53 `[verified]`, quoted at §7.6: "if the specified A-field in an edit
    // operation contains a word mark in the units position (a single character field), the 1401
    // system will NOT transfer this single-character field to the B-field. The 1410 WILL
    // transfer and edit this single-character field." There is no special case for it in
    // `edit.ts`, which is the point — the scan treats it like any other A field.
    //
    // A field is the single character `P` at 00300, word-marked there: octal 47, the digit 7
    // carrying a B zone alone, i.e. 7 MINUS (§4.1, Figure 11 p.16). Control `&bb0` at
    // 00500-00503. The `0` at 00503 takes the character and the sign zone is stripped off it on
    // the way into B — "any sign in the units position of the data is removed from the character
    // moved into B" (§2's row) — so a `7`, not a `P`, lands there; the `&` at 00500 becomes a
    // blank (§7.1, "produces a blank in the output field"). Both halves of "transferred AND
    // edited". AAR = 00300 − 1 = 00299.
    //
    // THE BAR IS THE DISCRIMINATING ASSERTION, and it is `MCE_EARLY_A_WM_ENDS_AT_SCAN_1`
    // (`edit.ts`) rather than a fact of the machine. The A word mark is sensed on the FIRST
    // A-cycle, the one folded into the `0` at 00503, and it resets the body latch BEFORE that
    // cycle's control character is classified — so the `0` is read in the extension, never
    // becomes a suppression code, and the zero-suppress latch is still off when the B-field word
    // mark is sensed: ONE scan, §7.3 row 1, BAR = addr(B high-order WM) − 1 = 00500 − 1 = 00499.
    // Under the other reading — the body latch reachable after the extension latch is set — the
    // `0` would be the suppression code, scan 2 would run, and BAR would be 00504 (§7.3 row 2,
    // code + 1). The B field is `bbb7` either way; only BAR separates them, which is why it is
    // asserted here. See `docs/research/open-questions.md`, Phase 1b section.
    expect(MCE_EARLY_A_WM_ENDS_AT_SCAN_1).toBe(true);
    const { m, b } = edited('P', '&  0');
    expect(b, 'the character IS transferred, and its sign zone is edited off').toBe('   7');
    expect(m.regs.aar).toBe(299);
    expect(m.regs.bar, 'one scan (00499), not two (00504) — the shipped reading').toBe(499);
    expect(glyphOf(m.storage.read(A_LEFT)), 'and the A field is still `P`').toBe('P');
  });

  it('`&` becomes a blank, and `CR` is blanked in BOTH positions when the A sign is plus', () => {
    // §7.1: "`&` produces a blank in the output field. May be used in multiples"; "`CR` — body:
    // undisturbed. Status: blanked (BOTH POSITIONS) if the A-field sign is plus; undisturbed if
    // minus." Control `bbb0&CR` at 00500-00506 over `0025` at 00300-00303, units `5` unzoned →
    // PLUS. Scan 1 reads the `R` at 00506 first, then the `C` at 00505, then the `&`; the code
    // at 00503 takes the `5`. Scan 2 blanks the two leading zeros.
    expect(edited('0025', '   0&CR').b).toBe('  25   ');
  });

  it('and leaves `CR` standing when the A sign is minus', () => {
    // Same control word over `002N`: `N` is octal 45, the digit 5 carrying a B zone alone —
    // 0025 MINUS (§4.1: "minus is ALWAYS a B bit"). The `CR` is undisturbed; the `&` is blanked
    // anyway, because §7.1 states its rule with no sign condition and no body/status condition.
    expect(code('N') & (ZB | 0x10), 'N is B-zone only, i.e. a minus units position').toBe(ZB);
    expect(edited('002N', '   0&CR').b).toBe('  25 CR');
  });

  it('`-` follows the same rule as `CR`, one position instead of two', () => {
    // §7.1's `-` row: "Same as `CR`."
    expect(edited('0025', '   0&-').b).toBe('  25  ');
    expect(edited('002N', '   0&-').b).toBe('  25 -');
  });

  it('a comma inside the BODY is undisturbed; a comma read under the extension latch is blanked', () => {
    // Two halves of one sentence. §7.1: a comma is "undisturbed where written"; §7.2: "when the
    // A-field word mark is sensed the… extension latch is set… the remaining commas in the
    // B-field are set to blanks" (A22-0526-3 p.31).
    //
    // BODY: control `bb,b0` at 00500-00504 over `1234` at 00300-00303. Scan 1: 504←4 (code, auto
    // WM), 503←3, 502 `,` takes no A character and is put back as it stands, 501←2, 500←1. The
    // `1` at 00500 is significant, so scan 2 blanks nothing.
    expect(edited('1234', '  , 0').b).toBe('12,34');
    // EXTENSION: control `b,bb0` at 00500-00504 over the SHORTER `123` at 00300-00302. Scan 1:
    // 504←3 (code), 503←2, then the A-cycle folded into 00502 senses the A word mark — so the
    // body latch resets, the extension latch sets, and the `1` ALREADY IN THE A-DATA REGISTER IS
    // STILL STORED at 00502 (§7.2's nuance, S223-2698 p.50, the thing that decides Figure 34
    // step 36). The comma at 00501 is then read under the extension latch and blanked; 00500 has
    // no character left to take and stays blank. Scan 2 blanks nothing — the `1` is significant.
    expect(edited('123', ' ,  0').b).toBe('  123');
  });

  it('TRUNCATION — the B-field word mark hard-stops scan 1 and the remaining A data is dropped', () => {
    // §7.2's truncation rule, verbatim: "The edited output field does not contain any A-field
    // data that have not been moved before the word mark for the control field is sensed."
    // Control `bb0` at 00500-00502 has three data-taking positions; the A field `12345` at
    // 00300-00304 has five. Scan 1 stores 5, 4, 3 and the B word mark at 00500 stops it, so `1`
    // and `2` are never read. This is the case where `A − LA` holds only for LEGAL usage
    // (§7.3): three A-cycles, so AAR = 00304 − 3 = 00301, not 00304 − 5 = 00299.
    const { m, b } = edited('12345', '  0');
    expect(b).toBe('345');
    expect(m.regs.aar, 'AAR stops wherever the B word mark left it').toBe(301);
    expect(chars(m, A_LEFT, 5), 'and the A field is untouched').toBe('12345');
    expect(m.regs.bar, '§7.3 row 2 — the code at 00502, + 1').toBe(503);
  });

  it('asterisk protection and floating dollar in ONE control field STOPS the machine (§7.2)', () => {
    // §7.2, verbatim: "Asterisk protection and floating dollar sign cannot be used in the same
    // control field." The manual states no machine behaviour for the combination, so it is an
    // assertion in `edit.ts` rather than a comment (phase-1b.md §3.6).
    //
    // IT IS A STOP, NOT A THROWN `Error`. The refusal is the emulator's own — the real 1410
    // documents no check here and what the hardware does is unknown — so `edit.ts` raises the
    // closest existing `MachineCheck`, `UnsupportedFeature`, and `cpu.ts stopOn` turns it into
    // the `unsupportedFeature` stop reason the operator sees. A bare `Error` would escape
    // `step()` mid-instruction as an emulator bug and be rethrown instead.
    //
    // Control `b$b*b0` at 00500-00505: the code at 00505, an `*` at 00503 and a `$` at 00501,
    // both in the body left of it, over `123456` at 00300-00305. Scan 1 raises the asterisk latch
    // at 00503 and the floating-dollar latch at 00501, and the second one stops the machine. The
    // A field is SIX characters because all six control positions take one — the `*` and the `$`
    // included (p.50 rule 4) — and a five-character field would sense its word mark on the
    // A-cycle folded into 00501, resetting the body latch before the `$` is classified and
    // leaving the two latches never both up.
    const m = mce('123456', ' $ * 0');
    expect(m.step()).toBe('unsupportedFeature');
    expect(m.cpu.lastCheck?.message, 'and the message names both latches and the citation')
      .toMatch(/asterisk protection and floating dollar in one control field/);
    expect(m.cpu.lastCheck?.at, 'raised at the character that raised the second latch').toBe(501);
  });

  it('the enabling `*` CONSUMES an A character, exactly as the enabling `$` does (p.50 rule 4)', () => {
    // S223-2698 p.50 states the body rules as four numbered clauses, and rule 4 covers both
    // characters in one sentence: "Sets the `*` fill or floating dollar latch if the B-channel
    // character is an `*` or `$` and the zero suppress latch is set. THE A-CHANNEL CHARACTER IS
    // STORED IN THE B-FIELD." So the enabling `*` is a data-taking position like the `0` and the
    // blanks, and the A field shifts one place left across it.
    //
    // Control `bb*b0` at 00500-00504, code at 00504, the enabling `*` at 00502; A field `00345`
    // at 00300-00304, five characters for five data-taking positions. Scan 1 right to left:
    // 00504←`5` (code, auto WM), 00503←`4`, 00502←`3` (the `*`: asterisk latch AND the store),
    // 00501←`0`, 00500←`0` and the B word mark ends it, so the field is `00345` and LA = 5.
    // Scan 2 fills `*` over the two leading zeros and stops at the first significant digit, the
    // `3` the `*` position took. BAR = 00504 + 1 = 00505; AAR = 00304 − 5 = 00299.
    //
    // WITHOUT the store the `*` would keep its own glyph, the A digits would land one position
    // to the right of where they belong, and the same edit would print `*3*45` with AAR 00300 —
    // an asterisk stranded in the middle of the amount, which is the shape of the bug.
    const { m, b } = edited('00345', '  * 0');
    expect(b).toBe('**345');
    expect(m.regs.bar).toBe(505);
    expect(m.regs.aar).toBe(299);
  });

  it('asterisk fill does not cover a position the A field never reached (pp.50-51)', () => {
    // Scan 2 replaces ZEROS AND COMMAS and nothing else: "all insignificant zeros and commas
    // (zeros and commas to the left of significant digits) are set to blanks or, if the asterisk
    // fill latch is set, replaced with asterisks" (p.50), and the re-arm sentence repeats the
    // same pair (p.51). A BLANK IS NOT IN THAT CLASS, and under blank fill the distinction is
    // invisible — a blank written over a blank. Under asterisk fill it is visible, and this is
    // the case that shows it.
    //
    // Control `bbb*b0` at 00500-00505, code at 00505, the enabling `*` at 00503; A field `1234`
    // at 00300-00303, four characters for FIVE data-taking positions. Scan 1: 00505←`4` (code),
    // 00504←`3`, 00503←`2` (the `*` takes its A character, p.50 rule 4, and the body latch is
    // still up because the word-marked `1` is read one cycle later), 00502←`1` — that A-cycle
    // senses the A-field word mark, so the body latch resets and the extension latch sets, and
    // the character already in the A-data register is still stored (§7.2, Figure 34 step 36).
    // 00501 and 00500 then have nothing left to take and stay blank. Field `bb1234`.
    // Scan 2: the two blanks are left as they stand, the `1` at 00502 is the first significant
    // digit, and nothing is filled at all. BAR = 00505 + 1 = 00506; AAR = 00303 − 4 = 00299.
    //
    // The other reading — a blank belongs to the fill class, so a short field comes out fully
    // check-protected — prints `**1234`. p.50 sizes the A field from the other side instead
    // ("the A-field should not contain more characters than the number of blanks and zeros in
    // the body of the control word"), and a control word that wants its leading positions filled
    // writes them `0`, which IS in the class.
    const { m, b } = edited('1234', '   * 0');
    expect(b).toBe('  1234');
    expect(m.regs.bar).toBe(506);
    expect(m.regs.aar).toBe(299);
  });

  it('a `$` or an `*` RIGHT of the suppression code is treated as a blank (§7.1)', () => {
    // §7.1 states this half for both characters — but "right of the suppression code" is not the
    // same as "right of the code AND in the body", and the body is what §7.1 scopes the rule to:
    // it "begins at the RIGHTMOST blank or zero". Both halves are asserted here.
    //
    // IN THE BODY. Control `bb0$*b` at 00500-00505: the blank at 00505 starts the body, so the
    // `*` at 00504 and the `$` at 00503 are read with the body latch up and the zero-suppress
    // latch still down — right of the code at 00502 — and each takes an A character like a
    // blank. `002456` at 00300-00305 therefore lands 6, 5, 4 into 00505, 00504, 00503 and 2, 0,
    // 0 into 00502, 00501, 00500; scan 2 blanks the two leading zeros.
    expect(edited('002456', '  0$* ').b).toBe('  2456');
    // OUTSIDE IT. Control `bb0$*` at 00500-00504 has nothing blank or zero right of the `$` and
    // the `*`, so the rightmost blank-or-zero is the `0` at 00502 itself and both characters are
    // STATUS — "status: undisturbed", the other half of §7.1's two rows. `345` at 00300-00302
    // fills 00502-00500 and both status characters stand.
    expect(edited('345', '  0$*').b).toBe('345$*');
  });
});

// ═══ 6. Scan 2's own latches — the manual's second worked example (S223-2698 pp.50-51) ════

describe('`E` — scan 2 re-arms zero suppression after text (S223-2698 p.51)', () => {
  it('edits the CARS example the manual prints', () => {
    // p.51, verbatim: "If a character that is not a significant digit (1-9), blank, comma, 0,
    // minus sign or decimal is encountered after the zero suppress latch is reset and before the
    // decimal control latch is set, the zero suppress latch is set again. Zeros and commas sensed
    // before the next significant digit are replaced with `*` or blanks; for example, a B-field
    // containing `000100bCARSbb00200,000.75` after the first scan becomes `100 CARS 200,000.75`
    // during the second scan if the asterisk fill latch is off."
    //
    // The manual prints its result with the blank runs compressed, as a printed line rather than
    // as 25 storage positions. The exact blank counts are not a second fact: they follow from the
    // scan-1 string it prints in full plus the rule it states in the same sentence. Every
    // position asserted below is one of those two.
    //
    // SETUP. `E 00315 00524`: A field `0001000020000075` at 00300-00315 word-marked at 00300,
    // control word `000000&CARS&&00000,000.00` at 00500-00524 word-marked at 00500 — the
    // rightmost `0` is the units position 00524, so the whole control word is body and scan 2
    // walks all 25 positions.
    //
    // SCAN 1, right to left, is the string the manual prints: the `&`s at 00506, 00511 and 00512
    // become blanks (§7.1), the `,` at 00518 and the `.` at 00522 stand where written, `CARS`
    // stands (a body `C` and `R` are not the status `CR` — that rule is gated on the body latch
    // being OFF), and every `0` takes its A digit. 16 data-taking positions for 16 A characters,
    // so LA = 16 and AAR = 00315 − 16 = 00299. The `.` at 00522 is read with the code already
    // sensed, so it sets scan 1's decimal-control latch.
    //
    // SCAN 2, left to right from 00500, blank fill: the three leading zeros blank; the `1` at
    // 00503 is the first significant digit and resets the zero suppress latch, so the `00` of
    // `100` survive; the blank at 00506 is exempt; the `C` at 00507 is not in p.51's exemption
    // list and SETS THE LATCH AGAIN; `ARS` and the two blanks pass; the zeros at 00513-00514
    // blank because the latch is back on; the `2` at 00515 resets it again for good; the comma,
    // the point and the trailing digits all stand. WITHOUT the re-arm those two zeros survive and
    // the line reads `   100 CARS  00200,000.75` — the `00200` the manual's own answer does not
    // print. Two scans (decimal control with a significant digit, §7.3 row 5):
    // BAR = 00524 + 1 = 00525.
    const control = '000000&CARS&&00000,000.00';
    const m = mce('0001000020000075', control);

    // Scan 1 is observable one position at a time: the I phase is a single `stepCycle()` and
    // each of the 25 scan-1 B-cycles is one more (phase-1b.md §4 Wave D).
    expect(m.stepCycle().phase).toBe('I');
    for (let i = 0; i < control.length; i++) expect(m.stepCycle().phase).toBe('E');
    expect(chars(m, B_LEFT, control.length), 'after scan 1, the string the manual prints')
      .toBe('000100 CARS  00200,000.75');

    expect(m.step(), 'the skid and scan 2 finish the instruction').toBeUndefined();
    expect(chars(m, B_LEFT, control.length)).toBe('   100 CARS    200,000.75');
    expect(m.regs.bar, '§7.3 row 5 — the code at 00524, + 1').toBe(525);
    expect(m.regs.aar, 'A − LA = 00315 − 16').toBe(299);
  });
});

// ═══ 7. Figure 7's `Z` and `D` — the two terms only MCE develops (opcodes.md §1.5) ════════

describe('`E` — the `Z` and `D` timing terms reach the row (opcodes.md §1.5, §2)', () => {
  it('reports `Z` for a two-scan edit and `D` = 0 with no floating dollar', () => {
    // §1.5: `Z` is "chars in the B field from the start of zero suppression to the LEFT END of
    // the B field" and `D` "chars in the B field from the start of zero suppression to the `$`
    // insert point; 0 if none". Row 2's edit: code 00503, B high-order 00500, so Z = 4 — which
    // is also scan 2's cycle count. No `$` is stored, so D = 0.
    // T = 4.5(L + 1 + A + 1.5B + 1.5Z + 1.5D) = 4.5(11 + 1 + 6 + 1.5·7 + 1.5·4 + 0) = 155.25.
    const m = mce('002574', '   0.  ');
    expect(m.step()).toBeUndefined();
    expect(m.cpu.microsecondsSimulated).toBe(tEdit(11, 6, 7, 4, 0));
    expect(m.cpu.microsecondsSimulated).toBe(155.25);
  });

  it('reports `D` for the floating dollar, and `Z` = `D` = 0 for the single-scan case', () => {
    // Row 7's edit: code 00502, B high-order 00500 → Z = 3; the `$` lands at 00502 → D = 1, the
    // scan-3 cycle count. L = 11, LA = 5, LB = 6.
    const dollar = mce('00025', ' $0.  ');
    expect(dollar.step()).toBeUndefined();
    expect(dollar.cpu.microsecondsSimulated).toBe(tEdit(11, 5, 6, 3, 1));
    // Row 1's edit: no suppression started, so §1.5's "start of zero suppression" does not
    // exist and both terms are 0. L = 11, LA = LB = 4.
    const plain = mce('1234', '    ');
    expect(plain.step()).toBeUndefined();
    expect(plain.cpu.microsecondsSimulated).toBe(tEdit(11, 4, 4, 0, 0));
  });
});
