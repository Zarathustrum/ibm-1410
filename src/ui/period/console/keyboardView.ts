// src/ui/period/console/keyboardView.ts — the IBM 1415's Figure 43 keyboard, and the ONE focus
// region on the period surface that reads keystrokes.
// Source: Phase-4 plan §6.5 (the keyboard and focus ownership, all five rulings), §4.7
// (`ConsoleKeyboard` — the lock is UI state), §3.3's keyboardView row, §10.3 (inline style
// attributes — src/ui/styles/period.css is wave 5's), §11 wave 4 oracle (f), §13 criterion 18b,
// §15 `KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT` and `NO_KEY_TRAVEL_ANIMATION`.
//
// WHICH MACHINE: the IBM 1415 Console Model 1 on a 1410 — its modified Selectric keyboard, NOT a
// 1401's. console-and-physical.md §2 [verified] — A22-0526-3 Fig.43 p.47; S223-2648 Fig.8 p.11:
// "WORD MARK key at far left of the QWERTY row; LOCK and SHIFT keys … Number-row key tops: 4→:,
// 5→@/apostrophe, 6→square-root, 7→>, 0 printed as slashed Ø with `b` above, next key `ƀ` (blank)
// over `‡` (group mark), then `=#`. QWERTY row carries IBM specials (`#` over W, `)` over E, `%`,
// etc.). Which of the two glyphs actually prints depends on the type element." Two type elements
// ship — arrangement A (report writing) and H (program language), five characters apart
// (A22-0526-3 p.47) — which is what that last sentence is about, and why it is captioned on the
// page rather than left in this comment.
//
// THERE IS NO BACKSPACE ON THIS KEYBOARD, and no `backspace()` on `ConsoleKeyboard`.
// console-and-physical.md §2 [verified] — S223-2648 p.78; A22-0526-3 p.45: the physical Backspace
// key IS INQUIRY RELEASE, and "carrier return, backspace and index cannot be commanded from the
// keyboard." The only operator correction is INQ CAN, which discards the whole entry — a mistyped
// address or alter line is cancelled and retyped, exactly as at the desk. The page says so
// (`NO_BACKSPACE_NOTE`), and this handler maps the browser's Backspace onto nothing. ENTER IS THE
// SAME REFUSAL: no carrier return can be commanded, so Enter does nothing at all.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It never binds on `document` or `window`** — the named case is typing into the coding sheet
//    while the machine room is on screen, which a page-level listener eats silently (plan §6.5
//    rulings 1-2, 4; the OPEN block below; test/period-keydown-ownership.test.ts).
//  · **It computes nothing, holds no lock state and filters no glyph.** The lock lives in
//    `ConsoleKeyboard` (§4.7), DOM-free and node-tested; `press()` refuses anything outside the
//    1415's 64 by returning false (`bcdOfGlyph`, bcd.ts:147-150), the ONE place that judgement is
//    made. This file draws both.
//  · **It writes no refusal of its own either.** The line under the lock legend is
//    `ConsoleSession.notice` rendered verbatim — an address the machine refused, START in ALTER
//    with nothing displayed, an entry INQ CAN discarded. The session composes the sentence because
//    the session is what refused; this file is where the operator is looking when it does.
//  · **No key travel.** A key gets an inset + colour pressed state and nothing more — §15
//    `NO_KEY_TRAVEL_ANIMATION`: console-and-physical.md §3 publishes positions, not mechanics.
//  · It draws none of the three inquiry levers (`console/inquiryView.ts`'s), carries no CSS class
//    of its own (`period.css` is wave 5's, §10.3), and nothing on it is red (§2.2 fact 1).

import type { MachineState } from '../../../core/types.js';
import { make, type View } from '../dom.js';
import type { ConsoleSession } from './session.js';

// OPEN: `KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT` — a RULING of ours, NEW IN
// PHASE 4, not a machine claim. The 1415 keyboard shares a page with three `<textarea>`s and the
// two `<input>`s in the byte-frozen `controls.ts`. FALLBACK TAKEN: the console region is a
// `tabindex="0"` element with a visible focus ring; this file is the only one under `src/ui/**`
// that binds `keydown`; `press()` has exactly three callers, all under `src/ui/period/console/` —
// this handler, the drawn key tops below, and `ConsoleSession.keyBootstrap`. THE ALTERNATIVE,
// REJECTED: a `document`-level listener guarded against events whose target is a form control — a
// blacklist, so a new control on the desk silently reopens the defect and nothing fails. Reversing
// it is one listener move and the deletion of the test that forbids it. Plan §6.5, §13 criteria
// 18b and 19, §15; open-questions.md, Phase 4 / Wave 4.
export const KEYBOARD_LISTENS_ON_THE_CONSOLE_REGION_NEVER_ON_DOCUMENT = true;

/**
 * One drawn key top: `lower` is the legend on its lower half, `upper` the shift legend where Fig.43
 * prints one, and `glyph` what a CLICK sends to `press()` — the member of the pair that is in the
 * 1410's 64-character set, the lower one where both are (bcd.ts's `BCD_TABLE`). `null` is inert.
 */
interface KeyTop {
  readonly upper?: string;
  readonly lower: string;
  readonly glyph: string | null;
  readonly wordMark?: true;
  readonly wide?: number;
}

const k = (g: string): KeyTop => ({ lower: g, glyph: g });
const dual = (upper: string, lower: string, glyph: string | null): KeyTop =>
  ({ upper, lower, glyph });
const inert = (label: string, wide: number): KeyTop => ({ lower: label, glyph: null, wide });

/**
 * Figure 43 p.47, drawn as the figure gives it (console-and-physical.md §2 [verified]).
 *
 * Row 1 is the number row with its four named duals and the slashed graphic zero (`Ø`; C28-0351-5
 * p.2 — letter O is not slashed) under the `b` load-mode console printing uses for a blank. §2
 * names `‡` the group mark; this project's charset table calls `‡` the record mark and `⧧` the
 * group mark (bcd.ts ranks 45 and 5) — the GLYPH is what `press()` takes, and it is one of the 64
 * either way. §2 prints the last key as `=#` without saying which half is the shift legend: it is
 * drawn with `#` above, the row's own convention, and `#` is also the half in the print set (`=`
 * is not in the 64 at all), so a click sends `#`.
 *
 * Rows 2-4 are the QWERTY letters, WORD MARK at the far left of the QWERTY row, and LOCK and SHIFT
 * at the typewriter's own positions: §2 names those two without placing them, and neither is wired
 * — `press()` takes one glyph and this keyboard has no shift state (§4.7). §2 also names `%` among
 * the QWERTY row's IBM specials WITHOUT saying which key top carries it, so it goes in the caption
 * and on no key rather than being invented onto one.
 */
export const KEY_ROWS: readonly (readonly KeyTop[])[] = [
  [k('1'), k('2'), k('3'), dual(':', '4', '4'), dual('@', '5', '5'), dual('√', '6', '6'),
    dual('>', '7', '7'), k('8'), k('9'), dual('b', 'Ø', '0'), dual('ƀ', '‡', '‡'),
    dual('#', '=', '#')],
  [{ lower: 'WORD MARK', glyph: null, wordMark: true, wide: 3 },
    k('Q'), dual('#', 'W', 'W'), dual(')', 'E', 'E'), k('R'), k('T'), k('Y'), k('U'), k('I'),
    k('O'), k('P')],
  [inert('LOCK', 2), k('A'), k('S'), k('D'), k('F'), k('G'), k('H'), k('J'), k('K'), k('L')],
  [inert('SHIFT', 3), k('Z'), k('X'), k('C'), k('V'), k('B'), k('N'), k('M')],
  [{ lower: 'space', glyph: ' ', wide: 10 }],
];

/** §2's own sentence, on the page because the key tops are drawn from a figure that carries two. */
export const DUAL_LEGEND_CAPTION =
  'Which of the two glyphs actually prints depends on the type element — arrangement A (report '
  + 'writing) or arrangement H (program language), which differ in five characters. A drawn key '
  + 'top sends whichever of its two legends is in the machine\'s 64-character set, the lower one '
  + 'where both are; the other is typed. `%` is one of the QWERTY row\'s IBM specials and '
  + 'A22-0526-3 Figure 43 does not say which key top carries it, so it is drawn on none.';

/** The refusal, on the page rather than only in this header (console-and-physical.md §2). */
export const NO_BACKSPACE_NOTE =
  'There is no backspace: on the 1415 that key IS INQUIRY RELEASE, and carrier return, backspace '
  + 'and index cannot be commanded from the keyboard (S223-2648 p.78; A22-0526-3 p.45). INQ CAN '
  + 'is the only correction, and it discards the whole entry. Enter does nothing.';

/**
 * The WORD MARK key's keyboard chord. **Alt (Option) + W**, matched on `code` and not on `key`,
 * because Option+W produces `∑` on a Mac. `Ctrl+W` is deliberately NOT used: it closes the tab in
 * most browsers. It is NEVER `^` — that convention survives in exactly one place in the project,
 * `keyed()` in the byte-frozen `controls.ts:123`, where a text box on the internals tab is honest
 * (plan §6.5). The key itself is real and non-repeating (S223-2648 p.78).
 */
export const WORD_MARK_CHORD = 'Alt (Option) + W';

const PANEL = '#2f2f2f';
const KEY_FACE = '#e9e6df';
const KEY_EDGE = '#8d8a83';
const LEGEND = '#e8e8e8';
const UPPER_INK = '#6b6660';

/** Inset + colour, and nothing more (§15 `NO_KEY_TRAVEL_ANIMATION`). */
const pressed = (e: HTMLElement, on: boolean): void => {
  e.style.background = on ? '#cfcabf' : KEY_FACE;
  e.style.boxShadow = on ? `inset 2px 2px 0 ${KEY_EDGE}` : 'none';
};

/** One half of a key top: the shift legend above, the key's own legend below. */
const half = (t: string | undefined, upper: boolean): HTMLElement => {
  const e = make('div');
  e.textContent = t ?? '\u00a0';
  if (upper) { e.style.color = UPPER_INK; e.style.fontSize = '.8em'; }
  return e;
};

function keyTop(key: KeyTop, act: () => void): HTMLElement {
  const e = make('button');
  e.style.width = `${String(2.2 * (key.wide ?? 1))}em`;
  e.style.height = '2.6em';
  e.style.margin = '0 .18em .18em 0';
  e.style.padding = '.1em';
  e.style.border = `1px solid ${KEY_EDGE}`;
  e.style.font = 'inherit';
  e.style.fontSize = key.lower.length > 1 ? '.72em' : '1em';
  e.style.lineHeight = '1.1';
  e.style.verticalAlign = 'top';
  pressed(e, false);

  e.append(half(key.upper, true), half(key.lower, false));

  if (key.glyph === null && key.wordMark === undefined) {
    e.setAttribute('disabled', '');
    e.setAttribute('title', 'drawn and inert: this keyboard has no shift state');
    e.style.color = UPPER_INK;
    return e;
  }
  // The drawn key tops are §6.5 ruling 3's SECOND caller of press() — the first is the keydown
  // handler below, the third is ConsoleSession.keyBootstrap.
  e.addEventListener('click', act);
  e.addEventListener('pointerdown', () => { pressed(e, true); });
  e.addEventListener('pointerup', () => { pressed(e, false); });
  e.addEventListener('pointerleave', () => { pressed(e, false); });
  return e;
}

const line = (t: string): HTMLElement => {
  const e = make('div');
  e.textContent = t;
  e.style.margin = '.35em 0 0 0';
  e.style.fontSize = '.85em';
  e.style.color = LEGEND;
  return e;
};

export function createKeyboardView(
  session: ConsoleSession,
  kick: () => void,
): { readonly el: HTMLElement; readonly view: View; focus(): void } {
  // RULING 1: the console region is a focusable element with a visible focus ring, so a person can
  // see where the keystrokes are going. `el` and `view.el` are the SAME node — a mount appends it
  // once and pushes the view once.
  const el = make('div');
  el.setAttribute('tabindex', '0');
  el.style.background = PANEL;
  el.style.color = LEGEND;
  el.style.padding = '.6em';
  el.style.outline = 'none';

  const heading = make('div');
  heading.textContent = '1415 keyboard — Figure 43';

  const state = make('div');
  state.style.margin = '.3em 0';
  state.style.fontWeight = 'bold';

  // The session's last refusal, drawn where the operator is already looking for the lock legend.
  // Empty is the normal state and draws nothing at all; nothing here is red (§2.2 fact 1).
  const notice = make('div');
  notice.style.margin = '.3em 0';
  notice.style.fontSize = '.85em';
  notice.style.color = '#f2ecd2';

  const ring = (on: boolean): void => {
    el.style.outline = on ? '3px solid #f2ecd2' : '1px dashed #6b6660';
    el.style.outlineOffset = '2px';
  };
  ring(false);
  el.addEventListener('focus', () => { ring(true); });
  el.addEventListener('blur', () => { ring(false); });

  const press = (glyph: string): void => { if (session.keyboard.press(glyph)) kick(); };
  const mark = (): void => { session.keyboard.pressWordMark(); kick(); };

  const rows = KEY_ROWS.map((row) => {
    const e = make('div');
    e.append(...row.map((key) => keyTop(
      key,
      key.wordMark === undefined ? () => { press(key.glyph ?? ''); } : mark,
    )));
    return e;
  });

  // RULING 2: `keydown` is bound to THIS element and nowhere else — never `document`, never
  // `window`. One event maps to at most one glyph; `press()` makes every other judgement.
  el.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.altKey && ev.code === 'KeyW') { ev.preventDefault(); mark(); return; }
    // Enter is a carrier return, and no carrier return can be commanded (S223-2648 p.78).
    if (ev.key === 'Enter' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key.length !== 1) return;                    // Tab, the arrows, and the Backspace that
    // is INQUIRY RELEASE on the real machine and is bound to nothing here.
    // The browser's default is prevented only while the keyboard is UNLOCKED, so a locked console
    // still scrolls the page with the space bar. Read before press(), which can auto-lock (§4.7).
    if (session.keyboard.state !== 'locked') ev.preventDefault();
    press(ev.key.toUpperCase());
  });

  el.append(
    heading, state, notice, ...rows,
    line(DUAL_LEGEND_CAPTION),
    line(NO_BACKSPACE_NOTE),
    line(`WORD MARK is a real key and is non-repeating: press the drawn key or ${WORD_MARK_CHORD}. `
      + 'It prints a word mark and backspaces; the next character entered enters both. Click here '
      + 'to type — START in DISPLAY or ALTER, and INQUIRY REQUEST, take the focus on their own.'),
  );

  // Rendered from the animation frame, so it rebuilds only when the lock or the notice actually
  // moved (readerView.ts:72-84's rule, carried across; plan §14 R7). Keyed on the PAIR, because a
  // refusal can arrive without the lock moving — a refused address reopens the same field.
  let cached = '';
  const view: View = {
    el,
    render(_s: MachineState): void {
      const lock = session.keyboard.state;
      const said = session.notice ?? '';
      const next = `${lock}|${said}`;
      if (next === cached) return;
      cached = next;
      state.textContent = lock === 'locked'
        ? 'KEYBOARD LOCKED — nothing typed here reaches the machine'
        : `KEYBOARD UNLOCKED — ${lock.toUpperCase()} entry`;
      state.style.color = lock === 'locked' ? '#9a958d' : '#f2ecd2';
      notice.textContent = said;
    },
  };
  return { el, view, focus: (): void => { el.focus(); } };
}
