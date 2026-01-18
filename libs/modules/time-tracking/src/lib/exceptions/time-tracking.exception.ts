import { HttpException, HttpStatus } from '@nestjs/common';

export enum TimeTrackingErrorCode {
  TIME_ENTRY_NOT_FOUND = 'TIME_ENTRY_NOT_FOUND',
  TIMER_ALREADY_RUNNING = 'TIMER_ALREADY_RUNNING',
  TIMER_NOT_RUNNING = 'TIMER_NOT_RUNNING',
  TIME_ENTRY_OVERLAP = 'TIME_ENTRY_OVERLAP',
  TIME_ENTRY_LOCKED = 'TIME_ENTRY_LOCKED',
  TIME_ENTRY_INVALID_STATUS = 'TIME_ENTRY_INVALID_STATUS',
}

export class TimeEntryNotFoundException extends HttpException {
  constructor(id: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: TimeTrackingErrorCode.TIME_ENTRY_NOT_FOUND,
        message: `Wpis czasu o ID ${id} nie został znaleziony`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class TimerAlreadyRunningException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: TimeTrackingErrorCode.TIMER_ALREADY_RUNNING,
        message: 'Timer jest już uruchomiony. Zatrzymaj obecny timer przed uruchomieniem nowego.',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class TimerNotRunningException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: TimeTrackingErrorCode.TIMER_NOT_RUNNING,
        message: 'Nie ma aktywnego timera do zatrzymania.',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class TimeEntryOverlapException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: TimeTrackingErrorCode.TIME_ENTRY_OVERLAP,
        message: 'Wpis czasu nakłada się z istniejącym wpisem. Nakładające się wpisy nie są dozwolone.',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class TimeEntryLockedException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: TimeTrackingErrorCode.TIME_ENTRY_LOCKED,
        message: 'Wpis czasu jest zablokowany i nie może być edytowany.',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class TimeEntryInvalidStatusException extends HttpException {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: TimeTrackingErrorCode.TIME_ENTRY_INVALID_STATUS,
        message: `Nie można zmienić statusu z "${currentStatus}" na "${targetStatus}".`,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
