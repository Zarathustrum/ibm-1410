// src/core/trace.ts — the three line-oriented trace levels of plan §6.2, and nothing else.
//
// Every formatter here is pure: a record in, a string out. `cpu.ts` builds the record only
// when a tracer is attached, so a null sink costs nothing in the browser (plan §6.2).
// The shapes are fixed — `tools/trace-diff.ts` and the tier-2 oracle both match on them:
//
//   L1  I 02194  A 01250  B 00000  OP M  D W  LEN 10  CY 49.5   # M %T0 01250 W
//   L2  D 00100  FORM Oab   LEN 11  OP A  AAR 11111 BAR 22222 DBL=1  OK
//   L3  02300 A  scan1 units  Ac=0 Bc=0 cin=0 cout=0 zb=1 ovf=0  a=5 b=3 → 8

import { glyphOf } from './bcd.js';
import { BCD6, type Addr, type Cell, type Form, type LatchTraceRecord } from './types.js';

/** Attach one to a `Cpu`. Level 1 emits a step line, level 2 adds a decode line per read-out. */
export interface Tracer {
  level: 1 | 2 | 3;
  sink: (line: string) => void;
}

const addr5 = (a: Addr): string => String(a).padStart(5, '0');

// ─── L1: one line per executed step ────────────────────────────────────────
/** `I` is the address the instruction was read from, which is where the log sample's 02194 is. */
export interface StepTraceRecord {
  iar: Addr;
  aar: Addr;
  bar: Addr;
  opChar: string;
  dGlyph: string;
  length: number;
  cycles: number;
  /** The instruction as glyphs, one space per field boundary — see `disassemble`. */
  text: string;
}

export function formatL1(r: StepTraceRecord): string {
  return `I ${addr5(r.iar)}  A ${addr5(r.aar)}  B ${addr5(r.bar)}`
    + `  OP ${r.opChar}  D ${r.dGlyph}`
    + `  LEN ${String(r.length).padStart(2)}`
    + `  CY ${String(r.cycles).padEnd(5)}  # ${r.text}`;
}

// ─── L2: one line per read-out — Wave 0's oracle ───────────────────────────
export interface DecodeTraceRecord {
  addr: Addr;
  form: Form;
  length: number;
  opChar: string;
  /** Register contents AFTER read-out. Meaningless unless `touched`. */
  aar: Addr;
  bar: Addr;
  /** False when the form assigned no address register — printed as `AAR=prev BAR=prev`. */
  touched: boolean;
  addressDouble: boolean;
  /** The D cycle that restores `DAR == BAR` (223-2589 p.52). */
  dCycle: boolean;
  /** `OK` for a read-out that completed. A check throws before the record exists. */
  status: string;
}

export function formatL2(r: DecodeTraceRecord): string {
  const body = r.touched
    ? `AAR ${addr5(r.aar)} BAR ${addr5(r.bar)} DBL=${r.addressDouble ? 1 : 0}`
    : 'AAR=prev BAR=prev';
  return `D ${addr5(r.addr)}  FORM ${r.form.padEnd(6)}LEN ${String(r.length).padStart(2)}`
    + `  OP ${r.opChar}  ${body}${r.dCycle ? '  Dcycle' : ''}  ${r.status}`;
}

// ─── L3: the note1410.txt latch trace — Wave 3 produces these ──────────────
// The record type itself now lives in types.ts and is re-exported here UNDER THE SAME NAMES,
// so every existing `import { type LatchTraceRecord } from './trace.js'` still resolves. It
// had to move: `OpForm.exec` returns `Iterator<LatchTraceRecord>` for the multi-cycle
// arithmetic pass (plan §1 `stepCycle()`), and types.ts imports nothing. The latch vocabulary
// and its citations travelled with the declaration; `formatL3Latch` below is unchanged, and
// its line shape is the contract `tools/trace-diff.ts` and the note1410 oracle match on.
export type { Latch, LatchTraceRecord } from './types.js';

export function formatL3Latch(r: LatchTraceRecord): string {
  const head = `${addr5(r.addr)} ${r.opChar}  `;
  if (r.kind === 'end') {
    return `${head}${'end'.padEnd(11)}  zb=${r.zb} ovf=${r.ovf}  ${r.result}`;
  }
  return `${head}${`${r.scan} ${r.unit}`.padEnd(11)}`
    + `  Ac=${r.Ac} Bc=${r.Bc} cin=${r.cin} cout=${r.cout} zb=${r.zb} ovf=${r.ovf}`
    + `  a=${r.a} b=${r.b} → ${r.r}`;
}

// ─── shared ────────────────────────────────────────────────────────────────
/** Field widths per instruction format — research/architecture.md §7, A22-0526-3 p.11. */
const FIELDS: Readonly<Record<Form, readonly number[]>> = {
  O: [1], Od: [1, 1], Oxxxd: [1, 3, 1], Oa: [1, 5], Oad: [1, 5, 1],
  Oxxxbd: [1, 3, 5, 1], Oab: [1, 5, 5], Oabd: [1, 5, 5, 1], Olong: [1],
};

/** The instruction as glyphs with one space at each field boundary: `M %T0 01250 W`. */
export function disassemble(form: Form, chars: Uint8Array): string {
  const parts: string[] = [];
  let at = 0;
  for (const width of FIELDS[form]) {
    parts.push(glyphsOf(chars.subarray(at, at + width)));
    at += width;
  }
  if (at < chars.length) parts.push(glyphsOf(chars.subarray(at)));   // a long `N`
  return parts.filter((p) => p.length > 0).join(' ');
}

function glyphsOf(cells: Uint8Array): string {
  let out = '';
  for (const cell of cells) out += glyphOf(cell & BCD6);
  return out;
}

/** One cell as its print glyph — the op-modifier register on an L1 line. */
export function glyphOfCell(cell: Cell): string {
  return glyphOf(cell & BCD6);
}
