// src/ui/internals/controls.ts — the real console controls, wired to the machine façade.
// Source: plan §1 and §8 (LOAD, START, STOP, PROGRAM RESET, COMPUTER RESET, and MODE =
// ADDRESS SET / ALTER / I/E CYCLE); research/console-and-physical.md §3 (the rotary and the
// keys) and §4 (the operator procedures). Phase 4 reuses this file verbatim (architecture.md §6).
//
// Every control below is a control the 1415 actually had, with one stated exception: LOAD is the
// emulator's file input — a `.cor` core image is Jay Jaeger's format, not a period artefact
// (research/emulators.md §6) — and it stands in for the 1402 read-in Phase 2 brings.

import type { ConsoleMode, Machine } from '../../core/machine.js';
import { loadCor } from '../../formats/cor.js';
import { make } from './panel.js';

/**
 * The WORD MARK key. The 1415 keyboard has one, at the far left of the QWERTY row, and a
 * word-marked character is entered by pressing it with the character
 * (research/console-and-physical.md §2, A22-0526-3 Fig.43 p.47). A text box has no such key, so
 * `^` prefixes the character it marks: `^A005Ø2` word-marks the `A` alone. `^` is deliberately
 * NOT one of the 64 machine characters (src/core/bcd.ts), so it can never collide with data.
 */
const WORD_MARK_KEY = '^';

const MODES: readonly (readonly [ConsoleMode, string])[] = [
  ['run', 'RUN'], ['addressSet', 'ADDRESS SET'], ['alter', 'ALTER'], ['ieCycle', 'I/E CYCLE'],
];

/**
 * `<select>.value` is a `string`; the rotary has four positions Phase 1 models. The lookup is
 * the narrowing — an `as ConsoleMode` would let any string through, and a rotary cannot be in a
 * position it does not have (research/console-and-physical.md §3, machine.ts `ConsoleMode`).
 */
const modeOf = (value: string): ConsoleMode | undefined =>
  MODES.find(([m]) => m === value)?.[0];

interface Hooks {
  /** MODE = RUN: drive `start()` from the animation frame until it stops. */
  run(): void;
  halt(): void;
  redraw(message?: string): void;
}

export function createControls(m: Machine, hooks: Hooks): { readonly el: HTMLElement } {
  const el = make('div');

  const file = input('file');
  file.accept = '.cor';
  const normalize = input('checkbox');
  normalize.checked = true;
  const address = input('text', '02000');
  const altered = input('text', '');
  altered.size = 40;

  const mode = document.createElement('select');
  for (const [value, label] of MODES) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    mode.append(o);
  }

  // A guard, not error handling for its own sake: `keyAddress`, `alter` and `loadCor` all refuse
  // bad operator input by throwing, and the page says why instead of dying (machine.ts).
  const guard = (fn: () => void) => (): void => {
    try { fn(); hooks.redraw(); } catch (e) { hooks.redraw(e instanceof Error ? e.message : String(e)); }
  };

  file.addEventListener('change', () => {
    const f = file.files?.[0];
    if (!f) return;
    // `insttest.cor` and `ilentest.cor` ship parity-invalid 0x00 fill; `cc01.cor` does not
    // (research/emulators.md §5.1). Normalising is a per-file, caller-chosen step, so it is a
    // checkbox and not a property of the loader (plan §6.1).
    void f.arrayBuffer().then((buf) => {
      guard(() => m.loadImage(loadCor(buf, { zeroFill: normalize.checked ? 'normalize' : 'keep' })))();
    });
  });

  // Turning the rotary is itself an operation: ANY change of setting types a stop print-out
  // (research/console-and-physical.md §3, §4; A22-0526-3 p.50).
  mode.addEventListener('change', guard(() => {
    const next = modeOf(mode.value);
    if (next === undefined) return;              // not a position the rotary has
    hooks.halt();
    m.setMode(next);
  }));

  // The START key does whatever the rotary says (machine.start()). In RUN the animation frame
  // owns the loop; in ALTER the operation IS the typed line, so START is what commits it.
  const start = guard(() => {
    if (m.mode === 'addressSet') m.keyAddress(address.value);
    if (m.mode === 'alter') {
      const { text, wordMarks } = keyed(altered.value);
      m.alter(text, wordMarks);
      return;
    }
    if (m.mode === 'run') { hooks.halt(); hooks.run(); return; }
    m.start();
  });

  el.append(
    'LOAD .cor ', file, label(' normalize 0x00 fill', normalize),
    br(),
    key('START', start),
    // "STOP: stops after the current instruction and prints the `S` line" (§3, A22-0526-3 p.52).
    key('STOP', guard(() => { hooks.halt(); m.stop(); })),
    // Neither reset types anything; COMPUTER RESET forces IAR -> 00001, which is exactly why
    // ADDRESS SET exists (§3; plan §1).
    key('PROGRAM RESET', guard(() => { hooks.halt(); m.programReset(); })),
    key('COMPUTER RESET', guard(() => { hooks.halt(); m.computerReset(); })),
    br(),
    'MODE ', mode,
    '   address ', address,
    // DISPLAY is the rotary's sixth position; here it is a key, because ALTER is defined only as
    // the thing that follows a display and the two are always keyed together (§4, machine.ts).
    key('DISPLAY', guard(() => { m.keyAddress(address.value); m.display(); })),
    br(),
    `alter (${WORD_MARK_KEY} = WORD MARK key) `, altered,
  );
  return { el };
}

/** `^X` = the WORD MARK key pressed with X. Splits the typed line into glyphs and marks. */
export function keyed(typed: string): { text: string; wordMarks: boolean[] } {
  const text: string[] = [];
  const wordMarks: boolean[] = [];
  let mark = false;
  for (const ch of typed) {
    if (ch === WORD_MARK_KEY) { mark = true; continue; }
    text.push(ch);
    wordMarks.push(mark);
    mark = false;
  }
  return { text: text.join(''), wordMarks };
}

function input(type: string, value?: string): HTMLInputElement {
  const e = document.createElement('input');
  e.type = type;
  if (value !== undefined) { e.value = value; e.size = 6; }
  return e;
}

function key(text: string, onClick: () => void): HTMLElement {
  const b = make('button');
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

function label(text: string, control: HTMLElement): HTMLElement {
  const l = make('label');
  l.append(control, text);
  return l;
}

const br = (): HTMLElement => make('div');
