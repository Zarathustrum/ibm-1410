// src/ui/period/console/lightsView.ts — the 1415's indicator light panel, drawn from `lamps.ts`.
// Source: Phase-4 plan §8 (the panel, its box order, the sixteen driven, the reduced count), §8.2
// (omitted rather than darkened), §8.3 (colour, and the 1401 refusal), §8.4 (what the panel never
// shows), §4.9 (`PANEL_BOXES` / `OMITTED_LAMPS` / `lampsOf`), §3.3's lightsView row, §10.3 (inline
// style attributes — src/ui/styles/period.css is wave 5's), §11.3's first screenshot question (the
// box order), §13 criterion 14.
//
// WHICH MACHINE: the IBM 1415 Console Model 1's light panel on a 1410 — NOT a 1401's.
// console-and-physical.md §5 [verified] — S223-2648 Fig.3 p.8 for the geometry, A22-0526-3
// Figs.49-55 pp.52-55 for the lamp inventories. §5's own correction note names the mistake a
// builder makes: "STATUS is a labeled column immediately right of ARITH — do not omit it, and do
// not place I/O CHANNEL CONTROL directly after the CPU box." The drawn order is `PANEL_BOXES`'s
// order and nothing here re-sorts it.
//
// THE 1401 FACT THIS PANEL IS MOST LIKELY TO INHERIT, NAMED AND REFUSED (plan §2.2 fact 1, §8.3,
// §16 item 2): **nothing on this panel goes red on fault.** console-and-physical.md §11: "1415
// lamp/lens color has no primary source … The claim that labels light up red on fault is from a
// **1401** page and does **not** transfer to the 1415" [unverified for 1410]. The two check lamps
// and the STOP lamp are the temptation here, and they light in the SAME warm white as ZERO BALANCE.
//
// THE RIGHT END'S STACKING, from wave 0's bounded primary read (open-questions.md, Phase 4 / Wave
// 0, target (c)): §5 opens "Left-to-right box order across the panel", which reads as seven boxes
// in one row, but S223-2648 Fig.3 p.8 shows POWER and SYSTEMS CONTROLS stacked one above the other
// at the right end beside a full-height SYSTEM CHECK box — five frames across, the sixth and
// seventh sharing the last column. The left-to-right ORDER of the seven names is correct as written
// and is `PANEL_BOXES`'s; only the row implication is wrong. That read also confirmed the 103
// published positions the REDUCED label counts against.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It renders no register value, anywhere** (§8.4). The panel draws a legend and `ON` / `off`;
//    the [verified] negative behind that is console-and-physical.md §2, the 1410 showing no
//    register contents in lights. `OP` is a legitimate I RING legend and `A REGISTER SET` a
//    legitimate SYSTEM CHECK PROCESS legend, so the mechanical check is a grep over `MachineState`
//    FIELD READS and not over label text — and this file performs none: the snapshot goes straight
//    to `lampsOf`.
//  · **It computes nothing.** Which lamps exist, which are driven and which are lit is all
//    `lamps.ts`, DOM-free and node-tested against §5's markdown table in both directions.
//  · It draws no omitted lamp (the eight `OMITTED_LAMPS` entries are named in the REDUCED label as
//    absences, never as dark lenses, §8.2), and carries no CSS class of its own (wave 5's, §10.3).

import type { MachineState } from '../../../core/types.js';
import { make, type View } from '../dom.js';
import { PANEL_BOXES, lampsOf, type Lamp, type LampState } from './lamps.js';

// OPEN: `LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS` — `[unverified]`, and its other half is a REFUSAL.
// The 1415's lamp and lens colour has no primary source: A22-0526-3 Fig.57 p.59 and S223-2648
// Figs.1-3 are black and white (console-and-physical.md §13 row 1, §11). FALLBACK TAKEN: warm
// white / amber incandescent behind a clear-white lens on a charcoal panel with white silkscreen
// legends — `LAMP_LIT` / `LAMP_DARK` / `LEGEND` below, ONE inline colour per role, which wave 5
// hoists into `--lamp-lit` / `--lamp-dark` / `--lamp-lens` (plan §10.3). NEVER the 1401 red-fault
// convention, which is refused by name in this header, in `printer/panelView.ts`'s, and in
// `period.css`'s own comment. WHAT WOULD SETTLE IT: a colour photograph — the Postgirot Stockholm
// 1965 plate (console-and-physical.md §11) is the best free candidate. Plan §8.3, §15;
// open-questions.md, Phase 4 / Wave 4.
export const LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS = true;

// OPEN: `LAMP_GROUPS_ARE_SILKSCREEN_NOT_LENS_COLOUR` — `[unverified]`. Whether the 1415's lights
// are colour-coded by group (console-and-physical.md §13 row 9). FALLBACK TAKEN: one uniform lamp
// colour for the whole panel, with the boxes and their sub-groups separated by silkscreened borders
// — `GROUP_BORDER` below, one colour, which wave 5 hoists into `--lamp-group-border`. Every lamp
// in every group shares `LAMP_LIT`. WHAT IT WOULD COST TO FLIP: one CSS rule per box. Plan §8.3,
// §15; open-questions.md, Phase 4 / Wave 4.
export const LAMP_GROUPS_ARE_SILKSCREEN_NOT_LENS_COLOUR = true;

/**
 * The panel says on the page that it is not the figure (plan §8.2, §13 criterion 14). The counts
 * are wave 0's read of S223-2648 Fig.3 p.8 against `OMITTED_LAMPS`'s eight entries: 103 published,
 * 18 omitted, 85 drawn. Without this label the most authoritative-looking artifact on the desk is
 * quietly a fiction.
 */
export const REDUCED_PANEL_LABEL =
  'REDUCED PANEL — 85 of the 103 lamp positions published in S223-2648 Figure 3 p.8 are drawn. '
  + 'Eighteen are omitted rather than drawn dark, because a dark lens reads as an uninstalled '
  + 'option on a machine that has the slot: the CH 2 column of I/O CHANNEL CONTROL and the CH 2 '
  + 'column of I/O CHANNEL STATUS (twelve positions), CH 1\'s two OVERLAP positions, the two '
  + 'SYSTEMS CONTROLS positions for the Priority feature and for running as a 1401, and the two '
  + 'POWER positions for tape and for disk. This machine has none of those things at all — '
  + 'architecture.md §12.';

const PANEL = '#2f2f2f';
const LEGEND = '#e8e8e8';
const LAMP_DARK = '#3a3a3a';
const LAMP_LIT = '#f2ecd2';
const GROUP_BORDER = '#7d7a73';

/** One lens: a silkscreened legend on a clear lens, dark until `lampsOf` lights it. */
function lens(lamp: Lamp): HTMLElement {
  const e = make('span');
  e.textContent = lamp.label;
  e.style.display = 'inline-block';
  e.style.background = LAMP_DARK;
  e.style.color = LEGEND;
  e.style.border = `1px solid ${LAMP_DARK}`;
  e.style.padding = '.1em .35em';
  e.style.margin = '0 .2em .2em 0';
  e.style.fontSize = '.68em';
  e.setAttribute('title', lamp.source === null ? `NOT MODELLED — ${lamp.cite}` : lamp.cite);
  return e;
}

const framed = (title: string, strong: boolean): HTMLElement => {
  const e = make('div');
  e.style.border = `1px solid ${GROUP_BORDER}`;
  e.style.padding = strong ? '.3em' : '.2em';
  e.style.margin = strong ? '0 .3em .3em 0' : '0 0 .25em 0';
  const cap = make('div');
  cap.textContent = title;
  cap.style.fontSize = strong ? '.7em' : '.62em';
  cap.style.color = GROUP_BORDER;
  cap.style.letterSpacing = '.06em';
  e.append(cap);
  return e;
};

const line = (t: string): HTMLElement => {
  const e = make('div');
  e.textContent = t;
  e.style.margin = '.35em 0 0 0';
  e.style.fontSize = '.8em';
  e.style.color = LEGEND;
  return e;
};

export function createLightsView(): View {
  // Keyed by the `Lamp` record itself, so nothing here depends on `lampsOf` returning its entries
  // in `PANEL_BOXES`'s order — the ORDER on the page is `PANEL_BOXES`'s, read straight off it.
  const lenses = new Map<Lamp, HTMLElement>();

  const row = make('div');
  row.style.display = 'flex';
  row.style.alignItems = 'stretch';
  row.style.flexWrap = 'wrap';

  // Fig.3 p.8's right end: POWER over SYSTEMS CONTROLS, stacked in the last column beside a
  // full-height SYSTEM CHECK. Built lazily so the ORDER stays `PANEL_BOXES`'s and nothing here
  // names a box the data does not carry.
  let stack: HTMLElement | undefined;

  for (const spec of PANEL_BOXES) {
    const box = framed(spec.title, true);
    let group: HTMLElement | undefined;
    let groupName: string | null = null;
    for (const lamp of spec.lamps) {
      const e = lens(lamp);
      lenses.set(lamp, e);
      if (lamp.group === null) { box.append(e); group = undefined; groupName = null; continue; }
      if (group === undefined || lamp.group !== groupName) {
        groupName = lamp.group;
        group = framed(lamp.group, false);
        box.append(group);
      }
      group.append(e);
    }
    if (spec.box === 'power' || spec.box === 'systemControls') {
      if (stack === undefined) {
        stack = make('div');
        stack.style.display = 'flex';
        stack.style.flexDirection = 'column';
        row.append(stack);
      }
      stack.append(box);
    } else {
      row.append(box);
    }
  }

  const heading = make('div');
  heading.textContent = '1415 indicator light panel';

  const el = make('div');
  el.style.background = PANEL;
  el.style.color = LEGEND;
  el.style.padding = '.6em';
  el.append(
    heading, row,
    line(REDUCED_PANEL_LABEL),
    line('A lamp with no state behind it is drawn dark and is NOT MODELLED: this emulator has no '
      + 'value for it, and the panel says so rather than implying it knows more than it does. '
      + 'Hover a lens for its citation.'),
    line('One lamp colour for the whole panel — warm white behind a clear lens on charcoal, with '
      + 'the boxes and their sub-groups separated by silkscreened borders and never by lens '
      + 'colour. No lamp here changes colour to signal a fault: that convention belongs to another '
      + 'machine and does not transfer to the 1415 (console-and-physical.md §11).'),
  );

  // Rendered from the animation frame, so it rebuilds only when a lamp actually changed
  // (readerView.ts:72-84's rule, carried across; plan §14 R7).
  let cached = '';
  return {
    el,
    render(s: MachineState): void {
      const states = lampsOf(s);
      const next = states.map((l: LampState) => (l.lit ? '1' : '0')).join('');
      if (next === cached) return;
      cached = next;
      for (const state of states) {
        const e = lenses.get(state.lamp);
        if (e === undefined) continue;
        e.style.background = state.lit ? LAMP_LIT : LAMP_DARK;
        e.style.color = state.lit ? '#222' : LEGEND;
        e.setAttribute('aria-label', `${state.lamp.label} ${state.lit ? 'ON' : 'off'}`);
      }
    },
  };
}
