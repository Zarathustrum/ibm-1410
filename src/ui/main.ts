// src/ui/main.ts — the page: ONE machine, ONE set of id lookups, the two-tab shell, and the ONE
// animation frame every surface renders from.
// Source: Phase-4 plan §3.1 (wave 0's file table), §10.1 (the shell), §10.2 (the frame, and the
// wave-5 row of its per-wave table), §10.7 row 5 (the mount chain at this wave).
//
// THIS IS THE WAVE-5 FORM OF THE FRAME, and it is the end state: wave 3 brought the period views'
// render loop up here and the second `requestAnimationFrame` died with `period/unitrecord/mount.ts`,
// wave 4 added the `held` / `detent` terms, and wave 5 replaces the three transitional period mounts
// with the ONE `mountPeriod` that hands back every `View`, the `ConsoleSession` and the desk's
// `dispatch` (§10.7 row 5).
//
// WHAT THIS FILE DOES NOT DO: it draws nothing and it holds no CSS class of its own. The two tab
// buttons are styled by one inline `fontWeight` — the technique plan §10.3 sanctions — because a
// class named here would be a rule `period.css` owes.

import { createMachine, START_BUDGET } from '../core/machine.js';
import { mountInternals } from './internals/mount.js';
import { mountPeriod } from './period/mount.js';
import './styles/period.css';

// ONE machine for the whole page — both tabs write through the same façade (plan §10.1).
const machine = createMachine({ size: 20_000 });

// THE THREE ID LOOKUPS, at start-up and never again (plan §3.1). `index.html` carries `#app` and
// the two tab containers it holds.
const app = document.getElementById('app');
const machineRoom = document.getElementById('machine-room');
const internals = document.getElementById('internals');

// THE RUN LATCH AND THE REPAINT REQUEST. `running` is set by the frozen controls' RUN hook and
// cleared by its STOP hook (`controls.ts:35-40` already declares the pair); `kick` is what every
// operator action calls — it travels down `hooks` to `mountPeriod`, which hands it to every station
// that acts on an operator's behalf.
let running = false;
let dirty = true;                                        // the first frame always renders
const kick = (): void => { dirty = true; };
const run = (): void => { running = true; };
const halt = (): void => { running = false; };

// THE PACING BLOCK (plan §10.6). The frame's budget is what this computes, never more than
// START_BUDGET.
// OPEN: REAL_TIME_PACING_IS_ONE_EMULATED_MICROSECOND_PER_REAL_MICROSECOND — a ruling, ours, UI only.
// The desk runs at 1411 speed so §1 step 7 is watchable.  START_BUDGET (machine.ts:45) is the
// CEILING and is never exceeded, so unpaced behaviour is exactly today's.
// FALLBACK: delete this and pass START_BUDGET, which is what the checkbox off-position does.
const MAX_CATCH_UP_MS = 100;      // a backgrounded tab must not dump seconds of flight into one frame
let paced = true;                 // default ON at the desk
let lastNow: number | undefined;
// THE BASELINE. The Cpu's two counters are never reset — not by COMPUTER RESET, not by a second
// job — so the average is taken over THIS run only, from the frame that (re)starts it. Without it a
// second job on the same page is paced by the first job's mix (the whole-branch review, 2026-10-02:
// the RPG extract after the reentry run took 1.25 s against its own 0.41 s).
let baseInstructions = 0;
let baseMicroseconds = 0;

const budgetFor = (now: number): number => {
  if (!paced) return START_BUDGET;
  if (lastNow === undefined) {
    baseInstructions = machine.cpu.instructions;            // the façade exposes the Cpu
    baseMicroseconds = machine.cpu.microsecondsSimulated;
  }
  const dtMs = lastNow === undefined ? 0 : Math.min(now - lastNow, MAX_CATCH_UP_MS);
  lastNow = now;
  const n = machine.cpu.instructions - baseInstructions;
  const usPerInstruction = n === 0 ? 1 : (machine.cpu.microsecondsSimulated - baseMicroseconds) / n;
  return Math.max(1, Math.min(START_BUDGET, Math.round((dtMs * 1000) / usPerInstruction)));
};

if (app !== null && machineRoom !== null && internals !== null) {
  // THE TWO-TAB SHELL. MACHINE ROOM is the default — §1's storyboard opens at the desk, not at the
  // panel — and switching hides one container, shows the other and kicks a frame, so the tab that
  // was hidden renders on the frame after it is shown.
  const bar = document.createElement('div');
  const machineRoomTab = document.createElement('button');
  const internalsTab = document.createElement('button');
  machineRoomTab.textContent = 'MACHINE ROOM';
  internalsTab.textContent = 'INTERNALS';
  // INLINE, because the bar sits in `#app` and `index.html`'s `input, select, button` rule is now
  // scoped under `#internals` (plan §10.3) — without this the two tabs fall to the browser's UI font.
  machineRoomTab.style.font = 'inherit';
  internalsTab.style.font = 'inherit';
  // THE 1411 SPEED CHECKBOX (plan §10.6), appended to the same bar and styled by the same inline
  // `font: inherit` — no class, no `index.html` rule. Off is the unpaced START_BUDGET frame.
  const speedLabel = document.createElement('label');
  const speedBox = document.createElement('input');
  speedBox.type = 'checkbox';
  speedBox.checked = true;
  speedLabel.style.font = 'inherit';
  speedLabel.append(speedBox, '1411 SPEED');
  speedBox.addEventListener('change', () => { paced = speedBox.checked; lastNow = undefined; kick(); });
  bar.append(machineRoomTab, internalsTab, speedLabel);

  const show = (atDesk: boolean): void => {
    machineRoom.hidden = !atDesk;
    internals.hidden = atDesk;
    machineRoomTab.style.fontWeight = atDesk ? 'bold' : 'normal';
    internalsTab.style.fontWeight = atDesk ? 'normal' : 'bold';
    period.dispatch({ kind: 'tab', tab: atDesk ? 'machine' : 'internals' });
    kick();
  };
  machineRoomTab.addEventListener('click', () => { show(true); });
  internalsTab.addEventListener('click', () => { show(false); });

  // THE MOUNT CHAIN (plan §10.7 row 5). ONE call per tab: `mountPeriod` constructs every station of
  // the machine room, places them on `period/desk.ts`'s grid and returns the period `View[]`, the
  // `ConsoleSession` the frame's gate reads and the desk's `dispatch`. Both mounts APPEND into the
  // container they are handed, and neither holds a frame of its own.
  // THE PERIOD MOUNT GOES FIRST, and that is the whole of the ordering rule: the internals tab's
  // MODE label reads the machine-room rotary through `rotary()` (PHASE-4-NOTES.md §4, M2), so the
  // `ConsoleSession` has to exist before `mountInternals` is handed a closure over it. Both mounts
  // append into their own container, so the swap moves nothing on the page.
  const period = mountPeriod(machine, machineRoom, { run, halt, kick });
  const { view } = mountInternals(machine, internals,
    { run, halt, kick, rotary: () => period.session.detent });
  const periodViews = period.views;
  const consoleSession = period.session;

  // AFTER the mounts, because `show` dispatches into the desk: the first call sets the MACHINE ROOM
  // tab, which is where §1's storyboard opens.
  app.prepend(bar);
  show(true);

  // THE PAGE'S ONE ANIMATION FRAME, in its wave-5 form (plan §10.2's table, row 5).
  const frame = (now: number): void => {
    // 1. EXECUTE. `budgetFor(now)` instructions per frame — the 1411's own pace while 1411 SPEED is
    //    checked, START_BUDGET (machine.ts:45 = 2000) when it is not and in every case the ceiling
    //    — so the console log and the paper animate instead of freezing until the program halts. A
    //    defined return from `start()` is a stop reason, and it ends the run. `held` is the
    //    ConsoleSession's OWN inquiry latch (§6.6) — never Console1415.pendingRequest, which the
    //    device clears inside read() (:290, :316) and precheck() (:199), so a loop gated on it
    //    deadlocks on a program that requests inquiry and never reads.
    //    BOTH `detent` and `machine.mode`, never one instead of the other: a turn to DISPLAY or
    //    C.E. leaves machine.mode === 'run' (§6.2), while the byte-frozen controls.ts <select>
    //    (:80-85) can still move machine.mode on its own — and machine.start() dispatches on
    //    machine.mode (machine.ts:355-374), where `ieCycle` types a `C` line per call.
    if (running && !consoleSession.held && consoleSession.detent === 'run'
        && machine.mode === 'run') {
      if (machine.start(budgetFor(now)) !== undefined) running = false;
      dirty = true;
    } else {
      lastNow = undefined;                       // a paused desk banks no time (plan §10.6)
    }
    // 2. RENDER. ONE `snapshot()`, handed to every view of the VISIBLE tab; the hidden tab's views
    //    render on the frame after it is shown, because `show()` calls `kick()`.
    if (dirty) {
      dirty = false;
      const s = machine.snapshot();
      if (machineRoom.hidden) view.render(s);
      else for (const v of periodViews) v.render(s);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
