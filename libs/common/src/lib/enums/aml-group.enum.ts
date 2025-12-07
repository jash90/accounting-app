export enum AmlGroup {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export const AmlGroupLabels: Record<AmlGroup, string> = {
  [AmlGroup.LOW]: 'Niskie ryzyko',
  [AmlGroup.MEDIUM]: 'Średnie ryzyko',
  [AmlGroup.HIGH]: 'Wysokie ryzyko',
};
