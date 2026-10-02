// Tier 2 — `traversed`, `straddled` and the straddle banner. Plan §5.2, §12.1 T2, §13 criterion 9.
//
// THE ORACLE IS THE DEVICE'S OWN CARRIAGE RULES, cited and never re-implemented: `advanceOneLine`'s
// wrap (`printer1403.ts:632-639`, and `types.ts:377-381`'s statement of the form count as the WRAP
// rather than as a skip to channel 1), `skipToChannel`'s one-form bound
// (`SKIP_TO_UNPUNCHED_CHANNEL_ADVANCES_ONE_FORM`, `printer1403.ts:295-306`), and
// `CARRIAGE_SENSES_AT_DESTINATION_ONLY` (`printer1403.ts:329-354`) — the KNOWN DIVERGENCE the
// banner exists to caption. All three constants are IMPORTED from core here, so this file asserts
// the premises rather than restating them, and `DEFAULT_CARRIAGE_TAPE` is core's object, never a
// copy: 66 lines, channel 1 at line 1, channel 9 at 57, channel 12 at 60.
//
// These are the PURE functions. The live case — the same straddle derived from a real
// `demos/cycle-probe` run — is wave 2's `test/period-printer.test.ts`; nothing here runs a deck.
// The machine is the IBM 1403 Model 2 on a 1410 (io.md §7, A22-0526-3 pp.68, 71-72, 81).

import { describe, expect, it } from 'vitest';

import {
  CARRIAGE_SENSES_AT_DESTINATION_ONLY, DEFAULT_CARRIAGE_TAPE,
  SKIP_TO_UNPUNCHED_CHANNEL_ADVANCES_ONE_FORM, type CarriageTape,
} from '../src/core/devices/printer1403.js';
import {
  straddled, STRADDLE_BANNER, traversed, type FormPosition,
} from '../src/ui/period/paper/carriage.js';

const FORM_LINES = DEFAULT_CARRIAGE_TAPE.formLines;      // 66 — `[unverified]`, and core's
const at = (form: number, line: number): FormPosition => ({ form, line });

describe('§5.2 — `traversed`, over the motions the 1403 carriage can make', () => {
  it('from === to is no motion at all', () => {
    expect(traversed(at(1, 1), at(1, 1), FORM_LINES)).toEqual([]);
    expect(traversed(at(4, 33), at(4, 33), FORM_LINES)).toEqual([]);
  });

  it('a single-line space: exclusive of `from`, inclusive of `to`', () => {
    expect(traversed(at(1, 1), at(1, 2), FORM_LINES)).toEqual([at(1, 2)]);
  });

  it('the 2- and 3-line immediate spaces (`F` rows, printer1403.ts:627-630)', () => {
    expect(traversed(at(1, 1), at(1, 3), FORM_LINES)).toEqual([at(1, 2), at(1, 3)]);
    // The device's own example: space 3 from line 55 lands on 58 and crosses the channel-9 punch.
    expect(traversed(at(1, 55), at(1, 58), FORM_LINES))
      .toEqual([at(1, 56), at(1, 57), at(1, 58)]);
  });

  it('a skip that stays inside the form — `F 9` from home is 56 line positions', () => {
    const moved = traversed(at(1, 1), at(1, 57), FORM_LINES);
    expect(moved).toHaveLength(56);
    expect(moved[0]).toEqual(at(1, 2));
    expect(moved[moved.length - 1]).toEqual(at(1, 57));
    expect(moved.every((p) => p.form === 1)).toBe(true);
  });

  it('a skip that WRAPS: past the last line of the form is line 1 of the NEXT form', () => {
    // `F 1` from line 60 on DEFAULT_CARRIAGE_TAPE — the only event that increments the form count.
    const moved = traversed(at(1, 60), at(2, 1), FORM_LINES);
    expect(moved).toEqual([
      at(1, 61), at(1, 62), at(1, 63), at(1, 64), at(1, 65), at(1, 66), at(2, 1),
    ]);
    expect(traversed(at(1, FORM_LINES), at(2, 1), FORM_LINES)).toEqual([at(2, 1)]);
  });

  it('the one-form bound: a skip to an unpunched channel ends where it started, one form on', () => {
    expect(SKIP_TO_UNPUNCHED_CHANNEL_ADVANCES_ONE_FORM).toBe(true);
    const moved = traversed(at(1, 5), at(2, 5), FORM_LINES);
    expect(moved).toHaveLength(FORM_LINES);
    expect(moved[0]).toEqual(at(1, 6));
    expect(moved[moved.length - 1]).toEqual(at(2, 5));
  });

  it('past `formLines` advances throws — no Printer1403 can make that motion', () => {
    expect(() => traversed(at(1, 5), at(2, 6), FORM_LINES)).toThrow(/more than one 66-line form/);
    expect(() => traversed(at(2, 1), at(1, 1), FORM_LINES)).toThrow(/no carriage motion is/);
    expect(() => traversed(at(1, 1), at(1, 67), FORM_LINES)).toThrow(/no carriage motion is/);
  });
});

describe('§5.2 — `straddled`: the punches crossed and NOT landed on', () => {
  it('the cycle probe\'s crossing, on core\'s own DEFAULT_CARRIAGE_TAPE', () => {
    // Form 2 prints last at line 59; the closing motion leaves the carriage at line 61, so the
    // channel-12 punch at 60 was crossed. `CARRIAGE_SENSES_AT_DESTINATION_ONLY` is why the
    // device's channel-12 indicator is nevertheless false on that frame.
    expect(CARRIAGE_SENSES_AT_DESTINATION_ONLY).toBe(true);
    expect(straddled(at(2, 59), at(2, 61), DEFAULT_CARRIAGE_TAPE))
      .toEqual([{ line: 60, channel: 12 }]);
  });

  it('landing ON the punch is not straddling it — the device senses the destination', () => {
    expect(straddled(at(2, 59), at(2, 60), DEFAULT_CARRIAGE_TAPE)).toEqual([]);
  });

  it('a single-line space can NEVER straddle, from any line on the form', () => {
    // Not a special case: `traversed` returns one entry and dropping the destination empties it.
    // A `traversed` that ever became inclusive of `from` fails here first.
    for (let line = 1; line <= FORM_LINES; line += 1) {
      const to = line === FORM_LINES ? at(2, 1) : at(1, line + 1);
      expect(straddled(at(1, line), to, DEFAULT_CARRIAGE_TAPE), `from line ${line}`).toEqual([]);
    }
  });

  it('crossed iff strictly between: the channel-9 punch at line 57', () => {
    expect(straddled(at(1, 55), at(1, 58), DEFAULT_CARRIAGE_TAPE))
      .toEqual([{ line: 57, channel: 9 }]);
    expect(straddled(at(1, 55), at(1, 57), DEFAULT_CARRIAGE_TAPE)).toEqual([]);
    expect(straddled(at(1, 57), at(1, 59), DEFAULT_CARRIAGE_TAPE)).toEqual([]);
  });

  it('matches by LINE across a form break — one loop of tape per form', () => {
    // 65 -> {2,2} crosses 66 (unpunched) and line 1 of form 2, which carries the channel-1 home
    // punch. The tape does not know which form it is on; the brushes see line 1 either way.
    expect(straddled(at(1, 65), at(2, 2), DEFAULT_CARRIAGE_TAPE))
      .toEqual([{ line: 1, channel: 1 }]);
  });

  it('a skip the whole length of the form crosses every punch it did not land on', () => {
    expect(straddled(at(1, 1), at(2, 1), DEFAULT_CARRIAGE_TAPE))
      .toEqual([{ line: 57, channel: 9 }, { line: 60, channel: 12 }]);
  });

  it('the tape\'s own `formLines` is what wraps, not a constant here', () => {
    const short: CarriageTape = { formLines: 6, punches: [{ line: 4, channel: 9 }] };
    expect(straddled(at(1, 3), at(2, 1), short)).toEqual([{ line: 4, channel: 9 }]);
    expect(straddled(at(1, 3), at(1, 4), short)).toEqual([]);
  });
});

describe('§15 — the banner, character for character', () => {
  it('STRADDLE_BANNER({line: 60, channel: 12}) is exactly the sentence the ledger publishes', () => {
    // Asserted again on the live deck by wave 2's test/period-printer.test.ts (§13 criterion 9),
    // so a silent "fix" to the carriage model fails a test instead of deleting a caption.
    expect(STRADDLE_BANNER({ line: 60, channel: 12 })).toBe(
      'channel 12 at line 60 passed unsensed — '
      + 'CARRIAGE_SENSES_AT_DESTINATION_ONLY (src/core/devices/printer1403.ts:354)',
    );
  });

  it('it names the punch it was given', () => {
    expect(STRADDLE_BANNER({ line: 57, channel: 9 })).toBe(
      'channel 9 at line 57 passed unsensed — '
      + 'CARRIAGE_SENSES_AT_DESTINATION_ONLY (src/core/devices/printer1403.ts:354)',
    );
  });
});
