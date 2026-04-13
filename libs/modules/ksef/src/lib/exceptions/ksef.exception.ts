import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { KSEF_MESSAGES } from '../constants/ksef-messages';

export class KsefConfigurationNotFoundException extends NotFoundException {
  constructor(companyId: string) {
    super(
      `${KSEF_MESSAGES.CONFIG_NOT_FOUND} (firma: ${companyId})`
    );
  }
}

export class KsefSessionNotFoundException extends NotFoundException {
  constructor(sessionId: string, companyId?: string) {
    super(
      companyId
        ? `${KSEF_MESSAGES.SESSION_NOT_FOUND} (sesja: ${sessionId}, firma: ${companyId})`
        : `${KSEF_MESSAGES.SESSION_NOT_FOUND} (sesja: ${sessionId})`
    );
  }
}

export class KsefInvoiceNotFoundException extends NotFoundException {
  constructor(invoiceId: string, companyId?: string) {
    super(
      companyId
        ? `${KSEF_MESSAGES.INVOICE_NOT_FOUND} (faktura: ${invoiceId}, firma: ${companyId})`
        : `${KSEF_MESSAGES.INVOICE_NOT_FOUND} (faktura: ${invoiceId})`
    );
  }
}

export class KsefAuthenticationException extends UnauthorizedException {
  constructor(detail?: string) {
    super(
      detail
        ? `${KSEF_MESSAGES.AUTH_FAILED}: ${detail}`
        : KSEF_MESSAGES.AUTH_FAILED
    );
  }
}

export class KsefSessionExpiredException extends BadRequestException {
  constructor(sessionId: string) {
    super(
      `${KSEF_MESSAGES.SESSION_EXPIRED} (sesja: ${sessionId})`
    );
  }
}

export class KsefInvoiceNotDraftException extends BadRequestException {
  constructor(invoiceId: string) {
    super(
      `${KSEF_MESSAGES.INVOICE_NOT_DRAFT} (faktura: ${invoiceId})`
    );
  }
}

export class KsefRateLimitException extends HttpException {
  constructor() {
    super(KSEF_MESSAGES.RATE_LIMIT_EXCEEDED, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class KsefApiException extends BadGatewayException {
  constructor(detail?: string, retryable = false) {
    super({
      statusCode: HttpStatus.BAD_GATEWAY,
      message: detail
        ? `${KSEF_MESSAGES.CONNECTION_FAILED}: ${detail}`
        : KSEF_MESSAGES.CONNECTION_FAILED,
      retryable,
    });
  }
}

export class KsefEncryptionException extends InternalServerErrorException {
  constructor(detail?: string) {
    super(
      detail
        ? `${KSEF_MESSAGES.ENCRYPTION_ERROR}: ${detail}`
        : KSEF_MESSAGES.ENCRYPTION_ERROR
    );
  }
}

export class KsefXmlGenerationException extends InternalServerErrorException {
  constructor(detail?: string) {
    super(
      detail
        ? `${KSEF_MESSAGES.XML_GENERATION_ERROR}: ${detail}`
        : KSEF_MESSAGES.XML_GENERATION_ERROR
    );
  }
}
