// Phase 5 RPG boundary types. Nothing in src/core or src/asm names these shapes, so they live
// with the RPG producer; assembler/core types are imported rather than redefined.
import type { Addr } from '../core/types.js';
import type { SourceCard } from '../asm/types.js';

export type SpecCard = string;
export type SheetKind = 'control' | 'input' | 'data' | 'calculation' | 'format';

export interface SheetField {
  readonly name: string;
  readonly cols: readonly [number, number];
  readonly cite: string;
  readonly inScope: boolean;
  readonly why?: string;
}

export interface SpecRef {
  readonly seqno: number;
  readonly sheet: SheetKind;
  readonly page: string;
  readonly cardNo: string;
}

export interface RpgMessage {
  readonly text: string;
  readonly provenance: 'recovered-1410' | 'ours';
  readonly cite: string;
  readonly messageNo?: number;
}

export interface RpgDiagnostic {
  readonly at: SpecRef;
  readonly column?: number;
  readonly message: RpgMessage;
  readonly severity: 'terminate' | 'flag';
}

export interface Condition { readonly indicator: string; readonly negated: boolean; }

export interface ControlField {
  readonly n: 1 | 2 | 3 | 4 | 5 | 6;
  readonly end: number;
  readonly length: number;
}

export interface RecordType {
  readonly condition: string;
  readonly codes: readonly {
    readonly position: number;
    readonly not: boolean;
    readonly compare: 'Z' | 'D' | 'C';
    readonly code: string;
  }[];
  readonly seq?: string;
  readonly number?: '1' | 'N';
  readonly optional: boolean;
  readonly at: SpecRef;
}

export interface FieldSource {
  readonly kind: 'record' | 'page' | 'serial' | 'recordCount';
  readonly recordType?: string;
  readonly end?: number;
  readonly sourceLength?: number;
  readonly numeric: boolean;
  readonly operation: 'move' | 'add' | 'subtract' | 'resetAdd' | 'resetSubtract' | 'digit' | 'zone';
  readonly conditions: readonly Condition[];
}

export interface DataField {
  readonly name: string;
  readonly length: number;
  readonly sources: readonly FieldSource[];
  readonly statuses: readonly { readonly status: string; readonly condition: string }[];
  readonly at: SpecRef;
}

export interface CalcStep {
  readonly result?: string;
  readonly length?: number;
  readonly factor1?: { readonly text: string; readonly length: number };
  readonly op?: '+' | '-' | 'X' | '/' | 'C';
  readonly factor2?: { readonly text: string; readonly length: number };
  readonly accumulate?: 'A' | 'S' | 'resetAdd' | 'resetSubtract';
  readonly conditions: readonly Condition[];
  readonly time: 'total' | 'detail';
  readonly halfAdjust?: number;
  readonly positionAdjust?: number;
  readonly statuses: readonly { readonly status: string; readonly condition: string }[];
  readonly at: SpecRef;
}

export interface OutputLine {
  readonly id: string;
  readonly type: 'H' | 'D' | 'T';
  readonly level: string;
  readonly number: string;
  readonly print: boolean;
  readonly nextLine?: string;
  readonly spaceBefore?: 1 | 2 | 3;
  readonly spaceAfter?: 1 | 2 | 3;
  readonly skipBefore?: number;
  readonly skipAfter?: number;
  readonly conditionGroups: readonly (readonly Condition[])[];
  readonly fields: readonly FieldEntry[];
  readonly at: SpecRef;
}

/**
 * OPEN: `EDIT_WORD_RIDES_ON_THE_FIELD_ENTRY` — `[verified]` IBM 1401 sheet semantics and
 * `[likely]` 1410 processor behaviour. J24-0215-2 p.39 is a 1401 manual: it puts the
 * data/calculation field name in columns 29-34 and the edit payload in 51-75. The shared X24
 * form warrants carrying that shape into the 1410 model, not upgrading J24 into 1410 evidence.
 * We therefore keep an inline control word or `WORDxx` reference on its F/B entry. Fallback:
 * require a W entry for every edit and match it by field end. Plan §15; `rpg-sources.md` §10.3,
 * §10.5; `open-questions.md`, Phase 5 / Wave 2.
 */
export const EDIT_WORD_RIDES_ON_THE_FIELD_ENTRY = true;

export interface FieldEntry {
  readonly kind: 'F' | 'B' | 'K' | 'W';
  readonly name?: string;
  readonly end?: number;
  readonly conditionGroups: readonly (readonly Condition[])[];
  readonly zeroSuppress: boolean;
  readonly length?: number;
  /** Raw Format cols 51-75: K/W body text, or an F/B card's inline edit body / reusable WORDxx
   *  reference (J24-0215-2 p.39; EDIT_WORD_RIDES_ON_THE_FIELD_ENTRY). */
  readonly literal?: string;
  readonly at: SpecRef;
}

export interface Model {
  readonly control: { readonly present: boolean; readonly at?: SpecRef };
  readonly records: readonly RecordType[];
  readonly sequenceField?: 1 | 2 | 3 | 4 | 5 | 6;
  readonly controlFields: readonly ControlField[];
  readonly fields: readonly DataField[];
  readonly calcs: readonly CalcStep[];
  readonly lines: readonly OutputLine[];
  readonly indicators: readonly string[];
}

export interface Stmt {
  readonly kind?: 'statement' | 'comment';
  readonly label?: string;
  readonly indent?: boolean;
  readonly op: string;
  readonly operands: readonly string[];
  readonly comment?: string;
  readonly from?: SpecRef;
}

export interface Layout {
  readonly org: Addr;
  readonly constants: Addr;
  readonly code: Addr;
  readonly codeLength: number;
  readonly slack: Addr;
  readonly indicatorFile: Addr;
  readonly cardIn: Addr;
  readonly printLine: Addr;
  readonly printGroupMark: Addr;
  readonly highWater: Addr;
  readonly coreSizeCode: 1 | 2 | 3 | 4 | 5;
  areaOf(name: string): Addr | undefined;
}

export interface RpgListingLine {
  readonly at: SpecRef;
  readonly card: SpecCard;
  readonly flag?: 'E' | 'W';
  readonly message?: RpgMessage;
  readonly kind: 'heading' | 'spec' | 'separator' | 'diagnostic' | 'trailer';
}

export interface RpgResult {
  readonly ok: boolean;
  readonly cards: readonly SourceCard[];
  readonly source: string;
  readonly listing?: readonly RpgListingLine[];
  readonly diagnostics: readonly RpgDiagnostic[];
  readonly model?: Model;
  readonly layout?: Layout;
}

export class RpgBug extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RpgBug';
  }
}
