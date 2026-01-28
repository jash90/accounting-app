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
  GTU_01: 'GTU_01 - Napoje alkoholowe',
  GTU_02: 'GTU_02 - Paliwa i oleje napędowe',
  GTU_03: 'GTU_03 - Oleje opałowe i smary',
  GTU_04: 'GTU_04 - Wyroby tytoniowe, susz, płyny do e-papierosów',
  GTU_05: 'GTU_05 - Odpady (złom, surowce wtórne)',
  GTU_06: 'GTU_06 - Urządzenia elektroniczne (telefony, laptopy, konsole)',
  GTU_07: 'GTU_07 - Pojazdy i części samochodowe',
  GTU_08: 'GTU_08 - Metale szlachetne i jubilerstwo',
  GTU_09: 'GTU_09 - Leki i wyroby medyczne',
  GTU_10: 'GTU_10 - Budynki, budowle i grunty',
  GTU_11: 'GTU_11 - Przenoszenie uprawnień do emisji gazów cieplarnianych',
  GTU_12: 'GTU_12 - Usługi niematerialne (doradcze, księgowe, prawne, marketingowe)',
  GTU_13: 'GTU_13 - Usługi transportowe i magazynowe',
};
