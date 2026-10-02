import { describe, it, expect } from 'vitest';
import { BLANK_CELL, CLEAR_STORAGE_BAR_AT_00000, CoreStorage } from '../src/core/storage.js';
import { AddressCheck, ProcessCheck } from '../src/core/checks.js';
import { parity } from '../src/core/bcd.js';
import { C, WM } from '../src/core/types.js';

const A = 0o61;   // 'A' = BA1, three bits, odd already — C is 0 without a word mark
const C_CHAR = 0o63;  // 'C' = BA21, four bits — C is added

describe('CoreStorage construction (docs/plans/architecture.md §4.1)', () => {
  it('powers on filled with blank + C, a valid character', () => {
    const s = new CoreStorage(10_000);
    expect(BLANK_CELL).toBe(0x40);
    expect(s.read(0)).toBe(0x40);
    expect(s.read(9_999)).toBe(0x40);
    expect(s.bcd(1234)).toBe(0);
    expect(s.wm(1234)).toBe(false);
    // Every position is odd-parity valid, so a parity-checking read finds nothing wrong.
    s.checkParity = true;
    expect(() => s.read(4321)).not.toThrow();
  });
});

describe('setChar recomputes C; setWm flips it (research/architecture.md §2, A22-0526-3 p.5)', () => {
  it('setChar stores data bits, word mark and the recomputed check bit', () => {
    const s = new CoreStorage(10_000);
    s.setChar(100, A, false);
    expect(s.read(100)).toBe(A);                 // three bits, no C
    s.setChar(101, A, true);
    expect(s.read(101)).toBe(WM | C | A);        // WM makes four — C added
    s.setChar(102, C_CHAR, false);
    expect(s.read(102)).toBe(C | C_CHAR);
    s.setChar(103, C_CHAR, true);
    expect(s.read(103)).toBe(WM | C_CHAR);       // WM makes five — C dropped
  });

  it('setWm flips the check bit and leaves the data bits alone', () => {
    const s = new CoreStorage(10_000);
    s.setChar(200, A, false);
    const before = s.read(200);
    s.setWm(200, true);
    expect(s.read(200)).toBe(before | WM | C);
    expect(s.bcd(200)).toBe(A);
    s.setWm(200, false);
    expect(s.read(200)).toBe(before);
  });

  it('setWm is a no-op when the word mark is already in the wanted state', () => {
    const s = new CoreStorage(10_000);
    s.setChar(300, C_CHAR, true);
    const cell = s.read(300);
    s.setWm(300, true);
    expect(s.read(300)).toBe(cell);
  });

  it('leaves every position odd-parity valid for all 128 (code, word mark) pairs', () => {
    const s = new CoreStorage(10_000);
    s.checkParity = true;
    for (let code = 0; code < 64; code++) {
      for (const wm of [false, true]) {
        s.setChar(500, code, wm);
        expect(() => s.read(500)).not.toThrow();
        s.setWm(500, !wm);
        expect(() => s.read(500)).not.toThrow();
      }
    }
  });
});

describe('the three writers (docs/plans/phase-1-cpu-core.md §3)', () => {
  it('writeWhole replaces all eight bits — load mode takes C from the channel (io.md §3, 223-2692 p.11 Case 2)', () => {
    const s = new CoreStorage(10_000);
    s.writeWhole(400, 0x00);                     // parity-invalid, and load mode does not care
    expect(s.read(400)).toBe(0x00);
    s.writeWhole(401, WM | A);                   // C omitted although parity would want it
    expect(s.read(401)).toBe(WM | A);
    expect(parity(A, true)).toBe(C);             // setChar would have produced the C bit
  });

  it('pokeRaw preserves the byte, C included', () => {
    const s = new CoreStorage(10_000);
    s.pokeRaw(402, 0xff);
    expect(s.read(402)).toBe(0xff);
    s.pokeRaw(403, 0x00);
    expect(s.read(403)).toBe(0x00);
  });

  it('dump is a copy, not the live array', () => {
    const s = new CoreStorage(10_000);
    s.setChar(600, C_CHAR, true);
    const d = s.dump();
    expect(d).toHaveLength(10_000);
    expect(d[600]).toBe(WM | C_CHAR);
    d[600] = 0;
    expect(s.read(600)).toBe(WM | C_CHAR);
  });
});

describe('clearToHundreds — op `/` (research/architecture.md §9, §10; A22-0526-3 p.23)', () => {
  it('`/ 12590` clears 12590-12500 and returns 12499 for BAR', () => {
    const s = new CoreStorage(20_000);
    for (let a = 12_490; a <= 12_600; a++) s.setChar(a, C_CHAR, true);
    const bar = s.clearToHundreds(12_590);
    expect(bar).toBe(12_499);
    for (let a = 12_500; a <= 12_590; a++) {
      expect(s.read(a), `position ${a}`).toBe(BLANK_CELL);   // data AND word marks cleared
      expect(s.wm(a)).toBe(false);
    }
    expect(s.read(12_499)).toBe(WM | C_CHAR);   // one below the boundary: untouched
    expect(s.read(12_591)).toBe(WM | C_CHAR);   // one above the start: untouched
  });

  it('clears just the boundary position when the address already ends 00', () => {
    const s = new CoreStorage(20_000);
    s.setChar(12_500, C_CHAR, true);
    s.setChar(12_501, C_CHAR, true);
    expect(s.clearToHundreds(12_500)).toBe(12_499);
    expect(s.read(12_500)).toBe(BLANK_CELL);
    expect(s.read(12_501)).toBe(WM | C_CHAR);
  });

  it('clears the 00000 block and wraps BAR to 99999 rather than address-checking', () => {
    // The `[unverified]` ruling documented on `CLEAR_STORAGE_BAR_AT_00000` in storage.ts, and the
    // one CC01A settles: `/` "terminates on the hundreds boundary" (opcodes.md §2 p.23), so with
    // `bbb = 000` it stops ON 00000 without asking its address register for a next address —
    // architecture.md §4's "addressing 00000 in a decrementing operation stops with an address
    // check" governs addresses the operation USES. `bbb00−1` in a five-position register is
    // 99999. CC01A's `/ 00000` at 03436 then reads BAR back with `G 09185 B` and halts at 03499
    // unless its low four digits are 9999 (the `+99999` constant at 09249-09253).
    // OPEN: research/open-questions.md `## architecture.md`, "Clear Storage whose hundreds
    // boundary is 00000" `[unverified]`.
    const s = new CoreStorage(10_000);
    for (let a = 0; a <= 100; a++) s.setChar(a, C_CHAR, true);
    expect(s.clearToHundreds(99)).toBe(CLEAR_STORAGE_BAR_AT_00000);
    for (let a = 0; a <= 99; a++) {
      expect(s.read(a), `position ${a}`).toBe(BLANK_CELL);
      expect(s.wm(a)).toBe(false);
    }
    expect(s.read(100), '00100 is in the next block, untouched').toBe(WM | C_CHAR);

    // `/ 00000` itself: exactly one position, same BAR.
    const t = new CoreStorage(10_000);
    t.setChar(0, C_CHAR, true);
    t.setChar(1, C_CHAR, true);
    expect(t.clearToHundreds(0)).toBe(CLEAR_STORAGE_BAR_AT_00000);
    expect(t.read(0)).toBe(BLANK_CELL);
    expect(t.read(1)).toBe(WM | C_CHAR);
    expect(t.clearToHundreds(100)).toBe(99);   // one block higher is an ordinary clear
  });
});

describe('out-of-range addresses stop with an address check (research/architecture.md §4)', () => {
  it('throws on every accessor', () => {
    const s = new CoreStorage(10_000);
    expect(() => s.read(10_000)).toThrow(AddressCheck);
    expect(() => s.read(-1)).toThrow(AddressCheck);
    expect(() => s.bcd(10_000)).toThrow(AddressCheck);
    expect(() => s.wm(10_000)).toThrow(AddressCheck);
    expect(() => s.setChar(10_000, A, false)).toThrow(AddressCheck);
    expect(() => s.setWm(10_000, true)).toThrow(AddressCheck);
    expect(() => s.writeWhole(10_000, 0)).toThrow(AddressCheck);
    expect(() => s.pokeRaw(10_000, 0)).toThrow(AddressCheck);
    expect(() => s.clearToHundreds(10_000)).toThrow(AddressCheck);
    expect(() => s.read(1.5)).toThrow(AddressCheck);
  });
});

describe('parity checking on read is a flag, default off (docs/plans/architecture.md §4.1)', () => {
  it('reads an even-parity cell silently when off, and stops when on', () => {
    const s = new CoreStorage(10_000);
    expect(s.checkParity).toBe(false);
    s.pokeRaw(700, 0x00);                        // blank without its C bit — the insttest fill
    expect(s.read(700)).toBe(0x00);
    s.checkParity = true;
    expect(() => s.read(700)).toThrow(ProcessCheck);
    expect(() => s.bcd(700)).toThrow(ProcessCheck);
    s.pokeRaw(700, BLANK_CELL);
    expect(() => s.read(700)).not.toThrow();
  });
});
