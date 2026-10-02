// Tier 4 (smoke) — the run-time word-mark creation pattern in `cc01.cor`.
// research/emulators.md §4.2 and §4.5, verified byte-for-byte against CC01A listing PAGE 3
// (PDF p.11) over 02180-02319.
//
// CC01A's branch-on-word-mark test works by storing op codes WITHOUT word marks and setting
// them at run time: 02181 holds `J 02226` unmarked, and the 6-character Set Word Mark at 02188
// creates the mark. "A .cor loader must copy the WM bit verbatim and must never infer word
// marks from instruction boundaries." If the loader infers them, the `N` at 02180 stops after
// one character instead of scanning eight, and this test fails loudly — which is the point.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { bcdOfGlyph } from '../src/core/bcd.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { loadCor } from '../src/formats/cor.js';
import type { Addr } from '../src/core/types.js';
import { ORACLES_ABSENT_MESSAGE, oraclePath } from './oracles.js';

function cc01Machine(): Machine {
  const path = oraclePath('cc01.cor');
  if (path === null) throw new Error(ORACLES_ABSENT_MESSAGE);
  const bytes = readFileSync(path);
  // `zeroFill: 'keep'` — cc01.cor fills with 0x40, a valid blank, so nothing needs normalising
  // and byte identity is asserted for this image in cor.test.ts (architecture.md §9 row C9).
  const img = loadCor(bytes.slice().buffer as ArrayBuffer, { zeroFill: 'keep' });
  const m = createMachine({ size: 10_000 });
  m.loadImage(img);
  return m;
}

/** The two identical sites: the unmarked branch, the Set Word Mark that marks it, the `N`. */
interface Site { noOp: Addr; branch: Addr; setWm: Addr; afterSetWm: Addr }
const SITES: readonly [string, Site][] = [
  ['02180 / 02181 / 02188', { noOp: 2180, branch: 2181, setWm: 2188, afterSetWm: 2194 }],
  ['02233 / 02234 / 02241', { noOp: 2233, branch: 2234, setWm: 2241, afterSetWm: 2247 }],
];

describe.skipIf(!oraclePath('cc01.cor'))('cc01.cor run-time word marks (emulators.md §4.2, §4.5)', () => {
  it.each(SITES)('%s — the branch op code loads WITHOUT a word mark, the `,` WITH one', (_label, site) => {
    const m = cc01Machine();
    expect(m.storage.bcd(site.branch), 'BCD of `J`').toBe(bcdOfGlyph('J'));
    expect(m.storage.wm(site.branch), 'no word mark on the branch yet').toBe(false);
    expect(m.storage.bcd(site.setWm), 'BCD of `,` — a comma, not a halt (§4.2 correction)')
      .toBe(bcdOfGlyph(','));
    expect(m.storage.wm(site.setWm), 'the Set Word Mark is a real instruction').toBe(true);
    expect(m.storage.wm(site.noOp), 'and so is the No-Op ahead of it').toBe(true);
  });

  it.each(SITES)('%s — the `N` scans EIGHT characters, over the unmarked branch, to the `,`', (_label, site) => {
    const m = cc01Machine();
    m.addressSet(site.noOp);
    expect(m.step()).toBeUndefined();
    // opcodes.md §2 N row, "any (1, 2, 3, …)": the scan ends at the next word mark, which is
    // the Set Word Mark eight positions along — not at an inferred instruction boundary.
    expect(site.setWm - site.noOp).toBe(8);
    expect(m.regs.iar).toBe(site.setWm);
  });

  it.each(SITES)('%s — the 6-character `,` then CREATES the branch op code\'s word mark', (_label, site) => {
    const m = cc01Machine();
    m.addressSet(site.noOp);
    m.step();
    expect(m.step()).toBeUndefined();

    expect(m.storage.wm(site.branch), 'the op code is now word-marked').toBe(true);
    for (let a = site.branch + 1; a < site.setWm; a++) {
      expect(m.storage.wm(a), `${a} must stay unmarked`).toBe(false);
    }
    expect(m.storage.bcd(site.branch), 'data undisturbed — still `J`').toBe(bcdOfGlyph('J'));

    // Registers after a one-address Set Word Mark: NSI / A-1 / A-1 (opcodes.md §2 p.22).
    expect(m.regs.aar).toBe(site.branch - 1);
    expect(m.regs.bar).toBe(site.branch - 1);
    // NSI is the next word mark after the 6-character instruction. Wave 2 executes what is
    // there (`M %T0 01250 W` at 02194); this test stops at its doorstep.
    expect(m.regs.iar).toBe(site.afterSetWm);
    expect(m.storage.wm(site.afterSetWm)).toBe(true);
  });
});
