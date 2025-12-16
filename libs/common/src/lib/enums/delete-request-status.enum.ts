export enum DeleteRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const DeleteRequestStatusLabels: Record<DeleteRequestStatus, string> = {
  [DeleteRequestStatus.PENDING]: 'Oczekujące',
  [DeleteRequestStatus.APPROVED]: 'Zatwierdzone',
  [DeleteRequestStatus.REJECTED]: 'Odrzucone',
};
