// src/core/storage.ts — 1410 core storage: one byte per character position.
// Source: docs/plans/phase-1-cpu-core.md §3; docs/plans/architecture.md §4.1.
//
// Layout, low bit last: WM C B A 8 4 2 1 (research/charset.md §1; research/emulators.md §6 —
// this IS the `.cor` byte, which is what makes load -> dump -> byte-compare a real test).
// Parity is ODD over BA8421 + WM + C, so setting a word mark flips C
// (research/architecture.md §2, A22-0526-3 p.5).

import { parity } from './bcd.js';
import { AddressCheck, ProcessCheck } from './checks.js';
import { BCD6, C, WM, type Addr, type Cell, type Storage } from './types.js';

// Blank (octal 00) carries no data bits, so odd parity puts its C bit on: 0x40. This is a VALID
// character, and it is the state of every position after a power-on clear — the machine does not
// come up holding parity-invalid zeros (research/charset.md §2 rank 00; research/emulators.md
// §5.1, where `cc01.cor` fills unused storage with exactly this byte).
export const BLANK_CELL: Cell = C;

// BAR after `/` when the hundreds boundary IS 00000 — the one `[unverified]` reading in Clear
// Storage, and the only value in the op that no research sentence states.
//
// Two sentences meet here and neither covers `bbb = 000`. research/architecture.md §4
// (A22-0526-3 p.8): "00000 is always valid for incrementing operations; addressing 00000 in a
// **decrementing** operation stops with an address check — no exceptions." research/opcodes.md
// §2 p.23: `/` "terminates on the hundreds boundary (address ending `00`)" and leaves
// `NSI / B / bbb00−1`.
//
// CC01A settles the behaviour, and it is the reason this constant exists. At 03436 the
// diagnostic executes `/ 00000`; at 03442 `G 09185 B` and at 03449 `G 09181 A` store BAR and
// AAR into two deliberately overlapping fields (09182-09185 = the low FOUR digits of BAR,
// 09177-09181 = all five of AAR); `A 09570 09181` adds the `+0` at 09570 and `S 09253 09185`
// subtracts the `+99999` at 09249-09253, each followed by `J … V` (BZ). Both branches are taken
// — i.e. the program runs on — only if AAR reads back 00000 and the low four digits of BAR read
// back 9999. Otherwise it falls into the halts at 03474/03499. So `/ 00000` clears 00000 and
// does NOT stop.
//
// The reading that makes both sentences true: §4's rule is about an address the operation USES
// to reach storage, and a decrementing scan that reaches 00000 must ask its address register
// for a next address it cannot give. `/` never asks — §2 says it terminates ON the boundary,
// and with B = 00000 the boundary is the same position. The `bbb00−1` left in BAR is then a
// register result, not an address `/` accesses, and an address register is five decimal
// positions (research/architecture.md §6), so 00000−1 is 99999. A later op that actually uses
// that BAR still address-checks, in `guard` below.
// OPEN: research/open-questions.md `## architecture.md`, "Clear Storage whose hundreds boundary
// is 00000" `[unverified]`.
export const CLEAR_STORAGE_BAR_AT_00000 = 99_999;

export class CoreStorage implements Storage {
  readonly size: 10_000 | 20_000 | 40_000 | 60_000 | 80_000;

  // Parity checking on read is a configuration flag, default OFF for Phase 1
  // (docs/plans/architecture.md §4.1). Two of the three oracle images ship parity-invalid 0x00
  // fill, so a machine that checked parity by default would stop the moment it read untouched
  // storage in those images (research/emulators.md §5.1).
  checkParity = false;

  private readonly m: Uint8Array;

  constructor(size: 10_000 | 20_000 | 40_000 | 60_000 | 80_000) {
    this.size = size;
    this.m = new Uint8Array(size).fill(BLANK_CELL);
  }

  // Every access goes through here, mirroring the storage address register
  // (research/architecture.md §6). An address outside installed storage is an address check,
  // never a wrap (research/architecture.md §4-5).
  private guard(a: Addr): number {
    if (!Number.isInteger(a) || a < 0 || a >= this.size) {
      throw new AddressCheck(`address ${a} outside installed storage (${this.size})`, a);
    }
    return a;
  }

  read(a: Addr): Cell {
    const cell = this.m[this.guard(a)] ?? 0;
    if (this.checkParity) {
      let bits = 0;
      for (let b = cell; b !== 0; b >>= 1) bits += b & 1;
      if ((bits & 1) === 0) {
        throw new ProcessCheck(`even parity at ${a} (cell 0x${cell.toString(16)})`, a);
      }
    }
    return cell;
  }

  // BA8421 only — what Compare and Branch-if-Character-Equal see; never the C bit or the word
  // mark (research/charset.md §4.1, A22-0526-3 p.28).
  bcd(a: Addr): number { return this.read(a) & BCD6; }

  wm(a: Addr): boolean { return (this.read(a) & WM) !== 0; }

  // Normal execution's writer: the data bits and the word mark are given, C is recomputed.
  setChar(a: Addr, bcd6: number, wm: boolean): void {
    const bits = bcd6 & BCD6;
    this.m[this.guard(a)] = (wm ? WM : 0) | parity(bits, wm) | bits;
  }

  // Set Word Mark / Clear Word Mark. The word mark participates in parity, so changing it flips
  // the check bit and leaves the data bits alone (research/architecture.md §2, A22-0526-3 p.5).
  setWm(a: Addr, on: boolean): void {
    const p = this.guard(a);
    const cell = this.m[p] ?? 0;
    if (((cell & WM) !== 0) === on) return;
    this.m[p] = (cell ^ WM) ^ C;
  }

  // LOAD MODE ONLY. In load mode the BCD bits, the word mark and the check bit all arrive from
  // the channel data register and the old core byte contributes nothing — the whole eight bits
  // are replaced (research/io.md §3; 223-2692 p.11 Case 2). Not a general-purpose poke: normal
  // execution uses setChar, which recomputes C. Byte-for-byte identical to `pokeRaw` below — the
  // split is a documentation seam recording CALL-SITE INTENT, not a mechanical difference.
  writeWhole(a: Addr, cell: Cell): void {
    this.m[this.guard(a)] = cell & 0xff;
  }

  // LOADER ONLY — `src/formats/cor.ts` and nothing else. Stores the byte verbatim, C included,
  // which is what keeps the `.cor` byte-identity test honest and makes the 0x00-fill
  // normalisation a visible caller-chosen step (docs/plans/phase-1-cpu-core.md §6.1). Same body
  // as `writeWhole` above: the split names the caller, not a difference in what core does.
  pokeRaw(a: Addr, cell: Cell): void {
    this.m[this.guard(a)] = cell & 0xff;
  }

  // Op `/` Clear Storage: clears data AND word marks right-to-left from `from` down to and
  // including the nearest hundreds position, and leaves BAR at that boundary minus one.
  // `/ 12590` clears 12590-12500 and leaves BAR 12499 (research/architecture.md §9 `/` row and
  // §10 "Processing-control ops", A22-0526-3 p.23; docs/plans/architecture.md §8 tier 1).
  clearToHundreds(from: Addr): Addr {
    const base = Math.floor(this.guard(from) / 100) * 100;
    for (let a = from; a >= base; a--) this.m[a] = BLANK_CELL;
    return base === 0 ? CLEAR_STORAGE_BAR_AT_00000 : base - 1;
  }

  // A copy, so a caller cannot reach in through the dump and mutate core.
  dump(): Uint8Array { return this.m.slice(); }
}
