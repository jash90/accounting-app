import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataSource, type Repository } from 'typeorm';

import { Client, Lead, LeadStatus, type User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { LeadsService } from './leads.service';
import {
  LeadAlreadyConvertedException,
  LeadHasOffersException,
  LeadNotFoundException,
} from '../exceptions/offer.exception';

function createMockQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  const chainable = [
    'createQueryBuilder',
    'leftJoinAndSelect',
    'where',
    'andWhere',
    'orderBy',
    'skip',
    'take',
    'select',
    'addSelect',
    'groupBy',
  ];
  chainable.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb['getManyAndCount'] = jest.fn().mockResolvedValue([[], 0]);
  qb['getRawMany'] = jest.fn().mockResolvedValue([]);
  return qb;
}

describe('LeadsService', () => {
  let service: LeadsService;
  let leadRepository: jest.Mocked<Repository<Lead>>;
  let clientRepository: jest.Mocked<Repository<Client>>;
  let systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getCompanyIdForUser'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;

  const companyId = 'company-1';
  const mockUser = { id: 'user-1', companyId, role: 'EMPLOYEE' } as User;

  let mockQb: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockQb = createMockQueryBuilder();

    leadRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<Lead>>;

    clientRepository = {} as unknown as jest.Mocked<Repository<Client>>;

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((cb: (manager: unknown) => unknown) => {
        const manager = {
          create: jest.fn().mockReturnValue({ id: 'new-client-1' }),
          save: jest.fn().mockImplementation((_entity: unknown, data: unknown) =>
            Promise.resolve({ ...(data as object), id: 'saved-id' })
          ),
        };
        return cb(manager);
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: LeadsService,
          useFactory: () =>
            new LeadsService(
              leadRepository as any,
              clientRepository as any,
              systemCompanyService as any,
              dataSource as any
            ),
        },
        { provide: getRepositoryToken(Lead), useValue: leadRepository },
        { provide: getRepositoryToken(Client), useValue: clientRepository },
        { provide: SystemCompanyService, useValue: systemCompanyService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(LeadsService);
  });

  describe('findAll', () => {
    it('should return paginated leads scoped to company', async () => {
      const leads = [{ id: 'lead-1', name: 'Firma A' }] as Lead[];
      mockQb['getManyAndCount'].mockResolvedValue([leads, 1]);

      const result = await service.findAll(mockUser, { page: 1, limit: 10 } as any);

      expect(systemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
      expect(mockQb['where']).toHaveBeenCalledWith('lead.companyId = :companyId', { companyId });
      expect(result.data).toEqual(leads);
      expect(result.meta.total).toBe(1);
    });

    it('should apply search filter across name, email, nip, contactPerson', async () => {
      mockQb['getManyAndCount'].mockResolvedValue([[], 0]);

      await service.findAll(mockUser, { page: 1, limit: 10, search: 'test' } as any);

      expect(mockQb['andWhere']).toHaveBeenCalled();
    });

    it('should apply status filter', async () => {
      mockQb['getManyAndCount'].mockResolvedValue([[], 0]);

      await service.findAll(mockUser, {
        page: 1,
        limit: 10,
        status: LeadStatus.NEW,
      } as any);

      expect(mockQb['andWhere']).toHaveBeenCalledWith('lead.status = :status', {
        status: LeadStatus.NEW,
      });
    });

    it('should apply assignedToId filter', async () => {
      mockQb['getManyAndCount'].mockResolvedValue([[], 0]);

      await service.findAll(mockUser, {
        page: 1,
        limit: 10,
        assignedToId: 'user-2',
      } as any);

      expect(mockQb['andWhere']).toHaveBeenCalledWith('lead.assignedToId = :assignedToId', {
        assignedToId: 'user-2',
      });
    });

    it('should apply date range filters', async () => {
      mockQb['getManyAndCount'].mockResolvedValue([[], 0]);
      const from = '2026-01-01';
      const to = '2026-12-31';

      await service.findAll(mockUser, {
        page: 1,
        limit: 10,
        createdFrom: from,
        createdTo: to,
      } as any);

      expect(mockQb['andWhere']).toHaveBeenCalledWith('lead.createdAt >= :createdFrom', {
        createdFrom: from,
      });
      expect(mockQb['andWhere']).toHaveBeenCalledWith('lead.createdAt <= :createdTo', {
        createdTo: to,
      });
    });
  });

  describe('findOne', () => {
    it('should return lead when found', async () => {
      const lead = { id: 'lead-1', companyId } as Lead;
      leadRepository.findOne.mockResolvedValue(lead);

      const result = await service.findOne('lead-1', mockUser);

      expect(result).toEqual(lead);
      expect(leadRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'lead-1', companyId },
        relations: ['assignedTo', 'createdBy', 'updatedBy'],
      });
    });

    it('should throw LeadNotFoundException when not found', async () => {
      leadRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('bad-id', mockUser)).rejects.toThrow(LeadNotFoundException);
    });
  });

  describe('create', () => {
    it('should create lead with NEW status and correct companyId', async () => {
      const dto = { name: 'New Lead', email: 'test@test.pl' } as any;
      const created = { id: 'lead-new', ...dto, companyId, status: LeadStatus.NEW } as Lead;
      leadRepository.create.mockReturnValue(created);
      leadRepository.save.mockResolvedValue(created);

      const result = await service.create(dto, mockUser);

      expect(leadRepository.create).toHaveBeenCalledWith({
        ...dto,
        companyId,
        createdById: mockUser.id,
        status: LeadStatus.NEW,
      });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update lead fields', async () => {
      const lead = { id: 'lead-1', companyId, name: 'Old Name' } as Lead;
      leadRepository.findOne.mockResolvedValue(lead);
      leadRepository.save.mockImplementation((l) => Promise.resolve(l as Lead));

      const result = await service.update('lead-1', { name: 'New Name' } as any, mockUser);

      expect(result.name).toBe('New Name');
      expect(result.updatedById).toBe(mockUser.id);
    });

    it('should throw LeadAlreadyConvertedException when lead is already converted', async () => {
      const lead = { id: 'lead-1', companyId, convertedToClientId: 'client-1' } as Lead;
      leadRepository.findOne.mockResolvedValue(lead);

      await expect(service.update('lead-1', { name: 'X' } as any, mockUser)).rejects.toThrow(
        LeadAlreadyConvertedException
      );
    });
  });

  describe('remove', () => {
    it('should remove lead successfully', async () => {
      const lead = { id: 'lead-1', companyId } as Lead;
      leadRepository.findOne.mockResolvedValue(lead);
      leadRepository.remove.mockResolvedValue(lead);

      await service.remove('lead-1', mockUser);

      expect(leadRepository.remove).toHaveBeenCalledWith(lead);
    });

    it('should throw LeadHasOffersException on foreign key violation', async () => {
      const lead = { id: 'lead-1', companyId } as Lead;
      leadRepository.findOne.mockResolvedValue(lead);

      const fkError = new Error('FK violation');
      (fkError as any).code = '23503'; // PostgreSQL FK violation code
      leadRepository.remove.mockRejectedValue(fkError);

      await expect(service.remove('lead-1', mockUser)).rejects.toThrow(LeadHasOffersException);
    });
  });

  describe('convertToClient', () => {
    it('should create client from lead data and mark lead as CONVERTED', async () => {
      const lead = {
        id: 'lead-1',
        companyId,
        name: 'Lead Company',
        nip: '1234567890',
        email: 'lead@test.pl',
        phone: '123456789',
        convertedToClientId: null,
      } as unknown as Lead;
      leadRepository.findOne.mockResolvedValue(lead);

      const result = await service.convertToClient('lead-1', {}, mockUser);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw LeadAlreadyConvertedException if lead was already converted', async () => {
      const lead = {
        id: 'lead-1',
        companyId,
        convertedToClientId: 'existing-client',
      } as Lead;
      leadRepository.findOne.mockResolvedValue(lead);

      await expect(service.convertToClient('lead-1', {}, mockUser)).rejects.toThrow(
        LeadAlreadyConvertedException
      );
    });
  });

  describe('getStatistics', () => {
    it('should return status counts and conversion rate', async () => {
      mockQb['getRawMany'].mockResolvedValue([
        { status: LeadStatus.NEW, count: '5' },
        { status: LeadStatus.CONVERTED, count: '3' },
        { status: LeadStatus.LOST, count: '2' },
      ]);

      const result = await service.getStatistics(mockUser);

      expect(result.totalLeads).toBe(10);
      expect(result.newCount).toBe(5);
      expect(result.convertedCount).toBe(3);
      expect(result.lostCount).toBe(2);
      // conversionRate = 3 / (3+2) * 100 = 60
      expect(result.conversionRate).toBe(60);
    });

    it('should return 0 conversion rate when no finished leads', async () => {
      mockQb['getRawMany'].mockResolvedValue([{ status: LeadStatus.NEW, count: '3' }]);

      const result = await service.getStatistics(mockUser);

      expect(result.conversionRate).toBe(0);
      expect(result.totalLeads).toBe(3);
    });
  });
});
