import { toCard } from './card.js';
import { CALC_EMITTERS, calcStorageOf } from './calc.js';
import { CYCLE_ORDER, driver, type CycleEmitters } from './cycle.js';
import { parseScanned, scan } from './deck.js';
import { layoutOf, measure } from './layout.js';
import { buildRpgListing } from './listing.js';
import { model as resolveModel } from './model.js';
import { OUTPUT_EMITTERS, outputStorageOf } from './output.js';
import { readSpecSource } from './sheets/read.js';
import type { Layout, Model, RpgResult, Stmt } from './types.js';

/**
 * OPEN: `GENERATED_PROGRAM_IS_OPEN_CODED_NOT_IOCS` — a project ruling over `[verified]`
 * contrary period evidence. PR-108's 1410 RPG skeleton uses IOCS macros and SBR linkage; this
 * generator emits macro-free open code because the repository has no macro library. Our source
 * form is constructed, not recovered IBM processor output. There is no machine-preserving
 * fallback. Plan §2.3, §15; rpg-sources.md §§4.2, 10.4; Phase-5-NOTES.md §2.
 */
export const GENERATED_PROGRAM_IS_OPEN_CODED_NOT_IOCS = true;

const JOB_NAME = 'RPG GENERATED PROGRAM';
const CORE_SIZE_TEXT: Readonly<Record<Layout['coreSizeCode'], string>> = {
  1: '10K', 2: '20K', 3: '40K', 4: '60K', 5: '80K',
};

function generatedStorageOf(model: Model) {
  return [...calcStorageOf(model), ...outputStorageOf(model)];
}

function emittersFor(model: Model): CycleEmitters {
  const storage = generatedStorageOf(model);
  return {
    ...CALC_EMITTERS,
    ...OUTPUT_EMITTERS,
    generatedStorage: () => storage,
  };
}

function flattened(
  sections: ReadonlyMap<(typeof CYCLE_ORDER)[number], readonly Stmt[]>,
  includeAreas: boolean,
): readonly Stmt[] {
  return CYCLE_ORDER
    .filter((section) => includeAreas || section !== 'areas')
    .flatMap((section) => sections.get(section) ?? []);
}

function comment(text: string): Stmt {
  return { kind: 'comment', op: '', operands: [], comment: text };
}

function generatedOn(): string {
  return new Date().toISOString().slice(0, 10);
}

function header(layout: Layout): readonly Stmt[] {
  return [
    { label: 'AUTOCODER', op: 'RUN', operands: [] },
    { op: 'JOB', operands: [JOB_NAME] },
    { op: 'CTL', operands: [String(layout.coreSizeCode)] },
    comment(' SOURCE RPG SPECIFICATION DECK.'),
    comment(` GENERATED ${generatedOn()} UTC.`),
    comment(` TARGET 1410 ${CORE_SIZE_TEXT[layout.coreSizeCode]}, ONE CHANNEL, 1402, 1403 MODEL 2, CHAIN A.`),
    { op: 'LOAD', operands: [] },
    { op: 'ORG', operands: ['00500'] },
  ];
}

function cardsOf(stmts: readonly Stmt[]) {
  return stmts.map((stmt, index) => (
    toCard(stmt, String(1_010 + index * 10).padStart(5, '0'), '')
  ));
}

/** Compose the published read → scan → parse → model → two-pass-drive → cards pipeline. */
export function generate(text: string): RpgResult {
  const read = readSpecSource(text);
  const scanned = scan(read);
  const parsed = parseScanned(scanned);
  const resolved = resolveModel(parsed);
  // Wave 6 fills the optional Wave-2 result field from the already-decided scan and diagnostics;
  // generation semantics, source cards and the public `generate(text)` signature do not move.
  const listing = buildRpgListing(scanned, resolved.diagnostics);
  const terminated = resolved.diagnostics.some((diagnostic) => diagnostic.severity === 'terminate');
  if (terminated || resolved.model === undefined) {
    return {
      ok: false,
      cards: [],
      source: '',
      listing,
      diagnostics: resolved.diagnostics,
      ...(resolved.model === undefined ? {} : { model: resolved.model }),
    };
  }

  const value = resolved.model;
  const storage = generatedStorageOf(value);
  const emitters = emittersFor(value);
  const provisional = driver(value, layoutOf(value, 0, storage), emitters);
  const codeLength = measure(flattened(provisional, false));
  const layout = layoutOf(value, codeLength, storage);
  const final = driver(value, layout, emitters);
  const stmts = [
    ...header(layout),
    ...flattened(final, true),
    { op: 'END', operands: ['START'] },
  ];
  const cards = cardsOf(stmts);
  return {
    ok: resolved.diagnostics.length === 0,
    cards,
    source: cards.join('\n'),
    listing,
    diagnostics: resolved.diagnostics,
    model: value,
    layout,
  };
}
