import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClientFieldDefinition,
  ClientCustomFieldValue,
  Client,
  Company,
  User,
  UserRole,
  CustomFieldType,
} from '@accounting/common';

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

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(ClientFieldDefinition)
    private readonly fieldDefinitionRepository: Repository<ClientFieldDefinition>,
    @InjectRepository(ClientCustomFieldValue)
    private readonly fieldValueRepository: Repository<ClientCustomFieldValue>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  private async getEffectiveCompanyId(user: User): Promise<string> {
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.companyRepository.findOne({
        where: { isSystemCompany: true },
      });
      if (!systemCompany) {
        throw new ForbiddenException('System company not found for admin user');
      }
      return systemCompany.id;
    }
    return user.companyId;
  }

  // Field Definition CRUD

  async findAllDefinitions(user: User): Promise<ClientFieldDefinition[]> {
    const companyId = await this.getEffectiveCompanyId(user);

    return this.fieldDefinitionRepository.find({
      where: { companyId, isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async findDefinitionById(
    id: string,
    user: User,
  ): Promise<ClientFieldDefinition> {
    const companyId = await this.getEffectiveCompanyId(user);

    const definition = await this.fieldDefinitionRepository.findOne({
      where: { id, companyId },
    });

    if (!definition) {
      throw new NotFoundException(`Field definition with ID ${id} not found`);
    }

    return definition;
  }

  async createDefinition(
    dto: CreateFieldDefinitionDto,
    user: User,
  ): Promise<ClientFieldDefinition> {
    const companyId = await this.getEffectiveCompanyId(user);

    // Validate enum options for ENUM type
    if (dto.fieldType === CustomFieldType.ENUM) {
      if (!dto.enumValues || dto.enumValues.length === 0) {
        throw new BadRequestException(
          'Options are required for ENUM field type',
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

    // Validate enum options
    if (
      dto.fieldType === CustomFieldType.ENUM ||
      (definition.fieldType === CustomFieldType.ENUM && dto.enumValues)
    ) {
      if (!dto.enumValues || dto.enumValues.length === 0) {
        throw new BadRequestException(
          'Options are required for ENUM field type',
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

  // Custom Field Values

  async getClientCustomFields(
    clientId: string,
    user: User,
  ): Promise<ClientCustomFieldValue[]> {
    const companyId = await this.getEffectiveCompanyId(user);

    // Verify client belongs to company
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
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
    const companyId = await this.getEffectiveCompanyId(user);

    // Verify client
    const client = await this.clientRepository.findOne({
      where: { id: dto.clientId, companyId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${dto.clientId} not found`);
    }

    // Verify field definition
    const definition = await this.fieldDefinitionRepository.findOne({
      where: { id: dto.fieldDefinitionId, companyId, isActive: true },
    });

    if (!definition) {
      throw new NotFoundException(
        `Field definition with ID ${dto.fieldDefinitionId} not found`,
      );
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
    const companyId = await this.getEffectiveCompanyId(user);

    // Verify client
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    // Get all active field definitions for this company
    const definitions = await this.fieldDefinitionRepository.find({
      where: { companyId, isActive: true },
    });

    const definitionMap = new Map(definitions.map((d) => [d.id, d]));
    const results: ClientCustomFieldValue[] = [];

    for (const [fieldDefinitionId, value] of Object.entries(values)) {
      const definition = definitionMap.get(fieldDefinitionId);

      if (!definition) {
        throw new NotFoundException(
          `Field definition with ID ${fieldDefinitionId} not found`,
        );
      }

      this.validateFieldValue(value, definition);

      let fieldValue = await this.fieldValueRepository.findOne({
        where: { clientId, fieldDefinitionId },
      });

      if (fieldValue) {
        fieldValue.value = value ?? undefined;
        fieldValue.isActive = true;
      } else {
        fieldValue = this.fieldValueRepository.create({
          clientId,
          fieldDefinitionId,
          value: value ?? undefined,
        });
      }

      results.push(await this.fieldValueRepository.save(fieldValue));
    }

    return results;
  }

  async removeCustomFieldValue(
    clientId: string,
    fieldDefinitionId: string,
    user: User,
  ): Promise<void> {
    const companyId = await this.getEffectiveCompanyId(user);

    // Verify client
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
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

      case CustomFieldType.TEXT:
        // No special validation for text
        break;
    }
  }
}
