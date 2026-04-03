import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import {
  calcRankedDurationStats,
  mapRawToRankings,
  Task,
  TaskStatus,
  User,
} from '@accounting/common';
import { applyDateRangeFilter, SystemCompanyService } from '@accounting/common/backend';

import {
  EmployeeTaskRankingDto,
  StatsPeriodFilterDto,
  StatusDurationQueryDto,
  TaskCompletionDurationStatsDto,
  TaskStatusDurationStatsDto,
} from '../dto/task-extended-stats.dto';

@Injectable()
export class TaskExtendedStatsService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async getCompletionDurationStats(
    user: User,
    filters?: StatsPeriodFilterDto
  ): Promise<TaskCompletionDurationStatsDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .select([
        'task.id',
        'task.title',
        'task.createdAt',
        'task.updatedAt',
        'assignee.id',
        'assignee.email',
        'assignee.firstName',
        'assignee.lastName',
      ])
      .where('task.companyId = :companyId', { companyId })
      .andWhere('task.status = :status', { status: TaskStatus.DONE })
      .andWhere('task.isTemplate = :isTemplate', { isTemplate: false });

    applyDateRangeFilter(qb, 'task', 'updatedAt', filters);

    const tasks = await qb.getMany();

    const withDuration = tasks.map((task) => {
      const durationMs = task.updatedAt.getTime() - task.createdAt.getTime();
      return {
        id: task.id,
        title: task.title,
        durationHours: Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10,
        completedAt: task.updatedAt.toISOString(),
        assigneeName: task.assignee
          ? `${task.assignee.firstName ?? ''} ${task.assignee.lastName ?? ''}`.trim() ||
            task.assignee.email
          : undefined,
      };
    });

    const { longest, shortest, averageDuration } = calcRankedDurationStats(
      withDuration,
      (t) => t.durationHours
    );

    return { longest, shortest, averageDurationHours: averageDuration };
  }

  async getStatusDurationRanking(
    user: User,
    query: StatusDurationQueryDto
  ): Promise<TaskStatusDurationStatsDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const status = query.status as TaskStatus;

    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.assignee', 'assignee')
      .leftJoin('task.client', 'client')
      .select([
        'task.id',
        'task.title',
        'task.updatedAt',
        'assignee.email',
        'assignee.firstName',
        'assignee.lastName',
        'client.name',
      ])
      .where('task.companyId = :companyId', { companyId })
      .andWhere('task.status = :status', { status })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('task.isTemplate = :isTemplate', { isTemplate: false });

    applyDateRangeFilter(qb, 'task', 'updatedAt', {
      startDate: query.startDate,
      endDate: query.endDate,
    });

    const tasks = await qb.getMany();
    const now = Date.now();

    const withDuration = tasks.map((task) => {
      const durationMs = now - task.updatedAt.getTime();
      return {
        id: task.id,
        title: task.title,
        durationHours: Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10,
        statusSince: task.updatedAt.toISOString(),
        assigneeName: task.assignee
          ? `${task.assignee.firstName ?? ''} ${task.assignee.lastName ?? ''}`.trim() ||
            task.assignee.email
          : undefined,
        clientName: (task as Task & { client?: { name: string } }).client?.name,
      };
    });

    const sorted = [...withDuration].sort((a, b) => b.durationHours - a.durationHours);
    const avgHours =
      withDuration.length > 0
        ? Math.round(
            (withDuration.reduce((sum, t) => sum + t.durationHours, 0) / withDuration.length) * 10
          ) / 10
        : 0;

    return { longest: sorted.slice(0, 10), averageDurationHours: avgHours, status: query.status };
  }

  async getEmployeeCompletionRanking(
    user: User,
    filters?: StatsPeriodFilterDto
  ): Promise<EmployeeTaskRankingDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const qb = this.taskRepository
      .createQueryBuilder('task')
      .select('task.assigneeId', 'userId')
      .addSelect('COUNT(*)', 'completedCount')
      .leftJoin('task.assignee', 'assignee')
      .addSelect('assignee.email', 'email')
      .addSelect('assignee.firstName', 'firstName')
      .addSelect('assignee.lastName', 'lastName')
      .where('task.companyId = :companyId', { companyId })
      .andWhere('task.status = :status', { status: TaskStatus.DONE })
      .andWhere('task.assigneeId IS NOT NULL')
      .andWhere('task.isTemplate = :isTemplate', { isTemplate: false })
      .groupBy('task.assigneeId')
      .addGroupBy('assignee.id')
      .addGroupBy('assignee.email')
      .addGroupBy('assignee.firstName')
      .addGroupBy('assignee.lastName')
      .orderBy('COUNT(*)', 'DESC');

    applyDateRangeFilter(qb, 'task', 'updatedAt', filters);

    const raw = await qb.getRawMany<{
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
      completedCount: string;
    }>();

    return { rankings: mapRawToRankings(raw) };
  }
}
