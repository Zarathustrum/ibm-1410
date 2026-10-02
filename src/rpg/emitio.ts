// src/rpg/emitio.ts — the Phase-5 I/O choke point (plan §8.3).
//
// ONLY ioStmt is governed by the Autocoder unit-record statement form. readBlockStmts composes
// that governed result with branchOnEndOfFile; it does not spell another I/O statement.
// carriageStmt, senseOverflowStmts and branchOnEndOfFile emit CC1, BCV1 and BEF1: carriage
// control and J-family branches that were never part of that form. Keeping them here still makes
// the interlock release and the live-carriage overflow latch one reviewed boundary.

import { CARRIAGE_D_TABLE, type CarriageMode } from '../core/isa/dmods.js';
import { RpgBug, type Stmt } from './types.js';

export type IoUnit = 'reader' | 'printer';

export type IoRequest =
  | {
    readonly unit: 'reader';
    readonly direction: 'read';
    readonly mode: 'move' | 'load';
    readonly area: string;
    readonly pocket: '0' | '1' | '2' | '9';
  }
  | {
    readonly unit: 'printer';
    readonly direction: 'write';
    readonly mode: 'move' | 'load';
    readonly area: string;
    readonly pocket?: never;
  };

/** The operation fields this module can contribute to §8.3's runtime subset check. */
export const EMITIO_MACHINE_OPERATIONS = ['R1', 'R1W', 'W1', 'W1W', 'CC1'] as const;

const RELEASE: Stmt = { op: 'BA1', operands: ['*+1'] };

/**
 * OPEN: `GENERATED_READ_TAKES_THE_BAKED_D` — our ruling. `R1 0,CDIN` uses the R family's
 * baked read d (C28-0309-1 pp.23-24, 47, `[verified]`) and never writes `$`; the disjoint layout
 * keeps a GM-WM out of CDIN. This leaves Phase 3's explicit-I/O-d question irrelevant to generated
 * RPG. Fallback: add an explicit d to IoRequest and emit `R1 0,CDIN,$`. Plan §15;
 * `open-questions.md`, Phase 5 / Wave 2.
 */
export const GENERATED_READ_TAKES_THE_BAKED_D = true;

function unitOf(value: unknown): unknown {
  if (typeof value === 'object' && value !== null && 'unit' in value) return value.unit;
  return undefined;
}

/**
 * Emit a unit-record operation and its channel-interlock release. The mnemonic supplies the
 * channel, device, mode and d; source carries only a reader pocket (when applicable) and B.
 */
export function ioStmt(req: IoRequest): readonly [Stmt, Stmt] {
  switch (req.unit) {
    case 'reader': {
      const op = req.mode === 'load' ? 'R1W' : 'R1';
      return [{ op, operands: [req.pocket, req.area] }, RELEASE];
    }
    case 'printer': {
      const op = req.mode === 'load' ? 'W1W' : 'W1';
      return [{ op, operands: [req.area] }, RELEASE];
    }
    default:
      throw new RpgBug(`emitio: no choke-point arm for unit ${String(unitOf(req))}`);
  }
}

/** Keep the frozen read/status/release order without splitting the choke-point pair at call sites. */
export function readBlockStmts(
  req: Extract<IoRequest, { readonly unit: 'reader' }>,
  eof: string,
): readonly Stmt[] {
  const [read, release] = ioStmt(req);
  return [read, branchOnEndOfFile(eof), release];
}

export type CarriageMotion =
  | {
    readonly kind: 'space';
    readonly when: 'immediate' | 'afterPrint';
    readonly n: 1 | 2 | 3;
  }
  | {
    readonly kind: 'skip';
    readonly when: 'immediate' | 'afterPrint';
    readonly n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  };

/** Resolve all four carriage quadrants through the machine's table; never type a d here. */
export function carriageStmt(motion: CarriageMotion): readonly Stmt[] {
  const mode: CarriageMode = motion.kind === 'skip'
    ? motion.when === 'immediate' ? 'immediateSkip' : 'skipAfterPrint'
    : motion.when === 'immediate' ? 'immediateSpace' : 'spaceAfterPrint';
  const row = CARRIAGE_D_TABLE.find((candidate) => (
    candidate.mode === mode && candidate.value === motion.n
  ))!;
  return [{ op: 'CC1', operands: [row.d] }, RELEASE];
}

/**
 * OPEN: `OVERFLOW_IS_LATCHED_IMMEDIATELY_AFTER_THE_PRINT` — `[likely]`. A22-0526-3 p.36
 * Figure 35 says carriage-channel indicators are live: channels 9/12 turn off when another
 * channel is sensed. Detail/total output therefore tests BCV1 after the print interlock release
 * and before any CC1, then stores the result in OF. Fallback: generate a line counter and compare
 * it with a forms-depth constant. Plan §15; `open-questions.md`, Phase 5 / Wave 2.
 */
export const OVERFLOW_IS_LATCHED_IMMEDIATELY_AFTER_THE_PRINT = true;

/**
 * OPEN: `PAGE_OVERFLOW_IS_CARRIAGE_CHANNEL_12` — `[likely]`. BCV1 is the 1410 channel-12
 * carriage-overflow branch (A22-0526-3 p.36 Figure 35); the punch at form line 60 is our
 * DEFAULT_CARRIAGE_TAPE choice, not an IBM-published form. Fallback: the same generated line
 * counter as above. Plan §15; `open-questions.md`, Phase 5 / Wave 2.
 */
export const PAGE_OVERFLOW_IS_CARRIAGE_CHANNEL_12 = true;

/**
 * Latch live channel 12 immediately after a detail/total print and before carriage motion.
 * BCV1 and B are seven positions each; the asterisk is BCV1's last position, so `*+8` is the
 * third statement's address. The caller labels the statement following this sequence with `done`.
 */
export function senseOverflowStmts(indicator: string, done: string): readonly Stmt[] {
  return [
    { op: 'BCV1', operands: ['*+8'] },
    { op: 'B', operands: [done] },
    { op: 'MLCS', operands: ['ONE', indicator] },
  ];
}

/** BEF1 is a J-family status branch, housed here only beside the read it follows. */
export function branchOnEndOfFile(to: string): Stmt {
  return { op: 'BEF1', operands: [to] };
}
