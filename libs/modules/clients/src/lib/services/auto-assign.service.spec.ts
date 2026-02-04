import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataSource, type EntityManager, type QueryRunner, type Repository } from 'typeorm';

import {
  ClientIcon,
  ClientIconAssignment,
  EmploymentType,
  IconType,
  TaxScheme,
  VatStatus,
  ZusStatus,
  type AutoAssignCondition,
  type Client,
} from '@accounting/common';

import { ClientErrorCode, ClientException } from '../exceptions';
import { AutoAssignService } from './auto-assign.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';

describe('AutoAssignService', () => {
  let service: AutoAssignService;
  let iconRepository: jest.Mocked<Repository<ClientIcon>>;
  let assignmentRepository: jest.Mocked<Repository<ClientIconAssignment>>;
  let conditionEvaluator: jest.Mocked<ConditionEvaluatorService>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let entityManager: jest.Mocked<EntityManager>;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-456';
  const mockIconId = 'icon-789';

  const createMockClient = (overrides: Partial<Client> = {}): Client =>
    ({
      id: mockClientId,
      companyId: mockCompanyId,
      name: 'Test Client',
      nip: '1234567890',
      email: 'test@example.com',
      employmentType: EmploymentType.DG,
      vatStatus: VatStatus.VAT_MONTHLY,
      taxScheme: TaxScheme.GENERAL,
      zusStatus: ZusStatus.FULL,
      isActive: true,
      receiveEmailCopy: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Client;

  const createMockIcon = (overrides: Partial<ClientIcon> = {}): ClientIcon =>
    ({
      id: mockIconId,
      companyId: mockCompanyId,
      name: 'Test Icon',
      type: IconType.LUCIDE,
      value: 'star',
      color: '#FF0000',
      isActive: true,
      autoAssignCondition: {
        logicalOperator: 'and',
        conditions: [{ field: 'employmentType', operator: 'equals', value: EmploymentType.DG }],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as ClientIcon;

  const createMockAssignment = (
    overrides: Partial<ClientIconAssignment> = {}
  ): ClientIconAssignment =>
    ({
      id: 'assignment-001',
      clientId: mockClientId,
      iconId: mockIconId,
      isAutoAssigned: true,
      createdAt: new Date(),
      ...overrides,
    }) as ClientIconAssignment;

  beforeEach(async () => {
    // Create mock entity manager
    entityManager = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      getRepository: jest.fn(),
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

    // Create mock repositories
    const mockAssignmentManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      getRepository: jest.fn(),
    };

    iconRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<ClientIcon>>;

    assignmentRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      manager: mockAssignmentManager,
    } as unknown as jest.Mocked<Repository<ClientIconAssignment>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoAssignService,
        {
          provide: getRepositoryToken(ClientIcon),
          useValue: iconRepository,
        },
        {
          provide: getRepositoryToken(ClientIconAssignment),
          useValue: assignmentRepository,
        },
        {
          provide: ConditionEvaluatorService,
          useValue: {
            evaluate: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<AutoAssignService>(AutoAssignService);
    conditionEvaluator = module.get(ConditionEvaluatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateAndAssign', () => {
    it('should create a transaction and commit on success', async () => {
      const client = createMockClient();
      entityManager.find.mockResolvedValue([]);

      await service.evaluateAndAssign(client);

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const client = createMockClient();
      entityManager.find.mockRejectedValue(new Error('Database error'));

      await expect(service.evaluateAndAssign(client)).rejects.toThrow(ClientException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw ClientException with AUTO_ASSIGN_EVALUATION_FAILED error code', async () => {
      const client = createMockClient();
      entityManager.find.mockRejectedValue(new Error('Database error'));

      try {
        await service.evaluateAndAssign(client);
        fail('Expected ClientException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientException);
        expect((error as ClientException).errorCode).toBe(
          ClientErrorCode.AUTO_ASSIGN_EVALUATION_FAILED
        );
      }
    });

    it('should do nothing when no icons with conditions exist', async () => {
      const client = createMockClient();

      // First call: find icons with conditions - returns empty
      // Second call: removeStaleAutoAssignments - returns empty
      entityManager.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.evaluateAndAssign(client);

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      // Should not call conditionEvaluator.evaluate when no icons
      expect(conditionEvaluator.evaluate).not.toHaveBeenCalled();
    });

    it('should add auto-assignment when condition matches and no existing assignment', async () => {
      const client = createMockClient();
      const icon = createMockIcon();

      // First find: icons with conditions
      entityManager.find
        .mockResolvedValueOnce([icon]) // Icons with conditions
        .mockResolvedValueOnce([]) // Current auto-assignments
        .mockResolvedValueOnce([]); // For removeStaleAutoAssignments

      conditionEvaluator.evaluate.mockReturnValue(true);

      // For addAutoAssignment - no existing assignments
      entityManager.findOne
        .mockResolvedValueOnce(null) // No manual assignment
        .mockResolvedValueOnce(null); // No auto assignment

      const createdAssignment = createMockAssignment();
      (entityManager.create as jest.Mock).mockReturnValue(createdAssignment);
      entityManager.save.mockResolvedValue(createdAssignment);

      await service.evaluateAndAssign(client);

      expect(conditionEvaluator.evaluate).toHaveBeenCalledWith(client, icon.autoAssignCondition);
      expect(entityManager.create).toHaveBeenCalledWith(ClientIconAssignment, {
        clientId: client.id,
        iconId: icon.id,
        isAutoAssigned: true,
      });
      expect(entityManager.save).toHaveBeenCalled();
    });

    it('should not override existing manual assignment', async () => {
      const client = createMockClient();
      const icon = createMockIcon();

      entityManager.find
        .mockResolvedValueOnce([icon])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      conditionEvaluator.evaluate.mockReturnValue(true);

      // Manual assignment exists
      const manualAssignment = createMockAssignment({ isAutoAssigned: false });
      entityManager.findOne.mockResolvedValueOnce(manualAssignment);

      await service.evaluateAndAssign(client);

      // Should not create new assignment
      expect(entityManager.create).not.toHaveBeenCalled();
    });

    it('should not duplicate existing auto-assignment', async () => {
      const client = createMockClient();
      const icon = createMockIcon();

      // Icon exists and matches
      entityManager.find
        .mockResolvedValueOnce([icon])
        .mockResolvedValueOnce([createMockAssignment()]) // Current auto-assignment exists
        .mockResolvedValueOnce([createMockAssignment()]);

      conditionEvaluator.evaluate.mockReturnValue(true);

      await service.evaluateAndAssign(client);

      // Since assignment already exists (in currentAutoIconIds), addAutoAssignment should not be called
      expect(entityManager.create).not.toHaveBeenCalled();
    });

    it('should remove stale auto-assignments when condition no longer matches', async () => {
      const client = createMockClient();
      const icon = createMockIcon();
      const staleAssignment = createMockAssignment({ iconId: 'stale-icon-id' });

      entityManager.find
        .mockResolvedValueOnce([icon])
        .mockResolvedValueOnce([staleAssignment]) // Current assignments include stale one
        .mockResolvedValueOnce([staleAssignment]); // For removeStaleAutoAssignments

      // New icon matches, but stale one doesn't (different icon)
      conditionEvaluator.evaluate.mockReturnValue(true);

      // For addAutoAssignment
      entityManager.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const newAssignment = createMockAssignment();
      (entityManager.create as jest.Mock).mockReturnValue(newAssignment);
      entityManager.save.mockResolvedValue(newAssignment);

      await service.evaluateAndAssign(client);

      // Stale assignment should be removed
      expect(entityManager.remove).toHaveBeenCalledWith(staleAssignment);
    });

    it('should handle condition evaluation errors gracefully and continue', async () => {
      const client = createMockClient();
      const icon1 = createMockIcon({ id: 'icon-1' });
      const icon2 = createMockIcon({ id: 'icon-2' });

      entityManager.find
        .mockResolvedValueOnce([icon1, icon2])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // First icon throws error, second one succeeds
      conditionEvaluator.evaluate
        .mockImplementationOnce(() => {
          throw new Error('Condition error');
        })
        .mockReturnValueOnce(true);

      entityManager.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const createdAssignment = createMockAssignment({ iconId: 'icon-2' });
      (entityManager.create as jest.Mock).mockReturnValue(createdAssignment);
      entityManager.save.mockResolvedValue(createdAssignment);

      await service.evaluateAndAssign(client);

      // Should still process second icon despite first one failing
      expect(conditionEvaluator.evaluate).toHaveBeenCalledTimes(2);
      expect(entityManager.create).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should filter icons by companyId and isActive', async () => {
      const client = createMockClient();

      entityManager.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.evaluateAndAssign(client);

      expect(entityManager.find).toHaveBeenCalledWith(ClientIcon, {
        where: {
          companyId: client.companyId,
          isActive: true,
          autoAssignCondition: expect.anything(),
        },
      });
    });

    it('should handle multiple matching icons correctly', async () => {
      const client = createMockClient();
      const icon1 = createMockIcon({ id: 'icon-1', name: 'Icon 1' });
      const icon2 = createMockIcon({ id: 'icon-2', name: 'Icon 2' });
      const icon3 = createMockIcon({ id: 'icon-3', name: 'Icon 3' });

      entityManager.find
        .mockResolvedValueOnce([icon1, icon2, icon3])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // icon1 and icon3 match, icon2 doesn't
      conditionEvaluator.evaluate
        .mockReturnValueOnce(true) // icon1 matches
        .mockReturnValueOnce(false) // icon2 doesn't match
        .mockReturnValueOnce(true); // icon3 matches

      entityManager.findOne.mockResolvedValue(null);

      const createAssignment = (iconId: string) => createMockAssignment({ iconId });
      (entityManager.create as jest.Mock)
        .mockReturnValueOnce(createAssignment('icon-1'))
        .mockReturnValueOnce(createAssignment('icon-3'));
      entityManager.save.mockResolvedValue({} as ClientIconAssignment);

      await service.evaluateAndAssign(client);

      // Should create assignments for icon1 and icon3, but not icon2
      expect(entityManager.create).toHaveBeenCalledTimes(2);
      expect(entityManager.create).toHaveBeenCalledWith(ClientIconAssignment, {
        clientId: client.id,
        iconId: 'icon-1',
        isAutoAssigned: true,
      });
      expect(entityManager.create).toHaveBeenCalledWith(ClientIconAssignment, {
        clientId: client.id,
        iconId: 'icon-3',
        isAutoAssigned: true,
      });
    });
  });

  describe('reevaluateIconForAllClients', () => {
    // Store captured setImmediate callback
    let capturedCallback: (() => void) | null = null;
    let setImmediateSpy: jest.SpyInstance;

    beforeEach(() => {
      capturedCallback = null;
      // Capture setImmediate callback so we can run it synchronously
      setImmediateSpy = jest
        .spyOn(global, 'setImmediate')
        .mockImplementation((callback: () => void) => {
          capturedCallback = callback;
          return {} as NodeJS.Immediate;
        });
    });

    afterEach(() => {
      setImmediateSpy.mockRestore();
    });

    // Helper to run the captured background task and wait for all async operations to complete
    const runBackgroundTask = async () => {
      if (capturedCallback) {
        // Call the callback which starts the async operation
        capturedCallback();
        // Wait for microtasks (promises) to settle
        await new Promise(process.nextTick);
        // Additional wait to ensure all chained promises complete
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    };

    it('should remove all auto-assignments when icon has no condition', async () => {
      const icon = createMockIcon({ autoAssignCondition: undefined });

      await service.reevaluateIconForAllClients(icon);

      expect(assignmentRepository.delete).toHaveBeenCalledWith({
        iconId: icon.id,
        isAutoAssigned: true,
      });
    });

    it('should remove all auto-assignments when autoAssignCondition is null', async () => {
      const icon = createMockIcon({ autoAssignCondition: null as unknown as undefined });

      await service.reevaluateIconForAllClients(icon);

      expect(assignmentRepository.delete).toHaveBeenCalledWith({
        iconId: icon.id,
        isAutoAssigned: true,
      });
    });

    it('should schedule background processing when condition exists', async () => {
      const icon = createMockIcon();
      const mockClientRepo = {
        count: jest.fn().mockResolvedValue(0),
        find: jest.fn().mockResolvedValue([]),
      };

      (assignmentRepository.manager.getRepository as jest.Mock).mockReturnValue(mockClientRepo);

      await service.reevaluateIconForAllClients(icon);

      // Should not delete when condition exists
      expect(assignmentRepository.delete).not.toHaveBeenCalled();

      // Run the captured background task
      await runBackgroundTask();
    });

    it('should process clients in batches of 100', async () => {
      const icon = createMockIcon();
      const clients = Array.from({ length: 250 }, (_, i) =>
        createMockClient({ id: `client-${i}` })
      );

      const mockClientRepo = {
        count: jest.fn().mockResolvedValue(250),
        find: jest
          .fn()
          .mockResolvedValueOnce(clients.slice(0, 100))
          .mockResolvedValueOnce(clients.slice(100, 200))
          .mockResolvedValueOnce(clients.slice(200, 250)),
      };

      (assignmentRepository.manager.getRepository as jest.Mock).mockReturnValue(mockClientRepo);
      conditionEvaluator.evaluate.mockReturnValue(false);
      assignmentRepository.findOne.mockResolvedValue(null);

      await service.reevaluateIconForAllClients(icon);

      // Run the captured background task
      await runBackgroundTask();

      // Should query with correct pagination
      expect(mockClientRepo.find).toHaveBeenCalledWith({
        where: { companyId: icon.companyId, isActive: true },
        skip: 0,
        take: 100,
      });
    });

    it('should do nothing when no clients exist for the company', async () => {
      const icon = createMockIcon();
      const mockClientRepo = {
        count: jest.fn().mockResolvedValue(0),
        find: jest.fn(),
      };

      (assignmentRepository.manager.getRepository as jest.Mock).mockReturnValue(mockClientRepo);

      await service.reevaluateIconForAllClients(icon);
      await runBackgroundTask();

      expect(mockClientRepo.find).not.toHaveBeenCalled();
    });

    it('should add assignment when client matches condition and no existing assignment', async () => {
      const icon = createMockIcon();
      const client = createMockClient();
      const mockClientRepo = {
        count: jest.fn().mockResolvedValue(1),
        find: jest.fn().mockResolvedValue([client]),
      };

      (assignmentRepository.manager.getRepository as jest.Mock).mockReturnValue(mockClientRepo);
      conditionEvaluator.evaluate.mockReturnValue(true);
      assignmentRepository.findOne.mockResolvedValue(null);

      // Mock addAutoAssignment dependencies
      (assignmentRepository.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // No manual
        .mockResolvedValueOnce(null); // No auto

      const createdAssignment = createMockAssignment();
      (assignmentRepository.manager.create as jest.Mock).mockReturnValue(createdAssignment);
      (assignmentRepository.manager.save as jest.Mock).mockResolvedValue(createdAssignment);

      await service.reevaluateIconForAllClients(icon);
      await runBackgroundTask();

      expect(conditionEvaluator.evaluate).toHaveBeenCalledWith(client, icon.autoAssignCondition);
    });

    it('should remove existing auto-assignment when client no longer matches', async () => {
      const icon = createMockIcon();
      const client = createMockClient();
      const existingAssignment = createMockAssignment();
      const mockClientRepo = {
        count: jest.fn().mockResolvedValue(1),
        find: jest.fn().mockResolvedValue([client]),
      };

      (assignmentRepository.manager.getRepository as jest.Mock).mockReturnValue(mockClientRepo);
      conditionEvaluator.evaluate.mockReturnValue(false);
      assignmentRepository.findOne.mockResolvedValue(existingAssignment);

      await service.reevaluateIconForAllClients(icon);
      await runBackgroundTask();

      expect(assignmentRepository.remove).toHaveBeenCalledWith(existingAssignment);
    });

    it('should not remove manual assignment even when condition no longer matches', async () => {
      const icon = createMockIcon();
      const client = createMockClient();
      const manualAssignment = createMockAssignment({ isAutoAssigned: false });
      const mockClientRepo = {
        count: jest.fn().mockResolvedValue(1),
        find: jest.fn().mockResolvedValue([client]),
      };

      (assignmentRepository.manager.getRepository as jest.Mock).mockReturnValue(mockClientRepo);
      conditionEvaluator.evaluate.mockReturnValue(false);
      assignmentRepository.findOne.mockResolvedValue(manualAssignment);

      await service.reevaluateIconForAllClients(icon);
      await runBackgroundTask();

      expect(assignmentRepository.remove).not.toHaveBeenCalled();
    });

    it('should handle errors during batch processing gracefully', async () => {
      const icon = createMockIcon();
      const client1 = createMockClient({ id: 'client-1' });
      const client2 = createMockClient({ id: 'client-2' });
      const mockClientRepo = {
        count: jest.fn().mockResolvedValue(2),
        find: jest.fn().mockResolvedValue([client1, client2]),
      };

      (assignmentRepository.manager.getRepository as jest.Mock).mockReturnValue(mockClientRepo);

      // First client throws error, second succeeds
      conditionEvaluator.evaluate
        .mockImplementationOnce(() => {
          throw new Error('Evaluation error');
        })
        .mockReturnValueOnce(true);

      assignmentRepository.findOne.mockResolvedValue(null);
      (assignmentRepository.manager.findOne as jest.Mock).mockResolvedValue(null);
      (assignmentRepository.manager.create as jest.Mock).mockReturnValue(createMockAssignment());
      (assignmentRepository.manager.save as jest.Mock).mockResolvedValue(createMockAssignment());

      await service.reevaluateIconForAllClients(icon);
      await runBackgroundTask();

      // Should have attempted to evaluate both clients
      expect(conditionEvaluator.evaluate).toHaveBeenCalledTimes(2);
    });

    it('should filter clients by companyId and isActive', async () => {
      const icon = createMockIcon();
      const mockClientRepo = {
        count: jest.fn().mockResolvedValue(0),
        find: jest.fn().mockResolvedValue([]),
      };

      (assignmentRepository.manager.getRepository as jest.Mock).mockReturnValue(mockClientRepo);

      await service.reevaluateIconForAllClients(icon);
      await runBackgroundTask();

      expect(mockClientRepo.count).toHaveBeenCalledWith({
        where: { companyId: icon.companyId, isActive: true },
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty autoAssignCondition object', async () => {
      const client = createMockClient();
      const icon = createMockIcon({ autoAssignCondition: {} as any });

      entityManager.find
        .mockResolvedValueOnce([icon])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      conditionEvaluator.evaluate.mockReturnValue(true);
      entityManager.findOne.mockResolvedValue(null);

      const createdAssignment = createMockAssignment();
      (entityManager.create as jest.Mock).mockReturnValue(createdAssignment);
      entityManager.save.mockResolvedValue(createdAssignment);

      await service.evaluateAndAssign(client);

      expect(conditionEvaluator.evaluate).toHaveBeenCalledWith(client, {});
    });

    it('should handle client with minimal required fields', async () => {
      const minimalClient = {
        id: mockClientId,
        companyId: mockCompanyId,
        name: 'Minimal Client',
      } as Client;

      entityManager.find.mockResolvedValue([]);

      await service.evaluateAndAssign(minimalClient);

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle concurrent evaluations for same client', async () => {
      const client = createMockClient();
      const icon = createMockIcon();

      // Use mockResolvedValueOnce for each sequential call to avoid overwriting
      entityManager.find
        .mockResolvedValueOnce([icon]) // First call: get icons with conditions
        .mockResolvedValueOnce([]) // First call: get current assignments
        .mockResolvedValueOnce([icon]) // Second call: get icons with conditions
        .mockResolvedValueOnce([]); // Second call: get current assignments

      conditionEvaluator.evaluate.mockReturnValue(true);
      entityManager.findOne.mockResolvedValue(null);
      (entityManager.create as jest.Mock).mockReturnValue(createMockAssignment());
      entityManager.save.mockResolvedValue(createMockAssignment());

      // Start two concurrent evaluations
      const promise1 = service.evaluateAndAssign(client);
      const promise2 = service.evaluateAndAssign(client);

      await Promise.all([promise1, promise2]);

      // Both should complete successfully (transaction isolation handles conflicts)
      expect(queryRunner.connect).toHaveBeenCalledTimes(2);
      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(2);
    });

    it('should properly release query runner even on error', async () => {
      const client = createMockClient();
      entityManager.find.mockRejectedValue(new Error('DB Error'));

      await expect(service.evaluateAndAssign(client)).rejects.toThrow();

      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should handle icon with complex nested conditions', async () => {
      const client = createMockClient();
      const complexCondition: AutoAssignCondition = {
        logicalOperator: 'and',
        conditions: [
          {
            logicalOperator: 'or',
            conditions: [
              { field: 'employmentType', operator: 'equals', value: EmploymentType.DG },
              { field: 'vatStatus', operator: 'equals', value: VatStatus.VAT_MONTHLY },
            ],
          },
          { field: 'isActive', operator: 'equals', value: true },
        ],
      };
      const icon = createMockIcon({ autoAssignCondition: complexCondition });

      entityManager.find
        .mockResolvedValueOnce([icon])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      conditionEvaluator.evaluate.mockReturnValue(true);
      entityManager.findOne.mockResolvedValue(null);
      (entityManager.create as jest.Mock).mockReturnValue(createMockAssignment());
      entityManager.save.mockResolvedValue(createMockAssignment());

      await service.evaluateAndAssign(client);

      expect(conditionEvaluator.evaluate).toHaveBeenCalledWith(client, complexCondition);
    });
  });

  describe('integration scenarios', () => {
    it('should correctly update assignments when client changes from matching to non-matching', async () => {
      const client = createMockClient();
      const icon = createMockIcon();
      const existingAssignment = createMockAssignment();

      // Initial state: assignment exists
      entityManager.find
        .mockResolvedValueOnce([icon])
        .mockResolvedValueOnce([existingAssignment])
        .mockResolvedValueOnce([existingAssignment]);

      // Client no longer matches
      conditionEvaluator.evaluate.mockReturnValue(false);

      await service.evaluateAndAssign(client);

      // Should remove the existing assignment
      expect(entityManager.remove).toHaveBeenCalledWith(existingAssignment);
    });

    it('should correctly update assignments when client changes from non-matching to matching', async () => {
      const client = createMockClient();
      const icon = createMockIcon();

      // Initial state: no assignments
      entityManager.find
        .mockResolvedValueOnce([icon])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Client now matches
      conditionEvaluator.evaluate.mockReturnValue(true);
      entityManager.findOne.mockResolvedValue(null);
      (entityManager.create as jest.Mock).mockReturnValue(createMockAssignment());
      entityManager.save.mockResolvedValue(createMockAssignment());

      await service.evaluateAndAssign(client);

      // Should create new assignment
      expect(entityManager.create).toHaveBeenCalledWith(ClientIconAssignment, {
        clientId: client.id,
        iconId: icon.id,
        isAutoAssigned: true,
      });
    });

    it('should handle mix of matching and non-matching icons for same client', async () => {
      const client = createMockClient();
      const matchingIcon = createMockIcon({ id: 'matching-icon' });
      const nonMatchingIcon = createMockIcon({ id: 'non-matching-icon' });
      const staleAssignment = createMockAssignment({ iconId: 'old-icon' });

      entityManager.find
        .mockResolvedValueOnce([matchingIcon, nonMatchingIcon])
        .mockResolvedValueOnce([staleAssignment])
        .mockResolvedValueOnce([staleAssignment]);

      conditionEvaluator.evaluate
        .mockReturnValueOnce(true) // matchingIcon
        .mockReturnValueOnce(false); // nonMatchingIcon

      entityManager.findOne.mockResolvedValue(null);
      (entityManager.create as jest.Mock).mockReturnValue(
        createMockAssignment({ iconId: 'matching-icon' })
      );
      entityManager.save.mockResolvedValue(createMockAssignment());

      await service.evaluateAndAssign(client);

      // Should create assignment for matching icon
      expect(entityManager.create).toHaveBeenCalledWith(ClientIconAssignment, {
        clientId: client.id,
        iconId: 'matching-icon',
        isAutoAssigned: true,
      });

      // Should remove stale assignment
      expect(entityManager.remove).toHaveBeenCalledWith(staleAssignment);
    });
  });
});
