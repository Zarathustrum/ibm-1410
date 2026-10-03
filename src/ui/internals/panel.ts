// src/ui/internals/panel.ts — the internals page's layout, and everything on it that is not a
// console control: registers, the seven indicator latches, channel 1, the core slice, the
// console log, and the cycle counter.
// Source: docs/plans/architecture.md §6 "Internals surface", §12 (no framework — vanilla DOM
// against a grid); plan §8 "In the browser", §9 (the panel is explicitly ugly and explicitly
// anachronistic).
//
// `snapshot()` is the single read path: nothing here reaches into the machine's parts
// (docs/plans/architecture.md §2 B11 — `MachineState` is structured-cloneable so the machine can
// move into a Worker later without a boundary change).

import type { ChannelStatus, IndicatorName, MachineState } from '../../core/types.js';
import { renderSelectric } from '../period/console/selectric.js';
import { createCoreView } from './coreView.js';
import { createRegisterView } from './registerView.js';

export interface View {
  readonly el: HTMLElement;
  render(s: MachineState): void;
}

// ── the four DOM helpers the whole page is built from ──────────────────────
export const make = (tag: string, cls?: string): HTMLElement => {
  const e = document.createElement(tag);
  if (cls !== undefined) e.className = cls;
  return e;
};
export const cell = (t: string): HTMLElement => {
  const e = make('td');
  e.textContent = t;
  return e;
};
export const row = (...cells: readonly HTMLElement[]): HTMLElement => {
  const e = make('tr');
  e.append(...cells);
  return e;
};
export const table = (): HTMLElement => make('table');

function box(legend: string, ...children: readonly (HTMLElement | string)[]): HTMLElement {
  const f = make('fieldset');
  const l = make('legend');
  l.textContent = legend;
  f.append(l, ...children);
  return f;
}

/** The seven latches of research/opcodes.md §8 — three arithmetic, four compare. Not six: */
/** "six" in this project always means `ChannelStatus`, which is the box beside this one. */
const INDICATORS: readonly (readonly [IndicatorName, string])[] = [
  ['arithOverflow', 'OVERFLOW'], ['zeroBalance', 'ZERO BAL'], ['divideOverflow', 'DIV OVF'],
  ['compareHigh', 'HIGH'], ['compareEqual', 'EQUAL'], ['compareLow', 'LOW'],
  ['compareUnequal', 'UNEQUAL'],
];

/** The six channel-1 status indicators of research/io.md §5, plus the per-channel interlock. */
const CHANNEL: readonly (readonly [keyof ChannelStatus, string])[] = [
  ['notReady', 'NOT READY'], ['busy', 'BUSY'], ['dataCheck', 'DATA CHECK'],
  ['condition', 'CONDITION'], ['wrongLengthRecord', 'WRONG LENGTH'], ['noTransfer', 'NO TRANSFER'],
];

interface Panel {
  readonly el: HTMLElement;
  render(s: MachineState, note: string): void;
}

export function createPanel(hooks: { base(addr: number): void }): Panel {
  const registers = createRegisterView();
  const core = createCoreView();

  const indicatorCells = new Map<IndicatorName, HTMLElement>();
  const indicatorTable = table();
  for (const [name, label] of INDICATORS) {
    const v = cell('off');
    indicatorCells.set(name, v);
    indicatorTable.append(row(cell(label), v));
  }

  const channelCells = new Map<string, HTMLElement>();
  const channelTable = table();
  for (const [name, label] of [...CHANNEL, ['interlock', 'INTERLOCK'] as const]) {
    const v = cell('off');
    channelCells.set(name, v);
    channelTable.append(row(cell(label), v));
  }

  // The core slice's base address, typed. `machine.windowBase` is what it sets (machine.ts).
  // `createElement('input')` is typed `HTMLInputElement` by the DOM lib; `make()` returns the
  // widened `HTMLElement`, so this one element is built directly rather than cast back down.
  const baseInput = document.createElement('input');
  baseInput.value = '00000';
  baseInput.size = 5;
  baseInput.maxLength = 5;
  baseInput.addEventListener('change', () => {
    const n = Number.parseInt(baseInput.value, 10);
    if (Number.isInteger(n) && n >= 0) hooks.base(n);
  });

  const log = make('pre');
  const counters = make('div');
  const status = make('div');
  let logged = -1;

  const el = make('div', 'grid');
  el.append(
    box('registers', registers.el),
    box('indicators — the seven latches', indicatorTable),
    box('channel 1', channelTable),
  );
  const coreBox = box('core — base ', baseInput, core.el);
  coreBox.className = 'wide';
  const logBox = box('1415 console printer', log);
  logBox.className = 'wide';
  const stateBox = box('machine', status, counters);
  stateBox.className = 'wide';
  el.append(coreBox, logBox, stateBox);

  return {
    el,
    render(s: MachineState, note: string): void {
      registers.render(s);
      core.render(s);
      for (const [name] of INDICATORS) flag(indicatorCells.get(name), s.indicators[name]);
      for (const [name] of CHANNEL) flag(channelCells.get(name), s.channel1[name]);
      flag(channelCells.get('interlock'), s.channel1.interlock);

      // Only when the printer has actually typed: rebuilding 10,000 characters of log on every
      // animation frame is the one thing on this page that could cost real time.
      if (s.console.length !== logged) {
        logged = s.console.length;
        log.textContent = renderSelectric(s.console, { matrix: 'flush', marks: 'render', spacing: 'render' });
        log.scrollTop = log.scrollHeight;
      }

      // NEVER a clock. Zarathustrum's settled decision is instruction-accurate with a cycle counter and no
      // cycle-accurate timing claims; `microsecondsSimulated` is a cycle count at 4.5 µs, not a
      // wall time (docs/plans/architecture.md §6; plan §9 risk row).
      counters.textContent =
        `${s.instructions} instructions   ${round(s.microseconds)} µs simulated (4.5 µs cycle)`;
      status.textContent = `${note}${s.stop === undefined ? '' : `   stop: ${s.stop}`}`;
    },
  };
}

const round = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function flag(e: HTMLElement | undefined, on: boolean): void {
  if (!e) return;
  e.textContent = on ? 'ON' : 'off';
  e.className = on ? 'on' : 'off';
}
