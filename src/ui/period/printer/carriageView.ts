// src/ui/period/printer/carriageView.ts — the IBM 1403 MODEL 2's carriage-control tape, drawn: the
// twelve-channel loop with this shop's punches on it, the brushes where the carriage now stands,
// the two sense indicators, and the punches a motion crossed WITHOUT SENSING.
// Source: Phase-4 plan §7.2 ("The carriage tape strip, drawn beside the form", "Crossed punches
// are drawn HATCHED"), §5.2 (how a caller gets `from` and `to`), §3.3's carriageView row,
// §10.3 (inline style attributes — src/ui/styles/period.css is wave 5's), §11 wave 2.
//
// WHICH MACHINE: the 1403 Model 2 on a 1410. Twelve carriage-tape channels and the skip/space
// rules are io.md §7 [verified] (A22-0526-3 pp.68, 71-72, 81, Figures 90 and 91); the channel-9 and
// channel-12 indicators are io.md §5 Figure 35 [verified] (A22-0526-3 p.36), "on when their hole IS
// SENSED and off when any other carriage-tape channel is sensed". Never a 1401.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · It computes no machine number. The form length and every punch come from the `CarriageTape`
//    handed over at construction — `machine.printer.tape`, THE SAME OBJECT the device skips
//    against, never a copy (`unitrecord/mount.ts:49-51`, where this wave hands it over) — and the
//    twelve channels are `CARRIAGE_CHANNELS`, imported from the DOM-free `paper/carriage.ts`,
//    where they are read off core's own `CARRIAGE_D_TABLE` and asserted in node (plan §0
//    bullet 1, §12).
//    The x/y arithmetic below is the DRAWING's grid, one unit per channel column and one per line
//    position; no tape dimension is claimed and none is published (plan §2.2).
//  · It never reaches `Printer1403`: `CarriageTape` is a TYPE-ONLY import and the straddle comes
//    from `paper/carriage.ts`'s pure functions, which is the divergence this view exists to draw.
//  · It fixes nothing. See `STRADDLE_IS_SHOWN_NOT_FIXED` in `paper/carriage.ts`: the real fix is
//    `printer1403.ts:347-352`'s own documented one and it would move
//    `test/golden/cycle-probe.page.txt`, so Phase 4 escalates and does not take it.
//  · It draws no 1403 panel legend — those are `printer/panelView.ts`'s (§7.2) — and it carries no
//    CSS class of its own, because `src/ui/styles/period.css` is wave 5's (plan §10.3).

import type { CarriageTape } from '../../../core/devices/printer1403.js';
import type { MachineState } from '../../../core/types.js';
import { make, svg, text, type View } from '../dom.js';
import {
  CARRIAGE_CHANNELS, STRADDLE_BANNER, lastInkedForm, lastPrintedOn, straddled,
} from '../paper/carriage.js';

/**
 * OPEN: `DEFAULT_CARRIAGE_TAPE` (`src/core/devices/printer1403.ts:212`) — `[unverified]`, existing.
 * **Core's constant, cited here and never redeclared**: this view draws whatever tape the machine
 * was built with, and the shipped default is core's.
 *
 * 66 lines; channel 1 at line 1, channel 9 at 57, channel 12 at 60. The twelve channels and the
 * skip/space rules are `[verified]` (io.md §7; A22-0526-3 pp.68, 71-72, 81), but NO MANUAL
 * PUBLISHES ANY SITE'S TAPE PUNCHING — a carriage tape is punched for the forms a shop actually
 * runs (`printer1403.ts:200-219`; open-questions.md line 344).
 *
 * FALLBACK TAKEN, AND THIS WAVE IS WHERE IT IS DISCHARGED: core's own stated fallback is "use it,
 * expose it as a constructor option, and RENDER IT in the printer view so it is visible rather than
 * assumed". This file is that rendering — the loop strip below carries the tape's punches, its
 * brushes and its two sense indicators, so a reader sees the guess instead of inheriting it.
 * Editing the tape from the page stays out of scope: it needs a core constructor option and this
 * shop runs one form (plan §2.2, §15).
 *
 * WHAT WOULD SETTLE IT: a period carriage tape or a site's forms-control documentation. Phase 6
 * needs the tape unparameterised (plan §16 item 8b).
 */

/**
 * The drawing's grid, in user units: the left margin for line labels, the head for the channel
 * numbers, and the width of one channel column.
 *
 * `COLUMN` IS 3 AND NOT 2 BECAUSE OF THE HEADER ROW, and the choice is worth stating: at
 * `font-size: 1.6` a two-digit channel number is about 1.9 units wide, so in a 2-unit column
 * `10`, `11` and `12` ran together with no gap and the last three of twelve `[verified]` channels
 * could not be told apart (the wave-2 re-shoot). Widening the column is the fix rather than
 * shrinking those labels — they are the twelve numbers a reader most needs to read, and making
 * them the smallest type on the strip trades one unreadable thing for another — and rather than
 * `textLength`, which squeezes the glyphs and would give one- and two-digit numbers different
 * densities. `STRIP_WIDTH_PX` rises with it so the on-screen user unit does not shrink; every
 * other position on the strip is derived from `COLUMN` and follows on its own.
 */
const GUTTER = 5;
const HEAD = 3;
const COLUMN = 3;

/**
 * The drawn strip's width in CSS pixels — the DRAWING's box, not a tape dimension: no source
 * publishes one and plan §2.2 forbids printing one. Its height follows from the viewBox below.
 * It is `viewW` × 6, so one user unit is 6 px and the labels are 1.6 × 6 = 9.6 px whatever
 * `COLUMN` is; raising it is how the strip is made bigger without changing a single position.
 */
const STRIP_WIDTH_PX = 252;

/** One lamp colour, warm white behind a clear lens, inline until `period.css` takes it (§10.3). */
const LAMP_LIT = '#f4efdc';
const LAMP_DARK = '#3a3a3a';

const attrs = (e: SVGElement, a: Readonly<Record<string, string | number>>): SVGElement => {
  for (const [name, value] of Object.entries(a)) e.setAttribute(name, String(value));
  return e;
};

/** A lamp: dark until the machine says otherwise, one colour, its label silkscreened beside it. */
function lamp(label: string): { readonly el: HTMLElement; set(on: boolean): void } {
  const lens = make('span');
  lens.style.display = 'inline-block';
  lens.style.width = '.9em';
  lens.style.height = '.9em';
  lens.style.border = '1px solid #999';
  lens.style.marginRight = '.3em';
  lens.style.verticalAlign = '-.1em';
  const el = make('span');
  el.style.marginRight = '1.5em';
  el.append(lens, label);
  return {
    el,
    set(on: boolean): void { lens.style.background = on ? LAMP_LIT : LAMP_DARK; },
  };
}

export function createCarriageView(tape: CarriageTape): View {
  const heading = make('div');
  heading.textContent =
    `1403 carriage-control tape — ${CARRIAGE_CHANNELS.length} channels, `
    + `a ${tape.formLines}-line loop, punched `
    + `${tape.punches.map((p) => `channel ${p.channel} at line ${p.line}`).join(', ')}`;

  const note = make('div');
  note.textContent =
    'This is the machine\'s own tape object, the one the 1403 skips against — not a copy. Its '
    + 'punching is DEFAULT_CARRIAGE_TAPE (src/core/devices/printer1403.ts:212, [unverified]): no '
    + 'manual publishes any site\'s tape punching, so it is drawn here rather than assumed.';

  const nine = lamp('CHANNEL 9');
  const twelve = lamp('CHANNEL 12');
  const lamps = make('div');
  lamps.append(nine.el, twelve.el);
  const lampNote = make('div');
  lampNote.textContent =
    'Those two indicators are the emulator\'s readout of CPU-testable machine state — J (I) 9 and '
    + 'J (I) @, io.md §5 Figure 35, A22-0526-3 p.36 — and not 1403 front-panel lamps: the Figure 69 '
    + 'panel has neither.';

  // THE STRIP'S BOX, IN PIXELS, AS ATTRIBUTES ON THE `<svg>` ITSELF — and the wave-2 screenshot is
  // why. The `font-size: 1.6` below is what sizes the channel and line labels IN USER UNITS inside
  // the viewBox, but it is a presentation attribute on the root `<svg>`, so a CSS `width: 11em` on
  // that same element resolved against 1.6px and collapsed the strip to a sliver. Attributes cannot
  // be shrunk that way, `display: block` keeps it out of the inline formatting context, `flex: none`
  // stops any later flex parent (wave 5's desk) from squeezing it, and the wrapper carries the same
  // width so the box is declared twice and can collapse in neither.
  //
  // The DOM this builds, in shape:
  //   <div>…heading, note, lamps, lampNote…
  //     <div style="width:252px"><svg viewBox="0 0 42 71" width="252" height="426" …/></div>
  //     <div>…one banner per straddled punch…</div>
  //   </div>
  const viewW = GUTTER + CARRIAGE_CHANNELS.length * COLUMN + 1;
  const viewH = HEAD + tape.formLines + 2;
  const strip = svg('svg');
  attrs(strip, {
    viewBox: `0 0 ${viewW} ${viewH}`,
    width: STRIP_WIDTH_PX,
    // The drawing's own aspect, so the tape fills its box instead of being letterboxed by
    // `preserveAspectRatio`. Layout arithmetic over the viewBox — no tape dimension is claimed
    // and none is published (plan §2.2).
    height: Math.round((STRIP_WIDTH_PX * viewH) / viewW),
    'font-size': 1.6,
    'font-family': 'inherit',
  });
  strip.style.display = 'block';
  strip.style.flex = 'none';
  strip.style.border = '1px solid #ccc';
  const stripBox = make('div');
  stripBox.style.width = `${STRIP_WIDTH_PX}px`;
  stripBox.append(strip);

  const banners = make('div');

  const el = make('div');
  el.append(heading, note, lamps, lampNote, stripBox, banners);

  let key = '';

  /** Line `n`'s centre in the drawing's grid. */
  const rowY = (n: number): number => HEAD + n - 0.5;
  /** Channel `c`'s column centre. */
  const columnX = (channel: number): number =>
    GUTTER + CARRIAGE_CHANNELS.indexOf(channel) * COLUMN + COLUMN / 2;

  function paint(carriage: MachineState['printer']['carriage'], crossed: readonly number[]): void {
    const parts: SVGElement[] = [];

    // The tape itself, and one guide down each channel so an unpunched channel reads as unpunched.
    parts.push(attrs(svg('rect'), {
      x: GUTTER, y: HEAD, width: CARRIAGE_CHANNELS.length * COLUMN, height: tape.formLines,
      fill: '#fff', stroke: '#999', 'stroke-width': 0.15,
    }));
    for (const channel of CARRIAGE_CHANNELS) {
      parts.push(attrs(svg('line'), {
        x1: columnX(channel), y1: HEAD, x2: columnX(channel), y2: HEAD + tape.formLines,
        stroke: '#e2e2e2', 'stroke-width': 0.1,
      }));
      parts.push(attrs(text(String(channel)), {
        x: columnX(channel), y: HEAD - 0.8, 'text-anchor': 'middle', fill: '#444',
      }));
    }

    // Line positions: every tenth, plus every punched line, plus the line the brushes are on.
    const labelled = new Set<number>([carriage.line, ...tape.punches.map((p) => p.line)]);
    for (let n = 10; n <= tape.formLines; n += 10) labelled.add(n);
    for (const n of labelled) {
      parts.push(attrs(text(String(n)), {
        x: GUTTER - 0.5, y: rowY(n) + 0.6, 'text-anchor': 'end', fill: '#666',
      }));
    }

    // The punches. A crossed one is HATCHED — the motion passed it and the device did not sense it.
    for (const punch of tape.punches) {
      const x = columnX(punch.channel);
      const y = rowY(punch.line);
      const hatched = crossed.includes(punch.line);
      parts.push(attrs(svg('rect'), {
        x: x - 0.6, y: y - 0.4, width: 1.2, height: 0.8,
        fill: hatched ? '#fff' : '#222', stroke: '#222', 'stroke-width': 0.12,
      }));
      if (hatched) {
        for (const dx of [-0.6, 0]) {
          parts.push(attrs(svg('line'), {
            x1: x + dx, y1: y - 0.4, x2: x + dx + 0.6, y2: y + 0.4,
            stroke: '#222', 'stroke-width': 0.12,
          }));
        }
      }
    }

    // The brushes: they do not move, the tape does — so the marker is drawn at the line the tape
    // now presents to them, which is `CarriageState.line`.
    parts.push(attrs(svg('line'), {
      x1: GUTTER - 1.5, y1: rowY(carriage.line), x2: GUTTER + CARRIAGE_CHANNELS.length * COLUMN + 0.8,
      y2: rowY(carriage.line), stroke: '#222', 'stroke-width': 0.3,
    }));
    parts.push(attrs(text('brushes'), {
      x: GUTTER, y: HEAD + tape.formLines + 1.6, fill: '#444',
    }));

    strip.replaceChildren(...parts);
  }

  return {
    el,
    render(s: MachineState): void {
      const p = s.printer;
      const c = p.carriage;
      // The diff key of `printerView.ts:144-155`, carried: the paper is append-only, so its length
      // plus the five carriage fields is the whole of what can change.
      const next = `${p.paper.length}|${c.page},${c.line},${c.channel9},${c.channel12},${c.autoSpacePending}`;
      if (next === key) return;
      key = next;

      // THE DERIVATION, as the main session ruled it (`CROSSED_PUNCH_IS_DERIVED_FROM_THE_LAST_
      // PRINT_AND_THE_FINAL_CARRIAGE`, in its own words): `to` is the final carriage read as a
      // `FormPosition`, and `from` is the last print on the LAST INKED FORM — not on the carriage's
      // own form, because every shipped deck's closing `EOJ CC1 1` parks the carriage on a blank
      // form, where asking that form for its last print reports nothing at all. A paper with no ink
      // gives `from === to` and `straddled` returns empty BY CONSTRUCTION. The limit this span has
      // — it can cover more than one motion — is named in `paper/carriage.ts`'s `OPEN:` block.
      const to = { form: c.page, line: c.line };
      const punches = straddled(
        lastPrintedOn(p.paper, lastInkedForm(p.paper) ?? to.form) ?? to, to, tape,
      );

      nine.set(c.channel9);
      twelve.set(c.channel12);
      paint(c, punches.map((punch) => punch.line));
      banners.replaceChildren(...punches.map((punch) => {
        const e = make('div');
        e.textContent = STRADDLE_BANNER(punch);
        e.style.borderLeft = '3px solid #999';
        e.style.paddingLeft = '.5em';
        return e;
      }));
    },
  };
}
