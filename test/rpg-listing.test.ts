// Tier 2 — the constructed RPG specification listing on the 1403 (Phase-5 plan §9, wave 6).
//
// No period 1410 RPG listing survives. The column stops and heading are therefore explicitly
// ours, while the separator/trailer text is recovered from PR-108. The golden pins that division:
// it is a constructed period-shaped artefact, not evidence of IBM's original listing layout.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { BCD_TABLE } from '../src/core/bcd.js';
import { chainGlyph } from '../src/core/devices/printer1403.js';
import { scan, parseScanned } from '../src/rpg/deck.js';
import { generate } from '../src/rpg/generate.js';
import {
  buildRpgListing,
  formatRpgListing,
  renderRpgListing,
  RPG_LISTING_COLUMN_STOPS,
} from '../src/rpg/listing.js';
import { RPG_RECOVERED_MESSAGES } from '../src/rpg/messages.js';
import { model } from '../src/rpg/model.js';
import { readSpecSource } from '../src/rpg/sheets/read.js';
import type { RpgListingLine, SpecRef } from '../src/rpg/types.js';

const SOURCE = readFileSync('demos/sales-summary.rpg', 'utf8');
const GOLDEN = readFileSync('test/golden/sales-summary.lst', 'utf8');

function listingOf(source: string): readonly RpgListingLine[] {
  const scanned = scan(readSpecSource(source));
  const resolved = model(parseScanned(scanned));
  return buildRpgListing(scanned, resolved.diagnostics);
}

describe('RPG_LISTING_COLUMN_STOPS — the one constructed layout (plan §9, §15)', () => {
  it('publishes the exact 1-based inclusive stops and takes its named fallback', () => {
    expect(RPG_LISTING_COLUMN_STOPS).toEqual([
      { name: 'SEQNO', from: 1, to: 5 },
      { name: 'SHEET', from: 7, to: 12 },
      { name: 'PGCARD', from: 14, to: 18 },
      { name: 'CARD IMAGE', from: 21, to: 100 },
      { name: 'FLAG', from: 103, to: 103 },
      { name: 'DIAGNOSTIC', from: 1, to: 132 },
    ]);
  });
});

describe('buildRpgListing — cards, boundaries and diagnostics in deck order', () => {
  const lines = listingOf(SOURCE);

  it('carries every punched card exactly once, in order, under one heading per source page', () => {
    const sourceCards = SOURCE.trimEnd().split('\n');
    const specs = lines.filter((line) => line.kind === 'spec');
    expect(specs).toHaveLength(60);
    expect(specs.map((line) => line.at.seqno)).toEqual(
      Array.from({ length: 60 }, (_, index) => index + 1),
    );
    expect(specs.map((line) => line.card)).toEqual(sourceCards);
    expect(lines.filter((line) => line.kind === 'heading').map((line) => line.at.page))
      .toEqual(['02', '03', '04', '05', '06', '07']);
  });

  it('places the three recovered section separators and recovered trailer in order', () => {
    expect(lines.filter((line) => line.kind === 'separator').map((line) => line.message?.text))
      .toEqual(['END INPUT SPECS', 'END DATA SPECS', 'END CALC SPECS']);
    expect(lines.at(-1)).toMatchObject({
      kind: 'trailer',
      message: { text: 'END OF RPG.BEGIN AUTOCODER', provenance: 'recovered-1410' },
    });
  });

  it('fills the optional Wave-6 listing on the one public generate result', () => {
    const result = generate(SOURCE);
    expect(result.listing).toEqual(lines);
  });

  it('puts a recovered diagnostic immediately under its card and marks that card', () => {
    const sourceCards = SOURCE.trimEnd().split('\n');
    const brokenCards = sourceCards.map((card) => (
      card.slice(75) === '06230' ? `${card.slice(0, 4)}   ${card.slice(7)}` : card
    ));
    const broken = listingOf(`${brokenCards.join('\n')}\n`);
    const cardIndex = broken.findIndex((line) => line.kind === 'spec' && line.at.page === '06'
      && line.at.cardNo === '230');
    expect(cardIndex).toBeGreaterThanOrEqual(0);
    expect(broken[cardIndex]).toMatchObject({ kind: 'spec', flag: 'W' });
    expect(broken[cardIndex + 1]).toMatchObject({
      kind: 'diagnostic',
      message: {
        text: 'OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC',
        provenance: 'recovered-1410',
      },
    });
  });
});

describe('formatRpgListing — real 1403 chain mapping and page rendering', () => {
  it('maps every one of the 64 card glyphs through chain A, including blanks and substitutes', () => {
    const at: SpecRef = { seqno: 1, sheet: 'calculation', page: '01', cardNo: '010' };
    const card = BCD_TABLE.map((entry) => entry.glyph).join('').padEnd(80);
    const lines: readonly RpgListingLine[] = [
      { kind: 'heading', at, card },
      { kind: 'spec', at, card },
    ];
    const paper = formatRpgListing(lines, { chain: 'A' });
    const printedCard = paper[1]?.text.slice(20, 100);
    const expected = BCD_TABLE.map((entry) => chainGlyph(entry.bcd, 'A')).join('').padEnd(80);
    expect(printedCard).toBe(expected);
    expect(printedCard?.slice(25, 26), '12-0 plus zero').toBe('&');
    expect(printedCard?.slice(35, 36), '11-0 minus zero').toBe('-');
    expect(printedCard?.slice(19, 20), 'substitute blank').toBe('‡');
  });

  it('fits every recovered diagnostic text inside its full-width line', () => {
    expect(Math.max(...RPG_RECOVERED_MESSAGES.map((message) => message.text.length)))
      .toBeLessThanOrEqual(132);
    for (const message of RPG_RECOVERED_MESSAGES) {
      expect(message.text).toBe(message.text.slice(0, 132));
    }
  });

  it('renders the constructed sales listing golden byte for byte', () => {
    const rendered = renderRpgListing(listingOf(SOURCE), { chain: 'A' });
    expect(rendered).toBe(GOLDEN);
    expect(rendered).toContain('CONSTRUCTED RPG SPECIFICATION LISTING');
    expect(rendered).toContain('END OF RPG.BEGIN AUTOCODER');
  });
});
