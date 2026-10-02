// Tier 0 — the d-character tables (plan §7).
// The 64-row Move/Scan matrix is GENERATED from the two structural tables in
// isa/dmods.ts and compared against oracle/dchar-matrix.json, which is transcribed
// independently from opcodes.md §3.2. That ties the doc and the code together
// mechanically: neither can drift without this failing (architecture.md §4.8).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bcdOfGlyph, glyphOf } from '../src/core/bcd.js';
import {
  J_D_TABLE,
  MOVE_DIRECTION,
  MOVE_DIRECTION_MASK,
  MOVE_PORTION,
  MOVE_PORTION_MASK,
  MOVE_REG_EFFECTS,
  RX_RELEASE_D_GLYPH,
  RX_RELEASE_D_OCTAL,
  RX_STATUS_BITS,
  SUBSTITUTE_BLANK_OCTAL,
  TRUE_BLANK_OCTAL,
  V_D_TABLE,
} from '../src/core/isa/dmods.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(REPO_ROOT, 'oracle', name), 'utf8'));

interface DCharRow {
  dec: number;
  glyph: string | null;
  glyphNote?: string;
  mnemonic: string;
  direction: string;
  portion: string;
  terminatesOn: string;
}
interface RegEffectRow {
  terminatingControl: string;
  direction: string;
  iar: string;
  aar: string;
  bar: string;
}
const MATRIX = fixture('dchar-matrix.json') as {
  dCharacters: DCharRow[];
  figure20RegisterEffects: RegEffectRow[];
};
const JCHARS = fixture('jdchars.json') as {
  rows: { d: string; autocoder: string[]; indicator: string; tag: string }[];
};
const VCHARS = fixture('vdchars.json') as {
  rows: { instruction: string; d: string; octal: number; autocoder: string; condition: string }[];
};

/**
 * The Figure 21 mnemonic rule (opcodes.md §3.1): `M` (or `SCN` for a scan) + direction
 * letter + portion letters + terminator letter. This is the whole of the "64-way switch"
 * the design avoids.
 */
function generateMatrix(): Omit<DCharRow, 'glyph' | 'glyphNote'>[] {
  const out: Omit<DCharRow, 'glyph' | 'glyphNote'>[] = [];
  for (let d = 0; d < 64; d++) {
    const portion = MOVE_PORTION.find((p) => p.key === (d & MOVE_PORTION_MASK))!;
    const dir = MOVE_DIRECTION.find((r) => r.key === (d & MOVE_DIRECTION_MASK))!;
    const stem = portion.portion === 'scan' ? 'SCN' : 'M';
    out.push({
      dec: d,
      mnemonic: `${stem}${dir.dirLetter}${portion.letters}${dir.termLetter}`,
      direction: dir.direction,
      portion: portion.portion,
      terminatesOn: dir.terminator,
    });
  }
  return out;
}

describe('op D — the 64 d-characters', () => {
  it('the fixture is the full 64 rows, dec 0..63', () => {
    expect(MATRIX.dCharacters.length).toBe(64);
    expect(MATRIX.dCharacters.map((r) => r.dec)).toEqual([...Array(64).keys()]);
  });

  // The d-character IS a stored character, so the fixture's glyph column and bcd.ts must be the
  // same 64-character set. Without this the group mark could sit at `ǂ` in one file and `⧧` in
  // the other and nothing would notice until an assembler emitted a character core cannot hold.
  it('every fixture glyph round-trips through bcd.ts, code point for code point', () => {
    for (const row of MATRIX.dCharacters) {
      // dec 29 (word separator) and dec 31 (segment mark) print no glyph in opcodes.md §3.2;
      // the fixture records that honestly as null rather than inventing one.
      if (row.glyph === null) continue;
      expect(glyphOf(row.dec), `dec ${row.dec}`).toBe(row.glyph);
      expect(bcdOfGlyph(row.glyph), `glyph ${row.glyph} (dec ${row.dec})`).toBe(row.dec);
    }
    expect(MATRIX.dCharacters.filter((r) => r.glyph === null).map((r) => r.dec)).toEqual([29, 31]);
  });

  it('the two structural tables generate opcodes.md §3.2 exactly', () => {
    const generated = generateMatrix();
    const expected = MATRIX.dCharacters.map((r) => ({
      dec: r.dec,
      mnemonic: r.mnemonic,
      direction: r.direction,
      portion: r.portion,
      terminatesOn: r.terminatesOn,
    }));
    expect(generated).toEqual(expected);
  });

  it('the eight Figure 20 register effects match the fixture', () => {
    expect(
      MOVE_REG_EFFECTS.map((r) => ({
        terminatingControl: r.terminatingControl,
        direction: r.direction,
        iar: r.iar,
        aar: r.aar,
        bar: r.bar,
      })),
    ).toEqual(MATRIX.figure20RegisterEffects);
  });

  it('every Figure 20 row keys onto a direction group, and all eight are covered', () => {
    const keys = MOVE_REG_EFFECTS.map((r) => r.key).sort((a, b) => a - b);
    expect(keys).toEqual(MOVE_DIRECTION.map((r) => r.key).sort((a, b) => a - b));
  });

  // opcodes.md §3.2 note / charset.md §2, cross-file contradiction #7.
  it('the substitute-blank trap: octal 20 is ƀ (SCNLA), octal 00 is blank (SCNLS)', () => {
    expect(TRUE_BLANK_OCTAL).toBe(0o0);
    expect(SUBSTITUTE_BLANK_OCTAL).toBe(0o20);

    const scnls = MATRIX.dCharacters[TRUE_BLANK_OCTAL]!;
    expect(scnls.mnemonic).toBe('SCNLS');
    expect(scnls.terminatesOn).toBe('after one position');
    expect(scnls.glyph).toBe(' ');

    const scnla = MATRIX.dCharacters[SUBSTITUTE_BLANK_OCTAL]!;
    expect(scnla.mnemonic).toBe('SCNLA');
    expect(scnla.terminatesOn).toBe('A-field word mark');
    expect(scnla.glyph).toBe('ƀ');
    expect(scnla.glyph).not.toBe(' ');

    // The very same character is BNT1/BNT2's d in §6.2 — an ASCII space there has no bits
    // and tests nothing.
    const noTransfer = RX_STATUS_BITS.find((b) => b.status === 'noTransfer')!;
    expect(noTransfer.octal).toBe(SUBSTITUTE_BLANK_OCTAL);
    expect(noTransfer.dAlone).toBe('ƀ');
  });
});

describe('op J — the one-address branch d-table (§6.1)', () => {
  it('matches oracle/jdchars.json row for row', () => {
    expect(J_D_TABLE.length).toBe(JCHARS.rows.length);
    expect(
      J_D_TABLE.map((r) => ({
        d: r.d,
        autocoder: [...r.autocoder],
        indicator: r.meaning,
        tag: r.tag,
      })),
    ).toEqual(JCHARS.rows.map((r) => ({
      d: r.d, autocoder: r.autocoder, indicator: r.indicator, tag: r.tag,
    })));
  });

  it('the seven latches, the blank, and the four channel-1 device senses are what J can serve', () => {
    // The seven `IndicatorName` latches plus Branch Unconditionally are Phase 1's eight. Phase 2
    // wave 4 added the four io.md §5 Figure 35 conditions that are CHANNEL state rather than a
    // latch — `9` BC9, `@` BCV, `R` BPCB, `Q` BNQ, all channel 1 (channel.ts's four getters,
    // isa/exec/branch.ts's CHANNEL_SENSE). Their channel-2 twins stay unavailable below.
    const available = J_D_TABLE.filter((r) => r.available).map((r) => r.d);
    expect(available.sort())
      .toEqual([' ', 'Z', 'W', 'V', 'S', 'U', 'T', '/', '9', '@', 'R', 'Q'].sort());
    for (const row of J_D_TABLE) {
      if (row.indicator !== null) expect(row.available).toBe(true);
    }
  });

  it('the CHANNEL-2 carriage rows are present but unavailable — there is no channel 2', () => {
    // `9` and `@` (channel 1) became available in Phase 2 wave 4 with the 1403's carriage; `!`
    // and `⌑` are the same two conditions on the channel this configuration does not have
    // (io.md §5 Figure 35, io.md §1 "Concurrency").
    for (const d of ['!', '⌑']) {
      const row = J_D_TABLE.find((r) => r.d === d)!;
      expect(row.available, `J d=${d}`).toBe(false);
      expect(row.cite.length).toBeGreaterThan(0);
    }
  });
});

describe('op V — word-mark / zone-equal d-table (§6.3)', () => {
  it('matches oracle/vdchars.json row for row', () => {
    expect(
      V_D_TABLE.map((r) => ({
        instruction: r.instruction, d: r.d, octal: r.octal,
        autocoder: r.autocoder, condition: r.condition,
      })),
    ).toEqual(VCHARS.rows);
  });

  it("the printed octals satisfy the rule 'bit 1 = WM test, bit 2 = zone test'", () => {
    for (const row of V_D_TABLE) {
      const wm = (row.octal & 0o1) !== 0;
      const zone = (row.octal & 0o2) !== 0;
      expect(wm || zone, `V d=${row.d} tests nothing`).toBe(true);
      if (row.instruction.startsWith('Branch if WM,')) expect(wm).toBe(true);
    }
  });
});

describe('ops R / X — channel status d-bits (§6.2)', () => {
  it('has exactly the six channel status indicators, one bit each', () => {
    expect(RX_STATUS_BITS.length).toBe(6);
    expect(RX_STATUS_BITS.map((b) => b.status).sort()).toEqual(
      ['busy', 'condition', 'dataCheck', 'noTransfer', 'notReady', 'wrongLengthRecord'],
    );
    for (const bit of RX_STATUS_BITS) {
      expect(bit.mask & (bit.mask - 1), `${bit.status} is not a single bit`).toBe(0);
      expect(bit.mask).toBe(bit.octal);
    }
  });

  it('the group-mark release form is octal 77 — all six bits, and its glyph is a real code point', () => {
    expect(RX_RELEASE_D_OCTAL).toBe(0o77);
    // `⧧`, not `ǂ`: the glyph has to be one bcd.ts can encode, or an assembler cannot emit
    // `R (I) ⧧` at all (research/charset.md §2 rank 05).
    expect(bcdOfGlyph(RX_RELEASE_D_GLYPH)).toBe(RX_RELEASE_D_OCTAL);
    const all = RX_STATUS_BITS.reduce((m, b) => m | b.mask, 0);
    expect(RX_RELEASE_D_OCTAL & all).toBe(all);
  });
});
