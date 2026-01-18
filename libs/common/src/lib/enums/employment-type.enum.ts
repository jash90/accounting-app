export enum EmploymentType {
  DG = 'DG',
  DG_ETAT = 'DG_ETAT',
  DG_AKCJONARIUSZ = 'DG_AKCJONARIUSZ',
  DG_HALF_TIME_BELOW_MIN = 'DG_HALF_TIME_BELOW_MIN',
  DG_HALF_TIME_ABOVE_MIN = 'DG_HALF_TIME_ABOVE_MIN',
}

export const EmploymentTypeLabels: Record<EmploymentType, string> = {
  [EmploymentType.DG]: 'Działalność gospodarcza',
  [EmploymentType.DG_ETAT]: 'DG + Etat',
  [EmploymentType.DG_AKCJONARIUSZ]: 'DG + Akcjonariusz',
  [EmploymentType.DG_HALF_TIME_BELOW_MIN]: 'DG + 1/2 etatu (poniżej min.)',
  [EmploymentType.DG_HALF_TIME_ABOVE_MIN]: 'DG + 1/2 etatu (powyżej min.)',
};
