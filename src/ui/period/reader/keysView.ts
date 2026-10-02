// src/ui/period/reader/keysView.ts — Figure 60's key and light strip along the top of the IBM 1402,
// in its published order, plus the three latches this emulator actually models.
// Source: Phase-4 plan §7.1 ("The Fig.60 key and light strip, in its published order"; "Of the five
// keys, exactly two are wired"; "Of Fig.60's twelve lights, not one has a `MachineState` field"),
// §2.2 fact 3 and §16 item 2 (the 1401 LOAD key, named and refused), §3.3's keysView row, §10.3
// (inline style attributes — src/ui/styles/period.css is wave 5's), §11 wave 3 oracles (d) and (e).
//
// WHICH MACHINE: the 1402 Card Read-Punch Model 2 on a 1410. The strip is [verified] —
// console-and-physical.md §7, A22-0526-3 Fig.60 p.61: "keys PUNCH START, PUNCH STOP; lights PUNCH
// READY, CHIPS, PUNCH CHECK, PUNCH STOP, STACKER, POWER, FUSE, TRANSPORT, VALIDITY, READER READY,
// READER CHECK, READER STOP; keys END OF FILE, READER STOP, READER START."
//
// THE 1401 FACT THIS STRIP IS MOST LIKELY TO INHERIT, NAMED AND REFUSED (plan §2.2 fact 3, §16
// item 2): **there is no LOAD key on the 1402.** software.md §10.1 is headed "The 1410 has no Load
// key" and §10.10 states the 1401 convention that does NOT apply — "pressing LOAD on the 1402 reads
// a card into 001-080, sets the I-address register to 001, sets a word mark at 001". Fig.60 p.61
// publishes FIVE keys and none of them is LOAD; the 1410 bootstrap stays keyed at the 1415. The
// absence is asserted as a STRING over the exported `KEY_LABELS` by test/period-reader.test.ts, not
// left to this comment.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · It computes nothing: every legend is §7's own text and every state is the snapshot's.
//  · **It keys its records by STRIP POSITION and never by label** — PUNCH STOP is both a key and a
//    light, READER STOP both a light and a key, so seventeen entries (2 + 12 + 3) are asserted
//    against §7's line and never a de-duplicated set.
//  · It wires no light: `MachineState.reader` is `{ hopper, buffered, eofKey, eofLatch, stackers }`
//    (types.ts §8) and none of those is any of the twelve published legends, so the strip is drawn
//    dark under the same not-modelled legend §8 gives the 1415 panel — POWER the one exception.
//  · It draws no card, no pocket and no hopper; no dimension in inches and no time unit (§2.2).
//  · It carries no CSS class of its own (`period.css` is wave 5's, plan §10.3). The dark lamp and
//    legend colours are `printer/panelView.ts:53-54`'s; the LIT value is introduced here, since
//    nothing on that panel is lit. Both are wave 5's custom properties later. Nothing is red
//    (§2.2 fact 1).
//  · **It creates no node at import time**: the tables below are DATA, so a `node` run can assert
//    the drawn strings without a DOM (cardFaceView.ts's rule; vite.config.ts:8-11).

import type { Machine } from '../../../core/machine.js';
import type { MachineState } from '../../../core/types.js';
import { make, type View } from '../dom.js';

/** One entry of Fig.60's strip: what it is, and the legend silkscreened on it. */
interface StripEntry {
  readonly kind: 'key' | 'light';
  readonly label: string;
}

/**
 * Figure 60 p.61, in published order and read left to right along the top of the machine
 * ([verified] — console-and-physical.md §7). Seventeen entries: two keys, twelve lights, three
 * keys. Two legends occur twice, which is why every consumer below indexes this array.
 */
const asKey = (label: string): StripEntry => ({ kind: 'key', label });
const asLight = (label: string): StripEntry => ({ kind: 'light', label });

export const STRIP: readonly StripEntry[] = [
  ...['PUNCH START', 'PUNCH STOP'].map(asKey),
  ...['PUNCH READY', 'CHIPS', 'PUNCH CHECK', 'PUNCH STOP', 'STACKER', 'POWER', 'FUSE', 'TRANSPORT',
    'VALIDITY', 'READER READY', 'READER CHECK', 'READER STOP'].map(asLight),
  ...['END OF FILE', 'READER STOP', 'READER START'].map(asKey),
];

/** The five drawn key legends and the twelve drawn light legends, DERIVED — never a second list. */
export const KEY_LABELS: readonly string[] =
  STRIP.filter((e) => e.kind === 'key').map((e) => e.label);
export const LIGHT_LABELS: readonly string[] =
  STRIP.filter((e) => e.kind === 'light').map((e) => e.label);

// OPEN: `POWER_AND_READY_ARE_DRAWN_LIT` — a RULING of ours, NEW IN PHASE 4. Not one of Fig.60's
// twelve lights has a field behind it in `MachineState.reader` (types.ts §8), so the strip is drawn
// dark — except that the machine in the room is ON. FALLBACK TAKEN: POWER, and only POWER, drawn
// lit as a CONSTANT and captioned as one on the page: an entry of `LIGHT_LABELS`, lit because
// `LIT_CONSTANTS` names it — no `Lamp` record and no `source` field, since no lamp here is in
// `PANEL_BOXES` at all. Wave 4 cites this same row for the 1415's POWER ON key and its separate
// READY light (console-and-physical.md §3, A22-0526-3 Fig.47 p.49). WHAT WOULD SETTLE IT: nothing
// external — the alternative is one entry drawn dark with the rest, and nothing keys on it.
// Plan §7.1, §11 wave 3 oracle (e), §15; open-questions.md, Phase 4 / Wave 3.
export const POWER_AND_READY_ARE_DRAWN_LIT = true;

/** The one legend drawn lit, because the machine is on. Asserted by test/period-reader.test.ts. */
export const LIT_CONSTANTS: readonly string[] = ['POWER'];

/** Wiring by STRIP POSITION, never by label: 14 is END OF FILE, 16 is READER START — the only two
 *  of the five keys the façade can act on (READER STOP is a key at 15 and a light at 13). */
const WIRED: Readonly<Record<number, (m: Machine) => void>> = {
  14: (m: Machine): void => { m.readerEndOfFile(); },
  16: (m: Machine): void => { m.readerStart(); },
};

/**
 * The keys drawn INERT — PUNCH START, PUNCH STOP, READER STOP — and the reason is the façade rather
 * than taste: `Machine`'s whole unit-record surface is `loadDeck`, `readerStart`, `readerEndOfFile`
 * and `endOfJob` (machine.ts:130-148). NO CALL EXISTS for READER STOP, so it is drawn and SAID
 * rather than drawn looking live and doing nothing (plan §7.1).
 *
 * DERIVED from `STRIP` and `WIRED`, the same table the view draws from and the same one that
 * decides inertness at the point of drawing — a hand-written second list could drift from it.
 */
export const INERT_KEYS: readonly string[] = STRIP
  .flatMap((e, position) => (e.kind === 'key' && WIRED[position] === undefined ? [e.label] : []));

/**
 * One lamp colour, warm white behind a clear lens; nothing is red (plan §2.2 fact 1). `LAMP_DARK`
 * and `LEGEND` are `printer/panelView.ts:53-54`'s values — that panel has nothing lit, so
 * `LAMP_LIT` is INTRODUCED HERE, for the one legend `LIT_CONSTANTS` names. Wave 5 hoists all three
 * into `--lamp-dark` / `--lamp-lit` / `--lamp-lens` under `LAMP_IS_WARM_WHITE_BEHIND_A_CLEAR_LENS`,
 * which is that wave's row and not this file's (plan §10.3).
 */
const LAMP_DARK = '#3a3a3a';
const LAMP_LIT = '#f2ecd2';
const LEGEND = '#e8e8e8';

/** The emulator's OWN indicators — readerView.ts:23's labels, not IBM legends. */
const FLAGS: readonly string[] = ['EOF KEY', 'EOF LATCH', 'READ BUFFER'];

function lamp(label: string, lit: boolean): HTMLElement {
  const e = make('span');
  e.textContent = label;
  e.style.display = 'inline-block';
  e.style.background = lit ? LAMP_LIT : LAMP_DARK;
  e.style.color = lit ? '#222' : LEGEND;
  e.style.border = `1px solid ${LAMP_DARK}`;
  e.style.padding = '.2em .5em';
  e.style.margin = '0 .4em .4em 0';
  return e;
}

function key(entry: StripEntry, position: number, machine: Machine, kick: () => void): HTMLElement {
  const e = make('button');
  e.textContent = entry.label;
  e.style.margin = '0 .4em .4em 0';
  const press = WIRED[position];
  if (press === undefined) {
    e.setAttribute('disabled', '');
    e.setAttribute('title', 'drawn and inert: no call exists for it');
  } else {
    // An operator action, so it redraws the whole page the way every console control does — the
    // animation frame would catch it a frame later, but the panel's own cells would not
    // (readerView.ts:50-58, carried across).
    e.addEventListener('click', () => { press(machine); kick(); });
  }
  return e;
}

const line = (t: string): HTMLElement => {
  const e = make('div');
  e.textContent = t;
  return e;
};

export function createKeysView(machine: Machine, kick: () => void): View {
  const heading = make('div');
  heading.textContent = '1402 key and light strip — Figure 60, in published order';

  // ONE pass over the strip, by position, so the published order is the drawn order.
  const strip = make('div');
  strip.style.margin = '.4em 0';
  strip.append(...STRIP.map((entry, position) => (entry.kind === 'key'
    ? key(entry, position, machine, kick)
    : lamp(entry.label, LIT_CONSTANTS.includes(entry.label)))));

  // The emulator's own strip, captioned as the emulator's and drawn next to END OF FILE — the same
  // shape END OF JOB has at the 1403 (plan §7.1, §7.2).
  const own = make('div');
  own.style.margin = '.4em 0';
  const flags = FLAGS.map(() => {
    const e = make('span');
    e.style.margin = '0 .8em 0 0';
    return e;
  });
  own.append(...flags);

  const el = make('div');
  el.append(
    heading, strip,
    line('The twelve lights are drawn dark: not one of them has a field in the machine state this '
      + 'emulator carries (A22-0526-3 Figure 60 p.61).'),
    line('POWER is drawn lit as a CONSTANT, because the machine in the room is on. Nothing is '
      + 'wired to it.'),
    line('PUNCH START, PUNCH STOP and READER STOP are drawn inert: no call exists for them on this '
      + 'emulator. The punch feed is driven by the running program — demos/reentry.asm writes its '
      + 'cards with P1 0,PAREA — as the read feed is once READER START has been pressed. END OF '
      + 'FILE and READER START are live.'),
    own,
    line('EOF KEY, EOF LATCH and READ BUFFER are not IBM legends: they are the three latches this '
      + 'emulator models, drawn beside the key that sets the first.'),
  );

  // readerView.ts:72-84's rule, carried across: rendered from an animation frame, so it rebuilds
  // only when a latch actually changed (plan §14 R7).
  let cached = '';
  return {
    el,
    render(s: MachineState): void {
      const r = s.reader;
      const next = `${String(r.eofKey)}${String(r.eofLatch)}${String(r.buffered)}`;
      if (next === cached) return;
      cached = next;
      [r.eofKey, r.eofLatch, r.buffered].forEach((on, i) => {
        const e = flags[i];
        if (!e) return;
        e.textContent = `${FLAGS[i] ?? ''}: ${on ? 'ON' : 'off'}`;
        e.style.color = on ? '#111' : '#bbb';
        e.style.fontWeight = on ? 'bold' : 'normal';
      });
    },
  };
}
