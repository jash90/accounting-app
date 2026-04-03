import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { generateCsvBuffer, Task, User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { TaskFiltersDto } from '../dto/task.dto';

@Injectable()
export class TaskExportService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async exportToCsv(filters: TaskFiltersDto, user: User): Promise<Buffer> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.client', 'client')
      .where('task.companyId = :companyId', { companyId })
      .andWhere('task.isActive = true');

    if (filters?.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters?.assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', { assigneeId: filters.assigneeId });
    }

    if (filters?.clientId) {
      queryBuilder.andWhere('task.clientId = :clientId', { clientId: filters.clientId });
    }

    queryBuilder.orderBy('task.createdAt', 'DESC');

    const tasks = await queryBuilder.getMany();
    return this.generateCsv(tasks);
  }

  private generateCsv(tasks: Task[]): Buffer {
    const headers = [
      'Tytuł',
      'Opis',
      'Status',
      'Priorytet',
      'Termin',
      'Przypisany do',
      'Klient',
      'Data utworzenia',
    ];

    const rows = tasks.map((task) => [
      task.title,
      task.description || '',
      task.status,
      task.priority,
      task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : '',
      task.client?.name || '',
      new Date(task.createdAt).toISOString().split('T')[0],
    ]);

    return generateCsvBuffer(headers, rows);
  }
}
