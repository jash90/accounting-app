import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import {
  applyUpdate,
  Client,
  escapeLikePattern,
  isValidPkdCode,
  PaginatedResponseDto,
  User,
  type PkdCodeOption,
} from '@accounting/common';
import {
  calculatePagination,
  sanitizeForLog,
  SystemCompanyService,
} from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';

import { CLIENT_VALIDATION_MESSAGES } from '../constants';
import {
  ClientFiltersDto,
  CreateClientDto,
  CustomFieldFilter,
  UpdateClientDto,
} from '../dto/client.dto';
import { ClientNotFoundException } from '../exceptions';
import { AutoAssignService } from './auto-assign.service';
import { ClientChangelogService } from './client-changelog.service';
import { ClientPkdService } from './client-pkd.service';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly changeLogService: ChangeLogService,
    private readonly clientChangelogService: ClientChangelogService,
    private readonly autoAssignService: AutoAssignService,
    private readonly systemCompanyService: SystemCompanyService,
    private readonly clientPkdService: ClientPkdService
  ) {}

  /**
   * Search PKD codes server-side to avoid loading all ~659 codes at startup.
   * Searches by code prefix and name substring, returns top matches.
   *
   * @param search - Search term (matches code or name)
   * @param section - Optional section filter (e.g., 'A', 'B', 'C')
   * @param limit - Maximum results to return (default 50)
   * @returns Array of matching PKD codes
   */
  searchPkdCodes(search?: string, section?: string, limit = 50): PkdCodeOption[] {
    return this.clientPkdService.searchPkdCodes(search, section, limit);
  }

  getPkdSections(): Record<string, string> {
    return this.clientPkdService.getPkdSections();
  }

  async findAll(user: User, filters?: ClientFiltersDto): Promise<PaginatedResponseDto<Client>> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const { page, limit, skip } = calculatePagination(filters);

    const queryBuilder = this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.iconAssignments', 'iconAssignments')
      .leftJoinAndSelect('iconAssignments.icon', 'icon')
      .leftJoinAndSelect('client.customFieldValues', 'customFieldValues')
      .leftJoinAndSelect('customFieldValues.fieldDefinition', 'fieldDefinition')
      .where('client.companyId = :companyId', { companyId });

    if (filters?.search) {
      const escapedSearch = escapeLikePattern(filters.search);
      queryBuilder.andWhere(
        "(client.name ILIKE :search ESCAPE '\\' OR client.nip ILIKE :search ESCAPE '\\' OR client.email ILIKE :search ESCAPE '\\')",
        { search: `%${escapedSearch}%` }
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
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

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
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Normalize and validate PKD code if provided
    let normalizedPkdCode = dto.pkdCode?.trim();
    if (normalizedPkdCode === '') {
      normalizedPkdCode = undefined;
    }
    if (normalizedPkdCode && !isValidPkdCode(normalizedPkdCode)) {
      throw new BadRequestException(
        `${CLIENT_VALIDATION_MESSAGES.INVALID_PKD_CODE}: ${normalizedPkdCode}`
      );
    }

    // FIX-06: Wrap create + audit log in transaction for data consistency
    const savedClient = await this.dataSource.transaction(async (manager) => {
      const clientRepo = manager.getRepository(Client);
      const client = clientRepo.create({
        ...dto,
        pkdCode: normalizedPkdCode,
        companyId,
        createdById: user.id,
      });

      const saved = await clientRepo.save(client);

      // Audit log inside transaction — ensures consistency
      await this.changeLogService.logCreate(
        'Client',
        saved.id,
        this.sanitizeClientForLog(saved),
        user
      );

      return saved;
    });

    // Non-critical side effects AFTER transaction commit
    try {
      await this.autoAssignService.evaluateAndAssign(savedClient);
    } catch (error) {
      this.logger.warn(`Failed to auto-assign icons for client after creation`, {
        clientId: savedClient.id,
        companyId: savedClient.companyId,
        userId: user.id,
        error: (error as Error).message,
      });
    }

    // Fire-and-forget notifications
    await this.clientChangelogService.notifyClientCreated(savedClient, user);

    return savedClient;
  }

  async update(id: string, dto: UpdateClientDto, user: User): Promise<Client> {
    const client = await this.findOne(id, user);

    // Normalize and validate PKD code if provided
    let normalizedPkdCode = dto.pkdCode?.trim();
    if (normalizedPkdCode === '') {
      normalizedPkdCode = undefined;
    }
    if (normalizedPkdCode && !isValidPkdCode(normalizedPkdCode)) {
      throw new BadRequestException(
        `${CLIENT_VALIDATION_MESSAGES.INVALID_PKD_CODE}: ${normalizedPkdCode}`
      );
    }

    const oldValues = this.sanitizeClientForLog(client);

    applyUpdate(client, { ...dto, pkdCode: normalizedPkdCode }, [
      'id',
      'companyId',
      'createdById',
      'createdAt',
      'updatedAt',
    ]);
    client.updatedById = user.id;

    // FIX-06: Wrap update + audit log in transaction for data consistency
    const savedClient = await this.dataSource.transaction(async (manager) => {
      const clientRepo = manager.getRepository(Client);
      const saved = await clientRepo.save(client);

      // Audit log inside transaction — ensures consistency
      await this.changeLogService.logUpdate(
        'Client',
        saved.id,
        oldValues,
        this.sanitizeClientForLog(saved),
        user
      );

      return saved;
    });

    // Non-critical side effects AFTER transaction commit
    try {
      await this.autoAssignService.evaluateAndAssign(savedClient);
    } catch (error) {
      this.logger.warn(`Failed to auto-assign icons for client after update`, {
        clientId: savedClient.id,
        companyId: savedClient.companyId,
        userId: user.id,
        error: (error as Error).message,
      });
    }

    // Fire-and-forget notifications
    await this.clientChangelogService.notifyClientUpdated(savedClient, oldValues, user);

    return savedClient;
  }

  async softDeleteClient(id: string, user: User): Promise<void> {
    const client = await this.findOne(id, user);
    const oldValues = this.sanitizeClientForLog(client);

    // Soft delete by setting isActive to false
    client.isActive = false;
    client.updatedById = user.id;
    await this.clientRepository.save(client);

    // Log change
    await this.changeLogService.logDelete('Client', client.id, oldValues, user);

    // Send notifications
    await this.clientChangelogService.notifyClientDeleted(client, user);
  }

  async hardDelete(id: string, user: User): Promise<void> {
    const client = await this.findOne(id, user);

    // Log permanent deletion for audit trail before removing
    this.logger.warn(`Permanent deletion of client`, {
      clientId: client.id,
      clientName: client.name,
      companyId: client.companyId,
      performedBy: user.id,
    });

    // Record in changelog before permanent deletion
    await this.changeLogService.logDelete(
      'Client',
      client.id,
      { name: client.name, nip: client.nip, deletionType: 'permanent' },
      user
    );

    await this.clientRepository.remove(client);
  }

  async restore(id: string, user: User): Promise<Client> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

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
      user
    );

    return savedClient;
  }

  /**
   * Apply custom field filters to the query builder.
   * Supports operators: eq, contains, gt, gte, lt, lte, in, contains_any
   *
   * Special handling for BOOLEAN eq:false - also matches clients without the field set (NULL).
   */
  private applyCustomFieldFilters(
    queryBuilder: ReturnType<typeof this.clientRepository.createQueryBuilder>,
    customFieldFilters: CustomFieldFilter[]
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
          { [`fieldId_${index}`]: fieldId }
        );

        // Match clients with value = 'false' OR no value set (NULL)
        queryBuilder.andWhere(`(${alias}.value = :value_${index} OR ${alias}.value IS NULL)`, {
          [`value_${index}`]: 'false',
        });
        return; // Skip the rest of the switch for this filter
      }

      // Join the custom field values table for this specific filter
      queryBuilder.innerJoin(
        'client_custom_field_values',
        alias,
        `${alias}.clientId = client.id AND ${alias}.fieldDefinitionId = :fieldId_${index}`,
        { [`fieldId_${index}`]: fieldId }
      );

      // Join field definition to get the field type
      queryBuilder.innerJoin(
        'client_field_definitions',
        fdAlias,
        `${fdAlias}.id = ${alias}.fieldDefinitionId`
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
            [`value_${index}`]: `%${escapeLikePattern(String(value))}%`,
          });
          break;

        case 'gt':
        case 'gte':
        case 'lt':
        case 'lte': {
          // Validate numeric value before comparison to prevent database errors
          const numericValue = parseFloat(String(value));
          if (isNaN(numericValue)) {
            this.logger.warn(`Invalid numeric value for operator ${operator}: ${value}`);
            break;
          }

          // Numeric comparisons require DECIMAL cast - ensure field type is NUMBER
          // by adding a condition that only matches if the value can be cast
          const comparisonOp =
            operator === 'gt' ? '>' : operator === 'gte' ? '>=' : operator === 'lt' ? '<' : '<=';
          queryBuilder.andWhere(`CAST(${alias}.value AS DECIMAL) ${comparisonOp} :value_${index}`, {
            [`value_${index}`]: numericValue,
          });
          break;
        }

        case 'in': {
          // For ENUM type - check if value is in the list
          const inValues = Array.isArray(value) ? value : String(value).split(',');
          queryBuilder.andWhere(`${alias}.value IN (:...values_${index})`, {
            [`values_${index}`]: inValues,
          });
          break;
        }

        case 'contains_any': {
          // For MULTISELECT - check if any of the values match
          const anyValues = Array.isArray(value) ? value : String(value).split(',');
          const conditions = anyValues.map(
            (v, i) => `${alias}.value ILIKE :anyValue_${index}_${i}`
          );
          queryBuilder.andWhere(
            `(${conditions.join(' OR ')})`,
            anyValues.reduce(
              (acc, v, i) => ({
                ...acc,
                [`anyValue_${index}_${i}`]: `%${escapeLikePattern(String(v))}%`,
              }),
              {}
            )
          );
          break;
        }

        default:
          this.logger.warn(`Unknown custom field filter operator: ${operator}`);
      }
    });
  }

  private sanitizeClientForLog(client: Client): Record<string, unknown> {
    return sanitizeForLog(client, [
      'name',
      'nip',
      'email',
      'phone',
      'companyStartDate',
      'cooperationStartDate',
      'companySpecificity',
      'additionalInfo',
      // Legacy fields (kept for backward compatibility)
      'gtuCode',
      'amlGroup',
      // New fields
      'gtuCodes',
      'pkdCode',
      'amlGroupEnum',
      'receiveEmailCopy',
      'employmentType',
      'vatStatus',
      'taxScheme',
      'zusStatus',
      'isActive',
    ]);
  }
}
