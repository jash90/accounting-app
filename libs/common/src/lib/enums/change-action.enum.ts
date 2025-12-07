export enum ChangeAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export const ChangeActionLabels: Record<ChangeAction, string> = {
  [ChangeAction.CREATE]: 'Utworzenie',
  [ChangeAction.UPDATE]: 'Aktualizacja',
  [ChangeAction.DELETE]: 'Usunięcie',
};
