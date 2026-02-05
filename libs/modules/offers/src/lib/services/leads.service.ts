import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Brackets, DataSource, Repository } from 'typeorm';

import { Client, isForeignKeyViolation, Lead, LeadStatus, User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import {
  ConvertLeadToClientDto,
  CreateLeadDto,
  LeadFiltersDto,
  UpdateLeadDto,
} from '../dto/lead.dto';
import { LeadStatisticsDto, PaginatedLeadsResponseDto } from '../dto/offer-response.dto';
import {
  LeadAlreadyConvertedException,
  LeadHasOffersException,
  LeadNotFoundException,
} from '../exceptions/offer.exception';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly systemCompanyService: SystemCompanyService,
    private readonly dataSource: DataSource
  ) {}

  private async getCompanyId(user: User): Promise<string> {
    return this.systemCompanyService.getCompanyIdForUser(user);
  }

  async findAll(user: User, filters: LeadFiltersDto): Promise<PaginatedLeadsResponseDto> {
    const companyId = await this.getCompanyId(user);
    const {
      page = 1,
      limit = 20,
      search,
      status,
      source,
      assignedToId,
      createdFrom,
      createdTo,
    } = filters;

    const query = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
      .leftJoinAndSelect('lead.createdBy', 'createdBy')
      .where('lead.companyId = :companyId', { companyId });

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('lead.name ILIKE :search', { search: `%${search}%` })
            .orWhere('lead.email ILIKE :search', { search: `%${search}%` })
            .orWhere('lead.nip ILIKE :search', { search: `%${search}%` })
            .orWhere('lead.contactPerson ILIKE :search', { search: `%${search}%` });
        })
      );
    }

    if (status) {
      query.andWhere('lead.status = :status', { status });
    }

    if (source) {
      query.andWhere('lead.source = :source', { source });
    }

    if (assignedToId) {
      query.andWhere('lead.assignedToId = :assignedToId', { assignedToId });
    }

    if (createdFrom) {
      query.andWhere('lead.createdAt >= :createdFrom', { createdFrom });
    }

    if (createdTo) {
      query.andWhere('lead.createdAt <= :createdTo', { createdTo });
    }

    query.orderBy('lead.createdAt', 'DESC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: User): Promise<Lead> {
    const companyId = await this.getCompanyId(user);

    const lead = await this.leadRepository.findOne({
      where: { id, companyId },
      relations: ['assignedTo', 'createdBy', 'updatedBy'],
    });

    if (!lead) {
      throw new LeadNotFoundException(id);
    }

    return lead;
  }

  async create(dto: CreateLeadDto, user: User): Promise<Lead> {
    const companyId = await this.getCompanyId(user);

    const lead = this.leadRepository.create({
      ...dto,
      companyId,
      createdById: user.id,
      status: LeadStatus.NEW,
    });

    return this.leadRepository.save(lead);
  }

  async update(id: string, dto: UpdateLeadDto, user: User): Promise<Lead> {
    const lead = await this.findOne(id, user);

    if (lead.convertedToClientId) {
      throw new LeadAlreadyConvertedException(id);
    }

    Object.assign(lead, dto, { updatedById: user.id });
    return this.leadRepository.save(lead);
  }

  async remove(id: string, user: User): Promise<void> {
    const lead = await this.findOne(id, user);
    try {
      await this.leadRepository.remove(lead);
    } catch (error: unknown) {
      // Check if it's a foreign key constraint violation (works across PostgreSQL, MySQL, SQLite)
      if (isForeignKeyViolation(error)) {
        throw new LeadHasOffersException(id);
      }
      throw error;
    }
  }

  /**
   * Converts a lead to a client.
   *
   * ## Data Mapping
   * The following lead fields are mapped to the new client:
   * - `name` → `client.name` (can be overridden via `dto.clientName`)
   * - `nip` → `client.nip`
   * - `email` → `client.email`
   * - `phone` → `client.phone`
   *
   * ## Fields NOT Mapped
   *
   * ### Intentionally Not Mapped (Lead-specific lifecycle data)
   * The following fields are NOT transferred to the client as they represent
   * lead lifecycle data that isn't relevant to the client profile:
   * - `contactPerson`, `contactPosition` - Lead contact info (client may have different primary contact)
   * - `source` - Lead acquisition source (not relevant for ongoing client relationship)
   * - `estimatedValue` - Lead estimation (client will have actual billing data)
   * - `notes` - Lead-specific notes (start fresh with client relationship notes)
   * - `assignedTo` - Lead assignment (client workflow is different)
   *
   * ### Not Mapped Due to Schema Differences
   * The Client entity does not currently have address/location fields.
   * The following Lead fields are lost during conversion:
   * - `regon` - Polish business registration number
   * - `street` - Street address
   * - `postalCode` - Postal code
   * - `city` - City
   * - `country` - Country
   *
   * NOTE: If address fields are needed on clients, consider adding them to the
   * Client entity or using custom fields to store this information.
   *
   * @param id - The lead ID to convert
   * @param dto - Optional overrides for the new client
   * @param user - The user performing the conversion
   * @returns The updated lead and newly created client
   */
  async convertToClient(
    id: string,
    dto: ConvertLeadToClientDto,
    user: User
  ): Promise<{ lead: Lead; client: Client }> {
    const lead = await this.findOne(id, user);

    if (lead.convertedToClientId) {
      throw new LeadAlreadyConvertedException(id);
    }

    const companyId = await this.getCompanyId(user);

    // Use transaction to ensure atomicity of client creation and lead update
    return this.dataSource.transaction(async (manager) => {
      // Create client from lead data
      // NOTE: Address fields (street, postalCode, city, country, regon) are NOT
      // mapped because the Client entity doesn't have these columns.
      // See JSDoc above for full data mapping documentation.
      const client = manager.create(Client, {
        name: dto.clientName || lead.name,
        nip: lead.nip,
        email: lead.email,
        phone: lead.phone,
        companyId,
        createdById: user.id,
        isActive: true,
      });

      const savedClient = await manager.save(Client, client);

      // Update lead with conversion info
      lead.convertedToClientId = savedClient.id;
      lead.convertedAt = new Date();
      lead.status = LeadStatus.CONVERTED;
      lead.updatedById = user.id;

      const savedLead = await manager.save(Lead, lead);

      return { lead: savedLead, client: savedClient };
    });
  }

  async getStatistics(user: User): Promise<LeadStatisticsDto> {
    const companyId = await this.getCompanyId(user);

    const stats = await this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('lead.companyId = :companyId', { companyId })
      .groupBy('lead.status')
      .getRawMany();

    const statusCounts: Record<string, number> = {};
    let totalLeads = 0;

    for (const stat of stats) {
      statusCounts[stat.status] = parseInt(stat.count, 10);
      totalLeads += parseInt(stat.count, 10);
    }

    const convertedCount = statusCounts[LeadStatus.CONVERTED] || 0;
    const lostCount = statusCounts[LeadStatus.LOST] || 0;
    const finishedLeads = convertedCount + lostCount;
    const conversionRate = finishedLeads > 0 ? (convertedCount / finishedLeads) * 100 : 0;

    return {
      totalLeads,
      newCount: statusCounts[LeadStatus.NEW] || 0,
      contactedCount: statusCounts[LeadStatus.CONTACTED] || 0,
      qualifiedCount: statusCounts[LeadStatus.QUALIFIED] || 0,
      proposalSentCount: statusCounts[LeadStatus.PROPOSAL_SENT] || 0,
      negotiationCount: statusCounts[LeadStatus.NEGOTIATION] || 0,
      convertedCount,
      lostCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }
}
