import { describe, it, expect } from 'vitest';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { AddressCheck } from '../src/core/checks.js';
import {
  INDEX_OUT_OF_RANGE_TRAPS, addressDigit, checkAddress, decodeAddress, resolveIndex,
} from '../src/core/address.js';
import { CoreStorage } from '../src/core/storage.js';

// Lay real characters into real core — the address decoder reads storage, never a shortcut array.
function writeChars(s: CoreStorage, at: number, glyphs: string, wm = false): void {
  [...glyphs].forEach((g, i) => {
    const code = bcdOfGlyph(g);
    if (code === undefined) throw new Error(`no BCD for glyph "${g}"`);
    s.setChar(at + i, code, wm && i === 0);
  });
}

const digitOf = (glyph: string): number | null => addressDigit(bcdOfGlyph(glyph) ?? -1);

describe('addressDigit — the hand-written 64-entry table (research/architecture.md §4, p.8)', () => {
  it('accepts the ten numerals, including 0 coded 8-2', () => {
    for (let d = 0; d <= 9; d++) expect(digitOf(String(d))).toBe(d);
    expect(bcdOfGlyph('0')).toBe(0o12);          // 8-2, yet it means zero
  });

  it('accepts all twenty-six letters at their numeric values', () => {
    'ABCDEFGHI'.split('').forEach((g, i) => expect(digitOf(g), g).toBe(i + 1));
    'JKLMNOPQR'.split('').forEach((g, i) => expect(digitOf(g), g).toBe(i + 1));
    'STUVWXYZ'.split('').forEach((g, i) => expect(digitOf(g), g).toBe(i + 2));
  });

  it('accepts `/ ? ! ‡`, the four the manual names alongside numerals and letters', () => {
    expect(digitOf('/')).toBe(1);
    expect(digitOf('?')).toBe(0);
    expect(digitOf('!')).toBe(0);
    expect(digitOf('‡')).toBe(0);                // record mark
  });

  it('rejects `&`, `$` and `#`, which the manual names as address checks', () => {
    expect(digitOf('&')).toBeNull();             // numeric bits 0, yet illegal — no derived rule works
    expect(digitOf('$')).toBeNull();
    expect(digitOf('#')).toBeNull();
  });

  it('rejects blank, `-`, the substitute blank and every other non-listed character', () => {
    for (const g of [' ', '-', 'ƀ', '.', ',', '%', '@', ':', '>', '*', ';', '[', '<', '⧧', '√', '⌒', '⧻', '\\', 'Δ', ']', '⌑']) {
      expect(digitOf(g), g).toBeNull();
    }
    // exactly forty of the sixty-four codes are legal address characters
    let legal = 0;
    for (let c = 0; c < 64; c++) if (addressDigit(c) !== null) legal++;
    expect(legal).toBe(10 + 26 + 4);
  });

  it('ignores the C and word-mark bits', () => {
    expect(addressDigit(0xc0 | 0o61)).toBe(1);   // 'A' with both
  });
});

describe('decodeAddress — magnitude and index tag (research/architecture.md §4-5)', () => {
  it('decodes a plain five-digit address', () => {
    const s = new CoreStorage(20_000);
    writeChars(s, 1000, '12345');
    expect(decodeAddress(s, 1000)).toEqual({ value: 12_345, tag: 0, valid: true });
  });

  // Weights: A over tens = 1, B over tens = 2, A over hundreds = 4, B over hundreds = 8
  // (research/architecture.md §5, A22-0526-3 p.14 Fig. 10).
  it('reads all sixteen tag values off the tens and hundreds zone bits', () => {
    const s = new CoreStorage(20_000);
    const forDigitOne = { none: '1', A: '/', B: 'J', BA: 'A' };   // digit 1 under each zone
    const tensWeight = { none: 0, A: 1, B: 2, BA: 3 };
    const hundWeight = { none: 0, A: 4, B: 8, BA: 12 };
    for (const h of ['none', 'A', 'B', 'BA'] as const) {
      for (const t of ['none', 'A', 'B', 'BA'] as const) {
        writeChars(s, 2000, `00${forDigitOne[h]}${forDigitOne[t]}0`);
        const d = decodeAddress(s, 2000);
        expect(d, `hundreds ${h}, tens ${t}`).toEqual({
          value: 110, tag: hundWeight[h] + tensWeight[t], valid: true,
        });
      }
    }
  });

  it('rejects a zone bit in the units, thousands or ten-thousands position', () => {
    const s = new CoreStorage(20_000);
    for (const [i, field] of [[0, 'ten-thousands'], [1, 'thousands'], [4, 'units']] as const) {
      const chars = '00000'.split('');
      chars[i] = 'A';                            // BA zone over digit 1
      writeChars(s, 3000, chars.join(''));
      expect(decodeAddress(s, 3000).valid, field).toBe(false);
    }
  });

  it('rejects an illegal address character in any position', () => {
    const s = new CoreStorage(20_000);
    for (let i = 0; i < 5; i++) {
      const chars = '00000'.split('');
      chars[i] = '&';
      writeChars(s, 3100, chars.join(''));
      expect(decodeAddress(s, 3100).valid, `position ${i}`).toBe(false);
    }
  });
});

describe('resolveIndex — algebraic index addition (research/architecture.md §5, A22-0526-3 p.15)', () => {
  // THE worked example from p.15: A-address `009Z6` = 00996 tagged IR1; IR1 holds `0001J` = -00011;
  // effective address 00985. Built out of real characters in real core, IR contents included.
  it('009Z6 tagged IR1 containing 0001J resolves to 00985', () => {
    const s = new CoreStorage(10_000);
    writeChars(s, 4000, '009Z6');
    writeChars(s, 25, '0001J');                  // IR1 lives at 00025-00029 as ordinary storage
    const d = decodeAddress(s, 4000);
    expect(d).toEqual({ value: 996, tag: 1, valid: true });
    expect(resolveIndex(s, d)).toBe(985);
  });

  it('takes the sign from the zone bits of the factor units position only', () => {
    const s = new CoreStorage(10_000);
    writeChars(s, 4000, '009Z6');                // 00996 tagged IR1
    writeChars(s, 25, '0001A');                  // BA zone on the units — plus 11
    expect(resolveIndex(s, decodeAddress(s, 4000))).toBe(1007);
    writeChars(s, 25, '00011');                  // no zone — plus 11
    expect(resolveIndex(s, decodeAddress(s, 4000))).toBe(1007);
    writeChars(s, 25, '0001/');                  // A zone alone — plus 1
    expect(resolveIndex(s, decodeAddress(s, 4000))).toBe(1007);
    writeChars(s, 25, '0001J');                  // B alone — minus
    expect(resolveIndex(s, decodeAddress(s, 4000))).toBe(985);
  });

  it('ignores word marks and non-units zone bits inside the index register', () => {
    const s = new CoreStorage(10_000);
    writeChars(s, 4000, '009Z6');
    // `?` is digit 0 carrying a BA (plus) zone: a plus zone anywhere but the units is ignored,
    // so the minus zone on the units `J` still governs. Word mark on 00025, also ignored.
    writeChars(s, 25, '?001J', true);
    expect(resolveIndex(s, decodeAddress(s, 4000))).toBe(985);
  });

  it('reaches all fifteen registers at 00020+5n .. 00024+5n', () => {
    const s = new CoreStorage(20_000);
    for (let n = 1; n <= 15; n++) writeChars(s, 20 + 5 * n, String(n).padStart(5, '0'));
    // Zone carriers: no zone is the plain digit 0; A, B and BA zones ride digit 1 as `/ J A`.
    const carrier = ['0', '/', 'J', 'A'] as const;
    for (let n = 1; n <= 15; n++) {
      const hc = carrier[(n >> 2) & 3] ?? '0';
      const tc = carrier[n & 3] ?? '0';
      writeChars(s, 5000, `00${hc}${tc}0`);
      const d = decodeAddress(s, 5000);
      expect(d.tag, `IR${n}`).toBe(n);
      const base = ((n >> 2) === 0 ? 0 : 100) + ((n & 3) === 0 ? 0 : 10);
      expect(resolveIndex(s, d), `IR${n}`).toBe(base + n);
    }
  });

  it('returns the magnitude untouched when the address is not tagged', () => {
    const s = new CoreStorage(10_000);
    writeChars(s, 4000, '00996');
    writeChars(s, 25, '99999');
    expect(resolveIndex(s, decodeAddress(s, 4000))).toBe(996);
  });

  it('address-checks an UNTAGGED address beyond installed storage (research/architecture.md §4)', () => {
    // The A-address of `A 99999 88888` on a 10K machine. Nothing indexes it, so nothing else in
    // this routine would look at its magnitude — but 99999 is not a position the machine has, and
    // §4 (A22-0526-3 p.8) makes being inside installed storage a property of the address itself.
    const s = new CoreStorage(10_000);
    writeChars(s, 4000, '99999');
    expect(decodeAddress(s, 4000)).toEqual({ value: 99_999, tag: 0, valid: true });
    expect(() => resolveIndex(s, decodeAddress(s, 4000))).toThrow(AddressCheck);
    // 09999 is the top of that same machine and resolves; the check is range, not magnitude.
    writeChars(s, 4000, '09999');
    expect(resolveIndex(s, decodeAddress(s, 4000))).toBe(9_999);
    // and the identical field on an 80K machine is an ordinary address
    const big = new CoreStorage(80_000);
    writeChars(big, 4000, '79999');
    expect(resolveIndex(big, decodeAddress(big, 4000))).toBe(79_999);
  });

  it('address-checks an invalid decode rather than resolving it', () => {
    const s = new CoreStorage(10_000);
    writeChars(s, 4000, '00&96');
    expect(() => resolveIndex(s, decodeAddress(s, 4000))).toThrow(AddressCheck);
  });

  it('address-checks a non-zero high-order position on a 10K machine (p.15)', () => {
    const s = new CoreStorage(10_000);
    writeChars(s, 4000, '109Z6');                // 10996 tagged IR1
    writeChars(s, 25, '00001');
    expect(() => resolveIndex(s, decodeAddress(s, 4000))).toThrow(/high-order position/);
    // the same address on a 20K machine indexes normally
    const big = new CoreStorage(20_000);
    writeChars(big, 4000, '109Z6');
    writeChars(big, 25, '00001');
    expect(resolveIndex(big, decodeAddress(big, 4000))).toBe(10_997);
  });

  it('traps an indexed result outside installed storage — it never wraps', () => {
    expect(INDEX_OUT_OF_RANGE_TRAPS).toBe(true);
    const s = new CoreStorage(20_000);
    writeChars(s, 4000, '199Z9');                // 19999 tagged IR1
    writeChars(s, 25, '00005');                  // + 5 = 20004, past the top of a 20K machine
    expect(() => resolveIndex(s, decodeAddress(s, 4000))).toThrow(AddressCheck);
    // `‡` is the A-zone carrier for digit 0, so `000‡1` is 00001 tagged IR1.
    writeChars(s, 4000, '000‡1');
    writeChars(s, 25, '0000J');                  // - 1 = 00000, still in range
    expect(resolveIndex(s, decodeAddress(s, 4000))).toBe(0);
    writeChars(s, 25, '0000K');                  // - 2 = -1, below zero
    expect(() => resolveIndex(s, decodeAddress(s, 4000))).toThrow(AddressCheck);
  });

  it('address-checks a non-numeric character inside the index register', () => {
    const s = new CoreStorage(10_000);
    writeChars(s, 4000, '009Z6');
    writeChars(s, 25, '000#1');
    expect(() => resolveIndex(s, decodeAddress(s, 4000))).toThrow(AddressCheck);
  });
});

describe('checkAddress — the use-dependent branches (research/architecture.md §4, p.8)', () => {
  it('allows 00000 only for incrementing operations', () => {
    const s = new CoreStorage(10_000);
    expect(checkAddress(s, 0, 'increment')).toBe(0);
    expect(() => checkAddress(s, 0, 'decrement')).toThrow(AddressCheck);
  });

  it('makes the top address illegal for incrementing, legal for decrementing', () => {
    const s = new CoreStorage(60_000);
    expect(checkAddress(s, 59_998, 'increment')).toBe(59_998);   // highest usable, p.8
    expect(() => checkAddress(s, 59_999, 'increment')).toThrow(AddressCheck);
    expect(checkAddress(s, 59_999, 'decrement')).toBe(59_999);
  });

  it('excepts console display/alter and end-of-core I/O from the top-address rule', () => {
    const s = new CoreStorage(60_000);
    expect(checkAddress(s, 59_999, 'increment', true)).toBe(59_999);
  });

  it('rejects anything outside installed storage either way', () => {
    const s = new CoreStorage(10_000);
    expect(() => checkAddress(s, 10_000, 'increment')).toThrow(AddressCheck);
    expect(() => checkAddress(s, -1, 'decrement')).toThrow(AddressCheck);
  });
});
