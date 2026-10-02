// src/ui/period/console/inquiryView.ts — the 1415's three inquiry levers, and the request lamp.
// Source: Phase-4 plan §6.5 (Fig.43's levers: "INQUIRY RELEASE, INQ CAN and a tall INQUIRY REQUEST
// at right"), §6.6 (the inquiry hold, and why the hold latch is the UI's own), §4.8
// (`ConsoleSession.request / release / cancel`), §3.3's inquiryView row, §10.3 (inline style
// attributes — src/ui/styles/period.css is wave 5's).
//
// WHICH MACHINE: the IBM 1415 Console Model 1 on a 1410. console-and-physical.md §2 [verified] —
// S223-2648 p.78; A22-0526-3 p.45: "INQUIRY REQUEST = repurposed Carrier Return key lever;
// INQUIRY RELEASE = repurposed Backspace key; INQ CAN = repurposed Index key." Three real levers on
// the right of Fig.43 p.47, drawn in the figure's own order with INQUIRY REQUEST tall at the right.
// The sequence they drive is io.md §8: step 1 the key sets the inquiry status latch in the 1411,
// step 5 RELEASE completes the record, step 6 INQ CAN cancels it.
//
// WHAT REPLACES THE SHIPPED VIEW. This file replaces `period/unitrecord/inquiryView.ts` (deleted
// the same commit). Carried across: the levers, their order, and the reasoning that the typed
// message and the machine's reply are both `ConsoleLine`s in the console log rather than a log of
// this view's own. DROPPED: **the `^` text box.** A message is now TYPED on the drawn keyboard
// (`console/keyboardView.ts`) with a real, non-repeating WORD MARK key, so the `^` convention
// survives in exactly one place in the project — `keyed()` in the byte-frozen `controls.ts:123`,
// on the internals tab, where a text box is honest (plan §6.5).
//
// TWO INDICATORS, TWO LATCHES, AND THEY ARE NOT THE SAME BOOLEAN. The deleted view read
// `machine.console.pendingRequest` for its lamp and said why: the inquiry latch is DEVICE state and
// is not in the snapshot. Still true on this tree — `MachineState` (types.ts:409-439) carries no
// inquiry field, and the latch is `Channel.inquiryRequest` (types.ts:336), which reads
// `Console1415.pendingRequest` (channel.ts:221) and is not part of `channel1`'s
// `ChannelStatus & { interlock }`. Plan §6.6 rules that read "correct and stays correct" FOR THE
// LAMP, and that the hold is a different question taking a different latch — so:
//  · **INQUIRY REQUEST, the drawn lens, follows `latch()`** — the 1411's inquiry status latch, the
//    one `J iiiii Q` tests (io.md §5 Figure 35; isa/exec/branch.ts:67). `console/mount.ts` passes
//    `() => machine.console.pendingRequest`, the deleted view's own expression, so this file takes
//    no `Machine` (plan §3.3) and the device still owns the flag: it clears it inside `precheck()`
//    (console1415.ts:199) and `read()` (:290, :316), and the lens follows it there too.
//  · **HELD follows `ConsoleSession.held`**, the UI's OWN latch (§4.8, §6.6), captioned on the page
//    as the emulator's hold and not as an IBM legend.
// They diverge in both directions and that is the point: RELEASE clears `held` while the 1411 latch
// is still set until the program reads, and a program that requests and never reads leaves the lens
// lit with the hold long gone. A single boolean behind both would misdraw one of them.
//
// A LEVER IS DRAWN DEAD WHEN IT HAS NOTHING TO ACT ON, with the reason on it — the pattern
// `keysView.ts`'s four power keys, `reader/deckBoxView.ts`'s PUT DECK IN HOPPER and
// `coding/mount.ts`'s PUNCH already use. Both correction levers reached `ConsoleSession` in every
// state, and on an idle desk INQUIRY RELEASE queued an EMPTY entry on the device with nothing
// changed on this panel — the lens dark, HELD off — which the program's next console read consumed
// instead of reporting No Transfer. The session now refuses that (`session.ts`'s `supply()`), and
// this panel stops offering it. The two live-ness rules are NOT the same boolean and `render()`
// says why: RELEASE completes an inquiry record, INQ CAN corrects any open entry.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO: it holds no latch and computes nothing but which of its
// levers is live, from `held` and `pending` (both `ConsoleSession`'s); it draws no keyboard and no
// console log — the entry appears on the Selectric form as a pending row (`console/logView.ts`),
// because nothing is on the paper until the program's read types it;
// and it carries no CSS class of its own (`period.css` is wave
// 5's) and nothing on it is red (plan §2.2 fact 1; console-and-physical.md §11 — the 1401 red-fault
// convention, which does not transfer to the 1415).

import type { MachineState } from '../../../core/types.js';
import { make, type View } from '../dom.js';
import type { ConsoleSession } from './session.js';

const PANEL = '#2f2f2f';
const LEGEND = '#e8e8e8';
const LAMP_DARK = '#3a3a3a';
const LAMP_LIT = '#f2ecd2';

/**
 * WHY A LEVER IS DEAD, drawn as the title the way every inert control on this desk carries one
 * (`keysView.ts`'s four power keys, `reader/deckBoxView.ts`'s PUT DECK IN HOPPER,
 * `coding/mount.ts`'s PUNCH): a disabled control with no visible reason reads as a bug. A lever is
 * live exactly when it has something to act on, and `render()` below is where that is decided —
 * INQUIRY RELEASE completes an inquiry record and nothing else, while INQ CAN is the keyboard's one
 * correction and reaches a keyed address or alter line as well.
 */
const NOTHING_TO_RELEASE =
  'no entry to release: INQUIRY REQUEST opens the one this lever completes';
const ALREADY_SUPPLIED =
  'this entry is already with the machine: it types as an I line when the program reads it';
const NOTHING_TO_DISCARD =
  'nothing to discard: no address, alter line or inquiry message is open';

function lever(label: string, tall: boolean, act: () => void): HTMLButtonElement {
  // Built directly rather than through `make()` because `.disabled` is on HTMLButtonElement and
  // `make()` returns the widened HTMLElement — `deckBoxView.ts`'s PUT DECK IN HOPPER's reason.
  const e = document.createElement('button');
  e.textContent = label;
  e.style.height = tall ? '4.4em' : '2.1em';
  e.style.margin = '0 .3em .3em 0';
  e.style.font = 'inherit';
  e.style.fontSize = '.8em';
  e.style.verticalAlign = 'bottom';
  e.addEventListener('click', act);
  return e;
}

const line = (t: string): HTMLElement => {
  const e = make('div');
  e.textContent = t;
  e.style.margin = '.3em 0 0 0';
  e.style.fontSize = '.85em';
  e.style.color = LEGEND;
  return e;
};

export function createInquiryView(
  session: ConsoleSession,
  kick: () => void,
  latch: () => boolean,
): View {
  const heading = make('div');
  heading.textContent = '1415 inquiry — the three repurposed levers, Figure 43';

  const lamp = make('span');
  lamp.style.display = 'inline-block';
  lamp.style.padding = '.2em .5em';
  lamp.style.border = `1px solid ${LAMP_DARK}`;
  lamp.style.margin = '0 .6em .3em 0';

  const held = make('span');
  held.style.fontSize = '.85em';

  // Fig.43's own order along the right of the keyboard: RELEASE, INQ CAN, then the tall REQUEST.
  const releaseKey = lever('INQUIRY RELEASE', false, () => { session.release(); kick(); });
  const cancelKey = lever('INQ CAN', false, () => { session.cancel(); kick(); });
  const levers = make('div');
  levers.style.margin = '.4em 0';
  levers.append(
    releaseKey, cancelKey,
    lever('INQUIRY REQUEST', true, () => { session.request(); kick(); }),
  );

  const el = make('div');
  el.style.background = PANEL;
  el.style.color = LEGEND;
  el.style.padding = '.6em';
  el.append(
    heading, levers, lamp, held,
    line('INQUIRY REQUEST sets the inquiry status latch in the 1411 and unlocks the keyboard; type '
      + 'the message on the keyboard beside this panel, then INQUIRY RELEASE. The machine types it '
      + 'as an `I` line on the form when the program reads it, and not before.'),
    line('INQ CAN discards the whole entry — it is the only correction this keyboard has. A keyed '
      + 'address or alter line is dropped and the same field opens again for a retype; an open '
      + 'inquiry message is cancelled to the program. INQ CAN and INQUIRY RELEASE are drawn dead, '
      + 'with the reason on them, whenever there is no entry for them to act on.'),
    line('The INQUIRY REQUEST lens follows the inquiry status latch in the 1411 — the one a '
      + 'programmed branch tests — which the machine itself clears when it reads.'),
    line('HELD is not an IBM legend and is not that latch: it is this emulator holding its own run '
      + 'loop between REQUEST and RELEASE, so the operator types into a stopped machine. On the '
      + 'real 1411 the processor waited instead, and no program can tell the difference.'),
  );

  // Two booleans, rendered from the animation frame and keyed on the PAIR, because they move
  // independently (inquiryView.ts:64-74's rule, carried across; plan §14 R7) — plus the open
  // entry's id, which is what decides whether either lever has anything to act on.
  let cached = '';
  return {
    el,
    render(_s: MachineState): void {
      const pending = latch();
      const on = session.held;
      // WHAT EACH LEVER HAS TO ACT ON, from the session's public state alone. `held` is true only
      // between INQUIRY REQUEST and the release or cancel that ends it, so it IS "an inquiry entry
      // still being typed"; a pending row with any other id is a keyed address or alter line, which
      // INQ CAN discards and INQUIRY RELEASE has no business in. An `I` row with `held` already
      // false is the released entry waiting for the program's read (§6.6) — both levers are done
      // with it, and pressing either would have rewritten what the operator correctly supplied.
      const open = session.pending;
      const canCancel = on || (open !== undefined && open.id !== 'I');
      const next = `${String(pending)}${String(on)}${open?.id ?? '-'}`;
      if (next === cached) return;
      cached = next;
      releaseKey.disabled = !on;
      releaseKey.title = on ? '' : (open?.id === 'I' ? ALREADY_SUPPLIED : NOTHING_TO_RELEASE);
      cancelKey.disabled = !canCancel;
      cancelKey.title = canCancel ? '' : (open?.id === 'I' ? ALREADY_SUPPLIED : NOTHING_TO_DISCARD);
      lamp.textContent = 'INQUIRY REQUEST';
      lamp.style.background = pending ? LAMP_LIT : LAMP_DARK;
      lamp.style.color = pending ? '#222' : LEGEND;
      held.textContent = on ? 'HELD: ON — the run loop is stopped' : 'HELD: off';
      held.style.color = on ? LAMP_LIT : '#9a958d';
    },
  };
}
