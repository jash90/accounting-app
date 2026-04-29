import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

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

import { KSEF_API_PATHS, KSEF_MESSAGES } from '../constants';
import {
  CreateKsefInvoiceDto,
  GetKsefInvoicesQueryDto,
  KsefBatchSubmitItemResultDto,
  KsefBatchSubmitResultDto,
  KsefInvoiceResponseDto,
  KsefInvoiceStatusDto,
  KsefInvoiceValidateResultDto,
  UpdateKsefInvoiceDto,
} from '../dto';
import {
  KsefInvoiceNotDraftException,
  KsefInvoiceNotFoundException,
} from '../exceptions';
import { KsefAuditLogService } from './ksef-audit-log.service';
import { KsefAuthService } from './ksef-auth.service';
import { KsefConfigService } from './ksef-config.service';
import { KsefCryptoService } from './ksef-crypto.service';
import { KsefHttpClientService } from './ksef-http-client.service';
import { KsefInvoiceValidationService, type KsefValidationResult } from './ksef-invoice-validation.service';
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
    private readonly httpClient: KsefHttpClientService,
    private readonly configService: KsefConfigService,
    private readonly auditLogService: KsefAuditLogService,
    private readonly validationService: KsefInvoiceValidationService,
    private readonly authService: KsefAuthService,
    private readonly systemCompanyService: SystemCompanyService,
    private readonly dataSource: DataSource,
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
      salesDate: dto.salesDate ? new Date(dto.salesDate) : null,
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
        correctionReason: dto.correctionReason,
        buyerData: dto.buyerData ?? undefined,
      },
    });

    if (dto.correctedInvoiceId) {
      const corrected = await this.invoiceRepo.findOne({
        where: { id: dto.correctedInvoiceId, companyId },
      });
      if (!corrected) {
        throw new BadRequestException('Nie znaleziono faktury korygowanej');
      }
      if (corrected.status !== KsefInvoiceStatus.ACCEPTED) {
        throw new BadRequestException('Można korygować tylko zaakceptowane faktury');
      }
      if (dto.invoiceType === KsefInvoiceType.CORRECTION && !dto.correctionReason) {
        throw new BadRequestException('Przyczyna korekty jest wymagana dla faktur korygujących');
      }
    }

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

    if (dto.salesDate !== undefined) {
      invoice.salesDate = dto.salesDate ? new Date(dto.salesDate) : null;
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
    if (dto.correctionReason !== undefined) {
      existingMeta['correctionReason'] = dto.correctionReason;
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

  /**
   * Statuses for which a local hard-delete is safe — i.e. the invoice has
   * NOT been irrevocably written to KSeF. We keep the rules tight on
   * purpose: an ACCEPTED invoice has a permanent KSeF entry and a real-world
   * VAT impact, so deleting the local row would create a silent reconciliation
   * gap with KSeF.
   *
   *  - DRAFT                — never sent
   *  - PENDING_SUBMISSION   — queued, hasn't been wired up to a session yet
   *  - REJECTED             — KSeF refused it; nothing to reconcile
   *  - ERROR                — terminal client/network error before submission
   *
   * SUBMITTED and ACCEPTED are intentionally NOT in the list.
   */
  private static readonly DELETABLE_STATUSES: ReadonlySet<KsefInvoiceStatus> = new Set([
    KsefInvoiceStatus.DRAFT,
    KsefInvoiceStatus.PENDING_SUBMISSION,
    KsefInvoiceStatus.REJECTED,
    KsefInvoiceStatus.ERROR,
  ]);

  /**
   * Hard-delete a single invoice when its status allows it. Used by the
   * single-row delete action and the batch-delete loop.
   */
  async deleteInvoice(id: string, user: User): Promise<void> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
    });

    if (!invoice) {
      throw new KsefInvoiceNotFoundException(id, companyId);
    }

    if (!KsefInvoiceService.DELETABLE_STATUSES.has(invoice.status)) {
      // Reuse the existing exception class but dress the message so the UI
      // surfaces a useful explanation instead of "tylko szkice mogą być
      // edytowane" (which is technically a lie now — REJECTED can also be
      // deleted).
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

    this.logger.log(`Invoice ${id} (${invoice.status}) deleted`);
  }

  /**
   * @deprecated Use `deleteInvoice` — historical name kept for callers that
   * still expect "draft-only" semantics. The behavior now also allows
   * REJECTED / ERROR / PENDING_SUBMISSION; we keep the alias rather than
   * touch every internal caller in this round.
   */
  async deleteDraft(id: string, user: User): Promise<void> {
    return this.deleteInvoice(id, user);
  }

  /**
   * Batch hard-delete. Each id is processed independently — a single failure
   * doesn't abort the rest. Mirrors the shape of `submitBatch` so the UI can
   * reuse the existing per-row failure rendering.
   */
  async deleteBatch(
    ids: string[],
    user: User,
  ): Promise<{
    totalCount: number;
    successCount: number;
    failedCount: number;
    results: Array<{ invoiceId: string; success: boolean; errorMessage?: string }>;
  }> {
    const results: Array<{ invoiceId: string; success: boolean; errorMessage?: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    for (const id of ids) {
      try {
        await this.deleteInvoice(id, user);
        results.push({ invoiceId: id, success: true });
        successCount++;
      } catch (error) {
        results.push({
          invoiceId: id,
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        failedCount++;
      }
    }

    return {
      totalCount: ids.length,
      successCount,
      failedCount,
      results,
    };
  }

  async validateInvoice(
    id: string,
    user: User,
  ): Promise<KsefValidationResult> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
      relations: ['client'],
    });

    if (!invoice) {
      throw new KsefInvoiceNotFoundException(id, companyId);
    }

    const result = this.validationService.validate(invoice);

    // Persist validation results on the invoice
    invoice.validationErrors = result.issues as unknown as Record<string, unknown>[];
    invoice.updatedById = user.id;
    await this.invoiceRepo.save(invoice);

    await this.auditLogService.log({
      companyId,
      userId: user.id,
      action: 'INVOICE_VALIDATED',
      entityType: 'KsefInvoice',
      entityId: id,
    });

    return result;
  }

  /**
   * Validate invoice XML against KSeF schema using the remote ksefInvoiceValidate API.
   * Sends the raw XML to POST /invoice/validate and returns the result.
   */
  async validateXmlWithKsef(
    id: string,
    user: User,
  ): Promise<KsefInvoiceValidateResultDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
      relations: ['correctedInvoice', 'client'],
    });

    if (!invoice) {
      throw new KsefInvoiceNotFoundException(id, companyId);
    }

    // Generate XML if not already present
    if (!invoice.xmlContent) {
      const xml = await this.buildXmlForInvoice(invoice, companyId);
      invoice.xmlContent = xml;
      invoice.xmlHash = this.cryptoService.computeSha256(xml);
      invoice.updatedById = user.id;
      await this.invoiceRepo.save(invoice);
    }

    const config = await this.configService.getConfigOrFail(companyId);
    const token = await this.authService.getValidToken(companyId, user.id);

    // KSeF validate endpoint accepts text/xml body
    const response = await this.httpClient.request<{
      valid: boolean;
      invoiceVersion: string;
      canonicalForm?: string;
      error?: { code?: string; description?: string; details?: string };
    }>({
      environment: config.environment,
      method: 'POST',
      path: KSEF_API_PATHS.INVOICE_VALIDATE,
      data: invoice.xmlContent,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/xml',
      },
      companyId,
      userId: user.id,
      auditAction: 'INVOICE_XML_VALIDATE_KSEF',
      auditEntityType: 'KsefInvoice',
      auditEntityId: id,
      responseType: 'json',
    });

    const dto = new KsefInvoiceValidateResultDto();
    dto.valid = response.data.valid;
    dto.invoiceVersion = response.data.invoiceVersion;
    dto.canonicalForm = response.data.canonicalForm;

    if (!response.data.valid && response.data.error) {
      dto.error = response.data.error;
    }

    await this.auditLogService.log({
      companyId,
      userId: user.id,
      action: 'INVOICE_XML_VALIDATED_KSEF',
      entityType: 'KsefInvoice',
      entityId: id,
    });

    return dto;
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

    // Run semantic validation before submission
    const validationResult = this.validationService.validate(invoice);
    if (!validationResult.valid) {
      invoice.validationErrors = validationResult.issues as unknown as Record<string, unknown>[];
      await this.invoiceRepo.save(invoice);
      throw new BadRequestException({
        message: 'Walidacja faktury nie powiodła się',
        validationErrors: validationResult.issues,
      });
    }
    // Clear stale validation errors on successful validation
    invoice.validationErrors = null;

    // Generate XML if not already generated
    if (!invoice.xmlContent) {
      const xml = await this.buildXmlForInvoice(invoice, companyId);
      invoice.xmlContent = xml;
      invoice.xmlHash = this.cryptoService.computeSha256(xml);
    }

    // Validate generated XML against KSeF technical requirements
    const xmlValidation = this.validationService.validateXml(invoice.xmlContent);
    if (!xmlValidation.valid) {
      invoice.validationErrors = xmlValidation.issues as unknown as Record<string, unknown>[];
      await this.invoiceRepo.save(invoice);
      throw new BadRequestException({
        message: 'Walidacja XML faktury nie powiodła się',
        validationErrors: xmlValidation.issues,
      });
    }

    // Get or create session
    const session = await this.sessionService.getOrCreateSession(
      companyId,
      user.id,
    );

    // Send in session (encrypts XML with session's AES key)
    const result = await this.sessionService.sendInvoiceInSession(
      session,
      invoice.xmlContent!,
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

    // Use advisory lock to prevent race conditions on number generation
    // Hash companyId to a numeric lock key
    const lockKey = Buffer.from(companyId).reduce((a, b) => ((a << 5) - a + b) | 0, 0);

    return this.dataSource.transaction(async (manager) => {
      // Acquire advisory lock scoped to this transaction
      await manager.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

      const lastInvoice = await manager
        .createQueryBuilder(KsefInvoice, 'invoice')
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
    });
  }

  /**
   * Persist the outcome of a KSeF status poll for a single invoice.
   *
   * The scheduler calls this with the data it pulled from
   * `GET /sessions/{sessionRef}/invoices/{invoiceRef}`. UPO fields are
   * optional because they're only present once KSeF generates the UPO
   * (for 200 responses, and for 440 duplicates that link back to the
   * original accepted invoice).
   *
   * - `ksefNumber`           — final KSeF number (from 200 OR from 440's
   *                            `extensions.originalKsefNumber`)
   * - `upoXml`               — XML body of the UPO once successfully
   *                            downloaded from the SAS URL
   * - `upoDownloadUrl`       — SAS URL persisted as a fallback for the UI
   * - `upoDownloadUrlExpirationDate`
   *                          — when the SAS URL stops working
   * - `validationErrors`     — populated for rejections
   */
  async updateInvoiceStatus(
    invoiceId: string,
    newStatus: KsefInvoiceStatus,
    ksefData?: {
      ksefNumber?: string;
      validationErrors?: Record<string, unknown>[];
      upoXml?: string | null;
      upoDownloadUrl?: string | null;
      upoDownloadUrlExpirationDate?: Date | null;
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

    if (ksefData?.upoXml !== undefined) {
      invoice.upoXml = ksefData.upoXml;
    }

    if (ksefData?.upoDownloadUrl !== undefined) {
      invoice.upoDownloadUrl = ksefData.upoDownloadUrl;
    }

    if (ksefData?.upoDownloadUrlExpirationDate !== undefined) {
      invoice.upoDownloadUrlExpirationDate = ksefData.upoDownloadUrlExpirationDate;
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

    // Resolve buyer data — include address from metadata.buyerData if available
    const metadata = (invoice.metadata ?? {}) as Record<string, unknown>;
    const buyerMeta = (metadata.buyerData ?? {}) as Record<string, unknown>;
    const buyer = invoice.client
      ? invoice.client
      : {
          name: invoice.buyerName,
          nip: invoice.buyerNip ?? undefined,
          street: (buyerMeta.street as string) ?? undefined,
          postalCode: (buyerMeta.postalCode as string) ?? undefined,
          city: (buyerMeta.city as string) ?? undefined,
          country: (buyerMeta.country as string) ?? undefined,
        };

    return this.xmlService.generateInvoiceXml(
      invoice,
      company,
      buyer,
      invoice.correctedInvoice ?? null,
    );
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
    dto.salesDate = invoice.salesDate instanceof Date
      ? invoice.salesDate.toISOString().substring(0, 10)
      : invoice.salesDate ? String(invoice.salesDate) : null;
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
    dto.upoXml = invoice.upoXml ?? null;
    dto.upoDownloadUrl = invoice.upoDownloadUrl ?? null;
    dto.upoDownloadUrlExpirationDate =
      invoice.upoDownloadUrlExpirationDate?.toISOString() ?? null;
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
