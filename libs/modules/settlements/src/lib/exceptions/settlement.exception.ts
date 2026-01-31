import { ForbiddenException, NotFoundException } from '@nestjs/common';

export class SettlementNotFoundException extends NotFoundException {
  constructor(settlementId: string, companyId?: string) {
    super(
      companyId
        ? `Rozliczenie ${settlementId} nie znalezione w firmie ${companyId}`
        : `Rozliczenie ${settlementId} nie znalezione`
    );
  }
}

export class SettlementAccessDeniedException extends ForbiddenException {
  constructor(settlementId: string) {
    super(`Brak dostępu do rozliczenia ${settlementId}`);
  }
}

export class UserNotFoundException extends NotFoundException {
  constructor(userId: string, companyId?: string) {
    super(
      companyId
        ? `Użytkownik ${userId} nie znaleziony w firmie ${companyId}`
        : `Użytkownik ${userId} nie znaleziony`
    );
  }
}
