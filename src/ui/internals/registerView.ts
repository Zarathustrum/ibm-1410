// src/ui/internals/registerView.ts — the register file, as glyphs and five-digit addresses.
// Source: docs/plans/architecture.md §6 "Internals surface" (IAR/AAR/BAR/CAR/DAR/EAR/FAR, Op
// and Op-modifier as glyphs); plan §8 "In the browser".
//
// ANACHRONISM, stated once here and again on the page: the 1410 shows NO register contents in
// lights — every stop, display and alter goes out on the typewriter as a print-out line
// (research/console-and-physical.md §2, implementer summary item 2). This box is the deliberate
// anachronism DECISIONS.md 2026-08-30 settled, not a reconstruction of the 1415 light panel.

import { glyphOf } from '../../core/bcd.js';
import { BCD6, type MachineState } from '../../core/types.js';
import { cell, row, table, type View } from './panel.js';

const ADDRESS_REGISTERS = ['iar', 'aar', 'bar', 'car', 'dar', 'ear', 'far'] as const;

export function createRegisterView(): View {
  const el = table();
  const values = new Map<string, HTMLElement>();
  for (const name of ADDRESS_REGISTERS) {
    const v = cell('00000');
    values.set(name, v);
    el.append(row(cell(name.toUpperCase()), v));
  }
  // The Op and Op-modifier registers hold CELLS, not magnitudes, because the console prints them
  // as characters (src/core/registers.ts; research/architecture.md §6, A22-0526-3 Fig.5).
  const op = cell(' ');
  const opMod = cell(' ');
  el.append(row(cell('OP'), op), row(cell('OP MOD'), opMod));

  return {
    el,
    render(s: MachineState): void {
      for (const name of ADDRESS_REGISTERS) {
        const v = values.get(name);
        if (v) v.textContent = String(s[name]).padStart(5, '0');
      }
      op.textContent = glyphOf(s.op & BCD6);
      opMod.textContent = glyphOf(s.opMod & BCD6);
    },
  };
}
