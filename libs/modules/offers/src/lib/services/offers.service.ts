import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Brackets, Repository } from 'typeorm';

import {
  Client,
  Company,
  Lead,
  LeadStatus,
  Offer,
  OfferActivity,
  OfferStatus,
  OfferTemplate,
  RecipientSnapshot,
  User,
  UserRole,
} from '@accounting/common';
import { StorageService } from '@accounting/infrastructure/storage';

import { DocxGenerationService } from './docx-generation.service';
import { LeadsService } from './leads.service';
import { OfferActivityService } from './offer-activity.service';
import { OfferEmailService } from './offer-email.service';
import { OfferNumberingService } from './offer-numbering.service';
import { OfferTemplatesService } from './offer-templates.service';
import { OfferStatisticsDto, PaginatedOffersResponseDto } from '../dto/offer-response.dto';
import {
  CreateOfferDto,
  DuplicateOfferDto,
  OfferFiltersDto,
  SendOfferDto,
  UpdateOfferDto,
  UpdateOfferStatusDto,
} from '../dto/offer.dto';
import {
  OfferCannotModifyException,
  OfferInvalidStatusTransitionException,
  OfferNoRecipientException,
  OfferNotFoundException,
} from '../exceptions/offer.exception';

// Valid status transitions
const VALID_STATUS_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  [OfferStatus.DRAFT]: [OfferStatus.READY, OfferStatus.CANCELLED],
  [OfferStatus.READY]: [OfferStatus.DRAFT, OfferStatus.SENT, OfferStatus.CANCELLED],
  [OfferStatus.SENT]: [
    OfferStatus.VIEWED,
    OfferStatus.ACCEPTED,
    OfferStatus.REJECTED,
    OfferStatus.EXPIRED,
    OfferStatus.CANCELLED,
  ],
  [OfferStatus.VIEWED]: [
    OfferStatus.ACCEPTED,
    OfferStatus.REJECTED,
    OfferStatus.EXPIRED,
    OfferStatus.CANCELLED,
  ],
  [OfferStatus.ACCEPTED]: [],
  [OfferStatus.REJECTED]: [],
  [OfferStatus.EXPIRED]: [],
  [OfferStatus.CANCELLED]: [OfferStatus.DRAFT],
};

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(OfferTemplate)
    private readonly templateRepository: Repository<OfferTemplate>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly offerNumberingService: OfferNumberingService,
    private readonly offerActivityService: OfferActivityService,
    private readonly offerTemplatesService: OfferTemplatesService,
    private readonly docxGenerationService: DocxGenerationService,
    private readonly offerEmailService: OfferEmailService,
    private readonly leadsService: LeadsService,
    private readonly storageService: StorageService
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

  /**
   * Builds recipient snapshot from client or lead
   */
  private buildRecipientSnapshot(client?: Client | null, lead?: Lead | null): RecipientSnapshot {
    if (client) {
      return {
        name: client.name,
        nip: client.nip,
        email: client.email,
        phone: client.phone,
      };
    }

    if (lead) {
      return {
        name: lead.name,
        nip: lead.nip,
        regon: lead.regon,
        street: lead.street,
        postalCode: lead.postalCode,
        city: lead.city,
        country: lead.country,
        contactPerson: lead.contactPerson,
        contactPosition: lead.contactPosition,
        email: lead.email,
        phone: lead.phone,
      };
    }

    throw new OfferNoRecipientException();
  }

  /**
   * Calculates offer totals from service items
   */
  private calculateTotals(
    dto: CreateOfferDto | UpdateOfferDto,
    vatRate: number
  ): { totalNetAmount: number; totalGrossAmount: number } {
    let totalNetAmount = 0;

    if (dto.serviceTerms?.items) {
      for (const item of dto.serviceTerms.items) {
        totalNetAmount += item.unitPrice * item.quantity;
      }
    }

    const totalGrossAmount = totalNetAmount * (1 + vatRate / 100);

    return {
      totalNetAmount: Math.round(totalNetAmount * 100) / 100,
      totalGrossAmount: Math.round(totalGrossAmount * 100) / 100,
    };
  }

  async findAll(user: User, filters: OfferFiltersDto): Promise<PaginatedOffersResponseDto> {
    const companyId = await this.getCompanyId(user);
    const {
      page = 1,
      limit = 20,
      search,
      status,
      statuses,
      clientId,
      leadId,
      offerDateFrom,
      offerDateTo,
      validUntilFrom,
      validUntilTo,
      minAmount,
      maxAmount,
    } = filters;

    const query = this.offerRepository
      .createQueryBuilder('offer')
      .leftJoinAndSelect('offer.client', 'client')
      .leftJoinAndSelect('offer.lead', 'lead')
      .leftJoinAndSelect('offer.template', 'template')
      .leftJoinAndSelect('offer.createdBy', 'createdBy')
      .leftJoinAndSelect('offer.sentBy', 'sentBy')
      .where('offer.companyId = :companyId', { companyId });

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('offer.offerNumber ILIKE :search', { search: `%${search}%` })
            .orWhere('offer.title ILIKE :search', { search: `%${search}%` })
            .orWhere("offer.recipientSnapshot->>'name' ILIKE :search", { search: `%${search}%` });
        })
      );
    }

    if (status) {
      query.andWhere('offer.status = :status', { status });
    }

    if (statuses && statuses.length > 0) {
      query.andWhere('offer.status IN (:...statuses)', { statuses });
    }

    if (clientId) {
      query.andWhere('offer.clientId = :clientId', { clientId });
    }

    if (leadId) {
      query.andWhere('offer.leadId = :leadId', { leadId });
    }

    if (offerDateFrom) {
      query.andWhere('offer.offerDate >= :offerDateFrom', { offerDateFrom });
    }

    if (offerDateTo) {
      query.andWhere('offer.offerDate <= :offerDateTo', { offerDateTo });
    }

    if (validUntilFrom) {
      query.andWhere('offer.validUntil >= :validUntilFrom', { validUntilFrom });
    }

    if (validUntilTo) {
      query.andWhere('offer.validUntil <= :validUntilTo', { validUntilTo });
    }

    if (minAmount !== undefined) {
      query.andWhere('offer.totalNetAmount >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      query.andWhere('offer.totalNetAmount <= :maxAmount', { maxAmount });
    }

    query.orderBy('offer.createdAt', 'DESC');

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

  async findOne(id: string, user: User): Promise<Offer> {
    const companyId = await this.getCompanyId(user);

    const offer = await this.offerRepository.findOne({
      where: { id, companyId },
      relations: ['client', 'lead', 'template', 'createdBy', 'updatedBy', 'sentBy'],
    });

    if (!offer) {
      throw new OfferNotFoundException(id);
    }

    return offer;
  }

  async create(dto: CreateOfferDto, user: User): Promise<Offer> {
    const companyId = await this.getCompanyId(user);

    // Get recipient (client or lead)
    let client: Client | null = null;
    let lead: Lead | null = null;

    if (dto.clientId) {
      client = await this.clientRepository.findOne({
        where: { id: dto.clientId, companyId },
      });
    }

    if (dto.leadId) {
      lead = await this.leadRepository.findOne({
        where: { id: dto.leadId, companyId },
      });
    }

    if (!client && !lead) {
      throw new OfferNoRecipientException();
    }

    // Build recipient snapshot
    const recipientSnapshot = this.buildRecipientSnapshot(client, lead);

    // Generate offer number
    const offerNumber = await this.offerNumberingService.generateOfferNumber(companyId);

    // Get template defaults if template is provided
    let template: OfferTemplate | null = null;
    let vatRate = dto.vatRate ?? 23;
    let validityDays = dto.validityDays ?? 30;

    if (dto.templateId) {
      template = await this.templateRepository.findOne({
        where: { id: dto.templateId, companyId },
      });
      if (template) {
        vatRate = dto.vatRate ?? template.defaultVatRate;
        validityDays = dto.validityDays ?? template.defaultValidityDays;
      }
    }

    // Calculate dates
    const offerDate = dto.offerDate ? new Date(dto.offerDate) : new Date();
    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : new Date(offerDate.getTime() + validityDays * 24 * 60 * 60 * 1000);

    // Calculate totals
    const { totalNetAmount, totalGrossAmount } = this.calculateTotals(dto, vatRate);

    // Prepare service terms with net amounts
    let serviceTerms = dto.serviceTerms;
    if (serviceTerms?.items) {
      serviceTerms = {
        ...serviceTerms,
        items: serviceTerms.items.map((item) => ({
          ...item,
          netAmount: Math.round(item.unitPrice * item.quantity * 100) / 100,
        })),
      };
    }

    // Create offer
    const offer = this.offerRepository.create({
      offerNumber,
      title: dto.title,
      description: dto.description,
      status: OfferStatus.DRAFT,
      clientId: client?.id,
      leadId: lead?.id,
      recipientSnapshot,
      templateId: template?.id,
      totalNetAmount,
      vatRate,
      totalGrossAmount,
      serviceTerms,
      customPlaceholders: dto.customPlaceholders,
      offerDate,
      validUntil,
      companyId,
      createdById: user.id,
    });

    const savedOffer = await this.offerRepository.save(offer);

    // Log activity
    await this.offerActivityService.logCreated(savedOffer, user);

    return this.findOne(savedOffer.id, user);
  }

  async update(id: string, dto: UpdateOfferDto, user: User): Promise<Offer> {
    const offer = await this.findOne(id, user);

    // Check if offer can be modified
    if (![OfferStatus.DRAFT, OfferStatus.READY].includes(offer.status)) {
      throw new OfferCannotModifyException(offer.status);
    }

    const companyId = await this.getCompanyId(user);

    // Track changes
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    // Update recipient if changed
    if (dto.clientId !== undefined || dto.leadId !== undefined) {
      let client: Client | null = null;
      let lead: Lead | null = null;

      if (dto.clientId) {
        client = await this.clientRepository.findOne({
          where: { id: dto.clientId, companyId },
        });
      } else if (dto.leadId) {
        lead = await this.leadRepository.findOne({
          where: { id: dto.leadId, companyId },
        });
      }

      if (client || lead) {
        const newSnapshot = this.buildRecipientSnapshot(client, lead);
        changes['recipient'] = { old: offer.recipientSnapshot, new: newSnapshot };
        offer.recipientSnapshot = newSnapshot;
        offer.clientId = client?.id || undefined;
        offer.leadId = lead?.id || undefined;
      }
    }

    // Update other fields
    if (dto.title !== undefined && dto.title !== offer.title) {
      changes['title'] = { old: offer.title, new: dto.title };
      offer.title = dto.title;
    }

    if (dto.description !== undefined && dto.description !== offer.description) {
      changes['description'] = { old: offer.description, new: dto.description };
      offer.description = dto.description;
    }

    if (dto.templateId !== undefined && dto.templateId !== offer.templateId) {
      changes['templateId'] = { old: offer.templateId, new: dto.templateId };
      offer.templateId = dto.templateId || undefined;
    }

    if (dto.vatRate !== undefined && dto.vatRate !== Number(offer.vatRate)) {
      changes['vatRate'] = { old: offer.vatRate, new: dto.vatRate };
      offer.vatRate = dto.vatRate;
    }

    if (dto.serviceTerms !== undefined) {
      changes['serviceTerms'] = { old: offer.serviceTerms, new: dto.serviceTerms };
      offer.serviceTerms = {
        ...dto.serviceTerms,
        items: dto.serviceTerms.items.map((item) => ({
          ...item,
          netAmount: Math.round(item.unitPrice * item.quantity * 100) / 100,
        })),
      };
    }

    if (dto.customPlaceholders !== undefined) {
      offer.customPlaceholders = dto.customPlaceholders;
    }

    if (dto.offerDate !== undefined) {
      offer.offerDate = new Date(dto.offerDate);
    }

    if (dto.validUntil !== undefined) {
      offer.validUntil = new Date(dto.validUntil);
    }

    // Recalculate totals
    const { totalNetAmount, totalGrossAmount } = this.calculateTotals(
      { serviceTerms: offer.serviceTerms } as CreateOfferDto,
      Number(offer.vatRate)
    );

    if (totalNetAmount !== Number(offer.totalNetAmount)) {
      changes['totalNetAmount'] = { old: offer.totalNetAmount, new: totalNetAmount };
      offer.totalNetAmount = totalNetAmount;
    }

    if (totalGrossAmount !== Number(offer.totalGrossAmount)) {
      changes['totalGrossAmount'] = { old: offer.totalGrossAmount, new: totalGrossAmount };
      offer.totalGrossAmount = totalGrossAmount;
    }

    offer.updatedById = user.id;

    const savedOffer = await this.offerRepository.save(offer);

    // Log activity if there were changes
    if (Object.keys(changes).length > 0) {
      await this.offerActivityService.logUpdated(savedOffer, user, changes);
    }

    return this.findOne(savedOffer.id, user);
  }

  async updateStatus(id: string, dto: UpdateOfferStatusDto, user: User): Promise<Offer> {
    const offer = await this.findOne(id, user);

    // Validate status transition
    const validTransitions = VALID_STATUS_TRANSITIONS[offer.status];
    if (!validTransitions.includes(dto.status)) {
      throw new OfferInvalidStatusTransitionException(offer.status, dto.status);
    }

    const previousStatus = offer.status;
    offer.status = dto.status;
    offer.updatedById = user.id;

    const savedOffer = await this.offerRepository.save(offer);

    // Log activity
    await this.offerActivityService.logStatusChanged(savedOffer, user, previousStatus, dto.status);

    return this.findOne(savedOffer.id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const offer = await this.findOne(id, user);

    // Delete generated document if exists
    if (offer.generatedDocumentPath) {
      try {
        await this.storageService.deleteFile(offer.generatedDocumentPath);
      } catch {
        // Ignore deletion errors
      }
    }

    await this.offerRepository.remove(offer);
  }

  async generateDocument(id: string, user: User): Promise<Offer> {
    const offer = await this.findOne(id, user);

    // Get template if available
    let template: OfferTemplate | null = null;
    if (offer.templateId) {
      template = await this.templateRepository.findOne({
        where: { id: offer.templateId },
      });
    }

    // Generate document
    let documentBuffer: Buffer;

    if (template?.templateFilePath) {
      documentBuffer = await this.docxGenerationService.generateFromTemplate(
        template,
        offer,
        offer.customPlaceholders || undefined
      );
    } else {
      documentBuffer = await this.docxGenerationService.generateSimpleDocument(offer);
    }

    // Save document to storage
    const fileName = `Oferta_${offer.offerNumber.replace(/\//g, '_')}.docx`;
    const storagePath = `offers/${offer.companyId}/${offer.id}`;
    const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const result = await this.storageService.uploadBuffer(
      documentBuffer,
      fileName,
      storagePath,
      mimeType
    );
    const filePath = result.path;

    // Update offer
    offer.generatedDocumentPath = filePath;
    offer.generatedDocumentName = fileName;
    offer.updatedById = user.id;

    const savedOffer = await this.offerRepository.save(offer);

    // Log activity
    await this.offerActivityService.logDocumentGenerated(savedOffer, user, filePath);

    return this.findOne(savedOffer.id, user);
  }

  async downloadDocument(id: string, user: User): Promise<{ buffer: Buffer; fileName: string }> {
    const offer = await this.findOne(id, user);

    if (!offer.generatedDocumentPath) {
      throw new OfferNotFoundException(id);
    }

    const buffer = await this.storageService.downloadFile(offer.generatedDocumentPath);
    return {
      buffer,
      fileName: offer.generatedDocumentName || `Oferta_${offer.offerNumber}.docx`,
    };
  }

  async sendOffer(id: string, dto: SendOfferDto, user: User): Promise<Offer> {
    const offer = await this.findOne(id, user);

    // Send email
    const { sentAt } = await this.offerEmailService.sendOffer(offer, dto, user);

    // Update offer
    offer.sentAt = sentAt;
    offer.sentToEmail = dto.email;
    offer.sentById = user.id;
    offer.emailSubject = dto.subject;
    offer.emailBody = dto.body;
    offer.status = OfferStatus.SENT;
    offer.updatedById = user.id;

    const savedOffer = await this.offerRepository.save(offer);

    // Log activity
    await this.offerActivityService.logEmailSent(
      savedOffer,
      user,
      dto.email,
      dto.subject || `Oferta ${offer.offerNumber}`
    );

    // Update lead status if sending to a lead
    if (offer.leadId) {
      await this.leadsService.update(offer.leadId, { status: LeadStatus.PROPOSAL_SENT }, user);
    }

    return this.findOne(savedOffer.id, user);
  }

  async duplicate(id: string, dto: DuplicateOfferDto, user: User): Promise<Offer> {
    const sourceOffer = await this.findOne(id, user);
    const companyId = await this.getCompanyId(user);

    // Determine recipient
    let clientId = dto.clientId || sourceOffer.clientId;
    let leadId = dto.leadId || sourceOffer.leadId;
    let recipientSnapshot = sourceOffer.recipientSnapshot;

    if (dto.clientId) {
      const client = await this.clientRepository.findOne({
        where: { id: dto.clientId, companyId },
      });
      if (client) {
        recipientSnapshot = this.buildRecipientSnapshot(client, null);
        leadId = undefined;
      }
    } else if (dto.leadId) {
      const lead = await this.leadRepository.findOne({
        where: { id: dto.leadId, companyId },
      });
      if (lead) {
        recipientSnapshot = this.buildRecipientSnapshot(null, lead);
        clientId = undefined;
      }
    }

    // Generate new offer number
    const offerNumber = await this.offerNumberingService.generateOfferNumber(companyId);

    // Calculate new dates
    const offerDate = new Date();
    const validityDays = Math.ceil(
      (new Date(sourceOffer.validUntil).getTime() - new Date(sourceOffer.offerDate).getTime()) /
        (24 * 60 * 60 * 1000)
    );
    const validUntil = new Date(offerDate.getTime() + validityDays * 24 * 60 * 60 * 1000);

    // Create duplicate
    const newOffer = this.offerRepository.create({
      offerNumber,
      title: dto.title || sourceOffer.title,
      description: sourceOffer.description,
      status: OfferStatus.DRAFT,
      clientId,
      leadId,
      recipientSnapshot,
      templateId: sourceOffer.templateId,
      totalNetAmount: sourceOffer.totalNetAmount,
      vatRate: sourceOffer.vatRate,
      totalGrossAmount: sourceOffer.totalGrossAmount,
      serviceTerms: sourceOffer.serviceTerms,
      customPlaceholders: sourceOffer.customPlaceholders,
      offerDate,
      validUntil,
      companyId,
      createdById: user.id,
    });

    const savedOffer = await this.offerRepository.save(newOffer);

    // Log activity
    await this.offerActivityService.logDuplicated(savedOffer, user, sourceOffer.id);

    return this.findOne(savedOffer.id, user);
  }

  async getActivities(id: string, user: User): Promise<OfferActivity[]> {
    const offer = await this.findOne(id, user);
    return this.offerActivityService.getOfferActivities(offer.id, offer.companyId);
  }

  async getStatistics(user: User): Promise<OfferStatisticsDto> {
    const companyId = await this.getCompanyId(user);

    const stats = await this.offerRepository
      .createQueryBuilder('offer')
      .select('offer.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(offer.totalNetAmount), 0)', 'totalValue')
      .where('offer.companyId = :companyId', { companyId })
      .groupBy('offer.status')
      .getRawMany();

    const statusCounts: Record<string, number> = {};
    const statusValues: Record<string, number> = {};
    let totalOffers = 0;
    let totalValue = 0;

    for (const stat of stats) {
      statusCounts[stat.status] = parseInt(stat.count, 10);
      statusValues[stat.status] = parseFloat(stat.totalValue) || 0;
      totalOffers += parseInt(stat.count, 10);
      totalValue += parseFloat(stat.totalValue) || 0;
    }

    const acceptedCount = statusCounts[OfferStatus.ACCEPTED] || 0;
    const rejectedCount = statusCounts[OfferStatus.REJECTED] || 0;
    const finishedOffers = acceptedCount + rejectedCount;
    const conversionRate = finishedOffers > 0 ? (acceptedCount / finishedOffers) * 100 : 0;

    return {
      totalOffers,
      draftCount: statusCounts[OfferStatus.DRAFT] || 0,
      readyCount: statusCounts[OfferStatus.READY] || 0,
      sentCount: statusCounts[OfferStatus.SENT] || 0,
      acceptedCount,
      rejectedCount,
      expiredCount: statusCounts[OfferStatus.EXPIRED] || 0,
      totalValue: Math.round(totalValue * 100) / 100,
      acceptedValue: Math.round((statusValues[OfferStatus.ACCEPTED] || 0) * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }
}
