import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Client, User, UserRole } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { TasksLookupService } from './tasks-lookup.service';

describe('TasksLookupService', () => {
  let service: TasksLookupService;
  let userRepository: jest.Mocked<Repository<User>>;
  let clientRepository: jest.Mocked<Repository<Client>>;
  let _systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getCompanyIdForUser'>>;

  const companyId = 'company-1';
  const mockUser = { id: 'user-1', companyId, role: UserRole.EMPLOYEE } as User;
  const mockAdminUser = { id: 'admin-1', companyId: null, role: UserRole.ADMIN } as unknown as User;

  beforeEach(async () => {
    jest.clearAllMocks();

    userRepository = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Repository<User>>;

    clientRepository = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Repository<Client>>;

    _systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: TasksLookupService,
          useFactory: () =>
            new TasksLookupService(
              userRepository as any,
              clientRepository as any,
              _systemCompanyService as any
            ),
        },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Client), useValue: clientRepository },
        { provide: SystemCompanyService, useValue: _systemCompanyService },
      ],
    }).compile();

    service = module.get(TasksLookupService);
  });

  describe('getAssignees', () => {
    it('should return company users for EMPLOYEE/COMPANY_OWNER role', async () => {
      const users = [
        { id: 'u-1', firstName: 'Jan', lastName: 'Kowalski', email: 'jan@test.pl' },
        { id: 'u-2', firstName: 'Anna', lastName: 'Nowak', email: 'anna@test.pl' },
      ] as User[];

      userRepository.find.mockResolvedValue(users);

      const result = await service.getAssignees(mockUser);

      expect(result).toEqual([
        { id: 'u-1', firstName: 'Jan', lastName: 'Kowalski', email: 'jan@test.pl' },
        { id: 'u-2', firstName: 'Anna', lastName: 'Nowak', email: 'anna@test.pl' },
      ]);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { companyId, isActive: true },
        select: ['id', 'firstName', 'lastName', 'email'],
        order: { firstName: 'ASC', lastName: 'ASC' },
      });
    });

    it('should return users from system company when user is ADMIN', async () => {
      const systemCompanyUsers = [
        { id: 'a-1', firstName: 'Super', lastName: 'Admin', email: 'admin@test.pl' },
      ] as User[];

      userRepository.find.mockResolvedValue(systemCompanyUsers);

      const result = await service.getAssignees(mockAdminUser);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'a-1',
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@test.pl',
      });
      expect(_systemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockAdminUser);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { companyId, isActive: true },
        select: ['id', 'firstName', 'lastName', 'email'],
        order: { firstName: 'ASC', lastName: 'ASC' },
      });
    });

    it('should return empty array when systemCompanyService returns null', async () => {
      const userWithoutCompany = {
        id: 'user-orphan',
        companyId: null,
        role: UserRole.EMPLOYEE,
      } as unknown as User;

      _systemCompanyService.getCompanyIdForUser.mockResolvedValue(null);

      const result = await service.getAssignees(userWithoutCompany);

      expect(result).toEqual([]);
      expect(userRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('getClients', () => {
    it('should return active clients sorted by name', async () => {
      const clients = [
        { id: 'c-1', name: 'Alfa Sp. z o.o.' },
        { id: 'c-2', name: 'Beta S.A.' },
      ] as Client[];

      clientRepository.find.mockResolvedValue(clients);

      const result = await service.getClients(mockUser);

      expect(result).toEqual([
        { id: 'c-1', name: 'Alfa Sp. z o.o.' },
        { id: 'c-2', name: 'Beta S.A.' },
      ]);
      expect(clientRepository.find).toHaveBeenCalledWith({
        where: { companyId, isActive: true },
        select: ['id', 'name'],
        order: { name: 'ASC' },
      });
    });

    it('should use systemCompanyService to get effective companyId', async () => {
      clientRepository.find.mockResolvedValue([]);

      await service.getClients(mockUser);

      expect(_systemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
    });

    it('should return empty array when no clients exist', async () => {
      clientRepository.find.mockResolvedValue([]);

      const result = await service.getClients(mockUser);

      expect(result).toEqual([]);
    });
  });
});
