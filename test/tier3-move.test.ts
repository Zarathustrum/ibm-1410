// Tier 3, third block (plan §7) — `insttest.cor` **02800-02979**, the Move d-character control
// matrix, against `note1410.txt`'s annotations transcribed in `oracle/note1410/move.ts`.
//
// `emulators.md` §5.3 calls this "the single most valuable block", and plan §10 names it as the
// verification for the `[unverified]` Figure 20 register effects: the fallback chosen there is
// "the eight-row terminator/direction table in `opcodes.md` §3.3, VERIFIED against the 16-case
// matrix in `insttest.cor` 02800-02968 before shipping the wave". This file is that verification.
//
// ─── SEQUENTIAL OR PER INSTRUCTION? SEQUENTIAL, AND IT DOES NOT MATTER ─────────────────────
// The arithmetic block at 02300-02799 MUST run sequentially in halt-terminated sub-blocks,
// because its instructions mutate each other's operands and three of them are chained
// (`test/tier3-arith.test.ts` header). This block is different, and the image says so:
//   · All fifteen are 12-character two-address instructions carrying their own d-character.
//     None is chained, so none inherits an earlier instruction's AAR/BAR or op modifier.
//   · The fifteen A/B field pairs occupy DISJOINT storage, 10500-10589, and `D` never writes
//     an A field — so no instruction can see another's result.
//   · The block is contiguous and halt-terminated exactly like the arithmetic sub-blocks: a
//     word mark on every op code, then a 1-character `.` at 02980 whose read-out is ended by
//     the word mark at 02981.
// So it is run SEQUENTIALLY from 02800 to the halt, which is what the image is — and the last
// test in this file runs it the other way, one instruction at a time from a fresh image, and
// asserts the two agree. That is the finding, not an assumption.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { glyphOf } from '../src/core/bcd.js';
import {
  MOVE_LENGTHS_ARE_POSITIONS_STEPPED, MOVE_REGISTERS_FROM_FIGURE_20,
} from '../src/core/move.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { loadCor } from '../src/formats/cor.js';
import { BCD6, type Addr, type StopReason } from '../src/core/types.js';
import {
  CORRECTIONS, MOVE_BLOCK, NOTE1410_MOVE,
  type MoveCase, type MoveField,
} from '../oracle/note1410/move.js';
import { noteText } from '../oracle/note1410/ref.js';
import { ORACLES_ABSENT_MESSAGE, oraclePath } from './oracles.js';

const SIZE = 80_000;
const addr5 = (a: Addr): string => String(a).padStart(5, '0');

function image(): ReturnType<typeof loadCor> {
  const path = oraclePath('insttest.cor');
  if (path === null) throw new Error(ORACLES_ABSENT_MESSAGE);
  // `insttest.cor` fills with 0x00 — no C bit, parity-invalid in Jaeger's own encoding
  // (emulators.md §5.1) — so the fill is normalised to blank-with-C on load.
  return loadCor(readFileSync(path).slice().buffer as ArrayBuffer, { zeroFill: 'normalize' });
}

const glyphs = (m: Machine, from: Addr, n: number): string =>
  Array.from({ length: n }, (_, i) => glyphOf(m.storage.read(from + i) & BCD6)).join('');
const marks = (m: Machine, from: Addr, n: number): string =>
  Array.from({ length: n }, (_, i) => (m.storage.wm(from + i) ? '^' : '.')).join('');

const readField = (m: Machine, f: MoveField): { text: string; marks: string } => ({
  text: glyphs(m, f.from, f.text.length),
  marks: marks(m, f.from, f.text.length),
});

/** What one instruction left behind, captured the moment it completed. */
interface Observed {
  bField: { text: string; marks: string };
  aField: { text: string; marks: string };
  aar: number;
  bar: number;
}

interface BlockRun {
  observed: Map<number, Observed>;
  /** Op-code addresses in the order the machine actually read them out. */
  order: number[];
  stop: StopReason | undefined;
  /** A thrown build-order stub — an executor a later wave owes, not a stop of the 1410. */
  error: string | undefined;
  at: number;
  machine: Machine;
}

const CASE_BY_ADDR = new Map<number, MoveCase>(NOTE1410_MOVE.map((c) => [c.addr, c]));

/** Runs from `from` until the machine stops, capturing each fixture case's fields as it goes. */
function runBlock(from: number): BlockRun {
  const m = createMachine({ size: SIZE });
  m.loadImage(image());
  m.addressSet(from);
  const run: BlockRun = {
    observed: new Map(), order: [], stop: undefined, error: undefined, at: from, machine: m,
  };
  for (let i = 0; i < 40; i++) {
    const at = m.regs.iar;
    run.at = at;
    run.order.push(at);
    try {
      run.stop = m.step();
    } catch (e) {
      run.error = (e as Error).message;
      return run;
    }
    const fixture = CASE_BY_ADDR.get(at);
    if (fixture) {
      run.observed.set(at, {
        bField: readField(m, fixture.expectedAfter.bField),
        aField: readField(m, fixture.before.aField),
        aar: m.regs.aar,
        bar: m.regs.bar,
      });
    }
    if (run.stop !== undefined) return run;
  }
  return run;
}

let cached: BlockRun | undefined;
function block(): BlockRun {
  cached ??= runBlock(MOVE_BLOCK.from);
  return cached;
}

/** One instruction, run alone from a fresh image — the per-instruction alternative. */
function runOne(c: MoveCase): Observed {
  const m = createMachine({ size: SIZE });
  m.loadImage(image());
  m.addressSet(c.addr);
  const stop = m.step();
  expect(stop, `${addr5(c.addr)} run alone stopped: ${String(stop)}`).toBeUndefined();
  return {
    bField: readField(m, c.expectedAfter.bField),
    aField: readField(m, c.before.aField),
    aar: m.regs.aar,
    bar: m.regs.bar,
  };
}

describe.skipIf(!oraclePath('insttest.cor'))(
  `tier 3 — insttest.cor 02800-02979, the Move d-character matrix — ${ORACLES_ABSENT_MESSAGE}`,
  () => {
    it('the block is fifteen 12-character `D` instructions, then a halt at 02980', () => {
      // The plan and emulators.md §5.3 both say "16"; the image holds fifteen `D` instructions
      // and a `.`, which is §5.3's sixteenth printed line. See CORRECTIONS in the fixture.
      const run = block();
      expect(NOTE1410_MOVE.length).toBe(15);
      expect(run.order.slice(0, 15)).toEqual(NOTE1410_MOVE.map((c) => c.addr));
      expect(run.error, 'no executor stub was reached').toBeUndefined();
      expect(run.at, 'the run ended on the halt').toBe(MOVE_BLOCK.halt);
      expect(run.stop).toBe('halt');
      expect(NOTE1410_MOVE.every((c) => c.chars.length === 12)).toBe(true);
    });

    it('every fixture case matches the image it was transcribed from', () => {
      // Anchors the fixture: the instruction glyphs, the d-character, and both operand fields
      // as they stand BEFORE the block runs. A transcription slip fails here, not fifteen
      // confusing assertions later.
      const m = createMachine({ size: SIZE });
      m.loadImage(image());
      const wrong: string[] = [];
      for (const c of NOTE1410_MOVE) {
        const chars = glyphs(m, c.addr, 12);
        if (chars !== c.chars) wrong.push(`${addr5(c.addr)} chars: ${chars} != ${c.chars}`);
        if (!m.storage.wm(c.addr)) wrong.push(`${addr5(c.addr)} has no word mark on its op code`);
        if (chars.charAt(11) !== c.d) wrong.push(`${addr5(c.addr)} d: ${chars.charAt(11)} != ${c.d}`);
        if ((m.storage.read(c.addr + 11) & BCD6) !== c.dBcd) {
          wrong.push(`${addr5(c.addr)} dBcd: ${m.storage.read(c.addr + 11) & BCD6} != ${c.dBcd}`);
        }
        for (const [which, f] of [['A', c.before.aField], ['B', c.before.bField]] as const) {
          const got = readField(m, f);
          if (got.text !== f.text || got.marks !== f.marks) {
            wrong.push(`${addr5(c.addr)} ${which} field at ${addr5(f.from)}:`
              + ` ${got.text}/${got.marks} != ${f.text}/${f.marks}`);
          }
        }
        // The field addresses in the fixture are the ones the instruction carries.
        const a = Number(chars.slice(1, 6));
        const b = Number(chars.slice(6, 11));
        if (a !== c.before.aField.addr) wrong.push(`${addr5(c.addr)} A-address ${a}`);
        if (b !== c.before.bField.addr) wrong.push(`${addr5(c.addr)} B-address ${b}`);
      }
      expect(wrong).toEqual([]);
    });

    for (const c of NOTE1410_MOVE) {
      const ref = `note1410.txt lines ${c.lines[0]}-${c.lines[1]}`;
      it(`${addr5(c.addr)} ${c.mnemonic} (d=${c.d}) — ${ref}`, () => {
        const run = block();
        const got = run.observed.get(c.addr);
        if (!got) {
          throw new Error(
            `the block did not reach ${addr5(c.addr)}: ${run.error ?? String(run.stop)}`
            + ` at ${addr5(run.at)}`,
          );
        }
        const where = `${addr5(c.addr)} ${c.mnemonic}`;

        // 1. The note's own `Result:` line — data bits AND word marks.
        expect(got.bField.text, `${where} B field data`).toBe(c.expectedAfter.bField.text);
        expect(got.bField.marks, `${where} B field word marks`).toBe(c.expectedAfter.bField.marks);

        // 2. `D` never writes an A field (opcodes.md §3.1 — only B positions are stored).
        expect(got.aField.text, `${where} A field data untouched`).toBe(c.before.aField.text);
        expect(got.aField.marks, `${where} A field word marks untouched`)
          .toBe(c.before.aField.marks);

        // 3. The Figure 20 registers. NOT in the note — derived in the fixture from the
        //    eight-row table with LA = LB = LW = positions, which is precisely the reading
        //    plan §10 sends this block to confirm.
        expect(got.aar, `${where} AAR`).toBe(c.expectedAfter.aar);
        expect(got.bar, `${where} BAR`).toBe(c.expectedAfter.bar);
      });
    }

    it('the register results are consistent with the positions the Result line implies', () => {
      // A cross-check on the fixture itself, independent of the executor: from `positions` and
      // the direction, AAR and BAR must be the addresses ± that count. If a case's `positions`
      // were wrong, its `aar`/`bar` would still have been "derived", and this catches it.
      for (const c of NOTE1410_MOVE) {
        // Bit 8 of the d-character is the direction, and it also fixes the sign of both
        // Figure 20 columns: every L→R row is `+`, every R→L row is `-` (opcodes.md §3.3).
        const sign = (c.dBcd & 0x08) !== 0 ? 1 : -1;
        const op = sign > 0 ? '+' : '-';
        expect(c.expectedAfter.aar, `${addr5(c.addr)} AAR = A ${op} ${c.positions}`)
          .toBe(c.before.aField.addr + sign * c.positions);
        expect(c.expectedAfter.bar, `${addr5(c.addr)} BAR = B ${op} ${c.positions}`)
          .toBe(c.before.bField.addr + sign * c.positions);
        // And the direction agrees with which end of the field the instruction addresses.
        const leftmost = c.before.aField.addr === c.before.aField.from;
        expect(leftmost, `${addr5(c.addr)} addresses the leftmost A position`).toBe(sign > 0);
      }
    });

    it('runs identically one instruction at a time — the fields are disjoint and nothing chains', () => {
      const run = block();
      const disagreements: string[] = [];
      for (const c of NOTE1410_MOVE) {
        const alone = runOne(c);
        const together = run.observed.get(c.addr);
        if (JSON.stringify(alone) !== JSON.stringify(together)) {
          disagreements.push(
            `${addr5(c.addr)}: alone ${JSON.stringify(alone)} vs sequential ${JSON.stringify(together)}`,
          );
        }
      }
      expect(disagreements).toEqual([]);
    });

    it('records the 02848 label correction rather than silently obeying it', () => {
      // note1410.txt line 519 labels 02848 "Move D=T"; the image holds `D 10517 10519 -`, d =
      // hyphen, B bit only (emulators.md §5.3). Jaeger's PROSE — "(RL, SCAN, Stop on BWM)" — is
      // right, and it is what the fixture asserts.
      const c = CASE_BY_ADDR.get(2848);
      expect(c?.d).toBe('-');
      expect(c?.dBcd).toBe(0o40);
      expect(c?.mnemonic).toBe('SCNLB');
      expect(c && noteText([c.lines[0], c.lines[0]]), 'its heading line').toContain('Move D=T');
      expect(c && noteText(c.lines)).toContain('(RL, SCAN, Stop on BWM)');
      // A scan transfers nothing, so the B field must read exactly as it did before.
      expect(c?.expectedAfter.bField.text).toBe(c?.before.bField.text);
      expect(c?.expectedAfter.bField.marks).toBe(c?.before.bField.marks);
      expect(CORRECTIONS.some((x) => x.where.includes('02848'))).toBe(true);
      // `T` is the SEPARATE test at 02884 — a right-to-left character move stopping at the
      // A-field word mark.
      expect(CASE_BY_ADDR.get(2884)?.d).toBe('T');
      expect(CASE_BY_ADDR.get(2884)?.mnemonic).toBe('MLCA');
    });

    it('all eight Figure 19 direction/terminator groups are exercised by the fifteen', () => {
      // What makes this block worth having: it is not fifteen variations on one rule. Every one
      // of the eight `d & 0x38` groups appears, so a wrong terminator cannot hide.
      const groups = new Set(NOTE1410_MOVE.map((c) => c.dBcd & 0x38));
      expect([...groups].sort((x, y) => x - y))
        .toEqual([0x00, 0x08, 0x10, 0x18, 0x20, 0x28, 0x30, 0x38]);
    });

    it('and five of the eight portion codes, including a scan and a word-mark move', () => {
      const portions = new Set(NOTE1410_MOVE.map((c) => c.dBcd & 0x07));
      expect([...portions].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 7]);
    });

    it('THIS FILE is the plan §10 verification the two `// OPEN:` constants point at', () => {
      // plan §10, Move row: "Use the eight-row terminator/direction table in `opcodes.md` §3.3
      // and verify against the 16-case matrix in `insttest.cor` 02800-02968 BEFORE SHIPPING THE
      // WAVE." The fifteen cases above are that verification; these two constants name the
      // readings it confirms, and this assertion is what stops either from becoming dead code
      // that no longer describes the executor.
      expect(MOVE_REGISTERS_FROM_FIGURE_20).toBe(true);
      expect(MOVE_LENGTHS_ARE_POSITIONS_STEPPED).toBe(true);
      const run = block();
      expect(run.observed.size, 'all fifteen ran and were captured').toBe(15);
    });
  },
);
