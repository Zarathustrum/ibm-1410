// src/ui/internals/coreView.ts — a scrollable slice of core, ten positions to the row, with an
// OVERLINE where the word mark is set.
// Source: docs/plans/architecture.md §6 "Internals surface"; plan §8 "In the browser".
//
// Word marks live in bit 7 of the cell and are the whole reason this display exists: `cc01.cor`
// stores op codes WITHOUT them and sets them at run time (research/emulators.md §4.5), and demo
// 2's B field stops filling at one (plan §8). A hex dump would hide that; the overline is the
// manual's own inverted circumflex, flattened for a screen (research/console-and-physical.md §2).

import { glyphOf } from '../../core/bcd.js';
import { BCD6, WM, type MachineState } from '../../core/types.js';
import { type View } from './panel.js';

/** Positions on show. The snapshot carries 1,000 from `machine.windowBase` (machine.ts). */
const VISIBLE_POSITIONS = 200;
const PER_ROW = 10;

export function createCoreView(): View {
  const el = document.createElement('div');
  el.id = 'core';

  return {
    el,
    render(s: MachineState): void {
      const cells = s.coreWindow.cells;
      const frag = document.createDocumentFragment();
      for (let r = 0; r < VISIBLE_POSITIONS; r += PER_ROW) {
        if (r >= cells.length) break;
        const line = document.createElement('div');
        // The address every ten positions — the only orientation this display gives.
        line.append(text(`${String(s.coreWindow.base + r).padStart(5, '0')}  `));
        // Consecutive positions that agree about their word mark share one span, so a row of
        // unmarked core costs one node rather than ten.
        let run = '';
        let runWm = false;
        for (let i = r; i < r + PER_ROW && i < cells.length; i++) {
          const c = cells[i] ?? 0;
          const wm = (c & WM) !== 0;
          if (wm !== runWm && run !== '') { line.append(span(run, runWm)); run = ''; }
          runWm = wm;
          run += glyphOf(c & BCD6);
        }
        if (run !== '') line.append(span(run, runWm));
        frag.append(line);
      }
      el.replaceChildren(frag);
    },
  };
}

const text = (s: string): Text => document.createTextNode(s);

function span(s: string, wm: boolean): HTMLElement {
  const e = document.createElement('span');
  if (wm) e.className = 'wm';
  e.textContent = s;
  return e;
}
