/**
 * Types of employment contracts for client employees
 */
export enum EmployeeContractType {
  /** Umowa o pracę - Employment contract */
  UMOWA_O_PRACE = 'UMOWA_O_PRACE',
  /** Umowa zlecenie - Civil law contract */
  UMOWA_ZLECENIE = 'UMOWA_ZLECENIE',
  /** Umowa o dzieło - Contract for specific work */
  UMOWA_O_DZIELO = 'UMOWA_O_DZIELO',
}

/**
 * Workplace type for employment contracts
 */
export enum WorkplaceType {
  OFFICE = 'OFFICE',
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
}
