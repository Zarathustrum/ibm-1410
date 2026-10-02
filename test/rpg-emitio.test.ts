// Tier 0/2 — Phase-5 I/O choke-point checks (plan §8.3, wave 2).

import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_MNEMONICS, resolve } from '../src/asm/mnemonics.js';
import { field } from '../src/asm/source.js';
import { toCard } from '../src/rpg/card.js';
import { GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET } from '../src/rpg/layout.js';
import {
  EMITIO_MACHINE_OPERATIONS,
  GENERATED_READ_TAKES_THE_BAKED_D,
  OVERFLOW_IS_LATCHED_IMMEDIATELY_AFTER_THE_PRINT,
  PAGE_OVERFLOW_IS_CARRIAGE_CHANNEL_12,
  type IoRequest,
  type CarriageMotion,
  branchOnEndOfFile,
  carriageStmt,
  ioStmt,
  readBlockStmts,
  senseOverflowStmts,
} from '../src/rpg/emitio.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RPG_DIR = join(REPO_ROOT, 'src/rpg');
const EMITIO_PATH = join(RPG_DIR, 'emitio.ts');
const GENERATE_PATH = join(RPG_DIR, 'generate.ts');
const TABLE_NAMES = ['X1_CHANNEL', 'X2_DEVICE', 'ML_D_TABLE', 'CARRIAGE_D_TABLE'] as const;

function acceptsIoRequest(_request: IoRequest): void {}
function acceptsCarriageMotion(_motion: CarriageMotion): void {}

if (false) {
  // @ts-expect-error A reader request requires its 1402 stacker pocket.
  acceptsIoRequest({ unit: 'reader', direction: 'read', mode: 'move', area: 'CDIN' });
  // @ts-expect-error A reader cannot carry the printer's write direction.
  acceptsIoRequest({ unit: 'reader', direction: 'write', mode: 'move', area: 'CDIN', pocket: '0' });
  // @ts-expect-error A printer request cannot carry a reader pocket.
  acceptsIoRequest({ unit: 'printer', direction: 'write', mode: 'move', area: 'PLINE', pocket: '0' });
  // @ts-expect-error A space is limited to one, two or three lines.
  acceptsCarriageMotion({ kind: 'space', when: 'immediate', n: 4 });
  // @ts-expect-error A skip is limited to the twelve carriage channels.
  acceptsCarriageMotion({ kind: 'skip', when: 'afterPrint', n: 13 });
}

function listTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...listTsFiles(full));
    else if (name.endsWith('.ts')) files.push(full);
  }
  return files;
}

function importClauses(source: string): readonly string[] {
  return [...source.matchAll(/\bimport\s+([\s\S]*?)\s+from\s+['"][^'"]+['"];?/g)]
    .map((match) => match[1] ?? '');
}

/** Quoted TypeScript literals, with comments skipped; templates are irrelevant to this lint. */
function quotedLiterals(source: string): readonly string[] {
  const values: string[] = [];
  let at = 0;
  while (at < source.length) {
    const here = source[at];
    const next = source[at + 1];
    if (here === '/' && next === '/') {
      at = source.indexOf('\n', at + 2);
      if (at < 0) break;
      continue;
    }
    if (here === '/' && next === '*') {
      const end = source.indexOf('*/', at + 2);
      if (end < 0) break;
      at = end + 2;
      continue;
    }
    if (here !== "'" && here !== '"') {
      at += 1;
      continue;
    }
    const quote = here;
    let value = '';
    at += 1;
    while (at < source.length) {
      const char = source[at];
      if (char === '\\') {
        const escaped = source[at + 1];
        if (escaped !== undefined) value += escaped;
        at += 2;
      } else if (char === quote) {
        at += 1;
        values.push(value);
        break;
      } else {
        value += char;
        at += 1;
      }
    }
  }
  return values;
}

const IO_NAMES = new Set(
  ALL_MNEMONICS.filter((row) => row.io !== undefined && row.mnemonic.length >= 2)
    .map((row) => row.mnemonic),
);

describe('emitio derives the settled Autocoder forms and keeps their interlocks attached', () => {
  it('emits reader and printer move/load forms without spelling an x-control field', () => {
    expect(GENERATED_READ_TAKES_THE_BAKED_D).toBe(true);
    expect(ioStmt({
      unit: 'reader', direction: 'read', mode: 'move', area: 'CDIN', pocket: '0',
    })).toEqual([
      { op: 'R1', operands: ['0', 'CDIN'] },
      { op: 'BA1', operands: ['*+1'] },
    ]);
    expect(ioStmt({
      unit: 'reader', direction: 'read', mode: 'load', area: 'CDIN', pocket: '9',
    })[0]).toEqual({ op: 'R1W', operands: ['9', 'CDIN'] });
    expect(ioStmt({
      unit: 'printer', direction: 'write', mode: 'move', area: 'PLINE',
    })).toEqual([
      { op: 'W1', operands: ['PLINE'] },
      { op: 'BA1', operands: ['*+1'] },
    ]);
    expect(ioStmt({
      unit: 'printer', direction: 'write', mode: 'load', area: 'PLINE',
    })[0]).toEqual({ op: 'W1W', operands: ['PLINE'] });
  });

  it('keeps the frozen reader operation, EOF status and release in order', () => {
    expect(readBlockStmts({
      unit: 'reader', direction: 'read', mode: 'move', area: 'CDIN', pocket: '0',
    }, 'LASTCD')).toEqual([
      { op: 'R1', operands: ['0', 'CDIN'] },
      { op: 'BEF1', operands: ['LASTCD'] },
      { op: 'BA1', operands: ['*+1'] },
    ]);
  });

  it('resolves all four carriage quadrants through CARRIAGE_D_TABLE', () => {
    expect(([1, 2, 3] as const)
      .map((n) => carriageStmt({ kind: 'space', when: 'immediate', n })[0]))
      .toEqual(['J', 'K', 'L'].map((d) => ({ op: 'CC1', operands: [d] })));
    expect(([1, 2, 3] as const)
      .map((n) => carriageStmt({ kind: 'space', when: 'afterPrint', n })[0]))
      .toEqual(['/', 'S', 'T'].map((d) => ({ op: 'CC1', operands: [d] })));
    expect(([1, 10, 11, 12] as const)
      .map((n) => carriageStmt({ kind: 'skip', when: 'immediate', n })[0]))
      .toEqual(['1', '0', '#', '@'].map((d) => ({ op: 'CC1', operands: [d] })));
    expect(([1, 10, 11, 12] as const)
      .map((n) => carriageStmt({ kind: 'skip', when: 'afterPrint', n })[0]))
      .toEqual(['A', '?', '.', '⌑'].map((d) => ({ op: 'CC1', operands: [d] })));
    expect(carriageStmt({ kind: 'skip', when: 'immediate', n: 1 })[1])
      .toEqual({ op: 'BA1', operands: ['*+1'] });
  });

  it('latches overflow before motion and houses the EOF status branch', () => {
    expect(OVERFLOW_IS_LATCHED_IMMEDIATELY_AFTER_THE_PRINT).toBe(true);
    expect(PAGE_OVERFLOW_IS_CARRIAGE_CHANNEL_12).toBe(true);
    const latch = senseOverflowStmts('OF', 'Z039');
    expect(latch).toEqual([
      { op: 'BCV1', operands: ['*+8'] },
      { op: 'B', operands: ['Z039'] },
      { op: 'MLCS', operands: ['ONE', 'OF'] },
    ]);
    expect(field(toCard(latch[0]!, '00000', ''), 'operand').trimEnd()).toBe('*&8');
    expect(branchOnEndOfFile('LASTCD')).toEqual({ op: 'BEF1', operands: ['LASTCD'] });
  });
});

describe('emitio is the only machine-table and literal spelling choke point', () => {
  it('keeps every explicit throw at exactly the two §6.3 RpgBug trigger sites', () => {
    const sites = listTsFiles(RPG_DIR).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const found: { readonly file: string; readonly expression: string }[] = [];
      const visit = (node: ts.Node): void => {
        if (ts.isThrowStatement(node)) {
          found.push({
            file: file.slice(RPG_DIR.length + 1),
            expression: node.expression.getText(tree).replace(/\s+/g, ' ').trim(),
          });
        }
        ts.forEachChild(node, visit);
      };
      visit(tree);
      return found;
    })
      .sort((a, b) => a.file.localeCompare(b.file));
    expect(sites).toEqual([
      {
        file: 'emitio.ts',
        expression: 'new RpgBug(`emitio: no choke-point arm for unit ${String(unitOf(req))}`)',
      },
      {
        file: 'layout.ts',
        expression: 'new RpgBug(`layout: model has no storage object named ${name}`)',
      },
    ]);
  });

  it('alone imports the four named tables, and positively consumes CARRIAGE_D_TABLE', () => {
    const violations: string[] = [];
    for (const file of listTsFiles(RPG_DIR)) {
      const clauses = importClauses(readFileSync(file, 'utf8'));
      for (const name of TABLE_NAMES) {
        if (file !== EMITIO_PATH && clauses.some((clause) => new RegExp(`\\b${name}\\b`).test(clause))) {
          violations.push(`${file} imports ${name}`);
        }
      }
    }
    expect(violations).toEqual([]);
    expect(importClauses(readFileSync(EMITIO_PATH, 'utf8')).join('\n'))
      .toMatch(/\bCARRIAGE_D_TABLE\b/);
  });

  it('finds no computed I/O mnemonic or distinctive x-control glyph literal outside emitio', () => {
    const violations: string[] = [];
    for (const file of listTsFiles(RPG_DIR)) {
      if (file === EMITIO_PATH) continue;
      for (const literal of quotedLiterals(readFileSync(file, 'utf8'))) {
        if (IO_NAMES.has(literal) || literal === '%' || literal === '⌑') {
          violations.push(`${file}: ${JSON.stringify(literal)}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps every generated/reserved label out of the shipped I/O mnemonic namespace', () => {
    expect(GENERATED_LABELS_EXTEND_THE_RESERVED_NAME_SET).toBe(true);
    const fixed = [
      'START', 'RDCARD', 'IDENT', 'SEQCHK', 'EXTRCT', 'CTLBRK', 'TOTCAL', 'TOTOUT',
      'LVLRST', 'DTLCAL', 'HDGOUT', 'DTLOUT', 'LASTCD', 'NOTFND', 'EOJ', 'IND',
      'CDIN', 'PLINE', 'PLGM', 'PRIME', 'FSTPG', 'ZEROS', 'IZERO', 'ONE', 'ZERO', 'FIVE',
    ];
    const generated = [
      ...fixed,
      ...Array.from({ length: 1000 }, (_, n) => `Z${String(n).padStart(3, '0')}`),
      ...Array.from({ length: 1000 }, (_, n) => `K${String(n).padStart(3, '0')}`),
      ...Array.from({ length: 100 }, (_, n) => `RC${String(n).padStart(2, '0')}`),
      ...Array.from({ length: 1000 }, (_, n) => `C${String(n).padStart(3, '0')}`),
      ...Array.from({ length: 6 }, (_, n) => `CN${n + 1}`),
      ...Array.from({ length: 6 }, (_, n) => `CO${n + 1}`),
      ...Array.from({ length: 6 }, (_, n) => `F${n + 1}`),
      ...Array.from({ length: 100 }, (_, n) => `WORD${String(n).padStart(2, '0')}`),
    ];
    expect(generated.filter((label) => IO_NAMES.has(label))).toEqual([]);
    expect(IO_NAMES.has('P1')).toBe(true);
  });
});

// §8.3 check 3 is written in wave 2 but its producer lands in wave 5. The skip is keyed only to
// generate.ts. Once that file exists, missing demo/probe decks throw and fail this test; no later
// edit or append is needed to activate the gate.
it.skipIf(!existsSync(GENERATE_PATH))(
  'generated demo and probe use only the I/O/d-only operation subset emitio can produce',
  async () => {
    const moduleSpecifier = '../src/rpg/' + 'generate.js';
    const loaded: unknown = await import(moduleSpecifier);
    const generate = (loaded as {
      generate(text: string): { readonly ok: boolean; readonly cards: readonly string[] };
    }).generate;
    const operations = new Set<string>();
    for (const name of ['sales-summary.rpg', 'cycle-probe.rpg']) {
      const result = generate(readFileSync(join(REPO_ROOT, 'demos', name), 'utf8'));
      expect(result.ok, name).toBe(true);
      for (const card of result.cards) {
        const op = card.slice(15, 20).trim();
        const row = resolve(op);
        if (row?.io !== undefined || row?.dIsOnlyOperand === true) operations.add(op);
      }
    }
    expect([...operations].filter((op) => !EMITIO_MACHINE_OPERATIONS.includes(
      op as (typeof EMITIO_MACHINE_OPERATIONS)[number],
    ))).toEqual([]);
  },
);
