import type { RpgMessage } from './types.js';

/**
 * OPEN: `RPG_DIAGNOSTIC_TEXTS_ARE_THE_RECOVERED_ONES` — `[verified]` for the sixteen PR-108
 * strings (fourteen processor, two generated); which source defect receives which string is this
 * project's mapping. A recovered message always retains its byte-offset cite and invented text is
 * always `ours`. Fallback: none;
 * provenance is the mitigation. Plan §15; rpg-sources.md §4.4; open-questions.md, Phase 5 / Wave 4.
 */
export const RPG_DIAGNOSTIC_TEXTS_ARE_THE_RECOVERED_ONES = true;

interface RecoveredMessageInput {
  readonly text: string;
  readonly byteOffset: number;
  readonly messageNo?: number;
}

export interface RpgReservedName {
  readonly name: string;
  readonly cite: string;
}

function recovered(input: RecoveredMessageInput): RpgMessage {
  return {
    text: input.text,
    provenance: 'recovered-1410',
    cite: `rpg-sources.md §4.4; PR-108 byte ${input.byteOffset}`,
    ...(input.messageNo === undefined ? {} : { messageNo: input.messageNo }),
  };
}

export const RPG_PROCESSOR_MESSAGES = [
  recovered({ messageNo: 10802, text: 'EOJ-NO RG CONTROL CARD', byteOffset: 1115841 }),
  recovered({ messageNo: 10803, text: 'EOJ-NO 1405 CONTROL CARD', byteOffset: 1124999 }),
  recovered({ messageNo: 10804, text: 'EOJ-NO 1301 CONTROL CARD', byteOffset: 1125032 }),
  recovered({ messageNo: 10805, text: 'EOJ-ERRONEOUS RG CARD', byteOffset: 1125065 }),
  recovered({ messageNo: 10806, text: 'EOJ-ERRONEOUS 1301 CARD', byteOffset: 1125095 }),
  recovered({ text: 'TERMINATE RUN. * CARD MISSING BEFORE FORMAT SPECS', byteOffset: 1230052 }),
  recovered({ text: 'OUTPUT TYPE NOT SPECIFIED ON LINE FORMAT SPEC', byteOffset: 1243034 }),
  recovered({ text: 'NO OUTPUT SPECIFIED  CD', byteOffset: 1243081 }),
  recovered({ text: 'END INPUT SPECS', byteOffset: 1222568 }),
  recovered({ text: 'END DATA SPECS', byteOffset: 1227390 }),
  recovered({ text: 'END CALC SPECS', byteOffset: 1235658 }),
  recovered({ text: 'END OF RPG', byteOffset: 1247985 }),
  recovered({ text: 'END OF RPG.BEGIN AUTOCODER', byteOffset: 1247997 }),
  recovered({ text: 'SEQUENCE ERROR INPUT FILE', byteOffset: 1109450 }),
] as const satisfies readonly RpgMessage[];

export const RPG_GENERATED_PROGRAM_MESSAGES = [
  recovered({ text: 'INPUT REC OUT OF SEQ', byteOffset: 532377 }),
  recovered({ text: 'RECORD TYPE NOT FOUND', byteOffset: 526959 }),
] as const satisfies readonly RpgMessage[];

export const RPG_RECOVERED_MESSAGES = [
  ...RPG_PROCESSOR_MESSAGES,
  ...RPG_GENERATED_PROGRAM_MESSAGES,
] as const satisfies readonly RpgMessage[];

export const RPG_RESERVED_NAMES = [
  { name: 'PAGENO', cite: 'rpg-sources.md §4.5' },
  { name: 'SER', cite: 'rpg-sources.md §4.5' },
  { name: 'WORD', cite: 'rpg-sources.md §4.5' },
  { name: 'LC', cite: 'rpg-sources.md §4.5' },
  { name: 'OF', cite: 'rpg-sources.md §4.5' },
] as const satisfies readonly RpgReservedName[];

export function recoveredMessage(text: string): RpgMessage | undefined {
  return RPG_RECOVERED_MESSAGES.find((message) => message.text === text);
}

export function oursMessage(text: string, cite: string): RpgMessage {
  return { text, provenance: 'ours', cite };
}
