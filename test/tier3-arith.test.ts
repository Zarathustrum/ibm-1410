// Tier 3, second half (plan §7) — `insttest.cor` **02300-02799** against `note1410.txt`'s
// arithmetic latch annotations, transcribed as data in `oracle/note1410/arith.ts`.
//
// SEQUENTIAL, ONE SUB-BLOCK PER START — not instruction by instruction. The note and the image
// agree on this and it is not a preference:
//   · The operand fields live in 10001-10600 and earlier instructions MUTATE them. `A 10023`
//     at 02344 doubles 015 into 030 in place; running it twice would give 060. `? 10223 10229`
//     at 02533 stores into 10224-10229 and 02544's annotation says the A field at 10223 "still
//     has b=\:>(radical) AT THIS POINT" — a statement that is only true after 02533 has run.
//   · The chained forms at 02379, 02484 and 02561 are 1-character instructions with no address
//     fields at all. They have no meaning except as the successor of the instruction before
//     them, whose `A-LW` / `B-LB` registers they inherit.
//   · The image itself is contiguous: every instruction carries a word mark on its op code and
//     the next word mark is the next instruction's, so read-out walks the block with no gaps.
// Each sub-block ends in a `.` Halt (02391, 02496, 02596, 02644, 02766) followed by a SECOND
// `.` that is not an instruction — it is the word mark that ends the halt's read-out, exactly
// as opcodes.md §2 p.23 requires of a last instruction. Reading that second `.` out would scan
// to the next block's word mark and Instruction-Check on the length, which is why each block is
// run from its own address and stopped at its halt.
//
// Wave 3 owns `A` and `S` (02300-02496), Wave 6 `?` and `!` (02500-02596), and Phase 1b Wave B
// `@` and `%` (02600-02766) — so all five sub-blocks now run halt-terminated and there is no
// `test.todo` path left. The fixture still records `pending: 'wave6'` against the ZA/ZS cases:
// that field says which wave OWED the executor, which is provenance worth keeping.
//
// The `@` and `%` cases assert a `resultField` that is `[derived]` — hand-derived from
// `opcodes.md` §4.5 / §4.6, because `note1410.txt` gives those ten instructions their operand
// fields and no latch lines at all. The arithmetic and the citation are in the fixture beside
// each value, and the label is defined in `docs/research/open-questions.md`.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { glyphOf } from '../src/core/bcd.js';
import { createMachine, type Machine } from '../src/core/machine.js';
import { loadCor } from '../src/formats/cor.js';
import { BCD6, type Addr, type StopReason } from '../src/core/types.js';
import {
  NOTE1410_ARITH, NOTE1410_ARITH_BLOCKS,
  type ArithCase, type Field, type LatchExpectation,
} from '../oracle/note1410/arith.js';
import { noteText } from '../oracle/note1410/ref.js';
import { ORACLES_ABSENT_MESSAGE, oraclePath } from './oracles.js';

const SIZE = 80_000;
const addr5 = (a: Addr): string => String(a).padStart(5, '0');

// ─── The L3 line, parsed back ──────────────────────────────────────────────────────────────
// `formatL3Latch` (src/core/trace.ts) is the shared contract between Wave 3's arithmetic and
// this oracle, so the test reads what the tracer PRINTS rather than reaching into the executor.
// The regexes are deliberately tolerant of extra `key=value` tokens: the record type may gain
// fields, and a fixture that carries none of them must still pass.
//
//   02300 A  scan1 units  Ac=0 Bc=0 cin=0 cout=0 zb=1 ovf=0  a=5 b=3 → 8
//   02300 A  end          zb=0 ovf=0  B=00812+
interface ScanLine {
  kind: 'scan';
  addr: number; opChar: string; scan: 1 | 3; phase: string;
  latches: Record<string, number>;
  a?: string; b?: string; r?: string;
  raw: string;
}
interface EndLine { kind: 'end'; addr: number; opChar: string; latches: Record<string, number>; raw: string }
type LatchLine = ScanLine | EndLine;

const L3 = /^(\d{5}) (\S)\s\s(scan1|scan3) (units|body|extension)\s*\s\s(.*)$/;
const L3_END = /^(\d{5}) (\S)\s\send\s*\s\s(.*)$/;
const LATCH = /\b(Ac|Bc|cin|cout|zb|ovf)=([01])/g;
const DIGITS = /\ba=(.+?) b=(.+?) → (.+?)\s*$/;

function parseL3(line: string): LatchLine | null {
  const end = L3_END.exec(line);
  if (end) {
    return { kind: 'end', addr: Number(end[1]), opChar: end[2] ?? '', latches: latchesOf(end[3] ?? ''), raw: line };
  }
  const m = L3.exec(line);
  if (!m) return null;
  const tail = m[5] ?? '';
  const rec: ScanLine = {
    kind: 'scan',
    addr: Number(m[1]),
    opChar: m[2] ?? '',
    scan: m[3] === 'scan3' ? 3 : 1,
    phase: m[4] ?? '',
    latches: latchesOf(tail),
    raw: line,
  };
  const d = DIGITS.exec(tail);
  if (d) { rec.a = d[1] ?? ''; rec.b = d[2] ?? ''; rec.r = d[3] ?? ''; }
  return rec;
}

function latchesOf(tail: string): Record<string, number> {
  const out: Record<string, number> = {};
  LATCH.lastIndex = 0;
  for (let m = LATCH.exec(tail); m; m = LATCH.exec(tail)) out[m[1] ?? ''] = Number(m[2]);
  return out;
}

// ─── One sub-block, run once ───────────────────────────────────────────────────────────────
interface BlockRun {
  /** L3 records per op-code address, in emission order. */
  records: Map<number, LatchLine[]>;
  /** The L2 read-out line per op-code address — carries the `Dcycle` marker. */
  decode: Map<number, string>;
  /** AAR / BAR as the PREVIOUS instruction left them, per op-code address. */
  before: Map<number, { aar: number; bar: number }>;
  /** The `resultField` of each fixture case, read straight after that instruction ran. */
  results: Map<number, string>;
  /** The two arithmetic latches a fixture case may assert, read straight after it ran. */
  latches: Map<number, { divideOverflow: boolean; zeroBalance: boolean }>;
  stop: StopReason | undefined;
  /** A thrown build-order stub — an executor a later wave owes, not a stop of the 1410. */
  error: string | undefined;
  /** Op-code address of the instruction that ended the run. */
  at: number;
  machine: Machine;
}

function image(): ReturnType<typeof loadCor> {
  const path = oraclePath('insttest.cor');
  if (path === null) throw new Error(ORACLES_ABSENT_MESSAGE);
  // `insttest.cor` fills with 0x00 — no C bit, parity-invalid in Jaeger's own encoding
  // (emulators.md §5.1) — so the fill is normalised to blank-with-C on load.
  return loadCor(readFileSync(path).slice().buffer as ArrayBuffer, { zeroFill: 'normalize' });
}

const CASE_BY_ADDR = new Map<number, ArithCase>(NOTE1410_ARITH.map((c) => [c.addr, c]));

function readField(m: Machine, f: Field): string {
  // `from` defaults to a field addressed at its units position; divide sets it, because its
  // B-address points INSIDE the field (oracle/note1410/arith.ts `Field`).
  const start = f.from ?? f.addr - f.text.length + 1;
  let out = '';
  for (let i = 0; i < f.text.length; i++) out += glyphOf(m.storage.read(start + i) & BCD6);
  return out;
}

function runBlock(from: number): BlockRun {
  let sink: string[] = [];
  const m = createMachine({ size: SIZE, tracer: { level: 3, sink: (l) => sink.push(l) } });
  m.loadImage(image());
  m.addressSet(from);

  const run: BlockRun = {
    records: new Map(), decode: new Map(), before: new Map(), results: new Map(),
    latches: new Map(), stop: undefined, error: undefined, at: from, machine: m,
  };
  for (let i = 0; i < 200; i++) {
    const at = m.regs.iar;
    run.at = at;
    run.before.set(at, { aar: m.regs.aar, bar: m.regs.bar });
    sink = [];
    try {
      run.stop = m.step();
    } catch (e) {
      run.error = (e as Error).message;
      return run;
    }
    const parsed: LatchLine[] = [];
    for (const line of sink) {
      if (line.startsWith('D ')) run.decode.set(at, line);
      const rec = parseL3(line);
      if (rec) parsed.push(rec);
    }
    run.records.set(at, parsed);
    const fixture = CASE_BY_ADDR.get(at);
    if (fixture?.resultField) run.results.set(at, readField(m, fixture.resultField));
    if (fixture?.indicatorsAfter) {
      // Read the fields, never the `test…` methods — testing an overflow latch RESETS it
      // (opcodes.md §8), and an oracle that consumed the thing it asserts would be worthless.
      run.latches.set(at, {
        divideOverflow: m.indicators.divideOverflow,
        zeroBalance: m.indicators.zeroBalance,
      });
    }
    if (run.stop !== undefined) return run;
  }
  return run;
}

/** Blocks are run once each, on first use. */
const RUNS = new Map<number, BlockRun>();
function block(from: number): BlockRun {
  const cached = RUNS.get(from);
  if (cached) return cached;
  const fresh = runBlock(from);
  RUNS.set(from, fresh);
  return fresh;
}

// ─── The assertions for one annotated instruction ──────────────────────────────────────────
function assertCase(run: BlockRun, c: ArithCase): void {
  if (run.error !== undefined && !run.records.has(c.addr)) {
    throw new Error(
      `the ${addr5(c.addr)} block did not reach ${addr5(c.addr)}: ${run.error} at ${addr5(run.at)}`,
    );
  }
  const emitted = run.records.get(c.addr);
  expect(emitted, `no trace records at ${addr5(c.addr)}`).toBeDefined();
  const scans = (emitted ?? []).filter((r): r is ScanLine => r.kind === 'scan');

  if (c.chainedRegisters) {
    const before = run.before.get(c.addr);
    expect(before?.aar, `${addr5(c.addr)} chained AAR`).toBe(c.chainedRegisters.aar);
    expect(before?.bar, `${addr5(c.addr)} chained BAR`).toBe(c.chainedRegisters.bar);
    // The D cycle a 1-character instruction takes to restore `DAR == BAR` (223-2589 p.52).
    expect(run.decode.get(c.addr), `${addr5(c.addr)} read-out`).toMatch(/Dcycle/);
  }

  // An EMPTY `expected` is "the note states no per-cycle latches here", not "no cycles ran" —
  // fixture rule 7, "a field the fixture does not carry is a field the test does not assert".
  // 02544 is the case in point: its annotation is 02533's by reference ("Sequence is same as
  // above"), so it carries its fields and its `resultField` and no cycles (UNMAPPED.md §5).
  if (c.expected.length > 0) {
    expect(scans.length, `${addr5(c.addr)} record count (one per B-field position)`)
      .toBe(c.expected.length);
  }

  c.expected.forEach((want: LatchExpectation, i: number) => {
    const got = scans[i];
    const line = noteText(want.lines).split('\n')[0]?.trim() ?? '';
    const where = `${addr5(c.addr)} cycle ${i} — ${line}`;
    expect(got, where).toBeDefined();
    if (!got) return;
    expect(got.opChar, `${where}: op`).toBe(c.op);
    expect(got.addr, `${where}: addr`).toBe(c.addr);
    if (want.scan !== undefined) expect(got.scan, `${where}: scan`).toBe(want.scan);
    if (want.phase !== undefined) expect(got.phase, `${where}: phase`).toBe(want.phase);
    if (want.a !== undefined) expect(got.a, `${where}: a`).toBe(want.a);
    if (want.b !== undefined) expect(got.b, `${where}: b`).toBe(want.b);
    if (want.r !== undefined) expect(got.r, `${where}: result`).toBe(want.r);
    for (const name of ['Ac', 'Bc', 'cin', 'cout', 'zb', 'ovf'] as const) {
      const expected = want[name];
      if (expected !== undefined) expect(got.latches[name], `${where}: ${name}`).toBe(expected);
    }
  });

  if (c.resultField) {
    expect(run.results.get(c.addr), `${addr5(c.addr)} B field after the instruction`)
      .toBe(c.resultField.text);
  }

  // 02755 is the only case whose result is NOT derivable — the note's own "puposely mis
  // addressing" corrupts the field — so it asserts the indicator instead. The five properly
  // addressed divides assert the latch OFF, which is what catches the spurious divide overflow
  // opcodes.md §4.6 Note 1 warns a left-end-addressed emulator produces.
  if (c.indicatorsAfter) {
    const got = run.latches.get(c.addr);
    expect(got, `${addr5(c.addr)} indicators after the instruction`).toBeDefined();
    for (const name of ['divideOverflow', 'zeroBalance'] as const) {
      const want = c.indicatorsAfter[name];
      if (want !== undefined) expect(got?.[name], `${addr5(c.addr)} ${name}`).toBe(want);
    }
  }
}

/**
 * The instructions plan §5 names case by case — the chained pairs, whose second half is a
 * 1-character instruction with no meaning except as the successor of the first, and the
 * zones-in-both-fields cases. Wave 3: 02368/02379, 02473/02484, 02380, 02485. Wave 6: the
 * zero-and-add chained pair 02550/02561, and 02522, the `?` analogue of 02380/02485 — where the
 * A and B zones are STRIPPED rather than preserved (opcodes.md §2 p.18).
 */
const NAMED_CASES: Readonly<Record<string, { chained: readonly [number, number]; zones?: number }>> = {
  A: { chained: [2368, 2379], zones: 2380 },
  S: { chained: [2473, 2484], zones: 2485 },
  '?/!': { chained: [2550, 2561], zones: 2522 },
};

// ═══ The tests ═════════════════════════════════════════════════════════════════════════════

describe.skipIf(!oraclePath('insttest.cor'))(
  `tier 3 — insttest.cor 02300-02799 arithmetic latch traces — ${ORACLES_ABSENT_MESSAGE}`,
  () => {
    it('the fixture matches the image: every instruction and every operand field', () => {
      const m = createMachine({ size: SIZE });
      m.loadImage(image());
      for (const c of NOTE1410_ARITH) {
        let text = '';
        for (let i = 0; i < c.length; i++) text += glyphOf(m.storage.read(c.addr + i) & BCD6);
        expect(text, `instruction at ${addr5(c.addr)}`).toBe(c.chars);
        expect(m.storage.wm(c.addr), `word mark on the op code at ${addr5(c.addr)}`).toBe(true);
        expect(c.chars[0], `op character at ${addr5(c.addr)}`).toBe(c.op);
        for (const [name, f] of [['A', c.aField], ['B', c.bField]] as const) {
          // `xxxx` is Jaeger's placeholder for product / quotient positions — those cases carry
          // the image's own characters, so every field here is checkable.
          if (!f) continue;
          expect(readField(m, f), `${name} field at ${addr5(f.addr)} (${addr5(c.addr)})`)
            .toBe(f.text);
        }
      }
    });

    it('the annotated block is exactly 02300-02799, in five halt-terminated sub-blocks', () => {
      const addrs = NOTE1410_ARITH.map((c) => c.addr);
      expect(Math.min(...addrs)).toBeGreaterThanOrEqual(2300);
      expect(Math.max(...addrs)).toBeLessThan(2800);
      expect(new Set(addrs).size, 'no duplicate addresses').toBe(addrs.length);
      expect([...addrs], 'address order').toEqual([...addrs].sort((x, y) => x - y));
      expect(NOTE1410_ARITH_BLOCKS.length).toBe(5);
    });

    for (const b of NOTE1410_ARITH_BLOCKS) {
      const cases = NOTE1410_ARITH.filter((c) => c.addr >= b.from && c.addr < b.from + 100);

      describe(`${b.op} — ${addr5(b.from)} to the halt at ${addr5(b.halt)}`, () => {
        it(`runs sequentially from ${addr5(b.from)} and stops on the halt at ${addr5(b.halt)}`, () => {
          const run = block(b.from);
          expect(run.error, 'no executor a later wave owes was reached').toBeUndefined();
          expect(run.stop, 'the block ends on its own Halt').toBe('halt');
          expect(run.at, 'at the halt address the note\'s sub-block ends with').toBe(b.halt);
          expect([...run.records.keys()].filter((a) => CASE_BY_ADDR.has(a)).length,
            'every annotated instruction in the sub-block ran').toBe(cases.length);
        });

        for (const c of cases) {
          it(`${addr5(c.addr)} ${c.op} — note1410.txt lines ${c.lines[0]}-${c.lines[1]}`, () => {
            assertCase(block(b.from), c);
          });
        }
      });

      // The chained pairs and the zones cases the plan calls out by name, asserted as pairs so a
      // regression in the chain shows up as its own failure.
      const named = NAMED_CASES[b.op];
      if (named) {
        const [prepare, chained] = named.chained;
        const zones = named.zones;
        describe(`${b.op} — the named cases`, () => {
          it(`the chained pair ${addr5(prepare)}/${addr5(chained)} and its D cycle`, () => {
            const run = block(b.from);
            const first = CASE_BY_ADDR.get(prepare);
            const second = CASE_BY_ADDR.get(chained);
            expect(first && second, 'both halves are in the fixture').toBeTruthy();
            if (!first || !second) return;
            // The chained instruction inherits exactly what `NSI / A-LW / B-LB` left behind.
            expect(run.before.get(chained)).toEqual(second.chainedRegisters);
            expect(run.decode.get(chained), 'the 1-character form takes a D cycle').toMatch(/Dcycle/);
            expect(run.decode.get(chained), 'and assigns no address fields').toMatch(/AAR=prev BAR=prev/);
            assertCase(run, second);
          });

          if (zones !== undefined) {
            it(`zones in the A and B fields at ${addr5(zones)}`, () => {
              const run = block(b.from);
              const c = CASE_BY_ADDR.get(zones);
              expect(c, 'in the fixture').toBeDefined();
              if (c) assertCase(run, c);
            });
          }
        });
      }
    }
  },
);
