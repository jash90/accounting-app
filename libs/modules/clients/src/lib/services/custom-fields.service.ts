import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ClientFieldDefinition,
  ClientCustomFieldValue,
  Client,
  User,
  CustomFieldType,
  PaginatedResponseDto,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';
import {
  ClientNotFoundException,
  FieldNotFoundException,
  ClientException,
  ClientErrorCode,
} from '../exceptions';

export interface CreateFieldDefinitionDto {
  name: string;
  label: string;
  fieldType: CustomFieldType;
  isRequired?: boolean;
  enumValues?: string[];
  displayOrder?: number;
}

export interface UpdateFieldDefinitionDto
  extends Partial<CreateFieldDefinitionDto> {}

export interface SetCustomFieldValueDto {
  clientId: string;
  fieldDefinitionId: string;
  value: string | null;
}

export interface FieldDefinitionQueryDto {
  page?: number;
  limit?: number;
}

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(ClientFieldDefinition)
    private readonly fieldDefinitionRepository: Repository<ClientFieldDefinition>,
    @InjectRepository(ClientCustomFieldValue)
    private readonly fieldValueRepository: Repository<ClientCustomFieldValue>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly tenantService: TenantService,
    private readonly dataSource: DataSource,
  ) {}

  // Field Definition CRUD

  async findAllDefinitions(
    user: User,
    query?: FieldDefinitionQueryDto,
  ): Promise<PaginatedResponseDto<ClientFieldDefinition>> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await this.fieldDefinitionRepository.findAndCount({
      where: { companyId, isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
      skip,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findDefinitionById(
    id: string,
    user: User,
  ): Promise<ClientFieldDefinition> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const definition = await this.fieldDefinitionRepository.findOne({
      where: { id, companyId, isActive: true },
    });

    if (!definition) {
      throw new FieldNotFoundException(id, companyId);
    }

    return definition;
  }

  async createDefinition(
    dto: CreateFieldDefinitionDto,
    user: User,
  ): Promise<ClientFieldDefinition> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Validate enum options for ENUM and MULTISELECT types
    if (dto.fieldType === CustomFieldType.ENUM || dto.fieldType === CustomFieldType.MULTISELECT) {
      if (!dto.enumValues || dto.enumValues.length === 0) {
        throw new BadRequestException(
          `Options are required for ${dto.fieldType} field type`,
        );
      }
    }

    // Check for duplicate field name
    const existing = await this.fieldDefinitionRepository.findOne({
      where: { companyId, name: dto.name, isActive: true },
    });

    if (existing) {
      throw new BadRequestException(
        `Field with name "${dto.name}" already exists`,
      );
    }

    const definition = this.fieldDefinitionRepository.create({
      ...dto,
      companyId,
      createdById: user.id,
    });

    return this.fieldDefinitionRepository.save(definition);
  }

  async updateDefinition(
    id: string,
    dto: UpdateFieldDefinitionDto,
    user: User,
  ): Promise<ClientFieldDefinition> {
    const definition = await this.findDefinitionById(id, user);
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Check for duplicate name if changing
    if (dto.name && dto.name !== definition.name) {
      const existing = await this.fieldDefinitionRepository.findOne({
        where: { companyId, name: dto.name, isActive: true },
      });

      if (existing) {
        throw new BadRequestException(
          `Field with name "${dto.name}" already exists`,
        );
      }
    }

    // Don't allow changing field type if values exist
    if (dto.fieldType && dto.fieldType !== definition.fieldType) {
      const hasValues = await this.fieldValueRepository.count({
        where: { fieldDefinitionId: id },
      });

      if (hasValues > 0) {
        throw new BadRequestException(
          'Cannot change field type when values exist. Delete existing values first.',
        );
      }
    }

    // Validate enum options for ENUM and MULTISELECT types
    const requiresEnumValues = [CustomFieldType.ENUM, CustomFieldType.MULTISELECT];
    const targetType = dto.fieldType || definition.fieldType;
    if (requiresEnumValues.includes(targetType)) {
      const enumValues = dto.enumValues ?? definition.enumValues;
      if (!enumValues || enumValues.length === 0) {
        throw new BadRequestException(
          `Options are required for ${targetType} field type`,
        );
      }
    }

    Object.assign(definition, dto);
    return this.fieldDefinitionRepository.save(definition);
  }

  async removeDefinition(id: string, user: User): Promise<void> {
    const definition = await this.findDefinitionById(id, user);

    // Soft delete
    definition.isActive = false;
    await this.fieldDefinitionRepository.save(definition);

    // Also soft-delete all values for this definition
    await this.fieldValueRepository.update(
      { fieldDefinitionId: id },
      { isActive: false },
    );
  }

  /**
   * Hard deletes a field definition and all associated values.
   * Use with caution - this permanently removes data and cannot be undone.
   *
   * @param id - Field definition ID to delete
   * @param user - User performing the operation
   * @throws FieldNotFoundException if definition doesn't exist or doesn't belong to company
   */
  async hardDeleteDefinition(id: string, user: User): Promise<void> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify definition exists and belongs to company (including soft-deleted)
    const definition = await this.fieldDefinitionRepository.findOne({
      where: { id, companyId },
    });

    if (!definition) {
      throw new FieldNotFoundException(id, companyId);
    }

    // Use a transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // First, delete all associated field values (cascading cleanup)
      await queryRunner.manager.delete(ClientCustomFieldValue, {
        fieldDefinitionId: id,
      });

      // Then delete the definition itself
      await queryRunner.manager.delete(ClientFieldDefinition, {
        id,
        companyId,
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new ClientException(
        ClientErrorCode.CLIENT_BATCH_OPERATION_FAILED,
        'Failed to hard delete field definition',
        {
          companyId,
          operationStage: 'hardDeleteDefinition',
          additionalInfo: {
            error: (error as Error).message,
            definitionId: id,
          },
        },
      );
    } finally {
      await queryRunner.release();
    }
  }

  // Custom Field Values

  async getClientCustomFields(
    clientId: string,
    user: User,
  ): Promise<ClientCustomFieldValue[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client belongs to company
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new ClientNotFoundException(clientId, companyId);
    }

    return this.fieldValueRepository.find({
      where: { clientId, isActive: true },
      relations: ['fieldDefinition'],
      order: { fieldDefinition: { displayOrder: 'ASC' } },
    });
  }

  async setCustomFieldValue(
    dto: SetCustomFieldValueDto,
    user: User,
  ): Promise<ClientCustomFieldValue> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client
    const client = await this.clientRepository.findOne({
      where: { id: dto.clientId, companyId },
    });

    if (!client) {
      throw new ClientNotFoundException(dto.clientId, companyId);
    }

    // Verify field definition
    const definition = await this.fieldDefinitionRepository.findOne({
      where: { id: dto.fieldDefinitionId, companyId, isActive: true },
    });

    if (!definition) {
      throw new FieldNotFoundException(dto.fieldDefinitionId, companyId);
    }

    // Validate value based on field type
    this.validateFieldValue(dto.value, definition);

    // Find existing value or create new
    let fieldValue = await this.fieldValueRepository.findOne({
      where: {
        clientId: dto.clientId,
        fieldDefinitionId: dto.fieldDefinitionId,
      },
    });

    if (fieldValue) {
      fieldValue.value = dto.value ?? undefined;
      fieldValue.isActive = true;
    } else {
      fieldValue = this.fieldValueRepository.create({
        clientId: dto.clientId,
        fieldDefinitionId: dto.fieldDefinitionId,
        value: dto.value ?? undefined,
      });
    }

    return this.fieldValueRepository.save(fieldValue);
  }

  async setMultipleCustomFieldValues(
    clientId: string,
    values: Record<string, string | null>,
    user: User,
  ): Promise<ClientCustomFieldValue[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client OUTSIDE transaction (read-only check)
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new ClientNotFoundException(clientId, companyId);
    }

    // Get all active field definitions OUTSIDE transaction
    const definitions = await this.fieldDefinitionRepository.find({
      where: { companyId, isActive: true },
    });

    const definitionMap = new Map(definitions.map((d) => [d.id, d]));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const results: ClientCustomFieldValue[] = [];

      for (const [fieldDefinitionId, value] of Object.entries(values)) {
        const definition = definitionMap.get(fieldDefinitionId);

        if (!definition) {
          throw new FieldNotFoundException(fieldDefinitionId, companyId);
        }

        // Validate BEFORE saving
        this.validateFieldValue(value, definition);

        let fieldValue = await queryRunner.manager.findOne(
          ClientCustomFieldValue,
          { where: { clientId, fieldDefinitionId } },
        );

        if (fieldValue) {
          fieldValue.value = value ?? undefined;
          fieldValue.isActive = true;
        } else {
          fieldValue = queryRunner.manager.create(ClientCustomFieldValue, {
            clientId,
            fieldDefinitionId,
            value: value ?? undefined,
          });
        }

        const saved = await queryRunner.manager.save(fieldValue);
        results.push(saved);
      }

      await queryRunner.commitTransaction();
      return results;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // If it's already a ClientException, rethrow it
      if (error instanceof ClientException) {
        throw error;
      }

      // Otherwise wrap in generic batch operation exception
      throw new ClientException(
        ClientErrorCode.CLIENT_BATCH_OPERATION_FAILED,
        'Failed to set multiple custom field values',
        {
          clientId,
          companyId,
          operationStage: 'setMultipleCustomFieldValues',
          additionalInfo: {
            error: (error as Error).message,
            fieldCount: Object.keys(values).length,
          },
        },
      );
    } finally {
      await queryRunner.release();
    }
  }

  async removeCustomFieldValue(
    clientId: string,
    fieldDefinitionId: string,
    user: User,
  ): Promise<void> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new ClientNotFoundException(clientId, companyId);
    }

    const fieldValue = await this.fieldValueRepository.findOne({
      where: { clientId, fieldDefinitionId },
    });

    if (fieldValue) {
      fieldValue.isActive = false;
      await this.fieldValueRepository.save(fieldValue);
    }
  }

  private validateFieldValue(
    value: string | null,
    definition: ClientFieldDefinition,
  ): void {
    if (value === null || value === '') {
      if (definition.isRequired) {
        throw new BadRequestException(
          `Field "${definition.label}" is required`,
        );
      }
      return;
    }

    switch (definition.fieldType) {
      case CustomFieldType.NUMBER:
        if (isNaN(Number(value))) {
          throw new BadRequestException(
            `Field "${definition.label}" must be a valid number`,
          );
        }
        break;

      case CustomFieldType.DATE:
        if (isNaN(Date.parse(value))) {
          throw new BadRequestException(
            `Field "${definition.label}" must be a valid date`,
          );
        }
        break;

      case CustomFieldType.DATETIME:
        if (isNaN(Date.parse(value))) {
          throw new BadRequestException(
            `Field "${definition.label}" must be a valid datetime`,
          );
        }
        break;

      case CustomFieldType.BOOLEAN:
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          throw new BadRequestException(
            `Field "${definition.label}" must be a boolean value`,
          );
        }
        break;

      case CustomFieldType.ENUM:
        if (
          !definition.enumValues ||
          !definition.enumValues.includes(value)
        ) {
          throw new BadRequestException(
            `Field "${definition.label}" must be one of: ${definition.enumValues?.join(', ')}`,
          );
        }
        break;

      case CustomFieldType.MULTISELECT:
        // Value should be JSON array of strings
        try {
          const selectedValues = JSON.parse(value);
          if (!Array.isArray(selectedValues)) {
            throw new Error('Not an array');
          }
          if (definition.enumValues) {
            const invalidValues = selectedValues.filter(
              (v: string) => !definition.enumValues!.includes(v),
            );
            if (invalidValues.length > 0) {
              throw new BadRequestException(
                `Field "${definition.label}" contains invalid values: ${invalidValues.join(', ')}. Allowed: ${definition.enumValues.join(', ')}`,
              );
            }
          }
        } catch (e) {
          if (e instanceof BadRequestException) throw e;
          throw new BadRequestException(
            `Field "${definition.label}" must be a valid JSON array`,
          );
        }
        break;

      case CustomFieldType.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new BadRequestException(
            `Field "${definition.label}" must be a valid email address`,
          );
        }
        break;

      case CustomFieldType.PHONE:
        // Allow digits, spaces, dashes, parentheses, and plus sign
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 7) {
          throw new BadRequestException(
            `Field "${definition.label}" must be a valid phone number`,
          );
        }
        break;

      case CustomFieldType.URL:
        try {
          new URL(value);
        } catch {
          throw new BadRequestException(
            `Field "${definition.label}" must be a valid URL`,
          );
        }
        break;

      case CustomFieldType.TEXT:
        // No special validation for text
        break;
    }
  }
}
