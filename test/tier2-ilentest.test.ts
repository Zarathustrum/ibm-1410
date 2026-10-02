import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { glyphOf } from '../src/core/bcd.js';
import { createMachine } from '../src/core/machine.js';
import type { Addr } from '../src/core/types.js';
import { loadCor } from '../src/formats/cor.js';
import { ORACLES_ABSENT_MESSAGE, oraclePath } from './oracles.js';

// Tier 2 (plan §7): `ilentest.cor` decode-only against the instruction lengths PRESENT IN THE
// IMAGE — never as a source for `forms[].lengths`. `note1410.txt` calls the length block a
// decode test and says Jaeger patched his simulator to disable execution; `execute: false` is
// that mode, supported (research/emulators.md §5.2).

/** research/emulators.md §5.2 address map — one op per hundred, 00100 through 02100. */
const BLOCKS: readonly Addr[] = Array.from({ length: 21 }, (_, i) => 100 + i * 100);

/**
 * The per-op length groups §5.2 inventories in the image. The last row is not §5.2's: it calls
 * 02100 "I/O instructions" and prints no group, so those five come from the acceptable-length
 * table itself (opcodes.md §1.1, 223-2589 p.53).
 */
const LENGTH_GROUPS: Readonly<Record<string, readonly number[]>> = {
  A: [11, 6, 1], S: [11, 6, 1], '?': [11, 6, 1], '!': [11, 6, 1], '@': [11, 6, 1],
  '%': [11, 6, 1], Z: [11, 6, 1], E: [11, 6, 1], C: [11, 6, 1], ',': [11, 6, 1],
  '⌑': [11, 6, 1], '/': [11, 6, 1],
  D: [12, 6, 1], B: [12, 6, 1], W: [12, 6, 1], V: [12, 6, 1], T: [12, 6, 1],
  J: [7], X: [7], R: [7], G: [7],
  '.': [6, 1],
  M: [10], L: [10], U: [5], K: [2], F: [2], '4': [2], '2': [2],
};

/** opcodes.md §1.4, verbatim — the expectation is written here, not read from the table. */
const ADDRESS_DOUBLE = new Set([...'AS?!,⌑/JRX']);

/** plan §6.2 prints these three L2 lines verbatim as the Wave-0 oracle for 00100-00117. */
const THE_LINES: readonly string[] = [
  'D 00100  FORM Oab   LEN 11  OP A  AAR 11111 BAR 22222 DBL=1  OK',
  'D 00111  FORM Oa    LEN  6  OP A  AAR 33333 BAR 33333 DBL=1  OK',
  'D 00117  FORM O     LEN  1  OP A  AAR=prev BAR=prev  Dcycle  OK',
];

describe.skipIf(!oraclePath('ilentest.cor'))(
  `tier 2 — ilentest.cor 00100-02100, decode only — ${ORACLES_ABSENT_MESSAGE}`,
  () => {
    it('decodes 85 instructions, every length in its op\'s documented group, no checks', () => {
      const path = oraclePath('ilentest.cor');
      if (path === null) throw new Error(ORACLES_ABSENT_MESSAGE);
      const lines: string[] = [];
      const m = createMachine({ size: 80_000, tracer: { level: 2, sink: (l) => lines.push(l) } });
      m.loadImage(loadCor(readFileSync(path).slice().buffer as ArrayBuffer, { zeroFill: 'normalize' }));

      // Five address characters as a number. Every address in these blocks is plain numerals;
      // anything else here would itself be the finding.
      const num = (at: Addr): number => {
        let v = 0;
        for (let i = 0; i < 5; i++) {
          const g = glyphOf(m.storage.bcd(at + i));
          if (g < '0' || g > '9') throw new Error(`non-numeral "${g}" in the address at ${at}`);
          v = v * 10 + Number(g);
        }
        return v;
      };

      let count = 0;
      const perBlock: string[] = [];
      for (const base of BLOCKS) {
        const starts: Addr[] = [];
        for (let a = base; a < base + 100; a++) if (m.storage.wm(a)) starts.push(a);
        // The LAST word mark in a block is the spare halt that terminates the one before it;
        // its own read-out would scan into the next block (opcodes.md §2 `.` row: "if it is the
        // last instruction in the program a word mark must be preset immediately to its right").
        const instructions = starts.slice(0, -1);
        perBlock.push(`${String(base).padStart(5, '0')}:${instructions.length}`);
        m.addressSet(base);

        instructions.forEach((at, i) => {
          const nsi = starts[i + 1] ?? 0;
          const length = nsi - at;
          const op = glyphOf(m.storage.bcd(at));
          const where = `${String(at).padStart(5, '0')} ${op} L=${length}`;

          // What the plan §4.1 form table predicts, from this instruction's own characters.
          let aar = m.regs.aar, bar = m.regs.bar;
          let car: number | null = null;
          if (length === 11 || length === 12) { aar = num(at + 1); bar = num(at + 6); }
          else if (length === 7) {
            // The four ops at length 7 are `J X R G`, and `G` is not like the other three:
            // opcodes.md §2's G row prints `NSI / Ap / Bp` and "Uses the C-address register, so
            // AAR is not disturbed" (A22-0526-3 p.22). `J X R` are in §1.4's address-double set,
            // so their I-address is read into AAR and BAR alike.
            if (op === 'G') car = num(at + 1);
            else { aar = num(at + 1); if (ADDRESS_DOUBLE.has(op)) bar = aar; }
          }
          else if (length === 6) { aar = num(at + 1); if (ADDRESS_DOUBLE.has(op)) bar = aar; }
          else if (length === 10) { bar = num(at + 4); }

          expect(m.step({ execute: false }), where).toBeUndefined();
          expect(m.regs.iar, `${where} nsi`).toBe(nsi);
          expect(LENGTH_GROUPS[op], `${where} has a documented length group`).toBeDefined();
          expect(LENGTH_GROUPS[op], where).toContain(length);
          expect(m.regs.aar, `${where} AAR`).toBe(aar);
          expect(m.regs.bar, `${where} BAR`).toBe(bar);
          if (car !== null) expect(m.regs.car, `${where} CAR`).toBe(car);
          count++;
        });
      }

      // emulators.md §5.2 gives length GROUPS, not a total. This is what the image holds.
      console.log(`tier 2: ${count} instructions decoded — ${perBlock.join(' ')}`);
      expect(count).toBe(85);
      expect(m.cpu.lastStop).toBeUndefined();
      expect(lines.length).toBe(85);
      expect(lines.slice(0, 3)).toEqual(THE_LINES);
    });
  },
);
