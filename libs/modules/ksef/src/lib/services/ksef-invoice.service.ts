import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Client,
  Company,
  escapeLikePattern,
  KsefInvoice,
  KsefInvoiceDirection,
  KsefInvoiceStatus,
  KsefInvoiceType,
  PaginatedResponseDto,
  User,
} from '@accounting/common';
import { calculatePagination, SystemCompanyService } from '@accounting/common/backend';

import { KSEF_MESSAGES } from '../constants';
import {
  CreateKsefInvoiceDto,
  GetKsefInvoicesQueryDto,
  KsefBatchSubmitItemResultDto,
  KsefBatchSubmitResultDto,
  KsefInvoiceResponseDto,
  KsefInvoiceStatusDto,
  UpdateKsefInvoiceDto,
} from '../dto';
import {
  KsefInvoiceNotDraftException,
  KsefInvoiceNotFoundException,
} from '../exceptions';
import { KsefAuditLogService } from './ksef-audit-log.service';
import { KsefConfigService } from './ksef-config.service';
import { KsefCryptoService } from './ksef-crypto.service';
import { KsefSessionService } from './ksef-session.service';
import { KsefXmlService } from './ksef-xml.service';

@Injectable()
export class KsefInvoiceService {
  private readonly logger = new Logger(KsefInvoiceService.name);

  constructor(
    @InjectRepository(KsefInvoice)
    private readonly invoiceRepo: Repository<KsefInvoice>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly xmlService: KsefXmlService,
    private readonly cryptoService: KsefCryptoService,
    private readonly sessionService: KsefSessionService,
    private readonly configService: KsefConfigService,
    private readonly auditLogService: KsefAuditLogService,
    private readonly systemCompanyService: SystemCompanyService,
  ) {}

  async findAll(
    query: GetKsefInvoicesQueryDto,
    user: User,
  ): Promise<PaginatedResponseDto<KsefInvoiceResponseDto>> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const { page, limit, skip } = calculatePagination(query);

    const qb = this.invoiceRepo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.client', 'client')
      .where('invoice.companyId = :companyId', { companyId });

    // Filters
    if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
    }

    if (query.invoiceType) {
      qb.andWhere('invoice.invoiceType = :invoiceType', {
        invoiceType: query.invoiceType,
      });
    }

    if (query.direction) {
      qb.andWhere('invoice.direction = :direction', {
        direction: query.direction,
      });
    }

    if (query.clientId) {
      qb.andWhere('invoice.clientId = :clientId', { clientId: query.clientId });
    }

    if (query.dateFrom) {
      qb.andWhere('invoice.issueDate >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      qb.andWhere('invoice.issueDate <= :dateTo', { dateTo: query.dateTo });
    }

    if (query.search) {
      const pattern = `%${escapeLikePattern(query.search)}%`;
      qb.andWhere(
        '(invoice.invoiceNumber ILIKE :search OR invoice.buyerName ILIKE :search OR invoice.buyerNip ILIKE :search)',
        { search: pattern },
      );
    }

    // Sorting
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = (query.sortOrder?.toUpperCase() ?? 'DESC') as 'ASC' | 'DESC';
    qb.orderBy(`invoice.${sortBy}`, sortOrder);

    const total = await qb.getCount();
    const data = await qb.skip(skip).take(limit).getMany();

    return new PaginatedResponseDto(
      data.map((inv) => this.toResponseDto(inv)),
      total,
      page,
      limit,
    );
  }

  async findOne(id: string, user: User): Promise<KsefInvoiceResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
      relations: ['client', 'correctedInvoice'],
    });

    if (!invoice) {
      throw new KsefInvoiceNotFoundException(id, companyId);
    }

    return this.toResponseDto(invoice);
  }

  async createDraft(
    dto: CreateKsefInvoiceDto,
    user: User,
  ): Promise<KsefInvoiceResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    if (!company?.nip) {
      throw new BadRequestException(KSEF_MESSAGES.NIP_REQUIRED);
    }

    // Resolve buyer data
    let buyerName: string;
    let buyerNip: string | null = null;
    let clientId: string | null = null;

    if (dto.clientId) {
      const client = await this.clientRepo.findOne({
        where: { id: dto.clientId, companyId },
      });
      if (!client) {
        throw new BadRequestException('Nie znaleziono klienta');
      }
      buyerName = client.name;
      buyerNip = client.nip ?? null;
      clientId = client.id;
    } else if (dto.buyerData) {
      buyerName = dto.buyerData.name;
      buyerNip = dto.buyerData.nip ?? null;
    } else {
      throw new BadRequestException(
        'Wymagany jest clientId lub buyerData',
      );
    }

    // Calculate totals from line items
    const lineItems = dto.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitNetPrice: item.unitNetPrice,
      netAmount: item.netAmount,
      vatRate: item.vatRate,
      vatAmount: item.vatAmount,
      grossAmount: item.grossAmount,
      gtuCodes: item.gtuCodes,
    }));

    const netAmount = lineItems.reduce((sum, item) => sum + item.netAmount, 0);
    const vatAmount = lineItems.reduce((sum, item) => sum + item.vatAmount, 0);
    const grossAmount = lineItems.reduce((sum, item) => sum + item.grossAmount, 0);

    // Generate invoice number
    const invoiceNumber = await this.getNextInvoiceNumber(
      companyId,
      dto.invoiceType,
    );

    const invoice = this.invoiceRepo.create({
      companyId,
      clientId,
      invoiceType: dto.invoiceType,
      direction: KsefInvoiceDirection.OUTGOING,
      invoiceNumber,
      status: KsefInvoiceStatus.DRAFT,
      issueDate: new Date(dto.issueDate),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      sellerNip: company.nip,
      sellerName: company.name,
      buyerNip,
      buyerName,
      netAmount: Math.round(netAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100,
      currency: dto.currency ?? 'PLN',
      lineItems: lineItems as unknown as Record<string, unknown>[],
      correctedInvoiceId: dto.correctedInvoiceId ?? null,
      createdById: user.id,
      metadata: {
        paymentMethod: dto.paymentMethod,
        bankAccount: dto.bankAccount,
        notes: dto.notes,
      },
    });

    const saved = await this.invoiceRepo.save(invoice);

    await this.auditLogService.log({
      companyId,
      userId: user.id,
      action: 'INVOICE_CREATED',
      entityType: 'KsefInvoice',
      entityId: saved.id,
    });

    this.logger.log(
      `Draft invoice created: ${saved.invoiceNumber} (${saved.id})`,
    );

    return this.toResponseDto(saved);
  }

  async updateDraft(
    id: string,
    dto: UpdateKsefInvoiceDto,
    user: User,
  ): Promise<KsefInvoiceResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
    });

    if (!invoice) {
      throw new KsefInvoiceNotFoundException(id, companyId);
    }

    if (invoice.status !== KsefInvoiceStatus.DRAFT) {
      throw new KsefInvoiceNotDraftException(id);
    }

    // Update buyer data
    if (dto.clientId !== undefined) {
      if (dto.clientId) {
        const client = await this.clientRepo.findOne({
          where: { id: dto.clientId, companyId },
        });
        if (!client) {
          throw new BadRequestException('Nie znaleziono klienta');
        }
        invoice.clientId = client.id;
        invoice.buyerName = client.name;
        invoice.buyerNip = client.nip ?? null;
      } else {
        invoice.clientId = null;
      }
    }

    if (dto.buyerData) {
      invoice.buyerName = dto.buyerData.name;
      invoice.buyerNip = dto.buyerData.nip ?? null;
    }

    if (dto.invoiceType !== undefined) {
      invoice.invoiceType = dto.invoiceType;
    }

    if (dto.issueDate !== undefined) {
      invoice.issueDate = new Date(dto.issueDate);
    }

    if (dto.dueDate !== undefined) {
      invoice.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    if (dto.correctedInvoiceId !== undefined) {
      invoice.correctedInvoiceId = dto.correctedInvoiceId ?? null;
    }

    if (dto.currency !== undefined) {
      invoice.currency = dto.currency!;
    }

    // Update line items and recalculate totals
    if (dto.lineItems !== undefined) {
      const lineItems = dto.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitNetPrice: item.unitNetPrice,
        netAmount: item.netAmount,
        vatRate: item.vatRate,
        vatAmount: item.vatAmount,
        grossAmount: item.grossAmount,
        gtuCodes: item.gtuCodes,
      }));

      invoice.lineItems = lineItems as unknown as Record<string, unknown>[];
      invoice.netAmount =
        Math.round(lineItems.reduce((s, i) => s + i.netAmount, 0) * 100) / 100;
      invoice.vatAmount =
        Math.round(lineItems.reduce((s, i) => s + i.vatAmount, 0) * 100) / 100;
      invoice.grossAmount =
        Math.round(lineItems.reduce((s, i) => s + i.grossAmount, 0) * 100) / 100;
    }

    // Update metadata
    const existingMeta = (invoice.metadata ?? {}) as Record<string, unknown>;
    if (dto.paymentMethod !== undefined) {
      existingMeta['paymentMethod'] = dto.paymentMethod;
    }
    if (dto.bankAccount !== undefined) {
      existingMeta['bankAccount'] = dto.bankAccount;
    }
    if (dto.notes !== undefined) {
      existingMeta['notes'] = dto.notes;
    }
    invoice.metadata = existingMeta;

    // Clear XML if content changed (needs regeneration)
    invoice.xmlContent = null;
    invoice.xmlHash = null;

    invoice.updatedById = user.id;
    const saved = await this.invoiceRepo.save(invoice);

    await this.auditLogService.log({
      companyId,
      userId: user.id,
      action: 'INVOICE_UPDATED',
      entityType: 'KsefInvoice',
      entityId: saved.id,
    });

    return this.toResponseDto(saved);
  }

  async deleteDraft(id: string, user: User): Promise<void> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
    });

    if (!invoice) {
      throw new KsefInvoiceNotFoundException(id, companyId);
    }

    if (invoice.status !== KsefInvoiceStatus.DRAFT) {
      throw new KsefInvoiceNotDraftException(id);
    }

    await this.invoiceRepo.remove(invoice);

    await this.auditLogService.log({
      companyId,
      userId: user.id,
      action: 'INVOICE_DELETED',
      entityType: 'KsefInvoice',
      entityId: id,
    });

    this.logger.log(`Draft invoice deleted: ${id}`);
  }

  async generateXml(
    id: string,
    user: User,
  ): Promise<KsefInvoiceResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
      relations: ['correctedInvoice', 'client'],
    });

    if (!invoice) {
      throw new KsefInvoiceNotFoundException(id, companyId);
    }

    const xml = await this.buildXmlForInvoice(invoice, companyId);
    const hash = this.cryptoService.computeSha256(xml);

    invoice.xmlContent = xml;
    invoice.xmlHash = hash;
    invoice.updatedById = user.id;

    const saved = await this.invoiceRepo.save(invoice);

    await this.auditLogService.log({
      companyId,
      userId: user.id,
      action: 'INVOICE_XML_GENERATED',
      entityType: 'KsefInvoice',
      entityId: id,
    });

    return this.toResponseDto(saved);
  }

  async submitInvoice(
    id: string,
    user: User,
  ): Promise<KsefInvoiceResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
      relations: ['correctedInvoice', 'client'],
    });

    if (!invoice) {
      throw new KsefInvoiceNotFoundException(id, companyId);
    }

    if (
      invoice.status !== KsefInvoiceStatus.DRAFT &&
      invoice.status !== KsefInvoiceStatus.PENDING_SUBMISSION
    ) {
      throw new BadRequestException(KSEF_MESSAGES.INVOICE_ALREADY_SUBMITTED);
    }

    // Generate XML if not already generated
    if (!invoice.xmlContent) {
      const xml = await this.buildXmlForInvoice(invoice, companyId);
      invoice.xmlContent = xml;
      invoice.xmlHash = this.cryptoService.computeSha256(xml);
    }

    // Encrypt XML
    const config = await this.configService.getConfigOrFail(companyId);
    const encryptedData = await this.cryptoService.encryptInvoiceXml(
      invoice.xmlContent!,
      config.environment,
      companyId,
      user.id,
    );

    // Get or create session
    const session = await this.sessionService.getOrCreateSession(
      companyId,
      user.id,
    );

    // Send in session
    const result = await this.sessionService.sendInvoiceInSession(
      session,
      encryptedData.encryptedContentBase64,
      companyId,
      user.id,
    );

    // Update invoice
    invoice.status = KsefInvoiceStatus.SUBMITTED;
    invoice.sessionId = session.id;
    invoice.ksefReferenceNumber = result.ksefReferenceNumber;
    invoice.submittedAt = new Date();
    invoice.updatedById = user.id;

    const saved = await this.invoiceRepo.save(invoice);

    await this.auditLogService.log({
      companyId,
      userId: user.id,
      action: 'INVOICE_SUBMITTED',
      entityType: 'KsefInvoice',
      entityId: id,
    });

    this.logger.log(`Invoice ${invoice.invoiceNumber} submitted to KSeF`);
    return this.toResponseDto(saved);
  }

  async submitBatch(
    ids: string[],
    user: User,
  ): Promise<KsefBatchSubmitResultDto> {
    const results: KsefBatchSubmitItemResultDto[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const id of ids) {
      const result = new KsefBatchSubmitItemResultDto();
      result.invoiceId = id;

      try {
        const submitted = await this.submitInvoice(id, user);
        result.success = true;
        result.ksefNumber = submitted.ksefReferenceNumber ?? undefined;
        successCount++;
      } catch (error) {
        result.success = false;
        result.errorMessage =
          error instanceof Error ? error.message : String(error);
        failedCount++;
      }

      results.push(result);
    }

    const dto = new KsefBatchSubmitResultDto();
    dto.totalCount = ids.length;
    dto.successCount = successCount;
    dto.failedCount = failedCount;
    dto.results = results;

    return dto;
  }

  async cancelSubmission(
    id: string,
    user: User,
  ): Promise<KsefInvoiceResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
    });

    if (!invoice) {
      throw new KsefInvoiceNotFoundException(id, companyId);
    }

    if (invoice.status !== KsefInvoiceStatus.PENDING_SUBMISSION) {
      throw new BadRequestException(
        'Anulowanie możliwe tylko dla faktur oczekujących na wysłanie',
      );
    }

    invoice.status = KsefInvoiceStatus.DRAFT;
    invoice.updatedById = user.id;

    const saved = await this.invoiceRepo.save(invoice);

    await this.auditLogService.log({
      companyId,
      userId: user.id,
      action: 'INVOICE_SUBMISSION_CANCELLED',
      entityType: 'KsefInvoice',
      entityId: id,
    });

    return this.toResponseDto(saved);
  }

  async getNextInvoiceNumber(
    companyId: string,
    type: KsefInvoiceType,
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const prefix =
      type === KsefInvoiceType.CORRECTION ? 'FK' : 'FV';

    const pattern = `${prefix}/${year}/${month}/%`;

    const lastInvoice = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.invoiceNumber LIKE :pattern', { pattern })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    let seq = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoiceNumber.split('/');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}/${year}/${month}/${String(seq).padStart(4, '0')}`;
  }

  async updateInvoiceStatus(
    invoiceId: string,
    newStatus: KsefInvoiceStatus,
    ksefData?: {
      ksefNumber?: string;
      validationErrors?: Record<string, unknown>[];
    },
  ): Promise<void> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    invoice.status = newStatus;

    if (ksefData?.ksefNumber) {
      invoice.ksefNumber = ksefData.ksefNumber;
    }

    if (ksefData?.validationErrors) {
      invoice.validationErrors = ksefData.validationErrors;
    }

    if (newStatus === KsefInvoiceStatus.ACCEPTED) {
      invoice.acceptedAt = new Date();
    }

    if (newStatus === KsefInvoiceStatus.REJECTED) {
      invoice.rejectedAt = new Date();
    }

    await this.invoiceRepo.save(invoice);

    this.logger.log(
      `Invoice ${invoiceId} status updated to ${newStatus}`,
    );
  }

  async getInvoiceStatus(
    id: string,
    user: User,
  ): Promise<KsefInvoiceStatusDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
    });

    if (!invoice) {
      throw new KsefInvoiceNotFoundException(id, companyId);
    }

    const dto = new KsefInvoiceStatusDto();
    dto.id = invoice.id;
    dto.status = invoice.status;
    dto.ksefNumber = invoice.ksefNumber ?? null;
    dto.submittedAt = invoice.submittedAt?.toISOString() ?? null;
    dto.acceptedAt = invoice.acceptedAt?.toISOString() ?? null;
    dto.rejectedAt = invoice.rejectedAt?.toISOString() ?? null;
    dto.validationErrors = invoice.validationErrors ?? null;
    return dto;
  }

  private async buildXmlForInvoice(
    invoice: KsefInvoice,
    companyId: string,
  ): Promise<string> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new BadRequestException('Nie znaleziono firmy');
    }

    // Resolve buyer data
    const buyer = invoice.client
      ? invoice.client
      : {
          name: invoice.buyerName,
          nip: invoice.buyerNip ?? undefined,
        };

    return this.xmlService.generateInvoiceXml(invoice, company, buyer);
  }

  private toResponseDto(invoice: KsefInvoice): KsefInvoiceResponseDto {
    const dto = new KsefInvoiceResponseDto();
    dto.id = invoice.id;
    dto.companyId = invoice.companyId;
    dto.clientId = invoice.clientId ?? null;
    dto.sessionId = invoice.sessionId ?? null;
    dto.invoiceType = invoice.invoiceType;
    dto.direction = invoice.direction;
    dto.invoiceNumber = invoice.invoiceNumber;
    dto.ksefNumber = invoice.ksefNumber ?? null;
    dto.ksefReferenceNumber = invoice.ksefReferenceNumber ?? null;
    dto.status = invoice.status;
    dto.issueDate = invoice.issueDate instanceof Date
      ? invoice.issueDate.toISOString().substring(0, 10)
      : String(invoice.issueDate);
    dto.dueDate = invoice.dueDate instanceof Date
      ? invoice.dueDate.toISOString().substring(0, 10)
      : invoice.dueDate ? String(invoice.dueDate) : null;
    dto.sellerNip = invoice.sellerNip;
    dto.sellerName = invoice.sellerName;
    dto.buyerNip = invoice.buyerNip ?? null;
    dto.buyerName = invoice.buyerName;
    dto.netAmount = Number(invoice.netAmount);
    dto.vatAmount = Number(invoice.vatAmount);
    dto.grossAmount = Number(invoice.grossAmount);
    dto.currency = invoice.currency;
    dto.lineItems = invoice.lineItems ?? null;
    dto.validationErrors = invoice.validationErrors ?? null;
    dto.submittedAt = invoice.submittedAt?.toISOString() ?? null;
    dto.acceptedAt = invoice.acceptedAt?.toISOString() ?? null;
    dto.rejectedAt = invoice.rejectedAt?.toISOString() ?? null;
    dto.correctedInvoiceId = invoice.correctedInvoiceId ?? null;
    dto.createdById = invoice.createdById;
    dto.updatedById = invoice.updatedById ?? null;
    dto.createdAt = invoice.createdAt.toISOString();
    dto.updatedAt = invoice.updatedAt.toISOString();

    if (invoice.client) {
      dto.client = {
        id: invoice.client.id,
        name: invoice.client.name,
        nip: invoice.client.nip,
      };
    }

    return dto;
  }
}
