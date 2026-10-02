// src/formats/cor.ts — Jay Jaeger's `.cor` core image, load and dump.
// Source: docs/plans/phase-1-cpu-core.md §6.1; docs/plans/architecture.md §9 rows C7-C9.
// Format: research/emulators.md §6 — five bytes of ASCII decimal core size (`%05d`), then
// `size` little-endian integers of width W = (filesize - 5) / size, which must be 2 or 4.
//
// Takes an ArrayBuffer, never a path: this module is loaded in the browser as well as under
// the test runner.

import type { CoreImage, Storage } from '../core/types.js';

// research/emulators.md §5.1 / docs/plans/phase-1-cpu-core.md §6.1 rule 3. `cc01.cor` fills unused
// storage with 0x40 — a space with its check bit, a valid character. `insttest.cor` and
// `ilentest.cor` fill with 0x00 — no C bit, parity-invalid in Jaeger's own encoding, so a
// parity-checking read process-checks on untouched storage. Normalising is therefore a per-file,
// caller-chosen step, not a property of the format.
const ZERO_FILL = 0x00;
const BLANK_WITH_C = 0x40;

// The five 1410 storage sizes (research/architecture.md §1, A22-0526-3 p.5). A `.cor` header
// naming anything else is not a 1410 image.
const LEGAL_SIZES: readonly number[] = [10_000, 20_000, 40_000, 60_000, 80_000];

export function loadCor(buf: ArrayBuffer, opts: { zeroFill: 'keep' | 'normalize' }): CoreImage {
  if (buf.byteLength < 5) throw new Error('.cor: file shorter than its 5-byte size header');
  const bytes = new Uint8Array(buf);
  let header = '';
  for (let i = 0; i < 5; i++) header += String.fromCharCode(bytes[i] ?? 0);
  const size = Number.parseInt(header, 10);
  if (!LEGAL_SIZES.includes(size)) {
    throw new Error(`.cor: core size header "${header}" is not one of ${LEGAL_SIZES.join(', ')}`);
  }

  const width = (buf.byteLength - 5) / size;
  if (width !== 2 && width !== 4) {
    throw new Error(`.cor: word width ${width} from ${buf.byteLength} bytes / ${size} positions; must be 2 or 4`);
  }

  // Rule 1 (docs/plans/architecture.md §9 row C8): `cell = v & 0xFF`. The `.cor` byte layout is
  // WM C B A 8 4 2 1, which IS our in-memory cell (research/emulators.md §6). The frequently
  // quoted `(v & 0x3F) | (v & 0x80)` is the SimH conversion — "drop the parity bit" — and would
  // throw the check bit away, taking the byte-identity test and the console's bad-parity
  // underline with it.
  // Rule 2: the word-mark bit is copied verbatim and never inferred from instruction boundaries.
  // `cc01.cor` stores op codes WITHOUT word marks at 02181 and 02234 and sets them at run time
  // with a chained Set Word Mark, which is exactly how its branch-on-word-mark test works
  // (research/emulators.md §4.5).
  const view = new DataView(buf);
  const cells = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    const o = 5 + i * width;
    const v = width === 2 ? view.getUint16(o, true) : view.getUint32(o, true);
    const cell = v & 0xff;
    cells[i] = opts.zeroFill === 'normalize' && cell === ZERO_FILL ? BLANK_WITH_C : cell;
  }
  // `width` is carried on the image so a dump can round-trip it: the committed files use W=4
  // while cube1us's own DumpCore writes W=2 (research/emulators.md §6).
  return { size, width, cells };
}

export function dumpCor(img: CoreImage): Uint8Array {
  const out = new Uint8Array(5 + img.size * img.width);
  const header = String(img.size).padStart(5, '0');
  for (let i = 0; i < 5; i++) out[i] = header.charCodeAt(i);
  const view = new DataView(out.buffer);
  for (let i = 0; i < img.size; i++) {
    const o = 5 + i * img.width;
    const v = img.cells[i] ?? 0;
    if (img.width === 2) view.setUint16(o, v, true); else view.setUint32(o, v, true);
  }
  return out;
}

// The loader seam. `pokeRaw` stores the byte with its check bit verbatim and is the ONLY writer
// allowed here — `setChar` would recompute C and `writeWhole` is load-mode I/O
// (docs/plans/phase-1-cpu-core.md §3, §6.1).
export function imageToStorage(img: CoreImage, storage: Storage): void {
  if (img.size !== storage.size) {
    throw new Error(`.cor: image of ${img.size} positions does not fit a ${storage.size}-position machine`);
  }
  for (let i = 0; i < img.size; i++) storage.pokeRaw(i, img.cells[i] ?? 0);
}

export function storageToImage(storage: Storage, width: 2 | 4): CoreImage {
  return { size: storage.size, width, cells: storage.dump() };
}
