export enum AmlGroup {
  LOW = 'LOW',
  STANDARD = 'STANDARD',
  ELEVATED = 'ELEVATED',
  HIGH = 'HIGH',
}

export const AmlGroupLabels: Record<AmlGroup, string> = {
  [AmlGroup.LOW]: 'Niskie ryzyko',
  [AmlGroup.STANDARD]: 'Standardowe ryzyko',
  [AmlGroup.ELEVATED]: 'Podwyższone ryzyko',
  [AmlGroup.HIGH]: 'Wysokie ryzyko',
};
