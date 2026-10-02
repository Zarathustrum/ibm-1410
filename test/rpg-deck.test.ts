import { describe, expect, it } from 'vitest';

import { parse, parseScanned, scan } from '../src/rpg/deck.js';
import { readSpecSource } from '../src/rpg/sheets/read.js';

const punched = (text: string): string => text.padEnd(80);

function minimalDeck(...formatCards: readonly string[]): string {
  return [
    punched(`RG${' '.repeat(73)}02010`),
    punched('CAA  001 CS                              01                              03010'),
    punched('DFIELD 001         CAA 001                                                 04010'),
    punched('AFIELD 001                   FIELD 001A         D                          05010'),
    ...formatCards.map(punched),
  ].join('\n');
}

describe('RPG deck scan', () => {
  it('scans the verified 1401 sheet order and emits the recovered boundary vocabulary', () => {
    const parsed = parse(minimalDeck(
      'LD11X       01                                                           06010',
      'F                           FIELD 001                                      06020',
    ));

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.input).toHaveLength(1);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.calculations).toHaveLength(1);
    expect(parsed.format).toHaveLength(2);
    expect(parsed.boundaryMessages.map((message) => message.text)).toEqual([
      'END INPUT SPECS',
      'END DATA SPECS',
      'END CALC SPECS',
      'END OF RPG.BEGIN AUTOCODER',
    ]);
  });

  it('publishes the explicit read → scan → parse stages used by the Wave-5 composer', () => {
    const source = minimalDeck(
      'LD11X       01                                                           06010',
      'F                           FIELD 001                                      06020',
    );
    const read = readSpecSource(source);
    const scanned = scan(read);
    const staged = parseScanned(scanned);

    expect(scanned.input[0]).toHaveProperty('card');
    expect(scanned.input[0]).not.toHaveProperty('kind');
    expect(staged).toEqual(parse(source));
  });

  it('uses 10802 when the RG control card is absent', () => {
    const lines = minimalDeck('LD11X       01                                                           06010')
      .split('\n').slice(1).join('\n');
    const parsed = parse(lines);

    expect(parsed.diagnostics).toHaveLength(1);
    expect(parsed.diagnostics[0]).toMatchObject({
      severity: 'terminate',
      message: { messageNo: 10802, text: 'EOJ-NO RG CONTROL CARD', provenance: 'recovered-1410' },
    });
  });

  it('diagnoses a duplicate or late RG card without replacing the first control card', () => {
    const cards = minimalDeck(
      'LD11X       01                                                           06010',
    ).split('\n');
    cards.splice(2, 0, punched(`RG${' '.repeat(73)}99010`));
    const parsed = parse(cards.join('\n'));

    expect(parsed.diagnostics).toHaveLength(1);
    expect(parsed.diagnostics[0]).toMatchObject({
      severity: 'terminate',
      message: { provenance: 'ours', text: 'RG control card must be first and appear exactly once' },
    });
    expect(parsed.control?.at).toMatchObject({ page: '02', cardNo: '010' });
  });

  it('diagnoses a card from a section that was already closed without reordering it', () => {
    const cards = minimalDeck(
      'LD11X       01                                                           06010',
    ).split('\n');
    cards.push(punched('DLATE  001         CAA 001                                                 04020'));
    const parsed = parse(cards.join('\n'));

    expect(parsed.diagnostics).toHaveLength(1);
    expect(parsed.diagnostics[0]).toMatchObject({
      severity: 'terminate',
      message: { provenance: 'ours' },
    });
    expect(parsed.diagnostics[0]?.message.text).toContain('data');
    expect(parsed.diagnostics[0]?.message.text).toContain('format');
  });

  it('uses the recovered missing-before-format text when Format precedes Calculation', () => {
    const cards = minimalDeck('LD11X       01                                                           06010')
      .split('\n');
    cards.splice(3, 1);
    const parsed = parse(cards.join('\n'));

    expect(parsed.diagnostics).toHaveLength(1);
    expect(parsed.diagnostics[0]?.message.text)
      .toBe('TERMINATE RUN. * CARD MISSING BEFORE FORMAT SPECS');
  });

  it('refuses a present 1405 card with project provenance rather than inverting recovered 10803', () => {
    const parsed = parse([
      punched(`RG${' '.repeat(73)}02010`),
      punched('1405'),
    ].join('\n'));

    expect(parsed.diagnostics).toHaveLength(1);
    expect(parsed.diagnostics[0]).toMatchObject({
      severity: 'terminate',
      message: {
        provenance: 'ours',
        text: 'unsupported: 1405 disk input is out of scope (DECISIONS.md 2026-08-30)',
      },
    });
    expect(parsed.diagnostics.some((diagnostic) => diagnostic.message.messageNo === 10803)).toBe(false);
  });

  it('uses recovered 10806 for a malformed 1301 card', () => {
    const parsed = parse([
      punched(`RG${' '.repeat(73)}02010`),
      punched('1301 MALFORMED'),
    ].join('\n'));

    expect(parsed.diagnostics[0]).toMatchObject({
      severity: 'terminate',
      message: { provenance: 'recovered-1410', messageNo: 10806, text: 'EOJ-ERRONEOUS 1301 CARD' },
    });
  });

  it('refuses a present 1301 card with page-card identity as out of scope rather than malformed', () => {
    const parsed = parse([
      punched(`RG${' '.repeat(73)}02010`),
      punched(`1301${' '.repeat(71)}99010`),
    ].join('\n'));

    expect(parsed.diagnostics).toHaveLength(1);
    expect(parsed.diagnostics[0]).toMatchObject({
      severity: 'terminate',
      message: {
        provenance: 'ours',
        text: 'unsupported: 1301 disk input is out of scope (DECISIONS.md 2026-08-30)',
      },
    });
  });

  it('turns an unclassifiable blank column 1 into one column-named diagnostic', () => {
    const cards = minimalDeck('LD11X       01                                                           06010')
      .split('\n');
    cards[1] = punched(' AA  001 CS                              01                              03010');
    const parsed = parse(cards.join('\n'));

    expect(parsed.diagnostics).toHaveLength(1);
    expect(parsed.diagnostics[0]).toMatchObject({ column: 1, severity: 'terminate' });
    expect(parsed.diagnostics[0]?.message.text).toContain('column 1');
  });

  it('uses the recovered no-output text when Format lines contain no in-scope printed output', () => {
    const parsed = parse(minimalDeck(
      'LD11        01                                                           06010',
      'F                           FIELD 001                                      06020',
    ));

    expect(parsed.diagnostics).toHaveLength(1);
    expect(parsed.diagnostics[0]).toMatchObject({
      severity: 'terminate',
      message: { text: 'NO OUTPUT SPECIFIED  CD', provenance: 'recovered-1410' },
    });
  });

  it('reports a spec card longer than 80 columns as one source-reader diagnostic', () => {
    const cards = minimalDeck('LD11X       01                                                           06010')
      .split('\n');
    cards[1] = `${cards[1]}X`;
    const parsed = parse(cards.join('\n'));

    expect(parsed.diagnostics).toHaveLength(1);
    expect(parsed.diagnostics[0]).toMatchObject({
      column: 81,
      message: { text: 'the line is longer than 80 columns', provenance: 'ours' },
    });
  });
});
