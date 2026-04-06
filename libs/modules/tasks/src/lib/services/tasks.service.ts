// TaskViewsService and TaskStatisticsService handle kanban/calendar/statistics
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Brackets, DataSource, In, Repository } from 'typeorm';

import {
  applyUpdate,
  ErrorMessages,
  escapeLikePattern,
  PaginatedResponseDto,
  Task,
  TaskLabel,
  TaskLabelAssignment,
  TaskStatus,
  TaskStatusLabels,
  User,
} from '@accounting/common';
import {
  calculatePagination,
  sanitizeForLog,
  SystemCompanyService,
} from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';

import {
  ClientTaskStatisticsDto,
  GlobalTaskStatisticsDto,
  KanbanBoardResponseDto,
} from '../dto/task-response.dto';
import {
  BulkUpdateStatusDto,
  CreateTaskDto,
  ReorderTasksDto,
  TaskFiltersDto,
  UpdateTaskDto,
} from '../dto/task.dto';
import { TaskInvalidParentException, TaskNotFoundException } from '../exceptions';
import { TaskNotificationService } from './task-notification.service';
import { TaskStatisticsService } from './task-statistics.service';
import { TaskViewsService } from './task-views.service';

/**
 * Valid status transitions for tasks.
 * Prevents invalid state changes and ensures workflow integrity.
 */
const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.BACKLOG]: [TaskStatus.TODO, TaskStatus.CANCELLED, TaskStatus.BLOCKED],
  [TaskStatus.TODO]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.BACKLOG,
    TaskStatus.CANCELLED,
    TaskStatus.BLOCKED,
  ],
  [TaskStatus.IN_PROGRESS]: [
    TaskStatus.IN_REVIEW,
    TaskStatus.TODO,
    TaskStatus.CANCELLED,
    TaskStatus.BLOCKED,
  ],
  [TaskStatus.IN_REVIEW]: [
    TaskStatus.DONE,
    TaskStatus.IN_PROGRESS,
    TaskStatus.CANCELLED,
    TaskStatus.BLOCKED,
  ],
  [TaskStatus.DONE]: [TaskStatus.IN_PROGRESS], // Allow reopening
  [TaskStatus.CANCELLED]: [TaskStatus.BACKLOG, TaskStatus.TODO], // Allow restoring
  [TaskStatus.BLOCKED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS], // Unblock
};

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskLabel)
    private readonly labelRepository: Repository<TaskLabel>,
    @InjectRepository(TaskLabelAssignment)
    private readonly labelAssignmentRepository: Repository<TaskLabelAssignment>,
    private readonly changeLogService: ChangeLogService,
    private readonly systemCompanyService: SystemCompanyService,
    private readonly taskNotificationService: TaskNotificationService,
    private readonly dataSource: DataSource,
    private readonly taskStatisticsService: TaskStatisticsService,
    private readonly taskViewsService: TaskViewsService
  ) {}

  async findAll(user: User, filters?: TaskFiltersDto): Promise<PaginatedResponseDto<Task>> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const { page, limit, skip } = calculatePagination(filters);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.client', 'client')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.subtasks', 'subtasks')
      .where('task.companyId = :companyId', { companyId });

    // Search filter
    if (filters?.search) {
      const escapedSearch = escapeLikePattern(filters.search);
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where("task.title ILIKE :search ESCAPE '\\'", {
            search: `%${escapedSearch}%`,
          }).orWhere("task.description ILIKE :search ESCAPE '\\'", {
            search: `%${escapedSearch}%`,
          });
        })
      );
    }

    // Status filters
    if (filters?.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    }
    if (filters?.statuses && filters.statuses.length > 0) {
      queryBuilder.andWhere('task.status IN (:...statuses)', { statuses: filters.statuses });
    }

    // Priority filter
    if (filters?.priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    // Assignee filter
    if (filters?.assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', { assigneeId: filters.assigneeId });
    }

    // Client filter
    if (filters?.clientId) {
      queryBuilder.andWhere('task.clientId = :clientId', { clientId: filters.clientId });
    }

    // Due date filters
    if (filters?.dueBefore) {
      queryBuilder.andWhere('task.dueDate <= :dueBefore', { dueBefore: filters.dueBefore });
    }
    if (filters?.dueAfter) {
      queryBuilder.andWhere('task.dueDate >= :dueAfter', { dueAfter: filters.dueAfter });
    }

    // Root only filter (no parent task)
    if (filters?.rootOnly) {
      queryBuilder.andWhere('task.parentTaskId IS NULL');
    }

    // Active filter (default true)
    const isActive = filters?.isActive ?? true;
    queryBuilder.andWhere('task.isActive = :isActive', { isActive });

    // Label filter - requires join
    if (filters?.labelId) {
      queryBuilder
        .innerJoin('task_label_assignments', 'tla', 'tla.taskId = task.id')
        .andWhere('tla.labelId = :labelId', { labelId: filters.labelId });
    }

    queryBuilder
      .orderBy('task.sortOrder', 'ASC')
      .addOrderBy('task.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Load labels for each task
    if (data.length > 0) {
      const taskIds = data.map((t) => t.id);
      const labelAssignments = await this.labelAssignmentRepository.find({
        where: { taskId: In(taskIds) },
        relations: ['label'],
      });

      const labelsByTaskId = new Map<string, TaskLabel[]>();
      for (const assignment of labelAssignments) {
        if (!labelsByTaskId.has(assignment.taskId)) {
          labelsByTaskId.set(assignment.taskId, []);
        }
        if (assignment.label) {
          labelsByTaskId.get(assignment.taskId)!.push(assignment.label);
        }
      }

      for (const task of data) {
        (task as Task & { labels?: TaskLabel[] }).labels = labelsByTaskId.get(task.id) || [];
      }
    }

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string, user: User): Promise<Task & { labels?: TaskLabel[] }> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const task = await this.taskRepository.findOne({
      where: { id, companyId },
      relations: ['assignee', 'client', 'createdBy', 'subtasks', 'parentTask'],
    });

    if (!task) {
      throw new TaskNotFoundException(id, companyId);
    }

    // Load labels
    const labelAssignments = await this.labelAssignmentRepository.find({
      where: { taskId: id },
      relations: ['label'],
    });
    (task as Task & { labels?: TaskLabel[] }).labels = labelAssignments.map((a) => a.label);

    return task as Task & { labels?: TaskLabel[] };
  }

  async getKanbanBoard(user: User, filters?: TaskFiltersDto): Promise<KanbanBoardResponseDto> {
    return this.taskViewsService.getKanbanBoard(user, filters);
  }

  async getCalendarTasks(user: User, startDate: string, endDate: string): Promise<Task[]> {
    return this.taskViewsService.getCalendarTasks(user, startDate, endDate);
  }

  async getClientTaskStatistics(clientId: string, user: User): Promise<ClientTaskStatisticsDto> {
    return this.taskStatisticsService.getClientTaskStatistics(clientId, user);
  }

  async getGlobalStatistics(user: User): Promise<GlobalTaskStatisticsDto> {
    return this.taskStatisticsService.getGlobalStatistics(user);
  }

  async create(dto: CreateTaskDto, user: User): Promise<Task & { labels?: TaskLabel[] }> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Validate parent task if provided
    if (dto.parentTaskId) {
      const parentTask = await this.taskRepository.findOne({
        where: { id: dto.parentTaskId, companyId },
      });
      if (!parentTask) {
        throw new TaskInvalidParentException('new', dto.parentTaskId);
      }
    }

    // Validate assignee ownership if provided
    if (dto.assigneeId) {
      await this.validateAssigneeOwnership(dto.assigneeId, companyId);
    }

    // Get max sort order
    const maxSortOrder = await this.taskRepository
      .createQueryBuilder('task')
      .select('MAX(task.sortOrder)', 'max')
      .where('task.companyId = :companyId', { companyId })
      .getRawOne();

    const { labelIds, ...taskData } = dto;

    const task = this.taskRepository.create({
      ...taskData,
      companyId,
      createdById: user.id,
      sortOrder: (maxSortOrder?.max ?? 0) + 1,
    });

    const savedTask = await this.taskRepository.save(task);

    // Assign labels if provided
    if (labelIds && labelIds.length > 0) {
      const labels = await this.labelRepository.find({
        where: { id: In(labelIds), companyId, isActive: true },
      });

      const assignments = labels.map((label) =>
        this.labelAssignmentRepository.create({
          taskId: savedTask.id,
          labelId: label.id,
          assignedById: user.id,
        })
      );
      await this.labelAssignmentRepository.save(assignments);
      (savedTask as Task & { labels?: TaskLabel[] }).labels = labels;
    } else {
      (savedTask as Task & { labels?: TaskLabel[] }).labels = [];
    }

    // Log change
    await this.changeLogService.logCreate(
      'Task',
      savedTask.id,
      this.sanitizeTaskForLog(savedTask),
      user
    );

    // Send notification if task is associated with a client
    if (savedTask.clientId) {
      // Load task with relations for notification
      const taskWithRelations = await this.findOne(savedTask.id, user);
      this.taskNotificationService.notifyTaskCreated(taskWithRelations, user).catch((error) => {
        this.logger.error('Failed to send task created notification', {
          taskId: savedTask.id,
          error: (error as Error).message,
        });
      });
    }

    return savedTask as Task & { labels?: TaskLabel[] };
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    user: User
  ): Promise<Task & { labels?: TaskLabel[] }> {
    const task = await this.findOne(id, user);
    const oldValues = this.sanitizeTaskForLog(task);
    const oldClientId = task.clientId;
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Validate status transition if status is being changed
    if (dto.status !== undefined && dto.status !== task.status) {
      this.validateStatusTransition(task.status, dto.status);

      if (dto.status === TaskStatus.BLOCKED && !dto.blockingReason) {
        throw new BadRequestException(
          'Powód blokady jest wymagany przy zmianie statusu na Zablokowane'
        );
      }
      if (dto.status === TaskStatus.CANCELLED && !dto.cancellationReason) {
        throw new BadRequestException(
          'Powód anulowania jest wymagany przy zmianie statusu na Anulowane'
        );
      }
    }

    // Validate new parent if provided
    if (dto.parentTaskId !== undefined && dto.parentTaskId !== task.parentTaskId) {
      if (dto.parentTaskId) {
        const parentTask = await this.taskRepository.findOne({
          where: { id: dto.parentTaskId, companyId },
        });
        if (!parentTask) {
          throw new TaskInvalidParentException(id, dto.parentTaskId);
        }
        // Prevent setting parent to itself or descendant
        if (dto.parentTaskId === id || (await this.isDescendant(dto.parentTaskId, id))) {
          throw new TaskInvalidParentException(id, dto.parentTaskId);
        }
      }
    }

    // Validate assignee ownership if being changed
    if (
      dto.assigneeId !== undefined &&
      dto.assigneeId !== task.assigneeId &&
      dto.assigneeId !== null
    ) {
      await this.validateAssigneeOwnership(dto.assigneeId, companyId);
    }

    const { labelIds, ...taskData } = dto;

    applyUpdate(task, taskData, ['id', 'companyId', 'createdById', 'createdAt', 'updatedAt']);
    const savedTask = await this.taskRepository.save(task);

    // Update labels if provided
    if (labelIds !== undefined) {
      // Remove existing assignments
      await this.labelAssignmentRepository.delete({ taskId: id });

      if (labelIds.length > 0) {
        const labels = await this.labelRepository.find({
          where: { id: In(labelIds), companyId, isActive: true },
        });

        const assignments = labels.map((label) =>
          this.labelAssignmentRepository.create({
            taskId: id,
            labelId: label.id,
            assignedById: user.id,
          })
        );
        await this.labelAssignmentRepository.save(assignments);
        (savedTask as Task & { labels?: TaskLabel[] }).labels = labels;
      } else {
        (savedTask as Task & { labels?: TaskLabel[] }).labels = [];
      }
    }

    // Log change
    await this.changeLogService.logUpdate(
      'Task',
      savedTask.id,
      oldValues,
      this.sanitizeTaskForLog(savedTask),
      user
    );

    // Send notification if task is/was associated with a client
    if (savedTask.clientId || oldClientId) {
      const taskWithRelations = await this.findOne(savedTask.id, user);
      this.taskNotificationService
        .notifyTaskUpdated(taskWithRelations, oldValues, user, oldClientId)
        .catch((error) => {
          this.logger.error('Failed to send task updated notification', {
            taskId: savedTask.id,
            error: (error as Error).message,
          });
        });
    }

    // If status transitioned to DONE, send completion notification
    if (
      dto.status === TaskStatus.DONE &&
      oldValues['status'] !== TaskStatus.DONE &&
      savedTask.clientId
    ) {
      const taskWithRelations = await this.findOne(savedTask.id, user);
      this.taskNotificationService.notifyTaskCompleted(taskWithRelations, user).catch((error) => {
        this.logger.error('Failed to send task completed notification', {
          taskId: savedTask.id,
          error: (error as Error).message,
        });
      });
    }

    return this.findOne(id, user);
  }

  async softDeleteTask(id: string, user: User): Promise<void> {
    const task = await this.findOne(id, user);
    const oldValues = this.sanitizeTaskForLog(task);

    // Soft delete
    task.isActive = false;
    await this.taskRepository.save(task);

    await this.changeLogService.logDelete('Task', task.id, oldValues, user);

    // Send notification if task was associated with a client
    if (task.clientId) {
      this.taskNotificationService.notifyTaskDeleted(task, user).catch((error) => {
        this.logger.error('Failed to send task deleted notification', {
          taskId: task.id,
          error: (error as Error).message,
        });
      });
    }
  }

  /**
   * FIX-07: Wrapped in transaction with batch UPDATE via CASE WHEN.
   * Replaces N sequential UPDATE queries with a single SQL statement.
   */
  async reorderTasks(dto: ReorderTasksDto, user: User): Promise<void> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    await this.dataSource.transaction(async (manager) => {
      const taskRepo = manager.getRepository(Task);

      // Validate all tasks belong to company
      const tasks = await taskRepo.find({
        where: { id: In(dto.taskIds), companyId },
      });

      if (tasks.length !== dto.taskIds.length) {
        this.logger.warn('Some tasks not found during reorder', {
          requested: dto.taskIds.length,
          found: tasks.length,
        });
      }

      // Validate status transitions if newStatus is provided
      if (dto.newStatus) {
        for (const task of tasks) {
          if (task.status !== dto.newStatus) {
            this.validateStatusTransition(task.status, dto.newStatus);
          }
        }
      }

      // Batch UPDATE via parameterized query
      if (dto.taskIds.length > 0) {
        const validIds = tasks.map((t) => t.id);
        const caseClauses = validIds
          .map((id) => {
            const idx = dto.taskIds.indexOf(id);
            return `WHEN id = '${id}' THEN ${idx}`;
          })
          .join(' ');

        let query = `UPDATE task SET "sortOrder" = CASE ${caseClauses} ELSE "sortOrder" END`;

        if (dto.newStatus) {
          query += `, status = $2`;
        }

        query += ` WHERE id = ANY($1) AND "companyId" = $${dto.newStatus ? '3' : '2'}`;

        const params = dto.newStatus ? [validIds, dto.newStatus, companyId] : [validIds, companyId];

        await manager.query(query, params);
      }
    });
  }

  async bulkUpdateStatus(dto: BulkUpdateStatusDto, user: User): Promise<{ updated: number }> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Validate status transitions for all tasks
    const tasks = await this.taskRepository.find({
      where: { id: In(dto.taskIds), companyId },
    });

    for (const task of tasks) {
      if (task.status !== dto.status) {
        this.validateStatusTransition(task.status, dto.status);
      }
    }

    const result = await this.taskRepository.update(
      { id: In(dto.taskIds), companyId },
      { status: dto.status }
    );

    return { updated: result.affected ?? 0 };
  }

  async getSubtasks(taskId: string, user: User): Promise<Task[]> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Verify parent task exists
    const parentTask = await this.taskRepository.findOne({
      where: { id: taskId, companyId },
    });
    if (!parentTask) {
      throw new TaskNotFoundException(taskId, companyId);
    }

    return this.taskRepository.find({
      where: { parentTaskId: taskId, companyId, isActive: true },
      relations: ['assignee'],
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * FIX-06: Replaced recursive N+1 queries with a single WITH RECURSIVE CTE.
   * Checks if potentialDescendantId is a descendant of ancestorId in one DB query.
   */
  private async isDescendant(potentialDescendantId: string, ancestorId: string): Promise<boolean> {
    const result = await this.taskRepository.query(
      `
      WITH RECURSIVE descendants AS (
        SELECT id FROM task WHERE "parentTaskId" = $1
        UNION ALL
        SELECT t.id FROM task t
          INNER JOIN descendants d ON t."parentTaskId" = d.id
      )
      SELECT EXISTS(
        SELECT 1 FROM descendants WHERE id = $2
      ) AS "isDescendant"
      `,
      [ancestorId, potentialDescendantId]
    );

    return result[0]?.isDescendant === true;
  }

  /**
   * Validates that a status transition is allowed.
   * Throws BadRequestException if the transition is invalid.
   *
   * @param from - Current task status
   * @param to - Target task status
   * @throws BadRequestException if transition is not allowed
   */
  private validateStatusTransition(from: TaskStatus, to: TaskStatus): void {
    const allowedTransitions = VALID_STATUS_TRANSITIONS[from];

    if (!allowedTransitions || !allowedTransitions.includes(to)) {
      const fromLabel = TaskStatusLabels[from] || from;
      const toLabel = TaskStatusLabels[to] || to;
      const allowedLabels =
        allowedTransitions?.map((s) => TaskStatusLabels[s] || s).join(', ') || 'none';

      throw new BadRequestException(
        `Nieprawidłowa zmiana statusu: ${fromLabel} → ${toLabel}. ` +
          `Dozwolone przejścia z "${fromLabel}": ${allowedLabels}`
      );
    }
  }

  /**
   * Validates that an assignee belongs to the specified company.
   * Throws NotFoundException if user doesn't exist or doesn't belong to company.
   */
  private async validateAssigneeOwnership(assigneeId: string, companyId: string): Promise<void> {
    const user = await this.dataSource.getRepository('User').findOne({
      where: { id: assigneeId, companyId, isActive: true },
    });
    if (!user) {
      throw new NotFoundException(ErrorMessages.TASKS.USER_NOT_IN_COMPANY);
    }
  }

  private sanitizeTaskForLog(task: Task): Record<string, unknown> {
    return sanitizeForLog(task, [
      'title',
      'description',
      'status',
      'priority',
      'dueDate',
      'startDate',
      'estimatedMinutes',
      'storyPoints',
      'assigneeId',
      'clientId',
      'parentTaskId',
      'isActive',
    ]);
  }
}
