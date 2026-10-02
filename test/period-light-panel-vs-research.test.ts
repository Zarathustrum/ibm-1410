// Tier 0 — the INDICATOR LIGHT PANEL against the research it is a transcription of, in BOTH
// DIRECTIONS (plan §4.9, §8, §8.1, §8.2, §8.4, §11 wave 4 (e), §12.1 T0, §13 criterion 14).
//
// WHICH MACHINE: the IBM 1415 Console's indicator light panel on a 1410 — seven boxes left to
// right, 103 published lamp positions (console-and-physical.md §5 [verified] — S223-2648 Fig.3 p.8;
// lamp inventories A22-0526-3 Figs.49-55 pp.52-55). Not a 1401, and not a 1401 photograph: the
// claim that legends light RED on fault is from a 1401 page and does not transfer to the 1415
// (console-and-physical.md §11), which is why nothing here asserts a colour at all.
//
// THERE IS NO GOLDEN FILE. The expectation is a SLICE of docs/research/console-and-physical.md §5's
// `| Box | Sub-group | Lights |` markdown table, taken at test time and expanded by two published
// rules — a comma or a spaced slash separates lamps, and `1-6` is a range. A copy would be a second
// transcription of a primary source, free to drift from the research file that justifies it while
// both stayed internally consistent; a slice cannot drift (§12.3). The mechanism ships already in
// `test/rpg-columns-vs-research.test.ts` and `test/period-selectric.test.ts`.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · IT CONSTRUCTS NO VIEW. The run is `environment: 'node'` (vite.config.ts:8-11) and plan §2.2
//    refuses jsdom. `lightsView.ts` is imported for `REDUCED_PANEL_LABEL` — an exported string it
//    builds at import time — and read as SOURCE TEXT for §13 criterion 14's register grep. No node.
//  · It asserts no lamp COLOUR, no geometry and no legend typography. Those are criterion 19's eye
//    (§13) and wave 5's stylesheet; this file is the DATA diff and nothing else.
//  · It changes no core line and touches no research file. A correction found here would ESCALATE
//    with its own commit (§16 item 5), never edit console-and-physical.md in a build wave.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { bcdOfGlyph } from '../src/core/bcd.js';
import { createMachine } from '../src/core/machine.js';
import type { MachineState } from '../src/core/types.js';
import {
  CHECK_LAMPS_FOLLOW_STOP_REASON_NOT_A_LATCH, OMITTED_LAMPS, PANEL_BOXES,
  REFUSED_FEATURE_LAMPS_ARE_OMITTED_NOT_DARKENED, UNEQUAL_HAS_NO_LAMP_ON_THE_1415_PANEL,
  lampsOf, type PanelBox,
} from '../src/ui/period/console/lamps.js';
import { REDUCED_PANEL_LABEL } from '../src/ui/period/console/lightsView.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RESEARCH = 'docs/research/console-and-physical.md';
const LAMPS = 'src/ui/period/console/lamps.ts';
const LIGHTS_VIEW = 'src/ui/period/console/lightsView.ts';

/** `box|group|label`, the one key both sides of the diff are reduced to. */
const key = (box: PanelBox, group: string | null, label: string): string =>
  `${box}|${group ?? ''}|${label}`;

// ── §5's table, sliced and expanded ──────────────────────────────────────────────────────────

/** The rows of §5's `| Box | Sub-group | Lights |` table, located by its header and not by a line
 *  number, so an edit above §5 moves the slice instead of breaking it. */
function panelTable(): readonly (readonly string[])[] {
  const lines = readFileSync(join(REPO_ROOT, RESEARCH), 'utf8').split('\n');
  const heading = lines.findIndex((l) => l.startsWith('## 5. Indicator light panel'));
  if (heading < 0) throw new Error('console-and-physical.md: §5 heading not found');
  const header = lines.findIndex((l, i) => i > heading && /^\|\s*Box\s*\|/.test(l));
  if (header < 0) throw new Error('console-and-physical.md §5: Box/Sub-group/Lights table not found');
  const rows: string[][] = [];
  for (let i = header + 2; i < lines.length && (lines[i] ?? '').startsWith('|'); i++) {
    rows.push((lines[i] ?? '').split('|').slice(1, -1).map((c) => c.trim()));
  }
  return rows;
}

/**
 * The two expansion rules §5's Lights column uses, and no others.
 *  · A COMMA, or a SLASH WITH SPACE ROUND IT, separates lamps — spaced because `I/O OFF LINE` and
 *    `I/O INTERLOCK` are single legends whose slash is part of the silkscreen, while
 *    `N,1,2,3 / U,B,E,MQ` is the SCAN and SUB SCAN halves of one sub-group.
 *  · `1-6` is the A RING range, written as a range in the research and as six positions on iron.
 */
const expand = (cell: string): readonly string[] =>
  cell.split(/\s+\/\s+|,/).map((s) => s.trim()).filter((s) => s !== '')
    .flatMap((label) => {
      const range = /^(\d+)-(\d+)$/.exec(label);
      if (range === null) return [label];
      const [lo, hi] = [Number(range[1]), Number(range[2])];
      return [...Array(hi - lo + 1).keys()].map((i) => String(lo + i));
    });

/** §5's box column, in first-appearance order, with the empty continuation cells carried down. */
const RESEARCH_TITLES: readonly string[] = (() => {
  const titles: string[] = [];
  let box = '';
  for (const row of panelTable()) {
    box = (row[0] ?? '') === '' ? box : (row[0] ?? '');
    if (!titles.includes(box)) titles.push(box);
  }
  return titles;
})();

/** Title → the seven-valued `PanelBox` id, taken off `PANEL_BOXES` so no second mapping exists. */
const BOX_OF = new Map(PANEL_BOXES.map((spec) => [spec.title, spec.box] as const));

/** Every position §5 publishes, as `box|group|label`. */
const PUBLISHED: readonly string[] = (() => {
  const out: string[] = [];
  let title = '';
  for (const row of panelTable()) {
    title = (row[0] ?? '') === '' ? title : (row[0] ?? '');
    const box = BOX_OF.get(title);
    if (box === undefined) throw new Error(`§5 box "${title}" is drawn by no PANEL_BOXES entry`);
    const groups = (row[1] ?? '') === '' ? [null] : (row[1] ?? '').split(',').map((g) => g.trim());
    for (const group of groups) for (const label of expand(row[2] ?? '')) out.push(key(box, group, label));
  }
  return out;
})();

const DRAWN: readonly string[] =
  PANEL_BOXES.flatMap((spec) => spec.lamps.map((l) => key(l.box, l.group, l.label)));

/** An `OMITTED_LAMPS` entry expanded to the positions it covers: one named legend, or — for the
 *  two CH2 columns, whose `label` is the whole-column marker — every published position in it. */
const OMITTED: readonly string[] = OMITTED_LAMPS.flatMap((o) => {
  const one = key(o.box, o.group, o.label);
  if (PUBLISHED.includes(one)) return [one];
  const column = `${o.box}|${o.group ?? ''}|`;
  return PUBLISHED.filter((p) => p.startsWith(column));
});

const sorted = (xs: readonly string[]): readonly string[] => [...xs].sort();
const raw = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');

/** Which lamps `lampsOf` reports ON for a state, as `box|group|label`. */
const lit = (s: MachineState): readonly string[] =>
  lampsOf(s).filter((state) => state.lit)
    .map((state) => key(state.lamp.box, state.lamp.group, state.lamp.label));

// ── the machine the sources are read against ─────────────────────────────────────────────────

/** A real snapshot: nothing below invents a `MachineState`. */
const idle: MachineState = createMachine({ size: 10_000 }).snapshot();

/** A machine stopped on an instruction check — an op code with no word mark, the shape
 *  `test/decode.test.ts:43-48` drives (A22-0526-3 p.11; architecture.md §7). */
function instructionChecked(): MachineState {
  const m = createMachine({ size: 10_000 });
  m.storage.setChar(100, bcdOfGlyph('A') ?? 0, false);
  m.addressSet(100);
  m.step({ execute: false });
  return m.snapshot();
}

/** §8.1's table, written out so that a seventeenth driven lamp is a diff and not a surprise. */
const SIXTEEN: readonly string[] = [
  'status||B>A', 'status||B=A', 'status||B<A',
  'status||OVERFLOW', 'status||DIVIDE OVERFLOW', 'status||ZERO BALANCE',
  'channelStatus|CH1|NOT READY', 'channelStatus|CH1|BUSY', 'channelStatus|CH1|DATA CHECK',
  'channelStatus|CH1|CONDITION', 'channelStatus|CH1|WRONG LENGTH RECORD',
  'channelStatus|CH1|NO TRANSFER', 'channelControl|CH1|INTERLOCK',
  'systemCheck|PROGRAM|ADDRESS CHECK', 'systemCheck|PROGRAM|INSTRUCTION CHECK',
  'systemControls||STOP',
];

describe('the light panel against console-and-physical.md §5, both directions (plan §8)', () => {
  it('slices §5’s table and expands it to the 103 published lamp positions', () => {
    expect(panelTable().length, 'thirteen published rows').toBe(13);
    expect(PUBLISHED).toHaveLength(103);
    expect(new Set(PUBLISHED).size, 'no position published twice').toBe(103);
    // Spot the two expansion rules at the rows that need them.
    expect(PUBLISHED).toContain('cpu|A RING|6');                 // the `1-6` range
    expect(PUBLISHED).toContain('cpu|SCAN / SUB SCAN|MQ');       // the spaced slash
    expect(PUBLISHED).toContain('power||I/O OFF LINE');          // and the slash that is a legend
  });

  it('draws every published position that is not omitted, and draws nothing else', () => {
    // FIELD BY FIELD, IN BOTH DIRECTIONS. Left: every published (box, group, label) is either drawn
    // or on the omission list. Right: every drawn lamp is published.
    expect(sorted(DRAWN)).toEqual(sorted(PUBLISHED.filter((p) => !OMITTED.includes(p))));
    for (const drawn of DRAWN) expect(PUBLISHED, drawn).toContain(drawn);
    for (const published of PUBLISHED) {
      expect(DRAWN.includes(published) || OMITTED.includes(published), published).toBe(true);
    }
  });

  it('omits exactly EIGHT entries — eighteen positions — each cited to architecture.md §12', () => {
    expect(OMITTED_LAMPS).toHaveLength(8);
    expect(OMITTED).toHaveLength(18);
    expect(new Set(OMITTED).size).toBe(18);
    for (const entry of OMITTED_LAMPS) {
      expect(entry.why, `${entry.box}/${entry.label}`).toContain('architecture.md §12');
    }
    for (const position of OMITTED) {
      expect(PUBLISHED, position).toContain(position);
      expect(DRAWN, `${position} is omitted, not darkened`).not.toContain(position);
    }
    // The eight, by name (§8.2): the two CH2 columns of six, 1401 COMPAT, TAPE OFF LINE,
    // DISK OFF LINE, CH1's two overlap lamps, and PRIORITY ALERT.
    expect(sorted(OMITTED)).toEqual(sorted([
      ...['INTERLOCK', 'RBC INTERLOCK', 'READ', 'WRITE', 'OVERLAP IN PROCESS',
        'NOT OVERLAP IN PROCESS'].map((l) => `channelControl|CH2|${l}`),
      ...['NOT READY', 'BUSY', 'DATA CHECK', 'CONDITION', 'WRONG LENGTH RECORD',
        'NO TRANSFER'].map((l) => `channelStatus|CH2|${l}`),
      'systemControls||1401 COMPAT', 'systemControls||PRIORITY ALERT',
      'power||TAPE OFF LINE', 'power||DISK OFF LINE',
      'channelControl|CH1|OVERLAP IN PROCESS', 'channelControl|CH1|NOT OVERLAP IN PROCESS',
    ]));
  });

  it('holds §8.2’s arithmetic on the page: 103 published − 18 omitted = 85 drawn', () => {
    expect(PUBLISHED.length - OMITTED.length).toBe(85);
    expect(DRAWN).toHaveLength(85);
    expect(lampsOf(idle)).toHaveLength(85);
    // The panel says so ON THE PAGE (critic item 3, §13 criterion 14): without the label the most
    // authoritative-looking artifact on the desk is quietly a fiction.
    expect(REDUCED_PANEL_LABEL).toContain('REDUCED PANEL');
    expect(REDUCED_PANEL_LABEL).toContain('85');
    expect(REDUCED_PANEL_LABEL).toContain('103');
    expect(REDUCED_PANEL_LABEL, 'the label points at the refusal that made it').toContain('§12');
  });

  it('keeps STATUS present and IMMEDIATELY RIGHT of the CPU box (§5’s own correction note)', () => {
    // "STATUS is a labeled column immediately right of ARITH — do not omit it, and do not place
    // I/O CHANNEL CONTROL directly after the CPU box." The research file predicted the error.
    const order = PANEL_BOXES.map((spec) => spec.box);
    expect(order).toHaveLength(7);
    expect(order[0]).toBe('cpu');
    expect(order[1], 'immediately right of ARITH, the CPU box’s last sub-group').toBe('status');
    expect(order).toEqual(
      ['cpu', 'status', 'channelControl', 'channelStatus', 'systemCheck', 'power', 'systemControls']);
    expect(PANEL_BOXES.map((spec) => spec.title)).toEqual(RESEARCH_TITLES);
    expect(PANEL_BOXES[0]?.lamps.at(-1)?.group, 'ARITH is the sub-group STATUS follows').toBe('ARITH');
  });
});

describe('what the panel can drive, and what it never shows (plan §8.1, §8.4)', () => {
  it('answers a boolean from every non-null source on a REAL snapshot', () => {
    for (const spec of PANEL_BOXES) {
      for (const lamp of spec.lamps) {
        if (lamp.source === null) continue;
        expect(typeof lamp.source(idle), `${spec.box}/${lamp.label}`).toBe('boolean');
      }
      for (const lamp of spec.lamps) expect(lamp.cite.length, lamp.label).toBeGreaterThan(0);
    }
  });

  it('drives EXACTLY §8.1’s sixteen lamps, counted off lampsOf itself', () => {
    const driven = lampsOf(idle).filter((s) => s.driven)
      .map((s) => key(s.lamp.box, s.lamp.group, s.lamp.label));
    expect(driven).toHaveLength(16);
    expect(sorted(driven)).toEqual(sorted(SIXTEEN));
    // A fresh machine lights ONE lamp, and it is the documented reset asymmetry rather than an
    // accident: computer reset drops overflow and zero balance and turns LOW and UNEQUAL on
    // (opcodes.md §8; A22-0526-3 p.36). UNEQUAL has no lens here, so B<A is the whole of it.
    expect(lit(idle)).toEqual(['status||B<A']);
  });

  it('lights INSTRUCTION CHECK and STOP on a machine stopped by an instruction check', () => {
    // CHECK_LAMPS_FOLLOW_STOP_REASON_NOT_A_LATCH: lit while stopped for that reason, not latched
    // until a reset key clears it — the divergence lamps.ts states rather than hides.
    expect(sorted(lit(instructionChecked()))).toEqual(sorted(
      [...lit(idle), 'systemCheck|PROGRAM|INSTRUCTION CHECK', 'systemControls||STOP']));
  });

  it('shows NO register contents anywhere — §13 criterion 14’s grep, as a read of both files', () => {
    // The grep is over MachineState FIELD READS and not over label text, because `OP` is a
    // legitimate I RING legend and `A REGISTER SET` a legitimate SYSTEM CHECK PROCESS one — a grep
    // for `REGISTER` would fail on correct data (§8.4).
    const registers = /\.(iar|aar|bar|car|dar|ear|far|op|opMod|coreWindow)\b/;
    for (const path of [LAMPS, LIGHTS_VIEW]) expect(raw(path).match(registers), path).toBeNull();
  });

  it('pins the panel’s three §15 constants by name', () => {
    expect(UNEQUAL_HAS_NO_LAMP_ON_THE_1415_PANEL).toBe(true);
    expect(REFUSED_FEATURE_LAMPS_ARE_OMITTED_NOT_DARKENED).toBe(true);
    expect(CHECK_LAMPS_FOLLOW_STOP_REASON_NOT_A_LATCH).toBe(true);
    // The seventh latch this emulator carries and this panel does not draw: compare-unequal.
    expect(DRAWN.filter((k) => k.startsWith('status||'))).toHaveLength(6);
    expect(DRAWN).not.toContain('status||UNEQUAL');
  });
});
