import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { bcdOfGlyph } from '../src/core/bcd.js';
import { CoreStorage } from '../src/core/storage.js';
import { WM, type CoreImage } from '../src/core/types.js';
import { dumpCor, imageToStorage, loadCor, storageToImage } from '../src/formats/cor.js';
import { ORACLES_ABSENT_MESSAGE, oraclePath } from './oracles.js';

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function readOracle(name: string): ArrayBuffer {
  const path = oraclePath(name);
  if (path === null) throw new Error(ORACLES_ABSENT_MESSAGE);
  const b = readFileSync(path);
  // `Buffer` is a view into a pooled ArrayBuffer — copy out just this file's bytes.
  return b.slice().buffer as ArrayBuffer;
}

function makeCor(size: number, width: 2 | 4, cells: readonly number[]): ArrayBuffer {
  const out = new Uint8Array(5 + size * width);
  const header = String(size).padStart(5, '0');
  for (let i = 0; i < 5; i++) out[i] = header.charCodeAt(i);
  const view = new DataView(out.buffer);
  cells.forEach((v, i) => {
    if (width === 2) view.setUint16(5 + i * 2, v, true); else view.setUint32(5 + i * 4, v, true);
  });
  return out.buffer;
}

describe('loadCor format rules (docs/plans/phase-1-cpu-core.md §6.1; research/emulators.md §6)', () => {
  it('parses the 5-byte ASCII size header and derives the word width', () => {
    const img = loadCor(makeCor(10_000, 4, [0x40]), { zeroFill: 'keep' });
    expect(img.size).toBe(10_000);
    expect(img.width).toBe(4);
    expect(loadCor(makeCor(80_000, 2, [0x40]), { zeroFill: 'keep' }).width).toBe(2);
  });

  // Rule 1 / docs/plans/architecture.md §9 row C8: `cell = v & 0xFF`, NOT the SimH
  // `(v & 0x3F) | (v & 0x80)`, which drops the check bit.
  it('keeps the C bit — it does not apply the SimH parity-dropping conversion', () => {
    const img = loadCor(makeCor(10_000, 4, [0xff, 0x40, 0xc1, 0x00]), { zeroFill: 'keep' });
    expect([...img.cells.subarray(0, 4)]).toEqual([0xff, 0x40, 0xc1, 0x00]);
    expect((img.cells[2] ?? 0) & 0x40).toBe(0x40);
  });

  // Rule 2: the word-mark bit is copied verbatim.
  it('copies the word-mark bit verbatim, high bit and all', () => {
    const img = loadCor(makeCor(10_000, 4, [0x9b, 0x61]), { zeroFill: 'keep' });
    expect((img.cells[0] as number) & WM).toBe(WM);
    expect((img.cells[1] as number) & WM).toBe(0);
  });

  // Rule 3: fill normalisation is a caller-chosen step, per file, not a format constant.
  it('normalises 0x00 to 0x40 only when asked (research/emulators.md §5.1)', () => {
    const buf = makeCor(10_000, 4, [0x00, 0x41, 0x00]);
    expect([...loadCor(buf, { zeroFill: 'keep' }).cells.subarray(0, 3)]).toEqual([0x00, 0x41, 0x00]);
    expect([...loadCor(buf, { zeroFill: 'normalize' }).cells.subarray(0, 3)]).toEqual([0x40, 0x41, 0x40]);
  });

  // Rule 4 support: the loader refuses anything it cannot round-trip.
  it('rejects a word width other than 2 or 4', () => {
    const bad = new Uint8Array(5 + 10_000 * 3);
    '10000'.split('').forEach((c, i) => { bad[i] = c.charCodeAt(0); });
    expect(() => loadCor(bad.buffer, { zeroFill: 'keep' })).toThrow(/must be 2 or 4/);
  });

  it('rejects a core size outside the five 1410 models', () => {
    expect(() => loadCor(makeCor(30_000, 4, []), { zeroFill: 'keep' })).toThrow(/not one of/);
    expect(() => loadCor(new Uint8Array(3).buffer, { zeroFill: 'keep' })).toThrow(/5-byte size header/);
  });
});

describe('dumpCor / imageToStorage / storageToImage', () => {
  it('round-trips a synthetic image at both widths', () => {
    for (const width of [2, 4] as const) {
      const buf = makeCor(10_000, width, [0x9b, 0x61, 0x40]);
      const img = loadCor(buf, { zeroFill: 'keep' });
      expect([...dumpCor(img)]).toEqual([...new Uint8Array(buf)]);
    }
  });

  it('loads into core through pokeRaw, so parity-invalid bytes survive', () => {
    const img = loadCor(makeCor(10_000, 4, [0x00, 0x9b]), { zeroFill: 'keep' });
    const s = new CoreStorage(10_000);
    imageToStorage(img, s);
    expect(s.read(0)).toBe(0x00);        // C bit absent — pokeRaw did not recompute it
    expect(s.read(1)).toBe(0x9b);
    expect([...storageToImage(s, 4).cells]).toEqual([...img.cells]);
  });

  it('refuses an image that does not match the machine size', () => {
    const img: CoreImage = { size: 80_000, width: 4, cells: new Uint8Array(80_000) };
    expect(() => imageToStorage(img, new CoreStorage(10_000))).toThrow(/does not fit/);
  });
});

describe.skipIf(!oraclePath('cc01.cor'))(`cc01.cor — ${ORACLES_ABSENT_MESSAGE}`, () => {
  it('load -> dump is byte-identical across all 40,005 bytes, width 4 preserved', () => {
    const buf = readOracle('cc01.cor');
    expect(buf.byteLength).toBe(40_005);
    const img = loadCor(buf, { zeroFill: 'keep' });   // cc01 fills with 0x40; nothing to normalise
    expect(img.size).toBe(10_000);
    expect(img.width).toBe(4);
    const out = dumpCor(img);
    expect(out.length).toBe(40_005);
    expect(bytesEqual(out, new Uint8Array(buf))).toBe(true);
  });

  // research/emulators.md §4.5: the branch-on-word-mark test stores its op code WITHOUT a word
  // mark at 02181 and creates it at run time with the chained Set Word Mark at 02188. A loader
  // that inferred word marks from instruction boundaries would break this program.
  it('holds J at 02181 with no word mark and `,` at 02188 with one', () => {
    const img = loadCor(readOracle('cc01.cor'), { zeroFill: 'keep' });
    const s = new CoreStorage(10_000);
    imageToStorage(img, s);
    expect(s.bcd(2181)).toBe(bcdOfGlyph('J'));   // octal 41
    expect(s.wm(2181)).toBe(false);
    expect(s.bcd(2188)).toBe(bcdOfGlyph(','));   // octal 33, decimal 27
    expect(s.bcd(2188)).toBe(0o33);
    expect(s.wm(2188)).toBe(true);
    // the same pattern repeats at 02234 / 02241
    expect(s.wm(2234)).toBe(false);
    expect(s.wm(2241)).toBe(true);
  });
});

describe.skipIf(!oraclePath('insttest.cor'))(`insttest / ilentest — ${ORACLES_ABSENT_MESSAGE}`, () => {
  for (const name of ['insttest.cor', 'ilentest.cor']) {
    it(`${name}: keep is byte-identical; normalize replaces every 0x00000000 word with 0x00000040`, () => {
      const buf = readOracle(name);
      const raw = new Uint8Array(buf);
      expect(raw.length).toBe(320_005);

      const kept = loadCor(buf, { zeroFill: 'keep' });
      expect(kept.size).toBe(80_000);
      expect(kept.width).toBe(4);
      expect(bytesEqual(dumpCor(kept), raw)).toBe(true);

      const expected = Uint8Array.from(raw);
      let normalised = 0;
      for (let i = 0; i < 80_000; i++) {
        const o = 5 + i * 4;
        if (expected[o] === 0x00 && expected[o + 1] === 0 && expected[o + 2] === 0 && expected[o + 3] === 0) {
          expected[o] = 0x40;
          normalised++;
        }
      }
      expect(normalised).toBeGreaterThan(0);
      const fixed = loadCor(buf, { zeroFill: 'normalize' });
      expect(bytesEqual(dumpCor(fixed), expected)).toBe(true);
    });
  }
});
