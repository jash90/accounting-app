import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Task, type User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { TaskExportService } from './task-export.service';

function createMockQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  const chainable = ['createQueryBuilder', 'leftJoinAndSelect', 'where', 'andWhere', 'orderBy'];
  chainable.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb['getMany'] = jest.fn().mockResolvedValue([]);
  return qb;
}

describe('TaskExportService', () => {
  let service: TaskExportService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getCompanyIdForUser'>>;

  const companyId = 'company-1';
  const mockUser = { id: 'user-1', companyId, role: 'EMPLOYEE' } as User;

  let mockQb: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockQb = createMockQueryBuilder();

    taskRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    } as unknown as jest.Mocked<Repository<Task>>;

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: TaskExportService,
          useFactory: () =>
            new TaskExportService(taskRepository as any, systemCompanyService as any),
        },
        { provide: getRepositoryToken(Task), useValue: taskRepository },
        { provide: SystemCompanyService, useValue: systemCompanyService },
      ],
    }).compile();

    service = module.get(TaskExportService);
  });

  describe('exportToCsv', () => {
    it('should return a Buffer with correct CSV headers', async () => {
      mockQb['getMany'].mockResolvedValue([]);

      const result = await service.exportToCsv({}, mockUser);

      expect(result).toBeInstanceOf(Buffer);
      const content = result.toString('utf-8');
      expect(content).toContain('Tytuł');
      expect(content).toContain('Opis');
      expect(content).toContain('Status');
      expect(content).toContain('Priorytet');
      expect(content).toContain('Termin');
      expect(content).toContain('Przypisany do');
      expect(content).toContain('Klient');
      expect(content).toContain('Data utworzenia');
    });

    it('should include task data in CSV output', async () => {
      const tasks = [
        {
          title: 'Test Task',
          description: 'A description',
          status: 'TODO',
          priority: 'HIGH',
          dueDate: new Date('2026-03-15'),
          assignee: { firstName: 'Jan', lastName: 'Kowalski' },
          client: { name: 'Firma ABC' },
          createdAt: new Date('2026-03-01'),
        },
      ] as unknown as Task[];

      mockQb['getMany'].mockResolvedValue(tasks);

      const result = await service.exportToCsv({}, mockUser);
      const content = result.toString('utf-8');

      expect(content).toContain('Test Task');
      expect(content).toContain('A description');
      expect(content).toContain('TODO');
      expect(content).toContain('HIGH');
      expect(content).toContain('Jan Kowalski');
      expect(content).toContain('Firma ABC');
    });

    it('should apply status filter when provided', async () => {
      mockQb['getMany'].mockResolvedValue([]);

      await service.exportToCsv({ status: 'TODO' } as any, mockUser);

      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.status = :status', {
        status: 'TODO',
      });
    });

    it('should apply priority, assigneeId, and clientId filters', async () => {
      mockQb['getMany'].mockResolvedValue([]);

      await service.exportToCsv(
        { priority: 'HIGH', assigneeId: 'user-2', clientId: 'client-1' } as any,
        mockUser
      );

      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.priority = :priority', {
        priority: 'HIGH',
      });
      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.assigneeId = :assigneeId', {
        assigneeId: 'user-2',
      });
      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.clientId = :clientId', {
        clientId: 'client-1',
      });
    });

    it('should format dates as YYYY-MM-DD', async () => {
      const tasks = [
        {
          title: 'Dated Task',
          description: '',
          status: 'TODO',
          priority: 'MEDIUM',
          dueDate: new Date('2026-06-15T14:30:00Z'),
          assignee: null,
          client: null,
          createdAt: new Date('2026-03-01T10:00:00Z'),
        },
      ] as unknown as Task[];

      mockQb['getMany'].mockResolvedValue(tasks);

      const result = await service.exportToCsv({}, mockUser);
      const content = result.toString('utf-8');

      expect(content).toContain('2026-06-15');
      expect(content).toContain('2026-03-01');
    });

    it('should only query active tasks', async () => {
      mockQb['getMany'].mockResolvedValue([]);

      await service.exportToCsv({}, mockUser);

      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.isActive = true');
    });
  });
});
