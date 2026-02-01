import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

/**
 * ZUS Error Codes
 */
export enum ZusErrorCode {
  CONTRIBUTION_NOT_FOUND = 'ZUS_CONTRIBUTION_NOT_FOUND',
  CONTRIBUTION_ALREADY_EXISTS = 'ZUS_CONTRIBUTION_ALREADY_EXISTS',
  SETTINGS_NOT_FOUND = 'ZUS_SETTINGS_NOT_FOUND',
  INVALID_PERIOD = 'ZUS_INVALID_PERIOD',
  CALCULATION_FAILED = 'ZUS_CALCULATION_FAILED',
}

/**
 * Base ZUS Exception
 */
export class ZusException extends HttpException {
  constructor(
    message: string,
    public readonly errorCode: ZusErrorCode,
    status: HttpStatus = HttpStatus.BAD_REQUEST
  ) {
    super(
      {
        statusCode: status,
        message,
        errorCode,
      },
      status
    );
  }
}

/**
 * ZUS Contribution Not Found Exception
 */
export class ZusContributionNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      statusCode: HttpStatus.NOT_FOUND,
      message: `Rozliczenie ZUS o ID ${id} nie zostało znalezione`,
      errorCode: ZusErrorCode.CONTRIBUTION_NOT_FOUND,
    });
  }
}

/**
 * ZUS Contribution Already Exists Exception
 */
export class ZusContributionAlreadyExistsException extends ZusException {
  constructor(clientId: string, month: number, year: number) {
    super(
      `Rozliczenie ZUS dla klienta ${clientId} za okres ${month}/${year} już istnieje`,
      ZusErrorCode.CONTRIBUTION_ALREADY_EXISTS,
      HttpStatus.CONFLICT
    );
  }
}

/**
 * ZUS Settings Not Found Exception
 */
export class ZusSettingsNotFoundException extends NotFoundException {
  constructor(clientId: string) {
    super({
      statusCode: HttpStatus.NOT_FOUND,
      message: `Ustawienia ZUS dla klienta ${clientId} nie zostały znalezione`,
      errorCode: ZusErrorCode.SETTINGS_NOT_FOUND,
    });
  }
}

/**
 * Invalid ZUS Period Exception
 */
export class InvalidZusPeriodException extends ZusException {
  constructor(month: number, year: number) {
    super(
      `Nieprawidłowy okres rozliczeniowy: ${month}/${year}`,
      ZusErrorCode.INVALID_PERIOD,
      HttpStatus.BAD_REQUEST
    );
  }
}

/**
 * ZUS Calculation Failed Exception
 */
export class ZusCalculationFailedException extends ZusException {
  constructor(reason: string) {
    super(
      `Nie udało się obliczyć składek ZUS: ${reason}`,
      ZusErrorCode.CALCULATION_FAILED,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
