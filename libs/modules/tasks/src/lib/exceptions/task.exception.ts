import { HttpException, HttpStatus } from '@nestjs/common';

import { TaskErrorCode } from './error-codes.enum';

export interface TaskExceptionContext {
  taskId?: string;
  labelId?: string;
  commentId?: string;
  dependencyId?: string;
  companyId?: string;
  userId?: string;
  operationStage?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Base exception class for all task module errors
 */
export class TaskException extends HttpException {
  constructor(
    public readonly errorCode: TaskErrorCode,
    message: string,
    public readonly context?: TaskExceptionContext,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST
  ) {
    super(
      {
        statusCode,
        message,
        errorCode,
        context,
        timestamp: new Date().toISOString(),
      },
      statusCode
    );
  }
}

export class TaskNotFoundException extends TaskException {
  constructor(taskId: string, companyId?: string) {
    super(
      TaskErrorCode.TASK_NOT_FOUND,
      `Zadanie o ID ${taskId} nie zostało znalezione`,
      { taskId, companyId },
      HttpStatus.NOT_FOUND
    );
  }
}

export class TaskLabelNotFoundException extends TaskException {
  constructor(labelId: string, companyId?: string) {
    super(
      TaskErrorCode.TASK_LABEL_NOT_FOUND,
      `Etykieta o ID ${labelId} nie została znaleziona`,
      { labelId, companyId },
      HttpStatus.NOT_FOUND
    );
  }
}

export class TaskLabelAlreadyExistsException extends TaskException {
  constructor(name: string, companyId?: string) {
    super(
      TaskErrorCode.TASK_LABEL_ALREADY_EXISTS,
      `Etykieta o nazwie "${name}" już istnieje`,
      { companyId, additionalInfo: { name } },
      HttpStatus.CONFLICT
    );
  }
}

export class TaskCommentNotFoundException extends TaskException {
  constructor(commentId: string, taskId?: string) {
    super(
      TaskErrorCode.TASK_COMMENT_NOT_FOUND,
      `Komentarz o ID ${commentId} nie został znaleziony`,
      { commentId, taskId },
      HttpStatus.NOT_FOUND
    );
  }
}

export class TaskDependencyNotFoundException extends TaskException {
  constructor(dependencyId: string) {
    super(
      TaskErrorCode.TASK_DEPENDENCY_NOT_FOUND,
      `Zależność o ID ${dependencyId} nie została znaleziona`,
      { dependencyId },
      HttpStatus.NOT_FOUND
    );
  }
}

export class TaskDependencyCycleException extends TaskException {
  constructor(taskId: string, dependsOnTaskId: string) {
    super(
      TaskErrorCode.TASK_DEPENDENCY_CYCLE_DETECTED,
      `Dodanie zależności utworzyłoby cykl między zadaniami`,
      { taskId, additionalInfo: { dependsOnTaskId } },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class TaskSelfDependencyException extends TaskException {
  constructor(taskId: string) {
    super(
      TaskErrorCode.TASK_SELF_DEPENDENCY_NOT_ALLOWED,
      `Zadanie nie może być zależne od siebie`,
      { taskId },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class TaskDependencyAlreadyExistsException extends TaskException {
  constructor(taskId: string, dependsOnTaskId: string) {
    super(
      TaskErrorCode.TASK_DEPENDENCY_ALREADY_EXISTS,
      `Zależność między tymi zadaniami już istnieje`,
      { taskId, additionalInfo: { dependsOnTaskId } },
      HttpStatus.CONFLICT
    );
  }
}

export class TaskInvalidParentException extends TaskException {
  constructor(taskId: string, parentTaskId: string) {
    super(
      TaskErrorCode.TASK_INVALID_PARENT,
      `Nieprawidłowe zadanie nadrzędne`,
      { taskId, additionalInfo: { parentTaskId } },
      HttpStatus.BAD_REQUEST
    );
  }
}
