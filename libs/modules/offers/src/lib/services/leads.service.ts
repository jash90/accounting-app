import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Brackets, Repository } from 'typeorm';

import { Client, Company, Lead, LeadStatus, User, UserRole } from '@accounting/common';

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
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>
  ) {}

  private async getCompanyId(user: User): Promise<string> {
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.companyRepository.findOneOrFail({
        where: { name: 'System Admin Company' },
      });
      return systemCompany.id;
    }
    return user.companyId!;
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
      // Check if it's a foreign key constraint violation (PostgreSQL error code 23503)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
        throw new LeadHasOffersException(id);
      }
      throw error;
    }
  }

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

    // Create client from lead data
    const client = this.clientRepository.create({
      name: dto.clientName || lead.name,
      nip: lead.nip,
      email: lead.email,
      phone: lead.phone,
      companyId,
      createdById: user.id,
      isActive: true,
    });

    const savedClient = await this.clientRepository.save(client);

    // Update lead with conversion info
    lead.convertedToClientId = savedClient.id;
    lead.convertedAt = new Date();
    lead.status = LeadStatus.CONVERTED;
    lead.updatedById = user.id;

    const savedLead = await this.leadRepository.save(lead);

    return { lead: savedLead, client: savedClient };
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
