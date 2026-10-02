import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  RPG_GENERATED_PROGRAM_MESSAGES,
  RPG_PROCESSOR_MESSAGES,
  RPG_RECOVERED_MESSAGES,
  RPG_RESERVED_NAMES,
} from '../src/rpg/messages.js';
import type { RpgMessage } from '../src/rpg/types.js';

const RESEARCH = readFileSync('docs/research/rpg-sources.md', 'utf8');

const EXPECTED_BYTE_OFFSETS = new Map<string, number>([
  ['EOJ-NO RG CONTROL CARD', 1115841],
  ['EOJ-NO 1405 CONTROL CARD', 1124999],
  ['EOJ-NO 1301 CONTROL CARD', 1125032],
  ['EOJ-ERRONEOUS RG CARD', 1125065],
  ['EOJ-ERRONEOUS 1301 CARD', 1125095],
  ['TERMINATE RUN. * CARD MISSING BEFORE FORMAT SPECS', 1230052],
  ['OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC', 1243034],
  ['NO OUTPUT SPECIFIED  CD', 1243081],
  ['END INPUT SPECS', 1222568],
  ['END DATA SPECS', 1227390],
  ['END CALC SPECS', 1235658],
  ['END OF RPG', 1247985],
  ['END OF RPG.BEGIN AUTOCODER', 1247997],
  ['INPUT REC OUT OF SEQ', 532377],
  ['RECORD TYPE NOT FOUND', 526959],
  ['SEQUENCE ERROR INPUT FILE', 1109450],
]);

function section(name: string): string {
  const start = RESEARCH.indexOf(`### ${name}`);
  if (start < 0) throw new Error(`missing rpg-sources.md §${name}`);
  const next = RESEARCH.indexOf('\n### ', start + 1);
  return RESEARCH.slice(start, next < 0 ? undefined : next);
}

function processorMessagesFromResearch(): readonly string[] {
  const body = section('4.4 Recovered operator/diagnostic messages (1410 RPG, not 1401)');
  const match = /```\n(?<block>[\s\S]*?)\n```/.exec(body);
  if (!match?.groups?.block) throw new Error('missing §4.4 message block');
  return match.groups.block
    .split('\n')
    .map((line) => line.replace(/^\d+\s+/, ''))
    .filter((line) => line.length > 0);
}

function generatedMessagesFromResearch(): readonly string[] {
  const body = section('4.4 Recovered operator/diagnostic messages (1410 RPG, not 1401)');
  const marker = 'Messages in the **generated** program\'s skeleton (not the processor):';
  const generatedClause = body.slice(body.indexOf(marker) + marker.length);
  const generatedSentence = generatedClause.slice(0, generatedClause.indexOf('[verified]'));
  return [...generatedSentence.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1] ?? '')
    .filter((text) => text.length > 0);
}

function reservedNamesFromResearch(): readonly string[] {
  const body = section('4.5 Reserved names visible in the 1410 skeleton');
  const firstParagraph = body.split('\n\n')[1] ?? '';
  const visibleNamesSentence = firstParagraph.slice(0, firstParagraph.indexOf(' all appear'));
  return [...visibleNamesSentence.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '');
}

function assertRecovered(message: RpgMessage) {
  expect(message.provenance).toBe('recovered-1410');
  expect(message.cite).toBe(
    `rpg-sources.md §4.4; PR-108 byte ${EXPECTED_BYTE_OFFSETS.get(message.text)}`,
  );
}

describe('Wave 4 — recovered 1410 RPG messages (plan §7.3)', () => {
  it('exports the fourteen processor messages sliced from rpg-sources.md §4.4', () => {
    expect(RPG_PROCESSOR_MESSAGES.map((message) => message.text))
      .toEqual(processorMessagesFromResearch());
  });

  it('exports the two generated-program messages named under rpg-sources.md §4.4', () => {
    expect(RPG_GENERATED_PROGRAM_MESSAGES.map((message) => message.text))
      .toEqual(generatedMessagesFromResearch());
  });

  it('keeps every recovered message inside the source-derived corpus with its PR-108 byte cite', () => {
    const corpus = new Set([
      ...processorMessagesFromResearch(),
      ...generatedMessagesFromResearch(),
    ]);

    expect(RPG_RECOVERED_MESSAGES.map((message) => message.text))
      .toEqual([...corpus]);
    expect(RPG_RECOVERED_MESSAGES).toHaveLength(corpus.size);

    for (const message of RPG_RECOVERED_MESSAGES) {
      expect(corpus.has(message.text), message.text).toBe(true);
      expect(EXPECTED_BYTE_OFFSETS.has(message.text), message.text).toBe(true);
      assertRecovered(message);
    }
  });

  it('preserves the recovered 10802-10806 message numbers and leaves unnumbered texts unnumbered', () => {
    const numbered = RPG_RECOVERED_MESSAGES
      .filter((message) => message.messageNo !== undefined)
      .map((message) => [message.messageNo, message.text]);

    expect(numbered).toEqual([
      [10802, 'EOJ-NO RG CONTROL CARD'],
      [10803, 'EOJ-NO 1405 CONTROL CARD'],
      [10804, 'EOJ-NO 1301 CONTROL CARD'],
      [10805, 'EOJ-ERRONEOUS RG CARD'],
      [10806, 'EOJ-ERRONEOUS 1301 CARD'],
    ]);
    expect(RPG_RECOVERED_MESSAGES.slice(5).every((message) => message.messageNo === undefined))
      .toBe(true);
  });

  it('exports the five reserved names visible in rpg-sources.md §4.5', () => {
    expect(RPG_RESERVED_NAMES.map((entry) => entry.name)).toEqual(reservedNamesFromResearch());
    expect(RPG_RESERVED_NAMES.map((entry) => entry.cite))
      .toEqual(RPG_RESERVED_NAMES.map(() => 'rpg-sources.md §4.5'));
  });
});
