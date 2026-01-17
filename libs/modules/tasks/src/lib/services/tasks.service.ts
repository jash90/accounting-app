import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import {
  Task,
  TaskLabel,
  TaskLabelAssignment,
  User,
  TaskStatus,
  TaskStatusLabels,
  PaginatedResponseDto,
  TenantService,
} from '@accounting/common';
import { ChangeLogService } from '@accounting/infrastructure/change-log';
import { TaskNotFoundException, TaskInvalidParentException } from '../exceptions';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskFiltersDto,
  ReorderTasksDto,
  BulkUpdateStatusDto,
} from '../dto/task.dto';
import { KanbanBoardResponseDto, KanbanColumnDto } from '../dto/task-response.dto';

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

    return savedTask as Task & { labels?: TaskLabel[] };
  }

  async update(id: string, dto: UpdateTaskDto, user: User): Promise<Task & { labels?: TaskLabel[] }> {
    const task = await this.findOne(id, user);
    const oldValues = this.sanitizeTaskForLog(task);

    // Validate new parent if provided
    if (dto.parentTaskId !== undefined && dto.parentTaskId !== task.parentTaskId) {
      if (dto.parentTaskId) {
        const companyId = await this.tenantService.getEffectiveCompanyId(user);
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

    const { labelIds, ...taskData } = dto;

    Object.assign(task, taskData);
    const savedTask = await this.taskRepository.save(task);

    // Update labels if provided
    if (labelIds !== undefined) {
      // Remove existing assignments
      await this.labelAssignmentRepository.delete({ taskId: id });

      if (labelIds.length > 0) {
        const companyId = await this.tenantService.getEffectiveCompanyId(user);
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

    return this.findOne(id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const task = await this.findOne(id, user);
    const oldValues = this.sanitizeTaskForLog(task);

    // Soft delete
    task.isActive = false;
    await this.taskRepository.save(task);

    await this.changeLogService.logDelete('Task', task.id, oldValues, user);
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
