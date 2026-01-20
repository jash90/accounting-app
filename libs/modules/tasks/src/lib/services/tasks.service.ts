import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets, DataSource } from 'typeorm';
import {
  Task,
  TaskLabel,
  TaskLabelAssignment,
  User,
  TaskStatus,
  TaskStatusLabels,
  PaginatedResponseDto,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';
import { TaskNotFoundException, TaskInvalidParentException } from '../exceptions';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskFiltersDto,
  ReorderTasksDto,
  BulkUpdateStatusDto,
} from '../dto/task.dto';
import {
  KanbanBoardResponseDto,
  KanbanColumnDto,
  ClientTaskStatisticsDto,
} from '../dto/task-response.dto';
import { TaskNotificationService } from './task-notification.service';

/**
 * Valid status transitions for tasks.
 * Prevents invalid state changes and ensures workflow integrity.
 */
const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.BACKLOG]: [TaskStatus.TODO, TaskStatus.CANCELLED],
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.BACKLOG, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW, TaskStatus.TODO, TaskStatus.CANCELLED],
  [TaskStatus.IN_REVIEW]: [TaskStatus.DONE, TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.DONE]: [TaskStatus.IN_PROGRESS], // Allow reopening
  [TaskStatus.CANCELLED]: [TaskStatus.BACKLOG, TaskStatus.TODO], // Allow restoring
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
    private readonly tenantService: TenantService,
    private readonly taskNotificationService: TaskNotificationService,
    private readonly dataSource: DataSource,
  ) {}

  private escapeLikePattern(pattern: string): string {
    return pattern
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  async findAll(user: User, filters?: TaskFiltersDto): Promise<PaginatedResponseDto<Task>> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.client', 'client')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.subtasks', 'subtasks')
      .where('task.companyId = :companyId', { companyId });

    // Search filter
    if (filters?.search) {
      const escapedSearch = this.escapeLikePattern(filters.search);
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where("task.title ILIKE :search ESCAPE '\\'", { search: `%${escapedSearch}%` })
            .orWhere("task.description ILIKE :search ESCAPE '\\'", { search: `%${escapedSearch}%` });
        }),
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
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

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
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.client', 'client')
      .where('task.companyId = :companyId', { companyId })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('task.parentTaskId IS NULL'); // Only root tasks on kanban

    // Apply filters
    if (filters?.assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', { assigneeId: filters.assigneeId });
    }
    if (filters?.clientId) {
      queryBuilder.andWhere('task.clientId = :clientId', { clientId: filters.clientId });
    }
    if (filters?.priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    queryBuilder.orderBy('task.sortOrder', 'ASC');

    const tasks = await queryBuilder.getMany();

    // Load labels for all tasks
    if (tasks.length > 0) {
      const taskIds = tasks.map((t) => t.id);
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

      for (const task of tasks) {
        (task as Task & { labels?: TaskLabel[] }).labels = labelsByTaskId.get(task.id) || [];
      }
    }

    // Group by status
    const statusOrder: TaskStatus[] = [
      TaskStatus.BACKLOG,
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_REVIEW,
      TaskStatus.DONE,
    ];

    const columns: KanbanColumnDto[] = statusOrder.map((status) => {
      const columnTasks = tasks.filter((t) => t.status === status);
      return {
        status,
        label: TaskStatusLabels[status],
        tasks: columnTasks as any[],
        count: columnTasks.length,
      };
    });

    return { columns };
  }

  async getCalendarTasks(user: User, startDate: string, endDate: string): Promise<Task[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.client', 'client')
      .where('task.companyId = :companyId', { companyId })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('task.dueDate IS NOT NULL')
      .andWhere('task.dueDate >= :startDate', { startDate })
      .andWhere('task.dueDate <= :endDate', { endDate })
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.priority', 'ASC')
      .getMany();

    return tasks;
  }

  async getClientTaskStatistics(
    clientId: string,
    user: User,
  ): Promise<ClientTaskStatisticsDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client belongs to the company (multi-tenant isolation)
    const clientExists = await this.taskRepository.manager.findOne('Client', {
      where: { id: clientId, companyId },
    });

    if (!clientExists) {
      throw new TaskNotFoundException(clientId, companyId);
    }

    // Get counts grouped by status
    const statusCounts = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('task.companyId = :companyId', { companyId })
      .andWhere('task.clientId = :clientId', { clientId })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .groupBy('task.status')
      .getRawMany();

    // Get totals for estimated minutes and story points
    const totals = await this.taskRepository
      .createQueryBuilder('task')
      .select('COUNT(*)', 'totalCount')
      .addSelect('COALESCE(SUM(task.estimatedMinutes), 0)', 'totalEstimatedMinutes')
      .addSelect('COALESCE(SUM(task.storyPoints), 0)', 'totalStoryPoints')
      .where('task.companyId = :companyId', { companyId })
      .andWhere('task.clientId = :clientId', { clientId })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .getRawOne();

    // Build byStatus record with all statuses initialized to 0
    const byStatus: Record<TaskStatus, number> = {
      [TaskStatus.BACKLOG]: 0,
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.IN_REVIEW]: 0,
      [TaskStatus.DONE]: 0,
      [TaskStatus.CANCELLED]: 0,
    };

    for (const row of statusCounts) {
      byStatus[row.status as TaskStatus] = parseInt(row.count, 10);
    }

    return {
      clientId,
      byStatus,
      totalCount: parseInt(totals?.totalCount || '0', 10),
      totalEstimatedMinutes: parseInt(totals?.totalEstimatedMinutes || '0', 10),
      totalStoryPoints: parseInt(totals?.totalStoryPoints || '0', 10),
    };
  }

  async create(dto: CreateTaskDto, user: User): Promise<Task & { labels?: TaskLabel[] }> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

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
        }),
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
      user,
    );

    // Send notification if task is associated with a client
    if (savedTask.clientId) {
      // Load task with relations for notification
      const taskWithRelations = await this.findOne(savedTask.id, user);
      this.taskNotificationService
        .notifyTaskCreated(taskWithRelations, user)
        .catch((error) => {
          this.logger.error('Failed to send task created notification', {
            taskId: savedTask.id,
            error: (error as Error).message,
          });
        });
    }

    return savedTask as Task & { labels?: TaskLabel[] };
  }

  async update(id: string, dto: UpdateTaskDto, user: User): Promise<Task & { labels?: TaskLabel[] }> {
    const task = await this.findOne(id, user);
    const oldValues = this.sanitizeTaskForLog(task);
    const oldClientId = task.clientId;
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Validate status transition if status is being changed
    if (dto.status !== undefined && dto.status !== task.status) {
      this.validateStatusTransition(task.status, dto.status);
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
        if (dto.parentTaskId === id || await this.isDescendant(dto.parentTaskId, id)) {
          throw new TaskInvalidParentException(id, dto.parentTaskId);
        }
      }
    }

    // Validate assignee ownership if being changed
    if (dto.assigneeId !== undefined && dto.assigneeId !== task.assigneeId && dto.assigneeId !== null) {
      await this.validateAssigneeOwnership(dto.assigneeId, companyId);
    }

    const { labelIds, ...taskData } = dto;

    Object.assign(task, taskData);
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
          }),
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
      user,
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

    return this.findOne(id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const task = await this.findOne(id, user);
    const oldValues = this.sanitizeTaskForLog(task);

    // Soft delete
    task.isActive = false;
    await this.taskRepository.save(task);

    await this.changeLogService.logDelete('Task', task.id, oldValues, user);

    // Send notification if task was associated with a client
    if (task.clientId) {
      this.taskNotificationService
        .notifyTaskDeleted(task, user)
        .catch((error) => {
          this.logger.error('Failed to send task deleted notification', {
            taskId: task.id,
            error: (error as Error).message,
          });
        });
    }
  }

  async reorderTasks(dto: ReorderTasksDto, user: User): Promise<void> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Validate all tasks belong to company
    const tasks = await this.taskRepository.find({
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

    // Update sort orders
    for (let i = 0; i < dto.taskIds.length; i++) {
      await this.taskRepository.update(
        { id: dto.taskIds[i], companyId },
        { sortOrder: i, ...(dto.newStatus ? { status: dto.newStatus } : {}) },
      );
    }
  }

  async bulkUpdateStatus(dto: BulkUpdateStatusDto, user: User): Promise<{ updated: number }> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

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
      { status: dto.status },
    );

    return { updated: result.affected ?? 0 };
  }

  async getSubtasks(taskId: string, user: User): Promise<Task[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

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

  private async isDescendant(potentialDescendantId: string, ancestorId: string): Promise<boolean> {
    // Check if potentialDescendantId is a descendant of ancestorId
    const subtasks = await this.taskRepository.find({
      where: { parentTaskId: ancestorId },
      select: ['id'],
    });

    for (const subtask of subtasks) {
      if (subtask.id === potentialDescendantId) {
        return true;
      }
      if (await this.isDescendant(potentialDescendantId, subtask.id)) {
        return true;
      }
    }

    return false;
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
      const allowedLabels = allowedTransitions
        ?.map((s) => TaskStatusLabels[s] || s)
        .join(', ') || 'none';

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
      throw new NotFoundException('Użytkownik nie należy do tej firmy lub nie istnieje');
    }
  }

  private sanitizeTaskForLog(task: Task): Record<string, unknown> {
    return {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      startDate: task.startDate,
      estimatedMinutes: task.estimatedMinutes,
      storyPoints: task.storyPoints,
      assigneeId: task.assigneeId,
      clientId: task.clientId,
      parentTaskId: task.parentTaskId,
      isActive: task.isActive,
    };
  }
}
