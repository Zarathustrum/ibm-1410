// src/ui/period/paper/carriage.ts — where the IBM 1403 MODEL 2's carriage HAS BEEN, recovered
// from the two things a snapshot carries. Plan §4.2 and §5.2 (docs/plans/phase-4-period-ui.md),
// wave 1.
//
// Sources, all of them about the 1403 Model 2 on a 1410 and none of them about a 1401:
// research/io.md §7 "Carriage tape" (A22-0526-3 pp.68, 71-72, 81, Figures 90 and 91 — the twelve
// channels, the space and skip rules, and "a skip to a channel the brushes are already positioned
// on moves to the next punch of that channel"); io.md §5 Figure 35 (A22-0526-3 p.36 — "Carriage 9
// and 12 indicators turn on when their hole IS SENSED and off when any other carriage-tape channel
// is sensed"); `src/core/types.ts:377-381`, whose FORM-count rule is stated as the WRAP rather
// than as a skip to channel 1 so that it stays true for a tape this shop does not run.
//
// `MachineState.printer` is `{ carriage, paper }` (`machine.ts:496`) — a DESTINATION and a paper,
// never a motion history — so the four functions below reconstruct the motion from the last print
// on the last inked form and the final carriage position (§5.2 writes out how a caller gets `from`
// and `to`).
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · It does not fix the straddle. The real fix is `printer1403.ts:347-352`'s own documented one —
//    call `senseChannels()` from `advanceOneLine()` and delete the two calls after the loops — and
//    it is a `src/core` change that would move `test/golden/cycle-probe.page.txt`. Phase 4 SHOWS
//    the divergence and escalates it; see the ledger comment below.
//  · It never reaches `Printer1403`. `CarriageTape` is a TYPE-ONLY import: this module reads a
//    tape's punching and can never call `senseChannels`, which is the very thing whose sampling
//    rate it exists to draw. It declares no second `DEFAULT_CARRIAGE_TAPE` and no second
//    `CARRIAGE_SENSES_AT_DESTINATION_ONLY` — core's are cited, never copied.
//  · It touches no DOM node (§3.8's required-path list).

import type { CarriageTape } from '../../../core/devices/printer1403.js';
import { CARRIAGE_D_TABLE } from '../../../core/isa/dmods.js';
import type { PrintLine } from '../../../core/types.js';

export interface FormPosition { readonly form: number; readonly line: number }
export interface TapePunch   { readonly line: number; readonly channel: number }

/**
 * The twelve channels, read off core's `CARRIAGE_D_TABLE` rather than typed here: the immediate-skip
 * rows ARE the channel list (`isa/dmods.ts`, opcodes.md §6.4 / A22-0526-3 p.81 Figure 90). A tape
 * need not be punched on all twelve — this shop's is punched on three — and the strip draws all
 * twelve so the empty ones are visible as empty.
 *
 * The twelve themselves are `[verified]`: io.md §7 "Carriage tape" (A22-0526-3 pp.68, 71-72). It
 * lives HERE and not in the drawn `printer/carriageView.ts` because plan §0 bullet 1 names "twelve
 * carriage channels" among the numbers that live in a DOM-free module, tested in node.
 */
export const CARRIAGE_CHANNELS: readonly number[] = [...new Set(
  CARRIAGE_D_TABLE.filter((r) => r.mode === 'immediateSkip').map((r) => r.value),
)].sort((a, b) => a - b);

/**
 * OPEN: `STRADDLE_IS_SHOWN_NOT_FIXED` / `CROSSED_PUNCH_IS_DERIVED_FROM_THE_LAST_PRINT_AND_THE_FINAL_CARRIAGE`
 * — a RULING, ours (§15), over a KNOWN DIVERGENCE from a `[verified]` sentence. One ledger row,
 * two names, because the ruling and the derivation that implements it are cited at two different
 * points of use: this file, and the drawn `printer/carriageView.ts` of wave 2.
 *
 * The sentence: io.md §5 Figure 35 (A22-0526-3 p.36), verbatim — "Carriage 9 and 12 indicators
 * turn on when their hole IS SENSED and off when any other carriage-tape channel is sensed." The
 * brushes ride the tape, so on iron every line the form passes under them during a space or a skip
 * is sensed. The shipped device senses ONCE, at the destination line
 * (`CARRIAGE_SENSES_AT_DESTINATION_ONLY`, `printer1403.ts:329-354` — core's constant, cited here,
 * not redeclared), so a punch crossed in passing leaves its indicator where it was.
 *
 * FALLBACK TAKEN: derive the crossed punch from the last printed position on the form plus the
 * final `snapshot().printer.carriage`, mark only what those two prove, and state the under-report
 * at the point of use with `STRADDLE_BANNER`. Three alternatives are named and refused in §5.2:
 * a PAPER-ONLY rule (blind to a motion whose destination never printed — exactly the cycle probe,
 * whose form 3 prints at line 59 and nothing at 60 or 61); a PER-FRAME `CarriageState` diff
 * (`START_BUDGET = 2000`, `machine.ts:45`, merges motions inside one frame); a `PrintEvent[]`
 * replay (`types.ts:359-362` carries no position, and the automatic single space emits no event
 * at all).
 *
 * THE LIMIT THIS DERIVATION HAS, NAMED in the shape §5.2 names its three refusals: the span from
 * the last print to the final carriage can cover MORE THAN ONE motion, so a punch the carriage
 * LANDED on inside that span — and therefore SENSED — is reported as crossed. **No shipped deck
 * exhibits it**: `cycle-probe` lands on the channel-9 punch at line 57 BEFORE its last print at
 * form 3 line 59, and `sales-summary`'s closing eject from form 3 line 11 stops on neither 57 nor
 * 60. The condition that would expose it is a print after line 57 or 60 followed by a further skip
 * that lands on the other punch; **Phase 6's trajectory report is to be checked against it when it
 * lands** (plan §16 item 8). No machinery is added for it — a limit stated is worth more than a
 * guard nothing exercises, which is the same argument §5.2 makes against the three derivations
 * above.
 *
 * WHAT WOULD SETTLE IT: nothing external — the manual sentence is already `[verified]` and the
 * device is already wrong about it. The fix is `printer1403.ts:347-352`'s own "fix path" paragraph,
 * a `src/core` change that moves `test/golden/cycle-probe.page.txt`, so Phase 4 escalates rather
 * than takes it — the `RW#` / `WM#` / `loader.ts:90` precedent (PHASE-2-NOTES.md §4;
 * open-questions.md line 411).
 */
export const STRADDLE_IS_SHOWN_NOT_FIXED = true;
export const CROSSED_PUNCH_IS_DERIVED_FROM_THE_LAST_PRINT_AND_THE_FINAL_CARRIAGE = true;

/**
 * Every position the carriage occupied getting from `from` to `to` — EXCLUSIVE of `from`,
 * INCLUSIVE of `to`, one entry per `advanceOneLine` (`printer1403.ts:632-639`), whose wrap rule is
 * the whole of the form count: past the last line of the form, the next position is line 1 of the
 * NEXT form (`types.ts:377-381`). `from === to` is no motion and returns empty.
 *
 * Throws past `formLines` advances: a motion no `Printer1403` can make, because `skipToChannel` is
 * bounded at one full form (`printer1403.ts:655-657`) and a space is at most three lines. The
 * bound is also what turns an unreachable `to` — a line off the form, a form behind the carriage —
 * into an error instead of a hang.
 */
export function traversed(
  from: FormPosition,
  to: FormPosition,
  formLines: number,
): readonly FormPosition[] {
  const out: FormPosition[] = [];
  let { form, line } = from;
  while (form !== to.form || line !== to.line) {
    if (line >= formLines) { form += 1; line = 1; } else { line += 1; }
    out.push({ form, line });
    if (out.length > formLines) {
      throw new Error(
        `traversed: form ${to.form}, line ${to.line} is more than one ${formLines}-line form from `
        + `form ${from.form}, line ${from.line} — no carriage motion is (printer1403.ts:655-657)`,
      );
    }
  }
  return out;
}

/**
 * The punches the motion CROSSED and did not end on: `traversed(...)` less its last entry, matched
 * against `tape.punches` BY LINE, because one loop of tape runs past the brushes once per form.
 * `from` is excluded by `traversed`'s own contract — the carriage was already positioned there and
 * `senseChannels()` ran on it — and the destination is dropped here for the same reason: the
 * device does sense it, so it is not part of the under-report.
 *
 * A single-line space can therefore never straddle: `traversed` returns exactly one entry and
 * dropping the destination leaves the empty list. That falls out of the definition rather than
 * being a special case, and `test/period-carriage.test.ts` asserts it directly so that a
 * `traversed` that ever became inclusive of `from` fails there first.
 */
export function straddled(
  from: FormPosition,
  to: FormPosition,
  tape: CarriageTape,
): readonly TapePunch[] {
  const crossed = traversed(from, to, tape.formLines).slice(0, -1);
  const out: TapePunch[] = [];
  for (const position of crossed) {
    for (const punch of tape.punches) {
      if (punch.line === position.line) out.push(punch);
    }
  }
  return out;
}

/**
 * §5.2's "HOW A CALLER GETS `from`", and the `from` §13 criterion 9 names —
 * `straddled(lastPrintedOn(form 3), …)`. The highest `line` among the paper's entries on `form`,
 * `undefined` when that form printed nothing. The caller writes
 * `lastPrintedOn(paper, lastInkedForm(paper) ?? to.form) ?? to` — the last INKED form's last print,
 * never the carriage's own form, for the reason `lastInkedForm` below states — so a paper with no
 * ink gives `from === to` and `straddled` returns empty BY CONSTRUCTION rather than by a special
 * case here.
 */
export function lastPrintedOn(
  paper: readonly PrintLine[],
  form: number,
): FormPosition | undefined {
  let line = 0;
  for (const printed of paper) {
    if (printed.page === form && printed.line > line) line = printed.line;
  }
  return line === 0 ? undefined : { form, line };
}

/**
 * The other half of §5.2's `from`, and the half every shipped deck needs: the highest FORM the
 * paper carries ink on, `undefined` for a paper with none. `to` is the final carriage, and every
 * demo's closing `EOJ CC1 1` parks it on a form that printed nothing — so the caller composes
 * `lastPrintedOn(paper, lastInkedForm(paper) ?? to.form) ?? to` and asks the last INKED form for
 * its last print rather than the carriage's own form, which would report nothing
 * (§13 criterion 9; `CROSSED_PUNCH_IS_DERIVED_FROM_THE_LAST_PRINT_AND_THE_FINAL_CARRIAGE`).
 */
export function lastInkedForm(paper: readonly PrintLine[]): number | undefined {
  let form = 0;
  for (const printed of paper) if (printed.page > form) form = printed.page;
  return form === 0 ? undefined : form;
}

/**
 * Asserted VERBATIM in `test/period-carriage.test.ts` and again on the live deck in
 * `test/period-printer.test.ts` (§13 criterion 9), so a later silent "fix" to the carriage model
 * fails a test instead of quietly deleting a caption.
 */
export const STRADDLE_BANNER = (p: TapePunch): string =>
  `channel ${p.channel} at line ${p.line} passed unsensed — `
  + 'CARRIAGE_SENSES_AT_DESTINATION_ONLY (src/core/devices/printer1403.ts:354)';
