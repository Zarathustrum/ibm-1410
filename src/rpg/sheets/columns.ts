import type { SpecCard, SpecRef, SheetField } from '../types.js';

export const CARD_IDENTITY_COLUMNS = {
  page: [76, 77],
  cardNumber: [78, 80],
} as const satisfies Record<string, readonly [number, number]>;

export const CONTROL_COLUMNS = [
  field('rg', 1, 2, 'rpg-sources.md §5, 1410 RG control card messages'),
  field(
    'body',
    3,
    75,
    'rpg-sources.md §5, 1410 control card differs from §6.5',
    false,
    'unsupported: the RG card column layout is not recovered',
  ),
] as const satisfies readonly SheetField[];

export const INPUT_COLUMNS = [
  field('c', 1, 1, 'rpg-sources.md §6.1 cols 1'),
  field('seq', 2, 3, 'rpg-sources.md §6.1 cols 2-3'),
  field('number', 4, 4, 'rpg-sources.md §6.1 cols 4'),
  field('option', 5, 5, 'rpg-sources.md §6.1 cols 5'),
  field('recordPosition1', 6, 8, 'rpg-sources.md §6.1 cols 6-8'),
  field('recordNot1', 9, 9, 'rpg-sources.md §6.1 cols 9'),
  field('recordCompare1', 10, 10, 'rpg-sources.md §6.1 cols 10'),
  field('recordCode1', 11, 11, 'rpg-sources.md §6.1 cols 11'),
  field('recordPosition2', 12, 14, 'rpg-sources.md §6.1 cols 12-17'),
  field('recordNot2', 15, 15, 'rpg-sources.md §6.1 cols 12-17'),
  field('recordCompare2', 16, 16, 'rpg-sources.md §6.1 cols 12-17'),
  field('recordCode2', 17, 17, 'rpg-sources.md §6.1 cols 12-17'),
  field('recordPosition3', 18, 20, 'rpg-sources.md §6.1 cols 18-23'),
  field('recordNot3', 21, 21, 'rpg-sources.md §6.1 cols 18-23'),
  field('recordCompare3', 22, 22, 'rpg-sources.md §6.1 cols 18-23'),
  field('recordCode3', 23, 23, 'rpg-sources.md §6.1 cols 18-23'),
  field('recordPosition4', 24, 26, 'rpg-sources.md §6.1 cols 24-29'),
  field('recordNot4', 27, 27, 'rpg-sources.md §6.1 cols 24-29'),
  field('recordCompare4', 28, 28, 'rpg-sources.md §6.1 cols 24-29'),
  field('recordCode4', 29, 29, 'rpg-sources.md §6.1 cols 24-29'),
  field('recordPosition5', 30, 32, 'rpg-sources.md §6.1 cols 30-35'),
  field('recordNot5', 33, 33, 'rpg-sources.md §6.1 cols 30-35'),
  field('recordCompare5', 34, 34, 'rpg-sources.md §6.1 cols 30-35'),
  field('recordCode5', 35, 35, 'rpg-sources.md §6.1 cols 30-35'),
  field('recordPosition6', 36, 38, 'rpg-sources.md §6.1 cols 36-41'),
  field('recordNot6', 39, 39, 'rpg-sources.md §6.1 cols 36-41'),
  field('recordCompare6', 40, 40, 'rpg-sources.md §6.1 cols 36-41'),
  field('recordCode6', 41, 41, 'rpg-sources.md §6.1 cols 36-41'),
  field('resultingCondition', 42, 43, 'rpg-sources.md §6.1 cols 42-43'),
  field('controlFieldEnd1', 44, 46, 'rpg-sources.md §6.1 cols 44-46'),
  field('controlFieldLength1', 47, 48, 'rpg-sources.md §6.1 cols 47-48'),
  field('controlFieldEnd2', 49, 51, 'rpg-sources.md §6.1 cols 49-53'),
  field('controlFieldLength2', 52, 53, 'rpg-sources.md §6.1 cols 49-53'),
  field('controlFieldEnd3', 54, 56, 'rpg-sources.md §6.1 cols 54-58'),
  field('controlFieldLength3', 57, 58, 'rpg-sources.md §6.1 cols 54-58'),
  field('controlFieldEnd4', 59, 61, 'rpg-sources.md §6.1 cols 59-63'),
  field('controlFieldLength4', 62, 63, 'rpg-sources.md §6.1 cols 59-63'),
  field('controlFieldEnd5', 64, 66, 'rpg-sources.md §6.1 cols 64-68'),
  field('controlFieldLength5', 67, 68, 'rpg-sources.md §6.1 cols 64-68'),
  field('controlFieldEnd6', 69, 71, 'rpg-sources.md §6.1 cols 69-73'),
  field('controlFieldLength6', 72, 73, 'rpg-sources.md §6.1 cols 69-73'),
  field('unused', 74, 75, 'rpg-sources.md §6.1 cols 74-75', false, 'not used'),
  field('page', 76, 77, 'rpg-sources.md §6.1 cols 76-77'),
  field('cardNumber', 78, 80, 'rpg-sources.md §6.1 cols 78-80'),
] as const satisfies readonly SheetField[];

export const DATA_COLUMNS = [
  field('d', 1, 1, 'rpg-sources.md §6.2 cols 1'),
  field('fieldName', 2, 7, 'rpg-sources.md §6.2 cols 2-7'),
  field('fieldLength', 8, 10, 'rpg-sources.md §6.2 cols 8-10'),
  field('status1', 11, 11, 'rpg-sources.md §6.2 cols 11'),
  field('resultingCondition1', 12, 13, 'rpg-sources.md §6.2 cols 12-13'),
  field('status2', 14, 14, 'rpg-sources.md §6.2 cols 14'),
  field('resultingCondition2', 15, 16, 'rpg-sources.md §6.2 cols 15-16'),
  field('status3', 17, 17, 'rpg-sources.md §6.2 cols 17'),
  field('resultingCondition3', 18, 19, 'rpg-sources.md §6.2 cols 18-19'),
  field('firstSourceGroup', 20, 36, 'rpg-sources.md §6.2 cols 20-36'),
  field('source1FieldSource', 20, 22, 'rpg-sources.md §6.2 cols 20-22'),
  field('source1Numeric', 23, 23, 'rpg-sources.md §6.2 cols 23'),
  field('source1FieldEnd', 24, 26, 'rpg-sources.md §6.2 cols 24-26'),
  field('source1FieldLength', 27, 29, 'rpg-sources.md §6.2 cols 27-29'),
  field('source1Operation', 30, 30, 'rpg-sources.md §6.2 cols 30'),
  field('source1Condition1Not', 31, 31, 'rpg-sources.md §6.2 cols 31-33'),
  field('source1Condition1Indicator', 32, 33, 'rpg-sources.md §6.2 cols 31-33'),
  field('source1Condition2Not', 34, 34, 'rpg-sources.md §6.2 cols 34-36'),
  field('source1Condition2Indicator', 35, 36, 'rpg-sources.md §6.2 cols 34-36'),
  field('source2FieldSource', 37, 39, 'rpg-sources.md §6.2 cols 37-53'),
  field('source2Numeric', 40, 40, 'rpg-sources.md §6.2 cols 37-53'),
  field('source2FieldEnd', 41, 43, 'rpg-sources.md §6.2 cols 37-53'),
  field('source2FieldLength', 44, 46, 'rpg-sources.md §6.2 cols 37-53'),
  field('source2Operation', 47, 47, 'rpg-sources.md §6.2 cols 37-53'),
  field('source2Condition1Not', 48, 48, 'rpg-sources.md §6.2 cols 37-53'),
  field('source2Condition1Indicator', 49, 50, 'rpg-sources.md §6.2 cols 37-53'),
  field('source2Condition2Not', 51, 51, 'rpg-sources.md §6.2 cols 37-53'),
  field('source2Condition2Indicator', 52, 53, 'rpg-sources.md §6.2 cols 37-53'),
  field('source3FieldSource', 54, 56, 'rpg-sources.md §6.2 cols 54-70'),
  field('source3Numeric', 57, 57, 'rpg-sources.md §6.2 cols 54-70'),
  field('source3FieldEnd', 58, 60, 'rpg-sources.md §6.2 cols 54-70'),
  field('source3FieldLength', 61, 63, 'rpg-sources.md §6.2 cols 54-70'),
  field('source3Operation', 64, 64, 'rpg-sources.md §6.2 cols 54-70'),
  field('source3Condition1Not', 65, 65, 'rpg-sources.md §6.2 cols 54-70'),
  field('source3Condition1Indicator', 66, 67, 'rpg-sources.md §6.2 cols 54-70'),
  field('source3Condition2Not', 68, 68, 'rpg-sources.md §6.2 cols 54-70'),
  field('source3Condition2Indicator', 69, 70, 'rpg-sources.md §6.2 cols 54-70'),
  field('unused', 71, 75, 'rpg-sources.md §6.2 cols 71-75', false, 'not used'),
  field('page', 76, 77, 'rpg-sources.md §6.2 cols 76-77'),
  field('cardNumber', 78, 80, 'rpg-sources.md §6.2 cols 78-80'),
] as const satisfies readonly SheetField[];

export const CALC_COLUMNS = [
  field('a', 1, 1, 'rpg-sources.md §6.3 cols 1'),
  field('fieldName', 2, 7, 'rpg-sources.md §6.3 cols 2-7'),
  field('fieldLength', 8, 10, 'rpg-sources.md §6.3 cols 8-10'),
  field('status1', 11, 11, 'rpg-sources.md §6.3 cols 11'),
  field('resultingCondition1', 12, 13, 'rpg-sources.md §6.3 cols 12-13'),
  field('status2', 14, 14, 'rpg-sources.md §6.3 cols 14'),
  field('resultingCondition2', 15, 16, 'rpg-sources.md §6.3 cols 15-16'),
  field('status3', 17, 17, 'rpg-sources.md §6.3 cols 17'),
  field('resultingCondition3', 18, 19, 'rpg-sources.md §6.3 cols 18-19'),
  field('factor1', 20, 25, 'rpg-sources.md §6.3 cols 20-25'),
  field('factor1Length', 26, 28, 'rpg-sources.md §6.3 cols 26-28'),
  field('op', 29, 29, 'rpg-sources.md §6.3 cols 29'),
  field('factor2', 30, 35, 'rpg-sources.md §6.3 cols 30-35'),
  field('factor2Length', 36, 38, 'rpg-sources.md §6.3 cols 36-38'),
  field('accumulate', 39, 39, 'rpg-sources.md §6.3 cols 39'),
  field('condition1Not', 40, 40, 'rpg-sources.md §6.3 cols 40-42'),
  field('condition1Indicator', 41, 42, 'rpg-sources.md §6.3 cols 40-42'),
  field('condition2Not', 43, 43, 'rpg-sources.md §6.3 cols 43-45'),
  field('condition2Indicator', 44, 45, 'rpg-sources.md §6.3 cols 43-45'),
  field('condition3Not', 46, 46, 'rpg-sources.md §6.3 cols 46-48'),
  field('condition3Indicator', 47, 48, 'rpg-sources.md §6.3 cols 46-48'),
  field('totalDetail', 49, 49, 'rpg-sources.md §6.3 cols 49'),
  field('halfAdjust', 50, 51, 'rpg-sources.md §6.3 cols 50-51'),
  field('positionAdjust', 52, 53, 'rpg-sources.md §6.3 cols 52-53'),
  field('unused', 54, 75, 'rpg-sources.md §6.3 cols 54-75', false, 'not used'),
  field('page', 76, 77, 'rpg-sources.md §6.3 cols 76-77'),
  field('cardNumber', 78, 80, 'rpg-sources.md §6.3 cols 78-80'),
] as const satisfies readonly SheetField[];

export const FORMAT_COLUMNS = [
  field('format', 1, 1, 'rpg-sources.md §6.4 cols 1'),
  field('lineSpecificationGroup', 2, 28, 'rpg-sources.md §6.4 cols 2-28'),
  field('line', 2, 4, 'rpg-sources.md §6.4 cols 2-4'),
  field('print', 5, 5, 'rpg-sources.md §6.4 cols 5'),
  field('punch', 6, 6, 'rpg-sources.md §6.4 cols 6', false, 'punch output is out of scope for Phase 5'),
  field('reserved', 7, 7, 'rpg-sources.md §6.4 cols 7', false, 'magnetic-tape output is out of scope'),
  field('nextLine', 8, 10, 'rpg-sources.md §6.4 cols 8-10'),
  field('spaceBefore', 11, 12, 'rpg-sources.md §6.4 cols 11-12'),
  field('spaceAfter', 13, 14, 'rpg-sources.md §6.4 cols 13-14'),
  field('skipBefore', 15, 16, 'rpg-sources.md §6.4 cols 15-16'),
  field('skipAfter', 17, 18, 'rpg-sources.md §6.4 cols 17-18'),
  field('stacker', 19, 19, 'rpg-sources.md §6.4 cols 19', false, 'punch stacker selection is out of scope for Phase 5'),
  field('lineCondition1Not', 20, 20, 'rpg-sources.md §6.4 cols 20-22'),
  field('lineCondition1Indicator', 21, 22, 'rpg-sources.md §6.4 cols 20-22'),
  field('lineCondition2Not', 23, 23, 'rpg-sources.md §6.4 cols 23-25'),
  field('lineCondition2Indicator', 24, 25, 'rpg-sources.md §6.4 cols 23-25'),
  field('lineCondition3Not', 26, 26, 'rpg-sources.md §6.4 cols 26-28'),
  field('lineCondition3Indicator', 27, 28, 'rpg-sources.md §6.4 cols 26-28'),
  field('fieldSpecificationGroup', 29, 75, 'rpg-sources.md §6.4 cols 29-75'),
  field('fieldName', 29, 34, 'rpg-sources.md §6.4 cols 29-34'),
  field('fieldEnd', 35, 37, 'rpg-sources.md §6.4 cols 35-37'),
  field('fieldCondition1Not', 38, 38, 'rpg-sources.md §6.4 cols 38-40'),
  field('fieldCondition1Indicator', 39, 40, 'rpg-sources.md §6.4 cols 38-40'),
  field('fieldCondition2Not', 41, 41, 'rpg-sources.md §6.4 cols 41-43'),
  field('fieldCondition2Indicator', 42, 43, 'rpg-sources.md §6.4 cols 41-43'),
  field('fieldCondition3Not', 44, 44, 'rpg-sources.md §6.4 cols 44-46'),
  field('fieldCondition3Indicator', 45, 46, 'rpg-sources.md §6.4 cols 44-46'),
  field('zeroSuppress', 47, 47, 'rpg-sources.md §6.4 cols 47'),
  field('fieldLength', 48, 50, 'rpg-sources.md §6.4 cols 48-50'),
  field('constantOrEditControlWord', 51, 75, 'rpg-sources.md §6.4 cols 51-75'),
  field('page', 76, 77, 'rpg-sources.md §6.4 cols 76-77'),
  field('cardNumber', 78, 80, 'rpg-sources.md §6.4 cols 78-80'),
] as const satisfies readonly SheetField[];

export const SHEET_COLUMNS = {
  control: CONTROL_COLUMNS,
  input: INPUT_COLUMNS,
  data: DATA_COLUMNS,
  calculation: CALC_COLUMNS,
  format: FORMAT_COLUMNS,
} as const;

export function fieldOf(fields: readonly SheetField[], name: string): SheetField | undefined {
  return fields.find((candidate) => candidate.name === name);
}

export function valueOf(card: SpecCard, fields: readonly SheetField[], name: string): string {
  const { cols } = fieldOf(fields, name) ?? { cols: [1, 0] as const };
  return card.slice(cols[0] - 1, cols[1]);
}

export function cardIdentityOf(card: SpecCard): Pick<SpecRef, 'page' | 'cardNo'> {
  return {
    page: spanValue(card, CARD_IDENTITY_COLUMNS.page),
    cardNo: spanValue(card, CARD_IDENTITY_COLUMNS.cardNumber),
  };
}

function field(
  name: string,
  start: number,
  end: number,
  cite: string,
  inScope = true,
  why?: string,
): SheetField {
  return { name, cols: [start, end], cite, inScope, ...(why === undefined ? {} : { why }) };
}

function spanValue(card: SpecCard, cols: readonly [number, number]): string {
  return card.slice(cols[0] - 1, cols[1]);
}
