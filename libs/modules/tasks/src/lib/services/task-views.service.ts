import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import {
  Task,
  TaskLabel,
  TaskLabelAssignment,
  TaskStatus,
  TaskStatusLabels,
  User,
} from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { KanbanBoardResponseDto, KanbanColumnDto } from '../dto/task-response.dto';
import { TaskFiltersDto } from '../dto/task.dto';

@Injectable()
export class TaskViewsService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskLabelAssignment)
    private readonly labelAssignmentRepository: Repository<TaskLabelAssignment>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async getKanbanBoard(user: User, filters?: TaskFiltersDto): Promise<KanbanBoardResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const kanbanLimit = filters?.kanbanLimit ?? 50;

    const statusOrder: TaskStatus[] = [
      TaskStatus.BACKLOG,
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_REVIEW,
      TaskStatus.DONE,
      TaskStatus.BLOCKED,
      TaskStatus.CANCELLED,
    ];

    const buildBaseQuery = () => {
      const qb = this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.client', 'client')
        .where('task.companyId = :companyId', { companyId })
        .andWhere('task.isActive = :isActive', { isActive: true })
        .andWhere('task.parentTaskId IS NULL');

      if (filters?.assigneeId) {
        qb.andWhere('task.assigneeId = :assigneeId', { assigneeId: filters.assigneeId });
      }
      if (filters?.clientId) {
        qb.andWhere('task.clientId = :clientId', { clientId: filters.clientId });
      }
      if (filters?.priority) {
        qb.andWhere('task.priority = :priority', { priority: filters.priority });
      }

      return qb;
    };

    // Query each column in parallel with per-column limit
    const columnResults = await Promise.all(
      statusOrder.map(async (status) => {
        const qb = buildBaseQuery()
          .andWhere('task.status = :status', { status })
          .orderBy('task.sortOrder', 'ASC')
          .take(kanbanLimit);

        const [tasks, totalCount] = await qb.getManyAndCount();
        return { status, tasks, totalCount };
      })
    );

    // Load labels for all fetched tasks
    const allTasks = columnResults.flatMap((c) => c.tasks);
    if (allTasks.length > 0) {
      const taskIds = allTasks.map((t) => t.id);
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

      for (const task of allTasks) {
        (task as Task & { labels?: TaskLabel[] }).labels = labelsByTaskId.get(task.id) || [];
      }
    }

    const columns: KanbanColumnDto[] = columnResults.map(({ status, tasks, totalCount }) => ({
      status,
      label: TaskStatusLabels[status],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tasks: tasks as any[],
      count: totalCount,
    }));

    return { columns };
  }

  async getCalendarTasks(user: User, startDate: string, endDate: string): Promise<Task[]> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

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
}
