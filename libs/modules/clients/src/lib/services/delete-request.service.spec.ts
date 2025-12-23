import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { HttpStatus } from '@nestjs/common';
import { DeleteRequestService } from './delete-request.service';
import { ClientsService } from './clients.service';
import { ClientChangelogService } from './client-changelog.service';
import {
  ClientDeleteRequest,
  Client,
  User,
  UserRole,
  DeleteRequestStatus,
  TenantService,
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
} from '@accounting/common';
import {
  ClientNotFoundException,
  DeleteRequestNotFoundException,
  DeleteRequestAlreadyProcessedException,
  ClientException,
  ClientErrorCode,
} from '../exceptions';

describe('DeleteRequestService', () => {
  let service: DeleteRequestService;
  let deleteRequestRepository: jest.Mocked<Repository<ClientDeleteRequest>>;
  let clientRepository: jest.Mocked<Repository<Client>>;
  let clientsService: jest.Mocked<ClientsService>;
  let clientChangelogService: jest.Mocked<ClientChangelogService>;
  let tenantService: jest.Mocked<TenantService>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let entityManager: jest.Mocked<EntityManager>;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-456';
  const mockUserId = 'user-789';
  const mockRequestId = 'request-abc';

  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: mockUserId,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.EMPLOYEE,
    companyId: mockCompanyId,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User);

  const createMockClient = (overrides: Partial<Client> = {}): Client => ({
    id: mockClientId,
    companyId: mockCompanyId,
    name: 'Test Client',
    nip: '1234567890',
    email: 'client@example.com',
    employmentType: EmploymentType.DG,
    vatStatus: VatStatus.VAT_MONTHLY,
    taxScheme: TaxScheme.GENERAL,
    zusStatus: ZusStatus.FULL,
    isActive: true,
    receiveEmailCopy: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Client);

  const createMockDeleteRequest = (overrides: Partial<ClientDeleteRequest> = {}): ClientDeleteRequest => ({
    id: mockRequestId,
    clientId: mockClientId,
    companyId: mockCompanyId,
    requestedById: mockUserId,
    reason: 'Test reason',
    status: DeleteRequestStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ClientDeleteRequest);

  beforeEach(async () => {
    // Create mock entity manager
    entityManager = {
      save: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    // Create mock query runner
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: entityManager,
    } as unknown as jest.Mocked<QueryRunner>;

    // Create mock data source
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as jest.Mocked<DataSource>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteRequestService,
        {
          provide: getRepositoryToken(ClientDeleteRequest),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Client),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ClientsService,
          useValue: {},
        },
        {
          provide: ClientChangelogService,
          useValue: {
            notifyClientDeleted: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: TenantService,
          useValue: {
            getEffectiveCompanyId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DeleteRequestService>(DeleteRequestService);
    deleteRequestRepository = module.get(getRepositoryToken(ClientDeleteRequest));
    clientRepository = module.get(getRepositoryToken(Client));
    clientsService = module.get(ClientsService);
    clientChangelogService = module.get(ClientChangelogService);
    tenantService = module.get(TenantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDeleteRequest', () => {
    it('should create a delete request successfully', async () => {
      const user = createMockUser();
      const client = createMockClient();
      const dto = { reason: 'Client requested account deletion' };

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      clientRepository.findOne.mockResolvedValue(client);
      deleteRequestRepository.findOne.mockResolvedValue(null);

      const createdRequest = createMockDeleteRequest(dto);
      deleteRequestRepository.create.mockReturnValue(createdRequest);
      deleteRequestRepository.save.mockResolvedValue(createdRequest);

      const result = await service.createDeleteRequest(mockClientId, dto, user);

      expect(result).toEqual(createdRequest);
      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(user);
      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockClientId, companyId: mockCompanyId, isActive: true },
      });
      expect(deleteRequestRepository.create).toHaveBeenCalledWith({
        clientId: mockClientId,
        companyId: mockCompanyId,
        requestedById: user.id,
        reason: dto.reason,
        status: DeleteRequestStatus.PENDING,
      });
    });

    it('should throw ClientNotFoundException when client does not exist', async () => {
      const user = createMockUser();
      const dto = { reason: 'Test' };

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.createDeleteRequest(mockClientId, dto, user))
        .rejects.toThrow(ClientNotFoundException);
    });

    it('should throw ClientNotFoundException when client is not active', async () => {
      const user = createMockUser();
      const dto = { reason: 'Test' };

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      // findOne returns null because isActive: true filter doesn't match
      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.createDeleteRequest(mockClientId, dto, user))
        .rejects.toThrow(ClientNotFoundException);
    });

    it('should throw DeleteRequestAlreadyProcessedException when pending request exists', async () => {
      const user = createMockUser();
      const client = createMockClient();
      const dto = { reason: 'Test' };
      const existingRequest = createMockDeleteRequest();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      clientRepository.findOne.mockResolvedValue(client);
      deleteRequestRepository.findOne.mockResolvedValue(existingRequest);

      await expect(service.createDeleteRequest(mockClientId, dto, user))
        .rejects.toThrow(DeleteRequestAlreadyProcessedException);
    });

    it('should create request without reason when not provided', async () => {
      const user = createMockUser();
      const client = createMockClient();
      const dto = {};

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      clientRepository.findOne.mockResolvedValue(client);
      deleteRequestRepository.findOne.mockResolvedValue(null);

      const createdRequest = createMockDeleteRequest({ reason: undefined });
      deleteRequestRepository.create.mockReturnValue(createdRequest);
      deleteRequestRepository.save.mockResolvedValue(createdRequest);

      await service.createDeleteRequest(mockClientId, dto, user);

      expect(deleteRequestRepository.create).toHaveBeenCalledWith({
        clientId: mockClientId,
        companyId: mockCompanyId,
        requestedById: user.id,
        reason: undefined,
        status: DeleteRequestStatus.PENDING,
      });
    });

    it('should enforce tenant isolation via companyId', async () => {
      const user = createMockUser({ companyId: 'different-company' });
      const dto = { reason: 'Test' };

      tenantService.getEffectiveCompanyId.mockResolvedValue('different-company');
      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.createDeleteRequest(mockClientId, dto, user))
        .rejects.toThrow(ClientNotFoundException);

      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockClientId, companyId: 'different-company', isActive: true },
      });
    });
  });

  describe('findAllPendingRequests', () => {
    it('should return pending requests for company', async () => {
      const user = createMockUser();
      const requests = [
        createMockDeleteRequest({ id: 'req-1' }),
        createMockDeleteRequest({ id: 'req-2' }),
      ];

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.find.mockResolvedValue(requests);

      const result = await service.findAllPendingRequests(user);

      expect(result).toEqual(requests);
      expect(deleteRequestRepository.find).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          status: DeleteRequestStatus.PENDING,
        },
        relations: ['client', 'requestedBy'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no pending requests', async () => {
      const user = createMockUser();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.find.mockResolvedValue([]);

      const result = await service.findAllPendingRequests(user);

      expect(result).toEqual([]);
    });
  });

  describe('findAllRequests', () => {
    it('should return all requests without status filter', async () => {
      const user = createMockUser();
      const requests = [
        createMockDeleteRequest({ status: DeleteRequestStatus.PENDING }),
        createMockDeleteRequest({ status: DeleteRequestStatus.APPROVED }),
        createMockDeleteRequest({ status: DeleteRequestStatus.REJECTED }),
      ];

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.find.mockResolvedValue(requests);

      const result = await service.findAllRequests(user);

      expect(result).toEqual(requests);
      expect(deleteRequestRepository.find).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        relations: ['client', 'requestedBy', 'processedBy'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter by status when provided', async () => {
      const user = createMockUser();
      const approvedRequests = [
        createMockDeleteRequest({ status: DeleteRequestStatus.APPROVED }),
      ];

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.find.mockResolvedValue(approvedRequests);

      const result = await service.findAllRequests(user, DeleteRequestStatus.APPROVED);

      expect(result).toEqual(approvedRequests);
      expect(deleteRequestRepository.find).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, status: DeleteRequestStatus.APPROVED },
        relations: ['client', 'requestedBy', 'processedBy'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findRequestById', () => {
    it('should return request when found', async () => {
      const user = createMockUser();
      const request = createMockDeleteRequest();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);

      const result = await service.findRequestById(mockRequestId, user);

      expect(result).toEqual(request);
      expect(deleteRequestRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRequestId, companyId: mockCompanyId },
        relations: ['client', 'requestedBy', 'processedBy'],
      });
    });

    it('should throw DeleteRequestNotFoundException when not found', async () => {
      const user = createMockUser();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.findRequestById(mockRequestId, user))
        .rejects.toThrow(DeleteRequestNotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      const user = createMockUser();

      tenantService.getEffectiveCompanyId.mockResolvedValue('different-company');
      deleteRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.findRequestById(mockRequestId, user))
        .rejects.toThrow(DeleteRequestNotFoundException);

      expect(deleteRequestRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRequestId, companyId: 'different-company' },
        relations: ['client', 'requestedBy', 'processedBy'],
      });
    });
  });

  describe('approveRequest', () => {
    it('should approve request and soft delete client for COMPANY_OWNER', async () => {
      const user = createMockUser({ role: UserRole.COMPANY_OWNER });
      const request = createMockDeleteRequest();
      const client = createMockClient();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);
      clientRepository.findOne.mockResolvedValue(client);
      clientChangelogService.notifyClientDeleted.mockResolvedValue(undefined);

      const result = await service.approveRequest(mockRequestId, user);

      expect(result.message).toBe('Delete request approved and client deleted');
      expect(result.deletedClient).toBeDefined();
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(entityManager.save).toHaveBeenCalledTimes(2); // client + request
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should approve request for ADMIN user', async () => {
      const user = createMockUser({ role: UserRole.ADMIN });
      const request = createMockDeleteRequest();
      const client = createMockClient();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);
      clientRepository.findOne.mockResolvedValue(client);

      const result = await service.approveRequest(mockRequestId, user);

      expect(result.message).toBe('Delete request approved and client deleted');
    });

    it('should throw ClientException for EMPLOYEE users', async () => {
      const user = createMockUser({ role: UserRole.EMPLOYEE });

      try {
        await service.approveRequest(mockRequestId, user);
        fail('Expected ClientException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientException);
        expect((error as ClientException).errorCode).toBe(ClientErrorCode.PERMISSION_DENIED);
        expect((error as ClientException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      }
    });

    it('should throw DeleteRequestAlreadyProcessedException for non-pending request', async () => {
      const user = createMockUser({ role: UserRole.COMPANY_OWNER });
      const request = createMockDeleteRequest({ status: DeleteRequestStatus.APPROVED });

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);

      await expect(service.approveRequest(mockRequestId, user))
        .rejects.toThrow(DeleteRequestAlreadyProcessedException);
    });

    it('should throw ClientNotFoundException when client not found', async () => {
      const user = createMockUser({ role: UserRole.COMPANY_OWNER });
      const request = createMockDeleteRequest();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);
      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.approveRequest(mockRequestId, user))
        .rejects.toThrow(ClientNotFoundException);
    });

    it('should rollback transaction on error', async () => {
      const user = createMockUser({ role: UserRole.COMPANY_OWNER });
      const request = createMockDeleteRequest();
      const client = createMockClient();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);
      clientRepository.findOne.mockResolvedValue(client);
      entityManager.save.mockRejectedValue(new Error('Database error'));

      await expect(service.approveRequest(mockRequestId, user)).rejects.toThrow();

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should set correct fields on client and request during approval', async () => {
      const user = createMockUser({ role: UserRole.COMPANY_OWNER });
      const request = createMockDeleteRequest();
      const client = createMockClient();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);
      clientRepository.findOne.mockResolvedValue(client);

      await service.approveRequest(mockRequestId, user);

      // Check that client was soft deleted
      expect(entityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          updatedById: user.id,
        })
      );

      // Check that request was updated
      expect(entityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: DeleteRequestStatus.APPROVED,
          processedById: user.id,
          processedAt: expect.any(Date),
        })
      );
    });

    it('should continue even if notification fails', async () => {
      const user = createMockUser({ role: UserRole.COMPANY_OWNER });
      const request = createMockDeleteRequest();
      const client = createMockClient();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);
      clientRepository.findOne.mockResolvedValue(client);
      clientChangelogService.notifyClientDeleted.mockRejectedValue(new Error('Notification error'));

      // Should not throw even if notification fails
      const result = await service.approveRequest(mockRequestId, user);

      expect(result.message).toBe('Delete request approved and client deleted');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('rejectRequest', () => {
    it('should reject request for COMPANY_OWNER', async () => {
      const user = createMockUser({ role: UserRole.COMPANY_OWNER });
      const request = createMockDeleteRequest();
      const dto = { rejectionReason: 'Client is still active' };

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);
      deleteRequestRepository.save.mockResolvedValue({
        ...request,
        status: DeleteRequestStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
      });

      const result = await service.rejectRequest(mockRequestId, dto, user);

      expect(result.status).toBe(DeleteRequestStatus.REJECTED);
      expect(deleteRequestRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: DeleteRequestStatus.REJECTED,
          processedById: user.id,
          processedAt: expect.any(Date),
          rejectionReason: dto.rejectionReason,
        })
      );
    });

    it('should reject request for ADMIN', async () => {
      const user = createMockUser({ role: UserRole.ADMIN });
      const request = createMockDeleteRequest();
      const dto = { rejectionReason: 'Not authorized' };

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);
      deleteRequestRepository.save.mockResolvedValue({
        ...request,
        status: DeleteRequestStatus.REJECTED,
      });

      await service.rejectRequest(mockRequestId, dto, user);

      expect(deleteRequestRepository.save).toHaveBeenCalled();
    });

    it('should throw ClientException for EMPLOYEE users', async () => {
      const user = createMockUser({ role: UserRole.EMPLOYEE });
      const dto = { rejectionReason: 'Test' };

      try {
        await service.rejectRequest(mockRequestId, dto, user);
        fail('Expected ClientException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientException);
        expect((error as ClientException).errorCode).toBe(ClientErrorCode.PERMISSION_DENIED);
      }
    });

    it('should throw DeleteRequestAlreadyProcessedException for non-pending request', async () => {
      const user = createMockUser({ role: UserRole.COMPANY_OWNER });
      const request = createMockDeleteRequest({ status: DeleteRequestStatus.REJECTED });
      const dto = {};

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);

      await expect(service.rejectRequest(mockRequestId, dto, user))
        .rejects.toThrow(DeleteRequestAlreadyProcessedException);
    });

    it('should reject without reason when not provided', async () => {
      const user = createMockUser({ role: UserRole.COMPANY_OWNER });
      const request = createMockDeleteRequest();
      const dto = {};

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);
      deleteRequestRepository.save.mockResolvedValue(request);

      await service.rejectRequest(mockRequestId, dto, user);

      expect(deleteRequestRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          rejectionReason: undefined,
        })
      );
    });
  });

  describe('cancelRequest', () => {
    it('should allow requester to cancel their own request', async () => {
      const user = createMockUser();
      const request = createMockDeleteRequest({ requestedById: user.id });

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);

      await service.cancelRequest(mockRequestId, user);

      expect(deleteRequestRepository.remove).toHaveBeenCalledWith(request);
    });

    it('should allow COMPANY_OWNER to cancel any request', async () => {
      const owner = createMockUser({ id: 'owner-id', role: UserRole.COMPANY_OWNER });
      const request = createMockDeleteRequest({ requestedById: 'other-user-id' });

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);

      await service.cancelRequest(mockRequestId, owner);

      expect(deleteRequestRepository.remove).toHaveBeenCalledWith(request);
    });

    it('should allow ADMIN to cancel any request', async () => {
      const admin = createMockUser({ id: 'admin-id', role: UserRole.ADMIN });
      const request = createMockDeleteRequest({ requestedById: 'other-user-id' });

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);

      await service.cancelRequest(mockRequestId, admin);

      expect(deleteRequestRepository.remove).toHaveBeenCalledWith(request);
    });

    it('should throw ClientException when EMPLOYEE tries to cancel another user request', async () => {
      const user = createMockUser({ id: 'user-id', role: UserRole.EMPLOYEE });
      const request = createMockDeleteRequest({ requestedById: 'other-user-id' });

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);

      try {
        await service.cancelRequest(mockRequestId, user);
        fail('Expected ClientException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientException);
        expect((error as ClientException).errorCode).toBe(ClientErrorCode.PERMISSION_DENIED);
      }
    });

    it('should throw DeleteRequestAlreadyProcessedException for non-pending request', async () => {
      const user = createMockUser();
      const request = createMockDeleteRequest({
        requestedById: user.id,
        status: DeleteRequestStatus.APPROVED,
      });

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(request);

      await expect(service.cancelRequest(mockRequestId, user))
        .rejects.toThrow(DeleteRequestAlreadyProcessedException);
    });

    it('should throw DeleteRequestNotFoundException when request not found', async () => {
      const user = createMockUser();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelRequest(mockRequestId, user))
        .rejects.toThrow(DeleteRequestNotFoundException);
    });
  });

  describe('getMyRequests', () => {
    it('should return requests created by the user', async () => {
      const user = createMockUser();
      const requests = [
        createMockDeleteRequest({ id: 'req-1', requestedById: user.id }),
        createMockDeleteRequest({ id: 'req-2', requestedById: user.id }),
      ];

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.find.mockResolvedValue(requests);

      const result = await service.getMyRequests(user);

      expect(result).toEqual(requests);
      expect(deleteRequestRepository.find).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          requestedById: user.id,
        },
        relations: ['client', 'processedBy'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when user has no requests', async () => {
      const user = createMockUser();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.find.mockResolvedValue([]);

      const result = await service.getMyRequests(user);

      expect(result).toEqual([]);
    });
  });

  describe('tenant isolation', () => {
    it('should use TenantService for all operations', async () => {
      const user = createMockUser();
      const request = createMockDeleteRequest();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      deleteRequestRepository.find.mockResolvedValue([request]);
      deleteRequestRepository.findOne.mockResolvedValue(request);

      await service.findAllPendingRequests(user);
      await service.findAllRequests(user);
      await service.findRequestById(mockRequestId, user);
      await service.getMyRequests(user);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledTimes(4);
    });

    it('should prevent cross-company data access', async () => {
      const user = createMockUser({ companyId: 'company-A' });

      tenantService.getEffectiveCompanyId.mockResolvedValue('company-A');
      deleteRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.findRequestById(mockRequestId, user))
        .rejects.toThrow(DeleteRequestNotFoundException);
    });
  });

  describe('workflow transitions', () => {
    it('should only allow PENDING -> APPROVED transition', async () => {
      const user = createMockUser({ role: UserRole.COMPANY_OWNER });
      const client = createMockClient();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
      clientRepository.findOne.mockResolvedValue(client);

      // Test all non-pending statuses
      for (const status of [DeleteRequestStatus.APPROVED, DeleteRequestStatus.REJECTED]) {
        const request = createMockDeleteRequest({ status });
        deleteRequestRepository.findOne.mockResolvedValue(request);

        await expect(service.approveRequest(mockRequestId, user))
          .rejects.toThrow(DeleteRequestAlreadyProcessedException);
      }
    });

    it('should only allow PENDING -> REJECTED transition', async () => {
      const user = createMockUser({ role: UserRole.COMPANY_OWNER });

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

      for (const status of [DeleteRequestStatus.APPROVED, DeleteRequestStatus.REJECTED]) {
        const request = createMockDeleteRequest({ status });
        deleteRequestRepository.findOne.mockResolvedValue(request);

        await expect(service.rejectRequest(mockRequestId, {}, user))
          .rejects.toThrow(DeleteRequestAlreadyProcessedException);
      }
    });

    it('should only allow cancellation of PENDING requests', async () => {
      const user = createMockUser();

      tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

      for (const status of [DeleteRequestStatus.APPROVED, DeleteRequestStatus.REJECTED]) {
        const request = createMockDeleteRequest({ status, requestedById: user.id });
        deleteRequestRepository.findOne.mockResolvedValue(request);

        await expect(service.cancelRequest(mockRequestId, user))
          .rejects.toThrow(DeleteRequestAlreadyProcessedException);
      }
    });
  });
});
