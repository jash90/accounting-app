import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Task, TaskStatus, User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { ClientTaskStatisticsDto, GlobalTaskStatisticsDto } from '../dto/task-response.dto';
import { TaskNotFoundException } from '../exceptions';

@Injectable()
export class TaskStatisticsService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async getClientTaskStatistics(clientId: string, user: User): Promise<ClientTaskStatisticsDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

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
      [TaskStatus.BLOCKED]: 0,
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

  async getGlobalStatistics(user: User): Promise<GlobalTaskStatisticsDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Get counts grouped by status
    const statusCounts = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('task.companyId = :companyId', { companyId })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .groupBy('task.status')
      .getRawMany();

    // Build byStatus record with all statuses initialized to 0
    const byStatus: Record<TaskStatus, number> = {
      [TaskStatus.BACKLOG]: 0,
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.IN_REVIEW]: 0,
      [TaskStatus.DONE]: 0,
      [TaskStatus.CANCELLED]: 0,
      [TaskStatus.BLOCKED]: 0,
    };

    let total = 0;
    for (const row of statusCounts) {
      const count = parseInt(row.count, 10);
      byStatus[row.status as TaskStatus] = count;
      total += count;
    }

    // Overdue count (dueDate < NOW() AND status NOT IN done/cancelled)
    const overdueResult = await this.taskRepository
      .createQueryBuilder('task')
      .select('COUNT(*)', 'count')
      .where('task.companyId = :companyId', { companyId })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('task.dueDate < NOW()')
      .andWhere('task.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
      })
      .getRawOne();

    // Due soon count (dueDate BETWEEN NOW() AND NOW() + 7 days)
    const dueSoonResult = await this.taskRepository
      .createQueryBuilder('task')
      .select('COUNT(*)', 'count')
      .where('task.companyId = :companyId', { companyId })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('task.dueDate >= NOW()')
      .andWhere("task.dueDate <= NOW() + INTERVAL '7 days'")
      .andWhere('task.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
      })
      .getRawOne();

    // Unassigned count (active, not done/cancelled, no assignee)
    const unassignedResult = await this.taskRepository
      .createQueryBuilder('task')
      .select('COUNT(*)', 'count')
      .where('task.companyId = :companyId', { companyId })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('task.assigneeId IS NULL')
      .andWhere('task.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
      })
      .getRawOne();

    return {
      byStatus,
      total,
      overdue: parseInt(overdueResult?.count || '0', 10),
      dueSoon: parseInt(dueSoonResult?.count || '0', 10),
      unassigned: parseInt(unassignedResult?.count || '0', 10),
    };
  }
}
