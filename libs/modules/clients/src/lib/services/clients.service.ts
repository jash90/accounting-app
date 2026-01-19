import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Client,
  User,
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
  AmlGroup,
  PaginatedResponseDto,
  TenantService,
  isValidPkdCode,
} from '@accounting/common';
import { ChangeLogService } from '@accounting/infrastructure/change-log';
import { ClientChangelogService } from './client-changelog.service';
import { AutoAssignService } from './auto-assign.service';
import { ClientNotFoundException } from '../exceptions';
import {
  BulkDeleteClientsDto,
  BulkRestoreClientsDto,
  BulkEditClientsDto,
  BulkOperationResultDto,
} from '../dto/bulk-operations.dto';

export interface CreateClientDto {
  name: string;
  nip?: string;
  email?: string;
  phone?: string;
  companyStartDate?: Date;
  cooperationStartDate?: Date;
  suspensionDate?: Date;
  companySpecificity?: string;
  additionalInfo?: string;
  // Legacy field (kept for backward compatibility)
  gtuCode?: string;
  // New array field for multiple GTU codes
  gtuCodes?: string[];
  // PKD code (Polska Klasyfikacja Działalności)
  pkdCode?: string;
  // Legacy field (kept for backward compatibility)
  amlGroup?: string;
  // New enum field for AML group
  amlGroupEnum?: AmlGroup;
  // Flag for receiving email copies
  receiveEmailCopy?: boolean;
  employmentType?: EmploymentType;
  vatStatus?: VatStatus;
  taxScheme?: TaxScheme;
  zusStatus?: ZusStatus;
}

export interface UpdateClientDto extends Partial<CreateClientDto> {}

export interface CustomFieldFilter {
  fieldId: string;
  operator: string;
  value: string | string[];
}

export interface ClientFilters {
  search?: string;
  employmentType?: EmploymentType;
  vatStatus?: VatStatus;
  taxScheme?: TaxScheme;
  zusStatus?: ZusStatus;
  amlGroupEnum?: AmlGroup;
  gtuCode?: string;
  pkdCode?: string;
  receiveEmailCopy?: boolean;
  isActive?: boolean;
  cooperationStartDateFrom?: string;
  cooperationStartDateTo?: string;
  companyStartDateFrom?: string;
  companyStartDateTo?: string;
  customFieldFilters?: CustomFieldFilter[];
  page?: number;
  limit?: number;
}

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly changeLogService: ChangeLogService,
    private readonly clientChangelogService: ClientChangelogService,
    private readonly autoAssignService: AutoAssignService,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * Escape special characters in LIKE/ILIKE patterns to prevent SQL injection
   */
  private escapeLikePattern(pattern: string): string {
    return pattern
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  async findAll(
    user: User,
    filters?: ClientFilters,
  ): Promise<PaginatedResponseDto<Client>> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.iconAssignments', 'iconAssignments')
      .leftJoinAndSelect('iconAssignments.icon', 'icon')
      .leftJoinAndSelect('client.customFieldValues', 'customFieldValues')
      .leftJoinAndSelect('customFieldValues.fieldDefinition', 'fieldDefinition')
      .where('client.companyId = :companyId', { companyId });

    if (filters?.search) {
      const escapedSearch = this.escapeLikePattern(filters.search);
      queryBuilder.andWhere(
        "(client.name ILIKE :search ESCAPE '\\' OR client.nip ILIKE :search ESCAPE '\\' OR client.email ILIKE :search ESCAPE '\\')",
        { search: `%${escapedSearch}%` },
      );
    }

    if (filters?.employmentType) {
      queryBuilder.andWhere('client.employmentType = :employmentType', {
        employmentType: filters.employmentType,
      });
    }

    if (filters?.vatStatus) {
      queryBuilder.andWhere('client.vatStatus = :vatStatus', {
        vatStatus: filters.vatStatus,
      });
    }

    if (filters?.taxScheme) {
      queryBuilder.andWhere('client.taxScheme = :taxScheme', {
        taxScheme: filters.taxScheme,
      });
    }

    if (filters?.zusStatus) {
      queryBuilder.andWhere('client.zusStatus = :zusStatus', {
        zusStatus: filters.zusStatus,
      });
    }

    if (filters?.amlGroupEnum) {
      queryBuilder.andWhere('client.amlGroupEnum = :amlGroupEnum', {
        amlGroupEnum: filters.amlGroupEnum,
      });
    }

    if (filters?.gtuCode) {
      queryBuilder.andWhere(':gtuCode = ANY(client.gtuCodes)', {
        gtuCode: filters.gtuCode,
      });
    }

    if (filters?.pkdCode) {
      queryBuilder.andWhere('client.pkdCode = :pkdCode', {
        pkdCode: filters.pkdCode,
      });
    }

    if (filters?.receiveEmailCopy !== undefined) {
      queryBuilder.andWhere('client.receiveEmailCopy = :receiveEmailCopy', {
        receiveEmailCopy: filters.receiveEmailCopy,
      });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('client.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    // Date range filters for cooperationStartDate
    if (filters?.cooperationStartDateFrom) {
      queryBuilder.andWhere('client.cooperationStartDate >= :cooperationStartDateFrom', {
        cooperationStartDateFrom: filters.cooperationStartDateFrom,
      });
    }
    if (filters?.cooperationStartDateTo) {
      queryBuilder.andWhere('client.cooperationStartDate <= :cooperationStartDateTo', {
        cooperationStartDateTo: filters.cooperationStartDateTo,
      });
    }

    // Date range filters for companyStartDate
    if (filters?.companyStartDateFrom) {
      queryBuilder.andWhere('client.companyStartDate >= :companyStartDateFrom', {
        companyStartDateFrom: filters.companyStartDateFrom,
      });
    }
    if (filters?.companyStartDateTo) {
      queryBuilder.andWhere('client.companyStartDate <= :companyStartDateTo', {
        companyStartDateTo: filters.companyStartDateTo,
      });
    }

    // Apply custom field filters
    if (filters?.customFieldFilters && filters.customFieldFilters.length > 0) {
      this.applyCustomFieldFilters(queryBuilder, filters.customFieldFilters);
    }

    queryBuilder.orderBy('client.name', 'ASC');

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string, user: User): Promise<Client> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const client = await this.clientRepository.findOne({
      where: { id, companyId },
      relations: [
        'iconAssignments',
        'iconAssignments.icon',
        'customFieldValues',
        'customFieldValues.fieldDefinition',
      ],
    });

    if (!client) {
      throw new ClientNotFoundException(id, companyId);
    }

    return client;
  }

  async create(dto: CreateClientDto, user: User): Promise<Client> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Validate PKD code if provided
    if (dto.pkdCode && !isValidPkdCode(dto.pkdCode)) {
      throw new BadRequestException(`Nieprawidłowy kod PKD: ${dto.pkdCode}`);
    }

    const client = this.clientRepository.create({
      ...dto,
      companyId,
      createdById: user.id,
    });

    const savedClient = await this.clientRepository.save(client);

    // Evaluate and apply auto-assigned icons (non-critical side effect)
    try {
      await this.autoAssignService.evaluateAndAssign(savedClient);
    } catch (error) {
      // Log error but don't fail the client creation
      this.logger.warn(
        `Failed to auto-assign icons for client after creation`,
        {
          clientId: savedClient.id,
          companyId: savedClient.companyId,
          userId: user.id,
          error: (error as Error).message,
        },
      );
    }

    // Log change
    await this.changeLogService.logCreate(
      'Client',
      savedClient.id,
      this.sanitizeClientForLog(savedClient),
      user,
    );

    // Send notifications
    await this.clientChangelogService.notifyClientCreated(savedClient, user);

    return savedClient;
  }

  async update(id: string, dto: UpdateClientDto, user: User): Promise<Client> {
    const client = await this.findOne(id, user);

    // Validate PKD code if provided
    if (dto.pkdCode && !isValidPkdCode(dto.pkdCode)) {
      throw new BadRequestException(`Nieprawidłowy kod PKD: ${dto.pkdCode}`);
    }

    const oldValues = this.sanitizeClientForLog(client);

    Object.assign(client, dto);
    client.updatedById = user.id;

    const savedClient = await this.clientRepository.save(client);

    // Re-evaluate and apply auto-assigned icons based on updated data (non-critical side effect)
    try {
      await this.autoAssignService.evaluateAndAssign(savedClient);
    } catch (error) {
      // Log error but don't fail the client update
      this.logger.warn(
        `Failed to auto-assign icons for client after update`,
        {
          clientId: savedClient.id,
          companyId: savedClient.companyId,
          userId: user.id,
          error: (error as Error).message,
        },
      );
    }

    // Log change with diff
    await this.changeLogService.logUpdate(
      'Client',
      savedClient.id,
      oldValues,
      this.sanitizeClientForLog(savedClient),
      user,
    );

    // Send notifications
    await this.clientChangelogService.notifyClientUpdated(
      savedClient,
      oldValues,
      user,
    );

    return savedClient;
  }

  async remove(id: string, user: User): Promise<void> {
    const client = await this.findOne(id, user);
    const oldValues = this.sanitizeClientForLog(client);

    // Soft delete by setting isActive to false
    client.isActive = false;
    client.updatedById = user.id;
    await this.clientRepository.save(client);

    // Log change
    await this.changeLogService.logDelete(
      'Client',
      client.id,
      oldValues,
      user,
    );

    // Send notifications
    await this.clientChangelogService.notifyClientDeleted(client, user);
  }

  async hardDelete(id: string, user: User): Promise<void> {
    const client = await this.findOne(id, user);

    // Log permanent deletion for audit trail before removing
    this.logger.warn(
      `Permanent deletion of client`,
      {
        clientId: client.id,
        clientName: client.name,
        companyId: client.companyId,
        performedBy: user.id,
      },
    );

    // Record in changelog before permanent deletion
    await this.changeLogService.logDelete(
      'Client',
      client.id,
      { name: client.name, nip: client.nip, deletionType: 'permanent' },
      user,
    );

    await this.clientRepository.remove(client);
  }

  async restore(id: string, user: User): Promise<Client> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const client = await this.clientRepository.findOne({
      where: { id, companyId, isActive: false },
    });

    if (!client) {
      throw new ClientNotFoundException(id, companyId);
    }

    const oldValues = this.sanitizeClientForLog(client);

    client.isActive = true;
    client.updatedById = user.id;

    const savedClient = await this.clientRepository.save(client);

    // Log restore in changelog for audit consistency
    await this.changeLogService.logUpdate(
      'Client',
      savedClient.id,
      oldValues,
      this.sanitizeClientForLog(savedClient),
      user,
    );

    return savedClient;
  }

  /**
   * Bulk delete (soft delete) multiple clients.
   */
  async bulkDelete(dto: BulkDeleteClientsDto, user: User): Promise<BulkOperationResultDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Get clients that belong to this company and are active
    const clients = await this.clientRepository.find({
      where: {
        id: In(dto.clientIds),
        companyId,
        isActive: true,
      },
    });

    if (clients.length === 0) {
      return { affected: 0, requested: dto.clientIds.length };
    }

    // Soft delete each client and log the change
    for (const client of clients) {
      const oldValues = this.sanitizeClientForLog(client);
      client.isActive = false;
      client.updatedById = user.id;
      await this.clientRepository.save(client);

      await this.changeLogService.logDelete('Client', client.id, oldValues, user);
      await this.clientChangelogService.notifyClientDeleted(client, user);
    }

    this.logger.log(`Bulk deleted ${clients.length} clients`, {
      companyId,
      userId: user.id,
      clientIds: clients.map((c) => c.id),
    });

    return { affected: clients.length, requested: dto.clientIds.length };
  }

  /**
   * Bulk restore multiple deleted clients.
   */
  async bulkRestore(dto: BulkRestoreClientsDto, user: User): Promise<BulkOperationResultDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Get clients that belong to this company and are inactive
    const clients = await this.clientRepository.find({
      where: {
        id: In(dto.clientIds),
        companyId,
        isActive: false,
      },
    });

    if (clients.length === 0) {
      return { affected: 0, requested: dto.clientIds.length };
    }

    // Restore each client and log the change
    for (const client of clients) {
      const oldValues = this.sanitizeClientForLog(client);
      client.isActive = true;
      client.updatedById = user.id;
      await this.clientRepository.save(client);

      await this.changeLogService.logUpdate(
        'Client',
        client.id,
        oldValues,
        this.sanitizeClientForLog(client),
        user,
      );
    }

    this.logger.log(`Bulk restored ${clients.length} clients`, {
      companyId,
      userId: user.id,
      clientIds: clients.map((c) => c.id),
    });

    return { affected: clients.length, requested: dto.clientIds.length };
  }

  /**
   * Bulk edit multiple clients with the same values.
   */
  async bulkEdit(dto: BulkEditClientsDto, user: User): Promise<BulkOperationResultDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Get clients that belong to this company
    const clients = await this.clientRepository.find({
      where: {
        id: In(dto.clientIds),
        companyId,
        isActive: true,
      },
    });

    if (clients.length === 0) {
      return { affected: 0, requested: dto.clientIds.length };
    }

    // Build update payload from non-undefined values
    const updatePayload: Partial<Client> = {};
    if (dto.employmentType !== undefined) updatePayload.employmentType = dto.employmentType;
    if (dto.vatStatus !== undefined) updatePayload.vatStatus = dto.vatStatus;
    if (dto.taxScheme !== undefined) updatePayload.taxScheme = dto.taxScheme;
    if (dto.zusStatus !== undefined) updatePayload.zusStatus = dto.zusStatus;
    if (dto.receiveEmailCopy !== undefined) updatePayload.receiveEmailCopy = dto.receiveEmailCopy;

    if (Object.keys(updatePayload).length === 0) {
      return { affected: 0, requested: dto.clientIds.length };
    }

    // Update each client and log the change
    for (const client of clients) {
      const oldValues = this.sanitizeClientForLog(client);
      Object.assign(client, updatePayload);
      client.updatedById = user.id;
      await this.clientRepository.save(client);

      await this.changeLogService.logUpdate(
        'Client',
        client.id,
        oldValues,
        this.sanitizeClientForLog(client),
        user,
      );

      await this.clientChangelogService.notifyClientUpdated(client, oldValues, user);
    }

    this.logger.log(`Bulk edited ${clients.length} clients`, {
      companyId,
      userId: user.id,
      clientIds: clients.map((c) => c.id),
      changes: updatePayload,
    });

    return { affected: clients.length, requested: dto.clientIds.length };
  }

  /**
   * Apply custom field filters to the query builder.
   * Supports operators: eq, contains, gt, gte, lt, lte, in, contains_any
   *
   * Special handling for BOOLEAN eq:false - also matches clients without the field set (NULL).
   */
  private applyCustomFieldFilters(
    queryBuilder: ReturnType<typeof this.clientRepository.createQueryBuilder>,
    customFieldFilters: CustomFieldFilter[],
  ): void {
    customFieldFilters.forEach((filter, index) => {
      const alias = `cfv_${index}`;
      const fdAlias = `fd_${index}`;
      const { fieldId, operator, value } = filter;

      // Special handling for BOOLEAN eq:false - use LEFT JOIN to include clients without the field
      const isBooleanFalseFilter = operator === 'eq' && String(value).toLowerCase() === 'false';

      if (isBooleanFalseFilter) {
        // Use LEFT JOIN for BOOLEAN false filter to include NULL values
        queryBuilder.leftJoin(
          'client_custom_field_values',
          alias,
          `${alias}.clientId = client.id AND ${alias}.fieldDefinitionId = :fieldId_${index}`,
          { [`fieldId_${index}`]: fieldId },
        );

        // Match clients with value = 'false' OR no value set (NULL)
        queryBuilder.andWhere(
          `(${alias}.value = :value_${index} OR ${alias}.value IS NULL)`,
          { [`value_${index}`]: 'false' },
        );
        return; // Skip the rest of the switch for this filter
      }

      // Join the custom field values table for this specific filter
      queryBuilder.innerJoin(
        'client_custom_field_values',
        alias,
        `${alias}.clientId = client.id AND ${alias}.fieldDefinitionId = :fieldId_${index}`,
        { [`fieldId_${index}`]: fieldId },
      );

      // Join field definition to get the field type
      queryBuilder.innerJoin(
        'client_field_definitions',
        fdAlias,
        `${fdAlias}.id = ${alias}.fieldDefinitionId`,
      );

      // Apply the appropriate filter based on the operator
      switch (operator) {
        case 'eq':
          queryBuilder.andWhere(`${alias}.value = :value_${index}`, {
            [`value_${index}`]: String(value),
          });
          break;

        case 'contains':
          queryBuilder.andWhere(`${alias}.value ILIKE :value_${index}`, {
            [`value_${index}`]: `%${this.escapeLikePattern(String(value))}%`,
          });
          break;

        case 'gt':
          // For numeric comparison, cast to numeric
          queryBuilder.andWhere(`CAST(${alias}.value AS DECIMAL) > :value_${index}`, {
            [`value_${index}`]: parseFloat(String(value)),
          });
          break;

        case 'gte':
          queryBuilder.andWhere(`CAST(${alias}.value AS DECIMAL) >= :value_${index}`, {
            [`value_${index}`]: parseFloat(String(value)),
          });
          break;

        case 'lt':
          queryBuilder.andWhere(`CAST(${alias}.value AS DECIMAL) < :value_${index}`, {
            [`value_${index}`]: parseFloat(String(value)),
          });
          break;

        case 'lte':
          queryBuilder.andWhere(`CAST(${alias}.value AS DECIMAL) <= :value_${index}`, {
            [`value_${index}`]: parseFloat(String(value)),
          });
          break;

        case 'in':
          // For ENUM type - check if value is in the list
          const inValues = Array.isArray(value) ? value : String(value).split(',');
          queryBuilder.andWhere(`${alias}.value IN (:...values_${index})`, {
            [`values_${index}`]: inValues,
          });
          break;

        case 'contains_any':
          // For MULTISELECT - check if any of the values match
          const anyValues = Array.isArray(value) ? value : String(value).split(',');
          const conditions = anyValues.map((v, i) => `${alias}.value ILIKE :anyValue_${index}_${i}`);
          queryBuilder.andWhere(`(${conditions.join(' OR ')})`,
            anyValues.reduce((acc, v, i) => ({
              ...acc,
              [`anyValue_${index}_${i}`]: `%${this.escapeLikePattern(String(v))}%`,
            }), {}),
          );
          break;

        default:
          this.logger.warn(`Unknown custom field filter operator: ${operator}`);
      }
    });
  }

  private sanitizeClientForLog(client: Client): Record<string, unknown> {
    return {
      name: client.name,
      nip: client.nip,
      email: client.email,
      phone: client.phone,
      companyStartDate: client.companyStartDate,
      cooperationStartDate: client.cooperationStartDate,
      suspensionDate: client.suspensionDate,
      companySpecificity: client.companySpecificity,
      additionalInfo: client.additionalInfo,
      // Legacy fields (kept for backward compatibility)
      gtuCode: client.gtuCode,
      amlGroup: client.amlGroup,
      // New fields
      gtuCodes: client.gtuCodes,
      pkdCode: client.pkdCode,
      amlGroupEnum: client.amlGroupEnum,
      receiveEmailCopy: client.receiveEmailCopy,
      employmentType: client.employmentType,
      vatStatus: client.vatStatus,
      taxScheme: client.taxScheme,
      zusStatus: client.zusStatus,
      isActive: client.isActive,
    };
  }
}
