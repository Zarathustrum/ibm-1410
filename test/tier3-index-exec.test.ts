// Tier 3, Wave 4 (plan §5): `insttest.cor` 02200-02288 re-run with EXECUTION ON.
//
// test/tier3-index-decode.test.ts walks the same block with `step({execute:false})`. This file
// walks it with the executor enabled, which is a different claim: that indexing is real at
// READ-OUT on the live path too — the same fifteen effective addresses reach AAR/BAR before the
// E phase starts, the same three out-of-range results stop the machine on an address check
// (plan §10's `INDEX_OUT_OF_RANGE_TRAPS` fallback, never a wrap), and the `A` at 02200 actually
// adds. research/emulators.md §9 step 3, §5.1; research/architecture.md §4-5.
//
// The state asserted per instruction is the state AT THE END OF THE I PHASE, taken with
// `stepCycle()`. That is deliberate and it is where indexing lives: every one of these nine
// instructions is an `A`, and `A`'s own register column is `NSI / A−LW / B−LB` (opcodes.md §2
// p.17), so once the add has run AAR and BAR hold the effective address MINUS a field length and
// the indexed value is no longer visible in them. Wave 3 owns that; this file owns the indexing.
//
// Only two of the nine can meaningfully be run to completion, and the image says why: outside
// 11111-11117, 22222-22224 and 33333-33335 the block's operand addresses land in fill that
// carries no word mark at all, so an add started at (say) 55555 would scan 22,221 positions down
// to the first mark below it. The two that DO have fields — 02200 and 02211 — are executed here;
// the rest stop after their I phase.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { INDEX_US } from '../src/core/cycles.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { ZA, ZB, type Addr, type CoreImage } from '../src/core/types.js';
import { loadCor } from '../src/formats/cor.js';
import { ORACLES_ABSENT_MESSAGE, oraclePath } from './oracles.js';

const SIZE = 80_000;
const IR_BASE = 20, IR_WIDTH = 5;

/** 02200 unindexed, then 02211…02277 at 11 characters, then 02288 at 6. */
const INSTRUCTIONS: readonly (readonly [Addr, number])[] = [
  [2200, 11], [2211, 11], [2222, 11], [2233, 11], [2244, 11],
  [2255, 11], [2266, 11], [2277, 11], [2288, 6],
];

/**
 * The fifteen indexed effective addresses, in image order, as docs/plans/phase-1-cpu-core.md §5
 * Wave 4 names them. Written out so the derivation below is checked against a fixed list rather
 * than only against itself — a bug in both would otherwise agree.
 */
const EXPECTED_EFFECTIVE: readonly number[] = [
  11112, 22223,        // 02211 — IR1 +00001, IR2 +00001 (B+A over the units is PLUS)
  33332, 55555,        // 02222 — IR3 −00001, IR4 +11111
  66666, 55555,        // 02233 — IR5 +11111, IR6 −11111
  90122, 101229,       // 02244 — IR7 +12345, IR8 +12341   ← both past the top of an 80K machine
  87658, 11121,        // 02255 — IR9 −12341 ← past the top, IR10 +00010
  22233, 33345,        // 02266 — IR11 +00011, IR12 +00012
  44457, 55569,        // 02277 — IR13 +00013, IR14 +00014
  66681,               // 02288 — IR15 +00015
];

describe.skipIf(!oraclePath('insttest.cor'))(
  `tier 3 — insttest.cor 02200-02288 with execution ON — ${ORACLES_ABSENT_MESSAGE}`,
  () => {
    const path = oraclePath('insttest.cor');
    const image: CoreImage = loadCor(
      readFileSync(path ?? '').slice().buffer as ArrayBuffer, { zeroFill: 'normalize' },
    );

    /** A machine holding a fresh copy of the image — one per instruction, so no half-cycled
     *  instruction is ever carried into the next test case. */
    function fresh(): Machine {
      const m = createMachine({ size: SIZE });
      m.loadImage(image);
      return m;
    }

    // The effective addresses computed HERE, from the image, by research/architecture.md §4-5 —
    // never by calling address.ts. Same two rules test/tier3-index-decode.test.ts states:
    // the 8-2 code is the digit zero and every other legal character is its own low-order 8421
    // value; the factor's sign is the zone of its OWN units position, B alone being minus.
    const cell = (a: Addr): number => image.cells[a] ?? 0;
    const digit = (a: Addr): number => { const d = cell(a) & 0x0f; return d === 10 ? 0 : d; };
    const field = (at: Addr) => {
      let value = 0;
      for (let i = 0; i < 5; i++) value = value * 10 + digit(at + i);
      const hund = cell(at + 2), tens = cell(at + 3);
      const tag = ((tens & ZA) !== 0 ? 1 : 0) | ((tens & ZB) !== 0 ? 2 : 0)
                | ((hund & ZA) !== 0 ? 4 : 0) | ((hund & ZB) !== 0 ? 8 : 0);
      if (tag === 0) return { value, tag, effective: value };
      const reg = IR_BASE + IR_WIDTH * tag;
      let factor = 0;
      for (let i = 0; i < IR_WIDTH; i++) factor = factor * 10 + digit(reg + i);
      const units = cell(reg + IR_WIDTH - 1);
      const minus = (units & ZB) !== 0 && (units & ZA) === 0;
      return { value, tag, effective: value + (minus ? -factor : factor) };
    };
    const fieldsOf = (at: Addr, length: number) =>
      length === 11 ? [field(at + 1), field(at + 6)] : [field(at + 1)];

    it('all fifteen tagged fields resolve to the effective addresses Wave 4 names', () => {
      const derived = INSTRUCTIONS
        .flatMap(([at, length]) => fieldsOf(at, length))
        .filter((f) => f.tag !== 0);
      expect(derived.map((f) => f.effective)).toEqual([...EXPECTED_EFFECTIVE]);
      expect(new Set(derived.map((f) => f.tag)).size, 'every index register exactly once').toBe(15);
    });

    it('the I phase leaves the effective addresses in AAR and BAR, exactly as decode-only did', () => {
      const report: string[] = [];
      for (const [at, length] of INSTRUCTIONS) {
        const fields = fieldsOf(at, length);
        const bad = fields.find((f) => f.tag !== 0 && (f.effective < 0 || f.effective >= SIZE));
        const where = `${String(at).padStart(5, '0')} L=${length}`;

        const m = fresh();
        m.addressSet(at);
        const step = m.stepCycle();
        expect(step.phase, where).toBe('I');

        if (bad) {
          // An indexed result outside installed storage is an ADDRESS-CHECK STOP, never a wrap —
          // the plan §10 fallback behind `INDEX_OUT_OF_RANGE_TRAPS` (open-questions.md,
          // architecture row). The A-address is decoded before the B-address, so an instruction
          // whose A field is already out of range never reaches its B field: 02244 stops on
          // 90122 and its 101229 is never computed by the machine.
          expect(step.complete, where).toBe(true);
          expect(step.stop, where).toBe('addressCheck');
          expect(m.cpu.lastCheck?.message, where).toContain(String(bad.effective));
          expect(m.regs.iar, `${where} IAR still at the instruction that checked`).toBe(at);
          report.push(`${where}: STOP addressCheck on ${bad.effective}, IAR ${at}`);
          continue;
        }

        expect(step.complete, `${where} the I phase does not finish the instruction`).toBe(false);
        expect(m.regs.aar, `${where} AAR`).toBe(fields[0]?.effective);
        // `A` is address-double, so the 6-character form puts its one address in both registers.
        expect(m.regs.bar, `${where} BAR`).toBe((fields[1] ?? fields[0])?.effective);
        report.push(`${where}: AAR ${m.regs.aar} BAR ${m.regs.bar}`);
      }
      console.log(`tier 3 exec-on — I phase per instruction:\n  ${report.join('\n  ')}`);
      expect(report).toHaveLength(9);
    });

    it('the unindexed `A 11111 22222` at 02200 actually adds', () => {
      // The image holds a word-marked `G` at 11111 — octal 67, B+A over a 7, so a one-character
      // A field of +7 — and a word-marked `0` at 22222, a one-character B field of 0. Both fields
      // are one position long, so the add is one units cycle: 0 + 7 = 7.
      const m = fresh();
      expect(m.storage.bcd(11111), 'A field: `G`, octal 67').toBe(0o67);
      expect(m.storage.wm(11111), 'and word-marked, so LA = 1').toBe(true);
      expect(m.storage.bcd(22222), 'B field: `0`, octal 12 (8-2)').toBe(0o12);
      expect(m.storage.wm(22222), 'and word-marked, so LB = 1').toBe(true);

      m.addressSet(2200);
      expect(m.step()).toBeUndefined();

      // The NUMERIC portion of the result only. The units ZONE is the developed-sign question
      // that belongs to the `A`/`S` sign contract of Wave 3 (opcodes.md §4.1, §4.3), asserted in
      // test/alu.test.ts and test/tier3-arith.test.ts; this file is about indexing.
      expect(m.storage.bcd(22222) & 0o17, '0 + 7 = 7').toBe((bcdOfGlyph('7') ?? 0) & 0o17);
      expect(m.storage.wm(22222), 'the B-field word mark survives the add').toBe(true);
      expect(m.storage.bcd(11111), 'the A field is not modified').toBe(0o67);
      expect(m.snapshot().indicators.zeroBalance, 'a non-zero result').toBe(false);

      // `A` two-field: `NSI / A−LW / B−LB` (opcodes.md §2 p.17), with LA = LB = LW = 1.
      expect(m.regs.iar).toBe(2211);
      expect(m.regs.aar).toBe(11110);
      expect(m.regs.bar).toBe(22221);
    });

    it('the indexed `A 111/1 222K2` at 02211 adds at 11112 / 22223 and pays two index cycles', () => {
      const m = fresh();
      expect(m.storage.bcd(11112), 'A field: `H`, octal 70 — B+A over an 8').toBe(0o70);
      expect(m.storage.bcd(22223), 'B field: `0`, word-marked').toBe(0o12);
      expect(m.storage.wm(22223)).toBe(true);

      m.addressSet(2211);
      expect(m.step()).toBeUndefined();
      expect(m.storage.bcd(22223) & 0o17, '0 + 8 = 8').toBe((bcdOfGlyph('8') ?? 0) & 0o17);
      expect(m.regs.aar).toBe(11111);
      expect(m.regs.bar).toBe(22222);

      // Both address fields are tagged, so this instruction pays 2 × 34.5 µs of index cycles that
      // the unindexed 02200 does not (A22-0526-3 p.15). Every other term of `4.5(L+1+E+A+1.5B)` is
      // identical between the two — same length, same one-position fields, no recomplement — so
      // the difference IS the index charge.
      const plain = fresh();
      plain.addressSet(2200);
      plain.step();
      expect(m.cpu.microsecondsSimulated - plain.cpu.microsecondsSimulated).toBe(2 * INDEX_US);
    });
  },
);
