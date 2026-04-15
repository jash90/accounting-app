import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Client, ClientReliefPeriod, ReliefType, User, UserRole } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { ClientNotFoundException } from '../exceptions';
import { ReliefPeriodService } from './relief-period.service';

describe('ReliefPeriodService', () => {
  let service: ReliefPeriodService;
  let _reliefRepository: jest.Mocked<Repository<ClientReliefPeriod>>;
  let _clientRepository: jest.Mocked<Repository<Client>>;
  let _userRepository: jest.Mocked<Repository<User>>;

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';
  const mockClientId = 'client-123';
  const mockReliefId = 'relief-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockClient: Partial<Client> = {
    id: mockClientId,
    name: 'Test Client',
    companyId: mockCompanyId,
    isActive: true,
  };

  const mockRelief: Partial<ClientReliefPeriod> = {
    id: mockReliefId,
    clientId: mockClientId,
    companyId: mockCompanyId,
    reliefType: ReliefType.ULGA_NA_START,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-07-01'),
    isActive: true,
    createdById: mockUserId,
    endDate7DayReminderSent: false,
    endDate1DayReminderSent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSystemCompanyService = {
    getCompanyIdForUser: jest.fn(),
  };

  const mockReliefRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  const mockClientRepository = {
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(mockCompanyId);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ReliefPeriodService,
          useFactory: () =>
            new ReliefPeriodService(
              mockReliefRepository as any,
              mockClientRepository as any,
              mockUserRepository as any,
              mockSystemCompanyService as any
            ),
        },
        {
          provide: getRepositoryToken(ClientReliefPeriod),
          useValue: mockReliefRepository,
        },
        {
          provide: getRepositoryToken(Client),
          useValue: mockClientRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: SystemCompanyService,
          useValue: mockSystemCompanyService,
        },
      ],
    }).compile();

    service = module.get<ReliefPeriodService>(ReliefPeriodService);
    _reliefRepository = module.get(getRepositoryToken(ClientReliefPeriod));
    _clientRepository = module.get(getRepositoryToken(Client));
    _userRepository = module.get(getRepositoryToken(User));
  });

  describe('calculateEndDate', () => {
    it('should calculate end date for ULGA_NA_START (6 months)', () => {
      const startDate = new Date('2026-01-15');
      const result = service.calculateEndDate(startDate, ReliefType.ULGA_NA_START);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(6); // July (0-indexed)
      expect(result.getDate()).toBe(15);
    });

    it('should calculate end date for MALY_ZUS (36 months)', () => {
      const startDate = new Date('2026-01-01');
      const result = service.calculateEndDate(startDate, ReliefType.MALY_ZUS);
      expect(result.getFullYear()).toBe(2029);
      expect(result.getMonth()).toBe(0); // January
    });
  });

  describe('create', () => {
    it('should create a relief period with auto-calculated end date', async () => {
      mockClientRepository.findOne.mockResolvedValue(mockClient);
      mockReliefRepository.findOne.mockResolvedValue(null); // no overlap
      mockReliefRepository.create.mockReturnValue(mockRelief);
      mockReliefRepository.save.mockResolvedValue(mockRelief);

      const result = await service.create(
        mockClientId,
        { reliefType: ReliefType.ULGA_NA_START, startDate: '2026-01-01' },
        mockUser as User
      );

      expect(result.id).toBe(mockReliefId);
      expect(result.clientName).toBe('Test Client');
      expect(mockReliefRepository.create).toHaveBeenCalled();
      expect(mockReliefRepository.save).toHaveBeenCalled();
    });

    it('should create a relief period with custom end date', async () => {
      mockClientRepository.findOne.mockResolvedValue(mockClient);
      mockReliefRepository.findOne.mockResolvedValue(null);
      mockReliefRepository.create.mockReturnValue(mockRelief);
      mockReliefRepository.save.mockResolvedValue(mockRelief);

      const result = await service.create(
        mockClientId,
        {
          reliefType: ReliefType.ULGA_NA_START,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
        mockUser as User
      );

      expect(result.id).toBe(mockReliefId);
    });

    it('should throw ClientNotFoundException when client does not exist', async () => {
      mockClientRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          mockClientId,
          { reliefType: ReliefType.ULGA_NA_START, startDate: '2026-01-01' },
          mockUser as User
        )
      ).rejects.toThrow(ClientNotFoundException);
    });

    it('should throw BadRequestException when endDate is before startDate', async () => {
      mockClientRepository.findOne.mockResolvedValue(mockClient);

      await expect(
        service.create(
          mockClientId,
          {
            reliefType: ReliefType.ULGA_NA_START,
            startDate: '2026-06-01',
            endDate: '2026-01-01',
          },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when overlapping relief exists', async () => {
      mockClientRepository.findOne.mockResolvedValue(mockClient);
      mockReliefRepository.findOne.mockResolvedValue(mockRelief); // overlap found

      await expect(
        service.create(
          mockClientId,
          { reliefType: ReliefType.ULGA_NA_START, startDate: '2026-03-01' },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update an existing relief period', async () => {
      const reliefWithClient = {
        ...mockRelief,
        client: mockClient,
      };
      mockReliefRepository.findOne.mockResolvedValue(reliefWithClient);
      mockReliefRepository.save.mockResolvedValue(reliefWithClient);

      const result = await service.update(
        mockClientId,
        mockReliefId,
        { isActive: false },
        mockUser as User
      );

      expect(result.id).toBe(mockReliefId);
      expect(mockReliefRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when relief does not exist', async () => {
      mockReliefRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockClientId, mockReliefId, { isActive: false }, mockUser as User)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when endDate is in the past', async () => {
      const reliefWithClient = {
        ...mockRelief,
        client: mockClient,
      };
      mockReliefRepository.findOne.mockResolvedValue(reliefWithClient);

      await expect(
        service.update(mockClientId, mockReliefId, { endDate: '2020-01-01' }, mockUser as User)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reset reminder flags when endDate is changed', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const reliefWithClient = {
        ...mockRelief,
        client: mockClient,
        endDate7DayReminderSent: true,
        endDate1DayReminderSent: true,
      };
      mockReliefRepository.findOne.mockResolvedValue(reliefWithClient);
      mockReliefRepository.save.mockImplementation((entity: any) => Promise.resolve(entity));

      await service.update(
        mockClientId,
        mockReliefId,
        { endDate: futureDate.toISOString().split('T')[0] },
        mockUser as User
      );

      const savedEntity = mockReliefRepository.save.mock.calls[0][0] as any;
      expect(savedEntity.endDate7DayReminderSent).toBe(false);
      expect(savedEntity.endDate1DayReminderSent).toBe(false);
    });
  });

  describe('remove', () => {
    it('should delete a relief period', async () => {
      mockReliefRepository.findOne.mockResolvedValue(mockRelief);
      mockReliefRepository.remove.mockResolvedValue(mockRelief);

      await service.remove(mockClientId, mockReliefId, mockUser as User);

      expect(mockReliefRepository.remove).toHaveBeenCalledWith(mockRelief);
    });

    it('should throw NotFoundException when relief does not exist', async () => {
      mockReliefRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockClientId, mockReliefId, mockUser as User)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findAll', () => {
    it('should return all relief periods for a client', async () => {
      mockClientRepository.findOne.mockResolvedValue(mockClient);
      mockReliefRepository.find.mockResolvedValue([mockRelief as ClientReliefPeriod]);

      const result = await service.findAll(mockClientId, mockUser as User);

      expect(result).toHaveLength(1);
      expect(result[0].clientId).toBe(mockClientId);
    });

    it('should throw ClientNotFoundException when client does not exist', async () => {
      mockClientRepository.findOne.mockResolvedValue(null);

      await expect(service.findAll(mockClientId, mockUser as User)).rejects.toThrow(
        ClientNotFoundException
      );
    });
  });

  describe('findOne', () => {
    it('should return a specific relief period', async () => {
      const reliefWithRelations = {
        ...mockRelief,
        client: mockClient,
        createdBy: { firstName: 'Jan', lastName: 'Kowalski' },
      };
      mockReliefRepository.findOne.mockResolvedValue(reliefWithRelations);

      const result = await service.findOne(mockClientId, mockReliefId, mockUser as User);

      expect(result.id).toBe(mockReliefId);
      expect(result.createdByName).toBe('Jan Kowalski');
    });

    it('should throw NotFoundException when relief does not exist', async () => {
      mockReliefRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockClientId, mockReliefId, mockUser as User)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getActiveReliefByType', () => {
    it('should return active relief for given type', async () => {
      mockReliefRepository.findOne.mockResolvedValue(mockRelief);

      const result = await service.getActiveReliefByType(
        mockClientId,
        mockCompanyId,
        ReliefType.ULGA_NA_START
      );

      expect(result).toEqual(mockRelief);
    });

    it('should return null when no active relief exists', async () => {
      mockReliefRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveReliefByType(
        mockClientId,
        mockCompanyId,
        ReliefType.MALY_ZUS
      );

      expect(result).toBeNull();
    });
  });

  describe('markReminderSent', () => {
    it('should mark 7-day reminder as sent', async () => {
      mockReliefRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.markReminderSent(mockReliefId, 'endDate7DayReminderSent');

      expect(mockReliefRepository.update).toHaveBeenCalledWith(mockReliefId, {
        endDate7DayReminderSent: true,
      });
    });

    it('should mark 1-day reminder as sent', async () => {
      mockReliefRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.markReminderSent(mockReliefId, 'endDate1DayReminderSent');

      expect(mockReliefRepository.update).toHaveBeenCalledWith(mockReliefId, {
        endDate1DayReminderSent: true,
      });
    });
  });

  describe('getCompanyEmployees', () => {
    it('should return active non-admin employees', async () => {
      const employees = [{ id: 'emp-1' }, { id: 'emp-2' }] as User[];
      mockUserRepository.find.mockResolvedValue(employees);

      const result = await service.getCompanyEmployees(mockCompanyId);

      expect(result).toEqual(employees);
      expect(mockUserRepository.find).toHaveBeenCalled();
    });
  });

  describe('getCompanyOwners', () => {
    it('should return active company owners', async () => {
      const owners = [{ id: 'owner-1' }] as User[];
      mockUserRepository.find.mockResolvedValue(owners);

      const result = await service.getCompanyOwners(mockCompanyId);

      expect(result).toEqual(owners);
    });
  });
});
