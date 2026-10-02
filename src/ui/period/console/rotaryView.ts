// src/ui/period/console/rotaryView.ts — the 1415 control console's six-detent MODE rotary, drawn at
// its published clock positions, and the CE door beside it, drawn closed.
// Source: Phase-4 plan §6.2 ("The rotary — `turnTo` in full", "C.E. is drawn and refused"), §2.2
// (the C.E. detent; no address dials; no priority panel), §3.3's rotaryView row, §10.3 (inline
// style attributes — src/ui/styles/period.css is wave 5's), §11 wave 4 oracle (a), §16 item 2.
//
// WHICH MACHINE: the IBM 1415 Console's control cabinet on a 1410 — the upright cabinet at the
// operator's right ([verified] — console-and-physical.md §1, A22-0526-3 Fig.57 p.59; S223-2648
// Fig.1 p.5). The MODE rotary has SIX positions: RUN at top, ADDRESS SET upper-left, DISPLAY
// upper-right, I/E CYCLE lower-left, ALTER lower-right, C.E. at bottom — clockwise from RUN,
// DISPLAY, ALTER, C.E., I/E CYCLE, ADDRESS SET ([verified] — console-and-physical.md §3,
// A22-0526-3 Fig.47 p.49; S223-2648 Fig.2 p.7).
//
// THE 1401 FACT THIS DIAL IS MOST LIKELY TO INHERIT, NAMED AND REFUSED (plan §2.2 fact 2, §16
// item 2): **the 1410 has no address-dial rotary switches.** console-and-physical.md §1 is
// verbatim — "The 1410 has **no** address-dial rotary switches (unlike the 1401). Addresses are
// typed on the console typewriter" [verified], A22-0526-3 pp.50-51. A 1401 photograph puts a bank
// of address dials under the operator's hand and it is the single most available wrong image for
// this cabinet. There is exactly ONE rotary on this desk and it is the MODE switch below; the
// address goes in on the keyboard, which is why §6.3's keyed dialogue is the design.
// The optional priority-feature panel that S223-2648 Fig.2 p.7 shows on the shelf above START and
// STOP is refused with the feature (plan §2.2; architecture.md §12) and is not drawn.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It computes no angle.** Every detent is placed at its entry in `ROTARY_ANGLE`
//    (`console/session.ts`, wave 4's DOM-free module) and the pointer reads the same table. The
//    trigonometry below places a drawn label on a circle; it decides nothing (plan §0 bullet 1).
//  · **It reads `session.detent`, never `machine.mode`.** They are deliberately different: DISPLAY
//    and C.E. are detents the four-member `ConsoleMode` façade (`machine.ts:38`) cannot name, so a
//    turn to either leaves `machine.mode` where it was. Drawing the pointer from `machine.mode`
//    would show the dial in the wrong position for two of its six detents (plan §6.2).
//  · **It calls no façade method.** A click calls `session.turn(mode)`, which is the ONE caller of
//    `turnTo` and the one place `machine.setMode` is reachable from this surface.
//  · **It binds no `keydown` and no `keypress`, and adds no listener to `document` or `window`**
//    (plan §6.5 rulings 1-2). It draws no key and no light — `console/keysView.ts` has those.
//  · It prints no dimension in inches and no time unit (plan §2.2).
//  · It carries no CSS class of its own; `period.css` is wave 5's (plan §10.3).

import { make, svg, text, type View } from '../dom.js';
import { ROTARY_ANGLE, type ConsoleSession, type PeriodMode } from './session.js';

// OPEN: `NO_KEY_TRAVEL_ANIMATION` — REFUSED, not open. Key travel, keycap depression depth and
// rotary detent torque on the 1415. console-and-physical.md §3 publishes detent POSITIONS and no
// mechanics (A22-0526-3 Fig.47 p.49, Fig.48 p.52), no photograph shows travel, and §9's dimension
// table does not contain the 1415 at all. FALLBACK TAKEN: **the pointer SNAPS.** Its `transform`
// attribute is set to the new detent's angle and there is no transition, no `Element.animate` and
// no intermediate position anywhere in this file; `console/keysView.ts` takes the other half — a
// pressed key gets an inset and a colour and nothing more. **A wrong animation is a claim; a snap
// is not.** The ANGLES are not this file's: `ROTARY_ANGLE` is `console/session.ts`'s, under
// `ROTARY_DETENTS_ARE_60_DEGREES_APART` — `[likely]` derived from `[verified]`, because §3 names
// six CLOCK positions and no page prints the degrees. Wave 0's bounded read strengthened that
// without closing it: six index dots measured off S223-2648 Fig.2 p.7 at 0.0 / 58.3 / 119.6 /
// 180.0 / 238.6 / 301.3°, consistent with 60° detents and still `[likely]`.
// WHAT WOULD SETTLE THE MECHANICS: a CE manual with a switch drawing, and nothing here changes.
// Plan §6.2, §2.2, §15 (line 3151); open-questions.md, Phase 4 / Wave 4.
export const NO_KEY_TRAVEL_ANIMATION = true;

/**
 * The six legends as the cabinet is silkscreened, keyed by the detent they belong to
 * ([verified] — console-and-physical.md §3, A22-0526-3 Fig.47 p.49). This is a LABEL table: the
 * positions are `ROTARY_ANGLE`'s and are not restated here.
 */
const LEGEND: Readonly<Record<PeriodMode, string>> = {
  run: 'RUN',
  display: 'DISPLAY',
  alter: 'ALTER',
  ce: 'C.E.',
  ieCycle: 'I/E CYCLE',
  addressSet: 'ADDRESS SET',
};

/** Clockwise from RUN, which is §3's own reading order for the dial. */
const DETENTS: readonly PeriodMode[] = ['run', 'display', 'alter', 'ce', 'ieCycle', 'addressSet'];

// The dial's own drawing geometry, in viewBox units. Nothing on the machine is measured in these:
// the cabinet has no published dimensions at all (console-and-physical.md §9), which is why this
// is a panel and not an elevation (plan §2.2).
const CX = 120;
const CY = 104;
const DIAL = 42;
const DOT = 54;
const LEGEND_RING = 82;

const PANEL = '#2c2c2c';
const KNOB = '#c9c4b8';
const INK = '#e8e8e8';
const ACTIVE = '#f2ecd2';

/** Where a drawn label sits for a detent angle: 0° at twelve o'clock, increasing clockwise. */
function at(angle: number, radius: number): { readonly x: number; readonly y: number } {
  const r = (angle * Math.PI) / 180;
  return { x: CX + radius * Math.sin(r), y: CY - radius * Math.cos(r) };
}

const line = (t: string): HTMLElement => {
  const e = make('div');
  e.textContent = t;
  return e;
};

/**
 * The CE panel's hinged door, drawn CLOSED (plan §2.2, §6.2).
 *
 * console-and-physical.md §3 [verified] (A22-0526-3 Fig.47 p.49, Fig.48 p.52, Fig.56 p.57, p.58;
 * S223-2648 Fig.2 p.7): "The CE panel lives behind a hinged door on the same control cabinet."
 * The door is drawn because the cabinet has one; what is behind it is NAMED and not modelled.
 * The naming is deliberately partial — the toggles §3's table lists for tape density, disk write
 * and 1401 compatibility belong to features architecture.md §12 refuses outright, so they are not
 * on this desk in any form, drawn, dark or named. And the closed door is what keeps PRINT OUT
 * CONTROL and START PRINT OUT off the page: they look like they answer `PROGRAM_STOP_TYPES_S`
 * (`machine.ts:67`, §15) and they are exactly the controls this phase must not appear to model.
 */
function ceDoor(): HTMLElement {
  const door = make('div');
  door.style.background = '#232323';
  door.style.border = `1px solid ${KNOB}`;
  door.style.borderLeftWidth = '4px';
  door.style.color = INK;
  door.style.padding = '.5em .6em';
  door.style.maxWidth = '26em';
  door.append(
    line('CE panel — door closed'),
    line('Behind it: ADDRESS ENTRY, STORAGE SCAN, CYCLE CONTROL, CHECK CONTROL, ASTERISK INSERT, '
      + 'PRINT OUT CONTROL, START PRINT OUT, the SENSE A-G and WM toggle column, and the CHECK '
      + 'TEST jacks. None of it is modelled, and none of it is drawn.'),
  );
  return door;
}

export function createRotaryView(session: ConsoleSession, kick: () => void): View {
  const heading = make('div');
  heading.textContent = 'Control console — MODE';

  const face = svg('svg');
  face.setAttribute('viewBox', '0 0 240 200');
  face.setAttribute('width', '260');
  face.setAttribute('role', 'img');
  face.setAttribute('aria-label', 'MODE rotary, six positions');

  const plate = svg('rect');
  plate.setAttribute('x', '0');
  plate.setAttribute('y', '0');
  plate.setAttribute('width', '240');
  plate.setAttribute('height', '200');
  plate.setAttribute('fill', PANEL);
  face.append(plate);

  const dial = svg('circle');
  dial.setAttribute('cx', String(CX));
  dial.setAttribute('cy', String(CY));
  dial.setAttribute('r', String(DIAL));
  dial.setAttribute('fill', KNOB);
  dial.setAttribute('stroke', '#8b8677');
  face.append(dial);

  // One group per detent: its index dot and its legend, both clickable, both placed from
  // `ROTARY_ANGLE`. A click TURNS THE SWITCH — `session.turn` is the only caller of `turnTo`, and
  // every real turn types its `S` line and halts the machine, because "any change of the
  // mode-switch setting causes a stop print-out" (console-and-physical.md §4 [verified],
  // A22-0526-3 p.50) and a stop is a stop (plan §6.2).
  const legends = DETENTS.map((mode) => {
    const angle = ROTARY_ANGLE[mode];
    const dot = svg('circle');
    const d = at(angle, DOT);
    dot.setAttribute('cx', d.x.toFixed(1));
    dot.setAttribute('cy', d.y.toFixed(1));
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', INK);

    const label = text(LEGEND[mode]);
    const p = at(angle, LEGEND_RING);
    label.setAttribute('x', p.x.toFixed(1));
    label.setAttribute('y', (p.y + 3).toFixed(1));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '11');
    label.setAttribute('fill', INK);

    const g = svg('g');
    g.setAttribute('cursor', 'pointer');
    g.append(dot, label);
    g.addEventListener('click', () => { session.turn(mode); kick(); });
    face.append(g);
    return { mode, dot, label };
  });

  // The pointer, drawn straight up and rotated to the detent. Setting the attribute IS the snap.
  const pointer = svg('g');
  const shaft = svg('line');
  shaft.setAttribute('x1', String(CX));
  shaft.setAttribute('y1', String(CY));
  shaft.setAttribute('x2', String(CX));
  shaft.setAttribute('y2', String(CY - DIAL + 4));
  shaft.setAttribute('stroke', '#1a1a1a');
  shaft.setAttribute('stroke-width', '5');
  const hub = svg('circle');
  hub.setAttribute('cx', String(CX));
  hub.setAttribute('cy', String(CY));
  hub.setAttribute('r', '7');
  hub.setAttribute('fill', '#1a1a1a');
  pointer.append(shaft, hub);
  face.append(pointer);

  const el = make('div');
  el.append(
    heading, face, ceDoor(),
    line('Six detents, and the pointer snaps between them: the sources publish positions, not '
      + 'mechanics, so nothing here animates.'),
    line('Turning the switch prints a stop line on the console typewriter and stops the machine — '
      + 'any change of the setting does, not only the STOP key.'),
    line('DISPLAY and C.E. are positions this emulator cannot name to the processor: the dial '
      + 'remembers where it points, and both print their stop line through the STOP path.'),
  );

  // The dial is a pure function of `session.detent` plus this one cached angle — the per-view diff
  // key of plan §10.2, and the reason the render takes no snapshot.
  let shown = '';
  return {
    el,
    render(): void {
      const mode = session.detent;
      if (mode === shown) return;
      shown = mode;
      pointer.setAttribute('transform', `rotate(${String(ROTARY_ANGLE[mode])} ${String(CX)} ${String(CY)})`);
      for (const l of legends) {
        const on = l.mode === mode;
        l.label.setAttribute('fill', on ? ACTIVE : INK);
        l.label.setAttribute('font-weight', on ? 'bold' : 'normal');
        l.dot.setAttribute('fill', on ? ACTIVE : INK);
      }
    },
  };
}
