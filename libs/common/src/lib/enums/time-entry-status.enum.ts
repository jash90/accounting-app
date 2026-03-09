export enum TimeEntryStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  BILLED = 'billed',
}

export const TimeEntryStatusLabels: Record<TimeEntryStatus, string> = {
  [TimeEntryStatus.DRAFT]: 'Wersja robocza',
  [TimeEntryStatus.SUBMITTED]: 'Wysłane',
  [TimeEntryStatus.APPROVED]: 'Zatwierdzone',
  [TimeEntryStatus.REJECTED]: 'Odrzucone',
  [TimeEntryStatus.BILLED]: 'Rozliczone',
};

export const TimeEntryStatusColors: Record<TimeEntryStatus, string> = {
  [TimeEntryStatus.DRAFT]: 'gray',
  [TimeEntryStatus.SUBMITTED]: 'blue',
  [TimeEntryStatus.APPROVED]: 'green',
  [TimeEntryStatus.REJECTED]: 'red',
  [TimeEntryStatus.BILLED]: 'purple',
};

export const TimeEntryStatusOrder: TimeEntryStatus[] = [
  TimeEntryStatus.DRAFT,
  TimeEntryStatus.SUBMITTED,
  TimeEntryStatus.APPROVED,
  TimeEntryStatus.REJECTED,
  TimeEntryStatus.BILLED,
];
