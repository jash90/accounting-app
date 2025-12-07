export const GTU_CODES = [
  'GTU_01',
  'GTU_02',
  'GTU_03',
  'GTU_04',
  'GTU_05',
  'GTU_06',
  'GTU_07',
  'GTU_08',
  'GTU_09',
  'GTU_10',
  'GTU_11',
  'GTU_12',
  'GTU_13',
] as const;

export type GtuCode = (typeof GTU_CODES)[number];

export const GTU_CODE_LABELS: Record<GtuCode, string> = {
  GTU_01: 'GTU_01 - Dostawa napojów alkoholowych',
  GTU_02: 'GTU_02 - Dostawa paliw',
  GTU_03: 'GTU_03 - Dostawa oleju opałowego',
  GTU_04: 'GTU_04 - Dostawa wyrobów tytoniowych',
  GTU_05: 'GTU_05 - Dostawa odpadów',
  GTU_06: 'GTU_06 - Dostawa urządzeń elektronicznych',
  GTU_07: 'GTU_07 - Dostawa pojazdów i części',
  GTU_08: 'GTU_08 - Dostawa metali szlachetnych',
  GTU_09: 'GTU_09 - Dostawa leków i wyrobów medycznych',
  GTU_10: 'GTU_10 - Dostawa budynków i budowli',
  GTU_11: 'GTU_11 - Świadczenie usług - przenoszenie uprawnień',
  GTU_12: 'GTU_12 - Świadczenie usług niematerialnych',
  GTU_13: 'GTU_13 - Świadczenie usług transportowych',
};
