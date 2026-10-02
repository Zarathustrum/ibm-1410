import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createMachine } from '../src/core/machine.js';
import { ZA, ZB, type Addr } from '../src/core/types.js';
import { loadCor } from '../src/formats/cor.js';
import { ORACLES_ABSENT_MESSAGE, oraclePath } from './oracles.js';

// Tier 3, first half (plan §7): `insttest.cor` 02200-02288 — an unindexed `A 11111 22222`,
// then seven 11-character two-address instructions at 02211…02277 giving 14 indexed addresses,
// plus one 6-character one-address form at 02288: all fifteen index registers
// (research/emulators.md §9 step 3).
//
// The expected effective addresses are computed HERE, from the image, by the rules of
// research/architecture.md §4-5 — never by calling address.ts. Two of them are needed:
//   digit  — "every position must have a numeric total of 0-9"; the 8-2 code (numeral `0`,
//            and `? ! ‡`) is zero, every other legal character is its own low-order 8421 value.
//   index  — the 5-digit factor in IR n at 00020+5n..00024+5n is added algebraically; its sign
//            is the ZONE OF ITS OWN UNITS POSITION: B alone is minus, none / A / BA are plus;
//            word marks and every other zone bit inside the register are ignored.

const SIZE = 80_000;
const IR_BASE = 20, IR_WIDTH = 5;

/** 02200 unindexed, then 02211…02277 at 11 characters, then 02288 at 6. */
const INSTRUCTIONS: readonly (readonly [Addr, number])[] = [
  [2200, 11], [2211, 11], [2222, 11], [2233, 11], [2244, 11],
  [2255, 11], [2266, 11], [2277, 11], [2288, 6],
];

describe.skipIf(!oraclePath('insttest.cor'))(
  `tier 3 — insttest.cor 02200-02288, all fifteen index registers — ${ORACLES_ABSENT_MESSAGE}`,
  () => {
    it('decodes fifteen indexed effective addresses, computed independently from the image', () => {
      const path = oraclePath('insttest.cor');
      if (path === null) throw new Error(ORACLES_ABSENT_MESSAGE);
      const m = createMachine({ size: SIZE });
      m.loadImage(loadCor(readFileSync(path).slice().buffer as ArrayBuffer, { zeroFill: 'normalize' }));
      const cell = (a: Addr): number => m.storage.read(a);
      const digit = (a: Addr): number => { const d = cell(a) & 0x0f; return d === 10 ? 0 : d; };

      // One 5-character address field: magnitude, index tag, and the effective address after
      // the tagged register's factor is added algebraically.
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

      const report: string[] = [];
      for (const [at, length] of INSTRUCTIONS) {
        const fields = length === 11 ? [field(at + 1), field(at + 6)] : [field(at + 1)];
        for (const f of fields) {
          if (f.tag !== 0) {
            report.push(`IR${String(f.tag).padStart(2)}: ${String(f.value).padStart(5, '0')}`
              + ` -> ${String(f.effective).padStart(5, '0')} (at ${String(at).padStart(5, '0')})`);
          }
        }

        m.addressSet(at);
        const stop = m.step({ execute: false });
        const where = `${String(at).padStart(5, '0')} L=${length}`;

        // An indexed result outside installed storage is an ADDRESS-CHECK STOP, never a wrap —
        // the plan §10 fallback behind `INDEX_OUT_OF_RANGE_TRAPS` (open-questions.md,
        // architecture row). Three of these fifteen land there; see the report below.
        const bad = fields.find((f) => f.tag !== 0 && (f.effective < 0 || f.effective >= SIZE));
        if (bad) {
          expect(stop, where).toBe('addressCheck');
          expect(m.cpu.lastCheck?.message, where).toContain(String(bad.effective));
          continue;
        }
        expect(stop, where).toBeUndefined();
        expect(m.regs.aar, `${where} AAR`).toBe(fields[0]?.effective);
        // `A` is address-double, so the 6-character form puts its one address in both.
        expect(m.regs.bar, `${where} BAR`).toBe((fields[1] ?? fields[0])?.effective);
      }

      console.log(`tier 3 — fifteen indexed effective addresses:\n  ${report.join('\n  ')}`);
      expect(report.length).toBe(15);
      expect(new Set(report.map((r) => r.slice(0, 4))).size).toBe(15);   // every register once
    });
  },
);
