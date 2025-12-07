import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Client,
  User,
  Company,
  UserRole,
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
  AmlGroup,
} from '@accounting/common';
import { ChangeLogService } from '@accounting/infrastructure/change-log';
import { ClientChangelogService } from './client-changelog.service';
import { AutoAssignService } from './auto-assign.service';

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

export interface ClientFilters {
  search?: string;
  employmentType?: EmploymentType;
  vatStatus?: VatStatus;
  taxScheme?: TaxScheme;
  zusStatus?: ZusStatus;
  amlGroupEnum?: AmlGroup;
  gtuCode?: string;
  receiveEmailCopy?: boolean;
  isActive?: boolean;
}

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly changeLogService: ChangeLogService,
    private readonly clientChangelogService: ClientChangelogService,
    private readonly autoAssignService: AutoAssignService,
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

  async findAll(user: User, filters?: ClientFilters): Promise<Client[]> {
    const companyId = await this.getEffectiveCompanyId(user);

    const queryBuilder = this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.iconAssignments', 'iconAssignments')
      .leftJoinAndSelect('iconAssignments.icon', 'icon')
      .leftJoinAndSelect('client.customFieldValues', 'customFieldValues')
      .leftJoinAndSelect('customFieldValues.fieldDefinition', 'fieldDefinition')
      .where('client.companyId = :companyId', { companyId });

    if (filters?.search) {
      queryBuilder.andWhere(
        '(client.name ILIKE :search OR client.nip ILIKE :search OR client.email ILIKE :search)',
        { search: `%${filters.search}%` },
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

    queryBuilder.orderBy('client.name', 'ASC');

    return queryBuilder.getMany();
  }

  async findOne(id: string, user: User): Promise<Client> {
    const companyId = await this.getEffectiveCompanyId(user);

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
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async create(dto: CreateClientDto, user: User): Promise<Client> {
    const companyId = await this.getEffectiveCompanyId(user);

    const client = this.clientRepository.create({
      ...dto,
      companyId,
      createdById: user.id,
    });

    const savedClient = await this.clientRepository.save(client);

    // Evaluate and apply auto-assigned icons
    await this.autoAssignService.evaluateAndAssign(savedClient);

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
    const oldValues = this.sanitizeClientForLog(client);

    Object.assign(client, dto);
    client.updatedById = user.id;

    const savedClient = await this.clientRepository.save(client);

    // Re-evaluate and apply auto-assigned icons based on updated data
    await this.autoAssignService.evaluateAndAssign(savedClient);

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
    await this.clientRepository.remove(client);
  }

  async restore(id: string, user: User): Promise<Client> {
    const companyId = await this.getEffectiveCompanyId(user);

    const client = await this.clientRepository.findOne({
      where: { id, companyId, isActive: false },
    });

    if (!client) {
      throw new NotFoundException(`Inactive client with ID ${id} not found`);
    }

    client.isActive = true;
    client.updatedById = user.id;

    return this.clientRepository.save(client);
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
