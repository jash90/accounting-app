import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { type Repository } from 'typeorm';

import {
  type Client,
  ClientCustomFieldValue,
  ClientFieldDefinition,
  CustomFieldType,
  PaginatedResponseDto,
  UserRole,
  type User,
} from '@accounting/common';
import { type TenantService } from '@accounting/common/backend';

import { ClientException, ClientNotFoundException, FieldNotFoundException } from '../exceptions';
import { CustomFieldsService, type CreateFieldDefinitionDto } from './custom-fields.service';

describe('CustomFieldsService', () => {
  let service: CustomFieldsService;
  let _fieldDefinitionRepository: jest.Mocked<Repository<ClientFieldDefinition>>;
  let _fieldValueRepository: jest.Mocked<Repository<ClientCustomFieldValue>>;
  let _clientRepository: jest.Mocked<Repository<Client>>;
  let _tenantService: jest.Mocked<TenantService>;

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockDefinition: Partial<ClientFieldDefinition> = {
    id: 'field-def-1',
    name: 'testField',
    label: 'Test Field',
    fieldType: CustomFieldType.TEXT,
    companyId: mockCompanyId,
    isActive: true,
    isRequired: false,
    displayOrder: 1,
    createdById: mockUserId,
  };

  const mockFieldValue: Partial<ClientCustomFieldValue> = {
    id: 'field-val-1',
    clientId: 'client-1',
    fieldDefinitionId: 'field-def-1',
    value: 'test value',
    isActive: true,
    companyId: mockCompanyId,
  };

  const mockClient: Partial<Client> = {
    id: 'client-1',
    name: 'Test Client',
    companyId: mockCompanyId,
  };

  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

  const mockCustomFieldReminderService = {
    upsertReminder: jest.fn(),
  };

  const mockFieldDefinitionRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };

  const mockFieldValueRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };

  const mockClientRepo = {
    findOne: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      delete: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CustomFieldsService,
          useFactory: () => {
            return new CustomFieldsService(
              mockFieldDefinitionRepo as any,
              mockFieldValueRepo as any,
              mockClientRepo as any,
              mockTenantService as any,
              mockDataSource as any,
              mockCustomFieldReminderService as any
            );
          },
        },
      ],
    }).compile();

    service = module.get<CustomFieldsService>(CustomFieldsService);
    _fieldDefinitionRepository = mockFieldDefinitionRepo as any;
    _fieldValueRepository = mockFieldValueRepo as any;
    _clientRepository = mockClientRepo as any;
    _tenantService = mockTenantService as any;
  });

  describe('findAllDefinitions', () => {
    it('should return paginated field definitions for company', async () => {
      mockFieldDefinitionRepo.findAndCount.mockResolvedValue([[mockDefinition], 1]);

      const result = await service.findAllDefinitions(mockUser as User);

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toEqual([mockDefinition]);
      expect(result.meta.total).toBe(1);
      expect(mockFieldDefinitionRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: mockCompanyId, isActive: true },
          order: { displayOrder: 'ASC', name: 'ASC' },
        })
      );
    });

    it('should use tenant service to resolve companyId', async () => {
      mockFieldDefinitionRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllDefinitions(mockUser as User);

      expect(mockTenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
    });

    it('should support pagination params', async () => {
      mockFieldDefinitionRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllDefinitions(mockUser as User, { page: 2, limit: 10 });

      expect(mockFieldDefinitionRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe('findDefinitionById', () => {
    it('should return definition when found', async () => {
      mockFieldDefinitionRepo.findOne.mockResolvedValue(mockDefinition);

      const result = await service.findDefinitionById('field-def-1', mockUser as User);

      expect(result).toEqual(mockDefinition);
      expect(mockFieldDefinitionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'field-def-1', companyId: mockCompanyId, isActive: true },
      });
    });

    it('should throw FieldNotFoundException when not found', async () => {
      mockFieldDefinitionRepo.findOne.mockResolvedValue(null);

      await expect(service.findDefinitionById('nonexistent', mockUser as User)).rejects.toThrow(
        FieldNotFoundException
      );
    });
  });

  describe('createDefinition', () => {
    const createDto: CreateFieldDefinitionDto = {
      name: 'newField',
      label: 'New Field',
      fieldType: CustomFieldType.TEXT,
    };

    it('should create a field definition', async () => {
      mockFieldDefinitionRepo.findOne.mockResolvedValue(null);
      mockFieldDefinitionRepo.create.mockReturnValue({ ...createDto, companyId: mockCompanyId });
      mockFieldDefinitionRepo.save.mockResolvedValue({
        id: 'new-id',
        ...createDto,
        companyId: mockCompanyId,
      });

      const result = await service.createDefinition(createDto, mockUser as User);

      expect(result).toBeDefined();
      expect(mockFieldDefinitionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'newField',
          label: 'New Field',
          fieldType: CustomFieldType.TEXT,
          companyId: mockCompanyId,
          createdById: mockUserId,
        })
      );
    });

    it('should throw BadRequestException for duplicate field name', async () => {
      mockFieldDefinitionRepo.findOne.mockResolvedValue(mockDefinition);

      await expect(
        service.createDefinition({ ...createDto, name: 'testField' }, mockUser as User)
      ).rejects.toThrow(BadRequestException);
    });

    it('should require enumValues for ENUM type', async () => {
      await expect(
        service.createDefinition(
          { name: 'enumField', label: 'Enum', fieldType: CustomFieldType.ENUM },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should require enumValues for MULTISELECT type', async () => {
      await expect(
        service.createDefinition(
          { name: 'multiField', label: 'Multi', fieldType: CustomFieldType.MULTISELECT },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow ENUM type with enumValues provided', async () => {
      const dto: CreateFieldDefinitionDto = {
        name: 'enumField',
        label: 'Enum Field',
        fieldType: CustomFieldType.ENUM,
        enumValues: ['opt1', 'opt2'],
      };
      mockFieldDefinitionRepo.findOne.mockResolvedValue(null);
      mockFieldDefinitionRepo.create.mockReturnValue({ ...dto, companyId: mockCompanyId });
      mockFieldDefinitionRepo.save.mockResolvedValue({
        id: 'id',
        ...dto,
        companyId: mockCompanyId,
      });

      await expect(service.createDefinition(dto, mockUser as User)).resolves.toBeDefined();
    });
  });

  describe('updateDefinition', () => {
    it('should update an existing definition', async () => {
      mockFieldDefinitionRepo.findOne.mockResolvedValue({ ...mockDefinition });
      mockFieldDefinitionRepo.save.mockResolvedValue({ ...mockDefinition, label: 'Updated' });

      const result = await service.updateDefinition(
        'field-def-1',
        { label: 'Updated' },
        mockUser as User
      );

      expect(result.label).toBe('Updated');
    });

    it('should throw when changing name to existing name', async () => {
      // First call: findDefinitionById; Second call: duplicate check
      mockFieldDefinitionRepo.findOne
        .mockResolvedValueOnce({ ...mockDefinition })
        .mockResolvedValueOnce({ ...mockDefinition, id: 'other-def' });

      await expect(
        service.updateDefinition('field-def-1', { name: 'existingName' }, mockUser as User)
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent changing field type when values exist', async () => {
      mockFieldDefinitionRepo.findOne.mockResolvedValue({ ...mockDefinition });
      mockFieldValueRepo.count.mockResolvedValue(5);

      await expect(
        service.updateDefinition(
          'field-def-1',
          { fieldType: CustomFieldType.NUMBER },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow changing field type when no values exist', async () => {
      mockFieldDefinitionRepo.findOne
        .mockResolvedValueOnce({ ...mockDefinition })
        .mockResolvedValueOnce(null);
      mockFieldValueRepo.count.mockResolvedValue(0);
      mockFieldDefinitionRepo.save.mockResolvedValue({
        ...mockDefinition,
        fieldType: CustomFieldType.NUMBER,
      });

      await expect(
        service.updateDefinition(
          'field-def-1',
          { fieldType: CustomFieldType.NUMBER, name: 'newName' },
          mockUser as User
        )
      ).resolves.toBeDefined();
    });
  });

  describe('softDeleteDefinition', () => {
    it('should soft-delete definition and all values', async () => {
      mockFieldDefinitionRepo.findOne.mockResolvedValue({ ...mockDefinition });
      mockFieldDefinitionRepo.save.mockResolvedValue({ ...mockDefinition, isActive: false });

      await service.softDeleteDefinition('field-def-1', mockUser as User);

      expect(mockFieldDefinitionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
      expect(mockFieldValueRepo.update).toHaveBeenCalledWith(
        { fieldDefinitionId: 'field-def-1' },
        { isActive: false }
      );
    });
  });

  describe('hardDeleteDefinition', () => {
    it('should hard-delete definition and values in transaction', async () => {
      mockFieldDefinitionRepo.findOne.mockResolvedValue({ ...mockDefinition });

      await service.hardDeleteDefinition('field-def-1', mockUser as User);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(ClientCustomFieldValue, {
        fieldDefinitionId: 'field-def-1',
      });
      expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(ClientFieldDefinition, {
        id: 'field-def-1',
        companyId: mockCompanyId,
      });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw FieldNotFoundException when definition does not exist', async () => {
      mockFieldDefinitionRepo.findOne.mockResolvedValue(null);

      await expect(service.hardDeleteDefinition('nonexistent', mockUser as User)).rejects.toThrow(
        FieldNotFoundException
      );
    });

    it('should rollback transaction on error', async () => {
      mockFieldDefinitionRepo.findOne.mockResolvedValue({ ...mockDefinition });
      mockQueryRunner.manager.delete.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.hardDeleteDefinition('field-def-1', mockUser as User)).rejects.toThrow(
        ClientException
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getClientCustomFields', () => {
    it('should return custom field values for a client', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockFieldValueRepo.find.mockResolvedValue([mockFieldValue]);

      const result = await service.getClientCustomFields('client-1', mockUser as User);

      expect(result).toEqual([mockFieldValue]);
      expect(mockFieldValueRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: 'client-1', isActive: true },
          relations: ['fieldDefinition'],
        })
      );
    });

    it('should throw ClientNotFoundException for unknown client', async () => {
      mockClientRepo.findOne.mockResolvedValue(null);

      await expect(service.getClientCustomFields('nonexistent', mockUser as User)).rejects.toThrow(
        ClientNotFoundException
      );
    });
  });

  describe('setCustomFieldValue', () => {
    it('should create a new field value', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockFieldDefinitionRepo.findOne.mockResolvedValue({
        ...mockDefinition,
        fieldType: CustomFieldType.TEXT,
      });
      mockFieldValueRepo.findOne.mockResolvedValue(null);
      mockFieldValueRepo.create.mockReturnValue({ ...mockFieldValue });
      mockFieldValueRepo.save.mockResolvedValue({ ...mockFieldValue });

      const result = await service.setCustomFieldValue(
        { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: 'hello' },
        mockUser as User
      );

      expect(result).toBeDefined();
      expect(mockFieldValueRepo.create).toHaveBeenCalled();
    });

    it('should update an existing field value', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockFieldDefinitionRepo.findOne.mockResolvedValue({
        ...mockDefinition,
        fieldType: CustomFieldType.TEXT,
      });
      mockFieldValueRepo.findOne.mockResolvedValue({ ...mockFieldValue });
      mockFieldValueRepo.save.mockResolvedValue({ ...mockFieldValue, value: 'updated' });

      const result = await service.setCustomFieldValue(
        { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: 'updated' },
        mockUser as User
      );

      expect(result).toBeDefined();
      expect(mockFieldValueRepo.create).not.toHaveBeenCalled();
    });

    it('should throw ClientNotFoundException for unknown client', async () => {
      mockClientRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'bad', fieldDefinitionId: 'field-def-1', value: 'x' },
          mockUser as User
        )
      ).rejects.toThrow(ClientNotFoundException);
    });

    it('should throw FieldNotFoundException for unknown field', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockFieldDefinitionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'bad', value: 'x' },
          mockUser as User
        )
      ).rejects.toThrow(FieldNotFoundException);
    });
  });

  describe('validateFieldValue (via setCustomFieldValue)', () => {
    const setupValidation = (fieldType: CustomFieldType, enumValues?: string[]) => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockFieldDefinitionRepo.findOne.mockResolvedValue({
        ...mockDefinition,
        fieldType,
        enumValues,
        isRequired: false,
      });
      mockFieldValueRepo.findOne.mockResolvedValue(null);
      mockFieldValueRepo.create.mockReturnValue({ ...mockFieldValue });
      mockFieldValueRepo.save.mockResolvedValue({ ...mockFieldValue });
    };

    it('should reject invalid number', async () => {
      setupValidation(CustomFieldType.NUMBER);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: 'abc' },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid number', async () => {
      setupValidation(CustomFieldType.NUMBER);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: '42.5' },
          mockUser as User
        )
      ).resolves.toBeDefined();
    });

    it('should reject invalid date', async () => {
      setupValidation(CustomFieldType.DATE);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: 'not-a-date' },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid boolean', async () => {
      setupValidation(CustomFieldType.BOOLEAN);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: 'maybe' },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid boolean values', async () => {
      setupValidation(CustomFieldType.BOOLEAN);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: 'true' },
          mockUser as User
        )
      ).resolves.toBeDefined();
    });

    it('should reject invalid enum value', async () => {
      setupValidation(CustomFieldType.ENUM, ['opt1', 'opt2']);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: 'opt3' },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid enum value', async () => {
      setupValidation(CustomFieldType.ENUM, ['opt1', 'opt2']);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: 'opt1' },
          mockUser as User
        )
      ).resolves.toBeDefined();
    });

    it('should reject invalid email', async () => {
      setupValidation(CustomFieldType.EMAIL);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: 'not-email' },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid phone number', async () => {
      setupValidation(CustomFieldType.PHONE);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: 'abc' },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid URL', async () => {
      setupValidation(CustomFieldType.URL);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: 'not a url' },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when required field is null', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockFieldDefinitionRepo.findOne.mockResolvedValue({
        ...mockDefinition,
        fieldType: CustomFieldType.TEXT,
        isRequired: true,
      });

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: null },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid multiselect (not an array)', async () => {
      setupValidation(CustomFieldType.MULTISELECT, ['a', 'b']);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: '"notarray"' },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject multiselect with invalid values', async () => {
      setupValidation(CustomFieldType.MULTISELECT, ['a', 'b']);

      await expect(
        service.setCustomFieldValue(
          { clientId: 'client-1', fieldDefinitionId: 'field-def-1', value: '["a","c"]' },
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('softDeleteCustomFieldValue', () => {
    it('should soft-delete a field value', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockFieldValueRepo.findOne.mockResolvedValue({ ...mockFieldValue });
      mockFieldValueRepo.save.mockResolvedValue({ ...mockFieldValue, isActive: false });

      await service.softDeleteCustomFieldValue('client-1', 'field-def-1', mockUser as User);

      expect(mockFieldValueRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });

    it('should not throw when field value does not exist', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockFieldValueRepo.findOne.mockResolvedValue(null);

      await expect(
        service.softDeleteCustomFieldValue('client-1', 'field-def-1', mockUser as User)
      ).resolves.toBeUndefined();
    });

    it('should throw ClientNotFoundException for unknown client', async () => {
      mockClientRepo.findOne.mockResolvedValue(null);

      await expect(
        service.softDeleteCustomFieldValue('bad', 'field-def-1', mockUser as User)
      ).rejects.toThrow(ClientNotFoundException);
    });
  });
});
