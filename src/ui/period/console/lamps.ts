// ═══ src/ui/period/console/lamps.ts · WAVE 4 ═══ the 1415 indicator light panel as DATA, DOM-free.
// Plan: docs/plans/phase-4-period-ui.md §4.9 (the four types), §8 (the box order and every lamp
// inventory), §8.1 (the sixteen that light), §8.2 (the eight that are omitted rather than
// darkened), §8.4 (what the panel never shows). `lightsView.ts` draws this and computes nothing.
//
// WHICH MACHINE: the IBM 1415 console light panel of an IBM 1410 — seven framed boxes left to
// right, STATUS immediately right of ARITH (research/console-and-physical.md §5 [verified] —
// S223-2648 Fig.3 p.8; lamp inventories A22-0526-3 Figs.49-55 pp.52-55; OFF NORMAL and STOP
// semantics p.56). Not a 1401 panel and not a register display: "the 1410 shows NO register
// contents in lights — every stop, display, alter and inquiry goes out on the typewriter"
// (console-and-physical.md §2's implementer summary, [verified]), which is why the internals tab
// exists at all (architecture.md §6).
//
// The panel this file publishes is a REDUCED one and the drawn page says so: §5 publishes 103 lamp
// positions, `OMITTED_LAMPS` refuses 18 of them, 85 are drawn and 16 are driven. A panel two
// columns and six lamps short of S223-2648 Fig.3 p.8 is not that figure, and the most
// authoritative-looking artifact on the desk must not be quietly a fiction (§8.2).
//
// What this file deliberately does NOT do:
//   - no DOM — it is on test/period-is-dom-free.test.ts's required-path list;
//   - NO REGISTER FIELD IS READ ANYWHERE IN IT. §13 criterion 14's grep is over MachineState field
//     reads and not over label text, because `OP` is a legitimate I-RING legend and `A REGISTER
//     SET` a legitimate SYSTEM CHECK PROCESS one — correct data a text grep would fail on (§8.4);
//   - no colour and no geometry. One lamp colour for the whole panel and the refusal of the 1401
//     red-fault convention are `lightsView.ts`'s header and `period.css`'s comment (§8.3);
//   - no invention: a lamp with no modelled state is `source: null` — drawn dark and labelled
//     not-modelled in the view's legend — and never given a plausible-looking driver.

import type { MachineState } from '../../../core/types.js';

export type PanelBox = 'cpu' | 'status' | 'channelControl' | 'channelStatus' | 'systemCheck'
  | 'power' | 'systemControls';

export interface Lamp {
  readonly box: PanelBox;
  readonly group: string | null;     // §5's Sub-group column: 'I RING', 'PROCESS', … or null
  readonly label: string;            // as silkscreened
  /** null = DRAWN AND NEVER LIT, the honest majority: I RING, A RING, CLOCK, SCAN/SUB SCAN, CYCLE,
   *  ARITH and the whole SYSTEM CHECK box have no modelled state. "Not modelled" as a typed VALUE
   *  stops the panel implying the emulator knows more than it does. */
  readonly source: ((s: MachineState) => boolean) | null;
  readonly cite: string;             // what the both-directions research diff reads
}

export interface PanelBoxSpec {
  readonly box: PanelBox; readonly title: string; readonly lamps: readonly Lamp[];
}

export interface LampState { readonly lamp: Lamp; readonly driven: boolean; readonly lit: boolean }

/** The publication every drawn lamp rests on, unless it carries a sentence of its own below. */
const PUBLISHED =
  'console-and-physical.md §5 [verified] — A22-0526-3 Figs.49-55 pp.52-55; S223-2648 Fig.3 p.8';

/** In `OMITTED_LAMPS`, the whole sub-group column rather than one position — the two CH2 columns
 *  of six lamps each. Every other entry names one silkscreened label. */
const EVERY = '*';

const key = (box: PanelBox, group: string | null, label: string): string =>
  `${box}|${group ?? ''}|${label}`;

/**
 * §8.1's table, and it is the whole drivable set: six from `indicators` (types.ts:57-59), six from
 * `ChannelStatus` (types.ts:226-229), one from `channel1.interlock` (machine.ts:479), two from
 * `StopReason`'s two check members, and one that is lit whenever the machine is stopped at all.
 * Sixteen — stated so that a
 * seventeenth lit lamp is a diff, and counted off this map by the test rather than written twice.
 */
const SOURCES: Readonly<Record<string, (s: MachineState) => boolean>> = {
  'status||B>A': (s) => s.indicators.compareHigh,
  'status||B=A': (s) => s.indicators.compareEqual,
  'status||B<A': (s) => s.indicators.compareLow,
  'status||OVERFLOW': (s) => s.indicators.arithOverflow,
  'status||DIVIDE OVERFLOW': (s) => s.indicators.divideOverflow,
  'status||ZERO BALANCE': (s) => s.indicators.zeroBalance,
  'channelStatus|CH1|NOT READY': (s) => s.channel1.notReady,
  'channelStatus|CH1|BUSY': (s) => s.channel1.busy,
  'channelStatus|CH1|DATA CHECK': (s) => s.channel1.dataCheck,
  'channelStatus|CH1|CONDITION': (s) => s.channel1.condition,
  'channelStatus|CH1|WRONG LENGTH RECORD': (s) => s.channel1.wrongLengthRecord,
  'channelStatus|CH1|NO TRANSFER': (s) => s.channel1.noTransfer,
  'channelControl|CH1|INTERLOCK': (s) => s.channel1.interlock,
  'systemCheck|PROGRAM|ADDRESS CHECK': (s) => s.stop === 'addressCheck',
  'systemCheck|PROGRAM|INSTRUCTION CHECK': (s) => s.stop === 'instructionCheck',
  'systemControls||STOP': (s) => s.stop !== undefined,
};

/** The four lamps whose own sentence is a more useful artifact than the panel citation. */
const CITES: Readonly<Record<string, string>> = {
  'status||B>A': `${PUBLISHED}. The 1410 compares B TO A, never A to B — opcodes.md §5.2, §6.1; `
    + 'A22-0526-3 p.28.',
  'channelControl|CH1|INTERLOCK': `${PUBLISHED}. Driven from channel 1's own interlock, the`
    + ' latch a second I/O instruction waits on (io.md §5; machine.ts:479).',
  'systemControls||OFF NORMAL': `${PUBLISHED}. "OFF NORMAL lights when any of: print-out control`
    + ' INHIBITED; asterisk insert OFF; cycle control not OFF; check control not STOP NORMAL;'
    + ' storage scan not OFF while the mode switch is at CE; or address entry not NORMAL"'
    + ' (A22-0526-3 p.56) — not one of the six is modelled, because every one is a CE control'
    + ' behind the door §2.2 draws closed.',
  'systemControls||STOP': `${PUBLISHED}. "System stopped needing operator intervention"`
    + ' (A22-0526-3 p.56), which this emulator can drive exactly.',
};

/**
 * §5's markdown table read straight down — box, title, then its sub-groups with the lamp labels in
 * published order. §5 draws SYSTEM CHECK as ONE box with PROCESS and PROGRAM as sub-groups, so
 * `PanelBox` is seven-valued and `group` carries the sub-group: the research diff is then a
 * straight Box / Sub-group / Lights read of §5 instead of a re-shaping (§4.9).
 *
 * The title is `SYSTEMS CONTROLS` as the S223-2648 Fig.3 p.8 PHOTOGRAPH silkscreens it, NOT the
 * `SYSTEM CONTROLS` A22-0526-3 Fig.55 p.55 prints: Tom ruled for the photograph 2026-09-03 and §5
 * was reversed to match IN THE SAME COMMIT — the panel test slices §5 live, so they cannot drift.
 */
const PANEL: readonly (readonly [PanelBox, string, readonly (readonly [string | null, string])[]])[] = [
  ['cpu', 'CENTRAL PROCESSING UNIT', [
    ['I RING', 'OP,1,2,3,4,5,6,7,8,9,10,11,12'],
    ['A RING', '1,2,3,4,5,6'],
    ['CLOCK', 'A,B,C,D,E,F,G,H,J,K'],
    ['SCAN / SUB SCAN', 'N,1,2,3,U,B,E,MQ'],
    ['CYCLE', 'A,B,C,D,E,F,I,X'],
    ['ARITH', 'CARRY IN,CARRY OUT,A COMPL,B COMPL'],
  ]],
  ['status', 'STATUS', [[null, 'B>A,B=A,B<A,OVERFLOW,DIVIDE OVERFLOW,ZERO BALANCE']]],
  ['channelControl', 'I/O CHANNEL CONTROL', [
    ['CH1', 'INTERLOCK,RBC INTERLOCK,READ,WRITE,OVERLAP IN PROCESS,NOT OVERLAP IN PROCESS'],
    ['CH2', 'INTERLOCK,RBC INTERLOCK,READ,WRITE,OVERLAP IN PROCESS,NOT OVERLAP IN PROCESS'],
  ]],
  ['channelStatus', 'I/O CHANNEL STATUS', [
    ['CH1', 'NOT READY,BUSY,DATA CHECK,CONDITION,WRONG LENGTH RECORD,NO TRANSFER'],
    ['CH2', 'NOT READY,BUSY,DATA CHECK,CONDITION,WRONG LENGTH RECORD,NO TRANSFER'],
  ]],
  ['systemCheck', 'SYSTEM CHECK', [
    ['PROCESS', 'A CHANNEL,B CHANNEL,ASSEMBLY CHANNEL,ADDRESS CHANNEL,ADDRESS EXIT,'
      + 'A REGISTER SET,B REGISTER SET,OP REGISTER SET,OP MODIFIER SET,'
      + 'A CHARACTER SELECT,B CHARACTER SELECT'],
    ['PROGRAM', 'I/O INTERLOCK,ADDRESS CHECK,RBC INTERLOCK,INSTRUCTION CHECK'],
  ]],
  ['power', 'POWER', [[null, 'THERMAL,CB TRIP,I/O OFF LINE,TAPE OFF LINE,DISK OFF LINE']]],
  ['systemControls', 'SYSTEMS CONTROLS', [[null, '1401 COMPAT,OFF NORMAL,PRIORITY ALERT,STOP']]],
];

/**
 * OPEN: REFUSED_FEATURE_LAMPS_ARE_OMITTED_NOT_DARKENED — a ruling of ours. A DARKENED lamp reads as
 * an uninstalled option on a machine that has the slot, and architecture.md §12 forbids implying
 * that tape, disk, channel 2, processing overlap, the Priority feature or 1401 mode exist at all.
 * So these eight entries — EIGHTEEN published positions — are absent from the drawn panel and
 * present here, where `test/period-light-panel-vs-research.test.ts` diffs `PANEL_BOXES` against §5's
 * table MODULO this list, in both directions, so an omission cannot drift.
 * Fallback: restore any entry by deleting its line — one line each. Restoring `PRIORITY ALERT` to a
 * drawn-dark lamp is the panel dossier's original reading, reversed at round-1 review because §12
 * refuses the FEATURE and console-and-physical.md §3 names its two controls the feature's own
 * panel; that restoration also needs a whitelist row in §13 criterion 18a. An IBM statement that a
 * machine without a feature was still fitted with its lamp would settle the question.
 */
export const REFUSED_FEATURE_LAMPS_ARE_OMITTED_NOT_DARKENED = true;

export const OMITTED_LAMPS: readonly { readonly box: PanelBox; readonly group: string | null;
  readonly label: string; readonly why: string }[] = [
  { box: 'channelControl', group: 'CH2', label: EVERY,
    why: 'architecture.md §12 "No tape, no disk, no channel 2, no processing overlap, no Priority '
      + 'feature" — the whole six-lamp column' },
  { box: 'channelStatus', group: 'CH2', label: EVERY,
    why: 'architecture.md §12, same line — the whole six-lamp column' },
  { box: 'systemControls', group: null, label: '1401 COMPAT',
    why: 'architecture.md §12 "No 1401 compatibility mode. Settled."' },
  { box: 'power', group: null, label: 'TAPE OFF LINE', why: 'architecture.md §12 "No tape…"' },
  { box: 'power', group: null, label: 'DISK OFF LINE', why: 'architecture.md §12 "…no disk…"' },
  { box: 'channelControl', group: 'CH1', label: 'OVERLAP IN PROCESS',
    why: 'architecture.md §12 "…no processing overlap…" — and io.md §4: an overlap x1 character '
      + 'stops the system on a machine without the feature' },
  { box: 'channelControl', group: 'CH1', label: 'NOT OVERLAP IN PROCESS',
    why: 'architecture.md §12, same line — drawn dark it would also be the WRONG state, since on a '
      + 'machine with no overlap feature it is the permanently true one' },
  { box: 'systemControls', group: null, label: 'PRIORITY ALERT',
    why: 'architecture.md §12 "…no Priority feature" — io.md §5 describes it as special features '
      + '5620/5621 with their own alert mode, and console-and-physical.md §3 calls the feature\'s '
      + 'two controls its own optional panel, so refusing the feature refuses its lamp' },
];

const omitted = (box: PanelBox, group: string | null, label: string): boolean =>
  OMITTED_LAMPS.some((o) => o.box === box && o.group === group
    && (o.label === label || o.label === EVERY));

/**
 * OPEN: UNEQUAL_HAS_NO_LAMP_ON_THE_1415_PANEL — a RECORD of a `[verified]` absence, no fallback
 * wanted. §5's STATUS box lists exactly SIX lamps, and this emulator carries SEVEN latches
 * (types.ts:57-59; opcodes.md §8 — three arithmetic, four compare), the seventh being
 * compare-unequal, which A22-0526-3 p.28 gives as a branch condition alongside high / equal / low.
 * architecture.md §6 names "the seven indicator latches" for the INTERNALS surface and §5 names six
 * for this one; the two are not in conflict. Recorded so that a later reader does not "fix" the
 * panel by adding a seventh lens.
 *
 * OPEN: CHECK_LAMPS_FOLLOW_STOP_REASON_NOT_A_LATCH — a ruling of ours. SYSTEM CHECK · PROGRAM's
 * ADDRESS CHECK and INSTRUCTION CHECK, and SYSTEMS CONTROLS' STOP, are driven from `MachineState`'s
 * stop reason: lit while the machine is stopped for that reason, dark once it runs again. On iron
 * the check latches persist until a reset key clears them (console-and-physical.md §3 "Reset
 * semantics"; A22-0526-3 p.52), so the drawn lamp clears one operator action early.
 * Fallback: a UI-side latch set on the stop and cleared by the session's PROGRAM RESET / COMPUTER
 * RESET — about TEN LINES in this file and NO CORE CHANGE — taken if the early clearing is ever
 * visible in §13 criterion 19's walk. `MachineState` carries no check latch of its own (types.ts
 * §8), and adding one there WOULD be a core change, which is why the fallback stays on this side.
 */
export const UNEQUAL_HAS_NO_LAMP_ON_THE_1415_PANEL = true;
export const CHECK_LAMPS_FOLLOW_STOP_REASON_NOT_A_LATCH = true;

/** SEVEN boxes in the published left-to-right order, STATUS immediately right of ARITH — §5's own
 *  correction note names that omission as the trap, and the research diff has a case for it. */
export const PANEL_BOXES: readonly PanelBoxSpec[] = PANEL.map(([box, title, groups]) => ({
  box,
  title,
  lamps: groups.flatMap(([group, labels]) => labels.split(',')
    .filter((label) => !omitted(box, group, label))
    .map((label) => ({
      box,
      group,
      label,
      source: SOURCES[key(box, group, label)] ?? null,
      cite: CITES[key(box, group, label)] ?? PUBLISHED,
    }))),
}));

/** Every drawn lamp, in panel order, with what the snapshot says about it. `driven` is the honesty
 *  bit the view renders as a not-modelled legend entry; `lit` is false for every undriven lamp. */
export function lampsOf(s: MachineState): readonly LampState[] {
  return PANEL_BOXES.flatMap((spec) => spec.lamps.map((lamp) => ({
    lamp,
    driven: lamp.source !== null,
    lit: lamp.source?.(s) ?? false,
  })));
}
