import { BadRequestException, NotFoundException } from '@nestjs/common';

import { OfferErrorCode } from './error-codes.enum';

export class ClientNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      code: OfferErrorCode.CLIENT_NOT_FOUND,
      message: `Klient o ID ${id} nie został znaleziony`,
    });
  }
}

export class LeadNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      code: OfferErrorCode.LEAD_NOT_FOUND,
      message: `Lead o ID ${id} nie został znaleziony`,
    });
  }
}

export class LeadAlreadyConvertedException extends BadRequestException {
  constructor(id: string) {
    super({
      code: OfferErrorCode.LEAD_ALREADY_CONVERTED,
      message: `Lead o ID ${id} został już przekonwertowany na klienta`,
    });
  }
}

export class LeadInvalidStatusTransitionException extends BadRequestException {
  constructor(currentStatus: string, newStatus: string) {
    super({
      code: OfferErrorCode.LEAD_INVALID_STATUS_TRANSITION,
      message: `Nie można zmienić statusu leada z ${currentStatus} na ${newStatus}`,
    });
  }
}

export class LeadHasOffersException extends BadRequestException {
  constructor(id: string) {
    super({
      code: OfferErrorCode.LEAD_HAS_OFFERS,
      message: `Nie można usunąć leada o ID ${id}, ponieważ jest powiązany z ofertami`,
    });
  }
}

export class OfferTemplateNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      code: OfferErrorCode.TEMPLATE_NOT_FOUND,
      message: `Szablon oferty o ID ${id} nie został znaleziony`,
    });
  }
}

export class OfferTemplateFileNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      code: OfferErrorCode.TEMPLATE_FILE_NOT_FOUND,
      message: `Plik szablonu oferty o ID ${id} nie został znaleziony`,
    });
  }
}

export class OfferTemplateInvalidFileTypeException extends BadRequestException {
  constructor() {
    super({
      code: OfferErrorCode.TEMPLATE_INVALID_FILE_TYPE,
      message: 'Plik szablonu musi być w formacie DOCX',
    });
  }
}

export class OfferTemplateHasOffersException extends BadRequestException {
  constructor(id: string) {
    super({
      code: OfferErrorCode.TEMPLATE_HAS_OFFERS,
      message: `Nie można usunąć szablonu o ID ${id}, ponieważ jest używany przez oferty`,
    });
  }
}

export class OfferNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      code: OfferErrorCode.OFFER_NOT_FOUND,
      message: `Oferta o ID ${id} nie została znaleziona`,
    });
  }
}

export class OfferInvalidStatusTransitionException extends BadRequestException {
  constructor(currentStatus: string, newStatus: string) {
    super({
      code: OfferErrorCode.OFFER_INVALID_STATUS_TRANSITION,
      message: `Nie można zmienić statusu oferty z ${currentStatus} na ${newStatus}`,
    });
  }
}

export class OfferCannotModifyException extends BadRequestException {
  constructor(status: string) {
    super({
      code: OfferErrorCode.OFFER_CANNOT_MODIFY,
      message: `Nie można modyfikować oferty w statusie ${status}`,
    });
  }
}

export class OfferNoRecipientException extends BadRequestException {
  constructor() {
    super({
      code: OfferErrorCode.OFFER_NO_RECIPIENT,
      message: 'Oferta musi mieć przypisanego klienta lub prospekt',
    });
  }
}

export class OfferDocumentNotGeneratedException extends BadRequestException {
  constructor(id: string) {
    super({
      code: OfferErrorCode.OFFER_DOCUMENT_NOT_GENERATED,
      message: `Dokument oferty o ID ${id} nie został jeszcze wygenerowany`,
    });
  }
}

export class OfferAlreadySentException extends BadRequestException {
  constructor(id: string) {
    super({
      code: OfferErrorCode.OFFER_ALREADY_SENT,
      message: `Oferta o ID ${id} została już wysłana`,
    });
  }
}

export class OfferRecipientNoEmailException extends BadRequestException {
  constructor() {
    super({
      code: OfferErrorCode.OFFER_RECIPIENT_NO_EMAIL,
      message: 'Odbiorca oferty nie ma przypisanego adresu email',
    });
  }
}

export class DocumentGenerationFailedException extends BadRequestException {
  constructor(reason: string) {
    super({
      code: OfferErrorCode.DOCUMENT_GENERATION_FAILED,
      message: `Generowanie dokumentu nie powiodło się: ${reason}`,
    });
  }
}

export class DocumentTemplateInvalidException extends BadRequestException {
  constructor(reason: string) {
    super({
      code: OfferErrorCode.DOCUMENT_TEMPLATE_INVALID,
      message: `Szablon dokumentu jest nieprawidłowy: ${reason}`,
    });
  }
}

export class EmailSendFailedException extends BadRequestException {
  constructor(reason: string) {
    super({
      code: OfferErrorCode.EMAIL_SEND_FAILED,
      message: `Wysyłanie emaila nie powiodło się: ${reason}`,
    });
  }
}

export class EmailConfigurationMissingException extends BadRequestException {
  constructor() {
    super({
      code: OfferErrorCode.EMAIL_CONFIGURATION_MISSING,
      message: 'Konfiguracja email nie została ustawiona',
    });
  }
}
